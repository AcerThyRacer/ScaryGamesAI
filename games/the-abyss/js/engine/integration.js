/* ============================================
   The Abyss - Phase 1 Integration Layer
   Connects all new engine systems together
   ============================================ */

const Phase1Integration = (function() {
    'use strict';

    // System references
    let engine = null;
    let volumetric = null;
    let postProcess = null;
    let physics = null;
    let spatialAudio = null;
    let proceduralSound = null;

    // Player physics body
    let playerBody = null;
    let playerObject = null;

    // Particle systems
    let marineSnow = null;
    let bubbles = null;

    // State
    let isInitialized = false;
    let cameraController = null;

    // ============================================
    // INITIALIZATION
    // ============================================
    async function init(canvas, scene, camera, renderer) {
        console.log('🔧 Phase 1 Integration initializing...');

        try {
            // 1. Initialize Core Engine
            await AbyssEngine.init(canvas, {
                webgpuPreferred: true,
                fallbackToWebGL: true,
                renderScale: 1.0
            });
            engine = AbyssEngine;

            // 2. Initialize Volumetric System
            VolumetricSystem.init(scene, camera, renderer);
            volumetric = VolumetricSystem;

            // 3. Initialize Post-Processing
            PostProcessStack.init(renderer, scene, camera);
            postProcess = PostProcessStack;

            // 4. Initialize Physics
            BuoyancyPhysics.init();
            physics = BuoyancyPhysics;

            // 5. Initialize Audio
            await SpatialAudio.init();
            spatialAudio = SpatialAudio;

            ProceduralSound.init();
            proceduralSound = ProceduralSound;

            // 6. Create particle effects
            marineSnow = physics.createParticleSystem(scene, {
                maxParticles: 2000,
                size: 0.03,
                color: 0xaaccff,
                type: 'snow'
            });

            bubbles = physics.createParticleSystem(scene, {
                maxParticles: 500,
                size: 0.05,
                color: 0xffffff,
                type: 'bubble'
            });

            // 7. Setup player physics
            if (window.player && window.player.object3D) {
                setupPlayerPhysics(window.player.object3D);
            }

            // 8. Setup update loops
            setupUpdateLoops();

            isInitialized = true;
            console.log('✅ Phase 1 Integration complete');

            // Start the engine
            engine.start();

            return true;
        } catch (e) {
            console.error('Phase 1 Integration failed:', e);
            return false;
        }
    }

    // ============================================
    // PLAYER PHYSICS SETUP
    // ============================================
    function setupPlayerPhysics(playerObject3D) {
        playerObject = playerObject3D;

        // Create physics body for player
        playerBody = physics.createBody(playerObject3D, {
            mass: 70,                    // kg
            volume: 0.075,               // m³ (approximate human volume)
            dragCoeff: 0.6,              // Higher drag for diver
            buoyancyOffset: -5,          // Slightly negative buoyancy
            swimStrength: 8
        });

        // Override default movement with physics-based
        window.player.physicsBody = playerBody;

        console.log('Player physics body created');
    }

    // ============================================
    // UPDATE LOOPS
    // ============================================
    function setupUpdateLoops() {
        // Main engine update
        engine.onUpdate((deltaTime, elapsedTime) => {
            // Update volumetric effects
            volumetric.update(deltaTime, elapsedTime);

            // Update physics
            physics.update(deltaTime);

            // Update player from physics
            updatePlayerFromPhysics();

            // Update particle systems
            if (playerObject) {
                marineSnow?.update(deltaTime, playerObject.position);
                bubbles?.update(deltaTime, playerObject.position);
            }

            // Update audio listener
            updateAudioListener();
        });

        // Pre-render update
        engine.onRender((deltaTime, elapsedTime) => {
            // Update post-processing
            const camera = engine.getCamera();
            PostProcessStack.update(camera, deltaTime);

            // Update procedural sounds
            updateAdaptiveAudio(elapsedTime);
        });
    }

    // ============================================
    // PLAYER MOVEMENT INTEGRATION
    // ============================================
    function updatePlayerFromPhysics() {
        if (!playerBody || !window.player) return;

        // Sync game player state with physics
        window.player.position.copy(playerBody.object.position);
        window.player.velocity = playerBody.velocity.clone();

        // Calculate depth
        window.player.depth = Math.abs(playerBody.object.position.y);

        // Update oxygen based on depth (pressure)
        const pressure = physics.getDepthPressure(window.player.depth);
        window.player.pressure = pressure;

        // Depth affects oxygen consumption
        const depthFactor = 1 + (window.player.depth / 100) * 0.5;
        if (window.player.oxygen > 0) {
            const consumption = 1 * depthFactor * (playerBody.isSprinting ? 2 : 1);
            window.player.oxygen -= consumption * 0.016; // Approx per frame at 60fps
        }
    }

    function applyPlayerInput(inputState, deltaTime) {
        if (!playerBody) return;

        const swimDirection = new THREE.Vector3(0, 0, 0);

        // Convert input to world direction
        if (inputState.moveForward) swimDirection.z -= 1;
        if (inputState.moveBackward) swimDirection.z += 1;
        if (inputState.moveLeft) swimDirection.x -= 1;
        if (inputState.moveRight) swimDirection.x += 1;
        if (inputState.moveUp) swimDirection.y += 1;
        if (inputState.moveDown) swimDirection.y -= 1;

        // Apply rotation from camera/player
        swimDirection.applyEuler(playerObject.rotation);

        // Apply swimming force
        if (swimDirection.lengthSq() > 0) {
            playerBody.swim(swimDirection, inputState.sprint);

            // Generate swim sound
            if (Math.random() < 0.1) {
                ProceduralSound.generateSwimStroke(inputState.sprint ? 1.5 : 1);
            }
        }
    }

    // ============================================
    // AUDIO INTEGRATION
    // ============================================
    function updateAudioListener() {
        if (!spatialAudio.isInitialized() || !playerObject) return;

        const position = playerObject.position;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerObject.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(playerObject.quaternion);

        spatialAudio.updateListener(position, forward, up, playerBody?.velocity);
    }

    function updateAdaptiveAudio(elapsedTime) {
        if (!proceduralSound) return;

        // Calculate tension based on game state
        let tension = 0;

        // Depth increases tension
        if (window.player) {
            tension += Math.min(30, window.player.depth / 3);

            // Low oxygen increases tension
            if (window.player.oxygen < 30) {
                tension += (30 - window.player.oxygen);
            }

            // Nearby creatures increase tension
            if (window.creatures) {
                let closestCreature = Infinity;
                window.creatures.forEach(creature => {
                    const dist = creature.position.distanceTo(window.player.position);
                    closestCreature = Math.min(closestCreature, dist);
                });

                if (closestCreature < 20) {
                    tension += (20 - closestCreature) * 2;
                }
            }
        }

        proceduralSound.setGlobalTension(Math.min(100, tension));
    }

    function playCreatureSound(creatureType, position, intensity = 1) {
        if (!spatialAudio.isInitialized()) return;

        const id = `creature_${creatureType}_${Date.now()}`;
        const source = spatialAudio.createSource(id, position, {
            category: 'sfx',
            volume: 0.5 * intensity,
            maxDistance: 100
        });

        // Generate procedural sound
        const generator = ProceduralSound.createCreatureGenerator(creatureType, {
            baseFrequency: 80 + Math.random() * 100
        });

        if (intensity > 0.7) {
            generator.generateRoar(intensity);
        } else {
            generator.generateAmbientCall(0);
        }

        return source;
    }

    // ============================================
    // ENVIRONMENT CONTROLS
    // ============================================
    function setWaterCurrent(direction, strength) {
        physics.setCurrent(direction, strength);
    }

    function setFogDensity(density) {
        volumetric.setFogDensity(density);

        // Also update scene fog for compatibility
        const scene = engine.getScene();
        if (scene && scene.fog) {
            scene.fog.density = density;
        }
    }

    function setPostProcessQuality(quality) {
        switch(quality) {
            case 'low':
                PostProcessStack.setBloomStrength(0.5);
                PostProcessStack.setSSAOIntensity(0);
                PostProcessStack.setMotionBlurStrength(0);
                break;
            case 'medium':
                PostProcessStack.setBloomStrength(1.0);
                PostProcessStack.setSSAOIntensity(0.5);
                PostProcessStack.setMotionBlurStrength(0.3);
                break;
            case 'high':
                PostProcessStack.setBloomStrength(1.5);
                PostProcessStack.setSSAOIntensity(1.0);
                PostProcessStack.setMotionBlurStrength(0.5);
                break;
            case 'ultra':
                PostProcessStack.setBloomStrength(2.0);
                PostProcessStack.setSSAOIntensity(1.5);
                PostProcessStack.setMotionBlurStrength(0.7);
                break;
        }
    }

    // ============================================
    // DEBUG INTERFACE
    // ============================================
    function getDebugInfo() {
        return {
            engine: {
                fps: engine.getFPS(),
                frameTime: engine.getStats().frameTime.toFixed(2) + 'ms',
                drawCalls: engine.getStats().drawCalls,
                triangles: engine.getStats().triangles,
                isWebGPU: engine.isWebGPU()
            },
            physics: {
                bodyCount: physics.getAllBodies().length,
                playerVelocity: playerBody?.velocity.length().toFixed(2) + ' m/s'
            },
            audio: {
                sources: spatialAudio.getAllSources().length,
                contextState: spatialAudio.getContext()?.state
            }
        };
    }

    // ============================================
    // DISPOSAL
    // ============================================
    function dispose() {
        engine?.dispose();
        volumetric?.dispose();
        postProcess?.dispose();
        physics?.dispose();
        spatialAudio?.dispose();
        proceduralSound?.dispose();

        marineSnow?.dispose();
        bubbles?.dispose();

        isInitialized = false;
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        // Initialization
        init,
        dispose,
        isInitialized: () => isInitialized,

        // Player
        setupPlayerPhysics,
        applyPlayerInput,
        getPlayerBody: () => playerBody,

        // Environment
        setWaterCurrent,
        setFogDensity,
        setPostProcessQuality,

        // Audio
        playCreatureSound,
        updateAudioListener,

        // Systems access
        getEngine: () => engine,
        getVolumetric: () => volumetric,
        getPostProcess: () => postProcess,
        getPhysics: () => physics,
        getSpatialAudio: () => spatialAudio,
        getProceduralSound: () => proceduralSound,

        // Particles
        getMarineSnow: () => marineSnow,
        getBubbles: () => bubbles,

        // Debug
        getDebugInfo
    };
})();

// Global access
window.Phase1Integration = Phase1Integration;
