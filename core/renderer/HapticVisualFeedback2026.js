/**
 * HapticVisualFeedback2026 — Haptic Visual Feedback System
 * Unified WebGPU compute post-process for damage, impact, and health-state effects.
 *
 * Effects:
 *  - Advanced per-pixel screen shake via noise displacement
 *  - Radial blur from projected impact points
 *  - Directional damage indicators (blood/red overlays)
 *  - Low-health persistent degradation (desaturation, grain, vignette)
 *  - Hit flash (white/red)
 *  - Healing glow (green/golden edge)
 */

// ---------------------------------------------------------------------------
// WGSL Shader Source
// ---------------------------------------------------------------------------

const HAPTIC_FEEDBACK_SHADER = /* wgsl */ `
struct HapticParams {
  resolution:         vec2f,
  time:               f32,
  healthPercent:      f32,

  shakeOffsetX:       f32,
  shakeOffsetY:       f32,
  shakeIntensity:     f32,
  shakeFrequency:     f32,

  impactCenterX:      f32,
  impactCenterY:      f32,
  impactIntensity:    f32,
  impactRadius:       f32,

  hitFlashR:          f32,
  hitFlashG:          f32,
  hitFlashB:          f32,
  hitFlashAlpha:      f32,

  healGlowIntensity:  f32,
  lowHealthVignette:  f32,
  lowHealthDesat:     f32,
  lowHealthGrain:     f32,

  lowHealthPulse:     f32,
  chromaticAb:        f32,
  _pad0:              f32,
  _pad1:              f32,
};

struct DamageIndicator {
  dirX:      f32,
  dirY:      f32,
  intensity: f32,
  age:       f32,
};

struct DamageBuffer {
  count: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
  indicators: array<DamageIndicator, 8>,
};

@group(0) @binding(0) var inputTex:  texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: HapticParams;
@group(0) @binding(3) var<storage, read> damage: DamageBuffer;

fn hash2(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  let q = p * k + k.yx;
  return fract(16.0 * k.x * fract(q.x * q.y * (q.x + q.y)));
}

fn noiseDisplacement(uv: vec2f, intensity: f32, freq: f32, time: f32) -> vec2f {
  let n1 = hash2(uv * freq + vec2f(time * 7.3, time * 5.1));
  let n2 = hash2(uv * freq + vec2f(time * 6.7, time * 8.9));
  return (vec2f(n1, n2) - 0.5) * 2.0 * intensity;
}

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}

fn sampleTex(coord: vec2i) -> vec3f {
  let dims = vec2i(textureDimensions(inputTex));
  let clamped = clamp(coord, vec2i(0), dims - vec2i(1));
  return textureLoad(inputTex, clamped, 0).rgb;
}

fn applyRadialBlur(coord: vec2i, uv: vec2f, center: vec2f, intensity: f32, radius: f32) -> vec3f {
  let toCenter = center - uv;
  let dist = length(toCenter);
  let falloff = max(0.0, 1.0 - dist / max(radius, 0.001)) * intensity;
  let dir = normalize(toCenter + vec2f(0.0001)) * falloff * 0.03;
  var color = vec3f(0.0);
  let samples = 8;
  for (var i = 0; i < samples; i++) {
    let t = f32(i) / f32(samples - 1);
    let offset = dir * (t - 0.5) * 2.0;
    let sampleCoord = vec2i(vec2f(coord) + offset * params.resolution);
    color += sampleTex(sampleCoord);
  }
  return color / f32(samples);
}

fn applyDamageIndicators(uv: vec2f) -> vec3f {
  var overlay = vec3f(0.0);
  let count = min(damage.count, 8u);
  for (var i = 0u; i < count; i++) {
    let ind = damage.indicators[i];
    let dir = normalize(vec2f(ind.dirX, ind.dirY) + vec2f(0.0001));
    let edgeUV = uv - vec2f(0.5);
    let alignment = max(0.0, dot(normalize(edgeUV + vec2f(0.0001)), dir));
    let edgeDist = max(abs(edgeUV.x), abs(edgeUV.y));
    let edgeFactor = smoothstep(0.3, 0.5, edgeDist);
    let fade = max(0.0, 1.0 - ind.age);
    let weight = alignment * edgeFactor * fade * ind.intensity;
    overlay += vec3f(0.6, 0.0, 0.0) * weight;
  }
  return overlay;
}

fn applyGrain(color: vec3f, uv: vec2f, intensity: f32, time: f32) -> vec3f {
  let grain = (hash2(uv * 500.0 + vec2f(time * 100.0)) - 0.5) * intensity;
  return color + vec3f(grain);
}

fn applyChromaticAberration(coord: vec2i, uv: vec2f, strength: f32) -> vec3f {
  let dir = uv - vec2f(0.5);
  let offset = vec2i(vec2f(dir * strength * 10.0));
  let r = sampleTex(coord + offset).r;
  let g = sampleTex(coord).g;
  let b = sampleTex(coord - offset).b;
  return vec3f(r, g, b);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let dims = vec2i(textureDimensions(inputTex));
  let coord = vec2i(gid.xy);
  if (coord.x >= dims.x || coord.y >= dims.y) { return; }

  let uv = (vec2f(coord) + 0.5) / vec2f(dims);

  // --- Screen Shake (per-pixel noise displacement) ---
  var displaced = coord;
  if (params.shakeIntensity > 0.001) {
    let noiseOff = noiseDisplacement(uv, params.shakeIntensity, params.shakeFrequency, params.time);
    let directional = vec2f(params.shakeOffsetX, params.shakeOffsetY);
    let totalOff = (noiseOff + directional) * params.resolution;
    displaced = coord + vec2i(totalOff);
  }

  var color = sampleTex(displaced);

  // --- Impact Radial Blur ---
  if (params.impactIntensity > 0.01) {
    let center = vec2f(params.impactCenterX, params.impactCenterY);
    color = applyRadialBlur(displaced, uv, center, params.impactIntensity, params.impactRadius);
  }

  // --- Low Health: Chromatic Aberration ---
  if (params.chromaticAb > 0.01) {
    color = applyChromaticAberration(displaced, uv, params.chromaticAb);
  }

  // --- Damage Direction Indicators ---
  if (damage.count > 0u) {
    let overlay = applyDamageIndicators(uv);
    color = color + overlay;
  }

  // --- Low Health: Desaturation ---
  if (params.lowHealthDesat > 0.01) {
    let gray = luminance(color);
    color = mix(color, vec3f(gray), params.lowHealthDesat);
  }

  // --- Low Health: Vignette (tunnel vision) ---
  if (params.lowHealthVignette > 0.01) {
    let center = uv - vec2f(0.5);
    let dist = length(center);
    let vig = 1.0 - smoothstep(0.15, 0.7, dist) * params.lowHealthVignette;
    color = color * vig;
  }

  // --- Low Health: Film Grain ---
  if (params.lowHealthGrain > 0.01) {
    color = applyGrain(color, uv, params.lowHealthGrain, params.time);
  }

  // --- Low Health: Heartbeat Pulse (dim screen) ---
  color = color * (1.0 - params.lowHealthPulse * 0.25);

  // --- Low Health: Subtle Red Edges ---
  if (params.healthPercent < 0.25) {
    let edgeDist = max(abs(uv.x - 0.5), abs(uv.y - 0.5));
    let redEdge = smoothstep(0.35, 0.5, edgeDist) * (1.0 - params.healthPercent * 4.0) * 0.3;
    color = color + vec3f(redEdge, 0.0, 0.0);
  }

  // --- Hit Flash ---
  if (params.hitFlashAlpha > 0.01) {
    let flashColor = vec3f(params.hitFlashR, params.hitFlashG, params.hitFlashB);
    color = mix(color, flashColor, params.hitFlashAlpha);
  }

  // --- Healing Glow ---
  if (params.healGlowIntensity > 0.01) {
    let edgeDist = max(abs(uv.x - 0.5), abs(uv.y - 0.5));
    let edgeGlow = smoothstep(0.3, 0.5, edgeDist) * params.healGlowIntensity;
    let healColor = vec3f(0.3, 0.8, 0.2) * 0.6 + vec3f(0.8, 0.7, 0.2) * 0.4;
    color = color + healColor * edgeGlow;
  }

  color = clamp(color, vec3f(0.0), vec3f(1.0));
  textureStore(outputTex, coord, vec4f(color, 1.0));
}
`;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_DAMAGE_INDICATORS = 8;
const UNIFORM_SIZE = 96;         // 24 floats
const DAMAGE_BUFFER_HEADER = 16; // 4 u32
const DAMAGE_STRUCT_SIZE = 16;   // 4 floats
const DAMAGE_BUFFER_SIZE = DAMAGE_BUFFER_HEADER + MAX_DAMAGE_INDICATORS * DAMAGE_STRUCT_SIZE;

