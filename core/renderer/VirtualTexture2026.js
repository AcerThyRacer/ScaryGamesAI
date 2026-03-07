// Virtual Texturing & Texture Streaming System
// Implements tiled virtual textures with GPU feedback, LRU caching, and mip streaming

const feedbackAnalysisShader = /* wgsl */ `
  struct FeedbackEntry {
    packed: u32,
  };

  struct PageRequest {
    textureId: u32,
    pageX: u32,
    pageY: u32,
    mipLevel: u32,
  };

  struct RequestCounter {
    count: atomic<u32>,
  };

  @group(0) @binding(0) var<storage, read> feedbackBuffer: array<u32>;
  @group(0) @binding(1) var<storage, read_write> uniqueRequests: array<PageRequest>;
  @group(0) @binding(2) var<storage, read_write> requestCounter: RequestCounter;
  @group(0) @binding(3) var<uniform> params: vec4<u32>;

  @compute @workgroup_size(16, 16)
  fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = gid.y * params.x + gid.x;
    if (idx >= params.y) { return; }

    let packed = feedbackBuffer[idx];
    if (packed == 0u) { return; }

    let textureId = packed >> 20u;
    let pageX = (packed >> 10u) & 0x3FFu;
    let pageY = packed & 0x3FFu;

    // Deduplicate via atomicAdd; downstream CPU handles true dedup
    let slot = atomicAdd(&requestCounter.count, 1u);
    if (slot < params.z) {
      uniqueRequests[slot].textureId = textureId;
      uniqueRequests[slot].pageX = pageX;
      uniqueRequests[slot].pageY = pageY;
      uniqueRequests[slot].mipLevel = 0u;
    }
  }
`;

const pageUpdateShader = /* wgsl */ `
  struct CopyParams {
    srcOffsetX: u32,
    srcOffsetY: u32,
    dstOffsetX: u32,
    dstOffsetY: u32,
    pageSize: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
  };

  @group(0) @binding(0) var<storage, read> srcPixels: array<u32>;
  @group(0) @binding(1) var physicalTexture: texture_storage_2d<rgba8unorm, write>;
  @group(0) @binding(2) var<uniform> copyParams: CopyParams;

  @compute @workgroup_size(16, 16)
  fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    if (gid.x >= copyParams.pageSize || gid.y >= copyParams.pageSize) { return; }

    let srcIdx = (copyParams.srcOffsetY + gid.y) * copyParams.pageSize + (copyParams.srcOffsetX + gid.x);
    let packed = srcPixels[srcIdx];

    let r = f32(packed & 0xFFu) / 255.0;
    let g = f32((packed >> 8u) & 0xFFu) / 255.0;
    let b = f32((packed >> 16u) & 0xFFu) / 255.0;
    let a = f32((packed >> 24u) & 0xFFu) / 255.0;

    let dstCoord = vec2<i32>(
      i32(copyParams.dstOffsetX + gid.x),
      i32(copyParams.dstOffsetY + gid.y)
    );
    textureStore(physicalTexture, dstCoord, vec4<f32>(r, g, b, a));
  }
`;

const virtualTextureSamplingCode = /* wgsl */ `
  @group(0) @binding(10) var pageTableTex: texture_2d<u32>;
  @group(0) @binding(11) var physicalAtlas: texture_2d<f32>;
  @group(0) @binding(12) var atlasSampler: sampler;

  fn sampleVirtualTexture(virtualUV: vec2<f32>, pageTableSize: vec2<f32>, physicalSize: vec2<f32>, pageSize: f32) -> vec4<f32> {
    let pageCoord = vec2<i32>(floor(virtualUV * pageTableSize));
    let pageInfo = textureLoad(pageTableTex, pageCoord, 0);

    let physPageX = f32(pageInfo.x);
    let physPageY = f32(pageInfo.y);
    let flags = pageInfo.w;

    if (flags == 0u) {
      return vec4<f32>(0.5, 0.0, 0.5, 1.0);
    }

    let fractUV = fract(virtualUV * pageTableSize);
    let physUV = (vec2<f32>(physPageX, physPageY) * pageSize + fractUV * pageSize) / physicalSize;
    return textureSampleLevel(physicalAtlas, atlasSampler, physUV, 0.0);
  }
`;

