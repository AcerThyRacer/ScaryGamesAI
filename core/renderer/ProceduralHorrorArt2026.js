/**
 * ProceduralHorrorArt2026 — GPU-driven procedural horror art generator.
 * Generates unique textures, wall writing, and style-transfer post-processing
 * per playthrough using seeded noise computed entirely on the GPU.
 */
import { HorrorWritingEngine } from '../narrative/HorrorWritingEngine.js';

const TEXTURE_CONFIGS = new Map([
  ['wall',    { layers: ['brick','stain','mold','blood_splatter'],
                palette: [0.35,0.28,0.22, 0.55,0.42,0.35, 0.15,0.35,0.10, 0.6,0.05,0.05],
                noiseWeights: [0.4,0.25,0.2,0.15], patternScale: 4.0, brickRatio: 2.0 }],
  ['floor',   { layers: ['tile','crack','wet_spots','dirty_overlay'],
                palette: [0.30,0.30,0.28, 0.20,0.18,0.16, 0.25,0.30,0.35, 0.12,0.10,0.09],
                noiseWeights: [0.35,0.3,0.2,0.15], patternScale: 6.0, brickRatio: 1.0 }],
  ['metal',   { layers: ['metallic_base','rust','scratch','dent'],
                palette: [0.55,0.55,0.58, 0.60,0.30,0.10, 0.40,0.40,0.42, 0.35,0.35,0.38],
                noiseWeights: [0.3,0.35,0.2,0.15], patternScale: 8.0, brickRatio: 1.0 }],
  ['organic', { layers: ['flesh_base','vein_network','bruise','scar'],
                palette: [0.72,0.45,0.40, 0.55,0.10,0.10, 0.50,0.30,0.45, 0.80,0.60,0.55],
                noiseWeights: [0.3,0.3,0.2,0.2], patternScale: 3.0, brickRatio: 1.0 }]
]);

const STYLE_PRESETS = {
  '70s_horror':      { saturation:0.7,  contrast:0.85, brightness:1.05, tint:[1.1,0.95,0.8],   grainIntensity:0.12, vignetteStrength:0.5,  bloomThreshold:0.7, customEffect:0 },
  'found_footage':   { saturation:0.5,  contrast:1.2,  brightness:0.9,  tint:[0.7,1.1,0.7],    grainIntensity:0.25, vignetteStrength:0.3,  bloomThreshold:0.9, customEffect:1 },
  'noir':            { saturation:0.0,  contrast:1.5,  brightness:0.95, tint:[1.0,1.0,1.0],    grainIntensity:0.15, vignetteStrength:0.7,  bloomThreshold:0.8, customEffect:2 },
  'expressionist':   { saturation:0.6,  contrast:1.6,  brightness:0.85, tint:[1.05,0.9,0.85],  grainIntensity:0.08, vignetteStrength:0.8,  bloomThreshold:0.6, customEffect:3 },
  'japanese_horror': { saturation:0.35, contrast:1.1,  brightness:0.92, tint:[0.85,0.92,1.15], grainIntensity:0.06, vignetteStrength:0.45, bloomThreshold:0.85,customEffect:4 },
  'neon_horror':     { saturation:1.6,  contrast:1.3,  brightness:0.8,  tint:[1.0,0.85,1.2],   grainIntensity:0.04, vignetteStrength:0.6,  bloomThreshold:0.4, customEffect:5 }
};

