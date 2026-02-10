/* ============================================
   The Abyss - Advanced AI System
   Phase 3 Implementation
   ============================================ */

const AISystem = (function() {
    'use strict';

    // AI States
    const STATES = {
        IDLE: 'idle',
        PATROL: 'patrol',
        INVESTIGATE: 'investigate',
        ALERT: 'alert',
        HUNT: 'hunt',
        ATTACK: 'attack',
        SEARCH: 'search',
        FLEE: 'flee',
        DEAD: 'dead'
    };

    // AI Behaviors
    const BEHAVIORS = {
        PASSIVE: 'passive',        // Runs away
        DEFENSIVE: 'defensive',    // Attacks if threatened
        AGGRESSIVE: 'aggressive',  // Hunts player
        TERRITORIAL: 'territorial', // Guards area
        PACK: 'pack',             // Hunts in groups
        STALKER: 'stalker',       // Follows from shadows
        MIMIC: 'mimic'            // Disguises as objects
    };

    // Creature types with full AI profiles
    const CREATURE_TYPES = {
        ANGLER: {
            id: 'angler',
            name: 'Anglerfish',
            behavior: BEHAVIORS.STALKER,
            health: 100,
            damage: 25,
            speed: 8,
            detectionRange: 30,
            attackRange: 3,
            visionCone: Math.PI / 3,
            hearingRange: 20,
            memoryDuration: 30,
            lureAttraction: 2.0, // Multiplier for flare attraction
            fearFactor: 0.3,
            packSize: 1,
            biomes: ['twilight', 'midnight', 'abyss'],
            abilities: ['lure', 'ambush'],
            loot: ['teeth', 'lure_organ']
        },

        SWARMER: {
            id: 'swarmer',
            name: 'Swarm Eel',
            behavior: BEHAVIORS.PACK,
            health: 30,
            damage: 5,
            speed: 12,
            detectionRange: 15,
            attackRange: 2,
            visionCone: Math.PI / 2,
            hearingRange: 25,
            memoryDuration: 15,
            fearFactor: 0.8,
            packSize: 8,
            biomes: ['twilight', 'midnight'],
            abilities: ['swarm', 'distract'],
            loot: ['eel_skin']
        },

        STALKER: {
            id: 'stalker',
            name: 'Deep Stalker',
            behavior: BEHAVIORS.STALKER,
            health: 150,
            damage: 35,
            speed: 10,
            detectionRange: 40,
            attackRange: 4,
            visionCone: Math.PI / 4,
            hearingRange: 30,
            memoryDuration: 60,
            lureAttraction: 1.0,
            fearFactor: 0.1,
            packSize: 1,
            biomes: ['midnight', 'abyss'],
            abilities: ['cloaking', 'wall_crawl', 'pounce'],
            loot: ['stalker_hide', 'claw']
        },

        MIMIC: {
            id: 'mimic',
            name: 'Mimic',
            behavior: BEHAVIORS.MIMIC,
            health: 80,
            damage: 40,
            speed: 6,
            detectionRange: 10,
            attackRange: 2,
            visionCone: Math.PI * 2, // 360 vision when revealed
            hearingRange: 15,
            memoryDuration: 20,
            fearFactor: 0.5,
            packSize: 1,
            biomes: ['midnight', 'abyss'],
            abilities: ['disguise', 'surprise_attack'],
            disguises: ['artifact', 'oxygen_tank', 'crystal'],
            loot: ['mimic_essence']
        },

        LEVIATHAN_JUVENILE: {
            id: 'leviathan_juvenile',
            name: 'Juvenile Leviathan',
            behavior: BEHAVIORS.TERRITORIAL,
            health: 500,
            damage: 75,
            speed: 15,
            detectionRange: 60,
            attackRange: 8,
            visionCone: Math.PI / 2,
            hearingRange: 50,
            memoryDuration: 120,
            fearFactor: 0,
            packSize: 1,
            biomes: ['abyss'],
            abilities: ['charge', 'tail_sweep', 'roar'],
            loot: ['leviathan_scale', 'ancient_bone']
        },

        ABYSSAL_HORROR: {
            id: 'abyssal_horror',
            name: 'Abyssal Horror',
            behavior: BEHAVIORS.AGGRESSIVE,
            health: 300,
            damage: 50,
            speed: 20,
            detectionRange: 50,
            attackRange: 5,
            visionCone: Math.PI / 3,
            hearingRange: 40,
            memoryDuration: 90,
            fearFactor: 0,
            packSize: 1,
            biomes: ['abyss', 'hadal'],
            abilities: ['teleport', 'mind_attack', 'regenerate'],
            loot: ['horror_heart', 'void_tentacle']
        },

        ANCIENT_ONE: {
            id: 'ancient_one',
            name: 'The Ancient One',
            behavior: BEHAVIORS.TERRITORIAL,
            health: 2000,
            damage: 100,
            speed: 8,
            detectionRange: 80,
            attackRange: 10,
            visionCone: Math.PI,
            hearingRange: 100,
            memoryDuration: 999,
            fearFactor: 0,
            packSize: 1,
            biomes: ['hadal'],
            abilities: ['reality_warp', 'summon', 'laser_beam', 'crush'],
            isBoss: true,
            loot: ['primordial_eye', 'ancient_heart']
        }
    };

    // Active creatures
    let creatures = [];
    let playerMemory = {
        lastKnownPosition: null,
        lastSeenTime: 0,
        suspicionLevel: 0,
        chaseHistory: [],
        flareLocations: [],
        playerHidingSpots: []
    };

    // Learning AI data
    let learnedBehaviors = {
        playerFlareUsage: 0,
        playerHidingFrequency: {},
        playerPreferredPaths: [],
        playerResponseToAmbush: 'unknown'
    };

    // ============================================
    // CREATURE SPAWNING
    // ============================================
    function spawnCreature(typeId, position, options = {}) {
        const type = CREATURE_TYPES[typeId.toUpperCase()];
        if (!type) {
            console.error('Unknown creature type:', typeId);
            return null;
        }

        const creature = {
            id: generateId(),
            type: type,
            position: { ...position },
            rotation: { yaw: Math.random() * Math.PI * 2, pitch: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            
            // State
            state: STATES.IDLE,
            previousState: null,
            stateTimer: 0,
            
            // Stats
            health: type.health * (options.healthMult || 1),
            maxHealth: type.health * (options.healthMult || 1),
            isDead: false,
            
            // AI memory
            targetPosition: null,
            targetLastSeen: 0,
            investigationPoint: null,
            patrolPoints: generatePatrolPoints(position, type.behavior),
            currentPatrolIndex: 0,
            
            // Behavior modifiers
            alertLevel: 0, // 0-100
            fearLevel: 0,  // 0-100
            hungerLevel: 50, // 0-100
            
            // Special states
            isCloaked: false,
            isDisguised: false,
            disguiseType: null,
            
            // Pack behavior
            packId: options.packId || null,
            packMembers: [],
            
            // Cooldowns
            abilityCooldowns: {},
            lastAttackTime: 0,
            
            // Visual/Audio
            soundEmission: 0,
            lightEmission: type.id === 'angler' ? 1 : 0,
            
            // Learning data (per creature)
            personalMemory: {
                ambushAttempts: 0,
                successfulHits: 0,
                playerEscapes: 0
            }
        };

        // Initialize pack
        if (type.packSize > 1 && !options.packId) {
            const packId = generateId();
            creature.packId = packId;
            
            // Spawn pack members
            for (let i = 1; i < type.packSize; i++) {
                const offset = {
                    x: (Math.random() - 0.5) * 10,
                    y: (Math.random() - 0.5) * 5,
                    z: (Math.random() - 0.5) * 10
                };
                const member = spawnCreature(typeId, {
                    x: position.x + offset.x,
                    y: position.y + offset.y,
                    z: position.z + offset.z
                }, { packId: packId });
                
                if (member) {
                    creature.packMembers.push(member.id);
                }
            }
        }

        // Set initial disguise for mimics
        if (type.behavior === BEHAVIORS.MIMIC) {
            creature.isDisguised = true;
            creature.disguiseType = type.disguises[Math.floor(Math.random() * type.disguises.length)];
        }

        creatures.push(creature);
        return creature;
    }

    function generatePatrolPoints(center, behavior) {
        const points = [];
        const numPoints = behavior === BEHAVIORS.TERRITORIAL ? 4 : 3;
        const radius = behavior === BEHAVIORS.TERRITORIAL ? 20 : 15;
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            points.push({
                x: center.x + Math.cos(angle) * radius + (Math.random() - 0.5) * 5,
                y: center.y + (Math.random() - 0.5) * 3,
                z: center.z + Math.sin(angle) * radius + (Math.random() - 0.5) * 5
            });
        }
        
        return points;
    }

    // ============================================
    // MAIN AI UPDATE LOOP
    // ============================================
    function update(deltaTime, gameState) {
        // Update global player memory
        updatePlayerMemory(deltaTime);
        
        // Update each creature
        for (const creature of creatures) {
            if (creature.isDead) continue;
            
            updateCreatureAI(creature, deltaTime, gameState);
            updateCreaturePhysics(creature, deltaTime);
            updateCreatureAbilities(creature, deltaTime);
        }
        
        // Cleanup dead creatures
        creatures = creatures.filter(c => !c.isDead || c.corpseTimer > 0);
    }

    function updateCreatureAI(creature, dt, gameState) {
        const player = gameState.player;
        const type = creature.type;
        
        // Update timers
        creature.stateTimer += dt;
        
        // Decay alert and fear
        creature.alertLevel = Math.max(0, creature.alertLevel - dt * 5);
        creature.fearLevel = Math.max(0, creature.fearLevel - dt * 3);
        
        // Sense player
        const senses = sensePlayer(creature, player, gameState);
        
        // Update state machine
        switch(creature.state) {
            case STATES.IDLE:
                updateIdleState(creature, senses, dt);
                break;
            case STATES.PATROL:
                updatePatrolState(creature, senses, dt);
                break;
            case STATES.INVESTIGATE:
                updateInvestigateState(creature, senses, dt);
                break;
            case STATES.ALERT:
                updateAlertState(creature, senses, dt);
                break;
            case STATES.HUNT:
                updateHuntState(creature, senses, dt);
                break;
            case STATES.ATTACK:
                updateAttackState(creature, senses, dt, player);
                break;
            case STATES.SEARCH:
                updateSearchState(creature, senses, dt);
                break;
            case STATES.FLEE:
                updateFleeState(creature, senses, dt);
                break;
        }
        
        // Pack coordination
        if (creature.packId && creature.packMembers.length > 0) {
            updatePackBehavior(creature, dt);
        }
        
        // Special behavior: Mimic
        if (type.behavior === BEHAVIORS.MIMIC) {
            updateMimicBehavior(creature, senses);
        }
        
        // Special behavior: Stalker cloaking
        if (type.abilities.includes('cloaking')) {
            updateCloaking(creature, senses);
        }
    }

    // ============================================
    // STATE MACHINE
    // ============================================
    function updateIdleState(creature, senses, dt) {
        // Look around slowly
        creature.rotation.yaw += Math.sin(Date.now() * 0.001) * 0.5 * dt;
        
        // Transition to patrol after a while
        if (creature.stateTimer > 3) {
            changeState(creature, STATES.PATROL);
        }
        
        // React to stimuli
        if (senses.canSeePlayer) {
            onPlayerDetected(creature, senses);
        } else if (senses.canHearPlayer) {
            changeState(creature, STATES.INVESTIGATE);
            creature.investigationPoint = { ...senses.soundSource };
        }
    }

    function updatePatrolState(creature, senses, dt) {
        const target = creature.patrolPoints[creature.currentPatrolIndex];
        moveTowards(creature, target, creature.type.speed * 0.3);
        
        // Check if reached patrol point
        const dist = distance(creature.position, target);
        if (dist < 2) {
            creature.currentPatrolIndex = (creature.currentPatrolIndex + 1) % creature.patrolPoints.length;
            changeState(creature, STATES.IDLE);
        }
        
        // React to stimuli
        if (senses.canSeePlayer) {
            onPlayerDetected(creature, senses);
        } else if (senses.canHearPlayer) {
            changeState(creature, STATES.INVESTIGATE);
            creature.investigationPoint = { ...senses.soundSource };
        }
    }

    function updateInvestigateState(creature, senses, dt) {
        if (!creature.investigationPoint) {
            changeState(creature, STATES.PATROL);
            return;
        }
        
        moveTowards(creature, creature.investigationPoint, creature.type.speed * 0.6);
        
        const dist = distance(creature.position, creature.investigationPoint);
        if (dist < 3) {
            // Investigated but found nothing
            creature.alertLevel += 10;
            if (creature.alertLevel > 30) {
                changeState(creature, STATES.ALERT);
            } else {
                changeState(creature, STATES.PATROL);
            }
        }
        
        if (senses.canSeePlayer) {
            onPlayerDetected(creature, senses);
        }
    }

    function updateAlertState(creature, senses, dt) {
        // Stay alert, looking around
        creature.rotation.yaw += Math.sin(Date.now() * 0.003) * dt;
        
        // Alert increases over time
        creature.alertLevel = Math.min(100, creature.alertLevel + dt * 10);
        
        // Transition to hunt if alert is high enough
        if (creature.alertLevel > 50 && senses.canSeePlayer) {
            changeState(creature, STATES.HUNT);
        }
        
        // Calm down if nothing happens
        if (creature.stateTimer > 10 && !senses.canSeePlayer && !senses.canHearPlayer) {
            changeState(creature, STATES.PATROL);
            creature.alertLevel = 0;
        }
    }

    function updateHuntState(creature, senses, dt) {
        if (!senses.canSeePlayer && Date.now() - creature.targetLastSeen > creature.type.memoryDuration * 1000) {
            // Lost player
            changeState(creature, STATES.SEARCH);
            return;
        }
        
        // Update target position
        if (senses.canSeePlayer) {
            creature.targetPosition = { ...senses.playerPosition };
            creature.targetLastSeen = Date.now();
        }
        
        // Move towards target
        if (creature.targetPosition) {
            const speed = creature.type.speed * (1 - creature.fearLevel / 200);
            moveTowards(creature, creature.targetPosition, speed);
        }
        
        // Check attack range
        if (senses.distanceToPlayer < creature.type.attackRange) {
            changeState(creature, STATES.ATTACK);
        }
        
        // Coordinate with pack
        if (creature.packMembers.length > 0) {
            coordinatePackHunt(creature);
        }
    }

    function updateAttackState(creature, senses, dt, player) {
        // Face player
        facePosition(creature, player.position);
        
        // Attack cooldown
        if (Date.now() - creature.lastAttackTime > 2000) {
            performAttack(creature, player);
            creature.lastAttackTime = Date.now();
            
            // Learning: track successful hits
            if (senses.distanceToPlayer < creature.type.attackRange) {
                creature.personalMemory.successfulHits++;
                learnPlayerBehavior('takes_damage', true);
            }
        }
        
        // Check if should continue attacking
        if (senses.distanceToPlayer > creature.type.attackRange * 1.5) {
            changeState(creature, STATES.HUNT);
        }
        
        // Check fear (flee if took too much damage)
        if (creature.health < creature.maxHealth * creature.type.fearFactor) {
            changeState(creature, STATES.FLEE);
        }
    }

    function updateSearchState(creature, senses, dt) {
        // Search around last known position
        if (!creature.searchPoints) {
            creature.searchPoints = generateSearchPoints(creature.targetPosition);
            creature.currentSearchIndex = 0;
        }
        
        const target = creature.searchPoints[creature.currentSearchIndex];
        moveTowards(creature, target, creature.type.speed * 0.5);
        
        const dist = distance(creature.position, target);
        if (dist < 2) {
            creature.currentSearchIndex++;
            if (creature.currentSearchIndex >= creature.searchPoints.length) {
                // Give up search
                creature.personalMemory.playerEscapes++;
                changeState(creature, STATES.PATROL);
                creature.searchPoints = null;
                
                // Learn player hiding behavior
                learnPlayerBehavior('hiding_spot', creature.targetPosition);
            }
        }
        
        if (senses.canSeePlayer) {
            onPlayerDetected(creature, senses);
        }
    }

    function updateFleeState(creature, senses, dt) {
        // Run away from player
        const fleeDirection = {
            x: creature.position.x - senses.playerPosition.x,
            y: 0,
            z: creature.position.z - senses.playerPosition.z
        };
        normalize(fleeDirection);
        
        const fleeTarget = {
            x: creature.position.x + fleeDirection.x * 30,
            y: creature.position.y,
            z: creature.position.z + fleeDirection.z * 30
        };
        
        moveTowards(creature, fleeTarget, creature.type.speed * 1.2);
        
        // Recover health if possible
        if (creature.type.abilities.includes('regenerate')) {
            creature.health = Math.min(creature.maxHealth, creature.health + dt * 5);
        }
        
        // Stop fleeing if far enough and recovered
        if (senses.distanceToPlayer > 40 && creature.health > creature.maxHealth * 0.5) {
            creature.fearLevel = 0;
            changeState(creature, STATES.PATROL);
        }
    }

    // ============================================
    // SENSORY SYSTEM
    // ============================================
    function sensePlayer(creature, player, gameState) {
        const toPlayer = {
            x: player.position.x - creature.position.x,
            y: player.position.y - creature.position.y,
            z: player.position.z - creature.position.z
        };
        const distance = Math.sqrt(toPlayer.x**2 + toPlayer.y**2 + toPlayer.z**2);
        
        // Normalize direction
        if (distance > 0) {
            toPlayer.x /= distance;
            toPlayer.y /= distance;
            toPlayer.z /= distance;
        }
        
        // Check vision
        let canSeePlayer = false;
        if (distance < creature.type.detectionRange) {
            // Check angle (vision cone)
            const forward = {
                x: -Math.sin(creature.rotation.yaw),
                y: 0,
                z: -Math.cos(creature.rotation.yaw)
            };
            const angle = Math.acos(dotProduct(forward, toPlayer));
            
            if (angle < creature.type.visionCone / 2) {
                // Check line of sight (simplified)
                canSeePlayer = !gameState.isPlayerHidden && player.lightLevel > 0.1;
                
                // Cloaked stalkers are harder to see
                if (creature.isCloaked) {
                    canSeePlayer = canSeePlayer && distance < creature.type.detectionRange * 0.3;
                }
            }
        }
        
        // Check hearing
        let canHearPlayer = false;
        let soundSource = null;
        if (distance < creature.type.hearingRange) {
            // Player noise based on speed and actions
            const playerNoise = player.movementSpeed / 10 + (player.isSprinting ? 0.5 : 0);
            canHearPlayer = playerNoise > 0.3;
            soundSource = { ...player.position };
        }
        
        // Check for flare attraction
        let attractedToFlare = false;
        let flarePosition = null;
        if (gameState.activeFlares && gameState.activeFlares.length > 0) {
            for (const flare of gameState.activeFlares) {
                const distToFlare = distance(creature.position, flare.position);
                const attractionRange = creature.type.detectionRange * creature.type.lureAttraction;
                if (distToFlare < attractionRange) {
                    attractedToFlare = true;
                    flarePosition = { ...flare.position };
                    break;
                }
            }
        }
        
        return {
            canSeePlayer,
            canHearPlayer,
            distanceToPlayer: distance,
            directionToPlayer: toPlayer,
            playerPosition: { ...player.position },
            soundSource,
            attractedToFlare,
            flarePosition
        };
    }

    // ============================================
    // SPECIAL BEHAVIORS
    // ============================================
    function updatePackBehavior(creature, dt) {
        // Share target information with pack
        if (creature.targetPosition && creature.state === STATES.HUNT) {
            for (const memberId of creature.packMembers) {
                const member = creatures.find(c => c.id === memberId);
                if (member && member.state !== STATES.HUNT && member.state !== STATES.ATTACK) {
                    member.targetPosition = { ...creature.targetPosition };
                    changeState(member, STATES.HUNT);
                }
            }
        }
    }

    function coordinatePackHunt(creature) {
        // Surround player
        const packMembers = creature.packMembers
            .map(id => creatures.find(c => c.id === id))
            .filter(c => c && !c.isDead);
        
        const angleStep = (Math.PI * 2) / (packMembers.length + 1);
        const baseAngle = Math.atan2(
            creature.targetPosition.z - creature.position.z,
            creature.targetPosition.x - creature.position.x
        );
        
        // Assign positions around player
        let index = 0;
        for (const member of packMembers) {
            const angle = baseAngle + angleStep * (index + 1);
            const surroundDistance = 10;
            member.targetPosition = {
                x: creature.targetPosition.x + Math.cos(angle) * surroundDistance,
                y: creature.targetPosition.y,
                z: creature.targetPosition.z + Math.sin(angle) * surroundDistance
            };
            index++;
        }
    }

    function updateMimicBehavior(creature, senses) {
        if (creature.isDisguised) {
            // Stay still when disguised
            creature.velocity = { x: 0, y: 0, z: 0 };
            
            // Reveal when player gets close
            if (senses.distanceToPlayer < 3) {
                revealMimic(creature);
            }
        }
    }

    function revealMimic(creature) {
        creature.isDisguised = false;
        creature.alertLevel = 100;
        changeState(creature, STATES.ATTACK);
        
        // Jump scare effect
        if (window.cameraEffects) {
            window.cameraEffects.shake = 0.5;
        }
        
        if (window.showNotification) {
            window.showNotification('💀 IT\'S A MIMIC!', 'danger');
        }
    }

    function updateCloaking(creature, senses) {
        // Cloak when not hunting
        creature.isCloaked = (creature.state !== STATES.HUNT && creature.state !== STATES.ATTACK);
        
        // Reduce light emission when cloaked
        creature.lightEmission = creature.isCloaked ? 0 : 1;
    }

    // ============================================
    // ABILITIES
    // ============================================
    function updateCreatureAbilities(creature, dt) {
        // Update cooldowns
        for (const ability in creature.abilityCooldowns) {
            if (creature.abilityCooldowns[ability] > 0) {
                creature.abilityCooldowns[ability] -= dt;
            }
        }
        
        // Use abilities
        for (const ability of creature.type.abilities) {
            if (canUseAbility(creature, ability)) {
                useAbility(creature, ability);
            }
        }
    }

    function canUseAbility(creature, ability) {
        if (creature.abilityCooldowns[ability] > 0) return false;
        
        switch(ability) {
            case 'pounce':
                return creature.state === STATES.HUNT && creature.alertLevel > 50;
            case 'ambush':
                return creature.state === STATES.IDLE || creature.state === STATES.PATROL;
            case 'roar':
                return creature.state === STATES.ATTACK && creature.health < creature.maxHealth * 0.5;
            default:
                return false;
        }
    }

    function useAbility(creature, ability) {
        switch(ability) {
            case 'pounce':
                // Rapid charge at player
                creature.velocity.x *= 3;
                creature.velocity.z *= 3;
                creature.abilityCooldowns[ability] = 10;
                break;
                
            case 'roar':
                // Stun player, alert nearby creatures
                if (window.cameraEffects) {
                    window.cameraEffects.shake = 0.3;
                    window.cameraEffects.blur = 0.5;
                }
                creature.abilityCooldowns[ability] = 15;
                break;
                
            case 'ambush':
                // Wait for player to get close
                if (Math.random() < 0.01) {
                    changeState(creature, STATES.HUNT);
                }
                break;
        }
    }

    // ============================================
    // LEARNING AI
    // ============================================
    function learnPlayerBehavior(type, data) {
        switch(type) {
            case 'flare_usage':
                learnedBehaviors.playerFlareUsage++;
                // Reduce lure attraction over time
                if (learnedBehaviors.playerFlareUsage > 5) {
                    for (const creature of creatures) {
                        creature.type.lureAttraction *= 0.9;
                    }
                }
                break;
                
            case 'hiding_spot':
                const key = `${Math.round(data.x / 10)},${Math.round(data.z / 10)}`;
                learnedBehaviors.playerHidingFrequency[key] = 
                    (learnedBehaviors.playerHidingFrequency[key] || 0) + 1;
                break;
                
            case 'takes_damage':
                learnedBehaviors.playerResponseToAmbush = 'fights_back';
                break;
        }
    }

    function updatePlayerMemory(dt) {
        // Decay old memory
        if (Date.now() - playerMemory.lastSeenTime > 60000) {
            playerMemory.suspicionLevel = Math.max(0, playerMemory.suspicionLevel - dt);
        }
    }

    // ============================================
    // HELPERS
    // ============================================
    function changeState(creature, newState) {
        creature.previousState = creature.state;
        creature.state = newState;
        creature.stateTimer = 0;
        
        // State entry effects
        if (newState === STATES.HUNT) {
            creature.alertLevel = 100;
        }
    }

    function onPlayerDetected(creature, senses) {
        creature.targetPosition = { ...senses.playerPosition };
        creature.targetLastSeen = Date.now();
        playerMemory.lastKnownPosition = { ...senses.playerPosition };
        playerMemory.lastSeenTime = Date.now();
        playerMemory.suspicionLevel += 20;
        
        if (creature.state === STATES.IDLE || 
            creature.state === STATES.PATROL || 
            creature.state === STATES.INVESTIGATE) {
            changeState(creature, STATES.ALERT);
        }
    }

    function moveTowards(creature, target, speed) {
        const dx = target.x - creature.position.x;
        const dy = target.y - creature.position.y;
        const dz = target.z - creature.position.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (dist > 0.1) {
            creature.velocity.x = (dx / dist) * speed;
            creature.velocity.y = (dy / dist) * speed * 0.3; // Slower vertical
            creature.velocity.z = (dz / dist) * speed;
            
            // Face movement direction
            creature.rotation.yaw = Math.atan2(dx, dz);
        }
    }

    function facePosition(creature, target) {
        const dx = target.x - creature.position.x;
        const dz = target.z - creature.position.z;
        creature.rotation.yaw = Math.atan2(dx, dz);
    }

    function updateCreaturePhysics(creature, dt) {
        // Apply velocity
        creature.position.x += creature.velocity.x * dt;
        creature.position.y += creature.velocity.y * dt;
        creature.position.z += creature.velocity.z * dt;
        
        // Apply drag
        creature.velocity.x *= 0.95;
        creature.velocity.y *= 0.95;
        creature.velocity.z *= 0.95;
        
        // Keep in bounds
        const boundary = 80;
        creature.position.x = Math.max(-boundary, Math.min(boundary, creature.position.x));
        creature.position.z = Math.max(-boundary, Math.min(boundary, creature.position.z));
        creature.position.y = Math.min(-1, Math.max(-300, creature.position.y));
    }

    function performAttack(creature, player) {
        // Deal damage
        if (player && creature.type.damage) {
            player.health -= creature.type.damage;
            
            // Screen shake
            if (window.cameraEffects) {
                window.cameraEffects.shake = 0.3;
            }
            
            // Sound
            // playSound('creature_attack');
        }
    }

    function generateSearchPoints(center) {
        const points = [];
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 5 + Math.random() * 10;
            points.push({
                x: center.x + Math.cos(angle) * dist,
                y: center.y + (Math.random() - 0.5) * 5,
                z: center.z + Math.sin(angle) * dist
            });
        }
        return points;
    }

    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    function distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }

    function normalize(v) {
        const len = Math.sqrt(v.x**2 + v.y**2 + v.z**2);
        if (len > 0) {
            v.x /= len;
            v.y /= len;
            v.z /= len;
        }
    }

    function dotProduct(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        STATES,
        BEHAVIORS,
        CREATURE_TYPES,
        
        spawnCreature,
        update,
        
        getCreatures: () => creatures,
        getCreatureById: (id) => creatures.find(c => c.id === id),
        getCreaturesInRange: (position, range) => 
            creatures.filter(c => !c.isDead && distance(c.position, position) < range),
        
        killCreature: (id) => {
            const creature = creatures.find(c => c.id === id);
            if (creature) {
                creature.isDead = true;
                creature.corpseTimer = 60; // Stay for 60 seconds
                creature.state = STATES.DEAD;
                return creature.type.loot;
            }
            return null;
        },
        
        clearAll: () => {
            creatures = [];
        },
        
        // Learning data access
        getLearnedBehaviors: () => ({ ...learnedBehaviors }),
        
        // Force state change (for scripting)
        forceStateChange: changeState
    };
})();

// Global access
window.AISystem = AISystem;
