/**
 * Crafting System - Collect resources and craft items
 */

var CraftingSystem = (function() {
    'use strict';

    var recipes = {
        flashbang: {
            id: 'flashbang',
            name: 'Flashbang',
            ingredients: {
                battery: 1,
                wire: 1
            },
            craftTime: 2,
            description: 'Stuns Pac-Man'
        },
        medkit: {
            id: 'medkit',
            name: 'Medkit',
            ingredients: {
                chemical: 2,
                cloth: 1
            },
            craftTime: 3,
            description: 'Restores 25 sanity'
        },
        trap: {
            id: 'trap',
            name: 'Stun Trap',
            ingredients: {
                wire: 2,
                battery: 1
            },
            craftTime: 2.5,
            description: 'Place to stun enemies'
        },
        battery_pack: {
            id: 'battery_pack',
            name: 'Battery Pack',
            ingredients: {
                battery: 3
            },
            craftTime: 1.5,
            description: 'Extra power source'
        }
    };

    var inventory = {
        battery: 0,
        wire: 0,
        chemical: 0,
        cloth: 0
    };

    var craftedItems = {
        flashbang: 0,
        medkit: 0,
        trap: 0,
        battery_pack: 0
    };

    var craftingInProgress = null;
    var scene = null;
    var resourceNodes = [];

    function init(threeScene) {
        scene = threeScene;
        console.log('[CraftingSystem] Initialized');
    }

    function addResource(type, amount) {
        if (!inventory[type]) {
            inventory[type] = 0;
        }
        inventory[type] += amount;
        console.log('[CraftingSystem] Added', amount, type, '(total:', inventory[type] + ')');
        return inventory[type];
    }

    function removeResource(type, amount) {
        if (!inventory[type] || inventory[type] < amount) {
            return false;
        }
        inventory[type] -= amount;
        return true;
    }

    function canCraft(recipeId) {
        var recipe = recipes[recipeId];
        if (!recipe) return false;

        for (var ingredient in recipe.ingredients) {
            if (!inventory[ingredient] || inventory[ingredient] < recipe.ingredients[ingredient]) {
                return false;
            }
        }
        return true;
    }

    function craft(recipeId, onComplete) {
        if (!canCraft(recipeId)) {
            console.log('[CraftingSystem] Cannot craft', recipeId);
            return false;
        }

        if (craftingInProgress) {
            console.log('[CraftingSystem] Already crafting');
            return false;
        }

        var recipe = recipes[recipeId];
        craftingInProgress = {
            recipeId: recipeId,
            startTime: Date.now(),
            duration: recipe.craftTime * 1000
        };

        console.log('[CraftingSystem] Crafting', recipeId, '...');

        setTimeout(function() {
            completeCrafting(recipeId);
            if (onComplete) onComplete(recipeId);
        }, recipe.craftTime * 1000);

        return true;
    }

    function completeCrafting(recipeId) {
        var recipe = recipes[recipeId];

        for (var ingredient in recipe.ingredients) {
            removeResource(ingredient, recipe.ingredients[ingredient]);
        }

        if (craftedItems[recipeId] !== undefined) {
            craftedItems[recipeId]++;
        }

        console.log('[CraftingSystem] Crafted', recipeId);
        craftingInProgress = null;
    }

    function spawnResourceNode(position, type) {
        var colors = {
            battery: 0xffaa00,
            wire: 0xcccccc,
            chemical: 0x00ff00,
            cloth: 0xffffff
        };

        var geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        var material = new THREE.MeshStandardMaterial({
            color: colors[type] || 0xffffff,
            emissive: colors[type] || 0xffffff,
            emissiveIntensity: 0.5
        });

        var node = new THREE.Mesh(geometry, material);
        node.position.copy(position);
        node.userData.resourceType = type;
        node.userData.amount = 1 + Math.floor(Math.random() * 3);

        scene.add(node);
        resourceNodes.push(node);

        return node;
    }

    function collectResource(position, radius) {
        var collected = [];

        for (var i = resourceNodes.length - 1; i >= 0; i--) {
            var node = resourceNodes[i];
            var dist = node.position.distanceTo(position);

            if (dist < radius) {
                var type = node.userData.resourceType;
                var amount = node.userData.amount;

                addResource(type, amount);
                collected.push({ type: type, amount: amount });

                scene.remove(node);
                node.geometry.dispose();
                node.material.dispose();
                resourceNodes.splice(i, 1);
            }
        }

        return collected;
    }

    function getInventory() {
        return Object.assign({}, inventory);
    }

    function getCraftedItems() {
        return Object.assign({}, craftedItems);
    }

    function getRecipes() {
        return Object.assign({}, recipes);
    }

    function getCraftingProgress() {
        if (!craftingInProgress) return null;

        var elapsed = Date.now() - craftingInProgress.startTime;
        var recipe = recipes[craftingInProgress.recipeId];
        var progress = elapsed / (recipe.craftTime * 1000);

        return {
            recipeId: craftingInProgress.recipeId,
            progress: Math.min(1, progress),
            remaining: Math.max(0, recipe.craftTime - elapsed / 1000)
        };
    }

    function cancelCrafting() {
        if (craftingInProgress) {
            craftingInProgress = null;
            console.log('[CraftingSystem] Crafting cancelled');
        }
    }

    function reset() {
        inventory = {
            battery: 0,
            wire: 0,
            chemical: 0,
            cloth: 0
        };
        craftedItems = {
            flashbang: 0,
            medkit: 0,
            trap: 0,
            battery_pack: 0
        };
        craftingInProgress = null;

        resourceNodes.forEach(function(node) {
            scene.remove(node);
            node.geometry.dispose();
            node.material.dispose();
        });
        resourceNodes = [];
    }

    return {
        init: init,
        addResource: addResource,
        removeResource: removeResource,
        canCraft: canCraft,
        craft: craft,
        spawnResourceNode: spawnResourceNode,
        collectResource: collectResource,
        getInventory: getInventory,
        getCraftedItems: getCraftedItems,
        getRecipes: getRecipes,
        getCraftingProgress: getCraftingProgress,
        cancelCrafting: cancelCrafting,
        reset: reset
    };
})();

if (typeof window !== 'undefined') {
    window.CraftingSystem = CraftingSystem;
}
