/* ============================================
   The Abyss - Core Engine v3.0
   WebGPU/WebGL Hybrid Rendering Engine
   Phase 1 Implementation
   ============================================ */

const AbyssEngine = (function() {
    'use strict';

    // Engine configuration
    const CONFIG = {
        targetFPS: 60,
        maxDeltaTime: 0.1, // Prevent spiral of death
        webgpuPreferred: true,
        fallbackToWebGL: true,
        renderScale: 1.0,
        shadowMapSize: 2048,
        maxLights: 8,
        maxInstances: 10000
    };

    // Engine state
    let renderer = null;
    let scene = null;
    let camera = null;
    let composer = null;
    let isWebGPU = false;
    let clock = new THREE.Clock();
    let renderCallbacks = [];
    let updateCallbacks = [];
    let isRunning = false;
    let frameCount = 0;
    let lastFrameTime = 0;
    let fps = 0;

    // Performance monitoring
    const perfStats = {
        frameTime: 0,
        renderTime: 0,
        updateTime: 0,
        drawCalls: 0,
        triangles: 0,
        memory: 0
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    async function init(canvas, options = {}) {
        Object.assign(CONFIG, options);

        console.log('🌊 Abyss Engine v3.0 Initializing...');

        // Try WebGPU first if preferred
        if (CONFIG.webgpuPreferred && await isWebGPUSupported()) {
            try {
                await initWebGPU(canvas);
                isWebGPU = true;
                console.log('✅ WebGPU renderer initialized');
            } catch (e) {
                console.warn('WebGPU init failed, falling back to WebGL:', e);
                if (CONFIG.fallbackToWebGL) {
                    initWebGL(canvas);
                }
            }
        } else {
            initWebGL(canvas);
        }

        // Setup scene and camera
        setupScene();
        setupCamera();

        // Initialize post-processing
        await initPostProcessing();

        // Setup resize handler
        window.addEventListener('resize', onResize);

        console.log(`✅ Abyss Engine ready (${isWebGPU ? 'WebGPU' : 'WebGL'})`);
        return true;
    }

    async function isWebGPUSupported() {
        if (!navigator.gpu) return false;
        try {
            const adapter = await navigator.gpu.requestAdapter();
            return !!adapter;
        } catch {
            return false;
        }
    }

    async function initWebGPU(canvas) {
        // WebGPU initialization with three.js WebGPU renderer
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance'
        });

        if (!adapter) throw new Error('No WebGPU adapter found');

        const device = await adapter.requestDevice({
            requiredFeatures: [],
            requiredLimits: {
                maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
                maxComputeWorkgroupSizeX: adapter.limits.maxComputeWorkgroupSizeX
            }
        });

        // Create WebGPU renderer
        renderer = new THREE.WebGPURenderer({
            canvas: canvas,
            device: device,
            antialias: true,
            alpha: false
        });

        await renderer.init();

        renderer.setSize(window.innerWidth * CONFIG.renderScale,
                        window.innerHeight * CONFIG.renderScale);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
    }

    function initWebGL(canvas) {
        // WebGL 2.0 with fallback to 1.0
        const gl = canvas.getContext('webgl2', {
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        }) || canvas.getContext('webgl', {
            antialias: true,
            alpha: false
        });

        if (!gl) throw new Error('WebGL not supported');

        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            context: gl,
            antialias: true,
            alpha: false
        });

        renderer.setSize(window.innerWidth * CONFIG.renderScale,
                        window.innerHeight * CONFIG.renderScale);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.outputEncoding = THREE.sRGBEncoding;

        // Enable extensions
        if (renderer.capabilities.isWebGL2) {
            console.log('✅ WebGL 2.0 renderer');
        } else {
            console.log('⚠️ WebGL 1.0 renderer (limited features)');
        }
    }

    function setupScene() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020510);
        scene.fog = new THREE.FogExp2(0x020510, 0.025);

        // Environment for PBR
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();

        // Default environment map (will be replaced)
        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
        const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
        scene.environment = cubeRenderTarget.texture;
    }

    function setupCamera() {
        camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, -5, 0);
    }

    async function initPostProcessing() {
        // Import post-processing modules dynamically
        if (isWebGPU) {
            // WebGPU post-processing
            composer = new THREE.PostProcessing(renderer);
        } else {
            // WebGL post-processing using EffectComposer
            composer = new THREE.EffectComposer(renderer);

            const renderPass = new THREE.RenderPass(scene, camera);
            composer.addPass(renderPass);

            // Additional passes added by graphics module
        }
    }

    // ============================================
    // RENDER LOOP
    // ============================================
    function start() {
        if (isRunning) return;
        isRunning = true;
        clock.start();
        lastFrameTime = performance.now();
        requestAnimationFrame(renderLoop);
    }

    function stop() {
        isRunning = false;
    }

    function renderLoop(currentTime) {
        if (!isRunning) return;

        requestAnimationFrame(renderLoop);

        // Calculate delta time with spiral of death protection
        const deltaTime = Math.min(clock.getDelta(), CONFIG.maxDeltaTime);
        const elapsedTime = clock.getElapsedTime();

        // FPS calculation
        frameCount++;
        if (currentTime - lastFrameTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastFrameTime = currentTime;
        }

        const updateStart = performance.now();

        // Execute all update callbacks
        for (const callback of updateCallbacks) {
            try {
                callback(deltaTime, elapsedTime);
            } catch (e) {
                console.error('Update callback error:', e);
            }
        }

        perfStats.updateTime = performance.now() - updateStart;

        const renderStart = performance.now();

        // Execute pre-render callbacks
        for (const callback of renderCallbacks) {
            try {
                callback(deltaTime, elapsedTime);
            } catch (e) {
                console.error('Render callback error:', e);
            }
        }

        // Render scene
        if (composer) {
            composer.render(deltaTime);
        } else {
            renderer.render(scene, camera);
        }

        perfStats.renderTime = performance.now() - renderStart;
        perfStats.frameTime = perfStats.updateTime + perfStats.renderTime;

        // Update stats from renderer info
        const info = renderer.info;
        perfStats.drawCalls = info.render.calls;
        perfStats.triangles = info.render.triangles;
    }

    // ============================================
    // CALLBACK MANAGEMENT
    // ============================================
    function onUpdate(callback) {
        updateCallbacks.push(callback);
        return () => {
            const index = updateCallbacks.indexOf(callback);
            if (index > -1) updateCallbacks.splice(index, 1);
        };
    }

    function onRender(callback) {
        renderCallbacks.push(callback);
        return () => {
            const index = renderCallbacks.indexOf(callback);
            if (index > -1) renderCallbacks.splice(index, 1);
        };
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function onResize() {
        if (!camera || !renderer) return;

        const width = window.innerWidth * CONFIG.renderScale;
        const height = window.innerHeight * CONFIG.renderScale;

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
        if (composer) composer.setSize(width, height);
    }

    function setRenderScale(scale) {
        CONFIG.renderScale = Math.max(0.25, Math.min(2.0, scale));
        onResize();
    }

    function dispose() {
        stop();

        // Dispose of all resources
        scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        renderer.dispose();
        composer?.dispose();

        window.removeEventListener('resize', onResize);
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        // Initialization
        init,
        start,
        stop,
        dispose,

        // Callbacks
        onUpdate,
        onRender,

        // Configuration
        setRenderScale,
        getConfig: () => ({ ...CONFIG }),

        // Accessors
        getRenderer: () => renderer,
        getScene: () => scene,
        getCamera: () => camera,
        getComposer: () => composer,
        isWebGPU: () => isWebGPU,
        isWebGL2: () => !isWebGPU && renderer?.capabilities?.isWebGL2,

        // Stats
        getFPS: () => fps,
        getStats: () => ({ ...perfStats }),
        getClock: () => clock,

        // Time
        getDeltaTime: () => clock.getDelta(),
        getElapsedTime: () => clock.getElapsedTime()
    };
})();

// Global access
window.AbyssEngine = AbyssEngine;
