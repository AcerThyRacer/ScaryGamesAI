// Radiance Cascades Global Illumination — WebGPU Compute Shaders
// Multi-cascade spherical harmonics probe grid with indirect diffuse lighting

const SH_COEFFS = 9;         // L2 spherical harmonics
const SH_FLOATS = 27;        // 9 coefficients × 3 color channels
const PROBE_STRIDE = 28;     // 27 SH floats + 1 validity flag
const WORKGROUP_SIZE = 8;

// ─── WGSL: Shared SH helpers injected into every shader ───────────────────────
const SH_COMMON_WGSL = /* wgsl */`
const PI: f32 = 3.141592653589793;
const TWO_PI: f32 = 6.283185307179586;
const HALF_PI: f32 = 1.5707963267948966;
const INV_PI: f32 = 0.3183098861837907;
const SH_C0: f32 = 0.28209479177387814;   // 1 / (2*sqrt(PI))
const SH_C1: f32 = 0.4886025119029199;    // sqrt(3) / (2*sqrt(PI))
const SH_C2_0: f32 = 1.0925484305920792;  // sqrt(15) / (2*sqrt(PI))
const SH_C2_1: f32 = 0.31539156525252005; // sqrt(5) / (4*sqrt(PI))
const SH_C2_2: f32 = 0.5462742152960396;  // sqrt(15) / (4*sqrt(PI))

fn shEvaluate(d: vec3<f32>) -> array<f32, 9> {
  var b: array<f32, 9>;
  b[0] = SH_C0;
  b[1] = SH_C1 * d.y;
  b[2] = SH_C1 * d.z;
  b[3] = SH_C1 * d.x;
  b[4] = SH_C2_0 * d.x * d.y;
  b[5] = SH_C2_0 * d.y * d.z;
  b[6] = SH_C2_1 * (3.0 * d.z * d.z - 1.0);
  b[7] = SH_C2_0 * d.x * d.z;
  b[8] = SH_C2_2 * (d.x * d.x - d.y * d.y);
  return b;
}

fn shEncode(
  basis: array<f32, 9>,
  color: vec3<f32>,
  weight: f32,
  coeffs: ptr<function, array<f32, 27>>
) {
  for (var i = 0; i < 9; i++) {
    let w = basis[i] * weight;
    (*coeffs)[i * 3 + 0] += color.r * w;
    (*coeffs)[i * 3 + 1] += color.g * w;
    (*coeffs)[i * 3 + 2] += color.b * w;
  }
}

fn shDecode(normal: vec3<f32>, coeffs: ptr<function, array<f32, 27>>) -> vec3<f32> {
  let basis = shEvaluate(normal);
  var result = vec3<f32>(0.0);
  for (var i = 0; i < 9; i++) {
    result.r += basis[i] * (*coeffs)[i * 3 + 0];
    result.g += basis[i] * (*coeffs)[i * 3 + 1];
    result.b += basis[i] * (*coeffs)[i * 3 + 2];
  }
  return max(result, vec3<f32>(0.0));
}

fn pcgHash(input: u32) -> u32 {
  var state = input * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn randomFloat(seed: u32) -> f32 {
  return f32(pcgHash(seed)) / 4294967295.0;
}

fn cosineWeightedDirection(seed: u32) -> vec3<f32> {
  let u1 = randomFloat(seed);
  let u2 = randomFloat(seed + 1u);
  let r = sqrt(u1);
  let theta = TWO_PI * u2;
  return vec3<f32>(r * cos(theta), r * sin(theta), sqrt(1.0 - u1));
}

fn alignToNormal(dir: vec3<f32>, normal: vec3<f32>) -> vec3<f32> {
  var up = vec3<f32>(0.0, 1.0, 0.0);
  if (abs(dot(normal, up)) > 0.99) { up = vec3<f32>(1.0, 0.0, 0.0); }
  let tangent = normalize(cross(up, normal));
  let bitangent = cross(normal, tangent);
  return tangent * dir.x + bitangent * dir.y + normal * dir.z;
}
`;

