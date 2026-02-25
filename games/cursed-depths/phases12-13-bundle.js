/* ============================================================
   CURSED DEPTHS - PHASES 12-13 BUNDLE
   Factions | Reputation | Housing Overhaul
   ============================================================ */

// ===== PHASE 12: FACTION SYSTEM =====
const FactionSystem = {
    factions: {},
    
    init() {
        console.log('🏛️ Phase 12: Faction System initialized');
        this.defineFactions();
        this.loadReputation();
    },
    
    defineFactions() {
        this.factions = {
            // MAJOR FACTIONS
            guides_guild: {
                id: 'guides_guild',
                name: 'Guides Guild',
                description: 'Protectors of knowledge and travelers',
                icon: '📚',
                color: '#4488FF',
                startingRep: 0,
                maxRep: 10000,
                tiers: [
                    { name: 'Stranger', threshold: 0 },
                    { name: 'Acquaintance', threshold: 1000 },
                    { name: 'Ally', threshold: 3000 },
                    { name: 'Friend', threshold: 5000 },
                    { name: 'Champion', threshold: 7500 },
                    { name: 'Legend', threshold: 10000 }
                ],
                rewards: {
                    1000: { item: 'guild_map', count: 1 },
                    3000: { item: 'compass', count: 1 },
                    5000: { item: 'magic_mirror', count: 1 },
                    7500: { item: 'guild_armor_set', count: 1 },
                    10000: { item: 'legendary_title', count: 1 }
                },
                quests: ['explore_biomes', 'discover_secrets', 'help_npcs']
            },
            
            merchants_guild: {
                id: 'merchants_guild',
                name: 'Merchants Guild',
                description: 'Masters of trade and commerce',
                icon: '💰',
                color: '#FFDD44',
                startingRep: 0,
                maxRep: 10000,
                tiers: [
                    { name: 'Customer', threshold: 0 },
                    { name: 'Regular', threshold: 1000 },
                    { name: 'VIP', threshold: 3000 },
                    { name: 'Platinum', threshold: 5000 },
                    { name: 'Diamond', threshold: 7500 },
                    { name: 'Tycoon', threshold: 10000 }
                ],
                rewards: {
                    1000: { item: 'discount_card', count: 1 },
                    3000: { item: 'gold_ring', count: 1 },
                    5000: { item: 'shop_discount_10', count: 1 },
                    7500: { item: 'midas_charm', count: 1 },
                    10000: { item: 'infinite_coins', count: 1 }
                },
                quests: ['earn_coins', 'buy_items', 'sell_loot']
            },
            
            hunters_lodge: {
                id: 'hunters_lodge',
                name: 'Hunters Lodge',
                description: 'Elite monster slayers',
                icon: '🏹',
                color: '#44FF44',
                startingRep: 0,
                maxRep: 10000,
                tiers: [
                    { name: 'Novice', threshold: 0 },
                    { name: 'Hunter', threshold: 1000 },
                    { name: 'Ranger', threshold: 3000 },
                    { name: 'Tracker', threshold: 5000 },
                    { name: 'Slayer', threshold: 7500 },
                    { name: 'Legend', threshold: 10000 }
                ],
                rewards: {
                    1000: { item: 'hunter_potion', count: 5 },
                    3000: { item: 'rangers_bow', count: 1 },
                    5000: { item: 'tracking_scope', count: 1 },
                    7500: { item: 'slayer_armor', count: 1 },
                    10000: { item: 'ultimate_hunter_title', count: 1 }
                },
                quests: ['defeat_bosses', 'hunt_rare_enemies', 'collect_trophies']
            },
            
            mages_circle: {
                id: 'mages_circle',
                name: 'Circle of Mages',
                description: 'Keepers of arcane knowledge',
                icon: '🔮',
                color: '#AA44FF',
                startingRep: 0,
                maxRep: 10000,
                tiers: [
                    { name: 'Apprentice', threshold: 0 },
                    { name: 'Acolyte', threshold: 1000 },
                    { name: 'Mage', threshold: 3000 },
                    { name: 'Warlock', threshold: 5000 },
                    { name: 'Archmage', threshold: 7500 },
                    { name: 'Sage', threshold: 10000 }
                ],
                rewards: {
                    1000: { item: 'mana_potion', count: 10 },
                    3000: { item: 'spell_book', count: 1 },
                    5000: { item: 'crystal_ball', count: 1 },
                    7500: { item: 'archmage_robes', count: 1 },
                    10000: { item: 'infinite_mana', count: 1 }
                },
                quests: ['craft_spells', 'collect_mana_crystals', 'study_ancient_texts']
            },
            
            builders_guild: {
                id: 'builders_guild',
                name: 'Builders Guild',
                description: 'Masters of construction',
                icon: '🔨',
                color: '#FF8844',
                startingRep: 0,
                maxRep: 10000,
                tiers: [
                    { name: 'Laborer', threshold: 0 },
                    { name: 'Apprentice', threshold: 1000 },
                    { name: 'Builder', threshold: 3000 },
                    { name: 'Architect', threshold: 5000 },
                    { name: 'Master', threshold: 7500 },
                    { name: 'Grand Architect', threshold: 10000 }
                ],
                rewards: {
                    1000: { item: 'hammer', count: 1 },
                    3000: { item: 'blueprint_set', count: 1 },
                    5000: { item: 'portable_workbench', count: 1 },
                    7500: { item: 'architect_tools', count: 1 },
                    10000: { item: 'instant_build', count: 1 }
                },
                quests: ['build_houses', 'place_blocks', 'create_structures']
            },
            
            // EVIL FACTIONS
            corruption_forces: {
                id: 'corruption_forces',
                name: 'Corruption Forces',
                description: 'Servants of the void',
                icon: '💜',
                color: '#6600CC',
                startingRep: -1000,
                maxRep: 10000,
                evil: true,
                tiers: [
                    { name: 'Enemy', threshold: -1000 },
                    { name: 'Neutral', threshold: 0 },
                    { name: 'Servant', threshold: 2000 },
                    { name: 'Cultist', threshold: 5000 },
                    { name: 'Avatar', threshold: 8000 },
                    { name: 'Embodiment', threshold: 10000 }
                ],
                rewards: {
                    2000: { item: 'shadow_armor', count: 1 },
                    5000: { item: 'demon_scythe', count: 1 },
                    8000: { item: 'void_wings', count: 1 },
                    10000: { item: 'corruption_lord_title', count: 1 }
                }
            },
            
            crimson_forces: {
                id: 'crimson_forces',
                name: 'Crimson Forces',
                description: 'Disciples of flesh',
                icon: '❤️',
                color: '#CC0000',
                startingRep: -1000,
                maxRep: 10000,
                evil: true,
                tiers: [
                    { name: 'Enemy', threshold: -1000 },
                    { name: 'Neutral', threshold: 0 },
                    { name: 'Thrall', threshold: 2000 },
                    { name: 'Harbinger', threshold: 5000 },
                    { name: 'Fleshbringer', threshold: 8000 },
                    { name: 'Crimson God', threshold: 10000 }
                ],
                rewards: {
                    2000: { item: 'crimson_armor', count: 1 },
                    5000: { item: 'flesh_grinder', count: 1 },
                    8000: { item: 'blood_wings', count: 1 },
                    10000: { item: 'crimson_lord_title', count: 1 }
                }
            }
        };
    },
    
    loadReputation() {
        const saved = localStorage.getItem('cursed_depths_factions');
        if (saved) {
            const data = JSON.parse(saved);
            Object.entries(data).forEach(([factionId, rep]) => {
                if (this.factions[factionId]) {
                    this.factions[factionId].currentRep = rep;
                }
            });
        } else {
            // Initialize starting reputation
            Object.values(this.factions).forEach(faction => {
                faction.currentRep = faction.startingRep;
            });
        }
    },
    
    saveReputation() {
        const data = {};
        Object.values(this.factions).forEach(faction => {
            data[faction.id] = faction.currentRep;
        });
        localStorage.setItem('cursed_depths_factions', JSON.stringify(data));
    },
    
    modifyReputation(factionId, amount) {
        const faction = this.factions[factionId];
        if (!faction) return;
        
        const oldTier = this.getFactionTier(faction);
        faction.currentRep = Math.max(-1000, Math.min(faction.maxRep, faction.currentRep + amount));
        
        const newTier = this.getFactionTier(faction);
        
        if (newTier !== oldTier) {
            this.onTierChange(faction, newTier);
        }
        
        this.saveReputation();
    },
    
    getFactionTier(faction) {
        for (let i = faction.tiers.length - 1; i >= 0; i--) {
            if (faction.currentRep >= faction.tiers[i].threshold) {
                return faction.tiers[i].name;
            }
        }
        return faction.tiers[0].name;
    },
    
    onTierChange(faction, newTier) {
        showBossMessage(`${faction.name}: ${newTier}`, faction.color);
        
        // Check for tier rewards
        const threshold = faction.tiers.find(t => t.name === newTier)?.threshold;
        if (threshold && faction.rewards[threshold]) {
            const reward = faction.rewards[threshold];
            giveItem(reward.item, reward.count);
            showFloatingText(`Reward: ${reward.item} x${reward.count}`, window.innerWidth / 2, 200, '#FFDD44');
        }
    },
    
    getShopDiscount(factionId) {
        const faction = this.factions[factionId];
        if (!faction) return 0;
        
        const tier = this.getFactionTier(faction);
        const tierIndex = faction.tiers.findIndex(t => t.name === tier);
        
        // 5% discount per tier after neutral
        return Math.max(0, (tierIndex - 1) * 5);
    },
    
    renderUI(ctx) {
        let y = 60;
        
        Object.values(this.factions).forEach(faction => {
            const tier = this.getFactionTier(faction);
            
            // Faction name and tier
            ctx.fillStyle = faction.color;
            ctx.font = 'bold 12px Inter';
            ctx.fillText(`${faction.icon} ${faction.name}: ${tier}`, 20, y);
            
            // Reputation bar
            const barWidth = 200;
            const barHeight = 10;
            const repPercent = (faction.currentRep + 1000) / (faction.maxRep + 1000);
            
            ctx.fillStyle = '#333333';
            ctx.fillRect(20, y + 5, barWidth, barHeight);
            
            ctx.fillStyle = faction.color;
            ctx.fillRect(20, y + 5, barWidth * repPercent, barHeight);
            
            y += 35;
        });
    }
};

