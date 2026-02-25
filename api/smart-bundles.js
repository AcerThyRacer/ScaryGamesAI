/**
 * Smart Bundling Engine - Phase 1
 * AI-generated bundles, "Complete the Set" bonuses, dynamic bundle pricing
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const postgres = require('../models/postgres');
const observability = require('../services/observability');

// Bundle templates based on categories
const BUNDLE_TEMPLATES = [
  { id: 'horror_starter', name: 'Horror Starter Pack', categories: ['skins', 'effects'], minItems: 3, maxItems: 5, baseDiscount: 0.2 },
  { id: 'cosmetic_collector', name: 'Cosmetic Collector', categories: ['skins', 'effects', 'emotes'], minItems: 4, maxItems: 6, baseDiscount: 0.25 },
  { id: 'game_specific', name: 'Game Mastery Bundle', categories: ['skins', 'boosters'], minItems: 2, maxItems: 4, baseDiscount: 0.15 },
  { id: 'legendary_hunter', name: 'Legendary Hunter', categories: ['skins', 'effects', 'emotes', 'boosters'], minItems: 3, maxItems: 5, baseDiscount: 0.3, rarity: 'legendary' },
  { id: 'seasonal_special', name: 'Seasonal Special', categories: ['skins', 'effects'], minItems: 2, maxItems: 4, baseDiscount: 0.35, seasonal: true }
];

/**
 * GET /api/v1/bundles/recommended
 * Get AI-generated personalized bundles based on player behavior
 */
router.get('/recommended', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  const userId = req.user.id;

  try {
    let bundles = [];

    if (postgres.isEnabled()) {
      // Get player's purchase history
      const purchaseHistoryResult = await postgres.query(
        `SELECT metadata, created_at
         FROM entitlements
         WHERE user_id = $1
         AND entitlement_type = 'item'
         AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 100`,
        [userId]
      );

      // Get player's most-played games
      const gameStatsResult = await postgres.query(
        `SELECT game_id, COUNT(*) as sessions, SUM(score) as total_score
         FROM game_sessions
         WHERE user_id = $1
         GROUP BY game_id
         ORDER BY sessions DESC
         LIMIT 5`,
        [userId]
      );

      const topGames = gameStatsResult.rows;
      const purchaseHistory = purchaseHistoryResult.rows;

      // Analyze owned item types and rarities
      const ownedTypes = new Set();
      const ownedRarities = new Map();
      const ownedByGame = new Map();

      purchaseHistory.forEach(purchase => {
        const metadata = purchase.metadata || {};
        if (metadata.type) ownedTypes.add(metadata.type);
        if (metadata.rarity) {
          ownedRarities.set(metadata.rarity, (ownedRarities.get(metadata.rarity) || 0) + 1);
        }
        if (metadata.game) {
          ownedByGame.set(metadata.game, (ownedByGame.get(metadata.game) || 0) + 1);
        }
      });

      // Generate bundles based on templates
      for (const template of BUNDLE_TEMPLATES) {
        const bundle = await generateBundleForTemplate(template, topGames, ownedTypes, ownedRarities, ownedByGame);
        if (bundle) {
          bundles.push(bundle);
        }
      }

      // Sort by relevance score
      bundles.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    observability.recordPerfEvent('bundles.recommended.fetch', {
      durationMs: Date.now() - startedAt,
      bundleCount: bundles.length,
      userId
    });

    res.json({
      success: true,
      bundles,
      refreshAt: Date.now() + 3600000 // Refresh every hour
    });
  } catch (error) {
    observability.recordPerfEvent('bundles.recommended.fetch', {
      durationMs: Date.now() - startedAt,
      failed: true,
      userId
    }, { force: true });

    res.status(500).json({
      success: false,
      error: 'Unable to load recommended bundles'
    });
  }
});

/**
 * GET /api/v1/bundles/complete-set
 * Get "Complete the Set" bundles - items that complement owned collections
 */
