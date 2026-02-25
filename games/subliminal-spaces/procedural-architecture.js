/**
 * Procedural Architecture System for Subliminal Spaces
 * Generates infinite liminal spaces with psychological horror elements
 */

export class ProceduralArchitecture {
    constructor(options = {}) {
        this.gridSize = options.gridSize || 16;
        this.cellSize = options.cellSize || 4;
        this.wallHeight = options.wallHeight || 3.5;
        this.seed = options.seed || Math.random() * 10000;
        
        // Liminal space themes
        this.themes = [
            'office',
            'mall',
            'school',
            'hospital',
            'hotel',
            'parking_garage',
            'pool_rooms',
            'backrooms'
        ];
        
        // Architectural elements per theme
        this.themeElements = {
            office: ['cubicle', 'desk', 'filing_cabinet', 'fluorescent_light', 'carpet_tile'],
            mall: ['storefront', 'kiosk', 'bench', 'plant', 'skylight'],
            school: ['locker', 'classroom_door', 'trophy_case', 'water_fountain'],
            hospital: ['gurney', 'iv_stand', 'wheelchair', 'hand_sanitizer'],
            hotel: ['luggage_cart', 'potted_plant', 'elevator_door', 'ice_machine'],
            parking_garage: ['concrete_pillar', 'parking_space', 'pay_station', 'exit_sign'],
            pool_rooms: ['tiled_wall', 'drain', 'underwater_bench', 'submerged_door'],
            backrooms: ['yellow_wallpaper', 'humming_light', 'damp_carpet', 'mono_yellow']
        };
        
        // Pareidolia configuration
        this.pareidoliaConfig = {
            baseChance: 0.02,
            faceTypes: ['eyes', 'mouth', 'full_face', 'shadow_figure'],
            intensityModifiers: {
                time_of_day: 1.0,
                player_sanity: 1.0,
                proximity_multiplier: 2.0
            }
        };
    }
    
    /**
     * Generate procedural architecture chunk
     */
    generateChunk(chunkX, chunkZ, theme = null) {
        const seed = this.hashCoordinates(chunkX, chunkZ);
        const random = this.seededRandom(seed);
        
        // Select theme if not specified
        if (!theme) {
            const themeIndex = Math.floor(random() * this.themes.length);
            theme = this.themes[themeIndex];
        }
        
        // Generate grid using WFC-like approach
        const grid = this.generateArchitecturalGrid(seed, theme);
        
        // Populate with props and details
        const populatedGrid = this.populateGrid(grid, theme, random);
        
        // Add pareidolia instances
        const withPareidolia = this.addPareidolia(populatedGrid, random);
        
        return {
            x: chunkX,
            z: chunkZ,
            theme: theme,
            grid: withPareidolia,
            seed: seed
        };
    }
    
    /**
     * Generate architectural grid layout
     */
    generateArchitecturalGrid(seed, theme) {
        const width = this.gridSize;
        const height = this.gridSize;
        const grid = [];
        
        // Initialize with empty cells
        for (let x = 0; x < width; x++) {
            grid[x] = [];
            for (let z = 0; z < height; z++) {
                grid[x][z] = {
                    type: 'empty',
                    rotation: 0,
                    props: [],
                    lighting: 'default',
                    pareidolia: null
                };
            }
        }
        
        // Generate rooms and corridors using BSP-like approach
        const random = this.seededRandom(seed);
        this.generateRooms(grid, random);
        this.generateCorridors(grid, random);
        this.addDetails(grid, theme, random);
        
        return grid;
    }
    
    /**
     * Generate rooms in the grid
     */
    generateRooms(grid, random) {
        const numRooms = 3 + Math.floor(random() * 4);
        
        for (let i = 0; i < numRooms; i++) {
            const roomWidth = 2 + Math.floor(random() * 3);
            const roomHeight = 2 + Math.floor(random() * 3);
            const startX = 1 + Math.floor(random() * (this.gridSize - roomWidth - 2));
            const startZ = 1 + Math.floor(random() * (this.gridSize - roomHeight - 2));
            
            // Place room
            for (let x = startX; x < startX + roomWidth; x++) {
                for (let z = startZ; z < startZ + roomHeight; z++) {
                    if (x < this.gridSize && z < this.gridSize) {
                        grid[x][z].type = 'room';
                        grid[x][z].roomId = i;
                    }
                }
            }
        }
    }
    
