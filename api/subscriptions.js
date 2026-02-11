/**
 * Subscription API Routes
 * Handles all subscription-related endpoints
 */

const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const battlePassService = require('../services/battlePassService');
const aiService = require('../services/aiService');
const db = require('../models/database');

// Middleware
const authMiddleware = require('../middleware/auth');

/**
 * @route POST /api/subscriptions/create-checkout
 * @desc Create a checkout session for subscription
 */
router.post('/create-checkout', authMiddleware, async (req, res) => {
    try {
        const { tier, billingCycle, referralCode } = req.body;
        const userId = req.user.id;

        const session = await paymentService.createCheckoutSession(
            userId, 
            tier, 
            billingCycle, 
            referralCode
        );

        res.json({ 
            success: true, 
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        console.error('Checkout creation error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * @route GET /api/subscriptions/status
 * @desc Get current user's subscription status
 */
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const subscription = await db.getActiveSubscription(userId);
        
        if (!subscription) {
            return res.json({ 
                hasSubscription: false,
                tier: null
            });
        }

        // Calculate time remaining
        const expiresAt = new Date(subscription.expiresAt);
        const daysRemaining = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));

        res.json({
            hasSubscription: true,
            tier: subscription.tier,
            billingCycle: subscription.billingCycle,
            startedAt: subscription.startedAt,
            expiresAt: subscription.expiresAt,
            daysRemaining,
            streakDays: subscription.streakDays,
            totalDays: subscription.totalDays,
            autoRenew: subscription.status === 'active'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/subscriptions/cancel
 * @desc Cancel active subscription
 */
router.post('/cancel', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await paymentService.cancelSubscription(userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/subscriptions/change-tier
 * @desc Upgrade or downgrade subscription tier
 */
router.post('/change-tier', authMiddleware, async (req, res) => {
    try {
        const { newTier } = req.body;
        const userId = req.user.id;
        
        const result = await paymentService.changeTier(userId, newTier);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/subscriptions/battle-pass
 * @desc Get user's battle pass data
 */
router.get('/battle-pass', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const battlePass = await battlePassService.getUserBattlePass(userId);
        res.json(battlePass);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/subscriptions/claim-reward
 * @desc Claim a battle pass reward
 */
router.post('/claim-reward', authMiddleware, async (req, res) => {
    try {
        const { level } = req.body;
        const userId = req.user.id;
        
        const result = await battlePassService.claimReward(userId, level);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route POST /api/subscriptions/daily-login
 * @desc Claim daily login reward
 */
router.post('/daily-login', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const status = await battlePassService.getDailyLoginStatus(userId);
        
        if (!status.canClaim) {
            return res.status(400).json({ 
                error: 'Already claimed today',
                nextClaim: 'Tomorrow'
            });
        }

        const result = await battlePassService.awardXP(userId, 'DAILY_LOGIN', {
            streak: status.currentStreak
        });

        res.json({
            success: true,
            xpGained: result.xpGained,
            streak: status.currentStreak + 1,
            nextMilestone: status.nextMilestone
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/subscriptions/leaderboard
 * @desc Get subscription leaderboard
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const leaderboard = await battlePassService.getLeaderboard(limit);
        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/subscriptions/profile
 * @desc Get AI-generated horror profile
 */
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await aiService.generateHorrorProfile(userId);
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/subscriptions/dashboard
 * @desc Get personalized dashboard
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const dashboard = await aiService.getPersonalizedDashboard(userId);
        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/subscriptions/community-goals
 * @desc Get community milestone goals
 */
router.get('/community-goals', async (req, res) => {
    try {
        const goals = await db.getCommunityGoals();
        res.json(goals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/subscriptions/pricing
 * @desc Get pricing with personalized discounts
 */
router.get('/pricing', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const discount = await paymentService.getPersonalizedDiscount(userId);
        
        const basePrices = {
            survivor: { monthly: 2, annual: 20 },
            hunter: { monthly: 5, annual: 50 },
            elder: { monthly: 8, annual: 80 }
        };

        // Apply discount
        const prices = {};
        Object.entries(basePrices).forEach(([tier, cycles]) => {
            prices[tier] = {
                monthly: cycles.monthly * (1 - discount / 100),
                annual: cycles.annual * (1 - discount / 100),
                originalMonthly: cycles.monthly,
                originalAnnual: cycles.annual
            };
        });

        res.json({
            prices,
            discount,
            discountReason: discount > 0 ? 'Personalized offer based on your engagement' : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