class LRUNode {
  constructor(key) {
    this.key = key;
    this.prev = null;
    this.next = null;
    this.lastUsedFrame = 0;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = new LRUNode('__head__');
    this.tail = new LRUNode('__tail__');
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.size = 0;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
    node.prev = null;
    node.next = null;
  }

  _pushFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  touch(key, frame) {
    const node = this.map.get(key);
    if (!node) return false;
    node.lastUsedFrame = frame;
    this._remove(node);
    this._pushFront(node);
    return true;
  }

  insert(key, frame) {
    if (this.map.has(key)) {
      this.touch(key, frame);
      return null;
    }
    const node = new LRUNode(key);
    node.lastUsedFrame = frame;
    this._pushFront(node);
    this.map.set(key, node);
    this.size++;

    if (this.size > this.capacity) {
      const evicted = this.tail.prev;
      this._remove(evicted);
      this.map.delete(evicted.key);
      this.size--;
      return evicted.key;
    }
    return null;
  }

  has(key) {
    return this.map.has(key);
  }

  remove(key) {
    const node = this.map.get(key);
    if (!node) return false;
    this._remove(node);
    this.map.delete(key);
    this.size--;
    return true;
  }

  evictLRU() {
    if (this.size === 0) return null;
    const victim = this.tail.prev;
    this._remove(victim);
    this.map.delete(victim.key);
    this.size--;
    return victim.key;
  }
}

