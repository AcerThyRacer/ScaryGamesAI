/**
 * CrossGameCorruption2026 — Cross-Game Visual Corruption System
 * Connects to SharedAnxietyNexus and manifests contamination as visual effects.
 * One game's art style, materials, atmosphere, and entities bleed into another.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTAMINATION_TYPES = {
  STYLE_BLEEDING: 0,
  MATERIAL: 1,
  ATMOSPHERIC: 2,
  ENTITY: 3,
};

const GAME_VISUAL_PROFILES = {
  shadow_crawler: {
    fogColor: [0.02, 0.01, 0.05],
    ambientTint: [0.1, 0.05, 0.15],
    materialSignature: 'dungeon_stone',
    entityType: 'shadow_figure',
    lightFlicker: 0.0,
    bloodIntensity: 0.0,
    atmosphereType: 'oppressive_dark',
  },
  backrooms: {
    fogColor: [0.6, 0.55, 0.3],
    ambientTint: [0.8, 0.75, 0.4],
    materialSignature: 'fluorescent_mold',
    entityType: 'threshold_entity',
    lightFlicker: 0.8,
    bloodIntensity: 0.0,
    atmosphereType: 'liminal_hum',
  },
  blood_tetris: {
    fogColor: [0.3, 0.0, 0.0],
    ambientTint: [0.8, 0.1, 0.1],
    materialSignature: 'blood_block',
    entityType: 'falling_block',
    lightFlicker: 0.2,
    bloodIntensity: 1.0,
    atmosphereType: 'pulse_dread',
  },
  caribbean_cursed: {
    fogColor: [0.05, 0.15, 0.2],
    ambientTint: [0.1, 0.4, 0.5],
    materialSignature: 'ocean_rot',
    entityType: 'drowned_sailor',
    lightFlicker: 0.1,
    bloodIntensity: 0.2,
    atmosphereType: 'deep_current',
  },
  zombie_siege: {
    fogColor: [0.1, 0.12, 0.05],
    ambientTint: [0.3, 0.35, 0.2],
    materialSignature: 'decay_flesh',
    entityType: 'zombie_silhouette',
    lightFlicker: 0.3,
    bloodIntensity: 0.7,
    atmosphereType: 'rot_miasma',
  },
  yeti_run: {
    fogColor: [0.7, 0.75, 0.9],
    ambientTint: [0.5, 0.6, 0.9],
    materialSignature: 'ice_frost',
    entityType: 'yeti_shape',
    lightFlicker: 0.0,
    bloodIntensity: 0.1,
    atmosphereType: 'blizzard_howl',
  },
  cursed_sands: {
    fogColor: [0.5, 0.4, 0.2],
    ambientTint: [0.7, 0.5, 0.3],
    materialSignature: 'sand_curse',
    entityType: 'sand_wraith',
    lightFlicker: 0.1,
    bloodIntensity: 0.3,
    atmosphereType: 'desert_wind',
  },
  dollhouse: {
    fogColor: [0.25, 0.15, 0.2],
    ambientTint: [0.6, 0.4, 0.5],
    materialSignature: 'porcelain_crack',
    entityType: 'doll_face',
    lightFlicker: 0.5,
    bloodIntensity: 0.4,
    atmosphereType: 'music_box_decay',
  },
  pacman_nightmare: {
    fogColor: [0.0, 0.0, 0.15],
    ambientTint: [0.1, 0.1, 0.4],
    materialSignature: 'neon_glitch',
    entityType: 'ghost_outline',
    lightFlicker: 0.6,
    bloodIntensity: 0.0,
    atmosphereType: 'arcade_static',
  },
};

const CORRUPTION_COMPUTE_SHADER = /* wgsl */ `
struct CorruptionParams {
  resolution: vec2f,
  time: f32,
  contaminationLevel: f32,
  sourceFogColor: vec3f,
  styleBleedStrength: f32,
  sourceAmbientTint: vec3f,
  materialStrength: f32,
  targetFogColor: vec3f,
  atmosphericStrength: f32,
  targetAmbientTint: vec3f,
  entityStrength: f32,
  lightFlicker: f32,
  bloodIntensity: f32,
  noiseScale: f32,
  _pad: f32,
};

@group(0) @binding(0) var<uniform> params: CorruptionParams;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var depthTex: texture_2d<f32>;
@group(0) @binding(3) var outputTex: texture_storage_2d<rgba16float, write>;

fn hash2(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn valueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash2(i), hash2(i + vec2f(1.0, 0.0)), u.x),
    mix(hash2(i + vec2f(0.0, 1.0)), hash2(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

fn fbm(p: vec2f) -> f32 {
  var val = 0.0;
  var amp = 0.5;
  var pos = p;
  for (var i = 0; i < 5; i++) {
    val += amp * valueNoise(pos);
    pos *= 2.0;
    amp *= 0.5;
  }
  return val;
}

fn applyStyleBleeding(color: vec3f, uv: vec2f) -> vec3f {
  let strength = params.styleBleedStrength * params.contaminationLevel;
  if (strength < 0.01) { return color; }

  // Flickering fluorescent light overlay from source game
  let flicker = sin(params.time * 12.0) * 0.5 + 0.5;
  let flickerMask = step(1.0 - params.lightFlicker * strength, flicker);
  let flickerColor = mix(color, color * vec3f(0.85, 0.9, 0.7), flickerMask * strength * 0.3);

  // Subtle falling block shapes in fog regions
  let blockUV = uv * vec2f(8.0, 16.0) + vec2f(0.0, params.time * 2.0);
  let blockNoise = step(0.92 - strength * 0.1, valueNoise(blockUV));
  let blockColor = mix(vec3f(0.3, 0.0, 0.0), vec3f(0.5, 0.0, 0.0), flicker);
  let withBlocks = mix(flickerColor, blockColor, blockNoise * strength * 0.15 * params.bloodIntensity);

  return withBlocks;
}

fn applyMaterialContamination(color: vec3f, uv: vec2f, depth: f32) -> vec3f {
  let strength = params.materialStrength * params.contaminationLevel;
  if (strength < 0.01) { return color; }

  // Material spread — surfaces close to camera get contaminated first
  let proximityFactor = 1.0 - smoothstep(0.0, 0.5, depth);
  let spreadNoise = fbm(uv * params.noiseScale + vec2f(params.time * 0.1));
  let spreadMask = smoothstep(0.5 - strength * 0.4, 0.5, spreadNoise) * proximityFactor;

  // Blood spread
  let bloodTint = vec3f(0.4, 0.02, 0.01);
  var contaminated = mix(color, bloodTint, spreadMask * params.bloodIntensity * strength);

  // Ice/frost creep
  let frostTint = vec3f(0.7, 0.8, 0.95);
  let frostEdge = smoothstep(0.45, 0.5, spreadNoise) - smoothstep(0.5, 0.55, spreadNoise);
  contaminated = mix(contaminated, frostTint, frostEdge * (1.0 - params.bloodIntensity) * strength);

  return contaminated;
}

fn applyAtmosphericContamination(color: vec3f, uv: vec2f, depth: f32) -> vec3f {
  let strength = params.atmosphericStrength * params.contaminationLevel;
  if (strength < 0.01) { return color; }

  // Fog color shifts toward source game's palette
  let fogBlend = smoothstep(0.3, 1.0, depth);
  let contaminatedFog = mix(params.targetFogColor, params.sourceFogColor, strength);
  var fogged = mix(color, contaminatedFog, fogBlend * strength * 0.6);

  // Sky contamination — blood moon tint at top of screen
  let skyFactor = smoothstep(0.7, 1.0, 1.0 - uv.y) * smoothstep(0.8, 1.0, depth);
  let moonTint = mix(params.targetAmbientTint, params.sourceAmbientTint, strength);
  fogged = mix(fogged, moonTint, skyFactor * strength * 0.4);

  // Ambient tint shift
  let ambientBlend = mix(params.targetAmbientTint, params.sourceAmbientTint, strength * 0.3);
  fogged = fogged * mix(vec3f(1.0), ambientBlend, strength * 0.2);

  return fogged;
}

fn applyEntityContamination(color: vec3f, uv: vec2f, depth: f32) -> vec3f {
  let strength = params.entityStrength * params.contaminationLevel;
  if (strength < 0.02) { return color; }

  // Shadow figures appear in peripheral vision
  let peripheralDist = abs(uv.x - 0.5) * 2.0;
  let peripheralMask = smoothstep(0.6, 0.9, peripheralDist);

  // Generate entity silhouette using noise
  let entityUV = vec2f(uv.x * 3.0, uv.y * 5.0 - params.time * 0.3);
  let entityShape = fbm(entityUV * 2.0);
  let entityMask = smoothstep(0.6, 0.65, entityShape) * peripheralMask;

  // Entity is a dark silhouette with subtle glow
  let entityColor = params.sourceAmbientTint * 0.1;
  var withEntity = mix(color, entityColor, entityMask * strength * 0.5);

  // Occasional face-like pattern in fog (for dollhouse contamination)
  let faceUV = (uv - vec2f(0.5)) * 4.0;
  let faceDist = length(faceUV);
  let faceNoise = valueNoise(faceUV * 3.0 + vec2f(params.time * 0.05));
  let faceMask = smoothstep(0.3, 0.2, faceDist) * step(0.8, faceNoise) * smoothstep(0.7, 1.0, depth);
  withEntity = mix(withEntity, vec3f(0.6, 0.5, 0.55), faceMask * strength * 0.2);

  return withEntity;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = vec2u(textureDimensions(inputTex));
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let uv = vec2f(f32(gid.x) + 0.5, f32(gid.y) + 0.5) / vec2f(f32(dims.x), f32(dims.y));
  var color = textureLoad(inputTex, vec2i(gid.xy), 0).rgb;
  let depth = textureLoad(depthTex, vec2i(gid.xy), 0).r;

  if (params.contaminationLevel < 0.001) {
    textureStore(outputTex, vec2i(gid.xy), vec4f(color, 1.0));
    return;
  }

  color = applyStyleBleeding(color, uv);
  color = applyMaterialContamination(color, uv, depth);
  color = applyAtmosphericContamination(color, uv, depth);
  color = applyEntityContamination(color, uv, depth);

  textureStore(outputTex, vec2i(gid.xy), vec4f(color, 1.0));
}
`;

