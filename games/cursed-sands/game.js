/* ============================================
   Cursed Sands — 3D Open-World Ancient Egypt Horror
   Three.js FPS exploration with day/night cycle
   ============================================ */
(function () {
    'use strict';

    // ============ ENGINE STATE ============
    var scene, camera, renderer, clock;
    var gameActive = false, initialized = false;
    var player = { x: 0, y: 1.7, z: 0 };
    var yaw = 0, pitch = 0, mouseSens = 0.002;
    var keys = {};
    var WALK_SPEED = 4, SPRINT_SPEED = 8, CROUCH_SPEED = 2;
    var isSprinting = false, flashlightOn = false;
    var flashlight = null, sunLight = null, moonLight = null, ambientLight = null;

    // ============ GAME STATE ============
    var WORLD_SIZE = 100; // half-extent
    var gameMinute = 360; // start at 6:00 AM (360 minutes)
    var TIME_SPEED = 1; // 1 real second = 1 game minute
    var sanity = 100, maxSanity = 100;
    var battery = 100;
    var batteryDrainMult = 1; // merchant upgrade
    var sanityResistMult = 1; // merchant upgrade
    var extraLives = 0; // merchant upgrade
    var artifacts = [], artifactsCollected = 0, TOTAL_ARTIFACTS = 7;
    var mummies = [], anubisGuards = [], scarabs = [];
    var structures = []; // collision boxes {x, z, rx, rz}
    var sandstormActive = false, sandstormTimer = 0, sandstormCooldown = 120;
    var jumpScareTimer = 0;
    var codexOpen = false, merchantOpen = false, inventoryOpen = false, upgradeOpen = false;
    var leaderboardOpen = false, cosmeticsOpen = false;
    var notifyTimer = 0, notifyText = '';
    var currentSunY = 0; // track sun position for staff recharge
    var pyramidData = [
        { x: 40, z: -40, s: 24, h: 20 },
        { x: 55, z: -25, s: 14, h: 10 },
        { x: 25, z: -50, s: 10, h: 8 }
    ];

    // ============ ARTIFACT DEFINITIONS ============
    var ARTIFACT_NAMES = ['Eye of Horus', 'Golden Ankh', 'Scarab Amulet', 'Canopic Jar', 'Pharaoh\'s Seal', 'Djed Pillar', 'Wadjet Crown'];
    var ARTIFACT_COLORS = [0x00ccff, 0xffdd00, 0x44ff44, 0xcc8844, 0xff4488, 0x8844ff, 0xff8800];

    // ============ INPUT ============
    document.addEventListener('keydown', function (e) {
        keys[e.code] = true;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isSprinting = true;
        if (e.code === 'KeyF' && gameActive) { flashlightOn = !flashlightOn; HorrorAudio.playClick(); }
        if (e.code === 'Escape' && gameActive) {
            if (codexOpen) { toggleCodex(false); return; }
            if (merchantOpen) { toggleMerchant(false); return; }
            if (inventoryOpen) { toggleInventory(false); return; }
            if (upgradeOpen) { toggleUpgrades(false); return; }
            gameActive = false; GameUtils.pauseGame(); document.exitPointerLock();
        }
        if (e.code === 'KeyE' && gameActive && !codexOpen && !merchantOpen && !inventoryOpen && !upgradeOpen) {
            // Try lighting campfire first, then normal interact
            var litFire = false;
            try { litFire = DesertPhysics.lightCampfire(player.x, player.z); } catch (ex) { }
            if (litFire) { showNotify('🔥 Campfire lit!'); }
            else {
                // Try WorldGen POI interact
                var poiResult = null;
                try { poiResult = WorldGen.interactPOI(player.x, player.z); } catch (ex) { }
                if (poiResult) {
                    showNotify(poiResult.text);
                    if (poiResult.type === 'obelisk') sanityResistMult = Math.max(0.2, sanityResistMult - 0.1);
                    if (poiResult.type === 'dig_site') {
                        try { CombatSystem.addMaterial('flint', 3); CombatSystem.addMaterial('linen', 2); } catch (ex2) { }
                    }
                } else { handleInteract(); }
            }
        }
        if (e.code === 'KeyJ' && gameActive && !merchantOpen && !inventoryOpen && !upgradeOpen) toggleCodex(!codexOpen);
        if (e.code === 'KeyI' && gameActive && !codexOpen && !merchantOpen && !upgradeOpen) toggleInventory(!inventoryOpen);
        if (e.code === 'KeyU' && gameActive && !codexOpen && !merchantOpen && !inventoryOpen) toggleUpgrades(!upgradeOpen);
        if (e.code === 'KeyL' && gameActive) toggleLeaderboard(!leaderboardOpen);
        if (e.code === 'KeyK' && gameActive) toggleCosmetics(!cosmeticsOpen);
        if (e.code === 'KeyC' && gameActive) {
            try { var cl = DesertPhysics.toggleClothing(); showNotify('👘 Switched to ' + cl); } catch (ex) { }
        }
        if (e.code === 'Space' && gameActive) {
            try {
                if (DesertPhysics.isInQuicksand()) {
                    e.preventDefault();
                    var escaped = DesertPhysics.struggle();
                    if (escaped) showNotify('💪 Escaped quicksand!');
                }
            } catch (ex) { }
        }
        if (e.code === 'Space' && StorySystem.isCutscenePlaying()) { e.preventDefault(); StorySystem.skipCutscene(); }
        // Weapon switching 1-5
        var weaponKeys = { 'Digit1': 'khopesh', 'Digit2': 'torch_throw', 'Digit3': 'shield', 'Digit4': 'bow', 'Digit5': 'staff' };
        if (weaponKeys[e.code] && gameActive) { CombatSystem.equipWeapon(weaponKeys[e.code]); }
    });
    document.addEventListener('keyup', function (e) {
        keys[e.code] = false;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isSprinting = false;
    });
    document.addEventListener('mousemove', function (e) {
        if (!gameActive || !document.pointerLockElement) return;
        yaw -= e.movementX * mouseSens;
        pitch -= e.movementY * mouseSens;
        pitch = Math.max(-1.2, Math.min(1.2, pitch));
    });
    document.addEventListener('click', function (e) {
        if (merchantOpen) {
            var item = e.target.closest('.merchant-item');
            if (item && item.dataset.item) {
                var bought = StorySystem.buyItem(item.dataset.item);
                if (bought) {
                    applyMerchantItem(bought);
                    StorySystem.renderMerchant();
                    showNotify('Purchased: ' + bought.name);
                }
            }
            return;
        }
        if (gameActive && renderer && !codexOpen && !inventoryOpen && !upgradeOpen) {
            if (e.button === 0) {
                // Left click: attack
                try { renderer.domElement.requestPointerLock(); } catch (ex) { }
                var allEnemies = mummies.concat(anubisGuards).concat(scarabs);
                var results = CombatSystem.attack(player.x, player.z, yaw, allEnemies);
                if (results) {
                    results.forEach(function (r) {
                        if (r.enemy && r.damage) {
                            r.enemy.hp = (r.enemy.hp || 30) - r.damage;
                            if (r.enemy.hp <= 0) {
                                if (r.enemy.mesh) scene.remove(r.enemy.mesh);
                                CombatSystem.addAnkhTokens(2 + Math.floor(Math.random() * 3));
                                StorySystem.addGold(5 + Math.floor(Math.random() * 10));
                                showNotify('☥ Enemy defeated! +Ankh Tokens');
                            }
                        }
                        // Ammit boss damage
                        if (r.type === 'divine' || r.type === 'melee') {
                            try {
                                if (HorrorDirector.isAmmitNear(player.x, player.z)) {
                                    var killed = HorrorDirector.damageAmmit(r.damage);
                                    if (killed) { CombatSystem.addAnkhTokens(20); showNotify('💀 AMMIT DEFEATED! +20 Ankh Tokens'); }
                                }
                            } catch (e) { }
                        }
                    });
                    HorrorAudio.playHit();
                }
                // Pipe damage to active boss
                try {
                    if (EndgameSystem.isBossActive()) {
                        var allEn2 = mummies.concat(anubisGuards).concat(scarabs);
                        var atkResults = CombatSystem.attack(player.x, player.z, yaw, allEn2);
                        EndgameSystem.damageBoss(15);
                        EndgameSystem.damageBossClone(15, player.x, player.z);
                    }
                } catch (e) { }
            } else if (e.button === 2) {
                // Right click: block/parry
                CombatSystem.startParry();
                CombatSystem.startBlock();
            }
        }
    });
    document.addEventListener('mouseup', function (e) {
        if (e.button === 2) CombatSystem.stopBlock();
    });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // Codex close button
    setTimeout(function () {
        var cc = document.getElementById('codex-close'); if (cc) cc.onclick = function () { toggleCodex(false); };
        var mc = document.getElementById('merchant-close'); if (mc) mc.onclick = function () { toggleMerchant(false); };
        var ic = document.getElementById('inv-close'); if (ic) ic.onclick = function () { toggleInventory(false); };
        var uc = document.getElementById('upg-close'); if (uc) uc.onclick = function () { toggleUpgrades(false); };
        var lbc = document.getElementById('lb-close'); if (lbc) lbc.onclick = function () { toggleLeaderboard(false); };
        var cosc = document.getElementById('cos-close'); if (cosc) cosc.onclick = function () { toggleCosmetics(false); };
        // Mode select
        document.querySelectorAll('.mode-btn[data-mode]').forEach(function (btn) {
            btn.onclick = function () {
                document.querySelectorAll('.mode-btn[data-mode]').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                EndgameSystem.setMode(btn.dataset.mode);
            };
        });
        // Menu leaderboard/cosmetics
        var lbMenu = document.getElementById('btn-leaderboard-menu');
        if (lbMenu) lbMenu.onclick = function () { toggleLeaderboard(true); };
        var cosMenu = document.getElementById('btn-cosmetics-menu');
        if (cosMenu) cosMenu.onclick = function () { toggleCosmetics(true); };
        // NG+ button
        var ngBtn = document.getElementById('btn-ngplus');
        if (ngBtn) ngBtn.onclick = function () { EndgameSystem.enableNGPlus(); restartGame(); };
    }, 100);

    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; clock.getDelta(); gameLoop(); },
        onRestart: restartGame
    });

    // ============ INIT RENDERER ============
    function init() {
        if (initialized) return; initialized = true;
        clock = new THREE.Clock();
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.FogExp2(0xc4a55a, 0.008);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
        renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // ============ MATERIALS ============
    var sandMat, stoneMat, darkStoneMat, waterMat, goldMat, palmTrunkMat, palmLeafMat, obeliskMat;
    function createMaterials() {
        sandMat = new THREE.MeshStandardMaterial({ color: 0xd4a843, roughness: 0.95 });
        stoneMat = new THREE.MeshStandardMaterial({ color: 0xc8b06a, roughness: 0.85 });
        darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x6b5c3e, roughness: 0.9 });
        waterMat = new THREE.MeshStandardMaterial({ color: 0x1a6b8a, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.8 });
        goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.8 });
        palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
        palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x2d6b30, roughness: 0.8 });
        obeliskMat = new THREE.MeshStandardMaterial({ color: 0x888070, roughness: 0.6, metalness: 0.2 });
    }

    // ============ WORLD BUILDING ============
    function buildWorld() {
        createMaterials();
        // Ground
        var ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 32, 32), sandMat);
        ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
        // Add subtle terrain bumps
        var pos = ground.geometry.attributes.position;
        for (var i = 0; i < pos.count; i++) {
            var x = pos.getX(i), y = pos.getY(i);
            pos.setZ(i, (Math.sin(x * 0.05) * Math.cos(y * 0.05) * 2) + (Math.random() * 0.3));
        }
        ground.geometry.computeVertexNormals();
        scene.add(ground);

        // Lighting
        sunLight = new THREE.DirectionalLight(0xfff4e0, 2.0);
        sunLight.position.set(50, 80, 30); sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(2048, 2048);
        sunLight.shadow.camera.left = -60; sunLight.shadow.camera.right = 60;
        sunLight.shadow.camera.top = 60; sunLight.shadow.camera.bottom = -60;
        scene.add(sunLight);

        moonLight = new THREE.DirectionalLight(0x4466aa, 0);
        moonLight.position.set(-40, 50, -20);
        scene.add(moonLight);

        ambientLight = new THREE.AmbientLight(0xffeedd, 0.4);
        scene.add(ambientLight);

        // Player torch
        flashlight = new THREE.SpotLight(0xffcc66, 0, 25, Math.PI / 5, 0.4, 1);
        flashlight.castShadow = true;
        camera.add(flashlight);
        camera.add(flashlight.target);
        flashlight.target.position.set(0, 0, -5);
        scene.add(camera);

        buildPyramids();
        buildNile();
        buildTemple();
        buildObelisks();
        buildSphinx();
        buildPalmTrees();
        buildRuins();
        spawnArtifacts();
        spawnEnemies();
        // Phase 1: Procedural tombs, catacombs, Nile caves
        try { TombSystem.build(scene, pyramidData); } catch (e) { console.warn('TombSystem:', e); }
        // Phase 2: NPCs, quests, lore
        try { StorySystem.build(scene); } catch (e) { console.warn('StorySystem:', e); }
    }

    // ============ PYRAMIDS ============
    function buildPyramids() {
        pyramidData.forEach(function (p) {
            var geo = new THREE.ConeGeometry(p.s, p.h, 4);
            var mesh = new THREE.Mesh(geo, stoneMat.clone());
            mesh.position.set(p.x, p.h / 2, p.z);
            mesh.rotation.y = Math.PI / 4;
            mesh.castShadow = true; mesh.receiveShadow = true;
            scene.add(mesh);
            structures.push({ x: p.x, z: p.z, rx: p.s * 0.7, rz: p.s * 0.7 });

            // Entrance (dark opening) — leads underground
            var entrance = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 1), new THREE.MeshStandardMaterial({ color: 0x111111 }));
            entrance.position.set(p.x, 1.5, p.z + p.s * 0.7);
            scene.add(entrance);
            // Ramp down to tomb level
            var rampMat = new THREE.MeshStandardMaterial({ color: 0x3d2e1a, roughness: 0.95 });
            var ramp = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 8), rampMat);
            ramp.position.set(p.x, -1.5, p.z + p.s * 0.7 - 2);
            ramp.rotation.x = Math.PI * 0.12;
            scene.add(ramp);

            // Sarcophagus inside largest pyramid
            if (p.s > 20) {
                var sarcMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.7 });
                var sarc = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 2.5), sarcMat);
                sarc.position.set(p.x, 0.4, p.z);
                scene.add(sarc);
                var lid = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.15, 2.4), goldMat);
                lid.position.set(p.x, 0.85, p.z);
                scene.add(lid);
            }
        });
    }

    // ============ NILE RIVER ============
    function buildNile() {
        var river = new THREE.Mesh(new THREE.PlaneGeometry(18, WORLD_SIZE * 2), waterMat);
        river.rotation.x = -Math.PI / 2;
        river.position.set(-40, 0.05, 0);
        scene.add(river);

        // Riverbank vegetation
        for (var i = -80; i < 80; i += 8) {
            var reed = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2 + Math.random()), palmLeafMat);
            reed.position.set(-31 + Math.random() * 2, 1, i + Math.random() * 4);
            scene.add(reed);
            var reed2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2 + Math.random()), palmLeafMat);
            reed2.position.set(-49 + Math.random() * 2, 1, i + Math.random() * 4);
            scene.add(reed2);
        }

        // Dock
        var dockMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
        var dock = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 8), dockMat);
        dock.position.set(-32, 0.5, 10); scene.add(dock);
        // Dock posts
        for (var dp = 0; dp < 4; dp++) {
            var post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2), dockMat);
            post.position.set(-30 + (dp % 2) * -4, 0.3, 7 + Math.floor(dp / 2) * 6);
            scene.add(post);
        }
    }

    // ============ TEMPLE COMPLEX ============
    function buildTemple() {
        var tx = -10, tz = 40;
        // Floor
        var floor = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 16), stoneMat);
        floor.position.set(tx, 0.25, tz); floor.receiveShadow = true;
        scene.add(floor);
        structures.push({ x: tx, z: tz, rx: 10, rz: 8 });

        // Columns (3 rows of 4)
        for (var row = 0; row < 3; row++) {
            for (var col = 0; col < 4; col++) {
                var cx = tx - 7.5 + col * 5;
                var cz = tz - 5 + row * 5;
                var column = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 6, 12), stoneMat.clone());
                column.position.set(cx, 3.5, cz); column.castShadow = true;
                scene.add(column);
                // Capital
                var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.5, 0.6, 12), stoneMat.clone());
                cap.position.set(cx, 6.5, cz);
                scene.add(cap);
            }
        }
        // Roof beams
        var roof = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 16), darkStoneMat);
        roof.position.set(tx, 6.8, tz); scene.add(roof);

        // Hieroglyph wall at back
        var wallMat = new THREE.MeshStandardMaterial({ color: 0x9b8b6b, roughness: 0.8 });
        var backWall = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 0.5), wallMat);
        backWall.position.set(tx, 3.5, tz - 8); scene.add(backWall);

        // Altar
        var altar = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 2), new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.7 }));
        altar.position.set(tx, 0.85, tz - 6); scene.add(altar);

        // Fire bowls
        var fireMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.8 });
        [[-15, tz - 7], [-5, tz - 7], [tx + 10, tz + 8], [tx - 10, tz + 8]].forEach(function (fp) {
            var bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.5, 8), darkStoneMat);
            bowl.position.set(fp[0], 1, fp[1]); scene.add(bowl);
            var flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 6), fireMat);
            flame.position.set(fp[0], 1.6, fp[1]); scene.add(flame);
            var fLight = new THREE.PointLight(0xff6600, 0.6, 10);
            fLight.position.set(fp[0], 2, fp[1]); scene.add(fLight);
        });
    }

    // ============ OBELISKS ============
    function buildObelisks() {
        var obeliskPositions = [[15, 15], [-20, -30], [60, 10], [-55, 50], [30, 55]];
        obeliskPositions.forEach(function (op) {
            var body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8, 1.2), obeliskMat);
            body.position.set(op[0], 4, op[1]); body.castShadow = true;
            scene.add(body);
            var tip = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2, 4), goldMat);
            tip.position.set(op[0], 9, op[1]); tip.rotation.y = Math.PI / 4;
            scene.add(tip);
        });
    }

    // ============ SPHINX ============
    function buildSphinx() {
        var sx = 20, sz = 20;
        // Body
        var body = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 12), stoneMat.clone());
        body.position.set(sx, 1.5, sz); body.castShadow = true; scene.add(body);
        // Head
        var head = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 10), stoneMat.clone());
        head.position.set(sx, 4.5, sz + 5); head.castShadow = true; scene.add(head);
        // Headdress
        var hd = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.6, 3), goldMat);
        hd.position.set(sx, 5.2, sz + 5); scene.add(hd);
        // Paws
        var paw1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 5), stoneMat.clone());
        paw1.position.set(sx - 2, 0.5, sz + 7); scene.add(paw1);
        var paw2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 5), stoneMat.clone());
        paw2.position.set(sx + 2, 0.5, sz + 7); scene.add(paw2);
        structures.push({ x: sx, z: sz, rx: 5, rz: 8 });
    }

    // ============ PALM TREES ============
    function buildPalmTrees() {
        var palmPositions = [];
        // Near Nile
        for (var i = 0; i < 20; i++) palmPositions.push([-30 + Math.random() * 4 - 2, -70 + i * 7 + Math.random() * 3]);
        for (var i = 0; i < 20; i++) palmPositions.push([-50 + Math.random() * 4 - 2, -70 + i * 7 + Math.random() * 3]);
        // Oasis
        for (var i = 0; i < 8; i++) palmPositions.push([70 + Math.random() * 10 - 5, 50 + Math.random() * 10 - 5]);

        palmPositions.forEach(function (pp) {
            var h = 5 + Math.random() * 4;
            var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, h, 6), palmTrunkMat);
            trunk.position.set(pp[0], h / 2, pp[1]); trunk.castShadow = true;
            // Slight lean
            trunk.rotation.x = (Math.random() - 0.5) * 0.15;
            trunk.rotation.z = (Math.random() - 0.5) * 0.15;
            scene.add(trunk);
            // Fronds
            for (var f = 0; f < 6; f++) {
                var frond = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3), palmLeafMat);
                frond.position.set(pp[0], h + 0.5, pp[1]);
                var a = (f / 6) * Math.PI * 2;
                frond.rotation.y = a;
                frond.rotation.x = -0.8;
                frond.material = palmLeafMat.clone();
                frond.material.side = THREE.DoubleSide;
                scene.add(frond);
            }
        });
    }

    // ============ RUINS ============
    function buildRuins() {
        // Scattered ruins: broken columns, pottery, crates
        for (var i = 0; i < 30; i++) {
            var rx = (Math.random() - 0.5) * WORLD_SIZE * 1.6;
            var rz = (Math.random() - 0.5) * WORLD_SIZE * 1.6;
            if (Math.abs(rx + 40) < 12) continue; // skip river
            var type = Math.floor(Math.random() * 4);
            if (type === 0) {
                // Broken column
                var h = 1 + Math.random() * 3;
                var col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, h, 8), stoneMat.clone());
                col.position.set(rx, h / 2, rz); col.castShadow = true;
                col.rotation.x = Math.random() * 0.3;
                scene.add(col);
            } else if (type === 1) {
                // Pottery
                var pot = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshStandardMaterial({ color: 0xb8704a, roughness: 0.9 }));
                pot.position.set(rx, 0.3, rz); pot.scale.y = 1.3;
                scene.add(pot);
            } else if (type === 2) {
                // Stone block
                var block = new THREE.Mesh(new THREE.BoxGeometry(1 + Math.random(), 0.6 + Math.random() * 0.5, 1 + Math.random()), darkStoneMat.clone());
                block.position.set(rx, 0.3, rz); block.rotation.y = Math.random() * Math.PI;
                block.castShadow = true;
                scene.add(block);
            } else {
                // Wall fragment
                var wall = new THREE.Mesh(new THREE.BoxGeometry(3, 2 + Math.random() * 2, 0.4), stoneMat.clone());
                wall.position.set(rx, 1.5, rz); wall.rotation.y = Math.random() * Math.PI;
                wall.castShadow = true;
                scene.add(wall);
            }
        }

        // Market stalls near Nile
        for (var ms = 0; ms < 4; ms++) {
            var msx = -25 + ms * 5;
            var msz = 30 + Math.random() * 5;
            // Canopy frame
            var frame = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 3), new THREE.MeshStandardMaterial({ color: 0x993322, roughness: 0.8, side: THREE.DoubleSide }));
            frame.position.set(msx, 2.8, msz); scene.add(frame);
            // Posts
            for (var pc = 0; pc < 4; pc++) {
                var post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8), palmTrunkMat);
                post.position.set(msx + (pc % 2 === 0 ? -1.3 : 1.3), 1.4, msz + (pc < 2 ? -1.3 : 1.3));
                scene.add(post);
            }
        }
    }

    // ============ ARTIFACTS ============
    function spawnArtifacts() {
        artifacts = [];
        var positions = [
            [42, -38], [-10, 35], [-35, 10], [60, -20], [25, 55], [-55, -40], [75, 50]
        ];
        for (var i = 0; i < TOTAL_ARTIFACTS; i++) {
            var mat = new THREE.MeshStandardMaterial({ color: ARTIFACT_COLORS[i], emissive: ARTIFACT_COLORS[i], emissiveIntensity: 0.6, transparent: true, opacity: 0.85 });
            var geo = i % 2 === 0 ? new THREE.OctahedronGeometry(0.5) : new THREE.SphereGeometry(0.45, 8, 8);
            var mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(positions[i][0], 1.5, positions[i][1]);
            mesh.castShadow = true;
            scene.add(mesh);
            var pLight = new THREE.PointLight(ARTIFACT_COLORS[i], 0.5, 8);
            pLight.position.set(positions[i][0], 2, positions[i][1]);
            scene.add(pLight);
            artifacts.push({ mesh: mesh, light: pLight, x: positions[i][0], z: positions[i][1], collected: false, name: ARTIFACT_NAMES[i] });
        }
    }

    // ============ ENEMIES ============
    function spawnEnemies() {
        mummies = []; anubisGuards = []; scarabs = [];
        var diff = GameUtils.getMultiplier();
        var mummyCount = Math.floor(6 * diff);
        var anubisCount = Math.floor(3 * diff);

        // Mummies near pyramids
        for (var i = 0; i < mummyCount; i++) {
            var px = 30 + (Math.random() - 0.5) * 40;
            var pz = -40 + (Math.random() - 0.5) * 30;
            spawnMummy(px, pz);
        }
        // Anubis guards near temple
        for (var i = 0; i < anubisCount; i++) {
            spawnAnubis(-10 + (Math.random() - 0.5) * 20, 40 + (Math.random() - 0.5) * 20);
        }
        // Scarab swarms in dark areas
        for (var i = 0; i < 4; i++) {
            spawnScarabSwarm((Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120);
        }
    }

    function spawnMummy(x, z) {
        var group = new THREE.Group();
        var bodyMat = new THREE.MeshStandardMaterial({ color: 0x8b7d5e, roughness: 0.95 });
        // Body
        group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 1.6, 8), bodyMat));
        // Head
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), bodyMat);
        head.position.y = 1.1; group.add(head);
        // Bandage strips
        var bandageMat = new THREE.MeshStandardMaterial({ color: 0xd4c49a, roughness: 0.9 });
        for (var b = 0; b < 5; b++) {
            var strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.1), bandageMat);
            strip.position.set(0, -0.5 + b * 0.35, 0.3);
            strip.rotation.z = Math.random() * 0.3;
            group.add(strip);
        }
        // Glowing eyes
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x44ff44, emissiveIntensity: 1 });
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat).translateX(-0.1).translateY(1.15).translateZ(0.25));
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat).translateX(0.1).translateY(1.15).translateZ(0.25));
        group.position.set(x, 0.8, z);
        scene.add(group);
        mummies.push({ mesh: group, x: x, z: z, speed: 1.2 + Math.random() * 0.5, state: 'patrol', patrolAngle: Math.random() * Math.PI * 2, alertTimer: 0 });
    }

    function spawnAnubis(x, z) {
        var group = new THREE.Group();
        var bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.6, metalness: 0.4 });
        // Body (tall, lean)
        group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 2, 8), bodyMat));
        // Jackal head
        var headMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.5, metalness: 0.5 });
        var head = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 6), headMat);
        head.position.y = 1.35; head.rotation.x = Math.PI * 0.15; group.add(head);
        // Snout
        var snout = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.4), headMat);
        snout.position.set(0, 1.2, 0.25); group.add(snout);
        // Gold collar
        var collar = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 6, 12), goldMat);
        collar.position.y = 0.8; collar.rotation.x = Math.PI / 2; group.add(collar);
        // Glowing red eyes
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5 });
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat).translateX(-0.1).translateY(1.3).translateZ(0.2));
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat).translateX(0.1).translateY(1.3).translateZ(0.2));
        // Staff
        var staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.5), goldMat);
        staff.position.set(0.4, 0.5, 0); group.add(staff);
        group.position.set(x, 1, z);
        scene.add(group);
        anubisGuards.push({ mesh: group, x: x, z: z, speed: 2.5 + Math.random(), state: 'patrol', patrolAngle: Math.random() * Math.PI * 2, alertTimer: 0 });
    }

    function spawnScarabSwarm(x, z) {
        var group = new THREE.Group();
        var scarabMat = new THREE.MeshStandardMaterial({ color: 0x004422, roughness: 0.5, metalness: 0.6, emissive: 0x002211, emissiveIntensity: 0.3 });
        for (var s = 0; s < 15; s++) {
            var bug = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), scarabMat);
            bug.position.set((Math.random() - 0.5) * 2, 0.1 + Math.random() * 0.3, (Math.random() - 0.5) * 2);
            group.add(bug);
        }
        group.position.set(x, 0, z);
        scene.add(group);
        scarabs.push({ mesh: group, x: x, z: z, speed: 3, state: 'idle' });
    }

    // ============ GAME FLOW ============
    function startGame() {
        if (!GameUtils.checkWebGL()) return;
        init();
        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        HorrorAudio.startDrone(40, 'dark');
        HorrorAudio.startWind();
        setTimeout(function () {
            ctrl.classList.add('hiding');
            setTimeout(function () {
                ctrl.style.display = 'none'; ctrl.classList.remove('hiding');
                resetState();
                gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                try { renderer.domElement.requestPointerLock(); } catch (e) { }
                gameLoop();
            }, 800);
        }, 2500);
    }

    function resetState() {
        while (scene.children.length > 0) scene.remove(scene.children[0]);
        mummies = []; anubisGuards = []; scarabs = []; artifacts = []; structures = [];
        gameMinute = 360; sanity = 100; battery = 100; artifactsCollected = 0;
        batteryDrainMult = 1; sanityResistMult = 1; extraLives = 0;
        player.x = 0; player.y = 1.7; player.z = 0;
        yaw = 0; pitch = 0; isSprinting = false; flashlightOn = false;
        sandstormActive = false; sandstormTimer = 0; sandstormCooldown = 120;
        jumpScareTimer = 0; codexOpen = false; merchantOpen = false; inventoryOpen = false; upgradeOpen = false;
        try { TombSystem.reset(); } catch (e) { }
        try { StorySystem.reset(); } catch (e) { }
        try { CombatSystem.reset(); } catch (e) { }
        try { HorrorDirector.reset(); } catch (e) { }
        try { EndgameSystem.reset(); } catch (e) { }
        try { BiomeSystem.reset(); } catch (e) { }
        try { DesertPhysics.reset(); } catch (e) { }
        try { WorldGen.reset(); } catch (e) { }
        try { RPGSystem.reset(); } catch (e) { }
        try { EnemyEcosystem.reset(); } catch (e) { }
        try { VisualEngine.reset(); } catch (e) { }
        try { AudioEngine.reset(); } catch (e) { }
        try { MetaProgression.reset(); } catch (e) { }
        buildWorld();
        try { CombatSystem.build(scene, camera); } catch (e) { console.warn('CombatSystem:', e); }
        try { HorrorDirector.build(scene); } catch (e) { console.warn('HorrorDirector:', e); }
        try { EndgameSystem.build(scene); } catch (e) { console.warn('EndgameSystem:', e); }
        try { BiomeSystem.build(scene); } catch (e) { console.warn('BiomeSystem:', e); }
        try { DesertPhysics.build(scene); } catch (e) { console.warn('DesertPhysics:', e); }
        try { WorldGen.build(scene); } catch (e) { console.warn('WorldGen:', e); }
        // Merge biome collision structures
        try { structures = structures.concat(BiomeSystem.getStructures()); } catch (e) { }
        try { structures = structures.concat(WorldGen.getStructures()); } catch (e) { }
        // Phase 8-12 builds
        try { EnemyEcosystem.build(scene); } catch (e) { console.warn('EnemyEcosystem:', e); }
        try { VisualEngine.build(scene, camera, renderer); } catch (e) { console.warn('VisualEngine:', e); }
        try { AudioEngine.init(); AudioEngine.startAmbientWind(); } catch (e) { console.warn('AudioEngine:', e); }
        try { MetaProgression.checkEvent(); } catch (e) { }
        // Unlock starter weapon
        try { CombatSystem.unlockWeapon('khopesh'); CombatSystem.equipWeapon('khopesh'); } catch (e) { }
        // NG+ modifiers
        try {
            if (EndgameSystem.isNGPlus()) {
                mummies.forEach(function (m) { m.speed *= 2; m.hp = (m.hp || 30) * 2; });
                anubisGuards.forEach(function (g) { g.speed *= 2; g.hp = (g.hp || 30) * 2; });
            }
        } catch (e) { }
        // Start mode
        try {
            var mode = EndgameSystem.getMode();
            if (mode === 'survival') {
                EndgameSystem.startSurvival();
                var survHud = document.getElementById('survival-hud'); if (survHud) survHud.style.display = 'block';
            } else if (mode === 'daily') {
                EndgameSystem.startDaily();
                EndgameSystem.renderDailyInfo();
                var dailyEl = document.getElementById('daily-mods'); if (dailyEl) dailyEl.style.display = 'block';
                // Apply daily modifier effects
                var mods = EndgameSystem.getDailyModifiers();
                mods.forEach(function (m) {
                    if (m.id === 'low_sanity') sanity = 30;
                    if (m.id === 'double_enemies') {
                        for (var ei = 0; ei < 5; ei++) { spawnMummy((Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160); }
                    }
                    if (m.id === 'fog' && scene.fog) scene.fog.density = 0.04;
                });
            }
        } catch (e) { }
        try { if (typeof QualityEnhancer !== 'undefined') QualityEnhancer.enhance(renderer, scene, camera); } catch (e) { console.warn('QualityEnhancer:', e); }
        // Play intro cutscene on first play
        try { StorySystem.playCutscene('intro'); StorySystem.autoStartQuests(); } catch (e) { }
    }

    function restartGame() {
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        HorrorAudio.startDrone(40, 'dark'); HorrorAudio.startWind();
        resetState();
        gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
        try { renderer.domElement.requestPointerLock(); } catch (e) { }
        gameLoop();
    }

    function gameOver() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.GAME_OVER);
        document.exitPointerLock();
        HorrorAudio.playDeath(); HorrorAudio.stopDrone(); HorrorAudio.stopWind();
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        // End survival
        try { if (EndgameSystem.isSurvival()) EndgameSystem.endSurvival(); } catch (e) { }
        // Hide phase 5 HUD
        var survHud = document.getElementById('survival-hud'); if (survHud) survHud.style.display = 'none';
        var dailyMods = document.getElementById('daily-mods'); if (dailyMods) dailyMods.style.display = 'none';
        var bossBar = document.getElementById('boss-bar'); if (bossBar) bossBar.style.display = 'none';
        var btn = document.querySelector('#game-over-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function gameWin() {
        // Play ending cutscene based on player choices
        try {
            var ending = StorySystem.playEndingCutscene();
            var title = document.getElementById('win-title');
            var desc = document.getElementById('win-desc');
            if (ending === 'ending_dark') {
                if (title) title.textContent = 'ETERNAL DARKNESS';
                if (desc) desc.textContent = 'You embraced the darkness. The curse spreads across Egypt forever.';
            } else if (ending === 'ending_pharaoh') {
                if (title) title.textContent = 'THE NEW PHARAOH';
                if (desc) desc.textContent = 'You claimed the throne. The curse is your power now.';
            } else {
                if (title) title.textContent = 'THE CURSE IS BROKEN';
                if (desc) desc.textContent = 'You gathered all sacred artifacts and freed the ancient souls.';
            }
        } catch (e) { }
        gameActive = false; GameUtils.setState(GameUtils.STATE.WIN);
        document.exitPointerLock();
        HorrorAudio.playWin(); HorrorAudio.stopDrone(); HorrorAudio.stopWind();
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var survHud2 = document.getElementById('survival-hud'); if (survHud2) survHud2.style.display = 'none';
        var dailyMods2 = document.getElementById('daily-mods'); if (dailyMods2) dailyMods2.style.display = 'none';
        var bossBar2 = document.getElementById('boss-bar'); if (bossBar2) bossBar2.style.display = 'none';
        var btn = document.querySelector('#game-win-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    // ============ DAY/NIGHT CYCLE ============
    function updateDayNight(dt) {
        gameMinute += dt * TIME_SPEED;
        if (gameMinute >= 1440) gameMinute -= 1440; // wrap at midnight

        var t = gameMinute / 1440; // 0..1 through full day
        var sunAngle = (t - 0.25) * Math.PI * 2; // sunrise at 6AM = 0.25

        // Sun position
        var sunY = Math.sin(sunAngle) * 80;
        currentSunY = sunY; // expose for combat staff recharge
        var sunX = Math.cos(sunAngle) * 60;
        if (sunLight) {
            sunLight.position.set(sunX, Math.max(sunY, -10), 30);
            // Sun intensity and color based on elevation
            if (sunY > 0) {
                var elevation = sunY / 80;
                sunLight.intensity = 0.5 + elevation * 2.0;
                // Color: warm at horizon, white at zenith
                var warmth = 1 - elevation;
                sunLight.color.setRGB(1, 0.85 + warmth * 0.15, 0.7 + elevation * 0.3);
            } else {
                sunLight.intensity = 0;
            }
        }

        // Moon (opposite of sun)
        if (moonLight) {
            moonLight.position.set(-sunX, Math.max(-sunY, -10), -20);
            moonLight.intensity = sunY < 0 ? Math.min(0.3, -sunY / 80 * 0.3) : 0;
        }

        // Sky color
        var skyR, skyG, skyB, fogR, fogG, fogB;
        var hour = gameMinute / 60;

        if (hour >= 5 && hour < 7) { // Dawn
            var p = (hour - 5) / 2;
            skyR = 0.15 + p * 0.6; skyG = 0.08 + p * 0.35; skyB = 0.2 + p * 0.3;
            fogR = 0.5 + p * 0.3; fogG = 0.3 + p * 0.2; fogB = 0.2 + p * 0.1;
        } else if (hour >= 7 && hour < 17) { // Day
            skyR = 0.53; skyG = 0.81; skyB = 0.92;
            fogR = 0.77; fogG = 0.65; fogB = 0.45;
            // Intense noon (11-14)
            if (hour >= 11 && hour < 14) {
                var noon = 1 - Math.abs(hour - 12.5) / 1.5;
                skyR += noon * 0.15; skyG += noon * 0.05;
                if (renderer) renderer.toneMappingExposure = 1.2 + noon * 0.4;
            } else {
                if (renderer) renderer.toneMappingExposure = 1.2;
            }
        } else if (hour >= 17 && hour < 19.5) { // Sunset
            var p = (hour - 17) / 2.5;
            skyR = 0.7 - p * 0.55; skyG = 0.4 - p * 0.35; skyB = 0.3 - p * 0.25;
            fogR = 0.6 - p * 0.5; fogG = 0.3 - p * 0.25; fogB = 0.2 - p * 0.15;
            // Blood red sunset
            if (p > 0.3 && p < 0.8) {
                skyR = Math.max(skyR, 0.6); skyG *= 0.5;
            }
        } else { // Night
            skyR = 0.02; skyG = 0.02; skyB = 0.08;
            fogR = 0.03; fogG = 0.03; fogB = 0.06;
            if (renderer) renderer.toneMappingExposure = 0.4;
        }

        if (scene.background) scene.background.setRGB(skyR, skyG, skyB);
        if (scene.fog) scene.fog.color.setRGB(fogR, fogG, fogB);

        // Ambient light tracks time of day
        if (ambientLight) {
            var dayness = sunY > 0 ? sunY / 80 : 0;
            ambientLight.intensity = 0.05 + dayness * 0.5;
            ambientLight.color.setRGB(0.9 + dayness * 0.1, 0.85 + dayness * 0.1, 0.7 + dayness * 0.2);
        }

        // Stars at night
        // (Handled via fog density increase)
        if (scene.fog) {
            var nightFog = sunY < 0 ? 0.015 : 0.008;
            scene.fog.density += (nightFog - scene.fog.density) * dt * 2;
        }
    }

    // ============ PHASE 1/2 HELPERS ============
    function handleInteract() {
        // Phase 2: NPC interaction
        try {
            var result = StorySystem.interact(artifactsCollected, TOTAL_ARTIFACTS, sanity);
            if (result) {
                if (result.action === 'open_merchant') { toggleMerchant(true); return; }
                if (result.action === 'hint') { showNotify(result.message); return; }
                if (result.action === 'codex_unlock') {
                    showNotify('📜 Codex Updated: ' + result.entry.title);
                    StorySystem.progressQuest('q_hieroglyph1', 0); // trigger re-check
                    return;
                }
                if (result.action === 'cutscene') return;
            }
        } catch (e) { }
        // Phase 1: Tomb interactions (torches, treasure)
        try {
            var tombResult = TombSystem.update(0, player.x, player.z, player.y);
            if (tombResult) {
                if (tombResult.type === 'torch_nearby') {
                    TombSystem.lightTorch(tombResult.index);
                    StorySystem.progressQuest('q_torch', 1);
                    showNotify('🔥 Torch lit!');
                } else if (tombResult.type === 'treasure_nearby') {
                    var gold = TombSystem.collectTreasure(tombResult.index);
                    if (gold > 0) {
                        StorySystem.addGold(gold);
                        showNotify('💰 Found ' + gold + ' gold!');
                        HorrorAudio.playCollect();
                    }
                }
            }
        } catch (e) { }
    }

    function toggleCodex(open) {
        codexOpen = open;
        var el = document.getElementById('codex-overlay');
        if (el) el.style.display = open ? 'block' : 'none';
        if (open) {
            try { StorySystem.renderCodex(); } catch (e) { }
            document.exitPointerLock();
        }
    }

    function toggleMerchant(open) {
        merchantOpen = open;
        var el = document.getElementById('merchant-overlay');
        if (el) el.style.display = open ? 'block' : 'none';
        if (open) {
            try { StorySystem.renderMerchant(); } catch (e) { }
            document.exitPointerLock();
        }
    }

    function applyMerchantItem(item) {
        if (item.effect === 'sanity') sanity = Math.min(maxSanity, sanity + item.value);
        if (item.effect === 'battery_upgrade') batteryDrainMult *= item.value;
        if (item.effect === 'sanity_resist') sanityResistMult -= item.value;
        if (item.effect === 'extra_life') extraLives += item.value;
        if (item.effect === 'scarab_ward') {
            scarabs.forEach(function (s) { s.state = 'idle'; });
            showNotify('🕯️ Scarabs repelled for 60 seconds');
        }
    }

    function showNotify(text) {
        notifyText = text; notifyTimer = 3;
        var el = document.getElementById('notify-toast');
        if (el) { el.textContent = text; el.style.display = 'block'; el.style.opacity = '1'; }
    }

    // ============ MAIN UPDATE ============
    function update(dt) {
        // Cutscene blocks gameplay
        if (StorySystem.isCutscenePlaying()) return;
        if (codexOpen || merchantOpen || inventoryOpen || upgradeOpen) return;

        updateDayNight(dt);

        // Notification fade
        if (notifyTimer > 0) {
            notifyTimer -= dt;
            if (notifyTimer <= 0) {
                var nel = document.getElementById('notify-toast');
                if (nel) { nel.style.opacity = '0'; setTimeout(function () { nel.style.display = 'none'; }, 500); }
            }
        }

        // Determine if nighttime
        var hour = gameMinute / 60;
        var isNight = hour < 5 || hour >= 20;

        // ---- Movement ----
        var upgEffects = {};
        try { upgEffects = CombatSystem.getUpgradeEffects(); } catch (e) { upgEffects = { sprintMult: 1, torchMult: 1, sanityMult: 1 }; }
        var baseSprintSpeed = SPRINT_SPEED * (upgEffects.sprintMult || 1);
        var speed = (isSprinting ? baseSprintSpeed : WALK_SPEED) * dt;
        // Phase 6: Apply desert physics speed modifier
        try {
            var dpMod = 1;
            if (DesertPhysics.isInQuicksand()) dpMod *= 0.3;
            if (DesertPhysics.isSwimming()) dpMod *= 0.5;
            speed *= dpMod;
        } catch (ex) { }
        var moveX = 0, moveZ = 0;
        if (keys['KeyW']) moveZ += 1;
        if (keys['KeyS']) moveZ -= 1;
        if (keys['KeyA']) moveX -= 1;
        if (keys['KeyD']) moveX += 1;
        var isMoving = moveX !== 0 || moveZ !== 0;
        if (isMoving) {
            var len = Math.sqrt(moveX * moveX + moveZ * moveZ);
            moveX /= len; moveZ /= len;
            var forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
            var right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
            var newX = player.x + (forward.x * moveZ + right.x * moveX) * speed;
            var newZ = player.z + (forward.z * moveZ + right.z * moveX) * speed;
            // Collision check
            var blocked = false;
            for (var si = 0; si < structures.length; si++) {
                var s = structures[si];
                if (Math.abs(newX - s.x) < s.rx && Math.abs(newZ - s.z) < s.rz) { blocked = true; break; }
            }
            // River check (unless at cave entry)
            if (newX > -49 && newX < -31 && !blocked) {
                // Allow entry near cave entrance at z=-20
                if (!(Math.abs(newZ - (-20)) < 3)) blocked = true;
            }
            if (!blocked) {
                player.x = Math.max(-WORLD_SIZE + 2, Math.min(WORLD_SIZE - 2, newX));
                player.z = Math.max(-WORLD_SIZE + 2, Math.min(WORLD_SIZE - 2, newZ));
            }
        }
        // Phase 6: Apply water current push
        try {
            if (DesertPhysics.isSwimming()) {
                var wInfo = DesertPhysics.getWindInfo();
                player.y = Math.max(0.5, player.y); // float on surface
            }
        } catch (ex) { }

        // ---- Flashlight / Battery ----
        if (flashlight) flashlight.intensity = flashlightOn ? 2.0 : 0;
        if (flashlightOn) {
            battery -= dt * 1.5 * batteryDrainMult;
            if (battery <= 0) { battery = 0; flashlightOn = false; }
        } else {
            battery = Math.min(100, battery + dt * 0.5);
        }

        // ---- Sanity ----
        var sanityDrain = 0;
        if (isNight) sanityDrain += 1.5 * dt;
        if (sandstormActive) sanityDrain += 2 * dt;
        var nearestEnemy = 9999;
        mummies.concat(anubisGuards).forEach(function (e) {
            var d = Math.sqrt((player.x - e.x) * (player.x - e.x) + (player.z - e.z) * (player.z - e.z));
            if (d < nearestEnemy) nearestEnemy = d;
        });
        if (nearestEnemy < 10) sanityDrain += (1 - nearestEnemy / 10) * 4 * dt;
        // Underground increases drain
        if (TombSystem.isUnderground(player.y)) sanityDrain += 1 * dt;

        sanity = Math.max(0, Math.min(maxSanity, sanity - sanityDrain * Math.max(0.1, sanityResistMult)));
        if (sanity <= 0) {
            if (extraLives > 0) { extraLives--; sanity = 30; showNotify('🩹 Sacred Bandage saved you!'); }
            else { gameOver(); return; }
        }

        // Sanity vignette effect
        var vig = document.getElementById('sanity-vignette');
        if (vig) vig.style.opacity = Math.max(0, 1 - sanity / 40);

        // ---- Sandstorm ----
        sandstormCooldown -= dt;
        if (!sandstormActive && sandstormCooldown <= 0) {
            sandstormActive = true;
            sandstormTimer = 15 + Math.random() * 10;
            HorrorAudio.startWind(1.5);
        }
        if (sandstormActive) {
            sandstormTimer -= dt;
            if (sandstormTimer <= 0) {
                sandstormActive = false;
                sandstormCooldown = 60 + Math.random() * 60;
                HorrorAudio.startWind(0.5);
            }
            if (scene.fog) scene.fog.density = 0.03 + Math.sin(gameMinute * 0.5) * 0.01;
        }
        var sandOverlay = document.getElementById('sandstorm-overlay');
        if (sandOverlay) sandOverlay.style.opacity = sandstormActive ? '0.6' : '0';

        // ---- Artifacts ----
        for (var ai = 0; ai < artifacts.length; ai++) {
            var a = artifacts[ai];
            if (a.collected) continue;
            // Float animation
            a.mesh.position.y = 1.5 + Math.sin(gameMinute * 3 + ai) * 0.3;
            a.mesh.rotation.y += dt * 1.5;
            var dx = player.x - a.x, dz = player.z - a.z;
            if (Math.sqrt(dx * dx + dz * dz) < 2.5) {
                a.collected = true; artifactsCollected++;
                scene.remove(a.mesh); scene.remove(a.light);
                HorrorAudio.playCollect();
                if (artifactsCollected >= TOTAL_ARTIFACTS) { gameWin(); return; }
            }
        }

        // ---- Enemies AI ----
        var playerDetect = isMoving ? (isSprinting ? 18 : 12) : 6;
        if (flashlightOn) playerDetect += 5;
        if (isNight) playerDetect -= 3;

        // Mummies
        for (var mi = 0; mi < mummies.length; mi++) {
            var m = mummies[mi];
            var mdx = player.x - m.x, mdz = player.z - m.z;
            var mdist = Math.sqrt(mdx * mdx + mdz * mdz);
            if (mdist < playerDetect && m.state !== 'chase') {
                m.state = 'chase'; m.alertTimer = 8;
                HorrorAudio.playJumpScare();
            }
            if (m.state === 'chase') {
                m.alertTimer -= dt;
                var chaseSpeed = m.speed * (isNight ? 1.5 : 1) * dt;
                m.x += (mdx / mdist) * chaseSpeed;
                m.z += (mdz / mdist) * chaseSpeed;
                if (m.alertTimer <= 0) m.state = 'patrol';
                if (mdist < 1.5) { gameOver(); return; }
            } else {
                m.patrolAngle += dt * 0.2;
                m.x += Math.cos(m.patrolAngle) * m.speed * 0.2 * dt;
                m.z += Math.sin(m.patrolAngle) * m.speed * 0.2 * dt;
                m.x = Math.max(-WORLD_SIZE + 5, Math.min(WORLD_SIZE - 5, m.x));
                m.z = Math.max(-WORLD_SIZE + 5, Math.min(WORLD_SIZE - 5, m.z));
            }
            m.mesh.position.set(m.x, 0.8, m.z);
            m.mesh.lookAt(player.x, 0.8, player.z);
        }

        // Anubis guards (faster, more aggressive)
        for (var gi = 0; gi < anubisGuards.length; gi++) {
            var g = anubisGuards[gi];
            var gdx = player.x - g.x, gdz = player.z - g.z;
            var gdist = Math.sqrt(gdx * gdx + gdz * gdz);
            if (gdist < playerDetect * 0.8 && g.state !== 'chase') {
                g.state = 'chase'; g.alertTimer = 10;
                HorrorAudio.playJumpScare();
            }
            if (g.state === 'chase') {
                g.alertTimer -= dt;
                var gs = g.speed * (isNight ? 1.3 : 1) * dt;
                g.x += (gdx / gdist) * gs;
                g.z += (gdz / gdist) * gs;
                if (g.alertTimer <= 0) g.state = 'patrol';
                if (gdist < 1.5) { gameOver(); return; }
            } else {
                g.patrolAngle += dt * 0.15;
                g.x += Math.cos(g.patrolAngle) * g.speed * 0.15 * dt;
                g.z += Math.sin(g.patrolAngle) * g.speed * 0.15 * dt;
            }
            g.mesh.position.set(g.x, 1, g.z);
            g.mesh.lookAt(player.x, 1, player.z);
            // Hover effect
            g.mesh.position.y = 1 + Math.sin(gameMinute * 2 + gi * 2) * 0.1;
        }

        // Scarabs (chase if player near and it's dark)
        for (var si = 0; si < scarabs.length; si++) {
            var sc = scarabs[si];
            var sdx = player.x - sc.x, sdz = player.z - sc.z;
            var sdist = Math.sqrt(sdx * sdx + sdz * sdz);
            if (sdist < 8 && (isNight || !flashlightOn)) {
                sc.state = 'chase';
            } else if (sdist > 15) {
                sc.state = 'idle';
            }
            if (sc.state === 'chase') {
                var ss = sc.speed * dt;
                sc.x += (sdx / sdist) * ss;
                sc.z += (sdz / sdist) * ss;
                if (sdist < 1.5) { sanity -= 15; sc.state = 'idle'; HorrorAudio.playHit(); }
            }
            sc.mesh.position.set(sc.x, 0, sc.z);
            // Animate individual scarabs
            sc.mesh.children.forEach(function (bug, bi) {
                bug.position.x += (Math.random() - 0.5) * 0.05;
                bug.position.z += (Math.random() - 0.5) * 0.05;
            });
        }

        // ---- Jump scare timer ----
        jumpScareTimer -= dt;
        if (jumpScareTimer <= 0 && isNight && Math.random() < 0.002) {
            HorrorAudio.playJumpScare();
            jumpScareTimer = 30 + Math.random() * 60;
        }

        // ---- Phase 1: Tomb system update ----
        try {
            var tombEvent = TombSystem.update(dt, player.x, player.z, player.y);
            if (tombEvent) {
                if (tombEvent.type === 'trap') {
                    sanity -= tombEvent.damage;
                    showNotify('⚠️ ' + tombEvent.name + '!');
                    HorrorAudio.playHit();
                    var tw = document.getElementById('trap-warning');
                    if (tw) { tw.style.display = 'block'; setTimeout(function () { tw.style.display = 'none'; }, 1500); }
                } else if (tombEvent.type === 'enemy') {
                    if (extraLives > 0) { extraLives--; sanity -= 15; showNotify('🩹 Sacred Bandage saved you!'); }
                    else { gameOver(); return; }
                } else if (tombEvent.type === 'torch_nearby') {
                    var prompt = document.getElementById('interact-prompt');
                    if (prompt) { prompt.textContent = 'Press E to light torch'; prompt.style.display = 'block'; }
                } else if (tombEvent.type === 'treasure_nearby') {
                    var prompt = document.getElementById('interact-prompt');
                    if (prompt) { prompt.textContent = 'Press E to collect treasure'; prompt.style.display = 'block'; }
                }
            }
        } catch (e) { }

        // ---- Phase 2: Story system update ----
        try {
            var storyTarget = StorySystem.update(dt, player.x, player.z, gameMinute, artifactsCollected, TOTAL_ARTIFACTS);
            var promptEl = document.getElementById('interact-prompt');
            if (storyTarget && promptEl) {
                promptEl.textContent = storyTarget.prompt;
                promptEl.style.display = 'block';
            } else if (promptEl && !tombEvent) {
                promptEl.style.display = 'none';
            }
        } catch (e) { }

        // ---- Track underground state for quest progress ----
        try {
            if (TombSystem.isUnderground(player.y)) {
                StorySystem.progressQuest('q_tomb1', dt * 0.5);
                StorySystem.progressQuest('q_caves', dt * 0.3);
            }
        } catch (e) { }

        // ---- Phase 3: Combat system update ----
        var allEnemies = mummies.concat(anubisGuards).concat(scarabs);
        try {
            var combatResults = CombatSystem.update(dt, player.x, player.z, player.y, currentSunY, isNight, allEnemies);
            if (combatResults && combatResults.length > 0) {
                combatResults.forEach(function (r) {
                    if (r.type === 'material') {
                        showNotify('📦 Found: ' + (CombatSystem.getMaterialDefs()[r.matType] || {}).name);
                    }
                    if (r.enemy && r.damage) {
                        r.enemy.hp = (r.enemy.hp || 30) - r.damage;
                        if (r.enemy.hp <= 0) {
                            if (r.enemy.mesh) scene.remove(r.enemy.mesh);
                            CombatSystem.addAnkhTokens(1);
                        }
                    }
                });
            }
        } catch (e) { }
        // Remove dead enemies
        var deadMummies = mummies.filter(function (m) { return (m.hp || 30) <= 0; }).length;
        var deadAnubis = anubisGuards.filter(function (g) { return (g.hp || 30) <= 0; }).length;
        var deadScarabs = scarabs.filter(function (s) { return (s.hp || 30) <= 0; }).length;
        var totalKilled = deadMummies + deadAnubis + deadScarabs;
        mummies = mummies.filter(function (m) { return (m.hp || 30) > 0; });
        anubisGuards = anubisGuards.filter(function (g) { return (g.hp || 30) > 0; });
        scarabs = scarabs.filter(function (s) { return (s.hp || 30) > 0; });
        // Track survival kills
        if (totalKilled > 0) {
            try { for (var ki = 0; ki < totalKilled; ki++) EndgameSystem.survivalKill(); } catch (e) { }
        }

        // ---- Phase 4: Horror Director update ----
        try {
            var horrorResult = HorrorDirector.update(dt, player.x, player.z, player.y, gameMinute, sanity, isNight, allEnemies, currentSunY);
            if (horrorResult) {
                // Apply sanity modifier
                if (horrorResult.sanityModifier && horrorResult.sanityModifier > 1) {
                    sanity -= (horrorResult.sanityModifier - 1) * 2 * dt;
                }
                // Eclipse overlay
                var eclipseOl = document.getElementById('eclipse-overlay');
                if (eclipseOl) eclipseOl.style.opacity = horrorResult.eclipseDarkness || 0;
                // Eclipse darkens fog
                if (horrorResult.eclipseActive && scene.fog) {
                    scene.fog.density = Math.max(scene.fog.density, 0.025);
                }
                // Weather fog
                if (horrorResult.weather) {
                    if (horrorResult.weather.type === 'sandstorm' && scene.fog) {
                        scene.fog.density = Math.max(scene.fog.density, 0.03);
                    }
                    // Weather HUD
                    var wEl = document.getElementById('hud-weather');
                    if (wEl) {
                        if (horrorResult.weather.type === 'sandstorm') wEl.textContent = '🌪️ Sandstorm';
                        else if (horrorResult.weather.type === 'rain') wEl.textContent = '🌧️ Rain';
                        else if (horrorResult.weather.type === 'eclipse') wEl.textContent = '🌑 Eclipse!';
                        else wEl.textContent = '';
                    }
                }
                // Face flash
                var horrorEvents = HorrorDirector.getActiveEvents();
                var faceFlashEl = document.getElementById('face-flash');
                var showFace = false;
                horrorEvents.forEach(function (ev) {
                    if (ev.type === 'shake') {
                        camera.rotation.z += (Math.random() - 0.5) * ev.intensity;
                    }
                    if (ev.type === 'flicker' && flashlight) {
                        flashlight.intensity *= (Math.random() > 0.3 ? 1 : 0);
                    }
                    if (ev.type === 'face_flash') showFace = true;
                });
                if (faceFlashEl) faceFlashEl.style.display = showFace ? 'block' : 'none';
                // Quicksand slows player
                if (horrorResult.quicksand && horrorResult.quicksand.trapped) {
                    player.y = Math.max(0.5, player.y - horrorResult.quicksand.sinkSpeed * dt);
                    sanity -= 2 * dt;
                } else if (player.y < 1.7 && !TombSystem.isUnderground(player.y)) {
                    player.y = Math.min(1.7, player.y + dt * 2);
                }
                // Stress bar
                var stressFill = document.getElementById('stress-fill');
                if (stressFill) stressFill.style.height = HorrorDirector.getStress() + '%';
                // Ammit boss proximity damage
                if (HorrorDirector.isAmmitNear(player.x, player.z)) {
                    if (CombatSystem.checkParry()) {
                        showNotify('⚔️ Parried Ammit!');
                    } else if (CombatSystem.checkBlock()) {
                        sanity -= 5 * dt;
                    } else {
                        sanity -= 15 * dt;
                    }
                }
            }
        } catch (e) { }

        // ---- Phase 5: Endgame / Boss / Survival / Biome update ----
        try {
            // Boss trigger check
            var bossTrigger = EndgameSystem.checkBossTriggers(player.x, player.z, player.y);
            if (bossTrigger) {
                showNotify('⚔️ ' + bossTrigger.name + ' awakens!');
                var bossBarEl = document.getElementById('boss-bar'); if (bossBarEl) bossBarEl.style.display = 'block';
            }
            // Boss update
            if (EndgameSystem.isBossActive()) {
                var bossResult = EndgameSystem.updateBoss(dt, player.x, player.z, player.y);
                if (bossResult) {
                    if (bossResult.damage > 0) {
                        if (CombatSystem.checkParry()) {
                            showNotify('⚔️ Parried!');
                        } else if (CombatSystem.checkBlock()) {
                            sanity -= bossResult.damage * 0.3 * dt;
                        } else {
                            sanity -= bossResult.damage;
                        }
                    }
                    if (bossResult.sanityDrain) sanity -= bossResult.sanityDrain;
                    if (bossResult.text) showNotify(bossResult.text);
                    if (bossResult.defeated) {
                        CombatSystem.addAnkhTokens(25);
                        showNotify('🏆 +25 Ankh Tokens!');
                        var bossBarEl2 = document.getElementById('boss-bar'); if (bossBarEl2) bossBarEl2.style.display = 'none';
                        // Unlock weapons from bosses
                        if (bossTrigger && bossTrigger.id === 'pharaoh') CombatSystem.unlockWeapon('torch_throw');
                        if (bossTrigger && bossTrigger.id === 'anubis') CombatSystem.unlockWeapon('shield');
                        if (bossTrigger && bossTrigger.id === 'apophis') CombatSystem.unlockWeapon('staff');
                    }
                    // Summon minions
                    if (bossResult.summon) {
                        for (var bsi = 0; bsi < bossResult.summon.count; bsi++) {
                            var sa = Math.random() * Math.PI * 2;
                            var sd = 8 + Math.random() * 8;
                            spawnMummy(player.x + Math.cos(sa) * sd, player.z + Math.sin(sa) * sd);
                        }
                    }
                }
                // Update boss HP bar
                var bInfo = EndgameSystem.getBossHP();
                if (bInfo) {
                    var bnEl = document.getElementById('boss-name'); if (bnEl) bnEl.textContent = bInfo.name;
                    var bfEl = document.getElementById('boss-hp-fill'); if (bfEl) bfEl.style.width = Math.max(0, (bInfo.hp / bInfo.max) * 100) + '%';
                    var bpEl = document.getElementById('boss-phase'); if (bpEl) bpEl.textContent = 'Phase ' + bInfo.phase;
                }
            }
            // Survival wave spawning
            var survResult = EndgameSystem.updateSurvival(dt);
            if (survResult && survResult.type === 'wave') {
                showNotify('🏰 Wave ' + survResult.wave + '!');
                var dailyMods = EndgameSystem.getDailyModifiers();
                var fastMod = dailyMods.some(function (m) { return m.id === 'fast_enemies'; });
                for (var smi = 0; smi < survResult.mummies; smi++) {
                    var smx = (Math.random() - 0.5) * 80, smz = (Math.random() - 0.5) * 80;
                    spawnMummy(smx, smz);
                    if (fastMod) mummies[mummies.length - 1].speed *= 1.5;
                }
                for (var sai = 0; sai < survResult.anubis; sai++) {
                    var sax = (Math.random() - 0.5) * 60, saz = (Math.random() - 0.5) * 60;
                    spawnAnubis(sax, saz);
                    if (fastMod) anubisGuards[anubisGuards.length - 1].speed *= 1.5;
                }
            }
            // Survival HUD
            if (EndgameSystem.isSurvival()) {
                var sInfo = EndgameSystem.getSurvivalInfo();
                var swEl = document.getElementById('surv-wave'); if (swEl) swEl.textContent = 'Wave: ' + sInfo.wave;
                var skEl = document.getElementById('surv-kills'); if (skEl) skEl.textContent = 'Kills: ' + sInfo.kills;
                var stEl = document.getElementById('surv-time'); if (stEl) stEl.textContent = 'Time: ' + sInfo.time + 's';
            }
            // Biome material pickups
            var biomeResults = BiomeSystem.update(dt, player.x, player.z, player.y);
            if (biomeResults) {
                biomeResults.forEach(function (r) {
                    if (r.type === 'material') {
                        CombatSystem.addMaterial(r.matType, 1);
                        showNotify('📦 Found: ' + (CombatSystem.getMaterialDefs()[r.matType] || {}).name);
                    }
                });
            }
            // Cosmetic trail
            EndgameSystem.updateTrail(dt, player.x, player.z);
            // Daily modifiers: no_sprint, no_torch, eclipse
            if (EndgameSystem.getMode() === 'daily') {
                var dMods = EndgameSystem.getDailyModifiers();
                dMods.forEach(function (m) {
                    if (m.id === 'no_sprint') isSprinting = false;
                    if (m.id === 'no_torch' && flashlightOn) { flashlightOn = false; if (flashlight) flashlight.intensity = 0; }
                    if (m.id === 'eclipse' && scene.fog) scene.fog.density = Math.max(scene.fog.density, 0.025);
                    if (m.id === 'glass_cannon') { /* damage already multiplied in combat */ }
                });
            }
        } catch (e) { }

        // ---- Phase 6: Desert Physics update ----
        try {
            var dpResult = DesertPhysics.update(dt, player.x, player.z, player.y, gameMinute, isNight, isSprinting, sandstormActive);
            if (dpResult) {
                // Apply damage
                if (dpResult.damage > 0) sanity -= dpResult.damage;
                // Apply sanity drain
                if (dpResult.sanityDrain > 0) sanity -= dpResult.sanityDrain;
                // Apply water current push
                if (dpResult.currentPushX || dpResult.currentPushZ) {
                    player.x += dpResult.currentPushX * dt;
                    player.z += dpResult.currentPushZ * dt;
                }
                // Flood push
                if (dpResult.floodPush) {
                    player.x += dpResult.floodPush.x * dt;
                    player.z += dpResult.floodPush.z * dt;
                }
                // Quicksand sinking (lower player Y)
                if (dpResult.inQuicksand && dpResult.sinkDepth > 0) {
                    player.y = 1.7 - dpResult.sinkDepth;
                } else if (!dpResult.swimming) {
                    player.y = 1.7;
                }
                // HUD updates
                var tempEl = document.getElementById('hud-temp');
                if (tempEl) {
                    var tPct = Math.min(100, Math.max(0, (dpResult.temperature / 50) * 100));
                    tempEl.innerHTML = '🌡️ ' + Math.round(dpResult.temperature) + '°C <span class="env-bar"><span class="bar-fill" style="width:' + tPct + '%"></span></span>';
                }
                var hydEl = document.getElementById('hud-hydration');
                if (hydEl) {
                    hydEl.innerHTML = '💧 ' + Math.round(dpResult.hydration) + '% <span class="env-bar"><span class="bar-fill" style="width:' + dpResult.hydration + '%"></span></span>';
                }
                var windEl = document.getElementById('hud-wind');
                if (windEl) {
                    var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                    var wIdx = Math.round(((dpResult.windDX >= 0 ? Math.atan2(dpResult.windDZ, dpResult.windDX) : Math.atan2(dpResult.windDZ, dpResult.windDX) + Math.PI * 2) / (Math.PI * 2)) * 8) % 8;
                    windEl.textContent = '💨 ' + Math.round(dpResult.windSpeed) + 'm/s ' + dirs[wIdx];
                }
                var clothEl = document.getElementById('hud-clothing');
                if (clothEl) clothEl.textContent = '👘 ' + (dpResult.clothingType === 'cloak' ? 'Cloak' : 'Linen');
                // Breath bar
                var breathBarEl = document.getElementById('breath-bar');
                var breathFillEl = document.getElementById('breath-fill');
                if (breathBarEl) breathBarEl.style.display = dpResult.swimming ? 'block' : 'none';
                if (breathFillEl) breathFillEl.style.width = (dpResult.breathTimer / 15 * 100) + '%';
                // Quicksand warning
                var qsWarn = document.getElementById('quicksand-warning');
                if (qsWarn) qsWarn.style.display = dpResult.inQuicksand ? 'block' : 'none';
                // Heatstroke overlay
                var hsOverlay = document.getElementById('heatstroke-overlay');
                if (hsOverlay) hsOverlay.style.opacity = Math.min(1, dpResult.heatstroke / 100);
                // Hypothermia overlay
                var hypoOverlay = document.getElementById('hypothermia-overlay');
                if (hypoOverlay) hypoOverlay.style.opacity = Math.min(1, dpResult.hypothermia / 100);
            }
        } catch (e) { }

        // ---- Phase 7: World Gen update ----
        try {
            var wgResults = WorldGen.update(dt, player.x, player.z, player.y);
            if (wgResults) {
                wgResults.forEach(function (r) {
                    if (r.type === 'material') {
                        try { CombatSystem.addMaterial(r.matType, 1); } catch (e2) { }
                        showNotify('📦 Found: ' + r.matType);
                    }
                    if (r.type === 'damage') sanity -= r.damage;
                });
            }
            var curBiome = WorldGen.getCurrentBiome(player.x, player.z);
            if (curBiome && !WorldGen._lastBiome) {
                showNotify('🏝️ Entering: ' + curBiome.biome.name);
            }
            WorldGen._lastBiome = curBiome;
        } catch (e) { }

        // ---- Phase 8: RPG System update ----
        try {
            var rpgInfo = RPGSystem.update(dt);
            if (rpgInfo) {
                // Apply RPG speed modifier
                var rpgMods = RPGSystem.getCombatMods();
                // Display level in HUD if available
                var lvlEl = document.getElementById('hud-level');
                if (lvlEl) lvlEl.textContent = 'Lv.' + rpgInfo.level + ' (' + rpgInfo.xp + '/' + rpgInfo.xpToNext + ')';
            }
        } catch (e) { }

        // ---- Phase 9: Enemy Ecosystem update ----
        try {
            var ecoResults = EnemyEcosystem.update(dt, player.x, player.z, player.y, isNight);
            if (ecoResults) {
                if (ecoResults.damage > 0) {
                    try { var dmgResult = RPGSystem.takeDamage(ecoResults.damage); } catch (ex) { sanity -= ecoResults.damage; }
                    try { AudioEngine.playSFX('damage', 0.5); } catch (ex) { }
                }
                if (ecoResults.sanityDrain > 0) sanity -= ecoResults.sanityDrain;
                if (ecoResults.poisonDmg > 0) sanity -= ecoResults.poisonDmg * dt;
            }
        } catch (e) { }

        // ---- Phase 10: Visual Engine update ----
        try {
            var sunPos = scene.getObjectByName && scene.children.filter(function (c) { return c.type === 'DirectionalLight'; })[0];
            var sunY = sunPos ? sunPos.position.y : 10;
            var temp = 25;
            try { temp = DesertPhysics.getTemperature ? DesertPhysics.getTemperature() : 25; } catch (ex) { }
            var windAngle = 0;
            try { windAngle = DesertPhysics.getWindAngle ? DesertPhysics.getWindAngle() : 0; } catch (ex) { }
            VisualEngine.update(dt, player.x, player.z, player.y, sunY, temp, windAngle);
        } catch (e) { }

        // ---- Phase 11: Audio Engine update ----
        try {
            var biomeKey = null;
            try { var cb = WorldGen.getCurrentBiome(player.x, player.z); if (cb) biomeKey = cb.key; } catch (ex) { }
            AudioEngine.updateMusic(isNight, false, false, biomeKey, false);
        } catch (e) { }

        // ---- Phase 12: Meta-Progression achievements ----
        try {
            if (isNight) MetaProgression.unlockAchievement('survive_night');
        } catch (e) { }

        // ---- Camera ----
        camera.position.set(player.x, player.y, player.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.x = pitch;
        camera.rotation.y = yaw;

        // Head bob while moving
        if (isMoving) {
            camera.position.y += Math.sin(gameMinute * 8) * 0.04 * (isSprinting ? 1.5 : 1);
        }
        // Sanity camera shake
        if (sanity < 30) {
            var shake = (1 - sanity / 30) * 0.02;
            camera.rotation.z += (Math.random() - 0.5) * shake;
        }

        // ---- HUD ----
        updateHUD();

        // Quality enhancer update
        try { if (typeof QualityEnhancer !== 'undefined') QualityEnhancer.update(dt); } catch (e) { }
    }

    function updateHUD() {
        var hour = Math.floor(gameMinute / 60);
        var mins = Math.floor(gameMinute % 60);
        var ampm = hour >= 12 ? 'PM' : 'AM';
        var displayH = hour % 12; if (displayH === 0) displayH = 12;
        var timeIcon = (hour >= 6 && hour < 19) ? '☀️' : '🌙';
        var hTime = document.getElementById('hud-time');
        if (hTime) hTime.textContent = timeIcon + ' ' + displayH + ':' + (mins < 10 ? '0' : '') + mins + ' ' + ampm;

        var hArt = document.getElementById('hud-artifacts');
        if (hArt) hArt.textContent = '🏺 Artifacts: ' + artifactsCollected + '/' + TOTAL_ARTIFACTS;

        var hSanity = document.getElementById('hud-sanity-fill');
        if (hSanity) hSanity.style.width = sanity + '%';

        var hBattery = document.getElementById('hud-battery-fill');
        if (hBattery) hBattery.style.width = battery + '%';

        // Compass
        var hCompass = document.getElementById('hud-compass');
        if (hCompass) {
            var deg = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
            var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
            var idx = Math.round(deg / 45) % 8;
            hCompass.textContent = '🧭 ' + dirs[idx];
        }

        // Phase 2 HUD: Gold
        var hGold = document.getElementById('hud-gold');
        if (hGold) try { hGold.textContent = '💰 ' + StorySystem.getGold(); } catch (e) { }

        // Underground indicator
        var hDepth = document.getElementById('hud-depth');
        if (hDepth) try { hDepth.style.display = TombSystem.isUnderground(player.y) ? 'block' : 'none'; } catch (e) { }

        // Active quest
        var hQuest = document.getElementById('hud-quest');
        if (hQuest) try {
            var quests = StorySystem.getActiveQuests();
            if (quests.length > 0) {
                hQuest.style.display = 'block';
                hQuest.textContent = '📜 ' + quests[0].id.replace('q_', '').replace(/_/g, ' ');
            } else { hQuest.style.display = 'none'; }
        } catch (e) { }

        // Phase 3: Weapon HUD
        try {
            var w = CombatSystem.getWeapons();
            var eq = CombatSystem.getEquipped();
            ['khopesh', 'torch_throw', 'shield', 'bow', 'staff'].forEach(function (wid) {
                var el = document.getElementById('ws-' + (wid === 'torch_throw' ? 'torch' : wid));
                if (el) {
                    el.classList.toggle('unlocked', w[wid] && w[wid].unlocked);
                    el.classList.toggle('active', eq === wid);
                }
            });
            var aTorch = document.getElementById('wa-torch');
            if (aTorch) aTorch.textContent = w.torch_throw.ammo;
            var aBow = document.getElementById('wa-bow');
            if (aBow) aBow.textContent = w.bow.ammo;
            var hWeapon = document.getElementById('hud-weapon');
            if (hWeapon && eq) {
                hWeapon.style.display = 'block';
                hWeapon.textContent = '⚔️ ' + w[eq].name;
            }
            // Ankh tokens
            var hAnkh = document.getElementById('hud-ankh');
            if (hAnkh) {
                var tokens = CombatSystem.getAnkhTokens();
                hAnkh.style.display = tokens > 0 ? 'block' : 'none';
                hAnkh.textContent = '☥ ' + tokens;
            }
        } catch (e) { }
    }

    // ============ INVENTORY RENDERING ============
    function toggleInventory(open) {
        inventoryOpen = open;
        var el = document.getElementById('inventory-overlay');
        if (el) el.style.display = open ? 'block' : 'none';
        if (open) { renderInventory(); document.exitPointerLock(); }
    }
    function renderInventory() {
        var grid = document.getElementById('inv-grid');
        var matEl = document.getElementById('inv-materials');
        var craftEl = document.getElementById('craft-grid');
        if (!grid) return;
        try {
            var inv = CombatSystem.getInventory();
            var items = CombatSystem.getItems();
            var html = '';
            for (var i = 0; i < 8; i++) {
                if (i < inv.length) {
                    var def = items[inv[i].id];
                    html += '<div class="inv-slot" data-slot="' + i + '">' + (def ? def.icon : '?') + '<span class="inv-qty">' + inv[i].qty + '</span></div>';
                } else {
                    html += '<div class="inv-slot"></div>';
                }
            }
            grid.innerHTML = html;
            // Click to use item
            grid.querySelectorAll('.inv-slot[data-slot]').forEach(function (el) {
                el.onclick = function () {
                    var eff = CombatSystem.useItem(parseInt(el.dataset.slot));
                    if (eff) {
                        if (eff.type === 'heal') sanity = Math.min(maxSanity, sanity + eff.value);
                        if (eff.type === 'sanity') sanity = Math.min(maxSanity, sanity + eff.value);
                        if (eff.type === 'smoke') showNotify('💨 Smoke bomb! Enemies confused');
                        if (eff.type === 'ammo') {
                            if (eff.weapon === 'bow') CombatSystem.setArrowType(eff.arrowType);
                        }
                        showNotify('Used item'); renderInventory();
                    }
                };
            });
            // Materials
            var mats = CombatSystem.getMaterials();
            var matDefs = CombatSystem.getMaterialDefs();
            var matHtml = '';
            Object.keys(mats).forEach(function (k) {
                if (mats[k] > 0 && matDefs[k]) matHtml += '<span class="mat-item">' + matDefs[k].icon + ' ' + matDefs[k].name + ': ' + mats[k] + '</span>';
            });
            if (matEl) matEl.innerHTML = matHtml;
            // Crafting
            var recipes = CombatSystem.getRecipes();
            var craftHtml = '';
            recipes.forEach(function (r) {
                var canCraft = true;
                var ingText = '';
                r.ingredients.forEach(function (ing) {
                    if ((mats[ing.id] || 0) < ing.qty) canCraft = false;
                    ingText += (matDefs[ing.id] ? matDefs[ing.id].icon : '') + ing.qty + ' ';
                });
                craftHtml += '<div class="craft-card' + (canCraft ? '' : ' disabled') + '" data-recipe="' + r.id + '"><h4>' + r.name + '</h4><p>' + ingText + '</p></div>';
            });
            if (craftEl) {
                craftEl.innerHTML = craftHtml;
                craftEl.querySelectorAll('.craft-card:not(.disabled)').forEach(function (el) {
                    el.onclick = function () {
                        if (CombatSystem.craft(el.dataset.recipe)) {
                            showNotify('⚒️ Crafted!'); renderInventory();
                        }
                    };
                });
            }
        } catch (e) { }
    }

    // ============ UPGRADE RENDERING ============
    function toggleUpgrades(open) {
        upgradeOpen = open;
        var el = document.getElementById('upgrade-overlay');
        if (el) el.style.display = open ? 'block' : 'none';
        if (open) { renderUpgrades(); document.exitPointerLock(); }
    }
    function renderUpgrades() {
        var tokEl = document.getElementById('upg-tokens');
        var grid = document.getElementById('upgrade-grid');
        if (!grid) return;
        try {
            var tokens = CombatSystem.getAnkhTokens();
            if (tokEl) tokEl.textContent = '☥ Tokens: ' + tokens;
            var upgs = CombatSystem.getUpgrades();
            var html = '';
            Object.keys(upgs).forEach(function (k) {
                var u = upgs[k];
                var maxed = u.level >= u.maxLevel;
                var cost = maxed ? '—' : u.cost[u.level];
                var dots = '';
                for (var d = 0; d < u.maxLevel; d++) dots += d < u.level ? '●' : '○';
                html += '<div class="upgrade-card' + (maxed ? ' maxed' : '') + '" data-upg="' + k + '">';
                html += '<h4>' + u.name + '</h4><p>' + u.desc + '</p>';
                html += '<div class="level-dots">' + dots + '</div>';
                html += '<p style="color:#ffaa00;margin-top:4px;">' + (maxed ? 'MAXED' : 'Cost: ' + cost + ' ☥') + '</p></div>';
            });
            grid.innerHTML = html;
            grid.querySelectorAll('.upgrade-card:not(.maxed)').forEach(function (el) {
                el.onclick = function () {
                    if (CombatSystem.buyUpgrade(el.dataset.upg)) {
                        showNotify('☥ Upgraded!'); renderUpgrades();
                    } else {
                        showNotify('Not enough Ankh Tokens');
                    }
                };
            });
        } catch (e) { }
    }

    // ============ LEADERBOARD / COSMETICS TOGGLES ============
    function toggleLeaderboard(open) {
        leaderboardOpen = open;
        var el = document.getElementById('leaderboard-overlay');
        if (el) el.style.display = open ? 'block' : 'none';
        if (open) { EndgameSystem.renderLeaderboard(); document.exitPointerLock(); }
    }
    function toggleCosmetics(open) {
        cosmeticsOpen = open;
        var el = document.getElementById('cosmetics-overlay');
        if (el) el.style.display = open ? 'block' : 'none';
        if (open) { EndgameSystem.renderCosmetics(); document.exitPointerLock(); }
    }

    // ============ GAME LOOP ============
    function gameLoop() {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        var dt = Math.min(clock.getDelta(), 0.1);
        update(dt);
        renderer.render(scene, camera);
    }
})();
