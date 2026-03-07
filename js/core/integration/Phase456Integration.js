/**
 * ============================================
 * SGAI PHASE 4-5-6 UNIFIED INTEGRATION
 * ============================================
 * Complete integration package for all 8 horror games
 * 
 * Integrates:
 * - Phase 4: Dynamic Audio Director
 * - Phase 5: AI & Procedural Generation
 * - Phase 6: Cinematic Post-Processing
 * 
 * Usage:
 *   const integration = new Phase456Integration();
 *   await integration.init('blood-tetris', canvas);
 *   integration.update(dt);
 */

(function(global) {
    'use strict';

    // ============================================
    // PHASE 4-5-6 INTEGRATION MANAGER
    // ============================================

    class Phase456Integration {
        constructor() {
            this.audioDirector = null;
            this.aiSystem = null;
            this.postProcessing = null;
            this.screenEffects = null;
            this.initialized = false;
            this.currentGame = null;
            this.canvas = null;
            this.enabled = {
                audio: true,
                ai: true,
                postProcessing: true
            };
            
            // Game-specific configurations
            this.gameConfigs = {
                'blood-tetris': {
                    postProcessingPreset: 'horror',
                    audioIntensityBase: 0.3,
                    aiFeatures: ['adaptiveSpeed', 'curseTiming'],
                    bloomColor: '#cc2222',
                    glitchOnTetris: true
                },
                'ritual-circle': {
                    postProcessingPreset: 'mystical',
                    audioIntensityBase: 0.4,
                    aiFeatures: ['enemyPathfinding', 'waveComposition'],
                    darknessOnWave: true,
                    chromaticOnSpell: true
                },
                'zombie-horde': {
                    postProcessingPreset: 'intense',
                    audioIntensityBase: 0.5,
                    aiFeatures: ['zombieBehavior', 'swarmTactics', 'bossAI'],
                    shakeOnExplosion: true,
                    redFlashOnDamage: true
                },
                'seance': {
                    postProcessingPreset: 'horror',
                    audioIntensityBase: 0.6,
                    aiFeatures: ['spiritBehavior', 'hauntingPatterns'],
                    darknessBasedOnSanity: true,
                    glitchOnHaunting: true
                },
                'crypt-tanks': {
                    postProcessingPreset: 'cinematic',
                    audioIntensityBase: 0.4,
                    aiFeatures: ['enemyFlanking', 'coverUsage', 'projectileAiming'],
                    bloomOnExplosion: true,
                    shakeOnFire: true
                },
                'yeti-run': {
                    postProcessingPreset: 'intense',
                    audioIntensityBase: 0.5,
                    aiFeatures: ['obstacleGeneration', 'chaseAI'],
                    motionBlurOnSpeed: true,
                    glitchOnNearMiss: true
                },
                'nightmare-run': {
                    postProcessingPreset: 'horror',
                    audioIntensityBase: 0.55,
                    aiFeatures: ['levelGeneration', 'enemyPlacement'],
                    darknessOnFear: true,
                    chromaticOnDamage: true
                },
                'cursed-arcade': {
                    postProcessingPreset: 'retro',
                    audioIntensityBase: 0.4,
                    aiFeatures: ['adaptivePatterns', 'curseSelection'],
                    scanlinesAlways: true,
                    glitchOnCurse: true
                }
            };
        }

        /**
         * Initialize all Phase 4-5-6 systems
         */
        async init(gameId, canvas) {
            this.currentGame = gameId;
            this.canvas = canvas;
            this.config = this.gameConfigs[gameId] || this.gameConfigs['blood-tetris'];

            console.log(`[Phase456] Initializing for ${gameId}...`);

            // Initialize Audio Director (Phase 4)
            if (this.enabled.audio) {
                try {
                    this.audioDirector = new DynamicAudioDirector();
                    await this.audioDirector.init(gameId);
                    this.audioDirector.play();
                    console.log('[Phase456] Audio Director initialized');
                } catch (error) {
                    console.error('[Phase456] Audio Director failed:', error);
                }
            }

            // Initialize AI System (Phase 5)
            if (this.enabled.ai) {
                try {
                    this.aiSystem = new AISystem();
                    await this.aiSystem.init(gameId);
                    console.log('[Phase456] AI System initialized');
                } catch (error) {
                    console.error('[Phase456] AI System failed:', error);
                }
            }

            // Initialize Post-Processing (Phase 6)
            if (this.enabled.postProcessing && canvas) {
                try {
                    this.postProcessing = new PostProcessingStack(canvas);
                    this.postProcessing.applyPreset(this.config.postProcessingPreset);
                    this.postProcessing.resize(canvas.width, canvas.height);
                    
                    this.screenEffects = new ScreenEffects(this.postProcessing);
                    console.log('[Phase456] Post-Processing initialized');
                } catch (error) {
                    console.error('[Phase456] Post-Processing failed:', error);
                }
            }

            this.initialized = true;
            console.log('[Phase456] All systems initialized successfully');
            return true;
        }

        /**
         * Update all systems (call every frame)
         */
        update(dt, gameState) {
            if (!this.initialized) return;

            // Update Audio Director
            if (this.enabled.audio && this.audioDirector) {
                this._updateAudio(gameState);
                this.audioDirector.update(dt);
            }

            // Update AI System
            if (this.enabled.ai && this.aiSystem) {
                this._updateAI(gameState, dt);
            }

            // Update Post-Processing
            if (this.enabled.postProcessing && this.postProcessing) {
                this._updatePostProcessing(gameState, dt);
            }
        }

        /**
         * Update audio based on game state
         */
        _updateAudio(gameState) {
            if (!this.audioDirector) return;

            const config = this.config;
            let targetIntensity = config.audioIntensityBase;

            // Game-specific intensity calculations
            switch (this.currentGame) {
                case 'blood-tetris':
                    targetIntensity += (gameState.combo || 0) * 0.05;
                    targetIntensity += (gameState.level || 1) * 0.03;
                    if (gameState.curseActive) targetIntensity += 0.3;
                    break;

                case 'ritual-circle':
                    targetIntensity += (gameState.wave || 0) * 0.02;
                    targetIntensity += (gameState.enemies?.length || 0) * 0.03;
                    if (gameState.circleHP < 30) targetIntensity += 0.3;
                    break;

                case 'zombie-horde':
                    targetIntensity += (gameState.wave || 0) * 0.02;
                    targetIntensity += Math.min(0.5, (gameState.zombies?.length || 0) * 0.02);
                    if (gameState.baseHP < 30) targetIntensity += 0.3;
                    break;

                case 'seance':
                    targetIntensity += (gameState.evidence?.length || 0) * 0.1;
                    targetIntensity += (1 - (gameState.sanity || 100) / 100) * 0.4;
                    if (gameState.haunting) targetIntensity += 0.4;
                    break;

                case 'crypt-tanks':
                    targetIntensity += (gameState.enemies?.length || 0) * 0.03;
                    targetIntensity += (gameState.combat ? 0.3 : 0);
                    break;

                case 'yeti-run':
                case 'nightmare-run':
                    targetIntensity += gameState.speed * 0.01;
                    targetIntensity += (gameState.obstaclesPassed || 0) * 0.02;
                    if (gameState.chaseActive) targetIntensity += 0.4;
                    break;

                case 'cursed-arcade':
                    targetIntensity += (gameState.score || 0) * 0.001;
                    if (gameState.curseActive) targetIntensity += 0.4;
                    break;
            }

            this.audioDirector.setIntensity(Math.min(1, targetIntensity));
        }

        /**
         * Update AI based on game state
         */
        _updateAI(gameState, dt) {
            if (!this.aiSystem) return;

            // Adjust difficulty based on player performance
            if (gameState.performance !== undefined) {
                this.aiSystem.adjustDifficulty({
                    performance: gameState.performance,
                    score: gameState.score || 0,
                    deaths: gameState.deaths || 0,
                    time: gameState.time || 0
                });
            }

            // Generate procedural content if needed
            if (gameState.needNewWave) {
                const wave = this.aiSystem.generateContent('wave', {
                    waveNumber: gameState.wave || 1,
                    availableEnemies: gameState.availableEnemies || [],
                    difficulty: this.aiSystem.difficultyAdapter?.getMultiplier() || 1
                });
                gameState.newWave = wave;
                gameState.needNewWave = false;
            }

            if (gameState.needNewLevel) {
                const level = this.aiSystem.generateContent('level', {
                    width: gameState.levelWidth || 100,
                    height: gameState.levelHeight || 100,
                    difficulty: this.aiSystem.difficultyAdapter?.getMultiplier() || 1
                });
                gameState.newLevel = level;
                gameState.needNewLevel = false;
            }

            if (gameState.needObstacles) {
                const obstacles = this.aiSystem.generateContent('obstacles', {
                    length: gameState.pathLength || 50,
                    difficulty: this.aiSystem.difficultyAdapter?.getMultiplier() || 1,
                    pattern: gameState.obstaclePattern
                });
                gameState.newObstacles = obstacles;
                gameState.needObstacles = false;
            }
        }

        /**
         * Update post-processing based on game state
         */
        _updatePostProcessing(gameState, dt) {
            if (!this.postProcessing) return;

            const config = this.config;
            const effects = this.screenEffects;

            // Game-specific post-processing effects
            switch (this.currentGame) {
                case 'blood-tetris':
                    // Glitch on tetris clear
                    if (config.glitchOnTetris && gameState.tetrisJustCleared) {
                        effects.glitch(0.5, 0.5);
                        gameState.tetrisJustCleared = false;
                    }
                    // Chromatic on curse
                    if (gameState.curseActive) {
                        this.postProcessing.enableEffect('chromaticAberration', true);
                        this.postProcessing.setEffectParams('chromaticAberration', { intensity: 0.005 });
                    } else {
                        this.postProcessing.enableEffect('chromaticAberration', false);
                    }
                    break;

                case 'ritual-circle':
                    // Darkness on wave start
                    if (config.darknessOnWave && gameState.waveJustStarted) {
                        effects.setDarkness(0.8, true);
                        gameState.waveJustStarted = false;
                    }
                    // Chromatic on spell cast
                    if (config.chromaticOnSpell && gameState.spellJustCast) {
                        effects.glitch(0.3, 0.3);
                        gameState.spellJustCast = false;
                    }
                    break;

                case 'zombie-horde':
                    // Shake on explosion
                    if (config.shakeOnExplosion && gameState.explosionOccurred) {
                        effects.shake(15, 0.3);
                        gameState.explosionOccurred = false;
                    }
                    // Red flash on damage
                    if (config.redFlashOnDamage && gameState.baseTookDamage) {
                        effects.damageFlash(0.5);
                        gameState.baseTookDamage = false;
                    }
                    // Increase darkness with wave
                    this.postProcessing.enableEffect('darkness', true);
                    this.postProcessing.setEffectParams('darkness', {
                        intensity: Math.min(0.6, 0.2 + (gameState.wave || 0) * 0.02)
                    });
                    break;

                case 'seance':
                    // Darkness based on sanity
                    if (config.darknessBasedOnSanity) {
                        const sanity = gameState.sanity || 100;
                        const darknessIntensity = (100 - sanity) / 100 * 0.8;
                        this.postProcessing.enableEffect('darkness', true);
                        this.postProcessing.setEffectParams('darkness', {
                            intensity: darknessIntensity,
                            vignette: true
                        });
                    }
                    // Glitch on haunting
                    if (config.glitchOnHaunting && gameState.hauntingOccurred) {
                        effects.glitch(0.6, 0.4);
                        gameState.hauntingOccurred = false;
                    }
                    break;

                case 'crypt-tanks':
                    // Bloom on explosion
                    if (config.bloomOnExplosion && gameState.explosionOccurred) {
                        this.postProcessing.setEffectParams('bloom', { intensity: 0.8, radius: 20 });
                        setTimeout(() => {
                            this.postProcessing.setEffectParams('bloom', { intensity: 0.5, radius: 10 });
                        }, 300);
                        gameState.explosionOccurred = false;
                    }
                    // Shake on fire
                    if (config.shakeOnFire && gameState.turretFired) {
                        effects.shake(3, 0.1);
                        gameState.turretFired = false;
                    }
                    break;

                case 'yeti-run':
                case 'nightmare-run':
                    // Motion blur on speed
                    if (config.motionBlurOnSpeed) {
                        const speed = gameState.speed || 0;
                        this.postProcessing.enableEffect('radialBlur', speed > 0.8);
                        this.postProcessing.setEffectParams('radialBlur', {
                            intensity: speed * 0.03,
                            centerX: 0.5,
                            centerY: 0.5
                        });
                    }
                    // Glitch on near miss
                    if (config.glitchOnNearMiss && gameState.nearMissOccurred) {
                        effects.glitch(0.4, 0.3);
                        gameState.nearMissOccurred = false;
                    }
                    // Darkness on fear
                    if (config.darknessOnFear && gameState.fearLevel) {
                        this.postProcessing.enableEffect('darkness', true);
                        this.postProcessing.setEffectParams('darkness', {
                            intensity: gameState.fearLevel * 0.7
                        });
                    }
                    break;

                case 'cursed-arcade':
                    // Scanlines always on
                    if (config.scanlinesAlways) {
                        this.postProcessing.enableEffect('scanlines', true);
                    }
                    // Glitch on curse
                    if (config.glitchOnCurse && gameState.curseActive) {
                        this.postProcessing.enableEffect('glitch', true);
                        this.postProcessing.setEffectParams('glitch', {
                            intensity: 0.3,
                            frequency: 0.2
                        });
                    } else {
                        this.postProcessing.enableEffect('glitch', false);
                    }
                    // Chromatic on boss
                    if (gameState.bossActive) {
                        this.postProcessing.enableEffect('chromaticAberration', true);
                    } else {
                        this.postProcessing.enableEffect('chromaticAberration', false);
                    }
                    break;
            }

            // Update screen effects
            if (effects) {
                const shakeOffset = effects.update(dt);
                // Apply shake to canvas if needed
                if (shakeOffset.x !== 0 || shakeOffset.y !== 0) {
                    // Canvas transform would be applied in game's render loop
                    gameState.shakeOffset = shakeOffset;
                }
            }
        }

        /**
         * Render post-processing effects
         */
        render(sourceCanvas) {
            if (!this.postProcessing || !this.enabled.postProcessing) {
                return sourceCanvas;
            }

            this.postProcessing.render(sourceCanvas);
            return this.postProcessing.canvas;
        }

        /**
         * Play sound effect
         */
        playSFX(sfxId, options) {
            if (this.audioDirector && this.enabled.audio) {
                return this.audioDirector.playSFX(sfxId, options);
            }
            return null;
        }

        /**
         * Play 3D spatial sound
         */
        playSpatialSFX(sfxId, position, listenerPosition) {
            if (this.audioDirector && this.enabled.audio) {
                return this.audioDirector.playSpatialSFX(sfxId, position, listenerPosition);
            }
            return null;
        }

        /**
         * Get AI action for entity
         */
        getAIAction(entityType, entity, gameState) {
            if (this.aiSystem && this.enabled.ai) {
                return this.aiSystem.updateAI(entity, entityType, gameState, 0.016);
            }
            return null;
        }

        /**
         * Set audio volume
         */
        setVolumes(master, music, sfx) {
            if (this.audioDirector) {
                if (master !== undefined) this.audioDirector.setMasterVolume(master);
                if (music !== undefined) this.audioDirector.setMusicVolume(music);
                if (sfx !== undefined) this.audioDirector.setSFXVolume(sfx);
            }
        }

        /**
         * Toggle systems
         */
        toggleAudio(enabled) {
            this.enabled.audio = enabled;
            if (this.audioDirector) {
                this.audioDirector.setEnabled(enabled);
            }
        }

        toggleAI(enabled) {
            this.enabled.ai = enabled;
        }

        togglePostProcessing(enabled) {
            this.enabled.postProcessing = enabled;
        }

        /**
         * Set post-processing quality
         */
        setPostProcessingQuality(quality) {
            if (this.postProcessing) {
                this.postProcessing.setQuality(quality);
            }
        }

        /**
         * Enable performance mode
         */
        setPerformanceMode(enabled) {
            if (this.postProcessing) {
                this.postProcessing.setPerformanceMode(enabled);
            }
        }

        /**
         * Get system statistics
         */
        getStats() {
            const stats = {
                audio: this.audioDirector ? {
                    intensity: this.audioDirector.getIntensity(),
                    playing: this.audioDirector.isPlaying
                } : null,
                ai: this.aiSystem ? {
                    difficulty: this.aiSystem.difficultyAdapter?.getMultiplier() || 1,
                    recommendedLevel: this.aiSystem.difficultyAdapter?.getRecommendedLevel() || 'normal'
                } : null,
                postProcessing: this.postProcessing ? this.postProcessing.getStats() : null
            };
            return stats;
        }

        /**
         * Cleanup
         */
        dispose() {
            if (this.audioDirector) {
                this.audioDirector.dispose();
            }
            if (this.postProcessing) {
                this.postProcessing.dispose();
            }
            this.initialized = false;
        }
    }

    // ============================================
    // GAME-SPECIFIC AUDIO TRIGGERS
    // ============================================

    const GameAudioTriggers = {
        'blood-tetris': {
            onPieceDrop: (integration) => integration.playSFX('tetris:drop'),
            onPieceRotate: (integration) => integration.playSFX('tetris:rotate'),
            onLineClear: (integration, lines) => {
                if (lines >= 4) {
                    integration.playSFX('tetris:tetris');
                } else {
                    integration.playSFX('tetris:clear');
                }
            },
            onCurse: (integration) => integration.playSFX('tetris:curse'),
            onPowerUp: (integration) => integration.playSFX('tetris:powerup')
        },
        'zombie-horde': {
            onZombieSpawn: (integration) => integration.playSFX('zombie:groan'),
            onTurretFire: (integration, turretType) => integration.playSFX('turret:fire'),
            onExplosion: (integration) => integration.playSFX('zombie:explosion'),
            onBossSpawn: (integration) => {
                integration.audioDirector?.setIntensity(0.9);
                integration.playSFX('horror:creak');
            }
        },
        'ritual-circle': {
            onTrapPlace: (integration) => integration.playSFX('ritual:place'),
            onSpellCast: (integration) => integration.playSFX('ritual:spell'),
            onWaveStart: (integration) => integration.playSFX('ritual:wave'),
            onDamage: (integration) => integration.playSFX('horror:heartbeat')
        },
        'seance': {
            onEvidenceFound: (integration) => integration.playSFX('horror:glass'),
            onHaunting: (integration) => {
                integration.playSFX('horror:creak');
                integration.playSFX('horror:whisper');
            },
            onSpiritNear: (integration) => integration.playSFX('horror:breath')
        }
    };

    // ============================================
    // EXPORT
    // ============================================

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            Phase456Integration,
            GameAudioTriggers
        };
    } else {
        global.Phase456Integration = Phase456Integration;
        global.GameAudioTriggers = GameAudioTriggers;
    }

})(typeof window !== 'undefined' ? window : this);
