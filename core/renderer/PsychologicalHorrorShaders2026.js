/**
 * PsychologicalHorrorShaders2026.js - Psychological Horror Shader Collection
 * Compute shader effects designed to create deep unease and dread.
 */

const WG = 16;

const uncannyValleyWGSL = /* wgsl */`
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // (intensity, time, faceX, faceY)
@group(0) @binding(3) var<uniform> faceRegion: vec4<f32>; // (centerX, centerY, radiusX, radiusY)

fn hash21(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(inputTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let uv = vec2<f32>(gid.xy) / vec2<f32>(dims);
  let faceCenter = faceRegion.xy;
  let faceRadius = faceRegion.zw;
  let toFace = (uv - faceCenter) / max(faceRadius, vec2<f32>(0.001));
  let faceDist = length(toFace);

  var displacement = vec2<f32>(0.0);

  if (faceDist < 1.0) {
    let falloff = smoothstep(1.0, 0.0, faceDist);
    let t = params.y;
    let intensity = params.x;

    // Asymmetric horizontal stretch (eye spacing feels wrong)
    let asymmetry = sin(toFace.y * 3.14159 + t * 0.3) * 0.015;
    displacement.x += asymmetry * falloff * intensity;

    // Jaw elongation (lower face stretches downward)
    let jawFactor = smoothstep(0.0, 0.5, toFace.y) * falloff;
    displacement.y += jawFactor * 0.02 * intensity * (1.0 + sin(t * 0.5) * 0.3);

    // Subtle random micro-twitches
    let twitch = hash21(uv * 100.0 + vec2<f32>(floor(t * 8.0))) - 0.5;
    displacement += vec2<f32>(twitch * 0.003) * falloff * intensity;
  }

  let sampleCoord = vec2<i32>(vec2<f32>(gid.xy) + displacement * vec2<f32>(dims));
  let clamped = clamp(sampleCoord, vec2<i32>(0), vec2<i32>(dims) - vec2<i32>(1));
  let color = textureLoad(inputTex, clamped, 0);
  textureStore(outputTex, vec2<i32>(gid.xy), color);
}
`;

const peripheralVisionWGSL = /* wgsl */`
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // (intensity, time, gazeX, gazeY)

fn hash22(p: vec2<f32>) -> vec2<f32> {
  let k = vec2<f32>(0.3183099, 0.3678794);
  var n = p * k + k.yx;
  return -1.0 + 2.0 * fract(16.0 * k * fract(n.x * n.y * (n.x + n.y)));
}

fn valueNoise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash22(i), f), dot(hash22(i + vec2<f32>(1,0)), f - vec2<f32>(1,0)), u.x),
    mix(dot(hash22(i + vec2<f32>(0,1)), f - vec2<f32>(0,1)),
        dot(hash22(i + vec2<f32>(1,1)), f - vec2<f32>(1,1)), u.x),
    u.y
  );
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(inputTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let uv = vec2<f32>(gid.xy) / vec2<f32>(dims);
  let gaze = params.zw;
  let distFromGaze = length((uv - gaze) * vec2<f32>(f32(dims.x) / f32(dims.y), 1.0));

  // Effect only in peripheral vision (outer 40%+)
  let peripheralStart = 0.3;
  let peripheralFactor = smoothstep(peripheralStart, 0.7, distFromGaze);
  let intensity = params.x * peripheralFactor;

  var color = textureLoad(inputTex, vec2<i32>(gid.xy), 0);

  if (intensity > 0.01) {
    let t = params.y;
    // Shadow entities that move in the periphery
    let noiseCoord = uv * 8.0 + vec2<f32>(t * 0.4, t * 0.2);
    let shadow = valueNoise(noiseCoord) * 0.5 + 0.5;
    let entityShape = smoothstep(0.55, 0.45, shadow);

    // Darken peripheral areas with moving shadows
    let darkening = 1.0 - entityShape * intensity * 0.4;
    color = vec4<f32>(color.rgb * darkening, color.a);

    // Slight displacement for movement illusion
    let offset = vec2<f32>(
      valueNoise(noiseCoord + vec2<f32>(100.0, 0.0)),
      valueNoise(noiseCoord + vec2<f32>(0.0, 100.0))
    ) * intensity * 3.0;
    let displaced = vec2<i32>(vec2<f32>(gid.xy) + offset);
    let clampedD = clamp(displaced, vec2<i32>(0), vec2<i32>(dims) - vec2<i32>(1));
    let displacedColor = textureLoad(inputTex, clampedD, 0);
    color = vec4<f32>(mix(color.rgb, displacedColor.rgb, intensity * 0.5), color.a);
  }

  textureStore(outputTex, vec2<i32>(gid.xy), color);
}
`;

