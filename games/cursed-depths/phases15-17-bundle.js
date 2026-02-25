/* ============================================================
   CURSED DEPTHS - PHASES 15-17 BUNDLE
   Farming | Gems | Enchanting Systems
   ============================================================ */

// ===== PHASE 15: FARMING & AGRICULTURE =====
const FarmingSystem = {
    plots: [],
    crops: {},
    animals: [],
    
    init() {
        console.log('🌾 Phase 15: Farming System initialized');
        this.defineCrops();
        this.loadFarms();
    },
    
    defineCrops() {
        this.crops = {
            wheat: {
                name: 'Wheat',
                growthTime: 300, // 5 minutes
                stages: ['seed', 'sprout', 'growing', 'mature', 'ready'],
                yield: { item: 'wheat_grain', count: [2, 5] },
                soilType: 'dirt'
            },
            corn: {
                name: 'Corn',
                growthTime: 400,
                stages: ['seed', 'sprout', 'stalk', 'tassel', 'ready'],
                yield: { item: 'corn_cob', count: [1, 3] },
                soilType: 'dirt'
            },
            tomato: {
                name: 'Tomato',
                growthTime: 250,
                stages: ['seed', 'sprout', 'flower', 'green', 'red'],
                yield: { item: 'tomato', count: [3, 8] },
                soilType: 'fertile'
            },
            potato: {
                name: 'Potato',
                growthTime: 350,
                stages: ['seed', 'sprout', 'growing', 'mature', 'ready'],
                yield: { item: 'potato', count: [2, 6] },
                soilType: 'dirt'
            },
            carrot: {
                name: 'Carrot',
                growthTime: 200,
                stages: ['seed', 'sprout', 'growing', 'orange', 'ready'],
                yield: { item: 'carrot', count: [2, 5] },
                soilType: 'sand'
            },
            pumpkin: {
                name: 'Pumpkin',
                growthTime: 500,
                stages: ['seed', 'sprout', 'vine', 'small', 'large'],
                yield: { item: 'pumpkin', count: 1 },
                soilType: 'dirt'
            },
            magic_mushroom: {
                name: 'Magic Mushroom',
                growthTime: 600,
                stages: ['spore', 'mycelium', 'bud', 'growing', 'glowing'],
                yield: { item: 'magic_mushroom', count: [1, 3] },
                soilType: 'mushroom'
            }
        };
    },
    
    loadFarms() {
        const saved = localStorage.getItem('cursed_depths_farming');
        if (saved) {
            const data = JSON.parse(saved);
            this.plots = data.plots || [];
            this.animals = data.animals || [];
        }
    },
    
    saveFarms() {
        const data = {
            plots: this.plots,
            animals: this.animals
        };
        localStorage.setItem('cursed_depths_farming', JSON.stringify(data));
    },
    
    createPlot(x, y, width, height, soilType = 'dirt') {
        const plot = {
            id: this.generateId(),
            x, y, width, height,
            soilType,
            watered: false,
            fertilized: false,
            crop: null,
            growthProgress: 0
        };
        
        this.plots.push(plot);
        this.saveFarms();
        
        return plot;
    },
    
    plantSeed(plotId, cropType) {
        const plot = this.plots.find(p => p.id === plotId);
        if (!plot || plot.crop) return false;
        
        const crop = this.crops[cropType];
        if (!crop) return false;
        
        // Check soil compatibility
        if (crop.soilType !== plot.soilType && crop.soilType !== 'any') {
            showFloatingText('Wrong soil type!', plot.x, plot.y, '#FF4444');
            return false;
        }
        
        plot.crop = cropType;
        plot.growthProgress = 0;
        plot.currentStage = 0;
        
        this.saveFarms();
        return true;
    },
    
    waterPlot(plotId) {
        const plot = this.plots.find(p => p.id === plotId);
        if (!plot) return;
        
        plot.watered = true;
        plot.growthMultiplier = 2.0;
        
        showFloatingText('Watered!', plot.x, plot.y, '#4488FF');
    },
    
    fertilizePlot(plotId) {
        const plot = this.plots.find(p => p.id === plotId);
        if (!plot) return;
        
        plot.fertilized = true;
        plot.growthMultiplier = (plot.growthMultiplier || 1) * 1.5;
        
        showFloatingText('Fertilized!', plot.x, plot.y, '#44FF44');
    },
    
    updateFarming(dt) {
        this.plots.forEach(plot => {
            if (!plot.crop || plot.growthProgress >= 100) return;
            
            // Growth calculation
            let growthRate = 0.1 * dt;
            
            if (plot.watered) {
                growthRate *= (plot.growthMultiplier || 1);
                plot.watered = false; // Water wears off
            }
            
            if (plot.fertilized) {
                growthRate *= 1.5;
            }
            
            plot.growthProgress += growthRate * 60;
            
            // Update stage
            const crop = this.crops[plot.crop];
            const totalStages = crop.stages.length;
            const stageIndex = Math.floor((plot.growthProgress / 100) * totalStages);
            plot.currentStage = Math.min(stageIndex, totalStages - 1);
            
            // Check if ready to harvest
            if (plot.growthProgress >= 100) {
                showFloatingText('Ready to harvest!', plot.x, plot.y, '#FFDD44');
            }
        });
    },
    
    harvestPlot(plotId) {
        const plot = this.plots.find(p => p.id === plotId);
        if (!plot || plot.growthProgress < 100) return null;
        
        const crop = this.crops[plot.crop];
        const minYield = crop.yield.count[0];
        const maxYield = crop.yield.count[1] || minYield;
        const actualYield = Math.floor(Math.random() * (maxYield - minYield + 1)) + minYield;
        
        // Apply farming skill bonus
        const finalYield = Math.floor(actualYield * (player.farmingSkill || 1));
        
        // Reset plot
        plot.crop = null;
        plot.growthProgress = 0;
        plot.currentStage = 0;
        plot.watered = false;
        plot.fertilized = false;
        
        this.saveFarms();
        
        return {
            item: crop.yield.item,
            count: finalYield
        };
    },
    
    raiseAnimal(type, x, y) {
        const animal = {
            id: this.generateId(),
            type,
            x, y,
            age: 0,
            happiness: 0.5,
            productTimer: 0,
            productType: this.getAnimalProduct(type)
        };
        
        this.animals.push(animal);
        this.saveFarms();
        
        return animal;
    },
    
    getAnimalProduct(animalType) {
        const products = {
            cow: 'milk',
            chicken: 'egg',
            sheep: 'wool',
            pig: 'truffle'
        };
        return products[animalType] || 'unknown';
    },
    
    collectProduct(animal) {
        if (animal.productTimer <= 0) return null;
        
        const product = animal.productType;
        animal.productTimer = 0;
        
        return { item: product, count: 1 };
    },
    
    updateAnimals(dt) {
        this.animals.forEach(animal => {
            animal.age += dt;
            
            // Product generation
            if (!animal.productTimer || animal.productTimer <= 0) {
                const productionTime = this.getProductionTime(animal.type);
                animal.productTimer = productionTime;
            } else {
                animal.productTimer -= dt * 60;
            }
            
            // Happiness decay
            animal.happiness = Math.max(0, animal.happiness - 0.001);
        });
    },
    
    getProductionTime(animalType) {
        const times = {
            cow: 300, // 5 minutes
            chicken: 180, // 3 minutes
            sheep: 600, // 10 minutes
            pig: 900 // 15 minutes
        };
        return times[animalType] || 300;
    },
    
    render(ctx, camX, camY) {
        // Render plots
        this.plots.forEach(plot => {
            const screenX = plot.x - camX;
            const screenY = plot.y - camY;
            
            // Draw soil
            ctx.fillStyle = this.getSoilColor(plot.soilType);
            ctx.fillRect(screenX, screenY, plot.width * 16, plot.height * 16);
            
            // Draw crop if present
            if (plot.crop) {
                const crop = this.crops[plot.crop];
                const stage = crop.stages[plot.currentStage || 0];
                
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                
                const sprites = {
                    seed: '🌱',
                    sprout: '🌿',
                    growing: '🌳',
                    mature: '🌾',
                    ready: '✨',
                    flower: '🌸',
                    green: '🟢',
                    red: '🔴',
                    orange: '🟠',
                    stalk: '🎋',
                    tassel: '🌽',
                    vine: '🍃',
                    small: '🎃',
                    large: '🎃',
                    spore: '💨',
                    mycelium: '🕸️',
                    bud: '🍄',
                    glowing: '✨'
                };
                
                ctx.fillText(sprites[stage] || '🌱', screenX + plot.width * 8, screenY + plot.height * 8);
                
                // Growth bar
                if (plot.growthProgress < 100) {
                    ctx.fillStyle = '#333333';
                    ctx.fillRect(screenX, screenY - 10, plot.width * 16, 5);
                    ctx.fillStyle = '#44FF44';
                    ctx.fillRect(screenX, screenY - 10, plot.width * 16 * (plot.growthProgress / 100), 5);
                }
            }
        });
        
        // Render animals
        this.animals.forEach(animal => {
            const screenX = animal.x - camX;
            const screenY = animal.y - camY;
            
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            
            const sprites = {
                cow: '🐄',
                chicken: '🐔',
                sheep: '🐑',
                pig: '🐷'
            };
            
            ctx.fillText(sprites[animal.type] || '❓', screenX, screenY);
            
            // Product indicator
            if (animal.productTimer <= 0) {
                ctx.font = '12px Arial';
                ctx.fillText('⭐', screenX + 15, screenY - 15);
            }
        });
    },
    
    getSoilColor(soilType) {
        const colors = {
            dirt: '#5C3A1E',
            fertile: '#3D5A1E',
            sand: '#C2A645',
            mushroom: '#442266'
        };
        return colors[soilType] || colors.dirt;
    },
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// ===== PHASE 16: GEM SYSTEM =====
const GemSystem = {
    gems: {},
    socketableItems: [],
    
    init() {
        console.log('💎 Phase 16: Gem System initialized');
        this.defineGems();
    },
    
    defineGems() {
        this.gems = {
            // TIER 1
            ruby: {
                name: 'Ruby',
                tier: 1,
                color: '#FF4444',
                stats: { damage: 5, fireDamage: 10 },
                icon: '🔴'
            },
            sapphire: {
                name: 'Sapphire',
                tier: 1,
                color: '#4444FF',
                stats: { mana: 20, iceDamage: 10 },
                icon: '🔵'
            },
            emerald: {
                name: 'Emerald',
                tier: 1,
                color: '#44FF44',
                stats: { defense: 3, poisonDamage: 10 },
                icon: '🟢'
            },
            topaz: {
                name: 'Topaz',
                tier: 1,
                color: '#FFDD44',
                stats: { luck: 5, lightningDamage: 10 },
                icon: '🟡'
            },
            amethyst: {
                name: 'Amethyst',
                tier: 1,
                color: '#AA44FF',
                stats: { magicDamage: 8, shadowDamage: 10 },
                icon: '🟣'
            },
            
            // TIER 2
            diamond: {
                name: 'Diamond',
                tier: 2,
                color: '#FFFFFF',
                stats: { allStats: 5, criticalChance: 0.05 },
                icon: '💎'
            },
            amber: {
                name: 'Amber',
                tier: 2,
                color: '#FF8800',
                stats: { lifeSteal: 0.03, fireResistance: 0.2 },
                icon: '🧡'
            },
            jade: {
                name: 'Jade',
                tier: 2,
                color: '#00FF88',
                stats: { regeneration: 2, poisonResistance: 0.3 },
                icon: '💚'
            },
            
            // TIER 3 (LEGENDARY)
            star_ruby: {
                name: 'Star Ruby',
                tier: 3,
                color: '#FF0044',
                stats: { damage: 20, fireDamage: 30, criticalDamage: 0.5 },
                icon: '⭐'
            },
            celestial_sapphire: {
                name: 'Celestial Sapphire',
                tier: 3,
                color: '#0088FF',
                stats: { mana: 100, iceDamage: 30, manaRegen: 5 },
                icon: '🌟'
            },
            void_crystal: {
                name: 'Void Crystal',
                tier: 3,
                color: '#6600CC',
                stats: { shadowDamage: 40, voidResistance: 0.5, teleportCooldown: -0.3 },
                icon: '🔮'
            }
        };
    },
    
    createSocketedItem(baseItem, sockets = []) {
        const socketedItem = {
            ...baseItem,
            sockets: sockets.map(s => ({
                gem: this.gems[s.gemType],
                linked: s.linked || []
            }))
        };
        
        this.socketableItems.push(socketedItem);
        return socketedItem;
    },
    
    socketGem(item, socketIndex, gemType) {
        if (!item.sockets || !item.sockets[socketIndex]) return false;
        
        const gem = this.gems[gemType];
        if (!gem) return false;
        
        item.sockets[socketIndex].gem = gem;
        this.recalculateItemStats(item);
        
        return true;
    },
    
    unlinkGem(item, socketIndex) {
        if (!item.sockets || !item.sockets[socketIndex]) return null;
        
        const gem = item.sockets[socketIndex].gem;
        item.sockets[socketIndex].gem = null;
        this.recalculateItemStats(item);
        
        return gem;
    },
    
    linkSockets(item, socket1, socket2) {
        if (!item.sockets[socket1] || !item.sockets[socket2]) return false;
        
        if (!item.sockets[socket1].linked) {
            item.sockets[socket1].linked = [];
        }
        
        if (!item.sockets[socket2].linked) {
            item.sockets[socket2].linked = [];
        }
        
        item.sockets[socket1].linked.push(socket2);
        item.sockets[socket2].linked.push(socket1);
        
        return true;
    },
    
    recalculateItemStats(item) {
        item.bonusStats = {};
        
        item.sockets.forEach(socket => {
            if (socket.gem) {
                Object.entries(socket.gem.stats).forEach(([stat, value]) => {
                    item.bonusStats[stat] = (item.bonusStats[stat] || 0) + value;
                });
            }
        });
        
        // Apply linked socket bonuses
        item.sockets.forEach((socket, index) => {
            if (socket.linked && socket.linked.length > 0) {
                socket.linked.forEach(linkedIndex => {
                    const linkedSocket = item.sockets[linkedIndex];
                    if (linkedSocket && linkedSocket.gem) {
                        // Linked gems provide 50% of each other's stats
                        Object.entries(linkedSocket.gem.stats).forEach(([stat, value]) => {
                            item.bonusStats[stat] = (item.bonusStats[stat] || 0) + (value * 0.5);
                        });
                    }
                });
            }
        });
    },
    
    craftJewelry(gemTypes, jewelryType) {
        // Check if player has required gems
        const jewelry = {
            id: this.generateId(),
            type: jewelryType, // ring, amulet, bracelet
            gems: gemTypes,
            stats: this.calculateJewelryStats(gemTypes)
        };
        
        return jewelry;
    },
    
    calculateJewelryStats(gemTypes) {
        const stats = {};
        
        gemTypes.forEach(gemType => {
            const gem = this.gems[gemType];
            if (gem) {
                Object.entries(gem.stats).forEach(([stat, value]) => {
                    stats[stat] = (stats[stat] || 0) + (value * 0.5); // Jewelry provides 50% of gem stats
                });
            }
        });
        
        return stats;
    },
    
    renderGemUI(ctx, item, x, y) {
        if (!item.sockets) return;
        
        item.sockets.forEach((socket, i) => {
            const socketX = x + (i * 40);
            
            // Socket background
            ctx.fillStyle = socket.gem ? socket.gem.color : '#333333';
            ctx.beginPath();
            ctx.arc(socketX, y, 15, 0, Math.PI * 2);
            ctx.fill();
            
            // Gem icon
            if (socket.gem) {
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(socket.gem.icon, socketX, y + 7);
            }
            
            // Socket border
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    },
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// ===== PHASE 17: ENCHANTMENT SYSTEM =====
const EnchantmentSystem = {
    enchantments: {},
    enchantingMaterials: [],
    
    init() {
        console.log('✨ Phase 17: Enchantment System initialized');
        this.defineEnchantments();
    },
    
    defineEnchantments() {
        this.enchantments = {
            // WEAPON ENCHANTMENTS
            sharpness: {
                name: 'Sharpness',
                type: 'weapon',
                maxLevel: 5,
                stats: { damage: 2 },
                materials: ['iron_ingot', 'whetstone'],
                color: '#FFFFFF'
            },
            smite: {
                name: 'Smite',
                type: 'weapon',
                maxLevel: 5,
                stats: { undeadDamage: 5 },
                materials: ['gold_ingot', 'holy_water'],
                color: '#FFDD44'
            },
            bane_of_arthropods: {
                name: 'Bane of Arthropods',
                type: 'weapon',
                maxLevel: 5,
                stats: { insectDamage: 6 },
                materials: ['silver_ingot', 'insect_wing'],
                color: '#44FF44'
            },
            fire_aspect: {
                name: 'Fire Aspect',
                type: 'weapon',
                maxLevel: 2,
                stats: { fireDamage: 10, burnDuration: 3 },
                materials: ['blaze_rod', 'lava_bucket'],
                color: '#FF4400'
            },
            knockback: {
                name: 'Knockback',
                type: 'weapon',
                maxLevel: 2,
                stats: { knockback: 0.3 },
                materials: ['slime_ball', 'feather'],
                color: '#4488FF'
            },
            looting: {
                name: 'Looting',
                type: 'weapon',
                maxLevel: 3,
                stats: { lootChance: 0.1 },
                materials: ['emerald', 'lucky_rabbit_foot'],
                color: '#44FF44'
            },
            
            // ARMOR ENCHANTMENTS
            protection: {
                name: 'Protection',
                type: 'armor',
                maxLevel: 4,
                stats: { defense: 2 },
                materials: ['iron_ingot', 'leather'],
                color: '#AAAAAA'
            },
            fire_protection: {
                name: 'Fire Protection',
                type: 'armor',
                maxLevel: 4,
                stats: { fireResistance: 0.15 },
                materials: ['gold_ingot', 'ice_block'],
                color: '#FF8800'
            },
            feather_falling: {
                name: 'Feather Falling',
                type: 'boots',
                maxLevel: 4,
                stats: { fallDamageReduction: 0.12 },
                materials: ['feather', 'slime_block'],
                color: '#FFFFFF'
            },
            blast_protection: {
                name: 'Blast Protection',
                type: 'armor',
                maxLevel: 4,
                stats: { explosionResistance: 0.2 },
                materials: ['obsidian', 'gunpowder'],
                color: '#444444'
            },
            thorns: {
                name: 'Thorns',
                type: 'armor',
                maxLevel: 3,
                stats: { reflectDamage: 0.15 },
                materials: ['cactus', 'rose'],
                color: '#44FF44'
            },
            
            // TOOL ENCHANTMENTS
            efficiency: {
                name: 'Efficiency',
                type: 'tool',
                maxLevel: 5,
                stats: { miningSpeed: 0.2 },
                materials: ['diamond', 'redstone'],
                color: '#4488FF'
            },
            unbreaking: {
                name: 'Unbreaking',
                type: 'any',
                maxLevel: 3,
                stats: { durability: 0.33 },
                materials: ['obsidian', 'ancient_debris'],
                color: '#444444'
            },
            fortune: {
                name: 'Fortune',
                type: 'tool',
                maxLevel: 3,
                stats: { oreYield: 0.33 },
                materials: ['emerald', 'lapis_lazuli'],
                color: '#44FF44'
            },
            silk_touch: {
                name: 'Silk Touch',
                type: 'tool',
                maxLevel: 1,
                stats: { silkHarvest: true },
                materials: ['glass', 'slime_block'],
                color: '#FFFFFF'
            },
            
            // MAGIC ENCHANTMENTS
            power: {
                name: 'Power',
                type: 'bow',
                maxLevel: 5,
                stats: { arrowDamage: 0.25 },
                materials: ['ghast_tear', 'blaze_powder'],
                color: '#FF4444'
            },
            punch: {
                name: 'Punch',
                type: 'bow',
                maxLevel: 2,
                stats: { arrowKnockback: 0.5 },
                materials: ['slime_ball', 'wind_charge'],
                color: '#4488FF'
            },
            flame: {
                name: 'Flame',
                type: 'bow',
                maxLevel: 1,
                stats: { arrowFire: true },
                materials: ['blaze_rod', 'magma_cream'],
                color: '#FF4400'
            },
            infinity: {
                name: 'Infinity',
                type: 'bow',
                maxLevel: 1,
                stats: { noArrowConsumption: true },
                materials: ['ender_pearl', 'nether_star'],
                color: '#AA44FF'
            }
        };
    },
    
    enchantItem(item, enchantmentType, level) {
        const enchantment = this.enchantments[enchantmentType];
        if (!enchantment) return { success: false, error: 'Unknown enchantment' };
        
        // Check compatibility
        if (enchantment.type !== 'any' && !this.isItemCompatible(item, enchantment.type)) {
            return { success: false, error: 'Incompatible item type' };
        }
        
        // Check if already enchanted with same type
        if (item.enchantments && item.enchantments[enchantmentType]) {
            return { success: false, error: 'Already enchanted' };
        }
        
        // Apply enchantment
        if (!item.enchantments) {
            item.enchantments = {};
        }
        
        item.enchantments[enchantmentType] = {
            level,
            stats: this.calculateEnchantmentStats(enchantment, level)
        };
        
        this.recalculateItemEnchantments(item);
        
        return { success: true };
    },
    
    isItemCompatible(item, type) {
        const compatibilities = {
            weapon: ['sword', 'axe', 'dagger', 'spear'],
            armor: ['helmet', 'chestplate', 'leggings', 'boots'],
            boots: ['boots'],
            tool: ['pickaxe', 'axe', 'shovel', 'hoe'],
            bow: ['bow']
        };
        
        return compatibilities[type]?.includes(item.subtype);
    },
    
    calculateEnchantmentStats(enchantment, level) {
        const stats = {};
        
        Object.entries(enchantment.stats).forEach(([stat, value]) => {
            if (typeof value === 'number') {
                stats[stat] = value * level;
            } else {
                stats[stat] = value;
            }
        });
        
        return stats;
    },
    
    recalculateItemEnchantments(item) {
        item.totalEnchantBonus = {};
        
        if (!item.enchantments) return;
        
        Object.values(item.enchantments).forEach(enchant => {
            Object.entries(enchant.stats).forEach(([stat, value]) => {
                item.totalEnchantBonus[stat] = (item.totalEnchantBonus[stat] || 0) + value;
            });
        });
    },
    
    disenchantItem(item) {
        if (!item.enchantments) return null;
        
        const materials = [];
        
        Object.values(item.enchantments).forEach(enchant => {
            // Return 50% of materials used
            materials.push(...Object.keys(enchant.materials || {}).slice(0, Math.ceil(enchant.level / 2)));
        });
        
        // Remove enchantments
        item.enchantments = {};
        item.totalEnchantBonus = {};
        
        return materials;
    },
    
    combineEnchantments(item1, item2) {
        // Merge enchantments from item2 into item1
        const conflicts = [];
        
        Object.entries(item2.enchantments || {}).forEach(([type, enchant]) => {
            if (item1.enchantments[type]) {
                // Same enchantment - upgrade if possible
                const maxLevel = this.enchantments[type].maxLevel;
                const newLevel = Math.min(enchant.level + 1, maxLevel);
                
                if (newLevel > item1.enchantments[type].level) {
                    item1.enchantments[type].level = newLevel;
                } else {
                    conflicts.push(type);
                }
            } else {
                // Different enchantment - add it
                item1.enchantments[type] = { ...enchant };
            }
        });
        
        this.recalculateItemEnchantments(item1);
        
        return { success: true, conflicts };
    },
    
    renderEnchantmentUI(ctx, item, x, y) {
        if (!item.enchantments) return;
        
        let offsetY = y;
        
        Object.entries(item.enchantments).forEach(([type, enchant]) => {
            const enchantment = this.enchantments[type];
            
            ctx.fillStyle = enchantment.color;
            ctx.font = 'bold 12px Inter';
            ctx.textAlign = 'left';
            
            const romanLevel = this.toRoman(enchant.level);
            ctx.fillText(`${enchantment.name} ${romanLevel}`, x, offsetY);
            
            offsetY += 15;
        });
    },
    
    toRoman(num) {
        const roman = {
            1: 'I',
            2: 'II',
            3: 'III',
            4: 'IV',
            5: 'V'
        };
        return roman[num] || num;
    }
};

// Export globally
window.FarmingSystem = FarmingSystem;
window.GemSystem = GemSystem;
window.EnchantmentSystem = EnchantmentSystem;

console.log('🌾💎✨ Phases 15-17 loaded: Farming, Gems, Enchanting');
