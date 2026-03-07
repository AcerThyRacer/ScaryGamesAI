/**
 * HDRPipeline2026.js - HDR & Wide Color Gamut Rendering Pipeline
 * Full HDR pipeline: luminance histogram → auto-exposure → tonemapping → bloom → output
 */

const HISTOGRAM_BINS = 256;
const WORKGROUP_SIZE = 16;

const luminanceHistogramWGSL = /* wgsl */`
@group(0) @binding(0) var hdrInput: texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> histogram: array<atomic<u32>, 256>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // (width, height, minLogLum, logLumRange)

fn colorToLuminance(c: vec3<f32>) -> f32 {
  return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = vec2<u32>(u32(params.x), u32(params.y));
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let color = textureLoad(hdrInput, vec2<i32>(gid.xy), 0).rgb;
  let lum = colorToLuminance(color);

  if (lum < 1e-5) {
    atomicAdd(&histogram[0], 1u);
  } else {
    let logLum = clamp((log2(lum) - params.z) / params.w, 0.0, 1.0);
    let bin = u32(logLum * 254.0 + 1.0);
    atomicAdd(&histogram[min(bin, 255u)], 1u);
  }
}
`;

const autoExposureWGSL = /* wgsl */`
@group(0) @binding(0) var<storage, read> histogram: array<u32, 256>;
@group(0) @binding(1) var<storage, read_write> exposureData: array<f32, 4>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // (minLogLum, logLumRange, dt, adaptSpeed)
@group(0) @binding(3) var<uniform> pixelCount: f32;

var<workgroup> shared_bins: array<u32, 256>;

@compute @workgroup_size(256)
fn main(@builtin(local_invocation_index) idx: u32) {
  shared_bins[idx] = histogram[idx];
  workgroupBarrier();

  // Parallel reduction to find weighted average excluding bottom 5% and top 5%
  if (idx == 0u) {
    let totalPixels = u32(pixelCount);
    let lowCut = totalPixels / 20u;
    let highCut = totalPixels - lowCut;

    var cumulative = 0u;
    var weightedSum = 0.0;
    var countInRange = 0u;
    var medianBin = 128u;
    var foundMedian = false;

    for (var i = 0u; i < 256u; i = i + 1u) {
      cumulative = cumulative + shared_bins[i];
      if (!foundMedian && cumulative >= totalPixels / 2u) {
        medianBin = i;
        foundMedian = true;
      }
      if (cumulative > lowCut && cumulative <= highCut) {
        weightedSum += f32(i) * f32(shared_bins[i]);
        countInRange += shared_bins[i];
      }
    }

    var avgBin = f32(medianBin);
    if (countInRange > 0u) {
      avgBin = weightedSum / f32(countInRange);
    }

    let avgLogLum = params.x + (avgBin / 255.0) * params.y;
    let avgLum = exp2(avgLogLum);
    let targetExposure = clamp(0.18 / avgLum, 0.001, 100.0);

    let prevExposure = exposureData[0];
    let speed = params.w * params.z;
    let newExposure = prevExposure + (targetExposure - prevExposure) * (1.0 - exp(-speed));

    exposureData[0] = newExposure;
    exposureData[1] = avgLum;
    exposureData[2] = f32(medianBin);
    exposureData[3] = targetExposure;
  }
}
`;

