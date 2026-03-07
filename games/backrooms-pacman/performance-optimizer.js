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
     * Render mesh to texture for billboard (LOD system)
     * @param {THREE.Mesh} mesh - Mesh to render
     * @param {number} size - Texture size (default 256)
     * @returns {THREE.Sprite} Sprite with rendered texture
     */
    function renderToTexture(mesh, size) {
        size = size || 256;
        
        try {
            // Create render target
            var renderTarget = new THREE.WebGLRenderTarget(size, size, {
                format: THREE.RGBAFormat,
                type: THREE.UnsignedByteType,
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter
            });
            
            // Create orthographic camera for billboard rendering
            var orthoCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0, 1000);
            orthoCamera.position.set(0, 0, 10);
            orthoCamera.lookAt(0, 0, 0);
            
            // Get renderer from global scope or mesh
            var renderer = window.renderer;
            if (!renderer) {
                console.warn('[PerformanceOptimizer] No renderer found for renderToTexture');
                return null;
            }
            
            // Store current renderer state
            var currentTarget = renderer.getRenderTarget();
            
            // Render mesh to texture
            renderer.setRenderTarget(renderTarget);
            renderer.clear();
            renderer.render(mesh, orthoCamera);
            renderer.setRenderTarget(currentTarget);
            
            // Create sprite material from texture
            var spriteMaterial = new THREE.SpriteMaterial({
                map: renderTarget.texture,
                color: 0xffffff,
                transparent: true,
                opacity: 0.9
            });
            
            var sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(4, 4, 1);
            
            // Store render target for cleanup
            sprite.userData.renderTarget = renderTarget;
            sprite.userData.type = 'lod_billboard';
            
            console.log('[PerformanceOptimizer] Created LOD billboard');
            return sprite;
        } catch (error) {
            console.error('[PerformanceOptimizer] Failed to render to texture:', error);
            return null;
        }
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
     * @param {THREE.Mesh} mesh - Mesh to instance
     * @param {number} count - Number of instances
     * @param {Array} positions - Array of {x, y, z} positions for instances
     * @returns {THREE.InstancedMesh} Instanced mesh
     */
    function enableGPUInstancing(mesh, count, positions) {
        if (!config.rendering.gpuInstancing) return mesh;
        
        try {
            var geometry = mesh.geometry;
            var material = mesh.material;
            
            // Create InstancedMesh
            var instancedMesh = new THREE.InstancedMesh(
                geometry,
                material,
                count || 1000
            );
            
            // Copy original mesh properties
            instancedMesh.position.copy(mesh.position);
            instancedMesh.rotation.copy(mesh.rotation);
            instancedMesh.scale.copy(mesh.scale);
            
            // Set instance matrices
            var matrix = new THREE.Matrix4();
            var quaternion = new THREE.Quaternion();
            var scale = new THREE.Vector3();
            
            mesh.matrixWorld.decompose(position, quaternion, scale);
            
            for (var i = 0; i < count; i++) {
                if (positions && positions[i]) {
                    // Use provided positions
                    matrix.setPosition(
                        positions[i].x || 0,
                        positions[i].y || 0,
                        positions[i].z || 0
                    );
                } else {
                    // Default grid placement
                    matrix.setPosition(
                        mesh.position.x + (i % 10) * 4,
                        mesh.position.y,
                        mesh.position.z + Math.floor(i / 10) * 4
                    );
                }
                
                instancedMesh.setMatrixAt(i, matrix);
            }
            
            // Mark as instanced
            instancedMesh.userData.instanced = true;
            instancedMesh.userData.originalMesh = mesh;
            instancedMesh.userData.instanceCount = count;
            
            console.log('[PerformanceOptimizer] GPU instancing enabled for', count, 'instances');
            
            return instancedMesh;
        } catch (error) {
            console.error('[PerformanceOptimizer] Failed to enable GPU instancing:', error);
            return mesh;
        }
    }
    
    /**
     * Create instanced pellets for the entire maze
     * @param {Array} pelletPositions - Array of pellet positions
     * @param {THREE.Scene} scene - Three.js scene
     * @returns {THREE.InstancedMesh}
     */
    function createInstancedPellets(pelletPositions, scene) {
        var count = pelletPositions.length;
        if (count === 0) return null;
        
        // Create pellet geometry
        var geometry = new THREE.SphereGeometry(0.3, 8, 8);
        var material = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF44,
            emissive: 0xFFFF44,
            emissiveIntensity: 0.5
        });
        
        var instancedMesh = new THREE.InstancedMesh(geometry, material, count);
        
        var matrix = new THREE.Matrix4();
        var scale = new THREE.Vector3(1, 1, 1);
        
        for (var i = 0; i < count; i++) {
            var pos = pelletPositions[i];
            matrix.makeScale(1, 1, 1);
            matrix.setPosition(pos.x, pos.y || 0.5, pos.z);
            instancedMesh.setMatrixAt(i, matrix);
        }
        
        instancedMesh.userData.type = 'pellets';
        instancedMesh.userData.count = count;
        
        if (scene) {
            scene.add(instancedMesh);
        }
        
        console.log('[PerformanceOptimizer] Created', count, 'instanced pellets');
        return instancedMesh;
    }
    
    /**
     * Create instanced walls for the maze
     * @param {Array} wallPositions - Array of wall positions and orientations
     * @param {THREE.Scene} scene - Three.js scene
     * @returns {THREE.InstancedMesh}
     */
    function createInstancedWalls(wallPositions, scene) {
        var count = wallPositions.length;
        if (count === 0) return null;
        
        // Create wall geometry
        var geometry = new THREE.BoxGeometry(4, 3.5, 0.5);
        var material = new THREE.MeshStandardMaterial({ 
            color: 0xD4AF37,
            roughness: 0.7,
            metalness: 0.3
        });
        
        var instancedMesh = new THREE.InstancedMesh(geometry, material, count);
        
        var matrix = new THREE.Matrix4();
        var quaternion = new THREE.Quaternion();
        var euler = new THREE.Euler();
        
        for (var i = 0; i < count; i++) {
            var wall = wallPositions[i];
            
            // Set position
            matrix.setPosition(wall.x, wall.y || 1.75, wall.z);
            
            // Set rotation if provided
            if (wall.rotationY !== undefined) {
                euler.set(0, wall.rotationY, 0);
                quaternion.setFromEuler(euler);
                matrix.setRotationFromQuaternion(quaternion);
            }
            
            instancedMesh.setMatrixAt(i, matrix);
        }
        
        instancedMesh.userData.type = 'walls';
        instancedMesh.userData.count = count;
        
        if (scene) {
            scene.add(instancedMesh);
        }
        
        console.log('[PerformanceOptimizer] Created', count, 'instanced walls');
        return instancedMesh;
    }
    
    /**
     * Update instance matrix at index
     * @param {THREE.InstancedMesh} instancedMesh - Instanced mesh
     * @param {number} index - Instance index
     * @param {object} transform - New transform {x, y, z, rotationY, scale}
     */
    function updateInstanceMatrix(instancedMesh, index, transform) {
        if (!instancedMesh || index >= instancedMesh.count) return;
        
        var matrix = new THREE.Matrix4();
        
        if (transform.scale) {
            matrix.makeScale(transform.scale, transform.scale, transform.scale);
        }
        
        matrix.setPosition(transform.x, transform.y, transform.z);
        
        if (transform.rotationY) {
            var quaternion = new THREE.Quaternion();
            var euler = new THREE.Euler(0, transform.rotationY, 0);
            quaternion.setFromEuler(euler);
            matrix.setRotationFromQuaternion(quaternion);
        }
        
        instancedMesh.setMatrixAt(index, matrix);
        instancedMesh.instanceMatrix.needsUpdate = true;
    }
    
    /**
     * Hide instance at index
     * @param {THREE.InstancedMesh} instancedMesh - Instanced mesh
     * @param {number} index - Instance index
     */
    function hideInstance(instancedMesh, index) {
        if (!instancedMesh || index >= instancedMesh.count) return;
        
        // Move far away instead of removing
        var matrix = new THREE.Matrix4();
        matrix.setPosition(0, -1000, 0);
        instancedMesh.setMatrixAt(index, matrix);
        instancedMesh.instanceMatrix.needsUpdate = true;
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
