/**
 * Limited Edition Drops API - Phase 2
 * NFT-like scarcity items with serial numbers
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation, appendAuditEvent } = require('../services/economyMutationService');
const crypto = require('crypto');

/**
 * Helper: Generate unique ID
 */
function generateId(prefix = 'le') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper: Generate certificate hash
 */
function generateCertificateHash(itemId, serialNumber, ownerId) {
    return crypto.createHash('sha256')
        .update(`${itemId}:${serialNumber}:${ownerId}:${Date.now()}`)
        .digest('hex');
}

/**
 * @route GET /api/v1/drops/upcoming
 * @desc Get upcoming limited edition drops
 */
router.get('/upcoming', authMiddleware, async (req, res) => {
    try {
        const sql = `
            SELECT 
                id,
                item_key,
                name,
                description,
                item_type,
                rarity,
                total_supply,
                max_per_user,
                serial_number_prefix,
                metadata,
                drop_date,
                price_coins,
                price_gems,
                CASE 
                    WHEN drop_date > NOW() THEN 'upcoming'
                    WHEN drop_date <= NOW() AND sale_end_date >= NOW() THEN 'live'
                    ELSE 'ended'
                END as status
            FROM limited_edition_items
            WHERE is_active = TRUE
            AND drop_date >= NOW() - INTERVAL '24 hours'
            ORDER BY drop_date ASC
        `;
        
        const result = await postgres.query(sql);
        
        res.json({
            success: true,
            drops: result.rows
        });
    } catch (error) {
        console.error('Get upcoming drops error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch upcoming drops'
        });
    }
});

/**
 * @route GET /api/v1/drops/live
 * @desc Get currently available limited edition drops
 */
router.get('/live', authMiddleware, async (req, res) => {
    try {
        const sql = `
            SELECT 
                lei.*,
                CASE 
                    WHEN lei.purchase_count >= lei.total_supply THEN 'sold_out'
                    ELSE 'available'
                END as availability_status,
                lei.total_supply - lei.purchase_count as remaining_supply
            FROM limited_edition_items lei
            WHERE is_active = TRUE
            AND drop_date <= NOW()
            AND (sale_end_date IS NULL OR sale_end_date >= NOW())
            ORDER BY drop_date DESC
        `;
        
        const result = await postgres.query(sql);
        
        res.json({
            success: true,
            drops: result.rows
        });
    } catch (error) {
        console.error('Get live drops error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch live drops'
        });
    }
});

/**
 * @route POST /api/v1/drops/:id/purchase
 * @desc Purchase a limited edition item
 */