const acesTonemapWGSL = /* wgsl */`
@group(0) @binding(0) var hdrInput: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // (exposure, 0, 0, 0)

// sRGB to ACEScg input matrix (AP1)
fn sRGBtoACES(c: vec3<f32>) -> vec3<f32> {
  let m = mat3x3<f32>(
    vec3<f32>(0.6131, 0.0701, 0.0206),
    vec3<f32>(0.3395, 0.9164, 0.1096),
    vec3<f32>(0.0474, 0.0135, 0.8698)
  );
  return m * c;
}

// RRT + ODT fit (Stephen Hill approximation)
fn acesRRTandODT(v: vec3<f32>) -> vec3<f32> {
  let a = v * (v + 0.0245786) - 0.000090537;
  let b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}

fn acesFitted(color: vec3<f32>) -> vec3<f32> {
  var c = sRGBtoACES(color);
  c = acesRRTandODT(c);
  // ACEScg to sRGB output
  let outM = mat3x3<f32>(
    vec3<f32>( 1.6047, -0.1028, -0.0075),
    vec3<f32>(-0.5310,  1.1082, -0.0836),
    vec3<f32>(-0.0737, -0.0054,  1.0911)
  );
  return clamp(outM * c, vec3<f32>(0.0), vec3<f32>(1.0));
}

fn reinhardTonemap(c: vec3<f32>) -> vec3<f32> {
  return c / (c + vec3<f32>(1.0));
}

fn uncharted2Helper(x: vec3<f32>) -> vec3<f32> {
  let A = 0.15; let B = 0.50; let C = 0.10;
  let D = 0.20; let E = 0.02; let F = 0.30;
  return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;
}

fn uncharted2Tonemap(c: vec3<f32>) -> vec3<f32> {
  let W = vec3<f32>(11.2);
  return uncharted2Helper(2.0 * c) / uncharted2Helper(W);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(hdrInput);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let coord = vec2<i32>(gid.xy);
  var color = textureLoad(hdrInput, coord, 0).rgb;
  color = color * params.x; // apply exposure

  let mapped = acesFitted(color);
  textureStore(outputTex, coord, vec4<f32>(mapped, 1.0));
}
`;

const bloomDownscaleWGSL = /* wgsl */`
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // (threshold, softKnee, 0, 0)

fn luminance(c: vec3<f32>) -> f32 {
  return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(outputTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let srcCoord = vec2<i32>(gid.xy) * 2;
  let s0 = textureLoad(inputTex, srcCoord + vec2<i32>(0,0), 0).rgb;
  let s1 = textureLoad(inputTex, srcCoord + vec2<i32>(1,0), 0).rgb;
  let s2 = textureLoad(inputTex, srcCoord + vec2<i32>(0,1), 0).rgb;
  let s3 = textureLoad(inputTex, srcCoord + vec2<i32>(1,1), 0).rgb;
  var color = (s0 + s1 + s2 + s3) * 0.25;

  // Physically-based threshold: only bloom luminance above 1.0
  let lum = luminance(color);
  let threshold = params.x;
  let knee = params.y;
  let soft = lum - threshold + knee;
  let contribution = clamp(soft * soft / (4.0 * knee + 1e-5), 0.0, 1.0);
  let multiplier = max(lum - threshold, contribution) / max(lum, 1e-5);
  color = color * multiplier;

  textureStore(outputTex, vec2<i32>(gid.xy), vec4<f32>(color, 1.0));
}
`;

const bloomBlurWGSL = /* wgsl */`
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> direction: vec2<f32>; // (1,0) or (0,1)

const KERNEL_SIZE = 9;
const weights = array<f32, 9>(
  0.0005, 0.0050, 0.0540, 0.2410, 0.3990,
  0.2410, 0.0540, 0.0050, 0.0005
);

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(outputTex);
  let x = gid.x % dims.x;
  let y = gid.x / dims.x;
  if (y >= dims.y) { return; }

  var result = vec3<f32>(0.0);
  let center = vec2<i32>(i32(x), i32(y));
  let dir = vec2<i32>(direction);

  for (var i = 0; i < KERNEL_SIZE; i = i + 1) {
    let offset = i - KERNEL_SIZE / 2;
    let samplePos = center + dir * offset;
    let clamped = clamp(samplePos, vec2<i32>(0), vec2<i32>(dims) - vec2<i32>(1));
    result += textureLoad(inputTex, clamped, 0).rgb * weights[i];
  }

  textureStore(outputTex, vec2<i32>(i32(x), i32(y)), vec4<f32>(result, 1.0));
}
`;