router.get('/complete-set', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  const userId = req.user.id;

  try {
    let completeSetBundles = [];

    if (postgres.isEnabled()) {
      // Get owned items grouped by collection/theme
      const collectionResult = await postgres.query(
        `SELECT 
           metadata->>'collection' as collection,
           metadata->>'theme' as theme,
           metadata->>'game' as game,
           COUNT(*) as owned_count,
           ARRAY_AGG(DISTINCT metadata->>'type') as owned_types
         FROM entitlements
         WHERE user_id = $1
         AND entitlement_type = 'item'
         AND status = 'active'
         AND metadata IS NOT NULL
         GROUP BY metadata->>'collection', metadata->>'theme', metadata->>'game'
         HAVING COUNT(*) >= 2`,
        [userId]
      );

      const collections = collectionResult.rows;

      // For each partial collection, find missing complementary items
      for (const collection of collections) {
        const bundle = await generateCompleteSetBundle(collection, userId);
        if (bundle && bundle.items.length > 0) {
          completeSetBundles.push(bundle);
        }
      }

      // Limit to top 5 most relevant
      completeSetBundles.sort((a, b) => b.completionBonus - a.completionBonus);
      completeSetBundles = completeSetBundles.slice(0, 5);
    }

    observability.recordPerfEvent('bundles.complete_set.fetch', {
      durationMs: Date.now() - startedAt,
      bundleCount: completeSetBundles.length,
      userId
    });

    res.json({
      success: true,
      bundles: completeSetBundles,
      message: 'Complete your collection for bonus rewards!'
    });
  } catch (error) {
    observability.recordPerfEvent('bundles.complete_set.fetch', {
      durationMs: Date.now() - startedAt,
      failed: true,
      userId
    }, { force: true });

    res.status(500).json({
      success: false,
      error: 'Unable to load complete set bundles'
    });
  }
});

/**
 * POST /api/v1/bundles/custom
 * Create a custom bundle from selected items with dynamic pricing
 */
router.post('/custom', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  const userId = req.user.id;

  try {
    const { itemKeys } = req.body;

    if (!itemKeys || !Array.isArray(itemKeys) || itemKeys.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Select at least 2 items for a bundle'
      });
    }

    if (itemKeys.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 items per bundle'
      });
    }

    if (!postgres.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL required for bundle creation'
      });
    }

    // Get items from database
    const itemsResult = await postgres.query(
      `SELECT * FROM seasonal_store_items
       WHERE item_key = ANY($1)
       AND is_active = TRUE
       AND starts_at <= NOW()
       AND ends_at >= NOW()`,
      [itemKeys]
    );

    if (itemsResult.rows.length !== itemKeys.length) {
      return res.status(400).json({
        success: false,
        error: 'Some items are not available'
      });
    }

    const items = itemsResult.rows;
    const totalOriginalPrice = items.reduce((sum, item) => sum + item.price_coins, 0);

    // Calculate dynamic discount based on bundle size
    const bundleSize = items.length;
    let discountRate = 0.1; // Base 10% discount

    if (bundleSize >= 3) discountRate = 0.15;
    if (bundleSize >= 5) discountRate = 0.2;
    if (bundleSize >= 7) discountRate = 0.25;
    if (bundleSize >= 10) discountRate = 0.3;

    // Check for collection synergy (items from same collection/theme)
    const collections = new Set(items.map(i => i.metadata?.collection));
    const themes = new Set(items.map(i => i.metadata?.theme));

    if (collections.size === 1 || themes.size === 1) {
      discountRate += 0.05; // Extra 5% for thematic bundles
    }

    const finalPrice = Math.floor(totalOriginalPrice * (1 - discountRate));
    const savings = totalOriginalPrice - finalPrice;

    observability.recordPerfEvent('bundles.custom.create', {
      durationMs: Date.now() - startedAt,
      bundleSize,
      discountRate,
      userId
    });

    res.json({
      success: true,
      bundle: {
        items: items.map(item => ({
          ...item,
          originalPrice: item.price_coins
        })),
        totalOriginalPrice,
        discountPercent: Math.round(discountRate * 100),
        finalPrice,
        savings,
        expiresAt: Date.now() + 900000 // Bundle offer expires in 15 minutes
      }
    });
  } catch (error) {
    observability.recordPerfEvent('bundles.custom.create', {
      durationMs: Date.now() - startedAt,
      failed: true,
      userId
    }, { force: true });

    res.status(500).json({
      success: false,
      error: 'Unable to create custom bundle'
    });
  }
});

/**
 * POST /api/v1/bundles/purchase
 * Purchase a recommended or custom bundle
 */
