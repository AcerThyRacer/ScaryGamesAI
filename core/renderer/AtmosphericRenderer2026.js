// ─── WGSL Shaders ─────────────────────────────────────────────────────────────

const SKY_COMPUTE_WGSL = /* wgsl */`
struct SkyUniforms {
  sunDir: vec3<f32>,
  sunIntensity: f32,
  moonDir: vec3<f32>,
  moonPhase: f32,
  rayleighCoeff: vec3<f32>,
  mieCoeff: f32,
  mieDir: f32,
  ozoneCoeff: vec3<f32>,
  bloodMoonFactor: f32,
  eclipseFactor: f32,
  voidFactor: f32,
  auroraFactor: f32,
  time: f32,
  starBrightness: f32,
  _pad: vec2<f32>,
};

@group(0) @binding(0) var<uniform> u: SkyUniforms;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;

const PI: f32 = 3.141592653;
const EARTH_R: f32 = 6371e3;
const ATMO_R: f32 = 6471e3;
const NUM_STEPS: i32 = 16;
const NUM_LIGHT_STEPS: i32 = 8;

fn raySphereIntersect(o: vec3<f32>, d: vec3<f32>, r: f32) -> f32 {
  let b = dot(o, d);
  let c = dot(o, o) - r * r;
  let disc = b * b - c;
  if (disc < 0.0) { return -1.0; }
  return -b + sqrt(disc);
}

fn rayleighPhase(cosTheta: f32) -> f32 {
  return 0.75 * (1.0 + cosTheta * cosTheta);
}

fn miePhase(cosTheta: f32, g: f32) -> f32 {
  let g2 = g * g;
  let num = 3.0 * (1.0 - g2) * (1.0 + cosTheta * cosTheta);
  let den = 8.0 * PI * (2.0 + g2) * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
  return num / den;
}

fn hash(p: vec3<f32>) -> f32 {
  var q = fract(p * 0.1031);
  q += dot(q, q.zyx + 31.32);
  return fract((q.x + q.y) * q.z);
}

fn starField(dir: vec3<f32>, time: f32) -> f32 {
  let cell = floor(dir * 200.0);
  let h = hash(cell);
  if (h > 0.985) {
    let twinkle = 0.7 + 0.3 * sin(time * (2.0 + h * 5.0) + h * 100.0);
    return smoothstep(0.985, 1.0, h) * twinkle;
  }
  return 0.0;
}

fn auroraLayer(dir: vec3<f32>, time: f32) -> vec3<f32> {
  let y = max(dir.y, 0.0);
  let band = sin(dir.x * 8.0 + time * 0.3) * 0.5 + 0.5;
  let wave = sin(dir.x * 3.0 + dir.z * 2.0 + time * 0.5) * 0.5 + 0.5;
  let mask = smoothstep(0.15, 0.5, y) * smoothstep(0.8, 0.5, y);
  let green = vec3<f32>(0.1, 0.9, 0.3) * band;
  let purple = vec3<f32>(0.5, 0.1, 0.8) * wave;
  return (green + purple) * mask * 0.6;
}

@compute @workgroup_size(8, 8)
fn skyMain(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(outputTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let uv = vec2<f32>(f32(gid.x) + 0.5, f32(gid.y) + 0.5) / vec2<f32>(f32(dims.x), f32(dims.y));
  let theta = uv.x * 2.0 * PI;
  let phi = uv.y * PI;
  let dir = vec3<f32>(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));

  let origin = vec3<f32>(0.0, EARTH_R + 2.0, 0.0);
  let tMax = raySphereIntersect(origin, dir, ATMO_R);
  if (tMax < 0.0) {
    textureStore(outputTex, vec2<i32>(gid.xy), vec4<f32>(0.0, 0.0, 0.0, 1.0));
    return;
  }

  let stepSize = tMax / f32(NUM_STEPS);
  let cosTheta = dot(dir, u.sunDir);
  let rPhase = rayleighPhase(cosTheta);

  let mieG = mix(u.mieDir, 0.999, u.bloodMoonFactor * 0.3);
  let mPhase = miePhase(cosTheta, mieG);

  var rayleighSum = vec3<f32>(0.0);
  var mieSum = vec3<f32>(0.0);
  var optDepthR = vec3<f32>(0.0);
  var optDepthM = f32(0.0);

  for (var i = 0; i < NUM_STEPS; i++) {
    let t = (f32(i) + 0.5) * stepSize;
    let pos = origin + dir * t;
    let h = length(pos) - EARTH_R;
    let densR = exp(-h / 8500.0);
    let densM = exp(-h / 1200.0);

    optDepthR += u.rayleighCoeff * densR * stepSize;
    optDepthM += u.mieCoeff * densM * stepSize;

    let tSun = raySphereIntersect(pos, u.sunDir, ATMO_R);
    let sunStep = tSun / f32(NUM_LIGHT_STEPS);
    var sunOptR = vec3<f32>(0.0);
    var sunOptM = f32(0.0);
    for (var j = 0; j < NUM_LIGHT_STEPS; j++) {
      let ts = (f32(j) + 0.5) * sunStep;
      let sp = pos + u.sunDir * ts;
      let sh = length(sp) - EARTH_R;
      sunOptR += u.rayleighCoeff * exp(-sh / 8500.0) * sunStep;
      sunOptM += u.mieCoeff * exp(-sh / 1200.0) * sunStep;
    }

    let attn = exp(-(sunOptR + optDepthR + vec3<f32>((sunOptM + optDepthM) * 1.1))
                    - u.ozoneCoeff * (densR * stepSize));
    rayleighSum += densR * attn * stepSize;
    mieSum += vec3<f32>(densM * stepSize) * attn;
  }

  let bloodShift = mix(vec3<f32>(1.0), vec3<f32>(2.5, 0.3, 0.1), u.bloodMoonFactor);
  var sky = (rayleighSum * u.rayleighCoeff * rPhase + mieSum * u.mieCoeff * mPhase) * u.sunIntensity * bloodShift;

  // Sun disc with limb darkening
  let sunAngle = acos(clamp(cosTheta, -1.0, 1.0));
  let sunRadius = 0.00935;
  let eclipseMask = smoothstep(sunRadius * 0.2, sunRadius * 1.0, sunAngle / max(u.eclipseFactor * 2.0, 0.001));
  if (sunAngle < sunRadius * 1.5 && u.eclipseFactor < 0.5) {
    let limb = 1.0 - pow(sunAngle / sunRadius, 2.0);
    sky += vec3<f32>(1.0, 0.95, 0.8) * max(limb, 0.0) * u.sunIntensity * 50.0;
  }
  // Eclipse corona
  if (u.eclipseFactor > 0.1) {
    let corona = exp(-sunAngle / (sunRadius * 4.0)) * u.eclipseFactor;
    sky += vec3<f32>(1.0, 0.85, 0.7) * corona * 3.0 * eclipseMask;
  }

  // Moon with phase
  let moonAngle = acos(clamp(dot(dir, u.moonDir), -1.0, 1.0));
  if (moonAngle < 0.018) {
    let moonLight = smoothstep(0.018, 0.008, moonAngle);
    let phaseMask = smoothstep(-0.01, 0.01, dot(normalize(cross(u.moonDir, vec3<f32>(0.0, 1.0, 0.0))),
                   dir - u.moonDir * dot(dir, u.moonDir)) * sign(u.moonPhase - 0.5));
    let moonColor = mix(vec3<f32>(0.7, 0.75, 0.85), vec3<f32>(1.0, 0.15, 0.05), u.bloodMoonFactor);
    sky += moonColor * moonLight * phaseMask * 2.0;
  }

  // Stars
  let nightFade = smoothstep(0.0, -0.15, u.sunDir.y);
  let stars = starField(dir, u.time) * nightFade * u.starBrightness * (1.0 - u.voidFactor);
  sky += vec3<f32>(stars);

  // Aurora
  if (u.auroraFactor > 0.01) {
    sky += auroraLayer(dir, u.time) * u.auroraFactor * nightFade;
  }

  // Void sky suppression
  sky *= (1.0 - u.voidFactor * 0.95);

  textureStore(outputTex, vec2<i32>(gid.xy), vec4<f32>(sky, 1.0));
}
`;

