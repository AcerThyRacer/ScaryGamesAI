/* ============================================================
   CURSED DEPTHS — Engine Core
   Terraria-style 2D horror sandbox
   ============================================================ */

// ===== CONSTANTS (Phase 3: mutable world size) =====
const TILE = 16;
let WORLD_W = 800, WORLD_H = 400;
let SURFACE_Y = 80, CAVE_Y = 130, MUSH_Y = 170, FROZEN_Y = 210, FLESH_Y = 250, HIVE_Y = 290, ABYSS_Y = 340;
const GRAVITY = 0.55, JUMP_VEL = -9.5, MAX_FALL = 12, PLAYER_SPEED = 3.2;
const DAY_LENGTH = 86400; // 1440 in-game minutes × 60 fps = 24 real minutes per full day (1 sec = 1 min)

// Phase 3: World config
const WORLD_SIZES = {
    small: { w: 400, h: 200, label: 'Small (400×200)' },
    medium: { w: 800, h: 400, label: 'Medium (800×400)' },
    large: { w: 1600, h: 600, label: 'Large (1600×600)' }
};
let worldSeed = Date.now();
let hardcoreMode = false;
let playerSkin = 'default';
let speedrunTimer = 0;
let speedrunActive = false;
let speedrunSplits = [];
const SKINS = {
    default: { body: '#CC6633', face: '#DDBB88', eyes: '#FF2222', name: 'Default' },
    skeleton: { body: '#C0B090', face: '#DDDDCC', eyes: '#FF0000', name: 'Skeleton' },
    demon: { body: '#660033', face: '#CC3344', eyes: '#FFFF00', name: 'Demon' },
    ghost: { body: 'rgba(150,170,200,0.5)', face: '#CCDDEE', eyes: '#44FFFF', name: 'Ghost' },
    vampire: { body: '#222222', face: '#EEDDCC', eyes: '#CC0000', name: 'Vampire' }
};

function setWorldSize(size) {
    const s = WORLD_SIZES[size] || WORLD_SIZES.medium;
    WORLD_W = s.w; WORLD_H = s.h;
    const ratio = s.h / 400;
    SURFACE_Y = Math.floor(80 * ratio);
    CAVE_Y = Math.floor(130 * ratio);
    MUSH_Y = Math.floor(170 * ratio);
    FROZEN_Y = Math.floor(210 * ratio);
    FLESH_Y = Math.floor(250 * ratio);
    HIVE_Y = Math.floor(290 * ratio);
    ABYSS_Y = Math.floor(340 * ratio);
}

// ===== TILE TYPES =====
const T = {
    AIR: 0, DIRT: 1, STONE: 2, GRASS: 3, WOOD: 4, LEAVES: 5, SAND: 6,
    BONE: 7, FLESH: 8, OBSIDIAN: 9, HELLSTONE: 10,
    IRON_ORE: 11, GOLD_ORE: 12, CRIMSON_ORE: 13, SHADOW_ORE: 14,
    PLANKS: 15, TORCH: 16, WORKBENCH: 17, FURNACE: 18, ANVIL: 19,
    CHEST: 20, COBWEB: 21, BLOOD_STONE: 22, DEMON_BRICK: 23,
    BONE_BRICK: 24, CRYSTAL: 25, WATER: 26, LAVA: 27, BEDROCK: 28,
    // Phase 1 blocks
    ICE: 29, SNOW: 30, FROZEN_STONE: 31, MUSHROOM_STEM: 32, MUSHROOM_CAP: 33,
    GLOW_SHROOM: 34, HIVE_WALL: 35, HONEY_BLOCK: 36, MOSSY_STONE: 37,
    CRACKED_BRICK: 38, GLASS: 39, DOOR: 40, TABLE: 41, CHAIR: 42, BED: 43,
    BOOKSHELF: 44, CHANDELIER: 45, COOKING_STATION: 46, BLOOD_ALTAR: 47,
    PRESSURE_PLATE: 48, LEVER: 49, TNT: 50, STALACTITE: 51, STALAGMITE: 52,
    SPIDER_EGG: 53, FROST_ORE: 54, HIVE_ORE: 55,
    // Phase 2 blocks
    BLOOD: 56, ACID: 57, CORRUPTION: 58, NPC_CAGE: 59, CORRUPTED_STONE: 60, CORRUPTED_DIRT: 61,
    // Phase 6 blocks
    SANDSTONE: 62, CACTUS: 63, JUNGLE_GRASS: 64, JUNGLE_VINE: 65, BAMBOO: 66,
    WIRE: 67, DART_TRAP: 68, BOULDER_TRAP: 69, TELEPORTER: 70,
    DUNGEON_BRICK: 71, DUNGEON_DOOR: 72, SPIKE: 73, QUEST_BOARD: 74,
    // ===== WORLD EVIL TILES =====
    // Corruption
    EBONSTONE: 75, CORRUPT_GRASS: 76, SHADOW_ORB: 77, EBONSAND: 78, CORRUPT_THORNS: 79,
    CORRUPT_VINE: 80, DEMONITE_ORE: 81,
    // Crimson
    CRIMSTONE: 82, CRIMSON_GRASS: 83, CRIMSON_HEART: 84, CRIMSAND: 85, CRIMSON_THORNS: 86,
    CRIMSON_VINE_TILE: 87, CRIMTANE_ORE: 88,
    // Void (Space Evil)
    VOID_STONE: 89, VOID_GRASS: 90, STELLAR_FRAGMENT: 91, VOID_RIFT: 92,
    DARK_NEBULA: 93, COSMIC_SAND: 94, ANTI_GRAVITY_CRYSTAL: 95, VOIDITE_ORE: 96,
    // ===== SURFACE BIOME TILES =====
    // Desert
    HARDENED_SAND: 97, DESERT_FOSSIL: 98, PALM_WOOD: 99,
    // Snow/Ice
    SLUSH: 100, BOREAL_WOOD: 101, THIN_ICE: 102,
    // Jungle
    MUD: 103, MAHOGANY_WOOD: 104, BEEHIVE: 105, LIFE_FRUIT: 106,
    // ===== SPACE BIOME TILES =====
    METEORITE: 107, LUMINITE: 108, LUNAR_SOIL: 109, ASTEROID_ROCK: 110,
    SPACE_GLASS: 111, LAUNCH_PAD: 112, METEOR_CRATER: 113,
    // ===== HARDMODE TILES =====
    COBALT_ORE: 114, MYTHRIL_ORE: 115, TITANIUM_ORE: 116,
    HALLOWED_STONE: 117, HALLOWED_GRASS: 118, HALLOWED_SAND: 119,
    PEARLSTONE: 120, CRYSTAL_SHARD: 121,
    // ===== PHASE 5: DUNGEON & TEMPLE TILES =====
    DUNGEON_BRICK: 122, CRACKED_BRICK: 123, SPIKE_TRAP: 124, BONE_BLOCK: 125,
    LIHZAHRD_BRICK: 126, LIHZAHRD_ALTAR: 127, WOODEN_SPIKE: 128, TEMPLE_DOOR: 129,
    PLANTERA_BULB: 130, DUNGEON_CHEST: 131,
    // ===== PHASE 6: CELESTIAL TILES =====
    SOLAR_FRAGMENT_BLOCK: 132, VORTEX_FRAGMENT_BLOCK: 133, NEBULA_FRAGMENT_BLOCK: 134,
    STARDUST_FRAGMENT_BLOCK: 135, CELESTIAL_ALTAR: 136,
    // ===== PHASE 7: HERB & STATION TILES =====
    DAYBLOOM: 137, MOONGLOW: 138, WATERLEAF: 139, BLINKROOT: 140,
    DEATHWEED: 141, FIREBLOSSOM: 142, SHIVERTHORN: 143, ALCHEMY_STATION: 144,
    // ===== PHASE 9: LIQUID & WIRE TILES =====
    WATER: 145, LAVA: 146, HONEY: 147,
    WIRE_RED: 148, WIRE_BLUE: 149, WIRE_GREEN: 150, WIRE_YELLOW: 151,
    SWITCH: 152, LEVER: 153, PRESSURE_PLATE: 154, TIMER_TILE: 155,
    DART_TRAP: 156, SPEAR_TRAP: 157, FLAME_TRAP: 158, SPIKE_BALL_TRAP: 159,
    TELEPORTER: 160, ACTUATOR: 161
};

const TILE_DATA = {};
function td(id, name, color, hardness, drop, minTier) { TILE_DATA[id] = { name, color, hardness, drop: drop || id, minTier: minTier || 0 }; }
td(T.AIR, 'Air', 'transparent', 0);
td(T.DIRT, 'Dirt', '#5C3A1E', 3); td(T.STONE, 'Stone', '#666666', 8);
td(T.GRASS, 'Grass', '#2D5A1E', 3, T.DIRT); td(T.WOOD, 'Wood', '#8B6914', 4);
td(T.LEAVES, 'Leaves', '#1A4A1A', 1); td(T.SAND, 'Sand', '#C2A645', 2);
td(T.BONE, 'Bone Block', '#D4C9A8', 6); td(T.FLESH, 'Flesh Block', '#8B3A3A', 7);
td(T.OBSIDIAN, 'Obsidian', '#1A0A2E', 25, T.OBSIDIAN, 3);
td(T.HELLSTONE, 'Hellstone', '#CC3300', 20, T.HELLSTONE, 3);
td(T.IRON_ORE, 'Iron Ore', '#A0785A', 10, T.IRON_ORE, 1);
td(T.GOLD_ORE, 'Gold Ore', '#FFD700', 14, T.GOLD_ORE, 1);
td(T.CRIMSON_ORE, 'Crimson Ore', '#CC1133', 18, T.CRIMSON_ORE, 2);
td(T.SHADOW_ORE, 'Shadow Ore', '#4A0066', 22, T.SHADOW_ORE, 2);
td(T.PLANKS, 'Planks', '#B8860B', 3); td(T.TORCH, 'Torch', '#FFaa33', 1);
td(T.WORKBENCH, 'Workbench', '#8B7355', 5); td(T.FURNACE, 'Furnace', '#884422', 8);
td(T.ANVIL, 'Anvil', '#555566', 10); td(T.CHEST, 'Chest', '#AA8844', 5);
td(T.COBWEB, 'Cobweb', '#CCCCCC', 1); td(T.BLOOD_STONE, 'Blood Stone', '#660011', 12);
td(T.DEMON_BRICK, 'Demon Brick', '#440022', 15); td(T.BONE_BRICK, 'Bone Brick', '#C0B090', 8);
td(T.CRYSTAL, 'Crystal', '#88DDFF', 12, T.CRYSTAL, 2);
td(T.WATER, 'Water', '#1144AA', 0); td(T.LAVA, 'Lava', '#FF4400', 0);
td(T.BEDROCK, 'Bedrock', '#111111', 999);
// Phase 1 blocks
td(T.ICE, 'Ice', '#AADDFF', 6); td(T.SNOW, 'Snow', '#E8E8F0', 2);
td(T.FROZEN_STONE, 'Frozen Stone', '#7799AA', 10); td(T.MUSHROOM_STEM, 'Mushroom Stem', '#C4A882', 4);
td(T.MUSHROOM_CAP, 'Mushroom Cap', '#7733AA', 3); td(T.GLOW_SHROOM, 'Glow Shroom', '#33FFAA', 2);
td(T.HIVE_WALL, 'Hive Wall', '#AA8822', 8); td(T.HONEY_BLOCK, 'Honey Block', '#FFaa22', 4);
td(T.MOSSY_STONE, 'Mossy Stone', '#557755', 8); td(T.CRACKED_BRICK, 'Cracked Brick', '#887766', 6);
td(T.GLASS, 'Glass', '#BBDDEE', 3); td(T.DOOR, 'Door', '#8B6914', 4);
td(T.TABLE, 'Table', '#8B7355', 3); td(T.CHAIR, 'Chair', '#8B7355', 2);
td(T.BED, 'Bed', '#993333', 3); td(T.BOOKSHELF, 'Bookshelf', '#6B5030', 4);
td(T.CHANDELIER, 'Chandelier', '#CCAA44', 2); td(T.COOKING_STATION, 'Cooking Station', '#AA5533', 6);
td(T.BLOOD_ALTAR, 'Blood Altar', '#660022', 12); td(T.PRESSURE_PLATE, 'Pressure Plate', '#777777', 2);
td(T.LEVER, 'Lever', '#888888', 2); td(T.TNT, 'TNT', '#CC3333', 1);
td(T.STALACTITE, 'Stalactite', '#556666', 5); td(T.STALAGMITE, 'Stalagmite', '#556666', 5);
td(T.SPIDER_EGG, 'Spider Egg', '#DDDDAA', 3); td(T.FROST_ORE, 'Frost Ore', '#66CCFF', 16, T.FROST_ORE, 2);
td(T.HIVE_ORE, 'Hive Ore', '#DDAA33', 14, T.HIVE_ORE, 2);
// Phase 2 blocks
td(T.BLOOD, 'Blood', '#660011', 0); td(T.ACID, 'Acid', '#44FF00', 0);
td(T.CORRUPTION, 'Corruption', '#330022', 15); td(T.NPC_CAGE, 'NPC Cage', '#AAAAAA', 6);
td(T.CORRUPTED_STONE, 'Corrupted Stone', '#443344', 10); td(T.CORRUPTED_DIRT, 'Corrupted Dirt', '#3A2A2A', 4);
// Phase 6 blocks
td(T.SANDSTONE, 'Sandstone', '#D4B56A', 6); td(T.CACTUS, 'Cactus', '#2D8B2D', 3);
td(T.JUNGLE_GRASS, 'Jungle Grass', '#1A6B1A', 3); td(T.JUNGLE_VINE, 'Jungle Vine', '#0D4D0D', 1);
td(T.BAMBOO, 'Bamboo', '#7BAA3D', 2); td(T.WIRE, 'Wire', '#FF3333', 1);
td(T.DART_TRAP, 'Dart Trap', '#888888', 8); td(T.BOULDER_TRAP, 'Boulder Trap', '#777766', 10);
td(T.TELEPORTER, 'Teleporter', '#8844DD', 6); td(T.DUNGEON_BRICK, 'Dungeon Brick', '#445566', 15);
td(T.DUNGEON_DOOR, 'Dungeon Door', '#4A6688', 8); td(T.SPIKE, 'Spike', '#999999', 4);
td(T.QUEST_BOARD, 'Quest Board', '#AA8844', 5);
// World Evil tiles — Corruption
td(T.EBONSTONE, 'Ebonstone', '#2A1533', 18, T.EBONSTONE, 2); td(T.CORRUPT_GRASS, 'Corrupt Grass', '#3D1F4A', 3, T.DIRT);
td(T.SHADOW_ORB, 'Shadow Orb', '#9944DD', 20, T.SHADOW_ORB, 2); td(T.EBONSAND, 'Ebonsand', '#3A2A4A', 2);
td(T.CORRUPT_THORNS, 'Corrupt Thorns', '#551144', 2); td(T.CORRUPT_VINE, 'Corrupt Vine', '#442255', 1);
td(T.DEMONITE_ORE, 'Demonite Ore', '#5522AA', 16, T.DEMONITE_ORE, 1);
// World Evil tiles — Crimson
td(T.CRIMSTONE, 'Crimstone', '#6B1020', 18, T.CRIMSTONE, 2); td(T.CRIMSON_GRASS, 'Crimson Grass', '#8B2030', 3, T.DIRT);
td(T.CRIMSON_HEART, 'Crimson Heart', '#FF4466', 20, T.CRIMSON_HEART, 2); td(T.CRIMSAND, 'Crimsand', '#6B3030', 2);
td(T.CRIMSON_THORNS, 'Crimson Thorns', '#992233', 2); td(T.CRIMSON_VINE_TILE, 'Crimson Vine', '#771122', 1);
td(T.CRIMTANE_ORE, 'Crimtane Ore', '#CC2244', 16, T.CRIMTANE_ORE, 1);
// World Evil tiles — Void
td(T.VOID_STONE, 'Void Stone', '#0A0520', 18, T.VOID_STONE, 2); td(T.VOID_GRASS, 'Void Grass', '#1A0840', 3, T.DIRT);
td(T.STELLAR_FRAGMENT, 'Stellar Fragment', '#DDAAFF', 20, T.STELLAR_FRAGMENT, 2); td(T.VOID_RIFT, 'Void Rift', '#6600CC', 25);
td(T.DARK_NEBULA, 'Dark Nebula', '#110033', 10); td(T.COSMIC_SAND, 'Cosmic Sand', '#221144', 2);
td(T.ANTI_GRAVITY_CRYSTAL, 'Anti-Gravity Crystal', '#BB66FF', 15, T.ANTI_GRAVITY_CRYSTAL, 2);
td(T.VOIDITE_ORE, 'Voidite Ore', '#7722DD', 16, T.VOIDITE_ORE, 1);
// Surface biome tiles — Desert
td(T.HARDENED_SAND, 'Hardened Sand', '#C9A96E', 8, T.SAND); td(T.DESERT_FOSSIL, 'Desert Fossil', '#B89555', 12, T.DESERT_FOSSIL);
td(T.PALM_WOOD, 'Palm Wood', '#A0724A', 4, T.PALM_WOOD);
// Surface biome tiles — Snow/Ice
td(T.SLUSH, 'Slush', '#A0C8D8', 3, T.SLUSH); td(T.BOREAL_WOOD, 'Boreal Wood', '#6B5038', 4, T.BOREAL_WOOD);
td(T.THIN_ICE, 'Thin Ice', '#CCE8FF', 2, T.ICE);
// Surface biome tiles — Jungle
td(T.MUD, 'Mud', '#5A3A1A', 3, T.MUD); td(T.MAHOGANY_WOOD, 'Mahogany Wood', '#8B4513', 5, T.MAHOGANY_WOOD);
td(T.BEEHIVE, 'Beehive', '#D4A017', 6, T.BEEHIVE); td(T.LIFE_FRUIT, 'Life Fruit', '#22CC44', 1, T.LIFE_FRUIT);
// Space biome tiles
td(T.METEORITE, 'Meteorite', '#8B4000', 20, T.METEORITE, 2); td(T.LUMINITE, 'Luminite', '#44FFAA', 25, T.LUMINITE, 3);
td(T.LUNAR_SOIL, 'Lunar Soil', '#AAAAAA', 5, T.LUNAR_SOIL); td(T.ASTEROID_ROCK, 'Asteroid Rock', '#777788', 15, T.ASTEROID_ROCK, 1);
td(T.SPACE_GLASS, 'Space Glass', '#88BBFF', 8, T.SPACE_GLASS); td(T.LAUNCH_PAD, 'Launch Pad', '#445566', 10);
td(T.METEOR_CRATER, 'Meteor Crater', '#663300', 12, T.METEORITE);
// Hardmode tiles
td(T.COBALT_ORE, 'Cobalt Ore', '#3355CC', 22, T.COBALT_ORE, 2); td(T.MYTHRIL_ORE, 'Mythril Ore', '#55CC55', 25, T.MYTHRIL_ORE, 3);
td(T.TITANIUM_ORE, 'Titanium Ore', '#AAAACC', 28, T.TITANIUM_ORE, 3); td(T.HALLOWED_STONE, 'Hallowed Stone', '#EEDDFF', 15, T.HALLOWED_STONE, 2);
td(T.HALLOWED_GRASS, 'Hallowed Grass', '#AADDFF', 4, T.DIRT); td(T.HALLOWED_SAND, 'Hallowed Sand', '#FFE8CC', 5, T.HALLOWED_SAND);
td(T.PEARLSTONE, 'Pearlstone', '#DDCCFF', 12, T.PEARLSTONE, 2); td(T.CRYSTAL_SHARD, 'Crystal Shard', '#FF55FF', 3, T.CRYSTAL_SHARD);
// Phase 5: Dungeon & Temple tiles
td(T.DUNGEON_BRICK, 'Dungeon Brick', '#334466', 30, T.DUNGEON_BRICK, 2); td(T.CRACKED_BRICK, 'Cracked Brick', '#445577', 18, T.DUNGEON_BRICK, 1);
td(T.SPIKE_TRAP, 'Spike Trap', '#666655', 10, T.IRON_ORE); td(T.BONE_BLOCK, 'Bone Block', '#DDCCBB', 8, T.BONE_BLOCK);
td(T.LIHZAHRD_BRICK, 'Lihzahrd Brick', '#886633', 35, T.LIHZAHRD_BRICK, 3); td(T.LIHZAHRD_ALTAR, 'Lihzahrd Altar', '#AA7744', 50, T.LIHZAHRD_BRICK, 3);
td(T.WOODEN_SPIKE, 'Wooden Spike', '#664422', 6, T.WOOD); td(T.TEMPLE_DOOR, 'Temple Door', '#997744', 40, T.LIHZAHRD_BRICK, 3);
td(T.PLANTERA_BULB, 'Plantera Bulb', '#FF44AA', 5, T.PLANTERA_BULB); td(T.DUNGEON_CHEST, 'Dungeon Chest', '#5566AA', 15, T.DUNGEON_BRICK);
// Phase 6: Celestial tiles
td(T.SOLAR_FRAGMENT_BLOCK, 'Solar Fragment Block', '#FF6622', 40, T.SOLAR_FRAGMENT_BLOCK, 3); td(T.VORTEX_FRAGMENT_BLOCK, 'Vortex Fragment Block', '#22CCAA', 40, T.VORTEX_FRAGMENT_BLOCK, 3);
td(T.NEBULA_FRAGMENT_BLOCK, 'Nebula Fragment Block', '#CC44FF', 40, T.NEBULA_FRAGMENT_BLOCK, 3); td(T.STARDUST_FRAGMENT_BLOCK, 'Stardust Fragment Block', '#4488FF', 40, T.STARDUST_FRAGMENT_BLOCK, 3);
td(T.CELESTIAL_ALTAR, 'Celestial Altar', '#FFDDAA', 60, T.CELESTIAL_ALTAR, 4);
// Phase 7: Herb tiles
td(T.DAYBLOOM, 'Daybloom', '#FFEE44', 1, T.GRASS); td(T.MOONGLOW, 'Moonglow', '#AACCFF', 1, T.JUNGLE_GRASS);
td(T.WATERLEAF, 'Waterleaf', '#44BBFF', 1, T.SAND); td(T.BLINKROOT, 'Blinkroot', '#88DD88', 1, T.STONE);
td(T.DEATHWEED, 'Deathweed', '#664488', 1, T.CORRUPTION); td(T.FIREBLOSSOM, 'Fireblossom', '#FF6633', 1, T.ASH);
td(T.SHIVERTHORN, 'Shiverthorn', '#88DDEE', 1, T.SNOW); td(T.ALCHEMY_STATION, 'Alchemy Station', '#886644', 10, T.WOOD);
// Phase 9: Liquid tiles
td(T.WATER, 'Water', '#3366CC', 0, T.WATER); td(T.LAVA, 'Lava', '#FF4400', 0, T.LAVA); td(T.HONEY, 'Honey', '#FFAA22', 0, T.HONEY);
// Phase 9: Wire tiles (invisible on normal view, shown with wrench)
td(T.WIRE_RED, 'Red Wire', '#FF4444', 0, T.AIR); td(T.WIRE_BLUE, 'Blue Wire', '#4444FF', 0, T.AIR);
td(T.WIRE_GREEN, 'Green Wire', '#44FF44', 0, T.AIR); td(T.WIRE_YELLOW, 'Yellow Wire', '#FFFF44', 0, T.AIR);
// Phase 9: Mechanism tiles
td(T.SWITCH, 'Switch', '#886644', 3, T.WOOD); td(T.LEVER, 'Lever', '#886644', 3, T.WOOD);
td(T.PRESSURE_PLATE, 'Pressure Plate', '#AAAAAA', 2, T.IRON); td(T.TIMER_TILE, '1s Timer', '#FFAA22', 5, T.GOLD);
td(T.DART_TRAP, 'Dart Trap', '#886644', 8, T.STONE); td(T.SPEAR_TRAP, 'Spear Trap', '#88AACC', 8, T.STONE);
td(T.FLAME_TRAP, 'Flame Trap', '#FF6622', 10, T.STONE); td(T.SPIKE_BALL_TRAP, 'Spike Ball', '#666666', 8, T.STONE);
td(T.TELEPORTER, 'Teleporter', '#8844CC', 12, T.GOLD); td(T.ACTUATOR, 'Actuator', '#6688AA', 5, T.IRON);

// ===== ITEMS =====
const ITEMS = {};
let ITEM_ID = 100;
function item(name, type, color, extra) { const id = ITEM_ID++; ITEMS[id] = { id, name, type, color, ...extra }; return id; }
// Tools
const I_WOOD_PICK = item('Wood Pickaxe', 'tool', '#8B6914', { tier: 0, power: 3, speed: 5, toolType: 'pick' });
const I_IRON_PICK = item('Iron Pickaxe', 'tool', '#A0785A', { tier: 1, power: 6, speed: 4, toolType: 'pick' });
const I_GOLD_PICK = item('Gold Pickaxe', 'tool', '#FFD700', { tier: 2, power: 9, speed: 3, toolType: 'pick' });
const I_CRIMSON_PICK = item('Crimson Pickaxe', 'tool', '#CC1133', { tier: 3, power: 14, speed: 2, toolType: 'pick' });
const I_SHADOW_PICK = item('Shadow Pickaxe', 'tool', '#7700CC', { tier: 4, power: 20, speed: 1, toolType: 'pick' });
// Swords
const I_WOOD_SWORD = item('Wood Sword', 'weapon', '#8B6914', { damage: 8, speed: 6, range: 40 });
const I_IRON_SWORD = item('Iron Sword', 'weapon', '#A0785A', { damage: 15, speed: 5, range: 44 });
const I_GOLD_SWORD = item('Gold Sword', 'weapon', '#FFD700', { damage: 22, speed: 4, range: 48 });
const I_CRIMSON_SWORD = item('Crimson Blade', 'weapon', '#CC1133', { damage: 35, speed: 3, range: 52 });
const I_SHADOW_SWORD = item('Shadow Scythe', 'weapon', '#7700CC', { damage: 50, speed: 2, range: 60 });
// Bows
const I_WOOD_BOW = item('Wood Bow', 'bow', '#8B6914', { damage: 10, speed: 8 });
const I_IRON_BOW = item('Iron Bow', 'bow', '#A0785A', { damage: 18, speed: 6 });
// Arrows
const I_ARROW = item('Arrow', 'ammo', '#8B6914', { damage: 5 });
const I_FIRE_ARROW = item('Fire Arrow', 'ammo', '#FF4400', { damage: 12 });
// Armor
const I_IRON_HELM = item('Iron Helmet', 'armor', '#A0785A', { defense: 3, slot: 'head' });
const I_IRON_CHEST = item('Iron Chestplate', 'armor', '#A0785A', { defense: 5, slot: 'chest' });
const I_GOLD_HELM = item('Gold Helmet', 'armor', '#FFD700', { defense: 5, slot: 'head' });
const I_GOLD_CHEST = item('Gold Chestplate', 'armor', '#FFD700', { defense: 8, slot: 'chest' });
const I_CRIMSON_HELM = item('Crimson Helm', 'armor', '#CC1133', { defense: 8, slot: 'head' });
const I_CRIMSON_CHEST = item('Crimson Plate', 'armor', '#CC1133', { defense: 12, slot: 'chest' });
// Materials
const I_IRON_BAR = item('Iron Bar', 'material', '#A0785A', {});
const I_GOLD_BAR = item('Gold Bar', 'material', '#FFD700', {});
const I_CRIMSON_BAR = item('Crimson Bar', 'material', '#CC1133', {});
const I_SHADOW_BAR = item('Shadow Bar', 'material', '#7700CC', {});
const I_GEL = item('Gel', 'material', '#44CC44', {});
const I_LENS = item('Lens', 'material', '#CC4444', {});
const I_BONE_FRAG = item('Bone Fragment', 'material', '#D4C9A8', {});
const I_DEMON_HEART = item('Demon Heart', 'material', '#880033', {});
// Potions
const I_HEALTH_POT = item('Health Potion', 'potion', '#CC2244', { heal: 50 });
const I_MANA_POT = item('Mana Potion', 'potion', '#2244CC', { mana: 50 });
const I_SPEED_POT = item('Speed Potion', 'potion', '#44CC44', { effect: 'speed', duration: 600 });
// Phase 1 — New tool tiers
const I_BONE_PICK = item('Bone Pickaxe', 'tool', '#D4C9A8', { tier: 1, power: 5, speed: 5, toolType: 'pick' });
const I_BONE_SWORD = item('Bone Sword', 'weapon', '#D4C9A8', { damage: 12, speed: 5, range: 42 });
const I_FLESH_PICK = item('Flesh Pickaxe', 'tool', '#8B3A3A', { tier: 2, power: 8, speed: 4, toolType: 'pick' });
const I_FLESH_SWORD = item('Flesh Cleaver', 'weapon', '#8B3A3A', { damage: 20, speed: 4, range: 46 });
const I_CRYSTAL_PICK = item('Crystal Pickaxe', 'tool', '#88DDFF', { tier: 3, power: 12, speed: 3, toolType: 'pick' });
const I_CRYSTAL_SWORD = item('Crystal Blade', 'weapon', '#88DDFF', { damage: 30, speed: 3, range: 50 });
const I_HELLFORGED_PICK = item('Hellforged Pickaxe', 'tool', '#FF6622', { tier: 4, power: 18, speed: 2, toolType: 'pick' });
const I_HELLFORGED_SWORD = item('Hellforged Blade', 'weapon', '#FF6622', { damage: 45, speed: 3, range: 55 });
// Phase 1 — Accessories
const I_JUMP_RING = item('Ring of Leaping', 'accessory', '#44DD44', { effect: 'doublejump', slot: 'acc1' });
const I_FIRE_AMULET = item('Fire Amulet', 'accessory', '#FF4400', { effect: 'fireimmune', slot: 'acc1' });
const I_NIGHT_AMULET = item('Night Vision Amulet', 'accessory', '#FFDD00', { effect: 'nightvision', slot: 'acc1' });
const I_CLIMB_BOOTS = item('Spider Boots', 'accessory', '#333333', { effect: 'wallclimb', slot: 'acc2' });
const I_SPEED_BOOTS = item('Hermes Boots', 'accessory', '#FFAA33', { effect: 'speed_perm', slot: 'acc2' });
const I_SHIELD = item('Bone Shield', 'accessory', '#C0B090', { effect: 'shield', defense: 6, slot: 'acc1' });
// Phase 1 — Magic weapons
const I_FIRE_STAFF = item('Fire Staff', 'magic', '#FF4400', { damage: 25, speed: 10, manaCost: 8, projectile: 'fireball' });
const I_ICE_STAFF = item('Ice Staff', 'magic', '#88DDFF', { damage: 20, speed: 8, manaCost: 6, projectile: 'icebolt' });
const I_SHADOW_STAFF = item('Shadow Staff', 'magic', '#7700CC', { damage: 40, speed: 12, manaCost: 15, projectile: 'shadowbolt' });
const I_HEAL_STAFF = item('Healing Staff', 'magic', '#44CC44', { damage: 0, speed: 15, manaCost: 12, projectile: 'heal' });
// Phase 1 — Fishing & Food
const I_FISHING_ROD = item('Fishing Rod', 'tool', '#8B6914', { toolType: 'fishing' });
const I_RAW_FISH = item('Raw Fish', 'material', '#6699AA', {});
const I_COOKED_FISH = item('Cooked Fish', 'food', '#CC8844', { heal: 30, buff: 'regen', buffDur: 300 });
const I_MUSHROOM_STEW = item('Mushroom Stew', 'food', '#7733AA', { heal: 40, buff: 'mana_regen', buffDur: 400 });
const I_HONEY_BREAD = item('Honey Bread', 'food', '#DDAA33', { heal: 25, buff: 'defense', buffDur: 500 });
const I_HELLFIRE_STEAK = item('Hellsteak', 'food', '#CC3300', { heal: 60, buff: 'damage', buffDur: 600 });
// Phase 1 — New materials
const I_FROST_BAR = item('Frost Bar', 'material', '#66CCFF', {});
const I_HIVE_WAX = item('Hive Wax', 'material', '#DDAA33', {});
const I_MUSHROOM_SPORE = item('Mushroom Spore', 'material', '#33FFAA', {});
const I_SPIDER_FANG = item('Spider Fang', 'material', '#AAAAAA', {});
const I_ICE_SHARD = item('Ice Shard', 'material', '#AADDFF', {});
const I_ROYAL_JELLY = item('Royal Jelly', 'material', '#FFCC44', {});
// Phase 1 — Boss summon items
const I_SUSPICIOUS_EYE = item('Suspicious Eye', 'summon', '#CC2244', { boss: 'eye_of_terror' });
const I_BONE_TOTEM = item('Bone Totem', 'summon', '#C0B090', { boss: 'bone_colossus' });
const I_DEMON_SIGIL = item('Demon Sigil', 'summon', '#660033', { boss: 'demon_lord' });
const I_HIVE_CROWN = item('Hive Crown', 'summon', '#DDAA33', { boss: 'hive_queen' });
const I_FROST_RUNE = item('Frost Rune', 'summon', '#66CCFF', { boss: 'frost_lich' });
const I_CORRUPT_HEART = item('Corrupt Heart', 'summon', '#440033', { boss: 'corruption' });
// Phase 1 — New armor
const I_FROST_HELM = item('Frost Helmet', 'armor', '#88CCFF', { defense: 7, slot: 'head' });
const I_FROST_CHEST = item('Frost Chestplate', 'armor', '#88CCFF', { defense: 10, slot: 'chest' });
const I_HIVE_HELM = item('Hive Helmet', 'armor', '#AA8822', { defense: 6, slot: 'head' });
const I_HIVE_CHEST = item('Hive Chestplate', 'armor', '#AA8822', { defense: 9, slot: 'chest' });
const I_HELLFORGED_HELM = item('Hellforged Helmet', 'armor', '#FF6622', { defense: 10, slot: 'head' });
const I_HELLFORGED_CHEST = item('Hellforged Chestplate', 'armor', '#FF6622', { defense: 15, slot: 'chest' });
// Phase 2 — Buckets
const I_BUCKET_EMPTY = item('Empty Bucket', 'tool', '#888888', { toolType: 'bucket', liquid: null });
const I_BUCKET_WATER = item('Water Bucket', 'tool', '#1144AA', { toolType: 'bucket', liquid: T.WATER });
const I_BUCKET_LAVA = item('Lava Bucket', 'tool', '#FF4400', { toolType: 'bucket', liquid: T.LAVA });
const I_BUCKET_BLOOD = item('Blood Bucket', 'tool', '#660011', { toolType: 'bucket', liquid: T.BLOOD });
const I_BUCKET_ACID = item('Acid Bucket', 'tool', '#44FF00', { toolType: 'bucket', liquid: T.ACID });
// Phase 2 — NPC shop items
const I_TOWN_MAP = item('Town Map', 'material', '#DDCC88', {});
const I_RECALL_POTION = item('Recall Potion', 'potion', '#FFDD44', { effect: 'recall' });
const I_GREATER_HEALTH = item('Greater Health Potion', 'potion', '#FF2244', { heal: 100 });
const I_GREATER_MANA = item('Greater Mana Potion', 'potion', '#2244FF', { mana: 100 });
const I_ENCHANT_SCROLL = item('Enchant Scroll', 'material', '#CC88FF', {});
const I_MAGIC_MIRROR = item('Magic Mirror', 'tool', '#AADDFF', { toolType: 'mirror' });

// ===== PHASE 5: GUN WEAPON SYSTEM =====
// Ammo
const I_MUSKET_BALL = item('Musket Ball', 'ammo', '#888888', { damage: 8 });
const I_SILVER_BULLET = item('Silver Bullet', 'ammo', '#CCCCDD', { damage: 14 });
const I_EXPLOSIVE_ROUND = item('Explosive Round', 'ammo', '#FF6633', { damage: 22, explosive: true });
const I_CURSED_BULLET = item('Cursed Bullet', 'ammo', '#7700AA', { damage: 30, piercing: true });
// Guns (type: 'gun')
const I_LIGHT_MUSKET = item('Light Musket', 'gun', '#AA9966', { damage: 12, speed: 18, range: 200, knockback: 3 });
const I_FLINTLOCK = item('Flintlock Pistol', 'gun', '#776644', { damage: 16, speed: 12, range: 160, knockback: 2 });
const I_BLUNDERBUSS = item('Blunderbuss', 'gun', '#665533', { damage: 28, speed: 28, range: 100, knockback: 6, spread: 5 });
const I_IRON_REPEATER = item('Iron Repeater', 'gun', '#8899AA', { damage: 14, speed: 8, range: 220, knockback: 2 });
const I_GOLD_RIFLE = item('Gold Rifle', 'gun', '#DDBB33', { damage: 24, speed: 14, range: 280, knockback: 4 });
const I_CRIMSON_CARBINE = item('Crimson Carbine', 'gun', '#CC2244', { damage: 32, speed: 10, range: 260, knockback: 4 });
const I_SHADOW_SNIPER = item('Shadow Sniper', 'gun', '#440066', { damage: 55, speed: 30, range: 400, knockback: 5 });
const I_HELLFIRE_CANNON = item('Hellfire Cannon', 'gun', '#FF4400', { damage: 45, speed: 20, range: 300, knockback: 8, explosive: true });

// ===== PHASE 5: NEW MATERIALS =====
const I_GUNPOWDER = item('Gunpowder', 'material', '#333333', {});
const I_MECHANISM = item('Mechanism', 'material', '#899AA', {});
const I_VOID_SHARD = item('Void Shard', 'material', '#220044', {});
const I_ABYSSAL_SCALE = item('Abyssal Scale', 'material', '#224466', {});
const I_SOUL_FRAGMENT = item('Soul Fragment', 'material', '#88AAFF', {});
const I_TITAN_CORE = item('Titan Core', 'material', '#DDAA44', {});
const I_PLAGUE_ESSENCE = item('Plague Essence', 'material', '#66AA22', {});
const I_STORM_CHARGE = item('Storm Charge', 'material', '#44CCFF', {});

// ===== PHASE 5: NEW BOSS-DROP WEAPONS =====
const I_VOID_KATANA = item('Void Katana', 'weapon', '#330066', { damage: 65, speed: 2, range: 55 });
const I_ABYSSAL_TRIDENT = item('Abyssal Trident', 'weapon', '#2255AA', { damage: 55, speed: 3, range: 65 });
const I_SOUL_REAPER = item('Soul Reaper', 'weapon', '#6688FF', { damage: 70, speed: 4, range: 60 });
const I_TITAN_FIST = item('Titan Fist', 'weapon', '#CC8822', { damage: 80, speed: 6, range: 35 });
const I_PLAGUE_SCYTHE = item('Plague Scythe', 'weapon', '#55AA11', { damage: 48, speed: 3, range: 58 });
const I_STORM_BOW = item('Storm Bow', 'bow', '#33BBFF', { damage: 40, speed: 4 });
const I_RAVAGER_CLAW = item('Ravager Claw', 'weapon', '#CC4422', { damage: 42, speed: 2, range: 45 });
const I_HIVEMIND_STAFF = item('Hivemind Staff', 'magic', '#CC44CC', { damage: 35, speed: 8, manaCost: 10, projectile: 'psychic' });

// ===== PHASE 5: NEW ARMOR =====
const I_VOID_HELM = item('Void Helmet', 'armor', '#330055', { defense: 12, slot: 'head' });
const I_VOID_CHEST = item('Void Chestplate', 'armor', '#330055', { defense: 18, slot: 'chest' });
const I_ABYSSAL_HELM = item('Abyssal Helmet', 'armor', '#224466', { defense: 11, slot: 'head' });
const I_ABYSSAL_CHEST = item('Abyssal Chestplate', 'armor', '#224466', { defense: 16, slot: 'chest' });
const I_TITAN_HELM = item('Titan Helmet', 'armor', '#CC8822', { defense: 14, slot: 'head' });
const I_TITAN_CHEST = item('Titan Chestplate', 'armor', '#CC8822', { defense: 22, slot: 'chest' });

// ===== PHASE 5: NEW BOSS SUMMON ITEMS =====
const I_RAVAGER_FANG = item('Ravager Fang', 'summon', '#CC4422', { boss: 'ravager' });
const I_HIVEMIND_CORE = item('Hivemind Core', 'summon', '#CC44CC', { boss: 'hive_mind' });
const I_SERPENT_SCALE = item('Serpent Scale', 'summon', '#224466', { boss: 'abyssal_serpent' });
const I_SOUL_LANTERN = item('Soul Lantern', 'summon', '#88AAFF', { boss: 'soul_devourer' });
const I_PLAGUE_FLASK = item('Plague Flask', 'summon', '#66AA22', { boss: 'plague_doctor' });
const I_STORM_PRISM = item('Storm Prism', 'summon', '#44CCFF', { boss: 'storm_colossus' });
const I_BLOOD_CHALICE = item('Blood Chalice', 'summon', '#AA0022', { boss: 'blood_titan' });
const I_BLUEPRINT_SCROLL = item('Blueprint Scroll', 'summon', '#DDDDAA', { boss: 'architect' });

// ===== PHASE 5: ACCESSORIES =====
const I_GUNSLINGER_GLOVE = item('Gunslinger Glove', 'accessory', '#AA8855', { effect: 'fast_guns', slot: 'acc2' });
const I_AMMO_POUCH = item('Ammo Pouch', 'accessory', '#886633', { effect: 'ammo_save', slot: 'acc1' });

// ===== PHASE 6: FISHING =====
const I_WOOD_ROD = item('Wood Fishing Rod', 'fishing_rod', '#8B6914', { power: 10, speed: 60 });
const I_IRON_ROD = item('Iron Fishing Rod', 'fishing_rod', '#A0785A', { power: 20, speed: 45 });
const I_GOLD_ROD = item('Gold Fishing Rod', 'fishing_rod', '#FFD700', { power: 35, speed: 30 });
const I_CRIMSON_ROD = item('Crimson Fishing Rod', 'fishing_rod', '#CC1133', { power: 50, speed: 20 });
const I_WORM = item('Worm', 'bait', '#AA6633', { baitPower: 10 });
const I_FIREFLY_BAIT = item('Firefly', 'bait', '#AAFF44', { baitPower: 20 });
const I_GLOWWORM = item('Glowworm', 'bait', '#44FFAA', { baitPower: 35 });
const I_BASS = item('Bass', 'fish', '#6688AA', { value: 5 });
const I_TROUT = item('Trout', 'fish', '#88AA77', { value: 8 });
const I_CAVEFISH = item('Cavefish', 'fish', '#997788', { value: 15 });
const I_LAVAFISH = item('Lavafish', 'fish', '#FF6633', { value: 25 });
const I_GOLDEN_CARP = item('Golden Carp', 'fish', '#FFD700', { value: 50, rare: true });
const I_FISH_CRATE = item('Fishing Crate', 'crate', '#AA8844', { loot: true });
const I_SUSHI = item('Sushi', 'food', '#FF8899', { heal: 40, effect: 'well_fed', duration: 3600 });

// ===== PHASE 6: PETS =====
const I_PET_SHADOW_CAT = item('Shadow Kitty', 'pet', '#332244', { petType: 'shadow_cat', buff: 'speed', buffAmt: 0.1 });
const I_PET_BABY_DRAGON = item('Baby Dragon', 'pet', '#CC4422', { petType: 'baby_dragon', buff: 'damage', buffAmt: 5 });
const I_PET_SLIME = item('Pet Slime', 'pet', '#44CC44', { petType: 'slime', buff: 'defense', buffAmt: 3 });
const I_PET_WISP = item('Will-o-Wisp', 'pet', '#88CCFF', { petType: 'wisp', buff: 'light', buffAmt: 1 });
const I_PET_SKULL = item('Floating Skull', 'pet', '#DDDDCC', { petType: 'skull', buff: 'crit', buffAmt: 0.1 });
const I_PET_FAIRY = item('Fairy', 'pet', '#FFAADD', { petType: 'fairy', buff: 'regen', buffAmt: 1 });

// ===== PHASE 6: MOUNTS =====
const I_MOUNT_HORSE = item('Spectral Horse', 'mount', '#8866AA', { mountType: 'horse', speedMult: 1.8, jumpMult: 1.3 });
const I_MOUNT_CLOUD = item('Storm Cloud', 'mount', '#AACCFF', { mountType: 'cloud', speedMult: 1.4, jumpMult: 2.0, flight: true });
const I_MOUNT_LAVA = item('Lava Surfer', 'mount', '#FF6622', { mountType: 'lava', speedMult: 1.5, lavaImmune: true });
const I_MOUNT_VOID = item('Void Walker', 'mount', '#440088', { mountType: 'void', speedMult: 2.0, jumpMult: 1.5 });

// ===== PHASE 6: STATUS EFFECT POTIONS =====
const I_POISON_FLASK = item('Poison Flask', 'thrown', '#66AA22', { effect: 'poison', damage: 3, duration: 300 });
const I_FREEZE_BOMB = item('Freeze Bomb', 'thrown', '#66CCFF', { effect: 'frozen', duration: 120 });
const I_BLEED_KNIFE = item('Serrated Knife', 'weapon', '#AA3333', { damage: 18, speed: 4, range: 36, onHit: 'bleeding' });
const I_RAGE_POTION = item('Rage Potion', 'potion', '#FF4422', { effect: 'rage', duration: 1800 });
const I_SHIELD_POTION = item('Shield Potion', 'potion', '#4488CC', { effect: 'shield', duration: 1800 });
const I_THORNS_POTION = item('Thorns Potion', 'potion', '#44AA44', { effect: 'thorns', duration: 1800 });
const I_HASTE_POTION = item('Haste Potion', 'potion', '#FFCC22', { effect: 'haste', duration: 1800 });
const I_INVIS_POTION = item('Invisibility Potion', 'potion', '#AABBCC', { effect: 'invisible', duration: 900 });
const I_LIFESTEAL_RING = item('Lifesteal Ring', 'accessory', '#CC2244', { effect: 'lifesteal', slot: 'acc3' });
const I_THORNS_RING = item('Thorns Ring', 'accessory', '#44AA44', { effect: 'thorns_passive', slot: 'acc4' });

// ===== PHASE 6: WIRING =====
const I_WIRE_ITEM = item('Wire', 'material', '#FF3333', { placeTile: T.WIRE });
const I_WRENCH = item('Wrench', 'tool', '#888888', { toolType: 'wrench' });

// ===== PHASE 7: QUEST & DUNGEON =====
const I_DUNGEON_KEY = item('Dungeon Key', 'key', '#DDAA44', { opens: 'dungeon_door' });
const I_QUEST_SCROLL = item('Quest Scroll', 'quest', '#DDDDAA', { questType: 'random' });
const I_BOSS_TROPHY = item('Boss Trophy', 'trophy', '#FFD700', { decorative: true });
const I_ACHIEVEMENT_TOKEN = item('Achievement Token', 'currency', '#FF8800', { value: 1 });
const I_DUNGEON_LOOT_BAG = item('Dungeon Loot Bag', 'crate', '#7766AA', { loot: true });
const I_JUNGLE_SPORE = item('Jungle Spore', 'material', '#33AA33', {});
const I_DESERT_FOSSIL = item('Desert Fossil', 'material', '#CCAA66', {});
const I_JUNGLE_SWORD = item('Jungle Blade', 'weapon', '#22AA22', { damage: 28, speed: 4, range: 50 });
const I_DESERT_BOOMERANG = item('Sand Boomerang', 'weapon', '#DDBB55', { damage: 22, speed: 6, range: 80, returns: true });
const I_ANCHOR_CHARM = item('Anchor Charm', 'accessory', '#4488AA', { effect: 'no_knockback', slot: 'acc5' });
const I_LAVA_CHARM = item('Lava Charm', 'accessory', '#FF6622', { effect: 'lava_immune', slot: 'acc6' });

// ===== PHASE A: NEW MATERIALS =====
const I_LEATHER = item('Leather', 'material', '#886644', {});
const I_VINE = item('Vine', 'material', '#338822', {});
const I_LEVIATHAN_SCALE = item('Leviathan Scale', 'material', '#2266AA', {});
const I_BARK_PLATE = item('Bark Plate', 'material', '#665533', {});
const I_CRYO_CORE = item('Cryo Core', 'material', '#88DDFF', {});
const I_INFERNAL_CORE = item('Infernal Core', 'material', '#FF4400', {});
const I_VOID_DRAGON_SCALE = item('Void Dragon Scale', 'material', '#440088', {});
const I_CELESTIAL_FRAGMENT = item('Celestial Fragment', 'material', '#FFD700', {});
const I_LUNAR_SHARD = item('Lunar Shard', 'material', '#CCDDFF', {});
const I_LEGENDARY_FRAGMENT = item('Legendary Fragment', 'material', '#FF8800', {});

// ===== PHASE A2: WHIP WEAPONS =====
const I_LEATHER_WHIP = item('Leather Whip', 'whip', '#886644', { damage: 14, speed: 6, range: 65 });
const I_THORN_WHIP = item('Thorn Whip', 'whip', '#338822', { damage: 22, speed: 5, range: 70, onHit: 'poison', element: 'poison' });
const I_FLAME_WHIP = item('Flame Whip', 'whip', '#FF4400', { damage: 35, speed: 4, range: 75, onHit: 'burning', element: 'fire' });
const I_ABYSSAL_LASH = item('Abyssal Lash', 'whip', '#2266AA', { damage: 52, speed: 3, range: 80, element: 'water', pull: true });
const I_VOID_TENDRIL = item('Void Tendril', 'whip', '#440088', { damage: 68, speed: 3, range: 90, element: 'void' });

// ===== PHASE A2: SPEAR WEAPONS =====
const I_WOOD_SPEAR = item('Wood Spear', 'spear', '#8B6914', { damage: 11, speed: 7, range: 55 });
const I_IRON_SPEAR = item('Iron Spear', 'spear', '#A0785A', { damage: 20, speed: 6, range: 60 });
const I_TRIDENT = item('Trident', 'spear', '#2266AA', { damage: 30, speed: 5, range: 70, element: 'water' });
const I_MOLTEN_SPEAR = item('Molten Spear', 'spear', '#FF6622', { damage: 42, speed: 4, range: 65, element: 'fire', onHit: 'burning' });
const I_VOID_LANCE = item('Void Lance', 'spear', '#440088', { damage: 72, speed: 3, range: 80, element: 'void', piercing: true });

// ===== PHASE A2: FLAIL WEAPONS =====
const I_BALL_CHAIN = item('Ball and Chain', 'flail', '#888888', { damage: 18, speed: 8, range: 50, knockback: 6 });
const I_SUNFURY = item('Sunfury', 'flail', '#FFAA33', { damage: 34, speed: 6, range: 55, element: 'fire', knockback: 8 });
const I_DAO_OF_POW = item('Dao of Pow', 'flail', '#CC44CC', { damage: 45, speed: 5, range: 60, knockback: 10 });
const I_GOLEM_FIST = item('Golem Fist', 'flail', '#CC8822', { damage: 65, speed: 7, range: 45, knockback: 14 });
const I_CHAIN_OF_SOULS = item('Chain of Souls', 'flail', '#6688FF', { damage: 78, speed: 5, range: 70, element: 'necrotic', knockback: 12 });

// ===== PHASE A2: BOOMERANG WEAPONS =====
const I_WOOD_BOOMERANG = item('Wood Boomerang', 'boomerang', '#8B6914', { damage: 12, speed: 10, range: 120, returns: true });
const I_ENCHANTED_BOOMERANG = item('Enchanted Boomerang', 'boomerang', '#8844CC', { damage: 24, speed: 8, range: 150, returns: true, element: 'holy' });
const I_ICE_BOOMERANG = item('Ice Boomerang', 'boomerang', '#66CCFF', { damage: 36, speed: 7, range: 160, returns: true, element: 'ice', onHit: 'frozen' });
const I_FLAME_BOOMERANG = item('Flame Boomerang', 'boomerang', '#FF6622', { damage: 48, speed: 6, range: 170, returns: true, element: 'fire', onHit: 'burning' });
const I_POSSESSED_HATCHET = item('Possessed Hatchet', 'boomerang', '#7700CC', { damage: 70, speed: 4, range: 200, returns: true, homing: true });

// ===== PHASE A2: YOYO WEAPONS =====
const I_WOOD_YOYO = item('Wood Yoyo', 'yoyo', '#8B6914', { damage: 10, range: 80, duration: 180 });
const I_RALLY = item('Rally', 'yoyo', '#DDAA33', { damage: 18, range: 100, duration: 300 });
const I_CASCADE = item('Cascade', 'yoyo', '#FF6622', { damage: 30, range: 130, duration: 420, element: 'fire' });
const I_TERRARIAN_YOYO = item('Terrarian', 'yoyo', '#44DDFF', { damage: 55, range: 180, duration: 999, orbitalProjectiles: true });

// ===== PHASE A2: LAUNCHER WEAPONS =====
const I_GRENADE_LAUNCHER = item('Grenade Launcher', 'launcher', '#445544', { damage: 40, speed: 20, range: 200, explosive: true, blastRadius: 48 });
const I_ROCKET_LAUNCHER = item('Rocket Launcher', 'launcher', '#AA4433', { damage: 65, speed: 25, range: 250, explosive: true, blastRadius: 64 });
const I_PROXIMITY_MINE = item('Proximity Mine Launcher', 'launcher', '#888844', { damage: 50, speed: 18, range: 150, explosive: true, blastRadius: 56, mine: true });
const I_STARCANNON = item('Starcannon', 'launcher', '#FFDD44', { damage: 85, speed: 15, range: 300, explosive: true, blastRadius: 72, element: 'holy' });
const I_VOID_DEVASTATOR = item('Void Devastator', 'launcher', '#220044', { damage: 120, speed: 30, range: 350, explosive: true, blastRadius: 96, element: 'void' });

// ===== PHASE A2: ADDITIONAL WEAPONS (Boss drops from Phase B) =====
const I_LIVING_WOOD_SWORD = item('Living Wood Sword', 'weapon', '#558833', { damage: 32, speed: 4, range: 48, onHit: 'regen', element: 'holy', healOnHit: 2 });
const I_PHARAOH_KHOPESH = item('Pharaoh\'s Khopesh', 'weapon', '#DDAA44', { damage: 38, speed: 3, range: 50, doubleHit: true });
const I_ANKH_STAFF = item('Ankh Staff', 'magic', '#FFD700', { damage: 28, speed: 8, manaCost: 10, projectile: 'ankh', healOnHit: 5, element: 'holy' });
const I_TIDAL_BOW = item('Tidal Bow', 'bow', '#2266AA', { damage: 35, speed: 5, multishot: 3, element: 'water' });
const I_MYCELIUM_STAFF = item('Mycelium Staff', 'magic', '#AA8833', { damage: 42, speed: 10, manaCost: 12, projectile: 'spore_cloud', element: 'poison', lingering: true });
const I_FUNGAL_FLAIL = item('Fungal Flail', 'flail', '#AA8833', { damage: 45, speed: 6, range: 55, onHit: 'poison', element: 'poison', knockback: 8 });
const I_FROSTBITE_LANCE = item('Frostbite Lance', 'spear', '#66CCFF', { damage: 50, speed: 5, range: 65, element: 'ice', bonusVsFrozen: 1.4 });
const I_BLIZZARD_GUN = item('Blizzard Gun', 'gun', '#88CCFF', { damage: 38, speed: 6, range: 180, spread: 5, element: 'ice', onHit: 'frozen' });
const I_WIDOWS_BITE = item('Widow\'s Bite', 'yoyo', '#553366', { damage: 34, range: 110, duration: 360, element: 'poison', onHit: 'poison' });
const I_WEB_SLINGER = item('Web Slinger', 'tool', '#CCCCCC', { toolType: 'grapple', range: 200 });
const I_SPIDER_DAGGER = item('Spider Fang Dagger', 'weapon', '#AAAAAA', { damage: 26, speed: 2, range: 36, multiStrike: 3, onHit: 'poison' });
const I_MAGMA_GREATSWORD = item('Magma Greatsword', 'weapon', '#FF4400', { damage: 68, speed: 5, range: 58, element: 'fire', fireTrail: true });
const I_ERUPTION_CANNON = item('Eruption Cannon', 'launcher', '#FF4400', { damage: 75, speed: 22, range: 260, explosive: true, blastRadius: 80, element: 'fire', lavaPool: true });
const I_ALL_SEEING_BOW = item('All-Seeing Bow', 'bow', '#DDAA44', { damage: 55, speed: 6, homing: true, range: 250, element: 'holy' });
const I_EYE_OF_JUDGMENT = item('Eye of Judgment', 'magic', '#DDAA44', { damage: 60, speed: 3, manaCost: 4, projectile: 'beam', continuous: true, element: 'holy' });
const I_THIRD_EYE_AMULET = item('Third Eye Amulet', 'accessory', '#DDAA44', { effect: 'truesight', slot: 'acc7' });
const I_STAR_WRATH = item('Star Wrath', 'weapon', '#FFDD44', { damage: 110, speed: 4, range: 55, starfall: true, element: 'holy' });
const I_MEOWMERE = item('Meowmere', 'weapon', '#FF88CC', { damage: 120, speed: 3, range: 50, bouncingProjectile: true });
const I_LAST_PRISM = item('Last Prism', 'magic', '#FFAAFF', { damage: 100, speed: 2, manaCost: 8, projectile: 'prism', continuous: true, convergingBeams: 6 });
const I_LUNAR_WINGS = item('Lunar Wings', 'accessory', '#CCDDFF', { effect: 'infinite_flight', slot: 'acc8' });
const I_DESERT_CROWN = item('Desert Crown', 'accessory', '#DDAA44', { effect: 'sandstorm_immune', slot: 'acc9' });

// ===== WORLD EVIL ITEMS =====
// Demonite (Corruption)
const I_DEMONITE_BAR = item('Demonite Bar', 'material', '#5522AA', {});
const I_DEMONITE_PICK = item('Demonite Pickaxe', 'tool', '#5522AA', { tier: 2, power: 8, speed: 4, toolType: 'pick' });
const I_DEMONITE_SWORD = item('Demonite Blade', 'weapon', '#5522AA', { damage: 24, speed: 4, range: 48, element: 'necrotic' });
const I_DEMONITE_BOW = item('Demonite Bow', 'bow', '#5522AA', { damage: 20, speed: 5, element: 'necrotic' });
const I_DEMONITE_HELM = item('Demonite Helmet', 'armor', '#5522AA', { defense: 6, slot: 'head' });
const I_DEMONITE_CHEST = item('Demonite Chestplate', 'armor', '#5522AA', { defense: 9, slot: 'chest' });
const I_WORM_FOOD = item('Worm Food', 'summon', '#3D1F4A', { boss: 'eater_of_worlds' });
const I_SHADOW_SCALE = item('Shadow Scale', 'material', '#3D1F4A', {});
// Crimtane (Crimson)
const I_CRIMTANE_BAR = item('Crimtane Bar', 'material', '#CC2244', {});
const I_CRIMTANE_PICK = item('Crimtane Pickaxe', 'tool', '#CC2244', { tier: 2, power: 8, speed: 4, toolType: 'pick' });
const I_CRIMTANE_SWORD = item('Crimtane Blade', 'weapon', '#CC2244', { damage: 24, speed: 4, range: 48, onHit: 'bleeding' });
const I_CRIMTANE_BOW = item('Crimtane Bow', 'bow', '#CC2244', { damage: 20, speed: 5 });
const I_CRIMTANE_HELM = item('Crimtane Helmet', 'armor', '#CC2244', { defense: 6, slot: 'head' });
const I_CRIMTANE_CHEST = item('Crimtane Chestplate', 'armor', '#CC2244', { defense: 9, slot: 'chest' });
const I_BLOODY_SPINE = item('Bloody Spine', 'summon', '#AA1133', { boss: 'brain_of_cthulhu' });
const I_TISSUE_SAMPLE = item('Tissue Sample', 'material', '#8B2030', {});
// Voidite (Void)
const I_VOIDITE_BAR = item('Voidite Bar', 'material', '#7722DD', {});
const I_VOIDITE_PICK = item('Voidite Pickaxe', 'tool', '#7722DD', { tier: 2, power: 9, speed: 3, toolType: 'pick' });
const I_VOIDITE_SWORD = item('Voidite Blade', 'weapon', '#7722DD', { damage: 26, speed: 3, range: 50, element: 'void' });
const I_VOIDITE_BOW = item('Voidite Bow', 'bow', '#7722DD', { damage: 22, speed: 5, element: 'void' });
const I_VOIDITE_HELM = item('Voidite Helmet', 'armor', '#7722DD', { defense: 7, slot: 'head' });
const I_VOIDITE_CHEST = item('Voidite Chestplate', 'armor', '#7722DD', { defense: 10, slot: 'chest' });
const I_VOID_BEACON = item('Void Beacon', 'summon', '#6600CC', { boss: 'void_maw' });
const I_VOID_ESSENCE = item('Void Essence', 'material', '#6600CC', {});
const I_GRAVITY_BOOTS = item('Gravity Boots', 'accessory', '#BB66FF', { effect: 'low_gravity', slot: 'acc10' });

// ===== PHASE 2: SURFACE BIOME ITEMS =====
// Desert items
const I_ANTLION_MANDIBLE = item('Antlion Mandible', 'material', '#C9A020', {});
const I_ANCIENT_CLOTH = item('Ancient Cloth', 'material', '#B89555', {});
const I_FOSSIL_SHARD = item('Fossil Shard', 'material', '#C0A060', {});
const I_SANDSTORM_BOTTLE = item('Sandstorm in a Bottle', 'accessory', '#E8C840', { effect: 'double_jump', slot: 'acc11' });
const I_MAGIC_CARPET = item('Magic Carpet', 'accessory', '#9933CC', { effect: 'hover', slot: 'acc12' });
const I_DESERT_SCIMITAR = item('Desert Scimitar', 'weapon', '#D4A017', { damage: 18, speed: 3, range: 44, element: 'none' });
const I_FOSSIL_PICK = item('Fossil Pickaxe', 'tool', '#B89555', { tier: 2, power: 7, speed: 4, toolType: 'pick' });
const I_ANCIENT_HELM = item('Ancient Pharaoh Mask', 'helmet', '#D4A017', { defense: 5, special: 'sand_resist' });
const I_ANCIENT_CHEST = item('Ancient Robes', 'chestplate', '#B89555', { defense: 6 });
const I_DESERT_EAGLE = item('Desert Eagle', 'weapon', '#C9A96E', { damage: 22, speed: 5, range: 40, element: 'none', weaponType: 'gun' });
const I_PHARAOH_SUMMON = item('Scarab Amulet', 'summon', '#D4A017', { boss: 'sand_pharaoh' });
// Snow/Ice items
const I_FROST_CORE = item('Frost Core', 'material', '#88DDFF', {});
const I_ICE_BLADE = item('Ice Blade', 'weapon', '#99DDFF', { damage: 20, speed: 4, range: 44, element: 'ice' });
const I_BLIZZARD_BOTTLE = item('Blizzard in a Bottle', 'accessory', '#AAEEFF', { effect: 'double_jump_ice', slot: 'acc13' });
const I_FROSTBURN_BOW = item('Frostburn Bow', 'bow', '#88CCFF', { damage: 18, speed: 5, element: 'ice' });
const I_BOREAL_SWORD = item('Boreal Blade', 'weapon', '#6B5038', { damage: 14, speed: 4, range: 40 });
const I_FROST_HELM_BIOME = I_FROST_HELM; // reuse existing Frost Helmet
const I_FROST_CHEST_BIOME = I_FROST_CHEST; // reuse existing Frost Chestplate
const I_ICE_SKATES = item('Ice Skates', 'accessory', '#AAEEFF', { effect: 'ice_walk', slot: 'acc14' });
const I_FROST_STAFF = item('Frost Staff', 'weapon', '#88DDFF', { damage: 24, speed: 6, range: 50, element: 'ice', weaponType: 'magic' });
const I_CRYO_SUMMON = item('Frost Crown', 'summon', '#88DDFF', { boss: 'cryo_warden' });
// Jungle items
const I_STINGER = item('Stinger', 'material', '#DDAA33', {});
const I_VINE_BIOME = I_VINE; // reuse existing Vine item
const I_JUNGLE_SPORES = item('Jungle Spores', 'material', '#44DD33', {});
const I_BLADE_OF_GRASS = item('Blade of Grass', 'weapon', '#33CC22', { damage: 22, speed: 5, range: 48, element: 'poison' });
const I_BOOMSTICK = item('Boomstick', 'weapon', '#8B4513', { damage: 28, speed: 8, range: 35, element: 'none', weaponType: 'gun', spread: 3 });
const I_IVY_WHIP = item('Ivy Whip', 'accessory', '#33AA22', { effect: 'grapple', slot: 'acc15' });
const I_JUNGLE_HELM = item('Jungle Hat', 'helmet', '#228822', { defense: 4, special: 'mana_boost' });
const I_JUNGLE_CHEST = item('Jungle Shirt', 'chestplate', '#336633', { defense: 5, special: 'magic_crit' });
const I_THORN_CHAKRAM = item('Thorn Chakram', 'weapon', '#22AA22', { damage: 20, speed: 4, range: 55, element: 'poison', weaponType: 'boomerang' });
const I_NATURE_GIFT = item("Nature's Gift", 'accessory', '#33FF44', { effect: 'mana_reduction', slot: 'acc16' });
const I_BEZOAR = item('Bezoar', 'accessory', '#44BB33', { effect: 'poison_immune', slot: 'acc17' });
const I_JUNGLE_SUMMON = item('Abeemination', 'summon', '#DDAA33', { boss: 'hive_queen' });

// ===== PHASE 3: SPACE BIOME ITEMS =====
// Space materials
const I_METEORITE_BAR = item('Meteorite Bar', 'material', '#AA4400', {});
const I_LUMINITE_BAR = item('Luminite Bar', 'material', '#44FFAA', {});
const I_ALIEN_TECH = item('Alien Tech Fragment', 'material', '#33AACC', {});
const I_COSMIC_SHARD = item('Cosmic Shard', 'material', '#8866FF', {});
const I_METEOR_FRAGMENT = item('Meteor Fragment', 'material', '#993300', {});
// Space weapons
const I_METEOR_STAFF = item('Meteor Staff', 'weapon', '#AA4400', { damage: 30, speed: 6, range: 55, element: 'fire', weaponType: 'magic' });
const I_STAR_CANNON = item('Star Cannon', 'weapon', '#FFDD44', { damage: 45, speed: 10, range: 60, element: 'none', weaponType: 'gun' });
const I_PHASE_BLADE = item('Phase Blade', 'weapon', '#44FFAA', { damage: 35, speed: 3, range: 50, element: 'none' });
const I_GRAVITY_GUN = item('Gravity Gun', 'weapon', '#6644CC', { damage: 25, speed: 5, range: 55, element: 'none', weaponType: 'gun', special: 'gravity_pull' });
const I_NEBULA_BLAZE = item('Nebula Blaze', 'weapon', '#FF44AA', { damage: 40, speed: 7, range: 60, element: 'fire', weaponType: 'magic' });
const I_LASER_DRILL = item('Laser Drill', 'tool', '#44FFAA', { tier: 4, power: 12, speed: 2, toolType: 'pick' });
const I_SPACE_BLASTER = item('Space Blaster', 'weapon', '#33AACC', { damage: 20, speed: 4, range: 45, element: 'none', weaponType: 'gun' });
// Space armor
const I_SPACE_HELM = item('Space Helmet', 'helmet', '#445566', { defense: 8, special: 'oxygen' });
const I_SPACE_SUIT = item('Space Suit', 'chestplate', '#556677', { defense: 10, special: 'space_mobility' });
const I_SPACE_BOOTS = item('Gravity Boots', 'boots', '#445566', { defense: 6, special: 'zero_g_control' });
// Space accessories
const I_GRAVITY_GLOBE = item('Gravity Globe', 'accessory', '#6644CC', { effect: 'space_flight', slot: 'acc18' });
const I_OXYGEN_TANK = item('Oxygen Tank', 'accessory', '#AADDFF', { effect: 'extended_oxygen', slot: 'acc19' });
const I_JETPACK = item('Jetpack', 'accessory', '#FF6633', { effect: 'jetpack', slot: 'acc20' });
const I_COSMIC_CAR_KEY = item('Cosmic Car Key', 'accessory', '#44FFAA', { effect: 'ufo_mount', slot: 'acc21' });
// Boss summons
const I_STAR_SIGNAL = item('Distress Signal', 'summon', '#FFDD44', { boss: 'star_destroyer' });
// I_CELESTIAL_SIGIL is defined below — used for Moon Lord boss summon
// Launch pad crafting ingredient
const I_ROCKET_FUEL = item('Rocket Fuel', 'material', '#FF4400', {});

// ===== PHASE 4: HARDMODE ITEMS =====
let hardmodeActive = false;
// Hardmode materials
const I_COBALT_BAR = item('Cobalt Bar', 'material', '#3355CC', {});
const I_MYTHRIL_BAR = item('Mythril Bar', 'material', '#55CC55', {});
const I_TITANIUM_BAR = item('Titanium Bar', 'material', '#AAAACC', {});
const I_HALLOWED_BAR = item('Hallowed Bar', 'material', '#FFDDAA', {});
const I_SOUL_OF_MIGHT = item('Soul of Might', 'material', '#3399FF', {});
const I_SOUL_OF_SIGHT = item('Soul of Sight', 'material', '#FF33FF', {});
const I_SOUL_OF_FRIGHT = item('Soul of Fright', 'material', '#33FF66', {});
const I_CRYSTAL_SHARD_ITEM = item('Crystal Shard', 'material', '#FF55FF', {});
// Hardmode weapons
const I_COBALT_SWORD = item('Cobalt Sword', 'weapon', '#3355CC', { damage: 28, speed: 4, range: 48 });
const I_MYTHRIL_HALBERD = item('Mythril Halberd', 'weapon', '#55CC55', { damage: 35, speed: 5, range: 55 });
const I_TITANIUM_SWORD = item('Titanium Sword', 'weapon', '#AAAACC', { damage: 42, speed: 4, range: 52 });
const I_EXCALIBUR_HM = item('Hallowed Excalibur', 'weapon', '#FFDDAA', { damage: 50, speed: 3, range: 55 });
const I_HALLOWED_REPEATER = item('Hallowed Repeater', 'weapon', '#FFDDAA', { damage: 38, speed: 5, range: 60, weaponType: 'gun' });
const I_MEGASHARK = item('Megashark', 'weapon', '#6688AA', { damage: 30, speed: 2, range: 55, weaponType: 'gun' });
const I_CRYSTAL_STORM = item('Crystal Storm', 'weapon', '#FF55FF', { damage: 28, speed: 3, range: 50, weaponType: 'magic' });
const I_RAINBOW_ROD = item('Rainbow Rod', 'weapon', '#FF88CC', { damage: 40, speed: 6, range: 60, weaponType: 'magic' });
// Hardmode tools
const I_COBALT_PICK = item('Cobalt Pickaxe', 'tool', '#3355CC', { tier: 2, power: 7, speed: 4, toolType: 'pick' });
const I_MYTHRIL_PICK = item('Mythril Pickaxe', 'tool', '#55CC55', { tier: 3, power: 9, speed: 3, toolType: 'pick' });
const I_TITANIUM_PICK = item('Titanium Pickaxe', 'tool', '#AAAACC', { tier: 3, power: 10, speed: 3, toolType: 'pick' });
const I_DRAX = item('Drax', 'tool', '#FFDDAA', { tier: 4, power: 11, speed: 2, toolType: 'pick' });
// Hardmode armor
const I_COBALT_HELM = item('Cobalt Helmet', 'helmet', '#3355CC', { defense: 5 });
const I_COBALT_CHEST = item('Cobalt Breastplate', 'chestplate', '#3355CC', { defense: 7 });
const I_MYTHRIL_HELM = item('Mythril Helmet', 'helmet', '#55CC55', { defense: 7 });
const I_MYTHRIL_CHEST = item('Mythril Chainmail', 'chestplate', '#55CC55', { defense: 9 });
const I_TITANIUM_HELM = item('Titanium Helmet', 'helmet', '#AAAACC', { defense: 9 });
const I_TITANIUM_CHEST = item('Titanium Breastplate', 'chestplate', '#AAAACC', { defense: 11 });
const I_HALLOWED_HELM = item('Hallowed Helmet', 'helmet', '#FFDDAA', { defense: 11 });
const I_HALLOWED_CHEST = item('Hallowed Plate Mail', 'chestplate', '#FFDDAA', { defense: 14 });
// Hardmode accessories
const I_WARRIOR_EMBLEM = item('Warrior Emblem', 'accessory', '#CC3333', { effect: 'melee_boost_15', slot: 'acc22' });
const I_RANGER_EMBLEM = item('Ranger Emblem', 'accessory', '#33CC33', { effect: 'ranged_boost_15', slot: 'acc23' });
const I_SORCERER_EMBLEM = item('Sorcerer Emblem', 'accessory', '#3333CC', { effect: 'magic_boost_15', slot: 'acc24' });
// Boss summons
const I_WORM_FOOD_HM = item('Mechanical Worm', 'summon', '#3399FF', { boss: 'destroyer' });
const I_TWINS_SUMMON = item('Mechanical Eye', 'summon', '#FF33FF', { boss: 'the_twins' });
const I_PRIME_SUMMON = item('Mechanical Skull', 'summon', '#33FF66', { boss: 'skeletron_prime' });

// ===== PHASE 5: DUNGEON, TEMPLE & POST-HARDMODE ITEMS =====
let planteraDefeated = false;
let golemDefeated = false;
// Dungeon loot
const I_WATER_BOLT = item('Water Bolt', 'weapon', '#4488FF', { damage: 22, speed: 4, range: 55, weaponType: 'magic', pierces: true });
const I_MURAMASA = item('Muramasa', 'weapon', '#5555FF', { damage: 26, speed: 2, range: 45, autoSwing: true });
const I_COBALT_SHIELD = item('Cobalt Shield', 'accessory', '#3355CC', { effect: 'knockback_immunity', slot: 'acc30' });
const I_SHADOW_KEY = item('Shadow Key', 'material', '#443366', { quest: 'unlock_shadow_chests' });
const I_AQUA_SCEPTER = item('Aqua Scepter', 'weapon', '#44BBFF', { damage: 18, speed: 3, range: 50, weaponType: 'magic' });
const I_MAGIC_MISSILE = item('Magic Missile', 'weapon', '#FF44FF', { damage: 24, speed: 5, range: 55, weaponType: 'magic', controllable: true });
const I_BONE_WELDER = item('Bone Welder', 'station', '#DDCCBB', { stationType: 'bone_welder' });
// Temple loot
const I_LIHZAHRD_POWER_CELL = item('Lihzahrd Power Cell', 'summon', '#AA7744', { boss: 'golem' });
const I_SOLAR_TABLET = item('Solar Tablet', 'summon', '#FFAA22', { event: 'solar_eclipse' });
// Boss summons
const I_PLANTERA_SUMMON = item('Suspicious Bulb', 'summon', '#FF44AA', { boss: 'plantera' });
const I_TRUFFLE_WORM = item('Truffle Worm', 'summon', '#7744AA', { boss: 'duke_fishron' });
// Post-Plantera materials
const I_ECTOPLASM = item('Ectoplasm', 'material', '#88CCFF', {});
const I_BEETLE_HUSK = item('Beetle Husk', 'material', '#556633', {});
const I_SHROOMITE_BAR = item('Shroomite Bar', 'material', '#4488AA', {});
const I_TEMPLE_KEY = item('Temple Key', 'material', '#997744', { quest: 'open_temple' });
const I_CHLOROPHYTE_BAR = item('Chlorophyte Bar', 'material', '#44BB44', {});
// Post-Plantera weapons
const I_TERRA_BLADE = item('Terra Blade', 'weapon', '#44FF44', { damage: 60, speed: 3, range: 55, projectile: true, legendary: true });
const I_POSSESSED_HATCHET_P5 = item('Golem Hatchet', 'weapon', '#AA6633', { damage: 55, speed: 4, range: 50, homing: true });
const I_STYNGER = item('Stynger', 'weapon', '#998866', { damage: 45, speed: 4, range: 55, weaponType: 'gun', explosive: true });
const I_HEAT_RAY = item('Heat Ray', 'weapon', '#FF6622', { damage: 52, speed: 3, range: 60, weaponType: 'magic', pierces: true });
// Duke Fishron weapons
const I_BUBBLE_GUN = item('Bubble Gun', 'weapon', '#44CCFF', { damage: 48, speed: 3, range: 50, weaponType: 'gun', rapid: true });
const I_TEMPEST_STAFF = item('Tempest Staff', 'weapon', '#3388AA', { damage: 55, speed: 6, range: 60, weaponType: 'magic', summon: 'sharknado' });
const I_RAZORBLADE_TYPHOON = item('Razorblade Typhoon', 'weapon', '#2266AA', { damage: 60, speed: 4, range: 65, weaponType: 'magic', homing: true });
const I_FISHRON_WINGS = item('Fishron Wings', 'accessory', '#44AACC', { effect: 'flight_aquatic', slot: 'acc31', flightTime: 300, swimSpeed: 2.0 });
// Post-Plantera armor
const I_SPECTRE_HELM = item('Spectre Hood', 'helmet', '#88CCFF', { defense: 6, magicDmg: 0.10, lifesteal: 0.08 });
const I_SPECTRE_CHEST = item('Spectre Robe', 'chestplate', '#88CCFF', { defense: 12, magicDmg: 0.08 });
const I_SHROOMITE_HELM = item('Shroomite Headgear', 'helmet', '#4488AA', { defense: 11, rangedDmg: 0.15 });
const I_SHROOMITE_CHEST = item('Shroomite Breastplate', 'chestplate', '#4488AA', { defense: 16, rangedDmg: 0.10, stealth: true });
const I_BEETLE_HELM = item('Beetle Helmet', 'helmet', '#556633', { defense: 13, meleeDmg: 0.06 });
const I_BEETLE_CHEST = item('Beetle Shell', 'chestplate', '#556633', { defense: 20, beetleEndurance: true });
const I_CHLOROPHYTE_HELM = item('Chlorophyte Headpiece', 'helmet', '#44BB44', { defense: 10 });
const I_CHLOROPHYTE_CHEST = item('Chlorophyte Plate Mail', 'chestplate', '#44BB44', { defense: 13, leafCrystal: true });

// ===== PHASE 6: LUNAR & EVENT ITEMS =====
let activeEvent = null; // 'blood_moon', 'solar_eclipse', 'goblin_army', 'pirate_invasion', 'frost_moon'
let celestialEventActive = false;
let pillarsDefeated = { solar: false, vortex: false, nebula: false, stardust: false };
// Lunar Fragments
const I_SOLAR_FRAGMENT = item('Solar Fragment', 'material', '#FF6622', {});
const I_VORTEX_FRAGMENT = item('Vortex Fragment', 'material', '#22CCAA', {});
const I_NEBULA_FRAGMENT = item('Nebula Fragment', 'material', '#CC44FF', {});
const I_STARDUST_FRAGMENT = item('Stardust Fragment', 'material', '#4488FF', {});
const I_CELESTIAL_SIGIL_P6 = item('Celestial Sigil', 'summon', '#FFDDAA', { event: 'lunar_pillars' });
// Solar weapons (melee)
const I_SOLAR_ERUPTION = item('Solar Eruption', 'weapon', '#FF6622', { damage: 72, speed: 3, range: 60, element: 'solar', pierces: true });
const I_DAYBREAK = item('Daybreak', 'weapon', '#FFAA44', { damage: 65, speed: 4, range: 55, element: 'solar', stackingDOT: true });
// Vortex weapons (ranged)
const I_VORTEX_BEATER = item('Vortex Beater', 'weapon', '#22CCAA', { damage: 60, speed: 2, range: 65, weaponType: 'gun', homing: true });
const I_PHANTASM = item('Phantasm', 'weapon', '#44DDBB', { damage: 55, speed: 2, range: 70, weaponType: 'gun', multiShot: 4 });
// Nebula weapons (magic)
const I_NEBULA_ARCANUM = item('Nebula Arcanum', 'weapon', '#CC44FF', { damage: 68, speed: 5, range: 60, weaponType: 'magic', homing: true });
const I_NEBULA_BLAZE_P6 = item('Nebula Blaze', 'weapon', '#EE66FF', { damage: 58, speed: 3, range: 55, weaponType: 'magic', explosive: true });
// Stardust weapons (summoner)
const I_STARDUST_DRAGON = item('Stardust Dragon Staff', 'weapon', '#4488FF', { damage: 50, speed: 6, range: 60, weaponType: 'summon', persistent: true });
const I_STARDUST_CELL = item('Stardust Cell Staff', 'weapon', '#6699FF', { damage: 45, speed: 4, range: 55, weaponType: 'summon', clones: true });
// Lunar armor
const I_SOLAR_HELM = item('Solar Flare Helmet', 'helmet', '#FF6622', { defense: 15, meleeDmg: 0.12 });
const I_SOLAR_CHEST_ARMOR = item('Solar Flare Breastplate', 'chestplate', '#FF6622', { defense: 24, meleeDmg: 0.10 });
const I_VORTEX_HELM = item('Vortex Helmet', 'helmet', '#22CCAA', { defense: 12, rangedDmg: 0.16 });
const I_VORTEX_CHEST = item('Vortex Breastplate', 'chestplate', '#22CCAA', { defense: 20, rangedDmg: 0.12, stealth: true });
const I_NEBULA_HELM = item('Nebula Helmet', 'helmet', '#CC44FF', { defense: 8, magicDmg: 0.16 });
const I_NEBULA_CHEST = item('Nebula Breastplate', 'chestplate', '#CC44FF', { defense: 16, magicDmg: 0.12, nebulaBoost: true });
const I_STARDUST_HELM = item('Stardust Helmet', 'helmet', '#4488FF', { defense: 6, summonDmg: 0.18 });
const I_STARDUST_CHEST = item('Stardust Breastplate', 'chestplate', '#4488FF', { defense: 14, summonDmg: 0.14, stardustGuard: true });
// Event drops
const I_BROKEN_HERO_SWORD = item('Broken Hero Sword', 'material', '#AA8844', {});
const I_MOON_STONE = item('Moon Stone', 'accessory', '#8888CC', { effect: 'night_boost', slot: 'acc40' });
const I_NEPTUNE_SHELL = item('Neptune Shell', 'accessory', '#2266AA', { effect: 'merfolk', slot: 'acc41' });
const I_DEATH_SICKLE = item('Death Sickle', 'weapon', '#664488', { damage: 55, speed: 4, range: 50, projectile: true });
const I_BUTCHER_KNIFE = item('Butcher Knife', 'weapon', '#AA3333', { damage: 48, speed: 3, range: 40, lifesteal: 0.05 });
const I_NAIL_GUN = item('Nail Gun', 'weapon', '#888888', { damage: 42, speed: 2, range: 55, weaponType: 'gun', rapid: true });
const I_CHRISTMAS_TREE_SWORD = item('Christmas Tree Sword', 'weapon', '#228833', { damage: 65, speed: 4, range: 55, projectile: true });
const I_ELF_MELTER = item('Elf Melter', 'weapon', '#FF4422', { damage: 50, speed: 2, range: 50, weaponType: 'gun', pierces: true });
const I_PIRATE_MAP = item('Pirate Map', 'summon', '#886644', { event: 'pirate_invasion' });
const I_GOBLIN_BANNER = item('Goblin Battle Standard', 'summon', '#44AA44', { event: 'goblin_army' });
const I_NAUGHTY_PRESENT = item('Naughty Present', 'summon', '#DD2222', { event: 'frost_moon' });
const I_SOLAR_ECLIPSE_TABLET = item('Solar Tablet Fragment', 'summon', '#FFAA22', { event: 'solar_eclipse' });

// ===== PHASE 7: HERBS =====
const I_DAYBLOOM = item('Daybloom', 'material', '#FFEE44', {});
const I_MOONGLOW = item('Moonglow', 'material', '#AACCFF', {});
const I_WATERLEAF = item('Waterleaf', 'material', '#44BBFF', {});
const I_BLINKROOT = item('Blinkroot', 'material', '#88DD88', {});
const I_DEATHWEED = item('Deathweed', 'material', '#664488', {});
const I_FIREBLOSSOM = item('Fireblossom', 'material', '#FF6633', {});
const I_SHIVERTHORN = item('Shiverthorn', 'material', '#88DDEE', {});
const I_BOTTLE = item('Bottle', 'material', '#AADDFF', {});
const I_ALCHEMY_TABLE = item('Alchemy Table', 'station', '#886644', { stationType: 'alchemy' });

// ===== PHASE 7: POTIONS =====
const I_IRONSKIN_POT = item('Ironskin Potion', 'potion', '#DDAA44', { buff: 'ironskin', duration: 5 * 60 * 1000, defense: 8 });
const I_REGEN_POT = item('Regeneration Potion', 'potion', '#FF6688', { buff: 'regen', duration: 5 * 60 * 1000, regenRate: 2 });
const I_SWIFTNESS_POT = item('Swiftness Potion', 'potion', '#44DDFF', { buff: 'swiftness', duration: 5 * 60 * 1000, speedBoost: 0.25 });
const I_MINING_POT = item('Mining Potion', 'potion', '#FFAA22', { buff: 'mining', duration: 5 * 60 * 1000, mineSpeed: 0.25 });
const I_NIGHT_OWL_POT = item('Night Owl Potion', 'potion', '#FFDD44', { buff: 'nightowl', duration: 5 * 60 * 1000, lightRadius: 3 });
const I_ENDURANCE_POT = item('Endurance Potion', 'potion', '#884488', { buff: 'endurance', duration: 5 * 60 * 1000, dmgReduction: 0.10 });
const I_WRATH_POT = item('Wrath Potion', 'potion', '#FF4444', { buff: 'wrath', duration: 5 * 60 * 1000, allDmg: 0.10 });
const I_RAGE_POT = item('Rage Potion', 'potion', '#FF8822', { buff: 'rage', duration: 5 * 60 * 1000, critChance: 0.10 });
const I_LIFEFORCE_POT = item('Lifeforce Potion', 'potion', '#FF4466', { buff: 'lifeforce', duration: 5 * 60 * 1000, maxHpBoost: 50 });
const I_MANA_REGEN_POT = item('Mana Regen Potion', 'potion', '#4488FF', { buff: 'manaregen', duration: 5 * 60 * 1000, manaRegen: 3 });
const I_SPELUNKER_POT = item('Spelunker Potion', 'potion', '#FFCC44', { buff: 'spelunker', duration: 5 * 60 * 1000, oreGlow: true });
const I_HUNTER_POT = item('Hunter Potion', 'potion', '#44FF88', { buff: 'hunter', duration: 5 * 60 * 1000, enemyGlow: true });
const I_GRAVITATION_POT = item('Gravitation Potion', 'potion', '#AAAAFF', { buff: 'gravitation', duration: 3 * 60 * 1000, flipGravity: true });
const I_HEARTREACH_POT = item('Heartreach Potion', 'potion', '#FF6699', { buff: 'heartreach', duration: 5 * 60 * 1000, heartPickup: 2 });
const I_INFERNO_POT = item('Inferno Potion', 'potion', '#FF4400', { buff: 'inferno', duration: 5 * 60 * 1000, fireAura: true });

// ===== PHASE 7: FISHING UPGRADE =====
const I_REINFORCED_ROD = item('Reinforced Fishing Rod', 'tool', '#888888', { fishPower: 15, toolType: 'fishing' });
const I_GOLDEN_ROD_P7 = item('Golden Fishing Rod', 'tool', '#FFD700', { fishPower: 30, toolType: 'fishing' });
const I_HOTLINE_ROD = item('Hotline Fishing Hook', 'tool', '#FF6622', { fishPower: 45, toolType: 'fishing', lavaFish: true });
const I_NIGHTCRAWLER = item('Enchanted Nightcrawler', 'bait', '#8866FF', { baitPower: 35 });
const I_MASTER_BAIT = item('Master Bait', 'bait', '#FFD700', { baitPower: 50 });
const I_SALMON = item('Salmon', 'fish', '#FF8866', { value: 12 });
const I_PRISMITE = item('Prismite', 'fish', '#FF88FF', { value: 25, biome: 'hallowed' });
const I_OBSIDIFISH = item('Obsidifish', 'fish', '#553333', { value: 20, biome: 'abyss' });
const I_FLAREFIN_KOI = item('Flarefin Koi', 'fish', '#FF6622', { value: 18, biome: 'desert' });
const I_WOOD_CRATE = item('Wooden Crate', 'crate', '#886644', { tier: 1 });
const I_IRON_CRATE = item('Iron Crate', 'crate', '#888888', { tier: 2 });
const I_GOLD_CRATE = item('Golden Crate', 'crate', '#FFD700', { tier: 3 });
const I_BIOME_CRATE = item('Biome Crate', 'crate', '#44BB88', { tier: 4, biomeLoot: true });

// ===== PHASE 7: NPC SHOP ITEMS =====
const I_LESSER_HEAL_POT = item('Lesser Healing Potion', 'potion', '#FF4466', { heal: 50 });
const I_HEAL_POT = item('Healing Potion', 'potion', '#FF2244', { heal: 100 });
const I_GREATER_HEAL_POT = item('Greater Healing Potion', 'potion', '#FF0022', { heal: 200 });
const I_RECALL_POT = item('Recall Potion', 'potion', '#8888FF', { teleportHome: true });
const I_ROPE = item('Rope', 'material', '#886644', { placeable: true });
const I_TORCH_ITEM = item('Torch', 'material', '#FFAA22', { placeable: true, light: true });
const I_PURIFICATION_POWDER = item('Purification Powder', 'material', '#AADDFF', { cleanse: true });
const I_HAIR_DYE = item('Hair Dye', 'material', '#FF88CC', { cosmetic: true });
const I_REFORGE_ITEM = item('Goblin Tech Kit', 'tool', '#44AA44', { reforge: true });

// ===== PHASE 8: MOUNTS =====
const I_SLIME_SADDLE = item('Slimy Saddle', 'mount', '#44BB44', { mount: 'slime', speedBoost: 0.3, jumpBoost: 2.0 });
const I_BUNNY_MOUNT = item('Fuzzy Carrot', 'mount', '#FFAA44', { mount: 'bunny', speedBoost: 0.5 });
const I_BEE_MOUNT = item('Honeyed Goggles', 'mount', '#FFCC22', { mount: 'bee', flight: true, flightTime: 180 });
const I_UNICORN_MOUNT = item('Blessed Apple', 'mount', '#FF88FF', { mount: 'unicorn', speedBoost: 0.8, jumpBoost: 1.5 });
const I_BASILISK_MOUNT = item('Ancient Horn', 'mount', '#886644', { mount: 'basilisk', speedBoost: 0.6, ramDamage: 30 });
const I_UFO_MOUNT = item('Cosmic Car Key', 'mount', '#44CCFF', { mount: 'ufo', flight: true, flightTime: -1, speedBoost: 0.4 });
const I_DRILL_MOUNT = item('Drill Containment Unit', 'mount', '#AAAAAA', { mount: 'drill', flight: true, flightTime: -1, mineSpeed: 0.5, speedBoost: 0.2 });
const I_COSMIC_CAR = item('Shrimpy Truffle', 'mount', '#336699', { mount: 'cosmic_car', flight: true, flightTime: -1, speedBoost: 0.6, waterSpeed: 1.0 });

// ===== PHASE 8: PETS =====
const I_PET_SLIME_P8 = item('Petri Dish', 'pet', '#44BB44', { pet: 'baby_slime', light: false });
const I_PET_SHADOW = item('Shadow Orb Item', 'pet', '#6644AA', { pet: 'shadow_orb', light: true });
const I_PET_FAIRY_P8 = item('Fairy Bell', 'pet', '#FF88FF', { pet: 'fairy', light: true });
const I_PET_DRAGON = item('Dragon Egg', 'pet', '#FF4422', { pet: 'dragon', light: true });
const I_PET_WISP_P8 = item('Wisp in a Bottle', 'pet', '#AADDFF', { pet: 'wisp', light: true });
const I_PET_UFO = item('Suspicious Looking Tentacle', 'pet', '#44AACC', { pet: 'mini_ufo', light: true });
const I_PET_EYE = item('Suspicious Looking Eye', 'pet', '#FF2244', { pet: 'suspicious_eye', light: false });
const I_PET_MINOTAUR = item('Tartar Sauce', 'pet', '#886644', { pet: 'mini_minotaur', light: false });

// ===== PHASE 8: WINGS =====
const I_ANGEL_WINGS = item('Angel Wings', 'accessory', '#FFFFFF', { effect: 'flight', flightTime: 100, slot: 'wings' });
const I_DEMON_WINGS = item('Demon Wings', 'accessory', '#882244', { effect: 'flight', flightTime: 100, slot: 'wings' });
const I_FAIRY_WINGS = item('Fairy Wings', 'accessory', '#FF88FF', { effect: 'flight', flightTime: 120, hover: true, slot: 'wings' });
const I_FROZEN_WINGS = item('Frozen Wings', 'accessory', '#88CCFF', { effect: 'flight', flightTime: 130, slot: 'wings' });
const I_FLAME_WINGS = item('Flame Wings', 'accessory', '#FF6622', { effect: 'flight', flightTime: 130, slot: 'wings' });
const I_LEAF_WINGS = item('Leaf Wings', 'accessory', '#44BB44', { effect: 'flight', flightTime: 140, slot: 'wings' });
const I_HOVERBOARD = item('Hoverboard', 'accessory', '#22CCDD', { effect: 'flight', flightTime: 170, hover: true, slot: 'wings' });
const I_FISHRON_WINGS_P8 = item('Fishron Wings', 'accessory', '#2266AA', { effect: 'flight', flightTime: 200, hover: true, slot: 'wings' });
const I_NEBULA_WINGS = item('Nebula Mantle', 'accessory', '#CC44FF', { effect: 'flight', flightTime: 220, hover: true, slot: 'wings' });
const I_SOLAR_WINGS = item('Solar Wings', 'accessory', '#FF6622', { effect: 'flight', flightTime: 240, hover: true, slot: 'wings' });

// ===== PHASE 8: ADVANCED ACCESSORIES =====
const I_SHIELD_CTHULHU = item('Shield of Cthulhu', 'accessory', '#CC4466', { effect: 'dash', dashSpeed: 8, dashCooldown: 60, slot: 'acc50' });
const I_OBSIDIAN_SHIELD = item('Obsidian Shield', 'accessory', '#553322', { effect: 'knockback_immunity', fireImmune: true, slot: 'acc51' });
const I_ANKH_CHARM = item('Ankh Charm', 'accessory', '#FFDD44', { effect: 'debuff_immunity', slot: 'acc52' });
const I_ANKH_SHIELD = item('Ankh Shield', 'accessory', '#FFCC33', { effect: 'full_immunity', knockbackImmune: true, fireImmune: true, debuffImmune: true, defense: 4, slot: 'acc53' });
const I_CELESTIAL_SHELL = item('Celestial Shell', 'accessory', '#FFAA88', { effect: 'transform', dayBoost: 0.10, nightBoost: 0.10, defense: 4, allDmg: 0.10, slot: 'acc54' });
const I_MASTER_NINJA = item('Master Ninja Gear', 'accessory', '#333366', { effect: 'dash_dodge', dashSpeed: 7, dodgeChance: 0.10, wallCling: true, slot: 'acc55' });
const I_TERRASPARK = item('Terraspark Boots', 'accessory', '#FF8844', { effect: 'mega_speed', speedBoost: 0.40, lavaWalk: true, waterWalk: true, slot: 'acc56' });
const I_FROSTSPARK = item('Frostspark Boots', 'accessory', '#88CCFF', { effect: 'ice_speed', speedBoost: 0.30, iceWalk: true, slot: 'acc57' });
const I_LIGHTNING_BOOTS = item('Lightning Boots', 'accessory', '#FFDD22', { effect: 'lightning_speed', speedBoost: 0.35, slot: 'acc58' });
const I_CELESTIAL_STONE = item('Celestial Stone', 'accessory', '#FFAA44', { effect: 'stat_boost', allDmg: 0.05, defense: 2, mineSpeed: 0.15, regenRate: 1, slot: 'acc59' });

// ===== PHASE 9: LIQUID BUCKETS =====
const I_WATER_BUCKET = item('Water Bucket', 'tool', '#4488FF', { liquid: 'water', toolType: 'bucket' });
const I_LAVA_BUCKET = item('Lava Bucket', 'tool', '#FF4400', { liquid: 'lava', toolType: 'bucket' });
const I_HONEY_BUCKET = item('Honey Bucket', 'tool', '#FFAA22', { liquid: 'honey', toolType: 'bucket' });
const I_EMPTY_BUCKET = item('Empty Bucket', 'tool', '#AAAAAA', { toolType: 'bucket' });

// ===== PHASE 9: MECHANISM ITEMS =====
const I_SWITCH = item('Switch', 'mechanism', '#886644', { placeTile: T.SWITCH });
const I_LEVER = item('Lever', 'mechanism', '#886644', { placeTile: T.LEVER });
const I_PRESSURE_PLATE = item('Pressure Plate', 'mechanism', '#AAAAAA', { placeTile: T.PRESSURE_PLATE });
const I_TIMER_1S = item('1 Second Timer', 'mechanism', '#FFAA22', { placeTile: T.TIMER_TILE, interval: 60 });
const I_ACTUATOR_ITEM = item('Actuator', 'mechanism', '#6688AA', { placeTile: T.ACTUATOR });
const I_TELEPORTER_ITEM = item('Teleporter', 'mechanism', '#8844CC', { placeTile: T.TELEPORTER });

// ===== PHASE 9: TRAP ITEMS =====
const I_DART_TRAP_ITEM = item('Dart Trap', 'mechanism', '#886644', { placeTile: T.DART_TRAP, damage: 20 });
const I_SUPER_DART = item('Super Dart Trap', 'mechanism', '#AAAACC', { placeTile: T.DART_TRAP, damage: 40 });
const I_SPEAR_TRAP_ITEM = item('Spear Trap', 'mechanism', '#88AACC', { placeTile: T.SPEAR_TRAP, damage: 30 });
const I_FLAME_TRAP_ITEM = item('Flame Trap', 'mechanism', '#FF6622', { placeTile: T.FLAME_TRAP, damage: 35 });
const I_SPIKE_BALL_ITEM = item('Spike Ball Trap', 'mechanism', '#666666', { placeTile: T.SPIKE_BALL_TRAP, damage: 25 });

// ===== PHASE 9: WIRE TOOLS =====
const I_WRENCH_RED = item('Red Wrench', 'tool', '#FF4444', { wireColor: 'red', toolType: 'wrench' });
const I_WRENCH_BLUE = item('Blue Wrench', 'tool', '#4444FF', { wireColor: 'blue', toolType: 'wrench' });
const I_WRENCH_GREEN = item('Green Wrench', 'tool', '#44FF44', { wireColor: 'green', toolType: 'wrench' });
const I_WIRE_CUTTER = item('Wire Cutter', 'tool', '#FFAA22', { toolType: 'wire_cutter' });
const I_MULTICOLOR_WRENCH = item('Multicolor Wrench', 'tool', '#FF88FF', { wireColor: 'all', toolType: 'wrench' });

// ===== PHASE 10: EXPERT MODE ITEMS =====
const I_TREASURE_BAG_EOC = item('Treasure Bag (Eye)', 'treasure_bag', '#FF4444', { boss: 'eye_of_cthulhu', expertOnly: true });
const I_TREASURE_BAG_BOC = item('Treasure Bag (Brain)', 'treasure_bag', '#CC3344', { boss: 'brain_of_cthulhu', expertOnly: true });
const I_TREASURE_BAG_EOW = item('Treasure Bag (Eater)', 'treasure_bag', '#664488', { boss: 'eater_of_worlds', expertOnly: true });
const I_TREASURE_BAG_SKELE = item('Treasure Bag (Skeletron)', 'treasure_bag', '#CCCCAA', { boss: 'skeletron', expertOnly: true });
const I_TREASURE_BAG_WOF = item('Treasure Bag (Wall)', 'treasure_bag', '#CC4444', { boss: 'wall_of_flesh', expertOnly: true });
const I_TREASURE_BAG_TWINS = item('Treasure Bag (Twins)', 'treasure_bag', '#44CC44', { boss: 'twins', expertOnly: true });
const I_TREASURE_BAG_DEST = item('Treasure Bag (Destroyer)', 'treasure_bag', '#CC4444', { boss: 'destroyer', expertOnly: true });
const I_TREASURE_BAG_PRIME = item('Treasure Bag (Prime)', 'treasure_bag', '#888888', { boss: 'skeletron_prime', expertOnly: true });
const I_TREASURE_BAG_PLANT = item('Treasure Bag (Plantera)', 'treasure_bag', '#FF44AA', { boss: 'plantera', expertOnly: true });
const I_TREASURE_BAG_GOLEM = item('Treasure Bag (Golem)', 'treasure_bag', '#FFAA22', { boss: 'golem', expertOnly: true });
const I_TREASURE_BAG_FISH = item('Treasure Bag (Fishron)', 'treasure_bag', '#2266AA', { boss: 'duke_fishron', expertOnly: true });
const I_TREASURE_BAG_ML = item('Treasure Bag (Moon Lord)', 'treasure_bag', '#44AACC', { boss: 'moon_lord', expertOnly: true });
// Expert-only unique items
const I_WORM_SCARF = item('Worm Scarf', 'accessory', '#664488', { effect: 'dmg_reduction', dmgReduction: 0.17, slot: 'acc60', expertOnly: true });
const I_BRAIN_CONFUSION = item('Brain of Confusion', 'accessory', '#CC3344', { effect: 'confusion_dodge', dodgeChance: 0.17, slot: 'acc61', expertOnly: true });
const I_BONE_GLOVE = item('Bone Glove', 'accessory', '#CCCCAA', { effect: 'bone_throw', throwDamage: 15, slot: 'acc62', expertOnly: true });
const I_HIVE_PACK = item('Hive Pack', 'accessory', '#FFCC22', { effect: 'bee_boost', beeDmg: 0.30, slot: 'acc63', expertOnly: true });
const I_SHINY_STONE = item('Shiny Stone', 'accessory', '#FFDD88', { effect: 'idle_regen', idleRegen: 10, slot: 'acc64', expertOnly: true });
const I_ROYAL_GEL = item('Royal Gel', 'accessory', '#44BB88', { effect: 'slime_neutral', slot: 'acc65', expertOnly: true });
const I_DEMON_HEART_P10 = item('Demon Heart', 'consumable', '#884444', { effect: 'extra_acc_slot', expertOnly: true });
const I_GRAVITY_GLOBE_P10 = item('Gravity Globe', 'accessory', '#AACCFF', { effect: 'flip_gravity', slot: 'acc66', expertOnly: true });

// ===== PHASE 10: BOSS RUSH ITEMS =====
const I_BOSS_RUSH_TOKEN = item('Boss Rush Token', 'summon', '#FF8844', { event: 'boss_rush' });
const I_CHAMPION_TROPHY = item('Champion Trophy', 'trophy', '#FFD700', { bossRushReward: true });
const I_CHAMPION_BLADE = item('Champion\'s Blade', 'weapon', '#FFD700', { damage: 120, speed: 18, crit: 0.15, bossRushReward: true });

// ===== GRAVITY SYSTEM CONFIG =====
const GRAVITY_ZONES = {
    surface: 1.0,
    forest: 1.0,
    desert: 1.0,
    snow: 1.0,
    jungle: 1.0,
    caves: 1.0,
    mushroom: 1.0,
    frozen: 1.0,
    flesh: 1.0,
    hive: 1.0,
    sky: 0.7,
    space: 0.3,
    ocean: 1.0,
    abyss: 1.2,
    void_zone: 0.5 // variable — handled specially
};
let playerOxygen = 100; // Max 100, depletes in space without helmet
let meteorEventTimer = 0;
let meteorCrashSites = [];

// ===== WORLD EVIL CONFIG =====
let worldEvils = ['corruption', 'void']; // Two evils picked at world creation
let worldPurity = 100; // Percentage of pure tiles

// ===== PHASE A2: ARMOR SETS (New boss armor) =====
const I_BARK_HELM = item('Bark Helmet', 'armor', '#665533', { defense: 8, slot: 'head' });
const I_BARK_CHEST = item('Bark Chestplate', 'armor', '#665533', { defense: 12, slot: 'chest' });
const I_SPORE_HELM = item('Spore Helmet', 'armor', '#AA8833', { defense: 7, slot: 'head' });
const I_SPORE_CHEST = item('Spore Chestplate', 'armor', '#AA8833', { defense: 11, slot: 'chest' });
const I_LUNAR_HELM = item('Lunar Helmet', 'armor', '#CCDDFF', { defense: 18, slot: 'head' });
const I_LUNAR_CHEST = item('Lunar Chestplate', 'armor', '#CCDDFF', { defense: 28, slot: 'chest' });

// ===== PHASE B: BOSS SUMMON ITEMS =====
const I_ENCHANTED_ACORN = item('Enchanted Acorn', 'summon', '#558833', { boss: 'treant_king' });
const I_ANCIENT_SCARAB = item('Ancient Scarab', 'summon', '#DDAA44', { boss: 'sand_pharaoh' });
const I_CONCH_SHELL = item('Conch Shell', 'summon', '#2266AA', { boss: 'leviathan' });
const I_GLOWING_TRUFFLE = item('Glowing Truffle', 'summon', '#AA8833', { boss: 'mycelium_titan' });
const I_FROZEN_HEART = item('Frozen Heart', 'summon', '#88DDFF', { boss: 'cryo_warden' });
const I_SPIDER_QUEEN_EGG = item('Spider Queen Egg', 'summon', '#553366', { boss: 'spider_empress' });
const I_LAVA_CRYSTAL = item('Lava Crystal', 'summon', '#FF4400', { boss: 'magma_golem' });
const I_CELESTIAL_LENS_ITEM = item('Celestial Lens', 'summon', '#FFD700', { boss: 'all_seeing_eye' });
const I_VOID_RIFT_STONE = item('Void Rift Stone', 'summon', '#440088', { boss: 'void_emperor' });
const I_CELESTIAL_SIGIL = item('Celestial Sigil', 'summon', '#CCDDFF', { boss: 'moon_lord' });

// ===== PHASE A1: WEAPON MODIFIER SYSTEM =====
const WEAPON_PREFIXES = [
    { name: 'Broken', dmgMult: 0.7, spdMult: 1.1, critBonus: 0, rarity: 'common', color: '#888888' },
    { name: 'Dull', dmgMult: 0.85, spdMult: 1.0, critBonus: 0, rarity: 'common', color: '#999999' },
    { name: 'Keen', dmgMult: 1.1, spdMult: 1.0, critBonus: 0, rarity: 'common', color: '#AADDAA' },
    { name: 'Deadly', dmgMult: 1.2, spdMult: 1.0, critBonus: 0.05, rarity: 'rare', color: '#44CC44' },
    { name: 'Savage', dmgMult: 1.3, spdMult: 1.0, critBonus: 0, rarity: 'rare', color: '#44BBFF' },
    { name: 'Demonic', dmgMult: 1.4, spdMult: 0.9, critBonus: 0, rarity: 'epic', color: '#CC44CC' },
    { name: 'Godly', dmgMult: 1.25, spdMult: 1.1, critBonus: 0.15, rarity: 'legendary', color: '#FFAA33' },
    { name: 'Mythical', dmgMult: 1.35, spdMult: 1.15, critBonus: 0.2, rarity: 'legendary', color: '#FF8800' },
    { name: 'Legendary', dmgMult: 1.5, spdMult: 1.0, critBonus: 0.25, rarity: 'mythic', color: '#FF4400' },
    { name: 'Cursed', dmgMult: 1.6, spdMult: 1.0, critBonus: 0, rarity: 'mythic', color: '#7700AA', selfDmg: 5 },
];

const WEAPON_SUFFIXES = [
    { name: 'of Sorrow', effect: 'lifesteal', value: 0.10, rarity: 'rare', color: '#CC2244' },
    { name: 'of the Swarm', effect: 'multishot', value: 2, rarity: 'rare', color: '#DDAA33' },
    { name: 'of Inferno', effect: 'burning', chance: 0.30, duration: 300, rarity: 'epic', color: '#FF4400' },
    { name: 'of the Frost', effect: 'frozen', chance: 0.25, duration: 180, rarity: 'epic', color: '#66CCFF' },
    { name: 'of Venom', effect: 'poison', chance: 0.35, duration: 480, rarity: 'epic', color: '#66AA22' },
    { name: 'of the Void', effect: 'void_bolt', chance: 0.15, rarity: 'legendary', color: '#7700CC' },
    { name: 'of Execution', effect: 'execute', value: 1.0, rarity: 'legendary', color: '#CC1111' },
    { name: 'of the Cosmos', effect: 'pierce_all', rarity: 'mythic', color: '#FFDDFF' },
    { name: 'of Oblivion', effect: 'instakill', chance: 0.05, rarity: 'mythic', color: '#220033' },
];

const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
const RARITY_COLORS = { common: '#AAAAAA', rare: '#44CC44', epic: '#6644CC', legendary: '#FF8800', mythic: '#FF2244' };

function rollWeaponModifier(tier) {
    const result = { prefix: null, suffix: null };
    // Higher tier = better chance at rare modifiers
    const prefixRoll = Math.random() + tier * 0.05;
    for (let i = WEAPON_PREFIXES.length - 1; i >= 0; i--) {
        const p = WEAPON_PREFIXES[i];
        const threshold = 0.4 + RARITY_ORDER[p.rarity] * 0.15;
        if (prefixRoll > threshold) { result.prefix = { ...p }; break; }
    }
    if (!result.prefix) result.prefix = { ...WEAPON_PREFIXES[Math.floor(Math.random() * 3)] };
    // Suffix (less common)
    const suffixRoll = Math.random() + tier * 0.03;
    if (suffixRoll > 0.55) {
        for (let i = WEAPON_SUFFIXES.length - 1; i >= 0; i--) {
            const s = WEAPON_SUFFIXES[i];
            const threshold = 0.55 + RARITY_ORDER[s.rarity] * 0.12;
            if (suffixRoll > threshold) { result.suffix = { ...s }; break; }
        }
        if (!result.suffix && suffixRoll > 0.55) result.suffix = { ...WEAPON_SUFFIXES[Math.floor(Math.random() * 2)] };
    }
    return result;
}

function applyWeaponModifier(inventorySlot) {
    if (!inventorySlot || !ITEMS[inventorySlot.id]) return;
    const it = ITEMS[inventorySlot.id];
    if (!['weapon', 'gun', 'bow', 'magic', 'whip', 'spear', 'flail', 'boomerang', 'yoyo', 'launcher'].includes(it.type)) return;
    const tier = it.damage ? Math.floor(it.damage / 20) : 0;
    const mod = rollWeaponModifier(tier);
    inventorySlot.modifier = mod;
    // Build display name
    let name = it.name;
    if (mod.prefix) name = mod.prefix.name + ' ' + name;
    if (mod.suffix) name = name + ' ' + mod.suffix.name;
    inventorySlot.modifiedName = name;
    // Compute modified stats
    if (mod.prefix) {
        inventorySlot.modDamage = Math.round((it.damage || 0) * mod.prefix.dmgMult);
        inventorySlot.modSpeed = Math.round((it.speed || 5) * (1 / (mod.prefix.spdMult || 1)));
        inventorySlot.modCrit = (mod.prefix.critBonus || 0);
    } else {
        inventorySlot.modDamage = it.damage || 0;
        inventorySlot.modSpeed = it.speed || 5;
        inventorySlot.modCrit = 0;
    }
}

function getModifiedWeaponName(slot) {
    if (slot && slot.modifiedName) return slot.modifiedName;
    if (slot && ITEMS[slot.id]) return ITEMS[slot.id].name;
    return 'Unknown';
}

function getWeaponRarityColor(slot) {
    if (!slot || !slot.modifier) return '#AAAAAA';
    let highestRarity = 'common';
    if (slot.modifier.prefix && RARITY_ORDER[slot.modifier.prefix.rarity] > RARITY_ORDER[highestRarity]) highestRarity = slot.modifier.prefix.rarity;
    if (slot.modifier.suffix && RARITY_ORDER[slot.modifier.suffix.rarity] > RARITY_ORDER[highestRarity]) highestRarity = slot.modifier.suffix.rarity;
    return RARITY_COLORS[highestRarity] || '#AAAAAA';
}

// ===== PHASE A3: ELEMENTAL DAMAGE SYSTEM =====
const ELEMENTS = {
    fire: { color: '#FF4400', dot: 'burning', dotDmg: 3, dotRate: 45, dotDur: 300, icon: '🔥', bonusVs: ['ice', 'plant'] },
    ice: { color: '#66CCFF', dot: 'frozen', dotDmg: 0, dotRate: 0, dotDur: 180, icon: '❄', bonusVs: ['fire'] },
    lightning: { color: '#FFDD44', dot: 'stunned', dotDmg: 0, dotRate: 0, dotDur: 90, icon: '⚡', bonusVs: ['metal', 'water'], chainCount: 2, chainDmg: 15 },
    poison: { color: '#66AA22', dot: 'poison', dotDmg: 2, dotRate: 30, dotDur: 480, icon: '☠', bonusVs: ['organic'] },
    void: { color: '#7700CC', dot: 'cursed', dotDmg: 0, dotRate: 0, dotDur: 240, icon: '🌀', bonusVs: [], ignoresDefense: true },
    necrotic: { color: '#882233', dot: 'bleeding', dotDmg: 1, dotRate: 30, dotDur: 720, icon: '💀', bonusVs: ['living'] },
    holy: { color: '#FFD700', dot: null, dotDmg: 0, dotRate: 0, dotDur: 0, icon: '✨', bonusVs: ['undead', 'demon'], bonusMult: 1.5 },
    water: { color: '#2266AA', dot: null, dotDmg: 0, dotRate: 0, dotDur: 0, icon: '🌊', bonusVs: ['fire'], appliesWet: true, wetDur: 360 },
};

function applyElementalDamage(target, element, baseDamage) {
    const elem = ELEMENTS[element];
    if (!elem) return baseDamage;
    let finalDmg = baseDamage;
    // Bonus vs types
    if (target.tags && elem.bonusVs.some(t => target.tags.includes(t))) {
        finalDmg = Math.round(finalDmg * (elem.bonusMult || 1.3));
    }
    // Apply DoT
    if (elem.dot && typeof applyStatusEffect === 'function') {
        applyStatusEffect(target, elem.dot, elem.dotDur);
    }
    // Lightning chain
    if (element === 'lightning' && elem.chainCount && typeof enemies !== 'undefined') {
        let chainTargets = enemies.filter(e => e !== target && Math.abs(e.x - target.x) < 120 && Math.abs(e.y - target.y) < 120);
        for (let i = 0; i < Math.min(elem.chainCount, chainTargets.length); i++) {
            chainTargets[i].hp -= elem.chainDmg;
            if (chainTargets[i].hitTimer !== undefined) chainTargets[i].hitTimer = 10;
            if (typeof spawnDamageNumber === 'function') spawnDamageNumber(chainTargets[i].x, chainTargets[i].y - 10, elem.chainDmg, elem.color);
        }
    }
    // Void ignores defense
    if (elem.ignoresDefense) finalDmg = baseDamage; // No reduction
    // Water applies wet (increases lightning damage)
    if (elem.appliesWet && typeof applyStatusEffect === 'function') {
        applyStatusEffect(target, 'drenched', elem.wetDur || 360);
    }
    return finalDmg;
}

// ===== PHASE A: WEAPON ATTACK HELPERS =====
function getWeaponDamage(slot) {
    if (!slot) return 0;
    const base = slot.modDamage || (ITEMS[slot.id] ? ITEMS[slot.id].damage : 0) || 0;
    return base;
}

function getWeaponElement(slot) {
    if (!slot || !ITEMS[slot.id]) return null;
    return ITEMS[slot.id].element || null;
}

function processWeaponHitEffects(slot, target, damage) {
    if (!slot || !target) return damage;
    const it = ITEMS[slot.id];
    if (!it) return damage;
    let finalDmg = damage;
    // Elemental damage
    if (it.element) finalDmg = applyElementalDamage(target, it.element, finalDmg);
    // onHit status
    if (it.onHit && typeof applyStatusEffect === 'function') applyStatusEffect(target, it.onHit, 300);
    // Crit (from modifier)
    if (slot.modCrit && Math.random() < slot.modCrit) {
        finalDmg = Math.round(finalDmg * 1.8);
        if (typeof spawnDamageNumber === 'function') spawnDamageNumber(target.x, target.y - 20, 'CRIT!', '#FFDD00');
    }
    // Suffix effects
    if (slot.modifier && slot.modifier.suffix) {
        const sfx = slot.modifier.suffix;
        if (sfx.effect === 'lifesteal') {
            const heal = Math.round(finalDmg * sfx.value);
            player.hp = Math.min(player.maxHp, player.hp + heal);
        }
        if (sfx.effect === 'burning' && Math.random() < sfx.chance) applyStatusEffect(target, 'burning', sfx.duration);
        if (sfx.effect === 'frozen' && Math.random() < sfx.chance) applyStatusEffect(target, 'frozen', sfx.duration);
        if (sfx.effect === 'poison' && Math.random() < sfx.chance) applyStatusEffect(target, 'poison', sfx.duration);
        if (sfx.effect === 'execute' && target.hp < target.maxHp * 0.2) finalDmg *= 2;
        if (sfx.effect === 'instakill' && Math.random() < sfx.chance && !target.isBoss) {
            target.hp = 0;
            if (typeof spawnDamageNumber === 'function') spawnDamageNumber(target.x, target.y - 20, 'OBLITERATED!', '#FF0000');
        }
    }
    // Cursed prefix self-damage
    if (slot.modifier && slot.modifier.prefix && slot.modifier.prefix.selfDmg) {
        player.hp -= slot.modifier.prefix.selfDmg;
    }
    return finalDmg;
}

// Drenched status (amplifies lightning)
if (typeof STATUS_EFFECTS !== 'undefined') {
    STATUS_EFFECTS.drenched = { color: '#4488CC', icon: '💧', desc: 'Drenched — weak to lightning', lightningMult: 1.3 };
}

// Block->Item mapping
const BLOCK_ITEMS = {};
Object.keys(T).forEach(k => { if (T[k] > 0) BLOCK_ITEMS[T[k]] = T[k]; });

// Loot tier system
const LOOT_TIERS = { common: 0.6, rare: 0.25, epic: 0.12, legendary: 0.03 };
function rollLootTier() {
    const r = Math.random();
    if (r < LOOT_TIERS.legendary) return 'legendary';
    if (r < LOOT_TIERS.legendary + LOOT_TIERS.epic) return 'epic';
    if (r < LOOT_TIERS.legendary + LOOT_TIERS.epic + LOOT_TIERS.rare) return 'rare';
    return 'common';
}

// ===== PHASE 2: NPC DEFINITIONS =====
const NPC_TYPES = {
    merchant: {
        name: 'Merchant', color: '#886644',
        shop: [{ id: T.TORCH, price: 1, currency: I_GOLD_BAR }, { id: I_ARROW, price: 1, amt: 25, currency: I_IRON_BAR },
        { id: I_RECALL_POTION, price: 2, currency: I_GOLD_BAR }, { id: I_MAGIC_MIRROR, price: 5, currency: I_GOLD_BAR }],
        dialogue: ['Welcome, traveler! The depths hold many secrets...', 'I trade for bars. Gold gets you the best deals.', 'Be wary of the Corruption — it spreads endlessly.']
    },
    blacksmith: {
        name: 'Blacksmith', color: '#AA6633',
        shop: [{ id: I_IRON_PICK, price: 3, currency: I_IRON_BAR }, { id: I_IRON_SWORD, price: 2, currency: I_IRON_BAR },
        { id: I_IRON_HELM, price: 4, currency: I_IRON_BAR }, { id: I_IRON_CHEST, price: 6, currency: I_IRON_BAR }],
        dialogue: ['Need something forged? I am the best smith in the underworld.', 'Bring me ores and I will make tools that cleave stone.', 'The Hellforged require materials from the deepest pits.']
    },
    alchemist: {
        name: 'Alchemist', color: '#7744AA',
        shop: [{ id: I_HEALTH_POT, price: 1, currency: I_GEL }, { id: I_MANA_POT, price: 1, currency: I_GEL },
        { id: I_SPEED_POT, price: 2, currency: I_MUSHROOM_SPORE }, { id: I_GREATER_HEALTH, price: 3, currency: I_CRIMSON_BAR }],
        dialogue: ['Potions, elixirs, and brews — what do you need?', 'The mushroom caverns are rich with alchemical ingredients.', 'I study the curse that binds this underworld.']
    },
    nurse: {
        name: 'Nurse', color: '#CC6688',
        shop: [], service: 'heal',
        dialogue: ['You look hurt. Let me help you.', 'The curse feeds on the living... be careful down there.', 'I can heal you, but only time heals all wounds.']
    },
    wizard: {
        name: 'Wizard', color: '#4466CC',
        shop: [{ id: I_FIRE_STAFF, price: 5, currency: I_CRIMSON_BAR }, { id: I_ICE_STAFF, price: 5, currency: I_FROST_BAR },
        { id: I_ENCHANT_SCROLL, price: 3, currency: I_GOLD_BAR }, { id: I_GREATER_MANA, price: 2, currency: I_GOLD_BAR }],
        dialogue: ['The arcane arts can bend reality itself.', 'Magic flows from the crystals deep below.', 'I sense great darkness stirring in the abyss...']
    }
};

// Housing validation: checks if a location has valid housing
function isValidHousing(tx, ty) {
    // Flood fill to find enclosed room, check for door/table/chair/light
    const visited = new Set();
    const q = [[tx, ty]];
    let hasDoor = false, hasTable = false, hasChair = false, hasLight = false, enclosed = true, cells = 0;
    while (q.length && cells < 200) {
        const [cx, cy] = q.shift();
        const k = cx + ',' + cy;
        if (visited.has(k)) continue;
        visited.add(k); cells++;
        const b = getBlock(cx, cy);
        if (b === T.DOOR) { hasDoor = true; continue; }
        if (b === T.TABLE) { hasTable = true; continue; }
        if (b === T.CHAIR) { hasChair = true; continue; }
        if (b === T.TORCH || b === T.CHANDELIER || b === T.GLOW_SHROOM) { hasLight = true; continue; }
        if (isSolid(cx, cy)) continue;
        if (cx <= 0 || cx >= WORLD_W - 1 || cy <= 0 || cy >= WORLD_H - 1) { enclosed = false; break; }
        q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    if (cells >= 200) enclosed = false;
    return enclosed && hasDoor && hasTable && hasChair && hasLight;
}

// ===== PHASE 2: LIQUID SIMULATION =====
function updateLiquids() {
    for (let x = 1; x < WORLD_W - 1; x++) for (let y = WORLD_H - 3; y >= SURFACE_Y; y--) {
        const b = getBlock(x, y);
        if (b !== T.WATER && b !== T.LAVA && b !== T.BLOOD && b !== T.ACID) continue;
        const below = getBlock(x, y + 1);
        // Water + Lava = Obsidian
        if (b === T.WATER && below === T.LAVA) { setBlock(x, y, T.AIR); setBlock(x, y + 1, T.OBSIDIAN); continue; }
        if (b === T.LAVA && below === T.WATER) { setBlock(x, y, T.AIR); setBlock(x, y + 1, T.OBSIDIAN); continue; }
        // Flow down
        if (below === T.AIR) { setBlock(x, y, T.AIR); setBlock(x, y + 1, b); continue; }
        // Spread sideways
        const left = getBlock(x - 1, y), right = getBlock(x + 1, y);
        if (left === T.AIR && right === T.AIR) {
            if (Math.random() < 0.5) setBlock(x - 1, y, b); else setBlock(x + 1, y, b);
        } else if (left === T.AIR) { setBlock(x - 1, y, b); }
        else if (right === T.AIR) { setBlock(x + 1, y, b); }
        // Acid damages blocks
        if (b === T.ACID) {
            for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y + 1]]) {
                const nb = getBlock(nx, ny);
                if (nb !== T.AIR && nb !== T.BEDROCK && nb !== T.ACID && nb !== T.WATER && nb !== T.LAVA && nb !== T.BLOOD) {
                    if (Math.random() < 0.005) { setBlock(nx, ny, T.AIR); setBlock(x, y, T.AIR); }
                }
            }
        }
        // Blood spawns enemies
        if (b === T.BLOOD && Math.random() < 0.0002) {
            setBlock(x, y, T.AIR); // consumed
        }
    }
}

// ===== WORLD EVIL SPREAD SYSTEM =====
let evilSources = []; // [{x, y, type:'corruption'|'crimson'|'void'}]
let corruptionSources = []; // backward compat alias

function updateEvilSpread() {
    for (const src of evilSources) {
        for (let i = 0; i < 3; i++) {
            const dx = src.x + Math.floor((Math.random() - 0.5) * 60);
            const dy = src.y + Math.floor((Math.random() - 0.5) * 60);
            const b = getBlock(dx, dy);
            if (src.type === 'corruption') {
                if (b === T.STONE) setBlock(dx, dy, T.EBONSTONE);
                else if (b === T.DIRT || b === T.GRASS) setBlock(dx, dy, T.CORRUPT_GRASS);
                else if (b === T.SAND) setBlock(dx, dy, T.EBONSAND);
                else if (b === T.CORRUPTED_STONE || b === T.CORRUPTED_DIRT) { } // already
            } else if (src.type === 'crimson') {
                if (b === T.STONE) setBlock(dx, dy, T.CRIMSTONE);
                else if (b === T.DIRT || b === T.GRASS) setBlock(dx, dy, T.CRIMSON_GRASS);
                else if (b === T.SAND) setBlock(dx, dy, T.CRIMSAND);
            } else if (src.type === 'void') {
                if (b === T.STONE) setBlock(dx, dy, T.VOID_STONE);
                else if (b === T.DIRT || b === T.GRASS) setBlock(dx, dy, T.VOID_GRASS);
                else if (b === T.SAND) setBlock(dx, dy, T.COSMIC_SAND);
            }
        }
    }
}
// Backward compat: old updateCorruption calls new system
function updateCorruption() { updateEvilSpread(); }

// ===== PHASE 2: EARTHQUAKE =====
function triggerEarthquake() {
    const cx = Math.floor(Math.random() * WORLD_W);
    const cy = CAVE_Y + Math.floor(Math.random() * (ABYSS_Y - CAVE_Y));
    for (let dx = -15; dx <= 15; dx++) for (let dy = -10; dy <= 10; dy++) {
        if (dx * dx + dy * dy < 180 && isSolid(cx + dx, cy + dy) && getBlock(cx + dx, cy + dy) !== T.BEDROCK) {
            if (Math.random() < 0.6) setBlock(cx + dx, cy + dy, T.AIR);
        }
    }
}

// ===== PHASE 2: WEATHER & EVENTS STATE =====
const weather = { type: 'clear', timer: 0, intensity: 0 };
const worldEvent = { type: null, timer: 0, wave: 0 };
const WEATHER_TYPES = ['clear', 'rain', 'storm', 'fog', 'blood_rain', 'ash'];
const EVENT_TYPES = ['blood_moon', 'goblin_army', 'solar_eclipse', 'meteor_shower', 'earthquake'];

function eventBanner(text) { worldEvent.banner = text; worldEvent.bannerTimer = 180; }

// ===== SIMPLEX NOISE =====
class SimplexNoise {
    constructor(seed) {
        this.p = new Uint8Array(512);
        const s = seed || Math.random() * 65536;
        for (let i = 0; i < 256; i++) this.p[i] = i;
        for (let i = 255; i > 0; i--) { const j = Math.floor(((s * (i + 1) * 16807) % 2147483647) / 2147483647 * (i + 1));[this.p[i], this.p[j]] = [this.p[j], this.p[i]]; }
        for (let i = 0; i < 256; i++) this.p[i + 256] = this.p[i];
        this.g2 = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
    }
    noise2D(x, y) {
        const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
        const s = (x + y) * F2; let i = Math.floor(x + s), j = Math.floor(y + s);
        const t = (i + j) * G2, x0 = x - (i - t), y0 = y - (j - t);
        let i1, j1; if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
        const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
        i &= 255; j &= 255;
        const gi0 = this.p[i + this.p[j]] % 8, gi1 = this.p[i + i1 + this.p[j + j1]] % 8, gi2 = this.p[i + 1 + this.p[j + 1]] % 8;
        let n0 = 0, n1 = 0, n2 = 0, t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * (this.g2[gi0][0] * x0 + this.g2[gi0][1] * y0); }
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * (this.g2[gi1][0] * x1 + this.g2[gi1][1] * y1); }
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * (this.g2[gi2][0] * x2 + this.g2[gi2][1] * y2); }
        return 70 * (n0 + n1 + n2);
    }
    fbm(x, y, oct, lac, gain) { let v = 0, a = 1, f = 1; for (let i = 0; i < oct; i++) { v += a * this.noise2D(x * f, y * f); a *= gain; f *= lac; } return v; }
}

// ===== WORLD =====
let world = null;
let lightMap = null;
let noise = null;

function initWorld() {
    world = new Uint8Array(WORLD_W * WORLD_H);
    lightMap = new Float32Array(WORLD_W * WORLD_H);
    noise = new SimplexNoise(worldSeed);
}

function getBlock(x, y) { return (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) ? T.BEDROCK : world[y * WORLD_W + x]; }
function setBlock(x, y, t) { if (x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H) world[y * WORLD_W + x] = t; }
function isSolid(x, y) { const b = getBlock(x, y); return b !== T.AIR && b !== T.WATER && b !== T.LAVA && b !== T.TORCH && b !== T.COBWEB && b !== T.CORRUPT_VINE && b !== T.CORRUPT_THORNS && b !== T.CRIMSON_VINE_TILE && b !== T.CRIMSON_THORNS && b !== T.VOID_RIFT && b !== T.DARK_NEBULA && b !== T.JUNGLE_VINE && b !== T.THIN_ICE; }

function generateWorld() {
    const heights = [];
    // Multi-octave heightmap for natural rolling hills
    for (let x = 0; x < WORLD_W; x++) {
        const h1 = noise.fbm(x * 0.005, 0, 3, 2, 0.5) * 20;    // Large sweeping hills
        const h2 = noise.fbm(x * 0.02, 5, 3, 2, 0.5) * 8;       // Medium bumps
        const h3 = noise.fbm(x * 0.08, 12, 2, 2, 0.5) * 3;      // Small rocky jitter
        heights[x] = Math.floor(SURFACE_Y + h1 + h2 + h3);
    }
    // Fill terrain with biome-aware blocks
    for (let x = 0; x < WORLD_W; x++) {
        const sh = heights[x];
        const dirtDepth = 4 + Math.floor(noise.noise2D(x * 0.05, 100) * 3); // 4-7 deep
        for (let y = 0; y < WORLD_H; y++) {
            if (y === WORLD_H - 1) { setBlock(x, y, T.BEDROCK); continue; }
            if (y < sh) { setBlock(x, y, T.AIR); continue; }
            if (y === sh) setBlock(x, y, T.GRASS);
            else if (y < sh + dirtDepth) setBlock(x, y, T.DIRT);
            // Clay transition layer
            else if (y < sh + dirtDepth + 2) {
                const nv = noise.noise2D(x * 0.1, y * 0.1);
                setBlock(x, y, nv > 0.3 ? T.DIRT : T.STONE);
            }
            else if (y < CAVE_Y) setBlock(x, y, T.STONE);
            // Bone Caverns — use noise for natural patches
            else if (y < MUSH_Y) {
                const nv = noise.noise2D(x * 0.06, y * 0.06 + 50);
                setBlock(x, y, nv > 0.3 ? T.BONE : nv > 0.1 ? T.CRACKED_BRICK : T.STONE);
            }
            // Mushroom Caverns
            else if (y < FROZEN_Y) {
                const nv = noise.noise2D(x * 0.07, y * 0.07 + 100);
                setBlock(x, y, nv > 0.35 ? T.MUSHROOM_STEM : nv > 0.15 ? T.MOSSY_STONE : T.STONE);
            }
            // Frozen Crypt
            else if (y < FLESH_Y) {
                const nv = noise.noise2D(x * 0.06, y * 0.06 + 150);
                setBlock(x, y, nv > 0.2 ? T.ICE : nv > 0 ? T.FROZEN_STONE : nv > -0.2 ? T.SNOW : T.STONE);
            }
            // Flesh Tunnels
            else if (y < HIVE_Y) {
                const nv = noise.noise2D(x * 0.05, y * 0.05 + 200);
                setBlock(x, y, nv > 0.15 ? T.FLESH : nv > -0.1 ? T.BLOOD_STONE : T.STONE);
            }
            // Living Hive
            else if (y < ABYSS_Y) {
                const nv = noise.noise2D(x * 0.05, y * 0.05 + 250);
                setBlock(x, y, nv > 0.15 ? T.HIVE_WALL : nv > -0.2 ? T.HONEY_BLOCK : T.STONE);
            }
            // Abyssal/Hell
            else if (y < WORLD_H - 20) {
                const nv = noise.noise2D(x * 0.04, y * 0.04 + 300);
                setBlock(x, y, nv > 0.2 ? T.OBSIDIAN : nv > -0.1 ? T.DEMON_BRICK : T.HELLSTONE);
            }
            else setBlock(x, y, T.HELLSTONE);
        }
    }
    // ===== ENHANCED CAVE SYSTEM =====
    // Layer 1: Standard noise caves (tuned for bigger openings)
    for (let x = 0; x < WORLD_W; x++) for (let y = heights[x] + 6; y < WORLD_H - 5; y++) {
        const cv = noise.fbm(x * 0.04, y * 0.04, 3, 2.2, 0.5);
        if (cv > 0.2) setBlock(x, y, T.AIR);
        const cv2 = noise.fbm(x * 0.07 + 100, y * 0.07, 2, 2, 0.5);
        if (cv2 > 0.3) setBlock(x, y, T.AIR);
    }
    // Layer 2: Worm caves (tunneling algorithm)
    const wormCount = Math.floor(15 + Math.random() * 10);
    for (let w = 0; w < wormCount; w++) {
        let wx = Math.floor(Math.random() * WORLD_W);
        let wy = heights[Math.min(wx, WORLD_W - 1)] + 15 + Math.floor(Math.random() * (WORLD_H - heights[0] - 40));
        let angle = Math.random() * Math.PI * 2;
        const wormLen = 80 + Math.floor(Math.random() * 200);
        const wormRad = 2 + Math.floor(Math.random() * 4);
        for (let s = 0; s < wormLen; s++) {
            // Carve circle at position
            for (let dx = -wormRad; dx <= wormRad; dx++) {
                for (let dy = -wormRad; dy <= wormRad; dy++) {
                    if (dx * dx + dy * dy <= wormRad * wormRad) {
                        const cx = Math.floor(wx + dx), cy = Math.floor(wy + dy);
                        if (cx > 0 && cx < WORLD_W - 1 && cy > heights[cx] + 3 && cy < WORLD_H - 2) {
                            setBlock(cx, cy, T.AIR);
                        }
                    }
                }
            }
            // Move worm
            angle += (Math.random() - 0.5) * 0.6;
            wx += Math.cos(angle) * 1.5;
            wy += Math.sin(angle) * 1.2;
            // Keep in bounds
            if (wx < 5) angle = 0;
            if (wx > WORLD_W - 5) angle = Math.PI;
            if (wy < SURFACE_Y + 10) angle = Math.PI / 2;
            if (wy > WORLD_H - 10) angle = -Math.PI / 2;
        }
    }
    // Layer 3: Large cavern rooms
    const cavernCount = 8 + Math.floor(Math.random() * 8);
    const caverns = [];
    for (let c = 0; c < cavernCount; c++) {
        const cx = 20 + Math.floor(Math.random() * (WORLD_W - 40));
        const cy = CAVE_Y + Math.floor(Math.random() * (ABYSS_Y - CAVE_Y));
        const rw = 10 + Math.floor(Math.random() * 20);
        const rh = 6 + Math.floor(Math.random() * 14);
        caverns.push({ x: cx, y: cy, w: rw, h: rh });
        // Carve oval cavern
        for (let dx = -rw; dx <= rw; dx++) {
            for (let dy = -rh; dy <= rh; dy++) {
                const d = (dx * dx) / (rw * rw) + (dy * dy) / (rh * rh);
                if (d <= 1 + Math.sin(dx * 0.5) * 0.1) {
                    const bx = cx + dx, by = cy + dy;
                    if (bx > 0 && bx < WORLD_W - 1 && by > SURFACE_Y + 5 && by < WORLD_H - 3) {
                        setBlock(bx, by, T.AIR);
                    }
                }
            }
        }
        // Add torches in cavern
        setBlock(cx - rw + 1, cy, T.TORCH);
        setBlock(cx + rw - 1, cy, T.TORCH);
        // Chest in some caverns
        if (Math.random() < 0.4) {
            setBlock(cx, cy + rh - 1, T.CHEST);
        }
    }
    // Connect adjacent caverns with tunnels
    for (let i = 0; i < caverns.length - 1; i++) {
        const a = caverns[i], b = caverns[i + 1];
        const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        if (dist < 80) {
            const steps = Math.floor(dist * 2);
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const tx = Math.floor(a.x + (b.x - a.x) * t);
                const ty = Math.floor(a.y + (b.y - a.y) * t);
                for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
                    if (dx * dx + dy * dy <= 5 && tx + dx > 0 && tx + dx < WORLD_W - 1 && ty + dy > 3) {
                        setBlock(tx + dx, ty + dy, T.AIR);
                    }
                }
            }
        }
    }

    // ===== LAVA (progressive depth) =====
    // Small lava pockets starting at Frozen depth
    for (let x = 0; x < WORLD_W; x++) for (let y = FROZEN_Y; y < FLESH_Y; y++) {
        if (getBlock(x, y) === T.AIR && isSolid(x, y + 1) && Math.random() < 0.008) {
            setBlock(x, y, T.LAVA);
        }
    }
    // Medium lava pools in Flesh/Hive
    for (let x = 0; x < WORLD_W; x++) for (let y = FLESH_Y; y < ABYSS_Y; y++) {
        if (getBlock(x, y) === T.AIR && isSolid(x, y + 1) && Math.random() < 0.03) {
            // Fill pool horizontally
            for (let lx = -2; lx <= 2; lx++) {
                if (x + lx > 0 && x + lx < WORLD_W && getBlock(x + lx, y) === T.AIR) {
                    setBlock(x + lx, y, T.LAVA);
                }
            }
        }
    }
    // Lava rivers in abyss
    for (let r = 0; r < 5; r++) {
        let rx = Math.floor(Math.random() * WORLD_W);
        let ry = ABYSS_Y + 5 + Math.floor(Math.random() * 20);
        for (let s = 0; s < 100; s++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (rx + dx > 0 && rx + dx < WORLD_W) setBlock(rx + dx, ry, T.LAVA);
            }
            rx += Math.floor(Math.random() * 3) - 1;
            if (Math.random() < 0.3) ry += Math.floor(Math.random() * 3) - 1;
            ry = Math.max(ABYSS_Y, Math.min(WORLD_H - 5, ry));
            rx = Math.max(1, Math.min(WORLD_W - 2, rx));
        }
    }
    // Full lava ocean at very bottom
    for (let x = 0; x < WORLD_W; x++) for (let y = WORLD_H - 8; y < WORLD_H - 1; y++) {
        if (getBlock(x, y) === T.AIR || Math.random() < 0.7) setBlock(x, y, T.LAVA);
    }
    // Lava pools in abyss air spaces
    for (let x = 0; x < WORLD_W; x++) for (let y = ABYSS_Y; y < WORLD_H - 8; y++) {
        if (getBlock(x, y) === T.AIR && Math.random() < 0.12) setBlock(x, y, T.LAVA);
    }

    // ===== HELL BIOME STRUCTURES (full width) =====
    // Hell fortress pillars every ~30 blocks
    for (let x = 10; x < WORLD_W - 10; x += 25 + Math.floor(Math.random() * 15)) {
        const pillarH = 15 + Math.floor(Math.random() * 20);
        const baseY = WORLD_H - 10;
        // Pillar
        for (let py = 0; py < pillarH; py++) {
            setBlock(x, baseY - py, T.DEMON_BRICK);
            setBlock(x + 1, baseY - py, T.DEMON_BRICK);
        }
        // Platform at top
        for (let px = -3; px <= 4; px++) {
            setBlock(x + px, baseY - pillarH, T.DEMON_BRICK);
            setBlock(x + px, baseY - pillarH - 1, T.OBSIDIAN);
        }
        // Torches
        setBlock(x - 1, baseY - pillarH - 1, T.TORCH);
        setBlock(x + 2, baseY - pillarH - 1, T.TORCH);
        // Occasional chest on platforms
        if (Math.random() < 0.3) setBlock(x, baseY - pillarH - 1, T.CHEST);
    }
    // Hellstone stalactites/stalagmites
    for (let x = 0; x < WORLD_W; x++) {
        if (Math.random() > 0.06) continue;
        // Stalactites from ceiling of hell
        for (let y = ABYSS_Y; y < ABYSS_Y + 5; y++) {
            if (isSolid(x, y) && getBlock(x, y + 1) === T.AIR) {
                const len = 3 + Math.floor(Math.random() * 6);
                for (let s = 1; s <= len; s++) {
                    if (getBlock(x, y + s) === T.AIR) setBlock(x, y + s, T.HELLSTONE);
                    else break;
                }
                break;
            }
        }
    }

    // Underground water lakes in mushroom/frozen biome
    for (let x = 0; x < WORLD_W; x++) for (let y = MUSH_Y; y < FLESH_Y; y++) {
        if (getBlock(x, y) === T.AIR && isSolid(x, y + 1) && Math.random() < 0.03) setBlock(x, y, T.WATER);
    }
    // ===== ORES (depth-based distribution) =====
    for (let x = 0; x < WORLD_W; x++) for (let y = SURFACE_Y; y < WORLD_H - 1; y++) {
        if (getBlock(x, y) === T.AIR || getBlock(x, y) === T.LAVA || getBlock(x, y) === T.WATER) continue;
        const ov = noise.noise2D(x * 0.1 + 200, y * 0.1);
        // Copper near surface
        if (y > SURFACE_Y + 5 && y < CAVE_Y && ov > 0.55) setBlock(x, y, T.IRON_ORE);
        // Iron in upper caves
        if (y > SURFACE_Y + 15 && y < CAVE_Y + 20 && ov > 0.6) setBlock(x, y, T.IRON_ORE);
        // Gold in mid caves
        if (y > CAVE_Y - 10 && y < FROZEN_Y && ov > 0.62) setBlock(x, y, T.GOLD_ORE);
        // Crimson deep
        if (y > FROZEN_Y - 10 && y < HIVE_Y && ov > 0.65) setBlock(x, y, T.CRIMSON_ORE);
        // Shadow at bottom
        if (y > HIVE_Y - 10 && ov > 0.68) setBlock(x, y, T.SHADOW_ORE);
        // Biome-specific ores
        if (y > FROZEN_Y && y < FLESH_Y && noise.noise2D(x * 0.12 + 300, y * 0.12) > 0.65) setBlock(x, y, T.FROST_ORE);
        if (y > HIVE_Y - 10 && y < ABYSS_Y && noise.noise2D(x * 0.12 + 400, y * 0.12) > 0.65) setBlock(x, y, T.HIVE_ORE);
        if (y > ABYSS_Y && noise.noise2D(x * 0.15 + 500, y * 0.15) > 0.7) setBlock(x, y, T.CRYSTAL);
    }
    // ===== TERRARIA-STYLE TREES =====
    let lastTreeX = -10;
    for (let x = 5; x < WORLD_W - 5; x++) {
        if (x - lastTreeX < 5) continue; // Enforce spacing
        if (Math.random() > 0.12) continue;
        const sy = heights[x];
        if (getBlock(x, sy) !== T.GRASS) continue;
        lastTreeX = x;

        const treeType = Math.random();
        if (treeType < 0.45) {
            // === OAK TREE (large, round canopy) ===
            const th = 7 + Math.floor(Math.random() * 5); // 7-11 tall
            // Trunk (2 blocks wide for big trees)
            const wide = th > 9;
            for (let ty = 1; ty <= th; ty++) {
                setBlock(x, sy - ty, T.WOOD);
                if (wide) setBlock(x + 1, sy - ty, T.WOOD);
            }
            // Roots
            if (getBlock(x - 1, sy) === T.AIR) setBlock(x - 1, sy, T.WOOD);
            if (getBlock(x + (wide ? 2 : 1), sy) === T.AIR) setBlock(x + (wide ? 2 : 1), sy, T.WOOD);
            // Round canopy
            const cr = 3 + Math.floor(th / 4); // radius based on height
            const cx = wide ? x : x;
            const cy = sy - th;
            for (let lx = -cr; lx <= cr + (wide ? 1 : 0); lx++) {
                for (let ly = -cr; ly <= Math.floor(cr * 0.4); ly++) {
                    const d = Math.sqrt(lx * lx + ly * ly * 2.5);
                    if (d <= cr + Math.sin(lx * 2.3) * 0.8) {
                        if (getBlock(cx + lx, cy + ly) === T.AIR) {
                            setBlock(cx + lx, cy + ly, T.LEAVES);
                        }
                    }
                }
            }
            // Branch stubs
            if (th > 8) {
                const by = sy - Math.floor(th * 0.5);
                if (getBlock(x - 1, by) === T.AIR) setBlock(x - 1, by, T.WOOD);
                if (getBlock(x + (wide ? 2 : 1), by) === T.AIR) setBlock(x + (wide ? 2 : 1), by, T.WOOD);
            }
        } else if (treeType < 0.70) {
            // === PINE TREE (tall, triangular) ===
            const th = 9 + Math.floor(Math.random() * 6);
            for (let ty = 1; ty <= th; ty++) setBlock(x, sy - ty, T.WOOD);
            // Triangular canopy (widens toward bottom)
            for (let layer = 0; layer < Math.floor(th * 0.75); layer++) {
                const ly = sy - th + layer - 1;
                const hw = Math.floor(layer * 0.6) + 1; // half-width grows
                for (let lx = -hw; lx <= hw; lx++) {
                    if (getBlock(x + lx, ly) === T.AIR) setBlock(x + lx, ly, T.LEAVES);
                }
            }
            // Top point
            if (getBlock(x, sy - th - 1) === T.AIR) setBlock(x, sy - th - 1, T.LEAVES);
            if (getBlock(x, sy - th - 2) === T.AIR) setBlock(x, sy - th - 2, T.LEAVES);
        } else if (treeType < 0.85) {
            // === WILLOW TREE (drooping leaves) ===
            const th = 6 + Math.floor(Math.random() * 4);
            for (let ty = 1; ty <= th; ty++) setBlock(x, sy - ty, T.WOOD);
            // Wide flat canopy
            for (let lx = -3; lx <= 3; lx++) {
                for (let ly = -2; ly <= 0; ly++) {
                    if (getBlock(x + lx, sy - th + ly) === T.AIR)
                        setBlock(x + lx, sy - th + ly, T.LEAVES);
                }
                // Hanging vines
                if (Math.abs(lx) >= 1) {
                    const vineLen = 2 + Math.floor(Math.random() * 4);
                    for (let vy = 1; vy <= vineLen; vy++) {
                        if (getBlock(x + lx, sy - th + vy) === T.AIR)
                            setBlock(x + lx, sy - th + vy, T.LEAVES);
                    }
                }
            }
        } else {
            // === SMALL BUSH/SHRUB ===
            const th = 2 + Math.floor(Math.random() * 2);
            for (let ty = 1; ty <= th; ty++) setBlock(x, sy - ty, T.WOOD);
            for (let lx = -1; lx <= 1; lx++) for (let ly = -1; ly <= 0; ly++) {
                if (getBlock(x + lx, sy - th + ly) === T.AIR)
                    setBlock(x + lx, sy - th + ly, T.LEAVES);
            }
        }
    }
    // ===== SURFACE GRASS TUFTS & FLOWERS =====
    for (let x = 0; x < WORLD_W; x++) {
        const sy = heights[x];
        if (getBlock(x, sy) !== T.GRASS) continue;
        // Small grass tufts between trees
        if (getBlock(x, sy - 1) === T.AIR && Math.random() < 0.3) {
            setBlock(x, sy - 1, T.TALL_GRASS || T.AIR); // Uses TALL_GRASS if defined
        }
    }
    // ===== UNDERGROUND VINES =====
    for (let x = 0; x < WORLD_W; x++) {
        for (let y = heights[x] + 8; y < CAVE_Y; y++) {
            if (getBlock(x, y) === T.AIR && isSolid(x, y - 1) && Math.random() < 0.02) {
                const vlen = 2 + Math.floor(Math.random() * 5);
                for (let v = 0; v < vlen; v++) {
                    if (getBlock(x, y + v) === T.AIR) setBlock(x, y + v, T.LEAVES);
                    else break;
                }
            }
        }
    }
    // Giant mushrooms in Mushroom Caverns
    for (let x = 10; x < WORLD_W - 10; x += 3) {
        if (Math.random() > 0.04) continue;
        for (let y = MUSH_Y; y < FROZEN_Y - 5; y++) {
            if (getBlock(x, y) === T.AIR && isSolid(x, y + 1)) {
                const mh = 4 + Math.floor(Math.random() * 5);
                for (let my = 0; my < mh; my++) setBlock(x, y - my, T.MUSHROOM_STEM);
                for (let mx = -2; mx <= 2; mx++) for (let my = -2; my <= 0; my++) {
                    if (getBlock(x + mx, y - mh + my) === T.AIR) setBlock(x + mx, y - mh + my, T.MUSHROOM_CAP);
                }
                break;
            }
        }
    }
    // Glow shrooms scattered in mushroom biome
    for (let x = 0; x < WORLD_W; x++) for (let y = MUSH_Y; y < FROZEN_Y; y++) {
        if (getBlock(x, y) === T.AIR && isSolid(x, y + 1) && Math.random() < 0.02) setBlock(x, y, T.GLOW_SHROOM);
    }
    // Stalactites and stalagmites in Frozen Crypt
    for (let x = 0; x < WORLD_W; x++) for (let y = FROZEN_Y; y < FLESH_Y; y++) {
        if (getBlock(x, y) === T.AIR) {
            if (isSolid(x, y - 1) && Math.random() < 0.015) setBlock(x, y, T.STALACTITE);
            if (isSolid(x, y + 1) && Math.random() < 0.015) setBlock(x, y, T.STALAGMITE);
        }
    }
    // Cobwebs in bone caverns
    for (let x = 0; x < WORLD_W; x++) for (let y = CAVE_Y; y < MUSH_Y; y++) {
        if (getBlock(x, y) === T.AIR && Math.random() < 0.01) setBlock(x, y, T.COBWEB);
    }
    // Spider eggs in caves
    for (let x = 0; x < WORLD_W; x++) for (let y = CAVE_Y; y < FROZEN_Y; y++) {
        if (getBlock(x, y) === T.AIR && isSolid(x, y + 1) && Math.random() < 0.005) setBlock(x, y, T.SPIDER_EGG);
    }
    // Lava pools at bottom
    for (let x = 0; x < WORLD_W; x++) for (let y = ABYSS_Y + 20; y < WORLD_H - 3; y++) {
        if (getBlock(x, y) === T.AIR && Math.random() < 0.15) setBlock(x, y, T.LAVA);
    }
    // Underground water lakes in mushroom/frozen biome
    for (let x = 0; x < WORLD_W; x++) for (let y = MUSH_Y; y < FLESH_Y; y++) {
        if (getBlock(x, y) === T.AIR && isSolid(x, y + 1) && Math.random() < 0.03) setBlock(x, y, T.WATER);
    }
    // ===== STRUCTURES =====
    // Surface structures: graveyards, blood altars, ruined watchtowers
    for (let x = 20; x < WORLD_W - 20; x += Math.floor(40 + Math.random() * 60)) {
        const sy = heights[x];
        const stype = Math.random();
        if (stype < 0.33) {
            // Graveyard
            for (let gx = 0; gx < 5; gx++) {
                if (getBlock(x + gx * 3, sy) !== T.GRASS) continue;
                setBlock(x + gx * 3, sy - 1, T.BONE_BRICK);
                setBlock(x + gx * 3, sy - 2, T.BONE_BRICK);
            }
        } else if (stype < 0.66) {
            // Blood altar
            for (let ax = -2; ax <= 2; ax++) setBlock(x + ax, sy - 1, T.BLOOD_STONE);
            setBlock(x, sy - 2, T.BLOOD_ALTAR);
        } else {
            // Ruined watchtower
            for (let ty = 1; ty <= 8; ty++) { setBlock(x, sy - ty, T.CRACKED_BRICK); setBlock(x + 2, sy - ty, T.CRACKED_BRICK); }
            for (let tx = 0; tx <= 2; tx++) setBlock(x + tx, sy - 8, T.CRACKED_BRICK);
        }
    }
    // Underground: mineshafts
    for (let i = 0; i < 8; i++) {
        const mx = 30 + Math.floor(Math.random() * (WORLD_W - 60));
        const my = CAVE_Y + Math.floor(Math.random() * (MUSH_Y - CAVE_Y));
        const len = 20 + Math.floor(Math.random() * 30);
        for (let dx = 0; dx < len; dx++) {
            setBlock(mx + dx, my, T.AIR); setBlock(mx + dx, my - 1, T.AIR); setBlock(mx + dx, my - 2, T.AIR);
            setBlock(mx + dx, my + 1, T.PLANKS); // rail floor
            if (dx % 6 === 0) { setBlock(mx + dx, my - 1, T.WOOD); setBlock(mx + dx, my - 2, T.WOOD); setBlock(mx + dx, my - 3, T.PLANKS); } // supports
            if (dx === Math.floor(len / 2)) setBlock(mx + dx, my, T.CHEST); // loot chest
        }
    }
    // Underground: spider dens
    for (let i = 0; i < 5; i++) {
        const sx = 20 + Math.floor(Math.random() * (WORLD_W - 40));
        const sy2 = CAVE_Y + 10 + Math.floor(Math.random() * (MUSH_Y - CAVE_Y - 20));
        for (let dx = -4; dx <= 4; dx++) for (let dy = -3; dy <= 3; dy++) {
            if (dx * dx + dy * dy <= 16) { setBlock(sx + dx, sy2 + dy, T.AIR); }
        }
        for (let dx = -3; dx <= 3; dx++) for (let dy = -2; dy <= 2; dy++) {
            if (getBlock(sx + dx, sy2 + dy) === T.AIR && Math.random() < 0.3) setBlock(sx + dx, sy2 + dy, T.COBWEB);
        }
        setBlock(sx, sy2, T.SPIDER_EGG); setBlock(sx + 1, sy2 + 1, T.SPIDER_EGG);
    }
    // Underground: skeleton dungeons
    for (let i = 0; i < 4; i++) {
        const dx2 = 30 + Math.floor(Math.random() * (WORLD_W - 60));
        const dy2 = MUSH_Y + Math.floor(Math.random() * (FLESH_Y - MUSH_Y - 10));
        const rw = 8 + Math.floor(Math.random() * 6), rh = 6 + Math.floor(Math.random() * 4);
        for (let rx = 0; rx < rw; rx++) for (let ry = 0; ry < rh; ry++) {
            if (rx === 0 || rx === rw - 1 || ry === 0 || ry === rh - 1) setBlock(dx2 + rx, dy2 + ry, T.BONE_BRICK);
            else setBlock(dx2 + rx, dy2 + ry, T.AIR);
        }
        setBlock(dx2 + Math.floor(rw / 2), dy2 + rh - 2, T.CHEST);
        setBlock(dx2 + 1, dy2 + 1, T.TORCH); setBlock(dx2 + rw - 2, dy2 + 1, T.TORCH);
    }
    // Underground: ruined temples in flesh biome
    for (let i = 0; i < 3; i++) {
        const tx = 40 + Math.floor(Math.random() * (WORLD_W - 80));
        const ty = FLESH_Y + Math.floor(Math.random() * (HIVE_Y - FLESH_Y - 15));
        for (let rx = 0; rx < 12; rx++) for (let ry = 0; ry < 8; ry++) {
            if (rx === 0 || rx === 11 || ry === 0 || ry === 7) setBlock(tx + rx, ty + ry, T.DEMON_BRICK);
            else setBlock(tx + rx, ty + ry, T.AIR);
        }
        setBlock(tx + 5, ty + 6, T.BLOOD_ALTAR); setBlock(tx + 6, ty + 6, T.BLOOD_ALTAR);
        setBlock(tx + 1, ty + 1, T.TORCH); setBlock(tx + 10, ty + 1, T.TORCH);
        setBlock(tx + 5, ty + 3, T.CHEST);
    }

    // ===== PHASE 3: SKY ISLANDS =====
    const islandCount = Math.floor(WORLD_W / 120);
    for (let i = 0; i < islandCount; i++) {
        const ix = 40 + Math.floor(Math.random() * (WORLD_W - 80));
        const iy = 15 + Math.floor(Math.random() * (SURFACE_Y - 40));
        const iw = 12 + Math.floor(Math.random() * 16);
        const ih = 4 + Math.floor(Math.random() * 3);
        // Platform
        for (let dx = 0; dx < iw; dx++) for (let dy = 0; dy < ih; dy++) {
            const block = dy === 0 ? T.GRASS : dy < 2 ? T.DIRT : T.STONE;
            setBlock(ix + dx, iy + dy, block);
        }
        // Crystal deposits
        for (let dx = 2; dx < iw - 2; dx++) {
            if (Math.random() < 0.3) setBlock(ix + dx, iy + 1, T.CRYSTAL);
        }
        // Sky chest with loot
        setBlock(ix + Math.floor(iw / 2), iy - 1, T.CHEST);
        // Glass dome
        for (let dx = 2; dx < iw - 2; dx++) {
            setBlock(ix + dx, iy - 2, T.GLASS);
        }
        setBlock(ix + 1, iy - 1, T.GLASS); setBlock(ix + iw - 2, iy - 1, T.GLASS);
        // Torch
        setBlock(ix + 3, iy - 1, T.TORCH); setBlock(ix + iw - 4, iy - 1, T.TORCH);
    }

    // ===== PHASE 3: OCEAN BIOMES (world edges) =====
    const oceanWidth = Math.min(30, Math.floor(WORLD_W * 0.04));
    for (let side = 0; side < 2; side++) {
        const ox = side === 0 ? 0 : WORLD_W - oceanWidth;
        for (let x = ox; x < ox + oceanWidth; x++) {
            const sh = heights[x] || SURFACE_Y;
            for (let y = sh; y < sh + 15; y++) {
                if (getBlock(x, y) !== T.AIR && getBlock(x, y) !== T.BEDROCK) {
                    if (y === sh + 14) setBlock(x, y, T.SAND);
                    else setBlock(x, y, T.WATER);
                }
            }
            // Coral & sand floor
            for (let y = sh + 12; y < sh + 15; y++) {
                if (Math.random() < 0.4) setBlock(x, y, T.SAND);
            }
        }
    }

    // ===== PHASE 3: DUNGEON GENERATOR =====
    const dungeonCount = Math.max(2, Math.floor(WORLD_W / 300));
    for (let d = 0; d < dungeonCount; d++) {
        const dx = 50 + Math.floor(Math.random() * (WORLD_W - 100));
        const dy = CAVE_Y + 20 + Math.floor(Math.random() * (FROZEN_Y - CAVE_Y - 40));
        const rooms = 4 + Math.floor(Math.random() * 4);
        let rx = dx, ry = dy;
        for (let r = 0; r < rooms; r++) {
            const rw = 8 + Math.floor(Math.random() * 6);
            const rh = 6 + Math.floor(Math.random() * 4);
            // Carve room
            for (let x = 0; x < rw; x++) for (let y = 0; y < rh; y++) {
                if (x === 0 || x === rw - 1 || y === 0 || y === rh - 1) setBlock(rx + x, ry + y, T.BONE_BRICK);
                else setBlock(rx + x, ry + y, T.AIR);
            }
            // Room features
            setBlock(rx + 1, ry + 1, T.TORCH); setBlock(rx + rw - 2, ry + 1, T.TORCH);
            if (r === rooms - 1) {
                // Boss room: chest + altar
                setBlock(rx + Math.floor(rw / 2), ry + rh - 2, T.CHEST);
                setBlock(rx + Math.floor(rw / 2) - 1, ry + rh - 2, T.BLOOD_ALTAR);
            } else if (Math.random() < 0.5) {
                setBlock(rx + Math.floor(rw / 2), ry + rh - 2, T.CHEST);
            }
            // Pressure plate traps
            if (Math.random() < 0.4) {
                setBlock(rx + Math.floor(rw / 2), ry + rh - 2, T.PRESSURE_PLATE);
            }
            // Corridor to next room
            const nextDir = Math.random() < 0.5 ? 0 : 1; // 0=right, 1=down
            if (nextDir === 0) {
                for (let cx = 0; cx < 6; cx++) {
                    setBlock(rx + rw + cx, ry + Math.floor(rh / 2), T.AIR);
                    setBlock(rx + rw + cx, ry + Math.floor(rh / 2) - 1, T.AIR);
                    setBlock(rx + rw + cx, ry + Math.floor(rh / 2) + 1, T.AIR);
                }
                rx += rw + 6;
            } else {
                for (let cy = 0; cy < 5; cy++) {
                    setBlock(rx + Math.floor(rw / 2), ry + rh + cy, T.AIR);
                    setBlock(rx + Math.floor(rw / 2) - 1, ry + rh + cy, T.AIR);
                    setBlock(rx + Math.floor(rw / 2) + 1, ry + rh + cy, T.AIR);
                }
                ry += rh + 5;
            }
        }
    }

    // ===== WORLD EVIL BIOME GENERATION =====
    const evilPositions = [];
    const evilStripWidth = Math.floor(WORLD_W * 0.1); // 10% world width each
    const evil1Start = Math.floor(WORLD_W * 0.15); // Left evil
    const evil2Start = Math.floor(WORLD_W * 0.72); // Right evil
    const evilZones = [
        { type: worldEvils[0], start: evil1Start, end: evil1Start + evilStripWidth },
        { type: worldEvils[1], start: evil2Start, end: evil2Start + evilStripWidth }
    ];

    for (const zone of evilZones) {
        for (let x = zone.start; x < zone.end && x < WORLD_W; x++) {
            const sy = heights[x];
            // Convert surface and underground
            for (let y = Math.max(0, sy - 5); y < Math.min(WORLD_H, sy + 100); y++) {
                const b = getBlock(x, y);
                if (zone.type === 'corruption') {
                    if (b === T.GRASS) setBlock(x, y, T.CORRUPT_GRASS);
                    else if (b === T.STONE) setBlock(x, y, T.EBONSTONE);
                    else if (b === T.SAND) setBlock(x, y, T.EBONSAND);
                    else if (b === T.DIRT && y > sy + 5) setBlock(x, y, T.EBONSTONE);
                } else if (zone.type === 'crimson') {
                    if (b === T.GRASS) setBlock(x, y, T.CRIMSON_GRASS);
                    else if (b === T.STONE) setBlock(x, y, T.CRIMSTONE);
                    else if (b === T.SAND) setBlock(x, y, T.CRIMSAND);
                    else if (b === T.DIRT && y > sy + 5) setBlock(x, y, T.CRIMSTONE);
                } else if (zone.type === 'void') {
                    if (b === T.GRASS) setBlock(x, y, T.VOID_GRASS);
                    else if (b === T.STONE) setBlock(x, y, T.VOID_STONE);
                    else if (b === T.SAND) setBlock(x, y, T.COSMIC_SAND);
                    else if (b === T.DIRT && y > sy + 5) setBlock(x, y, T.VOID_STONE);
                }
            }
            // Generate deep chasms every ~15 blocks
            if ((x - zone.start) % 15 === 7) {
                const chasmDepth = 30 + Math.floor(Math.random() * 20);
                for (let cy = sy; cy < sy + chasmDepth; cy++) {
                    for (let cw = -1; cw <= 1; cw++) {
                        if (x + cw >= 0 && x + cw < WORLD_W) setBlock(x + cw, cy, T.AIR);
                    }
                }
                // Place orb/heart/fragment at chasm bottom
                if (zone.type === 'corruption') setBlock(x, sy + chasmDepth - 2, T.SHADOW_ORB);
                else if (zone.type === 'crimson') setBlock(x, sy + chasmDepth - 2, T.CRIMSON_HEART);
                else if (zone.type === 'void') setBlock(x, sy + chasmDepth - 2, T.STELLAR_FRAGMENT);
            }
            // Scatter ore underground
            if (Math.random() < 0.03) {
                const oy = sy + 20 + Math.floor(Math.random() * 60);
                const oreType = zone.type === 'corruption' ? T.DEMONITE_ORE :
                    zone.type === 'crimson' ? T.CRIMTANE_ORE : T.VOIDITE_ORE;
                for (let ox = -1; ox <= 1; ox++) {
                    for (let oyo = -1; oyo <= 1; oyo++) {
                        if (Math.random() < 0.7 && isSolid(x + ox, oy + oyo)) setBlock(x + ox, oy + oyo, oreType);
                    }
                }
            }
            // Add vines/thorns on surface
            if (Math.random() < 0.15 && getBlock(x, sy - 1) === T.AIR) {
                if (zone.type === 'corruption') setBlock(x, sy - 1, T.CORRUPT_THORNS);
                else if (zone.type === 'crimson') setBlock(x, sy - 1, T.CRIMSON_THORNS);
                else if (zone.type === 'void') {
                    if (Math.random() < 0.3) setBlock(x, sy - 1, T.ANTI_GRAVITY_CRYSTAL);
                }
            }
        }
        // Register evil spread sources at zone edges and center
        evilSources.push({ x: zone.start + Math.floor(evilStripWidth / 2), y: heights[zone.start + Math.floor(evilStripWidth / 2)] + 10, type: zone.type });
        evilSources.push({ x: zone.start, y: heights[zone.start] + 20, type: zone.type });
        evilSources.push({ x: zone.end - 1, y: heights[Math.min(zone.end - 1, WORLD_W - 1)] + 20, type: zone.type });
    }

    // Void biome special: create floating terrain chunks above surface
    if (worldEvils.includes('void')) {
        const voidZone = evilZones.find(z => z.type === 'void');
        if (voidZone) {
            for (let fi = 0; fi < 4; fi++) {
                const fx = voidZone.start + Math.floor(Math.random() * evilStripWidth);
                const fy = heights[Math.min(fx, WORLD_W - 1)] - 15 - Math.floor(Math.random() * 20);
                const fw = 5 + Math.floor(Math.random() * 8);
                const fh = 2 + Math.floor(Math.random() * 3);
                for (let bx = 0; bx < fw; bx++) {
                    for (let by = 0; by < fh; by++) {
                        if (fx + bx >= 0 && fx + bx < WORLD_W && fy + by >= 0 && fy + by < WORLD_H) {
                            setBlock(fx + bx, fy + by, T.VOID_STONE);
                        }
                    }
                }
                // Place dark nebula above floating chunks
                if (fy - 1 >= 0) {
                    for (let bx = 0; bx < fw; bx++) {
                        if (fx + bx >= 0 && fx + bx < WORLD_W) setBlock(fx + bx, fy - 1, T.DARK_NEBULA);
                    }
                }
            }
        }
    }

    // ===== SURFACE BIOME STRIP GENERATION =====
    // Desert biome: 25%-38% of world
    const desertStart = Math.floor(WORLD_W * 0.25);
    const desertEnd = Math.floor(WORLD_W * 0.38);
    for (let x = desertStart; x < desertEnd && x < WORLD_W; x++) {
        const sy = heights[x];
        // Convert surface to sand/sandstone
        for (let y = Math.max(0, sy - 2); y < Math.min(WORLD_H, sy + 80); y++) {
            const b = getBlock(x, y);
            if (y < sy + 8) {
                if (b === T.GRASS || b === T.DIRT) setBlock(x, y, T.SAND);
            } else if (y < sy + 25) {
                if (b === T.DIRT || b === T.STONE) setBlock(x, y, T.HARDENED_SAND);
            } else {
                if (b === T.STONE) setBlock(x, y, T.SANDSTONE);
            }
        }
        // Cacti (10% chance per column)
        if (Math.random() < 0.10 && getBlock(x, sy - 1) === T.AIR) {
            const cactH = 2 + Math.floor(Math.random() * 3);
            for (let cy = 0; cy < cactH; cy++) {
                if (sy - 1 - cy >= 0) setBlock(x, sy - 1 - cy, T.CACTUS);
            }
        }
        // Palm trees (5% chance)
        if (Math.random() < 0.05 && getBlock(x, sy - 1) === T.AIR) {
            const palmH = 4 + Math.floor(Math.random() * 3);
            for (let py = 0; py < palmH; py++) {
                if (sy - 1 - py >= 0) setBlock(x, sy - 1 - py, T.PALM_WOOD);
            }
            // Palm leaves at top
            for (let lx = -2; lx <= 2; lx++) {
                if (x + lx >= 0 && x + lx < WORLD_W && sy - palmH - 1 >= 0) {
                    setBlock(x + lx, sy - palmH - 1, T.LEAVES);
                }
            }
        }
        // Desert fossils underground (2% chance)
        if (Math.random() < 0.02) {
            const fy = sy + 15 + Math.floor(Math.random() * 40);
            for (let fx = -1; fx <= 1; fx++) {
                for (let fyo = -1; fyo <= 1; fyo++) {
                    if (Math.random() < 0.6 && isSolid(x + fx, fy + fyo)) setBlock(x + fx, fy + fyo, T.DESERT_FOSSIL);
                }
            }
        }
    }
    // Desert pyramid (one per desert biome)
    const pyramidX = desertStart + Math.floor((desertEnd - desertStart) / 2);
    const pyramidBase = heights[Math.min(pyramidX, WORLD_W - 1)];
    const pyramidW = 12;
    for (let layer = 0; layer < 8; layer++) {
        for (let px = -pyramidW + layer; px <= pyramidW - layer; px++) {
            const ax = pyramidX + px;
            if (ax >= 0 && ax < WORLD_W && pyramidBase - 1 - layer >= 0) {
                setBlock(ax, pyramidBase - 1 - layer, T.SANDSTONE);
            }
        }
    }
    // Hollow interior with chest
    for (let iy = 0; iy < 4; iy++) {
        for (let ix = -3; ix <= 3; ix++) {
            const ax = pyramidX + ix;
            if (ax >= 0 && ax < WORLD_W) setBlock(ax, pyramidBase - 2 - iy, T.AIR);
        }
    }
    setBlock(pyramidX, pyramidBase - 2, T.CHEST);

    // Snow biome: 40%-55% of world
    const snowStart = Math.floor(WORLD_W * 0.40);
    const snowEnd = Math.floor(WORLD_W * 0.55);
    for (let x = snowStart; x < snowEnd && x < WORLD_W; x++) {
        const sy = heights[x];
        for (let y = Math.max(0, sy - 3); y < Math.min(WORLD_H, sy + 80); y++) {
            const b = getBlock(x, y);
            if (y < sy + 4) {
                if (b === T.GRASS || b === T.DIRT) setBlock(x, y, T.SNOW);
            } else if (y < sy + 20) {
                if (b === T.DIRT) setBlock(x, y, T.SLUSH);
                else if (b === T.STONE) setBlock(x, y, T.ICE);
            } else {
                if (b === T.STONE) setBlock(x, y, T.FROZEN_STONE);
            }
        }
        // Boreal trees (8% chance)
        if (Math.random() < 0.08 && getBlock(x, sy - 1) === T.AIR) {
            const treeH = 4 + Math.floor(Math.random() * 4);
            for (let ty = 0; ty < treeH; ty++) {
                if (sy - 1 - ty >= 0) setBlock(x, sy - 1 - ty, T.BOREAL_WOOD);
            }
            // Snow-covered leaves
            for (let lx = -2; lx <= 2; lx++) {
                for (let ly = 0; ly < 3; ly++) {
                    if (Math.abs(lx) + ly < 4 && x + lx >= 0 && x + lx < WORLD_W && sy - treeH - ly >= 0) {
                        setBlock(x + lx, sy - treeH - ly, T.SNOW);
                    }
                }
            }
        }
        // Frozen lakes (replace surface with ice if flat)
        if (x > snowStart + 5 && x < snowEnd - 5 && Math.random() < 0.01) {
            const lakeW = 4 + Math.floor(Math.random() * 6);
            for (let lx = 0; lx < lakeW && x + lx < WORLD_W; lx++) {
                setBlock(x + lx, heights[Math.min(x + lx, WORLD_W - 1)], T.ICE);
                setBlock(x + lx, heights[Math.min(x + lx, WORLD_W - 1)] + 1, T.WATER);
                setBlock(x + lx, heights[Math.min(x + lx, WORLD_W - 1)] + 2, T.WATER);
            }
        }
        // Thin ice underground (trap)
        if (Math.random() < 0.03) {
            const tiy = sy + 10 + Math.floor(Math.random() * 30);
            for (let tix = -1; tix <= 1; tix++) {
                if (x + tix >= 0 && x + tix < WORLD_W && getBlock(x + tix, tiy) !== T.AIR) {
                    setBlock(x + tix, tiy, T.THIN_ICE);
                }
            }
        }
    }
    // Igloo structure (one per snow biome)
    const iglooX = snowStart + Math.floor((snowEnd - snowStart) / 2) + Math.floor(Math.random() * 10);
    const iglooBase = heights[Math.min(iglooX, WORLD_W - 1)];
    for (let iy = 0; iy < 4; iy++) {
        for (let ix = -3; ix <= 3; ix++) {
            const ax = iglooX + ix;
            if (ax >= 0 && ax < WORLD_W && iglooBase - iy >= 0) {
                if (iy === 0 || iy === 3 || Math.abs(ix) === 3) setBlock(ax, iglooBase - iy, T.SNOW);
                else setBlock(ax, iglooBase - iy, T.AIR);
            }
        }
    }
    setBlock(iglooX, iglooBase - 1, T.CHEST);
    setBlock(iglooX + 1, iglooBase - 1, T.WORKBENCH);

    // Jungle biome: 58%-73% of world
    const jungleStart = Math.floor(WORLD_W * 0.58);
    const jungleEnd = Math.floor(WORLD_W * 0.73);
    for (let x = jungleStart; x < jungleEnd && x < WORLD_W; x++) {
        const sy = heights[x];
        for (let y = Math.max(0, sy - 2); y < Math.min(WORLD_H, sy + 80); y++) {
            const b = getBlock(x, y);
            if (y === sy) {
                if (b === T.GRASS || b === T.DIRT) setBlock(x, y, T.JUNGLE_GRASS);
            } else if (y < sy + 10) {
                if (b === T.DIRT) setBlock(x, y, T.MUD);
            } else {
                if (b === T.DIRT || b === T.STONE) setBlock(x, y, T.MUD);
            }
        }
        // Giant mahogany trees (6% chance)
        if (Math.random() < 0.06 && getBlock(x, sy - 1) === T.AIR) {
            const treeH = 6 + Math.floor(Math.random() * 5);
            for (let ty = 0; ty < treeH; ty++) {
                if (sy - 1 - ty >= 0) setBlock(x, sy - 1 - ty, T.MAHOGANY_WOOD);
            }
            // Dense leaf canopy
            for (let lx = -3; lx <= 3; lx++) {
                for (let ly = 0; ly < 4; ly++) {
                    if (Math.abs(lx) + ly < 5 && x + lx >= 0 && x + lx < WORLD_W && sy - treeH - ly >= 0) {
                        setBlock(x + lx, sy - treeH - ly, T.LEAVES);
                    }
                }
            }
        }
        // Jungle vines (15% chance)
        if (Math.random() < 0.15 && getBlock(x, sy - 1) === T.AIR) {
            const vineL = 2 + Math.floor(Math.random() * 4);
            for (let vy = 0; vy < vineL; vy++) {
                if (sy - 1 - vy >= 0) setBlock(x, sy - 1 - vy, T.JUNGLE_VINE);
            }
        }
        // Beehive clusters (1% chance)
        if (Math.random() < 0.01) {
            const bhy = sy + 5 + Math.floor(Math.random() * 15);
            for (let bx = -1; bx <= 1; bx++) {
                for (let by = -1; by <= 1; by++) {
                    if (x + bx >= 0 && x + bx < WORLD_W && isSolid(x + bx, bhy + by)) {
                        setBlock(x + bx, bhy + by, T.BEEHIVE);
                    }
                }
            }
            // Honey inside
            setBlock(x, bhy, T.HONEY_BLOCK);
        }
        // Life fruit deep underground (rare, 0.5%)
        if (Math.random() < 0.005) {
            const lfy = sy + 30 + Math.floor(Math.random() * 40);
            if (isSolid(x, lfy)) setBlock(x, lfy, T.LIFE_FRUIT);
        }
    }

    // ===== SPACE LAYER GENERATION (above sky islands, Y < 15) =====
    // Asteroid platforms
    const asteroidCount = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < asteroidCount; i++) {
        const ax = 50 + Math.floor(Math.random() * (WORLD_W - 100));
        const ay = 2 + Math.floor(Math.random() * 10);
        const aw = 4 + Math.floor(Math.random() * 8);
        const ah = 3 + Math.floor(Math.random() * 4);
        for (let bx = 0; bx < aw; bx++) {
            for (let by = 0; by < ah; by++) {
                if (ax + bx >= 0 && ax + bx < WORLD_W && ay + by >= 0 && ay + by < WORLD_H) {
                    const dist = Math.abs(bx - aw / 2) / (aw / 2) + Math.abs(by - ah / 2) / (ah / 2);
                    if (dist < 1.2) {
                        // Core has ore, outer shell is asteroid rock
                        if (dist < 0.5 && Math.random() < 0.3) {
                            setBlock(ax + bx, ay + by, Math.random() < 0.5 ? T.METEORITE : T.LUMINITE);
                        } else {
                            setBlock(ax + bx, ay + by, T.ASTEROID_ROCK);
                        }
                    }
                }
            }
        }
    }

    // Space stations (2-3 floating structures)
    const stationCount = 2 + Math.floor(Math.random() * 2);
    for (let s = 0; s < stationCount; s++) {
        const sx = 80 + Math.floor(Math.random() * (WORLD_W - 160));
        const sy = 3 + Math.floor(Math.random() * 7);
        const sw = 8 + Math.floor(Math.random() * 6);
        const sh = 4 + Math.floor(Math.random() * 3);
        // Build walls and floor
        for (let bx = 0; bx < sw; bx++) {
            for (let by = 0; by < sh; by++) {
                if (sx + bx >= 0 && sx + bx < WORLD_W && sy + by >= 0 && sy + by < WORLD_H) {
                    if (by === 0 || by === sh - 1 || bx === 0 || bx === sw - 1) {
                        setBlock(sx + bx, sy + by, T.SPACE_GLASS);
                    } else {
                        setBlock(sx + bx, sy + by, T.AIR);
                    }
                }
            }
        }
        // Floor
        for (let bx = 1; bx < sw - 1; bx++) {
            if (sx + bx >= 0 && sx + bx < WORLD_W && sy + sh - 1 < WORLD_H) {
                setBlock(sx + bx, sy + sh - 1, T.ASTEROID_ROCK);
            }
        }
        // Chest inside
        if (sx + Math.floor(sw / 2) < WORLD_W) setBlock(sx + Math.floor(sw / 2), sy + sh - 2, T.CHEST);
    }

    // Meteor crash sites on surface (2-3)
    const meteorCount = 2 + Math.floor(Math.random() * 2);
    for (let m = 0; m < meteorCount; m++) {
        const mx = 60 + Math.floor(Math.random() * (WORLD_W - 120));
        const my = heights[Math.min(mx, WORLD_W - 1)];
        const craterR = 3 + Math.floor(Math.random() * 3);
        for (let cx = -craterR; cx <= craterR; cx++) {
            for (let cy = -craterR; cy <= craterR; cy++) {
                const d = Math.sqrt(cx * cx + cy * cy);
                if (d <= craterR && mx + cx >= 0 && mx + cx < WORLD_W && my + cy >= 0 && my + cy < WORLD_H) {
                    if (d < craterR * 0.6) {
                        setBlock(mx + cx, my + cy, T.METEORITE);
                    } else {
                        setBlock(mx + cx, my + cy, T.METEOR_CRATER);
                    }
                }
            }
        }
        meteorCrashSites.push({ x: mx, y: my });
    }

    // Launch pad near spawn
    const spawnX = Math.floor(WORLD_W / 2);
    const spawnY = heights[spawnX];
    for (let lx = -2; lx <= 2; lx++) {
        if (spawnX + lx + 20 >= 0 && spawnX + lx + 20 < WORLD_W) {
            setBlock(spawnX + lx + 20, spawnY, T.LAUNCH_PAD);
        }
    }

    // ===== PHASE 5: DUNGEON GENERATION =====
    // Dungeon at far right side of world
    const dungeonX = WORLD_W - 60;
    const dungeonY = CAVE_Y + 5;
    const dungeonW = 30, dungeonH = 50;
    for (let x = dungeonX; x < dungeonX + dungeonW && x < WORLD_W; x++) {
        for (let y = dungeonY; y < dungeonY + dungeonH && y < WORLD_H; y++) {
            setBlock(x, y, T.DUNGEON_BRICK);
        }
    }
    // Carve rooms in dungeon
    for (let r = 0; r < 8; r++) {
        const rx = dungeonX + 3 + Math.floor(Math.random() * (dungeonW - 10));
        const ry = dungeonY + 3 + Math.floor(Math.random() * (dungeonH - 12));
        const rw = 5 + Math.floor(Math.random() * 6);
        const rh = 4 + Math.floor(Math.random() * 5);
        for (let x = rx; x < rx + rw; x++) {
            for (let y = ry; y < ry + rh; y++) {
                if (x > dungeonX + 1 && x < dungeonX + dungeonW - 2 && y > dungeonY + 1 && y < dungeonY + dungeonH - 2) {
                    setBlock(x, y, T.AIR);
                }
            }
        }
        // Spike traps at bottom of some rooms
        if (Math.random() < 0.5) {
            for (let x = rx; x < rx + rw; x++) {
                if (x > dungeonX + 1 && x < dungeonX + dungeonW - 2) setBlock(x, ry + rh - 1, T.SPIKE_TRAP);
            }
        }
        // Bone piles
        if (Math.random() < 0.3) setBlock(rx + Math.floor(rw / 2), ry + rh - 2, T.BONE_BLOCK);
        // Dungeon chest (rare)
        if (Math.random() < 0.35) setBlock(rx + 1, ry + rh - 2, T.DUNGEON_CHEST);
    }
    // Corridors connecting rooms
    for (let c = 0; c < 5; c++) {
        const cx = dungeonX + 3 + Math.floor(Math.random() * (dungeonW - 6));
        for (let y = dungeonY + 2; y < dungeonY + dungeonH - 2; y++) {
            setBlock(cx, y, T.AIR);
            setBlock(cx + 1, y, T.AIR);
        }
    }
    // Cracked bricks on outer walls
    for (let x = dungeonX; x < dungeonX + dungeonW; x++) {
        for (let y = dungeonY; y < dungeonY + dungeonH; y++) {
            if (getBlock(x, y) === T.DUNGEON_BRICK && Math.random() < 0.1) setBlock(x, y, T.CRACKED_BRICK);
        }
    }

    // ===== PHASE 5: JUNGLE TEMPLE GENERATION =====
    // Deep in jungle underground
    const templeJungleX = Math.floor(WORLD_W * 0.58);
    const templeX = templeJungleX + 10;
    const templeY = CAVE_Y + 30;
    const templeW = 20, templeH = 25;
    for (let x = templeX; x < templeX + templeW && x < WORLD_W; x++) {
        for (let y = templeY; y < templeY + templeH && y < WORLD_H; y++) {
            setBlock(x, y, T.LIHZAHRD_BRICK);
        }
    }
    // Carve temple rooms
    for (let r = 0; r < 4; r++) {
        const rx = templeX + 2 + Math.floor(Math.random() * (templeW - 8));
        const ry = templeY + 2 + Math.floor(Math.random() * (templeH - 10));
        const rw = 4 + Math.floor(Math.random() * 5);
        const rh = 4 + Math.floor(Math.random() * 4);
        for (let x = rx; x < rx + rw; x++) {
            for (let y = ry; y < ry + rh; y++) {
                if (x > templeX + 1 && x < templeX + templeW - 2) setBlock(x, y, T.AIR);
            }
        }
        // Wooden spikes
        if (Math.random() < 0.4) {
            for (let x = rx; x < rx + rw; x++) setBlock(x, ry + rh - 1, T.WOODEN_SPIKE);
        }
    }
    // Temple altar in center room
    setBlock(templeX + Math.floor(templeW / 2), templeY + Math.floor(templeH / 2), T.LIHZAHRD_ALTAR);
    // Temple door at entrance
    setBlock(templeX, templeY + Math.floor(templeH / 2), T.TEMPLE_DOOR);
    setBlock(templeX, templeY + Math.floor(templeH / 2) + 1, T.TEMPLE_DOOR);
    // Plantera bulbs in jungle underground (spawn after Hardmode)
    if (typeof hardmodeActive !== 'undefined' && hardmodeActive) {
        for (let i = 0; i < 5; i++) {
            const bx = templeJungleX + Math.floor(Math.random() * 60);
            const by = CAVE_Y + 5 + Math.floor(Math.random() * 30);
            if (getBlock(bx, by) === T.AIR) setBlock(bx, by, T.PLANTERA_BULB);
        }
    }

    // Phase 7: Herb world gen — scatter herbs in matching biomes
    const herbMap = [
        [T.DAYBLOOM, T.GRASS, 0, CAVE_Y],
        [T.MOONGLOW, T.JUNGLE_GRASS, CAVE_Y, MUSH_Y],
        [T.WATERLEAF, T.SAND, 0, CAVE_Y],
        [T.BLINKROOT, T.STONE, CAVE_Y, MUSH_Y],
        [T.DEATHWEED, T.CORRUPTION, 0, MUSH_Y],
        [T.FIREBLOSSOM, T.ASH, MUSH_Y, WORLD_H],
        [T.SHIVERTHORN, T.SNOW, 0, CAVE_Y],
    ];
    for (const [herb, soil, yMin, yMax] of herbMap) {
        for (let i = 0; i < 6; i++) {
            const hx = Math.floor(Math.random() * WORLD_W);
            for (let hy = yMin; hy < Math.min(yMax, WORLD_H - 1); hy++) {
                if (getBlock(hx, hy) === T.AIR && getBlock(hx, hy + 1) === soil) {
                    setBlock(hx, hy, herb);
                    break;
                }
            }
        }
    }

    return heights;
}

// ===== GRAVITY & OXYGEN UPDATE SYSTEM =====
function updateGravity() {
    const biome = typeof getPlayerBiome === 'function' ? getPlayerBiome() : 'surface';
    let gravMod = GRAVITY_ZONES[biome] || 1.0;

    // Void biome gravity anomalies
    if (biome === 'void_zone' || (typeof nearVoidTiles === 'function' && nearVoidTiles())) {
        gravMod = 0.3 + Math.sin(Date.now() * 0.001) * 0.3; // fluctuating 0.0-0.6
    }

    // Accessory overrides
    if (typeof player !== 'undefined' && player.equipment) {
        for (const slot in player.equipment) {
            const item = ITEMS[player.equipment[slot]];
            if (item && item.effect === 'space_flight') gravMod = 0.1; // Gravity Globe
            if (item && item.effect === 'low_gravity' && gravMod > 0.5) gravMod = 0.5;
        }
    }

    return gravMod;
}

function updateOxygen() {
    const biome = typeof getPlayerBiome === 'function' ? getPlayerBiome() : 'surface';
    if (biome !== 'space') {
        playerOxygen = Math.min(100, playerOxygen + 2); // Recover outside space
        return;
    }

    // Check for space helmet or oxygen tank
    let hasOxygen = false;
    if (typeof player !== 'undefined' && player.equipment) {
        for (const slot in player.equipment) {
            const item = ITEMS[player.equipment[slot]];
            if (item && (item.special === 'oxygen' || item.effect === 'extended_oxygen')) hasOxygen = true;
        }
        // Check armor set bonus
        if (typeof checkArmorSetBonus === 'function') {
            const setBonus = checkArmorSetBonus();
            if (setBonus && setBonus.oxygenBoost) hasOxygen = true;
        }
    }

    if (hasOxygen) {
        playerOxygen = Math.min(100, playerOxygen + 1);
    } else {
        playerOxygen = Math.max(0, playerOxygen - 0.5);
        // Suffocation damage at 0 oxygen
        if (playerOxygen <= 0 && typeof player !== 'undefined') {
            player.hp = Math.max(0, player.hp - 1);
        }
    }
}

// Meteor event — random meteor crashes during gameplay
function updateMeteorEvent() {
    meteorEventTimer++;
    if (meteorEventTimer < 18000) return; // ~5 minutes at 60fps
    meteorEventTimer = 0;

    if (Math.random() < 0.15) { // 15% chance per cycle
        // Crash a meteor somewhere
        const mx = 50 + Math.floor(Math.random() * (WORLD_W - 100));
        const my = typeof heights !== 'undefined' && heights[mx] ? heights[mx] : 30;
        const radius = 2 + Math.floor(Math.random() * 2);
        for (let cx = -radius; cx <= radius; cx++) {
            for (let cy = -radius; cy <= radius; cy++) {
                const d = Math.sqrt(cx * cx + cy * cy);
                if (d <= radius && mx + cx >= 0 && mx + cx < WORLD_W && my + cy >= 0 && my + cy < WORLD_H) {
                    setBlock(mx + cx, my + cy, d < radius * 0.5 ? T.METEORITE : T.METEOR_CRATER);
                }
            }
        }
        meteorCrashSites.push({ x: mx, y: my });
    }
}

// ===== LIGHTING =====
function updateLighting(camX, camY, viewW, viewH) {
    const startX = Math.max(0, Math.floor(camX / TILE) - 2);
    const endX = Math.min(WORLD_W, Math.ceil((camX + viewW) / TILE) + 2);
    const startY = Math.max(0, Math.floor(camY / TILE) - 2);
    const endY = Math.min(WORLD_H, Math.ceil((camY + viewH) / TILE) + 2);
    for (let x = startX; x < endX; x++) for (let y = startY; y < endY; y++) {
        let light = 0;
        if (y < SURFACE_Y + 5) light = Math.max(0, 1 - (y - SURFACE_Y) * 0.08);
        const cb = getBlock(x, y);
        if (cb === T.TORCH || cb === T.CHANDELIER) light = 1;
        if (cb === T.LAVA) light = 0.8;
        if (cb === T.CRYSTAL || cb === T.GLOW_SHROOM) light = 0.6;
        if (cb === T.HONEY_BLOCK) light = 0.3;
        // Phase 2 light sources
        if (cb === T.ACID) light = Math.max(light, 0.4);
        if (cb === T.BLOOD) light = Math.max(light, 0.25);
        if (cb === T.CORRUPTION) light = Math.max(light, 0.15);
        // Spread from nearby light sources
        for (let dx = -6; dx <= 6; dx++) for (let dy = -6; dy <= 6; dy++) {
            const nx = x + dx, ny = y + dy;
            const nb = getBlock(nx, ny);
            if (nb === T.TORCH || nb === T.LAVA || nb === T.CRYSTAL || nb === T.GLOW_SHROOM || nb === T.CHANDELIER || nb === T.ACID || nb === T.BLOOD) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                const r = (nb === T.TORCH || nb === T.CHANDELIER) ? 6 : nb === T.LAVA ? 5 : nb === T.GLOW_SHROOM ? 4 : nb === T.ACID ? 3 : nb === T.BLOOD ? 2 : 4;
                if (dist < r) light = Math.max(light, (1 - dist / r) * (nb === T.LAVA ? 0.7 : nb === T.GLOW_SHROOM ? 0.6 : nb === T.ACID ? 0.4 : nb === T.BLOOD ? 0.25 : 0.9));
            }
        }
        lightMap[y * WORLD_W + x] = Math.min(1, Math.max(0.03, light));
    }
}
function getLight(x, y) { return (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) ? 0.5 : lightMap[y * WORLD_W + x]; }

// ===== PARTICLE SYSTEM =====
const particles = [];
function spawnParticles(x, y, color, count, spread) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y, vx: (Math.random() - 0.5) * spread, vy: (Math.random() - 0.5) * spread - 1,
            life: 30 + Math.random() * 20, maxLife: 50, color, size: 2 + Math.random() * 2
        });
    }
}
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

// ===== ENEMY DEFINITIONS =====
const ENEMY_TYPES = {
    zombie: { name: 'Zombie', w: 14, h: 28, hp: 40, damage: 10, speed: 0.8, color: '#3A6B3A', drops: [[I_GEL, 1, 3]], xp: 5 },
    skeleton: { name: 'Skeleton', w: 12, h: 28, hp: 50, damage: 14, speed: 1, color: '#C0B090', drops: [[I_BONE_FRAG, 1, 2]], xp: 8 },
    spider: { name: 'Giant Spider', w: 20, h: 12, hp: 35, damage: 12, speed: 1.5, color: '#333333', drops: [[I_SPIDER_FANG, 1, 2]], xp: 6 },
    wraith: { name: 'Wraith', w: 16, h: 24, hp: 60, damage: 18, speed: 0.6, color: '#667799', drops: [[I_LENS, 1, 1]], xp: 12, flies: true },
    flesh_crawler: { name: 'Flesh Crawler', w: 18, h: 10, hp: 55, damage: 16, speed: 1.2, color: '#8B3A3A', drops: [[I_GEL, 2, 4]], xp: 10 },
    eye_bat: { name: 'Eye Bat', w: 16, h: 14, hp: 30, damage: 12, speed: 2, color: '#CC4444', drops: [[I_LENS, 1, 2]], xp: 7, flies: true },
    bone_serpent: { name: 'Bone Serpent', w: 24, h: 16, hp: 80, damage: 22, speed: 1, color: '#D4C9A8', drops: [[I_BONE_FRAG, 2, 4]], xp: 15 },
    shadow_demon: { name: 'Shadow Demon', w: 20, h: 28, hp: 120, damage: 30, speed: 1.3, color: '#330055', drops: [[I_SHADOW_BAR, 1, 2]], xp: 25 },
    hell_knight: { name: 'Hell Knight', w: 18, h: 30, hp: 150, damage: 35, speed: 0.9, color: '#CC3300', drops: [[I_DEMON_HEART, 1, 1]], xp: 30 },
    blood_slime: { name: 'Blood Slime', w: 16, h: 14, hp: 25, damage: 8, speed: 0.5, color: '#880022', drops: [[I_GEL, 1, 3]], xp: 4 },
    // Phase 1 enemies
    phantom: { name: 'Phantom', w: 16, h: 26, hp: 45, damage: 15, speed: 1.8, color: '#8899BB', drops: [[I_LENS, 1, 2]], xp: 10, flies: true, transparent: true },
    banshee: { name: 'Banshee', w: 14, h: 26, hp: 55, damage: 20, speed: 1.4, color: '#AABBCC', drops: [[I_ICE_SHARD, 1, 2]], xp: 14, flies: true },
    mimic: { name: 'Mimic', w: 16, h: 16, hp: 100, damage: 25, speed: 2, color: '#AA8844', drops: [[I_GOLD_BAR, 2, 4]], xp: 20, disguise: true },
    ghoul: { name: 'Ghoul', w: 14, h: 28, hp: 65, damage: 18, speed: 1.1, color: '#556644', drops: [[I_GEL, 2, 4]], xp: 11 },
    rat_swarm: { name: 'Rat Swarm', w: 22, h: 8, hp: 20, damage: 6, speed: 2.5, color: '#665544', drops: [[I_GEL, 1, 2]], xp: 3 },
    possessed_armor: { name: 'Possessed Armor', w: 16, h: 30, hp: 140, damage: 28, speed: 0.7, color: '#7788AA', drops: [[I_IRON_BAR, 1, 3]], xp: 22 },
    blood_leech: { name: 'Blood Leech', w: 12, h: 8, hp: 30, damage: 10, speed: 1.6, color: '#660022', drops: [[I_GEL, 1, 2]], xp: 5, heals: true },
    fungal_zombie: { name: 'Fungal Zombie', w: 14, h: 28, hp: 50, damage: 14, speed: 0.7, color: '#557744', drops: [[I_MUSHROOM_SPORE, 1, 3]], xp: 9, spores: true },
    ice_wraith: { name: 'Ice Wraith', w: 16, h: 24, hp: 70, damage: 20, speed: 1.2, color: '#88CCFF', drops: [[I_ICE_SHARD, 1, 3]], xp: 15, flies: true, freezes: true },
    lava_elemental: { name: 'Lava Elemental', w: 20, h: 24, hp: 130, damage: 32, speed: 0.6, color: '#FF6600', drops: [[I_HELLFIRE_STEAK, 1, 1]], xp: 28, burns: true },
    bone_archer: { name: 'Bone Archer', w: 12, h: 28, hp: 45, damage: 16, speed: 0.9, color: '#C0B090', drops: [[I_BONE_FRAG, 1, 3], [I_ARROW, 3, 8]], xp: 12, shoots: true },
    shadow_assassin: { name: 'Shadow Assassin', w: 14, h: 26, hp: 60, damage: 35, speed: 2.2, color: '#220044', drops: [[I_SHADOW_BAR, 1, 2]], xp: 20, teleports: true },
    parasite_host: { name: 'Parasite Host', w: 18, h: 28, hp: 80, damage: 15, speed: 0.8, color: '#668844', drops: [[I_MUSHROOM_SPORE, 2, 4]], xp: 16, spawns: true },
    corpse_spider: { name: 'Corpse Spider', w: 18, h: 14, hp: 40, damage: 14, speed: 1.8, color: '#443322', drops: [[I_SPIDER_FANG, 1, 3]], xp: 8 },
    tentacle_beast: { name: 'Tentacle Beast', w: 24, h: 20, hp: 110, damage: 24, speed: 0.5, color: '#553355', drops: [[I_GEL, 3, 6]], xp: 18 },
    // Phase 2 event enemies
    goblin_warrior: { name: 'Goblin Warrior', w: 14, h: 24, hp: 60, damage: 16, speed: 1.4, color: '#446622', drops: [[I_IRON_BAR, 1, 2]], xp: 12 },
    goblin_archer: { name: 'Goblin Archer', w: 12, h: 24, hp: 40, damage: 12, speed: 1.0, color: '#558833', drops: [[I_ARROW, 5, 10]], xp: 10, shoots: true },
    goblin_mage: { name: 'Goblin Mage', w: 14, h: 26, hp: 50, damage: 22, speed: 0.8, color: '#336655', drops: [[I_MANA_POT, 1, 2]], xp: 15, shoots: true, flies: true },
    treasure_goblin: { name: 'Treasure Goblin', w: 12, h: 20, hp: 80, damage: 5, speed: 3.5, color: '#FFCC00', drops: [[I_GOLD_BAR, 5, 10], [I_CRIMSON_BAR, 2, 5]], xp: 50, flees: true },
    blood_zombie: { name: 'Blood Zombie', w: 16, h: 28, hp: 80, damage: 20, speed: 1.2, color: '#661122', drops: [[I_GEL, 2, 5]], xp: 12 },
    blood_phantom: { name: 'Blood Phantom', w: 18, h: 26, hp: 70, damage: 22, speed: 2.0, color: '#AA2244', drops: [[I_LENS, 2, 3]], xp: 16, flies: true },
    // Phase 3 sky/ocean enemies
    angel: { name: 'Fallen Angel', w: 18, h: 28, hp: 90, damage: 20, speed: 1.6, color: '#DDEEFF', drops: [[I_GOLD_BAR, 2, 4]], xp: 25, flies: true },
    harpy: { name: 'Harpy', w: 20, h: 22, hp: 60, damage: 15, speed: 2.5, color: '#BBAA88', drops: [[I_ARROW, 5, 10]], xp: 15, flies: true },
    sea_serpent: { name: 'Sea Serpent', w: 28, h: 12, hp: 100, damage: 18, speed: 1.8, color: '#2266AA', drops: [[I_GEL, 3, 6]], xp: 20, flies: true },
    jellyfish: { name: 'Ghost Jellyfish', w: 14, h: 18, hp: 35, damage: 12, speed: 0.8, color: '#88CCFF', drops: [[I_GEL, 1, 3]], xp: 8, flies: true, transparent: true },
    coral_golem: { name: 'Coral Golem', w: 22, h: 28, hp: 150, damage: 25, speed: 0.6, color: '#DD6688', drops: [[I_GOLD_BAR, 2, 3]], xp: 22 },
    // ===== WORLD EVIL ENEMIES =====
    // Corruption enemies
    eater_of_souls: { name: 'Eater of Souls', w: 18, h: 16, hp: 45, damage: 14, speed: 2.0, color: '#5533AA', drops: [[I_SHADOW_SCALE, 1, 2]], xp: 8, flies: true },
    corruptor: { name: 'Corruptor', w: 20, h: 16, hp: 70, damage: 18, speed: 1.2, color: '#442288', drops: [[I_SHADOW_SCALE, 1, 3]], xp: 14, flies: true, shoots: true },
    devourer: { name: 'Devourer', w: 24, h: 10, hp: 55, damage: 20, speed: 1.5, color: '#331166', drops: [[I_SHADOW_SCALE, 1, 2]], xp: 12 },
    world_feeder: { name: 'World Feeder', w: 16, h: 10, hp: 40, damage: 12, speed: 1.8, color: '#553399', drops: [[I_GEL, 2, 4]], xp: 7 },
    clinger: { name: 'Clinger', w: 14, h: 22, hp: 60, damage: 22, speed: 0.4, color: '#4422AA', drops: [[I_SHADOW_SCALE, 1, 2]], xp: 15 },
    // Crimson enemies
    face_monster: { name: 'Face Monster', w: 16, h: 28, hp: 50, damage: 15, speed: 1.3, color: '#8B2030', drops: [[I_TISSUE_SAMPLE, 1, 2]], xp: 9 },
    blood_crawler_evil: { name: 'Blood Crawler', w: 20, h: 10, hp: 40, damage: 12, speed: 1.8, color: '#992233', drops: [[I_TISSUE_SAMPLE, 1, 2]], xp: 7 },
    crimera: { name: 'Crimera', w: 16, h: 14, hp: 50, damage: 16, speed: 2.2, color: '#CC3344', drops: [[I_TISSUE_SAMPLE, 1, 2]], xp: 9, flies: true },
    herpling: { name: 'Herpling', w: 18, h: 16, hp: 65, damage: 20, speed: 1.6, color: '#AA2244', drops: [[I_TISSUE_SAMPLE, 1, 3]], xp: 12 },
    floaty_gross: { name: 'Floaty Gross', w: 22, h: 18, hp: 75, damage: 22, speed: 0.8, color: '#771133', drops: [[I_TISSUE_SAMPLE, 2, 3]], xp: 16, flies: true },
    // Void enemies
    star_phantom: { name: 'Star Phantom', w: 16, h: 26, hp: 55, damage: 18, speed: 2.0, color: '#9944FF', drops: [[I_VOID_ESSENCE, 1, 2]], xp: 11, flies: true, teleports: true },
    nebula_drifter: { name: 'Nebula Drifter', w: 20, h: 20, hp: 50, damage: 14, speed: 1.0, color: '#6622BB', drops: [[I_VOID_ESSENCE, 1, 2]], xp: 10, flies: true, shoots: true },
    cosmic_parasite: { name: 'Cosmic Parasite', w: 12, h: 10, hp: 30, damage: 10, speed: 2.5, color: '#8833DD', drops: [[I_VOID_ESSENCE, 1, 1]], xp: 6, heals: true },
    gravity_wraith: { name: 'Gravity Wraith', w: 18, h: 24, hp: 70, damage: 20, speed: 1.4, color: '#7711CC', drops: [[I_VOID_ESSENCE, 1, 3]], xp: 14, flies: true },
    void_walker: { name: 'Void Walker', w: 14, h: 28, hp: 80, damage: 25, speed: 1.6, color: '#5500AA', drops: [[I_VOID_ESSENCE, 2, 3]], xp: 18, teleports: true },
    // ===== SURFACE BIOME ENEMIES =====
    // Desert
    antlion: { name: 'Antlion', w: 18, h: 12, hp: 40, damage: 12, speed: 1.5, color: '#C9A020', drops: [[I_ANTLION_MANDIBLE, 1, 2]], xp: 7 },
    vulture: { name: 'Vulture', w: 16, h: 14, hp: 35, damage: 10, speed: 2.2, color: '#8B6914', drops: [[I_ANCIENT_CLOTH, 0, 1]], xp: 6, flies: true },
    tomb_crawler: { name: 'Tomb Crawler', w: 20, h: 10, hp: 55, damage: 16, speed: 1.8, color: '#A08040', drops: [[I_FOSSIL_SHARD, 1, 2]], xp: 10 },
    mummy: { name: 'Mummy', w: 14, h: 28, hp: 60, damage: 18, speed: 0.8, color: '#D4C090', drops: [[I_ANCIENT_CLOTH, 1, 2]], xp: 12 },
    sand_elemental: { name: 'Sand Elemental', w: 20, h: 24, hp: 90, damage: 22, speed: 1.0, color: '#E8C840', drops: [[I_FOSSIL_SHARD, 2, 3]], xp: 16, flies: true, shoots: true },
    // Snow/Ice
    ice_slime: { name: 'Ice Slime', w: 16, h: 14, hp: 30, damage: 8, speed: 1.2, color: '#88DDFF', drops: [[I_FROST_CORE, 0, 1]], xp: 5 },
    undead_viking: { name: 'Undead Viking', w: 14, h: 28, hp: 55, damage: 18, speed: 1.0, color: '#6688AA', drops: [[I_FROST_CORE, 1, 1]], xp: 10 },
    ice_tortoise: { name: 'Ice Tortoise', w: 22, h: 16, hp: 80, damage: 20, speed: 0.6, color: '#AADDEE', drops: [[I_FROST_CORE, 1, 2]], xp: 14 },
    ice_elemental: { name: 'Ice Elemental', w: 18, h: 22, hp: 70, damage: 16, speed: 1.4, color: '#66CCFF', drops: [[I_FROST_CORE, 1, 2]], xp: 12, flies: true, shoots: true },
    frost_archer: { name: 'Frost Archer', w: 14, h: 28, hp: 45, damage: 14, speed: 1.0, color: '#7799BB', drops: [[I_FROST_CORE, 0, 1]], xp: 8, shoots: true },
    // Jungle
    jungle_slime: { name: 'Jungle Slime', w: 16, h: 14, hp: 35, damage: 10, speed: 1.3, color: '#44AA22', drops: [[I_STINGER, 0, 1]], xp: 6 },
    hornet: { name: 'Hornet', w: 14, h: 12, hp: 40, damage: 14, speed: 2.5, color: '#DDAA33', drops: [[I_STINGER, 1, 2]], xp: 8, flies: true, shoots: true },
    man_eater: { name: 'Man Eater', w: 12, h: 30, hp: 50, damage: 20, speed: 0.0, color: '#22AA22', drops: [[I_VINE, 1, 2]], xp: 10 },
    angry_trapper: { name: 'Angry Trapper', w: 24, h: 18, hp: 75, damage: 24, speed: 1.6, color: '#338833', drops: [[I_VINE, 1, 2]], xp: 14 },
    jungle_creeper: { name: 'Jungle Creeper', w: 20, h: 10, hp: 45, damage: 16, speed: 2.0, color: '#226622', drops: [[I_JUNGLE_SPORES, 1, 2]], xp: 9 },
    // ===== SPACE BIOME ENEMIES =====
    meteor_head: { name: 'Meteor Head', w: 16, h: 16, hp: 50, damage: 15, speed: 3.0, color: '#AA4400', drops: [[I_METEOR_FRAGMENT, 1, 2]], xp: 8, flies: true, phaseThrough: true },
    space_worm: { name: 'Space Worm', w: 24, h: 12, hp: 80, damage: 22, speed: 2.0, color: '#888899', drops: [[I_ALIEN_TECH, 1, 2]], xp: 14, segments: 5 },
    alien_drone: { name: 'Alien Drone', w: 14, h: 14, hp: 45, damage: 12, speed: 2.5, color: '#33AACC', drops: [[I_ALIEN_TECH, 1, 1]], xp: 10, flies: true, shoots: true },
    star_jelly: { name: 'Star Jelly', w: 14, h: 14, hp: 25, damage: 30, speed: 1.5, color: '#FFEE44', drops: [[I_COSMIC_SHARD, 1, 2]], xp: 12, explodes: true },
    cosmic_horror: { name: 'Cosmic Horror', w: 28, h: 32, hp: 120, damage: 28, speed: 1.0, color: '#442266', drops: [[I_COSMIC_SHARD, 2, 3], [I_ALIEN_TECH, 1, 2]], xp: 22 },
    // ===== HARDMODE ENEMIES =====
    gastropod: { name: 'Gastropod', w: 16, h: 16, hp: 70, damage: 25, speed: 1.5, color: '#FF88CC', drops: [[I_CRYSTAL_SHARD_ITEM, 1, 2]], xp: 12, flies: true, shoots: true },
    pixie: { name: 'Pixie', w: 10, h: 10, hp: 30, damage: 18, speed: 2.5, color: '#FFDDAA', drops: [[I_CRYSTAL_SHARD_ITEM, 1, 3]], xp: 8, flies: true },
    unicorn: { name: 'Unicorn', w: 24, h: 20, hp: 90, damage: 30, speed: 3.2, color: '#EEDDFF', drops: [[I_HALLOWED_BAR, 1, 1]], xp: 15, charges: true },
    hm_wraith: { name: 'Wraith', w: 18, h: 22, hp: 55, damage: 35, speed: 2.0, color: '#333355', drops: [], xp: 14, flies: true, phaseThrough: true },
    chaos_elemental: { name: 'Chaos Elemental', w: 16, h: 26, hp: 80, damage: 28, speed: 1.8, color: '#FF55FF', drops: [[I_CRYSTAL_SHARD_ITEM, 2, 3]], xp: 16, teleports: true },
    paladin: { name: 'Paladin', w: 22, h: 32, hp: 180, damage: 40, speed: 1.2, color: '#DDDDFF', drops: [[I_HALLOWED_BAR, 2, 3]], xp: 30 },
    enchanted_sword: { name: 'Enchanted Sword', w: 8, h: 24, hp: 40, damage: 30, speed: 2.5, color: '#AADDFF', drops: [], xp: 10, flies: true },
    pirate: { name: 'Pirate', w: 14, h: 26, hp: 65, damage: 22, speed: 1.6, color: '#AA6633', drops: [[I_GOLD_BAR, 1, 3]], xp: 12, shoots: true },
    // ===== PHASE 5: DUNGEON ENEMIES =====
    cursed_skull: { name: 'Cursed Skull', w: 14, h: 14, hp: 60, damage: 30, speed: 2.5, color: '#5566AA', drops: [[I_ECTOPLASM, 1, 2]], xp: 15, flies: true, phaseThrough: true },
    dark_caster: { name: 'Dark Caster', w: 14, h: 26, hp: 50, damage: 22, speed: 1.2, color: '#334466', drops: [[I_WATER_BOLT, 0, 1]], xp: 12, shoots: true, teleports: true },
    necromancer: { name: 'Necromancer', w: 14, h: 28, hp: 85, damage: 28, speed: 1.0, color: '#443355', drops: [[I_ECTOPLASM, 2, 3]], xp: 20, shoots: true, summons: 'skeleton' },
    dungeon_slime: { name: 'Dungeon Slime', w: 20, h: 18, hp: 100, damage: 26, speed: 1.5, color: '#5577AA', drops: [[I_SHADOW_KEY, 0, 1]], xp: 18 },
    bone_lee: { name: 'Bone Lee', w: 14, h: 26, hp: 120, damage: 35, speed: 3.0, color: '#CCBBAA', drops: [[I_BONE_WELDER, 0, 1]], xp: 25, charges: true },
    // ===== PHASE 5: TEMPLE ENEMIES =====
    lihzahrd: { name: 'Lihzahrd', w: 16, h: 26, hp: 100, damage: 32, speed: 1.8, color: '#886633', drops: [[I_LIHZAHRD_POWER_CELL, 0, 1]], xp: 20 },
    flying_snake: { name: 'Flying Snake', w: 20, h: 12, hp: 75, damage: 35, speed: 2.8, color: '#77AA44', drops: [], xp: 18, flies: true },
    lihzahrd_priest: { name: 'Lihzahrd Priest', w: 14, h: 28, hp: 130, damage: 28, speed: 1.0, color: '#AA8844', drops: [[I_SOLAR_TABLET, 0, 1]], xp: 25, shoots: true, heals: true },
    // ===== POST-PLANTERA DUNGEON =====
    paladin_hm: { name: 'Dungeon Paladin', w: 22, h: 32, hp: 250, damage: 45, speed: 1.5, color: '#CCCCEE', drops: [[I_ECTOPLASM, 3, 5], [I_HALLOWED_BAR, 1, 2]], xp: 40, throwsHammer: true },
    diabolist: { name: 'Diabolist', w: 14, h: 28, hp: 100, damage: 50, speed: 1.0, color: '#AA3333', drops: [[I_ECTOPLASM, 2, 4]], xp: 30, shoots: true, fireProjectile: true },
    // ===== PHASE 6: PILLAR ENEMIES =====
    // Solar pillar
    selenian: { name: 'Selenian', w: 14, h: 26, hp: 120, damage: 40, speed: 2.5, color: '#FF6622', drops: [[I_SOLAR_FRAGMENT, 1, 2]], xp: 20, reflects: true },
    drakanian: { name: 'Drakanian', w: 16, h: 28, hp: 150, damage: 45, speed: 2.0, color: '#FF8844', drops: [[I_SOLAR_FRAGMENT, 1, 3]], xp: 25, charges: true },
    corite: { name: 'Corite', w: 12, h: 12, hp: 80, damage: 35, speed: 3.5, color: '#FF4400', drops: [[I_SOLAR_FRAGMENT, 1, 1]], xp: 15, flies: true },
    crawltipede: { name: 'Crawltipede', w: 18, h: 14, hp: 200, damage: 50, speed: 4.0, color: '#FFAA22', drops: [[I_SOLAR_FRAGMENT, 2, 3]], xp: 30, flies: true },
    // Vortex pillar
    storm_diver: { name: 'Storm Diver', w: 14, h: 26, hp: 100, damage: 38, speed: 2.2, color: '#22CCAA', drops: [[I_VORTEX_FRAGMENT, 1, 2]], xp: 20, shoots: true, flies: true },
    alien_queen: { name: 'Alien Queen', w: 16, h: 20, hp: 130, damage: 42, speed: 1.8, color: '#44DDBB', drops: [[I_VORTEX_FRAGMENT, 2, 3]], xp: 25, summons: 'alien_drone' },
    alien_larva: { name: 'Alien Larva', w: 10, h: 10, hp: 40, damage: 20, speed: 3.0, color: '#66EEDD', drops: [[I_VORTEX_FRAGMENT, 0, 1]], xp: 8 },
    vortexian: { name: 'Vortexian', w: 14, h: 14, hp: 90, damage: 35, speed: 2.8, color: '#33BBAA', drops: [[I_VORTEX_FRAGMENT, 1, 2]], xp: 18, flies: true, teleports: true },
    // Nebula pillar
    nebula_floater: { name: 'Nebula Floater', w: 16, h: 16, hp: 110, damage: 40, speed: 2.0, color: '#CC44FF', drops: [[I_NEBULA_FRAGMENT, 1, 2]], xp: 20, flies: true, shoots: true },
    brain_suckler: { name: 'Brain Suckler', w: 12, h: 12, hp: 70, damage: 30, speed: 3.0, color: '#DD66FF', drops: [[I_NEBULA_FRAGMENT, 1, 1]], xp: 12, flies: true },
    predictor: { name: 'Predictor', w: 14, h: 24, hp: 140, damage: 45, speed: 1.5, color: '#AA22DD', drops: [[I_NEBULA_FRAGMENT, 2, 3]], xp: 28, shoots: true, teleports: true },
    evolution_beast: { name: 'Evolution Beast', w: 18, h: 24, hp: 160, damage: 50, speed: 1.8, color: '#BB33EE', drops: [[I_NEBULA_FRAGMENT, 2, 3]], xp: 30 },
    // Stardust pillar
    star_cell: { name: 'Star Cell', w: 14, h: 14, hp: 80, damage: 30, speed: 2.5, color: '#4488FF', drops: [[I_STARDUST_FRAGMENT, 1, 2]], xp: 15, clones: true },
    flow_invader: { name: 'Flow Invader', w: 16, h: 12, hp: 100, damage: 35, speed: 2.0, color: '#6699FF', drops: [[I_STARDUST_FRAGMENT, 1, 2]], xp: 18, flies: true, shoots: true },
    twinkle_popper: { name: 'Twinkle Popper', w: 12, h: 14, hp: 60, damage: 25, speed: 2.8, color: '#88BBFF', drops: [[I_STARDUST_FRAGMENT, 1, 1]], xp: 12, explodes: true },
    milkyway_weaver: { name: 'Milkyway Weaver', w: 20, h: 14, hp: 180, damage: 45, speed: 3.5, color: '#5577DD', drops: [[I_STARDUST_FRAGMENT, 2, 4]], xp: 35, flies: true },
    // ===== EVENT ENEMIES =====
    // Blood Moon
    blood_zombie: { name: 'Blood Zombie', w: 14, h: 26, hp: 45, damage: 20, speed: 2.0, color: '#CC2222', drops: [[I_MOON_STONE, 0, 1]], xp: 8 },
    drippler: { name: 'Drippler', w: 12, h: 12, hp: 30, damage: 25, speed: 2.5, color: '#DD4444', drops: [], xp: 6, flies: true },
    // Solar Eclipse
    frankenstein: { name: 'Frankenstein', w: 16, h: 30, hp: 150, damage: 40, speed: 1.5, color: '#556644', drops: [[I_BROKEN_HERO_SWORD, 0, 1]], xp: 25 },
    swamp_thing: { name: 'Swamp Thing', w: 18, h: 28, hp: 130, damage: 35, speed: 1.2, color: '#446633', drops: [[I_NAIL_GUN, 0, 1]], xp: 22, shoots: true },
    mothron: { name: 'Mothron', w: 24, h: 22, hp: 200, damage: 50, speed: 2.5, color: '#887755', drops: [[I_BROKEN_HERO_SWORD, 0, 1], [I_DEATH_SICKLE, 0, 1]], xp: 35, flies: true },
    // Goblin Army
    goblin_warrior: { name: 'Goblin Warrior', w: 12, h: 22, hp: 40, damage: 18, speed: 2.0, color: '#44AA44', drops: [], xp: 6 },
    goblin_sorcerer: { name: 'Goblin Sorcerer', w: 12, h: 24, hp: 30, damage: 25, speed: 1.5, color: '#6633CC', drops: [], xp: 8, shoots: true, teleports: true },
    goblin_archer: { name: 'Goblin Archer', w: 12, h: 22, hp: 35, damage: 22, speed: 1.8, color: '#336622', drops: [], xp: 7, shoots: true },
    // Pirate Invasion
    pirate_captain: { name: 'Pirate Captain', w: 16, h: 28, hp: 120, damage: 35, speed: 1.5, color: '#886622', drops: [[I_PIRATE_MAP, 0, 1]], xp: 20, shoots: true },
    pirate_crossbower: { name: 'Pirate Crossbower', w: 14, h: 26, hp: 80, damage: 30, speed: 1.2, color: '#775533', drops: [[I_GOLD_BAR, 1, 3]], xp: 15, shoots: true },
    // Frost Moon
    present_mimic: { name: 'Present Mimic', w: 16, h: 16, hp: 100, damage: 35, speed: 2.5, color: '#DD2222', drops: [[I_CHRISTMAS_TREE_SWORD, 0, 1]], xp: 18 },
    ice_queen: { name: 'Ice Queen', w: 20, h: 28, hp: 250, damage: 50, speed: 2.0, color: '#88CCFF', drops: [[I_ELF_MELTER, 0, 1]], xp: 40, flies: true, shoots: true },
    elf_copter: { name: 'Elf Copter', w: 14, h: 14, hp: 60, damage: 28, speed: 3.0, color: '#33AA33', drops: [], xp: 10, flies: true, shoots: true },
};

// Boss definitions
const BOSS_TYPES = {
    eye_of_terror: {
        name: 'Eye of Terror', w: 64, h: 64, hp: 1500, damage: 25, speed: 2, color: '#CC2244',
        phases: 3, drops: [[I_CRIMSON_BAR, 5, 10], [I_LENS, 3, 5]], xp: 500
    },
    bone_colossus: {
        name: 'Bone Colossus', w: 48, h: 80, hp: 2500, damage: 35, speed: 0.8, color: '#C0B090',
        phases: 3, drops: [[I_BONE_FRAG, 10, 20], [I_GOLD_BAR, 3, 5]], xp: 800
    },
    demon_lord: {
        name: 'Demon Lord', w: 56, h: 72, hp: 4000, damage: 50, speed: 1.5, color: '#660033',
        phases: 4, drops: [[I_DEMON_HEART, 5, 8], [I_SHADOW_BAR, 5, 10]], xp: 1500
    },
    // Phase 1 bosses
    hive_queen: {
        name: 'The Hive Queen', w: 60, h: 50, hp: 2000, damage: 28, speed: 1.8, color: '#DDAA33',
        phases: 3, drops: [[I_ROYAL_JELLY, 3, 6], [I_HIVE_WAX, 5, 10]], xp: 700, flies: true
    },
    frost_lich: {
        name: 'Frost Lich', w: 40, h: 60, hp: 3000, damage: 40, speed: 1, color: '#66CCFF',
        phases: 3, drops: [[I_FROST_BAR, 5, 10], [I_ICE_SHARD, 8, 15]], xp: 1000
    },
    corruption: {
        name: 'The Corruption', w: 80, h: 80, hp: 5000, damage: 45, speed: 0.6, color: '#440033',
        phases: 4, drops: [[I_CORRUPT_HEART, 1, 1], [I_SHADOW_BAR, 8, 15], [I_DEMON_HEART, 5, 8]], xp: 2000
    },
    // ===== PHASE 5: NEW BOSSES =====
    ravager: {
        name: 'The Ravager', w: 52, h: 44, hp: 2200, damage: 30, speed: 2.5, color: '#CC4422',
        phases: 3, drops: [[I_RAVAGER_CLAW, 1, 1], [I_GUNPOWDER, 5, 10], [I_IRON_BAR, 8, 15]], xp: 650
    },
    hive_mind: {
        name: 'The Hive Mind', w: 56, h: 56, hp: 3200, damage: 32, speed: 1.2, color: '#CC44CC',
        phases: 3, drops: [[I_HIVEMIND_STAFF, 1, 1], [I_SOUL_FRAGMENT, 5, 8], [I_MUSHROOM_SPORE, 10, 20]], xp: 900, flies: true
    },
    abyssal_serpent: {
        name: 'Abyssal Serpent', w: 72, h: 24, hp: 3500, damage: 38, speed: 2.0, color: '#224466',
        phases: 3, drops: [[I_ABYSSAL_TRIDENT, 1, 1], [I_ABYSSAL_SCALE, 5, 10], [I_GOLD_BAR, 8, 12]], xp: 1100, flies: true
    },
    soul_devourer: {
        name: 'Soul Devourer', w: 48, h: 64, hp: 4000, damage: 42, speed: 1.6, color: '#6688FF',
        phases: 4, drops: [[I_SOUL_REAPER, 1, 1], [I_SOUL_FRAGMENT, 8, 15], [I_LENS, 5, 10]], xp: 1400, flies: true
    },
    plague_doctor: {
        name: 'The Plague Doctor', w: 40, h: 56, hp: 2800, damage: 28, speed: 1.3, color: '#557722',
        phases: 3, drops: [[I_PLAGUE_SCYTHE, 1, 1], [I_PLAGUE_ESSENCE, 5, 10], [I_GEL, 15, 25]], xp: 800
    },
    storm_colossus: {
        name: 'Storm Colossus', w: 64, h: 96, hp: 5500, damage: 55, speed: 0.7, color: '#33AABB',
        phases: 4, drops: [[I_STORM_BOW, 1, 1], [I_STORM_CHARGE, 5, 10], [I_TITAN_CORE, 3, 5]], xp: 1800
    },
    blood_titan: {
        name: 'Blood Moon Titan', w: 72, h: 88, hp: 6000, damage: 50, speed: 0.8, color: '#AA0022',
        phases: 4, drops: [[I_VOID_KATANA, 1, 1], [I_VOID_SHARD, 8, 15], [I_DEMON_HEART, 8, 12]], xp: 2200
    },
    architect: {
        name: 'The Architect', w: 44, h: 52, hp: 3800, damage: 35, speed: 1.0, color: '#BBAA77',
        phases: 3, drops: [[I_TITAN_FIST, 1, 1], [I_MECHANISM, 8, 15], [I_TITAN_CORE, 3, 6]], xp: 1300
    },
    // ===== PHASE B: SURFACE BOSSES =====
    treant_king: {
        name: 'Treant King', w: 56, h: 72, hp: 3000, damage: 28, speed: 0.8, color: '#558833',
        phases: 3, drops: [[I_LIVING_WOOD_SWORD, 1, 1], [I_BARK_PLATE, 8, 15], [I_VINE, 5, 10]], xp: 600,
        tags: ['plant'], special: 'root_attack',
        phaseAI: {
            1: { attacks: ['root_swing', 'thorn_minions'], spawnRate: 180 },
            2: { attacks: ['root_erupt', 'speed_boost'], speedMult: 1.5 },
            3: { attacks: ['vine_cage', 'leaf_storm'], enraged: true }
        }
    },
    sand_pharaoh: {
        name: 'Sand Pharaoh', w: 48, h: 64, hp: 3500, damage: 35, speed: 1.2, color: '#DDAA44',
        phases: 3, drops: [[I_PHARAOH_KHOPESH, 1, 1], [I_ANKH_STAFF, 1, 1], [I_DESERT_CROWN, 1, 1], [I_DESERT_FOSSIL, 8, 15]], xp: 750,
        tags: ['undead'], special: 'sandstorm',
        phaseAI: {
            1: { attacks: ['sand_tornado', 'spiral_projectiles'] },
            2: { attacks: ['summon_scarabs', 'quicksand'], minionCount: 4 },
            3: { attacks: ['blind_sandstorm', 'teleport_slash'], teleport: true }
        }
    },
    leviathan: {
        name: 'The Leviathan', w: 80, h: 32, hp: 4000, damage: 40, speed: 1.8, color: '#2266AA',
        phases: 4, drops: [[I_ABYSSAL_LASH, 1, 1], [I_TIDAL_BOW, 1, 1], [I_LEVIATHAN_SCALE, 5, 10]], xp: 900, flies: true,
        tags: ['water'], special: 'water_required',
        phaseAI: {
            1: { attacks: ['water_bolt_barrage'], offscreen: true },
            2: { attacks: ['tail_slam', 'tidal_wave', 'summon_jellyfish'], minionCount: 3 },
            3: { attacks: ['dive_ram', 'water_spout'] },
            4: { attacks: ['spiral_bolts', 'minion_swarm'], enraged: true }
        }
    },
    // ===== PHASE B: UNDERGROUND BOSSES =====
    mycelium_titan: {
        name: 'Mycelium Titan', w: 60, h: 60, hp: 4200, damage: 38, speed: 0.9, color: '#AA8833',
        phases: 3, drops: [[I_MYCELIUM_STAFF, 1, 1], [I_FUNGAL_FLAIL, 1, 1], [I_SPORE_HELM, 1, 1], [I_SPORE_CHEST, 1, 1], [I_MUSHROOM_SPORE, 10, 20]], xp: 850,
        tags: ['plant', 'organic'], special: 'spore_cloud',
        phaseAI: {
            1: { attacks: ['spore_cloud', 'mushroom_cap_throw'] },
            2: { attacks: ['split_copies'], splitCount: 3, rejoins: true },
            3: { attacks: ['poison_fog', 'spore_barrage', 'ground_shockwave'], enraged: true }
        }
    },
    cryo_warden: {
        name: 'Cryo Warden', w: 44, h: 68, hp: 4800, damage: 44, speed: 1.0, color: '#88DDFF',
        phases: 4, drops: [[I_FROSTBITE_LANCE, 1, 1], [I_BLIZZARD_GUN, 1, 1], [I_CRYO_CORE, 3, 6], [I_FROST_BAR, 8, 15]], xp: 1100,
        tags: ['ice'], special: 'ice_beam',
        phaseAI: {
            1: { attacks: ['ice_beam_sweep', 'snowball_barrage'] },
            2: { attacks: ['ice_mirrors', 'slippery_floor'], mirrorCount: 3 },
            3: { attacks: ['freeze_walls', 'icicle_rain'], shrinkArena: true },
            4: { attacks: ['absolute_zero'], globalFreeze: true, then: 'crystal_explosion' }
        }
    },
    spider_empress: {
        name: 'Spider Empress', w: 52, h: 44, hp: 3200, damage: 32, speed: 1.6, color: '#553366',
        phases: 3, drops: [[I_WIDOWS_BITE, 1, 1], [I_WEB_SLINGER, 1, 1], [I_SPIDER_DAGGER, 1, 1], [I_SPIDER_FANG, 8, 15]], xp: 700,
        tags: ['organic'], special: 'ceiling_hang',
        phaseAI: {
            1: { attacks: ['drop_eggs', 'web_shot'], ceilingHang: true, minionRate: 120 },
            2: { attacks: ['descend_charge', 'web_bridges'] },
            3: { attacks: ['venom_mist', 'rapid_charge', 'spider_swarm'], enraged: true }
        }
    },
    magma_golem: {
        name: 'Magma Golem', w: 72, h: 80, hp: 6000, damage: 55, speed: 0.6, color: '#FF4400',
        phases: 4, drops: [[I_MAGMA_GREATSWORD, 1, 1], [I_ERUPTION_CANNON, 1, 1], [I_GOLEM_FIST, 1, 1], [I_INFERNAL_CORE, 3, 5]], xp: 1400,
        tags: ['fire', 'metal'], special: 'lava_trail',
        phaseAI: {
            1: { attacks: ['ground_pound', 'lava_geyser'], lavaTrail: true },
            2: { attacks: ['detach_arms'], orbitingProjectiles: true, coreTakesDoubleDmg: true },
            3: { attacks: ['grow_massive', 'lava_floor'], safePlatforms: 3 },
            4: { attacks: ['self_destruct_countdown'], timer: 1200, frenzyAttacks: true }
        }
    },
    // ===== PHASE B: ENDGAME BOSSES =====
    all_seeing_eye: {
        name: 'The All-Seeing Eye', w: 64, h: 64, hp: 7500, damage: 50, speed: 1.3, color: '#DDAA44',
        phases: 5, drops: [[I_ALL_SEEING_BOW, 1, 1], [I_EYE_OF_JUDGMENT, 1, 1], [I_THIRD_EYE_AMULET, 1, 1], [I_CELESTIAL_FRAGMENT, 5, 10]], xp: 2000, flies: true,
        tags: ['demon'], special: 'laser',
        phaseAI: {
            1: { attacks: ['rotating_laser'] },
            2: { attacks: ['spawn_mini_eyes'], minionCount: 4 },
            3: { attacks: ['fast_laser', 'void_portals'] },
            4: { attacks: ['true_sight'], invisible: true, flashInterval: 120 },
            5: { attacks: ['all_attacks', 'massive_void_portal'], enraged: true }
        }
    },
    void_emperor: {
        name: 'Void Emperor', w: 68, h: 76, hp: 10000, damage: 65, speed: 1.4, color: '#440088',
        phases: 5, drops: [[I_VOID_LANCE, 1, 1], [I_VOID_TENDRIL, 1, 1], [I_VOID_DRAGON_SCALE, 5, 8], [I_LUNAR_SHARD, 5, 10]], xp: 3000, flies: true,
        tags: ['void', 'demon'], special: 'transform',
        phaseAI: {
            1: { attacks: ['void_breath', 'claw_swipe'], form: 'dragon', flies: true },
            2: { attacks: ['teleport_slash', 'void_sword_combo'], form: 'humanoid' },
            3: { attacks: ['void_meteor_rain'], form: 'dragon', meteorCount: 8 },
            4: { attacks: ['dual_form'], simultaneousForms: true },
            5: { attacks: ['triple_beam'], form: 'true_dragon', heads: 3, enraged: true }
        }
    },
    moon_lord: {
        name: 'Moon Lord', w: 96, h: 96, hp: 15000, damage: 80, speed: 0.5, color: '#CCDDFF',
        phases: 6, drops: [[I_TERRARIAN_YOYO, 1, 1], [I_LAST_PRISM, 1, 1], [I_STAR_WRATH, 1, 1], [I_MEOWMERE, 1, 1], [I_LUNAR_WINGS, 1, 1], [I_LUNAR_SHARD, 10, 20], [I_CELESTIAL_FRAGMENT, 8, 15]], xp: 5000,
        tags: ['undead', 'demon', 'void'], special: 'multi_target', eyes: 3,
        phaseAI: {
            1: { attacks: ['left_eye_beam', 'right_eye_beam', 'forehead_eye_beam'], targets: 3 },
            2: { attacks: ['true_eye_spawn'], eyeDestroyed: 'left' },
            3: { attacks: ['true_eye_spawn'], eyeDestroyed: 'right' },
            4: { attacks: ['phantasmal_deathray'], coreExposed: true, mouthAttack: true },
            5: { attacks: ['all_true_eyes', 'phantasmal_spiral'], enraged: true },
            6: { attacks: ['escape_attempt', 'projectile_rain'], fleeing: true }
        }
    },
    // ===== WORLD EVIL BOSSES =====
    eater_of_worlds: {
        name: 'Eater of Worlds', w: 32, h: 32, hp: 2000, damage: 22, speed: 1.6, color: '#5533AA',
        phases: 3, drops: [[I_SHADOW_SCALE, 8, 15], [I_DEMONITE_BAR, 5, 10]], xp: 600,
        tags: ['organic'], special: 'worm',
        phaseAI: {
            1: { attacks: ['burrow_charge', 'segment_split'], segments: 20 },
            2: { attacks: ['spit_venom', 'faster_burrow'], splitOnDamage: true },
            3: { attacks: ['all_segments_attack'], enraged: true }
        }
    },
    brain_of_cthulhu: {
        name: 'Brain of Cthulhu', w: 56, h: 56, hp: 1800, damage: 20, speed: 1.8, color: '#CC3344',
        phases: 3, drops: [[I_TISSUE_SAMPLE, 8, 15], [I_CRIMTANE_BAR, 5, 10]], xp: 600, flies: true,
        tags: ['organic', 'demon'], special: 'creepers',
        phaseAI: {
            1: { attacks: ['summon_creepers'], minionCount: 15, invulnerable: true },
            2: { attacks: ['charge_dash', 'teleport_confuse'], visible: false, flickerRate: 30 },
            3: { attacks: ['rapid_charge', 'psychic_wave'], enraged: true }
        }
    },
    void_maw: {
        name: 'The Void Maw', w: 72, h: 72, hp: 2400, damage: 28, speed: 1.0, color: '#7722DD',
        phases: 3, drops: [[I_VOID_ESSENCE, 8, 15], [I_VOIDITE_BAR, 5, 10], [I_GRAVITY_BOOTS, 1, 1]], xp: 700, flies: true,
        tags: ['void', 'demon'], special: 'gravity_well',
        phaseAI: {
            1: { attacks: ['gravity_pull', 'void_bolt_ring'], gravityWell: true },
            2: { attacks: ['reality_tear', 'summon_star_phantoms'], minionCount: 6, teleport: true },
            3: { attacks: ['collapse', 'void_beam_sweep', 'invert_gravity'], enraged: true }
        }
    },
    // ===== SPACE BOSSES =====
    star_destroyer: {
        name: 'Star Destroyer', w: 96, h: 48, hp: 4000, damage: 35, speed: 1.5, color: '#33AACC',
        phases: 3, drops: [[I_ALIEN_TECH, 10, 20], [I_LUMINITE_BAR, 5, 10], [I_COSMIC_CAR_KEY, 1, 1], [I_JETPACK, 1, 1]], xp: 1200, flies: true,
        tags: ['space', 'mechanical'], special: 'shield_generators',
        phaseAI: {
            1: { attacks: ['laser_barrage', 'drone_deploy'], shieldCount: 4, shieldHP: 300 },
            2: { attacks: ['missile_swarm', 'tractor_beam', 'turret_fire'], speed: 2.0 },
            3: { attacks: ['death_laser', 'ram_charge', 'emp_blast'], enraged: true }
        }
    },
    moon_lord: {
        name: 'Moon Lord', w: 80, h: 96, hp: 6000, damage: 50, speed: 0.8, color: '#44FFAA',
        phases: 3, drops: [[I_LUMINITE_BAR, 15, 25], [I_COSMIC_SHARD, 10, 15], [I_GRAVITY_GLOBE, 1, 1]], xp: 2500, flies: true,
        tags: ['celestial', 'eldritch'], special: 'phantasmal',
        phaseAI: {
            1: { attacks: ['eye_beam', 'phantom_hand_grab', 'phantasmal_bolt'], eyeHP: 800, handHP: 500 },
            2: { attacks: ['deathray', 'teleport_above', 'summon_true_eyes'], trueEyeCount: 3 },
            3: { attacks: ['phantasmal_deathray_sweep', 'core_exposed', 'reality_collapse'], enraged: true }
        }
    },
    // ===== HARDMODE MECHANICAL BOSSES =====
    destroyer: {
        name: 'The Destroyer', w: 20, h: 20, hp: 5000, damage: 30, speed: 2.0, color: '#3399FF',
        phases: 3, drops: [[I_SOUL_OF_MIGHT, 10, 20], [I_HALLOWED_BAR, 8, 15]], xp: 1500,
        tags: ['hardmode', 'mechanical'], special: 'worm_segments',
        phaseAI: {
            1: { attacks: ['body_slam', 'probe_deploy'], segmentCount: 20, probeRate: 0.15 },
            2: { attacks: ['coil_strike', 'laser_from_head', 'mass_probe_deploy'], speed: 2.5 },
            3: { attacks: ['death_coil', 'rapid_laser', 'ram_loop'], enraged: true, speed: 3.5 }
        }
    },
    the_twins: {
        name: 'The Twins', w: 36, h: 36, hp: 3500, damage: 32, speed: 2.2, color: '#FF33FF',
        phases: 3, drops: [[I_SOUL_OF_SIGHT, 10, 20], [I_HALLOWED_BAR, 8, 15]], xp: 1500, flies: true,
        tags: ['hardmode', 'mechanical'], special: 'twin_eyes',
        phaseAI: {
            1: { attacks: ['retinazer_laser', 'spazmatism_fireball'], twinSplit: true },
            2: { attacks: ['focused_deathray', 'cursed_flame_spray', 'twin_dash'], speed: 3.0 },
            3: { attacks: ['twin_deathray_cross', 'rapid_flame', 'simultaneous_charge'], enraged: true }
        }
    },
    skeletron_prime: {
        name: 'Skeletron Prime', w: 48, h: 48, hp: 4500, damage: 35, speed: 1.5, color: '#33FF66',
        phases: 3, drops: [[I_SOUL_OF_FRIGHT, 10, 20], [I_HALLOWED_BAR, 8, 15]], xp: 1500, flies: true,
        tags: ['hardmode', 'mechanical'], special: 'mechanical_arms',
        phaseAI: {
            1: { attacks: ['cannon_arm', 'saw_arm', 'vice_arm', 'laser_arm'], armHP: 600 },
            2: { attacks: ['head_spin', 'rapid_cannon', 'dual_saw_swing'], speed: 2.0, spinning: true },
            3: { attacks: ['skull_missile_barrage', 'death_spin', 'arm_regenerate'], enraged: true }
        }
    },
    // ===== PHASE 5: POST-HARDMODE BOSSES =====
    plantera: {
        name: 'Plantera', w: 40, h: 40, hp: 3500, damage: 35, speed: 1.5, color: '#FF44AA',
        phases: 3, drops: [[I_TEMPLE_KEY, 1, 1], [I_CHLOROPHYTE_BAR, 10, 20], [I_TERRA_BLADE, 0, 1]], xp: 2000,
        tags: ['post_mechanical'], special: 'plant_hooks',
        phaseAI: {
            1: { attacks: ['vine_hook', 'seed_barrage', 'thorn_shot'], hookCount: 4 },
            2: { attacks: ['biting_petals', 'spore_cloud', 'rapid_vine'], speed: 2.5, petals: 6 },
            3: { attacks: ['thorn_ball', 'massive_spore_burst', 'vine_whip'], enraged: true, speed: 3.0 }
        }
    },
    golem: {
        name: 'Golem', w: 52, h: 52, hp: 5000, damage: 40, speed: 1.0, color: '#AA7744',
        phases: 3, drops: [[I_BEETLE_HUSK, 8, 15], [I_POSSESSED_HATCHET_P5, 0, 1], [I_STYNGER, 0, 1], [I_HEAT_RAY, 0, 1]], xp: 2000,
        tags: ['temple'], special: 'detachable_head',
        phaseAI: {
            1: { attacks: ['fist_slam', 'eye_laser', 'jump_stomp'], fistRange: 120 },
            2: { attacks: ['body_stomp', 'homing_fist', 'rapid_eye_laser'], speed: 1.5 },
            3: { attacks: ['head_detach', 'rapid_fire', 'ground_pound'], enraged: true, headFlies: true }
        }
    },
    duke_fishron: {
        name: 'Duke Fishron', w: 44, h: 44, hp: 4500, damage: 50, speed: 3.0, color: '#44AACC',
        phases: 3, drops: [[I_BUBBLE_GUN, 0, 1], [I_TEMPEST_STAFF, 0, 1], [I_RAZORBLADE_TYPHOON, 0, 1], [I_FISHRON_WINGS, 0, 1]], xp: 2500,
        tags: ['optional', 'ocean'], special: 'aquatic_flight', flies: true,
        phaseAI: {
            1: { attacks: ['bubble_charge', 'dash_attack', 'sharknado_spit'], dashSpeed: 12 },
            2: { attacks: ['sharknado_summon', 'rapid_dash', 'bubble_ring'], speed: 4.0 },
            3: { attacks: ['cthulhu_form', 'teleport_strike', 'tsunami_wave'], enraged: true, speed: 6.0, teleports: true }
        }
    },
    // ===== PHASE 6: CELESTIAL PILLAR BOSSES =====
    solar_pillar: {
        name: 'Solar Pillar', w: 20, h: 60, hp: 2000, damage: 0, speed: 0, color: '#FF6622',
        phases: 3, drops: [[I_SOLAR_FRAGMENT, 20, 35]], xp: 1000,
        tags: ['celestial', 'pillar'], special: 'stationary_shield',
        phaseAI: {
            1: { attacks: ['flame_wave', 'solar_flare'], spawnRate: 0.25, shield: true },
            2: { attacks: ['solar_beam', 'fire_ring', 'crawltipede_summon'], shield: false },
            3: { attacks: ['solar_eruption_blast', 'inferno_nova'], enraged: true }
        }
    },
    vortex_pillar: {
        name: 'Vortex Pillar', w: 20, h: 60, hp: 2000, damage: 0, speed: 0, color: '#22CCAA',
        phases: 3, drops: [[I_VORTEX_FRAGMENT, 20, 35]], xp: 1000,
        tags: ['celestial', 'pillar'], special: 'stationary_shield',
        phaseAI: {
            1: { attacks: ['lightning_bolt', 'vortex_pull'], spawnRate: 0.25, shield: true },
            2: { attacks: ['storm_barrage', 'gravity_distort', 'alien_swarm'], shield: false },
            3: { attacks: ['cosmic_storm', 'dimensional_rift'], enraged: true }
        }
    },
    nebula_pillar: {
        name: 'Nebula Pillar', w: 20, h: 60, hp: 2000, damage: 0, speed: 0, color: '#CC44FF',
        phases: 3, drops: [[I_NEBULA_FRAGMENT, 20, 35]], xp: 1000,
        tags: ['celestial', 'pillar'], special: 'stationary_shield',
        phaseAI: {
            1: { attacks: ['psychic_blast', 'mind_drain'], spawnRate: 0.25, shield: true },
            2: { attacks: ['nebula_storm', 'brain_suckler_swarm', 'reality_warp'], shield: false },
            3: { attacks: ['cosmic_collapse', 'void_eruption'], enraged: true }
        }
    },
    stardust_pillar: {
        name: 'Stardust Pillar', w: 20, h: 60, hp: 2000, damage: 0, speed: 0, color: '#4488FF',
        phases: 3, drops: [[I_STARDUST_FRAGMENT, 20, 35]], xp: 1000,
        tags: ['celestial', 'pillar'], special: 'stationary_shield',
        phaseAI: {
            1: { attacks: ['star_shower', 'cell_spawn'], spawnRate: 0.25, shield: true },
            2: { attacks: ['milkyway_blast', 'star_cell_swarm', 'gravity_well'], shield: false },
            3: { attacks: ['stardust_nova', 'celestial_barrage'], enraged: true }
        }
    },
};

// ===== PHASE C: ARMOR SET BONUSES =====
const ARMOR_SET_BONUSES = {
    iron: { helm: I_IRON_HELM, chest: I_IRON_CHEST, bonus: { defense: 2, meleeDmg: 0.05 }, name: 'Iron Set', desc: '+2 def, +5% melee dmg' },
    gold: { helm: I_GOLD_HELM, chest: I_GOLD_CHEST, bonus: { defense: 3, critChance: 0.10 }, name: 'Gold Set', desc: '+3 def, +10% crit' },
    crimson: { helm: I_CRIMSON_HELM, chest: I_CRIMSON_CHEST, bonus: { regenRate: 1, meleeDmg: 0.15 }, name: 'Crimson Set', desc: 'Regen +1/3s, +15% melee' },
    frost: { helm: I_FROST_HELM, chest: I_FROST_CHEST, bonus: { iceDmg: 0.20, freezeImmune: true }, name: 'Frost Set', desc: '+20% ice dmg, freeze immune' },
    hive: { helm: I_HIVE_HELM, chest: I_HIVE_CHEST, bonus: { minionDmg: 0.15, beeOnHit: true }, name: 'Hive Set', desc: '+15% minion dmg, bees on hit' },
    hellforged: { helm: I_HELLFORGED_HELM, chest: I_HELLFORGED_CHEST, bonus: { fireDmg: 0.25, burnImmune: true, fireAura: 3 }, name: 'Hellforged Set', desc: '+25% fire dmg, burn immune, fire aura' },
    void: { helm: I_VOID_HELM, chest: I_VOID_CHEST, bonus: { allDmg: 0.20, voidDash: true }, name: 'Void Set', desc: '+20% all dmg, void dash' },
    abyssal: { helm: I_ABYSSAL_HELM, chest: I_ABYSSAL_CHEST, bonus: { waterBreath: true, waterDmg: 0.30 }, name: 'Abyssal Set', desc: 'Water breathing, +30% dmg in water' },
    titan: { helm: I_TITAN_HELM, chest: I_TITAN_CHEST, bonus: { maxHpPct: 0.10, kbImmune: true }, name: 'Titan Set', desc: '+10% max HP, knockback immune' },
    bark: { helm: I_BARK_HELM, chest: I_BARK_CHEST, bonus: { thornsPct: 0.20, plantHeal: true }, name: 'Bark Set', desc: '20% thorns, heal from plants' },
    spore: { helm: I_SPORE_HELM, chest: I_SPORE_CHEST, bonus: { poisonImmune: true, poisonNova: true }, name: 'Spore Set', desc: 'Poison immune, poison nova on hit' },
    lunar: { helm: I_LUNAR_HELM, chest: I_LUNAR_CHEST, bonus: { allDmg: 0.30, flight: true }, name: 'Lunar Set', desc: '+30% all dmg, infinite flight' },
};

function getActiveSetBonus() {
    if (!player.armor) return null;
    const helm = player.armor.head, chest = player.armor.chest;
    if (!helm || !chest) return null;
    for (const key in ARMOR_SET_BONUSES) {
        const set = ARMOR_SET_BONUSES[key];
        if (helm.id === set.helm && chest.id === set.chest) return set;
    }
    return null;
}

// ===== PHASE C: ENCHANTMENT SYSTEM =====
const ENCHANTMENTS = {
    vampiric: { name: 'Vampiric', desc: '8% lifesteal', color: '#CC2244', effect: 'lifesteal', value: 0.08, icon: '🩸' },
    thunder: { name: 'Thunder', desc: '20% chain lightning', color: '#FFDD44', effect: 'chain_lightning', chance: 0.20, chainDmg: 15, icon: '⚡' },
    frostbite: { name: 'Frostbite', desc: '30% freeze', color: '#66CCFF', effect: 'freeze', chance: 0.30, duration: 120, icon: '❄' },
    hellfire: { name: 'Hellfire', desc: 'Fire trail on attack', color: '#FF4400', effect: 'fire_trail', duration: 180, icon: '🔥' },
    soul_drain: { name: 'Soul Drain', desc: 'Kills restore 5 mana', color: '#88AAFF', effect: 'mana_on_kill', value: 5, icon: '💙' },
    growth: { name: 'Growth', desc: '+1 dmg per 50 kills (max +20)', color: '#44CC44', effect: 'scaling_damage', perKills: 50, maxBonus: 20, icon: '🌱' },
    berserker: { name: 'Berserker', desc: 'Below 30% HP: +50% dmg', color: '#FF4422', effect: 'berserker', hpThreshold: 0.3, dmgMult: 1.5, icon: '💢' },
    spectral: { name: 'Spectral', desc: 'Projectiles pass through walls', color: '#AABBCC', effect: 'phase_projectiles', icon: '👻' },
    gravity_well: { name: 'Gravity Well', desc: 'Kills pull nearby enemies', color: '#7700CC', effect: 'gravity_pull', radius: 128, icon: '🌀' },
    midas: { name: 'Midas Touch', desc: 'Kills drop 2x gold', color: '#FFD700', effect: 'double_gold', icon: '💰' },
};

function enchantWeapon(slot, enchantmentKey) {
    if (!slot || !ENCHANTMENTS[enchantmentKey]) return false;
    const it = ITEMS[slot.id];
    if (!it || !['weapon', 'gun', 'bow', 'magic', 'whip', 'spear', 'flail', 'boomerang', 'yoyo', 'launcher'].includes(it.type)) return false;
    slot.enchantment = { ...ENCHANTMENTS[enchantmentKey] };
    slot.enchantment.kills = 0; // For growth enchantment
    return true;
}

// ===== CRAFTING RECIPES =====
const RECIPES = [
    // Basic
    { station: null, result: T.PLANKS, rAmt: 4, ingredients: [[T.WOOD, 1]], name: 'Planks' },
    { station: null, result: T.TORCH, rAmt: 4, ingredients: [[T.WOOD, 1], [I_GEL, 1]], name: 'Torch (4)' },
    { station: null, result: T.WORKBENCH, rAmt: 1, ingredients: [[T.PLANKS, 10]], name: 'Workbench' },
    // Workbench
    { station: 'workbench', result: I_WOOD_PICK, rAmt: 1, ingredients: [[T.WOOD, 8], [T.PLANKS, 4]], name: 'Wood Pickaxe' },
    { station: 'workbench', result: I_WOOD_SWORD, rAmt: 1, ingredients: [[T.WOOD, 7], [T.PLANKS, 3]], name: 'Wood Sword' },
    { station: 'workbench', result: I_WOOD_BOW, rAmt: 1, ingredients: [[T.WOOD, 10]], name: 'Wood Bow' },
    { station: 'workbench', result: I_ARROW, rAmt: 10, ingredients: [[T.WOOD, 1], [T.STONE, 1]], name: 'Arrow (10)' },
    { station: 'workbench', result: T.FURNACE, rAmt: 1, ingredients: [[T.STONE, 20]], name: 'Furnace' },
    { station: 'workbench', result: T.CHEST, rAmt: 1, ingredients: [[T.PLANKS, 8]], name: 'Chest' },
    // Furnace
    { station: 'furnace', result: I_IRON_BAR, rAmt: 1, ingredients: [[T.IRON_ORE, 3]], name: 'Iron Bar' },
    { station: 'furnace', result: I_GOLD_BAR, rAmt: 1, ingredients: [[T.GOLD_ORE, 4]], name: 'Gold Bar' },
    { station: 'furnace', result: I_CRIMSON_BAR, rAmt: 1, ingredients: [[T.CRIMSON_ORE, 4]], name: 'Crimson Bar' },
    { station: 'furnace', result: I_SHADOW_BAR, rAmt: 1, ingredients: [[T.SHADOW_ORE, 5]], name: 'Shadow Bar' },
    { station: 'furnace', result: I_FIRE_ARROW, rAmt: 10, ingredients: [[I_ARROW, 10], [T.HELLSTONE, 1]], name: 'Fire Arrow (10)' },
    { station: 'furnace', result: T.ANVIL, rAmt: 1, ingredients: [[I_IRON_BAR, 5]], name: 'Anvil' },
    // Anvil
    { station: 'anvil', result: I_IRON_PICK, rAmt: 1, ingredients: [[I_IRON_BAR, 8]], name: 'Iron Pickaxe' },
    { station: 'anvil', result: I_IRON_SWORD, rAmt: 1, ingredients: [[I_IRON_BAR, 6]], name: 'Iron Sword' },
    { station: 'anvil', result: I_IRON_BOW, rAmt: 1, ingredients: [[I_IRON_BAR, 5], [T.WOOD, 5]], name: 'Iron Bow' },
    { station: 'anvil', result: I_IRON_HELM, rAmt: 1, ingredients: [[I_IRON_BAR, 10]], name: 'Iron Helmet' },
    { station: 'anvil', result: I_IRON_CHEST, rAmt: 1, ingredients: [[I_IRON_BAR, 15]], name: 'Iron Chestplate' },
    { station: 'anvil', result: I_GOLD_PICK, rAmt: 1, ingredients: [[I_GOLD_BAR, 10]], name: 'Gold Pickaxe' },
    { station: 'anvil', result: I_GOLD_SWORD, rAmt: 1, ingredients: [[I_GOLD_BAR, 8]], name: 'Gold Sword' },
    { station: 'anvil', result: I_GOLD_HELM, rAmt: 1, ingredients: [[I_GOLD_BAR, 12]], name: 'Gold Helmet' },
    { station: 'anvil', result: I_GOLD_CHEST, rAmt: 1, ingredients: [[I_GOLD_BAR, 18]], name: 'Gold Chestplate' },
    { station: 'anvil', result: I_CRIMSON_PICK, rAmt: 1, ingredients: [[I_CRIMSON_BAR, 12]], name: 'Crimson Pickaxe' },
    { station: 'anvil', result: I_CRIMSON_SWORD, rAmt: 1, ingredients: [[I_CRIMSON_BAR, 10]], name: 'Crimson Blade' },
    { station: 'anvil', result: I_CRIMSON_HELM, rAmt: 1, ingredients: [[I_CRIMSON_BAR, 12]], name: 'Crimson Helm' },
    { station: 'anvil', result: I_CRIMSON_CHEST, rAmt: 1, ingredients: [[I_CRIMSON_BAR, 20]], name: 'Crimson Plate' },
    { station: 'anvil', result: I_SHADOW_PICK, rAmt: 1, ingredients: [[I_SHADOW_BAR, 15]], name: 'Shadow Pickaxe' },
    { station: 'anvil', result: I_SHADOW_SWORD, rAmt: 1, ingredients: [[I_SHADOW_BAR, 12]], name: 'Shadow Scythe' },
    // Potions (furnace)
    { station: 'furnace', result: I_HEALTH_POT, rAmt: 3, ingredients: [[T.FLESH, 3], [I_GEL, 2]], name: 'Health Potion (3)' },
    { station: 'furnace', result: I_MANA_POT, rAmt: 3, ingredients: [[T.CRYSTAL, 2], [I_GEL, 2]], name: 'Mana Potion (3)' },
    { station: 'furnace', result: I_SPEED_POT, rAmt: 2, ingredients: [[T.COBWEB, 5], [I_GEL, 2]], name: 'Speed Potion (2)' },
    // Phase 1 — Furniture
    { station: 'workbench', result: T.DOOR, rAmt: 1, ingredients: [[T.PLANKS, 6]], name: 'Door' },
    { station: 'workbench', result: T.TABLE, rAmt: 1, ingredients: [[T.PLANKS, 8]], name: 'Table' },
    { station: 'workbench', result: T.CHAIR, rAmt: 1, ingredients: [[T.PLANKS, 4]], name: 'Chair' },
    { station: 'workbench', result: T.BED, rAmt: 1, ingredients: [[T.PLANKS, 10], [T.COBWEB, 5]], name: 'Bed' },
    { station: 'workbench', result: T.BOOKSHELF, rAmt: 1, ingredients: [[T.PLANKS, 10], [T.WOOD, 5]], name: 'Bookshelf' },
    { station: 'workbench', result: T.GLASS, rAmt: 4, ingredients: [[T.SAND, 4]], name: 'Glass (4)' },
    { station: 'workbench', result: T.CHANDELIER, rAmt: 1, ingredients: [[I_IRON_BAR, 4], [T.TORCH, 3]], name: 'Chandelier' },
    { station: 'workbench', result: T.COOKING_STATION, rAmt: 1, ingredients: [[T.STONE, 15], [T.WOOD, 5], [I_IRON_BAR, 2]], name: 'Cooking Station' },
    { station: 'workbench', result: I_FISHING_ROD, rAmt: 1, ingredients: [[T.WOOD, 8], [T.COBWEB, 4]], name: 'Fishing Rod' },
    { station: 'workbench', result: T.PRESSURE_PLATE, rAmt: 1, ingredients: [[T.STONE, 5], [I_IRON_BAR, 1]], name: 'Pressure Plate' },
    { station: 'workbench', result: T.LEVER, rAmt: 1, ingredients: [[T.STONE, 5], [I_IRON_BAR, 1]], name: 'Lever' },
    { station: 'workbench', result: T.TNT, rAmt: 1, ingredients: [[T.SAND, 5], [I_GEL, 5]], name: 'TNT' },
    // Phase 1 — New bars
    { station: 'furnace', result: I_FROST_BAR, rAmt: 1, ingredients: [[T.FROST_ORE, 4]], name: 'Frost Bar' },
    { station: 'furnace', result: I_HIVE_WAX, rAmt: 2, ingredients: [[T.HIVE_ORE, 3]], name: 'Hive Wax (2)' },
    // Phase 1 — Bone tier
    { station: 'workbench', result: I_BONE_PICK, rAmt: 1, ingredients: [[I_BONE_FRAG, 10], [T.WOOD, 5]], name: 'Bone Pickaxe' },
    { station: 'workbench', result: I_BONE_SWORD, rAmt: 1, ingredients: [[I_BONE_FRAG, 8], [T.WOOD, 3]], name: 'Bone Sword' },
    { station: 'workbench', result: I_SHIELD, rAmt: 1, ingredients: [[I_BONE_FRAG, 15], [T.WOOD, 5]], name: 'Bone Shield' },
    // Phase 1 — Flesh tier
    { station: 'anvil', result: I_FLESH_PICK, rAmt: 1, ingredients: [[T.FLESH, 15], [I_CRIMSON_BAR, 5]], name: 'Flesh Pickaxe' },
    { station: 'anvil', result: I_FLESH_SWORD, rAmt: 1, ingredients: [[T.FLESH, 12], [I_CRIMSON_BAR, 4]], name: 'Flesh Cleaver' },
    // Phase 1 — Crystal tier
    { station: 'anvil', result: I_CRYSTAL_PICK, rAmt: 1, ingredients: [[T.CRYSTAL, 10], [I_FROST_BAR, 5]], name: 'Crystal Pickaxe' },
    { station: 'anvil', result: I_CRYSTAL_SWORD, rAmt: 1, ingredients: [[T.CRYSTAL, 8], [I_FROST_BAR, 4]], name: 'Crystal Blade' },
    // Phase 1 — Hellforged tier
    { station: 'anvil', result: I_HELLFORGED_PICK, rAmt: 1, ingredients: [[T.HELLSTONE, 15], [I_SHADOW_BAR, 8]], name: 'Hellforged Pickaxe' },
    { station: 'anvil', result: I_HELLFORGED_SWORD, rAmt: 1, ingredients: [[T.HELLSTONE, 12], [I_SHADOW_BAR, 6]], name: 'Hellforged Blade' },
    // Phase 1 — Frost/Hive armor
    { station: 'anvil', result: I_FROST_HELM, rAmt: 1, ingredients: [[I_FROST_BAR, 10]], name: 'Frost Helmet' },
    { station: 'anvil', result: I_FROST_CHEST, rAmt: 1, ingredients: [[I_FROST_BAR, 16]], name: 'Frost Chestplate' },
    { station: 'anvil', result: I_HIVE_HELM, rAmt: 1, ingredients: [[I_HIVE_WAX, 8], [I_ROYAL_JELLY, 2]], name: 'Hive Helmet' },
    { station: 'anvil', result: I_HIVE_CHEST, rAmt: 1, ingredients: [[I_HIVE_WAX, 12], [I_ROYAL_JELLY, 3]], name: 'Hive Chestplate' },
    { station: 'anvil', result: I_HELLFORGED_HELM, rAmt: 1, ingredients: [[T.HELLSTONE, 10], [I_SHADOW_BAR, 8]], name: 'Hellforged Helmet' },
    { station: 'anvil', result: I_HELLFORGED_CHEST, rAmt: 1, ingredients: [[T.HELLSTONE, 15], [I_SHADOW_BAR, 12]], name: 'Hellforged Chestplate' },
    // Phase 1 — Magic weapons
    { station: 'anvil', result: I_FIRE_STAFF, rAmt: 1, ingredients: [[T.HELLSTONE, 8], [I_CRIMSON_BAR, 5], [I_LENS, 3]], name: 'Fire Staff' },
    { station: 'anvil', result: I_ICE_STAFF, rAmt: 1, ingredients: [[I_FROST_BAR, 8], [I_ICE_SHARD, 5], [I_LENS, 3]], name: 'Ice Staff' },
    { station: 'anvil', result: I_SHADOW_STAFF, rAmt: 1, ingredients: [[I_SHADOW_BAR, 10], [I_DEMON_HEART, 3], [I_LENS, 5]], name: 'Shadow Staff' },
    { station: 'anvil', result: I_HEAL_STAFF, rAmt: 1, ingredients: [[T.CRYSTAL, 10], [I_ROYAL_JELLY, 5], [I_MUSHROOM_SPORE, 5]], name: 'Healing Staff' },
    // Phase 1 — Accessories
    { station: 'anvil', result: I_JUMP_RING, rAmt: 1, ingredients: [[I_GOLD_BAR, 5], [I_MUSHROOM_SPORE, 8]], name: 'Ring of Leaping' },
    { station: 'anvil', result: I_FIRE_AMULET, rAmt: 1, ingredients: [[T.HELLSTONE, 10], [I_DEMON_HEART, 2]], name: 'Fire Amulet' },
    { station: 'anvil', result: I_NIGHT_AMULET, rAmt: 1, ingredients: [[I_GOLD_BAR, 5], [I_LENS, 5]], name: 'Night Vision Amulet' },
    { station: 'anvil', result: I_CLIMB_BOOTS, rAmt: 1, ingredients: [[I_SPIDER_FANG, 8], [I_IRON_BAR, 5]], name: 'Spider Boots' },
    { station: 'anvil', result: I_SPEED_BOOTS, rAmt: 1, ingredients: [[I_GOLD_BAR, 8], [I_HIVE_WAX, 4]], name: 'Hermes Boots' },
    // Phase 1 — Boss summon items (altar)
    { station: 'altar', result: I_SUSPICIOUS_EYE, rAmt: 1, ingredients: [[I_LENS, 6], [I_GEL, 10]], name: 'Suspicious Eye' },
    { station: 'altar', result: I_BONE_TOTEM, rAmt: 1, ingredients: [[I_BONE_FRAG, 20], [I_IRON_BAR, 5]], name: 'Bone Totem' },
    { station: 'altar', result: I_DEMON_SIGIL, rAmt: 1, ingredients: [[I_DEMON_HEART, 5], [I_SHADOW_BAR, 5]], name: 'Demon Sigil' },
    { station: 'altar', result: I_HIVE_CROWN, rAmt: 1, ingredients: [[I_HIVE_WAX, 10], [I_ROYAL_JELLY, 5]], name: 'Hive Crown' },
    { station: 'altar', result: I_FROST_RUNE, rAmt: 1, ingredients: [[I_FROST_BAR, 8], [I_ICE_SHARD, 10]], name: 'Frost Rune' },
    { station: 'altar', result: I_CORRUPT_HEART, rAmt: 1, ingredients: [[I_DEMON_HEART, 8], [I_SHADOW_BAR, 8], [I_LENS, 10]], name: 'Corrupt Heart' },
    // Phase 1 — Food (cooking station)
    { station: 'cooking', result: I_COOKED_FISH, rAmt: 1, ingredients: [[I_RAW_FISH, 1]], name: 'Cooked Fish' },
    { station: 'cooking', result: I_MUSHROOM_STEW, rAmt: 1, ingredients: [[I_MUSHROOM_SPORE, 3], [T.WATER, 1]], name: 'Mushroom Stew' },
    { station: 'cooking', result: I_HONEY_BREAD, rAmt: 1, ingredients: [[T.HONEY_BLOCK, 2], [T.PLANKS, 1]], name: 'Honey Bread' },
    { station: 'cooking', result: I_HELLFIRE_STEAK, rAmt: 1, ingredients: [[T.FLESH, 5], [T.HELLSTONE, 2]], name: 'Hellsteak' },
    // ===== PHASE 5: GUN RECIPES =====
    // Ammo (furnace)
    { station: 'furnace', result: I_MUSKET_BALL, rAmt: 25, ingredients: [[T.IRON_ORE, 2]], name: 'Musket Ball (25)' },
    { station: 'furnace', result: I_SILVER_BULLET, rAmt: 15, ingredients: [[I_GOLD_BAR, 1], [I_GUNPOWDER, 2]], name: 'Silver Bullet (15)' },
    { station: 'furnace', result: I_EXPLOSIVE_ROUND, rAmt: 5, ingredients: [[I_IRON_BAR, 2], [I_GUNPOWDER, 5], [T.TNT, 1]], name: 'Explosive Round (5)' },
    { station: 'anvil', result: I_CURSED_BULLET, rAmt: 10, ingredients: [[I_SHADOW_BAR, 2], [I_GUNPOWDER, 3], [I_LENS, 1]], name: 'Cursed Bullet (10)' },
    // Gunpowder (furnace)
    { station: 'furnace', result: I_GUNPOWDER, rAmt: 5, ingredients: [[T.SAND, 3], [T.STONE, 3]], name: 'Gunpowder (5)' },
    // Mechanism (anvil)
    { station: 'anvil', result: I_MECHANISM, rAmt: 1, ingredients: [[I_IRON_BAR, 3], [T.STONE, 5]], name: 'Mechanism' },
    // Guns (anvil)
    { station: 'workbench', result: I_LIGHT_MUSKET, rAmt: 1, ingredients: [[T.WOOD, 10], [I_IRON_BAR, 3], [I_GUNPOWDER, 5]], name: 'Light Musket' },
    { station: 'anvil', result: I_FLINTLOCK, rAmt: 1, ingredients: [[I_IRON_BAR, 6], [I_MECHANISM, 1], [I_GUNPOWDER, 5]], name: 'Flintlock Pistol' },
    { station: 'anvil', result: I_BLUNDERBUSS, rAmt: 1, ingredients: [[I_IRON_BAR, 10], [I_MECHANISM, 2], [I_GUNPOWDER, 8]], name: 'Blunderbuss' },
    { station: 'anvil', result: I_IRON_REPEATER, rAmt: 1, ingredients: [[I_IRON_BAR, 12], [I_MECHANISM, 3], [I_GUNPOWDER, 6]], name: 'Iron Repeater' },
    { station: 'anvil', result: I_GOLD_RIFLE, rAmt: 1, ingredients: [[I_GOLD_BAR, 10], [I_MECHANISM, 3], [I_GUNPOWDER, 8]], name: 'Gold Rifle' },
    { station: 'anvil', result: I_CRIMSON_CARBINE, rAmt: 1, ingredients: [[I_CRIMSON_BAR, 10], [I_MECHANISM, 4], [I_GUNPOWDER, 10]], name: 'Crimson Carbine' },
    { station: 'anvil', result: I_SHADOW_SNIPER, rAmt: 1, ingredients: [[I_SHADOW_BAR, 12], [I_MECHANISM, 5], [I_GUNPOWDER, 12], [I_LENS, 3]], name: 'Shadow Sniper' },
    { station: 'anvil', result: I_HELLFIRE_CANNON, rAmt: 1, ingredients: [[T.HELLSTONE, 15], [I_SHADOW_BAR, 8], [I_MECHANISM, 5], [I_GUNPOWDER, 15]], name: 'Hellfire Cannon' },
    // ===== PHASE 5: NEW BOSS SUMMON RECIPES (altar) =====
    { station: 'altar', result: I_RAVAGER_FANG, rAmt: 1, ingredients: [[I_BONE_FRAG, 15], [I_IRON_BAR, 5], [I_GUNPOWDER, 5]], name: 'Ravager Fang' },
    { station: 'altar', result: I_HIVEMIND_CORE, rAmt: 1, ingredients: [[I_MUSHROOM_SPORE, 15], [I_LENS, 8], [I_GEL, 10]], name: 'Hivemind Core' },
    { station: 'altar', result: I_SERPENT_SCALE, rAmt: 1, ingredients: [[I_GOLD_BAR, 10], [I_FROST_BAR, 5], [T.OBSIDIAN, 5]], name: 'Serpent Scale' },
    { station: 'altar', result: I_SOUL_LANTERN, rAmt: 1, ingredients: [[I_LENS, 10], [I_CRIMSON_BAR, 8], [I_MUSHROOM_SPORE, 5]], name: 'Soul Lantern' },
    { station: 'altar', result: I_PLAGUE_FLASK, rAmt: 1, ingredients: [[I_GEL, 20], [I_MUSHROOM_SPORE, 10], [I_SPIDER_FANG, 8]], name: 'Plague Flask' },
    { station: 'altar', result: I_STORM_PRISM, rAmt: 1, ingredients: [[T.CRYSTAL, 15], [I_GOLD_BAR, 8], [I_FROST_BAR, 8]], name: 'Storm Prism' },
    { station: 'altar', result: I_BLOOD_CHALICE, rAmt: 1, ingredients: [[I_DEMON_HEART, 10], [I_SHADOW_BAR, 10], [I_CRIMSON_BAR, 10]], name: 'Blood Chalice' },
    { station: 'altar', result: I_BLUEPRINT_SCROLL, rAmt: 1, ingredients: [[I_MECHANISM, 5], [I_GOLD_BAR, 10], [I_IRON_BAR, 10]], name: 'Blueprint Scroll' },
    // ===== PHASE 5: BOSS-DROP WEAPON RECIPES (anvil — need boss materials) =====
    { station: 'anvil', result: I_VOID_HELM, rAmt: 1, ingredients: [[I_VOID_SHARD, 10], [I_SHADOW_BAR, 8]], name: 'Void Helmet' },
    { station: 'anvil', result: I_VOID_CHEST, rAmt: 1, ingredients: [[I_VOID_SHARD, 16], [I_SHADOW_BAR, 12]], name: 'Void Chestplate' },
    { station: 'anvil', result: I_ABYSSAL_HELM, rAmt: 1, ingredients: [[I_ABYSSAL_SCALE, 8], [I_FROST_BAR, 6]], name: 'Abyssal Helmet' },
    { station: 'anvil', result: I_ABYSSAL_CHEST, rAmt: 1, ingredients: [[I_ABYSSAL_SCALE, 14], [I_FROST_BAR, 10]], name: 'Abyssal Chestplate' },
    { station: 'anvil', result: I_TITAN_HELM, rAmt: 1, ingredients: [[I_TITAN_CORE, 6], [I_GOLD_BAR, 10]], name: 'Titan Helmet' },
    { station: 'anvil', result: I_TITAN_CHEST, rAmt: 1, ingredients: [[I_TITAN_CORE, 10], [I_GOLD_BAR, 15]], name: 'Titan Chestplate' },
    // ===== PHASE 5: ACCESSORIES (anvil) =====
    { station: 'anvil', result: I_GUNSLINGER_GLOVE, rAmt: 1, ingredients: [[I_MECHANISM, 3], [I_GUNPOWDER, 8], [I_IRON_BAR, 5]], name: 'Gunslinger Glove' },
    { station: 'anvil', result: I_AMMO_POUCH, rAmt: 1, ingredients: [[T.COBWEB, 10], [I_IRON_BAR, 4], [I_GUNPOWDER, 5]], name: 'Ammo Pouch' },
    // ===== PHASE 5: MISCELLANEOUS WEAPON RECIPES =====
    { station: 'anvil', result: I_VOID_KATANA, rAmt: 1, ingredients: [[I_VOID_SHARD, 12], [I_SHADOW_BAR, 10], [I_DEMON_HEART, 5]], name: 'Void Katana' },
    { station: 'anvil', result: I_ABYSSAL_TRIDENT, rAmt: 1, ingredients: [[I_ABYSSAL_SCALE, 10], [I_FROST_BAR, 8], [I_GOLD_BAR, 5]], name: 'Abyssal Trident' },
    { station: 'anvil', result: I_SOUL_REAPER, rAmt: 1, ingredients: [[I_SOUL_FRAGMENT, 12], [I_CRIMSON_BAR, 8], [I_LENS, 8]], name: 'Soul Reaper' },
    { station: 'anvil', result: I_TITAN_FIST, rAmt: 1, ingredients: [[I_TITAN_CORE, 8], [I_GOLD_BAR, 12], [I_MECHANISM, 5]], name: 'Titan Fist' },
    { station: 'anvil', result: I_PLAGUE_SCYTHE, rAmt: 1, ingredients: [[I_PLAGUE_ESSENCE, 10], [I_CRIMSON_BAR, 6], [I_SPIDER_FANG, 5]], name: 'Plague Scythe' },
    { station: 'anvil', result: I_STORM_BOW, rAmt: 1, ingredients: [[I_STORM_CHARGE, 8], [I_FROST_BAR, 6], [T.WOOD, 10]], name: 'Storm Bow' },
    { station: 'anvil', result: I_RAVAGER_CLAW, rAmt: 1, ingredients: [[I_BONE_FRAG, 15], [I_IRON_BAR, 8], [I_GUNPOWDER, 5]], name: 'Ravager Claw' },
    { station: 'anvil', result: I_HIVEMIND_STAFF, rAmt: 1, ingredients: [[I_SOUL_FRAGMENT, 8], [I_MUSHROOM_SPORE, 10], [I_LENS, 5]], name: 'Hivemind Staff' },
    // ===== PHASE 6: FISHING RECIPES =====
    { station: 'workbench', result: I_WOOD_ROD, rAmt: 1, ingredients: [[T.WOOD, 8], [T.COBWEB, 5]], name: 'Wood Fishing Rod' },
    { station: 'anvil', result: I_IRON_ROD, rAmt: 1, ingredients: [[I_IRON_BAR, 6], [T.COBWEB, 8]], name: 'Iron Fishing Rod' },
    { station: 'anvil', result: I_GOLD_ROD, rAmt: 1, ingredients: [[I_GOLD_BAR, 8], [T.COBWEB, 10]], name: 'Gold Fishing Rod' },
    { station: 'anvil', result: I_CRIMSON_ROD, rAmt: 1, ingredients: [[I_CRIMSON_BAR, 6], [I_GOLD_BAR, 4]], name: 'Crimson Fishing Rod' },
    { result: I_SUSHI, rAmt: 2, ingredients: [[I_BASS, 1], [I_TROUT, 1]], name: 'Sushi' },
    // ===== PHASE 6: STATUS POTIONS =====
    { station: 'workbench', result: I_RAGE_POTION, rAmt: 1, ingredients: [[I_MUSHROOM_SPORE, 3], [I_LENS, 2], [T.HELLSTONE, 2]], name: 'Rage Potion' },
    { station: 'workbench', result: I_SHIELD_POTION, rAmt: 1, ingredients: [[I_IRON_BAR, 3], [I_FROST_BAR, 2]], name: 'Shield Potion' },
    { station: 'workbench', result: I_THORNS_POTION, rAmt: 1, ingredients: [[I_JUNGLE_SPORE, 3], [I_MUSHROOM_SPORE, 2]], name: 'Thorns Potion' },
    { station: 'workbench', result: I_HASTE_POTION, rAmt: 1, ingredients: [[I_GOLD_BAR, 2], [I_LENS, 3]], name: 'Haste Potion' },
    { station: 'workbench', result: I_INVIS_POTION, rAmt: 1, ingredients: [[I_SOUL_FRAGMENT, 3], [I_LENS, 2]], name: 'Invisibility Potion' },
    { station: 'workbench', result: I_POISON_FLASK, rAmt: 3, ingredients: [[I_JUNGLE_SPORE, 2], [T.GLASS, 1]], name: 'Poison Flask' },
    { station: 'workbench', result: I_FREEZE_BOMB, rAmt: 3, ingredients: [[I_FROST_BAR, 2], [T.GLASS, 1]], name: 'Freeze Bomb' },
    // ===== PHASE 6: WIRING =====
    { station: 'anvil', result: I_WIRE_ITEM, rAmt: 10, ingredients: [[I_IRON_BAR, 1]], name: 'Wire (10)' },
    { station: 'anvil', result: I_WRENCH, rAmt: 1, ingredients: [[I_IRON_BAR, 5]], name: 'Wrench' },
    { station: 'anvil', result: T.DART_TRAP, rAmt: 1, ingredients: [[I_IRON_BAR, 4], [T.STONE, 10]], name: 'Dart Trap' },
    { station: 'anvil', result: T.PRESSURE_PLATE, rAmt: 1, ingredients: [[I_IRON_BAR, 2], [T.STONE, 4]], name: 'Pressure Plate' },
    // ===== PHASE 7: BIOME WEAPONS =====
    { station: 'anvil', result: I_JUNGLE_SWORD, rAmt: 1, ingredients: [[I_JUNGLE_SPORE, 12], [I_IRON_BAR, 6], [T.BAMBOO, 8]], name: 'Jungle Blade' },
    { station: 'anvil', result: I_DESERT_BOOMERANG, rAmt: 1, ingredients: [[I_DESERT_FOSSIL, 10], [I_GOLD_BAR, 4], [T.SANDSTONE, 8]], name: 'Sand Boomerang' },
    { station: 'anvil', result: I_BLEED_KNIFE, rAmt: 1, ingredients: [[I_CRIMSON_BAR, 6], [I_BONE_FRAG, 8]], name: 'Serrated Knife' },
    // ===== PHASE 7: ACCESSORIES =====
    { station: 'anvil', result: I_LIFESTEAL_RING, rAmt: 1, ingredients: [[I_CRIMSON_BAR, 8], [I_SOUL_FRAGMENT, 5], [I_GOLD_BAR, 4]], name: 'Lifesteal Ring' },
    { station: 'anvil', result: I_THORNS_RING, rAmt: 1, ingredients: [[I_JUNGLE_SPORE, 8], [I_IRON_BAR, 6]], name: 'Thorns Ring' },
    { station: 'anvil', result: I_ANCHOR_CHARM, rAmt: 1, ingredients: [[I_IRON_BAR, 10], [I_GOLD_BAR, 5]], name: 'Anchor Charm' },
    { station: 'anvil', result: I_LAVA_CHARM, rAmt: 1, ingredients: [[T.HELLSTONE, 12], [T.OBSIDIAN, 8]], name: 'Lava Charm' },
    // ===== PHASE A: WHIP RECIPES =====
    { station: 'workbench', result: I_LEATHER_WHIP, rAmt: 1, ingredients: [[I_LEATHER, 6], [T.WOOD, 4]], name: 'Leather Whip' },
    { station: 'anvil', result: I_THORN_WHIP, rAmt: 1, ingredients: [[I_VINE, 8], [I_JUNGLE_SPORE, 6], [I_IRON_BAR, 3]], name: 'Thorn Whip' },
    { station: 'anvil', result: I_FLAME_WHIP, rAmt: 1, ingredients: [[T.HELLSTONE, 10], [I_IRON_BAR, 6], [I_LEATHER, 4]], name: 'Flame Whip' },
    // ===== PHASE A: SPEAR RECIPES =====
    { station: 'workbench', result: I_WOOD_SPEAR, rAmt: 1, ingredients: [[T.WOOD, 10], [T.STONE, 3]], name: 'Wood Spear' },
    { station: 'anvil', result: I_IRON_SPEAR, rAmt: 1, ingredients: [[I_IRON_BAR, 8], [T.WOOD, 4]], name: 'Iron Spear' },
    { station: 'anvil', result: I_MOLTEN_SPEAR, rAmt: 1, ingredients: [[T.HELLSTONE, 12], [I_IRON_BAR, 6], [I_INFERNAL_CORE, 2]], name: 'Molten Spear' },
    // ===== PHASE A: FLAIL RECIPES =====
    { station: 'anvil', result: I_BALL_CHAIN, rAmt: 1, ingredients: [[I_IRON_BAR, 10], [T.STONE, 8]], name: 'Ball and Chain' },
    // ===== PHASE A: BOOMERANG RECIPES =====
    { station: 'workbench', result: I_WOOD_BOOMERANG, rAmt: 1, ingredients: [[T.WOOD, 12], [I_IRON_BAR, 2]], name: 'Wood Boomerang' },
    { station: 'anvil', result: I_FLAME_BOOMERANG, rAmt: 1, ingredients: [[T.HELLSTONE, 8], [I_GOLD_BAR, 4], [I_IRON_BAR, 4]], name: 'Flame Boomerang' },
    // ===== PHASE A: YOYO RECIPES =====
    { station: 'workbench', result: I_WOOD_YOYO, rAmt: 1, ingredients: [[T.WOOD, 8], [T.COBWEB, 5]], name: 'Wood Yoyo' },
    // ===== PHASE A: LAUNCHER RECIPES =====
    { station: 'anvil', result: I_GRENADE_LAUNCHER, rAmt: 1, ingredients: [[I_IRON_BAR, 12], [I_GUNPOWDER, 8], [I_MECHANISM, 3]], name: 'Grenade Launcher' },
    { station: 'anvil', result: I_VOID_DEVASTATOR, rAmt: 1, ingredients: [[I_VOID_SHARD, 15], [I_TITAN_CORE, 5], [I_LEGENDARY_FRAGMENT, 3]], name: 'Void Devastator' },
    // ===== PHASE B: BOSS SUMMON RECIPES =====
    { station: 'workbench', result: I_ENCHANTED_ACORN, rAmt: 1, ingredients: [[T.WOOD, 10], [I_JUNGLE_SPORE, 5], [I_LENS, 3]], name: 'Enchanted Acorn' },
    { station: 'anvil', result: I_FROZEN_HEART, rAmt: 1, ingredients: [[I_ICE_SHARD, 10], [I_FROST_BAR, 5], [I_CRYO_CORE, 1]], name: 'Frozen Heart' },
    { station: 'anvil', result: I_SPIDER_QUEEN_EGG, rAmt: 1, ingredients: [[I_SPIDER_FANG, 5], [T.COBWEB, 10], [I_LENS, 3]], name: 'Spider Queen Egg' },
    { station: 'anvil', result: I_CELESTIAL_LENS_ITEM, rAmt: 1, ingredients: [[I_LENS, 5], [I_VOID_SHARD, 5], [I_SOUL_FRAGMENT, 3]], name: 'Celestial Lens' },
    { station: 'anvil', result: I_VOID_RIFT_STONE, rAmt: 1, ingredients: [[I_VOID_SHARD, 10], [I_ABYSSAL_SCALE, 5], [I_TITAN_CORE, 3]], name: 'Void Rift Stone' },
    { station: 'anvil', result: I_CELESTIAL_SIGIL, rAmt: 1, ingredients: [[I_SOUL_FRAGMENT, 5], [I_VOID_SHARD, 5], [I_STORM_CHARGE, 5], [I_TITAN_CORE, 5]], name: 'Celestial Sigil' },
    // ===== PHASE A: ARMOR SET RECIPES =====
    { station: 'anvil', result: I_BARK_HELM, rAmt: 1, ingredients: [[I_BARK_PLATE, 8], [T.WOOD, 10]], name: 'Bark Helmet' },
    { station: 'anvil', result: I_BARK_CHEST, rAmt: 1, ingredients: [[I_BARK_PLATE, 12], [T.WOOD, 15]], name: 'Bark Chestplate' },
    { station: 'anvil', result: I_SPORE_HELM, rAmt: 1, ingredients: [[I_MUSHROOM_SPORE, 10], [I_IRON_BAR, 5]], name: 'Spore Helmet' },
    { station: 'anvil', result: I_SPORE_CHEST, rAmt: 1, ingredients: [[I_MUSHROOM_SPORE, 15], [I_IRON_BAR, 8]], name: 'Spore Chestplate' },
    { station: 'anvil', result: I_LUNAR_HELM, rAmt: 1, ingredients: [[I_LUNAR_SHARD, 12], [I_CELESTIAL_FRAGMENT, 5]], name: 'Lunar Helmet' },
    { station: 'anvil', result: I_LUNAR_CHEST, rAmt: 1, ingredients: [[I_LUNAR_SHARD, 18], [I_CELESTIAL_FRAGMENT, 8]], name: 'Lunar Chestplate' },
    // ===== WORLD EVIL RECIPES =====
    // Demonite (Corruption)
    { station: 'furnace', result: I_DEMONITE_BAR, rAmt: 1, ingredients: [[T.DEMONITE_ORE, 3]], name: 'Demonite Bar' },
    { station: 'anvil', result: I_DEMONITE_PICK, rAmt: 1, ingredients: [[I_DEMONITE_BAR, 10], [I_SHADOW_SCALE, 5]], name: 'Demonite Pickaxe' },
    { station: 'anvil', result: I_DEMONITE_SWORD, rAmt: 1, ingredients: [[I_DEMONITE_BAR, 8], [I_SHADOW_SCALE, 4]], name: 'Demonite Blade' },
    { station: 'anvil', result: I_DEMONITE_BOW, rAmt: 1, ingredients: [[I_DEMONITE_BAR, 6], [I_SHADOW_SCALE, 3]], name: 'Demonite Bow' },
    { station: 'anvil', result: I_DEMONITE_HELM, rAmt: 1, ingredients: [[I_DEMONITE_BAR, 12], [I_SHADOW_SCALE, 6]], name: 'Demonite Helmet' },
    { station: 'anvil', result: I_DEMONITE_CHEST, rAmt: 1, ingredients: [[I_DEMONITE_BAR, 18], [I_SHADOW_SCALE, 10]], name: 'Demonite Chestplate' },
    { station: 'altar', result: I_WORM_FOOD, rAmt: 1, ingredients: [[I_SHADOW_SCALE, 6], [T.CORRUPTION, 5]], name: 'Worm Food' },
    // Crimtane (Crimson)
    { station: 'furnace', result: I_CRIMTANE_BAR, rAmt: 1, ingredients: [[T.CRIMTANE_ORE, 3]], name: 'Crimtane Bar' },
    { station: 'anvil', result: I_CRIMTANE_PICK, rAmt: 1, ingredients: [[I_CRIMTANE_BAR, 10], [I_TISSUE_SAMPLE, 5]], name: 'Crimtane Pickaxe' },
    { station: 'anvil', result: I_CRIMTANE_SWORD, rAmt: 1, ingredients: [[I_CRIMTANE_BAR, 8], [I_TISSUE_SAMPLE, 4]], name: 'Crimtane Blade' },
    { station: 'anvil', result: I_CRIMTANE_BOW, rAmt: 1, ingredients: [[I_CRIMTANE_BAR, 6], [I_TISSUE_SAMPLE, 3]], name: 'Crimtane Bow' },
    { station: 'anvil', result: I_CRIMTANE_HELM, rAmt: 1, ingredients: [[I_CRIMTANE_BAR, 12], [I_TISSUE_SAMPLE, 6]], name: 'Crimtane Helmet' },
    { station: 'anvil', result: I_CRIMTANE_CHEST, rAmt: 1, ingredients: [[I_CRIMTANE_BAR, 18], [I_TISSUE_SAMPLE, 10]], name: 'Crimtane Chestplate' },
    { station: 'altar', result: I_BLOODY_SPINE, rAmt: 1, ingredients: [[I_TISSUE_SAMPLE, 6], [T.BLOOD, 5]], name: 'Bloody Spine' },
    // Voidite (Void)
    { station: 'furnace', result: I_VOIDITE_BAR, rAmt: 1, ingredients: [[T.VOIDITE_ORE, 3]], name: 'Voidite Bar' },
    { station: 'anvil', result: I_VOIDITE_PICK, rAmt: 1, ingredients: [[I_VOIDITE_BAR, 10], [I_VOID_ESSENCE, 5]], name: 'Voidite Pickaxe' },
    { station: 'anvil', result: I_VOIDITE_SWORD, rAmt: 1, ingredients: [[I_VOIDITE_BAR, 8], [I_VOID_ESSENCE, 4]], name: 'Voidite Blade' },
    { station: 'anvil', result: I_VOIDITE_BOW, rAmt: 1, ingredients: [[I_VOIDITE_BAR, 6], [I_VOID_ESSENCE, 3]], name: 'Voidite Bow' },
    { station: 'anvil', result: I_VOIDITE_HELM, rAmt: 1, ingredients: [[I_VOIDITE_BAR, 12], [I_VOID_ESSENCE, 6]], name: 'Voidite Helmet' },
    { station: 'anvil', result: I_VOIDITE_CHEST, rAmt: 1, ingredients: [[I_VOIDITE_BAR, 18], [I_VOID_ESSENCE, 10]], name: 'Voidite Chestplate' },
    { station: 'altar', result: I_VOID_BEACON, rAmt: 1, ingredients: [[I_VOID_ESSENCE, 6], [T.ANTI_GRAVITY_CRYSTAL, 3]], name: 'Void Beacon' },
    // ===== SURFACE BIOME RECIPES =====
    // Desert
    { station: 'workbench', result: I_DESERT_SCIMITAR, rAmt: 1, ingredients: [[I_ANTLION_MANDIBLE, 8], [I_FOSSIL_SHARD, 4]], name: 'Desert Scimitar' },
    { station: 'anvil', result: I_FOSSIL_PICK, rAmt: 1, ingredients: [[I_FOSSIL_SHARD, 12], [I_ANTLION_MANDIBLE, 5]], name: 'Fossil Pickaxe' },
    { station: 'anvil', result: I_ANCIENT_HELM, rAmt: 1, ingredients: [[I_ANCIENT_CLOTH, 8], [I_FOSSIL_SHARD, 5]], name: 'Ancient Pharaoh Mask' },
    { station: 'anvil', result: I_ANCIENT_CHEST, rAmt: 1, ingredients: [[I_ANCIENT_CLOTH, 12], [I_FOSSIL_SHARD, 8]], name: 'Ancient Robes' },
    { station: 'anvil', result: I_DESERT_EAGLE, rAmt: 1, ingredients: [[I_ANTLION_MANDIBLE, 10], [I_IRON_BAR, 8]], name: 'Desert Eagle' },
    { station: 'workbench', result: I_SANDSTORM_BOTTLE, rAmt: 1, ingredients: [[I_ANTLION_MANDIBLE, 5], [T.SAND, 20]], name: 'Sandstorm in a Bottle' },
    { station: 'anvil', result: I_PHARAOH_SUMMON, rAmt: 1, ingredients: [[I_FOSSIL_SHARD, 10], [I_ANCIENT_CLOTH, 5]], name: 'Scarab Amulet' },
    // Snow/Ice
    { station: 'anvil', result: I_ICE_BLADE, rAmt: 1, ingredients: [[I_FROST_CORE, 8], [T.ICE, 15]], name: 'Ice Blade' },
    { station: 'workbench', result: I_FROSTBURN_BOW, rAmt: 1, ingredients: [[I_FROST_CORE, 6], [T.BOREAL_WOOD, 10]], name: 'Frostburn Bow' },
    { station: 'workbench', result: I_BOREAL_SWORD, rAmt: 1, ingredients: [[T.BOREAL_WOOD, 12]], name: 'Boreal Blade' },
    { station: 'workbench', result: I_BLIZZARD_BOTTLE, rAmt: 1, ingredients: [[I_FROST_CORE, 5], [T.SNOW, 20]], name: 'Blizzard in a Bottle' },
    { station: 'anvil', result: I_ICE_SKATES, rAmt: 1, ingredients: [[I_FROST_CORE, 6], [I_IRON_BAR, 5]], name: 'Ice Skates' },
    { station: 'anvil', result: I_FROST_STAFF, rAmt: 1, ingredients: [[I_FROST_CORE, 10], [T.ICE, 20]], name: 'Frost Staff' },
    { station: 'anvil', result: I_CRYO_SUMMON, rAmt: 1, ingredients: [[I_FROST_CORE, 15], [T.ICE, 30]], name: 'Frost Crown' },
    // Jungle
    { station: 'anvil', result: I_BLADE_OF_GRASS, rAmt: 1, ingredients: [[I_STINGER, 10], [I_JUNGLE_SPORES, 8], [I_VINE, 3]], name: 'Blade of Grass' },
    { station: 'anvil', result: I_BOOMSTICK, rAmt: 1, ingredients: [[T.MAHOGANY_WOOD, 10], [I_STINGER, 5]], name: 'Boomstick' },
    { station: 'anvil', result: I_IVY_WHIP, rAmt: 1, ingredients: [[I_VINE, 8], [I_JUNGLE_SPORES, 5]], name: 'Ivy Whip' },
    { station: 'anvil', result: I_JUNGLE_HELM, rAmt: 1, ingredients: [[I_JUNGLE_SPORES, 10], [I_STINGER, 6], [I_VINE, 3]], name: 'Jungle Hat' },
    { station: 'anvil', result: I_JUNGLE_CHEST, rAmt: 1, ingredients: [[I_JUNGLE_SPORES, 15], [I_STINGER, 8], [I_VINE, 5]], name: 'Jungle Shirt' },
    { station: 'anvil', result: I_THORN_CHAKRAM, rAmt: 1, ingredients: [[I_JUNGLE_SPORES, 8], [I_STINGER, 6]], name: 'Thorn Chakram' },
    { station: 'anvil', result: I_JUNGLE_SUMMON, rAmt: 1, ingredients: [[I_STINGER, 10], [T.BEEHIVE, 5], [T.HONEY_BLOCK, 5]], name: 'Abeemination' },
    // ===== SPACE BIOME RECIPES =====
    { station: 'furnace', result: I_METEORITE_BAR, rAmt: 1, ingredients: [[T.METEORITE, 3]], name: 'Meteorite Bar' },
    { station: 'furnace', result: I_LUMINITE_BAR, rAmt: 1, ingredients: [[T.LUMINITE, 4]], name: 'Luminite Bar' },
    { station: 'anvil', result: I_METEOR_STAFF, rAmt: 1, ingredients: [[I_METEORITE_BAR, 10], [I_METEOR_FRAGMENT, 5]], name: 'Meteor Staff' },
    { station: 'anvil', result: I_STAR_CANNON, rAmt: 1, ingredients: [[I_METEORITE_BAR, 15], [I_COSMIC_SHARD, 8]], name: 'Star Cannon' },
    { station: 'anvil', result: I_PHASE_BLADE, rAmt: 1, ingredients: [[I_LUMINITE_BAR, 12], [I_COSMIC_SHARD, 6]], name: 'Phase Blade' },
    { station: 'anvil', result: I_GRAVITY_GUN, rAmt: 1, ingredients: [[I_ALIEN_TECH, 10], [I_LUMINITE_BAR, 8]], name: 'Gravity Gun' },
    { station: 'anvil', result: I_NEBULA_BLAZE, rAmt: 1, ingredients: [[I_COSMIC_SHARD, 12], [I_LUMINITE_BAR, 10]], name: 'Nebula Blaze' },
    { station: 'anvil', result: I_LASER_DRILL, rAmt: 1, ingredients: [[I_LUMINITE_BAR, 15], [I_ALIEN_TECH, 8]], name: 'Laser Drill' },
    { station: 'anvil', result: I_SPACE_BLASTER, rAmt: 1, ingredients: [[I_METEORITE_BAR, 8], [I_ALIEN_TECH, 4]], name: 'Space Blaster' },
    { station: 'anvil', result: I_SPACE_HELM, rAmt: 1, ingredients: [[I_LUMINITE_BAR, 10], [T.SPACE_GLASS, 5]], name: 'Space Helmet' },
    { station: 'anvil', result: I_SPACE_SUIT, rAmt: 1, ingredients: [[I_LUMINITE_BAR, 15], [I_ALIEN_TECH, 8]], name: 'Space Suit' },
    { station: 'anvil', result: I_SPACE_BOOTS, rAmt: 1, ingredients: [[I_LUMINITE_BAR, 8], [I_ALIEN_TECH, 4]], name: 'Gravity Boots' },
    { station: 'anvil', result: I_OXYGEN_TANK, rAmt: 1, ingredients: [[I_IRON_BAR, 10], [T.SPACE_GLASS, 8]], name: 'Oxygen Tank' },
    { station: 'workbench', result: I_ROCKET_FUEL, rAmt: 3, ingredients: [[T.HELLSTONE, 5], [T.OBSIDIAN, 3]], name: 'Rocket Fuel' },
    { station: 'anvil', result: I_STAR_SIGNAL, rAmt: 1, ingredients: [[I_ALIEN_TECH, 15], [I_COSMIC_SHARD, 10]], name: 'Distress Signal' },
    { station: 'anvil', result: I_JETPACK, rAmt: 1, ingredients: [[I_METEORITE_BAR, 12], [I_ROCKET_FUEL, 5], [I_ALIEN_TECH, 6]], name: 'Jetpack' },
    // ===== HARDMODE RECIPES =====
    { station: 'furnace', result: I_COBALT_BAR, rAmt: 1, ingredients: [[T.COBALT_ORE, 3]], name: 'Cobalt Bar' },
    { station: 'furnace', result: I_MYTHRIL_BAR, rAmt: 1, ingredients: [[T.MYTHRIL_ORE, 4]], name: 'Mythril Bar' },
    { station: 'furnace', result: I_TITANIUM_BAR, rAmt: 1, ingredients: [[T.TITANIUM_ORE, 5]], name: 'Titanium Bar' },
    { station: 'anvil', result: I_COBALT_SWORD, rAmt: 1, ingredients: [[I_COBALT_BAR, 10]], name: 'Cobalt Sword' },
    { station: 'anvil', result: I_COBALT_PICK, rAmt: 1, ingredients: [[I_COBALT_BAR, 12]], name: 'Cobalt Pickaxe' },
    { station: 'anvil', result: I_COBALT_HELM, rAmt: 1, ingredients: [[I_COBALT_BAR, 10]], name: 'Cobalt Helmet' },
    { station: 'anvil', result: I_COBALT_CHEST, rAmt: 1, ingredients: [[I_COBALT_BAR, 15]], name: 'Cobalt Breastplate' },
    { station: 'anvil', result: I_MYTHRIL_HALBERD, rAmt: 1, ingredients: [[I_MYTHRIL_BAR, 12]], name: 'Mythril Halberd' },
    { station: 'anvil', result: I_MYTHRIL_PICK, rAmt: 1, ingredients: [[I_MYTHRIL_BAR, 14]], name: 'Mythril Pickaxe' },
    { station: 'anvil', result: I_MYTHRIL_HELM, rAmt: 1, ingredients: [[I_MYTHRIL_BAR, 10]], name: 'Mythril Helmet' },
    { station: 'anvil', result: I_MYTHRIL_CHEST, rAmt: 1, ingredients: [[I_MYTHRIL_BAR, 18]], name: 'Mythril Chainmail' },
    { station: 'anvil', result: I_TITANIUM_SWORD, rAmt: 1, ingredients: [[I_TITANIUM_BAR, 14]], name: 'Titanium Sword' },
    { station: 'anvil', result: I_TITANIUM_PICK, rAmt: 1, ingredients: [[I_TITANIUM_BAR, 16]], name: 'Titanium Pickaxe' },
    { station: 'anvil', result: I_TITANIUM_HELM, rAmt: 1, ingredients: [[I_TITANIUM_BAR, 12]], name: 'Titanium Helmet' },
    { station: 'anvil', result: I_TITANIUM_CHEST, rAmt: 1, ingredients: [[I_TITANIUM_BAR, 20]], name: 'Titanium Breastplate' },
    { station: 'anvil', result: I_EXCALIBUR_HM, rAmt: 1, ingredients: [[I_HALLOWED_BAR, 15], [I_SOUL_OF_MIGHT, 5]], name: 'Hallowed Excalibur' },
    { station: 'anvil', result: I_HALLOWED_REPEATER, rAmt: 1, ingredients: [[I_HALLOWED_BAR, 15], [I_SOUL_OF_SIGHT, 5]], name: 'Hallowed Repeater' },
    { station: 'anvil', result: I_MEGASHARK, rAmt: 1, ingredients: [[I_HALLOWED_BAR, 12], [I_SOUL_OF_MIGHT, 5], [I_COBALT_BAR, 8]], name: 'Megashark' },
    { station: 'anvil', result: I_CRYSTAL_STORM, rAmt: 1, ingredients: [[I_CRYSTAL_SHARD_ITEM, 20], [I_SOUL_OF_SIGHT, 8]], name: 'Crystal Storm' },
    { station: 'anvil', result: I_RAINBOW_ROD, rAmt: 1, ingredients: [[I_CRYSTAL_SHARD_ITEM, 15], [I_SOUL_OF_SIGHT, 10], [I_HALLOWED_BAR, 8]], name: 'Rainbow Rod' },
    { station: 'anvil', result: I_DRAX, rAmt: 1, ingredients: [[I_HALLOWED_BAR, 18], [I_SOUL_OF_MIGHT, 5], [I_SOUL_OF_SIGHT, 5], [I_SOUL_OF_FRIGHT, 5]], name: 'Drax' },
    { station: 'anvil', result: I_HALLOWED_HELM, rAmt: 1, ingredients: [[I_HALLOWED_BAR, 12], [I_SOUL_OF_SIGHT, 3]], name: 'Hallowed Helmet' },
    { station: 'anvil', result: I_HALLOWED_CHEST, rAmt: 1, ingredients: [[I_HALLOWED_BAR, 20], [I_SOUL_OF_MIGHT, 5]], name: 'Hallowed Plate Mail' },
    { station: 'anvil', result: I_WORM_FOOD_HM, rAmt: 1, ingredients: [[I_IRON_BAR, 15], [I_SOUL_OF_MIGHT, 3]], name: 'Mechanical Worm' },
    { station: 'anvil', result: I_TWINS_SUMMON, rAmt: 1, ingredients: [[I_IRON_BAR, 15], [I_SOUL_OF_SIGHT, 3]], name: 'Mechanical Eye' },
    { station: 'anvil', result: I_PRIME_SUMMON, rAmt: 1, ingredients: [[I_IRON_BAR, 15], [I_SOUL_OF_FRIGHT, 3]], name: 'Mechanical Skull' },
    // ===== PHASE 5 RECIPES =====
    { station: 'furnace', result: I_CHLOROPHYTE_BAR, rAmt: 1, ingredients: [[T.MUD, 5], [T.JUNGLE_GRASS, 3]], name: 'Chlorophyte Bar' },
    { station: 'furnace', result: I_SHROOMITE_BAR, rAmt: 1, ingredients: [[I_CHLOROPHYTE_BAR, 5], [T.MUSHROOM, 10]], name: 'Shroomite Bar' },
    { station: 'anvil', result: I_CHLOROPHYTE_HELM, rAmt: 1, ingredients: [[I_CHLOROPHYTE_BAR, 12]], name: 'Chlorophyte Headpiece' },
    { station: 'anvil', result: I_CHLOROPHYTE_CHEST, rAmt: 1, ingredients: [[I_CHLOROPHYTE_BAR, 18]], name: 'Chlorophyte Plate Mail' },
    { station: 'anvil', result: I_SPECTRE_HELM, rAmt: 1, ingredients: [[I_ECTOPLASM, 12], [I_CHLOROPHYTE_BAR, 10]], name: 'Spectre Hood' },
    { station: 'anvil', result: I_SPECTRE_CHEST, rAmt: 1, ingredients: [[I_ECTOPLASM, 18], [I_CHLOROPHYTE_BAR, 16]], name: 'Spectre Robe' },
    { station: 'anvil', result: I_SHROOMITE_HELM, rAmt: 1, ingredients: [[I_SHROOMITE_BAR, 12]], name: 'Shroomite Headgear' },
    { station: 'anvil', result: I_SHROOMITE_CHEST, rAmt: 1, ingredients: [[I_SHROOMITE_BAR, 18]], name: 'Shroomite Breastplate' },
    { station: 'anvil', result: I_BEETLE_HELM, rAmt: 1, ingredients: [[I_BEETLE_HUSK, 8], [I_TITANIUM_BAR, 10]], name: 'Beetle Helmet' },
    { station: 'anvil', result: I_BEETLE_CHEST, rAmt: 1, ingredients: [[I_BEETLE_HUSK, 12], [I_TITANIUM_BAR, 16]], name: 'Beetle Shell' },
    { station: 'anvil', result: I_TERRA_BLADE, rAmt: 1, ingredients: [[I_CHLOROPHYTE_BAR, 20], [I_SOUL_OF_MIGHT, 10], [I_SOUL_OF_SIGHT, 10], [I_SOUL_OF_FRIGHT, 10]], name: 'Terra Blade' },
    { station: 'anvil', result: I_PLANTERA_SUMMON, rAmt: 1, ingredients: [[I_CHLOROPHYTE_BAR, 8], [I_SOUL_OF_MIGHT, 5], [I_SOUL_OF_SIGHT, 5], [I_SOUL_OF_FRIGHT, 5]], name: 'Suspicious Bulb' },
    { station: 'workbench', result: I_TRUFFLE_WORM, rAmt: 1, ingredients: [[T.MUSHROOM, 15], [I_CHLOROPHYTE_BAR, 3]], name: 'Truffle Worm' },
    // ===== PHASE 6 RECIPES =====
    { station: 'anvil', result: I_SOLAR_ERUPTION, rAmt: 1, ingredients: [[I_SOLAR_FRAGMENT, 18]], name: 'Solar Eruption' },
    { station: 'anvil', result: I_DAYBREAK, rAmt: 1, ingredients: [[I_SOLAR_FRAGMENT, 18]], name: 'Daybreak' },
    { station: 'anvil', result: I_VORTEX_BEATER, rAmt: 1, ingredients: [[I_VORTEX_FRAGMENT, 18]], name: 'Vortex Beater' },
    { station: 'anvil', result: I_PHANTASM, rAmt: 1, ingredients: [[I_VORTEX_FRAGMENT, 18]], name: 'Phantasm' },
    { station: 'anvil', result: I_NEBULA_ARCANUM, rAmt: 1, ingredients: [[I_NEBULA_FRAGMENT, 18]], name: 'Nebula Arcanum' },
    { station: 'anvil', result: I_NEBULA_BLAZE_P6, rAmt: 1, ingredients: [[I_NEBULA_FRAGMENT, 18]], name: 'Nebula Blaze' },
    { station: 'anvil', result: I_STARDUST_DRAGON, rAmt: 1, ingredients: [[I_STARDUST_FRAGMENT, 18]], name: 'Stardust Dragon Staff' },
    { station: 'anvil', result: I_STARDUST_CELL, rAmt: 1, ingredients: [[I_STARDUST_FRAGMENT, 18]], name: 'Stardust Cell Staff' },
    { station: 'anvil', result: I_SOLAR_HELM, rAmt: 1, ingredients: [[I_SOLAR_FRAGMENT, 10], [I_LUMINITE_BAR, 8]], name: 'Solar Flare Helmet' },
    { station: 'anvil', result: I_SOLAR_CHEST_ARMOR, rAmt: 1, ingredients: [[I_SOLAR_FRAGMENT, 16], [I_LUMINITE_BAR, 12]], name: 'Solar Flare Breastplate' },
    { station: 'anvil', result: I_VORTEX_HELM, rAmt: 1, ingredients: [[I_VORTEX_FRAGMENT, 10], [I_LUMINITE_BAR, 8]], name: 'Vortex Helmet' },
    { station: 'anvil', result: I_VORTEX_CHEST, rAmt: 1, ingredients: [[I_VORTEX_FRAGMENT, 16], [I_LUMINITE_BAR, 12]], name: 'Vortex Breastplate' },
    { station: 'anvil', result: I_NEBULA_HELM, rAmt: 1, ingredients: [[I_NEBULA_FRAGMENT, 10], [I_LUMINITE_BAR, 8]], name: 'Nebula Helmet' },
    { station: 'anvil', result: I_NEBULA_CHEST, rAmt: 1, ingredients: [[I_NEBULA_FRAGMENT, 16], [I_LUMINITE_BAR, 12]], name: 'Nebula Breastplate' },
    { station: 'anvil', result: I_STARDUST_HELM, rAmt: 1, ingredients: [[I_STARDUST_FRAGMENT, 10], [I_LUMINITE_BAR, 8]], name: 'Stardust Helmet' },
    { station: 'anvil', result: I_STARDUST_CHEST, rAmt: 1, ingredients: [[I_STARDUST_FRAGMENT, 16], [I_LUMINITE_BAR, 12]], name: 'Stardust Breastplate' },
    { station: 'anvil', result: I_CELESTIAL_SIGIL_P6, rAmt: 1, ingredients: [[I_SOLAR_FRAGMENT, 12], [I_VORTEX_FRAGMENT, 12], [I_NEBULA_FRAGMENT, 12], [I_STARDUST_FRAGMENT, 12]], name: 'Celestial Sigil' },
    // ===== PHASE 7 RECIPES =====
    { station: 'alchemy', result: I_IRONSKIN_POT, rAmt: 1, ingredients: [[I_DAYBLOOM, 1], [I_IRON_BAR, 1], [I_BOTTLE, 1]], name: 'Ironskin Potion' },
    { station: 'alchemy', result: I_REGEN_POT, rAmt: 1, ingredients: [[I_DAYBLOOM, 1], [I_MOONGLOW, 1], [I_BOTTLE, 1]], name: 'Regeneration Potion' },
    { station: 'alchemy', result: I_SWIFTNESS_POT, rAmt: 1, ingredients: [[I_BLINKROOT, 1], [I_BOTTLE, 1]], name: 'Swiftness Potion' },
    { station: 'alchemy', result: I_MINING_POT, rAmt: 1, ingredients: [[I_BLINKROOT, 1], [I_FIREBLOSSOM, 1], [I_BOTTLE, 1]], name: 'Mining Potion' },
    { station: 'alchemy', result: I_NIGHT_OWL_POT, rAmt: 1, ingredients: [[I_DAYBLOOM, 1], [I_BLINKROOT, 1], [I_BOTTLE, 1]], name: 'Night Owl Potion' },
    { station: 'alchemy', result: I_ENDURANCE_POT, rAmt: 1, ingredients: [[I_DEATHWEED, 1], [I_BLINKROOT, 1], [I_BOTTLE, 1]], name: 'Endurance Potion' },
    { station: 'alchemy', result: I_WRATH_POT, rAmt: 1, ingredients: [[I_DEATHWEED, 1], [I_FIREBLOSSOM, 1], [I_BOTTLE, 1]], name: 'Wrath Potion' },
    { station: 'alchemy', result: I_RAGE_POT, rAmt: 1, ingredients: [[I_DEATHWEED, 1], [I_MOONGLOW, 1], [I_BOTTLE, 1]], name: 'Rage Potion' },
    { station: 'alchemy', result: I_LIFEFORCE_POT, rAmt: 1, ingredients: [[I_MOONGLOW, 1], [I_SHIVERTHORN, 1], [I_WATERLEAF, 1], [I_BOTTLE, 1]], name: 'Lifeforce Potion' },
    { station: 'alchemy', result: I_MANA_REGEN_POT, rAmt: 1, ingredients: [[I_MOONGLOW, 1], [I_DAYBLOOM, 1], [I_BOTTLE, 1]], name: 'Mana Regen Potion' },
    { station: 'alchemy', result: I_SPELUNKER_POT, rAmt: 1, ingredients: [[I_BLINKROOT, 1], [I_MOONGLOW, 1], [I_GOLD_BAR, 1], [I_BOTTLE, 1]], name: 'Spelunker Potion' },
    { station: 'alchemy', result: I_HUNTER_POT, rAmt: 1, ingredients: [[I_BLINKROOT, 1], [I_DAYBLOOM, 1], [I_BOTTLE, 1]], name: 'Hunter Potion' },
    { station: 'alchemy', result: I_GRAVITATION_POT, rAmt: 1, ingredients: [[I_FIREBLOSSOM, 1], [I_DEATHWEED, 1], [I_BLINKROOT, 1], [I_BOTTLE, 1]], name: 'Gravitation Potion' },
    { station: 'alchemy', result: I_HEARTREACH_POT, rAmt: 1, ingredients: [[I_DAYBLOOM, 1], [I_SHIVERTHORN, 1], [I_BOTTLE, 1]], name: 'Heartreach Potion' },
    { station: 'alchemy', result: I_INFERNO_POT, rAmt: 1, ingredients: [[I_FIREBLOSSOM, 2], [I_BOTTLE, 1]], name: 'Inferno Potion' },
    { station: 'workbench', result: I_WOOD_ROD, rAmt: 1, ingredients: [[T.WOOD, 8]], name: 'Wood Fishing Rod' },
    { station: 'anvil', result: I_REINFORCED_ROD, rAmt: 1, ingredients: [[I_IRON_BAR, 8]], name: 'Reinforced Fishing Rod' },
    { station: 'anvil', result: I_GOLDEN_ROD, rAmt: 1, ingredients: [[I_GOLD_BAR, 15]], name: 'Golden Fishing Rod' },
    { station: 'anvil', result: I_HOTLINE_ROD, rAmt: 1, ingredients: [[I_HALLOWED_BAR, 10], [I_FIREBLOSSOM, 5]], name: 'Hotline Fishing Hook' },
    { station: 'workbench', result: I_BOTTLE, rAmt: 5, ingredients: [[T.SAND, 1]], name: 'Bottles' },
    { station: 'workbench', result: I_ALCHEMY_TABLE, rAmt: 1, ingredients: [[I_BOTTLE, 5], [T.WOOD, 10], [I_IRON_BAR, 3]], name: 'Alchemy Table' },
    // ===== PHASE 8 RECIPES =====
    // Wings
    { station: 'anvil', result: I_ANGEL_WINGS, rAmt: 1, ingredients: [[I_SOUL_OF_FRIGHT, 10], [I_SOUL_OF_MIGHT, 10], [I_SOUL_OF_SIGHT, 10]], name: 'Angel Wings' },
    { station: 'anvil', result: I_DEMON_WINGS, rAmt: 1, ingredients: [[I_SOUL_OF_FRIGHT, 10], [I_SOUL_OF_MIGHT, 10], [I_SOUL_OF_SIGHT, 10]], name: 'Demon Wings' },
    { station: 'anvil', result: I_FAIRY_WINGS, rAmt: 1, ingredients: [[I_SOUL_OF_SIGHT, 15], [I_HALLOWED_BAR, 10]], name: 'Fairy Wings' },
    { station: 'anvil', result: I_FROZEN_WINGS, rAmt: 1, ingredients: [[I_SOUL_OF_FRIGHT, 15], [I_HALLOWED_BAR, 10]], name: 'Frozen Wings' },
    { station: 'anvil', result: I_FLAME_WINGS, rAmt: 1, ingredients: [[I_SOUL_OF_MIGHT, 15], [I_HALLOWED_BAR, 10]], name: 'Flame Wings' },
    { station: 'anvil', result: I_LEAF_WINGS, rAmt: 1, ingredients: [[I_CHLOROPHYTE_BAR, 15]], name: 'Leaf Wings' },
    { station: 'anvil', result: I_HOVERBOARD, rAmt: 1, ingredients: [[I_SHROOMITE_BAR, 18]], name: 'Hoverboard' },
    { station: 'anvil', result: I_NEBULA_WINGS, rAmt: 1, ingredients: [[I_NEBULA_FRAGMENT, 14], [I_LUMINITE_BAR, 10]], name: 'Nebula Mantle' },
    { station: 'anvil', result: I_SOLAR_WINGS, rAmt: 1, ingredients: [[I_SOLAR_FRAGMENT, 14], [I_LUMINITE_BAR, 10]], name: 'Solar Wings' },
    // Advanced accessories
    { station: 'anvil', result: I_OBSIDIAN_SHIELD, rAmt: 1, ingredients: [[I_COBALT_SHIELD, 1], [I_IRON_BAR, 10]], name: 'Obsidian Shield' },
    { station: 'anvil', result: I_ANKH_SHIELD, rAmt: 1, ingredients: [[I_OBSIDIAN_SHIELD, 1], [I_ANKH_CHARM, 1]], name: 'Ankh Shield' },
    { station: 'anvil', result: I_ANKH_CHARM, rAmt: 1, ingredients: [[I_HALLOWED_BAR, 15], [I_SOUL_OF_FRIGHT, 10], [I_SOUL_OF_MIGHT, 10]], name: 'Ankh Charm' },
    { station: 'anvil', result: I_CELESTIAL_SHELL, rAmt: 1, ingredients: [[I_CELESTIAL_STONE, 1], [I_NEPTUNE_SHELL, 1], [I_MOON_STONE, 1]], name: 'Celestial Shell' },
    { station: 'anvil', result: I_CELESTIAL_STONE, rAmt: 1, ingredients: [[I_MOON_STONE, 1], [I_HALLOWED_BAR, 8]], name: 'Celestial Stone' },
    { station: 'anvil', result: I_FROSTSPARK, rAmt: 1, ingredients: [[I_LIGHTNING_BOOTS, 1], [I_IRON_BAR, 10]], name: 'Frostspark Boots' },
    { station: 'anvil', result: I_LIGHTNING_BOOTS, rAmt: 1, ingredients: [[I_IRON_BAR, 15], [I_GOLD_BAR, 10]], name: 'Lightning Boots' },
    { station: 'anvil', result: I_TERRASPARK, rAmt: 1, ingredients: [[I_FROSTSPARK, 1], [I_HALLOWED_BAR, 10]], name: 'Terraspark Boots' },
    { station: 'anvil', result: I_MASTER_NINJA, rAmt: 1, ingredients: [[I_HALLOWED_BAR, 15], [I_SOUL_OF_SIGHT, 10], [I_SOUL_OF_FRIGHT, 10]], name: 'Master Ninja Gear' },
    // Mounts
    { station: 'anvil', result: I_BEE_MOUNT, rAmt: 1, ingredients: [[I_HALLOWED_BAR, 10], [T.HIVE, 20]], name: 'Honeyed Goggles' },
    { station: 'anvil', result: I_UFO_MOUNT, rAmt: 1, ingredients: [[I_VORTEX_FRAGMENT, 18], [I_LUMINITE_BAR, 12]], name: 'Cosmic Car Key' },
    { station: 'anvil', result: I_DRILL_MOUNT, rAmt: 1, ingredients: [[I_LUMINITE_BAR, 40], [I_SOLAR_FRAGMENT, 10], [I_VORTEX_FRAGMENT, 10], [I_NEBULA_FRAGMENT, 10], [I_STARDUST_FRAGMENT, 10]], name: 'Drill Containment Unit' },
    // ===== PHASE 9 RECIPES =====
    { station: 'anvil', result: I_EMPTY_BUCKET, rAmt: 1, ingredients: [[I_IRON_BAR, 3]], name: 'Empty Bucket' },
    { station: 'workbench', result: I_SWITCH, rAmt: 1, ingredients: [[T.WOOD, 4], [I_IRON_BAR, 1]], name: 'Switch' },
    { station: 'workbench', result: I_LEVER, rAmt: 1, ingredients: [[T.WOOD, 5], [I_IRON_BAR, 2]], name: 'Lever' },
    { station: 'anvil', result: I_PRESSURE_PLATE, rAmt: 1, ingredients: [[I_IRON_BAR, 4]], name: 'Pressure Plate' },
    { station: 'anvil', result: I_TIMER_1S, rAmt: 1, ingredients: [[I_IRON_BAR, 5], [I_GOLD_BAR, 2]], name: '1 Second Timer' },
    { station: 'anvil', result: I_ACTUATOR_ITEM, rAmt: 5, ingredients: [[I_IRON_BAR, 2]], name: 'Actuators' },
    { station: 'anvil', result: I_TELEPORTER_ITEM, rAmt: 1, ingredients: [[I_IRON_BAR, 8], [I_GOLD_BAR, 5]], name: 'Teleporter' },
    { station: 'anvil', result: I_DART_TRAP_ITEM, rAmt: 1, ingredients: [[I_IRON_BAR, 5]], name: 'Dart Trap' },
    { station: 'anvil', result: I_SPEAR_TRAP_ITEM, rAmt: 1, ingredients: [[I_IRON_BAR, 8]], name: 'Spear Trap' },
    { station: 'anvil', result: I_FLAME_TRAP_ITEM, rAmt: 1, ingredients: [[I_IRON_BAR, 6], [I_GOLD_BAR, 3]], name: 'Flame Trap' },
    { station: 'anvil', result: I_WRENCH_RED, rAmt: 1, ingredients: [[I_IRON_BAR, 5]], name: 'Red Wrench' },
    { station: 'anvil', result: I_WRENCH_BLUE, rAmt: 1, ingredients: [[I_IRON_BAR, 5]], name: 'Blue Wrench' },
    { station: 'anvil', result: I_WRENCH_GREEN, rAmt: 1, ingredients: [[I_IRON_BAR, 5]], name: 'Green Wrench' },
    { station: 'anvil', result: I_WIRE_CUTTER, rAmt: 1, ingredients: [[I_IRON_BAR, 5], [I_GOLD_BAR, 2]], name: 'Wire Cutter' },
    { station: 'anvil', result: I_MULTICOLOR_WRENCH, rAmt: 1, ingredients: [[I_WRENCH_RED, 1], [I_WRENCH_BLUE, 1], [I_WRENCH_GREEN, 1]], name: 'Multicolor Wrench' },
    // ===== PHASE 10 RECIPES =====
    { station: 'anvil', result: I_BOSS_RUSH_TOKEN, rAmt: 1, ingredients: [[I_SOLAR_FRAGMENT, 5], [I_VORTEX_FRAGMENT, 5], [I_NEBULA_FRAGMENT, 5], [I_STARDUST_FRAGMENT, 5], [I_LUMINITE_BAR, 10]], name: 'Boss Rush Token' },
];

// ===== WORLD EVIL ARMOR SET BONUSES =====
ARMOR_SET_BONUSES.demonite = { helm: I_DEMONITE_HELM, chest: I_DEMONITE_CHEST, bonus: { meleeDmg: 0.10, moveSpeed: 0.10 }, name: 'Demonite Set', desc: '+10% melee, +10% speed' };
ARMOR_SET_BONUSES.crimtane = { helm: I_CRIMTANE_HELM, chest: I_CRIMTANE_CHEST, bonus: { critChance: 0.08, regenRate: 1 }, name: 'Crimtane Set', desc: '+8% crit, +1 regen/3s' };
ARMOR_SET_BONUSES.voidite = { helm: I_VOIDITE_HELM, chest: I_VOIDITE_CHEST, bonus: { allDmg: 0.08, lowGravity: true }, name: 'Voidite Set', desc: '+8% all dmg, reduced gravity' };
// ===== SURFACE BIOME ARMOR SET BONUSES =====
ARMOR_SET_BONUSES.ancient = { helm: I_ANCIENT_HELM, chest: I_ANCIENT_CHEST, bonus: { moveSpeed: 0.15, sandResist: true }, name: 'Ancient Set', desc: '+15% speed, sand immune' };
ARMOR_SET_BONUSES.frost_biome = { helm: I_FROST_HELM, chest: I_FROST_CHEST, bonus: { meleeDmg: 0.12, iceDmg: 0.15 }, name: 'Frost Set', desc: '+12% melee, +15% ice dmg' };
ARMOR_SET_BONUSES.jungle = { helm: I_JUNGLE_HELM, chest: I_JUNGLE_CHEST, bonus: { magicDmg: 0.12, manaReduction: 0.15 }, name: 'Jungle Set', desc: '+12% magic, -15% mana cost' };
// ===== SPACE ARMOR SET BONUS =====
ARMOR_SET_BONUSES.space = { helm: I_SPACE_HELM, chest: I_SPACE_SUIT, bonus: { allDmg: 0.10, oxygenBoost: true, spaceSpeed: 0.30 }, name: 'Space Set', desc: '+10% all dmg, infinite oxygen, +30% space speed' };
// ===== HARDMODE ARMOR SET BONUSES =====
ARMOR_SET_BONUSES.cobalt = { helm: I_COBALT_HELM, chest: I_COBALT_CHEST, bonus: { meleeDmg: 0.10, moveSpeed: 0.10 }, name: 'Cobalt Set', desc: '+10% melee, +10% speed' };
ARMOR_SET_BONUSES.mythril = { helm: I_MYTHRIL_HELM, chest: I_MYTHRIL_CHEST, bonus: { allDmg: 0.08, critChance: 0.08 }, name: 'Mythril Set', desc: '+8% all dmg, +8% crit' };
ARMOR_SET_BONUSES.titanium = { helm: I_TITANIUM_HELM, chest: I_TITANIUM_CHEST, bonus: { allDmg: 0.10, titaniumBarrier: true }, name: 'Titanium Set', desc: '+10% all dmg, titanium barrier on hit' };
ARMOR_SET_BONUSES.hallowed = { helm: I_HALLOWED_HELM, chest: I_HALLOWED_CHEST, bonus: { allDmg: 0.12, holyDodge: true, critChance: 0.10 }, name: 'Hallowed Set', desc: '+12% all dmg, +10% crit, holy dodge' };
// ===== PHASE 5 ARMOR SET BONUSES =====
ARMOR_SET_BONUSES.chlorophyte = { helm: I_CHLOROPHYTE_HELM, chest: I_CHLOROPHYTE_CHEST, bonus: { allDmg: 0.10, leafCrystal: true, defense: 5 }, name: 'Chlorophyte Set', desc: '+10% all dmg, +5 def, leaf crystal familiar' };
ARMOR_SET_BONUSES.spectre = { helm: I_SPECTRE_HELM, chest: I_SPECTRE_CHEST, bonus: { magicDmg: 0.15, lifesteal: 0.08, manaReduction: 0.15 }, name: 'Spectre Set', desc: '+15% magic, 8% lifesteal, -15% mana' };
ARMOR_SET_BONUSES.shroomite = { helm: I_SHROOMITE_HELM, chest: I_SHROOMITE_CHEST, bonus: { rangedDmg: 0.20, stealth: true, critChance: 0.10 }, name: 'Shroomite Set', desc: '+20% ranged, stealth, +10% crit' };
ARMOR_SET_BONUSES.beetle = { helm: I_BEETLE_HELM, chest: I_BEETLE_CHEST, bonus: { meleeDmg: 0.10, beetleEndurance: true, defense: 10 }, name: 'Beetle Set', desc: '+10% melee, +10 def, beetle endurance stacks' };
// ===== PHASE 6 ARMOR SET BONUSES =====
ARMOR_SET_BONUSES.solar_flare = { helm: I_SOLAR_HELM, chest: I_SOLAR_CHEST_ARMOR, bonus: { meleeDmg: 0.22, solarShield: true, defense: 5 }, name: 'Solar Flare Set', desc: '+22% melee, solar shield, +5 def' };
ARMOR_SET_BONUSES.vortex_set = { helm: I_VORTEX_HELM, chest: I_VORTEX_CHEST, bonus: { rangedDmg: 0.28, stealth: true, critChance: 0.12 }, name: 'Vortex Set', desc: '+28% ranged, stealth, +12% crit' };
ARMOR_SET_BONUSES.nebula_set = { helm: I_NEBULA_HELM, chest: I_NEBULA_CHEST, bonus: { magicDmg: 0.26, nebulaBoost: true, manaReduction: 0.20 }, name: 'Nebula Set', desc: '+26% magic, nebula boosters, -20% mana' };
ARMOR_SET_BONUSES.stardust_set = { helm: I_STARDUST_HELM, chest: I_STARDUST_CHEST, bonus: { summonDmg: 0.30, stardustGuard: true, minionSlots: 2 }, name: 'Stardust Set', desc: '+30% summon, stardust guardian, +2 minion slots' };

// ===== PHASE 7: NPC SYSTEM =====
// NPC_TYPES defined earlier — adding Phase 7 NPCs to it
const NPC_DEFS_P7 = {
    guide: {
        name: 'Guide', color: '#886644', w: 12, h: 26,
        requirement: 'always', dialog: 'Welcome! I can help you learn crafting recipes.',
        shop: []
    },
    merchant: {
        name: 'Merchant', color: '#FFD700', w: 12, h: 26,
        requirement: 'player_has_50_silver', dialog: 'Looking to buy something?',
        shop: [I_TORCH_ITEM, I_ROPE, I_LESSER_HEAL_POT, I_RECALL_POT]
    },
    nurse: {
        name: 'Nurse', color: '#FF88AA', w: 12, h: 26,
        requirement: 'health_crystal_used', dialog: 'Show me where it hurts.',
        shop: [I_LESSER_HEAL_POT, I_HEAL_POT, I_GREATER_HEAL_POT]
    },
    arms_dealer: {
        name: 'Arms Dealer', color: '#AA6633', w: 12, h: 26,
        requirement: 'has_gun', dialog: 'Want some ammo?',
        shop: []
    },
    demolitionist: {
        name: 'Demolitionist', color: '#FF4422', w: 12, h: 26,
        requirement: 'has_explosive', dialog: 'Kaboom!',
        shop: [I_TORCH_ITEM]
    },
    dryad: {
        name: 'Dryad', color: '#44BB44', w: 12, h: 26,
        requirement: 'boss_defeated', dialog: 'The world is in balance... for now.',
        shop: [I_PURIFICATION_POWDER, I_DAYBLOOM, I_BLINKROOT]
    },
    angler: {
        name: 'Angler', color: '#44AAFF', w: 12, h: 26,
        requirement: 'near_ocean', dialog: 'Catch me a quest fish!',
        shop: [I_WORM_BAIT, I_NIGHTCRAWLER, I_MASTER_BAIT]
    },
    goblin_tinkerer: {
        name: 'Goblin Tinkerer', color: '#44AA44', w: 12, h: 26,
        requirement: 'goblin_army_defeated', dialog: 'I can reforge your items! For a price...',
        shop: [I_REFORGE_ITEM, I_ROPE]
    },
    mechanic_npc: {
        name: 'Mechanic', color: '#FF6644', w: 12, h: 26,
        requirement: 'dungeon_explored', dialog: 'Need some wiring?',
        shop: [I_TORCH_ITEM]
    },
    wizard: {
        name: 'Wizard', color: '#6644AA', w: 12, h: 26,
        requirement: 'hardmode', dialog: 'Magical wares for sale!',
        shop: [I_MANA_REGEN_POT, I_SPELUNKER_POT, I_GRAVITATION_POT]
    },
    truffle_npc: {
        name: 'Truffle', color: '#8866AA', w: 12, h: 26,
        requirement: 'mushroom_biome_house', dialog: 'Shrooms for sale!',
        shop: [I_TRUFFLE_WORM]
    },
    stylist: {
        name: 'Stylist', color: '#FF88CC', w: 12, h: 26,
        requirement: 'spider_cave_found', dialog: 'New hairdo?',
        shop: [I_HAIR_DYE]
    },
};
const npcsP7 = []; // Active Phase 7 NPCs in world
function spawnNPC_P7(type, x, y) {
    if (!NPC_DEFS_P7[type]) return;
    const def = NPC_DEFS_P7[type];
    npcsP7.push({ type, name: def.name, x, y, w: def.w, h: def.h, color: def.color, vx: 0, vy: 0, dialog: def.dialog, shop: def.shop || [], animTimer: 0, dir: 1 });
}

// ===== PHASE 7: POTION BUFF SYSTEM =====
const activeBuffs = {};
function usePotion(potionItem) {
    if (!potionItem || !potionItem.buff) return;
    activeBuffs[potionItem.buff] = {
        name: potionItem.name,
        duration: potionItem.duration || 300000,
        startTime: Date.now(),
        effects: {}
    };
    const b = activeBuffs[potionItem.buff];
    if (potionItem.defense) b.effects.defense = potionItem.defense;
    if (potionItem.regenRate) b.effects.regenRate = potionItem.regenRate;
    if (potionItem.speedBoost) b.effects.speedBoost = potionItem.speedBoost;
    if (potionItem.mineSpeed) b.effects.mineSpeed = potionItem.mineSpeed;
    if (potionItem.lightRadius) b.effects.lightRadius = potionItem.lightRadius;
    if (potionItem.dmgReduction) b.effects.dmgReduction = potionItem.dmgReduction;
    if (potionItem.allDmg) b.effects.allDmg = potionItem.allDmg;
    if (potionItem.critChance) b.effects.critChance = potionItem.critChance;
    if (potionItem.maxHpBoost) b.effects.maxHpBoost = potionItem.maxHpBoost;
    if (potionItem.manaRegen) b.effects.manaRegen = potionItem.manaRegen;
    if (potionItem.oreGlow) b.effects.oreGlow = true;
    if (potionItem.enemyGlow) b.effects.enemyGlow = true;
    if (potionItem.flipGravity) b.effects.flipGravity = true;
    if (potionItem.fireAura) b.effects.fireAura = true;
}
function updateBuffs() {
    const now = Date.now();
    for (const key in activeBuffs) {
        if (now - activeBuffs[key].startTime >= activeBuffs[key].duration) {
            delete activeBuffs[key];
        }
    }
}
function getBuffBonus(stat) {
    let total = 0;
    for (const key in activeBuffs) {
        if (activeBuffs[key].effects[stat]) total += activeBuffs[key].effects[stat];
    }
    return total;
}

// ===== PHASE 7: FISHING SYSTEM =====
function fishAtLocation(rodItem, baitItem, biome) {
    if (!rodItem || !baitItem) return null;
    const fishPower = (rodItem.fishPower || 5) + (baitItem.baitPower || 10);
    const roll = Math.random() * 100;
    // Crate chance based on fish power
    if (roll < fishPower * 0.08) {
        if (fishPower >= 40) return I_GOLD_CRATE;
        if (fishPower >= 25) return I_IRON_CRATE;
        return I_WOOD_CRATE;
    }
    // Biome-specific fish
    if (biome === 'hallowed' && roll < 40) return I_PRISMITE;
    if (biome === 'abyss' && roll < 40) return I_OBSIDIFISH;
    if (biome === 'desert' && roll < 40) return I_FLAREFIN_KOI;
    // Common fish
    const commonRoll = Math.random();
    if (commonRoll < 0.4) return I_BASS;
    if (commonRoll < 0.7) return I_TROUT;
    return I_SALMON;
}
function openCrate(crateItem) {
    const loot = [];
    const tier = crateItem.tier || 1;
    // Ore drops
    if (tier >= 1) loot.push({ item: I_IRON_BAR, qty: 2 + Math.floor(Math.random() * 4) });
    if (tier >= 2) loot.push({ item: I_GOLD_BAR, qty: 1 + Math.floor(Math.random() * 3) });
    if (tier >= 3) loot.push({ item: I_HALLOWED_BAR, qty: 1 + Math.floor(Math.random() * 2) });
    // Potions
    if (Math.random() < 0.5) loot.push({ item: I_HEAL_POT, qty: 2 + Math.floor(Math.random() * 3) });
    if (Math.random() < 0.3) loot.push({ item: I_IRONSKIN_POT, qty: 1 });
    // Bait
    if (Math.random() < 0.4) loot.push({ item: I_WORM_BAIT, qty: 3 + Math.floor(Math.random() * 5) });
    return loot;
}

// ===== PHASE 8: MOUNT SYSTEM =====
let currentMount = null;
function mountPlayer(mountItem) {
    if (!mountItem || !mountItem.mount) return;
    currentMount = {
        type: mountItem.mount,
        speedBoost: mountItem.speedBoost || 0,
        jumpBoost: mountItem.jumpBoost || 0,
        flight: mountItem.flight || false,
        flightTime: mountItem.flightTime || 0,
        flightTimer: mountItem.flightTime || 0,
        mineSpeed: mountItem.mineSpeed || 0,
        ramDamage: mountItem.ramDamage || 0,
        waterSpeed: mountItem.waterSpeed || 0,
        animTimer: 0
    };
}
function dismountPlayer() { currentMount = null; }
function updateMount() {
    if (!currentMount) return;
    currentMount.animTimer++;
    if (typeof player !== 'undefined') {
        player.speedMod = 1 + currentMount.speedBoost;
        if (currentMount.flight && currentMount.flightTime === -1) {
            // Infinite flight
            player.canFly = true;
        } else if (currentMount.flight && currentMount.flightTimer > 0) {
            player.canFly = true;
            if (player.vy < 0) currentMount.flightTimer--;
        } else {
            player.canFly = false;
        }
    }
}

// ===== PHASE 8: PET SYSTEM =====
let activePetP8 = null;
function summonPet(petItem) {
    if (!petItem || !petItem.pet) return;
    activePetP8 = {
        type: petItem.pet,
        x: player ? player.x - 20 : 0,
        y: player ? player.y - 10 : 0,
        w: 10, h: 10,
        light: petItem.light || false,
        animTimer: 0,
        targetX: 0, targetY: 0
    };
}
function dismissPet() { activePetP8 = null; }
function updatePet() {
    if (!activePetP8 || typeof player === 'undefined') return;
    activePetP8.animTimer++;
    // Follow player with smooth lerp
    const offsetX = -20 + Math.sin(activePetP8.animTimer * 0.03) * 10;
    const offsetY = -15 + Math.cos(activePetP8.animTimer * 0.04) * 8;
    activePetP8.targetX = player.x + offsetX;
    activePetP8.targetY = player.y + offsetY;
    activePetP8.x += (activePetP8.targetX - activePetP8.x) * 0.08;
    activePetP8.y += (activePetP8.targetY - activePetP8.y) * 0.08;
}

// ===== PHASE 8: WING/FLIGHT SYSTEM =====
let equippedWings = null;
let wingFlightTimer = 0;
let wingMaxTime = 0;
function equipWings(wingItem) {
    if (!wingItem || wingItem.effect !== 'flight') return;
    equippedWings = wingItem;
    wingMaxTime = wingItem.flightTime || 100;
    wingFlightTimer = wingMaxTime;
}
function updateWings() {
    if (!equippedWings || typeof player === 'undefined') return;
    if (player.vy < 0 && wingFlightTimer > 0) {
        player.canFly = true;
        wingFlightTimer--;
    }
    // Recharge on ground
    if (player.onGround) {
        wingFlightTimer = wingMaxTime;
    }
    // Hover if supported
    if (equippedWings.hover && player.vy > 0 && wingFlightTimer > 0) {
        player.vy *= 0.5; // Slow fall
    }
}

// ===== PHASE 8: ACCESSORY EFFECTS =====
function applyAccessoryEffects() {
    if (typeof player === 'undefined') return;
    const inv = player.inventory || [];
    for (const item of inv) {
        if (!item || !item.effect) continue;
        switch (item.effect) {
            case 'dash':
                if (!player.dashCd || player.dashCd <= 0) {
                    player.canDash = true;
                    player.dashSpeed = item.dashSpeed || 8;
                }
                break;
            case 'knockback_immunity':
                player.knockbackImmune = true;
                break;
            case 'full_immunity':
                player.knockbackImmune = true;
                player.fireImmune = true;
                player.debuffImmune = true;
                break;
            case 'dash_dodge':
                player.canDash = true;
                player.dashSpeed = item.dashSpeed || 7;
                player.dodgeChance = item.dodgeChance || 0.10;
                break;
            case 'mega_speed':
                player.speedMod = (player.speedMod || 1) + (item.speedBoost || 0.4);
                player.lavaWalk = true;
                player.waterWalk = true;
                break;
            case 'ice_speed':
                player.speedMod = (player.speedMod || 1) + (item.speedBoost || 0.3);
                break;
            case 'lightning_speed':
                player.speedMod = (player.speedMod || 1) + (item.speedBoost || 0.35);
                break;
            case 'transform':
                player.allDmg = (player.allDmg || 0) + (item.allDmg || 0.10);
                player.defense = (player.defense || 0) + (item.defense || 4);
                break;
            case 'stat_boost':
                player.allDmg = (player.allDmg || 0) + (item.allDmg || 0.05);
                player.defense = (player.defense || 0) + (item.defense || 2);
                break;
        }
    }
}

// ===== PHASE 9: WEATHER SYSTEM =====
const WEATHER_LIST = ['clear', 'rain', 'thunderstorm', 'blizzard', 'sandstorm', 'blood_rain'];
let currentWeather = 'clear';
let weatherTimer = 0;
let weatherDuration = 0;
let lightningFlash = 0;
function updateWeather() {
    weatherTimer++;
    if (lightningFlash > 0) lightningFlash--;
    // Weather transition
    if (weatherTimer >= weatherDuration) {
        weatherTimer = 0;
        weatherDuration = 1800 + Math.floor(Math.random() * 3600); // 30s-90s
        const roll = Math.random();
        if (roll < 0.35) currentWeather = 'clear';
        else if (roll < 0.55) currentWeather = 'rain';
        else if (roll < 0.65) currentWeather = 'thunderstorm';
        else if (roll < 0.75) currentWeather = 'blizzard';
        else if (roll < 0.85) currentWeather = 'sandstorm';
        else currentWeather = 'blood_rain';
    }
    // Lightning during thunderstorms
    if (currentWeather === 'thunderstorm' && Math.random() < 0.003) {
        lightningFlash = 8;
        if (typeof triggerShake === 'function') triggerShake(4);
    }
}
function getWeatherEffects() {
    switch (currentWeather) {
        case 'rain': return { speedMod: -0.05, spawnMod: 1.1 };
        case 'thunderstorm': return { speedMod: -0.10, spawnMod: 1.3, visibility: 0.7 };
        case 'blizzard': return { speedMod: -0.15, spawnMod: 0.8, visibility: 0.5 };
        case 'sandstorm': return { speedMod: -0.20, spawnMod: 1.2, visibility: 0.6 };
        case 'blood_rain': return { speedMod: 0, spawnMod: 1.5, enemyDmgMod: 1.1 };
        default: return { speedMod: 0, spawnMod: 1.0 };
    }
}

// ===== PHASE 9: LIQUID PHYSICS =====
const LIQUID_TILES = [T.WATER, T.LAVA, T.HONEY];
function updateLiquids() {
    // Simple cellular automata liquid flow
    for (let x = 1; x < WORLD_W - 1; x++) {
        for (let y = WORLD_H - 2; y >= 0; y--) {
            const tile = getBlock(x, y);
            if (!LIQUID_TILES.includes(tile)) continue;
            // Flow down
            if (getBlock(x, y + 1) === T.AIR) {
                setBlock(x, y + 1, tile);
                setBlock(x, y, T.AIR);
                continue;
            }
            // Flow left/right
            const dir = Math.random() < 0.5 ? -1 : 1;
            if (getBlock(x + dir, y) === T.AIR && getBlock(x + dir, y + 1) !== T.AIR) {
                setBlock(x + dir, y, tile);
                setBlock(x, y, T.AIR);
            } else if (getBlock(x - dir, y) === T.AIR && getBlock(x - dir, y + 1) !== T.AIR) {
                setBlock(x - dir, y, tile);
                setBlock(x, y, T.AIR);
            }
        }
    }
    // Liquid interactions
    for (let x = 1; x < WORLD_W - 1; x++) {
        for (let y = 0; y < WORLD_H - 1; y++) {
            const tile = getBlock(x, y);
            if (tile === T.WATER) {
                // Water + Lava = Obsidian
                for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                    if (getBlock(x + dx, y + dy) === T.LAVA) {
                        setBlock(x, y, T.OBSIDIAN);
                        setBlock(x + dx, y + dy, T.STONE);
                        break;
                    }
                }
            }
            if (tile === T.WATER) {
                // Water + Honey = Honeyed Block
                for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                    if (getBlock(x + dx, y + dy) === T.HONEY) {
                        setBlock(x, y, T.HIVE);
                        setBlock(x + dx, y + dy, T.HIVE);
                        break;
                    }
                }
            }
        }
    }
}
function getLiquidEffects(playerX, playerY) {
    if (typeof getBlock !== 'function') return null;
    const tx = Math.floor(playerX / 8);
    const ty = Math.floor(playerY / 8);
    const tile = getBlock(tx, ty);
    if (tile === T.WATER) return { swimming: true, speedMod: -0.3, breathTimer: true };
    if (tile === T.LAVA) return { damage: 40, speedMod: -0.5, onFire: true };
    if (tile === T.HONEY) return { speedMod: -0.5, regenBoost: 3 };
    return null;
}

// ===== PHASE 9: WIRING SYSTEM =====
const wireGrid = {}; // key: 'x,y' -> { red: bool, blue: bool, green: bool, yellow: bool }
const wireSignals = {}; // key: 'x,y' -> { powered: bool, source: string }
function placeWire(x, y, color) {
    const key = x + ',' + y;
    if (!wireGrid[key]) wireGrid[key] = { red: false, blue: false, green: false, yellow: false };
    wireGrid[key][color] = true;
}
function removeWire(x, y, color) {
    const key = x + ',' + y;
    if (wireGrid[key]) {
        wireGrid[key][color] = false;
        if (!wireGrid[key].red && !wireGrid[key].blue && !wireGrid[key].green && !wireGrid[key].yellow) {
            delete wireGrid[key];
        }
    }
}
function toggleSwitch(x, y) {
    const key = x + ',' + y;
    const tile = getBlock(x, y);
    if (tile === T.SWITCH || tile === T.LEVER) {
        propagateSignal(x, y, !wireSignals[key]?.powered);
    }
}
function propagateSignal(startX, startY, powered) {
    const visited = new Set();
    const queue = [[startX, startY]];
    while (queue.length > 0) {
        const [x, y] = queue.shift();
        const key = x + ',' + y;
        if (visited.has(key)) continue;
        visited.add(key);
        wireSignals[key] = { powered, source: startX + ',' + startY };
        // Activate mechanisms at this position
        const tile = getBlock(x, y);
        if (tile === T.DART_TRAP && powered) {
            // Fire dart projectile
            if (typeof spawnProjectile === 'function') {
                spawnProjectile(x * 8, y * 8, 4, 0, 20, '#886644');
            }
        }
        if (tile === T.FLAME_TRAP && powered) {
            if (typeof spawnProjectile === 'function') {
                spawnProjectile(x * 8, y * 8, 0, -3, 35, '#FF6622');
            }
        }
        if (tile === T.SPEAR_TRAP && powered) {
            if (typeof spawnProjectile === 'function') {
                spawnProjectile(x * 8, y * 8, 3, 0, 30, '#88AACC');
            }
        }
        if (tile === T.ACTUATOR && powered) {
            // Toggle block above
            const above = getBlock(x, y - 1);
            if (above !== T.AIR) setBlock(x, y - 1, T.AIR);
        }
        // Follow wires to adjacent tiles
        if (wireGrid[key]) {
            for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                const nk = (x + dx) + ',' + (y + dy);
                if (!visited.has(nk) && wireGrid[nk]) {
                    // Check if any wire color connects
                    const cur = wireGrid[key];
                    const next = wireGrid[nk];
                    if ((cur.red && next.red) || (cur.blue && next.blue) ||
                        (cur.green && next.green) || (cur.yellow && next.yellow)) {
                        queue.push([x + dx, y + dy]);
                    }
                }
            }
        }
    }
}
function checkPressurePlates(playerX, playerY) {
    const tx = Math.floor(playerX / 8);
    const ty = Math.floor((playerY + 12) / 8); // feet level
    if (getBlock(tx, ty) === T.PRESSURE_PLATE) {
        propagateSignal(tx, ty, true);
    }
}
function updateTimers() {
    for (const key in wireGrid) {
        const [x, y] = key.split(',').map(Number);
        if (getBlock(x, y) === T.TIMER_TILE) {
            if (weatherTimer % 60 === 0) { // 1s timer
                propagateSignal(x, y, !wireSignals[key]?.powered);
            }
        }
    }
}
function findTeleporterPair(x, y) {
    // Find another teleporter connected by wire
    const key = x + ',' + y;
    if (!wireGrid[key]) return null;
    for (const wk in wireGrid) {
        if (wk === key) continue;
        const [tx, ty] = wk.split(',').map(Number);
        if (getBlock(tx, ty) === T.TELEPORTER) {
            // Check wire connection exists
            const cur = wireGrid[key];
            const target = wireGrid[wk];
            if ((cur.red && target.red) || (cur.blue && target.blue) ||
                (cur.green && target.green) || (cur.yellow && target.yellow)) {
                return { x: tx * 8, y: (ty - 2) * 8 };
            }
        }
    }
    return null;
}

// ===== PHASE 10: EXPERT MODE SYSTEM =====
let expertMode = false;
const EXPERT_SCALING = { hpMult: 2.0, dmgMult: 1.5, speedMult: 1.2, xpMult: 2.0, dropMult: 1.5 };
function toggleExpertMode() {
    expertMode = !expertMode;
    return expertMode;
}
function getExpertBossStats(baseBoss) {
    if (!expertMode) return baseBoss;
    return {
        ...baseBoss,
        hp: Math.floor(baseBoss.hp * EXPERT_SCALING.hpMult),
        damage: Math.floor(baseBoss.damage * EXPERT_SCALING.dmgMult),
        speed: baseBoss.speed * EXPERT_SCALING.speedMult,
        xp: Math.floor(baseBoss.xp * EXPERT_SCALING.xpMult),
        expert: true
    };
}
function getTreasureBag(bossType) {
    const bagMap = {
        eye_of_cthulhu: { bag: I_TREASURE_BAG_EOC, unique: I_SHIELD_CTHULHU },
        brain_of_cthulhu: { bag: I_TREASURE_BAG_BOC, unique: I_BRAIN_CONFUSION },
        eater_of_worlds: { bag: I_TREASURE_BAG_EOW, unique: I_WORM_SCARF },
        skeletron: { bag: I_TREASURE_BAG_SKELE, unique: I_BONE_GLOVE },
        wall_of_flesh: { bag: I_TREASURE_BAG_WOF, unique: I_DEMON_HEART_P10 },
        twins: { bag: I_TREASURE_BAG_TWINS, unique: I_SHINY_STONE },
        destroyer: { bag: I_TREASURE_BAG_DEST, unique: I_SHINY_STONE },
        skeletron_prime: { bag: I_TREASURE_BAG_PRIME, unique: I_SHINY_STONE },
        plantera: { bag: I_TREASURE_BAG_PLANT, unique: I_HIVE_PACK },
        golem: { bag: I_TREASURE_BAG_GOLEM, unique: I_ROYAL_GEL },
        duke_fishron: { bag: I_TREASURE_BAG_FISH, unique: I_SHINY_STONE },
        moon_lord: { bag: I_TREASURE_BAG_ML, unique: I_GRAVITY_GLOBE_P10 },
    };
    return bagMap[bossType] || null;
}
function openTreasureBag(bagItem) {
    if (!bagItem || !bagItem.boss) return [];
    const info = getTreasureBag(bagItem.boss);
    const loot = [];
    if (info && info.unique) loot.push({ item: info.unique, qty: 1 });
    loot.push({ item: I_GOLD_BAR, qty: 5 + Math.floor(Math.random() * 10) });
    if (Math.random() < 0.5) loot.push({ item: I_HALLOWED_BAR, qty: 3 + Math.floor(Math.random() * 5) });
    return loot;
}

// ===== PHASE 10: BOSS RUSH MODE =====
const BOSS_RUSH_ORDER = [
    'king_slime', 'eye_of_cthulhu', 'eater_of_worlds', 'brain_of_cthulhu',
    'queen_bee', 'skeletron', 'wall_of_flesh', 'twins',
    'destroyer', 'skeletron_prime', 'plantera', 'golem',
    'duke_fishron', 'moon_lord'
];
let bossRushActive = false;
let bossRushIndex = 0;
let bossRushTimer = 0;
let bossRushBestTime = Infinity;
function startBossRush() {
    bossRushActive = true;
    bossRushIndex = 0;
    bossRushTimer = 0;
    spawnBossRushBoss();
}
function spawnBossRushBoss() {
    if (bossRushIndex >= BOSS_RUSH_ORDER.length) {
        endBossRush(true);
        return;
    }
    const bossType = BOSS_RUSH_ORDER[bossRushIndex];
    if (typeof spawnBoss === 'function') spawnBoss(bossType);
}
function onBossRushBossDefeated() {
    if (!bossRushActive) return;
    bossRushIndex++;
    if (bossRushIndex >= BOSS_RUSH_ORDER.length) {
        endBossRush(true);
    } else {
        setTimeout(spawnBossRushBoss, 3000);
    }
}
function endBossRush(completed) {
    bossRushActive = false;
    if (completed) {
        if (bossRushTimer < bossRushBestTime) bossRushBestTime = bossRushTimer;
        if (typeof addItem === 'function') {
            addItem(I_CHAMPION_TROPHY, 1);
            addItem(I_CHAMPION_BLADE, 1);
        }
        unlockAchievement('boss_rush_complete');
    }
}
function updateBossRush() { if (bossRushActive) bossRushTimer++; }

// ===== PHASE 10: ACHIEVEMENT SYSTEM =====
const ACHIEVEMENTS = {
    // Exploration (10)
    first_step: { name: 'First Steps', desc: 'Move for the first time', icon: '👣', cat: 'explore' },
    spelunker: { name: 'Spelunker', desc: 'Reach cave layer', icon: '⛏️', cat: 'explore' },
    deep_diver: { name: 'Deep Diver', desc: 'Reach the abyss', icon: '🌊', cat: 'explore' },
    sky_walker: { name: 'Sky Walker', desc: 'Reach space biome', icon: '🌌', cat: 'explore' },
    jungle_explorer: { name: 'Jungle Explorer', desc: 'Enter the jungle', icon: '🌿', cat: 'explore' },
    desert_wanderer: { name: 'Desert Wanderer', desc: 'Enter the desert', icon: '🏜️', cat: 'explore' },
    snow_trekker: { name: 'Snow Trekker', desc: 'Enter the snow biome', icon: '❄️', cat: 'explore' },
    dungeon_delver: { name: 'Dungeon Delver', desc: 'Enter the dungeon', icon: '💀', cat: 'explore' },
    temple_raider: { name: 'Temple Raider', desc: 'Enter the temple', icon: '🏛️', cat: 'explore' },
    void_walker: { name: 'Void Walker', desc: 'Enter the void', icon: '🕳️', cat: 'explore' },
    // Combat (10)
    first_blood: { name: 'First Blood', desc: 'Defeat your first enemy', icon: '⚔️', cat: 'combat' },
    centurion: { name: 'Centurion', desc: 'Defeat 100 enemies', icon: '💯', cat: 'combat' },
    slayer: { name: 'Slayer', desc: 'Defeat 500 enemies', icon: '🗡️', cat: 'combat' },
    genocide: { name: 'Exterminator', desc: 'Defeat 1000 enemies', icon: '☠️', cat: 'combat' },
    boss_killer: { name: 'Boss Killer', desc: 'Defeat your first boss', icon: '👑', cat: 'combat' },
    mech_master: { name: 'Mechanical Master', desc: 'Defeat all mech bosses', icon: '⚙️', cat: 'combat' },
    hardmode_hero: { name: 'Hardmode Hero', desc: 'Defeat Wall of Flesh', icon: '🔥', cat: 'combat' },
    plantera_slayer: { name: 'Plantera Slayer', desc: 'Defeat Plantera', icon: '🌸', cat: 'combat' },
    moon_lord_vanq: { name: 'Moon Lord Vanquished', desc: 'Defeat Moon Lord', icon: '🌙', cat: 'combat' },
    boss_rush_complete: { name: 'Champion', desc: 'Complete Boss Rush', icon: '🏆', cat: 'combat' },
    // Crafting (10)
    first_craft: { name: 'Craftsman', desc: 'Craft your first item', icon: '🔨', cat: 'craft' },
    iron_age: { name: 'Iron Age', desc: 'Craft iron armor', icon: '🛡️', cat: 'craft' },
    golden_touch: { name: 'Golden Touch', desc: 'Craft gold armor', icon: '✨', cat: 'craft' },
    hallowed_craft: { name: 'Hallowed Crafter', desc: 'Craft hallowed items', icon: '👼', cat: 'craft' },
    lunar_smith: { name: 'Lunar Smith', desc: 'Craft a lunar weapon', icon: '🌟', cat: 'craft' },
    potion_brewer: { name: 'Potion Brewer', desc: 'Brew 10 potions', icon: '🧪', cat: 'craft' },
    master_angler: { name: 'Master Angler', desc: 'Catch 50 fish', icon: '🎣', cat: 'craft' },
    wired_up: { name: 'Wired Up', desc: 'Place 100 wires', icon: '⚡', cat: 'craft' },
    full_set: { name: 'Full Set', desc: 'Equip a complete armor set', icon: '🛡️', cat: 'craft' },
    reforged: { name: 'Reforged', desc: 'Reforge an item', icon: '🔧', cat: 'craft' },
    // Progression (5)
    npc_friend: { name: 'NPC Friend', desc: 'Spawn your first NPC', icon: '🏠', cat: 'prog' },
    hardmode_begin: { name: 'Hardmode Begins', desc: 'Enter Hardmode', icon: '💪', cat: 'prog' },
    celestial_event: { name: 'Celestial Event', desc: 'Trigger the Pillars', icon: '🌠', cat: 'prog' },
    expert_player: { name: 'Expert Player', desc: 'Enable Expert Mode', icon: '💎', cat: 'prog' },
    completionist: { name: 'Completionist', desc: 'Unlock all achievements', icon: '🎖️', cat: 'prog' },
    // Endgame (5)
    max_health: { name: 'Maximum Health', desc: 'Reach max HP', icon: '❤️', cat: 'end' },
    all_wings: { name: 'Wing Collector', desc: 'Craft all wing tiers', icon: '🪶', cat: 'end' },
    all_mounts: { name: 'Mount Collector', desc: 'Obtain all mounts', icon: '🐴', cat: 'end' },
    bestiary_complete: { name: 'Zoologist', desc: 'Complete the bestiary', icon: '📖', cat: 'end' },
    true_champion: { name: 'True Champion', desc: 'Expert Boss Rush <10 min', icon: '🏅', cat: 'end' },
};
const unlockedAchievements = {};
let achievementQueue = [];
function unlockAchievement(id) {
    if (unlockedAchievements[id]) return;
    if (!ACHIEVEMENTS[id]) return;
    unlockedAchievements[id] = { time: Date.now() };
    achievementQueue.push({ id, ...ACHIEVEMENTS[id] });
    if (Object.keys(unlockedAchievements).length >= Object.keys(ACHIEVEMENTS).length - 1) {
        unlockAchievement('completionist');
    }
}
function getAchievementProgress() {
    const total = Object.keys(ACHIEVEMENTS).length;
    const unlocked = Object.keys(unlockedAchievements).length;
    return { unlocked, total, percent: Math.floor((unlocked / total) * 100) };
}

// ===== PHASE 10: BESTIARY SYSTEM =====
const bestiary = {};
function registerKill(enemyType) {
    if (!bestiary[enemyType]) bestiary[enemyType] = { kills: 0, discovered: Date.now() };
    bestiary[enemyType].kills++;
    const totalKills = Object.values(bestiary).reduce((sum, e) => sum + e.kills, 0);
    if (totalKills >= 1) unlockAchievement('first_blood');
    if (totalKills >= 100) unlockAchievement('centurion');
    if (totalKills >= 500) unlockAchievement('slayer');
    if (totalKills >= 1000) unlockAchievement('genocide');
}
function getBestiaryEntry(enemyType) {
    if (!bestiary[enemyType]) return null;
    const entry = bestiary[enemyType];
    const enemyData = typeof ENEMY_DATA !== 'undefined' ? ENEMY_DATA[enemyType] : null;
    return {
        type: enemyType, kills: entry.kills, discovered: entry.discovered,
        name: enemyData ? enemyData.name : enemyType,
        hp: enemyData ? enemyData.hp : '???',
        damage: enemyData ? enemyData.damage : '???',
        drops: enemyData ? enemyData.drops : [],
    };
}
function getBestiaryCompletion() {
    const totalEnemies = typeof ENEMY_DATA !== 'undefined' ? Object.keys(ENEMY_DATA).length : 0;
    const discovered = Object.keys(bestiary).length;
    return { discovered, total: totalEnemies, percent: totalEnemies > 0 ? Math.floor((discovered / totalEnemies) * 100) : 0 };
}

// ===== PHASE 10: REFORGE SYSTEM =====
const REFORGE_MODIFIERS = {
    legendary: { name: 'Legendary', dmgMult: 1.15, speedMult: 1.10, critBonus: 0.05, kbMult: 1.15, tier: 5 },
    godly: { name: 'Godly', dmgMult: 1.15, critBonus: 0.05, kbMult: 1.15, tier: 5 },
    demonic: { name: 'Demonic', dmgMult: 1.15, critBonus: 0.05, tier: 4 },
    zealous: { name: 'Zealous', critBonus: 0.05, tier: 3 },
    ruthless: { name: 'Ruthless', dmgMult: 1.18, kbMult: 0.90, tier: 4 },
    unreal: { name: 'Unreal', dmgMult: 1.15, speedMult: 1.10, critBonus: 0.05, kbMult: 1.15, tier: 5 },
    mythical: { name: 'Mythical', dmgMult: 1.15, speedMult: 1.10, critBonus: 0.05, manaCost: 0.85, tier: 5 },
    masterful: { name: 'Masterful', dmgMult: 1.15, kbMult: 1.05, manaCost: 0.85, tier: 4 },
    keen: { name: 'Keen', critBonus: 0.03, tier: 2 },
    superior: { name: 'Superior', dmgMult: 1.10, critBonus: 0.03, kbMult: 1.10, tier: 4 },
    forceful: { name: 'Forceful', kbMult: 1.15, tier: 2 },
    hasty: { name: 'Hasty', speedMult: 1.10, tier: 2 },
    deadly: { name: 'Deadly', dmgMult: 1.10, speedMult: 1.10, tier: 3 },
    broken: { name: 'Broken', dmgMult: 0.70, speedMult: 0.80, tier: -1 },
    shoddy: { name: 'Shoddy', dmgMult: 0.85, kbMult: 0.85, tier: -1 },
};
function reforgeItem(itemToReforge) {
    if (!itemToReforge || itemToReforge.type === 'material' || itemToReforge.type === 'potion') return null;
    const modKeys = Object.keys(REFORGE_MODIFIERS);
    const chosen = modKeys[Math.floor(Math.random() * modKeys.length)];
    const mod = REFORGE_MODIFIERS[chosen];
    const reforged = { ...itemToReforge };
    reforged.modifier = chosen;
    reforged.modifierName = mod.name;
    reforged.name = mod.name + ' ' + (itemToReforge.baseName || itemToReforge.name);
    if (!reforged.baseName) reforged.baseName = itemToReforge.name;
    if (mod.dmgMult) reforged.damage = Math.floor((itemToReforge.damage || 0) * mod.dmgMult);
    if (mod.speedMult) reforged.speed = Math.floor((itemToReforge.speed || 20) * (2 - mod.speedMult));
    if (mod.critBonus) reforged.crit = (itemToReforge.crit || 0.04) + mod.critBonus;
    if (mod.kbMult) reforged.knockback = (itemToReforge.knockback || 1) * mod.kbMult;
    if (mod.manaCost) reforged.manaCost = Math.floor((itemToReforge.manaCost || 0) * mod.manaCost);
    reforged.tier = mod.tier;
    unlockAchievement('reforged');
    return reforged;
}
function getReforgeCost(itemToReforge) { return (itemToReforge.damage || 10) * 3; }

// ===== PHASE 10: PLAYER STATS TRACKING =====
const playerStats = {
    totalKills: 0, totalDeaths: 0, blocksMined: 0, blocksPlaced: 0,
    bossesDefeated: 0, itemsCrafted: 0, potionsBrewed: 0, fishCaught: 0,
    wiresPlaced: 0, distanceTraveled: 0, playTime: 0,
    damageDealt: 0, damageTaken: 0, coinsEarned: 0,
    timesReforged: 0, bossRushBestTime: Infinity,
    achievementsUnlocked: 0, bestiaryDiscovered: 0,
};
function updatePlayerStats(stat, amount) {
    if (playerStats[stat] !== undefined) playerStats[stat] += amount || 1;
}
function getSessionSummary() {
    return {
        kills: playerStats.totalKills, deaths: playerStats.totalDeaths,
        mined: playerStats.blocksMined, bosses: playerStats.bossesDefeated,
        crafted: playerStats.itemsCrafted, fish: playerStats.fishCaught,
        playTime: Math.floor(playerStats.playTime / 60) + ' min',
        achievements: getAchievementProgress(), bestiary: getBestiaryCompletion(),
    };
}

// ===== PHASE 6: EVENTS SYSTEM =====
function triggerEvent(eventType) {
    activeEvent = eventType;
    const eventDuration = { blood_moon: 12000, solar_eclipse: 15000, goblin_army: 10000, pirate_invasion: 12000, frost_moon: 18000 };
    setTimeout(() => { activeEvent = null; }, eventDuration[eventType] || 12000);
}
function getEventEnemies(eventType) {
    switch (eventType) {
        case 'blood_moon': return ['blood_zombie', 'drippler', 'zombie', 'blood_slime'];
        case 'solar_eclipse': return ['frankenstein', 'swamp_thing', 'mothron', 'zombie'];
        case 'goblin_army': return ['goblin_warrior', 'goblin_sorcerer', 'goblin_archer'];
        case 'pirate_invasion': return ['pirate', 'pirate_captain', 'pirate_crossbower'];
        case 'frost_moon': return ['present_mimic', 'ice_queen', 'elf_copter'];
        default: return null;
    }
}
function triggerCelestialEvent() {
    celestialEventActive = true;
    pillarsDefeated = { solar: false, vortex: false, nebula: false, stardust: false };
}

// ===== HARDMODE ACTIVATION =====
function activateHardmode() {
    if (hardmodeActive) return;
    hardmodeActive = true;
    // Spread Hardmode ores through the world
    const oreCount = Math.floor(WORLD_W * WORLD_H * 0.003); // ~0.3% of world
    for (let i = 0; i < oreCount; i++) {
        const ox = Math.floor(Math.random() * WORLD_W);
        const oy = CAVE_Y + Math.floor(Math.random() * (WORLD_H - CAVE_Y - 20));
        const block = getBlock(ox, oy);
        if (block === T.STONE || block === T.DIRT) {
            const r = Math.random();
            if (r < 0.4) setBlock(ox, oy, T.COBALT_ORE);
            else if (r < 0.7) setBlock(ox, oy, T.MYTHRIL_ORE);
            else setBlock(ox, oy, T.TITANIUM_ORE);
        }
    }
    // Create Hallowed biome strip (15-25% of world)
    const hallStart = Math.floor(WORLD_W * 0.15);
    const hallEnd = Math.floor(WORLD_W * 0.25);
    for (let x = hallStart; x < hallEnd; x++) {
        for (let y = SURFACE_Y - 5; y < CAVE_Y + 20; y++) {
            if (x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H) {
                const b = getBlock(x, y);
                if (b === T.GRASS) setBlock(x, y, T.HALLOWED_GRASS);
                else if (b === T.STONE) setBlock(x, y, T.HALLOWED_STONE);
                else if (b === T.SAND) setBlock(x, y, T.HALLOWED_SAND);
                else if (b === T.DIRT && Math.random() < 0.3) setBlock(x, y, T.PEARLSTONE);
            }
        }
        // Crystal shards underground
        for (let y = CAVE_Y; y < CAVE_Y + 40; y++) {
            if (getBlock(x, y) === T.AIR && Math.random() < 0.05) {
                setBlock(x, y, T.CRYSTAL_SHARD);
            }
        }
    }
    // Scale all enemies by 50%
    for (const key in ENEMY_TYPES) {
        ENEMY_TYPES[key].hp = Math.floor(ENEMY_TYPES[key].hp * 1.5);
        ENEMY_TYPES[key].damage = Math.floor(ENEMY_TYPES[key].damage * 1.3);
    }
}

// ===== HELPER: Item display =====
function getItemName(id) {
    if (id < 100 && TILE_DATA[id]) return TILE_DATA[id].name;
    if (ITEMS[id]) return ITEMS[id].name;
    return 'Unknown';
}
function getItemColor(id) {
    if (id < 100 && TILE_DATA[id]) return TILE_DATA[id].color;
    if (ITEMS[id]) return ITEMS[id].color;
    return '#888';
}
function isPlaceable(id) { return id < 100 && id !== T.AIR; }

// ===== PHASE 6: FISHING SYSTEM =====
const FISH_TABLE = {
    surface: [
        { id: I_BASS, chance: 0.4, name: 'Bass' },
        { id: I_TROUT, chance: 0.3, name: 'Trout' },
        { id: I_GOLDEN_CARP, chance: 0.03, name: 'Golden Carp' },
        { id: I_FISH_CRATE, chance: 0.08, name: 'Fishing Crate' },
        { id: I_WORM, chance: 0.15, name: 'Worm' },
    ],
    cave: [
        { id: I_CAVEFISH, chance: 0.35, name: 'Cavefish' },
        { id: I_BASS, chance: 0.25, name: 'Bass' },
        { id: I_FISH_CRATE, chance: 0.12, name: 'Fishing Crate' },
        { id: I_GLOWWORM, chance: 0.15, name: 'Glowworm' },
    ],
    lava: [
        { id: I_LAVAFISH, chance: 0.4, name: 'Lavafish' },
        { id: I_FISH_CRATE, chance: 0.15, name: 'Fishing Crate' },
        { id: I_DESERT_FOSSIL, chance: 0.1, name: 'Desert Fossil' },
    ]
};
let fishingState = { active: false, timer: 0, biting: false, biteTimer: 0, hooked: false, rod: null };

function startFishing() {
    const held = getHeldItem();
    if (!held || !ITEMS[held.id] || ITEMS[held.id].type !== 'fishing_rod') return false;
    const baitSlot = player.inventory.find(s => s && ITEMS[s.id] && ITEMS[s.id].type === 'bait');
    if (!baitSlot) return false;
    const rod = ITEMS[held.id];
    fishingState = { active: true, timer: rod.speed + Math.floor(Math.random() * 40), biting: false, biteTimer: 0, hooked: false, rod: held.id };
    return true;
}

function updateFishing() {
    if (!fishingState.active) return;
    fishingState.timer--;
    if (fishingState.timer <= 0 && !fishingState.biting) {
        fishingState.biting = true;
        fishingState.biteTimer = 30 + Math.floor(Math.random() * 40);
    }
    if (fishingState.biting) {
        fishingState.biteTimer--;
        if (fishingState.biteTimer <= 0) { fishingState.active = false; fishingState.biting = false; }
    }
}

function reelFish() {
    if (!fishingState.active || !fishingState.biting) { fishingState.active = false; return; }
    const depth = Math.floor(player.y / TILE);
    const biome = depth > FLESH_Y ? 'lava' : depth > CAVE_Y ? 'cave' : 'surface';
    const table = FISH_TABLE[biome] || FISH_TABLE.surface;
    const rod = ITEMS[fishingState.rod];
    const power = rod ? rod.power : 10;
    let roll = Math.random();
    for (const fish of table) {
        const adjustedChance = fish.chance * (1 + power / 50);
        if (roll < adjustedChance) {
            addItem(fish.id, 1);
            if (typeof spawnDamageNumber === 'function') spawnDamageNumber(player.x, player.y - 20, fish.name, '#44CCFF', true);
            break;
        }
        roll -= adjustedChance;
    }
    // Consume bait
    const baitSlot = player.inventory.find(s => s && ITEMS[s.id] && ITEMS[s.id].type === 'bait');
    if (baitSlot) { baitSlot.count--; if (baitSlot.count <= 0) { const idx = player.inventory.indexOf(baitSlot); if (idx >= 0) player.inventory[idx] = null; } }
    fishingState.active = false; fishingState.biting = false;
}

// ===== PHASE 6: PET SYSTEM =====
let activePet = null;
function summonPet(itemId) {
    const it = ITEMS[itemId];
    if (!it || it.type !== 'pet') return;
    if (activePet && activePet.type === it.petType) { activePet = null; return; }
    activePet = { type: it.petType, x: player.x, y: player.y - 20, color: it.color, buff: it.buff, buffAmt: it.buffAmt, animTimer: 0 };
}
function updatePet() {
    if (!activePet) return;
    activePet.animTimer++;
    const tx = player.x + 25 * Math.sin(activePet.animTimer * 0.03);
    const ty = player.y - 30 + 8 * Math.sin(activePet.animTimer * 0.05);
    activePet.x += (tx - activePet.x) * 0.08;
    activePet.y += (ty - activePet.y) * 0.08;
}

// ===== PHASE 6: MOUNT SYSTEM =====
let activeMount = null;
function toggleMount(itemId) {
    const it = ITEMS[itemId];
    if (!it || it.type !== 'mount') return;
    if (activeMount) { activeMount = null; return; }
    activeMount = { type: it.mountType, speedMult: it.speedMult, jumpMult: it.jumpMult || 1, flight: it.flight || false, lavaImmune: it.lavaImmune || false, color: it.color };
}

// ===== PHASE 6: STATUS EFFECTS SYSTEM =====
const STATUS_EFFECTS = {
    poison: { color: '#66AA22', tickDmg: 2, tickRate: 60, icon: '☠', desc: 'Taking poison damage' },
    burning: { color: '#FF6622', tickDmg: 3, tickRate: 45, icon: '🔥', desc: 'On fire!' },
    frozen: { color: '#66CCFF', speedMult: 0.3, icon: '❄', desc: 'Movement slowed' },
    bleeding: { color: '#CC2233', tickDmg: 1, tickRate: 30, icon: '🩸', desc: 'Bleeding out' },
    cursed: { color: '#7700AA', cantAttack: true, icon: '💀', desc: 'Cannot attack' },
    stunned: { color: '#FFCC00', cantMove: true, icon: '⚡', desc: 'Stunned!' },
    haste: { color: '#FFCC22', speedMult: 1.5, icon: '💨', desc: 'Moving faster' },
    shield: { color: '#4488CC', defenseBonus: 8, icon: '🛡', desc: 'Defense up' },
    thorns: { color: '#44AA44', reflectPct: 0.3, icon: '🌿', desc: 'Reflects damage' },
    lifesteal: { color: '#CC2244', stealPct: 0.15, icon: '❤', desc: 'Stealing life' },
    rage: { color: '#FF4422', damageBonus: 12, icon: '💢', desc: 'Damage boosted' },
    invisible: { color: '#AABBCC', aggroRange: 0.3, icon: '👻', desc: 'Nearly invisible' },
    well_fed: { color: '#FF8899', regenBonus: 1, icon: '🍖', desc: 'Well fed' },
    regen: { color: '#44FF44', healRate: 1, healTick: 60, icon: '💚', desc: 'Regenerating' },
};

function applyStatusEffect(target, effectName, duration) {
    if (!STATUS_EFFECTS[effectName]) return;
    const existing = target.effects ? target.effects.find(e => e.type === effectName) : null;
    if (existing) { existing.duration = Math.max(existing.duration, duration); return; }
    if (!target.effects) target.effects = [];
    target.effects.push({ type: effectName, duration });
}

function processStatusEffects(target) {
    if (!target.effects) return;
    for (let i = target.effects.length - 1; i >= 0; i--) {
        const eff = target.effects[i];
        const def = STATUS_EFFECTS[eff.type];
        if (!def) { target.effects.splice(i, 1); continue; }
        eff.duration--;
        if (def.tickDmg && eff.duration % (def.tickRate || 60) === 0) {
            target.hp -= def.tickDmg;
            if (typeof spawnDamageNumber === 'function' && target === player) spawnDamageNumber(target.x, target.y - 10, def.tickDmg, def.color);
        }
        if (def.healRate && eff.duration % (def.healTick || 60) === 0) {
            target.hp = Math.min(target.maxHp, target.hp + def.healRate);
        }
        if (eff.duration <= 0) target.effects.splice(i, 1);
    }
}

// ===== PHASE 6: TOWN & HOUSING SYSTEM =====
const HOUSING_REQUIREMENTS = { minWidth: 6, minHeight: 4, needsDoor: true, needsTable: true, needsChair: true, needsLight: true };

function checkValidHouse(x, y) {
    // Flood fill from (x,y) to find enclosed room
    const visited = new Set();
    const queue = [[x, y]];
    let minX = x, maxX = x, minY = y, maxY = y;
    let tiles = 0, hasDoor = false, hasTable = false, hasChair = false, hasLight = false;
    while (queue.length > 0 && tiles < 200) {
        const [cx, cy] = queue.shift();
        const key = `${cx},${cy}`;
        if (visited.has(key)) continue;
        visited.add(key);
        const b = getBlock(cx, cy);
        if (b !== T.AIR && b !== T.DOOR && b !== T.TABLE && b !== T.CHAIR && b !== T.TORCH && b !== T.CHANDELIER && b !== T.BED) continue;
        if (b === T.DOOR) hasDoor = true;
        if (b === T.TABLE) hasTable = true;
        if (b === T.CHAIR) hasChair = true;
        if (b === T.TORCH || b === T.CHANDELIER) hasLight = true;
        tiles++;
        minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (!visited.has(`${nx},${ny}`)) queue.push([nx, ny]);
        }
    }
    const w = maxX - minX + 1, h = maxY - minY + 1;
    if (tiles >= 200) return null; // Not enclosed
    if (w < HOUSING_REQUIREMENTS.minWidth || h < HOUSING_REQUIREMENTS.minHeight) return null;
    if (!hasDoor || !hasTable || !hasChair || !hasLight) return null;
    return { x: minX, y: minY, w, h, tiles };
}

// ===== PHASE 7: QUEST SYSTEM =====
const QUEST_TYPES = [
    { type: 'kill', desc: 'Slay {count} {enemy}', targets: ['zombie', 'skeleton', 'bat', 'spider'], counts: [5, 10, 15], reward: I_ACHIEVEMENT_TOKEN, rewardAmt: 3 },
    { type: 'gather', desc: 'Gather {count} {item}', items: [T.IRON_ORE, T.GOLD_ORE, T.CRIMSON_ORE], counts: [10, 8, 5], reward: I_ACHIEVEMENT_TOKEN, rewardAmt: 5 },
    { type: 'fish', desc: 'Catch {count} fish', counts: [3, 5, 8], reward: I_ACHIEVEMENT_TOKEN, rewardAmt: 4 },
    { type: 'depth', desc: 'Reach depth {depth}m', depths: [50, 100, 200, 300], reward: I_ACHIEVEMENT_TOKEN, rewardAmt: 6 },
    { type: 'boss', desc: 'Defeat the {boss}', bosses: ['Eye of Terror', 'Bone King', 'The Ravager'], reward: I_DUNGEON_KEY, rewardAmt: 1 },
    { type: 'craft', desc: 'Craft {count} items', counts: [5, 10, 20], reward: I_ACHIEVEMENT_TOKEN, rewardAmt: 3 },
];
let activeQuests = [];
let completedQuests = 0;
let questCooldown = 0;

function generateQuest() {
    const template = QUEST_TYPES[Math.floor(Math.random() * QUEST_TYPES.length)];
    const quest = { ...template, progress: 0, id: Date.now() + Math.random() };
    if (template.type === 'kill') {
        quest.target = template.targets[Math.floor(Math.random() * template.targets.length)];
        quest.count = template.counts[Math.floor(Math.random() * template.counts.length)];
        quest.description = template.desc.replace('{count}', quest.count).replace('{enemy}', quest.target);
    } else if (template.type === 'gather') {
        const idx = Math.floor(Math.random() * template.items.length);
        quest.target = template.items[idx];
        quest.count = template.counts[idx];
        quest.description = template.desc.replace('{count}', quest.count).replace('{item}', getItemName(quest.target));
    } else if (template.type === 'fish') {
        quest.count = template.counts[Math.floor(Math.random() * template.counts.length)];
        quest.description = template.desc.replace('{count}', quest.count);
    } else if (template.type === 'depth') {
        quest.target = template.depths[Math.floor(Math.random() * template.depths.length)];
        quest.description = template.desc.replace('{depth}', quest.target);
    } else if (template.type === 'boss') {
        quest.target = template.bosses[Math.floor(Math.random() * template.bosses.length)];
        quest.description = template.desc.replace('{boss}', quest.target);
    } else if (template.type === 'craft') {
        quest.count = template.counts[Math.floor(Math.random() * template.counts.length)];
        quest.description = template.desc.replace('{count}', quest.count);
    }
    return quest;
}

function checkQuestProgress(eventType, eventData) {
    for (const q of activeQuests) {
        if (q.completed) continue;
        if (q.type === 'kill' && eventType === 'kill' && eventData === q.target) q.progress++;
        if (q.type === 'gather' && eventType === 'gather' && eventData === q.target) q.progress++;
        if (q.type === 'fish' && eventType === 'fish') q.progress++;
        if (q.type === 'depth' && eventType === 'depth' && eventData >= q.target) q.progress = q.count || 1;
        if (q.type === 'boss' && eventType === 'boss' && eventData === q.target) q.progress = 1;
        if (q.type === 'craft' && eventType === 'craft') q.progress++;
        if (q.progress >= (q.count || 1) && !q.completed) {
            q.completed = true;
            addItem(q.reward, q.rewardAmt);
            completedQuests++;
            if (typeof eventBannerText !== 'undefined') { eventBannerText = `QUEST COMPLETE: ${q.description}`; eventBannerTimer = 180; }
        }
    }
}

// ===== PHASE 7: ACHIEVEMENT SYSTEM (LEGACY) =====
const ACHIEVEMENTS_OLD = [
    { id: 'first_kill', name: 'First Blood', desc: 'Kill your first enemy', icon: '⚔', check: () => typeof totalKills !== 'undefined' && totalKills >= 1 },
    { id: 'boss_slayer', name: 'Boss Slayer', desc: 'Defeat any boss', icon: '👑', check: () => completedQuests >= 1 },
    { id: 'deep_diver', name: 'Deep Diver', desc: 'Reach depth 200m', icon: '⬇', check: () => player && player.y / TILE > SURFACE_Y + 200 },
    { id: 'master_crafter', name: 'Master Crafter', desc: 'Craft 50 items', icon: '🔨', check: () => typeof totalCrafts !== 'undefined' && totalCrafts >= 50 },
    { id: 'fisher_king', name: 'Fisher King', desc: 'Catch 20 fish', icon: '🐟', check: () => typeof totalFish !== 'undefined' && totalFish >= 20 },
    { id: 'gun_nut', name: 'Gunslinger', desc: 'Fire 100 bullets', icon: '🔫', check: () => typeof totalShots !== 'undefined' && totalShots >= 100 },
    { id: 'pet_lover', name: 'Pet Collector', desc: 'Own 3 different pets', icon: '🐾', check: () => false },
    { id: 'home_owner', name: 'Home Owner', desc: 'Build a valid house', icon: '🏠', check: () => typeof totalHouses !== 'undefined' && totalHouses >= 1 },
    { id: 'treasure_hunter', name: 'Treasure Hunter', desc: 'Open 10 crates', icon: '📦', check: () => typeof totalCrates !== 'undefined' && totalCrates >= 10 },
    { id: 'undying', name: 'Undying', desc: 'Survive with 1 HP', icon: '💀', check: () => player && player.hp <= 1 && player.hp > 0 },
    { id: 'quest_master', name: 'Quest Master', desc: 'Complete 10 quests', icon: '📜', check: () => completedQuests >= 10 },
    { id: 'max_level', name: 'Max Power', desc: 'Reach level 20', icon: '⭐', check: () => player && player.level >= 20 },
];
let unlockedAchievementsOld = new Set();
let totalCrafts = 0, totalFish = 0, totalShots = 0, totalHouses = 0, totalCrates = 0;

function checkAchievementsOld() {
    for (const a of ACHIEVEMENTS_OLD) {
        if (unlockedAchievementsOld.has(a.id)) continue;
        try { if (a.check()) { unlockedAchievementsOld.add(a.id); if (typeof eventBannerText !== 'undefined') { eventBannerText = `🏆 ACHIEVEMENT: ${a.name}`; eventBannerTimer = 200; } } } catch (e) { }
    }
}

// ===== PHASE 7: PROCEDURAL DUNGEON GENERATOR =====
function generateDungeon(startX, startY, width, height) {
    const rooms = [];
    const roomCount = 5 + Math.floor(Math.random() * 6);
    // Fill area with dungeon brick
    for (let x = startX; x < startX + width; x++) for (let y = startY; y < startY + height; y++) setBlock(x, y, T.DUNGEON_BRICK);
    // Carve rooms
    for (let i = 0; i < roomCount; i++) {
        const rw = 6 + Math.floor(Math.random() * 8);
        const rh = 4 + Math.floor(Math.random() * 5);
        const rx = startX + 2 + Math.floor(Math.random() * (width - rw - 4));
        const ry = startY + 2 + Math.floor(Math.random() * (height - rh - 4));
        for (let x = rx; x < rx + rw; x++) for (let y = ry; y < ry + rh; y++) setBlock(x, y, T.AIR);
        // Floor spikes (some rooms)
        if (Math.random() < 0.3) { for (let x = rx + 1; x < rx + rw - 1; x += 2) setBlock(x, ry + rh - 1, T.SPIKE); }
        // Chest in some rooms
        if (Math.random() < 0.4) setBlock(rx + Math.floor(rw / 2), ry + rh - 1, T.CHEST);
        // Torch
        setBlock(rx + 1, ry + 1, T.TORCH);
        rooms.push({ x: rx, y: ry, w: rw, h: rh });
    }
    // Connect rooms with corridors
    for (let i = 0; i < rooms.length - 1; i++) {
        const a = rooms[i], b = rooms[i + 1];
        const ax = a.x + Math.floor(a.w / 2), ay = a.y + Math.floor(a.h / 2);
        const bx = b.x + Math.floor(b.w / 2), by = b.y + Math.floor(b.h / 2);
        // Horizontal then vertical
        for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) { setBlock(x, ay, T.AIR); setBlock(x, ay + 1, T.AIR); }
        for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) { setBlock(bx, y, T.AIR); setBlock(bx + 1, y, T.AIR); }
        // Place door at connection
        setBlock(bx, ay, T.DUNGEON_DOOR);
    }
    // Dart traps along corridors
    for (let i = 0; i < 5; i++) {
        const tx = startX + 3 + Math.floor(Math.random() * (width - 6));
        const ty = startY + 3 + Math.floor(Math.random() * (height - 6));
        if (getBlock(tx, ty) === T.AIR) setBlock(tx, ty, T.DART_TRAP);
    }
    return rooms;
}

// ===== PHASE 7: AUDIO SYSTEM =====
const _audioCtx = typeof AudioContext !== 'undefined' ? new AudioContext() : null;
const _sfxCache = {};

function playSFX(type) {
    if (!_audioCtx) return;
    try {
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.connect(gain); gain.connect(_audioCtx.destination);
        const t = _audioCtx.currentTime;
        if (type === 'hit') { osc.frequency.setValueAtTime(200, t); osc.frequency.exponentialRampToValueAtTime(80, t + 0.1); gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15); osc.type = 'square'; }
        else if (type === 'dig') { osc.frequency.setValueAtTime(300, t); osc.frequency.exponentialRampToValueAtTime(150, t + 0.05); gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08); osc.type = 'triangle'; }
        else if (type === 'pickup') { osc.frequency.setValueAtTime(400, t); osc.frequency.exponentialRampToValueAtTime(800, t + 0.08); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12); osc.type = 'sine'; }
        else if (type === 'hurt') { osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(50, t + 0.2); gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25); osc.type = 'sawtooth'; }
        else if (type === 'boss') { osc.frequency.setValueAtTime(80, t); osc.frequency.exponentialRampToValueAtTime(200, t + 0.3); osc.frequency.exponentialRampToValueAtTime(60, t + 0.5); gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6); osc.type = 'sawtooth'; }
        else if (type === 'quest') { osc.frequency.setValueAtTime(523, t); osc.frequency.setValueAtTime(659, t + 0.1); osc.frequency.setValueAtTime(784, t + 0.2); gain.gain.setValueAtTime(0.12, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4); osc.type = 'sine'; }
        else if (type === 'fish') { osc.frequency.setValueAtTime(600, t); osc.frequency.exponentialRampToValueAtTime(400, t + 0.05); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1); osc.type = 'sine'; }
        else { osc.frequency.setValueAtTime(440, t); gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1); }
        osc.start(t); osc.stop(t + 0.6);
    } catch (e) { }
}

// Footstep system
let _lastFootstepFrame = 0;
function playFootstep() {
    if (!_audioCtx || gameFrame - _lastFootstepFrame < 12) return;
    _lastFootstepFrame = gameFrame;
    const px = Math.floor(player.x / TILE), py = Math.floor((player.y + player.h) / TILE);
    const b = getBlock(px, py);
    try {
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.connect(gain); gain.connect(_audioCtx.destination);
        const t = _audioCtx.currentTime;
        if (b === T.DIRT || b === T.GRASS) { osc.frequency.setValueAtTime(100 + Math.random() * 30, t); osc.type = 'triangle'; }
        else if (b === T.STONE || b === T.DUNGEON_BRICK) { osc.frequency.setValueAtTime(200 + Math.random() * 50, t); osc.type = 'square'; }
        else if (b === T.WOOD || b === T.PLANKS) { osc.frequency.setValueAtTime(300 + Math.random() * 40, t); osc.type = 'triangle'; }
        else if (b === T.SAND || b === T.SANDSTONE) { osc.frequency.setValueAtTime(80 + Math.random() * 20, t); osc.type = 'sine'; }
        else { osc.frequency.setValueAtTime(150, t); osc.type = 'triangle'; }
        gain.gain.setValueAtTime(0.03, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.start(t); osc.stop(t + 0.08);
    } catch (e) { }
}

// ===== PHASE D1: TRIALS SYSTEM =====
const TRIAL_DEFINITIONS = [
    {
        id: 1, name: 'Trial of Blades', modifier: 'thorns', desc: 'All enemies reflect 10% damage', modEffect: { reflectPct: 0.10 },
        boss: { name: 'Blade Wraith', hp: 5000, damage: 45, speed: 2.0, color: '#CCCCDD', phases: 3, xp: 2500 }
    },
    {
        id: 2, name: 'Trial of Flames', modifier: 'lava_floor', desc: 'Floor is intermittent lava', modEffect: { lavaInterval: 300 },
        boss: { name: 'Infernal Titan', hp: 6000, damage: 55, speed: 0.8, color: '#FF4400', phases: 4, xp: 3000, tags: ['fire'] }
    },
    {
        id: 3, name: 'Trial of Shadows', modifier: 'darkness', desc: 'Tiny light radius', modEffect: { lightRadius: 3 },
        boss: { name: 'Shadow Stalker', hp: 4500, damage: 40, speed: 2.5, color: '#221133', phases: 3, xp: 2500 }
    },
    {
        id: 4, name: 'Trial of Speed', modifier: 'speed', desc: 'Enemies have 2x speed', modEffect: { enemySpeedMult: 2.0 },
        boss: { name: 'Chrono Phantom', hp: 3500, damage: 50, speed: 3.0, color: '#AADDFF', phases: 3, xp: 2000 }
    },
    {
        id: 5, name: 'Trial of Swarms', modifier: 'swarm', desc: '3x enemy spawn rate', modEffect: { spawnRateMult: 3.0 },
        boss: { name: 'Hive Overlord', hp: 7000, damage: 35, speed: 1.0, color: '#DDAA33', phases: 4, xp: 3500, tags: ['organic'] }
    },
    {
        id: 6, name: 'Trial of Iron', modifier: 'fragile', desc: 'Player takes 2x damage', modEffect: { playerDmgMult: 2.0 },
        boss: { name: 'Iron Juggernaut', hp: 8000, damage: 60, speed: 0.5, color: '#778899', phases: 4, xp: 4000, tags: ['metal'] }
    },
    {
        id: 7, name: 'Trial of Silence', modifier: 'no_magic', desc: 'No magic/mana', modEffect: { noMana: true },
        boss: { name: 'Mana Leech', hp: 4000, damage: 42, speed: 1.8, color: '#4466CC', phases: 3, xp: 2500 }
    },
    {
        id: 8, name: 'Trial of Glass', modifier: 'glass', desc: 'One-hit kills (both ways)', modEffect: { oneHitKO: true },
        boss: { name: 'Glass Assassin', hp: 1, damage: 999, speed: 3.5, color: '#DDDDEE', phases: 2, xp: 5000 }
    },
    {
        id: 9, name: 'Trial of Corruption', modifier: 'corruption', desc: 'Tiles slowly corrupt', modEffect: { corruptRate: 30 },
        boss: { name: 'World Eater', hp: 9000, damage: 50, speed: 0.7, color: '#440033', phases: 4, xp: 4500, tags: ['void'] }
    },
    {
        id: 10, name: 'Trial of Eternity', modifier: 'all', desc: 'ALL modifiers active', modEffect: { allModifiers: true },
        boss: { name: 'The Eternal One', hp: 20000, damage: 90, speed: 1.2, color: '#FFD700', phases: 6, xp: 10000, tags: ['void', 'demon', 'undead'] }
    },
];

let trialsUnlocked = false;
let trialsCompleted = new Set();
let activeTrial = null;

function startTrial(trialId) {
    const trial = TRIAL_DEFINITIONS.find(t => t.id === trialId);
    if (!trial) return false;
    if (trialId === 10 && trialsCompleted.size < 9) return false; // Must complete 1-9 first
    activeTrial = { ...trial, active: true, bossSpawned: false, timer: 0 };
    if (typeof eventBannerText !== 'undefined') { eventBannerText = `⚔ ${trial.name}: ${trial.desc}`; eventBannerTimer = 200; }
    if (typeof playSFX === 'function') playSFX('boss');
    return true;
}

function completeTrial(trialId) {
    trialsCompleted.add(trialId);
    activeTrial = null;
    addItem(I_LEGENDARY_FRAGMENT, 1);
    if (typeof eventBannerText !== 'undefined') { eventBannerText = `🏆 TRIAL COMPLETE! +1 Legendary Fragment`; eventBannerTimer = 240; }
    if (typeof playSFX === 'function') playSFX('quest');
    if (trialsCompleted.size >= 10 && typeof eventBannerText !== 'undefined') {
        eventBannerText = '✨ ALL TRIALS COMPLETE! PRESTIGE UNLOCKED!'; eventBannerTimer = 300;
    }
}

// ===== PHASE D2: LEGENDARY WEAPONS =====
const I_EXCALIBUR = item('Excalibur', 'weapon', '#FFD700', { damage: 95, speed: 3, range: 60, element: 'holy', holyBeamEvery: 5, healPct: 0.05, legendary: true });
const I_GUNGNIR = item('Gungnir', 'spear', '#CCDDFF', { damage: 88, speed: 3, range: 80, alwaysCrits: true, returns: true, neverMisses: true, legendary: true });
const I_MJOLNIR = item('Mjölnir', 'flail', '#FFDD44', { damage: 100, speed: 5, range: 70, element: 'lightning', knockback: 20, throwable: true, legendary: true });
const I_GAE_BOLG = item('Gáe Bolg', 'whip', '#CC2244', { damage: 82, speed: 3, range: 85, cursedZone: true, legendary: true });
const I_ARTEMIS_BOW = item('Artemis', 'bow', '#CCDDFF', { damage: 75, speed: 4, multishot: 7, homing: true, element: 'holy', legendary: true });
const I_ZEUS_BOLT = item('Zeus Bolt', 'magic', '#FFDD44', { damage: 110, speed: 4, manaCost: 15, element: 'lightning', chainAll: true, legendary: true });
const I_PANDORA = item('Pandora', 'launcher', '#7700CC', { damage: 130, speed: 25, range: 300, explosive: true, blastRadius: 120, subExplosions: 20, legendary: true });
const I_THE_ACE = item('The Ace', 'gun', '#FFD700', { damage: 70, speed: 3, range: 350, noAmmo: true, ricochet: 5, autoFire: true, legendary: true });
const I_FENRIR = item('Fenrir', 'yoyo', '#6688CC', { damage: 60, range: 200, duration: 999, orbitsAsShield: true, bitesOnContact: true, legendary: true });
const I_OUROBOROS = item('Ouroboros', 'boomerang', '#44CC44', { damage: 65, speed: 3, range: 300, infiniteBounce: true, growPerBounce: 0.10, returns: true, legendary: true });

// ===== PHASE D3: MYTHIC WEAPONS =====
const I_ETERNITYS_EDGE = item('Eternity\'s Edge', 'weapon', '#FFD700', { damage: 150, speed: 3, range: 65, timeRift: true, replaysLast3: true, mythic: true });
const I_BIG_BANG = item('The Big Bang', 'launcher', '#FF4400', { damage: 200, speed: 60, range: 400, explosive: true, blastRadius: 200, cooldown: 3600, mythic: true });
const I_INFINITY_GAUNTLET = item('Infinity Gauntlet', 'weapon', '#CC88FF', { damage: 999, speed: 1, range: 40, cooldown: 18000, oneshotBoss: false, mythic: true });
const I_REALITY_MARBLE = item('Reality Marble', 'magic', '#AABBFF', { damage: 80, speed: 5, manaCost: 30, timeFreeze: true, freezeDuration: 300, mythic: true });
const I_COSMIC_SERPENT = item('Cosmic Serpent', 'magic', '#44DDAA', { damage: 120, speed: 8, manaCost: 20, controllable: true, persistDuration: 600, mythic: true });

// Legendary crafting recipes (require fragments)
RECIPES.push(
    { station: 'anvil', result: I_EXCALIBUR, rAmt: 1, ingredients: [[I_LEGENDARY_FRAGMENT, 10], [I_CELESTIAL_FRAGMENT, 8], [I_GOLD_BAR, 20]], name: 'Excalibur' },
    { station: 'anvil', result: I_GUNGNIR, rAmt: 1, ingredients: [[I_LEGENDARY_FRAGMENT, 10], [I_CELESTIAL_FRAGMENT, 8], [I_VOID_SHARD, 15]], name: 'Gungnir' },
    { station: 'anvil', result: I_MJOLNIR, rAmt: 1, ingredients: [[I_LEGENDARY_FRAGMENT, 10], [I_STORM_CHARGE, 15], [I_TITAN_CORE, 8]], name: 'Mjölnir' },
    { station: 'anvil', result: I_GAE_BOLG, rAmt: 1, ingredients: [[I_LEGENDARY_FRAGMENT, 10], [I_CRIMSON_BAR, 15], [I_SOUL_FRAGMENT, 10]], name: 'Gáe Bolg' },
    { station: 'anvil', result: I_ARTEMIS_BOW, rAmt: 1, ingredients: [[I_LEGENDARY_FRAGMENT, 10], [I_LUNAR_SHARD, 15], [I_CELESTIAL_FRAGMENT, 8]], name: 'Artemis' },
    { station: 'anvil', result: I_ZEUS_BOLT, rAmt: 1, ingredients: [[I_LEGENDARY_FRAGMENT, 10], [I_STORM_CHARGE, 20], [I_GOLD_BAR, 15]], name: 'Zeus Bolt' },
    { station: 'anvil', result: I_PANDORA, rAmt: 1, ingredients: [[I_LEGENDARY_FRAGMENT, 10], [I_VOID_SHARD, 20], [I_GUNPOWDER, 30]], name: 'Pandora' },
    { station: 'anvil', result: I_THE_ACE, rAmt: 1, ingredients: [[I_LEGENDARY_FRAGMENT, 10], [I_GOLD_BAR, 25], [I_MECHANISM, 15]], name: 'The Ace' },
    { station: 'anvil', result: I_FENRIR, rAmt: 1, ingredients: [[I_LEGENDARY_FRAGMENT, 10], [I_FROST_BAR, 15], [I_SOUL_FRAGMENT, 10]], name: 'Fenrir' },
    { station: 'anvil', result: I_OUROBOROS, rAmt: 1, ingredients: [[I_LEGENDARY_FRAGMENT, 10], [I_JUNGLE_SPORE, 15], [I_VOID_SHARD, 10]], name: 'Ouroboros' },
);

// ===== PHASE D4: PRESTIGE SYSTEM =====
let prestigeLevel = 0;
let prestigeMaxLevel = 10;

function canPrestige() {
    return trialsCompleted.size >= 10;
}

function doPrestige() {
    if (!canPrestige()) return false;
    prestigeLevel++;
    // Reset world but keep cosmetics
    const savedPrestige = prestigeLevel;
    const savedAchievements = new Set(unlockedAchievements);
    const savedTrials = trialsCompleted.size;
    // Reset player inventory (keep achievement tokens)
    let tokenCount = 0;
    for (const slot of player.inventory) {
        if (slot && slot.id === I_ACHIEVEMENT_TOKEN) tokenCount += slot.count;
    }
    // Clear inventory
    for (let i = 0; i < player.inventory.length; i++) player.inventory[i] = null;
    if (tokenCount > 0) addItem(I_ACHIEVEMENT_TOKEN, tokenCount);
    // Reset player stats with prestige bonus
    player.hp = player.maxHp;
    player.mana = player.maxMana;
    player.level = 1;
    player.xp = 0;
    // Prestige bonuses
    const statBonus = 1 + savedPrestige * 0.05;
    player.baseSpeed = (player.baseSpeed || 3) * statBonus;
    // Reset boss/trial state
    trialsCompleted = new Set();
    trialsUnlocked = false;
    activeTrial = null;
    unlockedAchievements = savedAchievements;
    prestigeLevel = savedPrestige;
    if (typeof eventBannerText !== 'undefined') {
        eventBannerText = `⭐ PRESTIGE ${prestigeLevel}! +${prestigeLevel * 5}% all stats, enemies ${100 + prestigeLevel * 10}% HP`;
        eventBannerTimer = 300;
    }
    return true;
}

function getPrestigeEnemyHPMult() {
    return 1 + prestigeLevel * 0.10;
}

function getPrestigePlayerStatMult() {
    return 1 + prestigeLevel * 0.05;
}

// ===== PHASE D5: WEEKLY CHALLENGE SYSTEM =====
const WEEKLY_MODIFIERS = [
    'all enemies fire-immune, +50% ice damage',
    'double enemy HP, double XP',
    'no healing potions, +30% lifesteal',
    'darkness everywhere, enemies glow',
    'enemies explode on death, +25% all damage',
    'zero knockback, +40% melee range',
    'enemies have thorns, +50% ranged damage',
    'no mana regen, +75% magic damage',
    'enemies are fast, player is faster',
    'boss HP doubled, drops tripled',
];

let weeklyChallenge = null;
let weeklyBestTime = Infinity;

function generateWeeklyChallenge() {
    // Use the week number as seed for determinism
    const now = new Date();
    const weekNum = Math.floor(now.getTime() / (7 * 24 * 3600000));
    const modIdx = weekNum % WEEKLY_MODIFIERS.length;
    const trialIdx = (weekNum * 3 + 7) % TRIAL_DEFINITIONS.length;
    weeklyChallenge = {
        modifier: WEEKLY_MODIFIERS[modIdx],
        trial: TRIAL_DEFINITIONS[trialIdx],
        weekNum: weekNum,
        completed: false,
        reward: I_ACHIEVEMENT_TOKEN,
        rewardAmt: 10
    };
    return weeklyChallenge;
}

function completeWeeklyChallenge(timeFrames) {
    if (!weeklyChallenge || weeklyChallenge.completed) return;
    weeklyChallenge.completed = true;
    if (timeFrames < weeklyBestTime) weeklyBestTime = timeFrames;
    addItem(weeklyChallenge.reward, weeklyChallenge.rewardAmt);
    if (typeof eventBannerText !== 'undefined') {
        eventBannerText = `🏅 WEEKLY CHALLENGE COMPLETE! Time: ${Math.round(timeFrames / 60)}s`;
        eventBannerTimer = 240;
    }
}

const SAVE_KEY = 'cursed_depths_save';
function saveGame() {
    try {
        const compressed = [];
        let run = world[0], count = 1;
        for (let i = 1; i < world.length; i++) {
            if (world[i] === run && count < 255) { count++; }
            else { compressed.push(run, count); run = world[i]; count = 1; }
        }
        compressed.push(run, count);
        const data = {
            version: 3,
            seed: worldSeed,
            worldW: WORLD_W, worldH: WORLD_H,
            world: Array.from(compressed),
            player: {
                x: player.x, y: player.y, hp: player.hp, maxHp: player.maxHp,
                mana: player.mana, maxMana: player.maxMana,
                level: player.level, xp: player.xp, defense: player.defense,
                inventory: player.inventory, armor: player.armor,
                hotbar: player.hotbar
            },
            skin: playerSkin,
            hardcore: hardcoreMode,
            speedrun: speedrunActive ? speedrunTimer : 0,
            splits: speedrunSplits,
            dayTick: typeof dayTick !== 'undefined' ? dayTick : 0
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        return true;
    } catch (e) { console.warn('Save failed:', e); return false; }
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data.version) return false;
        // Restore world size
        WORLD_W = data.worldW || 800; WORLD_H = data.worldH || 400;
        worldSeed = data.seed || Date.now();
        // Recalculate biome boundaries
        const ratio = WORLD_H / 400;
        SURFACE_Y = Math.floor(80 * ratio); CAVE_Y = Math.floor(130 * ratio);
        MUSH_Y = Math.floor(170 * ratio); FROZEN_Y = Math.floor(210 * ratio);
        FLESH_Y = Math.floor(250 * ratio); HIVE_Y = Math.floor(290 * ratio);
        ABYSS_Y = Math.floor(340 * ratio);
        // Init arrays
        initWorld();
        // Decompress world
        let idx = 0;
        for (let i = 0; i < data.world.length; i += 2) {
            const tile = data.world[i], count = data.world[i + 1];
            for (let c = 0; c < count && idx < world.length; c++) world[idx++] = tile;
        }
        // Restore player
        const p = data.player;
        Object.assign(player, {
            x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp,
            mana: p.mana, maxMana: p.maxMana,
            level: p.level, xp: p.xp, defense: p.defense,
            inventory: p.inventory, armor: p.armor, hotbar: p.hotbar
        });
        playerSkin = data.skin || 'default';
        hardcoreMode = data.hardcore || false;
        if (data.speedrun) { speedrunActive = true; speedrunTimer = data.speedrun; }
        speedrunSplits = data.splits || [];
        return true;
    } catch (e) { console.warn('Load failed:', e); return false; }
}

function deleteSave() { localStorage.removeItem(SAVE_KEY); }
function hasSave() { return !!localStorage.getItem(SAVE_KEY); }

// ===== PHASE 3: ACHIEVEMENTS =====
const CD_ACHIEVEMENTS = [
    { id: 'cd_first_mine', title: 'First Strike', desc: 'Mine your first block' },
    { id: 'cd_craft_workbench', title: 'Crafty', desc: 'Craft a workbench' },
    { id: 'cd_reach_caves', title: 'Into Darkness', desc: 'Reach the Bone Caverns' },
    { id: 'cd_reach_mushroom', title: 'Spore Explorer', desc: 'Reach the Mushroom Caverns' },
    { id: 'cd_reach_frozen', title: 'Cold as Death', desc: 'Reach the Frozen Crypt' },
    { id: 'cd_reach_flesh', title: 'Living Nightmare', desc: 'Reach the Flesh Tunnels' },
    { id: 'cd_reach_hive', title: 'Hive Mind', desc: 'Reach the Living Hive' },
    { id: 'cd_reach_abyss', title: 'Abyssal Diver', desc: 'Reach the Hell Core' },
    { id: 'cd_kill_100', title: 'Slayer', desc: 'Kill 100 enemies' },
    { id: 'cd_kill_500', title: 'Massacre', desc: 'Kill 500 enemies' },
    { id: 'cd_die_first', title: 'Inevitable', desc: 'Die for the first time' },
    { id: 'cd_level_10', title: 'Veteran', desc: 'Reach level 10' },
    { id: 'cd_level_25', title: 'Master', desc: 'Reach level 25' },
    { id: 'cd_boss_wraith', title: 'Wraith Slayer', desc: 'Defeat the Ancient Wraith' },
    { id: 'cd_boss_spider', title: 'Spider Slayer', desc: 'Defeat the Spider Queen' },
    { id: 'cd_boss_lich', title: 'Lich Slayer', desc: 'Defeat the Lich King' },
    { id: 'cd_boss_demon', title: 'Demon Slayer', desc: 'Defeat the Demon Lord' },
    { id: 'cd_sky_island', title: 'Sky High', desc: 'Visit a sky island' },
    { id: 'cd_ocean_depth', title: 'Deep Sea', desc: 'Explore the ocean biome' },
    { id: 'cd_rescue_npc', title: 'Hero', desc: 'Rescue an NPC' },
    { id: 'cd_full_iron', title: 'Ironclad', desc: 'Equip full iron armor' },
    { id: 'cd_hardcore_win', title: 'Undying', desc: 'Defeat all bosses in hardcore mode' },
    { id: 'cd_speedrun_30', title: 'Speed Demon', desc: 'Defeat Demon Lord in under 30 minutes' },
    { id: 'cd_survive_blood', title: 'Blood Survivor', desc: 'Survive a Blood Moon' },
    { id: 'cd_depth_300', title: 'Deep Delver', desc: 'Reach depth 300m' },
];

let totalKills = 0;
function tryAchievement(id) {
    if (typeof Achievements !== 'undefined' && Achievements.unlock) {
        Achievements.unlock(id);
    }
}

// ===== PHASE 3: BIOME HELPER =====
function getPlayerBiome() {
    const depth = Math.floor(player.y / TILE);
    const px = Math.floor(player.x / TILE);
    // Space layer — above sky islands, check for space tiles
    if (depth < 15) {
        let spaceTiles = 0;
        for (let dx = -4; dx <= 4; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const b = getBlock(px + dx, depth + dy);
                if (b === T.METEORITE || b === T.ASTEROID_ROCK || b === T.SPACE_GLASS || b === T.LUMINITE || b === T.LUNAR_SOIL || b === T.METEOR_CRATER) spaceTiles++;
            }
        }
        if (spaceTiles > 3 || depth < 5) return 'space';
        return 'sky';
    }
    if (depth < SURFACE_Y) return 'surface';
    if (px < 30 || px > WORLD_W - 30) return 'ocean';
    // Check surface biome by nearby tiles
    if (depth < CAVE_Y) {
        let sand = 0, snow = 0, jungle = 0, hallowed = 0, dungeon = 0, temple = 0;
        for (let dx = -4; dx <= 4; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const b = getBlock(px + dx, depth + dy);
                if (b === T.SAND || b === T.SANDSTONE || b === T.HARDENED_SAND || b === T.CACTUS || b === T.DESERT_FOSSIL || b === T.PALM_WOOD) sand++;
                if (b === T.SNOW || b === T.ICE || b === T.SLUSH || b === T.BOREAL_WOOD || b === T.FROZEN_STONE) snow++;
                if (b === T.JUNGLE_GRASS || b === T.MUD || b === T.MAHOGANY_WOOD || b === T.BAMBOO || b === T.BEEHIVE) jungle++;
                if (b === T.HALLOWED_STONE || b === T.HALLOWED_GRASS || b === T.HALLOWED_SAND || b === T.PEARLSTONE || b === T.CRYSTAL_SHARD) hallowed++;
                if (b === T.DUNGEON_BRICK || b === T.CRACKED_BRICK || b === T.BONE_BLOCK || b === T.DUNGEON_CHEST || b === T.SPIKE_TRAP) dungeon++;
                if (b === T.LIHZAHRD_BRICK || b === T.LIHZAHRD_ALTAR || b === T.TEMPLE_DOOR || b === T.WOODEN_SPIKE) temple++;
            }
        }
        if (dungeon > 5) return 'dungeon';
        if (temple > 5) return 'temple';
        if (hallowed > 5) return 'hallowed';
        if (sand > 5) return 'desert';
        if (snow > 5) return 'snow';
        if (jungle > 5) return 'jungle';
        return 'forest';
    }
    if (depth < MUSH_Y) return 'caves';
    if (depth < FROZEN_Y) return 'mushroom';
    if (depth < FLESH_Y) return 'frozen';
    if (depth < HIVE_Y) return 'flesh';
    if (depth < ABYSS_Y) return 'hive';
    return 'abyss';
}

// ===== PHASE 4.2: ENDGAME SYSTEMS =====

// --- New Game+ ---
let ngPlusLevel = 0;
function startNewGamePlus() {
    ngPlusLevel++;
    // Scale all enemies
    for (const key in ENEMY_TYPES) {
        const e = ENEMY_TYPES[key];
        e.hp = Math.floor(e.hp * (1 + ngPlusLevel * 0.5));
        e.damage = Math.floor(e.damage * (1 + ngPlusLevel * 0.3));
        e.xp = Math.floor(e.xp * (1 + ngPlusLevel * 0.4));
    }
    for (const key in BOSS_TYPES) {
        const b = BOSS_TYPES[key];
        b.hp = Math.floor(b.hp * (1 + ngPlusLevel * 0.6));
        b.damage = Math.floor(b.damage * (1 + ngPlusLevel * 0.4));
    }
    return ngPlusLevel;
}

// --- The Void Biome ---
const VOID_Y = WORLD_H - 20;
function generateVoidBiome() {
    // Only unlocked after combining all boss drops
    for (let x = 10; x < WORLD_W - 10; x++) {
        for (let y = VOID_Y; y < WORLD_H - 1; y++) {
            const r = Math.random();
            if (r < 0.3) setBlock(x, y, T.AIR);
            else if (r < 0.5) setBlock(x, y, T.OBSIDIAN);
            else if (r < 0.65) setBlock(x, y, T.CORRUPTION);
            else if (r < 0.75) setBlock(x, y, T.CRYSTAL);
            else setBlock(x, y, T.DEMON_BRICK);
        }
    }
    // Void rift (portal structure)
    const cx = Math.floor(WORLD_W / 2);
    for (let dx = -4; dx <= 4; dx++) for (let dy = -6; dy <= 6; dy++) {
        if (Math.abs(dx) + Math.abs(dy) <= 7) setBlock(cx + dx, VOID_Y + dy, T.AIR);
    }
    // Void portal frame
    for (let dx = -5; dx <= 5; dx++) {
        setBlock(cx + dx, VOID_Y - 7, T.OBSIDIAN);
        setBlock(cx + dx, VOID_Y + 7, T.OBSIDIAN);
    }
    for (let dy = -6; dy <= 6; dy++) {
        setBlock(cx - 5, VOID_Y + dy, T.OBSIDIAN);
        setBlock(cx + 5, VOID_Y + dy, T.OBSIDIAN);
    }
    setBlock(cx, VOID_Y - 8, T.BLOOD_ALTAR);
}

// Void Titan — True Final Boss
BOSS_TYPES.void_titan = {
    name: 'The Void Titan', w: 48, h: 60, hp: 5000, damage: 50, speed: 1.5,
    color: '#110022', phases: 3,
    drops: [[I_CRIMSON_BAR, 20, 30], [I_GOLD_BAR, 30, 50]],
    xp: 500
};

// --- Endless Dungeon Mode ---
let endlessMode = { active: false, floor: 0, enemies: 0, timer: 0 };
function generateEndlessFloor(floor) {
    endlessMode.floor = floor;
    const scale = 1 + floor * 0.15;
    // Create a small arena
    const arenaW = 40 + Math.min(floor * 2, 60);
    const arenaH = 30;
    const ox = Math.floor(WORLD_W / 2 - arenaW / 2);
    const oy = SURFACE_Y + 20;
    // Clear arena
    for (let x = ox; x < ox + arenaW; x++) for (let y = oy; y < oy + arenaH; y++) {
        if (x === ox || x === ox + arenaW - 1 || y === oy || y === oy + arenaH - 1) {
            setBlock(x, y, T.BONE_BRICK);
        } else setBlock(x, y, T.AIR);
    }
    // Platform islands
    const platforms = 2 + Math.floor(floor / 3);
    for (let p = 0; p < platforms; p++) {
        const px = ox + 5 + Math.floor(Math.random() * (arenaW - 10));
        const py = oy + 8 + Math.floor(Math.random() * (arenaH - 16));
        for (let dx = 0; dx < 5 + Math.floor(Math.random() * 4); dx++) {
            setBlock(px + dx, py, T.STONE);
        }
    }
    // Torches
    setBlock(ox + 1, oy + 1, T.TORCH); setBlock(ox + arenaW - 2, oy + 1, T.TORCH);
    // Chest reward
    setBlock(ox + Math.floor(arenaW / 2), oy + arenaH - 2, T.CHEST);
    // Spawn enemies based on floor
    const count = Math.min(3 + floor, 15);
    const types = floor < 5 ? ['zombie', 'spider'] :
        floor < 10 ? ['skeleton', 'wraith', 'bone_archer'] :
            floor < 20 ? ['ice_wraith', 'banshee', 'possessed_armor'] :
                ['shadow_demon', 'hell_knight', 'lava_elemental'];
    for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const ex = ox + 3 + Math.floor(Math.random() * (arenaW - 6));
        const ey = oy + 3;
        const e = spawnEnemy(type, ex * TILE, ey * TILE);
        if (e) {
            e.hp = Math.floor(e.hp * scale);
            e.damage = Math.floor(e.damage * scale);
        }
    }
    // Boss every 5 floors
    if (floor % 5 === 0 && floor > 0) {
        const bossTypes = ['eye_of_corruption', 'bone_king', 'demon_lord', 'hive_queen'];
        const bType = bossTypes[Math.floor(floor / 5 - 1) % bossTypes.length];
        if (BOSS_TYPES[bType]) spawnBoss(bType, (ox + arenaW / 2) * TILE, (oy + 5) * TILE);
    }
    // Set player position
    player.x = (ox + 3) * TILE; player.y = (oy + 2) * TILE;
    player.vx = 0; player.vy = 0;
    return { ox, oy, arenaW, arenaH };
}

// --- Boss Rush Mode ---
let bossRush = { active: false, queue: [], current: 0, timer: 0, startTime: 0, bestTime: Infinity };
function startBossRush() {
    bossRush.active = true;
    bossRush.queue = Object.keys(BOSS_TYPES);
    bossRush.current = 0;
    bossRush.timer = 0;
    bossRush.startTime = Date.now();
    // Restore player
    player.hp = player.maxHp; player.mana = player.maxMana;
    // Spawn first boss
    if (bossRush.queue.length > 0) {
        spawnBoss(bossRush.queue[0], player.x + 200, player.y - 50);
    }
}
function advanceBossRush() {
    bossRush.current++;
    if (bossRush.current >= bossRush.queue.length) {
        // Victory!
        bossRush.active = false;
        const elapsed = Date.now() - bossRush.startTime;
        if (elapsed < bossRush.bestTime) bossRush.bestTime = elapsed;
        return true; // completed
    }
    // Heal between bosses
    player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.3));
    spawnBoss(bossRush.queue[bossRush.current], player.x + 200, player.y - 50);
    return false;
}

// --- Daily Challenge ---
function getDailySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
const DAILY_OBJECTIVES = [
    { name: 'Depth Runner', desc: 'Reach depth 200m', check: () => Math.floor(player.y / TILE) - SURFACE_Y > 200 },
    { name: 'Speed Miner', desc: 'Mine 100 blocks in 3 minutes', check: () => false }, // tracked externally
    { name: 'Boss Slayer', desc: 'Defeat any boss', check: () => boss && boss.dead },
    { name: 'Survivor', desc: 'Survive 5 Blood Moons', check: () => false }, // tracked externally
    { name: 'Pacifist', desc: 'Reach depth 100m without killing', check: () => totalKills === 0 && Math.floor(player.y / TILE) - SURFACE_Y > 100 },
];
function getDailyChallenge() {
    const seed = getDailySeed();
    const idx = seed % DAILY_OBJECTIVES.length;
    return { ...DAILY_OBJECTIVES[idx], seed };
}

// ===== PHASE 4.3: MODDING & COMMUNITY =====

// --- Map Export/Import ---
function exportMapJSON() {
    const compressed = [];
    let run = world[0], count = 1;
    for (let i = 1; i < world.length; i++) {
        if (world[i] === run && count < 255) count++;
        else { compressed.push(run, count); run = world[i]; count = 1; }
    }
    compressed.push(run, count);
    return JSON.stringify({
        version: 4, worldW: WORLD_W, worldH: WORLD_H,
        seed: worldSeed, world: compressed,
        exportDate: new Date().toISOString()
    });
}

function importMapJSON(jsonStr) {
    try {
        const data = JSON.parse(jsonStr);
        if (!data.world || !data.worldW) return false;
        WORLD_W = data.worldW; WORLD_H = data.worldH;
        initWorld();
        let idx = 0;
        for (let i = 0; i < data.world.length; i += 2) {
            const tile = data.world[i], count = data.world[i + 1];
            for (let c = 0; c < count && idx < world.length; c++) world[idx++] = tile;
        }
        return true;
    } catch (e) { console.warn('Import failed:', e); return false; }
}

function downloadMapFile() {
    const json = exportMapJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `cursed-depths-${worldSeed}.json`;
    a.click(); URL.revokeObjectURL(a.href);
}

function uploadMapFile() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            if (importMapJSON(ev.target.result)) {
                if (typeof eventBannerText !== 'undefined') {
                    eventBannerText = 'MAP IMPORTED'; eventBannerTimer = 120;
                }
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// --- Block Editor (simple) ---
let customBlocks = [];
function createCustomBlock(name, color, hardness = 5, solid = true) {
    const id = 90 + customBlocks.length; // Reserve 90-99 for custom blocks
    if (id > 99) return null;
    TILE_DATA[id] = { name, color, hardness, solid, drop: id, minTier: 0 };
    customBlocks.push({ id, name, color });
    return id;
}

// ===== PHASE 4.4: SETTINGS & ACCESSIBILITY =====

const gameSettings = {
    renderQuality: 'high', // low, medium, high
    particleDensity: 1.0,  // 0-1
    lightingQuality: 'full', // none, simple, full
    screenShakeEnabled: true,
    bloomEnabled: true,
    colorblindMode: 'none', // none, protanopia, deuteranopia, tritanopia
    musicVolume: 0.7,
    sfxVolume: 0.8,
    keybinds: {
        left: 'KeyA', right: 'KeyD', jump: 'Space',
        inventory: 'KeyE', crafting: 'KeyC', use: 'KeyR',
        save: 'F5', load: 'F9', splitScreen: 'F2'
    }
};

const SETTINGS_KEY = 'cursed_depths_settings';
function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(gameSettings)); } catch (e) { }
}
function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) Object.assign(gameSettings, JSON.parse(raw));
    } catch (e) { }
}
loadSettings(); // Auto-load on init

// --- Colorblind Palettes ---
const COLORBLIND_PALETTES = {
    protanopia: { '#CC1122': '#DD8800', '#44FF00': '#66CC00', '#FF0000': '#FF8800', '#00FF00': '#CCCC00' },
    deuteranopia: { '#CC1122': '#CC6600', '#44FF00': '#88AA00', '#FF0000': '#FF6600', '#00FF00': '#AAAA00' },
    tritanopia: { '#CC1122': '#CC0066', '#44FF00': '#00CCCC', '#0000FF': '#CC0099', '#FFFF00': '#FF8888' },
};
function applyColorblind(color) {
    if (gameSettings.colorblindMode === 'none') return color;
    const palette = COLORBLIND_PALETTES[gameSettings.colorblindMode];
    return palette && palette[color] ? palette[color] : color;
}

// --- Save Slots (3) ---
const SAVE_SLOTS = ['cursed_depths_slot1', 'cursed_depths_slot2', 'cursed_depths_slot3'];
function saveToSlot(slot) {
    if (slot < 0 || slot > 2) return false;
    const key = SAVE_SLOTS[slot];
    // Reuse main save logic
    const origKey = SAVE_KEY;
    try {
        const result = saveGame();
        if (result) {
            const data = localStorage.getItem(SAVE_KEY);
            localStorage.setItem(key, data);
            // Save metadata
            localStorage.setItem(key + '_meta', JSON.stringify({
                date: new Date().toISOString(),
                level: player.level,
                depth: Math.floor(player.y / TILE) - SURFACE_Y,
                worldSize: `${WORLD_W}x${WORLD_H}`,
                hardcore: hardcoreMode,
                ngPlus: ngPlusLevel
            }));
        }
        return result;
    } catch (e) { return false; }
}
function loadFromSlot(slot) {
    if (slot < 0 || slot > 2) return false;
    const key = SAVE_SLOTS[slot];
    const data = localStorage.getItem(key);
    if (!data) return false;
    localStorage.setItem(SAVE_KEY, data);
    return loadGame();
}
function getSlotMeta(slot) {
    if (slot < 0 || slot > 2) return null;
    try {
        const raw = localStorage.getItem(SAVE_SLOTS[slot] + '_meta');
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}
function deleteSlot(slot) {
    if (slot < 0 || slot > 2) return;
    localStorage.removeItem(SAVE_SLOTS[slot]);
    localStorage.removeItem(SAVE_SLOTS[slot] + '_meta');
}

// --- Gamepad Support ---
let gamepadConnected = false;
let gamepadState = { axes: [0, 0, 0, 0], buttons: new Array(16).fill(false) };
const GAMEPAD_DEADZONE = 0.2;

function updateGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp) { gamepadConnected = false; return; }
    gamepadConnected = true;
    gamepadState.axes = [...gp.axes];
    gamepadState.buttons = gp.buttons.map(b => b.pressed);

    // Map gamepad to game controls
    const lx = gamepadState.axes[0];
    const ly = gamepadState.axes[1];
    if (Math.abs(lx) > GAMEPAD_DEADZONE) {
        keys['KeyA'] = lx < -GAMEPAD_DEADZONE;
        keys['KeyD'] = lx > GAMEPAD_DEADZONE;
    } else {
        if (!keys._keyA_real) keys['KeyA'] = false;
        if (!keys._keyD_real) keys['KeyD'] = false;
    }
    // A button = jump
    if (gamepadState.buttons[0]) keys['Space'] = true;
    else if (!keys._space_real) keys['Space'] = false;
    // X button = attack
    if (gamepadState.buttons[2]) mouseDown = true;
    // B button = place
    if (gamepadState.buttons[1]) rightMouseDown = true;
    else rightMouseDown = false;
    // Y button = inventory
    if (gamepadState.buttons[3] && !gamepadState._lastY) toggleInventory();
    gamepadState._lastY = gamepadState.buttons[3];
    // Bumpers = hotbar scroll
    if (gamepadState.buttons[4] && !gamepadState._lastLB) { player.hotbar = (player.hotbar - 1 + 10) % 10; }
    if (gamepadState.buttons[5] && !gamepadState._lastRB) { player.hotbar = (player.hotbar + 1) % 10; }
    gamepadState._lastLB = gamepadState.buttons[4];
    gamepadState._lastRB = gamepadState.buttons[5];
    // Start = pause
    if (gamepadState.buttons[9] && !gamepadState._lastStart) { showPause = !showPause; }
    gamepadState._lastStart = gamepadState.buttons[9];
    // Right stick = cursor
    const rx = gamepadState.axes[2], ry = gamepadState.axes[3];
    if (Math.abs(rx) > GAMEPAD_DEADZONE || Math.abs(ry) > GAMEPAD_DEADZONE) {
        mouseX = W / 2 + rx * 150;
        mouseY = H / 2 + ry * 150;
    }
}

// --- Mobile Touch Controls ---
let touchControls = { active: false, leftStick: { x: 0, y: 0 }, jump: false, attack: false };
function initTouchControls() {
    if (!('ontouchstart' in window)) return;
    touchControls.active = true;
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
}
function handleTouch(e) {
    e.preventDefault();
    for (const t of e.touches) {
        if (t.clientX < W * 0.3) {
            // Left side = D-pad
            const cx = W * 0.15, cy = H * 0.75;
            touchControls.leftStick.x = (t.clientX - cx) / 60;
            touchControls.leftStick.y = (t.clientY - cy) / 60;
            keys['KeyA'] = touchControls.leftStick.x < -0.3;
            keys['KeyD'] = touchControls.leftStick.x > 0.3;
            keys['Space'] = touchControls.leftStick.y < -0.5;
        } else if (t.clientX > W * 0.7) {
            // Right side = attack
            mouseDown = true;
            mouseX = t.clientX; mouseY = t.clientY;
        }
    }
}
function handleTouchEnd(e) {
    if (e.touches.length === 0) {
        keys['KeyA'] = false; keys['KeyD'] = false; keys['Space'] = false;
        mouseDown = false;
        touchControls.leftStick = { x: 0, y: 0 };
    }
}
function drawTouchControls() {
    if (!touchControls.active) return;
    // Left D-pad
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W * 0.15, H * 0.75, 50, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.fillRect(W * 0.15 - 2 + touchControls.leftStick.x * 30, H * 0.75 - 2 + touchControls.leftStick.y * 30, 15, 15);
    // Right attack button
    ctx.beginPath(); ctx.arc(W * 0.85, H * 0.75, 35, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '14px Inter'; ctx.textAlign = 'center';
    ctx.fillText('⚔', W * 0.85, H * 0.75 + 5);
    // Jump button
    ctx.beginPath(); ctx.arc(W * 0.85, H * 0.6, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.fillText('↑', W * 0.85, H * 0.6 + 5);
    ctx.globalAlpha = 1;
}

