/**
 * Total War Engine - Audio System
 * 3D positional audio, dynamic music, and ambient sounds
 */

import type { Vector3 } from '../types';

// ============================================================================
// Audio Types
// ============================================================================

export type AudioCategory = 'music' | 'sfx' | 'voice' | 'ambient' | 'ui';

export interface AudioTrack {
  id: string;
  url: string;
  category: AudioCategory;
  volume: number;
  loop: boolean;
  duration: number;
  loaded: boolean;
}

export interface AudioInstance {
  id: number;
  trackId: string;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode;
  pannerNode: PannerNode | null;
  position: Vector3 | null;
  is3D: boolean;
  playing: boolean;
  loop: boolean;
  volume: number;
  startTime: number;
  pauseTime: number;
}

export interface MusicState {
  current: string | null;
  next: string | null;
  crossfadeProgress: number;
  crossfadeDuration: number;
  intensity: number;
  state: 'calm' | 'tension' | 'battle' | 'victory' | 'defeat';
}

// ============================================================================
// Audio System
// ============================================================================

export class AudioSystem {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private categoryGains: Map<AudioCategory, GainNode> = new Map();
  private tracks: Map<string, AudioTrack> = new Map();
  private instances: Map<number, AudioInstance> = new Map();
  private musicState: MusicState;
  private nextInstanceId: number = 1;
  private listenerPosition: Vector3 = { x: 0, y: 0, z: 0 };
  private listenerOrientation: { forward: Vector3; up: Vector3 } = {
    forward: { x: 0, y: 0, z: -1 },
    up: { x: 0, y: 1, z: 0 },
  };

  private volumeSettings: Map<AudioCategory, number> = new Map([
    ['music', 0.7],
    ['sfx', 1.0],
    ['voice', 1.0],
    ['ambient', 0.6],
    ['ui', 0.8],
  ]);

  constructor() {
    this.musicState = {
      current: null,
      next: null,
      crossfadeProgress: 1,
      crossfadeDuration: 3,
      intensity: 0,
      state: 'calm',
    };
  }

  async initialize(): Promise<boolean> {
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create master gain
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.context.destination);

      // Create category gains
      for (const category of ['music', 'sfx', 'voice', 'ambient', 'ui'] as AudioCategory[]) {
        const gain = this.context.createGain();
        gain.gain.value = this.volumeSettings.get(category) || 1.0;
        gain.connect(this.masterGain);
        this.categoryGains.set(category, gain);
      }

