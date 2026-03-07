/**
 * VirtualGeometry2026 - Nanite-Style Virtual Geometry System
 * GPU-driven mesh cluster rendering with automatic LOD selection,
 * hierarchical culling, and zero CPU draw-call overhead.
 * Designed for dense horror environments with millions of triangles.
 */

// ─── WGSL: Instance Frustum Culling ─────────────────────────────────────────

const INSTANCE_CULL_SHADER = /* wgsl */ `
struct Instance {
  transform_0: vec4<f32>,
  transform_1: vec4<f32>,
  transform_2: vec4<f32>,
  transform_3: vec4<f32>,
  boundMin: vec4<f32>,
  boundMax: vec4<f32>,
  meshId: u32,
  clusterOffset: u32,
  clusterCount: u32,
  flags: u32,
};

struct CullUniforms {
  viewProj: mat4x4<f32>,
  cameraPos: vec4<f32>,
  frustumPlanes: array<vec4<f32>, 6>,
  screenParams: vec4<f32>,
  frameIndex: u32,
  instanceCount: u32,
  _pad0: u32,
  _pad1: u32,
};

struct CounterBuffer {
  count: atomic<u32>,
};

@group(0) @binding(0) var<storage, read> instances: array<Instance>;
@group(0) @binding(1) var<uniform> uniforms: CullUniforms;
@group(0) @binding(2) var<storage, read_write> visibleInstances: array<u32>;
@group(0) @binding(3) var<storage, read_write> counter: CounterBuffer;

fn frustumTestAABB(bmin: vec3<f32>, bmax: vec3<f32>) -> bool {
  for (var i = 0u; i < 6u; i = i + 1u) {
    let plane = uniforms.frustumPlanes[i];
    let px = select(bmin.x, bmax.x, plane.x > 0.0);
    let py = select(bmin.y, bmax.y, plane.y > 0.0);
    let pz = select(bmin.z, bmax.z, plane.z > 0.0);
    if (dot(plane.xyz, vec3<f32>(px, py, pz)) + plane.w < 0.0) {
      return false;
    }
  }
  return true;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx >= uniforms.instanceCount) { return; }

  let inst = instances[idx];
  if ((inst.flags & 1u) == 0u) { return; }

  let model = mat4x4<f32>(inst.transform_0, inst.transform_1, inst.transform_2, inst.transform_3);
  let center = (inst.boundMin.xyz + inst.boundMax.xyz) * 0.5;
  let extent = (inst.boundMax.xyz - inst.boundMin.xyz) * 0.5;
  let worldCenter = (model * vec4<f32>(center, 1.0)).xyz;
  let absM = mat3x3<f32>(abs(model[0].xyz), abs(model[1].xyz), abs(model[2].xyz));
  let worldExtent = absM * extent;

  if (!frustumTestAABB(worldCenter - worldExtent, worldCenter + worldExtent)) { return; }

  let slot = atomicAdd(&counter.count, 1u);
  visibleInstances[slot] = idx;
}
`;

// ─── WGSL: Cluster LOD Selection & Culling ──────────────────────────────────

