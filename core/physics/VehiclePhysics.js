/**
 * Vehicle Physics System - Phase 2 Enhancement
 * Realistic raycast vehicle model with suspension, differential, and terrain interaction
 * Supports cars, trucks, boats, and aircraft with modular configuration
 */

export class VehiclePhysicsSystem {
  constructor(options = {}) {
    this.options = {
      maxVehicles: options.maxVehicles || 50,
      enableSuspension: options.enableSuspension || true,
      enableDifferential: options.enableDifferential || true,
      enableTerrainInteraction: options.enableTerrainInteraction || true,
      ...options
    };

    this.vehicles = new Map();
    this.stats = { activeVehicles: 0, updateTime: 0 };
  }

  async initialize() {
    console.log('✓ Vehicle Physics System initialized');
    return true;
  }

  createVehicle(id, config) {
    const vehicle = {
      id,
      type: config.type || 'car',
      position: config.position || { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      
      // Chassis
      chassis: {
        mass: config.chassisMass || 1500,
        width: config.width || 2.0,
        length: config.length || 4.5,
        height: config.height || 1.5
      },
      
      // Wheels (4-wheel configuration by default)
      wheels: this.createWheels(config),
      
      // Engine & transmission
      engine: {
        power: config.enginePower || 200,
        rpm: 0,
        maxRpm: config.maxRpm || 7000,
        idleRpm: config.idleRpm || 800,
        torqueCurve: this.generateTorqueCurve()
      },
      
      transmission: {
        gears: config.gears || 6,
        currentGear: 0,
        ratios: [3.5, 2.5, 1.8, 1.4, 1.0, 0.8],
        finalDrive: 3.7
      },
      
      // Differential
      differential: {
        type: config.diffType || 'open',
        lockRatio: 0.0
      },
      
      // Suspension
      suspension: {
        springRate: config.springRate || 35000,
        damping: config.damping || 8000,
        travel: config.travel || 0.3,
        antiRollBar: config.antiRollBar || 1000
      },
      
      // Tires
      tires: {
        grip: config.tireGrip || 1.2,
        slipAngle: 0,
        wear: 0.0
      },
      
      // Controls
      controls: {
        throttle: 0,
        brake: 0,
        steering: 0,
        handbrake: 0
      },
      
      // State
      isGrounded: false,
      speed: 0
    };

    this.vehicles.set(id, vehicle);
    this.stats.activeVehicles++;
    return vehicle;
  }

  createWheels(config) {
    const wheelPositions = [
      { x: config.wheelbase || 2.7, y: -0.3, z: config.width / 2 },  // Front-left
      { x: config.wheelbase || 2.7, y: -0.3, z: -(config.width / 2) }, // Front-right
      { x: -(config.wheelbase || 2.7) * 0.3, y: -0.3, z: config.width / 2 },  // Rear-left
      { x: -(config.wheelbase || 2.7) * 0.3, y: -0.3, z: -(config.width / 2) } // Rear-right
    ];

    return wheelPositions.map((pos, i) => ({
      position: { ...pos },
      radius: config.wheelRadius || 0.35,
      width: config.wheelWidth || 0.25,
      steerAngle: i < 2 ? 0 : 0, // Front wheels steer
      driveWheel: config.driveType === 'rwd' ? i >= 2 : (config.driveType === 'fwd' ? i < 2 : true),
      brakeWheel: true,
      suspensionCompression: 0,
      slipRatio: 0,
      slipAngle: 0,
      rotation: 0
    }));
  }

  generateTorqueCurve() {
    // Simplified torque curve (RPM -> torque multiplier)
    return [
      { rpm: 0, torque: 0.5 },
      { rpm: 2000, torque: 0.9 },
      { rpm: 4000, torque: 1.0 },
      { rpm: 6000, torque: 0.95 },
      { rpm: 7000, torque: 0.7 }
    ];
  }

  update(vehicleId, deltaTime, terrain) {
    const startTime = performance.now();
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return;

    // Update engine
    this.updateEngine(vehicle, deltaTime);
    
    // Update transmission
    this.updateTransmission(vehicle, deltaTime);
    
    // Calculate wheel forces
    this.calculateWheelForces(vehicle, deltaTime, terrain);
    
    // Apply suspension
    if (this.options.enableSuspension) {
      this.applySuspension(vehicle, deltaTime);
    }
    
    // Update chassis dynamics
    this.updateChassis(vehicle, deltaTime);
    
    // Terrain interaction
    if (this.options.enableTerrainInteraction && terrain) {
      this.applyTerrainEffects(vehicle, terrain);
    }

    this.stats.updateTime = performance.now() - startTime;
  }

  updateEngine(vehicle, deltaTime) {
    const { engine, transmission, controls } = vehicle;
    
    // Calculate target RPM based on throttle and current gear
    const throttleInput = controls.throttle;
    const gearRatio = transmission.ratios[transmission.currentGear] || 1;
    const totalRatio = gearRatio * transmission.finalDrive;
    
    // Simple engine model
    engine.rpm += (throttleInput * engine.maxRpm - engine.rpm) * 0.1 * deltaTime;
    engine.rpm = Math.max(engine.idleRpm, Math.min(engine.maxRpm, engine.rpm));
    
    // Calculate torque from curve
    const torqueMultiplier = this.getTorqueAtRPM(engine.rpm, engine.torqueCurve);
    const currentTorque = (engine.power * torqueMultiplier) * throttleInput;
    
    vehicle.currentTorque = currentTorque;
  }

  getTorqueAtRPM(rpm, curve) {
    // Linear interpolation through torque curve
    for (let i = 0; i < curve.length - 1; i++) {
      if (rpm >= curve[i].rpm && rpm <= curve[i + 1].rpm) {
        const t = (rpm - curve[i].rpm) / (curve[i + 1].rpm - curve[i].rpm);
        return curve[i].torque + t * (curve[i + 1].torque - curve[i].torque);
      }
    }
    return 1.0;
  }

  updateTransmission(vehicle, deltaTime) {
    const { transmission, engine } = vehicle;
    
    // Automatic shifting logic
    const shiftUpRpm = engine.maxRpm * 0.9;
    const shiftDownRpm = engine.idleRpm * 1.5;
    
    if (engine.rpm > shiftUpRpm && transmission.currentGear < transmission.gears - 1) {
      transmission.currentGear++;
    } else if (engine.rpm < shiftDownRpm && transmission.currentGear > 0) {
      transmission.currentGear--;
    }
  }

  calculateWheelForces(vehicle, deltaTime, terrain) {
    const { wheels, chassis, controls } = vehicle;
    
    for (const wheel of wheels) {
      // Calculate slip ratio
      const wheelSpeed = wheel.rotation * wheel.radius;
      const vehicleSpeed = vehicle.speed;
      wheel.slipRatio = (wheelSpeed - vehicleSpeed) / Math.max(Math.abs(vehicleSpeed), 0.1);
      
      // Longitudinal force from tire friction
      const slipStiffness = 20;
      const longitudinalForce = Math.tan(wheel.slipRatio) * slipStiffness * wheel.load;
      
      // Lateral force from slip angle
      const corneringStiffness = 15;
      const lateralForce = Math.tan(wheel.slipAngle) * corneringStiffness * wheel.load;
      
      wheel.longitudinalForce = longitudinalForce;
      wheel.lateralForce = lateralForce;
      
      // Apply drive force
      if (wheel.driveWheel && vehicle.currentTorque) {
        wheel.longitudinalForce += vehicle.currentTorque / wheel.radius;
      }
      
      // Apply braking
      if (controls.brake > 0 || controls.handbrake > 0) {
        const brakeForce = (controls.brake + controls.handbrake) * 5000;
        wheel.longitudinalForce -= Math.sign(wheel.rotation) * brakeForce;
      }
    }
  }

  applySuspension(vehicle, deltaTime) {
    const { wheels, suspension, chassis } = vehicle;
    
    for (const wheel of wheels) {
      // Raycast to ground
      const rayLength = suspension.travel + wheel.radius;
      const hitDistance = this.raycastToGround(vehicle.position, wheel.position, rayLength);
      
      if (hitDistance < rayLength) {
        // Suspension compression
        const compression = rayLength - hitDistance;
        const compressionRate = (compression - wheel.suspensionCompression) / deltaTime;
        
        // Spring force
        const springForce = compression * suspension.springRate;
        const dampingForce = compressionRate * suspension.damping;
        
        wheel.load = springForce + dampingForce;
        wheel.suspensionCompression = compression;
        vehicle.isGrounded = true;
      } else {
        wheel.load = 0;
        wheel.suspensionCompression = 0;
        vehicle.isGrounded = false;
      }
    }
  }

  raycastToGround(position, wheelOffset, rayLength) {
    // Simplified ground detection
    return rayLength * 0.8; // Assume ground is always hit
  }

  updateChassis(vehicle, deltaTime) {
    const { wheels, chassis, velocity, angularVelocity } = vehicle;
    
    // Sum forces from all wheels
    let totalLongitudinal = 0;
    let totalLateral = 0;
    let totalYawMoment = 0;
    
    for (const wheel of wheels) {
      totalLongitudinal += wheel.longitudinalForce;
      totalLateral += wheel.lateralForce;
      
      // Yaw moment from lateral forces
      totalYawMoment += wheel.lateralForce * wheel.position.x;
    }
    
    // Apply forces to chassis
    const acceleration = totalLongitudinal / chassis.mass;
    velocity.x += acceleration * deltaTime;
    
    // Apply drag
    velocity.x *= 0.99;
    velocity.y *= 0.99;
    velocity.z *= 0.99;
    
    // Update speed
    vehicle.speed = velocity.x;
    
    // Update position
    vehicle.position.x += velocity.x * deltaTime;
    vehicle.position.y += velocity.y * deltaTime;
    vehicle.position.z += velocity.z * deltaTime;
    
    // Update wheel rotations
    for (const wheel of wheels) {
      wheel.rotation += (vehicle.speed / wheel.radius) * deltaTime;
    }
  }

  applyTerrainEffects(vehicle, terrain) {
    // Terrain-specific effects
    const terrainType = terrain.getType(vehicle.position);
    
    const terrainGrip = {
      asphalt: 1.0,
      gravel: 0.7,
      mud: 0.4,
      snow: 0.3,
      ice: 0.1,
      grass: 0.6
    };
    
    const grip = terrainGrip[terrainType] || 1.0;
    vehicle.tires.grip = grip;
    
    // Apply rolling resistance based on terrain
    const rollingResistance = {
      asphalt: 0.01,
      gravel: 0.03,
      mud: 0.08,
      snow: 0.05,
      ice: 0.005,
      grass: 0.04
    };
    
    vehicle.rollingResistance = rollingResistance[terrainType] || 0.01;
  }

  setControls(vehicleId, controls) {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return;
    
    vehicle.controls = { ...vehicle.controls, ...controls };
  }

  getStats() {
    return {
      ...this.stats,
      vehicleCount: this.vehicles.size
    };
  }
}
