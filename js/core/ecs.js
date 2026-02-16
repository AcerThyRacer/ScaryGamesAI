/**
 * ============================================
 * SGAI Performance Framework - Phase 1: ECS Core
 * ============================================
 * Entity-Component-System architecture for high-performance game logic.
 * 
 * Key Benefits:
 * - Entities are just IDs (integers) - no object allocation per entity
 * - Components use typed arrays for cache locality
 * - Systems process entities with specific component signatures
 * - Dynamic trait attachment (Burning, Poisoned, etc.)
 * - Zero GC pressure during gameplay
 */

(function(global) {
    'use strict';

    // ============================================
    // ECS CORE
    // ============================================

    const ECS = {
        /** Next available entity ID */
        _nextEntity: 1,
        
        /** Entity alive flag (packed bitfield for speed) */
        _entityMask: new Uint8Array(65536), // Support up to 524,288 entities
        
        /** Component type to component data map */
        _components: new Map(),
        
        /** System list (execution order matters) */
        _systems: [],
        
        /** Component definitions: name -> { size, init, free } */
        _componentTypes: new Map(),
        
        /** Entity -> component mask (which components an entity has) */
        _entityComponentMask: new Uint32Array(65536), // 32 components max per entity
        
        /** Component pools for each type */
        _componentPools: new Map(),
        
        /** Global entity tags for quick filtering */
        _entityTags: new Map(), // tagName -> Set of entity IDs
        
        /** Pending destroy queue (processed at end of frame) */
        _destroyQueue: [],
        
        /** Change listeners for reactive patterns */
        _listeners: new Map(),

        /**
         * Create a new entity (returns integer ID)
         */
        createEntity: function(tag) {
            let id = this._nextEntity++;
            
            // Expand arrays if needed
            if (id >= this._entityMask.length) {
                this._expandArrays(id * 2);
            }
            
            this._entityMask[id] = 1; // Mark as alive
            
            if (tag) {
                this.addTag(id, tag);
            }
            
            return id;
        },

        /**
         * Destroy an entity (marks for deletion, processed at frame end)
         */
        destroyEntity: function(entity) {
            if (entity >= this._nextEntity || !this._entityMask[entity]) return;
            this._destroyQueue.push(entity);
        },

        /**
         * Process destroy queue (call at end of frame)
         */
        _processDestroyQueue: function() {
            while (this._destroyQueue.length > 0) {
                const entity = this._destroyQueue.pop();
                if (!this._entityMask[entity]) continue;
                
                this._entityMask[entity] = 0;
                
                // Remove all components
                const mask = this._entityComponentMask[entity];
                for (let i = 0; i < 32; i++) {
                    if (mask & (1 << i)) {
                        this._removeComponentFromEntity(entity, i);
                    }
                }
                
                // Remove tags
                for (const [tagName, set] of this._entityTags) {
                    set.delete(entity);
                }
            }
        },

        /**
         * Expand internal arrays for large entity counts
         */
        _expandArrays: function(newSize) {
            const newMask = new Uint8Array(newSize);
            const newEntMask = new Uint32Array(newSize);
            
            newMask.set(this._entityMask);
            newEntMask.set(this._entityComponentMask);
            
            this._entityMask = newMask;
            this._entityComponentMask = newEntMask;
        },

        /**
         * Register a component type with its data structure
         */
        registerComponent: function(name, schema) {
            const id = this._componentTypes.size;
            
            if (id >= 32) {
                console.error('ECS: Max 32 component types allowed');
                return;
            }
            
            this._componentTypes.set(name, {
                id: id,
                size: schema.size || 1,
                fields: schema.fields || [],
                init: schema.init || function() {},
                free: schema.free || function() {}
            });
            
            // Create typed array pool for this component
            this._componentPools.set(name, {
                data: null, // Will be Float32Array
                entityToIndex: new Map(),
                indexToEntity: new Map(),
                freeIndices: [],
                count: 0
            });
            
            return id;
        },

        /**
         * Add a component to an entity
         */
        addComponent: function(entity, componentName, initialData) {
            if (!this._entityMask[entity]) return null;
            
            const compType = this._componentTypes.get(componentName);
            if (!compType) {
                console.error('ECS: Unknown component:', componentName);
                return null;
            }
            
            const mask = this._entityComponentMask[entity];
            if (mask & (1 << compType.id)) {
                // Already has component, update data
                return this.setComponent(entity, componentName, initialData);
            }
            
            // Get or create pool entry
            const pool = this._componentPools.get(componentName);
            let index;
            
            if (pool.freeIndices.length > 0) {
                index = pool.freeIndices.pop();
            } else {
                index = pool.count++;
                
                // Expand data array if needed
                if (!pool.data || index >= pool.data.length / compType.size) {
                    const newSize = Math.max(256, (index + 1) * 2) * compType.size;
                    const newData = new Float32Array(newSize);
                    if (pool.data) newData.set(pool.data);
                    pool.data = newData;
                }
            }
            
            pool.entityToIndex.set(entity, index);
            pool.indexToEntity.set(index, entity);
            
            // Initialize component data
            const offset = index * compType.size;
            this._initComponentData(pool.data, offset, compType, initialData);
            
            // Update entity mask
            this._entityComponentMask[entity] = mask | (1 << compType.id);
            
            // Notify listeners
            this._emit('componentAdded', { entity, component: componentName });
            
            return { entity, component: componentName, index };
        },

        /**
         * Initialize component data from schema
         */
        _initComponentData: function(data, offset, compType, initialData) {
            const fields = compType.fields;
            
            // Set defaults
            for (let i = 0; i < fields.length; i++) {
                data[offset + i] = fields[i].default || 0;
            }
            
            // Apply initial data
            if (initialData) {
                for (const key in initialData) {
                    const fieldIndex = fields.findIndex(f => f.name === key);
                    if (fieldIndex >= 0) {
                        data[offset + fieldIndex] = initialData[key];
                    }
                }
            }
            
            // Call custom init
            compType.init(data, offset);
        },

        /**
         * Remove component from entity
         */
        _removeComponentFromEntity: function(entity, compId) {
            for (const [name, compType] of this._componentTypes) {
                if (compType.id !== compId) continue;
                
                const pool = this._componentPools.get(name);
                const index = pool.entityToIndex.get(entity);
                
                if (index !== undefined) {
                    pool.entityToIndex.delete(entity);
                    pool.indexToEntity.delete(index);
                    pool.freeIndices.push(index);
                    
                    // Call free callback
                    compType.free(pool.data, index * compType.size);
                }
                break;
            }
        },

        /**
         * Get component data for an entity
         */
        getComponent: function(entity, componentName) {
            if (!this._entityMask[entity]) return null;
            
            const compType = this._componentTypes.get(componentName);
            if (!compType) return null;
            
            const mask = this._entityComponentMask[entity];
            if (!(mask & (1 << compType.id))) return null;
            
            const pool = this._componentPools.get(componentName);
            const index = pool.entityToIndex.get(entity);
            
            return {
                data: pool.data,
                offset: index * compType.size,
                size: compType.size,
                fields: compType.fields
            };
        },

        /**
         * Set component values
         */
        setComponent: function(entity, componentName, values) {
            const comp = this.getComponent(entity, componentName);
            if (!comp) return this.addComponent(entity, componentName, values);
            
            for (const key in values) {
                const fieldIndex = comp.fields.findIndex(f => f.name === key);
                if (fieldIndex >= 0) {
                    comp.data[comp.offset + fieldIndex] = values[key];
                }
            }
            
            this._emit('componentChanged', { entity, component: componentName, values });
            return comp;
        },

        /**
         * Check if entity has a component
         */
        hasComponent: function(entity, componentName) {
            if (!this._entityMask[entity]) return false;
            
            const compType = this._componentTypes.get(componentName);
            if (!compType) return false;
            
            return (this._entityComponentMask[entity] & (1 << compType.id)) !== 0;
        },

        /**
         * Remove component from entity
         */
        removeComponent: function(entity, componentName) {
            if (!this._entityMask[entity]) return;
            
            const compType = this._componentTypes.get(componentName);
            if (!compType) return;
            
            const mask = this._entityComponentMask[entity];
            if (!(mask & (1 << compType.id))) return;
            
            this._entityComponentMask[entity] = mask & ~(1 << compType.id);
            this._removeComponentFromEntity(entity, compType.id);
            
            this._emit('componentRemoved', { entity, component: componentName });
        },

        /**
         * Get all entities with specific components
         */
        getEntitiesWith: function(componentNames) {
            const result = [];
            const requiredMasks = [];
            
            for (const name of componentNames) {
                const compType = this._componentTypes.get(name);
                if (!compType) return result;
                requiredMasks.push(1 << compType.id);
            }
            
            const requiredMask = requiredMasks.reduce((a, b) => a | b, 0);
            
            for (let entity = 1; entity < this._nextEntity; entity++) {
                if (!this._entityMask[entity]) continue;
                
                const entityMask = this._entityComponentMask[entity];
                if ((entityMask & requiredMask) === requiredMask) {
                    result.push(entity);
                }
            }
            
            return result;
        },

        /**
         * Iterate over entities with specific components (optimized)
         */
        forEach: function(componentNames, callback) {
            const poolInfo = [];
            
            for (const name of componentNames) {
                const compType = this._componentTypes.get(name);
                const pool = this._componentPools.get(name);
                if (!compType || !pool) return;
                
                poolInfo.push({ name, compType, pool });
            }
            
            const requiredMask = poolInfo.reduce((a, p) => a | (1 << p.compType.id), 0);
            
            for (let entity = 1; entity < this._nextEntity; entity++) {
                if (!this._entityMask[entity]) continue;
                
                const entityMask = this._entityComponentMask[entity];
                if ((entityMask & requiredMask) !== requiredMask) continue;
                
                // Build component data accessors
                const args = poolInfo.map(p => {
                    const index = p.pool.entityToIndex.get(entity);
                    return {
                        data: p.pool.data,
                        offset: index * p.compType.size,
                        size: p.compType.size,
                        fields: p.compType.fields
                    };
                });
                
                callback(entity, ...args);
            }
        },

        /**
         * Query with spatial filter (for Phase 4)
         */
        queryInRadius: function(x, z, radius, componentNames, callback) {
            // This will be connected to Quadtree in Phase 4
            const entities = this.getEntitiesWith(componentNames);
            const radiusSq = radius * radius;
            
            for (const entity of entities) {
                const transform = this.getComponent(entity, 'Transform');
                if (!transform) continue;
                
                const dx = transform.data[transform.offset] - x;
                const dz = transform.data[transform.offset + 2] - z;
                
                if (dx * dx + dz * dz <= radiusSq) {
                    callback(entity);
                }
            }
        },

        // ============================================
        // TAGS
        // ============================================

        addTag: function(entity, tag) {
            if (!this._entityTags.has(tag)) {
                this._entityTags.set(tag, new Set());
            }
            this._entityTags.get(tag).add(entity);
        },

        removeTag: function(entity, tag) {
            const set = this._entityTags.get(tag);
            if (set) set.delete(entity);
        },

        getEntitiesWithTag: function(tag) {
            const set = this._entityTags.get(tag);
            return set ? Array.from(set) : [];
        },

        // ============================================
        // SYSTEMS
        // ============================================

        registerSystem: function(name, components, update, options) {
            const system = {
                name,
                components,
                update,
                priority: options?.priority || 0,
                enabled: options?.enabled !== false,
                lastDt: 0
            };
            
            this._systems.push(system);
            this._systems.sort((a, b) => a.priority - b.priority);
            
            return system;
        },

        removeSystem: function(name) {
            const index = this._systems.findIndex(s => s.name === name);
            if (index >= 0) this._systems.splice(index, 1);
        },

        getSystem: function(name) {
            return this._systems.find(s => s.name === name);
        },

        /**
         * Run all systems
         */
        update: function(dt) {
            for (const system of this._systems) {
                if (!system.enabled) continue;
                system.lastDt = dt;
                system.update(dt);
            }
            
            // Process deferred destroys
            this._processDestroyQueue();
        },

        // ============================================
        // EVENTS / REACTIVE
        // ============================================

        on: function(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, []);
            }
            this._listeners.get(event).push(callback);
        },

        _emit: function(event, data) {
            const listeners = this._listeners.get(event);
            if (listeners) {
                for (const cb of listeners) {
                    cb(data);
                }
            }
        },

        // ============================================
        // UTILITIES
        // ============================================

        clear: function() {
            this._nextEntity = 1;
            this._entityMask.fill(0);
            this._entityComponentMask.fill(0);
            this._destroyQueue = [];
            
            for (const pool of this._componentPools.values()) {
                pool.entityToIndex.clear();
                pool.indexToEntity.clear();
                pool.freeIndices = [];
                pool.count = 0;
            }
            
            for (const set of this._entityTags.values()) {
                set.clear();
            }
        },

        getEntityCount: function() {
            return this._nextEntity - 1;
        },

        getStats: function() {
            return {
                entities: this.getEntityCount(),
                componentTypes: this._componentTypes.size,
                systems: this._systems.length,
                pools: Array.from(this._componentPools.entries()).map(([name, pool]) => ({
                    name,
                    count: pool.count,
                    capacity: pool.data ? pool.data.length : 0
                }))
            };
        }
    };

    // ============================================
    // PREDEFINED COMPONENTS
    // ============================================

    /**
     * Transform: Position, rotation, scale
     * Fields: x, y, z, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ
     */
    ECS.registerComponent('Transform', {
        size: 9,
        fields: [
            { name: 'x', default: 0 },
            { name: 'y', default: 0 },
            { name: 'z', default: 0 },
            { name: 'rotationX', default: 0 },
            { name: 'rotationY', default: 0 },
            { name: 'rotationZ', default: 0 },
            { name: 'scaleX', default: 1 },
            { name: 'scaleY', default: 1 },
            { name: 'scaleZ', default: 1 }
        ]
    });

    /**
     * Health: HP, maxHP, shield, etc.
     * Fields: hp, maxHp, shield, shieldRechargeRate
     */
    ECS.registerComponent('Health', {
        size: 4,
        fields: [
            { name: 'hp', default: 100 },
            { name: 'maxHp', default: 100 },
            { name: 'shield', default: 0 },
            { name: 'shieldRechargeRate', default: 0 }
        ]
    });

    /**
     * Velocity: Movement speed and direction
     * Fields: vx, vy, vz, speed, maxSpeed
     */
    ECS.registerComponent('Velocity', {
        size: 5,
        fields: [
            { name: 'vx', default: 0 },
            { name: 'vy', default: 0 },
            { name: 'vz', default: 0 },
            { name: 'speed', default: 0 },
            { name: 'maxSpeed', default: 10 }
        ]
    });

    /**
     * Team: Player/Enemy/Ally identification
     * Fields: team (0=neutral, 1=player/blue, 2=enemy/red)
     */
    ECS.registerComponent('Team', {
        size: 1,
        fields: [
            { name: 'team', default: 0 }
        ]
    });

    /**
     * Damage: Attack power and cooldowns
     * Fields: damage, range, attackCooldown, lastAttackTime
     */
    ECS.registerComponent('Damage', {
        size: 4,
        fields: [
            { name: 'damage', default: 10 },
            { name: 'range', default: 1 },
            { name: 'attackCooldown', default: 1 },
            { name: 'lastAttackTime', default: 0 }
        ]
    });

    /**
     * AI: Simple state machine for enemy behavior
     * Fields: state (0=idle, 1=patrol, 2=chase, 3=attack, 4=flee), targetEntity, aiType
     */
    ECS.registerComponent('AI', {
        size: 3,
        fields: [
            { name: 'state', default: 0 },
            { name: 'targetEntity', default: -1 },
            { name: 'aiType', default: 0 }
        ]
    });

    /**
     * StatusEffects: Dynamic traits (Burning, Poisoned, Frozen, etc.)
     * Fields: burning, frozen, poisoned, stunned, slowed, invisible
     */
    ECS.registerComponent('StatusEffects', {
        size: 6,
        fields: [
            { name: 'burning', default: 0 },      // Damage over time
            { name: 'frozen', default: 0 },      // Cannot move
            { name: 'poisoned', default: 0 },    // DOT + reduced healing
            { name: 'stunned', default: 0 },     // Cannot act
            { name: 'slowed', default: 0 },      // Speed reduced
            { name: 'invisible', default: 0 }    // Cannot be seen
        ],
        init: function(data, offset) {
            // Status effects tick in the StatusEffectSystem
        }
    });

    /**
     * Renderable: Visual representation (mesh reference, material, etc.)
     * Fields: meshId, materialId, visible, layer
     */
    ECS.registerComponent('Renderable', {
        size: 4,
        fields: [
            { name: 'meshId', default: -1 },
            { name: 'materialId', default: -1 },
            { name: 'visible', default: 1 },
            { name: 'layer', default: 0 }
        ]
    });

    /**
     * Collision: Bounding box for physics
     * Fields: radius, height, mass, isStatic
     */
    ECS.registerComponent('Collision', {
        size: 4,
        fields: [
            { name: 'radius', default: 0.5 },
            { name: 'height', default: 1 },
            { name: 'mass', default: 1 },
            { name: 'isStatic', default: 0 }
        ]
    });

    // ============================================
    // FACTORY FUNCTIONS
    // ============================================

    /**
     * Create a standard game unit (soldier, zombie, etc.)
     */
    ECS.createUnit = function(team, x, z, type) {
        const entity = ECS.createEntity();
        
        // Transform
        ECS.addComponent(entity, 'Transform', { x, y: 0, z });
        
        // Team
        const teamId = team === 'blue' || team === 'player' ? 1 : 2;
        ECS.addComponent(entity, 'Team', { team: teamId });
        
        // Stats based on type
        const stats = ECS._getUnitStats(type, teamId);
        ECS.addComponent(entity, 'Health', { 
            hp: stats.hp, 
            maxHp: stats.hp,
            shield: 0,
            shieldRechargeRate: 0
        });
        ECS.addComponent(entity, 'Velocity', {
            vx: 0, vy: 0, vz: 0,
            speed: stats.speed,
            maxSpeed: stats.speed
        });
        ECS.addComponent(entity, 'Damage', {
            damage: stats.atk,
            range: stats.range,
            attackCooldown: stats.atkCooldown,
            lastAttackTime: 0
        });
        
        // AI
        ECS.addComponent(entity, 'AI', {
            state: 0, // idle
            targetEntity: -1,
            aiType: 0
        });
        
        // Status effects
        ECS.addComponent(entity, 'StatusEffects');
        
        // Collision
        ECS.addComponent(entity, 'Collision', {
            radius: 0.3,
            height: 1.2,
            mass: 1,
            isStatic: 0
        });
        
        return entity;
    };

    /**
     * Get unit stats based on type
     */
    ECS._getUnitStats = function(type, team) {
        // Swordsman/Knight
        if (type === 'swordsman' || type === 'knight' || type === 'spearman') {
            return { hp: 100, atk: 14, range: 1.8, speed: 3.8, atkCooldown: 0.9 };
        }
        // Archer
        if (type === 'archer') {
            return { hp: 80, atk: 10, range: 14, speed: 3, atkCooldown: 1.6 };
        }
        // Cavalry
        if (type === 'cavalry') {
            return { hp: 140, atk: 20, range: 1.8, speed: 7, atkCooldown: 0.9 };
        }
        // Zombie variants (red team)
        if (team === 2) {
            if (type === 'zombie-runner') return { hp: 75, atk: 11, range: 1.6, speed: 5.1, atkCooldown: 0.75 };
            if (type === 'zombie-brute') return { hp: 180, atk: 26, range: 1.9, speed: 2.6, atkCooldown: 1.25 };
            if (type === 'zombie-spitter') return { hp: 85, atk: 13, range: 15, speed: 2.9, atkCooldown: 1.7 };
        }
        // Default
        return { hp: 100, atk: 10, range: 1.5, speed: 3, atkCooldown: 1 };
    };

    /**
     * Create a projectile (arrow, magic bolt, etc.)
     */
    ECS.createProjectile = function(x, y, z, vx, vy, vz, damage, ownerTeam) {
        const entity = ECS.createEntity('projectile');
        
        ECS.addComponent(entity, 'Transform', { x, y, z });
        ECS.addComponent(entity, 'Velocity', {
            vx, vy, vz,
            speed: Math.sqrt(vx*vx + vy*vy + vz*vz),
            maxSpeed: 50
        });
        ECS.addComponent(entity, 'Team', { team: ownerTeam });
        ECS.addComponent(entity, 'Damage', {
            damage,
            range: 0.5,
            attackCooldown: 0,
            lastAttackTime: 0
        });
        ECS.addComponent(entity, 'Collision', {
            radius: 0.1,
            height: 0.3,
            mass: 0.1,
            isStatic: 0
        });
        
        return entity;
    };

    /**
     * Create a particle effect
     */
    ECS.createParticle = function(x, y, z, vx, vy, vz, lifetime, color) {
        const entity = ECS.createEntity('particle');
        
        ECS.addComponent(entity, 'Transform', { x, y, z });
        ECS.addComponent(entity, 'Velocity', {
            vx, vy, vz,
            speed: Math.sqrt(vx*vx + vy*vy + vz*vz),
            maxSpeed: 10
        });
        // Custom particle data: lifetime, maxLifetime, color (packed), size
        const particleData = ECS.addComponent(entity, 'Particle', {
            lifetime: lifetime,
            maxLifetime: lifetime,
            color: color || 0xffffff,
            size: 1
        });
        
        return entity;
    };

    // Register particle component
    ECS.registerComponent('Particle', {
        size: 4,
        fields: [
            { name: 'lifetime', default: 1 },
            { name: 'maxLifetime', default: 1 },
            { name: 'color', default: 0xffffff },
            { name: 'size', default: 1 }
        ]
    });

    // ============================================
    // EXPORT
    // ============================================

    // Export to global
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ECS;
    } else {
        global.SGAI = global.SGAI || {};
        global.SGAI.ECS = ECS;
    }

})(typeof window !== 'undefined' ? window : this);
