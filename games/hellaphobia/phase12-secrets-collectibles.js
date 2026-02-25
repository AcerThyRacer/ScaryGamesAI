/* ============================================================
   HELLAPHOBIA - PHASE 12: SECRETS & COLLECTIBLES
   50+ Collectibles | Secret Levels | Unlockables | Gallery
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 12: COLLECTIBLE DATABASE =====
    const CollectibleDatabase = {
        // Lore Collectibles (20 items)
        lore: [
            { id: 'lore_001', name: 'First Victim\'s Journal', type: 'lore', rarity: 'common',
              description: 'A torn page from the first person trapped here',
              location: { phase: 1, x: 500, y: 300 },
              content: 'Day 1: I don\'t remember how I got here. The walls are breathing.',
              found: false },
            { id: 'lore_002', name: 'Warden\'s Log #1', type: 'lore', rarity: 'uncommon',
              description: 'The Warden\'s personal log',
              location: { phase: 5, x: 800, y: 200 },
              content: 'Day 47: The dungeon speaks to me. It hungers for souls.',
              found: false },
            { id: 'lore_003', name: 'Bloodstained Letter', type: 'lore', rarity: 'common',
              description: 'A letter never delivered',
              location: { phase: 2, x: 600, y: 350 },
              content: 'My dearest, I fear I shall not return. The darkness calls.',
              found: false },
            { id: 'lore_004', name: 'Ancient Inscription', type: 'lore', rarity: 'rare',
              description: 'Carved into the bone wall',
              location: { phase: 3, x: 1000, y: 250 },
              content: 'Here lies the path to salvation. Only the fearless may pass.',
              found: false },
            { id: 'lore_005', name: 'Collector\'s List', type: 'lore', rarity: 'epic',
              description: 'A list of collected souls',
              location: { phase: 10, x: 400, y: 300 },
              content: 'Subject #1847: Resistant. Subject #1848: Broken. Subject #1849: ...',
              found: false },
            { id: 'lore_006', name: 'Faded Photograph', type: 'lore', rarity: 'common',
              description: 'A photograph of someone you almost recognize',
              location: { phase: 9, x: 700, y: 400 },
              content: 'The face is blurred. But the eyes... they look like yours.',
              found: false },
            { id: 'lore_007', name: 'Developer Note #1', type: 'lore', rarity: 'legendary',
              description: 'A note from the game\'s creator',
              location: { phase: 15, x: 500, y: 500 },
              content: 'If you\'re reading this, you\'ve come far. The truth awaits.',
              found: false },
            { id: 'lore_008', name: 'Screaming Skull', type: 'lore', rarity: 'rare',
              description: 'A skull that whispers secrets',
              location: { phase: 3, x: 900, y: 150 },
              content: '*whispers* They\'re all dead. You\'re next. *whispers*',
              found: false },
            { id: 'lore_009', name: 'Mirror Fragment', type: 'lore', rarity: 'uncommon',
              description: 'A shard of broken mirror',
              location: { phase: 4, x: 600, y: 600 },
              content: 'Your reflection blinks. You didn\'t.',
              found: false },
            { id: 'lore_010', name: 'Clockwork Blueprint', type: 'lore', rarity: 'rare',
              description: 'Schematics for the Clockwork boss',
              location: { phase: 7, x: 800, y: 300 },
              content: 'Gear assembly requires 3 souls. Time dilation module: unstable.',
              found: false },
            { id: 'lore_011', name: 'Plague Doctor\'s Mask', type: 'lore', rarity: 'epic',
              description: 'The mask of the Plague boss',
              location: { phase: 6, x: 500, y: 400 },
              content: 'The disease is not a punishment. It is a gift.',
              found: false },
            { id: 'lore_012', name: 'Void Scripture', type: 'lore', rarity: 'legendary',
              description: 'Text written in the language of nothingness',
              location: { phase: 8, x: 300, y: 300 },
              content: 'In the beginning, there was nothing. In the end, there will be nothing.',
              found: false },
            { id: 'lore_013', name: 'Memory Locket', type: 'lore', rarity: 'uncommon',
              description: 'A locket containing a forgotten memory',
              location: { phase: 9, x: 400, y: 500 },
              content: 'Open it. Remember. Forget. Repeat.',
              found: false },
            { id: 'lore_014', name: 'Mimic\'s Diary', type: 'lore', rarity: 'rare',
              description: 'The Mimic\'s personal thoughts',
              location: { phase: 11, x: 600, y: 200 },
              content: 'Today I was a chest. Yesterday I was a door. Tomorrow I will be YOU.',
              found: false },
            { id: 'lore_015', name: 'Source Code Fragment', type: 'lore', rarity: 'legendary',
              description: 'A piece of the game\'s code',
              location: { phase: 14, x: 700, y: 600 },
              content: 'function player.die() { world.celebrate(); }',
              found: false },
            { id: 'lore_016', name: 'Hellaphobia Manual', type: 'lore', rarity: 'epic',
              description: 'The game\'s instruction manual',
              location: { phase: 1, x: 200, y: 200 },
              content: 'Page 1: There are no instructions. Page 2: You are already playing.',
              found: false },
            { id: 'lore_017', name: 'Soul Contract', type: 'lore', rarity: 'rare',
              description: 'A contract signed in blood',
              location: { phase: 10, x: 300, y: 400 },
              content: 'I hereby surrender my soul in exchange for... what did you wish for?',
              found: false },
            { id: 'lore_018', name: 'Time Capsule', type: 'lore', rarity: 'uncommon',
              description: 'A capsule from a previous player',
              location: { phase: 7, x: 500, y: 500 },
              content: 'To whoever finds this: Don\'t trust the Developer. - Player #4521',
              found: false },
            { id: 'lore_019', name: 'Fourth Wall Treatise', type: 'lore', rarity: 'legendary',
              description: 'An essay on breaking the fourth wall',
              location: { phase: 15, x: 400, y: 400 },
              content: 'The player watches us. But we watch them back.',
              found: false },
            { id: 'lore_020', name: 'True Ending Key', type: 'lore', rarity: 'legendary',
              description: 'The key to unlocking the true ending',
              location: { phase: 15, x: 600, y: 600 },
              content: 'You\'ve found all the pieces. Now face the truth.',
              found: false }
        ],

        // Collectible Items (15 items)
        items: [
            { id: 'item_001', name: 'Health Crystal', type: 'consumable', rarity: 'common',
              description: 'Restores 50 HP', effect: { health: 50 },
              location: { phase: 1, x: 400, y: 300 }, collected: false },
            { id: 'item_002', name: 'Sanity Potion', type: 'consumable', rarity: 'common',
              description: 'Restores 40 sanity', effect: { sanity: 40 },
              location: { phase: 2, x: 500, y: 350 }, collected: false },
            { id: 'item_003', name: 'Speed Boots', type: 'equipment', rarity: 'uncommon',
              description: '+10% movement speed', effect: { speed: 0.1 },
              location: { phase: 3, x: 700, y: 250 }, collected: false },
            { id: 'item_004', name: 'Damage Ring', type: 'equipment', rarity: 'uncommon',
              description: '+15% damage', effect: { damage: 0.15 },
              location: { phase: 4, x: 800, y: 400 }, collected: false },
            { id: 'item_005', name: 'Shadow Cloak', type: 'equipment', rarity: 'rare',
              description: 'Improved stealth', effect: { stealth: 0.3 },
              location: { phase: 5, x: 600, y: 500 }, collected: false },
            { id: 'item_006', name: 'Time Watch', type: 'equipment', rarity: 'epic',
              description: 'Slows time when low HP', effect: { timeSlow: true },
              location: { phase: 7, x: 900, y: 300 }, collected: false },
            { id: 'item_007', name: 'Soul Gem', type: 'currency', rarity: 'rare',
              description: 'Used for upgrades (100 souls)', effect: { currency: 100 },
              location: { phase: 6, x: 400, y: 400 }, collected: false },
            { id: 'item_008', name: 'Phoenix Feather', type: 'consumable', rarity: 'epic',
              description: 'Auto-revive on death', effect: { revive: 1 },
              location: { phase: 8, x: 500, y: 600 }, collected: false },
            { id: 'item_009', name: 'Void Shard', type: 'material', rarity: 'legendary',
              description: 'Crafting material from the Void', effect: { craft: 'void_weapon' },
              location: { phase: 8, x: 350, y: 350 }, collected: false },
            { id: 'item_010', name: 'Clockwork Gear', type: 'material', rarity: 'rare',
              description: 'Crafting material from Clockwork', effect: { craft: 'time_item' },
              location: { phase: 7, x: 600, y: 450 }, collected: false },
            { id: 'item_011', name: 'Memory Essence', type: 'material', rarity: 'uncommon',
              description: 'Extracted from memories', effect: { craft: 'memory_item' },
              location: { phase: 9, x: 550, y: 350 }, collected: false },
            { id: 'item_012', name: 'Developer Key', type: 'key', rarity: 'legendary',
              description: 'Opens developer room', effect: { unlock: 'dev_room' },
              location: { phase: 14, x: 800, y: 500 }, collected: false },
            { id: 'item_013', name: 'Master Key', type: 'key', rarity: 'epic',
              description: 'Opens all locked doors', effect: { unlock: 'all' },
              location: { phase: 10, x: 450, y: 450 }, collected: false },
            { id: 'item_014', name: 'Invisibility Cloak', type: 'equipment', rarity: 'legendary',
              description: 'Temporary invisibility', effect: { invisible: 5 },
              location: { phase: 12, x: 700, y: 400 }, collected: false },
            { id: 'item_015', name: 'God Mode Chip', type: 'cheat', rarity: 'legendary',
              description: 'Enables god mode (cheat)', effect: { godmode: true },
              location: { phase: 15, x: 999, y: 999, secret: true }, collected: false }
        ],

        // Secret Levels (20 levels)
        secretLevels: [
            { id: 'secret_001', name: 'The Hidden Passage', type: 'secret',
              unlockRequirement: { phase: 1, collectibles: 3 },
              difficulty: 'easy', reward: ['item_001'], discovered: false },
            { id: 'secret_002', name: 'Blood Vault', type: 'secret',
              unlockRequirement: { phase: 2, collectibles: 5 },
              difficulty: 'medium', reward: ['lore_003'], discovered: false },
            { id: 'secret_003', name: 'Bone Treasury', type: 'secret',
              unlockRequirement: { phase: 3, collectibles: 7 },
              difficulty: 'medium', reward: ['item_004'], discovered: false },
            { id: 'secret_004', name: 'Mirror Dimension', type: 'secret',
              unlockRequirement: { phase: 4, collectibles: 10 },
              difficulty: 'hard', reward: ['item_005'], discovered: false },
            { id: 'secret_005', name: 'Warden\'s Safe', type: 'secret',
              unlockRequirement: { phase: 5, bossDefeated: 'warden' },
              difficulty: 'hard', reward: ['lore_002'], discovered: false },
            { id: 'secret_006', name: 'Flesh Laboratory', type: 'secret',
              unlockRequirement: { phase: 6, collectibles: 15 },
              difficulty: 'medium', reward: ['item_010'], discovered: false },
            { id: 'secret_007', name: 'Clockwork Vault', type: 'secret',
              unlockRequirement: { phase: 7, timeTrial: 180 },
              difficulty: 'hard', reward: ['item_006'], discovered: false },
            { id: 'secret_008', name: 'Void Pocket', type: 'secret',
              unlockRequirement: { phase: 8, noDamage: true },
              difficulty: 'very_hard', reward: ['item_009'], discovered: false },
            { id: 'secret_009', name: 'Memory Archive', type: 'secret',
              unlockRequirement: { phase: 9, collectibles: 20 },
              difficulty: 'medium', reward: ['item_011'], discovered: false },
            { id: 'secret_010', name: 'Collector\'s Gallery', type: 'secret',
              unlockRequirement: { phase: 10, bossDefeated: 'collector' },
              difficulty: 'hard', reward: ['lore_005'], discovered: false },
            { id: 'secret_011', name: 'Developer Room', type: 'special',
              unlockRequirement: { phase: 14, item: 'item_012' },
              difficulty: 'none', reward: ['lore_007', 'item_015'], discovered: false },
            { id: 'secret_012', name: 'Speed Runner\'s Paradise', type: 'challenge',
              unlockRequirement: { phase: 5, timeTrial: 120 },
              difficulty: 'very_hard', reward: ['item_003'], discovered: false },
            { id: 'secret_013', name: 'Pacifist\'s Path', type: 'challenge',
              unlockRequirement: { phase: 8, noKills: true },
              difficulty: 'hard', reward: ['item_014'], discovered: false },
            { id: 'secret_014', name: 'Death\'s Door', type: 'challenge',
              unlockRequirement: { deaths: 50 },
              difficulty: 'very_hard', reward: ['lore_018'], discovered: false },
            { id: 'secret_015', name: 'Soul Collector', type: 'challenge',
              unlockRequirement: { kills: 500 },
              difficulty: 'medium', reward: ['item_007'], discovered: false },
            { id: 'secret_016', name: 'The True Dungeon', type: 'secret',
              unlockRequirement: { allCollectibles: 20 },
              difficulty: 'extreme', reward: ['lore_020'], discovered: false },
            { id: 'secret_017', name: 'Nightmare Mode', type: 'challenge',
              unlockRequirement: { completeGame: true },
              difficulty: 'nightmare', reward: ['title_nightmare'], discovered: false },
            { id: 'secret_018', name: 'Boss Rush', type: 'challenge',
              unlockRequirement: { allBossesDefeated: true },
              difficulty: 'extreme', reward: ['title_boss_slayer'], discovered: false },
            { id: 'secret_019', name: 'Endless Corridor', type: 'endless',
              unlockRequirement: { phase: 10, collectibles: 25 },
              difficulty: 'endless', reward: ['infinite_ammo'], discovered: false },
            { id: 'secret_020', name: 'The Beginning', type: 'secret',
              unlockRequirement: { trueEnding: true },
              difficulty: 'story', reward: ['new_game_plus'], discovered: false }
        ],

        // Unlockable Characters (6 characters)
        characters: [
            { id: 'char_001', name: 'Default Hero', type: 'character',
              unlockRequirement: { default: true }, unlocked: true,
              stats: { speed: 100, health: 100, sanity: 100 } },
            { id: 'char_002', name: 'Speed Demon', type: 'character',
              unlockRequirement: { timeTrial: 60 }, unlocked: false,
              stats: { speed: 130, health: 80, sanity: 90 } },
            { id: 'char_003', name: 'Tank', type: 'character',
              unlockRequirement: { surviveDamage: 1000 }, unlocked: false,
              stats: { speed: 80, health: 150, sanity: 80 } },
            { id: 'char_004', name: 'Mind Master', type: 'character',
              unlockRequirement: { sanityRemaining: 90 }, unlocked: false,
              stats: { speed: 90, health: 90, sanity: 150 } },
            { id: 'char_005', name: 'Shadow Walker', type: 'character',
              unlockRequirement: { stealthKills: 50 }, unlocked: false,
              stats: { speed: 110, health: 85, sanity: 105 } },
            { id: 'char_006', name: 'True Hero', type: 'character',
              unlockRequirement: { trueEnding: true }, unlocked: false,
              stats: { speed: 120, health: 120, sanity: 120 } }
        ],

        // Alternate Costumes (10 costumes)
        costumes: [
            { id: 'costume_001', name: 'Default', character: 'char_001',
              unlockRequirement: { default: true }, unlocked: true },
            { id: 'costume_002', name: 'Crimson Warrior', character: 'char_001',
              unlockRequirement: { kills: 100 }, unlocked: false },
            { id: 'costume_003', name: 'Shadow Assassin', character: 'char_001',
              unlockRequirement: { stealthKills: 25 }, unlocked: false },
            { id: 'costume_004', name: 'Golden Hero', character: 'char_001',
              unlockRequirement: { noDeathRun: true }, unlocked: false },
            { id: 'costume_005', name: 'Void Touched', character: 'char_001',
              unlockRequirement: { defeatVoid: true }, unlocked: false },
            { id: 'costume_006', name: 'Developer', character: 'char_006',
              unlockRequirement: { findDevRoom: true }, unlocked: false },
            { id: 'costume_007', name: 'Warden\'s Uniform', character: 'char_003',
              unlockRequirement: { defeatWarden: true }, unlocked: false },
            { id: 'costume_008', name: 'Collector\'s Robes', character: 'char_004',
              unlockRequirement: { defeatCollector: true }, unlocked: false },
            { id: 'costume_009', name: 'Clockwork Armor', character: 'char_003',
              unlockRequirement: { defeatClockwork: true }, unlocked: false },
            { id: 'costume_010', name: 'TRUE FORM', character: 'char_006',
              unlockRequirement: { trueEnding: true, allCollectibles: true }, unlocked: false }
        ]
    };

    // ===== PHASE 12: COLLECTIBLE MANAGER =====
    const CollectibleManager = {
        collectedItems: [],
        discoveredSecrets: [],
        unlockedCharacters: [],
        unlockedCostumes: [],
        totalCollected: 0,

        init() {
            this.loadProgress();
            console.log('Phase 12: Collectible Manager initialized');
        },

        // Check if collectible can be collected
        canCollect(collectible, playerStats) {
            if (collectible.collected) return false;

            // Check location
            if (collectible.location && collectible.location.phase) {
                if (playerStats.currentPhase < collectible.location.phase) {
                    return false;
                }
            }

            return true;
        },

        // Collect item
        collect(collectible, player) {
            if (!this.canCollect(collectible, { currentPhase: player.currentPhase })) {
                return false;
            }

            collectible.collected = true;
            this.collectedItems.push(collectible.id);
            this.totalCollected++;

            // Apply effect
            if (collectible.effect) {
                this.applyCollectibleEffect(collectible.effect, player);
            }

            // Save progress
            this.saveProgress();

            // Track event
            EventTracker.track('collectible_found', {
                id: collectible.id,
                name: collectible.name,
                type: collectible.type,
                rarity: collectible.rarity
            });

            // Show notification
            this.showCollectNotification(collectible);

            // Check for unlocks
            this.checkUnlocks();

            return true;
        },

        // Apply collectible effect
        applyCollectibleEffect(effect, player) {
            if (effect.health) {
                player.hp = Math.min(player.hp + effect.health, player.maxHp);
            }
            if (effect.sanity) {
                player.sanity = Math.min(player.sanity + effect.sanity, player.maxSanity);
            }
            if (effect.speed) {
                player.speedMultiplier = (player.speedMultiplier || 1) + effect.speed;
            }
            if (effect.damage) {
                player.damageMultiplier = (player.damageMultiplier || 1) + effect.damage;
            }
            if (effect.currency) {
                player.souls = (player.souls || 0) + effect.currency;
            }
            if (effect.revive) {
                player.autoRevive = (player.autoRevive || 0) + effect.revive;
            }
        },

        // Show collection notification
        showCollectNotification(collectible) {
            const rarityColors = {
                common: '#888888',
                uncommon: '#00ff00',
                rare: '#0088ff',
                epic: '#aa00ff',
                legendary: '#ffaa00'
            };

            const color = rarityColors[collectible.rarity] || '#ffffff';

            // Create notification
            const notification = {
                text: `Found: ${collectible.name}`,
                subtext: collectible.description,
                color: color,
                duration: 3000
            };

            if (typeof window.showNotification === 'function') {
                window.showNotification(notification.text, notification.subtext, notification.color);
            }
        },

        // Check for new unlocks
        checkUnlocks() {
            const stats = this.getPlayerStats();

            // Check secret levels
            CollectibleDatabase.secretLevels.forEach(level => {
                if (!level.discovered && this.meetsRequirements(level.unlockRequirement, stats)) {
                    level.discovered = true;
                    this.discoveredSecrets.push(level.id);
                    EventTracker.track('secret_discovered', { levelId: level.id });
                }
            });

            // Check characters
            CollectibleDatabase.characters.forEach(char => {
                if (!char.unlocked && this.meetsRequirements(char.unlockRequirement, stats)) {
                    char.unlocked = true;
                    this.unlockedCharacters.push(char.id);
                    EventTracker.track('character_unlocked', { charId: char.id });
                }
            });

            // Check costumes
            CollectibleDatabase.costumes.forEach(costume => {
                if (!costume.unlocked && this.meetsRequirements(costume.unlockRequirement, stats)) {
                    costume.unlocked = true;
                    this.unlockedCostumes.push(costume.id);
                    EventTracker.track('costume_unlocked', { costumeId: costume.id });
                }
            });

            this.saveProgress();
        },

        // Check if requirements are met
        meetsRequirements(requirements, stats) {
            for (const [key, value] of Object.entries(requirements)) {
                switch (key) {
                    case 'phase':
                        if (stats.currentPhase < value) return false;
                        break;
                    case 'collectibles':
                        if (this.totalCollected < value) return false;
                        break;
                    case 'bossDefeated':
                        if (!stats.bossesDefeated.includes(value)) return false;
                        break;
                    case 'timeTrial':
                        if (!stats.bestTimes || stats.bestTimes[stats.currentPhase] > value) return false;
                        break;
                    case 'noDamage':
                        if (!stats.noDamageRuns || stats.noDamageRuns < 1) return false;
                        break;
                    case 'deaths':
                        if (stats.totalDeaths < value) return false;
                        break;
                    case 'kills':
                        if (stats.totalKills < value) return false;
                        break;
                    case 'allCollectibles':
                        if (this.totalCollected < 20) return false;
                        break;
                    case 'completeGame':
                        if (!stats.gameCompleted) return false;
                        break;
                    case 'allBossesDefeated':
                        if (!stats.allBossesDefeated) return false;
                        break;
                    case 'trueEnding':
                        if (!stats.trueEnding) return false;
                        break;
                    case 'item':
                        if (!this.collectedItems.includes(value)) return false;
                        break;
                }
            }
            return true;
        },

        // Get player stats
        getPlayerStats() {
            return {
                currentPhase: 1,
                bossesDefeated: [],
                bestTimes: {},
                noDamageRuns: 0,
                totalDeaths: parseInt(localStorage.getItem('hellaphobia_deaths') || '0'),
                totalKills: 0,
                gameCompleted: false,
                allBossesDefeated: false,
                trueEnding: false
            };
        },

        // Save progress
        saveProgress() {
            localStorage.setItem('hellaphobia_collectibles', JSON.stringify({
                collectedItems: this.collectedItems,
                discoveredSecrets: this.discoveredSecrets,
                unlockedCharacters: this.unlockedCharacters,
                unlockedCostumes: this.unlockedCostumes,
                totalCollected: this.totalCollected
            }));
        },

        // Load progress
        loadProgress() {
            const saved = localStorage.getItem('hellaphobia_collectibles');
            if (saved) {
                const data = JSON.parse(saved);
                this.collectedItems = data.collectedItems || [];
                this.discoveredSecrets = data.discoveredSecrets || [];
                this.unlockedCharacters = data.unlockedCharacters || [];
                this.unlockedCostumes = data.unlockedCostumes || [];
                this.totalCollected = data.totalCollected || 0;
            }
        },

        // Get collection progress
        getProgress() {
            return {
                lore: CollectibleDatabase.lore.filter(l => l.found).length + '/' + CollectibleDatabase.lore.length,
                items: this.collectedItems.length + '/' + CollectibleDatabase.items.length,
                secrets: this.discoveredSecrets.length + '/' + CollectibleDatabase.secretLevels.length,
                characters: this.unlockedCharacters.length + '/' + CollectibleDatabase.characters.length,
                costumes: this.unlockedCostumes.length + '/' + CollectibleDatabase.costumes.length,
                total: this.totalCollected + '/35'
            };
        },

        // Get all collectibles
        getAllCollectibles() {
            return {
                lore: CollectibleDatabase.lore,
                items: CollectibleDatabase.items,
                secrets: CollectibleDatabase.secretLevels,
                characters: CollectibleDatabase.characters,
                costumes: CollectibleDatabase.costumes
            };
        }
    };

    // ===== PHASE 12: SECRET LEVEL MANAGER =====
    const SecretLevelManager = {
        activeSecret: null,

        init() {
            this.activeSecret = null;
            console.log('Phase 12: Secret Level Manager initialized');
        },

        // Enter secret level
        enterSecret(secretId) {
            const secret = CollectibleDatabase.secretLevels.find(s => s.id === secretId);
            if (!secret) return false;
            if (!secret.discovered) return false;

            this.activeSecret = secret;

            EventTracker.track('secret_level_entered', { secretId });

            return true;
        },

        // Complete secret level
        completeSecret(rewards) {
            if (!this.activeSecret) return;

            // Grant rewards
            rewards.forEach(reward => {
                const item = CollectibleDatabase.items.find(i => i.id === reward);
                if (item) {
                    CollectibleManager.collect(item, { currentPhase: 99 });
                }
            });

            this.activeSecret = null;
        },

        // Get active secret
        getActiveSecret() {
            return this.activeSecret;
        }
    };

    // ===== PHASE 12: GALLERY MANAGER =====
    const GalleryManager = {
        conceptArt: [],
        unlockedArt: [],

        init() {
            this.loadGallery();
            console.log('Phase 12: Gallery Manager initialized');
        },

        // Unlock concept art
        unlockArt(artId) {
            if (!this.unlockedArt.includes(artId)) {
                this.unlockedArt.push(artId);
                this.saveGallery();
                EventTracker.track('gallery_art_unlocked', { artId });
            }
        },

        // Get gallery
        getGallery() {
            return {
                unlocked: this.unlockedArt,
                total: this.conceptArt.length
            };
        },

        // Save gallery
        saveGallery() {
            localStorage.setItem('hellaphobia_gallery', JSON.stringify({
                unlockedArt: this.unlockedArt
            }));
        },

        // Load gallery
        loadGallery() {
            const saved = localStorage.getItem('hellaphobia_gallery');
            if (saved) {
                const data = JSON.parse(saved);
                this.unlockedArt = data.unlockedArt || [];
            }
        }
    };

    // ===== PHASE 12: CHEAT CODE SYSTEM =====
    const CheatCodeSystem = {
        cheats: {
            'GODMODE': { effect: 'godmode', description: 'Invincibility' },
            'INFINITE': { effect: 'infinite_ammo', description: 'Infinite ammo' },
            'SPEED': { effect: 'super_speed', description: 'Super speed' },
            'GLITCH': { effect: 'glitch_mode', description: 'Enable glitch effects' },
            'SCARY': { effect: 'horror_max', description: 'Maximum horror' },
            'DEV': { effect: 'dev_tools', description: 'Developer tools' }
        },
        activeCheats: [],

        init() {
            console.log('Phase 12: Cheat Code System initialized');
        },

        // Enter cheat code
        enterCheat(code) {
            const uppercaseCode = code.toUpperCase();
            const cheat = this.cheats[uppercaseCode];

            if (cheat) {
                if (!this.activeCheats.includes(uppercaseCode)) {
                    this.activeCheats.push(uppercaseCode);
                    this.activateCheat(cheat.effect);
                    EventTracker.track('cheat_entered', { code: uppercaseCode });
                    return true;
                }
            }
            return false;
        },

        // Activate cheat effect
        activateCheat(effect) {
            console.log('[Cheat] Activated:', effect);

            switch (effect) {
                case 'godmode':
                    if (typeof window.enableGodMode === 'function') {
                        window.enableGodMode(true);
                    }
                    break;
                case 'super_speed':
                    if (typeof window.setSpeedMultiplier === 'function') {
                        window.setSpeedMultiplier(2.0);
                    }
                    break;
                case 'horror_max':
                    if (typeof window.setMaxHorror === 'function') {
                        window.setMaxHorror(true);
                    }
                    break;
            }
        },

        // Get active cheats
        getActiveCheats() {
            return this.activeCheats;
        },

        // Disable cheat
        disableCheat(code) {
            const index = this.activeCheats.indexOf(code);
            if (index !== -1) {
                this.activeCheats.splice(index, 1);
            }
        }
    };

    // ===== PHASE 12: MAIN EXPORT =====
    const Phase12Secrets = {
        initialized: false,

        init() {
            if (this.initialized) return;

            CollectibleManager.init();
            SecretLevelManager.init();
            GalleryManager.init();
            CheatCodeSystem.init();

            this.initialized = true;
            console.log('Phase 12: Secrets & Collectibles initialized');
        },

        // Collectibles
        collect: (item, player) => CollectibleManager.collect(item, player),
        getProgress: () => CollectibleManager.getProgress(),
        getAllCollectibles: () => CollectibleManager.getAllCollectibles(),

        // Secret levels
        enterSecret: (id) => SecretLevelManager.enterSecret(id),
        completeSecret: (rewards) => SecretLevelManager.completeSecret(rewards),

        // Gallery
        unlockArt: (id) => GalleryManager.unlockArt(id),
        getGallery: () => GalleryManager.getGallery(),

        // Cheats
        enterCheat: (code) => CheatCodeSystem.enterCheat(code),
        getActiveCheats: () => CheatCodeSystem.getActiveCheats(),

        // Database access
        getCollectibleDatabase: () => CollectibleDatabase,
        getSecretLevels: () => CollectibleDatabase.secretLevels,
        getCharacters: () => CollectibleDatabase.characters,
        getCostumes: () => CollectibleDatabase.costumes
    };

    // Export Phase 12 systems
    window.Phase12Secrets = Phase12Secrets;
    window.CollectibleManager = CollectibleManager;
    window.SecretLevelManager = SecretLevelManager;
    window.GalleryManager = GalleryManager;
    window.CheatCodeSystem = CheatCodeSystem;
    window.CollectibleDatabase = CollectibleDatabase;

})();
