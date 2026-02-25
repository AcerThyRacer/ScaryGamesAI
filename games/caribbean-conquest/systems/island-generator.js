// Caribbean Conquest - Island Generator System
// Phase 2: Procedural island generation using WFC with biomes and terrain features

class IslandGenerator {
    constructor(game) {
        this.game = game;
        this.wfc = null;
        
        // Island configuration
        this.config = {
            gridSize: 64, // 64x64 tiles per island
            tileSize: 10, // 10 meters per tile
            maxIslands: 50,
            viewDistance: 5, // chunks
            chunkSize: 512 // meters
        };
        
        // Biome definitions
        this.biomes = this.defineBiomes();
        
        // Generated islands cache
        this.islands = new Map();
        this.activeChunks = new Set();
        
        // World state
        this.worldState = {
            discoveredIslands: [],
            factionTerritories: {},
            playerAlterations: {},
            generatedSeeds: new Set()
        };
    }
    
    defineBiomes() {
        return {
            tropical: {
                name: 'Tropical Paradise',
                color: 0x4CAF50,
                waterColor: 0x2196F3,
                temperature: 30, // Celsius
                humidity: 0.8,
                hazards: ['storms', 'reefs'],
                flora: ['palm_trees', 'jungle', 'flowers'],
                fauna: ['parrots', 'monkeys', 'turtles'],
                resources: ['coconuts', 'bananas', 'spices'],
                pointsOfInterest: ['beach', 'lagoon', 'waterfall', 'ancient_temple'],
                tileWeights: {
                    beach: 25,
                    jungle: 30,
                    mountain: 10,
                    river: 15,
                    village: 5,
                    ruins: 5,
                    port: 10
                }
            },
            volcanic: {
                name: 'Volcanic Island',
                color: 0x795548,
                waterColor: 0x607D8B,
                temperature: 45,
                humidity: 0.3,
                hazards: ['lava', 'ash_storms', 'earthquakes'],
                flora: ['volcanic_moss', 'hardy_shrubs'],
                fauna: ['lizards', 'volcanic_crabs'],
                resources: ['obsidian', 'sulfur', 'precious_gems'],
                pointsOfInterest: ['volcano', 'lava_caves', 'hot_springs', 'mineral_deposits'],
                tileWeights: {
                    volcanic_rock: 40,
                    lava_flow: 15,
                    ash_plain: 20,
                    cave_entrance: 10,
                    mineral_vein: 10,
                    ancient_forge: 5
                }
            },
            jungle: {
                name: 'Dense Jungle',
                color: 0x388E3C,
                waterColor: 0x1976D2,
                temperature: 28,
                humidity: 0.9,
                hazards: ['quicksand', 'predators', 'disease'],
                flora: ['dense_jungle', 'vines', 'giant_trees'],
                fauna: ['jaguars', 'snakes', 'exotic_birds'],
                resources: ['hardwood', 'medicinal_plants', 'exotic_furs'],
                pointsOfInterest: ['hidden_temple', 'river_delta', 'canopy_village', 'sacred_pool'],
                tileWeights: {
                    jungle: 40,
                    river: 20,
                    swamp: 15,
                    clearing: 10,
                    ruins: 10,
                    native_village: 5
                }
            },
            arctic: {
                name: 'Arctic Island',
                color: 0xE3F2FD,
                waterColor: 0x81D4FA,
                temperature: -10,
                humidity: 0.6,
                hazards: ['icebergs', 'blizzards', 'thin_ice'],
                flora: ['snow_pines', 'lichen', 'arctic_moss'],
                fauna: ['polar_bears', 'seals', 'arctic_foxes'],
                resources: ['whale_blubber', 'arctic_furs', 'ice_crystals'],
                pointsOfInterest: ['ice_caves', 'frozen_wreck', 'whaling_station', 'northern_lights'],
                tileWeights: {
                    snow: 30,
                    ice: 25,
                    frozen_forest: 20,
                    glacier: 15,
                    fishing_village: 5,
                    shipwreck: 5
                }
            },
            desert: {
                name: 'Desert Island',
                color: 0xFF9800,
                waterColor: 0x00BCD4,
                temperature: 35,
                humidity: 0.1,
                hazards: ['sandstorms', 'dehydration', 'quicksand'],
                flora: ['cacti', 'dry_brush'],
                fauna: ['scorpions', 'vultures', 'desert_foxes'],
                resources: ['gold', 'precious_stones', 'ancient_relics'],
                pointsOfInterest: ['oasis', 'pyramid', 'canyon', 'lost_city'],
                tileWeights: {
                    sand: 40,
                    dunes: 25,
                    rock_formations: 15,
                    oasis: 10,
                    ruins: 5,
                    cave: 5
                }
            }
        };
    }
    