const pareidoliaWGSL = /* wgsl */`
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // (intensity, time, spawnRate, viewAngle)

fn hash21(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn faceTemplate(p: vec2<f32>) -> f32 {
  // Simplified face SDF: two eye circles + mouth arc
  let leftEye = length(p - vec2<f32>(-0.15, 0.1)) - 0.06;
  let rightEye = length(p - vec2<f32>(0.15, 0.1)) - 0.06;
  let eyes = min(leftEye, rightEye);
  let mouthPos = p - vec2<f32>(0.0, -0.12);
  let mouth = length(mouthPos) - 0.1;
  let mouthMask = select(1.0, mouth, mouthPos.y < 0.0);
  let face = min(eyes, mouthMask);
  return smoothstep(0.02, -0.02, face);
}

fn luminance(c: vec3<f32>) -> f32 {
  return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(inputTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let uv = vec2<f32>(gid.xy) / vec2<f32>(dims);
  var color = textureLoad(inputTex, vec2<i32>(gid.xy), 0);
  let lum = luminance(color.rgb);

  // Only spawn faces in dark regions
  let darkness = smoothstep(0.35, 0.05, lum);
  if (darkness < 0.1) {
    textureStore(outputTex, vec2<i32>(gid.xy), color);
    return;
  }

  let t = params.y;
  let intensity = params.x;
  let spawnRate = params.z;

  // Grid-based face placement with hash-driven randomization
  let gridSize = 0.15;
  let cell = floor(uv / gridSize);
  let cellHash = hash21(cell);

  // Only some cells get faces based on spawn rate
  if (cellHash > spawnRate) {
    textureStore(outputTex, vec2<i32>(gid.xy), color);
    return;
  }

  let cellUV = (fract(uv / gridSize) - 0.5) * 2.0;
  let faceScale = 0.8 + cellHash * 0.4;
  let rotAngle = (cellHash - 0.5) * 0.5;
  let cs = cos(rotAngle); let sn = sin(rotAngle);
  let rotated = vec2<f32>(cellUV.x * cs - cellUV.y * sn, cellUV.x * sn + cellUV.y * cs);

  let face = faceTemplate(rotated / faceScale);
  // Temporal flickering so faces appear and disappear
  let flicker = smoothstep(0.3, 0.7, sin(t * 1.5 + cellHash * 6.28) * 0.5 + 0.5);
  let faceAlpha = face * darkness * intensity * flicker * 0.25;

  let result = mix(color.rgb, vec3<f32>(0.0), faceAlpha);
  textureStore(outputTex, vec2<i32>(gid.xy), vec4<f32>(result, color.a));
}
`;

const sanityDesaturationWGSL = /* wgsl */`
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // (sanity, horrorLevel, time, 0)

fn luminance(c: vec3<f32>) -> f32 {
  return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(inputTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  var color = textureLoad(inputTex, vec2<i32>(gid.xy), 0);
  let sanity = params.x;
  let insanity = 1.0 - sanity;

  let gray = luminance(color.rgb);
  let desaturated = vec3<f32>(gray);

  // Selective: preserve red channel (blood always visible)
  let redPreserve = smoothstep(0.2, 0.6, color.r - max(color.g, color.b));
  let preserveFactor = redPreserve * 0.8;

  let baseDesat = mix(color.rgb, desaturated, insanity * 0.85);
  let result = mix(baseDesat, color.rgb, preserveFactor);

  // Slight vignette darkening as sanity drops
  let uv = vec2<f32>(gid.xy) / vec2<f32>(dims);
  let vignette = 1.0 - length(uv - 0.5) * insanity * 0.6;

  // Color temperature shift toward cold blue at low sanity
  let coldShift = vec3<f32>(-0.05, -0.02, 0.08) * insanity;

  textureStore(outputTex, vec2<i32>(gid.xy),
    vec4<f32>(result * vignette + coldShift, color.a));
}
`;