// ── WGSL: Procedural texture generation ──────────────────────────────────────
const textureGenWGSL = /* wgsl */ `
struct Params {
  seed: u32, time: f32, texType: u32, _pad: u32,
  palette: array<vec4<f32>, 3>,
  weights: vec4<f32>,
  patternScale: f32, brickRatio: f32,
};
@group(0) @binding(0) var<uniform> params : Params;
@group(0) @binding(1) var output : texture_storage_2d<rgba8unorm, write>;

fn hash12(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, vec3<f32>(p3.y + 33.33, p3.z + 33.33, p3.x + 33.33));
  return fract((p3.x + p3.y) * p3.z);
}
fn hash22(p: vec2<f32>) -> vec2<f32> {
  let n = vec3<f32>(dot(p, vec2<f32>(127.1,311.7)), dot(p, vec2<f32>(269.5,183.3)), dot(p, vec2<f32>(419.2,371.9)));
  return fract(sin(n.xy) * 43758.5453);
}
fn simplex2D(v: vec2<f32>) -> f32 {
  let C = vec4<f32>(0.211324865, 0.366025404, -0.577350269, 0.024390243);
  var i = floor(v + dot(v, vec2<f32>(C.y, C.y)));
  let x0 = v - i + dot(i, vec2<f32>(C.x, C.x));
  let i1 = select(vec2<f32>(0.0,1.0), vec2<f32>(1.0,0.0), x0.x > x0.y);
  let x1 = x0 - i1 + vec2<f32>(C.x, C.x);
  let x2 = x0 + vec2<f32>(C.z, C.z);
  i = i - floor(i / 289.0) * 289.0;
  let p = vec3<f32>(hash12(i), hash12(i + i1), hash12(i + vec2<f32>(1.0,1.0)));
  var m = max(vec3<f32>(0.5) - vec3<f32>(dot(x0,x0), dot(x1,x1), dot(x2,x2)), vec3<f32>(0.0));
  m = m * m; m = m * m;
  let g0 = (p.x*2.0-1.0)*x0.x + (fract(p.x*7.0)*2.0-1.0)*x0.y;
  let g1 = (p.y*2.0-1.0)*x1.x + (fract(p.y*7.0)*2.0-1.0)*x1.y;
  let g2 = (p.z*2.0-1.0)*x2.x + (fract(p.z*7.0)*2.0-1.0)*x2.y;
  return 70.0 * dot(m, vec3<f32>(g0, g1, g2));
}
fn fbm(p: vec2<f32>, sd: f32) -> f32 {
  var val = 0.0; var amp = 0.5; var freq = 1.0;
  var pos = p + vec2<f32>(sd * 0.123, sd * 0.456);
  for (var i = 0u; i < 6u; i++) { val += amp * simplex2D(pos * freq); freq *= 2.0; amp *= 0.5; }
  return val;
}
fn voronoi(p: vec2<f32>, sd: f32) -> f32 {
  let n = floor(p); let f = fract(p); var md = 8.0;
  for (var j = -1; j <= 1; j++) { for (var i = -1; i <= 1; i++) {
    let g = vec2<f32>(f32(i), f32(j));
    md = min(md, distance(f, g + hash22(n + g + vec2<f32>(sd*0.01, sd*0.02))));
  }} return md;
}
@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let dims = textureDimensions(output);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }
  let uv = vec2<f32>(f32(gid.x), f32(gid.y)) / vec2<f32>(f32(dims.x), f32(dims.y));
  let sd = f32(params.seed); let sc = params.patternScale; let p = uv * sc;
  let w = params.weights;
  let blend = fbm(p, sd)*w.x + fbm(p*2.1 + vec2<f32>(sd*0.3,0.0), sd+100.0)*w.y
            + voronoi(p*3.0, sd)*w.z + fbm(p*0.8 + vec2<f32>(0.0,sd*0.2), sd+200.0)*w.w;
  let t = clamp(blend * 0.5 + 0.5, 0.0, 1.0);
  var col = mix(mix(params.palette[0].rgb, params.palette[1].rgb, t), params.palette[2].rgb, t*t);
  if (params.texType == 0u) {
    let bp = uv * vec2<f32>(sc * params.brickRatio, sc);
    let offset = select(0.0, 0.5, u32(floor(bp.y)) % 2u == 1u);
    let brick = fract(vec2<f32>(bp.x + offset, bp.y));
    let edge = step(0.05,brick.x)*step(0.05,brick.y)*(1.0-step(0.95,brick.x))*(1.0-step(0.95,brick.y));
    col = mix(col * 0.6, col, edge);
  }
  textureStore(output, vec2<u32>(gid.x, gid.y), vec4<f32>(col, 1.0));
}`;

