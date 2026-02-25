// Caribbean Conquest - Enhanced Physics Engine
// Phase 1: Realistic ship physics with Cannon.js integration, buoyancy, and ocean forces

class EnhancedPhysicsEngine {
    constructor(game) {
        this.game = game;
        
        // Physics settings
        this.gravity = new THREE.Vector3(0, -9.8, 0);
        this.waterDensity = 1025; // kg/m³ (seawater)
        this.airDensity = 1.225; // kg/m³
        this.waterLevel = 0;
        
        // Physics world (using simplified physics for WebGL compatibility)
        this.bodies = [];
        this.constraints = [];
        
        // Collision layers
        this.layers = {
            NONE: 0,
            SHIP: 1,
            PROJECTILE: 2,
            ISLAND: 4,
            WATER: 8,
            CREW: 16
        };
        
        // Spatial partitioning for collision detection
        this.spatialGrid = new Map();
        this.cellSize = 50;
        
        // Buoyancy calculation caches
        this.buoyancyCache = new Map();
        
        // Physics substeps for stability
        this.substeps = 4;
        this.fixedDeltaTime = 1 / 60;
    }
    
    init() {
        // Initialize spatial grid
        this.spatialGrid.clear();
        
        // Register physics bodies
        this.bodies = [];
        
        console.log('Enhanced Physics Engine initialized');
        return true;
    }
    
    update(dt) {
        // Use fixed time steps for physics stability
        const steps = Math.ceil(dt / this.fixedDeltaTime);
        const stepDt = dt / steps;
        
        for (let step = 0; step < steps; step++) {
            this.fixedUpdate(stepDt);
        }
    }
    
    fixedUpdate(dt) {
        // Update all physics bodies
        for (const body of this.bodies) {
            if (body.enabled) {
                this.integrateBody(body, dt);
            }
        }
        
        // Apply constraints
        for (const constraint of this.constraints) {
            this.solveConstraint(constraint, dt);
        }
        
        // Detect and resolve collisions
        this.detectCollisions();
        
        // Update spatial grid
        this.updateSpatialGrid();
    }
    
    // Create a physics body for a ship
    createShipBody(ship) {
        const body = {
            type: 'ship',
            entity: ship,
            position: ship.position.clone(),
            rotation: new THREE.Euler(0, ship.rotation, 0, 'YXZ'),
            quaternion: new THREE.Quaternion().setFromEuler(
                new THREE.Euler(0, ship.rotation, 0, 'YXZ')
            ),
            velocity: ship.velocity ? ship.velocity.clone() : new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            
            // Mass properties
            mass: this.calculateShipMass(ship),
            inverseMass: 0,
            inertia: new THREE.Vector3(),
            inverseInertia: new THREE.Vector3(),
            
            // Shape for collision
            boundingBox: this.createShipBoundingBox(ship),
            
            // Forces
            forces: new THREE.Vector3(),
            torques: new THREE.Vector3(),
            
            // Damping
            linearDamping: 0.1,
            angularDamping: 0.2,
            
            // Buoyancy
            buoyancyData: {
                volume: this.calculateShipVolume(ship),
                waterplaneArea: this.calculateWaterplaneArea(ship),
                centerOfBuoyancy: new THREE.Vector3(),
                metacentricHeight: 0
            },
            
            // State
            enabled: true,
            sleeping: false,
            layer: this.layers.SHIP
        };
        
        body.inverseMass = body.mass > 0 ? 1 / body.mass : 0;
        this.calculateInertia(body);
        body.inverseInertia.set(
            body.inertia.x > 0 ? 1 / body.inertia.x : 0,
            body.inertia.y > 0 ? 1 / body.inertia.y : 0,
            body.inertia.z > 0 ? 1 / body.inertia.z : 0
        );
        
        this.bodies.push(body);
        return body;
    }
    