const CLOUD_COMPUTE_WGSL = /* wgsl */`
struct CloudUniforms {
  invViewProj: mat4x4<f32>,
  cameraPos: vec3<f32>,
  time: f32,
  sunDir: vec3<f32>,
  cloudBase: f32,
  cloudTop: f32,
  coverage: f32,
  density: f32,
  stormFactor: f32,
  windDir: vec2<f32>,
  windSpeed: f32,
  lightningFlash: f32,
  cloudType: f32,
  _pad: vec3<f32>,
};

@group(0) @binding(0) var<uniform> u: CloudUniforms;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var depthTex: texture_2d<f32>;

const PI: f32 = 3.141592653;
const LIGHT_STEPS: i32 = 6;
const MARCH_STEPS: i32 = 48;

fn hash3(p: vec3<f32>) -> f32 {
  var q = fract(p * vec3<f32>(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yxz + 33.33);
  return fract((q.x + q.y) * q.z);
}

fn noise3d(p: vec3<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), u.x),
        mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), u.x), u.y),
    mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), u.x),
        mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), u.x), u.y),
    u.z);
}

fn fbm(p: vec3<f32>) -> f32 {
  var val = 0.0;
  var amp = 0.5;
  var pos = p;
  for (var i = 0; i < 5; i++) {
    val += amp * noise3d(pos);
    pos *= 2.01;
    amp *= 0.5;
  }
  return val;
}

fn worleyNoise(p: vec3<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  var minDist = 1.0;
  for (var x = -1; x <= 1; x++) {
    for (var y = -1; y <= 1; y++) {
      for (var z = -1; z <= 1; z++) {
        let neighbor = vec3<f32>(f32(x), f32(y), f32(z));
        let point = neighbor + vec3<f32>(hash3(i + neighbor)) - f;
        minDist = min(minDist, dot(point, point));
      }
    }
  }
  return sqrt(minDist);
}

fn cloudDensity(p: vec3<f32>) -> f32 {
  let windOffset = vec3<f32>(u.windDir.x, 0.0, u.windDir.y) * u.windSpeed * u.time * 0.01;
  let sp = p + windOffset;
  let heightFrac = clamp((p.y - u.cloudBase) / (u.cloudTop - u.cloudBase), 0.0, 1.0);

  // Perlin-Worley blend
  let perlin = fbm(sp * 0.0003);
  let worley = 1.0 - worleyNoise(sp * 0.0006);
  let base = mix(perlin, worley, 0.3 + u.stormFactor * 0.3);

  // Height-dependent shape: cumulus vs stratus blend
  let cumulusShape = smoothstep(0.0, 0.2, heightFrac) * smoothstep(1.0, 0.6, heightFrac);
  let stratusShape = smoothstep(0.0, 0.05, heightFrac) * smoothstep(0.4, 0.2, heightFrac);
  let shape = mix(cumulusShape, stratusShape, u.cloudType);

  let detail = fbm(sp * 0.002) * 0.3;
  let d = (base + detail) * shape - (1.0 - u.coverage);

  // Storm turbulence
  let turbulence = fbm(sp * 0.001 + vec3<f32>(u.time * 0.02)) * u.stormFactor * 0.4;
  return max(d + turbulence, 0.0) * u.density;
}

fn lightMarch(p: vec3<f32>) -> f32 {
  let stepSize = (u.cloudTop - p.y) / f32(LIGHT_STEPS);
  var opticalDepth = 0.0;
  for (var i = 0; i < LIGHT_STEPS; i++) {
    let sp = p + u.sunDir * stepSize * f32(i + 1);
    opticalDepth += cloudDensity(sp) * stepSize;
  }
  return exp(-opticalDepth * 0.04);
}

@compute @workgroup_size(8, 8)
fn cloudMain(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(outputTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let uv = (vec2<f32>(f32(gid.x), f32(gid.y)) + 0.5) / vec2<f32>(f32(dims.x), f32(dims.y));
  let ndc = vec4<f32>(uv * 2.0 - 1.0, 1.0, 1.0);
  let worldPos4 = u.invViewProj * ndc;
  let rayDir = normalize(worldPos4.xyz / worldPos4.w - u.cameraPos);

  if (rayDir.y < 0.01) {
    textureStore(outputTex, vec2<i32>(gid.xy), vec4<f32>(0.0));
    return;
  }

  let tBase = (u.cloudBase - u.cameraPos.y) / rayDir.y;
  let tTop = (u.cloudTop - u.cameraPos.y) / rayDir.y;
  let tMin = max(min(tBase, tTop), 0.0);
  let tMax = min(max(tBase, tTop), 50000.0);
  let stepSize = (tMax - tMin) / f32(MARCH_STEPS);

  var transmittance = 1.0;
  var luminance = vec3<f32>(0.0);
  let sunColor = mix(vec3<f32>(1.0, 0.95, 0.85), vec3<f32>(0.15, 0.15, 0.2), u.stormFactor);
  let ambientColor = mix(vec3<f32>(0.4, 0.5, 0.7), vec3<f32>(0.08, 0.08, 0.1), u.stormFactor);

  for (var i = 0; i < MARCH_STEPS; i++) {
    if (transmittance < 0.01) { break; }
    let t = tMin + (f32(i) + 0.5) * stepSize;
    let pos = u.cameraPos + rayDir * t;
    let d = cloudDensity(pos);
    if (d > 0.001) {
      let lightT = lightMarch(pos);
      // Silver lining: enhanced forward scattering at cloud edges
      let cosAngle = dot(rayDir, u.sunDir);
      let silverLining = pow(max(cosAngle, 0.0), 8.0) * lightT * 2.0;
      let scattered = sunColor * (lightT + silverLining) + ambientColor;
      let flashBoost = vec3<f32>(u.lightningFlash * 3.0);
      let extinction = exp(-d * stepSize * 0.04);
      luminance += (scattered + flashBoost) * d * transmittance * stepSize * 0.04;
      transmittance *= extinction;
    }
  }

  textureStore(outputTex, vec2<i32>(gid.xy), vec4<f32>(luminance, 1.0 - transmittance));
}
`;

