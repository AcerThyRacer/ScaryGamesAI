/* ============================================================
   CURSED DEPTHS — Expanded Biome System
   Phase 6: 20+ unique biomes with enemies, loot, and structures
   ============================================================ */

class BiomeManager {
    constructor() {
        // 20+ Distinct Biomes (Surface + Underground + Special)
        this.BIOMES = {
            // ========== SURFACE BIOMES (8) ==========
            FOREST: {
                id: 0,
                name: 'Forest',
                type: 'surface',
                grassTile: T.GRASS,
                treeType: T.WOOD,
                backgroundWalls: ['dirt_wall', 'stone_wall'],
                surfaceBlock: T.DIRT,
                undergroundBlocks: [T.STONE],
                enemies: {
                    day: ['slime_green', 'slime_blue', 'zombie'],
                    night: ['zombie', 'demon_eye', 'wolf'],
                    bloodMoon: ['zombie', 'demon_eye', 'blood_zombie', 'drippler']
                },
                rareEnemies: ['nymph', 'pixie'],
                bossSpawns: ['eye_of_cthulhu'],
                musicTrack: 'overworld_day',
                backgroundColor: '#4A7C3F',
                ambientParticles: ['leaf', 'pollen'],
                weatherAllowed: ['rain', 'thunderstorm'],
                structures: ['tree', 'mushroom', 'pond'],
                lootContainers: ['surface_chest', 'wooden_crate'],
                fishingCatches: ['minnow', 'trout', 'bass'],
                plants: ['daybloom', 'moonglow'],
                specialFeatures: {
                    hasWater: true,
                    hasTrees: true,
                    hasMushrooms: true,
                    npcFriendly: true
                }
            },

            DESERT: {
                id: 1,
                name: 'Desert',
                type: 'surface',
                grassTile: T.SAND,
                treeType: T.CACTUS,
                backgroundWalls: ['sandstone_wall'],
                surfaceBlock: T.SAND,
                undergroundBlocks: [T.SANDSTONE, T.HARDENED_SAND],
                enemies: {
                    day: ['vulture', 'scorpion', 'antlion'],
                    night: ['skeleton', 'bat', 'mummy'],
                    sandstorm: ['sand_shark', 'crimera', 'corruptor']
                },
                rareEnemies: ['lamia', 'djinn'],
                bossSpawns: [],
                musicTrack: 'desert_day',
                backgroundColor: '#D4B56A',
                ambientParticles: ['sand', 'heat_haze'],
                weatherAllowed: ['sandstorm', 'clear'],
                structures: ['pyramid', 'desert_fossil', 'cactus'],
                lootContainers: ['pyramid_chest', 'desert_crate'],
                fishingCatches: ['catfish', 'shark'],
                plants: ['cactus', 'barrel_cactus'],
                specialFeatures: {
                    hasWater: false,
                    hasTrees: false,
                    hasMushrooms: false,
                    npcFriendly: false,
                    waterRash: true,
                    sandstorms: true
                }
            },

            SNOW: {
                id: 2,
                name: 'Snow Biome',
                type: 'surface',
                grassTile: T.SNOW,
                treeType: T.BOREAL_WOOD,
                backgroundWalls: ['ice_wall', 'snow_wall'],
                surfaceBlock: T.SNOW,
                undergroundBlocks: [T.ICE, T.FROZEN_STONE],
                enemies: {
                    day: ['ice_slime', 'penguin', 'ice_tortoise'],
                    night: ['undead_viking', 'spiked_ice_slime', 'wolf'],
                    blizzard: ['yeti', 'ice_golem']
                },
                rareEnemies: ['yet i', 'deerclops'],
                bossSpawns: ['deerclops'],
                musicTrack: 'snow_day',
                backgroundColor: '#C8E0F0',
                ambientParticles: ['snowflake', 'frost'],
                weatherAllowed: ['blizzard', 'snow'],
                structures: ['ice_house', 'frozen_chest', 'pine_tree'],
                lootContainers: ['frozen_crate', 'ice_chest'],
                fishingCatches: ['salmon', 'tuna', 'cod'],
                plants: ['shiverthorn', 'frozen_flower'],
                specialFeatures: {
                    hasWater: true,
                    waterFreezes: true,
                    hasTrees: true,
                    hasMushrooms: false,
                    npcFriendly: true,
                    playerSlip: true
                }
            },

            JUNGLE: {
                id: 3,
                name: 'Jungle',
                type: 'surface',
                grassTile: T.JUNGLE_GRASS,
                treeType: T.MAHOGANY_WOOD,
                backgroundWalls: ['jungle_wall', 'vine_wall'],
                surfaceBlock: T.MUD,
                undergroundBlocks: [T.MUD, T.JUNGLE_GRASS],
                enemies: {
                    day: ['jungle_slime', 'hornet', 'man_eater'],
                    night: ['moth', 'poisonous_spider', 'jungle_bat'],
                    hardmode: ['chlorophyte_orb', 'giant_tortoise']
                },
                rareEnemies: ['doctor_bones', 'mothron'],
                bossSpawns: ['queen_bee', 'plantera'],
                musicTrack: 'jungle_day',
                backgroundColor: '#2D5A1E',
                ambientParticles: ['leaf', 'spore', 'firefly'],
                weatherAllowed: ['rain', 'thunderstorm'],
                structures: ['jungle_shrine', 'beehive', 'mahogany_tree'],
                lootContainers: ['ivy_chest', 'jungle_crate', 'bee_hive'],
                fishingCatches: ['tiger_trout', 'scarlet_macaw'],
                plants: ['daybloom', 'blinkroot', 'jungle_rose'],
                specialFeatures: {
                    hasWater: true,
                    hasTrees: true,
                    hasMushrooms: true,
                    npcFriendly: true,
                    vines: true,
                    beehives: true
                }
            },

            CORRUPTION: {
                id: 4,
                name: 'Corruption',
                type: 'evil',
                grassTile: T.CORRUPT_GRASS,
                treeType: T.DEAD_TREE,
                backgroundWalls: ['ebonstone_wall', 'corrupt_wall'],
                surfaceBlock: T.EBONSTONE,
                undergroundBlocks: [T.EBONSTONE, T.CORRUPT_GRASS],
                enemies: {
                    day: ['eater_soul', 'corrupt_slime', 'corruptor'],
                    night: ['corrupt_zombie', 'vile_ghoul', 'corrupt_bat'],
                    hardmode: ['digesting_zombie', 'slimer']
                },
                rareEnemies: ['corrupt_mimic'],
                bossSpawns: ['eater_of_worlds'],
                musicTrack: 'corruption_theme',
                backgroundColor: '#3D1F4A',
                ambientParticles: ['shadow', 'purple_spore'],
                weatherAllowed: ['rain', 'thunderstorm'],
                structures: ['chasm', 'shadow_orb', 'corrupt_tree'],
                lootContainers: ['shadow_chest', 'corrupt_crate'],
                fishingCatches: ['worm', 'leech'],
                plants: ['deathweed', 'vile_mushroom'],
                specialFeatures: {
                    hasWater: false,
                    hasTrees: true,
                    hasMushrooms: false,
                    npcFriendly: false,
                    spreads: true,
                    chasms: true,
                    evilBiome: true
                }
            },

            CRIMSON: {
                id: 5,
                name: 'Crimson',
                type: 'evil',
                grassTile: T.CRIMSON_GRASS,
                treeType: T.CRIMSON_TREE,
                backgroundWalls: ['crimstone_wall', 'crimson_wall'],
                surfaceBlock: T.CRIMSTONE,
                undergroundBlocks: [T.CRIMSTONE, T.CRIMSON_GRASS],
                enemies: {
                    day: ['crimera', 'face_monster', 'blood_crawler'],
                    night: ['crimson_zombie', 'herpling', 'crimson_bat'],
                    hardmode: ['ichor_sticker', 'floaty_gross']
                },
                rareEnemies: ['crimson_mimic'],
                bossSpawns: ['brain_of_cthulhu'],
                musicTrack: 'crimson_theme',
                backgroundColor: '#8B2030',
                ambientParticles: ['blood_drip', 'red_spore'],
                weatherAllowed: ['rain', 'thunderstorm'],
                structures: ['crater', 'crimson_heart', 'flesh_clump'],
                lootContainers: ['crimson_chest', 'crimson_crate'],
                fishingCatches: ['hemopiranha', 'blood_eel'],
                plants: ['deathweed', 'crimson_thorns'],
                specialFeatures: {
                    hasWater: false,
                    hasTrees: true,
                    hasMushrooms: false,
                    npcFriendly: false,
                    spreads: true,
                    craters: true,
                    evilBiome: true,
                    ichorDebuff: true
                }
            },

            HALLOW: {
                id: 6,
                name: 'Hallow',
                type: 'holy',
                grassTile: T.HALLOWED_GRASS,
                treeType: T.CRYSTAL_TREE,
                backgroundWalls: ['pearlstone_wall', 'hallow_wall'],
                surfaceBlock: T.PEARLSTONE,
                undergroundBlocks: [T.PEARLSTONE, T.HALLOWED_STONE],
                enemies: {
                    day: ['unicorn', 'pixie', 'gastropod'],
                    night: ['chaos_elemental', 'illuminate_slime', 'spectral_elemental'],
                    hardmode: ['paladin', 'angel_statue']
                },
                rareEnemies: ['hallowed_mimic', 'empress_of_light'],
                bossSpawns: ['empress_of_light'],
                musicTrack: 'hallow_theme',
                backgroundColor: '#AADDFF',
                ambientParticles: ['rainbow', 'sparkle', 'fairy'],
                weatherAllowed: ['rain', 'clear'],
                structures: ['crystal_tree', 'fairy_ring', 'rainbow_cloud'],
                lootContainers: ['hallowed_chest', 'hallowed_crate'],
                fishingCatches: ['prism_fish', 'unicorn_fish'],
                plants: ['crystal_shard', 'pixie_dust'],
                specialFeatures: {
                    hasWater: true,
                    hasTrees: true,
                    hasMushrooms: false,
                    npcFriendly: true,
                    spreads: true,
                    holyBiome: true,
                    rainbowEffects: true
                }
            },

            MUSHROOM: {
                id: 7,
                name: 'Glowing Mushroom',
                type: 'surface',
                grassTile: T.MUSHROOM_GRASS,
                treeType: T.GLOWING_MUSHROOM,
                backgroundWalls: ['mushroom_wall'],
                surfaceBlock: T.MUD,
                undergroundBlocks: [T.MUD, T.GLOWING_MUSHROOM],
                enemies: {
                    day: ['mushroom_zombie', 'fungus_fish', 'spore_bat'],
                    night: ['giant_mushroom_zombie', 'toadstool', 'mushroom_spore'],
                    hardmode: ['anemone', 'fungi_bulb']
                },
                rareEnemies: ['truffle_worm'],
                bossSpawns: [],
                musicTrack: 'mushroom_theme',
                backgroundColor: '#7733AA',
                ambientParticles: ['spore', 'glow'],
                weatherAllowed: ['rain'],
                structures: ['glowing_mushroom', 'mushroom_house'],
                lootContainers: ['mushroom_chest'],
                fishingCatches: ['mushroom_fish', 'spore_trout'],
                plants: ['glowing_mushroom', 'mushroom_grass'],
                specialFeatures: {
                    hasWater: true,
                    hasTrees: false,
                    hasMushrooms: true,
                    npcFriendly: true,
                    glowing: true,
                    truffleNPC: true
                }
            },

            // ========== UNDERGROUND BIOMES (8) ==========
            CAVERNS: {
                id: 8,
                name: 'Caverns',
                type: 'underground',
                grassTile: null,
                treeType: null,
                backgroundWalls: ['stone_wall', 'moss_wall'],
                surfaceBlock: T.STONE,
                undergroundBlocks: [T.STONE, T.MOSS],
                enemies: {
                    normal: ['bat', 'giant_worm', 'skeleton'],
                    deep: ['timid_zombie', 'cave_bat', 'rock_golem'],
                    hardmode: ['armored_bones', 'rusty_armored_skeleton']
                },
                rareEnemies: ['nymph', 'bone_ser pent'],
                bossSpawns: [],
                musicTrack: 'underground_day',
                backgroundColor: '#4A4A4A',
                ambientParticles: ['dust', 'drip'],
                weatherAllowed: [],
                structures: ['stalactite', 'stalagmite', 'pool'],
                lootContainers: ['gold_chest', 'stone_chest'],
                fishingCatches: ['cave_fish', 'mudskipper'],
                plants: ['glowshroom', 'moss'],
                specialFeatures: {
                    hasWater: true,
                    hasTrees: false,
                    hasMushrooms: true,
                    npcFriendly: false,
                    stalactites: true,
                    pools: true
                }
            },

            UNDERGROUND_DESERT: {
                id: 9,
                name: 'Underground Desert',
                type: 'underground',
                grassTile: null,
                treeType: null,
                backgroundWalls: ['sandstone_wall', 'hardened_sand_wall'],
                surfaceBlock: T.SANDSTONE,
                undergroundBlocks: [T.SANDSTONE, T.HARDENED_SAND],
                enemies: {
                    normal: ['mummy', 'lamia', 'sand_poacher'],
                    hardmode: ['dreamer_genie', 'desert_spirit']
                },
                rareEnemies: ['ancient_doom'],
                bossSpawns: [],
                musicTrack: 'underground_desert',
                backgroundColor: '#B89555',
                ambientParticles: ['sand_drift'],
                weatherAllowed: [],
                structures: ['desert_fossil', 'larva', 'pot'],
                lootContainers: ['desert_fossil_chest'],
                fishingCatches: ['sandshark', 'desert_fish'],
                plants: [],
                specialFeatures: {
                    hasWater: false,
                    hasTrees: false,
                    hasMushrooms: false,
                    npcFriendly: false,
                    fossils: true,
                    larva: true
                }
            },

            UNDERGROUND_JUNGLE: {
                id: 10,
                name: 'Underground Jungle',
                type: 'underground',
                grassTile: null,
                treeType: null,
                backgroundWalls: ['jungle_vine_wall', 'mud_wall'],
                surfaceBlock: T.MUD,
                undergroundBlocks: [T.MUD, T.JUNGLE_VINE],
                enemies: {
                    normal: ['angler_fish', 'man_eater', 'jungle_bat'],
                    hardmode: ['chrome_slime', 'derpling', 'jungle_tortoise']
                },
                rareEnemies: ['doctor_bones'],
                bossSpawns: ['plantera', 'golem'],
                musicTrack: 'underground_jungle',
                backgroundColor: '#1A6B1A',
                ambientParticles: ['spore', 'drip'],
                weatherAllowed: [],
                structures: ['temple', 'shrine', 'hive'],
                lootContainers: ['jungle_chest', 'temple_chest'],
                fishingCatches: ['jungle_perch', 'tiger_trout'],
                plants: ['life_fruit', 'chlorophyte'],
                specialFeatures: {
                    hasWater: true,
                    hasTrees: false,
                    hasMushrooms: true,
                    npcFriendly: false,
                    temple: true,
                    lifeFruits: true,
                    chlorophyte: true
                }
            },

            ICE_CAVES: {
                id: 11,
                name: 'Ice Caves',
                type: 'underground',
                grassTile: null,
                treeType: null,
                backgroundWalls: ['ice_wall', 'frozen_wall'],
                surfaceBlock: T.ICE,
                undergroundBlocks: [T.ICE, T.FROZEN_STONE],
                enemies: {
                    normal: ['spiked_ice_slime', 'undead_viking', 'ice_bat'],
                    hardmode: ['ice_tortoise', 'subzero_slime']
                },
                rareEnemies: ['yeti'],
                bossSpawns: [],
                musicTrack: 'ice_underground',
                backgroundColor: '#A0C8D8',
                ambientParticles: ['snowflake', 'frost'],
                weatherAllowed: [],
                structures: ['frozen_chest', 'ice_column'],
                lootContainers: ['frozen_chest'],
                fishingCatches: ['salmon', 'arctic_char'],
                plants: ['shiverthorn'],
                specialFeatures: {
                    hasWater: true,
                    waterFreezes: true,
                    hasTrees: false,
                    hasMushrooms: false,
                    npcFriendly: false,
                    thinIce: true,
                    spikes: true
                }
            },

            GRAVEYARD: {
                id: 12,
                name: 'Graveyard',
                type: 'special',
                grassTile: T.GRASS,
                treeType: T.DEAD_TREE,
                backgroundWalls: ['graveyard_wall'],
                surfaceBlock: T.DIRT,
                undergroundBlocks: [T.STONE],
                enemies: {
                    normal: ['ghost', 'skeleton', 'wraith'],
                    night: ['poltergeist', 'possessed_armor']
                },
                rareEnemies: ['reaper'],
                bossSpawns: [],
                musicTrack: 'graveyard_theme',
                backgroundColor: '#2A2A3A',
                ambientParticles: ['fog', 'ectoplasm'],
                weatherAllowed: ['fog'],
                structures: ['gravestone', 'crypt', 'mausoleum'],
                lootContainers: ['grave_chest'],
                fishingCatches: ['ghost_fish'],
                plants: ['deathweed', 'withered_flower'],
                specialFeatures: {
                    hasWater: false,
                    hasTrees: true,
                    hasMushrooms: false,
                    npcFriendly: false,
                    ghosts: true,
                    ectoplasm: true
                }
            },

            HELL: {
                id: 13,
                name: 'The Underworld',
                type: 'special',
                grassTile: null,
                treeType: null,
                backgroundWalls: ['hellstone_wall', 'obsidian_wall'],
                surfaceBlock: T.OBSIDIAN,
                undergroundBlocks: [T.OBSIDIAN, T.HELLSTONE],
                enemies: {
                    normal: ['demon', 'bone_ser pent', 'lava_slime'],
                    hardmode: ['red_devil', 'tortured_soul']
                },
                rareEnemies: ['wall_of_flesh'],
                bossSpawns: ['wall_of_flesh'],
                musicTrack: 'underworld_theme',
                backgroundColor: '#CC3300',
                ambientParticles: ['ember', 'ash', 'fire'],
                weatherAllowed: [],
                structures: ['ruined_house', 'hellforge', 'ash_tree'],
                lootContainers: ['shadow_chest', 'hellforge'],
                fishingCatches: ['lavafly', 'hellfish'],
                plants: ['fireblossom'],
                specialFeatures: {
                    hasWater: false,
                    hasLava: true,
                    hasTrees: false,
                    hasMushrooms: false,
                    npcFriendly: false,
                    lavaPools: true,
                    hellforge: true,
                    wallOfFleshSpawn: true
                }
            },

            DUNGEON: {
                id: 14,
                name: 'Dungeon',
                type: 'special',
                grassTile: null,
                treeType: null,
                backgroundWalls: ['dungeon_brick_wall'],
                surfaceBlock: T.DUNGEON_BRICK,
                undergroundBlocks: [T.DUNGEON_BRICK],
                enemies: {
                    normal: ['dungeon_guardian', 'skeleton_sniper', 'tactical_skeleton'],
                    hardmode: ['ragged_castor', 'necromancer', 'diabolist']
                },
                rareEnemies: ['dungeon_mimic', 'cultist'],
                bossSpawns: ['skeletron', 'lunatic_cultist'],
                musicTrack: 'dungeon_theme',
                backgroundColor: '#445566',
                ambientParticles: ['dust', 'torch_flicker'],
                weatherAllowed: [],
                structures: ['dungeon_room', 'locked_chest', 'altar'],
                lootContainers: ['golden_chest', 'locked_golden_chest'],
                fishingCatches: ['bone_fish'],
                plants: [],
                specialFeatures: {
                    hasWater: true,
                    hasTrees: false,
                    hasMushrooms: false,
                    npcFriendly: false,
                    lockedDoors: true,
                    traps: true,
                    skeletronGuard: true
                }
            },

            BEE_HIVE: {
                id: 15,
                name: 'Bee Hive',
                type: 'special',
                grassTile: null,
                treeType: null,
                backgroundWalls: ['hive_wall'],
                surfaceBlock: T.HONEY_BLOCK,
                undergroundBlocks: [T.HIVE_WALL, T.HONEY_BLOCK],
                enemies: {
                    normal: ['bee', 'hornet'],
                    hardmode: ['killer_bee']
                },
                rareEnemies: ['queen_bee'],
                bossSpawns: ['queen_bee'],
                musicTrack: 'boss_queen_bee',
                backgroundColor: '#AA8822',
                ambientParticles: ['pollen', 'honey_drip'],
                weatherAllowed: [],
                structures: ['larva', 'honey_pool'],
                lootContainers: ['hive_chest'],
                fishingCatches: ['honey_fish'],
                plants: ['honey_blossom'],
                specialFeatures: {
                    hasWater: false,
                    hasHoney: true,
                    hasTrees: false,
                    hasMushrooms: false,
                    npcFriendly: false,
                    honeyPools: true,
                    larva: true,
                    queenBeeSpawn: true
                }
            },

            SPIDER_NEST: {
                id: 16,
                name: 'Spider Nest',
                type: 'special',
                grassTile: null,
                treeType: null,
                backgroundWalls: ['cobweb_wall'],
                surfaceBlock: T.COBWEB,
                undergroundBlocks: [T.COBWEB],
                enemies: {
                    normal: ['wall_creeper', 'black_recluse'],
                    hardmode: ['jungle_spider']
                },
                rareEnemies: ['spider_queen'],
                bossSpawns: [],
                musicTrack: 'spider_cave',
                backgroundColor: '#CCCCCC',
                ambientParticles: ['cobweb_strand'],
                weatherAllowed: [],
                structures: ['egg_sac', 'web_tunnel'],
                lootContainers: ['spider_chest'],
                fishingCatches: ['spider_fish'],
                plants: [],
                specialFeatures: {
                    hasWater: false,
                    hasTrees: false,
                    hasMushrooms: false,
                    npcFriendly: false,
                    cobwebs: true,
                    eggSacs: true,
                    verticalTunnels: true
                }
            },

            MARBLE_CAVERN: {
                id: 17,
                name: 'Marble Cavern',
                type: 'underground',
                grassTile: null,
                treeType: null,
                backgroundWalls: ['marble_wall'],
                surfaceBlock: T.MARBLE,
                undergroundBlocks: [T.MARBLE],
                enemies: {
                    normal: ['hoplite', 'medusa'],
                    hardmode: ['marble_elemental']
                },
                rareEnemies: ['gorgon'],
                bossSpawns: [],
                musicTrack: 'marble_cavern',
                backgroundColor: '#DDDDDD',
                ambientParticles: ['marble_dust'],
                weatherAllowed: [],
                structures: ['pillar', 'statue', 'urn'],
                lootContainers: ['marble_urn'],
                fishingCatches: ['marble_fish'],
                plants: [],
                specialFeatures: {
                    hasWater: true,
                    hasTrees: false,
                    hasMushrooms: false,
                    npcFriendly: false,
                    pillars: true,
                    statues: true,
                    smoothWalls: true
                }
            },

            GRANITE_CAVERN: {
                id: 18,
                name: 'Granite Cavern',
                type: 'underground',
                grassTile: null,
                treeType: null,
                backgroundWalls: ['granite_wall'],
                surfaceBlock: T.GRANITE,
                undergroundBlocks: [T.GRANITE],
                enemies: {
                    normal: ['granite_elemental', 'granite_golem'],
                    hardmode: ['granite_flyer']
                },
                rareEnemies: ['granite_giant'],
                bossSpawns: [],
                musicTrack: 'granite_cavern',
                backgroundColor: '#886655',
                ambientParticles: ['granite_chip'],
                weatherAllowed: [],
                structures: ['granite_column', 'granite_platform'],
                lootContainers: ['granite_chest'],
                fishingCatches: ['granite_fish'],
                plants: [],
                specialFeatures: {
                    hasWater: false,
                    hasTrees: false,
                    hasMushrooms: false,
                    npcFriendly: false,
                    columns: true,
                    platforms: true,
                    elementalSpawns: true
                }
            },

            GLOWING_MOSS_CAVERN: {
                id: 19,
                name: 'Glowing Moss Cavern',
                type: 'underground',
                grassTile: null,
                treeType: null,
                backgroundWalls: ['moss_wall'],
                surfaceBlock: T.MOSS,
                undergroundBlocks: [T.MOSS, T.STONE],
                enemies: {
                    normal: ['toxic_sludge', 'moss_bat'],
                    hardmode: ['radioactive_slime']
                },
                rareEnemies: ['moss_golem'],
                bossSpawns: [],
                musicTrack: 'moss_cavern',
                backgroundColor: '#55AA55',
                ambientParticles: ['moss_spore', 'glow'],
                weatherAllowed: [],
                structures: ['moss_cluster', 'glowing_pool'],
                lootContainers: ['moss_chest'],
                fishingCatches: ['moss_minnow'],
                plants: ['glowing_moss'],
                specialFeatures: {
                    hasWater: true,
                    hasTrees: false,
                    hasMushrooms: true,
                    npcFriendly: false,
                    glowing: true,
                    toxicPools: true
                }
            }
        };

        // Current biome state
        this.currentBiome = null;
        this.biomeTransition = 0;
        
        // Evil biome spread
        this.evilSpread = {
            corruption: 0,
            crimson: 0,
            hallow: 0
        };
    }

