/**
 * ============================================
 * SGAI Performance Framework - Main Entry
 * ============================================
 * Unified access to all performance systems.
 * 
 * Usage:
 *   <script src="js/core/framework.js"></script>
 *   <script>
 *     // Initialize ECS
 *     const entities = SGAI.ECS.getEntitiesWith(['Transform', 'Health']);
 *     
 *     // Create game loop
 *     const game = new SGAI.FixedTimestepEngine({
 *       fixedStep: 1/60,
 *       onUpdate: (dt) => { SGAI.ECS.update(dt); },
 *       onRender: (alpha) => { render(alpha); }
 *     });
 *     game.start();
 *   </script>
 */

(function(global) {
    'use strict';

    const SGAI = global.SGAI || {};

    // ============================================
    // VERSION INFO
    // ============================================

    SGAI.VERSION = '2.0.0';
    SGAI.PHASES = [
        // Phase 1-5: Core Engine & Performance
        'ECS Migration',
        'Object Pooling', 
        'Fixed-Timestep',
        'Spatial Partitioning',
        'Web Worker Multithreading',
        // Phase 6-10: Graphics & Rendering
        'GPU Instancing',
        'Skeletal Animation',
        'PBR Materials',
        'GPU Particles',
        'Post-Processing',
        // Phase 11-15: AI, Physics & Combat
        'Physics Integration',
        'Pathfinding & Flow Fields',
        'Boids & Flocking',
        'Behavior Trees & GOAP',
        'Combat Hitboxes'
    ];

    // ============================================
    // SYSTEM STATUS
    // ============================================

    SGAI.getSystemStatus = function() {
        return {
            ecs: {
                available: !!SGAI.ECS,
                stats: SGAI.ECS ? SGAI.ECS.getStats() : null
            },
            pooling: {
                available: !!SGAI.PoolManager,
                stats: SGAI._poolManager ? SGAI._poolManager.getStats() : null
            },
            spatial: {
                quadtree: !!SGAI.Quadtree,
                octree: !!SGAI.Octree,
                spatialHash: !!SGAI.SpatialHash
            },
            workers: {
                available: typeof Worker !== 'undefined',
                sharedMemory: typeof SharedArrayBuffer !== 'undefined'
            }
        };
    };

    // ============================================
    // CONVENIENCE FACTORIES
    // ============================================

    /**
     * Create a configured game loop
     */
    SGAI.createGameLoop = function(options) {
        return new SGAI.FixedTimestepEngine({
            fixedStep: options.fixedStep || 1/60,
            maxSubSteps: options.maxSubSteps || 3,
            interpolate: options.interpolate !== false,
            onUpdate: options.onUpdate || function(dt) {},
            onRender: options.onRender || function(alpha) {},
            onLateUpdate: options.onLateUpdate || function(dt) {},
            debug: options.debug || false
        });
    };

    /**
     * Create a quadtree for 2D games
     */
    SGAI.createQuadtree = function(options) {
        return new SGAI.Quadtree({
            bounds: options.bounds || { x: 0, y: 0, width: 100, height: 100 },
            maxObjects: options.maxObjects || 10,
            maxLevels: options.maxLevels || 8
        });
    };

    /**
     * Create an octree for 3D games
     */
    SGAI.createOctree = function(options) {
        return new SGAI.Octree({
            bounds: options.bounds || { x: 0, y: 0, z: 0, width: 100, height: 100, depth: 100 },
            maxObjects: options.maxObjects || 10,
            maxLevels: options.maxLevels || 6
        });
    };

    /**
     * Create spatial hash
     */
    SGAI.createSpatialHash = function(cellSize) {
        return new SGAI.SpatialHash(cellSize || 10);
    };

    /**
     * Create pool manager with common pools
     */
    SGAI.createPoolManager = function(options) {
        const pm = new SGAI.PoolManager();
        
        // Register common pools
        pm.register('projectiles', new SGAI.ProjectilePool({
            initialSize: options.projectiles || 100,
            maxSize: options.maxProjectiles || 2000
        }));
        
        pm.register('particles', new SGAI.ParticlePool({
            initialSize: options.particles || 200,
            maxSize: options.maxParticles || 5000
        }));
        
        pm.register('units', new SGAI.UnitPool({
            initialSize: options.units || 50,
            maxSize: options.maxUnits || 2000
        }));
        
        SGAI._poolManager = pm;
        
        return pm;
    };

    /**
     * Create worker pool
     */
    SGAI.createWorkerPool = function(options) {
        return new SGAI.WorkerPool({
            workerCount: options.workerCount || navigator.hardwareConcurrency || 4,
            workerScript: options.workerScript
        });
    };

    // ============================================
    // MIGRATION HELPERS
    // ============================================

    /**
     * Convert legacy array to ECS entities
     */
    SGAI.migrateUnitsToECS = function(unitsArray) {
        const entities = [];
        
        for (const unit of unitsArray) {
            const entity = SGAI.ECS.createEntity();
            
            SGAI.ECS.addComponent(entity, 'Transform', {
                x: unit.x || 0,
                y: unit.y || 0,
                z: unit.z || 0
            });
            
            SGAI.ECS.addComponent(entity, 'Team', {
                team: unit.team === 'blue' ? 1 : 2
            });
            
            SGAI.ECS.addComponent(entity, 'Health', {
                hp: unit.hp || 100,
                maxHp: unit.maxHp || 100
            });
            
            SGAI.ECS.addComponent(entity, 'Velocity', {
                vx: 0, vy: 0, vz: 0,
                speed: unit.speed || 5,
                maxSpeed: unit.speed || 5
            });
            
            if (unit.type) {
                SGAI.ECS.addComponent(entity, 'Damage', {
                    damage: unit.atk || 10,
                    range: unit.range || 1,
                    attackCooldown: unit.atkCooldown || 1,
                    lastAttackTime: 0
                });
            }
            
            // Store original reference for compatibility
            entity._legacyRef = unit;
            
            entities.push(entity);
        }
        
        return entities;
    };

    /**
     * Add spatial partitioning to game
     */
    SGAI.addSpatialToECS = function(quadtree) {
        // Hook into ECS updates
        const originalUpdate = SGAI.ECS.update;
        
        SGAI.ECS.update = function(dt) {
            // Rebuild quadtree each frame
            quadtree.clear();
            
            SGAI.ECS.forEach(['Transform'], function(entity, transform) {
                const x = transform.data[transform.offset];
                const z = transform.data[transform.offset + 2];
                
                quadtree.insert({
                    id: entity,
                    x: x,
                    y: z,
                    width: 1,
                    height: 1
                });
            });
            
            originalUpdate.call(SGAI.ECS, dt);
        };
        
        // Add query method to ECS
        SGAI.ECS.queryNearby = function(x, z, radius) {
            return quadtree.queryRadius(x, z, radius);
        };
    };

    // ============================================
    // PERFORMANCE MONITOR
    // ============================================

    /**
     * Simple performance monitor
     */
    SGAI.PerformanceMonitor = {
        _frames: [],
        _lastTime: performance.now(),
        
        begin: function() {
            this._startTime = performance.now();
        },
        
        end: function() {
            const now = performance.now();
            const frameTime = now - this._startTime;
            this._frames.push(frameTime);
            
            if (this._frames.length > 60) {
                this._frames.shift();
            }
            
            this._lastTime = now;
        },
        
        getFPS: function() {
            if (this._frames.length < 2) return 0;
            const avg = this._frames.reduce((a, b) => a + b, 0) / this._frames.length;
            return Math.round(1000 / avg);
        },
        
        getAvgFrameTime: function() {
            if (this._frames.length === 0) return 0;
            return (this._frames.reduce((a, b) => a + b, 0) / this._frames.length).toFixed(2);
        },
        
        getStats: function() {
            const sorted = [...this._frames].sort((a, b) => a - b);
            return {
                fps: this.getFPS(),
                avgFrameTime: this.getAvgFrameTime(),
                minFrameTime: sorted[0]?.toFixed(2) || 0,
                maxFrameTime: sorted[sorted.length - 1]?.toFixed(2) || 0,
                frames: this._frames.length
            };
        }
    };

    // ============================================
    // EXPORT
    // ============================================

    global.SGAI = SGAI;

    // Auto-load submodules if they're loaded after framework
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);
