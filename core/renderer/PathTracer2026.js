/**
 * PathTracer2026 — Monte Carlo Path Tracer (WebGPU Compute)
 *
 * Production path tracer for the ScaryGamesAI horror engine.
 * Uses progressive accumulation with MIS, NEE, and Russian Roulette
 * for physically-based lighting in real-time and photo-mode contexts.
 */

// ---------------------------------------------------------------------------
// WGSL: Path Trace Compute Kernel
// ---------------------------------------------------------------------------
const pathTraceShader = /* wgsl */ `

struct Uniforms {
  invProjection: mat4x4<f32>,
  invView:       mat4x4<f32>,
  cameraPos:     vec3<f32>,
  frameCount:    u32,
  width:         u32,
  height:        u32,
  maxBounces:    u32,
  samplesPerPixel: u32,
  enableMIS:     u32,
  enableNEE:     u32,
  enableRR:      u32,
  rrDepth:       u32,
  lightCount:    u32,
  nodeCount:     u32,
  triangleCount: u32,
  pad0:          u32,
};

struct BVHNode {
  minBounds: vec3<f32>,
  leftOrStart: u32,   // left child index  OR  first triangle index (leaf)
  maxBounds: vec3<f32>,
  rightOrCount: u32,  // right child index OR  triangle count      (leaf)
};

struct Triangle {
  v0: vec3<f32>, matId: u32,
  v1: vec3<f32>, pad1:  f32,
  v2: vec3<f32>, pad2:  f32,
  n0: vec3<f32>, pad3:  f32,
  n1: vec3<f32>, pad4:  f32,
  n2: vec3<f32>, pad5:  f32,
};

struct Material {
  albedo:       vec3<f32>,
  roughness:    f32,
  emission:     vec3<f32>,
  metallic:     f32,
  transmission: f32,
  ior:          f32,
  materialType: u32,  // 0=diffuse 1=metal 2=dielectric 3=emissive
  pad0:         u32,
};

struct Light {
  position:  vec3<f32>,
  lightType: u32,      // 0=point 1=area
  emission:  vec3<f32>,
  radius:    f32,
  normal:    vec3<f32>,
  area:      f32,
};

struct Ray   { origin: vec3<f32>, dir: vec3<f32> };
struct HitInfo { t: f32, u: f32, v: f32, triIdx: u32, hit: bool };

// --- bindings ---------------------------------------------------------------
@group(0) @binding(0)  var<uniform>            uni:       Uniforms;
@group(0) @binding(1)  var<storage, read>      bvh:       array<BVHNode>;
@group(0) @binding(2)  var<storage, read>      triangles: array<Triangle>;
@group(0) @binding(3)  var<storage, read>      materials: array<Material>;
@group(0) @binding(4)  var<storage, read>      lights:    array<Light>;
@group(0) @binding(5)  var                     outputTex: texture_storage_2d<rgba32float, write>;

const PI      = 3.14159265359;
const INV_PI  = 0.31830988618;
const EPSILON = 0.0001;
const T_MAX   = 1e20;

// --- RNG (PCG) --------------------------------------------------------------
fn pcgHash(s: u32) -> u32 {
  var state = s * 747796405u + 2891336453u;
  let word  = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn rng(seed: ptr<function, u32>) -> f32 {
  *seed = pcgHash(*seed);
  return f32(*seed) / 4294967295.0;
}

// --- Orthonormal basis from normal ------------------------------------------
fn buildONB(n: vec3<f32>) -> mat3x3<f32> {
  let s = select(1.0, -1.0, n.z < 0.0);
  let a = -1.0 / (s + n.z);
  let b = n.x * n.y * a;
  let t = vec3<f32>(1.0 + s * n.x * n.x * a, s * b, -s * n.x);
  let bt = vec3<f32>(b, s + n.y * n.y * a, -n.y);
  return mat3x3<f32>(t, bt, n);
}

// --- Cosine-weighted hemisphere sample --------------------------------------
fn sampleCosineHemisphere(n: vec3<f32>, seed: ptr<function, u32>) -> vec3<f32> {
  let r1 = rng(seed);
  let r2 = rng(seed);
  let phi = 2.0 * PI * r1;
  let sr2 = sqrt(r2);
  let local = vec3<f32>(cos(phi) * sr2, sin(phi) * sr2, sqrt(1.0 - r2));
  return buildONB(n) * local;
}

fn cosinePdf(cosTheta: f32) -> f32 {
  return max(cosTheta, 0.0) * INV_PI;
}

// --- GGX microfacet helpers -------------------------------------------------
fn ggxD(NdotH: f32, a2: f32) -> f32 {
  let d = NdotH * NdotH * (a2 - 1.0) + 1.0;
  return a2 / (PI * d * d + EPSILON);
}

fn smithG1(NdotV: f32, a2: f32) -> f32 {
  let n2 = NdotV * NdotV;
  return 2.0 * NdotV / (NdotV + sqrt(a2 + (1.0 - a2) * n2) + EPSILON);
}

fn smithG(NdotL: f32, NdotV: f32, a2: f32) -> f32 {
  return smithG1(NdotL, a2) * smithG1(NdotV, a2);
}

fn fresnelSchlick(cosTheta: f32, f0: vec3<f32>) -> vec3<f32> {
  let t = 1.0 - cosTheta;
  let t2 = t * t;
  return f0 + (vec3<f32>(1.0) - f0) * (t2 * t2 * t);
}

fn fresnelDielectric(cosI: f32, eta: f32) -> f32 {
  let sin2T = eta * eta * (1.0 - cosI * cosI);
  if sin2T > 1.0 { return 1.0; }
  let cosT = sqrt(1.0 - sin2T);
  let rs = (cosI - eta * cosT) / (cosI + eta * cosT + EPSILON);
  let rp = (eta * cosI - cosT) / (eta * cosI + cosT + EPSILON);
  return 0.5 * (rs * rs + rp * rp);
}

// GGX importance-sampled half-vector
fn sampleGGX(n: vec3<f32>, roughness: f32, seed: ptr<function, u32>) -> vec3<f32> {
  let a = roughness * roughness;
  let r1 = rng(seed);
  let r2 = rng(seed);
  let phi = 2.0 * PI * r1;
  let cosTheta = sqrt((1.0 - r2) / (1.0 + (a * a - 1.0) * r2 + EPSILON));
  let sinTheta = sqrt(1.0 - cosTheta * cosTheta);
  let local = vec3<f32>(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
  return normalize(buildONB(n) * local);
}

fn ggxPdf(NdotH: f32, HdotV: f32, a2: f32) -> f32 {
  return ggxD(NdotH, a2) * NdotH / (4.0 * HdotV + EPSILON);
}

// --- Ray / AABB intersection ------------------------------------------------
fn intersectAABB(r: Ray, bmin: vec3<f32>, bmax: vec3<f32>) -> f32 {
  let invDir = 1.0 / (r.dir + vec3<f32>(EPSILON));
  let t1 = (bmin - r.origin) * invDir;
  let t2 = (bmax - r.origin) * invDir;
  let tmin = max(max(min(t1.x, t2.x), min(t1.y, t2.y)), min(t1.z, t2.z));
  let tmax = min(min(max(t1.x, t2.x), max(t1.y, t2.y)), max(t1.z, t2.z));
  if tmax < 0.0 || tmin > tmax { return T_MAX; }
  return tmin;
}

// --- Ray / Triangle (Möller–Trumbore) ---------------------------------------
fn intersectTriangle(r: Ray, triIdx: u32) -> vec3<f32> {
  let tri = triangles[triIdx];
  let e1 = tri.v1 - tri.v0;
  let e2 = tri.v2 - tri.v0;
  let h  = cross(r.dir, e2);
  let a  = dot(e1, h);
  if abs(a) < EPSILON { return vec3<f32>(T_MAX, 0.0, 0.0); }
  let f = 1.0 / a;
  let s = r.origin - tri.v0;
  let u = f * dot(s, h);
  if u < 0.0 || u > 1.0 { return vec3<f32>(T_MAX, 0.0, 0.0); }
  let q = cross(s, e1);
  let v = f * dot(r.dir, q);
  if v < 0.0 || u + v > 1.0 { return vec3<f32>(T_MAX, 0.0, 0.0); }
  let t = f * dot(e2, q);
  if t < EPSILON { return vec3<f32>(T_MAX, 0.0, 0.0); }
  return vec3<f32>(t, u, v);
}

// --- BVH traversal ----------------------------------------------------------
fn traceRay(r: Ray) -> HitInfo {
  var closest = HitInfo(T_MAX, 0.0, 0.0, 0u, false);
  var stack: array<u32, 32>;
  var stackPtr = 0;
  stack[0] = 0u;
  stackPtr = 1;

  while stackPtr > 0 {
    stackPtr -= 1;
    let nodeIdx = stack[stackPtr];
    let node = bvh[nodeIdx];

    let tBox = intersectAABB(r, node.minBounds, node.maxBounds);
    if tBox >= closest.t { continue; }

    let isLeaf = (node.rightOrCount & 0x80000000u) != 0u;
    if isLeaf {
      let count = node.rightOrCount & 0x7FFFFFFFu;
      let start = node.leftOrStart;
      for (var i = 0u; i < count; i++) {
        let tuv = intersectTriangle(r, start + i);
        if tuv.x < closest.t {
          closest = HitInfo(tuv.x, tuv.y, tuv.z, start + i, true);
        }
      }
    } else {
      let leftDist  = intersectAABB(r, bvh[node.leftOrStart].minBounds,  bvh[node.leftOrStart].maxBounds);
      let rightDist = intersectAABB(r, bvh[node.rightOrCount].minBounds, bvh[node.rightOrCount].maxBounds);
      // Push the farther child first so we pop the closer one first.
      if leftDist < rightDist {
        if rightDist < closest.t && stackPtr < 31 { stack[stackPtr] = node.rightOrCount; stackPtr++; }
        if leftDist  < closest.t && stackPtr < 31 { stack[stackPtr] = node.leftOrStart;  stackPtr++; }
      } else {
        if leftDist  < closest.t && stackPtr < 31 { stack[stackPtr] = node.leftOrStart;  stackPtr++; }
        if rightDist < closest.t && stackPtr < 31 { stack[stackPtr] = node.rightOrCount; stackPtr++; }
      }
    }
  }
  return closest;
}

// --- Shadow ray (any-hit) ---------------------------------------------------
fn traceShadowRay(r: Ray, maxT: f32) -> bool {
  var stack: array<u32, 32>;
  var stackPtr = 0;
  stack[0] = 0u;
  stackPtr = 1;

  while stackPtr > 0 {
    stackPtr -= 1;
    let node = bvh[stack[stackPtr]];
    if intersectAABB(r, node.minBounds, node.maxBounds) >= maxT { continue; }

    let isLeaf = (node.rightOrCount & 0x80000000u) != 0u;
    if isLeaf {
      let count = node.rightOrCount & 0x7FFFFFFFu;
      let start = node.leftOrStart;
      for (var i = 0u; i < count; i++) {
        if intersectTriangle(r, start + i).x < maxT { return true; }
      }
    } else {
      if stackPtr < 30 { stack[stackPtr] = node.leftOrStart;  stackPtr++; }
      if stackPtr < 30 { stack[stackPtr] = node.rightOrCount; stackPtr++; }
    }
  }
  return false;
}

// --- Shading normal ---------------------------------------------------------
fn shadingNormal(hit: HitInfo) -> vec3<f32> {
  let tri = triangles[hit.triIdx];
  let w = 1.0 - hit.u - hit.v;
  return normalize(tri.n0 * w + tri.n1 * hit.u + tri.n2 * hit.v);
}

// --- MIS balance heuristic --------------------------------------------------
fn balanceHeuristic(pdfA: f32, pdfB: f32) -> f32 {
  return pdfA / (pdfA + pdfB + EPSILON);
}

// --- NEE: sample one light directly -----------------------------------------
fn sampleLightDirect(P: vec3<f32>, N: vec3<f32>, seed: ptr<function, u32>) -> vec3<f32> {
  if uni.lightCount == 0u { return vec3<f32>(0.0); }
  let idx = u32(rng(seed) * f32(uni.lightCount));
  let lt = lights[idx];
  var toLight: vec3<f32>;
  var dist: f32;
  var lightPdf: f32;

  if lt.lightType == 0u {
    // Point light
    toLight = lt.position - P;
    dist = length(toLight);
    toLight /= dist;
    lightPdf = (dist * dist) / (lt.area + EPSILON);
  } else {
    // Area light — uniform point on disk
    let r1 = rng(seed);
    let r2 = rng(seed);
    let diskR = sqrt(r1) * lt.radius;
    let diskA = 2.0 * PI * r2;
    let tangent = buildONB(lt.normal);
    let samplePos = lt.position + tangent * vec3<f32>(cos(diskA) * diskR, sin(diskA) * diskR, 0.0);
    toLight = samplePos - P;
    dist = length(toLight);
    toLight /= dist;
    let cosLight = abs(dot(-toLight, lt.normal));
    lightPdf = (dist * dist) / (lt.area * cosLight + EPSILON);
  }

  let NdotL = dot(N, toLight);
  if NdotL <= 0.0 { return vec3<f32>(0.0); }

  let shadowRay = Ray(P + N * EPSILON * 2.0, toLight);
  if traceShadowRay(shadowRay, dist - EPSILON * 4.0) { return vec3<f32>(0.0); }

  let brdfPdf = cosinePdf(NdotL);
  var w = 1.0;
  if uni.enableMIS != 0u {
    w = balanceHeuristic(lightPdf, brdfPdf);
  }
  let contribution = lt.emission * NdotL / (lightPdf + EPSILON) * f32(uni.lightCount);
  return contribution * w;
}

// --- Main path trace kernel -------------------------------------------------
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let px = gid.x;
  let py = gid.y;
  if px >= uni.width || py >= uni.height { return; }

  var seed = pcgHash(px + py * uni.width + uni.frameCount * uni.width * uni.height);

  var radiance = vec3<f32>(0.0);

  for (var samp = 0u; samp < uni.samplesPerPixel; samp++) {
    // Jittered UV for anti-aliasing
    let jx = (f32(px) + rng(&seed)) / f32(uni.width);
    let jy = (f32(py) + rng(&seed)) / f32(uni.height);
    let ndc = vec2<f32>(jx * 2.0 - 1.0, 1.0 - jy * 2.0);

    // Camera ray
    let clipPos  = vec4<f32>(ndc, -1.0, 1.0);
    var viewPos  = uni.invProjection * clipPos;
    viewPos = vec4<f32>(viewPos.xyz / viewPos.w, 0.0);
    let worldDir = normalize((uni.invView * viewPos).xyz);

    var ray = Ray(uni.cameraPos, worldDir);
    var throughput = vec3<f32>(1.0);
    var sampleRad  = vec3<f32>(0.0);

    for (var bounce = 0u; bounce < uni.maxBounces; bounce++) {
      let hit = traceRay(ray);
      if !hit.hit {
        // Sky: dark ambient for horror scenes
        sampleRad += throughput * vec3<f32>(0.01, 0.01, 0.015);
        break;
      }

      let P = ray.origin + ray.dir * hit.t;
      var N = shadingNormal(hit);
      let mat = materials[triangles[hit.triIdx].matId];

      // Flip normal to face incoming ray
      if dot(N, -ray.dir) < 0.0 { N = -N; }
      let NdotV = max(dot(N, -ray.dir), 0.0);

      // Emissive hit
      if mat.materialType == 3u || length(mat.emission) > 0.0 {
        if bounce == 0u || uni.enableNEE == 0u {
          sampleRad += throughput * mat.emission;
        } else if uni.enableMIS != 0u {
          // MIS weight for hitting an emitter via BRDF sampling
          let brdfP = cosinePdf(NdotV);
          let distSq = hit.t * hit.t;
          let lPdf = distSq / (1.0 + EPSILON);
          sampleRad += throughput * mat.emission * balanceHeuristic(brdfP, lPdf);
        }
        break;
      }

      // NEE: direct light sampling
      if uni.enableNEE != 0u && mat.transmission < 0.5 {
        let direct = sampleLightDirect(P + N * EPSILON * 2.0, N, &seed);
        sampleRad += throughput * mat.albedo * INV_PI * direct;
      }

      // Russian Roulette
      if uni.enableRR != 0u && bounce >= uni.rrDepth {
        let survivalProb = clamp(max(throughput.r, max(throughput.g, throughput.b)), 0.05, 0.95);
        if rng(&seed) > survivalProb { break; }
        throughput /= survivalProb;
      }

      // Material scattering
      if mat.materialType == 2u && mat.transmission > 0.0 {
        // Dielectric (glass / transmissive)
        let entering = dot(N, -ray.dir) > 0.0;
        let eta = select(mat.ior, 1.0 / mat.ior, entering);
        let fresnel = fresnelDielectric(NdotV, eta);

        if rng(&seed) < fresnel {
          // Reflect
          let refl = reflect(ray.dir, N);
          ray = Ray(P + N * EPSILON * 2.0, refl);
        } else {
          // Refract
          let refr = refract(ray.dir, N, eta);
          if length(refr) < EPSILON {
            ray = Ray(P + N * EPSILON * 2.0, reflect(ray.dir, N));
          } else {
            ray = Ray(P - N * EPSILON * 2.0, normalize(refr));
          }
        }
        throughput *= mat.albedo;
      } else if mat.materialType == 1u || mat.metallic > 0.5 {
        // Metal / specular (GGX)
        let roughness = max(mat.roughness, 0.04);
        let a2 = roughness * roughness * roughness * roughness;
        let H = sampleGGX(N, roughness, &seed);
        let L = reflect(ray.dir, H);
        let NdotL = dot(N, L);
        if NdotL <= 0.0 { break; }
        let NdotH = max(dot(N, H), 0.0);
        let HdotV = max(dot(H, -ray.dir), 0.0);
        let f0 = mat.albedo;
        let F = fresnelSchlick(HdotV, f0);
        let G = smithG(NdotL, NdotV, a2);
        let spec = F * G * HdotV / (NdotH * NdotV + EPSILON);
        throughput *= spec;
        ray = Ray(P + N * EPSILON * 2.0, L);
      } else {
        // Diffuse (Lambertian)
        let L = sampleCosineHemisphere(N, &seed);
        let NdotL = max(dot(N, L), 0.0);
        if NdotL <= 0.0 { break; }
        throughput *= mat.albedo;
        ray = Ray(P + N * EPSILON * 2.0, L);
      }
    }

    radiance += sampleRad;
  }

  radiance /= f32(uni.samplesPerPixel);
  textureStore(outputTex, vec2<i32>(i32(px), i32(py)), vec4<f32>(radiance, 1.0));
}
`;

