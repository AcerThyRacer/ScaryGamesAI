/* ============================================
   Web of Terror — Spider Chase (Three.js FPS)
   OVERHAULED: 6 spider types, torch system, queen boss,
   traps, deeper mines, fuel caches, escape pods
   ============================================ */
(function () {
    'use strict';

    var scene, camera, renderer, clock;
    var gameActive = false, initialized = false;
    var player = { x: 0, y: 1.5, z: 0, hp: 100 };
    var yaw = 0, pitch = 0, mouseSensitivity = 0.002;
    var keys = {};
    var WALK_SPEED = 3, RUN_SPEED = 5.5;
    var isSprinting = false;

    // Game state
    var torch = 100, torchOn = true;
    var keysCollected = 0, totalKeys = 5;
    var spiders = [], webs = [], keyItems = [];
    var torchLight = null;
    var shakeTimer = 0;

    var MAZE_SIZE = 13;
    var maze = [];
    var CELL = 4;

    // ── NEW: Mine Depth System ────────────────────────
    var mineLevel = 1;
    var maxLevel = 3;
    var exitDoor = null;

    // ── NEW: Spider Types ─────────────────────────────
    var SPIDER_TYPES = [
        { name: 'Cave Spider', color: 0x222222, speed: 2, hp: 1, damage: 10, size: 0.25, eyeColor: 0xff0000 },
        { name: 'Web Spinner', color: 0x333322, speed: 1.5, hp: 2, damage: 5, size: 0.3, eyeColor: 0xff4400 },
        { name: 'Tunnel Runner', color: 0x442222, speed: 4, hp: 1, damage: 15, size: 0.2, eyeColor: 0xff0044 },
        { name: 'Brood Mother', color: 0x1a1a2a, speed: 1, hp: 4, damage: 8, size: 0.4, eyeColor: 0xff00ff },
        { name: 'Shadow Lurker', color: 0x0a0a0a, speed: 2.5, hp: 2, damage: 20, size: 0.35, eyeColor: 0x4444ff },
        { name: 'Acid Spitter', color: 0x224422, speed: 1.8, hp: 2, damage: 12, size: 0.3, eyeColor: 0x44ff44 },
    ];

    // ── NEW: Traps ────────────────────────────────────
    var traps = [];
    var TRAP_TYPES = ['spike', 'web_mine', 'acid_pool', 'collapse'];

    // ── NEW: Fuel Caches ──────────────────────────────
    var fuelCaches = [];

    // ── NEW: Queen Boss ───────────────────────────────
    var queenActive = false;
    var queen = { x: 0, z: 0, hp: 20, maxHp: 20, mesh: null, phase: 1, attackTimer: 0, spawnTimer: 0 };

    // ── NEW: Inventory ────────────────────────────────
    var inventory = { torchUpgrade: false, shield: false, bombs: 0 };

    // Messages
    var msgText = '';
    var msgTimer2 = 0;
    function showMsg(text) { msgText = text; msgTimer2 = 3; }

    // Stats
    var spidersKilled = 0;
    var websBurned = 0;
    var trapsTriggered = 0;

    // Input
    document.addEventListener('keydown', function (e) {
        keys[e.code] = true;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isSprinting = true;
        if (e.code === 'KeyF' && gameActive) { torchOn = !torchOn; HorrorAudio.playClick(); }
        if (e.code === 'KeyG' && gameActive && inventory.bombs > 0) throwBomb();
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); document.exitPointerLock(); }
    });
    document.addEventListener('keyup', function (e) {
        keys[e.code] = false;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isSprinting = false;
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

    function throwBomb() {
        inventory.bombs--;
        showMsg('💣 Bomb thrown!');
        // Kill nearby spiders
        var killed = 0;
        for (var i = spiders.length - 1; i >= 0; i--) {
            var s = spiders[i];
            var dx = player.x - s.x, dz = player.z - s.z;
            if (Math.sqrt(dx * dx + dz * dz) < 6) {
                scene.remove(s.mesh);
                spiders.splice(i, 1);
                spidersKilled++; killed++;
            }
        }
        HorrorAudio.playHit();
        showMsg('💣 Bomb killed ' + killed + ' spiders!');
    }

    function init() {
        if (initialized) return; initialized = true;
        clock = new THREE.Clock();
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050500);
        scene.fog = new THREE.Fog(0x050500, 1, 16);
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
        renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.5;
        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    function generateMaze() {
        maze = [];
        for (var r = 0; r < MAZE_SIZE; r++) { maze[r] = []; for (var c = 0; c < MAZE_SIZE; c++) maze[r][c] = 1; }
        function carve(r, c) {
            maze[r][c] = 0;
            var dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
            for (var i = dirs.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = dirs[i]; dirs[i] = dirs[j]; dirs[j] = t; }
            for (var d = 0; d < dirs.length; d++) {
                var nr = r + dirs[d][0], nc = c + dirs[d][1];
                if (nr >= 0 && nr < MAZE_SIZE && nc >= 0 && nc < MAZE_SIZE && maze[nr][nc] === 1) {
                    maze[r + dirs[d][0] / 2][c + dirs[d][1] / 2] = 0;
                    carve(nr, nc);
                }
            }
        }
        carve(1, 1);
    }

    function buildMine() {
        generateMaze();
        // Level-specific colors
        var colors = [
            { wall: 0x3a2a1a, floor: 0x222211, ceil: 0x1a1a10 },
            { wall: 0x2a1a2a, floor: 0x1a1122, ceil: 0x110a18 },
            { wall: 0x1a1a1a, floor: 0x111111, ceil: 0x0a0a0a },
        ];
        var c = colors[Math.min(mineLevel - 1, colors.length - 1)];
        var wallMat = new THREE.MeshStandardMaterial({ color: c.wall, roughness: 0.95 });
        var floorMat = new THREE.MeshStandardMaterial({ color: c.floor, roughness: 0.9 });
        var ceilMat = new THREE.MeshStandardMaterial({ color: c.ceil, roughness: 0.95 });

        var floorSize = MAZE_SIZE * CELL;
        var floor = new THREE.Mesh(new THREE.PlaneGeometry(floorSize, floorSize), floorMat);
        floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
        floor.position.set(floorSize / 2, 0, floorSize / 2); scene.add(floor);
        var ceil = new THREE.Mesh(new THREE.PlaneGeometry(floorSize, floorSize), ceilMat);
        ceil.rotation.x = Math.PI / 2; ceil.position.set(floorSize / 2, 3, floorSize / 2); scene.add(ceil);

        for (var r = 0; r < MAZE_SIZE; r++) {
            for (var cc = 0; cc < MAZE_SIZE; cc++) {
                if (maze[r][cc] === 1) {
                    var wall = new THREE.Mesh(new THREE.BoxGeometry(CELL, 3, CELL), wallMat);
                    wall.position.set(cc * CELL + CELL / 2, 1.5, r * CELL + CELL / 2);
                    wall.castShadow = true; wall.receiveShadow = true; scene.add(wall);
                }
            }
        }

        scene.add(new THREE.AmbientLight(0x111100, 0.03 + (3 - mineLevel) * 0.01));

        torchLight = new THREE.SpotLight(0xffaa44, 2.5, 20, Math.PI / 4, 0.5, 1.5);
        torchLight.castShadow = true;
        torchLight.shadow.mapSize.width = 1024; torchLight.shadow.mapSize.height = 1024;
        camera.add(torchLight); camera.add(torchLight.target);
        torchLight.target.position.set(0, 0, -5);
        scene.add(camera);

        // Place keys
        var deadEnds = [];
        for (var r = 1; r < MAZE_SIZE - 1; r++) {
            for (var cc = 1; cc < MAZE_SIZE - 1; cc++) {
                if (maze[r][cc] === 0) {
                    var walls = 0;
                    if (maze[r - 1][cc]) walls++; if (maze[r + 1][cc]) walls++; if (maze[r][cc - 1]) walls++; if (maze[r][cc + 1]) walls++;
                    if (walls >= 3 && !(r === 1 && cc === 1)) deadEnds.push({ r: r, c: cc });
                }
            }
        }
        for (var i = deadEnds.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = deadEnds[i]; deadEnds[i] = deadEnds[j]; deadEnds[j] = t; }

        keyItems = [];
        var keysNeeded = totalKeys;
        for (var i = 0; i < Math.min(keysNeeded, deadEnds.length); i++) {
            var kp = deadEnds[i];
            var kx = kp.c * CELL + CELL / 2, kz = kp.r * CELL + CELL / 2;
            var keyLight = new THREE.PointLight(0xffcc00, 0.8, 6);
            keyLight.position.set(kx, 1.2, kz); scene.add(keyLight);
            var keyMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.6 }));
            keyMesh.position.set(kx, 1.2, kz); scene.add(keyMesh);
            keyItems.push({ x: kx, z: kz, collected: false, mesh: keyMesh, light: keyLight });
        }

        // Webs
        webs = [];
        var webMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        for (var r = 1; r < MAZE_SIZE - 1; r++) {
            for (var cc = 1; cc < MAZE_SIZE - 1; cc++) {
                if (maze[r][cc] === 0 && Math.random() < 0.2 + mineLevel * 0.05) {
                    var webMesh = new THREE.Mesh(new THREE.PlaneGeometry(CELL * 0.8, 2.5), webMat.clone());
                    webMesh.position.set(cc * CELL + CELL / 2, 1.5, r * CELL + CELL / 2);
                    webMesh.rotation.y = Math.random() * Math.PI; scene.add(webMesh);
                    webs.push({ mesh: webMesh, x: cc * CELL + CELL / 2, z: r * CELL + CELL / 2, active: true });
                }
            }
        }

        // Spiders (more on deeper levels)
        spiders = [];
        var spiderCount = 5 + mineLevel * 3 + Math.floor(GameUtils.getMultiplier() * 2);
        for (var i = 0; i < spiderCount; i++) {
            var sr, sc;
            do { sr = Math.floor(Math.random() * MAZE_SIZE); sc = Math.floor(Math.random() * MAZE_SIZE); }
            while (maze[sr][sc] === 1 || (sr <= 2 && sc <= 2));
            var typeIdx = Math.floor(Math.random() * Math.min(mineLevel + 2, SPIDER_TYPES.length));
            spawnSpider(sc * CELL + CELL / 2, sr * CELL + CELL / 2, SPIDER_TYPES[typeIdx]);
        }

        // Fuel caches
        fuelCaches = [];
        for (var i = 0; i < 3 + mineLevel; i++) {
            if (deadEnds.length <= totalKeys + i) break;
            var fp = deadEnds[totalKeys + i];
            if (!fp) continue;
            var fx = fp.c * CELL + CELL / 2, fz = fp.r * CELL + CELL / 2;
            var fuelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0xff4400, emissiveIntensity: 0.4 }));
            fuelMesh.position.set(fx, 0.5, fz); scene.add(fuelMesh);
            var fuelLight = new THREE.PointLight(0xff4400, 0.3, 4);
            fuelLight.position.set(fx, 0.7, fz); scene.add(fuelLight);
            fuelCaches.push({ x: fx, z: fz, mesh: fuelMesh, light: fuelLight, collected: false });
        }

        // Traps
        traps = [];
        for (var i = 0; i < 3 + mineLevel * 2; i++) {
            var tr, tc;
            do { tr = Math.floor(Math.random() * MAZE_SIZE); tc = Math.floor(Math.random() * MAZE_SIZE); }
            while (maze[tr][tc] === 1 || (tr <= 2 && tc <= 2));
            var trapType = TRAP_TYPES[Math.floor(Math.random() * TRAP_TYPES.length)];
            var tx = tc * CELL + CELL / 2, tz = tr * CELL + CELL / 2;
            var trapColor = trapType === 'spike' ? 0x666666 : trapType === 'acid_pool' ? 0x22aa22 : trapType === 'web_mine' ? 0xcccccc : 0x443322;
            var trapMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshStandardMaterial({ color: trapColor, transparent: true, opacity: 0.3 }));
            trapMesh.rotation.x = -Math.PI / 2; trapMesh.position.set(tx, 0.02, tz); scene.add(trapMesh);
            traps.push({ type: trapType, x: tx, z: tz, active: true, mesh: trapMesh });
        }

        // Bomb pickups
        for (var i = 0; i < 2; i++) {
            var br, bc;
            do { br = Math.floor(Math.random() * MAZE_SIZE); bc = Math.floor(Math.random() * MAZE_SIZE); }
            while (maze[br][bc] === 1 || (br <= 2 && bc <= 2));
            var bx = bc * CELL + CELL / 2, bz = br * CELL + CELL / 2;
            var bombMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff0000, emissiveIntensity: 0.5 }));
            bombMesh.position.set(bx, 0.5, bz); bombMesh.name = 'bomb_pickup'; scene.add(bombMesh);
            var bombLight = new THREE.PointLight(0xff2222, 0.3, 3);
            bombLight.position.set(bx, 0.7, bz); bombLight.name = 'bomb_light'; scene.add(bombLight);
        }

        // Exit door (for level transition or boss)
        var exitR, exitC;
        do { exitR = MAZE_SIZE - 2; exitC = MAZE_SIZE - 2; }
        while (maze[exitR][exitC] === 1);
        var exitX = exitC * CELL + CELL / 2, exitZ = exitR * CELL + CELL / 2;
        var exitMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x884400, metalness: 0.5 }));
        exitMesh.position.set(exitX, 1.25, exitZ); scene.add(exitMesh);
        var exitLight = new THREE.PointLight(mineLevel >= maxLevel ? 0x00ff00 : 0xffaa00, 0.5, 5);
        exitLight.position.set(exitX, 2, exitZ); scene.add(exitLight);
        exitDoor = { x: exitX, z: exitZ, mesh: exitMesh };
    }

    function spawnSpider(x, z, type) {
        var spiderGroup = new THREE.Group();
        var bodyMat = new THREE.MeshStandardMaterial({ color: type.color, roughness: 0.7 });
        spiderGroup.add(new THREE.Mesh(new THREE.SphereGeometry(type.size, 8, 6), bodyMat));
        var abd = new THREE.Mesh(new THREE.SphereGeometry(type.size * 1.4, 8, 6), bodyMat);
        abd.position.z = type.size * 1.6; spiderGroup.add(abd);
        var legMat = new THREE.MeshStandardMaterial({ color: type.color * 0.8 || 0x111111 });
        for (var i = 0; i < 8; i++) {
            var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, type.size * 2.5), legMat);
            var side = i < 4 ? -1 : 1; var idx = i % 4;
            leg.position.set(side * type.size * 1.2, 0, -type.size + idx * type.size * 0.6);
            leg.rotation.z = side * 0.8; spiderGroup.add(leg);
        }
        var eyeMat = new THREE.MeshStandardMaterial({ color: type.eyeColor, emissive: type.eyeColor, emissiveIntensity: 0.8 });
        for (var i = 0; i < 4; i++) {
            var eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat);
            eye.position.set(-0.08 + (i % 2) * 0.16, 0.1 + Math.floor(i / 2) * 0.08, -type.size);
            spiderGroup.add(eye);
        }
        spiderGroup.position.set(x, 0.3, z); scene.add(spiderGroup);
        spiders.push({
            mesh: spiderGroup, x: x, z: z,
            speed: type.speed + Math.random(), hp: type.hp,
            damage: type.damage, typeName: type.name,
            dir: Math.random() * Math.PI * 2,
            state: 'wander', stateTimer: 2 + Math.random() * 3,
        });
    }

    function spawnQueen() {
        queenActive = true;
        queen.hp = 20 + mineLevel * 5;
        queen.maxHp = queen.hp;
        queen.phase = 1;
        queen.attackTimer = 3;
        queen.spawnTimer = 5;

        // Find player position and place queen far away
        var qr = MAZE_SIZE - 2, qc = MAZE_SIZE - 2;
        queen.x = qc * CELL + CELL / 2;
        queen.z = qr * CELL + CELL / 2;

        var queenGroup = new THREE.Group();
        var bodyMat = new THREE.MeshStandardMaterial({ color: 0x220022, emissive: 0x440044, emissiveIntensity: 0.3 });
        queenGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 10), bodyMat));
        var abd = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 10), bodyMat);
        abd.position.z = 1.5; queenGroup.add(abd);
        // Crown
        var crownMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.8 });
        for (var i = 0; i < 5; i++) {
            var spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 4), crownMat);
            spike.position.set(Math.cos(i * Math.PI * 0.4) * 0.5, 0.6, Math.sin(i * Math.PI * 0.4) * 0.5 - 0.2);
            queenGroup.add(spike);
        }
        // Eyes (8 big ones)
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 });
        for (var i = 0; i < 8; i++) {
            var eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), eyeMat);
            eye.position.set(-0.3 + (i % 4) * 0.2, 0.2 + Math.floor(i / 4) * 0.15, -0.7);
            queenGroup.add(eye);
        }
        queenGroup.position.set(queen.x, 0.8, queen.z);
        scene.add(queenGroup);
        queen.mesh = queenGroup;
        showMsg('🕷️ QUEEN SPIDER AWAKENED!');
        HorrorAudio.playJumpScare && HorrorAudio.playJumpScare();
    }

    function startGame() {
        if (!GameUtils.checkWebGL()) return;
        init();
        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        HorrorAudio.startDrone(35, 'dark');
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
        spiders = []; webs = []; keyItems = []; traps = []; fuelCaches = [];
        torch = 100; torchOn = true; keysCollected = 0;
        player.x = 1 * CELL + CELL / 2; player.y = 1.5; player.z = 1 * CELL + CELL / 2; player.hp = 100;
        yaw = 0; pitch = 0;
        mineLevel = 1; queenActive = false; queen.mesh = null;
        inventory = { torchUpgrade: false, shield: false, bombs: 0 };
        spidersKilled = 0; websBurned = 0; trapsTriggered = 0;
        buildMine();
        try { if (typeof QualityEnhancer !== 'undefined') QualityEnhancer.enhance(renderer, scene, camera); } catch (e) { }
    }

    function nextLevel() {
        mineLevel++;
        keysCollected = 0;
        while (scene.children.length > 0) scene.remove(scene.children[0]);
        spiders = []; webs = []; keyItems = []; traps = []; fuelCaches = [];
        player.x = 1 * CELL + CELL / 2; player.z = 1 * CELL + CELL / 2;
        yaw = 0; pitch = 0;
        torch = Math.min(100, torch + 30);
        player.hp = Math.min(100, player.hp + 20);
        showMsg('⬇️ Descending to Mine Level ' + mineLevel + '...');
        buildMine();
        if (mineLevel >= maxLevel) {
            setTimeout(function () { spawnQueen(); }, 5000);
        }
    }

    function restartGame() {
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        HorrorAudio.startDrone(35, 'dark');
        resetState();
        gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
        try { renderer.domElement.requestPointerLock(); } catch (e) { }
        gameLoop();
    }

    function gameOver() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.GAME_OVER);
        document.exitPointerLock();
        HorrorAudio.playDeath(); HorrorAudio.stopDrone();
        var fs = document.getElementById('final-score');
        if (fs) fs.textContent = 'Died in mine level ' + mineLevel + ' | Spiders killed: ' + spidersKilled + ' | Keys: ' + keysCollected + '/' + totalKeys;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-over-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function gameWin() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.WIN);
        document.exitPointerLock();
        HorrorAudio.playWin(); HorrorAudio.stopDrone();
        var fs = document.getElementById('final-score');
        if (fs) fs.textContent = 'Escaped! Levels: ' + mineLevel + ' | Spiders: ' + spidersKilled + ' | Webs burned: ' + websBurned;
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-win-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function isWall(x, z) {
        var c = Math.floor(x / CELL), r = Math.floor(z / CELL);
        if (r < 0 || r >= MAZE_SIZE || c < 0 || c >= MAZE_SIZE) return true;
        return maze[r][c] === 1;
    }

    function update(dt) {
        // Torch fuel
        if (torchOn) {
            var drainRate = inventory.torchUpgrade ? 1.5 : 3;
            torch -= dt * drainRate * GameUtils.getMultiplier();
            if (torch <= 0) { torch = 0; torchOn = false; showMsg('🔥 Torch extinguished!'); }
        }
        if (torchLight) {
            var time = Date.now() * 0.01;
            torchLight.intensity = torchOn ? (2.0 + Math.sin(time) * 0.3 + Math.cos(time * 2.5) * 0.2) : 0;
            if (torchOn) { torchLight.position.x = Math.sin(time * 0.5) * 0.05; torchLight.position.y = Math.cos(time * 0.7) * 0.05; }
        }

        // Movement
        var speed = (isSprinting ? RUN_SPEED : WALK_SPEED) * dt;
        var moveX = 0, moveZ = 0;
        if (keys['KeyW']) moveZ += 1;
        if (keys['KeyS']) moveZ -= 1;
        if (keys['KeyA']) moveX -= 1;
        if (keys['KeyD']) moveX += 1;
        if (moveX || moveZ) {
            var len = Math.sqrt(moveX * moveX + moveZ * moveZ); moveX /= len; moveZ /= len;
            var forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
            var right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
            var nx = player.x + (forward.x * moveZ + right.x * moveX) * speed;
            var nz = player.z + (forward.z * moveZ + right.z * moveX) * speed;
            var margin = 0.4;
            if (!isWall(nx + margin, player.z) && !isWall(nx - margin, player.z)) player.x = nx;
            if (!isWall(player.x, nz + margin) && !isWall(player.x, nz - margin)) player.z = nz;
        }

        // Key collection
        for (var i = 0; i < keyItems.length; i++) {
            var k = keyItems[i];
            if (k.collected) continue;
            var dx = player.x - k.x, dz = player.z - k.z;
            if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
                k.collected = true; keysCollected++;
                scene.remove(k.mesh); scene.remove(k.light);
                HorrorAudio.playCollect();
                showMsg('🔑 Key ' + keysCollected + '/' + totalKeys);
                if (window.ChallengeManager) ChallengeManager.notify('web-of-terror', 'keys_found', 1);
            }
        }

        // Exit door check
        if (exitDoor && keysCollected >= totalKeys) {
            var dx = player.x - exitDoor.x, dz = player.z - exitDoor.z;
            if (Math.sqrt(dx * dx + dz * dz) < 2) {
                if (mineLevel >= maxLevel && !queenActive) {
                    gameWin();
                } else if (mineLevel < maxLevel) {
                    nextLevel();
                }
            }
        }

        // Fuel cache collection
        for (var i = 0; i < fuelCaches.length; i++) {
            var fc = fuelCaches[i];
            if (fc.collected) continue;
            var dx = player.x - fc.x, dz = player.z - fc.z;
            if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
                fc.collected = true;
                torch = Math.min(100, torch + 25);
                scene.remove(fc.mesh); scene.remove(fc.light);
                HorrorAudio.playCollect();
                showMsg('🔥 Torch refueled! +25%');
            }
        }

        // Bomb pickups
        scene.traverse(function (child) {
            if (child.name === 'bomb_pickup') {
                var dx = player.x - child.position.x, dz = player.z - child.position.z;
                if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
                    inventory.bombs++;
                    showMsg('💣 Bomb found! (G to throw) x' + inventory.bombs);
                    HorrorAudio.playCollect();
                    var lightObj = null;
                    scene.traverse(function (c) { if (c.name === 'bomb_light' && Math.abs(c.position.x - child.position.x) < 0.5) lightObj = c; });
                    scene.remove(child);
                    if (lightObj) scene.remove(lightObj);
                }
            }
        });

        // Web interaction
        for (var i = 0; i < webs.length; i++) {
            var w = webs[i];
            if (!w.active) continue;
            var dx = player.x - w.x, dz = player.z - w.z;
            var dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 2 && torchOn) {
                w.active = false; scene.remove(w.mesh);
                HorrorAudio.playHit(); websBurned++;
                torch = Math.min(100, torch + 3);
                if (window.ChallengeManager) ChallengeManager.notify('web-of-terror', 'webs', 1);
            } else if (dist < 1.2 && w.active) {
                player.x -= (dx / (dist || 1)) * 0.5 * dt;
                player.z -= (dz / (dist || 1)) * 0.5 * dt;
            }
        }

        // Trap check
        for (var i = 0; i < traps.length; i++) {
            var tr = traps[i];
            if (!tr.active) continue;
            var dx = player.x - tr.x, dz = player.z - tr.z;
            if (Math.sqrt(dx * dx + dz * dz) < 1) {
                tr.active = false;
                trapsTriggered++;
                if (tr.type === 'spike') { player.hp -= 15; showMsg('⚠ Spike trap! -15 HP'); shakeTimer = 0.3; }
                else if (tr.type === 'acid_pool') { player.hp -= 10; showMsg('☣ Acid pool! -10 HP'); }
                else if (tr.type === 'web_mine') { showMsg('🕸️ Web mine! You\'re stuck!'); }
                else if (tr.type === 'collapse') { shakeTimer = 0.5; showMsg('💥 Cave-in!'); }
                scene.remove(tr.mesh);
                HorrorAudio.playHit();
                if (player.hp <= 0) { gameOver(); return; }
            }
        }

        // Spider AI
        for (var i = spiders.length - 1; i >= 0; i--) {
            var s = spiders[i];
            var dx = player.x - s.x, dz = player.z - s.z;
            var dist = Math.sqrt(dx * dx + dz * dz);
            var scaredOfTorch = torchOn && dist < 6;

            s.stateTimer -= dt;
            if (s.stateTimer <= 0) {
                s.state = dist < 10 && !scaredOfTorch ? 'chase' : 'wander';
                s.stateTimer = 2 + Math.random() * 3;
                if (s.state === 'wander') s.dir = Math.random() * Math.PI * 2;
            }

            var sx = 0, sz = 0;
            if (s.state === 'chase' && !scaredOfTorch) { sx = (dx / (dist || 1)) * s.speed; sz = (dz / (dist || 1)) * s.speed; }
            else if (scaredOfTorch) { sx = -(dx / (dist || 1)) * s.speed * 0.8; sz = -(dz / (dist || 1)) * s.speed * 0.8; }
            else { sx = Math.cos(s.dir) * s.speed * 0.4; sz = Math.sin(s.dir) * s.speed * 0.4; }

            var newX = s.x + sx * dt, newZ = s.z + sz * dt;
            if (!isWall(newX, s.z)) s.x = newX;
            if (!isWall(s.x, newZ)) s.z = newZ;

            s.mesh.position.set(s.x, 0.3 + Math.sin(Date.now() * 0.005 + i) * 0.05, s.z);
            s.mesh.lookAt(s.state === 'chase' ? player.x : s.x + sx, 0.3, s.state === 'chase' ? player.z : s.z + sz);

            if (dist < 0.8) {
                player.hp -= s.damage;
                shakeTimer = 0.2;
                showMsg('🕷️ ' + s.typeName + ' bite! -' + s.damage + ' HP');
                HorrorAudio.playHit();
                // Push spider back
                s.x -= (dx / (dist || 1)) * 3; s.z -= (dz / (dist || 1)) * 3;
                if (player.hp <= 0) { gameOver(); return; }
            }
        }

        // Queen Boss AI
        if (queenActive && queen.mesh) {
            var dx = player.x - queen.x, dz = player.z - queen.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            // Chase player
            var qSpeed = queen.phase === 2 ? 3 : 2;
            if (dist > 3) {
                var nx = queen.x + (dx / (dist || 1)) * qSpeed * dt;
                var nz = queen.z + (dz / (dist || 1)) * qSpeed * dt;
                if (!isWall(nx, queen.z)) queen.x = nx;
                if (!isWall(queen.x, nz)) queen.z = nz;
            }
            queen.mesh.position.set(queen.x, 0.8 + Math.sin(Date.now() * 0.002) * 0.2, queen.z);
            queen.mesh.lookAt(player.x, 0.8, player.z);

            // Torch damages queen
            if (torchOn && dist < 4) {
                queen.hp -= dt * 3;
                if (queen.hp <= queen.maxHp / 2 && queen.phase === 1) {
                    queen.phase = 2;
                    showMsg('🕷️ QUEEN ENRAGED! Phase 2!');
                }
                if (queen.hp <= 0) {
                    queenActive = false;
                    scene.remove(queen.mesh);
                    showMsg('🏆 QUEEN DEFEATED!');
                    HorrorAudio.playWin && HorrorAudio.playWin();
                    if (window.ChallengeManager) ChallengeManager.notify('web-of-terror', 'queen_killed', 1);
                    setTimeout(function () { gameWin(); }, 2000);
                }
            }

            // Queen spawns babies
            queen.spawnTimer -= dt;
            if (queen.spawnTimer <= 0) {
                queen.spawnTimer = queen.phase === 2 ? 3 : 5;
                if (spiders.length < 15) {
                    spawnSpider(queen.x + (Math.random() - 0.5) * 4, queen.z + (Math.random() - 0.5) * 4, SPIDER_TYPES[0]);
                    showMsg('🕷️ Queen spawns babies!');
                }
            }

            // Queen contact damage
            if (dist < 1.5) {
                player.hp -= 25 * dt;
                shakeTimer = 0.1;
                if (player.hp <= 0) { gameOver(); return; }
            }
        }

        // Camera
        camera.position.set(player.x, player.y, player.z);
        if (shakeTimer > 0) {
            camera.position.x += (Math.random() - 0.5) * shakeTimer * 3;
            camera.position.y += (Math.random() - 0.5) * shakeTimer * 3;
            shakeTimer -= dt;
        }
        camera.rotation.order = 'YXZ';
        camera.rotation.x = pitch; camera.rotation.y = yaw;

        scene.fog.far = torchOn ? 16 : 6;
        if (msgTimer2 > 0) msgTimer2 -= dt;

        // HUD
        var h1 = document.getElementById('hud-torch');
        if (h1) { h1.textContent = '🔥 ' + Math.round(torch) + '%' + (inventory.bombs > 0 ? ' | 💣' + inventory.bombs : ''); h1.style.color = torch < 25 ? '#ff3333' : ''; }
        var h2 = document.getElementById('hud-keys');
        if (h2) h2.textContent = '🔑 ' + keysCollected + '/' + totalKeys + ' | ❤️ ' + Math.round(player.hp) + '% | ⛏️ Lvl ' + mineLevel;
        // Queen HP
        if (queenActive) {
            var h3 = document.getElementById('hud-queen');
            if (!h3) { h3 = document.createElement('div'); h3.id = 'hud-queen'; h3.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);color:#ff00ff;font:700 14px Inter;z-index:999;'; document.body.appendChild(h3); }
            h3.textContent = '🕷️ QUEEN HP: ' + Math.round(queen.hp) + '/' + queen.maxHp + ' (Phase ' + queen.phase + ')';
        }
    }

    function gameLoop() {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        var dt = Math.min(clock.getDelta(), 0.1);
        update(dt);

        // HUD message
        if (msgTimer2 > 0) {
            var hudEl = document.getElementById('hud-msg');
            if (!hudEl) { hudEl = document.createElement('div'); hudEl.id = 'hud-msg'; hudEl.style.cssText = 'position:fixed;top:25%;left:50%;transform:translateX(-50%);color:#ffcc44;font:700 16px Inter;text-align:center;pointer-events:none;text-shadow:0 0 10px #ff8800;z-index:999;'; document.body.appendChild(hudEl); }
            hudEl.textContent = msgText;
            hudEl.style.opacity = Math.min(1, msgTimer2);
        }

        renderer.render(scene, camera);
    }
})();
