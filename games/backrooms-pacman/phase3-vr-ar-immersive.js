/**
 * BACKROOMS PACMAN - PHASE 3: VR/AR & IMMERSIVE TECHNOLOGIES
 * Full VR support, AR mode, spatial audio, haptic feedback, eye tracking
 */

(function() {
    'use strict';

    // ============================================
    // PHASE 3.1: FULL VR SUPPORT
    // ============================================
    
    const VRSystem = {
        xrSession: null,
        xrReferenceSpace: null,
        renderer: null,
        camera: null,
        
        // VR state
        isVRActive: false,
        isPresenting: false,
        
        // Controllers
        controllers: [],
        controllerGrips: [],
        
        // VR settings
        settings: {
            movementMode: 'smooth', // smooth, teleport
            turnMode: 'smooth', // smooth, snap
            snapAngle: 45,
            comfortVignette: true,
            heightOffset: 1.6
        },
        
        // Hand tracking
        handTracking: {
            enabled: false,
            joints: [],
            gestures: {}
        },
        
        async init(renderer, camera) {
            this.renderer = renderer;
            this.camera = camera;
            
            if (!navigator.xr) {
                console.warn('[Phase 3] WebXR not supported');
                return false;
            }
            
            const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
            if (!isSupported) {
                console.warn('[Phase 3] VR not supported on this device');
                return false;
            }
            
            this.setupVRButton();
            console.log('[Phase 3] VR system initialized');
            return true;
        },
        
        setupVRButton() {
            const button = document.createElement('button');
            button.id = 'vr-button';
            button.textContent = 'ENTER VR';
            button.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 15px 30px;
                background: #00ff88;
                color: #000;
                border: none;
                border-radius: 5px;
                font-weight: bold;
                cursor: pointer;
                z-index: 10000;
            `;
            
            button.addEventListener('click', () => this.enterVR());
            document.body.appendChild(button);
        },
        
        async enterVR() {
            try {
                this.xrSession = await navigator.xr.requestSession('immersive-vr', {
                    requiredFeatures: ['local-floor'],
                    optionalFeatures: ['hand-tracking', 'layers']
                });
                
                this.renderer.xr.enabled = true;
                this.renderer.xr.setSession(this.xrSession);
                
                this.xrReferenceSpace = await this.xrSession.requestReferenceSpace('local-floor');
                
                // Setup controllers
                this.setupControllers();
                
                // Setup hand tracking if available
                if (this.xrSession.supportedFeatures.includes('hand-tracking')) {
                    this.setupHandTracking();
                }
                
                this.isVRActive = true;
                this.isPresenting = true;
                
                // Update button
                const button = document.getElementById('vr-button');
                if (button) {
                    button.textContent = 'EXIT VR';
                    button.onclick = () => this.exitVR();
                }
                
                // Enter VR UI
                this.showVRUI();
                
                console.log('[Phase 3] Entered VR mode');
                
            } catch (error) {
                console.error('[Phase 3] Failed to enter VR:', error);
            }
        },
        
        exitVR() {
            if (this.xrSession) {
                this.xrSession.end();
                this.xrSession = null;
            }
            
            this.renderer.xr.enabled = false;
            this.isVRActive = false;
            this.isPresenting = false;
            
            // Update button
            const button = document.getElementById('vr-button');
            if (button) {
                button.textContent = 'ENTER VR';
                button.onclick = () => this.enterVR();
            }
            
            this.hideVRUI();
            
            console.log('[Phase 3] Exited VR mode');
        },
        
        setupControllers() {
            // Setup VR controllers
            for (let i = 0; i < 2; i++) {
                const controller = this.renderer.xr.getController(i);
                const grip = this.renderer.xr.getControllerGrip(i);
                
                // Add controller models
                const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.2);
                const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
                const mesh = new THREE.Mesh(geometry, material);
                
                grip.add(mesh);
                
                // Add flashlight to dominant hand
                if (i === 0) {
                    this.setupVRFlashlight(grip);
                }
                
                controller.addEventListener('selectstart', () => this.onControllerSelectStart(i));
                controller.addEventListener('selectend', () => this.onControllerSelectEnd(i));
                controller.addEventListener('squeezestart', () => this.onControllerSqueezeStart(i));
                controller.addEventListener('squeezeend', () => this.onControllerSqueezeEnd(i));
                
                this.controllers.push(controller);
                this.controllerGrips.push(grip);
            }
        },
        
        setupVRFlashlight(grip) {
            // VR flashlight
            const flashlight = new THREE.SpotLight(0xffffff, 2, 20, Math.PI / 4, 0.5, 1);
            flashlight.position.set(0, 0, -0.1);
            flashlight.target.position.set(0, 0, -1);
            
            grip.add(flashlight);
            grip.add(flashlight.target);
            
            // Flashlight mesh
            const geometry = new THREE.CylinderGeometry(0.03, 0.04, 0.15, 16);
            const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = Math.PI / 2;
            mesh.position.z = -0.1;
            
            grip.add(mesh);
            
            this.vrFlashlight = flashlight;
        },
        
        setupHandTracking() {
            this.handTracking.enabled = true;
            
            // Setup hand tracking
            this.xrSession.requestAnimationFrame((time, frame) => {
                this.updateHandTracking(frame);
            });
        },
        
        updateHandTracking(frame) {
            if (!this.handTracking.enabled) return;
            
            const session = frame.session;
            
            for (const inputSource of session.inputSources) {
                if (inputSource.hand) {
                    const hand = inputSource.hand;
                    
                    // Get joint poses
                    const referenceSpace = this.xrReferenceSpace;
                    
                    for (const joint of hand.values()) {
                        const pose = frame.getJointPose(joint, referenceSpace);
                        if (pose) {
                            // Process hand joint data
                            this.processHandJoint(joint, pose);
                        }
                    }
                    
                    // Detect gestures
                    this.detectHandGestures(hand, frame, referenceSpace);
                }
            }
        },
        
        processHandJoint(joint, pose) {
            // Store joint data for gesture recognition
            if (!this.handTracking.joints[joint.jointName]) {
                this.handTracking.joints[joint.jointName] = [];
            }
            
            this.handTracking.joints[joint.jointName].push({
                position: pose.transform.position,
                orientation: pose.transform.orientation,
                timestamp: Date.now()
            });
            
            // Keep only recent data
            if (this.handTracking.joints[joint.jointName].length > 30) {
                this.handTracking.joints[joint.jointName].shift();
            }
        },
        
        detectHandGestures(hand, frame, referenceSpace) {
            // Detect common gestures
            const gestures = {
                POINTING: false,
                GRABBING: false,
                OPEN_PALM: false,
                THUMBS_UP: false
            };
            
            // Check for pointing gesture
            const indexTip = hand.get('index-finger-tip');
            const indexBase = hand.get('index-finger-metacarpal');
            const middleTip = hand.get('middle-finger-tip');
            
            if (indexTip && indexBase && middleTip) {
                const indexTipPose = frame.getJointPose(indexTip, referenceSpace);
                const indexBasePose = frame.getJointPose(indexBase, referenceSpace);
                const middleTipPose = frame.getJointPose(middleTip, referenceSpace);
                
                if (indexTipPose && indexBasePose && middleTipPose) {
                    // Check if index is extended and others are curled
                    const indexExtended = this.isFingerExtended(indexTipPose, indexBasePose);
                    const middleCurled = !this.isFingerExtended(middleTipPose, indexBasePose);
                    
                    gestures.POINTING = indexExtended && middleCurled;
                }
            }
            
            // Check for grab gesture
            const thumbTip = hand.get('thumb-tip');
            const pinkyTip = hand.get('pinky-tip');
            
            if (thumbTip && pinkyTip) {
                const thumbTipPose = frame.getJointPose(thumbTip, referenceSpace);
                const pinkyTipPose = frame.getJointPose(pinkyTip, referenceSpace);
                
                if (thumbTipPose && pinkyTipPose) {
                    const distance = this.getDistance(
                        thumbTipPose.transform.position,
                        pinkyTipPose.transform.position
                    );
                    
                    gestures.GRABBING = distance < 0.05;
                }
            }
            
            this.handTracking.gestures = gestures;
            
            // Trigger actions based on gestures
            if (gestures.POINTING) {
                this.onPointingGesture(hand.handedness);
            }
            
            if (gestures.GRABBING) {
                this.onGrabbingGesture(hand.handedness);
            }
        },
        
        isFingerExtended(tipPose, basePose) {
            const dx = tipPose.transform.position.x - basePose.transform.position.x;
            const dy = tipPose.transform.position.y - basePose.transform.position.y;
            const dz = tipPose.transform.position.z - basePose.transform.position.z;
            
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            return distance > 0.05;
        },
        
        getDistance(pos1, pos2) {
            const dx = pos1.x - pos2.x;
            const dy = pos1.y - pos2.y;
            const dz = pos1.z - pos2.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        },
        
        onPointingGesture(hand) {
            // Pointing gesture - could be used for UI interaction or aiming
            console.log(`[Phase 3] Pointing detected on ${hand} hand`);
        },
        
        onGrabbingGesture(hand) {
            // Grabbing gesture - could be used for picking up items
            console.log(`[Phase 3] Grabbing detected on ${hand} hand`);
        },
        
        onControllerSelectStart(index) {
            console.log(`[Phase 3] Controller ${index} select start`);
            // Trigger flashlight or interact
        },
        
        onControllerSelectEnd(index) {
            console.log(`[Phase 3] Controller ${index} select end`);
        },
        
        onControllerSqueezeStart(index) {
            console.log(`[Phase 3] Controller ${index} squeeze start`);
            // Grab item
        },
        
        onControllerSqueezeEnd(index) {
            console.log(`[Phase 3] Controller ${index} squeeze end`);
        },
        
        showVRUI() {
            // Create VR-optimized UI
            const vrUI = document.createElement('div');
            vrUI.id = 'vr-ui';
            vrUI.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 10001;
            `;
            
            // Health bar
            const healthBar = document.createElement('div');
            healthBar.id = 'vr-health';
            healthBar.style.cssText = `
                position: absolute;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                width: 200px;
                height: 20px;
                background: rgba(255, 0, 0, 0.3);
                border: 2px solid #ff0000;
                border-radius: 10px;
            `;
            
            const healthFill = document.createElement('div');
            healthFill.id = 'vr-health-fill';
            healthFill.style.cssText = `
                width: 100%;
                height: 100%;
                background: #ff0000;
                border-radius: 8px;
                transition: width 0.3s;
            `;
            
            healthBar.appendChild(healthFill);
            vrUI.appendChild(healthBar);
            
            // Pellet counter
            const pelletCounter = document.createElement('div');
            pelletCounter.id = 'vr-pellets';
            pelletCounter.style.cssText = `
                position: absolute;
                top: 100px;
                left: 50%;
                transform: translateX(-50%);
                color: #ffd700;
                font-size: 48px;
                font-weight: bold;
                text-shadow: 0 0 10px #ffd700;
            `;
            pelletCounter.textContent = '0';
            
            vrUI.appendChild(pelletCounter);
            
            document.body.appendChild(vrUI);
        },
        
        hideVRUI() {
            const vrUI = document.getElementById('vr-ui');
            if (vrUI) {
                vrUI.remove();
            }
        },
        
        updateVRUI(playerState) {
            const healthFill = document.getElementById('vr-health-fill');
            const pelletCounter = document.getElementById('vr-pellets');
            
            if (healthFill) {
                healthFill.style.width = `${playerState.health}%`;
            }
            
            if (pelletCounter) {
                pelletCounter.textContent = playerState.pelletsCollected || 0;
            }
        },
        
        update(dt, playerState) {
            if (!this.isVRActive) return;
            
            // Update VR UI
            this.updateVRUI(playerState);
            
            // Apply comfort vignette if enabled
            if (this.settings.comfortVignette && playerState.isMoving) {
                this.applyComfortVignette();
            }
        },
        
        applyComfortVignette() {
            // Reduce FOV during movement for comfort
            // This would be implemented in the render pipeline
        },
        
        // Get controller positions for gameplay
        getControllerPositions() {
            return this.controllers.map((controller, i) => ({
                index: i,
                position: controller.position.clone(),
                rotation: controller.rotation.clone()
            }));
        }
    };

    // ============================================
    // PHASE 3.2: AR MODE (BACKROOMS IN YOUR WORLD)
    // ============================================
    
    const ARSystem = {
        xrSession: null,
        xrReferenceSpace: null,
        renderer: null,
        scene: null,
        camera: null,
        
        isARActive: false,
        
        // Spatial mapping
        spatialMapping: {
            planes: [],
            meshes: [],
            anchors: []
        },
        
        // Hit test
        hitTestSource: null,
        
        async init(renderer, scene, camera) {
            this.renderer = renderer;
            this.scene = scene;
            this.camera = camera;
            
            if (!navigator.xr) {
                console.warn('[Phase 3] WebXR not supported');
                return false;
            }
            
            const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
            if (!isSupported) {
                console.warn('[Phase 3] AR not supported on this device');
                return false;
            }
            
            this.setupARButton();
            console.log('[Phase 3] AR system initialized');
            return true;
        },
        
        setupARButton() {
            const button = document.createElement('button');
            button.id = 'ar-button';
            button.textContent = 'ENTER AR';
            button.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                padding: 15px 30px;
                background: #0088ff;
                color: #fff;
                border: none;
                border-radius: 5px;
                font-weight: bold;
                cursor: pointer;
                z-index: 10000;
            `;
            
            button.addEventListener('click', () => this.enterAR());
            document.body.appendChild(button);
        },
        
        async enterAR() {
            try {
                this.xrSession = await navigator.xr.requestSession('immersive-ar', {
                    requiredFeatures: ['hit-test', 'dom-overlay'],
                    domOverlay: { root: document.body },
                    optionalFeatures: ['anchors', 'plane-detection']
                });
                
                this.renderer.xr.enabled = true;
                this.renderer.xr.setSession(this.xrSession);
                
                this.xrReferenceSpace = await this.xrSession.requestReferenceSpace('local-floor');
                
                // Setup hit test
                const viewerSpace = await this.xrSession.requestReferenceSpace('viewer');
                this.hitTestSource = await this.xrSession.requestHitTestSource({
                    space: viewerSpace
                });
                
                // Setup plane detection
                this.setupPlaneDetection();
                
                this.isARActive = true;
                
                // Update button
                const button = document.getElementById('ar-button');
                if (button) {
                    button.textContent = 'EXIT AR';
                    button.onclick = () => this.exitAR();
                }
                
                // Show AR instructions
                this.showARInstructions();
                
                console.log('[Phase 3] Entered AR mode');
                
            } catch (error) {
                console.error('[Phase 3] Failed to enter AR:', error);
            }
        },
        
        exitAR() {
            if (this.xrSession) {
                this.xrSession.end();
                this.xrSession = null;
            }
            
            this.renderer.xr.enabled = false;
            this.isARActive = false;
            
            // Update button
            const button = document.getElementById('ar-button');
            if (button) {
                button.textContent = 'ENTER AR';
                button.onclick = () => this.enterAR();
            }
            
            this.hideARInstructions();
            
            console.log('[Phase 3] Exited AR mode');
        },
        
        setupPlaneDetection() {
            // Listen for plane detection events
            this.xrSession.addEventListener('planes', (event) => {
                event.data.forEach(plane => {
                    this.processPlane(plane);
                });
            });
        },
        
        processPlane(plane) {
            // Create or update plane mesh
            let planeMesh = this.spatialMapping.planes.find(p => p.id === plane.planeSpace);
            
            if (!planeMesh) {
                // Create new plane mesh
                const geometry = new THREE.PlaneGeometry(1, 1);
                const material = new THREE.MeshBasicMaterial({
                    color: 0x00ff88,
                    transparent: true,
                    opacity: 0.3,
                    side: THREE.DoubleSide
                });
                
                planeMesh = new THREE.Mesh(geometry, material);
                planeMesh.id = plane.planeSpace;
                
                this.scene.add(planeMesh);
                this.spatialMapping.planes.push(planeMesh);
            }
            
            // Update plane transform
            const pose = plane.lastChangedTime;
            if (pose) {
                planeMesh.position.set(
                    pose.transform.position.x,
                    pose.transform.position.y,
                    pose.transform.position.z
                );
                planeMesh.quaternion.set(
                    pose.transform.orientation.x,
                    pose.transform.orientation.y,
                    pose.transform.orientation.z,
                    pose.transform.orientation.w
                );
                planeMesh.scale.set(plane.extent.width, plane.extent.height, 1);
            }
        },
        
        showARInstructions() {
            const instructions = document.createElement('div');
            instructions.id = 'ar-instructions';
            instructions.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: #fff;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                z-index: 10002;
            `;
            
            instructions.innerHTML = `
                <h2>AR Mode</h2>
                <p>Point your device at a flat surface</p>
                <p>Tap to place the Backrooms</p>
                <button id="ar-instructions-ok" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #00ff88;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">Got it</button>
            `;
            
            document.body.appendChild(instructions);
            
            document.getElementById('ar-instructions-ok').addEventListener('click', () => {
                instructions.remove();
            });
        },
        
        hideARInstructions() {
            const instructions = document.getElementById('ar-instructions');
            if (instructions) {
                instructions.remove();
            }
        },
        
        update(frame) {
            if (!this.isARActive || !frame) return;
            
            // Update hit test
            if (this.hitTestSource) {
                const hitTestResults = frame.getHitTestResults(this.hitTestSource);
                
                if (hitTestResults.length > 0) {
                    const hit = hitTestResults[0];
                    const pose = hit.getPose(this.xrReferenceSpace);
                    
                    if (pose) {
                        // Update placement cursor
                        this.updatePlacementCursor(pose.transform);
                    }
                }
            }
        },
        
        updatePlacementCursor(transform) {
            // Show placement cursor at hit position
            if (!this.placementCursor) {
                const geometry = new THREE.RingGeometry(0.1, 0.15, 32);
                const material = new THREE.MeshBasicMaterial({
                    color: 0x00ff88,
                    transparent: true,
                    opacity: 0.8
                });
                
                this.placementCursor = new THREE.Mesh(geometry, material);
                this.placementCursor.rotation.x = -Math.PI / 2;
                this.scene.add(this.placementCursor);
            }
            
            this.placementCursor.position.set(
                transform.position.x,
                transform.position.y,
                transform.position.z
            );
        },
        
        placeBackrooms(position) {
            // Place the backrooms maze at the given position
            console.log('[Phase 3] Placing Backrooms at:', position);
            
            // Create anchor
            this.xrSession.requestAnimationFrame(() => {
                this.xrSession.createAnchor({
                    position: position,
                    orientation: { x: 0, y: 0, z: 0, w: 1 }
                }, this.xrReferenceSpace).then(anchor => {
                    this.spatialMapping.anchors.push(anchor);
                    
                    // Place maze at anchor
                    this.onAnchorPlaced(anchor);
                });
            });
        },
        
        onAnchorPlaced(anchor) {
            // Callback when anchor is placed
            console.log('[Phase 3] Anchor placed');
        }
    };

    // ============================================
    // PHASE 3.3: SPATIAL AUDIO 3.0
    // ============================================
    
    const SpatialAudio = {
        audioContext: null,
        listener: null,
        sources: [],
        
        // HRTF data (simplified)
        hrtfData: null,
        
        // Reverb
        reverb: {
            convolver: null,
            impulseResponse: null
        },
        
        init() {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.listener = this.audioContext.listener;
                
                // Setup HRTF
                this.setupHRTF();
                
                // Setup reverb
                this.setupReverb();
                
                console.log('[Phase 3] Spatial audio initialized');
            } catch (error) {
                console.warn('[Phase 3] Audio context not supported:', error);
            }
        },
        
        setupHRTF() {
            // In a real implementation, this would load actual HRTF data
            // For now, we'll use the Web Audio API's built-in spatialization
            
            if (this.audioContext) {
                // Position the listener
                this.listener.positionX.value = 0;
                this.listener.positionY.value = 0;
                this.listener.positionZ.value = 0;
                
                this.listener.forwardX.value = 0;
                this.listener.forwardY.value = 0;
                this.listener.forwardZ.value = -1;
                
                this.listener.upX.value = 0;
                this.listener.upY.value = 1;
                this.listener.upZ.value = 0;
            }
        },
        
        setupReverb() {
            if (!this.audioContext) return;
            
            // Create convolver for reverb
            this.reverb.convolver = this.audioContext.createConvolver();
            
            // Generate impulse response for backrooms
            this.generateImpulseResponse();
        },
        
        generateImpulseResponse() {
            if (!this.audioContext) return;
            
            const sampleRate = this.audioContext.sampleRate;
            const duration = 3.0; // 3 seconds
            const length = sampleRate * duration;
            
            const impulse = this.audioContext.createBuffer(2, length, sampleRate);
            
            for (let channel = 0; channel < 2; channel++) {
                const channelData = impulse.getChannelData(channel);
                
                for (let i = 0; i < length; i++) {
                    // Exponential decay with some noise
                    const decay = Math.exp(-i / (sampleRate * 0.5));
                    const noise = (Math.random() * 2 - 1) * 0.1;
                    channelData[i] = noise * decay;
                }
            }
            
            this.reverb.impulseResponse = impulse;
            this.reverb.convolver.buffer = impulse;
        },
        
        createSpatialSource(x, y, z, options = {}) {
            if (!this.audioContext) return null;
            
            const source = {
                panner: this.audioContext.createPanner(),
                gain: this.audioContext.createGain(),
                reverbGain: this.audioContext.createGain(),
                
                // Source properties
                position: { x, y, z },
                velocity: { x: 0, y: 0, z: 0 },
                
                // Audio properties
                type: options.type || 'sfx',
                loop: options.loop || false,
                volume: options.volume || 1.0,
                
                // Playback
                buffer: null,
                sourceNode: null
            };
            
            // Configure panner
            source.panner.panningModel = 'HRTF';
            source.panner.distanceModel = 'exponential';
            source.panner.refDistance = 1;
            source.panner.maxDistance = 100;
            source.panner.rolloffFactor = 1;
            source.panner.coneInnerAngle = 360;
            source.panner.coneOuterAngle = 360;
            source.panner.coneOuterGain = 0;
            
            source.panner.positionX.value = x;
            source.panner.positionY.value = y;
            source.panner.positionZ.value = z;
            
            // Connect audio graph
            // Source -> Panner -> Gain -> Destination
            //              -> ReverbGain -> Convolver -> Destination
            
            source.panner.connect(source.gain);
            source.gain.connect(this.audioContext.destination);
            
            source.panner.connect(source.reverbGain);
            source.reverbGain.connect(this.reverb.convolver);
            this.reverb.convolver.connect(this.audioContext.destination);
            
            // Set initial volumes
            source.gain.gain.value = source.volume;
            source.reverbGain.gain.value = 0.3; // 30% reverb
            
            this.sources.push(source);
            
            return source;
        },
        
        updateListener(position, forward, up) {
            if (!this.audioContext || !this.listener) return;
            
            // Update listener position
            this.listener.positionX.value = position.x;
            this.listener.positionY.value = position.y;
            this.listener.positionZ.value = position.z;
            
            // Update listener orientation
            this.listener.forwardX.value = forward.x;
            this.listener.forwardY.value = forward.y;
            this.listener.forwardZ.value = forward.z;
            
            this.listener.upX.value = up.x;
            this.listener.upY.value = up.y;
            this.listener.upZ.value = up.z;
        },
        
        updateSource(source, position, velocity) {
            if (!source || !source.panner) return;
            
            source.position = position;
            source.velocity = velocity;
            
            source.panner.positionX.value = position.x;
            source.panner.positionY.value = position.y;
            source.panner.positionZ.value = position.z;
            
            source.panner.velocityX.value = velocity.x;
            source.panner.velocityY.value = velocity.y;
            source.panner.velocityZ.value = velocity.z;
        },
        
        playSound(source, buffer) {
            if (!source || !this.audioContext) return;
            
            // Stop existing playback
            if (source.sourceNode) {
                source.sourceNode.stop();
            }
            
            // Create new source node
            source.sourceNode = this.audioContext.createBufferSource();
            source.sourceNode.buffer = buffer;
            source.sourceNode.loop = source.loop;
            
            // Connect to panner
            source.sourceNode.connect(source.panner);
            
            // Start playback
            source.sourceNode.start();
        },
        
        // Calculate reverb based on room geometry
        calculateReverb(position, roomGeometry) {
            // Simplified reverb calculation
            // In a real implementation, this would trace rays and calculate RT60
            
            let reverbAmount = 0.5; // Default
            
            // Check distance to walls
            if (roomGeometry) {
                const distanceToWall = roomGeometry.getDistanceToNearestWall(position);
                reverbAmount = Math.min(1, 0.3 + (1 / (distanceToWall + 1)) * 0.7);
            }
            
            return reverbAmount;
        },
        
        // Apply occlusion (sound muffling through walls)
        applyOcclusion(source, listenerPosition, obstacles) {
            if (!source) return;
            
            let occlusion = 0;
            
            // Check if there are obstacles between source and listener
            if (obstacles) {
                const hit = obstacles.raycast(source.position, listenerPosition);
                if (hit) {
                    occlusion = 0.7; // 70% muffled
                }
            }
            
            // Apply lowpass filter based on occlusion
            const frequency = 20000 * (1 - occlusion);
            // In a real implementation, this would adjust a lowpass filter
        },
        
        update(dt, playerPosition, playerForward, playerUp) {
            // Update listener
            this.updateListener(playerPosition, playerForward, playerUp);
            
            // Update all sources
            this.sources.forEach(source => {
                // Update reverb based on environment
                const reverbAmount = this.calculateReverb(source.position);
                source.reverbGain.gain.value = reverbAmount;
            });
        }
    };

    // ============================================
    // PHASE 3.4: HAPTIC SUIT INTEGRATION
    // ============================================
    
    const HapticSuit = {
        // Gamepad haptics (for controllers with haptics)
        gamepadHaptics: [],
        
        // WebHID haptic devices
        hidDevices: [],
        
        // Haptic patterns
        patterns: {
            heartbeat: {
                duration: 1000,
                intensity: 0.5,
                frequency: 1.2 // Hz
            },
            damage: {
                duration: 200,
                intensity: 1.0,
                frequency: 0
            },
            proximity: {
                duration: 500,
                intensity: 0.3,
                frequency: 2
            },
            step: {
                duration: 100,
                intensity: 0.2,
                frequency: 0
            }
        },
        
        // Body zones
        zones: {
            chest: { intensity: 1.0 },
            back: { intensity: 0.8 },
            leftArm: { intensity: 0.6 },
            rightArm: { intensity: 0.6 },
            leftLeg: { intensity: 0.5 },
            rightLeg: { intensity: 0.5 }
        },
        
        init() {
            this.setupGamepadHaptics();
            this.setupHID();
            console.log('[Phase 3] Haptic suit initialized');
        },
        
        setupGamepadHaptics() {
            // Check for gamepads with haptic feedback
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            
            for (const gamepad of gamepads) {
                if (gamepad && gamepad.vibrationActuator) {
                    this.gamepadHaptics.push({
                        gamepad: gamepad,
                        actuator: gamepad.vibrationActuator
                    });
                }
            }
        },
        
        async setupHID() {
            // Request HID access for haptic devices
            if ('hid' in navigator) {
                try {
                    const devices = await navigator.hid.requestDevice({
                        filters: [{ vendorId: 0x1234 }] // Example vendor ID
                    });
                    
                    this.hidDevices = devices;
                    
                    for (const device of devices) {
                        await device.open();
                    }
                    
                    console.log(`[Phase 3] Connected ${devices.length} HID haptic devices`);
                } catch (error) {
                    console.warn('[Phase 3] HID access denied or not available');
                }
            }
        },
        
        trigger(patternName, zone = 'chest', intensity = 1.0) {
            const pattern = this.patterns[patternName];
            if (!pattern) return;
            
            const zoneConfig = this.zones[zone] || this.zones.chest;
            const finalIntensity = pattern.intensity * intensity * zoneConfig.intensity;
            
            // Trigger gamepad haptics
            this.triggerGamepadHaptics(finalIntensity, pattern.duration);
            
            // Trigger HID haptics
            this.triggerHIDHaptics(zone, finalIntensity, pattern.duration);
            
            // Trigger VR controller haptics
            this.triggerVRHaptics(finalIntensity, pattern.duration);
        },
        
        triggerGamepadHaptics(intensity, duration) {
            for (const haptic of this.gamepadHaptics) {
                if (haptic.actuator) {
                    haptic.actuator.playEffect('dual-rumble', {
                        duration: duration,
                        strongMagnitude: intensity,
                        weakMagnitude: intensity * 0.5
                    });
                }
            }
        },
        
        triggerHIDHaptics(zone, intensity, duration) {
            for (const device of this.hidDevices) {
                // Send haptic command to device
                // This is device-specific
                const data = new Uint8Array([
                    0x01, // Command
                    this.zoneToIndex(zone),
                    Math.floor(intensity * 255),
                    Math.floor(duration / 10)
                ]);
                
                device.sendReport(0, data).catch(console.error);
            }
        },
        
        triggerVRHaptics(intensity, duration) {
            // Trigger VR controller haptics
            if (window.VRSystem && VRSystem.controllers) {
                VRSystem.controllers.forEach(controller => {
                    if (controller.gamepad && controller.gamepad.hapticActuators) {
                        controller.gamepad.hapticActuators.forEach(actuator => {
                            actuator.pulse(intensity, duration);
                        });
                    }
                });
            }
        },
        
        zoneToIndex(zone) {
            const zoneMap = {
                chest: 0,
                back: 1,
                leftArm: 2,
                rightArm: 3,
                leftLeg: 4,
                rightLeg: 5
            };
            return zoneMap[zone] || 0;
        },
        
        // Directional damage feedback
        triggerDirectionalDamage(direction, intensity) {
            // Determine which zone based on direction
            const angle = Math.atan2(direction.z, direction.x);
            const degrees = (angle * 180 / Math.PI + 360) % 360;
            
            let zone = 'chest';
            
            if (degrees >= 315 || degrees < 45) {
                zone = 'back'; // Behind
            } else if (degrees >= 45 && degrees < 135) {
                zone = 'rightArm';
            } else if (degrees >= 135 && degrees < 225) {
                zone = 'chest'; // Front
            } else {
                zone = 'leftArm';
            }
            
            this.trigger('damage', zone, intensity);
        },
        
        // Heartbeat simulation based on stress
        updateHeartbeat(stressLevel) {
            const baseRate = 60; // BPM
            const maxRate = 120;
            const rate = baseRate + (maxRate - baseRate) * stressLevel;
            const interval = 60000 / rate;
            
            // Trigger heartbeat pattern
            this.trigger('heartbeat', 'chest', stressLevel);
        },
        
        // Footstep feedback
        triggerFootstep(foot) {
            const zone = foot === 'left' ? 'leftLeg' : 'rightLeg';
            this.trigger('step', zone, 0.5);
        }
    };

    // ============================================
    // PHASE 3.5: EYE TRACKING INTEGRATION
    // ============================================
    
    const EyeTracking = {
        // Eye tracking data
        gaze: {
            x: 0.5,
            y: 0.5,
            isValid: false,
            timestamp: 0
        },
        
        // Calibration
        calibrated: false,
        calibrationData: [],
        
        // WebGazer or similar
        tracker: null,
        
        // Foveated rendering
        foveation: {
            enabled: true,
            innerRadius: 0.15,
            outerRadius: 0.5,
            innerQuality: 1.0,
            outerQuality: 0.5
        },
        
        // Gaze history
        gazeHistory: [],
        maxHistory: 60,
        
        async init() {
            // Try to initialize WebGazer or WebXR eye tracking
            await this.initWebXREyeTracking();
            
            console.log('[Phase 3] Eye tracking initialized');
        },
        
        async initWebXREyeTracking() {
            // Check for WebXR eye tracking
            if (navigator.xr) {
                // Eye tracking is available in some VR headsets
                // This would be accessed through the WebXR session
            }
        },
        
        async initWebGazer() {
            // Initialize WebGazer for webcam eye tracking
            if (typeof webgazer !== 'undefined') {
                try {
                    await webgazer.setGazeListener((data, timestamp) => {
                        if (data) {
                            this.updateGaze(data.x, data.y, timestamp);
                        }
                    }).begin();
                    
                    this.tracker = webgazer;
                    console.log('[Phase 3] WebGazer initialized');
                } catch (error) {
                    console.warn('[Phase 3] WebGazer initialization failed:', error);
                }
            }
        },
        
        updateGaze(x, y, timestamp) {
            this.gaze.x = x;
            this.gaze.y = y;
            this.gaze.timestamp = timestamp;
            this.gaze.isValid = true;
            
            // Add to history
            this.gazeHistory.push({ x, y, timestamp });
            if (this.gazeHistory.length > this.maxHistory) {
                this.gazeHistory.shift();
            }
        },
        
        // Calibrate eye tracking
        calibrate() {
            this.calibrationData = [];
            this.calibrated = false;
            
            // Show calibration points
            this.showCalibrationUI();
        },
        
        showCalibrationUI() {
            const calibration = document.createElement('div');
            calibration.id = 'eye-calibration';
            calibration.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            `;
            
            calibration.innerHTML = `
                <h2 style="color: #fff; margin-bottom: 30px;">Eye Tracking Calibration</h2>
                <p style="color: #aaa; margin-bottom: 50px;">Follow the red dot with your eyes</p>
                <div id="calibration-dot" style="
                    width: 30px;
                    height: 30px;
                    background: #ff0000;
                    border-radius: 50%;
                    position: absolute;
                    transition: all 0.5s;
                "></div>
            `;
            
            document.body.appendChild(calibration);
            
            // Animate calibration dot through positions
            const positions = [
                { x: 0.5, y: 0.5 },
                { x: 0.1, y: 0.1 },
                { x: 0.9, y: 0.1 },
                { x: 0.9, y: 0.9 },
                { x: 0.1, y: 0.9 },
                { x: 0.5, y: 0.5 }
            ];
            
            const dot = document.getElementById('calibration-dot');
            let currentPoint = 0;
            
            const moveDot = () => {
                if (currentPoint >= positions.length) {
                    this.finishCalibration();
                    calibration.remove();
                    return;
                }
                
                const pos = positions[currentPoint];
                dot.style.left = `${pos.x * 100}%`;
                dot.style.top = `${pos.y * 100}%`;
                
                // Collect calibration data
                setTimeout(() => {
                    if (this.gaze.isValid) {
                        this.calibrationData.push({
                            target: pos,
                            gaze: { x: this.gaze.x, y: this.gaze.y }
                        });
                    }
                    
                    currentPoint++;
                    moveDot();
                }, 1000);
            };
            
            moveDot();
        },
        
        finishCalibration() {
            if (this.calibrationData.length >= 5) {
                this.calibrated = true;
                console.log('[Phase 3] Eye tracking calibration complete');
            } else {
                console.warn('[Phase 3] Calibration failed, not enough data');
            }
        },
        
        // Check if player is looking at something
        isLookingAt(screenX, screenY, radius = 0.1) {
            if (!this.gaze.isValid) return false;
            
            const dx = this.gaze.x - screenX;
            const dy = this.gaze.y - screenY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            return distance < radius;
        },
        
        // Get foveated rendering quality for a screen position
        getFoveatedQuality(screenX, screenY) {
            if (!this.foveation.enabled || !this.gaze.isValid) {
                return this.foveation.outerQuality;
            }
            
            const dx = screenX - this.gaze.x;
            const dy = screenY - this.gaze.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.foveation.innerRadius) {
                return this.foveation.innerQuality;
            } else if (distance < this.foveation.outerRadius) {
                const t = (distance - this.foveation.innerRadius) / 
                         (this.foveation.outerRadius - this.foveation.innerRadius);
                return this.foveation.innerQuality * (1 - t) + 
                       this.foveation.outerQuality * t;
            } else {
                return this.foveation.outerQuality;
            }
        },
        
        // Detect blink
        detectBlink() {
            // Simplified blink detection
            // In a real implementation, this would use eye aspect ratio
            return false;
        },
        
        // Get gaze velocity
        getGazeVelocity() {
            if (this.gazeHistory.length < 2) return { x: 0, y: 0 };
            
            const current = this.gazeHistory[this.gazeHistory.length - 1];
            const previous = this.gazeHistory[this.gazeHistory.length - 2];
            
            const dt = (current.timestamp - previous.timestamp) / 1000;
            if (dt === 0) return { x: 0, y: 0 };
            
            return {
                x: (current.x - previous.x) / dt,
                y: (current.y - previous.y) / dt
            };
        },
        
        // Check for saccade (rapid eye movement)
        isSaccade() {
            const velocity = this.getGazeVelocity();
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            
            return speed > 100; // pixels per second
        },
        
        update(dt) {
            // Update eye tracking data
            // This would be called by the tracking library
        }
    };

    // ============================================
    // PHASE 3: MAIN INITIALIZER
    // ============================================
    
    const Phase3VRAR = {
        async init(renderer, scene, camera) {
            console.log('[Phase 3] Initializing VR/AR & Immersive Technologies...');
            
            // Initialize VR
            await VRSystem.init(renderer, camera);
            
            // Initialize AR
            await ARSystem.init(renderer, scene, camera);
            
            // Initialize spatial audio
            SpatialAudio.init();
            
            // Initialize haptic suit
            HapticSuit.init();
            
            // Initialize eye tracking
            await EyeTracking.init();
            
            console.log('[Phase 3] VR/AR initialization complete');
        },
        
        update(dt, playerState, frame) {
            // Update VR
            VRSystem.update(dt, playerState);
            
            // Update AR
            ARSystem.update(frame);
            
            // Update spatial audio
            if (playerState.position && playerState.forward && playerState.up) {
                SpatialAudio.update(dt, playerState.position, playerState.forward, playerState.up);
            }
            
            // Update haptic feedback
            if (playerState.stress !== undefined) {
                HapticSuit.updateHeartbeat(playerState.stress);
            }
            
            // Update eye tracking
            EyeTracking.update(dt);
        },
        
        // VR methods
        enterVR() {
            return VRSystem.enterVR();
        },
        
        exitVR() {
            VRSystem.exitVR();
        },
        
        isVRActive() {
            return VRSystem.isVRActive;
        },
        
        // AR methods
        enterAR() {
            return ARSystem.enterAR();
        },
        
        exitAR() {
            ARSystem.exitAR();
        },
        
        isARActive() {
            return ARSystem.isARActive;
        },
        
        // Spatial audio methods
        createSpatialSource(x, y, z, options) {
            return SpatialAudio.createSpatialSource(x, y, z, options);
        },
        
        playSpatialSound(source, buffer) {
            SpatialAudio.playSound(source, buffer);
        },
        
        // Haptic methods
        triggerHaptic(pattern, zone, intensity) {
            HapticSuit.trigger(pattern, zone, intensity);
        },
        
        triggerDirectionalDamage(direction, intensity) {
            HapticSuit.triggerDirectionalDamage(direction, intensity);
        },
        
        // Eye tracking methods
        getGazePosition() {
            return { x: EyeTracking.gaze.x, y: EyeTracking.gaze.y };
        },
        
        isLookingAt(x, y, radius) {
            return EyeTracking.isLookingAt(x, y, radius);
        },
        
        getFoveatedQuality(x, y) {
            return EyeTracking.getFoveatedQuality(x, y);
        }
    };

    // Export to global scope
    window.Phase3VRAR = Phase3VRAR;
    window.VRSystem = VRSystem;
    window.ARSystem = ARSystem;
    window.SpatialAudio = SpatialAudio;
    window.HapticSuit = HapticSuit;
    window.EyeTracking = EyeTracking;

})();