router.post('/purchase', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  const userId = req.user.id;

  try {
    const { bundleId, itemKeys } = req.body;

    if (!postgres.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL required for bundle purchases'
      });
    }

    await postgres.query('BEGIN');

    try {
      // Get user's coin balance
      const userResult = await postgres.query(
        `SELECT horror_coins FROM users WHERE id = $1 FOR UPDATE`,
        [userId]
      );

      const user = userResult.rows[0];
      if (!user) {
        await postgres.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Determine items to purchase
      let items = [];
      let totalPrice = 0;
      let bundleName = 'Custom Bundle';

      if (bundleId) {
        // Purchase from recommended bundle - regenerate to get current items
        // (In production, you'd cache the bundle or store it temporarily)
        return res.status(400).json({
          success: false,
          error: 'Please use custom bundle purchase with itemKeys'
        });
      } else if (itemKeys) {
        const itemsResult = await postgres.query(
          `SELECT * FROM seasonal_store_items
           WHERE item_key = ANY($1)
           AND is_active = TRUE`,
          [itemKeys]
        );
        items = itemsResult.rows;
        
        // Calculate bundle price
        const totalOriginalPrice = items.reduce((sum, item) => sum + item.price_coins, 0);
        const bundleSize = items.length;
        let discountRate = 0.1;
        if (bundleSize >= 3) discountRate = 0.15;
        if (bundleSize >= 5) discountRate = 0.2;
        if (bundleSize >= 7) discountRate = 0.25;
        if (bundleSize >= 10) discountRate = 0.3;
        
        totalPrice = Math.floor(totalOriginalPrice * (1 - discountRate));
        bundleName = `${bundleSize}-Item Bundle`;
      }

      // Check if user has enough coins
      if (user.horror_coins < totalPrice) {
        await postgres.query('ROLLBACK');
        return res.status(402).json({
          success: false,
          error: 'Insufficient coins',
          required: totalPrice,
          available: user.horror_coins
        });
      }

      // Deduct coins and grant items
      const purchasedItemKeys = items.map(i => i.item_key);
      await postgres.query(
        `UPDATE users
         SET horror_coins = horror_coins - $2,
             inventory = COALESCE(inventory, '[]'::jsonb) || $3::jsonb,
             updated_at = NOW()
         WHERE id = $1`,
        [userId, totalPrice, JSON.stringify(purchasedItemKeys)]
      );

      // Create entitlements for each item
      for (const item of items) {
        await postgres.query(
          `INSERT INTO entitlements (
             id, user_id, entitlement_type, status, quantity,
             granted_reason, metadata, created_at
           ) VALUES ($1, $2, 'item', 'active', 1, 'bundle_purchase', $3, NOW())`,
          [
            `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            JSON.stringify({ itemKey: item.item_key, source: 'bundle', bundleName })
          ]
        );
      }

      await postgres.query('COMMIT');

      observability.recordPerfEvent('bundles.purchase', {
        durationMs: Date.now() - startedAt,
        bundleSize: items.length,
        totalPrice,
        userId
      });

      res.json({
        success: true,
        bundle: {
          name: bundleName,
          itemCount: items.length,
          totalPrice,
          originalPrice: items.reduce((sum, item) => sum + item.price_coins, 0),
          savings: items.reduce((sum, item) => sum + item.price_coins, 0) - totalPrice
        },
        remainingCoins: user.horror_coins - totalPrice,
        message: `Bundle purchased! You saved ${items.reduce((sum, item) => sum + item.price_coins, 0) - totalPrice} coins!`
      });

    } catch (error) {
      await postgres.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    observability.recordPerfEvent('bundles.purchase', {
      durationMs: Date.now() - startedAt,
      failed: true,
      userId
    }, { force: true });

    res.status(500).json({
      success: false,
      error: 'Unable to purchase bundle'
    });
  }
});

// Helper function to generate bundle for a template
async function generateBundleForTemplate(template, topGames, ownedTypes, ownedRarities, ownedByGame) {
  if (!postgres.isEnabled()) return null;

  // Build query based on template
  let categoryFilters = template.categories.map(cat => `metadata->>'type' = '${cat}'`).join(' OR ');
  
  if (template.rarity) {
    categoryFilters += ` AND metadata->>'rarity' = '${template.rarity}'`;
  }

  // Prefer items from player's top games
  const gameFilters = topGames.map(g => `metadata->>'game' = '${g.game_id}'`).join(' OR ');
  
  const query = `
    SELECT * FROM seasonal_store_items
    WHERE is_active = TRUE
    AND starts_at <= NOW()
    AND ends_at >= NOW()
    AND (${categoryFilters})
    ${gameFilters ? `AND (${gameFilters})` : ''}
    ORDER BY 
      CASE 
        WHEN metadata->>'rarity' = 'legendary' THEN 1
        WHEN metadata->>'rarity' = 'epic' THEN 2
        ELSE 3
      END,
      created_at DESC
    LIMIT ${template.maxItems}
  `;

  const result = await postgres.query(query);
  const items = result.rows;

  if (items.length < template.minItems) {
    // Try without game filter
    const fallbackQuery = `
      SELECT * FROM seasonal_store_items
      WHERE is_active = TRUE
      AND starts_at <= NOW()
      AND ends_at >= NOW()
      AND (${categoryFilters})
      ORDER BY random()
      LIMIT ${template.maxItems}
    `;
    
    const fallbackResult = await postgres.query(fallbackQuery);
    if (fallbackResult.rows.length < template.minItems) {
      return null;
    }
    return createBundleFromItems(template, fallbackResult.rows, topGames, ownedTypes, ownedRarities);
  }

  return createBundleFromItems(template, items, topGames, ownedTypes, ownedRarities);
}

function createBundleFromItems(template, items, topGames, ownedTypes, ownedRarities) {
  const totalOriginalPrice = items.reduce((sum, item) => sum + item.price_coins, 0);
  const bundleSize = items.length;
  
  // Calculate discount based on bundle size and template
  let discountRate = template.baseDiscount;
  if (bundleSize >= 5) discountRate += 0.05;
  if (bundleSize >= 7) discountRate += 0.05;
  
  const finalPrice = Math.floor(totalOriginalPrice * (1 - discountRate));
  
  // Calculate relevance score
  let relevanceScore = 0;
  items.forEach(item => {
    const metadata = item.metadata || {};
    if (topGames.some(g => g.game_id === metadata.game)) relevanceScore += 20;
    if (metadata.type && !ownedTypes.has(metadata.type)) relevanceScore += 15;
    if (metadata.rarity && ownedRarities.has(metadata.rarity)) relevanceScore += 10;
  });

  return {
    id: `bundle_${template.id}_${Date.now()}`,
    templateId: template.id,
    name: template.name,
    items: items.map(item => ({
      ...item,
      originalPrice: item.price_coins
    })),
    totalOriginalPrice,
    discountPercent: Math.round(discountRate * 100),
    finalPrice,
    savings: totalOriginalPrice - finalPrice,
    relevanceScore,
    expiresAt: Date.now() + 3600000,
    reasons: generateBundleReasons(template, items, topGames, ownedTypes)
  };
}

function generateBundleReasons(template, items, topGames, ownedTypes) {
  const reasons = [];
  
  if (template.seasonal) {
    reasons.push('Seasonal special offer');
  }
  
  const gameMatch = items.find(item => {
    const metadata = item.metadata || {};
    return topGames.some(g => g.game_id === metadata.game);
  });
  
  if (gameMatch) {
    reasons.push('Matches your favorite games');
  }
  
  const newType = items.find(item => {
    const metadata = item.metadata || {};
    return metadata.type && !ownedTypes.has(metadata.type);
  });
  
  if (newType) {
    reasons.push('Discover new item types');
  }
  
  if (reasons.length === 0) {
    reasons.push('Curated for you');
  }
  
  return reasons;
}

async function generateCompleteSetBundle(collection, userId) {
  if (!postgres.isEnabled()) return null;

  const { collection: collectionName, theme, game, owned_count, owned_types } = collection;
  
  // Determine what type is missing
  const allTypes = ['skins', 'effects', 'emotes', 'boosters'];
  const missingTypes = allTypes.filter(t => !owned_types.includes(t));
  
  if (missingTypes.length === 0) return null;
  
  // Build query to find complementary items
  let whereClause = '';
  const params = [];
  let paramIndex = 1;
  
  if (collectionName) {
    params.push(collectionName);
    whereClause += ` AND metadata->>'collection' = $${paramIndex++}`;
  } else if (theme) {
    params.push(theme);
    whereClause += ` AND metadata->>'theme' = $${paramIndex++}`;
  } else if (game) {
    params.push(game);
    whereClause += ` AND metadata->>'game' = $${paramIndex++}`;
  }
  
  // Exclude already owned types
  const typeFilter = missingTypes.map(t => `metadata->>'type' = '${t}'`).join(' OR ');
  
  const query = `
    SELECT * FROM seasonal_store_items
    WHERE is_active = TRUE
    AND starts_at <= NOW()
    AND ends_at >= NOW()
    AND (${typeFilter})
    ${whereClause}
    ORDER BY random()
    LIMIT 3
  `;
  
  const result = await postgres.query(query, params);
  const items = result.rows;
  
  if (items.length === 0) return null;
  
  const totalOriginalPrice = items.reduce((sum, item) => sum + item.price_coins, 0);
  const completionBonus = owned_count * 50; // Bonus based on how many already owned
  
  return {
    id: `complete_set_${Date.now()}`,
    name: `Complete ${collectionName || theme || game} Collection`,
    items: items.map(item => ({
      ...item,
      originalPrice: item.price_coins
    })),
    totalOriginalPrice,
    discountPercent: 20,
    finalPrice: Math.floor(totalOriginalPrice * 0.8),
    completionBonus,
    ownedCount: owned_count,
    message: `You own ${owned_count} items from this collection!`,
    expiresAt: Date.now() + 1800000
  };
}

module.exports = router;
