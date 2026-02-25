/**
 * Intelligent Item Spawning System - Phase 3: PCG
 * Context-aware loot distribution with rarity and placement rules
 */

export class ItemSpawner {
  constructor(options = {}) {
    this.itemTypes = new Map();
    this.spawnRules = [];
    this.placementStrategy = options.placementStrategy || 'random';
    this.maxItems = options.maxItems || 50;
    this.items = [];
  }

  defineItem(id, data) {
    this.itemTypes.set(id, {
      id,
      rarity: data.rarity || 'common', // common, uncommon, rare, legendary
      weight: data.weight || 1,
      category: data.category || 'generic',
      minCount: data.minCount || 1,
      maxCount: data.maxCount || 1,
      requirements: data.requirements || {},
      ...data
    });
  }

  addRule(rule) {
    this.spawnRules.push(rule);
  }

  spawn(grid, room, count = 1) {
    const spawned = [];
    
    for (let i = 0; i < count; i++) {
      const item = this.selectItem();
      if (!item) continue;
      
      const position = this.findSpawnPosition(grid, room);
      if (!position) continue;
      
      spawned.push({
        ...item,
        x: position.x,
        y: position.y,
        instanceId: `${item.id}_${Date.now()}_${i}`
      });
    }
    
    return spawned;
  }

  selectItem() {
    const items = Array.from(this.itemTypes.values());
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) return item;
    }
    
    return items[0];
  }

  findSpawnPosition(grid, room) {
    const positions = [];
    
    for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
      for (let x = room.x + 1; x < room.x + room.width - 1; x++) {
        if (grid[y] && grid[y][x] === 1) {
          positions.push({ x, y });
        }
      }
    }
    
    if (positions.length === 0) return null;
    return positions[Math.floor(Math.random() * positions.length)];
  }

  getItems() {
    return this.items;
  }

  clear() {
    this.items = [];
  }
}

/**
 * Procedural Texture Synthesis - Phase 3: PCG
 * Real-time material generation using noise algorithms
 */

export class TextureSynthesizer {
  constructor(options = {}) {
    this.width = options.width || 256;
    this.height = options.height || 256;
    this.scale = options.scale || 1;
  }

  generate(type, params = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.createImageData(this.width, this.height);
    
    switch (type) {
      case 'noise':
        this.generateNoise(imageData, params);
        break;
      case 'bricks':
        this.generateBricks(imageData, params);
        break;
      case 'tiles':
        this.generateTiles(imageData, params);
        break;
      case 'wood':
        this.generateWood(imageData, params);
        break;
      case 'marble':
        this.generateMarble(imageData, params);
        break;
      default:
        this.generateNoise(imageData, params);
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  generateNoise(imageData, params) {
    const { data } = imageData;
    const baseColor = params.baseColor || [128, 128, 128];
    const amplitude = params.amplitude || 50;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        const noise = (Math.random() - 0.5) * amplitude;
        data[i] = Math.max(0, Math.min(255, baseColor[0] + noise));
        data[i + 1] = Math.max(0, Math.min(255, baseColor[1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, baseColor[2] + noise));
        data[i + 3] = 255;
      }
    }
  }

  generateBricks(imageData, params) {
    const { data } = imageData;
    const brickColor = params.brickColor || [180, 60, 60];
    const mortarColor = params.mortarColor || [100, 100, 100];
    const brickHeight = params.brickHeight || 20;
    const brickWidth = params.brickWidth || 40;
    const mortarSize = params.mortarSize || 2;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        const row = Math.floor(y / brickHeight);
        const offset = (row % 2) * Math.floor(brickWidth / 2);
        const brickX = (x + offset) % (brickWidth + mortarSize);
        const brickY = y % (brickHeight + mortarSize);
        
        const isMortar = brickX < mortarSize || brickY < mortarSize;
        const color = isMortar ? mortarColor : brickColor;
        
        data[i] = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
        data[i + 3] = 255;
      }
    }
  }

  generateTiles(imageData, params) {
    const { data } = imageData;
    const tileColor = params.tileColor || [100, 100, 150];
    const groutColor = params.groutColor || [50, 50, 50];
    const tileSize = params.tileSize || 32;
    const groutSize = params.groutSize || 2;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        const tileX = x % (tileSize + groutSize);
        const tileY = y % (tileSize + groutSize);
        
        const isGrout = tileX < groutSize || tileY < groutSize;
        const color = isGrout ? groutColor : tileColor;
        
        data[i] = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
        data[i + 3] = 255;
      }
    }
  }

  generateWood(imageData, params) {
    const { data } = imageData;
    const baseColor = params.baseColor || [139, 90, 43];
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        const grain = Math.sin(x * 0.1 + y * 0.05) * 20 + 
                     Math.sin(x * 0.05 - y * 0.1) * 10;
        const noise = (Math.random() - 0.5) * 15;
        
        data[i] = Math.max(0, Math.min(255, baseColor[0] + grain + noise));
        data[i + 1] = Math.max(0, Math.min(255, baseColor[1] + grain * 0.5 + noise));
        data[i + 2] = Math.max(0, Math.min(255, baseColor[2] + grain * 0.3 + noise));
        data[i + 3] = 255;
      }
    }
  }

  generateMarble(imageData, params) {
    const { data } = imageData;
    const baseColor = params.baseColor || [200, 200, 200];
    const veinColor = params.veinColor || [100, 100, 120];
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        const t = Math.sqrt(x * x + y * y) * 0.05;
        const marble = Math.sin(t + Math.sin(y * 0.02) * 2) * 0.5 + 0.5;
        const noise = (Math.random() - 0.5) * 0.2;
        
        const r = baseColor[0] * (1 - marble) + veinColor[0] * marble + noise * 50;
        const g = baseColor[1] * (1 - marble) + veinColor[1] * marble + noise * 50;
        const b = baseColor[2] * (1 - marble) + veinColor[2] * marble + noise * 50;
        
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
        data[i + 3] = 255;
      }
    }
  }
}

