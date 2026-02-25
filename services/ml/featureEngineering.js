/**
 * Feature Engineering Pipeline for ML Models
 * Phase 5: AI-Powered Personalization
 * 
 * Extracts, transforms, and caches features for recommendation models
 * Real-time feature computation with Redis caching
 * 
 * @module services/ml/featureEngineering
 */

const crypto = require('crypto');

class FeatureEngineeringPipeline {
  /**
   * Create feature pipeline
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.cache = new Map();
    this.cacheExpiry = config.cacheExpiry || 3600000; // 1 hour
    this.featureStore = config.featureStore || new Map();
    
    // Feature extractors
    this.userFeatureExtractors = [
      this.extractDemographicFeatures.bind(this),
      this.extractBehavioralFeatures.bind(this),
      this.extractPreferenceFeatures.bind(this),
      this.extractTemporalFeatures.bind(this),
      this.extractSocialFeatures.bind(this)
    ];
    
    this.itemFeatureExtractors = [
      this.extractItemMetadata.bind(this),
      this.extractItemPopularity.bind(this),
      this.extractItemTemporal.bind(this)
    ];
    
    this.contextFeatureExtractors = [
      this.extractTimeContext.bind(this),
      this.extractDeviceContext.bind(this),
      this.extractSessionContext.bind(this)
    ];
  }

  /**
   * Extract all features for a user
   * @param {Object} userData - User data
   * @returns {Object} Feature vector
   */
  async extractUserFeatures(userData) {
    const cacheKey = `user_${userData.userId}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;
    
    const features = {};
    
    // Run all extractors
    for (const extractor of this.userFeatureExtractors) {
      const extracted = await extractor(userData);
      Object.assign(features, extracted);
    }
    
    // Normalize features
    const normalized = this.normalizeFeatures(features);
    
    // Cache result
    this.setCache(cacheKey, normalized);
    
    return normalized;
  }

  /**
   * Extract demographic features
   * @param {Object} userData - User data
   * @returns {Object} Features
   */
  extractDemographicFeatures(userData) {
    return {
      age_normalized: userData.age ? userData.age / 100 : 0,
      is_premium: userData.subscriptionTier ? 1 : 0,
      subscription_level: this.encodeSubscriptionTier(userData.subscriptionTier),
      account_age_days: userData.accountCreatedAt ? 
        (Date.now() - new Date(userData.accountCreatedAt).getTime()) / 86400000 : 0,
      region_encoded: this.hashFeature(userData.region || 'unknown', 10)
    };
  }

  /**
   * Extract behavioral features
   * @param {Object} userData - User data
   * @returns {Object} Features
   */
  extractBehavioralFeatures(userData) {
    const playHistory = userData.playHistory || [];
    const sessions = userData.sessions || [];
    
    return {
      total_playtime_hours: (userData.totalPlaytime || 0) / 60,
      total_sessions: sessions.length,
      avg_session_duration: sessions.length > 0 ? 
        sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length : 0,
      games_played: new Set(playHistory.map(h => h.gameId)).size,
      completion_rate: playHistory.length > 0 ?
        playHistory.filter(h => h.completed).length / playHistory.length : 0,
      avg_rating: playHistory.length > 0 ?
        playHistory.reduce((sum, h) => sum + (h.rating || 0), 0) / playHistory.length : 0,
      returns_last_7d: sessions.filter(s => 
        Date.now() - s.timestamp < 7 * 86400000
      ).length,
      churn_risk: this.calculateChurnRisk(userData)
    };
  }

  /**
   * Extract preference features
   * @param {Object} userData - User data
   * @returns {Object} Features
   */
  extractPreferenceFeatures(userData) {
    const preferences = userData.preferences || {};
    const playHistory = userData.playHistory || [];
    
    // Calculate genre preferences from history
    const genreCounts = {};
    playHistory.forEach(h => {
      if (h.genres) {
        h.genres.forEach(g => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      }
    });
    
    const topGenre = Object.keys(genreCounts).sort((a, b) => 
      genreCounts[b] - genreCounts[a]
    )[0] || '';
    
    return {
      preferred_genre_encoded: this.hashFeature(topGenre, 20),
      preferred_difficulty: preferences.difficulty || 5,
      preferred_session_length: preferences.sessionLength || 30,
      variety_score: Object.keys(genreCounts).length / 10,
      wishlist_size: userData.wishlist?.length || 0,
      collection_size: userData.collection?.length || 0
    };
  }

  /**
   * Extract temporal features
   * @param {Object} userData - User data
   * @returns {Object} Features
   */
  extractTemporalFeatures(userData) {
    const lastSession = userData.sessions?.[0]?.timestamp || 0;
    const daysSinceLastSession = lastSession ? 
      (Date.now() - lastSession) / 86400000 : 999;
    
    return {
      days_since_last_session: Math.min(daysSinceLastSession, 90),
      is_returning_user: lastSession > 0 ? 1 : 0,
      login_streak: userData.loginStreak || 0,
      typical_play_hour: userData.typicalPlayHour || 12,
      weekend_player: userData.weekendPlayer ? 1 : 0
    };
  }

  /**
   * Extract social features
   * @param {Object} userData - User data
   * @returns {Object} Features
   */
  extractSocialFeatures(userData) {
    return {
      num_friends: userData.friends?.length || 0,
      guild_member: userData.guildId ? 1 : 0,
      social_interactions_7d: userData.socialInteractions?.last7Days || 0,
      achievements_shared: userData.achievementsShared || 0,
      referral_count: userData.referrals || 0
    };
  }

  /**
   * Extract item features
   * @param {Object} itemData - Item data
   * @returns {Object} Features
   */
  async extractItemFeatures(itemData) {
    const cacheKey = `item_${itemData.itemId}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;
    
    const features = {};
    
    for (const extractor of this.itemFeatureExtractors) {
      const extracted = await extractor(itemData);
      Object.assign(features, extracted);
    }
    
    const normalized = this.normalizeFeatures(features);
    this.setCache(cacheKey, normalized);
    
    return normalized;
  }

