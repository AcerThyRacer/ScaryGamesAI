/* ============================================================
   CURSED DEPTHS - PHASE 18: TROPHY & BANNER COLLECTION
   Completion Tracking | Rare Drops | Display System
   ============================================================ */

// ===== TROPHY SYSTEM =====
const TrophySystem = {
    trophies: {},
    banners: {},
    displayCases: [],
    
    init() {
        console.log('🏆 Phase 18: Trophy & Banner Collection initialized');
        this.defineTrophies();
        this.defineBanners();
        this.loadCollection();
    },
    
    defineTrophies() {
        this.trophies = {
            // BOSS TROPHIES
            eye_trophy: {
                id: 'eye_trophy',
                name: 'Eye of Terror Trophy',
                description: 'Defeated the Eye of Terror',
                rarity: 'common',
                type: 'boss',
                icon: '👁️',
                source: 'eye_of_terror',
                dropChance: 0.1
            },
            bone_trophy: {
                id: 'bone_trophy',
                name: 'Bone Colossus Trophy',
                description: 'Defeated the Bone Colossus',
                rarity: 'common',
                type: 'boss',
                icon: '💀',
                source: 'bone_colossus',
                dropChance: 0.1
            },
            demon_trophy: {
                id: 'demon_trophy',
                name: 'Demon Lord Trophy',
                description: 'Defeated the Demon Lord',
                rarity: 'uncommon',
                type: 'boss',
                icon: '👿',
                source: 'demon_lord',
                dropChance: 0.1
            },
            hive_trophy: {
                id: 'hive_trophy',
                name: 'Hive Queen Trophy',
                description: 'Defeated the Hive Queen',
                rarity: 'uncommon',
                type: 'boss',
                icon: '🐝',
                source: 'hive_queen',
                dropChance: 0.1
            },
            frost_trophy: {
                id: 'frost_trophy',
                name: 'Frost Titan Trophy',
                description: 'Defeated the Frost Titan',
                rarity: 'uncommon',
                type: 'boss',
                icon: '❄️',
                source: 'frost_titan',
                dropChance: 0.1
            },
            
            // RARE ENEMY TROPHIES
            nymph_trophy: {
                id: 'nymph_trophy',
                name: 'Nymph Trophy',
                description: 'Defeated the rare Nymph',
                rarity: 'rare',
                type: 'rare_enemy',
                icon: '🧚',
                source: 'nymph',
                dropChance: 0.01
            },
            tim_trophy: {
                id: 'tim_trophy',
                name: 'Tim Trophy',
                description: 'There are some who call him...',
                rarity: 'rare',
                type: 'rare_enemy',
                icon: '🧙',
                source: 'tim',
                dropChance: 0.005
            },
            pinky_trophy: {
                id: 'pinky_trophy',
                name: 'Pinky Trophy',
                description: 'Defeated the lucky Pinky',
                rarity: 'rare',
                type: 'rare_enemy',
                icon: '💗',
                source: 'pinky',
                dropChance: 0.003
            },
            
            // ACHIEVEMENT TROPHIES
            slayer_trophy: {
                id: 'slayer_trophy',
                name: 'Slayer of Worlds',
                description: 'Defeated all main bosses',
                rarity: 'epic',
                type: 'achievement',
                icon: '🏆',
                requirements: {
                    bosses_defeated: ['eye', 'bone', 'demon', 'hive', 'frost']
                }
            },
            explorer_trophy: {
                id: 'explorer_trophy',
                name: 'Explorer Trophy',
                description: 'Discovered all biomes',
                rarity: 'epic',
                type: 'achievement',
                icon: '🗺️',
                requirements: {
                    biomes_discovered: 20
                }
            },
            collector_trophy: {
                id: 'collector_trophy',
                name: 'Collector Trophy',
                description: 'Obtained every item',
                rarity: 'legendary',
                type: 'achievement',
                icon: '📦',
                requirements: {
                    items_collected: 'all'
                }
            },
            master_trophy: {
                id: 'master_trophy',
                name: 'Master Trophy',
                description: 'Completed all challenges',
                rarity: 'legendary',
                type: 'achievement',
                icon: '👑',
                requirements: {
                    all_trophies: true
                }
            }
        };
    },
    
    defineBanners() {
        this.banners = {
            // ENEMY BANNERS (dropped by enemies)
            slime_banner: {
                id: 'slime_banner',
                name: 'Slime Banner',
                description: '40 slimes defeated',
                type: 'enemy',
                enemy: 'slime',
                killRequirement: 40,
                icon: '💚',
                color: '#44FF44'
            },
            zombie_banner: {
                id: 'zombie_banner',
                name: 'Zombie Banner',
                description: '40 zombies defeated',
                type: 'enemy',
                enemy: 'zombie',
                killRequirement: 40,
                icon: '🧟',
                color: '#44AA44'
            },
            demon_banner: {
                id: 'demon_banner',
                name: 'Demon Banner',
                description: '40 demons defeated',
                type: 'enemy',
                enemy: 'demon',
                killRequirement: 40,
                icon: '👿',
                color: '#AA44FF'
            },
            
            // BOSS BANNERS (guaranteed from bosses)
            eye_banner: {
                id: 'eye_banner',
                name: 'Eye of Terror Banner',
                description: 'Eye of Terror defeated',
                type: 'boss',
                boss: 'eye_of_terror',
                guaranteed: true,
                icon: '👁️',
                color: '#FF4444'
            },
            bone_banner: {
                id: 'bone_banner',
                name: 'Bone Colossus Banner',
                description: 'Bone Colossus defeated',
                type: 'boss',
                boss: 'bone_colossus',
                guaranteed: true,
                icon: '💀',
                color: '#AAAAAA'
            },
            
            // EVENT BANNERS
            goblin_army_banner: {
                id: 'goblin_army_banner',
                name: 'Goblin Army Banner',
                description: 'Defeated Goblin Army invasion',
                type: 'event',
                event: 'goblin_army',
                icon: '⚔️',
                color: '#44AA44'
            },
            pirate_banner: {
                id: 'pirate_banner',
                name: 'Pirate Invasion Banner',
                description: 'Defeated Pirate Invasion',
                type: 'event',
                event: 'pirate_invasion',
                icon: '🏴‍☠️',
                color: '#AA4444'
            },
            
            // FACTION BANNERS
            guild_banner: {
                id: 'guild_banner',
                name: 'Guilds United Banner',
                description: 'Reached Legend tier with all factions',
                type: 'faction',
                requirement: 'all_factions_legend',
                icon: '🎌',
                color: '#FFDD44'
            }
        };
    },
    
    loadCollection() {
        const saved = localStorage.getItem('cursed_depths_collection');
        if (saved) {
            const data = JSON.parse(saved);
            player.collectedTrophies = new Set(data.trophies || []);
            player.collectedBanners = new Set(data.banners || []);
            player.killCounts = data.killCounts || {};
        } else {
            player.collectedTrophies = new Set();
            player.collectedBanners = new Set();
            player.killCounts = {};
        }
    },
    
    saveCollection() {
        const data = {
            trophies: [...player.collectedTrophies],
            banners: [...player.collectedBanners],
            killCounts: player.killCounts
        };
        localStorage.setItem('cursed_depths_collection', JSON.stringify(data));
    },
    
    checkTrophyDrop(enemyId, isBoss = false) {
        // Check for trophy drops
        Object.values(this.trophies).forEach(trophy => {
            if (trophy.source === enemyId && Math.random() < trophy.dropChance) {
                this.awardTrophy(trophy.id);
            }
        });
        
        // Check for banner progress
        this.updateBannerProgress(enemyId);
    },
    
    awardTrophy(trophyId) {
        if (player.collectedTrophies.has(trophyId)) return;
        
        player.collectedTrophies.add(trophyId);
        this.saveCollection();
        
        const trophy = this.trophies[trophyId];
        showBossMessage(`🏆 Trophy Unlocked: ${trophy.name}`, this.getRarityColor(trophy.rarity));
        
        // Check for achievement trophies
        this.checkAchievementTrophies();
    },
    
    awardBanner(bannerId) {
        if (player.collectedBanners.has(bannerId)) return;
        
        player.collectedBanners.add(bannerId);
        this.saveCollection();
        
        const banner = this.banners[bannerId];
        showBossMessage(`🎌 Banner Unlocked: ${banner.name}`, banner.color);
    },
    
    updateBannerProgress(enemyId) {
        // Update kill count
        player.killCounts[enemyId] = (player.killCounts[enemyId] || 0) + 1;
        
        // Check for banner unlocks
        Object.values(this.banners).forEach(banner => {
            if (banner.enemy === enemyId && 
                player.killCounts[enemyId] >= banner.killRequirement) {
                this.awardBanner(banner.id);
            }
        });
    },
    
    checkAchievementTrophies() {
        // Slayer of Worlds
        const bossTrophies = ['eye_trophy', 'bone_trophy', 'demon_trophy', 'hive_trophy', 'frost_trophy'];
        if (bossTrophies.every(t => player.collectedTrophies.has(t))) {
            this.awardTrophy('slayer_trophy');
        }
        
        // Master Trophy (all trophies)
        const totalTrophies = Object.keys(this.trophies).length;
        if (player.collectedTrophies.size >= totalTrophies) {
            this.awardTrophy('master_trophy');
        }
    },
    
    getRarityColor(rarity) {
        const colors = {
            common: '#FFFFFF',
            uncommon: '#44FF44',
            rare: '#4488FF',
            epic: '#AA44FF',
            legendary: '#FFDD44'
        };
        return colors[rarity] || colors.common;
    },
    
    placeDisplayCase(x, y, width, height) {
        const displayCase = {
            id: this.generateId(),
            x, y, width, height,
            items: []
        };
        
        this.displayCases.push(displayCase);
        return displayCase;
    },
    
    placeItemInCase(caseId, itemId, slotIndex) {
        const displayCase = this.displayCases.find(c => c.id === caseId);
        if (!displayCase) return;
        
        // Check if player has the item
        const isTrophy = this.trophies[itemId];
        const isBanner = this.banners[itemId];
        
        if (!isTrophy && !isBanner) return;
        if (!player.collectedTrophies.has(itemId) && !player.collectedBanners.has(itemId)) return;
        
        displayCase.items[slotIndex] = {
            id: itemId,
            type: isTrophy ? 'trophy' : 'banner'
        };
    },
    
    render(ctx, camX, camY) {
        // Render display cases
        this.displayCases.forEach(case_ => {
            const screenX = case_.x - camX;
            const screenY = case_.y - camY;
            
            // Draw case frame
            ctx.strokeStyle = '#8B6914';
            ctx.lineWidth = 4;
            ctx.strokeRect(screenX, screenY, case_.width, case_.height);
            
            // Draw glass
            ctx.fillStyle = 'rgba(100, 150, 200, 0.3)';
            ctx.fillRect(screenX + 4, screenY + 4, case_.width - 8, case_.height - 8);
            
            // Draw items
            if (case_.items) {
                case_.items.forEach((item, i) => {
                    if (!item) return;
                    
                    const itemX = screenX + 20 + (i * 40);
                    const itemY = screenY + case_.height / 2;
                    
                    const itemData = this.trophies[item.id] || this.banners[item.id];
                    if (itemData) {
                        ctx.font = '24px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText(itemData.icon, itemX, itemY);
                    }
                });
            }
        });
    },
    
    renderCollectionUI(ctx) {
        // Render collection menu
        const startX = 100;
        const startY = 100;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(startX, startY, 600, 400);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Inter';
        ctx.textAlign = 'left';
        ctx.fillText('Trophy Collection', startX + 20, startY + 30);
        
        const collected = player.collectedTrophies.size;
        const total = Object.keys(this.trophies).length;
        
        ctx.font = '14px Inter';
        ctx.fillText(`Trophies: ${collected}/${total}`, startX + 20, startY + 60);
        
        // Draw trophy grid
        let x = startX + 20;
        let y = startY + 80;
        
        Object.values(this.trophies).forEach(trophy => {
            const hasTrophy = player.collectedTrophies.has(trophy.id);
            
            ctx.globalAlpha = hasTrophy ? 1.0 : 0.3;
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(trophy.icon, x + 20, y + 20);
            
            ctx.globalAlpha = 1.0;
            
            x += 50;
            if (x > startX + 580) {
                x = startX + 20;
                y += 50;
            }
        });
    },
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    getCollectionStats() {
        return {
            trophies: player.collectedTrophies.size,
            totalTrophies: Object.keys(this.trophies).length,
            banners: player.collectedBanners.size,
            totalBanners: Object.keys(this.banners).length,
            completionPercentage: ((player.collectedTrophies.size / Object.keys(this.trophies).length) * 100).toFixed(1)
        };
    }
};

// Export globally
window.TrophySystem = TrophySystem;

console.log('🏆 Phase 18: Trophy & Banner Collection loaded');