    init() {
        console.log('[BiomeManager] Initialized with 20 biomes');
    }

    update() {
        // Detect current biome based on player position
        this.detectCurrentBiome();
        
        // Update evil biome spread
        this.updateEvilSpread();
    }

    detectCurrentBiome() {
        const playerX = Math.floor(player.x / TILE);
        const playerY = Math.floor(player.y / TILE);
        const depth = playerY;
        
        // Check for special biomes first (radius-based)
        const specialBiome = this.checkSpecialBiomes(playerX, playerY);
        if (specialBiome) {
            this.currentBiome = specialBiome;
            return;
        }
        
        // Determine biome by depth and tile types
        if (depth < SURFACE_Y) {
            // Sky/Space - not a real biome
            this.currentBiome = null;
            return;
        } else if (depth >= ABYSS_Y) {
            this.currentBiome = this.BIOMES.HELL;
        } else if (depth >= HIVE_Y) {
            this.currentBiome = this.checkUndergroundBiome(playerX, playerY);
        } else if (depth >= FLESH_Y) {
            this.currentBiome = this.checkUndergroundBiome(playerX, playerY);
        } else if (depth >= FROZEN_Y) {
            this.currentBiome = this.checkUndergroundBiome(playerX, playerY);
        } else if (depth >= MUSH_Y) {
            this.currentBiome = this.checkUndergroundBiome(playerX, playerY);
        } else if (depth >= CAVE_Y) {
            this.currentBiome = this.BIOMES.CAVERNS;
        } else {
            // Surface - check tile types
            this.currentBiome = this.checkSurfaceBiome(playerX, playerY);
        }
    }

