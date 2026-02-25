/**
 * BATTLE PASS 2.0 - CORE SYSTEM
 * ==============================
 * Cross-game seasonal progression system with:
 * - Free and Premium tracks (100 tiers each)
 * - XP earning mechanisms
 * - Challenge system
 * - Reward redemption
 * - Season management
 * 
 * @version 2.0.0
 * @author ScaryGamesAI Team
 */

class BattlePassSystem {
    constructor() {
        this.currentSeason = null;
        this.playerProgress = null;
        this.seasons = new Map();
        this.challenges = {
            daily: [],
            weekly: [],
            seasonal: [],
            event: []
        };
        
        this.xpSources = {
            gameCompletion: 500,
            levelComplete: 50,
            enemyKill: 5,
            bossKill: 50,
            collectibleFound: 10,
            achievementUnlock: 100,
            challengeComplete: 200,
            dailyLogin: 50
        };
        
        this.initialized = false;
    }

    /**
     * Initialize battle pass system
     */
    async init() {
        console.log('[BattlePass] Initializing Battle Pass 2.0...');
        
        // Load current season
        await this.loadCurrentSeason();
        
        // Load player progress
        await this.loadPlayerProgress();
        
        // Generate challenges
        await this.generateChallenges();
        
        // Setup auto-save
        this.setupAutoSave();
        
        this.initialized = true;
        
        console.log('[BattlePass] System initialized successfully');
        
        // Dispatch initialization event
        this.dispatchEvent('battlepass:ready', {
            season: this.currentSeason?.id,
            tier: this.playerProgress?.currentTier
        });
    }

    /**
     * Load current season data
     */
    async loadCurrentSeason() {
        // Check for saved season
        const savedSeason = localStorage.getItem('battlepass_current_season');
        
        if (savedSeason) {
            const seasonData = JSON.parse(savedSeason);
            
            // Check if season is still active
            const now = new Date();
            const endDate = new Date(seasonData.endDate);
            
            if (now <= endDate) {
                this.currentSeason = seasonData;
                console.log('[BattlePass] Loaded current season:', seasonData.name);
                return;
            }
        }
        
        // Create default season if none exists or expired
        this.currentSeason = this.createDefaultSeason();
        await this.saveCurrentSeason();
    }

    /**
     * Create default season
     */
    createDefaultSeason() {
        const now = new Date();
        const startDate = new Date(now);
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 56); // 8 weeks
        