const somethingWatchingWGSL = /* wgsl */`
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // (intensity, time, gazeX, gazeY)

fn hash21(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn luminance(c: vec3<f32>) -> f32 {
  return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(inputTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let uv = vec2<f32>(gid.xy) / vec2<f32>(dims);
  var color = textureLoad(inputTex, vec2<i32>(gid.xy), 0);
  let lum = luminance(color.rgb);

  // Only place eyes in dark regions
  if (lum > 0.15) {
    textureStore(outputTex, vec2<i32>(gid.xy), color);
    return;
  }

  let t = params.y;
  let intensity = params.x;
  let gaze = params.zw;

  // Grid scan for candidate eye positions
  let gridSize = 0.08;
  let cell = floor(uv / gridSize);
  let cellHash = hash21(cell + vec2<f32>(floor(t * 0.1)));

  // Only some cells get eyes
  if (cellHash > 0.15 * intensity) {
    textureStore(outputTex, vec2<i32>(gid.xy), color);
    return;
  }

  let cellCenter = (cell + 0.5) * gridSize;
  let distToGaze = length(cellCenter - gaze);

  // Eyes disappear when directly looked at (foveation)
  let foveationFade = smoothstep(0.1, 0.25, distToGaze);
  if (foveationFade < 0.05) {
    textureStore(outputTex, vec2<i32>(gid.xy), color);
    return;
  }

  // Paired specular dots
  let localUV = (uv - cellCenter) / gridSize;
  let eyeSpacing = 0.15;
  let eyeSize = 0.04;

  let leftEye = length(localUV - vec2<f32>(-eyeSpacing, 0.0));
  let rightEye = length(localUV - vec2<f32>(eyeSpacing, 0.0));

  // Subtle tracking: eyes slightly follow the gaze direction
  let trackDir = normalize(gaze - cellCenter) * 0.02;
  let leftEyeTracked = length(localUV - vec2<f32>(-eyeSpacing, 0.0) + trackDir);
  let rightEyeTracked = length(localUV - vec2<f32>(eyeSpacing, 0.0) + trackDir);

  let eyeGlow = smoothstep(eyeSize, eyeSize * 0.3, leftEyeTracked) +
                smoothstep(eyeSize, eyeSize * 0.3, rightEyeTracked);

  let flicker = 0.7 + 0.3 * sin(t * 2.0 + cellHash * 6.28);
  let eyeColor = vec3<f32>(0.6, 0.55, 0.3) * eyeGlow * intensity * foveationFade * flicker;

  textureStore(outputTex, vec2<i32>(gid.xy), vec4<f32>(color.rgb + eyeColor, color.a));
}
`;

const realityFractureWGSL = /* wgsl */`
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // (intensity, time, crackSeed, spread)

fn hash21(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn hash22(p: vec2<f32>) -> vec2<f32> {
  let n = vec2<f32>(dot(p, vec2<f32>(127.1, 311.7)), dot(p, vec2<f32>(269.5, 183.3)));
  return fract(sin(n) * 43758.5453);
}

fn voronoi(p: vec2<f32>) -> vec2<f32> {
  let cell = floor(p);
  let frac = fract(p);
  var minDist = 999.0;
  var secondDist = 999.0;

  for (var y = -1; y <= 1; y = y + 1) {
    for (var x = -1; x <= 1; x = x + 1) {
      let neighbor = vec2<f32>(f32(x), f32(y));
      let point = hash22(cell + neighbor);
      let diff = neighbor + point - frac;
      let d = length(diff);
      if (d < minDist) {
        secondDist = minDist;
        minDist = d;
      } else if (d < secondDist) {
        secondDist = d;
      }
    }
  }
  return vec2<f32>(minDist, secondDist);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(inputTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let uv = vec2<f32>(gid.xy) / vec2<f32>(dims);
  let intensity = params.x;
  let spread = params.w;

  // Voronoi crack pattern
  let scale = 6.0 + spread * 4.0;
  let v = voronoi(uv * scale + vec2<f32>(params.z));
  let crackWidth = 0.03 * intensity;
  let edgeDist = v.y - v.x;
  let crack = smoothstep(crackWidth, 0.0, edgeDist);

  var color = textureLoad(inputTex, vec2<i32>(gid.xy), 0);

  if (crack > 0.01) {
    // Chromatic aberration through cracks
    let offset = crack * 5.0 * intensity;
    let rCoord = clamp(vec2<i32>(vec2<f32>(gid.xy) + vec2<f32>(offset, 0.0)),
                       vec2<i32>(0), vec2<i32>(dims) - vec2<i32>(1));
    let bCoord = clamp(vec2<i32>(vec2<f32>(gid.xy) - vec2<f32>(offset, 0.0)),
                       vec2<i32>(0), vec2<i32>(dims) - vec2<i32>(1));
    let r = textureLoad(inputTex, rCoord, 0).r;
    let b = textureLoad(inputTex, bCoord, 0).b;

    // Dark crack lines with refracted color
    let crackColor = vec3<f32>(r, color.g * (1.0 - crack * 0.5), b);
    let darkEdge = 1.0 - crack * 0.7;
    color = vec4<f32>(crackColor * darkEdge, color.a);

    // Bright edge glow on crack borders
    let edgeGlow = smoothstep(0.0, crackWidth, edgeDist) * crack;
    color = vec4<f32>(color.rgb + vec3<f32>(0.3, 0.1, 0.4) * edgeGlow * intensity, color.a);
  }

  textureStore(outputTex, vec2<i32>(gid.xy), color);
}
`;