    checkSurfaceBiome(x, y) {
        // Check tiles in area around player
        const tiles = this.getTilesInRadius(x, y, 20);
        
        // Count tile types
        const counts = this.countTileTypes(tiles);
        
        // Determine dominant biome
        if (counts[T.CORRUPT_GRASS] > 150 || counts[T.EBONSTONE] > 150) {
            return this.BIOMES.CORRUPTION;
        }
        if (counts[T.CRIMSON_GRASS] > 150 || counts[T.CRIMSTONE] > 150) {
            return this.BIOMES.CRIMSON;
        }
        if (counts[T.HALLOWED_GRASS] > 150 || counts[T.PEARLSTONE] > 150) {
            return this.BIOMES.HALLOW;
        }
        if (counts[T.SAND] > 200) {
            return this.BIOMES.DESERT;
        }
        if (counts[T.SNOW] > 200 || counts[T.ICE] > 200) {
            return this.BIOMES.SNOW;
        }
        if (counts[T.JUNGLE_GRASS] > 200 || counts[T.MUD] > 200) {
            return this.BIOMES.JUNGLE;
        }
        if (counts[T.MUSHROOM_GRASS] > 150) {
            return this.BIOMES.MUSHROOM;
        }
        
        // Default to forest
        return this.BIOMES.FOREST;
    }

