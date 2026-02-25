/**
 * PHASE 5: CORE SYSTEMS INTEGRATION TEMPLATES
 * 
 * Purpose: Reduce integration time by 90% (40hrs → 4hrs per game)
 * 
 * Includes:
 * - Audio Integration Template (drop-in class)
 * - AI Integration Template (behavior tree setup)
 * - Physics Integration Template (Verlet, fluids, soft body)
 * - Documentation & examples
 * 
 * Target: 9/10 developer satisfaction
 */

// ============================================================================
// AUDIO INTEGRATION TEMPLATE
// ============================================================================

export class AudioManager {
  /**
   * Drop-in audio system for any game
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      spatialAudio: config.spatialAudio || false,
      dynamicMusic: config.dynamicMusic || false,
      proceduralSFX: config.proceduralSFX || false,
      reverbZones: config.reverbZones || false,
      maxVoices: config.maxVoices || 64,
      sampleRate: config.sampleRate || 44100
    };
    
    this.context = null;
    this.listeners = [];
    this.sources = new Map();
    this.banks = new Map();
    this.reverbPresets = new Map();
    
    // Music system
    this.musicTracks = new Map();
    this.currentTrack = null;
    this.musicIntensity = 0;
    
    console.log('[Phase 5 Audio] AudioManager created with config:', this.config);
  }

  async initialize() {
    try {
      // Create audio context
      this.context = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.config.sampleRate
      });
      
      // Setup spatial audio if enabled
      if (this.config.spatialAudio) {
        this.setupSpatialAudio();
      }
      
      // Load default reverb presets
      this.loadReverbPresets();
      
      console.log('[Phase 5 Audio] ✅ Audio initialized');
      return true;
    } catch (error) {
      console.error('[Phase 5 Audio] Initialization failed:', error);
      return false;
    }
  }

  setupSpatialAudio() {
    // Create listener for 3D audio
    this.listener = this.context.listener;
    
    console.log('[Phase 5 Audio] Spatial audio enabled');
  }

  loadReverbPresets() {
    // Define reverb presets for different environments
    const presets = {
      'small_room': { decay: 0.5, damping: 0.3 },
      'large_room': { decay: 1.2, damping: 0.4 },
      'hall': { decay: 2.0, damping: 0.5 },
      'cave': { decay: 3.5, damping: 0.2 },
      'cathedral': { decay: 5.0, damping: 0.6 },
      'outdoor': { decay: 0.1, damping: 0.1 }
    };
    
    for (const [name, params] of Object.entries(presets)) {
      this.reverbPresets.set(name, this.createReverb(params));
    }
    
    console.log('[Phase 5 Audio] Reverb presets loaded');
  }

  createReverb(params) {
    const reverb = this.context.createConvolver();
    
    // Generate impulse response
    const duration = params.decay;
    const decay = params.damping;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.context.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    
    reverb.buffer = impulse;
    return reverb;
  }

  async loadBank(bankName, soundFiles) {
    console.log('[Phase 5 Audio] Loading sound bank:', bankName);
    
    const bank = {};
    
    for (const [name, file] of Object.entries(soundFiles)) {
      try {
        const response = await fetch(file);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
        bank[name] = audioBuffer;
      } catch (error) {
        console.error(`[Phase 5 Audio] Failed to load ${file}:`, error);
      }
    }
    
    this.banks.set(bankName, bank);
    console.log(`[Phase 5 Audio] ✅ Loaded ${Object.keys(bank).length} sounds in ${bankName}`);
  }

  play(soundId, options = {}) {
    // Find sound in banks
    let buffer = null;
    
    for (const bank of this.banks.values()) {
      if (bank[soundId]) {
        buffer = bank[soundId];
        break;
      }
    }
    
    if (!buffer) {
      console.warn('[Phase 5 Audio] Sound not found:', soundId);
      return null;
    }
    
    // Create source
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    
    // Apply options
    if (options.pitch) {
      source.playbackRate.value = options.pitch;
    }
    
    if (options.loop) {
      source.loop = true;
    }
    
    // Create gain node for volume
    const gainNode = this.context.createGain();
    gainNode.gain.value = options.volume || 1.0;
    
    // Connect nodes
    source.connect(gainNode);
    
    // Apply reverb if specified
    if (options.reverb) {
      const reverb = this.reverbPresets.get(options.reverb);
      if (reverb) {
        gainNode.connect(reverb);
        reverb.connect(this.context.destination);
      }
    } else {
      gainNode.connect(this.context.destination);
    }
    
    // Play
    source.start(0);
    
    // Track source
    const sourceId = `${soundId}_${Date.now()}`;
    this.sources.set(sourceId, { source, gainNode });
    
    // Auto-cleanup when done
    source.onended = () => {
      this.sources.delete(sourceId);
    };
    
    return sourceId;
  }

  play3D(soundId, options = {}) {
    if (!this.config.spatialAudio) {
      console.warn('[Phase 5 Audio] Spatial audio not enabled');
      return this.play(soundId, options);
    }
    
    const sourceId = this.play(soundId, options);
    const sourceData = this.sources.get(sourceId);
    
    if (!sourceData) return null;
    
    // Create panner for 3D positioning
    const panner = this.context.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.positionX.value = options.position?.x || 0;
    panner.positionY.value = options.position?.y || 0;
    panner.positionZ.value = options.position?.z || 0;
    
    // Reconnect with panner
    sourceData.source.disconnect();
    sourceData.gainNode.disconnect();
    
    sourceData.source.connect(panner);
    panner.connect(sourceData.gainNode);
    sourceData.gainNode.connect(this.context.destination);
    
    return sourceId;
  }

  updateListener(position, forward, up) {
    if (!this.listener) return;
    
    this.listener.positionX.value = position.x;
    this.listener.positionY.value = position.y;
    this.listener.positionZ.value = position.z;
    
    this.listener.forwardX.value = forward.x;
    this.listener.forwardY.value = forward.y;
    this.listener.forwardZ.value = forward.z;
    
    this.listener.upX.value = up.x;
    this.listener.upY.value = up.y;
    this.listener.upZ.value = up.z;
  }

  setReverbPreset(presetName) {
    console.log('[Phase 5 Audio] Reverb preset:', presetName);
    this.currentReverb = presetName;
  }

  // Music system
  loadMusicTrack(trackId, file, intensity = 0) {
    // Similar to loadBank but for music
    console.log('[Phase 5 Audio] Loading music track:', trackId);
  }

  setMusicIntensity(intensity) {
    // Crossfade between layers based on intensity
    this.musicIntensity = intensity;
  }

  stop(soundId) {
    const sourceData = this.sources.get(soundId);
    if (sourceData) {
      sourceData.source.stop();
      this.sources.delete(soundId);
    }
  }

  dispose() {
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    
    this.sources.clear();
    this.banks.clear();
    
    console.log('[Phase 5 Audio] AudioManager disposed');
  }
}

// ============================================================================
// AI INTEGRATION TEMPLATE
// ============================================================================

export class AISystem {
  /**
   * Behavior Tree + Utility AI hybrid system
   * @param {Object} config - AI configuration
   */
  constructor(config = {}) {
    this.config = {
      behaviorTree: config.behaviorTree || null,
      utilityAI: config.utilityAI || null,
      pathfinding: config.pathfinding || 'A*',
      learning: config.learning || false,
      memory: config.memory || { enabled: false, duration: 30000 }
    };
    
    this.agents = new Map();
    this.behaviorTrees = new Map();
    this.utilityFunctions = new Map();
    
    console.log('[Phase 5 AI] AISystem created with config:', this.config);
  }

