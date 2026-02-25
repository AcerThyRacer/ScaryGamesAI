/**
 * Cosmetic Crafting System API - Phase 3
 * Dissolve, Craft, Transmog, Upgrade with complex mechanics
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation } = require('../services/economyMutationService');

function generateId(prefix = 'craft') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * @route GET /api/v1/crafting/recipes
 * @desc Get all crafting recipes (filtered by unlocks)
 */
router.get('/recipes', authMiddleware, async (req, res) => {
    try {
        const { type, discovered_only = true } = req.query;
        const userId = req.user.id;
        
        let sql = `
            SELECT 
                cr.*,
                ucp.times_crafted,
                ucp.is_unlocked
            FROM crafting_recipes cr
            LEFT JOIN user_crafting_progress ucp ON cr.id = ucp.recipe_id AND ucp.user_id = $1
            WHERE 1=1
        `;
        
        const params = [userId];
        let paramIndex = 2;
        
        if (type) {
            sql += ` AND cr.recipe_type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }
        
        if (discovered_only === 'true') {
            sql += ` AND (cr.is_discovered = TRUE OR ucp.is_unlocked = TRUE)`;
        }
        
        sql += ` ORDER BY cr.recipe_type, cr.created_at`;
        
        const result = await postgres.query(sql, params);
        
        res.json({
            success: true,
            recipes: result.rows
        });
    } catch (error) {
        console.error('Get recipes error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recipes'
        });
    }
});

/**
 * @route POST /api/v1/crafting/dissolve
 * @desc Dissolve item into essence
 */
router.post('/dissolve', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        const { item_id, item_type, quantity = 1 } = req.body;
        
        const mutation = await executeIdempotentMutation({
            scope: 'crafting.dissolve',
            idempotencyKey,
            requestPayload: { userId, item_id, item_type, quantity },
            actorUserId: userId,
            entityType: 'crafting',
            eventType: 'dissolve',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    // Get user inventory
                    const user = await postgres.query(
                        'SELECT inventory FROM users WHERE id = $1 FOR UPDATE',
                        [userId]
                    );
                    
                    const inventory = user.rows[0]?.inventory || [];
                    
                    // Find and remove items
                    let itemsRemoved = 0;
                    const updatedInventory = inventory.filter(item => {
                        if (item.item_id === item_id && item.item_type === item_type && itemsRemoved < quantity) {
                            itemsRemoved++;
                            return false;
                        }
                        return true;
                    });
                    
                    if (itemsRemoved < quantity) {
                        const error = new Error('Not enough items to dissolve');
                        error.code = 'INSUFFICIENT_ITEMS';
                        throw error;
                    }
                    
                    // Calculate essence based on rarity (simplified)
                    const rarity = inventory.find(i => i.item_id === item_id)?.item_rarity || 'common';
                    const essenceMap = {
                        common: { type: 'common_essence', amount: 1 },
                        uncommon: { type: 'uncommon_essence', amount: 2 },
                        rare: { type: 'rare_essence', amount: 5 },
                        epic: { type: 'epic_essence', amount: 10 },
                        legendary: { type: 'legendary_essence', amount: 25 },
                        mythic: { type: 'mythic_essence', amount: 50 }
                    };
                    
                    const essenceReward = essenceMap[rarity] || essenceMap.common;
                    const totalEssence = essenceReward.amount * quantity;
                    
                    // Update inventory
                    await postgres.query(
                        'UPDATE users SET inventory = $2 WHERE id = $1',
                        [userId, JSON.stringify(updatedInventory)]
                    );
                    
                    // Add essence to inventory
                    await postgres.query(
                        `INSERT INTO user_essence_inventory (user_id, essence_type_id, quantity)
                         SELECT $1, et.id, $3
                         FROM essence_types et
                         WHERE et.essence_key = $2
                         ON CONFLICT (user_id, essence_type_id)
                         DO UPDATE SET quantity = user_essence_inventory.quantity + $3, last_updated = NOW()`,
                        [userId, essenceReward.type, totalEssence]
                    );
                    
                    // Unlock transmog appearance
                    await postgres.query(
                        `INSERT INTO user_transmog_collection (user_id, item_appearance_key, item_name, item_type)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (user_id, item_appearance_key) DO NOTHING`,
                        [userId, `${item_type}_${item_id}`, `${item_type} Appearance`, item_type]
                    );
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        dissolved: {
                            item_id,
                            item_type,
                            quantity: itemsRemoved,
                            essenceReceived: {
                                type: essenceReward.type,
                                amount: totalEssence
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
        console.error('Dissolve item error:', error);
        res.status(500).json({
            success: false,
            error: error.code || 'DISSOLVE_FAILED',
            message: error.message || 'Failed to dissolve item'
        });
    }
});

/**
 * @route POST /api/v1/crafting/craft
 * @desc Craft item from recipe
 */
router.post('/craft', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        const { recipe_id } = req.body;
        
        const mutation = await executeIdempotentMutation({
            scope: 'crafting.craft',
            idempotencyKey,
            requestPayload: { userId, recipe_id },
            actorUserId: userId,
            entityType: 'crafting',
            eventType: 'craft',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    // Get recipe
                    const recipe = await postgres.query(
                        'SELECT * FROM crafting_recipes WHERE id = $1',
                        [recipe_id]
                    );
                    
                    if (recipe.rows.length === 0) {
                        const error = new Error('Recipe not found');
                        error.code = 'RECIPE_NOT_FOUND';
                        throw error;
                    }
                    
                    const recipeData = recipe.rows[0];
                    
                    // Check if user has materials
                    const ingredients = recipeData.ingredients || [];
                    
                    for (const ingredient of ingredients) {
                        if (ingredient.essence_type_id) {
                            const essenceResult = await postgres.query(
                                'SELECT quantity FROM user_essence_inventory WHERE user_id = $1 AND essence_type_id = $2',
                                [userId, ingredient.essence_type_id]
                            );
                            
                            const available = essenceResult.rows[0]?.quantity || 0;
                            if (available < ingredient.quantity) {
                                const error = new Error('Insufficient essence');
                                error.code = 'INSUFFICIENT_ESSENCE';
                                throw error;
                            }
                        }
                    }
                    
                    // Check currency
                    if (recipeData.gem_cost > 0) {
                        const user = await postgres.query('SELECT horror_coins FROM users WHERE id = $1', [userId]);
                        if (user.rows[0].horror_coins < recipeData.gem_cost) {
                            const error = new Error('Insufficient gems');
                            error.code = 'INSUFFICIENT_GEMS';
                            throw error;
                        }
                    }
                    
                    // Consume materials
                    for (const ingredient of ingredients) {
                        if (ingredient.essence_type_id) {
                            await postgres.query(
                                'UPDATE user_essence_inventory SET quantity = quantity - $3 WHERE user_id = $1 AND essence_type_id = $2',
                                [userId, ingredient.essence_type_id, ingredient.quantity]
                            );
                        }
                    }
                    
                    // Consume currency
                    if (recipeData.gem_cost > 0) {
                        await postgres.query(
                            'UPDATE users SET horror_coins = horror_coins - $2 WHERE id = $1',
                            [userId, recipeData.gem_cost]
                        );
                    }
                    
                    // Add to crafting queue if timed
                    if (recipeData.craft_time_seconds > 0) {
                        const queueId = generateId('queue');
                        const completesAt = new Date(Date.now() + recipeData.craft_time_seconds * 1000);
                        
                        await postgres.query(
                            `INSERT INTO crafting_queue (id, user_id, recipe_id, completes_at)
                             VALUES ($1, $2, $3, $4)`,
                            [queueId, userId, recipe_id, completesAt]
                        );
                        
                        return {
                            success: true,
                            queued: true,
                            completesAt,
                            queueId
                        };
                    } else {
                        // Instant craft - grant item
                        const user = await postgres.query('SELECT inventory FROM users WHERE id = $1', [userId]);
                        const inventory = user.rows[0]?.inventory || [];
                        const outputItem = recipeData.output_item;
                        
                        inventory.push({
                            item_id: outputItem.item_id,
                            item_type: outputItem.item_type,
                            item_name: outputItem.item_name,
                            item_rarity: outputItem.rarity,
                            acquired_from: 'crafting',
                            acquired_at: new Date().toISOString()
                        });
                        
                        await postgres.query(
                            'UPDATE users SET inventory = $2 WHERE id = $1',
                            [userId, JSON.stringify(inventory)]
                        );
                        
                        // Update craft count
                        await postgres.query(
                            `INSERT INTO user_crafting_progress (user_id, recipe_id, times_crafted, is_unlocked)
                             VALUES ($1, $2, 1, TRUE)
                             ON CONFLICT (user_id, recipe_id)
                             DO UPDATE SET times_crafted = user_crafting_progress.times_crafted + 1, is_unlocked = TRUE`,
                            [userId, recipe_id]
                        );
                        
                        return {
                            success: true,
                            crafted: true,
                            item: outputItem
                        };
                    }
                } catch (error) {
                    await postgres.query('ROLLBACK');
                    throw error;
                }
            }
        });
        
        res.status(200).json(mutation);
    } catch (error) {
        console.error('Craft item error:', error);
        res.status(500).json({
            success: false,
            error: error.code || 'CRAFT_FAILED',
            message: error.message || 'Failed to craft item'
        });
    }
});

/**
 * @route POST /api/v1/crafting/transmog
 * @desc Apply appearance from one item to another
 */
router.post('/transmog', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        const { target_item_id, appearance_key, gem_cost = 0 } = req.body;
        
        const mutation = await executeIdempotentMutation({
            scope: 'crafting.transmog',
            idempotencyKey,
            requestPayload: { userId, target_item_id, appearance_key, gem_cost },
            actorUserId: userId,
            entityType: 'crafting',
            eventType: 'transmog',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    // Check if appearance is unlocked
                    const transmog = await postgres.query(
                        'SELECT * FROM user_transmog_collection WHERE user_id = $1 AND item_appearance_key = $2',
                        [userId, appearance_key]
                    );
                    
                    if (transmog.rows.length === 0) {
                        const error = new Error('Appearance not unlocked');
                        error.code = 'APPEARANCE_LOCKED';
                        throw error;
                    }
                    
                    // Check user has gems
                    if (gem_cost > 0) {
                        const user = await postgres.query('SELECT horror_coins FROM users WHERE id = $1 FOR UPDATE', [userId]);
                        if (user.rows[0].horror_coins < gem_cost) {
                            const error = new Error('Insufficient gems');
                            error.code = 'INSUFFICIENT_GEMS';
                            throw error;
                        }
                        
                        await postgres.query(
                            'UPDATE users SET horror_coins = horror_coins - $2 WHERE id = $1',
                            [userId, gem_cost]
                        );
                    }
                    
                    // Update item with appearance (stored in metadata)
                    const user = await postgres.query('SELECT inventory FROM users WHERE id = $1', [userId]);
                    const inventory = user.rows[0]?.inventory || [];
                    
                    const targetItem = inventory.find(i => i.item_id === target_item_id);
                    if (!targetItem) {
                        const error = new Error('Target item not found in inventory');
                        error.code = 'ITEM_NOT_FOUND';
                        throw error;
                    }
                    
                    targetItem.appearance_override = appearance_key;
                    targetItem.transmog_applied = true;
                    
                    await postgres.query(
                        'UPDATE users SET inventory = $2 WHERE id = $1',
                        [userId, JSON.stringify(inventory)]
                    );
                    
                    // Increment usage count
                    await postgres.query(
                        'UPDATE user_transmog_collection SET usage_count = usage_count + 1 WHERE item_appearance_key = $1 AND user_id = $2',
                        [appearance_key, userId]
                    );
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        transmog: {
                            target_item_id,
                            appearance: appearance_key,
                            cost: gem_cost
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
        console.error('Transmog error:', error);
        res.status(500).json({
            success: false,
            error: error.code || 'TRANSMOG_FAILED',
            message: error.message || 'Failed to apply transmog'
        });
    }
});

/**
 * @route POST /api/v1/crafting/upgrade
 * @desc Upgrade item rarity
 */
router.post('/upgrade', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        const { item_id, item_type } = req.body;
        
        const mutation = await executeIdempotentMutation({
            scope: 'crafting.upgrade',
            idempotencyKey,
            requestPayload: { userId, item_id, item_type },
            actorUserId: userId,
            entityType: 'crafting',
            eventType: 'upgrade',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    const user = await postgres.query('SELECT inventory FROM users WHERE id = $1 FOR UPDATE', [userId]);
                    const inventory = user.rows[0]?.inventory || [];
                    
                    const targetItem = inventory.find(i => i.item_id === item_id && i.item_type === item_type);
                    if (!targetItem) {
                        const error = new Error('Item not found');
                        error.code = 'ITEM_NOT_FOUND';
                        throw error;
                    }
                    
                    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
                    const currentIndex = rarityOrder.indexOf(targetItem.item_rarity);
                    
                    if (currentIndex === -1 || currentIndex >= rarityOrder.length - 1) {
                        const error = new Error('Item cannot be upgraded further');
                        error.code = 'MAX_RARITY';
                        throw error;
                    }
                    
                    // Calculate upgrade cost (simplified)
                    const upgradeCost = {
                        common: 100, uncommon: 250, rare: 500, epic: 1000, legendary: 2500
                    };
                    
                    const cost = upgradeCost[targetItem.item_rarity] || 1000;
                    
                    // Check user has coins
                    const userCoins = await postgres.query('SELECT horror_coins FROM users WHERE id = $1', [userId]);
                    if (userCoins.rows[0].horror_coins < cost) {
                        const error = new Error('Insufficient coins');
                        error.code = 'INSUFFICIENT_COINS';
                        throw error;
                    }
                    
                    // Deduct coins
                    await postgres.query(
                        'UPDATE users SET horror_coins = horror_coins - $2 WHERE id = $1',
                        [userId, cost]
                    );
                    
                    // Upgrade rarity
                    targetItem.item_rarity = rarityOrder[currentIndex + 1];
                    targetItem.upgraded = true;
                    targetItem.upgrade_level = (targetItem.upgrade_level || 0) + 1;
                    
                    await postgres.query(
                        'UPDATE users SET inventory = $2 WHERE id = $1',
                        [userId, JSON.stringify(inventory)]
                    );
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        upgraded: {
                            item_id,
                            old_rarity: rarityOrder[currentIndex],
                            new_rarity: rarityOrder[currentIndex + 1],
                            cost
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
        console.error('Upgrade item error:', error);
        res.status(500).json({
            success: false,
            error: error.code || 'UPGRADE_FAILED',
            message: error.message || 'Failed to upgrade item'
        });
    }
});

/**
 * @route GET /api/v1/crafting/queue
 * @desc Get user's crafting queue
 */
router.get('/queue', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const sql = `
            SELECT 
                cq.*,
                cr.output_item,
                cr.name as recipe_name,
                EXTRACT(EPOCH FROM (cq.completes_at - NOW())) as seconds_remaining
            FROM crafting_queue cq
            JOIN crafting_recipes cr ON cq.recipe_id = cr.id
            WHERE cq.user_id = $1 AND cq.status = 'in_progress'
            ORDER BY cq.completes_at ASC
        `;
        
        const result = await postgres.query(sql, [userId]);
        
        res.json({
            success: true,
            queue: result.rows
        });
    } catch (error) {
        console.error('Get crafting queue error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch crafting queue'
        });
    }
});

/**
 * @route GET /api/v1/crafting/essence
 * @desc Get user's essence inventory
 */
router.get('/essence', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const sql = `
            SELECT 
                uei.quantity,
                et.essence_key,
                et.name,
                et.description,
                et.color,
                et.base_value
            FROM user_essence_inventory uei
            JOIN essence_types et ON uei.essence_type_id = et.id
            WHERE uei.user_id = $1 AND uei.quantity > 0
            ORDER BY et.base_value DESC
        `;
        
        const result = await postgres.query(sql, [userId]);
        
        res.json({
            success: true,
            essence: result.rows
        });
    } catch (error) {
        console.error('Get essence error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch essence inventory'
        });
    }
});

module.exports = router;
