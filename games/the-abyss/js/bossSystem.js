/* ============================================
   The Abyss - Boss Encounter System
   Phase 3 Implementation
   ============================================ */

const BossSystem = (function() {
    'use strict';

    // Boss definitions
    const BOSSES = {
        LEVIATHAN: {
            id: 'leviathan',
            name: 'The Abyssal Leviathan',
            title: 'Ancient Terror of the Deep',
            health: 5000,
            phases: 3,
            arenaSize: 100,
            introDuration: 15,
            
            phases: [
                {
                    name: 'The Approach',
                    healthThreshold: 0.7, // 70% health
                    attacks: ['tail_sweep', 'bite', 'roar'],
                    behavior: 'aggressive',
                    speed: 0.8
                },
                {
                    name: 'Fury of the Deep',
                    healthThreshold: 0.3, // 30% health
                    attacks: ['tail_sweep', 'bite', 'roar', 'charge', 'summon_whelps'],
                    behavior: 'berserk',
                    speed: 1.2
                },
                {
                    name: 'Desperate Struggle',
                    healthThreshold: 0, // 0% health (final phase)
                    attacks: ['bite', 'charge', 'whirlpool', 'death_roll'],
                    behavior: 'desperate',
                    speed: 1.0
                }
            ],
            
            attacks: {
                tail_sweep: {
                    name: 'Tail Sweep',
                    damage: 40,
                    range: 30,
                    windup: 2,
                    cooldown: 8,
                    warning: 'The Leviathan\'s tail tenses...'
                },
                bite: {
                    name: 'Devouring Bite',
                    damage: 60,
                    range: 15,
                    windup: 1,
                    cooldown: 5,
                    warning: 'Massive jaws open wide...'
                },
                roar: {
                    name: 'Deafening Roar',
                    damage: 20,
                    range: 50,
                    windup: 2,
                    cooldown: 15,
                    effect: 'stun',
                    warning: 'The Leviathan inhales deeply...'
                },
                charge: {
                    name: 'Abyssal Charge',
                    damage: 80,
                    range: 60,
                    windup: 3,
                    cooldown: 20,
                    warning: 'The beast prepares to ram...'
                },
                summon_whelps: {
                    name: 'Call of the Deep',
                    damage: 0,
                    range: 0,
                    windup: 4,
                    cooldown: 30,
                    effect: 'spawn_minions',
                    warning: 'Unearthly sounds echo from the depths...'
                },
                whirlpool: {
                    name: 'Maelstrom',
                    damage: 10,
                    range: 40,
                    duration: 10,
                    windup: 3,
                    cooldown: 25,
                    effect: 'pull',
                    warning: 'The water begins to swirl violently...'
                },
                death_roll: {
                    name: 'Death Roll',
                    damage: 100,
                    range: 20,
                    windup: 2,
                    cooldown: 0, // Only in final phase
                    warning: 'The Leviathan coils around you...'
                }
            },
            
            loot: ['leviathan_heart', 'abyssal_scale', 'ancient_fang'],
            
            intro: {
                camera: 'cinematic',
                sequence: [
                    { time: 0, action: 'fade_in', text: 'Something massive approaches...' },
                    { time: 3, action: 'shake', intensity: 0.2 },
                    { time: 5, action: 'show_silhouette' },
                    { time: 8, action: 'roar', duration: 3 },
                    { time: 12, action: 'reveal_full' },
                    { time: 15, action: 'combat_start' }
                ]
            }
        },
        
        ANCIENT_ONE: {
            id: 'ancient_one',
            name: 'The Ancient One',
            title: 'That Which Should Not Be',
            health: 10000,
            phases: 4,
            arenaSize: 150,
            introDuration: 20,
            
            phases: [
                {
                    name: 'Awakening',
                    healthThreshold: 0.75,
                    attacks: ['tentacle_slam', 'mind_blast', 'reality_tear'],
                    behavior: 'curious',
                    speed: 0.5
                },
                {
                    name: 'Recognition',
                    healthThreshold: 0.5,
                    attacks: ['tentacle_slam', 'mind_blast', 'reality_tear', 'summon_horrors'],
                    behavior: 'hostile',
                    speed: 0.7
                },
                {
                    name: 'True Form',
                    healthThreshold: 0.25,
                    attacks: ['tentacle_slam', 'eye_beam', 'void_zone', 'teleport'],
                    behavior: 'enraged',
                    speed: 1.0
                },
                {
                    name: 'Existential Crisis',
                    healthThreshold: 0.1,
                    attacks: ['annihilation_beam', 'reality_collapse', 'void_zone'],
                    behavior: 'desperate',
                    speed: 1.2
                }
            ],
            
            attacks: {
                tentacle_slam: {
                    name: 'Tentacle Slam',
                    damage: 50,
                    range: 25,
                    windup: 2,
                    cooldown: 6,
                    warning: 'Tentacles rise from the darkness...'
                },
                mind_blast: {
                    name: 'Mind Blast',
                    damage: 30,
                    range: 40,
                    windup: 1.5,
                    cooldown: 10,
                    effect: 'invert_controls',
                    warning: 'Your mind feels under assault...'
                },
                reality_tear: {
                    name: 'Reality Tear',
                    damage: 40,
                    range: 30,
                    windup: 3,
                    cooldown: 15,
                    effect: 'teleport_player',
                    warning: 'Space itself seems to warp...'
                },
                summon_horrors: {
                    name: 'Spawn of Madness',
                    damage: 0,
                    range: 0,
                    windup: 4,
                    cooldown: 25,
                    effect: 'spawn_abyssal_horrors',
                    warning: 'Shapes form in the shadows...'
                },
                eye_beam: {
                    name: 'Beam of Oblivion',
                    damage: 5, // per tick
                    range: 60,
                    duration: 5,
                    windup: 2,
                    cooldown: 20,
                    warning: 'A terrible eye opens and focuses on you...'
                },
                void_zone: {
                    name: 'Void Zone',
                    damage: 20,
                    range: 20,
                    duration: 8,
                    windup: 2,
                    cooldown: 18,
                    effect: 'damage_over_time',
                    warning: 'The darkness seems to deepen...'
                },
                teleport: {
                    name: 'Phase Shift',
                    damage: 0,
                    range: 0,
                    windup: 1,
                    cooldown: 12,
                    effect: 'teleport_boss',
                    warning: 'The Ancient One flickers...'
                },
                annihilation_beam: {
                    name: 'Annihilation',
                    damage: 200,
                    range: 100,
                    windup: 5,
                    cooldown: 30,
                    warning: 'REALITY ITSELF UNRAVELS! RUN!'
                },
                reality_collapse: {
                    name: 'Reality Collapse',
                    damage: 80,
                    range: 50,
                    windup: 3,
                    cooldown: 0,
                    warning: 'Everything is falling apart!'
                }
            },
            
            loot: ['primordial_eye', 'tentacle_fragment', 'madness_crystal', 'void_heart'],
            
            intro: {
                camera: 'cinematic',
                sequence: [
                    { time: 0, action: 'fade_in', text: 'At the bottom of the trench, you find it...' },
                    { time: 2, action: 'heartbeat', rate: 0.5 },
                    { time: 5, action: 'text', text: 'IT HAS BEEN WAITING' },
                    { time: 8, action: 'reveal_eye', size: 'massive' },
                    { time: 12, action: 'telepathy', text: 'YOU SHOULD NOT HAVE COME' },
                    { time: 16, action: 'full_reveal' },
                    { time: 20, action: 'combat_start' }
                ]
            }
        }
    };

    // Active boss instance
    let activeBoss = null;
    let bossState = {
        isActive: false,
        isIntroPlaying: false,
        currentPhase: 0,
        phaseStartTime: 0,
        attackCooldowns: {},
        currentAttack: null,
        attackWindup: 0,
        minions: [],
        arenaCenter: { x: 0, y: -150, z: 0 },
        introProgress: 0
    };

    // ============================================
    // BOSS ENCOUNTERS
    // ============================================
    function init() {
        activeBoss = null;
        bossState = {
            isActive: false,
            isIntroPlaying: false,
            currentPhase: 0,
            phaseStartTime: 0,
            attackCooldowns: {},
            currentAttack: null,
            attackWindup: 0,
            minions: [],
            arenaCenter: { x: 0, y: -150, z: 0 },
            introProgress: 0
        };
    }

    function startBossEncounter(bossId, position) {
        const bossTemplate = BOSSES[bossId.toUpperCase()];
        if (!bossTemplate) {
            console.error('Unknown boss:', bossId);
            return false;
        }

        // Create boss instance
        activeBoss = {
            ...bossTemplate,
            position: { ...position },
            health: bossTemplate.health,
            maxHealth: bossTemplate.health,
            rotation: { yaw: 0, pitch: 0 },
            isEnraged: false,
            isDead: false
        };

        bossState.arenaCenter = { ...position };
        bossState.isActive = true;
        bossState.isIntroPlaying = true;
        bossState.introProgress = 0;
        bossState.currentPhase = 0;
        bossState.phaseStartTime = Date.now();

        // Lock arena
        lockArena(position, bossTemplate.arenaSize);

        // Start intro sequence
        playIntroSequence(bossTemplate.intro);

        return true;
    }

    function playIntroSequence(intro) {
        if (!intro) {
            endIntro();
            return;
        }

        // Play cinematic intro
        let sequenceIndex = 0;
        
        const playNext = () => {
            if (sequenceIndex >= intro.sequence.length) {
                endIntro();
                return;
            }

            const step = intro.sequence[sequenceIndex];
            
            // Execute step
            executeIntroStep(step);
            
            sequenceIndex++;
            
            // Schedule next step
            const nextStep = intro.sequence[sequenceIndex];
            if (nextStep) {
                const delay = nextStep.time - step.time;
                setTimeout(playNext, delay * 1000);
            } else {
                setTimeout(endIntro, 2000);
            }
        };

        playNext();
    }

    function executeIntroStep(step) {
        switch(step.action) {
            case 'fade_in':
                // Fade in from black
                if (window.showNotification && step.text) {
                    window.showNotification(step.text);
                }
                break;
                
            case 'shake':
                if (window.cameraEffects) {
                    window.cameraEffects.shake = step.intensity || 0.3;
                }
                break;
                
            case 'roar':
                // Play roar sound
                if (window.cameraEffects) {
                    window.cameraEffects.shake = 0.5;
                }
                break;
                
            case 'text':
                if (window.showNotification) {
                    window.showNotification(step.text, 'danger');
                }
                break;
                
            case 'reveal_full':
            case 'full_reveal':
                // Reveal boss model
                break;
                
            case 'combat_start':
                // Handled by endIntro
                break;
        }
    }

    function endIntro() {
        bossState.isIntroPlaying = false;
        
        if (window.showNotification) {
            window.showNotification(`⚔️ Combat begins! Defeat ${activeBoss.name}!`, 'danger');
        }
        
        // Trigger event
        if (window.EventSystem) {
            window.EventSystem.trigger('boss_combat_start', { boss: activeBoss });
        }
    }

    // ============================================
    // MAIN UPDATE LOOP
    // ============================================
    function update(deltaTime, player) {
        if (!bossState.isActive || !activeBoss || activeBoss.isDead) return;
        
        if (bossState.isIntroPlaying) {
            updateIntro(deltaTime);
            return;
        }

        // Update phase
        updateBossPhase();
        
        // Update attack cooldowns
        updateAttackCooldowns(deltaTime);
        
        // Choose and execute attack
        if (!bossState.currentAttack) {
            chooseAttack(player);
        } else {
            executeAttack(deltaTime, player);
        }
        
        // Update boss position/rotation
        updateBossMovement(deltaTime, player);
        
        // Update minions
        updateMinions(deltaTime, player);
        
        // Check arena bounds
        checkPlayerInArena(player);
    }

    function updateIntro(deltaTime) {
        bossState.introProgress += deltaTime;
        
        // Camera work during intro
        // Boss movement during intro
    }

    function updateBossPhase() {
        const healthPercent = activeBoss.health / activeBoss.maxHealth;
        const phases = activeBoss.phases;
        
        // Find current phase based on health
        let newPhase = phases.length - 1;
        for (let i = 0; i < phases.length; i++) {
            if (healthPercent > phases[i].healthThreshold) {
                newPhase = i;
                break;
            }
        }
        
        // Phase transition
        if (newPhase !== bossState.currentPhase) {
            const oldPhase = bossState.currentPhase;
            bossState.currentPhase = newPhase;
            bossState.phaseStartTime = Date.now();
            
            onPhaseTransition(oldPhase, newPhase);
        }
    }

    function onPhaseTransition(oldPhase, newPhase) {
        const phase = activeBoss.phases[newPhase];
        
        if (window.showNotification) {
            window.showNotification(`🔥 PHASE ${newPhase + 1}: ${phase.name}!`, 'danger');
        }
        
        // Visual effect
        if (window.cameraEffects) {
            window.cameraEffects.shake = 0.4;
            window.cameraEffects.flash = 0.5;
        }
        
        // Heal slightly on phase transition
        activeBoss.health = Math.max(activeBoss.health, activeBoss.maxHealth * phase.healthThreshold);
        
        // Trigger event
        if (window.EventSystem) {
            window.EventSystem.trigger('boss_phase_change', {
                boss: activeBoss,
                phase: newPhase,
                phaseName: phase.name
            });
        }
    }

    function updateAttackCooldowns(deltaTime) {
        for (const attackName in bossState.attackCooldowns) {
            bossState.attackCooldowns[attackName] -= deltaTime;
            if (bossState.attackCooldowns[attackName] < 0) {
                delete bossState.attackCooldowns[attackName];
            }
        }
    }

    function chooseAttack(player) {
        const phase = activeBoss.phases[bossState.currentPhase];
        const availableAttacks = phase.attacks.filter(attackName => {
            return !bossState.attackCooldowns[attackName];
        });
        
        if (availableAttacks.length === 0) return;
        
        // Choose attack based on distance and situation
        const distToPlayer = distance(activeBoss.position, player.position);
        
        // Weight attacks by suitability
        const weightedAttacks = availableAttacks.map(attackName => {
            const attack = activeBoss.attacks[attackName];
            let weight = 1;
            
            // Prefer attacks in range
            if (distToPlayer <= attack.range) {
                weight *= 2;
            }
            
            // Prefer higher damage attacks in later phases
            if (bossState.currentPhase > 0) {
                weight *= (1 + attack.damage / 100);
            }
            
            return { name: attackName, weight };
        });
        
        // Select weighted random
        const totalWeight = weightedAttacks.reduce((sum, a) => sum + a.weight, 0);
        let random = Math.random() * totalWeight;
        
        let selectedAttack = weightedAttacks[0].name;
        for (const attack of weightedAttacks) {
            random -= attack.weight;
            if (random <= 0) {
                selectedAttack = attack.name;
                break;
            }
        }
        
        // Start attack
        startAttack(selectedAttack);
    }

    function startAttack(attackName) {
        const attack = activeBoss.attacks[attackName];
        
        bossState.currentAttack = attackName;
        bossState.attackWindup = attack.windup;
        
        // Show warning
        if (attack.warning && window.showNotification) {
            window.showNotification(`⚠️ ${attack.warning}`, 'warning');
        }
        
        // Windup animation/effects
        if (window.cameraEffects && attack.windup > 2) {
            window.cameraEffects.slowMo = 0.5; // Brief slow motion
            setTimeout(() => { window.cameraEffects.slowMo = 1; }, 500);
        }
    }

    function executeAttack(deltaTime, player) {
        const attackName = bossState.currentAttack;
        const attack = activeBoss.attacks[attackName];
        
        bossState.attackWindup -= deltaTime;
        
        if (bossState.attackWindup <= 0) {
            // Execute attack damage
            performAttackDamage(attack, player);
            
            // Set cooldown
            bossState.attackCooldowns[attackName] = attack.cooldown;
            
            // Clear current attack
            bossState.currentAttack = null;
        }
    }

    function performAttackDamage(attack, player) {
        const distToPlayer = distance(activeBoss.position, player.position);
        
        if (distToPlayer <= attack.range) {
            // Hit player
            player.health -= attack.damage;
            
            // Apply effect
            if (attack.effect) {
                applyAttackEffect(attack.effect, player);
            }
            
            // Screen effects
            if (window.cameraEffects) {
                window.cameraEffects.shake = 0.4;
                window.cameraEffects.redFlash = 0.3;
            }
        }
        
        // Special attacks
        if (attack.effect === 'spawn_minions' || attack.effect === 'spawn_abyssal_horrors') {
            spawnMinions();
        }
    }

    function applyAttackEffect(effect, player) {
        switch(effect) {
            case 'stun':
                player.stunned = true;
                setTimeout(() => { player.stunned = false; }, 2000);
                break;
                
            case 'invert_controls':
                player.invertedControls = true;
                setTimeout(() => { player.invertedControls = false; }, 5000);
                break;
                
            case 'teleport_player':
                // Teleport player to random location in arena
                const angle = Math.random() * Math.PI * 2;
                const dist = 30 + Math.random() * 20;
                player.position.x = bossState.arenaCenter.x + Math.cos(angle) * dist;
                player.position.z = bossState.arenaCenter.z + Math.sin(angle) * dist;
                break;
                
            case 'damage_over_time':
                // Apply DOT
                const dotInterval = setInterval(() => {
                    player.health -= 5;
                }, 1000);
                setTimeout(() => clearInterval(dotInterval), 8000);
                break;
        }
    }

    function spawnMinions() {
        const count = 2 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 15;
            const position = {
                x: bossState.arenaCenter.x + Math.cos(angle) * dist,
                y: bossState.arenaCenter.y,
                z: bossState.arenaCenter.z + Math.sin(angle) * dist
            };
            
            if (window.AISystem) {
                const minion = window.AISystem.spawnCreature('swarmer', position);
                if (minion) {
                    bossState.minions.push(minion.id);
                }
            }
        }
        
        if (window.showNotification) {
            window.showNotification('👹 Minions have spawned!', 'warning');
        }
    }

    function updateBossMovement(deltaTime, player) {
        // Face player
        const dx = player.position.x - activeBoss.position.x;
        const dz = player.position.z - activeBoss.position.z;
        activeBoss.rotation.yaw = Math.atan2(dx, dz);
        
        // Move based on phase behavior
        const phase = activeBoss.phases[bossState.currentPhase];
        const speed = 5 * phase.speed;
        
        const distToPlayer = distance(activeBoss.position, player.position);
        
        // Maintain optimal distance
        const optimalDistance = 20;
        if (distToPlayer > optimalDistance + 5) {
            // Move closer
            activeBoss.position.x += (dx / distToPlayer) * speed * deltaTime;
            activeBoss.position.z += (dz / distToPlayer) * speed * deltaTime;
        } else if (distToPlayer < optimalDistance - 5) {
            // Back away
            activeBoss.position.x -= (dx / distToPlayer) * speed * deltaTime;
            activeBoss.position.z -= (dz / distToPlayer) * speed * deltaTime;
        }
    }

    function updateMinions(deltaTime, player) {
        // Cleanup dead minions
        bossState.minions = bossState.minions.filter(id => {
            const creature = window.AISystem ? window.AISystem.getCreatureById(id) : null;
            return creature && !creature.isDead;
        });
    }

    function checkPlayerInArena(player) {
        const distFromCenter = distance(player.position, bossState.arenaCenter);
        const arenaRadius = activeBoss.arenaSize / 2;
        
        if (distFromCenter > arenaRadius) {
            // Push player back in
            const angle = Math.atan2(
                player.position.z - bossState.arenaCenter.z,
                player.position.x - bossState.arenaCenter.x
            );
            
            player.position.x = bossState.arenaCenter.x + Math.cos(angle) * (arenaRadius - 5);
            player.position.z = bossState.arenaCenter.z + Math.sin(angle) * (arenaRadius - 5);
            
            // Damage for trying to escape
            player.health -= 10;
            
            if (window.showNotification) {
                window.showNotification('💀 The boss pulls you back!', 'danger');
            }
        }
    }

    function lockArena(center, size) {
        // Create invisible walls or visual boundary
        // This would integrate with the game world
    }

    // ============================================
    // BOSS DAMAGE
    // ============================================
    function damageBoss(amount, source = 'unknown') {
        if (!activeBoss || activeBoss.isDead) return false;
        
        activeBoss.health -= amount;
        
        // Visual feedback
        if (window.cameraEffects) {
            window.cameraEffects.hitFlash = 0.2;
        }
        
        // Check for death
        if (activeBoss.health <= 0) {
            defeatBoss();
        }
        
        return true;
    }

    function defeatBoss() {
        activeBoss.isDead = true;
        activeBoss.health = 0;
        
        // Death sequence
        if (window.showNotification) {
            window.showNotification(`🎉 ${activeBoss.name} has been defeated!`, 'success');
        }
        
        // Spawn loot
        spawnBossLoot();
        
        // Achievement
        if (window.SaveSystem) {
            window.SaveSystem.unlockAchievement('boss_slayer');
        }
        
        // End encounter after delay
        setTimeout(() => {
            endBossEncounter(true);
        }, 5000);
    }

    function spawnBossLoot() {
        if (!activeBoss || !activeBoss.loot) return;
        
        for (const itemId of activeBoss.loot) {
            if (window.ResourceSystem) {
                window.ResourceSystem.addItem(itemId, 1);
            }
        }
        
        if (window.showNotification) {
            window.showNotification('💎 Boss loot acquired!', 'success');
        }
    }

    function endBossEncounter(victory = false) {
        bossState.isActive = false;
        
        // Release arena
        // Cleanup minions
        for (const minionId of bossState.minions) {
            if (window.AISystem) {
                const creature = window.AISystem.getCreatureById(minionId);
                if (creature) {
                    creature.isDead = true;
                }
            }
        }
        
        // Trigger event
        if (window.EventSystem) {
            window.EventSystem.trigger('boss_encounter_end', {
                boss: activeBoss,
                victory: victory
            });
        }
        
        activeBoss = null;
    }

    // ============================================
    // GETTERS
    // ============================================
    function getActiveBoss() {
        return activeBoss;
    }

    function getBossState() {
        return { ...bossState };
    }

    function getCurrentPhase() {
        if (!activeBoss) return null;
        return activeBoss.phases[bossState.currentPhase];
    }

    function getBossHealthPercent() {
        if (!activeBoss) return 0;
        return (activeBoss.health / activeBoss.maxHealth) * 100;
    }

    function isBossEncounterActive() {
        return bossState.isActive;
    }

    // ============================================
    // UTILITY
    // ============================================
    function distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        BOSSES,
        
        init,
        update,
        
        startBossEncounter,
        endBossEncounter,
        damageBoss,
        
        getActiveBoss,
        getBossState,
        getCurrentPhase,
        getBossHealthPercent,
        isBossEncounterActive
    };
})();

// Global access
window.BossSystem = BossSystem;
