/**
 * Social Gifting 2.0 API - Phase 2
 * Wishlists, group gifts, and scheduled gifts
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation } = require('../services/economyMutationService');

/**
 * Helper: Generate unique ID
 */
function generateId(prefix = 'gift') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// WISHLISTS
// ============================================

/**
 * @route GET /api/v1/gifting/wishlists/:userId
 * @desc Get user's wishlist
 */
router.get('/wishlists/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const sql = `
            SELECT *
            FROM user_wishlists
            WHERE user_id = $1
            ORDER BY 
                CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                END,
                created_at DESC
        `;
        
        const result = await postgres.query(sql, [userId]);
        
        res.json({
            success: true,
            wishlist: result.rows
        });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch wishlist'
        });
    }
});

/**
 * @route POST /api/v1/gifting/wishlists
 * @desc Add item to wishlist
 */
router.post('/wishlists', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const userId = req.user.id;
        const { item_type, item_id, item_name, priority, metadata } = req.body;
        
        if (!item_type || !item_id || !item_name) {
            return res.status(400).json({
                success: false,
                error: 'item_type, item_id, and item_name required'
            });
        }
        
        const mutation = await executeIdempotentMutation({
            scope: 'gifting.add_wishlist',
            idempotencyKey,
            requestPayload: { userId, ...req.body },
            actorUserId: userId,
            entityType: 'wishlist',
            eventType: 'add',
            mutationFn: async () => {
                const wishlistId = generateId('wish');
                
                await postgres.query(
                    `INSERT INTO user_wishlists (
                        id, user_id, item_type, item_id, item_name, priority, metadata
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (user_id, item_type, item_id) DO UPDATE
                    SET priority = $6, metadata = $7
                    RETURNING *`,
                    [wishlistId, userId, item_type, item_id, item_name, priority || 'medium', JSON.stringify(metadata || {})]
                );
                
                return {
                    success: true,
                    wishlist: {
                        user_id: userId,
                        item_type,
                        item_id,
                        item_name,
                        priority
                    }
                };
            }
        });
        
        res.status(201).json(mutation);
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add to wishlist'
        });
    }
});

/**
 * @route DELETE /api/v1/gifting/wishlists/:itemId
 * @desc Remove item from wishlist
 */
router.delete('/wishlists/:itemId', requireMonetizationAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;
        
        await postgres.query(
            'DELETE FROM user_wishlists WHERE user_id = $1 AND item_id = $2',
            [userId, itemId]
        );
        
        res.json({
            success: true,
            message: 'Item removed from wishlist'
        });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove from wishlist'
        });
    }
});

// ============================================
// GROUP GIFTS
// ============================================

/**
 * @route GET /api/v1/gifting/group-gifts
 * @desc Get group gifts (active or user's)
 */
router.get('/group-gifts', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type = 'all', status = 'active' } = req.query;
        
        let sql;
        let params;
        
        if (type === 'created') {
            sql = `
                SELECT 
                    gg.*,
                    r.username as recipient_username,
                    c.username as creator_username,
                    COUNT(ggc.id) as contributor_count
                FROM group_gifts gg
                JOIN users r ON gg.recipient_id = r.id
                JOIN users c ON gg.creator_id = c.id
                LEFT JOIN group_gift_contributions ggc ON gg.id = ggc.group_gift_id
                WHERE gg.creator_id = $1
                AND (${status === 'active' ? "gg.status IN ('fundraising', 'ready')" : 'TRUE'})
                GROUP BY gg.id, r.username, c.username
                ORDER BY gg.created_at DESC
            `;
            params = [userId];
        } else if (type === 'contributing') {
            sql = `
                SELECT 
                    gg.*,
                    r.username as recipient_username,
                    c.username as creator_username,
                    COUNT(ggc.id) as contributor_count
                FROM group_gifts gg
                JOIN users r ON gg.recipient_id = r.id
                JOIN users c ON gg.creator_id = c.id
                LEFT JOIN group_gift_contributions ggc ON gg.id = ggc.group_gift_id
                WHERE gg.id IN (
                    SELECT group_gift_id FROM group_gift_contributions WHERE contributor_id = $1
                )
                GROUP BY gg.id, r.username, c.username
                ORDER BY gg.created_at DESC
            `;
            params = [userId];
        } else {
            sql = `
                SELECT 
                    gg.*,
                    r.username as recipient_username,
                    c.username as creator_username,
                    COUNT(ggc.id) as contributor_count
                FROM group_gifts gg
                JOIN users r ON gg.recipient_id = r.id
                JOIN users c ON gg.creator_id = c.id
                LEFT JOIN group_gift_contributions ggc ON gg.id = ggc.group_gift_id
                WHERE (${status === 'active' ? "gg.status IN ('fundraising', 'ready')" : 'TRUE'})
                GROUP BY gg.id, r.username, c.username
                ORDER BY gg.created_at DESC
                LIMIT 50
            `;
            params = [];
        }
        
        const result = await postgres.query(sql, params);
        
        res.json({
            success: true,
            groupGifts: result.rows
        });
    } catch (error) {
        console.error('Get group gifts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch group gifts'
        });
    }
});

/**
 * @route POST /api/v1/gifting/group-gifts
 * @desc Create a group gift
 */
router.post('/group-gifts', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const creatorId = req.user.id;
        const { recipient_id, gift_type, gift_id, gift_name, total_cost, message } = req.body;
        
        if (!recipient_id || !gift_type || !gift_id || !gift_name || !total_cost) {
            return res.status(400).json({
                success: false,
                error: 'recipient_id, gift_type, gift_id, gift_name, and total_cost required'
            });
        }
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14); // 2 weeks to fund
        
        const mutation = await executeIdempotentMutation({
            scope: 'gifting.create_group_gift',
            idempotencyKey,
            requestPayload: { creatorId, ...req.body },
            actorUserId: creatorId,
            entityType: 'group_gift',
            eventType: 'create',
            mutationFn: async () => {
                const groupId = generateId('group');
                
                await postgres.query(
                    `INSERT INTO group_gifts (
                        id, recipient_id, gift_type, gift_id, gift_name,
                        total_cost, creator_id, message, expires_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING *`,
                    [groupId, recipient_id, gift_type, gift_id, gift_name, total_cost, creatorId, message || '', expiresAt]
                );
                
                return {
                    success: true,
                    groupGift: {
                        id: groupId,
                        recipient_id,
                        gift_name,
                        total_cost,
                        expires_at: expiresAt
                    }
                };
            }
        });
        
        res.status(201).json(mutation);
    } catch (error) {
        console.error('Create group gift error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create group gift'
        });
    }
});

/**
 * @route POST /api/v1/gifting/group-gifts/:id/contribute
 * @desc Contribute to a group gift
 */
router.post('/group-gifts/:id/contribute', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const contributorId = req.user.id;
        const { id } = req.params;
        const { amount, message } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid contribution amount required'
            });
        }
        
        const mutation = await executeIdempotentMutation({
            scope: 'gifting.contribute',
            idempotencyKey,
            requestPayload: { contributorId, groupGiftId: id, amount },
            actorUserId: contributorId,
            entityType: 'group_gift_contribution',
            eventType: 'contribute',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    // Get group gift with lock
                    const giftResult = await postgres.query(
                        'SELECT * FROM group_gifts WHERE id = $1 FOR UPDATE',
                        [id]
                    );
                    
                    const gift = giftResult.rows[0];
                    
                    if (!gift) {
                        const error = new Error('Group gift not found');
                        error.code = 'GIFT_NOT_FOUND';
                        throw error;
                    }
                    
                    if (gift.status === 'delivered') {
                        const error = new Error('This gift has already been delivered');
                        error.code = 'GIFT_DELIVERED';
                        throw error;
                    }
                    
                    if (new Date(gift.expires_at) < new Date()) {
                        const error = new Error('This group gift has expired');
                        error.code = 'GIFT_EXPIRED';
                        throw error;
                    }
                    
                    // Check contributor can afford
                    const contributor = await postgres.query(
                        'SELECT horror_coins FROM users WHERE id = $1 FOR UPDATE',
                        [contributorId]
                    );
                    
                    if (contributor.rows[0].horror_coins < amount) {
                        const error = new Error('Insufficient coins');
                        error.code = 'INSUFFICIENT_COINS';
                        throw error;
                    }
                    
                    // Deduct from contributor
                    await postgres.query(
                        'UPDATE users SET horror_coins = horror_coins - $2 WHERE id = $1',
                        [contributorId, amount]
                    );
                    
                    // Add contribution
                    const contributionId = generateId('contrib');
                    await postgres.query(
                        `INSERT INTO group_gift_contributions (
                            id, group_gift_id, contributor_id, amount, message
                        ) VALUES ($1, $2, $3, $4, $5)`,
                        [contributionId, id, contributorId, amount, message || '']
                    );
                    
                    // Update group gift progress
                    await postgres.query(
                        'UPDATE group_gifts SET current_amount = current_amount + $2 WHERE id = $1',
                        [id, amount]
                    );
                    
                    // Check if fully funded
                    const updatedGift = await postgres.query(
                        'SELECT current_amount, total_cost, status FROM group_gifts WHERE id = $1',
                        [id]
                    );
                    
                    let newStatus = gift.status;
                    if (updatedGift.rows[0].current_amount >= updatedGift.rows[0].total_cost) {
                        newStatus = 'ready';
                    }
                    
                    await postgres.query(
                        "UPDATE group_gifts SET status = $2 WHERE id = $1 AND status != 'delivered'",
                        [id, newStatus]
                    );
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        contribution: {
                            id: contributionId,
                            amount,
                            newTotal: updatedGift.rows[0].current_amount + amount,
                            isFullyFunded: newStatus === 'ready'
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
        console.error('Contribute to group gift error:', error);
        const statusMap = {
            'GIFT_NOT_FOUND': 404,
            'GIFT_DELIVERED': 409,
            'GIFT_EXPIRED': 409,
            'INSUFFICIENT_COINS': 409
        };
        res.status(statusMap[error.code] || 500).json({
            success: false,
            error: error.code || 'CONTRIBUTE_FAILED',
            message: error.message || 'Failed to contribute'
        });
    }
});

// ============================================
// GIFT HISTORY
// ============================================

/**
 * @route GET /api/v1/gifting/history
 * @desc Get user's gift history
 */
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type = 'all' } = req.query; // all, sent, received
        
        let sql;
        let params;
        
        if (type === 'sent') {
            sql = `
                SELECT 
                    gh.*,
                    s.username as sender_username,
                    r.username as recipient_username
                FROM gift_history gh
                JOIN users s ON gh.sender_id = s.id
                JOIN users r ON gh.recipient_id = r.id
                WHERE gh.sender_id = $1
                ORDER BY gh.created_at DESC
                LIMIT 50
            `;
            params = [userId];
        } else if (type === 'received') {
            sql = `
                SELECT 
                    gh.*,
                    s.username as sender_username,
                    r.username as recipient_username
                FROM gift_history gh
                JOIN users s ON gh.sender_id = s.id
                JOIN users r ON gh.recipient_id = r.id
                WHERE gh.recipient_id = $1
                ORDER BY gh.created_at DESC
                LIMIT 50
            `;
            params = [userId];
        } else {
            sql = `
                SELECT 
                    gh.*,
                    s.username as sender_username,
                    r.username as recipient_username
                FROM gift_history gh
                JOIN users s ON gh.sender_id = s.id
                JOIN users r ON gh.recipient_id = r.id
                WHERE gh.sender_id = $1 OR gh.recipient_id = $1
                ORDER BY gh.created_at DESC
                LIMIT 50
            `;
            params = [userId];
        }
        
        const result = await postgres.query(sql, params);
        
        res.json({
            success: true,
            history: result.rows
        });
    } catch (error) {
        console.error('Get gift history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch gift history'
        });
    }
});

/**
 * @route POST /api/v1/gifting/send
 * @desc Send a gift to another user
 */
router.post('/send', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const senderId = req.user.id;
        const { recipient_id, gift_type, gift_id, gift_name, message, occasion, is_wrapped } = req.body;
        
        if (!recipient_id || !gift_type || !gift_id || !gift_name) {
            return res.status(400).json({
                success: false,
                error: 'recipient_id, gift_type, gift_id, and gift_name required'
            });
        }
        
        const mutation = await executeIdempotentMutation({
            scope: 'gifting.send',
            idempotencyKey,
            requestPayload: { senderId, ...req.body },
            actorUserId: senderId,
            entityType: 'gift',
            eventType: 'send',
            mutationFn: async () => {
                const giftId = generateId('gift');
                
                await postgres.query(
                    `INSERT INTO gift_history (
                        id, sender_id, recipient_id, gift_type, gift_id, gift_name,
                        message, occasion, is_wrapped, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING *`,
                    [
                        giftId,
                        senderId,
                        recipient_id,
                        gift_type,
                        gift_id,
                        gift_name,
                        message || '',
                        occasion || 'just_because',
                        is_wrapped !== false,
                        'sent'
                    ]
                );
                
                return {
                    success: true,
                    gift: {
                        id: giftId,
                        sender_id: senderId,
                        recipient_id,
                        gift_name,
                        occasion
                    }
                };
            }
        });
        
        res.status(201).json(mutation);
    } catch (error) {
        console.error('Send gift error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send gift'
        });
    }
});

module.exports = router;
