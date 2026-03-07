/**
 * ============================================
 * CURSED ARCADE - PHASE 4-5-6 ENHANCEMENTS
 * ============================================
 * Retro horror with adaptive curse system
 */

(function(global) {
    'use strict';

    const EnhancedCursedArcade = {
        integration: null,
        audioDirector: null,
        aiSystem: null,
        postProcessing: null,
        screenEffects: null,

        enhancedState: {
            audioEnabled: true,
            aiEnabled: true,
            postProcessingEnabled: true,
            curseIntensity: 0,
            retroMode: true
        },

        async init(canvas, ctx, originalGame) {
            this.originalGame = originalGame;
            this.canvas = canvas;

            console.log('[CursedArcade Enhanced] Initializing...');

            try {
                this.integration = new Phase456Integration();
                await this.integration.init('cursed-arcade', canvas);
                
                this.audioDirector = this.integration.audioDirector;
                this.aiSystem = this.integration.aiSystem;
                this.postProcessing = this.integration.postProcessing;
                this.screenEffects = this.integration.screenEffects;

                this._setupEnhancedRendering();
                this._setupLearningAI();
                console.log('[CursedArcade Enhanced] Ready');
                return true;
            } catch (error) {
                console.error('[CursedArcade Enhanced] Init failed:', error);
                return false;
            }
        },

        _setupEnhancedRendering() {
            if (this.originalGame) {
                this._originalRender = this.originalGame.render;
                this.originalGame.render = this._enhancedRender.bind(this);
            }
        },

        _setupLearningAI() {
            if (!this.aiSystem) return;
            // Cursed Arcade uses Q-Learning for adaptive curse patterns
            this.aiSystem._initLearningAI();
        },

        _enhancedRender() {
            if (this._originalRender) {
                this._originalRender.call(this.originalGame);
            }
            if (this.postProcessing && this.enhancedState.postProcessingEnabled) {
                this.integration.render(this.canvas);
            }
        },

        update(dt, gameState) {
            if (!this.integration) return;

            const enhancedGameState = {
                ...gameState,
                score: gameState.score || 0,
                curseActive: gameState.curseActive || false,
                bossActive: gameState.bossActive || false,
                performance: this._calculatePerformance(gameState)
            };

            this.integration.update(dt, enhancedGameState);

            // Update learning AI
            if (this.enhancedState.aiEnabled) {
                this._updateLearningAI(gameState);
            }

            this.enhancedState.curseIntensity = gameState.curseActive ? 0.7 : 0.2;
        },

        _updateLearningAI(gameState) {
            const learningAI = this.aiSystem?.learningAI?.get('adaptive');
            if (!learningAI) return;

            // Build state representation
            const state = {
                player_skill: this._calculatePlayerSkill(gameState),
                game_state: gameState.curseActive ? 'cursed' : 'normal',
                difficulty: this.aiSystem?.difficultyAdapter?.getMultiplier() || 1
            };

            // Select action (adjust curse difficulty)
            const action = learningAI.selectAction(state);
            this._applyLearningAction(action, gameState);

            // Learn from outcome
            if (gameState.lastState) {
                const reward = this._calculateReward(gameState);
                learningAI.learn(gameState.lastState, gameState.lastAction, reward, state);
            }

            gameState.lastState = state;
        },

        _calculatePlayerSkill(gameState) {
            const scoreRate = (gameState.score || 0) / Math.max(1, gameState.totalTime / 60);
            if (scoreRate > 100) return 'expert';
            if (scoreRate > 50) return 'skilled';
            if (scoreRate > 20) return 'average';
            return 'beginner';
        },

        _applyLearningAction(action, gameState) {
            switch (action) {
                case 'increase_challenge':
                    gameState.curseChance = Math.min(0.3, (gameState.curseChance || 0.1) + 0.02);
                    break;
                case 'decrease_challenge':
                    gameState.curseChance = Math.max(0.05, (gameState.curseChance || 0.1) - 0.02);
                    break;
                case 'maintain':
                    // Keep current difficulty
                    break;
            }
        },

        _calculateReward(gameState) {
            // Positive reward for player engagement, negative for frustration
            if (gameState.deathJustHappened) return -1;
            if (gameState.combo > 5) return 0.5;
            if (gameState.score > (gameState.lastScore || 0) + 100) return 0.3;
            return 0;
        },

        _calculatePerformance(gameState) {
            const scoreRate = (gameState.score || 0) / Math.max(1, gameState.totalTime / 60);
            const survivalBonus = Math.min(1, (gameState.lives || 3) / 3);
            return Math.min(1, scoreRate * 0.01 + survivalBonus * 0.3);
        },

        playSFX(context) {
            if (!this.audioDirector || !this.enhancedState.audioEnabled) return;
            
            const triggers = {
                collect: 'collect',
                hit: 'hit',
                curse: 'glitch',
                powerup: 'tetris:powerup',
                boss: 'horror:creak'
            };

            if (triggers[context]) {
                this.integration.playSFX(triggers[context]);
            }
        },

        onCollect(item) {
            this.playSFX('collect');
            this.triggerIntensity(0.05);
        },

        onHit(obstacle) {
            this.playSFX('hit');
            this.triggerScreenEffect('flash', { intensity: 0.4 });
            this.triggerScreenEffect('shake', { intensity: 8, duration: 0.15 });
            this.triggerIntensity(0.15);
        },

        onCurseActivated(curse) {
            this.playSFX('curse');
            this.triggerIntensity(0.4);
            this.triggerScreenEffect('glitch', { intensity: 0.5, duration: 0.6 });
            this.triggerScreenEffect('chromatic', { intensity: 0.005 });
        },

        onPowerUp(powerup) {
            this.playSFX('powerup');
            this.triggerIntensity(0.15);
            this.triggerScreenEffect('flash', { intensity: 0.3 });
        },

        onBossSpawn() {
            this.playSFX('boss');
            this.triggerIntensity(0.6);
            this.triggerScreenEffect('darkness', { intensity: 0.5 });
            this.triggerScreenEffect('glitch', { intensity: 0.3, duration: 1.0 });
        },

        onDeath() {
            this.triggerIntensity(-0.3);
            this.triggerScreenEffect('darkness', { intensity: 1.0, duration: 1.0 });
            this.triggerScreenEffect('glitch', { intensity: 0.8, duration: 0.5 });
        },

        onLevelComplete() {
            this.triggerIntensity(0.2);
            this.triggerScreenEffect('flash', { intensity: 0.5 });
        },

        triggerIntensity(amount) {
            this.audioDirector?.triggerIntensity(amount);
        },

        triggerScreenEffect(effect, params) {
            this.screenEffects?.[effect]?.(params);
        },

        generateCursePattern() {
            const learningAI = this.aiSystem?.learningAI?.get('adaptive');
            if (!learningAI) return this._getDefaultCursePattern();

            // Use learned patterns
            const state = {
                player_skill: 'average',
                game_state: 'cursed',
                difficulty: 1
            };
            
            const action = learningAI.selectAction(state);
            return this._getCursePatternForAction(action);
        },

        _getDefaultCursePattern() {
            const patterns = [
                'reverse_controls',
                'speed_boost',
                'invisible_player',
                'double_damage',
                'screen_flip'
            ];
            return patterns[Math.floor(Math.random() * patterns.length)];
        },

        _getCursePatternForAction(action) {
            const easyPatterns = ['speed_boost', 'double_damage'];
            const hardPatterns = ['reverse_controls', 'invisible_player', 'screen_flip'];
            
            if (action === 'increase_challenge') {
                return hardPatterns[Math.floor(Math.random() * hardPatterns.length)];
            } else if (action === 'decrease_challenge') {
                return easyPatterns[Math.floor(Math.random() * easyPatterns.length)];
            }
            return this._getDefaultCursePattern();
        },

        generateLevelLayout(levelNumber) {
            return this.aiSystem?.generateContent('level', {
                width: 100,
                height: 20,
                difficulty: levelNumber * 0.1
            });
        },

        toggleAudio(enabled) { this.enhancedState.audioEnabled = enabled; this.integration?.toggleAudio(enabled); },
        toggleAI(enabled) { this.enhancedState.aiEnabled = enabled; },
        togglePostProcessing(enabled) { this.enhancedState.postProcessingEnabled = enabled; },
        setQuality(quality) { 
            this.enhancedState.quality = quality;
            this.integration?.setPostProcessingQuality(quality);
            // Enable retro mode for low quality
            this.enhancedState.retroMode = quality === 'low';
        },

        getEnhancedStats() {
            return {
                base: this.originalGame?.getStats?.() || {},
                systems: this.integration?.getStats?.() || {},
                enhanced: {
                    ...this.enhancedState,
                    learningProgress: this.aiSystem?.learningAI?.get('adaptive')?.qTable?.size || 0
                }
            };
        },

        dispose() { this.integration?.dispose(); }
    };

    global.EnhancedCursedArcade = EnhancedCursedArcade;

})(typeof window !== 'undefined' ? window : this);
