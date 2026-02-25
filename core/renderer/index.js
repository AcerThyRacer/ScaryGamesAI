/**
 * Renderer Systems Module - Phase 1 + Enhancement
 * Next-generation WebGPU rendering with advanced features
 */

// Original Phase 1 systems
export { WebGPURenderer } from './WebGPURenderer2026.js';

// Phase 1 Enhancement systems
export { WebGPURayTracing } from './WebGPURayTracing.js';
export { DLSSRenderer } from './DLSSRenderer.js';
export { ProceduralMaterialSystem } from './ProceduralMaterials.js';
export { GPUAnimationSystem } from './GPUAnimationSystem.js';

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
  WebGPURenderer,
  WebGPURayTracing,
  DLSSRenderer,
  ProceduralMaterialSystem,
  GPUAnimationSystem,
  createEnhancedRenderer
};
