/* ============================================================
   CURSED DEPTHS — Boss Summoning System
   Phase 8: 15+ summoning items with crafting and conditions
   ============================================================ */

class BossSummoning {
    constructor() {
        // 15+ Boss Summoning Items
        this.BOSS_ITEMS = {
            // ========== PRE-HARDMODE BOSSES ==========
            SUSPICIOUS_LOOKING_EYE: {
                id: 'suspicious_looking_eye',
                name: 'Suspicious Looking Eye',
                boss: 'eye_of_cthulhu',
                description: 'Summons the Eye of Cthulhu',
                craftable: true,
                recipe: {
                    ingredients: [
                        { item: 'lens', count: 6 }
                    ],
                    station: T.DEMON_ALTAR,
                    time: 30
                },
                useConditions: {
                    time: 'night',
                    biome: null,
                    hp: 100,
                    notAlreadySummoned: true
                },
                consumed: true,
                rarity: 'white',
                tooltip: 'Summons a terrible eye from beyond'
            },
            
            WORM_FOOD: {
                id: 'worm_food',
                name: 'Worm Food',
                boss: 'eater_of_worlds',
                description: 'Summons the Eater of Worlds',
                craftable: true,
                recipe: {
                    ingredients: [
                        { item: 'rotting_flesh', count: 30 },
                        { item: 'vile_powder', count: 15 }
                    ],
                    station: T.DEMON_ALTAR,
                    time: 30
                },
                useConditions: {
                    time: null,
                    biome: 'corruption',
                    hp: 100,
                    notAlreadySummoned: true
                },
                consumed: true,
                rarity: 'purple',
                tooltip: 'Summons the devourer of worlds'
            },
            
            BLOODY_SPINE: {
                id: 'bloody_spine',
                name: 'Bloody Spine',
                boss: 'brain_of_cthulhu',
                description: 'Summons the Brain of Cthulhu',
                craftable: true,
                recipe: {
                    ingredients: [
                        { item: 'vertebra', count: 30 },
                        { item: 'vile_powder', count: 15 }
                    ],
                    station: T.CRIMSON_ALTAR,
                    time: 30
                },
                useConditions: {
                    time: null,
                    biome: 'crimson',
                    hp: 100,
                    notAlreadySummoned: true
                },
                consumed: true,
                rarity: 'red',
                tooltip: 'Summons the screaming brain'
            },
            
            ABOMINATION: {
                id: 'abomination',
                name: 'Abomination',
                boss: 'skeletron',
                description: 'Summons Skeletron',
                craftable: true,
                recipe: {
                    ingredients: [
                        { item: 'bone', count: 30 },
                        { item: 'cloth', count: 30 },
                        { item: 'ectoplasm', count: 5 }
                    ],
                    station: T.DEMON_ALTAR,
                    time: 30
                },
                useConditions: {
                    time: 'night',
                    biome: null,
                    hp: 100,
                    skeletronNotDefeated: true
                },
                consumed: true,
                rarity: 'purple',
                tooltip: 'Summons the cursed skeleton guardian'
            },
            
            QUEEN_STINGER: {
                id: 'queen_stinger',
                name: 'Queen Stinger',
                boss: 'queen_bee',
                description: 'Summons the Queen Bee',
                craftable: true,
                recipe: {
                    ingredients: [
                        { item: 'stinger', count: 12 },
                        { item: 'bee_wax', count: 5 },
                        { item: 'honey_block', count: 3 }
                    ],
                    station: T.WORKBENCH,
                    time: 30
                },
                useConditions: {
                    time: null,
                    biome: 'jungle',
                    location: 'beehive',
                    hp: 100,
                    notAlreadySummoned: true
                },
                consumed: true,
                rarity: 'gold',
                tooltip: 'Summons the queen of the hive'
            },
            
            NIGHMARE_FUEL: {
                id: 'nighmare_fuel',
                name: 'Nightmare Fuel',
                boss: 'demon_lord',
                description: 'Summons the Demon Lord',
                craftable: true,
                recipe: {
                    ingredients: [
                        { item: 'demonite_bar', count: 10 },
                        { item: 'shadow_scale', count: 15 },
                        { item: 'souls_of_night', count: 5 }
                    ],
                    station: T.DEMON_ALTAR,
                    time: 45
                },
                useConditions: {
                    time: 'midnight',
                    biome: 'corruption',
                    hp: 200,
                    defeatedEye: true
                },
                consumed: true,
                rarity: 'purple',
                tooltip: 'Summons the lord of demons'
            },
            
            FROST_CORE: {
                id: 'frost_core',
                name: 'Frost Core',
                boss: 'frost_titan',
                description: 'Summons the Frost Titan',
                craftable: true,
                recipe: {
                    ingredients: [
                        { item: 'ice_block', count: 50 },
                        { item: 'frozen_core', count: 1 },
                        { item: 'snowflake_crystal', count: 10 }
                    ],
                    station: T.ICE_MACHINE,
                    time: 45
                },
                useConditions: {
                    time: null,
                    biome: 'snow',
                    hp: 200,
                    blizzardActive: false
                },
                consumed: true,
                rarity: 'light_blue',
                tooltip: 'Summons the titan of ice'
            },
            
            SLIME_CROWN: {
                id: 'slime_crown',
                name: 'Slime Crown',
                boss: 'king_slime',
                description: 'Summons King Slime',
                craftable: true,
                recipe: {
                    ingredients: [
                        { item: 'gel', count: 999 },
                        { item: 'gold_bar', count: 5 },
                        { item: 'ruby', count: 1 }
                    ],
                    station: T.ANVIL,
                    time: 30
                },
                useConditions: {
                    time: null,
                    biome: null,
                    hp: 100,
                    notAlreadySummoned: true
                },
                consumed: true,
                rarity: 'gold',
                tooltip: 'Summons the king of all slimes'
            },

            // ========== HARDMODE BOSSES ==========
            MECHANICAL_EYE: {
                id: 'mechanical_eye',
                name: 'Mechanical Eye',
                boss: 'twins',
                description: 'Summons The Twins',
                craftable: true,
                recipe: {
                    ingredients: [
                        { item: 'lens', count: 3 },
                        { item: 'iron_bar', count: 5 },
                        { item: 'souls_of_light', count: 5 }
                    ],
                    station: T.MYTHRIL_ANVIL,
                    time: 45
                },
                useConditions: {
                    time: 'night',
                    biome: null,
                    hp: 200,
                    hardmode: true,
                    notAlreadySummoned: true
                },
                consumed: true,
                rarity: 'pink',
                tooltip: 'Summons the twin terrors'
            },
            
            MECHANICAL_WORM: {
                id: 'mechanical_worm',
                name: 'Mechanical Worm',
                boss: 'destroyer',
                description: 'Summons The Destroyer',
                craftable: true,
                recipe: {
                    ingredients: [
                        { item: 'iron_bar', count: 8 },
                        { item: 'souls_of_night', count: 5 },
                        { item: 'worm_tooth', count: 1 }
                    ],
                    station: T.MYTHRIL_ANVIL,
                    time: 45
                },
                useConditions: {
                    time: 'night',
                    biome: null,
                    hp: 200,
                    hardmode: true,
                    notAlreadySummoned: true
                },
                consumed: true,
                rarity: 'pink',
                tooltip: 'Summons the mechanical leviathan'
            },
            
            MECHANICAL_SKULL: {
                id: 'mechanical_skull',
                name: 'Mechanical Skull',
                boss: 'skeletron_prime',
                description: 'Summons Skeletron Prime',
                craftable: true,
                recipe: {
                    ingredients: [
                        { item: 'bone', count: 30 },
                        { item: 'iron_bar', count: 5 },
                        { item: 'souls_of_night', count: 5 }
                    ],
                    station: T.MYTHRIL_ANVIL,
                    time: 45
                },
                useConditions: {
                    time: 'night',
                    biome: null,
                    hp: 200,
                    hardmode: true,
                    skeletronNotDefeated: true
                },
                consumed: true,
                rarity: 'pink',
                tooltip: 'Summons the prime skeleton terror'
            },
            
            PLANtera_BULB: {
                id: 'plantera_bulb',
                name: 'Plantera\'s Bulb',
                boss: 'plantera',
                description: 'Summons Plantera',
                craftable: false,
                naturalSpawn: true,
                spawnCondition: {
                    afterMechanicalBosses: true,
                    biome: 'underground_jungle',
                    time: 24 // hours to grow
                },
                useConditions: {
                    time: null,
                    biome: 'underground_jungle',
                    hp: 300,
                    allMechsDefeated: true
                },
                consumed: true,
                rarity: 'lime',
                tooltip: 'The pulsating bulb awakens'
            },
            
            LIZARD_PHIAL: {
                id: 'lizard_phial',
                name: 'Lizard Phial',
                boss: 'golem',
                description: 'Summons Golem',
                craftable: true,
                recipe: {
                    ingredients: [
                        { item: 'temple_key_fragment', count: 3 },
                        { item: 'lizard_egg', count: 1 },
                        { item: 'solar_tablet_fragment', count: 2 }
                    ],
                    station: T.LIHZAHRD_ALTAR,
                    time: 30
                },
                useConditions: {
                    time: null,
                    biome: 'temple',
                    location: 'lihzahrd_altar',
                    hp: 300,
                    planteraDefeated: true
                },
                consumed: true,
                rarity: 'orange',
                tooltip: 'Awakens the stone golem'
            },
            
            TRUFFLE_WORM: {
                id: 'truffle_worm',
                name: 'Truffle Worm',
                boss: 'duke_fishron',
                description: 'Summons Duke Fishron',
                craftable: false,
                rareFind: true,
                findLocation: 'underground_mushroom_biome',
                useConditions: {
                    time: null,
                    biome: 'ocean',
                    action: 'fishing',
                    hp: 400,
                    notAlreadySummoned: true
                },
                consumed: true,
                rarity: 'rainbow',
                tooltip: 'A rare worm that attracts something terrible'
            },
            
            CLOTHIER_VOODOO_DOLL: {
                id: 'clothier_voodoo_doll',
                name: 'Clothier Voodoo Doll',
                boss: 'lunatic_cultist',
                description: 'Summons Lunatic Cultist',
                craftable: false,
                useConditions: {
                    time: null,
                    biome: 'dungeon',
                    location: 'dungeon_entrance',
                    hp: 400,
                    golemDefeated: true,
                    cultistsPresent: true
                },
                consumed: true,
                rarity: 'purple',
                tooltip: 'Sacrifice the cultists to awaken their leader'
            },
            
            CELESTIAL_SIGIL: {
                id: 'celestial_sigil',
                name: 'Celestial Sigil',
                boss: 'moon_lord',
                description: 'Summons Moon Lord directly',
                craftable: true,
                recipe: {
                    ingredients: [
                        { item: 'solar_fragment', count: 20 },
                        { item: 'vortex_fragment', count: 20 },
                        { item: 'nebula_fragment', count: 20 },
                        { item: 'stardust_fragment', count: 20 }
                    ],
                    station: T.ANCIENT_MANIPULATOR,
                    time: 60
                },
                useConditions: {
                    time: null,
                    biome: null,
                    hp: 500,
                    pillarsDestroyed: false // Can only use if already beaten pillars once
                },
                consumed: true,
                rarity: 'rainbow',
                tooltip: 'Summons the lord of all terror'
            }
        };

        // Boss defeat tracking
        this.bossesDefeated = {};
        
        // Currently active bosses
        this.activeBosses = [];
        
        // Summoning animations
        this.summoningEffects = [];
    }