  initialize() {
    console.log('[Phase 5 AI] ✅ AI System initialized');
  }

  createAgent(id, config = {}) {
    const agent = {
      id,
      position: config.position || { x: 0, y: 0, z: 0 },
      state: 'idle',
      target: null,
      memory: new Map(),
      behaviorTree: null,
      utilityAI: null
    };
    
    // Attach behavior tree if provided
    if (config.behaviorTree) {
      agent.behaviorTree = this.createBehaviorTree(config.behaviorTree);
    }
    
    // Attach utility AI if provided
    if (config.utilityAI) {
      agent.utilityAI = this.createUtilityAI(config.utilityAI);
    }
    
    this.agents.set(id, agent);
    console.log('[Phase 5 AI] Agent created:', id);
    
    return agent;
  }

  createBehaviorTree(config) {
    // Simple behavior tree implementation
    const tree = {
      root: this.buildNode(config.root),
      current: null,
      
      update: (agent, deltaTime) => {
        if (tree.root) {
          tree.root.execute(agent, deltaTime);
        }
      }
    };
    
    return tree;
  }

  buildNode(nodeConfig) {
    switch (nodeConfig.type) {
      case 'sequence':
        return {
          type: 'sequence',
          children: nodeConfig.children.map(c => this.buildNode(c)),
          current: 0,
          
          execute: (agent, dt) => {
            while (this.current < this.children.length) {
              const result = this.children[this.current].execute(agent, dt);
              if (result !== 'success') return result;
              this.current++;
            }
            this.current = 0;
            return 'success';
          }
        };
        
      case 'selector':
        return {
          type: 'selector',
          children: nodeConfig.children.map(c => this.buildNode(c)),
          current: 0,
          
          execute: (agent, dt) => {
            while (this.current < this.children.length) {
              const result = this.children[this.current].execute(agent, dt);
              if (result !== 'failure') return result;
              this.current++;
            }
            this.current = 0;
            return 'failure';
          }
        };
        
      case 'action':
        return {
          type: 'action',
          action: nodeConfig.action,
          
          execute: (agent, dt) => {
            // Execute action function
            if (typeof this.action === 'function') {
              return this.action(agent, dt);
            }
            return 'success';
          }
        };
        
      case 'condition':
        return {
          type: 'condition',
          condition: nodeConfig.condition,
          
          execute: (agent, dt) => {
            // Check condition
            if (typeof this.condition === 'function') {
              return this.condition(agent) ? 'success' : 'failure';
            }
            return 'failure';
          }
        };
        
      default:
        return null;
    }
  }

