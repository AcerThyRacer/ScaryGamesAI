/**
 * Core Module Exports - Phase 1, 2 & 3: Engine + Audio + PCG
 * Universal core library for all 10 horror games
 */

// Renderer (Phase 1)
export { WebGPURenderer } from './renderer/WebGPURenderer.js';
export { GPUParticleSystem } from './renderer/GPUParticleSystem.js';

// Audio (Phase 2)
export { AudioManager, getAudioManager } from './audio/AudioManager.js';
export { ProceduralAudioEngine } from './audio/ProceduralAudioEngine.js';
export { SpatialAudio3D } from './audio/SpatialAudio3D.js';
export { VoiceSynthesis } from './audio/VoiceSynthesis.js';
export { DynamicMusicSystem } from './audio/DynamicMusicSystem.js';
export { AudioVisualizer } from './audio/AudioVisualizer.js';

// Procedural Generation (Phase 3)
export { 
  WaveFunctionCollapse, 
  RoomGenerator, 
  ItemSpawner, 
  TextureSynthesizer, 
  LightingPlacer,
  generateLevel
} from './procedural/index.js';

// AI Systems (Phase 4)
export * from './ai/index.js';

// Physics Systems (Phase 5)
export * from './physics/index.js';

// Narrative Systems (Phase 6)
export * from './narrative/index.js';

// Multiplayer Systems (Phase 7)
export * from './multiplayer/index.js';

// XR Systems (Phase 8)
export * from './xr/index.js';

// VFX Systems (Phase 9)
export * from './vfx/index.js';

// Accessibility (Phase 10)
export * from './accessibility/index.js';

// Utilities (Phase 1)
export { ObjectPool, ParticlePool, EntityPool } from './utils/ObjectPool.js';
export { DIContainer, inject, singleton, service, registerModule } from './utils/DependencyInjector.js';
export { AssetPipeline } from './utils/AssetPipeline.js';

/**
 * Initialize core systems for a game
 * @param {HTMLCanvasElement} canvas - Game canvas
 * @param {Object} options - Initialization options
 * @returns {Promise<Object>} Initialized core systems
 */
export async function initCore(canvas, options = {}) {
  const renderer = new WebGPURenderer(canvas, options.renderer);
  const webgpuSupported = await renderer.initialize();
  
  const systems = {
    renderer,
    webgpuSupported,
    assetPipeline: new AssetPipeline(),
    diContainer: new DIContainer(),
    audioManager: null
  };

  // Register core services
  systems.diContainer
    .singleton('renderer', () => renderer)
    .singleton('assetPipeline', () => systems.assetPipeline)
    .singleton('diContainer', () => systems.diContainer);

  // Add GPU device to window for asset pipeline
  if (webgpuSupported && renderer.device) {
    window.gpuDevice = renderer.device;
    
    // Initialize particle system if requested
    if (options.particles) {
      const particleSystem = new GPUParticleSystem(renderer, options.particles.maxParticles || 10000);
      await particleSystem.initialize();
      systems.particleSystem = particleSystem;
      systems.diContainer.singleton('particleSystem', () => particleSystem);
    }
  }

  // Initialize audio manager if requested
  if (options.audio !== false) {
    try {
      const audioManager = new AudioManager();
      await audioManager.initialize({
        gameId: options.gameId,
        sampleRate: options.audio?.sampleRate || 44100
      });
      systems.audioManager = audioManager;
      systems.diContainer.singleton('audioManager', () => audioManager);
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  }

  return systems;
}

/**
 * Create a game module with dependency injection
 * @param {Function} gameFactory - Factory function that creates the game
 * @param {DIContainer} container - DI container
 * @returns {Object} Game instance
 */
export function createGameModule(gameFactory, container) {
  return gameFactory(container);
}

export default {
  initCore,
  createGameModule,
  WebGPURenderer,
  GPUParticleSystem,
  ObjectPool,
  ParticlePool,
  EntityPool,
  DIContainer,
  AssetPipeline
};
