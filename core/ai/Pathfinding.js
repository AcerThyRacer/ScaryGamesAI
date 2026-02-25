/**
 * A* Pathfinding System - Phase 4: Advanced AI Systems
 * Optimal pathfinding with dynamic obstacle avoidance for horror games
 */

export class Pathfinding {
  constructor(grid, options = {}) {
    this.grid = grid;
    this.width = grid[0]?.length || 0;
    this.height = grid.length;
    this.diagonal = options.diagonal || false;
    this.heuristic = options.heuristic || 'manhattan';
  }

  /**
   * Find path from start to end using A* algorithm
   */
  findPath(start, end, options = {}) {
    const {
      allowDiagonal = this.diagonal,
      maxIterations = 10000,
      smooth = false
    } = options;

    const startNode = { x: start.x, y: start.y };
    const endNode = { x: end.x, y: end.y };

    // Validate start and end
    if (!this.isValid(startNode) || !this.isValid(endNode)) {
      return null;
    }

    // Initialize open and closed sets
    const openSet = [startNode];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const makeKey = (node) => `${node.x},${node.y}`;
    gScore.set(makeKey(startNode), 0);
    fScore.set(makeKey(startNode), this.heuristic(startNode, endNode));

    let iterations = 0;

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;

      // Get node with lowest fScore
      openSet.sort((a, b) => {
        const fA = fScore.get(makeKey(a)) || Infinity;
        const fB = fScore.get(makeKey(b)) || Infinity;
        return fA - fB;
      });

      const current = openSet.shift();
      const currentKey = makeKey(current);

      // Check if we reached the end
      if (current.x === endNode.x && current.y === endNode.y) {
        const path = this.reconstructPath(cameFrom, current);
        return smooth ? this.smoothPath(path, options) : path;
      }

      closedSet.add(currentKey);

      // Check neighbors
      const neighbors = this.getNeighbors(current, allowDiagonal);
      
      for (const neighbor of neighbors) {
        const neighborKey = makeKey(neighbor);
        
        if (closedSet.has(neighborKey)) {
          continue;
        }

        if (!this.isValid(neighbor) || this.isWall(neighbor)) {
          continue;
        }

        const tentativeGScore = (gScore.get(currentKey) || Infinity) + 
                               this.distance(current, neighbor, allowDiagonal);

        if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, endNode));

          if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    // No path found
    return null;
  }

  /**
   * Get valid neighbors of a node
   */
  getNeighbors(node, allowDiagonal) {
    const neighbors = [];
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 1, y: 0 },  // right
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }  // left
    ];

    if (allowDiagonal) {
      directions.push(
        { x: 1, y: -1 },  // up-right
        { x: 1, y: 1 },   // down-right
        { x: -1, y: 1 },  // down-left
        { x: -1, y: -1 }  // up-left
      );
    }

    for (const dir of directions) {
      const neighbor = {
        x: node.x + dir.x,
        y: node.y + dir.y
      };
      neighbors.push(neighbor);
    }

    return neighbors;
  }

  /**
   * Check if node is valid
   */
  isValid(node) {
    return node.x >= 0 && node.x < this.width && 
           node.y >= 0 && node.y < this.height;
  }

  /**
   * Check if node is a wall
   */
  isWall(node) {
    return this.grid[node.y][node.x] === 1;
  }

  /**
   * Calculate distance between two nodes
   */
  distance(a, b, allowDiagonal) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    
    if (allowDiagonal) {
      return Math.max(dx, dy); // Chebyshev distance
    }
    return dx + dy; // Manhattan distance
  }

  /**
   * Heuristic function
   */
  heuristic(a, b) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);

    switch (this.heuristic) {
      case 'manhattan':
        return dx + dy;
      case 'euclidean':
        return Math.sqrt(dx * dx + dy * dy);
      case 'chebyshev':
        return Math.max(dx, dy);
      case 'octile':
        return dx + dy + (Math.sqrt(2) - 2) * Math.min(dx, dy);
      default:
        return dx + dy;
    }
  }

  /**
   * Reconstruct path from cameFrom map
   */
  reconstructPath(cameFrom, current) {
    const path = [current];
    const makeKey = (node) => `${node.x},${node.y}`;
    
    let currentKey = makeKey(current);
    while (cameFrom.has(currentKey)) {
      current = cameFrom.get(currentKey);
      path.unshift(current);
      currentKey = makeKey(current);
    }

    return path;
  }

  /**
   * Smooth path by removing unnecessary waypoints
   */
  smoothPath(path, options = {}) {
    if (path.length <= 2) return path;

    const smoothed = [path[0]];
    let currentIndex = 0;

    while (currentIndex < path.length - 1) {
      let furthestIndex = currentIndex;

      for (let i = path.length - 1; i > currentIndex; i--) {
        if (this.hasLineOfSight(path[currentIndex], path[i])) {
          furthestIndex = i;
          break;
        }
      }

      if (furthestIndex !== currentIndex) {
        smoothed.push(path[furthestIndex]);
        currentIndex = furthestIndex;
      } else {
        currentIndex++;
      }
    }

    return smoothed;
  }

  /**
   * Check if there's a clear line of sight between two points
   */
  hasLineOfSight(a, b) {
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const sx = a.x < b.x ? 1 : -1;
    const sy = a.y < b.y ? 1 : -1;
    let err = dx - dy;

    let x = a.x;
    let y = a.y;

    while (x !== b.x || y !== b.y) {
      if (!this.isValid({ x, y }) || this.isWall({ x, y })) {
        return false;
      }

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return true;
  }

  /**
   * Update grid dynamically (for moving obstacles)
   */
  updateGrid(newGrid) {
    this.grid = newGrid;
  }

  /**
   * Find path avoiding dynamic obstacles
   */
  findPathDynamic(start, end, dynamicObstacles = [], options = {}) {
    // Temporarily mark dynamic obstacles as walls
    const originalValues = [];
    
    dynamicObstacles.forEach(obstacle => {
      if (this.isValid(obstacle)) {
        originalValues.push({
          x: obstacle.x,
          y: obstacle.y,
          value: this.grid[obstacle.y][obstacle.x]
        });
        this.grid[obstacle.y][obstacle.x] = 1;
      }
    });

    const path = this.findPath(start, end, options);

    // Restore original values
    originalValues.forEach(({ x, y, value }) => {
      this.grid[y][x] = value;
    });

    return path;
  }
}

