/* ============================================
   Cursed Sands — Phase 1: Procedural Tombs & Catacombs
   Underground dungeon generation, traps, treasure, wall torches
   ============================================ */
var TombSystem = (function () {
    'use strict';

    var tombRooms = [];
    var traps = [];
    var wallTorches = [];
    var treasures = [];
    var catacombs = []; // tunnel segments connecting pyramids
    var nileCaves = [];
    var skeletons = []; // new enemy type
    var cursedPriests = []; // new enemy type

    var TOMB_Y = -4; // underground level
    var CAVE_Y = -3;
    var corridorMat, tombFloorMat, trapMat, treasureMat, torchMat, waterCaveMat;

    function createMaterials() {
        corridorMat = new THREE.MeshStandardMaterial({ color: 0x3d2e1a, roughness: 0.95 });
        tombFloorMat = new THREE.MeshStandardMaterial({ color: 0x2a1f12, roughness: 0.9 });
        trapMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.7, emissive: 0x330000, emissiveIntensity: 0.3 });
        treasureMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.8 });
        torchMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.0 });
        waterCaveMat = new THREE.MeshStandardMaterial({ color: 0x0a4a5a, roughness: 0.3, transparent: true, opacity: 0.7 });
    }

    // ============ PROCEDURAL ROOM GENERATOR ============
    function generateTombLayout(pyramidX, pyramidZ, size, scene) {
        var rooms = [];
        var entryZ = pyramidZ + size * 0.7;
        // Main corridor going inward
        var numRooms = 4 + Math.floor(Math.random() * 4);
        var cx = pyramidX, cz = entryZ;

        for (var r = 0; r < numRooms; r++) {
            var rw = 4 + Math.random() * 3;
            var rd = 4 + Math.random() * 3;
            var rh = 3.5;
            cz -= rd + 1;
            // Randomly branch left/right
            if (r > 1 && Math.random() > 0.5) cx += (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2);

            var room = { x: cx, z: cz, w: rw, d: rd, y: TOMB_Y, type: 'room' };

            // Floor
            var floor = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.3, rd), tombFloorMat);
            floor.position.set(cx, TOMB_Y, cz); floor.receiveShadow = true;
            scene.add(floor);
            // Ceiling
            var ceil = new THREE.Mesh(new THREE.BoxGeometry(rw + 0.4, 0.3, rd + 0.4), corridorMat);
            ceil.position.set(cx, TOMB_Y + rh, cz); scene.add(ceil);
            // Walls (4 sides with possible openings)
            buildRoomWalls(scene, cx, cz, rw, rd, rh, r === 0, r === numRooms - 1);

            // Add features to rooms
            if (r === numRooms - 1) {
                // Treasure chamber
                room.type = 'treasure';
                addTreasureChamber(scene, cx, cz, rw, rd);
            } else if (Math.random() > 0.5) {
                // Trap room
                room.type = 'trap';
                addTrap(scene, cx, cz, rw, rd);
            }

            // Wall torches in every room
            addWallTorches(scene, cx, cz, rw, rd);
            // Sarcophagi decoration
            if (Math.random() > 0.6) addSarcophagus(scene, cx, cz);

            rooms.push(room);
        }
        return rooms;
    }

    function buildRoomWalls(scene, cx, cz, rw, rd, rh, hasEntry, isEnd) {
        var wallH = rh, wallY = TOMB_Y + rh / 2;
        // Left wall
        var lw = new THREE.Mesh(new THREE.BoxGeometry(0.3, wallH, rd), corridorMat);
        lw.position.set(cx - rw / 2, wallY, cz); scene.add(lw);
        // Right wall
        var rwm = new THREE.Mesh(new THREE.BoxGeometry(0.3, wallH, rd), corridorMat);
        rwm.position.set(cx + rw / 2, wallY, cz); scene.add(rwm);
        // Back wall (with hieroglyphs)
        if (isEnd) {
            var bw = new THREE.Mesh(new THREE.BoxGeometry(rw, wallH, 0.3),
                new THREE.MeshStandardMaterial({ color: 0x4a3a25, roughness: 0.8 }));
            bw.position.set(cx, wallY, cz - rd / 2); scene.add(bw);
        }
        // Front wall with doorway (skip entry room front)
        if (!hasEntry) {
            var fw1 = new THREE.Mesh(new THREE.BoxGeometry((rw - 2) / 2, wallH, 0.3), corridorMat);
            fw1.position.set(cx - rw / 4 - 0.5, wallY, cz + rd / 2); scene.add(fw1);
            var fw2 = new THREE.Mesh(new THREE.BoxGeometry((rw - 2) / 2, wallH, 0.3), corridorMat);
            fw2.position.set(cx + rw / 4 + 0.5, wallY, cz + rd / 2); scene.add(fw2);
        }
    }

    function addTreasureChamber(scene, cx, cz, rw, rd) {
        // Gold pile
        var pile = new THREE.Mesh(new THREE.ConeGeometry(1, 0.8, 8), treasureMat);
        pile.position.set(cx, TOMB_Y + 0.55, cz); scene.add(pile);
        // Scattered gems
        var gemColors = [0xff0000, 0x00ff00, 0x0044ff, 0xff00ff, 0x00ffff];
        for (var g = 0; g < 6; g++) {
            var gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.15),
                new THREE.MeshStandardMaterial({ color: gemColors[g % 5], emissive: gemColors[g % 5], emissiveIntensity: 0.4 }));
            gem.position.set(cx + (Math.random() - 0.5) * rw * 0.6, TOMB_Y + 0.4, cz + (Math.random() - 0.5) * rd * 0.4);
            scene.add(gem);
        }
        // Gold glow
        var glow = new THREE.PointLight(0xffd700, 0.8, 8);
        glow.position.set(cx, TOMB_Y + 1.5, cz); scene.add(glow);
        treasures.push({ x: cx, z: cz, y: TOMB_Y, collected: false, gold: 30 + Math.floor(Math.random() * 40), mesh: pile });
    }

    function addTrap(scene, cx, cz, rw, rd) {
        var trapType = Math.floor(Math.random() * 4);
        var trap = { x: cx, z: cz, y: TOMB_Y, type: trapType, active: true, cooldown: 0 };

        if (trapType === 0) {
            // Spike pit — floor panel
            var panel = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 2), trapMat);
            panel.position.set(cx, TOMB_Y + 0.2, cz); scene.add(panel);
            trap.mesh = panel; trap.name = 'Spike Pit';
            // Spikes beneath (hidden)
            for (var sp = 0; sp < 9; sp++) {
                var spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 4),
                    new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8 }));
                spike.position.set(cx - 0.6 + (sp % 3) * 0.6, TOMB_Y - 0.2, cz - 0.6 + Math.floor(sp / 3) * 0.6);
                scene.add(spike);
            }
        } else if (trapType === 1) {
            // Dart wall — small holes in wall
            trap.name = 'Dart Wall';
            for (var d = 0; d < 3; d++) {
                var hole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6),
                    new THREE.MeshStandardMaterial({ color: 0x111111 }));
                hole.position.set(cx - rw / 2 + 0.15, TOMB_Y + 1 + d * 0.4, cz);
                hole.rotation.z = Math.PI / 2; scene.add(hole);
            }
        } else if (trapType === 2) {
            // Collapsing ceiling — cracked ceiling
            trap.name = 'Falling Stones';
            var crack = new THREE.Mesh(new THREE.BoxGeometry(rw * 0.8, 0.15, rd * 0.8),
                new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 1 }));
            crack.position.set(cx, TOMB_Y + 3.4, cz); scene.add(crack);
            trap.mesh = crack;
        } else {
            // Sand filling room
            trap.name = 'Sand Flood';
            trap.sandLevel = 0;
            var sandFill = new THREE.Mesh(new THREE.BoxGeometry(rw - 0.5, 0.1, rd - 0.5),
                new THREE.MeshStandardMaterial({ color: 0xd4a843, transparent: true, opacity: 0.8 }));
            sandFill.position.set(cx, TOMB_Y + 0.2, cz); scene.add(sandFill);
            trap.mesh = sandFill;
        }
        traps.push(trap);
    }

    function addWallTorches(scene, cx, cz, rw, rd) {
        var torchPositions = [
            [cx - rw / 2 + 0.2, TOMB_Y + 2, cz - rd / 4],
            [cx + rw / 2 - 0.2, TOMB_Y + 2, cz + rd / 4]
        ];
        torchPositions.forEach(function (tp) {
            // Bracket
            var bracket = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15),
                new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 }));
            bracket.position.set(tp[0], tp[1], tp[2]); scene.add(bracket);
            // Flame (starts unlit)
            var flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), torchMat.clone());
            flame.position.set(tp[0], tp[1] + 0.3, tp[2]); flame.visible = false;
            scene.add(flame);
            var tLight = new THREE.PointLight(0xff6600, 0, 6);
            tLight.position.set(tp[0], tp[1] + 0.4, tp[2]); scene.add(tLight);
            wallTorches.push({ x: tp[0], y: tp[1], z: tp[2], lit: false, flame: flame, light: tLight });
        });
    }

    function addSarcophagus(scene, cx, cz) {
        var sarcMat = new THREE.MeshStandardMaterial({ color: 0x6b5c3e, roughness: 0.8 });
        var sarc = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 2), sarcMat);
        sarc.position.set(cx + (Math.random() - 0.5) * 2, TOMB_Y + 0.45, cz + (Math.random() - 0.5));
        sarc.rotation.y = Math.random() * 0.5; scene.add(sarc);
    }

    // ============ CATACOMBS (connecting tunnels) ============
    function buildCatacombs(scene, pyramidData) {
        if (pyramidData.length < 2) return;
        for (var i = 0; i < pyramidData.length - 1; i++) {
            var p1 = pyramidData[i], p2 = pyramidData[i + 1];
            buildTunnel(scene, p1.x, p1.z, p2.x, p2.z);
        }
        // Connect last to first for loop
        if (pyramidData.length >= 3) {
            buildTunnel(scene, pyramidData[2].x, pyramidData[2].z, pyramidData[0].x, pyramidData[0].z);
        }
    }

    function buildTunnel(scene, x1, z1, x2, z2) {
        var dx = x2 - x1, dz = z2 - z1;
        var dist = Math.sqrt(dx * dx + dz * dz);
        var segments = Math.floor(dist / 3);
        var angle = Math.atan2(dz, dx);

        for (var s = 0; s < segments; s++) {
            var t = s / segments;
            var sx = x1 + dx * t, sz = z1 + dz * t;
            // Floor
            var tf = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 3), tombFloorMat);
            tf.position.set(sx, TOMB_Y, sz); tf.rotation.y = angle; scene.add(tf);
            // Walls
            var tw1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 3), corridorMat);
            tw1.position.set(sx + Math.sin(angle) * 1.5, TOMB_Y + 1.5, sz - Math.cos(angle) * 1.5);
            tw1.rotation.y = angle; scene.add(tw1);
            var tw2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 3), corridorMat);
            tw2.position.set(sx - Math.sin(angle) * 1.5, TOMB_Y + 1.5, sz + Math.cos(angle) * 1.5);
            tw2.rotation.y = angle; scene.add(tw2);
            // Ceiling
            var tc = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.3, 3), corridorMat);
            tc.position.set(sx, TOMB_Y + 3, sz); tc.rotation.y = angle; scene.add(tc);

            catacombs.push({ x: sx, z: sz, y: TOMB_Y });

            // Occasional skeleton enemy
            if (Math.random() > 0.8) spawnSkeleton(scene, sx + (Math.random() - 0.5) * 2, sz + (Math.random() - 0.5) * 2);
            // Occasional wall torch
            if (s % 3 === 0) {
                var fl = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 6), torchMat.clone());
                fl.position.set(sx + Math.sin(angle) * 1.3, TOMB_Y + 2.2, sz - Math.cos(angle) * 1.3);
                fl.visible = false; scene.add(fl);
                var tl = new THREE.PointLight(0xff6600, 0, 5);
                tl.position.set(fl.position.x, fl.position.y + 0.2, fl.position.z); scene.add(tl);
                wallTorches.push({ x: fl.position.x, y: fl.position.y, z: fl.position.z, lit: false, flame: fl, light: tl });
            }
        }
    }

    // ============ NILE UNDERWATER CAVES ============
    function buildNileCaves(scene) {
        var caveEntryX = -40, caveEntryZ = -20;
        // Entry underwater
        var entry = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 1),
            new THREE.MeshStandardMaterial({ color: 0x0a2a3a }));
        entry.position.set(caveEntryX, -0.5, caveEntryZ); scene.add(entry);

        var numCaveRooms = 5;
        var cz = caveEntryZ;
        for (var cr = 0; cr < numCaveRooms; cr++) {
            cz -= 6;
            var crw = 5 + Math.random() * 3, crd = 5 + Math.random() * 2;
            // Cave floor (rocky)
            var cFloor = new THREE.Mesh(new THREE.BoxGeometry(crw, 0.3, crd),
                new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 1 }));
            cFloor.position.set(caveEntryX, CAVE_Y, cz); scene.add(cFloor);
            // Water surface
            var cWater = new THREE.Mesh(new THREE.PlaneGeometry(crw * 0.6, crd * 0.6), waterCaveMat);
            cWater.rotation.x = -Math.PI / 2;
            cWater.position.set(caveEntryX + crw * 0.15, CAVE_Y + 0.2, cz); scene.add(cWater);
            // Stalactites
            for (var st = 0; st < 4; st++) {
                var stl = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.8 + Math.random(), 5),
                    new THREE.MeshStandardMaterial({ color: 0x556655, roughness: 0.9 }));
                stl.position.set(caveEntryX + (Math.random() - 0.5) * crw * 0.7, CAVE_Y + 3.2, cz + (Math.random() - 0.5) * crd * 0.5);
                stl.rotation.x = Math.PI; scene.add(stl);
            }
            // Bioluminescent glow
            var bLight = new THREE.PointLight(0x00ffaa, 0.3, 8);
            bLight.position.set(caveEntryX, CAVE_Y + 1.5, cz); scene.add(bLight);
            // Walls
            var cwl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.5, crd),
                new THREE.MeshStandardMaterial({ color: 0x2a3528, roughness: 1 }));
            cwl.position.set(caveEntryX - crw / 2, CAVE_Y + 1.5, cz); scene.add(cwl);
            var cwr = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.5, crd),
                new THREE.MeshStandardMaterial({ color: 0x2a3528, roughness: 1 }));
            cwr.position.set(caveEntryX + crw / 2, CAVE_Y + 1.5, cz); scene.add(cwr);
            // Ceiling
            var cceil = new THREE.Mesh(new THREE.BoxGeometry(crw + 0.5, 0.3, crd + 0.5),
                new THREE.MeshStandardMaterial({ color: 0x1a2a1a, roughness: 1 }));
            cceil.position.set(caveEntryX, CAVE_Y + 3.5, cz); scene.add(cceil);

            nileCaves.push({ x: caveEntryX, z: cz, y: CAVE_Y, w: crw, d: crd });

            // Crocodile enemy in some caves
            if (Math.random() > 0.5) spawnCrocodile(scene, caveEntryX + (Math.random() - 0.5) * 3, cz);
        }
        // Treasure at end
        var endTreasure = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), treasureMat);
        endTreasure.position.set(caveEntryX, CAVE_Y + 0.6, cz); scene.add(endTreasure);
        var etLight = new THREE.PointLight(0xffd700, 0.5, 6);
        etLight.position.set(caveEntryX, CAVE_Y + 1, cz); scene.add(etLight);
        treasures.push({ x: caveEntryX, z: cz, y: CAVE_Y, collected: false, gold: 50, mesh: endTreasure });
    }

    // ============ NEW ENEMY TYPES ============
    function spawnSkeleton(scene, x, z) {
        var group = new THREE.Group();
        var boneMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.8 });
        // Ribcage/body
        group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 1.3, 6), boneMat));
        // Skull
        var skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), boneMat);
        skull.position.y = 0.9; group.add(skull);
        // Eye sockets
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.5 });
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat).translateX(-0.08).translateY(0.92).translateZ(0.18));
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat).translateX(0.08).translateY(0.92).translateZ(0.18));
        // Sword
        var swordMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });
        var sword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.02), swordMat);
        sword.position.set(0.35, 0.3, 0); group.add(sword);
        group.position.set(x, TOMB_Y + 0.95, z);
        scene.add(group);
        skeletons.push({ mesh: group, x: x, z: z, y: TOMB_Y, speed: 1.8, state: 'patrol', patrolAngle: Math.random() * Math.PI * 2, alertTimer: 0 });
    }

    function spawnCrocodile(scene, x, z) {
        var group = new THREE.Group();
        var crocMat = new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: 0.8 });
        // Body
        group.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 2), crocMat));
        // Head/jaw
        var jaw = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.8), crocMat);
        jaw.position.set(0, 0.05, 1.2); group.add(jaw);
        // Eyes
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xaaaa00, emissiveIntensity: 0.8 });
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat).translateX(-0.15).translateY(0.2).translateZ(1));
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat).translateX(0.15).translateY(0.2).translateZ(1));
        // Tail
        var tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.2, 4), crocMat);
        tail.position.set(0, 0, -1.2); tail.rotation.x = Math.PI / 2; group.add(tail);
        group.position.set(x, CAVE_Y + 0.3, z);
        scene.add(group);
        skeletons.push({ mesh: group, x: x, z: z, y: CAVE_Y, speed: 2.2, state: 'patrol', patrolAngle: Math.random() * Math.PI * 2, alertTimer: 0 });
    }

    // ============ UPDATE ============
    function update(dt, playerX, playerZ, playerY) {
        // Traps
        for (var ti = 0; ti < traps.length; ti++) {
            var trap = traps[ti];
            if (!trap.active) continue;
            var tdx = playerX - trap.x, tdz = playerZ - trap.z;
            var tdy = Math.abs(playerY - (trap.y + 1));
            var tdist = Math.sqrt(tdx * tdx + tdz * tdz);
            if (tdist < 2.5 && tdy < 3) {
                trap.cooldown -= dt;
                if (trap.cooldown <= 0) {
                    trap.cooldown = 3;
                    return { type: 'trap', name: trap.name, trapType: trap.type, damage: trap.type === 3 ? 5 : 20 };
                }
            }
        }
        // Skeletons / crocodiles
        for (var si = 0; si < skeletons.length; si++) {
            var s = skeletons[si];
            var sdx = playerX - s.x, sdz = playerZ - s.z;
            var sdy = Math.abs(playerY - (s.y + 1));
            var sdist = Math.sqrt(sdx * sdx + sdz * sdz);
            if (sdist < 8 && sdy < 4 && s.state !== 'chase') { s.state = 'chase'; s.alertTimer = 6; }
            if (s.state === 'chase') {
                s.alertTimer -= dt;
                if (sdist > 0.5) { s.x += (sdx / sdist) * s.speed * dt; s.z += (sdz / sdist) * s.speed * dt; }
                if (s.alertTimer <= 0) s.state = 'patrol';
                if (sdist < 1.5 && sdy < 3) return { type: 'enemy', damage: 25 };
            } else {
                s.patrolAngle += dt * 0.3;
                s.x += Math.cos(s.patrolAngle) * s.speed * 0.15 * dt;
                s.z += Math.sin(s.patrolAngle) * s.speed * 0.15 * dt;
            }
            s.mesh.position.set(s.x, s.y + 0.95, s.z);
            if (sdist < 20) s.mesh.lookAt(playerX, s.y + 0.95, playerZ);
        }
        // Wall torches — check if player is near to light them
        for (var wt = 0; wt < wallTorches.length; wt++) {
            var t = wallTorches[wt];
            if (t.lit) { t.light.intensity = 0.6 + Math.sin(dt * 100 + wt) * 0.1; continue; }
            var wtdx = playerX - t.x, wtdz = playerZ - t.z;
            var wtdy = Math.abs(playerY - t.y);
            if (Math.sqrt(wtdx * wtdx + wtdz * wtdz) < 2 && wtdy < 3) {
                return { type: 'torch_nearby', index: wt };
            }
        }
        // Treasure collection
        for (var tr = 0; tr < treasures.length; tr++) {
            var tres = treasures[tr];
            if (tres.collected) continue;
            var trdx = playerX - tres.x, trdz = playerZ - tres.z;
            var trdy = Math.abs(playerY - (tres.y + 1));
            if (Math.sqrt(trdx * trdx + trdz * trdz) < 2 && trdy < 3) {
                return { type: 'treasure_nearby', index: tr };
            }
        }
        return null;
    }

    function lightTorch(idx) {
        if (idx >= 0 && idx < wallTorches.length) {
            wallTorches[idx].lit = true;
            wallTorches[idx].flame.visible = true;
            wallTorches[idx].light.intensity = 0.6;
        }
    }

    function collectTreasure(idx) {
        if (idx >= 0 && idx < treasures.length && !treasures[idx].collected) {
            treasures[idx].collected = true;
            if (treasures[idx].mesh) treasures[idx].mesh.visible = false;
            return treasures[idx].gold;
        }
        return 0;
    }

    function isUnderground(py) { return py < -1; }

    function build(scene, pyramidData) {
        createMaterials();
        tombRooms = [];
        traps = []; wallTorches = []; treasures = []; catacombs = []; nileCaves = []; skeletons = [];
        // Generate tomb interiors for each pyramid
        pyramidData.forEach(function (p) {
            var rooms = generateTombLayout(p.x, p.z, p.s, scene);
            tombRooms = tombRooms.concat(rooms);
        });
        // Build connecting catacombs
        buildCatacombs(scene, pyramidData);
        // Build Nile underwater caves
        buildNileCaves(scene);
    }

    function reset() {
        tombRooms = []; traps = []; wallTorches = []; treasures = [];
        catacombs = []; nileCaves = []; skeletons = []; cursedPriests = [];
    }

    return { build: build, update: update, lightTorch: lightTorch, collectTreasure: collectTreasure, isUnderground: isUnderground, reset: reset };
})();
