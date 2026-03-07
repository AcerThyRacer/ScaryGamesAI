/**
 * VolumetricPathTracer2026.js
 *
 * Production volumetric path tracer for the ScaryGamesAI horror gaming platform.
 * Handles fog, smoke, underwater, dust, fire, and magic volumes via WebGPU
 * compute shaders using delta tracking (Woodcock tracking), Henyey-Greenstein
 * phase function, multi-scattering approximation, and temporal accumulation.
 */

const MAX_VOLUMES = 64;
const MAX_LIGHTS = 16;
const NOISE_RES = 128;
const VOL_STRIDE_F32 = 24; // 96 bytes per VolumeInstance / 4
const LIGHT_STRIDE_F32 = 12; // 48 bytes per Light / 4
const PARAMS_BYTES = 96;
const CAMERA_BYTES = 160;
const WG = 8;

/* ═══════════════════════════════════════════════════════════════════
   WGSL Volumetric Compute Shader
   ═══════════════════════════════════════════════════════════════════ */

const VOLUMETRIC_WGSL = /* wgsl */ `

const PI: f32 = 3.14159265359;

// ─── Structures ─────────────────────────────────────────────────────

struct Params {
  resolution:        vec2<u32>,
  maxSteps:          u32,
  scatterSamples:    u32,
  time:              f32,
  frameIndex:        u32,
  maxDensity:        f32,
  temporalBlend:     f32,
  noiseScale:        f32,
  phaseG:            f32,
  volumeCount:       u32,
  lightCount:        u32,
  enableEmissive:    u32,
  enableShadows:     u32,
  enableMultiScatter: u32,
  fogDensity:        f32,
  fogHeightFalloff:  f32,
  _pad0:             f32,
  _pad1:             f32,
  _pad2:             f32,
  fogColor:          vec3<f32>,
  _pad3:             f32,
};

struct Camera {
  viewProj:    mat4x4<f32>,
  invViewProj: mat4x4<f32>,
  position:    vec3<f32>,
  near:        f32,
  forward:     vec3<f32>,
  far:         f32,
};

struct Light {
  position:  vec3<f32>,
  intensity: f32,
  color:     vec3<f32>,
  lightType: u32,
  direction: vec3<f32>,
  radius:    f32,
};

struct VolumeInstance {
  position:      vec3<f32>,
  density:       f32,
  size:          vec3<f32>,
  phaseG:        f32,
  scattering:    vec3<f32>,
  noiseScale:    f32,
  absorption:    vec3<f32>,
  noiseSpeed:    f32,
  emission:      vec3<f32>,
  volType:       u32,
  windDirection: vec3<f32>,
  _pad:          f32,
};

// ─── Bindings ───────────────────────────────────────────────────────

@group(0) @binding(0)  var<uniform>       params:       Params;
@group(0) @binding(1)  var<uniform>       camera:       Camera;
@group(0) @binding(2)  var<storage, read> volumes:      array<VolumeInstance>;
@group(0) @binding(3)  var<storage, read> lights:       array<Light>;
@group(0) @binding(4)  var                depthTex:     texture_2d<f32>;
@group(0) @binding(5)  var                colorTex:     texture_2d<f32>;
@group(0) @binding(6)  var                noiseTex:     texture_3d<f32>;
@group(0) @binding(7)  var                noiseSampler: sampler;
@group(0) @binding(8)  var                prevFrameTex: texture_2d<f32>;
@group(0) @binding(9)  var                outputTex:    texture_storage_2d<rgba16float, write>;

// ─── RNG (PCG hash) ────────────────────────────────────────────────

fn pcgHash(v: u32) -> u32 {
  var state = v * 747796405u + 2891336453u;
  let word  = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn rand(seed: ptr<function, u32>) -> f32 {
  *seed = pcgHash(*seed);
  return f32(*seed) / 4294967295.0;
}

// ─── Henyey-Greenstein Phase Function ──────────────────────────────

fn henyeyGreenstein(cosTheta: f32, g: f32) -> f32 {
  let g2    = g * g;
  let denom = 1.0 + g2 - 2.0 * g * cosTheta;
  return (1.0 - g2) / (4.0 * PI * pow(denom, 1.5));
}

// ─── Ray-AABB Intersection ─────────────────────────────────────────

fn rayBoxIntersect(ro: vec3<f32>, invDir: vec3<f32>,
                   boxMin: vec3<f32>, boxMax: vec3<f32>) -> vec2<f32> {
  let t1    = (boxMin - ro) * invDir;
  let t2    = (boxMax - ro) * invDir;
  let tmin  = min(t1, t2);
  let tmax  = max(t1, t2);
  let tNear = max(tmin.x, max(tmin.y, tmin.z));
  let tFar  = min(tmax.x, min(tmax.y, tmax.z));
  return vec2<f32>(max(tNear, 0.0), tFar);
}

// ─── 3D Noise FBM (4 octaves from pre-computed texture) ───────────

fn sampleNoiseFBM(pos: vec3<f32>, scale: f32,
                  speed: f32, wind: vec3<f32>) -> vec4<f32> {
  let p = (pos + wind * params.time * speed) * scale;
  var value = vec4<f32>(0.0);
  var amp   = 0.5;
  var freq  = 1.0;
  for (var i = 0; i < 4; i++) {
    value += textureSampleLevel(noiseTex, noiseSampler, p * freq, 0.0) * amp;
    amp  *= 0.5;
    freq *= 2.17;
  }
  return value;
}

// ─── Global Height Fog ─────────────────────────────────────────────

fn heightFogDensity(pos: vec3<f32>) -> f32 {
  if (params.fogDensity <= 0.0) { return 0.0; }
  return params.fogDensity * exp(-params.fogHeightFalloff * max(pos.y, 0.0));
}

// ─── Volume Density per Type ───────────────────────────────────────

fn evaluateVolumeDensity(pos: vec3<f32>, vol: VolumeInstance) -> f32 {
  let boxMin = vol.position - vol.size * 0.5;
  let boxMax = vol.position + vol.size * 0.5;
  if (any(pos < boxMin) || any(pos > boxMax)) { return 0.0; }

  let local = (pos - boxMin) / vol.size;
  let noise = sampleNoiseFBM(pos, vol.noiseScale, vol.noiseSpeed, vol.windDirection);
  var d = vol.density;

  switch vol.volType {
    case 0u {
      // Fog — smooth height-dependent
      d *= (1.0 - local.y) * (0.6 + 0.4 * noise.r);
    }
    case 1u {
      // Smoke — turbulent, Worley-driven, rising
      d *= (1.0 - local.y * 0.7) * (noise.r * 0.4 + noise.g * 0.6);
    }
    case 2u {
      // Underwater — layered murk
      let depth = 1.0 - local.y;
      d *= (0.3 + 0.7 * depth) * (0.7 + 0.3 * noise.b);
    }
    case 3u {
      // Dust — sparse bright motes
      d *= smoothstep(0.55, 0.7, noise.r) * noise.b;
    }
    case 4u {
      // Fire — upward flicker
      let flame = textureSampleLevel(noiseTex, noiseSampler,
        pos * vol.noiseScale * 1.5 + vec3<f32>(0.0, -params.time * 2.0, 0.0), 0.0);
      d *= (1.0 - local.y) * max(0.0, flame.r * 2.0 - 0.3);
    }
    case 5u {
      // Magic — pulsing ethereal
      let pulse = sin(params.time * 3.0) * 0.3 + 0.7;
      d *= pulse * (noise.b * 0.5 + noise.r * 0.5);
    }
    default { }
  }

  // Soft edge fade
  let edge = min(local, 1.0 - local);
  let fade = smoothstep(0.0, 0.08, min(edge.x, min(edge.y, edge.z)));
  return max(0.0, d * fade);
}

// ─── Shadow Ray (biased, 8 steps) ─────────────────────────────────

fn marchShadowRay(origin: vec3<f32>, dir: vec3<f32>,
                  maxDist: f32, seed: ptr<function, u32>) -> vec3<f32> {
  if (params.enableShadows == 0u) { return vec3<f32>(1.0); }
  var T  = vec3<f32>(1.0);
  let steps = 8u;
  let dt = maxDist / f32(steps);
  var t  = rand(seed) * dt;
  for (var s = 0u; s < steps; s++) {
    let p = origin + t * dir;
    var sigma = vec3<f32>(0.0);
    let hf = heightFogDensity(p);
    sigma += hf * (params.fogColor * 0.5 + vec3<f32>(0.01));
    for (var vi = 0u; vi < params.volumeCount; vi++) {
      let d = evaluateVolumeDensity(p, volumes[vi]);
      if (d > 0.001) {
        sigma += d * (volumes[vi].scattering + volumes[vi].absorption);
      }
    }
    T *= exp(-sigma * dt);
    t += dt;
    if (max(T.r, max(T.g, T.b)) < 0.01) { break; }
  }
  return T;
}

// ─── Main Compute Kernel ──────────────────────────────────────────

@compute @workgroup_size(${WG}, ${WG}, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let px = gid.xy;
  if (px.x >= params.resolution.x || px.y >= params.resolution.y) { return; }

  var seed = pcgHash(px.x + px.y * params.resolution.x
                     + params.frameIndex * params.resolution.x * params.resolution.y);

  // Reconstruct world-space ray
  let uv  = (vec2<f32>(px) + 0.5) / vec2<f32>(params.resolution);
  let ndc = vec2<f32>(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
  let clipNear = camera.invViewProj * vec4<f32>(ndc, 0.0, 1.0);
  let clipFar  = camera.invViewProj * vec4<f32>(ndc, 1.0, 1.0);
  let wNear    = clipNear.xyz / clipNear.w;
  let wFar     = clipFar.xyz  / clipFar.w;
  let rayOrigin = camera.position;
  let rayDir    = normalize(wFar - wNear);
  let invDir    = 1.0 / rayDir;

  // Scene depth → max march distance
  let depthSample = textureLoad(depthTex, vec2<i32>(px), 0).r;
  var maxT = camera.far;
  if (depthSample > 0.0 && depthSample < 1.0) {
    let cp = camera.invViewProj * vec4<f32>(ndc, depthSample, 1.0);
    maxT = length(cp.xyz / cp.w - camera.position);
  }

  // ── Delta / Ratio Tracking ─────────────────────────────────────
  var T = vec3<f32>(1.0);
  var L = vec3<f32>(0.0);
  var totalSigmaS = vec3<f32>(0.0);
  var totalSigmaT = vec3<f32>(0.0);
  var scatterSteps = 0u;
  let majorant = params.maxDensity;
  var t = 0.0;

  for (var step = 0u; step < params.maxSteps; step++) {
    let xi = rand(&seed);
    let dt = -log(max(1.0 - xi, 1e-6)) / majorant;
    t += dt;
    if (t > maxT) { break; }

    let pos = rayOrigin + t * rayDir;

    // Accumulate extinction from all sources
    var sigma_t  = vec3<f32>(0.0);
    var sigma_s  = vec3<f32>(0.0);
    var emAccum  = vec3<f32>(0.0);
    var localG   = params.phaseG;

    // Global height fog
    let hfD = heightFogDensity(pos);
    if (hfD > 0.001) {
      let warmth = exp(-params.fogHeightFalloff * max(pos.y, 0.0));
      let fogScat = params.fogColor * hfD;
      sigma_t += fogScat + vec3<f32>(0.01) * hfD;
      sigma_s += fogScat;
    }

    // Per-volume contributions
    for (var vi = 0u; vi < params.volumeCount; vi++) {
      let vol = volumes[vi];
      let d   = evaluateVolumeDensity(pos, vol);
      if (d > 0.001) {
        sigma_t += d * (vol.scattering + vol.absorption);
        sigma_s += d * vol.scattering;
        localG   = vol.phaseG;
        if (params.enableEmissive == 1u && (vol.volType == 4u || vol.volType == 5u)) {
          emAccum += vol.emission * d;
        }
      }
    }

    let sigma_max = max(sigma_t.r, max(sigma_t.g, sigma_t.b));
    if (sigma_max < 0.0001) { continue; }

    // Ratio tracking transmittance update
    T *= max(vec3<f32>(0.0), 1.0 - sigma_t / majorant);

    totalSigmaS += sigma_s;
    totalSigmaT += sigma_t;
    scatterSteps += 1u;

    // In-scattering from lights
    let invMaj = 1.0 / majorant;
    for (var li = 0u; li < min(params.lightCount, ${MAX_LIGHTS}u); li++) {
      let light = lights[li];
      var toLight: vec3<f32>;
      var atten: f32;

      if (light.lightType == 1u) {
        toLight = -light.direction;
        atten   = light.intensity;
      } else {
        let diff  = light.position - pos;
        let dist2 = dot(diff, diff);
        toLight   = diff * inverseSqrt(dist2);
        atten     = light.intensity / max(dist2, 0.01);
      }

      let cosTheta = dot(rayDir, toLight);
      let phase    = henyeyGreenstein(cosTheta, localG);
      let sDist    = select(light.radius, 100.0, light.lightType == 1u);
      let shadowT  = marchShadowRay(pos, toLight, sDist, &seed);

      L += T * sigma_s * phase * light.color * atten * shadowT * invMaj;
    }

    // Emissive contribution
    L += T * emAccum * invMaj;

    if (max(T.r, max(T.g, T.b)) < 0.01) { break; }
  }

  // Multi-scattering approximation
  if (params.enableMultiScatter == 1u && scatterSteps > 0u) {
    let avgS   = (totalSigmaS.r + totalSigmaS.g + totalSigmaS.b) / f32(scatterSteps * 3u);
    let avgT   = (totalSigmaT.r + totalSigmaT.g + totalSigmaT.b) / f32(scatterSteps * 3u);
    let albedo = avgS / max(avgT, 0.001);
    L *= 1.0 / (1.0 - albedo * 0.5);
  }

  // Premultiplied-alpha output
  let alpha  = saturate(1.0 - (T.r + T.g + T.b) / 3.0);
  var result = vec4<f32>(L, alpha);

  // Temporal accumulation
  if (params.frameIndex > 0u && params.temporalBlend > 0.0) {
    let prev = textureLoad(prevFrameTex, vec2<i32>(px), 0);
    result = mix(result, prev, params.temporalBlend);
  }

  textureStore(outputTex, vec2<i32>(px), result);
}
`;