      console.log('Audio system initialized');
      return true;
    } catch (e) {
      console.error('Failed to initialize audio context:', e);
      return false;
    }
  }

  // === Track Management ===

  async loadTrack(id: string, url: string, category: AudioCategory, loop: boolean = false): Promise<AudioTrack> {
    if (this.tracks.has(id)) {
      return this.tracks.get(id)!;
    }

    const track: AudioTrack = {
      id,
      url,
      category,
      volume: 1.0,
      loop,
      duration: 0,
      loaded: false,
    };

    this.tracks.set(id, track);

    // Load audio buffer
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
      track.duration = audioBuffer.duration;
      track.loaded = true;
    } catch (e) {
      console.warn(`Failed to load audio track: ${id}`, e);
    }

    return track;
  }

  unloadTrack(id: string): void {
    // Stop all instances using this track
    for (const [instanceId, instance] of this.instances) {
      if (instance.trackId === id) {
        this.stop(instanceId);
      }
    }
    this.tracks.delete(id);
  }

  // === Playback Control ===

  play(trackId: string, volume: number = 1.0, loop: boolean = false): number | null {
    const track = this.tracks.get(trackId);
    if (!track || !track.loaded || !this.context) return null;

    const instanceId = this.nextInstanceId++;
    const categoryGain = this.categoryGains.get(track.category);
    if (!categoryGain) return null;

    // Create nodes
    const gainNode = this.context.createGain();
    gainNode.gain.value = volume * track.volume;
    gainNode.connect(categoryGain);

    const instance: AudioInstance = {
      id: instanceId,
      trackId,
      source: null,
      gainNode,
      pannerNode: null,
      position: null,
      is3D: false,
      playing: false,
      loop: loop || track.loop,
      volume,
      startTime: 0,
      pauseTime: 0,
    };

    this.instances.set(instanceId, instance);
    this.startPlayback(instanceId);

    return instanceId;
  }

  play3D(trackId: string, position: Vector3, volume: number = 1.0, loop: boolean = false): number | null {
    const instanceId = this.play(trackId, volume, loop);
    if (!instanceId) return null;

    const instance = this.instances.get(instanceId);
    if (!instance || !this.context) return instanceId;

    // Create panner for 3D audio
    const pannerNode = this.context.createPanner();
    pannerNode.panningModel = 'HRTF';
    pannerNode.distanceModel = 'inverse';
    pannerNode.refDistance = 1;
    pannerNode.maxDistance = 100;
    pannerNode.rolloffFactor = 1;
    pannerNode.coneInnerAngle = 360;
    pannerNode.coneOuterAngle = 360;
    pannerNode.coneOuterGain = 0;

    pannerNode.setPosition(position.x, position.y, position.z);

    // Reconnect through panner
    instance.gainNode.disconnect();
    instance.gainNode.connect(pannerNode);
    const categoryGain = this.categoryGains.get(this.tracks.get(instance.trackId)!.category);
    if (categoryGain) {
      pannerNode.connect(categoryGain);
    }

    instance.pannerNode = pannerNode;
    instance.is3D = true;
    instance.position = { ...position };

    return instanceId;
  }

  private startPlayback(instanceId: number): void {
    const instance = this.instances.get(instanceId);
    const track = instance ? this.tracks.get(instance.trackId) : null;
    if (!instance || !track || !this.context) return;

    // Create source
    const source = this.context.createBufferSource();
    // Would need to store audio buffer in track
    // source.buffer = track.buffer;
    source.loop = instance.loop;
    source.connect(instance.gainNode);

    source.onended = () => {
      if (!instance.loop) {
        this.instances.delete(instanceId);
      }
    };

    instance.source = source;
    instance.playing = true;
    instance.startTime = this.context.currentTime;

    // source.start(0, instance.pauseTime);
  }

  pause(instanceId: number): void {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.playing) return;

    if (instance.source) {
      instance.source.stop();
      instance.pauseTime = this.context!.currentTime - instance.startTime;
      instance.playing = false;
    }
  }

  resume(instanceId: number): void {
    const instance = this.instances.get(instanceId);
    if (!instance || instance.playing) return;

    this.startPlayback(instanceId);
  }

  stop(instanceId: number): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    if (instance.source) {
      instance.source.stop();
    }
    this.instances.delete(instanceId);
  }

  stopAll(category?: AudioCategory): void {
    for (const [instanceId, instance] of this.instances) {
      if (!category || this.tracks.get(instance.trackId)?.category === category) {
        this.stop(instanceId);
      }
    }
  }

  // === 3D Audio ===

  setListenerPosition(position: Vector3): void {
    this.listenerPosition = { ...position };
    if (this.context && this.context.listener) {
      this.context.listener.setPosition(position.x, position.y, position.z);
    }
  }

  setListenerOrientation(forward: Vector3, up: Vector3): void {
    this.listenerOrientation = { forward: { ...forward }, up: { ...up } };
    if (this.context && this.context.listener) {
      this.context.listener.setOrientation(
        forward.x, forward.y, forward.z,
        up.x, up.y, up.z
      );
    }
  }

  updateSoundPosition(instanceId: number, position: Vector3): void {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.is3D || !instance.pannerNode) return;

    instance.position = { ...position };
    instance.pannerNode.setPosition(position.x, position.y, position.z);
  }

  // === Volume Control ===

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setCategoryVolume(category: AudioCategory, volume: number): void {
    this.volumeSettings.set(category, volume);
    const gain = this.categoryGains.get(category);
    if (gain) {
      gain.gain.value = volume;
    }
  }

  setInstanceVolume(instanceId: number, volume: number): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.volume = volume;
      instance.gainNode.gain.value = volume;
    }
  }

  fadeTo(instanceId: number, targetVolume: number, duration: number): void {
    const instance = this.instances.get(instanceId);
    if (!instance || !this.context) return;

    const currentTime = this.context.currentTime;
    instance.gainNode.gain.setValueAtTime(instance.gainNode.gain.value, currentTime);
    instance.gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + duration);
  }

  // === Dynamic Music System ===

  updateMusicState(battleIntensity: number, playerAdvantage: number): void {
    // Determine music state based on battle conditions
    let newState: MusicState['state'];

    if (battleIntensity < 0.2) {
      newState = 'calm';
    } else if (battleIntensity < 0.5) {
      newState = 'tension';
    } else if (playerAdvantage > 0.3) {
      newState = 'victory';
    } else if (playerAdvantage < -0.3) {
      newState = 'defeat';
    } else {
      newState = 'battle';
    }

    if (newState !== this.musicState.state) {
      this.transitionMusic(newState);
      this.musicState.state = newState;
    }

    this.musicState.intensity = battleIntensity;
  }

  private transitionMusic(newState: MusicState['state']): void {
    const musicTracks: Record<string, string> = {
      calm: 'music_calm',
      tension: 'music_tension',
      battle: 'music_battle',
      victory: 'music_victory',
      defeat: 'music_defeat',
    };

    const nextTrack = musicTracks[newState];
    if (nextTrack && nextTrack !== this.musicState.current) {
      this.crossfadeMusic(nextTrack, this.musicState.crossfadeDuration);
    }
  }

  crossfadeMusic(newTrackId: string, duration: number = 3): void {
    // Fade out current music
    if (this.musicState.current) {
      const currentInstances = Array.from(this.instances.values())
        .filter(i => this.tracks.get(i.trackId)?.category === 'music');

      for (const instance of currentInstances) {
        this.fadeTo(instance.id, 0, duration);
        setTimeout(() => this.stop(instance.id), duration * 1000);
      }
    }

    // Start new music
    const newInstanceId = this.play(newTrackId, 0, true);
    if (newInstanceId) {
      this.fadeTo(newInstanceId, 1, duration);
      this.musicState.current = newTrackId;
    }
  }

  // === Update Loop ===

  update(deltaTime: number): void {
    // Update 3D audio positions for moving sounds
    // Clean up finished instances
    for (const [instanceId, instance] of this.instances) {
      if (!instance.playing && instance.pauseTime === 0) {
        this.instances.delete(instanceId);
      }
    }
  }

  // === Cleanup ===

  destroy(): void {
    this.stopAll();
    if (this.context) {
      this.context.close();
    }
  }
}

