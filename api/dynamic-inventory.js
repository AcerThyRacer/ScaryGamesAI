/**
 * Dynamic Inventory System - Phase 1
 * Hourly flash sales, personalized recommendations, region-specific offers
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const postgres = require('../models/postgres');
const observability = require('../services/observability');

// Flash sale configurations
const FLASH_SALE_TEMPLATES = [
  { type: 'mystery_box', discount: 0.3, duration: 3600000 }, // 1 hour
  { type: 'category_discount', category: 'skins', discount: 0.25, duration: 7200000 },
  { type: 'category_discount', category: 'effects', discount: 0.3, duration: 7200000 },
  { type: 'bundle_deal', discount: 0.4, duration: 14400000 },
  { type: 'rarity_flash', rarity: 'legendary', discount: 0.35, duration: 3600000 }
];

// Time-based modifiers
const TIME_MODIFIERS = {
  night: { hours: [0, 1, 2, 3, 4, 5], multiplier: 1.2, theme: 'nightmare' },
  morning: { hours: [6, 7, 8, 9, 10, 11], multiplier: 1.0, theme: 'normal' },
  afternoon: { hours: [12, 13, 14, 15, 16, 17], multiplier: 1.1, theme: 'normal' },
  evening: { hours: [18, 19, 20, 21, 22, 23], multiplier: 1.3, theme: 'horror' }
};

/**
 * Get current flash sale
 */
router.get('/flash-sale', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  
  try {
    // Determine current hour block
    const now = new Date();
    const hourBlock = Math.floor(now.getMinutes() / 15) * 15;
    const saleSeed = `${now.getDate()}-${Math.floor(now.getHours() / 2)}-${hourBlock}`;
    
    // Deterministic random based on seed
    const seededRandom = seededRandomFromString(saleSeed);
    const selectedTemplate = FLASH_SALE_TEMPLATES[Math.floor(seededRandom() * FLASH_SALE_TEMPLATES.length)];
    
    // Calculate end time
    const saleStartTime = new Date(now.getTime() - (now.getMinutes() % 15) * 60000);
    const saleEndTime = new Date(saleStartTime.getTime() + selectedTemplate.duration);
    
    // Get items for this sale
    let saleItems = [];
    
    if (postgres.isEnabled()) {
      if (selectedTemplate.type === 'category_discount') {
        const itemsResult = await postgres.query(
          `SELECT * FROM seasonal_store_items 
           WHERE metadata->>'category' = $1 
           AND is_active = TRUE 
           AND starts_at <= NOW() 
           AND ends_at >= NOW()
           ORDER BY random() 
           LIMIT 8`,
          [selectedTemplate.category]
        );
        saleItems = itemsResult.rows;
      } else if (selectedTemplate.type === 'rarity_flash') {
        const itemsResult = await postgres.query(
          `SELECT * FROM seasonal_store_items 
           WHERE metadata->>'rarity' = $1 
           AND is_active = TRUE 
           AND starts_at <= NOW() 
           AND ends_at >= NOW()
           ORDER BY random() 
           LIMIT 5`,
          [selectedTemplate.rarity]
        );
        saleItems = itemsResult.rows;
      }
    }
    
    // Calculate time remaining
    const timeRemaining = Math.max(0, saleEndTime.getTime() - Date.now());
    
    observability.recordPerfEvent('inventory.flash_sale.fetch', {
      durationMs: Date.now() - startedAt,
      saleType: selectedTemplate.type,
      itemCount: saleItems.length,
      userId: req?.user?.id || null
    });
    
    res.json({
      success: true,
      sale: {
        type: selectedTemplate.type,
        discount: selectedTemplate.discount,
        startTime: saleStartTime.toISOString(),
        endTime: saleEndTime.toISOString(),
        timeRemaining,
        theme: TIME_MODIFIERS[getTimePeriod(now.getHours())].theme,
        items: saleItems.map(item => ({
          ...item,
          originalPrice: item.price_coins,
          salePrice: Math.floor(item.price_coins * (1 - selectedTemplate.discount)),
          discountPercent: Math.round(selectedTemplate.discount * 100)
        }))
      }
    });
  } catch (error) {
    observability.recordPerfEvent('inventory.flash_sale.fetch', {
      durationMs: Date.now() - startedAt,
      failed: true,
      userId: req?.user?.id || null
    }, { force: true });
    
    res.status(500).json({
      success: false,
      error: 'Unable to load flash sale'
    });
  }
});

/**
 * Get personalized recommendations
 */
