// Caribbean Conquest - Enhanced Ship Entity
// Phase 1: Advanced sailing mechanics with realistic physics, tacking, jibing, and damage

class EnhancedShip extends Ship {
    constructor(game, config = {}) {
        super(game, config);
        
        // Enhanced sailing state
        this.sailingState = {
            // Wind interaction
            windAngle: 0, // Angle between ship heading and wind direction
            windEfficiency: 0, // How effectively wind propels the ship
            tackState: 'none', // 'none', 'tacking-left', 'tacking-right'
            tackProgress: 0,
            tackTimer: 0,
            tackDuration: 3, // seconds to complete a tack
            jibing: false,
            jibeProgress: 0,
            
            // Sail control
            sailTrim: 0.5, // 0-1, how tight sails are sheeted in
            sailReefed: false, // Are sails reefed (reduced area)
            sailDamage: 0, // 0-1 damage to sails
            
            // Hull state
            hullIntegrity: 1.0, // 0-1, structural integrity
            leaks: [], // Active leak positions and severity
            flooding: 0, // Water inside hull (0-1)
            buoyancy: 1.0, // Current buoyancy factor
            
            // Anchor state
            anchorState: 'raised', // 'raised', 'dropping', 'set', 'raising'
            anchorDepth: 0,
            anchorHold: 0, // How well anchor is holding (0-1)
            
            // Heel (tilt) from wind
            heelAngle: 0, // Current heel angle in radians
            heelVelocity: 0,
            
            // Draft (how deep in water)
            currentDraft: 0,
            maxDraft: this.classData.length * 0.15
        };
        
        // Crew assignments
        this.crewAssignments = {
            sailing: Math.floor(this.classData.crew * 0.3),
            gunnery: Math.floor(this.classData.crew * 0.4),
            repair: Math.floor(this.classData.crew * 0.2),
            officers: Math.floor(this.classData.crew * 0.1)
        };
        
        // Upgrades
        this.upgrades = {
            hull: { level: 0, maxLevel: 5 },
            sails: { level: 0, maxLevel: 5 },
            cannons: { level: 0, maxLevel: 5 },
            crewQuarters: { level: 0, maxLevel: 3 }
        };
        
        // Cosmetic customization
        this.cosmetics = {
            hullColor: this.classData.hullColor,
            sailColor: this.classData.sailColor,
            flag: 'pirate',
            figurehead: 'default',
            name: config.name || this.generateShipName()
        };
        
        // Physics body reference
        this.physicsBody = null;
        
        // Damage effects
        this.damageEffects = {
            onFire: false,
            fireTimer: 0,
            smokeParticles: null,
            fireParticles: null
        };
    }
    