const WEATHER_PARTICLE_WGSL = /* wgsl */`
struct Particle {
  pos: vec3<f32>,
  life: f32,
  vel: vec3<f32>,
  size: f32,
};

struct WeatherUniforms {
  wind: vec3<f32>,
  deltaTime: f32,
  gravity: vec3<f32>,
  particleType: f32,
  emitMin: vec3<f32>,
  emitRange: f32,
  emitMax: vec3<f32>,
  time: f32,
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> u: WeatherUniforms;

fn pcgHash(input: u32) -> u32 {
  var state = input * 747796405u + 2891336453u;
  var word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn randFloat(seed: u32) -> f32 {
  return f32(pcgHash(seed)) / 4294967295.0;
}

@compute @workgroup_size(256)
fn weatherMain(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx >= arrayLength(&particles)) { return; }

  var p = particles[idx];
  p.life -= u.deltaTime;

  if (p.life <= 0.0) {
    let s1 = idx * 3u + u32(u.time * 1000.0);
    p.pos = u.emitMin + vec3<f32>(
      randFloat(s1) * (u.emitMax.x - u.emitMin.x),
      randFloat(s1 + 1u) * (u.emitMax.y - u.emitMin.y),
      randFloat(s1 + 2u) * (u.emitMax.z - u.emitMin.z)
    );
    p.life = 2.0 + randFloat(s1 + 3u) * 3.0;

    if (u.particleType < 0.5) {
      // Rain: fast downward
      p.vel = vec3<f32>(0.0, -8.0 - randFloat(s1 + 4u) * 4.0, 0.0);
      p.size = 0.01 + randFloat(s1 + 5u) * 0.015;
    } else if (u.particleType < 1.5) {
      // Snow: slow, drifting
      p.vel = vec3<f32>(
        (randFloat(s1 + 4u) - 0.5) * 0.5,
        -0.5 - randFloat(s1 + 5u) * 0.8,
        (randFloat(s1 + 6u) - 0.5) * 0.5
      );
      p.size = 0.02 + randFloat(s1 + 7u) * 0.03;
    } else {
      // Ash: very slow, upward drift possible
      p.vel = vec3<f32>(
        (randFloat(s1 + 4u) - 0.5) * 0.3,
        -0.2 + randFloat(s1 + 5u) * 0.3,
        (randFloat(s1 + 6u) - 0.5) * 0.3
      );
      p.size = 0.008 + randFloat(s1 + 7u) * 0.02;
    }
  }

  p.vel += u.gravity * u.deltaTime;
  p.vel += u.wind * u.deltaTime;
  // Snow/ash: sinusoidal drift
  if (u.particleType >= 0.5) {
    p.vel.x += sin(u.time * 2.0 + f32(idx) * 0.1) * 0.02;
    p.vel.z += cos(u.time * 1.5 + f32(idx) * 0.15) * 0.02;
  }
  p.pos += p.vel * u.deltaTime;

  particles[idx] = p;
}
`;

