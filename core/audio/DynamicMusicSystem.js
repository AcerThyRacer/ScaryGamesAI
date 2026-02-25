/**
 * Dynamic Music System - Phase 2: Advanced Audio Systems
 * Adaptive soundtrack that reacts to gameplay intensity, player state, and events
 */

export class DynamicMusicSystem {
  constructor(audioContext) {
    this.context = audioContext;
    this.tracks = new Map();
    this.activeLayers = new Map();
    this.currentIntensity = 0;
    this.targetIntensity = 0;
    this.intensityLerp = 0.1;
    this.bpm = 60;
    this.beatTime = 0;
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.context.destination);
    this.isPlaying = false;
    this.currentTrack = null;
  }

  /**
   * Create adaptive music track with layers
   */
  createTrack(trackId, layers = {}) {
    const track = {
      id: trackId,
      layers: new Map(),
      currentLayer: null,
      transitionTime: 2
    };

    // Add default layers
    const defaultLayers = ['ambient', 'tension', 'action', 'horror', 'climax'];
    defaultLayers.forEach(layerName => {
      if (layers[layerName]) {
        this.addLayer(trackId, layerName, layers[layerName]);
      } else {
        this.addLayer(trackId, layerName, this.generateLayer(layerName));
      }
    });

    this.tracks.set(trackId, track);
    return track;
  }

  /**
   * Add layer to track
   */
  addLayer(trackId, layerName, buffer) {
    const track = this.tracks.get(trackId);
    if (!track) return;

    track.layers.set(layerName, {
      buffer,
      gain: this.context.createGain(),
      filter: this.context.createBiquadFilter(),
      active: false
    });

    const layer = track.layers.get(layerName);
    layer.gain.connect(this.masterGain);
    layer.filter.connect(layer.gain);
  }

  /**
   * Generate procedural layer based on type
   */
  generateLayer(type) {
    const duration = 8; // 8 second loop
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const scales = {
      ambient: [65.41, 77.78, 98.00, 130.81, 155.56, 196.00], // C2 minor
      tension: [65.41, 69.30, 98.00, 123.47, 155.56, 185.00], // C2 diminished
      action: [65.41, 77.78, 98.00, 130.81, 146.83, 196.00], // C2 minor pentatonic
      horror: [65.41, 69.30, 92.50, 123.47, 155.56, 185.00], // C2 phrygian
      climax: [65.41, 77.78, 98.00, 130.81, 164.81, 196.00] // C2 minor harmonic
    };

    const scale = scales[type] || scales.ambient;
    const baseFreq = scale[0];

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const beat = t * (this.bpm / 60);
      
      let sample = 0;

      if (type === 'ambient') {
        // Drone pad
        scale.forEach((freq, idx) => {
          const amp = 0.1 / (idx + 1);
          sample += Math.sin(2 * Math.PI * freq * t) * amp;
        });
        sample *= 0.3;
      } else if (type === 'tension') {
        // Pulsing bass
        const pulse = Math.sin(2 * Math.PI * (this.bpm / 60 / 2) * t);
        const envelope = pulse > 0 ? pulse : 0;
        sample = Math.sin(2 * Math.PI * baseFreq * t) * envelope * 0.5;
      } else if (type === 'action') {
        // Arpeggiated sequence
        const arpSpeed = this.bpm / 60 * 4;
        const noteIndex = Math.floor(beat * 4) % scale.length;
        const noteFreq = scale[noteIndex];
        sample = Math.sin(2 * Math.PI * noteFreq * t) * 0.4;
      } else if (type === 'horror') {
        // Dissonant cluster
        const freq1 = scale[0];
        const freq2 = scale[1];
        const freq3 = scale[3];
        sample = (
          Math.sin(2 * Math.PI * freq1 * t) * 0.2 +
          Math.sin(2 * Math.PI * freq2 * t) * 0.2 +
          Math.sin(2 * Math.PI * freq3 * t) * 0.2
        );
      } else if (type === 'climax') {
        // Full orchestral hit simulation
        scale.forEach((freq, idx) => {
          const amp = 0.15 / (idx + 1);
          sample += Math.sin(2 * Math.PI * freq * t) * amp;
        });
        sample *= 0.5;
      }

      // Add some noise for texture
      sample += (Math.random() * 2 - 1) * 0.05;

      // Smooth envelope to avoid clicks
      const envelope = Math.min(1, i / (sampleRate * 0.1)) * 
                       Math.min(1, (length - i) / (sampleRate * 0.1));
      
      left[i] = sample * envelope;
      right[i] = sample * envelope * 0.95;
    }

    return buffer;
  }

  /**
   * Play track
   */
  play(trackId) {
    const track = this.tracks.get(trackId);
    if (!track) return;

    this.currentTrack = trackId;
    this.isPlaying = true;
    this.targetIntensity = 0;

    // Start all layers (muted)
    track.layers.forEach((layer, name) => {
      layer.source = this.context.createBufferSource();
      layer.source.buffer = layer.buffer;
      layer.source.loop = true;
      layer.source.connect(layer.filter);
      layer.source.start(0);
      layer.active = false;
      layer.gain.gain.value = 0;
    });
  }

  /**
   * Stop track
   */
  stop() {
    if (!this.isPlaying) return;

    const track = this.tracks.get(this.currentTrack);
    if (track) {
      track.layers.forEach((layer) => {
        if (layer.source) {
          layer.source.stop();
        }
      });
    }

    this.isPlaying = false;
    this.currentTrack = null;
    this.activeLayers.clear();
  }

  /**
   * Update music intensity based on gameplay
   */
  setIntensity(intensity) {
    this.targetIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Update music system (call every frame)
   */
  update(dt) {
    if (!this.isPlaying) return;

    const track = this.tracks.get(this.currentTrack);
    if (!track) return;

    // Smooth intensity transition
    this.currentIntensity += (this.targetIntensity - this.currentIntensity) * this.intensityLerp;

    // Update layer volumes based on intensity
    const layers = Array.from(track.layers.keys());
    const numLayers = layers.length;

    layers.forEach((layerName, index) => {
      const layer = track.layers.get(layerName);
      const layerThreshold = index / numLayers;
      const layerWidth = 1 / numLayers;

      // Calculate target volume for this layer
      let targetVolume = 0;
      
      if (this.currentIntensity >= layerThreshold) {
        const intensityInLayer = (this.currentIntensity - layerThreshold) / layerWidth;
        targetVolume = Math.min(1, intensityInLayer);
      }

      // Smooth volume transition
      layer.gain.gain.setTargetAtTime(
        targetVolume,
        this.context.currentTime,
        0.5
      );

      // Update filter based on intensity
      const baseFreq = layerName === 'ambient' ? 200 : 
                       layerName === 'tension' ? 400 : 
                       layerName === 'action' ? 800 : 
                       layerName === 'horror' ? 300 : 1000;
      
      const filterFreq = baseFreq + this.currentIntensity * 2000;
      layer.filter.frequency.setTargetAtTime(
        filterFreq,
        this.context.currentTime,
        1
      );
    });

    // Update beat tracking
    this.beatTime += dt;
    const beatDuration = 60 / this.bpm;
    
    if (this.beatTime >= beatDuration) {
      this.beatTime -= beatDuration;
      this.onBeat();
    }
  }

  /**
   * Called on every beat
   */
  onBeat() {
    // Can be overridden for beat-synchronized effects
  }

  /**
   * Trigger musical event (stinger, hit, etc.)
   */
  triggerEvent(eventType) {
    if (!this.isPlaying) return;

    switch (eventType) {
      case 'stinger':
        this.playStinger();
        break;
      case 'hit':
        this.playHit();
        break;
      case 'transition':
        this.playTransition();
        break;
      case 'jumpscare':
        this.playJumpscare();
        break;
    }
  }

  playStinger() {
    // Short musical accent
    const duration = 2;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const freq = 440;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 3);
      const sample = Math.sin(2 * Math.PI * freq * t) * envelope;
      left[i] = sample;
      right[i] = sample;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.masterGain);
    source.start(0);
  }

  playHit() {
    // Percussive hit
    const duration = 0.3;
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

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.masterGain);
    source.start(0);
  }

  playTransition() {
    // Rising transition effect
    const duration = 3;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin(Math.PI * t / duration);
      const freq = 200 + t * 400;
      const sample = Math.sin(2 * Math.PI * freq * t) * envelope;
      left[i] = sample;
      right[i] = sample;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.masterGain);
    source.start(0);
  }

  playJumpscare() {
    // Loud dissonant chord
    const duration = 1.5;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const freqs = [440, 466.16, 880, 932.33]; // Dissonant cluster

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 5);
      
      let sample = 0;
      freqs.forEach(freq => {
        sample += Math.sin(2 * Math.PI * freq * t) * 0.3;
      });
      
      sample += (Math.random() * 2 - 1) * 0.2;

      left[i] = sample * envelope;
      right[i] = sample * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.masterGain);
    source.start(0);
  }

  /**
   * Set master volume
   */
  setVolume(volume) {
    this.masterGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, volume)),
      this.context.currentTime,
      0.1
    );
  }

  /**
   * Set BPM
   */
  setBPM(bpm) {
    this.bpm = Math.max(30, Math.min(200, bpm));
  }

  /**
   * Get current intensity
   */
  getIntensity() {
    return this.currentIntensity;
  }

  /**
   * Get current beat time
   */
  getBeatTime() {
    return this.beatTime;
  }

  /**
   * Cleanup
   */
  dispose() {
    this.stop();
    this.tracks.clear();
    this.masterGain.disconnect();
  }
}

export default DynamicMusicSystem;
