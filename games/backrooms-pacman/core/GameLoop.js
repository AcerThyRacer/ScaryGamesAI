/* ============================================
   Backrooms: Pac-Man - Core Game Loop
   Modular architecture for 2026 performance
   ============================================ */

export class GameLoop {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.lastTime = 0;
        this.lastFrameTime = 0;
        this.accumulator = 0;
        this.fixedStep = 1 / 60;
        this.maxSubSteps = 5;
        this.renderTime = 0;
        this.isRunning = false;
        this.freezeDetectionInterval = null;
    }

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.lastFrameTime = this.lastTime;
        this.setupFreezeDetection();
        this.requestAnimation();
    }

    stop() {
        this.isRunning = false;
        if (this.freezeDetectionInterval) {
            clearInterval(this.freezeDetectionInterval);
            this.freezeDetectionInterval = null;
        }
    }

    setupFreezeDetection() {
        // Integrated freeze detection - no separate setInterval
        this.freezeDetectionInterval = setInterval(() => {
            if (!this.isRunning) return;
            const now = performance.now();
            if (this.lastFrameTime > 0 && (now - this.lastFrameTime) > 2000) {
                console.warn('[Backrooms] Freeze detected! Recovering...');
                this.lastTime = now;
                this.requestAnimation();
            }
        }, 1000);
    }

    requestAnimation() {
        if (!this.isRunning) return;
        requestAnimationFrame((time) => this.tick(time));
    }

    tick(time) {
        if (!this.isRunning) return;
        
        this.requestAnimation();
        if (!time) time = performance.now();

        let frameDt = (time - this.lastTime) / 1000;
        if (!isFinite(frameDt) || frameDt < 0) frameDt = 0;
        
        // Clamp to prevent spiral of death
        if (frameDt > 0.25) frameDt = 0.25;
        
        this.lastTime = time;
        this.lastFrameTime = time;
        this.renderTime += frameDt;
        this.accumulator += frameDt;

        try {
            // Update subsystems
            this.updateSubsystems(frameDt);

            // Fixed timestep physics/logic updates
            let subSteps = 0;
            while (this.accumulator >= this.fixedStep && subSteps < this.maxSubSteps) {
                this.game.capturePrevState();
                this.game.updateAbilityTimers(this.fixedStep);
                this.game.updatePlayer(this.fixedStep);
                this.game.updatePacman(this.fixedStep);
                this.game.updatePellets();
                this.game.updateFlickeringLights(this.fixedStep);
                this.game.updateBlackout(this.fixedStep);
                this.game.updateExtraSpawns(this.fixedStep);
                this.game.updateVisualAtmosphere(this.fixedStep);
                
                // Audio update (Phase 8)
                if (typeof Phase8AudioIntegration !== 'undefined' && Phase8AudioIntegration.update) {
                    Phase8AudioIntegration.update(
                        this.fixedStep,
                        this.game.playerPos,
                        this.game.pacman ? this.game.pacman.position : null,
                        {
                            isRunning: this.game.isRunning,
                            isMoving: this.game.currentSpeed > 0.1,
                            blackoutActive: this.game.blackoutActive,
                            jumpscareActive: false
                        }
                    );
                } else {
                    this.game.updateAudioSystem(this.fixedStep);
                }

                this.game.checkSecretRoomDiscovery();
                this.game.updateProgressionSystems(this.fixedStep);

                // Phase 3 & 4 Integration
                if (typeof Phase3_4_Integration !== 'undefined') {
                    Phase3_4_Integration.update(
                        this.fixedStep,
                        this.game.playerPos,
                        this.game.pacman ? this.game.pacman.position : null,
                        {
                            blackoutActive: this.game.blackoutActive,
                            sanity: typeof SanitySystem !== 'undefined' ? SanitySystem.getSanity() : 100,
                            stress: typeof StressSystem !== 'undefined' ? StressSystem.getStress() : 0
                        }
                    );
                }

                // Phase 1 updates
                if (typeof AdvancedLighting !== 'undefined') {
                    AdvancedLighting.updateLights(this.fixedStep, this.renderTime);
                }
                if (typeof DecaySystem !== 'undefined') {
                    const currentSanity = (typeof BackroomsEnhancements !== 'undefined') ? 
                        BackroomsEnhancements.sanity.sanity : 100;
                    DecaySystem.update(this.fixedStep, this.game.playerPos, 
                        this.game.pacman ? this.game.pacman.position : null, currentSanity);
                }
                if (typeof DynamicEnvironment !== 'undefined') {
                    const currentSanity2 = (typeof BackroomsEnhancements !== 'undefined') ? 
                        BackroomsEnhancements.sanity.sanity : 100;
                    DynamicEnvironment.update(this.fixedStep, this.game.playerPos, 
                        this.game.pacman ? this.game.pacman.position : null, currentSanity2, this.game.blackoutActive);
                }

                // Phase 2: AI Systems
                if (typeof Phase2AIIntegration !== 'undefined') {
                    const allPacmans = [];
                    if (this.game.pacman) allPacmans.push(this.game.pacman);
                    if (this.game.extraPacmans && this.game.extraPacmans.length) {
                        allPacmans.push(...this.game.extraPacmans);
                    }
                    
                    Phase2AIIntegration.update(
                        this.fixedStep,
                        this.game.playerPos,
                        this.game.pacman ? this.game.pacman.position : null,
                        this.game.extraPacmans,
                        {
                            isRunning: this.game.isRunning,
                            nearEnemies: allPacmans.length,
                            gameState: this.game.gameState
                        }
                    );
                }

                this.accumulator -= this.fixedStep;
                subSteps++;
            }

            // Warn if we hit max substeps (performance issue)
            if (subSteps >= this.maxSubSteps) {
                console.warn('[GameLoop] Hit max substeps!', subSteps);
            }

            // Interpolation for smooth rendering
            const alpha = this.accumulator / this.fixedStep;
            this.game.applyInterpolatedRender(alpha);

            // Render the scene
            this.game.render();

            // Restore state after render
            this.game.restoreAfterRender();

        } catch (error) {
            console.error('[GameLoop] Error:', error);
            // Recovery: reset accumulator to prevent spiral
            this.accumulator = 0;
        }
    }

    updateSubsystems(frameDt) {
        // Challenge manager
        if (window.ChallengeManager) {
            ChallengeManager.notify('backrooms-pacman', 'time', this.game.gameElapsed);
        }

        // AI Game Master
        if (typeof SGAIAI !== 'undefined' && SGAIAI.getFeatures().aiGameMaster) {
            const directorInstructions = SGAIAI.updateGameMaster({
                player: {
                    health: 100,
                    inDanger: this.game.visualIntensity > 0.5,
                    inSafeZone: false,
                    position: { x: this.game.playerPos.x, z: this.game.playerPos.z },
                },
                enemies: {
                    nearby: 1 + this.game.extraPacmans.length,
                },
                environment: {
                    dark: true,
                },
            }, frameDt);

            if (directorInstructions && directorInstructions.recommendations) {
                directorInstructions.recommendations.forEach(rec => {
                    if (rec.system === 'horror' && rec.params) {
                        // Could trigger personalized horror events
                    }
                });
            }
        }

        // Dynamic Difficulty
        if (typeof SGAIAI !== 'undefined' && SGAIAI.getFeatures().dynamicDifficulty !== 'basic') {
            SGAIAI.recordDifficultyEvent('time_in_danger', {
                inDanger: this.game.visualIntensity > 0.6,
            });
        }
    }

    dispose() {
        this.stop();
    }
}