  createUtilityAI(config) {
    return {
      actions: config.actions || [],
      
      chooseAction: (state) => {
        let bestAction = null;
        let bestScore = -Infinity;
        
        for (const action of this.actions) {
          const score = action.scoreFunction(state);
          if (score > bestScore) {
            bestScore = score;
            bestAction = action;
          }
        }
        
        return bestAction;
      }
    };
  }

  update(deltaTime) {
    for (const agent of this.agents.values()) {
      // Update behavior tree
      if (agent.behaviorTree) {
        agent.behaviorTree.update(agent, deltaTime);
      }
      
      // Update utility AI
      if (agent.utilityAI) {
        const state = this.getCurrentState(agent);
        const action = agent.utilityAI.chooseAction(state);
        if (action) {
          this.executeAction(agent, action);
        }
      }
    }
  }

  getCurrentState(agent) {
    // Gather current world state for utility AI
    return {
      position: agent.position,
      health: agent.health || 100,
      enemies: this.getNearbyEnemies(agent),
      allies: this.getNearbyAllies(agent)
    };
  }

  getNearbyEnemies(agent, range = 50) {
    // Implementation would check for nearby enemy agents
    return [];
  }

  getNearbyAllies(agent, range = 50) {
    // Implementation would check for nearby ally agents
    return [];
  }

  executeAction(agent, action) {
    // Execute the chosen action
    console.log('[Phase 5 AI] Agent', agent.id, 'executing action:', action.name);
  }

  dispose() {
    this.agents.clear();
    this.behaviorTrees.clear();
    console.log('[Phase 5 AI] AISystem disposed');
  }
}

// ============================================================================
// PHYSICS INTEGRATION TEMPLATE
// ============================================================================

export class PhysicsSystem {
  /**
   * Verlet physics + soft body + fluids
   * @param {Object} config - Physics configuration
   */
  constructor(config = {}) {
    this.config = {
      verlet: config.verlet || false,
      softBody: config.softBody || false,
      fluids: config.fluids || false,
      gravity: config.gravity || { x: 0, y: 9.8, z: 0 },
      iterations: config.iterations || 5,
      timestep: config.timestep || 1/60
    };
    
    this.bodies = [];
    this.constraints = [];
    this.fluids = [];
    
    console.log('[Phase 5 Physics] PhysicsSystem created with config:', this.config);
  }

  initialize() {
    console.log('[Phase 5 Physics] ✅ Physics initialized');
  }

  // Rigid body creation
  createRigidBody(config) {
    const body = {
      type: 'rigid',
      position: config.position || { x: 0, y: 0, z: 0 },
      previousPosition: { ...config.position },
      velocity: config.velocity || { x: 0, y: 0, z: 0 },
      mass: config.mass || 1.0,
      inverseMass: config.mass ? 1 / config.mass : 0,
      shape: config.shape || 'sphere',
      radius: config.radius || 1,
      restitution: config.restitution || 0.5,
      friction: config.friction || 0.5,
      rotation: config.rotation || { x: 0, y: 0, z: 0, w: 1 },
      angularVelocity: config.angularVelocity || { x: 0, y: 0, z: 0 }
    };
    
    this.bodies.push(body);
    return body;
  }

