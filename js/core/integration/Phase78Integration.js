/**
 * ============================================
 * SGAI PHASE 7-8 UNIFIED INTEGRATION
 * ============================================
 * Complete integration package for Progression, Achievements,
 * Challenges, Save/Load, Statistics, and Settings.
 * 
 * Usage:
 *   const integration = new Phase78Integration();
 *   await integration.init();
 *   integration.trackProgress('blood-tetris', gameState);
 */

(function(global) {
    'use strict';

    // ============================================
    // PHASE 7-8 INTEGRATION MANAGER
    // ============================================

    class Phase78Integration {
        constructor() {
            this.progression = null;
            this.achievements = null;
            this.challenges = null;
            this.saveManager = null;
            this.statistics = null;
            this.settings = null;
            
            this.initialized = false;
            this.currentGame = null;
            this.sessionStart = null;
            
            // Auto-save configuration
            this.autoSaveEnabled = true;
            this.autoSaveInterval = 30000;
            this.autoSaveTimeout = null;
        }

        /**
         * Initialize all Phase 7-8 systems
         */
        async init(options = {}) {
            console.log('[Phase78Integration] Initializing all systems...');
            
            this.sessionStart = Date.now();

            // Initialize Settings first (affects other systems)
            this.settings = new SettingsManager();
            await this.settings.init();

            // Initialize Save Manager
            this.saveManager = new SaveManager();
            await this.saveManager.init({
                cloudEnabled: options.cloudSave !== false,
                autoSave: this.settings.get('autoSave', true),
                autoSaveInterval: this.autoSaveInterval
            });

            // Initialize Progression Manager
            this.progression = new ProgressionManager();
            await this.progression.init();

            // Initialize Achievement System
            this.achievements = new AchievementSystem();
            await this.achievements.init();

            // Initialize Challenge System
            this.challenges = new ChallengeSystem();
            await this.challenges.init();

            // Initialize Statistics Tracker
            this.statistics = new StatisticsTracker();
            await this.statistics.init();

            // Setup event listeners
            this._setupEventListeners();

            this.initialized = true;
            console.log('[Phase78Integration] All systems ready');
            console.log('[Phase78Integration] Player Level:', this.progression.player.level);
            console.log('[Phase78Integration] Achievement Completion:', this.achievements.getTotalCompletion().percentage + '%');
            
            return true;
        }

        /**
         * Setup event listeners for automatic tracking
         */
        _setupEventListeners() {
            // Achievement unlock handler
            this.achievements.on('achievementUnlocked', (data) => {
                console.log(`[Phase78] Achievement Unlocked: ${data.name}`);
                this.progression.addXP(data.gameId, data.xp, 'achievement');
                this.statistics.track(data.gameId, 'achievement_unlocked', { achievement: data.id });
            });

            // Challenge complete handler
            this.challenges.on('challengeCompleted', (data) => {
                console.log(`[Phase78] Challenge Completed: ${data.name}`);
                this.progression.addXP(data.gameId, data.xp, 'challenge');
                this.progression.player.horrorPoints += data.horrorPoints;
                this.statistics.track(data.gameId, 'challenge_completed', { challenge: data.id });
            });

            // Level up handler
            this.progression.on('levelUp', (data) => {
                console.log(`[Phase78] Level Up! Level ${data.level}`);
                this.statistics.track('meta', 'level_up', { level: data.level });
            });

            // Save handler
            this.saveManager.on('save', (data) => {
                this.statistics.track(data.gameId, 'game_saved', { slot: data.slot });
            });

            // Settings change handler
            this.settings.on('change', (data) => {
                console.log(`[Phase78] Setting changed: ${data.key} = ${data.value}`);
            });

            // Auto-save on visibility change
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && this.currentGame) {
                    this.saveGame(this.currentGame);
                }
            });

            // Save on beforeunload
            window.addEventListener('beforeunload', () => {
                if (this.currentGame) {
                    this.saveGame(this.currentGame);
                }
            });
        }

        /**
         * Start game session
         */
        startGame(gameId) {
            this.currentGame = gameId;
            this.sessionStart = Date.now();
            
            // Load game save
            this.loadGame(gameId);
            
            // Track session start
            this.statistics.track(gameId, 'session_start', { timestamp: this.sessionStart });
            
            // Get daily bonus if first play today
            this._checkDailyBonus(gameId);
            
            console.log(`[Phase78] Started session for ${gameId}`);
        }

        /**
         * End game session
         */
        endGame(gameId) {
            if (this.currentGame !== gameId) return;
            
            const sessionTime = (Date.now() - this.sessionStart) / 1000;
            
            // Track session end
            this.statistics.track(gameId, 'session_end', {
                duration: sessionTime,
                timestamp: Date.now()
            });
            
            // Award XP for play time
            const timeXP = Math.floor(sessionTime / 60) * 10; // 10 XP per minute
            if (timeXP > 0) {
                this.progression.addXP(gameId, timeXP, 'playtime');
            }
            
            // Save game
            this.saveGame(gameId);
            
            this.currentGame = null;
            this.sessionStart = null;
        }

        /**
         * Track progress and check achievements
         */
        trackProgress(gameId, stats) {
            if (!this.initialized) return;

            // Check achievements
            const unlockedAchievements = this.achievements.checkAchievements(gameId, stats);
            
            // Update challenge progress
            Object.entries(stats).forEach(([type, value]) => {
                this.challenges.updateProgress(gameId, type, value);
            });

            // Track statistics
            Object.entries(stats).forEach(([key, value]) => {
                if (typeof value === 'number') {
                    this.statistics.track(gameId, key, { value });
                }
            });

            // Auto-save if enabled
            if (this.autoSaveEnabled) {
                this._scheduleAutoSave(gameId, stats);
            }

            return {
                achievements: unlockedAchievements,
                xpGained: unlockedAchievements.reduce((acc, a) => acc + a.xp, 0)
            };
        }

        /**
         * Save game
         */
        async saveGame(gameId, gameState = null, slot = 'default') {
            if (!this.initialized) return false;

            const saveData = {
                ...gameState,
                lastPlayed: Date.now(),
                sessionTime: this.sessionStart ? (Date.now() - this.sessionStart) / 1000 : 0,
                achievements: this.achievements.getPlayerAchievements(gameId),
                stats: this.statistics.getAggregatedStats(gameId)
            };

            const result = await this.saveManager.save(gameId, saveData, { slot });
            
            if (result) {
                console.log(`[Phase78] Game saved: ${gameId}:${slot}`);
            }
            
            return result;
        }

        /**
         * Load game
         */
        async loadGame(gameId, slot = 'default') {
            if (!this.initialized) return null;

            const saveData = await this.saveManager.load(gameId, { slot });
            
            if (saveData) {
                console.log(`[Phase78] Game loaded: ${gameId}:${slot}`);
            }
            
            return saveData;
        }

        /**
         * Check for daily bonus
         */
        _checkDailyBonus(gameId) {
            const lastBonusKey = `sgai_last_daily_${gameId}`;
            const lastBonus = localStorage.getItem(lastBonusKey);
            const now = Date.now();
            const dayMs = 24 * 60 * 60 * 1000;

            if (!lastBonus || (now - parseInt(lastBonus)) > dayMs) {
                // Award daily bonus
                this.progression.addXP(gameId, 100, 'dailyBonus');
                this.progression.player.horrorPoints += 10;
                localStorage.setItem(lastBonusKey, now.toString());
                
                console.log('[Phase78] Daily bonus awarded: 100 XP, 10 HP');
            }
        }

        /**
         * Schedule auto-save
         */
        _scheduleAutoSave(gameId, stats) {
            if (this.autoSaveTimeout) {
                clearTimeout(this.autoSaveTimeout);
            }

            this.autoSaveTimeout = setTimeout(() => {
                this.saveGame(gameId, stats);
            }, this.autoSaveInterval);
        }

        /**
         * Get player summary
         */
        getPlayerSummary() {
            return {
                progression: this.progression.getPlayerStats(),
                achievements: this.achievements.getTotalCompletion(),
                challenges: {
                    daily: this.challenges.dailyChallenge,
                    weekly: this.challenges.weeklyChallenge,
                    completed: this.challenges.getCompletedCount()
                },
                statistics: this.statistics.getPlayerSummary(),
                settings: this.settings.getAll()
            };
        }

        /**
         * Get game summary
         */
        getGameSummary(gameId) {
            return {
                progress: this.progression.getGameProgress(gameId),
                achievements: this.achievements.getAchievementProgress(gameId),
                stats: this.statistics.getAggregatedStats(gameId),
                recentActivity: this.statistics.getRecentActivity(gameId),
                saves: this.saveManager.getAllSaves().filter(s => s.gameId === gameId)
            };
        }

        /**
         * Get current challenges
         */
        getCurrentChallenges() {
            return this.challenges.getCurrentChallenges();
        }

        /**
         * Get achievements for game
         */
        getAchievements(gameId) {
            return this.achievements.getAchievements(gameId);
        }

        /**
         * Unlock achievement manually (for special events)
         */
        unlockAchievement(gameId, achievementId) {
            const achievements = this.achievements.getAchievements(gameId);
            const achievement = achievements.find(a => a.id === achievementId);
            
            if (achievement && !this.achievements.playerAchievements.has(achievementId)) {
                this.achievements._unlockAchievement(achievement, gameId);
                this.progression.addXP(gameId, achievement.xp, 'achievement');
                return true;
            }
            return false;
        }

        /**
         * Spend Horror Points
         */
        spendHorrorPoints(amount, itemId) {
            return this.progression.spendHorrorPoints(amount, itemId);
        }

        /**
         * Get Horror Points balance
         */
        getHorrorPoints() {
            return this.progression.player.horrorPoints;
        }

        /**
         * Check if content is unlocked
         */
        isUnlocked(category, id) {
            return this.progression.isUnlocked(category, id);
        }

        /**
         * Unlock content
         */
        unlock(category, id) {
            return this.progression.unlock(category, id);
        }

        /**
         * Prestige reset
         */
        prestige() {
            return this.progression.prestige();
        }

        /**
         * Update settings
         */
        updateSetting(key, value) {
            return this.settings.set(key, value);
        }

        /**
         * Get setting
         */
        getSetting(key) {
            return this.settings.get(key);
        }

        /**
         * Export all data
         */
        exportData() {
            return {
                progression: this.progression.getPlayerStats(),
                achievements: this.achievements.getPlayerAchievements(),
                settings: this.settings.getAll(),
                statistics: this.statistics.getStats(),
                exportedAt: Date.now()
            };
        }

        /**
         * Import data
         */
        importData(data) {
            if (data.progression) {
                // Import progression data
            }
            if (data.achievements) {
                // Import achievements
            }
            if (data.settings) {
                this.settings.updateAll(data.settings);
            }
        }

        /**
         * Reset all data (for testing)
         */
        resetAll() {
            this.progression.reset(true);
            this.achievements.reset();
            this.challenges.completedChallenges.clear();
            this.statistics.reset();
            this.saveManager.clearAll();
            console.log('[Phase78] All data reset');
        }

        /**
         * Cleanup
         */
        dispose() {
            if (this.currentGame) {
                this.endGame(this.currentGame);
            }
            this.saveManager.dispose();
            this.initialized = false;
        }
    }

    // ============================================
    // GAME-SPECIFIC PROGRESSION HELPERS
    // ============================================

    const GameProgressionHelpers = {
        'blood-tetris': {
            onGameStart: (integration, state) => {
                integration.startGame('blood-tetris');
            },
            onGameEnd: (integration, state) => {
                integration.endGame('blood-tetris');
                integration.saveGame('blood-tetris', {
                    highScore: state.highScore,
                    level: state.level,
                    lines: state.lines,
                    totalTime: state.totalTime
                });
            },
            onLineClear: (integration, lines, state) => {
                integration.trackProgress('blood-tetris', {
                    lines: lines,
                    score: state.score
                });
            },
            onTetris: (integration, state) => {
                integration.trackProgress('blood-tetris', {
                    tetrises: 1,
                    score: state.score
                });
            },
            onCombo: (integration, combo, state) => {
                integration.trackProgress('blood-tetris', {
                    maxCombo: combo,
                    score: state.score
                });
            }
        },

        'zombie-horde': {
            onGameStart: (integration) => integration.startGame('zombie-horde'),
            onGameEnd: (integration, state) => {
                integration.endGame('zombie-horde');
                integration.saveGame('zombie-horde', {
                    maxWave: state.wave,
                    totalKills: state.totalKills,
                    bossesDefeated: state.bossesDefeated
                });
            },
            onWaveComplete: (integration, wave) => {
                integration.trackProgress('zombie-horde', { wave: 1 });
            },
            onZombieKill: (integration) => {
                integration.trackProgress('zombie-horde', { kills: 1 });
            },
            onBossDefeated: (integration) => {
                integration.trackProgress('zombie-horde', { bossesDefeated: 1 });
                integration.unlock('features', 'zombie_horde_boss_slayer');
            }
        },

        'ritual-circle': {
            onGameStart: (integration) => integration.startGame('ritual-circle'),
            onGameEnd: (integration, state) => {
                integration.endGame('ritual-circle');
                integration.saveGame('ritual-circle', {
                    maxWave: state.wave,
                    totalKills: state.totalKills
                });
            },
            onWaveComplete: (integration, wave) => {
                integration.trackProgress('ritual-circle', { wave: 1, kills: state.kills });
            },
            onTrapPlaced: (integration) => {
                integration.trackProgress('ritual-circle', { trapsPlaced: 1 });
            }
        },

        'seance': {
            onGameStart: (integration) => integration.startGame('seance'),
            onGameEnd: (integration, state) => {
                integration.endGame('seance');
                integration.saveGame('seance', {
                    evidenceFound: state.evidence?.length || 0,
                    maxSanity: state.maxSanity || 100
                });
            },
            onEvidenceFound: (integration) => {
                integration.trackProgress('seance', { evidenceFound: 1 });
            },
            onHauntingSurvived: (integration) => {
                integration.trackProgress('seance', { hauntingsSurvived: 1 });
            }
        },

        'crypt-tanks': {
            onGameStart: (integration) => integration.startGame('crypt-tanks'),
            onGameEnd: (integration, state) => {
                integration.endGame('crypt-tanks');
                integration.saveGame('crypt-tanks', {
                    maxLevel: state.level,
                    totalKills: state.kills
                });
            },
            onEnemyKill: (integration) => {
                integration.trackProgress('crypt-tanks', { kills: 1 });
            },
            onLevelComplete: (integration, level) => {
                integration.trackProgress('crypt-tanks', { level: 1 });
            }
        },

        'yeti-run': {
            onGameStart: (integration) => integration.startGame('yeti-run'),
            onGameEnd: (integration, state) => {
                integration.endGame('yeti-run');
                integration.saveGame('yeti-run', {
                    maxDistance: state.distance,
                    obstaclesPassed: state.obstaclesPassed
                });
            },
            onDistance: (integration, distance) => {
                integration.trackProgress('yeti-run', { distance: Math.floor(distance / 100) });
            },
            onObstaclePassed: (integration) => {
                integration.trackProgress('yeti-run', { obstacles: 1 });
            }
        },

        'nightmare-run': {
            onGameStart: (integration) => integration.startGame('nightmare-run'),
            onGameEnd: (integration, state) => {
                integration.endGame('nightmare-run');
                integration.saveGame('nightmare-run', {
                    maxDistance: state.distance,
                    enemiesDefeated: state.kills
                });
            },
            onDistance: (integration, distance) => {
                integration.trackProgress('nightmare-run', { distance: Math.floor(distance / 100) });
            },
            onEnemyKill: (integration) => {
                integration.trackProgress('nightmare-run', { kills: 1 });
            }
        },

        'cursed-arcade': {
            onGameStart: (integration) => integration.startGame('cursed-arcade'),
            onGameEnd: (integration, state) => {
                integration.endGame('cursed-arcade');
                integration.saveGame('cursed-arcade', {
                    highScore: state.highScore,
                    gamesPlayed: state.gamesPlayed
                });
            },
            onScore: (integration, score) => {
                integration.trackProgress('cursed-arcade', { score: Math.floor(score / 100) });
            },
            onCurseSurvived: (integration) => {
                integration.trackProgress('cursed-arcade', { cursesSurvived: 1 });
            }
        }
    };

    // ============================================
    // EXPORT
    // ============================================

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            Phase78Integration,
            GameProgressionHelpers
        };
    } else {
        global.Phase78Integration = Phase78Integration;
        global.GameProgressionHelpers = GameProgressionHelpers;
    }

})(typeof window !== 'undefined' ? window : this);
