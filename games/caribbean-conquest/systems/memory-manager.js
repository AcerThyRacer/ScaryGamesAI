// Caribbean Conquest - Memory Manager System
// Phase 4: Object pooling, asset streaming, and memory optimization

class MemoryManager {
    constructor(game) {
        this.game = game;
        
        // Object pools
        this.objectPools = new Map();
        
        // Asset cache
        this.assetCache = new Map();
        this.assetReferences = new Map();
        
        // Memory budget
        this.memoryBudget = {
            total: 1024 * 1024 * 512, // 512MB
            used: 0,
            maxUsed: 0
        };
        
        // Streaming settings
        this.streamingSettings = {
            enabled: true,
            priorityDistance: 1000, // Load assets within 1000 units
            unloadDistance: 2000,   // Unload assets beyond 2000 units
            maxConcurrentLoads: 4
        };
        
        // Statistics
        this.stats = {
            poolHits: 0,
            poolMisses: 0,
            cacheHits: 0,
            cacheMisses: 0,
            objectsCreated: 0,
            objectsDestroyed: 0,
            memoryFreed: 0
        };
        
        // Active loads
        this.activeLoads = [];
        
        // Garbage collection
        this.gcInterval = 30000; // 30 seconds
        this.lastGCTime = 0;
    }
    
    init() {
        console.log('Memory Manager initialized');
        
        // Initialize object pools for common objects
        this.initObjectPools();
        
        // Start garbage collection timer
        this.startGarbageCollection();
        
        // Start memory monitoring
        this.startMemoryMonitoring();
    }
    
    initObjectPools() {
        // Common object types for pooling
        const poolConfigs = [
            {
                type: 'cannonball',
                initialSize: 50,
                maxSize: 200,
                createFn: () => this.createCannonball(),
                resetFn: (obj) => this.resetCannonball(obj)
            },
            {
                type: 'debris',
                initialSize: 20,
                maxSize: 100,
                createFn: () => this.createDebris(),
                resetFn: (obj) => this.resetDebris(obj)
            },
            {
                type: 'particle',
                initialSize: 100,
                maxSize: 500,
                createFn: () => this.createParticle(),
                resetFn: (obj) => this.resetParticle(obj)
            },
            {
                type: 'projectile',
                initialSize: 30,
                maxSize: 150,
                createFn: () => this.createProjectile(),
                resetFn: (obj) => this.resetProjectile(obj)
            }
        ];
        
        // Initialize pools
        for (const config of poolConfigs) {
            this.createPool(config);
        }
    }
    
    createPool(config) {
        const pool = {
            objects: [],
            activeObjects: new Set(),
            createFn: config.createFn,
            resetFn: config.resetFn,
            maxSize: config.maxSize,
            stats: {
                totalCreated: 0,
                totalReused: 0,
                currentActive: 0
            }
        };
        
        // Pre-create initial objects
        for (let i = 0; i < config.initialSize; i++) {
            const obj = config.createFn();
            pool.objects.push(obj);
            pool.stats.totalCreated++;
        }
        
        this.objectPools.set(config.type, pool);
        console.log(`Created pool for ${config.type} with ${config.initialSize} objects`);
    }
    
    getPooledObject(type, ...args) {
        if (!this.objectPools.has(type)) {
            console.warn(`No pool found for type: ${type}`);
            this.stats.poolMisses++;
            return null;
        }
        
        const pool = this.objectPools.get(type);
        
        // Try to get from pool
        if (pool.objects.length > 0) {
            const obj = pool.objects.pop();
            pool.activeObjects.add(obj);
            pool.stats.currentActive++;
            pool.stats.totalReused++;
            
            // Reset object state
            if (pool.resetFn) {
                pool.resetFn(obj, ...args);
            }
            
            this.stats.poolHits++;
            return obj;
        }
        
        // Create new object if pool is empty but not at max size
        if (pool.stats.totalCreated < pool.maxSize) {
            const obj = pool.createFn(...args);
            pool.activeObjects.add(obj);
            pool.stats.totalCreated++;
            pool.stats.currentActive++;
            
            this.stats.poolMisses++;
            this.stats.objectsCreated++;
            return obj;
        }
        
        // Pool is at max size, can't create more
        console.warn(`Pool for ${type} is at max capacity (${pool.maxSize})`);
        this.stats.poolMisses++;
        return null;
    }
    
