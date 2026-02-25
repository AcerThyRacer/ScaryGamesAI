/**
 * PHASE 25: SUBSCRIPTION EVOLUTION
 * 
 * Best-in-class subscription tiers with maximum value and retention.
 * 
 * Features:
 * - Free Tier (Forever free, ad-supported)
 * - Premium+ ($9.99/mo or $99.99/yr - 17% discount)
 * - Elite+ ($19.99/mo or $199.99/yr - all games + DLC, VIP support)
 * - Founder's Pack ($299.99 one-time - lifetime Elite+, exclusive cosmetics)
 * - Family Plan (5 accounts, 20% discount)
 * - Student Discount (50% off with .edu verification)
 * - Regional Pricing (PPP adjustment for developing countries)
 * - Gift Subscriptions (1/3/6/12 month options)
 * - Subscriber-only events, loyalty rewards, win-back offers
 * 
 * Target: 5% conversion to paid, 70% retention
 */

export class SubscriptionSystem {
  constructor(config = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || '/api/subscriptions',
      environment: config.environment || 'production'
    };

    // Subscription Tiers Definition
    this.tiers = {
      FREE: {
        id: 'free',
        name: 'Free Tier',
        price: { monthly: 0, yearly: 0 },
        benefits: [
          'Access to 10+ free games',
          'Basic matchmaking',
          'Standard support (48h response)',
          'Ad-supported experience (optional removal)',
          'Cloud saves (5 slots)',
          'Community forum access'
        ],
        limitations: [
          'Limited game library',
          'Ads between games',
          'No priority features',
          'No exclusive cosmetics'
        ],
        maxConcurrentSessions: 1,
        cloudSaveSlots: 5,
        supportLevel: 'standard'
      },

      PREMIUM_PLUS: {
        id: 'premium_plus',
        name: 'Premium+',
        price: { monthly: 9.99, yearly: 99.99 }, // Save $20/year (17% discount)
        benefits: [
          'Access to 25+ premium games',
          'Ad-free experience',
          'Monthly gem stipend (1,000 gems)',
          'Exclusive cosmetics (2 per month)',
          'Early access to new games (7 days)',
          'Priority matchmaking',
          'Cloud saves (20 slots)',
          'Discord Premium role',
          'Priority support (12h response)',
          'Subscriber-only events',
          'Loyalty rewards (every 3 months)'
        ],
        limitations: [
          'Some DLC not included',
          'No physical merchandise discounts'
        ],
        maxConcurrentSessions: 2,
        cloudSaveSlots: 20,
        supportLevel: 'priority',
        monthlyGems: 1000,
        earlyAccessDays: 7,
        exclusiveCosmeticsPerMonth: 2
      },

      ELITE_PLUS: {
        id: 'elite_plus',
        name: 'Elite+',
        price: { monthly: 19.99, yearly: 199.99 }, // Save $40/year (17% discount)
        benefits: [
          'Everything in Premium+',
          'Access to ALL games (including DLC)',
          'Double gem stipend (2,000 gems/month)',
          'Exclusive Elite cosmetics (4 per month)',
          'Beta access to upcoming features',
          'VIP support (1h response)',
          'Physical merchandise discounts (20%)',
          'Event invitations (online tournaments)',
          'Creator tools access',
          'Revenue share for UGC (if applicable)',
          'Elite badge on profile',
          'Advanced analytics dashboard',
          'Custom profile themes'
        ],
        limitations: [],
        maxConcurrentSessions: 5,
        cloudSaveSlots: -1, // Unlimited
        supportLevel: 'vip',
        monthlyGems: 2000,
        earlyAccessDays: 14,
        exclusiveCosmeticsPerMonth: 4,
        merchDiscount: 0.20,
        revenueShare: true
      },

      FOUNDERS_PACK: {
        id: 'founders',
        name: "Founder's Pack",
        price: { oneTime: 299.99 },
        benefits: [
          'Lifetime Elite+ access (never expires)',
          'Exclusive Founder cosmetics (never available again)',
          'Name in game credits',
          'Input on future development (quarterly surveys)',
          'Limited to first 1,000 buyers only',
          'Founder badge (gold)',
          'All future DLC included forever',
          'Priority feature requests',
          'Annual physical merchandise box',
          'Invitation to annual developer summit'
        ],
        limitations: [
          'Limited quantity (1,000 max)',
          'One-time purchase only'
        ],
        maxConcurrentSessions: -1, // Unlimited
        cloudSaveSlots: -1, // Unlimited
        supportLevel: 'founder',
        limitedQuantity: 1000,
        soldCount: 0, // Track availability
        lifetimeAccess: true
      }
    };

