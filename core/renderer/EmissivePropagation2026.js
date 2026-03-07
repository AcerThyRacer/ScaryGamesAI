/**
 * EmissivePropagation2026.js — Emissive Light Propagation System
 *
 * Light Propagation Volumes (LPV) pipeline for horror-game emissive lighting:
 *   Step 1 — Inject emissive radiance into a 3D SH grid (compute)
 *   Step 2 — Iteratively propagate to face neighbours   (compute × N)
 *   Step 3 — Supply grid + sampling shader to the lighting pass
 */

// ── Horror emissive type definitions ─────────────────────────────────
const EMISSIVE_TYPES = {
  fire:             { color: [1.0, 0.45, 0.1],  intensity: 3.0,  flicker: true,  flickerSpeed: 8.0  },
  neon_sign:        { color: [0.2, 0.9,  1.0],  intensity: 2.0,  flicker: false, flickerSpeed: 0.0  },
  blood_rune:       { color: [0.7, 0.05, 0.05], intensity: 1.5,  flicker: true,  flickerSpeed: 1.2  },
  ghost_trail:      { color: [0.6, 0.7,  1.0],  intensity: 1.0,  flicker: true,  flickerSpeed: 3.0  },
  cursed_object:    { color: [0.5, 0.1,  0.8],  intensity: 1.8,  flicker: true,  flickerSpeed: 5.0  },
  bioluminescence:  { color: [0.1, 0.8,  0.6],  intensity: 0.8,  flicker: true,  flickerSpeed: 0.6  },
  lava:             { color: [1.0, 0.3,  0.05], intensity: 5.0,  flicker: true,  flickerSpeed: 2.0  },
  portal:           { color: [0.8, 0.3,  1.0],  intensity: 4.0,  flicker: true,  flickerSpeed: 6.0  },
};

const MAX_EMISSIVES = 256;

// ── WGSL: Step 1 — Emissive Injection ────────────────────────────────
const INJECT_SHADER = /* wgsl */`
struct Emissive {
  position  : vec4f,  // xyz = world pos, w = intensity
  color     : vec4f,  // rgb = colour,   w = radius
}

struct Params {
  gridRes        : u32,
  numEmissives   : u32,
  worldMin       : vec2f,   // xy of AABB min
  worldMinZ      : f32,
  worldSize      : f32,     // uniform cube size
  time           : f32,
  emissiveBoost  : f32,
}

@group(0) @binding(0) var gridSH_R   : texture_storage_3d<rgba16float, read_write>;
@group(0) @binding(1) var gridSH_G   : texture_storage_3d<rgba16float, read_write>;
@group(0) @binding(2) var gridSH_B   : texture_storage_3d<rgba16float, read_write>;
@group(0) @binding(3) var<storage, read> emissives : array<Emissive>;
@group(0) @binding(4) var<uniform> params : Params;

// SH band-0 and band-1 encode for a direction
fn sh_encode(dir : vec3f) -> vec4f {
  let c0 = 0.282094792;                    // Y_00
  let c1 = 0.488602512;                    // Y_1x scale
  return vec4f(c0, c1 * dir.y, c1 * dir.z, c1 * dir.x);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let idx = gid.x;
  if (idx >= params.numEmissives) { return; }

  let em       = emissives[idx];
  let worldMin = vec3f(params.worldMin, params.worldMinZ);
  let cellSize = params.worldSize / f32(params.gridRes);
  let cellF    = (em.position.xyz - worldMin) / cellSize;
  let cell     = vec3i(cellF);

  if (any(cell < vec3i(0)) || any(cell >= vec3i(i32(params.gridRes)))) { return; }

  // SH: inject omnidirectional (band-0 only for point sources)
  let intensity = em.position.w * params.emissiveBoost;
  let sh = vec4f(0.282094792 * intensity, 0.0, 0.0, 0.0);

  let prev_r = textureLoad(gridSH_R, cell);
  let prev_g = textureLoad(gridSH_G, cell);
  let prev_b = textureLoad(gridSH_B, cell);

  textureStore(gridSH_R, cell, prev_r + sh * em.color.r);
  textureStore(gridSH_G, cell, prev_g + sh * em.color.g);
  textureStore(gridSH_B, cell, prev_b + sh * em.color.b);
}
`;