export class VirtualTexture2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      pageSize: 256,
      physicalTextureSize: 4096,
      maxPages: 1024,
      streamingBudgetPerFrame: 4,
      feedbackBufferSize: 1024 * 1024,
      ...options
    };

    this.pageTableTexture = null;
    this.physicalTexture = null;
    this.feedbackBuffer = null;
    this.feedbackReadBuffer = null;
    this.feedbackStagingBuffer = null;
    this.pageStagingBuffer = null;
    this.feedbackAnalysisPipeline = null;
    this.pageUpdatePipeline = null;
    this.feedbackBindGroup = null;
    this.uniqueRequestBuffer = null;
    this.requestCounterBuffer = null;
    this.requestCounterReadBuffer = null;
    this.feedbackParamsBuffer = null;
    this.copyParamsBuffer = null;
    this.atlasSampler = null;

    const ptsz = this.options.physicalTextureSize;
    const psz = this.options.pageSize;
    this.physicalGridDim = ptsz / psz;
    this.totalPhysicalSlots = this.physicalGridDim * this.physicalGridDim;

    this.virtualTextures = new Map();
    this.nextTextureId = 1;
    this.pageToSlot = new Map();
    this.slotToPage = new Array(this.totalPhysicalSlots).fill(null);
    this.lru = new LRUCache(this.totalPhysicalSlots);
    this.freeSlots = [];
    this.streamingQueue = [];
    this.frameCounter = 0;
    this.pendingFeedbackRead = null;

    this.stats = {
      pagesLoaded: 0,
      pagesCached: 0,
      cacheHits: 0,
      cacheMisses: 0,
      evictions: 0,
      streamingQueueLength: 0
    };
  }

  async initialize() {
    try {
      this._createPageTableTexture();
      this._createPhysicalTexture();
      this._createFeedbackBuffers();
      this._createStagingBuffers();
      this._createComputePipelines();
      this._initFreeSlots();

      this.atlasSampler = this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
        label: 'VT Atlas Sampler'
      });

      console.log('✓ VirtualTexture2026 initialized');
      return true;
    } catch (error) {
      console.error('VirtualTexture2026 init failed:', error);
      return false;
    }
  }

  _createPageTableTexture() {
    const maxDim = Math.ceil(Math.sqrt(this.options.maxPages));
    this.pageTableWidth = maxDim;
    this.pageTableHeight = maxDim;
    this.pageTableTexture = this.device.createTexture({
      size: [this.pageTableWidth, this.pageTableHeight],
      format: 'rgba16uint',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      label: 'VT Page Table'
    });
    this.pageTableData = new Uint16Array(this.pageTableWidth * this.pageTableHeight * 4);
  }

  _createPhysicalTexture() {
    const sz = this.options.physicalTextureSize;
    this.physicalTexture = this.device.createTexture({
      size: [sz, sz],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING |
             GPUTextureUsage.COPY_DST,
      label: 'VT Physical Atlas'
    });
  }

  _createFeedbackBuffers() {
    const fbSize = this.options.feedbackBufferSize * 4;
    this.feedbackBuffer = this.device.createBuffer({
      size: fbSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      label: 'VT Feedback Buffer'
    });
    this.feedbackReadBuffer = this.device.createBuffer({
      size: fbSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      label: 'VT Feedback Read Buffer'
    });

    const maxRequests = this.options.maxPages;
    this.uniqueRequestBuffer = this.device.createBuffer({
      size: maxRequests * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      label: 'VT Unique Requests'
    });
    this.requestCounterBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      label: 'VT Request Counter'
    });
    this.requestCounterReadBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      label: 'VT Counter Read Buffer'
    });
    this.feedbackParamsBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'VT Feedback Params'
    });
  }

  _createStagingBuffers() {
    const pageBytes = this.options.pageSize * this.options.pageSize * 4;
    this.pageStagingBuffer = this.device.createBuffer({
      size: pageBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'VT Page Staging Buffer'
    });
    this.copyParamsBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'VT Copy Params'
    });
  }

  _createComputePipelines() {
    const feedbackModule = this.device.createShaderModule({
      code: feedbackAnalysisShader,
      label: 'VT Feedback Analysis Shader'
    });
    this.feedbackAnalysisPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: feedbackModule, entryPoint: 'main' },
      label: 'VT Feedback Analysis Pipeline'
    });
    this.feedbackBindGroup = this.device.createBindGroup({
      layout: this.feedbackAnalysisPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.feedbackBuffer } },
        { binding: 1, resource: { buffer: this.uniqueRequestBuffer } },
        { binding: 2, resource: { buffer: this.requestCounterBuffer } },
        { binding: 3, resource: { buffer: this.feedbackParamsBuffer } }
      ],
      label: 'VT Feedback Bind Group'
    });

    const pageUpdateModule = this.device.createShaderModule({
      code: pageUpdateShader,
      label: 'VT Page Update Shader'
    });
    this.pageUpdatePipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: pageUpdateModule, entryPoint: 'main' },
      label: 'VT Page Update Pipeline'
    });
  }

  _initFreeSlots() {
    for (let i = this.totalPhysicalSlots - 1; i >= 0; i--) {
      this.freeSlots.push(i);
    }
  }

  registerVirtualTexture(name, width, height, mipLevels, pageSource) {
    const psz = this.options.pageSize;
    const pagesX = Math.ceil(width / psz);
    const pagesY = Math.ceil(height / psz);
    const id = this.nextTextureId++;
    const entry = {
      id, name, width, height, mipLevels, pagesX, pagesY,
      totalPages: pagesX * pagesY * mipLevels,
      pageSource
    };
    this.virtualTextures.set(id, entry);
    return id;
  }

  updateFeedback(commandEncoder) {
    const fbWidth = Math.ceil(Math.sqrt(this.options.feedbackBufferSize));
    const params = new Uint32Array([fbWidth, this.options.feedbackBufferSize, this.options.maxPages, 0]);
    this.device.queue.writeBuffer(this.feedbackParamsBuffer, 0, params);

    // Reset counter
    this.device.queue.writeBuffer(this.requestCounterBuffer, 0, new Uint32Array([0]));

    const pass = commandEncoder.beginComputePass({ label: 'VT Feedback Analysis' });
    pass.setPipeline(this.feedbackAnalysisPipeline);
    pass.setBindGroup(0, this.feedbackBindGroup);
    const wgX = Math.ceil(fbWidth / 16);
    const wgY = Math.ceil(fbWidth / 16);
    pass.dispatchWorkgroups(wgX, wgY);
    pass.end();

    commandEncoder.copyBufferToBuffer(
      this.feedbackBuffer, 0, this.feedbackReadBuffer, 0,
      this.options.feedbackBufferSize * 4
    );
    commandEncoder.copyBufferToBuffer(
      this.requestCounterBuffer, 0, this.requestCounterReadBuffer, 0, 4
    );
  }

  async processStreamingRequests() {
    if (this.pendingFeedbackRead) return;

    this.pendingFeedbackRead = true;
    try {
      await this.requestCounterReadBuffer.mapAsync(GPUMapMode.READ);
      const countArr = new Uint32Array(this.requestCounterReadBuffer.getMappedRange());
      const requestCount = Math.min(countArr[0], this.options.maxPages);
      this.requestCounterReadBuffer.unmap();

      if (requestCount === 0) {
        this.pendingFeedbackRead = false;
        return;
      }

      await this.feedbackReadBuffer.mapAsync(GPUMapMode.READ);
      const fbData = new Uint32Array(this.feedbackReadBuffer.getMappedRange());

      const seen = new Set();
      const requests = [];
      for (let i = 0; i < Math.min(fbData.length, this.options.feedbackBufferSize); i++) {
        const packed = fbData[i];
        if (packed === 0) continue;
        const textureId = packed >>> 20;
        const pageX = (packed >>> 10) & 0x3FF;
        const pageY = packed & 0x3FF;
        const key = `${textureId}:${pageX}:${pageY}`;

        if (!seen.has(key) && !this.pageToSlot.has(key)) {
          seen.add(key);
          const vtex = this.virtualTextures.get(textureId);
          if (vtex) {
            for (let mip = vtex.mipLevels - 1; mip >= 0; mip--) {
              const mipKey = `${textureId}:${pageX >> mip}:${pageY >> mip}:${mip}`;
              if (!this.pageToSlot.has(mipKey)) {
                requests.push({ textureId, pageX: pageX >> mip, pageY: pageY >> mip, mipLevel: mip, key: mipKey });
              }
            }
          }
          this.stats.cacheMisses++;
        } else if (this.pageToSlot.has(key)) {
          this.stats.cacheHits++;
          this.lru.touch(key, this.frameCounter);
        }
      }
      this.feedbackReadBuffer.unmap();

      // Sort: highest mip level (lowest detail) gets priority for progressive loading
      requests.sort((a, b) => b.mipLevel - a.mipLevel);

      for (const req of requests) {
        if (!this.streamingQueue.some(q => q.key === req.key)) {
          this.streamingQueue.push(req);
        }
      }
      this.stats.streamingQueueLength = this.streamingQueue.length;
    } finally {
      this.pendingFeedbackRead = false;
    }
  }

  async streamTick() {
    this.frameCounter++;
    const budget = this.options.streamingBudgetPerFrame;
    const toUpload = this.streamingQueue.splice(0, budget);

    for (const req of toUpload) {
      const vtex = this.virtualTextures.get(req.textureId);
      if (!vtex || !vtex.pageSource) continue;

      let slotIndex = this._allocateSlot(req.key);
      if (slotIndex === -1) continue;

      const slotX = slotIndex % this.physicalGridDim;
      const slotY = Math.floor(slotIndex / this.physicalGridDim);

      let pageData;
      try {
        pageData = await vtex.pageSource(req.pageX, req.pageY, req.mipLevel);
      } catch {
        continue;
      }
      if (!pageData || pageData.length === 0) continue;

      this._uploadPageToAtlas(pageData, slotX, slotY);
      this._updatePageTableEntry(req, slotX, slotY);

      this.pageToSlot.set(req.key, slotIndex);
      this.slotToPage[slotIndex] = req.key;
      this.stats.pagesLoaded++;
      this.stats.pagesCached = this.lru.size;
    }

    this.stats.streamingQueueLength = this.streamingQueue.length;
  }

  _allocateSlot(pageKey) {
    if (this.freeSlots.length > 0) {
      const slot = this.freeSlots.pop();
      const evictedKey = this.lru.insert(pageKey, this.frameCounter);
      if (evictedKey) this._evictPage(evictedKey);
      return slot;
    }

    const evictedKey = this.lru.evictLRU();
    if (!evictedKey) return -1;

    const slot = this.pageToSlot.get(evictedKey);
    this.pageToSlot.delete(evictedKey);
    this.slotToPage[slot] = null;
    this.stats.evictions++;

    this.lru.insert(pageKey, this.frameCounter);
    return slot;
  }

  _evictPage(key) {
    const slot = this.pageToSlot.get(key);
    if (slot !== undefined) {
      this.pageToSlot.delete(key);
      this.slotToPage[slot] = null;
      this.freeSlots.push(slot);
      this.stats.evictions++;
    }
  }

  _uploadPageToAtlas(pageData, slotX, slotY) {
    const psz = this.options.pageSize;
    const packedData = new Uint32Array(pageData.buffer, pageData.byteOffset, psz * psz);

    this.device.queue.writeBuffer(this.pageStagingBuffer, 0, packedData);

    const dstX = slotX * psz;
    const dstY = slotY * psz;
    const params = new Uint32Array([0, 0, dstX, dstY, psz, 0, 0, 0]);
    this.device.queue.writeBuffer(this.copyParamsBuffer, 0, params);

    const bindGroup = this.device.createBindGroup({
      layout: this.pageUpdatePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.pageStagingBuffer } },
        { binding: 1, resource: this.physicalTexture.createView({ format: 'rgba8unorm' }) },
        { binding: 2, resource: { buffer: this.copyParamsBuffer } }
      ],
      label: 'VT Page Upload Bind Group'
    });

    const encoder = this.device.createCommandEncoder({ label: 'VT Page Upload' });
    const pass = encoder.beginComputePass({ label: 'VT Page Copy' });
    pass.setPipeline(this.pageUpdatePipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(psz / 16), Math.ceil(psz / 16));
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  _updatePageTableEntry(req, physSlotX, physSlotY) {
    const vtex = this.virtualTextures.get(req.textureId);
    if (!vtex) return;

    const ptIdx = (req.pageY * this.pageTableWidth + req.pageX) * 4;
    this.pageTableData[ptIdx] = physSlotX;
    this.pageTableData[ptIdx + 1] = physSlotY;
    this.pageTableData[ptIdx + 2] = req.mipLevel;
    this.pageTableData[ptIdx + 3] = 1; // flags: page resident

    this.device.queue.writeTexture(
      { texture: this.pageTableTexture, origin: [req.pageX, req.pageY, 0] },
      new Uint16Array([physSlotX, physSlotY, req.mipLevel, 1]),
      { bytesPerRow: 8 },
      { width: 1, height: 1 }
    );
  }

  getPageTableTexture() {
    return this.pageTableTexture;
  }

  getPhysicalTexture() {
    return this.physicalTexture;
  }

  getShaderCode() {
    return virtualTextureSamplingCode;
  }

  getFeedbackBuffer() {
    return this.feedbackBuffer;
  }

  getStats() {
    const totalAccesses = this.stats.cacheHits + this.stats.cacheMisses;
    return {
      pagesLoaded: this.stats.pagesLoaded,
      pagesCached: this.stats.pagesCached,
      cacheHitRate: totalAccesses > 0 ? this.stats.cacheHits / totalAccesses : 0,
      streamingQueueLength: this.stats.streamingQueueLength,
      evictions: this.stats.evictions,
      freeSlots: this.freeSlots.length,
      frameCounter: this.frameCounter
    };
  }

  dispose() {
    const buffers = [
      this.feedbackBuffer, this.feedbackReadBuffer, this.uniqueRequestBuffer,
      this.requestCounterBuffer, this.requestCounterReadBuffer,
      this.feedbackParamsBuffer, this.pageStagingBuffer, this.copyParamsBuffer
    ];
    for (const buf of buffers) {
      if (buf) buf.destroy();
    }
    if (this.pageTableTexture) this.pageTableTexture.destroy();
    if (this.physicalTexture) this.physicalTexture.destroy();

    this.pageToSlot.clear();
    this.slotToPage.fill(null);
    this.streamingQueue.length = 0;
    this.virtualTextures.clear();
    this.lru = null;
    console.log('✓ VirtualTexture2026 disposed');
  }
}
