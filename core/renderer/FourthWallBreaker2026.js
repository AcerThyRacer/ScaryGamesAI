/**
 * FourthWallBreaker2026 — Fourth Wall Breaking Visual Tech
 * Horror meta-effects that make the game feel like it's breaking out of the screen.
 *
 * Effects:
 *   1. Persistent Screen Cracks — Voronoi-based cracks with refraction, persist across sessions
 *   2. Desktop/Browser Glitch — Screen tear, RGB split, fake crash, pixel sort, static noise
 *   3. Meta-Horror Text Overlay — Self-typing awareness text with hesitation/correction
 *   4. Screen Corruption — Pixel shuffle, color inversion, data moshing
 */

// ---------------------------------------------------------------------------
// WGSL Shader Sources
// ---------------------------------------------------------------------------

const VORONOI_CRACK_SHADER = /* wgsl */ `
struct CrackParams {
  width: u32,
  height: u32,
  numCracks: u32,
  time: f32,
  refractionStrength: f32,
  healRate: f32,
  _pad0: f32,
  _pad1: f32,
};

struct CrackPoint {
  x: f32,
  y: f32,
  intensity: f32,
  age: f32,
};

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: CrackParams;
@group(0) @binding(3) var<storage, read> cracks: array<CrackPoint>;

fn hash2(p: vec2f) -> vec2f {
  let k = vec2f(127.1, 311.7);
  return fract(sin(vec2f(dot(p, k), dot(p, k.yx))) * 43758.5453);
}

fn voronoiEdge(uv: vec2f, numPts: u32) -> f32 {
  var d1 = 1e10;
  var d2 = 1e10;
  for (var i = 0u; i < numPts; i++) {
    let cp = vec2f(cracks[i].x, cracks[i].y);
    let jitter = hash2(cp * 17.3 + vec2f(f32(i)));
    let pt = cp + jitter * 0.01;
    let d = distance(uv, pt);
    if (d < d1) {
      d2 = d1;
      d1 = d;
    } else if (d < d2) {
      d2 = d;
    }
  }
  return d2 - d1;
}

fn crackIntensityAt(uv: vec2f, numPts: u32) -> f32 {
  var closest = 0u;
  var minD = 1e10;
  for (var i = 0u; i < numPts; i++) {
    let cp = vec2f(cracks[i].x, cracks[i].y);
    let d = distance(uv, cp);
    if (d < minD) {
      minD = d;
      closest = i;
    }
  }
  return cracks[closest].intensity * max(0.0, 1.0 - cracks[closest].age * params.healRate);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let px = gid.xy;
  if (px.x >= params.width || px.y >= params.height) { return; }

  let uv = vec2f(f32(px.x) / f32(params.width), f32(px.y) / f32(params.height));
  let dims = vec2i(i32(params.width), i32(params.height));

  var color = textureLoad(inputTex, px, 0);

  if (params.numCracks == 0u) {
    textureStore(outputTex, px, color);
    return;
  }

  let edge = voronoiEdge(uv, min(params.numCracks, 64u));
  let crackMask = smoothstep(0.015, 0.002, edge);
  let intensity = crackIntensityAt(uv, min(params.numCracks, 64u));
  let effectStrength = crackMask * intensity;

  // Chromatic aberration along crack lines
  let refractOffset = effectStrength * params.refractionStrength;
  let uvR = uv + vec2f(refractOffset * 0.01, 0.0);
  let uvB = uv - vec2f(refractOffset * 0.01, refractOffset * 0.005);
  let pxR = vec2u(clamp(vec2i(uvR * vec2f(f32(params.width), f32(params.height))), vec2i(0), dims - vec2i(1)));
  let pxB = vec2u(clamp(vec2i(uvB * vec2f(f32(params.width), f32(params.height))), vec2i(0), dims - vec2i(1)));

  let r = textureLoad(inputTex, pxR, 0).r;
  let g = color.g;
  let b = textureLoad(inputTex, pxB, 0).b;

  let cracked = mix(color.rgb, vec3f(r, g, b), effectStrength);

  // White highlight along crack edges
  let highlight = smoothstep(0.01, 0.004, edge) * intensity * 0.3;
  let final_color = cracked + vec3f(highlight);

  textureStore(outputTex, px, vec4f(final_color, color.a));
}
`;

