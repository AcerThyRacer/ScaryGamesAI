/**
 * Wave Function Collapse Maze Generator - Phase 3: Procedural Content Generation
 * Universal PCG system for all 10 horror games
 * Features: Constraint-based generation, thematic coherence, infinite variations
 */

export class WaveFunctionCollapse {
  constructor(options = {}) {
    this.width = options.width || 20;
    this.height = options.height || 20;
    this.cellSize = options.cellSize || 1;
    this.tiles = new Map();
    this.grid = [];
    this.collapsed = [];
    this.stack = [];
    this.constraints = [];
    this.seeds = [];
    this.iterations = 0;
    this.maxIterations = 10000;
  }

  /**
   * Define tile types with adjacency rules
   */
  defineTile(id, data) {
    this.tiles.set(id, {
      id,
      ...data,
      neighbors: {
        top: data.neighbors?.top || [],
        right: data.neighbors?.right || [],
        bottom: data.neighbors?.bottom || [],
        left: data.neighbors?.left || []
      }
    });
  }

  /**
   * Add constraint between tiles
   */
  addConstraint(tile1, direction, tile2) {
    this.constraints.push({ tile1, direction, tile2 });
  }

  /**
   * Initialize grid with all possibilities
   */
  initialize() {
    this.grid = [];
    this.collapsed = [];
    
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = [];
      this.collapsed[y] = [];
      for (let x = 0; x < this.width; x++) {
        // Start with all tiles possible
        this.grid[y][x] = Array.from(this.tiles.keys());
        this.collapsed[y][x] = false;
      }
    }

