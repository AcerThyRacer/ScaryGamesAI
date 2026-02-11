/* ============================================
   Yeti Run — 3D Horror Chase Game
   AAA-quality Three.js Third-Person Runner
   ============================================ */

(function () {
    'use strict';

    var scene, camera, renderer, clock;
    var player, yeti, terrain;
    var trees = [], rocks = [], snowParticles = [];
    var lanes = [-4, 0, 4];
    var currentLane = 1;
    var targetX = 0;
    var playerVY = 0;
    var isGrounded = true;
    var isSprinting = false;
    var gameActive = false;
    var initialized = false;
    var distance = 0;
    var bestDistance = parseInt(localStorage.getItem('yeti_best') || '0', 10);
    var baseSpeed = 18;
    var currentSpeed = 18;
    var yetiDistance = 30;
    var yetiBaseDistance = 30;
    var obstacles = [];
    var spawnTimer = 0;
    var keys = {};
    var breathFog = null;
    var stormIntensity = 0;
    var terrainChunks = [];
    var chunkSize = 100;
    var lastChunkZ = 0;
    var shakeMag = 0;

    // Performance: object pools
    var OBSTACLE_POOL_SIZE = 20;
    var TREE_POOL_SIZE = 60;
    var ROCK_POOL_SIZE = 40;

    // Attach listeners IMMEDIATELY
    document.addEventListener('keydown', function (e) {
        if (!gameActive) return;
        keys[e.code] = true;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') dodgeLeft();
        if (e.code === 'KeyD' || e.code === 'ArrowRight') dodgeRight();
        if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') jump();
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isSprinting = true;
    });
    document.addEventListener('keyup', function (e) {
        keys[e.code] = false;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isSprinting = false;
    });
    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.getElementById('fullscreen-btn').addEventListener('click', function () {
        GameUtils.toggleFullscreen();
    });

    // Inject difficulty & pause
    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING); animate(); },
        onRestart: restartGame
    });

    document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); }
    });

    function dodgeLeft() {
        if (currentLane > 0) {
            currentLane--; targetX = lanes[currentLane];
            if (window.ChallengeManager) ChallengeManager.notify('yeti-run', 'dodges', 1);
        }
    }
    function dodgeRight() {
        if (currentLane < 2) {
            currentLane++; targetX = lanes[currentLane];
            if (window.ChallengeManager) ChallengeManager.notify('yeti-run', 'dodges', 1);
        }
    }
    function jump() {
        if (isGrounded) {
            playerVY = 14; isGrounded = false; HorrorAudio.playJump();
            if (window.ChallengeManager) ChallengeManager.notify('yeti-run', 'jumps', 1);
        }
    }

    function init() {
        if (initialized) return;
        initialized = true;

        clock = new THREE.Clock();

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a2030);
        scene.fog = new THREE.Fog(0x1a2030, 40, 120);

        // Camera - third person behind player
        camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
        camera.position.set(0, 6, 10);
        camera.lookAt(0, 2, -10);

        // Renderer - high quality
        renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.8;

        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Lighting - dramatic
        var ambLight = new THREE.AmbientLight(0x2a3a5a, 0.4);
        scene.add(ambLight);

        var moonLight = new THREE.DirectionalLight(0x8899cc, 0.6);
        moonLight.position.set(-20, 40, -30);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        moonLight.shadow.camera.near = 0.5;
        moonLight.shadow.camera.far = 120;
        moonLight.shadow.camera.left = -30;
        moonLight.shadow.camera.right = 30;
        moonLight.shadow.camera.top = 30;
        moonLight.shadow.camera.bottom = -30;
        scene.add(moonLight);

        var rimLight = new THREE.DirectionalLight(0x445577, 0.3);
        rimLight.position.set(10, 20, 10);
        scene.add(rimLight);

        // Hemisphere light for sky/ground color blending
        var hemiLight = new THREE.HemisphereLight(0x3344aa, 0x222233, 0.3);
        scene.add(hemiLight);

        createPlayer();
        createYeti();
        createTerrain();
        createSnow();
        createForest();
        // Quality tier enhancements
        try { if (typeof QualityEnhancer !== 'undefined') QualityEnhancer.enhance(renderer, scene, camera); } catch(e) { console.warn('QualityEnhancer:', e); }
    }

    function createPlayer() {
        player = new THREE.Group();

        // Body (thick winter jacket)
        var bodyGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.2, 8);
        var bodyMat = new THREE.MeshStandardMaterial({ color: 0x993322, roughness: 0.8, metalness: 0.1 });
        var body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.2;
        body.castShadow = true;
        player.add(body);

        // Head
        var headGeo = new THREE.SphereGeometry(0.25, 12, 12);
        var headMat = new THREE.MeshStandardMaterial({ color: 0xddaa88, roughness: 0.6 });
        var head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.05;
        head.castShadow = true;
        player.add(head);

        // Beanie
        var beanieGeo = new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
        var beanieMat = new THREE.MeshStandardMaterial({ color: 0x222288, roughness: 0.9 });
        var beanie = new THREE.Mesh(beanieGeo, beanieMat);
        beanie.position.y = 2.15;
        player.add(beanie);

        // Legs
        var legGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.7, 6);
        var legMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.8 });
        var leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.18, 0.35, 0);
        leftLeg.castShadow = true;
        player.add(leftLeg);
        player.userData.leftLeg = leftLeg;

        var rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.18, 0.35, 0);
        rightLeg.castShadow = true;
        player.add(rightLeg);
        player.userData.rightLeg = rightLeg;

        // Arms
        var armGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 6);
        var armMat = new THREE.MeshStandardMaterial({ color: 0x993322, roughness: 0.8 });
        var leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.5, 1.3, 0);
        leftArm.rotation.z = 0.3;
        player.add(leftArm);
        player.userData.leftArm = leftArm;

        var rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.5, 1.3, 0);
        rightArm.rotation.z = -0.3;
        player.add(rightArm);
        player.userData.rightArm = rightArm;

        // Flashlight glow attached to player
        var flashlight = new THREE.SpotLight(0xffffdd, 0.6, 30, Math.PI / 6, 0.5, 1.5);
        flashlight.position.set(0, 2, 0);
        flashlight.target.position.set(0, 1, -15);
        player.add(flashlight);
        player.add(flashlight.target);

        // Player point light (warm glow)
        var playerGlow = new THREE.PointLight(0xff8844, 0.3, 8);
        playerGlow.position.set(0, 2, 0);
        player.add(playerGlow);

        player.position.set(0, 0, 0);
        scene.add(player);
    }

    function createYeti() {
        yeti = new THREE.Group();

        // Main body — massive
        var bodyGeo = new THREE.CylinderGeometry(1.2, 1.5, 4, 12);
        var furMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, roughness: 1.0, metalness: 0 });
        var body = new THREE.Mesh(bodyGeo, furMat);
        body.position.y = 2.5;
        body.castShadow = true;
        yeti.add(body);

        // Head
        var headGeo = new THREE.SphereGeometry(0.9, 16, 16);
        var head = new THREE.Mesh(headGeo, furMat);
        head.position.y = 5.2;
        head.castShadow = true;
        yeti.add(head);

        // Glowing red eyes
        var eyeGeo = new THREE.SphereGeometry(0.15, 8, 8);
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.0 });
        var le = new THREE.Mesh(eyeGeo, eyeMat);
        le.position.set(-0.35, 5.3, -0.75);
        yeti.add(le);
        var re = new THREE.Mesh(eyeGeo, eyeMat);
        re.position.set(0.35, 5.3, -0.75);
        yeti.add(re);

        // Eye glow lights
        var eyeGlow = new THREE.PointLight(0xff0000, 2, 15);
        eyeGlow.position.set(0, 5.3, -0.8);
        yeti.add(eyeGlow);

        // Mouth
        var mouthGeo = new THREE.BoxGeometry(0.6, 0.2, 0.3);
        var mouthMat = new THREE.MeshStandardMaterial({ color: 0x440000 });
        var mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, 4.7, -0.8);
        yeti.add(mouth);

        // Teeth
        var toothGeo = new THREE.ConeGeometry(0.06, 0.15, 4);
        var toothMat = new THREE.MeshStandardMaterial({ color: 0xffffee });
        for (var i = 0; i < 5; i++) {
            var tooth = new THREE.Mesh(toothGeo, toothMat);
            tooth.position.set(-0.2 + i * 0.1, 4.62, -0.85);
            tooth.rotation.x = Math.PI;
            yeti.add(tooth);
        }

        // Arms — massive and hanging
        var armGeo = new THREE.CylinderGeometry(0.35, 0.25, 2.5, 8);
        var la = new THREE.Mesh(armGeo, furMat);
        la.position.set(-1.6, 2.8, 0);
        la.rotation.z = 0.4;
        la.castShadow = true;
        yeti.add(la);
        yeti.userData.leftArm = la;

        var ra = new THREE.Mesh(armGeo, furMat);
        ra.position.set(1.6, 2.8, 0);
        ra.rotation.z = -0.4;
        ra.castShadow = true;
        yeti.add(ra);
        yeti.userData.rightArm = ra;

        // Legs
        var legGeo = new THREE.CylinderGeometry(0.4, 0.45, 2, 8);
        var ll = new THREE.Mesh(legGeo, furMat);
        ll.position.set(-0.6, 0.5, 0);
        ll.castShadow = true;
        yeti.add(ll);
        yeti.userData.leftLeg = ll;

        var rl = new THREE.Mesh(legGeo, furMat);
        rl.position.set(0.6, 0.5, 0);
        rl.castShadow = true;
        yeti.add(rl);
        yeti.userData.rightLeg = rl;

        // Fur detail - spiky tufts
        var spikeGeo = new THREE.ConeGeometry(0.15, 0.5, 4);
        for (var i = 0; i < 20; i++) {
            var spike = new THREE.Mesh(spikeGeo, furMat);
            var angle = Math.random() * Math.PI * 2;
            var yPos = 1.5 + Math.random() * 3.5;
            spike.position.set(Math.cos(angle) * (1.0 + Math.random() * 0.5), yPos, Math.sin(angle) * (1.0 + Math.random() * 0.5));
            spike.rotation.set(Math.random() * 0.5 - 0.25, 0, Math.random() * 0.5 - 0.25);
            yeti.add(spike);
        }

        // Breath fog
        breathFog = new THREE.PointLight(0x88aaff, 0.5, 6);
        breathFog.position.set(0, 4.7, -1.5);
        yeti.add(breathFog);

        yeti.position.set(0, 0, yetiDistance);
        yeti.scale.set(1.2, 1.2, 1.2);
        scene.add(yeti);
    }

    function createTerrain() {
        // Create several chunks of snowy terrain
        var snowMat = new THREE.MeshStandardMaterial({
            color: 0xdde8f0,
            roughness: 0.4, // Icier
            metalness: 0.1,
            emissive: 0x112233,
            emissiveIntensity: 0.1
        });

        for (var i = 0; i < 5; i++) {
            var geo = new THREE.PlaneGeometry(80, chunkSize, 20, 20);
            // Displace vertices for terrain variation
            var pos = geo.attributes.position;
            for (var j = 0; j < pos.count; j++) {
                var x = pos.getX(j), y = pos.getY(j);
                var noise = Math.sin(x * 0.3) * Math.cos(y * 0.2) * 0.8 + Math.sin(x * 0.7 + y * 0.5) * 0.3;
                pos.setZ(j, noise);
            }
            geo.computeVertexNormals();

            var chunk = new THREE.Mesh(geo, snowMat);
            chunk.rotation.x = -Math.PI / 2;
            chunk.position.z = -chunkSize * i;
            chunk.receiveShadow = true;
            scene.add(chunk);
            terrainChunks.push(chunk);
        }
        lastChunkZ = -chunkSize * 4;

        // Mountains in the background
        var mountMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.95 });
        for (var side = -1; side <= 1; side += 2) {
            for (var i = 0; i < 8; i++) {
                var h = 15 + Math.random() * 25;
                var mountGeo = new THREE.ConeGeometry(8 + Math.random() * 8, h, 6);
                var mount = new THREE.Mesh(mountGeo, mountMat);
                mount.position.set(side * (25 + Math.random() * 15), h / 2 - 2, -i * 30 - Math.random() * 20);
                mount.rotation.y = Math.random() * Math.PI;
                mount.castShadow = true;
                scene.add(mount);

                // Snow cap
                var capGeo = new THREE.ConeGeometry(3 + Math.random() * 3, h * 0.3, 6);
                var capMat = new THREE.MeshStandardMaterial({ color: 0xeef4ff, roughness: 0.7 });
                var cap = new THREE.Mesh(capGeo, capMat);
                cap.position.set(mount.position.x, h * 0.85 - 2, mount.position.z);
                scene.add(cap);
            }
        }

        // Ice path markings (the running track)
        var pathMat = new THREE.MeshStandardMaterial({ color: 0xaabbcc, roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.4 });
        var pathGeo = new THREE.PlaneGeometry(12, 500);
        var path = new THREE.Mesh(pathGeo, pathMat);
        path.rotation.x = -Math.PI / 2;
        path.position.set(0, 0.05, -200);
        scene.add(path);
    }

    function createForest() {
        // Pine trees along the sides
        var trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
        var leavesMat = new THREE.MeshStandardMaterial({ color: 0x1a3a2a, roughness: 0.8 });
        var snowLeavesMat = new THREE.MeshStandardMaterial({ color: 0x2a4a3a, roughness: 0.8 });

        for (var i = 0; i < TREE_POOL_SIZE; i++) {
            var tree = new THREE.Group();
            var trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 2 + Math.random(), 6);
            tree.add(new THREE.Mesh(trunkGeo, trunkMat));

            // Layered cone foliage
            for (var layer = 0; layer < 3; layer++) {
                var rad = 1.5 - layer * 0.4;
                var h = 2 - layer * 0.3;
                var coneGeo = new THREE.ConeGeometry(rad, h, 8);
                var mat = layer === 0 ? snowLeavesMat : leavesMat;
                var cone = new THREE.Mesh(coneGeo, mat);
                cone.position.y = 2 + layer * 1.2;
                cone.castShadow = true;
                tree.add(cone);
            }

            // Snow dusting on top
            var snowGeo = new THREE.ConeGeometry(0.6, 0.5, 6);
            var snowMat = new THREE.MeshStandardMaterial({ color: 0xeef4ff, roughness: 0.7 });
            var snow = new THREE.Mesh(snowGeo, snowMat);
            snow.position.y = 5.5;
            tree.add(snow);

            var side = Math.random() > 0.5 ? 1 : -1;
            tree.position.set(side * (8 + Math.random() * 20), 0, -Math.random() * 200);
            tree.scale.setScalar(0.8 + Math.random() * 0.8);
            tree.castShadow = true;
            scene.add(tree);
            trees.push(tree);
        }

        // Rocks scattered
        var rockMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.9 });
        for (var i = 0; i < ROCK_POOL_SIZE; i++) {
            var rockGeo = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.8, 0);
            var rock = new THREE.Mesh(rockGeo, rockMat);
            var side = Math.random() > 0.5 ? 1 : -1;
            rock.position.set(side * (7 + Math.random() * 15), 0.2, -Math.random() * 200);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.castShadow = true;
            scene.add(rock);
            rocks.push(rock);
        }
    }

    function createSnow() {
        var snowGeo = new THREE.BufferGeometry();
        var SNOW_COUNT = 6000; // Double the snow
        var positions = new Float32Array(SNOW_COUNT * 3);
        for (var i = 0; i < SNOW_COUNT; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 120;
            positions[i * 3 + 1] = Math.random() * 60;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
        }
        snowGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        var snowMat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.2, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
        var snow = new THREE.Points(snowGeo, snowMat);
        snow.userData.positions = positions;
        scene.add(snow);
        snowParticles.push(snow);
    }

    function spawnObstacle() {
        var type = Math.random();
        var lane = Math.floor(Math.random() * 3);
        var obs;

        if (type < 0.35) {
            // Ice boulder
            var geo = new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.5, 1);
            var mat = new THREE.MeshStandardMaterial({ color: 0x99bbdd, roughness: 0.3, metalness: 0.3, transparent: true, opacity: 0.85 });
            obs = new THREE.Mesh(geo, mat);
            obs.userData.type = 'boulder';
            obs.userData.radius = 1.0;
        } else if (type < 0.6) {
            // Fallen log
            var geo = new THREE.CylinderGeometry(0.3, 0.35, 3, 8);
            var mat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
            obs = new THREE.Mesh(geo, mat);
            obs.rotation.z = Math.PI / 2;
            obs.userData.type = 'log';
            obs.userData.radius = 0.8;
        } else if (type < 0.8) {
            // Ice spike cluster
            obs = new THREE.Group();
            for (var s = 0; s < 3; s++) {
                var spikeGeo = new THREE.ConeGeometry(0.2, 1.5 + Math.random(), 5);
                var spikeMat = new THREE.MeshStandardMaterial({ color: 0xbbddff, roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.7 });
                var spike = new THREE.Mesh(spikeGeo, spikeMat);
                spike.position.set((s - 1) * 0.4, 0.7, 0);
                spike.rotation.set(Math.random() * 0.3 - 0.15, 0, Math.random() * 0.3 - 0.15);
                obs.add(spike);
            }
            obs.userData.type = 'spikes';
            obs.userData.radius = 0.9;
        } else {
            // Snow mound
            var geo = new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
            var mat = new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 0.8 });
            obs = new THREE.Mesh(geo, mat);
            obs.userData.type = 'mound';
            obs.userData.radius = 1.2;
        }

        obs.position.set(lanes[lane], 0.5, player.position.z - 80 - Math.random() * 20);
        obs.castShadow = true;
        scene.add(obs);
        obstacles.push(obs);
    }

    function checkWebGL() {
        try {
            var c = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
        } catch (e) { return false; }
    }

    function showBrowserError() {
        var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        var gamePage = document.querySelector('.game-page');
        var errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#0a0a0a 0%,#1a0000 100%);color:#fff;font-family:Inter,sans-serif;text-align:center;padding:40px;';
        errorDiv.innerHTML = '<div style="max-width:520px;">' +
            '<div style="font-size:64px;margin-bottom:20px;">⚠️</div>' +
            '<h1 style="font-size:28px;color:#ff4444;margin:0 0 16px;text-transform:uppercase;letter-spacing:2px;">WebGL Not Available</h1>' +
            '<p style="color:#aaa;font-size:16px;line-height:1.6;margin:0 0 24px;">This 3D game requires WebGL, which is ' +
            (isFirefox ? '<strong style="color:#ff8844;">disabled in your browser (Firefox / LibreWolf)</strong>. Privacy-focused browsers often block WebGL to prevent fingerprinting.' : 'not supported by your current browser.') +
            '</p>' +
            '<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;margin-bottom:24px;">' +
            '<p style="color:#fff;font-size:15px;margin:0 0 12px;font-weight:600;">🎮 To play this game, use one of:</p>' +
            '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">' +
            '<span style="background:rgba(66,133,244,0.15);border:1px solid rgba(66,133,244,0.3);padding:8px 16px;border-radius:8px;color:#88aaff;">Chrome</span>' +
            '<span style="background:rgba(0,120,212,0.15);border:1px solid rgba(0,120,212,0.3);padding:8px 16px;border-radius:8px;color:#66aaff;">Edge</span>' +
            '<span style="background:rgba(251,84,43,0.15);border:1px solid rgba(251,84,43,0.3);padding:8px 16px;border-radius:8px;color:#ff8866;">Brave</span>' +
            '</div></div>' +
            '<a href="/games.html" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#ff4444,#cc2222);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;transition:transform 0.2s;">← Back to Games</a>' +
            '</div>';
        gamePage.appendChild(errorDiv);
    }

    function startGame() {
        if (!GameUtils.checkWebGL()) {
            document.getElementById('start-screen').style.display = 'none';
            GameUtils.showBrowserError();
            return;
        }

        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay');
        ctrl.style.display = 'flex';

        try { init(); } catch (e) {
            console.error('Init error:', e);
            GameUtils.showBrowserError();
            return;
        }

        HorrorAudio.startWind(0.5);
        HorrorAudio.startHeartbeat(50);

        setTimeout(function () {
            ctrl.classList.add('hiding');
            setTimeout(function () {
                ctrl.style.display = 'none';
                ctrl.classList.remove('hiding');
                gameActive = true;
                GameUtils.setState(GameUtils.STATE.PLAYING);
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                distance = 0;
                yetiDistance = yetiBaseDistance;
                currentSpeed = baseSpeed;
                obstacles.forEach(function (o) { scene.remove(o); });
                obstacles = [];
                animate();
            }, 800);
        }, 3500);
    }

    function restartGame() {
        distance = 0;
        yetiDistance = yetiBaseDistance;
        currentSpeed = baseSpeed;
        currentLane = 1;
        targetX = 0;
        playerVY = 0;
        isGrounded = true;
        isSprinting = false;
        stormIntensity = 0;
        shakeMag = 0;
        keys = {};
        if (player) { player.position.set(0, 0, 0); }
        obstacles.forEach(function (o) { scene.remove(o); });
        obstacles = [];
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        HorrorAudio.startWind(0.5);
        HorrorAudio.startHeartbeat(50);
        gameActive = true;
        GameUtils.setState(GameUtils.STATE.PLAYING);
        clock.getDelta(); // reset clock
        animate();
    }

    function updatePlayer(dt) {
        var speed = isSprinting ? currentSpeed * 1.4 : currentSpeed;

        // Move forward
        player.position.z -= speed * dt;
        distance = Math.abs(Math.round(player.position.z));
        if (window.ChallengeManager) ChallengeManager.notify('yeti-run', 'dist_session', distance);

        // Lane movement (smooth)
        player.position.x += (targetX - player.position.x) * 10 * dt;

        // Gravity
        if (!isGrounded) {
            playerVY -= 35 * dt;
            player.position.y += playerVY * dt;
            if (player.position.y <= 0) {
                player.position.y = 0;
                playerVY = 0;
                isGrounded = true;
            }
        }

        // Running animation
        var runCycle = Math.sin(Date.now() * 0.012) * 0.4;
        if (player.userData.leftLeg) player.userData.leftLeg.rotation.x = runCycle;
        if (player.userData.rightLeg) player.userData.rightLeg.rotation.x = -runCycle;
        if (player.userData.leftArm) player.userData.leftArm.rotation.x = -runCycle * 0.6;
        if (player.userData.rightArm) player.userData.rightArm.rotation.x = runCycle * 0.6;

        // Speed increases over time
        currentSpeed = baseSpeed + distance * 0.003;

        // Yeti gets closer over time, sprinting helps
        yetiDistance -= dt * 0.3;
        if (isSprinting) yetiDistance += dt * 1.5;
        yetiDistance = Math.max(5, Math.min(yetiBaseDistance + 5, yetiDistance));

        if (yetiDistance <= 5) {
            gameOver();
        }
    }

    function updateYeti(dt) {
        if (!yeti) return;

        // Follow player, always behind
        yeti.position.z = player.position.z + yetiDistance;
        yeti.position.x += (player.position.x - yeti.position.x) * 2 * dt;
        yeti.position.y = Math.sin(Date.now() * 0.003) * 0.3;

        // Running animation
        var runCycle = Math.sin(Date.now() * 0.008) * 0.6;
        if (yeti.userData.leftLeg) yeti.userData.leftLeg.rotation.x = runCycle;
        if (yeti.userData.rightLeg) yeti.userData.rightLeg.rotation.x = -runCycle;
        if (yeti.userData.leftArm) yeti.userData.leftArm.rotation.x = -runCycle * 0.8;
        if (yeti.userData.rightArm) yeti.userData.rightArm.rotation.x = runCycle * 0.8;

        // Yeti body sway
        yeti.rotation.y = Math.sin(Date.now() * 0.004) * 0.1;

        // Breath fog pulse
        if (breathFog) {
            breathFog.intensity = 0.3 + Math.sin(Date.now() * 0.005) * 0.3;
        }

        // Shake screen when yeti is close
        if (yetiDistance < 15) {
            shakeMag = (15 - yetiDistance) / 15 * 0.3;
        } else {
            shakeMag = 0;
        }
    }

    function updateCamera() {
        // Third person - follow behind and above player
        var idealX = player.position.x * 0.5;
        var idealY = 6 + player.position.y * 0.3;
        var idealZ = player.position.z + 12;

        camera.position.x += (idealX - camera.position.x) * 0.08;
        camera.position.y += (idealY - camera.position.y) * 0.08;
        camera.position.z += (idealZ - camera.position.z) * 0.08;

        // Camera shake
        if (shakeMag > 0) {
            camera.position.x += (Math.random() - 0.5) * shakeMag;
            camera.position.y += (Math.random() - 0.5) * shakeMag * 0.5;
        }

        camera.lookAt(player.position.x, player.position.y + 2, player.position.z - 15);
    }

    function updateObstacles(dt) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
            spawnObstacle();
            spawnTimer = 0.6 + Math.random() * 1.0 / (1 + distance * 0.0005);
        }

        // Check collisions and cleanup
        for (var i = obstacles.length - 1; i >= 0; i--) {
            var o = obstacles[i];
            // Remove if behind the camera
            if (o.position.z > player.position.z + 30) {
                scene.remove(o);
                obstacles.splice(i, 1);
                continue;
            }

            // Collision check
            var dx = player.position.x - o.position.x;
            var dz = player.position.z - o.position.z;
            var dist = Math.sqrt(dx * dx + dz * dz);
            var rad = o.userData.radius || 1.0;

            if (dist < rad && player.position.y < 1.5) {
                // Hit obstacle - yeti gains on you
                yetiDistance -= 3;
                scene.remove(o);
                obstacles.splice(i, 1);

                // Stumble effect
                playerVY = 3;
                isGrounded = false;
            }
        }
    }

    function updateSnow(dt) {
        for (var s = 0; s < snowParticles.length; s++) {
            var snow = snowParticles[s];
            var positions = snow.userData.positions;
            for (var i = 0; i < positions.length / 3; i++) {
                positions[i * 3] += (Math.random() - 0.5) * 0.1 * (1 + stormIntensity);
                positions[i * 3 + 1] -= (1.5 + stormIntensity * 2) * dt;
                positions[i * 3 + 2] -= currentSpeed * dt * 0.3;
                if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] = 30 + Math.random() * 10;
                if (positions[i * 3 + 2] < player.position.z - 50) positions[i * 3 + 2] += 100;
            }
            snow.geometry.attributes.position.needsUpdate = true;
            snow.position.z = player.position.z;
        }

        // Storm intensifies over time
        stormIntensity = Math.min(3, distance * 0.002);
        scene.fog.near = Math.max(10, 40 - stormIntensity * 8);
        scene.fog.far = Math.max(40, 120 - stormIntensity * 20);
    }

    function recycleEnvironment() {
        // Recycle terrain chunks
        for (var i = 0; i < terrainChunks.length; i++) {
            if (terrainChunks[i].position.z > player.position.z + chunkSize) {
                lastChunkZ -= chunkSize;
                terrainChunks[i].position.z = lastChunkZ;
            }
        }

        // Recycle trees
        for (var i = 0; i < trees.length; i++) {
            if (trees[i].position.z > player.position.z + 30) {
                trees[i].position.z -= 200 + Math.random() * 50;
            }
        }

        // Recycle rocks
        for (var i = 0; i < rocks.length; i++) {
            if (rocks[i].position.z > player.position.z + 30) {
                rocks[i].position.z -= 200 + Math.random() * 50;
            }
        }
    }

    function updateHUD() {
        var el1 = document.getElementById('hud-distance');
        var el2 = document.getElementById('hud-best');
        var el3 = document.getElementById('hud-speed');
        if (el1) el1.textContent = '🏔️ Distance: ' + distance + 'm';
        if (el2) el2.textContent = '👑 Best: ' + bestDistance + 'm';
        if (el3) {
            el3.textContent = '❄️ Speed: x' + (currentSpeed / baseSpeed).toFixed(1);
            // Yeti proximity warning
            if (yetiDistance < 15) {
                el3.style.color = '#ff3333';
                el3.textContent += ' ⚠️ YETI CLOSE!';
            } else {
                el3.style.color = '';
            }
        }
    }

    function gameOver() {
        gameActive = false;
        GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playJumpScare();
        setTimeout(function () { HorrorAudio.playDeath(); }, 400);
        HorrorAudio.stopWind();
        HorrorAudio.stopHeartbeat();
        if (distance > bestDistance) {
            bestDistance = distance;
            localStorage.setItem('yeti_best', String(bestDistance));
        }
        document.getElementById('final-distance').textContent = 'Distance: ' + distance + 'm';
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var retryBtn = document.querySelector('#game-over-screen .play-btn');
        if (retryBtn) { retryBtn.onclick = restartGame; }
    }

    function animate() {
        if (!gameActive) return;
        requestAnimationFrame(animate);

        var dt = Math.min(clock.getDelta(), 0.05);
        if (dt <= 0) return;

        updatePlayer(dt);
        updateYeti(dt);
        updateCamera();
        updateObstacles(dt);
        updateSnow(dt);
        recycleEnvironment();
        updateHUD();

        renderer.render(scene, camera);
    }
})();