const GLITCH_COMPOSITE_SHADER = /* wgsl */ `
struct GlitchParams {
  width: u32,
  height: u32,
  time: f32,
  tearStrength: f32,
  rgbSplitAmount: f32,
  staticIntensity: f32,
  crashFlicker: f32,
  glitchMix: f32,
};

fn pcgHash(input: u32) -> u32 {
  var state = input * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn randomFloat(seed: u32) -> f32 {
  return f32(pcgHash(seed)) / 4294967295.0;
}

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: GlitchParams;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let px = gid.xy;
  if (px.x >= params.width || px.y >= params.height) { return; }

  let uv = vec2f(f32(px.x) / f32(params.width), f32(px.y) / f32(params.height));
  let dims = vec2i(i32(params.width), i32(params.height));
  let timeU = u32(params.time * 1000.0);

  var color = textureLoad(inputTex, px, 0).rgb;

  // Screen tear — horizontal offset of random scanline bands
  if (params.tearStrength > 0.0) {
    let bandSeed = timeU + px.y / 8u;
    let bandRand = randomFloat(bandSeed);
    if (bandRand < params.tearStrength * 0.3) {
      let offset = i32((randomFloat(bandSeed + 1u) - 0.5) * params.tearStrength * f32(params.width) * 0.1);
      let srcX = clamp(i32(px.x) + offset, 0, dims.x - 1);
      color = textureLoad(inputTex, vec2u(u32(srcX), px.y), 0).rgb;
    }
  }

  // RGB channel separation
  if (params.rgbSplitAmount > 0.0) {
    let splitPx = i32(params.rgbSplitAmount * f32(params.width) * 0.02);
    let rPx = vec2u(u32(clamp(i32(px.x) + splitPx, 0, dims.x - 1)), px.y);
    let bPx = vec2u(u32(clamp(i32(px.x) - splitPx, 0, dims.x - 1)), px.y);
    color = vec3f(
      textureLoad(inputTex, rPx, 0).r,
      color.g,
      textureLoad(inputTex, bPx, 0).b
    );
  }

  // Static noise bursts
  if (params.staticIntensity > 0.0) {
    let noiseSeed = timeU * 73u + px.x * 1277u + px.y * 7919u;
    let noise = randomFloat(noiseSeed);
    let burstThreshold = 1.0 - params.staticIntensity * 0.5;
    if (noise > burstThreshold) {
      let staticVal = randomFloat(noiseSeed + 42u);
      color = mix(color, vec3f(staticVal), params.staticIntensity);
    }
  }

  // Fake crash flicker — BSOD-style blue/black flash
  if (params.crashFlicker > 0.0) {
    let flickerPhase = sin(params.time * 30.0) * 0.5 + 0.5;
    if (flickerPhase > 0.6) {
      let bsodBlue = vec3f(0.0, 0.0, 0.5);
      color = mix(color, bsodBlue, params.crashFlicker * flickerPhase);
    } else if (flickerPhase < 0.15) {
      color = mix(color, vec3f(0.0), params.crashFlicker);
    }
  }

  let final_color = mix(textureLoad(inputTex, px, 0).rgb, color, params.glitchMix);
  textureStore(outputTex, px, vec4f(final_color, 1.0));
}
`;

