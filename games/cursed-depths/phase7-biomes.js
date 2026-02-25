/* ============================================================
   CURSED DEPTHS - PHASE 7: BIOME EXPANSION
   20 Distinct Biomes | Unique Enemies | Biome Mechanics
   ============================================================ */

// ===== BIOME DATABASE =====
const BiomeSystem = {
    biomes: {},
    
    init() {
        console.log('🌍 Phase 7: Biome Expansion initialized');
        this.defineBiomes();
    },
    
    defineBiomes() {
        // === SURFACE BIOMES (1-8) ===
        
        this.biomes.forest = {
            id: 'forest',
            name: 'Forest',
            type: 'surface',
            backgroundColor: '#1A3A1A',
            grassColor: '#2D5A1E',
            treeVariety: ['oak', 'pine', 'birch'],
            enemies: ['slime', 'zombie', 'demon_eye', 'mushroom_zombie'],
            rareEnemies: ['pink_slime', 'nymph'],
            resources: ['wood', 'stone', 'iron_ore', 'coins'],
            music: 'overcast_day',
            weatherEffects: ['rain', 'wind'],
            fishingPool: ['trout', 'bass', 'pike']
        };
        
        this.biomes.desert = {
            id: 'desert',
            name: 'Desert',
            type: 'surface',
            backgroundColor: '#C2A645',
            groundColor: '#D4B56A',
            features: ['cactus', 'pyramid', 'fossil_site'],
            enemies: ['vulture', 'scorpion', 'sand_shark', 'tomb_raider'],
            rareEnemies: ['djinn', 'mummy'],
            resources: ['sand', 'cactus', 'fossil', 'gold_ore'],
            music: 'desert_sun',
            weatherEffects: ['sandstorm'],
            fishingPool: ['catfish', 'shark']
        };
        
        this.biomes.snow = {
            id: 'snow',
            name: 'Snow Biome',
            type: 'surface',
            backgroundColor: '#AADDFF',
            groundColor: '#E8E8F0',
            features: ['ice_lake', 'snow_pile', 'frozen_tree'],
            enemies: ['ice_slime', 'ice_tortoise', 'wolf', 'yeti'],
            rareEnemies: ['frost_legionnaire', 'ice_queen'],
            resources: ['ice', 'snow_block', 'frozen_chest', 'platinum_ore'],
            music: 'frostbite',
            weatherEffects: ['blizzard', 'aurora'],
            fishingPool: ['salmon', 'cod', 'walleye']
        };
        
        this.biomes.jungle = {
            id: 'jungle',
            name: 'Jungle',
            type: 'surface',
            backgroundColor: '#1A6B1A',
            groundColor: '#2D8B2D',
            features: ['mahogany_tree', 'vine_canopy', 'bee_hive', 'temple_ruins'],
            enemies: ['jungle_slime', 'hornet', 'man_eater', 'jungle_turtle'],
            rareEnemies: ['planteras_spirit', 'chlorophyte_mimic'],
            resources: ['mud', 'mahogany', 'jungle_spores', 'life_crystal'],
            music: 'jungle_pulse',
            weatherEffects: ['monsoon', 'fog'],
            fishingPool: ['tiger_trout', 'neon_tetra']
        };
        
        this.biomes.corruption = {
            id: 'corruption',
            name: 'Corruption',
            type: 'evil',
            backgroundColor: '#330022',
            groundColor: '#2A1533',
            features: ['chasms', 'shadow_orbs', 'corrupt_trees', 'crimstone'],
            enemies: ['corrupt_slime', 'eater_soul', 'devourer', 'corruptor'],
            rareEnemies: ['world_feeder', 'corrupt_mimic'],
            resources: ['demonite_ore', 'shadow_scales', 'corrupt_seeds'],
            music: 'corruption_theme',
            spreadRate: 0.05,
            evilBiome: true
        };
        
        this.biomes.crimson = {
            id: 'crimson',
            name: 'Crimson',
            type: 'evil',
            backgroundColor: '#6B1020',
            groundColor: '#8B2030',
            features: ['crimson_caves', 'crimson_hearts', 'flesh_clumps'],
            enemies: ['crimson_slime', 'face_monster', 'blood_crawler', 'herpling'],
            rareEnemies: ['crimera', 'crimson_mimic'],
            resources: ['crimtane_ore', 'tissue_samples', 'crimson_seeds'],
            music: 'crimson_theme',
            spreadRate: 0.05,
            evilBiome: true
        };
        
        this.biomes.hallow = {
            id: 'hallow',
            name: 'Hallow',
            type: 'holy',
            backgroundColor: '#EEDDFF',
            groundColor: '#FFDDFF',
            features: ['crystal_trees', 'rainbow_clouds', 'unicorn_pastures'],
            enemies: ['pixie', 'unicorn', 'gastropod', 'chaos_elemental'],
            rareEnemies: ['hallowed_mimic', 'empress_of_light'],
            resources: ['crystal_shard', 'unicorn_horn', 'pixie_dust'],
            music: 'hallow_theme',
            spreadRate: 0.03,
            holyBiome: true
        };
        
        this.biomes.mushroom = {
            id: 'mushroom',
            name: 'Glowing Mushroom',
            type: 'special',
            backgroundColor: '#330066',
            groundColor: '#442266',
            features: ['glowing_mushrooms', 'mushroom_trees', 'spore_clouds'],
            enemies: ['mushroom_slime', 'fungi_bulb', 'anthera', 'truffle_worm'],
            rareEnemies: ['mushroom_king', 'spore_bat'],
            resources: ['glowing_mushroom', 'mushroom_grass', 'autohammer'],
            music: 'mushroom_theme',
            requiresMud: true
        };
        
        // === UNDERGROUND BIOMES (9-15) ===
        
        this.biomes.caverns = {
            id: 'caverns',
            name: 'Caverns',
            type: 'underground',
            backgroundColor: '#333344',
            groundColor: '#444455',
            features: ['stalactites', 'underground_pools', 'gem_veins'],
            enemies: ['bat', 'giant_worm', 'skeleton', 'cave_slime'],
            rareEnemies: ['tim', 'rune_wizard', 'armored_bones'],
            resources: ['gems', 'gold_ore', 'crystals', 'ancient_tablet'],
            music: 'underground_theme'
        };
        
        this.biomes.ice_caverns = {
            id: 'ice_caverns',
            name: 'Ice Caverns',
            type: 'underground',
            backgroundColor: '#6688AA',
            groundColor: '#88AACC',
            features: ['frozen_waterfalls', 'ice_columns', 'frozen_chests'],
            enemies: ['ice_bat', 'ice_golem', 'frost_core', 'spiked_ice_slime'],
            rareEnemies: ['cryo_genesis', 'ice_mimic'],
            resources: ['ice_block', 'frozen_chest_contents', 'frost_armor_parts'],
            music: 'ice_caverns'
        };
        
        this.biomes.desert_fossil = {
            id: 'desert_fossil',
            name: 'Desert Fossil',
            type: 'underground',
            backgroundColor: '#B89555',
            groundColor: '#C9A96E',
            features: ['fossil_chunks', 'amber_deposits', 'dino_bones'],
            enemies: ['bone_snatcher', 'desert_spirit', 'fossil_head'],
            rareEnemies: ['archaeologist_ghost', 'amber_mimic'],
            resources: ['desert_fossil', 'amber', 'sturdy_fossil'],
            music: 'excavation_site'
        };
        
        this.biomes.bee_hive = {
            id: 'bee_hive',
            name: 'Bee Hive',
            type: 'underground',
            backgroundColor: '#DDAA33',
            groundColor: '#EEBB44',
            features: ['honey_pools', 'larva', 'honey_comb'],
            enemies: ['angry_bee', 'hive_guardian'],
            rareEnemies: ['queen_bee'],
            resources: ['honey_block', 'beeswax', 'royal_jelly'],
            music: 'hive_theme',
            bossSpawn: 'queen_bee'
        };
        
        this.biomes.spider_nest = {
            id: 'spider_nest',
            name: 'Spider Nest',
            type: 'underground',
            backgroundColor: '#332244',
            groundColor: '#443355',
            features: ['cobweb_walls', 'spider_eggs', 'web_trap'],
            enemies: ['wall_creeper', 'black_recluse', 'spiderling'],
            rareEnemies: ['spider_queen', 'web_mage'],
            resources: ['cobweb', 'spider_fang', 'spider_egg'],
            music: 'spider_caves'
        };
        
        this.biomes.granite_cave = {
            id: 'granite_cave',
            name: 'Granite Cave',
            type: 'underground',
            backgroundColor: '#556677',
            groundColor: '#667788',
            features: ['granite_columns', 'smooth_marble', 'geode_clusters'],
            enemies: ['granite_golem', 'granite_elemental', 'medusa'],
            rareEnemies: ['granite_giant', 'petrified_warrior'],
            resources: ['granite_block', 'marble_block', 'geode'],
            music: 'granite_caves'
        };
        
        this.biomes.marble_cave = {
            id: 'marble_cave',
            name: 'Marble Cave',
            type: 'underground',
            backgroundColor: '#DDCCBB',
            groundColor: '#EECCAA',
            features: ['marble_columns', 'greek_statues', 'pillar_halls'],
            enemies: ['hoplite', 'marble_elemental', 'medusa_head'],
            rareEnemies: ['minotaur', 'centaur'],
            resources: ['marble_block', 'golden_chest', 'ambrosia'],
            music: 'marble_halls'
        };
        
        // === SPECIAL BIOMES (16-20) ===
        
        this.biomes.dungeon = {
            id: 'dungeon',
            name: 'Dungeon',
            type: 'special',
            backgroundColor: '#334466',
            groundColor: '#445577',
            features: ['dungeon_bricks', 'locked_chests', 'trap_corridors', 'skeletron_altar'],
            enemies: ['dungeon_guardian', 'blue_armored_bones', 'hell_armored_bones', 'rusty_armored_bones'],
            rareEnemies: ['ragged_castor', 'diabolist', 'necromancer'],
            resources: ['dungeon_chest_loot', 'book', 'water_bolt', 'muramasa'],
            music: 'dungeon_theme',
            requiresBossDefeat: 'skeletron',
            difficulty: 'hard'
        };
        
        this.biomes.jungle_temple = {
            id: 'jungle_temple',
            name: 'Jungle Temple',
            type: 'special',
            backgroundColor: '#886633',
            groundColor: '#997744',
            features: ['lihzahrd_bricks', 'temple_traps', 'altar_room'],
            enemies: ['lihzahrd', 'flying_snake', 'lihzahrd_warrior'],
            rareEnemies: ['golem', 'lihzahrd_priest'],
            resources: ['lihzahrd_chest', 'solar_tablet_fragment', 'pickaxe_axe'],
            music: 'temple_theme',
            requiresBossDefeat: 'plantera',
            difficulty: 'very_hard'
        };
        
        this.biomes.underworld = {
            id: 'underworld',
            name: 'The Underworld',
            type: 'special',
            backgroundColor: '#330000',
            groundColor: '#551100',
            features: ['ash_blocks', 'lava_pools', 'ruined_buildings', 'hellforge'],
            enemies: ['fire_imp', 'lava_slime', 'demon', 'bone_ser pent'],
            rareEnemies: ['wall_of_flesh', 'tortoised_demon'],
            resources: ['hellstone', 'obsidian', 'demon_torch', 'underworld_chest'],
            music: 'underworld_theme',
            lavaDamage: 50,
            difficulty: 'hard'
        };
        
        this.biomes.sky_islands = {
            id: 'sky_islands',
            name: 'Sky Islands',
            type: 'special',
            backgroundColor: '#88CCFF',
            groundColor: '#AADDFF',
            features: ['floating_islands', 'cloud_blocks', 'harpy_nests', 'skyware_chests'],
            enemies: ['harpy', 'wyvern', 'cloud_slime'],
            rareEnemies: ['wyvern_head', 'leprechaun'],
            resources: ['skyware', 'starfury', 'lucky_horseshoe', 'angel_statue'],
            music: 'space_theme',
            gravityReduction: 0.6
        };
        
        this.biomes.ocean = {
            id: 'ocean',
            name: 'Ocean',
            type: 'surface',
            backgroundColor: '#1144AA',
            waterColor: '#1A55CC',
            features: ['deep_water', 'palm_trees', 'sunken_chests', 'coral_reefs'],
            enemies: ['shark', 'crab', 'squid', 'sea_snail'],
            rareEnemies: ['duke_fishron', 'nautilus_bomb'],
            resources: ['palm_wood', 'coral', 'seashell', 'treasure_map'],
            music: 'ocean_theme',
            waterDepth: 200,
            drowningDamage: true
        };
        
        this.biomes.space = {
            id: 'space',
            name: 'Space',
            type: 'special',
            backgroundColor: '#000022',
            groundColor: '#444466',
            features: ['meteor_craters', 'space_stations', 'alien_technology'],
            enemies: ['alien_larva', 'martian_drone', 'gray_grunt', 'ray_gunner'],
            rareEnemies: ['mothership', 'martian_saucer'],
            resources: ['meteorite', 'luminite', 'alien_plating', 'zero_gravity_bar'],
            music: 'space_theme',
            lowGravity: true,
            suffocationTimer: 30
        };
    },
    
    getBiomeAt(x, y) {
        const depth = y / TILE;
        
        // Check vertical layers first
        if (depth < SURFACE_Y) return 'space';
        if (depth < CAVE_Y) return this.getSurfaceBiome(x);
        if (depth < MUSH_Y) return 'caverns';
        if (depth < FROZEN_Y) return this.getUndergroundBiome(x, y);
        if (depth < FLESH_Y) return 'ice_caverns';
        if (depth < HIVE_Y) return 'underworld';
        
        return 'abyss';
    },
    
    getSurfaceBiome(x) {
        // Horizontal biome distribution based on world position
        const worldWidth = WORLD_W * TILE;
        const position = x / worldWidth;
        
        if (position < 0.05 || position > 0.95) return 'ocean';
        if (position < 0.15) return 'corruption';
        if (position > 0.85) return 'crimson';
        if (position < 0.3) return 'desert';
        if (position > 0.7) return 'snow';
        if (position > 0.5 && Math.random() < 0.1) return 'jungle';
        
        return 'forest';
    },
    
    getUndergroundBiome(x, y) {
        // Check for special underground biomes
        if (this.isNearStructure(x, y, 'bee_hive')) return 'bee_hive';
        if (this.isNearStructure(x, y, 'spider_nest')) return 'spider_nest';
        if (this.isNearStructure(x, y, 'granite_cave')) return 'granite_cave';
        if (this.isNearStructure(x, y, 'marble_cave')) return 'marble_cave';
        
        // Evil biome spread
        if (this.hasEvilSpread(x, y, 'corruption')) return 'corruption';
        if (this.hasEvilSpread(x, y, 'crimson')) return 'crimson';
        
        return 'caverns';
    },
    
    isNearStructure(x, y, structureType) {
        // Check proximity to generated structures
        const structures = worldData?.structures || [];
        return structures.some(s => {
            const dist = Math.sqrt((s.x - x) ** 2 + (s.y - y) ** 2);
            return s.type === structureType && dist < 200;
        });
    },
    
    hasEvilSpread(x, y, evilType) {
        // Check if evil biome has spread to this location
        const tiles = getTilesInRadius(x, y, 50);
        const evilTiles = tiles.filter(t => 
            t.type === getEvilTileType(evilType)
        );
        return evilTiles.length > tiles.length * 0.3;
    },
    
    applyBiomeEffects(player, dt) {
        const currentBiome = this.getBiomeAt(player.x, player.y);
        const biome = this.biomes[currentBiome];
        
        if (!biome) return;
        
        // Apply biome-specific effects
        switch(currentBiome) {
            case 'corruption':
            case 'crimson':
                player.sanity -= 0.1 * dt;
                break;
            
            case 'hallow':
                player.luck += 0.01 * dt;
                break;
            
            case 'underworld':
                if (!player.hasObsidianSkull) {
                    player.hp -= 10 * dt;
                }
                break;
            
            case 'space':
                player.oxygen -= dt;
                if (player.oxygen <= 0) {
                    player.hp -= 20 * dt;
                }
                player.gravity = GRAVITY * 0.6;
                break;
            
            case 'ocean':
                if (player.inWater) {
                    player.oxygen -= dt * 0.5;
                }
                break;
        }
        
        // Update background and music
        this.updateEnvironment(currentBiome);
    },
    
    updateEnvironment(biomeId) {
        const biome = this.biomes[biomeId];
        if (!biome) return;
        
        // Set background color
        document.body.style.background = biome.backgroundColor;
        
        // Change music
        if (window.AudioController) {
            AudioController.changeTrack(biome.music);
        }
        
        // Spawn biome-specific particles
        if (biome.weatherEffects) {
            this.spawnWeatherParticles(biome.weatherEffects);
        }
    },
    
    spawnWeatherParticles(effects) {
        effects.forEach(effect => {
            if (effect === 'rain') {
                // Spawn rain particles
                for (let i = 0; i < 5; i++) {
                    worldParticles.push({
                        x: Math.random() * window.innerWidth,
                        y: 0,
                        vx: 0,
                        vy: 10 + Math.random() * 5,
                        life: 100,
                        type: 'rain'
                    });
                }
            }
            if (effect === 'blizzard') {
                // Spawn snow particles
                for (let i = 0; i < 8; i++) {
                    worldParticles.push({
                        x: Math.random() * window.innerWidth,
                        y: 0,
                        vx: (Math.random() - 0.5) * 3,
                        vy: 2 + Math.random() * 3,
                        life: 200,
                        type: 'snow'
                    });
                }
            }
        });
    },
    
    getBiomeEnemies(biomeId, difficulty) {
        const biome = this.biomes[biomeId];
        if (!biome) return [];
        
        let enemies = [...biome.enemies];
        
        // Add rare enemies based on luck
        if (Math.random() < 0.05 + (player.luck || 0)) {
            enemies = enemies.concat(biome.rareEnemies);
        }
        
        // Scale enemy stats with difficulty
        return enemies.map(enemyId => ({
            ...getEnemyStats(enemyId),
            hp: getEnemyStats(enemyId).hp * difficulty
        }));
    },
    
    getBiomeResources(biomeId) {
        const biome = this.biomes[biomeId];
        return biome ? biome.resources : [];
    },
    
    render(ctx, camX, camY) {
        // Render biome-specific background elements
        const biomeId = this.getBiomeAt(camX + window.innerWidth / 2, camY + window.innerHeight / 2);
        const biome = this.biomes[biomeId];
        
        if (biome && biome.features) {
            biome.features.forEach(feature => {
                this.renderBiomeFeature(ctx, feature, camX, camY);
            });
        }
    },
    
    renderBiomeFeature(ctx, feature, camX, camY) {
        // Render biome-specific visual features
        ctx.save();
        ctx.globalAlpha = 0.3;
        
        switch(feature) {
            case 'crystal_trees':
                ctx.fillStyle = '#FFDDFF';
                // Draw crystal tree silhouettes
                break;
            case 'ash_blocks':
                ctx.fillStyle = '#331100';
                // Draw falling ash particles
                break;
            case 'spore_clouds':
                ctx.fillStyle = '#44FF44';
                // Draw glowing spore clouds
                break;
        }
        
        ctx.restore();
    }
};

// Export globally
window.BiomeSystem = BiomeSystem;

console.log('🌍 Phase 7: Biome Expansion loaded - 20 biomes defined');
