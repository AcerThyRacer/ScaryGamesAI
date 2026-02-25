/**
 * WebXR VR/AR System - Phase 8: Immersive Reality
 * Complete VR/AR support with hand tracking, gestures, and haptics
 */

export class WebXRSystem {
  constructor(options = {}) {
    this.xrSupported = 'xr' in navigator;
    this.session = null;
    this.referenceSpace = null;
    this.viewerSpace = null;
    this.mode = options.mode || 'immersive-vr'; // immersive-vr, immersive-ar, inline
    this.features = options.features || ['local-floor', 'hand-tracking'];
    this.onFrameCallback = null;
    this.controllers = [];
    this.hands = { left: null, right: null };
    this.hitTestSource = null;
    this.domOverlay = options.domOverlay || null;
    this.optionalFeatures = options.optionalFeatures || ['anchors', 'hit-test'];
    this.requiredFeatures = options.requiredFeatures || [];
  }

  /**
   * Check if mode is supported
   */
  async isModeSupported(mode) {
    if (!this.xrSupported) return false;
    
    try {
      const supported = await navigator.xr.isSessionSupported(mode);
      return supported;
    } catch (e) {
      return false;
    }
  }

  /**
   * Enter XR mode
   */
  async enterXR(canvas, options = {}) {
    if (!this.xrSupported) {
      throw new Error('WebXR not supported');
    }

    const mode = options.mode || this.mode;
    const supported = await this.isModeSupported(mode);
    
    if (!supported) {
      throw new Error(`${mode} not supported`);
    }

    const sessionInit = {
      optionalFeatures: this.optionalFeatures,
      requiredFeatures: this.requiredFeatures.filter(f => f !== 'hand-tracking')
    };

    if (this.domOverlay) {
      sessionInit.domOverlay = { root: this.domOverlay };
    }

    if (options.mode === 'immersive-ar' && this.features.includes('hit-test')) {
      sessionInit.requiredFeatures = [...(sessionInit.requiredFeatures || []), 'hit-test'];
    }

    try {
      this.session = await navigator.xr.requestSession(mode, sessionInit);
      
      // Setup session events
      this.session.addEventListener('end', () => this.onXREnd());
      this.session.addEventListener('select', (e) => this.onSelect(e));
      this.session.addEventListener('squeeze', (e) => this.onSqueeze(e));
      
      // Setup hand tracking if requested
      if (this.features.includes('hand-tracking')) {
        await this.setupHandTracking();
      }

      // Setup reference space
      const spaceType = this.features.includes('local-floor') ? 'local-floor' : 'local';
      this.referenceSpace = await this.session.requestReferenceSpace(spaceType);
      this.viewerSpace = await this.session.requestReferenceSpace('viewer');

      // Setup WebGL context
      const gl = canvas.getContext('webgl2', { xrCompatible: true });
      
      // Start render loop
      this.gl = gl;
      this.canvas = canvas;
      this.session.updateRenderState({ baseLayer: new XRWebGLLayer(this.session, gl) });
      
      this.session.requestAnimationFrame((time, frame) => this.onXRFrame(time, frame));

      return { session: this.session, mode };
    } catch (error) {
      console.error('Failed to enter XR:', error);
      throw error;
    }
  }

  /**
   * Setup hand tracking
   */
  async setupHandTracking() {
    if (!this.session) return;

    try {
      const inputSources = await this.session.requestHandTracking();
      
      inputSources.forEach(source => {
        if (source.handedness === 'left') {
          this.hands.left = source;
        } else if (source.handedness === 'right') {
          this.hands.right = source;
        }
      });

      console.log('Hand tracking enabled');
    } catch (e) {
      console.warn('Hand tracking not available:', e);
    }
  }

  /**
   * XR frame callback
   */
  onXRFrame(time, frame) {
    if (!this.session) return;

    const pose = frame.getViewerPose(this.referenceSpace);
    const glLayer = this.session.renderState.baseLayer;

    if (pose) {
      // Begin WebGL render
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, glLayer.framebuffer);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      // Render for each eye
      for (const view of pose.views) {
        const viewport = glLayer.getViewport(view);
        
        // Setup view matrix
        const projectionMatrix = view.projectionMatrix;
        const viewMatrix = view.transform.inverse.matrix;

        // Call user's render callback
        if (this.onFrameCallback) {
          this.onFrameCallback({
            time,
            frame,
            view,
            viewport,
            projectionMatrix,
            viewMatrix,
            pose,
            hands: this.hands,
            controllers: this.controllers
          });
        }
      }
    }

