/* ============================================================
   HELLAPHOBIA 2026 REMASTER - MAIN INTEGRATION SYSTEM
   Master Coordinator | System Orchestration | Performance Monitor
   Zero-Load Streaming | Unified Initialization
   ============================================================ */

(function() {
    'use strict';

    // ===== MAIN INTEGRATION MANAGER =====
    const MainIntegration = {
        systems: {
            renderer: null,
            physics: null,
            audio: null,
            ai: null,
            horrorDirector: null,
            streaming: null,
            postProcessing: null
        },
        initialized: false,
        running: false,
        lastFrameTime: 0,
        frameCount: 0,
        performanceMetrics: {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            entityCount: 0,
            drawCalls: 0
        },
        
        // Initialize all systems in correct order
        async init(config = {}) {
            console.log('🎮 Hellaphobia 2026 Remaster - Initializing...');
            console.log('═══════════════════════════════════════════');
            
            const startTime = performance.now();
            
            try {
                // Step 1: Initialize core systems first
                await this.initializeCoreSystems(config);
                
                // Step 2: Initialize rendering systems
                await this.initializeRenderer(config);
                
                // Step 3: Initialize physics
                await this.initializePhysics(config);
                
                // Step 4: Initialize audio
                await this.initializeAudio(config);
                
                // Step 5: Initialize AI systems
                await this.initializeAI(config);
                
                // Step 6: Initialize Horror Director (must be last)
                await this.initializeHorrorDirector(config);
                
                // Step 7: Start game loop
                this.startGameLoop();
                
                this.initialized = true;
                this.running = true;
                
                const initTime = performance.now() - startTime;
                console.log(`✅ All systems initialized in ${(initTime / 1000).toFixed(2)}s`);
                console.log('═══════════════════════════════════════════');
                
                // Dispatch ready event
                window.dispatchEvent(new CustomEvent('remasterReady', {
                    detail: { initTime, config }
                }));
                
            } catch (err) {
                console.error('❌ Initialization failed:', err);
                this.handleInitError(err);
            }
        },
        
        async initializeCoreSystems(config) {
            console.log('⚙️  Initializing core systems...');
            
            // Streaming system for zero-load gameplay
            if (window.StreamingSystem) {
                this.systems.streaming = window.StreamingSystem;
                await this.systems.streaming.init({
                    chunkSize: config.chunkSize || 1024,
                    preloadDistance: config.preloadDistance || 2000,
                    memoryBudget: config.memoryBudget || 500 * 1024 * 1024 // 500MB
                });
                console.log('   ✅ Streaming System ready');
            }
            
            // Object pooling
            if (window.ObjectPool) {
                window.ObjectPool.init({
                    maxObjects: config.maxObjects || 1000,
                    cleanupInterval: config.cleanupInterval || 30000
                });
                console.log('   ✅ Object Pool ready');
            }
        },
        
        async initializeRenderer(config) {
            console.log('🎨 Initializing renderer...');
            
            // WebGPU renderer (primary)
            if (window.WebGPURenderer2026) {
                this.systems.renderer = window.WebGPURenderer2026;
                await this.systems.renderer.init({
                    canvas: config.canvas || document.getElementById('game-canvas'),
                    resolution: config.resolution || { width: 3840, height: 2160 }, // 4K
                    vsync: config.vsync !== false,
                    hdr: config.hdr !== false,
                    raytracing: config.raytracing !== false
                });
                console.log('   ✅ WebGPU Renderer ready (4K, Raytracing)');
            } else if (window.WebGLRenderer) {
                // Fallback to WebGL
                this.systems.renderer = window.WebGLRenderer;
                await this.systems.renderer.init(config);
                console.log('   ⚠️  WebGL Renderer fallback activated');
            }
            
            // Post-processing stack
            if (window.PostProcessingStack) {
                this.systems.postProcessing = window.PostProcessingStack;
                await this.systems.postProcessing.init({
                    enabled: config.postProcessing !== false,
                    effects: config.postEffects || ['TAA', 'Bloom', 'DOF', 'FilmGrain', 'ChromaticAberration']
                });
                console.log('   ✅ Post-Processing Stack ready');
            }
        },
        
        async initializePhysics(config) {
            console.log('🔧 Initializing physics...');
            
            // Advanced physics engine
            if (window.AdvancedPhysicsEngine) {
                this.systems.physics = window.AdvancedPhysicsEngine;
                await this.systems.physics.init({
                    gravity: config.gravity || { x: 0, y: 9.81, z: 0 },
                    substeps: config.physicsSubsteps || 4,
                    softBody: config.softBody !== false,
                    destruction: config.destruction !== false,
                    fluid: config.fluid !== false
                });
                console.log('   ✅ Advanced Physics Engine ready (Soft Body, Destruction, Fluid)');
            }
        },
        
        async initializeAudio(config) {
            console.log('🔊 Initializing audio...');
            
            // Spatial audio 3D
            if (window.SpatialAudio3D_Enhanced) {
                this.systems.audio = window.SpatialAudio3D_Enhanced;
                await this.systems.audio.init({
                    hrtf: config.hrtf !== false,
                    reverb: config.reverb !== false,
                    occlusion: config.occlusion !== false,
                    maxSources: config.maxAudioSources || 64
                });
                console.log('   ✅ Spatial Audio 3D ready (HRTF, Reverb, Occlusion)');
            }
        },
        
        async initializeAI(config) {
            console.log('🧠 Initializing AI...');
            
            // Neural AI from Phase 3
            if (window.NeuralAI) {
                this.systems.ai = window.NeuralAI;
                await this.systems.ai.init();
                console.log('   ✅ Neural AI ready (TensorFlow.js)');
            }
            
            // Emotional AI enhancement
            if (window.EmotionalAI_Enhanced) {
                window.EmotionalAI_Enhanced.init(config.emotionalAI || {});
                console.log('   ✅ Emotional AI enhanced');
            }
        },
        
        async initializeHorrorDirector(config) {
            console.log('😱 Initializing Horror Director...');
            
            // Master Horror Director - controls pacing and scares
            if (window.HorrorDirector) {
                this.systems.horrorDirector = window.HorrorDirector;
                await this.systems.horrorDirector.init({
                    playerProfile: config.playerProfile || {},
                    intensity: config.intensity || 0.5,
                    pacingEnabled: config.pacing !== false,
                    metaHorror: config.metaHorror !== false,
                    adaptiveDifficulty: config.adaptiveDifficulty !== false
                });
                console.log('   ✅ Horror Director ready (Adaptive Pacing, Meta Horror)');
            }
        },
        
        // Main game loop
        startGameLoop() {
            this.lastFrameTime = performance.now();
            this.frameCount = 0;
            
            const loop = (currentTime) => {
                if (!this.running) return;
                
                const deltaTime = (currentTime - this.lastFrameTime) / 1000;
                this.lastFrameTime = currentTime;
                this.frameCount++;
                
                // Update all systems
                this.update(deltaTime, currentTime);
                
                // Render
                this.render(deltaTime);
                
                // Performance monitoring
                this.updatePerformanceMetrics(currentTime);
                
                requestAnimationFrame(loop);
            };
            
            requestAnimationFrame(loop);
            console.log('🎬 Game loop started');
        },
        
        update(deltaTime, time) {
            // Update Horror Director (controls pacing)
            if (this.systems.horrorDirector) {
                this.systems.horrorDirector.update(deltaTime);
            }
            
            // Update physics (with substeps for stability)
            if (this.systems.physics) {
                const substeps = 4;
                const subDelta = deltaTime / substeps;
                for (let i = 0; i < substeps; i++) {
                    this.systems.physics.update(subDelta);
                }
            }
            
            // Update AI
            if (this.systems.ai) {
                this.systems.ai.update(deltaTime);
            }
            
            // Update streaming system
            if (this.systems.streaming) {
                this.systems.streaming.update(deltaTime);
            }
            
            // Update post-processing
            if (this.systems.postProcessing) {
                this.systems.postProcessing.update(deltaTime);
            }
        },
        
        render(deltaTime) {
            if (!this.systems.renderer) return;
            
            // Begin frame
            this.systems.renderer.beginFrame(deltaTime);
            
            // Render geometry
            this.systems.renderer.renderGeometry();
            
            // Apply post-processing
            if (this.systems.postProcessing) {
                this.systems.postProcessing.render();
            }
            
            // End frame
            this.systems.renderer.endFrame();
        },
        
        updatePerformanceMetrics(currentTime) {
            // Calculate FPS every second
            if (this.frameCount % 60 === 0) {
                this.performanceMetrics.fps = Math.round(1 / ((currentTime - this.lastFrameTime) / 1000 / 60));
                this.performanceMetrics.frameTime = 1000 / this.performanceMetrics.fps;
                
                // Memory usage
                if (performance.memory) {
                    this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
                }
                
                // Log performance periodically
                if (this.frameCount % 3600 === 0) { // Every minute
                    console.log(`📊 Performance: ${this.performanceMetrics.fps} FPS, ${this.performanceMetrics.frameTime.toFixed(2)}ms, ${this.performanceMetrics.memoryUsage.toFixed(1)}MB`);
                }
            }
        },
        
        handleInitError(err) {
            window.dispatchEvent(new CustomEvent('initError', {
                detail: { error: err, message: 'Failed to initialize Hellaphobia 2026 Remaster' }
            }));
            
            // Attempt graceful degradation
            this.attemptFallback();
        },
        
        attemptFallback() {
            console.log('⚠️  Attempting fallback configuration...');
            
            // Disable advanced features one by one
            const fallbackConfig = {
                raytracing: false,
                softBody: false,
                hrtf: false,
                postProcessing: false
            };
            
            this.init(fallbackConfig);
        },
        
        // Get system by name
        getSystem(name) {
            return this.systems[name] || null;
        },
        
        // Check if all systems are ready
        isReady() {
            return this.initialized && this.running;
        },
        
        // Get performance metrics
        getMetrics() {
            return { ...this.performanceMetrics };
        },
        
        // Shutdown all systems
        async shutdown() {
            console.log('🛑 Shutting down systems...');
            this.running = false;
            
            for (const [name, system] of Object.entries(this.systems)) {
                if (system && typeof system.shutdown === 'function') {
                    await system.shutdown();
                }
            }
            
            this.initialized = false;
            console.log('✅ All systems shut down');
        },
        
        exportAPI() {
            return {
                init: (config) => this.init(config),
                getSystem: (name) => this.getSystem(name),
                isReady: () => this.isReady(),
                getMetrics: () => this.getMetrics(),
                shutdown: () => this.shutdown()
            };
        }
    };
    
    // Export to window
    window.MainIntegration = MainIntegration.exportAPI();
    
    console.log('🎮 Hellaphobia 2026 Remaster - Integration System loaded');
})();