        return {
            id: `season_${startDate.getFullYear()}_${Math.floor(startDate.getMonth() / 2) + 1}`,
            name: `Season ${startDate.getFullYear()} - ${this.getSeasonName(startDate.getMonth())}`,
            theme: 'Horror Nights',
            description: 'Embrace the terror and earn exclusive rewards!',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            maxTier: 100,
            tracks: {
                free: this.generateFreeTrackRewards(),
                premium: this.generatePremiumTrackRewards()
            },
            challenges: {
                daily: 3,
                weekly: 5,
                seasonal: 10
            }
        };
    }

    /**
     * Get season name from month
     */
    getSeasonName(month) {
        const names = [
            'New Year', 'Love & Death', 'Spring Terror', 'April Frights',
            'Mayhem', 'Summer Scares', 'Midnight Madness', 'August Agony',
            'September Screams', 'October Horror', 'November Nightmares', 'December Dread'
        ];
        return names[month] || 'Unknown';
    }

    /**
     * Generate free track rewards
     */
    generateFreeTrackRewards() {
        const rewards = [];
        
        for (let i = 1; i <= 100; i++) {
            const reward = {
                tier: i,
                type: this.getRandomRewardType('free'),
                amount: this.getRewardAmount(i, 'free')
            };
            
            // Add special rewards at milestones
            if (i % 10 === 0) {
                reward.type = 'currency';
                reward.amount = 100;
                reward.rarity = 'rare';
            }
            
            rewards.push(reward);
        }
        
        return rewards;
    }

    /**
     * Generate premium track rewards
     */
    generatePremiumTrackRewards() {
        const rewards = [];
        
        for (let i = 1; i <= 100; i++) {
            const reward = {
                tier: i,
                type: this.getRandomRewardType('premium'),
                amount: this.getRewardAmount(i, 'premium'),
                rarity: this.getRarity(i)
            };
            
            // Special rewards every 5 tiers
            if (i % 5 === 0) {
                reward.type = 'cosmetic';
                reward.rarity = i % 20 === 0 ? 'legendary' : 'epic';
            }
            
            rewards.push(reward);
        }
        
        return rewards;
    }

    /**
     * Get random reward type
     */
    getRandomRewardType(track) {
        const types = ['currency', 'item', 'boost', 'cosmetic'];
        const weights = track === 'free' ? [0.4, 0.3, 0.2, 0.1] : [0.2, 0.2, 0.2, 0.4];
        
        const rand = Math.random();
        let sum = 0;
        
        for (let i = 0; i < types.length; i++) {
            sum += weights[i];
            if (rand <= sum) return types[i];
        }
        
        return types[0];
    }

    /**
     * Get reward amount based on tier
     */
    getRewardAmount(tier, track) {
        const base = track === 'free' ? 10 : 20;
        const multiplier = 1 + Math.floor(tier / 10) * 0.2;
        return Math.floor(base * multiplier);
    }

    /**
     * Get rarity based on tier
     */
    getRarity(tier) {
        if (tier % 20 === 0) return 'legendary';
        if (tier % 10 === 0) return 'epic';
        if (tier % 5 === 0) return 'rare';
        return 'common';
    }

    /**
     * Load player progress
     */
    async loadPlayerProgress() {
        const saved = localStorage.getItem('battlepass_progress');
        
        if (saved) {
            this.playerProgress = JSON.parse(saved);
            
            // Validate progress
            if (!this.playerProgress.seasonId || !this.playerProgress.currentTier) {
                this.playerProgress = this.createDefaultProgress();
            }
        } else {
            this.playerProgress = this.createDefaultProgress();
        }
        
        console.log('[BattlePass] Loaded player progress:', this.playerProgress);
    }

    /**
     * Create default player progress
     */
    createDefaultProgress() {
        return {
            seasonId: this.currentSeason.id,
            currentTier: 1,
            xp: 0,
            xpToNextTier: this.getXPForTier(1),
            totalXP: 0,
            premium: false,
            unlockedTiers: [],
            claimedRewards: {
                free: [],
                premium: []
            },
            completedChallenges: [],
            lastLogin: new Date().toISOString()
        };
    }

    /**
     * Get XP required for tier
     */
    getXPForTier(tier) {
        // Progressive XP curve
        const base = 1000;
        const increase = 100;
        return base + (tier - 1) * increase;
    }

    /**
     * Add XP to player
     */
    addXP(amount, source) {
        if (!this.playerProgress) return;
        
        const xpGain = this.calculateXPGain(amount, source);
        this.playerProgress.xp += xpGain;
        this.playerProgress.totalXP += xpGain;
        
        console.log(`[BattlePass] Gained ${xpGain} XP from ${source}`);
        
        // Check for tier ups
        while (this.playerProgress.xp >= this.playerProgress.xpToNextTier) {
            this.tierUp();
        }
        
        // Save progress
        this.savePlayerProgress();
        
        // Dispatch event
        this.dispatchEvent('battlepass:xpgain', {
            amount: xpGain,
            source: source,
            totalXP: this.playerProgress.totalXP,
            currentTier: this.playerProgress.currentTier
        });
    }

    /**
     * Calculate XP gain with bonuses
     */
    calculateXPGain(baseAmount, source) {
        let multiplier = 1.0;
        
        // Premium bonus
        if (this.playerProgress.premium) {
            multiplier += 0.5; // +50% XP
        }
        
        // Boost bonus
        if (this.hasActiveBoost()) {
            multiplier += 0.25; // +25% XP
        }
        
        // First win of day bonus
        if (this.isFirstWinOfDay(source)) {
            multiplier += 0.5; // +50% XP
        }
        
        return Math.floor(baseAmount * multiplier);
    }

    /**
     * Tier up
     */
    tierUp() {
        this.playerProgress.xp -= this.playerProgress.xpToNextTier;
        this.playerProgress.currentTier++;
        this.playerProgress.xpToNextTier = this.getXPForTier(this.playerProgress.currentTier);
        this.playerProgress.unlockedTiers.push(this.playerProgress.currentTier);
        
        console.log(`[BattlePass] Tier up! Now tier ${this.playerProgress.currentTier}`);
        
        // Dispatch event
        this.dispatchEvent('battlepass:tierup', {
            newTier: this.playerProgress.currentTier,
            rewards: this.getTierRewards(this.playerProgress.currentTier)
        });
        
        // Play sound effect
        this.playTierUpSound();
    }

    /**
     * Get rewards for tier
     */
    getTierRewards(tier) {
        const rewards = [];
        
        // Free reward
        const freeReward = this.currentSeason.tracks.free.find(r => r.tier === tier);
        if (freeReward) {
            rewards.push({ ...freeReward, track: 'free' });
        }
        
        // Premium reward (if player has premium)
        if (this.playerProgress.premium) {
            const premiumReward = this.currentSeason.tracks.premium.find(r => r.tier === tier);
            if (premiumReward) {
                rewards.push({ ...premiumReward, track: 'premium' });
            }
        }
        
        return rewards;
    }

    /**
     * Claim reward
     */
    claimReward(tier, track) {
        if (!this.playerProgress.unlockedTiers.includes(tier)) {
            throw new Error(`Tier ${tier} not yet unlocked`);
        }
        
        const alreadyClaimed = this.playerProgress.claimedRewards[track].includes(tier);
        if (alreadyClaimed) {
            throw new Error(`Reward already claimed for tier ${tier} (${track})`);
        }
        
        // Get reward
        const trackRewards = this.currentSeason.tracks[track];
        const reward = trackRewards.find(r => r.tier === tier);
        
        if (!reward) {
            throw new Error(`No reward found for tier ${tier} (${track})`);
        }
        
        // Mark as claimed
        this.playerProgress.claimedRewards[track].push(tier);
        this.savePlayerProgress();
        
        // Grant reward
        this.grantReward(reward);
        
        console.log(`[BattlePass] Claimed reward: Tier ${tier} ${track} - ${reward.type}`);
        
        return reward;
    }

    /**
     * Grant reward to player
     */
    grantReward(reward) {
        switch (reward.type) {
            case 'currency':
                this.grantCurrency(reward.amount);
                break;
            case 'item':
                this.grantItem(reward.itemId || reward.type);
                break;
            case 'boost':
                this.grantBoost(reward);
                break;
            case 'cosmetic':
                this.grantCosmetic(reward);
                break;
            default:
                console.warn('[BattlePass] Unknown reward type:', reward.type);
        }
        
        // Dispatch event
        this.dispatchEvent('battlepass:reward', {
            reward: reward,
            granted: true
        });
    }

    /**
     * Grant currency
     */
    grantCurrency(amount) {
        // Integrate with game's currency system
        if (window.CurrencyManager) {
            window.CurrencyManager.add(amount, 'battlepass');
        }
        console.log(`[BattlePass] Granted ${amount} currency`);
    }

    /**
     * Grant item
     */
    grantItem(itemId) {
        // Integrate with game's inventory system
        if (window.InventoryManager) {
            window.InventoryManager.addItem(itemId);
        }
        console.log(`[BattlePass] Granted item: ${itemId}`);
    }

    /**
     * Grant boost
     */
    grantBoost(boost) {
        // Activate boost
        this.activeBoosts = this.activeBoosts || [];
        this.activeBoosts.push({
            type: boost.boostType,
            value: boost.value,
            duration: boost.duration,
            expires: Date.now() + boost.duration
        });
        console.log(`[BattlePass] Activated boost: ${boost.boostType}`);
    }

    /**
     * Grant cosmetic
     */
    grantCosmetic(cosmetic) {
        // Unlock cosmetic item
        if (window.CosmeticsManager) {
            window.CosmeticsManager.unlock(cosmetic.cosmeticId || cosmetic.type);
        }
        console.log(`[BattlePass] Unlocked cosmetic: ${cosmetic.type}`);
    }

    /**
     * Generate challenges
     */
    async generateChallenges() {
        // Daily challenges
        this.challenges.daily = await this.generateDailyChallenges();
        
        // Weekly challenges
        this.challenges.weekly = await this.generateWeeklyChallenges();
        
        // Seasonal challenges
        this.challenges.seasonal = await this.generateSeasonalChallenges();
        
        console.log('[BattlePass] Generated challenges:', {
            daily: this.challenges.daily.length,
            weekly: this.challenges.weekly.length,
            seasonal: this.challenges.seasonal.length
        });
    }

    /**
     * Generate daily challenges
     */
    async generateDailyChallenges() {
        const templates = [
            { id: 'kill_enemies', text: 'Defeat {amount} enemies', xp: 100, amount: [20, 50, 100] },
            { id: 'complete_levels', text: 'Complete {amount} levels', xp: 150, amount: [3, 5, 10] },
            { id: 'collect_items', text: 'Find {amount} collectibles', xp: 80, amount: [10, 25, 50] },
            { id: 'deal_damage', text: 'Deal {amount} damage', xp: 120, amount: [500, 1000, 2500] },
            { id: 'survive_time', text: 'Survive for {amount} seconds', xp: 90, amount: [120, 300, 600] }
        ];
        
        const challenges = [];
        
        for (let i = 0; i < 3; i++) {
            const template = templates[Math.floor(Math.random() * templates.length)];
            const amount = template.amount[Math.floor(Math.random() * template.amount.length)];
            
            challenges.push({
                id: `daily_${Date.now()}_${i}`,
                type: 'daily',
                text: template.text.replace('{amount}', amount),
                xpReward: template.xp,
                goal: amount,
                progress: 0,
                completed: false,
                expires: this.getEndOfDay()
            });
        }
        
        return challenges;
    }

    /**
     * Generate weekly challenges
     */
    async generateWeeklyChallenges() {
        const templates = [
            { id: 'boss_kills', text: 'Defeat {amount} bosses', xp: 500, amount: [3, 5, 10] },
            { id: 'perfect_runs', text: 'Complete {amount} levels without dying', xp: 400, amount: [1, 3, 5] },
            { id: 'speedrun', text: 'Complete {amount} levels in under 2 minutes', xp: 350, amount: [2, 5, 10] },
            { id: 'headshots', text: 'Get {amount} headshot kills', xp: 300, amount: [10, 25, 50] }
        ];
        
        const challenges = [];
        
        for (let i = 0; i < 5; i++) {
            const template = templates[Math.floor(Math.random() * templates.length)];
            const amount = template.amount[Math.floor(Math.random() * template.amount.length)];
            
            challenges.push({
                id: `weekly_${Date.now()}_${i}`,
                type: 'weekly',
                text: template.text.replace('{amount}', amount),
                xpReward: template.xp,
                goal: amount,
                progress: 0,
                completed: false,
                expires: this.getEndOfWeek()
            });
        }
        
        return challenges;
    }

    /**
     * Generate seasonal challenges
     */
    async generateSeasonalChallenges() {
        return [
            {
                id: 'seasonal_max_tier',
                type: 'seasonal',
                text: 'Reach Max Tier (100)',
                xpReward: 5000,
                goal: 100,
                progress: this.playerProgress.currentTier,
                completed: this.playerProgress.currentTier >= 100,
                expires: this.currentSeason.endDate
            },
            {
                id: 'seasonal_all_challenges',
                type: 'seasonal',
                text: 'Complete 50 challenges',
                xpReward: 3000,
                goal: 50,
                progress: this.playerProgress.completedChallenges.length,
                completed: false,
                expires: this.currentSeason.endDate
            }
        ];
    }

    /**
     * Update challenge progress
     */
    updateChallengeProgress(challengeId, amount) {
        const allChallenges = [
            ...this.challenges.daily,
            ...this.challenges.weekly,
            ...this.challenges.seasonal
        ];
        
        const challenge = allChallenges.find(c => c.id === challengeId);
        if (!challenge || challenge.completed) return;
        
        challenge.progress += amount;
        
        if (challenge.progress >= challenge.goal) {
            challenge.progress = challenge.goal;
            challenge.completed = true;
            this.completeChallenge(challenge);
        }
    }

    /**
     * Complete challenge
     */
    completeChallenge(challenge) {
        this.playerProgress.completedChallenges.push({
            id: challenge.id,
            completedAt: new Date().toISOString()
        });
        
        this.addXP(challenge.xpReward, 'challenge');
        
        console.log(`[BattlePass] Challenge completed: ${challenge.text}`);
        
        this.dispatchEvent('battlepass:challenge_complete', {
            challenge: challenge,
            xpGained: challenge.xpReward
        });
    }

    /**
     * Check if player has active boost
     */
    hasActiveBoost() {
        if (!this.activeBoosts || this.activeBoosts.length === 0) return false;
        
        const now = Date.now();
        const activeBoost = this.activeBoosts.find(b => b.expires > now);
        
        return !!activeBoost;
    }

    /**
     * Check if first win of day
     */
    isFirstWinOfDay(source) {
        if (source !== 'game_completion') return false;
        
        const today = new Date().toDateString();
        const lastWin = this.playerProgress.lastGameCompletion;
        
        if (!lastWin) return true;
        
        const lastWinDate = new Date(lastWin).toDateString();
        return today !== lastWinDate;
    }

    /**
     * Get end of day timestamp
     */
    getEndOfDay() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.toISOString();
    }

    /**
     * Get end of week timestamp
     */
    getEndOfWeek() {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay()));
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek.toISOString();
    }

    /**
     * Save current season
     */
    async saveCurrentSeason() {
        localStorage.setItem('battlepass_current_season', JSON.stringify(this.currentSeason));
    }

    /**
     * Save player progress
     */
    async savePlayerProgress() {
        localStorage.setItem('battlepass_progress', JSON.stringify(this.playerProgress));
    }

    /**
     * Setup auto-save
     */
    setupAutoSave() {
        // Save every 30 seconds
        setInterval(() => {
            this.savePlayerProgress();
        }, 30000);
        
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.savePlayerProgress();
        });
    }

    /**
     * Dispatch custom event
     */
    dispatchEvent(name, data) {
        const event = new CustomEvent(name, { detail: data });
        window.dispatchEvent(event);
    }

    /**
     * Play tier up sound
     */
    playTierUpSound() {
        // Integrate with audio system
        if (window.AudioManager) {
            window.AudioManager.play('tier_up');
        }
    }

    /**
     * Upgrade to premium
     */
    upgradeToPremium() {
        this.playerProgress.premium = true;
        this.savePlayerProgress();
        
        console.log('[BattlePass] Upgraded to Premium!');
        
        this.dispatchEvent('battlepass:premium_upgrade', {
            tier: this.playerProgress.currentTier
        });
    }

    /**
     * Get battle pass status
     */
    getStatus() {
        return {
            season: this.currentSeason,
            progress: this.playerProgress,
            challenges: this.challenges,
            boosts: this.activeBoosts || []
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        this.savePlayerProgress();
        this.initialized = false;
    }
}

// Create global instance
const BattlePassInstance = new BattlePassSystem();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BattlePassSystem, BattlePassInstance };
}

// Auto-initialize
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await BattlePassInstance.init();
        } catch (error) {
            console.error('[BattlePass] Failed to initialize:', error);
        }
    });
}

console.log('[BattlePass] Core system loaded');
