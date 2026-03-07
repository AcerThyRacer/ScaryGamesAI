/**
 * RenderGraph2026 — Unified Render Graph for ScaryGamesAI
 * WebGPU frame-graph that auto-schedules render/compute passes, manages
 * transient resource lifetimes with aliasing, and supports hot-swappable
 * pipeline modes (rasterize · raytrace · pathtrace).
 *
 * Usage:
 *   const graph = new RenderGraph2026(device);
 *   await graph.initialize();
 *   graph.setMode('rasterize');
 *   // per frame:
 *   graph.beginFrame();
 *   graph.addGBufferPass(); graph.addLightingPass(); ...
 *   graph.endFrame(commandEncoder);
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const PASS_TYPE = { COMPUTE: 0, RENDER: 1, COPY: 2 };
const RESOURCE_TYPE = { TEXTURE: 0, BUFFER: 1 };
const ACCESS = { READ: 1, WRITE: 2, READ_WRITE: 3 };

const DEFAULT_COLOR_FORMAT = 'rgba16float';
const GBUFFER_FORMATS = {
  position: 'rgba32float',
  normal: 'rgba16float',
  albedo: 'rgba8unorm',
  materialId: 'r32uint',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function topologicalSort(passes, adjacency) {
  const inDegree = new Map();
  for (const p of passes) inDegree.set(p.name, 0);
  for (const [, deps] of adjacency) {
    for (const d of deps) {
      if (inDegree.has(d)) inDegree.set(d, inDegree.get(d) + 1);
    }
  }

  const queue = [];
  for (const [name, deg] of inDegree) if (deg === 0) queue.push(name);

  const sorted = [];
  while (queue.length) {
    const n = queue.shift();
    sorted.push(n);
    const deps = adjacency.get(n) || [];
    for (const d of deps) {
      inDegree.set(d, inDegree.get(d) - 1);
      if (inDegree.get(d) === 0) queue.push(d);
    }
  }

  if (sorted.length !== passes.length) {
    throw new Error('RenderGraph2026: cycle detected in pass graph');
  }
  return sorted;
}

function alignTo(value, alignment) {
  return Math.ceil(value / alignment) * alignment;
}

// ─── Resource Handle ─────────────────────────────────────────────────────────

class ResourceHandle {
  constructor(name, type, descriptor, imported = false) {
    this.name = name;
    this.type = type;
    this.descriptor = { ...descriptor };
    this.imported = imported;
    this.gpuResource = null;
    this.aliasGroup = -1;
    this.firstUse = Infinity;
    this.lastUse = -Infinity;
    this.version = 0;
  }

  get byteSize() {
    if (this.type === RESOURCE_TYPE.BUFFER) return this.descriptor.size || 0;
    const { width = 1, height = 1 } = this.descriptor;
    const bpp = formatBytesPerPixel(this.descriptor.format || DEFAULT_COLOR_FORMAT);
    return width * height * bpp;
  }
}

function formatBytesPerPixel(format) {
  if (format.includes('32float')) return format.startsWith('rgba') ? 16 : 4;
  if (format.includes('16float')) return format.startsWith('rgba') ? 8 : 2;
  if (format.includes('8unorm') || format.includes('8snorm')) return format.startsWith('rgba') ? 4 : 1;
  if (format === 'r32uint' || format === 'r32sint') return 4;
  if (format === 'depth24plus-stencil8' || format === 'depth32float') return 4;
  if (format === 'depth24plus') return 4;
  if (format === 'bgra8unorm') return 4;
  return 4;
}

// ─── Pass Declaration ────────────────────────────────────────────────────────

class PassNode {
  constructor(name, type, descriptor) {
    this.name = name;
    this.type = type;
    this.inputs = descriptor.inputs || [];
    this.outputs = descriptor.outputs || [];
    this.colorAttachments = descriptor.colorAttachments || [];
    this.depthAttachment = descriptor.depthAttachment || null;
    this.source = descriptor.source || null;
    this.destination = descriptor.destination || null;
    this.execute = descriptor.execute || null;
    this.alive = true;
    this.order = -1;
    this.isAsyncCompute = false;
  }
}

// ─── Main Class ──────────────────────────────────────────────────────────────

export class RenderGraph2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      width: options.width || 1920,
      height: options.height || 1080,
      enableTimestamps: options.enableTimestamps ?? true,
      maxTransientTextures: options.maxTransientTextures || 64,
      maxTransientBuffers: options.maxTransientBuffers || 32,
      shadowResolution: options.shadowResolution || 2048,
      maxLights: options.maxLights || 256,
      pathTraceSamples: options.pathTraceSamples || 1,
      ...options,
    };

    this.mode = 'rasterize';
    this.passes = [];
    this.resources = new Map();
    this.compiled = false;
    this.sortedOrder = [];
    this.aliasGroups = [];
    this.frameIndex = 0;

    // Profiling
    this.timestampSupported = false;
    this.querySet = null;
    this.queryBuffer = null;
    this.queryResolveBuffer = null;
    this.passTimings = new Map();
    this.totalGPUTime = 0;
    this.aliasedMemorySaved = 0;

    // Pools for transient resources
    this._texturePool = [];
    this._bufferPool = [];
    this._allocatedResources = new Map();
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async initialize() {
    this.timestampSupported =
      this.options.enableTimestamps &&
      this.device.features.has('timestamp-query');

    if (this.timestampSupported) {
      this.querySet = this.device.createQuerySet({
        type: 'timestamp',
        count: this.options.maxTransientTextures * 2,
      });
      this.queryResolveBuffer = this.device.createBuffer({
        size: this.options.maxTransientTextures * 2 * 8,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
      });
      this.queryBuffer = this.device.createBuffer({
        size: this.options.maxTransientTextures * 2 * 8,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
    }

    console.log('✓ RenderGraph2026 initialized');
    console.log(`  • Mode: ${this.mode}`);
    console.log(`  • Timestamps: ${this.timestampSupported}`);
    console.log(`  • Resolution: ${this.options.width}×${this.options.height}`);
    return true;
  }

  beginFrame() {
    this.passes = [];
    this.resources = new Map();
    this.compiled = false;
    this.sortedOrder = [];
    this.aliasGroups = [];
    this.aliasedMemorySaved = 0;
    this.frameIndex++;
  }

  endFrame(commandEncoder) {
    this.compile();
    this.execute(commandEncoder);
  }

  dispose() {
    for (const res of this._allocatedResources.values()) {
      if (res && typeof res.destroy === 'function') res.destroy();
    }
    this._allocatedResources.clear();
    this._texturePool.length = 0;
    this._bufferPool.length = 0;
    if (this.querySet) { this.querySet.destroy(); this.querySet = null; }
    if (this.queryResolveBuffer) { this.queryResolveBuffer.destroy(); this.queryResolveBuffer = null; }
    if (this.queryBuffer) { this.queryBuffer.destroy(); this.queryBuffer = null; }
    this.passes = [];
    this.resources.clear();
    console.log('✓ RenderGraph2026 disposed');
  }

  // ── Mode Switching ───────────────────────────────────────────────────────

  setMode(mode) {
    const valid = ['rasterize', 'raytrace', 'pathtrace'];
    if (!valid.includes(mode)) {
      throw new Error(`RenderGraph2026: unknown mode '${mode}', expected one of ${valid.join(', ')}`);
    }
    this.mode = mode;
  }

  // ── Resource Declaration ─────────────────────────────────────────────────

  createTransientTexture(name, descriptor = {}) {
    const desc = {
      width: descriptor.width || this.options.width,
      height: descriptor.height || this.options.height,
      format: descriptor.format || DEFAULT_COLOR_FORMAT,
      usage: descriptor.usage ||
        (GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING),
    };
    const handle = new ResourceHandle(name, RESOURCE_TYPE.TEXTURE, desc, false);
    this.resources.set(name, handle);
    return handle;
  }

  createTransientBuffer(name, descriptor = {}) {
    const desc = {
      size: descriptor.size || 256,
      usage: descriptor.usage || (GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST),
    };
    const handle = new ResourceHandle(name, RESOURCE_TYPE.BUFFER, desc, false);
    this.resources.set(name, handle);
    return handle;
  }

  importTexture(name, texture) {
    const handle = new ResourceHandle(name, RESOURCE_TYPE.TEXTURE, {
      width: texture.width,
      height: texture.height,
      format: texture.format,
      usage: texture.usage,
    }, true);
    handle.gpuResource = texture;
    this.resources.set(name, handle);
    return handle;
  }

  importBuffer(name, buffer) {
    const handle = new ResourceHandle(name, RESOURCE_TYPE.BUFFER, {
      size: buffer.size,
      usage: buffer.usage,
    }, true);
    handle.gpuResource = buffer;
    this.resources.set(name, handle);
    return handle;
  }

  // ── Pass Declaration ─────────────────────────────────────────────────────

  addComputePass(name, descriptor) {
    const pass = new PassNode(name, PASS_TYPE.COMPUTE, descriptor);
    this.passes.push(pass);
    return pass;
  }

  addRenderPass(name, descriptor) {
    const pass = new PassNode(name, PASS_TYPE.RENDER, descriptor);
    this.passes.push(pass);
    return pass;
  }

  addCopyPass(name, descriptor) {
    const pass = new PassNode(name, PASS_TYPE.COPY, {
      inputs: [descriptor.source],
      outputs: [descriptor.destination],
      source: descriptor.source,
      destination: descriptor.destination,
    });
    pass.execute = (encoder, resources) => {
      const src = resources.get(descriptor.source);
      const dst = resources.get(descriptor.destination);
      if (!src || !dst) return;
      if (src instanceof GPUTexture) {
        encoder.copyTextureToTexture(
          { texture: src },
          { texture: dst },
          { width: src.width, height: src.height, depthOrArrayLayers: 1 },
        );
      } else {
        encoder.copyBufferToBuffer(src, 0, dst, 0, src.size);
      }
    };
    this.passes.push(pass);
    return pass;
  }

  // ── Graph Compilation ────────────────────────────────────────────────────

  compile() {
    this._markResourceLifetimes();
    this._eliminateDeadPasses();
    this._buildDependencyGraph();
    this._detectAsyncCompute();
    this._aliasResources();
    this._allocateTransients();
    this.compiled = true;
  }

  _markResourceLifetimes() {
    for (let i = 0; i < this.passes.length; i++) {
      const pass = this.passes[i];
      const allRefs = [
        ...pass.inputs,
        ...pass.outputs,
        ...pass.colorAttachments,
        ...(pass.depthAttachment ? [pass.depthAttachment] : []),
      ];
      for (const rName of allRefs) {
        const r = this.resources.get(rName);
        if (!r) continue;
        r.firstUse = Math.min(r.firstUse, i);
        r.lastUse = Math.max(r.lastUse, i);
      }
    }
  }

  _eliminateDeadPasses() {
    // Reset all passes to dead; only reachable ones will be revived
    for (const p of this.passes) p.alive = false;

    const consumed = new Set();

    // Seed: outputs that target imported resources (e.g. swapchain)
    for (const p of this.passes) {
      for (const o of p.outputs) {
        const r = this.resources.get(o);
        if (r && r.imported) consumed.add(o);
      }
      // Color-attachments writing to imported textures are also roots
      for (const ca of p.colorAttachments) {
        const r = this.resources.get(ca);
        if (r && r.imported) consumed.add(ca);
      }
    }

    // Final-composite style passes are always roots
    for (const p of this.passes) {
      if (p.name.includes('final') || p.name.includes('composite')) {
        p.alive = true;
        for (const inp of p.inputs) consumed.add(inp);
        for (const ca of p.colorAttachments) consumed.add(ca);
        if (p.depthAttachment) consumed.add(p.depthAttachment);
      }
    }

    // Walk backwards: a pass is alive if any of its outputs is consumed
    for (let i = this.passes.length - 1; i >= 0; i--) {
      const p = this.passes[i];
      if (p.alive) continue;
      const writes = [...p.outputs, ...p.colorAttachments];
      if (p.depthAttachment) writes.push(p.depthAttachment);
      const anyConsumed = writes.some(o => consumed.has(o));
      if (anyConsumed) {
        p.alive = true;
        for (const inp of p.inputs) consumed.add(inp);
        for (const ca of p.colorAttachments) consumed.add(ca);
        if (p.depthAttachment) consumed.add(p.depthAttachment);
      }
    }
  }

  _buildDependencyGraph() {
    const alive = this.passes.filter(p => p.alive);
    // Map resource name → pass that writes it
    const writerOf = new Map();
    for (const p of alive) {
      for (const o of p.outputs) writerOf.set(o, p.name);
      for (const ca of p.colorAttachments) writerOf.set(ca, p.name);
    }

    // adjacency: passA → [passB] means passB depends on passA
    const adjacency = new Map();
    for (const p of alive) adjacency.set(p.name, []);

    for (const p of alive) {
      for (const inp of p.inputs) {
        const writer = writerOf.get(inp);
        if (writer && writer !== p.name) {
          adjacency.get(writer).push(p.name);
        }
      }
      if (p.depthAttachment) {
        const writer = writerOf.get(p.depthAttachment);
        if (writer && writer !== p.name) {
          adjacency.get(writer).push(p.name);
        }
      }
    }

    this.sortedOrder = topologicalSort(alive, adjacency);
  }

  _detectAsyncCompute() {
    const renderPassNames = new Set(
      this.passes.filter(p => p.type === PASS_TYPE.RENDER && p.alive).map(p => p.name),
    );
    for (const p of this.passes) {
      if (p.type !== PASS_TYPE.COMPUTE || !p.alive) continue;
      // A compute pass is async-eligible when none of its inputs come from a render pass
      const dependsOnRender = p.inputs.some(inp => {
        for (const rp of this.passes) {
          if (renderPassNames.has(rp.name) && rp.outputs.includes(inp)) return true;
        }
        return false;
      });
      p.isAsyncCompute = !dependsOnRender;
    }
  }

  _aliasResources() {
    const transients = [...this.resources.values()].filter(r => !r.imported);
    // Sort by first-use so we can greedily assign alias groups
    transients.sort((a, b) => a.firstUse - b.firstUse);

    const groups = []; // each group: { byteSize, lastUse, members }
    let saved = 0;

    for (const res of transients) {
      let placed = false;
      for (const g of groups) {
        // Non-overlapping lifetime and compatible type
        if (res.firstUse > g.lastUse && res.type === g.type) {
          // Reuse this group — only allocate max(sizes)
          if (res.byteSize <= g.byteSize) {
            saved += res.byteSize;
          } else {
            saved += g.byteSize;
            g.byteSize = res.byteSize;
            g.descriptor = res.descriptor;
          }
          g.lastUse = res.lastUse;
          g.members.push(res);
          res.aliasGroup = groups.indexOf(g);
          placed = true;
          break;
        }
      }
      if (!placed) {
        res.aliasGroup = groups.length;
        groups.push({
          byteSize: res.byteSize,
          lastUse: res.lastUse,
          type: res.type,
          descriptor: res.descriptor,
          members: [res],
        });
      }
    }

    this.aliasGroups = groups;
    this.aliasedMemorySaved = saved;
  }

  _allocateTransients() {
    for (const group of this.aliasGroups) {
      let gpuResource = null;
      if (group.type === RESOURCE_TYPE.TEXTURE) {
        gpuResource = this._acquireTexture(group.descriptor);
      } else {
        gpuResource = this._acquireBuffer(group.descriptor);
      }
      for (const member of group.members) {
        member.gpuResource = gpuResource;
      }
    }
  }

  _acquireTexture(desc) {
    // Try pool first
    for (let i = 0; i < this._texturePool.length; i++) {
      const t = this._texturePool[i];
      if (t.width === desc.width && t.height === desc.height && t.format === desc.format) {
        this._texturePool.splice(i, 1);
        return t;
      }
    }
    const tex = this.device.createTexture({
      size: { width: desc.width, height: desc.height, depthOrArrayLayers: 1 },
      format: desc.format,
      usage: desc.usage | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this._allocatedResources.set(`tex_${this._allocatedResources.size}`, tex);
    return tex;
  }

  _acquireBuffer(desc) {
    for (let i = 0; i < this._bufferPool.length; i++) {
      const b = this._bufferPool[i];
      if (b.size >= desc.size) {
        this._bufferPool.splice(i, 1);
        return b;
      }
    }
    const buf = this.device.createBuffer({
      size: alignTo(desc.size, 256),
      usage: desc.usage | GPUBufferUsage.COPY_DST,
    });
    this._allocatedResources.set(`buf_${this._allocatedResources.size}`, buf);
    return buf;
  }

  // ── Execution ────────────────────────────────────────────────────────────

  execute(commandEncoder) {
    if (!this.compiled) this.compile();

    const passMap = new Map(this.passes.map(p => [p.name, p]));
    const resolvedResources = new Map();
    for (const [name, handle] of this.resources) {
      if (handle.gpuResource) resolvedResources.set(name, handle.gpuResource);
    }

    let queryIndex = 0;

    for (const passName of this.sortedOrder) {
      const pass = passMap.get(passName);
      if (!pass || !pass.alive) continue;

      const tsStart = this.timestampSupported ? queryIndex++ : -1;

      if (pass.type === PASS_TYPE.RENDER) {
        this._executeRenderPass(commandEncoder, pass, resolvedResources, tsStart);
      } else if (pass.type === PASS_TYPE.COMPUTE) {
        this._executeComputePass(commandEncoder, pass, resolvedResources, tsStart);
      } else if (pass.type === PASS_TYPE.COPY) {
        if (pass.execute) pass.execute(commandEncoder, resolvedResources);
      }

      if (this.timestampSupported) queryIndex++;
    }

    if (this.timestampSupported && queryIndex > 0) {
      commandEncoder.resolveQuerySet(this.querySet, 0, queryIndex, this.queryResolveBuffer, 0);
      commandEncoder.copyBufferToBuffer(
        this.queryResolveBuffer, 0,
        this.queryBuffer, 0,
        queryIndex * 8,
      );
    }
  }

  _executeRenderPass(commandEncoder, pass, resources, tsStart) {
    const colorAttachments = pass.colorAttachments.map(name => {
      const tex = resources.get(name);
      return {
        view: tex ? tex.createView() : undefined,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      };
    }).filter(a => a.view);

    const depthStencilAttachment = pass.depthAttachment
      ? (() => {
          const tex = resources.get(pass.depthAttachment);
          return tex ? {
            view: tex.createView(),
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
            depthClearValue: 1.0,
          } : undefined;
        })()
      : undefined;

    if (colorAttachments.length === 0 && !depthStencilAttachment) return;

    const desc = { colorAttachments };
    if (depthStencilAttachment) desc.depthStencilAttachment = depthStencilAttachment;
    if (this.timestampSupported && tsStart >= 0) {
      desc.timestampWrites = {
        querySet: this.querySet,
        beginningOfPassWriteIndex: tsStart,
        endOfPassWriteIndex: tsStart + 1,
      };
    }

    const encoder = commandEncoder.beginRenderPass(desc);
    if (pass.execute) pass.execute(encoder, resources);
    encoder.end();
  }

  _executeComputePass(commandEncoder, pass, resources, tsStart) {
    const desc = {};
    if (this.timestampSupported && tsStart >= 0) {
      desc.timestampWrites = {
        querySet: this.querySet,
        beginningOfPassWriteIndex: tsStart,
        endOfPassWriteIndex: tsStart + 1,
      };
    }

    const encoder = commandEncoder.beginComputePass(desc);
    if (pass.execute) pass.execute(encoder, resources);
    encoder.end();
  }

  // ── Built-in Pass Templates ──────────────────────────────────────────────

  addGBufferPass() {
    const pos = this.createTransientTexture('gbuffer_position', {
      format: GBUFFER_FORMATS.position,
    });
    const norm = this.createTransientTexture('gbuffer_normal', {
      format: GBUFFER_FORMATS.normal,
    });
    const albedo = this.createTransientTexture('gbuffer_albedo', {
      format: GBUFFER_FORMATS.albedo,
    });
    const matId = this.createTransientTexture('gbuffer_materialId', {
      format: GBUFFER_FORMATS.materialId,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    const depth = this.createTransientTexture('gbuffer_depth', {
      format: 'depth32float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    return this.addRenderPass('gbuffer', {
      colorAttachments: ['gbuffer_position', 'gbuffer_normal', 'gbuffer_albedo', 'gbuffer_materialId'],
      depthAttachment: 'gbuffer_depth',
      outputs: ['gbuffer_position', 'gbuffer_normal', 'gbuffer_albedo', 'gbuffer_materialId', 'gbuffer_depth'],
      execute: (encoder, _resources) => {
        // Pipeline/bindgroup set externally via hooks; placeholder draw
      },
    });
  }

  addShadowPass(lightIndex = 0) {
    const name = `shadow_map_${lightIndex}`;
    this.createTransientTexture(name, {
      width: this.options.shadowResolution,
      height: this.options.shadowResolution,
      format: 'depth32float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    return this.addRenderPass(`shadow_${lightIndex}`, {
      colorAttachments: [],
      depthAttachment: name,
      outputs: [name],
      execute: (_encoder, _resources) => { /* shadow draw calls injected externally */ },
    });
  }

  addLightingPass() {
    const lit = this.createTransientTexture('lit_color', {
      format: DEFAULT_COLOR_FORMAT,
    });

    // Gather any shadow maps that were declared
    const shadowInputs = [...this.resources.keys()].filter(n => n.startsWith('shadow_map_'));

    return this.addComputePass('lighting', {
      inputs: [
        'gbuffer_position', 'gbuffer_normal', 'gbuffer_albedo',
        'gbuffer_materialId', 'gbuffer_depth',
        ...shadowInputs,
      ],
      outputs: ['lit_color'],
      execute: (encoder, _resources) => {
        // Deferred lighting compute dispatch — pipeline bound externally
      },
    });
  }

  addPathTracePass() {
    this.createTransientTexture('pathtrace_output', {
      format: 'rgba32float',
    });

    return this.addComputePass('pathtrace', {
      inputs: [],
      outputs: ['pathtrace_output'],
      execute: (encoder, _resources) => {
        // Path trace dispatch — pipeline bound externally
      },
    });
  }

  addDenoisePass() {
    this.createTransientTexture('denoised', { format: DEFAULT_COLOR_FORMAT });
    const inputName = this.mode === 'pathtrace' ? 'pathtrace_output' : 'lit_color';

    return this.addComputePass('denoise', {
      inputs: [inputName, 'gbuffer_normal', 'gbuffer_depth'],
      outputs: ['denoised'],
      execute: (encoder, _resources) => {
        // 3-pass à-trous wavelet denoise — pipeline bound externally
      },
    });
  }

  addGIPass() {
    this.createTransientTexture('gi_output', { format: DEFAULT_COLOR_FORMAT });

    return this.addComputePass('global_illumination', {
      inputs: ['gbuffer_position', 'gbuffer_normal', 'gbuffer_albedo', 'gbuffer_depth'],
      outputs: ['gi_output'],
      execute: (encoder, _resources) => {
        // Screen-space or ray-traced GI dispatch
      },
    });
  }

  addVolumetricPass() {
    this.createTransientTexture('volumetric_output', {
      width: Math.ceil(this.options.width / 2),
      height: Math.ceil(this.options.height / 2),
      format: DEFAULT_COLOR_FORMAT,
    });

    return this.addComputePass('volumetrics', {
      inputs: ['gbuffer_depth'],
      outputs: ['volumetric_output'],
      execute: (encoder, _resources) => {
        // Ray-marched volumetric fog / god rays
      },
    });
  }

  addPostProcessPass() {
    this.createTransientTexture('post_output', { format: DEFAULT_COLOR_FORMAT });
    const src = this.resources.has('denoised') ? 'denoised' : 'lit_color';

    const inputs = [src];
    if (this.resources.has('volumetric_output')) inputs.push('volumetric_output');
    if (this.resources.has('gi_output')) inputs.push('gi_output');

    return this.addComputePass('postprocess', {
      inputs,
      outputs: ['post_output'],
      execute: (encoder, _resources) => {
        // Bloom, tonemapping (ACES), chromatic aberration, vignette
      },
    });
  }

  addFinalCompositePass() {
    return this.addRenderPass('final_composite', {
      colorAttachments: ['swapchain'],
      inputs: ['post_output'],
      outputs: [],
      execute: (encoder, _resources) => {
        // Full-screen triangle blit post_output → swapchain
      },
    });
  }

  /**
   * Convenience: configure the full pass graph for the current mode.
   * Call between beginFrame() and endFrame().
   */
  buildDefaultGraph(swapchainTexture) {
    this.importTexture('swapchain', swapchainTexture);

    if (this.mode === 'rasterize') {
      this.addGBufferPass();
      this.addShadowPass(0);
      this.addLightingPass();
      this.addGIPass();
      this.addVolumetricPass();
      this.addPostProcessPass();
      this.addFinalCompositePass();
    } else if (this.mode === 'raytrace') {
      this.addGBufferPass();
      this.addShadowPass(0);
      this.addLightingPass();
      this.addGIPass();
      this.addDenoisePass();
      this.addVolumetricPass();
      this.addPostProcessPass();
      this.addFinalCompositePass();
    } else if (this.mode === 'pathtrace') {
      this.addPathTracePass();
      this.addDenoisePass();
      this.addVolumetricPass();
      this.addPostProcessPass();
      this.addFinalCompositePass();
    }
  }

  // ── Profiling ────────────────────────────────────────────────────────────

  async readTimestamps() {
    if (!this.timestampSupported || !this.queryBuffer) return;
    try {
      await this.queryBuffer.mapAsync(GPUMapMode.READ);
      const data = new BigInt64Array(this.queryBuffer.getMappedRange());
      const passNames = this.sortedOrder.filter(n => {
        const p = this.passes.find(pp => pp.name === n);
        return p && p.alive;
      });

      let total = 0n;
      this.passTimings.clear();
      for (let i = 0; i < passNames.length; i++) {
        const start = data[i * 2];
        const end = data[i * 2 + 1];
        const ns = Number(end - start);
        this.passTimings.set(passNames[i], ns / 1e6); // ms
        total += end - start;
      }
      this.totalGPUTime = Number(total) / 1e6;
      this.queryBuffer.unmap();
    } catch {
      // Query read may fail if device is lost
    }
  }

  getStats() {
    return {
      passTimings: new Map(this.passTimings),
      totalGPUTime: this.totalGPUTime,
      resourceCount: this.resources.size,
      aliasedMemorySaved: this.aliasedMemorySaved,
      passCount: this.passes.filter(p => p.alive).length,
      deadPassesEliminated: this.passes.filter(p => !p.alive).length,
      asyncComputePasses: this.passes.filter(p => p.isAsyncCompute).length,
      frameIndex: this.frameIndex,
      mode: this.mode,
    };
  }

  /**
   * Export a JSON timeline compatible with Chrome's trace viewer (chrome://tracing).
   */
  exportTimeline() {
    const events = [];
    let offset = 0;
    for (const [name, ms] of this.passTimings) {
      const pass = this.passes.find(p => p.name === name);
      events.push({
        name,
        cat: pass ? ['compute', 'render', 'copy'][pass.type] : 'unknown',
        ph: 'X',
        ts: offset * 1000,
        dur: ms * 1000,
        pid: 1,
        tid: pass && pass.isAsyncCompute ? 2 : 1,
      });
      offset += ms;
    }
    return JSON.stringify({ traceEvents: events }, null, 2);
  }
}
