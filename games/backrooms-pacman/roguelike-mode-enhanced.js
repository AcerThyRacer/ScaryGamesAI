/**
 * PHASE 3: ROGUELIKE MODE - INFINITE RUNS WITH META-PROGRESSION
 * Permadeath, unlockables, daily challenges, and ascension system
 */

var RoguelikeMode = (function() {
    'use strict';

    var config = {
        // Run configuration
        runConfig: {
            permadeath: true,
            infiniteScaling: true,
            randomModifiers: true,
            seedBased: false
        },
        
        // Meta-progression
        unlocks: {
            characters: [],
            abilities: [],
            items: [],
            biomes: ['yellow']
        },
        
        // Currency system
        currency: {
            essence: 0, // Earned from runs
            pellets: 0, // In-run currency
            shards: 0   // Premium currency
        },
        
        // Ascension tiers
        ascension: {
            level: 0,
            maxLevel: 20,
            bonuses: []
        }
    };

    var state = {
        currentRun: null,
        runHistory: [],
        dailyChallenge: null,
        activeModifiers: [],
        statistics: {
            totalRuns: 0,
            wins: 0,
            deaths: 0,
            highestAscension: 0,
            totalTimePlayed: 0
        }
    };

    /**
     * Initialize roguelike mode
     */
    function init() {
        loadProgress();
        generateDailyChallenge();
        console.log('[Roguelike] Initialized');
    }

    /**
     * Start a new run
     */
    function startRun(options) {
        if (state.currentRun) {
            console.warn('[Roguelike] Run already in progress');
            return null;
        }
        
        state.currentRun = {
            id: generateRunId(),
            startTime: Date.now(),
            difficulty: options.difficulty || 'standard',
            biome: options.biome || 'yellow',
            character: options.character || 'default',
            modifiers: generateRunModifiers(),
            stats: {
                pelletsCollected: 0,
                enemiesDefeated: 0,
                roomsExplored: 0,
                sanityUsed: 0,
                abilitiesUsed: 0
            },
            checkpoints: [],
            alive: true
        };
        
        // Apply ascension bonuses
        applyAscensionBonuses(state.currentRun);
        
        console.log('[Roguelike] Run started:', state.currentRun.id);
        return state.currentRun;
    }

    /**
     * End current run
     */
    function endRun(victory) {
        if (!state.currentRun) return;
        
        state.currentRun.endTime = Date.now();
        state.currentRun.alive = victory;
        state.currentRun.duration = state.currentRun.endTime - state.currentRun.startTime;
        
        // Calculate rewards
        var rewards = calculateRewards(state.currentRun, victory);
        
        // Update statistics
        updateStatistics(state.currentRun, victory);
        
        // Save progress
        if (victory) {
            onVictory(rewards);
        } else {
            onDeath(rewards);
        }
        
        // Add to history
        state.runHistory.push(state.currentRun);
        if (state.runHistory.length > 100) {
            state.runHistory.shift(); // Keep last 100 runs
        }
        
        // Clear current run
        state.currentRun = null;
        
        saveProgress();
        
        return rewards;
    }

    /**
     * Generate random modifiers for run
     */
    function generateRunModifiers() {
        var possibleModifiers = [
            { id: 'speed_up', name: 'Haste', effect: 'player_speed+15%', rarity: 'common' },
            { id: 'fragile', name: 'Fragile', effect: 'max_health-20%', rarity: 'common' },
            { id: 'greedy', name: 'Greedy', effect: 'pellet_drop+30%', rarity: 'common' },
            { id: 'darkness', name: 'Darkness', effect: 'visibility-25%', rarity: 'uncommon' },
            { id: 'swarm', name: 'Swarm', effect: 'enemy_count+2', rarity: 'uncommon' },
            { id: 'berserk', name: 'Berserk', effect: 'enemy_damage+25%', rarity: 'rare' },
            { id: 'enlightened', name: 'Enlightened', effect: 'sanity_regen+50%', rarity: 'rare' },
            { id: 'glass_cannon', name: 'Glass Cannon', effect: 'damage+50%,health-50%', rarity: 'epic' },
            { id: 'cursed', name: 'Cursed', effect: 'no_saves,permadeath', rarity: 'legendary' }
        ];
        
        var selected = [];
        var numModifiers = 1 + Math.floor(Math.random() * 3); // 1-3 modifiers
        
        for (var i = 0; i < numModifiers; i++) {
            var modifier = possibleModifiers[Math.floor(Math.random() * possibleModifiers.length)];
            if (!selected.find(m => m.id === modifier.id)) {
                selected.push(modifier);
            }
        }
        
        return selected;
    }

    /**
     * Calculate rewards based on run performance
     */
    function calculateRewards(run, victory) {
        var baseEssence = victory ? 100 : 20;
        
        // Performance bonuses
        var timeBonus = Math.max(0, 600 - Math.floor(run.duration / 1000)); // Faster = more
        var pelletBonus = Math.floor(run.stats.pelletsCollected * 0.5);
        var explorationBonus = Math.floor(run.stats.roomsExplored * 2);
        
        // Victory multiplier
        var victoryMultiplier = victory ? 2.0 : 1.0;
        
        var totalEssence = Math.floor(
            (baseEssence + timeBonus + pelletBonus + explorationBonus) * victoryMultiplier
        );
        
        // Bonus shards for first win of the day
        var bonusShards = 0;
        if (victory && !hasClaimedDailyWin()) {
            bonusShards = 10;
            markDailyWinClaimed();
        }
        
        return {
            essence: totalEssence,
            shards: bonusShards,
            xp: victory ? 50 : 10
        };
    }

    /**
     * Handle victory
     */
    function onVictory(rewards) {
        config.currency.essence += rewards.essence;
        config.currency.shards += rewards.shards;
        
        // Unlock new content
        checkUnlocks(rewards);
        
        console.log('[Roguelike] Victory! Rewards:', rewards);
    }

    /**
     * Handle death (permadeath)
     */
    function onDeath(rewards) {
        // Lose some essence on death (but not all)
        var lostEssence = Math.floor(config.currency.essence * 0.1);
        config.currency.essence -= lostEssence;
        
        // Keep rewards earned this run
        config.currency.essence += rewards.essence;
        
        console.log('[Roguelike] Death! Lost', lostEssence, 'essence');
    }

    /**
     * Check for new unlocks
     */
    function checkUnlocks(rewards) {
        var totalEssenceEarned = config.unlocks.totalEssenceEarned || 0;
        totalEssenceEarned += rewards.essence;
        config.unlocks.totalEssenceEarned = totalEssenceEarned;
        
        // Unlock thresholds
        if (totalEssenceEarned >= 500 && !config.unlocks.characters.includes('speedster')) {
            config.unlocks.characters.push('speedster');
            console.log('[Roguelike] Unlocked: Speedster character!');
        }
        
        if (totalEssenceEarned >= 1000 && !config.unlocks.abilities.includes('time_dilation')) {
            config.unlocks.abilities.push('time_dilation');
            console.log('[Roguelike] Unlocked: Time Dilation ability!');
        }
        
        if (totalEssenceEarned >= 2000 && !config.unlocks.biomes.includes('poolrooms')) {
            config.unlocks.biomes.push('poolrooms');
            console.log('[Roguelike] Unlocked: Poolrooms biome!');
        }
    }

    /**
     * Purchase unlock
     */
    function purchaseUnlock(type, id) {
        var cost = getUnlockCost(type, id);
        
        if (config.currency.essence >= cost) {
            config.currency.essence -= cost;
            
            if (type === 'character') {
                config.unlocks.characters.push(id);
            } else if (type === 'ability') {
                config.unlocks.abilities.push(id);
            } else if (type === 'biome') {
                config.unlocks.biomes.push(id);
            }
            
            saveProgress();
            return true;
        }
        
        return false;
    }

    /**
     * Get unlock cost
     */
    function getUnlockCost(type, id) {
        var baseCosts = {
            character: 500,
            ability: 750,
            biome: 1000
        };
        
        return baseCosts[type] || 500;
    }

    /**
     * Ascend to next tier
     */
    function ascend() {
        if (config.ascension.level >= config.ascension.maxLevel) {
            return false;
        }
        
        var ascensionCost = calculateAscensionCost();
        
        if (config.currency.essence >= ascensionCost) {
            config.currency.essence -= ascensionCost;
            config.ascension.level++;
            
            // Grant ascension bonus
            var bonus = getAscensionBonus(config.ascension.level);
            config.ascension.bonuses.push(bonus);
            
            console.log('[Roguelike] Ascended to level', config.ascension.level);
            saveProgress();
            return true;
        }
        
        return false;
    }

    /**
     * Calculate ascension cost
     */
    function calculateAscensionCost() {
        var baseCost = 5000;
        var multiplier = Math.pow(1.5, config.ascension.level);
        return Math.floor(baseCost * multiplier);
    }

    /**
     * Get ascension bonus
     */
    function getAscensionBonus(level) {
        var bonuses = [
            { type: 'starting_health', value: '+10%' },
            { type: 'essence_gain', value: '+5%' },
            { type: 'shop_discount', value: '-5%' },
            { type: 'extra_ability_slot', value: '+1' },
            { type: 'luck', value: '+10%' }
        ];
        
        return bonuses[level % bonuses.length];
    }

    /**
     * Apply ascension bonuses to run
     */
    function applyAscensionBonuses(run) {
        config.ascension.bonuses.forEach(function(bonus) {
            switch (bonus.type) {
                case 'starting_health':
                    run.startingHealthBonus = 0.1;
                    break;
                case 'essence_gain':
                    run.essenceBonus = 0.05;
                    break;
            }
        });
    }

    /**
     * Generate daily challenge
     */
    function generateDailyChallenge() {
        var today = new Date().toDateString();
        var seed = stringToSeed(today);
        
        // Deterministic random based on date
        var random = seededRandom(seed);
        
        state.dailyChallenge = {
            date: today,
            seed: seed,
            modifiers: [],
            goal: 'survive_10_minutes',
            bonusReward: 50
        };
        
        // Generate 3 random modifiers
        var possibleModifiers = ['darkness', 'swarm', 'berserk', 'speed_up', 'fragile'];
        for (var i = 0; i < 3; i++) {
            var idx = Math.floor(random() * possibleModifiers.length);
            state.dailyChallenge.modifiers.push(possibleModifiers[idx]);
            possibleModifiers.splice(idx, 1);
        }
    }

    /**
     * Convert string to numeric seed
     */
    function stringToSeed(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Seeded random number generator
     */
    function seededRandom(seed) {
        var m = 0x80000000;
        var a = 1103515245;
        var c = 12345;
        var state = seed ? seed : Math.floor(Math.random() * (m - 1));
        
        return function() {
            state = (a * state + c) % m;
            return state / (m - 1);
        };
    }

    /**
     * Check if daily win claimed
     */
    function hasClaimedDailyWin() {
        var lastClaim = localStorage.getItem('roguelike_daily_win_' + new Date().toDateString());
        return lastClaim !== null;
    }

    /**
     * Mark daily win as claimed
     */
    function markDailyWinClaimed() {
        localStorage.setItem('roguelike_daily_win_' + new Date().toDateString(), 'true');
    }

    /**
     * Save progress to localStorage
     */
    function saveProgress() {
        try {
            var data = {
                currency: config.currency,
                unlocks: config.unlocks,
                ascension: config.ascension,
                statistics: state.statistics,
                lastSave: Date.now()
            };
            localStorage.setItem('roguelike_progress', JSON.stringify(data));
        } catch (e) {
            console.error('[Roguelike] Failed to save:', e);
        }
    }

    /**
     * Load progress from localStorage
     */
    function loadProgress() {
        try {
            var saved = localStorage.getItem('roguelike_progress');
            if (saved) {
                var data = JSON.parse(saved);
                
                if (data.currency) Object.assign(config.currency, data.currency);
                if (data.unlocks) Object.assign(config.unlocks, data.unlocks);
                if (data.ascension) Object.assign(config.ascension, data.ascension);
                if (data.statistics) Object.assign(state.statistics, data.statistics);
                
                console.log('[Roguelike] Progress loaded');
            }
        } catch (e) {
            console.error('[Roguelike] Failed to load:', e);
        }
    }

    /**
     * Update statistics
     */
    function updateStatistics(run, victory) {
        state.statistics.totalRuns++;
        state.statistics.totalTimePlayed += run.duration;
        
        if (victory) {
            state.statistics.wins++;
        } else {
            state.statistics.deaths++;
        }
        
        if (config.ascension.level > state.statistics.highestAscension) {
            state.statistics.highestAscension = config.ascension.level;
        }
    }

    /**
     * Generate unique run ID
     */
    function generateRunId() {
        return 'run_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get current run
     */
    function getCurrentRun() {
        return state.currentRun;
    }

    /**
     * Get unlocks
     */
    function getUnlocks() {
        return config.unlocks;
    }

    /**
     * Get statistics
     */
    function getStatistics() {
        return state.statistics;
    }

    /**
     * Get daily challenge
     */
    function getDailyChallenge() {
        return state.dailyChallenge;
    }

    // Public API
    return {
        init: init,
        startRun: startRun,
        endRun: endRun,
        purchaseUnlock: purchaseUnlock,
        ascend: ascend,
        getCurrentRun: getCurrentRun,
        getUnlocks: getUnlocks,
        getStatistics: getStatistics,
        getDailyChallenge: getDailyChallenge,
        config: config,
        state: state
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.RoguelikeMode = RoguelikeMode;
}

console.log('[Roguelike] Module loaded - Meta-progression ready');