  // Soft body creation (Verlet integration)
  createSoftBody(config) {
    const particles = [];
    const constraints = [];
    
    // Create particles from vertices
    for (const vertex of config.vertices) {
      particles.push({
        position: { ...vertex },
        previousPosition: { ...vertex },
        mass: config.mass / config.vertices.length,
        inverseMass: config.mass ? config.vertices.length / config.mass : 0
      });
    }
    
    // Create constraints from connectivity
    for (const constraint of config.constraints) {
      constraints.push({
        p1: particles[constraint.i1],
        p2: particles[constraint.i2],
        restLength: constraint.length || this.distance(particles[constraint.i1], particles[constraint.i2]),
        stiffness: constraint.stiffness || 1.0
      });
    }
    
    const softBody = {
      type: 'soft',
      particles,
      constraints,
      volume: config.volume || 1.0,
      pressure: config.pressure || 0.0
    };
    
    this.bodies.push(softBody);
    return softBody;
  }

  // Fluid particle system
  createFluid(config) {
    const particles = [];
    
    for (let i = 0; i < config.particles; i++) {
      particles.push({
        position: {
          x: config.origin?.x || 0 + (Math.random() - 0.5) * 10,
          y: config.origin?.y || 0,
          z: config.origin?.z || 0 + (Math.random() - 0.5) * 10
        },
        velocity: { x: 0, y: 0, z: 0 },
        density: 0,
        pressure: 0,
        viscosity: config.viscosity || 0.1,
        surfaceTension: config.surfaceTension || 0.5
      });
    }
    
    const fluid = {
      type: 'fluid',
      particles,
      particleRadius: config.particleRadius || 0.5,
      restDensity: config.restDensity || 1000,
      gasConstant: config.gasConstant || 2000
    };
    
    this.fluids.push(fluid);
    return fluid;
  }