    /**
     * Connect rooms with corridors
     */
    generateCorridors(grid, random) {
        // Find room centers
        const roomCenters = [];
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                if (grid[x][z].type === 'room') {
                    const roomId = grid[x][z].roomId;
                    if (!roomCenters[roomId]) {
                        roomCenters[roomId] = { x: 0, z: 0, count: 0 };
                    }
                    roomCenters[roomId].x += x;
                    roomCenters[roomId].z += z;
                    roomCenters[roomId].count++;
                }
            }
        }
        
        // Calculate centers
        roomCenters.forEach(center => {
            if (center.count > 0) {
                center.x = Math.floor(center.x / center.count);
                center.z = Math.floor(center.z / center.count);
            }
        });
        
        // Connect rooms with L-shaped corridors
        for (let i = 0; i < roomCenters.length - 1; i++) {
            if (!roomCenters[i] || !roomCenters[i + 1]) continue;
            
            const start = roomCenters[i];
            const end = roomCenters[i + 1];
            
            // Horizontal segment
            const minX = Math.min(start.x, end.x);
            const maxX = Math.max(start.x, end.x);
            for (let x = minX; x <= maxX; x++) {
                if (grid[x] && grid[x][start.z] && grid[x][start.z].type === 'empty') {
                    grid[x][start.z].type = 'hallway';
                }
            }
            
            // Vertical segment
            const minZ = Math.min(start.z, end.z);
            const maxZ = Math.max(start.z, end.z);
            for (let z = minZ; z <= maxZ; z++) {
                if (grid[end.x] && grid[end.x][z] && grid[end.x][z].type === 'empty') {
                    grid[end.x][z].type = 'hallway';
                }
            }
        }
    }
    
    /**
     * Add details and props to grid
     */
    addDetails(grid, theme, random) {
        const elements = this.themeElements[theme] || this.themeElements.office;
        
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                const cell = grid[x][z];
                
                if (cell.type === 'room' || cell.type === 'hallway') {
                    // Add props
                    if (random() < 0.3) {
                        const elementIndex = Math.floor(random() * elements.length);
                        cell.props.push({
                            type: elements[elementIndex],
                            rotation: Math.floor(random() * 4) * 90
                        });
                    }
                    
                    // Add lighting variations
                    if (random() < 0.2) {
                        cell.lighting = random() < 0.5 ? 'dim' : 'flickering';
                    }
                }
            }
        }
    }
    
    /**
     * Add pareidolia instances to grid
     */
    addPareidolia(grid, random) {
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                const cell = grid[x][z];
                
                // Chance to spawn pareidolia
                if (cell.type === 'room' && random() < this.pareidoliaConfig.baseChance) {
                    const faceTypeIndex = Math.floor(random() * this.pareidoliaConfig.faceTypes.length);
                    
                    cell.pareidolia = {
                        type: this.pareidoliaConfig.faceTypes[faceTypeIndex],
                        x: x * this.cellSize + random() * this.cellSize,
                        y: 1.5 + random() * 2,
                        z: z * this.cellSize + random() * this.cellSize,
                        rotation: random() * Math.PI * 2,
                        scale: 0.5 + random() * 0.5,
                        intensity: 0.3 + random() * 0.7,
                        pulsePhase: random() * Math.PI * 2,
                        visible: false // Starts hidden, revealed by proximity
                    };
                }
            }
        }
        
        return grid;
    }
    
    /**
     * Hash coordinates for deterministic generation
     */
    hashCoordinates(x, z) {
        let hash = this.seed;
        hash = ((hash << 5) - hash) + x;
        hash = hash | 0;
        hash = ((hash << 5) - hash) + z;
        hash = hash | 0;
        return Math.abs(hash);
    }
    
    /**
     * Seeded random number generator
     */
    seededRandom(seed) {
        const m = 0x80000000;
        const a = 1103515245;
        const c = 12345;
        let state = seed ? seed : Math.floor(Math.random() * (m - 1));
        
        return function() {
            state = (a * state + c) % m;
            return state / (m - 1);
        };
    }
    
    /**
     * Get world position from grid coordinates
     */
    gridToWorld(gridX, gridZ) {
        return {
            x: gridX * this.cellSize,
            z: gridZ * this.cellSize
        };
    }
    
    /**
     * Get grid coordinates from world position
     */
    worldToGrid(worldX, worldZ) {
        return {
            x: Math.floor(worldX / this.cellSize),
            z: Math.floor(worldZ / this.cellSize)
        };
    }
}