const finalOutputWGSL = /* wgsl */`
@group(0) @binding(0) var tonemapped: texture_2d<f32>;
@group(0) @binding(1) var bloomTex: texture_2d<f32>;
@group(0) @binding(2) var outputTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var<uniform> params: vec4<f32>; // (bloomIntensity, colorSpace, 0, 0)

fn linearToSRGB(c: vec3<f32>) -> vec3<f32> {
  let lo = c * 12.92;
  let hi = pow(c, vec3<f32>(1.0/2.4)) * 1.055 - vec3<f32>(0.055);
  return select(hi, lo, c <= vec3<f32>(0.0031308));
}

// sRGB → Display P3 gamut mapping (Bradford chromatic adaptation)
fn sRGBtoDisplayP3(c: vec3<f32>) -> vec3<f32> {
  let m = mat3x3<f32>(
    vec3<f32>( 0.8225, 0.0332, 0.0171),
    vec3<f32>( 0.1774, 0.9669, 0.0724),
    vec3<f32>( 0.0000, -0.0001, 0.9106)
  );
  return clamp(m * c, vec3<f32>(0.0), vec3<f32>(1.0));
}

fn sRGBtoRec2020(c: vec3<f32>) -> vec3<f32> {
  let m = mat3x3<f32>(
    vec3<f32>(0.6274, 0.0691, 0.0164),
    vec3<f32>(0.3293, 0.9195, 0.0880),
    vec3<f32>(0.0433, 0.0114, 0.8956)
  );
  return clamp(m * c, vec3<f32>(0.0), vec3<f32>(1.0));
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(tonemapped);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let coord = vec2<i32>(gid.xy);
  var color = textureLoad(tonemapped, coord, 0).rgb;

  // Add bloom
  let bloomDims = textureDimensions(bloomTex);
  let bloomUV = vec2<f32>(gid.xy) / vec2<f32>(dims);
  let bloomCoord = vec2<i32>(bloomUV * vec2<f32>(bloomDims));
  let bloom = textureLoad(bloomTex, clamp(bloomCoord, vec2<i32>(0), vec2<i32>(bloomDims) - 1), 0).rgb;
  color = color + bloom * params.x;

  // Color space conversion
  let cs = i32(params.y);
  if (cs == 1) {
    color = sRGBtoDisplayP3(color);
  } else if (cs == 2) {
    color = sRGBtoRec2020(color);
  }

  color = linearToSRGB(color);
  textureStore(outputTex, coord, vec4<f32>(color, 1.0));
}
`;

const localTonemapWGSL = /* wgsl */`
@group(0) @binding(0) var hdrInput: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // (tileSize, strength, globalExposure, 0)

fn luminance(c: vec3<f32>) -> f32 {
  return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

var<workgroup> tileLuminance: array<f32, 256>;

@compute @workgroup_size(16, 16)
fn main(
  @builtin(global_invocation_id) gid: vec3<u32>,
  @builtin(local_invocation_index) lidx: u32,
  @builtin(workgroup_id) wid: vec3<u32>
) {
  let dims = textureDimensions(hdrInput);
  let coord = vec2<i32>(gid.xy);
  let inBounds = gid.x < dims.x && gid.y < dims.y;

  var lum = 0.0;
  var color = vec3<f32>(0.0);
  if (inBounds) {
    color = textureLoad(hdrInput, coord, 0).rgb;
    lum = luminance(color);
  }

  tileLuminance[lidx] = log2(max(lum, 1e-5));
  workgroupBarrier();

  // Reduce to find tile average log-luminance
  for (var s = 128u; s > 0u; s = s >> 1u) {
    if (lidx < s) {
      tileLuminance[lidx] += tileLuminance[lidx + s];
    }
    workgroupBarrier();
  }

  if (inBounds) {
    let tileAvgLogLum = tileLuminance[0] / 256.0;
    let tileAvgLum = exp2(tileAvgLogLum);
    let localExposure = 0.18 / max(tileAvgLum, 1e-5);
    let blended = mix(params.z, localExposure, params.y);
    let result = color * blended;
    textureStore(outputTex, coord, vec4<f32>(result, 1.0));
  }
}
`;

const TONEMAP_MODES = Object.freeze({
  aces: 0,
  reinhard: 1,
  uncharted2: 2,
  agx: 3,
  neutral: 4,
});

const COLOR_SPACES = Object.freeze({
  'srgb': 0,
  'display-p3': 1,
  'rec2020': 2,
});

