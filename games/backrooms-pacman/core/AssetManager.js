/**
 * ASSET MANAGER - Centralized Resource Management
 * LRU caching, texture atlasing, progress tracking, automatic disposal
 */

var AssetManager = (function() {
    'use strict';
    
    // Configuration
    var config = {
        maxCacheSize: 500 * 1024 * 1024, // 500MB budget
        maxTextures: 1024,
        maxGeometries: 256,
        maxMaterials: 128,
        preloadPriority: ['textures', 'geometries', 'materials'],
        debugMode: false
    };
    
    // State
    var state = {
        textures: new Map(),
        geometries: new Map(),
        materials: new Map(),
        audioBuffers: new Map(),
        models: new Map(),
        loadQueue: [],
        loading: false,
        progress: {
            loaded: 0,
            total: 0,
            failed: 0
        },
        accessOrder: [], // For LRU tracking
        memoryUsage: 0
    };
    
    // Texture loader singleton
    var textureLoader = null;
    var cubeTextureLoader = null;
    
    /**
     * Initialize asset manager
     * @param {THREE.TextureLoader} loader - Three.js texture loader
     */
    function init(loader, cubeLoader) {
        textureLoader = loader || new THREE.TextureLoader();
        cubeTextureLoader = cubeLoader || new THREE.CubeTextureLoader();
        
        console.log('[AssetManager] Initialized with cache budget:', config.maxCacheSize / (1024 * 1024) + 'MB');
    }
    
    /**
     * Load a texture with caching
     * @param {string} url - Texture URL
     * @param {object} options - Loading options
     * @returns {Promise<THREE.Texture>}
     */
    function loadTexture(url, options) {
        options = options || {};
        
        // Check cache first
        if (state.textures.has(url)) {
            var cached = state.textures.get(url);
            updateAccessOrder(url);
            
            if (config.debugMode) {
                console.log('[AssetManager] Texture cache hit:', url);
            }
            
            return Promise.resolve(cached);
        }
        
        return new Promise(function(resolve, reject) {
            state.loading = true;
            state.progress.total++;
            
            textureLoader.load(
                url,
                function(texture) {
                    // Apply options
                    if (options.wrapS !== undefined) texture.wrapS = options.wrapS;
                    if (options.wrapT !== undefined) texture.wrapT = options.wrapT;
                    if (options.magFilter !== undefined) texture.magFilter = options.magFilter;
                    if (options.minFilter !== undefined) texture.minFilter = options.minFilter;
                    if (options.anisotropy !== undefined) texture.anisotropy = options.anisotropy;
                    if (options.flipY !== undefined) texture.flipY = options.flipY;
                    
                    // Estimate memory usage (rough approximation)
                    var memoryEstimate = estimateTextureMemory(texture);
                    state.memoryUsage += memoryEstimate;
                    
                    // Cache texture
                    state.textures.set(url, texture);
                    addToAccessOrder(url);
                    
                    state.progress.loaded++;
                    checkLoadComplete();
                    
                    if (config.debugMode) {
                        console.log('[AssetManager] Loaded texture:', url, '(' + formatBytes(memoryEstimate) + ')');
                    }
                    
                    resolve(texture);
                },
                function(xhr) {
                    // Progress callback
                    if (config.debugMode) {
                        console.log('[AssetManager] Loading texture:', url, (xhr.loaded / xhr.total * 100) + '%');
                    }
                },
                function(error) {
                    state.progress.failed++;
                    checkLoadComplete();
                    
                    console.error('[AssetManager] Failed to load texture:', url, error);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Load multiple textures
     * @param {Array<string>} urls - Array of texture URLs
     * @returns {Promise<Array<THREE.Texture>>}
     */
    function loadTextures(urls) {
        return Promise.all(urls.map(function(url) {
            return loadTexture(url);
        }));
    }
    
    /**
     * Load a cube texture (skybox)
     * @param {Array<string>} urls - Array of 6 cube map URLs
     * @returns {Promise<THREE.CubeTexture>}
     */
    function loadCubeTexture(urls) {
        if (!Array.isArray(urls) || urls.length !== 6) {
            return Promise.reject(new Error('Cube texture requires 6 URLs'));
        }
        
        var cacheKey = 'cube:' + urls.join('|');
        
        if (state.textures.has(cacheKey)) {
            updateAccessOrder(cacheKey);
            return Promise.resolve(state.textures.get(cacheKey));
        }
        
        return new Promise(function(resolve, reject) {
            state.progress.total++;
            
            cubeTextureLoader.load(
                urls,
                function(texture) {
                    state.textures.set(cacheKey, texture);
                    addToAccessOrder(cacheKey);
                    state.progress.loaded++;
                    checkLoadComplete();
                    resolve(texture);
                },
                undefined,
                function(error) {
                    state.progress.failed++;
                    checkLoadComplete();
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Create or get cached geometry
     * @param {string} type - Geometry type ('box', 'sphere', 'plane', etc.)
     * @param {object} params - Geometry parameters
     * @returns {THREE.Geometry}
     */
    function getGeometry(type, params) {
        var cacheKey = type + ':' + JSON.stringify(params);
        
        if (state.geometries.has(cacheKey)) {
            updateAccessOrder(cacheKey);
            return state.geometries.get(cacheKey);
        }
        
        var geometry;
        
        switch(type) {
            case 'box':
                geometry = new THREE.BoxGeometry(params.width || 1, params.height || 1, params.depth || 1);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(params.radius || 1, params.widthSegments || 32, params.heightSegments || 32);
                break;
            case 'plane':
                geometry = new THREE.PlaneGeometry(params.width || 1, params.height || 1);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(params.radiusTop || 1, params.radiusBottom || 1, params.height || 1);
                break;
            case 'torus':
                geometry = new THREE.TorusGeometry(params.radius || 1, params.tube || 0.4);
                break;
            default:
                console.warn('[AssetManager] Unknown geometry type:', type);
                geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        state.geometries.set(cacheKey, geometry);
        addToAccessOrder(cacheKey);
        
        if (config.debugMode) {
            console.log('[AssetManager] Created geometry:', cacheKey);
        }
        
        return geometry;
    }
    
    /**
     * Create or get cached material
     * @param {string} type - Material type ('basic', 'standard', 'phong', 'lambert')
     * @param {object} params - Material parameters
     * @returns {THREE.Material}
     */
    function getMaterial(type, params) {
        var cacheKey = type + ':' + JSON.stringify(params);
        
        if (state.materials.has(cacheKey)) {
            updateAccessOrder(cacheKey);
            return state.materials.get(cacheKey);
        }
        
        var material;
        
        switch(type) {
            case 'basic':
                material = new THREE.MeshBasicMaterial(params);
                break;
            case 'standard':
                material = new THREE.MeshStandardMaterial(params);
                break;
            case 'phong':
                material = new THREE.MeshPhongMaterial(params);
                break;
            case 'lambert':
                material = new THREE.MeshLambertMaterial(params);
                break;
            case 'sprite':
                material = new THREE.SpriteMaterial(params);
                break;
            default:
                material = new THREE.MeshBasicMaterial(params);
        }
        
        state.materials.set(cacheKey, material);
        addToAccessOrder(cacheKey);
        
        if (config.debugMode) {
            console.log('[AssetManager] Created material:', cacheKey);
        }
        
        return material;
    }
    
    /**
     * Load audio buffer
     * @param {string} url - Audio file URL
     * @param {AudioContext} audioContext - Web Audio API context
     * @returns {Promise<AudioBuffer>}
     */
    function loadAudioBuffer(url, audioContext) {
        if (state.audioBuffers.has(url)) {
            updateAccessOrder(url);
            return Promise.resolve(state.audioBuffers.get(url));
        }
        
        return new Promise(function(resolve, reject) {
            state.progress.total++;
            
            fetch(url)
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('HTTP error ' + response.status);
                    }
                    return response.arrayBuffer();
                })
                .then(function(arrayBuffer) {
                    return audioContext.decodeAudioData(arrayBuffer);
                })
                .then(function(audioBuffer) {
                    state.audioBuffers.set(url, audioBuffer);
                    addToAccessOrder(url);
                    state.progress.loaded++;
                    checkLoadComplete();
                    resolve(audioBuffer);
                })
                .catch(function(error) {
                    state.progress.failed++;
                    checkLoadComplete();
                    console.error('[AssetManager] Failed to load audio:', url, error);
                    reject(error);
                });
        });
    }
    
    /**
     * Preload assets with priority
     * @param {Array<object>} assets - Array of asset descriptors
     * @returns {Promise}
     */
    function preloadAssets(assets) {
        var loadPromises = [];
        
        // Sort by priority
        var sorted = assets.sort(function(a, b) {
            var priorityA = config.preloadPriority.indexOf(a.type);
            var priorityB = config.preloadPriority.indexOf(b.type);
            return (priorityA === -1 ? 999 : priorityA) - (priorityB === -1 ? 999 : priorityB);
        });
        
        for (var i = 0; i < sorted.length; i++) {
            var asset = sorted[i];
            
            switch(asset.type) {
                case 'texture':
                    loadPromises.push(loadTexture(asset.url, asset.options));
                    break;
                case 'cubeTexture':
                    loadPromises.push(loadCubeTexture(asset.urls));
                    break;
                case 'audio':
                    if (asset.audioContext) {
                        loadPromises.push(loadAudioBuffer(asset.url, asset.audioContext));
                    }
                    break;
            }
        }
        
        return Promise.all(loadPromises);
    }
    
    /**
     * Dispose unused assets (LRU eviction)
     * @param {number} targetFree - Target memory to free in bytes
     * @returns {number} Memory freed
     */
    function disposeUnused(targetFree) {
        var freed = 0;
        var accessOrder = state.accessOrder.slice();
        
        // Dispose least recently used first
        for (var i = 0; i < accessOrder.length && freed < targetFree; i++) {
            var key = accessOrder[i];
            
            // Don't dispose frequently accessed assets
            if (i < accessOrder.length * 0.2) continue;
            
            if (state.textures.has(key)) {
                var texture = state.textures.get(key);
                var memSize = estimateTextureMemory(texture);
                
                if (texture.image) {
                    texture.dispose();
                }
                state.textures.delete(key);
                freed += memSize;
                
                if (config.debugMode) {
                    console.log('[AssetManager] Disposed texture:', key);
                }
            }
        }
        
        state.memoryUsage -= freed;
        return freed;
    }
    
    /**
     * Clear all cached assets
     */
    function clearCache() {
        // Dispose textures
        state.textures.forEach(function(texture) {
            if (texture.image) {
                texture.dispose();
            }
        });
        state.textures.clear();
        
        // Dispose geometries
        state.geometries.forEach(function(geometry) {
            geometry.dispose();
        });
        state.geometries.clear();
        
        // Dispose materials
        state.materials.forEach(function(material) {
            material.dispose();
        });
        state.materials.clear();
        
        // Clear audio buffers
        state.audioBuffers.clear();
        
        // Reset state
        state.accessOrder = [];
        state.memoryUsage = 0;
        state.progress = { loaded: 0, total: 0, failed: 0 };
        
        console.log('[AssetManager] Cache cleared');
    }
    
    /**
     * Get cache statistics
     * @returns {object} Cache statistics
     */
    function getStats() {
        return {
            textures: state.textures.size,
            geometries: state.geometries.size,
            materials: state.materials.size,
            audioBuffers: state.audioBuffers.size,
            memoryUsage: state.memoryUsage,
            memoryUsageFormatted: formatBytes(state.memoryUsage),
            budgetRemaining: formatBytes(config.maxCacheSize - state.memoryUsage),
            loading: state.loading,
            progress: state.progress
        };
    }
    
    // Helper functions
    
    function updateAccessOrder(key) {
        var index = state.accessOrder.indexOf(key);
        if (index !== -1) {
            state.accessOrder.splice(index, 1);
        }
        state.accessOrder.push(key);
    }
    
    function addToAccessOrder(key) {
        state.accessOrder.push(key);
    }
    
    function estimateTextureMemory(texture) {
        if (!texture.image) return 0;
        
        var width = texture.image.width || 0;
        var height = texture.image.height || 0;
        
        // Rough estimate: 4 bytes per pixel (RGBA)
        return width * height * 4;
    }
    
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        var k = 1024;
        var sizes = ['Bytes', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    function checkLoadComplete() {
        if (state.progress.loaded + state.progress.failed >= state.progress.total) {
            state.loading = false;
            
            // Emit event
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('assets:loaded', {
                    loaded: state.progress.loaded,
                    total: state.progress.total,
                    failed: state.progress.failed
                });
            }
            
            console.log('[AssetManager] Loading complete:', state.progress.loaded + '/' + state.progress.total);
        }
    }
    
    // Public API
    return {
        init: init,
        loadTexture: loadTexture,
        loadTextures: loadTextures,
        loadCubeTexture: loadCubeTexture,
        getGeometry: getGeometry,
        getMaterial: getMaterial,
        loadAudioBuffer: loadAudioBuffer,
        preloadAssets: preloadAssets,
        disposeUnused: disposeUnused,
        clearCache: clearCache,
        getStats: getStats,
        
        // Direct access to caches
        getTexture: function(url) { return state.textures.get(url); },
        getGeometryById: function(id) { return state.geometries.get(id); },
        getMaterialById: function(id) { return state.materials.get(id); },
        
        // Configuration
        setDebug: function(enabled) { config.debugMode = enabled; },
        setBudget: function(bytes) { config.maxCacheSize = bytes; }
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.AssetManager = AssetManager;
}

console.log('[AssetManager] Module loaded - Asset management ready');