    generateShipName() {
        const prefixes = ['Black', 'Golden', 'Silver', 'Iron', 'Crimson', 'Shadow', 'Storm', 'Blood', 'Ghost', 'Royal'];
        const suffixes = ['Pearl', 'Falcon', 'Revenge', 'Phoenix', 'Tempest', 'Serpent', 'Dragon', 'Queen', 'King', 'Marauder'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        return `${prefix} ${suffix}`;
    }
    
    async init() {
        await super.init();
        
        // Initialize physics body
        if (this.game.physics) {
            this.physicsBody = this.game.physics.createShipBody(this);
        }
        
        // Initialize damage effect particles
        this.initDamageEffects();
        
        // Set initial sail state
        this.sailingState.sailAngle = 45; // Start with sails at good angle
    }
    
    initDamageEffects() {
        // Create smoke particle system
        const smokeCount = 500;
        const smokeGeometry = new THREE.BufferGeometry();
        const smokePositions = new Float32Array(smokeCount * 3);
        const smokeVelocities = new Float32Array(smokeCount);
        
        for (let i = 0; i < smokeCount; i++) {
            smokePositions[i * 3] = (Math.random() - 0.5) * 10;
            smokePositions[i * 3 + 1] = Math.random() * 5;
            smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
            smokeVelocities[i] = 0.5 + Math.random() * 0.5;
        }
        
        smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
        smokeGeometry.userData.velocities = smokeVelocities;
        
        const smokeMaterial = new THREE.PointsMaterial({
            color: 0x444444,
            size: 2,
            transparent: true,
            opacity: 0.4
        });
        
        this.damageEffects.smokeParticles = new THREE.Points(smokeGeometry, smokeMaterial);
        this.damageEffects.smokeParticles.visible = false;
        
        if (this.mesh) {
            this.mesh.add(this.damageEffects.smokeParticles);
        }
    }
    
    update(dt) {
        // Update sailing physics
        this.updateSailingPhysics(dt);
        
        // Update wind interaction
        this.updateWindInteraction(dt);
        
        // Update heel (tilt)
        this.updateHeel(dt);
        
        // Update anchor
        this.updateAnchor(dt);
        
        // Update damage and leaks
        this.updateDamage(dt);
        
        // Update flooding
        this.updateFlooding(dt);
        
        // Update sail trim based on wind
        this.autoTrimSails(dt);
        
        // Sync with physics body if exists
        if (this.physicsBody) {
            this.syncFromPhysics();
        }
        
        // Update visual effects
        this.updateDamageEffects(dt);
        
        // Call parent update
        if (super.update) {
            super.update(dt);
        }
    }
    
    updateSailingPhysics(dt) {
        // Calculate current speed based on wind, sail state, and drag
        
        // Base speed from wind
        const wind = this.game?.weather?.wind;
        if (wind) {
            // Calculate wind angle relative to ship heading
            const windWorldAngle = Math.atan2(wind.direction.x, wind.direction.y);
            this.sailingState.windAngle = this.normalizeAngle(windWorldAngle - this.rotation);
            
            // Calculate wind efficiency (best at ~45 degrees, worst head-on)
            const optimalAngle = Math.PI / 4; // 45 degrees
            const angleDiff = Math.abs(this.sailingState.windAngle);
            
            // Can't sail directly into wind (within ~30 degrees)
            if (angleDiff < Math.PI / 6) {
                // In irons - very slow
                this.sailingState.windEfficiency = 0.1;
                
                // Auto-initiate tack if trying to sail into wind
                if (this.targetSpeed > 0.3 && this.sailingState.tackState === 'none') {
                    this.initiateTack();
                }
            } else {
                // Calculate efficiency based on angle
                const efficiencyAngle = Math.min(angleDiff, Math.PI - angleDiff);
                this.sailingState.windEfficiency = Math.sin(efficiencyAngle) * (1 - this.sailingState.sailDamage);
            }
            
            // Apply sail trim effect
            const trimEfficiency = 1 - Math.abs(this.sailingState.sailTrim - 0.5) * 0.4;
            this.sailingState.windEfficiency *= trimEfficiency;
            
            // Apply reefing effect
            if (this.sailingState.sailReefed) {
                this.sailingState.windEfficiency *= 0.6;
            }
        }
        
        // Calculate target speed
        const windSpeed = wind ? wind.speed * 0.514444 : 0; // Convert knots to m/s
        const maxSpeedFromWind = this.classData.maxSpeed * this.sailingState.windEfficiency;
        
        // Apply crew skill bonus
        const sailingCrew = this.crewAssignments.sailing / this.classData.crew;
        const crewBonus = 1 + sailingCrew * 0.2; // Up to 20% bonus
        
        // Apply upgrade bonus
        const sailUpgrade = this.upgrades.sails.level * 0.05; // 5% per level
        
        this.targetSpeed = maxSpeedFromWind * crewBonus * (1 + sailUpgrade);
        
        // Acceleration/deceleration
        const acceleration = this.targetSpeed > this.currentSpeed ? 0.5 : 0.3;
        this.currentSpeed = THREE.MathUtils.lerp(
            this.currentSpeed,
            this.targetSpeed,
            acceleration * dt
        );
        
        // Apply flooding penalty
        this.currentSpeed *= (1 - this.sailingState.flooding * 0.5);
        
        // Apply hull damage penalty
        this.currentSpeed *= this.sailingState.hullIntegrity;
        
        // Update velocity based on speed and heading
        if (this.velocity) {
            this.velocity.x = Math.sin(this.rotation) * this.currentSpeed;
            this.velocity.z = Math.cos(this.rotation) * this.currentSpeed;
        }
    }
    
    updateWindInteraction(dt) {
        // Update sail angle based on wind
        const optimalSailAngle = this.sailingState.windAngle * 0.5;
        const sailAngleSpeed = 2.0; // How fast sails can be adjusted
        
        if (!this.sailingState.tackState.includes('tacking')) {
            this.sailingState.sailAngle = THREE.MathUtils.lerp(
                this.sailingState.sailAngle,
                optimalSailAngle,
                sailAngleSpeed * dt
            );
        }
    }
    
    updateHeel(dt) {
        // Calculate heel (tilt) from wind pressure on sails
        const wind = this.game?.weather?.wind;
        if (!wind) return;
        
        const sailArea = this.calculateEffectiveSailArea();
        const windForce = wind.speed * sailArea * 0.01;
        
        // Heel target based on wind force and wind angle
        const heelTarget = windForce * Math.sin(this.sailingState.windAngle) * 0.02;
        
        // Apply heel with spring-damper
        const springConstant = 2.0;
        const dampingConstant = 1.5;
        
        const heelDiff = heelTarget - this.sailingState.heelAngle;
        const heelAcceleration = heelDiff * springConstant - this.sailingState.heelVelocity * dampingConstant;
        
        this.sailingState.heelVelocity += heelAcceleration * dt;
        this.sailingState.heelAngle += this.sailingState.heelVelocity * dt;
        
        // Clamp heel angle
        const maxHeel = Math.PI / 6; // 30 degrees max
        this.sailingState.heelAngle = Math.max(-maxHeel, Math.min(maxHeel, this.sailingState.heelAngle));
        
        // Apply heel to mesh
        if (this.mesh) {
            this.mesh.rotation.x = this.sailingState.heelAngle;
        }
    }
    
    calculateEffectiveSailArea() {
        const baseArea = this.classData.mastHeight * this.classData.width * 0.8;
        const numMasts = Math.floor(this.classData.length / 15);
        
        let area = baseArea * numMasts;
        
        // Apply reefing
        if (this.sailingState.sailReefed) {
            area *= 0.6;
        }
        
        // Apply damage
        area *= (1 - this.sailingState.sailDamage);
        
        // Apply upgrade bonus
        area *= (1 + this.upgrades.sails.level * 0.1);
        
        return area;
    }
    
    initiateTack() {
        if (this.sailingState.tackState !== 'none') return;
        
        // Choose tack direction based on current situation
        const direction = Math.random() > 0.5 ? 'left' : 'right';
        this.sailingState.tackState = `tacking-${direction}`;
        this.sailingState.tackProgress = 0;
        this.sailingState.tackTimer = this.sailingState.tackDuration;
    }
    
    updateTack(dt) {
        if (this.sailingState.tackState === 'none') return;
        
        this.sailingState.tackTimer -= dt;
        this.sailingState.tackProgress = 1 - (this.sailingState.tackTimer / this.sailingState.tackDuration);
        
        if (this.sailingState.tackTimer <= 0) {
            // Complete tack
            const direction = this.sailingState.tackState.includes('left') ? 1 : -1;
            this.rotation += direction * Math.PI / 4; // Turn 45 degrees
            this.sailingState.tackState = 'none';
            this.sailingState.tackProgress = 0;
        }
    }
    
    initiateJibe() {
        if (this.sailingState.jibing) return;
        
        this.sailingState.jibing = true;
        this.sailingState.jibeProgress = 0;
    }
    
    updateJibe(dt) {
        if (!this.sailingState.jibing) return;
        
        const jibeDuration = 2;
        this.sailingState.jibeProgress += dt / jibeDuration;
        
        if (this.sailingState.jibeProgress >= 1) {
            // Complete jibe
            this.sailingState.jibing = false;
            this.sailingState.jibeProgress = 0;
        }
    }
    
    updateAnchor(dt) {
        switch (this.sailingState.anchorState) {
            case 'dropping':
                this.sailingState.anchorDepth += dt * 0.5;
                if (this.sailingState.anchorDepth >= 1) {
                    this.sailingState.anchorState = 'set';
                    this.sailingState.anchorHold = 1;
                    this.currentSpeed *= 0.1; // Rapid deceleration
                }
                break;
                
            case 'set':
                // Anchor holds ship in place
                const holdStrength = this.sailingState.anchorHold;
                const windForce = this.game?.weather?.wind?.speed || 0;
                
                // Strong wind can break anchor hold
                if (windForce > 30 && Math.random() < 0.01) {
                    this.sailingState.anchorHold -= 0.1;
                    if (this.sailingState.anchorHold <= 0) {
                        this.sailingState.anchorState = 'raised';
                    }
                }
                
                // Apply holding force
                if (holdStrength > 0) {
                    this.currentSpeed *= (1 - holdStrength * 0.95);
                    if (this.velocity) {
                        this.velocity.multiplyScalar(1 - holdStrength * 0.95);
                    }
                }
                break;
                
            case 'raising':
                this.sailingState.anchorDepth -= dt * 0.3;
                this.sailingState.anchorHold = this.sailingState.anchorDepth;
                if (this.sailingState.anchorDepth <= 0) {
                    this.sailingState.anchorState = 'raised';
                    this.sailingState.anchorDepth = 0;
                }
                break;
        }
    }
    
    dropAnchor() {
        if (this.sailingState.anchorState === 'raised') {
            this.sailingState.anchorState = 'dropping';
        }
    }
    
    raiseAnchor() {
        if (this.sailingState.anchorState === 'set') {
            this.sailingState.anchorState = 'raising';
        }
    }
    
    updateDamage(dt) {
        // Update leaks
        for (const leak of this.sailingState.leaks) {
            leak.severity -= dt * 0.01; // Leaks slowly improve with repair
            if (leak.severity <= 0) {
                this.sailingState.leaks = this.sailingState.leaks.filter(l => l !== leak);
            }
        }
        
        // Update fire
        if (this.damageEffects.onFire) {
            this.damageEffects.fireTimer -= dt;
            
            // Fire causes hull damage
            if (this.damageEffects.fireTimer > 0) {
                this.takeHullDamage(5 * dt);
            } else {
                this.damageEffects.onFire = false;
            }
        }
        
        // Update hull integrity from damage
        if (this.hp < this.maxHp) {
            this.sailingState.hullIntegrity = this.hp / this.maxHp;
        }
    }
    
    updateFlooding(dt) {
        // Calculate total leak severity
        const totalLeakSeverity = this.sailingState.leaks.reduce((sum, leak) => sum + leak.severity, 0);
        
        // Flooding increases based on leaks and decreases based on repair crew
        const repairRate = (this.crewAssignments.repair / this.classData.crew) * 0.1;
        const floodRate = totalLeakSeverity * 0.05;
        
        this.sailingState.flooding += (floodRate - repairRate) * dt;
        this.sailingState.flooding = Math.max(0, Math.min(1, this.sailingState.flooding));
        
        // Severe flooding causes sinking
        if (this.sailingState.flooding >= 1) {
            this.sink();
        }
    }
    
    takeHullDamage(amount) {
        this.hp -= amount;
        this.sailingState.hullIntegrity = this.hp / this.maxHp;
        
        // Chance to create leak on significant damage
        if (Math.random() < 0.3 && amount > 10) {
            this.createLeak(0.3 + Math.random() * 0.3);
        }
        
        // Check for destruction
        if (this.hp <= 0) {
            this.sink();
        }
    }
    
    takeSailDamage(amount) {
        this.sailingState.sailDamage = Math.min(1, this.sailingState.sailDamage + amount);
    }
    
    createLeak(severity) {
        this.sailingState.leaks.push({
            position: new THREE.Vector3(
                (Math.random() - 0.5) * this.classData.length,
                -1,
                (Math.random() - 0.5) * this.classData.width
            ),
            severity: severity
        });
    }
    
    repairHull(amount) {
        const repairCrew = this.crewAssignments.repair / this.classData.crew;
        const repairEffectiveness = repairCrew * (1 + this.upgrades.crewQuarters.level * 0.2);
        
        this.hp = Math.min(this.maxHp, this.hp + amount * repairEffectiveness);
        this.sailingState.hullIntegrity = this.hp / this.maxHp;
    }
    
    repairSails(amount) {
        this.sailingState.sailDamage = Math.max(0, this.sailingState.sailDamage - amount);
    }
    
    setFire(duration) {
        this.damageEffects.onFire = true;
        this.damageEffects.fireTimer = duration;
    }
    
    extinguishFire() {
        this.damageEffects.onFire = false;
        this.damageEffects.fireTimer = 0;
    }
    
    updateDamageEffects(dt) {
        // Update smoke visibility
        if (this.damageEffects.smokeParticles) {
            this.damageEffects.smokeParticles.visible = this.damageEffects.onFire || this.sailingState.hullIntegrity < 0.3;
            
            // Animate smoke particles
            const positions = this.damageEffects.smokeParticles.geometry.attributes.position.array;
            const velocities = this.damageEffects.smokeParticles.geometry.userData.velocities;
            
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] += velocities[i] * dt;
                
                // Reset particle if too high
                if (positions[i * 3 + 1] > 20) {
                    positions[i * 3 + 1] = Math.random() * 5;
                    positions[i * 3] = (Math.random() - 0.5) * 10;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
                }
            }
            
            this.damageEffects.smokeParticles.geometry.attributes.position.needsUpdate = true;
        }
    }
    
    sink() {
        // Ship is destroyed
        this.hp = 0;
        this.sailingState.hullIntegrity = 0;
        
        // Notify game
        if (this.game) {
            this.game.onShipSunk(this);
        }
    }
    
    autoTrimSails(dt) {
        // Automatically adjust sail trim for optimal efficiency
        const targetTrim = 0.5 + Math.sin(this.sailingState.windAngle) * 0.3;
        this.sailingState.sailTrim = THREE.MathUtils.lerp(
            this.sailingState.sailTrim,
            targetTrim,
            dt * 0.5
        );
    }
    
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }
    
    syncFromPhysics() {
        if (!this.physicsBody) return;
        
        const body = this.physicsBody;
        this.position.copy(body.position);
        this.rotation = body.rotation.y;
        
        if (this.velocity) {
            this.velocity.copy(body.velocity);
        }
        
        this.currentSpeed = this.velocity.length();
    }
    
    // Crew management
    assignCrew(role, count) {
        if (role === 'all') {
            // Reset to default distribution
            this.crewAssignments = {
                sailing: Math.floor(this.crew * 0.3),
                gunnery: Math.floor(this.crew * 0.4),
                repair: Math.floor(this.crew * 0.2),
                officers: Math.floor(this.crew * 0.1)
            };
            return;
        }
        
        if (this.crewAssignments.hasOwnProperty(role)) {
            this.crewAssignments[role] = Math.max(0, Math.min(this.crew, count));
            
            // Ensure total doesn't exceed crew
            const total = Object.values(this.crewAssignments).reduce((a, b) => a + b, 0);
            if (total > this.crew) {
                // Reduce from other roles proportionally
                const excess = total - this.crew;
                const otherRoles = Object.keys(this.crewAssignments).filter(r => r !== role);
                for (const r of otherRoles) {
                    const reduction = excess * (this.crewAssignments[r] / total);
                    this.crewAssignments[r] = Math.max(1, Math.floor(this.crewAssignments[r] - reduction));
                }
            }
        }
    }
    
    getCrewEfficiency(role) {
        const assigned = this.crewAssignments[role] || 0;
        const optimal = this.classData.crew * 0.3;
        return Math.min(1, assigned / optimal);
    }
    
    // Upgrade system
    applyUpgrade(type, level) {
        if (this.upgrades[type] && level <= this.upgrades[type].maxLevel) {
            this.upgrades[type].level = level;
            
            // Apply upgrade effects
            switch (type) {
                case 'hull':
                    this.maxHp = this.classData.hp * (1 + level * 0.1);
                    this.hp = this.maxHp;
                    break;
                case 'sails':
                    // Speed bonus applied in updateSailingPhysics
                    break;
                case 'cannons':
                    // Damage bonus applied in combat system
                    break;
                case 'crewQuarters':
                    // Repair efficiency bonus applied in repair methods
                    break;
            }
        }
    }
    
    // Serialization for save/load
    toJSON() {
        return {
            ...super.toJSON?.(),
            type: this.type,
            position: this.position,
            rotation: this.rotation,
            hp: this.hp,
            crew: this.crew,
            cargo: this.cargo,
            sailingState: this.sailingState,
            crewAssignments: this.crewAssignments,
            upgrades: this.upgrades,
            cosmetics: this.cosmetics
        };
    }
}
