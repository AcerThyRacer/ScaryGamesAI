/* ============================================
   The Abyss - Buoyancy & Underwater Physics
   Realistic fluid dynamics, drag, and currents
   Phase 1 Implementation
   ============================================ */

const BuoyancyPhysics = (function() {
    'use strict';

    // Physics constants
    const CONSTANTS = {
        WATER_DENSITY: 1025,      // kg/m³ (salt water)
        GRAVITY: 9.81,            // m/s²
        DRAG_COEFFICIENT: 0.47,   // Sphere approximation
        LIFT_COEFFICIENT: 0.2,    // Upward force from swimming
        VISCOSITY: 0.001,         // Dynamic viscosity
        TURBULENCE_SCALE: 0.5,
        MAX_VELOCITY: 20          // Terminal velocity
    };

    // Environment settings
    const ENVIRONMENT = {
        currentDirection: new THREE.Vector3(0, 0, 0),
        currentStrength: 0,
        turbulenceSeed: Math.random() * 100,
        temperature: 4,           // °C (deep ocean)
        pressure: 1               // atm at surface
    };

    // Physics bodies registry
    const bodies = new Map();
    let isActive = false;

    // ============================================
    // PHYSICS BODY CLASS
    // ============================================
    class PhysicsBody {
        constructor(object3D, config = {}) {
            this.object = object3D;
            this.mass = config.mass || 70;                    // kg (default human diver)
            this.volume = config.volume || 0.07;              // m³ (approximate human volume)
            this.dragCoeff = config.dragCoeff || CONSTANTS.DRAG_COEFFICIENT;
            this.buoyancyOffset = config.buoyancyOffset || 0; // Additional buoyancy (equipment)
            this.swimStrength = config.swimStrength || 5;     // Swimming force multiplier

            // State
            this.velocity = new THREE.Vector3(0, 0, 0);
            this.acceleration = new THREE.Vector3(0, 0, 0);
            this.angularVelocity = new THREE.Vector3(0, 0, 0);
            this.forces = new THREE.Vector3(0, 0, 0);

            // Flags
            this.isSwimming = false;
            this.isSprinting = false;
            this.isGrounded = false;
            this.inWater = true;

            // Cached values
            this.projectedArea = Math.pow(this.volume, 2/3); // Simplified
            this.buoyantForce = this.calculateBuoyantForce();

            // ID for registry
            this.id = Math.random().toString(36).substr(2, 9);
        }

        calculateBuoyantForce() {
            // F_buoyancy = ρ * V * g
            return CONSTANTS.WATER_DENSITY * this.volume * CONSTANTS.GRAVITY;
        }

        calculateWeight() {
            // F_weight = m * g
            return this.mass * CONSTANTS.GRAVITY;
        }

        calculateNetBuoyancy() {
            const weight = this.calculateWeight();
            const buoyancy = this.buoyantForce + this.buoyancyOffset;
            return buoyancy - weight; // Positive = floats, Negative = sinks
        }

        addForce(force) {
            this.forces.add(force);
        }

        addImpulse(impulse) {
            // Instant velocity change
            const deltaV = impulse.clone().divideScalar(this.mass);
            this.velocity.add(deltaV);
        }

        applyDrag(deltaTime) {
            // F_drag = 0.5 * ρ * v² * C_d * A
            const speed = this.velocity.length();
            if (speed < 0.001) return;

            const dragMagnitude = 0.5 *
                CONSTANTS.WATER_DENSITY *
                speed * speed *
                this.dragCoeff *
                this.projectedArea;

            const dragForce = this.velocity.clone()
                .normalize()
                .multiplyScalar(-dragMagnitude);

            this.forces.add(dragForce);
        }

        applyTurbulence(position, deltaTime) {
            // Perlin noise-based turbulence
            const time = performance.now() * 0.001;
            const scale = CONSTANTS.TURBULENCE_SCALE;

            const turbulence = new THREE.Vector3(
                Math.sin(position.x * scale + time) * Math.cos(position.y * scale),
                Math.sin(position.y * scale + time * 0.7) * 0.5,
                Math.cos(position.z * scale + time * 0.5) * Math.sin(position.x * scale)
            );

            // Turbulence increases with depth
            const depth = Math.abs(position.y);
            const depthFactor = Math.min(1, depth / 100);

            turbulence.multiplyScalar(5 * depthFactor);
            this.forces.add(turbulence);
        }

        applyCurrent(position) {
            if (ENVIRONMENT.currentStrength <= 0) return;

            // Current varies by depth
            const depth = Math.abs(position.y);
            const currentFactor = Math.max(0, 1 - depth / 50); // Current weaker at depth

            const currentForce = ENVIRONMENT.currentDirection.clone()
                .multiplyScalar(ENVIRONMENT.currentStrength * currentFactor * 10);

            this.forces.add(currentForce);
        }

        update(deltaTime) {
            if (!this.inWater) return;

            // Reset forces
            this.forces.set(0, 0, 0);

            // Apply gravity (weight)
            const weight = new THREE.Vector3(0, -this.calculateWeight(), 0);
            this.forces.add(weight);

            // Apply buoyancy
            const buoyancy = new THREE.Vector3(0, this.buoyantForce, 0);
            this.forces.add(buoyancy);

            // Apply drag
            this.applyDrag(deltaTime);

            // Apply environmental forces
            this.applyTurbulence(this.object.position, deltaTime);
            this.applyCurrent(this.object.position);

            // Calculate acceleration (F = ma)
            this.acceleration = this.forces.clone().divideScalar(this.mass);

            // Update velocity
            this.velocity.add(this.acceleration.multiplyScalar(deltaTime));

            // Terminal velocity clamp
            if (this.velocity.length() > CONSTANTS.MAX_VELOCITY) {
                this.velocity.normalize().multiplyScalar(CONSTANTS.MAX_VELOCITY);
            }

            // Update position
            const displacement = this.velocity.clone().multiplyScalar(deltaTime);
            this.object.position.add(displacement);

            // Apply angular drag
            this.angularVelocity.multiplyScalar(0.95);
            this.object.rotation.x += this.angularVelocity.x * deltaTime;
            this.object.rotation.y += this.angularVelocity.y * deltaTime;
            this.object.rotation.z += this.angularVelocity.z * deltaTime;

            // Floor collision
            if (this.object.position.y > -0.5) {
                this.object.position.y = -0.5;
                this.velocity.y = Math.max(0, this.velocity.y);
                this.isGrounded = true;
            } else {
                this.isGrounded = false;
            }

            return displacement.length();
        }

        swim(direction, sprint = false) {
            if (!this.inWater) return;

            const multiplier = sprint ? 2 : 1;
            const swimForce = direction.clone()
                .normalize()
                .multiplyScalar(this.swimStrength * multiplier);

            // Sprinting uses more oxygen (handled by game logic)
            this.forces.add(swimForce);
            this.isSwimming = true;
            this.isSprinting = sprint;
        }

        dispose() {
            bodies.delete(this.id);
        }
    }

    // ============================================
    // PARTICLE SYSTEM (Marine Snow/Bubbles)
    // ============================================
    class ParticleSystem {
        constructor(scene, config = {}) {
            this.scene = scene;
            this.maxParticles = config.maxParticles || 1000;
            this.particleSize = config.size || 0.05;
            this.color = config.color || 0xffffff;
            this.type = config.type || 'snow'; // 'snow' or 'bubble'

            this.geometry = new THREE.BufferGeometry();
            this.positions = new Float32Array(this.maxParticles * 3);
            this.velocities = new Float32Array(this.maxParticles * 3);
            this.lifetimes = new Float32Array(this.maxParticles);

            this.initParticles();
            this.createMesh();
        }

        initParticles() {
            for (let i = 0; i < this.maxParticles; i++) {
                this.resetParticle(i);
            }
        }

        resetParticle(index) {
            const i3 = index * 3;

            // Random position in a volume around player
            this.positions[i3] = (Math.random() - 0.5) * 50;
            this.positions[i3 + 1] = -Math.random() * 100;
            this.positions[i3 + 2] = (Math.random() - 0.5) * 50;

            // Upward drift for bubbles, downward for snow
            if (this.type === 'bubble') {
                this.velocities[i3] = (Math.random() - 0.5) * 0.1;
                this.velocities[i3 + 1] = 0.2 + Math.random() * 0.3;
                this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
            } else {
                this.velocities[i3] = (Math.random() - 0.5) * 0.05;
                this.velocities[i3 + 1] = -0.05 - Math.random() * 0.1;
                this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.05;
            }

            this.lifetimes[index] = Math.random() * 100;
        }

        createMesh() {
            this.geometry.setAttribute('position',
                new THREE.BufferAttribute(this.positions, 3));

            const material = new THREE.PointsMaterial({
                color: this.color,
                size: this.particleSize,
                transparent: true,
                opacity: this.type === 'bubble' ? 0.4 : 0.6,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            this.mesh = new THREE.Points(this.geometry, material);
            this.scene.add(this.mesh);
        }

        update(deltaTime, playerPosition) {
            const positions = this.geometry.attributes.position.array;

            for (let i = 0; i < this.maxParticles; i++) {
                const i3 = i * 3;

                // Update position
                positions[i3] += this.velocities[i3] * deltaTime;
                positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
                positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime;

                // Update lifetime
                this.lifetimes[i] -= deltaTime;

                // Reset if too far from player or lifetime expired
                const dx = positions[i3] - playerPosition.x;
                const dy = positions[i3 + 1] - playerPosition.y;
                const dz = positions[i3 + 2] - playerPosition.z;
                const distSq = dx * dx + dy * dy + dz * dz;

                if (this.lifetimes[i] <= 0 || distSq > 2500) {
                    // Reposition near player
                    this.positions[i3] = playerPosition.x + (Math.random() - 0.5) * 40;
                    this.positions[i3 + 1] = playerPosition.y + (Math.random() - 0.5) * 40;
                    this.positions[i3 + 2] = playerPosition.z + (Math.random() - 0.5) * 40;
                    this.lifetimes[i] = 50 + Math.random() * 50;
                }
            }

            this.geometry.attributes.position.needsUpdate = true;
        }

        dispose() {
            this.scene.remove(this.mesh);
            this.geometry.dispose();
            this.mesh.material.dispose();
        }
    }

    // ============================================
    // MANAGEMENT FUNCTIONS
    // ============================================
    function init() {
        isActive = true;
        console.log('🌊 Buoyancy Physics initialized');
        return true;
    }

    function createBody(object3D, config) {
        const body = new PhysicsBody(object3D, config);
        bodies.set(body.id, body);
        return body;
    }

    function removeBody(body) {
        bodies.delete(body.id);
        body.dispose();
    }

    function createParticleSystem(scene, config) {
        return new ParticleSystem(scene, config);
    }

    function update(deltaTime) {
        if (!isActive) return;

        for (const body of bodies.values()) {
            body.update(deltaTime);
        }
    }

    // ============================================
    // ENVIRONMENT CONTROLS
    // ============================================
    function setCurrent(direction, strength) {
        ENVIRONMENT.currentDirection.copy(direction).normalize();
        ENVIRONMENT.currentStrength = strength;
    }

    function setTemperature(temp) {
        ENVIRONMENT.temperature = temp;
        // Update water density based on temperature
        // ρ = ρ₀ / (1 + α(T - T₀))
        const thermalExpansion = 0.0002;
        CONSTANTS.WATER_DENSITY = 1025 / (1 + thermalExpansion * (temp - 4));
    }

    function setPressure(depth) {
        // P = P₀ + ρgh
        ENVIRONMENT.pressure = 1 + (CONSTANTS.WATER_DENSITY * CONSTANTS.GRAVITY * depth) / 101325;
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function getDepthPressure(depth) {
        return 1 + (CONSTANTS.WATER_DENSITY * CONSTANTS.GRAVITY * Math.abs(depth)) / 101325;
    }

    function getSoundSpeed(depth = 0) {
        // Speed of sound in water varies with temperature and depth
        // Approximate: c ≈ 1400 + 4.6T - 0.055T² + 0.0003T³ + (1.39 - 0.012T)(S - 35) + 0.017D
        const T = ENVIRONMENT.temperature;
        const D = Math.abs(depth);
        return 1400 + 4.6 * T - 0.055 * T * T + 0.017 * D;
    }

    function raycastUnderwater(origin, direction, maxDistance = 100) {
        // Simplified underwater raycast with refraction
        const waterRefractionIndex = 1.33;
        const refractedDir = direction.clone();

        // Apply snell's law simplification
        if (origin.y < 0) {
            refractedDir.y *= waterRefractionIndex;
            refractedDir.normalize();
        }

        return {
            direction: refractedDir,
            maxDistance: maxDistance,
            medium: origin.y < 0 ? 'water' : 'air'
        };
    }

    // ============================================
    // DISPOSAL
    // ============================================
    function dispose() {
        isActive = false;
        for (const body of bodies.values()) {
            body.dispose();
        }
        bodies.clear();
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        // Initialization
        init,
        dispose,

        // Body management
        createBody,
        removeBody,
        getBody: (id) => bodies.get(id),
        getAllBodies: () => Array.from(bodies.values()),

        // Particle systems
        createParticleSystem,

        // Update
        update,

        // Environment
        setCurrent,
        setTemperature,
        setPressure,
        getConstants: () => ({ ...CONSTANTS }),
        getEnvironment: () => ({ ...ENVIRONMENT }),

        // Utilities
        getDepthPressure,
        getSoundSpeed,
        raycastUnderwater,

        // Classes
        PhysicsBody
    };
})();

// Global access
window.BuoyancyPhysics = BuoyancyPhysics;