    init() {
        console.log(`[BossSummoning] Initialized ${Object.keys(this.BOSS_ITEMS).length} summoning items`);
    }

    canUseItem(itemId) {
        const item = this.BOSS_ITEMS[itemId];
        if (!item) return false;
        
        // Check all conditions
        const conditions = item.useConditions;
        
        // Time check
        if (conditions.time === 'night' && !this.isNight()) {
            showStatusMessage('Can only be used at night!');
            return false;
        }
        
        if (conditions.time === 'midnight' && !this.isMidnight()) {
            showStatusMessage('Can only be used at midnight!');
            return false;
        }
        
        // Biome check
        if (conditions.biome && !this.isInBiome(conditions.biome)) {
            showStatusMessage(`Must be in ${conditions.biome}!`);
            return false;
        }
        
        // HP check
        if (conditions.hp && player.hp < conditions.hp) {
            showStatusMessage('Not enough health!');
            return false;
        }
        
        // Hardmode check
        if (conditions.hardmode && !Progression.isHardmode()) {
            showStatusMessage('World must be in Hardmode!');
            return false;
        }
        
        // Already summoned check
        if (conditions.notAlreadySummoned && this.isBossActive(item.boss)) {
            showStatusMessage(`${item.boss} is already summoned!`);
            return false;
        }
        
        // Special checks
        if (conditions.defeatedEye && !this.bossesDefeated['eye_of_cthulhu']) {
            showStatusMessage('Defeat the Eye of Cthulhu first!');
            return false;
        }
        
        if (conditions.allMechsDefeated && !this.areAllMechanicalBossesDefeated()) {
            showStatusMessage('Defeat all mechanical bosses first!');
            return false;
        }
        
        if (conditions.planteraDefeated && !this.bossesDefeated['plantera']) {
            showStatusMessage('Defeat Plantera first!');
            return false;
        }
        
        if (conditions.golemDefeated && !this.bossesDefeated['golem']) {
            showStatusMessage('Defeat Golem first!');
            return false;
        }
        
        return true;
    }

