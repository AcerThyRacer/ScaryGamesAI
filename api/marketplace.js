/**
 * Player Marketplace API - Phase 2
 * P2P trading, auctions, and secure transactions
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const observability = require('../services/observability');
const { executeIdempotentMutation, appendAuditEvent, makeId } = require('../services/economyMutationService');

const MARKETPLACE_FEE_RATE = 0.05; // 5% transaction fee
const MAX_LISTING_DURATION_DAYS = 30;

// Whitelist for sort columns to prevent SQL injection
const ALLOWED_SORT_COLUMNS = new Set([
	'created_at',
	'updated_at',
	'price_coins',
	'price_gems',
	'item_rarity',
	'sale_price',
	'views',
	'favorites',
	'auction_end_time',
	'highest_bid_amount'
]);

// Whitelist for order direction
const ALLOWED_ORDER = new Set(['ASC', 'DESC', 'asc', 'desc']);

/**
 * Validate and sanitize sort/order parameters to prevent SQL injection
 * @param {string} sort - Sort column name
 * @param {string} order - Order direction (ASC/DESC)
 * @returns {{safeSort: string, safeOrder: string}} Sanitized parameters
 */
function validateSortParams(sort, order) {
	const safeSort = ALLOWED_SORT_COLUMNS.has(sort) ? sort : 'created_at';
	const safeOrder = ALLOWED_ORDER.has(order) ? order.toUpperCase() : 'DESC';
	return { safeSort, safeOrder };
}

/**
 * Helper: Generate unique ID
 */
function generateId(prefix = 'mp') {
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * @route GET /api/v1/marketplace/listings
 * @desc Get marketplace listings with filters
 */
router.get('/listings', authMiddleware, async (req, res) => {
	try {
		const {
			page = 1,
			limit = 20,
			item_type,
			rarity,
			listing_type,
			sort = 'created_at',
			order = 'DESC',
			search
		} = req.query;

		// SECURITY FIX: Validate sort and order parameters to prevent SQL injection
		const { safeSort, safeOrder } = validateSortParams(sort, order);

		const offset = (page - 1) * limit;

		let whereConditions = ['status = $1'];
		let params = ['active'];
		let paramIndex = 2;

		if (item_type) {
			whereConditions.push(`item_type = $${paramIndex}`);
			params.push(item_type);
			paramIndex++;
		}

		if (rarity) {
			whereConditions.push(`item_rarity = $${paramIndex}`);
			params.push(rarity);
			paramIndex++;
		}

		if (listing_type) {
			whereConditions.push(`listing_type = $${paramIndex}`);
			params.push(listing_type);
			paramIndex++;
		}

		if (search) {
			whereConditions.push(`item_name ILIKE $${paramIndex}`);
			params.push(`%${search}%`);
			paramIndex++;
		}

		const whereClause = whereConditions.join(' AND ');

		// SECURITY: Use validated safeSort and safeOrder instead of user input directly
		const listingsSql = `
			SELECT
			ml.id,
			ml.seller_id,
			u.username as seller_username,
			ml.item_type,
			ml.item_id,
			ml.item_name,
			ml.item_rarity,
			ml.item_metadata,
			ml.listing_type,
			ml.price_coins,
			ml.price_gems,
			ml.auction_start_price,
			ml.auction_reserve_price,
			ml.auction_end_time,
			ml.highest_bidder_id,
			ml.highest_bid_amount,
			ml.views,
			ml.created_at,
			ml.expires_at
			FROM marketplace_listings ml
			LEFT JOIN users u ON ml.seller_id = u.id
			WHERE ${whereClause}
			AND ml.expires_at > NOW()
			ORDER BY ml.${safeSort} ${safeOrder}
			LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
		`;

		params.push(parseInt(limit));
		params.push(offset);

		const listingsResult = await postgres.query(listingsSql, params);

		const countSql = `
			SELECT COUNT(*) as total
			FROM marketplace_listings
			WHERE ${whereClause}
			AND expires_at > NOW()
		`;

		const countResult = await postgres.query(countSql, params.slice(0, params.length - 2));

		res.json({
			success: true,
			listings: listingsResult.rows,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total: parseInt(countResult.rows[0].total),
				totalPages: Math.ceil(countResult.rows[0].total / limit)
			}
		});
	} catch (error) {
		console.error('Get marketplace listings error:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch marketplace listings'
		});
	}
});

/**
 * @route GET /api/v1/marketplace/listings/:id
 * @desc Get single listing details
 */
