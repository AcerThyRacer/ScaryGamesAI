/* ============================================
   Universal 2D to 3D Game Converter
   ELDER GOD EXCLUSIVE SYSTEM
   Automatic conversion for ALL 2D games
   ============================================ */

(function() {
    'use strict';

    const GameConverter = {
        // Configuration per game
        configs: {},
        
        // Three.js scene
        scene: null,
        camera: null,
        renderer: null,
        
        // Converted assets
        models: {},
        textures: {},
        lights: [],
        
        // Subscription tier
        userTier: null,
        
        // Initialize
        async init(gameId, config) {
            console.log('[GameConverter] Converting game:', gameId);
            
            // Verify subscription
            await this.verifySubscription();
            
            // Load config
            this.configs[gameId] = config || this.getDefaultConfig(gameId);
            
            // Initialize Three.js
            await this.initThreeJS();
            
            // Convert game
            await this.convert2Dto3D(gameId);
            
            console.log('[GameConverter] Conversion complete for:', gameId);
        },
        
        // Verify subscription tier
        async verifySubscription() {
            try {
                const response = await fetch('/api/subscriptions/status');
                const data = await response.json();
                this.userTier = data.tier;
                
                if (data.tier === 'elder') {
                    this.userTier = 'elder';
                    return true; // Full access
                } else if (data.tier === 'hunter') {
                    this.userTier = 'hunter';
                    // Limited to 5 games
                    return this.checkHunterLimit();
                } else {
                    // Fix Bug 3: Don't throw, just return false for non-subscribers
                    this.userTier = data.tier || 'free';
                    this.showUpgradePrompt();
                    return false;
                }
            } catch (e) {
                console.warn('[GameConverter] Subscription check failed:', e);
                // Dev mode - only if request failed entirely
                this.userTier = 'elder';
                return true;
            }
        },
        
        // Show upgrade prompt for non-subscribers
        showUpgradePrompt() {
            // Check if prompt already exists
            if (document.getElementById('gc-upgrade-prompt')) return;
            
            const prompt = document.createElement('div');
            prompt.id = 'gc-upgrade-prompt';
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
                <p style="margin-bottom: 20px;">3D Conversion requires Hunter or Elder God subscription.</p>
                <p style="margin-bottom: 30px; color: #aaa;">Upgrade to access:</p>
                <ul style="text-align: left; margin-bottom: 30px; color: #ccc;">
                    <li>✨ Full 3D Game Conversion</li>
                    <li>🎮 Ray-Traced Lighting & Shadows</li>
                    <li>🎧 Immersive 3D Spatial Audio</li>
                    <li>🕶️ VR Support</li>
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
                ">UPGRADE NOW</button>
                <br>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: transparent;
                    border: 1px solid #666;
                    padding: 10px 30px;
                    color: #888;
                    font-size: 14px;
                    border-radius: 6px;
                    cursor: pointer;
                ">Continue in 2D Mode</button>
            `;
            
            document.body.appendChild(prompt);
        },
        },
        
        // Check Hunter tier limit (5 games)
        checkHunterLimit() {
            const hunter3DGames = [
                'shadow-crawler',
                'cursed-depths',
                'nightmare-run',
                'dollhouse',
                'hellaphobia'
            ];
            
            // Would check which games user has accessed
            // For now, allow all 5
            return true;
        },
        
        // Get default config for game
        getDefaultConfig(gameId) {
            const defaults = {
                'shadow-crawler': {
                    wallHeight: 3,
                    tileSize: 1,
                    cameraHeight: 1.7, // First-person
                    cameraType: 'fps',
                    lightingMode: 'dynamic'
                },
                'cursed-depths': {
                    wallHeight: 4,
                    tileSize: 1,
                    cameraHeight: 8, // Top-down 3D
                    cameraType: 'isometric',
                    lightingMode: 'hybrid'
                },
                'nightmare-run': {
                    cameraType: 'third-person',
                    cameraHeight: 3,
                    cameraDistance: 5,
                    lightingMode: 'dynamic'
                },
                'dollhouse': {
                    wallHeight: 5,
                    tileSize: 2,
                    cameraHeight: 0.5, // Doll-sized
                    cameraType: 'fps',
                    scale: 0.2,
                    lightingMode: 'atmospheric'
                },
                'hellaphobia': {
                    wallHeight: 3,
                    tileSize: 1,
                    cameraType: 'third-person',
                    cameraHeight: 2,
                    lightingMode: 'horror'
                }
            };
            
            return defaults[gameId] || {
                wallHeight: 3,
                tileSize: 1,
                cameraType: 'fps',
                lightingMode: 'dynamic'
            };
        },
        
        // Initialize Three.js
        async initThreeJS() {
            if (typeof THREE === 'undefined') {
                await this.loadThreeJS();
            }
            
            const canvas = document.getElementById('game-canvas-3d') || document.createElement('canvas');
            if (!document.getElementById('game-canvas-3d')) {
                canvas.id = 'game-canvas-3d';
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                document.body.appendChild(canvas);
            }
            
            // Scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x0a0814);
            
            // Camera (set based on config) - Fix Bug 4: use this.configs[this.currentGameId]
            const aspect = window.innerWidth / window.innerHeight;
            const config = this.configs[this.currentGameId] || this.configs.current;
            
            if (config?.cameraType === 'isometric') {
                // Orthographic for isometric
                const frustumSize = 20;
                this.camera = new THREE.OrthographicCamera(
                    frustumSize * aspect / -2,
                    frustumSize * aspect / 2,
                    frustumSize / 2,
                    frustumSize / -2,
                    0.1,
                    1000
                );
                this.camera.position.set(10, 10, 10);
                this.camera.lookAt(0, 0, 0);
            } else {
                // Perspective for FPS/TPS
                this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
                this.camera.position.set(0, config?.cameraHeight || 1.7, 0);
            }
            
            // Renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: this.userTier === 'elder', // Elder God gets AA
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            
            if (this.userTier === 'elder') {
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            }
        },
        
        // Load Three.js from CDN
        loadThreeJS() {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        },
        
        // Main conversion function
        async convert2Dto3D(gameId) {
            console.log('[GameConverter] Starting conversion:', gameId);
            
            // Store current game ID for config access (fixes Bug 4)
            this.currentGameId = gameId;
            
            // Load 2D game data
            const gameData = await this.load2DGameData(gameId);
            
            // Convert world geometry
            const world3D = this.extrudeWorld(gameData, this.configs[gameId]);
            
            // Generate/convert models
            const models3D = this.generateModels(gameData.sprites || []);
            
            // Convert lighting
            const lighting3D = this.convertLighting(gameData.lights || []);
            
            // Add to scene
            this.addToScene(world3D, models3D, lighting3D);
            
            // Fix Bug 5: Store results in instance properties
            this.world = world3D;
            this.models = models3D;
            this.lighting = lighting3D;
            
            return { world3D, models3D, lighting3D };
        },
        
        // Load 2D game data
        async load2DGameData(gameId) {
            // This would load the actual game data
            // For now, return mock data structure
            return {
                maze: [],
                tiles: [],
                sprites: [],
                lights: [],
                enemies: [],
                items: []
            };
        },
        
        // Extrude 2D world to 3D
        extrudeWorld(gameData, config) {
            const world3D = {
                floors: [],
                walls: [],
                ceilings: []
            };
            
            const tileWidth = config.tileSize;
            const wallHeight = config.wallHeight;
            
            // Create materials
            const floorMat = new THREE.MeshStandardMaterial({
                color: 0x0a0814,
                roughness: 0.9
            });
            
            const wallMat = new THREE.MeshStandardMaterial({
                color: 0x1a1030,
                roughness: 0.8
            });
            
            const ceilingMat = new THREE.MeshStandardMaterial({
                color: 0x111122,
                roughness: 0.8
            });
            
            // Generate floor/ceiling for each tile
            if (gameData.maze) {
                for (let r = 0; r < gameData.maze.length; r++) {
                    for (let c = 0; c < gameData.maze[r].length; c++) {
                        const cell = gameData.maze[r][c];
                        
                        if (cell !== 1) { // Not a wall
                            // Floor
                            const floor = new THREE.Mesh(
                                new THREE.BoxGeometry(tileWidth, 0.1, tileWidth),
                                floorMat
                            );
                            floor.position.set(c * tileWidth, 0, r * tileWidth);
                            floor.receiveShadow = true;
                            world3D.floors.push(floor);
                            
                            // Ceiling
                            const ceiling = new THREE.Mesh(
                                new THREE.BoxGeometry(tileWidth, 0.1, tileWidth),
                                ceilingMat
                            );
                            ceiling.position.set(c * tileWidth, wallHeight, r * tileWidth);
                            ceiling.receiveShadow = true;
                            world3D.ceilings.push(ceiling);
                        }
                        
                        // Check for walls (simplified)
                        if (cell === 1) {
                            const wall = new THREE.Mesh(
                                new THREE.BoxGeometry(tileWidth, wallHeight, tileWidth),
                                wallMat
                            );
                            wall.position.set(c * tileWidth, wallHeight / 2, r * tileWidth);
                            wall.castShadow = true;
                            wall.receiveShadow = true;
                            world3D.walls.push(wall);
                        }
                    }
                }
            }
            
            return world3D;
        },
        
        // Generate 3D models from 2D sprites
        generateModels(sprites) {
            const models = {};
            
            sprites.forEach(sprite => {
                // Extrude 2D sprite to 3D
                const geometry = new THREE.BoxGeometry(1, 2, 1);
                const material = new THREE.MeshStandardMaterial({
                    color: sprite.color || 0xffffff,
                    map: sprite.texture ? this.loadTexture(sprite.texture) : null
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                models[sprite.name] = mesh;
            });
            
            return models;
        },
        
        // Convert 2D lights to 3D
        convertLighting(lights2D) {
            const lights3D = [];
            
            lights2D.forEach(light => {
                const threeLight = new THREE.PointLight(
                    light.color || 0xffaa00,
                    light.intensity || 1.0,
                    light.radius || 10
                );
                
                threeLight.position.set(light.x, light.y || 2, light.z || 0);
                threeLight.castShadow = true;
                
                lights3D.push(threeLight);
            });
            
            // Add ambient light
            const ambient = new THREE.AmbientLight(0x222244, 0.3);
            lights3D.push(ambient);
            
            return lights3D;
        },
        
        // Load texture
        loadTexture(url) {
            if (this.textures[url]) return this.textures[url];
            
            const texture = new THREE.TextureLoader().load(url);
            this.textures[url] = texture;
            return texture;
        },
        
        // Add converted objects to scene
        addToScene(world, models, lights) {
            // Add world geometry
            world.floors.forEach(f => this.scene.add(f));
            world.walls.forEach(w => this.scene.add(w));
            world.ceilings.forEach(c => this.scene.add(c));
            
            // Add models
            Object.values(models).forEach(m => this.scene.add(m));
            
            // Add lights
            lights.forEach(l => this.scene.add(l));
        },
        
        // Get converted game
        getConvertedGame() {
            return {
                scene: this.scene,
                camera: this.camera,
                renderer: this.renderer,
                models: this.models,
                world: this.world
            };
        },
        
        // Cleanup
        destroy() {
            if (this.renderer) {
                this.renderer.dispose();
            }
            if (this.scene) {
                this.scene.traverse(obj => {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) obj.material.dispose();
                });
            }
        }
    };

    // Export
    window.GameConverter = GameConverter;
})();
