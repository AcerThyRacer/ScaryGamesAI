/**
 * ============================================
 * BLOOD TETRIS - PHASE 4-5-6 ENHANCEMENTS
 * ============================================
 * Complete integration of:
 * - Dynamic Audio Director (Phase 4)
 * - AI & Procedural Generation (Phase 5)
 * - Cinematic Post-Processing (Phase 6)
 * 
 * Drop-in replacement that enhances existing blood-tetris.js
 */

(function(global) {
    'use strict';

    // ============================================
    // ENHANCED BLOOD TETRIS CONFIGURATION
    // ============================================

    const EnhancedBloodTetris = {
        // Systems
        integration: null,
        audioDirector: null,
        aiSystem: null,
        postProcessing: null,
        screenEffects: null,

        // Enhanced game state
        enhancedState: {
            audioEnabled: true,
            aiEnabled: true,
            postProcessingEnabled: true,
            performanceMode: false,
            quality: 'high',
            lastTetrisTime: 0,
            comboMultiplier: 1,
            intensityTarget: 0.3
        },

        // Audio triggers
        audioTriggers: {
            move: { sfx: 'tetris:move', chance: 0.3 },
            rotate: { sfx: 'tetris:rotate', chance: 0.5 },
            drop: { sfx: 'tetris:drop', chance: 1.0 },
            clear1: { sfx: 'tetris:clear', chance: 1.0 },
            clear2: { sfx: 'tetris:clear', chance: 1.0 },
            clear3: { sfx: 'tetris:clear', chance: 1.0 },
            tetris: { sfx: 'tetris:tetris', chance: 1.0 },
            curse: { sfx: 'tetris:curse', chance: 1.0 },
            powerup: { sfx: 'tetris:powerup', chance: 1.0 }
        },

        /**
         * Initialize enhanced systems
         */
        async init(canvas, ctx, originalGame) {
            this.originalGame = originalGame;
            this.canvas = canvas;
            this.ctx = ctx;

            console.log('[BloodTetris Enhanced] Initializing Phase 4-5-6 systems...');

            // Initialize unified integration
            try {
                this.integration = new Phase456Integration();
                await this.integration.init('blood-tetris', canvas);
                
                this.audioDirector = this.integration.audioDirector;
                this.aiSystem = this.integration.aiSystem;
                this.postProcessing = this.integration.postProcessing;
                this.screenEffects = this.integration.screenEffects;

                // Set up enhanced rendering
                this._setupEnhancedRendering();

                // Set up AI behaviors
                this._setupAI Behaviors();

                console.log('[BloodTetris Enhanced] Systems initialized successfully');
                return true;
            } catch (error) {
                console.error('[BloodTetris Enhanced] Initialization failed:', error);
                return false;
            }
        },

        /**
         * Setup enhanced rendering pipeline
         */
        _setupEnhancedRendering() {
            // Store original render function
            if (this.originalGame) {
                this._originalRender = this.originalGame.render;
                this.originalGame.render = this._enhancedRender.bind(this);
            }
        },

        /**
         * Setup AI behaviors
         */
        _setupAIBehaviors() {
            if (!this.aiSystem) return;

            // Configure adaptive difficulty
            this.aiSystem.difficultyAdapter.targetPerformance = 0.65; // Slightly challenging
            this.aiSystem.difficultyAdapter.adjustmentRate = 0.03;
        },

        /**
         * Enhanced render function
         */
        _enhancedRender() {
            // Call original render to offscreen canvas
            if (this._originalRender) {
                this._originalRender.call(this.originalGame);
            }

            // Apply post-processing
            if (this.postProcessing && this.enhancedState.postProcessingEnabled) {
                const processedCanvas = this.integration.render(this.canvas);
                
                // Draw processed result
                if (processedCanvas !== this.canvas) {
                    this.ctx.drawImage(processedCanvas, 0, 0);
                }
            }

            // Apply screen shake
            if (this.screenEffects && this.enhancedState.shakeOffset) {
                const { x, y } = this.enhancedState.shakeOffset;
                if (x !== 0 || y !== 0) {
                    // Shake already applied by screen effects
                }
            }
        },

        /**
         * Update enhanced systems
         */
        update(dt, gameState) {
            if (!this.integration) return;

            // Build enhanced game state for integration
            const enhancedGameState = {
                ...gameState,
                combo: gameState.combo || 0,
                level: gameState.level || 1,
                curseActive: gameState.curseActive || false,
                score: gameState.score || 0,
                lines: gameState.lines || 0,
                tetrisJustCleared: gameState.lastClear === 4,
                performance: this._calculatePerformance(gameState)
            };

            // Update integration
            this.integration.update(dt, enhancedGameState);

            // Update enhanced state
            this.enhancedState.lastTetrisTime = (gameState.lastClear === 4) ? Date.now() : this.enhancedState.lastTetrisTime;
            this.enhancedState.comboMultiplier = 1 + (gameState.combo || 0) * 0.1;
        },

        /**
         * Calculate player performance for AI
         */
        _calculatePerformance(gameState) {
            const avgLinesPerMinute = (gameState.lines || 0) / Math.max(1, (gameState.totalTime || 1) / 60);
            const targetLines = 10; // Expected lines per minute
            return Math.min(1, avgLinesPerMinute / targetLines);
        },

        /**
         * Play sound effect with context
         */
        playSFX(context, options = {}) {
            if (!this.audioDirector || !this.enhancedState.audioEnabled) return;

            const trigger = this.audioTriggers[context];
            if (!trigger) return;

            // Chance-based playback
            if (Math.random() > trigger.chance) return;

            this.integration.playSFX(trigger.sfx, options);
        },

        /**
         * Trigger intensity change
         */
        triggerIntensity(amount) {
            if (this.audioDirector) {
                this.audioDirector.triggerIntensity(amount);
            }
        },

        /**
         * Trigger screen effects
         */
        triggerScreenEffect(effect, params) {
            if (!this.screenEffects) return;

            switch (effect) {
                case 'shake':
                    this.screenEffects.shake(params.intensity || 10, params.duration || 0.3);
                    break;
                case 'flash':
                    this.screenEffects.damageFlash(params.intensity || 0.5);
                    break;
                case 'glitch':
                    this.screenEffects.glitch(params.intensity || 0.3, params.duration || 0.5);
                    break;
                case 'darkness':
                    this.screenEffects.setDarkness(params.intensity || 0.5, params.vignette !== false);
                    break;
            }
        },

        /**
         * On game event handlers
         */
        onPieceMove() {
            this.playSFX('move');
        },

        onPieceRotate() {
            this.playSFX('rotate');
        },

        onPieceDrop() {
            this.playSFX('drop');
        },

        onLineClear(lines) {
            this.playSFX(`clear${lines}`);
            
            if (lines >= 4) {
                // TETRIS!
                this.triggerIntensity(0.4);
                this.triggerScreenEffect('glitch', { intensity: 0.5, duration: 0.5 });
                this.triggerScreenEffect('shake', { intensity: 15, duration: 0.4 });
            } else if (lines >= 2) {
                this.triggerIntensity(0.15);
            }

            // Combo intensity
            if (this.originalGame?.gameState?.combo > 1) {
                this.triggerIntensity(this.originalGame.gameState.combo * 0.05);
            }
        },

        onCurseTriggered() {
            this.playSFX('curse');
            this.triggerIntensity(0.3);
            this.triggerScreenEffect('chromatic', { intensity: 0.005 });
        },

        onPowerUpCollected(powerUp) {
            this.playSFX('powerup');
            this.triggerIntensity(0.15);
            this.triggerScreenEffect('flash', { intensity: 0.3 });
        },

        onGameOver() {
            this.triggerIntensity(-0.3);
            this.triggerScreenEffect('darkness', { intensity: 0.8, duration: 2 });
        },

        /**
         * Get AI-generated content
         */
        generateCurseTiming() {
            if (!this.aiSystem) return Math.random() * 20 + 15;

            const curseTiming = this.aiSystem.generateContent('curseTiming', {
                level: this.originalGame?.gameState?.level || 1,
                difficulty: this.aiSystem.difficultyAdapter?.getMultiplier() || 1
            });

            return curseTiming?.nextCurseTime || Math.random() * 20 + 15;
        },

        /**
         * Adjust drop speed based on AI
         */
        getAdjustedDropSpeed(baseSpeed) {
            if (!this.aiSystem || !this.enhancedState.aiEnabled) return baseSpeed;

            const multiplier = this.aiSystem.difficultyAdapter?.getMultiplier() || 1;
            return baseSpeed * multiplier;
        },

        /**
         * Toggle systems
         */
        toggleAudio(enabled) {
            this.enhancedState.audioEnabled = enabled;
            if (this.integration) {
                this.integration.toggleAudio(enabled);
            }
        },

        toggleAI(enabled) {
            this.enhancedState.aiEnabled = enabled;
        },

        togglePostProcessing(enabled) {
            this.enhancedState.postProcessingEnabled = enabled;
        },

        setQuality(quality) {
            this.enhancedState.quality = quality;
            if (this.integration) {
                this.integration.setPostProcessingQuality(quality);
                this.integration.setPerformanceMode(quality === 'low');
            }
        },

        /**
         * Get enhanced stats
         */
        getEnhancedStats() {
            return {
                base: this.originalGame?.getStats?.() || {},
                systems: this.integration?.getStats?.() || {},
                enhanced: this.enhancedState
            };
        },

        /**
         * Cleanup
         */
        dispose() {
            if (this.integration) {
                this.integration.dispose();
            }
        }
    };

    // ============================================
    // EXPORT
    // ============================================

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EnhancedBloodTetris;
    } else {
        global.EnhancedBloodTetris = EnhancedBloodTetris;
    }

})(typeof window !== 'undefined' ? window : this);
