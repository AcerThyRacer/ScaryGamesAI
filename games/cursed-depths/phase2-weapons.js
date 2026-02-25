/* ============================================================
   CURSED DEPTHS - PHASE 2: WEAPON EXPANSION
   50+ New Weapons | Melee, Ranged, Magic, Summon | Unique Mechanics
   ============================================================ */

// ===== NEW WEAPONS DATABASE =====
const Phase2Weapons = {
    // Continue from existing ITEM_ID counter (assumes ~300 existing items)
    nextItemId: 300,
    
    createItem(name, type, color, stats) {
        const id = this.nextItemId++;
        ITEMS[id] = { id, name, type, color, ...stats };
        return id;
    },
    
    init() {
        console.log('⚔️ Phase 2: Adding 50+ new weapons...');
        this.addMeleeWeapons();
        this.addRangedWeapons();
        this.addMagicWeapons();
        this.addSummonWeapons();
        this.addSpecialWeapons();
        console.log(`✅ Total weapons added: ${this.nextItemId - 300}`);
    },
    
    addMeleeWeapons() {
        console.log('  🗡️  Adding melee weapons...');
        
        // === SWORDS (15 new) ===
        // Tier 0-1
        this.createItem('Copper Sword', 'weapon', '#B87333', { damage: 6, speed: 7, range: 38, tier: 0 });
        this.createItem('Tin Sword', 'weapon', '#CCCCCC', { damage: 7, speed: 7, range: 38, tier: 0 });
        
        // Tier 2
        this.createItem('Platinum Sword', 'weapon', '#E5E4E2', { damage: 18, speed: 5, range: 44, tier: 2 });
        this.createItem('Tungsten Sword', 'weapon', '#4A5D6B', { damage: 17, speed: 5, range: 44, tier: 2 });
        
        // Tier 3 - Evil biomes
        this.createItem('Blade of Grass', 'weapon', '#22CC44', { damage: 28, speed: 4, range: 50, tier: 3, autoswing: true });
        this.createItem('Muramasa', 'weapon', '#4466AA', { damage: 32, speed: 4, range: 50, tier: 3, autoswing: true });
        
        // Tier 4 - Hellstone
        this.createItem('Fiery Greatsword', 'weapon', '#FF6600', { damage: 42, speed: 3, range: 60, tier: 4, autoswing: true });
        this.createItem('Volcano', 'weapon', '#CC3300', { damage: 48, speed: 2, range: 55, tier: 4 });
        
        // Special swords
        this.createItem('Night\'s Edge', 'weapon', '#8800CC', { damage: 55, speed: 3, range: 60, tier: 4, autoswing: true, projectile: 'night_beam' });
        this.createItem('True Excalibur', 'weapon', '#FFDD44', { damage: 62, speed: 3, range: 65, tier: 5, autoswing: true });
        this.createItem('Terra Blade', 'weapon', '#44FF88', { damage: 85, speed: 3, range: 70, tier: 6, autoswing: true, projectile: 'terra_beam' });
        
        // === SPEARS (8 new) ===
        this.createItem('Spear', 'weapon', '#8B6914', { damage: 12, speed: 5, range: 50, weaponType: 'spear', pierce: 1 });
        this.createItem('Trident', 'weapon', '#4488CC', { damage: 18, speed: 5, range: 55, weaponType: 'spear', pierce: 2, aquatic: true });
        this.createItem('Gungnir', 'weapon': '#FFDD44', { damage: 45, speed: 4, range: 65, weaponType: 'spear', pierce: 3, autoswing: true });
        this.createItem('Obsidian Spear', 'weapon', '#331122', { damage: 38, speed: 4, range: 60, weaponType: 'spear', pierce: 2 });
        this.createItem('Bone Spear', 'weapon', '#D4C9A8', { damage: 25, speed: 5, range: 52, weaponType: 'spear', pierce: 1 });
        this.createItem('Dark Lance', 'weapon', '#660033', { damage: 35, speed: 4, range: 58, weaponType: 'spear', pierce: 2 });
        this.createItem('Chlorophyte Partisan', 'weapon', '#22CC88', { damage: 52, speed: 3, range: 68, weaponType: 'spear', pierce: 4, autoswing: true });
        this.createItem('Titanium Trident', 'weapon', '#AAAACC', { damage: 48, speed: 4, range: 64, weaponType: 'spear', pierce: 3 });
        
        // === BOOMERANGS (6 new) ===
        this.createItem('Enchanted Boomerang', 'weapon', '#88CCFF', { damage: 15, speed: 8, range: 45, weaponType: 'boomerang', pierce: 2 });
        this.createItem('Magic Dagger', 'weapon', '#FF44AA', { damage: 22, speed: 7, range: 40, weaponType: 'boomerang', pierce: 1 });
        this.createItem('Flamarang', 'weapon', '#FF6622', { damage: 28, speed: 7, range: 45, weaponType: 'boomerang', pierce: 2, fire: true });
        this.createItem('Light Disc', 'weapon', '#FFFF44', { damage: 35, speed: 6, range: 50, weaponType: 'boomerang', pierce: 4 });
        this.createItem('Banana Ranger', 'weapon', '#FFEE44', { damage: 42, speed: 6, range: 55, weaponType: 'boomerang', pierce: 3 });
        this.createItem('Kraken', 'weapon', '#4466AA', { damage: 55, speed: 5, range: 60, weaponType: 'boomerang', pierce: 5 });
        
        // === YOYOS (8 new) ===
        this.createItem('Wooden Yoyo', 'weapon', '#8B6914', { damage: 8, speed: 8, range: 35, weaponType: 'yoyo', duration: 5 });
        this.createItem('Malaise', 'weapon', '#8844CC', { damage: 18, speed: 7, range: 40, weaponType: 'yoyo', duration: 7 });
        this.createItem('Valkyrie Yoyo', 'weapon', '#FFDD44', { damage: 28, speed: 6, range: 45, weaponType: 'yoyo', duration: 9 });
        this.createItem('Code 1', 'weapon', '#44CC44', { damage: 32, speed: 6, range: 48, weaponType: 'yoyo', duration: 10 });
        this.createItem('Format:C', 'weapon', '#4488FF', { damage: 38, speed: 5, range: 50, weaponType: 'yoyo', duration: 11 });
        this.createItem('Chik', 'weapon', '#FF4444', { damage: 45, speed: 5, range: 52, weaponType: 'yoyo', duration: 12 });
        this.createItem('Kraken Yoyo', 'weapon', '#6600CC', { damage: 55, speed: 4, range: 58, weaponType: 'yoyo', duration: 14 });
        this.createItem('Terrarian', 'weapon', '#FFFFFF', { damage: 70, speed: 4, range: 65, weaponType: 'yoyo', duration: 16 });
        
        // === FLAILS & HAMMERS (5 new) ===
        this.createItem('Flail', 'weapon', '#AAAAAA', { damage: 15, speed: 6, range: 45, weaponType: 'flail' });
        this.createItem('Sunfury', 'weapon', '#FF6600', { damage: 32, speed: 5, range: 55, weaponType: 'flail', fire: true });
        this.createItem('Blue Moon', 'weapon', '#4466FF', { damage: 38, speed: 5, range: 58, weaponType: 'flail' });
        this.createItem('Anchor', 'weapon', '#667788', { damage: 48, speed: 4, range: 50, weaponType: 'flail' });
        this.createItem('Flower Pow', 'weapon', '#FF44AA', { damage: 52, speed: 4, range: 55, weaponType: 'flail', petals: true });
    },
    
    addRangedWeapons() {
        console.log('  🏹 Adding ranged weapons...');
        
        // === BOWS (10 new) ===
        this.createItem('Rich Mahogany Bow', 'bow', '#8B4513', { damage: 8, speed: 9 });
        this.createItem('Pearlwood Bow', 'weapon', '#FFDDFF', { damage: 12, speed: 8 });
        this.createItem('Shadow Bowman', 'weapon', '#6600CC', { damage: 22, speed: 6 });
        this.createItem('Molten Fury', 'weapon', '#FF4400', { damage: 32, speed: 5, fireArrow: true });
        this.createItem('Demon Bow', 'weapon', '#AA44CC', { damage: 35, speed: 5 });
        this.createItem('Hellwing Bow', 'weapon', '#FF6622', { damage: 42, speed: 4, converts: 'hellfire' });
        this.createItem('Frostburn Bow', 'weapon', '#44CCFF', { damage: 45, speed: 4, frostArrow: true });
        this.createItem('Phantasm', 'weapon', '#4488FF', { damage: 65, speed: 3, multishot: 4 });
        this.createItem('Eventide', 'weapon', '#FF44AA', { damage: 58, speed: 3, homing: true });
        this.createItem('Aerial Bane', 'weapon', '#FF8844', { damage: 52, speed: 4, dragon: true });
        
        // === REPEATERS (5 new) ===
        this.createItem('Cobalt Repeater', 'bow', '#3355CC', { damage: 32, speed: 6 });
        this.createItem('Palladium Repeater', 'bow', '#CC6644', { damage: 35, speed: 6 });
        this.createItem('Mythril Repeater', 'bow', '#55CC55', { damage: 38, speed: 5 });
        this.createItem('Orichalcum Repeater', 'bow', '#CC4466', { damage: 40, speed: 5 });
        this.createItem('Hallowed Repeater', 'bow', '#FFDD44', { damage: 45, speed: 4 });
        
        // === GUNS (10 new) ===
        this.createItem('Flintlock Pistol', 'gun', '#665544', { damage: 12, speed: 8 });
        this.createItem('The Undertaker', 'gun', '#883344', { damage: 18, speed: 7 });
        this.createItem('Quad-Barrel Shotgun', 'gun', '#554433', { damage: 22, speed: 6, multishot: 4 });
        this.createItem('Boomstick', 'gun', '#665533', { damage: 28, speed: 5, multishot: 5 });
        this.createItem('Musket', 'gun', '#443322', { damage: 32, speed: 5 });
        this.createItem('The Rotted Fork', 'gun', '#66AA44', { damage: 35, speed: 5, weaponType: 'spear' });
        this.createItem('Phoenix Blaster', 'gun', '#FF6622', { damage: 42, speed: 4 });
        this.createItem('Onyx Blaster', 'gun', '#443366', { damage: 48, speed: 4, multishot: 2 });
        this.createItem('Megashark', 'gun', '#667788', { damage: 52, speed: 3, autocycle: true, ammoCost: 0.5 });
        this.createItem('Sniper Rifle', 'gun', '#334455', { damage: 85, speed: 2, zoom: 2, knockback: 10 });
        this.createItem('Tactical Shotgun', 'gun', '#556677', { damage: 58, speed: 3, multishot: 4 });
        this.createItem('Venus Magnum', 'gun', '#FF4488', { damage: 62, speed: 3 });
        this.createItem('Chain Gun', 'gun', '#667766', { damage: 48, speed: 2, autocycle: true, spread: 30 });
        this.createItem('S.D.M.G.', 'gun', '#44FF88', { damage: 75, speed: 2, autocycle: true, ammoCost: 0.5 });
        
        // === LAUNCHERS (5 new) ===
        this.createItem('Grenade Launcher', 'launcher', '#667744', { damage: 85, speed: 4, explosive: true, area: 50 });
        this.createItem('Rocket Launcher', 'launcher', '#665544', { damage: 120, speed: 3, explosive: true, area: 60 });
        this.createItem('Proximity Mine Launcher', 'launcher', '#446633', { damage: 140, speed: 3, proximity: true });
        this.createItem('Snowman Cannon', 'launcher', '#FF4444', { damage: 155, speed: 3, homing: true });
        this.createItem('Electrosphere Launcher', 'launcher', '#44FFCC', { damage: 165, speed: 2, electric: true });
        
        // === THROWING WEAPONS (8 new) ===
        this.createItem('Throwing Knife', 'thrown', '#AAAAAA', { damage: 8, speed: 9, piercing: true });
        this.createItem('Poisoned Knife', 'thrown', '#44CC44', { damage: 12, speed: 9, poison: true });
        this.createItem('Bone Throwing Knife', 'thrown', '#D4C9A8', { damage: 15, speed: 8, piercing: true });
        this.createItem('Shuriken', 'thrown', '#CCCCCC', { damage: 10, speed: 10, piercing: true, multihit: 3 });
        this.createItem('Star Anise', 'thrown', '#8B4513', { damage: 14, speed: 9, piercing: true });
        this.createItem('Javelin', 'thrown', '#886644', { damage: 18, speed: 7, piercing: true });
        this.createItem('Holy Water', 'thrown', '#FFDD44', { damage: 25, speed: 6, holy: true, area: 40 });
        this.createItem('Unholy Water', 'thrown', '#6600CC', { damage: 28, speed: 6, corrupt: true, area: 45 });
    },
    
    addMagicWeapons() {
        console.log('  🔮 Adding magic weapons...');
        
        // === STAVES (12 new) ===
        this.createItem('Amethyst Staff', 'magic', '#9966CC', { damage: 12, speed: 12, manaCost: 4, projectile: 'amethyst_bolt' });
        this.createItem('Topaz Staff', 'magic', '#FFDD44', { damage: 15, speed: 11, manaCost: 5, projectile: 'topaz_bolt' });
        this.createItem('Sapphire Staff', 'magic', '#4466FF', { damage: 18, speed: 10, manaCost: 6, projectile: 'sapphire_bolt' });
        this.createItem('Emerald Staff', 'magic', '#44FF66', { damage: 22, speed: 10, manaCost: 7, projectile: 'emerald_bolt' });
        this.createItem('Ruby Staff', 'magic', '#FF4444', { damage: 28, speed: 9, manaCost: 8, projectile: 'ruby_bolt' });
        this.createItem('Diamond Staff', 'magic', '#44FFDD', { damage: 35, speed: 8, manaCost: 9, projectile: 'diamond_bolt' });
        this.createItem('Thunder Zapper', 'magic', '#FFDD44', { damage: 42, speed: 7, manaCost: 10, projectile: 'lightning' });
        this.createItem('Gray Zapinator', 'magic', '#AAAAAA', { damage: 48, speed: 7, manaCost: 11, projectile: 'zap_orange' });
        this.createItem('Orange Zapinator', 'magic', '#FF8844', { damage: 55, speed: 6, manaCost: 12, projectile: 'zap_gray' });
        this.createItem('Sky Fracture', 'magic', '#88CCFF', { damage: 62, speed: 6, manaCost: 13, projectile: 'sky_shard' });
        this.createItem('Shadowbeam Staff', 'magic', '#6600CC', { damage: 68, speed: 5, manaCost: 14, projectile: 'shadow_beam', pierce: true });
        this.createItem('Influx Waver', 'magic', '#44FF88', { damage: 75, speed: 5, manaCost: 15, projectile: 'influx_wave' });
        
        // === TOMES (5 new) ===
        this.createItem('Book of Skulls', 'magic', '#D4C9A8', { damage: 35, speed: 8, manaCost: 10, projectile: 'skull_projectile' });
        this.createItem('Demon Scythe', 'magic', '#6600CC', { damage: 42, speed: 7, manaCost: 12, projectile: 'demon_scythe' });
        this.createItem('Crystal Storm', 'magic', '#44CCFF', { damage: 8, speed: 5, manaCost: 3, projectile: 'crystal_shard', multishot: 3 });
        this.createItem('Cursed Flames', 'magic', '#44CC44', { damage: 48, speed: 6, manaCost: 11, projectile: 'cursed_fire', dot: true });
        this.createItem('Golden Shower', 'magic', '#FF4466', { damage: 45, speed: 6, manaCost: 10, projectile: 'ichor_spray', defenseReduction: 20 });
        
        // === WANDS (6 new) ===
        this.createItem('Water Bolt', 'magic', '#4466FF', { damage: 32, speed: 8, manaCost: 9, projectile: 'water_sphere', bounces: 4 });
        this.createItem('Laser Rifle', 'magic', '#FF4444', { damage: 52, speed: 5, manaCost: 12, projectile: 'laser_beam' });
        this.createItem('Spirit Flame', 'magic', '#FFDD44', { damage: 58, speed: 5, manaCost: 13, projectile: 'spirit_fire', homing: true });
        this.createItem('Frost Staff', 'magic', '#44CCFF', { damage: 48, speed: 6, manaCost: 11, projectile: 'frost_blast', slow: true });
        this.createItem('Razorblade Typhoon', 'magic', '#44FF88', { damage: 65, speed: 4, manaCost: 14, projectile: 'razorblade', pierce: true });
        this.createItem('Magnet Sphere', 'magic', '#FF44AA', { damage: 72, speed: 4, manaCost: 15, projectile: 'magnet_ball', persistent: true });
        
        // === SENTRIES (4 new) ===
        this.createItem('Ballista Rod', 'sentry', '#8B6914', { damage: 65, speed: 3, manaCost: 20, sentry: 'ballista', pierce: true });
        this.createItem('Explosive Trap Rod', 'sentry', '#FF4400', { damage: 85, speed: 2, manaCost: 25, sentry: 'trap', explosion: true });
        this.createItem('Flameburst Rod', 'sentry', '#FF6622', { damage: 55, speed: 4, manaCost: 18, sentry: 'flame', dot: true });
        this.createItem('Lightning Aura Rod', 'sentry', '#FFDD44', { damage: 45, speed: 5, manaCost: 16, sentry: 'aura', electric: true });
    },
    
    addSummonWeapons() {
        console.log('  👻 Adding summon weapons...');
        
        // === WHIPS (6 new) ===
        this.createItem('Leather Whip', 'whip', '#8B6914', { damage: 8, speed: 8, range: 40, tagDamage: 2 });
        this.createItem('Thorn Whip', 'whip', '#44CC44', { damage: 15, speed: 7, range: 45, tagDamage: 3 });
        this.createItem('Snapthorn', 'whip', '#66AA44', { damage: 22, speed: 6, range: 50, tagDamage: 4, jungle: true });
        this.createItem('Firecracker', 'whip', '#FF4400', { damage: 32, speed: 5, range: 55, tagDamage: 5, explosion: true });
        this.createItem('Cool Whip', 'whip', '#44CCFF', { damage: 38, speed: 5, range: 58, tagDamage: 6, frost: true });
        this.createItem('Dark Harvest', 'whip', '#6600CC', { damage: 45, speed: 4, range: 60, tagDamage: 7, lifeSteal: true });
        this.createItem('Kaleidoscope', 'whip', '#FF44AA', { damage: 55, speed: 4, range: 65, tagDamage: 8, crit: 20 });
        
        // === SUMMON STAVES (8 new) ===
        this.createItem('Slime Staff', 'summon', '#44CC44', { damage: 5, count: 1, minion: 'slime' });
        this.createItem('Flinx Staff', 'summon', '#FFDDFF', { damage: 8, count: 1, minion: 'flinx' });
        this.createItem('Abigail\'s Flower', 'summon', '#FF44AA', { damage: 12, count: 1, minion: 'abigail' });
        this.createItem('Frost Hydra Staff', 'summon', '#44CCFF', { damage: 25, count: 1, minion: 'hydra', sentry: true });
        this.createItem('Spider Staff', 'summon', '#664422', { damage: 18, count: 2, minion: 'spider' });
        this.createItem('Optic Staff', 'summon', '#FF2222', { damage: 22, count: 2, minion: 'twins' });
        this.createItem('Pirate Staff', 'summon', '#4466AA', { damage: 28, count: 2, minion: 'pirate' });
        this.createItem('Pygmy Staff', 'summon', '#44AA22', { damage: 32, count: 3, minion: 'pygmy', thrown: true });
        this.createItem('Desert Tiger Staff', 'summon', '#FFDD44', { damage: 35, count: 1, minion: 'tiger', tank: true });
        this.createItem('Raven Staff', 'summon', '#443366', { damage: 38, count: 4, minion: 'raven' });
        this.createItem('Tempest Staff', 'summon', '#4488FF', { damage: 42, count: 3, minion: 'sharkron' });
        this.createItem('Stardust Dragon Staff', 'summon', '#4488FF', { damage: 50, count: 1, minion: 'dragon', grows: true });
        this.createItem('Stardust Cell Staff', 'summon', '#44FFDD', { damage: 45, count: 4, minion: 'cell', lifesteal: true });
        this.createItem('Lunar Portal Staff', 'summon', '#FFDD44', { damage: 75, count: 1, minion: 'portal', laser: true });
    },
    
    addSpecialWeapons() {
        console.log('  ⭐ Adding special weapons...');
        
        // === MELEE SPECIAL (5 new) ===
        this.createItem('Seedler', 'weapon', '#44AA22', { damage: 35, speed: 5, range: 50, projectiles: 3 });
        this.createItem('Starfury', 'weapon', '#FFDD44', { damage: 28, speed: 4, range: 45, starfall: true });
        this.createItem('Enchanted Sword', 'weapon', '#88CCFF', { damage: 32, speed: 4, range: 48, projectile: 'enchanted_beam' });
        this.createItem('Bee Keeper', 'weapon', '#FFDD44', { damage: 25, speed: 5, range: 42, bees: 3, piercing: true });
        this.createItem('Bat Bat', 'weapon', '#664433', { damage: 38, speed: 4, range: 45, lifesteal: 3 });
        
        // === RANGED SPECIAL (4 new) ===
        this.createItem('Harpoon', 'gun', '#667788', { damage: 42, speed: 4, range: 60, melee: true });
        this.createItem('Stake Launcher', 'gun', '#8B4513', { damage: 95, speed: 3, vampire: true });
        this.createItem('Toxikarp', 'bow', '#44CC66', { damage: 48, speed: 4, toxic: true, cloud: true });
        this.createItem('Tsunami', 'bow', '#4488FF', { damage: 62, speed: 3, multishot: 5 });
        
        // === MAGIC SPECIAL (3 new) ===
        this.createItem('Medusa Head', 'magic', '#AAAAAA', { damage: 45, speed: 2, manaCost: 20, petrify: true });
        this.createItem('Staff of Earth', 'magic', '#8B6914', { damage: 95, speed: 2, manaCost: 25, boulder: true });
        this.createItem('Last Prism', 'magic', '#4488FF', { damage: 85, speed: 1, manaCost: 30, beam: true, dps: 300 });
    }
};

// Initialize Phase 2 weapons
Phase2Weapons.init();

console.log('⚔️ Phase 2: Weapon Expansion complete');