const PIXEL_SORT_SHADER = /* wgsl */ `
struct SortParams {
  width: u32,
  height: u32,
  time: f32,
  sortThresholdLow: f32,
  sortThresholdHigh: f32,
  sortDirection: u32, // 0 = horizontal, 1 = vertical
  sortStrength: f32,
  _pad: f32,
};

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}

fn pcgHash(input: u32) -> u32 {
  var state = input * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn randomFloat(seed: u32) -> f32 {
  return f32(pcgHash(seed)) / 4294967295.0;
}

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: SortParams;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  // Each thread handles one row (horizontal) or column (vertical)
  let lineIdx = gid.x;
  let maxLine = select(params.height, params.width, params.sortDirection == 0u);
  let lineLen = select(params.width, params.height, params.sortDirection == 0u);

  if (lineIdx >= maxLine) { return; }

  // Determine if this line should be sorted (random selection based on time)
  let lineSeed = u32(params.time * 100.0) * 997u + lineIdx * 1009u;
  if (randomFloat(lineSeed) > params.sortStrength) {
    // Pass through unsorted
    for (var i = 0u; i < lineLen; i++) {
      let coord = select(vec2u(i, lineIdx), vec2u(lineIdx, i), params.sortDirection == 0u);
      if (coord.x < params.width && coord.y < params.height) {
        let c = textureLoad(inputTex, coord, 0);
        textureStore(outputTex, coord, c);
      }
    }
    return;
  }

  // Odd-even transposition sort on pixels within luminance threshold
  // Limited iterations for real-time performance
  let maxIter = min(lineLen / 2u, 32u);
  for (var iter = 0u; iter < maxIter; iter++) {
    let parity = iter % 2u;
    for (var i = parity; i + 1u < lineLen; i += 2u) {
      let coordA = select(vec2u(i, lineIdx), vec2u(lineIdx, i), params.sortDirection == 0u);
      let coordB = select(vec2u(i + 1u, lineIdx), vec2u(lineIdx, i + 1u), params.sortDirection == 0u);

      if (coordA.x >= params.width || coordA.y >= params.height) { continue; }
      if (coordB.x >= params.width || coordB.y >= params.height) { continue; }

      let cA = textureLoad(inputTex, coordA, 0).rgb;
      let cB = textureLoad(inputTex, coordB, 0).rgb;
      let lumA = luminance(cA);
      let lumB = luminance(cB);

      let inRangeA = lumA >= params.sortThresholdLow && lumA <= params.sortThresholdHigh;
      let inRangeB = lumB >= params.sortThresholdLow && lumB <= params.sortThresholdHigh;

      if (inRangeA && inRangeB && lumA > lumB) {
        textureStore(outputTex, coordA, vec4f(cB, 1.0));
        textureStore(outputTex, coordB, vec4f(cA, 1.0));
      } else {
        textureStore(outputTex, coordA, vec4f(cA, 1.0));
        textureStore(outputTex, coordB, vec4f(cB, 1.0));
      }
    }
  }
}
`;