// ---------------------------------------------------------------------------
// WGSL: Accumulation Shader
// ---------------------------------------------------------------------------
const accumulationShader = /* wgsl */ `

struct AccumUniforms { frameCount: u32, width: u32, height: u32, pad: u32 };

@group(0) @binding(0) var<uniform>       au:       AccumUniforms;
@group(0) @binding(1) var                 newFrame: texture_2d<f32>;
@group(0) @binding(2) var                 history:  texture_2d<f32>;
@group(0) @binding(3) var                 output:   texture_storage_2d<rgba32float, write>;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if gid.x >= au.width || gid.y >= au.height { return; }
  let coord = vec2<i32>(i32(gid.x), i32(gid.y));
  let newSample = textureLoad(newFrame, coord, 0).rgb;
  let prev      = textureLoad(history,  coord, 0).rgb;
  let w = 1.0 / f32(au.frameCount + 1u);
  let blended = mix(prev, newSample, w);
  textureStore(output, coord, vec4<f32>(blended, 1.0));
}
`;

// ---------------------------------------------------------------------------
// WGSL: Tone-Mapping Shader  (ACES filmic + exposure)
// ---------------------------------------------------------------------------
const toneMappingShader = /* wgsl */ `

struct ToneUniforms { exposure: f32, width: u32, height: u32, pad: u32 };

@group(0) @binding(0) var<uniform>       tu:       ToneUniforms;
@group(0) @binding(1) var                 hdrInput: texture_2d<f32>;
@group(0) @binding(2) var                 ldrOut:   texture_storage_2d<rgba8unorm, write>;

fn acesFilmic(x: vec3<f32>) -> vec3<f32> {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
}

fn linearToSRGB(c: vec3<f32>) -> vec3<f32> {
  let lo = c * 12.92;
  let hi = pow(c, vec3<f32>(1.0 / 2.4)) * 1.055 - vec3<f32>(0.055);
  return select(hi, lo, c <= vec3<f32>(0.0031308));
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if gid.x >= tu.width || gid.y >= tu.height { return; }
  let coord = vec2<i32>(i32(gid.x), i32(gid.y));
  var hdr = textureLoad(hdrInput, coord, 0).rgb;
  hdr *= tu.exposure;
  let mapped = acesFilmic(hdr);
  let srgb   = linearToSRGB(mapped);
  textureStore(ldrOut, coord, vec4<f32>(srgb, 1.0));
}
`;