  /**
   * Extract item metadata features
   * @param {Object} itemData - Item data
   * @returns {Object} Features
   */
  extractItemMetadata(itemData) {
    return {
      genre_encoded: this.hashFeature(itemData.genre || '', 20),
      difficulty_normalized: (itemData.difficulty || 5) / 10,
      duration_normalized: (itemData.duration || 30) / 60,
      is_new: itemData.releaseDate ? 
        (Date.now() - new Date(itemData.releaseDate).getTime()) < 30 * 86400000 ? 1 : 0 : 0,
      is_limited: itemData.isLimitedEdition ? 1 : 0,
      price_tier: this.encodePriceTier(itemData.price)
    };
  }

  /**
   * Extract item popularity features
   * @param {Object} itemData - Item data
   * @returns {Object} Features
   */
  extractItemPopularity(itemData) {
    return {
      play_count_normalized: Math.log1p(itemData.playCount || 0) / 10,
      avg_rating_normalized: (itemData.rating || 3) / 5,
      rating_count_normalized: Math.log1p(itemData.ratingCount || 0) / 10,
      trending_score: itemData.trendingScore || 0,
      retention_rate: itemData.retentionRate || 0
    };
  }

  /**
   * Extract item temporal features
   * @param {Object} itemData - Item data
   * @returns {Object} Features
   */
  extractItemTemporal(itemData) {
    return {
      recent_play_growth: itemData.recentPlayGrowth || 0,
      peak_hour: itemData.peakPlayHour || 12,
      is_seasonal: itemData.isSeasonal ? 1 : 0
    };
  }

  /**
   * Extract context features
   * @param {Object} contextData - Context data
   * @returns {Object} Features
   */
  async extractContextFeatures(contextData) {
    const features = {};
    
    for (const extractor of this.contextFeatureExtractors) {
      const extracted = await extractor(contextData);
      Object.assign(features, extracted);
    }
    
    return this.normalizeFeatures(features);
  }

  /**
   * Extract time context
   * @param {Object} context - Context data
   * @returns {Object} Features
   */
  extractTimeContext(context) {
    const now = context.timestamp ? new Date(context.timestamp) : new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    return {
      hour_sin: Math.sin(2 * Math.PI * hour / 24),
      hour_cos: Math.cos(2 * Math.PI * hour / 24),
      day_of_week_sin: Math.sin(2 * Math.PI * dayOfWeek / 7),
      day_of_week_cos: Math.cos(2 * Math.PI * dayOfWeek / 7),
      is_weekend: dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0,
      is_peak_hour: (hour >= 18 || hour <= 2) ? 1 : 0
    };
  }