/* ═══════════════════════════════════════════════════════════════════
   CPU-side 3D Noise Texture Generation (128³ RGBA)
   R = Perlin, G = Worley, B = Perlin-Worley blend, A = Curl approx
   ═══════════════════════════════════════════════════════════════════ */

function pcgHashJS(v) {
  v = ((v >>> 0) * 747796405 + 2891336453) >>> 0;
  const w = (((v >>> ((v >>> 28) + 4)) ^ v) * 277803737) >>> 0;
  return ((w >>> 22) ^ w) >>> 0;
}

function generateNoiseData() {
  const size = NOISE_RES;
  const data = new Uint8Array(size * size * size * 4);

  // Build permutation table (seeded shuffle)
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  let rng = 42;
  for (let i = 255; i > 0; i--) {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    const j = rng % (i + 1);
    const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp;
  }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];

  const grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
  ];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const dot3 = (g, x, y, z) => g[0] * x + g[1] * y + g[2] * z;

  function perlin(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(
      lerp(lerp(dot3(grad3[perm[AA] % 12], x, y, z),
                dot3(grad3[perm[BA] % 12], x - 1, y, z), u),
           lerp(dot3(grad3[perm[AB] % 12], x, y - 1, z),
                dot3(grad3[perm[BB] % 12], x - 1, y - 1, z), u), v),
      lerp(lerp(dot3(grad3[perm[AA + 1] % 12], x, y, z - 1),
                dot3(grad3[perm[BA + 1] % 12], x - 1, y, z - 1), u),
           lerp(dot3(grad3[perm[AB + 1] % 12], x, y - 1, z - 1),
                dot3(grad3[perm[BB + 1] % 12], x - 1, y - 1, z - 1), u), v), w);
  }

  function worley(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    let minDist = 1e10;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cx = ix + dx, cy = iy + dy, cz = iz + dz;
          const h1 = pcgHashJS((cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791));
          const h2 = pcgHashJS(h1);
          const h3 = pcgHashJS(h2);
          const fx = cx + (h1 & 0xffff) / 65536;
          const fy = cy + (h2 & 0xffff) / 65536;
          const fz = cz + (h3 & 0xffff) / 65536;
          const dist = (x - fx) ** 2 + (y - fy) ** 2 + (z - fz) ** 2;
          if (dist < minDist) minDist = dist;
        }
      }
    }
    return Math.min(Math.sqrt(minDist), 1.0);
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const S = 4; // noise frequency scale

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (z * size * size + y * size + x) * 4;
        const nx = (x / size) * S, ny = (y / size) * S, nz = (z / size) * S;

        const p = perlin(nx, ny, nz) * 0.5 + 0.5;
        const w = 1.0 - worley(nx, ny, nz);
        const pw = clamp01(p * 0.7 + w * 0.3);

        // Curl noise approximation via offset Perlin derivatives
        const eps = 0.1;
        const curl = clamp01(
          Math.abs(perlin(nx + eps, ny, nz) - perlin(nx - eps, ny, nz)
                 + perlin(nx, ny + eps, nz) - perlin(nx, ny - eps, nz)) * 0.5);

        data[idx]     = (clamp01(p) * 255) | 0;
        data[idx + 1] = (clamp01(w) * 255) | 0;
        data[idx + 2] = (pw * 255) | 0;
        data[idx + 3] = (curl * 255) | 0;
      }
    }
  }
  return data;
}

