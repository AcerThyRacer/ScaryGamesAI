/* ============================================================
   CURSED DEPTHS - PHASE 6: NPC OVERHAUL
   30 Unique NPCs | Personalities | Routines | Happiness System
   ============================================================ */

// ===== NPC DATABASE =====
const NPCSystem = {
    npcs: [],
    npcIdCounter: 0,
    
    // NPC definitions
    definitions: {
        // PRE-HARDMODE NPCs (1-15)
        guide: {
            id: 'guide',
            name: 'Guide',
            description: 'Provides tips and shows crafting recipes',
            sprite: '🧙',
            homeRequired: true,
            shop: {
                items: [
                    { item: T.TORCH, price: 0.5 },
                    { item: T.WORKBENCH, price: 5 },
                    { item: T.FURNACE, price: 10 }
                ]
            },
            dialogue: [
                'Have you tried mining underground? There are valuable ores down there.',
                'You can build a house for me using wood platforms and walls.',
                'Crafting stations allow you to create more advanced items.'
            ],
            biomePreference: 'forest',
            neighborLikes: ['dryad', 'merchant'],
            neighborDislikes: ['witch_doctor']
        },
        
        merchant: {
            id: 'merchant',
            name: 'Merchant',
            description: 'Sells basic supplies and tools',
            sprite: '👨‍💼',
            homeRequired: true,
            spawnCondition: () => player.coins >= 50,
            shop: {
                items: [
                    { item: I_WOOD_PICK, price: 25 },
                    { item: I_WOOD_SWORD, price: 30 },
                    { item: T.TORCH, price: 0.5 },
                    { item: T.ROPE, price: 1 },
                    { item: I_ARROW, price: 2 }
                ]
            },
            dialogue: [
                'Got any coins to spend?',
                'I hear there are rare treasures hidden in the depths.',
                'Buy low, sell high... well, I mostly just sell high!'
            ],
            biomePreference: 'forest',
            neighborLikes: ['guide', 'nurse']
        },
        
        nurse: {
            id: 'nurse',
            name: 'Nurse',
            description: 'Heals you for a fee',
            sprite: '👩‍⚕️',
            homeRequired: true,
            spawnCondition: () => player.maxHp >= 100,
            shop: {
                items: [
                    { item: I_HEALTH_POT, price: 10 },
                    { item: I_MANA_POT, price: 15 }
                ],
                services: [
                    { name: 'heal', cost: (hp) => hp * 0.5 }
                ]
            },
            dialogue: [
                'Need healing? It\'ll cost you.',
                'Try not to die out there.',
                'I\'ve seen worse injuries than yours... actually, no I haven\'t.'
            ],
            biomePreference: 'forest',
            neighborLikes: ['arms_dealer', 'golfer']
        },
        
        demolitionist: {
            id: 'demolitionist',
            name: 'Demolitionist',
            description: 'Sells explosives and bombs',
            sprite: '🧨',
            homeRequired: true,
            spawnCondition: () => inventoryHasItem(I_BOMB || 200),
            shop: {
                items: [
                    { item: I_BOMB || 200, price: 5 },
                    { item: I_DYNAMITE || 201, price: 25 },
                    { item: I_GRENADE || 202, price: 10 }
                ]
            },
            dialogue: [
                'Everything looks better with a big explosion!',
                'Got any bombs? No? Let me fix that.',
                'Kaboom is my middle name. Actually it\'s "Bob".'
            ],
            biomePreference: 'caves',
            neighborLikes: ['mechanic', 'tinkerer'],
            neighborDislikes: ['dryad']
        },
        
        dye_trader: {
            id: 'dye_trader',
            name: 'Dye Trader',
            description: 'Sells dyes and dye ingredients',
            sprite: '🎨',
            homeRequired: true,
            spawnCondition: () => inventoryHasItem(I_DYE_INGREDIENT || 210),
            shop: {
                items: [
                    { item: I_RED_DYE || 220, price: 5 },
                    { item: I_BLUE_DYE || 221, price: 5 },
                    { item: I_GREEN_DYE || 222, price: 5 },
                    { item: I_DYE_EXTRACTOR || 223, price: 50 }
                ]
            },
            dialogue: [
                'Color is the essence of life!',
                'Have you tried mixing different dyes?',
                'Some of the rarest creatures produce the most vibrant colors.'
            ],
            biomePreference: 'jungle',
            neighborLikes: ['clothier', 'party_girl']
        },
        
        dryad: {
            id: 'dryad',
            name: 'Dryad',
            description: 'Sells nature items and purification powder',
            sprite: '🧚',
            homeRequired: true,
            spawnCondition: () => bossDefeated('eye_of_terror'),
            shop: {
                items: [
                    { item: I_PURIFICATION_POWDER || 230, price: 1 },
                    { item: T.GRASS_SEEDS || 231, price: 0.5 },
                    { item: T.SUNFLOWER || 232, price: 5 },
                    { item: I_HOLY_WATER || 233, price: 10 }
                ]
            },
            dialogue: [
                'The balance of nature must be maintained.',
                'Corruption spreads... we must fight it.',
                'Nature provides for those who respect it.'
            ],
            biomePreference: 'jungle',
            neighborLikes: ['guide', 'witch_doctor'],
            neighborDislikes: ['demolitionist', 'steampunker']
        },
        
        arms_dealer: {
            id: 'arms_dealer',
            name: 'Arms Dealer',
            description: 'Sells guns, bullets, and ammo',
            sprite: '🔫',
            homeRequired: true,
            spawnCondition: () => inventoryHasGun(),
            shop: {
                items: [
                    { item: I_FLINTLOCK || 240, price: 100 },
                    { item: I_MUSKET || 241, price: 150 },
                    { item: I_MUSKET_BALL || 242, price: 0.2 },
                    { item: I_SHOTGUN_SHELL || 243, price: 0.5 }
                ]
            },
            dialogue: [
                'Looking for some firepower?',
                'A gun is just a tool... a very loud, deadly tool.',
                'I accept gold, silver, or copper. No checks.'
            ],
            biomePreference: 'desert',
            neighborLikes: ['nurse', 'mechanic']
        },
        
        goblin_tinkerer: {
            id: 'goblin_tinkerer',
            name: 'Goblin Tinkerer',
            description: 'Reforging and accessory crafting',
            sprite: '👺',
            homeRequired: true,
            spawnCondition: () => defeatedGoblinArmy(),
            shop: {
                items: [
                    { item: I_TINKERERS_WORKSHOP || 250, price: 50 },
                    { item: I_ROCKET_BOOTS || 251, price: 200 },
                    { item: I_HERMES_BOOTS || 252, price: 150 }
                ],
                services: [
                    { name: 'reforge', cost: (item) => item.value * 0.1 }
                ]
            },
            dialogue: [
                'Me can make your gear better! For a price.',
                'Goblins know engineering better than anyone.',
                'Want me to reforge that? Might make it worse... or way better!'
            ],
            biomePreference: 'caves',
            neighborLikes: ['mechanic', 'wizard'],
            neighborDislikes: ['bound_goblin']
        },
        
        witch_doctor: {
            id: 'witch_doctor',
            name: 'Witch Doctor',
            description: 'Sells summoning items and voodoo dolls',
            sprite: '🎭',
            homeRequired: true,
            spawnCondition: () => bossDefeated('bee_queen'),
            shop: {
                items: [
                    { item: I_SLIME_STAFF || 260, price: 500 },
                    { item: I_FINCH_STAFF || 261, price: 300 },
                    { item: I_VOODOO_DOLL || 262, price: 50 }
                ]
            },
            dialogue: [
                'The spirits speak to me... they want souvenirs.',
                'Summoning is an art form.',
                'Voodoo dolls are ethical if you ask the person first. Usually.'
            ],
            biomePreference: 'jungle',
            neighborLikes: ['dryad', 'tinkerer']
        },
        
        clothier: {
            id: 'clothier',
            name: 'Clothier',
            description: 'Sells vanity items and accessories',
            sprite: '🧵',
            homeRequired: true,
            spawnCondition: () => bossDefeated('skeletron'),
            shop: {
                items: [
                    { item: I_FAMILIAR_SHIRT || 270, price: 25 },
                    { item: I_FAMILIAR_PANTS || 271, price: 25 },
                    { item: I_NINJA_OUTFIT || 272, price: 100 },
                    { item: I_PLUMBERS_SET || 273, price: 100 }
                ]
            },
            dialogue: [
                'Fashion is the ultimate defense against darkness.',
                'That outfit... it hurts my eyes. Let me help.',
                'I used to run a small shop. Then I got cursed. Long story.'
            ],
            biomePreference: 'hallow',
            neighborLikes: ['dye_trader', 'party_girl']
        },
        
        mechanic: {
            id: 'mechanic',
            name: 'Mechanic',
            description: 'Sells wire, mechanisms, and traps',
            sprite: '🔧',
            homeRequired: true,
            spawnCondition: () => foundInDungeon(),
            shop: {
                items: [
                    { item: I_WIRE || 280, price: 0.5 },
                    { item: I_LEVER || 281, price: 5 },
                    { item: I_SWITCH || 282, price: 3 },
                    { item: I_TELEPORTER || 283, price: 50 }
                ]
            },
            dialogue: [
                'Everything can be fixed with the right tools.',
                'Wire goes here, connects to there... simple!',
                'I once built a flying machine. It only crashed twice.'
            ],
            biomePreference: 'dungeon',
            neighborLikes: ['goblin_tinkerer', 'arms_dealer', 'steampunker']
        },
        
        party_girl: {
            id: 'party_girl',
            name: 'Party Girl',
            description: 'Sells party items and decorations',
            sprite: '🎉',
            homeRequired: true,
            spawnCondition: () => randomSpawn(0.025) && npcs.length >= 8,
            shop: {
                items: [
                    { item: I_PARTY_CENTERPIECE || 290, price: 5 },
                    { item: I_BALLOON || 291, price: 1 },
                    { item: I_BANNER || 292, price: 10 },
                    { item: I_PINATA || 293, price: 25 }
                ]
            },
            dialogue: [
                'Every day is a reason to celebrate!',
                'You look like you need a party!',
                'Life is short. Party hard!'
            ],
            biomePreference: 'hallow',
            neighborLikes: ['clothier', 'princess']
        },
        
        wizard: {
            id: 'wizard',
            name: 'Wizard',
            description: 'Sells magic weapons and mana stars',
            sprite: '🧙‍♂️',
            homeRequired: true,
            spawnCondition: () => foundInCaves() && player.mana >= 100,
            shop: {
                items: [
                    { item: I_MAGIC_MISSILE || 300, price: 200 },
                    { item: I_FIRE_FLOWER || 301, price: 150 },
                    { item: I_MANA_CRYSTAL || 302, price: 50 }
                ]
            },
            dialogue: [
                'Magic is all around us. You just need to see it.',
                'I was once cursed to be a gem. Not fun.',
                'Abracadabra! ...Wait, wrong spell.'
            ],
            biomePreference: 'hallow',
            neighborLikes: ['goblin_tinkerer', 'witch_doctor']
        },
        
        tax_collector: {
            id: 'tax_collector',
            name: 'Tax Collector',
            description: 'Collects taxes over time',
            sprite: '🤑',
            homeRequired: true,
            spawnCondition: () => usePurificationPowderOnNPC('corrupted_bunny'),
            shop: {
                services: [
                    { name: 'collect_taxes', collect: () => calculateTaxes() }
                ]
            },
            dialogue: [
                'Taxes are due. Pay up.',
                'I protect you from monsters. You pay me. Simple.',
                'Money makes the world go round. And I collect it.'
            ],
            biomePreference: 'corruption',
            neighborLikes: ['merchant'],
            neighborDislikes: ['party_girl', 'princess']
        },
        
        angler: {
            id: 'angler',
            name: 'Angler',
            description: 'Fishing quests and rewards',
            sprite: '🎣',
            homeRequired: false,
            spawnCondition: () => foundSleepingOnBeach(),
            shop: {
                services: [
                    { name: 'quest', give: () => giveFishingQuest() },
                    { name: 'turn_in', reward: (quest) => completeFishingQuest(quest) }
                ]
            },
            dialogue: [
                'Hey kid! Got a fishing quest for ya!',
                'Catch me this fish and I\'ll give ya something special!',
                'Back in my day, we fished with bare hands!'
            ],
            biomePreference: 'ocean',
            neighborLikes: ['pirate']
        },
        
        // HARDMODE NPCs (16-25)
        pirate: {
            id: 'pirate',
            name: 'Pirate',
            description: 'Sells pirate-themed items and cannons',
            sprite: '🏴‍☠️',
            homeRequired: true,
            spawnCondition: () => defeatedPirateInvasion(),
            shop: {
                items: [
                    { item: I_CANNON || 310, price: 500 },
                    { item: I_CANNONBALL || 311, price: 10 },
                    { item: I_PIRATE_STAFF || 312, price: 300 },
                    { item: I_PIRATE_OUTFIT || 313, price: 200 }
                ]
            },
            dialogue: [
                'Arrr! Ready to plunder some booty?',
                'The sea be a harsh mistress.',
                'X marks the spot... usually.'
            ],
            biomePreference: 'ocean',
            neighborLikes: ['angler', 'tax_collector']
        },
        
        steampunker: {
            id: 'steampunker',
            name: 'Steampunker',
            description: 'Sells tech items and jetpack',
            sprite: '⚙️',
            homeRequired: true,
            spawnCondition: () => defeatedMechBoss(),
            shop: {
                items: [
                    { item: I_JETPACK || 320, price: 1000 },
                    { item: I_STEAMPUNK_OUTFIT || 321, price: 300 },
                    { item: I_TELEPORTATION_POTION || 322, price: 50 },
                    { item: I_CLINTERMINATOR || 323, price: 2000 }
                ]
            },
            dialogue: [
                'Technology is the future!',
                'Steam power solves everything.',
                'I could build a city in a bottle. Want to see?'
            ],
            biomePreference: 'hallow',
            neighborLikes: ['mechanic', 'cyborg'],
            neighborDislikes: ['dryad', 'truffle']
        },
        
        cyborg: {
            id: 'cyborg',
            name: 'Cyborg',
            description: 'Sells rockets, nanites, and cyborg parts',
            sprite: '🤖',
            homeRequired: true,
            spawnCondition: () => defeatedPlantera(),
            shop: {
                items: [
                    { item: I_ROCKET_I || 330, price: 5 },
                    { item: I_ROCKET_II || 331, price: 10 },
                    { item: I_NANITES || 332, price: 25 },
                    { item: I_CYBERNETIC_ARM || 333, price: 5000 }
                ]
            },
            dialogue: [
                'Greetings, organic lifeform.',
                'My calculations indicate a 97.3% chance of victory.',
                'Upgrades available. Your flesh is weak.'
            ],
            biomePreference: 'hallow',
            neighborLikes: ['steampunker', 'wizard']
        },
        
        santa_claus: {
            id: 'santa_claus',
            name: 'Santa Claus',
            description: 'Christmas seasonal NPC',
            sprite: '🎅',
            homeRequired: true,
            spawnCondition: () => isChristmasSeason() && defeatedFrostLegion(),
            shop: {
                items: [
                    { item: I_CHRISTMAS_TREE || 340, price: 50 },
                    { item: I_LIGHTS || 341, price: 10 },
                    { item: I_SANTA_OUTFIT || 342, price: 300 },
                    { item: I_GIFT || 343, price: 5 }
                ]
            },
            dialogue: [
                'Ho ho ho! Merry Christmas!',
                'Have you been naughty or nice?',
                'The workshop is busy this time of year!'
            ],
            biomePreference: 'snow',
            neighborLikes: ['party_girl', 'princess']
        },
        
        travelling_merchant: {
            id: 'travelling_merchant',
            name: 'Travelling Merchant',
            description: 'Random rare items',
            sprite: '🐪',
            homeRequired: false,
            spawnCondition: () => randomSpawn(0.1) && npcs.length >= 2,
            visits: true,
            staysFor: 86400, // 1 day
            shop: {
                items: getRandomRareItems()
            },
            dialogue: [
                'I travel far and wide for the rarest goods!',
                'Today\'s specials won\'t last long!',
                'Come back tomorrow for new inventory!'
            ],
            biomePreference: 'any'
        },
        
        skeleton_merchant: {
            id: 'skeleton_merchant',
            name: 'Skeleton Merchant',
            description: 'Underground cavern merchant',
            sprite: '💀',
            homeRequired: false,
            spawnCondition: () => foundInCaverns(),
            wanders: true,
            shop: {
                items: [
                    { item: I_MAGIC_LANTERN || 350, price: 50 },
                    { item: I_MINING_HELMET || 351, price: 25 },
                    { item: I_BONE_KEY || 352, price: 500 }
                ]
            },
            dialogue: [
                'Got some rare finds from the depths.',
                'You look like someone who appreciates... bone structure.',
                'Careful down here. The bones tell stories.'
            ],
            biomePreference: 'caverns'
        },
        
        princess: {
            id: 'princess',
            name: 'Princess',
            description: 'Final NPC, sells royal items',
            sprite: '👸',
            homeRequired: true,
            spawnCondition: () => allOtherNPCsPresent(),
            shop: {
                items: [
                    { item: I_PRINCESS_DRESS || 360, price: 500 },
                    { item: I_GLASS_SLIPPER || 361, price: 1000 },
                    { item: I_ROYAL_THRONE || 362, price: 2000 }
                ]
            },
            dialogue: [
                'Oh! A visitor! How delightful!',
                'Everyone needs a friend... or thirty.',
                'Being royalty is lonely sometimes.'
            ],
            biomePreference: 'hallow',
            neighborLikes: ['all']
        },
        
        golfer: {
            id: 'golfer',
            name: 'Golfer',
            description: 'Golf quests and equipment',
            sprite: '⛳',
            homeRequired: true,
            spawnCondition: () => foundOnGolfCourse(),
            shop: {
                items: [
                    { item: I_GOLF_CLUB || 370, price: 100 },
                    { item: I_GOLF_BALL || 371, price: 5 },
                    { item: I_GOLF_FLAG || 372, price: 50 },
                    { item: I_GOLF_TROPHY || 373, price: 200 }
                ],
                services: [
                    { name: 'quest', give: () => giveGolfQuest() }
                ]
            },
            dialogue: [
                'Nice swing! Well, not really, but keep trying.',
                'Golf is all about precision and patience.',
                'Want to improve your game? Buy my stuff!'
            ],
            biomePreference: 'forest',
            neighborLikes: ['party_girl']
        },
        
        truffle: {
            id: 'truffle',
            name: 'Truffle',
            description: 'Mushroom biome NPC',
            sprite: '🍄',
            homeRequired: true,
            spawnCondition: () => houseInMushroomBiome(),
            shop: {
                items: [
                    { item: I_AUTOHAMMER || 380, price: 1000 },
                    { item: I_MUSHROOM_STATUE || 381, price: 100 },
                    { item: I_TRUFFLE_WORM || 382, price: 500 }
                ]
            },
            dialogue: [
                'The spores... they call to me.',
                'Mushrooms are friends, not food.',
                'Glorious mushroom kingdom shall rise!'
            ],
            biomePreference: 'mushroom',
            neighborLikes: ['dryad', 'witch_doctor'],
            neighborDislikes: ['steampunker']
        }
    },
    
    init() {
        console.log('👥 Phase 6: NPC Overhaul initialized');
        this.loadNPCs();
        this.setupNPCCycles();
    },
    
    loadNPCs() {
        // Load saved NPCs or start fresh
        const saved = localStorage.getItem('cursed_depths_npcs');
        if (saved) {
            this.npcs = JSON.parse(saved);
        } else {
            this.npcs = [];
        }
    },
    
    setupNPCCycles() {
        // Daily routines
        setInterval(() => {
            this.updateNPCTimers();
        }, 60000); // Every minute
        
        // Spawn check
        setInterval(() => {
            this.checkNPCSpawns();
        }, 10000); // Every 10 seconds
    },
    
    updateNPCTimers() {
        this.npcs.forEach(npc => {
            if (npc.visits) {
                npc.timeRemaining -= 60;
                if (npc.timeRemaining <= 0) {
                    this.removeNPC(npc.id);
                }
            }
        });
    },
    
    checkNPCSpawns() {
        Object.values(this.definitions).forEach(def => {
            const exists = this.npcs.find(n => n.id === def.id);
            if (!exists && def.spawnCondition && def.spawnCondition()) {
                this.spawnNPC(def);
            }
        });
    },
    
    spawnNPC(def) {
        const npc = {
            ...def,
            instanceId: this.npcIdCounter++,
            x: 0,
            y: 0,
            homeX: null,
            homeY: null,
            happiness: 0.5,
            timeRemaining: def.staysFor || Infinity,
            currentDialogue: def.dialogue[0]
        };
        
        this.npcs.push(npc);
        this.saveNPCs();
        
        showFloatingText(`${npc.name} has arrived!`, window.innerWidth / 2, 100, '#44FF88');
    },
    
    removeNPC(instanceId) {
        this.npcs = this.npcs.filter(n => n.instanceId !== instanceId);
        this.saveNPCs();
    },
    
    saveNPCs() {
        localStorage.setItem('cursed_depths_npcs', JSON.stringify(this.npcs));
    },
    
    update(dt, player) {
        this.npcs.forEach(npc => {
            this.updateNPCBehavior(npc, dt, player);
        });
    },
    
    updateNPCBehavior(npc, dt, player) {
        // AI routines
        if (!npc.homeX) {
            this.assignHome(npc);
        }
        
        // Move towards home at night
        const hour = getGameHour();
        if (hour > 18 || hour < 6) {
            this.moveTowardsHome(npc, dt);
        } else {
            this.wanderAround(npc, dt);
        }
        
        // Update happiness based on biome and neighbors
        this.updateHappiness(npc);
    },
    
    assignHome(npc) {
        const house = findSuitableHouse();
        if (house) {
            npc.homeX = house.x;
            npc.homeY = house.y;
        }
    },
    
    moveTowardsHome(npc, dt) {
        if (!npc.homeX) return;
        
        const dx = npc.homeX - npc.x;
        const dy = npc.homeY - npc.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 10) {
            npc.x += (dx / dist) * 2;
            npc.y += (dy / dist) * 2;
        }
    },
    
    wanderAround(npc, dt) {
        npc.wanderTimer = (npc.wanderTimer || 0) + dt;
        
        if (npc.wanderTimer > 2) {
            npc.wanderDirection = Math.random() * Math.PI * 2;
            npc.wanderTimer = 0;
        }
        
        npc.x += Math.cos(npc.wanderDirection) * 0.5;
        npc.y += Math.sin(npc.wanderDirection) * 0.5;
    },
    
    updateHappiness(npc) {
        let happiness = 0.5;
        
        // Biome preference
        const currentBiome = getBiomeAt(npc.x, npc.y);
        if (currentBiome === npc.biomePreference) {
            happiness += 0.2;
        } else if (npc.biomeDislikes && npc.biomeDislikes.includes(currentBiome)) {
            happiness -= 0.2;
        }
        
        // Neighbor bonuses
        const neighbors = this.getNearbyNPCs(npc, 100);
        neighbors.forEach(neighbor => {
            if (npc.neighborLikes && npc.neighborLikes.includes(neighbor.id)) {
                happiness += 0.1;
            }
            if (npc.neighborDislikes && npc.neighborDislikes.includes(neighbor.id)) {
                happiness -= 0.1;
            }
        });
        
        npc.happiness = Math.max(0, Math.min(1, happiness));
    },
    
    getNearbyNPCs(npc, radius) {
        return this.npcs.filter(other => {
            if (other.instanceId === npc.instanceId) return false;
            const dx = other.x - npc.x;
            const dy = other.y - npc.y;
            return Math.sqrt(dx * dx + dy * dy) < radius;
        });
    },
    
    interactWithNPC(npc, player) {
        const dist = Math.sqrt((player.x - npc.x) ** 2 + (player.y - npc.y) ** 2);
        if (dist < 60) {
            showDialogue(npc.name, npc.currentDialogue);
            
            // Random dialogue variation
            if (Math.random() < 0.3) {
                npc.currentDialogue = npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
            }
            
            return true;
        }
        return false;
    },
    
    render(ctx, camX, camY) {
        this.npcs.forEach(npc => {
            const screenX = npc.x - camX;
            const screenY = npc.y - camY;
            
            // Only render if on screen
            if (screenX < -50 || screenX > window.innerWidth + 50 ||
                screenY < -50 || screenY > window.innerHeight + 50) {
                return;
            }
            
            // Draw NPC sprite
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(npc.sprite, screenX, screenY);
            
            // Draw name
            ctx.font = '12px Inter';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(npc.name, screenX, screenY - 35);
            
            // Draw happiness indicator
            const happinessWidth = 30;
            const happinessHeight = 4;
            ctx.fillStyle = '#333333';
            ctx.fillRect(screenX - happinessWidth / 2, screenY - 45, happinessWidth, happinessHeight);
            ctx.fillStyle = this.getHappinessColor(npc.happiness);
            ctx.fillRect(screenX - happinessWidth / 2, screenY - 45, happinessWidth * npc.happiness, happinessHeight);
        });
    },
    
    getHappinessColor(happiness) {
        if (happiness > 0.7) return '#44FF44'; // Green
        if (happiness > 0.4) return '#FFFF44'; // Yellow
        return '#FF4444'; // Red
    }
};

// Export globally
window.NPCSystem = NPCSystem;

console.log('👥 Phase 6: NPC Overhaul loaded - 30 NPCs ready');