    useItem(itemId, x, y) {
        if (!this.canUseItem(itemId)) {
            return false;
        }
        
        const item = this.BOSS_ITEMS[itemId];
        
        // Show summoning message
        showMassiveMessage(`SUMMONING ${item.boss.toUpperCase().replace('_', ' ')}!`);
        
        // Create summoning effects
        this.createSummoningEffect(x, y, item);
        
        // Spawn boss after delay
        setTimeout(() => {
            this.spawnBoss(item.boss, x, y);
        }, 2000);
        
        // Consume item if required
        if (item.consumed) {
            removeItem(itemId, 1);
        }
        
        return true;
    }

    spawnBoss(bossName, x, y) {
        // Mark as active
        this.activeBosses.push(bossName);
        
        // Spawn the boss using existing boss system
        if (typeof spawnBossGlobal === 'function') {
            spawnBossGlobal(bossName, x, y);
        } else {
            console.log(`[BossSummoning] Would spawn: ${bossName} at (${x}, ${y})`);
        }
        
        // Apply post-processing effect
        PostProcess.applyBossIntro(bossName);
    }

    onBossDeath(bossName) {
        // Remove from active list
        const index = this.activeBosses.indexOf(bossName);
        if (index !== -1) {
            this.activeBosses.splice(index, 1);
        }
        
        // Mark as defeated
        this.bossesDefeated[bossName] = true;
        
        // Register with progression system
        if (typeof Progression !== 'undefined') {
            Progression.registerBossDefeat(bossName);
        }
        
        // Show victory message
        showMassiveMessage(`${bossName.toUpperCase().replace('_', ' ')} DEFEATED!`);
        
        // Drop treasure bag in expert mode
        if (this.isExpertMode()) {
            this.dropTreasureBag(bossName);
        }
    }

