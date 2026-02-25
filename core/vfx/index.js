/**
 * VFX Module - Phase 9
 */
export { RayMarchingRenderer } from './RayMarchingRenderer.js';
export { PostProcessingPipeline } from './PostProcessing.js';

export function createVFXSystem(canvas, options = {}) {
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  const raymarcher = options.raymarching ? new RayMarchingRenderer(canvas, options.raymarching) : null;
  const postProcess = options.postProcessing ? new PostProcessingPipeline(gl, options.postProcessing) : null;
  
  return {
    raymarcher,
    postProcess,
    
    render(time, sceneTexture, depthTexture, normalTexture, camera) {
      if (raymarcher) {
        raymarcher.setCamera(camera.position, camera.direction);
        raymarcher.render(time);
      }
      
      if (postProcess && sceneTexture) {
        postProcess.render(sceneTexture, depthTexture, normalTexture, time);
      }
    },
    
    resize(width, height) {
      if (raymarcher) raymarcher.resize(width, height);
      if (postProcess) postProcess.resize(width, height);
    },
    
    destroy() {
      if (raymarcher) raymarcher.destroy();
      if (postProcess) postProcess.destroy();
    }
  };
}

export default { RayMarchingRenderer, PostProcessingPipeline, createVFXSystem };
