/**
 * DynamicDestruction2026 — Dynamic Destruction System
 * Material-specific fracture, Voronoi mesh splitting, debris physics,
 * structural integrity cascades, and hidden content reveals.
 * All fracture computation runs on GPU via compute shaders.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const MATERIAL_TYPES = {
  WOOD: 0,
  STONE: 1,
  GLASS: 2,
  METAL: 3,
  BONE: 4,
  FLESH: 5,
  ICE: 6,
};

const MATERIAL_PROPERTIES = {
  [MATERIAL_TYPES.WOOD]: {
    name: 'wood',
    fracturePieces: [4, 8],
    splinterRatio: 0.6,
    dustAmount: 0.2,
    soundId: 'wood_break',
    debrisLifetime: 8.0,
    grainDirection: [0, 1, 0],
    toughness: 0.6,
    density: 0.5,
  },
  [MATERIAL_TYPES.STONE]: {
    name: 'stone',
    fracturePieces: [5, 12],
    splinterRatio: 0.0,
    dustAmount: 0.8,
    soundId: 'stone_break',
    debrisLifetime: 12.0,
    grainDirection: null,
    toughness: 0.8,
    density: 2.4,
  },
  [MATERIAL_TYPES.GLASS]: {
    name: 'glass',
    fracturePieces: [8, 20],
    splinterRatio: 0.0,
    dustAmount: 0.0,
    soundId: 'glass_shatter',
    debrisLifetime: 15.0,
    grainDirection: null,
    toughness: 0.2,
    density: 2.5,
  },
  [MATERIAL_TYPES.METAL]: {
    name: 'metal',
    fracturePieces: [2, 5],
    splinterRatio: 0.0,
    dustAmount: 0.1,
    soundId: 'metal_tear',
    debrisLifetime: 20.0,
    grainDirection: null,
    toughness: 1.0,
    density: 7.8,
    emissiveSparks: true,
  },
  [MATERIAL_TYPES.BONE]: {
    name: 'bone',
    fracturePieces: [2, 6],
    splinterRatio: 0.3,
    dustAmount: 0.1,
    soundId: 'bone_snap',
    debrisLifetime: 10.0,
    grainDirection: [0, 1, 0],
    toughness: 0.5,
    density: 1.9,
  },
  [MATERIAL_TYPES.FLESH]: {
    name: 'flesh',
    fracturePieces: [2, 4],
    splinterRatio: 0.0,
    dustAmount: 0.0,
    soundId: 'flesh_tear',
    debrisLifetime: 6.0,
    grainDirection: null,
    toughness: 0.15,
    density: 1.0,
    bloodSpray: true,
  },
  [MATERIAL_TYPES.ICE]: {
    name: 'ice',
    fracturePieces: [6, 16],
    splinterRatio: 0.1,
    dustAmount: 0.3,
    soundId: 'ice_crack',
    debrisLifetime: 5.0,
    grainDirection: null,
    toughness: 0.3,
    density: 0.9,
    mistOnBreak: true,
  },
};

const VORONOI_FRACTURE_SHADER = /* wgsl */ `
struct FractureParams {
  seedCount: u32,
  meshVertexCount: u32,
  impactPoint: vec3f,
  _pad0: f32,
  impactDirection: vec3f,
  force: f32,
  materialType: u32,
  grainX: f32,
  grainY: f32,
  grainZ: f32,
};

struct Vertex {
  position: vec3f,
  normal: vec3f,
};

struct FracturePiece {
  centerOfMass: vec3f,
  volume: f32,
  surfaceArea: f32,
  vertexStart: u32,
  vertexCount: u32,
  seedIndex: u32,
};

@group(0) @binding(0) var<uniform> params: FractureParams;
@group(0) @binding(1) var<storage, read> inputVertices: array<Vertex>;
@group(0) @binding(2) var<storage, read> voronoiSeeds: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> outputPieces: array<FracturePiece>;
@group(0) @binding(4) var<storage, read_write> outputVertices: array<Vertex>;
@group(0) @binding(5) var<storage, read_write> counters: array<atomic<u32>>;

fn hash3(p: vec3f) -> vec3f {
  var q = fract(p * vec3f(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yxz + 33.33);
  return fract((q.xxy + q.yxx) * q.zyx);
}

fn distortedDistance(p: vec3f, seed: vec3f, grainDir: vec3f) -> f32 {
  let diff = p - seed;
  // Grain direction stretches Voronoi cells along material grain
  let grainStretch = select(1.0, 2.5, length(grainDir) > 0.01);
  let grainFactor = abs(dot(normalize(diff + vec3f(0.001)), normalize(grainDir + vec3f(0.001))));
  let stretched = length(diff) * mix(1.0, grainStretch, grainFactor);
  return stretched;
}

fn findNearestSeed(p: vec3f, grainDir: vec3f) -> u32 {
  var minDist = 1e10;
  var nearest = 0u;
  for (var i = 0u; i < params.seedCount; i++) {
    let d = distortedDistance(p, voronoiSeeds[i].xyz, grainDir);
    if (d < minDist) {
      minDist = d;
      nearest = i;
    }
  }
  return nearest;
}

@compute @workgroup_size(64, 1, 1)
fn assignVertices(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.meshVertexCount) { return; }

  let vertex = inputVertices[gid.x];
  let grainDir = vec3f(params.grainX, params.grainY, params.grainZ);
  let seedIdx = findNearestSeed(vertex.position, grainDir);

  // Write vertex to output at an atomically-allocated slot
  let outIdx = atomicAdd(&counters[seedIdx], 1u);
  let maxPerPiece = params.meshVertexCount;
  let writeIdx = seedIdx * maxPerPiece + outIdx;
  if (writeIdx < arrayLength(&outputVertices)) {
    outputVertices[writeIdx] = vertex;
  }
}

@compute @workgroup_size(64, 1, 1)
fn computePieceProperties(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.seedCount) { return; }

  let vertCount = atomicLoad(&counters[gid.x]);
  let maxPerPiece = params.meshVertexCount;
  let baseIdx = gid.x * maxPerPiece;

  // Compute center of mass
  var com = vec3f(0.0);
  for (var i = 0u; i < vertCount; i++) {
    com += outputVertices[baseIdx + i].position;
  }
  if (vertCount > 0u) { com /= f32(vertCount); }

  // Estimate volume and surface area from vertex spread
  var maxDist = 0.0;
  var surfaceSum = 0.0;
  for (var i = 0u; i < vertCount; i++) {
    let d = length(outputVertices[baseIdx + i].position - com);
    maxDist = max(maxDist, d);
    if (i > 0u) {
      surfaceSum += length(
        outputVertices[baseIdx + i].position - outputVertices[baseIdx + i - 1u].position
      );
    }
  }

  let approxVolume = 4.0 / 3.0 * 3.14159 * maxDist * maxDist * maxDist * 0.5;

  outputPieces[gid.x] = FracturePiece(
    com,
    approxVolume,
    surfaceSum,
    baseIdx,
    vertCount,
    gid.x,
  );
}
`;

