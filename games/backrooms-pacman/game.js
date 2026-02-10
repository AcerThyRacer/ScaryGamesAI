/* ============================================
   Backrooms: Pac-Man — AAA 3D Horror Game
   Three.js First-Person — Eldritch Horror Edition
   ============================================ */

(function () {
    'use strict';

    // ---- MAZE LAYOUT ----
    const MAZE_ORIGINAL = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 3, 2, 0, 2, 1, 2, 0, 2, 0, 1, 0, 2, 0, 2, 1, 0, 2, 0, 1],
        [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1],
        [1, 2, 0, 0, 2, 0, 2, 0, 0, 2, 0, 2, 0, 0, 2, 0, 2, 0, 2, 1],
        [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1],
        [1, 2, 0, 1, 0, 0, 2, 0, 0, 2, 0, 0, 0, 2, 0, 0, 1, 0, 2, 1],
        [1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
        [1, 2, 0, 0, 2, 0, 2, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 1],
        [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1],
        [1, 2, 0, 2, 0, 0, 2, 1, 0, 4, 0, 1, 2, 0, 0, 2, 0, 0, 2, 1],
        [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1],
        [1, 2, 0, 0, 2, 0, 2, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 1],
        [1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
        [1, 2, 0, 1, 0, 0, 2, 0, 0, 2, 0, 0, 0, 2, 0, 0, 1, 0, 2, 1],
        [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1],
        [1, 2, 0, 0, 2, 0, 2, 0, 0, 2, 0, 2, 0, 0, 2, 0, 2, 0, 2, 1],
        [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1],
        [1, 0, 2, 0, 2, 1, 2, 0, 2, 0, 1, 0, 2, 0, 2, 1, 0, 2, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];
    var MAZE = [];
    function cloneMaze() { MAZE = []; for (var r = 0; r < MAZE_ORIGINAL.length; r++) MAZE[r] = MAZE_ORIGINAL[r].slice(); }
    cloneMaze();

    const CELL = 4, WALL_H = 3.5, ROWS = MAZE_ORIGINAL.length, COLS = MAZE_ORIGINAL[0].length;

    let scene, camera, renderer;
    let pellets = [], totalPellets = 0, collectedPellets = 0;
    let pacman = null, pacmanParts = {};
    let extraPacmans = []; // Additional Pac-Men on harder difficulties
    let playerPos = { x: 0, z: 0 }, yaw = 0, pitch = 0;
    let keys = {}, isRunning = false, gameActive = false, pointerLocked = false, initialized = false;
    let corridorLights = [], dustParticles = null, footstepTimer = 0;
    let distortionOverlay = null, camShake = 0;
    let pacmanAnimTime = 0;
    // Sprint velocity system
    let playerVelocity = { x: 0, z: 0 };
    let currentSpeed = 0;
    // Stamina system (hard+ difficulties)
    let stamina = 100, maxStamina = 100, staminaDrained = false;
    // Blackout system
    let blackoutActive = false, blackoutTimer = 0, blackoutCooldown = 20, blackoutOverlay = null;
    let nextBlackout = 15 + Math.random() * 25;
    // Extra Pac-Man spawn timers
    let extraSpawnTimers = [], gameElapsed = 0, spawnWarningEl = null;

    // Integration
    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; try { renderer.domElement.requestPointerLock(); } catch (e) { } lastTime = performance.now(); animate(); },
        onRestart: restartGame
    });

    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.getElementById('fullscreen-btn').addEventListener('click', function () { GameUtils.toggleFullscreen(); });

    document.addEventListener('keydown', function (e) { keys[e.code] = true; if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isRunning = true; });
    document.addEventListener('keyup', function (e) { keys[e.code] = false; if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isRunning = false; });
    document.addEventListener('mousemove', function (e) {
        if (!pointerLocked || !gameActive) return;
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;
        pitch = Math.max(-1.2, Math.min(1.2, pitch));
    });
    document.addEventListener('pointerlockchange', function () { pointerLocked = !!document.pointerLockElement; });
    document.addEventListener('keydown', function (e) { if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); } });

    // ---- PROCEDURAL TEXTURES ----
    function createWallpaperTexture() {
        var c = document.createElement('canvas'); c.width = 256; c.height = 256;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#b5a44c'; ctx.fillRect(0, 0, 256, 256);
        // Wallpaper stripe pattern
        for (var y = 0; y < 256; y += 16) {
            ctx.fillStyle = y % 32 === 0 ? '#c4b35a' : '#a89840';
            ctx.fillRect(0, y, 256, 8);
        }
        // Water damage stains
        for (var i = 0; i < 8; i++) {
            var sx = Math.random() * 256, sy = Math.random() * 256, sr = 15 + Math.random() * 40;
            var grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
            grd.addColorStop(0, 'rgba(80,60,20,0.4)'); grd.addColorStop(0.7, 'rgba(60,50,15,0.2)'); grd.addColorStop(1, 'transparent');
            ctx.fillStyle = grd; ctx.fillRect(0, 0, 256, 256);
        }
        // Cracks
        ctx.strokeStyle = 'rgba(50,40,10,0.3)'; ctx.lineWidth = 0.5;
        for (var i = 0; i < 5; i++) {
            ctx.beginPath(); ctx.moveTo(Math.random() * 256, Math.random() * 256);
            for (var j = 0; j < 4; j++) ctx.lineTo(Math.random() * 256, Math.random() * 256);
            ctx.stroke();
        }
        var tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1);
        return tex;
    }

    function createFloorTexture() {
        var c = document.createElement('canvas'); c.width = 256; c.height = 256;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#6b6030'; ctx.fillRect(0, 0, 256, 256);
        // Tile grid
        ctx.strokeStyle = '#555020'; ctx.lineWidth = 2;
        for (var x = 0; x < 256; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
        for (var y = 0; y < 256; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
        // Dirt splatter
        for (var i = 0; i < 20; i++) {
            ctx.fillStyle = 'rgba(40,35,10,' + (0.1 + Math.random() * 0.3) + ')';
            ctx.beginPath(); ctx.arc(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 12, 0, Math.PI * 2); ctx.fill();
        }
        var tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(COLS / 2, ROWS / 2);
        return tex;
    }

    function createCeilingTexture() {
        var c = document.createElement('canvas'); c.width = 128; c.height = 128;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#8a7d45'; ctx.fillRect(0, 0, 128, 128);
        // Panel lines
        ctx.strokeStyle = '#706530'; ctx.lineWidth = 1;
        for (var x = 0; x < 128; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke(); }
        for (var y = 0; y < 128; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
        // Discoloration
        for (var i = 0; i < 5; i++) {
            ctx.fillStyle = 'rgba(60,50,20,' + (0.1 + Math.random() * 0.2) + ')';
            ctx.beginPath(); ctx.arc(Math.random() * 128, Math.random() * 128, 8 + Math.random() * 20, 0, Math.PI * 2); ctx.fill();
        }
        var tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(COLS / 2, ROWS / 2);
        return tex;
    }

    // ---- INIT ----
    function init() {
        if (initialized) return; initialized = true;
        console.log('[Backrooms] init() starting...');

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x080600);
        scene.fog = new THREE.FogExp2(0x080600, 0.038);
        console.log('[Backrooms] scene created');

        camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 120);
        camera.position.y = 1.6;

        // Find player start
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
            if (MAZE[r][c] === 3) { playerPos.x = c * CELL + CELL / 2; playerPos.z = r * CELL + CELL / 2; }
        }
        camera.position.x = playerPos.x; camera.position.z = playerPos.z;
        console.log('[Backrooms] camera at', playerPos.x, playerPos.z);

        renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(1);

        // REAL RAYTRACING (Three.js Shadows)
        if (window.QualityFX && window.QualityFX.isRT()) {
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = window.QualityFX.isPT() ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
            console.log('[Backrooms] Real Raytracing Enabled');
        }

        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        renderer.domElement.addEventListener('click', function () { if (gameActive && !pointerLocked) renderer.domElement.requestPointerLock(); });

        console.log('[Backrooms] calling buildMaze...');
        buildMaze();
        console.log('[Backrooms] buildMaze done, calling createLighting...');
        createLighting();
        console.log('[Backrooms] lighting done, calling createPacman...');
        createPacman();
        console.log('[Backrooms] pacman done');
        spawnPellets();
        createDustParticles();
        createDistortionOverlay();
        createBlackoutOverlay();
        console.log('[Backrooms] init() complete, scene.children:', scene.children.length);
    }

    // ---- BUILD MAZE ----
    function buildMaze() {
        var wallTex = createWallpaperTexture();
        var floorTex = createFloorTexture();
        var ceilTex = createCeilingTexture();

        // RT settings
        var useShadows = window.QualityFX && window.QualityFX.isRT();

        // Floor
        var floorGeo = new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL);
        var floorMat = useShadows
            ? new THREE.MeshStandardMaterial({ map: floorTex, color: 0x4A3A28, roughness: 0.8 })
            : new THREE.MeshBasicMaterial({ map: floorTex, color: 0x4A3A28 });
        var floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set((COLS * CELL) / 2, 0, (ROWS * CELL) / 2);
        if (useShadows) floor.receiveShadow = true;
        scene.add(floor);

        // Ceiling
        var ceilMat = useShadows
            ? new THREE.MeshStandardMaterial({ map: ceilTex, color: 0x2A1E14, roughness: 0.9 })
            : new THREE.MeshBasicMaterial({ map: ceilTex, color: 0x2A1E14 });
        var ceil = new THREE.Mesh(floorGeo.clone(), ceilMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set((COLS * CELL) / 2, WALL_H, (ROWS * CELL) / 2);
        if (useShadows) ceil.receiveShadow = true;
        scene.add(ceil);

        // Walls
        var wallGeo = new THREE.BoxGeometry(CELL, WALL_H, CELL);
        var wallMat = useShadows
            ? new THREE.MeshStandardMaterial({ map: wallTex, color: 0xB5A44C, roughness: 0.7 })
            : new THREE.MeshBasicMaterial({ map: wallTex, color: 0xB5A44C });

        var wallCount = 0;
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                if (MAZE[r][c] === 1) {
                    var wall = new THREE.Mesh(wallGeo, wallMat);
                    wall.position.set(c * CELL + CELL / 2, WALL_H / 2, r * CELL + CELL / 2);
                    if (useShadows) {
                        wall.castShadow = true;
                        wall.receiveShadow = true;
                    }
                    scene.add(wall);
                    wallCount++;
                }
            }
        }
        console.log('[Backrooms] buildMaze complete — walls added:', wallCount, 'floor:', !!floor, 'scene children:', scene.children.length);
    }

    // ---- LIGHTING ----
    function createLighting() {
        var useShadows = window.QualityFX && window.QualityFX.isRT();

        // Hemisphere for ambient color bleed
        scene.add(new THREE.HemisphereLight(0xC0A040, 0x080400, 0.15));

        corridorLights = [];
        for (var r = 0; r < ROWS; r += 3) {
            for (var c = 0; c < COLS; c += 3) {
                if (MAZE[r][c] !== 1) {
                    var isDead = Math.random() < 0.30;
                    var flickerType = 'stable';
                    if (!isDead) {
                        var rng = Math.random();
                        if (rng < 0.15) flickerType = 'strobe';       // 15% fast strobe
                        else if (rng < 0.30) flickerType = 'slow_dim'; // 15% slow dim & brighten
                        else if (rng < 0.42) flickerType = 'sputter';  // 12% sputter (dying bulb)
                        else if (rng < 0.50) flickerType = 'buzz';     // 8% buzzing flicker
                    }

                    var light = new THREE.PointLight(0xFFE8A0, isDead ? 0 : 0.6, CELL * 3.5);
                    light.position.set(c * CELL + CELL / 2, WALL_H - 0.3, r * CELL + CELL / 2);

                    // Only key lights cast shadows to save performance
                    if (useShadows && !isDead && Math.random() < 0.3) {
                        light.castShadow = true;
                        light.shadow.bias = -0.001;
                    }

                    scene.add(light);

                    // Fixture mesh
                    var fixGeo = new THREE.BoxGeometry(1.6, 0.08, 0.25);
                    var fixMat = new THREE.MeshBasicMaterial({ color: isDead ? 0x555555 : 0xFFE8A0 });
                    var fixture = new THREE.Mesh(fixGeo, fixMat);
                    fixture.position.copy(light.position); fixture.position.y = WALL_H - 0.04;
                    scene.add(fixture);

                    corridorLights.push({
                        light: light, fixture: fixture, fixMat: fixMat,
                        baseIntensity: isDead ? 0 : 0.6,
                        flickerTimer: Math.random() * 10,
                        flickerType: flickerType,
                        dead: isDead,
                        sputterPhase: Math.random() * 100,
                        dimPhase: Math.random() * Math.PI * 2
                    });
                }
            }
        }

        // Player flashlight - realistic cone
        var flashlight = new THREE.SpotLight(0xFFEECC, 0.8, 35, Math.PI / 5.5, 0.6, 1.5);
        if (useShadows) {
            flashlight.castShadow = true;
            flashlight.shadow.mapSize.width = 1024;
            flashlight.shadow.mapSize.height = 1024;
            flashlight.shadow.bias = -0.0001;
        }
        camera.add(flashlight);
        flashlight.target.position.set(0, -0.3, -1);
        camera.add(flashlight.target);
        scene.add(camera);
    }

    // ---- DUST PARTICLES ----
    function createDustParticles() {
        var count = 600;
        var geo = new THREE.BufferGeometry();
        var positions = new Float32Array(count * 3);
        var sizes = new Float32Array(count);
        for (var i = 0; i < count; i++) {
            positions[i * 3] = Math.random() * COLS * CELL;
            positions[i * 3 + 1] = Math.random() * WALL_H;
            positions[i * 3 + 2] = Math.random() * ROWS * CELL;
            sizes[i] = 0.02 + Math.random() * 0.04;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        var mat = new THREE.PointsMaterial({ color: 0xCCBB88, size: 0.04, transparent: true, opacity: 0.3, sizeAttenuation: true });
        dustParticles = new THREE.Points(geo, mat);
        scene.add(dustParticles);
    }

    // ---- DISTORTION OVERLAY ----
    function createDistortionOverlay() {
        distortionOverlay = document.createElement('div');
        distortionOverlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;transition:opacity 0.3s;opacity:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,0.6) 100%);';
        distortionOverlay.innerHTML = '<div style="position:absolute;inset:0;mix-blend-mode:overlay;opacity:0;transition:opacity 0.2s;" id="chromatic-aberration"></div>';
        document.body.appendChild(distortionOverlay);
    }

    // ---- ELDRITCH PAC-MAN (NIGHTMARE EDITION) ----
    function createPacman(spawnPos, isExtra) {
        var group = new THREE.Group();
        var useShadows = window.QualityFX && window.QualityFX.isRT();

        // Body - deformed pulsating flesh/chitin sphere with darker tones
        var bodyGeo = new THREE.SphereGeometry(1.4, 32, 32);
        var verts = bodyGeo.attributes.position;
        for (var i = 0; i < verts.count; i++) {
            var x = verts.getX(i), y = verts.getY(i), z = verts.getZ(i);
            var noise = Math.sin(x * 7) * Math.cos(y * 5) * Math.sin(z * 6) * 0.18;
            var warp = Math.sin(x * 3 + y * 2) * 0.08;
            verts.setX(i, x + noise + warp);
            verts.setY(i, y + noise * 0.7);
            verts.setZ(i, z + noise - warp * 0.5);
        }
        bodyGeo.computeVertexNormals();

        var bodyMat = useShadows
            ? new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.4, metalness: 0.2 })
            : new THREE.MeshBasicMaterial({ color: 0x8B6914 });

        var body = new THREE.Mesh(bodyGeo, bodyMat);
        if (useShadows) { body.castShadow = true; body.receiveShadow = true; }
        group.add(body);
        pacmanParts.body = body;
        pacmanParts.bodyMat = bodyMat;

        // Vein-like surface detail (dark pulsing wireframe)
        var veinGeo = new THREE.SphereGeometry(1.42, 16, 16);
        var veinMat = new THREE.MeshBasicMaterial({ color: 0x440000, wireframe: true, transparent: true, opacity: 0.3 });
        var veins = new THREE.Mesh(veinGeo, veinMat);
        group.add(veins);
        pacmanParts.veins = veins;
        pacmanParts.veinMat = veinMat;

        // Upper jaw — larger, more menacing
        var jawUpperGeo = new THREE.SphereGeometry(1.45, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        var jawMat = useShadows
            ? new THREE.MeshStandardMaterial({ color: 0x7A5800, roughness: 0.3 })
            : new THREE.MeshBasicMaterial({ color: 0x7A5800 });
        var jawUpper = new THREE.Mesh(jawUpperGeo, jawMat);
        if (useShadows) jawUpper.castShadow = true;
        group.add(jawUpper);
        pacmanParts.jawUpper = jawUpper;

        // Lower jaw - animated
        var jawLowerGeo = new THREE.SphereGeometry(1.45, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        var jawLower = new THREE.Mesh(jawLowerGeo, jawMat.clone());
        if (useShadows) jawLower.castShadow = true;
        group.add(jawLower);
        pacmanParts.jawLower = jawLower;

        // Teeth — longer, sharper, varied lengths
        var toothMat = new THREE.MeshBasicMaterial({ color: 0xDDCCBB });
        pacmanParts.teeth = [];
        for (var i = 0; i < 18; i++) {
            var angle = (i / 18) * Math.PI * 2;
            var toothLen = 0.4 + Math.random() * 0.2;
            var tGeo = new THREE.ConeGeometry(0.06 + Math.random() * 0.04, toothLen, 4);
            var tooth = new THREE.Mesh(tGeo, toothMat);
            tooth.position.set(Math.cos(angle) * 1.15, -0.05, Math.sin(angle) * 1.15);
            tooth.rotation.z = Math.PI;
            tooth.lookAt(0, -1, 0);
            group.add(tooth);
            pacmanParts.teeth.push(tooth);
            var tooth2 = new THREE.Mesh(tGeo, toothMat);
            tooth2.position.set(Math.cos(angle) * 1.1, 0.05, Math.sin(angle) * 1.1);
            tooth2.lookAt(0, 1, 0);
            group.add(tooth2);
            pacmanParts.teeth.push(tooth2);
        }

        // Inner mouth — deeper red, pulsing horror
        var mouthGeo = new THREE.SphereGeometry(1.0, 16, 16);
        var mouthMat = new THREE.MeshBasicMaterial({ color: 0xCC0000, side: THREE.BackSide });
        var mouth = new THREE.Mesh(mouthGeo, mouthMat);
        group.add(mouth);
        pacmanParts.mouthMat = mouthMat;

        // Drool strands hanging from jaw
        pacmanParts.drool = [];
        for (var i = 0; i < 6; i++) {
            var dAngle = (i / 6) * Math.PI * 2;
            var droolGeo = new THREE.CylinderGeometry(0.015, 0.005, 0.6 + Math.random() * 0.4, 4);
            var droolMat = new THREE.MeshBasicMaterial({ color: 0x99AA44, transparent: true, opacity: 0.5 });
            var drool = new THREE.Mesh(droolGeo, droolMat);
            drool.position.set(Math.cos(dAngle) * 0.9, -0.4, Math.sin(dAngle) * 0.9);
            drool.userData = { phase: Math.random() * Math.PI * 2 };
            group.add(drool);
            pacmanParts.drool.push(drool);
        }

        // Eyes - 5 bloodshot eyes (asymmetric, unsettling)
        pacmanParts.eyes = [];
        var eyePositions = [
            { x: -0.6, y: 0.8, z: -0.9, s: 0.25 },
            { x: 0.5, y: 0.75, z: -0.95, s: 0.22 },
            { x: 0, y: 1.05, z: -0.7, s: 0.2 },
            { x: -0.3, y: 0.45, z: -1.05, s: 0.15 },
            { x: 0.65, y: 0.4, z: -0.8, s: 0.13 }
        ];
        for (var i = 0; i < eyePositions.length; i++) {
            var ep = eyePositions[i];
            var scleraGeo = new THREE.SphereGeometry(ep.s, 12, 12);
            var scleraMat = new THREE.MeshBasicMaterial({ color: 0xFFCCCC });
            var sclera = new THREE.Mesh(scleraGeo, scleraMat);
            sclera.position.set(ep.x, ep.y, ep.z);
            group.add(sclera);
            var irisGeo = new THREE.SphereGeometry(ep.s * 0.6, 8, 8);
            var irisMat = new THREE.MeshBasicMaterial({ color: i < 3 ? 0xFF2200 : 0xFFAA00 });
            var iris = new THREE.Mesh(irisGeo, irisMat);
            iris.position.set(ep.x, ep.y, ep.z - ep.s * 0.55);
            group.add(iris);
            var pupilGeo = new THREE.SphereGeometry(ep.s * 0.35, 6, 6);
            var pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
            var pupil = new THREE.Mesh(pupilGeo, pupilMat);
            pupil.position.set(ep.x, ep.y, ep.z - ep.s * 0.8);
            group.add(pupil);
            pacmanParts.eyes.push({ iris: iris, pupil: pupil, sclera: sclera, basePos: { x: ep.x, y: ep.y, z: ep.z }, size: ep.s });
        }

        // Spines protruding from the top
        pacmanParts.spines = [];
        for (var i = 0; i < 12; i++) {
            var sAngle = (i / 12) * Math.PI * 2;
            var spineLen = 0.3 + Math.random() * 0.5;
            var spineGeo = new THREE.ConeGeometry(0.04, spineLen, 4);
            var spineMat = new THREE.MeshBasicMaterial({ color: 0x554400 });
            var spine = new THREE.Mesh(spineGeo, spineMat);
            var sx = Math.cos(sAngle) * (0.8 + Math.random() * 0.4);
            var sz = Math.sin(sAngle) * (0.8 + Math.random() * 0.4);
            spine.position.set(sx, 0.9 + Math.random() * 0.3, sz);
            spine.lookAt(sx * 2, 2, sz * 2);
            group.add(spine);
            pacmanParts.spines.push(spine);
        }

        // Tendrils — more, longer, thicker
        pacmanParts.tendrils = [];
        for (var i = 0; i < 12; i++) {
            var angle = (i / 12) * Math.PI * 2;
            var tLen = 1.5 + Math.random() * 1.0;
            var tendGeo = new THREE.CylinderGeometry(0.03, 0.1, tLen, 6);
            var tendMat = new THREE.MeshBasicMaterial({ color: 0x665500 });
            var tendril = new THREE.Mesh(tendGeo, tendMat);
            tendril.position.set(Math.cos(angle) * 1.2, -0.4, Math.sin(angle) * 1.2);
            tendril.userData = { angle: angle, phase: Math.random() * Math.PI * 2 };
            group.add(tendril);
            pacmanParts.tendrils.push(tendril);
        }

        // Glow light — more intense
        var glow = new THREE.PointLight(0xFF4400, 2.0, 18);
        group.add(glow);
        pacmanParts.glow = glow;

        // Shadow trail light (dark)
        var shadowLight = new THREE.PointLight(0x110000, 0.4, 10);
        shadowLight.position.y = -0.5;
        group.add(shadowLight);

        // Set initial position
        if (spawnPos) {
            group.position.set(spawnPos.x, 1.3, spawnPos.z);
        } else {
            for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
                if (MAZE[r][c] === 4) group.position.set(c * CELL + CELL / 2, 1.3, r * CELL + CELL / 2);
            }
        }
        var diffMult = GameUtils.getMultiplier();
        var baseSpeed = 3.4 * (0.7 + diffMult * 0.4); // Scales with difficulty
        group.userData = { speed: baseSpeed, pathTimer: 0, path: [], mode: 'patrol', patrolTarget: null, rageMode: false, lastPlayerRow: -1, lastPlayerCol: -1, ambushTimer: 0, hearingRange: 18 + diffMult * 3 };
        scene.add(group);
        if (isExtra) {
            extraPacmans.push(group);
        } else {
            pacman = group;
        }
    }

    // ---- PELLETS ----
    function spawnPellets() {
        var pelletGeo = new THREE.SphereGeometry(0.18, 16, 16);
        var pelletMat = new THREE.MeshBasicMaterial({ color: 0xFFFF44 });
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                if (MAZE[r][c] === 2) {
                    var p = new THREE.Mesh(pelletGeo, pelletMat.clone());
                    p.position.set(c * CELL + CELL / 2, 1.0, r * CELL + CELL / 2);
                    p.userData = { row: r, col: c, collected: false };
                    // Individual glow
                    var pLight = new THREE.PointLight(0xFFFF00, 0.15, 3);
                    p.add(pLight);
                    scene.add(p);
                    pellets.push(p);
                    totalPellets++;
                }
            }
        }
        updateHUD();
    }

    // ---- A* PATHFINDING ----
    function findPath(sr, sc, er, ec) {
        var open = [{ r: sr, c: sc, g: 0, h: 0, f: 0, parent: null }];
        var closed = {};
        var key = function (r, c) { return r * COLS + c; };
        closed[key(sr, sc)] = true;
        var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        while (open.length > 0) {
            // Find lowest f
            var bestIdx = 0;
            for (var i = 1; i < open.length; i++) { if (open[i].f < open[bestIdx].f) bestIdx = i; }
            var cur = open.splice(bestIdx, 1)[0];
            if (cur.r === er && cur.c === ec) {
                var path = []; var node = cur;
                while (node.parent) { path.unshift({ r: node.r, c: node.c }); node = node.parent; }
                return path;
            }
            for (var d = 0; d < dirs.length; d++) {
                var nr = cur.r + dirs[d][0], nc = cur.c + dirs[d][1];
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !closed[key(nr, nc)] && MAZE[nr][nc] !== 1) {
                    closed[key(nr, nc)] = true;
                    var g = cur.g + 1;
                    var h = Math.abs(nr - er) + Math.abs(nc - ec); // Manhattan heuristic
                    open.push({ r: nr, c: nc, g: g, h: h, f: g + h, parent: cur });
                }
            }
        }
        return [];
    }

    // ---- GAME FLOW ----
    function startGame() {
        if (!GameUtils.checkWebGL()) { document.getElementById('start-screen').style.display = 'none'; GameUtils.showBrowserError(); return; }
        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        console.log('[Backrooms] startGame - calling init()...');
        try { init(); } catch (e) { console.error('Init error:', e); GameUtils.showBrowserError(); return; }
        console.log('[Backrooms] init() returned successfully');
        setupExtraSpawnTimers();
        HorrorAudio.startDrone(55, 'dark'); HorrorAudio.startHeartbeat(60);
        setTimeout(function () {
            ctrl.classList.add('hiding');
            setTimeout(function () {
                ctrl.style.display = 'none'; ctrl.classList.remove('hiding');
                gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('minimap-container').style.display = 'block';
                document.getElementById('back-link').style.display = 'none';
                try { renderer.domElement.requestPointerLock(); } catch (e) { }
                lastTime = performance.now(); animate();
            }, 800);
        }, 3500);
    }

    function restartGame() {
        cloneMaze();
        pellets.forEach(function (p) { scene.remove(p); }); pellets = []; totalPellets = 0; collectedPellets = 0;
        yaw = 0; pitch = 0; keys = {}; isRunning = false; camShake = 0;
        if (pacman) scene.remove(pacman); pacman = null;
        for (var i = 0; i < extraPacmans.length; i++) scene.remove(extraPacmans[i]);
        extraPacmans = [];
        stamina = maxStamina; staminaDrained = false;
        gameElapsed = 0; extraSpawnTimers = [];
        setupExtraSpawnTimers();
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
            if (MAZE[r][c] === 3) { playerPos.x = c * CELL + CELL / 2; playerPos.z = r * CELL + CELL / 2; }
        }
        camera.position.x = playerPos.x; camera.position.z = playerPos.z;
        createPacman(); spawnPellets();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        document.getElementById('minimap-container').style.display = 'block';
        HorrorAudio.startDrone(55, 'dark'); HorrorAudio.startHeartbeat(60);
        gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
        try { renderer.domElement.requestPointerLock(); } catch (e) { }
        lastTime = performance.now(); animate();
    }

    // ---- COLLISION ----
    function canMoveTo(x, z) {
        var m = 0.4;
        var checks = [{ x: x - m, z: z - m }, { x: x + m, z: z - m }, { x: x - m, z: z + m }, { x: x + m, z: z + m }];
        for (var i = 0; i < checks.length; i++) {
            var col = Math.floor(checks[i].x / CELL), row = Math.floor(checks[i].z / CELL);
            if (row < 0 || row >= ROWS || col < 0 || col >= COLS || MAZE[row][col] === 1) return false;
        }
        return true;
    }

    // ---- PLAYER UPDATE (VELOCITY-BASED SPRINT WITH STAMINA) ----
    function updatePlayer(dt) {
        var diff = GameUtils.getDifficulty();
        var hasStamina = (diff === 'hard' || diff === 'nightmare');

        // Stamina management
        if (hasStamina) {
            if (isRunning && stamina > 0 && !staminaDrained) {
                var drainRate = diff === 'nightmare' ? 30 : 20; // Nightmare drains faster
                stamina = Math.max(0, stamina - drainRate * dt);
                if (stamina <= 0) { staminaDrained = true; isRunning = false; }
            } else {
                var regenRate = diff === 'nightmare' ? 8 : 12;
                stamina = Math.min(maxStamina, stamina + regenRate * dt);
                if (stamina > 25) staminaDrained = false; // Must regen to 25% before sprinting again
            }
        }

        // Can't sprint if stamina drained
        var canSprint = isRunning && (!hasStamina || (!staminaDrained && stamina > 0));

        // Velocity-based speed — sprint ramps up and decelerates
        var targetSpeed = 0;
        var fx = -Math.sin(yaw), fz = -Math.cos(yaw);
        var rx = Math.cos(yaw), rz = -Math.sin(yaw);
        var inputX = 0, inputZ = 0;
        if (keys['KeyW']) { inputX += fx; inputZ += fz; } if (keys['KeyS']) { inputX -= fx; inputZ -= fz; }
        if (keys['KeyA']) { inputX -= rx; inputZ -= rz; } if (keys['KeyD']) { inputX += rx; inputZ += rz; }
        var inputLen = Math.sqrt(inputX * inputX + inputZ * inputZ);
        if (inputLen > 0) {
            inputX /= inputLen; inputZ /= inputLen;
            targetSpeed = canSprint ? 11 : 5;
        }

        // Smooth acceleration / deceleration
        var accel = canSprint ? 18 : 14;
        var decel = 10;
        if (targetSpeed > currentSpeed) {
            currentSpeed = Math.min(targetSpeed, currentSpeed + accel * dt);
        } else {
            currentSpeed = Math.max(targetSpeed, currentSpeed - decel * dt);
        }

        // Apply velocity
        var mx = inputX * currentSpeed * dt;
        var mz = inputZ * currentSpeed * dt;
        if (mx !== 0 || mz !== 0) {
            if (canMoveTo(playerPos.x + mx, playerPos.z)) playerPos.x += mx;
            if (canMoveTo(playerPos.x, playerPos.z + mz)) playerPos.z += mz;
            footstepTimer -= dt;
            if (footstepTimer <= 0) {
                HorrorAudio.playFootstep('stone');
                footstepTimer = canSprint ? 0.2 : 0.4;
            }
        } else {
            currentSpeed = Math.max(0, currentSpeed - decel * dt);
        }

        // Enhanced head bob — stronger when sprinting
        var bobSpeed = isRunning ? 0.016 : 0.008;
        var bobAmp = isRunning ? 0.12 : 0.04;
        var bobT = Date.now() * bobSpeed;
        var isMoving = currentSpeed > 0.5;
        var headBob = isMoving ? Math.sin(bobT) * bobAmp : 0;
        var headTilt = isMoving ? Math.cos(bobT * 0.5) * (isRunning ? 0.015 : 0.005) : 0;

        camera.position.x = playerPos.x;
        camera.position.z = playerPos.z;
        camera.position.y = 1.6 + headBob;

        // Camera shake from proximity
        if (camShake > 0) {
            camera.position.x += (Math.random() - 0.5) * camShake * 0.15;
            camera.position.z += (Math.random() - 0.5) * camShake * 0.15;
            camera.position.y += (Math.random() - 0.5) * camShake * 0.08;
        }
        camera.rotation.order = 'YXZ';
        camera.rotation.y = yaw + headTilt;
        camera.rotation.x = pitch;
    }

    // ---- PAC-MAN AI ----
    function getOpenCells() {
        var cells = [];
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { if (MAZE[r][c] !== 1) cells.push({ r: r, c: c }); }
        return cells;
    }

    function updateSinglePacman(pac, pacParts, dt) {
        if (!pac) return;
        var ud = pac.userData;
        var diffMult = GameUtils.getMultiplier();
        var pacRow = Math.floor(pac.position.z / CELL);
        var pacCol = Math.floor(pac.position.x / CELL);
        var playerRow = Math.floor(playerPos.z / CELL);
        var playerCol = Math.floor(playerPos.x / CELL);
        var ddx = pac.position.x - playerPos.x, ddz = pac.position.z - playerPos.z;
        var pacDist = Math.sqrt(ddx * ddx + ddz * ddz);

        // Rage mode when few pellets remain
        var pelletsLeft = totalPellets - collectedPellets;
        ud.rageMode = pelletsLeft <= Math.ceil(totalPellets * 0.2);
        var speedMul = ud.rageMode ? 1.8 : 1.15; // Pac-Man is faster overall, rage is terrifying

        // Hearing — detect running from farther
        var hearingDist = isRunning ? 30 : ud.hearingRange;

        // AI mode selection
        ud.ambushTimer -= dt;
        if (pacDist > hearingDist && !ud.rageMode) {
            ud.mode = 'patrol';
        } else if (ud.ambushTimer <= 0 && Math.random() < 0.15 && pacDist > 8) {
            ud.mode = 'ambush';
            ud.ambushTimer = 5 + Math.random() * 5;
        } else {
            ud.mode = 'chase';
        }

        // Path update
        ud.pathTimer -= dt;
        if (ud.pathTimer <= 0) {
            ud.pathTimer = ud.rageMode ? 0.2 : 0.35;
            if (ud.mode === 'chase') {
                ud.path = findPath(pacRow, pacCol, playerRow, playerCol);
            } else if (ud.mode === 'ambush') {
                // Predict player position - move to where they're heading
                var predR = playerRow + Math.round(-Math.cos(yaw) * 4);
                var predC = playerCol + Math.round(-Math.sin(yaw) * 4);
                predR = Math.max(1, Math.min(ROWS - 2, predR));
                predC = Math.max(1, Math.min(COLS - 2, predC));
                if (MAZE[predR] && MAZE[predR][predC] !== 1) {
                    ud.path = findPath(pacRow, pacCol, predR, predC);
                } else {
                    ud.path = findPath(pacRow, pacCol, playerRow, playerCol);
                }
            } else {
                // Patrol - pick a random intersection
                if (!ud.patrolTarget || (Math.abs(pacRow - ud.patrolTarget.r) < 2 && Math.abs(pacCol - ud.patrolTarget.c) < 2)) {
                    var cells = getOpenCells();
                    ud.patrolTarget = cells[Math.floor(Math.random() * cells.length)];
                }
                ud.path = findPath(pacRow, pacCol, ud.patrolTarget.r, ud.patrolTarget.c);
            }
        }

        // Movement
        if (ud.path && ud.path.length > 0) {
            var next = ud.path[0];
            var tx = next.c * CELL + CELL / 2, tz = next.r * CELL + CELL / 2;
            var dx = tx - pac.position.x, dz = tz - pac.position.z;
            var dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 0.3) ud.path.shift();
            else {
                var spd = ud.speed * diffMult * speedMul * dt;
                pac.position.x += (dx / dist) * spd;
                pac.position.z += (dz / dist) * spd;
                pac.rotation.y = Math.atan2(dx, dz);
            }
        }

        // ---- ANIMATE PAC-MAN ----
        pacmanAnimTime += dt;
        var t = pacmanAnimTime;

        // Jaw animation - opens wider when close to player
        var jawOpen = (0.15 + (pacDist < 8 ? 0.35 * (1 - pacDist / 8) : 0)) * (0.5 + Math.sin(t * 4) * 0.5);
        if (pacmanParts.jawUpper) pacmanParts.jawUpper.rotation.x = -jawOpen * 0.4;
        if (pacmanParts.jawLower) pacmanParts.jawLower.rotation.x = jawOpen * 0.6;

        // Body pulsation
        var pulse = 1 + Math.sin(t * 2.5) * 0.04;
        if (pacParts.body) pacParts.body.scale.set(pulse, pulse * 0.95, pulse);

        // Mouth glow color
        if (pacParts.mouthMat) pacParts.mouthMat.color.setHex(jawOpen > 0.3 ? 0xFF4400 : 0xCC0000);

        // Body color shifts to darker red when close
        if (pacParts.bodyMat) {
            var rage = Math.max(0, 1 - pacDist / 15);
            pacParts.bodyMat.color.setHex(rage > 0.5 ? 0xAA3300 : 0x8B6914);
        }

        // Veins pulse more when close
        if (pacParts.veinMat) {
            pacParts.veinMat.opacity = 0.2 + Math.sin(t * 6) * 0.15 + (pacDist < 10 ? 0.3 : 0);
        }

        // Drool strands swing
        if (pacParts.drool) {
            for (var i = 0; i < pacParts.drool.length; i++) {
                var d = pacParts.drool[i];
                d.rotation.x = Math.sin(t * 2 + d.userData.phase) * 0.3;
                d.rotation.z = Math.cos(t * 1.5 + d.userData.phase) * 0.2;
                d.scale.y = 1 + Math.sin(t * 3 + i) * 0.2;
            }
        }

        // Eyes track player — all 5 eyes with independent twitching
        for (var i = 0; i < pacParts.eyes.length; i++) {
            var eye = pacParts.eyes[i];
            var dirX = playerPos.x - pac.position.x, dirZ = playerPos.z - pac.position.z;
            var dirLen = Math.sqrt(dirX * dirX + dirZ * dirZ);
            if (dirLen > 0) {
                var s = eye.size || 0.22;
                var twitch = Math.sin(t * 8 + i * 3) * 0.02;
                var lookX = (dirX / dirLen) * s * 0.3 + twitch;
                var lookZ = (dirZ / dirLen) * s * 0.3;
                eye.iris.position.x = eye.basePos.x + lookX;
                eye.iris.position.z = eye.basePos.z + lookZ - s * 0.55;
                eye.pupil.position.x = eye.basePos.x + lookX * 1.3;
                eye.pupil.position.z = eye.basePos.z + lookZ * 1.3 - s * 0.8;
            }
        }

        // Spines pulse outward when enraged
        if (pacParts.spines) {
            for (var i = 0; i < pacParts.spines.length; i++) {
                var sp = pacParts.spines[i];
                var spPulse = 1 + (ud.rageMode ? Math.sin(t * 8 + i) * 0.3 : Math.sin(t * 2 + i) * 0.1);
                sp.scale.set(spPulse, spPulse, spPulse);
            }
        }

        // Tendrils wave — more aggressive
        for (var i = 0; i < pacParts.tendrils.length; i++) {
            var tend = pacParts.tendrils[i];
            var phase = tend.userData.phase;
            tend.rotation.x = Math.sin(t * 4 + phase) * 0.8;
            tend.rotation.z = Math.cos(t * 3 + phase) * 0.6;
            if (pacDist < 6) {
                var reach = (1 - pacDist / 6) * 0.5;
                tend.scale.y = 1 + reach;
            } else {
                tend.scale.y = 1;
            }
        }

        // Glow intensity based on proximity
        if (pacParts.glow) {
            pacParts.glow.intensity = 1 + Math.max(0, (10 - pacDist) / 10) * 3;
            pacParts.glow.color.setHex(ud.rageMode ? 0xFF0000 : 0xFF4400);
        }

        // Bob
        pac.position.y = 1.3 + Math.sin(t * 2) * 0.2;

        // Dynamic heartbeat (use closest pacman)
        var bpm = Math.min(180, Math.max(50, 200 - pacDist * 5));
        HorrorAudio.setHeartbeatBPM(Math.round(bpm));

        // Camera shake & distortion
        var shakeAmt = Math.max(0, (8 - pacDist) / 8) * (ud.rageMode ? 1.5 : 1);
        if (shakeAmt > camShake) camShake = shakeAmt;
        if (distortionOverlay) {
            var distAmt = Math.min(1, Math.max(0, (10 - pacDist) / 10) * 0.7);
            var cur = parseFloat(distortionOverlay.style.opacity) || 0;
            if (distAmt > cur) distortionOverlay.style.opacity = distAmt;
        }

        // Nearby lights flicker violently
        for (var i = 0; i < corridorLights.length; i++) {
            var cl = corridorLights[i];
            if (cl.dead) continue;
            var lx = cl.light.position.x - pac.position.x, lz = cl.light.position.z - pac.position.z;
            var ldist = Math.sqrt(lx * lx + lz * lz);
            if (ldist < 8) cl.light.intensity = cl.baseIntensity * (0.2 + Math.random() * 0.8);
        }

        // Kill check
        if (pacDist < 1.8) gameOver();
    }

    // Wrapper: update ALL pacmans
    function updatePacman(dt) {
        camShake = 0; // Reset per frame, each pac can increase it
        if (distortionOverlay) distortionOverlay.style.opacity = '0';
        updateSinglePacman(pacman, pacmanParts, dt);
        for (var i = 0; i < extraPacmans.length; i++) {
            updateSinglePacman(extraPacmans[i], extraPacmans[i].pacParts || {}, dt);
        }
    }

    // ---- PELLET UPDATE ----
    function updatePellets() {
        for (var i = 0; i < pellets.length; i++) {
            var p = pellets[i];
            if (p.userData.collected) continue;
            p.position.y = 1.0 + Math.sin(Date.now() * 0.003 + p.userData.row) * 0.15;
            p.rotation.y += 0.02;
            var dx = p.position.x - playerPos.x, dz = p.position.z - playerPos.z;
            if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
                p.userData.collected = true; scene.remove(p); collectedPellets++;
                HorrorAudio.playCollect(); updateHUD();
                if (window.ChallengeManager) {
                    ChallengeManager.notify('backrooms-pacman', 'pellets', 1);
                    ChallengeManager.notify('backrooms-pacman', 'score', collectedPellets * 100);
                }
                if (collectedPellets >= totalPellets) gameWin();
            }
        }
    }

    // ---- FLICKERING LIGHTS (ADVANCED) ----
    function updateFlickeringLights(dt) {
        var now = Date.now();
        for (var i = 0; i < corridorLights.length; i++) {
            var cl = corridorLights[i];
            if (cl.dead) {
                cl.light.intensity = 0;
                if (cl.fixMat) cl.fixMat.color.setHex(0x333333);
                continue;
            }

            // During blackout, all lights go dark
            if (blackoutActive) {
                cl.light.intensity = 0;
                if (cl.fixMat) cl.fixMat.color.setHex(0x222222);
                continue;
            }

            var intensity = cl.baseIntensity;
            switch (cl.flickerType) {
                case 'strobe':
                    // Fast strobing effect
                    intensity = Math.sin(now * 0.025 + i * 2.3) > 0.2 ? cl.baseIntensity : 0;
                    break;
                case 'slow_dim':
                    // Slowly dims to near-darkness then brightens back
                    cl.dimPhase += dt * 0.5;
                    var dimCurve = (Math.sin(cl.dimPhase) + 1) * 0.5; // 0 to 1
                    intensity = cl.baseIntensity * (0.05 + dimCurve * 0.95);
                    break;
                case 'sputter':
                    // Dying bulb — random bursts of light with long dark periods
                    cl.sputterPhase += dt;
                    var sputterCycle = Math.sin(cl.sputterPhase * 2.5) + Math.sin(cl.sputterPhase * 7.3);
                    if (sputterCycle > 1.2) {
                        intensity = cl.baseIntensity * (0.4 + Math.random() * 0.6);
                    } else {
                        intensity = cl.baseIntensity * 0.03;
                    }
                    break;
                case 'buzz':
                    // High-frequency buzzing flicker
                    intensity = cl.baseIntensity * (0.6 + Math.sin(now * 0.05 + i * 11) * 0.2 + Math.random() * 0.15);
                    break;
                default:
                    // Stable with occasional random flicker
                    cl.flickerTimer -= dt;
                    if (cl.flickerTimer <= 0) {
                        cl.flickerTimer = 4 + Math.random() * 12;
                        // Quick flicker burst
                        intensity = 0.02;
                    } else {
                        intensity = cl.baseIntensity + Math.sin(now * 0.006 + i * 5.7) * 0.08;
                    }
            }

            cl.light.intensity = Math.max(0, intensity);
            // Fixture color matches light state
            if (cl.fixMat) {
                cl.fixMat.color.setHex(intensity > 0.1 ? 0xFFE8A0 : 0x554422);
            }
        }
    }

    // ---- BLACKOUT SYSTEM ----
    function createBlackoutOverlay() {
        blackoutOverlay = document.createElement('div');
        blackoutOverlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60;opacity:0;background:black;transition:opacity 0.8s ease-in;';
        // Warning text
        var warning = document.createElement('div');
        warning.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#440000;font-size:2rem;font-family:monospace;text-align:center;opacity:0;transition:opacity 1s;';
        warning.id = 'blackout-warning';
        warning.textContent = '';
        blackoutOverlay.appendChild(warning);
        document.body.appendChild(blackoutOverlay);
    }

    function updateBlackout(dt) {
        if (!blackoutOverlay) return;
        if (blackoutActive) {
            blackoutTimer -= dt;
            // Pulsing red text during blackout
            var warn = document.getElementById('blackout-warning');
            if (warn) {
                warn.style.opacity = (0.5 + Math.sin(Date.now() * 0.005) * 0.5);
                warn.textContent = Math.ceil(blackoutTimer) > 0 ? '◈ LIGHTS OUT ◈' : '';
                warn.style.color = 'rgb(' + Math.floor(68 + Math.sin(Date.now() * 0.008) * 40) + ',0,0)';
            }
            if (blackoutTimer <= 0) {
                // End blackout — lights flicker back on
                blackoutActive = false;
                blackoutOverlay.style.opacity = '0';
                if (warn) warn.style.opacity = '0';
                nextBlackout = 20 + Math.random() * 30;
            }
        } else {
            nextBlackout -= dt;
            if (nextBlackout <= 0 && gameActive) {
                // Start blackout!
                blackoutActive = true;
                blackoutTimer = 4 + Math.random() * 2; // 4-6 seconds
                blackoutOverlay.style.opacity = '0.85';
                HorrorAudio.playJumpScare(); // scary sound on blackout
            }
        }
    }

    // ---- DUST UPDATE ----
    function updateDust(dt) {
        if (!dustParticles) return;
        var pos = dustParticles.geometry.attributes.position;
        for (var i = 0; i < pos.count; i++) {
            pos.array[i * 3] += Math.sin(Date.now() * 0.0005 + i) * 0.003;
            pos.array[i * 3 + 1] += Math.sin(Date.now() * 0.0003 + i * 2) * 0.002;
            pos.array[i * 3 + 2] += Math.cos(Date.now() * 0.0004 + i * 3) * 0.003;
        }
        pos.needsUpdate = true;
    }

    // ---- HUD & MINIMAP ----
    function updateHUD() {
        var el = document.getElementById('hud-score');
        if (el) el.textContent = 'Pellets: ' + collectedPellets + ' / ' + totalPellets;
        // Stamina bar
        var diff = GameUtils.getDifficulty();
        var bar = document.getElementById('stamina-bar-fill');
        var barC = document.getElementById('stamina-bar-container');
        if (diff === 'hard' || diff === 'nightmare') {
            if (barC) barC.style.display = 'block';
            if (bar) {
                bar.style.width = (stamina / maxStamina * 100) + '%';
                bar.style.background = staminaDrained ? '#cc2222' : (stamina < 30 ? '#ff6600' : '#00cc66');
            }
        } else {
            if (barC) barC.style.display = 'none';
        }
        // Pac-Man count
        var countEl = document.getElementById('hud-pacman-count');
        if (countEl) {
            var total = 1 + extraPacmans.length;
            countEl.textContent = total > 1 ? '☠️ x' + total : '';
        }
    }

    function drawMinimap() {
        var canvas = document.getElementById('minimap-canvas');
        var ctx = canvas.getContext('2d');
        var size = 180, cw = size / COLS, ch = size / ROWS;
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = 'rgba(140,120,40,0.4)';
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (MAZE[r][c] === 1) ctx.fillRect(c * cw, r * ch, cw, ch);
        for (var i = 0; i < pellets.length; i++) {
            if (!pellets[i].userData.collected) {
                ctx.fillStyle = 'rgba(255,255,0,0.7)'; ctx.beginPath();
                ctx.arc(pellets[i].userData.col * cw + cw / 2, pellets[i].userData.row * ch + ch / 2, 1.5, 0, Math.PI * 2); ctx.fill();
            }
        }
        // Draw ALL pacmans
        var allPacs = [pacman].concat(extraPacmans);
        for (var i = 0; i < allPacs.length; i++) {
            var p = allPacs[i];
            if (!p) continue;
            ctx.fillStyle = i === 0 ? '#FF0000' : '#FF6600'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc((p.position.x / CELL) * cw, (p.position.z / CELL) * ch, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }
        var px = (playerPos.x / CELL) * cw, pz = (playerPos.z / CELL) * ch;
        ctx.fillStyle = '#00FF88'; ctx.shadowColor = '#00FF88'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(px, pz, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#00FF88'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px, pz); ctx.lineTo(px - Math.sin(yaw) * 10, pz - Math.cos(yaw) * 10); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // ---- GAME OVER / WIN ----
    function gameOver() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playJumpScare(); setTimeout(function () { HorrorAudio.playDeath(); }, 400);
        HorrorAudio.stopHeartbeat(); HorrorAudio.stopDrone();
        try { document.exitPointerLock(); } catch (e) { }
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        document.getElementById('minimap-container').style.display = 'none';
        if (distortionOverlay) distortionOverlay.style.opacity = '0';
        var retryBtn = document.querySelector('#game-over-screen .play-btn');
        if (retryBtn) retryBtn.onclick = restartGame;
    }

    function gameWin() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.WIN);
        HorrorAudio.playWin(); HorrorAudio.stopHeartbeat(); HorrorAudio.stopDrone();
        try { document.exitPointerLock(); } catch (e) { }
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        document.getElementById('minimap-container').style.display = 'none';
        if (distortionOverlay) distortionOverlay.style.opacity = '0';
        var retryBtn = document.querySelector('#game-win-screen .play-btn');
        if (retryBtn) retryBtn.onclick = restartGame;
    }

    // ---- EXTRA PAC-MAN SPAWN SYSTEM ----
    function setupExtraSpawnTimers() {
        extraSpawnTimers = [];
        var diff = GameUtils.getDifficulty();
        if (diff === 'hard') {
            extraSpawnTimers.push({ time: 30, spawned: false }); // +1 at 30s
        } else if (diff === 'nightmare') {
            extraSpawnTimers.push({ time: 20, spawned: false }); // +1 at 20s
            extraSpawnTimers.push({ time: 45, spawned: false }); // +1 at 45s
        }
    }

    function spawnExtraPacman() {
        var cells = getOpenCells();
        // Pick a cell far from player
        var bestCell = null, bestDist = 0;
        for (var i = 0; i < 20; i++) {
            var c = cells[Math.floor(Math.random() * cells.length)];
            var cx = c.c * CELL + CELL / 2, cz = c.r * CELL + CELL / 2;
            var dx = cx - playerPos.x, dz = cz - playerPos.z;
            var d = Math.sqrt(dx * dx + dz * dz);
            if (d > bestDist) { bestDist = d; bestCell = c; }
        }
        if (!bestCell) bestCell = cells[Math.floor(Math.random() * cells.length)];
        var sx = bestCell.c * CELL + CELL / 2, sz = bestCell.r * CELL + CELL / 2;
        createPacman({ x: sx, z: sz }, true);
        // Store pacParts reference on the extra group for animation
        var ep = extraPacmans[extraPacmans.length - 1];
        ep.pacParts = Object.assign({}, pacmanParts); // snapshot current parts (they were just built)
        showSpawnWarning();
    }

    function showSpawnWarning() {
        if (!spawnWarningEl) {
            spawnWarningEl = document.createElement('div');
            spawnWarningEl.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);z-index:80;pointer-events:none;text-align:center;font-family:Creepster,cursive;transition:opacity 0.5s;';
            document.body.appendChild(spawnWarningEl);
        }
        var count = 1 + extraPacmans.length;
        spawnWarningEl.innerHTML = '<div style="font-size:2.5rem;color:#ff2200;text-shadow:0 0 30px #ff0000,0 0 60px #880000;animation:pulse 0.5s ease-in-out 3;">⚠️ ANOTHER HUNTER HAS SPAWNED ⚠️</div>' +
            '<div style="font-size:1.2rem;color:#ff6644;margin-top:8px;">' + count + ' Pac-M' + (count > 1 ? 'en' : 'an') + ' hunting you</div>';
        spawnWarningEl.style.opacity = '1';
        HorrorAudio.playJumpScare();
        setTimeout(function () {
            if (spawnWarningEl) spawnWarningEl.style.opacity = '0';
        }, 3500);
    }

    function updateExtraSpawns(dt) {
        gameElapsed += dt;
        for (var i = 0; i < extraSpawnTimers.length; i++) {
            var st = extraSpawnTimers[i];
            if (!st.spawned && gameElapsed >= st.time) {
                st.spawned = true;
                spawnExtraPacman();
            }
        }
    }

    // ---- GAME LOOP ----
    var lastTime = 0;
    function animate(time) {
        if (!gameActive) return;
        requestAnimationFrame(animate);
        if (!time) time = performance.now();
        var dt = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time; if (dt <= 0) return;

        if (window.ChallengeManager) {
            ChallengeManager.notify('backrooms-pacman', 'time', gameElapsed);
        }

        updatePlayer(dt);
        updatePacman(dt);
        updatePellets();
        updateFlickeringLights(dt);
        updateBlackout(dt);
        updateExtraSpawns(dt);
        updateDust(dt);
        updateHUD();
        drawMinimap();
        renderer.render(scene, camera);
    }
})();
