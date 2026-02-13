/* ============================================
   Memory Manager
   Universal memory management for ALL games
   - Three.js disposal
   - Event listener cleanup
   - Particle pooling
   - Gradient caching
   - Garbage collection hints
   ============================================ */

const MemoryManager = (function () {
    'use strict';

    // ── State ──────────────────────────────────────────────
    let _initialized = false;
    let _threeObjects = new Set();       // Three.js objects to track
    let _eventListeners = new Map();     // DOM event listeners
    let _animationFrames = new Set();    // RAF IDs
    let _intervals = new Set();          // setInterval IDs
    let _timeouts = new Set();           // setTimeout IDs
    let _particlePool = [];              // Particle object pool
    let _gradientCache = new Map();      // Cached canvas gradients
    let _disposed = false;

    // ── Configuration ─────────────────────────────────────
    const CONFIG = {
        maxParticles: 500,               // Max pooled particles
        maxGradients: 50,                // Max cached gradients
        gcHintInterval: 30000,           // Hint GC every 30s
        memoryWarningThreshold: 0.8,     // Warn at 80% memory
    };

    // ── Initialization ─────────────────────────────────────
    function init() {
        if (_initialized) return;
        _initialized = true;

        // Setup memory monitoring
        setupMemoryMonitoring();

        // Setup cleanup on page unload
        setupUnloadHandler();

        // Periodic cleanup hints
        setupPeriodicCleanup();

        console.log('[MemoryManager] Initialized');
    }

    // ── Three.js Object Tracking ───────────────────────────
    /**
     * Track a Three.js object for automatic disposal
     */
    function trackThreeObject(obj) {
        if (!obj) return;
        _threeObjects.add(obj);

        // Also track children
        if (obj.children) {
            obj.children.forEach(child => trackThreeObject(child));
        }

        // Track geometry
        if (obj.geometry) {
            _threeObjects.add(obj.geometry);
        }

        // Track material(s)
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => _threeObjects.add(m));
            } else {
                _threeObjects.add(obj.material);
            }
        }

        return obj;
    }

    /**
     * Dispose all tracked Three.js objects
     */
    function disposeThreeObjects() {
        console.log(`[MemoryManager] Disposing ${_threeObjects.size} Three.js objects`);

        _threeObjects.forEach(obj => {
            try {
                // Dispose geometry
                if (obj.geometry && typeof obj.geometry.dispose === 'function') {
                    obj.geometry.dispose();
                }

                // Dispose material(s)
                if (obj.material) {
                    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                    materials.forEach(mat => {
                        if (mat && typeof mat.dispose === 'function') {
                            // Dispose textures
                            if (mat.map) mat.map.dispose?.();
                            if (mat.normalMap) mat.normalMap.dispose?.();
                            if (mat.roughnessMap) mat.roughnessMap.dispose?.();
                            if (mat.metalnessMap) mat.metalnessMap.dispose?.();
                            if (mat.emissiveMap) mat.emissiveMap.dispose?.();
                            if (mat.aoMap) mat.aoMap.dispose?.();
                            if (mat.alphaMap) mat.alphaMap.dispose?.();
                            if (mat.bumpMap) mat.bumpMap.dispose?.();
                            if (mat.displacementMap) mat.displacementMap.dispose?.();
                            if (mat.envMap) mat.envMap.dispose?.();
                            if (mat.lightMap) mat.lightMap.dispose?.();

                            mat.dispose();
                        }
                    });
                }

                // Remove from parent
                if (obj.parent) {
                    obj.parent.remove(obj);
                }

                // Dispose children
                if (obj.children) {
                    while (obj.children.length > 0) {
                        const child = obj.children[0];
                        obj.remove(child);
                    }
                }

            } catch (e) {
                console.warn('[MemoryManager] Error disposing object:', e);
            }
        });

        _threeObjects.clear();

        // Force Three.js cache cleanup
        if (typeof THREE !== 'undefined') {
            THREE.Cache?.clear?.();
        }
    }

    // ── Event Listener Management ──────────────────────────
    /**
     * Add an event listener and track it for cleanup
     */
    function addTrackedListener(target, type, handler, options = {}) {
        target.addEventListener(type, handler, options);

        // Track for cleanup
        const key = `${target.constructor.name}-${type}-${Date.now()}`;
        _eventListeners.set(key, { target, type, handler, options });

        return key;
    }

    /**
     * Remove a specific tracked listener
     */
    function removeTrackedListener(key) {
        const listener = _eventListeners.get(key);
        if (listener) {
            listener.target.removeEventListener(listener.type, listener.handler, listener.options);
            _eventListeners.delete(key);
        }
    }

    /**
     * Remove all tracked event listeners
     */
    function removeAllListeners() {
        console.log(`[MemoryManager] Removing ${_eventListeners.size} event listeners`);

        _eventListeners.forEach((listener, key) => {
            try {
                listener.target.removeEventListener(listener.type, listener.handler, listener.options);
            } catch (e) {
                // Ignore errors during cleanup
            }
        });

        _eventListeners.clear();
    }

    // ── Timer Management ───────────────────────────────────
    function trackAnimationFrame(id) {
        _animationFrames.add(id);
        return id;
    }

    function cancelAllAnimationFrames() {
        _animationFrames.forEach(id => cancelAnimationFrame(id));
        _animationFrames.clear();
    }

    function trackInterval(id) {
        _intervals.add(id);
        return id;
    }

    function trackTimeout(id) {
        _timeouts.add(id);
        return id;
    }

    function cancelAllTimers() {
        _intervals.forEach(id => clearInterval(id));
        _timeouts.forEach(id => clearTimeout(id));
        _intervals.clear();
        _timeouts.clear();
    }

    // ── Particle Pooling ───────────────────────────────────
    /**
     * Get a particle from the pool or create new
     */
    function getParticle(defaults = {}) {
        if (_particlePool.length > 0) {
            const particle = _particlePool.pop();
            Object.assign(particle, defaults, { active: true });
            return particle;
        }
        return { ...defaults, active: true };
    }

    /**
     * Return a particle to the pool
     */
    function returnParticle(particle) {
        if (_particlePool.length >= CONFIG.maxParticles) return;

        // Reset particle
        particle.active = false;
        particle.life = 0;
        particle.vx = 0;
        particle.vy = 0;
        particle.x = 0;
        particle.y = 0;

        _particlePool.push(particle);
    }

    /**
     * Pre-populate the particle pool
     */
    function prewarmParticlePool(count = 200) {
        for (let i = 0; i < count && _particlePool.length < CONFIG.maxParticles; i++) {
            _particlePool.push({ active: false, life: 0, x: 0, y: 0, vx: 0, vy: 0 });
        }
    }

    /**
     * Clear the particle pool
     */
    function clearParticlePool() {
        _particlePool.length = 0;
    }

    // ── Gradient Caching ───────────────────────────────────
    /**
     * Get or create a cached gradient
     */
    function getGradient(ctx, key, creator) {
        // Check cache
        const cached = _gradientCache.get(key);
        if (cached) {
            return cached;
        }

        // Create new gradient
        const gradient = creator(ctx);

        // Cache it
        if (_gradientCache.size >= CONFIG.maxGradients) {
            // Remove oldest
            const firstKey = _gradientCache.keys().next().value;
            _gradientCache.delete(firstKey);
        }

        _gradientCache.set(key, gradient);
        return gradient;
    }

    /**
     * Clear gradient cache
     */
    function clearGradientCache() {
        _gradientCache.clear();
    }

    // ── Common Gradient Creators ────────────────────────────
    const GradientCreators = {
        vignette: (ctx, w, h, color = 'rgba(0,0,0,0.5)') => {
            return getGradient(ctx, `vignette-${w}-${h}`, () => {
                const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.6);
                grd.addColorStop(0, 'transparent');
                grd.addColorStop(1, color);
                return grd;
            });
        },

        flashlight: (ctx, cx, cy, radius) => {
            return getGradient(ctx, `flashlight-${cx}-${cy}-${radius}`, () => {
                const grd = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
                grd.addColorStop(0, 'rgba(200,255,200,0.06)');
                grd.addColorStop(0.5, 'rgba(150,200,150,0.03)');
                grd.addColorStop(1, 'transparent');
                return grd;
            });
        },

        damageFlash: (ctx, w, h, intensity = 0.5) => {
            return getGradient(ctx, `damage-${intensity}`, () => {
                const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
                grd.addColorStop(0, `rgba(255,0,0,${intensity})`);
                grd.addColorStop(1, 'transparent');
                return grd;
            });
        }
    };

    // ── Memory Monitoring ───────────────────────────────────
    function setupMemoryMonitoring() {
        if (!performance.memory) return;

        setInterval(() => {
            const memory = performance.memory;
            const usedPercent = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

            if (usedPercent > CONFIG.memoryWarningThreshold) {
                console.warn(`[MemoryManager] High memory usage: ${Math.round(usedPercent * 100)}%`);

                // Dispatch event for games to react
                window.dispatchEvent(new CustomEvent('memorywarning', {
                    detail: { usedPercent, usedMB: memory.usedJSHeapSize / 1048576 }
                }));

                // Trigger cleanup
                hintGarbageCollection();
            }
        }, 10000);
    }

    function getMemoryUsage() {
        if (!performance.memory) return null;

        return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
            usedPercent: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit,
            usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576),
            totalMB: Math.round(performance.memory.totalJSHeapSize / 1048576)
        };
    }

    // ── Garbage Collection ───────────────────────────────────
    function hintGarbageCollection() {
        // Create and release temporary objects to trigger GC
        const temp = [];
        for (let i = 0; i < 1000; i++) {
            temp.push(new Array(1000).fill(0));
        }
        temp.length = 0;

        console.log('[MemoryManager] GC hinted');
    }

    function setupPeriodicCleanup() {
        setInterval(() => {
            // Clear old gradients
            if (_gradientCache.size > CONFIG.maxGradients / 2) {
                const toDelete = [];
                let i = 0;
                for (const key of _gradientCache.keys()) {
                    if (i++ > CONFIG.maxGradients / 2) break;
                    toDelete.push(key);
                }
                toDelete.forEach(k => _gradientCache.delete(k));
            }

            // Hint GC
            hintGarbageCollection();
        }, CONFIG.gcHintInterval);
    }

    // ── Unload Handler ──────────────────────────────────────
    function setupUnloadHandler() {
        // Beforeunload for cleanup
        window.addEventListener('beforeunload', () => {
            fullCleanup();
        });

        // Pagehide for mobile
        window.addEventListener('pagehide', () => {
            fullCleanup();
        });
    }

    // ── Full Cleanup ────────────────────────────────────────
    function fullCleanup() {
        if (_disposed) return;
        _disposed = true;

        console.log('[MemoryManager] Performing full cleanup');

        // Cancel animation frames
        cancelAllAnimationFrames();

        // Cancel timers
        cancelAllTimers();

        // Remove event listeners
        removeAllListeners();

        // Dispose Three.js objects
        disposeThreeObjects();

        // Clear caches
        clearGradientCache();
        clearParticlePool();

        // Clear tracking sets
        _threeObjects.clear();
        _animationFrames.clear();
        _intervals.clear();
        _timeouts.clear();
    }

    /**
     * Reset for game restart
     */
    function reset() {
        console.log('[MemoryManager] Resetting for game restart');

        // Cancel animation frames
        cancelAllAnimationFrames();

        // Cancel timers
        cancelAllTimers();

        // Dispose Three.js objects
        disposeThreeObjects();

        // Clear caches (keep particle pool for performance)
        clearGradientCache();

        // Remove event listeners (but keep essential ones)
        // Don't call removeAllListeners() as it would break the manager itself

        // Hint GC
        hintGarbageCollection();
    }

    // ── Public API ────────────────────────────────────────
    return {
        init,
        
        // Three.js
        trackThreeObject,
        disposeThreeObjects,
        
        // Event listeners
        addTrackedListener,
        removeTrackedListener,
        removeAllListeners,
        
        // Timers
        trackAnimationFrame,
        trackInterval,
        trackTimeout,
        cancelAllAnimationFrames,
        cancelAllTimers,
        
        // Particle pooling
        getParticle,
        returnParticle,
        prewarmParticlePool,
        clearParticlePool,
        
        // Gradients
        getGradient,
        clearGradientCache,
        GradientCreators,
        
        // Memory
        getMemoryUsage,
        hintGarbageCollection,
        
        // Lifecycle
        fullCleanup,
        reset,
        
        // Stats
        getStats: () => ({
            threeObjects: _threeObjects.size,
            eventListeners: _eventListeners.size,
            animationFrames: _animationFrames.size,
            timers: _intervals.size + _timeouts.size,
            pooledParticles: _particlePool.length,
            cachedGradients: _gradientCache.size
        })
    };
})();

// Auto-initialize
MemoryManager.init();

// Export for global access
window.MemoryManager = MemoryManager;
window.MemMgr = MemoryManager; // Shorthand

// ── Convenience wrapper for game.js integration ───────────────
window.withMemoryTracking = function (gameInit, gameDispose) {
    return {
        init: function () {
            MemoryManager.init();
            return gameInit.apply(this, arguments);
        },
        dispose: function () {
            if (gameDispose) gameDispose.apply(this, arguments);
            MemoryManager.reset();
        }
    };
};