const DEBRIS_PHYSICS_SHADER = /* wgsl */ `
struct PhysicsParams {
  deltaTime: f32,
  gravity: f32,
  damping: f32,
  groundY: f32,
  bounceRestitution: f32,
  activeCount: u32,
  time: f32,
  _pad: f32,
};

struct DebrisParticle {
  position: vec3f,
  lifetime: f32,
  prevPosition: vec3f,
  maxLifetime: f32,
  velocity: vec3f,
  mass: f32,
  angularVelocity: vec3f,
  materialType: u32,
  rotation: vec4f,
  scale: vec3f,
  emissive: f32,
};

@group(0) @binding(0) var<uniform> params: PhysicsParams;
@group(0) @binding(1) var<storage, read_write> particles: array<DebrisParticle>;
@group(0) @binding(2) var<storage, read_write> aliveCount: atomic<u32>;

fn quatMul(a: vec4f, b: vec4f) -> vec4f {
  return vec4f(
    a.w * b.xyz + b.w * a.xyz + cross(a.xyz, b.xyz),
    a.w * b.w - dot(a.xyz, b.xyz)
  );
}

fn quatFromAxisAngle(axis: vec3f, angle: f32) -> vec4f {
  let s = sin(angle * 0.5);
  let c = cos(angle * 0.5);
  return vec4f(axis * s, c);
}

@compute @workgroup_size(128, 1, 1)
fn simulate(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.activeCount) { return; }

  var p = particles[gid.x];

  // Expire dead particles
  p.lifetime += params.deltaTime;
  if (p.lifetime >= p.maxLifetime) {
    p.scale = vec3f(0.0);
    particles[gid.x] = p;
    return;
  }

  atomicAdd(&aliveCount, 1u);

  let dt = params.deltaTime;

  // Verlet integration
  let acceleration = vec3f(0.0, -params.gravity, 0.0);
  let newPos = p.position * 2.0 - p.prevPosition + acceleration * dt * dt;
  p.prevPosition = p.position;
  p.position = newPos;

  // Velocity for collision response
  p.velocity = (p.position - p.prevPosition) / max(dt, 0.0001);

  // Ground collision
  if (p.position.y < params.groundY) {
    p.position.y = params.groundY;
    p.prevPosition.y = p.position.y + p.velocity.y * dt * params.bounceRestitution;
    p.velocity.y = -p.velocity.y * params.bounceRestitution;
    // Friction on ground
    p.prevPosition.x = mix(p.prevPosition.x, p.position.x, params.damping * 2.0 * dt);
    p.prevPosition.z = mix(p.prevPosition.z, p.position.z, params.damping * 2.0 * dt);
  }

  // Angular velocity → rotation
  let angSpeed = length(p.angularVelocity);
  if (angSpeed > 0.001) {
    let axis = p.angularVelocity / angSpeed;
    let dRot = quatFromAxisAngle(axis, angSpeed * dt);
    p.rotation = normalize(quatMul(dRot, p.rotation));
    // Dampen angular velocity
    p.angularVelocity *= (1.0 - params.damping * dt);
  }

  // Fade out near end of lifetime
  let fadeStart = p.maxLifetime * 0.7;
  if (p.lifetime > fadeStart) {
    let t = (p.lifetime - fadeStart) / (p.maxLifetime - fadeStart);
    p.scale *= (1.0 - t);
  }

  // Emissive sparks decay (for metal)
  if (p.emissive > 0.0) {
    p.emissive *= (1.0 - dt * 3.0);
  }

  particles[gid.x] = p;
}
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function vec3Subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec3Normalize(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len < 1e-8) return [0, 1, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function vec3Length(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vec3Scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function vec3Add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

// ─── Class ──────────────────────────────────────────────────────────────────

export class DynamicDestruction2026 {
  constructor(device, options = {}) {
    this.device = device;

    this.options = {
      maxDestructibles: options.maxDestructibles ?? 1024,
      maxDebrisParticles: options.maxDebrisParticles ?? 10000,
      enableStructuralIntegrity: options.enableStructuralIntegrity !== undefined
        ? options.enableStructuralIntegrity : true,
      gravity: options.gravity ?? 9.81,
      groundY: options.groundY ?? 0.0,
      debrisDamping: options.debrisDamping ?? 0.5,
      bounceRestitution: options.bounceRestitution ?? 0.3,
      screenShakeMultiplier: options.screenShakeMultiplier ?? 1.0,
      maxVoronoiSeeds: options.maxVoronoiSeeds ?? 20,
      ...options,
    };

    this._initialized = false;
    this._disposed = false;

    // Destructible registry
    this._destructibles = new Map();
    this._nextDestructibleId = 0;

    // Structural integrity graph
    this._supportGraph = new Map();    // objectId → Set of objects it supports
    this._supportedBy = new Map();     // objectId → Set of objects supporting it

    // Debris particle pool
    this._debrisPool = new Float32Array(this.options.maxDebrisParticles * 32);
    this._activeDebrisCount = 0;
    this._debrisWriteIndex = 0;

    // Event queues
    this._pendingDestructions = [];
    this._pendingCascades = [];
    this._soundEvents = [];
    this._screenShake = { intensity: 0, decay: 0 };

    // Stats
    this._stats = {
      activeDestructibles: 0,
      debrisCount: 0,
      cascadesTriggered: 0,
      totalDestroyed: 0,
    };

    // GPU resources
    this._buffers = {};
    this._textures = {};
    this._pipelines = {};
    this._time = 0;
  }

  async initialize() {
    try {
      this._createBuffers();
      await this._createPipelines();

      this._initialized = true;
      console.log('✓ DynamicDestruction2026 initialized');
      console.log(`  • Max destructibles: ${this.options.maxDestructibles}`);
      console.log(`  • Max debris: ${this.options.maxDebrisParticles}`);
      console.log(`  • Structural integrity: ${this.options.enableStructuralIntegrity}`);
      return true;
    } catch (error) {
      console.error('DynamicDestruction2026 initialization failed:', error);
      return false;
    }
  }

  _createBuffers() {
    const d = this.device;

    // Fracture compute params
    this._buffers.fractureParams = d.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'Destruction-fracture-params',
    });

    // Voronoi seeds buffer
    this._buffers.voronoiSeeds = d.createBuffer({
      size: this.options.maxVoronoiSeeds * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'Destruction-voronoi-seeds',
    });

    // Input vertex buffer (written per-fracture)
    const maxInputVerts = 65536;
    this._buffers.inputVertices = d.createBuffer({
      size: maxInputVerts * 24,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'Destruction-input-vertices',
    });

    // Output fracture pieces
    this._buffers.fracturePieces = d.createBuffer({
      size: this.options.maxVoronoiSeeds * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      label: 'Destruction-fracture-pieces',
    });

    // Output fractured vertices
    this._buffers.outputVertices = d.createBuffer({
      size: maxInputVerts * 24,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      label: 'Destruction-output-vertices',
    });

    // Atomic counters for fracture assignment
    this._buffers.fractureCounters = d.createBuffer({
      size: this.options.maxVoronoiSeeds * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'Destruction-fracture-counters',
    });

    // Debris physics params
    this._buffers.physicsParams = d.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'Destruction-physics-params',
    });

    // Debris particle buffer (position, prevPos, velocity, rotation, scale, lifetime, etc.)
    const particleStride = 32 * 4; // 32 floats per particle
    this._buffers.debris = d.createBuffer({
      size: this.options.maxDebrisParticles * particleStride,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
      label: 'Destruction-debris',
    });

    // Alive counter for debris
    this._buffers.aliveCounter = d.createBuffer({
      size: 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
      label: 'Destruction-alive-counter',
    });

    // Readback buffer for alive count
    this._buffers.aliveReadback = d.createBuffer({
      size: 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      label: 'Destruction-alive-readback',
    });
  }

  async _createPipelines() {
    // Voronoi fracture pipeline
    const fractureModule = this.device.createShaderModule({
      code: VORONOI_FRACTURE_SHADER,
      label: 'Destruction-fracture-shader',
    });

    this._pipelines.assignVertices = await this.device.createComputePipelineAsync({
      layout: 'auto',
      compute: { module: fractureModule, entryPoint: 'assignVertices' },
    });

    this._pipelines.computePieces = await this.device.createComputePipelineAsync({
      layout: 'auto',
      compute: { module: fractureModule, entryPoint: 'computePieceProperties' },
    });

    // Debris physics pipeline
    const physicsModule = this.device.createShaderModule({
      code: DEBRIS_PHYSICS_SHADER,
      label: 'Destruction-physics-shader',
    });

    this._pipelines.debrisSimulate = await this.device.createComputePipelineAsync({
      layout: 'auto',
      compute: { module: physicsModule, entryPoint: 'simulate' },
    });
  }

  // ─── Registration ─────────────────────────────────────────────────────────

  registerDestructible(meshId, material, health, connections) {
    if (this._destructibles.size >= this.options.maxDestructibles) {
      console.warn('DynamicDestruction: max destructibles reached');
      return null;
    }

    const matType = typeof material === 'number' ? material : MATERIAL_TYPES[material?.toUpperCase()] ?? MATERIAL_TYPES.STONE;
    const matProps = MATERIAL_PROPERTIES[matType];

    const objectId = this._nextDestructibleId++;
    const entry = {
      id: objectId,
      meshId,
      materialType: matType,
      materialProps: matProps,
      health,
      maxHealth: health,
      destroyed: false,
      fractureData: null,
      hiddenContent: null,
    };

    this._destructibles.set(objectId, entry);
    this._stats.activeDestructibles = this._destructibles.size;

    // Register structural connections
    if (connections && this.options.enableStructuralIntegrity) {
      for (const supportedId of connections) {
        if (!this._supportGraph.has(objectId)) {
          this._supportGraph.set(objectId, new Set());
        }
        this._supportGraph.get(objectId).add(supportedId);

        if (!this._supportedBy.has(supportedId)) {
          this._supportedBy.set(supportedId, new Set());
        }
        this._supportedBy.get(supportedId).add(objectId);
      }
    }

    return objectId;
  }

  setHiddenContent(objectId, content) {
    const obj = this._destructibles.get(objectId);
    if (obj) {
      obj.hiddenContent = content;
    }
  }

  // ─── Damage & Destruction ─────────────────────────────────────────────────

  damage(objectId, impactPoint, force, damageType) {
    const obj = this._destructibles.get(objectId);
    if (!obj || obj.destroyed) return null;

    // Scale damage by material toughness
    const effectiveForce = force / obj.materialProps.toughness;
    obj.health -= effectiveForce;

    const result = {
      objectId,
      remainingHealth: Math.max(0, obj.health),
      destroyed: false,
      hiddenContent: null,
    };

    if (obj.health <= 0) {
      result.destroyed = true;
      result.hiddenContent = this._executeDestruction(objectId, impactPoint, force, damageType);
    } else {
      // Partial damage effects: cracks, dust
      this._emitPartialDamageEffects(obj, impactPoint, effectiveForce);
    }

    return result;
  }

  destroy(objectId) {
    const obj = this._destructibles.get(objectId);
    if (!obj || obj.destroyed) return null;

    obj.health = 0;
    const center = [0, 0, 0]; // Use mesh center as impact point
    return this._executeDestruction(objectId, center, obj.maxHealth, 'force');
  }

  _executeDestruction(objectId, impactPoint, force, damageType) {
    const obj = this._destructibles.get(objectId);
    obj.destroyed = true;

    const matProps = obj.materialProps;
    const pieceCount = Math.floor(
      randomInRange(matProps.fracturePieces[0], matProps.fracturePieces[1])
    );

    // Generate Voronoi seeds for fracture
    const seeds = this._generateVoronoiSeeds(pieceCount, impactPoint, force, matProps);

    // Queue GPU fracture computation
    this._pendingDestructions.push({
      objectId,
      meshId: obj.meshId,
      seeds,
      impactPoint,
      force,
      materialType: obj.materialType,
      matProps,
    });

    // Spawn debris particles
    this._spawnDebris(impactPoint, force, matProps, pieceCount);

    // Environmental effects
    this._triggerEnvironmentalEffects(impactPoint, force, matProps);

    // Sound event
    this._soundEvents.push({
      soundId: matProps.soundId,
      position: impactPoint,
      volume: Math.min(force / 100, 1.0),
    });

    // Screen shake
    const shakeMagnitude = (force / 50) * this.options.screenShakeMultiplier;
    this._screenShake.intensity = Math.max(this._screenShake.intensity, shakeMagnitude);
    this._screenShake.decay = 0.9;

    // Check structural integrity cascade
    if (this.options.enableStructuralIntegrity) {
      this._queueCascadeCheck(objectId);
    }

    this._stats.totalDestroyed++;
    this._stats.activeDestructibles = [...this._destructibles.values()].filter(d => !d.destroyed).length;

    // Return hidden content if any
    return obj.hiddenContent;
  }

  _generateVoronoiSeeds(count, impactPoint, force, matProps) {
    const seeds = new Float32Array(count * 4);
    const spreadRadius = Math.sqrt(force) * 0.5;

    for (let i = 0; i < count; i++) {
      const offset = i * 4;

      // Bias seeds toward impact point
      const bias = Math.exp(-i / count * 2);
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI;
      const r = spreadRadius * (1 - bias) + spreadRadius * 0.1 * bias;

      seeds[offset] = impactPoint[0] + Math.sin(angle1) * Math.sin(angle2) * r;
      seeds[offset + 1] = impactPoint[1] + Math.cos(angle2) * r;
      seeds[offset + 2] = impactPoint[2] + Math.cos(angle1) * Math.sin(angle2) * r;
      seeds[offset + 3] = 1.0; // seed weight

      // Grain-aligned seeds for wood/bone
      if (matProps.grainDirection) {
        const grain = matProps.grainDirection;
        const stretch = matProps.splinterRatio * 2.0;
        seeds[offset] += grain[0] * (Math.random() - 0.5) * stretch;
        seeds[offset + 1] += grain[1] * (Math.random() - 0.5) * stretch;
        seeds[offset + 2] += grain[2] * (Math.random() - 0.5) * stretch;
      }
    }

    return seeds;
  }

  _spawnDebris(impactPoint, force, matProps, pieceCount) {
    const debrisCount = Math.min(
      pieceCount * 3 + Math.floor(matProps.dustAmount * 20),
      this.options.maxDebrisParticles - this._activeDebrisCount
    );

    const impactDir = vec3Normalize([
      Math.random() - 0.5,
      Math.random() * 0.5 + 0.5,
      Math.random() - 0.5,
    ]);

    for (let i = 0; i < debrisCount; i++) {
      const idx = this._debrisWriteIndex;
      const base = idx * 32;

      // Random spread from impact
      const spread = [
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2,
      ];
      const dir = vec3Normalize(vec3Add(impactDir, spread));
      const speed = force * randomInRange(0.5, 2.0);

      // Position
      this._debrisPool[base] = impactPoint[0] + spread[0] * 0.1;
      this._debrisPool[base + 1] = impactPoint[1] + spread[1] * 0.1;
      this._debrisPool[base + 2] = impactPoint[2] + spread[2] * 0.1;
      // Lifetime
      this._debrisPool[base + 3] = 0;

      // Previous position (for Verlet)
      const vel = vec3Scale(dir, speed * 0.016);
      this._debrisPool[base + 4] = this._debrisPool[base] - vel[0];
      this._debrisPool[base + 5] = this._debrisPool[base + 1] - vel[1];
      this._debrisPool[base + 6] = this._debrisPool[base + 2] - vel[2];
      // Max lifetime
      this._debrisPool[base + 7] = matProps.debrisLifetime * randomInRange(0.5, 1.5);

      // Velocity
      this._debrisPool[base + 8] = dir[0] * speed;
      this._debrisPool[base + 9] = dir[1] * speed;
      this._debrisPool[base + 10] = dir[2] * speed;
      // Mass
      this._debrisPool[base + 11] = matProps.density * randomInRange(0.1, 1.0);

      // Angular velocity
      this._debrisPool[base + 12] = (Math.random() - 0.5) * 10;
      this._debrisPool[base + 13] = (Math.random() - 0.5) * 10;
      this._debrisPool[base + 14] = (Math.random() - 0.5) * 10;
      // Material type
      const matView = new Uint32Array(this._debrisPool.buffer, (base + 15) * 4, 1);
      matView[0] = Object.values(MATERIAL_TYPES).indexOf(matProps) !== -1
        ? Object.values(MATERIAL_TYPES).indexOf(matProps) : 0;

      // Rotation (identity quaternion)
      this._debrisPool[base + 16] = 0;
      this._debrisPool[base + 17] = 0;
      this._debrisPool[base + 18] = 0;
      this._debrisPool[base + 19] = 1;

      // Scale
      const baseScale = randomInRange(0.02, 0.15);
      this._debrisPool[base + 20] = baseScale * (matProps.splinterRatio > 0 ? 0.3 : 1.0);
      this._debrisPool[base + 21] = baseScale * (matProps.splinterRatio > 0 ? 2.0 : 1.0);
      this._debrisPool[base + 22] = baseScale;
      // Emissive (sparks for metal)
      this._debrisPool[base + 23] = matProps.emissiveSparks ? randomInRange(0.5, 1.0) : 0;

      this._debrisWriteIndex = (this._debrisWriteIndex + 1) % this.options.maxDebrisParticles;
      this._activeDebrisCount = Math.min(this._activeDebrisCount + 1, this.options.maxDebrisParticles);
    }
  }

  _emitPartialDamageEffects(obj, impactPoint, force) {
    // Small dust burst on partial damage
    const dustCount = Math.floor(obj.materialProps.dustAmount * force * 0.5);
    if (dustCount > 0) {
      this._spawnDebris(impactPoint, force * 0.2, obj.materialProps, Math.min(dustCount, 5));
    }
  }

  _triggerEnvironmentalEffects(impactPoint, force, matProps) {
    // Blood spray for flesh
    if (matProps.bloodSpray) {
      this._soundEvents.push({
        soundId: 'blood_splat',
        position: impactPoint,
        volume: Math.min(force / 50, 0.8),
      });
    }

    // Mist for ice
    if (matProps.mistOnBreak) {
      this._soundEvents.push({
        soundId: 'ice_mist',
        position: impactPoint,
        volume: 0.4,
      });
    }

    // Volumetric dust burst — recorded as event for particle system to handle
    if (matProps.dustAmount > 0.3) {
      this._soundEvents.push({
        soundId: 'dust_burst',
        position: impactPoint,
        volume: matProps.dustAmount,
      });
    }
  }

  // ─── Structural Integrity ─────────────────────────────────────────────────

  _queueCascadeCheck(destroyedId) {
    const supported = this._supportGraph.get(destroyedId);
    if (!supported) return;

    for (const depId of supported) {
      this._pendingCascades.push(depId);
    }
  }

  checkStructuralIntegrity() {
    if (!this.options.enableStructuralIntegrity) return [];
    const cascadeResults = [];

    const toProcess = [...this._pendingCascades];
    this._pendingCascades = [];

    const visited = new Set();

    while (toProcess.length > 0) {
      const objectId = toProcess.shift();
      if (visited.has(objectId)) continue;
      visited.add(objectId);

      const obj = this._destructibles.get(objectId);
      if (!obj || obj.destroyed) continue;

      // Check if all supports are destroyed
      const supports = this._supportedBy.get(objectId);
      if (!supports || supports.size === 0) continue;

      let allSupportsDestroyed = true;
      for (const supportId of supports) {
        const supporter = this._destructibles.get(supportId);
        if (supporter && !supporter.destroyed) {
          allSupportsDestroyed = false;
          break;
        }
      }

      if (allSupportsDestroyed) {
        // Cascade: this object collapses
        obj.health = 0;
        const hidden = this._executeDestruction(
          objectId,
          [0, 0, 0],
          obj.maxHealth * 0.5,
          'collapse'
        );

        cascadeResults.push({
          objectId,
          meshId: obj.meshId,
          hiddenContent: hidden,
          type: 'cascade_collapse',
        });

        this._stats.cascadesTriggered++;

        // The collapse may trigger further cascades
        const furtherSupported = this._supportGraph.get(objectId);
        if (furtherSupported) {
          for (const depId of furtherSupported) {
            if (!visited.has(depId)) {
              toProcess.push(depId);
            }
          }
        }
      }
    }

    return cascadeResults;
  }

  // ─── Update Loop ──────────────────────────────────────────────────────────

  update(deltaTime) {
    if (!this._initialized) return { soundEvents: [], cascades: [] };

    this._time += deltaTime;

    // Process pending fracture computations on GPU
    this._dispatchFractures();

    // Simulate debris physics on GPU
    this._dispatchDebrisPhysics(deltaTime);

    // Check structural integrity
    const cascades = this.checkStructuralIntegrity();

    // Decay screen shake
    if (this._screenShake.intensity > 0.001) {
      this._screenShake.intensity *= Math.pow(this._screenShake.decay, deltaTime * 60);
    } else {
      this._screenShake.intensity = 0;
    }

    // Collect and flush sound events
    const sounds = [...this._soundEvents];
    this._soundEvents = [];

    return {
      soundEvents: sounds,
      cascades,
      screenShake: this._screenShake.intensity,
    };
  }

  _dispatchFractures() {
    if (this._pendingDestructions.length === 0) return;

    const commandEncoder = this.device.createCommandEncoder({ label: 'Destruction-fracture' });

    for (const destruction of this._pendingDestructions) {
      const { seeds, materialType } = destruction;
      const matProps = MATERIAL_PROPERTIES[materialType];
      const grain = matProps.grainDirection || [0, 0, 0];

      // Upload Voronoi seeds
      this.device.queue.writeBuffer(this._buffers.voronoiSeeds, 0, seeds);

      // Clear counters
      const zeros = new Uint32Array(this.options.maxVoronoiSeeds);
      this.device.queue.writeBuffer(this._buffers.fractureCounters, 0, zeros);

      // Upload fracture params
      const seedCount = seeds.length / 4;
      const meshVertexCount = 1024; // placeholder — real mesh vertex count
      const params = new Float32Array([
        seedCount, meshVertexCount,
        ...destruction.impactPoint, 0,
        0, 1, 0, // impact direction placeholder
        destruction.force,
        materialType, grain[0], grain[1], grain[2],
      ]);

      // Reinterpret first two as u32
      const paramsU32View = new Uint32Array(params.buffer, 0, 2);
      paramsU32View[0] = seedCount;
      paramsU32View[1] = meshVertexCount;

      this.device.queue.writeBuffer(this._buffers.fractureParams, 0, params);

      // Create bind group for this fracture
      const bindGroup = this.device.createBindGroup({
        layout: this._pipelines.assignVertices.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this._buffers.fractureParams } },
          { binding: 1, resource: { buffer: this._buffers.inputVertices } },
          { binding: 2, resource: { buffer: this._buffers.voronoiSeeds } },
          { binding: 3, resource: { buffer: this._buffers.fracturePieces } },
          { binding: 4, resource: { buffer: this._buffers.outputVertices } },
          { binding: 5, resource: { buffer: this._buffers.fractureCounters } },
        ],
      });

      // Dispatch vertex assignment
      const pass1 = commandEncoder.beginComputePass({ label: 'Destruction-assign' });
      pass1.setPipeline(this._pipelines.assignVertices);
      pass1.setBindGroup(0, bindGroup);
      pass1.dispatchWorkgroups(Math.ceil(meshVertexCount / 64), 1, 1);
      pass1.end();

      // Dispatch piece property computation
      const pass2 = commandEncoder.beginComputePass({ label: 'Destruction-pieces' });
      pass2.setPipeline(this._pipelines.computePieces);
      pass2.setBindGroup(0, bindGroup);
      pass2.dispatchWorkgroups(Math.ceil(seedCount / 64), 1, 1);
      pass2.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);
    this._pendingDestructions = [];
  }

  _dispatchDebrisPhysics(deltaTime) {
    if (this._activeDebrisCount === 0) return;

    // Upload debris data to GPU
    this.device.queue.writeBuffer(
      this._buffers.debris, 0,
      this._debrisPool, 0,
      this._activeDebrisCount * 32
    );

    // Upload physics params
    const physicsData = new Float32Array([
      deltaTime,
      this.options.gravity,
      this.options.debrisDamping,
      this.options.groundY,
      this.options.bounceRestitution,
      this._activeDebrisCount,
      this._time,
      0,
    ]);
    const physicsU32 = new Uint32Array(physicsData.buffer);
    physicsU32[5] = this._activeDebrisCount;
    this.device.queue.writeBuffer(this._buffers.physicsParams, 0, physicsData);

    // Reset alive counter
    this.device.queue.writeBuffer(this._buffers.aliveCounter, 0, new Uint32Array([0]));

    const commandEncoder = this.device.createCommandEncoder({ label: 'Destruction-debris' });

    const bindGroup = this.device.createBindGroup({
      layout: this._pipelines.debrisSimulate.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._buffers.physicsParams } },
        { binding: 1, resource: { buffer: this._buffers.debris } },
        { binding: 2, resource: { buffer: this._buffers.aliveCounter } },
      ],
    });

    const pass = commandEncoder.beginComputePass({ label: 'Destruction-debris-sim' });
    pass.setPipeline(this._pipelines.debrisSimulate);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(this._activeDebrisCount / 128), 1, 1);
    pass.end();

    // Copy alive count for readback
    commandEncoder.copyBufferToBuffer(
      this._buffers.aliveCounter, 0,
      this._buffers.aliveReadback, 0, 4
    );

    this.device.queue.submit([commandEncoder.finish()]);

    this._stats.debrisCount = this._activeDebrisCount;
  }

  getDebrisBuffer() {
    return this._buffers.debris;
  }

  getScreenShake() {
    return this._screenShake.intensity;
  }

  getSoundEvents() {
    return this._soundEvents;
  }

  getStats() {
    return {
      activeDestructibles: this._stats.activeDestructibles,
      debrisCount: this._stats.debrisCount,
      cascadesTriggered: this._stats.cascadesTriggered,
      totalDestroyed: this._stats.totalDestroyed,
      pendingFractures: this._pendingDestructions.length,
      screenShake: this._screenShake.intensity,
    };
  }

  // ─── Disposal ──────────────────────────────────────────────────────────────

  dispose() {
    if (this._disposed) return;
    this._disposed = true;

    for (const b of Object.values(this._buffers)) {
      if (b) b.destroy();
    }

    this._destructibles.clear();
    this._supportGraph.clear();
    this._supportedBy.clear();
    this._pendingDestructions = [];
    this._pendingCascades = [];
    this._soundEvents = [];
    this._debrisPool = null;

    this.device = null;
    this._initialized = false;
    console.log('✓ DynamicDestruction2026 disposed');
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

export { MATERIAL_TYPES, MATERIAL_PROPERTIES };
export default DynamicDestruction2026;