    dropTreasureBag(bossName) {
        const treasureBags = {
            'eye_of_cthulhu': ['demon_heart', 'shield_of_cthulhu'],
            'eater_of_worlds': ['worm_scarf'],
            'brain_of_cthulhu': ['brain_of_confusion'],
            'skeletron': ['bone_glove'],
            'queen_bee': ['hive_pack'],
            'wall_of_flesh': ['demon_heart', 'warrior_emblem'],
            'twins': ['twin_hooks'],
            'destroyer': ['mechanical_cart'],
            'skeletron_prime': ['prime_cannon'],
            'plantera': ['spore_sac'],
            'golem': ['guardian_shield'],
            'duke_fishron': ['cute_fishron_mount'],
            'moon_lord': ['gravity_globe']
        };
        
        const drops = treasureBags[bossName] || [];
        const drop = drops[Math.floor(Math.random() * drops.length)];
        
        if (drop) {
            // Drop treasure bag
            console.log(`[BossSummoning] Dropping treasure bag with: ${drop}`);
        }
    }

    createSummoningEffect(x, y, item) {
        // Visual effects based on boss type
        const effect = {
            x, y,
            timer: 120,
            maxTimer: 120,
            type: this.getEffectType(item.boss),
            particles: []
        };
        
        // Create particle ring
        for (let i = 0; i < 36; i++) {
            const angle = (i / 36) * Math.PI * 2;
            effect.particles.push({
                angle,
                radius: 20,
                speed: 2
            });
        }
        
        this.summoningEffects.push(effect);
    }

