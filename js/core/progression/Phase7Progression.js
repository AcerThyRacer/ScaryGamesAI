/**
 * ============================================
 * SGAI PHASE 7: PROGRESSION & META-GAME SYSTEMS
 * ============================================
 * Complete player progression framework for all horror games
 * 
 * Features:
 * - XP & Leveling System
 * - Prestige System
 * - Unlockable Content
 * - Achievement System
 * - Daily/Weekly Challenges
 * - Player Statistics
 * - Leaderboards Integration
 * - Meta-Currency (Horror Points)
 * 
 * Usage:
 *   const progression = new ProgressionManager();
 *   await progression.init();
 *   progression.addXP('blood-tetris', 500);
 */

(function(global) {
    'use strict';

    // ============================================
    // PROGRESSION MANAGER
    // ============================================

    class ProgressionManager {
        constructor() {
            this.player = {
                level: 1,
                xp: 0,
                xpToNextLevel: 1000,
                prestige: 0,
                horrorPoints: 0,
                totalXP: 0,
                totalPlayTime: 0,
                gamesPlayed: new Set(),
                joinDate: Date.now()
            };

            this.unlocks = {
                characters: new Set(),
                modes: new Set(),
                cosmetics: new Set(),
                features: new Set()
            };

            this.gameProgress = new Map();
            this.listeners = new Map();
            this.initialized = false;
            this.saveKey = 'sgai_progression_v1';

            // XP configuration
            this.xpConfig = {
                baseXP: 1000,
                xpScale: 1.15,
                maxLevel: 100,
                xpSources: {
                    gameComplete: 1000,
                    highScore: 500,
                    achievement: 250,
                    challenge: 300,
                    dailyBonus: 100
                }
            };

            // Prestige rewards
            this.prestigeRewards = {
                1: { horrorPoints: 500, unlock: 'prestige_badge_1' },
                5: { horrorPoints: 1000, unlock: 'prestige_badge_5' },
                10: { horrorPoints: 2500, unlock: 'prestige_badge_10' },
                25: { horrorPoints: 10000, unlock: 'prestige_master' },
                50: { horrorPoints: 25000, unlock: 'prestige_legend' },
                100: { horrorPoints: 100000, unlock: 'prestige_god' }
            };
        }

        /**
         * Initialize progression system
         */
        async init() {
            console.log('[ProgressionManager] Initializing...');
            
            // Load saved data
            await this.load();
            
            // Setup auto-save
            this._setupAutoSave();
            
            this.initialized = true;
            console.log('[ProgressionManager] Ready - Level', this.player.level, 'Prestige', this.player.prestige);
            return true;
        }

        /**
         * Add XP to player
         */
        addXP(gameId, amount, source = 'gameplay') {
            if (!this.initialized) return;

            const xpGain = this._calculateXPGain(amount, source);
            this.player.xp += xpGain;
            this.player.totalXP += xpGain;
            
            // Track game
            this.player.gamesPlayed.add(gameId);

            // Check for level up
            while (this.player.xp >= this.player.xpToNextLevel) {
                this._levelUp();
            }

            // Update game-specific progress
            this._updateGameProgress(gameId, { xp: xpGain });

            // Notify listeners
            this._notify('xpGain', { gameId, amount: xpGain, source, totalXP: this.player.xp });

            // Auto-save
            this._scheduleSave();
        }

        /**
         * Calculate XP gain with bonuses
         */
        _calculateXPGain(baseAmount, source) {
            let multiplier = 1.0;

            // Prestige bonus (5% per prestige level)
            multiplier += this.player.prestige * 0.05;

            // Source bonuses
            switch (source) {
                case 'firstWin':
                    multiplier *= 2.0;
                    break;
                case 'dailyChallenge':
                    multiplier *= 1.5;
                    break;
                case 'weeklyChallenge':
                    multiplier *= 2.0;
                    break;
                case 'perfectRun':
                    multiplier *= 1.5;
                    break;
            }

            // Combo bonus for consecutive plays
            const consecutiveBonus = Math.min(0.5, (this.player.consecutiveDays || 0) * 0.05);
            multiplier += consecutiveBonus;

            return Math.floor(baseAmount * multiplier);
        }

        /**
         * Level up player
         */
        _levelUp() {
            this.player.xp -= this.player.xpToNextLevel;
            this.player.level++;
            this.player.xpToNextLevel = Math.floor(
                this.xpConfig.baseXP * Math.pow(this.xpConfig.xpScale, this.player.level - 1)
            );

            // Grant level rewards
            const rewards = this._getLevelRewards(this.player.level);
            rewards.forEach(reward => {
                this._grantReward(reward);
            });

            console.log('[ProgressionManager] Level Up!', this.player.level);
            this._notify('levelUp', { level: this.player.level, rewards });
        }

        /**
         * Get rewards for level
         */
        _getLevelRewards(level) {
            const rewards = [];

            // Horror Points every 5 levels
            if (level % 5 === 0) {
                rewards.push({ type: 'horrorPoints', amount: 100 * (level / 5) });
            }

            // Unlock every 10 levels
            if (level % 10 === 0) {
                const unlockId = `level_${level}_unlock`;
                rewards.push({ type: 'unlock', id: unlockId, category: 'feature' });
            }

            // Bonus XP at milestone levels
            if ([25, 50, 75, 100].includes(level)) {
                rewards.push({ type: 'bonusXP', amount: 5000 });
            }

            return rewards;
        }

        /**
         * Grant reward to player
         */
        _grantReward(reward) {
            switch (reward.type) {
                case 'horrorPoints':
                    this.player.horrorPoints += reward.amount;
                    break;
                case 'unlock':
                    this.unlock(reward.category, reward.id);
                    break;
                case 'bonusXP':
                    this.addXP('bonus', reward.amount, 'milestone');
                    break;
                case 'cosmetic':
                    this.unlock('cosmetics', reward.id);
                    break;
            }
        }

        /**
         * Prestige reset
         */
        prestige() {
            if (this.player.level < 50) {
                console.warn('[ProgressionManager] Must be level 50+ to prestige');
                return false;
            }

            const prestigeLevel = this.player.prestige + 1;
            const reward = this.prestigeRewards[prestigeLevel] || { horrorPoints: 500 };

            // Store prestige data
            const prestigeData = {
                level: this.player.level,
                date: Date.now(),
                gamesPlayed: Array.from(this.player.gamesPlayed)
            };

            // Reset player
            this.player.level = 1;
            this.player.xp = 0;
            this.player.xpToNextLevel = this.xpConfig.baseXP;
            this.player.prestige = prestigeLevel;
            this.player.horrorPoints += reward.horrorPoints;

            // Grant prestige reward
            if (reward.unlock) {
                this.unlock('features', reward.unlock);
            }

            console.log('[ProgressionManager] Prestige!', prestigeLevel, 'HP:', reward.horrorPoints);
            this._notify('prestige', { level: prestigeLevel, reward });

            this.save();
            return true;
        }

        /**
         * Unlock content
         */
        unlock(category, id) {
            const key = `${category}:${id}`;
            
            if (this.unlocks[category]) {
                this.unlocks[category].add(id);
                this._notify('unlock', { category, id, key });
                this._scheduleSave();
                return true;
            }
            
            return false;
        }

        /**
         * Check if content is unlocked
         */
        isUnlocked(category, id) {
            return this.unlocks[category]?.has(id) || false;
        }

        /**
         * Get all unlocks
         */
        getUnlocks() {
            return {
                characters: Array.from(this.unlocks.characters),
                modes: Array.from(this.unlocks.modes),
                cosmetics: Array.from(this.unlocks.cosmetics),
                features: Array.from(this.unlocks.features)
            };
        }

        /**
         * Update game-specific progress
         */
        _updateGameProgress(gameId, data) {
            if (!this.gameProgress.has(gameId)) {
                this.gameProgress.set(gameId, {
                    totalXP: 0,
                    gamesPlayed: 0,
                    highScore: 0,
                    achievements: new Set(),
                    challenges: new Set(),
                    stats: {},
                    firstPlayed: Date.now(),
                    lastPlayed: Date.now()
                });
            }

            const progress = this.gameProgress.get(gameId);
            progress.totalXP += data.xp || 0;
            progress.gamesPlayed++;
            progress.lastPlayed = Date.now();

            if (data.highScore !== undefined) {
                progress.highScore = Math.max(progress.highScore, data.highScore);
            }

            if (data.achievement) {
                progress.achievements.add(data.achievement);
            }

            if (data.challenge) {
                progress.challenges.add(data.challenge);
            }

            if (data.stats) {
                Object.assign(progress.stats, data.stats);
            }
        }

        /**
         * Get game progress
         */
        getGameProgress(gameId) {
            const progress = this.gameProgress.get(gameId);
            if (!progress) return null;

            return {
                ...progress,
                achievements: Array.from(progress.achievements),
                challenges: Array.from(progress.challenges)
            };
        }

        /**
         * Get player stats
         */
        getPlayerStats() {
            return {
                ...this.player,
                gamesPlayed: Array.from(this.player.gamesPlayed),
                unlocks: this.getUnlocks(),
                gameCount: this.gameProgress.size
            };
        }

        /**
         * Get progress percentage
         */
        getProgressPercentage() {
            const maxLevel = this.xpConfig.maxLevel;
            const levelProgress = this.player.level / maxLevel;
            const prestigeProgress = Math.min(1, this.player.prestige / 100);
            
            return Math.floor((levelProgress * 0.7 + prestigeProgress * 0.3) * 100);
        }

        /**
         * Spend Horror Points
         */
        spendHorrorPoints(amount, itemId) {
            if (this.player.horrorPoints >= amount) {
                this.player.horrorPoints -= amount;
                this._notify('horrorPointsSpent', { amount, itemId, remaining: this.player.horrorPoints });
                this._scheduleSave();
                return true;
            }
            return false;
        }

        /**
         * Event listeners
         */
        on(event, callback) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            this.listeners.get(event).push(callback);
        }

        off(event, callback) {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index !== -1) {
                    callbacks.splice(index, 1);
                }
            }
        }

        _notify(event, data) {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                callbacks.forEach(cb => cb(data));
            }
        }

        /**
         * Save/Load
         */
        async save() {
            const data = {
                player: { ...this.player, gamesPlayed: Array.from(this.player.gamesPlayed) },
                unlocks: {
                    characters: Array.from(this.unlocks.characters),
                    modes: Array.from(this.unlocks.modes),
                    cosmetics: Array.from(this.unlocks.cosmetics),
                    features: Array.from(this.unlocks.features)
                },
                gameProgress: Object.fromEntries(
                    Array.from(this.gameProgress.entries()).map(([id, progress]) => [
                        id,
                        {
                            ...progress,
                            achievements: Array.from(progress.achievements),
                            challenges: Array.from(progress.challenges)
                        }
                    ])
                ),
                savedAt: Date.now()
            };

            try {
                localStorage.setItem(this.saveKey, JSON.stringify(data));
                console.log('[ProgressionManager] Saved');
            } catch (error) {
                console.error('[ProgressionManager] Save failed:', error);
            }
        }

        async load() {
            try {
                const data = localStorage.getItem(this.saveKey);
                if (!data) return false;

                const parsed = JSON.parse(data);

                // Load player data
                Object.assign(this.player, parsed.player);
                this.player.gamesPlayed = new Set(parsed.player?.gamesPlayed || []);

                // Load unlocks
                if (parsed.unlocks) {
                    this.unlocks.characters = new Set(parsed.unlocks.characters || []);
                    this.unlocks.modes = new Set(parsed.unlocks.modes || []);
                    this.unlocks.cosmetics = new Set(parsed.unlocks.cosmetics || []);
                    this.unlocks.features = new Set(parsed.unlocks.features || []);
                }

                // Load game progress
                this.gameProgress = new Map(
                    Object.entries(parsed.gameProgress || {}).map(([id, progress]) => [
                        id,
                        {
                            ...progress,
                            achievements: new Set(progress.achievements || []),
                            challenges: new Set(progress.challenges || [])
                        }
                    ])
                );

                console.log('[ProgressionManager] Loaded');
                return true;
            } catch (error) {
                console.error('[ProgressionManager] Load failed:', error);
                return false;
            }
        }

        /**
         * Auto-save
         */
        _saveTimeout: null,
        
        _setupAutoSave() {
            // Save on visibility change
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.save();
                }
            });

            // Save on beforeunload
            window.addEventListener('beforeunload', () => {
                this.save();
            });
        },

        _scheduleSave() {
            if (this._saveTimeout) {
                clearTimeout(this._saveTimeout);
            }
            this._saveTimeout = setTimeout(() => this.save(), 5000);
        },

        /**
         * Reset progress (for testing)
         */
        reset(all = false) {
            if (all) {
                this.player = {
                    level: 1,
                    xp: 0,
                    xpToNextLevel: 1000,
                    prestige: 0,
                    horrorPoints: 0,
                    totalXP: 0,
                    totalPlayTime: 0,
                    gamesPlayed: new Set(),
                    joinDate: Date.now()
                };
                this.unlocks = {
                    characters: new Set(),
                    modes: new Set(),
                    cosmetics: new Set(),
                    features: new Set()
                };
                this.gameProgress = new Map();
            }
            this.save();
        }
    }

    // ============================================
    // ACHIEVEMENT SYSTEM
    // ============================================

    class AchievementSystem {
        constructor() {
            this.achievements = new Map();
            this.playerAchievements = new Set();
            this.achievementProgress = new Map();
            this.listeners = new Map();
            this.initialized = false;
            this.saveKey = 'sgai_achievements_v1';

            // Achievement definitions per game
            this.gameAchievements = {
                'blood-tetris': this._getBloodTetrisAchievements(),
                'ritual-circle': this._getRitualCircleAchievements(),
                'zombie-horde': this._getZombieHordeAchievements(),
                'seance': this._getSeanceAchievements(),
                'crypt-tanks': this._getCryptTanksAchievements(),
                'yeti-run': this._getYetiRunAchievements(),
                'nightmare-run': this._getNightmareRunAchievements(),
                'cursed-arcade': this._getCursedArcadeAchievements()
            };
        }

        /**
         * Initialize achievement system
         */
        async init() {
            console.log('[AchievementSystem] Initializing...');
            await this.load();
            this.initialized = true;
            return true;
        }

        /**
         * Get Blood Tetris achievements
         */
        _getBloodTetrisAchievements() {
            return [
                { id: 'bt_first_lines', name: 'First Blood', description: 'Clear your first line', icon: '🩸', 
                  condition: (stats) => stats.lines >= 1, xp: 50, rarity: 'common' },
                { id: 'bt_tetris', name: 'TETRIS!', description: 'Clear 4 lines at once', icon: '💀',
                  condition: (stats) => stats.tetrises >= 1, xp: 100, rarity: 'uncommon' },
                { id: 'bt_combo_5', name: 'Combo Master', description: 'Get a 5x combo', icon: '🔥',
                  condition: (stats) => stats.maxCombo >= 5, xp: 150, rarity: 'rare' },
                { id: 'bt_score_10k', name: 'High Scorer', description: 'Score 10,000 points', icon: '⭐',
                  condition: (stats) => stats.highScore >= 10000, xp: 200, rarity: 'rare' },
                { id: 'bt_score_50k', name: 'Tetris Legend', description: 'Score 50,000 points', icon: '👑',
                  condition: (stats) => stats.highScore >= 50000, xp: 500, rarity: 'epic' },
                { id: 'bt_perfect', name: 'Perfect Game', description: 'Complete a game without cursing', icon: '✨',
                  condition: (stats) => stats.perfectGames >= 1, xp: 300, rarity: 'epic' },
                { id: 'bt_lines_1000', name: 'Line Master', description: 'Clear 1,000 lines total', icon: '📊',
                  condition: (stats) => stats.totalLines >= 1000, xp: 400, rarity: 'legendary' },
                { id: 'bt_time_1h', name: 'Dedicated Player', description: 'Play for 1 hour total', icon: '⏱️',
                  condition: (stats) => stats.totalTime >= 3600, xp: 250, rarity: 'rare' }
            ];
        }

        /**
         * Get Ritual Circle achievements
         */
        _getRitualCircleAchievements() {
            return [
                { id: 'rc_first_wave', name: 'First Ritual', description: 'Complete wave 1', icon: '🔮',
                  condition: (stats) => stats.wavesCleared >= 1, xp: 50, rarity: 'common' },
                { id: 'rc_wave_10', name: 'Ritual Master', description: 'Reach wave 10', icon: '🌙',
                  condition: (stats) => stats.maxWave >= 10, xp: 150, rarity: 'rare' },
                { id: 'rc_wave_50', name: 'Circle Guardian', description: 'Reach wave 50', icon: '🛡️',
                  condition: (stats) => stats.maxWave >= 50, xp: 400, rarity: 'epic' },
                { id: 'rc_kills_100', name: 'Spirit Banisher', description: 'Banish 100 enemies', icon: '⚔️',
                  condition: (stats) => stats.totalKills >= 100, xp: 100, rarity: 'uncommon' },
                { id: 'rc_kills_1000', name: 'Eternal Guardian', description: 'Banish 1,000 enemies', icon: '💀',
                  condition: (stats) => stats.totalKills >= 1000, xp: 500, rarity: 'legendary' },
                { id: 'rc_traps_50', name: 'Trap Master', description: 'Place 50 traps', icon: '🕸️',
                  condition: (stats) => stats.trapsPlaced >= 50, xp: 150, rarity: 'rare' },
                { id: 'rc_perfect_wave', name: 'Flawless Ritual', description: 'Complete a wave without damage', icon: '✨',
                  condition: (stats) => stats.perfectWaves >= 1, xp: 300, rarity: 'epic' },
                { id: 'rc_all_traps', name: 'Arsenal Complete', description: 'Unlock all trap types', icon: '📚',
                  condition: (stats) => stats.trapsUnlocked >= 20, xp: 400, rarity: 'legendary' }
            ];
        }

        /**
         * Get Zombie Horde achievements
         */
        _getZombieHordeAchievements() {
            return [
                { id: 'zh_first_wave', name: 'Survivor', description: 'Survive wave 1', icon: '🧟',
                  condition: (stats) => stats.maxWave >= 1, xp: 50, rarity: 'common' },
                { id: 'zh_wave_10', name: 'Horde Slayer', description: 'Reach wave 10', icon: '🔫',
                  condition: (stats) => stats.maxWave >= 10, xp: 150, rarity: 'rare' },
                { id: 'zh_wave_25', name: 'Apocalypse', description: 'Reach wave 25', icon: '☢️',
                  condition: (stats) => stats.maxWave >= 25, xp: 400, rarity: 'epic' },
                { id: 'zh_kills_100', name: 'Zombie Hunter', description: 'Kill 100 zombies', icon: '🎯',
                  condition: (stats) => stats.totalKills >= 100, xp: 100, rarity: 'uncommon' },
                { id: 'zh_kills_1000', name: 'Undead Bane', description: 'Kill 1,000 zombies', icon: '💀',
                  condition: (stats) => stats.totalKills >= 1000, xp: 500, rarity: 'legendary' },
                { id: 'zh_boss_1', name: 'Boss Slayer', description: 'Defeat your first boss', icon: '👹',
                  condition: (stats) => stats.bossesDefeated >= 1, xp: 200, rarity: 'rare' },
                { id: 'zh_turrets_20', name: 'Fortress Builder', description: 'Place 20 turrets', icon: '🏰',
                  condition: (stats) => stats.turretsPlaced >= 20, xp: 150, rarity: 'rare' },
                { id: 'zh_gold_1000', name: 'Scavenger', description: 'Collect 1,000 gold', icon: '💰',
                  condition: (stats) => stats.totalGold >= 1000, xp: 100, rarity: 'uncommon' }
            ];
        }

        /**
         * Get Séance achievements
         */
        _getSeanceAchievements() {
            return [
                { id: 'se_first_evidence', name: 'Paranormal Investigator', description: 'Find your first evidence', icon: '📷',
                  condition: (stats) => stats.evidenceFound >= 1, xp: 50, rarity: 'common' },
                { id: 'se_evidence_10', name: 'Ghost Hunter', description: 'Find 10 pieces of evidence', icon: '👻',
                  condition: (stats) => stats.evidenceFound >= 10, xp: 150, rarity: 'rare' },
                { id: 'se_sanity_50', name: 'Sane Mind', description: 'Complete a session with 50+ sanity', icon: '🧠',
                  condition: (stats) => stats.maxSanity >= 50, xp: 100, rarity: 'uncommon' },
                { id: 'se_haunting_survive', name: 'Haunting Survivor', description: 'Survive a haunting', icon: '💀',
                  condition: (stats) => stats.hauntingsSurvived >= 1, xp: 200, rarity: 'rare' },
                { id: 'se_all_spirits', name: 'Spirit Communicator', description: 'Encounter all spirit types', icon: '🔮',
                  condition: (stats) => stats.spiritsEncountered >= 10, xp: 400, rarity: 'epic' },
                { id: 'se_perfect_session', name: 'Perfect Séance', description: 'Complete a perfect session', icon: '✨',
                  condition: (stats) => stats.perfectSessions >= 1, xp: 500, rarity: 'legendary' }
            ];
        }

        /**
         * Get Crypt Tanks achievements
         */
        _getCryptTanksAchievements() {
            return [
                { id: 'ct_first_kill', name: 'First Blood', description: 'Destroy your first enemy', icon: '💥',
                  condition: (stats) => stats.kills >= 1, xp: 50, rarity: 'common' },
                { id: 'ct_kills_100', name: 'Tank Commander', description: 'Destroy 100 enemies', icon: '🎖️',
                  condition: (stats) => stats.totalKills >= 100, xp: 200, rarity: 'rare' },
                { id: 'ct_level_10', name: 'Crypt Explorer', description: 'Reach level 10', icon: '🗺️',
                  condition: (stats) => stats.maxLevel >= 10, xp: 150, rarity: 'rare' },
                { id: 'ct_boss_1', name: 'Boss Destroyer', description: 'Defeat a boss tank', icon: '👹',
                  condition: (stats) => stats.bossesDefeated >= 1, xp: 300, rarity: 'epic' },
                { id: 'ct_perfect_level', name: 'Flawless Victory', description: 'Complete a level without damage', icon: '✨',
                  condition: (stats) => stats.perfectLevels >= 1, xp: 400, rarity: 'epic' }
            ];
        }

        /**
         * Get Yeti Run achievements
         */
        _getYetiRunAchievements() {
            return [
                { id: 'yr_first_run', name: 'First Steps', description: 'Complete your first run', icon: '🦶',
                  condition: (stats) => stats.runsCompleted >= 1, xp: 50, rarity: 'common' },
                { id: 'yr_distance_1k', name: 'Marathon Runner', description: 'Run 1,000 meters', icon: '🏃',
                  condition: (stats) => stats.maxDistance >= 1000, xp: 100, rarity: 'uncommon' },
                { id: 'yr_distance_5k', name: 'Ultra Runner', description: 'Run 5,000 meters', icon: '🏅',
                  condition: (stats) => stats.maxDistance >= 5000, xp: 300, rarity: 'epic' },
                { id: 'yr_obstacles_100', name: 'Obstacle Master', description: 'Pass 100 obstacles', icon: '🚧',
                  condition: (stats) => stats.obstaclesPassed >= 100, xp: 150, rarity: 'rare' },
                { id: 'yr_perfect_run', name: 'Perfect Run', description: 'Complete a run without hitting anything', icon: '✨',
                  condition: (stats) => stats.perfectRuns >= 1, xp: 500, rarity: 'legendary' }
            ];
        }

        /**
         * Get Nightmare Run achievements
         */
        _getNightmareRunAchievements() {
            return [
                { id: 'nr_first_run', name: 'Nightmare Begins', description: 'Complete your first run', icon: '😱',
                  condition: (stats) => stats.runsCompleted >= 1, xp: 50, rarity: 'common' },
                { id: 'nr_distance_1k', name: 'Fear Runner', description: 'Run 1,000 meters', icon: '🏃',
                  condition: (stats) => stats.maxDistance >= 1000, xp: 100, rarity: 'uncommon' },
                { id: 'nr_kills_50', name: 'Nightmare Slayer', description: 'Defeat 50 enemies', icon: '⚔️',
                  condition: (stats) => stats.enemiesDefeated >= 50, xp: 150, rarity: 'rare' },
                { id: 'nr_boss_1', name: 'Boss Nightmare', description: 'Defeat a boss', icon: '👹',
                  condition: (stats) => stats.bossesDefeated >= 1, xp: 300, rarity: 'epic' },
                { id: 'nr_perfect_run', name: 'Fearless', description: 'Complete a run without taking damage', icon: '✨',
                  condition: (stats) => stats.perfectRuns >= 1, xp: 500, rarity: 'legendary' }
            ];
        }

        /**
         * Get Cursed Arcade achievements
         */
        _getCursedArcadeAchievements() {
            return [
                { id: 'ca_first_game', name: 'Arcade Newbie', description: 'Play your first game', icon: '🕹️',
                  condition: (stats) => stats.gamesPlayed >= 1, xp: 50, rarity: 'common' },
                { id: 'ca_score_10k', name: 'High Scorer', description: 'Score 10,000 points', icon: '⭐',
                  condition: (stats) => stats.highScore >= 10000, xp: 150, rarity: 'rare' },
                { id: 'ca_curse_survive', name: 'Cursed Survivor', description: 'Survive a curse', icon: '💀',
                  condition: (stats) => stats.cursesSurvived >= 1, xp: 200, rarity: 'rare' },
                { id: 'ca_games_10', name: 'Arcade Regular', description: 'Play 10 different games', icon: '🎮',
                  condition: (stats) => stats.uniqueGames >= 10, xp: 300, rarity: 'epic' },
                { id: 'ca_perfect_game', name: 'Perfect Player', description: 'Complete a perfect game', icon: '✨',
                  condition: (stats) => stats.perfectGames >= 1, xp: 500, rarity: 'legendary' }
            ];
        }

        /**
         * Check achievement progress
         */
        checkAchievements(gameId, stats) {
            const achievements = this.gameAchievements[gameId];
            if (!achievements) return [];

            const unlocked = [];

            achievements.forEach(achievement => {
                if (!this.playerAchievements.has(achievement.id)) {
                    try {
                        if (achievement.condition(stats)) {
                            this._unlockAchievement(achievement, gameId);
                            unlocked.push(achievement);
                        }
                    } catch (error) {
                        console.error('[AchievementSystem] Error checking achievement:', achievement.id, error);
                    }
                }
            });

            return unlocked;
        }

        /**
         * Unlock achievement
         */
        _unlockAchievement(achievement, gameId) {
            this.playerAchievements.add(achievement.id);
            
            console.log(`[AchievementSystem] Unlocked: ${achievement.name} - ${achievement.description}`);
            
            this._notify('achievementUnlocked', {
                ...achievement,
                gameId,
                xp: achievement.xp,
                rarity: achievement.rarity
            });

            this._scheduleSave();
        }

        /**
         * Get achievements for game
         */
        getAchievements(gameId) {
            return this.gameAchievements[gameId] || [];
        }

        /**
         * Get player achievements
         */
        getPlayerAchievements(gameId = null) {
            if (gameId) {
                const achievements = this.gameAchievements[gameId];
                return achievements.filter(a => this.playerAchievements.has(a.id));
            }
            return Array.from(this.playerAchievements);
        }

        /**
         * Get achievement progress
         */
        getAchievementProgress(gameId) {
            const achievements = this.gameAchievements[gameId] || [];
            const unlocked = achievements.filter(a => this.playerAchievements.has(a.id)).length;
            return {
                unlocked,
                total: achievements.length,
                percentage: Math.floor((unlocked / achievements.length) * 100)
            };
        }

        /**
         * Get completion percentage across all games
         */
        getTotalCompletion() {
            let total = 0;
            let unlocked = 0;

            Object.values(this.gameAchievements).forEach(achievements => {
                total += achievements.length;
                unlocked += achievements.filter(a => this.playerAchievements.has(a.id)).length;
            });

            return {
                unlocked,
                total,
                percentage: Math.floor((unlocked / total) * 100)
            };
        }

        /**
         * Event listeners
         */
        on(event, callback) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            this.listeners.get(event).push(callback);
        }

        _notify(event, data) {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                callbacks.forEach(cb => cb(data));
            }
        }

        /**
         * Save/Load
         */
        async save() {
            const data = {
                achievements: Array.from(this.playerAchievements),
                progress: Object.fromEntries(this.achievementProgress),
                savedAt: Date.now()
            };

            try {
                localStorage.setItem(this.saveKey, JSON.stringify(data));
            } catch (error) {
                console.error('[AchievementSystem] Save failed:', error);
            }
        }

        async load() {
            try {
                const data = localStorage.getItem(this.saveKey);
                if (!data) return false;

                const parsed = JSON.parse(data);
                this.playerAchievements = new Set(parsed.achievements || []);
                this.achievementProgress = new Map(Object.entries(parsed.progress || {}));

                return true;
            } catch (error) {
                console.error('[AchievementSystem] Load failed:', error);
                return false;
            }
        }

        _saveTimeout: null,

        _scheduleSave() {
            if (this._saveTimeout) {
                clearTimeout(this._saveTimeout);
            }
            this._saveTimeout = setTimeout(() => this.save(), 3000);
        }
    }

    // ============================================
    // CHALLENGE SYSTEM
    // ============================================

    class ChallengeSystem {
        constructor() {
            this.dailyChallenge = null;
            this.weeklyChallenge = null;
            this.completedChallenges = new Set();
            this.challengeProgress = new Map();
            this.listeners = new Map();
            this.initialized = false;
            this.saveKey = 'sgai_challenges_v1';

            // Challenge pools
            this.challengePools = {
                daily: this._getDailyChallenges(),
                weekly: this._getWeeklyChallenges()
            };
        }

        /**
         * Initialize challenge system
         */
        async init() {
            console.log('[ChallengeSystem] Initializing...');
            await this.load();
            this._generateChallenges();
            this.initialized = true;
            return true;
        }

        /**
         * Get daily challenge pool
         */
        _getDailyChallenges() {
            return [
                // Blood Tetris
                { id: 'bt_daily_lines', name: 'Line Clearer', description: 'Clear 50 lines in Blood Tetris', 
                  gameId: 'blood-tetris', type: 'lines', target: 50, xp: 100, horrorPoints: 25 },
                { id: 'bt_daily_combo', name: 'Combo King', description: 'Get a 3x combo in Blood Tetris',
                  gameId: 'blood-tetris', type: 'combo', target: 3, xp: 100, horrorPoints: 25 },
                { id: 'bt_daily_score', name: 'Score Attack', description: 'Score 5,000 points in Blood Tetris',
                  gameId: 'blood-tetris', type: 'score', target: 5000, xp: 100, horrorPoints: 25 },
                
                // Zombie Horde
                { id: 'zh_daily_kills', name: 'Zombie Slayer', description: 'Kill 50 zombies in Zombie Horde',
                  gameId: 'zombie-horde', type: 'kills', target: 50, xp: 100, horrorPoints: 25 },
                { id: 'zh_daily_wave', name: 'Wave Survivor', description: 'Reach wave 5 in Zombie Horde',
                  gameId: 'zombie-horde', type: 'wave', target: 5, xp: 100, horrorPoints: 25 },
                { id: 'zh_daily_turrets', name: 'Fortress', description: 'Place 10 turrets in Zombie Horde',
                  gameId: 'zombie-horde', type: 'turrets', target: 10, xp: 100, horrorPoints: 25 },

                // Ritual Circle
                { id: 'rc_daily_kills', name: 'Spirit Banisher', description: 'Banish 30 enemies in Ritual Circle',
                  gameId: 'ritual-circle', type: 'kills', target: 30, xp: 100, horrorPoints: 25 },
                { id: 'rc_daily_wave', name: 'Ritual Master', description: 'Reach wave 8 in Ritual Circle',
                  gameId: 'ritual-circle', type: 'wave', target: 8, xp: 100, horrorPoints: 25 },

                // Runner games
                { id: 'runner_daily_distance', name: 'Marathon', description: 'Run 500m in any runner game',
                  gameId: 'yeti-run', type: 'distance', target: 500, xp: 100, horrorPoints: 25 },
                { id: 'runner_daily_obstacles', name: 'Agile Runner', description: 'Pass 20 obstacles',
                  gameId: 'yeti-run', type: 'obstacles', target: 20, xp: 100, horrorPoints: 25 }
            ];
        }

        /**
         * Get weekly challenge pool
         */
        _getWeeklyChallenges() {
            return [
                { id: 'bt_weekly_master', name: 'Tetris Master', description: 'Score 25,000 points in Blood Tetris',
                  gameId: 'blood-tetris', type: 'score', target: 25000, xp: 500, horrorPoints: 100 },
                { id: 'zh_weekly_survivor', name: 'Apocalypse Survivor', description: 'Reach wave 15 in Zombie Horde',
                  gameId: 'zombie-horde', type: 'wave', target: 15, xp: 500, horrorPoints: 100 },
                { id: 'rc_weekly_guardian', name: 'Circle Guardian', description: 'Reach wave 20 in Ritual Circle',
                  gameId: 'ritual-circle', type: 'wave', target: 20, xp: 500, horrorPoints: 100 },
                { id: 'weekly_diverse', name: 'Diverse Player', description: 'Play 5 different games',
                  gameId: 'all', type: 'gamesPlayed', target: 5, xp: 500, horrorPoints: 100 },
                { id: 'weekly_total_kills', name: 'Mass Destroyer', description: 'Get 500 total kills across all games',
                  gameId: 'all', type: 'totalKills', target: 500, xp: 500, horrorPoints: 100 }
            ];
        }

        /**
         * Generate daily and weekly challenges
         */
        _generateChallenges() {
            const now = Date.now();
            const daySeed = Math.floor(now / (1000 * 60 * 60 * 24));
            const weekSeed = Math.floor(now / (1000 * 60 * 60 * 24 * 7));

            // Generate daily challenge
            if (!this.dailyChallenge || this._needsNewDaily()) {
                const dailyPool = this.challengePools.daily;
                const index = this._seededRandom(daySeed) % dailyPool.length;
                this.dailyChallenge = {
                    ...dailyPool[index],
                    seed: daySeed,
                    expiresAt: this._getNextDayReset(),
                    progress: this.challengeProgress.get(this.dailyChallenge?.id) || 0
                };
            }

            // Generate weekly challenge
            if (!this.weeklyChallenge || this._needsNewWeekly()) {
                const weeklyPool = this.challengePools.weekly;
                const index = this._seededRandom(weekSeed) % weeklyPool.length;
                this.weeklyChallenge = {
                    ...weeklyPool[index],
                    seed: weekSeed,
                    expiresAt: this._getNextWeekReset(),
                    progress: this.challengeProgress.get(this.weeklyChallenge?.id) || 0
                };
            }
        }

        /**
         * Check if daily challenge needs refresh
         */
        _needsNewDaily() {
            return !this.dailyChallenge || Date.now() > this.dailyChallenge.expiresAt;
        }

        /**
         * Check if weekly challenge needs refresh
         */
        _needsNewWeekly() {
            return !this.weeklyChallenge || Date.now() > this.weeklyChallenge.expiresAt;
        }

        /**
         * Get next day reset timestamp
         */
        _getNextDayReset() {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            return tomorrow.getTime();
        }

        /**
         * Get next week reset timestamp
         */
        _getNextWeekReset() {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay()));
            nextWeek.setHours(0, 0, 0, 0);
            return nextWeek.getTime();
        }

        /**
         * Seeded random number generator
         */
        _seededRandom(seed) {
            const x = Math.sin(seed) * 10000;
            return Math.floor((x - Math.floor(x)) * 1000);
        }

        /**
         * Update challenge progress
         */
        updateProgress(gameId, type, value) {
            let updated = false;

            // Check daily challenge
            if (this.dailyChallenge && this.dailyChallenge.gameId === gameId && this.dailyChallenge.type === type) {
                const newProgress = Math.min(this.dailyChallenge.target, (this.dailyChallenge.progress || 0) + value);
                this.dailyChallenge.progress = newProgress;
                this.challengeProgress.set(this.dailyChallenge.id, newProgress);
                updated = true;

                if (newProgress >= this.dailyChallenge.target && !this.completedChallenges.has(this.dailyChallenge.id)) {
                    this._completeChallenge(this.dailyChallenge, 'daily');
                }
            }

            // Check weekly challenge
            if (this.weeklyChallenge) {
                if (this.weeklyChallenge.gameId === gameId && this.weeklyChallenge.type === type) {
                    const newProgress = Math.min(this.weeklyChallenge.target, (this.weeklyChallenge.progress || 0) + value);
                    this.weeklyChallenge.progress = newProgress;
                    this.challengeProgress.set(this.weeklyChallenge.id, newProgress);
                    updated = true;

                    if (newProgress >= this.weeklyChallenge.target && !this.completedChallenges.has(this.weeklyChallenge.id)) {
                        this._completeChallenge(this.weeklyChallenge, 'weekly');
                    }
                }

                // Check "all games" challenges
                if (this.weeklyChallenge.gameId === 'all') {
                    if (this.weeklyChallenge.type === 'totalKills') {
                        const newProgress = Math.min(this.weeklyChallenge.target, (this.weeklyChallenge.progress || 0) + value);
                        this.weeklyChallenge.progress = newProgress;
                        updated = true;

                        if (newProgress >= this.weeklyChallenge.target && !this.completedChallenges.has(this.weeklyChallenge.id)) {
                            this._completeChallenge(this.weeklyChallenge, 'weekly');
                        }
                    }
                }
            }

            if (updated) {
                this._scheduleSave();
            }
        }

        /**
         * Complete challenge
         */
        _completeChallenge(challenge, type) {
            this.completedChallenges.add(challenge.id);
            
            console.log(`[ChallengeSystem] Completed ${type} challenge: ${challenge.name}`);
            
            this._notify('challengeCompleted', {
                ...challenge,
                type,
                completed: true
            });

            this._scheduleSave();
        }

        /**
         * Get current challenges
         */
        getCurrentChallenges() {
            return {
                daily: this.dailyChallenge,
                weekly: this.weeklyChallenge
            };
        }

        /**
         * Get challenge progress
         */
        getChallengeProgress(challengeId) {
            return this.challengeProgress.get(challengeId) || 0;
        }

        /**
         * Get completed challenges count
         */
        getCompletedCount(type = null) {
            if (type === 'daily') {
                return Array.from(this.completedChallenges).filter(id => id.includes('daily')).length;
            }
            if (type === 'weekly') {
                return Array.from(this.completedChallenges).filter(id => id.includes('weekly')).length;
            }
            return this.completedChallenges.size;
        }

        /**
         * Event listeners
         */
        on(event, callback) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            this.listeners.get(event).push(callback);
        }

        _notify(event, data) {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                callbacks.forEach(cb => cb(data));
            }
        }

        /**
         * Save/Load
         */
        async save() {
            const data = {
                dailyChallenge: this.dailyChallenge,
                weeklyChallenge: this.weeklyChallenge,
                completedChallenges: Array.from(this.completedChallenges),
                challengeProgress: Object.fromEntries(this.challengeProgress),
                lastDaily: this.dailyChallenge?.seed,
                lastWeekly: this.weeklyChallenge?.seed,
                savedAt: Date.now()
            };

            try {
                localStorage.setItem(this.saveKey, JSON.stringify(data));
            } catch (error) {
                console.error('[ChallengeSystem] Save failed:', error);
            }
        }

        async load() {
            try {
                const data = localStorage.getItem(this.saveKey);
                if (!data) return false;

                const parsed = JSON.parse(data);
                
                this.dailyChallenge = parsed.dailyChallenge || null;
                this.weeklyChallenge = parsed.weeklyChallenge || null;
                this.completedChallenges = new Set(parsed.completedChallenges || []);
                this.challengeProgress = new Map(Object.entries(parsed.challengeProgress || {}));

                return true;
            } catch (error) {
                console.error('[ChallengeSystem] Load failed:', error);
                return false;
            }
        }

        _saveTimeout: null,

        _scheduleSave() {
            if (this._saveTimeout) {
                clearTimeout(this._saveTimeout);
            }
            this._saveTimeout = setTimeout(() => this.save(), 3000);
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            ProgressionManager,
            AchievementSystem,
            ChallengeSystem
        };
    } else {
        global.ProgressionManager = ProgressionManager;
        global.AchievementSystem = AchievementSystem;
        global.ChallengeSystem = ChallengeSystem;
    }

})(typeof window !== 'undefined' ? window : this);
