/**
 * MemoryManager2026.js
 * GPU Memory Optimization Manager for the ScaryGamesAI rendering engine.
 * Handles texture streaming, buffer sub-allocation, render target aliasing,
 * memory budget tracking, LOD-aware mesh streaming, format optimization,
 * and periodic defragmentation.
 */

const FORMAT_SIZES = {
  'rgba8unorm': 4,
  'rgba16float': 8,
  'r11g11b10ufloat': 4,
  'rgba32float': 16,
  'bc1-rgba-unorm': 0.5,
  'bc3-rgba-unorm': 1,
  'bc7-rgba-unorm': 1,
  'depth24plus': 4,
  'depth32float': 4,
  'r8unorm': 1,
  'rg8unorm': 2,
  'r16float': 2,
  'rg16float': 4
};

const TEXTURE_FORMATS = {
  BC1: 'bc1-rgba-unorm',
  BC3: 'bc3-rgba-unorm',
  BC7: 'bc7-rgba-unorm'
};

export class MemoryManager2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      maxVRAM: options.maxVRAM ?? 200_000_000,
      textureStreamingBudget: options.textureStreamingBudget ?? 100_000_000,
      enableAliasing: options.enableAliasing ?? true,
      warningThreshold: options.warningThreshold ?? 0.8,
      defragInterval: options.defragInterval ?? 300,
      streamBatchSize: options.streamBatchSize ?? 1,
      ...options
    };

    this.initialized = false;
    this.usedVRAM = 0;
    this.textureVRAM = 0;

    this.textures = new Map();
    this.buffers = new Map();
    this.aliases = new Map();

    this.streamingQueue = [];
    this.evictionCandidates = [];

    this.bufferPools = new Map();
    this.ringAllocators = new Map();

    this.frameCount = 0;
    this.lastDefragFrame = 0;

    this.stats = {
      usedVRAM: 0,
      budgetRemaining: this.options.maxVRAM,
      texturesStreamed: 0,
      aliasedSaved: 0,
      allocations: 0,
      evictions: 0,
      defragCount: 0
    };
  }

  async initialize() {
    if (this.initialized) return;

    this._initBufferPool('vertex', 16 * 1024 * 1024, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
    this._initBufferPool('index', 8 * 1024 * 1024, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST);
    this._initBufferPool('uniform', 4 * 1024 * 1024, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this._initBufferPool('storage', 16 * 1024 * 1024, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);

    this.initialized = true;
  }

  _initBufferPool(name, size, usage) {
    const buffer = this.device.createBuffer({
      size,
      usage,
      label: `pool-${name}`
    });

    this.bufferPools.set(name, {
      buffer,
      size,
      usage,
      freeRegions: [{ offset: 0, size }],
      allocations: new Map()
    });

    this.ringAllocators.set(name, {
      head: 0,
      tail: 0,
      capacity: size
    });

    this.usedVRAM += size;
    this._updateStats();
  }

  allocateTexture(name, width, height, format, priority = 1.0) {
    if (this.textures.has(name)) {
      console.warn(`[MemoryManager] Texture "${name}" already allocated`);
      return this.textures.get(name);
    }

    const bpp = FORMAT_SIZES[format] || 4;
    const dataSize = width * height * bpp;

    if (this.usedVRAM + dataSize > this.options.maxVRAM) {
      this._evictUntilFree(dataSize);
    }

    if (this.usedVRAM + dataSize > this.options.maxVRAM) {
      console.error(`[MemoryManager] Cannot allocate texture "${name}": VRAM budget exceeded`);
      return null;
    }

    const texture = this.device.createTexture({
      size: { width, height, depthOrArrayLayers: 1 },
      format,
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_DST |
             GPUTextureUsage.RENDER_ATTACHMENT,
      label: name
    });

    const entry = {
      name,
      texture,
      width,
      height,
      format,
      dataSize,
      priority,
      lastUsedFrame: this.frameCount,
      usageFrequency: 0,
      streamed: false,
      resident: true
    };

    this.textures.set(name, entry);
    this.usedVRAM += dataSize;
    this.textureVRAM += dataSize;
    this.stats.allocations++;
    this._checkBudgetWarning();
    this._updateStats();

    return entry;
  }

  allocateBuffer(name, size, usage = 'vertex') {
    if (this.buffers.has(name)) {
      console.warn(`[MemoryManager] Buffer "${name}" already allocated`);
      return this.buffers.get(name);
    }

    const pool = this.bufferPools.get(usage);
    if (!pool) {
      return this._allocateStandaloneBuffer(name, size, usage);
    }

    const region = this._ringAlloc(usage, size);
    if (!region) {
      return this._allocateStandaloneBuffer(name, size, usage);
    }

    const entry = {
      name,
      buffer: pool.buffer,
      offset: region.offset,
      size: region.size,
      pool: usage,
      standalone: false
    };

    this.buffers.set(name, entry);
    pool.allocations.set(name, region);
    this.stats.allocations++;
    this._updateStats();

    return entry;
  }

  _allocateStandaloneBuffer(name, size, usage) {
    const usageFlags = this._getUsageFlags(usage);

    if (this.usedVRAM + size > this.options.maxVRAM) {
      console.error(`[MemoryManager] Cannot allocate buffer "${name}": VRAM budget exceeded`);
      return null;
    }

    const buffer = this.device.createBuffer({
      size: Math.max(size, 16),
      usage: usageFlags,
      label: name
    });

    const entry = {
      name,
      buffer,
      offset: 0,
      size,
      pool: null,
      standalone: true
    };

    this.buffers.set(name, entry);
    this.usedVRAM += size;
    this.stats.allocations++;
    this._updateStats();

    return entry;
  }

  _getUsageFlags(usage) {
    const map = {
      vertex: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      index: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      uniform: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      storage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    };
    return map[usage] || (GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
  }

  _ringAlloc(poolName, size) {
    const ring = this.ringAllocators.get(poolName);
    if (!ring) return null;

    const alignedSize = Math.ceil(size / 256) * 256;

    if (ring.head + alignedSize <= ring.capacity) {
      const offset = ring.head;
      ring.head += alignedSize;
      return { offset, size: alignedSize };
    }

    if (alignedSize <= ring.tail) {
      ring.head = alignedSize;
      return { offset: 0, size: alignedSize };
    }

    return null;
  }

  freeResource(name) {
    if (this.textures.has(name)) {
      const entry = this.textures.get(name);
      entry.texture.destroy();
      this.usedVRAM -= entry.dataSize;
      this.textureVRAM -= entry.dataSize;
      this.textures.delete(name);
      this._updateStats();
      return true;
    }

    if (this.buffers.has(name)) {
      const entry = this.buffers.get(name);
      if (entry.standalone) {
        entry.buffer.destroy();
        this.usedVRAM -= entry.size;
      } else if (entry.pool) {
        const pool = this.bufferPools.get(entry.pool);
        pool?.allocations.delete(name);
      }
      this.buffers.delete(name);
      this._updateStats();
      return true;
    }

    if (this.aliases.has(name)) {
      this.aliases.delete(name);
      return true;
    }

    return false;
  }

  requestAlias(name, size, format, lifetime) {
    if (!this.options.enableAliasing) {
      return this.allocateTexture(name, size, size, format, 0.5);
    }

    for (const [existingName, entry] of this.aliases) {
      if (entry.size >= size && !this._lifetimesOverlap(entry.lifetime, lifetime)) {
        const alias = {
          name,
          aliasOf: existingName,
          texture: entry.texture,
          size,
          format,
          lifetime,
          shared: true
        };
        this.aliases.set(name, alias);
        this.stats.aliasedSaved += size * size * (FORMAT_SIZES[format] || 4);
        this._updateStats();
        return alias;
      }
    }

    const bpp = FORMAT_SIZES[format] || 4;
    const dataSize = size * size * bpp;

    const texture = this.device.createTexture({
      size: { width: size, height: size, depthOrArrayLayers: 1 },
      format,
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.RENDER_ATTACHMENT |
             GPUTextureUsage.COPY_DST,
      label: `alias-${name}`
    });

    const entry = {
      name,
      aliasOf: null,
      texture,
      size,
      format,
      lifetime,
      dataSize,
      shared: false
    };

    this.aliases.set(name, entry);
    this.usedVRAM += dataSize;
    this._updateStats();

    return entry;
  }

  _lifetimesOverlap(a, b) {
    if (!a || !b) return false;
    return !(a.end <= b.start || b.end <= a.start);
  }

  updatePriorities(camera, entityPositions) {
    if (!camera || !entityPositions) return;

    const camPos = camera.position || { x: 0, y: 0, z: 0 };

    for (const [, entry] of this.textures) {
      let minDist = Infinity;

      for (const entity of entityPositions) {
        if (!entity.textures || !entity.textures.includes(entry.name)) continue;
        const dx = entity.x - camPos.x;
        const dy = entity.y - camPos.y;
        const dz = entity.z - camPos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        minDist = Math.min(minDist, dist);
      }

      const distanceFactor = minDist === Infinity ? 0.01 : 1.0 / Math.max(minDist, 0.1);
      const screenSize = (entry.width * entry.height) / (1024 * 1024);
      const frequencyFactor = Math.min(entry.usageFrequency / 100, 1.0);

      entry.priority = distanceFactor * screenSize * (0.5 + frequencyFactor * 0.5);
    }

    this.streamingQueue = [...this.textures.values()]
      .filter(e => !e.resident)
      .sort((a, b) => b.priority - a.priority);

    this.evictionCandidates = [...this.textures.values()]
      .filter(e => e.resident)
      .sort((a, b) => a.priority - b.priority);
  }

  streamTick() {
    this.frameCount++;

    for (let i = 0; i < this.options.streamBatchSize; i++) {
      if (this.streamingQueue.length === 0) break;

      const entry = this.streamingQueue.shift();
      if (!entry || entry.resident) continue;

      if (this.textureVRAM + entry.dataSize > this.options.textureStreamingBudget) {
        this._evictLowestPriority();
      }

      entry.resident = true;
      entry.streamed = true;
      entry.lastUsedFrame = this.frameCount;
      this.stats.texturesStreamed++;
    }

    if (this.frameCount - this.lastDefragFrame >= this.options.defragInterval) {
      this._defragment();
      this.lastDefragFrame = this.frameCount;
    }

    this._updateStats();
  }

  _evictLowestPriority() {
    if (this.evictionCandidates.length === 0) return;

    const victim = this.evictionCandidates.shift();
    if (!victim || !victim.resident) return;

    victim.resident = false;
    this.textureVRAM -= victim.dataSize;
    this.stats.evictions++;
  }

  _evictUntilFree(needed) {
    const sorted = [...this.textures.values()]
      .filter(e => e.resident)
      .sort((a, b) => a.priority - b.priority);

    let freed = 0;
    for (const entry of sorted) {
      if (freed >= needed) break;
      entry.resident = false;
      freed += entry.dataSize;
      this.usedVRAM -= entry.dataSize;
      this.textureVRAM -= entry.dataSize;
      this.stats.evictions++;
    }
  }

  _defragment() {
    for (const [name, ring] of this.ringAllocators) {
      const pool = this.bufferPools.get(name);
      if (!pool || pool.allocations.size === 0) {
        ring.head = 0;
        ring.tail = 0;
      }
    }
    this.stats.defragCount++;
  }

  _checkBudgetWarning() {
    const ratio = this.usedVRAM / this.options.maxVRAM;
    if (ratio >= 1.0) {
      console.error(`[MemoryManager] VRAM LIMIT REACHED: ${(this.usedVRAM / 1e6).toFixed(1)}MB / ${(this.options.maxVRAM / 1e6).toFixed(1)}MB`);
    } else if (ratio >= this.options.warningThreshold) {
      console.warn(`[MemoryManager] VRAM warning: ${(ratio * 100).toFixed(0)}% used (${(this.usedVRAM / 1e6).toFixed(1)}MB / ${(this.options.maxVRAM / 1e6).toFixed(1)}MB)`);
    }
  }

  static recommendFormat(hasAlpha, needsQuality) {
    if (needsQuality) return TEXTURE_FORMATS.BC7;
    if (hasAlpha) return TEXTURE_FORMATS.BC3;
    return TEXTURE_FORMATS.BC1;
  }

  static estimateTextureSize(width, height, format) {
    const bpp = FORMAT_SIZES[format] || 4;
    return width * height * bpp;
  }

  _updateStats() {
    this.stats.usedVRAM = this.usedVRAM;
    this.stats.budgetRemaining = this.options.maxVRAM - this.usedVRAM;
  }

  getStats() {
    return {
      usedVRAM: this.stats.usedVRAM,
      budgetRemaining: this.stats.budgetRemaining,
      texturesStreamed: this.stats.texturesStreamed,
      aliasedSaved: this.stats.aliasedSaved,
      allocations: this.stats.allocations,
      evictions: this.stats.evictions,
      defragCount: this.stats.defragCount,
      textureCount: this.textures.size,
      bufferCount: this.buffers.size,
      aliasCount: this.aliases.size,
      usagePercent: ((this.usedVRAM / this.options.maxVRAM) * 100).toFixed(1)
    };
  }

  dispose() {
    for (const [, entry] of this.textures) {
      entry.texture?.destroy();
    }
    this.textures.clear();

    for (const [, entry] of this.buffers) {
      if (entry.standalone) entry.buffer?.destroy();
    }
    this.buffers.clear();

    for (const [, entry] of this.aliases) {
      if (!entry.shared) entry.texture?.destroy();
    }
    this.aliases.clear();

    for (const [, pool] of this.bufferPools) {
      pool.buffer?.destroy();
    }
    this.bufferPools.clear();
    this.ringAllocators.clear();

    this.usedVRAM = 0;
    this.textureVRAM = 0;
    this.streamingQueue = [];
    this.evictionCandidates = [];

    this._updateStats();
    this.initialized = false;
  }
}
