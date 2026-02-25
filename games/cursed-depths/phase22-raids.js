/* ============================================================
   CURSED DEPTHS - PHASE 22: RAID DUNGEONS
   Multi-player Instances | Boss Encounters | Legendary Loot
   ============================================================ */

// ===== RAID SYSTEM =====
const RaidSystem = {
    raids: {},
    activeRaids: [],
    raidInstances: [],
    
    init() {
        console.log('🏰 Phase 22: Raid Dungeons initialized');
        this.defineRaids();
    },
    
    defineRaids() {
        this.raids = {
            // 5-PLAYER RAIDS
            abyssal_vault: {
                id: 'abyssal_vault',
                name: 'Abyssal Vault',
                description: 'Ancient treasury guarded by eldritch horrors',
                minPlayers: 3,
                maxPlayers: 5,
                difficulty: 'tier1',
                estimatedTime: '20-30 minutes',
                wings: [
                    {
                        name: 'Entrance Hall',
                        bosses: ['vault_guardian'],
                        trashMobs: ['shadow_construct', 'void_wraith']
                    },
                    {
                        name: 'Treasury',
                        bosses: ['gold_golem'],
                        trashMobs: ['animated_armor', 'mimic']
                    },
                    {
                        name: 'Deep Vault',
                        bosses: ['abyssal_horror'],
                        trashMobs: ['tentacled_nightmare', 'void_priest']
                    }
                ],
                lootTable: {
                    tier1: ['abyssal_blade', 'void_armor_set', 'treasury_key'],
                    legendary: ['heart_of_the_vault']
                },
                requirements: {
                    itemLevel: 100,
                    level: 50
                }
            },
            
            frozen_citadel: {
                id: 'frozen_citadel',
                name: 'Frozen Citadel',
                description: 'Ice fortress of the Frost Legion',
                minPlayers: 5,
                maxPlayers: 10,
                difficulty: 'tier2',
                estimatedTime: '45-60 minutes',
                wings: [
                    {
                        name: 'Outer Walls',
                        bosses: ['ice_commander', 'frost_wyrm'],
                        trashMobs: ['frost_soldier', 'ice_archer']
                    },
                    {
                        name: 'Throne Room',
                        bosses: ['frost_king'],
                        trashMobs: ['elite_guard', 'court_mage']
                    },
                    {
                        name: 'Frozen Depths',
                        bosses: ['ancient_frost_titan'],
                        trashMobs: ['frost_colossus', 'blizzard_elemental']
                    }
                ],
                lootTable: {
                    tier2: ['frostbane_set', 'citadel_defender', 'ice_scepter'],
                    legendary: ['crown_of_the_frost_king']
                },
                requirements: {
                    itemLevel: 200,
                    level: 70
                }
            },
            
            infernal_forge: {
                id: 'infernal_forge',
                name: 'Infernal Forge',
                description: 'Demon workshop crafting weapons of destruction',
                minPlayers: 8,
                maxPlayers: 15,
                difficulty: 'tier3',
                estimatedTime: '60-90 minutes',
                wings: [
                    {
                        name: 'Forge Entrance',
                        bosses: ['forge_overseer'],
                        trashMobs: ['imp_worker', 'flame_imp']
                    },
                    {
                        name: 'Weapon Racks',
                        bosses: ['weapon_master'],
                        trashMobs: ['animated_weapon', 'blade_dancer']
                    },
                    {
                        name: 'Core Chamber',
                        bosses: ['infernal_smith', 'forged_colossus'],
                        trashMobs: ['magma_elemental', 'fire_lord']
                    },
                    {
                        name: 'Demon Throne',
                        bosses: ['demon_lord_rarek'],
                        trashMobs: ['pit_lord', 'doomguard']
                    }
                ],
                lootTable: {
                    tier3: ['infernal_weapons', 'demonforged_armor'],
                    legendary: ['heart_of_the_forge', 'soul_harvester']
                },
                requirements: {
                    itemLevel: 350,
                    level: 90
                }
            },
            
            celestial_observatory: {
                id: 'celestial_observatory',
                name: 'Celestial Observatory',
                description: 'Cosmic temple where stars are born',
                minPlayers: 10,
                maxPlayers: 20,
                difficulty: 'tier4',
                estimatedTime: '90-120 minutes',
                wings: [
                    {
                        name: 'Star Gates',
                        bosses: ['stellar_guardian_x3'],
                        trashMobs: ['star_sprite', 'cosmic_orb']
                    },
                    {
                        name: 'Nebula Halls',
                        bosses: ['nebula_flare'],
                        trashMobs: ['void_walker', 'astral_beast']
                    },
                    {
                        name: 'Constellation Chamber',
                        bosses: ['constellation_drake'],
                        trashMobs: ['star_chaser', 'comet_tail']
                    },
                    {
                        name: 'Cosmic Core',
                        bosses: ['celestial_prime'],
                        trashMobs: ['supernova', 'black_hole_fragment']
                    }
                ],
                lootTable: {
                    tier4: ['celestial_set', 'starfall_weapons'],
                    legendary: ['essence_of_creation', 'cosmic_power']
                },
                requirements: {
                    itemLevel: 500,
                    level: 100
                }
            }
        };
    },
    
    createRaidInstance(raidId, party) {
        const raid = this.raids[raidId];
        if (!raid) return null;
        
        // Check requirements
        if (party.length < raid.minPlayers || party.length > raid.maxPlayers) {
            showFloatingText(`Requires ${raid.minPlayers}-${raid.maxPlayers} players!`, window.innerWidth / 2, 300, '#FF4444');
            return null;
        }
        
        const instance = {
            id: this.generateId(),
            raidId,
            party: [...party],
            currentWing: 0,
            defeatedBosses: [],
            lootDistribution: 'need_before_greed',
            startTime: Date.now(),
            completed: false
        };
        
        this.activeRaids.push(instance);
        this.raidInstances.push(instance);
        
        showBossMessage(`🏰 Raid Started: ${raid.name}`, '#FFDD44');
        showBossMessage(`Party: ${party.length}/${raid.maxPlayers}`, '#AAAAAA');
        
        return instance;
    },
    
    advanceToNextWing(instanceId) {
        const instance = this.activeRaids.find(r => r.id === instanceId);
        if (!instance) return;
        
        instance.currentWing++;
        
        if (instance.currentWing >= this.raids[instance.raidId].wings.length) {
            this.completeRaid(instanceId);
        } else {
            const wing = this.raids[instance.raidId].wings[instance.currentWing];
            showBossMessage(`📍 Wing ${instance.currentWing + 1}: ${wing.name}`, '#4488FF');
        }
    },
    
    onBossDefeated(instanceId, bossId) {
        const instance = this.activeRaids.find(r => r.id === instanceId);
        if (!instance) return;
        
        instance.defeatedBosses.push(bossId);
        
        // Check if all bosses in current wing defeated
        const currentWing = this.raids[instance.raidId].wings[instance.currentWing];
        const allBossesDefeated = currentWing.bosses.every(b => instance.defeatedBosses.includes(b));
        
        if (allBossesDefeated) {
            showBossMessage(`✅ Wing Complete!`, '#44FF88');
            setTimeout(() => this.advanceToNextWing(instanceId), 5000);
        }
        
        // Roll for loot
        this.rollForLoot(instance, bossId);
    },
    
    rollForLoot(instance, bossId) {
        const raid = this.raids[instance.raidId];
        const lootTable = raid.lootTable[raid.difficulty] || raid.lootTable.tier1;
        
        // Roll for each player
        instance.party.forEach(player => {
            const roll = Math.random();
            const dropChance = 0.1; // 10% per player
            
            if (roll < dropChance) {
                const item = lootTable[Math.floor(Math.random() * lootTable.length)];
                giveItemToPlayer(player, item);
                showFloatingText(`${player.name} received ${item}!`, window.innerWidth / 2, 200, '#FFDD44');
            }
        });
        
        // Chance for legendary
        if (Math.random() < 0.02) { // 2% legendary chance
            const legendary = raid.lootTable.legendary[Math.floor(Math.random() * raid.lootTable.legendary.length)];
            const luckyPlayer = instance.party[Math.floor(Math.random() * instance.party.length)];
            giveItemToPlayer(luckyPlayer, legendary);
            showBossMessage(`🌟 LEGENDARY DROP: ${legendary} to ${luckyPlayer.name}!`, '#FF8800');
        }
    },
    
    completeRaid(instanceId) {
        const instance = this.activeRaids.find(r => r.id === instanceId);
        if (!instance) return;
        
        instance.completed = true;
        const raid = this.raids[instance.raidId];
        
        const completionTime = Date.now() - instance.startTime;
        const minutes = Math.floor(completionTime / 60000);
        
        showBossMessage(`🎉 Raid Complete: ${raid.name}`, '#44FF88');
        showBossMessage(`Time: ${minutes} minutes`, '#FFFFFF');
        
        // Award completion rewards
        instance.party.forEach(player => {
            giveTitle(player, `${raid.name} Slayer`);
            giveAchievement(player, `raid_${raid.id}_complete`);
        });
        
        // Remove from active raids
        this.activeRaids = this.activeRaids.filter(r => r.id !== instanceId);
    },
    
    getRaidLeaderboard(raidId) {
        const completedRaids = this.raidInstances.filter(r => r.raidId === raidId && r.completed);
        
        return completedRaids
            .sort((a, b) => a.startTime - b.startTime)
            .slice(0, 10)
            .map((raid, index) => ({
                rank: index + 1,
                party: raid.party.map(p => p.name).join(', '),
                time: Math.floor((Date.now() - raid.startTime) / 60000),
                date: new Date(raid.startTime).toLocaleDateString()
            }));
    },
    
    generateId() {
        return 'raid_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// Export globally
window.RaidSystem = RaidSystem;

console.log('🏰 Phase 22: Raid Dungeons loaded');
