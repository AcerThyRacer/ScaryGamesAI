/* ============================================
   The Elevator — Psychological Horror (Three.js)
   First-person 3D — never-ending elevator
   ============================================ */
(function () {
    'use strict';

    var scene, camera, renderer, clock;
    var gameActive = false, initialized = false;
    var player = { x: 0, y: 1.6, z: 0 };
    var yaw = 0, pitch = 0, mouseSensitivity = 0.002;
    var keys = {};
    var sanity = 100, floor = 13;
    var WALK_SPEED = 3, RUN_SPEED = 5.5;
    var isSprinting = false;

    // Elevator state
    var elevatorDoor = null, elevatorLight = null;
    var doorOpen = false, doorAnim = 0;
    var isRiding = false, rideTimer = 0, rideDirection = 0;
    var floorRoom = null; // current floor's room group

    // Floor types
    var FLOOR_THEMES = [
        { name: 'Empty Office', wallColor: 0x888877, floorColor: 0x555544, light: 0xffeecc, msg: 'Abandoned cubicles stretch endlessly...' },
        { name: 'Hospital', wallColor: 0xccddcc, floorColor: 0x889988, light: 0xeeffee, msg: 'The smell of antiseptic. Empty gurneys line the halls.' },
        { name: 'Meat Locker', wallColor: 0x553333, floorColor: 0x331111, light: 0xff4444, msg: 'Hooks hang from the ceiling. The air is cold.' },
        { name: 'Nursery', wallColor: 0xccbbaa, floorColor: 0x998877, light: 0xffffcc, msg: 'Tiny cribs everywhere. Something is crying.' },
        { name: 'Upside Down', wallColor: 0x332244, floorColor: 0x221133, light: 0x8844ff, msg: 'Gravity feels wrong here. The ceiling is the floor.' },
        { name: 'Mirror Room', wallColor: 0x334455, floorColor: 0x223344, light: 0xaaccff, msg: 'Infinite reflections. But your reflection moves differently...' },
        { name: 'Darkness', wallColor: 0x111111, floorColor: 0x050505, light: 0x220000, msg: 'Complete darkness. Something breathes nearby.' },
        { name: 'Flooded', wallColor: 0x224455, floorColor: 0x113344, light: 0x44aacc, msg: 'Ankle-deep water. It\'s rising.' },
    ];

    // Input
    document.addEventListener('keydown', function (e) {
        keys[e.code] = true;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isSprinting = true;
        if (e.code === 'KeyE' && gameActive) handleInteract();
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
        if (gameActive && renderer) {
            try { renderer.domElement.requestPointerLock(); } catch (e) { }
        }
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
        scene.background = new THREE.Color(0x000000);
        scene.fog = new THREE.Fog(0x000000, 1, 20);

        camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);

        renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.6;

        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    function buildElevator() {
        // Elevator car
        var elevGroup = new THREE.Group();
        var wallMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.8 });
        var floorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.1, metalness: 0.5 }); // Polished metal floor

        // Floor
        var fl = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), floorMat);
        fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true;
        elevGroup.add(fl);

        // Ceiling
        var ceil = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshStandardMaterial({ color: 0x666666 }));
        ceil.rotation.x = Math.PI / 2; ceil.position.y = 2.8;
        elevGroup.add(ceil);

        // Back wall
        var back = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.8), wallMat);
        back.position.set(0, 1.4, -1.5); elevGroup.add(back);

        // Side walls
        var left = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.8), wallMat);
        left.rotation.y = Math.PI / 2; left.position.set(-1.5, 1.4, 0); elevGroup.add(left);
        var right = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.8), wallMat);
        right.rotation.y = -Math.PI / 2; right.position.set(1.5, 1.4, 0); elevGroup.add(right);

        // Light
        elevatorLight = new THREE.PointLight(0xffffcc, 0.8, 8);
        elevatorLight.position.set(0, 2.6, 0); elevatorLight.castShadow = true;
        elevGroup.add(elevatorLight);

        // Door frames
        var doorFrame = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
        var leftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.4, 0.05), doorFrame);
        leftDoor.position.set(-0.4, 1.2, 1.5); leftDoor.name = 'leftDoor';
        elevGroup.add(leftDoor);
        var rightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.4, 0.05), doorFrame);
        rightDoor.position.set(0.4, 1.2, 1.5); rightDoor.name = 'rightDoor';
        elevGroup.add(rightDoor);
        elevatorDoor = { left: leftDoor, right: rightDoor };

        // Floor indicator panel
        var panel = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x220000, emissiveIntensity: 0.5 }));
        panel.position.set(0, 2.4, 1.48); elevGroup.add(panel);

        // Buttons panel
        var buttonPanel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.05), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 }));
        buttonPanel.position.set(1.2, 1.2, 1.3); elevGroup.add(buttonPanel);
        // Button dots
        for (var i = 0; i < 5; i++) {
            var btn = new THREE.Mesh(new THREE.CircleGeometry(0.02, 8), new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.3 }));
            btn.position.set(1.2, 1.4 - i * 0.12, 1.33); elevGroup.add(btn);
        }

        scene.add(elevGroup);
        return elevGroup;
    }

    function buildFloorRoom(themeIdx) {
        if (window.ChallengeManager) ChallengeManager.notify('the-elevator', 'floors_visited', 1);
        if (floorRoom) scene.remove(floorRoom);
        var group = new THREE.Group();
        group.position.set(0, 0, 5); // room is in front of elevator

        var theme = FLOOR_THEMES[themeIdx % FLOOR_THEMES.length];
        var wallMat = new THREE.MeshStandardMaterial({ color: theme.wallColor, roughness: 0.9 });
        var floorMat = new THREE.MeshStandardMaterial({ color: theme.floorColor, roughness: 0.95 });

        // Floor
        var fl = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMat);
        fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true;
        group.add(fl);

        // Ceiling
        var ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: theme.wallColor, roughness: 0.9 }));
        ceil.rotation.x = Math.PI / 2; ceil.position.y = 3;
        group.add(ceil);

        // Walls
        var wallGeo = new THREE.PlaneGeometry(10, 3);
        var backW = new THREE.Mesh(wallGeo, wallMat);
        backW.position.set(0, 1.5, -5); group.add(backW);
        var leftW = new THREE.Mesh(wallGeo, wallMat);
        leftW.rotation.y = Math.PI / 2; leftW.position.set(-5, 1.5, 0); group.add(leftW);
        var rightW = new THREE.Mesh(wallGeo, wallMat);
        rightW.rotation.y = -Math.PI / 2; rightW.position.set(5, 1.5, 0); group.add(rightW);

        // Room light
        var roomLight = new THREE.PointLight(theme.light, 0.5, 15);
        roomLight.position.set(0, 2.8, 0); roomLight.castShadow = true;
        group.add(roomLight);

        // Theme-specific props
        var propMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7 });
        if (themeIdx % 8 === 0) { // Office - cubicles
            for (var i = 0; i < 4; i++) {
                var desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1), propMat);
                desk.position.set(-3 + i * 2.2, 0.4, -2); desk.castShadow = true;
                group.add(desk);
            }
        } else if (themeIdx % 8 === 2) { // Meat Locker - hanging hooks
            for (var i = 0; i < 6; i++) {
                var hook = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 }));
                hook.position.set(-3 + i * 1.3, 2.2, -2 + Math.random() * 2);
                group.add(hook);
                var meat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.3), new THREE.MeshStandardMaterial({ color: 0x882222 }));
                meat.position.set(-3 + i * 1.3, 1.4, -2 + Math.random() * 2);
                group.add(meat);
            }
        } else if (themeIdx % 8 === 6) { // Darkness - almost no light
            roomLight.intensity = 0.05;
        }

        // Clue item — glowing orb that marks the exit floor
        if (floor <= 1) {
            var exitLight = new THREE.PointLight(0x00ff00, 1, 5);
            exitLight.position.set(0, 1, -3); group.add(exitLight);
            var exitOrb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.8 }));
            exitOrb.position.set(0, 1, -3); exitOrb.name = 'exitOrb';
            group.add(exitOrb);
        }

        scene.add(group);
        floorRoom = group;
    }

    function handleInteract() {
        if (isRiding) return;

        // Near elevator? (player z < 2)
        if (player.z < 2 && !doorOpen) {
            // Call elevator
            doorOpen = true;
            HorrorAudio.playClick();
            return;
        }

        // Inside elevator? Go to next floor
        if (player.z < 1.5 && player.x > -1.5 && player.x < 1.5 && doorOpen) {
            isRiding = true; rideTimer = 3;
            doorOpen = false;
            // Decide direction — floors count down toward 0
            floor = Math.max(0, floor - 1);
            if (floor === 0) {
                setTimeout(function () { gameWin(); }, 3000);
            }
            HorrorAudio.playHit();
            return;
        }

        // Near exit orb?
        if (floor <= 1) {
            var dx = player.x - 0, dz = player.z - 8; // orb at (0, 1, -3) in room which is offset by 5
            if (Math.sqrt(dx * dx + dz * dz) < 2) {
                gameWin();
            }
        }
    }

    function startGame() {
        if (!GameUtils.checkWebGL()) return;
        init();

        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        HorrorAudio.startDrone(30, 'dark');

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
        // Clear scene except elevator
        while (scene.children.length > 0) scene.remove(scene.children[0]);
        buildElevator();
        floor = 8 + Math.floor(Math.random() * 6); // start at random high floor
        sanity = 100; doorOpen = true; isRiding = false;
        doorAnim = 1; // start with doors open
        player.x = 0; player.y = 1.6; player.z = 3;
        yaw = Math.PI; pitch = 0;
        buildFloorRoom(floor);
    }

    function restartGame() {
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        HorrorAudio.startDrone(30, 'dark');
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
        if (window.ChallengeManager) ChallengeManager.notify('the-elevator', 'sanity', sanity);
        document.exitPointerLock();
        HorrorAudio.playWin(); HorrorAudio.stopDrone();
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-win-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function update(dt) {
        // Movement
        if (!isRiding) {
            var speed = (isSprinting ? RUN_SPEED : WALK_SPEED) * dt;
            var moveX = 0, moveZ = 0;
            if (keys['KeyW']) moveZ += 1;
            if (keys['KeyS']) moveZ -= 1;
            if (keys['KeyA']) moveX -= 1;
            if (keys['KeyD']) moveX += 1;
            if (moveX || moveZ) {
                var len = Math.sqrt(moveX * moveX + moveZ * moveZ);
                moveX /= len; moveZ /= len;
                var forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
                var right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
                player.x += (forward.x * moveZ + right.x * moveX) * speed;
                player.z += (forward.z * moveZ + right.z * moveX) * speed;
                // Bounds: elevator is at z=0, room extends to z=10
                player.x = Math.max(-4.5, Math.min(4.5, player.x));
                player.z = Math.max(-1, Math.min(9.5, player.z));
                if (isSprinting) HorrorAudio.playFootstep();
            }
        }

        // Door animation
        var targetDoor = doorOpen ? 1 : 0;
        doorAnim += (targetDoor - doorAnim) * 3 * dt;
        if (elevatorDoor) {
            elevatorDoor.left.position.x = -0.4 - doorAnim * 0.4;
            elevatorDoor.right.position.x = 0.4 + doorAnim * 0.4;
        }

        // Elevator ride
        if (isRiding) {
            rideTimer -= dt;
            // Shake during ride
            player.y = 1.6 + Math.sin(rideTimer * 15) * 0.02;
            camera.rotation.z = Math.sin(rideTimer * 12) * 0.005;
            // Flicker light
            if (elevatorLight) elevatorLight.intensity = 0.3 + Math.random() * 0.6;

            if (rideTimer <= 0) {
                isRiding = false;
                doorOpen = true;
                player.y = 1.6;
                camera.rotation.z = 0;
                if (elevatorLight) elevatorLight.intensity = 0.8;
                buildFloorRoom(floor);
                sanity -= 5 * GameUtils.getMultiplier();
                if (sanity <= 0) { sanity = 0; gameOver(); return; }
                HorrorAudio.playClick();
            }
        }

        // Passive sanity drain
        sanity -= dt * 0.5 * GameUtils.getMultiplier();
        if (sanity <= 0) { sanity = 0; gameOver(); return; }

        // Camera
        camera.position.set(player.x, player.y, player.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.x = pitch;
        camera.rotation.y = yaw;

        // Fog tightens as sanity drops
        scene.fog.far = 5 + (sanity / 100) * 15;

        // HUD
        var h1 = document.getElementById('hud-floor'); if (h1) h1.textContent = 'Floor: ' + (isRiding ? '...' : floor);
        var h2 = document.getElementById('hud-sanity');
        if (h2) { h2.textContent = 'Sanity: ' + Math.round(sanity) + '%'; h2.style.color = sanity < 30 ? '#ff3333' : ''; }
    }

    function gameLoop() {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        var dt = Math.min(clock.getDelta(), 0.1);
        update(dt);
        renderer.render(scene, camera);
    }
})();
