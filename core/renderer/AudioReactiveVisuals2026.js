/**
 * AudioReactiveVisuals2026 — Audio-Reactive Visual Effects System
 * Unified WebGPU compute post-process driven by real-time audio analysis.
 *
 * Effects:
 *  - Music-driven bloom modulation
 *  - Heartbeat-synced vignette pulsing
 *  - Jump-scare flash with chromatic aberration burst
 *  - Ambient fog density linked to audio intensity
 *  - Footstep ripples on surfaces
 *  - Bass-driven screen shake displacement
 *  - Music intensity color grading shift (warm → cold)
 */

// ---------------------------------------------------------------------------
// WGSL Shader Source
// ---------------------------------------------------------------------------

const AUDIO_REACTIVE_SHADER = /* wgsl */ `
struct AudioParams {
  resolution:          vec2f,
  bassEnergy:          f32,
  midEnergy:           f32,
  highEnergy:          f32,
  rms:                 f32,
  beatDetected:        f32,
  heartbeatPhase:      f32,

  vignetteIntensity:   f32,
  bloomModulator:      f32,
  chromaticAberration: f32,
  bassShakeX:          f32,
  bassShakeY:          f32,
  colorGradeShift:     f32,
  flashIntensity:      f32,
  fogDensity:          f32,

  time:                f32,
  _pad0:               f32,
  _pad1:               f32,
  _pad2:               f32,
};

struct Ripple {
  posX: f32,
  posY: f32,
  age:  f32,
  strength: f32,
};

struct RippleBuffer {
  count: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
  ripples: array<Ripple, 16>,
};

@group(0) @binding(0) var inputTex:  texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: AudioParams;
@group(0) @binding(3) var<storage, read> ripples: RippleBuffer;

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}

fn sampleTex(coord: vec2i) -> vec3f {
  let dims = vec2i(textureDimensions(inputTex));
  let clamped = clamp(coord, vec2i(0), dims - vec2i(1));
  return textureLoad(inputTex, clamped, 0).rgb;
}

fn applyVignette(color: vec3f, uv: vec2f, intensity: f32) -> vec3f {
  let center = uv - vec2f(0.5);
  let dist = length(center);
  let vig = 1.0 - smoothstep(0.2, 0.9, dist) * intensity;
  return color * vig;
}

fn applyBloom(color: vec3f, uv: vec2f, coord: vec2i, modulator: f32) -> vec3f {
  let threshold = max(0.6 - modulator * 0.4, 0.1);
  var bloom = vec3f(0.0);
  let offsets = array<vec2i, 8>(
    vec2i(-2, 0), vec2i(2, 0), vec2i(0, -2), vec2i(0, 2),
    vec2i(-1, -1), vec2i(1, -1), vec2i(-1, 1), vec2i(1, 1)
  );
  for (var i = 0u; i < 8u; i++) {
    let s = sampleTex(coord + offsets[i] * 3);
    let bright = max(luminance(s) - threshold, 0.0);
    bloom += s * bright;
  }
  bloom = bloom / 8.0 * modulator * 0.5;
  return color + bloom;
}

fn applyChromaticAberration(coord: vec2i, uv: vec2f, strength: f32) -> vec3f {
  let center = uv - vec2f(0.5);
  let offset = vec2i(vec2f(center * strength * 12.0));
  let r = sampleTex(coord + offset).r;
  let g = sampleTex(coord).g;
  let b = sampleTex(coord - offset).b;
  return vec3f(r, g, b);
}

fn applyBassDisplacement(coord: vec2i, shakeX: f32, shakeY: f32) -> vec3f {
  let offset = vec2i(i32(shakeX * 6.0), i32(shakeY * 6.0));
  return sampleTex(coord + offset);
}

fn applyColorGrade(color: vec3f, shift: f32) -> vec3f {
  let warm = color * vec3f(1.05, 1.0, 0.92);
  let cold = vec3f(luminance(color) * 0.7 + color.r * 0.15,
                   luminance(color) * 0.7 + color.g * 0.1,
                   luminance(color) * 0.8 + color.b * 0.3);
  return mix(warm, cold, clamp(shift, 0.0, 1.0));
}

fn applyRipples(uv: vec2f, coord: vec2i) -> vec3f {
  var totalOffset = vec2f(0.0);
  let count = min(ripples.count, 16u);
  for (var i = 0u; i < count; i++) {
    let r = ripples.ripples[i];
    let rpos = vec2f(r.posX, r.posY);
    let dist = distance(uv, rpos);
    let wave = sin(dist * 60.0 - r.age * 10.0) * exp(-dist * 8.0) * exp(-r.age * 3.0);
    let dir = normalize(uv - rpos + vec2f(0.0001));
    totalOffset += dir * wave * r.strength * 0.015;
  }
  let displaced = vec2i(vec2f(coord) + totalOffset * params.resolution);
  return sampleTex(displaced);
}

fn applyFlash(color: vec3f, intensity: f32) -> vec3f {
  return mix(color, vec3f(1.0), intensity);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let dims = vec2i(textureDimensions(inputTex));
  let coord = vec2i(gid.xy);
  if (coord.x >= dims.x || coord.y >= dims.y) { return; }

  let uv = (vec2f(coord) + 0.5) / vec2f(dims);

  // Bass displacement
  var color = applyBassDisplacement(coord, params.bassShakeX, params.bassShakeY);

  // Footstep ripples
  if (ripples.count > 0u) {
    color = mix(color, applyRipples(uv, coord), 0.6);
  }

  // Chromatic aberration (jumpscare or baseline)
  if (params.chromaticAberration > 0.01) {
    color = applyChromaticAberration(coord, uv, params.chromaticAberration);
  }

  // Bloom modulation from bass
  color = applyBloom(color, uv, coord, params.bloomModulator);

  // Heartbeat vignette
  color = applyVignette(color, uv, params.vignetteIntensity);

  // Color grading shift
  color = applyColorGrade(color, params.colorGradeShift);

  // Fog density overlay
  let fogAmount = params.fogDensity * 0.3;
  let fogColor = vec3f(0.02, 0.02, 0.03);
  color = mix(color, fogColor, fogAmount * (0.5 + 0.5 * uv.y));

  // Flash overlay (jumpscare)
  color = applyFlash(color, params.flashIntensity);

  textureStore(outputTex, coord, vec4f(color, 1.0));
}
`;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RIPPLES = 16;
const RIPPLE_STRUCT_SIZE = 16; // 4 floats
const UNIFORM_SIZE = 80;      // 20 floats padded to 80 bytes
const RIPPLE_BUFFER_HEADER = 16;
const RIPPLE_BUFFER_SIZE = RIPPLE_BUFFER_HEADER + MAX_RIPPLES * RIPPLE_STRUCT_SIZE;

