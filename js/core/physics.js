/**
 * ============================================
 * SGAI Physics Framework - Phase 11: Physics Engines
 * ============================================
 * Integration with Rapier (3D) and Matter.js (2D).
 * 
 * Key Benefits:
 * - Rigid body physics
 * - Continuous collision detection
 * - Ragdolls and joints
 */

(function(global) {
    'use strict';

    // ============================================
    // PHYSICS BRIDGE
    // ============================================

    /**
     * Unified physics interface
     */
    class PhysicsWorld {
        constructor(options = {}) {
            this.type = options.type || 'auto';
            this.world = null;
            this.bodies = new Map();
            this.gravity = options.gravity || { x: 0, y: -9.81, z: 0 };
            
            // Auto-detect physics engine
            if (this.type === 'auto') {
                this._detectEngine();
            }
            
            this._init();
        }

        /**
         * Detect available physics engine
         */
        _detectEngine() {
            if (typeof Matter !== 'undefined') {
                this.type = 'matter';
            } else if (typeof Rapier !== 'undefined') {
                this.type = 'rapier';
            } else {
                // Fallback to simple physics
                this.type = 'simple';
            }
            console.log(`[Physics] Using: ${this.type}`);
        }

        /**
         * Initialize physics world
         */
        _init() {
            switch (this.type) {
                case 'matter':
                    this._initMatter();
                    break;
                case 'rapier':
                    this._initRapier();
                    break;
                default:
                    this._initSimple();
            }
        }

        /**
         * Initialize Matter.js (2D)
         */
        _initMatter() {
            this.world = Matter.Engine.create();
            this.world.gravity.y = this.gravity.y;
            
            // Collision events
            Matter.Events.on(this.world, 'collisionStart', (event) => {
                for (const pair of event.pairs) {
                    const bodyA = pair.bodyA;
                    const bodyB = pair.bodyB;
                    
                    // Emit collision event
                    if (bodyA.onCollision) bodyA.onCollision(bodyB);
                    if (bodyB.onCollision) bodyB.onCollision(bodyA);
                }
            });
        }

        /**
         * Initialize Rapier (3D)
         */
        async _initRapier() {
            await RAPIER.init();
            this.world = new RAPIER.World(this.gravity);
        }

        /**
         * Initialize simple physics (fallback)
         */
        _initSimple() {
            this.bodies = [];
        }

        // ============================================
        // BODY CREATION
        // ============================================

        /**
         * Create rigid body
         */
        createBody(options = {}) {
            const { type, position, size, radius, isStatic, mass, restitution, friction } = options;
            
            switch (this.type) {
                case 'matter':
                    return this._createMatterBody(options);
                case 'rapier':
                    return this._createRapierBody(options);
                default:
                    return this._createSimpleBody(options);
            }
        }

        /**
         * Create Matter.js body
         */
        _createMatterBody(options) {
            const { type, position, size, radius, isStatic, mass } = options;
            
            let body;
            
            if (type === 'box') {
                body = Matter.Bodies.rectangle(
                    position.x, position.y,
                    size.width, size.height,
                    { isStatic, mass }
                );
            } else if (type === 'circle') {
                body = Matter.Bodies.circle(position.x, position.y, radius, { isStatic, mass });
            }
            
            if (body) {
                body.gameId = options.id;
                Matter.Composite.add(this.world.world, body);
                this.bodies.set(options.id, body);
            }
            
            return body;
        }

        /**
         * Create Rapier body
         */
        _createRapierBody(options) {
            const { type, position, size, radius, isStatic, mass } = options;
            
            const rigidBodyDesc = isStatic 
                ? RAPIER.RigidBodyDesc.fixed()
                : RAPIER.RigidBodyDesc.dynamic();
            
            rigidBodyDesc.setTranslation(position.x, position.y, position.z || 0);
            
            const rigidBody = this.world.createRigidBody(rigidBodyDesc);
            
            let colliderDesc;
            if (type === 'box') {
                colliderDesc = RAPIER.ColliderDesc.cuboid(
                    (size.width || 1) / 2,
                    (size.height || 1) / 2,
                    (size.depth || 1) / 2
                );
            } else if (type === 'sphere') {
                colliderDesc = RAPIER.ColliderDesc.ball(radius || 0.5);
            }
            
            if (colliderDesc) {
                const collider = this.world.createCollider(colliderDesc, rigidBody);
                collider.gameId = options.id;
            }
            
            this.bodies.set(options.id, { rigidBody, collider });
            
            return { rigidBody, collider };
        }

        /**
         * Create simple body
         */
        _createSimpleBody(options) {
            const body = {
                id: options.id,
                x: options.position.x,
                y: options.position.y,
                z: options.position.z || 0,
                vx: 0, vy: 0, vz: 0,
                isStatic: options.isStatic,
                mass: options.mass || 1,
                radius: options.radius,
                size: options.size,
                type: options.type,
                onCollision: options.onCollision
            };
            
            this.bodies.set(options.id, body);
            return body;
        }

        // ============================================
        // UPDATE
        // ============================================

        /**
         * Step physics simulation
         */
        step(dt) {
            switch (this.type) {
                case 'matter':
                    Matter.Engine.update(this.world, dt * 1000);
                    break;
                case 'rapier':
                    this.world.step();
                    break;
                case 'simple':
                    this._updateSimple(dt);
            }
        }

        /**
         * Simple physics update
         */
        _updateSimple(dt) {
            for (const body of this.bodies.values()) {
                if (body.isStatic) continue;
                
                // Gravity
                body.vy += this.gravity.y * dt;
                
                // Update position
                body.x += body.vx * dt;
                body.y += body.vy * dt;
                body.z += body.vz * dt;
                
                // Ground collision
                if (body.y < 0) {
                    body.y = 0;
                    body.vy *= -0.5; // Bounce
                    body.vx *= 0.9; // Friction
                    body.vz *= 0.9;
                }
            }
        }

        // ============================================
        // BODY OPERATIONS
        // ============================================

        /**
         * Apply force to body
         */
        applyForce(bodyId, force) {
            const body = this.bodies.get(bodyId);
            if (!body) return;
            
            switch (this.type) {
                case 'matter':
                    Matter.Body.applyForce(body, body.position, force);
                    break;
                case 'rapier':
                    body.rigidBody.applyImpulse(force, true);
                    break;
                case 'simple':
                    body.vx += force.x / body.mass;
                    body.vy += force.y / body.mass;
                    body.vz += force.z / body.mass;
            }
        }

        /**
         * Set body position
         */
        setPosition(bodyId, position) {
            const body = this.bodies.get(bodyId);
            if (!body) return;
            
            switch (this.type) {
                case 'matter':
                    Matter.Body.setPosition(body, position);
                    break;
                case 'rapier':
                    body.rigidBody.setTranslation(position, true);
                    break;
                case 'simple':
                    body.x = position.x;
                    body.y = position.y;
                    body.z = position.z || 0;
            }
        }

        /**
         * Get body position
         */
        getPosition(bodyId) {
            const body = this.bodies.get(bodyId);
            if (!body) return null;
            
            switch (this.type) {
                case 'matter':
                    return body.position;
                case 'rapier':
                    const pos = body.rigidBody.translation();
                    return { x: pos.x, y: pos.y, z: pos.z };
                case 'simple':
                    return { x: body.x, y: body.y, z: body.z };
            }
        }

        /**
         * Set body velocity
         */
        setVelocity(bodyId, velocity) {
            const body = this.bodies.get(bodyId);
            if (!body) return;
            
            switch (this.type) {
                case 'matter':
                    Matter.Body.setVelocity(body, velocity);
                    break;
                case 'rapier':
                    body.rigidBody.setLinvel(velocity, true);
                    break;
                case 'simple':
                    body.vx = velocity.x;
                    body.vy = velocity.y;
                    body.vz = velocity.z || 0;
            }
        }

        /**
         * Get body velocity
         */
        getVelocity(bodyId) {
            const body = this.bodies.get(bodyId);
            if (!body) return null;
            
            switch (this.type) {
                case 'matter':
                    return body.velocity;
                case 'rapier':
                    const vel = body.rigidBody.linvel();
                    return { x: vel.x, y: vel.y, z: vel.z };
                case 'simple':
                    return { x: body.vx, y: body.vy, z: body.vz };
            }
        }

        /**
         * Enable/disable body
         */
        setEnabled(bodyId, enabled) {
            const body = this.bodies.get(bodyId);
            if (!body) return;
            
            switch (this.type) {
                case 'matter':
                    Matter.Body.setEnabled(body, enabled);
                    break;
                case 'rapier':
                    body.rigidBody.setEnabled(enabled, true);
                    break;
            }
        }

        /**
         * Remove body
         */
        removeBody(bodyId) {
            const body = this.bodies.get(bodyId);
            if (!body) return;
            
            switch (this.type) {
                case 'matter':
                    Matter.Composite.remove(this.world.world, body);
                    break;
                case 'rapier':
                    this.world.removeRigidBody(body.rigidBody);
                    break;
            }
            
            this.bodies.delete(bodyId);
        }

        // ============================================
        // RAYCASTING
        // ============================================

        /**
         * Cast ray and return first hit
         */
        raycast(origin, direction, maxDistance = 100) {
            switch (this.type) {
                case 'matter':
                    return this._raycastMatter(origin, direction, maxDistance);
                case 'rapier':
                    return this._raycastRapier(origin, direction, maxDistance);
                default:
                    return null;
            }
        }

        /**
         * Matter.js raycast
         */
        _raycastMatter(origin, direction, maxDistance) {
            const ray = {
                p1: { x: origin.x, y: origin.y },
                p2: { 
                    x: origin.x + direction.x * maxDistance,
                    y: origin.y + direction.y * maxDistance
                }
            };
            
            const collisions = Matter.Query.ray(
                Matter.Composite.allBodies(this.world.world),
                ray.p1,
                ray.p2
            );
            
            if (collisions.length > 0) {
                return {
                    body: collisions[0].body,
                    point: collisions[0].body.position,
                    distance: collisions[0].distance
                };
            }
            
            return null;
        }

        // ============================================
        // SYNC WITH THREE.JS
        // ============================================

        /**
         * Sync physics bodies to Three.js meshes
         */
        syncMeshes(meshMap) {
            for (const [bodyId, mesh] of meshMap) {
                const pos = this.getPosition(bodyId);
                if (pos && mesh) {
                    mesh.position.set(pos.x, pos.y, pos.z || 0);
                    
                    if (this.type === 'matter' || this.type === 'rapier') {
                        const vel = this.getVelocity(bodyId);
                        if (vel) {
                            // Optional: orient mesh based on velocity
                        }
                    }
                }
            }
        }

        // ============================================
        // CLEANUP
        // ============================================

        /**
         * Dispose physics world
         */
        dispose() {
            if (this.type === 'matter') {
                Matter.World.clear(this.world.world);
                Matter.Engine.clear(this.world);
            }
            
            this.bodies.clear();
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    const SGAI = global.SGAI || {};
    SGAI.PhysicsWorld = PhysicsWorld;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            PhysicsWorld
        };
    } else {
        global.SGAI = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);
