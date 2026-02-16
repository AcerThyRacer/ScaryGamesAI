/**
 * ============================================
 * SGAI AI Framework - Phase 12: Pathfinding & Flow Fields
 * ============================================
 * NavMesh and flow field pathfinding.
 * 
 * Key Benefits:
 * - 3D NavMesh navigation
 * - RTS flow fields
 * - Dynamic path updates
 */

(function(global) {
    'use strict';

    // ============================================
    // NAVMESH (3D Pathfinding)
    // ============================================

    /**
     * Navigation Mesh for 3D environments
     */
    class NavMesh {
        constructor(options = {}) {
            this.vertices = [];
            this.faces = [];
            this.portals = [];
            
            // Graph for A*
            this.graph = new Map();
            
            // Spatial index for raycasting
            this.spatial = null;
        }

        /**
         * Load NavMesh from data
         */
        load(data) {
            this.vertices = data.vertices || [];
            this.faces = data.faces || [];
            this.portals = data.portals || [];
            
            // Build navigation graph
            this._buildGraph();
            
            console.log(`[NavMesh] Loaded ${this.faces.length} polygons`);
        }

        /**
         * Build graph from polygons
         */
        _buildGraph() {
            // Simplified: connect adjacent polygons
            for (let i = 0; i < this.faces.length; i++) {
                const face = this.faces[i];
                const neighbors = [];
                
                for (let j = 0; j < this.faces.length; j++) {
                    if (i === j) continue;
                    
                    if (this._arePolygonsConnected(face, this.faces[j])) {
                        const cost = this._getPolygonCenterDistance(i, j);
                        neighbors.push({ index: j, cost });
                    }
                }
                
                this.graph.set(i, neighbors);
            }
        }

        /**
         * Check if polygons are connected
         */
        _arePolygonsConnected(a, b) {
            // Simplified: check if they share an edge
            const aEdges = this._getFaceEdges(a);
            const bEdges = this._getFaceEdges(b);
            
            for (const ae of aEdges) {
                for (const be of bEdges) {
                    if (this._edgesEqual(ae, be)) return true;
                }
            }
            return false;
        }

        /**
         * Get face edges
         */
        _getFaceEdges(face) {
            const edges = [];
            const v = face.vertexIndices;
            
            for (let i = 0; i < v.length; i++) {
                const v1 = v[i];
                const v2 = v[(i + 1) % v.length];
                edges.push([v1, v2].sort());
            }
            
            return edges;
        }

        /**
         * Check if edges are equal
         */
        _edgesEqual(a, b) {
            return a[0] === b[0] && a[1] === b[1];
        }

        /**
         * Get distance between polygon centers
         */
        _getPolygonCenterDistance(a, b) {
            const ca = this._getPolygonCenter(a);
            const cb = this._getPolygonCenter(b);
            
            return Math.sqrt(
                (ca.x - cb.x) ** 2 + 
                (ca.y - cb.y) ** 2 + 
                (ca.z - cb.z) ** 2
            );
        }

        /**
         * Get polygon center
         */
        _getPolygonCenter(index) {
            const face = this.faces[index];
            let cx = 0, cy = 0, cz = 0;
            
            for (const vi of face.vertexIndices) {
                const v = this.vertices[vi];
                cx += v.x; cy += v.y; cz += v.z;
            }
            
            const count = face.vertexIndices.length;
            return { x: cx / count, y: cy / count, z: cz / count };
        }

        /**
         * Find nearest polygon to point
         */
        findNearestPolygon(point) {
            let nearestIndex = -1;
            let nearestDist = Infinity;
            
            for (let i = 0; i < this.faces.length; i++) {
                const center = this._getPolygonCenter(i);
                const dist = Math.sqrt(
                    (center.x - point.x) ** 2 +
                    (center.y - point.y) ** 2 +
                    (center.z - point.z) ** 2
                );
                
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIndex = i;
                }
            }
            
            return nearestIndex;
        }

        /**
         * Find path using A*
         */
        findPath(start, end) {
            const startPoly = this.findNearestPolygon(start);
            const endPoly = this.findNearestPolygon(end);
            
            if (startPoly < 0 || endPoly < 0) return [];
            
            // A* pathfinding
            const openSet = [startPoly];
            const cameFrom = new Map();
            const gScore = new Map();
            const fScore = new Map();
            
            gScore.set(startPoly, 0);
            fScore.set(startPoly, this._getPolygonCenter(startPoly).x - this._getPolygonCenter(endPoly).x);
            
            while (openSet.length > 0) {
                // Get node with lowest fScore
                openSet.sort((a, b) => (fScore.get(a) || Infinity) - (fScore.get(b) || Infinity));
                const current = openSet.shift();
                
                if (current === endPoly) {
                    return this._reconstructPath(cameFrom, current, start, end);
                }
                
                const neighbors = this.graph.get(current) || [];
                
                for (const neighbor of neighbors) {
                    const tentativeG = (gScore.get(current) || Infinity) + neighbor.cost;
                    
                    if (tentativeG < (gScore.get(neighbor.index) || Infinity)) {
                        cameFrom.set(neighbor.index, current);
                        gScore.set(neighbor.index, tentativeG);
                        fScore.set(neighbor.index, tentativeG + this._getPolygonCenter(neighbor.index).x);
                        
                        if (!openSet.includes(neighbor.index)) {
                            openSet.push(neighbor.index);
                        }
                    }
                }
            }
            
            return []; // No path
        }

        /**
         * Reconstruct path
         */
        _reconstructPath(cameFrom, current, start, end) {
            const path = [end];
            
            while (cameFrom.has(current)) {
                const center = this._getPolygonCenter(current);
                path.unshift(center);
                current = cameFrom.get(current);
            }
            
            path.unshift(start);
            return path;
        }
    }

    // ============================================
    // FLOW FIELD (RTS Pathfinding)
    // ============================================

    /**
     * Flow field for RTS swarm movement
     */
    class FlowField {
        constructor(options = {}) {
            this.gridSize = options.gridSize || 1;
            this.width = options.width || 100;
            this.height = options.height || 100;
            
            // Grid of flow vectors
            this.grid = new Float32Array(this.width * this.height * 2);
            
            // Integration field (distance to target)
            this.integral = new Float32Array(this.width * this.height);
            
            // Obstacle grid
            this.obstacles = new Uint8Array(this.width * this.height);
            
            this.target = null;
            this.dirty = true;
        }

        /**
         * Set target position
         */
        setTarget(x, z) {
            this.target = { x: Math.floor(x / this.gridSize), z: Math.floor(z / this.gridSize) };
            this.dirty = true;
        }

        /**
         * Set obstacle
         */
        setObstacle(x, z, value = 1) {
            const gx = Math.floor(x / this.gridSize);
            const gz = Math.floor(z / this.gridSize);
            
            if (gx >= 0 && gx < this.width && gz >= 0 && gz < this.height) {
                this.obstacles[gz * this.width + gx] = value;
                this.dirty = true;
            }
        }

        /**
         * Clear all obstacles
         */
        clearObstacles() {
            this.obstacles.fill(0);
            this.dirty = true;
        }

        /**
         * Build flow field (dijkstra)
         */
        build() {
            if (!this.target || !this.dirty) return;
            
            // Reset integral field
            this.integral.fill(Infinity);
            
            // BFS from target
            const queue = [];
            const targetIndex = this.target.z * this.width + this.target.x;
            
            this.integral[targetIndex] = 0;
            queue.push({ x: this.target.x, z: this.target.z, cost: 0 });
            
            while (queue.length > 0) {
                const current = queue.shift();
                const cx = current.x;
                const cz = current.z;
                const ci = cz * this.width + cx;
                const currentCost = current.cost;
                
                // Check 4 neighbors
                const neighbors = [
                    { x: cx + 1, z: cz },
                    { x: cx - 1, z: cz },
                    { x: cx, z: cz + 1 },
                    { x: cx, z: cz - 1 },
                    { x: cx + 1, z: cz + 1 },
                    { x: cx - 1, z: cz - 1 },
                    { x: cx + 1, z: cz - 1 },
                    { x: cx - 1, z: cz + 1 }
                ];
                
                for (const n of neighbors) {
                    if (n.x < 0 || n.x >= this.width || n.z < 0 || n.z >= this.height) continue;
                    
                    const ni = n.z * this.width + n.x;
                    if (this.obstacles[ni]) continue;
                    
                    const newCost = currentCost + (n.x !== cx && n.z !== cz ? 1.414 : 1);
                    
                    if (newCost < this.integral[ni]) {
                        this.integral[ni] = newCost;
                        queue.push({ x: n.x, z: n.z, cost: newCost });
                    }
                }
            }
            
            // Calculate flow vectors
            this._calculateFlow();
            
            this.dirty = false;
            console.log('[FlowField] Built');
        }

        /**
         * Calculate flow vectors from integral field
         */
        _calculateFlow() {
            for (let z = 0; z < this.height; z++) {
                for (let x = 0; x < this.width; x++) {
                    const i = z * this.width + x;
                    
                    // Skip obstacles
                    if (this.obstacles[i]) {
                        this.grid[i * 2] = 0;
                        this.grid[i * 2 + 1] = 0;
                        continue;
                    }
                    
                    // Find lowest neighbor
                    let lowest = this.integral[i];
                    let flowX = 0;
                    let flowZ = 0;
                    
                    const neighbors = [
                        { x: x + 1, z: z },
                        { x: x - 1, z: z },
                        { x: x, z: z + 1 },
                        { x: x, z: z - 1 },
                        { x: x + 1, z: z + 1 },
                        { x: x - 1, z: z - 1 },
                        { x: x + 1, z: z - 1 },
                        { x: x - 1, z: z + 1 }
                    ];
                    
                    for (const n of neighbors) {
                        if (n.x < 0 || n.x >= this.width || n.z < 0 || n.z >= this.height) continue;
                        
                        const ni = n.z * this.width + n.x;
                        if (this.integral[ni] < lowest) {
                            lowest = this.integral[ni];
                            flowX = n.x - x;
                            flowZ = n.z - z;
                        }
                    }
                    
                    // Normalize
                    const len = Math.sqrt(flowX * flowX + flowZ * flowZ);
                    if (len > 0) {
                        this.grid[i * 2] = flowX / len;
                        this.grid[i * 2 + 1] = flowZ / len;
                    }
                }
            }
        }

        /**
         * Get flow vector at position
         */
        getFlow(x, z) {
            if (this.dirty) this.build();
            
            const gx = Math.floor(x / this.gridSize);
            const gz = Math.floor(z / this.gridSize);
            
            if (gx < 0 || gx >= this.width || gz < 0 || gz >= this.height) {
                return { x: 0, z: 0 };
            }
            
            const i = gz * this.width + gx;
            
            return {
                x: this.grid[i * 2],
                z: this.grid[i * 2 + 1]
            };
        }

        /**
         * Update flow field (incremental)
         */
        updateObstacle(x, z) {
            this.setObstacle(x, z, 1);
            // Only rebuild affected area in real implementation
            this.build();
        }
    }

    // ============================================
    // PATHFINDER MANAGER
    // ============================================

    /**
     * Manages multiple pathfinding systems
     */
    class PathfinderManager {
        constructor(options = {}) {
            this.navMesh = null;
            this.flowField = new FlowField({
                gridSize: options.gridSize || 1,
                width: options.width || 100,
                height: options.height || 100
            });
            
            // A* grid for 2D
            this.grid = null;
            this.gridWidth = 0;
            this.gridHeight = 0;
        }

        /**
         * Initialize grid-based A*
         */
        initGrid(width, height, cellSize) {
            this.gridWidth = width;
            this.gridHeight = height;
            this.grid = new Uint8Array(width * height); // 0 = walkable, 1 = obstacle
            this.cellSize = cellSize;
            
            console.log(`[Pathfinder] Grid initialized: ${width}x${height}`);
        }

        /**
         * Set obstacle in grid
         */
        setObstacle(x, z, blocked = true) {
            const gx = Math.floor(x / this.cellSize);
            const gz = Math.floor(z / this.cellSize);
            
            if (gx >= 0 && gx < this.gridWidth && gz >= 0 && gz < this.gridHeight) {
                this.grid[gz * this.gridWidth + gx] = blocked ? 1 : 0;
            }
            
            // Also update flow field
            this.flowField.setObstacle(x, z, blocked ? 1 : 0);
        }

        /**
         * Find path using A*
         */
        findPath(startX, startZ, endX, endZ) {
            const start = { x: Math.floor(startX / this.cellSize), z: Math.floor(startZ / this.cellSize) };
            const end = { x: Math.floor(endX / this.cellSize), z: Math.floor(endZ / this.cellSize) };
            
            // Clamp to grid
            start.x = Math.max(0, Math.min(this.gridWidth - 1, start.x));
            start.z = Math.max(0, Math.min(this.gridHeight - 1, start.z));
            end.x = Math.max(0, Math.min(this.gridWidth - 1, end.x));
            end.z = Math.max(0, Math.min(this.gridHeight - 1, end.z));
            
            // A* implementation
            const openSet = [start];
            const cameFrom = new Map();
            const gScore = new Map();
            const fScore = new Map();
            
            const key = (p) => `${p.x},${p.z}`;
            
            gScore.set(key(start), 0);
            fScore.set(key(start), this._heuristic(start, end));
            
            while (openSet.length > 0) {
                openSet.sort((a, b) => 
                    (fScore.get(key(a)) || Infinity) - (fScore.get(key(b)) || Infinity)
                );
                
                const current = openSet.shift();
                
                if (current.x === end.x && current.z === end.z) {
                    return this._reconstructPath(cameFrom, current, start, end);
                }
                
                const neighbors = this._getNeighbors(current);
                
                for (const neighbor of neighbors) {
                    const tentativeG = (gScore.get(key(current)) || Infinity) + 1;
                    
                    if (tentativeG < (gScore.get(key(neighbor)) || Infinity)) {
                        cameFrom.set(key(neighbor), current);
                        gScore.set(key(neighbor), tentativeG);
                        fScore.set(key(neighbor), tentativeG + this._heuristic(neighbor, end));
                        
                        if (!openSet.find(p => p.x === neighbor.x && p.z === neighbor.z)) {
                            openSet.push(neighbor);
                        }
                    }
                }
            }
            
            return []; // No path
        }

        /**
         * Get walkable neighbors
         */
        _getNeighbors(pos) {
            const neighbors = [];
            const dirs = [
                { x: 1, z: 0 }, { x: -1, z: 0 },
                { x: 0, z: 1 }, { x: 0, z: -1 },
                { x: 1, z: 1 }, { x: -1, z: -1 },
                { x: 1, z: -1 }, { x: -1, z: 1 }
            ];
            
            for (const dir of dirs) {
                const nx = pos.x + dir.x;
                const nz = pos.z + dir.z;
                
                if (nx >= 0 && nx < this.gridWidth && nz >= 0 && nz < this.gridHeight) {
                    if (this.grid[nz * this.gridWidth + nx] === 0) {
                        neighbors.push({ x: nx, z: nz });
                    }
                }
            }
            
            return neighbors;
        }

        /**
         * Heuristic for A*
         */
        _heuristic(a, b) {
            return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
        }

        /**
         * Reconstruct path
         */
        _reconstructPath(cameFrom, current, start, end) {
            const path = [];
            let node = current;
            
            while (node) {
                path.unshift({
                    x: node.x * this.cellSize + this.cellSize / 2,
                    z: node.z * this.cellSize + this.cellSize / 2
                });
                node = cameFrom.get(`${node.x},${node.z}`);
            }
            
            return path;
        }

        /**
         * Get flow direction for RTS
         */
        getFlowDirection(x, z) {
            return this.flowField.getFlow(x, z);
        }

        /**
         * Set flow field target
         */
        setFlowTarget(x, z) {
            this.flowField.setTarget(x, z);
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    const SGAI = global.SGAI || {};
    SGAI.NavMesh = NavMesh;
    SGAI.FlowField = FlowField;
    SGAI.PathfinderManager = PathfinderManager;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            NavMesh,
            FlowField,
            PathfinderManager
        };
    } else {
        global.SGAI = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);
