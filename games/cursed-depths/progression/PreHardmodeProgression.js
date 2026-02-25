/* ============================================================
   CURSED DEPTHS — Pre-Hardmode Progression System
   Phase 5: Complete 8-tier progression with unlocks and checks
   ============================================================ */

class PreHardmodeProgression {
    constructor() {
        // 8 Clear Progression Tiers (Terraria-style)
        this.PROGRESSION_TIERS = {
            TIER_0: {
                id: 0,
                name: 'Wood Age',
                description: 'Basic tools from nature',
                toolTier: 0,
                pickaxePower: 35,
                axePower: 50,
                hammerPower: 0,
                oreTiles: [],
                barItems: [],
                equipment: ['wood_pickaxe', 'wood_sword', 'wood_bow'],
                armorSet: 'wood_armor',
                bossRequired: null,
                condition: null,
                npcUnlocks: [],
                worldGenOres: [T.COPPER_ORE, T.IRON_ORE]
            },
            TIER_1: {
                id: 1,
                name: 'Copper Era',
                description: 'First metals from stone',
                toolTier: 1,
                pickaxePower: 55,
                axePower: 70,
                hammerPower: 35,
                oreTiles: [T.COPPER_ORE],
                barItems: ['copper_bar'],
                equipment: ['copper_pickaxe', 'copper_sword', 'copper_bow', 'copper_axe'],
                armorSet: 'copper_armor',
                bossRequired: null,
                condition: null,
                npcUnlocks: ['blacksmith'],
                worldGenOres: [T.IRON_ORE, T.SILVER_ORE]
            },
            TIER_2: {
                id: 2,
                name: 'Iron Age',
                description: 'Stronger metals emerge',
                toolTier: 2,
                pickaxePower: 70,
                axePower: 80,
                hammerPower: 45,
                oreTiles: [T.IRON_ORE, T.LEAD_ORE],
                barItems: ['iron_bar', 'lead_bar'],
                equipment: ['iron_pickaxe', 'iron_sword', 'iron_bow', 'iron_hammer'],
                armorSet: 'iron_armor',
                bossRequired: null,
                condition: null,
                npcUnlocks: ['merchant', 'nurse'],
                worldGenOres: [T.SILVER_ORE, T.GOLD_ORE]
            },
            TIER_3: {
                id: 3,
                name: 'Silver Dynasty',
                description: 'Precious metals unlocked',
                toolTier: 3,
                pickaxePower: 85,
                axePower: 90,
                hammerPower: 55,
                oreTiles: [T.SILVER_ORE, T.TUNGSTEN_ORE],
                barItems: ['silver_bar', 'tungsten_bar'],
                equipment: ['silver_pickaxe', 'silver_sword', 'silver_bow', 'silver_hammer'],
                armorSet: 'silver_armor',
                bossRequired: null,
                condition: null,
                npcUnlocks: ['demolitionist'],
                worldGenOres: [T.GOLD_ORE, T.PLATINUM_ORE]
            },
            TIER_4: {
                id: 4,
                name: 'Gold Renaissance',
                description: 'Wealth and power combined',
                toolTier: 4,
                pickaxePower: 100,
                axePower: 100,
                hammerPower: 65,
                oreTiles: [T.GOLD_ORE, T.PLATINUM_ORE],
                barItems: ['gold_bar', 'platinum_bar'],
                equipment: ['gold_pickaxe', 'gold_sword', 'gold_bow', 'golden_hammer'],
                armorSet: 'gold_armor',
                bossRequired: 'eye_of_cthulhu',
                condition: null,
                npcUnlocks: ['arms_dealer', 'dryad'],
                worldGenOres: [T.DEMONITE_ORE, T.CRIMTANE_ORE]
            },
            TIER_5: {
                id: 5,
                name: 'Demonite Dawn',
                description: 'Evil metals from fallen bosses',
                toolTier: 5,
                pickaxePower: 125,
                axePower: 115,
                hammerPower: 75,
                oreTiles: [T.DEMONITE_ORE, T.CRIMTANE_ORE],
                barItems: ['demonite_bar', 'crimtane_bar'],
                equipment: ['demonite_pickaxe', 'lights_bane', 'blood_butcherer', 'bow_of_flesh'],
                armorSet: 'shadow_armor',
                bossRequired: 'eye_of_cthulhu',
                condition: 'defeatEyeOfCthulhu',
                npcUnlocks: ['tinkerer'],
                worldGenOres: [T.METEORITE]
            },
            TIER_6: {
                id: 6,
                name: 'Meteor Strike',
                description: 'Space rocks bring new technology',
                toolTier: 6,
                pickaxePower: 150,
                axePower: 130,
                hammerPower: 85,
                oreTiles: [T.METEORITE],
                barItems: ['meteorite_bar'],
                equipment: ['meteor_pickaxe', 'space_gun', 'meteor_helmet'],
                armorSet: 'meteor_armor',
                bossRequired: null,
                condition: 'breakShadowOrbOrCrimsonHeart',
                npcUnlocks: ['steampunker'],
                worldGenOres: [T.OBSIDIAN, T.HELLSTONE]
            },
            TIER_7: {
                id: 7,
                name: 'Hellfire Forge',
                description: 'Ultimate pre-hardmode power',
                toolTier: 7,
                pickaxePower: 200,
                axePower: 150,
                hammerPower: 100,
                oreTiles: [T.HELLSTONE],
                barItems: ['hellstone_bar'],
                equipment: ['molten_pickaxe', 'fiery_greatsword', 'molten_fury', 'sunfury'],
                armorSet: 'molten_armor',
                bossRequired: null,
                condition: 'craftObsidianSkull',
                npcUnlocks: ['guide_clothier'],
                worldGenOres: []
            }
        };

        // Progression state
        this.currentTier = 0;
        this.bossesDefeated = {};
        this.shadowOrbsBroken = 0;
        this.crimsonHeartsBroken = 0;
        this.meteorHasSpawned = false;
        this.wallOfFleshDefeated = false;
        
        // World flags
        this.worldState = {
            hardmode: false,
            evilBiomeSpreadRate: 1.0,
            npcHappinessEnabled: true,
            partyAvailable: false
        };

        // Unlock tracking
        this.unlocks = {
            miningOres: {},
            craftingBars: {},
            equipmentCraftable: {},
            npcsAvailable: [],
            biomesAccessible: []
        };
    }

