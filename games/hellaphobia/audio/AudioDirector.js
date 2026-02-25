/* ============================================================
   HELLAPHOBIA - AUDIO DIRECTOR
   Complete Audio Management | SFX | Music | Ambient | Voice
   Integrated with Game Events | Boss Fights | Horror Moments
   ============================================================ */

(function() {
    'use strict';

    // ===== AUDIO DIRECTOR =====
    const AudioDirector = {
        ctx: null,
        masterGain: null,
        musicGain: null,
        sfxGain: null,
        ambientGain: null,
        voiceGain: null,

        // State
        initialized: false,
        muted: false,
        musicMuted: false,
        sfxMuted: false,
        ambientMuted: false,

        // Pools
        activeSounds: new Map(),
        ambientSources: new Map(),
        musicSources: new Map(),

        // Settings
        settings: {
            masterVolume: 0.8,
            musicVolume: 0.6,
            sfxVolume: 0.7,
            ambientVolume: 0.5,
            voiceVolume: 0.9
        },

        // Initialize audio system
        async init() {
            if (this.initialized) return true;

            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();

                // Create gain nodes for mixing
                this.masterGain = this.ctx.createGain();
                this.musicGain = this.ctx.createGain();
                this.sfxGain = this.ctx.createGain();
                this.ambientGain = this.ctx.createGain();
                this.voiceGain = this.ctx.createGain();

                // Set initial volumes
                this.masterGain.gain.value = this.settings.masterVolume;
                this.musicGain.gain.value = this.settings.musicVolume;
                this.sfxGain.gain.value = this.settings.sfxVolume;
                this.ambientGain.gain.value = this.settings.ambientVolume;
                this.voiceGain.gain.value = this.settings.voiceVolume;

                // Connect graph
                this.musicGain.connect(this.masterGain);
                this.sfxGain.connect(this.masterGain);
                this.ambientGain.connect(this.masterGain);
                this.voiceGain.connect(this.masterGain);
                this.masterGain.connect(this.ctx.destination);

                // Create reverb for spatial effects
                this.reverbNode = await this._createReverb(2.5, 3);
                this.reverbSend = this.ctx.createGain();
                this.reverbSend.gain.value = 0.3;
                this.reverbNode.connect(this.masterGain);

                this.initialized = true;
                console.log('[AudioDirector] Initialized');
                return true;
            } catch (err) {
                console.error('[AudioDirector] Init failed:', err);
                return false;
            }
        },

        // Create impulse response for reverb
        async _createReverb(duration, decay) {
            if (!this.ctx) return null;

            const rate = this.ctx.sampleRate;
            const length = rate * duration;
            const impulse = this.ctx.createBuffer(2, length, rate);
            const left = impulse.getChannelData(0);
            const right = impulse.getChannelData(1);

            for (let i = 0; i < length; i++) {
                const n = i / length;
                left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
                right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
            }

            const convolver = this.ctx.createConvolver();
            convolver.buffer = impulse;
            return convolver;
        },

        // ===== VOLUME CONTROL =====
        setMasterVolume(value) {
            this.settings.masterVolume = Math.max(0, Math.min(1, value));
            if (this.masterGain) {
                this.masterGain.gain.setTargetAtTime(this.settings.masterVolume, this.ctx.currentTime, 0.1);
            }
        },

        setMusicVolume(value) {
            this.settings.musicVolume = Math.max(0, Math.min(1, value));
            if (this.musicGain) {
                this.musicGain.gain.setTargetAtTime(this.settings.musicVolume, this.ctx.currentTime, 0.1);
            }
        },

        setSfxVolume(value) {
            this.settings.sfxVolume = Math.max(0, Math.min(1, value));
            if (this.sfxGain) {
                this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume, this.ctx.currentTime, 0.1);
            }
        },

        setAmbientVolume(value) {
            this.settings.ambientVolume = Math.max(0, Math.min(1, value));
            if (this.ambientGain) {
                this.ambientGain.gain.setTargetAtTime(this.settings.ambientVolume, this.ctx.currentTime, 0.1);
            }
        },

        toggleMute() {
            this.muted = !this.muted;
            if (this.masterGain) {
                this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.settings.masterVolume, this.ctx.currentTime, 0.1);
            }
            return this.muted;
        },

        // ===== SOUND EFFECTS =====
        playSFX(type, options = {}) {
            if (!this.initialized || this.sfxMuted) return null;

            const sound = this._createSound(type, options);
            if (sound) {
                const id = Date.now() + Math.random();
                this.activeSounds.set(id, sound);
                sound.onended = () => this.activeSounds.delete(id);
                return id;
            }
            return null;
        },

        _createSound(type, options) {
            if (!this.ctx) return null;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const panner = this.ctx.createStereoPanner();

            // Default routing
            let output = this.sfxGain;

            // Add reverb send if requested
            if (options.reverb) {
                const reverbSend = this.ctx.createGain();
                reverbSend.gain.value = options.reverb;
                osc.connect(reverbSend);
                reverbSend.connect(this.reverbNode);
            }

            osc.connect(gain);
            gain.connect(panner);
            panner.connect(output);

            // Configure sound based on type
            this._configureSound(osc, gain, panner, type, options);

            osc.start();
            osc.stop(this.ctx.currentTime + (options.duration || 1));

            return osc;
        },

        _configureSound(osc, gain, panner, type, options) {
            const now = this.ctx.currentTime;
            const duration = options.duration || 0.5;

            switch (type) {
                // === PLAYER SOUNDS ===
                case 'footstep':
                    const surface = options.surface || 'stone';
                    const surfaces = {
                        stone: { freq: 150, type: 'triangle', decay: 0.08 },
                        wood: { freq: 250, type: 'triangle', decay: 0.12 },
                        metal: { freq: 350, type: 'square', decay: 0.15 },
                        flesh: { freq: 80, type: 'sine', decay: 0.2, filter: 200 },
                        water: { freq: 120, type: 'sine', decay: 0.25 }
                    };
                    const s = surfaces[surface] || surfaces.stone;
                    osc.type = s.type;
                    osc.frequency.setValueAtTime(s.freq + Math.random() * 30, now);
                    osc.frequency.exponentialRampToValueAtTime(s.freq * 0.5, now + s.decay);
                    gain.gain.setValueAtTime(0.4, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + s.decay);
                    if (s.filter) {
                        const filter = this.ctx.createBiquadFilter();
                        filter.type = 'lowpass';
                        filter.frequency.value = s.filter;
                        osc.connect(filter);
                        filter.connect(gain);
                    }
                    break;

                case 'jump':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.linearRampToValueAtTime(400, now + 0.15);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
                    break;

                case 'land':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(100, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                    gain.gain.setValueAtTime(0.5, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    break;

                case 'dash':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(300, now);
                    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
                    panner.pan.value = (Math.random() - 0.5) * 0.5;
                    break;

                // === COMBAT SOUNDS ===
                case 'melee_hit':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
                    gain.gain.setValueAtTime(0.6, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    break;

                case 'melee_swing':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(300, now);
                    osc.frequency.linearRampToValueAtTime(150, now + 0.2);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
                    break;

                case 'parry':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
                    osc.frequency.linearRampToValueAtTime(800, now + 0.2);
                    gain.gain.setValueAtTime(0.4, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
                    break;

                case 'ranged_shoot':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                    break;

                case 'ranged_hit':
                    this._playNoise(800, 0.15, now, gain);
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
                    gain.gain.setValueAtTime(0.5, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    break;

                // === DAMAGE SOUNDS ===
                case 'player_hurt':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(300, now);
                    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
                    gain.gain.setValueAtTime(0.5, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                    break;

                case 'player_death':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + 1);
                    gain.gain.setValueAtTime(0.7, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
                    break;

                case 'monster_hit':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(150, now);
                    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
                    gain.gain.setValueAtTime(0.4, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    break;

                case 'monster_death':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
                    gain.gain.setValueAtTime(0.5, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    // Add noise
                    this._playNoise(200, 0.4, now, this.sfxGain);
                    break;

                // === AMBIENCE ===
                case 'wind':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(100 + Math.random() * 50, now);
                    osc.frequency.linearRampToValueAtTime(80 + Math.random() * 40, now + 2);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.linearRampToValueAtTime(0.15, now + 1);
                    gain.gain.linearRampToValueAtTime(0.05, now + 2);
                    break;

                case 'drip':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                    break;

                case 'creak':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.linearRampToValueAtTime(150, now + 0.5);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
                    break;

                // === HORROR SOUNDS ===
                case 'whisper':
                    const side = options.side || 'left';
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600 + Math.random() * 400, now);
                    osc.frequency.linearRampToValueAtTime(500 + Math.random() * 300, now + 1);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 1.5);
                    panner.pan.value = side === 'left' ? -0.8 : 0.8;
                    break;

                case 'screech':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
                    osc.frequency.exponentialRampToValueAtTime(300, now + 0.5);
                    gain.gain.setValueAtTime(0.6, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    break;

                case 'heartbeat':
                    const rate = options.rate || 60;
                    const interval = 60 / rate;
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(50, now);
                    gain.gain.setValueAtTime(0.8, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    // Schedule second beat
                    setTimeout(() => {
                        this.playSFX('heartbeat_second');
                    }, interval * 1000 * 0.5);
                    break;

                case 'heartbeat_second':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(40, now);
                    gain.gain.setValueAtTime(0.5, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    break;

                case 'glitch':
                    this._playNoise(1000, 0.1, now, gain);
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.linearRampToValueAtTime(800, now + 0.05);
                    osc.frequency.linearRampToValueAtTime(200, now + 0.1);
                    gain.gain.setValueAtTime(0.4, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
                    break;

                case 'jumpscare':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(150, now);
                    osc.frequency.linearRampToValueAtTime(900, now + 0.1);
                    osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
                    gain.gain.setValueAtTime(1, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    // Add noise burst
                    this._playNoise(500, 0.4, now, this.sfxGain, 1);
                    break;

                // === UI SOUNDS ===
                case 'ui_click':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    break;

                case 'ui_hover':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                    break;

                case 'ui_error':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.linearRampToValueAtTime(150, now + 0.15);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    break;

                case 'ui_success':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(523, now); // C5
                    osc.frequency.setValueAtTime(659, now + 0.1); // E5
                    osc.frequency.setValueAtTime(784, now + 0.2); // G5
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
                    break;

                // === BOSS SOUNDS ===
                case 'boss_spawn':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(80, now);
                    osc.frequency.exponentialRampToValueAtTime(200, now + 1);
                    gain.gain.setValueAtTime(0.8, now);
                    gain.gain.exponentialRampToValueAtTime(0.3, now + 1);
                    gain.gain.linearRampToValueAtTime(0.01, now + 2);
                    this._playNoise(100, 1.5, now, this.sfxGain, 0.5);
                    break;

                case 'boss_roar':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(100, now);
                    osc.frequency.linearRampToValueAtTime(50, now + 1);
                    gain.gain.setValueAtTime(0.7, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
                    break;

                case 'boss_attack':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(300, now);
                    osc.frequency.linearRampToValueAtTime(100, now + 0.5);
                    gain.gain.setValueAtTime(0.5, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    break;

                case 'boss_hit':
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(150, now);
                    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
                    gain.gain.setValueAtTime(0.6, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    break;

                case 'boss_phase_change':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.linearRampToValueAtTime(600, now + 0.5);
                    osc.frequency.linearRampToValueAtTime(300, now + 1);
                    gain.gain.setValueAtTime(0.5, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 1);
                    break;

                case 'boss_defeat':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + 2);
                    gain.gain.setValueAtTime(0.8, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 2);
                    // Add dramatic noise
                    this._playNoise(300, 1.5, now, this.sfxGain, 0.7);
                    break;

                // === ITEM SOUNDS ===
                case 'item_collect':
                    const itemType = options.itemType || 'generic';
                    const items = {
                        generic: [880, 1100],
                        key: [1200, 1600],
                        health: [523, 659, 784],
                        sanity: [440, 554, 659],
                        weapon: [330, 440, 554, 659]
                    };
                    const freqs = items[itemType] || items.generic;
                    freqs.forEach((freq, i) => {
                        const osc2 = this.ctx.createOscillator();
                        const gain2 = this.ctx.createGain();
                        osc2.type = 'sine';
                        osc2.frequency.value = freq;
                        gain2.gain.setValueAtTime(0.2, now + i * 0.08);
                        gain2.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);
                        osc2.connect(gain2);
                        gain2.connect(this.sfxGain);
                        osc2.start(now + i * 0.08);
                        osc2.stop(now + i * 0.08 + 0.2);
                    });
                    return; // Already handled

                default:
                    // Fallback beep
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, now);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            }
        },

        _playNoise(freq, duration, time, output, gainValue = 0.3) {
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = freq;
            filter.Q.value = 1;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(gainValue, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(output);

            noise.start(time);
            noise.stop(time + duration);
        },

        stopSFX(id) {
            if (id && this.activeSounds.has(id)) {
                const sound = this.activeSounds.get(id);
                if (sound.stop) sound.stop();
                this.activeSounds.delete(id);
            }
        },

        stopAllSFX() {
            this.activeSounds.forEach(sound => {
                if (sound.stop) sound.stop();
            });
            this.activeSounds.clear();
        },

        // ===== AMBIENT SOUNDSCAPES =====
        startAmbient(type, options = {}) {
            if (!this.initialized || this.ambientMuted) return null;

            const id = 'ambient_' + type + '_' + Date.now();
            const layers = [];

            switch (type) {
                case 'dungeon':
                    layers.push(this._createDrone(50, 0.15, 'sine'));
                    layers.push(this._createDrone(52, 0.1, 'sine')); // Detuned
                    layers.push(this._createIntermittent('drip', 3, 8));
                    break;

                case 'horror':
                    layers.push(this._createDrone(30, 0.2, 'sawtooth'));
                    layers.push(this._createDrone(45, 0.1, 'sine'));
                    layers.push(this._createIntermittent('creak', 5, 12));
                    break;

                case 'boss_arena':
                    layers.push(this._createDrone(40, 0.25, 'triangle'));
                    layers.push(this._createDrone(60, 0.15, 'sawtooth'));
                    layers.push(this._createPulsingDrone(80, 0.3, 2));
                    break;

                case 'calm':
                    layers.push(this._createDrone(100, 0.08, 'sine'));
                    layers.push(this._createDrone(150, 0.05, 'sine'));
                    break;

                case 'tension':
                    layers.push(this._createDrone(60, 0.2, 'triangle'));
                    layers.push(this._createInfrasound(19, 0.1)); // Creates unease
                    break;
            }

            this.ambientSources.set(id, { layers, type });
            return id;
        },

        _createDrone(freq, volume, type) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.value = 0;

            osc.connect(gain);
            gain.connect(this.ambientGain);

            osc.start();

            // Fade in
            gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 2);

            return { osc, gain, type: 'drone' };
        },

        _createPulsingDrone(freq, volume, rate) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.value = 0;

            osc.connect(gain);
            gain.connect(this.ambientGain);

            osc.start();

            // Pulsing effect
            const pulse = () => {
                if (!this.initialized || this.ambientMuted) return;
                const now = this.ctx.currentTime;
                gain.gain.cancelScheduledValues(now);
                gain.gain.setValueAtTime(gain.gain.value, now);
                gain.gain.linearRampToValueAtTime(volume, now + 0.5);
                gain.gain.linearRampToValueAtTime(volume * 0.3, now + 1 / rate);
                setTimeout(pulse, 1000 / rate * 2);
            };
            pulse();

            return { osc, gain, type: 'pulse' };
        },

        _createInfrasound(freq, volume) {
            // Very low frequency that creates unease
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.value = volume;

            osc.connect(gain);
            gain.connect(this.ambientGain);

            osc.start();

            return { osc, gain, type: 'infrasonic' };
        },

        _createIntermittent(type, minInterval, maxInterval) {
            const playSound = () => {
                if (!this.initialized || this.ambientMuted) return;
                this.playSFX(type);
                const interval = minInterval + Math.random() * (maxInterval - minInterval);
                setTimeout(playSound, interval * 1000);
            };

            setTimeout(playSound, Math.random() * 3000);

            return { type: 'intermittent', interval: { min: minInterval, max: maxInterval } };
        },

        stopAmbient(id) {
            if (!id) {
                // Stop all ambient
                this.ambientSources.forEach(ambient => {
                    ambient.layers.forEach(layer => {
                        if (layer.osc) layer.osc.stop();
                    });
                });
                this.ambientSources.clear();
                return;
            }

            const ambient = this.ambientSources.get(id);
            if (ambient) {
                ambient.layers.forEach(layer => {
                    if (layer.osc) {
                        layer.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
                        setTimeout(() => layer.osc.stop(), 1000);
                    }
                });
                this.ambientSources.delete(id);
            }
        },

        // ===== MUSIC SYSTEM =====
        playMusic(type, options = {}) {
            if (!this.initialized || this.musicMuted) return null;

            const id = 'music_' + type + '_' + Date.now();
            const layers = [];

            switch (type) {
                case 'boss':
                    layers.push(this._createMusicDrone(55, 0.3, 'sawtooth')); // A1
                    layers.push(this._createMusicDrone(110, 0.2, 'triangle')); // A2
                    layers.push(this._createRhythm(140, 0.4)); // Fast rhythm
                    break;

                case 'exploration':
                    layers.push(this._createMusicDrone(65, 0.2, 'sine')); // C2
                    layers.push(this._createMusicDrone(97, 0.15, 'sine')); // G2
                    break;

                case 'danger':
                    layers.push(this._createMusicDrone(82, 0.3, 'triangle')); // E2
                    layers.push(this._createMusicDrone(103, 0.2, 'sawtooth')); // G#2
                    layers.push(this._createRhythm(120, 0.5));
                    break;

                case 'victory':
                    layers.push(this._createMusicChord([523, 659, 784], 0.3)); // C major
                    break;

                case 'defeat':
                    layers.push(this._createMusicDrone(65, 0.25, 'sawtooth'));
                    layers.push(this._createMusicDrone(77, 0.15, 'sine')); // Discordant
                    break;
            }

            this.musicSources.set(id, { layers, type });
            return id;
        },

        _createMusicDrone(freq, volume, type) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.value = 0;

            osc.connect(gain);
            gain.connect(this.musicGain);

            osc.start();
            gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 3);

            return { osc, gain, type: 'drone' };
        },

        _createMusicChord(freqs, volume) {
            const notes = [];
            freqs.forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.value = 0;

                osc.connect(gain);
                gain.connect(this.musicGain);

                osc.start();
                gain.gain.linearRampToValueAtTime(volume / freqs.length, this.ctx.currentTime + 1);

                notes.push({ osc, gain });
            });

            return notes;
        },

        _createRhythm(bpm, volume) {
            const hits = [];
            const interval = 60 / bpm;

            const playHit = (time) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(100, time);
                osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);

                gain.gain.setValueAtTime(volume, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

                osc.connect(gain);
                gain.connect(this.musicGain);

                osc.start(time);
                osc.stop(time + 0.15);

                hits.push({ osc, gain, time });
            };

            // Schedule rhythm pattern
            for (let i = 0; i < 16; i++) {
                const time = this.ctx.currentTime + i * interval;
                playHit(time);
            }

            return { hits, interval, bpm };
        },

        stopMusic(id) {
            if (!id) {
                this.musicSources.forEach(music => {
                    music.layers.forEach(layer => {
                        if (layer.osc) {
                            layer.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
                            setTimeout(() => layer.osc.stop(), 1000);
                        }
                    });
                });
                this.musicSources.clear();
                return;
            }

            const music = this.musicSources.get(id);
            if (music) {
                music.layers.forEach(layer => {
                    if (Array.isArray(layer)) {
                        layer.forEach(note => {
                            note.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
                            setTimeout(() => note.osc.stop(), 1000);
                        });
                    } else if (layer.osc) {
                        layer.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
                        setTimeout(() => layer.osc.stop(), 2000);
                    }
                });
                this.musicSources.delete(id);
            }
        },

        // ===== POSITIONAL AUDIO =====
        playPositionalSFX(type, position, listenerPosition) {
            if (!this.initialized || this.sfxMuted) return null;

            const dx = position.x - listenerPosition.x;
            const dy = position.y - listenerPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Don't play if too far
            if (distance > 500) return null;

            const pan = Math.max(-1, Math.min(1, dx / 300));
            const volume = Math.max(0, 1 - distance / 500);

            const id = this.playSFX(type);
            if (id) {
                // Apply spatial effects
                const sound = this.activeSounds.get(id);
                // Note: Would need to store panner reference for dynamic updates
            }

            return id;
        },

        // ===== GAME EVENT INTEGRATION =====
        onGameEvent(event, data) {
            switch (event) {
                case 'player_spawn':
                    this.startAmbient('dungeon');
                    break;

                case 'player_step':
                    this.playSFX('footstep', { surface: data.surface });
                    break;

                case 'player_jump':
                    this.playSFX('jump');
                    break;

                case 'player_land':
                    this.playSFX('land');
                    break;

                case 'player_dash':
                    this.playSFX('dash');
                    break;

                case 'player_hurt':
                    this.playSFX('player_hurt');
                    if (data.health < 30) {
                        this.playSFX('heartbeat', { rate: 120 - data.health });
                    }
                    break;

                case 'player_death':
                    this.stopAllSFX();
                    this.stopAmbient();
                    this.playSFX('player_death');
                    break;

                case 'melee_attack':
                    this.playSFX('melee_swing');
                    break;

                case 'melee_hit':
                    this.playSFX('melee_hit');
                    break;

                case 'ranged_attack':
                    this.playSFX('ranged_shoot');
                    break;

                case 'ranged_hit':
                    this.playSFX('ranged_hit');
                    break;

                case 'parry':
                    this.playSFX('parry');
                    break;

                case 'monster_death':
                    this.playSFX('monster_death');
                    break;

                case 'item_collect':
                    this.playSFX('item_collect', { itemType: data.itemType });
                    break;

                case 'sanity_low':
                    this.playSFX('heartbeat', { rate: 100 });
                    this.playSFX('whisper', { side: Math.random() > 0.5 ? 'left' : 'right' });
                    break;

                case 'sanity_critical':
                    this.playSFX('heartbeat', { rate: 140 });
                    this.playSFX('glitch');
                    if (Math.random() > 0.7) {
                        this.playSFX('whisper', { side: Math.random() > 0.5 ? 'left' : 'right' });
                    }
                    break;

                case 'hallucination':
                    this.playSFX('whisper', { side: data.side || 'left' });
                    this.playSFX('glitch');
                    break;

                case 'fourth_wall':
                    this.playSFX('glitch');
                    break;

                case 'boss_spawn':
                    this.stopAmbient();
                    this.stopMusic();
                    this.playSFX('boss_spawn');
                    this.startAmbient('boss_arena');
                    this.playMusic('boss');
                    break;

                case 'boss_attack':
                    this.playSFX('boss_attack');
                    break;

                case 'boss_hit':
                    this.playSFX('boss_hit');
                    break;

                case 'boss_phase_change':
                    this.playSFX('boss_phase_change');
                    this.playSFX('boss_roar');
                    break;

                case 'boss_defeat':
                    this.playSFX('boss_defeat');
                    this.stopMusic();
                    this.playMusic('victory');
                    break;

                case 'jumpscare':
                    this.playSFX('jumpscare');
                    break;
            }
        },

        // ===== UTILITIES =====
        resume() {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },

        suspend() {
            if (this.ctx && this.ctx.state === 'running') {
                this.ctx.suspend();
            }
        },

        dispose() {
            this.stopAllSFX();
            this.stopAmbient();
            this.stopMusic();

            if (this.ctx) {
                this.ctx.close();
            }

            this.initialized = false;
        }
    };

    // Export to window
    window.AudioDirector = AudioDirector;

    // Auto-init on user interaction
    const initOnInteraction = () => {
        AudioDirector.init().then(() => {
            AudioDirector.resume();
            document.removeEventListener('click', initOnInteraction);
            document.removeEventListener('keydown', initOnInteraction);
        });
    };

    document.addEventListener('click', initOnInteraction);
    document.addEventListener('keydown', initOnInteraction);

    console.log('[AudioDirector] Module loaded');
})();