    init() {
        console.log('Island Generator initialized');
        
        // Initialize WFC with island tiles
        this.wfc = new WaveFunctionCollapse({
            tiles: this.getIslandTiles(),
            adjacencyRules: this.getIslandRules()
        });
        
        // Load world state from storage
        this.loadWorldState();
        
        return true;
    }
    
    getIslandTiles() {
        // Combine tiles from all biomes
        const tiles = [];
        
        // Common tiles across all biomes
        const commonTiles = [
            { id: 'water_deep', weight: 100, type: 'water', biome: 'all' },
            { id: 'water_shallow', weight: 80, type: 'water', biome: 'all' },
            { id: 'beach', weight: 60, type: 'shore', biome: 'all' },
            { id: 'port', weight: 5, type: 'structure', biome: 'all' },
            { id: 'shipwreck', weight: 3, type: 'structure', biome: 'all' },
            { id: 'treasure', weight: 2, type: 'special', biome: 'all' }
        ];
        
        tiles.push(...commonTiles);
        
        // Biome-specific tiles
        for (const [biomeId, biome] of Object.entries(this.biomes)) {
            for (const [tileId, weight] of Object.entries(biome.tileWeights)) {
                tiles.push({
                    id: `${biomeId}_${tileId}`,
                    weight: weight,
                    type: this.getTileType(tileId),
                    biome: biomeId
                });
            }
        }
        
        return tiles;
    }
    
    getTileType(tileId) {
        const typeMap = {
            beach: 'shore',
            jungle: 'land',
            mountain: 'land',
            river: 'water',
            village: 'structure',
            ruins: 'structure',
            port: 'structure',
            volcanic_rock: 'land',
            lava_flow: 'hazard',
            ash_plain: 'land',
            cave_entrance: 'structure',
            mineral_vein: 'resource',
            snow: 'land',
            ice: 'hazard',
            frozen_forest: 'land',
            glacier: 'land',
            sand: 'land',
            dunes: 'land',
            rock_formations: 'land',
            oasis: 'resource'
        };
        
        return typeMap[tileId] || 'land';
    }
    
    getIslandRules() {
        return {
            // Water connects to water, shore, and some structures
            'water': ['water', 'shore', 'structure'],
            // Shore connects to water and land
            'shore': ['water', 'land', 'structure'],
            // Land connects to land, shore, and structures
            'land': ['land', 'shore', 'structure', 'resource', 'hazard'],
            // Structures can be on land or shore
            'structure': ['land', 'shore'],
            // Resources are on land
            'resource': ['land'],
            // Hazards can be on land or water
            'hazard': ['land', 'water'],
            // Special tiles can be anywhere
            'special': ['land', 'shore', 'water', 'structure']
        };
    }
    
    // Generate a new island
    generateIsland(biomeType = null, seed = null) {
        const biome = biomeType || this.getRandomBiome();
        const islandSeed = seed || Date.now() + Math.random() * 10000;
        
        // Avoid duplicate seeds
        if (this.worldState.generatedSeeds.has(islandSeed)) {
            return this.generateIsland(biome, islandSeed + 1);
        }
        
        console.log(`Generating ${biome} island with seed ${islandSeed}`);
        
        // Initialize WFC grid
        this.wfc.initialize(this.config.gridSize, this.config.gridSize, islandSeed);
        
        // Generate island
        const success = this.wfc.generate();
        if (!success) {
            console.error('Failed to generate island');
            return null;
        }
        
        // Get the generated grid
        const grid = this.wfc.getGrid();
        
        // Create island object
        const island = {
            id: `island_${islandSeed}`,
            seed: islandSeed,
            biome: biome,
            grid: grid,
            position: this.getIslandPosition(),
            size: this.config.gridSize * this.config.tileSize,
            discovered: false,
            pointsOfInterest: this.generatePointsOfInterest(biome, grid),
            resources: this.generateResources(biome),
            hazards: this.generateHazards(biome),
            faction: this.getRandomFaction(),
            quests: [] // Will be populated by quest system
        };
        
        // Add to cache
        this.islands.set(island.id, island);
        this.worldState.generatedSeeds.add(islandSeed);
        
        // Save world state
        this.saveWorldState();
        
        return island;
    }
    