const breathingWorldWGSL = /* wgsl */`
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // (intensity, time, horrorLevel, breathRate)

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(inputTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let uv = vec2<f32>(gid.xy) / vec2<f32>(dims);
  let t = params.y;
  let intensity = params.x * (0.5 + params.z * 0.5);
  let rate = params.w;

  // Spatially-varying phase so the pulse is not uniform
  let phase = uv.x * 2.0 + uv.y * 1.5 + sin(uv.x * 4.0) * 0.5;

  // Sinusoidal displacement — like the world is breathing
  let breathX = sin(t * rate + phase) * intensity * 4.0;
  let breathY = cos(t * rate * 0.7 + phase * 1.3) * intensity * 3.0;

  let displaced = vec2<i32>(vec2<f32>(gid.xy) + vec2<f32>(breathX, breathY));
  let clamped = clamp(displaced, vec2<i32>(0), vec2<i32>(dims) - vec2<i32>(1));

  var color = textureLoad(inputTex, clamped, 0);

  // Slight pulsing brightness
  let pulse = 1.0 + sin(t * rate) * intensity * 0.05;
  color = vec4<f32>(color.rgb * pulse, color.a);

  textureStore(outputTex, vec2<i32>(gid.xy), color);
}
`;

const vhsFoundFootageWGSL = /* wgsl */`
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // (intensity, time, staticProb, trackingError)

fn hash11(p: f32) -> f32 {
  var p3 = fract(p * 0.1031);
  p3 *= p3 + 33.33;
  p3 *= p3 + p3;
  return fract(p3);
}

fn hash21(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(inputTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let uv = vec2<f32>(gid.xy) / vec2<f32>(dims);
  let t = params.y;
  let intensity = params.x;

  // Scanlines
  let scanline = sin(uv.y * f32(dims.y) * 3.14159) * 0.5 + 0.5;
  let scanlineEffect = 1.0 - (1.0 - scanline) * 0.15 * intensity;

  // Tracking error: horizontal offset that varies per scanline
  let trackBand = smoothstep(0.0, 0.05, abs(uv.y - fract(t * 0.3))) * params.w;
  let trackOffset = trackBand * sin(t * 20.0 + uv.y * 50.0) * 30.0 * intensity;

  // Tape warping
  let warpY = sin(uv.y * 10.0 + t * 3.0) * 0.003 * intensity;
  let warpedUV = vec2<f32>(uv.x + trackOffset / f32(dims.x), uv.y + warpY);
  let sampleCoord = clamp(
    vec2<i32>(warpedUV * vec2<f32>(dims)),
    vec2<i32>(0), vec2<i32>(dims) - vec2<i32>(1)
  );

  var color = textureLoad(inputTex, sampleCoord, 0);

  // Color bleeding: slight horizontal offset per channel
  let bleedOffset = i32(2.0 * intensity);
  let rCoord = clamp(sampleCoord + vec2<i32>(bleedOffset, 0), vec2<i32>(0), vec2<i32>(dims) - 1);
  let bCoord = clamp(sampleCoord - vec2<i32>(bleedOffset, 0), vec2<i32>(0), vec2<i32>(dims) - 1);
  let r = textureLoad(inputTex, rCoord, 0).r;
  let b = textureLoad(inputTex, bCoord, 0).b;
  color = vec4<f32>(r, color.g, b, color.a);

  // Apply scanlines
  color = vec4<f32>(color.rgb * scanlineEffect, color.a);

  // Static bursts
  let staticNoise = hash21(uv * vec2<f32>(f32(dims.x), f32(dims.y)) + vec2<f32>(t * 1000.0));
  let burstProb = params.z * intensity;
  let burstActive = step(1.0 - burstProb, hash11(floor(t * 4.0)));
  if (burstActive > 0.5 && staticNoise > 0.5) {
    let grain = hash21(vec2<f32>(gid.xy) + vec2<f32>(t * 543.21));
    color = vec4<f32>(vec3<f32>(grain), color.a);
  }

  // Slight green tint and reduced saturation (old VHS look)
  let gray = dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114));
  let vhsTint = vec3<f32>(gray * 0.9, gray * 1.05, gray * 0.85);
  color = vec4<f32>(mix(color.rgb, vhsTint, intensity * 0.3), color.a);

  // Timestamp overlay region (bottom-left corner)
  if (uv.x < 0.25 && uv.y > 0.92) {
    let digitFlicker = 0.8 + 0.2 * step(0.5, hash11(floor(t * 2.0)));
    color = vec4<f32>(mix(color.rgb, vec3<f32>(1.0, 0.3, 0.2) * digitFlicker, 0.4 * intensity), color.a);
  }

  textureStore(outputTex, vec2<i32>(gid.xy), color);
}
`;