    // User subscription state
    this.userSubscription = {
      tier: 'FREE',
      status: 'active', // active, cancelled, expired, past_due
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      paymentMethod: null,
      discountApplied: null,
      loyaltyRewardsClaimed: [],
      referralCode: null
    };

    console.log('[Phase 25] SUBSCRIPTION EVOLUTION initialized');
  }

  async initialize() {
    console.log('[Phase 25] Initializing SUBSCRIPTION EVOLUTION...');
    
    // Load user subscription from backend
    await this.loadUserSubscription();
    
    // Generate unique referral code for user
    this.userSubscription.referralCode = this.generateReferralCode();
    
    console.log(`[Phase 25] ✅ User subscription loaded: ${this.userSubscription.tier}`);
  }

  // ==========================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================

  async loadUserSubscription() {
    console.log('[Phase 25] Loading user subscription...');
    // Simulated API call
    // In production: GET /api/subscriptions/me
    
    const mockData = {
      tier: 'FREE',
      status: 'active',
      currentPeriodStart: Date.now(),
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false
    };
    
    this.userSubscription = { ...this.userSubscription, ...mockData };
  }

  async upgradeSubscription(tierId, billingCycle = 'monthly') {
    const targetTier = Object.values(this.tiers).find(t => t.id === tierId);
    
    if (!targetTier) {
      throw new Error(`Invalid tier: ${tierId}`);
    }

    console.log(`[Phase 25] Upgrading to ${targetTier.name} (${billingCycle})...`);
    
    // Check Founder's Pack availability
    if (tierId === 'founders' && this.tiers.FOUNDERS_PACK.soldCount >= this.tiers.FOUNDERS_PACK.limitedQuantity) {
      throw new Error("Founder's Pack is sold out!");
    }

    // Calculate price with discounts
    let finalPrice = billingCycle === 'yearly' ? targetTier.price.yearly : targetTier.price.monthly;
    
    if (this.userSubscription.discountApplied) {
      finalPrice *= (1 - this.userSubscription.discountApplied.rate);
      console.log(`[Phase 25] Applied discount: ${this.userSubscription.discountApplied.name}`);
    }

    // Process payment (simulated)
    const paymentSuccess = await this.processPayment(finalPrice, billingCycle);
    
    if (paymentSuccess) {
      // Activate subscription
      this.userSubscription.tier = tierId.toUpperCase();
      this.userSubscription.status = 'active';
      this.userSubscription.currentPeriodStart = Date.now();
      this.userSubscription.currentPeriodEnd = this.calculatePeriodEnd(billingCycle);
      this.userSubscription.cancelAtPeriodEnd = false;
      
      // Grant immediate benefits
      this.grantSubscriptionBenefits(targetTier);
      
      console.log(`[Phase 25] ✅ Subscription upgraded to ${targetTier.name}`);
      
      return { success: true, tier: targetTier };
    } else {
      console.error('[Phase 25] ❌ Payment failed');
      return { success: false, error: 'Payment declined' };
    }
  }

  async cancelSubscription(cancelImmediately = false) {
    console.log('[Phase 25] Cancelling subscription...');
    
    if (cancelImmediately) {
      this.userSubscription.status = 'cancelled';
      this.userSubscription.currentPeriodEnd = Date.now();
      console.log('[Phase 25] Subscription cancelled immediately');
    } else {
      this.userSubscription.cancelAtPeriodEnd = true;
      console.log(`[Phase 25] Subscription will end on ${new Date(this.userSubscription.currentPeriodEnd).toLocaleDateString()}`);
    }
    
    // Offer win-back incentive
    const winBackOffer = this.generateWinBackOffer();
    
    return { 
      cancelled: true, 
      endDate: this.userSubscription.currentPeriodEnd,
      winBackOffer 
    };
  }

  calculatePeriodEnd(billingCycle) {
    const now = Date.now();
    if (billingCycle === 'yearly') {
      return now + (365 * 24 * 60 * 60 * 1000); // 1 year
    } else {
      return now + (30 * 24 * 60 * 60 * 1000); // 1 month
    }
  }

  grantSubscriptionBenefits(tier) {
    console.log(`[Phase 25] Granting benefits for ${tier.name}...`);
    
    // Unlock games based on tier
    const gameAccess = {
      FREE: 10,
      PREMIUM_PLUS: 25,
      ELITE_PLUS: -1, // All games
      FOUNDERS: -1
    };
    
    // Add monthly gems
    if (tier.monthlyGems) {
      console.log(`[Phase 25] +${tier.monthlyGems} gems added to wallet`);
    }
    
    // Unlock exclusive cosmetics
    if (tier.exclusiveCosmeticsPerMonth) {
      console.log(`[Phase 25] Unlocked ${tier.exclusiveCosmeticsPerMonth} exclusive cosmetics`);
    }
  }

  // ==========================================
  // DISCOUNT SYSTEMS
  // ==========================================

  applyStudentDiscount() {
    console.log('[Phase 25] Applying student discount (50% off)...');
    // Requires .edu email verification
    this.userSubscription.discountApplied = {
      name: 'Student Discount',
      rate: 0.50,
      requiresVerification: true,
      verified: false
    };
    
    return { requiresVerification: true, message: 'Please verify your .edu email address' };
  }

  verifyStudentEmail(email) {
    if (email.endsWith('.edu')) {
      this.userSubscription.discountApplied.verified = true;
      console.log('[Phase 25] ✅ Student discount verified');
      return { verified: true };
    } else {
      console.error('[Phase 25] Invalid .edu email');
      return { verified: false, error: 'Email must be a valid .edu address' };
    }
  }

  applyRegionalPricing(countryCode) {
    // Purchasing Power Parity adjustment
    const pppRates = {
      'US': 1.0,
      'GB': 0.85,
      'EU': 0.90,
      'IN': 0.40,
      'BR': 0.35,
      'TR': 0.30,
      'ID': 0.35,
      'PH': 0.40
    };
    
    const rate = pppRates[countryCode] || 1.0;
    
    if (rate < 1.0) {
      console.log(`[Phase 25] Applied regional pricing for ${countryCode}: ${(rate * 100).toFixed(0)}% of US price`);
      this.userSubscription.discountApplied = {
        name: 'Regional Pricing',
        rate: 1 - rate,
        countryCode
      };
    }
    
    return rate;
  }

  generateWinBackOffer() {
    // Generate personalized win-back offer when user cancels
    const offers = [
      { type: 'discount', rate: 0.30, duration: '3 months', message: 'Get 30% off for 3 months if you stay!' },
      { type: 'bonus_gems', amount: 2000, message: 'Receive 2,000 bonus gems if you continue your subscription!' },
      { type: 'extended_trial', days: 14, message: 'Try Elite+ free for 14 more days!' }
    ];
    
    const selected = offers[Math.floor(Math.random() * offers.length)];
    console.log(`[Phase 25] Win-back offer generated: ${selected.message}`);
    
    return selected;
  }

  // ==========================================
  // FAMILY PLAN & GIFTING
  // ==========================================

  createFamilyPlan(ownerUserId, memberUserIds) {
    if (memberUserIds.length > 4) {
      throw new Error('Family plan limited to 5 accounts (1 owner + 4 members)');
    }
    
    console.log(`[Phase 25] Creating family plan with ${memberUserIds.length + 1} members...`);
    
    // Calculate price with 20% family discount
    const basePrice = this.tiers.PREMIUM_PLUS.price.monthly;
    const familyPrice = basePrice * 0.80; // 20% discount
    
    const familyPlan = {
      ownerId: ownerUserId,
      members: memberUserIds,
      totalPrice: familyPrice,
      savings: basePrice - familyPrice,
      renewalDate: this.calculatePeriodEnd('monthly')
    };
    
    console.log(`[Phase 25] Family plan created: $${familyPrice.toFixed(2)}/month (save $${(basePrice - familyPrice).toFixed(2)})`);
    
    return familyPlan;
  }

  async giftSubscription(recipientEmail, tierId, durationMonths) {
    const tier = Object.values(this.tiers).find(t => t.id === tierId);
    
    if (!tier) {
      throw new Error(`Invalid tier: ${tierId}`);
    }
    
    const durationOptions = [1, 3, 6, 12];
    if (!durationOptions.includes(durationMonths)) {
      throw new Error('Duration must be 1, 3, 6, or 12 months');
    }
    
    const price = tier.price.monthly * durationMonths;
    
    console.log(`[Phase 25] Gifting ${durationMonths} months of ${tier.name} to ${recipientEmail}...`);
    
    // Process payment
    const paymentSuccess = await this.processPayment(price, 'gift');
    
    if (paymentSuccess) {
      // Send gift code via email
      const giftCode = this.generateGiftCode(tierId, durationMonths);
      
      console.log(`[Phase 25] ✅ Gift code sent: ${giftCode}`);
      
      return { 
        success: true, 
        giftCode, 
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year to redeem
      };
    }
    
    return { success: false, error: 'Payment failed' };
  }

  async redeemGiftCode(code) {
    console.log(`[Phase 25] Redeeming gift code: ${code}...`);
    
    // Validate code (simulated)
    const isValid = code.startsWith('GIFT_');
    
    if (isValid) {
      // Apply subscription
      this.userSubscription.status = 'active';
      this.userSubscription.currentPeriodEnd = this.calculatePeriodEnd('monthly');
      
      console.log('[Phase 25] ✅ Gift code redeemed successfully');
      return { success: true };
    } else {
      console.error('[Phase 25] Invalid gift code');
      return { success: false, error: 'Invalid or expired code' };
    }
  }

  // ==========================================
  // LOYALTY REWARDS
  // ==========================================

  checkLoyaltyRewards() {
    const now = Date.now();
    const startDate = this.userSubscription.currentPeriodStart;
    
    if (!startDate) return [];
    
    const monthsActive = Math.floor((now - startDate) / (30 * 24 * 60 * 60 * 1000));
    
    // Loyalty rewards every 3 months
    const rewardIntervals = [3, 6, 9, 12, 18, 24];
    const availableRewards = [];
    
    for (const interval of rewardIntervals) {
      if (monthsActive >= interval && !this.userSubscription.loyaltyRewardsClaimed.includes(interval)) {
        availableRewards.push(this.getLoyaltyReward(interval));
      }
    }
    
    return availableRewards;
  }

  getLoyaltyReward(months) {
    const rewards = {
      3: { type: 'gems', amount: 500, name: '3-Month Loyalty: 500 Gems' },
      6: { type: 'cosmetic', id: 'exclusive_skin_6mo', name: '6-Month Exclusive Skin' },
      9: { type: 'gems', amount: 1000, name: '9-Month Loyalty: 1,000 Gems' },
      12: { type: 'title', id: 'veteran_player', name: '1-Year Veteran Title' },
      18: { type: 'cosmetic', id: 'exclusive_pet_18mo', name: '18-Month Exclusive Pet' },
      24: { type: 'cosmetic', id: 'legendary_mount_2yr', name: '2-Year Legendary Mount' }
    };
    
    return rewards[months] || { type: 'gems', amount: 100 };
  }

  claimLoyaltyReward(interval) {
    const reward = this.getLoyaltyReward(interval);
    
    if (!this.userSubscription.loyaltyRewardsClaimed.includes(interval)) {
      this.userSubscription.loyaltyRewardsClaimed.push(interval);
      console.log(`[Phase 25] ✅ Claimed loyalty reward: ${reward.name}`);
      return { success: true, reward };
    }
    
    return { success: false, error: 'Reward already claimed' };
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  processPayment(amount, billingCycle) {
    // Simulated payment processing
    console.log(`[Phase 25] Processing payment: $${amount.toFixed(2)} (${billingCycle})`);
    
    return new Promise(resolve => {
      setTimeout(() => {
        // 95% success rate simulation
        resolve(Math.random() < 0.95);
      }, 500);
    });
  }

  generateReferralCode() {
    return 'REF_' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  generateGiftCode(tierId, duration) {
    return `GIFT_${tierId}_${duration}M_` + Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  getSubscriptionStatus() {
    const tier = this.tiers[this.userSubscription.tier];
    
    return {
      tier: this.userSubscription.tier,
      tierName: tier?.name || 'Unknown',
      status: this.userSubscription.status,
      currentPeriodEnd: this.userSubscription.currentPeriodEnd,
      willRenew: !this.userSubscription.cancelAtPeriodEnd,
      benefits: tier?.benefits || [],
      referralCode: this.userSubscription.referralCode
    };
  }

  dispose() {
    console.log('[Phase 25] SUBSCRIPTION EVOLUTION disposed');
  }
}

// Export singleton helper
let subscriptionInstance = null;

export function getSubscriptionSystem(config) {
  if (!subscriptionInstance) {
    subscriptionInstance = new SubscriptionSystem(config);
  }
  return subscriptionInstance;
}

console.log('[Phase 25] SUBSCRIPTION EVOLUTION module loaded');