// ---------------------------------------------------------------------------
// PathTracer2026 class
// ---------------------------------------------------------------------------
export class PathTracer2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      maxBounces: 8,
      samplesPerPixel: 1,
      maxAccumulatedFrames: 512,
      enableMIS: true,
      enableNEE: true,
      enableRussianRoulette: true,
      russianRouletteDepth: 3,
      enableSpectralRendering: false,
      enableCaustics: true,
      toneMapping: "aces",
      width: 1920,
      height: 1080,
      ...options,
    };

    this.width = this.options.width;
    this.height = this.options.height;
    this.exposure = 1.0;
    this.frameCount = 0;

    // GPU resources (created during initialize)
    this.pathTracePipeline = null;
    this.accumulationPipeline = null;
    this.toneMappingPipeline = null;

    this.uniformBuffer = null;
    this.accumUniformBuffer = null;
    this.toneUniformBuffer = null;

    this.bvhBuffer = null;
    this.triangleBuffer = null;
    this.materialBuffer = null;
    this.lightBuffer = null;

    this.radianceTexture = null;
    this.historyTextures = [null, null]; // ping-pong
    this.outputTexture = null;

    this.stats = {
      samplesAccumulated: 0,
      raysPerSecond: 0,
      convergence: 0,
      lastFrameTimeMs: 0,
    };

    this._historyIndex = 0;
    this._disposed = false;
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------
  async initialize() {
    try {
      this._createTextures();
      this._createBuffers();
      await this._createPathTracePipeline();
      await this._createAccumulationPipeline();
      await this._createToneMappingPipeline();

      console.log("✓ PathTracer2026 initialized");
      console.log(`  • Resolution: ${this.width}×${this.height}`);
      console.log(`  • Max bounces: ${this.options.maxBounces}`);
      console.log(`  • MIS: ${this.options.enableMIS}  NEE: ${this.options.enableNEE}  RR: ${this.options.enableRussianRoulette}`);
      return true;
    } catch (error) {
      console.error("PathTracer2026 initialization failed:", error);
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Texture creation
  // -------------------------------------------------------------------------
  _createTextures() {
    const size = [this.width, this.height];
    const hdrDesc = {
      size,
      format: "rgba32float",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    };

    this.radianceTexture = this.device.createTexture({ ...hdrDesc, label: "PT radiance" });
    this.historyTextures[0] = this.device.createTexture({ ...hdrDesc, label: "PT history A" });
    this.historyTextures[1] = this.device.createTexture({ ...hdrDesc, label: "PT history B" });
    this.outputTexture = this.device.createTexture({
      size,
      format: "rgba8unorm",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
      label: "PT LDR output",
    });
  }

  // -------------------------------------------------------------------------
  // Buffer creation (placeholder sizes; real data via updateScene)
  // -------------------------------------------------------------------------
  _createBuffers() {
    // Path-trace uniform buffer (Uniforms struct = 16 * u32/f32 = 256 bytes aligned)
    this.uniformBuffer = this.device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "PT uniforms",
    });

    this.accumUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "PT accum uniforms",
    });

    this.toneUniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "PT tone uniforms",
    });

    // Scene buffers — start with minimal size; reallocated in updateScene
    const minStorage = 64;
    const storageUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    this.bvhBuffer = this.device.createBuffer({ size: minStorage, usage: storageUsage, label: "PT BVH" });
    this.triangleBuffer = this.device.createBuffer({ size: minStorage, usage: storageUsage, label: "PT triangles" });
    this.materialBuffer = this.device.createBuffer({ size: minStorage, usage: storageUsage, label: "PT materials" });
    this.lightBuffer = this.device.createBuffer({ size: minStorage, usage: storageUsage, label: "PT lights" });

    this._nodeCount = 0;
    this._triangleCount = 0;
    this._lightCount = 0;
  }

  // -------------------------------------------------------------------------
  // Pipeline creation
  // -------------------------------------------------------------------------
  async _createPathTracePipeline() {
    const module = this.device.createShaderModule({ code: pathTraceShader, label: "PT path trace shader" });

    const bgl = this.device.createBindGroupLayout({
      label: "PT path trace BGL",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba32float" } },
      ],
    });

    this.pathTracePipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
      compute: { module, entryPoint: "main" },
      label: "PT path trace pipeline",
    });
    this._ptBGL = bgl;
  }

  async _createAccumulationPipeline() {
    const module = this.device.createShaderModule({ code: accumulationShader, label: "PT accumulation shader" });

    const bgl = this.device.createBindGroupLayout({
      label: "PT accum BGL",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba32float" } },
      ],
    });

    this.accumulationPipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
      compute: { module, entryPoint: "main" },
      label: "PT accumulation pipeline",
    });
    this._accumBGL = bgl;
  }

  async _createToneMappingPipeline() {
    const module = this.device.createShaderModule({ code: toneMappingShader, label: "PT tonemapping shader" });

    const bgl = this.device.createBindGroupLayout({
      label: "PT tone BGL",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba8unorm" } },
      ],
    });

    this.toneMappingPipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
      compute: { module, entryPoint: "main" },
      label: "PT tonemapping pipeline",
    });
    this._toneBGL = bgl;
  }

  // -------------------------------------------------------------------------
  // Scene data upload
  // -------------------------------------------------------------------------
  updateScene(sceneData) {
    const { bvhNodes, triangles, materials, lights } = sceneData;

    const reallocIfNeeded = (oldBuf, data, label) => {
      const byteLength = data.byteLength;
      if (byteLength === 0) return oldBuf;
      if (oldBuf.size < byteLength) {
        oldBuf.destroy();
        const newBuf = this.device.createBuffer({
          size: byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          label,
        });
        this.device.queue.writeBuffer(newBuf, 0, data);
        return newBuf;
      }
      this.device.queue.writeBuffer(oldBuf, 0, data);
      return oldBuf;
    };

    if (bvhNodes) {
      const buf = bvhNodes instanceof Float32Array ? bvhNodes : new Float32Array(bvhNodes);
      this.bvhBuffer = reallocIfNeeded(this.bvhBuffer, buf, "PT BVH");
      this._nodeCount = buf.byteLength / 32; // 8 floats per node
    }
    if (triangles) {
      const buf = triangles instanceof Float32Array ? triangles : new Float32Array(triangles);
      this.triangleBuffer = reallocIfNeeded(this.triangleBuffer, buf, "PT triangles");
      this._triangleCount = buf.byteLength / 96; // 24 floats per triangle
    }
    if (materials) {
      const buf = materials instanceof Float32Array ? materials : new Float32Array(materials);
      this.materialBuffer = reallocIfNeeded(this.materialBuffer, buf, "PT materials");
    }
    if (lights) {
      const buf = lights instanceof Float32Array ? lights : new Float32Array(lights);
      this.lightBuffer = reallocIfNeeded(this.lightBuffer, buf, "PT lights");
      this._lightCount = buf.byteLength / 48; // 12 floats per light
    }

    this.resetAccumulation();
  }

  // -------------------------------------------------------------------------
  // Render dispatch
  // -------------------------------------------------------------------------
  render(commandEncoder, camera) {
    if (this._disposed) return;
    if (this.frameCount >= this.options.maxAccumulatedFrames) return;

    const start = performance.now();
    const wgX = Math.ceil(this.width / 8);
    const wgY = Math.ceil(this.height / 8);

    // --- Upload path-trace uniforms -----------------------------------------
    this._writePathTraceUniforms(camera);

    // --- Pass 1: Path trace -------------------------------------------------
    const ptBindGroup = this.device.createBindGroup({
      layout: this._ptBGL,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.bvhBuffer } },
        { binding: 2, resource: { buffer: this.triangleBuffer } },
        { binding: 3, resource: { buffer: this.materialBuffer } },
        { binding: 4, resource: { buffer: this.lightBuffer } },
        { binding: 5, resource: this.radianceTexture.createView() },
      ],
    });

    const ptPass = commandEncoder.beginComputePass({ label: "PT path trace" });
    ptPass.setPipeline(this.pathTracePipeline);
    ptPass.setBindGroup(0, ptBindGroup);
    ptPass.dispatchWorkgroups(wgX, wgY, 1);
    ptPass.end();

    // --- Pass 2: Accumulate -------------------------------------------------
    const src = this._historyIndex;
    const dst = 1 - src;
    this._writeAccumUniforms();

    const accumBindGroup = this.device.createBindGroup({
      layout: this._accumBGL,
      entries: [
        { binding: 0, resource: { buffer: this.accumUniformBuffer } },
        { binding: 1, resource: this.radianceTexture.createView() },
        { binding: 2, resource: this.historyTextures[src].createView() },
        { binding: 3, resource: this.historyTextures[dst].createView() },
      ],
    });

    const accumPass = commandEncoder.beginComputePass({ label: "PT accumulate" });
    accumPass.setPipeline(this.accumulationPipeline);
    accumPass.setBindGroup(0, accumBindGroup);
    accumPass.dispatchWorkgroups(wgX, wgY, 1);
    accumPass.end();

    this._historyIndex = dst;

    // --- Pass 3: Tone-map ---------------------------------------------------
    this._writeToneUniforms();

    const toneBindGroup = this.device.createBindGroup({
      layout: this._toneBGL,
      entries: [
        { binding: 0, resource: { buffer: this.toneUniformBuffer } },
        { binding: 1, resource: this.historyTextures[dst].createView() },
        { binding: 2, resource: this.outputTexture.createView() },
      ],
    });

    const tonePass = commandEncoder.beginComputePass({ label: "PT tonemap" });
    tonePass.setPipeline(this.toneMappingPipeline);
    tonePass.setBindGroup(0, toneBindGroup);
    tonePass.dispatchWorkgroups(wgX, wgY, 1);
    tonePass.end();

    // --- Stats --------------------------------------------------------------
    this.frameCount++;
    this.stats.samplesAccumulated = this.frameCount * this.options.samplesPerPixel;
    this.stats.lastFrameTimeMs = performance.now() - start;
    const totalRays = this.width * this.height * this.options.samplesPerPixel * this.options.maxBounces;
    this.stats.raysPerSecond = Math.round(totalRays / (this.stats.lastFrameTimeMs / 1000 + 1e-9));
    this.stats.convergence = Math.min(this.frameCount / this.options.maxAccumulatedFrames, 1.0);
  }

  // -------------------------------------------------------------------------
  // Uniform writers
  // -------------------------------------------------------------------------
  _writePathTraceUniforms(camera) {
    // Uniforms struct layout (256 bytes, 64 × f32):
    // mat4 invProjection (0-63)
    // mat4 invView       (64-127)
    // vec3 cameraPos     (128-139)  + u32 frameCount (140-143)
    // u32  width,height,maxBounces,spp (144-159)
    // u32  enableMIS,enableNEE,enableRR,rrDepth (160-175)
    // u32  lightCount,nodeCount,triangleCount,pad (176-191)
    // padding to 256
    const data = new ArrayBuffer(256);
    const f = new Float32Array(data);
    const u = new Uint32Array(data);

    if (camera) {
      if (camera.invProjectionMatrix) f.set(camera.invProjectionMatrix, 0);
      if (camera.invViewMatrix) f.set(camera.invViewMatrix, 16);
      if (camera.position) { f[32] = camera.position.x ?? camera.position[0]; f[33] = camera.position.y ?? camera.position[1]; f[34] = camera.position.z ?? camera.position[2]; }
    }
    u[35] = this.frameCount;
    u[36] = this.width;
    u[37] = this.height;
    u[38] = this.options.maxBounces;
    u[39] = this.options.samplesPerPixel;
    u[40] = this.options.enableMIS ? 1 : 0;
    u[41] = this.options.enableNEE ? 1 : 0;
    u[42] = this.options.enableRussianRoulette ? 1 : 0;
    u[43] = this.options.russianRouletteDepth;
    u[44] = this._lightCount;
    u[45] = this._nodeCount;
    u[46] = this._triangleCount;
    u[47] = 0;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }

  _writeAccumUniforms() {
    const data = new Uint32Array([this.frameCount, this.width, this.height, 0]);
    this.device.queue.writeBuffer(this.accumUniformBuffer, 0, data);
  }

  _writeToneUniforms() {
    const data = new ArrayBuffer(16);
    new Float32Array(data, 0, 1)[0] = this.exposure;
    const u = new Uint32Array(data);
    u[1] = this.width;
    u[2] = this.height;
    u[3] = 0;
    this.device.queue.writeBuffer(this.toneUniformBuffer, 0, data);
  }

  // -------------------------------------------------------------------------
  // Public helpers
  // -------------------------------------------------------------------------
  resetAccumulation() {
    this.frameCount = 0;
    this._historyIndex = 0;
  }

  setExposure(value) {
    this.exposure = value;
  }

  setSamplesPerPixel(count) {
    this.options.samplesPerPixel = Math.max(1, Math.min(count, 64));
    this.resetAccumulation();
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this._destroyTextures();
    this._createTextures();
    this.resetAccumulation();
  }

  getOutputTexture() {
    return this.outputTexture;
  }

  getStats() {
    return { ...this.stats };
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------
  _destroyTextures() {
    if (this.radianceTexture) this.radianceTexture.destroy();
    for (const t of this.historyTextures) { if (t) t.destroy(); }
    if (this.outputTexture) this.outputTexture.destroy();
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._destroyTextures();
    for (const b of [this.uniformBuffer, this.accumUniformBuffer, this.toneUniformBuffer, this.bvhBuffer, this.triangleBuffer, this.materialBuffer, this.lightBuffer]) {
      if (b) b.destroy();
    }
    this.pathTracePipeline = null;
    this.accumulationPipeline = null;
    this.toneMappingPipeline = null;
    this.device = null;
    console.log("✓ PathTracer2026 disposed");
  }
}
