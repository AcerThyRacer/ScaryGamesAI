/* ============================================
   The Abyss - Resource Gathering System
   Collectibles, crafting, and upgrades
   Phase 2 Implementation
   ============================================ */

const ResourceSystem = (function() {
    'use strict';

    // Resource definitions
    const RESOURCES = {
        // Basic Materials
        metal_scrap: { name: 'Metal Scrap', icon: '🔩', value: 5, weight: 1, rarity: 'common' },
        crystal_shard: { name: 'Crystal Shard', icon: '💎', value: 10, weight: 0.5, rarity: 'common' },
        seaweed_bundle: { name: 'Seaweed Bundle', icon: '🌿', value: 3, weight: 0.2, rarity: 'common' },
        shell: { name: 'Shell', icon: '🐚', value: 8, weight: 0.3, rarity: 'common' },
        
        // Intermediate
        rare_shell: { name: 'Rare Shell', icon: '🐚', value: 15, weight: 0.3, rarity: 'uncommon' },
        ancient_bone: { name: 'Ancient Bone', icon: '🦴', value: 20, weight: 1, rarity: 'uncommon' },
        pearl: { name: 'Pearl', icon: '⚪', value: 25, weight: 0.1, rarity: 'uncommon' },
        black_pearl: { name: 'Black Pearl', icon: '⚫', value: 50, weight: 0.1, rarity: 'rare' },
        
        // Advanced
        pure_crystal: { name: 'Pure Crystal', icon: '💠', value: 75, weight: 0.5, rarity: 'rare' },
        abyssal_ore: { name: 'Abyssal Ore', icon: '⬛', value: 100, weight: 2, rarity: 'epic' },
        void_crystal: { name: 'Void Crystal', icon: '🌑', value: 150, weight: 0.5, rarity: 'epic' },
        
        // Legendary
        leviathan_pearl: { name: 'Leviathan Pearl', icon: '🐋', value: 500, weight: 1, rarity: 'legendary' },
        primordial_essence: { name: 'Primordial Essence', icon: '✨', value: 1000, weight: 0, rarity: 'legendary' },
        ancient_relic: { name: 'Ancient Relic', icon: '🏺', value: 2000, weight: 3, rarity: 'legendary' },
        
        // Consumables
        oxygen_tank: { name: 'Oxygen Tank', icon: '🫁', value: 50, weight: 2, type: 'consumable', effect: 'oxygen' },
        medical_kit: { name: 'Medical Kit', icon: '💊', value: 60, weight: 1, type: 'consumable', effect: 'heal' },
        battery: { name: 'Battery', icon: '🔋', value: 20, weight: 0.5, type: 'consumable', effect: 'charge' },
        flare: { name: 'Flare', icon: '🔥', value: 25, weight: 0.3, type: 'consumable', effect: 'light' }
    };

    // Crafting recipes
    const RECIPES = {
        oxygen_tank: {
            name: 'Oxygen Tank',
            ingredients: { metal_scrap: 3, seaweed_bundle: 2 },
            output: { item: 'oxygen_tank', count: 1 },
            time: 5
        },
        medical_kit: {
            name: 'Medical Kit',
            ingredients: { seaweed_bundle: 3, crystal_shard: 2 },
            output: { item: 'medical_kit', count: 1 },
            time: 5
        },
        advanced_battery: {
            name: 'Advanced Battery',
            ingredients: { battery: 2, pure_crystal: 1 },
            output: { item: 'battery', count: 3 },
            time: 8
        },
        crystal_lantern: {
            name: 'Crystal Lantern',
            ingredients: { crystal_shard: 5, metal_scrap: 2 },
            output: { item: 'lantern', count: 1 },
            time: 10
        }
    };

    // Upgrade definitions
    const UPGRADES = {
        oxygen_efficiency: {
            name: 'Oxygen Efficiency',
            description: 'Reduces oxygen consumption by 10%',
            maxLevel: 5,
            cost: (level) => ({
                metal_scrap: 5 * level,
                crystal_shard: 3 * level,
                pure_crystal: level > 3 ? 1 : 0
            }),
            effect: (level) => ({ oxygenConsumption: 1 - level * 0.1 })
        },
        swim_speed: {
            name: 'Swim Speed',
            description: 'Increases movement speed by 10%',
            maxLevel: 5,
            cost: (level) => ({
                metal_scrap: 8 * level,
                seaweed_bundle: 5 * level
            }),
            effect: (level) => ({ swimSpeed: 1 + level * 0.1 })
        },
        flashlight_range: {
            name: 'Flashlight Range',
            description: 'Increases light range by 20%',
            maxLevel: 3,
            cost: (level) => ({
                crystal_shard: 5 * level,
                battery: 2 * level
            }),
            effect: (level) => ({ lightRange: 1 + level * 0.2 })
        },
        max_health: {
            name: 'Health Upgrade',
            description: 'Increases max health by 25',
            maxLevel: 4,
            cost: (level) => ({
                ancient_bone: 2 * level,
                pearl: 3 * level
            }),
            effect: (level) => ({ maxHealth: 100 + level * 25 })
        },
        cargo_capacity: {
            name: 'Cargo Capacity',
            description: 'Increases inventory slots by 5',
            maxLevel: 4,
            cost: (level) => ({
                metal_scrap: 10 * level,
                abyssal_ore: level > 2 ? 1 : 0
            }),
            effect: (level) => ({ inventorySlots: 20 + level * 5 })
        }
    };

    // Player inventory
    let inventory = {};
    let maxSlots = 20;
    let upgrades = {};
    let totalValue = 0;

    function init(savedData) {
        if (savedData) {
            inventory = savedData.inventory || {};
            upgrades = savedData.upgrades || {};
            maxSlots = savedData.maxSlots || 20;
        }
        console.log('💰 Resource System initialized');
    }

    function addItem(itemId, quantity = 1) {
        const resource = RESOURCES[itemId];
        if (!resource) {
            console.error('Unknown item:', itemId);
            return false;
        }

        // Check inventory space
        const currentWeight = getInventoryWeight();
        const newWeight = currentWeight + resource.weight * quantity;
        const maxWeight = maxSlots * 2;

        if (newWeight > maxWeight) {
            if (window.showNotification) {
                showNotification('Inventory full!', 'warning');
            }
            return false;
        }

        // Add to inventory
        if (!inventory[itemId]) {
            inventory[itemId] = 0;
        }
        inventory[itemId] += quantity;
        totalValue += resource.value * quantity;

        // Notification
        if (window.showNotification) {
            const rarityColors = {
                common: '#ffffff',
                uncommon: '#00ff00',
                rare: '#0088ff',
                epic: '#aa00ff',
                legendary: '#ffaa00'
            };
            showNotification(`+ ${resource.icon} ${resource.name} x${quantity}`);
        }

        return true;
    }

    function removeItem(itemId, quantity = 1) {
        if (!inventory[itemId] || inventory[itemId] < quantity) {
            return false;
        }

        inventory[itemId] -= quantity;
        if (inventory[itemId] <= 0) {
            delete inventory[itemId];
        }

        const resource = RESOURCES[itemId];
        totalValue -= resource.value * quantity;

        return true;
    }

    function hasItem(itemId, quantity = 1) {
        return (inventory[itemId] || 0) >= quantity;
    }

    function getItemCount(itemId) {
        return inventory[itemId] || 0;
    }

    function getInventoryWeight() {
        let weight = 0;
        for (const [itemId, quantity] of Object.entries(inventory)) {
            const resource = RESOURCES[itemId];
            if (resource) {
                weight += resource.weight * quantity;
            }
        }
        return weight;
    }

    function getInventory() {
        return { ...inventory };
    }

    function getTotalValue() {
        return totalValue;
    }

    // Crafting
    function canCraft(recipeId) {
        const recipe = RECIPES[recipeId];
        if (!recipe) return false;

        for (const [item, amount] of Object.entries(recipe.ingredients)) {
            if (!hasItem(item, amount)) {
                return false;
            }
        }
        return true;
    }

    function craft(recipeId) {
        if (!canCraft(recipeId)) {
            return { success: false, reason: 'insufficient_materials' };
        }

        const recipe = RECIPES[recipeId];
        
        // Consume ingredients
        for (const [item, amount] of Object.entries(recipe.ingredients)) {
            removeItem(item, amount);
        }

        // Add output
        addItem(recipe.output.item, recipe.output.count);

        return { 
            success: true, 
            item: recipe.output.item,
            count: recipe.output.count
        };
    }

    function getAvailableRecipes() {
        return Object.entries(RECIPES).map(([id, recipe]) => ({
            id,
            ...recipe,
            canCraft: canCraft(id),
            hasIngredients: Object.entries(recipe.ingredients).map(([item, amount]) => ({
                item,
                amount,
                have: getItemCount(item)
            }))
        }));
    }

    // Upgrades
    function canUpgrade(upgradeId) {
        const upgrade = UPGRADES[upgradeId];
        if (!upgrade) return false;

        const currentLevel = upgrades[upgradeId] || 0;
        if (currentLevel >= upgrade.maxLevel) return false;

        const cost = upgrade.cost(currentLevel + 1);
        for (const [item, amount] of Object.entries(cost)) {
            if (!hasItem(item, amount)) {
                return false;
            }
        }
        return true;
    }

    function purchaseUpgrade(upgradeId) {
        if (!canUpgrade(upgradeId)) {
            return { success: false };
        }

        const upgrade = UPGRADES[upgradeId];
        const currentLevel = upgrades[upgradeId] || 0;
        const cost = upgrade.cost(currentLevel + 1);

        // Consume materials
        for (const [item, amount] of Object.entries(cost)) {
            removeItem(item, amount);
        }

        // Apply upgrade
        upgrades[upgradeId] = currentLevel + 1;

        // Apply effect
        const effect = upgrade.effect(upgrades[upgradeId]);
        applyUpgradeEffect(upgradeId, effect);

        return { 
            success: true, 
            level: upgrades[upgradeId],
            effect
        };
    }

    function applyUpgradeEffect(upgradeId, effect) {
        if (!window.player) return;

        if (effect.maxHealth) {
            window.player.maxHealth = effect.maxHealth;
            window.player.health = Math.min(window.player.health, effect.maxHealth);
        }
        if (effect.inventorySlots) {
            maxSlots = effect.inventorySlots;
        }
        
        // Store effects for other systems to use
        window.player.upgradeEffects = window.player.upgradeEffects || {};
        Object.assign(window.player.upgradeEffects, effect);
    }

    function getUpgradeStatus() {
        return Object.entries(UPGRADES).map(([id, upgrade]) => {
            const currentLevel = upgrades[id] || 0;
            return {
                id,
                name: upgrade.name,
                description: upgrade.description,
                currentLevel,
                maxLevel: upgrade.maxLevel,
                canUpgrade: canUpgrade(id),
                nextCost: currentLevel < upgrade.maxLevel ? 
                    upgrade.cost(currentLevel + 1) : null
            };
        });
    }

    function getUpgradeEffects() {
        let combinedEffects = {
            oxygenConsumption: 1,
            swimSpeed: 1,
            lightRange: 1,
            maxHealth: 100,
            inventorySlots: 20
        };

        for (const [upgradeId, level] of Object.entries(upgrades)) {
            const upgrade = UPGRADES[upgradeId];
            if (upgrade && level > 0) {
                const effect = upgrade.effect(level);
                Object.assign(combinedEffects, effect);
            }
        }

        return combinedEffects;
    }

    // World spawning
    function spawnForBiome(biome) {
        // Spawn resource nodes in the world
        const count = Math.floor(Math.random() * 5) + 3;
        
        for (let i = 0; i < count; i++) {
            const resourceType = selectResourceForBiome(biome);
            if (resourceType) {
                spawnResourceNode(resourceType, biome);
            }
        }
    }

    function selectResourceForBiome(biome) {
        const options = [];
        
        biome.resources?.forEach(r => {
            if (RESOURCES[r]) options.push(r);
        });
        
        return options.length > 0 ? 
            options[Math.floor(Math.random() * options.length)] : null;
    }

    function spawnResourceNode(resourceType, biome) {
        // This would create a 3D object in the world
        // Simplified for now
        const position = {
            x: (Math.random() - 0.5) * 100,
            y: -(biome.depthRange[0] + Math.random() * 20),
            z: (Math.random() - 0.5) * 100
        };
        
        // Would create mesh here
        console.log(`Spawned ${resourceType} at`, position);
    }

    function harvest(node) {
        if (node.harvested) return null;
        
        node.harvested = true;
        const amount = 1 + Math.floor(Math.random() * 2);
        
        addItem(node.resourceType, amount);
        
        return {
            type: node.resourceType,
            amount
        };
    }

    function save() {
        return {
            inventory,
            upgrades,
            maxSlots,
            totalValue
        };
    }

    return {
        RESOURCES,
        RECIPES,
        UPGRADES,
        init,
        addItem,
        removeItem,
        hasItem,
        getItemCount,
        getInventory,
        getInventoryWeight,
        getTotalValue,
        canCraft,
        craft,
        getAvailableRecipes,
        canUpgrade,
        purchaseUpgrade,
        getUpgradeStatus,
        getUpgradeEffects,
        spawnForBiome,
        harvest,
        save
    };
})();

window.ResourceSystem = ResourceSystem;