/**
 * Dynamic Lighting Placement - Phase 3: PCG
 * Intelligent light source optimization for horror atmosphere
 */

export class LightingPlacer {
  constructor(options = {}) {
    this.lights = [];
    this.minIntensity = options.minIntensity || 0.3;
    this.maxIntensity = options.maxIntensity || 1.0;
    this.flickerRate = options.flickerRate || 0.5;
  }

  placeLights(grid, rooms, options = {}) {
    this.lights = [];
    const {
      lightsPerRoom = 1,
      corridorSpacing = 10,
      flickering = true
    } = options;
    
    // Place lights in rooms
    rooms.forEach(room => {
      for (let i = 0; i < lightsPerRoom; i++) {
        const light = this.placeRoomLight(room, flickering);
        if (light) this.lights.push(light);
      }
    });
    
    // Place lights in corridors
    this.placeCorridorLights(grid, corridorSpacing, flickering);
    
    return this.lights;
  }

  placeRoomLight(room, flickering) {
    const x = room.x + Math.floor(room.width / 2);
    const y = room.y + Math.floor(room.height / 2);
    
    return {
      x,
      y,
      intensity: this.minIntensity + Math.random() * (this.maxIntensity - this.minIntensity),
      radius: 5 + Math.random() * 5,
      color: this.getRandomLightColor(),
      flickering: flickering && Math.random() < this.flickerRate,
      flickerSpeed: 2 + Math.random() * 3,
      type: room.type === 'cell' ? 'dim' : 'normal'
    };
  }

  placeCorridorLights(grid, spacing, flickering) {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === 2 && x % spacing === 0) {
          this.lights.push({
            x,
            y,
            intensity: 0.4 + Math.random() * 0.3,
            radius: 4,
            color: '#ffaa44',
            flickering: flickering && Math.random() < 0.7,
            flickerSpeed: 3 + Math.random() * 2,
            type: 'corridor'
          });
        }
      }
    }
  }

  getRandomLightColor() {
    const colors = ['#ffaa44', '#ff8800', '#ffff88', '#88aaff', '#ff4444'];
    const weights = [0.4, 0.3, 0.15, 0.1, 0.05];
    
    let random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < colors.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) return colors[i];
    }
    
    return colors[0];
  }

  update(dt) {
    this.lights.forEach(light => {
      if (light.flickering) {
        const flicker = Math.sin(Date.now() * 0.001 * light.flickerSpeed) * 0.3 +
                       Math.cos(Date.now() * 0.0023 * light.flickerSpeed) * 0.2;
        light.currentIntensity = light.intensity * (1 + flicker);
      } else {
        light.currentIntensity = light.intensity;
      }
    });
  }

  getLights() {
    return this.lights;
  }

  clear() {
    this.lights = [];
  }
}

export default { ItemSpawner, TextureSynthesizer, LightingPlacer };