    init() {
        this.currentTier = 0;
        this.bossesDefeated = {};
        this.shadowOrbsBroken = 0;
        this.crimsonHeartsBroken = 0;
        this.meteorHasSpawned = false;
        
        // Initialize tier 0 as unlocked
        this.unlockTier(0);
        
        console.log('[Progression] Pre-Hardmode Progression initialized');
    }

    unlockTier(tierId) {
        const tier = this.PROGRESSION_TIERS[`TIER_${tierId}`];
        if (!tier) return false;

        this.currentTier = Math.max(this.currentTier, tierId);

        // Unlock ores for mining
        for (const ore of tier.oreTiles) {
            this.unlocks.miningOres[ore] = true;
        }

        // Unlock bar recipes
        for (const bar of tier.barItems) {
            this.unlocks.craftingBars[bar] = true;
        }

        // Unlock equipment recipes
        for (const equip of tier.equipment) {
            this.unlocks.equipmentCraftable[equip] = true;
        }

        // Unlock NPCs
        for (const npc of tier.npcUnlocks) {
            if (!this.unlocks.npcsAvailable.includes(npc)) {
                this.unlocks.npcsAvailable.push(npc);
            }
        }

        console.log(`[Progression] Unlocked Tier ${tierId}: ${tier.name}`);
        showProgressionNotification(`Tier Unlocked: ${tier.name}`, tier.description);
        
        return true;
    }

    checkProgression() {
        // Check each tier's conditions
        for (let i = this.currentTier + 1; i <= 7; i++) {
            const tier = this.PROGRESSION_TIERS[`TIER_${i}`];
            if (!tier) continue;

            let canUnlock = true;

            // Check boss requirement
            if (tier.bossRequired && !this.bossesDefeated[tier.bossRequired]) {
                canUnlock = false;
            }

            // Check special condition
            if (tier.condition && !this.checkCondition(tier.condition)) {
                canUnlock = false;
            }

            // If all conditions met, unlock the tier
            if (canUnlock) {
                this.unlockTier(i);
                break; // Only unlock one tier at a time
            }
        }
    }

    checkCondition(condition) {
        switch (condition) {
            case 'defeatEyeOfCthulhu':
                return !!this.bossesDefeated['eye_of_cthulhu'];
            
            case 'breakShadowOrbOrCrimsonHeart':
                return this.shadowOrbsBroken >= 1 || this.crimsonHeartsBroken >= 1;
            
            case 'craftObsidianSkull':
                return countItem(I.OBSIDIAN_SKULL) >= 1;
            
            default:
                return true;
        }
    }

