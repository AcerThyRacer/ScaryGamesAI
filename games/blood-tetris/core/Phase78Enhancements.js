/**
 * ============================================
 * BLOOD TETRIS - PHASE 7-8 PROGRESSION
 * ============================================
 * Complete progression integration for Blood Tetris
 */

(function(global) {
    'use strict';

    const ProgressionBloodTetris = {
        integration: null,
        gameId: 'blood-tetris',
        sessionStats: null,

        async init(options = {}) {
            this.integration = options.integration || new Phase78Integration();
            if (!options.integration) {
                await this.integration.init(options);
            }
            console.log('[BloodTetris Progression] Ready');
        },

        setIntegration(integration) {
            this.integration = integration;
        },

        onGameStart(gameState) {
            this.sessionStats = {
                startTime: Date.now(),
                lines: 0,
                tetrises: 0,
                combos: 0,
                maxCombo: 0,
                score: 0
            };
            this.integration.startGame(this.gameId);
        },

        onGameEnd(gameState) {
            this.integration.endGame(this.gameId);
            
            // Save progress
            this.integration.saveGame(this.gameId, {
                highScore: gameState.highScore,
                level: gameState.level,
                lines: gameState.lines,
                totalTime: gameState.totalTime,
                tetrisClears: gameState.tetrises,
                maxCombo: gameState.maxCombo
            });
        },

        onLineClear(lines, gameState) {
            if (!this.sessionStats) return;
            
            this.sessionStats.lines += lines;
            this.sessionStats.score = gameState.score;

            // Track progress
            this.integration.trackProgress(this.gameId, {
                lines: lines,
                score: gameState.score
            });

            // Award XP based on lines
            const xpReward = lines * 10;
            this.integration.progression?.addXP(this.gameId, xpReward, 'lines');
        },

        onTetris(gameState) {
            if (!this.sessionStats) return;
            
            this.sessionStats.tetrises++;
            this.sessionStats.score = gameState.score;

            // Bonus XP for Tetris
            this.integration.progression?.addXP(this.gameId, 100, 'tetris');

            // Track
            this.integration.trackProgress(this.gameId, {
                tetrises: 1,
                score: gameState.score
            });

            // Unlock achievement check
            this.integration.achievements?.checkAchievements(this.gameId, {
                tetrises: this.sessionStats.tetrises,
                highScore: gameState.score
            });
        },

        onCombo(combo, gameState) {
            if (!this.sessionStats) return;
            
            this.sessionStats.combos++;
            this.sessionStats.maxCombo = Math.max(this.sessionStats.maxCombo, combo);
            this.sessionStats.score = gameState.score;

            // Track
            this.integration.trackProgress(this.gameId, {
                combo: 1,
                maxCombo: combo,
                score: gameState.score
            });

            // Combo XP bonus
            if (combo >= 3) {
                this.integration.progression?.addXP(this.gameId, combo * 5, 'combo');
            }
        },

        onCurseTriggered(gameState) {
            this.integration.trackProgress(this.gameId, {
                cursesTriggered: 1
            });
        },

        onPowerUpCollected(powerUp, gameState) {
            this.integration.trackProgress(this.gameId, {
                powerUpsCollected: 1
            });
        },

        onPerfectGame(gameState) {
            this.integration.progression?.addXP(this.gameId, 500, 'perfectRun');
            this.integration.unlock('features', 'blood_tetris_perfect');
        },

        getSessionStats() {
            return this.sessionStats || {};
        },

        getPlayerStats() {
            return this.integration.getGameSummary(this.gameId);
        },

        getAchievements() {
            return this.integration.getAchievements(this.gameId);
        },

        getChallenges() {
            return this.integration.getCurrentChallenges();
        }
    };

    global.ProgressionBloodTetris = ProgressionBloodTetris;

})(typeof window !== 'undefined' ? window : this);