    getRandomBiome() {
        const biomeKeys = Object.keys(this.biomes);
        return biomeKeys[Math.floor(Math.random() * biomeKeys.length)];
    }
    
    getIslandPosition() {
        // Generate position in world space
        // For now, place islands in a grid pattern
        const islandCount = this.islands.size;
        const gridX = Math.floor(islandCount / 10);
        const gridZ = islandCount % 10;
        
        return {
            x: gridX * (this.config.gridSize * this.config.tileSize + 1000),
            z: gridZ * (this.config.gridSize * this.config.tileSize + 1000)
        };
    }
    
    generatePointsOfInterest(biome, grid) {
        const biomeData = this.biomes[biome];
        const poiCount = 3 + Math.floor(Math.random() * 4); // 3-6 POIs
        const pois = [];
        
        // Always include a port
        pois.push({
            type: 'port',
            position: this.findSuitableLocation(grid, 'shore'),
            faction: this.getRandomFaction(),
            services: ['repair', 'trade', 'quests']
        });
        
        // Add random POIs from biome list
        const availablePois = [...biomeData.pointsOfInterest];
        for (let i = 1; i < poiCount && availablePois.length > 0; i++) {
            const poiIndex = Math.floor(Math.random() * availablePois.length);
            const poiType = availablePois.splice(poiIndex, 1)[0];
            
            pois.push({
                type: poiType,
                position: this.findSuitableLocation(grid, 'land'),
                rewards: this.generatePoiRewards(poiType)
            });
        }
        
        return pois;
    }
    
