/**
 * PHASE 3: WAVE FUNCTION COLLAPSE MAZE GENERATION
 * Advanced procedural generation with constraints and room templates
 */

var WaveFunctionCollapse = (function() {
    'use strict';

    var config = {
        gridSize: 20,
        cellSize: 4,
        wallHeight: 3.5,
        
        // Tile types
        tiles: {
            EMPTY: 0,
            WALL: 1,
            PELLET: 2,
            POWER_PELLET: 3,
            SAFE_ROOM: 4,
            TRAP_ROOM: 5,
            TREASURE_ROOM: 6,
            BOSS_ROOM: 7,
            EXIT: 8
        },
        
        // Adjacency rules for WFC
        adjacencyRules: {},
        
        // Room templates
        roomTemplates: [],
        
        // Generation parameters
        entropy: [],
        observed: [],
        superposition: []
    };

    var state = {
        grid: [],
        collapsed: [],
        valid: true,
        seed: Date.now(),
        currentBiome: 'yellow'
    };

    /**
     * Initialize WFC system
     */
    function init(biome) {
        state.currentBiome = biome || 'yellow';
        state.seed = Date.now();
        console.log('[WFC] Initialized for biome:', state.currentBiome);
    }

    /**
     * Generate maze using Wave Function Collapse algorithm
     */
    function generateMaze(width, height, options) {
        config.gridSize = width || 20;
        var size = config.gridSize;
        
        // Initialize superposition (all possibilities for each cell)
        initializeSuperposition(size);
        
        // Apply initial constraints
        applyConstraints(options);
        
        // Collapse wave function
        while (!isFullyCollapsed()) {
            // Find lowest entropy cell
            var cell = findLowestEntropyCell();
            
            if (!cell) break;
            
            // Collapse this cell
            collapseCell(cell.x, cell.z);
            
            // Propagate constraints
            propagateConstraints(cell.x, cell.z);
            
            // Check for contradictions
            if (!state.valid) {
                console.warn('[WFC] Contradiction detected, regenerating...');
                return generateMaze(width, height, options);
            }
        }
        
        // Convert to final grid
        state.grid = convertToGrid(size);
        
        // Add room templates
        if (options && options.addRooms) {
            addRoomTemplates(state.grid);
        }
        
        console.log('[WFC] Maze generated successfully');
        return state.grid;
    }

    /**
     * Initialize superposition for all cells
     */
    function initializeSuperposition(size) {
        state.superposition = [];
        state.collapsed = [];
        state.entropy = [];
        
        for (var x = 0; x < size; x++) {
            state.superposition[x] = [];
            state.collapsed[x] = [];
            state.entropy[x] = [];
            
            for (var z = 0; z < size; z++) {
                // All tile types are initially possible
                state.superposition[x][z] = [
                    config.tiles.EMPTY,
                    config.tiles.WALL,
                    config.tiles.PELLET
                ];
                
                state.collapsed[x][z] = false;
                state.entropy[x][z] = 3; // log2(3 possibilities)
            }
        }
    }

    /**
     * Apply initial constraints (borders, special rooms, etc.)
     */
    function applyConstraints(options) {
        var size = config.gridSize;
        
        // Border walls
        for (var i = 0; i < size; i++) {
            forceCollapse(0, i, config.tiles.WALL);
            forceCollapse(size - 1, i, config.tiles.WALL);
            forceCollapse(i, 0, config.tiles.WALL);
            forceCollapse(i, size - 1, config.tiles.WALL);
        }
        
        // Player starting area (center)
        var center = Math.floor(size / 2);
        forceCollapse(center, center, config.tiles.EMPTY);
        
        // Add exit
        if (options && options.exitPosition) {
            forceCollapse(
                options.exitPosition.x,
                options.exitPosition.z,
                config.tiles.EXIT
            );
        }
        
        // Add safe rooms
        if (options && options.safeRooms > 0) {
            for (var s = 0; s < options.safeRooms; s++) {
                var sx = Math.floor(Math.random() * (size - 4)) + 2;
                var sz = Math.floor(Math.random() * (size - 4)) + 2;
                forceCollapse(sx, sz, config.tiles.SAFE_ROOM);
            }
        }
    }

    /**
     * Force a cell to collapse to a specific value
     */
    function forceCollapse(x, z, value) {
        if (state.collapsed[x][z]) return;
        
        state.superposition[x][z] = [value];
        state.collapsed[x][z] = true;
        state.entropy[x][z] = 0;
    }

    /**
     * Find cell with lowest entropy (most constrained)
     */
    function findLowestEntropyCell() {
        var minEntropy = Infinity;
        var candidates = [];
        
        for (var x = 0; x < config.gridSize; x++) {
            for (var z = 0; z < config.gridSize; z++) {
                if (state.collapsed[x][z]) continue;
                
                var entropy = state.superposition[x][z].length;
                
                if (entropy < minEntropy) {
                    minEntropy = entropy;
                    candidates = [{x: x, z: z}];
                } else if (entropy === minEntropy) {
                    candidates.push({x: x, z: z});
                }
            }
        }
        
        if (candidates.length === 0) return null;
        
        // Random tie-breaking
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    /**
     * Collapse a single cell
     */
    function collapseCell(x, z) {
        var possibilities = state.superposition[x][z].slice();
        
        // Weighted random selection (prefer corridors over walls)
        var weights = {
            [config.tiles.EMPTY]: 0.4,
            [config.tiles.WALL]: 0.3,
            [config.tiles.PELLET]: 0.3
        };
        
        var weightedChoice = selectWeighted(possibilities, weights);
        
        state.superposition[x][z] = [weightedChoice];
        state.collapsed[x][z] = true;
        state.entropy[x][z] = 0;
    }

    /**
     * Select from possibilities with weights
     */
    function selectWeighted(possibilities, weights) {
        var total = 0;
        for (var i = 0; i < possibilities.length; i++) {
            total += weights[possibilities[i]] || 1;
        }
        
        var random = Math.random() * total;
        var cumulative = 0;
        
        for (var j = 0; j < possibilities.length; j++) {
            cumulative += weights[possibilities[j]] || 1;
            if (random <= cumulative) {
                return possibilities[j];
            }
        }
        
        return possibilities[0];
    }

    /**
     * Propagate constraints to neighbors
     */
    function propagateConstraints(x, z) {
        var value = state.superposition[x][z][0];
        
        // Get neighbors
        var neighbors = [
            {x: x + 1, z: z},
            {x: x - 1, z: z},
            {x: x, z: z + 1},
            {x: x, z: z - 1}
        ];
        
        for (var i = 0; i < neighbors.length; i++) {
            var n = neighbors[i];
            
            // Skip out of bounds
            if (n.x < 0 || n.x >= config.gridSize || 
                n.z < 0 || n.z >= config.gridSize) continue;
            
            // Skip already collapsed
            if (state.collapsed[n.x][n.z]) continue;
            
            // Remove incompatible possibilities
            var compatible = getCompatibleTiles(value, n.x, n.z);
            
            var before = state.superposition[n.x][n.z].length;
            state.superposition[n.x][n.z] = compatible;
            state.entropy[n.x][n.z] = compatible.length;
            
            // Check for contradiction
            if (compatible.length === 0) {
                state.valid = false;
                return;
            }
            
            // If only one possibility left, recursively propagate
            if (compatible.length === 1 && before > 1) {
                state.collapsed[n.x][n.z] = true;
                propagateConstraints(n.x, n.z);
                
                if (!state.valid) return;
            }
        }
    }

    /**
     * Get tiles compatible with neighbor
     */
    function getCompatibleTiles(neighborValue, x, z) {
        var possibilities = state.superposition[x][z].slice();
        
        // Simple compatibility rules
        var compatible = [];
        
        for (var i = 0; i < possibilities.length; i++) {
            var tile = possibilities[i];
            
            // Walls can't be adjacent to empty spaces on all sides
            if (tile === config.tiles.WALL && neighborValue === config.tiles.EMPTY) {
                // Allow some walls next to empty
                if (Math.random() > 0.3) continue;
            }
            
            // Pellets should be in open areas
            if (tile === config.tiles.PELLET && neighborValue === config.tiles.WALL) {
                if (Math.random() > 0.5) continue;
            }
            
            compatible.push(tile);
        }
        
        return compatible;
    }

    /**
     * Check if all cells are collapsed
     */
    function isFullyCollapsed() {
        for (var x = 0; x < config.gridSize; x++) {
            for (var z = 0; z < config.gridSize; z++) {
                if (!state.collapsed[x][z]) return false;
            }
        }
        return true;
    }

    /**
     * Convert superposition to final grid
     */
    function convertToGrid(size) {
        var grid = [];
        
        for (var x = 0; x < size; x++) {
            grid[x] = [];
            for (var z = 0; z < size; z++) {
                grid[x][z] = state.superposition[x][z][0];
            }
        }
        
        return grid;
    }

    /**
     * Add room templates to generated maze
     */
    function addRoomTemplates(grid) {
        // Define room templates
        var templates = [
            // Safe room (3x3)
            {
                type: 'safe',
                pattern: [
                    [1, 1, 1],
                    [1, 4, 1],
                    [1, 1, 1]
                ],
                size: 3
            },
            
            // Treasure room (5x5)
            {
                type: 'treasure',
                pattern: [
                    [1, 1, 1, 1, 1],
                    [1, 6, 6, 6, 1],
                    [1, 6, 6, 6, 1],
                    [1, 6, 6, 6, 1],
                    [1, 1, 1, 1, 1]
                ],
                size: 5
            },
            
            // Trap room (4x4)
            {
                type: 'trap',
                pattern: [
                    [1, 1, 1, 1],
                    [1, 5, 5, 1],
                    [1, 5, 5, 1],
                    [1, 1, 1, 1]
                ],
                size: 4
            }
        ];
        
        // Try to place rooms
        for (var t = 0; t < templates.length; t++) {
            var template = templates[t];
            var placed = false;
            var attempts = 0;
            
            while (!placed && attempts < 50) {
                var rx = Math.floor(Math.random() * (config.gridSize - template.size - 2)) + 1;
                var rz = Math.floor(Math.random() * (config.gridSize - template.size - 2)) + 1;
                
                // Check if placement is valid
                if (canPlaceRoom(grid, template, rx, rz)) {
                    placeRoom(grid, template, rx, rz);
                    placed = true;
                }
                
                attempts++;
            }
        }
    }

    /**
     * Check if room can be placed at position
     */
    function canPlaceRoom(grid, template, startX, startZ) {
        var size = template.size;
        
        for (var dx = 0; dx < size; dx++) {
            for (var dz = 0; dz < size; dz++) {
                var tile = template.pattern[dx][dz];
                
                // Don't overwrite walls or special tiles
                if (tile !== 1 && grid[startX + dx][startZ + dz] !== config.tiles.EMPTY) {
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * Place room template in grid
     */
    function placeRoom(grid, template, startX, startZ) {
        var size = template.size;
        
        for (var dx = 0; dx < size; dx++) {
            for (var dz = 0; dz < size; dz++) {
                grid[startX + dx][startZ + dz] = template.pattern[dx][dz];
            }
        }
    }

    /**
     * Get generated grid
     */
    function getGrid() {
        return state.grid;
    }

    /**
     * Export grid as seed string
     */
    function exportSeed() {
        return JSON.stringify({
            grid: state.grid,
            seed: state.seed,
            biome: state.currentBiome
        });
    }

    /**
     * Import grid from seed string
     */
    function importSeed(seedString) {
        try {
            var data = JSON.parse(seedString);
            state.grid = data.grid;
            state.seed = data.seed;
            state.currentBiome = data.biome;
            config.gridSize = data.grid.length;
            return true;
        } catch (e) {
            console.error('[WFC] Failed to import seed:', e);
            return false;
        }
    }

    // Public API
    return {
        init: init,
        generateMaze: generateMaze,
        getGrid: getGrid,
        exportSeed: exportSeed,
        importSeed: importSeed,
        config: config,
        state: state
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.WaveFunctionCollapse = WaveFunctionCollapse;
}

console.log('[WFC] Module loaded - Ready for procedural generation');