// ── WGSL: Step 2 — Light Propagation ─────────────────────────────────
const PROPAGATION_SHADER = /* wgsl */`
struct Params {
  gridRes           : u32,
  attenuationFactor : f32,
  _pad0             : u32,
  _pad1             : u32,
}

@group(0) @binding(0) var srcSH_R : texture_storage_3d<rgba16float, read>;
@group(0) @binding(1) var srcSH_G : texture_storage_3d<rgba16float, read>;
@group(0) @binding(2) var srcSH_B : texture_storage_3d<rgba16float, read>;
@group(0) @binding(3) var dstSH_R : texture_storage_3d<rgba16float, read_write>;
@group(0) @binding(4) var dstSH_G : texture_storage_3d<rgba16float, read_write>;
@group(0) @binding(5) var dstSH_B : texture_storage_3d<rgba16float, read_write>;
@group(0) @binding(6) var<uniform> params : Params;

// Solid-angle weighting for each face direction (≈ 4π / 6)
const FACE_WEIGHT : f32 = 0.20943951;  // 4π / (6 × π) simplified

// 6 face-neighbour directions
const DIRS = array<vec3i, 6>(
  vec3i( 1, 0, 0), vec3i(-1, 0, 0),
  vec3i( 0, 1, 0), vec3i( 0,-1, 0),
  vec3i( 0, 0, 1), vec3i( 0, 0,-1),
);

fn sh_evaluate(sh : vec4f, dir : vec3f) -> f32 {
  let c0 = 0.282094792;
  let c1 = 0.488602512;
  return max(sh.x * c0 + sh.y * c1 * dir.y + sh.z * c1 * dir.z + sh.w * c1 * dir.x, 0.0);
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let res = i32(params.gridRes);
  let cell = vec3i(gid);
  if (any(cell >= vec3i(res))) { return; }

  var accumR = vec4f(0.0);
  var accumG = vec4f(0.0);
  var accumB = vec4f(0.0);

  for (var i = 0; i < 6; i++) {
    let neighbor = cell + DIRS[i];
    if (any(neighbor < vec3i(0)) || any(neighbor >= vec3i(res))) { continue; }

    let nR = textureLoad(srcSH_R, neighbor);
    let nG = textureLoad(srcSH_G, neighbor);
    let nB = textureLoad(srcSH_B, neighbor);

    // Evaluate radiance arriving from neighbour along -direction
    let inDir = -vec3f(DIRS[i]);
    let evalR = sh_evaluate(nR, inDir);
    let evalG = sh_evaluate(nG, inDir);
    let evalB = sh_evaluate(nB, inDir);

    // Re-encode into SH for this cell's accumulated contribution
    let c0 = 0.282094792;
    let c1 = 0.488602512;
    let shBasis = vec4f(c0, c1 * inDir.y, c1 * inDir.z, c1 * inDir.x);

    accumR += shBasis * evalR * FACE_WEIGHT;
    accumG += shBasis * evalG * FACE_WEIGHT;
    accumB += shBasis * evalB * FACE_WEIGHT;
  }

  let atten = params.attenuationFactor;
  let curR  = textureLoad(dstSH_R, cell);
  let curG  = textureLoad(dstSH_G, cell);
  let curB  = textureLoad(dstSH_B, cell);

  textureStore(dstSH_R, cell, curR + accumR * atten);
  textureStore(dstSH_G, cell, curG + accumG * atten);
  textureStore(dstSH_B, cell, curB + accumB * atten);
}
`;

// ── WGSL: Step 3 — Grid Sampling (for inclusion in lighting pass) ────
const SAMPLING_SHADER = /* wgsl */`
// --- Include this block in your lighting / fragment shader ---

@group(2) @binding(0) var lpvSH_R   : texture_3d<f32>;
@group(2) @binding(1) var lpvSH_G   : texture_3d<f32>;
@group(2) @binding(2) var lpvSH_B   : texture_3d<f32>;
@group(2) @binding(3) var lpvSampler : sampler;

struct LPVParams {
  gridRes   : u32,
  worldMinX : f32,
  worldMinY : f32,
  worldMinZ : f32,
  worldSize : f32,
  _pad0     : u32,
  _pad1     : u32,
  _pad2     : u32,
}
@group(2) @binding(4) var<uniform> lpvParams : LPVParams;

fn sh_eval_irradiance(sh : vec4f, normal : vec3f) -> f32 {
  let c0 = 0.282094792;
  let c1 = 0.488602512;
  return max(sh.x * c0 + sh.y * c1 * normal.y + sh.z * c1 * normal.z + sh.w * c1 * normal.x, 0.0);
}

fn sampleEmissiveLight(worldPos : vec3f, normal : vec3f) -> vec3f {
  let worldMin = vec3f(lpvParams.worldMinX, lpvParams.worldMinY, lpvParams.worldMinZ);
  let uvw = (worldPos - worldMin) / lpvParams.worldSize;

  if (any(uvw < vec3f(0.0)) || any(uvw > vec3f(1.0))) {
    return vec3f(0.0);
  }

  // Trilinear interpolation via hardware sampler
  let shR = textureSampleLevel(lpvSH_R, lpvSampler, uvw, 0.0);
  let shG = textureSampleLevel(lpvSH_G, lpvSampler, uvw, 0.0);
  let shB = textureSampleLevel(lpvSH_B, lpvSampler, uvw, 0.0);

  let r = sh_eval_irradiance(shR, normal);
  let g = sh_eval_irradiance(shG, normal);
  let b = sh_eval_irradiance(shB, normal);

  return vec3f(r, g, b);
}
`;

