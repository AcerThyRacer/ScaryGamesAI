/* ============================================
   The Abyss - Environmental Hazard System
   Phase 3 Implementation
   ============================================ */

const HazardSystem = (function() {
    'use strict';

    // Hazard types
    const HAZARD_TYPES = {
        COLLAPSING_TUNNEL: {
            id: 'collapsing_tunnel',
            name: 'Collapsing Tunnel',
            damage: 50,
            damageType: 'crushing',
            warningTime: 5,
            escapeTime: 10,
            effects: ['screen_shake', 'dust_cloud', 'noise'],
            persistent: false
        },

        TOXIC_GAS: {
            id: 'toxic_gas',
            name: 'Toxic Gas Vent',
            damage: 10, // per second
            damageType: 'poison',
            warningTime: 2,
            duration: 30,
            effects: ['visibility_reduction', 'coughing', 'green_tint'],
            persistent: true,
            visualRange: 15
        },

        ELECTRIC_EEL: {
            id: 'electric_eel',
            name: 'Electric Field',
            damage: 25,
            damageType: 'electric',
            warningTime: 1,
            duration: 5,
            effects: ['screen_flash', 'stun', 'equipment_malfunction'],
            persistent: false,
            cooldown: 10
        },

        WHIRLPOOL: {
            id: 'whirlpool',
            name: 'Whirlpool',
            damage: 5, // per second + drag
            damageType: 'drowning',
            warningTime: 3,
            duration: 20,
            effects: ['pull_force', 'spinning', 'disorientation'],
            persistent: true,
            pullStrength: 8
        },

        SHARP_CORAL: {
            id: 'sharp_coral',
            name: 'Sharp Coral',
            damage: 15,
            damageType: 'cutting',
            warningTime: 0,
            effects: ['bleeding'],
            persistent: true,
            passive: true
        },

        EXPLOSIVE_GAS: {
            id: 'explosive_gas',
            name: 'Methane Bubble',
            damage: 75,
            damageType: 'explosion',
            warningTime: 0.5,
            effects: ['explosion', 'knockback', 'deafness'],
            persistent: false,
            trigger: 'proximity'
        },

        COLD_VENT: {
            id: 'cold_vent',
            name: 'Hypothermic Vent',
            damage: 8, // per second
            damageType: 'cold',
            warningTime: 2,
            duration: 15,
            effects: ['slow_movement', 'shivering', 'blue_tint'],
            persistent: true
        },

        ANGLER_TRAP: {
            id: 'angler_trap',
            name: 'Lure Trap',
            damage: 30,
            damageType: 'bite',
            warningTime: 0,
            effects: ['surprise_attack', 'grab'],
            persistent: false,
            trigger: 'attraction'
        },

        TRENCH_EDGE: {
            id: 'trench_edge',
            name: 'Trench Collapse',
            damage: 100,
            damageType: 'falling',
            warningTime: 3,
            effects: ['falling', 'separate_from_group'],
            persistent: false
        }
    };

    // Active hazards
    let activeHazards = [];
    let triggeredHazards = [];

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        activeHazards = [];
        triggeredHazards = [];
    }

    // ============================================
    // HAZARD SPAWNING
    // ============================================
    function spawnHazard(typeId, position, options = {}) {
        const type = HAZARD_TYPES[typeId.toUpperCase()];
        if (!type) {
            console.error('Unknown hazard type:', typeId);
            return null;
        }

        const hazard = {
            id: generateId(),
            type: type,
            position: { ...position },
            state: 'dormant', // dormant, warning, active, cooldown
            timer: 0,
            duration: options.duration || type.duration,
            radius: options.radius || 10,
            intensity: options.intensity || 1.0,
            triggeredBy: null,
            affectedEntities: [],
            visualEffects: [],
            audioEffects: []
        };

        activeHazards.push(hazard);

        // Create visual representation
        createHazardVisuals(hazard);

        return hazard;
    }

    function createHazardVisuals(hazard) {
        // Different visuals based on hazard type
        switch(hazard.type.id) {
            case 'toxic_gas':
                hazard.visualEffects.push({
                    type: 'particle_cloud',
                    color: 0x00ff00,
                    density: 0.5
                });
                break;
            case 'whirlpool':
                hazard.visualEffects.push({
                    type: 'vortex',
                    color: 0x004080,
                    rotationSpeed: 2
                });
                break;
            case 'electric_eel':
                hazard.visualEffects.push({
                    type: 'electricity',
                    color: 0xffff00,
                    pulseRate: 5
                });
                break;
            case 'sharp_coral':
                hazard.visualEffects.push({
                    type: 'spikes',
                    color: 0xff4444
                });
                break;
        }
    }

    // ============================================
    // MAIN UPDATE LOOP
    // ============================================
    function update(deltaTime, player, creatures) {
        // Update each hazard
        for (const hazard of activeHazards) {
            updateHazard(hazard, deltaTime, player, creatures);
        }

        // Check for passive hazards
        checkPassiveHazards(player);

        // Cleanup expired hazards
        cleanupHazards();
    }

    function updateHazard(hazard, dt, player, creatures) {
        const distToPlayer = distance(hazard.position, player.position);
        const inRange = distToPlayer < hazard.radius;

        switch(hazard.state) {
            case 'dormant':
                // Check trigger conditions
                if (inRange) {
                    if (hazard.type.trigger === 'proximity') {
                        triggerHazard(hazard);
                    } else if (hazard.type.warningTime > 0) {
                        startWarning(hazard);
                    } else {
                        triggerHazard(hazard);
                    }
                }
                break;

            case 'warning':
                hazard.timer -= dt;

                // Warning effects
                if (inRange) {
                    showWarningUI(hazard, hazard.timer / hazard.type.warningTime);
                }

                if (hazard.timer <= 0) {
                    triggerHazard(hazard);
                }
                break;

            case 'active':
                hazard.timer -= dt;

                // Apply effects to player
                if (inRange) {
                    applyHazardEffect(hazard, player, dt);
                }

                // Apply to creatures
                for (const creature of creatures) {
                    if (distance(hazard.position, creature.position) < hazard.radius) {
                        applyHazardToCreature(hazard, creature, dt);
                    }
                }

                // Check if duration expired
                if (hazard.timer <= 0 && hazard.type.duration) {
                    if (hazard.type.persistent) {
                        hazard.state = 'cooldown';
                        hazard.timer = hazard.type.cooldown || 10;
                    } else {
                        hazard.state = 'expired';
                    }
                }
                break;

            case 'cooldown':
                hazard.timer -= dt;
                if (hazard.timer <= 0) {
                    hazard.state = 'dormant';
                }
                break;
        }
    }

    function startWarning(hazard) {
        hazard.state = 'warning';
        hazard.timer = hazard.type.warningTime;

        // Audio warning
        playWarningSound(hazard.type);

        // Visual warning
        if (window.showNotification) {
            window.showNotification(`⚠️ ${hazard.type.name} imminent!`, 'warning');
        }
    }

    function triggerHazard(hazard) {
        hazard.state = 'active';
        hazard.timer = hazard.duration || 5;
        hazard.triggeredBy = Date.now();

        // Trigger effects
        triggerHazardEffects(hazard);

        // Notification
        if (window.showNotification) {
            window.showNotification(`💥 ${hazard.type.name} triggered!`, 'danger');
        }

        // Add to triggered list
        triggeredHazards.push({
            id: hazard.id,
            type: hazard.type.id,
            time: Date.now()
        });
    }

    function triggerHazardEffects(hazard) {
        for (const effect of hazard.type.effects) {
            switch(effect) {
                case 'screen_shake':
                    if (window.cameraEffects) {
                        window.cameraEffects.shake = 0.5;
                    }
                    break;
                case 'explosion':
                    if (window.cameraEffects) {
                        window.cameraEffects.shake = 0.8;
                        window.cameraEffects.flash = 1.0;
                    }
                    break;
                case 'noise':
                    // Emit loud noise attracting creatures
                    if (window.StealthSystem) {
                        window.StealthSystem.emitNoise(hazard.position, 50, 'collapse');
                    }
                    break;
            }
        }
    }

    function applyHazardEffect(hazard, player, dt) {
        // Calculate damage
        const damage = hazard.type.damage * hazard.intensity * dt;

        // Apply damage
        if (damage > 0) {
            player.health -= damage;

            // Special effects based on damage type
            switch(hazard.type.damageType) {
                case 'poison':
                    // Screen green tint
                    if (window.cameraEffects) {
                        window.cameraEffects.colorTint = { r: 0, g: 0.3, b: 0 };
                    }
                    break;

                case 'cold':
                    // Slow movement
                    if (player.velocity) {
                        player.velocity.x *= 0.9;
                        player.velocity.z *= 0.9;
                    }
                    break;

                case 'electric':
                    // Stun - disable controls briefly
                    if (Math.random() < 0.1) {
                        player.stunned = true;
                        setTimeout(() => { player.stunned = false; }, 1000);
                    }
                    // Drain flashlight
                    player.flashlightBattery = Math.max(0, player.flashlightBattery - 20);
                    break;

                case 'cutting':
                    // Bleeding effect
                    if (window.StealthSystem) {
                        window.StealthSystem.setBloodTrail(true);
                    }
                    break;
            }
        }

        // Special hazard mechanics
        switch(hazard.type.id) {
            case 'whirlpool':
                // Pull player towards center
                const pullDir = {
                    x: hazard.position.x - player.position.x,
                    y: hazard.position.y - player.position.y,
                    z: hazard.position.z - player.position.z
                };
                const dist = Math.sqrt(pullDir.x**2 + pullDir.y**2 + pullDir.z**2);
                if (dist > 0 && player.velocity) {
                    const pullStrength = hazard.type.pullStrength * (1 - dist / hazard.radius);
                    player.velocity.x += (pullDir.x / dist) * pullStrength * dt;
                    player.velocity.z += (pullDir.z / dist) * pullStrength * dt;

                    // Spin
                    player.rotation = player.rotation || {};
                    player.rotation.yaw += dt * 2;
                }
                break;

            case 'toxic_gas':
                // Reduce visibility
                if (window.scene && window.scene.fog) {
                    window.scene.fog.density = Math.min(0.1, window.scene.fog.density + dt * 0.01);
                }
                break;
        }
    }

    function applyHazardToCreature(hazard, creature, dt) {
        // Creatures can also be affected by hazards
        const damage = hazard.type.damage * dt * 0.5; // Creatures take less damage

        if (creature.health) {
            creature.health -= damage;

            // Creature may flee
            if (creature.health < creature.maxHealth * 0.3) {
                if (window.AISystem) {
                    window.AISystem.forceStateChange(creature, window.AISystem.STATES.FLEE);
                }
            }
        }
    }

    function checkPassiveHazards(player) {
        // Check for coral, mines, etc.
        for (const hazard of activeHazards) {
            if (hazard.type.passive && hazard.state === 'dormant') {
                const dist = distance(hazard.position, player.position);
                if (dist < 2) { // Very close
                    applyHazardEffect(hazard, player, 1);
                }
            }
        }
    }

    function cleanupHazards() {
        // Remove expired hazards
        activeHazards = activeHazards.filter(h => h.state !== 'expired');

        // Limit triggered history
        if (triggeredHazards.length > 100) {
            triggeredHazards = triggeredHazards.slice(-50);
        }
    }

    // ============================================
    // DYNAMIC HAZARD GENERATION
    // ============================================
    function generateDynamicHazard(playerPosition, biome) {
        // Chance to spawn hazard based on biome danger
        const chance = biome.dangerLevel * 0.02; // 2-8% per check

        if (Math.random() > chance) return null;

        // Select hazard type based on biome
        let possibleHazards = [];

        switch(biome.id) {
            case 'shallows':
                possibleHazards = ['sharp_coral'];
                break;
            case 'twilight':
                possibleHazards = ['sharp_coral', 'electric_eel', 'angler_trap'];
                break;
            case 'midnight':
                possibleHazards = ['toxic_gas', 'whirlpool', 'electric_eel', 'explosive_gas'];
                break;
            case 'abyss':
                possibleHazards = ['toxic_gas', 'whirlpool', 'trench_edge', 'cold_vent'];
                break;
            case 'hadal':
                possibleHazards = ['toxic_gas', 'trench_edge', 'explosive_gas'];
                break;
        }

        if (possibleHazards.length === 0) return null;

        const typeId = possibleHazards[Math.floor(Math.random() * possibleHazards.length)];

        // Position ahead of player
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 30;
        const position = {
            x: playerPosition.x + Math.cos(angle) * distance,
            y: playerPosition.y + (Math.random() - 0.5) * 10,
            z: playerPosition.z + Math.sin(angle) * distance
        };

        return spawnHazard(typeId, position);
    }

    // ============================================
    // SCRIPTED HAZARDS
    // ============================================
    function triggerCaveCollapse(playerPosition, direction) {
        const hazard = spawnHazard('collapsing_tunnel', playerPosition, {
            radius: 15,
            duration: 15
        });

        // Create escape route
        const escapePoint = {
            x: playerPosition.x + direction.x * 30,
            y: playerPosition.y,
            z: playerPosition.z + direction.z * 30
        };

        // Show escape marker
        if (window.showNotification) {
            window.showNotification('🚨 CAVE COLLAPSING! SWIM FOR YOUR LIFE!', 'danger');
        }

        return {
            hazard: hazard,
            escapePoint: escapePoint
        };
    }

    function triggerGasExplosion(position, chainRadius = 20) {
        // Main explosion
        spawnHazard('explosive_gas', position, {
            radius: 10,
            intensity: 1.5
        });

        // Chain explosions nearby
        setTimeout(() => {
            for (let i = 0; i < 3; i++) {
                const offset = {
                    x: (Math.random() - 0.5) * chainRadius,
                    y: (Math.random() - 0.5) * 10,
                    z: (Math.random() - 0.5) * chainRadius
                };
                spawnHazard('explosive_gas', {
                    x: position.x + offset.x,
                    y: position.y + offset.y,
                    z: position.z + offset.z
                }, { radius: 8 });
            }
        }, 500);
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function showWarningUI(hazard, progress) {
        // Visual warning indicator
        if (window.showNotification && progress > 0.8) {
            // Only show at 20% warning time remaining
        }
    }

    function playWarningSound(hazardType) {
        // Play appropriate warning sound
    }

    function distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }

    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // ============================================
    // GETTERS
    // ============================================
    function getActiveHazards() {
        return [...activeHazards];
    }

    function getHazardsInRange(position, range) {
        return activeHazards.filter(h =>
            distance(h.position, position) < range + h.radius
        );
    }

    function getTriggeredHazardHistory() {
        return [...triggeredHazards];
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        HAZARD_TYPES,

        init,
        update,

        // Spawning
        spawnHazard,
        generateDynamicHazard,

        // Scripted events
        triggerCaveCollapse,
        triggerGasExplosion,

        // State control
        triggerHazard,
        startWarning,

        // Queries
        getActiveHazards,
        getHazardsInRange,
        getTriggeredHazardHistory,

        // Utilities
        createHazardVisuals
    };
})();

// Global access
window.HazardSystem = HazardSystem;