    checkUndergroundBiome(x, y) {
        const tiles = this.getTilesInRadius(x, y, 20);
        const counts = this.countTileTypes(tiles);
        
        // Check for underground variants
        if (counts[T.ICE] > 100 || counts[T.FROZEN_STONE] > 100) {
            return this.BIOMES.ICE_CAVES;
        }
        if (counts[T.SANDSTONE] > 100 || counts[T.HARDENED_SAND] > 100) {
            return this.BIOMES.UNDERGROUND_DESERT;
        }
        if (counts[T.MUD] > 100 && counts[T.JUNGLE_VINE] > 50) {
            return this.BIOMES.UNDERGROUND_JUNGLE;
        }
        if (counts[T.DUNGEON_BRICK] > 100) {
            return this.BIOMES.DUNGEON;
        }
        if (counts[T.MARBLE] > 100) {
            return this.BIOMES.MARBLE_CAVERN;
        }
        if (counts[T.GRANITE] > 100) {
            return this.BIOMES.GRANITE_CAVERN;
        }
        if (counts[T.MOSS] > 100) {
            return this.BIOMES.GLOWING_MOSS_CAVERN;
        }
        if (counts[T.COBWEB] > 150) {
            return this.BIOMES.SPIDER_NEST;
        }
        
        // Default to caverns
        return this.BIOMES.CAVERNS;
    }

