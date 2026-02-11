/* ============================================
   Cursed Sands — Phase 7: Massive World Expansion
   8 new biomes, procedural ruins, mega-dungeon,
   chunk loading, minimap, dynamic terrain
   ============================================ */
var WorldGen = (function () {
    'use strict';

    var _scene = null;
    var WORLD_HALF = 400; // 800x800 world
    var CHUNK_SIZE = 80;
    var RENDER_DIST = 200;

    // ============ CHUNK SYSTEM ============
    var chunks = {};
    var activeChunks = new Set();
    var chunkMeshes = {};

    // ============ NEW BIOMES ============
    var BIOMES = {
        scorching_badlands: {
            name: 'Scorching Badlands', color: 0x3a1a0a,
            x: -300, z: -300, size: 120,
            terrain: 'volcanic', fogColor: 0x331100, fogDensity: 0.015,
            groundColor: 0x2a1008, ambient: 0xff3300
        },
        salt_flats: {
            name: 'Salt Flats', color: 0xeeeedd,
            x: 200, z: -300, size: 100,
            terrain: 'flat', fogColor: 0xccccaa, fogDensity: 0.008,
            groundColor: 0xddddcc, ambient: 0xffffff
        },
        oasis_grove: {
            name: 'Oasis Grove', color: 0x226622,
            x: 300, z: 100, size: 80,
            terrain: 'lush', fogColor: 0x224422, fogDensity: 0.012,
            groundColor: 0x336622, ambient: 0x44aa44
        },
        sphinx_plateau: {
            name: 'Sphinx Plateau', color: 0xaa8844,
            x: -200, z: 200, size: 100,
            terrain: 'plateau', fogColor: 0x887744, fogDensity: 0.01,
            groundColor: 0x997733, ambient: 0xffaa44
        },
        catacombs: {
            name: 'Catacombs of Thoth', color: 0x1a1a2a,
            x: 0, z: -250, size: 60, y: -20,
            terrain: 'underground', fogColor: 0x0a0a15, fogDensity: 0.03,
            groundColor: 0x222233, ambient: 0x4444aa
        },
        sunken_city: {
            name: 'Sunken City', color: 0x1a4455,
            x: -300, z: 100, size: 90,
            terrain: 'flooded', fogColor: 0x0a2233, fogDensity: 0.02,
            groundColor: 0x1a3344, ambient: 0x2266aa
        },
        desert_glass: {
            name: 'Desert Glass Fields', color: 0x88ff88,
            x: 200, z: 250, size: 80,
            terrain: 'glass', fogColor: 0x224422, fogDensity: 0.008,
            groundColor: 0x225522, ambient: 0x44ff44
        },
        pharaoh_garden: {
            name: "Pharaoh's Garden", color: 0xff44ff,
            x: -100, z: -350, size: 70,
            terrain: 'exotic', fogColor: 0x331133, fogDensity: 0.015,
            groundColor: 0x442244, ambient: 0xff66ff
        }
    };

    // ============ BIOME STRUCTURES (tracked for collision) ============
    var worldStructures = [];
    var worldPickups = [];
    var megaDungeon = { entered: false, floor: 0, meshes: [], unlocked: [true, false, false, false, false] };
    var ruinInstances = [];
    var POIs = [];

    // ============ BUILD ============
    function build(scene) {
        _scene = scene;
        worldStructures = [];
        worldPickups = [];
        ruinInstances = [];
        POIs = [];
        chunks = {}; activeChunks = new Set(); chunkMeshes = {};
        megaDungeon = { entered: false, floor: 0, meshes: [], unlocked: [true, false, false, false, false] };

        buildAllBiomes(scene);
        buildProceduralRuins(scene);
        buildMegaDungeonEntrance(scene);
        buildOverworldPOIs(scene);
    }

    // ============ BUILD BIOMES ============
    function buildAllBiomes(scene) {
        Object.keys(BIOMES).forEach(function (key) {
            var b = BIOMES[key];
            buildBiomeGround(scene, b, key);
            buildBiomeStructures(scene, b, key);
            buildBiomeLighting(scene, b);
            scatterBiomePickups(scene, b, key);
        });
    }

    function buildBiomeGround(scene, b, key) {
        var mat = new THREE.MeshStandardMaterial({
            color: b.groundColor, roughness: 0.9, metalness: 0.1,
            side: THREE.DoubleSide
        });
        var ground = new THREE.Mesh(new THREE.PlaneGeometry(b.size, b.size), mat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(b.x, (b.y || 0) + 0.01, b.z);
        ground.receiveShadow = true;
        scene.add(ground);

        // Border markers (glowing pillars)
        var pillarMat = new THREE.MeshStandardMaterial({
            color: b.color, emissive: b.color, emissiveIntensity: 0.3,
            transparent: true, opacity: 0.6
        });
        for (var c = 0; c < 4; c++) {
            var cx = b.x + (c % 2 === 0 ? -1 : 1) * (b.size / 2);
            var cz = b.z + (c < 2 ? -1 : 1) * (b.size / 2);
            var pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 6), pillarMat);
            pillar.position.set(cx, 1.5, cz);
            scene.add(pillar);
            var light = new THREE.PointLight(b.ambient, 0.4, 12);
            light.position.set(cx, 2.5, cz);
            scene.add(light);
        }
    }

    function buildBiomeLighting(scene, b) {
        var biomeLight = new THREE.PointLight(b.ambient, 0.5, b.size * 0.7);
        biomeLight.position.set(b.x, 8, b.z);
        scene.add(biomeLight);
    }

    // ============ BIOME-SPECIFIC STRUCTURES ============
    function buildBiomeStructures(scene, b, key) {
        if (key === 'scorching_badlands') buildBadlands(scene, b);
        else if (key === 'salt_flats') buildSaltFlats(scene, b);
        else if (key === 'oasis_grove') buildOasisGrove(scene, b);
        else if (key === 'sphinx_plateau') buildSphinxPlateau(scene, b);
        else if (key === 'catacombs') buildCatacombs(scene, b);
        else if (key === 'sunken_city') buildSunkenCity(scene, b);
        else if (key === 'desert_glass') buildDesertGlass(scene, b);
        else if (key === 'pharaoh_garden') buildPharaohGarden(scene, b);
    }

    // ---- SCORCHING BADLANDS ----
    function buildBadlands(scene, b) {
        var lavaMat = new THREE.MeshStandardMaterial({
            color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 1.5,
            roughness: 0.3, transparent: true, opacity: 0.7
        });
        var rockMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 });
        var obsidianMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.1, metalness: 0.8 });

        // Volcanic vents (5 lava pools)
        for (var i = 0; i < 5; i++) {
            var vx = b.x + (Math.random() - 0.5) * b.size * 0.8;
            var vz = b.z + (Math.random() - 0.5) * b.size * 0.8;
            var pool = new THREE.Mesh(new THREE.CircleGeometry(2 + Math.random() * 2, 10), lavaMat);
            pool.rotation.x = -Math.PI / 2;
            pool.position.set(vx, 0.05, vz);
            scene.add(pool);
            var lavaLight = new THREE.PointLight(0xff3300, 0.8, 8);
            lavaLight.position.set(vx, 0.5, vz);
            scene.add(lavaLight);
            worldPickups.push({ x: vx, z: vz, radius: 2, type: 'lava_damage', damage: 15 });
        }
        // Obsidian spires (8)
        for (var j = 0; j < 8; j++) {
            var sx = b.x + (Math.random() - 0.5) * b.size * 0.7;
            var sz = b.z + (Math.random() - 0.5) * b.size * 0.7;
            var h = 3 + Math.random() * 5;
            var spire = new THREE.Mesh(new THREE.ConeGeometry(0.5 + Math.random() * 0.5, h, 5), obsidianMat);
            spire.position.set(sx, h / 2, sz);
            scene.add(spire);
            worldStructures.push({ x: sx, z: sz, rx: 1, rz: 1 });
        }
        // Rocky terrain
        for (var k = 0; k < 15; k++) {
            var rx = b.x + (Math.random() - 0.5) * b.size * 0.9;
            var rz = b.z + (Math.random() - 0.5) * b.size * 0.9;
            var rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.5 + Math.random(), 0), rockMat
            );
            rock.position.set(rx, 0.3, rz);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            scene.add(rock);
        }
    }

    // ---- SALT FLATS ----
    function buildSaltFlats(scene, b) {
        var saltMat = new THREE.MeshStandardMaterial({
            color: 0xeeeedd, roughness: 0.2, metalness: 0.5
        });
        // Mirage shimmer posts
        for (var i = 0; i < 6; i++) {
            var mx = b.x + (Math.random() - 0.5) * b.size * 0.8;
            var mz = b.z + (Math.random() - 0.5) * b.size * 0.8;
            var shimmer = new THREE.Mesh(
                new THREE.PlaneGeometry(4, 6),
                new THREE.MeshBasicMaterial({ color: 0xccccaa, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
            );
            shimmer.position.set(mx, 3, mz);
            scene.add(shimmer);
        }
        // Nomad camp structures (tents)
        for (var t = 0; t < 3; t++) {
            var tx = b.x + (t - 1) * 15;
            var tz = b.z + (Math.random() - 0.5) * 20;
            var tentMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.8, side: THREE.DoubleSide });
            var tent = new THREE.Mesh(new THREE.ConeGeometry(2, 3, 4), tentMat);
            tent.position.set(tx, 1.5, tz);
            scene.add(tent);
            worldStructures.push({ x: tx, z: tz, rx: 2, rz: 2 });
            var tentLight = new THREE.PointLight(0xff8844, 0.3, 6);
            tentLight.position.set(tx, 1, tz);
            scene.add(tentLight);
        }
        // Salt crystal formations
        var crystalMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.7
        });
        for (var c = 0; c < 10; c++) {
            var cx = b.x + (Math.random() - 0.5) * b.size * 0.7;
            var cz = b.z + (Math.random() - 0.5) * b.size * 0.7;
            var crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.3 + Math.random() * 0.4, 0), crystalMat);
            crystal.position.set(cx, 0.3, cz);
            crystal.rotation.set(Math.random(), Math.random(), 0);
            scene.add(crystal);
        }
    }

    // ---- OASIS GROVE ----
    function buildOasisGrove(scene, b) {
        var trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 });
        var leafMat = new THREE.MeshStandardMaterial({ color: 0x228822, roughness: 0.6, side: THREE.DoubleSide });
        var waterMat = new THREE.MeshStandardMaterial({
            color: 0x227799, roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.55
        });

        // Dense palm forest
        for (var i = 0; i < 20; i++) {
            var tx = b.x + (Math.random() - 0.5) * b.size * 0.8;
            var tz = b.z + (Math.random() - 0.5) * b.size * 0.8;
            var trunkH = 3 + Math.random() * 3;
            var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, trunkH, 6), trunkMat);
            trunk.position.set(tx, trunkH / 2, tz);
            trunk.rotation.z = (Math.random() - 0.5) * 0.15;
            scene.add(trunk);
            for (var f = 0; f < 5; f++) {
                var frond = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), leafMat);
                frond.position.set(tx + Math.cos(f * 1.26) * 0.8, trunkH + 0.3, tz + Math.sin(f * 1.26) * 0.8);
                frond.rotation.x = -0.5; frond.rotation.y = f * 1.26;
                scene.add(frond);
            }
            worldStructures.push({ x: tx, z: tz, rx: 0.5, rz: 0.5 });
        }
        // Central freshwater lake
        var lake = new THREE.Mesh(new THREE.CircleGeometry(10, 20), waterMat);
        lake.rotation.x = -Math.PI / 2;
        lake.position.set(b.x, 0.02, b.z);
        scene.add(lake);
        // Fireflies at night (point lights with very low intensity, flickered in update)
        for (var fi = 0; fi < 8; fi++) {
            var fl = new THREE.PointLight(0x88ff44, 0, 3);
            fl.position.set(b.x + (Math.random() - 0.5) * 20, 1 + Math.random() * 2, b.z + (Math.random() - 0.5) * 20);
            scene.add(fl);
            POIs.push({ type: 'firefly', light: fl, baseX: fl.position.x, baseZ: fl.position.z });
        }
    }

    // ---- SPHINX PLATEAU ----
    function buildSphinxPlateau(scene, b) {
        var stoneMat = new THREE.MeshStandardMaterial({ color: 0xaa8844, roughness: 0.7 });
        // Massive sphinx (simplified: body + head + paws)
        var body = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 8), stoneMat);
        body.position.set(b.x, 2.5, b.z);
        scene.add(body);
        var head = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), stoneMat);
        head.position.set(b.x + 9, 6, b.z);
        head.scale.set(1, 1.2, 0.9);
        scene.add(head);
        // Headdress
        var headdress = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 0.5), new THREE.MeshStandardMaterial({
            color: 0xffd700, metalness: 0.8, roughness: 0.2
        }));
        headdress.position.set(b.x + 9, 8, b.z);
        scene.add(headdress);
        // Paws
        for (var p = -1; p <= 1; p += 2) {
            var paw = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 2.5), stoneMat);
            paw.position.set(b.x + 10, 1, b.z + p * 3);
            scene.add(paw);
        }
        worldStructures.push({ x: b.x, z: b.z, rx: 12, rz: 6 });
        // Riddle-locked vault entrance
        var vaultDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x886622, emissive: 0x442200, emissiveIntensity: 0.3 }));
        vaultDoor.position.set(b.x - 8, 2, b.z);
        scene.add(vaultDoor);
        POIs.push({ type: 'vault', x: b.x - 8, z: b.z, solved: false });
        // Surrounding pillars
        for (var pi = 0; pi < 8; pi++) {
            var pa = pi * Math.PI / 4;
            var pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 6, 6), stoneMat);
            pillar.position.set(b.x + Math.cos(pa) * 25, 3, b.z + Math.sin(pa) * 25);
            scene.add(pillar);
        }
    }

    // ---- CATACOMBS OF THOTH ----
    function buildCatacombs(scene, b) {
        var wallMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.8 });
        var bookMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.7 });
        // Underground chamber
        var floor = new THREE.Mesh(new THREE.PlaneGeometry(b.size, b.size), wallMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(b.x, b.y, b.z);
        scene.add(floor);
        var ceiling = new THREE.Mesh(new THREE.PlaneGeometry(b.size, b.size), wallMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(b.x, b.y + 6, b.z);
        scene.add(ceiling);
        // Walls around perimeter
        var wallGeo = new THREE.BoxGeometry(b.size, 6, 1);
        for (var w = 0; w < 4; w++) {
            var wall = new THREE.Mesh(wallGeo, wallMat);
            var wx = b.x + (w === 1 ? b.size / 2 : w === 3 ? -b.size / 2 : 0);
            var wz = b.z + (w === 0 ? b.size / 2 : w === 2 ? -b.size / 2 : 0);
            wall.position.set(wx, b.y + 3, wz);
            if (w === 1 || w === 3) wall.rotation.y = Math.PI / 2;
            scene.add(wall);
        }
        // Bookshelves (scroll shelves)
        for (var si = 0; si < 12; si++) {
            var sx = b.x + (Math.random() - 0.5) * (b.size - 10);
            var sz = b.z + (Math.random() - 0.5) * (b.size - 10);
            var shelf = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.5), bookMat);
            shelf.position.set(sx, b.y + 1.5, sz);
            scene.add(shelf);
            worldStructures.push({ x: sx, z: sz, rx: 1.2, rz: 0.5 });
        }
        // Floating scroll lights
        for (var li = 0; li < 6; li++) {
            var light = new THREE.PointLight(0x4444aa, 0.5, 8);
            light.position.set(
                b.x + (Math.random() - 0.5) * b.size * 0.6,
                b.y + 2 + Math.random() * 2,
                b.z + (Math.random() - 0.5) * b.size * 0.6
            );
            scene.add(light);
        }
        // Entrance spiral staircase
        var stairMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.7 });
        for (var step = 0; step < 20; step++) {
            var sa = step * Math.PI / 5;
            var sr = 2;
            var stair = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.8), stairMat);
            stair.position.set(b.x + Math.cos(sa) * sr, step * -1, b.z + Math.sin(sa) * sr);
            stair.rotation.y = sa;
            scene.add(stair);
        }
    }

    // ---- SUNKEN CITY ----
    function buildSunkenCity(scene, b) {
        var ruinMat = new THREE.MeshStandardMaterial({ color: 0x446655, roughness: 0.7 });
        var waterMat = new THREE.MeshStandardMaterial({
            color: 0x1a4455, roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.5
        });
        // Shallow water covering everything
        var waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(b.size, b.size), waterMat);
        waterPlane.rotation.x = -Math.PI / 2;
        waterPlane.position.set(b.x, 0.3, b.z);
        scene.add(waterPlane);
        // Sunken ruins — half-submerged columns and walls
        for (var i = 0; i < 15; i++) {
            var rx = b.x + (Math.random() - 0.5) * b.size * 0.8;
            var rz = b.z + (Math.random() - 0.5) * b.size * 0.8;
            var h = 2 + Math.random() * 4;
            var col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, h, 6), ruinMat);
            col.position.set(rx, h / 2 - 1, rz); // partially submerged
            scene.add(col);
            worldStructures.push({ x: rx, z: rz, rx: 0.8, rz: 0.8 });
        }
        // Broken temple walls
        for (var w = 0; w < 6; w++) {
            var wx = b.x + (Math.random() - 0.5) * b.size * 0.6;
            var wz = b.z + (Math.random() - 0.5) * b.size * 0.6;
            var wh = 1.5 + Math.random() * 2;
            var wall = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 3, wh, 0.5), ruinMat);
            wall.position.set(wx, wh / 2 - 0.5, wz);
            wall.rotation.y = Math.random() * Math.PI;
            scene.add(wall);
        }
        // Underwater tunnel entrance
        var tunnelMat = new THREE.MeshStandardMaterial({
            color: 0x0a2233, emissive: 0x112244, emissiveIntensity: 0.3
        });
        var tunnel = new THREE.Mesh(new THREE.TorusGeometry(2, 0.3, 8, 12), tunnelMat);
        tunnel.position.set(b.x, -0.5, b.z);
        scene.add(tunnel);
        POIs.push({ type: 'underwater_tunnel', x: b.x, z: b.z });
    }

    // ---- DESERT GLASS FIELDS ----
    function buildDesertGlass(scene, b) {
        var glassMat = new THREE.MeshStandardMaterial({
            color: 0x88ff88, roughness: 0.05, metalness: 0.7,
            transparent: true, opacity: 0.6, emissive: 0x44aa44, emissiveIntensity: 0.2
        });
        // Shattered glass ground patches
        for (var i = 0; i < 20; i++) {
            var gx = b.x + (Math.random() - 0.5) * b.size * 0.9;
            var gz = b.z + (Math.random() - 0.5) * b.size * 0.9;
            var shard = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.5, 1), glassMat
            );
            shard.position.set(gx, 0.1, gz);
            shard.rotation.set(Math.random(), Math.random(), Math.random());
            scene.add(shard);
        }
        // Meteor crater
        var craterMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
        var crater = new THREE.Mesh(new THREE.RingGeometry(5, 12, 16), craterMat);
        crater.rotation.x = -Math.PI / 2;
        crater.position.set(b.x, 0.01, b.z);
        scene.add(crater);
        // Glow core
        var coreLight = new THREE.PointLight(0x44ff00, 1.5, 15);
        coreLight.position.set(b.x, 1, b.z);
        scene.add(coreLight);
        var core = new THREE.Mesh(
            new THREE.SphereGeometry(1, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x88ff44, emissive: 0x44ff00, emissiveIntensity: 3, transparent: true, opacity: 0.5 })
        );
        core.position.set(b.x, 1, b.z);
        scene.add(core);
        POIs.push({ type: 'meteor_core', x: b.x, z: b.z, light: coreLight, mesh: core });
        // Radioactive crystal formations
        for (var c = 0; c < 8; c++) {
            var ca = c * Math.PI / 4;
            var cr = 8 + Math.random() * 6;
            var crystal = new THREE.Mesh(
                new THREE.ConeGeometry(0.4, 1.5 + Math.random(), 5), glassMat
            );
            crystal.position.set(b.x + Math.cos(ca) * cr, 0.5, b.z + Math.sin(ca) * cr);
            scene.add(crystal);
        }
    }

    // ---- PHARAOH'S GARDEN ----
    function buildPharaohGarden(scene, b) {
        var flowerColors = [0xff4488, 0xff8844, 0xaa44ff, 0x44aaff, 0xffff44];
        var stemMat = new THREE.MeshStandardMaterial({ color: 0x226622, roughness: 0.7 });
        // Exotic impossible garden
        for (var i = 0; i < 40; i++) {
            var fx = b.x + (Math.random() - 0.5) * b.size * 0.9;
            var fz = b.z + (Math.random() - 0.5) * b.size * 0.9;
            var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.6 + Math.random() * 0.5, 4), stemMat);
            stem.position.set(fx, 0.3, fz);
            scene.add(stem);
            var flowerColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
            var petal = new THREE.Mesh(
                new THREE.SphereGeometry(0.1 + Math.random() * 0.08, 5, 5),
                new THREE.MeshStandardMaterial({ color: flowerColor, emissive: flowerColor, emissiveIntensity: 0.4 })
            );
            petal.position.set(fx, 0.6 + Math.random() * 0.3, fz);
            scene.add(petal);
        }
        // Time-distortion zone visual (swirling particle ring)
        var timeMat = new THREE.MeshStandardMaterial({
            color: 0xff44ff, emissive: 0xaa00aa, emissiveIntensity: 0.8,
            transparent: true, opacity: 0.3, side: THREE.DoubleSide
        });
        var timeRing = new THREE.Mesh(new THREE.TorusGeometry(15, 0.5, 8, 24), timeMat);
        timeRing.position.set(b.x, 2, b.z);
        timeRing.rotation.x = Math.PI / 2;
        scene.add(timeRing);
        POIs.push({ type: 'time_zone', x: b.x, z: b.z, radius: 15, mesh: timeRing });
        // Arcane fountain
        var fountainMat = new THREE.MeshStandardMaterial({ color: 0x886688, roughness: 0.4, metalness: 0.5 });
        var fountain = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 1, 10), fountainMat);
        fountain.position.set(b.x, 0.5, b.z);
        scene.add(fountain);
        // Water in fountain (glowing purple)
        var fWater = new THREE.Mesh(
            new THREE.CircleGeometry(1.8, 10),
            new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x6622aa, emissiveIntensity: 1, transparent: true, opacity: 0.5 })
        );
        fWater.rotation.x = -Math.PI / 2;
        fWater.position.set(b.x, 1.02, b.z);
        scene.add(fWater);
    }

    // ============ PROCEDURAL RUINS ============
    function buildProceduralRuins(scene) {
        // Scatter 25 procedural ruins across the expanded world
        for (var i = 0; i < 25; i++) {
            var rx = (Math.random() - 0.5) * WORLD_HALF * 1.5;
            var rz = (Math.random() - 0.5) * WORLD_HALF * 1.5;
            // Skip if too close to biome centers
            var tooClose = false;
            Object.keys(BIOMES).forEach(function (k) {
                var bb = BIOMES[k];
                if (Math.sqrt((rx - bb.x) * (rx - bb.x) + (rz - bb.z) * (rz - bb.z)) < bb.size * 0.6) tooClose = true;
            });
            if (tooClose) continue;

            var ruinType = Math.floor(Math.random() * 5);
            var ruinMat = new THREE.MeshStandardMaterial({
                color: 0x998866 - Math.random() * 0x111111,
                roughness: 0.8, metalness: 0.1
            });

            if (ruinType === 0) buildRuinTemple(scene, rx, rz, ruinMat);
            else if (ruinType === 1) buildRuinTower(scene, rx, rz, ruinMat);
            else if (ruinType === 2) buildRuinWalls(scene, rx, rz, ruinMat);
            else if (ruinType === 3) buildRuinStatue(scene, rx, rz, ruinMat);
            else buildRuinArch(scene, rx, rz, ruinMat);

            ruinInstances.push({ x: rx, z: rz, type: ruinType, looted: false });
            worldStructures.push({ x: rx, z: rz, rx: 4, rz: 4 });
        }
    }

    function buildRuinTemple(scene, x, z, mat) {
        // Small ruined temple
        var floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 6), mat);
        floor.position.set(x, 0.15, z); scene.add(floor);
        // Broken columns
        for (var c = 0; c < 6; c++) {
            var cx = x + (c % 2 === 0 ? -3 : 3);
            var cz = z + (Math.floor(c / 2) - 1) * 2.5;
            var h = 1.5 + Math.random() * 2.5;
            var col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, h, 6), mat);
            col.position.set(cx, h / 2, cz); scene.add(col);
        }
    }

    function buildRuinTower(scene, x, z, mat) {
        var h = 5 + Math.random() * 5;
        var tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, h, 8), mat);
        tower.position.set(x, h / 2, z); scene.add(tower);
        // Top broken off (jagged ring)
        var rim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.2, 4, 8), mat);
        rim.position.set(x, h, z); rim.rotation.x = Math.PI / 2;
        scene.add(rim);
    }

    function buildRuinWalls(scene, x, z, mat) {
        for (var w = 0; w < 3; w++) {
            var wl = 3 + Math.random() * 4;
            var wh = 1 + Math.random() * 2;
            var wall = new THREE.Mesh(new THREE.BoxGeometry(wl, wh, 0.4), mat);
            wall.position.set(x + (w - 1) * 2, wh / 2, z + (Math.random() - 0.5) * 3);
            wall.rotation.y = Math.random() * Math.PI;
            scene.add(wall);
        }
    }

    function buildRuinStatue(scene, x, z, mat) {
        // Partial statue (broken torso on pedestal)
        var pedestal = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), mat);
        pedestal.position.set(x, 0.5, z); scene.add(pedestal);
        var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 2, 6), mat);
        torso.position.set(x, 2, z); scene.add(torso);
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), mat);
        head.position.set(x + 2, 0.4, z + 1); // fallen head
        scene.add(head);
    }

    function buildRuinArch(scene, x, z, mat) {
        // Triumphal arch
        var leftPillar = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 1), mat);
        leftPillar.position.set(x - 2, 2.5, z); scene.add(leftPillar);
        var rightPillar = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 1), mat);
        rightPillar.position.set(x + 2, 2.5, z); scene.add(rightPillar);
        var beam = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 1), mat);
        beam.position.set(x, 5.2, z); scene.add(beam);
    }

    // ============ MEGA-DUNGEON ENTRANCE ============
    function buildMegaDungeonEntrance(scene) {
        // Below the Great Pyramid (existing at x:40, z:-40)
        var entranceMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, emissive: 0xaa7700, emissiveIntensity: 0.5,
            transparent: true, opacity: 0.7
        });
        var gate = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.25, 8, 16), entranceMat);
        gate.position.set(40, 0.5, -45);
        gate.rotation.x = Math.PI / 2;
        scene.add(gate);
        // Steps descending
        var stepMat = new THREE.MeshStandardMaterial({ color: 0x887744, roughness: 0.7 });
        for (var s = 0; s < 10; s++) {
            var step = new THREE.Mesh(new THREE.BoxGeometry(3, 0.25, 1), stepMat);
            step.position.set(40, -s * 0.5, -45 - s * 0.8);
            scene.add(step);
        }
        // Floor themes info
        var floorNames = ['Sandstone Halls', 'Drowned Chambers', 'Furnace Depths', 'Shadow Labyrinth', 'Chaos Sanctum'];
        POIs.push({ type: 'mega_dungeon', x: 40, z: -45, floors: floorNames });
        // Light beacon
        var beacon = new THREE.PointLight(0xffd700, 1, 15);
        beacon.position.set(40, 3, -45);
        scene.add(beacon);
    }

    // ============ OVERWORLD POIs ============
    function buildOverworldPOIs(scene) {
        // Cursed obelisks (5)
        var obeliskMat = new THREE.MeshStandardMaterial({
            color: 0x222222, roughness: 0.3, metalness: 0.5,
            emissive: 0x440044, emissiveIntensity: 0.3
        });
        var obeliskPositions = [
            { x: 150, z: 0 }, { x: -150, z: 0 }, { x: 0, z: 150 },
            { x: 0, z: -150 }, { x: 100, z: 100 }
        ];
        obeliskPositions.forEach(function (op) {
            var ob = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 0.6), obeliskMat);
            ob.position.set(op.x, 3, op.z); scene.add(ob);
            var tip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 4), obeliskMat);
            tip.position.set(op.x, 6.5, op.z); scene.add(tip);
            var obLight = new THREE.PointLight(0x8800ff, 0.5, 10);
            obLight.position.set(op.x, 4, op.z); scene.add(obLight);
            POIs.push({ type: 'obelisk', x: op.x, z: op.z, activated: false });
            worldStructures.push({ x: op.x, z: op.z, rx: 1, rz: 1 });
        });

        // Ancient telescopes (3)
        var telescopeMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.5, metalness: 0.4 });
        var telePositions = [{ x: 120, z: -120 }, { x: -120, z: 120 }, { x: -200, z: -200 }];
        telePositions.forEach(function (tp) {
            var base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 3, 6), telescopeMat);
            base.position.set(tp.x, 1.5, tp.z); scene.add(base);
            var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 2, 6), telescopeMat);
            tube.position.set(tp.x, 3.5, tp.z); tube.rotation.z = -0.5; scene.add(tube);
            POIs.push({ type: 'telescope', x: tp.x, z: tp.z, used: false });
            worldStructures.push({ x: tp.x, z: tp.z, rx: 1, rz: 1 });
        });

        // Abandoned dig sites (4)
        var digPositions = [{ x: 80, z: 80 }, { x: -80, z: -80 }, { x: -150, z: 50 }, { x: 50, z: -180 }];
        var tentMat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.8 });
        digPositions.forEach(function (dp) {
            var tent = new THREE.Mesh(new THREE.ConeGeometry(2, 2.5, 4), tentMat);
            tent.position.set(dp.x, 1.25, dp.z); scene.add(tent);
            var crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), tentMat);
            crate.position.set(dp.x + 2, 0.4, dp.z + 1); scene.add(crate);
            POIs.push({ type: 'dig_site', x: dp.x, z: dp.z, looted: false });
            worldStructures.push({ x: dp.x, z: dp.z, rx: 2.5, rz: 2.5 });
        });
    }

    // ============ SCATTER BIOME PICKUPS ============
    function scatterBiomePickups(scene, b, key) {
        var matTypes = {
            scorching_badlands: ['sulfur', 'flint', 'obsidian'],
            salt_flats: ['salt', 'flint'],
            oasis_grove: ['lotus', 'water_vial', 'palm_wood'],
            sphinx_plateau: ['gold_dust', 'lapis'],
            catacombs: ['papyrus', 'lapis'],
            sunken_city: ['coral', 'water_vial'],
            desert_glass: ['desert_glass', 'sulfur'],
            pharaoh_garden: ['lotus', 'ambrosia']
        };
        var mats = matTypes[key] || ['flint'];
        for (var i = 0; i < 8; i++) {
            var px = b.x + (Math.random() - 0.5) * b.size * 0.8;
            var pz = b.z + (Math.random() - 0.5) * b.size * 0.8;
            var mat = mats[Math.floor(Math.random() * mats.length)];
            var pickupMesh = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.2, 0),
                new THREE.MeshStandardMaterial({
                    color: b.color, emissive: b.color, emissiveIntensity: 0.5,
                    transparent: true, opacity: 0.7
                })
            );
            pickupMesh.position.set(px, (b.y || 0) + 0.3, pz);
            scene.add(pickupMesh);
            worldPickups.push({
                x: px, z: pz, y: (b.y || 0), radius: 1.5,
                type: 'material', matType: mat, mesh: pickupMesh, collected: false
            });
        }
    }

    // ============ UPDATE ============
    function update(dt, px, pz, py) {
        var results = [];

        // Check material pickups
        for (var i = worldPickups.length - 1; i >= 0; i--) {
            var wp = worldPickups[i];
            if (wp.collected) continue;

            var dx = px - wp.x, dz = pz - wp.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            if (wp.type === 'material' && dist < wp.radius) {
                wp.collected = true;
                if (wp.mesh) { _scene.remove(wp.mesh); wp.mesh = null; }
                results.push({ type: 'material', matType: wp.matType });
            }
            if (wp.type === 'lava_damage' && dist < wp.radius) {
                results.push({ type: 'damage', damage: wp.damage * dt });
            }
        }

        // Animate fireflies (Oasis Grove)
        POIs.forEach(function (poi) {
            if (poi.type === 'firefly' && poi.light) {
                poi.light.position.x = poi.baseX + Math.sin(Date.now() * 0.001 + poi.baseX) * 2;
                poi.light.position.z = poi.baseZ + Math.cos(Date.now() * 0.0012 + poi.baseZ) * 2;
                // Glow at night only
                var hour = (typeof gameMinute !== 'undefined' ? gameMinute : 720) / 60;
                poi.light.intensity = (hour < 5 || hour >= 20) ? 0.3 + Math.sin(Date.now() * 0.003) * 0.2 : 0;
            }
            // Meteor core pulse
            if (poi.type === 'meteor_core' && poi.light) {
                poi.light.intensity = 1 + Math.sin(Date.now() * 0.002) * 0.5;
                if (poi.mesh) poi.mesh.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.1);
            }
            // Time zone rotation
            if (poi.type === 'time_zone' && poi.mesh) {
                poi.mesh.rotation.z += dt * 0.3;
            }
        });

        return results;
    }

    // ============ GETTERS ============
    function getStructures() { return worldStructures; }
    function getPOIs() { return POIs; }
    function getMegaDungeon() { return megaDungeon; }
    function getRuins() { return ruinInstances; }
    function getBiomes() { return BIOMES; }

    // Check if player is in a specific biome
    function getCurrentBiome(px, pz) {
        var result = null;
        Object.keys(BIOMES).forEach(function (key) {
            var b = BIOMES[key];
            if (Math.abs(px - b.x) < b.size / 2 && Math.abs(pz - b.z) < b.size / 2) {
                result = { key: key, biome: b };
            }
        });
        return result;
    }

    // ============ INTERACT WITH POI ============
    function interactPOI(px, pz) {
        for (var i = 0; i < POIs.length; i++) {
            var p = POIs[i];
            var dx = px - p.x, dz = pz - p.z;
            if (Math.sqrt(dx * dx + dz * dz) > 3) continue;

            if (p.type === 'obelisk' && !p.activated) {
                p.activated = true;
                return { type: 'obelisk', text: '🗿 Cursed Obelisk activated — sanity resist +10%' };
            }
            if (p.type === 'telescope' && !p.used) {
                p.used = true;
                return { type: 'telescope', text: '🔭 Area revealed on map!' };
            }
            if (p.type === 'dig_site' && !p.looted) {
                p.looted = true;
                return { type: 'dig_site', text: '⛏️ Found materials at dig site!' };
            }
            if (p.type === 'mega_dungeon') {
                return { type: 'mega_dungeon', text: '⬇️ Enter the Mega-Dungeon?' };
            }
        }
        return null;
    }

    // ============ RESET ============
    function reset() {
        worldStructures = [];
        worldPickups.forEach(function (wp) { if (wp.mesh && _scene) _scene.remove(wp.mesh); });
        worldPickups = [];
        ruinInstances = [];
        POIs = [];
        megaDungeon = { entered: false, floor: 0, meshes: [], unlocked: [true, false, false, false, false] };
        chunks = {}; activeChunks = new Set();
    }

    return {
        build: build, update: update, reset: reset,
        getStructures: getStructures,
        getPOIs: getPOIs,
        getMegaDungeon: getMegaDungeon,
        getRuins: getRuins,
        getBiomes: getBiomes,
        getCurrentBiome: getCurrentBiome,
        interactPOI: interactPOI
    };
})();
