/**
 * Context-Aware Room Generator - Phase 3: Procedural Content Generation
 * Intelligent room placement with thematic coherence and connectivity
 */

export class RoomGenerator {
  constructor(options = {}) {
    this.width = options.width || 50;
    this.height = options.height || 50;
    this.minRoomSize = options.minRoomSize || 3;
    this.maxRoomSize = options.maxRoomSize || 12;
    this.roomDensity = options.roomDensity || 0.3;
    this.corridorWidth = options.corridorWidth || 2;
    this.grid = [];
    this.rooms = [];
    this.corridors = [];
    this.connections = [];
    this.theme = options.theme || 'default';
  }

  /**
   * Initialize empty grid
   */
  initialize() {
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = 0; // 0 = empty, 1 = room, 2 = corridor
      }
    }
    this.rooms = [];
    this.corridors = [];
    this.connections = [];
  }

  /**
   * Generate rooms
   */
  generateRooms(count) {
    let attempts = 0;
    const maxAttempts = count * 10;
    
    while (this.rooms.length < count && attempts < maxAttempts) {
      attempts++;
      
      // Random room dimensions
      const roomWidth = this.minRoomSize + Math.floor(Math.random() * (this.maxRoomSize - this.minRoomSize));
      const roomHeight = this.minRoomSize + Math.floor(Math.random() * (this.maxRoomSize - this.minRoomSize));
      
      // Random position
      const x = 1 + Math.floor(Math.random() * (this.width - roomWidth - 2));
      const y = 1 + Math.floor(Math.random() * (this.height - roomHeight - 2));
      
      const newRoom = {
        x,
        y,
        width: roomWidth,
        height: roomHeight,
        center: {
          x: x + Math.floor(roomWidth / 2),
          y: y + Math.floor(roomHeight / 2)
        },
        id: this.rooms.length,
        type: this.getRandomRoomType(),
        doors: []
      };
      
      // Check for overlaps
      if (!this.overlaps(newRoom)) {
        this.rooms.push(newRoom);
        this.carveRoom(newRoom);
      }
    }
    
    return this.rooms;
  }

  /**
   * Get random room type based on theme
   */
  getRandomRoomType() {
    const themeTypes = {
      'asylum': ['cell', 'office', 'ward', 'storage', 'bathroom', 'lounge'],
      'mansion': ['bedroom', 'library', 'dining', 'kitchen', 'study', 'ballroom'],
      'dungeon': ['cell', 'treasury', 'shrine', 'armory', 'torture', 'throne'],
      'elevator': ['lobby', 'office', 'mechanical', 'storage', 'penthouse', 'basement'],
      'default': ['room', 'hall', 'chamber', 'vault', 'sanctum']
    };
    
    const types = themeTypes[this.theme] || themeTypes.default;
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Check if room overlaps with existing rooms
   */
  overlaps(room, padding = 1) {
    for (const existing of this.rooms) {
      if (room.x < existing.x + existing.width + padding &&
          room.x + room.width + padding > existing.x &&
          room.y < existing.y + existing.height + padding &&
          room.y + room.height + padding > existing.y) {
        return true;
      }
    }
    return false;
  }

  /**
   * Carve room into grid
   */
  carveRoom(room) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
          this.grid[y][x] = 1;
        }
      }
    }
  }

  /**
   * Generate corridors between rooms
   */
  generateCorridors() {
    if (this.rooms.length === 0) return;
    
    // Connect each room to the next (minimum spanning tree)
    for (let i = 0; i < this.rooms.length - 1; i++) {
      const roomA = this.rooms[i];
      const roomB = this.rooms[i + 1];
      
      this.createCorridor(roomA.center, roomB.center);
      this.connections.push({ from: roomA.id, to: roomB.id });
    }
    
    // Add some extra connections for loops
    const extraConnections = Math.floor(this.rooms.length * 0.3);
    for (let i = 0; i < extraConnections; i++) {
      const roomA = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      const roomB = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      
      if (roomA !== roomB) {
        this.createCorridor(roomA.center, roomB.center);
        this.connections.push({ from: roomA.id, to: roomB.id });
      }
    }
  }

  /**
   * Create L-shaped corridor between two points
   */
  createCorridor(from, to) {
    const x1 = from.x;
    const y1 = from.y;
    const x2 = to.x;
    const y2 = to.y;
    
    // Horizontal then vertical
    this.carveHCorridor(x1, x2, y1);
    this.carveVCorridor(y1, y2, x2);
    
    this.corridors.push({
      from: { x: x1, y: y1 },
      to: { x: x2, y: y2 },
      type: 'L'
    });
  }

  /**
   * Carve horizontal corridor
   */
  carveHCorridor(x1, x2, y) {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    
    for (let x = startX; x <= endX; x++) {
      for (let dy = -Math.floor(this.corridorWidth / 2); dy <= Math.floor(this.corridorWidth / 2); dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < this.height && x >= 0 && x < this.width) {
          if (this.grid[ny][x] === 0) {
            this.grid[ny][x] = 2;
          }
        }
      }
    }
  }

  /**
   * Carve vertical corridor
   */
  carveVCorridor(y1, y2, x) {
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);
    
    for (let y = startY; y <= endY; y++) {
      for (let dx = -Math.floor(this.corridorWidth / 2); dx <= Math.floor(this.corridorWidth / 2); dx++) {
        const nx = x + dx;
        if (ny >= 0 && ny < this.height && nx >= 0 && nx < this.width) {
          if (this.grid[y][nx] === 0) {
            this.grid[y][nx] = 2;
          }
        }
      }
    }
  }

  /**
   * Place doors in rooms
   */
  placeDoors() {
    this.rooms.forEach(room => {
      // Check each wall for corridor adjacency
      for (let x = room.x; x < room.x + room.width; x++) {
        // Top wall
        if (room.y > 0 && this.grid[room.y - 1][x] === 2) {
          room.doors.push({ x, y: room.y, direction: 'top' });
          this.grid[room.y][x] = 3; // Door
        }
        // Bottom wall
        if (room.y + room.height < this.height && this.grid[room.y + room.height][x] === 2) {
          room.doors.push({ x, y: room.y + room.height - 1, direction: 'bottom' });
          this.grid[room.y + room.height - 1][x] = 3;
        }
      }
      
      for (let y = room.y; y < room.y + room.height; y++) {
        // Left wall
        if (room.x > 0 && this.grid[y][room.x - 1] === 2) {
          room.doors.push({ x: room.x, y, direction: 'left' });
          this.grid[y][room.x] = 3;
        }
        // Right wall
        if (room.x + room.width < this.width && this.grid[y][room.x + room.width] === 2) {
          room.doors.push({ x: room.x + room.width - 1, y, direction: 'right' });
          this.grid[y][room.x + room.width - 1] = 3;
        }
      }
    });
  }

  /**
   * Generate complete level
   */
  generate(roomCount = 10) {
    this.initialize();
    this.generateRooms(roomCount);
    this.generateCorridors();
    this.placeDoors();
    
    return {
      grid: this.grid,
      rooms: this.rooms,
      corridors: this.corridors,
      connections: this.connections,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Get room at position
   */
  getRoomAt(x, y) {
    return this.rooms.find(room => 
      x >= room.x && x < room.x + room.width &&
      y >= room.y && y < room.y + room.height
    );
  }

  /**
   * Get nearest room to position
   */
  getNearestRoom(x, y) {
    let nearest = null;
    let minDist = Infinity;
    
    this.rooms.forEach(room => {
      const dx = room.center.x - x;
      const dy = room.center.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDist) {
        minDist = dist;
        nearest = room;
      }
    });
    
    return nearest;
  }

  /**
   * Export grid to array
   */
  toArray() {
    return this.grid.map(row => [...row]);
  }

  /**
   * Get generation statistics
   */
  getStats() {
    const total = this.width * this.height;
    const roomCells = this.grid.flat().filter(c => c === 1).length;
    const corridorCells = this.grid.flat().filter(c => c === 2).length;
    const doorCells = this.grid.flat().filter(c => c === 3).length;
    
    return {
      total,
      roomCells,
      corridorCells,
      doorCells,
      roomPercent: ((roomCells / total) * 100).toFixed(2),
      corridorPercent: ((corridorCells / total) * 100).toFixed(2),
      roomCount: this.rooms.length,
      corridorCount: this.corridors.length,
      connectionCount: this.connections.length
    };
  }
}

export default RoomGenerator;
