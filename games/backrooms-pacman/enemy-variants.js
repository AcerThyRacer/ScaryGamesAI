/**
 * Enemy Variants System
 * Implements 6 unique Pac-Man variants with special abilities
 */

var EnemyVariants = (function() {
    'use strict';

    var variants = {
        classic: {
            name: 'Classic',
            speed: 3.5,
            health: 1,
            damage: 1,
            color: 0xffff00,
            abilities: [],
            description: 'Standard Pac-Man behavior'
        },
        ghost_pac: {
            name: 'Ghost Pac',
            speed: 4.0,
            health: 1,
            damage: 1,
            color: 0x88ff88,
            abilities: ['phase'],
            phaseChance: 0.15,
            phaseDuration: 2,
            description: 'Can phase through walls'
        },
        berserker: {
            name: 'Berserker',
            speed: 3.0,
            health: 2,
            damage: 2,
            color: 0xff0000,
            abilities: ['enrage'],
            enrageThreshold: 8,
            enrageSpeed: 6.0,
            description: 'Speeds up when close to player'
        },
        hunter: {
            name: 'Hunter',
            speed: 3.2,
            health: 1,
            damage: 1,
            color: 0x8800ff,
            abilities: ['predict', 'trap'],
            predictionAccuracy: 0.7,
            trapCooldown: 15,
            description: 'Predicts player movement and sets traps'
        },
        swarm: {
            name: 'Swarm',
            speed: 2.8,
            health: 1,
            damage: 1,
            color: 0xff8800,
            abilities: ['split'],
            splitThreshold: 0.5,
            minionCount: 2,
            description: 'Splits into smaller Pac-Men'
        },
        shadow: {
            name: 'Shadow',
            speed: 3.5,
            health: 1,
            damage: 1,
            color: 0x220022,
            abilities: ['teleport', 'vanish'],
            teleportCooldown: 8,
            teleportRange: 15,
            vanishDuration: 3,
            description: 'Teleports and becomes invisible'
        }
    };

    var activeVariants = [];
    var scene = null;

    function init(threeScene) {
        scene = threeScene;
        activeVariants = [];
    }

    function spawnVariant(variantKey, position) {
        var variant = variants[variantKey];
        if (!variant) {
            console.warn('Unknown variant:', variantKey);
            variant = variants.classic;
        }

        var entity = {
            variant: variantKey,
            config: Object.assign({}, variant),
            position: position.clone(),
            velocity: new THREE.Vector3(),
            mesh: null,
            state: 'hunt',
            cooldowns: {},
            specialData: {}
        };

        entity.mesh = createVariantMesh(entity);
        if (entity.mesh) {
            scene.add(entity.mesh);
        }

        activeVariants.push(entity);
        return entity;
    }

    function createVariantMesh(entity) {
        var geometry = new THREE.SphereGeometry(0.8, 16, 16);
        var material = new THREE.MeshStandardMaterial({
            color: entity.config.color,
            emissive: entity.config.color,
            emissiveIntensity: 0.4,
            roughness: 0.4,
            metalness: 0.6,
            transparent: entity.variant === 'ghost_pac' || entity.variant === 'shadow'
        });

        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(entity.position);

        // Add eyes
        var eyeGeo = new THREE.SphereGeometry(0.15, 8, 8);
        var eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.25, 0.2, 0.65);
        mesh.add(leftEye);

        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.25, 0.2, 0.65);
        mesh.add(rightEye);

        // Add light
        var light = new THREE.PointLight(entity.config.color, 0.6, 10);
        light.position.set(0, 0.3, 0);
        mesh.add(light);
        entity.light = light;

        // Variant-specific visual effects
        if (entity.variant === 'berserker') {
            var spikeGeo = new THREE.ConeGeometry(0.1, 0.4, 8);
            var spikeMat = new THREE.MeshStandardMaterial({
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 0.5
            });

            for (var i = 0; i < 8; i++) {
                var spike = new THREE.Mesh(spikeGeo, spikeMat);
                var angle = (i / 8) * Math.PI * 2;
                spike.position.set(Math.cos(angle) * 0.7, 0, Math.sin(angle) * 0.7);
                spike.rotation.x = Math.PI / 4;
                mesh.add(spike);
            }
        }

        if (entity.variant === 'hunter') {
            var visorGeo = new THREE.BoxGeometry(0.6, 0.15, 0.1);
            var visorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            var visor = new THREE.Mesh(visorGeo, visorMat);
            visor.position.set(0, 0.3, 0.6);
            mesh.add(visor);
        }

        return mesh;
    }

    function updateVariant(entity, deltaTime, playerPos) {
        if (!entity.mesh) return;

        // Update cooldowns
        for (var key in entity.cooldowns) {
            if (entity.cooldowns[key] > 0) {
                entity.cooldowns[key] -= deltaTime;
            }
        }

        // Variant-specific updates
        switch (entity.variant) {
            case 'ghost_pac':
                updateGhostPac(entity, deltaTime);
                break;
            case 'berserker':
                updateBerserker(entity, deltaTime, playerPos);
                break;
            case 'hunter':
                updateHunter(entity, deltaTime, playerPos);
                break;
            case 'swarm':
                updateSwarm(entity, deltaTime, playerPos);
                break;
            case 'shadow':
                updateShadow(entity, deltaTime, playerPos);
                break;
        }

        // Update mesh position
        entity.mesh.position.copy(entity.position);
    }

    function updateGhostPac(entity, deltaTime) {
        var time = Date.now() * 0.002;
        var opacity = 0.4 + Math.sin(time) * 0.3;

        entity.mesh.material.opacity = opacity;

        // Phase through walls occasionally
        if (entity.cooldowns['phase'] <= 0 && Math.random() < 0.01) {
            entity.mesh.material.opacity = 0.2;
            entity.cooldowns['phase'] = entity.config.phaseDuration;
        }
    }

    function updateBerserker(entity, deltaTime, playerPos) {
        var dist = playerPos ? entity.position.distanceTo(playerPos) : 999;

        if (dist < entity.config.enrageThreshold) {
            entity.mesh.scale.setScalar(1.2);
            entity.light.intensity = 1.0;
        } else {
            entity.mesh.scale.setScalar(1.0);
            entity.light.intensity = 0.6;
        }
    }

    function updateHunter(entity, deltaTime, playerPos) {
        // Hunter prediction logic handled in AI system
        if (entity.cooldowns['trap'] <= 0 && playerPos && Math.random() < 0.005) {
            // Could place trap here
            entity.cooldowns['trap'] = entity.config.trapCooldown;
        }
    }

    function updateSwarm(entity, deltaTime, playerPos) {
        // Swarm splitting logic
        if (entity.specialData.shouldSplit) {
            // Spawn minions
            entity.specialData.shouldSplit = false;
        }
    }

    function updateShadow(entity, deltaTime, playerPos) {
        // Teleport logic
        if (entity.cooldowns['teleport'] <= 0 && playerPos) {
            var dist = entity.position.distanceTo(playerPos);
            if (dist > 10 && Math.random() < 0.02) {
                // Teleport behind player
                var direction = new THREE.Vector3().subVectors(
                    playerPos,
                    entity.position
                ).normalize();

                var teleportPos = playerPos.clone().add(
                    direction.multiplyScalar(-entity.config.teleportRange)
                );

                entity.position.copy(teleportPos);
                entity.cooldowns['teleport'] = entity.config.teleportCooldown;

                // Visual effect
                entity.mesh.material.opacity = 0.2;
                setTimeout(function() {
                    if (entity.mesh) entity.mesh.material.opacity = 1.0;
                }, 500);
            }
        }

        // Vanish logic
        if (entity.cooldowns['vanish'] > 0) {
            entity.mesh.visible = false;
        } else {
            entity.mesh.visible = true;
        }
    }

    function getVariant(variantKey) {
        return variants[variantKey] || variants.classic;
    }

    function getAllVariants() {
        return variants;
    }

    function getActiveVariants() {
        return activeVariants;
    }

    function clearAll() {
        for (var i = 0; i < activeVariants.length; i++) {
            var entity = activeVariants[i];
            if (entity.mesh) {
                scene.remove(entity.mesh);
                entity.mesh.geometry.dispose();
                entity.mesh.material.dispose();
            }
        }
        activeVariants = [];
    }

    return {
        init: init,
        spawnVariant: spawnVariant,
        updateVariant: updateVariant,
        getVariant: getVariant,
        getAllVariants: getAllVariants,
        getActiveVariants: getActiveVariants,
        clearAll: clearAll
    };
})();

if (typeof window !== 'undefined') {
    window.EnemyVariants = EnemyVariants;
}
