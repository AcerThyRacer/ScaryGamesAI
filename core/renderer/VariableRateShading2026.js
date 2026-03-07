/**
 * VariableRateShading2026 — Variable Rate Shading (VRS) System
 * Software-emulated VRS for WebGPU using compute-shader-driven shading rate maps.
 *
 * Strategies:
 *   1. Foveated Rendering — Full rate at center, reduced at edges
 *   2. Content-Adaptive — Analyze luminance variance; flat areas get lower rate
 *   3. Motion-Adaptive — Fast-moving areas get lower rate (blur hides it)
 *   4. Combined — Maximum quality from any criterion wins
 *
 * Since WebGPU lacks native VRS, we generate a rate map texture and use it
 * during shading (early-out in fragment) or as a post-process composite step
 * that upscales low-rate tiles from a reduced-resolution render.
 */

// ---------------------------------------------------------------------------
// WGSL Shader Sources
// ---------------------------------------------------------------------------

const RATE_MAP_GENERATION_SHADER = /* wgsl */ `
struct VRSParams {
  width: u32,
  height: u32,
  tileSize: u32,
  tilesX: u32,
  tilesY: u32,
  enableFoveated: u32,
  enableContentAdaptive: u32,
  enableMotionAdaptive: u32,
  foveatedCenterX: f32,
  foveatedCenterY: f32,
  foveatedInnerRadius: f32,
  foveatedMiddleRadius: f32,
  varianceThresholdLow: f32,
  varianceThresholdHigh: f32,
  motionThresholdLow: f32,
  motionThresholdHigh: f32,
  minShadingRate: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

// Shading rates encoded as: 0 = 1x1 (full), 1 = 2x1 (half-H), 2 = 1x2 (half-V), 3 = 2x2 (quarter)

@group(0) @binding(0) var colorBuffer: texture_2d<f32>;
@group(0) @binding(1) var motionVectors: texture_2d<f32>;
@group(0) @binding(2) var depthBuffer: texture_2d<f32>;
@group(0) @binding(3) var rateMap: texture_storage_2d<r8uint, write>;
@group(0) @binding(4) var<uniform> params: VRSParams;

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}

fn computeTileVariance(tileOrigin: vec2u) -> f32 {
  var sum = 0.0;
  var sumSq = 0.0;
  var count = 0.0;

  for (var dy = 0u; dy < params.tileSize; dy++) {
    for (var dx = 0u; dx < params.tileSize; dx++) {
      let px = tileOrigin + vec2u(dx, dy);
      if (px.x >= params.width || px.y >= params.height) { continue; }
      let lum = luminance(textureLoad(colorBuffer, px, 0).rgb);
      sum += lum;
      sumSq += lum * lum;
      count += 1.0;
    }
  }

  if (count < 1.0) { return 0.0; }
  let mean = sum / count;
  return (sumSq / count) - (mean * mean);
}

fn computeTileMotion(tileOrigin: vec2u) -> f32 {
  var maxMotion = 0.0;

  // Sample a grid within the tile for efficiency
  let step = max(params.tileSize / 4u, 1u);
  for (var dy = 0u; dy < params.tileSize; dy += step) {
    for (var dx = 0u; dx < params.tileSize; dx += step) {
      let px = tileOrigin + vec2u(dx, dy);
      if (px.x >= params.width || px.y >= params.height) { continue; }
      let mv = textureLoad(motionVectors, px, 0).rg;
      let motionLen = length(mv);
      maxMotion = max(maxMotion, motionLen);
    }
  }
  return maxMotion;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let tileX = gid.x;
  let tileY = gid.y;
  if (tileX >= params.tilesX || tileY >= params.tilesY) { return; }

  let tileOrigin = vec2u(tileX * params.tileSize, tileY * params.tileSize);

  // Foveated rate: based on distance from gaze center
  var foveatedRate = 0u;
  if (params.enableFoveated != 0u) {
    let tileCenterUV = vec2f(
      (f32(tileOrigin.x) + f32(params.tileSize) * 0.5) / f32(params.width),
      (f32(tileOrigin.y) + f32(params.tileSize) * 0.5) / f32(params.height)
    );
    let gazeCenter = vec2f(params.foveatedCenterX, params.foveatedCenterY);
    // Correct for aspect ratio
    let aspect = f32(params.width) / f32(params.height);
    let diff = vec2f((tileCenterUV.x - gazeCenter.x) * aspect, tileCenterUV.y - gazeCenter.y);
    let dist = length(diff);

    if (dist < params.foveatedInnerRadius) {
      foveatedRate = 0u; // 1x1
    } else if (dist < params.foveatedMiddleRadius) {
      foveatedRate = 1u; // 2x1 half rate
    } else {
      foveatedRate = 3u; // 2x2 quarter rate
    }
  }

  // Content-adaptive rate: based on luminance variance
  var contentRate = 0u;
  if (params.enableContentAdaptive != 0u) {
    let variance = computeTileVariance(tileOrigin);
    if (variance < params.varianceThresholdLow) {
      contentRate = 3u; // Flat area — quarter rate
    } else if (variance < params.varianceThresholdHigh) {
      contentRate = 1u; // Medium detail — half rate
    } else {
      contentRate = 0u; // High detail — full rate
    }
  }

  // Motion-adaptive rate: fast-moving areas use lower rate
  var motionRate = 0u;
  if (params.enableMotionAdaptive != 0u) {
    let motion = computeTileMotion(tileOrigin);
    if (motion > params.motionThresholdHigh) {
      motionRate = 3u; // Very fast — quarter rate
    } else if (motion > params.motionThresholdLow) {
      motionRate = 1u; // Moderate — half rate
    } else {
      motionRate = 0u; // Static — full rate
    }
  }

  // Combined: take the minimum rate value (maximum quality) from all criteria
  var finalRate = 3u; // Start at lowest quality
  if (params.enableFoveated != 0u) { finalRate = min(finalRate, foveatedRate); }
  if (params.enableContentAdaptive != 0u) { finalRate = min(finalRate, contentRate); }
  if (params.enableMotionAdaptive != 0u) { finalRate = min(finalRate, motionRate); }

  // Enforce minimum shading rate
  finalRate = min(finalRate, params.minShadingRate);

  textureStore(rateMap, vec2u(tileX, tileY), vec4u(finalRate, 0u, 0u, 1u));
}
`;