const CLUSTER_SELECT_SHADER = /* wgsl */ `
struct Cluster {
  boundingSphere: vec4<f32>,
  normalCone: vec4<f32>,
  parentError: f32,
  clusterError: f32,
  lodLevel: u32,
  triangleOffset: u32,
  triangleCount: u32,
  childOffset: u32,
  childCount: u32,
  _pad: u32,
};

struct Instance {
  transform_0: vec4<f32>,
  transform_1: vec4<f32>,
  transform_2: vec4<f32>,
  transform_3: vec4<f32>,
  boundMin: vec4<f32>,
  boundMax: vec4<f32>,
  meshId: u32,
  clusterOffset: u32,
  clusterCount: u32,
  flags: u32,
};

struct SelectUniforms {
  viewProj: mat4x4<f32>,
  cameraPos: vec4<f32>,
  frustumPlanes: array<vec4<f32>, 6>,
  screenParams: vec4<f32>,
  hiZSize: vec4<f32>,
  frameIndex: u32,
  visibleInstanceCount: u32,
  _pad0: u32,
  _pad1: u32,
};

struct DrawIndirectArgs {
  vertexCount: u32,
  instanceCount: u32,
  firstVertex: u32,
  firstInstance: u32,
};

struct ClusterDraw {
  clusterIdx: u32,
  instanceIdx: u32,
};

struct DrawCounter {
  clusterCount: atomic<u32>,
};

@group(0) @binding(0) var<storage, read> clusters: array<Cluster>;
@group(0) @binding(1) var<storage, read> instances: array<Instance>;
@group(0) @binding(2) var<storage, read> visibleInstances: array<u32>;
@group(0) @binding(3) var<uniform> uniforms: SelectUniforms;
@group(0) @binding(4) var<storage, read_write> drawClusters: array<ClusterDraw>;
@group(0) @binding(5) var<storage, read_write> drawCounter: DrawCounter;
@group(0) @binding(6) var<storage, read_write> indirectArgs: array<DrawIndirectArgs>;
@group(0) @binding(7) var hiZTexture: texture_2d<f32>;

fn frustumTestSphere(center: vec3<f32>, radius: f32) -> bool {
  for (var i = 0u; i < 6u; i = i + 1u) {
    let plane = uniforms.frustumPlanes[i];
    if (dot(plane.xyz, center) + plane.w + radius < 0.0) { return false; }
  }
  return true;
}

fn screenSpaceError(worldCenter: vec3<f32>, radius: f32, geomError: f32) -> f32 {
  let d = max(distance(uniforms.cameraPos.xyz, worldCenter) - radius, 0.001);
  return (geomError * uniforms.screenParams.y) / (2.0 * d);
}

fn occlusionTestHiZ(center: vec3<f32>, radius: f32) -> bool {
  let clip = uniforms.viewProj * vec4<f32>(center, 1.0);
  if (clip.w <= 0.0) { return true; }
  let ndc = clip.xyz / clip.w;
  if (any(ndc.xy < vec2<f32>(-1.0)) || any(ndc.xy > vec2<f32>(1.0))) { return true; }
  let screenR = (radius * uniforms.screenParams.y) / (2.0 * clip.w);
  let mipLevel = clamp(ceil(log2(max(screenR * 2.0, 1.0))), 0.0, uniforms.hiZSize.z);
  let mipW = max(uniforms.hiZSize.x / pow(2.0, mipLevel), 1.0);
  let mipH = max(uniforms.hiZSize.y / pow(2.0, mipLevel), 1.0);
  let uv = ndc.xy * 0.5 + 0.5;
  let texCoord = vec2<i32>(vec2<f32>(uv.x * mipW, (1.0 - uv.y) * mipH));
  let hizDepth = textureLoad(hiZTexture, texCoord, i32(mipLevel)).r;
  return ndc.z <= hizDepth + 0.001;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let visIdx = gid.x;
  if (visIdx >= uniforms.visibleInstanceCount) { return; }

  let instanceIdx = visibleInstances[visIdx];
  let inst = instances[instanceIdx];
  let model = mat4x4<f32>(inst.transform_0, inst.transform_1, inst.transform_2, inst.transform_3);
  let scale = max(length(model[0].xyz), max(length(model[1].xyz), length(model[2].xyz)));
  let threshold = uniforms.screenParams.z;

  for (var c = 0u; c < inst.clusterCount; c = c + 1u) {
    let cluster = clusters[inst.clusterOffset + c];
    let worldCenter = (model * vec4<f32>(cluster.boundingSphere.xyz, 1.0)).xyz;
    let worldRadius = cluster.boundingSphere.w * scale;

    if (!frustumTestSphere(worldCenter, worldRadius)) { continue; }

    let screenErr = screenSpaceError(worldCenter, worldRadius, cluster.clusterError * scale);
    let parentErr = screenSpaceError(worldCenter, worldRadius, cluster.parentError * scale);
    let isLeaf = cluster.childCount == 0u;

    if (!isLeaf && screenErr > threshold) { continue; }
    if (!isLeaf && parentErr <= threshold && cluster.lodLevel > 0u) { continue; }
    if (!occlusionTestHiZ(worldCenter, worldRadius)) { continue; }

    let slot = atomicAdd(&drawCounter.clusterCount, 1u);
    drawClusters[slot] = ClusterDraw(inst.clusterOffset + c, instanceIdx);
    indirectArgs[slot].vertexCount = cluster.triangleCount * 3u;
    indirectArgs[slot].instanceCount = 1u;
    indirectArgs[slot].firstVertex = cluster.triangleOffset * 3u;
    indirectArgs[slot].firstInstance = slot;
  }
}
`;

// ─── WGSL: Hi-Z Depth Pyramid Builder ──────────────────────────────────────

const HIZ_BUILD_SHADER = /* wgsl */ `
struct HiZParams {
  srcMip: u32,
  dstWidth: u32,
  dstHeight: u32,
  _pad: u32,
};

@group(0) @binding(0) var srcDepth: texture_2d<f32>;
@group(0) @binding(1) var dstDepth: texture_storage_2d<r32float, write>;
@group(0) @binding(2) var<uniform> params: HiZParams;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.dstWidth || gid.y >= params.dstHeight) { return; }

  let srcCoord = vec2<i32>(gid.xy) * 2;
  let mip = i32(params.srcMip);
  let d00 = textureLoad(srcDepth, srcCoord + vec2<i32>(0, 0), mip).r;
  let d10 = textureLoad(srcDepth, srcCoord + vec2<i32>(1, 0), mip).r;
  let d01 = textureLoad(srcDepth, srcCoord + vec2<i32>(0, 1), mip).r;
  let d11 = textureLoad(srcDepth, srcCoord + vec2<i32>(1, 1), mip).r;

  textureStore(dstDepth, vec2<i32>(gid.xy), vec4<f32>(max(max(d00, d10), max(d01, d11)), 0.0, 0.0, 1.0));
}
`;

// ─── WGSL: Prefix Sum (Parallel Blelloch Scan) ─────────────────────────────