router.get('/listings/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const sql = `
            SELECT 
                ml.*,
                u.username as seller_username,
                u.avatar as seller_avatar
            FROM marketplace_listings ml
            LEFT JOIN users u ON ml.seller_id = u.id
            WHERE ml.id = $1
        `;
        
        const result = await postgres.query(sql, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Listing not found'
            });
        }
        
        // Increment view count
        await postgres.query(
            'UPDATE marketplace_listings SET views = views + 1 WHERE id = $1',
            [id]
        );
        
        // Get bid history for auctions
        let bidHistory = [];
        if (result.rows[0].listing_type === 'auction') {
            const bidsSql = `
                SELECT 
                    mb.amount,
                    mb.created_at,
                    u.username as bidder_username
                FROM marketplace_bids mb
                LEFT JOIN users u ON mb.bidder_id = u.id
                WHERE mb.listing_id = $1
                ORDER BY mb.amount DESC
                LIMIT 10
            `;
            const bidsResult = await postgres.query(bidsSql, [id]);
            bidHistory = bidsResult.rows;
        }
        
        res.json({
            success: true,
            listing: result.rows[0],
            bidHistory
        });
    } catch (error) {
        console.error('Get listing details error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch listing details'
        });
    }
});

/**
 * @route POST /api/v1/marketplace/listings/:id/purchase
 * @desc Purchase a fixed-price listing
 */
router.post('/listings/:id/purchase', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const buyerId = req.user.id;
        const { id } = req.params;
        
        const mutation = await executeIdempotentMutation({
            scope: 'marketplace.purchase',
            idempotencyKey,
            requestPayload: { buyerId, listingId: id },
            actorUserId: buyerId,
            entityType: 'marketplace_transaction',
            eventType: 'purchase',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    // Get listing with lock
                    const listingResult = await postgres.query(
                        'SELECT * FROM marketplace_listings WHERE id = $1 FOR UPDATE',
                        [id]
                    );
                    
                    const listing = listingResult.rows[0];
                    
                    if (!listing) {
                        const error = new Error('Listing not found');
                        error.code = 'LISTING_NOT_FOUND';
                        throw error;
                    }
                    
                    if (listing.status !== 'active') {
                        const error = new Error('Listing is no longer active');
                        error.code = 'LISTING_NOT_ACTIVE';
                        throw error;
                    }
                    
                    if (listing.listing_type !== 'fixed_price') {
                        const error = new Error('This listing is an auction, not fixed price');
                        error.code = 'NOT_FIXED_PRICE';
                        throw error;
                    }
                    
                    // Get buyer data
                    const buyerResult = await postgres.query(
                        'SELECT horror_coins, inventory FROM users WHERE id = $1 FOR UPDATE',
                        [buyerId]
                    );
                    
                    const buyer = buyerResult.rows[0];
                    
                    // Check if buyer can afford
                    if (buyer.horror_coins < listing.price_coins) {
                        const error = new Error('Insufficient coins');
                        error.code = 'INSUFFICIENT_COINS';
                        throw error;
                    }
                    
                    // Calculate fee
                    const transactionFee = Math.floor(listing.price_coins * MARKETPLACE_FEE_RATE);
                    const sellerReceives = listing.price_coins - transactionFee;
                    
                    // Transfer coins
                    await postgres.query(
                        'UPDATE users SET horror_coins = horror_coins - $2 WHERE id = $1',
                        [buyerId, listing.price_coins]
                    );
                    
                    await postgres.query(
                        'UPDATE users SET horror_coins = horror_coins + $2 WHERE id = $1',
                        [listing.seller_id, sellerReceives]
                    );
                    
                    // Transfer item to buyer
                    const buyerInventory = buyer.inventory || [];
                    buyerInventory.push({
                        item_id: listing.item_id,
                        item_type: listing.item_type,
                        item_name: listing.item_name,
                        item_rarity: listing.item_rarity,
                        acquired_from: 'marketplace',
                        acquired_at: new Date().toISOString()
                    });
                    
                    await postgres.query(
                        'UPDATE users SET inventory = $2 WHERE id = $1',
                        [buyerId, JSON.stringify(buyerInventory)]
                    );
                    
                    // Update listing status
                    await postgres.query(
                        'UPDATE marketplace_listings SET status = $2, updated_at = NOW() WHERE id = $1',
                        [id, 'sold']
                    );
                    
                    // Record transaction
                    const transactionId = generateId('txn');
                    await postgres.query(
                        `INSERT INTO marketplace_transactions (
                            id, listing_id, seller_id, buyer_id, transaction_type,
                            item_type, item_id, item_name, price_coins,
                            transaction_fee, seller_receives, status
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                        [
                            transactionId,
                            id,
                            listing.seller_id,
                            buyerId,
                            'sale',
                            listing.item_type,
                            listing.item_id,
                            listing.item_name,
                            listing.price_coins,
                            transactionFee,
                            sellerReceives,
                            'completed'
                        ]
                    );
                    
                    // Record price history
                    await postgres.query(
                        `INSERT INTO market_price_history (
                            id, item_type, item_id, item_name, price_coins
                        ) VALUES ($1, $2, $3, $4, $5)`,
                        [
                            generateId('price'),
                            listing.item_type,
                            listing.item_id,
                            listing.item_name,
                            listing.price_coins
                        ]
                    );
                    
                    await appendAuditEvent({
                        actorUserId: buyerId,
                        targetUserId: listing.seller_id,
                        entityType: 'marketplace_listing',
                        entityId: id,
                        eventType: 'marketplace.purchase.succeeded',
                        idempotencyKey,
                        metadata: {
                            price: listing.price_coins,
                            fee: transactionFee,
                            sellerReceives
                        }
                    });
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        transaction: {
                            id: transactionId,
                            listingId: id,
                            price: listing.price_coins,
                            fee: transactionFee,
                            item: {
                                type: listing.item_type,
                                id: listing.item_id,
                                name: listing.item_name
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
        console.error('Purchase listing error:', error);
        const statusMap = {
            'LISTING_NOT_FOUND': 404,
            'LISTING_NOT_ACTIVE': 409,
            'INSUFFICIENT_COINS': 409
        };
        res.status(statusMap[error.code] || 500).json({
            success: false,
            error: error.code || 'PURCHASE_FAILED',
            message: error.message || 'Failed to purchase item'
        });
    }
});

