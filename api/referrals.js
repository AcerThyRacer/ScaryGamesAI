/**
 * Referral API Routes
 * Handles referral system endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../models/database');
const authMiddleware = require('../middleware/auth');

/**
 * @route GET /api/referrals/my-code
 * @desc Get user's referral code
 */
router.get('/my-code', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        let referral = db.findOne('referrals', { referrerId: userId, isMasterCode: true });
        
        if (!referral) {
            // Generate new code
            const code = `SUMMON-${req.user.username?.substr(0, 6).toUpperCase() || 'USER'}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            referral = db.create('referrals', {
                referrerId: userId,
                code,
                isMasterCode: true,
                used: false,
                createdAt: new Date().toISOString()
            });
        }

        const stats = await db.getReferralStats(userId);
        
        res.json({
            code: referral.code,
            link: `${process.env.DOMAIN}/subscription?ref=${referral.code}`,
            stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/referrals/stats
 * @desc Get detailed referral statistics
 */
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await db.getReferralStats(userId);
        
        // Get individual referrals
        const referrals = db.find('referrals', { referrerId: userId })
            .filter(r => !r.isMasterCode)
            .map(r => ({
                email: r.referredEmail,
                status: r.converted ? 'converted' : 'pending',
                date: r.createdAt,
                reward: r.rewardValue || 0
            }));

        // Calculate next reward
        const nextMilestone = this.getNextMilestone(stats.converted);

        res.json({
            ...stats,
            referrals,
            nextMilestone
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/referrals/track-click
 * @desc Track referral link click
 */
router.post('/track-click', async (req, res) => {
    try {
        const { code } = req.body;
        
        const referral = db.findOne('referrals', { code });
        if (!referral) {
            return res.status(404).json({ error: 'Invalid referral code' });
        }

        // Update click stats
        db.update('referrals', referral.id, {
            clicks: (referral.clicks || 0) + 1
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/referrals/leaderboard
 * @desc Get top referrers
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const allReferrals = db.findAll('referrals');
        
        // Group by referrer
        const referrerStats = {};
        allReferrals.forEach(r => {
            if (!referrerStats[r.referrerId]) {
                referrerStats[r.referrerId] = { total: 0, converted: 0 };
            }
            referrerStats[r.referrerId].total++;
            if (r.converted) {
                referrerStats[r.referrerId].converted++;
            }
        });

        // Get user details and sort
        const leaderboard = Object.entries(referrerStats)
            .map(([userId, stats]) => {
                const user = db.findById('users', userId);
                return {
                    username: user?.username || 'Unknown',
                    avatar: user?.avatar || '👤',
                    total: stats.total,
                    converted: stats.converted,
                    cultTitle: stats.converted >= 10 ? 'High Priest' : 
                               stats.converted >= 5 ? 'Cult Leader' : 
                               stats.converted >= 1 ? 'Summoner' : 'Acolyte'
                };
            })
            .sort((a, b) => b.converted - a.converted)
            .slice(0, 20);

        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

getNextMilestone(converted) {
    const milestones = [
        { count: 1, reward: '1 Week Free' },
        { count: 3, reward: 'Exclusive Skin Pack' },
        { count: 5, reward: '1 Month Free + Cult Leader Badge' },
        { count: 10, reward: 'Permanent 20% Discount' }
    ];

    return milestones.find(m => m.count > converted) || null;
}

module.exports = router;