// ─── Class ──────────────────────────────────────────────────────────────────

export class CrossGameCorruption2026 {
  constructor(device, options = {}) {
    this.device = device;

    this.options = {
      width: options.width ?? 1920,
      height: options.height ?? 1080,
      maxContaminationRate: options.maxContaminationRate ?? 0.05,
      noiseScale: options.noiseScale ?? 8.0,
      enableEntityApparitions: options.enableEntityApparitions !== undefined
        ? options.enableEntityApparitions : true,
      enableMaterialSpread: options.enableMaterialSpread !== undefined
        ? options.enableMaterialSpread : true,
      ...options,
    };

    this._initialized = false;
    this._disposed = false;

    // Contamination state
    this._contaminationLevel = 0.0;
    this._targetContamination = 0.0;
    this._sourceGameId = null;
    this._targetGameId = null;
    this._sourceProfile = null;
    this._targetProfile = null;
    this._contaminationSystem = null;

    // Per-type contamination weights (modulated by anxiety vector type)
    this._typeWeights = {
      [CONTAMINATION_TYPES.STYLE_BLEEDING]: 0.0,
      [CONTAMINATION_TYPES.MATERIAL]: 0.0,
      [CONTAMINATION_TYPES.ATMOSPHERIC]: 0.0,
      [CONTAMINATION_TYPES.ENTITY]: 0.0,
    };

    // Timing state for gradual build-up
    this._time = 0;
    this._sessionPlayTime = 0;
    this._gamesSwitched = 0;
    this._lastSwitchTime = 0;

    // GPU resources
    this._buffers = {};
    this._textures = {};
    this._pipelines = {};
    this._bindGroups = {};
    this._sampler = null;
  }