    returnPooledObject(type, obj) {
        if (!this.objectPools.has(type)) {
            console.warn(`No pool found for type: ${type}`);
            return false;
        }
        
        const pool = this.objectPools.get(type);
        
        if (!pool.activeObjects.has(obj)) {
            console.warn(`Object not found in active set for type: ${type}`);
            return false;
        }
        
        // Remove from active set
        pool.activeObjects.delete(obj);
        pool.stats.currentActive--;
        
        // Reset object
        if (pool.resetFn) {
            pool.resetFn(obj);
        }
        
        // Return to pool if not at max size
        if (pool.objects.length < pool.maxSize) {
            pool.objects.push(obj);
            return true;
        }
        
        // Pool is full, destroy object
        this.destroyObject(obj);
        this.stats.objectsDestroyed++;
        return true;
    }
    
    createCannonball() {
        // Create a cannonball object
        return {
            type: 'cannonball',
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            damage: 10,
            lifetime: 5,
            active: false,
            mesh: null // Will be created when needed
        };
    }
    
    resetCannonball(cannonball, position, velocity) {
        cannonball.position = position || { x: 0, y: 0, z: 0 };
        cannonball.velocity = velocity || { x: 0, y: 0, z: 0 };
        cannonball.damage = 10;
        cannonball.lifetime = 5;
        cannonball.active = true;
    }
    
    createDebris() {
        return {
            type: 'debris',
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: 1,
            lifetime: 3,
            active: false,
            mesh: null
        };
    }
    
    resetDebris(debris, position, velocity) {
        debris.position = position || { x: 0, y: 0, z: 0 };
        debris.velocity = velocity || { x: 0, y: 0, z: 0 };
        debris.rotation = { 
            x: Math.random() * Math.PI * 2,
            y: Math.random() * Math.PI * 2,
            z: Math.random() * Math.PI * 2
        };
        debris.scale = 0.5 + Math.random() * 0.5;
        debris.lifetime = 3;
        debris.active = true;
    }
    
    createParticle() {
        return {
            type: 'particle',
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            color: 0xffffff,
            size: 1,
            lifetime: 1,
            active: false,
            mesh: null
        };
    }
    
    resetParticle(particle, position, velocity, color) {
        particle.position = position || { x: 0, y: 0, z: 0 };
        particle.velocity = velocity || { x: 0, y: 0, z: 0 };
        particle.color = color || 0xffffff;
        particle.size = 0.5 + Math.random() * 1.5;
        particle.lifetime = 0.5 + Math.random() * 1.5;
        particle.active = true;
    }
    
    createProjectile() {
        return {
            type: 'projectile',
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            damage: 5,
            pierce: false,
            lifetime: 3,
            active: false,
            mesh: null
        };
    }
    
    resetProjectile(projectile, position, velocity, damage) {
        projectile.position = position || { x: 0, y: 0, z: 0 };
        projectile.velocity = velocity || { x: 0, y: 0, z: 0 };
        projectile.damage = damage || 5;
        projectile.pierce = false;
        projectile.lifetime = 3;
        projectile.active = true;
    }
    
    destroyObject(obj) {
        // Clean up Three.js resources if present
        if (obj.mesh && obj.mesh.geometry) {
            obj.mesh.geometry.dispose();
        }
        
        if (obj.mesh && obj.mesh.material) {
            if (Array.isArray(obj.mesh.material)) {
                obj.mesh.material.forEach(material => material.dispose());
            } else {
                obj.mesh.material.dispose();
            }
        }
        
        // Remove from scene
        if (obj.mesh && this.game.renderer && this.game.renderer.scene) {
            this.game.renderer.scene.remove(obj.mesh);
        }
        
        // Clear references
        obj.mesh = null;
        obj.active = false;
    }
    
