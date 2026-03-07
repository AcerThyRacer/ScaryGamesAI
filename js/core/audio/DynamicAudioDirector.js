/**
 * ============================================
 * SGAI PHASE 4: DYNAMIC AUDIO DIRECTOR
 * ============================================
 * Unified adaptive audio system for all 8 horror games
 * 
 * Features:
 * - Dynamic Music System integration
 * - Procedural Audio Engine integration
 * - Spatial Audio 3D
 * - Intensity-based transitions
 * - Game-specific audio profiles
 * - Zero external assets required
 * 
 * Usage:
 *   const audioDirector = new DynamicAudioDirector();
 *   await audioDirector.init('blood-tetris');
 *   audioDirector.setIntensity(0.7);
 */

(function(global) {
    'use strict';

    // ============================================
    // DYNAMIC AUDIO DIRECTOR
    // ============================================

    class DynamicAudioDirector {
        constructor() {
            this.context = null;
            this.musicSystem = null;
            this.proceduralEngine = null;
            this.spatialAudio = null;
            this.initialized = false;
            this.currentGame = null;
            this.currentIntensity = 0;
            this.targetIntensity = 0;
            this.intensityLerp = 0.05;
            this.masterVolume = 0.8;
            this.sfxVolume = 0.7;
            this.musicVolume = 0.5;
            this.enabled = true;
            this.muted = false;
            
            // Audio profiles for each game
            this.gameProfiles = {
                'blood-tetris': {
                    bpm: 128,
                    layers: ['ambient', 'tension', 'action', 'horror', 'climax'],
                    sfxPrefix: 'tetris',
                    intensityTriggers: {
                        lines: 0.1,
                        combo: 0.15,
                        tetris: 0.4,
                        curse: 0.6
                    }
                },
                'ritual-circle': {
                    bpm: 90,
                    layers: ['ambient', 'tension', 'ritual', 'horror', 'climax'],
                    sfxPrefix: 'ritual',
                    intensityTriggers: {
                        wave: 0.1,
                        enemyNear: 0.05,
                        trapPlace: 0.1,
                        boss: 0.8
                    }
                },
                'zombie-horde': {
                    bpm: 140,
                    layers: ['ambient', 'tension', 'action', 'horror', 'climax'],
                    sfxPrefix: 'zombie',
                    intensityTriggers: {
                        zombieNear: 0.03,
                        wave: 0.15,
                        boss: 0.9,
                        turretFire: 0.05
                    }
                },
                'seance': {
                    bpm: 60,
                    layers: ['ambient', 'mystery', 'tension', 'supernatural', 'climax'],
                    sfxPrefix: 'seance',
                    intensityTriggers: {
                        spiritNear: 0.2,
                        evidence: 0.3,
                        haunting: 0.7
                    }
                },
                'crypt-tanks': {
                    bpm: 110,
                    layers: ['ambient', 'tension', 'combat', 'horror', 'climax'],
                    sfxPrefix: 'tank',
                    intensityTriggers: {
                        enemyNear: 0.1,
                        combat: 0.3,
                        boss: 0.8
                    }
                },
                'yeti-run': {
                    bpm: 150,
                    layers: ['ambient', 'chase', 'action', 'horror', 'climax'],
                    sfxPrefix: 'yeti',
                    intensityTriggers: {
                        obstacle: 0.1,
                        speed: 0.05,
                        chase: 0.6
                    }
                },
                'nightmare-run': {
                    bpm: 145,
                    layers: ['ambient', 'chase', 'action', 'horror', 'climax'],
                    sfxPrefix: 'nightmare',
                    intensityTriggers: {
                        obstacle: 0.1,
                        enemy: 0.2,
                        boss: 0.8
                    }
                },
                'cursed-arcade': {
                    bpm: 120,
                    layers: ['retro-ambient', 'retro-tension', 'retro-action', 'glitch', 'climax'],
                    sfxPrefix: 'arcade',
                    intensityTriggers: {
                        score: 0.05,
                        curse: 0.5,
                        boss: 0.9
                    }
                }
            };

            // SFX definitions
            this.sfxDefinitions = {
                // Blood Tetris SFX
                'tetris:move': { type: 'click', freq: 400, duration: 0.05 },
                'tetris:rotate': { type: 'click', freq: 600, duration: 0.05 },
                'tetris:drop': { type: 'hit', freq: 200, duration: 0.1 },
                'tetris:clear': { type: 'collect', freq: 880, duration: 0.2 },
                'tetris:tetris': { type: 'jumpscare', freq: 440, duration: 1.0 },
                'tetris:curse': { type: 'ghost', freq: 300, duration: 0.5 },
                'tetris:powerup': { type: 'collect', freq: 1200, duration: 0.3 },
                
                // Ritual Circle SFX
                'ritual:place': { type: 'door', freq: 150, duration: 0.3 },
                'ritual:activate': { type: 'ghost', freq: 400, duration: 0.5 },
                'ritual:damage': { type: 'hit', freq: 100, duration: 0.2 },
                'ritual:spell': { type: 'jumpscare', freq: 600, duration: 0.8 },
                'ritual:wave': { type: 'creak', freq: 200, duration: 1.0 },
                
                // Zombie Horde SFX
                'zombie:groan': { type: 'whisper', freq: 150, duration: 0.5 },
                'zombie:step': { type: 'footstep', freq: 100, duration: 0.1 },
                'zombie:bite': { type: 'hit', freq: 200, duration: 0.15 },
                'zombie:death': { type: 'scratch', freq: 300, duration: 0.4 },
                'zombie:explosion': { type: 'jumpscare', freq: 100, duration: 0.8 },
                'turret:fire': { type: 'hit', freq: 800, duration: 0.1 },
                'turret:reload': { type: 'click', freq: 600, duration: 0.1 },
                
                // Generic horror SFX
                'horror:heartbeat': { type: 'heartbeat', freq: 60, duration: 0.3 },
                'horror:breath': { type: 'whisper', freq: 200, duration: 1.0 },
                'horror:creak': { type: 'creak', freq: 150, duration: 0.6 },
                'horror:slam': { type: 'door', freq: 100, duration: 0.3 },
                'horror:glass': { type: 'hit', freq: 1000, duration: 0.2 },
                'horror:metal': { type: 'scratch', freq: 800, duration: 0.3 }
            };
        }

        /**
         * Initialize audio director for a specific game
         */
        async init(gameId) {
            if (this.initialized) return true;

            try {
                // Create audio context
                this.context = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: 44100,
                    latencyHint: 'interactive'
                });

                // Create master gain
                this.masterGain = this.context.createGain();
                this.masterGain.gain.value = this.masterVolume;
                this.masterGain.connect(this.context.destination);

                // Create music gain
                this.musicGain = this.context.createGain();
                this.musicGain.gain.value = this.musicVolume;
                this.musicGain.connect(this.masterGain);

                // Create SFX gain
                this.sfxGain = this.context.createGain();
                this.sfxGain.gain.value = this.sfxVolume;
                this.sfxGain.connect(this.masterGain);

                // Create reverb
                this.reverb = await this._createReverb(2.0);
                this.reverb.connect(this.masterGain);

                // Set current game
                this.currentGame = gameId;
                this.profile = this.gameProfiles[gameId] || this.gameProfiles['blood-tetris'];

                // Initialize music system
                this._initMusicSystem();

                // Initialize procedural engine
                this._initProceduralEngine();

                this.initialized = true;
                console.log(`[DynamicAudioDirector] Initialized for ${gameId}`);
                
                return true;
            } catch (error) {
                console.error('[DynamicAudioDirector] Init failed:', error);
                return false;
            }
        }

        /**
         * Initialize music system with game-specific profile
         */
        _initMusicSystem() {
            const profile = this.profile;
            
            // Create music tracks
            this.tracks = new Map();
            
            // Generate layers for current game
            profile.layers.forEach((layerName, index) => {
                const buffer = this._generateMusicLayer(layerName, profile.bpm);
                this.tracks.set(layerName, {
                    buffer,
                    source: null,
                    gain: this.context.createGain(),
                    filter: this.context.createBiquadFilter(),
                    targetVolume: 0,
                    baseFreq: this._getLayerBaseFreq(layerName)
                });

                const track = this.tracks.get(layerName);
                track.gain.connect(this.musicGain);
                track.filter.connect(track.gain);
                track.filter.frequency.value = track.baseFreq;
            });
        }

        /**
         * Initialize procedural SFX engine
         */
        _initProceduralEngine() {
            this.sfxCache = new Map();
            this.activeSFX = [];
            this.maxPolyphony = 24;
        }

        /**
         * Generate procedural music layer
         */
        _generateMusicLayer(layerName, bpm) {
            const duration = 8; // 8 second loop
            const sampleRate = this.context.sampleRate;
            const length = sampleRate * duration;
            const buffer = this.context.createBuffer(2, length, sampleRate);
            const left = buffer.getChannelData(0);
            const right = buffer.getChannelData(1);

            // Scales for different moods
            const scales = {
                ambient: [65.41, 77.78, 98.00, 130.81, 155.56, 196.00],
                tension: [65.41, 69.30, 98.00, 123.47, 155.56, 185.00],
                action: [65.41, 77.78, 98.00, 130.81, 146.83, 196.00],
                horror: [65.41, 69.30, 92.50, 123.47, 155.56, 185.00],
                climax: [65.41, 77.78, 98.00, 130.81, 164.81, 196.00],
                ritual: [65.41, 73.42, 98.00, 130.81, 146.83, 196.00],
                mystery: [65.41, 77.78, 92.50, 130.81, 155.56, 185.00],
                supernatural: [65.41, 69.30, 98.00, 116.54, 155.56, 196.00],
                combat: [65.41, 77.78, 98.00, 130.81, 155.56, 196.00],
                chase: [65.41, 82.41, 98.00, 130.81, 164.81, 196.00],
                'retro-ambient': [130.81, 155.56, 196.00, 261.63, 329.63, 392.00],
                'retro-tension': [130.81, 138.59, 196.00, 246.94, 311.13, 369.99],
                'retro-action': [130.81, 164.81, 196.00, 261.63, 329.63, 392.00],
                glitch: [130.81, 138.59, 185.00, 246.94, 311.13, 392.00]
            };

            const scale = scales[layerName] || scales.ambient;
            const baseFreq = scale[0];
            const beatDuration = 60 / bpm;

            for (let i = 0; i < length; i++) {
                const t = i / sampleRate;
                const beat = t / beatDuration;

                let sample = 0;

                // Generate based on layer type
                switch (layerName) {
                    case 'ambient':
                        // Drone pad
                        scale.forEach((freq, idx) => {
                            const amp = 0.08 / (idx + 1);
                            sample += Math.sin(2 * Math.PI * freq * t) * amp;
                        });
                        sample *= 0.3;
                        break;

                    case 'tension':
                        // Pulsing bass
                        const pulse = Math.sin(2 * Math.PI * (bpm / 60 / 2) * t);
                        const envelope = pulse > 0 ? pulse : 0;
                        sample = Math.sin(2 * Math.PI * baseFreq * t) * envelope * 0.4;
                        break;

                    case 'action':
                    case 'combat':
                        // Arpeggiated sequence
                        const arpSpeed = bpm / 60 * 4;
                        const noteIndex = Math.floor(beat * 4) % scale.length;
                        const noteFreq = scale[noteIndex];
                        sample = Math.sin(2 * Math.PI * noteFreq * t) * 0.35;
                        break;

                    case 'horror':
                        // Dissonant cluster
                        sample = (
                            Math.sin(2 * Math.PI * scale[0] * t) * 0.2 +
                            Math.sin(2 * Math.PI * scale[1] * t) * 0.2 +
                            Math.sin(2 * Math.PI * scale[3] * t) * 0.2
                        );
                        break;

                    case 'climax':
                        // Full orchestral hit simulation
                        scale.forEach((freq, idx) => {
                            const amp = 0.12 / (idx + 1);
                            sample += Math.sin(2 * Math.PI * freq * t) * amp;
                        });
                        sample *= 0.4;
                        break;

                    case 'ritual':
                        // Ritualistic chanting simulation
                        const chantFreq = baseFreq * 0.5;
                        sample = Math.sin(2 * Math.PI * chantFreq * t) * 0.3;
                        sample += Math.sin(2 * Math.PI * chantFreq * 1.5 * t) * 0.15;
                        // Amplitude modulation for chanting effect
                        sample *= 1 + Math.sin(2 * Math.PI * (bpm / 60) * t) * 0.3;
                        break;

                    case 'mystery':
                        // Mysterious pluck sounds
                        const pluckInterval = beatDuration * 2;
                        const pluckPhase = (t % pluckInterval) / pluckInterval;
                        const pluckEnv = Math.exp(-pluckPhase * 5);
                        const pluckFreq = scale[Math.floor(beat) % scale.length];
                        sample = Math.sin(2 * Math.PI * pluckFreq * t) * pluckEnv * 0.3;
                        break;

                    case 'supernatural':
                        // Ethereal pad
                        scale.forEach((freq, idx) => {
                            const amp = 0.06 / (idx + 1);
                            const lfo = 1 + Math.sin(2 * Math.PI * 0.5 * t) * 0.3;
                            sample += Math.sin(2 * Math.PI * freq * t) * amp * lfo;
                        });
                        break;

                    case 'chase':
                        // Fast paced bass
                        const chasePulse = Math.sin(2 * Math.PI * (bpm / 60) * t);
                        const chaseEnv = chasePulse > 0 ? chasePulse : 0;
                        sample = Math.sin(2 * Math.PI * baseFreq * 2 * t) * chaseEnv * 0.35;
                        break;

                    case 'retro-ambient':
                        // Retro sine wave pad
                        scale.forEach((freq, idx) => {
                            sample += Math.sin(2 * Math.PI * freq * t) * 0.1;
                        });
                        sample *= 0.25;
                        break;

                    case 'retro-tension':
                        // Retro square wave tension
                        const squareFreq = scale[1];
                        sample = Math.sign(Math.sin(2 * Math.PI * squareFreq * t)) * 0.15;
                        break;

                    case 'retro-action':
                        // Retro arpeggio
                        const retroNote = scale[Math.floor(beat * 8) % scale.length];
                        sample = Math.sign(Math.sin(2 * Math.PI * retroNote * t)) * 0.12;
                        break;

                    case 'glitch':
                        // Glitchy noise
                        if (Math.random() < 0.1) {
                            sample = (Math.random() * 2 - 1) * 0.3;
                        } else {
                            const glitchFreq = scale[Math.floor(Math.random() * scale.length)];
                            sample = Math.sin(2 * Math.PI * glitchFreq * t) * 0.1;
                        }
                        break;
                }

                // Add subtle noise for texture
                sample += (Math.random() * 2 - 1) * 0.02;

                // Smooth envelope to avoid clicks
                const envelope = Math.min(1, i / (sampleRate * 0.1)) *
                                 Math.min(1, (length - i) / (sampleRate * 0.1));

                left[i] = sample * envelope;
                right[i] = sample * envelope * 0.95;
            }

            return buffer;
        }

        /**
         * Get base frequency for layer filter
         */
        _getLayerBaseFreq(layerName) {
            const freqs = {
                ambient: 300,
                tension: 400,
                action: 800,
                horror: 300,
                climax: 1000,
                ritual: 250,
                mystery: 500,
                supernatural: 400,
                combat: 600,
                chase: 700,
                'retro-ambient': 800,
                'retro-tension': 1000,
                'retro-action': 1200,
                glitch: 1500
            };
            return freqs[layerName] || 500;
        }

        /**
         * Create impulse response for reverb
         */
        async _createReverb(duration = 2) {
            const sampleRate = this.context.sampleRate;
            const length = sampleRate * duration;
            const impulse = this.context.createBuffer(2, length, sampleRate);
            const left = impulse.getChannelData(0);
            const right = impulse.getChannelData(1);

            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, 2);
                left[i] = (Math.random() * 2 - 1) * decay;
                right[i] = (Math.random() * 2 - 1) * decay;
            }

            const reverb = this.context.createConvolver();
            reverb.buffer = impulse;
            reverb.normalize = true;
            return reverb;
        }

        /**
         * Start music playback
         */
        play() {
            if (!this.initialized || this.muted) return;

            this.tracks.forEach((track, layerName) => {
                track.source = this.context.createBufferSource();
                track.source.buffer = track.buffer;
                track.source.loop = true;
                track.source.connect(track.filter);
                track.source.start(0);
                track.gain.gain.value = 0;
            });

            this.isPlaying = true;
        }

        /**
         * Stop music playback
         */
        stop() {
            if (!this.initialized || !this.isPlaying) return;

            this.tracks.forEach((track) => {
                if (track.source) {
                    track.source.stop();
                    track.source = null;
                }
                track.gain.gain.value = 0;
            });

            this.isPlaying = false;
        }

        /**
         * Set audio intensity (0-1)
         */
        setIntensity(intensity) {
            this.targetIntensity = Math.max(0, Math.min(1, intensity));
        }

        /**
         * Trigger intensity increase
         */
        triggerIntensity(amount) {
            this.targetIntensity = Math.min(1, this.targetIntensity + amount);
        }

        /**
         * Play sound effect
         */
        playSFX(sfxId, options = {}) {
            if (!this.initialized || this.muted) return null;

            const sfxDef = this.sfxDefinitions[sfxId];
            if (!sfxDef) {
                console.warn('[DynamicAudioDirector] Unknown SFX:', sfxId);
                return null;
            }

            const params = {
                frequency: sfxDef.freq,
                duration: sfxDef.duration,
                ...options
            };

            const buffer = this._generateSFX(sfxDef.type, params);
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.sfxGain);
            source.start(0);

            this.activeSFX.push(source);
            source.onended = () => {
                const idx = this.activeSFX.indexOf(source);
                if (idx !== -1) this.activeSFX.splice(idx, 1);
            };

            // Enforce polyphony limit
            if (this.activeSFX.length > this.maxPolyphony) {
                const oldest = this.activeSFX.shift();
                oldest.stop();
            }

            return source;
        }

        /**
         * Generate procedural SFX
         */
        _generateSFX(type, params) {
            const cacheKey = `${type}:${JSON.stringify(params)}`;
            
            if (this.sfxCache.has(cacheKey)) {
                return this.sfxCache.get(cacheKey);
            }

            const duration = params.duration || 0.5;
            const sampleRate = this.context.sampleRate;
            const length = sampleRate * duration;
            const buffer = this.context.createBuffer(2, length, sampleRate);
            const left = buffer.getChannelData(0);
            const right = buffer.getChannelData(1);

            const freq = params.frequency || 440;

            for (let i = 0; i < length; i++) {
                const t = i / sampleRate;
                let sample = 0;

                switch (type) {
                    case 'click':
                        sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 50);
                        break;
                    case 'hit':
                        sample = (Math.random() * 2 - 1) * Math.exp(-t * 20);
                        break;
                    case 'collect':
                        sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 15);
                        break;
                    case 'jumpscare':
                        const mod = Math.sin(2 * Math.PI * 50 * t) * 200;
                        sample = (Math.sin(2 * Math.PI * (freq + mod) * t) + 
                                  (Math.random() * 2 - 1) * 0.5) * Math.exp(-t * 3);
                        break;
                    case 'ghost':
                        sample = Math.sin(2 * Math.PI * freq * t) * 0.3;
                        sample += Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.15;
                        sample *= 1 + Math.sin(2 * Math.PI * 4 * t) * 0.3;
                        sample *= Math.sin(Math.PI * t / duration) * 0.5;
                        break;
                    case 'creak':
                        const mod2 = Math.sin(2 * Math.PI * 5 * t) * 50;
                        sample = Math.sin(2 * Math.PI * (freq + mod2) * t) * Math.exp(-t * 3);
                        break;
                    case 'footstep':
                        if (i < length * 0.1) {
                            sample = (Math.random() * 2 - 1) * Math.exp(-t * 10);
                        } else {
                            sample = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 8) * 0.5;
                        }
                        break;
                    case 'whisper':
                        sample = (Math.random() * 2 - 1) * 0.2;
                        sample += Math.sin(2 * Math.PI * freq * t) * 0.1;
                        sample *= Math.sin(Math.PI * t / duration) * 0.4;
                        break;
                    case 'heartbeat':
                        if (t < 0.1) {
                            sample = Math.exp(-t * 30);
                        } else if (t > 0.15 && t < 0.25) {
                            sample = Math.exp(-(t - 0.15) * 40) * 0.7;
                        } else {
                            sample = 0;
                        }
                        break;
                    case 'scratch':
                        const sweepFreq = freq + Math.sin(t * 50) * 1000;
                        sample = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * sweepFreq * t) * Math.exp(-t * 5);
                        break;
                    case 'door':
                        if (params.type === 'slam') {
                            sample = (Math.random() * 2 - 1) * Math.exp(-t * 10);
                        } else {
                            sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 2);
                        }
                        break;
                    case 'explosion':
                        sample = (Math.random() * 2 - 1) * Math.exp(-t * 5);
                        sample += Math.sin(2 * Math.PI * 100 * t) * Math.exp(-t * 3);
                        break;
                    default:
                        sample = (Math.random() * 2 - 1) * 0.3;
                }

                left[i] = sample;
                right[i] = sample * 0.95;
            }

            this.sfxCache.set(cacheKey, buffer);
            return buffer;
        }

        /**
         * Play 3D spatial sound
         */
        playSpatialSFX(sfxId, position, listenerPosition) {
            if (!this.initialized || this.muted) return null;

            const source = this.playSFX(sfxId);
            if (!source) return null;

            // Create panner for 3D positioning
            const panner = this.context.createPanner();
            panner.positionX.value = position.x || 0;
            panner.positionY.value = position.y || 0;
            panner.positionZ.value = position.z || 0;
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 1;
            panner.maxDistance = 1000;
            panner.rolloffFactor = 1;

            // Calculate distance-based volume
            const dx = position.x - (listenerPosition?.x || 0);
            const dy = position.y - (listenerPosition?.y || 0);
            const dz = position.z - (listenerPosition?.z || 0);
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const volume = Math.max(0, 1 - distance / 500);

            const gain = this.context.createGain();
            gain.gain.value = volume;

            source.disconnect();
            source.connect(panner);
            panner.connect(gain);
            gain.connect(this.sfxGain);

            return source;
        }

        /**
         * Update audio director (call every frame)
         */
        update(dt) {
            if (!this.initialized || !this.isPlaying) return;

            // Smooth intensity transition
            this.currentIntensity += (this.targetIntensity - this.currentIntensity) * this.intensityLerp;

            // Update layer volumes based on intensity
            const layers = this.profile.layers;
            const numLayers = layers.length;

            layers.forEach((layerName, index) => {
                const track = this.tracks.get(layerName);
                if (!track) return;

                const layerThreshold = index / numLayers;
                const layerWidth = 1 / numLayers;

                // Calculate target volume for this layer
                let targetVolume = 0;

                if (this.currentIntensity >= layerThreshold) {
                    const intensityInLayer = (this.currentIntensity - layerThreshold) / layerWidth;
                    targetVolume = Math.min(1, intensityInLayer);
                }

                // Smooth volume transition
                track.gain.gain.setTargetAtTime(
                    targetVolume,
                    this.context.currentTime,
                    0.5
                );

                // Update filter based on intensity
                const filterFreq = track.baseFreq + this.currentIntensity * 2000;
                track.filter.frequency.setTargetAtTime(
                    filterFreq,
                    this.context.currentTime,
                    1
                );
            });

            // Auto-decay intensity slightly
            if (this.targetIntensity > 0.2) {
                this.targetIntensity -= dt * 0.02;
            }
        }

        /**
         * Set master volume
         */
        setMasterVolume(volume) {
            this.masterVolume = Math.max(0, Math.min(1, volume));
            if (this.masterGain) {
                this.masterGain.gain.setTargetAtTime(
                    this.masterVolume,
                    this.context.currentTime,
                    0.1
                );
            }
        }

        /**
         * Set music volume
         */
        setMusicVolume(volume) {
            this.musicVolume = Math.max(0, Math.min(1, volume));
            if (this.musicGain) {
                this.musicGain.gain.setTargetAtTime(
                    this.musicVolume,
                    this.context.currentTime,
                    0.1
                );
            }
        }

        /**
         * Set SFX volume
         */
        setSFXVolume(volume) {
            this.sfxVolume = Math.max(0, Math.min(1, volume));
            if (this.sfxGain) {
                this.sfxGain.gain.setTargetAtTime(
                    this.sfxVolume,
                    this.context.currentTime,
                    0.1
                );
            }
        }

        /**
         * Mute/unmute
         */
        setMuted(muted) {
            this.muted = muted;
            if (this.masterGain) {
                this.masterGain.gain.setTargetAtTime(
                    muted ? 0 : this.masterVolume,
                    this.context.currentTime,
                    0.1
                );
            }
        }

        /**
         * Enable/disable audio
         */
        setEnabled(enabled) {
            this.enabled = enabled;
            if (!enabled) {
                this.stop();
            }
        }

        /**
         * Get current intensity
         */
        getIntensity() {
            return this.currentIntensity;
        }

        /**
         * Cleanup
         */
        dispose() {
            this.stop();
            this.activeSFX.forEach(sfx => sfx.stop());
            this.activeSFX = [];
            
            if (this.context) {
                this.context.close();
            }
            
            this.initialized = false;
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { DynamicAudioDirector };
    } else {
        global.DynamicAudioDirector = DynamicAudioDirector;
    }

})(typeof window !== 'undefined' ? window : this);
