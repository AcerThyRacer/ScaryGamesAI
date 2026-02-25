/**
 * Enhanced Subscription Tiers System
 * Phase 7: Monetization Innovation
 * 
 * Three-tier subscription model with escalating benefits
 * Survivor ($4.99), Hunter ($9.99), Elder God ($24.99)
 * 
 * @module services/subscriptionTiers
 */

class SubscriptionTierSystem {
  /**
   * Create subscription tier system
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.subscriptions = new Map();
    this.tierDefinitions = this.initializeTiers();
    this.subscriptionHistory = [];
    this.benefitUsage = new Map();
  }
  
  /**
   * Initialize subscription tier definitions
   */
  initializeTiers() {
    return {
      survivor: {
        id: 'survivor',
        name: 'Survivor',
        price: 4.99,
        currency: 'USD',
        billingCycle: 'monthly',
        benefits: {
          monthlyGems: 500,
          storeDiscount: 0.10, // 10%
          exclusiveMonthlyCosmetic: true,
          prioritySupport: true,
          adFree: false,
          battlePassXPBoost: 0,
          earlyAccessSales: false,
          personalShopper: false,
          vipSupport: false,
          freeBattlePass: false
        },
        features: [
          '500 Gems monthly',
          '10% store discount',
          'Exclusive monthly cosmetic',
          'Priority support'
        ],
        tier: 1
      },
      hunter: {
        id: 'hunter',
        name: 'Hunter',
        price: 9.99,
        currency: 'USD',
        billingCycle: 'monthly',
        benefits: {
          monthlyGems: 1200,
          storeDiscount: 0.15, // 15%
          exclusiveMonthlyCosmetic: 2, // 2 cosmetics
          prioritySupport: true,
          adFree: true,
          battlePassXPBoost: 0.25, // 25% boost
          earlyAccessSales: true,
          personalShopper: false,
          vipSupport: false,
          freeBattlePass: false
        },
        features: [
          '1,200 Gems monthly',
          '15% store discount',
          '2 exclusive cosmetics monthly',
          'Early access to sales',
          '25% Battle Pass XP boost',
          'Ad-free experience'
        ],
        tier: 2
      },
      elderGod: {
        id: 'elder_god',
        name: 'Elder God',
        price: 24.99,
        currency: 'USD',
        billingCycle: 'monthly',
        benefits: {
          monthlyGems: 3500,
          storeDiscount: 0.20, // 20%
          exclusiveMonthlyCosmetic: 'full_set',
          prioritySupport: true,
          adFree: true,
          battlePassXPBoost: 0.50, // 50% boost
          earlyAccessSales: true,
          personalShopper: true, // AI stylist
          vipSupport: true,
          freeBattlePass: true // Includes battle pass
        },
        features: [
          '3,500 Gems monthly',
          '20% store discount',
          'Full exclusive cosmetic set monthly',
          'FREE Battle Pass included',
          '50% Battle Pass XP boost',
          'Personal shopper (AI stylist)',
          'VIP support line',
          'Ad-free experience',
          'Exclusive Elder God title'
        ],
        tier: 3
      }
    };
  }
  