// ── WGSL: Wall writing SDF rendering ─────────────────────────────────────────
const wallWritingWGSL = /* wgsl */ `
struct WallParams { seed: u32, time: f32, charCount: u32, style: u32 };
@group(0) @binding(0) var<uniform> params : WallParams;
@group(0) @binding(1) var<storage, read> chars : array<u32>;
@group(0) @binding(2) var output : texture_storage_2d<rgba8unorm, write>;

fn hashF(p: vec2<f32>) -> f32 { return fract(sin(dot(p, vec2<f32>(127.1,311.7))) * 43758.5453); }
fn sdfLine(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
  let pa = p - a; let ba = b - a;
  return length(pa - ba * clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0));
}
fn glyphSDF(p: vec2<f32>, ch: u32) -> f32 {
  let j = hashF(vec2<f32>(f32(ch), f32(params.seed))) * 0.06;
  let d1 = sdfLine(p, vec2<f32>(0.15+j, 0.1), vec2<f32>(0.15-j, 0.9));
  let d2 = sdfLine(p, vec2<f32>(0.1, 0.5+j), vec2<f32>(0.85, 0.5-j));
  let d3 = sdfLine(p, vec2<f32>(0.5, 0.1+j), vec2<f32>(0.85-j, 0.9));
  let bits = vec3<f32>(f32((ch>>0u)&1u), f32((ch>>1u)&1u), f32((ch>>2u)&1u));
  return dot(vec3<f32>(d1,d2,d3), bits) / max(bits.x+bits.y+bits.z, 1.0);
}
@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let dims = textureDimensions(output);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }
  let uv = vec2<f32>(f32(gid.x), f32(gid.y)) / vec2<f32>(f32(dims.x), f32(dims.y));
  let cellW = 1.0 / f32(max(params.charCount, 1u));
  let idx = u32(floor(uv.x / cellW));
  let local = vec2<f32>(fract(uv.x / cellW), uv.y);
  var d = 1.0;
  if (idx < params.charCount) { d = glyphSDF(local, chars[idx]); }
  d += (hashF(uv * 50.0 + vec2<f32>(f32(params.seed))) - 0.5) * 0.02;
  let alpha = 1.0 - smoothstep(0.0, 0.08, d);
  // Style: 0=blood, 1=chalk, 2=scratch, 3=ash
  var col = vec3<f32>(0.0); var drip = 0.0;
  if (params.style == 0u) {
    col = vec3<f32>(0.6, 0.02, 0.02);
    drip = max(0.0, alpha * smoothstep(0.4, 1.0, uv.y) * sin(params.time*0.3 + uv.y*2.0) * 0.5);
    col *= 1.0 + drip * 0.4;
  } else if (params.style == 1u) { col = vec3<f32>(0.85, 0.83, 0.78);
  } else if (params.style == 2u) { col = vec3<f32>(0.4, 0.38, 0.35);
  } else { col = vec3<f32>(0.25, 0.25, 0.27); }
  let fa = clamp(alpha + drip, 0.0, 1.0);
  textureStore(output, vec2<u32>(gid.x, gid.y), vec4<f32>(col * fa, fa));
}`;

// ── WGSL: Style transfer post-process ────────────────────────────────────────
const styleTransferWGSL = /* wgsl */ `
struct StyleParams {
  saturation: f32, contrast: f32, brightness: f32, grainIntensity: f32,
  tint: vec3<f32>, vignetteStrength: f32,
  bloomThreshold: f32, customEffect: u32, time: f32, _pad: u32,
};
@group(0) @binding(0) var<uniform> params : StyleParams;
@group(0) @binding(1) var inputTex  : texture_2d<f32>;
@group(0) @binding(2) var outputTex : texture_storage_2d<rgba8unorm, write>;

fn luminance(c: vec3<f32>) -> f32 { return dot(c, vec3<f32>(0.2126,0.7152,0.0722)); }
fn rand(co: vec2<f32>) -> f32 { return fract(sin(dot(co, vec2<f32>(12.9898,78.233))) * 43758.5453); }

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let dims = textureDimensions(inputTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }
  let uv = vec2<f32>(f32(gid.x)/f32(dims.x), f32(gid.y)/f32(dims.y));
  var col = textureLoad(inputTex, vec2<i32>(gid.xy), 0).rgb;
  let lum = luminance(col);
  col = mix(vec3<f32>(lum), col, params.saturation);                       // saturation
  col = (col - 0.5) * params.contrast + 0.5;                               // contrast
  col *= params.brightness * params.tint;                                   // brightness + tint
  col += vec3<f32>((rand(uv*1000.0 + vec2<f32>(params.time,0.0)) - 0.5) * params.grainIntensity);
  let dist = length(uv - 0.5) * 1.414;
  col *= 1.0 - params.vignetteStrength * dist * dist;                      // vignette
  if (params.customEffect == 1u) {                                          // found footage
    col *= 0.95 + 0.05 * sin(f32(gid.y) * 3.1416);
    let warp = sin(uv.y*80.0 + params.time*5.0) * 0.002;
    col = mix(col, col.gbr, abs(warp) * 10.0);
  } else if (params.customEffect == 3u) {                                   // expressionist
    col *= mix(0.7, 1.0, abs(sin(atan2(uv.y-0.5, uv.x-0.5) * 4.0)));
  } else if (params.customEffect == 4u) {                                   // japanese horror
    col += vec3<f32>(0.05,0.08,0.15) * smoothstep(0.85, 1.0, lum + rand(uv*200.0)*0.1);
  } else if (params.customEffect == 5u) {                                   // neon horror bloom
    col += col * smoothstep(params.bloomThreshold, 1.0, lum) * 0.6;
  }
  textureStore(outputTex, vec2<u32>(gid.x, gid.y), vec4<f32>(clamp(col, vec3<f32>(0.0), vec3<f32>(1.0)), 1.0));
}`;