  /**
   * Extract device context
   * @param {Object} context - Context data
   * @returns {Object} Features
   */
  extractDeviceContext(context) {
    return {
      is_mobile: context.isMobile ? 1 : 0,
      is_tablet: context.isTablet ? 1 : 0,
      screen_size_normalized: (context.screenSize || 0) / 100,
      connection_speed: context.connectionSpeed || 5,
      battery_level: context.batteryLevel || 1
    };
  }

  /**
   * Extract session context
   * @param {Object} context - Context data
   * @returns {Object} Features
   */
  extractSessionContext(context) {
    return {
      session_length_so_far: (context.sessionDuration || 0) / 60,
      items_viewed_this_session: context.itemsViewed || 0,
      session_depth: context.sessionDepth || 1,
      bounce_risk: context.itemsViewed <= 1 ? 1 : 0
    };
  }

  /**
   * Normalize features to 0-1 range
   * @param {Object} features - Features
   * @returns {Object} Normalized features
   */
  normalizeFeatures(features) {
    const normalized = {};
    
    for (const [key, value] of Object.entries(features)) {
      if (typeof value === 'number') {
        // Apply appropriate normalization
        if (key.includes('_normalized') || key.includes('_encoded')) {
          normalized[key] = value;
        } else if (key.includes('count') || key.includes('size')) {
          normalized[key] = Math.log1p(value) / 10;
        } else if (key.includes('rate') || key.includes('score')) {
          normalized[key] = Math.max(0, Math.min(1, value));
        } else if (key.includes('hours') || key.includes('days')) {
          normalized[key] = Math.min(value / 100, 1);
        } else {
          normalized[key] = value;
        }
      } else {
        normalized[key] = 0;
      }
    }
    
    return normalized;
  }

  /**
   * Calculate churn risk score
   * @param {Object} userData - User data
   * @returns {number} Churn risk (0-1)
   */
  calculateChurnRisk(userData) {
    const daysSinceLastSession = userData.sessions?.[0]?.timestamp ? 
      (Date.now() - userData.sessions[0].timestamp) / 86400000 : 999;
    
    let risk = 0;
    
    // Recency factor
    if (daysSinceLastSession > 30) risk += 0.4;
    else if (daysSinceLastSession > 14) risk += 0.2;
    else if (daysSinceLastSession > 7) risk += 0.1;
    
    // Frequency factor
    const sessionsLast30Days = (userData.sessions || []).filter(s => 
      Date.now() - s.timestamp < 30 * 86400000
    ).length;
    
    if (sessionsLast30Days === 0) risk += 0.3;
    else if (sessionsLast30Days < 3) risk += 0.15;
    
    // Engagement factor
    if ((userData.totalPlaytime || 0) < 60) risk += 0.2;
    if ((userData.collection?.length || 0) === 0) risk += 0.1;
    
    return Math.min(risk, 1);
  }

  /**
   * Encode subscription tier
   * @param {string} tier - Tier name
   * @returns {number} Encoded value
   */
  encodeSubscriptionTier(tier) {
    const tiers = { free: 0, premium: 0.33, elite: 0.67, god: 1 };
    return tiers[tier?.toLowerCase()] || 0;
  }

  /**
   * Encode price tier
   * @param {number} price - Price
   * @returns {number} Encoded value
   */
  encodePriceTier(price) {
    if (!price) return 0;
    if (price === 0) return 0;
    if (price < 5) return 0.25;
    if (price < 10) return 0.5;
    if (price < 20) return 0.75;
    return 1;
  }

  /**
   * Hash feature to numeric value
   * @param {string} value - Value to hash
   * @param {number} maxBins - Number of bins
   * @returns {number} Hashed value
   */
  hashFeature(value, maxBins) {
    const hash = crypto.createHash('md5').update(value).digest('hex');
    return parseInt(hash.substring(0, 8), 16) % maxBins / maxBins;
  }

  /**
   * Get from cache
   * @param {string} key - Cache key
   * @returns {Object|null} Cached value
   */
  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value;
  }

  /**
   * Set cache
   * @param {string} key - Cache key
   * @param {Object} value - Value
   */
  setCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get pipeline statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      featureStoreSize: this.featureStore.size,
      cacheExpiry: this.cacheExpiry
    };
  }
}

module.exports = FeatureEngineeringPipeline;