// ─── WGSL: Pass 1 — Radiance Injection ───────────────────────────────────────
const INJECTION_WGSL = /* wgsl */`
${SH_COMMON_WGSL}

struct Params {
  cascadeIndex: u32,
  probesPerSide: u32,
  raysPerProbe: u32,
  frameIndex: u32,
  worldMin: vec3<f32>,
  _pad0: f32,
  worldMax: vec3<f32>,
  _pad1: f32,
  temporalBlend: f32,
  enableEmissives: u32,
  _pad2: vec2<f32>,
};

struct SceneLight {
  position: vec3<f32>,
  radius: f32,
  color: vec3<f32>,
  intensity: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> probeBuffer: array<f32>;
@group(0) @binding(2) var<storage, read> sceneLights: array<SceneLight>;
@group(0) @binding(3) var<uniform> lightCount: u32;

fn probeWorldPos(probeId: vec3<u32>) -> vec3<f32> {
  let size = params.worldMax - params.worldMin;
  let step = size / vec3<f32>(f32(params.probesPerSide));
  return params.worldMin + (vec3<f32>(probeId) + 0.5) * step;
}

fn estimateRadiance(origin: vec3<f32>, direction: vec3<f32>, seed: u32) -> vec3<f32> {
  var radiance = vec3<f32>(0.0);
  let rayLen = length(params.worldMax - params.worldMin) * 0.5;

  for (var li = 0u; li < lightCount; li++) {
    let light = sceneLights[li];
    let toLight = light.position - origin;
    let dist = length(toLight);
    let lightDir = toLight / dist;

    // Directional contribution along ray
    let alignment = max(dot(direction, lightDir), 0.0);
    let atten = light.intensity / (1.0 + dist * dist * 0.01);
    radiance += light.color * atten * alignment;

    // Indirect scatter approximation: light bouncing off a virtual surface
    let bouncePoint = origin + direction * min(dist * 0.5, rayLen * 0.3);
    let bounceToLight = light.position - bouncePoint;
    let bounceDist = length(bounceToLight);
    let bounceAtten = light.intensity * 0.3 / (1.0 + bounceDist * bounceDist * 0.02);
    radiance += light.color * bounceAtten * 0.25;
  }

  // Emissive contribution (use frame-varying noise for stochastic sampling)
  if (params.enableEmissives == 1u) {
    let noiseVal = randomFloat(seed + 7777u);
    radiance += vec3<f32>(noiseVal * 0.02);
  }

  return radiance;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let pps = params.probesPerSide;
  if (gid.x >= pps || gid.y >= pps) { return; }

  let probeCountPerSlice = pps * pps;
  let totalProbes = pps * pps * pps;
  let sliceIndex = (params.frameIndex + gid.x * 3u + gid.y * 7u) % pps;
  let probeLinear = gid.y * pps + gid.x + sliceIndex * probeCountPerSlice;
  if (probeLinear >= totalProbes) { return; }

  let probeCoord = vec3<u32>(gid.x, gid.y, sliceIndex);
  let origin = probeWorldPos(probeCoord);

  // Accumulate SH from ray samples
  var newCoeffs: array<f32, 27>;
  for (var i = 0; i < 27; i++) { newCoeffs[i] = 0.0; }

  let baseSeed = params.frameIndex * 65537u + probeLinear * 131u;
  let raysF = f32(params.raysPerProbe);
  let weight = (4.0 * PI) / raysF;

  for (var r = 0u; r < params.raysPerProbe; r++) {
    let seed = baseSeed + r * 3u;
    let localDir = cosineWeightedDirection(seed);
    // Rotate hemisphere to random orientation per-probe per-frame
    let refNormal = normalize(vec3<f32>(
      randomFloat(seed + 100u) - 0.5,
      randomFloat(seed + 200u) - 0.5,
      randomFloat(seed + 300u) - 0.5
    ));
    let dir = alignToNormal(localDir, refNormal);
    let radiance = estimateRadiance(origin, dir, seed);
    let basis = shEvaluate(dir);
    shEncode(basis, radiance, weight, &newCoeffs);
  }

  // Temporal blending with previous frame
  let baseIdx = probeLinear * 28u;
  let blend = params.temporalBlend;
  for (var i = 0; i < 27; i++) {
    let prev = probeBuffer[baseIdx + u32(i)];
    probeBuffer[baseIdx + u32(i)] = mix(newCoeffs[i], prev, blend);
  }
  probeBuffer[baseIdx + 27u] = 1.0; // mark valid
}
`;

