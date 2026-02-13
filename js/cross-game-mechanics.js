/**
 * ScaryGamesAI — Cross-Game Mechanics System
 * Provides: Shared currency, universal skill trees, companion pets, cosmetic skins
 * Cross-game achievements, daily login bonuses
 */

var CrossGameMechanics = (function() {
    'use strict';

    // ============ CONFIGURATION ============
    var CONFIG = {
        STORAGE_KEY: 'sgai_cross_game',
        LOGIN_BONUS_STREAK_DAYS: 30,
        MAX_CURRENCY: 999999999
    };

    // ============ CURRENCY SYSTEM ============
    var CurrencySystem = {
        balances: {
            souls: 0,        // Free currency (earned through gameplay)
            bloodGems: 0     // Premium currency (purchased or rare drops)
        },

        init: function() {
            this.load();
        },

        load: function() {
            var data = localStorage.getItem(CONFIG.STORAGE_KEY + '_currency');
            if (data) {
                var parsed = JSON.parse(data);
                this.balances = {
                    souls: parsed.souls || 0,
                    bloodGems: parsed.bloodGems || 0
                };
            }
        },

        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_currency', JSON.stringify(this.balances));
        },

        getBalance: function(currency) {
            return this.balances[currency] || 0;
        },

        getAllBalances: function() {
            return { ...this.balances };
        },

        addCurrency: function(currency, amount, reason) {
            if (!this.balances.hasOwnProperty(currency)) return false;

            var actualAmount = Math.floor(amount);
            this.balances[currency] = Math.min(
                CONFIG.MAX_CURRENCY,
                this.balances[currency] + actualAmount
            );

            this.save();

            // Log transaction
            this.logTransaction({
                type: 'earn',
                currency: currency,
                amount: actualAmount,
                reason: reason || 'gameplay',
                timestamp: Date.now()
            });

            // Dispatch event
            document.dispatchEvent(new CustomEvent('currencyChanged', {
                detail: { currency: currency, amount: actualAmount, newBalance: this.balances[currency] }
            }));

            return true;
        },

        spendCurrency: function(currency, amount, reason) {
            if (!this.balances.hasOwnProperty(currency)) return false;

            var actualAmount = Math.floor(amount);
            if (this.balances[currency] < actualAmount) return false;

            this.balances[currency] -= actualAmount;
            this.save();

            // Log transaction
            this.logTransaction({
                type: 'spend',
                currency: currency,
                amount: actualAmount,
                reason: reason || 'purchase',
                timestamp: Date.now()
            });

            // Dispatch event
            document.dispatchEvent(new CustomEvent('currencyChanged', {
                detail: { currency: currency, amount: -actualAmount, newBalance: this.balances[currency] }
            }));

            return true;
        },

        canAfford: function(currency, amount) {
            return this.balances[currency] >= Math.floor(amount);
        },

        logTransaction: function(transaction) {
            var logs = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY + '_transactions') || '[]');
            logs.push(transaction);
            // Keep last 100 transactions
            if (logs.length > 100) logs = logs.slice(-100);
            localStorage.setItem(CONFIG.STORAGE_KEY + '_transactions', JSON.stringify(logs));
        },

        getTransactionHistory: function(limit) {
            var logs = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY + '_transactions') || '[]');
            return limit ? logs.slice(-limit) : logs;
        },

        // Currency earning rates per game
        calculateGameEarnings: function(gameId, sessionStats, isVictory) {
            var baseSouls = 10;
            var souls = baseSouls;

            // Time bonus (1 soul per minute)
            if (sessionStats.duration) {
                souls += Math.floor(sessionStats.duration / 60000);
            }

            // Score bonus
            if (sessionStats.metrics && sessionStats.metrics.score) {
                souls += Math.floor(sessionStats.metrics.score / 1000);
            }

            // Kill bonus
            if (sessionStats.metrics && sessionStats.metrics.kills) {
                souls += sessionStats.metrics.kills * 2;
            }

            // Victory bonus
            if (isVictory) {
                souls = Math.floor(souls * 1.5);
            }

            // Difficulty multiplier
            if (typeof GameUtils !== 'undefined') {
                var multiplier = GameUtils.getMultiplier();
                souls = Math.floor(souls * multiplier);
            }

            // Blood Gem chance (1% base, increased by performance)
            var bloodGems = 0;
            var bloodGemChance = 0.01;
            if (isVictory) bloodGemChance += 0.02;
            if (sessionStats.metrics && sessionStats.metrics.deaths === 0) bloodGemChance += 0.03;

            if (Math.random() < bloodGemChance) {
                bloodGems = 1;
            }

            return { souls: souls, bloodGems: bloodGems };
        }
    };

    // ============ UNIVERSAL SKILL TREE ============
    var SkillTree = {
        skills: {},
        skillPoints: 0,
        unlockedSkills: [],

        // Skill definitions
        skillDefinitions: {
            // Combat skills
            combat_power: {
                id: 'combat_power',
                name: 'Combat Power',
                description: 'Increase damage dealt by 5% per level',
                icon: '⚔️',
                category: 'combat',
                maxLevel: 10,
                cost: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                effect: function(level) { return { damageBonus: level * 0.05 }; }
            },
            critical_eye: {
                id: 'critical_eye',
                name: 'Critical Eye',
                description: 'Increase critical hit chance by 2% per level',
                icon: '👁️',
                category: 'combat',
                maxLevel: 10,
                cost: [2, 3, 4, 5, 6, 7, 8, 9, 10, 12],
                requires: ['combat_power_3'],
                effect: function(level) { return { critChance: level * 0.02 }; }
            },
            executioner: {
                id: 'executioner',
                name: 'Executioner',
                description: 'Deal 50% more damage to enemies below 25% health',
                icon: '🪓',
                category: 'combat',
                maxLevel: 5,
                cost: [3, 4, 5, 6, 8],
                requires: ['critical_eye_5'],
                effect: function(level) { return { executeBonus: level * 0.1 }; }
            },

            // Survival skills
            vitality: {
                id: 'vitality',
                name: 'Vitality',
                description: 'Increase max health by 10% per level',
                icon: '❤️',
                category: 'survival',
                maxLevel: 10,
                cost: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                effect: function(level) { return { healthBonus: level * 0.1 }; }
            },
            regeneration: {
                id: 'regeneration',
                name: 'Regeneration',
                description: 'Regenerate 1% health per 5 seconds',
                icon: '💚',
                category: 'survival',
                maxLevel: 5,
                cost: [2, 3, 4, 5, 6],
                requires: ['vitality_3'],
                effect: function(level) { return { regenRate: level * 0.01 }; }
            },
            last_stand: {
                id: 'last_stand',
                name: 'Last Stand',
                description: 'Survive a killing blow once per game with 1 HP',
                icon: '🛡️',
                category: 'survival',
                maxLevel: 3,
                cost: [5, 7, 10],
                requires: ['vitality_5', 'regeneration_3'],
                effect: function(level) { return { lastStandCharges: level }; }
            },

            // Exploration skills
            treasure_hunter: {
                id: 'treasure_hunter',
                name: 'Treasure Hunter',
                description: 'Find 10% more items per level',
                icon: '💎',
                category: 'exploration',
                maxLevel: 5,
                cost: [1, 2, 3, 4, 5],
                effect: function(level) { return { itemFindBonus: level * 0.1 }; }
            },
            speed_demon: {
                id: 'speed_demon',
                name: 'Speed Demon',
                description: 'Move 5% faster per level',
                icon: '💨',
                category: 'exploration',
                maxLevel: 5,
                cost: [2, 3, 4, 5, 6],
                effect: function(level) { return { speedBonus: level * 0.05 }; }
            },
            sixth_sense: {
                id: 'sixth_sense',
                name: 'Sixth Sense',
                description: 'Detect secrets and traps within range',
                icon: '🔮',
                category: 'exploration',
                maxLevel: 3,
                cost: [3, 5, 8],
                requires: ['treasure_hunter_3'],
                effect: function(level) { return { senseRange: level * 50 }; }
            },

            // Horror skills
            fear_resistance: {
                id: 'fear_resistance',
                name: 'Fear Resistance',
                description: 'Reduce sanity drain by 10% per level',
                icon: '🧠',
                category: 'horror',
                maxLevel: 5,
                cost: [2, 3, 4, 5, 6],
                effect: function(level) { return { sanityDrainReduction: level * 0.1 }; }
            },
            jumpscare_armor: {
                id: 'jumpscare_armor',
                name: 'Jumpscare Armor',
                description: 'Reduce jumpscare effect duration by 20% per level',
                icon: '😱',
                category: 'horror',
                maxLevel: 3,
                cost: [3, 5, 8],
                requires: ['fear_resistance_3'],
                effect: function(level) { return { jumpscareReduction: level * 0.2 }; }
            },
            monster_hunter: {
                id: 'monster_hunter',
                name: 'Monster Hunter',
                description: 'Deal 15% more damage to horror creatures',
                icon: '👹',
                category: 'horror',
                maxLevel: 5,
                cost: [3, 4, 5, 6, 8],
                requires: ['fear_resistance_2'],
                effect: function(level) { return { monsterDamage: level * 0.15 }; }
            },

            // Utility skills
            lucky_star: {
                id: 'lucky_star',
                name: 'Lucky Star',
                description: 'Increase rare drop chance by 5% per level',
                icon: '⭐',
                category: 'utility',
                maxLevel: 5,
                cost: [2, 3, 4, 5, 6],
                effect: function(level) { return { luckBonus: level * 0.05 }; }
            },
            soul_magnet: {
                id: 'soul_magnet',
                name: 'Soul Magnet',
                description: 'Earn 10% more souls per game',
                icon: '👻',
                category: 'utility',
                maxLevel: 5,
                cost: [3, 4, 5, 6, 7],
                effect: function(level) { return { soulBonus: level * 0.1 }; }
            },
            xp_boost: {
                id: 'xp_boost',
                name: 'XP Boost',
                description: 'Earn 15% more experience per game',
                icon: '📈',
                category: 'utility',
                maxLevel: 5,
                cost: [2, 3, 4, 5, 6],
                effect: function(level) { return { xpBonus: level * 0.15 }; }
            }
        },

        init: function() {
            this.load();
        },

        load: function() {
            var data = localStorage.getItem(CONFIG.STORAGE_KEY + '_skills');
            if (data) {
                var parsed = JSON.parse(data);
                this.skillPoints = parsed.skillPoints || 0;
                this.skills = parsed.skills || {};
                this.unlockedSkills = parsed.unlockedSkills || [];
            }
        },

        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_skills', JSON.stringify({
                skillPoints: this.skillPoints,
                skills: this.skills,
                unlockedSkills: this.unlockedSkills
            }));
        },

        getSkillPoints: function() {
            return this.skillPoints;
        },

        addSkillPoints: function(amount) {
            this.skillPoints += amount;
            this.save();
            document.dispatchEvent(new CustomEvent('skillPointsChanged', {
                detail: { amount: amount, total: this.skillPoints }
            }));
        },

        getSkillLevel: function(skillId) {
            return this.skills[skillId] || 0;
        },

        canUnlockSkill: function(skillId) {
            var def = this.skillDefinitions[skillId];
            if (!def) return false;

            var currentLevel = this.getSkillLevel(skillId);
            if (currentLevel >= def.maxLevel) return false;

            var cost = def.cost[currentLevel];
            if (this.skillPoints < cost) return false;

            // Check requirements
            if (def.requires) {
                for (var i = 0; i < def.requires.length; i++) {
                    var req = def.requires[i];
                    var parts = req.split('_');
                    var reqLevel = parseInt(parts.pop());
                    var reqId = parts.join('_');
                    if (this.getSkillLevel(reqId) < reqLevel) return false;
                }
            }

            return true;
        },

        unlockSkill: function(skillId) {
            if (!this.canUnlockSkill(skillId)) return false;

            var def = this.skillDefinitions[skillId];
            var currentLevel = this.getSkillLevel(skillId);
            var cost = def.cost[currentLevel];

            this.skillPoints -= cost;
            this.skills[skillId] = currentLevel + 1;

            if (this.skills[skillId] === 1) {
                this.unlockedSkills.push(skillId);
            }

            this.save();

            document.dispatchEvent(new CustomEvent('skillUnlocked', {
                detail: { skillId: skillId, level: this.skills[skillId] }
            }));

            return true;
        },

        getActiveEffects: function() {
            var effects = {};

            this.unlockedSkills.forEach(function(skillId) {
                var level = this.getSkillLevel(skillId);
                var def = this.skillDefinitions[skillId];
                if (def && def.effect) {
                    var skillEffects = def.effect(level);
                    for (var key in skillEffects) {
                        if (effects[key]) {
                            effects[key] += skillEffects[key];
                        } else {
                            effects[key] = skillEffects[key];
                        }
                    }
                }
            }.bind(this));

            return effects;
        },

        getSkillsByCategory: function() {
            var categories = {
                combat: [],
                survival: [],
                exploration: [],
                horror: [],
                utility: []
            };

            for (var id in this.skillDefinitions) {
                var def = this.skillDefinitions[id];
                def.currentLevel = this.getSkillLevel(id);
                def.canUnlock = this.canUnlockSkill(id);
                categories[def.category].push(def);
            }

            return categories;
        },

        getTotalLevel: function() {
            var total = 0;
            for (var id in this.skills) {
                total += this.skills[id];
            }
            return total;
        }
    };

    // ============ COMPANION PETS ============
    var CompanionSystem = {
        ownedPets: [],
        activePet: null,
        petStats: {},

        // Pet definitions
        petDefinitions: {
            ghost_puppy: {
                id: 'ghost_puppy',
                name: 'Ghost Puppy',
                description: 'A playful spirit companion that finds items',
                icon: '🐕',
                rarity: 'common',
                abilities: ['item_finder'],
                baseStats: { findRange: 30, findChance: 0.05 },
                obtainMethod: 'default',
                games: 'all'
            },
            shadow_cat: {
                id: 'shadow_cat',
                name: 'Shadow Cat',
                description: 'Moves through darkness, reveals hidden paths',
                icon: '🐈‍⬛',
                rarity: 'uncommon',
                abilities: ['dark_vision', 'path_revealer'],
                baseStats: { visionRange: 50, pathRevealChance: 0.1 },
                obtainMethod: 'achievement',
                obtainRequirement: 'explorer',
                games: 'all'
            },
            raven: {
                id: 'raven',
                name: 'Spectral Raven',
                description: 'Scouts ahead and warns of dangers',
                icon: '🐦‍⬛',
                rarity: 'rare',
                abilities: ['scout', 'danger_warning'],
                baseStats: { scoutRange: 100, warningTime: 2000 },
                obtainMethod: 'store',
                price: { souls: 5000 },
                games: 'all'
            },
            mini_reaper: {
                id: 'mini_reaper',
                name: 'Mini Reaper',
                description: 'Collects souls from defeated enemies',
                icon: '💀',
                rarity: 'epic',
                abilities: ['soul_collector', 'death_aura'],
                baseStats: { soulBonus: 0.1, auraRange: 20 },
                obtainMethod: 'achievement',
                obtainRequirement: 'serial_killer',
                games: 'all'
            },
            phoenix_chick: {
                id: 'phoenix_chick',
                name: 'Phoenix Chick',
                description: 'Revives you once per game',
                icon: '🔥',
                rarity: 'legendary',
                abilities: ['revival', 'fire_aura'],
                baseStats: { reviveHealth: 0.5, auraDamage: 5 },
                obtainMethod: 'store',
                price: { bloodGems: 100 },
                games: 'all'
            },
            eldritch_horror: {
                id: 'eldritch_horror',
                name: 'Eldritch Horror',
                description: 'Terrifies enemies, reducing their aggression',
                icon: '🐙',
                rarity: 'mythic',
                abilities: ['fear_aura', 'madness_touch'],
                baseStats: { fearRange: 40, aggroReduction: 0.3 },
                obtainMethod: 'achievement',
                obtainRequirement: 'mass_murderer',
                games: 'all'
            },
            cursed_doll: {
                id: 'cursed_doll',
                name: 'Cursed Doll',
                description: 'Absorbs damage for you',
                icon: '🎎',
                rarity: 'rare',
                abilities: ['damage_absorb', 'curse_reflect'],
                baseStats: { absorbPercent: 0.15, reflectChance: 0.1 },
                obtainMethod: 'store',
                price: { souls: 10000 },
                games: 'all'
            },
            bat_colony: {
                id: 'bat_colony',
                name: 'Bat Colony',
                description: 'Distracts enemies and provides aerial vision',
                icon: '🦇',
                rarity: 'uncommon',
                abilities: ['distraction', 'aerial_view'],
                baseStats: { distractDuration: 3000, viewRange: 80 },
                obtainMethod: 'achievement',
                obtainRequirement: 'night_owl',
                games: 'all'
            }
        },

        init: function() {
            this.load();

            // Give ghost puppy to new players
            if (this.ownedPets.length === 0) {
                this.grantPet('ghost_puppy', 'starter');
            }
        },

        load: function() {
            var data = localStorage.getItem(CONFIG.STORAGE_KEY + '_pets');
            if (data) {
                var parsed = JSON.parse(data);
                this.ownedPets = parsed.owned || [];
                this.activePet = parsed.active || null;
                this.petStats = parsed.stats || {};
            }
        },

        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_pets', JSON.stringify({
                owned: this.ownedPets,
                active: this.activePet,
                stats: this.petStats
            }));
        },

        getPetDefinition: function(petId) {
            return this.petDefinitions[petId];
        },

        ownsPet: function(petId) {
            return this.ownedPets.includes(petId);
        },

        grantPet: function(petId, reason) {
            if (this.ownsPet(petId)) return false;

            this.ownedPets.push(petId);
            this.petStats[petId] = {
                obtainedAt: Date.now(),
                obtainedReason: reason || 'unknown',
                level: 1,
                experience: 0,
                gamesPlayed: 0
            };

            this.save();

            // Auto-equip if first pet
            if (this.ownedPets.length === 1) {
                this.equipPet(petId);
            }

            document.dispatchEvent(new CustomEvent('petObtained', {
                detail: { petId: petId, definition: this.petDefinitions[petId] }
            }));

            return true;
        },

        equipPet: function(petId) {
            if (!this.ownsPet(petId)) return false;

            this.activePet = petId;
            this.save();

            document.dispatchEvent(new CustomEvent('petEquipped', {
                detail: { petId: petId, definition: this.petDefinitions[petId] }
            }));

            return true;
        },

        unequipPet: function() {
            this.activePet = null;
            this.save();
        },

        getActivePet: function() {
            if (!this.activePet) return null;
            return {
                definition: this.petDefinitions[this.activePet],
                stats: this.petStats[this.activePet]
            };
        },

        getPetAbilities: function() {
            var pet = this.getActivePet();
            if (!pet) return {};

            var abilities = {};
            var def = pet.definition;
            var stats = pet.stats;

            def.abilities.forEach(function(ability) {
                switch(ability) {
                    case 'item_finder':
                        abilities.findItems = def.baseStats.findRange;
                        abilities.findChance = def.baseStats.findChance * (1 + (stats.level - 1) * 0.1);
                        break;
                    case 'dark_vision':
                        abilities.darkVision = def.baseStats.visionRange;
                        break;
                    case 'soul_collector':
                        abilities.soulBonus = def.baseStats.soulBonus * stats.level;
                        break;
                    case 'revival':
                        abilities.canRevive = true;
                        abilities.reviveHealth = def.baseStats.reviveHealth;
                        break;
                    case 'fear_aura':
                        abilities.fearRange = def.baseStats.fearRange;
                        abilities.aggroReduction = def.baseStats.aggroReduction;
                        break;
                    case 'damage_absorb':
                        abilities.damageAbsorb = def.baseStats.absorbPercent;
                        abilities.reflectChance = def.baseStats.reflectChance;
                        break;
                }
            });

            return abilities;
        },

        addPetExperience: function(amount) {
            if (!this.activePet) return;

            var stats = this.petStats[this.activePet];
            stats.experience += amount;
            stats.gamesPlayed++;

            // Level up check
            var xpNeeded = stats.level * 100;
            while (stats.experience >= xpNeeded && stats.level < 10) {
                stats.experience -= xpNeeded;
                stats.level++;
                xpNeeded = stats.level * 100;

                document.dispatchEvent(new CustomEvent('petLevelUp', {
                    detail: { petId: this.activePet, level: stats.level }
                }));
            }

            this.save();
        },

        getAllPets: function() {
            return Object.keys(this.petDefinitions).map(function(id) {
                return {
                    ...this.petDefinitions[id],
                    owned: this.ownsPet(id),
                    stats: this.petStats[id] || null
                };
            }.bind(this));
        }
    };

    // ============ COSMETIC SKINS ============
    var SkinSystem = {
        ownedSkins: [],
        equippedSkins: {},
        skinCollection: {},

        // Skin definitions by category
        skinCategories: {
            player: {
                name: 'Player Skins',
                skins: {
                    default: { id: 'default', name: 'Default', icon: '👤', rarity: 'common', effects: {} },
                    ghost: { id: 'ghost', name: 'Ghost', icon: '👻', rarity: 'uncommon', effects: { transparency: 0.3 } },
                    demon: { id: 'demon', name: 'Demon', icon: '😈', rarity: 'rare', effects: { trail: 'fire' } },
                    skeleton: { id: 'skeleton', name: 'Skeleton', icon: '💀', rarity: 'uncommon', effects: { glow: '#ffffff' } },
                    vampire: { id: 'vampire', name: 'Vampire', icon: '🧛', rarity: 'rare', effects: { trail: 'blood' } },
                    werewolf: { id: 'werewolf', name: 'Werewolf', icon: '🐺', rarity: 'epic', effects: { size: 1.2 } },
                    reaper: { id: 'reaper', name: 'Grim Reaper', icon: '☠️', rarity: 'legendary', effects: { aura: 'death', trail: 'souls' } },
                    elder_god: { id: 'elder_god', name: 'Elder God', icon: '🐙', rarity: 'mythic', effects: { aura: 'eldritch', particles: 'tentacles' } }
                }
            },
            trail: {
                name: 'Trails',
                skins: {
                    none: { id: 'none', name: 'None', icon: '—', rarity: 'common', effects: {} },
                    blood: { id: 'blood', name: 'Blood Trail', icon: '🩸', rarity: 'uncommon', effects: { color: '#cc1122' } },
                    fire: { id: 'fire', name: 'Fire Trail', icon: '🔥', rarity: 'rare', effects: { color: '#ff4400', particles: true } },
                    ice: { id: 'ice', name: 'Ice Trail', icon: '❄️', rarity: 'rare', effects: { color: '#00ccff' } },
                    electricity: { id: 'electricity', name: 'Electric Trail', icon: '⚡', rarity: 'epic', effects: { color: '#ffff00', arc: true } },
                    souls: { id: 'souls', name: 'Soul Trail', icon: '👻', rarity: 'legendary', effects: { color: '#8b5cf6', ghosts: true } },
                    void: { id: 'void', name: 'Void Trail', icon: '🕳️', rarity: 'mythic', effects: { color: '#1a0033', distortion: true } }
                }
            },
            death_effect: {
                name: 'Death Effects',
                skins: {
                    default: { id: 'default', name: 'Default', icon: '💀', rarity: 'common', effects: {} },
                    explosion: { id: 'explosion', name: 'Explosion', icon: '💥', rarity: 'uncommon', effects: { particles: 20 } },
                    dissolve: { id: 'dissolve', name: 'Dissolve', icon: '💨', rarity: 'rare', effects: { dissolve: true } },
                    lightning: { id: 'lightning', name: 'Lightning Strike', icon: '⚡', rarity: 'epic', effects: { lightning: true } },
                    black_hole: { id: 'black_hole', name: 'Black Hole', icon: '🕳️', rarity: 'legendary', effects: { blackHole: true } }
                }
            },
            aura: {
                name: 'Auras',
                skins: {
                    none: { id: 'none', name: 'None', icon: '—', rarity: 'common', effects: {} },
                    red: { id: 'red', name: 'Blood Aura', icon: '🔴', rarity: 'uncommon', effects: { color: '#cc1122', radius: 30 } },
                    green: { id: 'green', name: 'Toxic Aura', icon: '🟢', rarity: 'uncommon', effects: { color: '#00ff88', radius: 30 } },
                    purple: { id: 'purple', name: 'Mystic Aura', icon: '🟣', rarity: 'rare', effects: { color: '#8b5cf6', radius: 40 } },
                    rainbow: { id: 'rainbow', name: 'Rainbow Aura', icon: '🌈', rarity: 'epic', effects: { rainbow: true, radius: 50 } },
                    cosmic: { id: 'cosmic', name: 'Cosmic Aura', icon: '🌌', rarity: 'legendary', effects: { cosmic: true, radius: 60, stars: true } }
                }
            },
            frame: {
                name: 'Profile Frames',
                skins: {
                    default: { id: 'default', name: 'Default', icon: '⬜', rarity: 'common', effects: {} },
                    bronze: { id: 'bronze', name: 'Bronze Frame', icon: '🥉', rarity: 'uncommon', effects: { border: '#cd7f32' } },
                    silver: { id: 'silver', name: 'Silver Frame', icon: '🥈', rarity: 'rare', effects: { border: '#c0c0c0' } },
                    gold: { id: 'gold', name: 'Gold Frame', icon: '🥇', rarity: 'epic', effects: { border: '#ffd700', shine: true } },
                    diamond: { id: 'diamond', name: 'Diamond Frame', icon: '💎', rarity: 'legendary', effects: { border: '#00ffff', sparkle: true } },
                    elder: { id: 'elder', name: 'Elder Frame', icon: '👁️', rarity: 'mythic', effects: { border: '#8b5cf6', animated: true, eye: true } }
                }
            }
        },

        init: function() {
            this.load();

            // Grant default skins
            Object.keys(this.skinCategories).forEach(function(category) {
                var defaultSkin = this.skinCategories[category].skins.default;
                if (defaultSkin && !this.ownsSkin(category, 'default')) {
                    this.grantSkin(category, 'default', 'default');
                }
            }.bind(this));
        },

        load: function() {
            var data = localStorage.getItem(CONFIG.STORAGE_KEY + '_skins');
            if (data) {
                var parsed = JSON.parse(data);
                this.ownedSkins = parsed.owned || [];
                this.equippedSkins = parsed.equipped || {};
                this.skinCollection = parsed.collection || {};
            }
        },

        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_skins', JSON.stringify({
                owned: this.ownedSkins,
                equipped: this.equippedSkins,
                collection: this.skinCollection
            }));
        },

        ownsSkin: function(category, skinId) {
            return this.ownedSkins.includes(category + '_' + skinId);
        },

        grantSkin: function(category, skinId, reason) {
            var key = category + '_' + skinId;
            if (this.ownsSkin(category, skinId)) return false;

            this.ownedSkins.push(key);
            this.skinCollection[key] = {
                obtainedAt: Date.now(),
                obtainedReason: reason || 'unknown'
            };

            this.save();

            document.dispatchEvent(new CustomEvent('skinObtained', {
                detail: { category: category, skinId: skinId }
            }));

            return true;
        },

        equipSkin: function(category, skinId) {
            if (!this.ownsSkin(category, skinId)) return false;

            this.equippedSkins[category] = skinId;
            this.save();

            document.dispatchEvent(new CustomEvent('skinEquipped', {
                detail: { category: category, skinId: skinId }
            }));

            return true;
        },

        getEquippedSkin: function(category) {
            var skinId = this.equippedSkins[category] || 'default';
            var categoryData = this.skinCategories[category];
            if (!categoryData) return null;

            return {
                ...categoryData.skins[skinId],
                category: category
            };
        },

        getEquippedEffects: function() {
            var effects = {};

            Object.keys(this.skinCategories).forEach(function(category) {
                var skin = this.getEquippedSkin(category);
                if (skin && skin.effects) {
                    for (var key in skin.effects) {
                        effects[key] = skin.effects[key];
                    }
                }
            }.bind(this));

            return effects;
        },

        getAllSkins: function() {
            var result = {};

            Object.keys(this.skinCategories).forEach(function(category) {
                result[category] = {
                    name: this.skinCategories[category].name,
                    skins: Object.keys(this.skinCategories[category].skins).map(function(skinId) {
                        return {
                            ...this.skinCategories[category].skins[skinId],
                            owned: this.ownsSkin(category, skinId),
                            equipped: this.equippedSkins[category] === skinId
                        };
                    }.bind(this))
                };
            }.bind(this));

            return result;
        }
    };

    // ============ DAILY LOGIN BONUS ============
    var LoginBonus = {
        lastLogin: null,
        currentStreak: 0,
        todayClaimed: false,
        rewards: [],

        // 30-day reward calendar
        rewardCalendar: [
            { day: 1, souls: 50, bloodGems: 0, items: [] },
            { day: 2, souls: 75, bloodGems: 0, items: [] },
            { day: 3, souls: 100, bloodGems: 0, items: ['ghost_puppy_xp_boost'] },
            { day: 4, souls: 125, bloodGems: 0, items: [] },
            { day: 5, souls: 150, bloodGems: 0, items: ['lootbox_common'] },
            { day: 6, souls: 175, bloodGems: 0, items: [] },
            { day: 7, souls: 250, bloodGems: 5, items: ['skill_point'] },
            { day: 8, souls: 200, bloodGems: 0, items: [] },
            { day: 9, souls: 225, bloodGems: 0, items: [] },
            { day: 10, souls: 250, bloodGems: 0, items: ['lootbox_uncommon'] },
            { day: 11, souls: 275, bloodGems: 0, items: [] },
            { day: 12, souls: 300, bloodGems: 0, items: [] },
            { day: 13, souls: 325, bloodGems: 0, items: [] },
            { day: 14, souls: 500, bloodGems: 10, items: ['skill_point', 'pet_xp_boost'] },
            { day: 15, souls: 400, bloodGems: 0, items: ['lootbox_rare'] },
            { day: 16, souls: 425, bloodGems: 0, items: [] },
            { day: 17, souls: 450, bloodGems: 0, items: [] },
            { day: 18, souls: 475, bloodGems: 0, items: [] },
            { day: 19, souls: 500, bloodGems: 0, items: [] },
            { day: 20, souls: 525, bloodGems: 0, items: ['lootbox_rare'] },
            { day: 21, souls: 600, bloodGems: 15, items: ['skill_point'] },
            { day: 22, souls: 550, bloodGems: 0, items: [] },
            { day: 23, souls: 575, bloodGems: 0, items: [] },
            { day: 24, souls: 600, bloodGems: 0, items: [] },
            { day: 25, souls: 650, bloodGems: 0, items: ['lootbox_epic'] },
            { day: 26, souls: 700, bloodGems: 0, items: [] },
            { day: 27, souls: 750, bloodGems: 0, items: [] },
            { day: 28, souls: 800, bloodGems: 0, items: [] },
            { day: 29, souls: 900, bloodGems: 20, items: ['skill_point', 'pet_xp_boost'] },
            { day: 30, souls: 1000, bloodGems: 50, items: ['lootbox_legendary', 'pet_phoenix_chick'] }
        ],

        init: function() {
            this.load();
            this.checkNewDay();
        },

        load: function() {
            var data = localStorage.getItem(CONFIG.STORAGE_KEY + '_login');
            if (data) {
                var parsed = JSON.parse(data);
                this.lastLogin = parsed.lastLogin ? new Date(parsed.lastLogin) : null;
                this.currentStreak = parsed.streak || 0;
                this.todayClaimed = parsed.todayClaimed || false;
                this.rewards = parsed.rewards || [];
            }
        },

        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_login', JSON.stringify({
                lastLogin: this.lastLogin ? this.lastLogin.toISOString() : null,
                streak: this.currentStreak,
                todayClaimed: this.todayClaimed,
                rewards: this.rewards
            }));
        },

        checkNewDay: function() {
            var today = new Date();
            today.setHours(0, 0, 0, 0);

            if (!this.lastLogin) {
                // First login ever
                this.currentStreak = 1;
                this.todayClaimed = false;
                this.lastLogin = today;
                this.save();
                return;
            }

            var lastLoginDay = new Date(this.lastLogin);
            lastLoginDay.setHours(0, 0, 0, 0);

            var diffDays = Math.floor((today - lastLoginDay) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                // Same day, no change
                return;
            } else if (diffDays === 1) {
                // Consecutive day
                this.currentStreak++;
                if (this.currentStreak > 30) this.currentStreak = 1;
            } else {
                // Streak broken
                this.currentStreak = 1;
            }

            this.todayClaimed = false;
            this.lastLogin = today;
            this.save();
        },

        canClaimToday: function() {
            return !this.todayClaimed;
        },

        getTodayReward: function() {
            return this.rewardCalendar[this.currentStreak - 1] || this.rewardCalendar[0];
        },

        claimTodayReward: function() {
            if (this.todayClaimed) return null;

            var reward = this.getTodayReward();

            // Grant currencies
            if (reward.souls > 0) {
                CurrencySystem.addCurrency('souls', reward.souls, 'daily_login');
            }
            if (reward.bloodGems > 0) {
                CurrencySystem.addCurrency('bloodGems', reward.bloodGems, 'daily_login');
            }

            // Grant items
            reward.items.forEach(function(item) {
                this.grantItem(item);
            }.bind(this));

            this.todayClaimed = true;
            this.rewards.push({
                day: this.currentStreak,
                date: new Date().toISOString(),
                reward: reward
            });

            this.save();

            document.dispatchEvent(new CustomEvent('loginRewardClaimed', {
                detail: { day: this.currentStreak, reward: reward }
            }));

            return reward;
        },

        grantItem: function(itemId) {
            // Parse item ID and grant appropriately
            if (itemId === 'skill_point') {
                SkillTree.addSkillPoints(1);
            } else if (itemId === 'pet_xp_boost') {
                CompanionSystem.addPetExperience(100);
            } else if (itemId.startsWith('pet_')) {
                var petId = itemId.substring(4);
                CompanionSystem.grantPet(petId, 'login_bonus');
            }
            // Lootboxes would be handled by store system
        },

        getStreakInfo: function() {
            return {
                currentStreak: this.currentStreak,
                todayClaimed: this.todayClaimed,
                canClaim: this.canClaimToday(),
                todayReward: this.getTodayReward(),
                nextReward: this.rewardCalendar[this.currentStreak] || null
            };
        }
    };

    // ============ CROSS-GAME ACHIEVEMENTS ============
    var CrossGameAchievements = {
        achievements: {},

        crossGameAchievements: [
            {
                id: 'master_of_all',
                name: 'Master of All',
                description: 'Win at least one game in every genre',
                icon: '🏆',
                requirement: { genres: ['horror-chase', 'dungeon-crawler', 'underwater-horror', 'survival-sandbox', 'fnaf-style', 'exploration', 'open-world', 'endless-runner', 'puzzle', 'escape-room', 'tower-defense', 'strategy-td', 'psychological-horror', 'stealth-horror', 'spider-horror', 'strategy-battle'] },
                reward: { souls: 10000, bloodGems: 50 }
            },
            {
                id: 'dedicated_survivor',
                name: 'Dedicated Survivor',
                description: 'Play the same game 100 times',
                icon: '🎯',
                requirement: { type: 'game_sessions', game: 'any', value: 100 },
                reward: { souls: 5000, bloodGems: 25 }
            },
            {
                id: 'fearless',
                name: 'Fearless',
                description: 'Complete a game on Nightmare difficulty without dying',
                icon: '😤',
                requirement: { type: 'nightmare_no_death' },
                reward: { souls: 10000, bloodGems: 100 }
            },
            {
                id: 'speed_demon_all',
                name: 'Ultimate Speed Demon',
                description: 'Beat all games with speedrun times',
                icon: '⚡',
                requirement: { type: 'all_speedruns' },
                reward: { souls: 25000, bloodGems: 200 }
            }
        ],

        init: function() {
            this.load();
        },

        load: function() {
            var data = localStorage.getItem(CONFIG.STORAGE_KEY + '_cross_achievements');
            if (data) {
                this.achievements = JSON.parse(data);
            }
        },

        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_cross_achievements', JSON.stringify(this.achievements));
        },

        checkAchievements: function() {
            // Check cross-game achievements
            // Implementation would analyze all game stats
        },

        unlockAchievement: function(achievementId) {
            if (this.achievements[achievementId]) return;

            var achievement = this.crossGameAchievements.find(function(a) { return a.id === achievementId; });
            if (!achievement) return;

            this.achievements[achievementId] = {
                unlockedAt: Date.now()
            };

            this.save();

            // Grant rewards
            if (achievement.reward.souls) {
                CurrencySystem.addCurrency('souls', achievement.reward.souls, 'cross_achievement');
            }
            if (achievement.reward.bloodGems) {
                CurrencySystem.addCurrency('bloodGems', achievement.reward.bloodGems, 'cross_achievement');
            }
        }
    };

    // ============ INJECT STYLES ============
    function injectStyles() {
        if (document.getElementById('cgm-injected-styles')) return;

        var style = document.createElement('style');
        style.id = 'cgm-injected-styles';
        style.textContent = [
            // Currency Display
            '.cgm-currency-display{display:flex;gap:16px;align-items:center;padding:8px 16px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid rgba(255,255,255,0.1);}',
            '.cgm-currency-item{display:flex;align-items:center;gap:6px;}',
            '.cgm-currency-icon{font-size:1.2em;}',
            '.cgm-currency-value{font-weight:600;color:#fff;font-family:Inter,sans-serif;}',
            '.cgm-currency-value.souls{color:#00ff88;}',
            '.cgm-currency-value.bloodGems{color:#ff4444;}',

            // Skill Tree UI
            '.cgm-skill-tree{padding:24px;background:rgba(0,0,0,0.8);border-radius:16px;border:1px solid rgba(255,255,255,0.1);}',
            '.cgm-skill-category{margin-bottom:24px;}',
            '.cgm-skill-category-title{font-family:Creepster,cursive;font-size:1.5rem;color:#cc1122;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;}',
            '.cgm-skill-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}',
            '.cgm-skill-card{padding:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;cursor:pointer;transition:all 0.2s;}',
            '.cgm-skill-card:hover{background:rgba(255,255,255,0.1);transform:translateY(-2px);}',
            '.cgm-skill-card.unlocked{border-color:#00ff88;box-shadow:0 0 20px rgba(0,255,136,0.2);}',
            '.cgm-skill-card.locked{opacity:0.5;cursor:not-allowed;}',
            '.cgm-skill-icon{font-size:2rem;margin-bottom:8px;}',
            '.cgm-skill-name{font-weight:600;color:#fff;margin-bottom:4px;}',
            '.cgm-skill-level{font-size:0.8rem;color:#888;}',
            '.cgm-skill-desc{font-size:0.85rem;color:#aaa;margin-top:8px;}',

            // Pet UI
            '.cgm-pet-display{position:fixed;bottom:20px;right:20px;padding:12px 16px;background:rgba(0,0,0,0.8);border-radius:12px;border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:12px;z-index:1000;}',
            '.cgm-pet-icon{font-size:2rem;animation:cgm-pet-bounce 2s ease-in-out infinite;}',
            '@keyframes cgm-pet-bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}',
            '.cgm-pet-info{display:flex;flex-direction:column;}',
            '.cgm-pet-name{font-weight:600;color:#fff;font-size:0.9rem;}',
            '.cgm-pet-level{font-size:0.75rem;color:#888;}',
            '.cgm-pet-xp-bar{width:60px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;margin-top:4px;}',
            '.cgm-pet-xp-fill{height:100%;background:linear-gradient(90deg,#00ff88,#00cc66);transition:width 0.3s;}',

            // Login Bonus UI
            '.cgm-login-bonus{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,rgba(20,20,30,0.98),rgba(10,10,20,0.98));padding:32px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);z-index:10000;min-width:400px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);}',
            '.cgm-login-title{font-family:Creepster,cursive;font-size:2rem;color:#cc1122;margin-bottom:8px;}',
            '.cgm-login-streak{font-size:1rem;color:#888;margin-bottom:20px;}',
            '.cgm-login-streak span{color:#00ff88;font-weight:600;}',
            '.cgm-login-reward{display:flex;justify-content:center;gap:24px;margin-bottom:24px;padding:20px;background:rgba(255,255,255,0.05);border-radius:12px;}',
            '.cgm-login-reward-item{display:flex;flex-direction:column;align-items:center;gap:4px;}',
            '.cgm-login-reward-icon{font-size:2rem;}',
            '.cgm-login-reward-value{font-weight:600;color:#fff;}',
            '.cgm-login-reward-label{font-size:0.75rem;color:#888;}',
            '.cgm-login-claim-btn{padding:14px 40px;background:linear-gradient(135deg,#cc1122,#991122);border:none;border-radius:10px;color:#fff;font-weight:600;font-size:1rem;cursor:pointer;transition:all 0.2s;}',
            '.cgm-login-claim-btn:hover{transform:scale(1.05);box-shadow:0 0 30px rgba(204,17,34,0.5);}',
            '.cgm-login-claim-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}'
        ].join('\n');
        document.head.appendChild(style);
    }

    // ============ PUBLIC API ============
    return {
        // Initialization
        init: function() {
            injectStyles();
            CurrencySystem.init();
            SkillTree.init();
            CompanionSystem.init();
            SkinSystem.init();
            LoginBonus.init();
            CrossGameAchievements.init();
        },

        // Currency
        currency: {
            getBalance: CurrencySystem.getBalance.bind(CurrencySystem),
            getAllBalances: CurrencySystem.getAllBalances.bind(CurrencySystem),
            add: CurrencySystem.addCurrency.bind(CurrencySystem),
            spend: CurrencySystem.spendCurrency.bind(CurrencySystem),
            canAfford: CurrencySystem.canAfford.bind(CurrencySystem),
            calculateEarnings: CurrencySystem.calculateGameEarnings.bind(CurrencySystem)
        },

        // Skills
        skills: {
            getPoints: SkillTree.getSkillPoints.bind(SkillTree),
            addPoints: SkillTree.addSkillPoints.bind(SkillTree),
            getLevel: SkillTree.getSkillLevel.bind(SkillTree),
            canUnlock: SkillTree.canUnlockSkill.bind(SkillTree),
            unlock: SkillTree.unlockSkill.bind(SkillTree),
            getEffects: SkillTree.getActiveEffects.bind(SkillTree),
            getByCategory: SkillTree.getSkillsByCategory.bind(SkillTree),
            getTotalLevel: SkillTree.getTotalLevel.bind(SkillTree)
        },

        // Companions
        pets: {
            getActive: CompanionSystem.getActivePet.bind(CompanionSystem),
            getAbilities: CompanionSystem.getPetAbilities.bind(CompanionSystem),
            grant: CompanionSystem.grantPet.bind(CompanionSystem),
            equip: CompanionSystem.equipPet.bind(CompanionSystem),
            unequip: CompanionSystem.unequipPet.bind(CompanionSystem),
            getAll: CompanionSystem.getAllPets.bind(CompanionSystem),
            addExperience: CompanionSystem.addPetExperience.bind(CompanionSystem)
        },

        // Skins
        skins: {
            grant: SkinSystem.grantSkin.bind(SkinSystem),
            equip: SkinSystem.equipSkin.bind(SkinSystem),
            getEquipped: SkinSystem.getEquippedSkin.bind(SkinSystem),
            getEffects: SkinSystem.getEquippedEffects.bind(SkinSystem),
            getAll: SkinSystem.getAllSkins.bind(SkinSystem),
            owns: SkinSystem.ownsSkin.bind(SkinSystem)
        },

        // Login Bonus
        login: {
            canClaim: LoginBonus.canClaimToday.bind(LoginBonus),
            claim: LoginBonus.claimTodayReward.bind(LoginBonus),
            getInfo: LoginBonus.getStreakInfo.bind(LoginBonus)
        },

        // Add currency alias for backward compatibility
        addCurrency: function(currency, amount, reason) {
            return CurrencySystem.addCurrency(currency, amount, reason);
        },

        // Version
        version: '2.0.0'
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        CrossGameMechanics.init();
    });
} else {
    CrossGameMechanics.init();
}
