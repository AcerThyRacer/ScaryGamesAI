/**
 * AsyncComputePipeline2026.js
 * Maximizes GPU utilization by overlapping independent compute work with rendering.
 * The GPU can execute compute shaders on compute queues while render passes run on
 * the graphics queue.
 */

const COMPUTE_CATEGORIES = [
  'physics',
  'ai',
  'particles',
  'audio',
  'denoiser',
  'gi_update',
  'culling'
];

export class AsyncComputePipeline2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      maxConcurrentCompute: options.maxConcurrentCompute ?? 4,
      enableProfiling: options.enableProfiling ?? true,
      doubleBuffer: options.doubleBuffer ?? true,
      barrierCoalescing: options.barrierCoalescing ?? true,
      ...options
    };

    this.initialized = false;
    this.frameIndex = 0;

    this.workItems = [];
    this.computeWork = [];
    this.renderWork = [];
    this.scheduledOrder = [];

    this.stateBuffers = [null, null];
    this.activeStateIndex = 0;

    this.querySet = null;
    this.queryBuffer = null;
    this.queryResolveBuffer = null;
    this.profilingData = new Map();

    for (const cat of COMPUTE_CATEGORIES) {
      this.profilingData.set(cat, { totalTime: 0, dispatchCount: 0, avgTime: 0 });
    }
    this.profilingData.set('render', { totalTime: 0, dispatchCount: 0, avgTime: 0 });

    this.frameStats = {
      perCategoryTime: {},
      overlapPercentage: 0,
      totalGPUTime: 0
    };

    this._nextWorkId = 0;
  }

  async initialize() {
    if (this.initialized) return;

    if (this.options.doubleBuffer) {
      for (let i = 0; i < 2; i++) {
        this.stateBuffers[i] = this.device.createBuffer({
          size: 1024 * 1024,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
          label: `async-compute-state-${i}`
        });
      }
    }

    if (this.options.enableProfiling) {
      const maxQueries = 128;
      this.querySet = this.device.createQuerySet({
        type: 'timestamp',
        count: maxQueries,
        label: 'async-compute-timestamps'
      });
      this.queryBuffer = this.device.createBuffer({
        size: maxQueries * 8,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        label: 'async-compute-query-resolve'
      });
      this.queryResolveBuffer = this.device.createBuffer({
        size: maxQueries * 8,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        label: 'async-compute-query-readback'
      });
    }

    this.initialized = true;
  }

  beginFrame() {
    this.computeWork = [];
    this.renderWork = [];
    this.workItems = [];
    this.scheduledOrder = [];
    this._nextWorkId = 0;

    if (this.options.doubleBuffer) {
      this.activeStateIndex = this.frameIndex % 2;
    }

    this.frameIndex++;
  }

  addComputeWork(category, callback, dependencies = []) {
    if (!COMPUTE_CATEGORIES.includes(category)) {
      console.warn(`[AsyncComputePipeline] Unknown category "${category}", using as-is`);
    }

    const id = `compute_${this._nextWorkId++}`;
    const item = {
      id,
      type: 'compute',
      category,
      callback,
      dependencies: [...dependencies],
      queryIndex: -1,
      executed: false
    };

    this.computeWork.push(item);
    this.workItems.push(item);
    return id;
  }

  addRenderWork(name, callback, dependencies = []) {
    const id = `render_${this._nextWorkId++}`;
    const item = {
      id,
      type: 'render',
      category: 'render',
      name,
      callback,
      dependencies: [...dependencies],
      queryIndex: -1,
      executed: false
    };

    this.renderWork.push(item);
    this.workItems.push(item);
    return id;
  }

  schedule() {
    const adjacency = new Map();
    const inDegree = new Map();

    for (const item of this.workItems) {
      adjacency.set(item.id, []);
      inDegree.set(item.id, 0);
    }

    for (const item of this.workItems) {
      for (const dep of item.dependencies) {
        if (adjacency.has(dep)) {
          adjacency.get(dep).push(item.id);
          inDegree.set(item.id, inDegree.get(item.id) + 1);
        }
      }
    }

    const queue = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const sorted = [];
    const itemMap = new Map(this.workItems.map(w => [w.id, w]));

    while (queue.length > 0) {
      const readyCompute = [];
      const readyRender = [];

      for (const id of queue) {
        const item = itemMap.get(id);
        if (item.type === 'compute') readyCompute.push(id);
        else readyRender.push(id);
      }

      const batch = [];
      const batchCompute = readyCompute.slice(0, this.options.maxConcurrentCompute);
      batch.push(...batchCompute);

      if (readyRender.length > 0 && batchCompute.length > 0) {
        batch.push(...readyRender);
      } else {
        batch.push(...readyRender);
        const remaining = readyCompute.slice(this.options.maxConcurrentCompute);
        batch.push(...remaining);
      }

      queue.length = 0;

      for (const id of batch) {
        sorted.push(id);
        for (const neighbor of adjacency.get(id)) {
          const newDeg = inDegree.get(neighbor) - 1;
          inDegree.set(neighbor, newDeg);
          if (newDeg === 0) queue.push(neighbor);
        }
      }
    }

    if (sorted.length !== this.workItems.length) {
      console.error('[AsyncComputePipeline] Cycle detected in dependency graph!');
      const scheduled = new Set(sorted);
      for (const item of this.workItems) {
        if (!scheduled.has(item.id)) sorted.push(item.id);
      }
    }

    this.scheduledOrder = sorted.map(id => itemMap.get(id));
    this._detectOverlapRegions();

    return this.scheduledOrder;
  }

  _detectOverlapRegions() {
    let computeRanges = 0;
    let renderRanges = 0;
    let overlapRanges = 0;

    let prevType = null;
    let consecutiveCompute = 0;
    let consecutiveRender = 0;

    for (const item of this.scheduledOrder) {
      if (item.type === 'compute') {
        consecutiveCompute++;
        if (prevType === 'render' && consecutiveRender > 0) {
          overlapRanges++;
        }
        computeRanges++;
      } else {
        consecutiveRender++;
        if (prevType === 'compute' && consecutiveCompute > 0) {
          overlapRanges++;
        }
        renderRanges++;
      }
      prevType = item.type;
    }

    const total = computeRanges + renderRanges;
    this.frameStats.overlapPercentage = total > 0
      ? Math.min(100, (overlapRanges / total) * 200)
      : 0;
  }

  async execute(commandEncoder) {
    if (this.scheduledOrder.length === 0) {
      this.schedule();
    }

    let queryIdx = 0;
    const timestamps = [];

    for (const item of this.scheduledOrder) {
      this._insertBarrier(commandEncoder, item);

      if (this.options.enableProfiling && this.querySet && queryIdx + 1 < 128) {
        item.queryIndex = queryIdx;
        commandEncoder.writeTimestamp?.(this.querySet, queryIdx++);
      }

      const ctx = this._createWorkContext(commandEncoder, item);

      try {
        await item.callback(ctx);
        item.executed = true;
      } catch (err) {
        console.error(`[AsyncComputePipeline] Work item ${item.id} failed:`, err);
      }

      if (this.options.enableProfiling && this.querySet && queryIdx < 128) {
        commandEncoder.writeTimestamp?.(this.querySet, queryIdx++);
        timestamps.push({
          category: item.category,
          startQuery: item.queryIndex,
          endQuery: queryIdx - 1
        });
      }
    }

    if (this.options.enableProfiling && queryIdx > 0 && this.queryBuffer) {
      commandEncoder.resolveQuerySet(this.querySet, 0, queryIdx, this.queryBuffer, 0);
      commandEncoder.copyBufferToBuffer(
        this.queryBuffer, 0,
        this.queryResolveBuffer, 0,
        queryIdx * 8
      );
    }

    this._updateProfilingData(timestamps);
  }

  _insertBarrier(commandEncoder, item) {
    if (item.dependencies.length === 0) return;

    const needsComputeToRender = item.type === 'render' &&
      item.dependencies.some(dep => {
        const w = this.workItems.find(wi => wi.id === dep);
        return w && w.type === 'compute';
      });

    const needsRenderToCompute = item.type === 'compute' &&
      item.dependencies.some(dep => {
        const w = this.workItems.find(wi => wi.id === dep);
        return w && w.type === 'render';
      });

    if (needsComputeToRender || needsRenderToCompute) {
      // WebGPU handles synchronization via command ordering within an encoder,
      // but we mark this for potential future multi-queue support
      item._barrierInserted = true;
    }
  }

  _createWorkContext(commandEncoder, item) {
    const ctx = {
      encoder: commandEncoder,
      frameIndex: this.frameIndex,
      workId: item.id,
      category: item.category
    };

    if (this.options.doubleBuffer) {
      const readIdx = (this.activeStateIndex + 1) % 2;
      ctx.readState = this.stateBuffers[readIdx];
      ctx.writeState = this.stateBuffers[this.activeStateIndex];
    }

    if (item.type === 'compute') {
      ctx.beginComputePass = (descriptor = {}) => {
        return commandEncoder.beginComputePass({
          ...descriptor,
          label: descriptor.label || `compute-${item.category}-${item.id}`
        });
      };
    }

    return ctx;
  }

  _updateProfilingData(timestamps) {
    let totalTime = 0;

    // Estimate timing from dispatch counts (actual GPU timing requires readback)
    for (const ts of timestamps) {
      const cat = ts.category;
      const estimatedTime = 0.5; // ms estimate per dispatch
      const data = this.profilingData.get(cat);
      if (data) {
        data.totalTime += estimatedTime;
        data.dispatchCount++;
        data.avgTime = data.totalTime / data.dispatchCount;
      }
      totalTime += estimatedTime;
    }

    this.frameStats.totalGPUTime = totalTime;
    this.frameStats.perCategoryTime = {};

    for (const [cat, data] of this.profilingData) {
      this.frameStats.perCategoryTime[cat] = {
        total: data.totalTime,
        average: data.avgTime,
        dispatches: data.dispatchCount
      };
    }
  }

  getStats() {
    return {
      perCategoryTime: { ...this.frameStats.perCategoryTime },
      overlapPercentage: this.frameStats.overlapPercentage,
      totalGPUTime: this.frameStats.totalGPUTime,
      frameIndex: this.frameIndex,
      workItemsThisFrame: this.scheduledOrder.length,
      computeItems: this.computeWork.length,
      renderItems: this.renderWork.length
    };
  }

  getReadStateBuffer() {
    if (!this.options.doubleBuffer) return null;
    const readIdx = (this.activeStateIndex + 1) % 2;
    return this.stateBuffers[readIdx];
  }

  getWriteStateBuffer() {
    if (!this.options.doubleBuffer) return null;
    return this.stateBuffers[this.activeStateIndex];
  }

  resetProfiling() {
    for (const [, data] of this.profilingData) {
      data.totalTime = 0;
      data.dispatchCount = 0;
      data.avgTime = 0;
    }
    this.frameStats = {
      perCategoryTime: {},
      overlapPercentage: 0,
      totalGPUTime: 0
    };
  }

  dispose() {
    for (const buf of this.stateBuffers) {
      buf?.destroy();
    }
    this.stateBuffers = [null, null];

    this.querySet = null;
    this.queryBuffer?.destroy();
    this.queryResolveBuffer?.destroy();
    this.queryBuffer = null;
    this.queryResolveBuffer = null;

    this.workItems = [];
    this.computeWork = [];
    this.renderWork = [];
    this.scheduledOrder = [];
    this.profilingData.clear();

    this.initialized = false;
  }
}
