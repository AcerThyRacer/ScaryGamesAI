/**
 * Dynamic Loot Distribution System
 * 
 * Procedural loot generation with rarity tiers, player progression scaling,
 * and contextual drop rates based on location and enemy type.
 * 
 * @module core/procedural/loot
 */

const LootDistribution = (function() {
    'use strict';

    // Default loot tables
    const DEFAULT_LOOT_TABLES = {
        common: {
            weight: 60,
            items: [
                { id: 'health_small', name: 'Small Health Pack', value: 10, effect: { health: 25 } },
                { id: 'ammo_basic', name: 'Basic Ammo', value: 5, effect: { ammo: 10 } },
                { id: 'flashlight_battery', name: 'Battery', value: 8, effect: { battery: 20 } },
                { id: 'note_fragment', name: 'Lore Fragment', value: 15, effect: { lore: 1 } },
                { id: 'key_basic', name: 'Rusty Key', value: 20, effect: { unlocks: 'basic_door' } }
            ]
        },
        uncommon: {
            weight: 25,
            items: [
                { id: 'health_large', name: 'Large Health Pack', value: 25, effect: { health: 75 } },
                { id: 'ammo_special', name: 'Special Ammo', value: 15, effect: { ammo: 5, damage: 1.2 } },
                { id: 'medkit', name: 'Medkit', value: 35, effect: { health: 100, cure: 'bleed' } },
                { id: 'weapon_mod', name: 'Weapon Modification', value: 40, effect: { damage: 1.3 } },
                { id: 'key_silver', name: 'Silver Key', value: 50, effect: { unlocks: 'silver_door' } }
            ]
        },
        rare: {
            weight: 10,
            items: [
                { id: 'revive_token', name: 'Second Chance', value: 100, effect: { revive: 1 } },
                { id: 'damage_boost', name: 'Damage Boost', value: 75, effect: { damage: 2.0, duration: 60 } },
                { id: 'speed_boost', name: 'Speed Boost', value: 75, effect: { speed: 1.5, duration: 45 } },
                { id: 'invisibility', name: 'Shadow Cloak', value: 120, effect: { invisible: true, duration: 30 } },
                { id: 'key_gold', name: 'Gold Key', value: 150, effect: { unlocks: 'gold_door' } }
            ]
        },
        legendary: {
            weight: 5,
            items: [
                { id: 'artifact_power', name: 'Ancient Artifact', value: 500, effect: { all_stats: 1.5 } },
                { id: 'weapon_legendary', name: 'Legendary Weapon', value: 750, effect: { damage: 3.0, infinite_ammo: true } },
                { id: 'armor_legendary', name: 'Cursed Armor', value: 600, effect: { defense: 5.0, curse: true } },
                { id: 'relic_truth', name: 'Relic of Truth', value: 1000, effect: { reveal_all: true } },
                { id: 'key_master', name: 'Master Key', value: 2000, effect: { unlocks: 'all' } }
            ]
        }
    };

    // Enemy-specific loot modifiers
    const ENEMY_LOOT_MODIFIERS = {
        basic: { rareChance: 0, legendaryChance: 0 },
        elite: { rareChance: 5, legendaryChance: 1 },
        boss: { rareChance: 25, legendaryChance: 10 },
        human: { rareChance: 2, legendaryChance: 0 },
        supernatural: { rareChance: 8, legendaryChance: 2 },
        undead: { rareChance: 5, legendaryChance: 1 }
    };

    // Location-based loot modifiers
    const LOCATION_LOOT_MODIFIERS = {
        spawn: { quality: -2, quantity: 0.5 },
        corridor: { quality: 0, quantity: 1 },
        room: { quality: 1, quantity: 1.5 },
        treasure: { quality: 2, quantity: 2 },
        boss_arena: { quality: 3, quantity: 1 },
        secret: { quality: 2, quantity: 3 }
    };

    /**
     * Loot Distribution class
     */
    class LootDistribution {
        /**
         * Create loot distributor
         * @param {Object} config - Configuration
         */
        constructor(config = {}) {
            this.lootTables = config.lootTables || { ...DEFAULT_LOOT_TABLES };
            this.playerProgression = config.playerProgression || 0;
            this.luck = config.luck || 0;
            this.seed = config.seed || Math.random() * 10000;
            this.rng = this._createRNG(this.seed);
            this.dropHistory = [];
        }

        /**
         * Create seeded RNG
         * @param {number} seed - Seed
         * @returns {Function} RNG function
         */
        _createRNG(seed) {
            let state = seed;
            return function() {
                state = (state * 1103515245 + 12345) & 0x7fffffff;
                return state / 0x7fffffff;
            };
        }

        /**
         * Generate a loot drop
         * @param {Object} context - Drop context
         * @param {string} context.location - Location type
         * @param {string} context.enemyType - Enemy type that dropped loot
         * @param {number} context.playerLevel - Player level
         * @param {number} context.luck - Player luck stat
         * @param {number} context.quantity - Number of drops
         * @returns {Array} Generated loot items
         */
        generateLootDrop(context = {}) {
            const {
                location = 'corridor',
                enemyType = 'basic',
                playerLevel = 1,
                luck = this.luck,
                quantity = 1
            } = context;

            const drops = [];
            const locationMod = LOCATION_LOOT_MODIFIERS[location] || { quality: 0, quantity: 1 };
            const enemyMod = ENEMY_LOOT_MODIFIERS[enemyType] || { rareChance: 0, legendaryChance: 0 };

            for (let i = 0; i < Math.ceil(quantity * locationMod.quantity); i++) {
                const rarity = this._rollRarity(locationMod.quality, enemyMod, luck);
                const item = this._rollItem(rarity, context);
                const scaledItem = this._scaleItem(item, playerLevel);

                drops.push({
                    ...scaledItem,
                    rarity,
                    dropContext: {
                        location,
                        enemyType,
                        playerLevel,
                        luck,
                        seed: this.seed
                    },
                    droppedAt: Date.now()
                });

                this.dropHistory.push({
                    itemId: scaledItem.id,
                    rarity,
                    timestamp: Date.now()
                });
            }

            return drops;
        }

        /**
         * Roll for rarity tier
         * @param {number} qualityMod - Quality modifier from location
         * @param {Object} enemyMod - Enemy modifiers
         * @param {number} luck - Player luck
         * @returns {string} Rarity tier
         */
        _rollRarity(qualityMod, enemyMod, luck) {
            const roll = this.rng() * 100;

            // Calculate adjusted thresholds
            let legendaryThreshold = this.lootTables.legendary.weight + enemyMod.legendaryChance + (luck * 0.5) + (qualityMod * 2);
            let rareThreshold = legendaryThreshold + this.lootTables.rare.weight + enemyMod.rareChance + (luck * 0.3) + (qualityMod * 1.5);
            let uncommonThreshold = rareThreshold + this.lootTables.uncommon.weight + (qualityMod * 1);

            // Normalize to 100
            const total = legendaryThreshold + (rareThreshold - legendaryThreshold) + (uncommonThreshold - rareThreshold) + (100 - uncommonThreshold);
            legendaryThreshold = (legendaryThreshold / total) * 100;
            rareThreshold = (rareThreshold / total) * 100;
            uncommonThreshold = (uncommonThreshold / total) * 100;

            if (roll < legendaryThreshold) return 'legendary';
            if (roll < rareThreshold) return 'rare';
            if (roll < uncommonThreshold) return 'uncommon';
            return 'common';
        }

        /**
         * Roll for specific item within rarity tier
         * @param {string} rarity - Rarity tier
         * @param {Object} context - Context
         * @returns {Object} Selected item
         */
        _rollItem(rarity, context) {
            const table = this.lootTables[rarity];
            if (!table || table.items.length === 0) {
                return this.lootTables.common.items[0];
            }

            // Calculate total weight
            let totalWeight = 0;
            const weights = table.items.map(item => {
                const weight = item.weight || item.value || 1;
                totalWeight += weight;
                return weight;
            });

            // Weighted random selection
            let random = this.rng() * totalWeight;
            let selected = table.items[0];

            for (let i = 0; i < table.items.length; i++) {
                random -= weights[i];
                if (random <= 0) {
                    selected = table.items[i];
                    break;
                }
            }

            return { ...selected };
        }

        /**
         * Scale item based on player level
         * @param {Object} item - Item to scale
         * @param {number} playerLevel - Player level
         * @returns {Object} Scaled item
         */
        _scaleItem(item, playerLevel) {
            const scaled = { ...item };
            const scale = 1 + (playerLevel - 1) * 0.1; // 10% per level

            // Scale value
            scaled.value = Math.floor(item.value * scale);

            // Scale effects
            if (item.effect) {
                scaled.effect = { ...item.effect };
                for (const [key, value] of Object.entries(item.effect)) {
                    if (typeof value === 'number' && key !== 'duration') {
                        scaled.effect[key] = Math.floor(value * scale);
                    }
                }
            }

            // Add level requirement
            scaled.levelRequirement = Math.max(1, Math.floor(playerLevel * 0.8));

            return scaled;
        }

        /**
         * Generate loot for a chest or container
         * @param {Object} container - Container definition
         * @returns {Array} Loot items
         */
        generateContainerLoot(container) {
            const {
                type = 'chest',
                quality = 0,
                minItems = 1,
                maxItems = 4,
                guaranteedRarity = null
            } = container;

            const numItems = Math.floor(this.rng() * (maxItems - minItems + 1)) + minItems;
            const drops = [];

            for (let i = 0; i < numItems; i++) {
                // First item might be guaranteed rarity
                if (i === 0 && guaranteedRarity && this.rng() < 0.7) {
                    const item = this._rollItem(guaranteedRarity, container);
                    drops.push({
                        ...item,
                        rarity: guaranteedRarity,
                        guaranteed: true
                    });
                } else {
                    const rarity = this._rollRarity(quality, {}, 0);
                    const item = this._rollItem(rarity, container);
                    drops.push({
                        ...item,
                        rarity
                    });
                }
            }

            return drops;
        }

        /**
         * Generate shop inventory
         * @param {Object} shop - Shop definition
         * @param {number} playerLevel - Player level
         * @returns {Array} Shop items
         */
        generateShopInventory(shop, playerLevel) {
            const {
                type = 'general',
                tier = 'common',
                itemCount = 6
            } = shop;

            const inventory = [];
            const availableTiers = this._getAvailableTiers(tier);

            for (let i = 0; i < itemCount; i++) {
                const selectedTier = availableTiers[Math.floor(this.rng() * availableTiers.length)];
                const item = this._rollItem(selectedTier, shop);
                const scaledItem = this._scaleItem(item, playerLevel);

                // Add price markup
                scaledItem.price = Math.floor(scaledItem.value * (1 + this.rng() * 0.5));
                scaledItem.inStock = Math.floor(this.rng() * 5) + 1;

                inventory.push(scaledItem);
            }

            return inventory;
        }

        /**
         * Get available tiers based on shop tier
         * @param {string} tier - Shop tier
         * @returns {Array} Available rarity tiers
         */
        _getAvailableTiers(tier) {
            const tierAccess = {
                basic: ['common'],
                improved: ['common', 'uncommon'],
                advanced: ['common', 'uncommon', 'rare'],
                premium: ['common', 'uncommon', 'rare', 'legendary']
            };
            return tierAccess[tier] || ['common'];
        }

        /**
         * Generate reward for quest completion
         * @param {Object} quest - Completed quest
         * @param {string} performance - Performance rating (S, A, B, C, D)
         * @returns {Array} Reward items
         */
        generateQuestReward(quest, performance = 'B') {
            const performanceModifiers = {
                S: { quality: 3, quantity: 2 },
                A: { quality: 2, quantity: 1.5 },
                B: { quality: 1, quantity: 1 },
                C: { quality: 0, quantity: 0.75 },
                D: { quality: -1, quantity: 0.5 }
            };

            const mod = performanceModifiers[performance] || performanceModifiers.B;
            const drops = [];

            // Base reward
            const baseDrops = this.generateLootDrop({
                location: 'treasure',
                playerLevel: quest.playerLevel || 1,
                quantity: mod.quantity
            });
            drops.push(...baseDrops);

            // Bonus for high performance
            if (mod.quality >= 2 && this.rng() < 0.5) {
                const bonusRarity = mod.quality >= 3 ? 'legendary' : 'rare';
                const bonusItem = this._rollItem(bonusRarity, quest);
                drops.push({
                    ...bonusItem,
                    rarity: bonusRarity,
                    bonus: true,
                    reason: `Performance: ${performance}`
                });
            }

            return drops;
        }

        /**
         * Get loot statistics
         * @returns {Object} Loot stats
         */
        getStats() {
            const stats = {
                totalDrops: this.dropHistory.length,
                byRarity: { common: 0, uncommon: 0, rare: 0, legendary: 0 },
                recentDrops: this.dropHistory.slice(-10)
            };

            for (const drop of this.dropHistory) {
                stats.byRarity[drop.rarity]++;
            }

            return stats;
        }

        /**
         * Reset the loot generator with new seed
         * @param {number} seed - New seed
         */
        reset(seed) {
            this.seed = seed;
            this.rng = this._createRNG(seed);
            this.dropHistory = [];
        }

        /**
         * Set player progression
         * @param {number} progression - Progression value (0-1)
         */
        setPlayerProgression(progression) {
            this.playerProgression = Math.max(0, Math.min(1, progression));
        }

        /**
         * Set player luck
         * @param {number} luck - Luck value
         */
        setLuck(luck) {
            this.luck = luck;
        }
    }

    // Singleton instance
    let instance = null;

    /**
     * Get or create loot distribution instance
     * @param {Object} config - Configuration
     * @returns {LootDistribution} Instance
     */
    function getInstance(config) {
        if (!instance) {
            instance = new LootDistribution(config);
        }
        return instance;
    }

    // Public API
    return {
        LootDistribution,
        getInstance,
        DEFAULT_LOOT_TABLES,
        ENEMY_LOOT_MODIFIERS,
        LOCATION_LOOT_MODIFIERS,
        VERSION: '1.0.0'
    };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LootDistribution;
} else if (typeof window !== 'undefined') {
    window.LootDistribution = LootDistribution;
}
