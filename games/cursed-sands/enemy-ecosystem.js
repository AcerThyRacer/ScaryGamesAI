/* ============================================
   Cursed Sands — Phase 9: Advanced Enemy Ecosystem
   Wildlife, undead variants, mini-bosses,
   taming, nemesis system
   ============================================ */
var EnemyEcosystem = (function () {
    'use strict';

    var _scene = null;
    var creatures = [];
    var nemesisPool = [];
    var tamedCompanion = null;

    // ============ CREATURE TYPES ============
    var CREATURE_TYPES = {
        // WILDLIFE
        desert_jackal: {
            name: 'Desert Jackal', category: 'wildlife', hp: 20, speed: 6, dmg: 5,
            color: 0xaa8855, size: 0.4, xpReward: 15, aggro: 'territorial',
            drops: ['hide', 'fang'], packSize: 3, tameable: true
        },
        sand_viper: {
            name: 'Sand Viper', category: 'wildlife', hp: 10, speed: 4, dmg: 12,
            color: 0x667744, size: 0.2, xpReward: 20, aggro: 'passive',
            drops: ['venom', 'scales'], packSize: 1, tameable: false,
            poison: { dmg: 3, duration: 5 }
        },
        giant_scorpion: {
            name: 'Giant Scorpion', category: 'wildlife', hp: 45, speed: 3, dmg: 15,
            color: 0x553311, size: 0.7, xpReward: 35, aggro: 'aggressive',
            drops: ['chitin', 'stinger'], packSize: 1, tameable: true,
            poison: { dmg: 5, duration: 8 }
        },
        vulture: {
            name: 'Vulture', category: 'wildlife', hp: 15, speed: 8, dmg: 8,
            color: 0x333333, size: 0.5, xpReward: 10, aggro: 'scavenger',
            drops: ['feather'], packSize: 4, tameable: false, flying: true
        },
        nile_crocodile: {
            name: 'Nile Crocodile', category: 'wildlife', hp: 60, speed: 5, dmg: 20,
            color: 0x334422, size: 0.8, xpReward: 40, aggro: 'territorial',
            drops: ['croc_hide', 'fang'], packSize: 1, tameable: false,
            aquatic: true
        },
        // UNDEAD VARIANTS
        mummy_archer: {
            name: 'Mummy Archer', category: 'undead', hp: 25, speed: 2, dmg: 10,
            color: 0x887755, size: 0.5, xpReward: 25, aggro: 'aggressive',
            drops: ['linen', 'arrows'], packSize: 2, ranged: true, range: 15
        },
        cursed_priest: {
            name: 'Cursed Priest', category: 'undead', hp: 35, speed: 2.5, dmg: 8,
            color: 0x662255, size: 0.5, xpReward: 30, aggro: 'aggressive',
            drops: ['papyrus', 'ankh_shard'], packSize: 1,
            sanityDrain: 5, aura: { radius: 8, color: 0x440044 }
        },
        sand_wraith: {
            name: 'Sand Wraith', category: 'undead', hp: 40, speed: 7, dmg: 12,
            color: 0xaaaa88, size: 0.6, xpReward: 40, aggro: 'stalker',
            drops: ['ectoplasm', 'wraith_cloth'], packSize: 1,
            phaseShift: true, invisTimer: 0
        },
        skeleton_warrior: {
            name: 'Skeleton Warrior', category: 'undead', hp: 30, speed: 3.5, dmg: 14,
            color: 0xccccaa, size: 0.5, xpReward: 25, aggro: 'aggressive',
            drops: ['bone', 'rusty_sword'], packSize: 3
        },
        // ELITE MINI-BOSSES
        tomb_guardian: {
            name: 'Tomb Guardian', category: 'elite', hp: 200, speed: 2, dmg: 25,
            color: 0xffd700, size: 1.2, xpReward: 150, aggro: 'territorial',
            drops: ['gold_dust', 'guardian_gem'], packSize: 1,
            shield: true, shieldHP: 50
        },
        desert_djinn: {
            name: 'Desert Djinn', category: 'elite', hp: 150, speed: 6, dmg: 18,
            color: 0x4488ff, size: 1.0, xpReward: 120, aggro: 'territorial',
            drops: ['djinn_essence', 'sapphire'], packSize: 1,
            teleport: true, teleportCooldown: 5
        },
        sandstorm_elemental: {
            name: 'Sandstorm Elemental', category: 'elite', hp: 180, speed: 4, dmg: 15,
            color: 0xccaa55, size: 1.5, xpReward: 130, aggro: 'aggressive',
            drops: ['storm_core', 'desert_glass'], packSize: 1,
            aoe: { radius: 5, dmg: 8, interval: 3 }
        }
    };

    // ============ BUILD ============
    function build(scene) {
        _scene = scene;
        creatures = [];
        nemesisPool = [];
        tamedCompanion = null;

        spawnWildlife(scene);
        spawnUndead(scene);
        spawnElites(scene);
    }

    function spawnWildlife(scene) {
        // Jackals — packs near ruins
        spawnPack(scene, 'desert_jackal', 60, 40, 3);
        spawnPack(scene, 'desert_jackal', -70, 60, 3);
        spawnPack(scene, 'desert_jackal', 90, -80, 3);
        // Vipers — near oases
        spawnCreature(scene, 'sand_viper', -48, 58);
        spawnCreature(scene, 'sand_viper', 62, 47);
        spawnCreature(scene, 'sand_viper', -28, -43);
        // Giant scorpions
        spawnCreature(scene, 'giant_scorpion', 40, 70);
        spawnCreature(scene, 'giant_scorpion', -80, -60);
        // Vultures
        spawnPack(scene, 'vulture', 50, 50, 4);
        spawnPack(scene, 'vulture', -50, -50, 4);
        // Crocodiles — near Nile
        spawnCreature(scene, 'nile_crocodile', 30, 20);
        spawnCreature(scene, 'nile_crocodile', 30, -30);
    }

    function spawnUndead(scene) {
        // Mummy archers — near pyramids
        spawnPack(scene, 'mummy_archer', 35, -35, 2);
        spawnPack(scene, 'mummy_archer', -45, 30, 2);
        // Cursed priests — in biomes
        spawnCreature(scene, 'cursed_priest', -100, -80);
        spawnCreature(scene, 'cursed_priest', 0, -250);
        // Sand wraiths — nocturnal spawning handled in update
        spawnCreature(scene, 'sand_wraith', 80, -80);
        spawnCreature(scene, 'sand_wraith', -90, 90);
        // Skeleton warriors
        spawnPack(scene, 'skeleton_warrior', -60, -100, 3);
        spawnPack(scene, 'skeleton_warrior', 120, 50, 3);
    }

    function spawnElites(scene) {
        spawnCreature(scene, 'tomb_guardian', 40, -50);
        spawnCreature(scene, 'desert_djinn', 200, 250);
        spawnCreature(scene, 'sandstorm_elemental', -300, -300);
    }

    function spawnCreature(scene, typeKey, x, z) {
        var type = CREATURE_TYPES[typeKey];
        if (!type) return;
        var mesh = createCreatureMesh(type, typeKey);
        mesh.position.set(x, type.flying ? 3 + Math.random() * 2 : (type.size / 2), z);
        scene.add(mesh);
        creatures.push({
            type: typeKey, typeDef: type,
            mesh: mesh, x: x, z: z, y: mesh.position.y,
            hp: type.hp, maxHP: type.hp,
            state: 'idle', // idle, patrol, chase, attack, flee, dead, tamed
            target: null,
            attackTimer: 0, patrolTimer: 0,
            patrolAngle: Math.random() * Math.PI * 2,
            spawnX: x, spawnZ: z,
            shieldHP: type.shield ? type.shieldHP : 0,
            teleportTimer: type.teleport ? type.teleportCooldown : 0,
            invisTimer: 0, visible: true,
            aoeTimer: type.aoe ? type.aoe.interval : 0,
            poisoned: false, poisonTimer: 0,
            nemesis: false, killCount: 0
        });
    }

    function spawnPack(scene, typeKey, cx, cz, count) {
        for (var i = 0; i < count; i++) {
            var ox = (Math.random() - 0.5) * 8;
            var oz = (Math.random() - 0.5) * 8;
            spawnCreature(scene, typeKey, cx + ox, cz + oz);
        }
    }

    function createCreatureMesh(type, typeKey) {
        var mat = new THREE.MeshStandardMaterial({
            color: type.color, roughness: 0.7,
            emissive: type.category === 'elite' ? type.color : 0x000000,
            emissiveIntensity: type.category === 'elite' ? 0.3 : 0
        });
        var mesh;
        if (type.flying) {
            // Bird-like shape
            mesh = new THREE.Group();
            var body = new THREE.Mesh(new THREE.SphereGeometry(type.size * 0.5, 6, 6), mat);
            mesh.add(body);
            var wing1 = new THREE.Mesh(new THREE.PlaneGeometry(type.size * 1.5, type.size * 0.5), mat);
            wing1.position.x = type.size * 0.5;
            wing1.rotation.z = -0.3;
            mesh.add(wing1);
            var wing2 = wing1.clone();
            wing2.position.x = -type.size * 0.5;
            wing2.rotation.z = 0.3;
            mesh.add(wing2);
        } else if (type.aquatic) {
            mesh = new THREE.Mesh(new THREE.BoxGeometry(type.size * 2, type.size * 0.4, type.size * 0.8), mat);
        } else if (typeKey === 'sand_viper') {
            mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, type.size * 3, 6), mat);
            mesh.rotation.z = Math.PI / 2;
        } else if (type.category === 'elite') {
            mesh = new THREE.Group();
            var torso = new THREE.Mesh(new THREE.BoxGeometry(type.size, type.size * 1.5, type.size * 0.6), mat);
            mesh.add(torso);
            var head = new THREE.Mesh(new THREE.SphereGeometry(type.size * 0.35, 6, 6), mat);
            head.position.y = type.size;
            mesh.add(head);
            if (type.shield) {
                var shieldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.5 });
                var shield = new THREE.Mesh(new THREE.SphereGeometry(type.size * 1.2, 8, 8), shieldMat);
                mesh.add(shield);
                mesh.userData.shieldMesh = shield;
            }
        } else {
            // Humanoid shape
            mesh = new THREE.Group();
            var body = new THREE.Mesh(new THREE.BoxGeometry(type.size * 0.5, type.size * 1.2, type.size * 0.3), mat);
            mesh.add(body);
            var head = new THREE.Mesh(new THREE.SphereGeometry(type.size * 0.2, 5, 5), mat);
            head.position.y = type.size * 0.8;
            mesh.add(head);
        }
        return mesh;
    }

    // ============ UPDATE ============
    function update(dt, px, pz, py, isNight) {
        var results = { damage: 0, sanityDrain: 0, poisonDmg: 0, kills: [], alerts: [] };

        for (var i = creatures.length - 1; i >= 0; i--) {
            var c = creatures[i];
            if (c.state === 'dead') continue;
            if (c.state === 'tamed') { updateTamed(dt, c, px, pz); continue; }

            var dx = px - c.x, dz = pz - c.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            // Phase shift (sand wraith)
            if (c.typeDef.phaseShift) {
                c.invisTimer -= dt;
                if (c.invisTimer <= 0) {
                    c.visible = !c.visible;
                    c.invisTimer = c.visible ? 3 + Math.random() * 2 : 2 + Math.random() * 3;
                    if (c.mesh) c.mesh.visible = c.visible;
                }
            }

            // Teleport (djinn)
            if (c.typeDef.teleport && c.state === 'chase') {
                c.teleportTimer -= dt;
                if (c.teleportTimer <= 0 && dist > 5) {
                    c.teleportTimer = c.typeDef.teleportCooldown;
                    var angle = Math.atan2(dz, dx);
                    c.x = px - Math.cos(angle) * 4;
                    c.z = pz - Math.sin(angle) * 4;
                }
            }

            // AoE damage (sandstorm elemental)
            if (c.typeDef.aoe && c.state === 'chase') {
                c.aoeTimer -= dt;
                if (c.aoeTimer <= 0) {
                    c.aoeTimer = c.typeDef.aoe.interval;
                    if (dist < c.typeDef.aoe.radius) {
                        results.damage += c.typeDef.aoe.dmg;
                    }
                }
            }

            // Sanity aura (cursed priest)
            if (c.typeDef.sanityDrain && dist < (c.typeDef.aura ? c.typeDef.aura.radius : 8)) {
                results.sanityDrain += c.typeDef.sanityDrain * dt;
            }

            // AI state machine
            updateCreatureAI(dt, c, dist, dx, dz, px, pz, isNight, results);

            // Update position
            if (c.mesh) {
                c.mesh.position.set(c.x, c.y, c.z);
                if (c.state === 'chase' || c.state === 'attack') {
                    c.mesh.lookAt(new THREE.Vector3(px, c.y, pz));
                }
            }
        }

        // Update tamed companion
        if (tamedCompanion && tamedCompanion.state === 'tamed') {
            updateTamed(dt, tamedCompanion, px, pz);
        }

        return results;
    }

    function updateCreatureAI(dt, c, dist, dx, dz, px, pz, isNight, results) {
        var aggroRange = c.typeDef.category === 'elite' ? 20 : (c.typeDef.aggro === 'aggressive' ? 15 : 10);
        var leashRange = 40;

        switch (c.state) {
            case 'idle':
                c.patrolTimer -= dt;
                if (c.patrolTimer <= 0) {
                    c.state = 'patrol';
                    c.patrolTimer = 3 + Math.random() * 5;
                    c.patrolAngle = Math.random() * Math.PI * 2;
                }
                // Aggro check
                if (dist < aggroRange) {
                    if (c.typeDef.aggro === 'aggressive' || c.typeDef.aggro === 'stalker') {
                        c.state = 'chase';
                    } else if (c.typeDef.aggro === 'territorial' && dist < aggroRange * 0.6) {
                        c.state = 'chase';
                    }
                    // Nocturnal creatures more aggressive at night
                    if (isNight && c.typeDef.category === 'undead' && dist < aggroRange * 1.3) {
                        c.state = 'chase';
                    }
                }
                break;

            case 'patrol':
                c.x += Math.cos(c.patrolAngle) * c.typeDef.speed * 0.3 * dt;
                c.z += Math.sin(c.patrolAngle) * c.typeDef.speed * 0.3 * dt;
                c.patrolTimer -= dt;
                if (c.patrolTimer <= 0) c.state = 'idle';
                // Leash
                var ldx = c.x - c.spawnX, ldz = c.z - c.spawnZ;
                if (Math.sqrt(ldx * ldx + ldz * ldz) > leashRange) {
                    c.patrolAngle = Math.atan2(-ldz, -ldx);
                }
                // Aggro
                if (dist < aggroRange && c.typeDef.aggro !== 'passive' && c.typeDef.aggro !== 'scavenger') {
                    c.state = 'chase';
                }
                break;

            case 'chase':
                if (dist > 1.5) {
                    var len = dist;
                    c.x += (dx / len) * c.typeDef.speed * dt;
                    c.z += (dz / len) * c.typeDef.speed * dt;
                }
                if (dist < (c.typeDef.ranged ? c.typeDef.range : 2)) {
                    c.state = 'attack';
                    c.attackTimer = 0;
                }
                // Leash
                var ldx2 = c.x - c.spawnX, ldz2 = c.z - c.spawnZ;
                if (Math.sqrt(ldx2 * ldx2 + ldz2 * ldz2) > leashRange * 1.5) {
                    c.state = 'idle';
                    c.x = c.spawnX; c.z = c.spawnZ;
                }
                // Flee if low HP
                if (c.hp < c.maxHP * 0.2 && c.typeDef.category === 'wildlife') {
                    c.state = 'flee';
                }
                break;

            case 'attack':
                c.attackTimer -= dt;
                if (c.attackTimer <= 0) {
                    c.attackTimer = 1.5;
                    if (dist < (c.typeDef.ranged ? c.typeDef.range : 2.5)) {
                        results.damage += c.typeDef.dmg;
                        // Poison
                        if (c.typeDef.poison) {
                            results.poisonDmg += c.typeDef.poison.dmg;
                        }
                    }
                }
                if (dist > (c.typeDef.ranged ? c.typeDef.range + 3 : 4)) c.state = 'chase';
                break;

            case 'flee':
                c.x -= (dx / dist) * c.typeDef.speed * 1.3 * dt;
                c.z -= (dz / dist) * c.typeDef.speed * 1.3 * dt;
                if (dist > 25) c.state = 'idle';
                break;
        }
    }

    function updateTamed(dt, c, px, pz) {
        var dx = px - c.x, dz = pz - c.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        // Follow player at distance
        if (dist > 5) {
            c.x += (dx / dist) * c.typeDef.speed * 0.8 * dt;
            c.z += (dz / dist) * c.typeDef.speed * 0.8 * dt;
        }
        if (c.mesh) c.mesh.position.set(c.x, c.y, c.z);
        // Attack nearby enemies
        for (var i = 0; i < creatures.length; i++) {
            var enemy = creatures[i];
            if (enemy === c || enemy.state === 'dead' || enemy.state === 'tamed') continue;
            var edx = c.x - enemy.x, edz = c.z - enemy.z;
            var eDist = Math.sqrt(edx * edx + edz * edz);
            if (eDist < 3) {
                enemy.hp -= c.typeDef.dmg * 0.5 * dt;
                if (enemy.hp <= 0) killCreature(enemy);
            }
        }
    }

    // ============ DAMAGE / KILL ============
    function damageCreature(index, dmg) {
        if (index < 0 || index >= creatures.length) return null;
        var c = creatures[index];
        if (c.state === 'dead' || c.state === 'tamed') return null;

        // Shield absorbs damage
        if (c.shieldHP > 0) {
            c.shieldHP -= dmg;
            if (c.shieldHP <= 0) {
                if (c.mesh && c.mesh.userData.shieldMesh) {
                    c.mesh.userData.shieldMesh.visible = false;
                }
                c.shieldHP = 0;
            }
            return { killed: false, hp: c.hp, shielded: true };
        }

        c.hp -= dmg;
        if (c.hp <= 0) {
            return killCreature(c);
        }
        if (c.state === 'idle' || c.state === 'patrol') c.state = 'chase';
        return { killed: false, hp: c.hp };
    }

    function killCreature(c) {
        c.state = 'dead';
        c.hp = 0;
        if (c.mesh) {
            c.mesh.visible = false;
        }
        // Drops
        var drops = [];
        if (c.typeDef.drops) {
            c.typeDef.drops.forEach(function (d) {
                if (Math.random() < 0.6) drops.push(d);
            });
        }
        // Nemesis check: if creature has killed player before, it evolves
        if (c.nemesis) {
            drops.push('nemesis_trophy');
        }
        return { killed: true, type: c.type, xp: c.typeDef.xpReward, drops: drops, elite: c.typeDef.category === 'elite' };
    }

    // Hit all creatures in range (for melee)
    function damageInRange(px, pz, range, dmg) {
        var results = [];
        for (var i = 0; i < creatures.length; i++) {
            var c = creatures[i];
            if (c.state === 'dead' || c.state === 'tamed') continue;
            var dx = px - c.x, dz = pz - c.z;
            if (Math.sqrt(dx * dx + dz * dz) < range) {
                var r = damageCreature(i, dmg);
                if (r) results.push(r);
            }
        }
        return results;
    }

    // ============ TAMING ============
    function attemptTame(px, pz) {
        if (tamedCompanion) return { success: false, reason: 'Already have companion' };
        for (var i = 0; i < creatures.length; i++) {
            var c = creatures[i];
            if (c.state === 'dead' || c.state === 'tamed') continue;
            if (!c.typeDef.tameable) continue;
            var dx = px - c.x, dz = pz - c.z;
            if (Math.sqrt(dx * dx + dz * dz) > 3) continue;
            if (c.hp > c.maxHP * 0.3) continue; // must be weakened
            // Tame success
            c.state = 'tamed';
            tamedCompanion = c;
            if (c.mesh) {
                c.mesh.material = new THREE.MeshStandardMaterial({
                    color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.3
                });
            }
            return { success: true, name: c.typeDef.name };
        }
        return { success: false, reason: 'No tameable creature nearby' };
    }

    // ============ NEMESIS SYSTEM ============
    function promoteToNemesis(killerType) {
        // Find a living creature of this type, promote to nemesis
        for (var i = 0; i < creatures.length; i++) {
            var c = creatures[i];
            if (c.type === killerType && c.state !== 'dead' && !c.nemesis) {
                c.nemesis = true;
                c.maxHP = Math.round(c.maxHP * 1.5);
                c.hp = c.maxHP;
                c.typeDef = Object.assign({}, c.typeDef);
                c.typeDef.dmg = Math.round(c.typeDef.dmg * 1.3);
                c.typeDef.speed *= 1.2;
                c.typeDef.xpReward *= 3;
                c.killCount++;
                // Visual indicator
                if (c.mesh) {
                    var glow = new THREE.PointLight(0xff0000, 0.5, 5);
                    glow.position.set(0, 1, 0);
                    c.mesh.add(glow);
                }
                nemesisPool.push(c);
                return c.typeDef.name + ' (Nemesis)';
            }
        }
        return null;
    }

    // ============ GETTERS ============
    function getCreatures() { return creatures; }
    function getCompanion() { return tamedCompanion; }
    function getNemeses() { return nemesisPool; }
    function getCreatureAt(px, pz, range) {
        for (var i = 0; i < creatures.length; i++) {
            var c = creatures[i];
            if (c.state === 'dead') continue;
            var dx = px - c.x, dz = pz - c.z;
            if (Math.sqrt(dx * dx + dz * dz) < (range || 3)) return { index: i, creature: c };
        }
        return null;
    }

    // ============ RESET ============
    function reset() {
        creatures.forEach(function (c) { if (c.mesh && _scene) _scene.remove(c.mesh); });
        creatures = [];
        nemesisPool = [];
        tamedCompanion = null;
    }

    return {
        build: build, update: update, reset: reset,
        damageCreature: damageCreature, damageInRange: damageInRange,
        killCreature: killCreature,
        attemptTame: attemptTame,
        promoteToNemesis: promoteToNemesis,
        getCreatures: getCreatures, getCompanion: getCompanion,
        getNemeses: getNemeses, getCreatureAt: getCreatureAt
    };
})();
