/**
 * Battle Pass Service - Gamification System
 * Handles XP, levels, rewards, and progression
 */

const db = require('../models/database');

const REWARDS = {
    1: { type: 'cursor', name: 'Blood-Stained Cursor', tier: 'common' },
    2: { type: 'badge', name: 'Novice Survivor Badge', tier: 'common' },
    3: { type: 'theme', name: 'Dark Forest Theme', tier: 'common' },
    5: { type: 'currency', name: '100 Horror Coins', amount: 100, tier: 'rare' },
    7: { type: 'frame', name: 'Bronze Profile Frame', tier: 'rare' },
    10: { type: 'game', name: 'Exclusive Mini-Game: Escape the Cellar', tier: 'rare' },
    15: { type: 'currency', name: '250 Horror Coins', amount: 250, tier: 'epic' },
    20: { type: 'cursor', name: 'Spectral Blade Cursor', tier: 'epic' },
    25: { type: 'subscription', name: 'Free Week of Next Tier', tier: 'epic' },
    30: { type: 'frame', name: 'Silver Profile Frame', tier: 'epic' },
    40: { type: 'game', name: 'Exclusive Mini-Game: Hunt the Wendigo', tier: 'legendary' },
    50: { type: 'title', name: 'Eternal" Status', tier: 'legendary' },
    75: { type: 'currency', name: '1000 Horror Coins', amount: 1000, tier: 'mythic' },
    100: { type: 'exclusive', name: 'Lifetime Perks + Custom Game Mode', tier: 'mythic' }
};

const XP_SOURCES = {
    DAILY_LOGIN: { base: 50, streakMultiplier: 0.1 },
    GAME_PLAYED: { base: 10, timeMultiplier: 0.01 },
    ACHIEVEMENT_UNLOCKED: { base: 100 },
    SUBSCRIPTION_MAINTAINED: { base: 100, daily: true },
    REFERRAL: { base: 200 },
    SOCIAL_SHARE: { base: 25 },
    CHALLENGE_COMPLETED: { base: 75 },
    MINI_GAME_HIGH_SCORE: { base: 50 }
};

class BattlePassService {
    /**
     * Get user's full battle pass data
     */
    async getUserBattlePass(userId) {
        const bp = await db.getUserBattlePass(userId);
        const nextLevelXP = bp.level * 1000;
        const progress = (bp.xp % 1000) / 1000 * 100;
        
        // Get available rewards
        const availableRewards = Object.entries(REWARDS)
            .filter(([level]) => parseInt(level) <= bp.level)
            .map(([level, reward]) => ({
                level: parseInt(level),
                ...reward,
                claimed: bp.rewardsClaimed.includes(parseInt(level))
            }));

        // Get next reward
        const nextRewardLevel = Object.keys(REWARDS)
            .map(Number)
            .find(level => level > bp.level);
        
        return {
            ...bp,
            progress,
            nextLevelXP,
            currentLevelXP: bp.xp % 1000,
            availableRewards,
            nextReward: nextRewardLevel ? { level: nextRewardLevel, ...REWARDS[nextRewardLevel] } : null,
            totalXP: bp.xp
        };
    }

    /**
     * Award XP to user
     */
    async awardXP(userId, source, metadata = {}) {
        const sourceConfig = XP_SOURCES[source];
        if (!sourceConfig) throw new Error('Invalid XP source');

        let xpAmount = sourceConfig.base;

        // Apply multipliers
        if (sourceConfig.streakMultiplier && metadata.streak) {
            xpAmount += xpAmount * (sourceConfig.streakMultiplier * metadata.streak);
        }

        if (sourceConfig.timeMultiplier && metadata.playTime) {
            xpAmount += metadata.playTime * sourceConfig.timeMultiplier;
        }

        // Round to nearest integer
        xpAmount = Math.round(xpAmount);

        // Get current battle pass
        const bp = await db.getUserBattlePass(userId);
        const oldLevel = bp.level;
        const newXP = bp.xp + xpAmount;
        const newLevel = Math.floor(newXP / 1000) + 1;

        // Check for level up
        const levelUps = [];
        for (let level = oldLevel + 1; level <= newLevel; level++) {
            if (REWARDS[level]) {
                levelUps.push({ level, reward: REWARDS[level] });
            }
        }

        // Update battle pass
        const updates = {
            xp: newXP,
            level: newLevel
        };

        // Update streak if daily login
        if (source === 'DAILY_LOGIN') {
            const lastLogin = new Date(bp.lastLogin);
            const now = new Date();
            const daysDiff = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 1) {
                updates.streakDays = bp.streakDays + 1;
            } else if (daysDiff > 1) {
                updates.streakDays = 1; // Reset streak
            }
            
            updates.lastLogin = now.toISOString();
        }