const VRS_COMPOSITE_SHADER = /* wgsl */ `
struct CompositeParams {
  width: u32,
  height: u32,
  tileSize: u32,
  tilesX: u32,
  tilesY: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

@group(0) @binding(0) var fullResTex: texture_2d<f32>;
@group(0) @binding(1) var rateMap: texture_2d<u32>;
@group(0) @binding(2) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var<uniform> params: CompositeParams;

fn bilinearSample(tex: texture_2d<f32>, center: vec2u, blockW: u32, blockH: u32, px: vec2u) -> vec3f {
  // Bilinear upscale from block center to pixel position
  let localX = f32(px.x % blockW) / f32(blockW);
  let localY = f32(px.y % blockH) / f32(blockH);

  let dims = vec2i(i32(params.width), i32(params.height));

  let baseX = i32(center.x);
  let baseY = i32(center.y);
  let nextX = min(baseX + i32(blockW), dims.x - 1);
  let nextY = min(baseY + i32(blockH), dims.y - 1);

  let c00 = textureLoad(tex, vec2u(u32(baseX), u32(baseY)), 0).rgb;
  let c10 = textureLoad(tex, vec2u(u32(nextX), u32(baseY)), 0).rgb;
  let c01 = textureLoad(tex, vec2u(u32(baseX), u32(nextY)), 0).rgb;
  let c11 = textureLoad(tex, vec2u(u32(nextX), u32(nextY)), 0).rgb;

  let top = mix(c00, c10, localX);
  let bottom = mix(c01, c11, localX);
  return mix(top, bottom, localY);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let px = gid.xy;
  if (px.x >= params.width || px.y >= params.height) { return; }

  let tileX = px.x / params.tileSize;
  let tileY = px.y / params.tileSize;

  let rate = textureLoad(rateMap, vec2u(tileX, tileY), 0).r;

  if (rate == 0u) {
    // 1x1 — full rate, pass through
    textureStore(outputTex, px, textureLoad(fullResTex, px, 0));
  } else if (rate == 1u) {
    // 2x1 — half horizontal: bilinear upscale from 2-pixel-wide blocks
    let blockOriginX = (px.x / 2u) * 2u;
    let center = vec2u(blockOriginX, px.y);
    let color = bilinearSample(fullResTex, center, 2u, 1u, px);
    textureStore(outputTex, px, vec4f(color, 1.0));
  } else if (rate == 2u) {
    // 1x2 — half vertical: bilinear upscale from 2-pixel-tall blocks
    let blockOriginY = (px.y / 2u) * 2u;
    let center = vec2u(px.x, blockOriginY);
    let color = bilinearSample(fullResTex, center, 1u, 2u, px);
    textureStore(outputTex, px, vec4f(color, 1.0));
  } else {
    // 2x2 — quarter rate: bilinear upscale from 2x2 blocks
    let blockOriginX = (px.x / 2u) * 2u;
    let blockOriginY = (px.y / 2u) * 2u;
    let center = vec2u(blockOriginX, blockOriginY);
    let color = bilinearSample(fullResTex, center, 2u, 2u, px);
    textureStore(outputTex, px, vec4f(color, 1.0));
  }
}
`;