    loadAssetAsync(path, priority = 0) {
        return new Promise((resolve, reject) => {
            // Check cache first
            if (this.assetCache.has(path)) {
                const asset = this.assetCache.get(path);
                asset.references++;
                this.stats.cacheHits++;
                resolve(asset.data);
                return;
            }
            
            this.stats.cacheMisses++;
            
            // Check if we have too many concurrent loads
            if (this.activeLoads.length >= this.streamingSettings.maxConcurrentLoads && priority < 2) {
                // Queue lower priority loads
                setTimeout(() => {
                    this.loadAssetAsync(path, priority).then(resolve).catch(reject);
                }, 100);
                return;
            }
            
            // Start loading
            const loadId = Date.now();
            this.activeLoads.push(loadId);
            
            // Simulate asset loading (replace with actual fetch)
            setTimeout(() => {
                // Remove from active loads
                const index = this.activeLoads.indexOf(loadId);
                if (index > -1) {
                    this.activeLoads.splice(index, 1);
                }
                
                // Create mock asset
                const asset = {
                    path: path,
                    data: { type: 'asset', path: path, loaded: true },
                    size: 1024 * 100, // 100KB
                    references: 1,
                    lastUsed: Date.now()
                };
                
                // Add to cache
                this.assetCache.set(path, asset);
                this.assetReferences.set(path, new Set());
                
                // Update memory usage
                this.memoryBudget.used += asset.size;
                this.memoryBudget.maxUsed = Math.max(this.memoryBudget.maxUsed, this.memoryBudget.used);
                
                resolve(asset.data);
            }, priority === 0 ? 100 : 50); // Higher priority loads faster
        });
    }
    
    unloadAsset(path) {
        if (!this.assetCache.has(path)) {
            return false;
        }
        
        const asset = this.assetCache.get(path);
        
        // Decrement references
        asset.references--;
        asset.lastUsed = Date.now();
        
        // Unload if no references
        if (asset.references <= 0) {
            // Free memory
            this.memoryBudget.used -= asset.size;
            this.stats.memoryFreed += asset.size;
            
            // Clean up
            if (asset.data.dispose) {
                asset.data.dispose();
            }
            
            // Remove from cache
            this.assetCache.delete(path);
            this.assetReferences.delete(path);
            
            return true;
        }
        
        return false;
    }
    
    referenceAsset(path, referenceId) {
        if (!this.assetReferences.has(path)) {
            return false;
        }
        
        const references = this.assetReferences.get(path);
        references.add(referenceId);
        
        // Update asset reference count
        if (this.assetCache.has(path)) {
            const asset = this.assetCache.get(path);
            asset.references = references.size;
            asset.lastUsed = Date.now();
        }
        
        return true;
    }
    
    dereferenceAsset(path, referenceId) {
        if (!this.assetReferences.has(path)) {
            return false;
        }
        
        const references = this.assetReferences.get(path);
        references.delete(referenceId);
        
        // Update asset reference count
        if (this.assetCache.has(path)) {
            const asset = this.assetCache.get(path);
            asset.references = references.size;
            asset.lastUsed = Date.now();
            
            // Unload if no references
            if (asset.references <= 0) {
                this.unloadAsset(path);
            }
        }
        
        return true;
    }
    
    startMemoryMonitoring() {
        // Monitor memory usage
        setInterval(() => {
            this.updateMemoryStats();
            
            // Check memory pressure
            if (this.memoryBudget.used > this.memoryBudget.total * 0.8) {
                this.triggerMemoryCleanup();
            }
        }, 5000); // Every 5 seconds
    }
    
    updateMemoryStats() {
        // Update memory usage estimate
        let estimatedMemory = 0;
        
        // Count pooled objects
        for (const [type, pool] of this.objectPools) {
            estimatedMemory += pool.stats.totalCreated * 1024; // ~1KB per object
        }
        
        // Count cached assets
        for (const asset of this.assetCache.values()) {
            estimatedMemory += asset.size;
        }
        
        this.memoryBudget.used = estimatedMemory;
        this.memoryBudget.maxUsed = Math.max(this.memoryBudget.maxUsed, estimatedMemory);
    }
    