const DATA_MOSH_SHADER = /* wgsl */ `
struct MoshParams {
  width: u32,
  height: u32,
  time: f32,
  blockSize: u32,
  freezeChance: f32,
  corruptionSpread: f32,
  originX: f32,
  originY: f32,
  maxCoverage: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
};

fn pcgHash(input: u32) -> u32 {
  var state = input * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn randomFloat(seed: u32) -> f32 {
  return f32(pcgHash(seed)) / 4294967295.0;
}

@group(0) @binding(0) var currentFrame: texture_2d<f32>;
@group(0) @binding(1) var previousFrame: texture_2d<f32>;
@group(0) @binding(2) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var<uniform> params: MoshParams;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let px = gid.xy;
  if (px.x >= params.width || px.y >= params.height) { return; }

  let uv = vec2f(f32(px.x) / f32(params.width), f32(px.y) / f32(params.height));
  let origin = vec2f(params.originX, params.originY);
  let distFromOrigin = distance(uv, origin);

  // Corruption radiates from origin with maxCoverage limit
  let coverageRadius = params.corruptionSpread * params.maxCoverage;
  if (distFromOrigin > coverageRadius) {
    textureStore(outputTex, px, textureLoad(currentFrame, px, 0));
    return;
  }

  let blockX = px.x / params.blockSize;
  let blockY = px.y / params.blockSize;
  let blockSeed = blockX * 7919u + blockY * 1277u + u32(params.time * 10.0) * 31u;
  let shouldFreeze = randomFloat(blockSeed) < params.freezeChance;

  if (shouldFreeze) {
    // Hold previous frame's block data — the core data mosh effect
    let prevColor = textureLoad(previousFrame, px, 0);

    // Optional: color inversion on some frozen blocks
    let invertSeed = blockSeed + 777u;
    if (randomFloat(invertSeed) < 0.2) {
      textureStore(outputTex, px, vec4f(vec3f(1.0) - prevColor.rgb, 1.0));
    } else {
      textureStore(outputTex, px, prevColor);
    }
  } else {
    // Pixel shuffle within block for non-frozen corrupted blocks
    let shuffleSeed = blockSeed + 42u;
    let localX = px.x % params.blockSize;
    let localY = px.y % params.blockSize;
    let shuffleX = (localX + u32(randomFloat(shuffleSeed) * f32(params.blockSize))) % params.blockSize;
    let shuffleY = (localY + u32(randomFloat(shuffleSeed + 1u) * f32(params.blockSize))) % params.blockSize;
    let shuffledPx = vec2u(blockX * params.blockSize + shuffleX, blockY * params.blockSize + shuffleY);

    if (shuffledPx.x < params.width && shuffledPx.y < params.height) {
      textureStore(outputTex, px, textureLoad(currentFrame, shuffledPx, 0));
    } else {
      textureStore(outputTex, px, textureLoad(currentFrame, px, 0));
    }
  }
}
`;

// ---------------------------------------------------------------------------
// FourthWallBreaker2026 Class
// ---------------------------------------------------------------------------

