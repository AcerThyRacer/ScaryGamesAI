/**
 * ============================================
 * SGAI Performance Framework - Phase 4: Spatial Partitioning
 * ============================================
 * Quadtree (2D) and Octree (3D) for efficient collision detection.
 * 
 * Key Benefits:
 * - O(log n) queries instead of O(n²)
 * - Only check nearby entities for collision
 * - Dynamic insertion/removal
 * - Supports large worlds
 */

(function(global) {
    'use strict';

    // ============================================
    // QUADTREE (2D)
    // ============================================

    /**
     * 2D Quadtree for games like Total Zombies, Cursed Sands
     */
    class Quadtree {
        constructor(options = {}) {
            this.bounds = options.bounds || { x: 0, y: 0, width: 100, height: 100 };
            this.maxObjects = options.maxObjects || 10;
            this.maxLevels = options.maxLevels || 8;
            this.level = options.level || 0;
            
            this.objects = [];
            this.nodes = []; // 4 children: NE, NW, SE, SW
            this.divided = false;
        }

        /**
         * Clear the tree
         */
        clear() {
            this.objects = [];
            
            for (let i = 0; i < this.nodes.length; i++) {
                if (this.nodes[i]) {
                    this.nodes[i].clear();
                }
            }
            
            this.nodes = [];
            this.divided = false;
        }

        /**
         * Split into 4 quadrants
         */
        _split() {
            const { x, y, width, height } = this.bounds;
            const halfW = width / 2;
            const halfH = height / 2;
            const nextLevel = this.level + 1;
            
            // NE, NW, SE, SW
            this.nodes[0] = new Quadtree({
                bounds: { x: x + halfW, y: y, width: halfW, height: halfH },
                maxObjects: this.maxObjects,
                maxLevels: this.maxLevels,
                level: nextLevel
            });
            
            this.nodes[1] = new Quadtree({
                bounds: { x: x, y: y, width: halfW, height: halfH },
                maxObjects: this.maxObjects,
                maxLevels: this.maxLevels,
                level: nextLevel
            });
            
            this.nodes[2] = new Quadtree({
                bounds: { x: x, y: y + halfH, width: halfW, height: halfH },
                maxObjects: this.maxObjects,
                maxLevels: this.maxLevels,
                level: nextLevel
            });
            
            this.nodes[3] = new Quadtree({
                bounds: { x: x + halfW, y: y + halfH, width: halfW, height: halfH },
                maxObjects: this.maxObjects,
                maxLevels: this.maxLevels,
                level: nextLevel
            });
            
            this.divided = true;
        }

        /**
         * Get which quadrant(s) an object belongs to
         */
        _getIndices(obj) {
            const { x, y, width, height } = this.bounds;
            const midX = x + width / 2;
            const midY = y + height / 2;
            
            const indices = [];
            const isPoint = obj.width === undefined && obj.height === undefined;
            
            const objLeft = isPoint ? obj.x : obj.x - obj.width / 2;
            const objRight = isPoint ? obj.x : obj.x + obj.width / 2;
            const objTop = isPoint ? obj.y : obj.y - obj.height / 2;
            const objBottom = isPoint ? obj.y : obj.y + obj.height / 2;
            
            // Check if object spans multiple quadrants
            const spansVertical = objLeft < midX && objRight > midX;
            const spansHorizontal = objTop < midY && objBottom > midY;
            
            if (spansVertical && spansHorizontal) {
                // Object overlaps multiple, return all
                return [0, 1, 2, 3];
            }
            
            // NE
            if (obj.x >= midX && obj.y <= midY) {
                indices.push(0);
            }
            // NW
            if (obj.x <= midX && obj.y <= midY) {
                indices.push(1);
            }
            // SE
            if (obj.x >= midX && obj.y >= midY) {
                indices.push(3);
            }
            // SW
            if (obj.x <= midX && obj.y >= midY) {
                indices.push(2);
            }
            
            return indices.length > 0 ? indices : [0, 1, 2, 3];
        }

        /**
         * Insert object into tree
         */
        insert(obj) {
            // Validate bounds
            if (obj.x === undefined || obj.x === null) {
                console.warn('Quadtree: Invalid object', obj);
                return;
            }
            
            // If divided, try to add to children
            if (this.divided) {
                const indices = this._getIndices(obj);
                
                for (const i of indices) {
                    if (this.nodes[i] && this._contains(this.nodes[i].bounds, obj)) {
                        this.nodes[i].insert(obj);
                        return;
                    }
                }
            }
            
            // Add to this node
            this.objects.push(obj);
            
            // Split if needed
            if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
                if (!this.divided) {
                    this._split();
                }
                
                // Redistribute objects
                this._redistribute();
            }
        }

        /**
         * Check if bounds contains object
         */
        _contains(bounds, obj) {
            const isPoint = obj.width === undefined && obj.height === undefined;
            
            if (isPoint) {
                return obj.x >= bounds.x && obj.x < bounds.x + bounds.width &&
                       obj.y >= bounds.y && obj.y < bounds.y + bounds.height;
            }
            
            return obj.x - obj.width / 2 < bounds.x + bounds.width &&
                   obj.x + obj.width / 2 > bounds.x &&
                   obj.y - obj.height / 2 < bounds.y + bounds.height &&
                   obj.y + obj.height / 2 > bounds.y;
        }

        /**
         * Redistribute objects to children
         */
        _redistribute() {
            const allObjects = this.objects;
            this.objects = [];
            
            for (const obj of allObjects) {
                const indices = this._getIndices(obj);
                let inserted = false;
                
                for (const i of indices) {
                    if (this.nodes[i] && this._contains(this.nodes[i].bounds, obj)) {
                        this.nodes[i].insert(obj);
                        inserted = true;
                        break;
                    }
                }
                
                if (!inserted) {
                    this.objects.push(obj);
                }
            }
        }

        /**
         * Query objects in a rectangular region
         */
        query(bounds, result = []) {
            if (!this._intersects(this.bounds, bounds)) {
                return result;
            }
            
            // Add objects from this level
            for (const obj of this.objects) {
                if (this._intersects(obj, bounds)) {
                    result.push(obj);
                }
            }
            
            // Query children
            if (this.divided) {
                for (const node of this.nodes) {
                    if (node) node.query(bounds, result);
                }
            }
            
            return result;
        }

        /**
         * Query objects in a radius (optimized)
         */
        queryRadius(x, y, radius, result = []) {
            const bounds = {
                x: x - radius,
                y: y - radius,
                width: radius * 2,
                height: radius * 2
            };
            
            const candidates = this.query(bounds);
            const radiusSq = radius * radius;
            
            for (const obj of candidates) {
                const dx = obj.x - x;
                const dy = obj.y - y;
                
                if (dx * dx + dy * dy <= radiusSq) {
                    result.push(obj);
                }
            }
            
            return result;
        }

        /**
         * Check if two bounds intersect
         */
        _intersects(a, b) {
            const aLeft = a.x - (a.width || 0) / 2;
            const aRight = a.x + (a.width || 0) / 2;
            const aTop = a.y - (a.height || 0) / 2;
            const aBottom = a.y + (a.height || 0) / 2;
            
            const bLeft = b.x - (b.width || 0) / 2;
            const bRight = b.x + (b.width || 0) / 2;
            const bTop = b.y - (b.height || 0) / 2;
            const bBottom = b.y + (b.height || 0) / 2;
            
            return !(aRight < bLeft || aLeft > bRight || aBottom < bTop || aTop > bBottom);
        }

        /**
         * Remove object from tree
         */
        remove(obj) {
            // Simple removal - rebuild if too many empty nodes
            const idx = this.objects.indexOf(obj);
            if (idx >= 0) {
                this.objects.splice(idx, 1);
                return true;
            }
            
            if (this.divided) {
                for (const node of this.nodes) {
                    if (node && node.remove(obj)) {
                        return true;
                    }
                }
            }
            
            return false;
        }

        /**
         * Get all objects in tree
         */
        getAll(result = []) {
            result.push(...this.objects);
            
            if (this.divided) {
                for (const node of this.nodes) {
                    if (node) node.getAll(result);
                }
            }
            
            return result;
        }

        /**
         * Get tree depth
         */
        getDepth() {
            if (!this.divided) return this.level;
            
            let maxDepth = this.level;
            for (const node of this.nodes) {
                if (node) maxDepth = Math.max(maxDepth, node.getDepth());
            }
            return maxDepth;
        }

        /**
         * Get statistics
         */
        getStats() {
            return {
                objects: this.objects.length,
                nodes: this.divided ? this.nodes.filter(n => n).length : 0,
                depth: this.getDepth(),
                totalObjects: this.getAll().length
            };
        }
    }

    // ============================================
    // OCTREE (3D)
    // ============================================

    /**
     * 3D Octree for games like Cursed Depths, The Abyss
     */
    class Octree {
        constructor(options = {}) {
            this.bounds = options.bounds || { 
                x: 0, y: 0, z: 0, 
                width: 100, height: 100, depth: 100 
            };
            this.maxObjects = options.maxObjects || 10;
            this.maxLevels = options.maxLevels || 6;
            this.level = options.level || 0;
            
            this.objects = [];
            this.nodes = []; // 8 children
            this.divided = false;
        }

        /**
         * Clear the tree
         */
        clear() {
            this.objects = [];
            
            for (let i = 0; i < this.nodes.length; i++) {
                if (this.nodes[i]) {
                    this.nodes[i].clear();
                }
            }
            
            this.nodes = [];
            this.divided = false;
        }

        /**
         * Split into 8 octants
         */
        _split() {
            const { x, y, z, width, height, depth } = this.bounds;
            const halfW = width / 2;
            const halfH = height / 2;
            const halfD = depth / 2;
            const nextLevel = this.level + 1;
            
            // 8 children: +x+y+z, -x+y+z, -x-y+z, +x-y+z, +x+y-z, -x+y-z, -x-y-z, +x-y-z
            const configs = [
                { x: x + halfW, y: y + halfH, z: z + halfD },
                { x: x, y: y + halfH, z: z + halfD },
                { x: x, y: y, z: z + halfD },
                { x: x + halfW, y: y, z: z + halfD },
                { x: x + halfW, y: y + halfH, z: z },
                { x: x, y: y + halfH, z: z },
                { x: x, y: y, z: z },
                { x: x + halfW, y: y, z: z }
            ];
            
            for (let i = 0; i < 8; i++) {
                this.nodes[i] = new Octree({
                    bounds: {
                        x: configs[i].x,
                        y: configs[i].y,
                        z: configs[i].z,
                        width: halfW,
                        height: halfH,
                        depth: halfD
                    },
                    maxObjects: this.maxObjects,
                    maxLevels: this.maxLevels,
                    level: nextLevel
                });
            }
            
            this.divided = true;
        }

        /**
         * Get which octant(s) an object belongs to
         */
        _getIndices(obj) {
            const { x, y, z, width, height, depth } = this.bounds;
            const midX = x + width / 2;
            const midY = y + height / 2;
            const midZ = z + depth / 2;
            
            const isPoint = obj.width === undefined;
            
            const objX = isPoint ? obj.x : obj.x;
            const objY = isPoint ? obj.y : obj.y;
            const objZ = isPoint ? obj.z : obj.z;
            
            const indices = [];
            
            // Determine octant based on position relative to center
            const right = objX >= midX;
            const top = objY >= midY;
            const front = objZ >= midZ;
            
            if (right && top && front) indices.push(0);
            if (!right && top && front) indices.push(1);
            if (!right && !top && front) indices.push(2);
            if (right && !top && front) indices.push(3);
            if (right && top && !front) indices.push(4);
            if (!right && top && !front) indices.push(5);
            if (!right && !top && !front) indices.push(6);
            if (right && !top && !front) indices.push(7);
            
            return indices;
        }

        /**
         * Insert object into tree
         */
        insert(obj) {
            if (obj.x === undefined || obj.x === null) {
                console.warn('Octree: Invalid object', obj);
                return;
            }
            
            if (this.divided) {
                const indices = this._getIndices(obj);
                
                for (const i of indices) {
                    if (this.nodes[i] && this._contains(this.nodes[i].bounds, obj)) {
                        this.nodes[i].insert(obj);
                        return;
                    }
                }
            }
            
            this.objects.push(obj);
            
            if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
                if (!this.divided) {
                    this._split();
                }
                
                this._redistribute();
            }
        }

        /**
         * Check if bounds contains object
         */
        _contains(bounds, obj) {
            const isPoint = obj.width === undefined && obj.height === undefined;
            
            if (isPoint) {
                return obj.x >= bounds.x && obj.x < bounds.x + bounds.width &&
                       obj.y >= bounds.y && obj.y < bounds.y + bounds.height &&
                       obj.z >= bounds.z && obj.z < bounds.z + bounds.depth;
            }
            
            return obj.x - obj.width / 2 < bounds.x + bounds.width &&
                   obj.x + obj.width / 2 > bounds.x &&
                   obj.y - obj.height / 2 < bounds.y + bounds.height &&
                   obj.y + obj.height / 2 > bounds.y &&
                   obj.z - obj.depth / 2 < bounds.z + bounds.depth &&
                   obj.z + obj.depth / 2 > bounds.z;
        }

        /**
         * Redistribute objects to children
         */
        _redistribute() {
            const allObjects = this.objects;
            this.objects = [];
            
            for (const obj of allObjects) {
                const indices = this._getIndices(obj);
                let inserted = false;
                
                for (const i of indices) {
                    if (this.nodes[i] && this._contains(this.nodes[i].bounds, obj)) {
                        this.nodes[i].insert(obj);
                        inserted = true;
                        break;
                    }
                }
                
                if (!inserted) {
                    this.objects.push(obj);
                }
            }
        }

        /**
         * Query objects in a 3D region
         */
        query(bounds, result = []) {
            if (!this._intersects(this.bounds, bounds)) {
                return result;
            }
            
            for (const obj of this.objects) {
                if (this._intersects(obj, bounds)) {
                    result.push(obj);
                }
            }
            
            if (this.divided) {
                for (const node of this.nodes) {
                    if (node) node.query(bounds, result);
                }
            }
            
            return result;
        }

        /**
         * Query objects in a 3D sphere
         */
        querySphere(x, y, z, radius, result = []) {
            const bounds = {
                x: x - radius,
                y: y - radius,
                z: z - radius,
                width: radius * 2,
                height: radius * 2,
                depth: radius * 2
            };
            
            const candidates = this.query(bounds);
            const radiusSq = radius * radius;
            
            for (const obj of candidates) {
                const dx = obj.x - x;
                const dy = obj.y - y;
                const dz = obj.z - z;
                
                if (dx * dx + dy * dy + dz * dz <= radiusSq) {
                    result.push(obj);
                }
            }
            
            return result;
        }

        /**
         * Check if two 3D bounds intersect
         */
        _intersects(a, b) {
            const aHalfW = (a.width || 0) / 2;
            const aHalfH = (a.height || 0) / 2;
            const aHalfD = (a.depth || 0) / 2;
            
            const bHalfW = (b.width || 0) / 2;
            const bHalfH = (b.height || 0) / 2;
            const bHalfD = (b.depth || 0) / 2;
            
            return !(a.x + aHalfW < b.x - bHalfW || a.x - aHalfW > b.x + bHalfW ||
                     a.y + aHalfH < b.y - bHalfH || a.y - aHalfH > b.y + bHalfH ||
                     a.z + aHalfD < b.z - bHalfD || a.z - aHalfD > b.z + bHalfD);
        }

        /**
         * Get all objects
         */
        getAll(result = []) {
            result.push(...this.objects);
            
            if (this.divided) {
                for (const node of this.nodes) {
                    if (node) node.getAll(result);
                }
            }
            
            return result;
        }

        /**
         * Get statistics
         */
        getStats() {
            return {
                objects: this.objects.length,
                nodes: this.divided ? this.nodes.filter(n => n).length : 0,
                totalObjects: this.getAll().length
            };
        }
    }

    // ============================================
    // SPATIAL HASH (Alternative for uniform grids)
    // ============================================

    /**
     * Spatial hash for uniform grid-based collision
     */
    class SpatialHash {
        constructor(cellSize) {
            this.cellSize = cellSize;
            this.cells = new Map();
        }

        /**
         * Get cell key from position
         */
        _getKey(x, y, z = 0) {
            const cx = Math.floor(x / this.cellSize);
            const cy = Math.floor(y / this.cellSize);
            const cz = Math.floor(z / this.cellSize);
            return z === 0 ? `${cx},${cy}` : `${cx},${cy},${cz}`;
        }

        /**
         * Insert object
         */
        insert(obj) {
            const key = this._getKey(obj.x, obj.y, obj.z);
            
            if (!this.cells.has(key)) {
                this.cells.set(key, []);
            }
            
            this.cells.get(key).push(obj);
            obj._spatialHashKey = key;
        }

        /**
         * Remove object
         */
        remove(obj) {
            if (!obj._spatialHashKey) return;
            
            const cell = this.cells.get(obj._spatialHashKey);
            if (cell) {
                const idx = cell.indexOf(obj);
                if (idx >= 0) {
                    cell.splice(idx, 1);
                }
                
                if (cell.length === 0) {
                    this.cells.delete(obj._spatialHashKey);
                }
            }
            
            obj._spatialHashKey = null;
        }

        /**
         * Update object position
         */
        update(obj, oldX, oldY, oldZ) {
            const newKey = this._getKey(obj.x, obj.y, obj.z);
            
            if (obj._spatialHashKey !== newKey) {
                this.remove(obj);
                this.insert(obj);
            }
        }

        /**
         * Query nearby objects
         */
        queryRadius(x, y, z, radius) {
            const result = [];
            const cellRadius = Math.ceil(radius / this.cellSize);
            const cx = Math.floor(x / this.cellSize);
            const cy = Math.floor(y / this.cellSize);
            const cz = Math.floor(z / this.cellSize);
            const is2D = z === 0;
            
            const radiusSq = radius * radius;
            
            for (let dx = -cellRadius; dx <= cellRadius; dx++) {
                for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                    for (let dz = is2D ? 0 : -cellRadius; dz <= (is2D ? 0 : cellRadius); dz++) {
                        const key = is2D ? `${cx + dx},${cy + dy}` : `${cx + dx},${cy + dy},${cz + dz}`;
                        const cell = this.cells.get(key);
                        
                        if (cell) {
                            for (const obj of cell) {
                                const distSq = (obj.x - x) ** 2 + (obj.y - y) ** 2 + (is2D ? 0 : (obj.z - z) ** 2);
                                if (distSq <= radiusSq) {
                                    result.push(obj);
                                }
                            }
                        }
                    }
                }
            }
            
            return result;
        }

        /**
         * Clear all
         */
        clear() {
            this.cells.clear();
        }

        /**
         * Get statistics
         */
        getStats() {
            let totalObjects = 0;
            for (const cell of this.cells.values()) {
                totalObjects += cell.length;
            }
            
            return {
                cells: this.cells.size,
                objects: totalObjects,
                avgPerCell: this.cells.size > 0 ? totalObjects / this.cells.size : 0
            };
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    const SGAI = global.SGAI || {};
    SGAI.Quadtree = Quadtree;
    SGAI.Octree = Octree;
    SGAI.SpatialHash = SpatialHash;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            Quadtree,
            Octree,
            SpatialHash
        };
    } else {
        global.SGAI = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);
