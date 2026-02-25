/* ============================================================
   CURSED DEPTHS - PHASE 26: LORE & BESTIARY COMPLETION
   Encyclopedia System | Creature Database | Lore Collection
   ============================================================ */

// ===== LORE & BESTIARY SYSTEM =====
const LoreBestiarySystem = {
    entries: {},
    discoveredCreatures: new Set(),
    discoveredItems: new Set(),
    discoveredLocations: new Set(),
    loreFragments: [],
    completionPercentage: 0,
    
    init() {
        console.log('📚 Phase 26: Lore & Bestiary System initialized');
        this.defineBestiary();
        this.defineLore();
        this.loadProgress();
    },
    
    defineBestiary() {
        this.entries = {
            // ENEMIES
            creatures: {
                slime: {
                    id: 'slime',
                    name: 'Slime',
                    category: 'creature',
                    description: 'Gelatinous organisms that come in various colors',
                    habitat: ['forest', 'caves'],
                    danger: 'low',
                    drops: ['gel', 'slime_staff'],
                    stats: { hp: 50, damage: 10, defense: 5 },
                    lore: 'Simple creatures formed from magical residue',
                    discovered: false,
                    killsRequired: 1,
                    image: '💚'
                },
                zombie: {
                    id: 'zombie',
                    name: 'Zombie',
                    category: 'undead',
                    description: 'Reanimated corpses that roam at night',
                    habitat: ['forest', 'graveyard'],
                    danger: 'low',
                    drops: ['rotting_flesh', 'zombie_brain'],
                    stats: { hp: 80, damage: 15, defense: 8 },
                    lore: 'Victims of the necromantic curse plaguing the land',
                    discovered: false,
                    killsRequired: 1,
                    image: '🧟'
                },
                demon: {
                    id: 'demon',
                    name: 'Demon',
                    category: 'fiend',
                    description: 'Infernal beings from the underworld',
                    habitat: ['underworld', 'corruption'],
                    danger: 'high',
                    drops: ['demon_horn', 'infernal_essence'],
                    stats: { hp: 200, damage: 40, defense: 20 },
                    lore: 'Servants of the Demon Lord, seeking to corrupt all life',
                    discovered: false,
                    killsRequired: 1,
                    image: '👿'
                },
                
                // BOSSES
                eye_of_terror: {
                    id: 'eye_of_terror',
                    name: 'Eye of Terror',
                    category: 'boss',
                    description: 'A massive eyeball that watches from the darkness',
                    habitat: ['night_sky'],
                    danger: 'extreme',
                    drops: ['eye_trophy', 'terrifying_gaze'],
                    stats: { hp: 2800, damage: 60, defense: 30 },
                    lore: 'The first guardian, created to watch over the corrupted lands',
                    discovered: false,
                    killsRequired: 1,
                    image: '👁️',
                    phases: ['normal', 'enraged']
                },
                bone_colossus: {
                    id: 'bone_colossus',
                    name: 'Bone Colossus',
                    category: 'boss',
                    description: 'A towering skeleton warrior of immense power',
                    habitat: ['catacombs'],
                    danger: 'extreme',
                    drops: ['bone_trophy', 'ancient_bone'],
                    stats: { hp: 4200, damage: 80, defense: 40 },
                    lore: 'An ancient king cursed to guard his tomb for eternity',
                    discovered: false,
                    killsRequired: 1,
                    image: '💀',
                    phases: ['phase1', 'enraged']
                },
                
                // RARE CREATURES
                nymph: {
                    id: 'nymph',
                    name: 'Nymph',
                    category: 'rare_creature',
                    description: 'Elusive forest spirits rarely seen by mortals',
                    habitat: ['jungle'],
                    danger: 'medium',
                    drops: ['nymph_hair', 'nature_essence'],
                    stats: { hp: 150, damage: 30, defense: 15 },
                    lore: 'Guardians of the natural world, they avoid civilization',
                    discovered: false,
                    killsRequired: 1,
                    image: '🧚',
                    rare: true
                },
                tim: {
                    id: 'tim',
                    name: 'Tim',
                    category: 'rare_creature',
                    description: 'There are some who call him... Tim?',
                    habitat: ['caverns'],
                    danger: 'high',
                    drops: ['tims_head', 'wizards_hat'],
                    stats: { hp: 300, damage: 50, defense: 25 },
                    lore: 'A mysterious wizard with a questionable past',
                    discovered: false,
                    killsRequired: 1,
                    image: '🧙',
                    rare: true,
                    secret: true
                }
            },
            
            // ITEMS
            items: {
                terra_blade: {
                    id: 'terra_blade',
                    name: 'Terra Blade',
                    category: 'weapon',
                    subtype: 'sword',
                    description: 'The ultimate blade forged from pure nature energy',
                    rarity: 'legendary',
                    stats: { damage: 85, speed: 3, range: 70 },
                    lore: 'Crafted from the essence of the world itself',
                    discovered: false,
                    acquisition: 'Craft from True Excalibur + Broken Hero Sword',
                    image: '⚔️'
                },
                celestial_shell: {
                    id: 'celestial_shell',
                    name: 'Celestial Shell',
                    category: 'accessory',
                    description: 'A mystical shell containing cosmic power',
                    rarity: 'legendary',
                    stats: { allStats: 10 },
                    lore: 'Fragment of a fallen star, pulsing with otherworldly energy',
                    discovered: false,
                    acquisition: 'Drop from Moon Lord',
                    image: '🐚'
                }
            },
            
            // LOCATIONS
            locations: {
                corrupted_lands: {
                    id: 'corrupted_lands',
                    name: 'Corrupted Lands',
                    category: 'biome',
                    description: 'Twisted wasteland consumed by dark energy',
                    features: ['chasms', 'shadow_orbs', 'corrupt_monsters'],
                    danger: 'high',
                    lore: 'Where the void first touched our world, corruption spreads eternally',
                    discovered: false,
                    image: '💜'
                },
                celestial_realm: {
                    id: 'celestial_realm',
                    name: 'Celestial Realm',
                    category: 'special_biome',
                    description: 'Otherworldly dimension where stars are born',
                    features: ['star_columns', 'nebula_clouds', 'cosmic_entities'],
                    danger: 'extreme',
                    lore: 'The birthplace of creation, where cosmic forces shape reality',
                    discovered: false,
                    image: '🌌'
                }
            }
        };
        
        // Calculate total entries
        this.totalEntries = {
            creatures: Object.keys(this.entries.creatures).length,
            items: Object.keys(this.entries.items).length,
            locations: Object.keys(this.entries.locations).length
        };
    },
    
    defineLore() {
        this.loreFragments = [
            {
                id: 'creation_myth',
                title: 'The Creation Myth',
                text: 'In the beginning, there was only void. Then came the First Light, and from it sprang the world...',
                location: 'ancient_tablet',
                required: false
            },
            {
                id: 'demon_lord_origin',
                title: 'Rise of the Demon Lord',
                text: 'Once a mortal sorcerer, he sought power beyond death. His ambition tore the veil between worlds...',
                location: 'demon_altar',
                required: true
            },
            {
                id: 'great_corruption',
                title: 'The Great Corruption',
                text: 'When the seal broke, darkness poured forth. The land twisted, mutated, became something else...',
                location: 'corruption_shrine',
                required: true
            },
            {
                id: 'hero_prophecy',
                title: 'Prophecy of the Hero',
                text: 'When darkness consumes all, one shall rise from humble beginnings to restore balance...',
                location: 'village_elder',
                required: true
            }
        ];
    },
    
    loadProgress() {
        const saved = localStorage.getItem('cursed_depths_bestiary');
        if (saved) {
            const data = JSON.parse(saved);
            this.discoveredCreatures = new Set(data.creatures || []);
            this.discoveredItems = new Set(data.items || []);
            this.discoveredLocations = new Set(data.locations || []);
            this.collectedLore = data.lore || [];
            
            // Mark entries as discovered
            this.discoveredCreatures.forEach(id => {
                if (this.entries.creatures[id]) {
                    this.entries.creatures[id].discovered = true;
                }
            });
        }
    },
    
    saveProgress() {
        const data = {
            creatures: [...this.discoveredCreatures],
            items: [...this.discoveredItems],
            locations: [...this.discoveredLocations],
            lore: this.collectedLore || []
        };
        localStorage.setItem('cursed_depths_bestiary', JSON.stringify(data));
        this.calculateCompletion();
    },
    
    discoverCreature(creatureId) {
        if (!this.entries.creatures[creatureId]) return;
        
        if (!this.discoveredCreatures.has(creatureId)) {
            this.discoveredCreatures.add(creatureId);
            this.entries.creatures[creatureId].discovered = true;
            showFloatingText(`📖 Creature Discovered: ${this.entries.creatures[creatureId].name}`, window.innerWidth / 2, 150, '#44FF88');
            this.saveProgress();
        }
        
        // Track kills
        this.entries.creatures[creatureId].kills = (this.entries.creatures[creatureId].kills || 0) + 1;
    },
    
    discoverItem(itemId) {
        if (!this.entries.items[itemId]) return;
        
        if (!this.discoveredItems.has(itemId)) {
            this.discoveredItems.add(itemId);
            this.entries.items[itemId].discovered = true;
            showFloatingText(`📦 Item Discovered: ${this.entries.items[itemId].name}`, window.innerWidth / 2, 150, '#4488FF');
            this.saveProgress();
        }
    },
    
    discoverLocation(locationId) {
        if (!this.entries.locations[locationId]) return;
        
        if (!this.discoveredLocations.has(locationId)) {
            this.discoveredLocations.add(locationId);
            this.entries.locations[locationId].discovered = true;
            showFloatingText(`🗺️ Location Discovered: ${this.entries.locations[locationId].name}`, window.innerWidth / 2, 150, '#FFDD44');
            this.saveProgress();
        }
    },
    
    collectLoreFragment(fragmentId) {
        const fragment = this.loreFragments.find(f => f.id === fragmentId);
        if (!fragment) return;
        
        if (!this.collectedLore?.includes(fragmentId)) {
            if (!this.collectedLore) this.collectedLore = [];
            this.collectedLore.push(fragmentId);
            
            showBossMessage(`📜 Lore Fragment: ${fragment.title}`, '#AA44FF');
            this.showLoreText(fragment);
            this.saveProgress();
        }
    },
    
    showLoreText(fragment) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            font-family: 'Inter', sans-serif;
        `;
        
        modal.innerHTML = `
            <div style="max-width: 600px; padding: 40px; background: #1a1a2e; border: 2px solid #AA44FF; border-radius: 10px;">
                <h2 style="color: #AA44FF; margin-bottom: 20px;">${fragment.title}</h2>
                <p style="color: #FFFFFF; line-height: 1.8; font-size: 16px;">${fragment.text}</p>
                <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 30px; padding: 10px 30px; background: #AA44FF; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    calculateCompletion() {
        const total = this.totalEntries.creatures + this.totalEntries.items + this.totalEntries.locations;
        const discovered = this.discoveredCreatures.size + this.discoveredItems.size + this.discoveredLocations.size;
        this.completionPercentage = ((discovered / total) * 100).toFixed(1);
    },
    
    renderBestiaryUI(ctx) {
        const startX = 100;
        const startY = 100;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillRect(startX, startY, 800, 600);
        
        // Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('📚 Bestiary & Lore', startX + 400, startY + 40);
        
        // Completion
        ctx.font = '16px Inter';
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText(`Completion: ${this.completionPercentage}%`, startX + 400, startY + 70);
        
        // Categories
        const categories = ['creatures', 'items', 'locations'];
        let x = startX + 40;
        let y = startY + 110;
        
        categories.forEach(category => {
            ctx.fillStyle = '#FFDD44';
            ctx.font = 'bold 18px Inter';
            ctx.textAlign = 'left';
            ctx.fillText(category.toUpperCase(), x, y);
            
            y += 30;
            
            const entries = this.entries[category];
            Object.values(entries).forEach(entry => {
                ctx.globalAlpha = entry.discovered ? 1.0 : 0.4;
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '14px Inter';
                ctx.fillText(`${entry.image} ${entry.name}`, x + 10, y);
                
                // Show kill count for creatures
                if (category === 'creatures' && entry.kills) {
                    ctx.fillStyle = '#AAAAAA';
                    ctx.font = '12px Inter';
                    ctx.fillText(`(${entry.kills} defeated)`, x + 200, y);
                }
                
                y += 22;
            });
            
            ctx.globalAlpha = 1.0;
            x += 280;
            y = startY + 110;
        });
    },
    
    getCompletionRewards() {
        const rewards = [];
        
        if (this.completionPercentage >= 25) {
            rewards.push({ name: 'Novice Scholar', type: 'title' });
        }
        if (this.completionPercentage >= 50) {
            rewards.push({ name: 'Expert Naturalist', type: 'title' });
        }
        if (this.completionPercentage >= 75) {
            rewards.push({ name: 'Master Loremaster', type: 'title' });
        }
        if (this.completionPercentage >= 100) {
            rewards.push({ name: 'Legendary Scholar', type: 'title', item: 'encyclopedia_of_knowledge' });
        }
        
        return rewards;
    }
};

// Export globally
window.LoreBestiarySystem = LoreBestiarySystem;

console.log('📚 Phase 26: Lore & Bestiary System loaded');
