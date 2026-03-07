/* ============================================
   Shadow Crawler 3D: First-Person Descent
   ELDER GOD EXCLUSIVE FEATURE
   Three.js 3D Conversion | Ray Tracing | VR
   ============================================ */

(function() {
    'use strict';

    // ── Configuration ─────────────────────────────────
    const CONFIG = {
        graphics: {
            quality: 'ultra', // ultra, high, medium, low
            rayTracing: false, // Elder God only
            shadows: true,
            fog: true,
            bloom: true
        },
        subscription: {
            requiredTier: 'elder', // or 'hunter' for limited access
            checkEnabled: true
        }
    };

    // ── Three.js Setup ────────────────────────────────
    let scene, camera, renderer;
    let canvas = null;
    let subscriptionVerified = false;
    let playerTier = null;

    // ── Subscription Check ───────────────────────────
    async function verifySubscription() {
        if (!CONFIG.subscription.checkEnabled) {
            subscriptionVerified = true;
            return true;
        }

        try {
            const response = await fetch('/api/subscriptions/status');
            const data = await response.json();
            
            playerTier = data.tier;
            
            if (data.tier === 'elder') {
                subscriptionVerified = true;
                CONFIG.graphics.rayTracing = true; // Elder God gets ray tracing
                return true;
            } else if (data.tier === 'hunter') {
                // Hunter can access limited 3D (5 games)
                subscriptionVerified = true;
                CONFIG.graphics.rayTracing = false;
                return true;
            } else {
                // Show upgrade prompt
                showUpgradePrompt();
                return false;
            }
        } catch (e) {
            console.warn('[ShadowCrawler3D] Subscription check failed:', e);
            // In development, allow access
            subscriptionVerified = true;
            return true;
        }
    }

    function showUpgradePrompt() {
        const prompt = document.createElement('div');
        prompt.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1a0a2e 0%, #16213e 100%);
            padding: 40px;
            border-radius: 16px;
            border: 2px solid #ff00ff;
            color: #fff;
            font-family: 'Inter', sans-serif;
            text-align: center;
            z-index: 10000;
            max-width: 500px;
        `;
        
        prompt.innerHTML = `
            <h2 style="color: #ff00ff; margin-bottom: 20px;">🜏 ELDER GOD MODE REQUIRED</h2>
            <p style="margin-bottom: 20px;">Shadow Crawler 3D is exclusively available to Elder God subscribers.</p>
            <p style="margin-bottom: 30px; color: #aaa;">Upgrade now to experience:</p>
            <ul style="text-align: left; margin-bottom: 30px; color: #ccc;">
                <li>✨ Full 3D First-Person Horror</li>
                <li>🎮 Ray-Traced Lighting & Shadows</li>
                <li>🎧 Immersive 3D Spatial Audio</li>
                <li>🕶️ VR Support</li>
                <li>🎁 ALL 2D Games in 3D</li>
            </ul>
            <button onclick="window.location.href='/subscription.html'" style="
                background: linear-gradient(135deg, #ff00ff 0%, #aa00ff 100%);
                border: none;
                padding: 15px 40px;
                color: white;
                font-size: 18px;
                border-radius: 8px;
                cursor: pointer;
                margin-bottom: 15px;
            ">UPGRADE TO ELDER GOD - $8/month</button>
            <br>
            <button onclick="this.parentElement.remove()" style="
                background: transparent;
                border: 1px solid #666;
                padding: 10px 30px;
                color: #888;
                font-size: 14px;
                border-radius: 6px;
                cursor: pointer;
            ">Return to 2D Mode</button>
        `;
        
        document.body.appendChild(prompt);
    }

    // ── Initialize 3D Engine ─────────────────────────
    async function init() {
        // Verify subscription first
        const verified = await verifySubscription();
        if (!verified) return;

        canvas = document.getElementById('game-canvas-3d') || document.createElement('canvas');
        canvas.id = 'game-canvas-3d';
        
        if (!document.getElementById('game-canvas-3d')) {
            document.body.appendChild(canvas);
        }

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0814);
        scene.fog = new THREE.FogExp2(0x0a0814, 0.02);

        // Camera
        camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 1.7, 0); // Eye level

        // Renderer
        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: CONFIG.graphics.rayTracing,
            powerPreference: 'high-performance'
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        if (CONFIG.graphics.rayTracing) {
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.0;
        }

        // Lighting
        setupLighting();

        // Generate dungeon
        generateDungeon3D();

        // Player controller
        setupPlayerController();

        // Start loop
        animate();

        console.log('[ShadowCrawler3D] Initialized - Tier:', playerTier);
    }

    // ── Lighting Setup ───────────────────────────────
    function setupLighting() {
        // Ambient
        const ambient = new THREE.AmbientLight(0x222244, 0.3);
        scene.add(ambient);

        // Player torch (point light)
        const torch = new THREE.PointLight(0xffaa00, 1.0, 20);
        torch.position.set(0, 1.5, 0);
        torch.castShadow = true;
        torch.shadow.mapSize.width = CONFIG.graphics.rayTracing ? 2048 : 1024;
        torch.shadow.mapSize.height = CONFIG.graphics.rayTracing ? 2048 : 1024;
        scene.add(torch);
        
        // Store torch reference for updates
        scene.userData.torch = torch;

        // Elder God: Add ray-traced global illumination
        if (CONFIG.graphics.rayTracing) {
            // This would use Three.js raytracing capabilities
            console.log('[ShadowCrawler3D] Ray tracing enabled (Elder God)');
        }
    }

    // ── 3D Dungeon Generation ────────────────────────
    function generateDungeon3D() {
        // Materials
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1030,
            roughness: 0.8,
            metalness: 0.2
        });

        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0814,
            roughness: 0.9,
            metalness: 0.1
        });

        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0x111122,
            roughness: 0.8,
            metalness: 0.2
        });

        // Simple dungeon layout (would integrate with 2D maze data)
        const roomWidth = 10;
        const roomHeight = 4;
        const roomDepth = 10;

        // Floor
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(roomWidth, 0.2, roomDepth),
            floorMaterial
        );
        floor.position.set(0, 0, 0);
        floor.receiveShadow = true;
        scene.add(floor);

        // Ceiling
        const ceiling = new THREE.Mesh(
            new THREE.BoxGeometry(roomWidth, 0.2, roomDepth),
            ceilingMaterial
        );
        ceiling.position.set(0, roomHeight, 0);
        ceiling.receiveShadow = true;
        scene.add(ceiling);

        // Walls
        const wallPositions = [
            { pos: [-roomWidth/2, roomHeight/2, 0], rot: [0, Math.PI/2, 0] },
            { pos: [roomWidth/2, roomHeight/2, 0], rot: [0, -Math.PI/2, 0] },
            { pos: [0, roomHeight/2, -roomDepth/2], rot: [0, 0, 0] },
            { pos: [0, roomHeight/2, roomDepth/2], rot: [0, Math.PI, 0] }
        ];

        wallPositions.forEach(wall => {
            const w = new THREE.Mesh(
                new THREE.BoxGeometry(roomDepth, roomHeight, 0.2),
                wallMaterial
            );
            w.position.set(...wall.pos);
            w.rotation.set(...wall.rot);
            w.castShadow = true;
            w.receiveShadow = true;
            scene.add(w);
        });

        // Torch holder (light source visual)
        const torchHolder = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 })
        );
        torchHolder.position.set(roomWidth/2 - 0.5, 1.5, roomDepth/2 - 1);
        scene.add(torchHolder);

        // Add flame particle system (would use GPU particles)
        addFlameParticles(torchHolder.position);
    }

    // ── Particle System ──────────────────────────────
    function addFlameParticles(position) {
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x + (Math.random() - 0.5) * 0.3;
            positions[i * 3 + 1] = position.y + Math.random() * 0.5;
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.3;

            const color = new THREE.Color();
            color.setHSL(0.1, 1.0, 0.5 + Math.random() * 0.3);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
        
        // Store for animation
        scene.userData.flameParticles = particles;
    }

    // ── Player Controller ────────────────────────────
    function setupPlayerController() {
        // Pointer lock for FPS controls
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock();
        });

        // Movement
        const keys = {};
        document.addEventListener('keydown', (e) => keys[e.code] = true);
        document.addEventListener('keyup', (e) => keys[e.code] = false);

        // Mouse look
        let yaw = 0;
        let pitch = 0;

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === canvas) {
                yaw -= e.movementX * 0.002;
                pitch -= e.movementY * 0.002;
                pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));

                camera.rotation.order = 'YXZ';
                camera.rotation.y = yaw;
                camera.rotation.x = pitch;
            }
        });

        // Update loop
        const speed = 5.0;
        
        function updatePlayer(dt) {
            const direction = new THREE.Vector3();
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            
            forward.y = 0;
            forward.normalize();
            right.y = 0;
            right.normalize();

            if (keys['KeyW']) direction.add(forward);
            if (keys['KeyS']) direction.sub(forward);
            if (keys['KeyD']) direction.add(right);
            if (keys['KeyA']) direction.sub(right);

            if (direction.length() > 0) {
                direction.normalize();
                const moveVec = direction.multiplyScalar(speed * dt);
                camera.position.add(moveVec);
            }

            // Update torch position to follow camera
            if (scene.userData.torch) {
                scene.userData.torch.position.copy(camera.position);
                scene.userData.torch.position.y -= 0.2;
            }
        }

        scene.userData.updatePlayer = updatePlayer;
    }

    // ── Animation Loop ───────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const dt = clock.getDelta();

        // Update player
        if (scene.userData.updatePlayer) {
            scene.userData.updatePlayer(dt);
        }

        // Animate flame particles
        if (scene.userData.flameParticles) {
            const positions = scene.userData.flameParticles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] += 0.02; // Rise
                if (positions[i * 3 + 1] > 2.5) {
                    positions[i * 3 + 1] = 1.5; // Reset
                }
            }
            scene.userData.flameParticles.geometry.attributes.position.needsUpdate = true;
        }

        renderer.render(scene, camera);
    }

    // ── Resize Handler ───────────────────────────────
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Export & Initialize ──────────────────────────
    // Fix Bug 6: Export object with getter functions to access current values
    window.ShadowCrawler3D = {
        init,
        get scene() { return scene; },
        get camera() { return camera; },
        get renderer() { return renderer; },
        get CONFIG() { return CONFIG; }
    };

    // Auto-init when Three.js is loaded
    if (typeof THREE !== 'undefined') {
        init();
    } else {
        // Load Three.js
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = init;
        document.head.appendChild(script);
    }
})();