// ── Helpers ──────────────────────────────────────────────────────────────────
const WRITING_STYLES = { blood: 0, chalk: 1, scratch: 2, ash: 3 };
const TEXTURE_TYPE_INDEX = { wall: 0, floor: 1, metal: 2, organic: 3 };

function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export class ProceduralHorrorArt2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.options = { defaultWidth: 1024, defaultHeight: 1024, maxTextures: 256, ...options };
    this.seed = 0;
    this.textureLibrary = new Map();
    this.pipelines = {};
    this.uniformBuffers = {};
    this.initialized = false;
    this.stats = { texturesGenerated: 0, writingsGenerated: 0, styleTransfersApplied: 0, gpuMemoryBytes: 0 };
  }

  async initialize(seed) {
    this.seed = seed != null
      ? (typeof seed === 'string' ? hashString(seed) : seed >>> 0)
      : Date.now() >>> 0;

    const makePipeline = (label, code) => {
      const mod = this.device.createShaderModule({ label, code });
      return this.device.createComputePipeline({ layout: 'auto', compute: { module: mod, entryPoint: 'main' } });
    };
    this.pipelines.textureGen   = makePipeline('ProceduralTex', textureGenWGSL);
    this.pipelines.wallWriting  = makePipeline('WallWriting',   wallWritingWGSL);
    this.pipelines.styleTransfer = makePipeline('StyleTransfer', styleTransferWGSL);

    const mkBuf = (size) => this.device.createBuffer({ size, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.uniformBuffers.textureGen    = mkBuf(128);
    this.uniformBuffers.wallWriting   = mkBuf(16);
    this.uniformBuffers.styleTransfer = mkBuf(64);
    this.initialized = true;
  }

  setSessionSeed(seed) {
    this.seed = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
    this.device.queue.writeBuffer(this.uniformBuffers.textureGen, 0, new Uint32Array([this.seed]));
  }

  generateTexture(type, width, height) {
    if (!this.initialized) throw new Error('Not initialized — call initialize() first');
    const w = width || this.options.defaultWidth;
    const h = height || this.options.defaultHeight;
    const config = TEXTURE_CONFIGS.get(type);
    if (!config) throw new Error(`Unknown texture type: ${type}`);

    const buf = new ArrayBuffer(128);
    const u32 = new Uint32Array(buf);
    const f32 = new Float32Array(buf);
    u32[0] = this.seed; f32[1] = performance.now() / 1000;
    u32[2] = TEXTURE_TYPE_INDEX[type] ?? 0; u32[3] = 0;
    for (let i = 0; i < 3; i++) {
      f32[4+i*4] = config.palette[i*4]??0; f32[5+i*4] = config.palette[i*4+1]??0;
      f32[6+i*4] = config.palette[i*4+2]??0; f32[7+i*4] = 1.0;
    }
    for (let i = 0; i < 4; i++) f32[16+i] = config.noiseWeights[i];
    f32[20] = config.patternScale; f32[21] = config.brickRatio;
    this.device.queue.writeBuffer(this.uniformBuffers.textureGen, 0, buf);

    const texture = this.device.createTexture({
      size: { width: w, height: h }, format: 'rgba8unorm',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
    });
    const bindGroup = this.device.createBindGroup({
      layout: this.pipelines.textureGen.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffers.textureGen } },
        { binding: 1, resource: texture.createView() }
      ]
    });
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(this.pipelines.textureGen);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(w / 16), Math.ceil(h / 16));
    pass.end();
    this.device.queue.submit([enc.finish()]);

    const key = `${type}_${this.seed}_${w}x${h}`;
    this.textureLibrary.set(key, texture);
    this.stats.texturesGenerated++;
    this.stats.gpuMemoryBytes += w * h * 4;
    return texture;
  }

  generateWallWriting(text, style = 'blood') {
    if (!this.initialized) throw new Error('Not initialized — call initialize() first');
    const w = this.options.defaultWidth;
    const h = Math.round(this.options.defaultHeight / 4);

    const codes = new Uint32Array(text.length);
    for (let i = 0; i < text.length; i++) codes[i] = text.charCodeAt(i);
    const charBuffer = this.device.createBuffer({
      size: Math.max(codes.byteLength, 4),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, mappedAtCreation: true
    });
    new Uint32Array(charBuffer.getMappedRange()).set(codes);
    charBuffer.unmap();

    const ubuf = new ArrayBuffer(16);
    new Uint32Array(ubuf)[0] = this.seed;
    new Float32Array(ubuf)[1] = performance.now() / 1000;
    new Uint32Array(ubuf)[2] = text.length;
    new Uint32Array(ubuf)[3] = WRITING_STYLES[style] ?? 0;
    this.device.queue.writeBuffer(this.uniformBuffers.wallWriting, 0, ubuf);

    const texture = this.device.createTexture({
      size: { width: w, height: h }, format: 'rgba8unorm',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
    });
    const bindGroup = this.device.createBindGroup({
      layout: this.pipelines.wallWriting.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffers.wallWriting } },
        { binding: 1, resource: { buffer: charBuffer } },
        { binding: 2, resource: texture.createView() }
      ]
    });
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(this.pipelines.wallWriting);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(w / 16), Math.ceil(h / 16));
    pass.end();
    this.device.queue.submit([enc.finish()]);

    const key = `writing_${hashString(text)}_${style}`;
    this.textureLibrary.set(key, texture);
    this.stats.writingsGenerated++;
    this.stats.gpuMemoryBytes += w * h * 4;
    return texture;
  }

  applyStylePreset(commandEncoder, inputTexture, preset) {
    if (!this.initialized) throw new Error('Not initialized — call initialize() first');
    const cfg = STYLE_PRESETS[preset];
    if (!cfg) throw new Error(`Unknown style preset: ${preset}`);

    const dims = { width: inputTexture.width, height: inputTexture.height };
    const outputTexture = this.device.createTexture({
      size: dims, format: 'rgba8unorm',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
    });
    const buf = new ArrayBuffer(64);
    const f = new Float32Array(buf); const u = new Uint32Array(buf);
    f[0] = cfg.saturation; f[1] = cfg.contrast; f[2] = cfg.brightness; f[3] = cfg.grainIntensity;
    f[4] = cfg.tint[0]; f[5] = cfg.tint[1]; f[6] = cfg.tint[2]; f[7] = cfg.vignetteStrength;
    f[8] = cfg.bloomThreshold; u[9] = cfg.customEffect; f[10] = performance.now() / 1000; u[11] = 0;
    this.device.queue.writeBuffer(this.uniformBuffers.styleTransfer, 0, buf);

    const bindGroup = this.device.createBindGroup({
      layout: this.pipelines.styleTransfer.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffers.styleTransfer } },
        { binding: 1, resource: inputTexture.createView() },
        { binding: 2, resource: outputTexture.createView() }
      ]
    });
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(this.pipelines.styleTransfer);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(dims.width / 16), Math.ceil(dims.height / 16));
    pass.end();
    this.stats.styleTransfersApplied++;
    return outputTexture;
  }

  getTextureLibrary() { return this.textureLibrary; }

  dispose() {
    for (const tex of this.textureLibrary.values()) tex.destroy();
    this.textureLibrary.clear();
    for (const buf of Object.values(this.uniformBuffers)) buf.destroy();
    this.uniformBuffers = {};
    this.pipelines = {};
    this.initialized = false;
    this.stats.gpuMemoryBytes = 0;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ProceduralHorrorArt2026 };
}
if (typeof window !== 'undefined') {
  window.ProceduralHorrorArt2026 = ProceduralHorrorArt2026;
}