// ===== PHASE 13: HOUSING OVERHAUL =====
const HousingSystem = {
    houses: [],
    housingMode: false,
    selectedBlock: null,
    
    init() {
        console.log('🏠 Phase 13: Housing Overhaul initialized');
        this.loadHouses();
    },
    
    loadHouses() {
        const saved = localStorage.getItem('cursed_depths_houses');
        if (saved) {
            this.houses = JSON.parse(saved);
        }
    },
    
    saveHouses() {
        localStorage.setItem('cursed_depths_houses', JSON.stringify(this.houses));
    },
    
    toggleHousingMode() {
        this.housingMode = !this.housingMode;
        
        if (this.housingMode) {
            showFloatingText('Housing Mode: ON', window.innerWidth / 2, 100, '#44FF88');
            this.showHousingUI();
        } else {
            showFloatingText('Housing Mode: OFF', window.innerWidth / 2, 100, '#FF4444');
            this.hideHousingUI();
        }
    },
    
    showHousingUI() {
        const ui = document.createElement('div');
        ui.id = 'housing-ui';
        ui.style.cssText = `
            position: absolute;
            right: 20px;
            top: 20px;
            width: 250px;
            background: rgba(0,0,0,0.8);
            border: 2px solid #FFDD44;
            border-radius: 10px;
            padding: 15px;
            color: white;
            font-family: Inter, sans-serif;
            z-index: 10000;
        `;
        
        ui.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #FFDD44;">🏠 Housing Menu</h3>
            <button onclick="HousingSystem.placeRoom()" style="width: 100%; margin: 5px 0; padding: 8px; background: #4488FF; border: none; border-radius: 5px; color: white; cursor: pointer;">Place Room</button>
            <button onclick="HousingSystem.addDecoration()" style="width: 100%; margin: 5px 0; padding: 8px; background: #44FF44; border: none; border-radius: 5px; color: white; cursor: pointer;">Add Decoration</button>
            <button onclick="HousingSystem.assignNPC()" style="width: 100%; margin: 5px 0; padding: 8px; background: #FF8844; border: none; border-radius: 5px; color: white; cursor: pointer;">Assign NPC</button>
            <button onclick="HousingSystem.toggleHousingMode()" style="width: 100%; margin: 5px 0; padding: 8px; background: #FF4444; border: none; border-radius: 5px; color: white; cursor: pointer;">Exit Mode</button>
            
            <div style="margin-top: 15px; border-top: 1px solid #666; pt: 10px;">
                <strong>Houses: ${this.houses.length}</strong><br>
                <small>Total Rooms: ${this.getTotalRooms()}</small>
            </div>
        `;
        
        document.getElementById('game-container').appendChild(ui);
    },
    
    hideHousingUI() {
        const ui = document.getElementById('housing-ui');
        if (ui) ui.remove();
    },
    
    placeRoom() {
        // Grid-based placement
        const gridX = Math.floor((player.x + cam.x) / 16) * 16;
        const gridY = Math.floor((player.y + cam.y) / 16) * 16;
        
        const room = {
            x: gridX,
            y: gridY,
            width: 192, // 12 tiles
            height: 128, // 8 tiles
            walls: 'wood',
            floor: 'planks',
            bgWall: 'stone',
            furniture: []
        };
        
        this.houses.push(room);
        this.saveHouses();
        
        showFloatingText('Room Placed!', player.x, player.y - 50, '#44FF88');
    },
    
    addDecoration() {
        // Show decoration menu
        const decorations = [
            { name: 'Table', sprite: '🪑' },
            { name: 'Chair', sprite: '🪑' },
            { name: 'Bed', sprite: '🛏️' },
            { name: 'Bookshelf', sprite: '📚' },
            { name: 'Painting', sprite: '🖼️' },
            { name: 'Lamp', sprite: '🏮' },
            { name: 'Plant', sprite: '🌿' },
            { name: 'Chest', sprite: '📦' }
        ];
        
        // Simple implementation - cycles through decorations
        if (!this.selectedDecoration) {
            this.selectedDecoration = decorations[0];
        } else {
            const index = decorations.indexOf(this.selectedDecoration);
            this.selectedDecoration = decorations[(index + 1) % decorations.length];
        }
        
        showFloatingText(`Selected: ${this.selectedDecoration.name}`, player.x, player.y - 50, '#FFDD44');
    },
    
    assignNPC() {
        // Show NPC assignment menu
        const availableNPCs = NPCSystem.npcs.filter(npc => !npc.homeX);
        
        if (availableNPCs.length === 0) {
            showFloatingText('No unassigned NPCs!', player.x, player.y - 50, '#FF4444');
            return;
        }
        
        // Assign first available NPC to nearest house
        const npc = availableNPCs[0];
        const nearestHouse = this.findNearestHouse(player.x, player.y);
        
        if (nearestHouse) {
            npc.homeX = nearestHouse.x + nearestHouse.width / 2;
            npc.homeY = nearestHouse.y + nearestHouse.height / 2;
            
            showFloatingText(`${npc.name} assigned!`, player.x, player.y - 50, '#44FF88');
        }
    },
    
    findNearestHouse(x, y) {
        let nearest = null;
        let minDist = Infinity;
        
        this.houses.forEach(house => {
            const dist = Math.sqrt((house.x - x) ** 2 + (house.y - y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                nearest = house;
            }
        });
        
        return nearest;
    },
    
    getTotalRooms() {
        return this.houses.length;
    },
    
    validateHouse(house) {
        // Check if house is valid for NPC occupancy
        const requirements = {
            minSize: 60, // 5x10 tiles minimum
            hasWalls: true,
            hasLight: false,
            hasComfort: false
        };
        
        const area = house.width * house.height / (16 * 16);
        
        if (area < requirements.minSize) {
            return { valid: false, reason: 'Too small' };
        }
        
        return { valid: true };
    },
    
    render(ctx, camX, camY) {
        // Render houses
        this.houses.forEach(house => {
            const screenX = house.x - camX;
            const screenY = house.y - camY;
            
            // Only render if on screen
            if (screenX + house.width < 0 || screenX > window.innerWidth ||
                screenY + house.height < 0 || screenY > window.innerHeight) {
                return;
            }
            
            // Draw walls
            ctx.strokeStyle = '#8B6914';
            ctx.lineWidth = 4;
            ctx.strokeRect(screenX, screenY, house.width, house.height);
            
            // Draw floor pattern
            ctx.fillStyle = '#D4A017';
            ctx.fillRect(screenX + 4, screenY + house.height - 4, house.width - 8, 4);
            
            // Draw furniture
            if (house.furniture) {
                house.furniture.forEach(item => {
                    ctx.font = '24px Arial';
                    ctx.fillText(item.sprite, screenX + item.x, screenY + item.y);
                });
            }
            
            // Draw assigned NPC indicator
            const assignedNPC = NPCSystem.npcs.find(npc => 
                npc.homeX === house.x + house.width / 2
            );
            
            if (assignedNPC) {
                ctx.font = '16px Arial';
                ctx.fillText(assignedNPC.sprite, screenX + house.width / 2, screenY - 10);
            }
        });
        
        // Render placement preview in housing mode
        if (this.housingMode) {
            const gridX = Math.floor((player.x + cam.x) / 16) * 16;
            const gridY = Math.floor((player.y + cam.y) / 16) * 16;
            
            ctx.strokeStyle = '#44FF88';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(gridX - camX, gridY - camY, 192, 128);
            ctx.setLineDash([]);
        }
    }
};

// Export globally
window.FactionSystem = FactionSystem;
window.HousingSystem = HousingSystem;

console.log('🏛️ Phases 12-13 loaded: Factions & Housing');