    registerBossDefeat(bossName) {
        this.bossesDefeated[bossName] = true;
        console.log(`[Progression] Boss defeated: ${bossName}`);
        
        // Check if this unlocks a new tier
        this.checkProgression();
        
        // Apply world effects based on boss
        this.applyBossWorldEffects(bossName);
    }

    applyBossWorldEffects(bossName) {
        switch (bossName) {
            case 'eye_of_cthulhu':
                // Increase spawn rates slightly
                worldState.enemySpawnRate *= 1.1;
                break;
            
            case 'eater_of_worlds':
            case 'brain_of_cthulhu':
                // Allow meteorite to spawn
                this.worldState.meteoriteUnlocked = true;
                break;
            
            case 'skeletron':
                // Dungeon becomes fully accessible
                this.worldState.dungeonUnlocked = true;
                break;
            
            case 'queen_bee':
                // Jungle temple hints appear
                this.worldState.jungleTempleHint = true;
                break;
        }
    }

    breakShadowOrb(x, y) {
        this.shadowOrbsBroken++;
        console.log(`[Progression] Shadow Orb broken: ${this.shadowOrbsBroken}`);
        
        // Apply orb effects
        this.applyOrbEffect(this.shadowOrbsBroken);
        
        // Check progression
        this.checkProgression();
        
        // Spawn meteorite after first orb
        if (this.shadowOrbsBroken === 1 && !this.meteorHasSpawned) {
            this.spawnMeteorite();
        }
        
        // Spawn boss on third orb
        if (this.shadowOrbsBroken % 3 === 0) {
            this.spawnBossFromOrb();
        }
    }

    breakCrimsonHeart(x, y) {
        this.crimsonHeartsBroken++;
        console.log(`[Progression] Crimson Heart broken: ${this.crimsonHeartsBroken}`);
        
        // Apply heart effects
        this.applyHeartEffect(this.crimsonHeartsBroken);
        
        // Check progression
        this.checkProgression();
        
        // Spawn meteorite after first heart
        if (this.crimsonHeartsBroken === 1 && !this.meteorHasSpawned) {
            this.spawnMeteorite();
        }
        
        // Spawn boss on third heart
        if (this.crimsonHeartsBroken % 3 === 0) {
            this.spawnBossFromOrb();
        }
    }

    applyOrbEffect(count) {
        switch (count) {
            case 1:
                // Drop gun and bullets
                dropItemNearby(I.MUSKET, 1, x, y);
                dropItemNearby(I.MUSKET_BALL, 50, x, y);
                showStatusMessage('A goblin thief approaches...');
                break;
            
            case 2:
                // Increase enemy spawn rate
                worldState.enemySpawnRate *= 1.2;
                showStatusMessage('The corruption grows stronger...');
                break;
            
            case 3:
                // Already handled in breakShadowOrb
                break;
        }
    }

    applyHeartEffect(count) {
        switch (count) {
            case 1:
                // Drop gun and bullets
                dropItemNearby(I.THE_ROTTEN_FORK, 1, x, y);
                dropItemNearway(I.VILETHORN, 1, x, y);
                showStatusMessage('A merchant hears your call...');
                break;
            
            case 2:
                // Increase enemy spawn rate
                worldState.enemySpawnRate *= 1.2;
                showStatusMessage('The crimson pulses with energy...');
                break;
            
            case 3:
                // Already handled
                break;
        }
    }

    spawnMeteorite() {
        this.meteorHasSpawned = true;
        
        // Find surface location away from player
        const meteorX = Math.floor(Math.random() * WORLD_W * 0.8) + WORLD_W * 0.1;
        const meteorY = findSurfaceY(meteorX);
        
        // Create meteorite crater
        this.createMeteoriteCrater(meteorX, meteorY);
        
        showMassiveMessage('A meteorite has landed!');
        Particles.spawnEnvironmentalParticle(meteorX * TILE, meteorY * TILE, 'smoke');
    }

