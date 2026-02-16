/* ============================================
   Graveyard Shift — 3D Stealth Horror (Three.js)
   OVERHAULED: 8 ghost types, evidence system, equipment,
   expanded cemetery, tasks, night events, stamina system
   ============================================ */
(function () {
    'use strict';

    var scene, camera, renderer, clock;
    var gameActive = false, initialized = false;
    var player = { x: 0, y: 1.6, z: 0 };
    var yaw = 0, pitch = 0, mouseSensitivity = 0.002;
    var keys = {};
    var WALK_SPEED = 3, CROUCH_SPEED = 1.5, RUN_SPEED = 5;
    var isCrouching = false, isSprinting = false;
    var flashlightOn = true, flashlight = null;

    // Game state
    var gameTime = 0;
    var disturbances = [], disturbancesChecked = 0, totalDisturbances = 8;
    var ghosts = [];
    var graves = [];

    // ── NEW: Stamina ──────────────────────────────────
    var stamina = 100;
    var maxStamina = 100;

    // ── NEW: Equipment System ─────────────────────────
    var equipment = {
        emfReader: false,
        spiritBox: false,
        holyWater: 0,
        camera: false,
        crucifix: 0,
    };
    var emfLevel = 0;
    var spiritBoxActive = false;
    var equipmentPickups = [];

    // ── NEW: Evidence System ──────────────────────────
    var evidenceLog = [];
    var EVIDENCE_TYPES = ['EMF 5', 'Spirit Box', 'Cold Spot', 'Orb Trail', 'Fingerprints', 'Ghost Writing'];

    // ── NEW: Ghost Types ──────────────────────────────
    var GHOST_TYPES = [
        { name: 'Phantom', color: 0xaabbcc, speed: 1.5, aggression: 0.6, evidence: ['EMF 5', 'Cold Spot', 'Ghost Writing'], special: 'Disappears when looked at' },
        { name: 'Wraith', color: 0x8899bb, speed: 2.0, aggression: 0.7, evidence: ['EMF 5', 'Spirit Box', 'Fingerprints'], special: 'Can teleport' },
        { name: 'Banshee', color: 0xbb8899, speed: 1.8, aggression: 0.8, evidence: ['Cold Spot', 'Orb Trail', 'Fingerprints'], special: 'Targets one player' },
        { name: 'Shade', color: 0x667788, speed: 1.2, aggression: 0.3, evidence: ['EMF 5', 'Orb Trail', 'Ghost Writing'], special: 'Shy, hides when watched' },
        { name: 'Poltergeist', color: 0xccbbaa, speed: 1.6, aggression: 0.5, evidence: ['Spirit Box', 'Fingerprints', 'Orb Trail'], special: 'Throws objects' },
        { name: 'Demon', color: 0x992222, speed: 2.5, aggression: 0.9, evidence: ['Spirit Box', 'Ghost Writing', 'Cold Spot'], special: 'Extremely aggressive' },
        { name: 'Mare', color: 0x445566, speed: 1.4, aggression: 0.4, evidence: ['Spirit Box', 'Orb Trail', 'Cold Spot'], special: 'Stronger in darkness' },
        { name: 'Revenant', color: 0x556644, speed: 0.8, aggression: 0.7, evidence: ['EMF 5', 'Fingerprints', 'Ghost Writing'], special: 'Very fast when hunting' },
    ];

    // ── NEW: Night Events ─────────────────────────────
    var nightEventTimer = 0;
    var nightEvents = [];
    var fogPulse = 0;

    // ── NEW: Stats ────────────────────────────────────
    var ghostsBanished = 0;
    var evidenceFound = 0;

    // Messages
    var msgText = '';
    var msgTimer2 = 0;
    function showMsg(text) { msgText = text; msgTimer2 = 3; }

    // Input
    document.addEventListener('keydown', function (e) {
        keys[e.code] = true;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isSprinting = true;
        if (e.code === 'ControlLeft' || e.code === 'ControlRight') isCrouching = true;
        if (e.code === 'KeyF' && gameActive) { flashlightOn = !flashlightOn; HorrorAudio.playClick(); }
        if (e.code === 'KeyE' && gameActive) handleInteract();
        if (e.code === 'KeyR' && gameActive && equipment.emfReader) toggleEMF();
        if (e.code === 'KeyT' && gameActive && equipment.spiritBox) toggleSpiritBox();
        if (e.code === 'KeyG' && gameActive && equipment.holyWater > 0) useHolyWater();
        if (e.code === 'KeyH' && gameActive && equipment.crucifix > 0) placeCrucifix();
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); document.exitPointerLock(); }
    });
    document.addEventListener('keyup', function (e) {
        keys[e.code] = false;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isSprinting = false;
        if (e.code === 'ControlLeft' || e.code === 'ControlRight') isCrouching = false;
    });
    document.addEventListener('mousemove', function (e) {
        if (!gameActive || !document.pointerLockElement) return;
        yaw -= e.movementX * mouseSensitivity;
        pitch -= e.movementY * mouseSensitivity;
        pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
    });
    document.addEventListener('click', function () {
        if (gameActive && renderer) try { renderer.domElement.requestPointerLock(); } catch (e) { }
    });

    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; clock.getDelta(); gameLoop(); },
        onRestart: restartGame
    });

    function toggleEMF() {
        showMsg(emfLevel >= 4 ? '⚡ EMF LEVEL 5! Strong presence!' : '📡 EMF Level: ' + emfLevel);
        if (emfLevel >= 4 && evidenceLog.indexOf('EMF 5') === -1) { evidenceLog.push('EMF 5'); evidenceFound++; showMsg('📋 Evidence found: EMF 5!'); }
    }
    function toggleSpiritBox() {
        spiritBoxActive = !spiritBoxActive;
        showMsg(spiritBoxActive ? '📻 Spirit Box ON — listen for responses...' : '📻 Spirit Box OFF');
    }
    function useHolyWater() {
        equipment.holyWater--;
        showMsg('💧 Holy water thrown!');
        // Damage nearby ghosts
        for (var i = ghosts.length - 1; i >= 0; i--) {
            var g = ghosts[i];
            var dx = player.x - g.x, dz = player.z - g.z;
            if (Math.sqrt(dx * dx + dz * dz) < 5) {
                g.stunTimer = 5;
                g.state = 'stunned';
                showMsg('👻 ' + g.typeName + ' stunned!');
            }
        }
    }
    function placeCrucifix() {
        equipment.crucifix--;
        showMsg('✝️ Crucifix placed — ghosts will avoid this area');
        // Place a light marker
        var crucifixLight = new THREE.PointLight(0xffffcc, 0.6, 8);
        crucifixLight.position.set(player.x, 0.5, player.z);
        scene.add(crucifixLight);
        var crucMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.02), new THREE.MeshStandardMaterial({ color: 0xddaa44 }));
        crucMesh.position.set(player.x, 0.5, player.z); scene.add(crucMesh);
        nightEvents.push({ type: 'crucifix', x: player.x, z: player.z, timer: 60, mesh: crucMesh, light: crucifixLight });
    }

    function handleInteract() {
        // Check equipment pickups
        for (var i = equipmentPickups.length - 1; i >= 0; i--) {
            var ep = equipmentPickups[i];
            var dx = player.x - ep.x, dz = player.z - ep.z;
            if (Math.sqrt(dx * dx + dz * dz) < 2) {
                if (ep.type === 'emf') { equipment.emfReader = true; showMsg('📡 EMF Reader found! (R to use)'); }
                else if (ep.type === 'spiritbox') { equipment.spiritBox = true; showMsg('📻 Spirit Box found! (T to toggle)'); }
                else if (ep.type === 'holywater') { equipment.holyWater++; showMsg('💧 Holy Water found! (G to throw)'); }
                else if (ep.type === 'crucifix') { equipment.crucifix++; showMsg('✝️ Crucifix found! (H to place)'); }
                else if (ep.type === 'camera') { equipment.camera = true; showMsg('📷 Ghost Camera found!'); }
                scene.remove(ep.mesh); scene.remove(ep.light);
                equipmentPickups.splice(i, 1);
                HorrorAudio.playCollect();
                return;
            }
        }

        // Check disturbances
        for (var i = 0; i < disturbances.length; i++) {
            var d = disturbances[i];
            if (d.checked) continue;
            var dx = player.x - d.x, dz = player.z - d.z;
            if (Math.sqrt(dx * dx + dz * dz) < 2.5) {
                d.checked = true; disturbancesChecked++;
                scene.remove(d.light); scene.remove(d.marker);
                HorrorAudio.playCollect();
                showMsg('✅ Disturbance ' + disturbancesChecked + '/' + totalDisturbances + ' investigated');
                // Spawn ghost at disturbance
                spawnGhost(d.x + (Math.random() - 0.5) * 5, d.z + (Math.random() - 0.5) * 5);
                HorrorAudio.playJumpScare();
                // Evidence chance
                if (Math.random() < 0.3) {
                    var evType = EVIDENCE_TYPES[Math.floor(Math.random() * EVIDENCE_TYPES.length)];
                    if (evidenceLog.indexOf(evType) === -1) { evidenceLog.push(evType); evidenceFound++; showMsg('📋 Evidence: ' + evType); }
                }
            }
        }
    }

    function init() {
        if (initialized) return; initialized = true;
        clock = new THREE.Clock();
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050510);
        scene.fog = new THREE.FogExp2(0x050510, 0.04);
        camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
        renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.4;
        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        if (window.QualityFX) QualityFX.injectThreeJS(renderer, scene, camera);
    }

    function buildCemetery() {
        // Ground
        var groundMat = new THREE.MeshStandardMaterial({ color: 0x1a2a15, roughness: 0.95 });
        var ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), groundMat);
        ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

        // Moonlight
        var moon = new THREE.DirectionalLight(0x223355, 0.4);
        moon.position.set(20, 30, 10); moon.castShadow = true; moon.shadow.bias = -0.001; scene.add(moon);
        scene.add(new THREE.AmbientLight(0x050510, 0.2));

        // Player flashlight
        flashlight = new THREE.SpotLight(0xffffee, 3.0, 40, Math.PI / 5, 0.5, 1);
        flashlight.castShadow = true;
        flashlight.shadow.mapSize.width = 1024; flashlight.shadow.mapSize.height = 1024;
        camera.add(flashlight); camera.add(flashlight.target);
        flashlight.target.position.set(0, 0, -5);
        scene.add(camera);

        // Expanded gravestones (60+)
        var graveMat = new THREE.MeshStandardMaterial({ color: 0x556655, roughness: 0.9 });
        graves = [];
        for (var i = 0; i < 70; i++) {
            var gx = (Math.random() - 0.5) * 70, gz = (Math.random() - 0.5) * 70;
            if (Math.abs(gx) < 3 && Math.abs(gz) < 3) continue;
            var gType = Math.floor(Math.random() * 4);
            var gMesh;
            if (gType === 0) {
                gMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.15), graveMat.clone());
            } else if (gType === 1) {
                var cg = new THREE.Group();
                cg.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.1), graveMat.clone()));
                cg.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.1), graveMat.clone()).translateY(0.35));
                gMesh = cg;
            } else if (gType === 2) {
                gMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), graveMat.clone());
            } else {
                // NEW: Angel statue
                var angel = new THREE.Group();
                angel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8), graveMat.clone()));
                angel.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), graveMat.clone()).translateY(0.9));
                gMesh = angel;
            }
            gMesh.position.set(gx, gType === 2 ? 0.15 : 0.6, gz);
            gMesh.rotation.y = Math.random() * 0.3 - 0.15;
            scene.add(gMesh);
            graves.push({ mesh: gMesh, x: gx, z: gz });
        }

        // Dead trees (20)
        var treeMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 });
        for (var i = 0; i < 20; i++) {
            var tx = (Math.random() - 0.5) * 80, tz = (Math.random() - 0.5) * 80;
            var treeGroup = new THREE.Group();
            var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 4 + Math.random() * 3), treeMat);
            trunk.position.y = 2; trunk.castShadow = true; treeGroup.add(trunk);
            for (var b = 0; b < 5; b++) {
                var branch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 1.5 + Math.random()), treeMat);
                branch.position.set(0, 2.5 + b * 0.5, 0);
                branch.rotation.z = (Math.random() - 0.5) * 1.5; branch.rotation.y = b * Math.PI / 2.5;
                treeGroup.add(branch);
            }
            treeGroup.position.set(tx, 0, tz); scene.add(treeGroup);
        }

        // Iron fence
        var fenceMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
        for (var side = 0; side < 4; side++) {
            for (var seg = 0; seg < 14; seg++) {
                var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8), fenceMat);
                var offset = -32 + seg * 5;
                if (side === 0) bar.position.set(offset, 0.9, -35);
                else if (side === 1) bar.position.set(offset, 0.9, 35);
                else if (side === 2) bar.position.set(-35, 0.9, offset);
                else bar.position.set(35, 0.9, offset);
                scene.add(bar);
            }
        }

        // NEW: Mausoleum structure
        var mausMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7 });
        var maus = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), mausMat);
        maus.position.set(15, 1.5, -15); maus.castShadow = true; scene.add(maus);
        var mausRoof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.5, 4), mausMat);
        mausRoof.position.set(15, 3.75, -15); mausRoof.rotation.y = Math.PI / 4; scene.add(mausRoof);
        // Entrance light
        var mausLight = new THREE.PointLight(0x442200, 0.4, 8);
        mausLight.position.set(15, 2, -13); scene.add(mausLight);

        // Spawn disturbances
        spawnDisturbances();

        // Spawn equipment pickups
        spawnEquipment();

        if (window.QualityFX && window.QualityFX.updateScene) QualityFX.updateScene();
    }

    function spawnDisturbances() {
        disturbances = [];
        for (var i = 0; i < totalDisturbances; i++) {
            var dx = (Math.random() - 0.5) * 55, dz = (Math.random() - 0.5) * 55;
            if (Math.abs(dx) < 5 && Math.abs(dz) < 5) { dx += 12; dz += 12; }
            var light = new THREE.PointLight(0xff4400, 0.5, 8);
            light.position.set(dx, 0.5, dz); scene.add(light);
            var marker = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 }));
            marker.position.set(dx, 0.5, dz); scene.add(marker);
            disturbances.push({ x: dx, z: dz, checked: false, light: light, marker: marker });
        }
    }

    function spawnEquipment() {
        equipmentPickups = [];
        var items = ['emf', 'spiritbox', 'holywater', 'holywater', 'crucifix', 'crucifix', 'camera'];
        for (var i = 0; i < items.length; i++) {
            var ex = (Math.random() - 0.5) * 50, ez = (Math.random() - 0.5) * 50;
            if (Math.abs(ex) < 5 && Math.abs(ez) < 5) { ex += 10; }
            var color = items[i] === 'emf' ? 0x44ff44 : items[i] === 'spiritbox' ? 0x4444ff : items[i] === 'holywater' ? 0x44ddff : items[i] === 'camera' ? 0xffff44 : 0xffcc44;
            var eqMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 }));
            eqMesh.position.set(ex, 0.4, ez); scene.add(eqMesh);
            var eqLight = new THREE.PointLight(color, 0.3, 4);
            eqLight.position.set(ex, 0.6, ez); scene.add(eqLight);
            equipmentPickups.push({ type: items[i], x: ex, z: ez, mesh: eqMesh, light: eqLight });
        }
    }

    function spawnGhost(x, z) {
        var ghostType = GHOST_TYPES[Math.floor(Math.random() * GHOST_TYPES.length)];
        var ghostMat = new THREE.MeshStandardMaterial({ color: ghostType.color, transparent: true, opacity: 0.4, emissive: ghostType.color, emissiveIntensity: 0.2 });
        var body = new THREE.Group();
        body.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), ghostMat));
        body.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.2, 8), ghostMat).translateY(-0.8));
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 });
        body.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat).translateX(-0.15).translateY(0.05).translateZ(0.35));
        body.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat).translateX(0.15).translateY(0.05).translateZ(0.35));
        body.position.set(x, 1.2, z);
        scene.add(body);
        ghosts.push({
            mesh: body, x: x, z: z,
            speed: ghostType.speed + Math.random() * 0.5,
            patrolAngle: Math.random() * Math.PI * 2,
            state: 'patrol', alertTimer: 0, stunTimer: 0,
            typeName: ghostType.name, aggression: ghostType.aggression,
            evidence: ghostType.evidence, special: ghostType.special,
            hp: 3, spotted: false
        });
    }

    function startGame() {
        if (!GameUtils.checkWebGL()) return;
        init();
        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        HorrorAudio.startDrone(30, 'dark'); HorrorAudio.startWind();
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
        ghosts = []; disturbances = []; equipmentPickups = []; nightEvents = [];
        gameTime = 0; disturbancesChecked = 0;
        stamina = 100; evidenceLog = []; evidenceFound = 0; ghostsBanished = 0;
        equipment = { emfReader: false, spiritBox: false, holyWater: 0, camera: false, crucifix: 0 };
        player.x = 0; player.y = 1.6; player.z = 0;
        yaw = 0; pitch = 0; isCrouching = false; isSprinting = false; flashlightOn = true;
        spiritBoxActive = false;
        buildCemetery();
        try { if (typeof QualityEnhancer !== 'undefined') QualityEnhancer.enhance(renderer, scene, camera); } catch (e) { }
        // Initial ghosts
        for (var i = 0; i < 3; i++) {
            spawnGhost((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
        }
    }

    function restartGame() {
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        HorrorAudio.startDrone(30, 'dark'); HorrorAudio.startWind();
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
        var fs = document.getElementById('final-score');
        if (fs) fs.textContent = 'Killed at ' + formatTime() + ' | Disturbances: ' + disturbancesChecked + '/' + totalDisturbances + ' | Evidence: ' + evidenceLog.length;
        var btn = document.querySelector('#game-over-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function gameWin() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.WIN);
        document.exitPointerLock();
        HorrorAudio.playWin(); HorrorAudio.stopDrone(); HorrorAudio.stopWind();
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var fs = document.getElementById('final-score');
        if (fs) fs.textContent = 'Survived until dawn! Evidence: ' + evidenceLog.length + ' | Ghosts banished: ' + ghostsBanished;
        var btn = document.querySelector('#game-win-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function formatTime() {
        var hours = Math.floor(gameTime / 60);
        var mins = Math.floor(gameTime % 60);
        var displayH = 12 + hours; if (displayH > 12) displayH -= 12;
        return displayH + ':' + (mins < 10 ? '0' : '') + mins + ' AM';
    }

    function update(dt) {
        var timeSpeed = 1 / GameUtils.getMultiplier();
        gameTime += dt * timeSpeed;
        if (window.ChallengeManager) ChallengeManager.notify('graveyard-shift', 'survival_time', gameTime);
        if (gameTime >= 360 && disturbancesChecked >= totalDisturbances) { gameWin(); return; }

        // Stamina
        if (isSprinting && (keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'])) {
            stamina -= dt * 20;
            if (stamina <= 0) { stamina = 0; isSprinting = false; }
        } else {
            stamina = Math.min(maxStamina, stamina + dt * 8);
        }

        // Movement
        var speed = (isCrouching ? CROUCH_SPEED : (isSprinting && stamina > 0 ? RUN_SPEED : WALK_SPEED)) * dt;
        var moveX = 0, moveZ = 0;
        if (keys['KeyW']) moveZ += 1;
        if (keys['KeyS']) moveZ -= 1;
        if (keys['KeyA']) moveX -= 1;
        if (keys['KeyD']) moveX += 1;
        var isMoving = moveX !== 0 || moveZ !== 0;
        if (isMoving) {
            var len = Math.sqrt(moveX * moveX + moveZ * moveZ); moveX /= len; moveZ /= len;
            var forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
            var right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
            player.x += (forward.x * moveZ + right.x * moveX) * speed;
            player.z += (forward.z * moveZ + right.z * moveX) * speed;
            player.x = Math.max(-34, Math.min(34, player.x));
            player.z = Math.max(-34, Math.min(34, player.z));
        }
        var targetY = isCrouching ? 1.0 : 1.6;
        player.y += (targetY - player.y) * 8 * dt;
        if (flashlight) flashlight.intensity = flashlightOn ? 1.5 : 0;

        // EMF reading
        emfLevel = 0;
        for (var i = 0; i < ghosts.length; i++) {
            var dx = player.x - ghosts[i].x, dz = player.z - ghosts[i].z;
            var dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 15) emfLevel = Math.max(emfLevel, Math.ceil(5 - dist / 3));
        }

        // Spirit Box interaction
        if (spiritBoxActive) {
            for (var i = 0; i < ghosts.length; i++) {
                var g = ghosts[i];
                var dx = player.x - g.x, dz = player.z - g.z;
                if (Math.sqrt(dx * dx + dz * dz) < 8 && g.evidence.indexOf('Spirit Box') !== -1 && Math.random() < 0.002) {
                    if (evidenceLog.indexOf('Spirit Box') === -1) { evidenceLog.push('Spirit Box'); evidenceFound++; showMsg('📋 Evidence: Spirit Box response! (Ghost: ' + g.typeName + ')'); }
                }
            }
        }

        // Ghost AI
        var playerNoise = isMoving ? (isCrouching ? 4 : (isSprinting ? 18 : 10)) : 2;
        if (flashlightOn) playerNoise += 3;
        if (spiritBoxActive) playerNoise += 5;

        for (var i = ghosts.length - 1; i >= 0; i--) {
            var g = ghosts[i];
            var dx = player.x - g.x, dz = player.z - g.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            // Crucifix repulsion
            var crucifixNear = false;
            for (var ne = 0; ne < nightEvents.length; ne++) {
                if (nightEvents[ne].type === 'crucifix') {
                    var cx = g.x - nightEvents[ne].x, cz = g.z - nightEvents[ne].z;
                    if (Math.sqrt(cx * cx + cz * cz) < 6) { crucifixNear = true; break; }
                }
            }

            if (g.stunTimer > 0) { g.stunTimer -= dt; g.state = 'stunned'; }
            else if (crucifixNear) { g.state = 'flee'; }
            else if (dist < playerNoise * g.aggression && g.state !== 'chase') {
                g.state = 'chase'; g.alertTimer = 5 + g.aggression * 3;
                if (!g.spotted) { g.spotted = true; if (window.ChallengeManager) ChallengeManager.notify('graveyard-shift', 'ghosts_spotted', 1); }
            }

            if (g.state === 'chase') {
                g.alertTimer -= dt;
                var chaseSpeed = g.typeName === 'Revenant' ? g.speed * 3 : g.speed * 1.5;
                g.x += (dx / (dist || 1)) * chaseSpeed * dt;
                g.z += (dz / (dist || 1)) * chaseSpeed * dt;
                if (g.alertTimer <= 0) g.state = 'patrol';
                if (dist < 1.2) { gameOver(); return; }
            } else if (g.state === 'flee') {
                g.x -= (dx / (dist || 1)) * g.speed * dt;
                g.z -= (dz / (dist || 1)) * g.speed * dt;
            } else if (g.state !== 'stunned') {
                g.patrolAngle += dt * 0.3;
                g.x += Math.cos(g.patrolAngle) * g.speed * 0.3 * dt;
                g.z += Math.sin(g.patrolAngle) * g.speed * 0.3 * dt;
                g.x = Math.max(-34, Math.min(34, g.x));
                g.z = Math.max(-34, Math.min(34, g.z));
            }

            g.mesh.position.set(g.x, 1.2 + Math.sin(gameTime * 2 + i) * 0.15, g.z);
            g.mesh.lookAt(player.x, 1.2, player.z);
            g.mesh.children.forEach(function (c) {
                if (c.material && c.material.opacity !== undefined) {
                    c.material.opacity = g.state === 'chase' ? 0.7 : g.state === 'stunned' ? 0.2 : 0.3;
                    c.material.emissiveIntensity = g.state === 'chase' ? 0.5 : 0.2;
                }
            });
        }

        // Night events
        nightEventTimer -= dt;
        if (nightEventTimer <= 0) {
            nightEventTimer = 15 + Math.random() * 30;
            triggerNightEvent();
        }
        // Update crucifix timers
        for (var i = nightEvents.length - 1; i >= 0; i--) {
            var ne = nightEvents[i];
            if (ne.type === 'crucifix') {
                ne.timer -= dt;
                if (ne.timer <= 0) {
                    scene.remove(ne.mesh); scene.remove(ne.light);
                    nightEvents.splice(i, 1);
                }
            }
        }

        // Fog pulse
        fogPulse += dt;
        scene.fog.density = 0.04 + Math.sin(fogPulse * 0.5) * 0.01;

        // Camera
        camera.position.set(player.x, player.y, player.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.x = pitch; camera.rotation.y = yaw;

        // Sky color changes as dawn approaches
        var dawnPct = Math.max(0, (gameTime - 300) / 60);
        var r = 0.02 + dawnPct * 0.2, g = 0.02 + dawnPct * 0.1, b = 0.06 + dawnPct * 0.15;
        scene.background.setRGB(r, g, b); scene.fog.color.setRGB(r, g, b);

        // Message timer
        if (msgTimer2 > 0) msgTimer2 -= dt;

        // HUD
        var h1 = document.getElementById('hud-time');
        if (h1) h1.textContent = formatTime();
        var h2 = document.getElementById('hud-spots');
        if (h2) h2.textContent = '🔍 ' + disturbancesChecked + '/' + totalDisturbances + ' | 📋 ' + evidenceLog.length + ' evidence | 🏃 ' + Math.round(stamina) + '%';
    }

    function triggerNightEvent() {
        var events = ['fog_thickens', 'howl', 'grave_glow', 'spawn_ghost'];
        var ev = events[Math.floor(Math.random() * events.length)];
        if (ev === 'fog_thickens') { scene.fog.density = 0.08; setTimeout(function () { scene.fog.density = 0.04; }, 5000); showMsg('🌫️ A thick fog rolls in...'); }
        else if (ev === 'howl') { showMsg('🐺 A howl echoes through the cemetery...'); HorrorAudio.playJumpScare && HorrorAudio.playJumpScare(); }
        else if (ev === 'spawn_ghost' && ghosts.length < 10) {
            spawnGhost((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
            showMsg('👻 A new presence emerges...');
        }
    }

    function gameLoop() {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        var dt = Math.min(clock.getDelta(), 0.1);
        update(dt);

        // HUD message overlay
        if (msgTimer2 > 0) {
            var hudEl = document.getElementById('hud-msg');
            if (!hudEl) {
                hudEl = document.createElement('div');
                hudEl.id = 'hud-msg';
                hudEl.style.cssText = 'position:fixed;top:25%;left:50%;transform:translateX(-50%);color:#ffcc44;font:700 18px Inter;text-align:center;pointer-events:none;text-shadow:0 0 10px #ff8800;z-index:999;';
                document.body.appendChild(hudEl);
            }
            hudEl.textContent = msgText;
            hudEl.style.opacity = Math.min(1, msgTimer2);
        }

        renderer.render(scene, camera);
    }
})();
