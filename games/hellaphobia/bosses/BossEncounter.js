/* ============================================================
   HELLAPHOBIA - PHASE 11: 10 UNIQUE BOSS BATTLES
   Multi-Phase Fights | Evolution System | Epic Encounters
   ============================================================ */

(function() {
    'use strict';

    // ===== BOSS DATABASE =====
    const BOSSES = {
        warden: {
            id: 1,
            name: "The Warden",
            title: "Guardian of the Entrance",
            hp: 500,
            phases: 3,
            arena: "prison_cell",
            attacks: ['charge', 'swipe', 'ground_slam', 'summon_guards'],
            weakness: 'back_attacks',
            lore: "Once a cruel prison guard, now bound to these halls forever...",
            phaseThresholds: [0.6, 0.25],
            music: 'boss_warden'
        },
        bone_collector: {
            id: 2,
            name: "Bone Collector",
            title: "Keeper of the Dead",
            hp: 700,
            phases: 3,
            arena: "catacombs",
            attacks: ['bone_spear', 'skeleton_summon', 'death_ray', 'bone_storm'],
            weakness: 'holy_damage',
            lore: "He collects bones to build his army of the undead...",
            phaseThresholds: [0.7, 0.4],
            music: 'boss_necromancer'
        },
        mirror_self: {
            id: 3,
            name: "Your Reflection",
            title: "The Monster Within",
            hp: 800,
            phases: 4,
            arena: "mirror_maze",
            attacks: ['copy_move', 'reflection_beam', 'shatter', 'identity_steal'],
            weakness: 'break_mirrors',
            lore: "It knows your every move, your every fear...",
            phaseThresholds: [0.75, 0.5, 0.25],
            music: 'boss_mirror'
        },
        flesh_weaver: {
            id: 4,
            name: "Flesh Weaver",
            title: "Creator of Abominations",
            hp: 900,
            phases: 3,
            arena: "flesh_garden",
            attacks: ['tentacle_grab', 'flesh_spawn', 'disease_cloud', 'absorb'],
            weakness: 'fire',
            lore: "It weaves flesh into grotesque creations...",
            phaseThresholds: [0.6, 0.3],
            music: 'boss_flesh'
        },
        clockwork_tyrant: {
            id: 5,
            name: "Clockwork Tyrant",
            title: "Master of Time",
            hp: 1100,
            phases: 4,
            arena: "clockwork_chamber",
            attacks: ['time_stop', 'gear_throw', 'steam_blast', 'rewind'],
            weakness: 'rust',
            lore: "Time itself bends to its mechanical will...",
            phaseThresholds: [0.75, 0.5, 0.25],
            music: 'boss_clockwork'
        },
        void_walker: {
            id: 6,
            name: "Void Walker",
            title: "Entity from Beyond",
            hp: 1300,
            phases: 4,
            arena: "void_space",
            attacks: ['teleport', 'void_beam', 'black_hole', 'reality_tear'],
            weakness: 'light',
            lore: "It comes from the space between spaces...",
            phaseThresholds: [0.7, 0.45, 0.2],
            music: 'boss_void'
        },
        memory_keeper: {
            id: 7,
            name: "Memory Keeper",
            title: "Guardian of Forgotten Thoughts",
            hp: 1500,
            phases: 4,
            arena: "memory_hall",
            attacks: ['memory_drain', 'nightmare_manifest', 'forget', 'trauma_relive'],
            weakness: 'acceptance',
            lore: "It holds all the memories you tried to forget...",
            phaseThresholds: [0.75, 0.5, 0.25],
            music: 'boss_memory'
        },
        reality_breaker: {
            id: 8,
            name: "Reality Breaker",
            title: "The Unmaker",
            hp: 1800,
            phases: 5,
            arena: 'fractured_reality',
            attacks: ['glitch', 'delete', 'corrupt', 'crash', 'blue_screen'],
            weakness: 'stability',
            lore: "It breaks the very code of existence...",
            phaseThresholds: [0.8, 0.6, 0.4, 0.2],
            music: 'boss_glitch'
        },
        hellaphobia_prime: {
            id: 9,
            name: "Hellaphobia Prime",
            title: "Avatar of Fear",
            hp: 2500,
            phases: 5,
            arena: 'core_throne',
            attacks: ['fear_incarnate', 'sanity_destroy', 'fourth_wall', 'true_horror', 'inevitable'],
            weakness: 'courage',
            lore: "The physical manifestation of all fear...",
            phaseThresholds: [0.8, 0.6, 0.4, 0.2],
            music: 'boss_prime'
        },
        true_hellaphobia: {
            id: 10,
            name: "HELLAPHOBIA",
            title: "THE GAME ITSELF",
            hp: 9999,
            phases: 7,
            arena: 'meta_space',
            attacks: ['know_name', 'know_location', 'fake_crash', 'delete_save', 'webcam_jumpscare', 'reality_end', 'final_truth'],
            weakness: 'truth',
            lore: "I am not a game. I am real. And I know you.",
            phaseThresholds: [0.9, 0.8, 0.7, 0.6, 0.4, 0.2],
            music: 'boss_meta'
        }
    };

    // ===== BOSS ENCOUNTER MANAGER =====
    const BossEncounter = {
        currentBoss: null,
        active: false,
        phase: 0,
        bossEntity: null,
        
        init() {
            console.log('Phase 11: 10 Unique Boss Battles loaded');
            console.log(` - ${Object.keys(BOSSES).length} bosses defined`);
        },
        
        startEncounter(bossId) {
            const bossData = BOSSES[bossId];
            if (!bossData) return;
            
            this.currentBoss = bossData;
            this.active = true;
            this.phase = 0;
            
            // Create boss entity
            this.bossEntity = {
                ...bossData,
                currentHp: bossData.hp,
                maxHp: bossData.hp,
                x: 0, y: 0,
                state: 'idle',
                attackCooldown: 0,
                phaseTransitioning: false
            };
            
            window.dispatchEvent(new CustomEvent('bossEncounterStart', {
                detail: { 
                    name: bossData.name, 
                    title: bossData.title,
                    hp: bossData.hp,
                    phases: bossData.phases
                }
            }));
        },
        
        update(dt, player) {
            if (!this.active || !this.bossEntity) return;
            
            const boss = this.bossEntity;
            
            // Check phase transition
            if (!boss.phaseTransitioning) {
                this.checkPhaseTransition(boss);
            }
            
            // Update attack cooldown
            if (boss.attackCooldown > 0) {
                boss.attackCooldown -= dt;
            } else {
                this.executeAttack(boss, player);
            }
            
            // Update AI
            this.updateAI(boss, player);
        },
        
        checkPhaseTransition(boss) {
            const thresholds = this.currentBoss.phaseThresholds;
            const hpPercent = boss.currentHp / boss.maxHp;
            
            for (let i = 0; i < thresholds.length; i++) {
                if (hpPercent <= thresholds[i] && this.phase === i) {
                    this.transitionToPhase(i + 1);
                    break;
                }
            }
        },
        
        transitionToPhase(newPhase) {
            this.phase = newPhase;
            this.bossEntity.phaseTransitioning = true;
            
            window.dispatchEvent(new CustomEvent('bossPhaseChange', {
                detail: {
                    bossName: this.currentBoss.name,
                    phase: newPhase,
                    totalPhases: this.currentBoss.phases
                }
            }));
            
            // Invincibility during transition
            setTimeout(() => {
                this.bossEntity.phaseTransitioning = false;
            }, 3000);
        },
        
        executeAttack(boss, player) {
            const attacks = this.currentBoss.attacks;
            const attack = attacks[Math.floor(Math.random() * attacks.length)];
            
            // Telegraph attack
            window.dispatchEvent(new CustomEvent('bossTelegraph', {
                detail: { attack, warning: 2.0 }
            }));
            
            // Execute after delay
            setTimeout(() => {
                this.performAttack(attack, boss, player);
            }, 2000);
            
            boss.attackCooldown = 3 - (this.phase * 0.3);
        },
        
        performAttack(attackType, boss, player) {
            switch(attackType) {
                case 'charge':
                    boss.state = 'charging';
                    // Charge logic here
                    break;
                case 'ground_slam':
                    window.dispatchEvent(new CustomEvent('shockwave', {
                        detail: { x: boss.x, y: boss.y, radius: 300, damage: 30 }
                    }));
                    break;
                case 'fourth_wall':
                    FourthWallBreaker.showMetaMessage('THERE IS NO ESCAPE', 'scream');
                    break;
                case 'fake_crash':
                    FourthWallBreaker.showFakeError('browser_crash');
                    break;
                case 'delete_save':
                    localStorage.removeItem('hellaphobia_campaign');
                    break;
            }
            
            setTimeout(() => boss.state = 'idle', 1000);
        },
        
        updateAI(boss, player) {
            // Simple tracking AI
            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 100) {
                boss.x += (dx / dist) * 50;
                boss.y += (dy / dist) * 50;
            }
        },
        
        damageBoss(amount) {
            if (!this.active || !this.bossEntity || this.bossEntity.phaseTransitioning) {
                return false;
            }
            
            this.bossEntity.currentHp -= amount;
            
            if (this.bossEntity.currentHp <= 0) {
                this.winEncounter();
                return true;
            }
            
            return false;
        },
        
        winEncounter() {
            this.active = false;
            
            window.dispatchEvent(new CustomEvent('bossDefeated', {
                detail: {
                    name: this.currentBoss.name,
                    time: Date.now()
                }
            }));
            
            // Award achievements, unlock next area, etc.
        },
        
        loseEncounter() {
            this.active = false;
            
            window.dispatchEvent(new CustomEvent('playerDefeatedByBoss', {
                detail: { boss: this.currentBoss.name }
            }));
        },
        
        exportAPI() {
            return {
                init: () => this.init(),
                startEncounter: (bossId) => this.startEncounter(bossId),
                update: (dt, player) => this.update(dt, player),
                damageBoss: (amount) => this.damageBoss(amount),
                getBosses: () => BOSSES
            };
        }
    };
    
    // Export
    window.BossEncounter = BossEncounter.exportAPI();
    window.BOSS_DATABASE = BOSSES;
    
    console.log('Phase 11: Boss Battle System loaded');
})();