  /**
   * Subscribe user to tier
   * @param {string} userId - User ID
   * @param {string} tierId - Tier ID
   * @param {Object} paymentMethod - Payment method
   * @returns {Object} Subscription
   */
  subscribeUser(userId, tierId, paymentMethod) {
    const tier = this.tierDefinitions[tierId];
    if (!tier) {
      throw new Error(`Invalid tier: ${tierId}`);
    }
    
    // Check for existing subscription
    const existing = this.getSubscription(userId);
    if (existing && existing.status === 'active') {
      throw new Error('User already has active subscription');
    }
    
    const subscription = {
      id: this.generateId('sub'),
      userId,
      tierId,
      tier: tier,
      status: 'active',
      startDate: Date.now(),
      endDate: this.calculateEndDate(Date.now(), tier.billingCycle),
      paymentMethod: {
        type: paymentMethod.type,
        last4: paymentMethod.last4
      },
      autoRenew: true,
      gemsGranted: tier.benefits.monthlyGems,
      gemsClaimed: 0,
      cosmeticsClaimed: 0,
      discountUsed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.subscriptions.set(userId, subscription);
    
    // Grant initial benefits
    this.grantMonthlyBenefits(subscription);
    
    // Record history
    this.subscriptionHistory.push({
      userId,
      action: 'subscribe',
      tierId,
      timestamp: Date.now()
    });
    
    console.log(`[Subscription] User ${userId} subscribed to ${tier.name}`);
    return subscription;
  }
  
  /**
   * Get user subscription
   */
  getSubscription(userId) {
    return this.subscriptions.get(userId) || null;
  }
  
  /**
   * Cancel subscription
   */
  cancelSubscription(userId, reason = null) {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      return { success: false, error: 'No subscription found' };
    }
    
    subscription.status = 'cancelled';
    subscription.cancelledAt = Date.now();
    subscription.cancellationReason = reason;
    subscription.endDate = subscription.endDate; // Keep access until end of period
    
    this.subscriptionHistory.push({
      userId,
      action: 'cancel',
      tierId: subscription.tierId,
      reason,
      timestamp: Date.now()
    });
    
    console.log(`[Subscription] User ${userId} cancelled subscription`);
    return { success: true, subscription };
  }
  
  /**
   * Upgrade subscription tier
   */
  upgradeTier(userId, newTierId) {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      return { success: false, error: 'No subscription found' };
    }
    
    const newTier = this.tierDefinitions[newTierId];
    if (!newTier || newTier.tier <= subscription.tier.tier) {
      return { success: false, error: 'Invalid upgrade' };
    }
    
    // Calculate prorated credit
    const daysRemaining = this.getDaysRemaining(subscription);
    const oldDailyValue = subscription.tier.price / 30;
    const credit = oldDailyValue * daysRemaining;
    
    // Update subscription
    subscription.tierId = newTierId;
    subscription.tier = newTier;
    subscription.gemsGranted = newTier.benefits.monthlyGems;
    subscription.updatedAt = Date.now();
    
    this.subscriptionHistory.push({
      userId,
      action: 'upgrade',
      fromTier: subscription.tierId,
      toTier: newTierId,
      timestamp: Date.now()
    });
    
