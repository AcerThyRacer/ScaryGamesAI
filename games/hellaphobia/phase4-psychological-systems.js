/* ============================================================
   HELLAPHOBIA - PHASE 4: ADVANCED PSYCHOLOGICAL SYSTEMS
   Adaptive Horror | Player Psychology Profiling | Immersion Tech
   ============================================================

   ENHANCED EDITION: Full visual rendering, Web Audio integration,
   fourth wall breaking events, hallucination system, reality effects
*/

(function() {
    'use strict';

    // ===== PHASE 4: ENHANCED EFFECTS SYSTEM =====
    const Phase4Effects = {
        effects: {
            screenShake: { active: false, intensity: 0, duration: 0, offsetX: 0, offsetY: 0 },
            flash: { active: false, color: '#fff', duration: 0, alpha: 0 },
            vignette: { intensity: 0, color: '#000', targetIntensity: 0 },
            chromaticAberration: 0,
            distortion: 0,
            glitch: { active: false, intensity: 0, duration: 0, lines: [] },
            atmosphere: { type: 'normal', duration: 0, target: 'normal' },
            scanlines: { active: false, intensity: 0, speed: 1 },
            filmGrain: { active: false, intensity: 0 },
            tunnelVision: { active: false, radius: 1 },
            colorShift: { r: 0, g: 0, b: 0, duration: 0 },
            invertedColors: { active: false, duration: 0 },
            pixelation: { active: false, size: 1, duration: 0 }
        },

        canvas: null,
        ctx: null,
        offscreenCanvas: null,
        offscreenCtx: null,

        init() {
            this.canvas = document.getElementById('game-canvas');
            if (this.canvas) {
                this.ctx = this.canvas.getContext('2d');
            }
            this.offscreenCanvas = document.createElement('canvas');
        },

        update(dt) {
            // Update screen shake
            if (this.effects.screenShake.active) {
                this.effects.screenShake.duration -= dt;
                if (this.effects.screenShake.duration <= 0) {
                    this.effects.screenShake.active = false;
                    this.effects.screenShake.offsetX = 0;
                    this.effects.screenShake.offsetY = 0;
                } else {
                    const intensity = this.effects.screenShake.intensity;
                    this.effects.screenShake.offsetX = (Math.random() - 0.5) * intensity * 20;
                    this.effects.screenShake.offsetY = (Math.random() - 0.5) * intensity * 20;
                }
            }

            // Update flash
            if (this.effects.flash.active) {
                this.effects.flash.duration -= dt;
                this.effects.flash.alpha = (this.effects.flash.duration / 0.5) * 0.8;
                if (this.effects.flash.duration <= 0) {
                    this.effects.flash.active = false;
                }
            }

            // Decay effects
            this.effects.chromaticAberration *= Math.pow(0.95, dt * 60);
            this.effects.distortion *= Math.pow(0.98, dt * 60);

            // Update glitch effect
            if (this.effects.glitch.active) {
                this.effects.glitch.duration -= dt;
                if (this.effects.glitch.duration <= 0) {
                    this.effects.glitch.active = false;
                    this.effects.glitch.lines = [];
                } else if (Math.random() < 0.3) {
                    // Generate glitch lines
                    this.effects.glitch.lines.push({
                        y: Math.random() * 600,
                        height: 5 + Math.random() * 30,
                        offset: (Math.random() - 0.5) * 50,
                        color: `rgba(${Math.random() > 0.5 ? '255,0,0' : '0,0,255'},0.5)`
                    });
                }
            }

            // Update atmosphere transition
            if (this.effects.atmosphere.duration > 0) {
                this.effects.atmosphere.duration -= dt;
                if (this.effects.atmosphere.duration <= 0) {
                    this.effects.atmosphere.type = this.effects.atmosphere.target;
                } else {
                    // Transition toward target
                    const progress = 1 - (this.effects.atmosphere.duration / 10);
                    this.effects.atmosphere.type = progress > 0.5 ? this.effects.atmosphere.target : 'normal';
                }
            }

            // Update color shift
            if (this.effects.colorShift.duration > 0) {
                this.effects.colorShift.duration -= dt;
                if (this.effects.colorShift.duration <= 0) {
                    this.effects.colorShift.r = 0;
                    this.effects.colorShift.g = 0;
                    this.effects.colorShift.b = 0;
                }
            }

            // Update inverted colors
            if (this.effects.invertedColors.active) {
                this.effects.invertedColors.duration -= dt;
                if (this.effects.invertedColors.duration <= 0) {
                    this.effects.invertedColors.active = false;
                }
            }

            // Update pixelation
            if (this.effects.pixelation.active) {
                this.effects.pixelation.duration -= dt;
                if (this.effects.pixelation.duration <= 0) {
                    this.effects.pixelation.active = false;
                    this.effects.pixelation.size = 1;
                }
            }

            // Vignette transition
            const vignetteDiff = this.effects.vignette.targetIntensity - this.effects.vignette.intensity;
            this.effects.vignette.intensity += vignetteDiff * dt * 2;
        },

        triggerScreenShake(intensity, duration) {
            this.effects.screenShake = {
                active: true,
                intensity,
                duration,
                offsetX: 0,
                offsetY: 0
            };
        },

        triggerFlash(color = '#ffffff', duration = 0.3, alpha = 0.8) {
            this.effects.flash = {
                active: true,
                color,
                duration,
                alpha
            };
        },

        setVignette(intensity, color = '#000000') {
            this.effects.vignette.intensity = intensity;
            this.effects.vignette.color = color;
            this.effects.vignette.targetIntensity = intensity;
        },

        setChromaticAberration(amount) {
            this.effects.chromaticAberration = Math.max(this.effects.chromaticAberration, amount);
        },

        applyDistortion(amount) {
            this.effects.distortion = Math.max(this.effects.distortion, amount);
        },

        triggerGlitch(duration, intensity = 0.5) {
            this.effects.glitch = {
                active: true,
                intensity,
                duration,
                lines: []
            };
        },

        triggerFlicker(times = 3, duration = 0.5) {
            const interval = duration / times;
            let count = 0;
            const flicker = setInterval(() => {
                this.triggerFlash('#000000', 0.05, 0.9);
                count++;
                if (count >= times) clearInterval(flicker);
            }, interval);
        },

        triggerScanlines(duration, intensity = 0.3) {
            this.effects.scanlines = {
                active: true,
                intensity,
                duration,
                speed: 1
            };
            setTimeout(() => { this.effects.scanlines.active = false; }, duration * 1000);
        },

        triggerFilmGrain(duration, intensity = 0.2) {
            this.effects.filmGrain = {
                active: true,
                intensity,
                duration
            };
            setTimeout(() => { this.effects.filmGrain.active = false; }, duration * 1000);
        },

        triggerTunnelVision(duration, minRadius = 0.3) {
            this.effects.tunnelVision = {
                active: true,
                radius: 1,
                targetRadius: minRadius,
                duration
            };
        },

        triggerColorShift(r, g, b, duration) {
            this.effects.colorShift = { r, g, b, duration };
        },

        triggerInvertedColors(duration) {
            this.effects.invertedColors = {
                active: true,
                duration
            };
        },

        triggerPixelation(size, duration) {
            this.effects.pixelation = {
                active: true,
                size,
                duration
            };
        },

        setAtmosphere(type, duration) {
            this.effects.atmosphere.target = type;
            this.effects.atmosphere.duration = duration;
        },

        // Render all active effects on top of the game canvas
        render(ctx, width, height, time) {
            const cx = width / 2;
            const cy = height / 2;

            // Apply screen shake offset to context
            if (this.effects.screenShake.active) {
                ctx.save();
                ctx.translate(this.effects.screenShake.offsetX, this.effects.screenShake.offsetY);
            }

            // Chromatic aberration - draw offset color channels
            if (this.effects.chromaticAberration > 0.1) {
                const offset = this.effects.chromaticAberration * 3;

                // Get current canvas content
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;

                // This is expensive, so we'll fake it with layered rectangles
                ctx.globalCompositeOperation = 'screen';

                // Red channel offset left
                ctx.fillStyle = 'rgba(255,0,0,0.15)';
                ctx.drawImage(ctx.canvas, -offset, 0);

                // Blue channel offset right
                ctx.fillStyle = 'rgba(0,0,255,0.15)';
                ctx.drawImage(ctx.canvas, offset, 0);

                ctx.globalCompositeOperation = 'source-over';
            }

            // Restore from screen shake
            if (this.effects.screenShake.active) {
                ctx.restore();
            }

            // Glitch effect - horizontal slice displacement
            if (this.effects.glitch.active && this.effects.glitch.lines.length > 0) {
                for (const line of this.effects.glitch.lines) {
                    ctx.fillStyle = line.color;
                    ctx.fillRect(0, line.y, width, line.height);

                    // Draw displaced slice
                    try {
                        const slice = ctx.getImageData(0, line.y, width, line.height);
                        ctx.putImageData(slice, line.offset, line.y);
                    } catch(e) {
                        // Cross-origin issue, skip
                    }
                }
            }

            // Scanlines
            if (this.effects.scanlines.active) {
                ctx.fillStyle = `rgba(0,0,0,${this.effects.scanlines.intensity})`;
                const offset = (time * this.effects.scanlines.speed * 100) % 4;
                for (let y = offset; y < height; y += 4) {
                    ctx.fillRect(0, y, width, 2);
                }
            }

            // Film grain
            if (this.effects.filmGrain.active) {
                const grainCount = 5000;
                for (let i = 0; i < grainCount; i++) {
                    ctx.fillStyle = `rgba(255,255,255,${this.effects.filmGrain.intensity * 0.3})`;
                    ctx.fillRect(
                        Math.random() * width,
                        Math.random() * height,
                        2, 2
                    );
                }
            }

            // Tunnel vision (vignette on steroids)
            if (this.effects.tunnelVision.active) {
                const gradient = ctx.createRadialGradient(cx, cy, cy * this.effects.tunnelVision.radius, cx, cy, cy);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(0.5, 'rgba(0,0,0,0.3)');
                gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
            }

            // Color shift overlay
            if (this.effects.colorShift.duration > 0) {
                ctx.fillStyle = `rgba(${this.effects.colorShift.r * 255},${this.effects.colorShift.g * 255},${this.effects.colorShift.b * 255},0.2)`;
                ctx.fillRect(0, 0, width, height);
            }

            // Inverted colors
            if (this.effects.invertedColors.active) {
                ctx.globalCompositeOperation = 'difference';
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'source-over';
            }

            // Pixelation effect
            if (this.effects.pixelation.active) {
                const pixelSize = this.effects.pixelation.size;
                if (pixelSize > 1) {
                    // Draw scaled down then scale up
                    try {
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = width / pixelSize;
                        tempCanvas.height = height / pixelSize;
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCtx.drawImage(ctx.canvas, 0, 0, tempCanvas.width, tempCanvas.height);
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(tempCanvas, 0, 0, width, height);
                    } catch(e) {
                        // Skip if error
                    }
                }
            }

            // Flash overlay
            if (this.effects.flash.active) {
                ctx.fillStyle = this.effects.flash.color.replace(')', `,${this.effects.flash.alpha})`).replace('rgb', 'rgba');
                ctx.fillRect(0, 0, width, height);
            }

            // Atmospheric overlays
            switch(this.effects.atmosphere.type) {
                case 'tense':
                    ctx.fillStyle = 'rgba(139,0,0,0.1)';
                    ctx.fillRect(0, 0, width, height);
                    break;
                case 'oppressive':
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.fillRect(0, 0, width, height);
                    break;
                case 'surreal':
                    const hue = (time * 50) % 360;
                    ctx.fillStyle = `hsla(${hue},70%,50%,0.1)`;
                    ctx.fillRect(0, 0, width, height);
                    break;
            }
        },

        // Get current effect state for external systems
        getRenderState() {
            return { ...this.effects };
        }
    };

    // ===== PHASE 4: PLAYER PSYCHOLOGY PROFILER =====
    const PlayerProfiler = {
        profile: {
            fearResponse: 0.5,        // How easily scared
            stressTolerance: 0.5,     // How well they handle pressure
            explorationStyle: 0.5,    // Rusher vs explorer
            combatPreference: 0.5,    // Aggressive vs defensive
            puzzleAptitude: 0.5,      // Problem solving speed
            riskTolerance: 0.5,        // Risk taking behavior
            immersionLevel: 0.5,       // How "into" the game they are
            adaptationRate: 0.5       // How quickly they adapt to scares
        },
        
        sessionData: {
            startTime: 0,
            deathLocations: [],
            hesitationPoints: [],
            rushMoments: [],
            safeZoneTime: 0,
            combatEncounters: [],
            explorationPath: [],
            heartRateEstimate: [],
            stressIndicators: []
        },
        
        init() {
            this.sessionData.startTime = Date.now();
            this.loadProfile();
            console.log('Phase 4: Player Psychology Profiler initialized');
        },
        
        // Analyze player behavior in real-time
        analyzeBehavior(event) {
            switch(event.type) {
                case 'death':
                    this.sessionData.deathLocations.push({
                        x: event.x,
                        y: event.y,
                        cause: event.cause,
                        time: Date.now()
                    });
                    this.profile.fearResponse = this.adjustValue(
                        this.profile.fearResponse, 0.1
                    );
                    break;
                    
                case 'hesitation':
                    this.sessionData.hesitationPoints.push({
                        x: event.x,
                        y: event.y,
                        duration: event.duration
                    });
                    this.profile.explorationStyle = this.adjustValue(
                        this.profile.explorationStyle, -0.05
                    );
                    break;
                    
                case 'rush':
                    this.sessionData.rushMoments.push({
                        start: event.start,
                        end: event.end,
                        distance: event.distance
                    });
                    this.profile.explorationStyle = this.adjustValue(
                        this.profile.explorationStyle, 0.1
                    );
                    break;
                    
                case 'combat':
                    this.sessionData.combatEncounters.push({
                        aggressive: event.aggressive,
                        defensive: event.defensive,
                        hitRate: event.hits / event.attempts,
                        duration: event.duration
                    });
                    this.profile.combatPreference = this.calculateCombatPreference();
                    break;
                    
                case 'stress_indicator':
                    this.sessionData.stressIndicators.push({
                        type: event.indicator,
                        intensity: event.intensity,
                        time: Date.now()
                    });
                    this.profile.stressTolerance = this.adjustValue(
                        this.profile.stressTolerance, -0.02
                    );
                    break;
                    
                case 'exploration':
                    this.sessionData.explorationPath.push({
                        x: event.x,
                        y: event.y,
                        time: Date.now()
                    });
                    break;
            }
            
            // Save profile periodically
            if (this.sessionData.explorationPath.length % 100 === 0) {
                this.saveProfile();
            }
        },
        
        adjustValue(current, delta) {
            return Math.max(0, Math.min(1, current + delta));
        },
        
        calculateCombatPreference() {
            const encounters = this.sessionData.combatEncounters;
            if (encounters.length === 0) return 0.5;
            
            const aggressive = encounters.filter(e => e.aggressive).length;
            return aggressive / encounters.length;
        },
        
        // Get horror intensity recommendation
        getRecommendedIntensity() {
            // Higher fear response = lower intensity
            // Higher stress tolerance = higher intensity
            const baseIntensity = 0.5;
            const fearFactor = (1 - this.profile.fearResponse) * 0.3;
            const stressFactor = this.profile.stressTolerance * 0.3;
            const adaptationFactor = (1 - this.profile.adaptationRate) * 0.2;
            
            return Math.min(1, baseIntensity + fearFactor + stressFactor + adaptationFactor);
        },
        
        // Get personalized horror triggers
        getPersonalizedTriggers() {
            const triggers = [];
            
            if (this.profile.fearResponse > 0.7) {
                triggers.push('subtle_atmosphere');
                triggers.push('psychological_tension');
            } else if (this.profile.fearResponse < 0.3) {
                triggers.push('jump_scares');
                triggers.push('intense_chases');
            }
            
            if (this.profile.explorationStyle > 0.7) {
                triggers.push('claustrophobic_spaces');
            }
            
            if (this.profile.stressTolerance < 0.4) {
                triggers.push('time_pressure');
            }
            
            return triggers;
        },
        
        saveProfile() {
            localStorage.setItem('hellaphobia_player_profile', JSON.stringify(this.profile));
            localStorage.setItem('hellaphobia_session_data', JSON.stringify(this.sessionData));
        },
        
        loadProfile() {
            const saved = localStorage.getItem('hellaphobia_player_profile');
            if (saved) {
                this.profile = { ...this.profile, ...JSON.parse(saved) };
            }
        }
    };

    // ===== PHASE 4: ADAPTIVE HORROR SYSTEM =====
    const AdaptiveHorror = {
        currentIntensity: 0.5,
        targetIntensity: 0.5,
        horrorEvents: [],
        cooldowns: new Map(),
        
        // Horror event types
        EVENT_TYPES: {
            JUMP_SCARE: { weight: 1, cooldown: 30, intensity: 0.8 },
            ATMOSPHERIC: { weight: 3, cooldown: 10, intensity: 0.3 },
            PSYCHOLOGICAL: { weight: 2, cooldown: 20, intensity: 0.5 },
            CHASE: { weight: 1, cooldown: 60, intensity: 0.9 },
            AMBIENT: { weight: 5, cooldown: 5, intensity: 0.2 },
            GLITCH: { weight: 2, cooldown: 15, intensity: 0.4 },
            FOURTH_WALL: { weight: 1, cooldown: 45, intensity: 0.6 }
        },
        
        init() {
            this.currentIntensity = PlayerProfiler.getRecommendedIntensity();
            this.targetIntensity = this.currentIntensity;
            console.log('Phase 4: Adaptive Horror System initialized');
        },
        
        update(dt, player, monsters) {
            // Adjust intensity toward target
            const diff = this.targetIntensity - this.currentIntensity;
            this.currentIntensity += diff * dt * 0.5;
            
            // Update cooldowns
            for (const [type, cooldown] of this.cooldowns) {
                if (cooldown > 0) {
                    this.cooldowns.set(type, cooldown - dt);
                }
            }
            
            // Check for horror opportunities
            this.evaluateHorrorOpportunities(player, monsters);
        },
        
        evaluateHorrorOpportunities(player, monsters) {
            // Don't trigger if too soon after last event
            if (this.horrorEvents.length > 0) {
                const lastEvent = this.horrorEvents[this.horrorEvents.length - 1];
                if (Date.now() - lastEvent.time < 5000) return;
            }
            
            // Check player state
            const playerState = this.assessPlayerState(player, monsters);
            
            // Determine appropriate horror type
            const eventType = this.selectHorrorEvent(playerState);
            
            if (eventType && Math.random() < this.currentIntensity * 0.1) {
                this.triggerHorrorEvent(eventType, player, monsters);
            }
        },
        
        assessPlayerState(player, monsters) {
            const state = {
                health: player.hp / player.maxHp,
                sanity: player.sanity / player.maxSanity,
                fear: player.fear || 0,
                nearbyMonsters: 0,
                inCombat: false,
                moving: Math.abs(player.vx) > 10 || Math.abs(player.vy) > 10,
                safe: false
            };
            
            // Count nearby monsters
            for (const monster of monsters) {
                const dx = monster.x - player.x;
                const dy = monster.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 200) {
                    state.nearbyMonsters++;
                    if (dist < 100) state.inCombat = true;
                }
            }
            
            // Check if in safe zone
            state.safe = state.nearbyMonsters === 0 && state.health > 0.5;
            
            return state;
        },
        
        selectHorrorEvent(playerState) {
            const available = [];
            
            for (const [type, config] of Object.entries(this.EVENT_TYPES)) {
                const cooldown = this.cooldowns.get(type) || 0;
                
                if (cooldown <= 0) {
                    // Check if appropriate for current state
                    let appropriate = false;
                    
                    switch(type) {
                        case 'JUMP_SCARE':
                            appropriate = playerState.safe && Math.random() < 0.3;
                            break;
                        case 'ATMOSPHERIC':
                            appropriate = true;
                            break;
                        case 'PSYCHOLOGICAL':
                            appropriate = playerState.sanity < 0.6;
                            break;
                        case 'CHASE':
                            appropriate = playerState.nearbyMonsters > 0 && 
                                         playerState.health > 0.3;
                            break;
                        case 'AMBIENT':
                            appropriate = true;
                            break;
                        case 'GLITCH':
                            appropriate = playerState.sanity < 0.5;
                            break;
                        case 'FOURTH_WALL':
                            appropriate = Math.random() < 0.1;
                            break;
                    }
                    
                    if (appropriate) {
                        available.push({ type, weight: config.weight });
                    }
                }
            }
            
            if (available.length === 0) return null;
            
            // Weighted random selection
            const totalWeight = available.reduce((a, b) => a + b.weight, 0);
            let random = Math.random() * totalWeight;
            
            for (const event of available) {
                random -= event.weight;
                if (random <= 0) return event.type;
            }
            
            return available[0].type;
        },
        
        triggerHorrorEvent(type, player, monsters) {
            const config = this.EVENT_TYPES[type];
            
            // Set cooldown
            this.cooldowns.set(type, config.cooldown);
            
            // Record event
            this.horrorEvents.push({
                type,
                time: Date.now(),
                intensity: config.intensity
            });
            
            // Execute event
            switch(type) {
                case 'JUMP_SCARE':
                    this.executeJumpScare(player, monsters);
                    break;
                case 'ATMOSPHERIC':
                    this.executeAtmospheric(player);
                    break;
                case 'PSYCHOLOGICAL':
                    this.executePsychological(player);
                    break;
                case 'CHASE':
                    this.executeChase(player, monsters);
                    break;
                case 'AMBIENT':
                    this.executeAmbient(player);
                    break;
                case 'GLITCH':
                    this.executeGlitch(player);
                    break;
                case 'FOURTH_WALL':
                    this.executeFourthWall(player);
                    break;
            }
            
            // Analyze player reaction
            setTimeout(() => {
                this.analyzeReaction(type, player);
            }, 2000);
        },
        
        executeJumpScare(player, monsters) {
            // Spawn monster suddenly nearby
            const angle = Math.random() * Math.PI * 2;
            const dist = 150;
            const spawnX = player.x + Math.cos(angle) * dist;
            const spawnY = player.y + Math.sin(angle) * dist;
            
            // Visual effects
            Phase4Effects.triggerScreenShake(0.5, 0.3);
            Phase4Effects.triggerFlash('#ffffff', 0.1);
            
            // Audio
            Phase4Audio.playSound('jumpscare', 1.0);
            
            // Reduce sanity
            player.sanity -= 15;
            
            console.log('JUMP SCARE triggered!');
        },
        
        executeAtmospheric(player) {
            // Subtle environmental changes
            Phase4Effects.setAtmosphere('tense', 10);
            Phase4Audio.playAmbient('whispers', 0.3);
            
            console.log('Atmospheric horror triggered');
        },
        
        executePsychological(player) {
            // Mind games
            const messages = [
                "You're going in circles...",
                "Have we met before?",
                "Your death count is impressive",
                "The walls remember you",
                "This isn't your first time here"
            ];
            
            Phase4UI.showFloatingText(
                player.x, player.y - 50,
                messages[Math.floor(Math.random() * messages.length)],
                '#ff00ff'
            );
            
            player.sanity -= 5;
        },
        
        executeChase(player, monsters) {
            // Trigger chase music and effects
            Phase4Audio.playMusic('chase', 0.8);
            Phase4Effects.setVignette(0.7, '#ff0000');
            
            // Boost nearby monsters
            for (const monster of monsters) {
                const dx = monster.x - player.x;
                const dy = monster.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 400) {
                    monster.chaseBoost = 1.5;
                    monster.state = 'CHASE';
                }
            }
        },
        
        executeAmbient(player) {
            // Random ambient effect
            const effects = ['flicker', 'whisper', 'shadow', 'creak'];
            const effect = effects[Math.floor(Math.random() * effects.length)];
            
            Phase4Audio.playAmbient(effect, 0.2);
        },
        
        executeGlitch(player) {
            Phase4Effects.triggerGlitch(0.5);
            player.sanity -= 10;
        },
        
        executeFourthWall(player) {
            const messages = [
                `Player ${navigator.platform} detected`,
                `Session time: ${Math.floor((Date.now() - PlayerProfiler.sessionData.startTime) / 60000)} minutes`,
                "I can see your cursor",
                "Why are you still playing?",
                "Your heart rate is elevated"
            ];
            
            Phase4UI.showSystemMessage(messages[Math.floor(Math.random() * messages.length)]);
        },
        
        analyzeReaction(eventType, player) {
            // Check how player responded
            // This would analyze movement patterns, input speed, etc.
            const reaction = {
                type: eventType,
                panic: Math.random() > 0.5, // Placeholder
                adaptation: this.currentIntensity
            };
            
            // Adjust future intensity
            if (reaction.panic) {
                this.targetIntensity = Math.max(0.3, this.currentIntensity - 0.1);
            } else {
                this.targetIntensity = Math.min(1, this.currentIntensity + 0.05);
            }
        },
        
        // Get horror statistics
        getStats() {
            return {
                eventsTriggered: this.horrorEvents.length,
                averageIntensity: this.horrorEvents.reduce((a, b) => a + b.intensity, 0) / 
                                  this.horrorEvents.length || 0,
                currentIntensity: this.currentIntensity,
                eventBreakdown: this.horrorEvents.reduce((acc, e) => {
                    acc[e.type] = (acc[e.type] || 0) + 1;
                    return acc;
                }, {})
            };
        }
    };

    // ===== PHASE 4: SANITY SYSTEM =====
    const SanitySystem = {
        SANITY_STATES: {
            STABLE: { threshold: 80, effects: [] },
            UNSETTLED: { threshold: 60, effects: ['whispers', 'flicker'] },
            DISTURBED: { threshold: 40, effects: ['whispers', 'flicker', 'shadows', 'distortion'] },
            FRAGMENTED: { threshold: 20, effects: ['whispers', 'flicker', 'shadows', 'distortion', 'hallucinations', 'glitches'] },
            BROKEN: { threshold: 0, effects: ['all', 'reality_break'] }
        },
        
        currentState: 'STABLE',
        hallucinations: [],
        activeEffects: new Set(),
        
        update(dt, player) {
            const sanityPercent = (player.sanity / player.maxSanity) * 100;
            
            // Determine sanity state
            let newState = 'STABLE';
            for (const [state, data] of Object.entries(this.SANITY_STATES)) {
                if (sanityPercent <= data.threshold) {
                    newState = state;
                }
            }
            
            // State changed
            if (newState !== this.currentState) {
                this.transitionState(this.currentState, newState);
                this.currentState = newState;
            }
            
            // Apply state effects
            this.applyStateEffects(dt, player);
            
            // Update hallucinations
            this.updateHallucinations(dt, player);
        },
        
        transitionState(oldState, newState) {
            console.log(`Sanity transition: ${oldState} -> ${newState}`);
            
            // Clear old effects
            this.activeEffects.clear();
            
            // Apply new state effects
            const stateData = this.SANITY_STATES[newState];
            for (const effect of stateData.effects) {
                this.activeEffects.add(effect);
            }
        },
        
        applyStateEffects(dt, player) {
            // Apply each active effect
            for (const effect of this.activeEffects) {
                switch(effect) {
                    case 'whispers':
                        if (Math.random() < 0.01) {
                            Phase4Audio.playWhisper();
                        }
                        break;
                    case 'flicker':
                        if (Math.random() < 0.02) {
                            Phase4Effects.triggerFlicker();
                        }
                        break;
                    case 'shadows':
                        if (Math.random() < 0.005) {
                            this.spawnShadowFigure(player);
                        }
                        break;
                    case 'distortion':
                        Phase4Effects.applyDistortion(0.3);
                        break;
                    case 'hallucinations':
                        if (Math.random() < 0.01) {
                            this.spawnHallucination(player);
                        }
                        break;
                    case 'glitches':
                        if (Math.random() < 0.02) {
                            Phase4Effects.triggerGlitch(0.2);
                        }
                        break;
                    case 'reality_break':
                        this.applyRealityBreak(player);
                        break;
                }
            }
        },
        
        spawnShadowFigure(player) {
            // Spawn a non-interactive shadow figure
            this.hallucinations.push({
                type: 'shadow',
                x: player.x + (Math.random() - 0.5) * 400,
                y: player.y,
                life: 3,
                opacity: 0
            });
        },
        
        spawnHallucination(player) {
            // Spawn fake monster
            const types = ['Crawler', 'Floater', 'Chaser'];
            this.hallucinations.push({
                type: 'monster',
                monsterType: types[Math.floor(Math.random() * types.length)],
                x: player.x + (Math.random() - 0.5) * 300,
                y: player.y - 100,
                life: 5,
                vx: 0,
                vy: 0
            });
        },
        
        updateHallucinations(dt, player) {
            for (let i = this.hallucinations.length - 1; i >= 0; i--) {
                const h = this.hallucinations[i];
                h.life -= dt;

                // Fade in/out
                if (h.life > 4) {
                    h.opacity = Math.min(1, h.opacity + dt);
                } else if (h.life < 1) {
                    h.opacity = Math.max(0, h.opacity - dt * 2);
                }

                // Move hallucinations
                if (h.type === 'monster') {
                    const dx = player.x - h.x;
                    const dy = player.y - h.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 0) {
                        h.vx = (dx / dist) * 50;
                        h.vy = (dy / dist) * 50;
                    }

                    h.x += h.vx * dt;
                    h.y += h.vy * dt;
                }

                if (h.life <= 0) {
                    this.hallucinations.splice(i, 1);
                }
            }
        },

        // Render hallucinations to the game canvas
        renderHallucinations(ctx, camera, player) {
            for (const h of this.hallucinations) {
                const screenX = h.x - camera.x;
                const screenY = h.y - camera.y;

                // Don't render if off-screen
                if (screenX < -100 || screenX > ctx.canvas.width + 100) continue;
                if (screenY < -100 || screenY > ctx.canvas.height + 100) continue;

                ctx.globalAlpha = h.opacity;

                if (h.type === 'shadow') {
                    // Render shadow figure - humanoid silhouette
                    const gradient = ctx.createRadialGradient(
                        screenX, screenY - 50, 0,
                        screenX, screenY - 50, 80
                    );
                    gradient.addColorStop(0, 'rgba(20,20,30,0.8)');
                    gradient.addColorStop(1, 'rgba(0,0,0,0)');

                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.ellipse(screenX, screenY - 50, 40, 70, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Eyes
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.beginPath();
                    ctx.arc(screenX - 15, screenY - 70, 5, 0, Math.PI * 2);
                    ctx.arc(screenX + 15, screenY - 70, 5, 0, Math.PI * 2);
                    ctx.fill();

                } else if (h.type === 'monster') {
                    // Render fake monster based on type
                    ctx.save();
                    ctx.translate(screenX, screenY);

                    // Face toward player
                    if (player.x < h.x) {
                        ctx.scale(-1, 1);
                    }

                    switch (h.monsterType) {
                        case 'Crawler':
                            // Four-legged creature
                            ctx.fillStyle = '#2d4a2d';
                            ctx.beginPath();
                            ctx.ellipse(0, 0, 40, 20, 0, 0, Math.PI * 2);
                            ctx.fill();

                            // Legs
                            ctx.strokeStyle = '#2d4a2d';
                            ctx.lineWidth = 8;
                            for (let i = 0; i < 4; i++) {
                                const legOffset = (i % 2 === 0 ? 1 : -1) * 25;
                                const legFront = i < 2 ? -20 : 20;
                                ctx.beginPath();
                                ctx.moveTo(legFront, 0);
                                ctx.lineTo(legFront + legOffset, 30);
                                ctx.stroke();
                            }

                            // Glowing eyes
                            ctx.fillStyle = '#ff0000';
                            ctx.shadowColor = '#ff0000';
                            ctx.shadowBlur = 10;
                            ctx.beginPath();
                            ctx.arc(25, -10, 4, 0, Math.PI * 2);
                            ctx.arc(32, -10, 4, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.shadowBlur = 0;
                            break;

                        case 'Floater':
                            // Floating spherical entity
                            const floatGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 40);
                            floatGrad.addColorStop(0, '#4a004a');
                            floatGrad.addColorStop(1, '#1a001a');
                            ctx.fillStyle = floatGrad;
                            ctx.beginPath();
                            ctx.arc(0, -20, 40, 0, Math.PI * 2);
                            ctx.fill();

                            // Tentacles
                            ctx.strokeStyle = '#4a004a';
                            ctx.lineWidth = 6;
                            for (let i = 0; i < 5; i++) {
                                const angle = (i / 5) * Math.PI - Math.PI / 2;
                                const tentacleLen = 30 + Math.sin(Date.now() / 200 + i) * 10;
                                ctx.beginPath();
                                ctx.moveTo(0, 20);
                                ctx.quadraticCurveTo(
                                    Math.cos(angle) * tentacleLen,
                                    40 + Math.sin(angle) * 20,
                                    Math.cos(angle) * tentacleLen * 1.5,
                                    60 + Math.sin(Date.now() / 300 + i) * 20
                                );
                                ctx.stroke();
                            }

                            // Single eye
                            ctx.fillStyle = '#ffff00';
                            ctx.shadowColor = '#ffff00';
                            ctx.shadowBlur = 15;
                            ctx.beginPath();
                            ctx.arc(0, -15, 15, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.shadowBlur = 0;
                            break;

                        case 'Chaser':
                            // Humanoid runner
                            ctx.fillStyle = '#1a1a2e';

                            // Body
                            ctx.beginPath();
                            ctx.ellipse(0, -10, 15, 35, 0, 0, Math.PI * 2);
                            ctx.fill();

                            // Head
                            ctx.beginPath();
                            ctx.arc(0, -45, 12, 0, Math.PI * 2);
                            ctx.fill();

                            // Arms (reaching forward)
                            ctx.strokeStyle = '#1a1a2e';
                            ctx.lineWidth = 10;
                            ctx.lineCap = 'round';
                            ctx.beginPath();
                            ctx.moveTo(15, -30);
                            ctx.quadraticCurveTo(40, -35, 50, -25);
                            ctx.stroke();
                            ctx.beginPath();
                            ctx.moveTo(-15, -30);
                            ctx.quadraticCurveTo(-40, -35, -50, -25);
                            ctx.stroke();

                            // Legs (running pose)
                            const legAnim = Math.sin(Date.now() / 100) * 20;
                            ctx.beginPath();
                            ctx.moveTo(10, 20);
                            ctx.lineTo(10 + legAnim, 50);
                            ctx.moveTo(-10, 20);
                            ctx.lineTo(-10 - legAnim, 50);
                            ctx.stroke();

                            // Empty eye sockets
                            ctx.fillStyle = '#000000';
                            ctx.beginPath();
                            ctx.arc(3, -48, 5, 0, Math.PI * 2);
                            ctx.arc(-3, -48, 5, 0, Math.PI * 2);
                            ctx.fill();
                            break;
                    }

                    ctx.restore();
                }
            }

            ctx.globalAlpha = 1;
        },
        
        applyRealityBreak(player) {
            // Extreme effects when sanity reaches 0
            Phase4Effects.triggerGlitch(2);
            Phase4Effects.setChromaticAberration(10);
            
            // Invert controls randomly
            if (Math.random() < 0.1) {
                player.invertedControls = !player.invertedControls;
                setTimeout(() => {
                    player.invertedControls = false;
                }, 2000);
            }
        },
        
        // Restore sanity
        restoreSanity(player, amount) {
            player.sanity = Math.min(player.maxSanity, player.sanity + amount);
        },
        
        // Drain sanity
        drainSanity(player, amount) {
            player.sanity = Math.max(0, player.sanity - amount);
        }
    };

    // ===== PHASE 4: ENHANCED AUDIO SYSTEM =====
    const Phase4Audio = {
        ctx: null,
        masterGain: null,
        sounds: new Map(),
        music: null,
        ambient: null,
        whisperTextures: [],
        initialized: false,

        // Sound presets (procedural)
        SOUND_PRESETS: {
            jumpscare: { type: 'noise', duration: 0.3, frequency: 150, decay: 0.1 },
            whisper: { type: 'filtered-noise', duration: 1.5, cutoff: 800 },
            glitch: { type: 'stutter', duration: 0.5, rate: 30 },
            drone: { type: 'oscillator', frequency: 50, duration: 5 },
            sting: { type: 'oscillator', frequency: 800, duration: 0.3, slide: -600 },
            heartbeat: { type: 'noise', duration: 0.15, frequency: 60 },
            screech: { type: 'oscillator', frequency: 1200, duration: 0.4, modulation: 50 },
            rumble: { type: 'noise', duration: 2, frequency: 30, lowpass: 100 }
        },

        init() {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.ctx.createGain();
                this.masterGain.connect(this.ctx.destination);
                this.masterGain.gain.value = 0.5;
                this.initialized = true;
                console.log('Phase 4: Audio System initialized');
            } catch (e) {
                console.warn('Phase 4: Web Audio API not available', e);
            }
        },

        resume() {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },

        // Procedural sound generation
        createNoiseBuffer(duration) {
            if (!this.ctx) return null;
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            return buffer;
        },

        playSound(name, volume = 1) {
            if (!this.initialized) return;
            this.resume();

            const preset = this.SOUND_PRESETS[name];
            if (!preset) {
                console.warn(`Unknown sound: ${name}`);
                return;
            }

            const now = this.ctx.currentTime;
            const gain = this.ctx.createGain();
            gain.connect(this.masterGain);
            gain.gain.setValueAtTime(volume, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + preset.duration);

            switch (preset.type) {
                case 'noise': {
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = this.createNoiseBuffer(preset.duration);
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(preset.frequency || 500, now);
                    if (preset.decay) {
                        filter.frequency.exponentialRampToValueAtTime(100, now + preset.duration * preset.decay);
                    }
                    noise.connect(filter);
                    filter.connect(gain);
                    noise.start(now);
                    noise.stop(now + preset.duration);
                    break;
                }

                case 'oscillator': {
                    const osc = this.ctx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(preset.frequency, now);
                    if (preset.slide) {
                        osc.frequency.exponentialRampToValueAtTime(
                            preset.frequency + preset.slide,
                            now + preset.duration
                        );
                    }
                    if (preset.modulation) {
                        const lfo = this.ctx.createOscillator();
                        lfo.frequency.value = preset.modulation;
                        const lfoGain = this.ctx.createGain();
                        lfoGain.gain.value = 200;
                        lfo.connect(lfoGain);
                        lfoGain.connect(osc.frequency);
                        lfo.start(now);
                        lfo.stop(now + preset.duration);
                    }
                    osc.connect(gain);
                    osc.start(now);
                    osc.stop(now + preset.duration);
                    break;
                }

                case 'stutter': {
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = this.createNoiseBuffer(preset.duration);
                    const stutterGain = this.ctx.createGain();
                    stutterGain.gain.value = 0;

                    // Create stutter effect
                    const stutterRate = preset.rate || 30;
                    for (let i = 0; i < preset.duration * stutterRate; i++) {
                        if (i % 2 === 0) {
                            stutterGain.gain.setValueAtTime(volume, now + i / stutterRate);
                        } else {
                            stutterGain.gain.setValueAtTime(0, now + i / stutterRate);
                        }
                    }

                    noise.connect(stutterGain);
                    stutterGain.connect(gain);
                    noise.start(now);
                    noise.stop(now + preset.duration);
                    break;
                }

                case 'filtered-noise': {
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = this.createNoiseBuffer(preset.duration);
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.setValueAtTime(preset.cutoff || 1000, now);
                    filter.Q.value = 2;
                    noise.connect(filter);
                    filter.connect(gain);
                    noise.start(now);
                    noise.stop(now + preset.duration);
                    break;
                }
            }
        },

        playMusic(track, volume = 0.5) {
            // For chase music, create an intense procedural track
            if (!this.initialized) return;
            this.resume();

            const now = this.ctx.currentTime;
            const duration = 10; // 10 second loop

            // Create rhythmic pattern
            const pattern = [150, 0, 100, 0, 200, 50, 0, 150];
            let time = now;

            for (let i = 0; i < 32; i++) {
                const freq = pattern[i % pattern.length];
                if (freq > 0) {
                    const osc = this.ctx.createOscillator();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(freq, time);

                    const gain = this.ctx.createGain();
                    gain.connect(this.masterGain);
                    gain.gain.setValueAtTime(volume * 0.5, time);
                    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

                    osc.connect(gain);
                    osc.start(time);
                    osc.stop(time + 0.15);
                }
                time += 0.125;
            }
        },

        playAmbient(type, volume = 0.3) {
            if (!this.initialized) return;
            this.resume();

            const now = this.ctx.currentTime;

            switch (type) {
                case 'whispers':
                    this.playWhisper();
                    break;

                case 'flicker':
                    // Electrical flicker sound
                    const osc = this.ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(60 + Math.random() * 20, now);
                    const gain = this.ctx.createGain();
                    gain.connect(this.masterGain);
                    gain.gain.setValueAtTime(volume * 0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                    osc.connect(gain);
                    osc.start(now);
                    osc.stop(now + 0.3);
                    break;

                case 'shadow':
                    // Deep rumble
                    this.playSound('rumble', volume * 0.5);
                    break;

                case 'creak':
                    // High pitched squeak
                    const creakOsc = this.ctx.createOscillator();
                    creakOsc.type = 'triangle';
                    creakOsc.frequency.setValueAtTime(800, now);
                    creakOsc.frequency.linearRampToValueAtTime(1200, now + 0.2);
                    const creakGain = this.ctx.createGain();
                    creakGain.connect(this.masterGain);
                    creakGain.gain.setValueAtTime(0, now);
                    creakGain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.05);
                    creakGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                    creakOsc.connect(creakGain);
                    creakOsc.start(now);
                    creakOsc.stop(now + 0.5);
                    break;

                case 'dungeon':
                    // Continuous ambient drone
                    if (this.ambient) {
                        this.ambient.stop();
                    }
                    const droneOsc = this.ctx.createOscillator();
                    droneOsc.type = 'sine';
                    droneOsc.frequency.setValueAtTime(40, now);
                    const droneGain = this.ctx.createGain();
                    droneGain.connect(this.masterGain);
                    droneGain.gain.value = volume * 0.3;
                    droneOsc.connect(droneGain);
                    droneOsc.start(now);
                    this.ambient = droneOsc;
                    break;
            }
        },

        playWhisper() {
            if (!this.initialized) return;
            this.resume();

            const whispers = [
                { text: "Don't look back", pitch: 1.2 },
                { text: "They're watching", pitch: 0.8 },
                { text: "You can't escape", pitch: 1.0 },
                { text: "Give up", pitch: 0.7 },
                { text: "Join us", pitch: 1.1 },
                { text: "It remembers you", pitch: 0.9 },
                { text: "Behind you", pitch: 1.3 },
                { text: "Wake up", pitch: 0.6 }
            ];

            const whisper = whispers[Math.floor(Math.random() * whispers.length)];
            const now = this.ctx.currentTime;

            // Create filtered noise for "voice"
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer(2);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, now);
            filter.Q.value = 3;

            const gain = this.ctx.createGain();
            gain.connect(this.masterGain);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

            noise.connect(filter);
            filter.connect(gain);
            noise.start(now);
            noise.stop(now + 2);

            // Store whisper for UI display
            this.lastWhisper = whisper;
            return whisper;
        },

        // Stop all audio
        stopAll() {
            if (this.ambient) {
                this.ambient.stop();
                this.ambient = null;
            }
            if (this.music) {
                this.music.stop();
                this.music = null;
            }
        }
    };

    // ===== PHASE 4: ENHANCED UI SYSTEM =====
    const Phase4UI = {
        floatingTexts: [],
        systemMessages: [],
        fourthWallEvents: 0,

        showFloatingText(x, y, text, color = '#ff00ff', duration = 2, size = 16) {
            this.floatingTexts.push({
                x, y, text, color, size,
                life: duration,
                maxLife: duration,
                vy: -20
            });
        },

        showSystemMessage(message, type = 'psychological', duration = 3000) {
            const msg = {
                message,
                type,
                createdAt: Date.now(),
                duration
            };

            // Create DOM element for message
            const el = document.createElement('div');
            el.className = `phase4-message phase4-${type}`;
            el.textContent = message;
            el.style.cssText = `
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.8);
                color: ${type === 'error' ? '#ff0000' : type === 'warning' ? '#ffaa00' : '#00ff00'};
                padding: 15px 25px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 14px;
                z-index: 10000;
                animation: phase4MessageFade 0.3s ease;
            `;

            document.body.appendChild(el);

            setTimeout(() => {
                el.style.opacity = '0';
                el.style.transition = 'opacity 0.5s';
                setTimeout(() => el.remove(), 500);
            }, duration);

            return el;
        },

        // Fourth wall breaking messages
        showFourthWallMessage(player, gameData) {
            this.fourthWallEvents++;

            const messages = [
                () => `Player detected on ${navigator.platform}`,
                () => `Session: ${Math.floor((Date.now() - gameData.startTime) / 60000)} minutes`,
                () => `Death count: ${gameData.deaths} (you're not doing great)`,
                () => `I can see your cursor at (${gameData.mouseX}, ${gameData.mouseY})`,
                () => `Your FPS: ${gameData.fps} - having trouble?`,
                () => `Why are you still playing?`,
                () => `This is death #${gameData.deaths}. Want to talk about it?`,
                () => `Alt+F4 to escape (just kidding... or am I?)`,
                () => `Your sanity is ${Math.floor(player.sanity)}%. This is fine.`,
                () => `Achievement unlocked: Persistence (dying a lot)`,
                () => `The game remembers your failures.`,
                () => `Phase ${gameData.currentPhase} of 15. You're ${Math.floor(gameData.currentPhase / 15 * 100)}% done.`,
                () => `Local time: ${new Date().toLocaleTimeString()}. Shouldn't you be sleeping?`,
                () => `Battery level: ${gameData.battery || 'unknown'}. Keep playing!`,
                () => `Screen resolution: ${window.innerWidth}x${window.innerHeight}. Nice monitor.`,
                () => `${this.fourthWallEvents === 10 ? 'You\'ve seen 10 of these messages. Congrats?' : ''}`,
            ];

            const msg = messages[Math.floor(Math.random() * messages.length)]();
            if (msg) {
                this.showSystemMessage(msg, 'fourth-wall', 4000);
            }
        },

        updateFloatingTexts(dt, ctx, camera) {
            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const text = this.floatingTexts[i];
                text.life -= dt;
                text.y += text.vy * dt;

                if (text.life <= 0) {
                    this.floatingTexts.splice(i, 1);
                } else {
                    // Render
                    const screenX = text.x - camera.x;
                    const screenY = text.y - camera.y;
                    ctx.globalAlpha = text.life / text.maxLife;
                    ctx.fillStyle = text.color;
                    ctx.font = `${text.size}px monospace`;
                    ctx.textAlign = 'center';
                    ctx.fillText(text.text, screenX, screenY);
                }
            }
            ctx.globalAlpha = 1;
        },

        render(ctx, width, height) {
            this.updateFloatingTexts(1/60, ctx, { x: 0, y: 0 });
        }
    };

    // ===== PHASE 4: MAIN API =====
    const Phase4Core = {
        initialized: false,

        init() {
            if (this.initialized) return;
            PlayerProfiler.init();
            AdaptiveHorror.init();
            Phase4Effects.init();
            Phase4Audio.init();
            this.initialized = true;
            console.log('Phase 4: Advanced Psychological Systems initialized');
        },

        update(dt, player, monsters) {
            AdaptiveHorror.update(dt, player, monsters);
            SanitySystem.update(dt, player);
            Phase4Effects.update(dt);
        },

        // Render all Phase 4 effects
        render(ctx, camera, player, time, dt = 1/60) {
            // Render psychological effects (glitch, chromatic aberration, etc.)
            Phase4Effects.render(ctx, ctx.canvas.width, ctx.canvas.height, time);

            // Render hallucinations
            SanitySystem.renderHallucinations(ctx, camera, player);

            // Render floating texts
            Phase4UI.updateFloatingTexts(dt, ctx, camera);
        },

        // Player behavior analysis
        recordBehavior(event) {
            PlayerProfiler.analyzeBehavior(event);
        },

        // Get horror stats
        getHorrorStats() {
            return AdaptiveHorror.getStats();
        },

        // Get player profile
        getPlayerProfile() {
            return PlayerProfiler.profile;
        },

        // Manual horror trigger
        triggerHorror(type) {
            AdaptiveHorror.triggerHorrorEvent(type, { x: 0, y: 0 }, []);
        },

        // Get render state
        getRenderState() {
            return Phase4Effects.getRenderState();
        },

        // Get hallucinations
        getHallucinations() {
            return SanitySystem.hallucinations;
        },

        // Trigger fourth wall message
        triggerFourthWall(gameData) {
            Phase4UI.showFourthWallMessage(
                { sanity: gameData.player?.sanity || 100 },
                gameData
            );
        }
    };

    // Export Phase 4 systems
    window.Phase4Core = Phase4Core;
    window.PlayerProfiler = PlayerProfiler;
    window.AdaptiveHorror = AdaptiveHorror;
    window.SanitySystem = SanitySystem;
    window.Phase4Effects = Phase4Effects;
    window.Phase4Audio = Phase4Audio;
    window.Phase4UI = Phase4UI;

})();