const LIGHTNING_COMPUTE_WGSL = /* wgsl */`
struct BoltSegment {
  start: vec3<f32>,
  brightness: f32,
  end: vec3<f32>,
  branch: f32,
};

struct LightningUniforms {
  origin: vec3<f32>,
  seed: f32,
  target: vec3<f32>,
  branchProb: f32,
  displacement: f32,
  segments: f32,
  _pad: vec2<f32>,
};

@group(0) @binding(0) var<storage, read_write> bolts: array<BoltSegment>;
@group(0) @binding(1) var<uniform> u: LightningUniforms;

fn hashU(n: u32) -> u32 {
  var x = n;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = (x >> 16u) ^ x;
  return x;
}

fn randF(seed: u32) -> f32 {
  return f32(hashU(seed)) / 4294967295.0;
}

@compute @workgroup_size(64)
fn lightningMain(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  let total = u32(u.segments);
  if (idx >= total) { return; }

  let t0 = f32(idx) / f32(total);
  let t1 = f32(idx + 1u) / f32(total);
  let seedBase = u32(u.seed * 10000.0) + idx * 7u;

  var mid = mix(u.origin, u.target, t0);
  var next = mix(u.origin, u.target, t1);

  let scale = u.displacement * sin(t0 * 3.14159);
  mid.x += (randF(seedBase) - 0.5) * scale;
  mid.z += (randF(seedBase + 1u) - 0.5) * scale;
  next.x += (randF(seedBase + 2u) - 0.5) * scale;
  next.z += (randF(seedBase + 3u) - 0.5) * scale;

  var seg: BoltSegment;
  seg.start = mid;
  seg.end = next;
  seg.brightness = 1.0 - t0 * 0.5;
  seg.branch = select(0.0, 1.0, randF(seedBase + 4u) < u.branchProb);
  bolts[idx] = seg;
}
`;

// ─── Horror Weather Presets ───────────────────────────────────────────────────

