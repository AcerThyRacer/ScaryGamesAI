/**
 * ============================================
 * ZOMBIE HORDE - PHASE 4-5-6 ENHANCEMENTS
 * ============================================
 * Complete integration of:
 * - Dynamic Audio Director (Phase 4)
 * - AI & Procedural Generation (Phase 5)
 * - Cinematic Post-Processing (Phase 6)
 */

(function(global) {
    'use strict';

    const EnhancedZombieHorde = {
        integration: null,
        audioDirector: null,
        aiSystem: null,
        postProcessing: null,
        screenEffects: null,

        enhancedState: {
            audioEnabled: true,
            aiEnabled: true,
            postProcessingEnabled: true,
            zombieAICount: 0,
            swarmIntensity: 0,
            threatLevel: 0
        },

        // AI entity types
        aiEntityTypes: {
            zombie: 'zombie',
            boss: 'boss',
            turret: 'turret'
        },

        async init(canvas, ctx, originalGame) {
            this.originalGame = originalGame;
            this.canvas = canvas;
            this.ctx = ctx;

            console.log('[ZombieHorde Enhanced] Initializing Phase 4-5-6 systems...');

            try {
                this.integration = new Phase456Integration();
                await this.integration.init('zombie-horde', canvas);
                
                this.audioDirector = this.integration.audioDirector;
                this.aiSystem = this.integration.aiSystem;
                this.postProcessing = this.integration.postProcessing;
                this.screenEffects = this.integration.screenEffects;

                this._setupAIBehaviors();
                this._setupEnhancedRendering();

                console.log('[ZombieHorde Enhanced] Systems initialized');
                return true;
            } catch (error) {
                console.error('[ZombieHorde Enhanced] Init failed:', error);
                return false;
            }
        },

        _setupAIBehaviors() {
            if (!this.aiSystem) return;

            // Configure difficulty adaptation
            this.aiSystem.difficultyAdapter.targetPerformance = 0.6;
            this.aiSystem.difficultyAdapter.adjustmentRate = 0.04;
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
                wave: gameState.wave || 1,
                zombies: gameState.zombies || [],
                baseHP: gameState.baseHP || 100,
                combat: (gameState.zombies?.length || 0) > 0,
                explosionOccurred: gameState.explosionJustHappened,
                baseTookDamage: gameState.damageJustTaken,
                turretFired: gameState.turretJustFired,
                performance: this._calculatePerformance(gameState)
            };

            this.integration.update(dt, enhancedGameState);

            // Update AI for zombies
            if (this.enhancedState.aiEnabled && gameState.zombies) {
                this._updateZombieAI(gameState.zombies, dt);
            }

            // Track swarm intensity
            this.enhancedState.zombieAICount = gameState.zombies?.length || 0;
            this.enhancedState.swarmIntensity = Math.min(1, this.enhancedState.zombieAICount / 100);
            this.enhancedState.threatLevel = this._calculateThreatLevel(gameState);
        },

        _updateZombieAI(zombies, dt) {
            const tree = this.aiSystem.getBehaviorTree('zombie');
            if (!tree) return;

            zombies.forEach(zombie => {
                // Update blackboard
                tree.setValue('isBoss', zombie.isBoss || false);
                tree.setValue('isPlayerInRange', zombie.targetDistance < 30);
                tree.setValue('hasTarget', zombie.hasTarget !== false);

                // Execute behavior tree
                const action = tree.update(zombie, {}, dt);
                
                // Apply AI decision
                this._applyZombieAction(zombie, action);
            });
        },

        _applyZombieAction(zombie, action) {
            switch (action) {
                case 'attack':
                    zombie.attackDecision = 'attack';
                    break;
                case 'moveToTarget':
                    zombie.attackDecision = 'chase';
                    break;
                case 'wander':
                    zombie.attackDecision = 'wander';
                    break;
                case 'executeBossAbility':
                    zombie.useAbility = true;
                    break;
            }
        },

        _calculatePerformance(gameState) {
            const waveProgress = (gameState.wave || 1) / Math.max(1, gameState.totalTime / 60);
            const killRate = (gameState.kills || 0) / Math.max(1, gameState.totalTime / 60);
            return Math.min(1, (waveProgress * 0.5 + killRate * 0.05));
        },

        _calculateThreatLevel(gameState) {
            const zombieCount = gameState.zombies?.length || 0;
            const bossCount = gameState.zombies?.filter(z => z.isBoss)?.length || 0;
            const baseHPPercent = (gameState.baseHP || 100) / 100;
            
            return Math.min(1, (zombieCount * 0.01 + bossCount * 0.2 + (1 - baseHPPercent) * 0.3));
        },

        playSFX(context, options = {}) {
            if (!this.audioDirector || !this.enhancedState.audioEnabled) return;

            const triggers = {
                zombieSpawn: 'zombie:groan',
                zombieStep: 'zombie:step',
                zombieBite: 'zombie:bite',
                zombieDeath: 'zombie:death',
                explosion: 'zombie:explosion',
                turretFire: 'turret:fire',
                turretReload: 'turret:reload'
            };

            const sfx = triggers[context];
            if (sfx) {
                this.integration.playSFX(sfx, options);
            }
        },

        triggerIntensity(amount) {
            if (this.audioDirector) {
                this.audioDirector.triggerIntensity(amount);
            }
        },

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
                    this.screenEffects.setDarkness(params.intensity || 0.5);
                    break;
            }
        },

        // Event handlers
        onZombieSpawn(zombie) {
            if (Math.random() < 0.3) {
                this.playSFX('zombieSpawn', { position: { x: zombie.x, y: zombie.y } });
            }
        },

        onZombieDeath(zombie) {
            this.playSFX('zombieDeath', { position: { x: zombie.x, y: zombie.y } });
            
            if (zombie.isBoss) {
                this.triggerIntensity(-0.5);
                this.triggerScreenEffect('shake', { intensity: 20, duration: 0.5 });
            }
        },

        onExplosion(position) {
            this.playSFX('explosion', { position });
            this.triggerIntensity(0.2);
            this.triggerScreenEffect('shake', { intensity: 15, duration: 0.3 });
            this.triggerScreenEffect('flash', { intensity: 0.4 });
        },

        onTurretFire(turret, target) {
            if (Math.random() < 0.5) {
                this.playSFX('turretFire');
            }
        },

        onBaseDamage(amount) {
            this.triggerScreenEffect('flash', { intensity: 0.5 });
            this.triggerIntensity(0.15);
        },

        onWaveStart(waveNumber) {
            this.triggerIntensity(0.2);
            this.playSFX('zombieSpawn');
            
            if (waveNumber % 5 === 0) {
                // Boss wave
                setTimeout(() => this.onBossSpawn(), 1000);
            }
        },

        onBossSpawn() {
            this.triggerIntensity(0.5);
            this.playSFX('zombie:groan');
            this.triggerScreenEffect('darkness', { intensity: 0.4 });
        },

        // AI content generation
        generateWave(waveNumber, availableEnemies) {
            if (!this.aiSystem) return null;

            return this.aiSystem.generateContent('wave', {
                waveNumber,
                availableEnemies,
                difficulty: this.aiSystem.difficultyAdapter?.getMultiplier() || 1
            });
        },

        getRecommendedDifficulty() {
            return this.aiSystem?.difficultyAdapter?.getRecommendedLevel() || 'normal';
        },

        // Toggle systems
        toggleAudio(enabled) {
            this.enhancedState.audioEnabled = enabled;
            this.integration?.toggleAudio(enabled);
        },

        toggleAI(enabled) {
            this.enhancedState.aiEnabled = enabled;
        },

        togglePostProcessing(enabled) {
            this.enhancedState.postProcessingEnabled = enabled;
        },

        setQuality(quality) {
            this.enhancedState.quality = quality;
            this.integration?.setPostProcessingQuality(quality);
            this.integration?.setPerformanceMode(quality === 'low');
        },

        getEnhancedStats() {
            return {
                base: this.originalGame?.getStats?.() || {},
                systems: this.integration?.getStats?.() || {},
                enhanced: {
                    ...this.enhancedState,
                    zombieCount: this.enhancedState.zombieAICount,
                    threatLevel: this.enhancedState.threatLevel
                }
            };
        },

        dispose() {
            this.integration?.dispose();
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EnhancedZombieHorde;
    } else {
        global.EnhancedZombieHorde = EnhancedZombieHorde;
    }

})(typeof window !== 'undefined' ? window : this);