// ── Main class ───────────────────────────────────────────────────────
export class EmissivePropagation2026 {
  constructor(device, options = {}) {
    this.device = device;

    this.gridResolution    = options.gridResolution    ?? 64;
    this.propagationSteps  = options.propagationSteps  ?? 4;
    this.enableColorBleeding = options.enableColorBleeding ?? true;
    this.emissiveBoost     = options.emissiveBoost     ?? 2.0;
    this.attenuationFactor = options.attenuationFactor  ?? 0.85;

    this.worldMin  = options.worldMin  ?? [0, 0, 0];
    this.worldSize = options.worldSize ?? 128;

    this._sources    = [];
    this._time       = 0;
    this.initialized = false;

    this._pipelines    = {};
    this._textures     = {};
    this._buffers      = {};
    this._sampler      = null;
  }

  // ── Initialize GPU resources ─────────────────────────────────────
  async initialize() {
    const d   = this.device;
    const res = this.gridResolution;

    this._sampler = d.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });

    const tex3d = (label) =>
      d.createTexture({
        size: [res, res, res],
        format: 'rgba16float',
        dimension: '3d',
        usage:
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_SRC |
          GPUTextureUsage.COPY_DST,
        label,
      });

    // Double-buffered SH grids (src / dst for ping-pong propagation)
    this._textures.shR_A = tex3d('lpv_SH_R_A');
    this._textures.shG_A = tex3d('lpv_SH_G_A');
    this._textures.shB_A = tex3d('lpv_SH_B_A');
    this._textures.shR_B = tex3d('lpv_SH_R_B');
    this._textures.shG_B = tex3d('lpv_SH_G_B');
    this._textures.shB_B = tex3d('lpv_SH_B_B');

    // Emissive source buffer
    this._buffers.emissives = d.createBuffer({
      size: MAX_EMISSIVES * 32, // 2 × vec4f per emissive
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'emissive_sources',
    });

    // Uniform buffers
    this._buffers.injectParams = d.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._buffers.propParams = d.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Write propagation params (static across frames)
    const propData = new ArrayBuffer(16);
    new Uint32Array(propData, 0, 1).set([res]);
    new Float32Array(propData, 4, 1).set([this.attenuationFactor]);
    d.queue.writeBuffer(this._buffers.propParams, 0, propData);

    // Compile pipelines
    this._pipelines.inject    = await this._compilePipeline(INJECT_SHADER);
    this._pipelines.propagate = await this._compilePipeline(PROPAGATION_SHADER);

    this.initialized = true;
  }

  async _compilePipeline(code) {
    const module = this.device.createShaderModule({ code });
    return this.device.createComputePipeline({
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    });
  }

  // ── Emissive source management ────────────────────────────────────
  addEmissiveSource(type, position, color, intensity) {
    const preset = EMISSIVE_TYPES[type];
    const src = {
      type,
      position: [...position],
      color:    color ?? preset?.color ?? [1, 1, 1],
      intensity: intensity ?? preset?.intensity ?? 1.0,
      radius:   1.0,
      flicker:  preset?.flicker ?? false,
      flickerSpeed: preset?.flickerSpeed ?? 0.0,
    };
    this._sources.push(src);
    return this._sources.length - 1;
  }

  _uploadEmissives() {
    const count = Math.min(this._sources.length, MAX_EMISSIVES);
    const data  = new Float32Array(count * 8);

    for (let i = 0; i < count; i++) {
      const s   = this._sources[i];
      let scale = 1.0;

      if (s.flicker) {
        const t = this._time * s.flickerSpeed;
        scale = 0.7 + 0.3 * (Math.sin(t) * 0.5 + 0.5)
                     + 0.15 * (Math.sin(t * 2.37) * 0.5 + 0.5);
      }

      const off = i * 8;
      data[off + 0] = s.position[0];
      data[off + 1] = s.position[1];
      data[off + 2] = s.position[2];
      data[off + 3] = s.intensity * scale;
      data[off + 4] = s.color[0];
      data[off + 5] = s.color[1];
      data[off + 6] = s.color[2];
      data[off + 7] = s.radius;
    }

    this.device.queue.writeBuffer(this._buffers.emissives, 0, data);

    // Write inject params
    const params = new ArrayBuffer(32);
    const u32 = new Uint32Array(params);
    const f32 = new Float32Array(params);
    u32[0] = this.gridResolution;
    u32[1] = count;
    f32[2] = this.worldMin[0];
    f32[3] = this.worldMin[1];
    f32[4] = this.worldMin[2];
    f32[5] = this.worldSize;
    f32[6] = this._time;
    f32[7] = this.emissiveBoost;
    this.device.queue.writeBuffer(this._buffers.injectParams, 0, params);
  }

  // ── Step 1: Inject ────────────────────────────────────────────────
  injectEmissives(commandEncoder, emissiveSources) {
    if (!this.initialized) {
      throw new Error('EmissivePropagation2026: call initialize() first');
    }

    if (emissiveSources) {
      this._sources = [];
      for (const s of emissiveSources) {
        this.addEmissiveSource(s.type, s.position, s.color, s.intensity);
      }
    }

    this._uploadEmissives();
    const count = Math.min(this._sources.length, MAX_EMISSIVES);
    if (count === 0) return;

    const bg = this.device.createBindGroup({
      layout: this._pipelines.inject.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this._textures.shR_A.createView() },
        { binding: 1, resource: this._textures.shG_A.createView() },
        { binding: 2, resource: this._textures.shB_A.createView() },
        { binding: 3, resource: { buffer: this._buffers.emissives } },
        { binding: 4, resource: { buffer: this._buffers.injectParams } },
      ],
    });

    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(this._pipelines.inject);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(count / 64));
    pass.end();
  }

  // ── Step 2: Propagate (ping-pong) ──────────────────────────────────
  propagate(commandEncoder) {
    if (!this.initialized) {
      throw new Error('EmissivePropagation2026: call initialize() first');
    }

    const res = this.gridResolution;
    const wg  = Math.ceil(res / 4);

    const pairs = [
      { src: ['shR_A', 'shG_A', 'shB_A'], dst: ['shR_B', 'shG_B', 'shB_B'] },
      { src: ['shR_B', 'shG_B', 'shB_B'], dst: ['shR_A', 'shG_A', 'shB_A'] },
    ];

    for (let step = 0; step < this.propagationSteps; step++) {
      const p = pairs[step % 2];

      const bg = this.device.createBindGroup({
        layout: this._pipelines.propagate.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: this._textures[p.src[0]].createView() },
          { binding: 1, resource: this._textures[p.src[1]].createView() },
          { binding: 2, resource: this._textures[p.src[2]].createView() },
          { binding: 3, resource: this._textures[p.dst[0]].createView() },
          { binding: 4, resource: this._textures[p.dst[1]].createView() },
          { binding: 5, resource: this._textures[p.dst[2]].createView() },
          { binding: 6, resource: { buffer: this._buffers.propParams } },
        ],
      });

      const pass = commandEncoder.beginComputePass();
      pass.setPipeline(this._pipelines.propagate);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(wg, wg, wg);
      pass.end();
    }

    this._time += 1 / 60;
  }

  // ── Step 3: Grid texture + sampling shader for the lighting pass ──
  getGridTexture() {
    const final = (this.propagationSteps % 2 === 0) ? 'A' : 'B';
    return {
      r: this._textures[`shR_${final}`],
      g: this._textures[`shG_${final}`],
      b: this._textures[`shB_${final}`],
    };
  }

  getShaderCode() {
    return SAMPLING_SHADER;
  }

  // ── Utilities ─────────────────────────────────────────────────────
  clearGrid() {
    if (!this.initialized) return;

    const enc = this.device.createCommandEncoder();
    const res = this.gridResolution;
    const byteSize = res * res * res * 8; // rgba16float = 8 bytes/texel

    for (const key of Object.keys(this._textures)) {
      const buf = this.device.createBuffer({
        size: byteSize,
        usage: GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true,
      });
      new Float32Array(buf.getMappedRange()).fill(0);
      buf.unmap();
      enc.copyBufferToTexture(
        { buffer: buf, bytesPerRow: res * 8, rowsPerImage: res },
        { texture: this._textures[key] },
        [res, res, res],
      );
      buf.destroy();
    }

    this.device.queue.submit([enc.finish()]);
    this._sources = [];
    this._time = 0;
  }

  getStats() {
    return {
      activeSources:    this._sources.length,
      gridCells:        this.gridResolution ** 3,
      gridResolution:   this.gridResolution,
      propagationSteps: this.propagationSteps,
      worldSize:        this.worldSize,
      time:             this._time,
    };
  }

  dispose() {
    for (const t of Object.values(this._textures)) {
      t.destroy?.();
    }
    for (const b of Object.values(this._buffers)) {
      b.destroy?.();
    }
    this._textures  = {};
    this._buffers   = {};
    this._pipelines = {};
    this._sources   = [];
    this.initialized = false;
  }
}
