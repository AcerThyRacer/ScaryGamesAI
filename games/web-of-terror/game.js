/* ============================================
   Web of Terror — Spider Chase (Three.js FPS)
   Navigate spider-infested mine tunnels
   ============================================ */
(function () {
    'use strict';

    var scene, camera, renderer, clock;
    var gameActive = false, initialized = false;
    var player = { x: 0, y: 1.5, z: 0 };
    var yaw = 0, pitch = 0, mouseSensitivity = 0.002;
    var keys = {};
    var WALK_SPEED = 3, RUN_SPEED = 5.5;
    var isSprinting = false;

    // Game state
    var torch = 100, torchOn = true;
    var keysCollected = 0, totalKeys = 3;
    var spiders = [], webs = [], keyItems = [];
    var torchLight = null;
    var shakeTimer = 0;

    // Tunnel maze — simple grid
    var MAZE_SIZE = 11;
    var maze = [];
    var CELL = 4; // size of each cell

    // Input
    document.addEventListener('keydown', function (e) {
        keys[e.code] = true;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isSprinting = true;
        if (e.code === 'KeyF' && gameActive) { torchOn = !torchOn; HorrorAudio.playClick(); }
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
        // Simple maze using recursive backtracker
        maze = [];
        for (var r = 0; r < MAZE_SIZE; r++) { maze[r] = []; for (var c = 0; c < MAZE_SIZE; c++) maze[r][c] = 1; }
        // Carve passages
        function carve(r, c) {
            maze[r][c] = 0;
            var dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
            // Shuffle
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
        var wallMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.95 });
        var floorMat = new THREE.MeshStandardMaterial({ color: 0x222211, roughness: 0.9 });
        var ceilMat = new THREE.MeshStandardMaterial({ color: 0x1a1a10, roughness: 0.95 });

        // Floor
        var floorSize = MAZE_SIZE * CELL;
        var floor = new THREE.Mesh(new THREE.PlaneGeometry(floorSize, floorSize), floorMat);
        floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
        floor.position.set(floorSize / 2, 0, floorSize / 2);
        scene.add(floor);

        // Ceiling
        var ceil = new THREE.Mesh(new THREE.PlaneGeometry(floorSize, floorSize), ceilMat);
        ceil.rotation.x = Math.PI / 2; ceil.position.set(floorSize / 2, 3, floorSize / 2);
        scene.add(ceil);

        // Walls
        for (var r = 0; r < MAZE_SIZE; r++) {
            for (var c = 0; c < MAZE_SIZE; c++) {
                if (maze[r][c] === 1) {
                    var wall = new THREE.Mesh(new THREE.BoxGeometry(CELL, 3, CELL), wallMat);
                    wall.position.set(c * CELL + CELL / 2, 1.5, r * CELL + CELL / 2);
                    wall.castShadow = true; wall.receiveShadow = true;
                    scene.add(wall);
                }
            }
        }

        // Ambient
        scene.add(new THREE.AmbientLight(0x111100, 0.05));

        // Player torch
        torchLight = new THREE.SpotLight(0xffaa44, 2.5, 20, Math.PI / 4, 0.5, 1.5);
        torchLight.castShadow = true;
        torchLight.shadow.mapSize.width = 1024;
        torchLight.shadow.mapSize.height = 1024;
        camera.add(torchLight);
        camera.add(torchLight.target);
        torchLight.target.position.set(0, 0, -5);
        scene.add(camera);

        // Place keys in dead ends
        var deadEnds = [];
        for (var r = 1; r < MAZE_SIZE - 1; r++) {
            for (var c = 1; c < MAZE_SIZE - 1; c++) {
                if (maze[r][c] === 0) {
                    var walls = 0;
                    if (maze[r - 1][c]) walls++; if (maze[r + 1][c]) walls++;
                    if (maze[r][c - 1]) walls++; if (maze[r][c + 1]) walls++;
                    if (walls >= 3 && !(r === 1 && c === 1)) deadEnds.push({ r: r, c: c });
                }
            }
        }
        // Shuffle and pick 3 for keys
        for (var i = deadEnds.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = deadEnds[i]; deadEnds[i] = deadEnds[j]; deadEnds[j] = t; }

        keyItems = [];
        for (var i = 0; i < Math.min(totalKeys, deadEnds.length); i++) {
            var kp = deadEnds[i];
            var keyLight = new THREE.PointLight(0xffcc00, 0.8, 6);
            var kx = kp.c * CELL + CELL / 2, kz = kp.r * CELL + CELL / 2;
            keyLight.position.set(kx, 1.2, kz);
            scene.add(keyLight);
            var keyMesh = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.3),
                new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.6 })
            );
            keyMesh.position.set(kx, 1.2, kz);
            scene.add(keyMesh);
            keyItems.push({ x: kx, z: kz, collected: false, mesh: keyMesh, light: keyLight });
        }

        // Webs — at random passages
        webs = [];
        var webMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        for (var r = 1; r < MAZE_SIZE - 1; r++) {
            for (var c = 1; c < MAZE_SIZE - 1; c++) {
                if (maze[r][c] === 0 && Math.random() < 0.25) {
                    var webMesh = new THREE.Mesh(new THREE.PlaneGeometry(CELL * 0.8, 2.5), webMat.clone());
                    webMesh.position.set(c * CELL + CELL / 2, 1.5, r * CELL + CELL / 2);
                    webMesh.rotation.y = Math.random() * Math.PI;
                    scene.add(webMesh);
                    webs.push({ mesh: webMesh, x: c * CELL + CELL / 2, z: r * CELL + CELL / 2, active: true });
                }
            }
        }

        // Spiders
        spiders = [];
        for (var i = 0; i < 5 + Math.floor(GameUtils.getMultiplier() * 2); i++) {
            var sr, sc;
            do { sr = Math.floor(Math.random() * MAZE_SIZE); sc = Math.floor(Math.random() * MAZE_SIZE); }
            while (maze[sr][sc] === 1 || (sr <= 2 && sc <= 2));
            spawnSpider(sc * CELL + CELL / 2, sr * CELL + CELL / 2);
        }
    }

    function spawnSpider(x, z) {
        var spiderGroup = new THREE.Group();
        var bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
        // Body
        spiderGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), bodyMat));
        // Abdomen
        var abd = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bodyMat);
        abd.position.z = 0.4; spiderGroup.add(abd);
        // Legs
        var legMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        for (var i = 0; i < 8; i++) {
            var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6), legMat);
            var side = i < 4 ? -1 : 1;
            var idx = i % 4;
            leg.position.set(side * 0.3, 0, -0.15 + idx * 0.2);
            leg.rotation.z = side * 0.8;
            spiderGroup.add(leg);
        }
        // Eyes
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 });
        for (var i = 0; i < 4; i++) {
            var eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat);
            eye.position.set(-0.08 + (i % 2) * 0.16, 0.1 + Math.floor(i / 2) * 0.08, -0.2);
            spiderGroup.add(eye);
        }

        spiderGroup.position.set(x, 0.3, z);
        scene.add(spiderGroup);
        spiders.push({
            mesh: spiderGroup, x: x, z: z,
            speed: 2 + Math.random() * 2,
            dir: Math.random() * Math.PI * 2,
            state: 'wander',
            stateTimer: 2 + Math.random() * 3,
        });
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
        spiders = []; webs = []; keyItems = [];
        torch = 100; torchOn = true; keysCollected = 0;
        player.x = 1 * CELL + CELL / 2; player.y = 1.5; player.z = 1 * CELL + CELL / 2;
        yaw = 0; pitch = 0;
        buildMine();
        // Quality tier enhancements
        try { if (typeof QualityEnhancer !== 'undefined') QualityEnhancer.enhance(renderer, scene, camera); } catch(e) { console.warn('QualityEnhancer:', e); }
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
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-over-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function gameWin() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.WIN);
        document.exitPointerLock();
        HorrorAudio.playWin(); HorrorAudio.stopDrone();
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
            torch -= dt * 3 * GameUtils.getMultiplier();
            if (torch <= 0) { torch = 0; torchOn = false; }
        }
        if (torchLight) {
            // Realistic flame flicker (position + intensity)
            var time = Date.now() * 0.01;
            torchLight.intensity = torchOn ? (2.0 + Math.sin(time) * 0.3 + Math.cos(time * 2.5) * 0.2) : 0;
            if (torchOn) {
                torchLight.position.x = Math.sin(time * 0.5) * 0.05;
                torchLight.position.y = Math.cos(time * 0.7) * 0.05;
            }
        }

        // Movement with wall collision
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
            // Collision
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
                if (window.ChallengeManager) ChallengeManager.notify('web-of-terror', 'keys_found', 1);
                if (keysCollected >= totalKeys) {
                    setTimeout(function () { gameWin(); }, 1000);
                }
            }
        }

        // Web interaction — torch burns webs when close
        for (var i = 0; i < webs.length; i++) {
            var w = webs[i];
            if (!w.active) continue;
            var dx = player.x - w.x, dz = player.z - w.z;
            var dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 2 && torchOn) {
                w.active = false;
                scene.remove(w.mesh);
                HorrorAudio.playHit();
                if (window.ChallengeManager) ChallengeManager.notify('web-of-terror', 'webs', 1);
                // Replenish a bit of torch
                torch = Math.min(100, torch + 5);
            } else if (dist < 1.2) {
                // Slow player through webs
                player.x -= (dx / dist) * 0.5 * dt;
                player.z -= (dz / dist) * 0.5 * dt;
            }
        }

        // Spider AI
        for (var i = 0; i < spiders.length; i++) {
            var s = spiders[i];
            var dx = player.x - s.x, dz = player.z - s.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            // Scared of torch
            var scaredOfTorch = torchOn && dist < 6;

            s.stateTimer -= dt;
            if (s.stateTimer <= 0) {
                s.state = dist < 10 && !scaredOfTorch ? 'chase' : 'wander';
                s.stateTimer = 2 + Math.random() * 3;
                if (s.state === 'wander') s.dir = Math.random() * Math.PI * 2;
            }

            var sx = 0, sz = 0;
            if (s.state === 'chase' && !scaredOfTorch) {
                sx = (dx / dist) * s.speed;
                sz = (dz / dist) * s.speed;
            } else if (scaredOfTorch) {
                sx = -(dx / dist) * s.speed * 0.8;
                sz = -(dz / dist) * s.speed * 0.8;
            } else {
                sx = Math.cos(s.dir) * s.speed * 0.4;
                sz = Math.sin(s.dir) * s.speed * 0.4;
            }

            var newX = s.x + sx * dt, newZ = s.z + sz * dt;
            if (!isWall(newX, s.z)) s.x = newX;
            if (!isWall(s.x, newZ)) s.z = newZ;

            s.mesh.position.set(s.x, 0.3 + Math.sin(Date.now() * 0.005 + i) * 0.05, s.z);
            s.mesh.lookAt(s.state === 'chase' ? player.x : s.x + sx, 0.3, s.state === 'chase' ? player.z : s.z + sz);

            // Catch player
            if (dist < 0.8) { gameOver(); return; }
        }

        // Camera
        camera.position.set(player.x, player.y, player.z);
        if (shakeTimer > 0) {
            camera.position.x += (Math.random() - 0.5) * shakeTimer * 3;
            camera.position.y += (Math.random() - 0.5) * shakeTimer * 3;
            shakeTimer -= dt;
        }
        camera.rotation.order = 'YXZ';
        camera.rotation.x = pitch;
        camera.rotation.y = yaw;

        // Fog tightens without torch
        scene.fog.far = torchOn ? 16 : 6;

        // HUD
        var h1 = document.getElementById('hud-torch');
        if (h1) { h1.textContent = 'Torch: ' + Math.round(torch) + '%'; h1.style.color = torch < 25 ? '#ff3333' : ''; }
        var h2 = document.getElementById('hud-keys');
        if (h2) h2.textContent = 'Keys: ' + keysCollected + '/' + totalKeys;
    }

    function gameLoop() {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        var dt = Math.min(clock.getDelta(), 0.1);
        update(dt);
        renderer.render(scene, camera);
    }
})();
