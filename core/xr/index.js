/**
 * XR Module - Phase 8
 */
export { WebXRSystem, GestureRecognizer, ARPassthrough } from './WebXRSystem.js';

export function createXRSystem(options = {}) {
  const xr = new WebXRSystem(options);
  const gestures = new GestureRecognizer();
  const arCamera = options.arMode ? new ARPassthrough(options.videoElement) : null;
  
  return {
    xr,
    gestures,
    arCamera,
    
    async enterVR(canvas) {
      return await xr.enterXR(canvas, { mode: 'immersive-vr' });
    },
    
    async enterAR(canvas) {
      if (arCamera) {
        await arCamera.start();
      }
      return await xr.enterXR(canvas, { mode: 'immersive-ar' });
    },
    
    async exit() {
      await xr.exitXR();
      if (arCamera) {
        arCamera.stop();
      }
    },
    
    onFrame(callback) {
      xr.onFrame((data) => {
        // Recognize gestures
        if (data.hands.left) {
          data.leftGestures = gestures.recognize(data.hands.left);
        }
        if (data.hands.right) {
          data.rightGestures = gestures.recognize(data.hands.right);
        }
        callback(data);
      });
    }
  };
}

export default { WebXRSystem, GestureRecognizer, ARPassthrough, createXRSystem };