/* ═══════════════════════════════════════════════════════════════════
   VolumetricPathTracer2026 — Main Class
   ═══════════════════════════════════════════════════════════════════ */

export class VolumetricPathTracer2026 {
  /**
   * @param {GPUDevice} device  WebGPU device
   * @param {object}    options Configuration overrides
   */
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      width:                options.width  || 1280,
      height:               options.height || 720,
      maxSteps:             options.maxSteps             ?? 128,
      maxDensity:           options.maxDensity           ?? 2.0,
      scatteringSamples:    options.scatteringSamples    ?? 4,
      enableEmissiveVolumes: options.enableEmissiveVolumes ?? true,
      enableShadows:        options.enableShadows        ?? true,
      enableMultiScatter:   options.enableMultiScatter   ?? true,
      temporalBlend:        options.temporalBlend        ?? 0.9,
      noiseScale:           options.noiseScale           ?? 0.01,
      phaseG:               options.phaseG               ?? 0.3,
    };

    // GPU resources (created in initialize)
    this.computePipeline = null;
    this.bindGroupLayout = null;
    this.outputTexture   = null;
    this.prevFrameTexture = null;
    this.noiseTexture    = null;
    this.noiseSampler    = null;
    this.paramsBuffer    = null;
    this.cameraBuffer    = null;
    this.volumeBuffer    = null;
    this.lightBuffer     = null;

    // State
    this.volumes      = [];
    this.nextVolumeId = 0;
    this.globalFog    = { density: 0.02, color: [0.5, 0.6, 0.7], heightFalloff: 0.1 };
    this.frameIndex   = 0;
    this.lastRenderMs = 0;
    this.initialized  = false;
  }

  /* ── Async Initialisation ────────────────────────────────────── */

  async initialize() {
    this._createBuffers();
    this._createTextures();
    this._uploadNoiseTexture();
    await this._buildPipeline();
    this.initialized = true;
  }

  /* ── Volume Management ───────────────────────────────────────── */

  addVolume(type, position, size, params = {}) {
    const id = this.nextVolumeId++;
    this.volumes.push({
      id, type, position, size,
      density:       params.density       ?? 1.0,
      scattering:    params.scattering    ?? [0.5, 0.5, 0.5],
      absorption:    params.absorption    ?? [0.01, 0.01, 0.01],
      emission:      params.emission      ?? [0, 0, 0],
      phaseG:        params.phaseG        ?? this.options.phaseG,
      noiseScale:    params.noiseScale    ?? this.options.noiseScale,
      noiseSpeed:    params.noiseSpeed    ?? 0.5,
      windDirection: params.windDirection ?? [1, 0, 0],
    });
    this._uploadVolumeBuffer();
    return id;
  }

  removeVolume(id) {
    this.volumes = this.volumes.filter((v) => v.id !== id);
    this._uploadVolumeBuffer();
  }

  updateVolumes(volumes) {
    this.volumes = volumes.map((v, i) => ({ id: v.id ?? i, ...v }));
    this._uploadVolumeBuffer();
  }

  setGlobalFog(density, color, heightFalloff) {
    this.globalFog.density       = density       ?? this.globalFog.density;
    this.globalFog.color         = color         ?? this.globalFog.color;
    this.globalFog.heightFalloff = heightFalloff ?? this.globalFog.heightFalloff;
  }

  /* ── Render ──────────────────────────────────────────────────── */

  render(commandEncoder, inputs) {
    if (!this.initialized) {
      throw new Error('VolumetricPathTracer2026: call initialize() first');
    }
    const { depthBuffer, colorBuffer, cameraData, lights = [], time = 0 } = inputs;
    const t0 = performance.now();

    this._writeParams(time, lights.length);
    this._writeCamera(cameraData);
    this._writeLights(lights);

    const depthView = depthBuffer.createView  ? depthBuffer.createView()  : depthBuffer;
    const colorView = colorBuffer.createView  ? colorBuffer.createView()  : colorBuffer;

    const bindGroup = this.device.createBindGroup({
      label: 'volumetric-bind-group',
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.paramsBuffer } },
        { binding: 1, resource: { buffer: this.cameraBuffer } },
        { binding: 2, resource: { buffer: this.volumeBuffer } },
        { binding: 3, resource: { buffer: this.lightBuffer } },
        { binding: 4, resource: depthView },
        { binding: 5, resource: colorView },
        { binding: 6, resource: this.noiseTexture.createView() },
        { binding: 7, resource: this.noiseSampler },
        { binding: 8, resource: this.prevFrameTexture.createView() },
        { binding: 9, resource: this.outputTexture.createView() },
      ],
    });

    const pass = commandEncoder.beginComputePass({ label: 'volumetric-pass' });
    pass.setPipeline(this.computePipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(
      Math.ceil(this.options.width / WG),
      Math.ceil(this.options.height / WG),
    );
    pass.end();

    // Copy output → prevFrame for next frame's temporal blend
    commandEncoder.copyTextureToTexture(
      { texture: this.outputTexture },
      { texture: this.prevFrameTexture },
      { width: this.options.width, height: this.options.height },
    );

    this.frameIndex++;
    this.lastRenderMs = performance.now() - t0;
  }

  getOutputTexture() {
    return this.outputTexture;
  }

  getStats() {
    return {
      volumeCount: this.volumes.length,
      stepsPerRay: this.options.maxSteps,
      renderTimeMs: this.lastRenderMs,
    };
  }

  /* ── Cleanup ─────────────────────────────────────────────────── */

  dispose() {
    const destroy = (r) => { if (r && r.destroy) r.destroy(); };
    destroy(this.outputTexture);
    destroy(this.prevFrameTexture);
    destroy(this.noiseTexture);
    destroy(this.paramsBuffer);
    destroy(this.cameraBuffer);
    destroy(this.volumeBuffer);
    destroy(this.lightBuffer);
    this.computePipeline  = null;
    this.bindGroupLayout  = null;
    this.noiseSampler     = null;
    this.initialized      = false;
  }

  /* ═══════════════════════════════════════════════════════════════
     Private helpers
     ═══════════════════════════════════════════════════════════════ */

  _createBuffers() {
    const dev = this.device;
    const ubo = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
    const sto = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;

    this.paramsBuffer = dev.createBuffer({ label: 'vol-params', size: PARAMS_BYTES, usage: ubo });
    this.cameraBuffer = dev.createBuffer({ label: 'vol-camera', size: CAMERA_BYTES, usage: ubo });
    this.volumeBuffer = dev.createBuffer({
      label: 'vol-instances',
      size: Math.max(96, VOL_STRIDE_F32 * 4 * MAX_VOLUMES),
      usage: sto,
    });
    this.lightBuffer = dev.createBuffer({
      label: 'vol-lights',
      size: Math.max(48, LIGHT_STRIDE_F32 * 4 * MAX_LIGHTS),
      usage: sto,
    });
  }

  _createTextures() {
    const { width, height } = this.options;
    const dev = this.device;

    this.outputTexture = dev.createTexture({
      label: 'vol-output',
      size: [width, height],
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC
           | GPUTextureUsage.TEXTURE_BINDING,
    });

    this.prevFrameTexture = dev.createTexture({
      label: 'vol-prevFrame',
      size: [width, height],
      format: 'rgba16float',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    this.noiseTexture = dev.createTexture({
      label: 'vol-noise3d',
      size: [NOISE_RES, NOISE_RES, NOISE_RES],
      dimension: '3d',
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    this.noiseSampler = dev.createSampler({
      label: 'vol-noise-sampler',
      minFilter:    'linear',
      magFilter:    'linear',
      mipmapFilter: 'linear',
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      addressModeW: 'repeat',
    });
  }

  _uploadNoiseTexture() {
    const data = generateNoiseData();
    this.device.queue.writeTexture(
      { texture: this.noiseTexture },
      data,
      { bytesPerRow: NOISE_RES * 4, rowsPerImage: NOISE_RES },
      { width: NOISE_RES, height: NOISE_RES, depthOrArrayLayers: NOISE_RES },
    );
  }

  async _buildPipeline() {
    const dev = this.device;

    this.bindGroupLayout = dev.createBindGroupLayout({
      label: 'volumetric-bgl',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE,
          texture: { sampleType: 'unfilterable-float' } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE,
          texture: { sampleType: 'unfilterable-float' } },
        { binding: 6, visibility: GPUShaderStage.COMPUTE,
          texture: { sampleType: 'float', viewDimension: '3d' } },
        { binding: 7, visibility: GPUShaderStage.COMPUTE,
          sampler: { type: 'filtering' } },
        { binding: 8, visibility: GPUShaderStage.COMPUTE,
          texture: { sampleType: 'unfilterable-float' } },
        { binding: 9, visibility: GPUShaderStage.COMPUTE,
          storageTexture: { access: 'write-only', format: 'rgba16float' } },
      ],
    });

    const pipelineLayout = dev.createPipelineLayout({
      label: 'volumetric-pl',
      bindGroupLayouts: [this.bindGroupLayout],
    });

    const module = dev.createShaderModule({
      label: 'volumetric-shader',
      code: VOLUMETRIC_WGSL,
    });

    this.computePipeline = await dev.createComputePipelineAsync({
      label: 'volumetric-pipeline',
      layout: pipelineLayout,
      compute: { module, entryPoint: 'main' },
    });
  }

  /* ── Buffer Writers ──────────────────────────────────────────── */

  _writeParams(time, lightCount) {
    const buf = new ArrayBuffer(PARAMS_BYTES);
    const u = new Uint32Array(buf);
    const f = new Float32Array(buf);
    const o = this.options;

    // vec2<u32> resolution
    u[0] = o.width;
    u[1] = o.height;
    // u32 maxSteps, scatterSamples
    u[2] = o.maxSteps;
    u[3] = o.scatteringSamples;
    // f32 time, u32 frameIndex
    f[4] = time;
    u[5] = this.frameIndex;
    // f32 maxDensity, temporalBlend, noiseScale, phaseG
    f[6] = o.maxDensity;
    f[7] = o.temporalBlend;
    f[8] = o.noiseScale;
    f[9] = o.phaseG;
    // u32 volumeCount, lightCount, enableEmissive, enableShadows, enableMultiScatter
    u[10] = Math.min(this.volumes.length, MAX_VOLUMES);
    u[11] = Math.min(lightCount, MAX_LIGHTS);
    u[12] = o.enableEmissiveVolumes ? 1 : 0;
    u[13] = o.enableShadows ? 1 : 0;
    u[14] = o.enableMultiScatter ? 1 : 0;
    // f32 fogDensity, fogHeightFalloff, _pad0-2
    f[15] = this.globalFog.density;
    f[16] = this.globalFog.heightFalloff;
    // indices 17-19 are padding (_pad0, _pad1, _pad2)
    // vec3<f32> fogColor at offset 80 = index 20 (align 16)
    f[20] = this.globalFog.color[0];
    f[21] = this.globalFog.color[1];
    f[22] = this.globalFog.color[2];
    // _pad3
    f[23] = 0;

    this.device.queue.writeBuffer(this.paramsBuffer, 0, buf);
  }

  _writeCamera(cam) {
    const f = new Float32Array(CAMERA_BYTES / 4);
    f.set(cam.viewProj,    0);     // mat4x4 at index 0
    f.set(cam.invViewProj, 16);    // mat4x4 at index 16
    f[32] = cam.position[0];
    f[33] = cam.position[1];
    f[34] = cam.position[2];
    f[35] = cam.near ?? 0.1;
    f[36] = cam.forward[0];
    f[37] = cam.forward[1];
    f[38] = cam.forward[2];
    f[39] = cam.far ?? 1000.0;
    this.device.queue.writeBuffer(this.cameraBuffer, 0, f);
  }

  _writeLights(lights) {
    const count = Math.min(lights.length, MAX_LIGHTS);
    const buf = new ArrayBuffer(LIGHT_STRIDE_F32 * 4 * MAX_LIGHTS);
    const f = new Float32Array(buf);
    const u = new Uint32Array(buf);

    for (let i = 0; i < count; i++) {
      const li = lights[i];
      const o  = i * LIGHT_STRIDE_F32;
      f[o]     = li.position?.[0]  ?? 0;
      f[o + 1] = li.position?.[1]  ?? 0;
      f[o + 2] = li.position?.[2]  ?? 0;
      f[o + 3] = li.intensity      ?? 1;
      f[o + 4] = li.color?.[0]     ?? 1;
      f[o + 5] = li.color?.[1]     ?? 1;
      f[o + 6] = li.color?.[2]     ?? 1;
      u[o + 7] = li.type           ?? 0;
      f[o + 8] = li.direction?.[0] ?? 0;
      f[o + 9] = li.direction?.[1] ?? -1;
      f[o + 10] = li.direction?.[2] ?? 0;
      f[o + 11] = li.radius        ?? 50;
    }
    this.device.queue.writeBuffer(this.lightBuffer, 0, buf);
  }

  _uploadVolumeBuffer() {
    if (!this.volumeBuffer) return;
    const count = Math.min(this.volumes.length, MAX_VOLUMES);
    const buf = new ArrayBuffer(VOL_STRIDE_F32 * 4 * MAX_VOLUMES);
    const f = new Float32Array(buf);
    const u = new Uint32Array(buf);

    for (let i = 0; i < count; i++) {
      const v = this.volumes[i];
      const o = i * VOL_STRIDE_F32;
      f[o]      = v.position[0];
      f[o + 1]  = v.position[1];
      f[o + 2]  = v.position[2];
      f[o + 3]  = v.density       ?? 1;
      f[o + 4]  = v.size[0];
      f[o + 5]  = v.size[1];
      f[o + 6]  = v.size[2];
      f[o + 7]  = v.phaseG        ?? this.options.phaseG;
      f[o + 8]  = v.scattering?.[0] ?? 0.5;
      f[o + 9]  = v.scattering?.[1] ?? 0.5;
      f[o + 10] = v.scattering?.[2] ?? 0.5;
      f[o + 11] = v.noiseScale    ?? this.options.noiseScale;
      f[o + 12] = v.absorption?.[0] ?? 0.01;
      f[o + 13] = v.absorption?.[1] ?? 0.01;
      f[o + 14] = v.absorption?.[2] ?? 0.01;
      f[o + 15] = v.noiseSpeed    ?? 0.5;
      f[o + 16] = v.emission?.[0] ?? 0;
      f[o + 17] = v.emission?.[1] ?? 0;
      f[o + 18] = v.emission?.[2] ?? 0;
      u[o + 19] = v.type          ?? 0;
      f[o + 20] = v.windDirection?.[0] ?? 1;
      f[o + 21] = v.windDirection?.[1] ?? 0;
      f[o + 22] = v.windDirection?.[2] ?? 0;
      f[o + 23] = 0; // _pad
    }
    this.device.queue.writeBuffer(this.volumeBuffer, 0, buf);
  }
}

export default VolumetricPathTracer2026;
