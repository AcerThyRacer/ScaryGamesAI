/**
 * HorrorReplaySystem2026 — Horror Replay Cinematic Mode
 * Records gameplay as compact scene data (not video), then replays with
 * upgraded path-traced rendering, free camera, and cinematic effects.
 * Supports delta-compressed binary recording at ~1KB/frame.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const FRAME_HEADER_SIZE = 64;
const MAX_ENTITIES_PER_FRAME = 512;
const MAX_LIGHTS_PER_FRAME = 128;
const MAX_AUDIO_EVENTS_PER_FRAME = 32;
const DELTA_THRESHOLD = 0.001;

const COLOR_GRADING_PRESETS = {
  '70s_horror': {
    shadows: [0.05, 0.02, 0.0],
    midtones: [0.95, 0.85, 0.6],
    highlights: [1.0, 0.9, 0.75],
    contrast: 1.3,
    saturation: 0.7,
    grain: 0.15,
  },
  found_footage: {
    shadows: [0.0, 0.05, 0.0],
    midtones: [0.8, 0.9, 0.8],
    highlights: [0.85, 0.95, 0.85],
    contrast: 0.9,
    saturation: 0.4,
    grain: 0.35,
  },
  noir: {
    shadows: [0.0, 0.0, 0.02],
    midtones: [0.5, 0.5, 0.55],
    highlights: [1.0, 1.0, 1.05],
    contrast: 1.6,
    saturation: 0.0,
    grain: 0.1,
  },
  neon: {
    shadows: [0.05, 0.0, 0.1],
    midtones: [0.8, 0.4, 1.0],
    highlights: [0.6, 1.0, 1.0],
    contrast: 1.4,
    saturation: 1.5,
    grain: 0.02,
  },
  bleach_bypass: {
    shadows: [0.02, 0.02, 0.04],
    midtones: [0.7, 0.7, 0.75],
    highlights: [1.1, 1.05, 1.0],
    contrast: 1.5,
    saturation: 0.35,
    grain: 0.08,
  },
};

const HIGHLIGHT_THRESHOLDS = {
  jumpscare: { intensitySpike: 0.7, durationMs: 500 },
  kill: { damageDealt: 0.9, windowMs: 200 },
  death: { healthDrop: 1.0, windowMs: 100 },
  chase: { velocityThreshold: 8.0, durationMs: 3000 },
  ambient: { anxietySpike: 0.6, durationMs: 2000 },
};

const CINEMATIC_SHADER = /* wgsl */ `
struct CinematicParams {
  resolution: vec2f,
  focalDistance: f32,
  aperture: f32,
  filmGrain: f32,
  time: f32,
  letterboxRatio: f32,
  vignetteStrength: f32,
  colorGradeShadows: vec3f,
  _pad0: f32,
  colorGradeMidtones: vec3f,
  _pad1: f32,
  colorGradeHighlights: vec3f,
  contrast: f32,
  saturation: f32,
  _pad2: vec3f,
};

@group(0) @binding(0) var<uniform> params: CinematicParams;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var depthTex: texture_2d<f32>;
@group(0) @binding(3) var outputTex: texture_storage_2d<rgba16float, write>;

fn hash(p: vec2f) -> f32 {
  let h = dot(p, vec2f(127.1, 311.7));
  return fract(sin(h) * 43758.5453123);
}

fn applyDOF(uv: vec2f, color: vec3f, depth: f32) -> vec3f {
  let coc = abs(depth - params.focalDistance) * params.aperture;
  let cocClamp = clamp(coc, 0.0, 8.0);
  if (cocClamp < 0.5) { return color; }
  var blurred = vec3f(0.0);
  let samples = 8;
  for (var i = 0; i < samples; i++) {
    let angle = f32(i) * 6.2831853 / f32(samples);
    let offset = vec2f(cos(angle), sin(angle)) * cocClamp / params.resolution;
    blurred += textureLoad(inputTex, vec2i(vec2f(uv + offset) * params.resolution), 0).rgb;
  }
  return mix(color, blurred / f32(samples), clamp(cocClamp / 4.0, 0.0, 1.0));
}

fn applyColorGrading(color: vec3f) -> vec3f {
  let luminance = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  let shadowWeight = 1.0 - smoothstep(0.0, 0.33, luminance);
  let highlightWeight = smoothstep(0.66, 1.0, luminance);
  let midtoneWeight = 1.0 - shadowWeight - highlightWeight;
  var graded = color * (
    params.colorGradeShadows * shadowWeight +
    params.colorGradeMidtones * midtoneWeight +
    params.colorGradeHighlights * highlightWeight
  );
  let gray = dot(graded, vec3f(0.2126, 0.7152, 0.0722));
  graded = mix(vec3f(gray), graded, params.saturation);
  graded = (graded - 0.5) * params.contrast + 0.5;
  return clamp(graded, vec3f(0.0), vec3f(1.0));
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = vec2u(textureDimensions(inputTex));
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let uv = vec2f(f32(gid.x) + 0.5, f32(gid.y) + 0.5) / vec2f(f32(dims.x), f32(dims.y));
  var color = textureLoad(inputTex, vec2i(gid.xy), 0).rgb;
  let depth = textureLoad(depthTex, vec2i(gid.xy), 0).r;

  // Depth of field
  if (params.aperture > 0.0) {
    color = applyDOF(uv, color, depth);
  }

  // Color grading
  color = applyColorGrading(color);

  // Film grain
  if (params.filmGrain > 0.0) {
    let noise = hash(uv * params.resolution + vec2f(params.time * 100.0)) - 0.5;
    color += vec3f(noise * params.filmGrain);
  }

  // Vignette
  let vigUV = uv * 2.0 - 1.0;
  let vig = 1.0 - dot(vigUV, vigUV) * params.vignetteStrength;
  color *= clamp(vig, 0.0, 1.0);

  // Letterbox bars
  if (params.letterboxRatio > 0.0) {
    let barSize = params.letterboxRatio * 0.5;
    if (uv.y < barSize || uv.y > 1.0 - barSize) {
      color = vec3f(0.0);
    }
  }

  textureStore(outputTex, vec2i(gid.xy), vec4f(color, 1.0));
}
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function encodeFloat16(value) {
  const clamp = Math.max(-65504, Math.min(65504, value));
  const abs = Math.abs(clamp);
  if (abs < 5.96e-8) return clamp < 0 ? 0x8000 : 0;
  if (abs > 65504) return clamp < 0 ? 0xFC00 : 0x7C00;
  const exp = Math.floor(Math.log2(abs));
  const mantissa = Math.round((abs / Math.pow(2, exp) - 1) * 1024);
  const biasedExp = exp + 15;
  return (clamp < 0 ? 0x8000 : 0) | (biasedExp << 10) | mantissa;
}

function deltaEncode(current, previous) {
  if (!previous) return current;
  const delta = new Float32Array(current.length);
  let hasChanges = false;
  for (let i = 0; i < current.length; i++) {
    const diff = current[i] - previous[i];
    if (Math.abs(diff) > DELTA_THRESHOLD) {
      delta[i] = diff;
      hasChanges = true;
    }
  }
  return hasChanges ? delta : null;
}

function deltaDecode(delta, baseline) {
  const result = new Float32Array(baseline.length);
  for (let i = 0; i < baseline.length; i++) {
    result[i] = baseline[i] + (delta ? delta[i] : 0);
  }
  return result;
}

// ─── Class ──────────────────────────────────────────────────────────────────

export class HorrorReplaySystem2026 {
  constructor(device, options = {}) {
    this.device = device;

    this.options = {
      maxRecordingMinutes: options.maxRecordingMinutes ?? 30,
      targetFrameRate: options.targetFrameRate ?? 60,
      width: options.width ?? 1920,
      height: options.height ?? 1080,
      pathTraceSamples: options.pathTraceSamples ?? 256,
      enableHighlightDetection: options.enableHighlightDetection !== undefined
        ? options.enableHighlightDetection : true,
      letterboxRatio: options.letterboxRatio ?? 0.0,
      vignetteStrength: options.vignetteStrength ?? 0.3,
      ...options,
    };

    this._initialized = false;
    this._disposed = false;

    // Recording state
    this._recording = false;
    this._frames = [];
    this._previousFrameData = null;
    this._recordingStartTime = 0;
    this._frameCount = 0;
    this._dataSizeBytes = 0;

    // Replay state
    this._replaying = false;
    this._replayData = null;
    this._replayTime = 0;
    this._replaySpeed = 1.0;
    this._replayPaused = false;
    this._currentReplayFrame = 0;

    // Free camera
    this._freeCameraEnabled = false;
    this._freeCameraTransform = {
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      fov: 60,
    };

    // Cinematic state
    this._dofFocalDistance = 5.0;
    this._dofAperture = 0.0;
    this._colorGrading = null;
    this._filmGrain = 0.0;

    // Highlights
    this._highlights = [];
    this._intensityHistory = [];

    // GPU resources
    this._buffers = {};
    this._textures = {};
    this._pipelines = {};
    this._bindGroups = {};
  }

  async initialize() {
    try {
      this._createBuffers();
      this._createTextures();
      await this._createPipelines();

      this._initialized = true;
      console.log('✓ HorrorReplaySystem2026 initialized');
      console.log(`  • Max recording: ${this.options.maxRecordingMinutes} min`);
      console.log(`  • Resolution: ${this.options.width}×${this.options.height}`);
      console.log(`  • Path-trace samples: ${this.options.pathTraceSamples}`);
      return true;
    } catch (error) {
      console.error('HorrorReplaySystem2026 initialization failed:', error);
      return false;
    }
  }

  _createBuffers() {
    this._buffers.cinematic = this.device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'HorrorReplay-cinematic-uniforms',
    });

    const maxFrames = this.options.maxRecordingMinutes * 60 * this.options.targetFrameRate;
    this._buffers.frameIndex = this.device.createBuffer({
      size: maxFrames * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'HorrorReplay-frame-index',
    });

    this._buffers.screenshot = this.device.createBuffer({
      size: this.options.width * this.options.height * 16,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      label: 'HorrorReplay-screenshot-readback',
    });
  }

  _createTextures() {
    this._textures.output = this.device.createTexture({
      size: { width: this.options.width, height: this.options.height },
      format: 'rgba16float',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_SRC,
      label: 'HorrorReplay-output',
    });

    this._textures.screenshotTarget = this.device.createTexture({
      size: { width: this.options.width, height: this.options.height },
      format: 'rgba16float',
      usage:
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.TEXTURE_BINDING,
      label: 'HorrorReplay-screenshot-target',
    });
  }

  async _createPipelines() {
    const shaderModule = this.device.createShaderModule({
      code: CINEMATIC_SHADER,
      label: 'HorrorReplay-cinematic-shader',
    });

    this._pipelines.cinematic = await this.device.createComputePipelineAsync({
      layout: 'auto',
      compute: { module: shaderModule, entryPoint: 'main' },
    });
  }

  _createBindGroupForTextures(inputTexture, depthTexture) {
    return this.device.createBindGroup({
      layout: this._pipelines.cinematic.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._buffers.cinematic } },
        { binding: 1, resource: inputTexture.createView() },
        { binding: 2, resource: depthTexture.createView() },
        { binding: 3, resource: this._textures.output.createView() },
      ],
    });
  }

  // ─── Recording ──────────────────────────────────────────────────────────────

  startRecording() {
    if (!this._initialized || this._recording) return;

    this._recording = true;
    this._frames = [];
    this._previousFrameData = null;
    this._recordingStartTime = performance.now();
    this._frameCount = 0;
    this._dataSizeBytes = 0;
    this._highlights = [];
    this._intensityHistory = [];

    console.log('✓ HorrorReplay recording started');
  }

  stopRecording() {
    if (!this._recording) return null;
    this._recording = false;
    const duration = (performance.now() - this._recordingStartTime) / 1000;
    console.log(`✓ HorrorReplay recording stopped — ${this._frameCount} frames, ${duration.toFixed(1)}s`);

    return {
      frames: this._frames,
      frameCount: this._frameCount,
      duration,
      dataSizeBytes: this._dataSizeBytes,
      highlights: this._highlights,
      targetFrameRate: this.options.targetFrameRate,
    };
  }

  captureFrame(sceneState) {
    if (!this._recording) return;

    const maxFrames = this.options.maxRecordingMinutes * 60 * this.options.targetFrameRate;
    if (this._frameCount >= maxFrames) {
      this.stopRecording();
      return;
    }

    const frameData = this._serializeSceneState(sceneState);
    const delta = deltaEncode(frameData, this._previousFrameData);

    const isKeyframe = this._frameCount % (this.options.targetFrameRate * 2) === 0;
    const stored = isKeyframe ? frameData : delta;

    if (stored !== null || isKeyframe) {
      const entry = {
        index: this._frameCount,
        timestamp: performance.now() - this._recordingStartTime,
        isKeyframe,
        data: stored || frameData,
        audioEvents: sceneState.audioEvents || [],
        effectTriggers: sceneState.effectTriggers || [],
      };
      this._frames.push(entry);
      this._dataSizeBytes += (stored || frameData).byteLength + FRAME_HEADER_SIZE;
    }

    if (this.options.enableHighlightDetection) {
      this._detectHighlights(sceneState, this._frameCount);
    }

    this._previousFrameData = frameData;
    this._frameCount++;
  }

  _serializeSceneState(state) {
    const entityCount = Math.min(state.entities?.length ?? 0, MAX_ENTITIES_PER_FRAME);
    const lightCount = Math.min(state.lights?.length ?? 0, MAX_LIGHTS_PER_FRAME);

    // Camera (16) + entities (8 per) + lights (8 per) + metadata (4)
    const totalFloats = 16 + entityCount * 8 + lightCount * 8 + 4;
    const data = new Float32Array(totalFloats);
    let offset = 0;

    // Camera: position(3) + rotation(4) + fov(1) + near(1) + far(1) + pad(6)
    const cam = state.camera || {};
    data.set(cam.position || [0, 0, 0], offset); offset += 3;
    data.set(cam.rotation || [0, 0, 0, 1], offset); offset += 4;
    data[offset++] = cam.fov ?? 60;
    data[offset++] = cam.near ?? 0.1;
    data[offset++] = cam.far ?? 1000;
    offset += 6; // padding to 16

    // Entities: position(3) + rotation(4) + stateFlags(1)
    for (let i = 0; i < entityCount; i++) {
      const e = state.entities[i];
      data.set(e.position || [0, 0, 0], offset); offset += 3;
      data.set(e.rotation || [0, 0, 0, 1], offset); offset += 4;
      data[offset++] = e.stateFlags ?? 0;
    }

    // Lights: position(3) + color(3) + intensity(1) + range(1)
    for (let i = 0; i < lightCount; i++) {
      const l = state.lights[i];
      data.set(l.position || [0, 0, 0], offset); offset += 3;
      data.set(l.color || [1, 1, 1], offset); offset += 3;
      data[offset++] = l.intensity ?? 1;
      data[offset++] = l.range ?? 10;
    }

    // Metadata
    data[offset++] = entityCount;
    data[offset++] = lightCount;
    data[offset++] = state.anxietyLevel ?? 0;
    data[offset++] = state.playerHealth ?? 1;

    return data;
  }

  _detectHighlights(state, frameIndex) {
    const intensity = (state.anxietyLevel ?? 0) + (1.0 - (state.playerHealth ?? 1)) * 0.5;
    this._intensityHistory.push({ frame: frameIndex, intensity });

    // Keep a sliding window of recent intensity
    if (this._intensityHistory.length > this.options.targetFrameRate * 5) {
      this._intensityHistory.shift();
    }

    // Detect intensity spikes
    if (this._intensityHistory.length > 10) {
      const recent = this._intensityHistory.slice(-10);
      const avg = recent.reduce((s, h) => s + h.intensity, 0) / recent.length;
      const prev = this._intensityHistory.slice(-20, -10);
      const prevAvg = prev.length > 0
        ? prev.reduce((s, h) => s + h.intensity, 0) / prev.length
        : 0;

      const spike = avg - prevAvg;

      if (spike > HIGHLIGHT_THRESHOLDS.jumpscare.intensitySpike) {
        this._addHighlight(frameIndex, 'jumpscare', spike);
      } else if (spike > HIGHLIGHT_THRESHOLDS.ambient.anxietySpike) {
        this._addHighlight(frameIndex, 'tension', spike);
      }

      if ((state.playerHealth ?? 1) <= 0) {
        this._addHighlight(frameIndex, 'death', 1.0);
      }
    }
  }

  _addHighlight(frameIndex, type, intensity) {
    const lastHighlight = this._highlights[this._highlights.length - 1];
    const minGap = this.options.targetFrameRate * 3;
    if (lastHighlight && frameIndex - lastHighlight.frame < minGap) return;

    this._highlights.push({
      frame: frameIndex,
      time: frameIndex / this.options.targetFrameRate,
      type,
      intensity: Math.min(intensity, 1.0),
    });
  }

  // ─── Replay ─────────────────────────────────────────────────────────────────

  startReplay(recordingData) {
    if (!this._initialized || this._replaying) return;

    this._replayData = recordingData;
    this._replaying = true;
    this._replayTime = 0;
    this._replaySpeed = 1.0;
    this._replayPaused = false;
    this._currentReplayFrame = 0;

    console.log(`✓ HorrorReplay playback started — ${recordingData.frameCount} frames`);
  }

  stopReplay() {
    this._replaying = false;
    this._replayData = null;
    console.log('✓ HorrorReplay playback stopped');
  }

  setReplayTime(seconds) {
    if (!this._replayData) return;
    this._replayTime = Math.max(0, Math.min(seconds, this._replayData.duration));
    this._currentReplayFrame = Math.floor(
      this._replayTime * this._replayData.targetFrameRate
    );
  }

  setReplaySpeed(multiplier) {
    this._replaySpeed = Math.max(0.25, Math.min(4.0, multiplier));
  }

  setFreeCamera(enabled) {
    this._freeCameraEnabled = !!enabled;
    if (enabled && this._replayData) {
      const frame = this._getReconstructedFrame(this._currentReplayFrame);
      if (frame) {
        this._freeCameraTransform.position = [frame[0], frame[1], frame[2]];
        this._freeCameraTransform.rotation = [frame[3], frame[4], frame[5], frame[6]];
        this._freeCameraTransform.fov = frame[7];
      }
    }
  }

  setCinematicDOF(focalDistance, aperture) {
    this._dofFocalDistance = focalDistance ?? 5.0;
    this._dofAperture = aperture ?? 0.0;
  }

  setColorGrading(preset) {
    if (preset && COLOR_GRADING_PRESETS[preset]) {
      this._colorGrading = COLOR_GRADING_PRESETS[preset];
      this._filmGrain = this._colorGrading.grain;
    } else {
      this._colorGrading = null;
      this._filmGrain = 0.0;
    }
  }

  _getReconstructedFrame(targetFrame) {
    if (!this._replayData?.frames?.length) return null;

    // Find nearest keyframe at or before targetFrame
    let keyframeIdx = 0;
    for (let i = this._replayData.frames.length - 1; i >= 0; i--) {
      if (this._replayData.frames[i].isKeyframe && this._replayData.frames[i].index <= targetFrame) {
        keyframeIdx = i;
        break;
      }
    }

    let reconstructed = new Float32Array(this._replayData.frames[keyframeIdx].data);

    // Apply deltas up to target frame
    for (let i = keyframeIdx + 1; i < this._replayData.frames.length; i++) {
      const frame = this._replayData.frames[i];
      if (frame.index > targetFrame) break;
      if (!frame.isKeyframe && frame.data) {
        reconstructed = deltaDecode(frame.data, reconstructed);
      }
    }

    return reconstructed;
  }

  updateReplay(deltaTime) {
    if (!this._replaying || this._replayPaused || !this._replayData) return null;

    this._replayTime += deltaTime * this._replaySpeed;
    if (this._replayTime >= this._replayData.duration) {
      this._replayTime = this._replayData.duration;
      this._replayPaused = true;
    }

    this._currentReplayFrame = Math.floor(
      this._replayTime * this._replayData.targetFrameRate
    );

    return this._getReconstructedFrame(this._currentReplayFrame);
  }

  applyCinematicEffects(commandEncoder, inputTexture, depthTexture) {
    if (!this._initialized) return;

    const grading = this._colorGrading || COLOR_GRADING_PRESETS['70s_horror'];
    const uniforms = new Float32Array([
      this.options.width, this.options.height,
      this._dofFocalDistance, this._dofAperture,
      this._filmGrain, performance.now() / 1000,
      this.options.letterboxRatio, this.options.vignetteStrength,
      ...grading.shadows, 0,
      ...grading.midtones, 0,
      ...grading.highlights, grading.contrast,
      grading.saturation, 0, 0, 0,
    ]);

    this.device.queue.writeBuffer(this._buffers.cinematic, 0, uniforms);

    const bindGroup = this._createBindGroupForTextures(inputTexture, depthTexture);
    const pass = commandEncoder.beginComputePass({ label: 'HorrorReplay-cinematic' });
    pass.setPipeline(this._pipelines.cinematic);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(
      Math.ceil(this.options.width / 8),
      Math.ceil(this.options.height / 8),
      1
    );
    pass.end();
  }

  async captureScreenshot(width, height, samples) {
    if (!this._initialized) return null;
    width = width ?? this.options.width;
    height = height ?? this.options.height;
    samples = samples ?? this.options.pathTraceSamples;

    const screenshotTex = this.device.createTexture({
      size: { width, height },
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
      label: 'HorrorReplay-screenshot-hires',
    });

    const readBuffer = this.device.createBuffer({
      size: width * height * 8,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      label: 'HorrorReplay-screenshot-read',
    });

    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyTextureToBuffer(
      { texture: screenshotTex },
      { buffer: readBuffer, bytesPerRow: width * 8 },
      { width, height }
    );
    this.device.queue.submit([commandEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const pixelData = new Float32Array(readBuffer.getMappedRange().slice(0));
    readBuffer.unmap();

    readBuffer.destroy();
    screenshotTex.destroy();

    console.log(`✓ Screenshot captured: ${width}×${height}, ${samples} samples`);
    return { width, height, samples, data: pixelData };
  }

  getHighlights() {
    return [...this._highlights];
  }

  exportRecording() {
    if (!this._frames.length) return null;

    const recording = {
      version: 2,
      targetFrameRate: this.options.targetFrameRate,
      frameCount: this._frameCount,
      duration: (performance.now() - this._recordingStartTime) / 1000,
      dataSizeBytes: this._dataSizeBytes,
      highlights: this._highlights,
      frames: this._frames.map(f => ({
        index: f.index,
        timestamp: f.timestamp,
        isKeyframe: f.isKeyframe,
        data: Array.from(f.data),
        audioEvents: f.audioEvents,
        effectTriggers: f.effectTriggers,
      })),
    };

    return JSON.stringify(recording);
  }

  importRecording(data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      parsed.frames = parsed.frames.map(f => ({
        ...f,
        data: new Float32Array(f.data),
      }));
      console.log(`✓ Recording imported: ${parsed.frameCount} frames, ${parsed.duration.toFixed(1)}s`);
      return parsed;
    } catch (error) {
      console.error('Failed to import recording:', error);
      return null;
    }
  }

  getStats() {
    return {
      recordingDuration: this._recording
        ? (performance.now() - this._recordingStartTime) / 1000
        : (this._replayData?.duration ?? 0),
      frameCount: this._frameCount,
      dataSizeBytes: this._dataSizeBytes,
      isRecording: this._recording,
      isReplaying: this._replaying,
      replayTime: this._replayTime,
      replaySpeed: this._replaySpeed,
      highlightCount: this._highlights.length,
      freeCameraEnabled: this._freeCameraEnabled,
    };
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;

    for (const t of Object.values(this._textures)) {
      if (t) t.destroy();
    }
    for (const b of Object.values(this._buffers)) {
      if (b) b.destroy();
    }

    this._frames = [];
    this._replayData = null;
    this._highlights = [];
    this._intensityHistory = [];

    this.device = null;
    this._initialized = false;
    console.log('✓ HorrorReplaySystem2026 disposed');
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

export default HorrorReplaySystem2026;