        db.update('battlepass', bp.id, updates);

        // Record XP transaction
        db.create('analytics', {
            userId,
            type: 'xp_awarded',
            source,
            amount: xpAmount,
            metadata,
            timestamp: new Date().toISOString()
        });

        return {
            xpGained: xpAmount,
            newTotal: newXP,
            oldLevel,
            newLevel,
            levelUps,
            leveledUp: newLevel > oldLevel
        };
    }

    /**
     * Claim a reward
     */
    async claimReward(userId, level) {
        const bp = await db.getUserBattlePass(userId);
        
        if (bp.level < level) {
            throw new Error('Level not reached yet');
        }

        if (bp.rewardsClaimed.includes(level)) {
            throw new Error('Reward already claimed');
        }

        const reward = REWARDS[level];
        if (!reward) {
            throw new Error('Invalid reward level');
        }

        // Add to claimed rewards
        const claimed = [...bp.rewardsClaimed, level];
        db.update('battlepass', bp.id, { rewardsClaimed: claimed });

        // Apply reward
        await this.applyReward(userId, reward);

        return { success: true, reward };
    }

    /**
     * Apply reward to user account
     */
    async applyReward(userId, reward) {
        const user = db.findById('users', userId);
        
        switch (reward.type) {
            case 'currency':
                db.update('users', userId, {
                    horrorCoins: (user.horrorCoins || 0) + reward.amount
                });
                break;
            
            case 'cursor':
            case 'badge':
            case 'frame':
            case 'theme':
                const inventory = user.inventory || [];
                inventory.push({
                    type: reward.type,
                    name: reward.name,
                    tier: reward.tier,
                    acquiredAt: new Date().toISOString()
                });
                db.update('users', userId, { inventory });
                break;
            
            case 'subscription':
                // Add credit for free week
                db.update('users', userId, {
                    accountCredit: (user.accountCredit || 0) + 200
                });
                break;
            
            case 'title':
                db.update('users', userId, {
                    title: reward.name,
                    isEternal: true
                });
                break;
        }
    }

    /**
     * Get daily login status
     */
    async getDailyLoginStatus(userId) {
        const bp = await db.getUserBattlePass(userId);
        const lastLogin = new Date(bp.lastLogin);
        const now = new Date();
        const daysDiff = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));

        const canClaim = daysDiff >= 1;
        const streakBroken = daysDiff > 1;

        // Calculate reward based on streak
        const baseReward = 50;
        const streakBonus = Math.min(bp.streakDays * 5, 100); // Max 100 bonus
        const totalReward = baseReward + streakBonus;

        return {
            canClaim,
            streakBroken,
            currentStreak: bp.streakDays,
            reward: totalReward,
            nextMilestone: this.getNextStreakMilestone(bp.streakDays)
        };
    }

    getNextStreakMilestone(currentStreak) {
        const milestones = [7, 14, 30, 60, 90, 180, 365];
        return milestones.find(m => m > currentStreak) || null;
    }

    /**
     * Get leaderboard
     */
    async getLeaderboard(limit = 100) {
        const allBP = db.findAll('battlepass')
            .sort((a, b) => b.xp - a.xp)
            .slice(0, limit);

        return Promise.all(allBP.map(async (bp, index) => {
            const user = db.findById('users', bp.userId);
            return {
                rank: index + 1,
                username: user?.username || 'Unknown',
                level: bp.level,
                xp: bp.xp,
                streakDays: bp.streakDays,
                isEternal: user?.isEternal || false
            };
        }));
    }

    /**
     * Process daily maintenance (streak checking, etc.)
     */
    async processDailyMaintenance() {
        const allBP = db.findAll('battlepass');
        const now = new Date();

        for (const bp of allBP) {
            const lastLogin = new Date(bp.lastLogin);
            const daysDiff = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));

            // Reset streak if missed 2+ days
            if (daysDiff > 1 && bp.streakDays > 0) {
                db.update('battlepass', bp.id, { streakDays: 0 });
            }

            // Award daily subscription XP for active subscribers
            const sub = await db.getActiveSubscription(bp.userId);
            if (sub && XP_SOURCES.SUBSCRIPTION_MAINTAINED.daily) {
                await this.awardXP(bp.userId, 'SUBSCRIPTION_MAINTAINED');
            }
        }
    }
}

module.exports = new BattlePassService();