  async initialize(contaminationSystem) {
    try {
      this._contaminationSystem = contaminationSystem ?? null;

      this._createBuffers();
      this._createTextures();
      await this._createPipelines();

      this._initialized = true;
      console.log('✓ CrossGameCorruption2026 initialized');
      console.log(`  • Resolution: ${this.options.width}×${this.options.height}`);
      console.log(`  • Contamination system: ${contaminationSystem ? 'connected' : 'standalone'}`);
      return true;
    } catch (error) {
      console.error('CrossGameCorruption2026 initialization failed:', error);
      return false;
    }
  }

  _createBuffers() {
    this._buffers.params = this.device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'CrossCorruption-params',
    });
  }

  _createTextures() {
    this._textures.output = this.device.createTexture({
      size: { width: this.options.width, height: this.options.height },
      format: 'rgba16float',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_SRC,
      label: 'CrossCorruption-output',
    });

    this._sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });
  }

  async _createPipelines() {
    const module = this.device.createShaderModule({
      code: CORRUPTION_COMPUTE_SHADER,
      label: 'CrossCorruption-shader',
    });

    this._pipelines.corruption = await this.device.createComputePipelineAsync({
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    });
  }

  // ─── Game Configuration ──────────────────────────────────────────────────────

  setSourceGame(gameId) {
    if (!GAME_VISUAL_PROFILES[gameId]) {
      console.warn(`CrossCorruption: unknown source game "${gameId}"`);
      return;
    }
    if (this._sourceGameId && this._sourceGameId !== gameId) {
      this._gamesSwitched++;
      this._lastSwitchTime = this._time;
    }
    this._sourceGameId = gameId;
    this._sourceProfile = GAME_VISUAL_PROFILES[gameId];
    this._recalculateTypeWeights();
  }

  setTargetGame(gameId) {
    if (!GAME_VISUAL_PROFILES[gameId]) {
      console.warn(`CrossCorruption: unknown target game "${gameId}"`);
      return;
    }
    this._targetGameId = gameId;
    this._targetProfile = GAME_VISUAL_PROFILES[gameId];
    this._recalculateTypeWeights();
  }

  setContaminationLevel(level) {
    this._targetContamination = Math.max(0, Math.min(1, level));
  }

  _recalculateTypeWeights() {
    if (!this._sourceProfile || !this._targetProfile) return;

    const src = this._sourceProfile;

    // Style bleeding weight: driven by how distinct the source's visual signature is
    this._typeWeights[CONTAMINATION_TYPES.STYLE_BLEEDING] =
      src.lightFlicker * 0.5 + src.bloodIntensity * 0.3 + 0.2;

    // Material contamination: driven by source's material aggressiveness
    this._typeWeights[CONTAMINATION_TYPES.MATERIAL] =
      src.bloodIntensity * 0.6 + 0.4;

    // Atmospheric: always present, driven by fog color difference
    const fogDiff = Math.sqrt(
      Math.pow(src.fogColor[0] - this._targetProfile.fogColor[0], 2) +
      Math.pow(src.fogColor[1] - this._targetProfile.fogColor[1], 2) +
      Math.pow(src.fogColor[2] - this._targetProfile.fogColor[2], 2)
    );
    this._typeWeights[CONTAMINATION_TYPES.ATMOSPHERIC] =
      Math.min(fogDiff * 2, 1.0);

    // Entity apparitions: reduced unless source has strong entity presence
    const entityStrength = {
      shadow_figure: 0.9, threshold_entity: 0.7, zombie_silhouette: 0.8,
      doll_face: 0.75, ghost_outline: 0.6, falling_block: 0.3,
      drowned_sailor: 0.65, yeti_shape: 0.5, sand_wraith: 0.55,
    };
    this._typeWeights[CONTAMINATION_TYPES.ENTITY] =
      entityStrength[src.entityType] ?? 0.3;
  }

  // ─── Update Loop ────────────────────────────────────────────────────────────

  update(deltaTime) {
    if (!this._initialized) return;

    this._time += deltaTime;
    this._sessionPlayTime += deltaTime;

    // Sync with contamination system if available
    if (this._contaminationSystem) {
      this._syncWithContaminationSystem();
    }

    // Smooth contamination level toward target
    const rate = this.options.maxContaminationRate * deltaTime;
    if (this._contaminationLevel < this._targetContamination) {
      this._contaminationLevel = Math.min(
        this._contaminationLevel + rate,
        this._targetContamination
      );
    } else if (this._contaminationLevel > this._targetContamination) {
      // Contamination decays slower than it builds
      this._contaminationLevel = Math.max(
        this._contaminationLevel - rate * 0.3,
        this._targetContamination
      );
    }

    // Session-based contamination build-up
    this._applySessionBuildUp();
  }

  _syncWithContaminationSystem() {
    const cs = this._contaminationSystem;

    // Read anxiety level from nexus if available
    if (typeof cs.getAnxietyLevel === 'function') {
      const anxiety = cs.getAnxietyLevel();
      this._targetContamination = Math.max(this._targetContamination, anxiety * 0.8);
    }

    // Read contamination vectors for type weight modulation
    if (typeof cs.getActiveVectors === 'function') {
      const vectors = cs.getActiveVectors();
      if (vectors && vectors.length > 0) {
        for (const vector of vectors) {
          const grade = vector.anxietyGrade ?? 0;
          if (grade > 0.6) {
            this._typeWeights[CONTAMINATION_TYPES.ENTITY] =
              Math.min(this._typeWeights[CONTAMINATION_TYPES.ENTITY] + 0.1, 1.0);
          }
          if (grade > 0.4) {
            this._typeWeights[CONTAMINATION_TYPES.ATMOSPHERIC] =
              Math.min(this._typeWeights[CONTAMINATION_TYPES.ATMOSPHERIC] + 0.05, 1.0);
          }
        }
      }
    }
  }

  _applySessionBuildUp() {
    // Contamination naturally builds as the player spends more time
    const sessionMinutes = this._sessionPlayTime / 60;
    const sessionFactor = Math.min(sessionMinutes / 30, 1.0) * 0.15;

    // Each game switch increases residual contamination
    const switchFactor = Math.min(this._gamesSwitched * 0.05, 0.3);

    // Recent switch causes a temporary spike
    const timeSinceSwitch = this._time - this._lastSwitchTime;
    const switchSpike = this._gamesSwitched > 0
      ? Math.exp(-timeSinceSwitch / 10) * 0.2
      : 0;

    this._targetContamination = Math.min(
      this._targetContamination + sessionFactor + switchFactor + switchSpike,
      1.0
    );
  }

  // ─── GPU Rendering ──────────────────────────────────────────────────────────

  applyVisualContamination(commandEncoder, inputTexture, depthBuffer) {
    if (!this._initialized || this._contaminationLevel < 0.001) return;
    if (!this._sourceProfile || !this._targetProfile) return;

    this._uploadParams();

    const bindGroup = this.device.createBindGroup({
      layout: this._pipelines.corruption.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._buffers.params } },
        { binding: 1, resource: inputTexture.createView() },
        { binding: 2, resource: depthBuffer.createView() },
        { binding: 3, resource: this._textures.output.createView() },
      ],
    });

    const pass = commandEncoder.beginComputePass({ label: 'CrossCorruption-apply' });
    pass.setPipeline(this._pipelines.corruption);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(
      Math.ceil(this.options.width / 8),
      Math.ceil(this.options.height / 8),
      1
    );
    pass.end();
  }

  _uploadParams() {
    const src = this._sourceProfile;
    const tgt = this._targetProfile;
    const level = this._contaminationLevel;

    const data = new Float32Array([
      // resolution, time, contaminationLevel
      this.options.width, this.options.height, this._time, level,
      // sourceFogColor, styleBleedStrength
      ...src.fogColor, this._typeWeights[CONTAMINATION_TYPES.STYLE_BLEEDING],
      // sourceAmbientTint, materialStrength
      ...src.ambientTint, this.options.enableMaterialSpread
        ? this._typeWeights[CONTAMINATION_TYPES.MATERIAL] : 0,
      // targetFogColor, atmosphericStrength
      ...tgt.fogColor, this._typeWeights[CONTAMINATION_TYPES.ATMOSPHERIC],
      // targetAmbientTint, entityStrength
      ...tgt.ambientTint, this.options.enableEntityApparitions
        ? this._typeWeights[CONTAMINATION_TYPES.ENTITY] : 0,
      // lightFlicker, bloodIntensity, noiseScale, pad
      src.lightFlicker, src.bloodIntensity, this.options.noiseScale, 0,
    ]);

    this.device.queue.writeBuffer(this._buffers.params, 0, data);
  }

  getOutputTexture() {
    return this._textures.output;
  }

  getContaminationState() {
    return {
      level: this._contaminationLevel,
      targetLevel: this._targetContamination,
      sourceGame: this._sourceGameId,
      targetGame: this._targetGameId,
      typeWeights: { ...this._typeWeights },
      sessionPlayTime: this._sessionPlayTime,
      gamesSwitched: this._gamesSwitched,
      activeEffects: this._getActiveEffectsList(),
    };
  }

  _getActiveEffectsList() {
    const effects = [];
    const level = this._contaminationLevel;
    if (level < 0.01) return effects;

    const threshold = 0.05;
    if (this._typeWeights[CONTAMINATION_TYPES.STYLE_BLEEDING] * level > threshold) {
      effects.push({
        type: 'style_bleeding',
        strength: this._typeWeights[CONTAMINATION_TYPES.STYLE_BLEEDING] * level,
        description: this._getStyleBleedDescription(),
      });
    }
    if (this._typeWeights[CONTAMINATION_TYPES.MATERIAL] * level > threshold) {
      effects.push({
        type: 'material',
        strength: this._typeWeights[CONTAMINATION_TYPES.MATERIAL] * level,
        description: this._getMaterialDescription(),
      });
    }
    if (this._typeWeights[CONTAMINATION_TYPES.ATMOSPHERIC] * level > threshold) {
      effects.push({
        type: 'atmospheric',
        strength: this._typeWeights[CONTAMINATION_TYPES.ATMOSPHERIC] * level,
        description: this._getAtmosphericDescription(),
      });
    }
    if (this._typeWeights[CONTAMINATION_TYPES.ENTITY] * level > threshold) {
      effects.push({
        type: 'entity',
        strength: this._typeWeights[CONTAMINATION_TYPES.ENTITY] * level,
        description: this._getEntityDescription(),
      });
    }
    return effects;
  }

  _getStyleBleedDescription() {
    const src = this._sourceGameId;
    const descriptions = {
      backrooms: 'Fluorescent light flickers bleeding through',
      blood_tetris: 'Falling blood blocks visible in background fog',
      caribbean_cursed: 'Ocean waves lapping at environment edges',
      pacman_nightmare: 'Neon grid lines pulsing across surfaces',
    };
    return descriptions[src] ?? `Visual artifacts from ${src}`;
  }

  _getMaterialDescription() {
    const src = this._sourceGameId;
    const descriptions = {
      blood_tetris: 'Blood material spreading across surfaces',
      yeti_run: 'Ice and frost creeping onto warm surfaces',
      cursed_sands: 'Sand particles blowing into environment',
      backrooms: 'Mold growth spreading on walls',
      zombie_siege: 'Decay spreading across clean surfaces',
    };
    return descriptions[src] ?? `Material contamination from ${src}`;
  }

  _getAtmosphericDescription() {
    const src = this._sourceGameId;
    const descriptions = {
      shadow_crawler: 'Oppressive darkness encroaching',
      backrooms: 'Liminal hum resonating in background',
      blood_tetris: 'Pulsing dread thickening the air',
      zombie_siege: 'Rot miasma seeping through',
      yeti_run: 'Blizzard howl echoing distantly',
    };
    return descriptions[src] ?? `Atmospheric shift from ${src}`;
  }

  _getEntityDescription() {
    const src = this._sourceGameId;
    const descriptions = {
      shadow_crawler: 'Shadow figures flickering in peripheral vision',
      pacman_nightmare: 'Ghost outlines drifting through fog',
      dollhouse: 'Doll faces appearing in reflections',
      zombie_siege: 'Zombie silhouettes shambling in distant fog',
      caribbean_cursed: 'Drowned sailor shapes beneath surfaces',
    };
    return descriptions[src] ?? `Entity apparitions from ${src}`;
  }

  // ─── Disposal ──────────────────────────────────────────────────────────────

  dispose() {
    if (this._disposed) return;
    this._disposed = true;

    for (const t of Object.values(this._textures)) {
      if (t) t.destroy();
    }
    for (const b of Object.values(this._buffers)) {
      if (b) b.destroy();
    }

    this._contaminationSystem = null;
    this._sourceProfile = null;
    this._targetProfile = null;

    this.device = null;
    this._initialized = false;
    console.log('✓ CrossGameCorruption2026 disposed');
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

export { GAME_VISUAL_PROFILES, CONTAMINATION_TYPES };
export default CrossGameCorruption2026;