    calculateShipMass(ship) {
        // Base mass from ship class
        const baseMass = ship.classData.hp * 0.5; // 0.5 kg per HP
        
        // Add cargo mass
        const cargoMass = ship.cargo * 10; // 10 kg per cargo unit
        
        // Add crew mass
        const crewMass = ship.crew * 80; // 80 kg per crew member
        
        // Add cannon mass
        const cannonMass = ship.classData.cannons * 500; // 500 kg per cannon
        
        return baseMass + cargoMass + crewMass + cannonMass;
    }
    
    calculateShipVolume(ship) {
        // Approximate ship as a box for volume calculation
        const length = ship.classData.length;
        const width = ship.classData.width;
        const depth = ship.classData.length * 0.15; // Draft depth
        
        return length * width * depth;
    }
    
    calculateWaterplaneArea(ship) {
        // Waterplane area at waterline
        const length = ship.classData.length;
        const width = ship.classData.width;
        const waterplaneCoefficient = 0.75; // Typical for ships
        
        return length * width * waterplaneCoefficient;
    }
    
    calculateInertia(body) {
        // Approximate as a box
        const length = body.entity.classData.length;
        const width = body.entity.classData.width;
        const height = body.entity.classData.mastHeight;
        const mass = body.mass;
        
        // Box inertia tensor
        body.inertia.set(
            (mass / 12) * (width * width + height * height),
            (mass / 12) * (length * length + height * height),
            (mass / 12) * (length * length + width * width)
        );
    }
    
    createShipBoundingBox(ship) {
        const length = ship.classData.length;
        const width = ship.classData.width;
        const height = ship.classData.mastHeight;
        
        return {
            min: new THREE.Vector3(-length/2, -2, -width/2),
            max: new THREE.Vector3(length/2, height, width/2),
            center: new THREE.Vector3(0, 0, 0)
        };
    }
    
    integrateBody(body, dt) {
        if (body.sleeping || body.inverseMass === 0) return;
        
        // Apply forces
        const acceleration = body.forces.clone().multiplyScalar(body.inverseMass);
        
        // Add gravity
        acceleration.add(this.gravity);
        
        // Apply buoyancy
        this.applyBuoyancy(body);
        
        // Apply wind force
        this.applyWindForce(body);
        
        // Apply water drag
        this.applyWaterDrag(body);
        
        // Integrate velocity
        body.velocity.add(acceleration.multiplyScalar(dt));
        
        // Apply damping
        body.velocity.multiplyScalar(1 - body.linearDamping * dt);
        body.angularVelocity.multiplyScalar(1 - body.angularDamping * dt);
        
        // Integrate position
        body.position.add(body.velocity.clone().multiplyScalar(dt));
        
        // Integrate rotation
        const rotationDelta = body.angularVelocity.clone().multiplyScalar(dt);
        const deltaQuat = new THREE.Quaternion(
            rotationDelta.x,
            rotationDelta.y,
            rotationDelta.z,
            1
        ).normalize();
        body.quaternion.multiply(deltaQuat).normalize();
        
        // Update Euler rotation
        body.rotation.setFromQuaternion(body.quaternion);
        
        // Sync with entity
        this.syncBodyToEntity(body);
        
        // Clear forces
        body.forces.set(0, 0, 0);
        body.torques.set(0, 0, 0);
    }
    
