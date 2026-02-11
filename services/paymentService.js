/**
 * Payment Service - Stripe Integration
 * Handles all payment processing, subscriptions, and billing
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const db = require('../models/database');

const PRICE_IDS = {
    survivor: {
        monthly: 'price_survivor_monthly',
        annual: 'price_survivor_annual'
    },
    hunter: {
        monthly: 'price_hunter_monthly',
        annual: 'price_hunter_annual'
    },
    elder: {
        monthly: 'price_elder_monthly',
        annual: 'price_elder_annual'
    }
};

const TIER_PRICES = {
    survivor: { monthly: 200, annual: 2000 }, // cents
    hunter: { monthly: 500, annual: 5000 },
    elder: { monthly: 800, annual: 8000 }
};

class PaymentService {
    /**
     * Create a checkout session for subscription
     */
    async createCheckoutSession(userId, tier, billingCycle, referralCode = null) {
        const user = db.findById('users', userId);
        if (!user) throw new Error('User not found');

        const priceId = PRICE_IDS[tier]?.[billingCycle];
        if (!priceId) throw new Error('Invalid tier or billing cycle');

        // Calculate discounts
        const discounts = [];
        
        // Referral discount
        if (referralCode) {
            const referral = db.findOne('referrals', { code: referralCode, used: false });
            if (referral) {
                discounts.push({
                    coupon: 'referral_20_off'
                });
            }
        }

        // Check for personalized discount
        const personalizedDiscount = await this.getPersonalizedDiscount(userId);
        if (personalizedDiscount > 0) {
            discounts.push({
                coupon: `personalized_${personalizedDiscount}_off`
            });
        }

        const session = await stripe.checkout.sessions.create({
            customer_email: user.email,
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${this.capitalize(tier)} Tier - ${billingCycle}`,
                        description: this.getTierDescription(tier),
                        images: [`https://scarygames.ai/assets/tier-${tier}.png`]
                    },
                    unit_amount: TIER_PRICES[tier][billingCycle],
                    recurring: {
                        interval: billingCycle === 'annual' ? 'year' : 'month'
                    }
                },
                quantity: 1
            }],
            mode: 'subscription',
            success_url: `${process.env.DOMAIN}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.DOMAIN}/subscription?canceled=true`,
            metadata: {
                userId,
                tier,
                billingCycle,
                referralCode: referralCode || ''
            },
            discounts: discounts.length > 0 ? discounts : undefined,
            allow_promotion_codes: true,
            billing_address_collection: 'required',
            custom_text: {
                submit: {
                    message: 'By subscribing, you bind your soul to our service...'
                }
            }
        });

        // Record pending subscription
        db.create('subscriptions', {
            userId,
            tier,
            billingCycle,
            status: 'pending',
            stripeSessionId: session.id,
            referralCode,
            expiresAt: null,
            startedAt: null
        });

        return session;
    }

    /**
     * Handle successful checkout webhook
     */
    async handleCheckoutCompleted(session) {
        const { userId, tier, billingCycle, referralCode } = session.metadata;

        // Update subscription
        const subscription = db.findOne('subscriptions', { 
            userId, 
            status: 'pending',
            stripeSessionId: session.id 
        });

        if (subscription) {
            const now = new Date();
            const expiresAt = new Date(now);
            if (billingCycle === 'annual') {
                expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            } else {
                expiresAt.setMonth(expiresAt.getMonth() + 1);
            }

            db.update('subscriptions', subscription.id, {
                status: 'active',
                stripeSubscriptionId: session.subscription,
                stripeCustomerId: session.customer,
                startedAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
                totalDays: 0,
                streakDays: 0
            });

            // Process referral if applicable
            if (referralCode) {
                await this.processReferralConversion(referralCode, userId);
            }

            // Award XP for subscription
            await this.awardSubscriptionXP(userId, tier);

            // Unlock achievement
            await this.unlockAchievement(userId, 'first_blood');

            return subscription;
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(userId) {
        const subscription = await db.getActiveSubscription(userId);
        if (!subscription) throw new Error('No active subscription');

        // Cancel in Stripe
        if (subscription.stripeSubscriptionId) {
            await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        }

        // Update local record
        db.update('subscriptions', subscription.id, {
            status: 'canceled',
            canceledAt: new Date().toISOString()
        });

        return { success: true };
    }

    /**
     * Upgrade/Downgrade tier
     */
    async changeTier(userId, newTier) {
        const subscription = await db.getActiveSubscription(userId);
        if (!subscription) throw new Error('No active subscription');

        const oldTier = subscription.tier;
        
        // Update in Stripe
        if (subscription.stripeSubscriptionId) {
            const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
            
            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                items: [{
                    id: stripeSub.items.data[0].id,
                    price: PRICE_IDS[newTier][subscription.billingCycle]
                }],
                proration_behavior: 'always_invoice'
            });
        }

        // Update local
        db.update('subscriptions', subscription.id, {
            tier: newTier,
            upgradedFrom: oldTier,
            upgradedAt: new Date().toISOString()
        });

        // Award tier hopper achievement if applicable
        const userSubs = db.find('subscriptions', { userId });
        const uniqueTiers = [...new Set(userSubs.map(s => s.tier))];
        if (uniqueTiers.length >= 3) {
            await this.unlockAchievement(userId, 'tier_hopper');
        }

        return { success: true, newTier, oldTier };
    }

    /**
     * Get personalized discount based on engagement
     */
    async getPersonalizedDiscount(userId) {
        const user = db.findById('users', userId);
        const analytics = db.findOne('analytics', { userId });
        
        if (!analytics) return 0;

        const daysSinceLastLogin = Math.floor(
            (Date.now() - new Date(analytics.lastLogin)) / (1000 * 60 * 60 * 24)
        );

        // High churn risk = bigger discount
        if (daysSinceLastLogin > 14) return 50;
        if (daysSinceLastLogin > 7) return 25;
        if (analytics.engagementScore < 0.3) return 20;
        
        // High engagement = loyalty discount
        if (analytics.engagementScore > 0.8) return 10;
        
        return 0;
    }

    /**
     * Process referral conversion
     */
    async processReferralConversion(code, newUserId) {
        const referral = db.findOne('referrals', { code, used: false });
        if (!referral) return;

        // Mark as converted
        db.update('referrals', referral.id, {
            used: true,
            converted: true,
            convertedUserId: newUserId,
            convertedAt: new Date().toISOString()
        });

        // Award referrer
        const referrerStats = await db.getReferralStats(referral.referrerId);
        const reward = this.calculateReferralReward(referrerStats.converted);
        
        // Add credit to referrer's account
        const referrer = db.findById('users', referral.referrerId);
        if (referrer) {
            db.update('users', referrer.id, {
                accountCredit: (referrer.accountCredit || 0) + reward.amount
            });
        }

        // Update referral with reward
        db.update('referrals', referral.id, { rewardValue: reward.amount });
    }

    calculateReferralReward(convertedCount) {
        const rewards = [
            { threshold: 1, amount: 200, description: '1 week free' },
            { threshold: 3, amount: 500, description: 'Exclusive skin pack' },
            { threshold: 5, amount: 800, description: '1 month free' },
            { threshold: 10, amount: 2000, description: 'Permanent 20% discount' }
        ];

        const applicable = rewards.filter(r => convertedCount >= r.threshold);
        return applicable[applicable.length - 1] || rewards[0];
    }

    /**
     * Award XP for subscription actions
     */
    async awardSubscriptionXP(userId, tier) {
        const bp = await db.getUserBattlePass(userId);
        const xpAmount = tier === 'elder' ? 500 : tier === 'hunter' ? 300 : 100;
        
        const newXP = bp.xp + xpAmount;
        const newLevel = Math.floor(newXP / 1000) + 1;
        
        db.update('battlepass', bp.id, {
            xp: newXP,
            level: newLevel
        });

        return { xp: newXP, level: newLevel, gained: xpAmount };
    }

    /**
     * Unlock achievement
     */
    async unlockAchievement(userId, achievementId) {
        const existing = db.findOne('achievements', { 
            userId, 
            achievementId 
        });
        
        if (existing) return existing;

        return db.create('achievements', {
            userId,
            achievementId,
            unlockedAt: new Date().toISOString()
        });
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    getTierDescription(tier) {
        const descriptions = {
            survivor: 'Basic survival tools for the faint of heart',
            hunter: 'Enhanced abilities for those who hunt the darkness',
            elder: 'Ultimate power to reshape reality itself'
        };
        return descriptions[tier];
    }
}

module.exports = new PaymentService();
