/**
 * TessellationEngine2026 - Displacement & Tessellation Engine
 * Compute-based adaptive tessellation + Parallax Occlusion Mapping
 * for horror surface detail: breathing walls, cracked floors, pulsing flesh
 */

// ─── WGSL: Compute Tessellation Shader ──────────────────────────────────────

const TESSELLATION_COMPUTE_SHADER = /* wgsl */ `
struct Vertex {
  position: vec3<f32>,
  normal: vec3<f32>,
  uv: vec2<f32>,
};

struct CameraData {
  viewProj: mat4x4<f32>,
  position: vec3<f32>,
  screenWidth: f32,
  screenHeight: f32,
  time: f32,
  deltaTime: f32,
  _pad: f32,
};

struct TessParams {
  maxTessLevel: u32,
  adaptiveThreshold: f32,
  displacementStrength: f32,
  animType: u32,
  animSpeed: f32,
  animAmplitude: f32,
  animOriginX: f32,
  animOriginY: f32,
};

struct DrawIndirect {
  vertexCount: atomic<u32>,
  instanceCount: u32,
  firstVertex: u32,
  firstInstance: u32,
};

@group(0) @binding(0) var<storage, read> srcVertices: array<Vertex>;
@group(0) @binding(1) var<storage, read> srcIndices: array<u32>;
@group(0) @binding(2) var<storage, read_write> dstVertices: array<Vertex>;
@group(0) @binding(3) var<storage, read_write> dstIndices: array<u32>;
@group(0) @binding(4) var<uniform> camera: CameraData;
@group(0) @binding(5) var<uniform> params: TessParams;
@group(0) @binding(6) var displacementTex: texture_2d<f32>;
@group(0) @binding(7) var displacementSampler: sampler;
@group(0) @binding(8) var<storage, read_write> drawArgs: DrawIndirect;

fn screenSpaceEdgeLength(a: vec3<f32>, b: vec3<f32>) -> f32 {
  let clipA = camera.viewProj * vec4<f32>(a, 1.0);
  let clipB = camera.viewProj * vec4<f32>(b, 1.0);
  let ndcA = clipA.xy / max(clipA.w, 0.001);
  let ndcB = clipB.xy / max(clipB.w, 0.001);
  let screenA = (ndcA * 0.5 + 0.5) * vec2<f32>(camera.screenWidth, camera.screenHeight);
  let screenB = (ndcB * 0.5 + 0.5) * vec2<f32>(camera.screenWidth, camera.screenHeight);
  return length(screenA - screenB);
}

fn calculateTessLevel(v0: vec3<f32>, v1: vec3<f32>, v2: vec3<f32>) -> u32 {
  let center = (v0 + v1 + v2) / 3.0;
  let dist = length(center - camera.position);
  let distFactor = clamp(1.0 / (dist * 0.1 + 1.0), 0.05, 1.0);

  let e0 = screenSpaceEdgeLength(v0, v1);
  let e1 = screenSpaceEdgeLength(v1, v2);
  let e2 = screenSpaceEdgeLength(v2, v0);
  let maxEdge = max(e0, max(e1, e2));
  let edgeFactor = clamp(maxEdge / (params.adaptiveThreshold * 100.0), 0.0, 1.0);

  let level = u32(f32(params.maxTessLevel) * edgeFactor * distFactor);
  return clamp(level, 1u, params.maxTessLevel);
}

fn sampleDisplacement(uv: vec2<f32>) -> f32 {
  return textureSampleLevel(displacementTex, displacementSampler, uv, 0.0).r;
}

fn animateDisplacement(baseHeight: f32, uv: vec2<f32>, time: f32) -> f32 {
  var h = baseHeight;
  let atype = params.animType;
  let speed = params.animSpeed;
  let amp = params.animAmplitude;

  if (atype == 1u) {
    // breathing
    h += sin(time * speed) * amp * 0.5 + amp * 0.5;
  } else if (atype == 2u) {
    // pulse (heartbeat double-beat)
    let t = fract(time * speed * 0.5);
    let beat = pow(sin(t * 3.14159 * 2.0), 16.0) + pow(sin((t + 0.15) * 3.14159 * 2.0), 16.0) * 0.6;
    h += beat * amp;
  } else if (atype == 3u) {
    // crack propagation from origin
    let d = length(uv - vec2<f32>(params.animOriginX, params.animOriginY));
    let frontier = time * speed * 0.2;
    let crack = smoothstep(frontier - 0.05, frontier, d) - smoothstep(frontier, frontier + 0.05, d);
    h += crack * amp * (1.0 - smoothstep(0.0, frontier + 0.1, d));
  } else if (atype == 4u) {
    // water ripple
    let d = length(uv - vec2<f32>(params.animOriginX, params.animOriginY));
    h += sin(d * 30.0 - time * speed) * amp * exp(-d * 3.0);
  } else if (atype == 5u) {
    // corruption spread — organic tendrils
    let d = length(uv - vec2<f32>(params.animOriginX, params.animOriginY));
    let frontier = time * speed * 0.15;
    let noise = sin(uv.x * 23.7 + uv.y * 41.3) * 0.5 + 0.5;
    let spread = smoothstep(frontier + noise * 0.1, frontier - 0.02, d);
    h += spread * amp * (0.5 + 0.5 * sin(d * 20.0 + time * 2.0));
  }

  return h;
}

fn interpolateVertex(a: Vertex, b: Vertex, t: f32) -> Vertex {
  var v: Vertex;
  v.position = mix(a.position, b.position, t);
  v.normal = normalize(mix(a.normal, b.normal, t));
  v.uv = mix(a.uv, b.uv, t);
  return v;
}

fn displaceVertex(v: Vertex, time: f32) -> Vertex {
  var out = v;
  let baseH = sampleDisplacement(v.uv);
  let h = animateDisplacement(baseH, v.uv, time);
  out.position = v.position + v.normal * h * params.displacementStrength;
  return out;
}

@compute @workgroup_size(64)
fn tessellateMain(@builtin(global_invocation_id) gid: vec3<u32>) {
  let triIdx = gid.x;
  let triCount = arrayLength(&srcIndices) / 3u;
  if (triIdx >= triCount) { return; }

  let i0 = srcIndices[triIdx * 3u];
  let i1 = srcIndices[triIdx * 3u + 1u];
  let i2 = srcIndices[triIdx * 3u + 2u];
  let v0 = srcVertices[i0];
  let v1 = srcVertices[i1];
  let v2 = srcVertices[i2];

  let tessLevel = calculateTessLevel(v0.position, v1.position, v2.position);
  let subdivs = min(tessLevel, 8u);

  // Generate sub-triangles via barycentric grid
  let rows = subdivs;
  let baseVert = triIdx * 200u;
  let baseIdx = triIdx * 600u;
  var vertCount = 0u;
  var idxCount = 0u;

  for (var row = 0u; row <= rows; row++) {
    let cols = rows - row;
    for (var col = 0u; col <= cols; col++) {
      let u = f32(col) / f32(rows);
      let v = f32(row) / f32(rows);
      let w = 1.0 - u - v;

      var vert: Vertex;
      vert.position = v0.position * w + v1.position * u + v2.position * v;
      vert.normal = normalize(v0.normal * w + v1.normal * u + v2.normal * v);
      vert.uv = v0.uv * w + v1.uv * u + v2.uv * v;

      vert = displaceVertex(vert, camera.time);

      let vi = baseVert + vertCount;
      if (vi < arrayLength(&dstVertices)) {
        dstVertices[vi] = vert;
      }
      vertCount++;
    }
  }

  // Build index list for the subdivided grid
  var offset = 0u;
  for (var row = 0u; row < rows; row++) {
    let cols = rows - row;
    for (var col = 0u; col < cols; col++) {
      let curr = baseVert + offset + col;
      let next = curr + cols + 1u;

      let ii = baseIdx + idxCount;
      if (ii + 2u < arrayLength(&dstIndices)) {
        dstIndices[ii] = curr;
        dstIndices[ii + 1u] = curr + 1u;
        dstIndices[ii + 2u] = next;
      }
      idxCount += 3u;

      if (col < cols - 1u) {
        let ii2 = baseIdx + idxCount;
        if (ii2 + 2u < arrayLength(&dstIndices)) {
          dstIndices[ii2] = curr + 1u;
          dstIndices[ii2 + 1u] = next + 1u;
          dstIndices[ii2 + 2u] = next;
        }
        idxCount += 3u;
      }
    }
    offset += cols + 1u;
  }

  atomicAdd(&drawArgs.vertexCount, idxCount);
}
`;

