/**
 * Ambient Audio System for Subliminal Spaces
 * Generative drone soundscapes, infrasound, and binaural whispers
 */

export class AmbientAudioSystem {
    constructor(options = {}) {
        this.context = null;
        this.masterGain = null;
        this.isPlaying = false;
        
        // Audio layers
        this.layers = {
            drone: null,
            ambience: null,
            infrasound: null,
            whispers: null,
            effects: null
        };
        
        // Configuration
        this.config = {
            baseVolume: 0.3,
            droneVolume: 0.2,
            infrasoundEnabled: true,
            infrasoundFrequency: 17, // 17Hz - dread frequency
            binauralEnabled: true,
            whisperInterval: 30000 // 30 seconds between whispers
        };
        
        // Psychoacoustic settings
        this.psychoacoustics = {
            enableInfrasound: true,
            enableBinauralBeats: true,
            targetAnxiety: 0.5 // 0-1 scale
        };
    }
    
    /**
     * Initialize audio context
     */
    async initialize() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.config.baseVolume;
            this.masterGain.connect(this.context.destination);
            
            console.log('✓ Audio system initialized');
            return true;
        } catch (e) {
            console.error('⚠ Audio initialization failed:', e);
            return false;
        }
    }
    
    /**
     * Start ambient soundscape
     */
    async start() {
        if (!this.context) {
            await this.initialize();
        }
        
        if (this.isPlaying) return;
        
        // Start drone layer
        this.startDroneLayer();
        
        // Start ambience layer
        this.startAmbienceLayer();
        
        // Start infrasound (if enabled)
        if (this.config.infrasoundEnabled) {
            this.startInfrasound();
        }
        
        // Schedule whispers
        this.scheduleWhisper();
        
        this.isPlaying = true;
        console.log('✓ Ambient audio started');
    }
    
    /**
     * Start generative drone layer
     */
    startDroneLayer() {
        const droneOscillators = [];
        const droneGain = this.context.createGain();
        droneGain.gain.value = this.config.droneVolume;
        droneGain.connect(this.masterGain);
        
        // Create multiple oscillators for rich drone
        const frequencies = [55, 110, 220, 440]; // A series
        const detunes = [-10, 0, 10, 5];
        
        frequencies.forEach((freq, i) => {
            const osc = this.context.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.detune.value = detunes[i];
            
            const gain = this.context.createGain();
            gain.gain.value = 0.25 / (i + 1); // Higher harmonics quieter
            
            osc.connect(gain);
            gain.connect(droneGain);
            osc.start();
            
            droneOscillators.push({ osc, gain });
            
            // Modulate frequency slightly for movement
            this.modulateParameter(gain.gain, 0.1, 0.05, 0.02);
        });
        
        this.layers.drone = { oscillators: droneOscillators, gain: droneGain };
    }
    
    /**
     * Start environmental ambience layer
     */
    startAmbienceLayer() {
        // Create noise buffer for ambient texture
        const bufferSize = 2 * this.context.sampleRate;
        const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        // Generate pink noise (more natural than white noise)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11; // Compensate for gain
            b6 = white * 0.115926;
        }
        
        const noiseSource = this.context.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        
        // Filter for low-pass rumble
        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        
        const ambienceGain = this.context.createGain();
        ambienceGain.gain.value = 0.15;
        
        noiseSource.connect(filter);
        filter.connect(ambienceGain);
        ambienceGain.connect(this.masterGain);
        noiseSource.start();
        
        this.layers.ambience = { source: noiseSource, gain: ambienceGain, filter };
    }
    
    /**
     * Start 17Hz infrasound layer (dread induction)
     */
    startInfrasound() {
        const infraOsc = this.context.createOscillator();
        infraOsc.type = 'sine';
        infraOsc.frequency.value = this.config.infrasoundFrequency;
        
        const infraGain = this.context.createGain();
        infraGain.gain.value = 0.3;
        
        infraOsc.connect(infraGain);
        infraGain.connect(this.masterGain);
        infraOsc.start();
        
        this.layers.infrasound = { oscillator: infraOsc, gain: infraGain };
        
        console.log(`⚠️ Infrasound at ${this.config.infrasoundFrequency}Hz enabled (may cause unease)`);
    }
    
    /**
     * Schedule and play binaural whisper
     */
    scheduleWhisper() {
        if (!this.isPlaying) return;
        
        setTimeout(() => {
            this.playWhisper();
            this.scheduleWhisper();
        }, this.config.whisperInterval * (0.5 + Math.random()));
    }
    
    /**
     * Play binaural whisper effect
     */
    playWhisper() {
        // Create noise burst for whisper-like sound
        const duration = 0.5 + Math.random() * 0.5;
        const bufferSize = Math.floor(this.context.sampleRate * duration);
        const buffer = this.context.createBuffer(2, bufferSize, this.context.sampleRate);
        
        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(2);
        
        // Generate filtered noise with panning
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.context.sampleRate;
            const envelope = Math.sin(Math.PI * t / duration);
            
            left[i] = (Math.random() * 2 - 1) * envelope * 0.1;
            right[i] = (Math.random() * 2 - 1) * envelope * 0.1;
        }
        
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        
        // Bandpass filter for voice-like quality
        const filter = this.context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000 + Math.random() * 1000;
        filter.Q.value = 1;
        
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.3, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
        
        // Spatial positioning
        const panner = this.context.createStereoPanner();
        panner.pan.value = Math.random() * 2 - 1; // Random position L/R
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterGain);
        source.start();
        
        console.log('🔊 Whisper played');
    }
    
    /**
     * Modulate parameter with LFO
     */
    modulateParameter(param, depth, frequency, offset = 0) {
        const lfo = this.context.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = frequency;
        
        const lfoGain = this.context.createGain();
        lfoGain.gain.value = depth;
        
        lfo.connect(lfoGain);
        lfoGain.connect(param);
        lfo.start();
        
        // Set initial value
        param.value = offset + depth;
    }
    
    /**
     * Update audio based on player sanity
     */
    updateForSanity(sanityRatio) {
        // Increase dissonance as sanity decreases
        if (this.layers.drone) {
            const dissonanceMultiplier = 1 + (1 - sanityRatio) * 0.5;
            this.layers.drone.oscillators.forEach((osc, i) => {
                osc.osc.detune.value *= dissonanceMultiplier;
            });
        }
        
        // Increase infrasound intensity
        if (this.layers.infrasound) {
            this.layers.infrasound.gain.gain.value = 0.3 + (1 - sanityRatio) * 0.4;
        }
        
        // More frequent whispers at low sanity
        if (sanityRatio < 0.5) {
            this.config.whisperInterval = 15000 + sanityRatio * 30000;
        }
    }
    
    /**
     * Stop all audio
     */
    stop() {
        if (!this.isPlaying) return;
        
        // Stop all layers
        Object.values(this.layers).forEach(layer => {
            if (layer) {
                if (layer.oscillator) layer.oscillator.stop();
                if (layer.source) layer.source.stop();
                if (layer.oscillators) {
                    layer.oscillators.forEach(o => o.osc.stop());
                }
            }
        });
        
        this.isPlaying = false;
        console.log('✓ Audio stopped');
    }
    
    /**
     * Set master volume
     */
    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }
}