    return {
      success: true,
      subscription,
      credit,
      daysRemaining
    };
  }
  
  /**
   * Grant monthly benefits
   */
  grantMonthlyBenefits(subscription) {
    const { tier, userId } = subscription;
    
    // Grant gems
    this.grantGems(userId, tier.benefits.monthlyGems);
    
    // Grant exclusive cosmetic
    if (tier.benefits.exclusiveMonthlyCosmetic) {
      this.grantExclusiveCosmetic(userId, tier.benefits.exclusiveMonthlyCosmetic);
    }
    
    // Grant battle pass if Elder God
    if (tier.benefits.freeBattlePass) {
      this.grantBattlePass(userId);
    }
    
    subscription.gemsClaimed = 0; // Reset for new month
    subscription.benefitsLastGranted = Date.now();
  }
  
  /**
   * Claim monthly gems
   */
  claimGems(userId) {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || subscription.status !== 'active') {
      return { success: false, error: 'No active subscription' };
    }
    
    const now = Date.now();
    const lastGrant = subscription.benefitsLastGranted || 0;
    const daysSinceGrant = (now - lastGrant) / 86400000;
    
    if (daysSinceGrant < 30) {
      return { 
        success: false, 
        error: 'Gems already claimed this month',
        daysUntilNext: Math.ceil(30 - daysSinceGrant)
      };
    }
    
    // Grant new month benefits
    this.grantMonthlyBenefits(subscription);
    
    return {
      success: true,
      gemsGranted: subscription.tier.benefits.monthlyGems
    };
  }
  
  /**
   * Get subscription discount
   */
  getDiscount(userId, itemId) {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || subscription.status !== 'active') {
      return 0;
    }
    
    return subscription.tier.benefits.storeDiscount;
  }
  
  /**
   * Check if user has benefit
   */
  hasBenefit(userId, benefitName) {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || subscription.status !== 'active') {
      return false;
    }
    
    return subscription.tier.benefits[benefitName] || false;
  }
  
  /**
   * Get XP boost multiplier
   */
  getXPBoost(userId) {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || subscription.status !== 'active') {
      return 1;
    }
    
    return 1 + (subscription.tier.benefits.battlePassXPBoost || 0);
  }
  
  /**
   * Check early access
   */
  hasEarlyAccess(userId) {
    return this.hasBenefit(userId, 'earlyAccessSales');
  }
  
  /**
   * Check ad-free
   */
  isAdFree(userId) {
    return this.hasBenefit(userId, 'adFree');
  }
  
  /**
   * Get personal shopper access
   */
  hasPersonalShopper(userId) {
    return this.hasBenefit(userId, 'personalShopper');
  }
  
  /**
   * Get VIP support access
   */
  hasVIPSupport(userId) {
    return this.hasBenefit(userId, 'vipSupport');
  }
  
  /**
   * Process subscription renewal
   */
  processRenewal(subscription) {
    if (subscription.status !== 'active') return;
    
    // Process payment
    const paymentSuccess = this.processPayment(subscription);
    
    if (paymentSuccess) {
      // Extend subscription
      subscription.endDate = this.calculateEndDate(subscription.endDate, subscription.tier.billingCycle);
      subscription.updatedAt = Date.now();
      
      // Grant benefits
      this.grantMonthlyBenefits(subscription);
      
      this.subscriptionHistory.push({
        userId: subscription.userId,
        action: 'renew',
        tierId: subscription.tierId,
        timestamp: Date.now()
      });
      
      console.log(`[Subscription] Renewed subscription for ${subscription.userId}`);
    } else {
      // Payment failed
      subscription.status = 'past_due';
      this.subscriptionHistory.push({
        userId: subscription.userId,
        action: 'payment_failed',
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Process payment (placeholder)
   */
  processPayment(subscription) {
    // Integrate with Stripe/PayPal
    return true; // Simulated success
  }
  
  /**
   * Grant gems to user
   */
  grantGems(userId, amount) {
    // Database update
    console.log(`[Subscription] Granted ${amount} gems to ${userId}`);
  }
  
  /**
   * Grant exclusive cosmetic
   */
  grantExclusiveCosmetic(userId, cosmeticType) {
    // Grant cosmetic item
    console.log(`[Subscription] Granted exclusive cosmetic to ${userId}`);
  }
  
  /**
   * Grant battle pass
   */
  grantBattlePass(userId) {
    // Grant battle pass access
    console.log(`[Subscription] Granted Battle Pass to ${userId}`);
  }
  
  /**
   * Calculate end date
   */
  calculateEndDate(startDate, billingCycle) {
    const date = new Date(startDate);
    
    switch (billingCycle) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    
    return date.getTime();
  }
  
  /**
   * Get days remaining in subscription
   */
  getDaysRemaining(subscription) {
    const now = Date.now();
    const remaining = subscription.endDate - now;
    return Math.max(0, Math.ceil(remaining / 86400000));
  }
  
  /**
   * Generate unique ID
   */
  generateId(prefix = 'sub') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get subscription statistics
   */
  getStats() {
    const subscriptions = Array.from(this.subscriptions.values());
    const active = subscriptions.filter(s => s.status === 'active');
    
    const tierDistribution = {
      survivor: active.filter(s => s.tierId === 'survivor').length,
      hunter: active.filter(s => s.tierId === 'hunter').length,
      elderGod: active.filter(s => s.tierId === 'elder_god').length
    };
    
    const mrr = tierDistribution.survivor * 4.99 + 
                tierDistribution.hunter * 9.99 + 
                tierDistribution.elderGod * 24.99;
    
    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: active.length,
      cancelledSubscriptions: subscriptions.filter(s => s.status === 'cancelled').length,
      tierDistribution,
      mrr,
      arr: mrr * 12,
      avgSubscriptionLength: this.calculateAvgLength(),
      churnRate: this.calculateChurnRate()
    };
  }
  
  /**
   * Calculate average subscription length
   */
  calculateAvgLength() {
    // Implementation would query database
    return 90; // days
  }
  
  /**
   * Calculate churn rate
   */
  calculateChurnRate() {
    // Implementation would query database
    return 0.05; // 5% monthly
  }
}

module.exports = SubscriptionTierSystem;
