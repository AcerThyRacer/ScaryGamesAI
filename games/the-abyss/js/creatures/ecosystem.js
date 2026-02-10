/* ============================================
   The Abyss - Creature Ecosystem
   12+ creature types with behaviors and spawning
   Phase 2 Implementation
   ============================================ */

const CreatureEcosystem = (function() {
    'use strict';

    // Creature definitions
    const CREATURES = {
        // Passive/Small
        small_fish: {
            name: 'Deep Fish',
            type: 'passive',
            health: 10,
            speed: 3,
            damage: 0,
            behavior: 'school',
            biomes: ['sunlit', 'twilight'],
            size: 0.3,
            drops: ['meat', 'scale'],
            xp: 5
        },

        jellyfish: {
            name: 'Ghost Jelly',
            type: 'passive',
            health: 20,
            speed: 1,
            damage: 5,
            behavior: 'float',
            biomes: ['sunlit', 'twilight', 'midnight'],
            size: 0.5,
            bioluminescent: true,
            drops: ['gel', 'venom'],
            xp: 10
        },

        // Neutral
        squid: {
            name: 'Deep Squid',
            type: 'neutral',
            health: 40,
            speed: 6,
            damage: 15,
            behavior: 'curious',
            biomes: ['twilight', 'midnight'],
            size: 1,
            abilities: ['ink_cloud'],
            drops: ['ink', 'meat'],
            xp: 25
        },

        angler: {
            name: 'Anglerfish',
            type: 'hostile',
            health: 60,
            speed: 4,
            damage: 20,
            behavior: 'ambush',
            biomes: ['twilight', 'midnight'],
            size: 1.2,
            bioluminescent: true,
            detectionRange: 15,
            drops: ['angler_lure', 'teeth'],
            xp: 40
        },

        stalker: {
            name: 'Deep Stalker',
            type: 'hostile',
            health: 100,
            speed: 8,
            damage: 30,
            behavior: 'hunt',
            biomes: ['midnight', 'abyssal'],
            size: 2,
            abilities: ['cloaking', 'pounce'],
            detectionRange: 25,
            drops: ['stalker_hide', 'claw'],
            xp: 75
        },

        mimic: {
            name: 'Mimic',
            type: 'trap',
            health: 80,
            speed: 5,
            damage: 40,
            behavior: 'disguise',
            biomes: ['midnight', 'abyssal', 'hadal'],
            size: 1,
            disguises: ['chest', 'rock', 'plant'],
            detectionRange: 5,
            drops: ['mimic_essence', 'strange_flesh'],
            xp: 100
        },

        swarmer: {
            name: 'Swarm Eel',
            type: 'hostile',
            health: 15,
            speed: 10,
            damage: 8,
            behavior: 'pack',
            biomes: ['twilight', 'midnight'],
            size: 0.4,
            packSize: 5,
            drops: ['eel_skin'],
            xp: 10
        },

        // Apex
        leviathan_juvenile: {
            name: 'Juvenile Leviathan',
            type: 'boss',
            health: 500,
            speed: 12,
            damage: 50,
            behavior: 'territorial',
            biomes: ['abyssal'],
            size: 8,
            abilities: ['charge', 'tail_sweep', 'roar'],
            detectionRange: 50,
            drops: ['leviathan_scale', 'ancient_bone', 'leviathan_heart'],
            xp: 500
        },

        leviathan: {
            name: 'Abyssal Leviathan',
            type: 'apex',
            health: 2000,
            speed: 15,
            damage: 100,
            behavior: 'apex_predator',
            biomes: ['hadal'],
            size: 20,
            abilities: ['swallow', 'sonic_blast', 'summon_minions'],
            detectionRange: 100,
            drops: ['leviathan_eye', 'primordial_scale', 'abyssal_heart'],
            xp: 2000
        },

        ancient_one: {
            name: 'The Ancient One',
            type: 'final_boss',
            health: 10000,
            speed: 8,
            damage: 200,
            behavior: 'eldritch',
            biomes: ['hadal'],
            size: 30,
            abilities: ['reality_warp', 'mind_attack', 'summon_horrors', 'regenerate'],
            detectionRange: 150,
            drops: ['primordial_eye', 'ancient_heart', 'void_essence'],
            xp: 10000
        },

        // Special
        void_walker: {
            name: 'Void Walker',
            type: 'eldritch',
            health: 300,
            speed: 15,
            damage: 60,
            behavior: 'teleport',
            biomes: ['hadal'],
            size: 3,
            abilities: ['teleport', 'phase_shift'],
            detectionRange: 40,
            drops: ['void_fragment', 'dark_matter'],
            xp: 300
        },

        ruin_guardian: {
            name: 'Ruin Guardian',
            type: 'construct',
            health: 200,
            speed: 3,
            damage: 35,
            behavior: 'guard',
            biomes: ['sunken_city'],
            size: 2.5,
            abilities: ['shield', 'laser_beam'],
            detectionRange: 20,
            drops: ['ancient_mechanism', 'power_core'],
            xp: 150
        }
    };

    // Active creatures in world
    const activeCreatures = [];
    let spawnTimer = 0;
    let dangerLevel = 0;

    class Creature {
        constructor(type, position) {
            this.id = `creature_${Date.now()}_${Math.random()}`;
            this.type = type;
            this.config = CREATURES[type];

            this.position = position.clone();
            this.velocity = new THREE.Vector3();
            this.health = this.config.health;
            this.maxHealth = this.config.health;

            this.state = 'idle';
            this.target = null;
            this.stateTimer = 0;

            this.hasSeenPlayer = false;
            this.lastPlayerPosition = null;

            // Visual
            this.mesh = null;
            this.light = null;

            this.createVisuals();
        }

        createVisuals() {
            // Simplified visuals - would use actual models
            const geometry = new THREE.SphereGeometry(this.config.size, 8, 8);
            const material = new THREE.MeshStandardMaterial({
                color: this.config.bioluminescent ? 0x00ff88 : 0x224466,
                emissive: this.config.bioluminescent ? 0x004400 : 0x000000
            });

            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.copy(this.position);

            if (window.scene) {
                window.scene.add(this.mesh);
            }

            // Bioluminescent light
            if (this.config.bioluminescent) {
                this.light = new THREE.PointLight(0x00ff88, 1, 10);
                this.light.position.copy(this.position);
                window.scene?.add(this.light);
            }
        }

        update(deltaTime, player) {
            this.stateTimer += deltaTime;

            // Update behavior
            switch(this.config.behavior) {
                case 'school':
                    this.updateSchoolBehavior(deltaTime, player);
                    break;
                case 'ambush':
                    this.updateAmbushBehavior(deltaTime, player);
                    break;
                case 'hunt':
                    this.updateHuntBehavior(deltaTime, player);
                    break;
                case 'pack':
                    this.updatePackBehavior(deltaTime, player);
                    break;
                default:
                    this.updateDefaultBehavior(deltaTime, player);
            }

            // Apply velocity
            this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

            // Update mesh
            if (this.mesh) {
                this.mesh.position.copy(this.position);
            }
            if (this.light) {
                this.light.position.copy(this.position);
            }

            // Boundary check
            this.position.y = Math.max(-400, Math.min(-1, this.position.y));
        }

        updateSchoolBehavior(deltaTime, player) {
            // Swim in circles, avoid player
            const distToPlayer = this.position.distanceTo(player.position);

            if (distToPlayer < 10) {
                // Flee
                const fleeDir = this.position.clone().sub(player.position).normalize();
                this.velocity.add(fleeDir.multiplyScalar(5 * deltaTime));
            }

            // Natural swimming motion
            this.velocity.x += Math.sin(Date.now() * 0.001 + this.id) * deltaTime;
            this.velocity.z += Math.cos(Date.now() * 0.001 + this.id) * deltaTime;

            // Clamp speed
            if (this.velocity.length() > this.config.speed) {
                this.velocity.normalize().multiplyScalar(this.config.speed);
            }
        }

        updateAmbushBehavior(deltaTime, player) {
            const distToPlayer = this.position.distanceTo(player.position);

            if (distToPlayer < this.config.detectionRange && !this.hasSeenPlayer) {
                this.hasSeenPlayer = true;
                this.state = 'hunting';
            }

            if (this.state === 'hunting') {
                // Chase player
                const chaseDir = player.position.clone().sub(this.position).normalize();
                this.velocity.add(chaseDir.multiplyScalar(this.config.speed * deltaTime));

                // Attack if close
                if (distToPlayer < 2) {
                    this.attack(player);
                }
            } else {
                // Wait
                this.velocity.multiplyScalar(0.9);
            }
        }

        updateHuntBehavior(deltaTime, player) {
            const distToPlayer = this.position.distanceTo(player.position);

            if (distToPlayer < this.config.detectionRange) {
                // Stalk from shadows
                const toPlayer = player.position.clone().sub(this.position);
                const distance = toPlayer.length();

                if (distance > 10) {
                    // Approach
                    this.velocity.add(toPlayer.normalize().multiplyScalar(this.config.speed * 0.5 * deltaTime));
                } else {
                    // Circle and attack
                    const angle = Date.now() * 0.001;
                    const circleOffset = new THREE.Vector3(
                        Math.cos(angle) * 5,
                        0,
                        Math.sin(angle) * 5
                    );
                    const targetPos = player.position.clone().add(circleOffset);
                    const dir = targetPos.sub(this.position).normalize();
                    this.velocity.add(dir.multiplyScalar(this.config.speed * deltaTime));
                }

                if (distToPlayer < 3) {
                    this.attack(player);
                }
            }
        }

        updatePackBehavior(deltaTime, player) {
            // Similar to hunt but coordinate with pack
            this.updateHuntBehavior(deltaTime, player);
        }

        updateDefaultBehavior(deltaTime, player) {
            // Wander randomly
            if (Math.random() < 0.1) {
                this.velocity.add(new THREE.Vector3(
                    (Math.random() - 0.5) * this.config.speed,
                    (Math.random() - 0.5) * this.config.speed,
                    (Math.random() - 0.5) * this.config.speed
                ));
            }

            if (this.velocity.length() > this.config.speed) {
                this.velocity.normalize().multiplyScalar(this.config.speed);
            }
        }

        attack(player) {
            if (this.stateTimer < 1) return; // Attack cooldown

            player.health -= this.config.damage;
            this.stateTimer = 0;

            // Screen shake
            if (window.cameraEffects) {
                window.cameraEffects.shake = 0.3;
            }

            // Sound
            if (window.ProceduralSound) {
                window.ProceduralSound.generateCreatureAttack(this.config.name);
            }
        }

        takeDamage(amount) {
            this.health -= amount;

            if (this.health <= 0) {
                this.die();
            }
        }

        die() {
            // Drop loot
            this.config.drops?.forEach(drop => {
                if (Math.random() < 0.5 && window.ResourceSystem) {
                    window.ResourceSystem.addItem(drop, 1);
                }
            });

            // XP
            if (window.SaveSystem) {
                window.SaveSystem.updateSessionStat('creatureKills', 1);
            }

            this.dispose();
        }

        dispose() {
            if (this.mesh) {
                window.scene?.remove(this.mesh);
                this.mesh.geometry?.dispose();
                this.mesh.material?.dispose();
            }
            if (this.light) {
                window.scene?.remove(this.light);
            }

            const index = activeCreatures.indexOf(this);
            if (index > -1) {
                activeCreatures.splice(index, 1);
            }
        }
    }

    // Spawning
    function spawnForBiome(biome) {
        const maxCreatures = biome.maxCreatures || 5;

        if (activeCreatures.length >= maxCreatures) return;

        // Select creature type
        const available = biome.creatureTypes?.filter(type => CREATURES[type]) || [];
        if (available.length === 0) return;

        const type = available[Math.floor(Math.random() * available.length)];
        const count = CREATURES[type].packSize || 1;

        // Spawn position
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 50;
        const basePosition = new THREE.Vector3(
            Math.cos(angle) * distance,
            -(biome.depthRange[0] + Math.random() * 20),
            Math.sin(angle) * distance
        );

        // Spawn pack
        for (let i = 0; i < count && activeCreatures.length < maxCreatures; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 10
            );

            const creature = new Creature(type, basePosition.clone().add(offset));
            activeCreatures.push(creature);
        }
    }

    function update(deltaTime, player) {
        // Update all creatures
        for (let i = activeCreatures.length - 1; i >= 0; i--) {
            const creature = activeCreatures[i];
            creature.update(deltaTime, player);

            // Remove if too far
            if (creature.position.distanceTo(player.position) > 200) {
                creature.dispose();
            }
        }

        // Calculate danger level
        dangerLevel = activeCreatures.filter(c =>
            c.config.type === 'hostile' &&
            c.position.distanceTo(player.position) < 30
        ).length;
    }

    function getCreaturesInRange(position, range) {
        return activeCreatures.filter(c =>
            c.position.distanceTo(position) < range
        );
    }

    function killAll() {
        while (activeCreatures.length > 0) {
            activeCreatures[0].dispose();
        }
    }

    return {
        CREATURES,
        Creature,
        spawnForBiome,
        update,
        getCreaturesInRange,
        getActiveCreatures: () => activeCreatures,
        getDangerLevel: () => dangerLevel,
        killAll
    };
})();

window.CreatureEcosystem = CreatureEcosystem;
