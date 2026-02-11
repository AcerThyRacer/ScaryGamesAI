/* ============================================
   Graveyard Shift — 3D Stealth Horror (Three.js)
   FPS night security guard in haunted cemetery
   ============================================ */
(function () {
    'use strict';

    var scene, camera, renderer, clock;
    var gameActive = false, initialized = false;
    var player = { x: 0, y: 1.6, z: 0 };
    var yaw = 0, pitch = 0, mouseSensitivity = 0.002;
    var keys = {};
    var WALK_SPEED = 3, CROUCH_SPEED = 1.5;
    var isCrouching = false, flashlightOn = true;
    var flashlight = null;

    // Game state
    var gameTime = 0; // 0-360 seconds = midnight to 6AM
    var disturbances = [], disturbancesChecked = 0, totalDisturbances = 5;
    var ghosts = [];
    var graves = [];
    var trees = [];

    // Input
    document.addEventListener('keydown', function (e) {
        keys[e.code] = true;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isCrouching = true;
        if (e.code === 'KeyF' && gameActive) { flashlightOn = !flashlightOn; HorrorAudio.playClick(); }
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); document.exitPointerLock(); }
    });
    document.addEventListener('keyup', function (e) {
        keys[e.code] = false;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isCrouching = false;
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
    }

    function buildCemetery() {
        // Ground
        var groundMat = new THREE.MeshStandardMaterial({ color: 0x1a2a15, roughness: 0.95 });
        var ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
        ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
        scene.add(ground);

        // Moonlight
        var moon = new THREE.DirectionalLight(0x334466, 0.15);
        moon.position.set(20, 30, 10); moon.castShadow = true;
        scene.add(moon);
        scene.add(new THREE.AmbientLight(0x111122, 0.08));

        // Player flashlight
        flashlight = new THREE.SpotLight(0xffffcc, 1.5, 20, Math.PI / 6, 0.3, 1);
        flashlight.castShadow = true;
        camera.add(flashlight);
        camera.add(flashlight.target);
        flashlight.target.position.set(0, 0, -5);
        scene.add(camera);

        // Gravestones
        var graveMat = new THREE.MeshStandardMaterial({ color: 0x556655, roughness: 0.9 });
        graves = [];
        for (var i = 0; i < 40; i++) {
            var gx = (Math.random() - 0.5) * 50;
            var gz = (Math.random() - 0.5) * 50;
            if (Math.abs(gx) < 3 && Math.abs(gz) < 3) continue;
            var gType = Math.floor(Math.random() * 3);
            var gMesh;
            if (gType === 0) {
                gMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.15), graveMat.clone());
            } else if (gType === 1) {
                // Cross
                var crossGroup = new THREE.Group();
                crossGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.1), graveMat.clone()));
                crossGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.1), graveMat.clone()).translateY(0.35));
                gMesh = crossGroup;
            } else {
                gMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), graveMat.clone());
            }
            gMesh.position.set(gx, gType === 2 ? 0.15 : 0.6, gz);
            gMesh.rotation.y = Math.random() * 0.3 - 0.15;
            if (gMesh.castShadow !== undefined) gMesh.castShadow = true;
            scene.add(gMesh);
            graves.push({ mesh: gMesh, x: gx, z: gz });
        }

        // Dead trees
        var treeMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 });
        trees = [];
        for (var i = 0; i < 12; i++) {
            var tx = (Math.random() - 0.5) * 60;
            var tz = (Math.random() - 0.5) * 60;
            var treeGroup = new THREE.Group();
            // Trunk
            var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 4 + Math.random() * 2), treeMat);
            trunk.position.y = 2; trunk.castShadow = true;
            treeGroup.add(trunk);
            // Branches
            for (var b = 0; b < 4; b++) {
                var branch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 1.5 + Math.random()), treeMat);
                branch.position.set(0, 2.5 + b * 0.5, 0);
                branch.rotation.z = (Math.random() - 0.5) * 1.5;
                branch.rotation.y = b * Math.PI / 2;
                treeGroup.add(branch);
            }
            treeGroup.position.set(tx, 0, tz);
            scene.add(treeGroup);
            trees.push({ x: tx, z: tz });
        }

        // Iron fence segments around perimeter
        var fenceMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
        for (var side = 0; side < 4; side++) {
            for (var seg = 0; seg < 10; seg++) {
                var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8), fenceMat);
                var offset = -22.5 + seg * 5;
                if (side === 0) bar.position.set(offset, 0.9, -25);
                else if (side === 1) bar.position.set(offset, 0.9, 25);
                else if (side === 2) bar.position.set(-25, 0.9, offset);
                else bar.position.set(25, 0.9, offset);
                scene.add(bar);
            }
        }

        // Spawn disturbances
        spawnDisturbances();
    }

    function spawnDisturbances() {
        disturbances = [];
        for (var i = 0; i < totalDisturbances; i++) {
            var dx = (Math.random() - 0.5) * 40;
            var dz = (Math.random() - 0.5) * 40;
            if (Math.abs(dx) < 5 && Math.abs(dz) < 5) { dx += 10; dz += 10; }
            // Glowing marker
            var light = new THREE.PointLight(0xff4400, 0.5, 8);
            light.position.set(dx, 0.5, dz);
            scene.add(light);
            var marker = new THREE.Mesh(
                new THREE.SphereGeometry(0.3, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 })
            );
            marker.position.set(dx, 0.5, dz);
            scene.add(marker);
            disturbances.push({ x: dx, z: dz, checked: false, light: light, marker: marker });
        }
    }

    function spawnGhost(x, z) {
        var ghostMat = new THREE.MeshStandardMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.4, emissive: 0x445566, emissiveIntensity: 0.3 });
        var body = new THREE.Group();
        body.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), ghostMat));
        body.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.2, 8), ghostMat).translateY(-0.8));
        // Eyes
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 });
        body.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat).translateX(-0.15).translateY(0.05).translateZ(0.35));
        body.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat).translateX(0.15).translateY(0.05).translateZ(0.35));

        body.position.set(x, 1.2, z);
        scene.add(body);
        ghosts.push({ mesh: body, x: x, z: z, speed: 1.5 + Math.random(), patrolAngle: Math.random() * Math.PI * 2, state: 'patrol', alertTimer: 0 });
    }

    function startGame() {
        if (!GameUtils.checkWebGL()) return;
        init();
        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        HorrorAudio.startDrone(30, 'dark');
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
        ghosts = []; disturbances = [];
        gameTime = 0; disturbancesChecked = 0;
        player.x = 0; player.y = 1.6; player.z = 0;
        yaw = 0; pitch = 0; isCrouching = false; flashlightOn = true;
        buildCemetery();
        // Quality tier enhancements
        try { if (typeof QualityEnhancer !== 'undefined') QualityEnhancer.enhance(renderer, scene, camera); } catch(e) { console.warn('QualityEnhancer:', e); }
        // Spawn initial ghosts
        for (var i = 0; i < 3; i++) {
            spawnGhost((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
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
        var btn = document.querySelector('#game-over-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function gameWin() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.WIN);
        document.exitPointerLock();
        HorrorAudio.playWin(); HorrorAudio.stopDrone(); HorrorAudio.stopWind();
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-win-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function update(dt) {
        // Time progresses — 360 seconds = 6 hours (midnight to 6AM)
        var timeSpeed = 1 / GameUtils.getMultiplier(); // harder = slower time
        gameTime += dt * timeSpeed;
        if (window.ChallengeManager) ChallengeManager.notify('graveyard-shift', 'survival_time', gameTime);
        if (gameTime >= 360 && disturbancesChecked >= totalDisturbances) { gameWin(); return; }

        // Movement
        var speed = (isCrouching ? CROUCH_SPEED : WALK_SPEED) * dt;
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
            player.x += (forward.x * moveZ + right.x * moveX) * speed;
            player.z += (forward.z * moveZ + right.z * moveX) * speed;
            // Bounds
            player.x = Math.max(-24, Math.min(24, player.x));
            player.z = Math.max(-24, Math.min(24, player.z));
        }

        // Player height (crouching)
        var targetY = isCrouching ? 1.0 : 1.6;
        player.y += (targetY - player.y) * 8 * dt;

        // Flashlight
        if (flashlight) {
            flashlight.intensity = flashlightOn ? 1.5 : 0;
        }

        // Check disturbances proximity
        for (var i = 0; i < disturbances.length; i++) {
            var d = disturbances[i];
            if (d.checked) continue;
            var dx = player.x - d.x, dz = player.z - d.z;
            if (Math.sqrt(dx * dx + dz * dz) < 2) {
                d.checked = true; disturbancesChecked++;
                scene.remove(d.light); scene.remove(d.marker);
                HorrorAudio.playCollect();
                // Spawn a new ghost at the disturbance
                spawnGhost(d.x + (Math.random() - 0.5) * 5, d.z + (Math.random() - 0.5) * 5);
                HorrorAudio.playJumpScare();
            }
        }

        // Update ghosts
        var playerNoise = isMoving ? (isCrouching ? 5 : 12) : 2;
        if (flashlightOn) playerNoise += 3;

        for (var i = 0; i < ghosts.length; i++) {
            var g = ghosts[i];
            var dx = player.x - g.x, dz = player.z - g.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < playerNoise && g.state !== 'chase') {
                g.state = 'chase'; g.alertTimer = 5;
                if (!g.spotted) {
                    g.spotted = true;
                    if (window.ChallengeManager) ChallengeManager.notify('graveyard-shift', 'ghosts_spotted', 1);
                }
            }
            if (g.state === 'chase') {
                g.alertTimer -= dt;
                g.x += (dx / dist) * g.speed * 1.5 * dt;
                g.z += (dz / dist) * g.speed * 1.5 * dt;
                if (g.alertTimer <= 0) g.state = 'patrol';
                // Catch player
                if (dist < 1.2) { gameOver(); return; }
            } else {
                // Patrol
                g.patrolAngle += dt * 0.3;
                g.x += Math.cos(g.patrolAngle) * g.speed * 0.3 * dt;
                g.z += Math.sin(g.patrolAngle) * g.speed * 0.3 * dt;
                // Keep in bounds
                g.x = Math.max(-24, Math.min(24, g.x));
                g.z = Math.max(-24, Math.min(24, g.z));
            }

            // Float animation
            g.mesh.position.set(g.x, 1.2 + Math.sin(gameTime * 2 + i) * 0.15, g.z);
            g.mesh.lookAt(player.x, 1.2, player.z);
            // Ghost opacity based on state
            g.mesh.children.forEach(function (c) {
                if (c.material && c.material.opacity !== undefined) {
                    c.material.opacity = g.state === 'chase' ? 0.7 : 0.3;
                }
            });
        }

        // Camera
        camera.position.set(player.x, player.y, player.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.x = pitch;
        camera.rotation.y = yaw;

        // Sky color changes as dawn approaches
        var dawnPct = Math.max(0, (gameTime - 300) / 60);
        var r = 0.02 + dawnPct * 0.2, g = 0.02 + dawnPct * 0.1, b = 0.06 + dawnPct * 0.15;
        scene.background.setRGB(r, g, b);
        scene.fog.color.setRGB(r, g, b);

        // HUD
        var hours = Math.floor(gameTime / 60);
        var mins = Math.floor(gameTime % 60);
        var ampm = hours >= 5 ? ' AM' : ' AM';
        var displayH = 12 + hours;
        if (displayH > 12) displayH -= 12;
        var h1 = document.getElementById('hud-time');
        if (h1) h1.textContent = displayH + ':' + (mins < 10 ? '0' : '') + mins + ampm;
        var h2 = document.getElementById('hud-spots');
        if (h2) h2.textContent = 'Disturbances: ' + disturbancesChecked + '/' + totalDisturbances;
    }

    function gameLoop() {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        var dt = Math.min(clock.getDelta(), 0.1);
        update(dt);
        renderer.render(scene, camera);
    }
})();
