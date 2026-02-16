/**
 * ============================================
 * SGAI Performance Framework - Phase 2: Object Pooling
 * ============================================
 * Pre-allocated object pools to eliminate GC during gameplay.
 * 
 * Key Benefits:
 * - Zero allocation during active gameplay
 * - Object recycling via isActive flag
 * - Batch creation loading
 * - for level Memory-efficient resizing
 */

(function(global) {
    'use strict';

    // ============================================
    // OBJECT POOL BASE CLASS
    // ============================================

    /**
     * Generic object pool for any object type
     */
    class ObjectPool {
        constructor(options = {}) {
            this.initialSize = options.initialSize || 100;
            this.maxSize = options.maxSize || 10000;
            this.growFactor = options.growFactor || 1.5;
            this.factory = options.factory || (() => ({}));
            this.reset = options.reset || function(obj) {
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        const val = obj[key];
                        if (Array.isArray(val)) val.length = 0;
                        else if (typeof val === 'object' && val !== null) {
                            // Don't reset Three.js objects
                            if (!val.isMesh && !val.isVector3 && !val.isQuaternion) {
                                this._resetObject(val);
                            }
                        }
                        else if (typeof val !== 'function') {
                            obj[key] = val === 0 ? 0 : (val === false ? false : null);
                        }
                    }
                }
            };
            this.onCreate = options.onCreate || function(obj) {};
            this.onActivate = options.onActivate || function(obj) {};
            this.onDeactivate = options.onDeactivate || function(obj) {};
            
            this._pool = [];
            this._active = new Set();
            this._autoGrow = options.autoGrow !== false;
            
            // Pre-populate pool
            this._expand(this.initialSize);
        }

        _resetObject(obj) {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const val = obj[key];
                    if (Array.isArray(val)) val.length = 0;
                    else if (typeof val === 'object' && val !== null && !val.isMesh) {
                        this._resetObject(val);
                    }
                }
            }
        }

        _expand(count) {
            const newCount = Math.min(this._pool.length + count, this.maxSize);
            
            for (let i = this._pool.length; i < newCount; i++) {
                const obj = this.factory();
                obj._poolId = i;
                obj._active = false;
                this._pool.push(obj);
                this.onCreate(obj);
            }
            
            return newCount - this._pool.length + count;
        }

        /**
         * Get an inactive object from pool (or create new if allowed)
         */
        get() {
            // Find first inactive
            for (let i = 0; i < this._pool.length; i++) {
                const obj = this._pool[i];
                if (!obj._active) {
                    obj._active = true;
                    this._active.add(obj);
                    this.onActivate(obj);
                    return obj;
                }
            }
            
            // Pool exhausted, try to grow
            if (this._autoGrow && this._pool.length < this.maxSize) {
                const grown = this._expand(Math.ceil(this._pool.length * (this.growFactor - 1)));
                if (grown > 0) {
                    const obj = this._pool[this._pool.length - grown];
                    obj._active = true;
                    this._active.add(obj);
                    this.onActivate(obj);
                    return obj;
                }
            }
            
            // No more available
            console.warn(`ObjectPool [${this.name || 'anonymous'}]: Pool exhausted (size: ${this._pool.length}, active: ${this._active.size})`);
            return null;
        }

        /**
         * Return object to pool
         */
        release(obj) {
            if (!obj || !obj._active) return;
            
            obj._active = false;
            this._active.delete(obj);
            this.reset(obj);
            this.onDeactivate(obj);
        }

        /**
         * Release all active objects
         */
        releaseAll() {
            for (const obj of this._active) {
                obj._active = false;
                this.reset(obj);
                this.onDeactivate(obj);
            }
            this._active.clear();
        }

        /**
         * Iterate over active objects only
         */
        forEach(callback) {
            this._active.forEach(callback);
        }

        /**
         * Get active count
         */
        get activeCount() {
            return this._active.size;
        }

        /**
         * Get total pool size
         */
        get totalSize() {
            return this._pool.length;
        }

        /**
         * Get pool utilization
         */
        get utilization() {
            return this._pool.length > 0 ? this._active.size / this._pool.length : 0;
        }
    }

    // ============================================
    // SPECIALIZED POOLS
    // ============================================

    /**
     * Pool for Three.js mesh objects
     */
    class MeshPool extends ObjectPool {
        constructor(options = {}) {
            super({
                initialSize: options.initialSize || 50,
                maxSize: options.maxSize || 5000,
                growFactor: options.growFactor || 1.5,
                factory: options.factory,
                reset: function(mesh) {
                    mesh.position.set(0, 0, 0);
                    mesh.rotation.set(0, 0, 0);
                    mesh.scale.set(1, 1, 1);
                    mesh.visible = false;
                    if (mesh.material) {
                        mesh.material.opacity = 1;
                        mesh.material.transparent = false;
                    }
                }
            });
            this.geometry = options.geometry;
            this.material = options.material;
            
            // Override factory if not provided
            if (!options.factory && options.geometry) {
                this.factory = () => {
                    return new THREE.Mesh(this.geometry, this.material);
                };
            }
        }

        get(options = {}) {
            const mesh = super.get();
            if (mesh && options) {
                if (options.position) mesh.position.copy(options.position);
                if (options.rotation) mesh.rotation.copy(options.rotation);
                if (options.scale) mesh.scale.copy(options.scale);
                mesh.visible = options.visible !== false;
            }
            return mesh;
        }
    }

    /**
     * Pool for projectile objects (arrows, magic bolts)
     */
    class ProjectilePool extends ObjectPool {
        constructor(options = {}) {
            super({
                initialSize: options.initialSize || 100,
                maxSize: options.maxSize || 2000,
                name: 'ProjectilePool',
                factory: () => ({
                    x: 0, y: 0, z: 0,
                    vx: 0, vy: 0, vz: 0,
                    damage: 10,
                    owner: -1,
                    lifetime: 5,
                    age: 0,
                    active: false,
                    mesh: null
                }),
                reset: function(p) {
                    p.x = p.y = p.z = 0;
                    p.vx = p.vy = p.vz = 0;
                    p.damage = 10;
                    p.owner = -1;
                    p.lifetime = 5;
                    p.age = 0;
                    p.active = false;
                    if (p.mesh) {
                        p.mesh.visible = false;
                    }
                }
            });
        }

        spawn(x, y, z, vx, vy, vz, damage, owner, lifetime = 5) {
            const proj = this.get();
            if (!proj) return null;
            
            proj.x = x; proj.y = y; proj.z = z;
            proj.vx = vx; proj.vy = vy; proj.vz = vz;
            proj.damage = damage;
            proj.owner = owner;
            proj.lifetime = lifetime;
            proj.age = 0;
            proj.active = true;
            
            if (proj.mesh) {
                proj.mesh.position.set(x, y, z);
                proj.mesh.visible = true;
            }
            
            return proj;
        }

        update(dt) {
            for (const p of this._active) {
                if (!p.active) continue;
                
                p.age += dt;
                if (p.age >= p.lifetime) {
                    this.release(p);
                    continue;
                }
                
                // Physics update
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                
                // Gravity
                p.vy -= 9.8 * dt;
                
                if (p.mesh) {
                    p.mesh.position.set(p.x, p.y, p.z);
                }
            }
        }
    }

    /**
     * Pool for particle effects
     */
    class ParticlePool extends ObjectPool {
        constructor(options = {}) {
            super({
                initialSize: options.initialSize || 200,
                maxSize: options.maxSize || 5000,
                name: 'ParticlePool',
                factory: () => ({
                    x: 0, y: 0, z: 0,
                    vx: 0, vy: 0, vz: 0,
                    r: 1, g: 1, b: 1, a: 1,
                    size: 1,
                    lifetime: 1,
                    age: 0,
                    active: false,
                    mesh: null
                }),
                reset: function(p) {
                    p.x = p.y = p.z = 0;
                    p.vx = p.vy = p.vz = 0;
                    p.r = p.g = p.b = 1; p.a = 1;
                    p.size = 1;
                    p.lifetime = 1;
                    p.age = 0;
                    p.active = false;
                    if (p.mesh) {
                        p.mesh.visible = false;
                    }
                }
            });
            
            this.maxLifetime = options.maxLifetime || 3;
        }

        emit(options) {
            const particle = this.get();
            if (!particle) return null;
            
            const count = options.count || 1;
            const spread = options.spread || 0;
            
            for (let i = 0; i < count; i++) {
                const p = i === 0 ? particle : this.get();
                if (!p) break;
                
                p.x = options.x + (Math.random() - 0.5) * spread;
                p.y = options.y + (Math.random() - 0.5) * spread;
                p.z = options.z + (Math.random() - 0.5) * spread;
                
                p.vx = (options.vx || 0) + (Math.random() - 0.5) * (options.velocitySpread || 0);
                p.vy = (options.vy || 0) + (Math.random() - 0.5) * (options.velocitySpread || 0);
                p.vz = (options.vz || 0) + (Math.random() - 0.5) * (options.velocitySpread || 0);
                
                const color = options.color || 0xffffff;
                p.r = ((color >> 16) & 0xff) / 255;
                p.g = ((color >> 8) & 0xff) / 255;
                p.b = (color & 0xff) / 255;
                p.a = options.alpha !== undefined ? options.alpha : 1;
                
                p.size = options.size || 1;
                p.lifetime = options.lifetime || (this.maxLifetime * (0.5 + Math.random() * 0.5));
                p.age = 0;
                p.active = true;
                
                if (p.mesh) {
                    p.mesh.position.set(p.x, p.y, p.z);
                    p.mesh.scale.setScalar(p.size);
                    p.mesh.visible = true;
                    if (p.mesh.material) {
                        p.mesh.material.opacity = p.a;
                    }
                }
            }
            
            return particle;
        }

        update(dt) {
            for (const p of this._active) {
                if (!p.active) continue;
                
                p.age += dt;
                if (p.age >= p.lifetime) {
                    this.release(p);
                    continue;
                }
                
                // Physics
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                
                // Drag
                p.vx *= 0.98;
                p.vy *= 0.98;
                p.vz *= 0.98;
                
                // Fade out
                const life = p.age / p.lifetime;
                p.a = Math.max(0, (1 - life) * (p.a > 0.5 ? 1 : p.a));
                
                if (p.mesh) {
                    p.mesh.position.set(p.x, p.y, p.z);
                    if (p.mesh.material) {
                        p.mesh.material.opacity = p.a;
                    }
                }
            }
        }
    }

    /**
     * Pool for unit/game entities
     */
    class UnitPool extends ObjectPool {
        constructor(options = {}) {
            super({
                initialSize: options.initialSize || 50,
                maxSize: options.maxSize || 2000,
                name: 'UnitPool',
                factory: () => ({
                    id: -1,
                    type: '',
                    team: 0,
                    x: 0, y: 0, z: 0,
                    hp: 100, maxHp: 100,
                    vx: 0, vy: 0, vz: 0,
                    state: 'idle',
                    target: null,
                    mesh: null,
                    hpBar: null,
                    active: false
                }),
                reset: function(u) {
                    u.id = -1;
                    u.type = '';
                    u.team = 0;
                    u.x = u.y = u.z = 0;
                    u.hp = u.maxHp = 100;
                    u.vx = u.vy = u.vz = 0;
                    u.state = 'idle';
                    u.target = null;
                    u.active = false;
                    if (u.mesh) {
                        u.mesh.visible = false;
                    }
                    if (u.hpBar) {
                        u.hpBar.visible = false;
                    }
                }
            });
        }

        spawn(options) {
            const unit = this.get();
            if (!unit) return null;
            
            unit.id = options.id || Math.random();
            unit.type = options.type || 'soldier';
            unit.team = options.team || 0;
            unit.x = options.x || 0;
            unit.y = options.y || 0;
            unit.z = options.z || 0;
            unit.hp = options.hp || 100;
            unit.maxHp = options.maxHp || 100;
            unit.vx = unit.vy = unit.vz = 0;
            unit.state = 'idle';
            unit.target = null;
            unit.active = true;
            
            if (unit.mesh) {
                unit.mesh.position.set(unit.x, unit.y, unit.z);
                unit.mesh.visible = true;
            }
            if (unit.hpBar) {
                unit.hpBar.visible = true;
            }
            
            return unit;
        }

        update(dt) {
            for (const u of this._active) {
                if (!u.active) continue;
                
                // Basic movement
                if (u.vx !== 0 || u.vz !== 0) {
                    u.x += u.vx * dt;
                    u.z += u.vz * dt;
                    
                    if (u.mesh) {
                        u.mesh.position.set(u.x, u.y, u.z);
                    }
                }
                
                // Update HP bar position
                if (u.hpBar && u.mesh) {
                    u.hpBar.position.set(u.x, u.y + 1.5, u.z);
                }
            }
        }

        findInRadius(x, z, radius) {
            const result = [];
            const radiusSq = radius * radius;
            
            for (const u of this._active) {
                if (!u.active) continue;
                
                const dx = u.x - x;
                const dz = u.z - z;
                
                if (dx * dx + dz * dz <= radiusSq) {
                    result.push(u);
                }
            }
            
            return result;
        }

        findNearest(x, z, teamFilter = null) {
            let nearest = null;
            let nearestDist = Infinity;
            
            for (const u of this._active) {
                if (!u.active) continue;
                if (teamFilter !== null && u.team !== teamFilter) continue;
                
                const dx = u.x - x;
                const dz = u.z - z;
                const dist = dx * dx + dz * dz;
                
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = u;
                }
            }
            
            return nearest;
        }
    }

    // ============================================
    // POOL MANAGER (centralized management)
    // ============================================

    class PoolManager {
        constructor() {
            this.pools = new Map();
            this.stats = {
                totalAllocated: 0,
                totalActive: 0,
                peakActive: 0
            };
        }

        register(name, pool) {
            pool.name = name;
            this.pools.set(name, pool);
        }

        get(name) {
            return this.pools.get(name);
        }

        getOrCreate(name, options, PoolClass) {
            if (this.pools.has(name)) {
                return this.pools.get(name);
            }
            
            const pool = new PoolClass(options);
            this.register(name, pool);
            return pool;
        }

        updateAll(dt) {
            this.stats.totalActive = 0;
            
            for (const pool of this.pools.values()) {
                if (pool.update) {
                    pool.update(dt);
                }
                this.stats.totalActive += pool.activeCount;
            }
            
            if (this.stats.totalActive > this.stats.peakActive) {
                this.stats.peakActive = this.stats.totalActive;
            }
        }

        releaseAll() {
            for (const pool of this.pools.values()) {
                pool.releaseAll();
            }
        }

        getStats() {
            const poolStats = [];
            let totalActive = 0;
            let totalSize = 0;
            
            for (const [name, pool] of this.pools) {
                poolStats.push({
                    name,
                    active: pool.activeCount,
                    total: pool.totalSize,
                    utilization: pool.utilization
                });
                totalActive += pool.activeCount;
                totalSize += pool.totalSize;
            }
            
            return {
                pools: poolStats,
                totalActive,
                totalSize,
                peakActive: this.stats.peakActive
            };
        }

        preload(counts) {
            console.log('PoolManager: Preloading pools...');
            
            for (const [name, count] of Object.entries(counts)) {
                const pool = this.pools.get(name);
                if (pool && count > pool.totalSize) {
                    pool._expand(count - pool.totalSize);
                }
            }
            
            console.log('PoolManager: Preload complete', this.getStats());
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    const SGAI = global.SGAI || {};
    SGAI.ObjectPool = ObjectPool;
    SGAI.MeshPool = MeshPool;
    SGAI.ProjectilePool = ProjectilePool;
    SGAI.ParticlePool = ParticlePool;
    SGAI.UnitPool = UnitPool;
    SGAI.PoolManager = PoolManager;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            ObjectPool,
            MeshPool,
            ProjectilePool,
            ParticlePool,
            UnitPool,
            PoolManager
        };
    } else {
        global.SGAI = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);
