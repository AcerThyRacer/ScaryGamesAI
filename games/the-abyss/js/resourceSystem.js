/* ============================================
   The Abyss - Resource & Crafting System
   Phase 2 Implementation
   ============================================ */

const ResourceSystem = (function() {
    'use strict';

    // Resource definitions
    const RESOURCES = {
        // Basic materials
        METAL_SCRAP: {
            id: 'metal_scrap',
            name: 'Metal Scrap',
            description: 'Salvaged metal from wreckage. Useful for repairs.',
            icon: '🔩',
            rarity: 'common',
            stackable: true,
            maxStack: 20,
            value: 5
        },
        
        CRYSTAL_SHARD: {
            id: 'crystal_shard',
            name: 'Crystal Shard',
            description: 'A fragment of bioluminescent crystal.',
            icon: '💎',
            rarity: 'common',
            stackable: true,
            maxStack: 30,
            value: 10,
            effect: 'emits_light'
        },
        
        RARE_SHELL: {
            id: 'rare_shell',
            name: 'Rare Shell',
            description: 'A beautiful shell from the deep.',
            icon: '🐚',
            rarity: 'uncommon',
            stackable: true,
            maxStack: 10,
            value: 15
        },
        
        ANCIENT_BONE: {
            id: 'ancient_bone',
            name: 'Ancient Bone',
            description: 'Fossilized remains from prehistoric creatures.',
            icon: '🦴',
            rarity: 'uncommon',
            stackable: true,
            maxStack: 15,
            value: 20
        },
        
        SEAWEED_BUNDLE: {
            id: 'seaweed_bundle',
            name: 'Seaweed Bundle',
            description: 'Nutrient-rich marine plant.',
            icon: '🌿',
            rarity: 'common',
            stackable: true,
            maxStack: 50,
            value: 3,
            consumable: true,
            effect: 'minor_heal'
        },
        
        // Advanced materials
        PURE_CRYSTAL: {
            id: 'pure_crystal',
            name: 'Pure Crystal',
            description: 'A flawless energy crystal.',
            icon: '💠',
            rarity: 'rare',
            stackable: true,
            maxStack: 10,
            value: 50
        },
        
        HEAT_RESISTANT_MATERIAL: {
            id: 'heat_resistant_material',
            name: 'Thermogel',
            description: 'Material resistant to extreme heat.',
            icon: '🔥',
            rarity: 'rare',
            stackable: true,
            maxStack: 10,
            value: 40
        },
        
        ABYSSAL_ORE: {
            id: 'abyssal_ore',
            name: 'Abyssal Ore',
            description: 'Metal forged in crushing pressure.',
            icon: '⬛',
            rarity: 'epic',
            stackable: true,
            maxStack: 5,
            value: 100
        },
        
        ORGANIC_MATERIAL: {
            id: 'organic_material',
            name: 'Organic Matter',
            description: 'Preserved biological material.',
            icon: '🧬',
            rarity: 'uncommon',
            stackable: true,
            maxStack: 20,
            value: 15
        },
        
        // Consumables
        FLARE: {
            id: 'flare',
            name: 'Emergency Flare',
            description: 'Creates light and distracts creatures.',
            icon: '🔥',
            rarity: 'common',
            stackable: true,
            maxStack: 5,
            value: 25,
            consumable: true,
            usable: true,
            effect: 'throw_flare'
        },
        
        OXYGEN_TANK: {
            id: 'oxygen_tank',
            name: 'Oxygen Tank',
            description: 'Replenishes oxygen supply.',
            icon: '🫁',
            rarity: 'uncommon',
            stackable: true,
            maxStack: 3,
            value: 50,
            consumable: true,
            usable: true,
            effect: 'refill_oxygen'
        },
        
        MEDICAL_KIT: {
            id: 'medical_kit',
            name: 'Medical Kit',
            description: 'Restores health to full.',
            icon: '💊',
            rarity: 'uncommon',
            stackable: true,
            maxStack: 3,
            value: 60,
            consumable: true,
            usable: true,
            effect: 'full_heal'
        },
        
        BATTERY: {
            id: 'battery',
            name: 'Battery',
            description: 'Charges flashlight.',
            icon: '🔋',
            rarity: 'common',
            stackable: true,
            maxStack: 5,
            value: 20,
            consumable: true,
            usable: true,
            effect: 'charge_flashlight'
        },
        
        ADVANCED_BATTERY: {
            id: 'advanced_battery',
            name: 'Advanced Battery',
            description: 'High-capacity battery pack.',
            icon: '🔌',
            rarity: 'rare',
            stackable: true,
            maxStack: 3,
            value: 80,
            consumable: true,
            usable: true,
            effect: 'full_charge_flashlight'
        },
        
        // Special items
        RESEARCH_DATA: {
            id: 'research_data',
            name: 'Research Data',
            description: 'Scientific data from the depths.',
            icon: '💾',
            rarity: 'rare',
            stackable: true,
            maxStack: 10,
            value: 75,
            questItem: true
        },
        
        ANCIENT_ARTIFACT: {
            id: 'ancient_artifact',
            name: 'Ancient Artifact',
            description: 'A relic from an unknown civilization.',
            icon: '🏺',
            rarity: 'epic',
            stackable: false,
            value: 500,
            questItem: true
        },
        
        MYSTERIOUS_TABLET: {
            id: 'mysterious_tablet',
            name: 'Mysterious Tablet',
            description: 'Carved with unknown symbols.',
            icon: '📜',
            rarity: 'legendary',
            stackable: false,
            value: 1000,
            questItem: true
        },
        
        VOID_FRAGMENT: {
            id: 'void_fragment',
            name: 'Void Fragment',
            description: 'A piece of something that should not exist.',
            icon: '🌑',
            rarity: 'legendary',
            stackable: true,
            maxStack: 1,
            value: 2000,
            effect: 'strange_glow'
        }
    };

    // Crafting recipes
    const RECIPES = {
        FLARE: {
            id: 'craft_flare',
            name: 'Craft Flare',
            description: 'Create an emergency flare',
            ingredients: [
                { item: 'metal_scrap', count: 2 },
                { item: 'crystal_shard', count: 1 }
            ],
            output: { item: 'flare', count: 1 },
            time: 3
        },
        
        OXYGEN_TANK: {
            id: 'craft_oxygen',
            name: 'Craft Oxygen Tank',
            description: 'Create a portable oxygen supply',
            ingredients: [
                { item: 'metal_scrap', count: 3 },
                { item: 'seaweed_bundle', count: 5 },
                { item: 'rare_shell', count: 1 }
            ],
            output: { item: 'oxygen_tank', count: 1 },
            time: 5
        },
        
        MEDICAL_KIT: {
            id: 'craft_medkit',
            name: 'Craft Medical Kit',
            description: 'Create healing supplies',
            ingredients: [
                { item: 'seaweed_bundle', count: 3 },
                { item: 'organic_material', count: 2 },
                { item: 'crystal_shard', count: 2 }
            ],
            output: { item: 'medical_kit', count: 1 },
            time: 5
        },
        
        BATTERY: {
            id: 'craft_battery',
            name: 'Craft Battery',
            description: 'Create a flashlight battery',
            ingredients: [
                { item: 'metal_scrap', count: 1 },
                { item: 'crystal_shard', count: 2 }
            ],
            output: { item: 'battery', count: 1 },
            time: 2
        },
        
        ADVANCED_BATTERY: {
            id: 'craft_advanced_battery',
            name: 'Craft Advanced Battery',
            description: 'Create a high-capacity battery',
            ingredients: [
                { item: 'battery', count: 2 },
                { item: 'pure_crystal', count: 1 },
                { item: 'heat_resistant_material', count: 1 }
            ],
            output: { item: 'advanced_battery', count: 1 },
            time: 8
        },
        
        UPGRADE_OXYGEN_EFFICIENCY: {
            id: 'upgrade_oxygen_eff',
            name: 'Upgrade: Oxygen Efficiency',
            description: 'Permanently reduces oxygen consumption by 10%',
            ingredients: [
                { item: 'pure_crystal', count: 3 },
                { item: 'abyssal_ore', count: 2 },
                { item: 'organic_material', count: 5 }
            ],
            output: { upgrade: 'oxygen_efficiency', level: 1 },
            time: 10,
            oneTime: true
        },
        
        UPGRADE_SWIM_SPEED: {
            id: 'upgrade_swim',
            name: 'Upgrade: Swim Speed',
            description: 'Permanently increases swim speed by 10%',
            ingredients: [
                { item: 'metal_scrap', count: 10 },
                { item: 'heat_resistant_material', count: 2 },
                { item: 'abyssal_ore', count: 1 }
            ],
            output: { upgrade: 'swim_speed', level: 1 },
            time: 10,
            oneTime: true
        },
        
        UPGRADE_FLASHLIGHT: {
            id: 'upgrade_flashlight',
            name: 'Upgrade: Flashlight Range',
            description: 'Increases flashlight range and duration',
            ingredients: [
                { item: 'pure_crystal', count: 2 },
                { item: 'battery', count: 3 },
                { item: 'crystal_shard', count: 5 }
            ],
            output: { upgrade: 'flashlight', level: 1 },
            time: 8,
            oneTime: true
        }
    };

    // Player inventory
    let inventory = {};
    let maxInventorySlots = 20;
    let upgrades = {
        oxygenEfficiency: 0,
        swimSpeed: 0,
        flashlightRange: 0,
        healthMax: 0
    };

    // ============================================
    // INVENTORY MANAGEMENT
    // ============================================
    function init(savedInventory, savedUpgrades) {
        if (savedInventory) {
            inventory = savedInventory;
        }
        if (savedUpgrades) {
            upgrades = { ...upgrades, ...savedUpgrades };
        }
    }

    function addItem(itemId, count = 1) {
        const resource = RESOURCES[itemId.toUpperCase()];
        if (!resource) {
            console.error('Unknown item:', itemId);
            return false;
        }
        
        // Check if we can carry more
        if (getInventoryWeight() >= maxInventorySlots && !resource.stackable) {
            showInventoryFullNotification();
            return false;
        }
        
        if (!inventory[itemId]) {
            inventory[itemId] = 0;
        }
        
        // Check stack limit
        if (resource.stackable) {
            const current = inventory[itemId];
            const max = resource.maxStack || 99;
            if (current + count > max) {
                const added = max - current;
                inventory[itemId] = max;
                showPickupNotification(resource, added);
                return added;
            }
        }
        
        inventory[itemId] += count;
        showPickupNotification(resource, count);
        
        // Play sound
        playPickupSound(resource.rarity);
        
        return count;
    }

    function removeItem(itemId, count = 1) {
        if (!inventory[itemId]) return false;
        
        inventory[itemId] -= count;
        
        if (inventory[itemId] <= 0) {
            delete inventory[itemId];
        }
        
        return true;
    }

    function hasItem(itemId, count = 1) {
        return (inventory[itemId] || 0) >= count;
    }

    function getItemCount(itemId) {
        return inventory[itemId] || 0;
    }

    function getInventoryWeight() {
        let weight = 0;
        for (const itemId in inventory) {
            const resource = RESOURCES[itemId.toUpperCase()];
            if (resource) {
                weight += resource.stackable ? 1 : inventory[itemId];
            }
        }
        return weight;
    }

    function getInventory() {
        return { ...inventory };
    }

    function clearInventory() {
        inventory = {};
    }

    // ============================================
    // CRAFTING
    // ============================================
    function canCraft(recipeId) {
        const recipe = RECIPES[recipeId.toUpperCase()];
        if (!recipe) return false;
        
        // Check if one-time recipe already crafted
        if (recipe.oneTime && hasUpgrade(recipe.output.upgrade)) {
            return false;
        }
        
        // Check ingredients
        for (const ingredient of recipe.ingredients) {
            if (!hasItem(ingredient.item, ingredient.count)) {
                return false;
            }
        }
        
        return true;
    }

    function craft(recipeId) {
        if (!canCraft(recipeId)) {
            return { success: false, reason: 'insufficient_materials' };
        }
        
        const recipe = RECIPES[recipeId.toUpperCase()];
        
        // Consume ingredients
        for (const ingredient of recipe.ingredients) {
            removeItem(ingredient.item, ingredient.count);
        }
        
        // Add output
        if (recipe.output.item) {
            addItem(recipe.output.item, recipe.output.count);
        } else if (recipe.output.upgrade) {
            applyUpgrade(recipe.output.upgrade, recipe.output.level);
        }
        
        // Play craft sound
        playCraftSound();
        
        return { 
            success: true, 
            recipe: recipe,
            time: recipe.time 
        };
    }

    function getAvailableRecipes() {
        const available = [];
        
        for (const key in RECIPES) {
            const recipe = RECIPES[key];
            available.push({
                ...recipe,
                canCraft: canCraft(key),
                hasIngredients: recipe.ingredients.map(ing => ({
                    ...ing,
                    have: getItemCount(ing.item),
                    need: ing.count
                }))
            });
        }
        
        return available;
    }

    // ============================================
    // UPGRADES
    // ============================================
    function applyUpgrade(upgradeId, level) {
        switch(upgradeId) {
            case 'oxygen_efficiency':
                upgrades.oxygenEfficiency = level;
                break;
            case 'swim_speed':
                upgrades.swimSpeed = level;
                break;
            case 'flashlight':
                upgrades.flashlightRange = level;
                break;
            case 'health':
                upgrades.healthMax = level;
                break;
        }
        
        showUpgradeNotification(upgradeId, level);
    }

    function hasUpgrade(upgradeId) {
        switch(upgradeId) {
            case 'oxygen_efficiency':
                return upgrades.oxygenEfficiency > 0;
            case 'swim_speed':
                return upgrades.swimSpeed > 0;
            case 'flashlight':
                return upgrades.flashlightRange > 0;
            case 'health':
                return upgrades.healthMax > 0;
        }
        return false;
    }

    function getUpgrades() {
        return { ...upgrades };
    }

    function getUpgradeEffects() {
        return {
            oxygenConsumption: 1 - (upgrades.oxygenEfficiency * 0.1),
            swimSpeed: 1 + (upgrades.swimSpeed * 0.1),
            flashlightRange: 1 + (upgrades.flashlightRange * 0.2),
            maxHealth: 100 + (upgrades.healthMax * 25)
        };
    }

    // ============================================
    // ITEM USAGE
    // ============================================
    function useItem(itemId, player) {
        const resource = RESOURCES[itemId.toUpperCase()];
        if (!resource || !resource.usable) return false;
        
        if (!hasItem(itemId)) return false;
        
        // Apply effect
        switch(resource.effect) {
            case 'refill_oxygen':
                if (player.oxygen >= player.maxOxygen) return false;
                player.oxygen = Math.min(player.maxOxygen, player.oxygen + 50);
                removeItem(itemId);
                showUseNotification(resource.name, 'Oxygen refilled!');
                return true;
                
            case 'full_heal':
                if (player.health >= player.maxHealth) return false;
                player.health = player.maxHealth;
                removeItem(itemId);
                showUseNotification(resource.name, 'Health restored!');
                return true;
                
            case 'minor_heal':
                if (player.health >= player.maxHealth) return false;
                player.health = Math.min(player.maxHealth, player.health + 20);
                removeItem(itemId);
                showUseNotification(resource.name, '+20 Health');
                return true;
                
            case 'charge_flashlight':
                if (player.flashlightBattery >= 100) return false;
                player.flashlightBattery = Math.min(100, player.flashlightBattery + 30);
                removeItem(itemId);
                showUseNotification(resource.name, 'Flashlight charged!');
                return true;
                
            case 'full_charge_flashlight':
                if (player.flashlightBattery >= 100) return false;
                player.flashlightBattery = 100;
                removeItem(itemId);
                showUseNotification(resource.name, 'Flashlight fully charged!');
                return true;
                
            case 'throw_flare':
                // This is handled by the flare system
                removeItem(itemId);
                return true;
        }
        
        return false;
    }

    // ============================================
    // LOOT GENERATION
    // ============================================
    function generateLoot(lootTable, luck = 1) {
        const loot = [];
        const table = LOOT_TABLES[lootTable];
        
        if (!table) return loot;
        
        for (const entry of table) {
            const roll = Math.random() * luck;
            if (roll < entry.chance) {
                const count = Math.floor(Math.random() * (entry.max - entry.min + 1)) + entry.min;
                loot.push({ item: entry.item, count: count });
            }
        }
        
        return loot;
    }

    const LOOT_TABLES = {
        basic_container: [
            { item: 'flare', min: 1, max: 2, chance: 0.5 },
            { item: 'battery', min: 1, max: 2, chance: 0.6 },
            { item: 'metal_scrap', min: 1, max: 3, chance: 0.8 },
            { item: 'crystal_shard', min: 1, max: 2, chance: 0.4 }
        ],
        
        medical_supply: [
            { item: 'medical_kit', min: 1, max: 1, chance: 0.3 },
            { item: 'oxygen_tank', min: 1, max: 1, chance: 0.4 },
            { item: 'seaweed_bundle', min: 2, max: 5, chance: 0.7 }
        ],
        
        rare_cache: [
            { item: 'pure_crystal', min: 1, max: 2, chance: 0.3 },
            { item: 'advanced_battery', min: 1, max: 1, chance: 0.2 },
            { item: 'ancient_bone', min: 1, max: 2, chance: 0.5 },
            { item: 'rare_shell', min: 1, max: 3, chance: 0.6 }
        ],
        
        abyssal_treasure: [
            { item: 'abyssal_ore', min: 1, max: 2, chance: 0.4 },
            { item: 'void_fragment', min: 1, max: 1, chance: 0.05 },
            { item: 'ancient_artifact', min: 1, max: 1, chance: 0.1 },
            { item: 'pure_crystal', min: 2, max: 5, chance: 0.5 }
        ]
    };

    // ============================================
    // UI NOTIFICATIONS
    // ============================================
    function showPickupNotification(resource, count) {
        if (window.showNotification) {
            const countText = count > 1 ? ` x${count}` : '';
            showNotification(`+ ${resource.icon} ${resource.name}${countText}`);
        }
    }

    function showInventoryFullNotification() {
        if (window.showNotification) {
            showNotification('Inventory full!', 'warning');
        }
    }

    function showUseNotification(itemName, effect) {
        if (window.showNotification) {
            showNotification(`${itemName}: ${effect}`);
        }
    }

    function showUpgradeNotification(upgradeId, level) {
        const names = {
            oxygen_efficiency: 'Oxygen Efficiency',
            swim_speed: 'Swim Speed',
            flashlight: 'Flashlight Range',
            health: 'Maximum Health'
        };
        
        if (window.showNotification) {
            showNotification(`🔧 Upgrade acquired: ${names[upgradeId]} +${level}!`, 'success');
        }
    }

    function playPickupSound(rarity) {
        // Sound effects based on rarity
        const sounds = {
            common: 'pickup_common',
            uncommon: 'pickup_uncommon',
            rare: 'pickup_rare',
            epic: 'pickup_epic',
            legendary: 'pickup_legendary'
        };
        
        // Trigger sound
    }

    function playCraftSound() {
        // Play crafting sound
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        RESOURCES,
        RECIPES,
        LOOT_TABLES,
        
        init,
        addItem,
        removeItem,
        hasItem,
        getItemCount,
        getInventory,
        getInventoryWeight,
        clearInventory,
        maxInventorySlots,
        
        canCraft,
        craft,
        getAvailableRecipes,
        
        applyUpgrade,
        hasUpgrade,
        getUpgrades,
        getUpgradeEffects,
        
        useItem,
        generateLoot
    };
})();

// Global access
window.ResourceSystem = ResourceSystem;
