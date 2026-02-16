/**
 * ============================================
 * SGAI Graphics Framework - Phase 6: GPU Instancing
 * ============================================
 * High-performance rendering with InstancedMesh.
 * 
 * Key Benefits:
 * - 10,000+ units in single draw call
 * - Per-instance color, position, rotation, scale
 * - Dynamic instance updates
 * - Texture atlas support
 */

(function(global) {
    'use strict';

    // ============================================
    // INSTANCED MESH MANAGER
    // ============================================

    /**
     * Manages multiple InstancedMesh objects for efficient rendering
     */
    class InstancedMeshManager {
        constructor(options = {}) {
            this.scene = options.scene || null;
            this.meshes = new Map();
            this.instanceData = new Map();
            this.maxInstances = options.maxInstances || 10000;
            
            // Matrices for instance transforms
            this._dummyMatrix = new THREE.Matrix4();
            this._dummyPosition = new THREE.Vector3();
            this._dummyQuaternion = new THREE.Quaternion();
            this._dummyScale = new THREE.Vector3(1, 1, 1);
            this._dummyEuler = new THREE.Euler();
        }

        /**
         * Create or get an instanced mesh
         */
        getInstancedMesh(name, geometry, material, initialCount = 0) {
            if (this.meshes.has(name)) {
                return this.meshes.get(name);
            }

            const mesh = new THREE.InstancedMesh(geometry, material, this.maxInstances);
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            mesh.count = initialCount;
            mesh.frustumCulled = false; // Often needed for large scenes

            if (this.scene) {
                this.scene.add(mesh);
            }

            // Instance data storage
            this.instanceData.set(name, {
                positions: new Float32Array(this.maxInstances * 3),
                rotations: new Float32Array(this.maxInstances * 4),
                scales: new Float32Array(this.maxInstances * 3),
                colors: new Float32Array(this.maxInstances * 3),
                activeCount: initialCount,
                dirty: new Set()
            });

            this.meshes.set(name, mesh);
            console.log(`[InstancedMesh] Created: ${name} (max: ${this.maxInstances})`);

            return mesh;
        }

        /**
         * Set instance transform
         */
        setInstance(name, index, options = {}) {
            const mesh = this.meshes.get(name);
            const data = this.instanceData.get(name);
            
            if (!mesh || !data || index >= this.maxInstances) return;

            const { position, rotation, scale, color } = options;

            // Position
            if (position) {
                data.positions[index * 3] = position.x;
                data.positions[index * 3 + 1] = position.y;
                data.positions[index * 3 + 2] = position.z;
            }

            // Rotation (as Euler or Quaternion)
            if (rotation) {
                if (rotation.isEuler) {
                    this._dummyEuler.set(rotation.x, rotation.y, rotation.z);
                    this._dummyQuaternion.setFromEuler(this._dummyEuler);
                } else if (rotation.isQuaternion) {
                    this._dummyQuaternion.copy(rotation);
                } else {
                    this._dummyQuaternion.set(rotation.x || 0, rotation.y || 0, rotation.z || 0, rotation.w || 1);
                }
                
                data.rotations[index * 4] = this._dummyQuaternion.x;
                data.rotations[index * 4 + 1] = this._dummyQuaternion.y;
                data.rotations[index * 4 + 2] = this._dummyQuaternion.z;
                data.rotations[index * 4 + 3] = this._dummyQuaternion.w;
            }

            // Scale
            if (scale) {
                data.scales[index * 3] = scale.x || 1;
                data.scales[index * 3 + 1] = scale.y || 1;
                data.scales[index * 3 + 2] = scale.z || 1;
            }

            // Color
            if (color) {
                data.colors[index * 3] = color.r || 1;
                data.colors[index * 3 + 1] = color.g || 1;
                data.colors[index * 3 + 2] = color.b || 1;
            }

            // Mark as dirty
            data.dirty.add(index);
            data.activeCount = Math.max(data.activeCount, index + 1);
        }

        /**
         * Update instance matrix from stored data
         */
        updateInstance(name, index) {
            const mesh = this.meshes.get(name);
            const data = this.instanceData.get(name);
            
            if (!mesh || !data || index >= data.activeCount) return;

            const px = data.positions[index * 3];
            const py = data.positions[index * 3 + 1];
            const pz = data.positions[index * 3 + 2];

            const qx = data.rotations[index * 4];
            const qy = data.rotations[index * 4 + 1];
            const qz = data.rotations[index * 4 + 2];
            const qw = data.rotations[index * 4 + 3];

            const sx = data.scales[index * 3];
            const sy = data.scales[index * 3 + 1];
            const sz = data.scales[index * 3 + 2];

            this._dummyPosition.set(px, py, pz);
            this._dummyQuaternion.set(qx, qy, qz, qw);
            this._dummyScale.set(sx, sy, sz);

            this._dummyMatrix.compose(this._dummyPosition, this._dummyQuaternion, this._dummyScale);
            mesh.setMatrixAt(index, this._dummyMatrix);

            // Color
            if (mesh.instanceColor) {
                const r = data.colors[index * 3];
                const g = data.colors[index * 3 + 1];
                const b = data.colors[index * 3 + 2];
                mesh.setColorAt(index, new THREE.Color(r, g, b));
            }

            data.dirty.delete(index);
        }

        /**
         * Commit all changes to GPU
         */
        update(name) {
            const mesh = this.meshes.get(name);
            const data = this.instanceData.get(name);
            
            if (!mesh || !data) return;

            // Update all dirty instances
            for (const index of data.dirty) {
                this.updateInstance(name, index);
            }

            mesh.instanceMatrix.needsUpdate = true;
            if (mesh.instanceColor) {
                mesh.instanceColor.needsUpdate = true;
            }

            mesh.count = data.activeCount;
        }

        /**
         * Update all instanced meshes
         */
        updateAll() {
            for (const name of this.meshes.keys()) {
                this.update(name);
            }
        }

        /**
         * Set instance count (for hiding unused)
         */
        setCount(name, count) {
            const mesh = this.meshes.get(name);
            const data = this.instanceData.get(name);
            
            if (!mesh || !data) return;
            
            data.activeCount = count;
            mesh.count = count;
        }

        /**
         * Hide instance (move far away)
         */
        hideInstance(name, index) {
            this.setInstance(name, index, {
                position: { x: 0, y: -10000, z: 0 },
                scale: { x: 0, y: 0, z: 0 }
            });
            this.updateInstance(name, index);
        }

        /**
         * Get instance count
         */
        getCount(name) {
            const data = this.instanceData.get(name);
            return data ? data.activeCount : 0;
        }

        /**
         * Dispose
         */
        dispose() {
            for (const mesh of this.meshes.values()) {
                mesh.geometry.dispose();
                mesh.material.dispose();
                this.scene.remove(mesh);
            }
            this.meshes.clear();
            this.instanceData.clear();
        }

        /**
         * Get stats
         */
        getStats() {
            const stats = {};
            for (const [name, mesh] of this.meshes) {
                stats[name] = {
                    count: mesh.count,
                    maxCount: this.maxInstances,
                    drawCalls: 1 // InstancedMesh = 1 draw call
                };
            }
            return stats;
        }
    }

    // ============================================
    // ATLAS RENDERER (2D Optimization)
    // ============================================

    /**
     * Pre-render 2D tiles to texture atlas
     */
    class TextureAtlas {
        constructor(options = {}) {
            this.tileSize = options.tileSize || 32;
            this.atlasWidth = options.atlasWidth || 1024;
            this.atlasHeight = options.atlasHeight || 1024;
            this.padding = options.padding || 1;
            
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.atlasWidth;
            this.canvas.height = this.atlasHeight;
            this.ctx = this.canvas.getContext('2d');
            
            this.tiles = new Map();
            this.nextX = 0;
            this.nextY = 0;
            this.rowHeight = 0;
        }

        /**
         * Add tile to atlas
         */
        addTile(name, drawFn) {
            if (this.tiles.has(name)) {
                return this.tiles.get(name);
            }

            // Check if we need new row
            if (this.nextX + this.tileSize > this.atlasWidth) {
                this.nextX = 0;
                this.nextY += this.rowHeight + this.padding;
                this.rowHeight = 0;
            }

            // Check if atlas is full
            if (this.nextY + this.tileSize > this.atlasHeight) {
                console.warn('[TextureAtlas] Atlas full!');
                return null;
            }

            // Draw tile
            this.ctx.save();
            this.ctx.translate(this.nextX, this.nextY);
            drawFn(this.ctx, this.tileSize);
            this.ctx.restore();

            const tile = {
                x: this.nextX,
                y: this.nextY,
                u: this.nextX / this.atlasWidth,
                v: this.nextY / this.atlasHeight,
                u2: (this.nextX + this.tileSize) / this.atlasWidth,
                v2: (this.nextY + this.tileSize) / this.atlasHeight,
                width: this.tileSize,
                height: this.tileSize
            };

            this.tiles.set(name, tile);
            this.nextX += this.tileSize + this.padding;
            this.rowHeight = Math.max(this.rowHeight, this.tileSize);

            return tile;
        }

        /**
         * Create Three.js texture from atlas
         */
        createTexture() {
            const texture = new THREE.CanvasTexture(this.canvas);
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.needsUpdate = true;
            
            return texture;
        }

        /**
         * Get UV coordinates for tile
         */
        getUV(name) {
            return this.tiles.get(name);
        }
    }

    // ============================================
    // BATCH RENDERER (Canvas 2D)
    // ============================================

    /**
     * Batch render 2D sprites for Cursed Depths
     */
    class BatchRenderer2D {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d', { alpha: false });
            this.maxBatchSize = options.maxBatchSize || 10000;
            
            // Batch buffers
            this.positions = new Float32Array(this.maxBatchSize * 4); // x, y, w, h
            this.colors = new Uint32Array(this.maxBatchSize); // RGBA packed
            this.uvs = new Float32Array(this.maxBatchSize * 4); // u, v, u2, v2
            
            this.count = 0;
            this.currentTexture = null;
            
            // Stats
            this.stats = {
                batches: 0,
                sprites: 0,
                drawCalls: 0
            };
        }

        /**
         * Begin batch with texture
         */
        begin(texture) {
            if (this.currentTexture !== texture) {
                this.flush();
                this.currentTexture = texture;
            }
        }

        /**
         * Add sprite to batch
         */
        addSprite(x, y, width, height, uv, color = 0xFFFFFF) {
            if (this.count >= this.maxBatchSize) {
                this.flush();
            }

            const i = this.count;
            const i4 = i * 4;

            // Position (x, y, width, height)
            this.positions[i4] = x;
            this.positions[i4 + 1] = y;
            this.positions[i4 + 2] = width;
            this.positions[i4 + 3] = height;

            // UVs
            if (uv) {
                this.uvs[i4] = uv.u;
                this.uvs[i4 + 1] = uv.v;
                this.uvs[i4 + 2] = uv.u2;
                this.uvs[i4 + 3] = uv.v2;
            } else {
                // Full texture
                this.uvs[i4] = 0;
                this.uvs[i4 + 1] = 0;
                this.uvs[i4 + 2] = 1;
                this.uvs[i4 + 3] = 1;
            }

            // Color (RGBA8888)
            const r = (color >> 16) & 0xFF;
            const g = (color >> 8) & 0xFF;
            const b = color & 0xFF;
            this.colors[i] = (r << 24) | (g << 16) | (b << 8) | 0xFF;

            this.count++;
            this.stats.sprites++;
        }

        /**
         * Flush current batch
         */
        flush() {
            if (this.count === 0) return;

            this.stats.batches++;
            this.stats.drawCalls++;
            
            // Would use WebGL batch rendering here
            // For now, simulate with ImageData
            const imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
            
            // Fill with batched sprites (simplified)
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.count = 0;
        }

        /**
         * Reset
         */
        reset() {
            this.flush();
            this.currentTexture = null;
            this.stats = { batches: 0, sprites: 0, drawCalls: 0 };
        }

        /**
         * Get stats
         */
        getStats() {
            return { ...this.stats };
        }
    }

    // ============================================
    // RTS UNIT INSTANCER
    // ============================================

    /**
     * Specialized instancer for RTS units (Total Zombies)
     */
    class RTSUnitInstancer {
        constructor(scene) {
            this.scene = scene;
            this.manager = new InstancedMeshManager({ scene, maxInstances: 5000 });
            
            // Unit geometries (shared)
            this.geometries = {};
            
            // Material overrides per role
            this.materials = {};
        }

        /**
         * Initialize unit geometries
         */
        initGeometries() {
            // Body
            this.geometries.body = new THREE.BoxGeometry(0.45, 0.55, 0.3);
            // Head
            this.geometries.head = new THREE.SphereGeometry(0.18, 8, 8);
            // Weapon
            this.geometries.sword = new THREE.BoxGeometry(0.05, 0.9, 0.03);
            this.geometries.bow = new THREE.TorusGeometry(0.25, 0.02, 4, 10, Math.PI);
            // Shield
            this.geometries.shield = new THREE.BoxGeometry(0.06, 0.6, 0.4);
            
            // Materials
            this.materials.blue = {
                steel: new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.25, metalness: 0.85 }),
                chain: new THREE.MeshStandardMaterial({ color: 0x777788, roughness: 0.35, metalness: 0.7 }),
                leather: new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.75, metalness: 0.05 }),
                skin: new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.7 })
            };
            
            this.materials.red = {
                base: new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6, metalness: 0.1 }),
                skin: new THREE.MeshStandardMaterial({ color: 0x557755, roughness: 0.7 })
            };
        }

        /**
         * Create instanced mesh for unit type
         */
        createUnitMesh(name, team, role) {
            const mat = team === 'blue' ? this.materials.blue : this.materials.red;
            
            // Combine geometries for single-draw-call rendering
            const merged = this._mergeGeometries(role, mat);
            
            return this.manager.getInstancedMesh(
                name,
                merged.geometry,
                merged.material,
                100
            );
        }

        /**
         * Merge geometries based on role
         */
        _mergeGeometries(role, materials) {
            // Simplified - would use BufferGeometryUtils.mergeGeometries
            const geo = new THREE.BoxGeometry(0.5, 1.2, 0.5);
            const mat = new THREE.MeshStandardMaterial({ 
                color: materials.base?.color || 0x888888,
                roughness: 0.5,
                metalness: 0.3
            });
            
            return { geometry: geo, material: mat };
        }

        /**
         * Update unit instance
         */
        updateUnit(name, index, position, rotation, team) {
            const color = team === 'blue' 
                ? { r: 0.2, g: 0.4, b: 0.8 }  // Blue
                : { r: 0.8, g: 0.2, b: 0.2 }; // Red
            
            this.manager.setInstance(name, index, {
                position,
                rotation,
                scale: { x: 1, y: 1, z: 1 },
                color
            });
        }

        /**
         * Update all units
         */
        update() {
            this.manager.updateAll();
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    const SGAI = global.SGAI || {};
    SGAI.InstancedMeshManager = InstancedMeshManager;
    SGAI.TextureAtlas = TextureAtlas;
    SGAI.BatchRenderer2D = BatchRenderer2D;
    SGAI.RTSUnitInstancer = RTSUnitInstancer;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            InstancedMeshManager,
            TextureAtlas,
            BatchRenderer2D,
            RTSUnitInstancer
        };
    } else {
        global.SGAI = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);