router.get('/recommendations', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  const userId = req.user.id;
  
  try {
    let recommendations = [];
    
    if (postgres.isEnabled()) {
      // Get player's purchase history and play patterns
      const historyResult = await postgres.query(
        `SELECT 
           e.metadata,
           e.created_at,
           COUNT(*) OVER (PARTITION BY e.entitlement_type) as type_count
         FROM entitlements e
         WHERE e.user_id = $1
         AND e.status = 'active'
         ORDER BY e.created_at DESC
         LIMIT 50`,
        [userId]
      );
      
      const purchaseHistory = historyResult.rows;
      
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
      
      // Build recommendation profile
      const ownedItemTypes = new Set();
      const preferredRarities = new Map();
      
      purchaseHistory.forEach(purchase => {
        const metadata = purchase.metadata || {};
        if (metadata.type) ownedItemTypes.add(metadata.type);
        if (metadata.rarity) {
          preferredRarities.set(metadata.rarity, (preferredRarities.get(metadata.rarity) || 0) + 1);
        }
      });
      
      // Get recommendations from store
      const recommendedItemsResult = await postgres.query(
        `SELECT * FROM seasonal_store_items
         WHERE is_active = TRUE
         AND starts_at <= NOW()
         AND ends_at >= NOW()
         ORDER BY 
           CASE WHEN metadata->>'rarity' = 'legendary' THEN 1
                WHEN metadata->>'rarity' = 'epic' THEN 2
                ELSE 3 END,
           created_at DESC
         LIMIT 20`
      );
      
      // Score and rank recommendations
      recommendations = recommendedItemsResult.rows.map(item => {
        let score = 0;
        const metadata = item.metadata || {};
        
        // Prefer items from top games
        if (topGames.some(g => g.game_id === metadata.game)) {
          score += 30;
        }
        
        // Prefer complementary types (items they don't own)
        if (metadata.type && !ownedItemTypes.has(metadata.type)) {
          score += 25;
        }
        
        // Prefer preferred rarities
        if (metadata.rarity && preferredRarities.has(metadata.rarity)) {
          score += preferredRarities.get(metadata.rarity) * 10;
        }
        
        // Boost new items
        const itemAge = Date.now() - new Date(item.created_at).getTime();
        if (itemAge < 86400000 * 3) { // Less than 3 days old
          score += 15;
        }
        
        // Time-of-day boost
        const currentHour = new Date().getHours();
        const timePeriod = getTimePeriod(currentHour);
        if (timePeriod === 'night' && metadata.theme === 'dark') {
          score += 20;
        }
        
        return {
          ...item,
          recommendationScore: score,
          recommendationReasons: buildRecommendationReasons(item, topGames, ownedItemTypes, preferredRarities)
        };
      })
      .filter(item => item.recommendationScore > 0)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 12);
    }
    
    observability.recordPerfEvent('inventory.recommendations.fetch', {
      durationMs: Date.now() - startedAt,
      itemCount: recommendations.length,
      userId
    });
    
    res.json({
      success: true,
      recommendations,
      refreshAt: Date.now() + 3600000 // Refresh every hour
    });
  } catch (error) {
    observability.recordPerfEvent('inventory.recommendations.fetch', {
      durationMs: Date.now() - startedAt,
      failed: true,
      userId
    }, { force: true });
    
    res.status(500).json({
      success: false,
      error: 'Unable to load recommendations'
    });
  }
});

/**
 * Get region-specific offers
 */
router.get('/regional-offers', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  
  try {
    const userCountry = req.headers['x-country-code'] || 'US';
    const now = new Date();
    
    // Regional modifiers
    const regionalOffers = {
      US: { currency: 'USD', multiplier: 1.0, special: 'black_friday' },
      EU: { currency: 'EUR', multiplier: 0.9, special: 'winter_sale' },
      UK: { currency: 'GBP', multiplier: 0.8, special: 'boxing_day' },
      JP: { currency: 'JPY', multiplier: 110, special: 'cherry_blossom' },
      KR: { currency: 'KRW', multiplier: 1300, special: 'lunar_new_year' },
      BR: { currency: 'BRL', multiplier: 5.0, special: 'carnival' },
      AU: { currency: 'AUD', multiplier: 1.5, special: 'summer_sale' }
    };
    
    const region = regionalOffers[userCountry] || regionalOffers.US;
    
    // Get seasonal items for this region
    let regionalItems = [];
    if (postgres.isEnabled()) {
      const itemsResult = await postgres.query(
        `SELECT * FROM seasonal_store_items
         WHERE is_active = TRUE
         AND starts_at <= NOW()
         AND ends_at >= NOW()
         AND (metadata->>'region' IS NULL OR metadata->>'region' = $1)
         ORDER BY price_coins ASC
         LIMIT 15`,
        [userCountry]
      );
      
      regionalItems = itemsResult.rows.map(item => ({
        ...item,
        price_coins: Math.floor(item.price_coins * region.multiplier),
        currency: region.currency,
        specialEvent: region.special
      }));
    }
    
    observability.recordPerfEvent('inventory.regional_offers.fetch', {
      durationMs: Date.now() - startedAt,
      region: userCountry,
      itemCount: regionalItems.length
    });
    
    res.json({
      success: true,
      region: userCountry,
      currency: region.currency,
      specialEvent: region.special,
      items: regionalItems
    });
  } catch (error) {
    observability.recordPerfEvent('inventory.regional_offers.fetch', {
      durationMs: Date.now() - startedAt,
      failed: true
    }, { force: true });
    
    res.status(500).json({
      success: false,
      error: 'Unable to load regional offers'
    });
  }
});

/**
 * Mystery Box Gacha System
 */
