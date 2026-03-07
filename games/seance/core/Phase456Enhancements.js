/**
 * ============================================
 * SÉANCE - PHASE 4-5-6 ENHANCEMENTS
 * ============================================
 * Horror-focused enhancements for supernatural investigation gameplay
 */

(function(global) {
    'use strict';

    const EnhancedSeance = {
        integration: null,
        audioDirector: null,
        aiSystem: null,
        postProcessing: null,
        screenEffects: null,

        enhancedState: {
            audioEnabled: true,
            aiEnabled: true,
            postProcessingEnabled: true,
            hauntingIntensity: 0,
            fearLevel: 0,
            sanityLevel: 100
        },

        async init(canvas, ctx, originalGame) {
            this.originalGame = originalGame;
            this.canvas = canvas;

            console.log('[Seance Enhanced] Initializing...');

            try {
                this.integration = new Phase456Integration();
                await this.integration.init('seance', canvas);
                
                this.audioDirector = this.integration.audioDirector;
                this.aiSystem = this.integration.aiSystem;
                this.postProcessing = this.integration.postProcessing;
                this.screenEffects = this.integration.screenEffects;

                this._setupEnhancedRendering();
                this._setupSpiritAI();
                console.log('[Seance Enhanced] Ready');
                return true;
            } catch (error) {
                console.error('[Seance Enhanced] Init failed:', error);
                return false;
            }
        },

        _setupEnhancedRendering() {
            if (this.originalGame) {
                this._originalRender = this.originalGame.render;
                this.originalGame.render = this._enhancedRender.bind(this);
            }
        },

        _setupSpiritAI() {
            if (!this.aiSystem) return;
            // Spirits use utility AI for decision making
            this.aiSystem._createSpiritUtilityAI();
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
                sanity: gameState.sanity || 100,
                evidence: gameState.evidence || [],
                haunting: gameState.haunting || false,
                hauntingOccurred: gameState.hauntingJustHappened,
                performance: this._calculatePerformance(gameState)
            };

            this.integration.update(dt, enhancedGameState);

            // Update spirit AI
            if (this.enhancedState.aiEnabled && gameState.spirits) {
                this._updateSpiritAI(gameState.spirits, gameState);
            }

            // Update state
            this.enhancedState.sanityLevel = gameState.sanity || 100;
            this.enhancedState.fearLevel = 1 - (gameState.sanity || 100) / 100;
            this.enhancedState.hauntingIntensity = gameState.haunting ? 0.8 : 0.2;
        },

        _updateSpiritAI(spirits, gameState) {
            const ai = this.aiSystem?.getUtilityAI('spirit');
            if (!ai) return;

            spirits.forEach(spirit => {
                // Build agent state
                const agent = {
                    playerDistance: spirit.distanceToPlayer || 100,
                    playerSanity: gameState.sanity || 100,
                    evidenceCount: gameState.evidence?.length || 0,
                    energy: spirit.energy || 100,
                    maxEnergy: 100,
                    lightLevel: gameState.lightLevel || 0.5,
                    playerFear: 1 - (gameState.sanity || 100) / 100,
                    objectsNearby: spirit.objectsNearby || 0,
                    ambientNoise: gameState.ambientNoise || 0
                };

                // Select action
                const action = ai.selectAction(agent, gameState);
                this._applySpiritAction(spirit, action);
            });
        },

        _applySpiritAction(spirit, action) {
            switch (action) {
                case 'haunt':
                    spirit.action = 'haunt';
                    break;
                case 'manifest':
                    spirit.action = 'manifest';
                    break;
                case 'moveObject':
                    spirit.action = 'telekinesis';
                    break;
                case 'whisper':
                    spirit.action = 'whisper';
                    break;
            }
        },

        _calculatePerformance(gameState) {
            const evidenceRate = (gameState.evidence?.length || 0) / Math.max(1, gameState.totalTime / 60);
            const sanityBonus = (gameState.sanity || 100) / 100;
            return Math.min(1, evidenceRate * 0.7 + sanityBonus * 0.3);
        },

        playSFX(context, options = {}) {
            if (!this.audioDirector || !this.enhancedState.audioEnabled) return;
            
            const triggers = {
                evidence: 'horror:glass',
                haunting: 'horror:creak',
                whisper: 'horror:whisper',
                breath: 'horror:breath',
                heartbeat: 'horror:heartbeat'
            };

            const sfx = triggers[context];
            if (sfx) {
                this.integration.playSFX(sfx, options);
            }
        },

        onEvidenceFound(evidence) {
            this.playSFX('evidence');
            this.triggerIntensity(0.15);
        },

        onHaunting(haunting) {
            this.playSFX('haunting');
            this.playSFX('whisper');
            this.triggerIntensity(0.4);
            this.triggerScreenEffect('glitch', { intensity: 0.6, duration: 0.5 });
            this.triggerScreenEffect('darkness', { intensity: 0.6 });
        },

        onSpiritNear(spirit) {
            this.playSFX('breath', { position: spirit.position });
            this.triggerIntensity(0.1);
        },

        onSanityChange(newSanity) {
            this.enhancedState.sanityLevel = newSanity;
            
            if (newSanity < 30) {
                this.triggerScreenEffect('darkness', { intensity: 0.8, vignette: true });
                this.triggerIntensity(0.3);
            }
        },

        onJumpscare() {
            this.triggerIntensity(0.8);
            this.triggerScreenEffect('glitch', { intensity: 0.8, duration: 0.3 });
            this.triggerScreenEffect('shake', { intensity: 20, duration: 0.4 });
            this.playSFX('heartbeat');
        },

        triggerIntensity(amount) {
            this.audioDirector?.triggerIntensity(amount);
        },

        triggerScreenEffect(effect, params) {
            this.screenEffects?.[effect]?.(params);
        },

        generateHauntingPattern() {
            return this.aiSystem?.generateContent('hauntingPattern', {
                sanity: this.enhancedState.sanityLevel,
                time: this.originalGame?.gameState?.totalTime || 0,
                difficulty: this.aiSystem?.difficultyAdapter?.getMultiplier() || 1
            });
        },

        generateEvidencePlacement() {
            return this.aiSystem?.generateContent('evidencePlacement', {
                count: 3,
                types: ['photo', 'audio', 'video', 'physical'],
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
                enhanced: {
                    ...this.enhancedState,
                    spiritCount: this.originalGame?.gameState?.spirits?.length || 0
                }
            };
        },

        dispose() { this.integration?.dispose(); }
    };

    global.EnhancedSeance = EnhancedSeance;

})(typeof window !== 'undefined' ? window : this);
