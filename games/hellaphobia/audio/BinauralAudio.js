/* ============================================================
   HELLAPHOBIA - PHASE 9: BINAURAL AUDIO SYSTEM
   3D Spatial Sound | Dynamic Soundtrack | Procedural Audio
   Horror Pacing | Voice Synthesis
   ============================================================ */

(function() {
    'use strict';

    // ===== BINAURAL AUDIO ENGINE =====
    const BinauralAudio = {
        audioContext: null,
        listener: null,
        sounds: new Map(),
        musicTracks: new Map(),
        ambientLayers: new Map(),
        hrtfFilter: null,
        reverbNode: null,
        masterGain: null,
        initialized: false,
        
        async init() {
            if (this.initialized) return;
            
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Create master gain
                this.masterGain = this.audioContext.createGain();
                this.masterGain.gain.value = 0.8;
                this.masterGain.connect(this.audioContext.destination);
                
                // Create reverb for spatial awareness
                this.reverbNode = await this.createReverb();
                this.reverbNode.connect(this.masterGain);
                
                // Setup 3D audio listener
                this.listener = this.audioContext.listener;
                
                console.log('Phase 9: Binaural Audio Engine initialized');
                this.initialized = true;
            } catch (err) {
                console.error('Phase 9: Audio init failed', err);
            }
        },
        
        async createReverb() {
            // Create impulse response for reverb
            const duration = 2;
            const decay = 2;
            const rate = this.audioContext.sampleRate;
            const length = rate * duration;
            const impulse = this.audioContext.createBuffer(2, length, rate);
            const left = impulse.getChannelData(0);
            const right = impulse.getChannelData(1);
            
            for (let i = 0; i < length; i++) {
                const n = i / length;
                left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
                right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
            }
            
            const convolver = this.audioContext.createConvolver();
            convolver.buffer = impulse;
            return convolver;
        },
        
        // Create 3D positioned sound
        createPositionedSound(source, position3d) {
            if (!this.initialized) return null;
            
            const panner = this.audioContext.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.positionX.value = position3d.x;
            panner.positionY.value = position3d.y;
            panner.positionZ.value = position3d.z || 0;
            panner.refDistance = 1;
            panner.maxDistance = 1000;
            panner.rolloffFactor = 1;
            panner.coneInnerAngle = 360;
            panner.coneOuterAngle = 0;
            panner.coneOuterGain = 0;
            
            source.connect(panner);
            panner.connect(this.masterGain);
            
            return { source, panner };
        },
        
        // Play monster sound with 3D positioning
        playMonsterSound(monsterType, position, playerPosition) {
            if (!this.initialized) return;
            
            const sounds = {
                crawler: { freq: 150, type: 'sawtooth', duration: 0.3 },
                chaser: { freq: 100, type: 'square', duration: 0.5 },
                wailer: { freq: 400, type: 'sine', duration: 1.0 },
                stalker: { freq: 200, type: 'triangle', duration: 0.4 },
                mimic: { freq: 300, type: 'sine', duration: 0.2 }
            };
            
            const config = sounds[monsterType] || sounds.crawler;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = config.type;
            osc.frequency.setValueAtTime(config.freq, this.audioContext.currentTime);
            
            gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
            
            osc.connect(gain);
            
            // Calculate relative position
            const relPos = {
                x: position.x - playerPosition.x,
                y: position.y - playerPosition.y,
                z: 0
            };
            
            this.createPositionedSound(gain, relPos);
            
            osc.start();
            osc.stop(this.audioContext.currentTime + config.duration);
        },
        
        // Play whisper in player's ear
        playWhisper(side = 'left', text = '') {
            if (!this.initialized) return;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const panner = this.audioContext.createStereoPanner();
            
            // Whisper-like noise
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800 + Math.random() * 400, this.audioContext.currentTime);
            
            // Position hard left or right
            panner.pan.value = side === 'left' ? -1 : 1;
            
            gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 2);
            
            osc.connect(gain);
            gain.connect(panner);
            panner.connect(this.masterGain);
            
            osc.start();
            osc.stop(this.audioContext.currentTime + 2);
        },
        
        // Update listener position (player)
        updateListener(position, rotation) {
            if (!this.initialized || !this.listener) return;
            
            this.listener.positionX.value = position.x;
            this.listener.positionY.value = position.y;
            this.listener.positionZ.value = position.z || 0;
            
            this.listener.forwardX.value = Math.cos(rotation);
            this.listener.forwardZ.value = Math.sin(rotation);
        },
        
        exportAPI() {
            return {
                init: () => this.init(),
                playMonsterSound: (type, pos, playerPos) => this.playMonsterSound(type, pos, playerPos),
                playWhisper: (side, text) => this.playWhisper(side, text),
                updateListener: (pos, rot) => this.updateListener(pos, rot)
            };
        }
    };
    
    // ===== DYNAMIC SOUNDTRACK SYSTEM =====
    const DynamicSoundtrack = {
        currentTrack: null,
        intensityLevel: 0,
        targetIntensity: 0,
        layers: {
            ambient: null,
            tension: null,
            action: null,
            horror: null
        },
        
        init() {
            // Define intensity levels
            this.intensityLevels = {
                0: { name: 'calm', bpm: 60, instruments: ['drone'] },
                1: { name: 'uneasy', bpm: 80, instruments: ['drone', 'whispers'] },
                2: { name: 'tense', bpm: 100, instruments: ['drone', 'percussion', 'strings'] },
                3: { name: 'danger', bpm: 140, instruments: ['drone', 'percussion', 'brass', 'screams'] },
                4: { name: 'terror', bpm: 180, instruments: ['full_orchestra', 'choir', 'noise'] }
            };
            
            console.log('Phase 9: Dynamic Soundtrack System initialized');
        },
        
        updateIntensity(enemiesNearby, playerHealth, playerSanity, chaseActive) {
            // Calculate target intensity based on game state
            let intensity = 0;
            
            if (enemiesNearby > 0) intensity += 1;
            if (enemiesNearby > 3) intensity += 1;
            if (playerHealth < 50) intensity += 1;
            if (playerSanity < 40) intensity += 1;
            if (chaseActive) intensity += 2;
            
            this.targetIntensity = Math.min(4, intensity);
            
            // Smoothly transition
            if (this.intensityLevel !== this.targetIntensity) {
                this.transitionToIntensity(this.targetIntensity);
            }
        },
        
        transitionToIntensity(level) {
            const config = this.intensityLevels[level];
            
            // Fade out current layers
            Object.values(this.layers).forEach(layer => {
                if (layer) {
                    layer.gain.gain.linearRampToValueAtTime(0, BinauralAudio.audioContext.currentTime + 2);
                }
            });
            
            // Create new layers
            this.createLayer('ambient', config.instruments.includes('drone'));
            this.createLayer('tension', config.instruments.includes('percussion'));
            this.createLayer('action', config.instruments.includes('brass'));
            this.createLayer('horror', config.instruments.includes('screams'));
            
            this.intensityLevel = level;
            
            window.dispatchEvent(new CustomEvent('musicIntensityChange', {
                detail: { level, name: config.name }
            }));
        },
        
        createLayer(name, active) {
            if (!BinauralAudio.initialized) return;
            
            const osc = BinauralAudio.audioContext.createOscillator();
            const gain = BinauralAudio.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(BinauralAudio.masterGain);
            
            if (active) {
                gain.gain.setValueAtTime(0.3, BinauralAudio.audioContext.currentTime);
                osc.start();
            } else {
                gain.gain.setValueAtTime(0, BinauralAudio.audioContext.currentTime);
            }
            
            this.layers[name] = { osc, gain };
        },
        
        stopAllMusic() {
            Object.values(this.layers).forEach(layer => {
                if (layer) {
                    layer.osc.stop();
                }
            });
        },
        
        exportAPI() {
            return {
                init: () => this.init(),
                updateIntensity: (enemies, health, sanity, chase) => 
                    this.updateIntensity(enemies, health, sanity, chase),
                stopAllMusic: () => this.stopAllMusic()
            };
        }
    };
    
    // ===== PROCEDURAL AUDIO GENERATOR =====
    const ProceduralAudio = {
        generateFootstep(surface) {
            if (!BinauralAudio.initialized) return;
            
            const surfaces = {
                stone: { freq: 200, decay: 0.1 },
                wood: { freq: 300, decay: 0.15 },
                metal: { freq: 400, decay: 0.2 },
                flesh: { freq: 100, decay: 0.3 },
                water: { freq: 150, decay: 0.4 }
            };
            
            const config = surfaces[surface] || surfaces.stone;
            
            const osc = BinauralAudio.audioContext.createOscillator();
            const gain = BinauralAudio.audioContext.createGain();
            
            osc.frequency.setValueAtTime(config.freq, BinauralAudio.audioContext.currentTime);
            gain.gain.setValueAtTime(0.2, BinauralAudio.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, BinauralAudio.audioContext.currentTime + config.decay);
            
            osc.connect(gain);
            gain.connect(BinauralAudio.masterGain);
            
            osc.start();
            osc.stop(BinauralAudio.audioContext.currentTime + config.decay);
        },
        
        generateHeartbeat(rate) {
            if (!BinauralAudio.initialized) return;
            
            const osc = BinauralAudio.audioContext.createOscillator();
            const gain = BinauralAudio.audioContext.createGain();
            
            osc.frequency.setValueAtTime(60, BinauralAudio.audioContext.currentTime);
            
            // Heartbeat pattern
            const interval = 60 / rate;
            
            const scheduleBeat = (time) => {
                gain.gain.setValueAtTime(0.5, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
                
                if (BinauralAudio.audioContext.currentTime < time + 10) {
                    scheduleBeat(time + interval);
                }
            };
            
            osc.connect(gain);
            gain.connect(BinauralAudio.masterGain);
            
            osc.start();
            scheduleBeat(BinauralAudio.audioContext.currentTime);
        },
        
        generateScreech(intensity) {
            if (!BinauralAudio.initialized) return;
            
            const osc = BinauralAudio.audioContext.createOscillator();
            const gain = BinauralAudio.audioContext.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800 * intensity, BinauralAudio.audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, BinauralAudio.audioContext.currentTime + 0.5);
            
            gain.gain.setValueAtTime(0.4, BinauralAudio.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, BinauralAudio.audioContext.currentTime + 0.5);
            
            osc.connect(gain);
            gain.connect(BinauralAudio.masterGain);
            
            osc.start();
            osc.stop(BinauralAudio.audioContext.currentTime + 0.5);
        },
        
        exportAPI() {
            return {
                generateFootstep: (surface) => this.generateFootstep(surface),
                generateHeartbeat: (rate) => this.generateHeartbeat(rate),
                generateScreech: (intensity) => this.generateScreech(intensity)
            };
        }
    };
    
    // Export all audio systems
    window.BinauralAudio = BinauralAudio.exportAPI();
    window.DynamicSoundtrack = DynamicSoundtrack.exportAPI();
    window.ProceduralAudio = ProceduralAudio.exportAPI();
    
    console.log('Phase 9: Binaural Audio System loaded');
})();