    findSuitableLocation(grid, tileType) {
        // Find a suitable tile in the grid
        const suitableTiles = [];
        
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const tile = grid[y][x];
                if (tile && tile.type === tileType) {
                    suitableTiles.push({ x, y });
                }
            }
        }
        
        if (suitableTiles.length === 0) {
            // Default to center
            return { 
                x: Math.floor(grid[0].length / 2),
                y: Math.floor(grid.length / 2)
            };
        }
        
        return suitableTiles[Math.floor(Math.random() * suitableTiles.length)];
    }
    
    generatePoiRewards(poiType) {
        const rewards = {
            ancient_temple: ['gold', 'relics', 'ancient_knowledge'],
            volcano: ['obsidian', 'sulfur', 'precious_gems'],
            hidden_temple: ['treasure', 'maps', 'artifacts'],
            ice_caves: ['ice_crystals', 'arctic_furs', 'fossils'],
            pyramid: ['gold', 'precious_stones', 'cursed_artifacts'],
            oasis: ['water', 'food', 'medicinal_plants']
        };
        
        return rewards[poiType] || ['treasure', 'resources'];
    }
    
    generateResources(biome) {
        const biomeData = this.biomes[biome];
        const resourceCount = 2 + Math.floor(Math.random() * 3); // 2-4 resources
        const resources = [];
        
        for (let i = 0; i < resourceCount; i++) {
            const resourceList = biomeData.resources;
            const resource = resourceList[Math.floor(Math.random() * resourceList.length)];
            
            resources.push({
                type: resource,
                quantity: 10 + Math.floor(Math.random() * 40),
                quality: 0.5 + Math.random() * 0.5 // 0.5-1.0
            });
        }
        
        return resources;
    }
    
    generateHazards(biome) {
        const biomeData = this.biomes[biome];
        const hazardCount = 1 + Math.floor(Math.random() * 2); // 1-2 hazards
        const hazards = [];
        
        for (let i = 0; i < hazardCount; i++) {
            const hazardList = biomeData.hazards;
            const hazard = hazardList[Math.floor(Math.random() * hazardList.length)];
            
            hazards.push({
                type: hazard,
                severity: 0.3 + Math.random() * 0.7, // 0.3-1.0
                location: this.getRandomLocation()
            });
        }
        
        return hazards;
    }
    
    getRandomFaction() {
        const factions = ['pirates', 'navy', 'merchants', 'natives', 'smugglers', 'none'];
        return factions[Math.floor(Math.random() * factions.length)];
    }
    
    getRandomLocation() {
        return {
            x: Math.floor(Math.random() * this.config.gridSize),
            y: Math.floor(Math.random() * this.config.gridSize)
        };
    }
    
    // Load islands around player position
    loadChunksAround(position) {
        const chunkX = Math.floor(position.x / this.config.chunkSize);
        const chunkZ = Math.floor(position.z / this.config.chunkSize);
        
        const chunksToLoad = [];
        
        // Load chunks within view distance
        for (let dx = -this.config.viewDistance; dx <= this.config.viewDistance; dx++) {
            for (let dz = -this.config.viewDistance; dz <= this.config.viewDistance; dz++) {
                const chunkId = `${chunkX + dx}_${chunkZ + dz}`;
                chunksToLoad.push(chunkId);
            }
        }
        
        // Unload distant chunks
        for (const chunkId of this.activeChunks) {
            if (!chunksToLoad.includes(chunkId)) {
                this.unloadChunk(chunkId);
            }
        }
        
        // Load new chunks
        for (const chunkId of chunksToLoad) {
            if (!this.activeChunks.has(chunkId)) {
                this.loadChunk(chunkId);
            }
        }
    }
    
    loadChunk(chunkId) {
        // Generate or load islands in this chunk
        const [chunkX, chunkZ] = chunkId.split('_').map(Number);
        
        // Check if islands already exist in this chunk
        const existingIslands = Array.from(this.islands.values()).filter(island => {
            const islandChunkX = Math.floor(island.position.x / this.config.chunkSize);
            const islandChunkZ = Math.floor(island.position.z / this.config.chunkSize);
            return islandChunkX === chunkX && islandChunkZ === chunkZ;
        });
        
        // Generate new islands if needed
        if (existingIslands.length === 0 && this.islands.size < this.config.maxIslands) {
            const island = this.generateIsland();
            // Position island in chunk
            island.position.x = chunkX * this.config.chunkSize + 
                Math.random() * (this.config.chunkSize - this.config.gridSize * this.config.tileSize);
            island.position.z = chunkZ * this.config.chunkSize + 
                Math.random() * (this.config.chunkSize - this.config.gridSize * this.config.tileSize);
        }
        
        this.activeChunks.add(chunkId);
    }
    
    unloadChunk(chunkId) {
        // Unload islands in this chunk (keep in cache, just not rendered)
        this.activeChunks.delete(chunkId);
    }
    
    // Update based on player position
    update(dt) {
        if (this.game.player) {
            const playerPos = this.game.player.position;
            this.loadChunksAround(playerPos);
        }
    }
    
    // Save/load world state
    saveWorldState() {
        try {
            const data = {
                discoveredIslands: this.worldState.discoveredIslands,
                factionTerritories: this.worldState.factionTerritories,
                playerAlterations: this.worldState.playerAlterations,
                generatedSeeds: Array.from(this.worldState.generatedSeeds)
            };
            localStorage.setItem('caribbean_conquest_world', JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save world state:', e);
        }
    }
    
    loadWorldState() {
        try {
            const data = localStorage.getItem('caribbean_conquest_world');
            if (data) {
                const parsed = JSON.parse(data);
                this.worldState.discoveredIslands = parsed.discoveredIslands || [];
                this.worldState.factionTerritories = parsed.factionTerritories || {};
                this.worldState.playerAlterations = parsed.playerAlterations || {};
                this.worldState.generatedSeeds = new Set(parsed.generatedSeeds || []);
                console.log('World state loaded from storage');
            }
        } catch (e) {
            console.error('Failed to load world state:', e);
        }
    }
    
    // Get island at position
    getIslandAt(position) {
        for (const island of this.islands.values()) {
            const islandSize = island.size;
            const islandPos = island.position;
            
            if (Math.abs(position.x - islandPos.x) < islandSize / 2 &&
                Math.abs(position.z - islandPos.z) < islandSize / 2) {
                return island;
            }
        }
        return null;
    }
    
    // Mark island as discovered
    discoverIsland(islandId) {
        const island = this.islands.get(islandId);
        if (island && !island.discovered) {
            island.discovered = true;
            if (!this.worldState.discoveredIslands.includes(islandId)) {
                this.worldState.discoveredIslands.push(islandId);
            }
            this.saveWorldState();
            
            // Award discovery bonus
            if (this.game.skillTree) {
                this.game.skillTree.awardPoints(5); // 5 skill points for discovery
            }
            
            return true;
        }
        return false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IslandGenerator;
}