const PREFIX_SUM_SHADER = /* wgsl */ `
struct PrefixParams { count: u32, _p0: u32, _p1: u32, _p2: u32, };
var<workgroup> shared_data: array<u32, 256>;

@group(0) @binding(0) var<storage, read_write> data: array<u32>;
@group(0) @binding(1) var<uniform> params: PrefixParams;

@compute @workgroup_size(128)
fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
  let gid = wid.x * 256u + lid.x * 2u;
  shared_data[lid.x * 2u] = select(0u, data[gid], gid < params.count);
  shared_data[lid.x * 2u + 1u] = select(0u, data[gid + 1u], (gid + 1u) < params.count);
  workgroupBarrier();

  var offset = 1u;
  for (var d = 128u; d > 0u; d = d >> 1u) {
    if (lid.x < d) {
      shared_data[offset * (lid.x * 2u + 2u) - 1u] += shared_data[offset * (lid.x * 2u + 1u) - 1u];
    }
    offset <<= 1u;
    workgroupBarrier();
  }

  if (lid.x == 0u) { shared_data[255u] = 0u; }
  workgroupBarrier();

  for (var d = 1u; d < 256u; d <<= 1u) {
    offset >>= 1u;
    if (lid.x < d) {
      let ai = offset * (lid.x * 2u + 1u) - 1u;
      let bi = offset * (lid.x * 2u + 2u) - 1u;
      let tmp = shared_data[ai];
      shared_data[ai] = shared_data[bi];
      shared_data[bi] += tmp;
    }
    workgroupBarrier();
  }

  if (gid < params.count) { data[gid] = shared_data[lid.x * 2u]; }
  if ((gid + 1u) < params.count) { data[gid + 1u] = shared_data[lid.x * 2u + 1u]; }
}
`;

// ─── Constants ──────────────────────────────────────────────────────────────

const INSTANCE_STRIDE = 128; // bytes: 4x vec4 transform + 2x vec4 bounds + 4x u32
const CLUSTER_STRIDE = 48;   // bytes: 2x vec4 + 8x u32/f32
const DRAW_INDIRECT_STRIDE = 16;
const CLUSTER_DRAW_STRIDE = 8;

// ─── Class ──────────────────────────────────────────────────────────────────

