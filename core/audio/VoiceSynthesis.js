/**
 * Procedural Voice Synthesis System - Phase 12: Advanced Audio
 * Generates ghostly whispers, demonic voices, and procedural dialogue
 * Uses Web Audio API with advanced DSP for horror effects
 */

export class VoiceSynthesis {
  constructor(audioContext) {
    this.context = audioContext;
    this.voices = new Map();
    this.activeVoices = [];
    
    // Voice presets for horror archetypes
    this.presets = {
      ghost_whisper: {
        pitch: 1.5,
        rate: 0.8,
        reverb: 0.8,
        distortion: 0.2,
        formantShift: 1.3,
        whisper: true
      },
      demon_deep: {
        pitch: 0.5,
        rate: 0.6,
        reverb: 0.6,
        distortion: 0.7,
        formantShift: 0.6,
        growl: true
      },
      child_spirit: {
        pitch: 1.8,
        rate: 1.0,
        reverb: 0.7,
        distortion: 0.1,
        formantShift: 1.5,
        innocent: true
      },
      possessed: {
        pitch: 0.8,
        rate: 0.9,
        reverb: 0.5,
        distortion: 0.6,
        formantShift: 0.9,
        dual: true // Two voices layered
      },
      ethereal: {
        pitch: 1.2,
        rate: 0.7,
        reverb: 0.9,
        distortion: 0.0,
        formantShift: 1.1,
        chorus: 0.8
      }
    };

    // Phoneme database for procedural speech
    this.phonemes = {
      vowels: ['a', 'e', 'i', 'o', 'u', 'ah', 'eh', 'ih', 'oh', 'uh'],
      consonants: ['b', 'd', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'w', 'y', 'z'],
      whispers: ['sh', 'th', 'f', 's', 'h'],
      screams: ['aa', 'ee', 'oo', 'ai', 'ei']
    };

    // Reverb impulse responses
    this.impulseResponses = {};
  }

  /**
   * Create a synthesized voice
   */
  createVoice(text, preset = 'ghost_whisper', options = {}) {
    const config = { ...this.presets[preset], ...options };
    
    const voice = {
      id: this.generateId(),
      text,
      preset,
      config,
      nodes: [],
      gainNode: null,
      pannerNode: null,
      isPlaying: false
    };

    // Create audio chain
    this.createVoiceChain(voice);
    
    this.voices.set(voice.id, voice);
    return voice;
  }

  /**
   * Create the audio processing chain for a voice
   */
  createVoiceChain(voice) {
    const { config } = voice;
    
    // Source: Create noise buffer for whisper effect or oscillator for tonal voice
    let source;
    if (config.whisper) {
      source = this.createWhisperSource();
    } else if (config.growl) {
      source = this.createGrowlSource();
    } else {
      source = this.context.createOscillator();
      source.type = 'sine';
      source.frequency.value = 150 * config.pitch;
    }

    // Formant filter for vocal character
    const formantFilter = this.context.createBiquadFilter();
    formantFilter.type = 'peaking';
    formantFilter.frequency.value = 1000 * config.formantShift;
    formantFilter.Q.value = 1.5;
    formantFilter.gain.value = 10;

    // Distortion for demonic/possessed voices
    let distortionNode = null;
    if (config.distortion > 0) {
      distortionNode = this.createDistortion(config.distortion);
    }

    // Chorus for ethereal voices
    let chorusNode = null;
    if (config.chorus > 0) {
      chorusNode = this.createChorus(config.chorus);
    }

    // Reverb
    const reverbNode = this.createReverb(config.reverb);

    // Panner for 3D positioning
    const pannerNode = this.context.createPanner();
    pannerNode.panningModel = 'HRTF';
    pannerNode.distanceModel = 'inverse';
    pannerNode.refDistance = 1;
    pannerNode.maxDistance = 100;
    pannerNode.rolloffFactor = 1;

    // Master gain
    const gainNode = this.context.createGain();
    gainNode.gain.value = 0;

    // Connect the chain
    source.connect(formantFilter);
    
    if (distortionNode) {
      formantFilter.connect(distortionNode);
      distortionNode.connect(chorusNode || reverbNode);
    }
    
    if (chorusNode) {
      chorusNode.connect(reverbNode);
    }
    
    reverbNode.connect(pannerNode);
    pannerNode.connect(gainNode);
    gainNode.connect(this.context.destination);

    voice.nodes = [source, formantFilter, distortionNode, chorusNode, reverbNode].filter(Boolean);
    voice.gainNode = gainNode;
    voice.pannerNode = pannerNode;
    voice.source = source;
  }

  /**
   * Create whisper noise source
   */
  createWhisperSource() {
    const bufferSize = 2 * this.context.sampleRate;
    const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Compensate for gain loss
    }

    const noiseSource = this.context.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Filter to make it more whisper-like
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;

    noiseSource.connect(filter);
    noiseSource.filteredOutput = filter;

