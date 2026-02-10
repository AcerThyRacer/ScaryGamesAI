/* ============================================================
   CURSED DEPTHS — Engine Core
   Terraria-style 2D horror sandbox
   ============================================================ */

// ===== CONSTANTS (Phase 3: mutable world size) =====
const TILE = 16;
let WORLD_W = 800, WORLD_H = 400;
let SURFACE_Y = 80, CAVE_Y = 130, MUSH_Y = 170, FROZEN_Y = 210, FLESH_Y = 250, HIVE_Y = 290, ABYSS_Y = 340;
const GRAVITY = 0.55, JUMP_VEL = -9.5, MAX_FALL = 12, PLAYER_SPEED = 3.2;
const DAY_LENGTH = 7200;

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
    BLOOD: 56, ACID: 57, CORRUPTION: 58, NPC_CAGE: 59, CORRUPTED_STONE: 60, CORRUPTED_DIRT: 61
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

// ===== PHASE 2: CORRUPTION SPREAD =====
let corruptionSources = [];
function updateCorruption() {
    for (const src of corruptionSources) {
        for (let i = 0; i < 3; i++) {
            const dx = src.x + Math.floor((Math.random() - 0.5) * 60);
            const dy = src.y + Math.floor((Math.random() - 0.5) * 60);
            const b = getBlock(dx, dy);
            if (b === T.STONE) setBlock(dx, dy, T.CORRUPTED_STONE);
            else if (b === T.DIRT || b === T.GRASS) setBlock(dx, dy, T.CORRUPTED_DIRT);
        }
    }
}

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
function isSolid(x, y) { const b = getBlock(x, y); return b !== T.AIR && b !== T.WATER && b !== T.LAVA && b !== T.TORCH && b !== T.COBWEB; }

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

    return heights;
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
};

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
];

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

// ===== PHASE 3: SAVE/LOAD SYSTEM =====
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
    if (depth < 10) return 'sky';
    if (depth < SURFACE_Y) return 'surface';
    const px = Math.floor(player.x / TILE);
    if (px < 30 || px > WORLD_W - 30) return 'ocean';
    if (depth < CAVE_Y) return 'forest';
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