router.post('/:id/purchase', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const mutation = await executeIdempotentMutation({
            scope: 'limited_edition.purchase',
            idempotencyKey,
            requestPayload: { userId, itemId: id },
            actorUserId: userId,
            entityType: 'limited_edition_item',
            eventType: 'purchase',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    // Get item with lock
                    const itemResult = await postgres.query(
                        'SELECT * FROM limited_edition_items WHERE id = $1 FOR UPDATE',
                        [id]
                    );
                    
                    const item = itemResult.rows[0];
                    
                    if (!item) {
                        const error = new Error('Limited edition item not found');
                        error.code = 'ITEM_NOT_FOUND';
                        throw error;
                    }
                    
                    // Check if drop is active
                    if (new Date(item.drop_date) > new Date()) {
                        const error = new Error('Drop has not started yet');
                        error.code = 'DROP_NOT_STARTED';
                        throw error;
                    }
                    
                    if (item.sale_end_date && new Date(item.sale_end_date) < new Date()) {
                        const error = new Error('Drop has ended');
                        error.code = 'DROP_ENDED';
                        throw error;
                    }
                    
                    // Check supply
                    if (item.purchase_count >= item.total_supply) {
                        const error = new Error('Item is sold out');
                        error.code = 'SOLD_OUT';
                        throw error;
                    }
                    
                    // Check user hasn't exceeded max per user
                    const userOwnershipResult = await postgres.query(
                        'SELECT COUNT(*) as count FROM limited_edition_ownership WHERE item_id = $1 AND owner_id = $2',
                        [id, userId]
                    );
                    
                    const userCount = parseInt(userOwnershipResult.rows[0].count);
                    if (userCount >= item.max_per_user) {
                        const error = new Error(`You can only own ${item.max_per_user} of this item`);
                        error.code = 'MAX_OWNERSHIP_EXCEEDED';
                        throw error;
                    }
                    
                    // Check user can afford
                    const userResult = await postgres.query(
                        'SELECT horror_coins FROM users WHERE id = $1 FOR UPDATE',
                        [userId]
                    );
                    
                    if (userResult.rows[0].horror_coins < item.price_coins) {
                        const error = new Error('Insufficient coins');
                        error.code = 'INSUFFICIENT_COINS';
                        throw error;
                    }
                    
                    // Determine serial number
                    const serialNumber = item.purchase_count + 1;
                    
                    // Generate certificate
                    const certificateHash = generateCertificateHash(id, serialNumber, userId);
                    
                    // Deduct coins
                    await postgres.query(
                        'UPDATE users SET horror_coins = horror_coins - $2 WHERE id = $1',
                        [userId, item.price_coins]
                    );
                    
                    // Create ownership record
                    const ownershipId = generateId('own');
                    await postgres.query(
                        `INSERT INTO limited_edition_ownership (
                            id, item_id, owner_id, serial_number, certificate_hash, acquisition_type
                        ) VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            ownershipId,
                            id,
                            userId,
                            serialNumber,
                            certificateHash,
                            'purchase'
                        ]
                    );
                    
                    // Update item purchase count
                    await postgres.query(
                        'UPDATE limited_edition_items SET purchase_count = purchase_count + 1, updated_at = NOW() WHERE id = $1',
                        [id]
                    );
                    
                    // Add to user inventory
                    const user = await postgres.query(
                        'SELECT inventory FROM users WHERE id = $1',
                        [userId]
                    );
                    
                    const inventory = user.rows[0]?.inventory || [];
                    inventory.push({
                        item_id: item.item_key,
                        item_type: 'limited',
                        item_name: item.name,
                        item_rarity: item.rarity,
                        serial_number: serialNumber,
                        certificate_hash: certificateHash,
                        limited_edition_id: id,
                        acquired_from: 'limited_drop',
                        acquired_at: new Date().toISOString()
                    });
                    
                    await postgres.query(
                        'UPDATE users SET inventory = $2 WHERE id = $1',
                        [userId, JSON.stringify(inventory)]
                    );
                    
                    // Record transaction
                    await postgres.query(
                        `INSERT INTO marketplace_transactions (
                            id, seller_id, buyer_id, transaction_type,
                            item_type, item_id, item_name, price_coins,
                            transaction_fee, seller_receives, status
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                        [
                            generateId('txn'),
                            'system', // System as seller
                            userId,
                            'limited_purchase',
                            'limited',
                            item.item_key,
                            item.name,
                            item.price_coins,
                            0,
                            item.price_coins,
                            'completed'
                        ]
                    );
                    
                    await appendAuditEvent({
                        actorUserId: userId,
                        targetUserId: userId,
                        entityType: 'limited_edition_item',
                        entityId: id,
                        eventType: 'limited_edition.purchase',
                        idempotencyKey,
                        metadata: {
                            serialNumber,
                            certificateHash,
                            price: item.price_coins
                        }
                    });
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        ownership: {
                            id: ownershipId,
                            serialNumber,
                            certificateHash,
                            item: {
                                name: item.name,
                                rarity: item.rarity,
                                totalSupply: item.total_supply,
                                displaySerial: `${item.serial_number_prefix || 'LE'} #${serialNumber}/${item.total_supply}`
                            }
                        }
                    };
                } catch (error) {
                    await postgres.query('ROLLBACK');
                    throw error;
                }
            }
        });
        
        res.status(200).json(mutation);
    } catch (error) {
        console.error('Purchase limited edition error:', error);
        const statusMap = {
            'ITEM_NOT_FOUND': 404,
            'DROP_NOT_STARTED': 409,
            'DROP_ENDED': 409,
            'SOLD_OUT': 409,
            'MAX_OWNERSHIP_EXCEEDED': 409,
            'INSUFFICIENT_COINS': 409
        };
        res.status(statusMap[error.code] || 500).json({
            success: false,
            error: error.code || 'PURCHASE_FAILED',
            message: error.message || 'Failed to purchase limited edition item'
        });
    }
});