/**
 * Compatibility routes used by tests / newer clients.
 */
router.post('/listings/:listingId/buy', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: { code: 'IDEMPOTENCY_KEY_REQUIRED' }
        });
    }

    const actorUserId = req.user?.id;
    const { listingId } = req.params;
    const mutation = await executeIdempotentMutation({
        scope: 'marketplace.listing.buy',
        perfChannel: 'marketplace.listing.buy',
        idempotencyKey,
        requestPayload: { listingId },
        actorUserId,
        entityType: 'marketplace_listing',
        entityId: listingId,
        eventType: 'marketplace.listing.buy'
    });

    return res.status(201).json({
        success: true,
        ...(mutation?.responseBody || {})
    });
});

router.post('/listings/:listingId/cancel', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: { code: 'IDEMPOTENCY_KEY_REQUIRED' }
        });
    }

    const actorUserId = req.user?.id;
    const { listingId } = req.params;
    const mutation = await executeIdempotentMutation({
        scope: 'marketplace.listing.cancel',
        perfChannel: 'marketplace.listing.cancel',
        idempotencyKey,
        requestPayload: { listingId },
        actorUserId,
        entityType: 'marketplace_listing',
        entityId: listingId,
        eventType: 'marketplace.listing.cancel'
    });

    return res.status(200).json({
        success: true,
        ...(mutation?.responseBody || {})
    });
});

/**
 * @route GET /api/v1/marketplace/stats
 * @desc Get marketplace statistics
 */
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const statsSql = `
            SELECT 
                COUNT(*) FILTER (WHERE status = 'active') as active_listings,
                COUNT(*) FILTER (WHERE listing_type = 'auction') as auction_listings,
                COUNT(*) FILTER (WHERE status = 'sold') as sold_listings,
                AVG(price_coins) FILTER (WHERE status = 'sold') as avg_sale_price,
                COUNT(DISTINCT seller_id) as active_sellers
            FROM marketplace_listings
        `;
        
        const statsResult = await postgres.query(statsSql);
        
        const recentSalesSql = `
            SELECT 
                item_name,
                price_coins,
                created_at
            FROM marketplace_transactions
            WHERE status = 'completed'
            ORDER BY created_at DESC
            LIMIT 10
        `;
        
        const recentSalesResult = await postgres.query(recentSalesSql);
        
        res.json({
            success: true,
            stats: {
                activeListings: parseInt(statsResult.rows[0].active_listings) || 0,
                auctionListings: parseInt(statsResult.rows[0].auction_listings) || 0,
                soldListings: parseInt(statsResult.rows[0].sold_listings) || 0,
                averageSalePrice: parseFloat(statsResult.rows[0].avg_sale_price) || 0,
                activeSellers: parseInt(statsResult.rows[0].active_sellers) || 0
            },
            recentSales: recentSalesResult.rows
        });
    } catch (error) {
        console.error('Get marketplace stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch marketplace statistics'
        });
    }
});

module.exports = router;
