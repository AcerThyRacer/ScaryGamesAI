/**
 * Content Creator Program
 * Phase 7: Monetization Innovation
 * 
 * Affiliate codes, custom cosmetics, revenue share
 */

class CreatorProgram {
  constructor() {
    this.creators = new Map();
    this.affiliateCodes = new Map();
    this.customCosmetics = new Map();
    this.revenueShares = new Map();
    this.analytics = new Map();
  }
  
  /**
   * Register creator
   */
  registerCreator(config) {
    const creator = {
      id: config.id || `creator_${Date.now()}`,
      name: config.name,
      platform: config.platform, // twitch, youtube, tiktok
      handle: config.handle,
      followerCount: config.followerCount || 0,
      tier: this.calculateTier(config.followerCount),
      affiliateRate: this.getAffiliateRate(config.followerCount),
      customCosmeticsEnabled: config.followerCount >= 10000,
      revenueShareRate: this.getRevenueShareRate(config.followerCount),
      isActive: true,
      joinedAt: Date.now()
    };
    
    this.creators.set(creator.id, creator);
    
    // Generate affiliate code
    const code = this.generateAffiliateCode(creator);
    this.affiliateCodes.set(code, creator.id);
    creator.affiliateCode = code;
    
    return creator;
  }
  
  /**
   * Calculate creator tier
   */
  calculateTier(followerCount) {
    if (followerCount >= 100000) return 'legendary';
    if (followerCount >= 50000) return 'epic';
    if (followerCount >= 10000) return 'rare';
    return 'common';
  }
  
  /**
   * Get affiliate rate
   */
  getAffiliateRate(followerCount) {
    if (followerCount >= 100000) return 0.15; // 15%
    if (followerCount >= 50000) return 0.12;
    if (followerCount >= 10000) return 0.10;
    return 0.05; // 5%
  }
  
  /**
   * Get revenue share rate
   */
  getRevenueShareRate(followerCount) {
    if (followerCount >= 100000) return 0.30; // 30%
    if (followerCount >= 50000) return 0.25;
    if (followerCount >= 10000) return 0.20;
    return 0.10; // 10%
  }
  
  /**
   * Generate affiliate code
   */
  generateAffiliateCode(creator) {
    const base = creator.handle.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `${base}_${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }
  
  /**
   * Track affiliate use
   */
  trackAffiliateUse(code, userId, purchaseAmount) {
    const creatorId = this.affiliateCodes.get(code);
    if (!creatorId) {
      return { success: false, error: 'Invalid code' };
    }
    
    const creator = this.creators.get(creatorId);
    const commission = purchaseAmount * creator.affiliateRate;
    
    // Track analytics
    this.trackAnalytics(creatorId, 'affiliate_use', {
      purchaseAmount,
      commission,
      userId,
      timestamp: Date.now()
    });
    
    return {
      success: true,
      creator: creator.name,
      commission,
      code
    };
  }
  
  /**
   * Create custom cosmetic for creator
   */
  createCustomCosmetic(config) {
    if (!config.creatorId) {
      return { success: false, error: 'Creator ID required' };
    }
    
    const creator = this.creators.get(config.creatorId);
    if (!creator || !creator.customCosmeticsEnabled) {
      return { success: false, error: 'Creator not eligible' };
    }
    
    const cosmetic = {
      id: config.id || `cosmetic_${Date.now()}`,
      creatorId: config.creatorId,
      name: config.name,
      type: config.type, // skin, effect, emote
      design: config.design,
      price: config.price || 9.99,
      revenueShare: creator.revenueShareRate,
      isExclusive: config.isExclusive || false,
      sales: 0,
      revenue: 0,
      createdAt: Date.now()
    };
    
    this.customCosmetics.set(cosmetic.id, cosmetic);
    return cosmetic;
  }
  
  /**
   * Track cosmetic sale
   */
  trackCosmeticSale(cosmeticId, userId) {
    const cosmetic = this.customCosmetics.get(cosmeticId);
    if (!cosmetic) return;
    
    const creator = this.creators.get(cosmetic.creatorId);
    
    cosmetic.sales++;
    cosmetic.revenue += cosmetic.price;
    
    const creatorShare = cosmetic.price * creator.revenueShareRate;
    const platformShare = cosmetic.price - creatorShare;
    
    this.trackAnalytics(cosmetic.creatorId, 'cosmetic_sale', {
      cosmeticId,
      revenue: cosmetic.price,
      creatorShare,
      platformShare,
      userId,
      timestamp: Date.now()
    });
  }
  
  /**
   * Track creator analytics
   */
  trackAnalytics(creatorId, eventType, data) {
    if (!this.analytics.has(creatorId)) {
      this.analytics.set(creatorId, {
        affiliateUses: [],
        cosmeticSales: [],
        totalRevenue: 0,
        totalCommission: 0
      });
    }
    
    const analytics = this.analytics.get(creatorId);
    
    if (eventType === 'affiliate_use') {
      analytics.affiliateUses.push(data);
      analytics.totalCommission += data.commission;
    } else if (eventType === 'cosmetic_sale') {
      analytics.cosmeticSales.push(data);
      analytics.totalRevenue += data.revenue;
    }
  }
  
  /**
   * Get creator dashboard data
   */
  getCreatorDashboard(creatorId) {
    const creator = this.creators.get(creatorId);
    const analytics = this.analytics.get(creatorId);
    
    if (!creator) return null;
    
    return {
      creator,
      analytics: analytics || {
        affiliateUses: [],
        cosmeticSales: [],
        totalRevenue: 0,
        totalCommission: 0
      },
      payouts: this.calculatePayouts(creatorId)
    };
  }
  
  /**
   * Calculate creator payouts
   */
  calculatePayouts(creatorId) {
    const analytics = this.analytics.get(creatorId);
    if (!analytics) return 0;
    
    return analytics.totalCommission + 
           (analytics.cosmeticSales.reduce((sum, s) => sum + s.creatorShare, 0));
  }
  
  /**
   * Get program statistics
   */
  getStats() {
    const creators = Array.from(this.creators.values());
    const cosmetics = Array.from(this.customCosmetics.values());
    
    const tierDistribution = {
      legendary: creators.filter(c => c.tier === 'legendary').length,
      epic: creators.filter(c => c.tier === 'epic').length,
      rare: creators.filter(c => c.tier === 'rare').length,
      common: creators.filter(c => c.tier === 'common').length
    };
    
    const totalRevenue = cosmetics.reduce((sum, c) => sum + c.revenue, 0);
    const totalPayouts = creators.reduce((sum, c) => sum + this.calculatePayouts(c.id), 0);
    
    return {
      totalCreators: creators.length,
      tierDistribution,
      totalCosmetics: cosmetics.length,
      totalRevenue,
      totalPayouts,
      platformProfit: totalRevenue - totalPayouts
    };
  }
}

module.exports = CreatorProgram;