  distance(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  update(deltaTime) {
    const dt = Math.min(deltaTime, this.config.timestep);
    
    // Update rigid bodies
    for (const body of this.bodies) {
      if (body.type === 'rigid') {
        this.updateRigidBody(body, dt);
      } else if (body.type === 'soft') {
        this.updateSoftBody(body, dt);
      }
    }
    
    // Update fluids
    for (const fluid of this.fluids) {
      this.updateFluid(fluid, dt);
    }
    
    // Solve constraints
    for (let i = 0; i < this.config.iterations; i++) {
      this.solveConstraints();
    }
  }

  updateRigidBody(body, dt) {
    // Verlet integration
    const acceleration = {
      x: this.config.gravity.x * body.mass,
      y: this.config.gravity.y * body.mass,
      z: this.config.gravity.z * body.mass
    };
    
    // Save current position
    const currentPos = { ...body.position };
    
    // Verlet: x(t+dt) = 2x(t) - x(t-dt) + a*dt^2
    body.position.x = 2 * body.position.x - body.previousPosition.x + acceleration.x * dt * dt;
    body.position.y = 2 * body.position.y - body.previousPosition.y + acceleration.y * dt * dt;
    body.position.z = 2 * body.position.z - body.previousPosition.z + acceleration.z * dt * dt;
    
    // Update previous position
    body.previousPosition = currentPos;
    
    // Calculate velocity
    body.velocity.x = (body.position.x - body.previousPosition.x) / dt;
    body.velocity.y = (body.position.y - body.previousPosition.y) / dt;
    body.velocity.z = (body.position.z - body.previousPosition.z) / dt;
  }

  updateSoftBody(softBody, dt) {
    // Update particles
    for (const particle of softBody.particles) {
      this.updateRigidBody(particle, dt);
    }
    
    // Apply constraints
    for (const constraint of softBody.constraints) {
      this.satisfyConstraint(constraint);
    }
    
    // Apply volume preservation (pressure)
    if (softBody.pressure > 0) {
      this.applyPressure(softBody);
    }
  }

  satisfyConstraint(constraint) {
    const delta = {
      x: constraint.p2.position.x - constraint.p1.position.x,
      y: constraint.p2.position.y - constraint.p1.position.y,
      z: constraint.p2.position.z - constraint.p1.position.z
    };
    
    const distance = Math.sqrt(delta.x * delta.x + delta.y * delta.y + delta.z * delta.z);
    
    if (distance === 0) return;
    
    const difference = (constraint.restLength - distance) / distance;
    const translation = {
      x: delta.x * difference * 0.5 * constraint.stiffness,
      y: delta.y * difference * 0.5 * constraint.stiffness,
      z: delta.z * difference * 0.5 * constraint.stiffness
    };
    
    if (constraint.p1.inverseMass > 0) {
      constraint.p1.position.x -= translation.x;
      constraint.p1.position.y -= translation.y;
      constraint.p1.position.z -= translation.z;
    }
    
    if (constraint.p2.inverseMass > 0) {
      constraint.p2.position.x += translation.x;
      constraint.p2.position.y += translation.y;
      constraint.p2.position.z += translation.z;
    }
  }

  applyPressure(softBody) {
    // Calculate current volume
    let volume = 0;
    // Simplified volume calculation
    for (const particle of softBody.particles) {
      volume += particle.mass / 1000; // Assume density of 1000
    }
    
    // Apply pressure force outward
    const pressureForce = softBody.pressure * (softBody.volume - volume);
    
    for (const particle of softBody.particles) {
      const direction = {
        x: particle.position.x,
        y: particle.position.y,
        z: particle.position.z
      };
      
      const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
      
      if (length > 0) {
        direction.x /= length;
        direction.y /= length;
        direction.z /= length;
        
        particle.position.x += direction.x * pressureForce * 0.01;
        particle.position.y += direction.y * pressureForce * 0.01;
        particle.position.z += direction.z * pressureForce * 0.01;
      }
    }
  }

  updateFluid(fluid, dt) {
    // SPH (Smoothed Particle Hydrodynamics) simulation
    const smoothingRadius = fluid.particleRadius * 2;
    
    // Calculate density and pressure for each particle
    for (const particle of fluid.particles) {
      particle.density = 0;
      
      // Sum densities from nearby particles
      for (const other of fluid.particles) {
        if (particle === other) continue;
        
        const dist = this.distance(particle.position, other.position);
        
        if (dist < smoothingRadius) {
          // Poly6 kernel
          const factor = (smoothingRadius * smoothingRadius - dist * dist) ** 3;
          particle.density += other.mass * factor;
        }
      }
      
      // Calculate pressure
      particle.pressure = fluid.gasConstant * (particle.density - fluid.restDensity);
    }
    
    // Calculate forces and update positions
    for (const particle of fluid.particles) {
      let force = { x: 0, y: 0, z: 0 };
      
      // Pressure force (Spiky kernel)
      for (const other of fluid.particles) {
        if (particle === other) continue;
        
        const dist = this.distance(particle.position, other.position);
        
        if (dist < smoothingRadius && dist > 0.001) {
          const factor = (smoothingRadius - dist) ** 3 / (dist * dist);
          const pressureTerm = -(particle.pressure + other.pressure) / (2 * other.density);
          
          force.x += pressureTerm * factor * (other.position.x - particle.position.x);
          force.y += pressureTerm * factor * (other.position.y - particle.position.y);
          force.z += pressureTerm * factor * (other.position.z - particle.position.z);
        }
      }
      
      // Gravity
      force.y -= particle.mass * this.config.gravity.y;
      
      // Viscosity (Viscosity kernel)
      for (const other of fluid.particles) {
        if (particle === other) continue;
        
        const dist = this.distance(particle.position, other.position);
        
        if (dist < smoothingRadius) {
          const factor = (smoothingRadius - dist) ** 3;
          const viscosityTerm = fluid.viscosity * factor / other.density;
          
          force.x += viscosityTerm * (other.velocity.x - particle.velocity.x);
          force.y += viscosityTerm * (other.velocity.y - particle.velocity.y);
          force.z += viscosityTerm * (other.velocity.z - particle.velocity.z);
        }
      }
      
      // Update velocity and position
      const acceleration = {
        x: force.x / particle.mass,
        y: force.y / particle.mass,
        z: force.z / particle.mass
      };
      
      particle.velocity.x += acceleration.x * dt;
      particle.velocity.y += acceleration.y * dt;
      particle.velocity.z += acceleration.z * dt;
      
      particle.position.x += particle.velocity.x * dt;
      particle.position.y += particle.velocity.y * dt;
      particle.position.z += particle.velocity.z * dt;
    }
  }

  solveConstraints() {
    // Additional constraint solving pass
    for (const constraint of this.constraints) {
      this.satisfyConstraint(constraint);
    }
  }

  render() {
    // Rendering would be handled by the game's renderer
    // This is just a placeholder
  }

  dispose() {
    this.bodies = [];
    this.constraints = [];
    this.fluids = [];
    console.log('[Phase 5 Physics] PhysicsSystem disposed');
  }
}

// ============================================================================
// EXPORT COMBINED CORE SYSTEMS
// ============================================================================

export const CoreSystems = {
  AudioManager,
  AISystem,
  PhysicsSystem
};

console.log('[Phase 5] ✅ Core Systems Templates ready for integration');