    // Apply seed tiles
    this.seeds.forEach(seed => {
      const { x, y, tile } = seed;
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        this.grid[y][x] = [tile];
        this.collapsed[y][x] = true;
        this.stack.push({ x, y });
      }
    });
  }

  /**
   * Add seed tile
   */
  addSeed(x, y, tile) {
    this.seeds.push({ x, y, tile });
  }

  /**
   * Get entropy (number of possibilities) for a cell
   */
  getEntropy(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y < this.height) return 0;
    if (this.collapsed[y][x]) return 0;
    return this.grid[y][x].length;
  }

  /**
   * Find cell with minimum entropy
   */
  findMinEntropyCell() {
    let minEntropy = Infinity;
    let candidates = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.collapsed[y][x]) {
          const entropy = this.grid[y][x].length;
          if (entropy < minEntropy && entropy > 0) {
            minEntropy = entropy;
            candidates = [{ x, y }];
          } else if (entropy === minEntropy) {
            candidates.push({ x, y });
          }
        }
      }
    }

    if (candidates.length === 0) return null;

    // Choose randomly from candidates with minimum entropy
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Collapse a cell to a single tile
   */
  collapseCell(x, y) {
    const possibilities = this.grid[y][x];
    if (possibilities.length === 0) return false;
    if (this.collapsed[y][x]) return true;

    // Weighted random selection (can be customized)
    const weights = possibilities.map(tileId => {
      const tile = this.tiles.get(tileId);
      return tile?.weight || 1;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    let selectedTile = possibilities[0];
    for (let i = 0; i < possibilities.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedTile = possibilities[i];
        break;
      }
    }

    this.grid[y][x] = [selectedTile];
    this.collapsed[y][x] = true;
    this.stack.push({ x, y });

    return true;
  }

  /**
   * Propagate constraints to neighbors
   */
  propagate(x, y) {
    const directions = [
      { dx: 0, dy: -1, dir: 'bottom', opposite: 'top' },
      { dx: 1, dy: 0, dir: 'left', opposite: 'right' },
      { dx: 0, dy: 1, dir: 'top', opposite: 'bottom' },
      { dx: -1, dy: 0, dir: 'right', opposite: 'left' }
    ];

    while (this.stack.length > 0) {
      const current = this.stack.pop();
      const cellTiles = this.grid[current.y][current.x];

      if (cellTiles.length === 0) return false; // Contradiction

      for (const { dx, dy, dir, opposite } of directions) {
        const nx = current.x + dx;
        const ny = current.y + dy;

        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
        if (this.collapsed[ny][nx]) continue;

        // Get valid neighbors for current cell's tiles
        const validNeighbors = new Set();
        cellTiles.forEach(tileId => {
          const tile = this.tiles.get(tileId);
          if (tile && tile.neighbors[dir]) {
            tile.neighbors[dir].forEach(neighbor => validNeighbors.add(neighbor));
          }
        });

        // Filter neighbor's possibilities
        const beforeLength = this.grid[ny][nx].length;
        this.grid[ny][nx] = this.grid[ny][nx].filter(tileId => 
          validNeighbors.has(tileId)
        );

        if (this.grid[ny][nx].length === 0) return false; // Contradiction

        // If reduced to single tile, collapse and propagate
        if (this.grid[ny][nx].length === 1 && beforeLength > 1) {
          this.collapsed[ny][nx] = true;
          this.stack.push({ x: nx, y: ny });
        } else if (this.grid[ny][nx].length < beforeLength) {
          // Entropy decreased, add to stack
          this.stack.push({ x: nx, y: ny });
        }
      }
    }

    return true;
  }

  /**
   * Run the WFC algorithm
   */
  run() {
    this.iterations = 0;
    
    while (this.iterations < this.maxIterations) {
      this.iterations++;

      // Find cell with minimum entropy
      const cell = this.findMinEntropyCell();
      if (!cell) break; // All cells collapsed

      // Collapse the cell
      if (!this.collapseCell(cell.x, cell.y)) {
        // Contradiction - backtrack or restart
        return this.restart();
      }

      // Propagate constraints
      if (!this.propagate(cell.x, cell.y)) {
        // Contradiction - restart
        return this.restart();
      }
    }

    return this.iterations < this.maxIterations;
  }

  /**
   * Restart generation
   */
  restart() {
    this.initialize();
    return this.run();
  }

  /**
   * Generate maze/level
   */
  generate(seeds = []) {
    this.seeds = seeds;
    this.initialize();
    const success = this.run();
    
    // Convert to output format
    const result = [];
    for (let y = 0; y < this.height; y++) {
      result[y] = [];
      for (let x = 0; x < this.width; x++) {
        result[y][x] = this.grid[y][x][0] || null;
      }
    }

    return {
      success,
      iterations: this.iterations,
      grid: result,
      collapsed: this.collapsed,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Get tile at position
   */
  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y < this.height) return null;
    const tiles = this.grid[y][x];
    return tiles.length === 1 ? this.tiles.get(tiles[0]) : null;
  }

  /**
   * Check if cell is collapsed
   */
  isCollapsed(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y < this.height) return false;
    return this.collapsed[y][x];
  }

  /**
   * Get generation statistics
   */
  getStats() {
    const total = this.width * this.height;
    const collapsed = this.collapsed.flat().filter(c => c).length;
    
    return {
      total,
      collapsed,
      percent: ((collapsed / total) * 100).toFixed(2),
      iterations: this.iterations,
      constraints: this.constraints.length,
      tiles: this.tiles.size
    };
  }

  /**
   * Export to 2D array
   */
  toArray() {
    return this.grid.map(row => row.map(cells => cells[0] || null));
  }

  /**
   * Export to string (for debugging)
   */
  toString() {
    let result = '';
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tiles = this.grid[y][x];
        result += tiles.length === 1 ? tiles[0][0] : '?';
      }
      result += '\n';
    }
    return result;
  }

  /**
   * Clear and reset
   */
  clear() {
    this.tiles.clear();
    this.constraints = [];
    this.seeds = [];
    this.grid = [];
    this.collapsed = [];
    this.stack = [];
  }
}

export default WaveFunctionCollapse;