const WEATHER_PRESETS = {
  clearNight: {
    timeOverride: 0.5, cloudCoverage: 0.1, fogDensity: 0.0,
    rain: 0, snow: 0, windSpeed: 0.3, lightning: false,
    bloodMoon: 0, eclipse: 0, voidSky: 0, aurora: 0,
    stormFactor: 0, cloudType: 0, ashfall: 0,
    fogColor: [0.02, 0.02, 0.05], ambientMult: 0.15,
  },
  bloodMoon: {
    timeOverride: 0.5, cloudCoverage: 0.3, fogDensity: 0.4,
    rain: 0, snow: 0, windSpeed: 0.5, lightning: false,
    bloodMoon: 1.0, eclipse: 0, voidSky: 0, aurora: 0,
    stormFactor: 0, cloudType: 0, ashfall: 0,
    fogColor: [0.3, 0.02, 0.02], ambientMult: 0.2,
  },
  thunderstorm: {
    timeOverride: null, cloudCoverage: 0.95, fogDensity: 0.15,
    rain: 1.0, snow: 0, windSpeed: 4.0, lightning: true,
    bloodMoon: 0, eclipse: 0, voidSky: 0, aurora: 0,
    stormFactor: 1.0, cloudType: 0.2, ashfall: 0,
    fogColor: [0.05, 0.05, 0.07], ambientMult: 0.1,
  },
  silentFog: {
    timeOverride: null, cloudCoverage: 1.0, fogDensity: 1.0,
    rain: 0, snow: 0, windSpeed: 0.1, lightning: false,
    bloodMoon: 0, eclipse: 0, voidSky: 0, aurora: 0,
    stormFactor: 0, cloudType: 1.0, ashfall: 0,
    fogColor: [0.3, 0.3, 0.32], ambientMult: 0.25,
  },
  eclipse: {
    timeOverride: 12.0, cloudCoverage: 0.1, fogDensity: 0.05,
    rain: 0, snow: 0, windSpeed: 0.2, lightning: false,
    bloodMoon: 0, eclipse: 1.0, voidSky: 0, aurora: 0,
    stormFactor: 0, cloudType: 0, ashfall: 0,
    fogColor: [0.05, 0.04, 0.06], ambientMult: 0.08,
  },
  ashfall: {
    timeOverride: null, cloudCoverage: 0.8, fogDensity: 0.35,
    rain: 0, snow: 0, windSpeed: 1.0, lightning: false,
    bloodMoon: 0, eclipse: 0, voidSky: 0, aurora: 0,
    stormFactor: 0.3, cloudType: 0.7, ashfall: 1.0,
    fogColor: [0.25, 0.18, 0.1], ambientMult: 0.3,
  },
  voidSky: {
    timeOverride: 0.0, cloudCoverage: 0.0, fogDensity: 0.2,
    rain: 0, snow: 0, windSpeed: 0.0, lightning: false,
    bloodMoon: 0, eclipse: 0, voidSky: 1.0, aurora: 0,
    stormFactor: 0, cloudType: 0, ashfall: 0,
    fogColor: [0.0, 0.0, 0.0], ambientMult: 0.02,
  },
  aurora: {
    timeOverride: 2.0, cloudCoverage: 0.15, fogDensity: 0.05,
    rain: 0, snow: 0.3, windSpeed: 0.8, lightning: false,
    bloodMoon: 0, eclipse: 0, voidSky: 0, aurora: 1.0,
    stormFactor: 0, cloudType: 0, ashfall: 0,
    fogColor: [0.02, 0.05, 0.04], ambientMult: 0.18,
  },
  perpetualDusk: {
    timeOverride: 19.2, cloudCoverage: 0.35, fogDensity: 0.1,
    rain: 0, snow: 0, windSpeed: 0.5, lightning: false,
    bloodMoon: 0, eclipse: 0, voidSky: 0, aurora: 0,
    stormFactor: 0, cloudType: 0.3, ashfall: 0,
    fogColor: [0.2, 0.1, 0.05], ambientMult: 0.35,
  },
};

// ─── Main Class ───────────────────────────────────────────────────────────────