// ─── WGSL: Pass 2 — Cascade Merge ────────────────────────────────────────────
const MERGE_WGSL = /* wgsl */`
${SH_COMMON_WGSL}

struct MergeParams {
  fineProbesPerSide: u32,
  coarseProbesPerSide: u32,
  giIntensity: f32,
  bounceMultiplier: f32,
  fineWorldMin: vec3<f32>,
  _pad0: f32,
  fineWorldMax: vec3<f32>,
  _pad1: f32,
  coarseWorldMin: vec3<f32>,
  _pad2: f32,
  coarseWorldMax: vec3<f32>,
  _pad3: f32,
};

@group(0) @binding(0) var<uniform> params: MergeParams;
@group(0) @binding(1) var<storage, read_write> fineProbes: array<f32>;
@group(0) @binding(2) var<storage, read> coarseProbes: array<f32>;

fn probeWorldPosFine(pid: vec3<u32>) -> vec3<f32> {
  let size = params.fineWorldMax - params.fineWorldMin;
  let step = size / vec3<f32>(f32(params.fineProbesPerSide));
  return params.fineWorldMin + (vec3<f32>(pid) + 0.5) * step;
}

fn sampleCoarseProbe(worldPos: vec3<f32>) -> array<f32, 27> {
  var result: array<f32, 27>;
  let size = params.coarseWorldMax - params.coarseWorldMin;
  let invStep = vec3<f32>(f32(params.coarseProbesPerSide)) / size;
  let continuous = (worldPos - params.coarseWorldMin) * invStep - 0.5;
  let base = vec3<i32>(floor(continuous));
  let frac = continuous - vec3<f32>(base);
  let cps = i32(params.coarseProbesPerSide);

  // Trilinear interpolation over 8 surrounding coarse probes
  for (var dz = 0; dz < 2; dz++) {
    for (var dy = 0; dy < 2; dy++) {
      for (var dx = 0; dx < 2; dx++) {
        let coord = clamp(base + vec3<i32>(dx, dy, dz), vec3<i32>(0), vec3<i32>(cps - 1));
        let idx = u32(coord.z * cps * cps + coord.y * cps + coord.x);
        let baseOff = idx * 28u;

        let wx = select(1.0 - frac.x, frac.x, dx == 1);
        let wy = select(1.0 - frac.y, frac.y, dy == 1);
        let wz = select(1.0 - frac.z, frac.z, dz == 1);
        let w = wx * wy * wz;

        let valid = coarseProbes[baseOff + 27u];
        if (valid > 0.5) {
          for (var c = 0; c < 27; c++) {
            result[c] += coarseProbes[baseOff + u32(c)] * w;
          }
        }
      }
    }
  }
  return result;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fps = params.fineProbesPerSide;
  if (gid.x >= fps || gid.y >= fps) { return; }

  let totalPerSlice = fps * fps;
  for (var z = 0u; z < fps; z++) {
    let probeLinear = z * totalPerSlice + gid.y * fps + gid.x;
    let worldPos = probeWorldPosFine(vec3<u32>(gid.x, gid.y, z));
    let coarseData = sampleCoarseProbe(worldPos);

    let baseIdx = probeLinear * 28u;
    let bounceScale = params.giIntensity * params.bounceMultiplier;
    for (var c = 0; c < 27; c++) {
      fineProbes[baseIdx + u32(c)] += coarseData[c] * bounceScale;
    }
  }
}
`;