// ─── WGSL: Normal Recompute Shader ──────────────────────────────────────────

const NORMAL_RECOMPUTE_SHADER = /* wgsl */ `
struct Vertex {
  position: vec3<f32>,
  normal: vec3<f32>,
  uv: vec2<f32>,
};

@group(0) @binding(0) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(1) var<storage, read> indices: array<u32>;
@group(0) @binding(2) var<uniform> triCount: u32;

@compute @workgroup_size(64)
fn recomputeNormals(@builtin(global_invocation_id) gid: vec3<u32>) {
  let tri = gid.x;
  if (tri >= triCount) { return; }

  let i0 = indices[tri * 3u];
  let i1 = indices[tri * 3u + 1u];
  let i2 = indices[tri * 3u + 2u];

  let p0 = vertices[i0].position;
  let p1 = vertices[i1].position;
  let p2 = vertices[i2].position;

  let edge1 = p1 - p0;
  let edge2 = p2 - p0;
  let faceNormal = normalize(cross(edge1, edge2));

  vertices[i0].normal = faceNormal;
  vertices[i1].normal = faceNormal;
  vertices[i2].normal = faceNormal;
}
`;

// ─── WGSL: Parallax Occlusion Mapping (Fragment Include) ────────────────────

const POM_SHADER_CODE = /* wgsl */ `
// Parallax Occlusion Mapping — include in fragment shaders
// Requires: heightMap texture + sampler bound at appropriate group/binding

fn parallaxOcclusionMapping(
  uv: vec2<f32>,
  viewDirTS: vec3<f32>,
  heightMap: texture_2d<f32>,
  heightSampler: sampler,
  layers: f32
) -> vec2<f32> {
  let numLayers = max(layers, 4.0);
  let layerDepth = 1.0 / numLayers;
  var currentLayerDepth = 0.0;
  let deltaUV = (viewDirTS.xy / max(abs(viewDirTS.z), 0.001)) * 0.1 / numLayers;

  var currentUV = uv;
  var currentDepth = textureSampleLevel(heightMap, heightSampler, currentUV, 0.0).r;

  // Linear march
  for (var i = 0; i < 64; i++) {
    if (currentLayerDepth >= currentDepth) { break; }
    currentUV -= deltaUV;
    currentDepth = textureSampleLevel(heightMap, heightSampler, currentUV, 0.0).r;
    currentLayerDepth += layerDepth;
  }

  // Binary search refinement (8 iterations)
  var delta = deltaUV * 0.5;
  var depthDelta = layerDepth * 0.5;
  for (var j = 0; j < 8; j++) {
    let sampledDepth = textureSampleLevel(heightMap, heightSampler, currentUV, 0.0).r;
    if (currentLayerDepth > sampledDepth) {
      currentUV += delta;
      currentLayerDepth -= depthDelta;
    } else {
      currentUV -= delta;
      currentLayerDepth += depthDelta;
    }
    delta *= 0.5;
    depthDelta *= 0.5;
  }

  return currentUV;
}

fn pomSelfShadow(
  uv: vec2<f32>,
  lightDirTS: vec3<f32>,
  heightMap: texture_2d<f32>,
  heightSampler: sampler,
  surfaceHeight: f32
) -> f32 {
  let numSteps = 16.0;
  let stepSize = 1.0 / numSteps;
  let deltaUV = (lightDirTS.xy / max(abs(lightDirTS.z), 0.001)) * 0.1 / numSteps;

  var sampleUV = uv + deltaUV;
  var currentHeight = surfaceHeight - stepSize;
  var shadow = 0.0;

  for (var i = 0; i < 16; i++) {
    let sampledH = textureSampleLevel(heightMap, heightSampler, sampleUV, 0.0).r;
    if (sampledH > currentHeight) {
      shadow = max(shadow, (sampledH - currentHeight) * (1.0 - f32(i) / numSteps));
    }
    sampleUV += deltaUV;
    currentHeight -= stepSize;
  }

  return 1.0 - clamp(shadow * 4.0, 0.0, 1.0);
}

fn pomSilhouetteCorrection(
  uv: vec2<f32>,
  viewDirTS: vec3<f32>,
  heightMap: texture_2d<f32>,
  heightSampler: sampler,
  edgeFade: f32
) -> f32 {
  let grazing = 1.0 - abs(viewDirTS.z);
  let heightVal = textureSampleLevel(heightMap, heightSampler, uv, 0.0).r;
  return mix(1.0, smoothstep(0.0, edgeFade, 1.0 - grazing * heightVal), 0.8);
}
`;