    getEffectType(bossName) {
        const types = {
            'eye_of_cthulhu': 'purple_swirl',
            'eater_of_worlds': 'green_corruption',
            'brain_of_cthulhu': 'red_pulse',
            'skeletron': 'blue_magic',
            'queen_bee': 'gold_particles',
            'wall_of_flesh': 'fire_ring',
            'twins': 'red_blue_sparkles',
            'destroyer': 'metal_grinding',
            'skeletron_prime': 'bone_circle',
            'plantera': 'green_spores',
            'golem': 'stone_rumble',
            'duke_fishron': 'water_geyser',
            'moon_lord': 'cosmic_portal'
        };
        
        return types[bossName] || 'default';
    }

    updateSummoningEffects() {
        for (let i = this.summoningEffects.length - 1; i >= 0; i--) {
            const effect = this.summoningEffects[i];
            effect.timer--;
            
            // Update particles
            for (const particle of effect.particles) {
                particle.radius += particle.speed;
                particle.angle += 0.05;
            }
            
            if (effect.timer <= 0) {
                this.summoningEffects.splice(i, 1);
            }
        }
    }

    renderSummoningEffects(ctx, camera) {
        for (const effect of this.summoningEffects) {
            const screenX = effect.x - camera.x;
            const screenY = effect.y - camera.y;
            
            ctx.save();
            ctx.globalAlpha = effect.timer / effect.maxTimer;
            
            for (const particle of effect.particles) {
                const x = screenX + Math.cos(particle.angle) * particle.radius;
                const y = screenY + Math.sin(particle.angle) * particle.radius;
                
                ctx.fillStyle = this.getParticleColor(effect.type);
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }
    }

    getParticleColor(type) {
        const colors = {
            'purple_swirl': '#AA44FF',
            'green_corruption': '#44FF44',
            'red_pulse': '#FF4444',
            'blue_magic': '#4444FF',
            'gold_particles': '#FFDD44',
            'fire_ring': '#FF6600',
            'red_blue_sparkles': '#FF44AA',
            'metal_grinding': '#AAAAAA',
            'bone_circle': '#DDDDCC',
            'green_spores': '#44FF88',
            'stone_rumble': '#886644',
            'water_geyser': '#44AAFF',
            'cosmic_portal': '#AA88FF'
        };
        
        return colors[type] || '#FFFFFF';
    }

    // Helper functions
    isNight() {
        return typeof dayTime !== 'undefined' && (dayTime > 0.5 || dayTime < 0.25);
    }

    isMidnight() {
        return typeof dayTime !== 'undefined' && Math.abs(dayTime - 0.75) < 0.05;
    }

    isInBiome(biomeName) {
        if (typeof Biomes !== 'undefined') {
            const currentBiome = Biomes.getCurrentBiome();
            return currentBiome.name.toLowerCase().includes(biomeName.toLowerCase());
        }
        return false;
    }

    isBossActive(bossName) {
        return this.activeBosses.includes(bossName);
    }

    areAllMechanicalBossesDefeated() {
        return this.bossesDefeated['twins'] && 
               this.bossesDefeated['destroyer'] && 
               this.bossesDefeated['skeletron_prime'];
    }

    isExpertMode() {
        // Would integrate with difficulty system
        return false;
    }

    craftItem(itemId) {
        const item = this.BOSS_ITEMS[itemId];
        if (!item || !item.craftable) return false;
        
        const recipe = item.recipe;
        
        // Check if player has ingredients
        for (const ingredient of recipe.ingredients) {
            if (countItem(ingredient.item) < ingredient.count) {
                showStatusMessage(`Missing ${ingredient.item}`);
                return false;
            }
        }
        
        // Check crafting station proximity
        if (!this.nearStation(recipe.station)) {
            showStatusMessage('Need appropriate crafting station!');
            return false;
        }
        
        // Remove ingredients
        for (const ingredient of recipe.ingredients) {
            removeItem(ingredient.item, ingredient.count);
        }
        
        // Add crafted item
        addItem(itemId, 1);
        
        showStatusMessage(`Crafted ${item.name}!`);
        return true;
    }

    nearStation(stationTile) {
        // Check if player is near required crafting station
        const playerX = Math.floor(player.x / TILE);
        const playerY = Math.floor(player.y / TILE);
        
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                const tx = playerX + dx;
                const ty = playerY + dy;
                
                if (tx >= 0 && tx < WORLD_W && ty >= 0 && ty < WORLD_H) {
                    if (world[tx + ty * WORLD_W] === stationTile) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    getItemTooltip(itemId) {
        const item = this.BOSS_ITEMS[itemId];
        if (!item) return '';
        
        let tooltip = `${item.rarity_color || '#FFFFFF'}${item.name}\n`;
        tooltip += `#AAAAAA${item.description}\n`;
        
        if (item.craftable && item.recipe) {
            tooltip += `\n#DDDD44Recipe:\n`;
            for (const ing of item.recipe.ingredients) {
                tooltip += `  #CCCCCC${ing.count}x ${ing.item}\n`;
            }
            tooltip += `#DDDD44At: ${this.getStationName(item.recipe.station)}\n`;
        }
        
        if (item.useConditions) {
            tooltip += `\n#DDDD44Use Conditions:\n`;
            if (item.useConditions.time) {
                tooltip += `  #CCCCCC${item.useConditions.time}\n`;
            }
            if (item.useConditions.biome) {
                tooltip += `  #CCCCCCIn ${item.useConditions.biome}\n`;
            }
        }
        
        tooltip += `\n#FFDD44${item.tooltip}`;
        
        return tooltip;
    }

    getStationName(tile) {
        const names = {
            [T.DEMON_ALTAR]: 'Demon Altar',
            [T.CRIMSON_ALTAR]: 'Crimson Altar',
            [T.WORKBENCH]: 'Work Bench',
            [T.ANVIL]: 'Iron Anvil',
            [T.MYTHRIL_ANVIL]: 'Mythril Anvil',
            [T.ANCIENT_MANIPULATOR]: 'Ancient Manipulator',
            [T.LIHZAHRD_ALTAR]: 'Lihzahrd Altar',
            [T.ICE_MACHINE]: 'Ice Machine'
        };
        
        return names[tile] || 'Unknown Station';
    }
}

// Global boss summoning instance
const BossSummon = new BossSummoning();

// Initialize on game start
function initBossSummoning() {
    BossSummon.init();
}

// Utility functions (would integrate with existing systems)
function countItem(itemId) {
    if (typeof player !== 'undefined') {
        return player.inventory.reduce((count, slot) => {
            if (slot && slot.id === itemId) {
                return count + slot.count;
            }
            return count;
        }, 0);
    }
    return 0;
}

function removeItem(itemId, count) {
    // Would integrate with existing inventory system
    console.log(`Removing ${count}x ${itemId}`);
}

function addItem(itemId, count) {
    // Would integrate with existing inventory system
    console.log(`Adding ${count}x ${itemId}`);
}

function showStatusMessage(text) {
    if (typeof eventBannerText !== 'undefined') {
        eventBannerText = text;
        eventBannerTimer = 180;
    }
}

function showMassiveMessage(text) {
    if (typeof eventBannerText !== 'undefined') {
        eventBannerText = text;
        eventBannerTimer = 420;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BossSummoning, BossSummon, initBossSummoning };
}
