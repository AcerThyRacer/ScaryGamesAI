/* ============================================
   Cursed Sands — Phase 5: Map Expansion — Biomes
   Valley of the Kings, Alexandria Harbor, River of the Dead
   ============================================ */
var BiomeSystem = (function () {
    'use strict';

    var _scene = null;
    var biomeStructures = [];
    var biomeEnemies = [];
    var biomeLights = [];
    var biomePickups = [];

    // ============ BUILD ============
    function build(scene) {
        _scene = scene;
        biomeStructures = [];
        biomeEnemies = [];
        biomeLights = [];
        biomePickups = [];

        buildValleyOfKings(scene);
        buildAlexandriaHarbor(scene);
        buildRiverOfDead(scene);
    }

    // ============ VALLEY OF THE KINGS (west: x -60 to -100) ============
    function buildValleyOfKings(scene) {
        // Canyon walls
        var canyonMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.9 });
        // North wall
        var nWall = new THREE.Mesh(new THREE.BoxGeometry(50, 15, 3), canyonMat);
        nWall.position.set(-80, 7, -80); scene.add(nWall);
        biomeStructures.push({ x: -80, z: -80, rx: 25, rz: 1.5 });
        // South wall
        var sWall = new THREE.Mesh(new THREE.BoxGeometry(50, 15, 3), canyonMat);
        sWall.position.set(-80, 7, 80); scene.add(sWall);
        biomeStructures.push({ x: -80, z: 80, rx: 25, rz: 1.5 });

        // Rock-cut tombs (carved into canyon walls)
        var tombMat = new THREE.MeshStandardMaterial({ color: 0x6b5a2a, roughness: 0.8 });
        var tombEntrance = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 1 });
        for (var ti = 0; ti < 6; ti++) {
            var tx = -65 - ti * 6;
            var tz = ti % 2 === 0 ? -75 : 75;
            // Facade
            var facade = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 1.5), tombMat);
            facade.position.set(tx, 3, tz); scene.add(facade);
            biomeStructures.push({ x: tx, z: tz, rx: 2.5, rz: 0.75 });
            // Dark entrance
            var entry = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.5), tombEntrance);
            entry.position.set(tx, 1.5, tz + (tz < 0 ? 0.8 : -0.8)); scene.add(entry);
            // Columns flanking entrance
            var colMat = new THREE.MeshStandardMaterial({ color: 0x8b7340, roughness: 0.7 });
            for (var side = -1; side <= 1; side += 2) {
                var col = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 4, 6), colMat);
                col.position.set(tx + side * 1.5, 2, tz + (tz < 0 ? 0.6 : -0.6));
                scene.add(col);
            }
            // Torch at entrance
            var tLight = new THREE.PointLight(0xff6600, 0.3, 5);
            tLight.position.set(tx, 3.5, tz + (tz < 0 ? 1 : -1));
            scene.add(tLight); biomeLights.push(tLight);
        }

        // Central obelisk
        var obeliskMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.3 });
        var obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 8, 4), obeliskMat);
        obelisk.position.set(-80, 4, 0); scene.add(obelisk);
        var obeliskTop = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 4),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 }));
        obeliskTop.position.set(-80, 8.5, 0); scene.add(obeliskTop);
        biomeStructures.push({ x: -80, z: 0, rx: 0.6, rz: 0.6 });

        // Sarcophagi scattered around
        var sarcMat = new THREE.MeshStandardMaterial({ color: 0x6b5a2a, roughness: 0.7, metalness: 0.2 });
        for (var si = 0; si < 5; si++) {
            var sx = -65 + (Math.random() - 0.5) * 30;
            var sz = (Math.random() - 0.5) * 40;
            var sarc = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 2), sarcMat);
            sarc.position.set(sx, 0.25, sz); scene.add(sarc);
            var lid = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 1.9),
                new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.5, roughness: 0.4 }));
            lid.position.set(sx, 0.55, sz); scene.add(lid);
        }

        // Valley ground (sandy, slightly lower)
        var valleyGround = new THREE.Mesh(new THREE.PlaneGeometry(50, 160),
            new THREE.MeshStandardMaterial({ color: 0xa08530, roughness: 1 }));
        valleyGround.rotation.x = -Math.PI / 2;
        valleyGround.position.set(-80, -0.05, 0); scene.add(valleyGround);

        // Material pickups
        spawnBiomePickup(scene, -70, 10, 'lightning_shard');
        spawnBiomePickup(scene, -85, -20, 'lotus');
        spawnBiomePickup(scene, -75, 40, 'sulfur');
    }

    // ============ ALEXANDRIA HARBOR (northeast: x 60-100, z -100 to -60) ============
    function buildAlexandriaHarbor(scene) {
        // Harbor ground (stone)
        var stoneMat = new THREE.MeshStandardMaterial({ color: 0x666654, roughness: 0.8 });
        var dockGround = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), stoneMat);
        dockGround.rotation.x = -Math.PI / 2;
        dockGround.position.set(80, 0.01, -80); scene.add(dockGround);

        // Lighthouse of Alexandria (simplified)
        var lhBase = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.7 }));
        lhBase.position.set(90, 4, -90); scene.add(lhBase);
        var lhMid = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 6, 8),
            new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.6 }));
        lhMid.position.set(90, 11, -90); scene.add(lhMid);
        var lhTop = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 4, 8),
            new THREE.MeshStandardMaterial({ color: 0xaaa999, roughness: 0.5 }));
        lhTop.position.set(90, 16, -90); scene.add(lhTop);
        var lhLight = new THREE.PointLight(0xffd700, 2, 40);
        lhLight.position.set(90, 19, -90); scene.add(lhLight);
        biomeLights.push(lhLight);
        biomeStructures.push({ x: 90, z: -90, rx: 4, rz: 4 });
        // Fire on top
        var lhFire = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 6),
            new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2, transparent: true, opacity: 0.7 }));
        lhFire.position.set(90, 18.5, -90); scene.add(lhFire);

        // Wooden docks
        var woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 });
        for (var di = 0; di < 3; di++) {
            var dock = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 12), woodMat);
            dock.position.set(65 + di * 8, 0.4, -75); scene.add(dock);
            // Support posts
            for (var p = 0; p < 3; p++) {
                var post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5), woodMat);
                post.position.set(65 + di * 8, -0.3, -70 + p * 5); scene.add(post);
            }
        }

        // Sunken ship hull
        var shipMat = new THREE.MeshStandardMaterial({ color: 0x3a2a14, roughness: 0.9 });
        var hull = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 10), shipMat);
        hull.position.set(75, -0.5, -95); hull.rotation.z = 0.3; scene.add(hull);
        var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5), woodMat);
        mast.position.set(75, 1.5, -93); mast.rotation.z = 0.2; scene.add(mast);

        // Amphora clusters
        var ampMat = new THREE.MeshStandardMaterial({ color: 0xaa6633, roughness: 0.7 });
        for (var ai = 0; ai < 8; ai++) {
            var ax = 68 + Math.random() * 20;
            var az = -70 - Math.random() * 15;
            var amp = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.5, 6), ampMat);
            amp.position.set(ax, 0.25, az); scene.add(amp);
        }

        // Warehouse buildings
        var brickMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.8 });
        for (var bi = 0; bi < 2; bi++) {
            var bx = 72 + bi * 10;
            var wh = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 8), brickMat);
            wh.position.set(bx, 2, -65); scene.add(wh);
            var roof = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2, 4), brickMat);
            roof.position.set(bx, 4.5, -65); roof.rotation.y = Math.PI / 4; scene.add(roof);
            biomeStructures.push({ x: bx, z: -65, rx: 3, rz: 4 });
        }

        // Water area
        var waterMat = new THREE.MeshStandardMaterial({ color: 0x1a4466, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.7 });
        var water = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.set(80, -0.3, -90); scene.add(water);

        // Material pickups
        spawnBiomePickup(scene, 72, -78, 'water_vial');
        spawnBiomePickup(scene, 85, -72, 'reed');
        spawnBiomePickup(scene, 78, -85, 'flint');
    }

    // ============ RIVER OF THE DEAD (underground: y -8 to -15) ============
    function buildRiverOfDead(scene) {
        // Underground cavern shell
        var caveMat = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.9, side: THREE.DoubleSide });
        // Floor
        var floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 80), caveMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, -15, 0); scene.add(floor);
        // Ceiling
        var ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 80), caveMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, -8, 0); scene.add(ceiling);

        // Ghostly river (flowing through center)
        var riverMat = new THREE.MeshStandardMaterial({ color: 0x224466, emissive: 0x112233, emissiveIntensity: 0.3, transparent: true, opacity: 0.6 });
        var river = new THREE.Mesh(new THREE.PlaneGeometry(8, 80), riverMat);
        river.rotation.x = -Math.PI / 2;
        river.position.set(0, -14.8, 0); scene.add(river);

        // Soul boat — abandoned wooden vessel
        var boatMat = new THREE.MeshStandardMaterial({ color: 0x3a2a0a, roughness: 0.8 });
        var boat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 5), boatMat);
        boat.position.set(0, -14.5, -15); scene.add(boat);
        // Soul lantern on boat
        var lanternGlow = new THREE.PointLight(0x4488ff, 0.5, 8);
        lanternGlow.position.set(0, -13.5, -15); scene.add(lanternGlow);
        biomeLights.push(lanternGlow);

        // Stone columns along walls
        var colMat = new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 0.7 });
        for (var ci = 0; ci < 10; ci++) {
            for (var side = -1; side <= 1; side += 2) {
                var col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 7, 6), colMat);
                col.position.set(side * 15, -11.5, -35 + ci * 7); scene.add(col);
            }
        }

        // Eerie blue-green lights along walls
        for (var li = 0; li < 8; li++) {
            var lx = (li % 2 === 0 ? -14 : 14);
            var lz = -30 + li * 8;
            var ghostLight = new THREE.PointLight(0x22aacc, 0.25, 6);
            ghostLight.position.set(lx, -12, lz); scene.add(ghostLight);
            biomeLights.push(ghostLight);
            // Glowing crystal
            var crystal = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 5),
                new THREE.MeshStandardMaterial({ color: 0x22aacc, emissive: 0x22aacc, emissiveIntensity: 0.6, transparent: true, opacity: 0.7 }));
            crystal.position.set(lx, -12, lz); scene.add(crystal);
        }

        // Entrance shaft (connects to surface)
        var shaftMat = new THREE.MeshStandardMaterial({ color: 0x2a1a08, roughness: 0.9, side: THREE.DoubleSide });
        var shaft = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 15, 8, 1, true), shaftMat);
        shaft.position.set(8, -7, -35); scene.add(shaft);

        // Spiral staircase in shaft
        for (var step = 0; step < 20; step++) {
            var stairAngle = step * 0.5;
            var stx = 8 + Math.cos(stairAngle) * 1.5;
            var stz = -35 + Math.sin(stairAngle) * 1.5;
            var sty = 0 - step * 0.75;
            var stair = new THREE.Mesh(new THREE.BoxGeometry(1, 0.15, 0.5),
                new THREE.MeshStandardMaterial({ color: 0x444433 }));
            stair.position.set(stx, sty, stz);
            stair.rotation.y = stairAngle;
            scene.add(stair);
        }

        // Apophis boss arena marker
        var arenaFloor = new THREE.Mesh(new THREE.CircleGeometry(15, 16),
            new THREE.MeshStandardMaterial({ color: 0x1a2a0a, roughness: 0.9, transparent: true, opacity: 0.5 }));
        arenaFloor.rotation.x = -Math.PI / 2;
        arenaFloor.position.set(0, -14.9, 20); scene.add(arenaFloor);

        // Soul wisps (static floating orbs)
        for (var wi = 0; wi < 10; wi++) {
            var wx = (Math.random() - 0.5) * 30;
            var wz = -30 + Math.random() * 60;
            var wisp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6),
                new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4488cc, emissiveIntensity: 1, transparent: true, opacity: 0.4 }));
            wisp.position.set(wx, -12 + Math.random() * 2, wz); scene.add(wisp);
        }

        // Material pickups underground
        spawnBiomePickup(scene, 3, -20, 'lightning_shard', -13);
        spawnBiomePickup(scene, -5, 10, 'lotus', -13);
    }

    // ============ HELPERS ============
    function spawnBiomePickup(scene, x, z, matType, y) {
        y = y || 0.3;
        var matColors = { linen: 0xeeeecc, resin: 0xaa7733, flint: 0x888888, palm_wood: 0x6b4226, reed: 0x44aa44, sulfur: 0xdddd44, lotus: 0x4488ff, water_vial: 0x44aadd, lightning_shard: 0xffff88 };
        var color = matColors[matType] || 0xffffff;
        var pickup = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6),
            new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.4 }));
        pickup.position.set(x, y, z); scene.add(pickup);
        var glow = new THREE.PointLight(color, 0.2, 4);
        glow.position.set(x, y + 0.3, z); scene.add(glow);
        biomePickups.push({ mesh: pickup, light: glow, x: x, z: z, y: y, matType: matType, collected: false });
    }

    function update(dt, px, pz, py) {
        var results = [];
        // Float animation for biome pickups
        for (var i = 0; i < biomePickups.length; i++) {
            var bp = biomePickups[i];
            if (bp.collected) continue;
            if (bp.mesh) bp.mesh.position.y = bp.y + Math.sin(Date.now() * 0.003 + i) * 0.15;
            var dx = px - bp.x, dz = pz - bp.z;
            if (Math.sqrt(dx * dx + dz * dz) < 1.5 && Math.abs(py - bp.y) < 3) {
                bp.collected = true;
                if (bp.mesh) bp.mesh.visible = false;
                if (bp.light) bp.light.intensity = 0;
                results.push({ type: 'material', matType: bp.matType });
            }
        }
        // Flicker ghost lights
        for (var li = 0; li < biomeLights.length; li++) {
            biomeLights[li].intensity *= (0.95 + Math.random() * 0.1);
        }
        return results;
    }

    function getStructures() { return biomeStructures; }

    function reset() {
        biomeStructures = []; biomeEnemies = [];
        biomeLights = []; biomePickups = [];
    }

    return {
        build: build, update: update, reset: reset,
        getStructures: getStructures
    };
})();