// ---------------------------------------------------------------------------
// HapticVisualFeedback2026
// ---------------------------------------------------------------------------

export class HapticVisualFeedback2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.width = options.width ?? 1920;
    this.height = options.height ?? 1080;
    this.maxShakeIntensity = options.maxShakeIntensity ?? 1.0;
    this.damageIndicatorDuration = options.damageIndicatorDuration ?? 0.8;
    this.lowHealthThreshold = options.lowHealthThreshold ?? 0.25;

    // Health
    this._health = 1.0;

    // Active shakes (stacked)
    this._shakes = [];

    // Impact radial blur
    this._impact = { x: 0.5, y: 0.5, intensity: 0, radius: 0.4 };

    // Damage direction indicators
    this._damageIndicators = [];

    // Hit flash
    this._hitFlash = { r: 1, g: 1, b: 1, alpha: 0, decay: 10 };

    // Healing glow
    this._healGlow = { intensity: 0, decay: 1.5 };

    // Low-health heartbeat
    this._heartbeatTimer = 0;

    // GPU resources
    this.pipeline = null;
    this.bindGroupLayout = null;
    this.uniformBuffer = null;
    this.damageBuffer = null;
    this.outputTexture = null;
    this._initialized = false;
    this._time = 0;
  }

  async initialize() {
    this._createBuffers();
    this._createPipeline();
    this._createOutputTexture();
    this._initialized = true;
  }

  _createBuffers() {
    this.uniformBuffer = this.device.createBuffer({
      size: UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.damageBuffer = this.device.createBuffer({
      size: DAMAGE_BUFFER_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  _createPipeline() {
    const shaderModule = this.device.createShaderModule({ code: HAPTIC_FEEDBACK_SHADER });
    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'rgba16float' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      ],
    });
    this.pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
      compute: { module: shaderModule, entryPoint: 'main' },
    });
  }

  _createOutputTexture() {
    if (this.outputTexture) this.outputTexture.destroy();
    this.outputTexture = this.device.createTexture({
      size: { width: this.width, height: this.height },
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
  }

  _ensureOutputTexture(width, height) {
    if (this.outputTexture && this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
    this._createOutputTexture();
  }

  // --- Trigger methods ---

  triggerShake(intensity, duration, direction) {
    const clamped = Math.min(intensity, this.maxShakeIntensity);
    this._shakes.push({
      intensity: clamped,
      initialIntensity: clamped,
      duration,
      elapsed: 0,
      dirX: direction?.x ?? direction?.[0] ?? 0,
      dirY: direction?.y ?? direction?.[1] ?? 0,
      frequency: 20 + intensity * 30,
    });
  }

  triggerImpact(screenPosition, intensity) {
    this._impact = {
      x: screenPosition.x ?? screenPosition[0] ?? 0.5,
      y: screenPosition.y ?? screenPosition[1] ?? 0.5,
      intensity: Math.min(intensity, 1.0),
      radius: 0.3 + intensity * 0.2,
    };
  }

  triggerDamage(direction, intensity) {
    if (this._damageIndicators.length >= MAX_DAMAGE_INDICATORS) {
      this._damageIndicators.shift();
    }
    const dx = direction?.x ?? direction?.[0] ?? 0;
    const dy = direction?.y ?? direction?.[1] ?? 0;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this._damageIndicators.push({
      dirX: dx / len,
      dirY: dy / len,
      intensity: Math.min(intensity, 1.0),
      age: 0,
    });
  }

  triggerHit(color) {
    const c = color ?? { r: 1, g: 1, b: 1 };
    this._hitFlash = {
      r: c.r ?? 1,
      g: c.g ?? 1,
      b: c.b ?? 1,
      alpha: 1.0,
      decay: 10, // fast ~0.1s
    };
  }

  triggerHeal(intensity = 0.6) {
    this._healGlow = {
      intensity: Math.min(intensity, 1.0),
      decay: 1.5,
    };
  }

  setHealth(healthPercent) {
    this._health = Math.max(0, Math.min(1, healthPercent));
  }

  // --- Update ---

  update(deltaTime) {
    this._time += deltaTime;

    // Update shakes
    for (let i = this._shakes.length - 1; i >= 0; i--) {
      const s = this._shakes[i];
      s.elapsed += deltaTime;
      if (s.elapsed >= s.duration) {
        this._shakes.splice(i, 1);
      } else {
        const t = s.elapsed / s.duration;
        s.intensity = s.initialIntensity * (1 - t * t); // quadratic decay
      }
    }

    // Decay impact blur
    if (this._impact.intensity > 0) {
      this._impact.intensity = Math.max(0, this._impact.intensity - deltaTime / 0.3);
    }

    // Age damage indicators
    for (let i = this._damageIndicators.length - 1; i >= 0; i--) {
      this._damageIndicators[i].age += deltaTime / this.damageIndicatorDuration;
      if (this._damageIndicators[i].age >= 1.0) {
        this._damageIndicators.splice(i, 1);
      }
    }

    // Decay hit flash
    if (this._hitFlash.alpha > 0) {
      this._hitFlash.alpha = Math.max(0, this._hitFlash.alpha - deltaTime * this._hitFlash.decay);
    }

    // Decay heal glow
    if (this._healGlow.intensity > 0) {
      this._healGlow.intensity = Math.max(0, this._healGlow.intensity - deltaTime * this._healGlow.decay);
    }

    // Heartbeat for low health pulse
    this._heartbeatTimer += deltaTime;
    const bpm = 60 + (1 - this._health) * 80; // faster at lower health
    const period = 60 / bpm;
    if (this._heartbeatTimer >= period) this._heartbeatTimer -= period;
    const heartPhase = this._heartbeatTimer / period;
    const heartPulse = Math.pow(Math.max(0, Math.sin(heartPhase * Math.PI * 2)), 6);

    // Compute combined shake
    let totalShakeX = 0, totalShakeY = 0, totalShakeIntensity = 0, maxFreq = 20;
    for (const s of this._shakes) {
      totalShakeX += s.dirX * s.intensity;
      totalShakeY += s.dirY * s.intensity;
      totalShakeIntensity += s.intensity;
      maxFreq = Math.max(maxFreq, s.frequency);
    }
    totalShakeIntensity = Math.min(totalShakeIntensity, this.maxShakeIntensity);

    // Low health factors
    const lowHealthFactor = Math.max(0, 1 - this._health / this.lowHealthThreshold);
    const isLowHealth = this._health < this.lowHealthThreshold;

    // Write uniform buffer
    const data = new Float32Array(UNIFORM_SIZE / 4);
    data[0] = this.width;
    data[1] = this.height;
    data[2] = this._time;
    data[3] = this._health;
    data[4] = totalShakeX * 0.01;
    data[5] = totalShakeY * 0.01;
    data[6] = totalShakeIntensity * 0.015;
    data[7] = maxFreq;
    data[8] = this._impact.x;
    data[9] = this._impact.y;
    data[10] = this._impact.intensity;
    data[11] = this._impact.radius;
    data[12] = this._hitFlash.r;
    data[13] = this._hitFlash.g;
    data[14] = this._hitFlash.b;
    data[15] = this._hitFlash.alpha;
    data[16] = this._healGlow.intensity;
    data[17] = isLowHealth ? lowHealthFactor * 0.8 : 0;   // vignette
    data[18] = isLowHealth ? lowHealthFactor * 0.7 : 0;   // desaturation
    data[19] = isLowHealth ? lowHealthFactor * 0.15 : 0;  // grain
    data[20] = isLowHealth ? heartPulse * lowHealthFactor : 0;  // pulse
    data[21] = isLowHealth ? lowHealthFactor * 0.5 : 0;   // chromatic aberration
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);

    // Write damage buffer
    const dmgData = new Float32Array(DAMAGE_BUFFER_SIZE / 4);
    const count = Math.min(this._damageIndicators.length, MAX_DAMAGE_INDICATORS);
    dmgData[0] = count;
    for (let i = 0; i < count; i++) {
      const base = 4 + i * 4;
      dmgData[base] = this._damageIndicators[i].dirX;
      dmgData[base + 1] = this._damageIndicators[i].dirY;
      dmgData[base + 2] = this._damageIndicators[i].intensity;
      dmgData[base + 3] = this._damageIndicators[i].age;
    }
    this.device.queue.writeBuffer(this.damageBuffer, 0, dmgData);
  }

  applyEffects(commandEncoder, inputTexture) {
    if (!this._initialized) return;

    const width = inputTexture.width;
    const height = inputTexture.height;
    this._ensureOutputTexture(width, height);

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: inputTexture.createView() },
        { binding: 1, resource: this.outputTexture.createView() },
        { binding: 2, resource: { buffer: this.uniformBuffer } },
        { binding: 3, resource: { buffer: this.damageBuffer } },
      ],
    });

    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(width / 16), Math.ceil(height / 16));
    pass.end();
  }

  getOutputTexture() {
    return this.outputTexture;
  }

  dispose() {
    if (this.uniformBuffer) { this.uniformBuffer.destroy(); this.uniformBuffer = null; }
    if (this.damageBuffer) { this.damageBuffer.destroy(); this.damageBuffer = null; }
    if (this.outputTexture) { this.outputTexture.destroy(); this.outputTexture = null; }
    this._shakes.length = 0;
    this._damageIndicators.length = 0;
    this._initialized = false;
  }
}
