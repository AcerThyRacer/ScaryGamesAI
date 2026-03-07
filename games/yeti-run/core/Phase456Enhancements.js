/**
 * ============================================
 * RUNNER GAMES ENHANCEMENTS (Yeti Run & Nightmare Run)
 * ============================================
 * Shared enhancements for endless runner games
 */

(function(global) {
    'use strict';

    // ============================================
    // YETI RUN ENHANCEMENTS
    // ============================================

    const EnhancedYetiRun = {
        integration: null,
        audioDirector: null,
        aiSystem: null,
        postProcessing: null,
        screenEffects: null,

        enhancedState: {
            audioEnabled: true,
            aiEnabled: true,
            postProcessingEnabled: true,
            chaseIntensity: 0,
            speed: 0
        },

        async init(canvas, ctx, originalGame, gameId = 'yeti-run') {
            this.originalGame = originalGame;
            this.gameId = gameId;
            this.canvas = canvas;

            console.log(`[${gameId === 'yeti-run' ? 'YetiRun' : 'NightmareRun'} Enhanced] Initializing...`);

            try {
                this.integration = new Phase456Integration();
                await this.integration.init(gameId, canvas);
                
                this.audioDirector = this.integration.audioDirector;
                this.aiSystem = this.integration.aiSystem;
                this.postProcessing = this.integration.postProcessing;
                this.screenEffects = this.integration.screenEffects;

                this._setupEnhancedRendering();
                console.log(`[${gameId === 'yeti-run' ? 'YetiRun' : 'NightmareRun'} Enhanced] Ready`);
                return true;
            } catch (error) {
                console.error(`[${gameId}] Enhanced init failed:`, error);
                return false;
            }
        },

        _setupEnhancedRendering() {
            if (this.originalGame) {
                this._originalRender = this.originalGame.render;
                this.originalGame.render = this._enhancedRender.bind(this);
            }
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
                speed: gameState.speed || 0,
                obstaclesPassed: gameState.obstaclesPassed || 0,
                chaseActive: gameState.chaseActive || false,
                nearMissOccurred: gameState.nearMissJustHappened,
                fearLevel: gameState.fearLevel || 0,
                performance: this._calculatePerformance(gameState)
            };

            this.integration.update(dt, enhancedGameState);

            // Generate procedural obstacles
            if (this.enhancedState.aiEnabled && gameState.needNewObstacles) {
                this._generateObstacles(gameState);
            }

            this.enhancedState.speed = gameState.speed || 0;
            this.enhancedState.chaseIntensity = gameState.chaseActive ? 0.8 : 0.3;
        },

        _generateObstacles(gameState) {
            const obstacles = this.aiSystem?.generateContent('obstacles', {
                length: 50,
                difficulty: this.aiSystem?.difficultyAdapter?.getMultiplier() || 1,
                pattern: gameState.obstaclePattern || 'random'
            });
            
            if (obstacles) {
                gameState.newObstacles = obstacles;
                gameState.needNewObstacles = false;
            }
        },

        _calculatePerformance(gameState) {
            const distanceRate = (gameState.distance || 0) / Math.max(1, gameState.totalTime * 10);
            const survivalBonus = Math.min(1, (gameState.health || 100) / 100);
            return Math.min(1, distanceRate * 0.7 + survivalBonus * 0.3);
        },

        playSFX(context) {
            if (!this.audioDirector || !this.enhancedState.audioEnabled) return;
            
            const gameId = this.gameId;
            const prefix = gameId === 'yeti-run' ? 'yeti' : 'nightmare';
            
            const triggers = {
                jump: `${prefix}:jump`,
                slide: `${prefix}:slide`,
                collect: 'collect',
                crash: 'hit',
                nearMiss: 'horror:breath'
            };

            if (triggers[context]) {
                this.integration.playSFX(triggers[context]);
            }
        },

        onJump() {
            if (Math.random() < 0.3) this.playSFX('jump');
        },

        onSlide() {
            if (Math.random() < 0.3) this.playSFX('slide');
        },

        onCollect(item) {
            this.playSFX('collect');
            this.triggerIntensity(0.05);
        },

        onObstacleHit(obstacle) {
            this.playSFX('crash');
            this.triggerScreenEffect('shake', { intensity: 10, duration: 0.2 });
            this.triggerScreenEffect('flash', { intensity: 0.4 });
            this.triggerIntensity(0.2);
        },

        onNearMiss() {
            this.playSFX('nearMiss');
            this.triggerScreenEffect('glitch', { intensity: 0.3, duration: 0.2 });
            this.triggerIntensity(0.15);
        },

        onChaseStart() {
            this.triggerIntensity(0.5);
            this.triggerScreenEffect('darkness', { intensity: 0.4 });
        },

        onSpeedBoost() {
            this.triggerIntensity(0.1);
            this.triggerScreenEffect('radialBlur', { intensity: 0.05 });
        },

        triggerIntensity(amount) {
            this.audioDirector?.triggerIntensity(amount);
        },

        triggerScreenEffect(effect, params) {
            this.screenEffects?.[effect]?.(params);
        },

        generateObstacleCourse(length, difficulty) {
            return this.aiSystem?.generateContent('obstacles', {
                length,
                difficulty,
                pattern: 'chase'
            });
        },

        generatePowerupDistribution(count) {
            return this.aiSystem?.generateContent('powerups', {
                count,
                types: ['speed', 'shield', 'magnet', 'score'],
                distribution: 'balanced'
            });
        },

        toggleAudio(enabled) { this.enhancedState.audioEnabled = enabled; this.integration?.toggleAudio(enabled); },
        toggleAI(enabled) { this.enhancedState.aiEnabled = enabled; },
        togglePostProcessing(enabled) { this.enhancedState.postProcessingEnabled = enabled; },
        setQuality(quality) { this.integration?.setPostProcessingQuality(quality); },

        getEnhancedStats() {
            return {
                base: this.originalGame?.getStats?.() || {},
                systems: this.integration?.getStats?.() || {},
                enhanced: this.enhancedState
            };
        },

        dispose() { this.integration?.dispose(); }
    };

    // ============================================
    // NIGHTMARE RUN ENHANCEMENTS (alias)
    // ============================================

    const EnhancedNightmareRun = {
        ...EnhancedYetiRun,
        async init(canvas, ctx, originalGame) {
            return EnhancedYetiRun.init.call(this, canvas, ctx, originalGame, 'nightmare-run');
        }
    };

    // ============================================
    // EXPORT
    // ============================================

    global.EnhancedYetiRun = EnhancedYetiRun;
    global.EnhancedNightmareRun = EnhancedNightmareRun;

})(typeof window !== 'undefined' ? window : this);
