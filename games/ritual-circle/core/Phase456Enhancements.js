/**
 * ============================================
 * RITUAL CIRCLE - PHASE 4-5-6 ENHANCEMENTS
 * ============================================
 */

(function(global) {
    'use strict';

    const EnhancedRitualCircle = {
        integration: null,
        audioDirector: null,
        aiSystem: null,
        postProcessing: null,
        screenEffects: null,

        enhancedState: {
            audioEnabled: true,
            aiEnabled: true,
            postProcessingEnabled: true,
            ritualIntensity: 0,
            threatLevel: 0
        },

        async init(canvas, ctx, originalGame) {
            this.originalGame = originalGame;
            this.canvas = canvas;

            console.log('[RitualCircle Enhanced] Initializing...');

            try {
                this.integration = new Phase456Integration();
                await this.integration.init('ritual-circle', canvas);
                
                this.audioDirector = this.integration.audioDirector;
                this.aiSystem = this.integration.aiSystem;
                this.postProcessing = this.integration.postProcessing;
                this.screenEffects = this.integration.screenEffects;

                this._setupEnhancedRendering();
                console.log('[RitualCircle Enhanced] Ready');
                return true;
            } catch (error) {
                console.error('[RitualCircle Enhanced] Init failed:', error);
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
                wave: gameState.wave || 1,
                enemies: gameState.enemies || [],
                circleHP: gameState.circleHP || 100,
                waveJustStarted: gameState.waveJustStarted,
                spellJustCast: gameState.spellJustCast,
                performance: this._calculatePerformance(gameState)
            };

            this.integration.update(dt, enhancedGameState);

            // Update enemy AI
            if (this.enhancedState.aiEnabled && gameState.enemies) {
                this._updateEnemyAI(gameState.enemies);
            }

            this.enhancedState.ritualIntensity = Math.min(1, (gameState.wave || 0) / 50);
            this.enhancedState.threatLevel = Math.min(1, (gameState.enemies?.length || 0) / 20);
        },

        _updateEnemyAI(enemies) {
            const tree = this.aiSystem?.getBehaviorTree('approach');
            if (!tree) return;

            enemies.forEach(enemy => {
                tree.setValue('trapNearby', enemy.trapNearby || false);
                tree.setValue('inRange', enemy.inRange || false);
                const action = tree.update(enemy, {}, 0.016);
                
                if (action === 'avoidTrap') {
                    enemy.avoidanceVector = { x: -enemy.trapX, y: -enemy.trapY };
                }
            });
        },

        _calculatePerformance(gameState) {
            const waveRate = (gameState.wave || 1) / Math.max(1, gameState.totalTime / 120);
            return Math.min(1, waveRate);
        },

        playSFX(context) {
            if (!this.audioDirector || !this.enhancedState.audioEnabled) return;
            const triggers = {
                place: 'ritual:place',
                activate: 'ritual:activate',
                damage: 'ritual:damage',
                spell: 'ritual:spell',
                wave: 'ritual:wave'
            };
            if (triggers[context]) {
                this.integration.playSFX(triggers[context]);
            }
        },

        onTrapPlaced(trap) {
            this.playSFX('place');
        },

        onSpellCast(spell) {
            this.playSFX('spell');
            this.triggerIntensity(0.2);
        },

        onWaveStart(wave) {
            this.playSFX('wave');
            this.triggerIntensity(0.15);
            this.triggerScreenEffect('darkness', { intensity: 0.5 });
        },

        onCircleDamage(amount) {
            this.playSFX('damage');
            this.triggerScreenEffect('flash', { intensity: 0.4 });
            this.triggerIntensity(0.1);
        },

        onBossSpawn() {
            this.triggerIntensity(0.6);
            this.triggerScreenEffect('darkness', { intensity: 0.7 });
        },

        triggerIntensity(amount) {
            this.audioDirector?.triggerIntensity(amount);
        },

        triggerScreenEffect(effect, params) {
            this.screenEffects?.[effect]?.(params);
        },

        generateWave(waveNumber, availableEnemies) {
            return this.aiSystem?.generateContent('wave', {
                waveNumber,
                availableEnemies,
                difficulty: this.aiSystem?.difficultyAdapter?.getMultiplier() || 1
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

    global.EnhancedRitualCircle = EnhancedRitualCircle;

})(typeof window !== 'undefined' ? window : this);
