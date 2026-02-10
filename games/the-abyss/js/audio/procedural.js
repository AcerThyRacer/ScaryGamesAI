/* ============================================
   The Abyss - Procedural Sound System
   Dynamic creature sounds, ambient generation, adaptive music
   Phase 1 Implementation
   ============================================ */

const ProceduralSound = (function() {
    'use strict';

    // Sound synthesis configuration
    const SYNTH = {
        creatureVocalRange: { min: 50, max: 500 },    // Hz
        whaleRange: { min: 10, max: 40 },
        ambientDroneBase: 30,
        heartRateBase: 60
    };

    // Active generators
    const generators = new Map();
    const ambientLayers = new Map();
    let tensionLevel = 0; // 0-100
    let isActive = false;

    // ============================================
    // PROCEDURAL CREATURE SOUNDS
    // ============================================
    class CreatureSoundGenerator {
        constructor(type, config = {}) {
            this.type = type;
            this.config = {
                baseFrequency: 100,
                modulationDepth: 50,
                attackTime: 0.1,
                releaseTime: 0.5,
                reverbAmount: 0.3,
                ...config
            };
            
            this.oscillators = [];
            this.gainNodes = [];
            this.filters = [];
            this.isPlaying = false;
        }

        generateRoar(intensity = 1) {
            const ctx = SpatialAudio.getContext();
            if (!ctx) return;

            // Create multiple oscillators for rich texture
            const freqs = [
                this.config.baseFrequency,
                this.config.baseFrequency * 1.5,
                this.config.baseFrequency * 2
            ];

            const masterGain = ctx.createGain();
            masterGain.connect(SpatialAudio.getContext()?.destination);
            
            freqs.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();

                // Start with low frequency
                osc.frequency.setValueAtTime(freq * 0.5, ctx.currentTime);
                
                // Sweep up for tension
                osc.frequency.exponentialRampToValueAtTime(
                    freq * intensity, 
                    ctx.currentTime + 0.3
                );

                // Add FM for grit
                if (i === 0) {
                    const modulator = ctx.createOscillator();
                    const modGain = ctx.createGain();
                    modulator.frequency.value = 20;
                    modGain.gain.value = 30;
                    modulator.connect(modGain);
                    modGain.connect(osc.frequency);
                    modulator.start();
                    this.oscillators.push(modulator);
                    this.gainNodes.push(modGain);
                }

                // Filter for underwater feel
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(200, ctx.currentTime);
                filter.frequency.exponentialRampToValueAtTime(
                    800 * intensity, 
                    ctx.currentTime + 0.2
                );

                // Envelope
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(
                    0.3 / freqs.length, 
                    ctx.currentTime + this.config.attackTime
                );
                gain.gain.exponentialRampToValueAtTime(
                    0.001, 
                    ctx.currentTime + this.config.attackTime + this.config.releaseTime
                );

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(masterGain);

                osc.start();
                osc.stop(ctx.currentTime + this.config.attackTime + this.config.releaseTime + 1);

                this.oscillators.push(osc);
                this.gainNodes.push(gain);
                this.filters.push(filter);
            });

            // Master envelope
            masterGain.gain.setValueAtTime(0, ctx.currentTime);
            masterGain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
            masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);

            this.gainNodes.push(masterGain);
        }

        generateAmbientCall(distance = 1) {
            const ctx = SpatialAudio.getContext();
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            // Long, slow sound
            const duration = 3 + Math.random() * 4;
            const freq = this.config.baseFrequency * (0.5 + Math.random() * 0.5);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(freq * 0.8, ctx.currentTime + duration);

            // Slow filter sweep
            filter.type = 'lowpass';
            filter.Q.value = 5;
            filter.frequency.setValueAtTime(100, ctx.currentTime);
            filter.frequency.linearRampToValueAtTime(300, ctx.currentTime + duration / 2);
            filter.frequency.linearRampToValueAtTime(100, ctx.currentTime + duration);

            // Volume based on distance
            const volume = Math.max(0.1, 1 - distance) * 0.3;

            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.5);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);

            this.oscillators.push(osc);
            this.gainNodes.push(gain);
        }

        generateClick(distance = 1) {
            const ctx = SpatialAudio.getContext();
            if (!ctx) return;

            // Short click/echo for echolocation
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

            const volume = Math.max(0.05, 1 - distance) * 0.2;

            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);

            this.oscillators.push(osc);
            this.gainNodes.push(gain);
        }

        stop() {
            this.oscillators.forEach(osc => {
                try { osc.stop(); } catch (e) {}
            });
            this.oscillators = [];
            this.gainNodes = [];
            this.filters = [];
        }
    }

    // ============================================
    // AMBIENT SOUND LAYERS
    // ============================================
    class AmbientLayer {
        constructor(name, config = {}) {
            this.name = name;
            this.config = {
                baseFrequency: 30,
                modulationRate: 0.1,
                volume: 0.1,
                ...config
            };
            
            this.oscillator = null;
            this.gain = null;
            this.filter = null;
            this.lfo = null;
            this.isPlaying = false;
        }

        start() {
            const ctx = SpatialAudio.getContext();
            if (!ctx || this.isPlaying) return;

            // Create drone
            this.oscillator = ctx.createOscillator();
            this.gain = ctx.createGain();
            this.filter = ctx.createBiquadFilter();
            this.lfo = ctx.createOscillator();
            this.lfoGain = ctx.createGain();

            // Setup main oscillator
            this.oscillator.type = 'sine';
            this.oscillator.frequency.value = this.config.baseFrequency;

            // LFO for subtle movement
            this.lfo.type = 'sine';
            this.lfo.frequency.value = this.config.modulationRate;
            this.lfoGain.gain.value = 2;

            // Filter for underwater feel
            this.filter.type = 'lowpass';
            this.filter.frequency.value = 200;
            this.filter.Q.value = 1;

            // Volume
            this.gain.gain.value = this.config.volume;

            // Connect
            this.lfo.connect(this.lfoGain);
            this.lfoGain.connect(this.oscillator.frequency);
            this.oscillator.connect(this.filter);
            this.filter.connect(this.gain);
            this.gain.connect(ctx.destination);

            this.oscillator.start();
            this.lfo.start();
            this.isPlaying = true;
        }

        stop() {
            if (!this.isPlaying) return;
            
            const ctx = SpatialAudio.getContext();
            const now = ctx.currentTime;
            
            this.gain.gain.linearRampToValueAtTime(0, now + 1);
            
            setTimeout(() => {
                this.oscillator?.stop();
                this.lfo?.stop();
                this.isPlaying = false;
            }, 1000);
        }

        setVolume(volume, fadeTime = 1) {
            const ctx = SpatialAudio.getContext();
            this.config.volume = volume;
            
            if (this.gain) {
                this.gain.gain.linearRampToValueAtTime(
                    volume, 
                    ctx.currentTime + fadeTime
                );
            }
        }

        setTension(tension) {
            // Increase modulation and frequency with tension
            const ctx = SpatialAudio.getContext();
            if (!ctx || !this.oscillator) return;

            const freq = this.config.baseFrequency * (1 + tension * 0.5);
            this.oscillator.frequency.linearRampToValueAtTime(freq, ctx.currentTime + 2);

            if (this.lfo) {
                const rate = this.config.modulationRate * (1 + tension * 2);
                this.lfo.frequency.linearRampToValueAtTime(rate, ctx.currentTime + 2);
            }
        }
    }

    // ============================================
    // ADAPTIVE MUSIC SYSTEM
    // ============================================
    class AdaptiveMusicSystem {
        constructor() {
            this.layers = {
                ambient: new AmbientLayer('ambient', { baseFrequency: 50, volume: 0.1 }),
                tension: new AmbientLayer('tension', { baseFrequency: 80, volume: 0 }),
                danger: new AmbientLayer('danger', { baseFrequency: 120, volume: 0 })
            };
            
            this.currentTension = 0;
            this.isPlaying = false;
        }

        start() {
            Object.values(this.layers).forEach(layer => layer.start());
            this.isPlaying = true;
        }

        stop() {
            Object.values(this.layers).forEach(layer => layer.stop());
            this.isPlaying = false;
        }

        setTension(level) {
            this.currentTension = Math.max(0, Math.min(100, level));
            
            // Crossfade between layers
            if (this.currentTension < 30) {
                this.layers.ambient.setVolume(0.15);
                this.layers.tension.setVolume(0);
                this.layers.danger.setVolume(0);
            } else if (this.currentTension < 70) {
                const t = (this.currentTension - 30) / 40;
                this.layers.ambient.setVolume(0.15 * (1 - t));
                this.layers.tension.setVolume(0.1 * t);
                this.layers.danger.setVolume(0);
            } else {
                const t = (this.currentTension - 70) / 30;
                this.layers.ambient.setVolume(0);
                this.layers.tension.setVolume(0.1 * (1 - t));
                this.layers.danger.setVolume(0.15 * t);
            }

            // Update individual layer modulation
            Object.values(this.layers).forEach(layer => {
                layer.setTension(this.currentTension / 100);
            });
        }
    }

    // ============================================
    // FOOTSTEP/SWIM SOUNDS
    // ============================================
    function generateSwimStroke(intensity = 1) {
        const ctx = SpatialAudio.getContext();
        if (!ctx) return;

        // Create water splash sound using noise
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate filtered noise
        for (let i = 0; i < bufferSize; i++) {
            const t = i / ctx.sampleRate;
            const envelope = Math.exp(-t * 5); // Fast decay
            data[i] = (Math.random() * 2 - 1) * envelope;
        }

        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        source.buffer = buffer;
        
        filter.type = 'bandpass';
        filter.frequency.value = 400 + intensity * 200;
        filter.Q.value = 1;

        gain.gain.value = 0.1 * intensity;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        source.start();
    }

    function generateHeartbeat(health = 100) {
        const ctx = SpatialAudio.getContext();
        if (!ctx) return;

        // Heart rate increases as health decreases
        const rate = 60 + (100 - health) * 0.8; // 60-140 BPM
        const interval = 60 / rate;

        const playBeat = () => {
            // Lub-dub sound
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(40, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);

            // Schedule next beat
            if (health < 100) {
                setTimeout(playBeat, interval * 1000);
            }
        };

        playBeat();
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        if (isActive) return;
        
        console.log('🎵 Initializing Procedural Sound System...');
        
        // Start ambient layers
        const ambient = new AmbientLayer('deep_drone', { 
            baseFrequency: 40, 
            volume: 0.05 
        });
        ambientLayers.set('deep_drone', ambient);
        ambient.start();

        isActive = true;
        console.log('✅ Procedural Sound System ready');
    }

    function createCreatureGenerator(type, config) {
        const generator = new CreatureSoundGenerator(type, config);
        generators.set(type, generator);
        return generator;
    }

    function createAdaptiveMusic() {
        return new AdaptiveMusicSystem();
    }

    function setGlobalTension(level) {
        tensionLevel = level;
        ambientLayers.forEach(layer => layer.setTension(level / 100));
    }

    function dispose() {
        generators.forEach(g => g.stop());
        generators.clear();
        
        ambientLayers.forEach(l => l.stop());
        ambientLayers.clear();
        
        isActive = false;
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        // Initialization
        init,
        dispose,
        isActive: () => isActive,
        
        // Creatures
        createCreatureGenerator,
        getGenerator: (type) => generators.get(type),
        
        // Ambient
        createAdaptiveMusic,
        getAmbientLayer: (name) => ambientLayers.get(name),
        
        // Actions
        setGlobalTension,
        generateSwimStroke,
        generateHeartbeat,
        
        // Classes
        CreatureSoundGenerator,
        AmbientLayer,
        AdaptiveMusicSystem
    };
})();

// Global access
window.ProceduralSound = ProceduralSound;