    applyBuoyancy(body) {
        const buoyancy = body.buoyancyData;
        const position = body.position;
        
        // Calculate submerged depth
        const waterHeight = this.waterLevel;
        const submergedDepth = waterHeight - position.y;
        
        if (submergedDepth <= 0) {
            // Not in water
            buoyancy.centerOfBuoyancy.set(0, 0, 0);
            return;
        }
        
        // Calculate submerged volume (simplified)
        const draft = body.entity.classData.length * 0.15;
        const submergedFraction = Math.min(submergedDepth / draft, 1.0);
        const submergedVolume = buoyancy.volume * submergedFraction;
        
        // Buoyancy force = density * gravity * submerged volume
        const buoyancyForce = this.waterDensity * 9.8 * submergedVolume;
        
        // Center of buoyancy (simplified - center of submerged portion)
        const centerOfBuoyancyY = position.y - (draft * submergedFraction) / 2;
        buoyancy.centerOfBuoyancy.set(
            position.x,
            centerOfBuoyancyY,
            position.z
        );
        
        // Apply buoyancy force upward
        const force = new THREE.Vector3(0, buoyancyForce, 0);
        body.forces.add(force);
        
        // Calculate buoyancy torque (stability)
        const buoyancyOffset = buoyancy.centerOfBuoyancy.clone().sub(position);
        const torque = buoyancyOffset.cross(force);
        body.torques.add(torque);
        
        // Add restoring torque for stability (metacentric effect)
        const rollAngle = body.rotation.x;
        const pitchAngle = body.rotation.z;
        const gm = 0.5; // Metacentric height (simplified)
        
        const restoringTorque = new THREE.Vector3(
            -rollAngle * gm * buoyancyForce * dt,
            0,
            -pitchAngle * gm * buoyancyForce * dt
        );
        body.torques.add(restoringTorque);
    }
    