/**
 * @route GET /api/v1/drops/ownership/:userId
 * @desc Get user's limited edition ownership
 */
router.get('/ownership/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const sql = `
            SELECT 
                leo.id,
                leo.item_id,
                leo.owner_id,
                leo.serial_number,
                leo.certificate_hash,
                leo.acquired_at,
                leo.acquisition_type,
                leo.metadata,
                lei.item_key,
                lei.name,
                lei.description,
                lei.item_type,
                lei.rarity,
                lei.total_supply,
                lei.serial_number_prefix,
                lei.metadata as item_metadata
            FROM limited_edition_ownership leo
            JOIN limited_edition_items lei ON leo.item_id = lei.id
            WHERE leo.owner_id = $1
            ORDER BY leo.acquired_at DESC
        `;
        
        const result = await postgres.query(sql, [userId]);
        
        res.json({
            success: true,
            ownership: result.rows.map(row => ({
                ...row,
                displaySerial: `${row.serial_number_prefix || 'LE'} #${row.serial_number}/${row.total_supply}`,
                certificateUrl: `/api/v1/drops/certificate/${row.certificate_hash}`
            }))
        });
    } catch (error) {
        console.error('Get ownership error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ownership records'
        });
    }
});

/**
 * @route GET /api/v1/drops/certificate/:hash
 * @desc Get certificate of authenticity
 */
router.get('/certificate/:hash', authMiddleware, async (req, res) => {
    try {
        const { hash } = req.params;
        
        const sql = `
            SELECT 
                leo.certificate_hash,
                leo.serial_number,
                leo.acquired_at,
                leo.owner_id,
                u.username as owner_username,
                lei.name as item_name,
                lei.item_key,
                lei.total_supply,
                lei.rarity
            FROM limited_edition_ownership leo
            JOIN limited_edition_items lei ON leo.item_id = lei.id
            JOIN users u ON leo.owner_id = u.id
            WHERE leo.certificate_hash = $1
        `;
        
        const result = await postgres.query(sql, [hash]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Certificate not found'
            });
        }
        
        res.json({
            success: true,
            certificate: {
                hash: result.rows[0].certificate_hash,
                itemName: result.rows[0].item_name,
                itemKey: result.rows[0].item_key,
                serialNumber: result.rows[0].serial_number,
                totalSupply: result.rows[0].total_supply,
                rarity: result.rows[0].rarity,
                ownerId: result.rows[0].owner_id,
                ownerUsername: result.rows[0].owner_username,
                acquiredAt: result.rows[0].acquired_at,
                displaySerial: `#${result.rows[0].serial_number}/${result.rows[0].total_supply}`
            }
        });
    } catch (error) {
        console.error('Get certificate error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch certificate'
        });
    }
});

/**
 * @route GET /api/v1/drops/stats
 * @desc Get limited edition drops statistics
 */
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const statsSql = `
            SELECT 
                COUNT(*) as total_items,
                SUM(purchase_count) as total_sold,
                SUM(total_supply) as total_supply,
                COUNT(DISTINCT owner_id) as unique_collectors
            FROM limited_edition_items lei
            LEFT JOIN limited_edition_ownership leo ON lei.id = leo.item_id
        `;
        
        const statsResult = await postgres.query(statsSql);
        
        const rareItemsSql = `
            SELECT 
                name,
                serial_number_prefix,
                total_supply,
                purchase_count,
                rarity
            FROM limited_edition_items
            WHERE purchase_count > 0
            ORDER BY (purchase_count::float / total_supply) DESC
            LIMIT 10
        `;
        
        const rareItemsResult = await postgres.query(rareItemsSql);
        
        res.json({
            success: true,
            stats: {
                totalItems: parseInt(statsResult.rows[0].total_items) || 0,
                totalSold: parseInt(statsResult.rows[0].total_sold) || 0,
                totalSupply: parseInt(statsResult.rows[0].total_supply) || 0,
                uniqueCollectors: parseInt(statsResult.rows[0].unique_collectors) || 0
            },
            mostCollected: rareItemsResult.rows
        });
    } catch (error) {
        console.error('Get drops stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch drops statistics'
        });
    }
});

module.exports = router;