// ─── WGSL: Pass 3 — Irradiance Sampling ──────────────────────────────────────
const SAMPLING_WGSL = /* wgsl */`
${SH_COMMON_WGSL}

struct SampleParams {
  probesPerSide: u32,
  screenWidth: u32,
  screenHeight: u32,
  enableColorBleeding: u32,
  worldMin: vec3<f32>,
  _pad0: f32,
  worldMax: vec3<f32>,
  giIntensity: f32,
};

@group(0) @binding(0) var<uniform> params: SampleParams;
@group(0) @binding(1) var<storage, read> probeBuffer: array<f32>;
@group(0) @binding(2) var positionTex: texture_2d<f32>;
@group(0) @binding(3) var normalTex: texture_2d<f32>;
@group(0) @binding(4) var albedoTex: texture_2d<f32>;
@group(0) @binding(5) var outputTex: texture_storage_2d<rgba16float, write>;

fn sampleProbeGrid(worldPos: vec3<f32>, normal: vec3<f32>) -> vec3<f32> {
  let size = params.worldMax - params.worldMin;
  let invStep = vec3<f32>(f32(params.probesPerSide)) / size;
  let continuous = (worldPos - params.worldMin) * invStep - 0.5;
  let base = vec3<i32>(floor(continuous));
  let frac = continuous - vec3<f32>(base);
  let pps = i32(params.probesPerSide);

  var irradiance = vec3<f32>(0.0);
  var totalWeight: f32 = 0.0;

  for (var dz = 0; dz < 2; dz++) {
    for (var dy = 0; dy < 2; dy++) {
      for (var dx = 0; dx < 2; dx++) {
        let coord = clamp(base + vec3<i32>(dx, dy, dz), vec3<i32>(0), vec3<i32>(pps - 1));
        let idx = u32(coord.z * pps * pps + coord.y * pps + coord.x);
        let baseOff = idx * 28u;

        let valid = probeBuffer[baseOff + 27u];
        if (valid < 0.5) { continue; }

        // Trilinear weight
        let wx = select(1.0 - frac.x, frac.x, dx == 1);
        let wy = select(1.0 - frac.y, frac.y, dy == 1);
        let wz = select(1.0 - frac.z, frac.z, dz == 1);
        var w = wx * wy * wz;

        // Backface weight: reduce probes behind the surface
        let probeWorldPos = params.worldMin + (vec3<f32>(coord) + 0.5) * size / vec3<f32>(f32(pps));
        let toProbe = normalize(probeWorldPos - worldPos);
        let backWeight = max(0.05, dot(toProbe, normal) * 0.5 + 0.5);
        w *= backWeight;

        var coeffs: array<f32, 27>;
        for (var c = 0; c < 27; c++) {
          coeffs[c] = probeBuffer[baseOff + u32(c)];
        }

        irradiance += shDecode(normal, &coeffs) * w;
        totalWeight += w;
      }
    }
  }

  if (totalWeight > 0.001) {
    irradiance /= totalWeight;
  }
  return irradiance;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.screenWidth || gid.y >= params.screenHeight) { return; }

  let texCoord = vec2<i32>(gid.xy);
  let worldPos = textureLoad(positionTex, texCoord, 0).xyz;
  let normal = textureLoad(normalTex, texCoord, 0).xyz;
  let albedo = textureLoad(albedoTex, texCoord, 0).rgb;

  // Skip sky pixels (position at origin or zero normal)
  if (length(normal) < 0.1) {
    textureStore(outputTex, texCoord, vec4<f32>(0.0));
    return;
  }

  var irradiance = sampleProbeGrid(worldPos, normalize(normal));
  irradiance *= params.giIntensity;

  // Color bleeding: indirect light picks up surface albedo
  if (params.enableColorBleeding == 1u) {
    irradiance *= albedo;
  }

  textureStore(outputTex, texCoord, vec4<f32>(irradiance, 1.0));
}
`;

// ─── Main Class ───────────────────────────────────────────────────────────────
export class RadianceCascades2026 {
  constructor(device, options = {}) {
    this.device = device;

    this.options = {
      width: options.width || 1920,
      height: options.height || 1080,
      cascadeCount: options.cascadeCount || 5,
      probesPerCascade: options.probesPerCascade || [64, 32, 16, 8, 4],
      raysPerProbe: options.raysPerProbe || 64,
      maxBounces: options.maxBounces || 4,
      giIntensity: options.giIntensity || 1.0,
      enableColorBleeding: options.enableColorBleeding !== false,
      updateInterval: options.updateInterval || 4,
      enableEmissives: options.enableEmissives !== false,
      enable2_5D: options.enable2_5D || false,
      worldMin: options.worldMin || [-50, -10, -50],
      worldMax: options.worldMax || [50, 30, 50],
      temporalBlend: options.temporalBlend || 0.8,
    };

    this.cascades = [];
    this.pipelines = {};
    this.irradianceTexture = null;
    this.frameIndex = 0;
    this.currentCascade = 0;
    this.initialized = false;

    this.stats = {
      probesUpdated: 0,
      raysTraced: 0,
      bounces: 0,
      updateTimeMs: 0,
    };
  }

  // ── Initialization ────────────────────────────────────────────────────────
  async initialize() {
    try {
      this._createCascadeBuffers();
      this._createIrradianceTexture();
      await this._createInjectionPipeline();
      await this._createMergePipeline();
      await this._createSamplingPipeline();
      this.initialized = true;
      console.log(`✓ Radiance Cascades GI initialized — ${this.options.cascadeCount} cascades`);
      return true;
    } catch (err) {
      console.error('Radiance Cascades init failed:', err);
      return false;
    }
  }