    applyWindForce(body) {
        const weather = this.game?.weather;
        if (!weather) return;
        
        const wind = weather.wind;
        const ship = body.entity;
        
        // Get sail area
        const sailArea = this.calculateSailArea(ship);
        
        // Wind direction in world space
        const windDir = new THREE.Vector3(
            wind.direction.x,
            0,
            wind.direction.y
        );
        
        // Ship's forward direction
        const shipForward = new THREE.Vector3(0, 0, 1)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), ship.rotation);
        
        // Angle between wind and ship
        const windAngle = Math.acos(
            Math.max(-1, Math.min(1, windDir.dot(shipForward)))
        );
        
        // Sail efficiency based on angle (best at ~45 degrees for sailing)
        const sailEfficiency = Math.abs(Math.sin(windAngle));
        
        // Wind force magnitude
        const windSpeed = wind.speed * 0.514444; // Convert knots to m/s
        const dynamicPressure = 0.5 * this.airDensity * windSpeed * windSpeed;
        const windForce = dynamicPressure * sailArea * sailEfficiency * 1.2; // 1.2 = drag coefficient
        
        // Apply force at sail center
        const sailHeight = ship.classData.mastHeight * 0.6;
        const sailCenter = body.position.clone();
        sailCenter.y += sailHeight;
        
        const force = windDir.multiplyScalar(windForce);
        body.forces.add(force);
        
        // Apply torque from wind
        const forceOffset = sailCenter.clone().sub(body.position);
        const torque = forceOffset.cross(force);
        body.torques.add(torque);
    }
    
    calculateSailArea(ship) {
        // Approximate sail area based on ship class
        const mastHeight = ship.classData.mastHeight;
        const width = ship.classData.width;
        
        // Each mast has multiple sails
        const numMasts = Math.floor(ship.classData.length / 15);
        const sailPerMast = mastHeight * width * 0.6;
        
        // Account for current sail angle
        const sailFactor = ship.sailAngle / 90;
        
        return numMasts * sailPerMast * sailFactor;
    }
    
    applyWaterDrag(body) {
        const velocity = body.velocity;
        const angularVelocity = body.angularVelocity;
        
        // Linear drag (water resistance)
        const dragCoefficient = 0.5;
        const linearDrag = velocity.clone().multiplyScalar(-dragCoefficient);
        body.forces.add(linearDrag);
        
        // Angular drag (rotational resistance)
        const angularDragCoefficient = 0.3;
        const angularDrag = angularVelocity.clone().multiplyScalar(-angularDragCoefficient);
        body.torques.add(angularDrag);
        
        // Additional drag when hull is damaged
        const hullDamage = 1 - (body.entity.hp / body.entity.maxHp);
        if (hullDamage > 0) {
            const damageDrag = velocity.clone().multiplyScalar(-hullDamage * 0.3);
            body.forces.add(damageDrag);
        }
    }
    
    syncBodyToEntity(body) {
        const entity = body.entity;
        
        // Sync position
        entity.position.copy(body.position);
        
        // Sync rotation (Y rotation only for ship)
        entity.rotation = body.rotation.y;
        
        // Sync velocity
        if (entity.velocity) {
            entity.velocity.copy(body.velocity);
        }
    }
    
    detectCollisions() {
        // Simple AABB collision detection
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const a = this.bodies[i];
                const b = this.bodies[j];
                
                if (this.checkAABB(a.boundingBox, b.boundingBox)) {
                    this.resolveCollision(a, b);
                }
            }
        }
    }
    
    checkAABB(a, b) {
        // Transform bounding boxes to world space
        const aWorld = this.transformBoundingBox(a);
        const bWorld = this.transformBoundingBox(b);
        
        return (
            aWorld.min.x <= bWorld.max.x && aWorld.max.x >= bWorld.min.x &&
            aWorld.min.y <= bWorld.max.y && aWorld.max.y >= bWorld.min.y &&
            aWorld.min.z <= bWorld.max.z && aWorld.max.z >= bWorld.min.z
        );
    }
    
    transformBoundingBox(body) {
        // Apply position and rotation to bounding box
        const pos = body.position;
        const rot = body.rotation.y;
        const box = body.boundingBox;
        
        // Simple approximation - just translate
        return {
            min: box.min.clone().add(pos),
            max: box.max.clone().add(pos)
        };
    }
    
    resolveCollision(a, b) {
        // Simple impulse-based collision response
        const normal = new THREE.Vector3(0, 1, 0); // Simplified
        
        // Relative velocity
        const relVel = b.velocity.clone().sub(a.velocity);
        
        // Relative velocity along normal
        const velAlongNormal = relVel.dot(normal);
        
        // Don't resolve if velocities are separating
        if (velAlongNormal > 0) return;
        
        // Calculate impulse scalar
        const e = 0.3; // Restitution (bounciness)
        let j = -(1 + e) * velAlongNormal;
        j /= (a.inverseMass + b.inverseMass);
        
        // Apply impulse
        const impulse = normal.multiplyScalar(j);
        a.velocity.sub(impulse.clone().multiplyScalar(a.inverseMass));
        b.velocity.add(impulse.clone().multiplyScalar(b.inverseMass));
    }
    
    updateSpatialGrid() {
        this.spatialGrid.clear();
        
        for (const body of this.bodies) {
            const cellX = Math.floor(body.position.x / this.cellSize);
            const cellZ = Math.floor(body.position.z / this.cellSize);
            const key = `${cellX},${cellZ}`;
            
            if (!this.spatialGrid.has(key)) {
                this.spatialGrid.set(key, []);
            }
            this.spatialGrid.get(key).push(body);
        }
    }
    
    solveConstraint(constraint, dt) {
        // Placeholder for constraint solving
        // Used for joints, ropes, etc.
    }
    
    // Raycast for projectile collision detection
    raycast(origin, direction, maxDistance = 1000) {
        const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
        
        // Get all ship meshes
        const shipMeshes = [];
        for (const body of this.bodies) {
            if (body.entity.mesh) {
                shipMeshes.push(body.entity.mesh);
            }
        }
        
        const intersects = raycaster.intersectObjects(shipMeshes, true);
        return intersects;
    }
    
    // Add a physics body
    addBody(body) {
        this.bodies.push(body);
    }
    
    // Remove a physics body
    removeBody(body) {
        const index = this.bodies.indexOf(body);
        if (index > -1) {
            this.bodies.splice(index, 1);
        }
    }
    
    // Enable/disable a body
    setBodyEnabled(body, enabled) {
        body.enabled = enabled;
        if (!enabled) {
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
        }
    }
    
    // Put body to sleep (optimization)
    sleepBody(body) {
        body.sleeping = true;
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
    }
    
    // Wake up a body
    wakeBody(body) {
        body.sleeping = false;
    }
}