// ---------------------------------------------------------------------------
// AudioReactiveVisuals2026
// ---------------------------------------------------------------------------

export class AudioReactiveVisuals2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.fftSize = options.fftSize ?? 2048;
    this.smoothingFactor = options.smoothingFactor ?? 0.8;
    this.enableHeartbeat = options.enableHeartbeat ?? true;
    this.enableJumpscareFlash = options.enableJumpscareFlash ?? true;
    this.enableMusicDrivenEffects = options.enableMusicDrivenEffects ?? true;
    this.enableFootstepRipples = options.enableFootstepRipples ?? true;

    this.analyser = null;
    this.frequencyData = null;
    this.timeData = null;

    // Audio analysis state
    this.bass = 0;
    this.mid = 0;
    this.high = 0;
    this.rms = 0;
    this.beatDetected = false;
    this.heartbeatPhase = 0;

    // Beat detection rolling average
    this._bassHistory = new Float32Array(30);
    this._bassHistoryIdx = 0;
    this._bassRollingAvg = 0;
    this._beatCooldown = 0;

    // Heartbeat state
    this._heartbeatBPM = 72;
    this._heartbeatTimer = 0;

    // Jumpscare state
    this._flashIntensity = 0;
    this._flashDecay = 0;
    this._chromaticBurst = 0;

    // Ripples
    this._ripples = [];

    // Color grade smoothed
    this._smoothedIntensity = 0;

    // GPU resources
    this.pipeline = null;
    this.bindGroupLayout = null;
    this.uniformBuffer = null;
    this.rippleBuffer = null;
    this.outputTexture = null;
    this._initialized = false;
    this._time = 0;
  }

  async initialize(audioContext) {
    if (audioContext) {
      this._setupAnalyser(audioContext);
    }
    this._createBuffers();
    this._createPipeline();
    this._initialized = true;
  }

  connectAudioSource(audioContext, sourceNode) {
    this._setupAnalyser(audioContext);
    sourceNode.connect(this.analyser);
    this.analyser.connect(audioContext.destination);
  }

  _setupAnalyser(audioContext) {
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = this.smoothingFactor;
    const bins = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(bins);
    this.timeData = new Float32Array(bins);
  }

  _createBuffers() {
    this.uniformBuffer = this.device.createBuffer({
      size: UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.rippleBuffer = this.device.createBuffer({
      size: RIPPLE_BUFFER_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  _createPipeline() {
    const shaderModule = this.device.createShaderModule({ code: AUDIO_REACTIVE_SHADER });
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

  _ensureOutputTexture(width, height) {
    if (this.outputTexture && this.outputTexture.width === width && this.outputTexture.height === height) {
      return;
    }
    if (this.outputTexture) this.outputTexture.destroy();
    this.outputTexture = this.device.createTexture({
      size: { width, height },
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
  }

  // --- Audio analysis ---

  _analyzeAudio() {
    if (!this.analyser) {
      this.bass = 0; this.mid = 0; this.high = 0; this.rms = 0;
      this.beatDetected = false;
      return;
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getFloatTimeDomainData(this.timeData);

    const bins = this.frequencyData.length;
    const bassEnd = Math.floor(bins * 0.1);
    const midEnd = Math.floor(bins * 0.5);

    let bassSum = 0, midSum = 0, highSum = 0;
    for (let i = 0; i < bins; i++) {
      const v = this.frequencyData[i] / 255;
      if (i < bassEnd) bassSum += v;
      else if (i < midEnd) midSum += v;
      else highSum += v;
    }
    this.bass = bassSum / bassEnd;
    this.mid = midSum / (midEnd - bassEnd);
    this.high = highSum / (bins - midEnd);

    // RMS from time-domain data
    let sumSq = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      sumSq += this.timeData[i] * this.timeData[i];
    }
    this.rms = Math.sqrt(sumSq / this.timeData.length);

    // Beat detection on bass energy
    this._bassHistory[this._bassHistoryIdx % 30] = this.bass;
    this._bassHistoryIdx++;
    let avg = 0;
    for (let i = 0; i < 30; i++) avg += this._bassHistory[i];
    this._bassRollingAvg = avg / 30;

    if (this._beatCooldown <= 0 && this.bass > this._bassRollingAvg * 1.4 && this.bass > 0.15) {
      this.beatDetected = true;
      this._beatCooldown = 0.18;
    } else {
      this.beatDetected = false;
    }
  }

  _updateHeartbeat(dt) {
    if (!this.enableHeartbeat) { this.heartbeatPhase = 0; return; }
    const period = 60 / this._heartbeatBPM;
    this._heartbeatTimer += dt;
    if (this._heartbeatTimer >= period) this._heartbeatTimer -= period;
    this.heartbeatPhase = this._heartbeatTimer / period;
  }

  _updateJumpscare(dt) {
    if (this._flashIntensity > 0) {
      this._flashIntensity = Math.max(0, this._flashIntensity - dt * this._flashDecay);
    }
    if (this._chromaticBurst > 0) {
      this._chromaticBurst = Math.max(0, this._chromaticBurst - dt * 4.0);
    }
  }

  _updateRipples(dt) {
    for (let i = this._ripples.length - 1; i >= 0; i--) {
      this._ripples[i].age += dt;
      if (this._ripples[i].age > 2.0) this._ripples.splice(i, 1);
    }
  }

  // --- Public update ---

  update(deltaTime) {
    this._time += deltaTime;

    this._analyzeAudio();
    this._updateHeartbeat(deltaTime);
    this._updateJumpscare(deltaTime);
    this._updateRipples(deltaTime);

    if (this._beatCooldown > 0) this._beatCooldown -= deltaTime;

    // Smooth intensity for color grading
    const target = this.rms;
    this._smoothedIntensity += (target - this._smoothedIntensity) * Math.min(1, deltaTime * 3);

    // Compute heartbeat vignette pulse
    const heartPulse = Math.pow(Math.max(0, Math.sin(this.heartbeatPhase * Math.PI * 2)), 4);
    const vignetteBase = 0.3 + heartPulse * 0.5;

    // Write uniform buffer
    const data = new Float32Array(UNIFORM_SIZE / 4);
    data[0] = this.outputTexture ? this.outputTexture.width : 1920;
    data[1] = this.outputTexture ? this.outputTexture.height : 1080;
    data[2] = this.bass;
    data[3] = this.mid;
    data[4] = this.high;
    data[5] = this.rms;
    data[6] = this.beatDetected ? 1.0 : 0.0;
    data[7] = this.heartbeatPhase;
    data[8] = this.enableHeartbeat ? vignetteBase : 0.2;
    data[9] = this.enableMusicDrivenEffects ? this.bass * 1.5 : 0.0;
    data[10] = this._chromaticBurst;
    data[11] = this.bass * Math.sin(this._time * 30) * 0.3;  // bassShakeX
    data[12] = this.bass * Math.cos(this._time * 25) * 0.3;  // bassShakeY
    data[13] = this._smoothedIntensity;  // colorGradeShift
    data[14] = this._flashIntensity;
    data[15] = this.enableMusicDrivenEffects ? 0.2 + this.rms * 0.8 : 0.2; // fogDensity
    data[16] = this._time;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);

    // Write ripple buffer
    const rippleData = new Float32Array(RIPPLE_BUFFER_SIZE / 4);
    const count = Math.min(this._ripples.length, MAX_RIPPLES);
    rippleData[0] = count;
    for (let i = 0; i < count; i++) {
      const base = 4 + i * 4; // header is 4 floats
      rippleData[base] = this._ripples[i].posX;
      rippleData[base + 1] = this._ripples[i].posY;
      rippleData[base + 2] = this._ripples[i].age;
      rippleData[base + 3] = this._ripples[i].strength;
    }
    this.device.queue.writeBuffer(this.rippleBuffer, 0, rippleData);
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
        { binding: 3, resource: { buffer: this.rippleBuffer } },
      ],
    });

    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(width / 16), Math.ceil(height / 16));
    pass.end();
  }

  // --- Trigger methods ---

  triggerJumpscare(intensity = 1.0) {
    if (!this.enableJumpscareFlash) return;
    this._flashIntensity = Math.min(intensity, 1.0);
    this._flashDecay = 5.0 + intensity * 3.0;
    this._chromaticBurst = intensity * 0.8;
  }

  triggerFootstepRipple(worldPosition) {
    if (!this.enableFootstepRipples) return;
    if (this._ripples.length >= MAX_RIPPLES) this._ripples.shift();
    this._ripples.push({
      posX: worldPosition.x ?? worldPosition[0] ?? 0.5,
      posY: worldPosition.y ?? worldPosition[1] ?? 0.5,
      age: 0,
      strength: 1.0,
    });
  }

  setHeartbeatBPM(bpm) {
    this._heartbeatBPM = Math.max(20, Math.min(220, bpm));
  }

  getOutputTexture() {
    return this.outputTexture;
  }

  getAudioData() {
    return {
      bass: this.bass,
      mid: this.mid,
      high: this.high,
      rms: this.rms,
      beatDetected: this.beatDetected,
      heartbeatPhase: this.heartbeatPhase,
    };
  }

  dispose() {
    if (this.uniformBuffer) { this.uniformBuffer.destroy(); this.uniformBuffer = null; }
    if (this.rippleBuffer) { this.rippleBuffer.destroy(); this.rippleBuffer = null; }
    if (this.outputTexture) { this.outputTexture.destroy(); this.outputTexture = null; }
    this.analyser = null;
    this.frequencyData = null;
    this.timeData = null;
    this._ripples.length = 0;
    this._initialized = false;
  }
}
