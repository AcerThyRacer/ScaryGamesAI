/**
 * Alternative Revenue Streams
 * Phase 7: Monetization Innovation
 * 
 * Non-intrusive ads, sponsored challenges, brand collabs
 */

class AlternativeRevenueSystem {
  constructor(config = {}) {
    this.adPlacements = new Map();
    this.sponsoredChallenges = new Map();
    this.brandCollaborations = new Map();
    this.adViews = new Map();
    this.revenueShare = new Map();
  }
  
  /**
   * Create ad placement
   */
  createAdPlacement(config) {
    const placement = {
      id: config.id || `ad_${Date.now()}`,
      type: config.type, // rewarded_video, banner, interstitial, native
      location: config.location, // store, menu, post_game
      frequency: config.frequency || 1, // Max per session
      reward: config.reward || { type: 'currency', amount: 10 },
      isActive: config.isActive !== undefined ? config.isActive : true,
      targeting: config.targeting || {},
      revenuePerView: config.revenuePerView || 0.01,
      createdAt: Date.now()
    };
    
    this.adPlacements.set(placement.id, placement);
    return placement;
  }
  
  /**
   * Show rewarded ad
   */
  showRewardedAd(userId, placementId) {
    const placement = this.adPlacements.get(placementId);
    if (!placement || !placement.isActive) {
      return { success: false, error: 'Ad not available' };
    }
    
    // Check frequency cap
    const userViews = this.adViews.get(userId) || [];
    const sessionViews = userViews.filter(v => Date.now() - v.timestamp < 3600000); // 1 hour
    
    if (sessionViews.length >= placement.frequency) {
      return { success: false, error: 'Ad limit reached' };
    }
    
    // Record view
    const view = {
      placementId,
      timestamp: Date.now(),
      completed: false
    };
    
    userViews.push(view);
    this.adViews.set(userId, userViews);
    
    return {
      success: true,
      adUnit: 'rewarded_video',
      duration: 30,
      reward: placement.reward,
      viewId: view.id
    };
  }
  
  /**
   * Complete ad view
   */
  completeAdView(userId, viewId) {
    const userViews = this.adViews.get(userId) || [];
    const view = userViews.find(v => v.id === viewId);
    
    if (!view) {
      return { success: false, error: 'View not found' };
    }
    
    view.completed = true;
    view.completedAt = Date.now();
    
    // Grant reward
    return {
      success: true,
      reward: view.reward,
      granted: true
    };
  }
  
  /**
   * Create sponsored challenge
   */
  createSponsoredChallenge(config) {
    const challenge = {
      id: config.id || `sponsor_${Date.now()}`,
      brandName: config.brandName,
      name: config.name,
      description: config.description,
      objectives: config.objectives || [],
      reward: config.reward || { amount: 100, currency: 'gems' },
      brandReward: config.brandReward, // What brand gets (data, exposure)
      startDate: config.startDate || Date.now(),
      endDate: config.endDate,
      budget: config.budget,
      maxParticipants: config.maxParticipants,
      currentParticipants: 0,
      revenueShare: config.revenueShare || 0.7, // 70% to platform
      isActive: true,
      createdAt: Date.now()
    };
    
    this.sponsoredChallenges.set(challenge.id, challenge);
    return challenge;
  }
  
  /**
   * Join sponsored challenge
   */
  joinSponsoredChallenge(userId, challengeId) {
    const challenge = this.sponsoredChallenges.get(challengeId);
    if (!challenge || !challenge.isActive) {
      return { success: false, error: 'Challenge not available' };
    }
    
    if (challenge.currentParticipants >= challenge.maxParticipants) {
      return { success: false, error: 'Challenge full' };
    }
    
    challenge.currentParticipants++;
    
    return { success: true, challenge };
  }
  
  /**
   * Complete sponsored challenge
   */
  completeSponsoredChallenge(userId, challengeId) {
    const challenge = this.sponsoredChallenges.get(challengeId);
    if (!challenge) return { success: false, error: 'Challenge not found' };
    
    // Grant reward to user
    this.grantReward(userId, challenge.reward);
    
    // Track brand metrics
    this.trackBrandMetrics(challenge, 'completion');
    
    return { success: true, reward: challenge.reward };
  }
  
  /**
   * Create brand collaboration
   */
  createBrandCollaboration(config) {
    const collab = {
      id: config.id || `collab_${Date.now()}`,
      brandName: config.brandName,
      type: config.type, // cosmetic, event, bundle, exclusive
      items: config.items || [],
      revenueModel: config.revenueModel, // revenue_share, flat_fee, hybrid
      flatFee: config.flatFee || 0,
      revenueShare: config.revenueShare || 0.3,
      duration: config.duration,
      exclusivity: config.exclusivity || false,
      metrics: {
        impressions: 0,
        clicks: 0,
        purchases: 0,
        revenue: 0
      },
      createdAt: Date.now()
    };
    
    this.brandCollaborations.set(collab.id, collab);
    return collab;
  }
  
  /**
   * Track collaboration impression
   */
  trackCollaboration(collabId, action, value = 0) {
    const collab = this.brandCollaborations.get(collabId);
    if (!collab) return;
    
    switch (action) {
      case 'impression':
        collab.metrics.impressions++;
        break;
      case 'click':
        collab.metrics.clicks++;
        break;
      case 'purchase':
        collab.metrics.purchases++;
        collab.metrics.revenue += value;
        break;
    }
  }
  
  /**
   * Calculate brand payout
   */
  calculateBrandPayout(collabId) {
    const collab = this.brandCollaborations.get(collabId);
    if (!collab) return 0;
    
    let payout = collab.flatFee;
    
    if (collab.revenueModel === 'revenue_share' || collab.revenueModel === 'hybrid') {
      payout += collab.metrics.revenue * collab.revenueShare;
    }
    
    return payout;
  }
  
  /**
   * Grant reward
   */
  grantReward(userId, reward) {
    console.log(`[Revenue] Granted reward to ${userId}:`, reward);
  }
  
  /**
   * Track brand metrics
   */
  trackBrandMetrics(challenge, eventType) {
    console.log(`[Revenue] Tracked ${eventType} for sponsored challenge ${challenge.id}`);
  }
  
  /**
   * Get revenue statistics
   */
  getStats() {
    const placements = Array.from(this.adPlacements.values());
    const challenges = Array.from(this.sponsoredChallenges.values());
    const collabs = Array.from(this.brandCollaborations.values());
    
    const adRevenue = placements.reduce((sum, p) => {
      const views = Array.from(this.adViews.values())
        .flat()
        .filter(v => v.placementId === p.id && v.completed)
        .length;
      return sum + (views * p.revenuePerView);
    }, 0);
    
    const sponsorRevenue = challenges.reduce((sum, c) => {
      return sum + (c.budget ? c.budget * 0.1 : 0); // 10% of budget as fee
    }, 0);
    
    const collabRevenue = collabs.reduce((sum, c) => sum + c.metrics.revenue * c.revenueShare, 0);
    
    return {
      adRevenue,
      sponsorRevenue,
      collabRevenue,
      totalAlternativeRevenue: adRevenue + sponsorRevenue + collabRevenue,
      activePlacements: placements.filter(p => p.isActive).length,
      activeChallenges: challenges.filter(c => c.isActive).length,
      activeCollaborations: collabs.length
    };
  }
}

module.exports = AlternativeRevenueSystem;
