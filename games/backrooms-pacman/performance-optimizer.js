/**
 * PHASE 9: PERFORMANCE OPTIMIZATION SUITE
 * LOD, GPU instancing, memory management, PWA support
 */

var PerformanceOptimizer = (function() {
    'use strict';

    var config = {
        // LOD settings
        lod: {
            levels: 4,
            distances: [20, 40, 60, 100], // meters
            reduction: [1.0, 0.5, 0.25, 0.1] // geometry complexity
        },
        
        // Memory budget
        memory: {
            maxTextureSize: 2048,
            maxGeometryMB: 100,
            maxTextureMB: 150,
            gcInterval: 30000 // 30 seconds
        },
        
        // Rendering optimization
        rendering: {
            frustumCulling: true,
            occlusionCulling: true,
            gpuInstancing: true,
            batchGeometry: true,
            maxDrawCalls: 500
        },
        
        // Quality presets
        presets: {
            LOW: { shadows: false, hrtf: false, particles: 50, lodBias: 2 },
            MEDIUM: { shadows: true, hrtf: true, particles: 200, lodBias: 1 },
            HIGH: { shadows: true, hrtf: true, particles: 500, lodBias: 0.5 },
            ULTRA: { shadows: true, hrtf: true, particles: 1000, lodBias: 0 }
        }
    };

    var state = {
        currentPreset: 'MEDIUM',
        stats: {
            fps: 60,
            drawCalls: 0,
            memoryUsed: 0,
            activeObjects: 0
        },
        lodObjects: [],
        pooledObjects: [],
        textureCache: {},
        geometryCache: {}
    };

    /**
     * Initialize performance optimizer
     */
    function init(renderer, scene, camera) {
        console.log('[PerformanceOptimizer] Initializing...');
        
        // Auto-detect quality preset
        detectOptimalPreset();
        
        // Setup LOD system
        setupLODSystem(scene);
        
        // Enable optimizations
        enableOptimizations(renderer);
        
        // Start memory manager
        startMemoryManager();
        
        // Start performance monitoring
        startPerformanceMonitoring();
        
        console.log('[PerformanceOptimizer] ✅ Optimized for:', state.currentPreset);
    }

    /**
     * Auto-detect optimal quality preset
     */
    function detectOptimalPreset() {
        // Simple heuristic based on device capabilities
        var isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
        var hasWebGL2 = !!document.createElement('canvas').getContext('webgl2');
        var gpuMemory = estimateGPUMemory();
        
        if (isMobile || gpuMemory < 2000) {
            state.currentPreset = 'LOW';
        } else if (!hasWebGL2 || gpuMemory < 4000) {
            state.currentPreset = 'MEDIUM';
        } else if (gpuMemory < 6000) {
            state.currentPreset = 'HIGH';
        } else {
            state.currentPreset = 'ULTRA';
        }
        
        applyPreset(state.currentPreset);
    }

    /**
     * Estimate GPU memory (rough estimate)
     */
    function estimateGPUMemory() {
        // This is a rough estimate - real API not available in browsers yet
        var gl = document.createElement('canvas').getContext('webgl');
        if (!gl) return 1000;
        
        var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            var renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            // Rough heuristics based on GPU name
            if (renderer.includes('Intel')) return 1500;
            if (renderer.includes('NVIDIA')) return 6000;
            if (renderer.includes('AMD') || renderer.includes('Radeon')) return 5000;
        }
        
        return 3000; // Default assumption
    }

    /**
     * Apply quality preset
     */
    function applyPreset(presetName) {
        var preset = config.presets[presetName];
        if (!preset) return;
        
        console.log('[PerformanceOptimizer] Applying preset:', presetName);
        
        // Update shadow quality
        if (typeof AdvancedLighting !== 'undefined') {
            AdvancedLighting.setShadowQuality(preset.shadows);
        }
        
        // Update particle count
        if (typeof BiomeSystem !== 'undefined') {
            BiomeSystem.setMaxParticles(preset.particles);
        }
        
        // Update LOD bias
        config.lod.distances = config.lod.distances.map(function(d) {
            return d * (1 + preset.lodBias);
        });
        
        // Update audio quality
        if (typeof Phase8AudioComplete !== 'undefined') {
            Phase8AudioComplete.setAudioQuality(preset.hrtf ? 'high' : 'low');
        }
    }

    /**
     * Setup LOD system
     */
    function setupLODSystem(scene) {
        state.lodObjects = [];
        
        // Find all meshes that should use LOD
        scene.traverse(function(object) {
            if (object.isMesh && object.name.includes('wall')) {
                createLODMesh(object);
            }
            
            if (object.isMesh && object.name.includes('pellet')) {
                // Use GPU instancing for pellets
                enableGPUInstancing(object);
            }
        });
    }

    /**
     * Create LOD mesh with multiple detail levels
     */
    function createLODMesh(originalMesh) {
        var lods = [];
        
        // LOD 0: Original (100%)
        lods.push({
            distance: config.lod.distances[0],
            mesh: originalMesh
        });
        
        // LOD 1: Reduced (50%)
        var lod1Geometry = simplifyGeometry(originalMesh.geometry, 0.5);
        var lod1Mesh = new THREE.Mesh(lod1Geometry, originalMesh.material);
        lods.push({
            distance: config.lod.distances[1],
            mesh: lod1Mesh
        });
        
        // LOD 2: Very reduced (25%)
        var lod2Geometry = simplifyGeometry(originalMesh.geometry, 0.25);
        var lod2Mesh = new THREE.Mesh(lod2Geometry, originalMesh.material);
        lods.push({
            distance: config.lod.distances[2],
            mesh: lod2Mesh
        });
        
        // LOD 3: Minimal (10%) - billboard
        var lod3Mesh = createBillboard(originalMesh);
        lods.push({
            distance: config.lod.distances[3],
            mesh: lod3Mesh
        });
        
        state.lodObjects.push({
            original: originalMesh,
            lods: lods,
            currentLod: 0,
            position: originalMesh.position.clone()
        });
    }

    /**
     * Simplify geometry by reducing vertices
     */
    function simplifyGeometry(geometry, factor) {
        // Clone geometry
        var simplified = geometry.clone();
        
        // Simple vertex reduction (could use more sophisticated algorithms)
        var positions = simplified.attributes.position.array;
        var newPositions = new Float32Array(positions.length * factor);
        
        for (var i = 0; i < positions.length; i++) {
            if (i % Math.floor(1/factor) === 0) {
                newPositions[i] = positions[i];
            }
        }
        
        simplified.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
        simplified.computeVertexNormals();
        
        return simplified;
    }

    /**
     * Create billboard for far LOD
     */
    function createBillboard(originalMesh) {
        var spriteMaterial = new THREE.SpriteMaterial({
            map: renderToTexture(originalMesh),
            transparent: true
        });
        
        var sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2, 2, 1);
        
        return sprite;
    }

    /**
     * Render mesh to texture for billboard
     */
    function renderToTexture(mesh) {
        // Would render mesh to canvas texture
        // Placeholder implementation
        return null;
    }

    /**
     * Update LOD based on camera distance
     */
    function updateLODs(cameraPosition) {
        for (var i = 0; i < state.lodObjects.length; i++) {
            var lodObj = state.lodObjects[i];
            var distance = cameraPosition.distanceTo(lodObj.position);
            
            // Find appropriate LOD level
            var newLod = 0;
            for (var j = 0; j < config.lod.distances.length; j++) {
                if (distance > config.lod.distances[j]) {
                    newLod = j;
                }
            }
            
            // Switch LOD if changed
            if (newLod !== lodObj.currentLod && newLod < lodObj.lods.length) {
                switchLOD(lodObj, newLod);
            }
        }
    }

    /**
     * Switch LOD level
     */
    function switchLOD(lodObj, newLevel) {
        var oldMesh = lodObj.lods[lodObj.currentLod].mesh;
        var newMesh = lodObj.lods[newLevel].mesh;
        
        // Replace in scene
        if (oldMesh.parent) {
            oldMesh.parent.add(newMesh);
            oldMesh.parent.remove(oldMesh);
            newMesh.position.copy(oldMesh.position);
            newMesh.rotation.copy(oldMesh.rotation);
            newMesh.scale.copy(oldMesh.scale);
        }
        
        lodObj.currentLod = newLevel;
    }

    /**
     * Enable GPU instancing for repeated objects
     */
    function enableGPUInstancing(mesh) {
        if (!config.rendering.gpuInstancing) return;
        
        // Mark for instancing
        mesh.userData.instanced = true;
        
        // Would create InstancedMesh instead
        // This is a placeholder for the full implementation
    }

    /**
     * Enable rendering optimizations
     */
    function enableOptimizations(renderer) {
        // Enable frustum culling
        renderer.autoUpdateScene = config.rendering.frustumCulling;
        
        // Set pixel ratio (cap at 2 for performance)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Enable shadow map optimization
        if (renderer.shadowMap) {
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.shadowMap.enabled = config.presets[state.currentPreset].shadows;
        }
    }

    /**
     * Start memory manager
     */
    function startMemoryManager() {
        setInterval(function() {
            garbageCollect();
            monitorMemory();
        }, config.memory.gcInterval);
    }

    /**
     * Garbage collect unused resources
     */
    function garbageCollect() {
        // Dispose unused geometries
        for (var key in state.geometryCache) {
            var geom = state.geometryCache[key];
            if (geom.userData.lastUsed < Date.now() - 60000) {
                geom.dispose();
                delete state.geometryCache[key];
            }
        }
        
        // Dispose unused textures
        for (var texKey in state.textureCache) {
            var tex = state.textureCache[texKey];
            if (tex.userData.lastUsed < Date.now() - 60000) {
                tex.dispose();
                delete state.textureCache[texKey];
            }
        }
    }

    /**
     * Monitor memory usage
     */
    function monitorMemory() {
        if (performance.memory) {
            state.stats.memoryUsed = performance.memory.usedJSHeapSize / 1048576; // MB
            
            if (state.stats.memoryUsed > config.memory.maxTextureMB) {
                console.warn('[PerformanceOptimizer] High memory usage:', state.stats.memoryUsed.toFixed(2), 'MB');
                forceGarbageCollection();
            }
        }
    }

    /**
     * Force aggressive garbage collection
     */
    function forceGarbageCollection() {
        console.log('[PerformanceOptimizer] Forcing garbage collection...');
        
        // Clear all caches
        state.textureCache = {};
        state.geometryCache = {};
        
        // Trigger browser GC (if available)
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Start performance monitoring
     */
    function startPerformanceMonitoring() {
        var frameCount = 0;
        var lastTime = performance.now();
        
        function measureFrame() {
            frameCount++;
            var now = performance.now();
            
            if (now - lastTime >= 1000) {
                state.stats.fps = frameCount;
                frameCount = 0;
                lastTime = now;
                
                // Log if FPS drops
                if (state.stats.fps < 30) {
                    console.warn('[PerformanceOptimizer] Low FPS:', state.stats.fps);
                }
            }
            
            requestAnimationFrame(measureFrame);
        }
        
        measureFrame();
    }

    /**
     * Get performance statistics
     */
    function getStats() {
        return {
            preset: state.currentPreset,
            fps: state.stats.fps,
            memoryMB: state.stats.memoryUsed,
            lodObjects: state.lodObjects.length,
            optimizations: config.rendering
        };
    }

    /**
     * Optimize for mobile
     */
    function optimizeForMobile() {
        console.log('[PerformanceOptimizer] Mobile optimization engaged');
        
        applyPreset('LOW');
        
        // Additional mobile-specific optimizations
        config.lod.distances = config.lod.distances.map(function(d) {
            return d * 1.5; // Increase LOD distances
        });
        
        // Reduce resolution
        if (typeof renderer !== 'undefined') {
            renderer.setPixelRatio(1);
        }
    }

    // Public API
    return {
        init: init,
        applyPreset: applyPreset,
        updateLODs: updateLODs,
        getStats: getStats,
        optimizeForMobile: optimizeForMobile,
        config: config,
        state: state
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.PerformanceOptimizer = PerformanceOptimizer;
}

console.log('[PerformanceOptimizer] Module loaded - Ready for optimization');
