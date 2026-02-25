/**
 * Procedural Content Generation Module - Phase 3
 * Universal PCG library for all 10 horror games
 */

export { WaveFunctionCollapse } from './WaveFunctionCollapse.js';
export { RoomGenerator } from './RoomGenerator.js';
export { ItemSpawner, TextureSynthesizer, LightingPlacer } from './ItemSpawner.js';

/**
 * Create a complete procedural level
 * @param {Object} options - Generation options
 * @returns {Object} Generated level data
 */
export function generateLevel(options = {}) {
  const {
    algorithm = 'wfc',
    width = 40,
    height = 30,
    theme = 'asylum',
    roomCount = 8,
    itemDensity = 0.1,
    lightingDensity = 1
  } = options;

  let generator;
  
  if (algorithm === 'wfc') {
    generator = new WaveFunctionCollapse({ width, height });
    // Define basic tile set for horror theme
    setupHorrorTiles(generator, theme);
  } else if (algorithm === 'rooms') {
    generator = new RoomGenerator({ 
      width, 
      height, 
      theme,
      minRoomSize: 4,
      maxRoomSize: 12
    });
  }

  const result = generator.generate(roomCount);
  
  // Add items and lighting
  if (options.generateItems !== false) {
    const itemSpawner = new ItemSpawner();
    setupHorrorItems(itemSpawner);
    result.items = itemSpawner.spawn(result.grid, result.rooms || [], Math.floor(roomCount * itemDensity));
  }
  
  if (options.generateLighting !== false) {
    const lightingPlacer = new LightingPlacer();
    result.lights = lightingPlacer.placeLights(
      result.grid, 
      result.rooms || [], 
      { lightsPerRoom: lightingDensity }
    );
  }
  
  return result;
}

/**
 * Setup horror-themed tiles for WFC
 */
function setupHorrorTiles(generator, theme) {
  const tileSets = {
    asylum: [
      { id: 'W', weight: 1, neighbors: { top: ['W', 'D', 'F'], right: ['W', 'D', 'F'], bottom: ['W', 'D', 'F'], left: ['W', 'D', 'F'] } },
      { id: 'F', weight: 3, neighbors: { top: ['W', 'F', 'D', 'C'], right: ['W', 'F', 'D', 'C'], bottom: ['W', 'F', 'D', 'C'], left: ['W', 'F', 'D', 'C'] } },
      { id: 'D', weight: 1, neighbors: { top: ['W', 'F'], right: ['W', 'F'], bottom: ['W', 'F'], left: ['W', 'F'] } },
      { id: 'C', weight: 0.5, neighbors: { top: ['F'], right: ['F'], bottom: ['F'], left: ['F'] } }
    ],
    mansion: [
      { id: 'W', weight: 1, neighbors: { top: ['W', 'D', 'F'], right: ['W', 'D', 'F'], bottom: ['W', 'D', 'F'], left: ['W', 'D', 'F'] } },
      { id: 'F', weight: 4, neighbors: { top: ['W', 'F', 'D'], right: ['W', 'F', 'D'], bottom: ['W', 'F', 'D'], left: ['W', 'F', 'D'] } },
      { id: 'D', weight: 1, neighbors: { top: ['W', 'F'], right: ['W', 'F'], bottom: ['W', 'F'], left: ['W', 'F'] } }
    ],
    dungeon: [
      { id: 'W', weight: 1, neighbors: { top: ['W', 'F'], right: ['W', 'F'], bottom: ['W', 'F'], left: ['W', 'F'] } },
      { id: 'F', weight: 2, neighbors: { top: ['W', 'F', 'P'], right: ['W', 'F', 'P'], bottom: ['W', 'F', 'P'], left: ['W', 'F', 'P'] } },
      { id: 'P', weight: 0.3, neighbors: { top: ['F'], right: ['F'], bottom: ['F'], left: ['F'] } }
    ]
  };

  const tiles = tileSets[theme] || tileSets.asylum;
  tiles.forEach(tile => generator.defineTile(tile.id, tile));
}

/**
 * Setup horror-themed items
 */
function setupHorrorItems(spawner) {
  spawner.defineItem('key', { rarity: 'rare', weight: 0.3, category: 'quest' });
  spawner.defineItem('document', { rarity: 'common', weight: 1, category: 'lore' });
  spawner.defineItem('battery', { rarity: 'common', weight: 0.8, category: 'utility' });
  spawner.defineItem('medkit', { rarity: 'uncommon', weight: 0.5, category: 'healing' });
  spawner.defineItem('flashbulb', { rarity: 'common', weight: 0.7, category: 'utility' });
  spawner.defineItem('holy_water', { rarity: 'rare', weight: 0.2, category: 'weapon' });
  spawner.defineItem('crucifix', { rarity: 'legendary', weight: 0.1, category: 'artifact' });
}

export default {
  WaveFunctionCollapse,
  RoomGenerator,
  ItemSpawner,
  TextureSynthesizer,
  LightingPlacer,
  generateLevel
};
