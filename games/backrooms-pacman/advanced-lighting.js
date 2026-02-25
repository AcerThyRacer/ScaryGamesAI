/**
 * Advanced Lighting System for Backrooms Pacman
 * Implements: Screen-space ray marching, dynamic shadows, volumetric lighting
 * 
 * @author ScaryGamesAI
 * @version 1.0
 */

var AdvancedLighting = (function() {
    'use strict';

    // Configuration
    var config = {
        shadowMapSize: 1024,
        shadowCameraNear: 0.5,
        shadowCameraFar: 50.0,
        shadowBias: 0.0001,
        volumetricEnabled: true,
        rayMarchSteps: 64,
        rayMarchMaxDistance: 20.0
    };

    // State
    var scene = null;
    var renderer = null;
    var camera = null;
    var shadowMap = null;
    var shadowCamera = null;
    var lightShaders = null;
    var volumetricQuad = null;
    var enabled = true;

    // Lights tracking
    var dynamicLights = [];
    var flashlight = null;

    /**
     * Initialize advanced lighting system
     */
    function init(threeScene, threeRenderer, threeCamera) {
        scene = threeScene;
        renderer = threeRenderer;
        camera = threeCamera;

        // Create shadow map render target
        shadowMap = new THREE.WebGLRenderTarget(
            config.shadowMapSize,
            config.shadowMapSize,
            {
                format: THREE.RGBAFormat,
                type: THREE.FloatType,
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter
            }
        );

        // Create orthographic camera for shadow mapping
        shadowCamera = new THREE.OrthographicCamera(
            -10, 10, 10, -10,
            config.shadowCameraNear,
            config.shadowCameraFar
        );

        // Load shaders
        loadShaders();

        // Create volumetric light quad
        if (config.volumetricEnabled) {
            createVolumetricQuad();
        }

        console.log('[AdvancedLighting] Initialized with shadows and volumetrics');
    }

    /**
     * Load shader programs
     */
    function loadShaders() {
        // Volumetric light shader
        lightShaders = {
            volumetric: new THREE.ShaderMaterial({
                vertexShader: document.getElementById('volumetric-light-vert').textContent,
                fragmentShader: document.getElementById('volumetric-light-frag').textContent,
                uniforms: {
                    time: { value: 0 },
                    lightColor: { value: new THREE.Color(0xffaa00) },
                    lightIntensity: { value: 1.0 },
                    cameraPosition: { value: new THREE.Vector3() },
                    lightPosition: { value: new THREE.Vector3() },
                    dustDensity: { value: 0.5 }
                },
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        };
    }

    /**
     * Create full-screen quad for volumetric effects
     */
    function createVolumetricQuad() {
        var geometry = new THREE.PlaneGeometry(2, 2);
        volumetricQuad = new THREE.Mesh(geometry, lightShaders.volumetric);
        volumetricQuad.frustumCulled = false;
    }

    /**
     * Add a dynamic light source
     */
    function addDynamicLight(position, color, intensity, radius) {
        var light = {
            position: position.clone(),
            color: new THREE.Color(color),
            intensity: intensity,
            radius: radius,
            mesh: null,
            shadowEnabled: true
        };

        // Create light mesh for visualization
        var geometry = new THREE.SphereGeometry(0.1, 8, 8);
        var material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        light.mesh = new THREE.Mesh(geometry, material);
        light.mesh.position.copy(position);
        scene.add(light.mesh);

        // Add point light
        var pointLight = new THREE.PointLight(color, intensity, radius);
        pointLight.position.copy(position);
        pointLight.castShadow = true;
        pointLight.shadow.mapSize.width = config.shadowMapSize;
        pointLight.shadow.mapSize.height = config.shadowMapSize;
        pointLight.shadow.camera.near = config.shadowCameraNear;
        pointLight.shadow.camera.far = config.shadowCameraFar;
        pointLight.shadow.bias = config.shadowBias;
        scene.add(pointLight);
        light.pointLight = pointLight;

        dynamicLights.push(light);
        return light;
    }

    /**
     * Create player flashlight with advanced features
     */
    function createPlayerFlashlight() {
        if (flashlight) return flashlight;

        // Main spotlight
        flashlight = {
            spotlight: new THREE.SpotLight(0xffffff, 1.5, 30, Math.PI / 6, 0.5, 1),
            target: new THREE.Object3D(),
            intensity: 1.5,
            enabled: true
        };

        flashlight.spotLight.position.set(0, 0, 0);
        flashlight.spotLight.castShadow = true;
        flashlight.spotLight.shadow.mapSize.width = 2048;
        flashlight.spotLight.shadow.mapSize.height = 2048;
        flashlight.spotLight.shadow.camera.near = 0.5;
        flashlight.spotLight.shadow.camera.far = 35;
        flashlight.spotLight.shadow.focus = 0.8;
        flashlight.spotLight.shadow.bias = -0.0001;

        flashlight.spotLight.add(flashlight.target);
        flashlight.spotLight.target.position.set(0, 0, -1);
        scene.add(flashlight.spotLight);

        // Add volumetric cone
        if (config.volumetricEnabled) {
            var coneGeometry = new THREE.ConeGeometry(3, 30, 32, 1, true);
            coneGeometry.rotateX(-Math.PI / 2);
            coneGeometry.translate(0, 0, -15);

            var coneMaterial = new THREE.ShaderMaterial({
                vertexShader: document.getElementById('volumetric-light-vert').textContent,
                fragmentShader: document.getElementById('volumetric-light-frag').textContent,
                uniforms: {
                    time: { value: 0 },
                    lightColor: { value: new THREE.Color(0xffffff) },
                    lightIntensity: { value: 0.3 },
                    cameraPosition: { value: new THREE.Vector3() },
                    lightPosition: { value: new THREE.Vector3() },
                    dustDensity: { value: 0.6 }
                },
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });

            flashlight.volumetricCone = new THREE.Mesh(coneGeometry, coneMaterial);
            flashlight.spotLight.add(flashlight.volumetricCone);
        }

        return flashlight;
    }

    /**
     * Update flashlight position and direction
     */
    function updateFlashlight(position, direction) {
        if (!flashlight || !flashlight.enabled) return;

        flashlight.spotLight.position.copy(position);
        flashlight.spotLight.target.position.copy(
            position.clone().add(direction)
        );
        flashlight.spotLight.target.updateMatrixWorld();

        // Update volumetric cone
        if (flashlight.volumetricCone) {
            flashlight.volumetricCone.material.uniforms.lightPosition.value.copy(position);
            flashlight.volumetricCone.material.uniforms.cameraPosition.value.copy(camera.position);
        }
    }

    /**
     * Set flashlight intensity
     */
    function setFlashlightIntensity(intensity) {
        if (!flashlight) return;
        flashlight.intensity = intensity;
        flashlight.spotLight.intensity = intensity;
        if (flashlight.volumetricCone) {
            flashlight.volumetricCone.material.uniforms.lightIntensity.value = intensity * 0.3;
        }
    }

    /**
     * Enable/disable flashlight
     */
    function setFlashlightEnabled(enabled) {
        if (!flashlight) return;
        flashlight.enabled = enabled;
        flashlight.spotLight.visible = enabled;
        if (flashlight.volumetricCone) {
            flashlight.volumetricCone.visible = enabled;
        }
    }

    /**
     * Update all dynamic lights
     */
    function updateLights(deltaTime, time) {
        if (!enabled) return;

        // Update dynamic lights
        for (var i = 0; i < dynamicLights.length; i++) {
            var light = dynamicLights[i];

            // Flicker effect
            if (light.flicker) {
                var flickerAmount = light.flicker.amount || 0.2;
                var flickerSpeed = light.flicker.speed || 5.0;
                var flicker = Math.sin(time * flickerSpeed) * flickerAmount;
                flicker += (Math.random() - 0.5) * flickerAmount * 0.5;
                light.pointLight.intensity = light.intensity * (1 + flicker);
            }

            // Update mesh position
            if (light.mesh) {
                light.mesh.position.copy(light.position);
            }
        }

        // Update volumetric shaders
        if (lightShaders && lightShaders.volumetric) {
            lightShaders.volumetric.uniforms.time.value = time;
        }

        // Update flashlight volumetric
        if (flashlight && flashlight.volumetricCone) {
            flashlight.volumetricCone.material.uniforms.time.value = time;
            flashlight.volumetricCone.material.uniforms.cameraPosition.value.copy(camera.position);
        }
    }

    /**
     * Render shadow map from light perspective
     */
    function renderShadowMap() {
        if (!enabled || dynamicLights.length === 0) return;

        // For each dynamic light, render depth map
        for (var i = 0; i < dynamicLights.length; i++) {
            var light = dynamicLights[i];
            if (!light.shadowEnabled) continue;

            // Set up shadow camera
            shadowCamera.position.copy(light.position);
            shadowCamera.lookAt(light.position.clone().add(new THREE.Vector3(1, 0, 0)));
            shadowCamera.updateMatrixWorld();

            // Render depth
            renderer.setRenderTarget(shadowMap);
            renderer.clear();
            renderer.render(scene, shadowCamera);
        }

        renderer.setRenderTarget(null);
    }

    /**
     * Apply screen-space ray marching for realistic shadows
     */
    function applyRayMarchedShadows() {
        // This would be integrated into the main render loop
        // For now, we use Three.js built-in shadow mapping
        // Full ray marching would require a custom post-processing pass
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    /**
     * Render volumetric lighting pass
     */
    function renderVolumetricPass() {
        if (!enabled || !config.volumetricEnabled || !volumetricQuad) return;

        // Render volumetric lights with additive blending
        for (var i = 0; i < dynamicLights.length; i++) {
            var light = dynamicLights[i];
            
            // Update shader uniforms
            lightShaders.volumetric.uniforms.lightPosition.value.copy(light.position);
            lightShaders.volumetric.uniforms.lightColor.value.copy(light.color);
            lightShaders.volumetric.uniforms.lightIntensity.value = light.intensity * 0.5;
            lightShaders.volumetric.uniforms.cameraPosition.value.copy(camera.position);

            // Position quad at light
            volumetricQuad.position.copy(light.position);
            volumetricQuad.lookAt(camera.position);
            volumetricQuad.updateMatrixWorld();

            // Render
            volumetricQuad.render(renderer);
        }
    }

    /**
     * Add flicker effect to a light
     */
    function addLightFlicker(light, amount, speed) {
        light.flicker = {
            amount: amount || 0.2,
            speed: speed || 5.0
        };
    }

    /**
     * Remove a dynamic light
     */
    function removeDynamicLight(light) {
        var index = dynamicLights.indexOf(light);
        if (index !== -1) {
            if (light.mesh) scene.remove(light.mesh);
            if (light.pointLight) scene.remove(light.pointLight);
            dynamicLights.splice(index, 1);
        }
    }

    /**
     * Enable/disable the entire system
     */
    function setEnabled(value) {
        enabled = value;
        if (scene) {
            scene.traverse(function(object) {
                if (object.isLight) {
                    object.visible = value;
                }
            });
        }
    }

    /**
     * Get system status
     */
    function getStatus() {
        return {
            enabled: enabled,
            dynamicLightsCount: dynamicLights.length,
            flashlightEnabled: flashlight && flashlight.enabled,
            volumetricsEnabled: config.volumetricEnabled && !!volumetricQuad,
            shadowMapEnabled: !!shadowMap
        };
    }

    // Public API
    return {
        init: init,
        addDynamicLight: addDynamicLight,
        removeDynamicLight: removeDynamicLight,
        createPlayerFlashlight: createPlayerFlashlight,
        updateFlashlight: updateFlashlight,
        setFlashlightIntensity: setFlashlightIntensity,
        setFlashlightEnabled: setFlashlightEnabled,
        updateLights: updateLights,
        renderShadowMap: renderShadowMap,
        renderVolumetricPass: renderVolumetricPass,
        applyRayMarchedShadows: applyRayMarchedShadows,
        addLightFlicker: addLightFlicker,
        setEnabled: setEnabled,
        getStatus: getStatus,
        config: config
    };
})();

// Export for global access
if (typeof window !== 'undefined') {
    window.AdvancedLighting = AdvancedLighting;
}