// ─── Animation Presets ──────────────────────────────────────────────────────

const ANIMATION_TYPES = {
  breathing: { type: 1, speed: 1.5, amplitude: 0.08, originX: 0.5, originY: 0.5 },
  pulse: { type: 2, speed: 1.2, amplitude: 0.12, originX: 0.5, originY: 0.5 },
  crack_propagation: { type: 3, speed: 0.4, amplitude: 0.15, originX: 0.5, originY: 0.5 },
  water_ripple: { type: 4, speed: 3.0, amplitude: 0.05, originX: 0.5, originY: 0.5 },
  corruption_spread: { type: 5, speed: 0.3, amplitude: 0.10, originX: 0.5, originY: 0.5 },
};

// ─── Vertex stride: position(3) + normal(3) + uv(2) = 8 floats = 32 bytes ──
const VERTEX_STRIDE = 32;
const MAX_OUTPUT_VERTICES = 65536;
const MAX_OUTPUT_INDICES = MAX_OUTPUT_VERTICES * 3;

// ─── Engine Class ───────────────────────────────────────────────────────────

export class TessellationEngine2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      maxTessLevel: options.maxTessLevel ?? 64,
      adaptiveThreshold: options.adaptiveThreshold ?? 0.5,
      enableParallaxOcclusion: options.enableParallaxOcclusion ?? true,
      enableDisplacement: options.enableDisplacement ?? true,
      maxDisplacedMeshes: options.maxDisplacedMeshes ?? 256,
      ...options,
    };

    this.meshes = new Map();
    this.animations = new Map();
    this.tessPipeline = null;
    this.normalPipeline = null;
    this.sampler = null;
    this.time = 0;

    this.stats = {
      tessellatedTriangles: 0,
      computeTimeMs: 0,
      registeredMeshes: 0,
    };
  }

  // ── Initialization ──────────────────────────────────────────────────────

  async initialize() {
    try {
      this.sampler = this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        mipmapFilter: 'linear',
        addressModeU: 'repeat',
        addressModeV: 'repeat',
      });

      if (this.options.enableDisplacement) {
        await this._createTessellationPipeline();
        await this._createNormalPipeline();
      }

      console.log('✓ TessellationEngine2026 initialized');
      console.log(`  • Max tess level: ${this.options.maxTessLevel}`);
      console.log(`  • POM: ${this.options.enableParallaxOcclusion}`);
      console.log(`  • Displacement: ${this.options.enableDisplacement}`);
      return true;
    } catch (error) {
      console.error('TessellationEngine2026 initialization failed:', error);
      return false;
    }
  }

  async _createTessellationPipeline() {
    const module = this.device.createShaderModule({
      label: 'Tessellation Compute',
      code: TESSELLATION_COMPUTE_SHADER,
    });

    this.tessBindGroupLayout = this.device.createBindGroupLayout({
      label: 'Tessellation BGL',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 6, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float' } },
        { binding: 7, visibility: GPUShaderStage.COMPUTE, sampler: {} },
        { binding: 8, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
    });

    this.tessPipeline = this.device.createComputePipeline({
      label: 'Tessellation Pipeline',
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.tessBindGroupLayout],
      }),
      compute: { module, entryPoint: 'tessellateMain' },
    });
  }

  async _createNormalPipeline() {
    const module = this.device.createShaderModule({
      label: 'Normal Recompute',
      code: NORMAL_RECOMPUTE_SHADER,
    });

    this.normalBindGroupLayout = this.device.createBindGroupLayout({
      label: 'Normal BGL',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });

    this.normalPipeline = this.device.createComputePipeline({
      label: 'Normal Recompute Pipeline',
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.normalBindGroupLayout],
      }),
      compute: { module, entryPoint: 'recomputeNormals' },
    });
  }

  // ── Mesh Registration ─────────────────────────────────────────────────

  registerMesh(meshId, vertexBuffer, indexBuffer, displacementMap) {
    if (this.meshes.size >= this.options.maxDisplacedMeshes) {
      console.warn(`TessellationEngine2026: max mesh limit (${this.options.maxDisplacedMeshes}) reached`);
      return false;
    }

    const outVertexBuffer = this.device.createBuffer({
      label: `tess-out-verts-${meshId}`,
      size: MAX_OUTPUT_VERTICES * VERTEX_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC,
    });

    const outIndexBuffer = this.device.createBuffer({
      label: `tess-out-idx-${meshId}`,
      size: MAX_OUTPUT_INDICES * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDEX | GPUBufferUsage.COPY_SRC,
    });

    const drawIndirectBuffer = this.device.createBuffer({
      label: `tess-draw-${meshId}`,
      size: 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
    });

    const cameraBuffer = this.device.createBuffer({
      label: `tess-camera-${meshId}`,
      size: 96, // mat4(64) + vec3(12) + 5 floats(20)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const paramsBuffer = this.device.createBuffer({
      label: `tess-params-${meshId}`,
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const triCountBuffer = this.device.createBuffer({
      label: `tess-tricount-${meshId}`,
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.meshes.set(meshId, {
      vertexBuffer,
      indexBuffer,
      displacementMap,
      outVertexBuffer,
      outIndexBuffer,
      drawIndirectBuffer,
      cameraBuffer,
      paramsBuffer,
      triCountBuffer,
      tessBindGroup: null,
      normalBindGroup: null,
    });

    this.stats.registeredMeshes = this.meshes.size;
    return true;
  }

  // ── Compute Tessellation ──────────────────────────────────────────────

  tessellate(commandEncoder, meshId, camera) {
    if (!this.options.enableDisplacement || !this.tessPipeline) { return; }

    const mesh = this.meshes.get(meshId);
    if (!mesh) { return; }

    const anim = this.animations.get(meshId);
    const animType = anim?.type ?? 0;
    const animSpeed = anim?.speed ?? 0;
    const animAmplitude = anim?.amplitude ?? 0;
    const animOriginX = anim?.originX ?? 0.5;
    const animOriginY = anim?.originY ?? 0.5;

    // Write camera uniform
    const camData = new Float32Array(24);
    if (camera.viewProjectionMatrix) {
      camData.set(camera.viewProjectionMatrix, 0);
    }
    camData[16] = camera.position?.x ?? 0;
    camData[17] = camera.position?.y ?? 0;
    camData[18] = camera.position?.z ?? 0;
    camData[19] = camera.screenWidth ?? 1920;
    camData[20] = camera.screenHeight ?? 1080;
    camData[21] = this.time;
    camData[22] = camera.deltaTime ?? 0.016;
    this.device.queue.writeBuffer(mesh.cameraBuffer, 0, camData);

    // Write tessellation params
    const paramsData = new ArrayBuffer(32);
    const paramsView = new DataView(paramsData);
    paramsView.setUint32(0, this.options.maxTessLevel, true);
    paramsView.setFloat32(4, this.options.adaptiveThreshold, true);
    paramsView.setFloat32(8, camera.displacementStrength ?? 1.0, true);
    paramsView.setUint32(12, animType, true);
    paramsView.setFloat32(16, animSpeed, true);
    paramsView.setFloat32(20, animAmplitude, true);
    paramsView.setFloat32(24, animOriginX, true);
    paramsView.setFloat32(28, animOriginY, true);
    this.device.queue.writeBuffer(mesh.paramsBuffer, 0, paramsData);

    // Reset draw indirect (vertex count = 0)
    this.device.queue.writeBuffer(mesh.drawIndirectBuffer, 0, new Uint32Array([0, 1, 0, 0]));

    // Build bind group lazily (texture view may change)
    mesh.tessBindGroup = this.device.createBindGroup({
      layout: this.tessBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: mesh.vertexBuffer } },
        { binding: 1, resource: { buffer: mesh.indexBuffer } },
        { binding: 2, resource: { buffer: mesh.outVertexBuffer } },
        { binding: 3, resource: { buffer: mesh.outIndexBuffer } },
        { binding: 4, resource: { buffer: mesh.cameraBuffer } },
        { binding: 5, resource: { buffer: mesh.paramsBuffer } },
        { binding: 6, resource: mesh.displacementMap.createView() },
        { binding: 7, resource: this.sampler },
        { binding: 8, resource: { buffer: mesh.drawIndirectBuffer } },
      ],
    });

    // Dispatch tessellation
    const pass = commandEncoder.beginComputePass({ label: `tess-${meshId}` });
    pass.setPipeline(this.tessPipeline);
    pass.setBindGroup(0, mesh.tessBindGroup);
    // Assume worst case: indexBuffer size / 12 triangles (3 indices * 4 bytes)
    const maxTriangles = Math.ceil(mesh.indexBuffer.size / 12);
    pass.dispatchWorkgroups(Math.ceil(maxTriangles / 64));
    pass.end();

    this._recomputeNormals(commandEncoder, mesh, maxTriangles);
  }

  _recomputeNormals(commandEncoder, mesh, estTriangles) {
    if (!this.normalPipeline) { return; }

    // Estimate output triangle count (may overshoot — GPU guards with bounds)
    const outTriEst = estTriangles * 16;
    this.device.queue.writeBuffer(mesh.triCountBuffer, 0, new Uint32Array([outTriEst]));

    mesh.normalBindGroup = this.device.createBindGroup({
      layout: this.normalBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: mesh.outVertexBuffer } },
        { binding: 1, resource: { buffer: mesh.outIndexBuffer } },
        { binding: 2, resource: { buffer: mesh.triCountBuffer } },
      ],
    });

    const pass = commandEncoder.beginComputePass({ label: `normals-${mesh}` });
    pass.setPipeline(this.normalPipeline);
    pass.setBindGroup(0, mesh.normalBindGroup);
    pass.dispatchWorkgroups(Math.ceil(outTriEst / 64));
    pass.end();
  }

  // ── Output Retrieval ──────────────────────────────────────────────────

  getTessellatedBuffer(meshId) {
    const mesh = this.meshes.get(meshId);
    if (!mesh) { return null; }
    return {
      vertexBuffer: mesh.outVertexBuffer,
      indexBuffer: mesh.outIndexBuffer,
      drawIndirectBuffer: mesh.drawIndirectBuffer,
    };
  }

  // ── POM Code Access ───────────────────────────────────────────────────

  getPOMShaderCode() {
    return POM_SHADER_CODE;
  }

  // ── Animation ─────────────────────────────────────────────────────────

  setAnimation(meshId, type, params = {}) {
    const preset = ANIMATION_TYPES[type];
    if (!preset) {
      console.warn(`TessellationEngine2026: unknown animation type "${type}"`);
      return;
    }

    this.animations.set(meshId, {
      type: preset.type,
      speed: params.speed ?? preset.speed,
      amplitude: params.amplitude ?? preset.amplitude,
      originX: params.originX ?? preset.originX,
      originY: params.originY ?? preset.originY,
    });
  }

  update(time, deltaTime) {
    this.time = time;
    this.stats.computeTimeMs = deltaTime * 1000;
  }

  // ── Stats ─────────────────────────────────────────────────────────────

  getStats() {
    return {
      ...this.stats,
      maxTessLevel: this.options.maxTessLevel,
      adaptiveThreshold: this.options.adaptiveThreshold,
      pomEnabled: this.options.enableParallaxOcclusion,
      displacementEnabled: this.options.enableDisplacement,
      activeAnimations: this.animations.size,
    };
  }

  // ── Cleanup ───────────────────────────────────────────────────────────

  dispose() {
    for (const [, mesh] of this.meshes) {
      mesh.outVertexBuffer.destroy();
      mesh.outIndexBuffer.destroy();
      mesh.drawIndirectBuffer.destroy();
      mesh.cameraBuffer.destroy();
      mesh.paramsBuffer.destroy();
      mesh.triCountBuffer.destroy();
    }
    this.meshes.clear();
    this.animations.clear();
    this.tessPipeline = null;
    this.normalPipeline = null;
    this.sampler = null;
    this.device = null;
  }
}

export default TessellationEngine2026;