    checkSpecialBiomes(x, y) {
        // Check for bee hive
        const hiveTiles = this.countTileInRadius(x, y, 30, T.HIVE_WALL);
        if (hiveTiles > 50) {
            return this.BIOMES.BEE_HIVE;
        }
        
        // Check for graveyard (count tombstones)
        // Would need tombstone tile implementation
        
        return null;
    }

    getTilesInRadius(x, y, radius) {
        const tiles = [];
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const tx = x + dx;
                const ty = y + dy;
                if (tx >= 0 && tx < WORLD_W && ty >= 0 && ty < WORLD_H) {
                    tiles.push(world[tx + ty * WORLD_W]);
                }
            }
        }
        return tiles;
    }

    countTileTypes(tiles) {
        const counts = {};
        for (const tile of tiles) {
            counts[tile] = (counts[tile] || 0) + 1;
        }
        return counts;
    }

    countTileInRadius(x, y, radius, tileType) {
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const tx = x + dx;
                const ty = y + dy;
                if (tx >= 0 && tx < WORLD_W && ty >= 0 && ty < WORLD_H) {
                    if (world[tx + ty * WORLD_W] === tileType) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    updateEvilSpread() {
        // Evil biomes spread in hardmode
        if (!Progression || !Progression.isHardmode()) {
            return;
        }
        
        // Spread logic would go here
        // For now, just track percentages
        this.evilSpread.corruption += 0.001;
        this.evilSpread.crimson += 0.001;
        this.evilSpread.hallow += 0.001;
    }

    getCurrentBiome() {
        return this.currentBiome || this.BIOMES.FOREST;
    }

    getBiomeMusic() {
        const biome = this.getCurrentBiome();
        return biome.musicTrack || 'overworld_day';
    }

    getBiomeEnemies(timeOfDay, isBloodMoon, isSandstorm, isBlizzard) {
        const biome = this.getCurrentBiome();
        
        if (isBloodMoon && biome.enemies.bloodMoon) {
            return biome.enemies.bloodMoon;
        }
        if (isSandstorm && biome.enemies.sandstorm) {
            return biome.enemies.sandstorm;
        }
        if (isBlizzard && biome.enemies.blizzard) {
            return biome.enemies.blizzard;
        }
        if (timeOfDay === 'night') {
            return biome.enemies.night || biome.enemies.normal;
        }
        
        return biome.enemies.day || biome.enemies.normal;
    }

    canNPCHere() {
        const biome = this.getCurrentBiome();
        return biome.specialFeatures.npcFriendly;
    }

    isEvilBiome() {
        const biome = this.getCurrentBiome();
        return biome.type === 'evil';
    }

    isHolyBiome() {
        const biome = this.getCurrentBiome();
        return biome.type === 'holy';
    }

    getBiomeBackgroundColor() {
        const biome = this.getCurrentBiome();
        return biome.backgroundColor || '#4A7C3F';
    }

    getAmbientParticles() {
        const biome = this.getCurrentBiome();
        return biome.ambientParticles || [];
    }
}

// Global biome manager instance
const Biomes = new BiomeManager();

// Initialize on game start
function initBiomes() {
    Biomes.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BiomeManager, Biomes, initBiomes };
}
