/* ============================================
   Performance Optimizer
   Universal performance utilities for ALL games
   - Spatial partitioning (Grid, QuadTree)
   - Object pooling
   - LOD system
   - Frame rate management
   - Performance monitoring
   ============================================ */

const PerformanceOptimizer = (function () {
    'use strict';

    // ── Configuration ─────────────────────────────────────
    const CONFIG = {
        targetFPS: 60,
        minDelta: 0.001,
        maxDelta: 0.1,
        enableProfiling: false,
    };

    // ── Spatial Grid (2D) ───────────────────────────────────
    class SpatialGrid {
        /**
         * Create a spatial grid for O(1) proximity queries
         * @param {number} width - World width
         * @param {number} height - World height
         * @param {number} cellSize - Size of each cell
         */
        constructor(width, height, cellSize = 100) {
            this.width = width;
            this.height = height;
            this.cellSize = cellSize;
            this.cols = Math.ceil(width / cellSize);
            this.rows = Math.ceil(height / cellSize);
            this.grid = new Map();
        }

        /**
         * Clear all entities from grid
         */
        clear() {
            this.grid.clear();
        }

        /**
         * Get cell key from position
         */
        _getKey(x, y) {
            const col = Math.floor(x / this.cellSize);
            const row = Math.floor(y / this.cellSize);
            return `${col},${row}`;
        }

        /**
         * Insert entity into grid
         * @param {Object} entity - Entity with x, y properties
         */
        insert(entity) {
            if (!entity || entity.x === undefined || entity.y === undefined) return;

            const key = this._getKey(entity.x, entity.y);

            if (!this.grid.has(key)) {
                this.grid.set(key, []);
            }
            this.grid.get(key).push(entity);
        }

        /**
         * Get entities in same cell and adjacent cells
         * @param {number} x - X position
         * @param {number} y - Y position
         * @param {number} range - Cell range (1 = adjacent)
         */
        getNearby(x, y, range = 1) {
            const col = Math.floor(x / this.cellSize);
            const row = Math.floor(y / this.cellSize);
            const results = [];

            for (let dc = -range; dc <= range; dc++) {
                for (let dr = -range; dr <= range; dr++) {
                    const key = `${col + dc},${row + dr}`;
                    const cell = this.grid.get(key);
                    if (cell) {
                        results.push(...cell);
                    }
                }
            }

            return results;
        }

        /**
         * Query entities within radius
         * @param {number} x - Center X
         * @param {number} y - Center Y
         * @param {number} radius - Query radius
         */
        queryRadius(x, y, radius) {
            const cellRange = Math.ceil(radius / this.cellSize);
            const nearby = this.getNearby(x, y, cellRange);
            const radiusSq = radius * radius;

            return nearby.filter(entity => {
                const dx = entity.x - x;
                const dy = entity.y - y;
                return (dx * dx + dy * dy) <= radiusSq;
            });
        }

        /**
         * Update entity position in grid
         */
        update(entity, oldX, oldY) {
            const oldKey = this._getKey(oldX, oldY);
            const newKey = this._getKey(entity.x, entity.y);

            if (oldKey === newKey) return;

            // Remove from old cell
            const oldCell = this.grid.get(oldKey);
            if (oldCell) {
                const idx = oldCell.indexOf(entity);
                if (idx !== -1) oldCell.splice(idx, 1);
            }

            // Insert into new cell
            this.insert(entity);
        }
    }

    // ── QuadTree (for more precise spatial queries) ──────────
    class QuadTree {
        constructor(bounds, maxObjects = 10, maxLevels = 5, level = 0) {
            this.bounds = bounds;       // { x, y, width, height }
            this.maxObjects = maxObjects;
            this.maxLevels = maxLevels;
            this.level = level;
            this.objects = [];
            this.nodes = [];
        }

        clear() {
            this.objects = [];
            for (let i = 0; i < this.nodes.length; i++) {
                if (this.nodes[i]) this.nodes[i].clear();
            }
            this.nodes = [];
        }

        split() {
            const x = this.bounds.x;
            const y = this.bounds.y;
            const hw = this.bounds.width / 2;
            const hh = this.bounds.height / 2;

            this.nodes = [
                new QuadTree({ x: x + hw, y: y, width: hw, height: hh }, this.maxObjects, this.maxLevels, this.level + 1),
                new QuadTree({ x: x, y: y, width: hw, height: hh }, this.maxObjects, this.maxLevels, this.level + 1),
                new QuadTree({ x: x, y: y + hh, width: hw, height: hh }, this.maxObjects, this.maxLevels, this.level + 1),
                new QuadTree({ x: x + hw, y: y + hh, width: hw, height: hh }, this.maxObjects, this.maxLevels, this.level + 1)
            ];
        }

        getIndex(rect) {
            const vmid = this.bounds.y + this.bounds.height / 2;
            const hmid = this.bounds.x + this.bounds.width / 2;

            const top = rect.y < vmid;
            const bottom = rect.y + rect.height > vmid;
            const left = rect.x < hmid;
            const right = rect.x + rect.width > hmid;

            if (top && right) return 0;
            if (top && left) return 1;
            if (bottom && left) return 2;
            if (bottom && right) return 3;
            return -1;
        }

        insert(rect) {
            if (this.nodes.length) {
                const index = this.getIndex(rect);
                if (index !== -1) {
                    this.nodes[index].insert(rect);
                    return;
                }
            }

            this.objects.push(rect);

            if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
                if (!this.nodes.length) this.split();

                for (let i = this.objects.length - 1; i >= 0; i--) {
                    const index = this.getIndex(this.objects[i]);
                    if (index !== -1) {
                        this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                    }
                }
            }
        }

        retrieve(rect) {
            let results = [...this.objects];

            if (this.nodes.length) {
                const index = this.getIndex(rect);
                if (index !== -1) {
                    results = results.concat(this.nodes[index].retrieve(rect));
                } else {
                    for (let i = 0; i < this.nodes.length; i++) {
                        results = results.concat(this.nodes[i].retrieve(rect));
                    }
                }
            }

            return results;
        }
    }

    // ── Object Pool ──────────────────────────────────────────
    class ObjectPool {
        /**
         * Create an object pool
         * @param {Function} factory - Function to create new objects
         * @param {Function} reset - Function to reset objects (optional)
         * @param {number} initialSize - Initial pool size
         */
        constructor(factory, reset = null, initialSize = 100) {
            this.factory = factory;
            this.reset = reset || ((obj) => obj);
            this.pool = [];
            this.active = new Set();

            // Pre-populate
            this.prewarm(initialSize);
        }

        prewarm(count) {
            for (let i = 0; i < count; i++) {
                this.pool.push(this.factory());
            }
        }

        /**
         * Get an object from the pool
         */
        get() {
            let obj;
            if (this.pool.length > 0) {
                obj = this.pool.pop();
            } else {
                obj = this.factory();
            }
            this.reset(obj);
            this.active.add(obj);
            return obj;
        }

        /**
         * Return an object to the pool
         */
        release(obj) {
            if (this.active.has(obj)) {
                this.active.delete(obj);
                this.pool.push(obj);
            }
        }

        /**
         * Release all active objects
         */
        releaseAll() {
            for (const obj of this.active) {
                this.pool.push(obj);
            }
            this.active.clear();
        }

        /**
         * Get active count
         */
        getActiveCount() {
            return this.active.size;
        }

        /**
         * Get pool size
         */
        getPoolSize() {
            return this.pool.length;
        }
    }

    // ── Particle System with Pooling ─────────────────────────
    class ParticleSystem {
        constructor(maxParticles = 500) {
            this.maxParticles = maxParticles;
            this.particles = [];
            this.pool = new ObjectPool(
                () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', alpha: 1 }),
                (p) => { p.life = 0; p.x = 0; p.y = 0; return p; },
                maxParticles
            );
        }

        /**
         * Spawn a particle
         */
        spawn(config) {
            if (this.particles.length >= this.maxParticles) return null;

            const p = this.pool.get();
            Object.assign(p, config);
            p.maxLife = p.maxLife || p.life;
            this.particles.push(p);
            return p;
        }

        /**
         * Spawn multiple particles
         */
        spawnBurst(x, y, count, config) {
            for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = config.speed * (0.5 + Math.random() * 0.5);
                this.spawn({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    ...config
                });
            }
        }

        /**
         * Update all particles
         */
        update(dt) {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;

                if (p.gravity) p.vy += p.gravity * dt;
                if (p.friction) {
                    p.vx *= (1 - p.friction * dt);
                    p.vy *= (1 - p.friction * dt);
                }

                p.alpha = Math.max(0, p.life / p.maxLife);

                if (p.life <= 0) {
                    this.pool.release(p);
                    this.particles.splice(i, 1);
                }
            }
        }

        /**
         * Render particles
         */
        render(ctx) {
            for (const p of this.particles) {
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                const size = p.size * p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        /**
         * Clear all particles
         */
        clear() {
            for (const p of this.particles) {
                this.pool.release(p);
            }
            this.particles.length = 0;
        }
    }

    // ── Level of Detail (LOD) System ──────────────────────────
    class LODSystem {
        constructor() {
            this.levels = [];  // [{ distance, fn }]
            this.defaultLevel = null;
        }

        /**
         * Add a LOD level
         * @param {number} maxDistance - Max distance for this LOD
         * @param {Function} renderFn - Render function
         */
        addLevel(maxDistance, renderFn) {
            this.levels.push({ maxDistance, renderFn });
            this.levels.sort((a, b) => a.maxDistance - b.maxDistance);
        }

        /**
         * Set default render function
         */
        setDefault(fn) {
            this.defaultLevel = fn;
        }

        /**
         * Render object with appropriate LOD
         */
        render(obj, cameraPos) {
            if (!obj.x !== undefined) {
                this.defaultLevel?.(obj);
                return;
            }

            const dx = (obj.x || 0) - (cameraPos.x || 0);
            const dy = (obj.y || 0) - (cameraPos.y || 0);
            const dist = Math.sqrt(dx * dx + dy * dy);

            for (const level of this.levels) {
                if (dist <= level.maxDistance) {
                    level.renderFn(obj);
                    return;
                }
            }

            this.defaultLevel?.(obj);
        }
    }

    // ── Frame Rate Manager ────────────────────────────────────
    class FrameRateManager {
        constructor(targetFPS = 60) {
            this.targetFPS = targetFPS;
            this.frameTime = 1000 / targetFPS;
            this.lastTime = 0;
            this.accumulator = 0;
            this.deltaTime = 0;
            this.fps = 0;
            this.frameCount = 0;
            this.fpsUpdateTime = 0;
            this.isPaused = false;
            this.timeScale = 1;
            this.frameSkip = 0;
            this.maxFrameSkip = 5;
        }

        /**
         * Start frame timing
         */
        startFrame(timestamp) {
            if (this.lastTime === 0) {
                this.lastTime = timestamp;
                return 0;
            }

            let delta = (timestamp - this.lastTime) / 1000;
            this.lastTime = timestamp;

            // Clamp delta
            delta = Math.max(CONFIG.minDelta, Math.min(CONFIG.maxDelta, delta));

            // Apply time scale
            this.deltaTime = delta * this.timeScale;

            // FPS calculation
            this.frameCount++;
            this.fpsUpdateTime += delta;
            if (this.fpsUpdateTime >= 1) {
                this.fps = Math.round(this.frameCount / this.fpsUpdateTime);
                this.frameCount = 0;
                this.fpsUpdateTime = 0;
            }

            return this.deltaTime;
        }

        /**
         * Get fixed timestep for physics
         */
        getFixedDelta() {
            return 1 / this.targetFPS;
        }

        /**
         * Get current FPS
         */
        getFPS() {
            return this.fps;
        }

        /**
         * Set time scale (slow-mo / fast-forward)
         */
        setTimeScale(scale) {
            this.timeScale = Math.max(0.1, Math.min(5, scale));
        }

        /**
         * Check if we should render this frame
         */
        shouldRender() {
            return this.frameSkip < this.maxFrameSkip;
        }
    }

    // ── Performance Monitor ───────────────────────────────────
    class PerformanceMonitor {
        constructor() {
            this.metrics = new Map();
            this.enabled = false;
            this.panel = null;
        }

        enable() {
            this.enabled = true;
            this.createPanel();
        }

        disable() {
            this.enabled = false;
            if (this.panel) {
                this.panel.style.display = 'none';
            }
        }

        createPanel() {
            if (this.panel) return;

            this.panel = document.createElement('div');
            this.panel.id = 'perf-monitor';
            this.panel.style.cssText = `
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(0,0,0,0.8);
                color: #0f0;
                font-family: monospace;
                font-size: 12px;
                padding: 10px;
                border-radius: 4px;
                z-index: 99999;
                pointer-events: none;
            `;
            document.body.appendChild(this.panel);
        }

        /**
         * Start timing a metric
         */
        startMeasure(name) {
            if (!this.enabled) return;
            const metric = this.metrics.get(name) || { total: 0, count: 0, max: 0 };
            metric.startTime = performance.now();
            this.metrics.set(name, metric);
        }

        /**
         * End timing a metric
         */
        endMeasure(name) {
            if (!this.enabled) return;
            const metric = this.metrics.get(name);
            if (metric && metric.startTime) {
                const duration = performance.now() - metric.startTime;
                metric.total += duration;
                metric.count++;
                metric.max = Math.max(metric.max, duration);
                metric.avg = metric.total / metric.count;
                metric.startTime = null;
            }
        }

        /**
         * Update display panel
         */
        update() {
            if (!this.enabled || !this.panel) return;

            let html = `<div style="color:#ff0">FPS: ${frameManager?.getFPS() || 0}</div>`;
            html += `<div style="color:#0ff">Memory: ${this.getMemoryMB()} MB</div>`;
            html += '<hr style="border-color:#333;margin:4px 0">';
            
            for (const [name, metric] of this.metrics) {
                if (metric.count > 0) {
                    html += `<div>${name}: ${metric.avg.toFixed(2)}ms (${metric.max.toFixed(1)}max)</div>`;
                }
            }

            this.panel.innerHTML = html;
        }

        getMemoryMB() {
            if (performance.memory) {
                return Math.round(performance.memory.usedJSHeapSize / 1048576);
            }
            return '?';
        }

        /**
         * Reset metrics
         */
        reset() {
            this.metrics.clear();
        }
    }

    // ── Batch Renderer (for sprites/tiles) ────────────────────
    class BatchRenderer {
        constructor(ctx) {
            this.ctx = ctx;
            this.batches = new Map();
        }

        /**
         * Add item to batch
         */
        add(textureKey, x, y, w, h, options = {}) {
            if (!this.batches.has(textureKey)) {
                this.batches.set(textureKey, []);
            }
            this.batches.get(textureKey).push({ x, y, w, h, ...options });
        }

        /**
         * Flush all batches
         */
        flush() {
            for (const [textureKey, items] of this.batches) {
                this.ctx.fillStyle = textureKey; // For colored rectangles
                for (const item of items) {
                    if (item.color) this.ctx.fillStyle = item.color;
                    this.ctx.fillRect(item.x, item.y, item.w, item.h);
                }
            }
            this.batches.clear();
        }

        /**
         * Clear without rendering
         */
        clear() {
            this.batches.clear();
        }
    }

    // ── Collision Detection Optimizations ────────────────────
    const Collision = {
        /**
         * Broad phase: AABB check
         */
        AABB(a, b) {
            return a.x < b.x + b.w &&
                   a.x + a.w > b.x &&
                   a.y < b.y + b.h &&
                   a.y + a.h > b.y;
        },

        /**
         * Circle collision
         */
        circleCircle(x1, y1, r1, x2, y2, r2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const distSq = dx * dx + dy * dy;
            const radiusSum = r1 + r2;
            return distSq <= radiusSum * radiusSum;
        },

        /**
         * Point in circle
         */
        pointInCircle(px, py, cx, cy, r) {
            const dx = px - cx;
            const dy = py - cy;
            return dx * dx + dy * dy <= r * r;
        },

        /**
         * Circle vs AABB
         */
        circleAABB(cx, cy, r, rx, ry, rw, rh) {
            const closestX = Math.max(rx, Math.min(cx, rx + rw));
            const closestY = Math.max(ry, Math.min(cy, ry + rh));
            return this.pointInCircle(closestX, closestY, cx, cy, r);
        }
    };

    // ── Initialize ────────────────────────────────────────────
    let frameManager = null;

    function init() {
        frameManager = new FrameRateManager(CONFIG.targetFPS);
        console.log('[PerformanceOptimizer] Initialized');
    }

    init();

    // ── Public API ────────────────────────────────────────────
    return {
        // Spatial partitioning
        SpatialGrid,
        QuadTree,
        
        // Object pooling
        ObjectPool,
        ParticleSystem,
        
        // LOD
        LODSystem,
        
        // Frame management
        FrameRateManager,
        getFrameManager: () => frameManager,
        
        // Monitoring
        PerformanceMonitor,
        monitor: new PerformanceMonitor(),
        
        // Batch rendering
        BatchRenderer,
        
        // Collision utilities
        Collision,
        
        // Configuration
        setTargetFPS: (fps) => {
            CONFIG.targetFPS = fps;
            if (frameManager) {
                frameManager.targetFPS = fps;
                frameManager.frameTime = 1000 / fps;
            }
        },
        getTargetFPS: () => CONFIG.targetFPS,
        
        // Utilities
        clampDelta: (dt) => Math.max(CONFIG.minDelta, Math.min(CONFIG.maxDelta, dt)),
        
        // Enable performance overlay
        enableProfiling: () => {
            CONFIG.enableProfiling = true;
            PerformanceOptimizer.monitor.enable();
        },
        
        disableProfiling: () => {
            CONFIG.enableProfiling = false;
            PerformanceOptimizer.monitor.disable();
        }
    };
})();

// Export for global access
window.PerformanceOptimizer = PerformanceOptimizer;
window.PerfOpt = PerformanceOptimizer; // Shorthand

// ── Convenience globals ──────────────────────────────────────
window.SpatialGrid = PerformanceOptimizer.SpatialGrid;
window.QuadTree = PerformanceOptimizer.QuadTree;
window.ObjectPool = PerformanceOptimizer.ObjectPool;
window.ParticleSystem = PerformanceOptimizer.ParticleSystem;
window.LODSystem = PerformanceOptimizer.LODSystem;
window.Collision = PerformanceOptimizer.Collision;