    triggerMemoryCleanup() {
        console.log('Memory pressure detected, triggering cleanup');
        
        // Unload unused assets
        this.cleanupUnusedAssets();
        
        // Shrink object pools
        this.shrinkObjectPools();
        
        // Force garbage collection if available
        this.forceGarbageCollection();
    }
    
    cleanupUnusedAssets(maxAge = 60000) { // 60 seconds
        const now = Date.now();
        let unloadedCount = 0;
        
        for (const [path, asset] of this.assetCache) {
            // Check if asset is unused and old
            if (asset.references <= 0 && now - asset.lastUsed > maxAge) {
                if (this.unloadAsset(path)) {
                    unloadedCount++;
                }
            }
        }
        
        console.log(`Cleaned up ${unloadedCount} unused assets`);
        return unloadedCount;
    }
    
    shrinkObjectPools() {
        let shrunkCount = 0;
        
        for (const [type, pool] of this.objectPools) {
            // Remove excess inactive objects
            const targetSize = Math.floor(pool.maxSize * 0.7); // Reduce to 70%
            
            while (pool.objects.length > targetSize) {
                const obj = pool.objects.pop();
                this.destroyObject(obj);
                pool.stats.totalCreated--;
                shrunkCount++;
            }
        }
        
        console.log(`Shrunk object pools, removed ${shrunkCount} objects`);
        return shrunkCount;
    }
    
    forceGarbageCollection() {
        // Try to trigger garbage collection
        if (window.gc) {
            window.gc();
            console.log('Forced garbage collection');
        } else if (console && console.memory) {
            console.log('Manual garbage collection triggered');
        }
    }
    
    startGarbageCollection() {
        // Run periodic garbage collection
        setInterval(() => {
            this.cleanupUnusedAssets(30000); // 30 seconds
            this.lastGCTime = Date.now();
        }, this.gcInterval);
    }
    
    update(dt) {
        // Update object lifetimes
        this.updatePooledObjects(dt);
        
        // Update streaming based on player position
        this.updateAssetStreaming(dt);
    }
    
    updatePooledObjects(dt) {
        // Update active pooled objects
        for (const [type, pool] of this.objectPools) {
            for (const obj of pool.activeObjects) {
                if (obj.active && obj.lifetime !== undefined) {
                    obj.lifetime -= dt;
                    
                    if (obj.lifetime <= 0) {
                        obj.active = false;
                        this.returnPooledObject(type, obj);
                    }
                }
            }
        }
    }
    
    updateAssetStreaming(dt) {
        if (!this.streamingSettings.enabled || !this.game.player) {
            return;
        }
        
        const playerPos = this.game.player.position;
        
        // In a real implementation, this would:
        // 1. Determine which assets are within priority distance
        // 2. Load high-priority assets
        // 3. Unload assets beyond unload distance
        // 4. Adjust LOD based on distance
    }
    
    getStats() {
        return {
            memory: {
                used: this.memoryBudget.used,
                maxUsed: this.memoryBudget.maxUsed,
                budget: this.memoryBudget.total,
                percentage: (this.memoryBudget.used / this.memoryBudget.total) * 100
            },
            pools: {
                count: this.objectPools.size,
                totalObjects: Array.from(this.objectPools.values()).reduce((sum, pool) => sum + pool.stats.totalCreated, 0),
                activeObjects: Array.from(this.objectPools.values()).reduce((sum, pool) => sum + pool.stats.currentActive, 0),
                poolHits: this.stats.poolHits,
                poolMisses: this.stats.poolMisses,
                hitRate: this.stats.poolHits / (this.stats.poolHits + this.stats.poolMisses) || 0
            },
            cache: {
                size: this.assetCache.size,
                hits: this.stats.cacheHits,
                misses: this.stats.cacheMisses,
                hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0
            },
            objects: {
                created: this.stats.objectsCreated,
                destroyed: this.stats.objectsDestroyed,
                memoryFreed: this.stats.memoryFreed
            }
        };
    }
}