// Helper: returns WGSL snippet for fragment shaders to early-out based on rate map
const VRS_FRAGMENT_EARLY_OUT = /* wgsl */ `
// Bind the rate map as @group(G) @binding(B) var rateMap: texture_2d<u32>;
// Call this at the top of your fragment shader:
//   if (vrsEarlyOut(fragCoord, tileSize)) { discard; }

fn vrsEarlyOut(fragCoord: vec4f, tileSize: u32) -> bool {
  let px = vec2u(u32(fragCoord.x), u32(fragCoord.y));
  let tileCoord = vec2u(px.x / tileSize, px.y / tileSize);
  let rate = textureLoad(rateMap, tileCoord, 0).r;

  if (rate == 0u) { return false; } // Full rate — shade every pixel

  let localX = px.x % 2u;
  let localY = px.y % 2u;

  if (rate == 1u) { return localX != 0u; }        // 2x1: only shade even-x
  if (rate == 2u) { return localY != 0u; }        // 1x2: only shade even-y
  // rate >= 3: 2x2 — shade only top-left of each 2x2 block
  return (localX != 0u) || (localY != 0u);
}
`;

// ---------------------------------------------------------------------------
// VariableRateShading2026 Class
// ---------------------------------------------------------------------------

export class VariableRateShading2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.tileSize = options.tileSize || 16;
    this.enableFoveated = options.enableFoveated !== false;
    this.enableContentAdaptive = options.enableContentAdaptive !== false;
    this.enableMotionAdaptive = options.enableMotionAdaptive !== false;
    this.foveatedCenter = options.foveatedCenter || [0.5, 0.5];
    this.minShadingRate = this._parseShadingRate(options.minShadingRate || '1x1');

    this.tilesX = Math.ceil(this.width / this.tileSize);
    this.tilesY = Math.ceil(this.height / this.tileSize);

    this.initialized = false;
    this.pipelines = {};
    this.textures = {};
    this.buffers = {};
    this.stats = { averageShadingRate: 0, fullRatePercent: 100, halfRatePercent: 0, quarterRatePercent: 0, estimatedSavings: 0 };

    // Tuning parameters
    this.foveatedInnerRadius = 0.2;
    this.foveatedMiddleRadius = 0.45;
    this.varianceThresholdLow = 0.001;
    this.varianceThresholdHigh = 0.01;
    this.motionThresholdLow = 0.5;
    this.motionThresholdHigh = 2.0;
  }

  _parseShadingRate(rate) {
    const map = { '1x1': 0, '2x1': 1, '1x2': 2, '2x2': 3 };
    return map[rate] ?? 0;
  }

  async initialize() {
    this._createTextures();
    this._createBuffers();
    await this._createPipelines();
    this.initialized = true;
  }

  _createTextures() {
    this.textures.rateMap = this.device.createTexture({
      size: { width: this.tilesX, height: this.tilesY },
      format: 'r8uint',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
      label: 'vrs-rate-map',
    });

    this.textures.output = this.device.createTexture({
      size: { width: this.width, height: this.height },
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
      label: 'vrs-composite-output',
    });

    // Staging buffer for rate map readback (stats computation)
    this.buffers.rateMapReadback = this.device.createBuffer({
      size: this.tilesX * this.tilesY * 4, // r8uint padded per texel copy
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      label: 'vrs-readback',
    });
  }

  _createBuffers() {
    // VRS generation params: 20 u32/f32 values = 80 bytes
    this.buffers.vrsParams = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'vrs-params',
    });

    // Composite params: 8 u32 values = 32 bytes
    this.buffers.compositeParams = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'vrs-composite-params',
    });
  }

  async _createPipelines() {
    const rateMapModule = this.device.createShaderModule({
      code: RATE_MAP_GENERATION_SHADER,
      label: 'vrs-rate-map-gen',
    });
    this.pipelines.rateMap = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: rateMapModule, entryPoint: 'main' },
      label: 'vrs-rate-map-pipeline',
    });

    const compositeModule = this.device.createShaderModule({
      code: VRS_COMPOSITE_SHADER,
      label: 'vrs-composite',
    });
    this.pipelines.composite = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: compositeModule, entryPoint: 'main' },
      label: 'vrs-composite-pipeline',
    });
  }

  setFoveatedCenter(x, y) {
    this.foveatedCenter = [
      Math.max(0, Math.min(1, x)),
      Math.max(0, Math.min(1, y)),
    ];
  }

  generateRateMap(commandEncoder, inputs = {}) {
    if (!this.initialized) return;

    const { colorBuffer, motionVectors, depthBuffer } = inputs;

    this._uploadVRSParams();

    const entries = [
      { binding: 0, resource: colorBuffer.createView() },
      { binding: 1, resource: motionVectors.createView() },
      { binding: 2, resource: depthBuffer.createView() },
      { binding: 3, resource: this.textures.rateMap.createView() },
      { binding: 4, resource: { buffer: this.buffers.vrsParams } },
    ];

    const bg = this.device.createBindGroup({
      layout: this.pipelines.rateMap.getBindGroupLayout(0),
      entries,
    });

    const pass = commandEncoder.beginComputePass({ label: 'vrs-rate-map-pass' });
    pass.setPipeline(this.pipelines.rateMap);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(this.tilesX / 8), Math.ceil(this.tilesY / 8));
    pass.end();
  }

  _uploadVRSParams() {
    const buf = new ArrayBuffer(80);
    const u32 = new Uint32Array(buf);
    const f32 = new Float32Array(buf);

    u32[0] = this.width;
    u32[1] = this.height;
    u32[2] = this.tileSize;
    u32[3] = this.tilesX;
    u32[4] = this.tilesY;
    u32[5] = this.enableFoveated ? 1 : 0;
    u32[6] = this.enableContentAdaptive ? 1 : 0;
    u32[7] = this.enableMotionAdaptive ? 1 : 0;
    f32[8] = this.foveatedCenter[0];
    f32[9] = this.foveatedCenter[1];
    f32[10] = this.foveatedInnerRadius;
    f32[11] = this.foveatedMiddleRadius;
    f32[12] = this.varianceThresholdLow;
    f32[13] = this.varianceThresholdHigh;
    f32[14] = this.motionThresholdLow;
    f32[15] = this.motionThresholdHigh;
    u32[16] = this.minShadingRate;
    u32[17] = 0;
    u32[18] = 0;
    u32[19] = 0;

    this.device.queue.writeBuffer(this.buffers.vrsParams, 0, buf);
  }

  applyComposite(commandEncoder, fullResTexture) {
    if (!this.initialized) return;

    const buf = new ArrayBuffer(32);
    const u32 = new Uint32Array(buf);
    u32[0] = this.width;
    u32[1] = this.height;
    u32[2] = this.tileSize;
    u32[3] = this.tilesX;
    u32[4] = this.tilesY;
    this.device.queue.writeBuffer(this.buffers.compositeParams, 0, buf);

    const bg = this.device.createBindGroup({
      layout: this.pipelines.composite.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: fullResTexture.createView() },
        { binding: 1, resource: this.textures.rateMap.createView() },
        { binding: 2, resource: this.textures.output.createView() },
        { binding: 3, resource: { buffer: this.buffers.compositeParams } },
      ],
    });

    const pass = commandEncoder.beginComputePass({ label: 'vrs-composite-pass' });
    pass.setPipeline(this.pipelines.composite);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(this.width / 8), Math.ceil(this.height / 8));
    pass.end();
  }

  getRateMapTexture() {
    return this.textures.rateMap;
  }

  getCompositeShaderCode() {
    return VRS_COMPOSITE_SHADER;
  }

  getFragmentEarlyOutCode() {
    return VRS_FRAGMENT_EARLY_OUT;
  }

  async getStats() {
    if (!this.initialized) return this.stats;

    try {
      const readBuffer = this.buffers.rateMapReadback;
      const encoder = this.device.createCommandEncoder();

      encoder.copyTextureToBuffer(
        { texture: this.textures.rateMap },
        { buffer: readBuffer, bytesPerRow: Math.ceil(this.tilesX / 256) * 256 },
        { width: this.tilesX, height: this.tilesY }
      );
      this.device.queue.submit([encoder.finish()]);

      await readBuffer.mapAsync(GPUMapMode.READ);
      const data = new Uint8Array(readBuffer.getMappedRange());

      let counts = [0, 0, 0, 0]; // full, halfH, halfV, quarter
      const totalTiles = this.tilesX * this.tilesY;
      const bytesPerRow = Math.ceil(this.tilesX / 256) * 256;

      for (let y = 0; y < this.tilesY; y++) {
        for (let x = 0; x < this.tilesX; x++) {
          const rate = data[y * bytesPerRow + x];
          const idx = Math.min(rate, 3);
          counts[idx]++;
        }
      }

      readBuffer.unmap();

      const fullPct = (counts[0] / totalTiles) * 100;
      const halfPct = ((counts[1] + counts[2]) / totalTiles) * 100;
      const quarterPct = (counts[3] / totalTiles) * 100;

      // Estimated savings: half rate saves ~50% shading, quarter saves ~75%
      const savings = (counts[1] + counts[2]) * 0.5 + counts[3] * 0.75;
      const estimatedSavings = (savings / totalTiles) * 100;

      const weightedRate = (counts[0] * 1.0 + (counts[1] + counts[2]) * 0.5 + counts[3] * 0.25) / totalTiles;

      this.stats = {
        averageShadingRate: Math.round(weightedRate * 100) / 100,
        fullRatePercent: Math.round(fullPct * 10) / 10,
        halfRatePercent: Math.round(halfPct * 10) / 10,
        quarterRatePercent: Math.round(quarterPct * 10) / 10,
        estimatedSavings: Math.round(estimatedSavings * 10) / 10,
      };
    } catch {
      // Readback may fail if buffer is in use; return cached stats
    }

    return this.stats;
  }

  dispose() {
    for (const tex of Object.values(this.textures)) tex.destroy();
    for (const buf of Object.values(this.buffers)) buf.destroy();
    this.textures = {};
    this.buffers = {};
    this.pipelines = {};
    this.initialized = false;
  }
}
