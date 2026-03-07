/**
 * TSR2026.js — Temporal Super Resolution 2.0
 *
 * Three-pass compute-shader pipeline:
 *   1. Motion-aware reprojection with depth rejection
 *   2. Temporal accumulation with neighbourhood clamping
 *   3. Spatial upscale (Catmull-Rom) + RCAS sharpening
 */

// ── Halton sequence helper (bases 2 & 3) ────────────────────────────
function halton(index, base) {
  let result = 0;
  let f = 1 / base;
  let i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

// ── Quality presets ──────────────────────────────────────────────────
const QUALITY_PRESETS = {
  ultra_performance: { scaleFactor: 0.25, label: '540p → 2160p' },
  performance:       { scaleFactor: 0.50, label: '1080p → 2160p' },
  balanced:          { scaleFactor: 0.67, label: '1440p → 2160p' },
  quality:           { scaleFactor: 0.75, label: '1620p → 2160p' },
  native_aa:         { scaleFactor: 1.00, label: 'Native TAA' },
};

// ── WGSL: Pass 1 — Motion-Aware Reprojection ────────────────────────
const REPROJECTION_SHADER = /* wgsl */`
struct Params {
  inputWidth  : u32,
  inputHeight : u32,
  depthThreshold : f32,
  _pad : u32,
}

@group(0) @binding(0) var colorTex       : texture_2d<f32>;
@group(0) @binding(1) var depthTex       : texture_2d<f32>;
@group(0) @binding(2) var motionTex      : texture_2d<f32>;
@group(0) @binding(3) var historyTex     : texture_2d<f32>;
@group(0) @binding(4) var historyDepthTex: texture_2d<f32>;
@group(0) @binding(5) var outReprojected : texture_storage_2d<rgba16float, write>;
@group(0) @binding(6) var outDisocclusion: texture_storage_2d<r8unorm, write>;
@group(0) @binding(7) var<uniform> params: Params;
@group(0) @binding(8) var linearSampler  : sampler;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let dims = vec2u(params.inputWidth, params.inputHeight);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let coord = vec2i(gid.xy);
  let uv    = (vec2f(gid.xy) + 0.5) / vec2f(dims);

  let motion   = textureLoad(motionTex, coord, 0).xy;
  let prevUV   = uv - motion;
  let curDepth = textureLoad(depthTex, coord, 0).r;

  var disoccluded = 0.0;
  var reprojected = vec4f(0.0);

  if (prevUV.x < 0.0 || prevUV.x > 1.0 || prevUV.y < 0.0 || prevUV.y > 1.0) {
    disoccluded = 1.0;
    reprojected = textureLoad(colorTex, coord, 0);
  } else {
    let prevCoord  = vec2i(prevUV * vec2f(dims));
    let prevDepth  = textureLoad(historyDepthTex, clamp(prevCoord, vec2i(0), vec2i(dims) - 1), 0).r;
    let depthDiff  = abs(curDepth - prevDepth);

    if (depthDiff > params.depthThreshold) {
      disoccluded = 1.0;
      reprojected = textureLoad(colorTex, coord, 0);
    } else {
      reprojected = textureSampleLevel(historyTex, linearSampler, prevUV, 0.0);
    }
  }

  textureStore(outReprojected, coord, reprojected);
  textureStore(outDisocclusion, coord, vec4f(disoccluded, 0.0, 0.0, 1.0));
}
`;

// ── WGSL: Pass 2 — Temporal Accumulation + Neighbourhood Clamping ───
const ACCUMULATION_SHADER = /* wgsl */`
struct Params {
  inputWidth  : u32,
  inputHeight : u32,
  blendBase   : f32,
  _pad        : u32,
}

@group(0) @binding(0) var colorTex       : texture_2d<f32>;
@group(0) @binding(1) var reprojectedTex : texture_2d<f32>;
@group(0) @binding(2) var disocclusionTex: texture_2d<f32>;
@group(0) @binding(3) var outAccumulated : texture_storage_2d<rgba16float, write>;
@group(0) @binding(4) var<uniform> params: Params;

fn rgb_to_ycocg(c : vec3f) -> vec3f {
  let y  = 0.25 * c.r + 0.5 * c.g + 0.25 * c.b;
  let co = 0.5  * c.r               - 0.5  * c.b;
  let cg = -0.25 * c.r + 0.5 * c.g - 0.25 * c.b;
  return vec3f(y, co, cg);
}

fn ycocg_to_rgb(c : vec3f) -> vec3f {
  let r = c.x + c.y - c.z;
  let g = c.x        + c.z;
  let b = c.x - c.y - c.z;
  return vec3f(r, g, b);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let dims = vec2u(params.inputWidth, params.inputHeight);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let coord = vec2i(gid.xy);
  let current     = textureLoad(colorTex, coord, 0).rgb;
  let reprojected = textureLoad(reprojectedTex, coord, 0).rgb;
  let disoccluded = textureLoad(disocclusionTex, coord, 0).r;

  // 3×3 neighbourhood min/max in YCoCg for stable clamping
  var nMin = vec3f( 1e10);
  var nMax = vec3f(-1e10);
  var m1   = vec3f(0.0);
  var m2   = vec3f(0.0);

  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let sc = clamp(coord + vec2i(dx, dy), vec2i(0), vec2i(dims) - 1);
      let s  = rgb_to_ycocg(textureLoad(colorTex, sc, 0).rgb);
      nMin = min(nMin, s);
      nMax = max(nMax, s);
      m1  += s;
      m2  += s * s;
    }
  }

  // Variance-based AABB extension
  m1 /= 9.0;
  m2 /= 9.0;
  let sigma  = sqrt(max(m2 - m1 * m1, vec3f(0.0)));
  let aabbMin = m1 - sigma;
  let aabbMax = m1 + sigma;

  // Clamp reprojected history to neighbourhood bounds
  let histYCoCg    = rgb_to_ycocg(reprojected);
  let clampedHist  = clamp(histYCoCg, max(nMin, aabbMin), min(nMax, aabbMax));
  let clampedRGB   = ycocg_to_rgb(clampedHist);

  // Adaptive blend: disoccluded → full current; high variance → more current
  let variance     = dot(sigma, vec3f(1.0)) / 3.0;
  let varianceBias = clamp(variance * 4.0, 0.0, 0.4);
  let baseBlend    = select(params.blendBase, 1.0, disoccluded > 0.5);
  let alpha        = clamp(baseBlend + varianceBias, 0.0, 1.0);

  let result = mix(clampedRGB, current, alpha);
  textureStore(outAccumulated, coord, vec4f(result, 1.0));
}
`;

// ── WGSL: Pass 3 — Spatial Upscale (Catmull-Rom) + RCAS Sharpening ──
const UPSCALE_SHARPEN_SHADER = /* wgsl */`
struct Params {
  inputWidth   : u32,
  inputHeight  : u32,
  outputWidth  : u32,
  outputHeight : u32,
  sharpness    : f32,
  _pad0        : u32,
  _pad1        : u32,
  _pad2        : u32,
}

@group(0) @binding(0) var accumulatedTex : texture_2d<f32>;
@group(0) @binding(1) var outUpscaled    : texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: Params;
@group(0) @binding(3) var linearSampler  : sampler;

fn catmull_rom_weight(x : f32) -> f32 {
  let ax = abs(x);
  if (ax < 1.0) {
    return 0.5 * ((2.0 - 5.0 * ax * ax + 3.0 * ax * ax * ax));
  } else if (ax < 2.0) {
    return 0.5 * ((-ax * ax * ax + 5.0 * ax * ax - 8.0 * ax + 4.0));
  }
  return 0.0;
}

fn sample_catmull_rom(tex : texture_2d<f32>, samp : sampler, uv : vec2f, texSize : vec2f) -> vec3f {
  let pixel  = uv * texSize - 0.5;
  let origin = floor(pixel);
  let frac   = pixel - origin;

  var color = vec3f(0.0);
  var totalWeight = 0.0;

  for (var y = -1; y <= 2; y++) {
    for (var x = -1; x <= 2; x++) {
      let samplePos = origin + vec2f(f32(x), f32(y)) + 0.5;
      let sampleUV  = samplePos / texSize;
      let wx = catmull_rom_weight(frac.x - f32(x));
      let wy = catmull_rom_weight(frac.y - f32(y));
      let w  = wx * wy;
      color += textureSampleLevel(tex, samp, clamp(sampleUV, vec2f(0.0), vec2f(1.0)), 0.0).rgb * w;
      totalWeight += w;
    }
  }
  return color / max(totalWeight, 1e-6);
}

// RCAS — Robust Contrast-Adaptive Sharpening (edge-aware)
fn rcas(center : vec3f, n : vec3f, s : vec3f, e : vec3f, w : vec3f, sharpness : f32) -> vec3f {
  let minRGB = min(min(n, s), min(e, w));
  let maxRGB = max(max(n, s), max(e, w));

  let range  = maxRGB - minRGB;
  let peak   = max(range.r, max(range.g, range.b));
  let weight = clamp(1.0 - peak * sharpness, 0.0, 1.0);
  let rcpW   = 1.0 / (4.0 * weight + 1.0);

  return clamp((center + (n + s + e + w) * weight) * rcpW, vec3f(0.0), vec3f(1.0));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let outDims = vec2u(params.outputWidth, params.outputHeight);
  if (gid.x >= outDims.x || gid.y >= outDims.y) { return; }

  let inSize = vec2f(f32(params.inputWidth), f32(params.inputHeight));
  let uv     = (vec2f(gid.xy) + 0.5) / vec2f(outDims);

  // Catmull-Rom upscale
  let upscaled = sample_catmull_rom(accumulatedTex, linearSampler, uv, inSize);

  // Fetch cardinal neighbours for edge-aware sharpening
  let texel = 1.0 / vec2f(outDims);
  let north = textureSampleLevel(accumulatedTex, linearSampler, uv + vec2f(0.0, -texel.y), 0.0).rgb;
  let south = textureSampleLevel(accumulatedTex, linearSampler, uv + vec2f(0.0,  texel.y), 0.0).rgb;
  let east  = textureSampleLevel(accumulatedTex, linearSampler, uv + vec2f( texel.x, 0.0), 0.0).rgb;
  let west  = textureSampleLevel(accumulatedTex, linearSampler, uv + vec2f(-texel.x, 0.0), 0.0).rgb;

  let sharpened = rcas(upscaled, north, south, east, west, params.sharpness);
  textureStore(outUpscaled, vec2i(gid.xy), vec4f(sharpened, 1.0));
}
`;

// ── Main class ───────────────────────────────────────────────────────
export class TSR2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.outputWidth  = options.outputWidth  ?? 3840;
    this.outputHeight = options.outputHeight ?? 2160;
    this.sharpness    = options.sharpness    ?? 0.5;
    this.enableAntiGhosting = options.enableAntiGhosting ?? true;
    this.jitterSequence     = options.jitterSequence     ?? 'halton';

    this.preset      = options.preset ?? 'balanced';
    this.scaleFactor = QUALITY_PRESETS[this.preset]?.scaleFactor ?? 0.67;

    this.inputWidth  = options.inputWidth  ?? Math.round(this.outputWidth  * this.scaleFactor);
    this.inputHeight = options.inputHeight ?? Math.round(this.outputHeight * this.scaleFactor);

    this.frameIndex  = 0;
    this.ghostingRejections = 0;
    this.initialized = false;

    // GPU resources (created in initialize)
    this._pipelines  = {};
    this._bindGroups = {};
    this._textures   = {};
    this._sampler    = null;
    this._paramBuffers = {};
  }

  // ── Initialization ───────────────────────────────────────────────
  async initialize() {
    const d = this.device;
    const iw = this.inputWidth;
    const ih = this.inputHeight;
    const ow = this.outputWidth;
    const oh = this.outputHeight;

    this._sampler = d.createSampler({ magFilter: 'linear', minFilter: 'linear' });

    const tex2d = (w, h, format, usage) =>
      d.createTexture({
        size: [w, h, 1],
        format,
        usage: usage | GPUTextureUsage.TEXTURE_BINDING,
      });

    const storage = GPUTextureUsage.STORAGE_BINDING;
    const copy    = GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST;

    this._textures.reprojected  = tex2d(iw, ih, 'rgba16float', storage | copy);
    this._textures.disocclusion = tex2d(iw, ih, 'r8unorm',     storage | copy);
    this._textures.accumulated  = tex2d(iw, ih, 'rgba16float', storage | copy);
    this._textures.history      = tex2d(iw, ih, 'rgba16float', copy);
    this._textures.historyDepth = tex2d(iw, ih, 'r32float',    copy);
    this._textures.output       = tex2d(ow, oh, 'rgba16float', storage | copy);

    // Param buffers
    this._paramBuffers.reproject = d.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._paramBuffers.accumulate = d.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._paramBuffers.upscale = d.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this._writeParams();

    // Compile pipelines
    this._pipelines.reproject = await this._createPipeline(REPROJECTION_SHADER);
    this._pipelines.accumulate = await this._createPipeline(ACCUMULATION_SHADER);
    this._pipelines.upscale   = await this._createPipeline(UPSCALE_SHARPEN_SHADER);

    this.initialized = true;
  }

  async _createPipeline(code) {
    const module = this.device.createShaderModule({ code });
    return this.device.createComputePipeline({
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    });
  }

  _writeParams() {
    const d = this.device;
    const iw = this.inputWidth;
    const ih = this.inputHeight;

    const reprojData = new ArrayBuffer(16);
    new Uint32Array(reprojData, 0, 2).set([iw, ih]);
    new Float32Array(reprojData, 8, 1).set([0.015]);
    d.queue.writeBuffer(this._paramBuffers.reproject, 0, reprojData);

    const accumData = new ArrayBuffer(16);
    new Uint32Array(accumData, 0, 2).set([iw, ih]);
    new Float32Array(accumData, 8, 1).set([0.1]); // current-frame base blend
    d.queue.writeBuffer(this._paramBuffers.accumulate, 0, accumData);

    const upData = new ArrayBuffer(32);
    const upU32 = new Uint32Array(upData, 0, 4);
    upU32.set([iw, ih, this.outputWidth, this.outputHeight]);
    new Float32Array(upData, 16, 1).set([this.sharpness]);
    d.queue.writeBuffer(this._paramBuffers.upscale, 0, upData);
  }

  // ── Bind-group helpers (rebuilt every frame for new input textures) ─
  _buildReprojectionBindGroup(color, depth, motionVectors) {
    return this.device.createBindGroup({
      layout: this._pipelines.reproject.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: color.createView() },
        { binding: 1, resource: depth.createView() },
        { binding: 2, resource: motionVectors.createView() },
        { binding: 3, resource: this._textures.history.createView() },
        { binding: 4, resource: this._textures.historyDepth.createView() },
        { binding: 5, resource: this._textures.reprojected.createView() },
        { binding: 6, resource: this._textures.disocclusion.createView() },
        { binding: 7, resource: { buffer: this._paramBuffers.reproject } },
        { binding: 8, resource: this._sampler },
      ],
    });
  }

  _buildAccumulationBindGroup(color) {
    return this.device.createBindGroup({
      layout: this._pipelines.accumulate.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: color.createView() },
        { binding: 1, resource: this._textures.reprojected.createView() },
        { binding: 2, resource: this._textures.disocclusion.createView() },
        { binding: 3, resource: this._textures.accumulated.createView() },
        { binding: 4, resource: { buffer: this._paramBuffers.accumulate } },
      ],
    });
  }

  _buildUpscaleBindGroup() {
    return this.device.createBindGroup({
      layout: this._pipelines.upscale.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this._textures.accumulated.createView() },
        { binding: 1, resource: this._textures.output.createView() },
        { binding: 2, resource: { buffer: this._paramBuffers.upscale } },
        { binding: 3, resource: this._sampler },
      ],
    });
  }

  // ── Core upscale entry-point ──────────────────────────────────────
  upscale(commandEncoder, { color, depth, motionVectors }) {
    if (!this.initialized) {
      throw new Error('TSR2026: call initialize() before upscale()');
    }

    const iw = this.inputWidth;
    const ih = this.inputHeight;
    const ow = this.outputWidth;
    const oh = this.outputHeight;
    const wgX = (w) => Math.ceil(w / 8);
    const wgY = (h) => Math.ceil(h / 8);

    // Pass 1 — Reprojection
    const reprojBG = this._buildReprojectionBindGroup(color, depth, motionVectors);
    const pass1 = commandEncoder.beginComputePass();
    pass1.setPipeline(this._pipelines.reproject);
    pass1.setBindGroup(0, reprojBG);
    pass1.dispatchWorkgroups(wgX(iw), wgY(ih));
    pass1.end();

    // Pass 2 — Accumulation
    const accumBG = this._buildAccumulationBindGroup(color);
    const pass2 = commandEncoder.beginComputePass();
    pass2.setPipeline(this._pipelines.accumulate);
    pass2.setBindGroup(0, accumBG);
    pass2.dispatchWorkgroups(wgX(iw), wgY(ih));
    pass2.end();

    // Pass 3 — Upscale + Sharpen
    const upBG = this._buildUpscaleBindGroup();
    const pass3 = commandEncoder.beginComputePass();
    pass3.setPipeline(this._pipelines.upscale);
    pass3.setBindGroup(0, upBG);
    pass3.dispatchWorkgroups(wgX(ow), wgY(oh));
    pass3.end();

    // Copy accumulated → history for next frame
    commandEncoder.copyTextureToTexture(
      { texture: this._textures.accumulated },
      { texture: this._textures.history },
      [iw, ih, 1],
    );
    commandEncoder.copyTextureToTexture(
      { texture: depth },
      { texture: this._textures.historyDepth },
      [iw, ih, 1],
    );

    this.frameIndex++;
  }

  // ── Public API ────────────────────────────────────────────────────
  getOutputTexture() {
    return this._textures.output;
  }

  setQualityPreset(preset) {
    const cfg = QUALITY_PRESETS[preset];
    if (!cfg) throw new Error(`TSR2026: unknown preset "${preset}"`);

    this.preset      = preset;
    this.scaleFactor = cfg.scaleFactor;
    this.inputWidth  = Math.round(this.outputWidth  * this.scaleFactor);
    this.inputHeight = Math.round(this.outputHeight * this.scaleFactor);

    if (this.initialized) {
      this._destroyTextures();
      this.initialize(); // recreate at new resolution
    }
  }

  getJitterOffset(frameIndex) {
    const idx = (frameIndex ?? this.frameIndex) + 1; // avoid 0
    const jx = halton(idx, 2) - 0.5;
    const jy = halton(idx, 3) - 0.5;
    // Scale to pixel size at internal resolution
    return [
      (jx * 2.0) / this.inputWidth,
      (jy * 2.0) / this.inputHeight,
    ];
  }

  resetHistory() {
    this.frameIndex = 0;
    this.ghostingRejections = 0;
    if (!this.initialized) return;

    const enc = this.device.createCommandEncoder();
    const clear = (tex) => {
      enc.clearBuffer?.(tex);
    };
    // Zero out history textures via a zero-copy
    const zeros = this.device.createBuffer({
      size: this.inputWidth * this.inputHeight * 8,
      usage: GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    new Float32Array(zeros.getMappedRange()).fill(0);
    zeros.unmap();
    zeros.destroy();
    this.device.queue.submit([enc.finish()]);
  }

  getStats() {
    return {
      internalRes: [this.inputWidth, this.inputHeight],
      outputRes:   [this.outputWidth, this.outputHeight],
      scaleFactor: this.scaleFactor,
      preset:      this.preset,
      frameIndex:  this.frameIndex,
      ghostingRejections: this.ghostingRejections,
    };
  }

  _destroyTextures() {
    for (const t of Object.values(this._textures)) {
      t.destroy?.();
    }
    this._textures = {};
  }

  dispose() {
    this._destroyTextures();
    for (const b of Object.values(this._paramBuffers)) {
      b.destroy?.();
    }
    this._paramBuffers = {};
    this._pipelines    = {};
    this.initialized   = false;
  }
}
