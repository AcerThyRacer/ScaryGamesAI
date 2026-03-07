/**
 * Renderer Systems Module — 2026 Overhaul
 * Complete next-generation WebGPU rendering stack
 */

// Core renderers
export { WebGPURenderer } from './WebGPURenderer2026.js';
export { WebGPURayTracing } from './WebGPURayTracing.js';
export { DLSSRenderer } from './DLSSRenderer.js';

// 2026 Path Tracing & GI
export { PathTracer2026 } from './PathTracer2026.js';
export { NeuralDenoiser2026 } from './NeuralDenoiser2026.js';
export { RadianceCascades2026 } from './RadianceCascades2026.js';
export { EmissivePropagation2026 } from './EmissivePropagation2026.js';

// Materials & Geometry
export { MaterialSystem2026 } from './MaterialSystem2026.js';
export { ProceduralMaterialSystem } from './ProceduralMaterials.js';
export { TessellationEngine2026 } from './TessellationEngine2026.js';
export { VirtualGeometry2026 } from './VirtualGeometry2026.js';

// Lighting & Atmosphere
export { AreaLightSystem2026 } from './AreaLightSystem2026.js';
export { AtmosphericRenderer2026 } from './AtmosphericRenderer2026.js';
export { HDRPipeline2026 } from './HDRPipeline2026.js';
export { VolumetricPathTracer2026 } from './VolumetricPathTracer2026.js';

// Animation & Particles
export { GPUAnimationSystem } from './GPUAnimationSystem.js';
export { GPUParticleSystem } from './GPUParticleSystem.js';

// Upscaling & Performance
export { TSR2026 } from './TSR2026.js';
export { VariableRateShading2026 } from './VariableRateShading2026.js';
export { RenderGraph2026 } from './RenderGraph2026.js';

// GPU Pipeline & Memory
export { GPUDrivenPipeline2026 } from './GPUDrivenPipeline2026.js';
export { AsyncComputePipeline2026 } from './AsyncComputePipeline2026.js';
export { MemoryManager2026 } from './MemoryManager2026.js';
export { VirtualTexture2026 } from './VirtualTexture2026.js';
export { MobileWebGPU2026 } from './MobileWebGPU2026.js';

// Horror-Specific Effects
export { PsychologicalHorrorShaders2026 } from './PsychologicalHorrorShaders2026.js';
export { FourthWallBreaker2026 } from './FourthWallBreaker2026.js';
export { AudioReactiveVisuals2026 } from './AudioReactiveVisuals2026.js';
export { HapticVisualFeedback2026 } from './HapticVisualFeedback2026.js';
export { BiometricRenderer2026 } from './BiometricRenderer2026.js';

// Mega-Features
export { HorrorReplaySystem2026 } from './HorrorReplaySystem2026.js';
export { CrossGameCorruption2026 } from './CrossGameCorruption2026.js';
export { DynamicDestruction2026 } from './DynamicDestruction2026.js';
export { ProceduralHorrorArt2026 } from './ProceduralHorrorArt2026.js';

/**
 * Create a complete enhanced renderer
 * @param {Object} canvas - Canvas element
 * @param {Object} options - Renderer configuration
 * @returns {Object} Enhanced renderer systems
 */
export async function createEnhancedRenderer(canvas, options = {}) {
  const baseRenderer = new WebGPURenderer(canvas, options);
  await baseRenderer.initialize();

  const enhancements = {
    rayTracing: null,
    dlss: null,
    materials: null,
    animation: null
  };

  if (options.enableRayTracing) {
    enhancements.rayTracing = new WebGPURayTracing(baseRenderer.device, options.rayTracing);
    await enhancements.rayTracing.initialize();
  }

  if (options.enableDLSS) {
    enhancements.dlss = new DLSSRenderer(baseRenderer.device, options.dlss);
    await enhancements.dlss.initialize();
  }

  if (options.enableProceduralMaterials) {
    enhancements.materials = new ProceduralMaterialSystem(baseRenderer.device, options.materials);
    await enhancements.materials.initialize();
  }

  if (options.enableGPUAnimation) {
    enhancements.animation = new GPUAnimationSystem(baseRenderer.device, options.animation);
    await enhancements.animation.initialize();
  }

  return {
    base: baseRenderer,
    ...enhancements,

    render(scene, camera) {
      // Base render pass
      baseRenderer.render(scene, camera);

      // Ray tracing pass (if enabled)
      if (enhancements.rayTracing) {
        // enhancements.rayTracing.render(...)
      }

      // DLSS upscale (if enabled)
      if (enhancements.dlss) {
        // enhancements.dlss.render(...)
      }
    },

    getStats() {
      return {
        base: baseRenderer.getStats(),
        rayTracing: enhancements.rayTracing?.getStats(),
        dlss: enhancements.dlss?.getStats(),
        materials: enhancements.materials?.getStats(),
        animation: enhancements.animation?.getStats()
      };
    }
  };
}

export default {
  // Core
  WebGPURenderer, WebGPURayTracing, DLSSRenderer,
  // 2026 Path Tracing & GI
  PathTracer2026, NeuralDenoiser2026, RadianceCascades2026, EmissivePropagation2026,
  // Materials & Geometry
  MaterialSystem2026, ProceduralMaterialSystem, TessellationEngine2026, VirtualGeometry2026,
  // Lighting & Atmosphere
  AreaLightSystem2026, AtmosphericRenderer2026, HDRPipeline2026, VolumetricPathTracer2026,
  // Animation & Particles
  GPUAnimationSystem, GPUParticleSystem,
  // Upscaling & Performance
  TSR2026, VariableRateShading2026, RenderGraph2026,
  // GPU Pipeline & Memory
  GPUDrivenPipeline2026, AsyncComputePipeline2026, MemoryManager2026,
  VirtualTexture2026, MobileWebGPU2026,
  // Horror Effects
  PsychologicalHorrorShaders2026, FourthWallBreaker2026,
  AudioReactiveVisuals2026, HapticVisualFeedback2026, BiometricRenderer2026,
  // Mega-Features
  HorrorReplaySystem2026, CrossGameCorruption2026, DynamicDestruction2026,
  ProceduralHorrorArt2026,
  // Factory
  createEnhancedRenderer
};
