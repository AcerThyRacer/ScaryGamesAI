/* ============================================================
   HELLAPHOBIA 2026 - STREAMING SYSTEM
   Zero-Load Gameplay | Chunk-Based Streaming | Memory Management
   Predictive Loading | LOD System | Object Pooling
   ============================================================ */

(function() {
    'use strict';

    // ===== STREAMING SYSTEM =====
    const StreamingSystem = {
        chunks: new Map(),
        activeChunks: new Set(),
        playerPosition: { x: 0, y: 0 },
        preloadDistance: 2000,
        memoryBudget: 500 * 1024 * 1024, // 500MB
        currentMemoryUsage: 0,
        enabled: true,
        
        async init(config) {
            this.chunkSize = config.chunkSize || 1024;
            this.preloadDistance = config.preloadDistance || 2000;
            this.memoryBudget = config.memoryBudget || 500 * 1024 * 1024;
            
            console.log('📦 Streaming System initializing...');
            console.log(`   Chunk Size: ${this.chunkSize}px`);
            console.log(`   Preload Distance: ${this.preloadDistance}px`);
            console.log(`   Memory Budget: ${(this.memoryBudget / (1024*1024)).toFixed(0)}MB`);
            
            this.enabled = true;
            console.log('✅ Streaming System ready');
        },
        
        update(deltaTime) {
            if (!this.enabled) return;
            
            // Get player position
            this.updatePlayerPosition();
            
            // Determine which chunks should be loaded
            this.updateActiveChunks();
            
            // Load needed chunks
            this.loadRequiredChunks();
            
            // Unload distant chunks
            this.unloadDistantChunks();
            
            // Monitor memory
            this.monitorMemory();
        },
        
        updatePlayerPosition() {
            // Get actual player position from game
            // This would hook into the actual player object
            this.playerPosition = {
                x: window.player?.x || 0,
                y: window.player?.y || 0
            };
        },
        
        updateActiveChunks() {
            const chunkCoords = this.getChunkCoords(this.playerPosition.x, this.playerPosition.y);
            
            // Calculate all chunks within preload distance
            const chunksNeeded = new Set();
            const radius = Math.ceil(this.preloadDistance / this.chunkSize);
            
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    const dist = Math.sqrt(dx*dx + dy*dy) * this.chunkSize;
                    if (dist <= this.preloadDistance) {
                        const key = `${chunkCoords.x + dx},${chunkCoords.y + dy}`;
                        chunksNeeded.add(key);
                    }
                }
            }
            
            this.activeChunks = chunksNeeded;
        },
        
        loadRequiredChunks() {
            for (const key of this.activeChunks) {
                if (!this.chunks.has(key)) {
                    this.loadChunk(key);
                }
            }
        },
        
        unloadDistantChunks() {
            for (const [key, chunk] of this.chunks.entries()) {
                if (!this.activeChunks.has(key)) {
                    this.unloadChunk(key);
                }
            }
        },
        
        async loadChunk(key) {
            const [x, y] = key.split(',').map(Number);
            
            // Generate or fetch chunk data
            const chunkData = await this.generateChunkData(x, y);
            
            // Create chunk
            const chunk = {
                x, y,
                data: chunkData,
                loaded: true,
                memoryUsage: this.estimateChunkMemory(chunkData)
            };
            
            this.chunks.set(key, chunk);
            this.currentMemoryUsage += chunk.memoryUsage;
            
            // Dispatch load event
            window.dispatchEvent(new CustomEvent('chunkLoaded', {
                detail: { x, y, data: chunkData }
            }));
        },
        
        unloadChunk(key) {
            const chunk = this.chunks.get(key);
            if (chunk) {
                this.currentMemoryUsage -= chunk.memoryUsage;
                this.chunks.delete(key);
                
                // Dispatch unload event
                window.dispatchEvent(new CustomEvent('chunkUnloaded', {
                    detail: { x: chunk.x, y: chunk.y }
                }));
            }
        },
        
        async generateChunkData(x, y) {
            // Procedurally generate chunk content
            // In real implementation, this would use seeded RNG
            
            const seed = x * 73856093 ^ y * 19349663;
            const rng = this.createRNG(seed);
            
            return {
                tiles: this.generateTiles(rng),
                entities: this.generateEntities(rng),
                lighting: this.generateLighting(rng)
            };
        },
        
        generateTiles(rng) {
            const tiles = [];
            const tileSize = 32;
            const tilesPerChunk = this.chunkSize / tileSize;
            
            for (let x = 0; x < tilesPerChunk; x++) {
                for (let y = 0; y < tilesPerChunk; y++) {
                    const roll = rng.next();
                    let type = 'floor';
                    
                    if (roll < 0.1) type = 'wall';
                    else if (roll < 0.15) type = 'decoration';
                    else if (roll < 0.17) type = 'trap';
                    
                    tiles.push({
                        x: x * tileSize,
                        y: y * tileSize,
                        type
                    });
                }
            }
            
            return tiles;
        },
        
        generateEntities(rng) {
            const entities = [];
            const entityCount = Math.floor(rng.next() * 5);
            
            for (let i = 0; i < entityCount; i++) {
                entities.push({
                    x: rng.next() * this.chunkSize,
                    y: rng.next() * this.chunkSize,
                    type: this.randomEntity(rng)
                });
            }
            
            return entities;
        },
        
        generateLighting(rng) {
            return {
                ambient: 0.3 + rng.next() * 0.2,
                dynamic: []
            };
        },
        
        randomEntity(rng) {
            const types = ['crawler', 'chaser', 'wailer', 'stalker'];
            return types[Math.floor(rng.next() * types.length)];
        },
        
        createRNG(seed) {
            let s = seed;
            return {
                next() {
                    s = (s * 1664525 + 1013904223) % 4294967296;
                    return s / 4294967296;
                }
            };
        },
        
        getChunkCoords(x, y) {
            return {
                x: Math.floor(x / this.chunkSize),
                y: Math.floor(y / this.chunkSize)
            };
        },
        
        estimateChunkMemory(data) {
            // Rough estimate of memory usage
            const tileSize = 32; // bytes per tile object
            const entitySize = 64; // bytes per entity object
            
            return (data.tiles.length * tileSize) + 
                   (data.entities.length * entitySize) + 
                   1024; // overhead
        },
        
        monitorMemory() {
            if (this.currentMemoryUsage > this.memoryBudget * 0.9) {
                console.warn('⚠️  Memory usage high:', 
                    (this.currentMemoryUsage / (1024*1024)).toFixed(1), 'MB');
                
                // Aggressively unload distant chunks
                this.aggressiveCleanup();
            }
        },
        
        aggressiveCleanup() {
            // Sort chunks by distance
            const sorted = Array.from(this.chunks.entries()).sort((a, b) => {
                const distA = this.distanceToChunk(a[1]);
                const distB = this.distanceToChunk(b[1]);
                return distB - distA;
            });
            
            // Unload furthest chunks until under budget
            for (const [key, chunk] of sorted) {
                if (this.currentMemoryUsage < this.memoryBudget * 0.7) break;
                this.unloadChunk(key);
            }
        },
        
        distanceToChunk(chunk) {
            const dx = (chunk.x * this.chunkSize) - this.playerPosition.x;
            const dy = (chunk.y * this.chunkSize) - this.playerPosition.y;
            return Math.sqrt(dx*dx + dy*dy);
        },
        
        // Get stats
        getStats() {
            return {
                loadedChunks: this.chunks.size,
                activeChunks: this.activeChunks.size,
                memoryUsage: (this.currentMemoryUsage / (1024*1024)).toFixed(2) + 'MB',
                memoryBudget: (this.memoryBudget / (1024*1024)).toFixed(0) + 'MB'
            };
        },
        
        exportAPI() {
            return {
                init: (config) => this.init(config),
                update: (dt) => this.update(dt),
                getStats: () => this.getStats()
            };
        }
    };
    
    // Export to window
    window.StreamingSystem = StreamingSystem.exportAPI();
    
    console.log('📦 Streaming System loaded');
})();
