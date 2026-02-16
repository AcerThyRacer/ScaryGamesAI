/**
 * ============================================
 * SGAI Performance Framework - Phase 5: Web Worker Infrastructure
 * ============================================
 * Multi-threaded processing for physics, AI, and world generation.
 * 
 * Key Benefits:
 * - Offload heavy computation from main thread
 * - SharedArrayBuffer for zero-copy data sharing
 * - Worker pool for load balancing
 * - Task-based parallelism
 */

(function(global) {
    'use strict';

    // ============================================
    // WORKER POOL
    // ============================================

    /**
     * Worker pool for distributing tasks across multiple workers
     */
    class WorkerPool {
        constructor(options = {}) {
            this.workerCount = options.workerCount || navigator.hardwareConcurrency || 4;
            this.workerScript = options.workerScript;
            this.workers = [];
            this.taskQueue = [];
            this.activeTasks = new Map();
            this.taskId = 0;
            
            // Message handlers
            this.handlers = new Map();
            
            // Performance tracking
            this.metrics = {
                tasksCompleted: 0,
                tasksQueued: 0,
                avgTaskTime: 0,
                workerUtilization: new Array(this.workerCount).fill(0)
            };
            
            // Initialize workers
            this._initWorkers();
        }

        /**
         * Initialize worker pool
         */
        async _initWorkers() {
            for (let i = 0; i < this.workerCount; i++) {
                const worker = new Worker(this.workerScript);
                
                worker.onmessage = (e) => this._handleMessage(i, e);
                worker.onerror = (e) => console.error(`Worker ${i} error:`, e);
                
                this.workers.push({
                    id: i,
                    worker,
                    busy: false,
                    currentTask: null,
                    tasksCompleted: 0
                });
            }
            
            console.log(`[WorkerPool] Initialized ${this.workerCount} workers`);
        }

        /**
         * Handle message from worker
         */
        _handleMessage(workerId, e) {
            const { type, taskId, data, error } = e.data;
            
            const worker = this.workers[workerId];
            worker.busy = false;
            
            const task = this.activeTasks.get(taskId);
            
            if (task) {
                this.activeTasks.delete(taskId);
                
                if (error) {
                    task.reject(new Error(error));
                } else if (this.handlers.has(type)) {
                    this.handlers.get(type)(data, workerId);
                }
                
                // Complete promise if exists
                if (task.resolve) {
                    task.resolve(data);
                }
                
                this.metrics.tasksCompleted++;
                worker.tasksCompleted++;
                
                // Process next task
                this._processQueue();
            }
        }

        /**
         * Add message handler
         */
        on(type, handler) {
            this.handlers.set(type, handler);
        }

        /**
         * Queue a task for execution
         */
        queue(data, transferable = []) {
            return new Promise((resolve, reject) => {
                const taskId = ++this.taskId;
                
                this.taskQueue.push({
                    id: taskId,
                    data,
                    transferable,
                    resolve,
                    reject,
                    queuedAt: performance.now()
                });
                
                this.metrics.tasksQueued++;
                this._processQueue();
            });
        }

        /**
         * Post task to a worker
         */
        _postTask(worker, task) {
            worker.busy = true;
            worker.currentTask = task;
            worker.worker.postMessage({
                type: 'task',
                taskId: task.id,
                data: task.data,
                transferable: task.transferable
            }, task.transferable);
            
            this.activeTasks.set(task.id, task);
        }

        /**
         * Process queued tasks
         */
        _processQueue() {
            if (this.taskQueue.length === 0) return;
            
            // Find available worker
            const availableWorker = this.workers.find(w => !w.busy);
            
            if (availableWorker) {
                const task = this.taskQueue.shift();
                this._postTask(availableWorker, task);
            }
        }

        /**
         * Execute immediately on a specific worker
         */
        async executeOnWorker(workerId, data, transferable = []) {
            const worker = this.workers[workerId];
            if (!worker) throw new Error(`Invalid worker ID: ${workerId}`);
            
            const taskId = ++this.taskId;
            
            return new Promise((resolve, reject) => {
                const task = {
                    id: taskId,
                    data,
                    transferable,
                    resolve,
                    reject
                };
                
                this._postTask(worker, task);
            });
        }

        /**
         * Broadcast to all workers
         */
        broadcast(type, data, transferable = []) {
            for (const { worker } of this.workers) {
                worker.postMessage({ type, data, transferable }, transferable);
            }
        }

        /**
         * Terminate all workers
         */
        terminate() {
            for (const { worker } of this.workers) {
                worker.terminate();
            }
            this.workers = [];
            console.log('[WorkerPool] Terminated');
        }

        /**
         * Get pool statistics
         */
        getStats() {
            return {
                workers: this.workerCount,
                busyWorkers: this.workers.filter(w => w.busy).length,
                queuedTasks: this.taskQueue.length,
                activeTasks: this.activeTasks.size,
                tasksCompleted: this.metrics.tasksCompleted,
                avgTaskTime: this.metrics.avgTaskTime,
                workerStats: this.workers.map(w => ({
                    id: w.id,
                    busy: w.busy,
                    tasksCompleted: w.tasksCompleted
                }))
            };
        }
    }

    // ============================================
    // SHARED MEMORY MANAGER
    // ============================================

    /**
     * Manages SharedArrayBuffer for zero-copy worker communication
     */
    class SharedMemoryManager {
        constructor() {
            this.buffers = new Map();
            this.bufferId = 0;
            this.isSupported = typeof SharedArrayBuffer !== 'undefined';
        }

        /**
         * Create a shared buffer
         */
        createBuffer(name, size, type = 'float32') {
            if (!this.isSupported) {
                console.warn('[SharedMemory] SharedArrayBuffer not supported');
                return null;
            }
            
            let array;
            const byteLength = size * 4; // 4 bytes per float
            
            try {
                const sab = new SharedArrayBuffer(byteLength);
                
                switch (type) {
                    case 'float32':
                        array = new Float32Array(sab);
                        break;
                    case 'int32':
                        array = new Int32Array(sab);
                        break;
                    case 'uint32':
                        array = new Uint32Array(sab);
                        break;
                    case 'int16':
                        array = new Int16Array(sab);
                        break;
                    case 'uint8':
                        array = new Uint8Array(sab);
                        break;
                    default:
                        array = new Float32Array(sab);
                }
                
                this.buffers.set(name, {
                    sab,
                    array,
                    size,
                    type,
                    views: []
                });
                
                console.log(`[SharedMemory] Created buffer: ${name} (${size} ${type})`);
                return { sab, array };
                
            } catch (e) {
                console.error('[SharedMemory] Failed to create buffer:', e);
                return null;
            }
        }

        /**
         * Get buffer by name
         */
        getBuffer(name) {
            return this.buffers.get(name);
        }

        /**
         * Add a view to buffer (for type punning)
         */
        addView(name, type, offset = 0, length) {
            const buffer = this.buffers.get(name);
            if (!buffer) return null;
            
            let view;
            const sab = buffer.sab;
            
            switch (type) {
                case 'float32':
                    view = new Float32Array(sab, offset * 4, length || buffer.size);
                    break;
                case 'int32':
                    view = new Int32Array(sab, offset * 4, length || buffer.size);
                    break;
                case 'uint32':
                    view = new Uint32Array(sab, offset * 4, length || buffer.size);
                    break;
                default:
                    view = new Float32Array(sab, offset * 4, length || buffer.size);
            }
            
            buffer.views.push({ type, offset, length, view });
            return view;
        }

        /**
         * Create structured view for ECS entities
         */
        createEntityBuffer(entityCount, maxComponents) {
            if (!this.isSupported) return null;
            
            // Component data: [entityId, compType, value1, value2, ...]
            const COMP_DATA_SIZE = 8; // entityId, type, 6 values
            const bufferSize = entityCount * maxComponents * COMP_DATA_SIZE;
            
            return this.createBuffer('entities', bufferSize, 'float32');
        }

        /**
         * Delete buffer
         */
        deleteBuffer(name) {
            this.buffers.delete(name);
        }

        /**
         * Check support
         */
        isAvailable() {
            return this.isSupported;
        }
    }

    // ============================================
    // TASK DEFINITIONS
    // ============================================

    /**
     * Pre-built task handlers for common operations
     */
    const WorkerTasks = {
        /**
         * A* Pathfinding task
         */
        PATHFINDING: 'pathfinding',
        
        /**
         * Flocking/boid simulation
         */
        FLOCKING: 'flocking',
        
        /**
         * World/chunk generation
         */
        WORLD_GEN: 'worldGen',
        
        /**
         * Physics simulation
         */
        PHYSICS: 'physics',
        
        /**
         * Collision detection
         */
        COLLISION: 'collision',
        
        /**
         * AI behavior calculation
         */
        AI_UPDATE: 'aiUpdate'
    };

    // ============================================
    // EXAMPLE: A* PATHFINDING WORKER
    // ============================================

    /**
     * A* Pathfinding worker code (for inline use)
     */
    const pathfindingWorkerCode = `
        // A* Pathfinding implementation for workers
        class PathFinder {
            constructor() {
                this.grid = null;
                this.gridWidth = 0;
                this.gridHeight = 0;
            }
            
            init(grid, width, height) {
                this.grid = grid;
                this.gridWidth = width;
                this.gridHeight = height;
            }
            
            heuristic(a, b) {
                return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
            }
            
            getNeighbors(node) {
                const neighbors = [];
                const dirs = [
                    { x: 0, y: -1 }, { x: 1, y: 0 },
                    { x: 0, y: 1 }, { x: -1, y: 0 },
                    { x: 1, y: -1 }, { x: 1, y: 1 },
                    { x: -1, y: 1 }, { x: -1, y: -1 }
                ];
                
                for (const dir of dirs) {
                    const nx = node.x + dir.x;
                    const ny = node.y + dir.y;
                    
                    if (nx >= 0 && nx < this.gridWidth && 
                        ny >= 0 && ny < this.gridHeight &&
                        this.grid[ny * this.gridWidth + nx] === 0) {
                        neighbors.push({ x: nx, y: ny });
                    }
                }
                
                return neighbors;
            }
            
            findPath(startX, startY, endX, endY) {
                const start = { x: startX, y: startY };
                const end = { x: endX, y: endY };
                
                const openSet = [start];
                const cameFrom = new Map();
                const gScore = new Map();
                const fScore = new Map();
                
                const key = (n) => n.x + ',' + n.y;
                
                gScore.set(key(start), 0);
                fScore.set(key(start), this.heuristic(start, end));
                
                while (openSet.length > 0) {
                    // Get node with lowest fScore
                    openSet.sort((a, b) => 
                        (fScore.get(key(a)) || Infinity) - (fScore.get(key(b)) || Infinity)
                    );
                    
                    const current = openSet.shift();
                    
                    if (current.x === end.x && current.y === end.y) {
                        // Reconstruct path
                        const path = [];
                        let node = current;
                        while (cameFrom.has(key(node))) {
                            path.unshift({ x: node.x, y: node.y });
                            node = cameFrom.get(key(node));
                        }
                        path.unshift(start);
                        return path;
                    }
                    
                    for (const neighbor of this.getNeighbors(current)) {
                        const tentativeG = (gScore.get(key(current)) || Infinity) + 
                            (neighbor.x !== current.x && neighbor.y !== current.y ? 1.414 : 1);
                        
                        if (tentativeG < (gScore.get(key(neighbor)) || Infinity)) {
                            cameFrom.set(key(neighbor), current);
                            gScore.set(key(neighbor), tentativeG);
                            fScore.set(key(neighbor), tentativeG + this.heuristic(neighbor, end));
                            
                            if (!openSet.find(n => n.x === neighbor.x && n.y === neighbor.y)) {
                                openSet.push(neighbor);
                            }
                        }
                    }
                }
                
                return []; // No path found
            }
        }
        
        const pathfinder = new PathFinder();
        
        self.onmessage = function(e) {
            const { type, data } = e.data;
            
            if (type === 'init') {
                pathfinder.init(data.grid, data.width, data.height);
                self.postMessage({ type: 'ready' });
            }
            else if (type === 'pathfind') {
                const path = pathfinder.findPath(
                    data.startX, data.startY,
                    data.endX, data.endY
                );
                self.postMessage({ type: 'pathResult', data: { path, requestId: data.requestId } });
            }
        };
    `;

    /**
     * Flocking simulation worker code
     */
    const flockingWorkerCode = `
        class Boid {
            constructor(x, y, z) {
                this.x = x;
                this.y = y;
                this.z = z;
                this.vx = 0;
                this.vy = 0;
                this.vz = 0;
            }
        }
        
        class FlockingSimulation {
            constructor() {
                this.boids = [];
                this.params = {
                    separationDist: 2,
                    alignmentDist: 5,
                    cohesionDist: 5,
                    separationWeight: 1.5,
                    alignmentWeight: 1.0,
                    cohesionWeight: 1.0,
                    maxSpeed: 10,
                    boundsSize: 50
                };
            }
            
            setBoids(data) {
                this.boids = [];
                for (let i = 0; i < data.length; i += 4) {
                    this.boids.push(new Boid(data[i], data[i+1], data[i+2]));
                    this.boids[this.boids.length-1].vx = data[i+3];
                }
            }
            
            update(dt) {
                const { separationDist, alignmentDist, cohesionDist,
                        separationWeight, alignmentWeight, cohesionWeight,
                        maxSpeed, boundsSize } = this.params;
                
                const newVelocities = [];
                
                for (let i = 0; i < this.boids.length; i++) {
                    const boid = this.boids[i];
                    
                    let sepX = 0, sepY = 0, sepZ = 0;
                    let aliX = 0, aliY = 0, aliZ = 0;
                    let cohX = 0, cohY = 0, cohZ = 0;
                    
                    let sepCount = 0, aliCount = 0, cohCount = 0;
                    
                    for (let j = 0; j < this.boids.length; j++) {
                        if (i === j) continue;
                        
                        const other = this.boids[j];
                        const dx = other.x - boid.x;
                        const dy = other.y - boid.y;
                        const dz = other.z - boid.z;
                        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                        
                        if (dist < separationDist && dist > 0) {
                            sepX -= dx / dist;
                            sepY -= dy / dist;
                            sepZ -= dz / dist;
                            sepCount++;
                        }
                        
                        if (dist < alignmentDist) {
                            aliX += other.vx;
                            aliY += other.vy;
                            aliZ += other.vz;
                            aliCount++;
                        }
                        
                        if (dist < cohesionDist) {
                            cohX += other.x;
                            cohY += other.y;
                            cohZ += other.z;
                            cohCount++;
                        }
                    }
                    
                    let ax = 0, ay = 0, az = 0;
                    
                    // Separation
                    if (sepCount > 0) {
                        ax += (sepX / sepCount) * separationWeight;
                        ay += (sepY / sepCount) * separationWeight;
                        az += (sepZ / sepCount) * separationWeight;
                    }
                    
                    // Alignment
                    if (aliCount > 0) {
                        const avgVx = aliX / aliCount;
                        const avgVy = aliY / aliCount;
                        const avgVz = aliZ / aliCount;
                        ax += (avgVx - boid.vx) * alignmentWeight;
                        ay += (avgVy - boid.vy) * alignmentWeight;
                        az += (avgVz - boid.vz) * alignmentWeight;
                    }
                    
                    // Cohesion
                    if (cohCount > 0) {
                        const centerX = cohX / cohCount;
                        const centerY = cohY / cohCount;
                        const centerZ = cohZ / cohCount;
                        ax += (centerX - boid.x) * cohesionWeight;
                        ay += (centerY - boid.y) * cohesionWeight;
                        az += (centerZ - boid.z) * cohesionWeight;
                    }
                    
                    // Boundary avoidance
                    const margin = boundsSize * 0.9;
                    if (boid.x < -margin) ax += 1;
                    if (boid.x > margin) ax -= 1;
                    if (boid.y < -margin) ay += 1;
                    if (boid.y > margin) ay -= 1;
                    if (boid.z < -margin) az += 1;
                    if (boid.z > margin) az -= 1;
                    
                    // Update velocity
                    boid.vx += ax * dt;
                    boid.vy += ay * dt;
                    boid.vz += az * dt;
                    
                    // Limit speed
                    const speed = Math.sqrt(boid.vx*boid.vx + boid.vy*boid.vy + boid.vz*boid.vz);
                    if (speed > maxSpeed) {
                        boid.vx = (boid.vx / speed) * maxSpeed;
                        boid.vy = (boid.vy / speed) * maxSpeed;
                        boid.vz = (boid.vz / speed) * maxSpeed;
                    }
                }
                
                // Update positions
                for (const boid of this.boids) {
                    boid.x += boid.vx * dt;
                    boid.y += boid.vy * dt;
                    boid.z += boid.vz * dt;
                }
            }
            
            getPositions() {
                const result = new Float32Array(this.boids.length * 4);
                for (let i = 0; i < this.boids.length; i++) {
                    result[i*4] = this.boids[i].x;
                    result[i*4+1] = this.boids[i].y;
                    result[i*4+2] = this.boids[i].z;
                    result[i*4+3] = 1; // active flag
                }
                return result;
            }
        }
        
        const flocking = new FlockingSimulation();
        
        self.onmessage = function(e) {
            const { type, data } = e.data;
            
            if (type === 'init') {
                flocking.setBoids(data.boids);
                self.postMessage({ type: 'ready' });
            }
            else if (type === 'update') {
                flocking.update(data.dt);
                const positions = flocking.getPositions();
                self.postMessage({ type: 'updateResult', data: positions }, [positions.buffer]);
            }
            else if (type === 'setParams') {
                Object.assign(flocking.params, data);
            }
        };
    `;

    // ============================================
    // EXPORT
    // ============================================

    const SGAI = global.SGAI || {};
    SGAI.WorkerPool = WorkerPool;
    SGAI.SharedMemoryManager = SharedMemoryManager;
    SGAI.WorkerTasks = WorkerTasks;
    SGAI.pathfindingWorkerCode = pathfindingWorkerCode;
    SGAI.flockingWorkerCode = flockingWorkerCode;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            WorkerPool,
            SharedMemoryManager,
            WorkerTasks,
            pathfindingWorkerCode,
            flockingWorkerCode
        };
    } else {
        global.SGAI = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);