// ============================================================================
// Sound Effect Bank
// ============================================================================

export const SFX_CATEGORIES = {
  combat: {
    sword_clash: 'sfx_sword_clash',
    sword_hit: 'sfx_sword_hit',
    arrow_fire: 'sfx_arrow_fire',
    arrow_hit: 'sfx_arrow_hit',
    charge: 'sfx_charge',
    death_male: 'sfx_death_male',
    death_female: 'sfx_death_female',
  },
  ui: {
    click: 'sfx_click',
    select: 'sfx_select',
    order: 'sfx_order',
    alert: 'sfx_alert',
    victory: 'sfx_victory',
    defeat: 'sfx_defeat',
  },
  ambient: {
    battle_ambient: 'sfx_battle_ambient',
    wind: 'sfx_wind',
    rain: 'sfx_rain',
    thunder: 'sfx_thunder',
    crowd: 'sfx_crowd',
  },
  units: {
    march: 'sfx_march',
    horse_gallop: 'sfx_horse_gallop',
    siege_fire: 'sfx_siege_fire',
    siege_hit: 'sfx_siege_hit',
  },
  zombies: {
    groan: 'sfx_zombie_groan',
    scream: 'sfx_zombie_scream',
    bite: 'sfx_zombie_bite',
    horde: 'sfx_zombie_horde',
  },
};

export default AudioSystem;