/**
 * Flow Field for multiple agents
 */
export class FlowField {
  constructor(grid, target) {
    this.grid = grid;
    this.width = grid[0]?.length || 0;
    this.height = grid.length;
    this.target = target;
    this.costs = [];
    this.directions = [];
    this.integrations = [];
  }

  /**
   * Generate flow field towards target
   */
  generate() {
    // Initialize costs to infinity
    this.costs = [];
    this.directions = [];
    
    for (let y = 0; y < this.height; y++) {
      this.costs[y] = [];
      this.directions[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.costs[y][x] = Infinity;
        this.directions[y][x] = { x: 0, y: 0 };
      }
    }

    // Set target cost to 0
    this.costs[this.target.y][this.target.x] = 0;

    // Integrate costs using Dijkstra-like algorithm
    const openSet = [{ x: this.target.x, y: this.target.y }];
    
    while (openSet.length > 0) {
      // Get node with lowest cost
      openSet.sort((a, b) => {
        return this.costs[a.y][a.x] - this.costs[b.y][b.x];
      });

      const current = openSet.shift();

      // Check neighbors
      const neighbors = [
        { x: current.x, y: current.y - 1 },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x - 1, y: current.y }
      ];

      for (const neighbor of neighbors) {
        if (neighbor.x < 0 || neighbor.x >= this.width ||
            neighbor.y < 0 || neighbor.y >= this.height) {
          continue;
        }

        if (this.grid[neighbor.y][neighbor.x] === 1) {
          continue;
        }

        const newCost = this.costs[current.y][current.x] + 1;
        
        if (newCost < this.costs[neighbor.y][neighbor.x]) {
          this.costs[neighbor.y][neighbor.x] = newCost;
          openSet.push(neighbor);
        }
      }
    }

    // Calculate directions (gradient descent)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === 1) continue;

        let minCost = this.costs[y][x];
        let bestDir = { x: 0, y: 0 };

        const neighbors = [
          { x: x, y: y - 1 },
          { x: x + 1, y: y },
          { x: x, y: y + 1 },
          { x: x - 1, y: y }
        ];

        for (const neighbor of neighbors) {
          if (neighbor.x < 0 || neighbor.x >= this.width ||
              neighbor.y < 0 || neighbor.y >= this.height) {
            continue;
          }

          if (this.costs[neighbor.y][neighbor.x] < minCost) {
            minCost = this.costs[neighbor.y][neighbor.x];
            bestDir = {
              x: neighbor.x - x,
              y: neighbor.y - y
            };
          }
        }

        this.directions[y][x] = bestDir;
      }
    }

    return this.directions;
  }

  /**
   * Get direction for agent at position
   */
  getDirection(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return { x: 0, y: 0 };
    }
    return this.directions[y][x];
  }
}

export default Pathfinding;