  _createCascadeBuffers() {
    const { cascadeCount, probesPerCascade, worldMin, worldMax } = this.options;
    for (let i = 0; i < cascadeCount; i++) {
      const pps = probesPerCascade[i];
      const totalProbes = this.options.enable2_5D ? pps * pps : pps * pps * pps;
      const bufferSize = totalProbes * PROBE_STRIDE * 4; // f32 = 4 bytes

      // Expand world bounds for coarser cascades
      const scale = 1 + i * 0.5;
      const cMin = worldMin.map(v => v * scale);
      const cMax = worldMax.map(v => v * scale);

      const probeBuffer = this.device.createBuffer({
        size: bufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        label: `RC Cascade ${i} Probes (${pps}³)`,
      });

      const paramData = new Float32Array(16);
      // Uniform is populated per-dispatch in updateCascades

      const paramBuffer = this.device.createBuffer({
        size: 256, // 64-byte aligned, room for all params
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: `RC Cascade ${i} Params`,
      });

      this.cascades.push({ pps, totalProbes, probeBuffer, paramBuffer, worldMin: cMin, worldMax: cMax });
    }
  }

  _createIrradianceTexture() {
    this.irradianceTexture = this.device.createTexture({
      size: [this.options.width, this.options.height],
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
      label: 'RC Irradiance Output',
    });
  }

