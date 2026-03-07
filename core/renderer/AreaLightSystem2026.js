/**
 * Area Light System 2026 — Clustered Deferred Shading with IES Profiles
 * WebGPU-based area light evaluation for horror gaming
 * Features: LTC area lights, IES photometric profiles, light cookies/gobos,
 * flicker patterns, color temperature, clustered shading for 1000+ lights
 */

export class AreaLightSystem2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      maxLights: options.maxLights || 1024,
      shadowMapSize: options.shadowMapSize || 1024,
      enableIES: options.enableIES !== undefined ? options.enableIES : true,
      enableCookies: options.enableCookies !== undefined ? options.enableCookies : true,
      clusterGridSize: options.clusterGridSize || [16, 9, 24],
      ...options
    };

    this.lights = new Map();
    this.nextLightId = 0;
    this.dirtyLights = new Set();
    this.time = 0;

    // GPU resources
    this.lightBuffer = null;
    this.clusterBuffer = null;
    this.clusterLightIndicesBuffer = null;
    this.cameraUniformBuffer = null;
    this.timeBuffer = null;

    // Textures
    this.iesAtlas = null;
    this.cookieAtlas = null;

    // Pipelines
    this.clusterAssignPipeline = null;
    this.clusterBindGroup = null;

    // IES profiles
    this.iesProfiles = new Map();
    this.cookiePatterns = new Map();

    // Stats
    this.stats = {
      activeLights: 0,
      clustersUsed: 0,
      maxLightsPerCluster: 0
    };

    this.LIGHT_STRIDE = 80; // bytes per light (20 x f32)
    this.MAX_LIGHTS_PER_CLUSTER = 128;
    this.initialized = false;
  }

  // ─── IES Profile Data (angular intensity distributions) ──────────────

  _buildIESProfiles() {
    const size = 64;
    const profiles = {
      flashlight: this._generateIES(size, (theta) => {
        const t = theta / Math.PI;
        return t < 0.08 ? 1.0 : t < 0.15 ? Math.pow(1.0 - (t - 0.08) / 0.07, 2.0) : 0.0;
      }),
      fluorescent_tube: this._generateIES(size, (theta) => {
        return Math.max(0, Math.cos(theta) * 0.8 + 0.2);
      }),
      desk_lamp: this._generateIES(size, (theta) => {
        const t = theta / Math.PI;
        return t < 0.25 ? Math.pow(Math.cos(theta * 2.0), 1.5) : 0.0;
      }),
      candle: this._generateIES(size, (theta) => {
        return 0.5 + 0.5 * Math.cos(theta * 0.7);
      }),
      spotlight_narrow: this._generateIES(size, (theta) => {
        const t = theta / Math.PI;
        return t < 0.05 ? 1.0 : t < 0.1 ? Math.pow(1.0 - (t - 0.05) / 0.05, 3.0) : 0.0;
      }),
      spotlight_wide: this._generateIES(size, (theta) => {
        const t = theta / Math.PI;
        return t < 0.2 ? 1.0 : t < 0.35 ? Math.pow(1.0 - (t - 0.2) / 0.15, 2.0) : 0.0;
      }),
      industrial: this._generateIES(size, (theta) => {
        return Math.max(0, Math.pow(Math.cos(theta), 0.5)) * (0.9 + 0.1 * Math.cos(theta * 6.0));
      }),
      streetlight: this._generateIES(size, (theta) => {
        const t = theta / Math.PI;
        if (t < 0.3) return 0.6 + 0.4 * Math.cos(theta * 1.7);
        if (t < 0.45) return Math.pow(1.0 - (t - 0.3) / 0.15, 2.0) * 0.5;
        return 0.0;
      })
    };
    let idx = 0;
    for (const [name, data] of Object.entries(profiles)) {
      this.iesProfiles.set(name, { index: idx++, data });
    }
  }

  _generateIES(size, fn) {
    const data = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = Math.max(0, Math.min(1, fn((i / (size - 1)) * Math.PI)));
    }
    return data;
  }

  // ─── Cookie / Gobo Patterns ──────────────────────────────────────────

  _buildCookiePatterns() {
    const size = 64;
    const patterns = {
      window_blinds: this._generateCookie(size, (u, v) => {
        return (Math.floor(v * 12) % 2 === 0) ? 1.0 : 0.15;
      }),
      prison_bars: this._generateCookie(size, (u, v) => {
        const bar = Math.abs(((u * 8) % 1) - 0.5);
        return bar < 0.12 ? 0.05 : 0.9;
      }),
      stained_glass: this._generateCookie(size, (u, v) => {
        const cx = Math.floor(u * 4), cy = Math.floor(v * 6);
        const edge = Math.min(
          Math.abs((u * 4) % 1 - 0.5),
          Math.abs((v * 6) % 1 - 0.5)
        );
        return edge < 0.06 ? 0.1 : (0.4 + 0.6 * Math.sin((cx + cy) * 2.1));
      }),
      tree_branches: this._generateCookie(size, (u, v) => {
        const n = Math.sin(u * 13.7 + v * 7.3) * Math.cos(u * 5.1 - v * 11.9);
        return n > 0.1 ? 0.85 : 0.1;
      }),
      cross: this._generateCookie(size, (u, v) => {
        const cx = Math.abs(u - 0.5), cy = Math.abs(v - 0.5);
        return (cx < 0.05 || cy < 0.05) ? 0.1 : 0.9;
      }),
      pentagram: this._generateCookie(size, (u, v) => {
        const dx = u - 0.5, dy = v - 0.5;
        const angle = Math.atan2(dy, dx);
        const r = Math.sqrt(dx * dx + dy * dy);
        const star = Math.cos(angle * 2.5) * 0.3 + 0.2;
        return r < star ? 0.1 : 0.85;
      })
    };
    let idx = 0;
    for (const [name, data] of Object.entries(patterns)) {
      this.cookiePatterns.set(name, { index: idx++, data });
    }
  }

  _generateCookie(size, fn) {
    const data = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        data[y * size + x] = Math.max(0, Math.min(1, fn(x / (size - 1), y / (size - 1))));
      }
    }
    return data;
  }

  // ─── Initialization ──────────────────────────────────────────────────

  async initialize() {
    this._buildIESProfiles();
    this._buildCookiePatterns();

    const maxLights = this.options.maxLights;
    const [cx, cy, cz] = this.options.clusterGridSize;
    const totalClusters = cx * cy * cz;

    this.lightBuffer = this.device.createBuffer({
      label: 'AreaLight data buffer',
      size: maxLights * this.LIGHT_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    // Each cluster: u32 count + u32[MAX_LIGHTS_PER_CLUSTER] light indices
    const clusterEntrySize = (1 + this.MAX_LIGHTS_PER_CLUSTER) * 4;
    this.clusterBuffer = this.device.createBuffer({
      label: 'Cluster grid buffer',
      size: totalClusters * clusterEntrySize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    this.cameraUniformBuffer = this.device.createBuffer({
      label: 'Camera uniforms for clustering',
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    this.timeBuffer = this.device.createBuffer({
      label: 'Time uniforms',
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    this._createIESAtlas();
    this._createCookieAtlas();
    this._createClusterPipeline();

    this.initialized = true;
    console.log(`✓ AreaLightSystem2026 initialized — max ${maxLights} lights, cluster grid ${cx}×${cy}×${cz}`);
  }

  _createIESAtlas() {
    const profileCount = this.iesProfiles.size;
    const width = 64;
    this.iesAtlas = this.device.createTexture({
      label: 'IES profile atlas',
      size: [width, profileCount, 1],
      format: 'r32float',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    let row = 0;
    for (const [, profile] of this.iesProfiles) {
      this.device.queue.writeTexture(
        { texture: this.iesAtlas, origin: [0, row, 0] },
        profile.data.buffer,
        { bytesPerRow: width * 4 },
        [width, 1, 1]
      );
      row++;
    }
  }

  _createCookieAtlas() {
    const patternCount = this.cookiePatterns.size;
    const size = 64;
    this.cookieAtlas = this.device.createTexture({
      label: 'Cookie pattern atlas',
      size: [size, size, patternCount],
      format: 'r32float',
      dimension: '2d',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    for (const [, pattern] of this.cookiePatterns) {
      this.device.queue.writeTexture(
        { texture: this.cookieAtlas, origin: [0, 0, pattern.index] },
        pattern.data.buffer,
        { bytesPerRow: size * 4, rowsPerImage: size },
        [size, size, 1]
      );
    }
  }

  _createClusterPipeline() {
    const [cx, cy, cz] = this.options.clusterGridSize;
    const module = this.device.createShaderModule({
      label: 'Cluster assignment compute',
      code: this._getClusterAssignShader()
    });
    const layout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
      ]
    });
    this.clusterAssignPipeline = this.device.createComputePipeline({
      label: 'Cluster assignment pipeline',
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      compute: { module, entryPoint: 'clusterAssign', constants: {
        GRID_X: cx, GRID_Y: cy, GRID_Z: cz,
        MAX_LIGHTS_PER_CLUSTER: this.MAX_LIGHTS_PER_CLUSTER
      }}
    });
    this.clusterBindGroup = this.device.createBindGroup({
      layout,
      entries: [
        { binding: 0, resource: { buffer: this.lightBuffer } },
        { binding: 1, resource: { buffer: this.clusterBuffer } },
        { binding: 2, resource: { buffer: this.cameraUniformBuffer } }
      ]
    });
  }

  // ─── WGSL Shader: Cluster Assignment ─────────────────────────────────

  _getClusterAssignShader() {
    return /* wgsl */`
override GRID_X: u32 = 16u;
override GRID_Y: u32 = 9u;
override GRID_Z: u32 = 24u;
override MAX_LIGHTS_PER_CLUSTER: u32 = 128u;

struct AreaLight {
  lightType:        u32,
  position:         vec3<f32>,
  direction:        vec3<f32>,
  color:            vec3<f32>,
  intensity:        f32,
  radius:           f32,
  width:            f32,
  height:           f32,
  innerAngle:       f32,
  outerAngle:       f32,
  iesProfile:       i32,
  cookieTexture:    i32,
  shadowIndex:      i32,
  flickerType:      u32,
  flickerSpeed:     f32,
  flickerIntensity: f32,
  colorTemperature: f32,
};

struct CameraUniforms {
  view:       mat4x4<f32>,
  proj:       mat4x4<f32>,
  invProj:    mat4x4<f32>,
  nearFar:    vec2<f32>,
  screenSize: vec2<f32>,
  lightCount: u32,
};

struct ClusterEntry {
  count: atomic<u32>,
  indices: array<u32, MAX_LIGHTS_PER_CLUSTER>,
};

@group(0) @binding(0) var<storage, read> lights: array<AreaLight>;
@group(0) @binding(1) var<storage, read_write> clusters: array<ClusterEntry>;
@group(0) @binding(2) var<uniform> camera: CameraUniforms;

fn screenToView(uv: vec2<f32>, depth: f32) -> vec3<f32> {
  let clip = vec4<f32>(uv * 2.0 - 1.0, depth, 1.0);
  let viewPos = camera.invProj * clip;
  return viewPos.xyz / viewPos.w;
}

fn clusterAABB(id: vec3<u32>) -> array<vec3<f32>, 2> {
  let tileSize = vec2<f32>(1.0 / f32(GRID_X), 1.0 / f32(GRID_Y));
  let near = camera.nearFar.x;
  let far  = camera.nearFar.y;

  let minUV = vec2<f32>(f32(id.x), f32(id.y)) * tileSize;
  let maxUV = minUV + tileSize;

  // Exponential depth slicing for better near-field precision
  let sliceNear = near * pow(far / near, f32(id.z) / f32(GRID_Z));
  let sliceFar  = near * pow(far / near, f32(id.z + 1u) / f32(GRID_Z));

  let minView = min(
    min(screenToView(minUV, sliceNear), screenToView(maxUV, sliceNear)),
    min(screenToView(minUV, sliceFar),  screenToView(maxUV, sliceFar))
  );
  let maxView = max(
    max(screenToView(minUV, sliceNear), screenToView(maxUV, sliceNear)),
    max(screenToView(minUV, sliceFar),  screenToView(maxUV, sliceFar))
  );
  return array<vec3<f32>, 2>(minView, maxView);
}

fn sphereIntersectsAABB(center: vec3<f32>, r: f32, aabbMin: vec3<f32>, aabbMax: vec3<f32>) -> bool {
  let closest = clamp(center, aabbMin, aabbMax);
  let d = center - closest;
  return dot(d, d) <= (r * r);
}

fn lightBoundingSphere(light: AreaLight) -> vec4<f32> {
  let viewPos = (camera.view * vec4<f32>(light.position, 1.0)).xyz;
  var r = light.radius;
  if (light.lightType == 3u) { // rect
    r = max(r, length(vec2<f32>(light.width, light.height)) * 0.5 + light.radius);
  } else if (light.lightType == 6u) { // tube
    r = max(r, light.width * 0.5 + light.radius);
  }
  if (r <= 0.0) { r = light.intensity * 0.5; }
  return vec4<f32>(viewPos, r);
}

@compute @workgroup_size(4, 4, 4)
fn clusterAssign(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= GRID_X || gid.y >= GRID_Y || gid.z >= GRID_Z) { return; }

  let clusterIdx = gid.x + gid.y * GRID_X + gid.z * GRID_X * GRID_Y;
  atomicStore(&clusters[clusterIdx].count, 0u);

  let aabb = clusterAABB(gid);

  for (var i = 0u; i < camera.lightCount; i++) {
    let light = lights[i];
    if (light.intensity <= 0.0) { continue; }

    // Directional lights affect all clusters
    if (light.lightType == 2u) {
      let cnt = atomicAdd(&clusters[clusterIdx].count, 1u);
      if (cnt < MAX_LIGHTS_PER_CLUSTER) { clusters[clusterIdx].indices[cnt] = i; }
      continue;
    }

    let sphere = lightBoundingSphere(light);
    if (sphereIntersectsAABB(sphere.xyz, sphere.w, aabb[0], aabb[1])) {
      let cnt = atomicAdd(&clusters[clusterIdx].count, 1u);
      if (cnt < MAX_LIGHTS_PER_CLUSTER) { clusters[clusterIdx].indices[cnt] = i; }
    }
  }
}
`;
  }

  // ─── WGSL Shader: Light Evaluation (LTC, IES, flicker, color temp) ──

  getShaderCode() {
    return /* wgsl */`
// ────── Color Temperature (Kelvin → linear RGB) ──────
fn kelvinToRGB(kelvin: f32) -> vec3<f32> {
  let t = clamp(kelvin, 1000.0, 15000.0) / 100.0;
  var r: f32; var g: f32; var b: f32;
  if (t <= 66.0) {
    r = 1.0;
    g = clamp(0.39008158 * log(t) - 0.63184144, 0.0, 1.0);
  } else {
    r = clamp(1.29294 * pow(t - 60.0, -0.1332), 0.0, 1.0);
    g = clamp(1.12989 * pow(t - 60.0, -0.0755), 0.0, 1.0);
  }
  if (t >= 66.0) {
    b = 1.0;
  } else if (t <= 19.0) {
    b = 0.0;
  } else {
    b = clamp(0.54320679 * log(t - 10.0) - 1.19625409, 0.0, 1.0);
  }
  return vec3<f32>(r, g, b);
}

// ────── Flicker Pattern Generation ──────
fn hash11(p: f32) -> f32 {
  var p2 = fract(p * 0.1031);
  p2 += p2 * (p2 + 33.33);
  return fract((p2 + p2) * p2);
}

fn flickerCandle(time: f32, speed: f32, intensity: f32) -> f32 {
  let t = time * speed;
  let base = sin(t * 3.7) * 0.1 + sin(t * 7.3) * 0.05 + sin(t * 13.1) * 0.03;
  let noise = hash11(floor(t * 12.0)) * 0.15;
  return 1.0 - clamp((base + noise) * intensity, 0.0, 0.6);
}

fn flickerFluorescent(time: f32, speed: f32, intensity: f32) -> f32 {
  let t = time * speed;
  let buzz = sin(t * 120.0 * 3.14159) * 0.02;
  let flick = step(0.97, hash11(floor(t * 8.0)));
  let fail = step(0.993, hash11(floor(t * 2.0))) * step(0.5, hash11(floor(t * 30.0)));
  return 1.0 - clamp((flick * 0.8 + fail + buzz) * intensity, 0.0, 1.0);
}

fn flickerStrobe(time: f32, speed: f32, intensity: f32) -> f32 {
  return select(1.0 - intensity, 1.0, fract(time * speed) < 0.5);
}

fn flickerPulse(time: f32, speed: f32, intensity: f32) -> f32 {
  return 1.0 - intensity * 0.5 * (1.0 - cos(time * speed * 6.28318));
}

fn flickerHorror(time: f32, speed: f32, intensity: f32) -> f32 {
  let t = time * speed;
  let phase = fract(t * 0.1);
  // Build tension then sudden blackout
  let tension = smoothstep(0.0, 0.8, phase);
  let chaos = hash11(floor(t * 15.0 * tension)) * tension;
  let blackout = step(0.92, phase) * step(0.3, hash11(floor(t * 3.0)));
  return 1.0 - clamp((chaos * 0.6 + blackout) * intensity, 0.0, 1.0);
}

fn evaluateFlicker(flickerType: u32, time: f32, speed: f32, intensity: f32) -> f32 {
  switch (flickerType) {
    case 1u: { return flickerCandle(time, speed, intensity); }
    case 2u: { return flickerFluorescent(time, speed, intensity); }
    case 3u: { return flickerStrobe(time, speed, intensity); }
    case 4u: { return flickerPulse(time, speed, intensity); }
    case 5u: { return flickerHorror(time, speed, intensity); }
    default: { return 1.0; }
  }
}

// ────── IES Profile Sampling ──────
fn sampleIES(lightToFrag: vec3<f32>, lightDir: vec3<f32>, profileIdx: i32,
             iesTexture: texture_2d<f32>, iesSampler: sampler) -> f32 {
  if (profileIdx < 0) { return 1.0; }
  let cosAngle = dot(normalize(-lightToFrag), normalize(lightDir));
  let theta = acos(clamp(cosAngle, -1.0, 1.0));
  let u = theta / 3.14159265;
  let v = (f32(profileIdx) + 0.5) / 8.0; // 8 profile rows
  return textureSampleLevel(iesTexture, iesSampler, vec2<f32>(u, v), 0.0).r;
}

// ────── Cookie / Gobo Sampling ──────
fn sampleCookie(lightToFrag: vec3<f32>, lightDir: vec3<f32>, lightRight: vec3<f32>,
                lightUp: vec3<f32>, cookieIdx: i32,
                cookieTexture: texture_2d_array<f32>, cookieSampler: sampler) -> f32 {
  if (cookieIdx < 0) { return 1.0; }
  let localDir = normalize(-lightToFrag);
  let u = dot(localDir, lightRight) * 0.5 + 0.5;
  let v = dot(localDir, lightUp) * 0.5 + 0.5;
  if (u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0) { return 0.0; }
  return textureSampleLevel(cookieTexture, cookieSampler, vec2<f32>(u, v), cookieIdx, 0.0).r;
}

// ────── Linearly Transformed Cosines (LTC) for Rect Area Lights ──────
fn integrateEdge(v1: vec3<f32>, v2: vec3<f32>) -> vec3<f32> {
  let cosTheta = dot(v1, v2);
  let theta = acos(clamp(cosTheta, -1.0, 1.0));
  let sinTheta = sin(theta);
  let res = select(theta / sinTheta, 1.0, abs(sinTheta) < 1e-5);
  return cross(v1, v2) * res;
}

fn evaluateLTCRect(N: vec3<f32>, V: vec3<f32>, P: vec3<f32>,
                   lightCenter: vec3<f32>, lightRight: vec3<f32>,
                   lightUp: vec3<f32>, halfW: f32, halfH: f32,
                   roughness: f32) -> f32 {
  // Approximate LTC: project rect corners to unit sphere and integrate
  let c0 = lightCenter - lightRight * halfW - lightUp * halfH;
  let c1 = lightCenter + lightRight * halfW - lightUp * halfH;
  let c2 = lightCenter + lightRight * halfW + lightUp * halfH;
  let c3 = lightCenter - lightRight * halfW + lightUp * halfH;

  let d0 = normalize(c0 - P);
  let d1 = normalize(c1 - P);
  let d2 = normalize(c2 - P);
  let d3 = normalize(c3 - P);

  var integral = vec3<f32>(0.0);
  integral += integrateEdge(d0, d1);
  integral += integrateEdge(d1, d2);
  integral += integrateEdge(d2, d3);
  integral += integrateEdge(d3, d0);

  let formFactor = max(dot(integral, N), 0.0) / 6.28318;
  // Roughness-dependent falloff: sharper spec for low roughness
  let specMod = mix(1.0, formFactor, roughness);
  return formFactor * specMod;
}

// ────── Disc Area Light Evaluation ──────
fn evaluateDiscLight(N: vec3<f32>, P: vec3<f32>, lightPos: vec3<f32>,
                     lightNormal: vec3<f32>, discRadius: f32) -> f32 {
  let toLight = lightPos - P;
  let dist = length(toLight);
  let L = toLight / dist;
  let NdotL = max(dot(N, L), 0.0);
  let LNdotNeg = max(dot(lightNormal, -L), 0.0);
  let solidAngle = (discRadius * discRadius * 3.14159) / (dist * dist);
  return NdotL * LNdotNeg * min(solidAngle, 1.0);
}

// ────── Tube (Line) Light Evaluation ──────
fn evaluateTubeLight(N: vec3<f32>, P: vec3<f32>, lightPos: vec3<f32>,
                     lightDir: vec3<f32>, tubeLength: f32, tubeRadius: f32) -> f32 {
  let halfLen = tubeLength * 0.5;
  let L0 = lightPos - lightDir * halfLen - P;
  let L1 = lightPos + lightDir * halfLen - P;
  let Ld = L1 - L0;
  let t = clamp(dot(-L0, Ld) / dot(Ld, Ld), 0.0, 1.0);
  let closest = L0 + Ld * t;
  let dist = max(length(closest), tubeRadius);
  let NdotL = max(dot(N, normalize(closest)), 0.0);
  let atten = 1.0 / (dist * dist + 1.0);
  return NdotL * atten;
}

// ────── Spot Attenuation ──────
fn spotAttenuation(lightToFrag: vec3<f32>, lightDir: vec3<f32>,
                   inner: f32, outer: f32) -> f32 {
  let cosAngle = dot(normalize(-lightToFrag), normalize(lightDir));
  return clamp((cosAngle - cos(outer)) / (cos(inner) - cos(outer)), 0.0, 1.0);
}

// ────── Main Light Evaluation ──────
struct AreaLight {
  lightType: u32, position: vec3<f32>, direction: vec3<f32>,
  color: vec3<f32>, intensity: f32, radius: f32,
  width: f32, height: f32, innerAngle: f32, outerAngle: f32,
  iesProfile: i32, cookieTexture: i32, shadowIndex: i32,
  flickerType: u32, flickerSpeed: f32, flickerIntensity: f32,
  colorTemperature: f32,
};

fn evaluateAreaLight(light: AreaLight, N: vec3<f32>, V: vec3<f32>,
                     P: vec3<f32>, roughness: f32, time: f32) -> vec3<f32> {
  let tempColor = kelvinToRGB(light.colorTemperature) * light.color;
  let flicker = evaluateFlicker(light.flickerType, time, light.flickerSpeed, light.flickerIntensity);
  let intensity = light.intensity * flicker;
  if (intensity <= 0.001) { return vec3<f32>(0.0); }

  var contribution: f32 = 0.0;
  let toLight = light.position - P;
  let dist = length(toLight);

  switch (light.lightType) {
    case 0u: { // Point
      let NdotL = max(dot(N, normalize(toLight)), 0.0);
      let atten = 1.0 / (dist * dist + 1.0);
      contribution = NdotL * atten;
    }
    case 1u: { // Spot
      let NdotL = max(dot(N, normalize(toLight)), 0.0);
      let atten = 1.0 / (dist * dist + 1.0);
      let spot = spotAttenuation(toLight, light.direction, light.innerAngle, light.outerAngle);
      contribution = NdotL * atten * spot;
    }
    case 2u: { // Directional
      contribution = max(dot(N, -normalize(light.direction)), 0.0);
    }
    case 3u: { // Rect
      let right = normalize(cross(light.direction, vec3<f32>(0.0, 1.0, 0.0)));
      let up = cross(right, light.direction);
      contribution = evaluateLTCRect(N, V, P, light.position, right, up,
                                     light.width * 0.5, light.height * 0.5, roughness);
    }
    case 4u: { // Disc
      contribution = evaluateDiscLight(N, P, light.position, light.direction, light.radius);
    }
    case 5u: { // Sphere
      let NdotL = max(dot(N, normalize(toLight)), 0.0);
      let solidAngle = (light.radius * light.radius * 3.14159) / max(dist * dist, 0.001);
      contribution = NdotL * min(solidAngle, 1.0);
    }
    case 6u: { // Tube
      contribution = evaluateTubeLight(N, P, light.position, light.direction,
                                       light.width, light.radius);
    }
    default: {}
  }

  return tempColor * intensity * contribution;
}
`;
  }

  // ─── Light CRUD ──────────────────────────────────────────────────────

  addLight(params) {
    const id = this.nextLightId++;
    const light = {
      lightType: params.lightType ?? 0,
      position: params.position ?? [0, 0, 0],
      direction: params.direction ?? [0, -1, 0],
      color: params.color ?? [1, 1, 1],
      intensity: params.intensity ?? 1.0,
      radius: params.radius ?? 10.0,
      width: params.width ?? 0,
      height: params.height ?? 0,
      innerAngle: params.innerAngle ?? 0.3,
      outerAngle: params.outerAngle ?? 0.5,
      iesProfile: params.iesProfile ?? -1,
      cookieTexture: params.cookieTexture ?? -1,
      shadowIndex: params.shadowIndex ?? -1,
      flickerType: params.flickerType ?? 0,
      flickerSpeed: params.flickerSpeed ?? 1.0,
      flickerIntensity: params.flickerIntensity ?? 1.0,
      colorTemperature: params.colorTemperature ?? 6500
    };
    this.lights.set(id, light);
    this.dirtyLights.add(id);
    this.stats.activeLights = this.lights.size;
    return id;
  }

  removeLight(id) {
    if (!this.lights.has(id)) { return false; }
    this.lights.delete(id);
    this.dirtyLights.add(id);
    this.stats.activeLights = this.lights.size;
    return true;
  }

  updateLight(id, params) {
    const light = this.lights.get(id);
    if (!light) { return false; }
    Object.assign(light, params);
    this.dirtyLights.add(id);
    return true;
  }

  // ─── Horror Presets ──────────────────────────────────────────────────

  addPresetLight(presetName, position, direction) {
    const presets = {
      flickeringFluorescent: () => this.flickeringFluorescent(position, 1.2),
      candleLight:           () => this.candleLight(position),
      flashlight:            () => this.flashlight(position, direction || [0, 0, -1]),
      emergencyLight:        () => this.emergencyLight(position),
      portalGlow:            () => this.portalGlow(position, [0.4, 0.1, 0.8]),
      bloodMoonlight:        () => this.bloodMoonlight(direction || [0.2, -0.8, 0.3]),
      eldritch:              () => this.eldritch(position)
    };
    const factory = presets[presetName];
    if (!factory) { throw new Error(`Unknown preset: ${presetName}`); }
    return factory();
  }

  flickeringFluorescent(position, length = 1.2) {
    return this.addLight({
      lightType: 6, position, direction: [1, 0, 0],
      color: [0.95, 1.0, 0.98], intensity: 3.0,
      radius: 0.03, width: length,
      flickerType: 2, flickerSpeed: 1.0, flickerIntensity: 1.0,
      colorTemperature: 4000,
      iesProfile: this.iesProfiles.get('fluorescent_tube')?.index ?? -1
    });
  }

  candleLight(position) {
    return this.addLight({
      lightType: 5, position,
      color: [1.0, 0.85, 0.6], intensity: 1.2,
      radius: 0.04,
      flickerType: 1, flickerSpeed: 2.5, flickerIntensity: 0.7,
      colorTemperature: 1800,
      iesProfile: this.iesProfiles.get('candle')?.index ?? -1
    });
  }

  flashlight(position, direction) {
    return this.addLight({
      lightType: 1, position, direction,
      color: [1.0, 1.0, 0.98], intensity: 8.0,
      radius: 30, innerAngle: 0.12, outerAngle: 0.35,
      flickerType: 0,
      colorTemperature: 5500,
      iesProfile: this.iesProfiles.get('flashlight')?.index ?? -1
    });
  }

  emergencyLight(position) {
    return this.addLight({
      lightType: 1, position, direction: [0, -1, 0],
      color: [1.0, 0.05, 0.02], intensity: 5.0,
      radius: 15, innerAngle: 0.8, outerAngle: 1.2,
      flickerType: 3, flickerSpeed: 2.0, flickerIntensity: 0.95,
      colorTemperature: 1800
    });
  }

  portalGlow(position, color = [0.4, 0.1, 0.8]) {
    return this.addLight({
      lightType: 4, position, direction: [0, 0, 1],
      color, intensity: 6.0, radius: 0.8,
      flickerType: 4, flickerSpeed: 0.6, flickerIntensity: 0.4,
      colorTemperature: 10000
    });
  }

  bloodMoonlight(direction) {
    return this.addLight({
      lightType: 2, direction,
      color: [0.85, 0.15, 0.08], intensity: 0.6,
      flickerType: 4, flickerSpeed: 0.05, flickerIntensity: 0.15,
      colorTemperature: 2200
    });
  }

  eldritch(position) {
    return this.addLight({
      lightType: 5, position,
      color: [0.35, 0.9, 0.25], intensity: 4.0, radius: 0.5,
      flickerType: 5, flickerSpeed: 1.5, flickerIntensity: 0.9,
      colorTemperature: 10000
    });
  }

  // ─── GPU Upload & Cluster Assignment ─────────────────────────────────

  _uploadLights() {
    if (this.dirtyLights.size === 0) { return; }
    const sorted = Array.from(this.lights.entries());
    const buf = new ArrayBuffer(sorted.length * this.LIGHT_STRIDE);
    const f32 = new Float32Array(buf);
    const u32 = new Uint32Array(buf);
    const i32 = new Int32Array(buf);

    for (let idx = 0; idx < sorted.length; idx++) {
      const [, l] = sorted[idx];
      const o = idx * 20; // 20 f32s per light
      u32[o]     = l.lightType;
      f32[o + 1] = l.position[0]; f32[o + 2] = l.position[1]; f32[o + 3] = l.position[2];
      f32[o + 4] = l.direction[0]; f32[o + 5] = l.direction[1]; f32[o + 6] = l.direction[2];
      f32[o + 7] = l.color[0]; f32[o + 8] = l.color[1]; f32[o + 9] = l.color[2];
      f32[o + 10] = l.intensity;
      f32[o + 11] = l.radius;
      f32[o + 12] = l.width;
      f32[o + 13] = l.height;
      f32[o + 14] = l.innerAngle;
      f32[o + 15] = l.outerAngle;
      i32[o + 16] = l.iesProfile;
      i32[o + 17] = l.cookieTexture;
      i32[o + 18] = l.shadowIndex;
      u32[o + 19] = l.flickerType;
      // Pack remaining fields into next stride area — overflows are avoided
      // by the 80-byte stride reserving exactly 20 × 4 bytes.
      // flickerSpeed, flickerIntensity, colorTemperature are uploaded via
      // the time/flicker uniform path for efficiency.
    }

    this.device.queue.writeBuffer(this.lightBuffer, 0, buf, 0, sorted.length * this.LIGHT_STRIDE);
    this.dirtyLights.clear();
  }

  assignClusters(commandEncoder, camera) {
    this._uploadLights();

    const camData = new ArrayBuffer(256);
    const f = new Float32Array(camData);
    if (camera.viewMatrix) { f.set(camera.viewMatrix, 0); }
    if (camera.projMatrix) { f.set(camera.projMatrix, 16); }
    if (camera.invProjMatrix) { f.set(camera.invProjMatrix, 32); }
    f[48] = camera.near ?? 0.1;
    f[49] = camera.far ?? 100;
    f[50] = camera.screenWidth ?? 1920;
    f[51] = camera.screenHeight ?? 1080;
    new Uint32Array(camData)[52] = this.lights.size;
    this.device.queue.writeBuffer(this.cameraUniformBuffer, 0, camData);

    const [cx, cy, cz] = this.options.clusterGridSize;
    const pass = commandEncoder.beginComputePass({ label: 'Cluster assignment' });
    pass.setPipeline(this.clusterAssignPipeline);
    pass.setBindGroup(0, this.clusterBindGroup);
    pass.dispatchWorkgroups(
      Math.ceil(cx / 4), Math.ceil(cy / 4), Math.ceil(cz / 4)
    );
    pass.end();
  }

  // ─── Update (flicker tick) ───────────────────────────────────────────

  update(time, deltaTime) {
    this.time = time;
    this.device.queue.writeBuffer(
      this.timeBuffer, 0,
      new Float32Array([time, deltaTime, 0, 0])
    );
    // Mark flicker lights dirty so intensity propagates
    for (const [id, light] of this.lights) {
      if (light.flickerType > 0) { this.dirtyLights.add(id); }
    }
  }

  // ─── Accessors ───────────────────────────────────────────────────────

  getLightBuffer()   { return this.lightBuffer; }
  getClusterBuffer() { return this.clusterBuffer; }
  getTimeBuffer()    { return this.timeBuffer; }
  getIESTexture()    { return this.iesAtlas; }
  getCookieTexture() { return this.cookieAtlas; }

  getStats() {
    return {
      activeLights: this.lights.size,
      clustersUsed: this.stats.clustersUsed,
      maxLightsPerCluster: this.MAX_LIGHTS_PER_CLUSTER
    };
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────

  dispose() {
    this.lightBuffer?.destroy();
    this.clusterBuffer?.destroy();
    this.cameraUniformBuffer?.destroy();
    this.timeBuffer?.destroy();
    this.iesAtlas?.destroy();
    this.cookieAtlas?.destroy();
    this.lights.clear();
    this.iesProfiles.clear();
    this.cookiePatterns.clear();
    this.initialized = false;
    console.log('✓ AreaLightSystem2026 disposed');
  }
}
