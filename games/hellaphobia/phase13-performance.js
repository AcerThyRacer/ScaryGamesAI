/* ============================================================
   HELLAPHOBIA - PHASE 13: PERFORMANCE OPTIMIZATION
   60 FPS | Mobile Optimization | Memory Management | LOD
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 13: PERFORMANCE CONFIG =====
    const PERF_CONFIG = {
        TARGET_FPS: 60,
        MIN_FPS: 30,
        MAX_FRAME_TIME: 1000 / 30, // ms
        MOBILE_TARGET_FPS: 60,
        MOBILE_MAX_FPS: 60,
        MEMORY_BUDGET: 100 * 1024 * 1024, // 100MB
        GC_TRIGGER_THRESHOLD: 80 * 1024 * 1024, // 80MB
        LOD_DISTANCE_THRESHOLDS: [200, 400, 800],
        ASSET_STREAM_DISTANCE: 1000,
        BATCH_SIZE: 100,
        POOL_SIZES: {
            particles: 500,
            projectiles: 50,
            enemies: 30,
            items: 20
        }
    };

    // ===== PHASE 13: PERFORMANCE MONITOR =====
    const PerformanceMonitor = {
        fps: 60,
        frameTime: 0,
        frameCount: 0,
        lastFpsUpdate: 0,
        fpsHistory: [],
        minFps: 60,
        maxFps: 0,
        avgFps: 60,

        // Memory tracking
        usedMemory: 0,
        peakMemory: 0,

        // Entity counts
        entityCounts: {
            particles: 0,
            projectiles: 0,
            enemies: 0,
            tiles: 0
        },

        init() {
            this.lastFpsUpdate = performance.now();
            this.startMemoryTracking();
            console.log('Phase 13: Performance Monitor initialized');
        },

        // Update performance metrics
        update(timestamp) {
            this.frameCount++;

            // Update FPS every second
            if (timestamp - this.lastFpsUpdate >= 1000) {
                this.fps = this.frameCount;
                this.fpsHistory.push(this.fps);

                // Keep last 60 seconds
                if (this.fpsHistory.length > 60) {
                    this.fpsHistory.shift();
                }

                // Calculate stats
                this.minFps = Math.min(...this.fpsHistory);
                this.maxFps = Math.max(...this.fpsHistory);
                this.avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

                this.frameCount = 0;
                this.lastFpsUpdate = timestamp;

                // Log if FPS drops below threshold
                if (this.fps < PERF_CONFIG.MIN_FPS) {
                    console.warn(`[Performance] FPS dropped to ${this.fps}`);
                    this.triggerOptimization();
                }
            }

            // Track memory
            this.updateMemory();

            // Track entity counts
            this.updateEntityCounts();
        },

        // Start memory tracking
        startMemoryTracking() {
            if (performance.memory) {
                setInterval(() => {
                    this.usedMemory = performance.memory.usedJSHeapSize;
                    this.peakMemory = Math.max(this.peakMemory, this.usedMemory);

                    // Trigger GC if approaching budget
                    if (this.usedMemory > PERF_CONFIG.GC_TRIGGER_THRESHOLD) {
                        this.triggerGarbageCollection();
                    }
                }, 5000);
            }
        },

        // Update memory tracking
        updateMemory() {
            if (performance.memory) {
                this.usedMemory = performance.memory.usedJSHeapSize;
            }
        },

        // Update entity counts
        updateEntityCounts() {
            if (typeof window.particles !== 'undefined') {
                this.entityCounts.particles = window.particles.length;
            }
            if (typeof window.bossProjectiles !== 'undefined') {
                this.entityCounts.projectiles = window.bossProjectiles.length;
            }
            if (typeof window.monsters !== 'undefined') {
                this.entityCounts.enemies = window.monsters.length;
            }
            if (typeof window.levelTiles !== 'undefined') {
                this.entityCounts.tiles = window.levelTiles.length;
            }
        },

        // Trigger optimization when FPS drops
        triggerOptimization() {
            console.log('[Performance] Triggering optimization...');

            // Reduce particle count
            if (this.entityCounts.particles > 200) {
                if (typeof window.particles !== 'undefined') {
                    window.particles.splice(100);
                }
            }

            // Reduce entity updates
            if (typeof Phase13Performance !== 'undefined') {
                Phase13Performance.setQualityLevel('medium');
            }
        },

        // Trigger garbage collection
        triggerGarbageCollection() {
            console.log('[Performance] Memory high, triggering cleanup...');

            // Clear unused assets
            if (typeof AssetStreamer !== 'undefined') {
                AssetStreamer.clearCache();
            }

            // Reduce pool sizes temporarily
            ObjectPool.reduceAll(0.5);
        },

        // Get performance report
        getReport() {
            return {
                fps: {
                    current: this.fps,
                    min: this.minFps,
                    max: this.maxFps,
                    avg: this.avgFps
                },
                memory: {
                    used: Math.round(this.usedMemory / 1024 / 1024) + ' MB',
                    peak: Math.round(this.peakMemory / 1024 / 1024) + ' MB',
                    budget: Math.round(PERF_CONFIG.MEMORY_BUDGET / 1024 / 1024) + ' MB'
                },
                entities: { ...this.entityCounts },
                quality: QualityManager.getCurrentQuality()
            };
        }
    };

    // ===== PHASE 13: QUALITY MANAGER =====
    const QualityManager = {
        currentQuality: 'high',
        qualityLevels: {
            low: {
                particles: 100,
                shadows: false,
                lighting: false,
                antiAliasing: false,
                textureQuality: 0.5,
                renderDistance: 400,
                updateDistance: 600
            },
            medium: {
                particles: 250,
                shadows: true,
                lighting: true,
                antiAliasing: false,
                textureQuality: 0.75,
                renderDistance: 600,
                updateDistance: 800
            },
            high: {
                particles: 500,
                shadows: true,
                lighting: true,
                antiAliasing: true,
                textureQuality: 1.0,
                renderDistance: 800,
                updateDistance: 1000
            },
            ultra: {
                particles: 1000,
                shadows: true,
                lighting: true,
                antiAliasing: true,
                textureQuality: 1.0,
                renderDistance: 1200,
                updateDistance: 1500
            }
        },

        init() {
            this.autoDetectQuality();
            console.log('Phase 13: Quality Manager initialized');
        },

        // Auto-detect quality based on device
        autoDetectQuality() {
            const isMobile = this.isMobileDevice();
            const hasWebGL2 = this.hasWebGL2();
            const gpuMemory = this.estimateGPUMemory();

            if (isMobile) {
                this.setQualityLevel('medium');
            } else if (gpuMemory < 1024) {
                this.setQualityLevel('low');
            } else if (gpuMemory < 2048) {
                this.setQualityLevel('medium');
            } else if (gpuMemory < 4096) {
                this.setQualityLevel('high');
            } else {
                this.setQualityLevel('ultra');
            }
        },

        // Check if mobile device
        isMobileDevice() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        },

        // Check WebGL2 support
        hasWebGL2() {
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl2');
                return gl !== null;
            } catch (e) {
                return false;
            }
        },

        // Estimate GPU memory
        estimateGPUMemory() {
            // Rough estimate based on device type
            if (this.isMobileDevice()) {
                return 1024; // 1GB typical for mobile
            }
            return 4096; // 4GB typical for desktop
        },

        // Set quality level
        setQualityLevel(level) {
            if (!this.qualityLevels[level]) return;

            this.currentQuality = level;
            const settings = this.qualityLevels[level];

            // Apply settings
            this.applyQualitySettings(settings);

            EventTracker.track('quality_changed', { level });

            console.log(`[Quality] Set to: ${level}`);
        },

        // Apply quality settings
        applyQualitySettings(settings) {
            // Update particle limit
            PERF_CONFIG.POOL_SIZES.particles = settings.particles;

            // Update LOD distances
            PERF_CONFIG.LOD_DISTANCE_THRESHOLDS = [
                settings.renderDistance * 0.25,
                settings.renderDistance * 0.5,
                settings.renderDistance
            ];

            // Update canvas settings
            const canvas = document.getElementById('game-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');

                // Anti-aliasing
                ctx.imageSmoothingEnabled = settings.antiAliasing;

                // Texture quality
                if (settings.textureQuality < 1.0) {
                    canvas.style.imageRendering = 'pixelated';
                } else {
                    canvas.style.imageRendering = 'auto';
                }
            }

            // Update global quality flags
            window.QUALITY_SETTINGS = settings;
        },

        // Get current quality
        getCurrentQuality() {
            return this.currentQuality;
        },

        // Get quality settings
        getQualitySettings() {
            return this.qualityLevels[this.currentQuality];
        }
    };

    // ===== PHASE 13: LEVEL OF DETAIL (LOD) SYSTEM =====
    const LODSystem = {
        lodLevels: {
            0: { scale: 1.0, detail: 'full', updateRate: 1 },
            1: { scale: 0.75, detail: 'medium', updateRate: 2 },
            2: { scale: 0.5, detail: 'low', updateRate: 4 },
            3: { scale: 0.25, detail: 'minimal', updateRate: 8 }
        },

        init() {
            console.log('Phase 13: LOD System initialized');
        },

        // Get LOD level for entity
        getLODLevel(entity, camera) {
            const dx = (entity.x + entity.width/2) - (camera.x + camera.width/2);
            const dy = (entity.y + entity.height/2) - (camera.y + camera.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            const thresholds = PERF_CONFIG.LOD_DISTANCE_THRESHOLDS;

            if (distance < thresholds[0]) return 0;
            if (distance < thresholds[1]) return 1;
            if (distance < thresholds[2]) return 2;
            return 3;
        },

        // Apply LOD to entity rendering
        applyLOD(entity, lodLevel, ctx) {
            const lod = this.lodLevels[lodLevel];

            ctx.save();

            // Scale based on LOD
            if (lod.scale < 1.0) {
                const centerX = entity.x + entity.width/2;
                const centerY = entity.y + entity.height/2;
                ctx.translate(centerX, centerY);
                ctx.scale(lod.scale, lod.scale);
                ctx.translate(-centerX, -centerY);
            }

            // Reduce detail
            if (lod.detail === 'minimal') {
                ctx.globalAlpha = 0.5;
            }

            return lod;
        },

        // Get update rate multiplier
        getUpdateRate(lodLevel) {
            return this.lodLevels[lodLevel].updateRate;
        }
    };

    // ===== PHASE 13: OBJECT POOL SYSTEM =====
    const ObjectPool = {
        pools: {},

        init() {
            this.createPools();
            console.log('Phase 13: Object Pool initialized');
        },

        // Create object pools
        createPools() {
            // Particle pool
            this.pools.particles = this.createPool('particles', PERF_CONFIG.POOL_SIZES.particles, () => ({
                x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#fff', size: 2
            }));

            // Projectile pool
            this.pools.projectiles = this.createPool('projectiles', PERF_CONFIG.POOL_SIZES.projectiles, () => ({
                x: 0, y: 0, vx: 0, vy: 0, damage: 0, type: 'normal'
            }));

            // Enemy pool
            this.pools.enemies = this.createPool('enemies', PERF_CONFIG.POOL_SIZES.enemies, () => ({
                x: 0, y: 0, hp: 0, type: 'basic', active: false
            }));

            // Item pool
            this.pools.items = this.createPool('items', PERF_CONFIG.POOL_SIZES.items, () => ({
                x: 0, y: 0, type: 'item', collected: false
            }));
        },

        // Create a pool
        createPool(name, size, factory) {
            const pool = [];
            for (let i = 0; i < size; i++) {
                const obj = factory();
                obj._poolIndex = i;
                obj._inUse = false;
                pool.push(obj);
            }
            return pool;
        },

        // Get object from pool
        get(poolName) {
            const pool = this.pools[poolName];
            if (!pool) return null;

            // Find inactive object
            for (const obj of pool) {
                if (!obj._inUse) {
                    obj._inUse = true;
                    return obj;
                }
            }

            // Pool exhausted - create new object
            const newObj = pool[0].constructor === Object ? { ...pool[0] } : Object.create(Object.getPrototypeOf(pool[0]));
            newObj._inUse = true;
            pool.push(newObj);

            return newObj;
        },

        // Return object to pool
        release(obj) {
            obj._inUse = false;
        },

        // Release all objects
        releaseAll(poolName) {
            const pool = this.pools[poolName];
            if (pool) {
                pool.forEach(obj => obj._inUse = false);
            }
        },

        // Get pool stats
        getPoolStats(poolName) {
            const pool = this.pools[poolName];
            if (!pool) return null;

            return {
                total: pool.length,
                inUse: pool.filter(o => o._inUse).length,
                available: pool.filter(o => !o._inUse).length
            };
        },

        // Reduce all pools
        reduceAll(factor) {
            for (const poolName in this.pools) {
                const pool = this.pools[poolName];
                const reduceCount = Math.floor(pool.length * (1 - factor));
                if (reduceCount > 0) {
                    // Mark excess objects as inactive
                    for (let i = pool.length - 1; i >= pool.length - reduceCount; i--) {
                        if (!pool[i]._inUse) {
                            pool.splice(i, 1);
                        }
                    }
                }
            }
        },

        // Get all pool stats
        getAllStats() {
            const stats = {};
            for (const poolName in this.pools) {
                stats[poolName] = this.getPoolStats(poolName);
            }
            return stats;
        }
    };

    // ===== PHASE 13: ASSET STREAMER =====
    const AssetStreamer = {
        loadedAssets: new Set(),
        loadingQueue: [],
        cache: new Map(),
        maxCacheSize: 50,

        init() {
            console.log('Phase 13: Asset Streamer initialized');
        },

        // Load asset on demand
        async loadAsset(assetUrl, type = 'image') {
            if (this.loadedAssets.has(assetUrl)) {
                return this.cache.get(assetUrl);
            }

            // Add to queue
            this.loadingQueue.push({ url: assetUrl, type });

            // Load if queue small enough
            if (this.loadingQueue.length <= PERF_CONFIG.BATCH_SIZE) {
                return this.loadFromQueue();
            }

            return null;
        },

        // Load from queue
        async loadFromQueue() {
            if (this.loadingQueue.length === 0) return null;

            const asset = this.loadingQueue.shift();

            try {
                let loaded;

                if (asset.type === 'image') {
                    loaded = await this.loadImage(asset.url);
                } else if (asset.type === 'audio') {
                    loaded = await this.loadAudio(asset.url);
                } else if (asset.type === 'json') {
                    loaded = await this.loadJSON(asset.url);
                }

                this.loadedAssets.add(asset.url);
                this.cache.set(asset.url, loaded);

                // Prune cache if too large
                if (this.cache.size > this.maxCacheSize) {
                    this.pruneCache();
                }

                return loaded;
            } catch (error) {
                console.error('[AssetStreamer] Failed to load:', asset.url, error);
                return null;
            }
        },

        // Load image
        loadImage(url) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = url;
            });
        },

        // Load audio
        loadAudio(url) {
            return new Promise((resolve, reject) => {
                const audio = new Audio();
                audio.oncanplaythrough = () => resolve(audio);
                audio.onerror = reject;
                audio.src = url;
            });
        },

        // Load JSON
        loadJSON(url) {
            return fetch(url).then(r => r.json());
        },

        // Clear cache
        clearCache() {
            const cleared = this.cache.size;
            this.cache.clear();
            console.log(`[AssetStreamer] Cleared ${cleared} assets from cache`);
        },

        // Prune cache (remove oldest)
        pruneCache() {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
                this.loadedAssets.delete(firstKey);
            }
        },

        // Preload assets
        async preloadAssets(urls) {
            const promises = urls.map(url => this.loadAsset(url));
            return Promise.all(promises);
        },

        // Get cache stats
        getStats() {
            return {
                loaded: this.loadedAssets.size,
                queued: this.loadingQueue.length,
                cached: this.cache.size
            };
        }
    };

    // ===== PHASE 13: MOBILE OPTIMIZER =====
    const MobileOptimizer = {
        isMobile: false,
        touchControls: false,
        reducedEffects: false,

        init() {
            this.isMobile = QualityManager.isMobileDevice();

            if (this.isMobile) {
                this.applyMobileOptimizations();
            }

            console.log(`Phase 13: Mobile Optimizer initialized (${this.isMobile ? 'mobile' : 'desktop'})`);
        },

        // Apply mobile optimizations
        applyMobileOptimizations() {
            // Reduce target FPS for older devices
            PERF_CONFIG.TARGET_FPS = PERF_CONFIG.MOBILE_TARGET_FPS;

            // Enable touch controls
            this.touchControls = true;
            if (typeof window.enableTouchControls === 'function') {
                window.enableTouchControls();
            }

            // Reduce effects
            this.reducedEffects = true;

            // Optimize canvas
            this.optimizeCanvas();

            // Optimize audio
            this.optimizeAudio();

            // Prevent zoom
            this.preventZoom();

            // Handle orientation
            this.handleOrientation();
        },

        // Optimize canvas for mobile
        optimizeCanvas() {
            const canvas = document.getElementById('game-canvas');
            if (!canvas) return;

            // Use CSS for scaling instead of canvas resolution
            canvas.width = window.innerWidth * window.devicePixelRatio;
            canvas.height = window.innerHeight * window.devicePixelRatio;

            // Optimize rendering
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
        },

        // Optimize audio for mobile
        optimizeAudio() {
            // Reduce audio quality on mobile
            if (typeof window.setAudioQuality === 'function') {
                window.setAudioQuality('medium');
            }

            // Handle mobile audio autoplay restrictions
            document.addEventListener('touchstart', () => {
                if (typeof window.resumeAudio === 'function') {
                    window.resumeAudio();
                }
            }, { once: true });
        },

        // Prevent zoom on mobile
        preventZoom() {
            document.addEventListener('gesturestart', (e) => {
                e.preventDefault();
            });

            document.addEventListener('dblclick', (e) => {
                e.preventDefault();
            }, { passive: false });
        },

        // Handle orientation change
        handleOrientation() {
            window.addEventListener('orientationchange', () => {
                // Pause game during orientation change
                if (typeof window.togglePause === 'function') {
                    const wasPlaying = window.gameState === 'playing';
                    window.togglePause();

                    // Resume after delay
                    setTimeout(() => {
                        if (wasPlaying) {
                            window.togglePause();
                        }
                    }, 500);
                }
            });
        },

        // Get mobile status
        getMobileStatus() {
            return {
                isMobile: this.isMobile,
                touchControls: this.touchControls,
                reducedEffects: this.reducedEffects
            };
        }
    };

    // ===== PHASE 13: BATCH RENDERER =====
    const BatchRenderer = {
        batches: {},
        batchSize: PERF_CONFIG.BATCH_SIZE,

        init() {
            console.log('Phase 13: Batch Renderer initialized');
        },

        // Add entity to batch
        addToBatch(type, entity) {
            if (!this.batches[type]) {
                this.batches[type] = [];
            }
            this.batches[type].push(entity);
        },

        // Render batch
        renderBatch(type, ctx, camera) {
            const batch = this.batches[type];
            if (!batch || batch.length === 0) return;

            // Sort by y for proper depth
            batch.sort((a, b) => (a.y || 0) - (b.y || 0));

            // Render in batches
            for (let i = 0; i < batch.length; i += this.batchSize) {
                const slice = batch.slice(i, i + this.batchSize);
                slice.forEach(entity => {
                    // Cull off-screen entities
                    if (this.isOnScreen(entity, camera)) {
                        this.renderEntity(type, entity, ctx);
                    }
                });
            }

            // Clear batch
            this.batches[type] = [];
        },

        // Check if entity is on screen
        isOnScreen(entity, camera) {
            const margin = 100;
            return (
                entity.x + (entity.width || 0) > camera.x - margin &&
                entity.x < camera.x + camera.width + margin &&
                entity.y + (entity.height || 0) > camera.y - margin &&
                entity.y < camera.y + camera.height + margin
            );
        },

        // Render single entity
        renderEntity(type, entity, ctx) {
            // Simple rectangle rendering as fallback
            if (entity.color) {
                ctx.fillStyle = entity.color;
                ctx.fillRect(
                    entity.x,
                    entity.y,
                    entity.width || 32,
                    entity.height || 32
                );
            }
        },

        // Clear all batches
        clearAll() {
            this.batches = {};
        }
    };

    // ===== PHASE 13: MAIN PERFORMANCE MANAGER =====
    const Phase13Performance = {
        initialized: false,
        qualityLevel: 'high',

        init() {
            if (this.initialized) return;

            PerformanceMonitor.init();
            QualityManager.init();
            LODSystem.init();
            ObjectPool.init();
            AssetStreamer.init();
            MobileOptimizer.init();
            BatchRenderer.init();

            this.initialized = true;
            this.qualityLevel = QualityManager.getCurrentQuality();

            console.log('Phase 13: Performance Optimization initialized');
        },

        // Update performance
        update(timestamp) {
            PerformanceMonitor.update(timestamp);
        },

        // Set quality level
        setQualityLevel(level) {
            QualityManager.setQualityLevel(level);
            this.qualityLevel = level;
        },

        // Get quality level
        getQualityLevel() {
            return this.qualityLevel;
        },

        // Get performance report
        getPerformanceReport() {
            return {
                fps: PerformanceMonitor.fps,
                memory: PerformanceMonitor.usedMemory,
                quality: this.qualityLevel,
                pools: ObjectPool.getAllStats(),
                assets: AssetStreamer.getStats(),
                mobile: MobileOptimizer.getMobileStatus()
            };
        },

        // Optimize for current performance
        autoOptimize() {
            const fps = PerformanceMonitor.fps;

            if (fps < 30) {
                // Drop quality significantly
                const current = QualityManager.getCurrentQuality();
                if (current === 'ultra') this.setQualityLevel('high');
                else if (current === 'high') this.setQualityLevel('medium');
                else if (current === 'medium') this.setQualityLevel('low');
            } else if (fps > 55) {
                // Can increase quality
                const current = QualityManager.getCurrentQuality();
                if (current === 'low') this.setQualityLevel('medium');
                else if (current === 'medium') this.setQualityLevel('high');
                else if (current === 'high') this.setQualityLevel('ultra');
            }
        },

        // Cleanup resources
        cleanup() {
            ObjectPool.releaseAll('particles');
            ObjectPool.releaseAll('projectiles');
            AssetStreamer.clearCache();
        }
    };

    // Export Phase 13 systems
    window.Phase13Performance = Phase13Performance;
    window.PerformanceMonitor = PerformanceMonitor;
    window.QualityManager = QualityManager;
    window.LODSystem = LODSystem;
    window.ObjectPool = ObjectPool;
    window.AssetStreamer = AssetStreamer;
    window.MobileOptimizer = MobileOptimizer;
    window.BatchRenderer = BatchRenderer;

})();
