/**
 * Asset Pipeline - Phase 1: Asset Management
 * Universal asset loader with texture compression and optimization
 * Supports lazy loading, caching, and progressive loading
 */

export class AssetPipeline {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
    this.failed = new Map();
    this.progressCallbacks = [];
    this.maxCacheSize = 500 * 1024 * 1024; // 500MB
    this.currentCacheSize = 0;
  }

  /**
   * Load a texture with automatic compression
   * @param {string} url - Texture URL
   * @param {Object} options - Loading options
   * @returns {Promise<GPUTexture>} Loaded texture
   */
  async loadTexture(url, options = {}) {
    const cacheKey = `texture:${url}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Check if already loading
    if (this.loading.has(cacheKey)) {
      return this.loading.get(cacheKey);
    }

    const loadPromise = (async () => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const imageBitmap = await createImageBitmap(blob);

        // Compress if needed
        const compressed = options.compress !== false;
        
        // Create GPU texture
        const texture = this.createGPUTexture(imageBitmap, compressed);
        
        // Cache texture
        this.cacheTexture(cacheKey, texture, blob.size);
        
        this.notifyProgress(url, 1, 1);
        return texture;
      } catch (error) {
        this.failed.set(cacheKey, error);
        this.notifyProgress(url, 1, 1, true);
        throw error;
      } finally {
        this.loading.delete(cacheKey);
      }
    })();

    this.loading.set(cacheKey, loadPromise);
    return loadPromise;
  }

  /**
   * Create GPU texture from ImageBitmap
   */
  createGPUTexture(imageBitmap, compressed = false) {
    const device = window.gpuDevice; // Assuming global device
    if (!device) {
      throw new Error('GPU device not available');
    }

    const format = compressed ? 'bc3-rgba-unorm' : 'rgba8unorm';
    const texture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height],
      format: format,
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_DST |
             GPUTextureUsage.RENDER_ATTACHMENT
    });

    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: texture },
      [imageBitmap.width, imageBitmap.height]
    );

    return texture;
  }

  /**
   * Cache texture with size tracking
   */
  cacheTexture(key, texture, size) {
    // Evict if cache is full
    while (this.currentCacheSize + size > this.maxCacheSize && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      const oldTexture = this.cache.get(firstKey);
      if (oldTexture) {
        oldTexture.destroy();
      }
      this.cache.delete(firstKey);
      this.currentCacheSize -= this.getSize(firstKey);
    }

    this.cache.set(key, texture);
    this.currentCacheSize += size;
  }

  getSize(key) {
    // Simplified size tracking
    return 1024 * 1024; // Assume 1MB average
  }

  /**
   * Load multiple assets in parallel with progress tracking
   */
  async loadAssets(assetList, onProgress) {
    if (onProgress) {
      this.progressCallbacks.push(onProgress);
    }

    const total = assetList.length;
    let loaded = 0;
    const results = [];

    const promises = assetList.map(async (asset) => {
      try {
        let result;
        
        if (asset.type === 'texture') {
          result = await this.loadTexture(asset.url, asset.options);
        } else if (asset.type === 'model') {
          result = await this.loadModel(asset.url);
        } else if (asset.type === 'audio') {
          result = await this.loadAudio(asset.url);
        } else if (asset.type === 'shader') {
          result = await this.loadShader(asset.url);
        }

        loaded++;
        this.notifyProgress(asset.url, loaded, total);
        return { url: asset.url, data: result, success: true };
      } catch (error) {
        loaded++;
        this.notifyProgress(asset.url, loaded, total, true);
        return { url: asset.url, error, success: false };
      }
    });

    const allResults = await Promise.all(promises);
    
    if (onProgress) {
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== onProgress);
    }

    return allResults;
  }

  notifyProgress(url, loaded, total, failed = false) {
    const progress = {
      url,
      loaded,
      total,
      percent: (loaded / total) * 100,
      failed
    };

    this.progressCallbacks.forEach(cb => {
      try {
        cb(progress);
      } catch (e) {
        console.error('Progress callback error:', e);
      }
    });
  }

  /**
   * Load 3D model (GLTF/OBJ)
   */
  async loadModel(url) {
    const cacheKey = `model:${url}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const response = await fetch(url);
    const modelData = await response.json();
    
    this.cache.set(cacheKey, modelData);
    return modelData;
  }

  /**
   * Load audio file
   */
  async loadAudio(url) {
    const cacheKey = `audio:${url}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    
    this.cache.set(cacheKey, arrayBuffer);
    return arrayBuffer;
  }

  /**
   * Load shader code
   */
  async loadShader(url) {
    const cacheKey = `shader:${url}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const response = await fetch(url);
    const shaderCode = await response.text();
    
    this.cache.set(cacheKey, shaderCode);
    return shaderCode;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.forEach((value) => {
      if (value && typeof value.destroy === 'function') {
        value.destroy();
      }
    });
    this.cache.clear();
    this.currentCacheSize = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      items: this.cache.size,
      size: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      loading: this.loading.size,
      failed: this.failed.size
    };
  }
}

export default AssetPipeline;
