/* ============================================
   The Abyss - Spatial Audio Engine
   3D positional audio with HRTF, reverb, occlusion
   Phase 1 Implementation
   ============================================ */

const SpatialAudio = (function() {
    'use strict';

    // Audio context and settings
    let audioContext = null;
    let listener = null;
    let isInitialized = false;
    let masterGain = null;
    let reverbNode = null;
    let compressor = null;

    // Sound sources registry
    const sources = new Map();
    const soundBuffers = new Map();

    // Audio configuration
    const CONFIG = {
        masterVolume: 0.8,
        musicVolume: 0.3,
        sfxVolume: 0.5,
        ambientVolume: 0.4,
        maxDistance: 100,
        refDistance: 1,
        rolloffFactor: 1,
        coneInnerAngle: 360,
        coneOuterAngle: 360,
        coneOuterGain: 0
    };

    // Underwater audio settings
    const UNDERWATER = {
        lowPassFrequency: 800,     // Hz - underwater muffling
        highPassFrequency: 20,     // Hz - remove very low rumble
        reverbTime: 3.0,           // Seconds
        reverbPreDelay: 0.05,
        reverbDecay: 2.5,
        speedOfSound: 1500         // m/s in water
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    async function init() {
        if (isInitialized) return true;

        try {
            console.log('🔊 Initializing Spatial Audio Engine...');

            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();

            // Create listener
            listener = audioContext.listener;

            // Create master gain
            masterGain = audioContext.createGain();
            masterGain.gain.value = CONFIG.masterVolume;

            // Create compressor for dynamics
            compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            // Create reverb
            await createReverb();

            // Connect chain: master -> compressor -> reverb -> destination
            masterGain.connect(compressor);
            compressor.connect(reverbNode);
            reverbNode.connect(audioContext.destination);

            // Resume context if suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            isInitialized = true;
            console.log('✅ Spatial Audio Engine ready');
            return true;

        } catch (e) {
            console.error('Failed to initialize audio:', e);
            return false;
        }
    }

    // ============================================
    // REVERB GENERATION
    // ============================================
    async function createReverb() {
        reverbNode = audioContext.createConvolver();

        // Generate underwater impulse response
        const sampleRate = audioContext.sampleRate;
        const length = sampleRate * UNDERWATER.reverbTime;
        const impulse = audioContext.createBuffer(2, length, sampleRate);

        const leftChannel = impulse.getChannelData(0);
        const rightChannel = impulse.getChannelData(1);

        // Generate exponential decay noise
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;

            // Early reflections
            let amplitude = 0;
            if (t < UNDERWATER.reverbPreDelay) {
                amplitude = Math.random() * 0.1;
            } else {
                // Late reverb
                const decay = Math.exp(-(t - UNDERWATER.reverbPreDelay) /
                    (UNDERWATER.reverbDecay * 0.5));
                amplitude = (Math.random() * 2 - 1) * decay;
            }

            // Low-pass filter simulation
            const frequency = UNDERWATER.lowPassFrequency;
            const attenuation = 1 / (1 + (i / sampleRate) * frequency * 0.01);

            leftChannel[i] = amplitude * attenuation;
            rightChannel[i] = amplitude * attenuation * (0.9 + Math.random() * 0.2);
        }

        reverbNode.buffer = impulse;
        reverbNode.normalize = true;
    }

    // ============================================
    // SOUND SOURCE CLASS
    // ============================================
    class SpatialSoundSource {
        constructor(id, position, config = {}) {
            this.id = id;
            this.position = new THREE.Vector3().copy(position);
            this.velocity = new THREE.Vector3();
            this.config = { ...CONFIG, ...config };

            // Audio nodes
            this.sourceNode = null;
            this.gainNode = audioContext.createGain();
            this.pannerNode = audioContext.createPanner();
            this.filterNode = audioContext.createBiquadFilter();
            this.wetGain = audioContext.createGain();
            this.dryGain = audioContext.createGain();

            // Setup panner
            this.pannerNode.panningModel = 'HRTF';
            this.pannerNode.distanceModel = 'inverse';
            this.pannerNode.maxDistance = this.config.maxDistance;
            this.pannerNode.refDistance = this.config.refDistance;
            this.pannerNode.rolloffFactor = this.config.rolloffFactor;
            this.pannerNode.coneInnerAngle = this.config.coneInnerAngle;
            this.pannerNode.coneOuterAngle = this.config.coneOuterAngle;
            this.pannerNode.coneOuterGain = this.config.coneOuterGain;
            this.pannerNode.positionX.value = position.x;
            this.pannerNode.positionY.value = position.y;
            this.pannerNode.positionZ.value = position.z;

            // Setup underwater filter (low-pass)
            this.filterNode.type = 'lowpass';
            this.filterNode.frequency.value = UNDERWATER.lowPassFrequency;
            this.filterNode.Q.value = 0;

            // Setup routing
            // Source -> Filter -> Panner -> Dry/Wet -> Output
            this.filterNode.connect(this.pannerNode);
            this.pannerNode.connect(this.dryGain);
            this.pannerNode.connect(this.wetGain);

            this.dryGain.connect(masterGain);
            this.wetGain.connect(reverbNode);

            // Default mix
            this.setReverbMix(0.3);

            // State
            this.isPlaying = false;
            this.loop = config.loop || false;
            this.volume = config.volume || 1;
            this.gainNode.gain.value = this.volume;
        }

        loadBuffer(buffer) {
            this.buffer = buffer;
        }

        play(offset = 0) {
            if (!this.buffer || this.isPlaying) return;

            this.sourceNode = audioContext.createBufferSource();
            this.sourceNode.buffer = this.buffer;
            this.sourceNode.loop = this.loop;

            // Connect to chain
            this.sourceNode.connect(this.filterNode);

            this.sourceNode.start(0, offset);
            this.isPlaying = true;

            this.sourceNode.onended = () => {
                this.isPlaying = false;
                if (this.onEnded) this.onEnded();
            };
        }

        stop() {
            if (this.sourceNode) {
                try {
                    this.sourceNode.stop();
                } catch (e) {
                    // Already stopped
                }
                this.isPlaying = false;
            }
        }

        pause() {
            if (audioContext.state === 'running') {
                audioContext.suspend();
            }
        }

        resume() {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
        }

        setPosition(x, y, z) {
            this.position.set(x, y, z);
            this.pannerNode.positionX.setValueAtTime(x, audioContext.currentTime);
            this.pannerNode.positionY.setValueAtTime(y, audioContext.currentTime);
            this.pannerNode.positionZ.setValueAtTime(z, audioContext.currentTime);
        }

        setVelocity(x, y, z) {
            this.velocity.set(x, y, z);
            this.pannerNode.setVelocity(x, y, z);
        }

        setVolume(volume, fadeTime = 0) {
            this.volume = volume;
            const time = audioContext.currentTime + fadeTime;

            if (fadeTime > 0) {
                this.gainNode.gain.linearRampToValueAtTime(volume, time);
            } else {
                this.gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
            }
        }

        setReverbMix(wetness) {
            this.wetGain.gain.value = wetness;
            this.dryGain.gain.value = 1 - wetness;
        }

        setFilterFrequency(freq) {
            this.filterNode.frequency.setValueAtTime(freq, audioContext.currentTime);
        }

        setDirection(x, y, z) {
            this.pannerNode.orientationX.value = x;
            this.pannerNode.orientationY.value = y;
            this.pannerNode.orientationZ.value = z;
        }

        dispose() {
            this.stop();
            this.sourceNode?.disconnect();
            this.gainNode.disconnect();
            this.pannerNode.disconnect();
            this.filterNode.disconnect();
            this.wetGain.disconnect();
            this.dryGain.disconnect();
        }
    }

    // ============================================
    // SOUND LOADING
    // ============================================
    async function loadSound(url, name) {
        if (soundBuffers.has(name)) return soundBuffers.get(name);

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            soundBuffers.set(name, audioBuffer);
            return audioBuffer;
        } catch (e) {
            console.error('Failed to load sound:', url, e);
            return null;
        }
    }

    function loadSoundFromBase64(base64, name) {
        if (soundBuffers.has(name)) return Promise.resolve(soundBuffers.get(name));

        return new Promise((resolve, reject) => {
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);

            loadSound(url, name).then(buffer => {
                URL.revokeObjectURL(url);
                resolve(buffer);
            }).catch(reject);
        });
    }

    // ============================================
    // SOURCE MANAGEMENT
    // ============================================
    function createSource(id, position, config = {}) {
        const source = new SpatialSoundSource(id, position, config);
        sources.set(id, source);
        return source;
    }

    function removeSource(id) {
        const source = sources.get(id);
        if (source) {
            source.dispose();
            sources.delete(id);
        }
    }

    function getSource(id) {
        return sources.get(id);
    }

    // ============================================
    // LISTENER UPDATE
    // ============================================
    function updateListener(position, forward, up, velocity = null) {
        if (!listener) return;

        const time = audioContext.currentTime;

        // Update position
        listener.positionX.setValueAtTime(position.x, time);
        listener.positionY.setValueAtTime(position.y, time);
        listener.positionZ.setValueAtTime(position.z, time);

        // Update orientation
        listener.forwardX.setValueAtTime(forward.x, time);
        listener.forwardY.setValueAtTime(forward.y, time);
        listener.forwardZ.setValueAtTime(forward.z, time);
        listener.upX.setValueAtTime(up.x, time);
        listener.upY.setValueAtTime(up.y, time);
        listener.upZ.setValueAtTime(up.z, time);

        // Update velocity for Doppler
        if (velocity) {
            listener.setVelocity(velocity.x, velocity.y, velocity.z);
        }
    }

    // ============================================
    // OCCLUSION/RAYCASTING
    // ============================================
    function updateOcclusion(sourcePosition, obstacles = []) {
        // Simplified occlusion - reduce volume if obstacles between source and listener
        const source = sources.get(sourcePosition.id);
        if (!source) return;

        let occlusionFactor = 1;

        for (const obstacle of obstacles) {
            // Check if obstacle blocks sound
            // This would integrate with Three.js raycasting in actual implementation
            occlusionFactor *= 0.7; // Reduce by 30% per obstacle
        }

        source.setVolume(source.volume * occlusionFactor, 0.1);

        // Also adjust low-pass filter for muffled sound
        const freq = UNDERWATER.lowPassFrequency * occlusionFactor;
        source.setFilterFrequency(freq);
    }

    // ============================================
    // VOLUME CONTROL
    // ============================================
    function setMasterVolume(volume) {
        CONFIG.masterVolume = volume;
        if (masterGain) {
            masterGain.gain.setValueAtTime(volume, audioContext.currentTime);
        }
    }

    function setCategoryVolume(category, volume) {
        CONFIG[`${category}Volume`] = volume;

        sources.forEach(source => {
            if (source.config.category === category) {
                source.setVolume(volume * source.config.volume);
            }
        });
    }

    // ============================================
    // PROCEDURAL AUDIO GENERATION
    // ============================================
    function createOscillator(type, frequency, duration) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = type;
        osc.frequency.value = frequency;

        gain.gain.setValueAtTime(0.5, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start();
        osc.stop(audioContext.currentTime + duration);

        return { oscillator: osc, gain };
    }

    function createNoiseBuffer(duration, type = 'white') {
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            if (type === 'white') {
                data[i] = Math.random() * 2 - 1;
            } else if (type === 'pink') {
                // Simplified pink noise
                data[i] = (Math.random() * 2 - 1) / Math.sqrt(i + 1);
            } else if (type === 'brown') {
                // Brown noise
                const last = i > 0 ? data[i - 1] : 0;
                data[i] = (last + (Math.random() * 2 - 1)) / 2;
            }
        }

        return buffer;
    }

    // ============================================
    // DISPOSAL
    // ============================================
    function dispose() {
        sources.forEach(source => source.dispose());
        sources.clear();
        soundBuffers.clear();

        if (audioContext) {
            audioContext.close();
        }

        isInitialized = false;
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        // Initialization
        init,
        dispose,
        isInitialized: () => isInitialized,

        // Sound loading
        loadSound,
        loadSoundFromBase64,
        getBuffer: (name) => soundBuffers.get(name),

        // Source management
        createSource,
        removeSource,
        getSource,
        getAllSources: () => Array.from(sources.values()),

        // Listener
        updateListener,
        updateOcclusion,

        // Volume
        setMasterVolume,
        setCategoryVolume,

        // Procedural
        createOscillator,
        createNoiseBuffer,

        // Context
        getContext: () => audioContext,
        getListener: () => listener,
        resume: () => audioContext?.resume(),
        suspend: () => audioContext?.suspend(),

        // Config
        getConfig: () => ({ ...CONFIG }),
        getUnderwaterSettings: () => ({ ...UNDERWATER })
    };
})();

// Global access
window.SpatialAudio = SpatialAudio;