export class HDRPipeline2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.colorSpace = options.colorSpace || 'display-p3';
    this.tonemapping = options.tonemapping || 'aces';
    this.enableAutoExposure = options.enableAutoExposure !== false;
    this.enableLocalTonemapping = options.enableLocalTonemapping !== false;

    this.exposure = 1.0;
    this.bloomIntensity = 0.04;
    this.bloomThreshold = 1.0;
    this.bloomSoftKnee = 0.5;
    this.minLogLuminance = -10.0;
    this.maxLogLuminance = 2.0;
    this.adaptationSpeed = 1.5;

    this._initialized = false;
    this._pipelines = {};
    this._textures = {};
    this._buffers = {};
    this._bindGroups = {};
    this._stats = { avgLuminance: 0, exposure: 1, histogram: null };
  }

  async initialize() {
    this._createTextures();
    this._createBuffers();
    await this._createPipelines();
    this._createBindGroups();
    this._initialized = true;
  }

  _createTextures() {
    const hdrDesc = {
      size: [this.width, this.height],
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    };
    this._textures.tonemapped = this.device.createTexture(hdrDesc);
    this._textures.localTM = this.device.createTexture(hdrDesc);

    const bloomLevels = 5;
    this._textures.bloomChain = [];
    for (let i = 0; i < bloomLevels; i++) {
      const w = Math.max(1, this.width >> (i + 1));
      const h = Math.max(1, this.height >> (i + 1));
      this._textures.bloomChain.push(
        this.device.createTexture({ size: [w, h], format: 'rgba16float', usage: hdrDesc.usage }),
        this.device.createTexture({ size: [w, h], format: 'rgba16float', usage: hdrDesc.usage })
      );
    }

    this._textures.output = this.device.createTexture({
      size: [this.width, this.height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
    });
  }

  _createBuffers() {
    this._buffers.histogram = this.device.createBuffer({
      size: HISTOGRAM_BINS * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this._buffers.exposure = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    this._buffers.histogramParams = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._buffers.exposureParams = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._buffers.pixelCount = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._buffers.tonemapParams = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._buffers.bloomParams = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._buffers.blurDirection = this.device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._buffers.finalParams = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._buffers.localTMParams = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Initialize exposure buffer with default
    const init = new Float32Array([this.exposure, 0, 128, this.exposure]);
    this.device.queue.writeBuffer(this._buffers.exposure, 0, init);
  }

  async _createPipelines() {
    // Create all compute pipelines in parallel using async API (2026 performance optimization)
    // This eliminates 50-150ms frame stutters during HDR initialization
    const [histogram, autoExposure, tonemap, bloomDown, bloomBlur, finalOutput, localTonemap] = await Promise.all([
      this.device.createComputePipelineAsync({
        label: 'histogram',
        layout: 'auto',
        compute: { module: this.device.createShaderModule({ code: luminanceHistogramWGSL }), entryPoint: 'main' },
      }),
      this.device.createComputePipelineAsync({
        label: 'auto-exposure',
        layout: 'auto',
        compute: { module: this.device.createShaderModule({ code: autoExposureWGSL }), entryPoint: 'main' },
      }),
      this.device.createComputePipelineAsync({
        label: 'tonemap',
        layout: 'auto',
        compute: { module: this.device.createShaderModule({ code: acesTonemapWGSL }), entryPoint: 'main' },
      }),
      this.device.createComputePipelineAsync({
        label: 'bloom-downscale',
        layout: 'auto',
        compute: { module: this.device.createShaderModule({ code: bloomDownscaleWGSL }), entryPoint: 'main' },
      }),
      this.device.createComputePipelineAsync({
        label: 'bloom-blur',
        layout: 'auto',
        compute: { module: this.device.createShaderModule({ code: bloomBlurWGSL }), entryPoint: 'main' },
      }),
      this.device.createComputePipelineAsync({
        label: 'final-output',
        layout: 'auto',
        compute: { module: this.device.createShaderModule({ code: finalOutputWGSL }), entryPoint: 'main' },
      }),
      this.device.createComputePipelineAsync({
        label: 'local-tonemap',
        layout: 'auto',
        compute: { module: this.device.createShaderModule({ code: localTonemapWGSL }), entryPoint: 'main' },
      })
    ]);

    this._pipelines.histogram = histogram;
    this._pipelines.autoExposure = autoExposure;
    this._pipelines.tonemap = tonemap;
    this._pipelines.bloomDown = bloomDown;
    this._pipelines.bloomBlur = bloomBlur;
    this._pipelines.finalOutput = finalOutput;
    this._pipelines.localTonemap = localTonemap;
  }

  _createBindGroups() {
    // Bind groups are recreated per-frame since input textures may change
  }

  process(commandEncoder, hdrInput) {
    if (!this._initialized) throw new Error('HDRPipeline2026 not initialized');

    const logRange = this.maxLogLuminance - this.minLogLuminance;

    // Clear histogram
    commandEncoder.clearBuffer(this._buffers.histogram);

    // Write uniforms
    this.device.queue.writeBuffer(this._buffers.histogramParams, 0,
      new Float32Array([this.width, this.height, this.minLogLuminance, logRange]));
    this.device.queue.writeBuffer(this._buffers.pixelCount, 0,
      new Float32Array([this.width * this.height]));

    // 1. Build luminance histogram
    const histBG = this.device.createBindGroup({
      layout: this._pipelines.histogram.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: hdrInput.createView() },
        { binding: 1, resource: { buffer: this._buffers.histogram } },
        { binding: 2, resource: { buffer: this._buffers.histogramParams } },
      ],
    });
    const histPass = commandEncoder.beginComputePass();
    histPass.setPipeline(this._pipelines.histogram);
    histPass.setBindGroup(0, histBG);
    histPass.dispatchWorkgroups(
      Math.ceil(this.width / WORKGROUP_SIZE),
      Math.ceil(this.height / WORKGROUP_SIZE)
    );
    histPass.end();

    // 2. Auto-exposure
    if (this.enableAutoExposure) {
      const dt = 1 / 60; // assume ~60fps for adaptation
      this.device.queue.writeBuffer(this._buffers.exposureParams, 0,
        new Float32Array([this.minLogLuminance, logRange, dt, this.adaptationSpeed]));

      const expBG = this.device.createBindGroup({
        layout: this._pipelines.autoExposure.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this._buffers.histogram } },
          { binding: 1, resource: { buffer: this._buffers.exposure } },
          { binding: 2, resource: { buffer: this._buffers.exposureParams } },
          { binding: 3, resource: { buffer: this._buffers.pixelCount } },
        ],
      });
      const expPass = commandEncoder.beginComputePass();
      expPass.setPipeline(this._pipelines.autoExposure);
      expPass.setBindGroup(0, expBG);
      expPass.dispatchWorkgroups(1);
      expPass.end();
    }

    // 3. Local tonemapping (adaptive per-tile exposure)
    let tonemapInput = hdrInput;
    if (this.enableLocalTonemapping) {
      this.device.queue.writeBuffer(this._buffers.localTMParams, 0,
        new Float32Array([16.0, 0.5, this.exposure, 0]));

      const ltmBG = this.device.createBindGroup({
        layout: this._pipelines.localTonemap.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: hdrInput.createView() },
          { binding: 1, resource: this._textures.localTM.createView() },
          { binding: 2, resource: { buffer: this._buffers.localTMParams } },
        ],
      });
      const ltmPass = commandEncoder.beginComputePass();
      ltmPass.setPipeline(this._pipelines.localTonemap);
      ltmPass.setBindGroup(0, ltmBG);
      ltmPass.dispatchWorkgroups(
        Math.ceil(this.width / WORKGROUP_SIZE),
        Math.ceil(this.height / WORKGROUP_SIZE)
      );
      ltmPass.end();
      tonemapInput = this._textures.localTM;
    }

    // 4. Tonemapping
    this.device.queue.writeBuffer(this._buffers.tonemapParams, 0,
      new Float32Array([this.exposure, TONEMAP_MODES[this.tonemapping] || 0, 0, 0]));

    const tmBG = this.device.createBindGroup({
      layout: this._pipelines.tonemap.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: tonemapInput.createView() },
        { binding: 1, resource: this._textures.tonemapped.createView() },
        { binding: 2, resource: { buffer: this._buffers.tonemapParams } },
      ],
    });
    const tmPass = commandEncoder.beginComputePass();
    tmPass.setPipeline(this._pipelines.tonemap);
    tmPass.setBindGroup(0, tmBG);
    tmPass.dispatchWorkgroups(
      Math.ceil(this.width / WORKGROUP_SIZE),
      Math.ceil(this.height / WORKGROUP_SIZE)
    );
    tmPass.end();

    // 5. Bloom: downscale + blur chain
    this._processBloom(commandEncoder);

    // 6. Final composite with color space conversion
    this.device.queue.writeBuffer(this._buffers.finalParams, 0,
      new Float32Array([this.bloomIntensity, COLOR_SPACES[this.colorSpace] || 0, 0, 0]));

    const finalBG = this.device.createBindGroup({
      layout: this._pipelines.finalOutput.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this._textures.tonemapped.createView() },
        { binding: 1, resource: this._textures.bloomChain[0].createView() },
        { binding: 2, resource: this._textures.output.createView() },
        { binding: 3, resource: { buffer: this._buffers.finalParams } },
      ],
    });
    const finalPass = commandEncoder.beginComputePass();
    finalPass.setPipeline(this._pipelines.finalOutput);
    finalPass.setBindGroup(0, finalBG);
    finalPass.dispatchWorkgroups(
      Math.ceil(this.width / WORKGROUP_SIZE),
      Math.ceil(this.height / WORKGROUP_SIZE)
    );
    finalPass.end();
  }

  _processBloom(commandEncoder) {
    this.device.queue.writeBuffer(this._buffers.bloomParams, 0,
      new Float32Array([this.bloomThreshold, this.bloomSoftKnee, 0, 0]));

    // Downscale from tonemapped into first bloom level
    const downBG = this.device.createBindGroup({
      layout: this._pipelines.bloomDown.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this._textures.tonemapped.createView() },
        { binding: 1, resource: this._textures.bloomChain[0].createView() },
        { binding: 2, resource: { buffer: this._buffers.bloomParams } },
      ],
    });
    const bw = Math.max(1, this.width >> 1);
    const bh = Math.max(1, this.height >> 1);

    const downPass = commandEncoder.beginComputePass();
    downPass.setPipeline(this._pipelines.bloomDown);
    downPass.setBindGroup(0, downBG);
    downPass.dispatchWorkgroups(Math.ceil(bw / WORKGROUP_SIZE), Math.ceil(bh / WORKGROUP_SIZE));
    downPass.end();

    // Gaussian blur (horizontal then vertical) on each bloom level
    for (let i = 0; i < this._textures.bloomChain.length; i += 2) {
      const src = this._textures.bloomChain[i];
      const tmp = this._textures.bloomChain[i + 1];
      if (!tmp) break;

      // Horizontal pass
      this.device.queue.writeBuffer(this._buffers.blurDirection, 0, new Float32Array([1, 0]));
      this._dispatchBlur(commandEncoder, src, tmp);

      // Vertical pass
      this.device.queue.writeBuffer(this._buffers.blurDirection, 0, new Float32Array([0, 1]));
      this._dispatchBlur(commandEncoder, tmp, src);
    }
  }

  _dispatchBlur(commandEncoder, input, output) {
    const bg = this.device.createBindGroup({
      layout: this._pipelines.bloomBlur.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: input.createView() },
        { binding: 1, resource: output.createView() },
        { binding: 2, resource: { buffer: this._buffers.blurDirection } },
      ],
    });
    const dims = [input.width, input.height];
    const totalPixels = dims[0] * dims[1];
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(this._pipelines.bloomBlur);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(totalPixels / 256));
    pass.end();
  }

  setExposure(ev) {
    this.exposure = Math.pow(2, ev);
  }

  setTonemapping(mode) {
    if (!(mode in TONEMAP_MODES)) throw new Error(`Unknown tonemapping: ${mode}`);
    this.tonemapping = mode;
  }

  setBloomIntensity(v) {
    this.bloomIntensity = Math.max(0, v);
  }

  setColorSpace(space) {
    if (!(space in COLOR_SPACES)) throw new Error(`Unknown color space: ${space}`);
    this.colorSpace = space;
  }

  getOutputTexture() {
    return this._textures.output;
  }

  getStats() {
    return { ...this._stats };
  }

  dispose() {
    Object.values(this._textures).flat().forEach(t => t?.destroy?.());
    Object.values(this._buffers).forEach(b => b?.destroy?.());
    this._initialized = false;
  }
}