    return noiseSource;
  }

  /**
   * Create growl source using multiple oscillators
   */
  createGrowlSource() {
    const merger = this.context.createChannelMerger(2);
    
    // Fundamental frequency
    const osc1 = this.context.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 80;

    // Sub-octave
    const osc2 = this.context.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 40;

    // Noise component
    const noise = this.createNoiseBuffer(1);
    const noiseFilter = this.context.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 200;

    osc1.connect(merger, 0, 0);
    osc2.connect(merger, 0, 1);
    noise.connect(noiseFilter);
    noiseFilter.connect(merger, 0, 1);

    merger.mergerOutput = merger;
    return merger;
  }

  /**
   * Create distortion effect
   */
  createDistortion(amount) {
    const distortion = this.context.createWaveShaper();
    const curve = new Float32Array(this.context.sampleRate * 2);
    const deg = Math.PI / 180;

    for (let i = 0; i < this.context.sampleRate * 2; ++i) {
      const x = (i * 2) / this.context.sampleRate - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }

    distortion.curve = curve;
    distortion.oversample = '4x';
    
    return distortion;
  }

  /**
   * Create chorus effect
   */
  createChorus(amount) {
    const delay = this.context.createDelay();
    delay.delayTime.value = 0.03;

    const lfo = this.context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.5;

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = amount * 0.01;

    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);
    lfo.start();

    delay.lfo = lfo;
    return delay;
  }

  /**
   * Create reverb effect
   */
  createReverb(amount) {
    const wetGain = this.context.createGain();
    wetGain.gain.value = amount;

    const dryGain = this.context.createGain();
    dryGain.gain.value = 1 - amount;

    // Simple reverb using convolution would go here
    // For now, use a feedback delay network approximation
    const convolver = this.context.createConvolver();
    
    // Generate impulse response
    const length = this.context.sampleRate * 2; // 2 seconds
    const impulse = this.context.createBuffer(2, length, this.context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }

    convolver.buffer = impulse;

    // Parallel connection
    const input = this.context.createGain();
    const output = this.context.createGain();

    input.connect(convolver);
    input.connect(dryGain);
    convolver.connect(wetGain);
    wetGain.connect(output);
    dryGain.connect(output);

    return output;
  }

  /**
   * Generate procedural whisper from phonemes
   */
  generateProceduralWhisper(duration = 3) {
    const syllableCount = Math.floor(duration * 2);
    let whisper = '';

    for (let i = 0; i < syllableCount; i++) {
      const consonant = this.phonemes.whispers[
        Math.floor(Math.random() * this.phonemes.whispers.length)
      ];
      const vowel = this.phonemes.vowels[
        Math.floor(Math.random() * this.phonemes.vowels.length)
      ];
      whisper += consonant + vowel + ' ';
    }

    return whisper.trim();
  }

  /**
   * Speak text with voice
   */
  speak(voiceId, position = null) {
    const voice = this.voices.get(voiceId);
    if (!voice) return;

    // Set position if provided
    if (position && voice.pannerNode) {
      voice.pannerNode.positionX.value = position.x || 0;
      voice.pannerNode.positionY.value = position.y || 0;
      voice.pannerNode.positionZ.value = position.z || 0;
    }

    // Fade in
    voice.gainNode.gain.setTargetAtTime(0.5, this.context.currentTime, 0.1);
    
    // Start source
    if (voice.source.start) {
      voice.source.start();
    }
    
    voice.isPlaying = true;
    this.activeVoices.push(voice);
  }

  /**
   * Stop voice
   */
  stop(voiceId) {
    const voice = this.voices.get(voiceId);
    if (!voice) return;

    // Fade out
    voice.gainNode.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
    
    // Stop source after fade
    setTimeout(() => {
      if (voice.source.stop) {
        voice.source.stop();
      }
      voice.isPlaying = false;
    }, 200);
  }

  /**
   * Generate random ghost phrase
   */
  generateGhostPhrase(options = {}) {
    const phrases = [
      "get out",
      "leave this place",
      "can't escape",
      "forever trapped",
      "join us",
      "death awaits",
      "no hope left",
      "darkness comes",
      "your time ends",
      "eternal suffering"
    ];

    const basePhrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    // Add echoes and repetitions based on config
    const repeat = Math.random() > 0.7;
    const whisper = Math.random() > 0.5;
    
    return {
      text: repeat ? `${basePhrase}... ${basePhrase}` : basePhrase,
      style: whisper ? 'whisper' : 'normal',
      intensity: Math.random()
    };
  }

  /**
   * Update active voices
   */
  update(deltaTime) {
    // Remove stopped voices from active list
    this.activeVoices = this.activeVoices.filter(voice => voice.isPlaying);
  }

  /**
   * Get all voices
   */
  getVoices() {
    return Array.from(this.voices.values());
  }

  /**
   * Clear all voices
   */
  clear() {
    this.voices.forEach(voice => {
      this.stop(voice.id);
      voice.nodes.forEach(node => {
        if (node.disconnect) node.disconnect();
      });
    });
    this.voices.clear();
    this.activeVoices = [];
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create noise buffer
   */
  createNoiseBuffer(duration) {
    const bufferSize = duration * this.context.sampleRate;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }
}

let lastOut = 0;

export default VoiceSynthesis;