    // Request next frame
    this.session.requestAnimationFrame((t, f) => this.onXRFrame(t, f));
  }

  /**
   * Controller select event
   */
  onSelect(event) {
    console.log('XR Select', event.inputSource);
    this.triggerHapticFeedback(event.inputSource, 'select');
  }

  /**
   * Controller squeeze event
   */
  onSqueeze(event) {
    console.log('XR Squeeze', event.inputSource);
    this.triggerHapticFeedback(event.inputSource, 'squeeze');
  }

  /**
   * XR session end
   */
  onXREnd() {
    console.log('XR Session ended');
    this.session = null;
    this.hands = { left: null, right: null };
  }

  /**
   * Trigger haptic feedback
   */
  triggerHapticFeedback(inputSource, type, duration = 50) {
    if (inputSource && inputSource.gamepad) {
      const actuator = inputSource.gamepad.hapticActuators?.[0];
      if (actuator) {
        actuator.pulse(0.5, duration);
      }
    }
  }

  /**
   * Perform hit test (AR)
   */
  async performHitTest(frame, x, y) {
    if (!this.hitTestSource) {
      this.hitTestSource = await this.session.requestHitTestSource({ space: this.viewerSpace });
    }

    const results = frame.getHitTestResults(this.hitTestSource);
    
    if (results.length > 0) {
      const hit = results[0];
      const pose = hit.getPose(this.referenceSpace);
      
      return {
        position: pose.transform.position,
        orientation: pose.transform.orientation,
        matrix: pose.transform.matrix
      };
    }

    return null;
  }

  /**
   * Create anchor at position
   */
  async createAnchor(position, orientation) {
    if (!this.session) return null;

    try {
      const anchor = await this.session.createAnchor({
        position: position,
        orientation: orientation
      }, this.referenceSpace);
      
      return anchor;
    } catch (e) {
      console.warn('Anchors not supported');
      return null;
    }
  }

  /**
   * Set frame callback
   */
  onFrame(callback) {
    this.onFrameCallback = callback;
  }

  /**
   * Exit XR mode
   */
  async exitXR() {
    if (this.session) {
      await this.session.end();
      this.session = null;
    }
  }

  /**
   * Get XR state
   */
  getState() {
    return {
      supported: this.xrSupported,
      inSession: !!this.session,
      mode: this.mode,
      handsTracked: !!(this.hands.left || this.hands.right),
      controllers: this.controllers.length
    };
  }
}

/**
 * Hand Gesture Recognition
 */
export class GestureRecognizer {
  constructor() {
    this.gestures = new Map();
    this.registerDefaultGestures();
  }

  registerDefaultGestures() {
    // Pinch gesture
    this.registerGesture('pinch', (hand) => {
      const thumbTip = hand.joints[4];
      const indexTip = hand.joints[8];
      
      if (!thumbTip || !indexTip) return false;
      
      const distance = Math.sqrt(
        Math.pow(thumbTip.position.x - indexTip.position.x, 2) +
        Math.pow(thumbTip.position.y - indexTip.position.y, 2) +
        Math.pow(thumbTip.position.z - indexTip.position.z, 2)
      );
      
      return distance < 0.02;
    });

    // Point gesture
    this.registerGesture('point', (hand) => {
      const indexTip = hand.joints[8];
      const indexPip = hand.joints[6];
      const middleTip = hand.joints[12];
      
      if (!indexTip || !indexPip || !middleTip) return false;
      
      // Index finger extended
      const indexExtended = indexTip.position.z < indexPip.position.z;
      
      // Other fingers curled
      const othersCurled = middleTip.position.z > indexPip.position.z;
      
      return indexExtended && othersCurled;
    });

    // Fist gesture
    this.registerGesture('fist', (hand) => {
      const fingertips = [4, 8, 12, 16, 20];
      const fingerPips = [3, 6, 11, 15, 19];
      
      for (let i = 0; i < 5; i++) {
        const tip = hand.joints[fingertips[i]];
        const pip = hand.joints[fingerPips[i]];
        
        if (!tip || !pip) return false;
        if (tip.position.z < pip.position.z) return false;
      }
      
      return true;
    });

    // Open palm gesture
    this.registerGesture('open', (hand) => {
      const wrist = hand.joints[0];
      const fingertips = [4, 8, 12, 16, 20];
      
      for (const idx of fingertips) {
        const tip = hand.joints[idx];
        if (!tip || tip.position.z > wrist.position.z) return false;
      }
      
      return true;
    });

    // Thumbs up
    this.registerGesture('thumbsup', (hand) => {
      const thumbTip = hand.joints[4];
      const thumbIp = hand.joints[3];
      const indexTip = hand.joints[8];
      
      if (!thumbTip || !thumbIp || !indexTip) return false;
      
      const thumbUp = thumbTip.position.y > thumbIp.position.y;
      const indexCurled = indexTip.position.z > hand.joints[0].position.z;
      
      return thumbUp && indexCurled;
    });

    // Peace sign
    this.registerGesture('peace', (hand) => {
      const indexTip = hand.joints[8];
      const middleTip = hand.joints[12];
      const ringTip = hand.joints[16];
      const indexPip = hand.joints[6];
      
      if (!indexTip || !middleTip || !ringTip || !indexPip) return false;
      
      const twoFingersUp = indexTip.position.z < indexPip.position.z &&
                          middleTip.position.z < indexPip.position.z;
      const ringDown = ringTip.position.z > indexPip.position.z;
      
      return twoFingersUp && ringDown;
    });
  }

  registerGesture(name, detector) {
    this.gestures.set(name, detector);
  }

  recognize(hand) {
    const recognized = [];
    
    for (const [name, detector] of this.gestures.entries()) {
      if (detector(hand)) {
        recognized.push(name);
      }
    }
    
    return recognized;
  }

  getDominantGesture(recognized) {
    if (recognized.length === 0) return null;
    
    // Priority order
    const priority = ['pinch', 'point', 'fist', 'open', 'thumbsup', 'peace'];
    
    for (const gesture of priority) {
      if (recognized.includes(gesture)) {
        return gesture;
      }
    }
    
    return recognized[0];
  }
}

/**
 * AR Passthrough Camera
 */
export class ARPassthrough {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.texture = null;
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      this.video.srcObject = this.stream;
      await this.video.play();
      
      return true;
    } catch (e) {
      console.error('Failed to start camera:', e);
      return false;
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  createTexture(gl) {
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    return this.texture;
  }

  updateTexture(gl) {
    if (!this.texture || !this.video.readyState) return;
    
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
  }
}

export default { WebXRSystem, GestureRecognizer, ARPassthrough };
