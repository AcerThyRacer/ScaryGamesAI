/* ============================================================
   HELLAPHOBIA 2026 - HORROR DIRECTOR AI
   Dynamic Pacing | Scare Scheduling | Player Fear Profiling
   Adaptive Difficulty | Tension Curves | Procedural Horror
   ============================================================ */

(function() {
    'use strict';

    // ===== HORROR DIRECTOR =====
    const HorrorDirector = {
        currentPhase: 'calm',
        tensionLevel: 0.0,
        targetTension: 0.3,
        phaseTimers: {
            calm: 0,
            buildup: 0,
            climax: 0,
            aftermath: 0
        },
        scheduledScares: [],
        playerProfile: {
            fearResponse: 0.5,
            stressTolerance: 0.5,
            adaptationRate: 0.5,
            preferredScares: []
        },
        scareCooldowns: new Map(),
        enabled: true,
        
        async init(config) {
            this.enabled = config.pacingEnabled !== false;
            this.playerProfile = { ...this.playerProfile, ...config.playerProfile };
            
            console.log('😱 Horror Director AI initializing...');
            console.log(`   Pacing: ${this.enabled ? 'Enabled' : 'Disabled'}`);
            console.log(`   Meta Horror: ${config.metaHorror ? 'Enabled' : 'Disabled'}`);
            console.log(`   Adaptive Difficulty: ${config.adaptiveDifficulty ? 'Enabled' : 'Disabled'}`);
            
            // Start pacing cycle
            if (this.enabled) {
                this.startPacingCycle();
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('✅ Horror Director AI ready');
        },
        
        setupEventListeners() {
            // Listen for player actions
            window.addEventListener('playerAction', (e) => {
                this.analyzePlayerAction(e.detail);
            });
            
            window.addEventListener('scareTriggered', (e) => {
                this.onScareTriggered(e.detail);
            });
            
            window.addEventListener('playerDeath', (e) => {
                this.analyzeDeath(e.detail);
            });
        },
        
        startPacingCycle() {
            // Begin with calm phase
            this.transitionToPhase('calm');
        },
        
        transitionToPhase(newPhase) {
            const previousPhase = this.currentPhase;
            this.currentPhase = newPhase;
            
            console.log(`🎭 Horror Director: ${previousPhase} → ${newPhase}`);
            
            // Dispatch phase change event
            window.dispatchEvent(new CustomEvent('horrorPhaseChange', {
                detail: { from: previousPhase, to: newPhase }
            }));
            
            // Schedule next phase transition
            this.scheduleNextPhase();
        },
        
        scheduleNextPhase() {
            const phaseDurations = {
                calm: { min: 30, max: 60 },
                buildup: { min: 20, max: 40 },
                climax: { min: 10, max: 20 },
                aftermath: { min: 15, max: 30 }
            };
            
            const duration = phaseDurations[this.currentPhase];
            const time = this.randomRange(duration.min, duration.max);
            
            setTimeout(() => {
                this.advancePhase();
            }, time * 1000);
        },
        
        advancePhase() {
            const phaseOrder = ['calm', 'buildup', 'climax', 'aftermath'];
            const currentIndex = phaseOrder.indexOf(this.currentPhase);
            const nextIndex = (currentIndex + 1) % phaseOrder.length;
            
            this.transitionToPhase(phaseOrder[nextIndex]);
        },
        
        update(deltaTime) {
            if (!this.enabled) return;
            
            // Update phase timers
            this.phaseTimers[this.currentPhase] += deltaTime;
            
            // Update tension towards target
            const tensionDiff = this.targetTension - this.tensionLevel;
            this.tensionLevel += tensionDiff * deltaTime * 0.5;
            
            // Process scheduled scares
            this.processScheduledScares(deltaTime);
            
            // Update scare cooldowns
            this.updateCooldowns(deltaTime);
            
            // Analyze player state and adjust
            this.adaptToPlayer();
        },
        
        processScheduledScares(deltaTime) {
            const now = Date.now();
            
            this.scheduledScares = this.scheduledScares.filter(scare => {
                if (now >= scare.time) {
                    this.executeScare(scare);
                    return false;
                }
                return true;
            });
        },
        
        updateCooldowns(deltaTime) {
            for (const [type, cooldown] of this.scareCooldowns.entries()) {
                this.scareCooldowns.set(type, Math.max(0, cooldown - deltaTime));
            }
        },
        
        scheduleScare(type, delay = null) {
            if (!delay) {
                delay = this.randomRange(5, 30);
            }
            
            const scare = {
                type,
                time: Date.now() + (delay * 1000),
                intensity: this.calculateScareIntensity(type)
            };
            
            this.scheduledScares.push(scare);
        },
        
        executeScare(scare) {
            // Check cooldown
            if (this.scareCooldowns.get(scare.type) > 0) {
                return;
            }
            
            // Set cooldown based on scare type
            const cooldowns = {
                ambient: 10,
                visual: 20,
                audio: 15,
                monster: 40,
                environmental: 25,
                meta: 60
            };
            
            this.scareCooldowns.set(scare.type, cooldowns[scare.type] || 30);
            
            // Execute based on type
            switch(scare.type) {
                case 'ambient':
                    this.triggerAmbientScare(scare.intensity);
                    break;
                case 'visual':
                    this.triggerVisualScare(scare.intensity);
                    break;
                case 'audio':
                    this.triggerAudioScare(scare.intensity);
                    break;
                case 'monster':
                    this.triggerMonsterScare(scare.intensity);
                    break;
                case 'environmental':
                    this.triggerEnvironmentalScare(scare.intensity);
                    break;
                case 'meta':
                    this.triggerMetaScare(scare.intensity);
                    break;
            }
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('scareTriggered', {
                detail: { type: scare.type, intensity: scare.intensity }
            }));
        },
        
        triggerAmbientScare(intensity) {
            // Subtle environmental sounds
            const ambients = ['creak', 'whisper', 'drip', 'wind', 'scratch'];
            const type = ambients[Math.floor(Math.random() * ambients.length)];
            
            window.dispatchEvent(new CustomEvent('ambientSound', {
                detail: { type, intensity }
            }));
        },
        
        triggerVisualScare(intensity) {
            // Visual disturbances
            const visuals = ['shadow_movement', 'light_flicker', 'object_move', 'figure_appear'];
            const type = visuals[Math.floor(Math.random() * visuals.length)];
            
            window.dispatchEvent(new CustomEvent('visualDisturbance', {
                detail: { type, intensity }
            }));
        },
        
        triggerAudioScare(intensity) {
            // Loud audio scares
            const audios = ['slam', 'scream', 'footstep', 'bang', 'glass_break'];
            const type = audios[Math.floor(Math.random() * audios.length)];
            
            window.dispatchEvent(new CustomEvent('audioScare', {
                detail: { type, intensity }
            }));
        },
        
        triggerMonsterScare(intensity) {
            // Monster appearance or chase
            const events = ['spawn_behind', 'spawn_ahead', 'start_chase', 'teleport_nearby'];
            const type = events[Math.floor(Math.random() * events.length)];
            
            window.dispatchEvent(new CustomEvent('monsterScare', {
                detail: { type, intensity }
            }));
        },
        
        triggerEnvironmentalScare(intensity) {
            // Environmental changes
            const events = ['door_slam', 'lights_out', 'floor_collapse', 'wall_blood'];
            const type = events[Math.floor(Math.random() * events.length)];
            
            window.dispatchEvent(new CustomEvent('environmentalScare', {
                detail: { type, intensity }
            }));
        },
        
        triggerMetaScare(intensity) {
            // Fourth wall breaking scares
            if (window.FourthWallBreaker) {
                const messages = [
                    'I see you...',
                    'Behind you...',
                    'Too late...',
                    'Check your door...',
                    'Did you hear that?'
                ];
                
                const message = messages[Math.floor(Math.random() * messages.length)];
                FourthWallBreaker.showMetaMessage(message, 'whisper');
                
                // Small chance of fake crash
                if (Math.random() < 0.1) {
                    FourthWallBreaker.showFakeError('reality_glitch');
                }
            }
        },
        
        calculateScareIntensity(type) {
            // Base intensity from current tension
            let baseIntensity = this.tensionLevel;
            
            // Modify by phase
            const phaseMultipliers = {
                calm: 0.3,
                buildup: 0.6,
                climax: 1.0,
                aftermath: 0.2
            };
            
            baseIntensity *= phaseMultipliers[this.currentPhase];
            
            // Modify by player profile
            if (this.playerProfile.fearResponse > 0.7) {
                baseIntensity *= 0.8; // Reduce for easily scared players
            } else if (this.playerProfile.fearResponse < 0.3) {
                baseIntensity *= 1.2; // Increase for brave players
            }
            
            return Math.max(0.1, Math.min(1.0, baseIntensity));
        },
        
        analyzePlayerAction(action) {
            // Learn what scares the player
            if (action.type === 'scared_reaction') {
                this.playerProfile.preferredScares.push(action.cause);
                
                // Increase adaptation rate
                this.playerProfile.adaptationRate = Math.min(1.0, 
                    this.playerProfile.adaptationRate + 0.05);
            }
        },
        
        analyzeDeath(deathInfo) {
            // Adjust difficulty based on death cause
            if (deathInfo.cause === 'monster') {
                // Too hard - reduce monster aggression
                this.targetTension = Math.max(0.1, this.targetTension - 0.1);
            }
        },
        
        adaptToPlayer() {
            // Continuously adapt to player behavior
            const targetTension = this.calculateTargetTension();
            
            // Smoothly transition to new target
            const diff = targetTension - this.targetTension;
            if (Math.abs(diff) > 0.01) {
                this.targetTension += diff * 0.1;
            }
        },
        
        calculateTargetTension() {
            let target = 0.5;
            
            // Adjust based on player performance
            if (this.playerProfile.stressTolerance < 0.4) {
                target -= 0.2;
            } else if (this.playerProfile.stressTolerance > 0.7) {
                target += 0.2;
            }
            
            // Adjust based on adaptation
            if (this.playerProfile.adaptationRate > 0.7) {
                target += 0.1; // Player adapts quickly, increase challenge
            }
            
            return Math.max(0.1, Math.min(0.9, target));
        },
        
        randomRange(min, max) {
            return min + Math.random() * (max - min);
        },
        
        // Get current state
        getState() {
            return {
                phase: this.currentPhase,
                tension: this.tensionLevel,
                targetTension: this.targetTension,
                scheduledScares: this.scheduledScares.length,
                playerProfile: this.playerProfile
            };
        },
        
        exportAPI() {
            return {
                init: (config) => this.init(config),
                update: (dt) => this.update(dt),
                scheduleScare: (type, delay) => this.scheduleScare(type, delay),
                getState: () => this.getState(),
                setTension: (level) => { this.targetTension = level; }
            };
        }
    };
    
    // Export to window
    window.HorrorDirector = HorrorDirector.exportAPI();
    
    console.log('😱 Horror Director AI loaded');
})();