export class FourthWallBreaker2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.enablePersistence = options.enablePersistence !== false;
    this.maxCracks = options.maxCracks || 20;
    this.enableDesktopGlitch = options.enableDesktopGlitch !== false;

    this.cracks = [];
    this.activeGlitches = [];
    this.activeCorruptions = [];
    this.activeTexts = [];
    this.time = 0;
    this.initialized = false;

    this.pipelines = {};
    this.textures = {};
    this.buffers = {};
    this.previousFrameTexture = null;
    this.outputTexture = null;
    this.textCanvas = null;
    this.textCtx = null;
  }

  async initialize() {
    this._createTextures();
    this._createBuffers();
    await this._createPipelines();
    this._initTextCanvas();

    if (this.enablePersistence) {
      this._loadPersistedState();
    }

    this.initialized = true;
  }

  _createTextures() {
    const desc = {
      size: { width: this.width, height: this.height },
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC,
    };

    this.textures.intermediate = this.device.createTexture(desc);
    this.textures.intermediate2 = this.device.createTexture(desc);
    this.textures.output = this.device.createTexture(desc);
    this.textures.previousFrame = this.device.createTexture(desc);

    this.textures.textOverlay = this.device.createTexture({
      ...desc,
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST |
             GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  _createBuffers() {
    this.buffers.crackParams = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.buffers.crackPoints = this.device.createBuffer({
      size: Math.max(16, this.maxCracks * 16),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.buffers.glitchParams = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.buffers.sortParams = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.buffers.moshParams = this.device.createBuffer({
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  async _createPipelines() {
    const makeComputePipeline = (code, label) => {
      const module = this.device.createShaderModule({ code, label });
      return this.device.createComputePipeline({
        layout: 'auto',
        compute: { module, entryPoint: 'main' },
        label,
      });
    };

    this.pipelines.crack = makeComputePipeline(VORONOI_CRACK_SHADER, 'crack');
    this.pipelines.glitch = makeComputePipeline(GLITCH_COMPOSITE_SHADER, 'glitch');
    this.pipelines.pixelSort = makeComputePipeline(PIXEL_SORT_SHADER, 'pixelSort');
    this.pipelines.dataMosh = makeComputePipeline(DATA_MOSH_SHADER, 'dataMosh');
  }

  _initTextCanvas() {
    if (typeof document === 'undefined') return;
    this.textCanvas = document.createElement('canvas');
    this.textCanvas.width = this.width;
    this.textCanvas.height = this.height;
    this.textCtx = this.textCanvas.getContext('2d');
  }

  // ---- Crack Management ----

  addCrack(position, intensity = 1.0) {
    if (this.cracks.length >= this.maxCracks) {
      // Replace oldest crack
      this.cracks.shift();
    }
    this.cracks.push({
      x: position.x ?? position[0] ?? 0.5,
      y: position.y ?? position[1] ?? 0.5,
      intensity: Math.min(Math.max(intensity, 0), 1),
      age: 0,
    });

    if (this.enablePersistence) {
      this._persistState();
    }
  }

  getCrackState() {
    return JSON.parse(JSON.stringify(this.cracks));
  }

  loadCrackState(state) {
    if (Array.isArray(state)) {
      this.cracks = state.slice(0, this.maxCracks).map(c => ({
        x: c.x || 0.5,
        y: c.y || 0.5,
        intensity: c.intensity || 1.0,
        age: c.age || 0,
      }));
    }
  }

  _persistState() {
    try {
      localStorage.setItem('fwb_cracks', JSON.stringify(this.getCrackState()));
    } catch { /* storage unavailable */ }
  }

  _loadPersistedState() {
    try {
      const saved = localStorage.getItem('fwb_cracks');
      if (saved) this.loadCrackState(JSON.parse(saved));
    } catch { /* storage unavailable */ }
  }

  // ---- Glitch Triggers ----

  triggerGlitch(type = 'tear', duration = 0.5) {
    const validTypes = ['tear', 'static', 'crash', 'sort', 'mosh'];
    if (!validTypes.includes(type)) type = 'tear';
    this.activeGlitches.push({ type, duration, elapsed: 0, peak: duration * 0.3 });
  }

  triggerCorruption(origin = { x: 0.5, y: 0.5 }, spread = 0.5, duration = 2.0) {
    this.activeCorruptions.push({
      originX: origin.x ?? origin[0] ?? 0.5,
      originY: origin.y ?? origin[1] ?? 0.5,
      spread: Math.min(spread, 1.0),
      duration,
      elapsed: 0,
    });
  }

  // ---- Meta-Horror Text ----

  showText(text, position = null, options = {}) {
    const pos = position || { x: 0.5, y: 0.8 };
    this.activeTexts.push({
      fullText: text,
      displayedText: '',
      charIndex: 0,
      x: pos.x ?? pos[0] ?? 0.5,
      y: pos.y ?? pos[1] ?? 0.8,
      elapsed: 0,
      nextCharTime: 0,
      fadeStart: null,
      fadeDuration: options.fadeDuration || 1.5,
      readingTime: options.readingTime || Math.max(2, text.length * 0.06),
      fontSize: options.fontSize || 24,
      color: options.color || 'rgba(200, 0, 0, 0.9)',
      typing: true,
      corrections: this._generateCorrections(text),
    });
  }

  _generateCorrections(text) {
    // Pre-compute random typo/correction points for realism
    const corrections = [];
    for (let i = 0; i < text.length; i++) {
      if (Math.random() < 0.04 && i > 3) {
        corrections.push({ index: i, wrongChar: String.fromCharCode(97 + Math.floor(Math.random() * 26)) });
      }
    }
    return corrections;
  }

  _updateText(entry, dt) {
    if (entry.typing) {
      entry.elapsed += dt;
      if (entry.elapsed >= entry.nextCharTime && entry.charIndex < entry.fullText.length) {
        // Variable typing speed: faster for common letters, slower for spaces/punctuation
        const ch = entry.fullText[entry.charIndex];
        let delay = 0.04 + Math.random() * 0.06;
        if (ch === ' ') delay += 0.03;
        if ('.!?'.includes(ch)) delay += 0.15 + Math.random() * 0.2;
        if (ch === ',') delay += 0.08;

        // Check for correction at this index
        const correction = entry.corrections.find(c => c.index === entry.charIndex);
        if (correction && !correction.done) {
          entry.displayedText += correction.wrongChar;
          correction.done = true;
          delay = 0.3 + Math.random() * 0.2; // Pause before backspace
          entry.nextCharTime = entry.elapsed + delay;
          return;
        }
        if (correction && correction.done) {
          entry.displayedText = entry.displayedText.slice(0, -1);
          delay = 0.08;
        }

        entry.displayedText += entry.fullText[entry.charIndex];
        entry.charIndex++;
        entry.nextCharTime = entry.elapsed + delay;
      }
      if (entry.charIndex >= entry.fullText.length) {
        entry.typing = false;
        entry.fadeStart = entry.elapsed + entry.readingTime;
      }
    }
  }

  _renderTextOverlay() {
    if (!this.textCtx || this.activeTexts.length === 0) return;
    const ctx = this.textCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    for (const entry of this.activeTexts) {
      let alpha = 1.0;
      if (entry.fadeStart !== null && entry.elapsed > entry.fadeStart) {
        alpha = Math.max(0, 1.0 - (entry.elapsed - entry.fadeStart) / entry.fadeDuration);
      }
      ctx.font = `${entry.fontSize}px 'Courier New', monospace`;
      ctx.fillStyle = entry.color.replace(/[\d.]+\)$/, `${alpha})`);
      ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
      ctx.shadowBlur = 4;

      const x = entry.x * this.width;
      const y = entry.y * this.height;

      // Cursor blink while typing
      const showCursor = entry.typing && Math.floor(entry.elapsed * 3) % 2 === 0;
      const displayStr = entry.displayedText + (showCursor ? '█' : '');
      ctx.fillText(displayStr, x, y);
    }
  }

  // ---- Update & Render ----

  update(deltaTime) {
    this.time += deltaTime;

    // Age cracks
    for (const crack of this.cracks) {
      crack.age += deltaTime;
    }
    // Remove fully healed cracks
    this.cracks = this.cracks.filter(c => c.intensity * Math.max(0, 1 - c.age * 0.02) > 0.01);

    // Update glitches
    for (const g of this.activeGlitches) g.elapsed += deltaTime;
    this.activeGlitches = this.activeGlitches.filter(g => g.elapsed < g.duration);

    // Update corruptions
    for (const c of this.activeCorruptions) c.elapsed += deltaTime;
    this.activeCorruptions = this.activeCorruptions.filter(c => c.elapsed < c.duration);

    // Update text entries
    for (const t of this.activeTexts) this._updateText(t, deltaTime);
    this.activeTexts = this.activeTexts.filter(t => {
      if (t.fadeStart === null) return true;
      return t.elapsed < t.fadeStart + t.fadeDuration;
    });

    this._renderTextOverlay();

    if (this.enablePersistence && this.cracks.length > 0 && Math.random() < 0.01) {
      this._persistState();
    }
  }

  applyEffects(commandEncoder, inputTexture) {
    if (!this.initialized) return;

    let currentInput = inputTexture;
    let currentOutput = this.textures.intermediate;

    // Pass 1: Voronoi crack overlay
    if (this.cracks.length > 0) {
      this._applyCrackPass(commandEncoder, currentInput, currentOutput);
      currentInput = currentOutput;
      currentOutput = this.textures.intermediate2;
    }

    // Pass 2: Glitch effects (tear, static, crash, RGB split)
    const mainGlitches = this.activeGlitches.filter(g => ['tear', 'static', 'crash'].includes(g.type));
    if (mainGlitches.length > 0) {
      this._applyGlitchPass(commandEncoder, currentInput, currentOutput, mainGlitches);
      currentInput = currentOutput;
      currentOutput = currentInput === this.textures.intermediate
        ? this.textures.intermediate2 : this.textures.intermediate;
    }

    // Pass 3: Pixel sort
    const sortGlitches = this.activeGlitches.filter(g => g.type === 'sort');
    if (sortGlitches.length > 0) {
      this._applyPixelSortPass(commandEncoder, currentInput, currentOutput, sortGlitches);
      currentInput = currentOutput;
      currentOutput = currentInput === this.textures.intermediate
        ? this.textures.intermediate2 : this.textures.intermediate;
    }

    // Pass 4: Data moshing / corruption
    const moshGlitches = this.activeGlitches.filter(g => g.type === 'mosh');
    if (moshGlitches.length > 0 || this.activeCorruptions.length > 0) {
      this._applyDataMoshPass(commandEncoder, currentInput, currentOutput);
      currentInput = currentOutput;
    }

    // Copy final result to output
    this.outputTexture = currentInput;

    // Store frame for next tick's data moshing
    commandEncoder.copyTextureToTexture(
      { texture: inputTexture },
      { texture: this.textures.previousFrame },
      { width: this.width, height: this.height }
    );
  }

  _applyCrackPass(encoder, input, output) {
    const crackData = new Float32Array(this.maxCracks * 4);
    for (let i = 0; i < this.cracks.length; i++) {
      crackData[i * 4 + 0] = this.cracks[i].x;
      crackData[i * 4 + 1] = this.cracks[i].y;
      crackData[i * 4 + 2] = this.cracks[i].intensity;
      crackData[i * 4 + 3] = this.cracks[i].age;
    }
    this.device.queue.writeBuffer(this.buffers.crackPoints, 0, crackData);

    const params = new Float32Array([
      this.width, this.height, this.cracks.length, this.time,
      1.5, 0.02, 0, 0,
    ]);
    const paramsU32 = new Uint32Array(params.buffer);
    paramsU32[0] = this.width;
    paramsU32[1] = this.height;
    paramsU32[2] = this.cracks.length;
    this.device.queue.writeBuffer(this.buffers.crackParams, 0, params);

    const bg = this.device.createBindGroup({
      layout: this.pipelines.crack.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: input.createView() },
        { binding: 1, resource: output.createView() },
        { binding: 2, resource: { buffer: this.buffers.crackParams } },
        { binding: 3, resource: { buffer: this.buffers.crackPoints } },
      ],
    });

    const pass = encoder.beginComputePass({ label: 'crack-pass' });
    pass.setPipeline(this.pipelines.crack);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(this.width / 8), Math.ceil(this.height / 8));
    pass.end();
  }

  _applyGlitchPass(encoder, input, output, glitches) {
    let tearStr = 0, staticStr = 0, crashStr = 0, rgbSplit = 0;
    for (const g of glitches) {
      const progress = g.elapsed / g.duration;
      const envelope = progress < 0.3 ? progress / 0.3 : (1 - progress) / 0.7;
      if (g.type === 'tear') { tearStr = Math.max(tearStr, envelope); rgbSplit = Math.max(rgbSplit, envelope * 0.5); }
      if (g.type === 'static') staticStr = Math.max(staticStr, envelope);
      if (g.type === 'crash') crashStr = Math.max(crashStr, envelope);
    }

    const params = new ArrayBuffer(32);
    const u32 = new Uint32Array(params);
    const f32 = new Float32Array(params);
    u32[0] = this.width; u32[1] = this.height;
    f32[2] = this.time; f32[3] = tearStr; f32[4] = rgbSplit;
    f32[5] = staticStr; f32[6] = crashStr; f32[7] = 1.0;
    this.device.queue.writeBuffer(this.buffers.glitchParams, 0, params);

    const bg = this.device.createBindGroup({
      layout: this.pipelines.glitch.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: input.createView() },
        { binding: 1, resource: output.createView() },
        { binding: 2, resource: { buffer: this.buffers.glitchParams } },
      ],
    });

    const pass = encoder.beginComputePass({ label: 'glitch-pass' });
    pass.setPipeline(this.pipelines.glitch);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(this.width / 8), Math.ceil(this.height / 8));
    pass.end();
  }

  _applyPixelSortPass(encoder, input, output, glitches) {
    const maxEnvelope = glitches.reduce((max, g) => {
      const p = g.elapsed / g.duration;
      return Math.max(max, p < 0.3 ? p / 0.3 : (1 - p) / 0.7);
    }, 0);

    const params = new ArrayBuffer(32);
    const u32 = new Uint32Array(params);
    const f32 = new Float32Array(params);
    u32[0] = this.width; u32[1] = this.height;
    f32[2] = this.time; f32[3] = 0.1; f32[4] = 0.9;
    u32[5] = 0; f32[6] = maxEnvelope; f32[7] = 0;
    this.device.queue.writeBuffer(this.buffers.sortParams, 0, params);

    const bg = this.device.createBindGroup({
      layout: this.pipelines.pixelSort.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: input.createView() },
        { binding: 1, resource: output.createView() },
        { binding: 2, resource: { buffer: this.buffers.sortParams } },
      ],
    });

    const maxLine = this.height;
    const pass = encoder.beginComputePass({ label: 'pixel-sort-pass' });
    pass.setPipeline(this.pipelines.pixelSort);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(maxLine / 256));
    pass.end();
  }

  _applyDataMoshPass(encoder, input, output) {
    const corruption = this.activeCorruptions[0] || {
      originX: 0.5, originY: 0.5, spread: 0.3, duration: 1, elapsed: 0.5,
    };
    const moshGlitch = this.activeGlitches.find(g => g.type === 'mosh');
    const freezeChance = moshGlitch
      ? Math.min(1, (moshGlitch.elapsed / moshGlitch.duration < 0.3
          ? moshGlitch.elapsed / moshGlitch.duration / 0.3
          : (1 - moshGlitch.elapsed / moshGlitch.duration) / 0.7) * 0.6)
      : 0.3;

    const progress = corruption.elapsed / corruption.duration;
    const spreadEnv = progress < 0.5 ? progress * 2 : (1 - progress) * 2;

    const params = new ArrayBuffer(48);
    const u32 = new Uint32Array(params);
    const f32 = new Float32Array(params);
    u32[0] = this.width; u32[1] = this.height;
    f32[2] = this.time; u32[3] = 8;
    f32[4] = freezeChance; f32[5] = spreadEnv * corruption.spread;
    f32[6] = corruption.originX; f32[7] = corruption.originY;
    f32[8] = 0.3; f32[9] = 0; f32[10] = 0; f32[11] = 0;
    this.device.queue.writeBuffer(this.buffers.moshParams, 0, params);

    const bg = this.device.createBindGroup({
      layout: this.pipelines.dataMosh.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: input.createView() },
        { binding: 1, resource: this.textures.previousFrame.createView() },
        { binding: 2, resource: output.createView() },
        { binding: 3, resource: { buffer: this.buffers.moshParams } },
      ],
    });

    const pass = encoder.beginComputePass({ label: 'data-mosh-pass' });
    pass.setPipeline(this.pipelines.dataMosh);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(this.width / 8), Math.ceil(this.height / 8));
    pass.end();
  }

  getOutputTexture() {
    return this.outputTexture || this.textures.output;
  }

  dispose() {
    if (this.enablePersistence) this._persistState();
    for (const tex of Object.values(this.textures)) tex.destroy();
    for (const buf of Object.values(this.buffers)) buf.destroy();
    this.textures = {};
    this.buffers = {};
    this.pipelines = {};
    this.cracks = [];
    this.activeGlitches = [];
    this.activeCorruptions = [];
    this.activeTexts = [];
    this.initialized = false;
  }
}