router.post('/mystery-box', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  const userId = req.user.id;
  
  try {
    const { boxType } = req.body;
    
    if (!boxType || !['common', 'uncommon', 'rare', 'legendary'].includes(boxType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid box type'
      });
    }
    
    // Mystery box prices
    const BOX_PRICES = {
      common: 500,
      uncommon: 1500,
      rare: 3000,
      legendary: 7500
    };
    
    // Drop rates
    const DROP_RATES = {
      common: { common: 0.60, uncommon: 0.30, rare: 0.09, legendary: 0.01 },
      uncommon: { common: 0.30, uncommon: 0.50, rare: 0.17, legendary: 0.03 },
      rare: { common: 0.10, uncommon: 0.30, rare: 0.50, legendary: 0.10 },
      legendary: { common: 0.05, uncommon: 0.20, rare: 0.50, legendary: 0.25 }
    };
    
    if (!postgres.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'PostgreSQL required for mystery boxes'
      });
    }
    
    await postgres.query('BEGIN');
    
    try {
      // Check user balance
      const userResult = await postgres.query(
        `SELECT horror_coins FROM users WHERE id = $1 FOR UPDATE`,
        [userId]
      );
      
      const user = userResult.rows[0];
      if (!user || user.horror_coins < BOX_PRICES[boxType]) {
        await postgres.query('ROLLBACK');
        return res.status(402).json({
          success: false,
          error: 'Insufficient coins'
        });
      }
      
      // Determine rarity drop
      const rates = DROP_RATES[boxType];
      const roll = Math.random();
      let droppedRarity = 'common';
      let cumulative = 0;
      
      for (const [rarity, rate] of Object.entries(rates)) {
        cumulative += rate;
        if (roll <= cumulative) {
          droppedRarity = rarity;
          break;
        }
      }
      
      // Get random item of that rarity
      const itemResult = await postgres.query(
        `SELECT * FROM seasonal_store_items
         WHERE metadata->>'rarity' = $1
         AND is_active = TRUE
         ORDER BY random()
         LIMIT 1`,
        [droppedRarity]
      );
      
      if (itemResult.rows.length === 0) {
        await postgres.query('ROLLBACK');
        return res.status(500).json({
          success: false,
          error: 'No items available'
        });
      }
      
      const item = itemResult.rows[0];
      
      // Deduct coins and grant item
      await postgres.query(
        `UPDATE users 
         SET horror_coins = horror_coins - $2,
             inventory = COALESCE(inventory, '[]'::jsonb) || $3::jsonb,
             updated_at = NOW()
         WHERE id = $1`,
        [userId, BOX_PRICES[boxType], JSON.stringify([item.item_key])]
      );
      
      // Create entitlement
      await postgres.query(
        `INSERT INTO entitlements (
           id, user_id, entitlement_type, status, quantity,
           granted_reason, metadata, created_at
         ) VALUES ($1, $2, 'item', 'active', 1, 'mystery_box', $3, NOW())`,
        [
          `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          JSON.stringify({ itemKey: item.item_key, source: 'mystery_box', boxType })
        ]
      );
      
      await postgres.query('COMMIT');
      
      observability.recordPerfEvent('inventory.mystery_box.open', {
        durationMs: Date.now() - startedAt,
        boxType,
        droppedRarity,
        itemKey: item.item_key,
        userId
      });
      
      res.json({
        success: true,
        item: {
          ...item,
          droppedRarity,
          isLegendary: droppedRarity === 'legendary'
        },
        coinsSpent: BOX_PRICES[boxType],
        message: droppedRarity === 'legendary' 
          ? '🎉 LEGENDARY DROP! You found an ultra-rare item!' 
          : `You received a ${droppedRarity} item!`
      });
      
    } catch (error) {
      await postgres.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    observability.recordPerfEvent('inventory.mystery_box.open', {
      durationMs: Date.now() - startedAt,
      failed: true,
      userId
    }, { force: true });
    
    res.status(500).json({
      success: false,
      error: 'Unable to open mystery box'
    });
  }
});

// Helper functions
function seededRandomFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return function() {
    hash = Math.sin(hash) * 10000;
    return hash - Math.floor(hash);
  };
}

function getTimePeriod(hour) {
  const period = Object.entries(TIME_MODIFIERS).find(([, data]) => 
    data.hours.includes(hour)
  );
  return period ? period[0] : 'normal';
}

function buildRecommendationReasons(item, topGames, ownedItemTypes, preferredRarities) {
  const reasons = [];
  const metadata = item.metadata || {};
  
  if (topGames.some(g => g.game_id === metadata.game)) {
    reasons.push('Matches your favorite games');
  }
  
  if (metadata.type && !ownedItemTypes.has(metadata.type)) {
    reasons.push('New item type for you');
  }
  
  if (metadata.rarity && preferredRarities.has(metadata.rarity)) {
    reasons.push('Matches your preferred rarity');
  }
  
  const itemAge = Date.now() - new Date(item.created_at).getTime();
  if (itemAge < 86400000 * 3) {
    reasons.push('New arrival');
  }
  
  return reasons.length > 0 ? reasons : ['Recommended for you'];
}

module.exports = router;
