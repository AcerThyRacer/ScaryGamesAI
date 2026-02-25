/**
 * Procedural Audio Engine - Phase 2: Advanced Audio Systems
 * Universal procedural sound generation for all 10 horror games
 * Features: Synthesized SFX, dynamic generation, zero external assets
 */

export class ProceduralAudioEngine {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.compressor = null;
    this.reverbNode = null;
    this.initialized = false;
    this.sfxCache = new Map();
    this.activeSounds = [];
    this.maxPolyphony = 32;
    this.sampleRate = 44100;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Create audio context
      this.context = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate,
        latencyHint: 'interactive'
      });

      // Master chain
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.8;

      // Compressor for consistent levels
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      // Create reverb
      this.reverbNode = await this.createReverb(2.0);

      // Connect chain
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.reverbNode);
      this.reverbNode.connect(this.context.destination);

      this.initialized = true;
      console.log('ProceduralAudioEngine initialized');
    } catch (error) {
      console.error('Audio engine initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate procedural sound effects
   */
  generateSFX(type, params = {}) {
    const cacheKey = `${type}:${JSON.stringify(params)}`;
    
    if (this.sfxCache.has(cacheKey)) {
      return this.sfxCache.get(cacheKey);
    }

    let buffer;
    
    switch (type) {
      case 'jumpscare':
        buffer = this.createJumpscare(params);
        break;
      case 'footstep':
        buffer = this.createFootstep(params);
        break;
      case 'door':
        buffer = this.createDoor(params);
        break;
      case 'whisper':
        buffer = this.createWhisper(params);
        break;
      case 'heartbeat':
        buffer = this.createHeartbeat(params);
        break;
      case 'scratch':
        buffer = this.createScratch(params);
        break;
      case 'creak':
        buffer = this.createCreak(params);
        break;
      case 'ghost':
        buffer = this.createGhost(params);
        break;
      case 'collect':
        buffer = this.createCollect(params);
        break;
      case 'hit':
        buffer = this.createHit(params);
        break;
      default:
        buffer = this.createNoise(params);
    }

    this.sfxCache.set(cacheKey, buffer);
    return buffer;
  }

  /**
   * Play a procedural sound
   */
  play(type, params = {}, position = null) {
    if (!this.initialized) return null;

    const buffer = this.generateSFX(type, params);
    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Create 3D panner if position provided
    if (position) {
      const panner = this.context.createPanner();
      panner.positionX.value = position.x || 0;
      panner.positionY.value = position.y || 0;
      panner.positionZ.value = position.z || 0;
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 1;
      
      source.connect(panner);
      panner.connect(this.masterGain);
    } else {
      source.connect(this.masterGain);
    }

    source.start(0);
    
    // Track active sounds
    this.activeSounds.push(source);
    source.onended = () => {
      const idx = this.activeSounds.indexOf(source);
      if (idx !== -1) this.activeSounds.splice(idx, 1);
    };

    // Enforce polyphony limit
    if (this.activeSounds.length > this.maxPolyphony) {
      const oldest = this.activeSounds.shift();
      oldest.stop();
    }

    return source;
  }

  /**
   * Stop all sounds
   */
  stopAll() {
    this.activeSounds.forEach(sound => {
      try {
        sound.stop();
      } catch (e) {}
    });
    this.activeSounds = [];
  }

  /**
   * Set master volume
   */
  setVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Create impulse response for reverb
   */
  async createReverb(duration = 2) {
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

  // === PROCEDURAL SOUND GENERATORS ===

  createJumpscare(params = {}) {
    const duration = params.duration || 1.5;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const freq = params.frequency || 800;
    const modulation = params.modulation || 50;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 3);
      
      // Screaming sine wave with FM
      const mod = Math.sin(2 * Math.PI * modulation * t) * 200;
      const sample = Math.sin(2 * Math.PI * (freq + mod) * t);
      
      // Add noise
      const noise = (Math.random() * 2 - 1) * 0.5;
      
      left[i] = (sample + noise) * envelope;
      right[i] = (sample - noise) * envelope;
    }

    return buffer;
  }

  createFootstep(params = {}) {
    const duration = params.duration || 0.15;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const surface = params.surface || 'hard'; // hard, soft, gravel
    const decay = surface === 'soft' ? 8 : surface === 'gravel' ? 12 : 6;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * decay);
      
      // Impact transient
      let sample = 0;
      if (i < length * 0.1) {
        sample = (Math.random() * 2 - 1) * envelope;
      } else {
        // Resonant body
        const freq = surface === 'hard' ? 200 : surface === 'soft' ? 100 : 300;
        sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
      }

      left[i] = sample;
      right[i] = sample;
    }

    return buffer;
  }

  createDoor(params = {}) {
    const duration = params.duration || 0.8;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const type = params.type || 'creak'; // creak, slam, lock
    const freq = params.frequency || 150;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      
      if (type === 'slam') {
        const envelope = Math.exp(-t * 10);
        const sample = (Math.random() * 2 - 1) * envelope;
        left[i] = sample;
        right[i] = sample;
      } else if (type === 'creak') {
        const envelope = Math.exp(-t * 2);
        const mod = Math.sin(2 * Math.PI * 5 * t) * 50;
        const sample = Math.sin(2 * Math.PI * (freq + mod) * t) * envelope;
        left[i] = sample;
        right[i] = sample * 0.9;
      }
    }

    return buffer;
  }

  createWhisper(params = {}) {
    const duration = params.duration || 2.0;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const pitch = params.pitch || 300;
    const formants = params.formants || [500, 1500, 2500];

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin(Math.PI * t / duration) * 0.3;
      
      // Noise base
      let sample = (Math.random() * 2 - 1) * 0.2;
      
      // Add formants
      formants.forEach(freq => {
        sample += Math.sin(2 * Math.PI * freq * t) * 0.1;
      });

      // Amplitude modulation for wavering effect
      sample *= 1 + Math.sin(2 * Math.PI * 4 * t) * 0.3;

      left[i] = sample * envelope;
      right[i] = sample * envelope * 0.9;
    }

    return buffer;
  }

  createHeartbeat(params = {}) {
    const duration = params.duration || 0.3;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = params.bpm || 80;
    const intensity = params.intensity || 1;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      
      // Two beats: lub-dub
      let sample = 0;
      if (t < 0.1) {
        sample = Math.exp(-t * 30) * intensity;
      } else if (t > 0.15 && t < 0.25) {
        sample = Math.exp(-(t - 0.15) * 40) * intensity * 0.7;
      }

      left[i] = sample;
      right[i] = sample;
    }

    return buffer;
  }

  createScratch(params = {}) {
    const duration = params.duration || 0.4;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const speed = params.speed || 1;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 5);
      
      // Filtered noise with frequency sweep
      const freq = 2000 + Math.sin(t * 50 * speed) * 1000;
      const sample = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * freq * t) * envelope;

      left[i] = sample;
      right[i] = sample * 0.9;
    }

    return buffer;
  }

  createCreak(params = {}) {
    const duration = params.duration || 0.6;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const pitch = params.pitch || 100;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 3);
      
      // Multiple detuned oscillators
      let sample = 0;
      sample += Math.sin(2 * Math.PI * pitch * t);
      sample += Math.sin(2 * Math.PI * (pitch * 1.01) * t) * 0.5;
      sample += Math.sin(2 * Math.PI * (pitch * 0.99) * t) * 0.5;
      
      // Add some noise
      sample += (Math.random() * 2 - 1) * 0.2;

      left[i] = sample * envelope;
      right[i] = sample * envelope;
    }

    return buffer;
  }

  createGhost(params = {}) {
    const duration = params.duration || 3.0;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const baseFreq = params.frequency || 400;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin(Math.PI * t / duration) * 0.4;
      
      // Ethereal pad sound
      let sample = 0;
      sample += Math.sin(2 * Math.PI * baseFreq * t);
      sample += Math.sin(2 * Math.PI * (baseFreq * 1.5) * t) * 0.3;
      sample += Math.sin(2 * Math.PI * (baseFreq * 2) * t) * 0.2;
      
      // Slow LFO
      sample *= 1 + Math.sin(2 * Math.PI * 0.5 * t) * 0.3;

      left[i] = sample * envelope;
      right[i] = sample * envelope * 0.9;
    }

    return buffer;
  }

  createCollect(params = {}) {
    const duration = params.duration || 0.2;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const freq = params.frequency || 880;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 15);
      
      const sample = Math.sin(2 * Math.PI * freq * t) * envelope;

      left[i] = sample;
      right[i] = sample;
    }

    return buffer;
  }

  createHit(params = {}) {
    const duration = params.duration || 0.3;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 20);
      
      const sample = (Math.random() * 2 - 1) * envelope;

      left[i] = sample;
      right[i] = sample;
    }

    return buffer;
  }

  createNoise(params = {}) {
    const duration = params.duration || 1.0;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const color = params.color || 'white'; // white, pink, brown

    for (let i = 0; i < length; i++) {
      let sample;
      
      if (color === 'white') {
        sample = Math.random() * 2 - 1;
      } else if (color === 'pink') {
        // Approximate pink noise
        const white = Math.random() * 2 - 1;
        sample = (white + (i > 0 ? left[i-1] * 0.9 : 0)) / 2;
      } else {
        // Brown noise
        const white = Math.random() * 2 - 1;
        sample = (i > 0 ? left[i-1] : 0) + white * 0.02;
      }

      left[i] = sample * 0.5;
      right[i] = sample * 0.5;
    }

    return buffer;
  }
}

export default ProceduralAudioEngine;
