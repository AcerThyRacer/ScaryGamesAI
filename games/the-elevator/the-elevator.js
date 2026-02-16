/* ============================================
   The Elevator — Psychological Horror (Three.js)
   OVERHAULED: 25 floors, sanity system, floor puzzles,
   entities, collectibles, anomalies, multiple endings
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
    var isRiding = false, rideTimer = 0;
    var floorRoom = null;
    var elevGroup = null;

    // ── NEW: Enhanced floor system ────────────────────
    var FLOOR_THEMES = [
        { name: 'Empty Office', wallColor: 0x888877, floorColor: 0x555544, light: 0xffeecc, msg: 'Abandoned cubicles stretch endlessly...', props: 'office' },
        { name: 'Hospital', wallColor: 0xccddcc, floorColor: 0x889988, light: 0xeeffee, msg: 'Empty gurneys. The smell of antiseptic.', props: 'hospital' },
        { name: 'Meat Locker', wallColor: 0x553333, floorColor: 0x331111, light: 0xff4444, msg: 'Hooks hang from the ceiling. Cold.', props: 'hooks' },
        { name: 'Nursery', wallColor: 0xccbbaa, floorColor: 0x998877, light: 0xffffcc, msg: 'Tiny cribs. Something is crying.', props: 'cribs' },
        { name: 'Upside Down', wallColor: 0x332244, floorColor: 0x221133, light: 0x8844ff, msg: 'Gravity feels wrong here.', props: 'invert' },
        { name: 'Mirror Room', wallColor: 0x334455, floorColor: 0x223344, light: 0xaaccff, msg: 'Your reflection moves differently...', props: 'mirrors' },
        { name: 'Darkness', wallColor: 0x111111, floorColor: 0x050505, light: 0x220000, msg: 'Something breathes in the dark.', props: 'dark' },
        { name: 'Flooded', wallColor: 0x224455, floorColor: 0x113344, light: 0x44aacc, msg: 'The water is rising.', props: 'water' },
        { name: 'Library', wallColor: 0x554433, floorColor: 0x332211, light: 0xddbb88, msg: 'Books open on their own...', props: 'books' },
        { name: 'Morgue', wallColor: 0x445544, floorColor: 0x223322, light: 0xccffcc, msg: 'The drawers are labeled. One has your name.', props: 'morgue' },
        { name: 'Ballroom', wallColor: 0x665544, floorColor: 0x443322, light: 0xffddaa, msg: 'Music plays. No one is dancing.', props: 'ballroom' },
        { name: 'Prison', wallColor: 0x444444, floorColor: 0x333333, light: 0x999999, msg: 'The cells are all open. Except one.', props: 'prison' },
        { name: 'Garden', wallColor: 0x224422, floorColor: 0x112211, light: 0x66ff66, msg: 'Dead flowers everywhere. One is blooming.', props: 'garden' },
        { name: 'Chapel', wallColor: 0x443344, floorColor: 0x221122, light: 0xff88ff, msg: 'The altar glows with an unholy light.', props: 'chapel' },
        { name: 'Engine Room', wallColor: 0x333333, floorColor: 0x222222, light: 0xff8844, msg: 'Machinery grinds. Is this what keeps it running?', props: 'engine' },
    ];

    // ── NEW: Anomaly System ───────────────────────────
    var anomalyActive = false;
    var anomalyType = '';
    var anomalyTimer = 0;
    var anomalies = ['flicker', 'whisper', 'mirror_self', 'blood_walls', 'gravity_shift', 'time_loop', 'shadow_figure'];

    // ── NEW: Collectibles ─────────────────────────────
    var notes = [];
    var notesCollected = 0;
    var totalNotes = 8;
    var sanityPills = 0;
    var hasFlashlight = false;
    var flashlight = null;

    // ── NEW: Entity system ────────────────────────────
    var entities = [];
    var entityWarning = false;
    var entityWarningTimer = 0;

    // ── NEW: Stats ────────────────────────────────────
    var floorsVisited = 0;
    var anomaliesSeen = 0;
    var totalRideTime = 0;
    var startTime = 0;

    // ── NEW: Messages ─────────────────────────────────
    var msgText = '';
    var msgTimer2 = 0;

    // ── NEW: Ending tracking ──────────────────────────
    var ending = ''; // escape, madness, consumed, transcend

    // Input
    document.addEventListener('keydown', function (e) {
        keys[e.code] = true;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isSprinting = true;
        if (e.code === 'KeyE' && gameActive) handleInteract();
        if (e.code === 'KeyF' && gameActive && hasFlashlight) { toggleFlashlight(); }
        if (e.code === 'KeyQ' && gameActive && sanityPills > 0) { usePills(); }
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

    function toggleFlashlight() {
        if (!flashlight) return;
        flashlight.visible = !flashlight.visible;
        HorrorAudio.playClick();
    }

    function usePills() {
        sanityPills--;
        sanity = Math.min(100, sanity + 25);
        showMsg('💊 Sanity restored. (' + sanityPills + ' pills left)');
        HorrorAudio.playCollect();
    }

    function showMsg(text) { msgText = text; msgTimer2 = 3; }

    function buildElevator() {
        elevGroup = new THREE.Group();
        var wallMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.8 });
        var floorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.1, metalness: 0.5 });

        var fl = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), floorMat);
        fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; elevGroup.add(fl);
        var ceil = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshStandardMaterial({ color: 0x666666 }));
        ceil.rotation.x = Math.PI / 2; ceil.position.y = 2.8; elevGroup.add(ceil);
        var back = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.8), wallMat);
        back.position.set(0, 1.4, -1.5); elevGroup.add(back);
        var left = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.8), wallMat);
        left.rotation.y = Math.PI / 2; left.position.set(-1.5, 1.4, 0); elevGroup.add(left);
        var right = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.8), wallMat);
        right.rotation.y = -Math.PI / 2; right.position.set(1.5, 1.4, 0); elevGroup.add(right);

        elevatorLight = new THREE.PointLight(0xffffcc, 0.8, 8);
        elevatorLight.position.set(0, 2.6, 0); elevatorLight.castShadow = true; elevGroup.add(elevatorLight);

        var doorFrame = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
        var leftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.4, 0.05), doorFrame);
        leftDoor.position.set(-0.4, 1.2, 1.5); leftDoor.name = 'leftDoor'; elevGroup.add(leftDoor);
        var rightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.4, 0.05), doorFrame);
        rightDoor.position.set(0.4, 1.2, 1.5); rightDoor.name = 'rightDoor'; elevGroup.add(rightDoor);
        elevatorDoor = { left: leftDoor, right: rightDoor };

        var panel = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x220000, emissiveIntensity: 0.5 }));
        panel.position.set(0, 2.4, 1.48); elevGroup.add(panel);
        var buttonPanel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.05), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 }));
        buttonPanel.position.set(1.2, 1.2, 1.3); elevGroup.add(buttonPanel);
        for (var i = 0; i < 5; i++) {
            var btn = new THREE.Mesh(new THREE.CircleGeometry(0.02, 8), new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.3 }));
            btn.position.set(1.2, 1.4 - i * 0.12, 1.33); elevGroup.add(btn);
        }

        // Player flashlight
        flashlight = new THREE.SpotLight(0xffffee, 2.0, 25, Math.PI / 5, 0.5, 1);
        flashlight.visible = false;
        camera.add(flashlight);
        camera.add(flashlight.target);
        flashlight.target.position.set(0, 0, -5);

        scene.add(elevGroup);
        scene.add(camera);
        return elevGroup;
    }

    function buildFloorRoom(themeIdx) {
        if (window.ChallengeManager) ChallengeManager.notify('the-elevator', 'floors_visited', 1);
        if (floorRoom) scene.remove(floorRoom);
        var group = new THREE.Group();
        group.position.set(0, 0, 5);

        var theme = FLOOR_THEMES[themeIdx % FLOOR_THEMES.length];
        var wallMat = new THREE.MeshStandardMaterial({ color: theme.wallColor, roughness: 0.9 });
        var floorMat = new THREE.MeshStandardMaterial({ color: theme.floorColor, roughness: 0.95 });

        var fl = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMat);
        fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; group.add(fl);
        var ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: theme.wallColor, roughness: 0.9 }));
        ceil.rotation.x = Math.PI / 2; ceil.position.y = 3; group.add(ceil);

        var wallGeo = new THREE.PlaneGeometry(12, 3);
        var backW = new THREE.Mesh(wallGeo, wallMat); backW.position.set(0, 1.5, -6); group.add(backW);
        var leftW = new THREE.Mesh(wallGeo, wallMat); leftW.rotation.y = Math.PI / 2; leftW.position.set(-6, 1.5, 0); group.add(leftW);
        var rightW = new THREE.Mesh(wallGeo, wallMat); rightW.rotation.y = -Math.PI / 2; rightW.position.set(6, 1.5, 0); group.add(rightW);

        var roomLight = new THREE.PointLight(theme.light, 0.5, 18);
        roomLight.position.set(0, 2.8, 0); roomLight.castShadow = true; group.add(roomLight);

        // ── Theme Props ───────────────────────────────
        var propMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7 });
        if (theme.props === 'office') {
            for (var i = 0; i < 6; i++) { var d = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), propMat); d.position.set(-4 + i * 1.8, 0.4, -3); d.castShadow = true; group.add(d); }
        } else if (theme.props === 'hooks') {
            for (var i = 0; i < 8; i++) { var h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 })); h.position.set(-3.5 + i * 1, 2.2, -2 + Math.random() * 2); group.add(h); var m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.3), new THREE.MeshStandardMaterial({ color: 0x882222 })); m.position.set(-3.5 + i * 1, 1.4, -2 + Math.random() * 2); group.add(m); }
        } else if (theme.props === 'dark') {
            roomLight.intensity = 0.03;
        } else if (theme.props === 'cribs') {
            for (var i = 0; i < 4; i++) { var cr = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xccbbaa })); cr.position.set(-3 + i * 2, 0.25, -3); group.add(cr); }
        } else if (theme.props === 'hospital') {
            for (var i = 0; i < 3; i++) { var g = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 0.8), new THREE.MeshStandardMaterial({ color: 0xcccccc })); g.position.set(-3 + i * 3, 0.6, -3); group.add(g); }
        } else if (theme.props === 'books') {
            for (var i = 0; i < 3; i++) { var s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.5, 1.2), new THREE.MeshStandardMaterial({ color: 0x554433 })); s.position.set(-4 + i * 3.5, 1.25, -5); group.add(s); }
        } else if (theme.props === 'morgue') {
            for (var i = 0; i < 4; i++) { var d = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 2), new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8 })); d.position.set(-3, 0.3 + i * 0.7, -4); group.add(d); }
        } else if (theme.props === 'prison') {
            for (var i = 0; i < 5; i++) { var b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9 })); b.position.set(-4 + i * 0.3, 1.5, -3); group.add(b); }
        } else if (theme.props === 'water') {
            var water = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x224455, transparent: true, opacity: 0.4 }));
            water.rotation.x = -Math.PI / 2; water.position.y = 0.15; group.add(water);
        } else if (theme.props === 'engine') {
            for (var i = 0; i < 3; i++) { var pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 10), new THREE.MeshStandardMaterial({ color: 0x666644, metalness: 0.8 })); pipe.rotation.z = Math.PI / 2; pipe.position.set(0, 0.8 + i * 0.8, -4); group.add(pipe); }
        }

        // ── Collectible on this floor ─────────────────
        if (Math.random() < 0.4 && notesCollected < totalNotes) {
            var noteOrb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffcc44, emissiveIntensity: 0.8 }));
            noteOrb.position.set((Math.random() - 0.5) * 8, 1, (Math.random() - 0.5) * 6);
            noteOrb.name = 'collectible_note';
            group.add(noteOrb);
            var noteLight = new THREE.PointLight(0xffcc44, 0.4, 4);
            noteLight.position.copy(noteOrb.position); group.add(noteLight);
        }
        if (Math.random() < 0.25) {
            var pillOrb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x44ff44, emissiveIntensity: 0.6 }));
            pillOrb.position.set((Math.random() - 0.5) * 8, 1, (Math.random() - 0.5) * 6);
            pillOrb.name = 'collectible_pills';
            group.add(pillOrb);
        }
        if (!hasFlashlight && floor <= 18 && Math.random() < 0.3) {
            var flOrb = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0xffff44, emissive: 0xffff44, emissiveIntensity: 0.8 }));
            flOrb.position.set((Math.random() - 0.5) * 6, 1, (Math.random() - 0.5) * 5);
            flOrb.name = 'collectible_flashlight';
            group.add(flOrb);
            var fLight = new THREE.PointLight(0xffff44, 0.5, 3);
            fLight.position.copy(flOrb.position); group.add(fLight);
        }

        // ── Entity spawn (later floors) ───────────────
        if (floor <= 16 && Math.random() < 0.3 + (25 - floor) * 0.02) {
            spawnEntity(group);
        }

        // Exit orb on final floor
        if (floor <= 1) {
            var exitLight = new THREE.PointLight(0x00ff00, 1, 5);
            exitLight.position.set(0, 1, -4); group.add(exitLight);
            var exitOrb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.8 }));
            exitOrb.position.set(0, 1, -4); exitOrb.name = 'exitOrb'; group.add(exitOrb);
        }

        scene.add(group);
        floorRoom = group;
        showMsg('Floor ' + floor + ': ' + theme.name + ' — ' + theme.msg);
    }

    function spawnEntity(group) {
        var entityTypes = [
            { name: 'Shadow', color: 0x111122, speed: 1.5, damage: 15 },
            { name: 'Mannequin', color: 0xccbbaa, speed: 0.5, damage: 20 },
            { name: 'Wraith', color: 0x445566, speed: 2.5, damage: 10 },
        ];
        var type = entityTypes[Math.floor(Math.random() * entityTypes.length)];
        var eMesh = new THREE.Group();
        var body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.8, 8), new THREE.MeshStandardMaterial({ color: type.color, transparent: true, opacity: 0.6 }));
        body.position.y = 0.9; eMesh.add(body);
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshStandardMaterial({ color: type.color, transparent: true, opacity: 0.6 }));
        head.position.y = 1.95; eMesh.add(head);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 });
        var e1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat); e1.position.set(-0.1, 2, 0.2); eMesh.add(e1);
        var e2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat); e2.position.set(0.1, 2, 0.2); eMesh.add(e2);
        eMesh.position.set((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 6);
        group.add(eMesh);
        entities.push({ mesh: eMesh, x: eMesh.position.x, z: eMesh.position.z + 5, name: type.name, speed: type.speed, damage: type.damage, state: 'idle', timer: 3 + Math.random() * 5 });
    }

    function triggerAnomaly() {
        anomalyType = anomalies[Math.floor(Math.random() * anomalies.length)];
        anomalyActive = true;
        anomalyTimer = 3 + Math.random() * 4;
        anomaliesSeen++;

        if (anomalyType === 'flicker') { showMsg('The lights flicker violently...'); }
        else if (anomalyType === 'whisper') { showMsg('You hear whispers... behind you.'); }
        else if (anomalyType === 'blood_walls') { showMsg('The walls are dripping...'); }
        else if (anomalyType === 'gravity_shift') { showMsg('The floor tilts beneath your feet.'); }
        else if (anomalyType === 'shadow_figure') { showMsg('Something moves in the corner of your eye.'); }
        else if (anomalyType === 'time_loop') { showMsg('Haven\'t you been here before?'); }
        else { showMsg('Something is wrong...'); }

        sanity -= 3;
    }

    function handleInteract() {
        if (isRiding) return;

        // Collect nearby items
        if (floorRoom) {
            var collectibles = [];
            floorRoom.traverse(function (child) {
                if (child.name && child.name.indexOf('collectible') === 0) collectibles.push(child);
                if (child.name === 'exitOrb') collectibles.push(child);
            });
            for (var i = 0; i < collectibles.length; i++) {
                var c = collectibles[i];
                var wx = c.position.x + floorRoom.position.x;
                var wz = c.position.z + floorRoom.position.z;
                var dx = player.x - wx, dz = player.z - wz;
                if (Math.sqrt(dx * dx + dz * dz) < 2) {
                    if (c.name === 'collectible_note') {
                        notesCollected++;
                        showMsg('📜 Found note ' + notesCollected + '/' + totalNotes);
                        HorrorAudio.playCollect();
                        floorRoom.remove(c);
                    } else if (c.name === 'collectible_pills') {
                        sanityPills++;
                        showMsg('💊 Found sanity pills! (Q to use)');
                        HorrorAudio.playCollect();
                        floorRoom.remove(c);
                    } else if (c.name === 'collectible_flashlight') {
                        hasFlashlight = true;
                        flashlight.visible = true;
                        showMsg('🔦 Found flashlight! (F to toggle)');
                        HorrorAudio.playPowerup && HorrorAudio.playPowerup();
                        floorRoom.remove(c);
                    } else if (c.name === 'exitOrb') {
                        ending = 'escape';
                        gameWin(); return;
                    }
                }
            }
        }

        // Near elevator?
        if (player.z < 2 && !doorOpen) { doorOpen = true; HorrorAudio.playClick(); return; }

        // Inside elevator? Ride down
        if (player.z < 1.5 && player.x > -1.5 && player.x < 1.5 && doorOpen) {
            isRiding = true; rideTimer = 3 + Math.random() * 2;
            doorOpen = false;
            floor = Math.max(0, floor - 1);
            floorsVisited++;
            if (floor === 0) { setTimeout(function () { ending = 'escape'; gameWin(); }, 3000); }
            HorrorAudio.playHit();
            return;
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
                startTime = Date.now();
                gameLoop();
            }, 800);
        }, 2500);
    }

    function resetState() {
        while (scene.children.length > 0) scene.remove(scene.children[0]);
        entities = [];
        buildElevator();
        try { if (typeof QualityEnhancer !== 'undefined') QualityEnhancer.enhance(renderer, scene, camera); } catch (e) { }
        floor = 20 + Math.floor(Math.random() * 6);
        sanity = 100; doorOpen = true; isRiding = false;
        doorAnim = 1;
        player.x = 0; player.y = 1.6; player.z = 3;
        yaw = Math.PI; pitch = 0;
        notesCollected = 0; sanityPills = 0; hasFlashlight = false;
        floorsVisited = 0; anomaliesSeen = 0; totalRideTime = 0;
        anomalyActive = false; entityWarning = false; ending = '';
        if (flashlight) flashlight.visible = false;
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
        startTime = Date.now();
        gameLoop();
    }

    function gameOver() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.GAME_OVER);
        document.exitPointerLock();
        HorrorAudio.playDeath(); HorrorAudio.stopDrone();
        var fs = document.getElementById('final-score');
        if (fs) {
            if (ending === 'madness') fs.textContent = 'Your mind shattered on floor ' + floor + '. Notes: ' + notesCollected + '/' + totalNotes;
            else if (ending === 'consumed') fs.textContent = 'Something consumed you on floor ' + floor + '.';
            else fs.textContent = 'Lost on floor ' + floor + '. Floors visited: ' + floorsVisited;
        }
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-over-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function gameWin() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.WIN);
        if (window.ChallengeManager) ChallengeManager.notify('the-elevator', 'sanity', sanity);
        document.exitPointerLock();
        HorrorAudio.playWin(); HorrorAudio.stopDrone();
        var fs = document.getElementById('final-score');
        if (fs) {
            var t = Math.round((Date.now() - startTime) / 1000);
            fs.textContent = 'Escaped! Time: ' + t + 's | Sanity: ' + Math.round(sanity) + '% | Notes: ' + notesCollected + '/' + totalNotes + ' | Floors: ' + floorsVisited;
        }
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
                var len = Math.sqrt(moveX * moveX + moveZ * moveZ); moveX /= len; moveZ /= len;
                var forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
                var right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
                player.x += (forward.x * moveZ + right.x * moveX) * speed;
                player.z += (forward.z * moveZ + right.z * moveX) * speed;
                player.x = Math.max(-5.5, Math.min(5.5, player.x));
                player.z = Math.max(-1, Math.min(10.5, player.z));
                if (isSprinting) { sanity -= dt * 0.3; HorrorAudio.playFootstep(); }
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
            totalRideTime += dt;
            player.y = 1.6 + Math.sin(rideTimer * 15) * 0.02;
            camera.rotation.z = Math.sin(rideTimer * 12) * 0.005;
            if (elevatorLight) elevatorLight.intensity = 0.3 + Math.random() * 0.6;

            // Random anomaly during ride
            if (Math.random() < 0.005) triggerAnomaly();

            if (rideTimer <= 0) {
                isRiding = false;
                doorOpen = true;
                player.y = 1.6; camera.rotation.z = 0;
                if (elevatorLight) elevatorLight.intensity = 0.8;
                entities = [];
                buildFloorRoom(floor);
                sanity -= (5 + (25 - floor) * 0.3) * GameUtils.getMultiplier();
                if (sanity <= 0) { sanity = 0; ending = 'madness'; gameOver(); return; }
                HorrorAudio.playClick();
            }
        }

        // Sanity drain
        sanity -= dt * (0.3 + (25 - floor) * 0.02) * GameUtils.getMultiplier();
        if (sanity <= 0) { sanity = 0; ending = 'madness'; gameOver(); return; }

        // Anomaly timer
        if (anomalyActive) {
            anomalyTimer -= dt;
            if (anomalyType === 'flicker' && elevatorLight) elevatorLight.intensity = Math.random() * 1.5;
            if (anomalyType === 'gravity_shift') { camera.rotation.z += Math.sin(Date.now() * 0.003) * 0.001; }
            if (anomalyTimer <= 0) {
                anomalyActive = false;
                if (elevatorLight) elevatorLight.intensity = 0.8;
                camera.rotation.z = 0;
            }
        }

        // Random anomaly trigger
        if (!anomalyActive && Math.random() < 0.0008 * (25 - floor)) triggerAnomaly();

        // Entity AI
        for (var i = entities.length - 1; i >= 0; i--) {
            var e = entities[i];
            var dx = player.x - e.x, dz = player.z - e.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            e.timer -= dt;
            if (e.timer <= 0) {
                e.state = dist < 8 ? 'chase' : 'idle';
                e.timer = 2 + Math.random() * 3;
            }
            if (e.state === 'chase') {
                e.x += (dx / (dist || 1)) * e.speed * dt;
                e.z += (dz / (dist || 1)) * e.speed * dt;
            }
            if (hasFlashlight && flashlight.visible && dist < 6) {
                // Flashlight pushes entities away
                e.x -= (dx / (dist || 1)) * 3 * dt;
                e.z -= (dz / (dist || 1)) * 3 * dt;
            }
            e.mesh.position.set(e.x - floorRoom.position.x, Math.sin(Date.now() * 0.002 + i) * 0.1, e.z - floorRoom.position.z);
            e.mesh.lookAt(player.x - floorRoom.position.x, 1, player.z - floorRoom.position.z);

            if (dist < 1.2) {
                sanity -= e.damage;
                HorrorAudio.playJumpScare();
                entities.splice(i, 1);
                if (sanity <= 0) { ending = 'consumed'; gameOver(); return; }
            }
        }

        // Message timer
        if (msgTimer2 > 0) msgTimer2 -= dt;

        // Camera
        camera.position.set(player.x, player.y, player.z);
        // Sanity visual effects
        if (sanity < 30) {
            camera.rotation.z += Math.sin(Date.now() * 0.005) * (30 - sanity) * 0.0003;
        }
        camera.rotation.order = 'YXZ';
        camera.rotation.x = pitch;
        camera.rotation.y = yaw;

        // Fog tightens with sanity
        scene.fog.far = 5 + (sanity / 100) * 15;
        // Blood tint at low sanity
        var bgR = Math.max(0, (30 - sanity) / 30) * 0.1;
        scene.background.setRGB(bgR, 0, 0);

        // HUD
        var h1 = document.getElementById('hud-floor');
        if (h1) h1.textContent = 'Floor: ' + (isRiding ? '...' : floor) + ' | 📜 ' + notesCollected + '/' + totalNotes;
        var h2 = document.getElementById('hud-sanity');
        if (h2) {
            h2.textContent = '🧠 ' + Math.round(sanity) + '%' + (sanityPills > 0 ? ' | 💊' + sanityPills : '') + (hasFlashlight ? ' | 🔦' : '');
            h2.style.color = sanity < 30 ? '#ff3333' : '';
        }
    }

    function gameLoop() {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        var dt = Math.min(clock.getDelta(), 0.1);
        update(dt);
        renderer.render(scene, camera);
    }
})();
