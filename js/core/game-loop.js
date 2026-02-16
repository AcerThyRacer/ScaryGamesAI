/**
 * ============================================
 * SGAI Performance Framework - Phase 3: Fixed-Timestep Game Loop
 * ============================================
 * Decoupled physics/rendering for deterministic, stutter-free gameplay.
 * 
 * Key Benefits:
 * - Physics runs at fixed timestep (e.g., 60Hz)
 * - Rendering interpolates for smooth display (e.g., 144Hz)
 * - No physics glitches during frame drops
 * - Consistent gameplay across devices
 */

(function(global) {
    'use strict';

    // ============================================
    // FIXED TIMESTEP ENGINE
    // ============================================

    /**
     * Fixed-timestep game loop with interpolation
     * 
     * @param {Object} options Configuration options
     * @param {number} options.fixedStep Physics step in seconds (default: 1/60)
     * @param {number} options.maxSubSteps Max physics steps per frame (default: 3)
     * @param {boolean} options.interpolate Enable rendering interpolation (default: true)
     * @param {Function} options.onUpdate Physics/logic update callback
     * @param {Function} options.onRender Rendering callback (receives interpolation alpha)
     * @param {Function} options.onLateUpdate Post-physics callbacks
     */
    class FixedTimestepEngine {
        constructor(options = {}) {
            this.fixedStep = options.fixedStep || 1 / 60;
            this.maxSubSteps = options.maxSubSteps || 3;
            this.interpolate = options.interpolate !== false;
            
            this.onUpdate = options.onUpdate || function(dt) {};
            this.onRender = options.onRender || function(alpha) {};
            this.onLateUpdate = options.onLateUpdate || function(dt) {};
            
            // Time tracking
            this.accumulator = 0;
            this.currentTime = 0;
            this.lastTime = 0;
            this.totalTime = 0;
            this.frameCount = 0;
            
            // Interpolation
            this.alpha = 1;
            this.previousState = null;
            this.currentState = null;
            
            // State
            this.running = false;
            this.paused = false;
            this._rafId = null;
            
            // Performance metrics
            this.metrics = {
                fps: 0,
                fpsHistory: [],
                avgFrameTime: 0,
                physicsTime: 0,
                renderTime: 0,
                missedFrames: 0,
                fixedUpdates: 0,
                skippedFixedUpdates: 0
            };
            
            // Debug
            this.debug = options.debug || false;
            
            // Bind methods
            this._loop = this._loop.bind(this);
        }

        /**
         * Start the game loop
         */
        start() {
            if (this.running) return;
            
            this.running = true;
            this.paused = false;
            this.currentTime = performance.now() / 1000;
            this.lastTime = this.currentTime;
            this.accumulator = 0;
            this.totalTime = 0;
            this.frameCount = 0;
            
            this._rafId = requestAnimationFrame(this._loop);
            
            if (this.debug) console.log('[FixedTimestep] Started');
        }

        /**
         * Stop the game loop
         */
        stop() {
            this.running = false;
            if (this._rafId) {
                cancelAnimationFrame(this._rafId);
                this._rafId = null;
            }
            
            if (this.debug) console.log('[FixedTimestep] Stopped');
        }

        /**
         * Pause the loop (keeps RAF but doesn't update)
         */
        pause() {
            this.paused = true;
        }

        /**
         * Resume from pause
         */
        resume() {
            if (!this.paused) return;
            
            this.paused = false;
            this.lastTime = performance.now() / 1000;
            this.accumulator = 0;
            
            if (this.debug) console.log('[FixedTimestep] Resumed');
        }

        /**
         * Main loop (called via RAF)
         */
        _loop(timestamp) {
            if (!this.running) return;
            
            this._rafId = requestAnimationFrame(this._loop);
            
            // Calculate delta time
            const frameStart = performance.now();
            this.currentTime = timestamp / 1000;
            let dt = this.currentTime - this.lastTime;
            this.lastTime = this.currentTime;
            
            // Clamp dt to prevent spiral of death
            if (dt > 0.25) dt = 0.25;
            
            if (this.paused) {
                this.metrics.renderTime = performance.now() - frameStart;
                this.onRender(this.alpha);
                return;
            }
            
            // Update accumulator
            this.accumulator += dt;
            
            // Performance tracking
            const physicsStart = performance.now();
            
            // Fixed timestep physics updates
            let fixedUpdates = 0;
            while (this.accumulator >= this.fixedStep) {
                // Store previous state for interpolation
                if (this.interpolate && fixedUpdates === 0) {
                    this._captureState('previous');
                }
                
                // Run fixed update
                this.onUpdate(this.fixedStep);
                this.accumulator -= this.fixedStep;
                fixedUpdates++;
                
                // Safety check
                if (fixedUpdates > this.maxSubSteps) {
                    this.metrics.skippedFixedUpdates++;
                    if (this.debug) {
                        console.warn('[FixedTimestep] Max substeps reached, dropping physics');
                    }
                    break;
                }
            }
            
            this.metrics.physicsTime = performance.now() - physicsStart;
            this.metrics.fixedUpdates += fixedUpdates;
            
            // Calculate interpolation alpha
            if (this.interpolate) {
                this.alpha = this.accumulator / this.fixedStep;
                this._captureState('current');
            } else {
                this.alpha = 1;
            }
            
            // Render with interpolation
            const renderStart = performance.now();
            this.onRender(this.alpha);
            this.metrics.renderTime = performance.now() - renderStart;
            
            // Late update (post-physics)
            this.onLateUpdate(dt);
            
            // Update metrics
            this._updateMetrics(dt);
            this.frameCount++;
            this.totalTime += dt;
        }

        /**
         * Capture state for interpolation
         */
        _captureState(which) {
            // This should be implemented by the game to capture entity positions
            // Default implementation stores timestamp
            if (which === 'previous') {
                this.previousState = {
                    time: this.currentTime - this.fixedStep,
                    entities: this._getEntityStates()
                };
            } else {
                this.currentState = {
                    time: this.currentTime,
                    entities: this._getEntityStates()
                };
            }
        }

        /**
         * Get entity states for interpolation (override in game)
         */
        _getEntityStates() {
            // Override in your game to return entity positions
            // Return: { entityId: { x, y, z, rotation } }
            return {};
        }

        /**
         * Interpolate between states (call from render)
         */
        interpolateState(entityId, property) {
            if (!this.interpolate || !this.previousState || !this.currentState) {
                return this.currentState?.entities?.[entityId]?.[property] || 0;
            }
            
            const prev = this.previousState.entities[entityId];
            const curr = this.currentState.entities[entityId];
            
            if (!prev || !curr) return curr?.[property] || 0;
            
            return prev[property] + (curr[property] - prev[property]) * this.alpha;
        }

        /**
         * Update performance metrics
         */
        _updateMetrics(dt) {
            const fps = 1 / dt;
            this.metrics.fpsHistory.push(fps);
            
            if (this.metrics.fpsHistory.length > 60) {
                this.metrics.fpsHistory.shift();
            }
            
            this.metrics.fps = this.metrics.fpsHistory.reduce((a, b) => a + b, 0) / 
                              this.metrics.fpsHistory.length;
            
            this.metrics.avgFrameTime = this.totalTime / this.frameCount * 1000;
            
            // Detect missed frames
            if (this.accumulator > this.fixedStep * 2) {
                this.metrics.missedFrames++;
            }
        }

        /**
         * Get current metrics
         */
        getMetrics() {
            return {
                fps: Math.round(this.metrics.fps),
                avgFrameTime: this.metrics.avgFrameTime.toFixed(2),
                physicsTime: this.metrics.physicsTime.toFixed(2),
                renderTime: this.metrics.renderTime.toFixed(2),
                missedFrames: this.metrics.missedFrames,
                totalFrames: this.frameCount,
                totalTime: this.totalTime.toFixed(2)
            };
        }

        /**
         * Reset metrics
         */
        resetMetrics() {
            this.metrics.fpsHistory = [];
            this.metrics.fps = 0;
            this.metrics.missedFrames = 0;
            this.metrics.fixedUpdates = 0;
            this.metrics.skippedFixedUpdates = 0;
        }
    }

    // ============================================
    // INTERPOLATOR (for rendering)
    // ============================================

    /**
     * Interpolator helper for smooth visual updates
     */
    class Interpolator {
        constructor() {
            this.positions = new Map();
            this.velocities = new Map();
            this.smoothness = 0.3; // 0 = instant, 1 = very smooth
        }

        /**
         * Add or update an entity's position
         */
        setPosition(id, x, y, z) {
            if (!this.positions.has(id)) {
                this.positions.set(id, { x, y, z, tx: x, ty: y, tz: z });
                return;
            }
            
            const pos = this.positions.get(id);
            pos.tx = x;
            pos.ty = y;
            pos.tz = z;
        }

        /**
         * Get interpolated position
         */
        getPosition(id) {
            const pos = this.positions.get(id);
            if (!pos) return { x: 0, y: 0, z: 0 };
            
            // Smooth interpolation toward target
            pos.x += (pos.tx - pos.x) * this.smoothness;
            pos.y += (pos.ty - pos.y) * this.smoothness;
            pos.z += (pos.tz - pos.z) * this.smoothness;
            
            return { x: pos.x, y: pos.y, z: pos.z };
        }

        /**
         * Get raw target position (no interpolation)
         */
        getTargetPosition(id) {
            const pos = this.positions.get(id);
            if (!pos) return { x: 0, y: 0, z: 0 };
            return { x: pos.tx, y: pos.ty, z: pos.tz };
        }

        /**
         * Remove entity
         */
        remove(id) {
            this.positions.delete(id);
            this.velocities.delete(id);
        }

        /**
         * Clear all
         */
        clear() {
            this.positions.clear();
            this.velocities.clear();
        }
    }

    // ============================================
    // DELTA TIMER (for rate-limited operations)
    // ============================================

    /**
     * Timer for rate-limited operations (e.g., AI updates, pathfinding)
     */
    class DeltaTimer {
        constructor(rate) {
            this.rate = rate;
            this.accumulator = 0;
            this.lastFire = 0;
        }

        /**
         * Update timer, returns true if should fire
         */
        update(dt) {
            this.accumulator += dt;
            
            if (this.accumulator >= this.rate) {
                this.accumulator -= this.rate;
                this.lastFire = performance.now();
                return true;
            }
            
            return false;
        }

        /**
         * Reset timer
         */
        reset() {
            this.accumulator = 0;
        }

        /**
         * Set new rate
         */
        setRate(rate) {
            this.rate = rate;
        }

        /**
         * Get progress (0-1)
         */
        getProgress() {
            return Math.min(1, this.accumulator / this.rate);
        }
    }

    /**
     * Cooldown timer (fires once then resets)
     */
    class Cooldown {
        constructor(duration) {
            this.duration = duration;
            this.remaining = 0;
            this.ready = true;
        }

        /**
         * Start cooldown
         */
        start(duration) {
            this.duration = duration !== undefined ? duration : this.duration;
            this.remaining = this.duration;
            this.ready = false;
        }

        /**
         * Update (returns true if just became        update(dt) ready)
         */
 {
            if (this.ready) return false;
            
            this.remaining -= dt;
            if (this.remaining <= 0) {
                this.remaining = 0;
                this.ready = true;
                return true;
            }
            
            return false;
        }

        /**
         * Force complete
         */
        complete() {
            this.remaining = 0;
            this.ready = true;
        }

        /**
         * Cancel cooldown
         */
        cancel() {
            this.remaining = 0;
            this.ready = true;
        }

        /**
         * Get progress (1 = ready, 0 = just started)
         */
        getProgress() {
            return this.ready ? 1 : 1 - (this.remaining / this.duration);
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    const SGAI = global.SGAI || {};
    SGAI.FixedTimestepEngine = FixedTimestepEngine;
    SGAI.Interpolator = Interpolator;
    SGAI.DeltaTimer = DeltaTimer;
    SGAI.Cooldown = Cooldown;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            FixedTimestepEngine,
            Interpolator,
            DeltaTimer,
            Cooldown
        };
    } else {
        global.SGAI = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);