export class AtmosphericRenderer2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      width: 1920,
      height: 1080,
      skyResolution: 512,
      enableClouds: true,
      enableWeather: true,
      enableLightning: true,
      maxParticles: 50000,
      maxBoltSegments: 128,
      ...options,
    };

    this.timeOfDay = 12.0;
    this.timeSpeed = 1.0;

    this.weatherState = this._defaultWeather();
    this.weatherTarget = null;
    this.weatherTransitionTime = 0;
    this.weatherTransitionDuration = 0;

    this.lightningFlashIntensity = 0;
    this.lightningCooldown = 0;
    this.lightningActive = false;

    this.fogParams = { density: 0, color: [0.5, 0.5, 0.55], heightFalloff: 0.02 };
    this.windDir = [1, 0];
    this.puddleAccumulation = 0;
    this.snowAccumulation = 0;

    this.skyTexture = null;
    this.cloudTexture = null;
    this.pipelines = {};
    this.buffers = {};
    this.bindGroups = {};

    this._initialized = false;
  }

  // ─── Initialization ─────────────────────────────────────────────────────────

  async initialize() {
    try {
      this._createTextures();
      this._createBuffers();
      this._createPipelines();
      this._createBindGroups();
      this._initialized = true;
      console.log('✓ AtmosphericRenderer2026 initialized');
      return true;
    } catch (e) {
      console.error('AtmosphericRenderer2026 init failed:', e);
      return false;
    }
  }

  _createTextures() {
    const res = this.options.skyResolution;
    this.skyTexture = this.device.createTexture({
      size: [res * 2, res],
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
      label: 'sky-equirect',
    });
    this.cloudTexture = this.device.createTexture({
      size: [this.options.width, this.options.height],
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      label: 'cloud-output',
    });
    this.skySampler = this.device.createSampler({
      magFilter: 'linear', minFilter: 'linear',
      addressModeU: 'repeat', addressModeV: 'clamp-to-edge',
    });
  }

  _createBuffers() {
    const { maxParticles, maxBoltSegments } = this.options;

    this.buffers.skyUniforms = this.device.createBuffer({
      size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: 'sky-uniforms',
    });
    this.buffers.cloudUniforms = this.device.createBuffer({
      size: 160, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: 'cloud-uniforms',
    });
    this.buffers.weatherUniforms = this.device.createBuffer({
      size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: 'weather-uniforms',
    });
    this.buffers.lightningUniforms = this.device.createBuffer({
      size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: 'lightning-uniforms',
    });
    this.buffers.particles = this.device.createBuffer({
      size: maxParticles * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
      label: 'weather-particles',
    });
    this.buffers.bolts = this.device.createBuffer({
      size: maxBoltSegments * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
      label: 'lightning-bolts',
    });
  }

  _createPipelines() {
    const skyModule = this.device.createShaderModule({ code: SKY_COMPUTE_WGSL, label: 'sky-shader' });
    this.pipelines.sky = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: skyModule, entryPoint: 'skyMain' },
    });

    if (this.options.enableClouds) {
      const cloudModule = this.device.createShaderModule({ code: CLOUD_COMPUTE_WGSL, label: 'cloud-shader' });
      this.pipelines.cloud = this.device.createComputePipeline({
        layout: 'auto',
        compute: { module: cloudModule, entryPoint: 'cloudMain' },
      });
    }

    if (this.options.enableWeather) {
      const weatherModule = this.device.createShaderModule({ code: WEATHER_PARTICLE_WGSL, label: 'weather-shader' });
      this.pipelines.weather = this.device.createComputePipeline({
        layout: 'auto',
        compute: { module: weatherModule, entryPoint: 'weatherMain' },
      });
    }

    if (this.options.enableLightning) {
      const lightningModule = this.device.createShaderModule({ code: LIGHTNING_COMPUTE_WGSL, label: 'lightning-shader' });
      this.pipelines.lightning = this.device.createComputePipeline({
        layout: 'auto',
        compute: { module: lightningModule, entryPoint: 'lightningMain' },
      });
    }
  }

  _createBindGroups() {
    this.bindGroups.sky = this.device.createBindGroup({
      layout: this.pipelines.sky.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.buffers.skyUniforms } },
        { binding: 1, resource: this.skyTexture.createView() },
      ],
    });

    if (this.options.enableWeather) {
      this.bindGroups.weather = this.device.createBindGroup({
        layout: this.pipelines.weather.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.buffers.particles } },
          { binding: 1, resource: { buffer: this.buffers.weatherUniforms } },
        ],
      });
    }

    if (this.options.enableLightning) {
      this.bindGroups.lightning = this.device.createBindGroup({
        layout: this.pipelines.lightning.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.buffers.bolts } },
          { binding: 1, resource: { buffer: this.buffers.lightningUniforms } },
        ],
      });
    }
  }

  // ─── Sun / Moon Geometry ────────────────────────────────────────────────────

  _sunDirection(hours) {
    const angle = ((hours - 6.0) / 24.0) * Math.PI * 2;
    return [Math.cos(angle) * 0.9, Math.sin(angle), Math.cos(angle) * 0.4];
  }

  _moonDirection(hours) {
    const angle = ((hours + 6.0) / 24.0) * Math.PI * 2;
    return [Math.cos(angle) * 0.85, Math.sin(angle), -Math.cos(angle) * 0.35];
  }

  _normalize(v) {
    const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  setTimeOfDay(hours) {
    this.timeOfDay = ((hours % 24) + 24) % 24;
  }

  setWeather(presetName, transitionTime = 5.0) {
    const preset = WEATHER_PRESETS[presetName];
    if (!preset) { console.warn(`Unknown weather preset: ${presetName}`); return; }
    this.weatherTarget = { ...preset };
    this.weatherTransitionDuration = transitionTime;
    this.weatherTransitionTime = 0;
  }

  setCustomWeather(params) {
    this.weatherTarget = { ...this._defaultWeather(), ...params };
    this.weatherTransitionDuration = params.transitionTime ?? 3.0;
    this.weatherTransitionTime = 0;
  }

  update(time, deltaTime) {
    if (!this._initialized) return;

    // Advance time-of-day (unless overridden)
    if (this.weatherState.timeOverride === null) {
      this.timeOfDay = (this.timeOfDay + deltaTime * this.timeSpeed / 60) % 24;
    }

    this._updateWeatherTransition(deltaTime);
    this._updateLightning(time, deltaTime);
    this._updateAccumulation(deltaTime);
    this._updateFog();
    this._updateWindDirection(time);

    this._writeSkyUniforms(time);
    this._writeWeatherUniforms(deltaTime, time);
  }

  renderSky(commandEncoder) {
    if (!this._initialized) return;
    const res = this.options.skyResolution;
    const pass = commandEncoder.beginComputePass({ label: 'sky-pass' });
    pass.setPipeline(this.pipelines.sky);
    pass.setBindGroup(0, this.bindGroups.sky);
    pass.dispatchWorkgroups(Math.ceil(res * 2 / 8), Math.ceil(res / 8));
    pass.end();
  }

  renderClouds(commandEncoder, depthBuffer) {
    if (!this._initialized || !this.options.enableClouds) return;

    // Recreate bind group each frame to allow new depthBuffer
    const cloudBG = this.device.createBindGroup({
      layout: this.pipelines.cloud.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.buffers.cloudUniforms } },
        { binding: 1, resource: this.cloudTexture.createView() },
        { binding: 2, resource: depthBuffer },
      ],
    });

    const { width, height } = this.options;
    const pass = commandEncoder.beginComputePass({ label: 'cloud-pass' });
    pass.setPipeline(this.pipelines.cloud);
    pass.setBindGroup(0, cloudBG);
    pass.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
    pass.end();
  }

  renderWeatherParticles(commandEncoder) {
    if (!this._initialized || !this.options.enableWeather) return;
    const count = this.options.maxParticles;
    const pass = commandEncoder.beginComputePass({ label: 'weather-particle-pass' });
    pass.setPipeline(this.pipelines.weather);
    pass.setBindGroup(0, this.bindGroups.weather);
    pass.dispatchWorkgroups(Math.ceil(count / 256));
    pass.end();
  }

  renderLightning(commandEncoder) {
    if (!this._initialized || !this.options.enableLightning || !this.lightningActive) return;
    const segs = this.options.maxBoltSegments;
    const pass = commandEncoder.beginComputePass({ label: 'lightning-pass' });
    pass.setPipeline(this.pipelines.lightning);
    pass.setBindGroup(0, this.bindGroups.lightning);
    pass.dispatchWorkgroups(Math.ceil(segs / 64));
    pass.end();
  }

  getWeatherParticles() {
    return this.buffers.particles;
  }

  getSkyTexture() {
    return { texture: this.skyTexture, sampler: this.skySampler };
  }

  getAmbientLight() {
    const sun = this._sunDirection(this._effectiveTime());
    const sunUp = Math.max(sun[1], 0);
    const moonUp = Math.max(-sun[1], 0);

    const dayColor = [1.0, 0.95, 0.85];
    const duskColor = [1.0, 0.5, 0.2];
    const nightColor = [0.1, 0.12, 0.25];

    const duskFactor = Math.exp(-((sunUp - 0.1) ** 2) / 0.01);
    const color = dayColor.map((d, i) =>
      d * sunUp * (1 - duskFactor) + duskColor[i] * duskFactor + nightColor[i] * moonUp
    );
    const mult = this.weatherState.ambientMult ?? 1.0;

    return {
      color: color.map(c => c * mult),
      intensity: (sunUp * 1.0 + moonUp * 0.08 + 0.02) * mult,
      direction: this._normalize(sunUp > moonUp ? sun : this._moonDirection(this._effectiveTime())),
    };
  }

  getLightningFlash() {
    return this.lightningFlashIntensity;
  }

  getStats() {
    return {
      timeOfDay: this.timeOfDay,
      weatherState: { ...this.weatherState },
      cloudCoverage: this.weatherState.cloudCoverage,
      lightningActive: this.lightningActive,
      puddleAccumulation: this.puddleAccumulation,
      snowAccumulation: this.snowAccumulation,
      fogDensity: this.fogParams.density,
    };
  }

  dispose() {
    for (const buf of Object.values(this.buffers)) buf.destroy();
    this.skyTexture?.destroy();
    this.cloudTexture?.destroy();
    this.buffers = {};
    this.bindGroups = {};
    this.pipelines = {};
    this._initialized = false;
  }

  // ─── Internal: Weather Transition ───────────────────────────────────────────

  _defaultWeather() {
    return {
      timeOverride: null, cloudCoverage: 0.4, fogDensity: 0.0,
      rain: 0, snow: 0, windSpeed: 1.0, lightning: false,
      bloodMoon: 0, eclipse: 0, voidSky: 0, aurora: 0,
      stormFactor: 0, cloudType: 0, ashfall: 0,
      fogColor: [0.5, 0.5, 0.55], ambientMult: 1.0,
    };
  }

  _updateWeatherTransition(dt) {
    if (!this.weatherTarget) return;
    this.weatherTransitionTime += dt;
    const t = Math.min(this.weatherTransitionTime / this.weatherTransitionDuration, 1);
    const ease = t * t * (3 - 2 * t); // smoothstep

    const src = this.weatherState;
    const dst = this.weatherTarget;
    const lerp = (a, b) => a + (b - a) * ease;

    for (const key of Object.keys(dst)) {
      if (key === 'timeOverride') {
        this.weatherState.timeOverride = t > 0.5 ? dst.timeOverride : src.timeOverride;
      } else if (key === 'lightning') {
        this.weatherState.lightning = t > 0.5 ? dst.lightning : src.lightning;
      } else if (key === 'fogColor') {
        this.weatherState.fogColor = src.fogColor.map((c, i) => lerp(c, dst.fogColor[i]));
      } else if (typeof dst[key] === 'number') {
        this.weatherState[key] = lerp(src[key] ?? 0, dst[key]);
      }
    }

    if (t >= 1) {
      this.weatherState = { ...dst };
      this.weatherTarget = null;
    }
  }

  _effectiveTime() {
    return this.weatherState.timeOverride !== null ? this.weatherState.timeOverride : this.timeOfDay;
  }

  _updateLightning(time, dt) {
    this.lightningFlashIntensity = Math.max(0, this.lightningFlashIntensity - dt * 4);
    this.lightningCooldown -= dt;

    if (this.weatherState.lightning && this.lightningCooldown <= 0) {
      this.lightningActive = true;
      this.lightningFlashIntensity = 0.8 + Math.random() * 0.2;
      this.lightningCooldown = 1.5 + Math.random() * 6;

      // Write bolt uniforms
      const origin = [Math.random() * 200 - 100, 300, Math.random() * 200 - 100];
      const target = [origin[0] + (Math.random() - 0.5) * 40, 0, origin[2] + (Math.random() - 0.5) * 40];
      const data = new Float32Array([
        ...origin, time, ...target, 0.15,
        40.0, this.options.maxBoltSegments, 0, 0,
      ]);
      this.device.queue.writeBuffer(this.buffers.lightningUniforms, 0, data);
    } else if (this.lightningFlashIntensity <= 0.01) {
      this.lightningActive = false;
    }
  }

  _updateAccumulation(dt) {
    const ws = this.weatherState;
    this.puddleAccumulation = Math.min(1, Math.max(0,
      this.puddleAccumulation + ws.rain * dt * 0.02 - (1 - ws.rain) * dt * 0.005));
    this.snowAccumulation = Math.min(1, Math.max(0,
      this.snowAccumulation + ws.snow * dt * 0.01 - (1 - ws.snow) * dt * 0.003));
  }

  _updateFog() {
    const ws = this.weatherState;
    this.fogParams.density = ws.fogDensity;
    this.fogParams.color = [...ws.fogColor];
  }

  _updateWindDirection(time) {
    const angle = time * 0.05;
    const ws = this.weatherState;
    this.windDir = [
      Math.cos(angle) * ws.windSpeed,
      Math.sin(angle) * ws.windSpeed,
    ];
  }

  // ─── Internal: GPU Uniform Writes ───────────────────────────────────────────

  _writeSkyUniforms(time) {
    const h = this._effectiveTime();
    const sun = this._normalize(this._sunDirection(h));
    const moon = this._normalize(this._moonDirection(h));
    const ws = this.weatherState;
    const moonPhase = (Math.sin(time * 0.001) + 1) * 0.5;
    const nightFade = Math.max(0, -sun[1]);
    const starBright = Math.min(1, nightFade * 3) * (1 - ws.voidSky);

    const data = new Float32Array([
      sun[0], sun[1], sun[2], 22.0,              // sunDir, sunIntensity
      moon[0], moon[1], moon[2], moonPhase,       // moonDir, moonPhase
      5.8e-6, 13.5e-6, 33.1e-6, 21e-6,           // rayleighCoeff(rgb), mieCoeff
      0.758,                                       // mieDir (g)
      0.6e-6, 1.8e-6, 0.085e-6,                   // ozoneCoeff
      ws.bloodMoon,                                // bloodMoonFactor
      ws.eclipse,                                  // eclipseFactor
      ws.voidSky,                                  // voidFactor
      ws.aurora,                                   // auroraFactor
      time,                                        // time
      starBright,                                  // starBrightness
      0, 0,                                        // _pad
    ]);
    this.device.queue.writeBuffer(this.buffers.skyUniforms, 0, data);
  }

  _writeWeatherUniforms(dt, time) {
    if (!this.options.enableWeather) return;
    const ws = this.weatherState;

    let particleType = 0;
    if (ws.snow > ws.rain && ws.snow > ws.ashfall) particleType = 1;
    if (ws.ashfall > ws.rain && ws.ashfall > ws.snow) particleType = 2;

    const data = new Float32Array([
      this.windDir[0], 0, this.windDir[1], dt,     // wind, deltaTime
      0, -9.8, 0, particleType,                     // gravity, particleType
      -100, 50, -100, 200,                           // emitMin, emitRange
      100, 150, 100, time,                           // emitMax, time
    ]);
    this.device.queue.writeBuffer(this.buffers.weatherUniforms, 0, data);
  }
}
