/**
 * Universal Audio Manager - Phase 2: Advanced Audio Systems
 * Central audio system integrating all Phase 2 audio components
 */

import { ProceduralAudioEngine } from './ProceduralAudioEngine.js';
import { SpatialAudio3D } from './SpatialAudio3D.js';
import { VoiceSynthesis } from './VoiceSynthesis.js';
import { DynamicMusicSystem } from './DynamicMusicSystem.js';
import { AudioVisualizer } from './AudioVisualizer.js';

export class AudioManager {
  constructor() {
    this.context = null;
    this.procedural = null;
    this.spatial = null;
    this.voice = null;
    this.music = null;
    this.visualizer = null;
    this.initialized = false;
    this.enabled = true;
    this.muted = false;
    
    // Game-specific audio presets
    this.presets = {
      'haunted-asylum': {
        reverb: 0.6,
        ambientLevel: 0.4,
        sfxLevel: 0.8,
        musicIntensity: 0.5
      },
      'the-elevator': {
        reverb: 0.8,
        ambientLevel: 0.6,
        sfxLevel: 0.7,
        musicIntensity: 0.4
      },
      'seance': {
        reverb: 0.9,
        ambientLevel: 0.5,
        sfxLevel: 0.6,
        musicIntensity: 0.3
      },
      'graveyard-shift': {
        reverb: 0.7,
        ambientLevel: 0.3,
        sfxLevel: 0.9,
        musicIntensity: 0.6
      }
    };
  }

  /**
   * Initialize all audio systems
   */
  async initialize(options = {}) {
    if (this.initialized) return;

    try {
      // Create audio context
      this.context = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: options.sampleRate || 44100,
        latencyHint: 'interactive'
      });

      // Initialize subsystems
      this.procedural = new ProceduralAudioEngine();
      await this.procedural.initialize();

      this.spatial = new SpatialAudio3D(this.context);
      
      this.voice = new VoiceSynthesis(this.context);
      await this.voice.initialize();

      this.music = new DynamicMusicSystem(this.context);
      
      this.visualizer = new AudioVisualizer(this.context);

      // Apply preset if game specified
      if (options.gameId && this.presets[options.gameId]) {
        this.applyPreset(options.gameId);
      }

      this.initialized = true;
      console.log('AudioManager initialized');
      
      return true;
    } catch (error) {
      console.error('AudioManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Apply game-specific audio preset
   */
  applyPreset(gameId) {
    const preset = this.presets[gameId];
    if (!preset) return;

    if (this.procedural) {
      this.procedural.setVolume(preset.sfxLevel);
    }
    if (this.music) {
      this.music.setVolume(preset.musicIntensity);
    }
  }

  /**
   * Play a sound effect
   */
  playSFX(type, params = {}, position = null) {
    if (!this.enabled || this.muted) return null;
    
    if (position) {
      const buffer = this.procedural.generateSFX(type, params);
      return this.spatial.createSource(buffer, position);
    } else {
      return this.procedural.play(type, params);
    }
  }

  /**
   * Update 3D audio listener position
   */
  updateListener(position, orientation) {
    if (!this.spatial) return;
    this.spatial.updateListener(position, orientation);
  }

  /**
   * Update 3D audio source position
   */
  updateSourcePosition(sourceId, position, velocity = null) {
    if (!this.spatial) return;
    this.spatial.updateSourcePosition(sourceId, position, velocity);
  }

  /**
   * Play voice line
   */
  speak(text, options = {}) {
    if (!this.enabled || this.muted) return null;
    return this.voice.speak(text, options);
  }

  /**
   * Start dynamic music
   */
  playMusic(trackId = 'ambient') {
    if (!this.enabled || this.muted) return;
    
    if (!this.music.tracks.has(trackId)) {
      this.music.createTrack(trackId);
    }
    
    this.music.play(trackId);
  }

  /**
   * Stop music
   */
  stopMusic() {
    if (!this.music) return;
    this.music.stop();
  }

  /**
   * Update music intensity
   */
  setMusicIntensity(intensity) {
    if (!this.music) return;
    this.music.setIntensity(intensity);
  }

  /**
   * Update audio systems (call every frame)
   */
  update(dt) {
    if (!this.initialized) return;

    if (this.music && this.music.isPlaying) {
      this.music.update(dt);
    }

    if (this.spatial && this.occlusionEnabled) {
      this.spatial.updateOcclusion();
    }
  }

  /**
   * Set master volume
   */
  setVolume(volume) {
    if (this.procedural) {
      this.procedural.setVolume(volume);
    }
    if (this.music) {
      this.music.setVolume(volume);
    }
  }

  /**
   * Mute/unmute
   */
  setMuted(muted) {
    this.muted = muted;
    if (muted) {
      this.setVolume(0);
    } else {
      this.setVolume(1);
    }
  }

  /**
   * Enable/disable audio
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.procedural?.stopAll();
      this.music?.stop();
      this.voice?.stop();
    }
  }

  /**
   * Start audio visualization
   */
  startVisualization(canvas, type = 'frequency') {
    if (!this.visualizer) return;
    this.visualizer.setCanvas(canvas);
    this.visualizer.start(type);
  }

  /**
   * Stop visualization
   */
  stopVisualization() {
    if (!this.visualizer) return;
    this.visualizer.stop();
  }

  /**
   * Get audio context
   */
  getContext() {
    return this.context;
  }

  /**
   * Resume audio context (needed for autoplay policy)
   */
  async resume() {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /**
   * Suspend audio context
   */
  async suspend() {
    if (this.context && this.context.state === 'running') {
      await this.context.suspend();
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    this.procedural?.stopAll();
    this.music?.stop();
    this.voice?.stop();
    this.spatial?.dispose();
    this.visualizer?.dispose();
    
    if (this.context) {
      this.context.close();
    }
    
    this.initialized = false;
  }
}

// Singleton instance
let audioManagerInstance = null;

export function getAudioManager() {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  return audioManagerInstance;
}

export default AudioManager;
