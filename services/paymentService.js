/**
 * Payment Service - Stripe Integration
 * Handles all payment processing, subscriptions, and billing
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const db = require('../models/database');
const postgres = require('../models/postgres');
const { appendAuditEvent, executeIdempotentMutation, makeId } = require('./economyMutationService');
const dataAccess = require('../models/data-access');

const ACHIEVEMENT_TIER_REWARDS = {
    bronze: { souls: 100, gemDust: 5, bloodGems: 0 },
    silver: { souls: 500, gemDust: 15, bloodGems: 0 },
    gold: { souls: 2000, gemDust: 0, bloodGems: 50 },
    platinum: { souls: 10000, gemDust: 0, bloodGems: 200 }
};

const DEFAULT_ACHIEVEMENT_META = {
    first_blood: { tier: 'bronze', hidden: false },
    tier_hopper: { tier: 'silver', hidden: false }
};

function normalizeAchievementTier(tier) {
    const normalized = String(tier || '').trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(ACHIEVEMENT_TIER_REWARDS, normalized)) {
        return normalized;
    }
    return 'bronze';
}

function resolveAchievementReward(achievementMeta = {}) {
    const tier = normalizeAchievementTier(achievementMeta.tier);
    const hidden = achievementMeta.hidden === true;
    const multiplier = hidden ? 2 : 1;
    const base = ACHIEVEMENT_TIER_REWARDS[tier];

    return {
        tier,
        hidden,
        multiplier,
        souls: base.souls * multiplier,
        gemDust: base.gemDust * multiplier,
        bloodGems: base.bloodGems * multiplier
    };
}

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
    async unlockAchievement(userId, achievementId, achievementMeta = null) {
        if (!userId || !achievementId) {
            const err = new Error('userId and achievementId are required');
            err.code = 'INVALID_ACHIEVEMENT_UNLOCK_INPUT';
            throw err;
        }

        const normalizedAchievementId = String(achievementId).trim();
        if (!normalizedAchievementId) {
            const err = new Error('achievementId is required');
            err.code = 'INVALID_ACHIEVEMENT_UNLOCK_INPUT';
            throw err;
        }

        const resolvedMeta = {
            ...(DEFAULT_ACHIEVEMENT_META[normalizedAchievementId] || {}),
            ...(achievementMeta || {})
        };
        const reward = resolveAchievementReward(resolvedMeta);

        if (postgres.isEnabled()) {
            const requestPayload = {
                userId,
                achievementId: normalizedAchievementId,
                tier: reward.tier,
                hidden: reward.hidden
            };

            const mutation = await executeIdempotentMutation({
                scope: 'achievement.unlock',
                idempotencyKey: `achievement_unlock:${userId}:${normalizedAchievementId}`,
                requestPayload,
                actorUserId: userId,
                targetUserId: userId,
                entityType: 'achievement',
                entityId: `${userId}:${normalizedAchievementId}`,
                eventType: 'achievement.unlock',
                perfChannel: 'achievement.unlock',
                mutationFn: async () => {
                    await postgres.query('BEGIN');
                    try {
                        const userResult = await postgres.query(
                            'SELECT id, souls, blood_gems, gem_dust FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
                            [userId]
                        );
                        const user = userResult.rows[0];
                        if (!user) {
                            const err = new Error('User not found');
                            err.code = 'USER_NOT_FOUND';
                            throw err;
                        }

                        const existing = await postgres.query(
                            `
                                SELECT id, user_id, achievement_id, unlocked_at
                                FROM achievements
                                WHERE user_id = $1 AND achievement_id = $2
                                LIMIT 1
                                FOR UPDATE
                            `,
                            [userId, normalizedAchievementId]
                        );

                        if (existing.rows[0]) {
                            await postgres.query('COMMIT');
                            return {
                                achievementId: normalizedAchievementId,
                                unlocked: false,
                                alreadyUnlocked: true,
                                reward: { souls: 0, gemDust: 0, bloodGems: 0 },
                                rewardMeta: {
                                    tier: reward.tier,
                                    hidden: reward.hidden,
                                    multiplier: reward.multiplier
                                },
                                balances: {
                                    souls: Number(user.souls || 0),
                                    gemDust: Number(user.gem_dust || 0),
                                    bloodGems: Number(user.blood_gems || 0)
                                },
                                resourceType: 'achievement_unlock',
                                resourceId: `${userId}:${normalizedAchievementId}`
                            };
                        }

                        const newSouls = Number(user.souls || 0) + reward.souls;
                        const newGemDust = Number(user.gem_dust || 0) + reward.gemDust;
                        const newBloodGems = Number(user.blood_gems || 0) + reward.bloodGems;

                        await postgres.query(
                            `
                                INSERT INTO achievements (
                                    id,
                                    user_id,
                                    achievement_id,
                                    tier,
                                    is_hidden,
                                    unlocked_at,
                                    created_at,
                                    updated_at
                                )
                                VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
                            `,
                            [makeId('ach'), userId, normalizedAchievementId, reward.tier, reward.hidden]
                        );

                        await postgres.query(
                            `
                                UPDATE users
                                SET souls = $2,
                                    gem_dust = $3,
                                    blood_gems = $4,
                                    updated_at = NOW()
                                WHERE id = $1
                            `,
                            [userId, newSouls, newGemDust, newBloodGems]
                        );

                        await appendAuditEvent({
                            actorUserId: userId,
                            targetUserId: userId,
                            entityType: 'currency',
                            entityId: userId,
                            eventType: 'currency.credit',
                            idempotencyKey: `achievement_unlock:${userId}:${normalizedAchievementId}`,
                            metadata: {
                                reason: 'achievement_unlock',
                                achievementId: normalizedAchievementId,
                                tier: reward.tier,
                                hidden: reward.hidden,
                                multiplier: reward.multiplier,
                                souls: reward.souls,
                                gemDust: reward.gemDust,
                                bloodGems: reward.bloodGems
                            }
                        });

                        await postgres.query('COMMIT');

                        return {
                            achievementId: normalizedAchievementId,
                            unlocked: true,
                            alreadyUnlocked: false,
                            reward: {
                                souls: reward.souls,
                                gemDust: reward.gemDust,
                                bloodGems: reward.bloodGems
                            },
                            rewardMeta: {
                                tier: reward.tier,
                                hidden: reward.hidden,
                                multiplier: reward.multiplier
                            },
                            balances: {
                                souls: newSouls,
                                gemDust: newGemDust,
                                bloodGems: newBloodGems
                            },
                            resourceType: 'achievement_unlock',
                            resourceId: `${userId}:${normalizedAchievementId}`
                        };
                    } catch (error) {
                        await postgres.query('ROLLBACK');
                        throw error;
                    }
                }
            });

            return mutation.responseBody;
        }

        const existing = db.findOne('achievements', {
            userId,
            achievementId: normalizedAchievementId
        });

        if (existing) {
            return {
                achievementId: normalizedAchievementId,
                unlocked: false,
                alreadyUnlocked: true,
                reward: { souls: 0, gemDust: 0, bloodGems: 0 },
                rewardMeta: {
                    tier: reward.tier,
                    hidden: reward.hidden,
                    multiplier: reward.multiplier
                }
            };
        }

        const user = db.findById('users', userId);
        if (user) {
            db.update('users', user.id, {
                souls: Number(user.souls || 0) + reward.souls,
                gem_dust: Number(user.gem_dust || 0) + reward.gemDust,
                blood_gems: Number(user.blood_gems || 0) + reward.bloodGems
            });
        }

        const achievement = db.create('achievements', {
            userId,
            achievementId: normalizedAchievementId,
            tier: reward.tier,
            isHidden: reward.hidden,
            unlockedAt: new Date().toISOString()
        });

        return {
            ...achievement,
            achievementId: normalizedAchievementId,
            unlocked: true,
            alreadyUnlocked: false,
            reward: {
                souls: reward.souls,
                gemDust: reward.gemDust,
                bloodGems: reward.bloodGems
            },
            rewardMeta: {
                tier: reward.tier,
                hidden: reward.hidden,
                multiplier: reward.multiplier
            }
        };
    }

    async giftSubscription({
        senderUserId,
        recipientUserId,
        tier,
        billingCycle,
        message = null,
        idempotencyKey = null,
        requestId = null
    }) {
        if (!senderUserId || !recipientUserId) {
            const err = new Error('senderUserId and recipientUserId are required');
            err.code = 'INVALID_INPUT';
            throw err;
        }
        if (senderUserId === recipientUserId) {
            const err = new Error('Cannot gift subscription to yourself');
            err.code = 'SELF_GIFT_FORBIDDEN';
            throw err;
        }

        const validTiers = new Set(['survivor', 'hunter', 'elder']);
        const validCycles = new Set(['monthly', 'annual']);
        if (!validTiers.has(tier)) {
            const err = new Error('Invalid subscription tier');
            err.code = 'INVALID_TIER';
            throw err;
        }
        if (!validCycles.has(billingCycle)) {
            const err = new Error('Invalid billing cycle');
            err.code = 'INVALID_BILLING_CYCLE';
            throw err;
        }

        if (postgres.isEnabled()) {
            const extensionDays = billingCycle === 'annual' ? 365 : 30;

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Check for duplicate transaction
                if (idempotencyKey) {
                    const existingTransaction = await client.query(
                        `SELECT id FROM gift_transactions WHERE idempotency_key = $1 LIMIT 1`,
                        [idempotencyKey]
                    );

                    if (existingTransaction.rows.length > 0) {
                        const err = new Error('Transaction already processed');
                        err.code = 'DUPLICATE_TRANSACTION';
                        throw err;
                    }
                }

                const recipientUser = await client.query(
                    'SELECT id FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
                    [recipientUserId]
                );
                if (!recipientUser.rows[0]) {
                    const err = new Error('Recipient user not found');
                    err.code = 'RECIPIENT_NOT_FOUND';
                    throw err;
                }

                const existingActive = await client.query(
                    `
                      SELECT id, expires_at
                      FROM subscriptions
                      WHERE user_id = $1
                        AND status = 'active'
                      ORDER BY expires_at DESC NULLS LAST
                      LIMIT 1
                      FOR UPDATE
                    `,
                    [recipientUserId]
                );

                const now = new Date();
                const base = existingActive.rows[0]?.expires_at
                    && new Date(existingActive.rows[0].expires_at) > now
                    ? new Date(existingActive.rows[0].expires_at)
                    : now;
                base.setDate(base.getDate() + extensionDays);
                const expiresAt = base.toISOString();

                if (existingActive.rows[0]) {
                    await client.query(
                        `
                          UPDATE subscriptions
                          SET tier = $2,
                              billing_cycle = $3,
                              expires_at = $4,
                              updated_at = NOW()
                          WHERE id = $1
                        `,
                        [existingActive.rows[0].id, tier, billingCycle, expiresAt]
                    );
                } else {
                    await client.query(
                        `
                          INSERT INTO subscriptions (
                            id, user_id, tier, billing_cycle, status, started_at, expires_at,
                            streak_days, total_days, created_at, updated_at
                          )
                          VALUES ($1, $2, $3, $4, 'active', NOW(), $5, 0, 0, NOW(), NOW())
                        `,
                        [makeId('sub'), recipientUserId, tier, billingCycle, expiresAt]
                    );
                }

                const giftId = makeId('gift');
                await client.query(
                    `
                      INSERT INTO gift_transactions (
                        id, gift_type, sender_user_id, recipient_user_id,
                        subscription_tier, subscription_billing_cycle, status,
                        message, metadata, delivered_at, created_at, updated_at, idempotency_key
                      )
                      VALUES (
                        $1, 'subscription', $2, $3, $4, $5, 'delivered',
                        $6, $7::jsonb, NOW(), NOW(), NOW(), $8
                      )
                    `,
                    [
                        giftId,
                        senderUserId,
                        recipientUserId,
                        tier,
                        billingCycle,
                        message,
                        JSON.stringify({ source: 'subscription_gift', giftedBy: senderUserId }),
                        idempotencyKey
                    ]
                );

                await appendAuditEvent({
                    actorUserId: senderUserId,
                    targetUserId: recipientUserId,
                    entityType: 'subscription',
                    entityId: recipientUserId,
                    eventType: 'subscription.gift.granted',
                    requestId,
                    idempotencyKey,
                    metadata: {
                        tier,
                        billingCycle,
                        extensionDays
                    }
                });

                await client.query('COMMIT');

                return {
                    success: true,
                    giftId,
                    recipientUserId,
                    tier,
                    billingCycle,
                    expiresAt
                };
            } catch (error) {
                await client.query('ROLLBACK');
                console.error('[PaymentService] Gift subscription transaction failed:', error);
                throw error;
            } finally {
                client.release();
            }
        }

        // JSON fallback for backward compatibility in non-PG mode.
        try {
            const now = new Date();
            const expiresAt = new Date(now);
            if (billingCycle === 'annual') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            else expiresAt.setMonth(expiresAt.getMonth() + 1);

            db.create('subscriptions', {
                userId: recipientUserId,
                tier,
                billingCycle,
                status: 'active',
                startedAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
                giftedBy: senderUserId,
                giftMessage: message || null
            });

            return {
                success: true,
                giftId: `gift_${Date.now()}`,
                recipientUserId,
                tier,
                billingCycle,
                expiresAt: expiresAt.toISOString()
            };
        } catch (error) {
            console.error('[PaymentService] Gift subscription failed in JSON mode:', error);
            throw error;
        }
    }

    async recordRevenuePurchaseTransaction({
        userId,
        stream,
        skuKey,
        orderId,
        amount,
        currency = 'USD',
        requestId = null,
        idempotencyKey = null,
        metadata = {}
    }) {
        if (!postgres.isEnabled()) {
            return {
                success: true,
                provider: 'json',
                skipped: true
            };
        }

        const tx = await dataAccess.createPaymentTransaction({
            id: makeId('pay_txn'),
            orderId,
            provider: 'internal_stub',
            providerTransactionId: null,
            status: 'succeeded',
            amount: Math.max(0, parseInt(amount, 10) || 0),
            currency,
            requestPayload: { stream, skuKey },
            responsePayload: { approved: true, mode: 'server_authoritative' },
            processedAt: new Date().toISOString()
        });

        await appendAuditEvent({
            actorUserId: userId,
            targetUserId: userId,
            entityType: 'payment_transaction',
            entityId: tx?.id || null,
            eventType: 'revenue.purchase.transaction_recorded',
            requestId,
            idempotencyKey,
            metadata: {
                stream,
                skuKey,
                orderId,
                amount,
                currency,
                ...metadata
            }
        });

        return {
            success: true,
            provider: 'internal_stub',
            transactionId: tx?.id || null
        };
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