    createMeteoriteCrater(x, y) {
        const craterRadius = 15;
        const centerX = Math.floor(x);
        const centerY = Math.floor(y);
        
        for (let dy = -craterRadius; dy <= craterRadius; dy++) {
            for (let dx = -craterRadius; dx <= craterRadius; dx++) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist <= craterRadius) {
                    const tx = centerX + dx;
                    const ty = centerY + dy;
                    
                    if (tx >= 0 && tx < WORLD_W && ty >= 0 && ty < WORLD_H) {
                        // Clear air in crater
                        if (dist <= craterRadius * 0.7) {
                            world[tx + ty * WORLD_W] = T.AIR;
                        }
                        // Replace with meteorite in ring
                        else if (dist <= craterRadius) {
                            const depth = (craterRadius - dist) / craterRadius;
                            if (Math.random() < depth * 0.8) {
                                world[tx + ty * WORLD_W] = T.METEORITE;
                            }
                        }
                    }
                }
            }
        }
    }

    spawnBossFromOrb() {
        const bosses = ['eater_of_worlds', 'brain_of_cthulhu'];
        const boss = bosses[Math.floor(Math.random() * bosses.length)];
        
        spawnBoss(boss);
        showMassiveMessage(`${boss.replace('_', ' ').toUpperCase()} AWAKENS!`);
    }

    canMineTile(tileType) {
        const tier = this.getCurrentTier();
        const tileData = TILE_DATA[tileType];
        
        if (!tileData || !tier) return false;
        
        // Check if ore requires progression unlock
        if (tier.oreTiles.includes(tileType)) {
            return true;
        }
        
        // Special tiles
        if (tileType === T.METEORITE && this.currentTier >= 6) {
            return true;
        }
        
        if (tileType === T.HELLSTONE && this.currentTier >= 7) {
            return true;
        }
        
        return false;
    }

    getPickaxePower(tileType) {
        const tier = this.getCurrentTier();
        if (!tier) return 0;
        
        return tier.pickaxePower;
    }

    getCurrentTier() {
        return this.PROGRESSION_TIERS[`TIER_${this.currentTier}`];
    }

    getNextTier() {
        const nextTierId = this.currentTier + 1;
        if (nextTierId > 7) return null;
        return this.PROGRESSION_TIERS[`TIER_${nextTierId}`];
    }

    getProgressPercentage() {
        return ((this.currentTier + 1) / 8) * 100;
    }

    getTierInfo() {
        const tier = this.getCurrentTier();
        const nextTier = this.getNextTier();
        
        return {
            current: tier,
            next: nextTier,
            progress: this.getProgressPercentage(),
            bossesDefeated: Object.keys(this.bossesDefeated).length,
            orbsBroken: this.shadowOrbsBroken,
            heartsBroken: this.crimsonHeartsBroken
        };
    }

    // Helper functions for integration
    isTierUnlocked(tierId) {
        return this.currentTier >= tierId;
    }

    canCraftItem(itemId) {
        return this.unlocks.equipmentCraftable[itemId] || false;
    }

    canNPCHouse(npcName) {
        return this.unlocks.npcsAvailable.includes(npcName);
    }

    isHardmode() {
        return this.worldState.hardmode;
    }

    triggerHardmode() {
        this.worldState.hardmode = true;
        this.worldState.evilBiomeSpreadRate = 2.0;
        showMassiveMessage('THE OLD GODS HAVE BEEN AWAKENED');
    }
}

// Global progression instance
const Progression = new PreHardmodeProgression();

// Initialize on game start
function initProgression() {
    Progression.init();
}

// Notification helper
function showProgressionNotification(title, message) {
    if (typeof eventBannerText !== 'undefined') {
        eventBannerText = `⚔️ ${title}: ${message}`;
        eventBannerTimer = 300; // 5 seconds
    }
}

// Utility functions
function findSurfaceY(x) {
    for (let y = 0; y < WORLD_H; y++) {
        const tile = world[Math.floor(x) + y * WORLD_W];
        if ([T.GRASS, T.SNOW, T.SAND, T.JUNGLE_GRASS].includes(tile)) {
            return y;
        }
    }
    return SURFACE_Y;
}

function dropItemNearby(itemId, count, x, y) {
    // Implementation would integrate with existing item drop system
    console.log(`Dropping ${count}x ${itemId} near (${x}, ${y})`);
}

function countItem(itemId) {
    // Integrate with existing inventory system
    return 0;
}

function spawnBoss(bossName) {
    // Integrate with existing boss system
    console.log(`Spawning boss: ${bossName}`);
}

function showStatusMessage(text) {
    if (typeof eventBannerText !== 'undefined') {
        eventBannerText = text;
        eventBannerTimer = 180; // 3 seconds
    }
}

function showMassiveMessage(text) {
    if (typeof eventBannerText !== 'undefined') {
        eventBannerText = text;
        eventBannerTimer = 420; // 7 seconds
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PreHardmodeProgression, Progression, initProgression };
}