const EFFECTS = Object.freeze({
  uncanny_valley: { shader: uncannyValleyWGSL, label: 'uncanny-valley' },
  peripheral_vision: { shader: peripheralVisionWGSL, label: 'peripheral-vision' },
  pareidolia: { shader: pareidoliaWGSL, label: 'pareidolia' },
  sanity_desaturation: { shader: sanityDesaturationWGSL, label: 'sanity-desaturation' },
  something_watching: { shader: somethingWatchingWGSL, label: 'something-watching' },
  reality_fracture: { shader: realityFractureWGSL, label: 'reality-fracture' },
  breathing_world: { shader: breathingWorldWGSL, label: 'breathing-world' },
  vhs_found_footage: { shader: vhsFoundFootageWGSL, label: 'vhs-found-footage' },
});

export class PsychologicalHorrorShaders2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.width = options.width || 1920;
    this.height = options.height || 1080;

    this._horrorLevel = 0;
    this._sanity = 1.0;
    this._time = 0;
    this._pipelines = {};
    this._paramBuffers = {};
    this._initialized = false;

    this._state = {
      crackSeed: Math.random() * 1000,
      crackSpread: 0,
      gazeX: 0.5,
      gazeY: 0.5,
      faceRegion: [0.5, 0.4, 0.15, 0.2],
    };
  }

  async initialize() {
    for (const [name, def] of Object.entries(EFFECTS)) {
      this._pipelines[name] = this.device.createComputePipeline({
        label: def.label,
        layout: 'auto',
        compute: {
          module: this.device.createShaderModule({ code: def.shader }),
          entryPoint: 'main',
        },
      });

      this._paramBuffers[name] = this.device.createBuffer({
        size: 32, // 2 x vec4<f32>
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
    }

    this._initialized = true;
  }

  applyEffect(commandEncoder, effectName, inputTexture, params = {}) {
    if (!this._initialized) throw new Error('Shaders not initialized');
    if (!this._pipelines[effectName]) throw new Error(`Unknown effect: ${effectName}`);

    this._time += 1 / 60;
    const uniformData = this._buildParams(effectName, params);
    this.device.queue.writeBuffer(this._paramBuffers[effectName], 0, uniformData);

    const outputTexture = this._getOrCreateOutput(effectName);
    const entries = [
      { binding: 0, resource: inputTexture.createView() },
      { binding: 1, resource: outputTexture.createView() },
      { binding: 2, resource: { buffer: this._paramBuffers[effectName] } },
    ];

    // Some effects need extra uniforms (uncanny_valley has faceRegion)
    if (effectName === 'uncanny_valley') {
      if (!this._paramBuffers.faceRegion) {
        this._paramBuffers.faceRegion = this.device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
      }
      this.device.queue.writeBuffer(this._paramBuffers.faceRegion, 0,
        new Float32Array(this._state.faceRegion));
      entries.push({ binding: 3, resource: { buffer: this._paramBuffers.faceRegion } });
    }

    const bindGroup = this.device.createBindGroup({
      layout: this._pipelines[effectName].getBindGroupLayout(0),
      entries,
    });

    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(this._pipelines[effectName]);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(
      Math.ceil(this.width / WG),
      Math.ceil(this.height / WG)
    );
    pass.end();

    return outputTexture;
  }

  applyChain(commandEncoder, effectChain, inputTexture) {
    let currentInput = inputTexture;
    for (const item of effectChain) {
      const name = typeof item === 'string' ? item : item.name;
      const params = typeof item === 'string' ? {} : (item.params || {});
      currentInput = this.applyEffect(commandEncoder, name, currentInput, params);
    }
    return currentInput;
  }

  setHorrorLevel(level) {
    this._horrorLevel = Math.max(0, Math.min(1, level));
  }

  setSanity(level) {
    this._sanity = Math.max(0, Math.min(1, level));
  }

  setGaze(x, y) {
    this._state.gazeX = x;
    this._state.gazeY = y;
  }

  setFaceRegion(centerX, centerY, radiusX, radiusY) {
    this._state.faceRegion = [centerX, centerY, radiusX, radiusY];
  }

  triggerEvent(eventType) {
    switch (eventType) {
      case 'reality_crack':
        this._state.crackSpread = Math.min(1, this._state.crackSpread + 0.2);
        this._state.crackSeed = Math.random() * 1000;
        break;
      case 'pareidolia_spike':
        this._pareidoliaBoost = 1.0;
        break;
      case 'peripheral_entity':
        this._peripheralBoost = 1.0;
        break;
      default:
        break;
    }
  }

  getShaderCode(effectName) {
    const def = EFFECTS[effectName];
    if (!def) throw new Error(`Unknown effect: ${effectName}`);
    return def.shader;
  }

  getEffectNames() {
    return Object.keys(EFFECTS);
  }

  getState() {
    return {
      horrorLevel: this._horrorLevel,
      sanity: this._sanity,
      crackSpread: this._state.crackSpread,
      time: this._time,
    };
  }

  serializeState() {
    return JSON.stringify({
      crackSpread: this._state.crackSpread,
      crackSeed: this._state.crackSeed,
      horrorLevel: this._horrorLevel,
      sanity: this._sanity,
    });
  }

  restoreState(json) {
    const data = JSON.parse(json);
    this._state.crackSpread = data.crackSpread ?? 0;
    this._state.crackSeed = data.crackSeed ?? 0;
    this._horrorLevel = data.horrorLevel ?? 0;
    this._sanity = data.sanity ?? 1;
  }

  dispose() {
    Object.values(this._paramBuffers).forEach(b => b?.destroy?.());
    if (this._outputTextures) {
      Object.values(this._outputTextures).forEach(t => t?.destroy?.());
    }
    this._initialized = false;
  }

  // --- Internal helpers ---

  _buildParams(effectName, overrides) {
    const h = this._horrorLevel;
    const t = this._time;
    const gx = this._state.gazeX;
    const gy = this._state.gazeY;
    const intensity = overrides.intensity ?? h;

    const boost = (field) => {
      const val = this[field] || 0;
      if (val > 0) this[field] = Math.max(0, val - 1 / 60);
      return val;
    };

    switch (effectName) {
      case 'uncanny_valley':
        return new Float32Array([intensity, t, 0, 0, ...this._state.faceRegion]);

      case 'peripheral_vision': {
        const pBoost = boost('_peripheralBoost');
        return new Float32Array([
          Math.min(1, intensity + pBoost), t, gx, gy, 0, 0, 0, 0,
        ]);
      }

      case 'pareidolia': {
        const pBoost = boost('_pareidoliaBoost');
        const spawnRate = overrides.spawnRate ?? (0.1 + h * 0.2 + pBoost * 0.3);
        return new Float32Array([
          Math.min(1, intensity + pBoost), t, spawnRate, 0, 0, 0, 0, 0,
        ]);
      }

      case 'sanity_desaturation':
        return new Float32Array([
          overrides.sanity ?? this._sanity, h, t, 0, 0, 0, 0, 0,
        ]);

      case 'something_watching':
        return new Float32Array([intensity, t, gx, gy, 0, 0, 0, 0]);

      case 'reality_fracture':
        return new Float32Array([
          intensity, t, this._state.crackSeed, this._state.crackSpread, 0, 0, 0, 0,
        ]);

      case 'breathing_world':
        return new Float32Array([
          intensity, t, h, overrides.breathRate ?? 2.0, 0, 0, 0, 0,
        ]);

      case 'vhs_found_footage':
        return new Float32Array([
          intensity, t, overrides.staticProb ?? 0.05, overrides.trackingError ?? 0.3,
          0, 0, 0, 0,
        ]);

      default:
        return new Float32Array(8);
    }
  }

  _getOrCreateOutput(effectName) {
    if (!this._outputTextures) this._outputTextures = {};
    if (!this._outputTextures[effectName]) {
      this._outputTextures[effectName] = this.device.createTexture({
        size: [this.width, this.height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        label: `horror-${effectName}-output`,
      });
    }
    return this._outputTextures[effectName];
  }
}
