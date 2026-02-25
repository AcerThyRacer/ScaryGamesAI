/**
 * Wave Function Collapse (WFC) Procedural Generation
 * 
 * Implements the WFC algorithm for constraint-based procedural level generation.
 * Creates coherent, non-repetitive patterns by propagating adjacency constraints.
 * 
 * @module core/procedural/wfc
 */

const WFC = (function() {
    'use strict';

    /**
     * Wave Function Collapse generator class
     */
    class WaveFunctionCollapse {
        /**
         * Create a WFC generator
         * @param {Object} config - Configuration object
         * @param {Array} config.tiles - Array of tile definitions
         * @param {Object} config.adjacencyRules - Adjacency constraints
         */
        constructor(config = {}) {
            this.tiles = config.tiles || this._getDefaultTiles();
            this.adjacencyRules = config.adjacencyRules || this._getDefaultRules();
            this.grid = null;
            this.observed = null;
            this.width = 0;
            this.height = 0;
            this.seed = 0;
            this.rng = null;
        }

        /**
         * Get default tile set for horror dungeon generation
         * @returns {Array} Default tiles
         */
        _getDefaultTiles() {
            return [
                { id: 'floor_normal', weight: 40, type: 'floor' },
                { id: 'floor_damaged', weight: 20, type: 'floor' },
                { id: 'floor_bloody', weight: 10, type: 'floor' },
                { id: 'floor_cracked', weight: 15, type: 'floor' },
                { id: 'wall_solid', weight: 30, type: 'wall' },
                { id: 'wall_broken', weight: 15, type: 'wall' },
                { id: 'wall_door', weight: 10, type: 'wall' },
                { id: 'wall_secret', weight: 3, type: 'wall' },
                { id: 'spawn_player', weight: 1, type: 'special' },
                { id: 'spawn_enemy', weight: 5, type: 'special' },
                { id: 'loot_common', weight: 15, type: 'special' },
                { id: 'loot_rare', weight: 5, type: 'special' },
                { id: 'trap_spike', weight: 8, type: 'special' },
                { id: 'trap_pit', weight: 5, type: 'special' },
                { id: 'exit', weight: 1, type: 'special' },
                { id: 'corridor', weight: 25, type: 'corridor' },
                { id: 'room_corner', weight: 10, type: 'room' },
                { id: 'room_edge', weight: 20, type: 'room' },
                { id: 'room_center', weight: 15, type: 'room' }
            ];
        }

        /**
         * Get default adjacency rules
         * @returns {Object} Adjacency constraints
         */
        _getDefaultRules() {
            return {
                // Floor can connect to floor, corridor, room, and special tiles
                'floor': ['floor', 'corridor', 'room', 'special'],
                // Wall connects to wall and door
                'wall': ['wall'],
                // Corridor connects to floor, corridor, room
                'corridor': ['floor', 'corridor', 'room'],
                // Room tiles connect to room, corridor, floor
                'room': ['room', 'corridor', 'floor'],
                // Special tiles can be placed on floor
                'special': ['floor', 'corridor', 'room']
            };
        }

        /**
         * Initialize the grid with superposition of all possible tiles
         * @param {number} width - Grid width
         * @param {number} height - Grid height
         * @param {number} seed - Random seed
         */
        initialize(width, height, seed = Math.random() * 10000) {
            this.width = width;
            this.height = height;
            this.seed = seed;
            this.rng = this._createRNG(seed);

            // Each cell contains a set of possible tile indices
            this.grid = [];
            this.observed = [];

            for (let y = 0; y < height; y++) {
                this.grid[y] = [];
                this.observed[y] = [];
                for (let x = 0; x < width; x++) {
                    // Start with all tiles possible (weighted)
                    const possibilities = [];
                    for (let i = 0; i < this.tiles.length; i++) {
                        possibilities.push(i);
                    }
                    this.grid[y][x] = possibilities;
                    this.observed[y][x] = null;
                }
            }
        }

        /**
         * Create a seeded random number generator
         * @param {number} seed - Seed value
         * @returns {Function} RNG function returning 0-1
         */
        _createRNG(seed) {
            let state = seed;
            return function() {
                state = (state * 1103515245 + 12345) & 0x7fffffff;
                return state / 0x7fffffff;
            };
        }

        /**
         * Calculate entropy (number of possibilities) for a cell
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @returns {number} Entropy value
         */
        getEntropy(x, y) {
            if (!this.grid[y][x]) return Infinity;
            return this.grid[y][x].length;
        }

        /**
         * Find the cell with the lowest entropy (fewest possibilities)
         * @returns {Object|null} Cell coordinates or null if done
         */
        findLowestEntropyCell() {
            let minEntropy = Infinity;
            let candidates = [];

            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (this.observed[y][x] !== null) continue;

                    const entropy = this.grid[y][x].length;
                    if (entropy < minEntropy && entropy > 1) {
                        minEntropy = entropy;
                        candidates = [{ x, y }];
                    } else if (entropy === minEntropy) {
                        candidates.push({ x, y });
                    }
                }
            }

            if (candidates.length === 0) return null;

            // Random selection among lowest entropy cells
            return candidates[Math.floor(this.rng() * candidates.length)];
        }

        /**
         * Collapse a cell to a single tile based on weights
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @returns {number} Selected tile index
         */
        collapseCell(x, y) {
            const possibilities = this.grid[y][x];
            if (possibilities.length === 1) {
                return possibilities[0];
            }

            // Calculate total weight
            let totalWeight = 0;
            const weights = [];
            for (const idx of possibilities) {
                const weight = this.tiles[idx].weight || 1;
                weights.push(weight);
                totalWeight += weight;
            }

            // Weighted random selection
            let random = this.rng() * totalWeight;
            let selected = possibilities[0];
            
            for (let i = 0; i < possibilities.length; i++) {
                random -= weights[i];
                if (random <= 0) {
                    selected = possibilities[i];
                    break;
                }
            }

            // Set the cell to only this tile
            this.grid[y][x] = [selected];
            this.observed[y][x] = selected;

            return selected;
        }

        /**
         * Get tile type from tile index
         * @param {number} tileIndex - Tile index
         * @returns {string} Tile type
         */
        getTileType(tileIndex) {
            return this.tiles[tileIndex].type;
        }

        /**
         * Check if two tile types can be adjacent
         * @param {string} type1 - First tile type
         * @param {string} type2 - Second tile type
         * @returns {boolean} Can be adjacent
         */
        canBeAdjacent(type1, type2) {
            const allowed = this.adjacencyRules[type1];
            if (!allowed) return false;
            return allowed.includes(type2);
        }

        /**
         * Propagate constraints to neighboring cells
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @returns {boolean} True if propagation succeeded
         */
        propagate(x, y) {
            const observedTile = this.observed[y][x];
            if (observedTile === null) return true;

            const observedType = this.getTileType(observedTile);
            const stack = [{ x, y }];
            const visited = new Set();

            while (stack.length > 0) {
                const current = stack.pop();
                const cx = current.x;
                const cy = current.y;
                const key = `${cx},${cy}`;

                if (visited.has(key)) continue;
                visited.add(key);

                const neighbors = [
                    { x: cx - 1, y: cy, dir: 'left' },
                    { x: cx + 1, y: cy, dir: 'right' },
                    { x: cx, y: cy - 1, dir: 'up' },
                    { x: cx, y: cy + 1, dir: 'down' }
                ];

                for (const neighbor of neighbors) {
                    const nx = neighbor.x;
                    const ny = neighbor.y;

                    // Skip out of bounds
                    if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
                        continue;
                    }

                    // Skip already observed cells
                    if (this.observed[ny][nx] !== null) continue;

                    const possibilities = this.grid[ny][nx];
                    const originalLength = possibilities.length;

                    // Remove impossible tiles
                    const newPossibilities = possibilities.filter(idx => {
                        const tileType = this.getTileType(idx);
                        return this.canBeAdjacent(observedType, tileType) ||
                               this.canBeAdjacent(tileType, observedType);
                    });

                    if (newPossibilities.length < originalLength) {
                        this.grid[ny][nx] = newPossibilities;

                        // If only one possibility left, observe and propagate
                        if (newPossibilities.length === 1) {
                            this.observed[ny][nx] = newPossibilities[0];
                            stack.push({ x: nx, y: ny });
                        }

                        // Contradiction detected
                        if (newPossibilities.length === 0) {
                            return false;
                        }
                    }
                }
            }

            return true;
        }

        /**
         * Generate a complete level using WFC
         * @param {number} width - Grid width
         * @param {number} height - Grid height
         * @param {number} seed - Random seed
         * @param {Object} options - Generation options
         * @returns {Object|null} Generated level or null if failed
         */
        generate(width, height, seed = Math.random() * 10000, options = {}) {
            const maxIterations = options.maxIterations || width * height * 10;
            const allowBacktrack = options.allowBacktrack !== false;

            this.initialize(width, height, seed);

            // Set initial constraints (e.g., player spawn at specific location)
            if (options.playerSpawn) {
                const { x, y } = options.playerSpawn;
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    const spawnTile = this.tiles.findIndex(t => t.id === 'spawn_player');
                    if (spawnTile !== -1) {
                        this.grid[y][x] = [spawnTile];
                        this.observed[y][x] = spawnTile;
                        this.propagate(x, y);
                    }
                }
            }

            // Set exit location
            if (options.exitSpawn) {
                const { x, y } = options.exitSpawn;
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    const exitTile = this.tiles.findIndex(t => t.id === 'exit');
                    if (exitTile !== -1) {
                        this.grid[y][x] = [exitTile];
                        this.observed[y][x] = exitTile;
                        this.propagate(x, y);
                    }
                }
            }

            let iterations = 0;
            const history = []; // For backtracking

            while (iterations < maxIterations) {
                const cell = this.findLowestEntropyCell();

                // No more cells to collapse - generation complete
                if (cell === null) {
                    break;
                }

                // Save state for potential backtrack
                if (allowBacktrack) {
                    history.push({
                        grid: this.grid.map(row => row.map(cells => [...cells])),
                        observed: this.observed.map(row => [...row])
                    });
                }

                // Collapse the cell
                this.collapseCell(cell.x, cell.y);

                // Propagate constraints
                const success = this.propagate(cell.x, cell.y);

                // Handle contradiction
                if (!success && allowBacktrack && history.length > 0) {
                    // Backtrack to previous state
                    const prevState = history.pop();
                    this.grid = prevState.grid;
                    this.observed = prevState.observed;
                    
                    // Try collapsing with different tile
                    const possibilities = this.grid[cell.y][cell.x];
                    if (possibilities.length > 1) {
                        // Remove the failed tile and try again
                        const failedTile = this.observed[cell.y][cell.x];
                        this.grid[cell.y][cell.x] = possibilities.filter(
                            idx => idx !== failedTile
                        );
                    }
                    continue;
                }

                iterations++;
            }

            // Check if generation succeeded
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (this.observed[y][x] === null) {
                        return null; // Failed to complete
                    }
                }
            }

            return this.getResult();
        }

        /**
         * Get the generated level as a 2D array of tile data
         * @returns {Array} 2D array of tile objects
         */
        getResult() {
            const result = [];
            for (let y = 0; y < this.height; y++) {
                result[y] = [];
                for (let x = 0; x < this.width; x++) {
                    const tileIndex = this.observed[y][x];
                    const tile = this.tiles[tileIndex];
                    result[y][x] = {
                        ...tile,
                        x,
                        y,
                        index: tileIndex
                    };
                }
            }
            return result;
        }

        /**
         * Get the raw grid data
         * @returns {Array} Raw grid
         */
        getGrid() {
            return this.grid;
        }

        /**
         * Get the observed grid
         * @returns {Array} Observed grid
         */
        getObserved() {
            return this.observed;
        }

        /**
         * Render the grid to a simple string representation
         * @returns {string} String representation
         */
        renderToString() {
            let result = '';
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const tileIndex = this.observed[y][x];
                    if (tileIndex === null) {
                        result += '?';
                    } else {
                        const tile = this.tiles[tileIndex];
                        // Use first character of tile type
                        result += tile.type.charAt(0).toUpperCase();
                    }
                }
                result += '\n';
            }
            return result;
        }

        /**
         * Export the level for use in a game
         * @param {Array} grid - Generated grid
         * @param {Object} options - Export options
         * @returns {Object} Exported level data
         */
        exportLevel(grid, options = {}) {
            const level = {
                width: this.width,
                height: this.height,
                seed: this.seed,
                tiles: [],
                entities: [],
                metadata: {
                    generatedAt: Date.now(),
                    algorithm: 'wfc',
                    version: '1.0'
                }
            };

            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const tile = grid[y][x];
                    level.tiles.push({
                        x,
                        y,
                        id: tile.id,
                        type: tile.type
                    });

                    // Extract entities from special tiles
                    if (tile.type === 'special') {
                        level.entities.push({
                            type: this._getEntityType(tile.id),
                            x,
                            y,
                            properties: {}
                        });
                    }
                }
            }

            return level;
        }

        /**
         * Get entity type from tile ID
         * @param {string} tileId - Tile ID
         * @returns {string} Entity type
         */
        _getEntityType(tileId) {
            if (tileId.includes('spawn_player')) return 'player_spawn';
            if (tileId.includes('spawn_enemy')) return 'enemy_spawn';
            if (tileId.includes('loot_rare')) return 'loot_rare';
            if (tileId.includes('loot_common')) return 'loot_common';
            if (tileId.includes('trap')) return 'trap';
            if (tileId.includes('exit')) return 'exit';
            return 'unknown';
        }
    }

    /**
     * Create a WFC generator with preset configurations
     * @param {string} preset - Preset name
     * @returns {WaveFunctionCollapse} Configured WFC generator
     */
    function createPreset(preset) {
        const presets = {
            dungeon: {
                tiles: [
                    { id: 'floor', weight: 30, type: 'floor' },
                    { id: 'wall', weight: 25, type: 'wall' },
                    { id: 'door', weight: 10, type: 'door' },
                    { id: 'corridor', weight: 20, type: 'corridor' },
                    { id: 'room', weight: 15, type: 'room' },
                    { id: 'treasure', weight: 5, type: 'special' },
                    { id: 'monster', weight: 8, type: 'special' },
                    { id: 'stairs', weight: 2, type: 'special' }
                ],
                adjacencyRules: {
                    'floor': ['floor', 'corridor', 'room', 'door', 'special'],
                    'wall': ['wall', 'door'],
                    'door': ['wall', 'floor', 'corridor'],
                    'corridor': ['floor', 'corridor', 'room', 'door'],
                    'room': ['room', 'corridor', 'floor', 'door'],
                    'special': ['floor', 'room']
                }
            },
            maze: {
                tiles: [
                    { id: 'path', weight: 40, type: 'path' },
                    { id: 'wall', weight: 35, type: 'wall' },
                    { id: 'start', weight: 1, type: 'special' },
                    { id: 'end', weight: 1, type: 'special' },
                    { id: 'junction', weight: 15, type: 'junction' },
                    { id: 'dead_end', weight: 10, type: 'dead_end' }
                ],
                adjacencyRules: {
                    'path': ['path', 'junction', 'dead_end', 'special'],
                    'wall': ['wall'],
                    'junction': ['path', 'junction'],
                    'dead_end': ['path'],
                    'special': ['path', 'junction']
                }
            },
            horror: {
                tiles: [
                    { id: 'floor_normal', weight: 35, type: 'floor' },
                    { id: 'floor_bloody', weight: 15, type: 'floor' },
                    { id: 'floor_damaged', weight: 20, type: 'floor' },
                    { id: 'wall_solid', weight: 30, type: 'wall' },
                    { id: 'wall_broken', weight: 15, type: 'wall' },
                    { id: 'darkness', weight: 10, type: 'darkness' },
                    { id: 'light', weight: 8, type: 'light' },
                    { id: 'enemy_spawn', weight: 5, type: 'special' },
                    { id: 'item_spawn', weight: 7, type: 'special' },
                    { id: 'jumpscare', weight: 3, type: 'special' },
                    { id: 'safe_zone', weight: 2, type: 'special' }
                ],
                adjacencyRules: {
                    'floor': ['floor', 'darkness', 'light', 'special'],
                    'wall': ['wall'],
                    'darkness': ['floor', 'darkness', 'light'],
                    'light': ['floor', 'darkness', 'light'],
                    'special': ['floor', 'light']
                }
            }
        };

        const config = presets[preset] || presets.dungeon;
        return new WaveFunctionCollapse(config);
    }

    // Public API
    return {
        WaveFunctionCollapse,
        createPreset,
        VERSION: '1.0.0'
    };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WFC;
} else if (typeof window !== 'undefined') {
    window.WFC = WFC;
}