  // ── Pipeline: Radiance Injection ──────────────────────────────────────────
  async _createInjectionPipeline() {
    const module = this.device.createShaderModule({ code: INJECTION_WGSL, label: 'RC Injection' });

    const bgl = this.device.createBindGroupLayout({
      label: 'RC Injection BGL',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });

    this.pipelines.injection = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
      compute: { module, entryPoint: 'main' },
    });
    this.pipelines.injectionBGL = bgl;
  }

  // ── Pipeline: Cascade Merge ───────────────────────────────────────────────
  async _createMergePipeline() {
    const module = this.device.createShaderModule({ code: MERGE_WGSL, label: 'RC Merge' });

    const bgl = this.device.createBindGroupLayout({
      label: 'RC Merge BGL',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      ],
    });

    this.pipelines.merge = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
      compute: { module, entryPoint: 'main' },
    });
    this.pipelines.mergeBGL = bgl;
  }

  // ── Pipeline: Irradiance Sampling ─────────────────────────────────────────
  async _createSamplingPipeline() {
    const module = this.device.createShaderModule({ code: SAMPLING_WGSL, label: 'RC Sampling' });

    const bgl = this.device.createBindGroupLayout({
      label: 'RC Sampling BGL',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float' } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'rgba16float' } },
      ],
    });

    this.pipelines.sampling = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
      compute: { module, entryPoint: 'main' },
    });
    this.pipelines.samplingBGL = bgl;
  }

  // ── Update Cascades (Pass 1 + Pass 2) ─────────────────────────────────────
  updateCascades(commandEncoder, sceneData) {
    if (!this.initialized) return;
    const t0 = performance.now();

    // Round-robin: update one cascade per frame to spread cost
    const ci = this.currentCascade;
    const cascade = this.cascades[ci];

    // -- Pass 1: Radiance Injection for current cascade --
    this._runInjection(commandEncoder, cascade, ci, sceneData);
    this.stats.probesUpdated = cascade.totalProbes;
    this.stats.raysTraced = cascade.totalProbes * this.options.raysPerProbe;

    // -- Pass 2: Cascade Merge (propagate coarser → finer) --
    const bounces = Math.min(ci, this.options.maxBounces);
    for (let b = ci; b > 0; b--) {
      this._runMerge(commandEncoder, this.cascades[b - 1], this.cascades[b]);
    }
    this.stats.bounces = bounces;

    this.currentCascade = (ci + 1) % this.options.cascadeCount;
    this.frameIndex++;
    this.stats.updateTimeMs = performance.now() - t0;
  }

  _runInjection(commandEncoder, cascade, cascadeIndex, sceneData) {
    const { raysPerProbe, enableEmissives, temporalBlend } = this.options;

    // Write injection params
    const params = new ArrayBuffer(64);
    const u32v = new Uint32Array(params);
    const f32v = new Float32Array(params);
    u32v[0] = cascadeIndex;
    u32v[1] = cascade.pps;
    u32v[2] = raysPerProbe;
    u32v[3] = this.frameIndex;
    f32v[4] = cascade.worldMin[0]; f32v[5] = cascade.worldMin[1]; f32v[6] = cascade.worldMin[2]; f32v[7] = 0;
    f32v[8] = cascade.worldMax[0]; f32v[9] = cascade.worldMax[1]; f32v[10] = cascade.worldMax[2]; f32v[11] = 0;
    f32v[12] = temporalBlend;
    u32v[13] = enableEmissives ? 1 : 0;
    this.device.queue.writeBuffer(cascade.paramBuffer, 0, params);

    // Scene lights buffer
    const lights = sceneData.lights || [];
    const lightBuf = this._getOrCreateLightBuffer(lights);
    const lightCountBuf = this._getOrCreateLightCountBuffer(lights.length);

    const bindGroup = this.device.createBindGroup({
      layout: this.pipelines.injectionBGL,
      entries: [
        { binding: 0, resource: { buffer: cascade.paramBuffer } },
        { binding: 1, resource: { buffer: cascade.probeBuffer } },
        { binding: 2, resource: { buffer: lightBuf } },
        { binding: 3, resource: { buffer: lightCountBuf } },
      ],
    });

    const pass = commandEncoder.beginComputePass({ label: 'RC Injection' });
    pass.setPipeline(this.pipelines.injection);
    pass.setBindGroup(0, bindGroup);
    const wg = Math.ceil(cascade.pps / WORKGROUP_SIZE);
    pass.dispatchWorkgroups(wg, wg);
    pass.end();
  }

  _runMerge(commandEncoder, fineCascade, coarseCascade) {
    const params = new ArrayBuffer(96);
    const u32v = new Uint32Array(params);
    const f32v = new Float32Array(params);
    u32v[0] = fineCascade.pps;
    u32v[1] = coarseCascade.pps;
    f32v[2] = this.options.giIntensity;
    f32v[3] = 1.0 / this.options.maxBounces;
    f32v[4] = fineCascade.worldMin[0]; f32v[5] = fineCascade.worldMin[1]; f32v[6] = fineCascade.worldMin[2]; f32v[7] = 0;
    f32v[8] = fineCascade.worldMax[0]; f32v[9] = fineCascade.worldMax[1]; f32v[10] = fineCascade.worldMax[2]; f32v[11] = 0;
    f32v[12] = coarseCascade.worldMin[0]; f32v[13] = coarseCascade.worldMin[1]; f32v[14] = coarseCascade.worldMin[2]; f32v[15] = 0;
    f32v[16] = coarseCascade.worldMax[0]; f32v[17] = coarseCascade.worldMax[1]; f32v[18] = coarseCascade.worldMax[2]; f32v[19] = 0;

    const mergeParamBuffer = this.device.createBuffer({
      size: 96,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'RC Merge Params',
    });
    this.device.queue.writeBuffer(mergeParamBuffer, 0, params);

    const bindGroup = this.device.createBindGroup({
      layout: this.pipelines.mergeBGL,
      entries: [
        { binding: 0, resource: { buffer: mergeParamBuffer } },
        { binding: 1, resource: { buffer: fineCascade.probeBuffer } },
        { binding: 2, resource: { buffer: coarseCascade.probeBuffer } },
      ],
    });

    const pass = commandEncoder.beginComputePass({ label: 'RC Merge' });
    pass.setPipeline(this.pipelines.merge);
    pass.setBindGroup(0, bindGroup);
    const wg = Math.ceil(fineCascade.pps / WORKGROUP_SIZE);
    pass.dispatchWorkgroups(wg, wg);
    pass.end();
  }

  // ── Sample Irradiance (Pass 3) ────────────────────────────────────────────
  sampleIrradiance(commandEncoder, gBuffer) {
    if (!this.initialized) return;
    const fineCascade = this.cascades[0];
    const { width, height, giIntensity, enableColorBleeding } = this.options;

    const params = new ArrayBuffer(48);
    const u32v = new Uint32Array(params);
    const f32v = new Float32Array(params);
    u32v[0] = fineCascade.pps;
    u32v[1] = width;
    u32v[2] = height;
    u32v[3] = enableColorBleeding ? 1 : 0;
    f32v[4] = fineCascade.worldMin[0]; f32v[5] = fineCascade.worldMin[1]; f32v[6] = fineCascade.worldMin[2]; f32v[7] = 0;
    f32v[8] = fineCascade.worldMax[0]; f32v[9] = fineCascade.worldMax[1]; f32v[10] = fineCascade.worldMax[2]; f32v[11] = giIntensity;

    const sampleParamBuffer = this.device.createBuffer({
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'RC Sample Params',
    });
    this.device.queue.writeBuffer(sampleParamBuffer, 0, params);

    const bindGroup = this.device.createBindGroup({
      layout: this.pipelines.samplingBGL,
      entries: [
        { binding: 0, resource: { buffer: sampleParamBuffer } },
        { binding: 1, resource: { buffer: fineCascade.probeBuffer } },
        { binding: 2, resource: gBuffer.position.createView() },
        { binding: 3, resource: gBuffer.normal.createView() },
        { binding: 4, resource: gBuffer.albedo.createView() },
        { binding: 5, resource: this.irradianceTexture.createView() },
      ],
    });

    const pass = commandEncoder.beginComputePass({ label: 'RC Irradiance Sampling' });
    pass.setPipeline(this.pipelines.sampling);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(width / WORKGROUP_SIZE), Math.ceil(height / WORKGROUP_SIZE));
    pass.end();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  getIrradianceTexture() {
    return this.irradianceTexture;
  }

  setGIIntensity(value) {
    this.options.giIntensity = Math.max(0, value);
  }

  invalidateProbes(region) {
    // Mark probes overlapping the AABB as invalid so they are re-traced
    const { min, max } = region;
    for (const cascade of this.cascades) {
      const step = cascade.worldMax.map((v, i) => (v - cascade.worldMin[i]) / cascade.pps);
      const lo = min.map((v, i) => Math.max(0, Math.floor((v - cascade.worldMin[i]) / step[i])));
      const hi = max.map((v, i) => Math.min(cascade.pps - 1, Math.ceil((v - cascade.worldMin[i]) / step[i])));

      // Zero out the validity flag for probes inside the region
      const zeros = new Float32Array(1);
      for (let z = lo[2]; z <= hi[2]; z++) {
        for (let y = lo[1]; y <= hi[1]; y++) {
          for (let x = lo[0]; x <= hi[0]; x++) {
            const idx = z * cascade.pps * cascade.pps + y * cascade.pps + x;
            this.device.queue.writeBuffer(cascade.probeBuffer, (idx * PROBE_STRIDE + 27) * 4, zeros);
          }
        }
      }
    }
  }

  getStats() {
    return { ...this.stats };
  }

  dispose() {
    for (const c of this.cascades) {
      c.probeBuffer.destroy();
      c.paramBuffer.destroy();
    }
    if (this.irradianceTexture) this.irradianceTexture.destroy();
    if (this._lightBuffer) this._lightBuffer.destroy();
    if (this._lightCountBuffer) this._lightCountBuffer.destroy();
    this.cascades = [];
    this.pipelines = {};
    this.initialized = false;
  }

  // ── Internal helpers ──────────────────────────────────────────────────────
  _getOrCreateLightBuffer(lights) {
    // Each SceneLight = 8 floats (position[3], radius, color[3], intensity)
    const count = Math.max(lights.length, 1);
    const data = new Float32Array(count * 8);
    for (let i = 0; i < lights.length; i++) {
      const l = lights[i];
      const o = i * 8;
      data[o] = l.position?.[0] || 0;
      data[o + 1] = l.position?.[1] || 0;
      data[o + 2] = l.position?.[2] || 0;
      data[o + 3] = l.radius || 1;
      data[o + 4] = l.color?.[0] || 1;
      data[o + 5] = l.color?.[1] || 1;
      data[o + 6] = l.color?.[2] || 1;
      data[o + 7] = l.intensity || 1;
    }

    const neededSize = data.byteLength;
    if (!this._lightBuffer || this._lightBufferSize < neededSize) {
      if (this._lightBuffer) this._lightBuffer.destroy();
      this._lightBuffer = this.device.createBuffer({
        size: neededSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        label: 'RC Scene Lights',
      });
      this._lightBufferSize = neededSize;
    }
    this.device.queue.writeBuffer(this._lightBuffer, 0, data);
    return this._lightBuffer;
  }

  _getOrCreateLightCountBuffer(count) {
    if (!this._lightCountBuffer) {
      this._lightCountBuffer = this.device.createBuffer({
        size: 16, // uniform min alignment
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: 'RC Light Count',
      });
    }
    this.device.queue.writeBuffer(this._lightCountBuffer, 0, new Uint32Array([count]));
    return this._lightCountBuffer;
  }
}
