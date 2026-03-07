/**
 * ============================================
 * CRYPT TANKS - PHASE 4-5-6 ENHANCEMENTS
 * ============================================
 * Tactical combat enhancements
 */

(function(global) {
    'use strict';

    const EnhancedCryptTanks = {
        integration: null,
        audioDirector: null,
        aiSystem: null,
        postProcessing: null,
        screenEffects: null,

        enhancedState: {
            audioEnabled: true,
            aiEnabled: true,
            postProcessingEnabled: true,
            combatIntensity: 0,
            enemyCount: 0
        },

        async init(canvas, ctx, originalGame) {
            this.originalGame = originalGame;
            this.canvas = canvas;

            console.log('[CryptTanks Enhanced] Initializing...');

            try {
                this.integration = new Phase456Integration();
                await this.integration.init('crypt-tanks', canvas);
                
                this.audioDirector = this.integration.audioDirector;
                this.aiSystem = this.integration.aiSystem;
                this.postProcessing = this.integration.postProcessing;
                this.screenEffects = this.integration.screenEffects;

                this._setupEnhancedRendering();
                this._setupTacticalAI();
                console.log('[CryptTanks Enhanced] Ready');
                return true;
            } catch (error) {
                console.error('[CryptTanks Enhanced] Init failed:', error);
                return false;
            }
        },

        _setupEnhancedRendering() {
            if (this.originalGame) {
                this._originalRender = this.originalGame.render;
                this.originalGame.render = this._enhancedRender.bind(this);
            }
        },

        _setupTacticalAI() {
            if (!this.aiSystem) return;
            this.aiSystem._createEnemyBehaviorTree();
            this.aiSystem._createTacticalAI();
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
                enemies: gameState.enemies || [],
                combat: gameState.combat || false,
                explosionOccurred: gameState.explosionJustHappened,
                turretFired: gameState.turretJustFired,
                performance: this._calculatePerformance(gameState)
            };

            this.integration.update(dt, enhancedGameState);

            // Update enemy AI
            if (this.enhancedState.aiEnabled && gameState.enemies) {
                this._updateEnemyAI(gameState.enemies);
            }

            this.enhancedState.enemyCount = gameState.enemies?.length || 0;
            this.enhancedState.combatIntensity = Math.min(1, this.enhancedState.enemyCount / 10);
        },

        _updateEnemyAI(enemies) {
            const tree = this.aiSystem?.getBehaviorTree('enemy');
            const utilityAI = this.aiSystem?.getUtilityAI('tactical');
            
            enemies.forEach(enemy => {
                if (tree) {
                    tree.setValue('isUnderFire', enemy.underFire || false);
                    tree.setValue('isLowHealth', (enemy.hp / enemy.maxHp) < 0.3);
                    tree.setValue('hasCoverNearby', enemy.coverNearby || false);
                    tree.setValue('isPlayerInRange', enemy.playerInRange || false);
                    
                    const action = tree.update(enemy, {}, 0.016);
                    this._applyEnemyAction(enemy, action);
                }

                if (utilityAI) {
                    const agent = {
                        underFire: enemy.underFire || false,
                        hp: enemy.hp || 100,
                        maxHp: enemy.maxHp || 100,
                        coverDistance: enemy.coverDistance || 100,
                        targetVisible: enemy.targetVisible || false,
                        ammo: enemy.ammo || 100,
                        maxAmmo: 100,
                        targetDistance: enemy.targetDistance || 100,
                        teammatesAttacking: enemy.teammatesAttacking || false,
                        flankRouteClear: enemy.flankRouteClear || false
                    };
                    
                    const action = utilityAI.selectAction(agent, {});
                    this._applyTacticalAction(enemy, action);
                }
            });
        },

        _applyEnemyAction(enemy, action) {
            switch (action) {
                case 'moveToCover':
                    enemy.decision = 'takeCover';
                    break;
                case 'attack':
                    enemy.decision = 'attack';
                    break;
                case 'moveToPlayer':
                    enemy.decision = 'advance';
                    break;
            }
        },

        _applyTacticalAction(enemy, action) {
            switch (action) {
                case 'takeCover':
                    enemy.tacticalDecision = 'cover';
                    break;
                case 'flank':
                    enemy.tacticalDecision = 'flank';
                    break;
                case 'suppress':
                    enemy.tacticalDecision = 'suppress';
                    break;
            }
        },

        _calculatePerformance(gameState) {
            const killRate = (gameState.kills || 0) / Math.max(1, gameState.totalTime / 60);
            const healthBonus = (gameState.tankHP || 100) / 100;
            return Math.min(1, killRate * 0.05 + healthBonus * 0.3);
        },

        playSFX(context) {
            if (!this.audioDirector || !this.enhancedState.audioEnabled) return;
            
            const triggers = {
                fire: 'turret:fire',
                explosion: 'zombie:explosion',
                hit: 'hit',
                reload: 'turret:reload'
            };

            if (triggers[context]) {
                this.integration.playSFX(triggers[context]);
            }
        },

        onTurretFire(turret) {
            this.playSFX('fire');
            this.triggerScreenEffect('shake', { intensity: 2, duration: 0.05 });
        },

        onExplosion(position) {
            this.playSFX('explosion');
            this.triggerIntensity(0.2);
            this.triggerScreenEffect('shake', { intensity: 10, duration: 0.2 });
            this.triggerScreenEffect('flash', { intensity: 0.3 });
        },

        onTankDamage(amount) {
            this.playSFX('hit');
            this.triggerScreenEffect('flash', { intensity: 0.4 });
            this.triggerIntensity(0.1);
        },

        onEnemySpawn(enemy) {
            this.triggerIntensity(0.05);
        },

        onBossSpawn() {
            this.triggerIntensity(0.5);
            this.triggerScreenEffect('darkness', { intensity: 0.4 });
        },

        triggerIntensity(amount) {
            this.audioDirector?.triggerIntensity(amount);
        },

        triggerScreenEffect(effect, params) {
            this.screenEffects?.[effect]?.(params);
        },

        generateEnemyWave(waveNumber, availableEnemies) {
            return this.aiSystem?.generateContent('wave', {
                waveNumber,
                availableEnemies,
                difficulty: this.aiSystem?.difficultyAdapter?.getMultiplier() || 1
            });
        },

        generateCoverLayout(mapWidth, mapHeight) {
            return this.aiSystem?.generateContent('coverLayout', {
                width: mapWidth,
                height: mapHeight,
                density: 0.1
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

    global.EnhancedCryptTanks = EnhancedCryptTanks;

})(typeof window !== 'undefined' ? window : this);