export class VirtualGeometry2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.maxTriangles = options.maxTriangles ?? 10_000_000;
    this.clusterSize = options.clusterSize ?? 128;
    this.maxClusters = options.maxClusters ?? 100_000;
    this.lodLevels = options.lodLevels ?? 8;
    this.errorThreshold = options.errorThreshold ?? 1.0;
    this.enableStreaming = options.enableStreaming ?? true;
    this.screenWidth = options.screenWidth ?? 1920;
    this.screenHeight = options.screenHeight ?? 1080;

    this._meshes = new Map();
    this._instances = new Map();
    this._nextMeshId = 0;
    this._nextInstanceId = 0;
    this._totalClusterCount = 0;
    this._totalTriangleCount = 0;
    this._instanceCount = 0;
    this._dirty = true;
    this._initialized = false;

    this._stats = {
      totalTriangles: 0, visibleTriangles: 0, visibleClusters: 0,
      culledByFrustum: 0, culledByOcclusion: 0, drawCalls: 0,
    };

    this._pipelines = {};
    this._buffers = {};
    this._bindGroups = {};
  }

  // ── Initialization ──────────────────────────────────────────────────────

  async initialize() {
    this._createBuffers();
    this._createShaderModules();
    await this._createPipelines();
    this._createHiZTexture();
    this._initialized = true;
  }

  _createBuffers() {
    const d = this.device;
    const maxInst = 50_000;

    this._buffers.instances = d.createBuffer({
      label: 'VG-instances',
      size: maxInst * INSTANCE_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this._buffers.clusters = d.createBuffer({
      label: 'VG-clusters',
      size: this.maxClusters * CLUSTER_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this._buffers.visibleInstances = d.createBuffer({
      label: 'VG-visibleInstances',
      size: maxInst * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    this._buffers.instanceCounter = d.createBuffer({
      label: 'VG-instanceCounter',
      size: 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    this._buffers.drawClusters = d.createBuffer({
      label: 'VG-drawClusters',
      size: this.maxClusters * CLUSTER_DRAW_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    this._buffers.drawCounter = d.createBuffer({
      label: 'VG-drawCounter',
      size: 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    this._buffers.indirectArgs = d.createBuffer({
      label: 'VG-indirectArgs',
      size: this.maxClusters * DRAW_INDIRECT_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT,
    });
    this._buffers.cullUniforms = d.createBuffer({
      label: 'VG-cullUniforms',
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._buffers.selectUniforms = d.createBuffer({
      label: 'VG-selectUniforms',
      size: 272,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    // Combined vertex/index buffer for all cluster geometry
    this._buffers.vertexData = d.createBuffer({
      label: 'VG-vertexData',
      size: this.maxTriangles * 3 * 32, // 32 bytes per vertex (pos + normal + uv)
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this._buffers.indexData = d.createBuffer({
      label: 'VG-indexData',
      size: this.maxTriangles * 3 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    // Readback buffer for stats
    this._buffers.readback = d.createBuffer({
      label: 'VG-readback',
      size: 8,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    // Prefix sum scratch
    this._buffers.prefixScratch = d.createBuffer({
      label: 'VG-prefixScratch',
      size: maxInst * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this._buffers.prefixParams = d.createBuffer({
      label: 'VG-prefixParams',
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  _createShaderModules() {
    const d = this.device;
    this._modules = {
      instanceCull: d.createShaderModule({ label: 'VG-instanceCull', code: INSTANCE_CULL_SHADER }),
      clusterSelect: d.createShaderModule({ label: 'VG-clusterSelect', code: CLUSTER_SELECT_SHADER }),
      hiZBuild: d.createShaderModule({ label: 'VG-hiZBuild', code: HIZ_BUILD_SHADER }),
      prefixSum: d.createShaderModule({ label: 'VG-prefixSum', code: PREFIX_SUM_SHADER }),
    };
  }

  async _createPipelines() {
    const d = this.device;

    // Instance culling
    this._pipelines.instanceCull = d.createComputePipeline({
      label: 'VG-pipeline-instanceCull',
      layout: 'auto',
      compute: { module: this._modules.instanceCull, entryPoint: 'main' },
    });

    // Cluster selection
    this._pipelines.clusterSelect = d.createComputePipeline({
      label: 'VG-pipeline-clusterSelect',
      layout: 'auto',
      compute: { module: this._modules.clusterSelect, entryPoint: 'main' },
    });

    // Hi-Z build
    this._pipelines.hiZBuild = d.createComputePipeline({
      label: 'VG-pipeline-hiZBuild',
      layout: 'auto',
      compute: { module: this._modules.hiZBuild, entryPoint: 'main' },
    });

    // Prefix sum
    this._pipelines.prefixSum = d.createComputePipeline({
      label: 'VG-pipeline-prefixSum',
      layout: 'auto',
      compute: { module: this._modules.prefixSum, entryPoint: 'main' },
    });

    this._rebuildBindGroups();
  }

  _createHiZTexture() {
    this._hiZMipCount = Math.floor(Math.log2(Math.max(this.screenWidth, this.screenHeight))) + 1;
    this._hiZTexture = this.device.createTexture({
      label: 'VG-hiZ',
      size: { width: this.screenWidth, height: this.screenHeight },
      mipLevelCount: this._hiZMipCount,
      format: 'r32float',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this._hiZViews = [];
    for (let i = 0; i < this._hiZMipCount; i++) {
      this._hiZViews.push(this._hiZTexture.createView({
        baseMipLevel: i, mipLevelCount: 1,
      }));
    }
  }

  _rebuildBindGroups() {
    const d = this.device;
    const b = this._buffers;

    this._bindGroups.instanceCull = d.createBindGroup({
      label: 'VG-bg-instanceCull',
      layout: this._pipelines.instanceCull.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: b.instances } },
        { binding: 1, resource: { buffer: b.cullUniforms } },
        { binding: 2, resource: { buffer: b.visibleInstances } },
        { binding: 3, resource: { buffer: b.instanceCounter } },
      ],
    });

    this._bindGroups.clusterSelect = d.createBindGroup({
      label: 'VG-bg-clusterSelect',
      layout: this._pipelines.clusterSelect.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: b.clusters } },
        { binding: 1, resource: { buffer: b.instances } },
        { binding: 2, resource: { buffer: b.visibleInstances } },
        { binding: 3, resource: { buffer: b.selectUniforms } },
        { binding: 4, resource: { buffer: b.drawClusters } },
        { binding: 5, resource: { buffer: b.drawCounter } },
        { binding: 6, resource: { buffer: b.indirectArgs } },
        { binding: 7, resource: this._hiZTexture.createView() },
      ],
    });

    this._bindGroups.prefixSum = d.createBindGroup({
      label: 'VG-bg-prefixSum',
      layout: this._pipelines.prefixSum.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: b.prefixScratch } },
        { binding: 1, resource: { buffer: b.prefixParams } },
      ],
    });
  }

  // ── Mesh Registration ───────────────────────────────────────────────────

  registerMesh(vertices, indices, name = 'mesh') {
    const meshId = this._nextMeshId++;
    const clusters = this._buildClusterHierarchy(vertices, indices);
    const clusterOffset = this._totalClusterCount;

    this._uploadClusterGeometry(clusters, clusterOffset);

    const bounds = this._computeAABB(vertices);
    this._meshes.set(meshId, {
      name, clusterOffset, clusterCount: clusters.length,
      bounds, triangleCount: indices.length / 3,
    });

    this._totalClusterCount += clusters.length;
    this._totalTriangleCount += indices.length / 3;
    this._stats.totalTriangles = this._totalTriangleCount;
    this._dirty = true;
    return meshId;
  }

  _buildClusterHierarchy(vertices, indices) {
    const allClusters = [];
    let globalTriOffset = this._totalTriangleCount;

    // Build LOD chain via iterative edge-collapse simplification
    let currentVerts = vertices;
    let currentIdx = indices;

    for (let lod = 0; lod < this.lodLevels; lod++) {
      const triCount = currentIdx.length / 3;
      if (triCount === 0) break;

      const lodClusters = this._splitIntoClusters(currentVerts, currentIdx, lod, globalTriOffset);
      allClusters.push(...lodClusters);
      globalTriOffset += triCount;

      if (triCount <= this.clusterSize) break;

      // Simplify for next LOD (target ~50% triangle reduction)
      const simplified = this._simplifyMesh(currentVerts, currentIdx, Math.max(Math.floor(triCount * 0.5), 1));
      currentVerts = simplified.vertices;
      currentIdx = simplified.indices;
    }

    // Link parent-child relationships in the DAG
    this._linkClusterDAG(allClusters);
    return allClusters;
  }

  _splitIntoClusters(vertices, indices, lodLevel, triOffset) {
    const triCount = indices.length / 3;
    const clusters = [];
    const stride = vertices.length >= triCount * 9 ? 8 : 3; // detect packed format (pos+normal+uv vs pos-only)
    const posStride = Math.max(stride, 3);

    for (let t = 0; t < triCount; t += this.clusterSize) {
      const clusterTriCount = Math.min(this.clusterSize, triCount - t);
      const clusterIndices = indices.slice(t * 3, (t + clusterTriCount) * 3);

      // Compute bounding sphere
      let cx = 0, cy = 0, cz = 0, count = 0;
      for (let i = 0; i < clusterIndices.length; i++) {
        const vi = clusterIndices[i] * posStride;
        cx += vertices[vi]; cy += vertices[vi + 1]; cz += vertices[vi + 2];
        count++;
      }
      cx /= count; cy /= count; cz /= count;

      let maxR = 0;
      for (let i = 0; i < clusterIndices.length; i++) {
        const vi = clusterIndices[i] * posStride;
        const dx = vertices[vi] - cx, dy = vertices[vi + 1] - cy, dz = vertices[vi + 2] - cz;
        maxR = Math.max(maxR, Math.sqrt(dx * dx + dy * dy + dz * dz));
      }

      // Compute average normal for normal cone
      let nx = 0, ny = 0, nz = 0;
      for (let i = 0; i < clusterIndices.length; i += 3) {
        const i0 = clusterIndices[i] * posStride, i1 = clusterIndices[i + 1] * posStride, i2 = clusterIndices[i + 2] * posStride;
        const e1x = vertices[i1] - vertices[i0], e1y = vertices[i1 + 1] - vertices[i0 + 1], e1z = vertices[i1 + 2] - vertices[i0 + 2];
        const e2x = vertices[i2] - vertices[i0], e2y = vertices[i2 + 1] - vertices[i0 + 1], e2z = vertices[i2 + 2] - vertices[i0 + 2];
        nx += e1y * e2z - e1z * e2y;
        ny += e1z * e2x - e1x * e2z;
        nz += e1x * e2y - e1y * e2x;
      }
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;

      // Normal cone half-angle: worst-case dot product with average
      let minDot = 1;
      for (let i = 0; i < clusterIndices.length; i += 3) {
        const i0 = clusterIndices[i] * posStride, i1 = clusterIndices[i + 1] * posStride, i2 = clusterIndices[i + 2] * posStride;
        const e1x = vertices[i1] - vertices[i0], e1y = vertices[i1 + 1] - vertices[i0 + 1], e1z = vertices[i1 + 2] - vertices[i0 + 2];
        const e2x = vertices[i2] - vertices[i0], e2y = vertices[i2 + 1] - vertices[i0 + 1], e2z = vertices[i2 + 2] - vertices[i0 + 2];
        let fnx = e1y * e2z - e1z * e2y, fny = e1z * e2x - e1x * e2z, fnz = e1x * e2y - e1y * e2x;
        const fl = Math.sqrt(fnx * fnx + fny * fny + fnz * fnz) || 1;
        minDot = Math.min(minDot, (fnx * nx + fny * ny + fnz * nz) / fl);
      }

      const geometricError = maxR * (lodLevel + 1) * 0.5;

      clusters.push({
        boundingSphere: [cx, cy, cz, maxR],
        normalCone: [nx, ny, nz, minDot],
        parentError: geometricError * 2.0,
        clusterError: geometricError,
        lodLevel,
        triangleOffset: triOffset + t,
        triangleCount: clusterTriCount,
        childOffset: 0,
        childCount: 0,
      });
    }
    return clusters;
  }

  _linkClusterDAG(clusters) {
    // Group clusters by LOD level
    const byLod = new Map();
    for (let i = 0; i < clusters.length; i++) {
      const lod = clusters[i].lodLevel;
      if (!byLod.has(lod)) byLod.set(lod, []);
      byLod.get(lod).push(i);
    }

    const lodKeys = [...byLod.keys()].sort((a, b) => a - b);
    for (let l = 1; l < lodKeys.length; l++) {
      const parentIndices = byLod.get(lodKeys[l]);
      const childIndices = byLod.get(lodKeys[l - 1]);

      // Assign children to nearest parent based on bounding sphere overlap
      for (const pi of parentIndices) {
        const parent = clusters[pi];
        const pc = parent.boundingSphere;
        parent.childOffset = childIndices[0];
        let assignedCount = 0;

        for (const ci of childIndices) {
          const child = clusters[ci];
          const cc = child.boundingSphere;
          const dx = pc[0] - cc[0], dy = pc[1] - cc[1], dz = pc[2] - cc[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < pc[3] + cc[3]) {
            assignedCount++;
          }
        }
        parent.childCount = Math.max(assignedCount, childIndices.length > 0 ? 1 : 0);
      }
    }
  }

  _simplifyMesh(vertices, indices, targetTriangles) {
    const triCount = indices.length / 3;
    if (triCount <= targetTriangles) return { vertices, indices };

    const posStride = vertices.length >= triCount * 9 ? 8 : 3;

    // Build edge cost map for QEM-style edge collapse
    const edgeCosts = [];
    for (let t = 0; t < triCount; t++) {
      const i0 = indices[t * 3], i1 = indices[t * 3 + 1], i2 = indices[t * 3 + 2];
      const pairs = [[i0, i1], [i1, i2], [i2, i0]];
      for (const [a, b] of pairs) {
        const lo = Math.min(a, b), hi = Math.max(a, b);
        const ax = vertices[a * posStride], ay = vertices[a * posStride + 1], az = vertices[a * posStride + 2];
        const bx = vertices[b * posStride], by = vertices[b * posStride + 1], bz = vertices[b * posStride + 2];
        const dx = ax - bx, dy = ay - by, dz = az - bz;
        edgeCosts.push({ lo, hi, cost: dx * dx + dy * dy + dz * dz });
      }
    }
    edgeCosts.sort((a, b) => a.cost - b.cost);

    // Collapse cheapest edges until we reach target count
    const remap = new Uint32Array(vertices.length / posStride);
    for (let i = 0; i < remap.length; i++) remap[i] = i;

    const find = (v) => { while (remap[v] !== v) { remap[v] = remap[remap[v]]; v = remap[v]; } return v; };
    let removed = 0;
    const target = triCount - targetTriangles;
    const collapsed = new Set();

    for (const edge of edgeCosts) {
      if (removed >= target) break;
      const a = find(edge.lo), b = find(edge.hi);
      if (a === b) continue;
      const key = `${Math.min(a, b)}_${Math.max(a, b)}`;
      if (collapsed.has(key)) continue;
      collapsed.add(key);
      remap[b] = a;
      removed++;
    }

    // Rebuild index buffer with collapsed vertices, removing degenerate triangles
    const newIndices = [];
    for (let t = 0; t < triCount; t++) {
      const i0 = find(indices[t * 3]), i1 = find(indices[t * 3 + 1]), i2 = find(indices[t * 3 + 2]);
      if (i0 === i1 || i1 === i2 || i2 === i0) continue;
      newIndices.push(i0, i1, i2);
    }

    return { vertices, indices: new Uint32Array(newIndices) };
  }

  _computeAABB(vertices) {
    const posStride = 3;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < vertices.length; i += posStride) {
      minX = Math.min(minX, vertices[i]);     maxX = Math.max(maxX, vertices[i]);
      minY = Math.min(minY, vertices[i + 1]); maxY = Math.max(maxY, vertices[i + 1]);
      minZ = Math.min(minZ, vertices[i + 2]); maxZ = Math.max(maxZ, vertices[i + 2]);
    }
    return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
  }

  _uploadClusterGeometry(clusters, baseOffset) {
    // Pack cluster data into GPU buffer
    const floatData = new Float32Array(clusters.length * (CLUSTER_STRIDE / 4));
    const uintView = new Uint32Array(floatData.buffer);

    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i];
      const off = i * (CLUSTER_STRIDE / 4);
      floatData[off + 0] = c.boundingSphere[0];
      floatData[off + 1] = c.boundingSphere[1];
      floatData[off + 2] = c.boundingSphere[2];
      floatData[off + 3] = c.boundingSphere[3];
      floatData[off + 4] = c.normalCone[0];
      floatData[off + 5] = c.normalCone[1];
      floatData[off + 6] = c.normalCone[2];
      floatData[off + 7] = c.normalCone[3];
      floatData[off + 8] = c.parentError;
      floatData[off + 9] = c.clusterError;
      uintView[off + 10] = c.lodLevel;
      uintView[off + 11] = c.triangleOffset;
      uintView[off + 12] = c.triangleCount;
      uintView[off + 13] = c.childOffset;
      uintView[off + 14] = c.childCount;
      uintView[off + 15] = 0; // pad
    }

    this.device.queue.writeBuffer(
      this._buffers.clusters,
      baseOffset * CLUSTER_STRIDE,
      floatData.buffer
    );
  }

  // ── Instance Management ─────────────────────────────────────────────────

  addInstance(meshId, transform) {
    const mesh = this._meshes.get(meshId);
    if (!mesh) throw new Error(`Unknown meshId: ${meshId}`);

    const instanceId = this._nextInstanceId++;
    const slot = this._instanceCount++;

    this._instances.set(instanceId, { meshId, slot, transform: new Float32Array(transform) });
    this._writeInstance(slot, mesh, transform);
    this._dirty = true;
    return instanceId;
  }

  removeInstance(instanceId) {
    const inst = this._instances.get(instanceId);
    if (!inst) return;

    // Swap with last instance to keep buffer compact
    const lastSlot = this._instanceCount - 1;
    if (inst.slot !== lastSlot) {
      for (const [id, other] of this._instances) {
        if (other.slot === lastSlot) {
          const mesh = this._meshes.get(other.meshId);
          other.slot = inst.slot;
          this._writeInstance(inst.slot, mesh, other.transform);
          break;
        }
      }
    }

    this._instances.delete(instanceId);
    this._instanceCount--;
    this._dirty = true;
  }

  updateInstanceTransform(instanceId, matrix) {
    const inst = this._instances.get(instanceId);
    if (!inst) return;

    inst.transform = new Float32Array(matrix);
    const mesh = this._meshes.get(inst.meshId);
    this._writeInstance(inst.slot, mesh, matrix);
  }

  _writeInstance(slot, mesh, transform) {
    // Pack: 4x vec4 transform, 2x vec4 bounds, 4x u32 metadata
    const data = new ArrayBuffer(INSTANCE_STRIDE);
    const f = new Float32Array(data);
    const u = new Uint32Array(data);

    // Column-major mat4x4 packed as 4 vec4s
    for (let i = 0; i < 16; i++) f[i] = transform[i] ?? (i % 5 === 0 ? 1 : 0);

    // AABB
    f[16] = mesh.bounds.min[0]; f[17] = mesh.bounds.min[1];
    f[18] = mesh.bounds.min[2]; f[19] = 0;
    f[20] = mesh.bounds.max[0]; f[21] = mesh.bounds.max[1];
    f[22] = mesh.bounds.max[2]; f[23] = 0;

    // Metadata
    u[24] = 0;                      // meshId (unused, clusters hold geometry)
    u[25] = mesh.clusterOffset;
    u[26] = mesh.clusterCount;
    u[27] = 1;                      // flags: enabled

    this.device.queue.writeBuffer(this._buffers.instances, slot * INSTANCE_STRIDE, data);
  }

  // ── GPU Culling Pipeline ────────────────────────────────────────────────

  cull(commandEncoder, camera) {
    if (!this._initialized || this._instanceCount === 0) return;

    this._writeCullUniforms(camera);
    this._writeSelectUniforms(camera);

    // Reset atomic counters
    const zeros = new Uint32Array([0]);
    this.device.queue.writeBuffer(this._buffers.instanceCounter, 0, zeros);
    this.device.queue.writeBuffer(this._buffers.drawCounter, 0, zeros);

    // Pass 1: Instance frustum culling
    const cullPass = commandEncoder.beginComputePass({ label: 'VG-instanceCull' });
    cullPass.setPipeline(this._pipelines.instanceCull);
    cullPass.setBindGroup(0, this._bindGroups.instanceCull);
    cullPass.dispatchWorkgroups(Math.ceil(this._instanceCount / 64));
    cullPass.end();

    // Pass 2: Cluster LOD selection + occlusion culling
    const selectPass = commandEncoder.beginComputePass({ label: 'VG-clusterSelect' });
    selectPass.setPipeline(this._pipelines.clusterSelect);
    selectPass.setBindGroup(0, this._bindGroups.clusterSelect);
    selectPass.dispatchWorkgroups(Math.ceil(this._instanceCount / 64));
    selectPass.end();
  }

  _writeCullUniforms(camera) {
    const data = new ArrayBuffer(256);
    const f = new Float32Array(data);
    const u = new Uint32Array(data);

    // viewProj (16 floats)
    if (camera.viewProjectionMatrix) {
      f.set(camera.viewProjectionMatrix, 0);
    }
    // cameraPos (4 floats)
    f[16] = camera.position?.[0] ?? 0;
    f[17] = camera.position?.[1] ?? 0;
    f[18] = camera.position?.[2] ?? 0;
    f[19] = 1;
    // frustumPlanes (6 x vec4 = 24 floats)
    const planes = camera.frustumPlanes ?? this._extractFrustumPlanes(camera.viewProjectionMatrix);
    for (let i = 0; i < 6; i++) {
      f[20 + i * 4 + 0] = planes[i]?.[0] ?? 0;
      f[20 + i * 4 + 1] = planes[i]?.[1] ?? 0;
      f[20 + i * 4 + 2] = planes[i]?.[2] ?? 0;
      f[20 + i * 4 + 3] = planes[i]?.[3] ?? 0;
    }
    // screenParams
    f[44] = this.screenWidth;
    f[45] = this.screenHeight;
    f[46] = this.errorThreshold;
    f[47] = camera.near ?? 0.1;
    // frameIndex, instanceCount
    u[48] = this._frameIndex ?? 0;
    u[49] = this._instanceCount;
    u[50] = 0; u[51] = 0;

    this.device.queue.writeBuffer(this._buffers.cullUniforms, 0, data);
  }

  _writeSelectUniforms(camera) {
    const data = new ArrayBuffer(272);
    const f = new Float32Array(data);
    const u = new Uint32Array(data);

    if (camera.viewProjectionMatrix) f.set(camera.viewProjectionMatrix, 0);
    f[16] = camera.position?.[0] ?? 0;
    f[17] = camera.position?.[1] ?? 0;
    f[18] = camera.position?.[2] ?? 0;
    f[19] = 1;
    const planes = camera.frustumPlanes ?? this._extractFrustumPlanes(camera.viewProjectionMatrix);
    for (let i = 0; i < 6; i++) {
      f[20 + i * 4 + 0] = planes[i]?.[0] ?? 0;
      f[20 + i * 4 + 1] = planes[i]?.[1] ?? 0;
      f[20 + i * 4 + 2] = planes[i]?.[2] ?? 0;
      f[20 + i * 4 + 3] = planes[i]?.[3] ?? 0;
    }
    f[44] = this.screenWidth;
    f[45] = this.screenHeight;
    f[46] = this.errorThreshold;
    f[47] = camera.near ?? 0.1;
    // hiZSize
    f[48] = this.screenWidth;
    f[49] = this.screenHeight;
    f[50] = this._hiZMipCount ? this._hiZMipCount - 1 : 0;
    f[51] = 0;
    u[52] = this._frameIndex ?? 0;
    u[53] = this._instanceCount;
    u[54] = 0; u[55] = 0;

    this.device.queue.writeBuffer(this._buffers.selectUniforms, 0, data);
  }

  _extractFrustumPlanes(vp) {
    if (!vp) return Array.from({ length: 6 }, () => [0, 0, 0, 0]);
    const m = vp;
    const planes = [
      [m[3] + m[0], m[7] + m[4], m[11] + m[8],  m[15] + m[12]],  // left
      [m[3] - m[0], m[7] - m[4], m[11] - m[8],  m[15] - m[12]],  // right
      [m[3] + m[1], m[7] + m[5], m[11] + m[9],  m[15] + m[13]],  // bottom
      [m[3] - m[1], m[7] - m[5], m[11] - m[9],  m[15] - m[13]],  // top
      [m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]],  // near
      [m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]],  // far
    ];
    // Normalize
    for (const p of planes) {
      const len = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]) || 1;
      p[0] /= len; p[1] /= len; p[2] /= len; p[3] /= len;
    }
    return planes;
  }

  // ── Draw Commands ───────────────────────────────────────────────────────

  getDrawCommands() {
    return {
      indirectBuffer: this._buffers.indirectArgs,
      vertexBuffer: this._buffers.vertexData,
      indexBuffer: this._buffers.indexData,
      clusterDrawBuffer: this._buffers.drawClusters,
      drawCountBuffer: this._buffers.drawCounter,
      maxDrawCount: this.maxClusters,
    };
  }

  // ── Hi-Z Build ──────────────────────────────────────────────────────────

  buildHiZ(commandEncoder, depthTexture) {
    if (!this._initialized) return;

    // Copy depth attachment into mip 0 of Hi-Z texture
    commandEncoder.copyTextureToTexture(
      { texture: depthTexture },
      { texture: this._hiZTexture, mipLevel: 0 },
      { width: this.screenWidth, height: this.screenHeight }
    );

    // Downsample each subsequent mip level
    let w = this.screenWidth;
    let h = this.screenHeight;

    for (let mip = 0; mip < this._hiZMipCount - 1; mip++) {
      const dstW = Math.max(Math.floor(w / 2), 1);
      const dstH = Math.max(Math.floor(h / 2), 1);

      const paramsData = new Uint32Array([mip, dstW, dstH, 0]);
      const paramsBuffer = this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.device.queue.writeBuffer(paramsBuffer, 0, paramsData);

      const bg = this.device.createBindGroup({
        layout: this._pipelines.hiZBuild.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: this._hiZViews[mip] },
          { binding: 1, resource: this._hiZViews[mip + 1] },
          { binding: 2, resource: { buffer: paramsBuffer } },
        ],
      });

      const pass = commandEncoder.beginComputePass({ label: `VG-hiZ-mip${mip + 1}` });
      pass.setPipeline(this._pipelines.hiZBuild);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(Math.ceil(dstW / 8), Math.ceil(dstH / 8));
      pass.end();

      w = dstW;
      h = dstH;
    }

    this._frameIndex = (this._frameIndex ?? 0) + 1;
  }

  // ── Stats ───────────────────────────────────────────────────────────────

  async getStats() {
    if (!this._initialized) return { ...this._stats };

    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(this._buffers.instanceCounter, 0, this._buffers.readback, 0, 4);
    enc.copyBufferToBuffer(this._buffers.drawCounter, 0, this._buffers.readback, 4, 4);
    this.device.queue.submit([enc.finish()]);

    await this._buffers.readback.mapAsync(GPUMapMode.READ);
    const mapped = new Uint32Array(this._buffers.readback.getMappedRange());
    const visibleInstances = mapped[0];
    const visibleClusters = mapped[1];
    this._buffers.readback.unmap();

    this._stats.visibleClusters = visibleClusters;
    this._stats.visibleTriangles = visibleClusters * this.clusterSize;
    this._stats.drawCalls = visibleClusters;
    this._stats.culledByFrustum = this._instanceCount - visibleInstances;
    this._stats.culledByOcclusion = Math.max(0,
      (visibleInstances * (this._totalClusterCount / Math.max(this._instanceCount, 1))) - visibleClusters
    );

    return { ...this._stats };
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────

  dispose() {
    for (const buf of Object.values(this._buffers)) {
      buf?.destroy?.();
    }
    this._hiZTexture?.destroy?.();
    this._meshes.clear();
    this._instances.clear();
    this._initialized = false;
  }
}
