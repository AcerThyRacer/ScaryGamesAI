/* ============================================
   The Abyss — AAA Underwater Horror
   PHASE 1 COMPLETE - Foundation & Player Experience
   ============================================ */

(function () {
    'use strict';

    // ============================================
    // VERSION & CONFIG
    // ============================================
    const GAME_VERSION = '2.0.0';
    
    // Settings will be loaded from SaveSystem
    let CONFIG = {};
    let settings = {};

    // ============================================
    // CORE THREE.JS SETUP
    // ============================================
    let scene, camera, renderer, composer;
    let clock = new THREE.Clock();
    let deltaTime = 0;
    let gameTime = 0;
    
    // ============================================
    // GAME STATE
    // ============================================
    const GAME_STATE = {
        MENU: 'MENU',
        LOADING: 'LOADING',
        PLAYING: 'PLAYING',
        PAUSED: 'PAUSED',
        GAME_OVER: 'GAME_OVER',
        WIN: 'WIN',
        PHOTO_MODE: 'PHOTO_MODE',
        TUTORIAL: 'TUTORIAL'
    };
    let currentState = GAME_STATE.MENU;
    let gameActive = false;
    let pointerLocked = false;
    let initialized = false;
    let currentSaveSlot = -1;
    let isNewGame = true;
    
    // ============================================
    // ENTITY SYSTEMS
    // ============================================
    let artifacts = [];
    let creatures = [];
    let airPockets = [];
    let bubbles = [];
    let particles = [];
    let jellyfish = [];
    let debris = [];
    let shipwrecks = [];
    let thermalVents = [];
    let dataLogs = [];
    let caveMeshes = [];
    let bioluminescentPlants = [];
    let floatingParticles = [];
    let activeFlares = [];
    
    // ============================================
    // PLAYER SYSTEM
    // ============================================
    let player = {
        position: new THREE.Vector3(0, -5, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        acceleration: new THREE.Vector3(0, 0, 0),
        rotation: { yaw: 0, pitch: 0, roll: 0 },
        oxygen: 100,
        maxOxygen: 100,
        health: 100,
        maxHealth: 100,
        depth: 0,
        flares: 3,
        hasFlashlight: true,
        flashlightBattery: 100,
        artifactsCollected: 0,
        logsCollected: 0,
        distanceTraveled: 0,
        startTime: 0,
        isSprinting: false,
        currentSpeed: 0,
        deathCount: 0,
        detectedByCreatures: 0
    };
    
    // ============================================
    // INPUT SYSTEM
    // ============================================
    let keys = {};
    let gamepad = null;
    let inputState = {
        moveForward: false,
        moveBackward: false,
        moveLeft: false,
        moveRight: false,
        moveUp: false,
        moveDown: false,
        sprint: false
    };
    
    // ============================================
    // VISUAL EFFECTS
    // ============================================
    let cameraEffects = {
        shake: 0,
        fov: 75,
        targetFov: 75,
        vignetteIntensity: 0.3
    };
    
    // ============================================
    // AUDIO SYSTEM
    // ============================================
    let audioContext = null;
    
    // ============================================
    // AUTO-SAVE
    // ============================================
    let lastAutoSave = 0;
    
    // ============================================
    // PHASE 2: BIOME & ENVIRONMENT
    // ============================================
    let currentBiome = null;
    let biomeEntities = [];
    let environmentalHazards = [];
    
    // ============================================
    // THREE.JS INITIALIZATION
    // ============================================
    function initThreeJS() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            console.error('Game canvas not found!');
            return false;
        }

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020510);
        scene.fog = new THREE.FogExp2(0x020510, 0.025);

        // Camera
        camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.copy(player.position);

        // Renderer
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0x66aaff, 0.8);
        sunLight.position.set(0, 100, 0);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        scene.add(sunLight);

        // Player light (flashlight)
        const flashLight = new THREE.SpotLight(0xffffff, 1, 50, Math.PI / 4, 0.5, 1);
        flashLight.position.set(0, 0, 0);
        flashLight.target.position.set(0, 0, -1);
        camera.add(flashLight);
        camera.add(flashLight.target);
        scene.add(camera);

        // Initial environment
        createInitialEnvironment();

        // Start render loop
        animate();

        console.log('✅ Three.js initialized');
        return true;
    }

    function createInitialEnvironment() {
        // Ocean floor
        const floorGeometry = new THREE.PlaneGeometry(500, 500, 50, 50);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a1520,
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Add some noise to floor vertices
        const positions = floorGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] = Math.random() * 2; // Z becomes Y after rotation
        }
        floorGeometry.computeVertexNormals();
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -50;
        floor.receiveShadow = true;
        scene.add(floor);

        // Water surface
        const surfaceGeometry = new THREE.PlaneGeometry(500, 500);
        const surfaceMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a4080,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
        surface.rotation.x = -Math.PI / 2;
        surface.position.y = 0;
        scene.add(surface);

        // Initial particles
        createParticleSystem();
    }

    function createParticleSystem() {
        // Marine snow
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 100;
            positions[i + 1] = -Math.random() * 100;
            positions[i + 2] = (Math.random() - 0.5) * 100;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xaaccff,
            size: 0.1,
            transparent: true,
            opacity: 0.6
        });

        const particleSystem = new THREE.Points(geometry, material);
        scene.add(particleSystem);
        
        // Store for animation
        window.marineSnow = particleSystem;
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    document.addEventListener('DOMContentLoaded', initGame);
    
    function initGame() {
        // Initialize Three.js first
        if (!initThreeJS()) {
            console.error('Failed to initialize Three.js');
            return;
        }
        
        // Load settings
        if (typeof SaveSystem !== 'undefined') {
            settings = SaveSystem.loadSettings();
            SaveSystem.resetSessionStats();
            
            // Apply settings to CONFIG
            CONFIG = {
                renderDistance: settings.graphics.quality === 'ultra' ? 200 : 
                               settings.graphics.quality === 'high' ? 150 : 
                               settings.graphics.quality === 'medium' ? 100 : 75,
                shadowMapSize: settings.graphics.shadowQuality === 'high' ? 2048 : 1024,
                bloomStrength: settings.graphics.bloom ? 1.2 : 0,
                bloomRadius: 0.8,
                fogDensity: settings.graphics.fogDensity,
                enableParticles: settings.graphics.quality !== 'low',
                enableScreenShake: true,
                fov: settings.graphics.fov
            };
        } else {
            // Fallback defaults
            settings = {
                graphics: { quality: 'high', fov: 75, bloom: true },
                audio: { master: 0.8, music: 0.3, sfx: 0.5 },
                controls: { mouseSensitivityX: 1, mouseSensitivityY: 1 },
                gameplay: { tutorialEnabled: true, autoSave: true, autoSaveInterval: 60 }
            };
            CONFIG = {
                renderDistance: 150,
                shadowMapSize: 2048,
                bloomStrength: 1.2,
                fogDensity: 0.025,
                enableParticles: true,
                enableScreenShake: true,
                fov: 75
            };
        }
        
        // Initialize game modes
        if (typeof GameModes !== 'undefined') {
            GameModes.init();
        }
        
        // Initialize resource system
        if (typeof ResourceSystem !== 'undefined') {
            ResourceSystem.init();
        }
        
        // Initialize event system
        if (typeof EventSystem !== 'undefined') {
            EventSystem.init();
            
            // Listen for events
            EventSystem.on('event_start', (data) => {
                handleEventStart(data.event);
            });
            
            EventSystem.on('poi_spawned', (data) => {
                handlePOISpawned(data.poi);
            });
        }
        
        // ============================================
        // PHASE 1: Initialize New Engine Systems
        // ============================================
        initPhase1Systems();
        
        setupEventListeners();
        setupUI();
        loadMenuData();
    }
    
    // ============================================
    // PHASE 1 SYSTEMS INITIALIZATION
    // ============================================
    async function initPhase1Systems() {
        console.log('🚀 Initializing Phase 1 Technical Foundation...');
        
        try {
            // Get canvas
            const canvas = document.getElementById('game-canvas');
            if (!canvas) return;
            
            // Wait for Three.js to be ready
            if (typeof THREE === 'undefined') {
                console.warn('Three.js not loaded yet, delaying Phase 1 init');
                setTimeout(initPhase1Systems, 100);
                return;
            }
            
            // Initialize Phase 1 Integration
            if (typeof Phase1Integration !== 'undefined') {
                // We'll initialize after scene setup in startGame
                window.phase1Ready = true;
                console.log('✅ Phase 1 systems ready for activation');
            }
        } catch (e) {
            console.error('Phase 1 initialization error:', e);
        }
    }

    function loadMenuData() {
        // Load lifetime stats for display
        if (typeof SaveSystem !== 'undefined') {
            const stats = SaveSystem.loadLifetimeStats();
            const bestTimeEl = document.getElementById('best-time');
            const totalPlaysEl = document.getElementById('total-plays');
            
            if (bestTimeEl) {
                if (stats.bestTime !== Infinity) {
                    const mins = Math.floor(stats.bestTime / 60);
                    const secs = Math.floor(stats.bestTime % 60);
                    bestTimeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                } else {
                    bestTimeEl.textContent = '--:--';
                }
            }
            
            if (totalPlaysEl) {
                totalPlaysEl.textContent = stats.gamesPlayed;
            }
            
            // Show "Continue" button if saves exist
            if (SaveSystem.hasAnySave()) {
                const continueBtn = document.getElementById('continue-btn');
                if (continueBtn) {
                    continueBtn.style.display = 'inline-block';
                }
            }
        }
    }

    function setupEventListeners() {
        // Keyboard
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('pointerlockchange', handlePointerLockChange);
        window.addEventListener('resize', handleResize);
        window.addEventListener('gamepadconnected', handleGamepadConnected);
        
        // UI buttons
        document.getElementById('start-btn')?.addEventListener('click', () => {
            showGameModeSelection();
        });
        
        document.getElementById('continue-btn')?.addEventListener('click', () => {
            showLoadGameMenu();
        });
        
        document.getElementById('settings-btn')?.addEventListener('click', openSettings);
        document.getElementById('achievements-btn')?.addEventListener('click', showAchievements);
        document.getElementById('stats-btn')?.addEventListener('click', showStatistics);
    }

    function setupUI() {
        // Initialize GameUtils if available
        if (typeof GameUtils !== 'undefined') {
            GameUtils.injectDifficultySelector('start-screen');
            GameUtils.initPause({
                onResume: resumeGame,
                onRestart: restartGame,
                onQuit: quitToMenu
            });
        }
    }

    // ============================================
    // GAME MODE SELECTION
    // ============================================
    function showGameModeSelection() {
        const startScreen = document.getElementById('start-screen');
        
        // Create mode selection overlay
        let modeSelect = document.getElementById('mode-selection');
        if (!modeSelect) {
            modeSelect = document.createElement('div');
            modeSelect.id = 'mode-selection';
            modeSelect.className = 'mode-selection-overlay';
            modeSelect.innerHTML = `
                <div class="mode-selection-content">
                    <h2>Select Game Mode</h2>
                    <div class="mode-cards">
                        <div class="mode-card" data-mode="campaign">
                            <div class="mode-icon">📖</div>
                            <h3>Campaign</h3>
                            <p>The full story experience. Collect artifacts and survive.</p>
                            <span class="mode-features">Saves • Story • Checkpoints</span>
                        </div>
                        <div class="mode-card" data-mode="endless">
                            <div class="mode-icon">∞</div>
                            <h3>Endless Descent</h3>
                            <p>Infinite procedural exploration. How deep can you go?</p>
                            <span class="mode-features">Permadeath • Leaderboards</span>
                        </div>
                        <div class="mode-card" data-mode="timeattack">
                            <div class="mode-icon">⏱️</div>
                            <h3>Time Attack</h3>
                            <p>Race against the clock. Daily fixed seed challenges.</p>
                            <span class="mode-features">Speedrun • Daily Seed</span>
                        </div>
                        <div class="mode-card" data-mode="hardcore">
                            <div class="mode-icon">💀</div>
                            <h3>Hardcore</h3>
                            <p>One life. No HUD. Maximum terror. For experts only.</p>
                            <span class="mode-features">Permadeath • No HUD</span>
                        </div>
                        <div class="mode-card" data-mode="zen">
                            <div class="mode-icon">☯️</div>
                            <h3>Zen Mode</h3>
                            <p>No creatures, infinite oxygen. Explore peacefully.</p>
                            <span class="mode-features">Peaceful • Screenshots</span>
                        </div>
                    </div>
                    <button class="back-btn" onclick="document.getElementById('mode-selection').style.display='none'">← Back</button>
                </div>
            `;
            
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .mode-selection-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(5, 10, 20, 0.95);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                    backdrop-filter: blur(10px);
                }
                .mode-selection-overlay.active {
                    display: flex;
                }
                .mode-selection-content {
                    text-align: center;
                    max-width: 900px;
                    padding: 40px;
                }
                .mode-selection-content h2 {
                    font-family: 'Creepster', cursive;
                    color: #00aaff;
                    font-size: 2.5rem;
                    margin-bottom: 30px;
                }
                .mode-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .mode-card {
                    background: rgba(10, 20, 40, 0.8);
                    border: 1px solid rgba(100, 150, 200, 0.3);
                    border-radius: 12px;
                    padding: 25px 15px;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .mode-card:hover {
                    border-color: #00aaff;
                    transform: translateY(-5px);
                    box-shadow: 0 10px 30px rgba(0, 170, 255, 0.2);
                }
                .mode-icon {
                    font-size: 3rem;
                    margin-bottom: 15px;
                }
                .mode-card h3 {
                    color: #fff;
                    margin: 0 0 10px 0;
                    font-size: 1.2rem;
                }
                .mode-card p {
                    color: #88aacc;
                    font-size: 0.85rem;
                    margin: 0 0 15px 0;
                    line-height: 1.5;
                }
                .mode-features {
                    display: block;
                    color: #00aaff;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(modeSelect);
            
            // Add click handlers
            modeSelect.querySelectorAll('.mode-card').forEach(card => {
                card.addEventListener('click', () => {
                    const mode = card.dataset.mode;
                    selectGameMode(mode);
                });
            });
        }
        
        modeSelect.style.display = 'flex';
        modeSelect.classList.add('active');
    }

    function selectGameMode(mode) {
        if (typeof GameModes !== 'undefined') {
            GameModes.setGameMode(mode);
        }
        
        // Hide mode selection
        document.getElementById('mode-selection').style.display = 'none';
        
        // Start new game
        isNewGame = true;
        currentSaveSlot = -1;
        
        // Check if tutorial should show
        if (settings.gameplay.tutorialEnabled && typeof TutorialSystem !== 'undefined') {
            initAudio();
            startTutorial();
        } else {
            initAudio();
            startGame();
        }
    }

    function startTutorial() {
        TutorialSystem.init({
            onComplete: () => {
                startGame();
            },
            onSkip: () => {
                startGame();
            }
        });
        
        TutorialSystem.start();
    }

    // ============================================
    // LOAD GAME MENU
    // ============================================
    function showLoadGameMenu() {
        const saves = SaveSystem.getAllSaves();
        
        let loadMenu = document.getElementById('load-game-menu');
        if (!loadMenu) {
            loadMenu = document.createElement('div');
            loadMenu.id = 'load-game-menu';
            loadMenu.className = 'load-game-overlay';
            document.body.appendChild(loadMenu);
            
            const style = document.createElement('style');
            style.textContent = `
                .load-game-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(5, 10, 20, 0.95);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                    backdrop-filter: blur(10px);
                }
                .load-game-overlay.active {
                    display: flex;
                }
                .load-game-content {
                    background: rgba(10, 20, 40, 0.9);
                    border: 1px solid rgba(100, 150, 200, 0.3);
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 600px;
                    width: 90%;
                }
                .load-game-content h2 {
                    font-family: 'Creepster', cursive;
                    color: #00aaff;
                    margin: 0 0 20px 0;
                }
                .save-slot {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(100, 150, 200, 0.2);
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .save-slot:hover {
                    border-color: #00aaff;
                    background: rgba(0, 100, 200, 0.1);
                }
                .save-slot.empty {
                    opacity: 0.5;
                    cursor: default;
                }
                .save-info h4 {
                    margin: 0 0 5px 0;
                    color: #fff;
                }
                .save-info p {
                    margin: 0;
                    color: #88aacc;
                    font-size: 0.85rem;
                }
                .save-actions button {
                    background: rgba(255, 68, 68, 0.2);
                    border: 1px solid rgba(255, 68, 68, 0.4);
                    color: #ff8888;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
                .save-actions button:hover {
                    background: rgba(255, 68, 68, 0.3);
                }
            `;
            document.head.appendChild(style);
        }
        
        // Build save slots
        let html = `
            <div class="load-game-content">
                <h2>Load Game</h2>
        `;
        
        for (let i = 0; i < SaveSystem.MAX_SAVE_SLOTS; i++) {
            const save = saves.find(s => s.slot === i);
            
            if (save) {
                const date = new Date(save.timestamp).toLocaleDateString();
                const time = new Date(save.timestamp).toLocaleTimeString();
                const playtime = formatPlaytime(save.playtime);
                
                html += `
                    <div class="save-slot" data-slot="${i}">
                        <div class="save-info">
                            <h4>Save Slot ${i + 1}</h4>
                            <p>${date} ${time} • ${playtime} • Depth: ${Math.round(save.player.depth)}m</p>
                        </div>
                        <div class="save-actions">
                            <button onclick="event.stopPropagation(); deleteSave(${i})">Delete</button>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="save-slot empty">
                        <div class="save-info">
                            <h4>Save Slot ${i + 1}</h4>
                            <p>Empty</p>
                        </div>
                    </div>
                `;
            }
        }
        
        html += `
                <button class="back-btn" onclick="document.getElementById('load-game-menu').style.display='none'" style="margin-top: 20px;">← Back</button>
            </div>
        `;
        
        loadMenu.innerHTML = html;
        loadMenu.style.display = 'flex';
        loadMenu.classList.add('active');
        
        // Add click handlers
        loadMenu.querySelectorAll('.save-slot:not(.empty)').forEach(slot => {
            slot.addEventListener('click', () => {
                const slotIndex = parseInt(slot.dataset.slot);
                loadGame(slotIndex);
            });
        });
    }

    function formatPlaytime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    }

    function loadGame(slot) {
        const save = SaveSystem.loadSaveGame(slot);
        if (!save) return;
        
        currentSaveSlot = slot;
        isNewGame = false;
        
        // Apply saved data
        player.position.set(save.player.position.x, save.player.position.y, save.player.position.z);
        player.oxygen = save.player.oxygen;
        player.health = save.player.health;
        player.flares = save.player.flares;
        player.artifactsCollected = save.world.artifactsCollected.length;
        player.logsCollected = save.world.logsCollected.length;
        
        // Set game mode
        if (typeof GameModes !== 'undefined') {
            GameModes.setGameMode(save.session.gameMode);
        }
        
        document.getElementById('load-game-menu').style.display = 'none';
        
        initAudio();
        startGame();
    }

    window.deleteSave = function(slot) {
        if (confirm('Are you sure you want to delete this save?')) {
            SaveSystem.deleteSaveGame(slot);
            showLoadGameMenu(); // Refresh
        }
    };

    // ============================================
    // ACHIEVEMENTS SCREEN
    // ============================================
    function showAchievements() {
        const achievements = SaveSystem.getAllAchievements();
        const unlocked = SaveSystem.loadAchievements().unlocked;
        const progress = SaveSystem.loadAchievements().progress;
        
        let modal = document.getElementById('achievements-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'achievements-modal';
            modal.className = 'achievements-overlay';
            document.body.appendChild(modal);
            
            const style = document.createElement('style');
            style.textContent = `
                .achievements-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(5, 10, 20, 0.95);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                    backdrop-filter: blur(10px);
                }
                .achievements-overlay.active {
                    display: flex;
                }
                .achievements-content {
                    background: rgba(10, 20, 40, 0.9);
                    border: 1px solid rgba(100, 150, 200, 0.3);
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 700px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                .achievements-content h2 {
                    font-family: 'Creepster', cursive;
                    color: #00aaff;
                    margin: 0 0 10px 0;
                }
                .achievements-stats {
                    color: #88aacc;
                    margin-bottom: 20px;
                    font-size: 0.9rem;
                }
                .achievement-list {
                    display: grid;
                    gap: 10px;
                }
                .achievement-item {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(100, 150, 200, 0.2);
                    border-radius: 8px;
                    padding: 15px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    transition: all 0.2s;
                }
                .achievement-item.unlocked {
                    border-color: rgba(0, 255, 136, 0.3);
                    background: rgba(0, 255, 136, 0.05);
                }
                .achievement-item.secret:not(.unlocked) {
                    opacity: 0.5;
                }
                .achievement-icon {
                    font-size: 2rem;
                    width: 50px;
                    text-align: center;
                }
                .achievement-info {
                    flex: 1;
                }
                .achievement-info h4 {
                    margin: 0 0 5px 0;
                    color: #fff;
                }
                .achievement-info p {
                    margin: 0;
                    color: #88aacc;
                    font-size: 0.85rem;
                }
                .achievement-points {
                    color: #ffaa00;
                    font-weight: bold;
                    font-size: 0.9rem;
                }
                .achievement-progress {
                    width: 100%;
                    height: 4px;
                    background: rgba(100, 150, 200, 0.2);
                    border-radius: 2px;
                    margin-top: 8px;
                    overflow: hidden;
                }
                .achievement-progress-bar {
                    height: 100%;
                    background: #00aaff;
                    transition: width 0.3s;
                }
            `;
            document.head.appendChild(style);
        }
        
        const totalPoints = Object.values(achievements).reduce((sum, a) => sum + a.points, 0);
        const unlockedPoints = unlocked.reduce((sum, id) => sum + (achievements[id]?.points || 0), 0);
        
        let html = `
            <div class="achievements-content">
                <h2>Achievements</h2>
                <div class="achievements-stats">
                    ${unlocked.length}/${Object.keys(achievements).length} Unlocked • 
                    ${unlockedPoints}/${totalPoints} Points
                </div>
                <div class="achievement-list">
        `;
        
        Object.values(achievements).forEach(ach => {
            const isUnlocked = unlocked.includes(ach.id);
            const prog = progress[ach.id];
            
            let displayName = ach.name;
            let displayDesc = ach.desc;
            let displayIcon = ach.icon;
            
            // Hide secret achievements that aren't unlocked
            if (ach.secret && !isUnlocked) {
                displayName = '???';
                displayDesc = 'Hidden Achievement';
                displayIcon = '🔒';
            }
            
            html += `
                <div class="achievement-item ${isUnlocked ? 'unlocked' : ''} ${ach.secret ? 'secret' : ''}">
                    <div class="achievement-icon">${displayIcon}</div>
                    <div class="achievement-info">
                        <h4>${displayName}</h4>
                        <p>${displayDesc}</p>
                        ${prog && !isUnlocked ? `
                            <div class="achievement-progress">
                                <div class="achievement-progress-bar" style="width: ${(prog.current / prog.max * 100)}%"></div>
                            </div>
                            <small style="color: #6688aa;">${prog.current}/${prog.max}</small>
                        ` : ''}
                    </div>
                    <div class="achievement-points">${ach.points} pts</div>
                </div>
            `;
        });
        
        html += `
                </div>
                <button class="back-btn" onclick="document.getElementById('achievements-modal').style.display='none'" style="margin-top: 20px;">← Back</button>
            </div>
        `;
        
        modal.innerHTML = html;
        modal.style.display = 'flex';
        modal.classList.add('active');
    }

    // ============================================
    // STATISTICS SCREEN
    // ============================================
    function showStatistics() {
        const stats = SaveSystem.loadLifetimeStats();
        
        let modal = document.getElementById('stats-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'stats-modal';
            modal.className = 'stats-overlay';
            document.body.appendChild(modal);
            
            const style = document.createElement('style');
            style.textContent = `
                .stats-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(5, 10, 20, 0.95);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                    backdrop-filter: blur(10px);
                }
                .stats-overlay.active {
                    display: flex;
                }
                .stats-content {
                    background: rgba(10, 20, 40, 0.9);
                    border: 1px solid rgba(100, 150, 200, 0.3);
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 500px;
                    width: 90%;
                }
                .stats-content h2 {
                    font-family: 'Creepster', cursive;
                    color: #00aaff;
                    margin: 0 0 20px 0;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                }
                .stat-box {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(100, 150, 200, 0.2);
                    border-radius: 8px;
                    padding: 15px;
                    text-align: center;
                }
                .stat-value {
                    font-size: 1.8rem;
                    color: #00aaff;
                    font-family: 'Courier New', monospace;
                    font-weight: bold;
                }
                .stat-label {
                    color: #88aacc;
                    font-size: 0.85rem;
                    margin-top: 5px;
                }
            `;
            document.head.appendChild(style);
        }
        
        const bestTime = stats.bestTime !== Infinity ? 
            `${Math.floor(stats.bestTime / 60)}:${String(Math.floor(stats.bestTime % 60)).padStart(2, '0')}` : 
            '--:--';
        
        modal.innerHTML = `
            <div class="stats-content">
                <h2>Lifetime Statistics</h2>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-value">${stats.gamesPlayed}</div>
                        <div class="stat-label">Games Played</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.gamesCompleted}</div>
                        <div class="stat-label">Games Completed</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${Math.floor(stats.totalPlaytime / 3600)}h</div>
                        <div class="stat-label">Total Playtime</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${Math.floor(stats.totalDistanceSwum)}m</div>
                        <div class="stat-label">Distance Swum</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.totalDeaths}</div>
                        <div class="stat-label">Total Deaths</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${bestTime}</div>
                        <div class="stat-label">Best Time</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.deepestDive}m</div>
                        <div class="stat-label">Deepest Dive</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.totalPoints}</div>
                        <div class="stat-label">Achievement Points</div>
                    </div>
                </div>
                <button class="back-btn" onclick="document.getElementById('stats-modal').style.display='none'" style="margin-top: 20px;">← Back</button>
            </div>
        `;
        
        modal.style.display = 'flex';
        modal.classList.add('active');
    }

    // ============================================
    // SETTINGS MENU
    // ============================================
    function openSettings() {
        let modal = document.getElementById('settings-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'settings-modal';
            modal.className = 'settings-overlay';
            document.body.appendChild(modal);
        }
        
        const currentSettings = SaveSystem.loadSettings();
        
        modal.innerHTML = `
            <div class="settings-content">
                <h2>Settings</h2>
                
                <div class="settings-tabs">
                    <button class="tab-btn active" data-tab="graphics">Graphics</button>
                    <button class="tab-btn" data-tab="audio">Audio</button>
                    <button class="tab-btn" data-tab="controls">Controls</button>
                    <button class="tab-btn" data-tab="gameplay">Gameplay</button>
                </div>
                
                <div class="settings-panel active" data-panel="graphics">
                    <div class="setting-row">
                        <label>Quality Preset</label>
                        <select id="setting-quality">
                            <option value="low" ${currentSettings.graphics.quality === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${currentSettings.graphics.quality === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${currentSettings.graphics.quality === 'high' ? 'selected' : ''}>High</option>
                            <option value="ultra" ${currentSettings.graphics.quality === 'ultra' ? 'selected' : ''}>Ultra</option>
                        </select>
                    </div>
                    <div class="setting-row">
                        <label>Field of View</label>
                        <input type="range" id="setting-fov" min="60" max="110" value="${currentSettings.graphics.fov}">
                        <span id="fov-value">${currentSettings.graphics.fov}</span>
                    </div>
                    <div class="setting-row">
                        <label>Bloom Effect</label>
                        <input type="checkbox" id="setting-bloom" ${currentSettings.graphics.bloom ? 'checked' : ''}>
                    </div>
                    <div class="setting-row">
                        <label>Shadows</label>
                        <input type="checkbox" id="setting-shadows" ${currentSettings.graphics.shadows ? 'checked' : ''}>
                    </div>
                </div>
                
                <div class="settings-panel" data-panel="audio">
                    <div class="setting-row">
                        <label>Master Volume</label>
                        <input type="range" id="setting-master-vol" min="0" max="1" step="0.1" value="${currentSettings.audio.master}">
                    </div>
                    <div class="setting-row">
                        <label>Music Volume</label>
                        <input type="range" id="setting-music-vol" min="0" max="1" step="0.1" value="${currentSettings.audio.music}">
                    </div>
                    <div class="setting-row">
                        <label>SFX Volume</label>
                        <input type="range" id="setting-sfx-vol" min="0" max="1" step="0.1" value="${currentSettings.audio.sfx}">
                    </div>
                    <div class="setting-row">
                        <label>Ambient Volume</label>
                        <input type="range" id="setting-ambient-vol" min="0" max="1" step="0.1" value="${currentSettings.audio.ambient}">
                    </div>
                </div>
                
                <div class="settings-panel" data-panel="controls">
                    <div class="setting-row">
                        <label>Mouse Sensitivity</label>
                        <input type="range" id="setting-sensitivity" min="0.1" max="3" step="0.1" value="${currentSettings.controls.mouseSensitivityX}">
                    </div>
                    <div class="setting-row">
                        <label>Invert Y-Axis</label>
                        <input type="checkbox" id="setting-invert-y" ${currentSettings.controls.invertY ? 'checked' : ''}>
                    </div>
                </div>
                
                <div class="settings-panel" data-panel="gameplay">
                    <div class="setting-row">
                        <label>Tutorial Enabled</label>
                        <input type="checkbox" id="setting-tutorial" ${currentSettings.gameplay.tutorialEnabled ? 'checked' : ''}>
                    </div>
                    <div class="setting-row">
                        <label>Auto-Save</label>
                        <input type="checkbox" id="setting-autosave" ${currentSettings.gameplay.autoSave ? 'checked' : ''}>
                    </div>
                    <div class="setting-row">
                        <label>Show Damage Numbers</label>
                        <input type="checkbox" id="setting-damage-numbers" ${currentSettings.gameplay.showDamageNumbers ? 'checked' : ''}>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button class="settings-btn secondary" onclick="document.getElementById('settings-modal').style.display='none'">Cancel</button>
                    <button class="settings-btn" onclick="saveSettingsFromMenu()">Save Changes</button>
                    <button class="settings-btn danger" onclick="resetAllSettings()">Reset to Default</button>
                </div>
            </div>
        `;
        
        // Add styles
        if (!document.getElementById('settings-styles')) {
            const style = document.createElement('style');
            style.id = 'settings-styles';
            style.textContent = `
                .settings-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(5, 10, 20, 0.95);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(10px);
                }
                .settings-content {
                    background: rgba(10, 20, 40, 0.95);
                    border: 1px solid rgba(100, 150, 200, 0.3);
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                .settings-content h2 {
                    font-family: 'Creepster', cursive;
                    color: #00aaff;
                    margin: 0 0 20px 0;
                }
                .settings-tabs {
                    display: flex;
                    gap: 5px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid rgba(100, 150, 200, 0.2);
                }
                .tab-btn {
                    background: none;
                    border: none;
                    color: #6688aa;
                    padding: 10px 15px;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s;
                }
                .tab-btn.active, .tab-btn:hover {
                    color: #00aaff;
                    border-bottom-color: #00aaff;
                }
                .settings-panel {
                    display: none;
                }
                .settings-panel.active {
                    display: block;
                }
                .setting-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid rgba(100, 150, 200, 0.1);
                }
                .setting-row label {
                    color: #aaddff;
                }
                .setting-row input[type="range"] {
                    width: 120px;
                    accent-color: #00aaff;
                }
                .setting-row select {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(100, 150, 200, 0.3);
                    color: #aaddff;
                    padding: 5px 10px;
                    border-radius: 4px;
                }
                .settings-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                    flex-wrap: wrap;
                }
                .settings-btn {
                    background: linear-gradient(135deg, #0066aa, #0088cc);
                    border: none;
                    color: #fff;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    flex: 1;
                    min-width: 120px;
                }
                .settings-btn.secondary {
                    background: rgba(100, 150, 200, 0.2);
                }
                .settings-btn.danger {
                    background: rgba(255, 68, 68, 0.3);
                }
            `;
            document.head.appendChild(style);
        }
        
        // Tab switching
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                modal.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
                
                btn.classList.add('active');
                modal.querySelector(`.settings-panel[data-panel="${btn.dataset.tab}"]`).classList.add('active');
            });
        });
        
        // FOV value update
        const fovSlider = modal.querySelector('#setting-fov');
        const fovValue = modal.querySelector('#fov-value');
        if (fovSlider && fovValue) {
            fovSlider.addEventListener('input', () => {
                fovValue.textContent = fovSlider.value;
            });
        }
        
        modal.style.display = 'flex';
    }

    window.saveSettingsFromMenu = function() {
        const newSettings = {
            version: '2.0.0',
            graphics: {
                quality: document.getElementById('setting-quality').value,
                fov: parseInt(document.getElementById('setting-fov').value),
                bloom: document.getElementById('setting-bloom').checked,
                shadows: document.getElementById('setting-shadows').checked
            },
            audio: {
                master: parseFloat(document.getElementById('setting-master-vol').value),
                music: parseFloat(document.getElementById('setting-music-vol').value),
                sfx: parseFloat(document.getElementById('setting-sfx-vol').value),
                ambient: parseFloat(document.getElementById('setting-ambient-vol').value)
            },
            controls: {
                mouseSensitivityX: parseFloat(document.getElementById('setting-sensitivity').value),
                mouseSensitivityY: parseFloat(document.getElementById('setting-sensitivity').value),
                invertY: document.getElementById('setting-invert-y').checked
            },
            gameplay: {
                tutorialEnabled: document.getElementById('setting-tutorial').checked,
                autoSave: document.getElementById('setting-autosave').checked,
                showDamageNumbers: document.getElementById('setting-damage-numbers').checked
            }
        };
        
        SaveSystem.saveSettings(newSettings);
        settings = newSettings;
        
        // Apply immediately
        if (camera) {
            camera.fov = newSettings.graphics.fov;
            camera.updateProjectionMatrix();
        }
        
        document.getElementById('settings-modal').style.display = 'none';
        
        // Show notification
        showNotification('Settings saved!', 'success');
    };

    window.resetAllSettings = function() {
        if (confirm('Reset all settings to default?')) {
            SaveSystem.resetSettings();
            settings = SaveSystem.loadSettings();
            document.getElementById('settings-modal').style.display = 'none';
            openSettings(); // Refresh
        }
    };

    // ============================================
    // NOTIFICATION SYSTEM
    // ============================================
    function showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = 'notification ' + type;
        notification.style.opacity = '1';
        
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 3000);
    }

    // ============================================
    // AUTO-SAVE SYSTEM
    // ============================================
    function autoSave() {
        if (!settings.gameplay.autoSave) return;
        if (!GameModes.canSave || !GameModes.canSave()) return;
        if (currentState !== GAME_STATE.PLAYING) return;
        
        const now = Date.now();
        const interval = settings.gameplay.autoSaveInterval * 1000;
        
        if (now - lastAutoSave < interval) return;
        
        // Find available slot or use current
        let slot = currentSaveSlot;
        if (slot < 0) {
            const saves = SaveSystem.getAllSaves();
            for (let i = 0; i < SaveSystem.MAX_SAVE_SLOTS; i++) {
                if (!saves.find(s => s.slot === i)) {
                    slot = i;
                    break;
                }
            }
            if (slot < 0) slot = 0; // Overwrite first
        }
        
        const saveData = createSaveData();
        if (SaveSystem.createSaveGame(slot, saveData)) {
            currentSaveSlot = slot;
            lastAutoSave = now;
            console.log('Auto-saved to slot', slot);
        }
    }

    function createSaveData() {
        const now = Date.now();
        const playtime = Math.floor((now - player.startTime) / 1000);
        
        return {
            playtime: playtime,
            player: {
                position: { x: player.position.x, y: player.position.y, z: player.position.z },
                oxygen: player.oxygen,
                health: player.health,
                flares: player.flares,
                depth: player.depth,
                upgrades: {}
            },
            world: {
                artifactsCollected: artifacts.filter(a => a.userData.collected).map(a => a.userData.config.id || a.uuid),
                logsCollected: dataLogs.filter(l => l.userData.collected).map(l => l.userData.title),
                currentBiome: 'shallows'
            },
            session: {
                gameMode: GameModes.getCurrentMode ? GameModes.getCurrentMode().id : 'campaign',
                difficulty: 'normal',
                seed: GameModes.getDailySeed ? GameModes.getDailySeed() : 0,
                startTime: player.startTime
            }
        };
    }

    // ============================================
    // INPUT HANDLING
    // ============================================
    function handleKeyDown(e) {
        keys[e.code] = true;
        
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            player.isSprinting = true;
            inputState.sprint = true;
            if (TutorialSystem.isActive && TutorialSystem.onSprint) {
                TutorialSystem.onSprint();
            }
        }
        
        // Update input state for Phase 1 physics
        switch(e.code) {
            case 'KeyW': inputState.moveForward = true; break;
            case 'KeyS': inputState.moveBackward = true; break;
            case 'KeyA': inputState.moveLeft = true; break;
            case 'KeyD': inputState.moveRight = true; break;
            case 'Space': inputState.moveUp = true; break;
            case 'ControlLeft':
            case 'ControlRight': inputState.moveDown = true; break;
        }
        
        if (e.code === 'KeyF') {
            throwFlare();
            if (TutorialSystem.isActive && TutorialSystem.onFlareUse) {
                TutorialSystem.onFlareUse();
            }
        }
        
        if (e.code === 'Escape') {
            if (currentState === GAME_STATE.PLAYING) {
                pauseGame();
            } else if (currentState === GAME_STATE.PAUSED) {
                resumeGame();
            }
        }
        
        if (e.code === 'KeyP') {
            togglePhotoMode();
        }
        
        if (e.code === 'KeyI') {
            openInventory();
        }
        
        // Track for tutorial
        if (TutorialSystem.isActive && TutorialSystem.isActive()) {
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
                TutorialSystem.onMove();
            }
            if (e.code === 'Space' || e.code === 'ControlLeft' || e.code === 'ControlRight') {
                TutorialSystem.onDepthChange();
            }
        }
    }

    function handleKeyUp(e) {
        keys[e.code] = false;
        
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            player.isSprinting = false;
            inputState.sprint = false;
        }
        
        // Update input state for Phase 1 physics
        switch(e.code) {
            case 'KeyW': inputState.moveForward = false; break;
            case 'KeyS': inputState.moveBackward = false; break;
            case 'KeyA': inputState.moveLeft = false; break;
            case 'KeyD': inputState.moveRight = false; break;
            case 'Space': inputState.moveUp = false; break;
            case 'ControlLeft':
            case 'ControlRight': inputState.moveDown = false; break;
        }
    }

    function handleMouseMove(e) {
        if (!pointerLocked || currentState !== GAME_STATE.PLAYING) return;
        
        const sensitivity = settings.controls.mouseSensitivityX * 0.002;
        player.rotation.yaw -= e.movementX * sensitivity;
        
        const pitchSensitivity = settings.controls.mouseSensitivityY * 0.002;
        let pitchChange = e.movementY * pitchSensitivity;
        if (settings.controls.invertY) pitchChange = -pitchChange;
        player.rotation.pitch -= pitchChange;
        
        player.rotation.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.rotation.pitch));
        
        if (TutorialSystem.isActive && TutorialSystem.onLook) {
            TutorialSystem.onLook();
        }
    }

    function handlePointerLockChange() {
        pointerLocked = !!document.pointerLockElement;
        if (!pointerLocked && currentState === GAME_STATE.PLAYING) {
            pauseGame();
        }
    }

    function handleResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (composer) composer.setSize(window.innerWidth, window.innerHeight);
    }

    function handleGamepadConnected(e) {
        gamepad = e.gamepad;
        showNotification('Gamepad connected: ' + gamepad.id);
    }

    // ============================================
    // CORE GAME FUNCTIONS (Simplified for Phase 1)
    // ============================================
    function initAudio() {
        // Placeholder - actual audio initialization
        console.log('Audio initialized');
    }

    function startGame() {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        
        gameActive = true;
        currentState = GAME_STATE.PLAYING;
        player.startTime = Date.now();
        
        // Reset session stats
        SaveSystem.resetSessionStats();
        
        // Achievement: first real dive
        if (!isNewGame) {
            SaveSystem.unlockAchievement('first_dive');
        }
        
        // ============================================
        // PHASE 1: Activate Advanced Systems
        // ============================================
        activatePhase1Systems();
    }
    
    async function activatePhase1Systems() {
        if (!scene || !camera || !renderer) return;
        
        try {
            console.log('🎮 Activating Phase 1 systems...');
            
            const canvas = document.getElementById('game-canvas');
            
            // Initialize Phase 1 Integration
            if (typeof Phase1Integration !== 'undefined') {
                await Phase1Integration.init(canvas, scene, camera, renderer);
                
                // Setup player object for physics
                if (player) {
                    if (!player.object3D) {
                        player.object3D = new THREE.Object3D();
                        player.object3D.position.copy(player.position);
                        scene.add(player.object3D);
                    }
                    Phase1Integration.setupPlayerPhysics(player.object3D);
                }
                
                if (settings.graphics.quality) {
                    Phase1Integration.setPostProcessQuality(settings.graphics.quality);
                }
            }
            
            // Start procedural ambient audio
            if (typeof ProceduralSound !== 'undefined') {
                const ambientMusic = ProceduralSound.createAdaptiveMusic();
                ambientMusic.start();
                window.adaptiveMusic = ambientMusic;
            }
            
            // ============================================
            // PHASE 2: Initialize Content Systems
            // ============================================
            activatePhase2Systems();
            
            console.log('✅ All systems active');
            showNotification('🌊 All systems online', 'success');
            
        } catch (e) {
            console.error('System activation failed:', e);
        }
    }
    
    function activatePhase2Systems() {
        console.log('🎮 Activating Phase 2 content systems...');
        
        // Initialize resource system
        if (typeof ResourceSystem !== 'undefined') {
            ResourceSystem.init();
        }
        
        // Initialize narrative system
        if (typeof NarrativeSystem !== 'undefined') {
            NarrativeSystem.init();
        }
        
        // Spawn initial content
        if (typeof ExpandedBiomeSystem !== 'undefined') {
            const startingBiome = ExpandedBiomeSystem.getBiomeForDepth(5);
            spawnBiomeContent(startingBiome);
        }
        
        console.log('✅ Phase 2 systems active');
    }

    function pauseGame() {
        currentState = GAME_STATE.PAUSED;
        gameActive = false;
        document.exitPointerLock();
    }

    function resumeGame() {
        currentState = GAME_STATE.PLAYING;
        gameActive = true;
        renderer.domElement.requestPointerLock();
    }

    function restartGame() {
        // Reset player
        player.position.set(0, -5, 0);
        player.oxygen = 100;
        player.health = 100;
        player.flares = 3;
        player.artifactsCollected = 0;
        player.deathCount++;
        
        // Reset stats
        SaveSystem.resetSessionStats();
        
        document.getElementById('game-over-screen').style.display = 'none';
        gameActive = true;
        currentState = GAME_STATE.PLAYING;
        player.startTime = Date.now();
    }

    function quitToMenu() {
        // Save before quitting if possible
        if (GameModes.canSave && GameModes.canSave() && currentSaveSlot >= 0) {
            const saveData = createSaveData();
            SaveSystem.createSaveGame(currentSaveSlot, saveData);
        }
        
        location.reload();
    }

    function gameOver() {
        gameActive = false;
        currentState = GAME_STATE.GAME_OVER;
        
        // Update lifetime stats
        const sessionData = {
            playtime: (Date.now() - player.startTime) / 1000,
            distanceSwum: player.distanceTraveled,
            deaths: 1,
            artifactsCollected: player.artifactsCollected,
            logsFound: player.logsCollected,
            deepestDive: player.depth,
            completed: false
        };
        SaveSystem.updateLifetimeStats(sessionData);
        
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
    }

    function gameWin() {
        gameActive = false;
        currentState = GAME_STATE.WIN;

        if (window.ChallengeManager) {
            ChallengeManager.notify('the-abyss', 'artifacts_collected', player.artifactsCollected);
            ChallengeManager.notify('the-abyss', 'oxygen', player.oxygen);
        }
        
        const completionTime = (Date.now() - player.startTime) / 1000;
        
        // Update lifetime stats
        const sessionData = {
            playtime: completionTime,
            distanceSwum: player.distanceTraveled,
            deaths: player.deathCount,
            artifactsCollected: player.artifactsCollected,
            logsFound: player.logsCollected,
            flaresThrown: 3 - player.flares,
            deepestDive: player.depth,
            completed: true,
            completionTime: completionTime
        };
        const stats = SaveSystem.updateLifetimeStats(sessionData);
        
        // Unlock achievements
        SaveSystem.unlockAchievement('treasure_hunter');
        
        if (player.artifactsCollected >= 5) {
            SaveSystem.unlockAchievement('archaeologist');
        }
        
        if (completionTime < 600) {
            SaveSystem.unlockAchievement('speed_demon');
        }
        
        if (player.deathCount === 0) {
            SaveSystem.unlockAchievement('survivor');
        }
        
        // Update win screen
        const winScreen = document.getElementById('game-win-screen');
        if (winScreen) {
            const mins = Math.floor(completionTime / 60);
            const secs = Math.floor(completionTime % 60);
            document.getElementById('win-time').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            document.getElementById('win-distance').textContent = Math.floor(player.distanceTraveled) + 'm';
            document.getElementById('win-logs').textContent = `${player.logsCollected}/4`;
        }
        
        winScreen.style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
    }

    function throwFlare() {
        // Try to use flare from inventory first (Phase 2)
        if (typeof ResourceSystem !== 'undefined') {
            if (ResourceSystem.hasItem('flare')) {
                ResourceSystem.useItem('flare', player);
                SaveSystem.updateSessionStat('flaresUsed', 1);
                updateHUD();
                
                // Achievement progress
                const progress = SaveSystem.getAchievementProgress('flare_master');
                SaveSystem.updateAchievementProgress('flare_master', (progress.current || 0) + 1, 10);
                return;
            }
        }
        
        // Fallback to old system
        if (player.flares > 0) {
            player.flares--;
            SaveSystem.updateSessionStat('flaresUsed', 1);
            updateHUD();
            
            // Achievement progress
            const progress = SaveSystem.getAchievementProgress('flare_master');
            SaveSystem.updateAchievementProgress('flare_master', (progress.current || 0) + 1, 10);
        }
    }

    // ============================================
    // PHASE 2: INVENTORY & CRAFTING
    // ============================================
    function openInventory() {
        if (currentState !== GAME_STATE.PLAYING) return;
        
        let inventoryModal = document.getElementById('inventory-modal');
        if (!inventoryModal) {
            inventoryModal = document.createElement('div');
            inventoryModal.id = 'inventory-modal';
            inventoryModal.className = 'inventory-overlay';
            document.body.appendChild(inventoryModal);
            
            // Add styles
            const style = document.createElement('style');
            style.id = 'inventory-styles';
            style.textContent = `
                .inventory-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(5, 10, 20, 0.95);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(10px);
                }
                .inventory-overlay.active {
                    display: flex;
                }
                .inventory-content {
                    background: rgba(10, 20, 40, 0.95);
                    border: 1px solid rgba(100, 150, 200, 0.3);
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 800px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                .inventory-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .inventory-slot {
                    aspect-ratio: 1;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(100, 150, 200, 0.2);
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                }
                .inventory-slot:hover {
                    border-color: #00aaff;
                    background: rgba(0, 100, 200, 0.1);
                }
                .inventory-slot .item-icon {
                    font-size: 2rem;
                }
                .inventory-slot .item-count {
                    position: absolute;
                    bottom: 5px;
                    right: 5px;
                    background: rgba(0, 0, 0, 0.8);
                    color: #fff;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                }
                .crafting-panel {
                    border-top: 1px solid rgba(100, 150, 200, 0.2);
                    padding-top: 20px;
                }
                .recipe-list {
                    display: grid;
                    gap: 10px;
                }
                .recipe-item {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(100, 150, 200, 0.2);
                    border-radius: 8px;
                    padding: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .recipe-item.can-craft {
                    border-color: #00ff88;
                }
                .recipe-info h4 {
                    margin: 0 0 5px 0;
                    color: #fff;
                }
                .recipe-info p {
                    margin: 0;
                    color: #88aacc;
                    font-size: 0.85rem;
                }
                .recipe-ingredients {
                    display: flex;
                    gap: 10px;
                    font-size: 0.8rem;
                    color: #6688aa;
                }
                .craft-btn {
                    background: linear-gradient(135deg, #0066aa, #0088cc);
                    border: none;
                    color: #fff;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                }
                .craft-btn:disabled {
                    background: rgba(100, 100, 100, 0.3);
                    cursor: not-allowed;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Build inventory content
        const inventory = ResourceSystem.getInventory();
        const recipes = ResourceSystem.getAvailableRecipes();
        
        let html = `
            <div class="inventory-content">
                <h2>Inventory</h2>
                <div class="inventory-grid">
        `;
        
        // Show items
        for (const [itemId, count] of Object.entries(inventory)) {
            const resource = ResourceSystem.RESOURCES[itemId.toUpperCase()];
            if (resource) {
                html += `
                    <div class="inventory-slot" onclick="useItemFromInventory('${itemId}')">
                        <span class="item-icon">${resource.icon}</span>
                        <span class="item-count">${count}</span>
                    </div>
                `;
            }
        }
        
        // Empty slots
        const filledSlots = Object.keys(inventory).length;
        const maxSlots = ResourceSystem.maxInventorySlots;
        for (let i = filledSlots; i < maxSlots; i++) {
            html += `<div class="inventory-slot"></div>`;
        }
        
        html += `
                </div>
                <div class="crafting-panel">
                    <h3>Crafting</h3>
                    <div class="recipe-list">
        `;
        
        // Show recipes
        for (const recipe of recipes) {
            const canCraft = recipe.canCraft;
            html += `
                <div class="recipe-item ${canCraft ? 'can-craft' : ''}">
                    <div class="recipe-info">
                        <h4>${recipe.name}</h4>
                        <p>${recipe.description}</p>
                        <div class="recipe-ingredients">
                            ${recipe.hasIngredients.map(ing => `
                                <span style="color: ${ing.have >= ing.need ? '#00ff88' : '#ff4444'}">
                                    ${ing.item}: ${ing.have}/${ing.need}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                    <button class="craft-btn" onclick="craftItem('${recipe.id}')" ${!canCraft ? 'disabled' : ''}>
                        Craft
                    </button>
                </div>
            `;
        }
        
        html += `
                    </div>
                </div>
                <button class="back-btn" onclick="closeInventory()" style="margin-top: 20px;">← Back</button>
            </div>
        `;
        
        inventoryModal.innerHTML = html;
        inventoryModal.style.display = 'flex';
        inventoryModal.classList.add('active');
        
        // Pause game
        pauseGame();
    }

    window.useItemFromInventory = function(itemId) {
        if (ResourceSystem.useItem(itemId, player)) {
            closeInventory();
            updateHUD();
        }
    };

    window.craftItem = function(recipeId) {
        const result = ResourceSystem.craft(recipeId);
        if (result.success) {
            showNotification(`Crafted: ${result.recipe.name}`, 'success');
            openInventory(); // Refresh
        }
    };

    window.closeInventory = function() {
        const modal = document.getElementById('inventory-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        resumeGame();
    };

    // ============================================
    // RESOURCE PICKUP
    // ============================================
    function pickupResource(resourceId, count = 1) {
        if (typeof ResourceSystem !== 'undefined') {
            const added = ResourceSystem.addItem(resourceId, count);
            if (added > 0) {
                // Check for resource-related achievements
                checkResourceAchievements();
                return true;
            }
        }
        return false;
    }

    function checkResourceAchievements() {
        const inventory = ResourceSystem.getInventory();
        
        // Check for crystal collector
        const crystalCount = (inventory['crystal_shard'] || 0) + (inventory['pure_crystal'] || 0);
        if (crystalCount >= 20) {
            SaveSystem.unlockAchievement('crystal_collector');
        }
    }

    function updateHUD() {
        const hudArtifacts = document.getElementById('hud-artifacts');
        const hudOxygen = document.getElementById('hud-oxygen');
        const hudHealth = document.getElementById('hud-health');
        const hudDepth = document.getElementById('hud-depth');
        const hudFlares = document.getElementById('hud-flares');
        const hudLogs = document.getElementById('hud-logs');
        
        if (hudArtifacts) hudArtifacts.textContent = `🏺 ${player.artifactsCollected}/5`;
        if (hudOxygen) hudOxygen.textContent = `💨 ${Math.round(player.oxygen)}%`;
        if (hudHealth) hudHealth.textContent = `❤ ${Math.round(player.health)}%`;
        if (hudDepth) hudDepth.textContent = `⬇ ${Math.round(player.depth)}m`;
        if (hudFlares) hudFlares.textContent = `🔥 ${player.flares}`;
        if (hudLogs) hudLogs.textContent = `📄 ${player.logsCollected}/4`;
        
        // Phase 2: Update wrist display
        const wristOxygen = document.getElementById('wrist-oxygen');
        const wristDepth = document.getElementById('wrist-depth');
        const wristTime = document.getElementById('wrist-time');
        const wristDistance = document.getElementById('wrist-distance');
        
        if (wristOxygen) {
            const pressure = Math.max(1, 1 + player.depth / 10).toFixed(0);
            wristOxygen.textContent = `${pressure} bar`;
        }
        if (wristDepth) wristDepth.textContent = `${player.depth.toFixed(1)} m`;
        if (wristTime && player.startTime) {
            const elapsed = Math.floor((Date.now() - player.startTime) / 1000);
            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toString().padStart(2, '0');
            wristTime.textContent = `${mins}:${secs}`;
        }
        if (wristDistance) {
            wristDistance.textContent = `${Math.floor(player.distanceTraveled)} m`;
        }
    }

    function togglePhotoMode() {
        if (currentState === GAME_STATE.PHOTO_MODE) {
            currentState = GAME_STATE.PLAYING;
            document.body.classList.remove('photo-mode');
        } else if (currentState === GAME_STATE.PLAYING) {
            currentState = GAME_STATE.PHOTO_MODE;
            document.body.classList.add('photo-mode');
            document.exitPointerLock();
        }
    }

    // ============================================
    // BIOME & ENVIRONMENT UPDATE
    // ============================================
    function updateBiomeAndEnvironment(dt) {
        if (!player) return;
        
        // ============================================
        // PHASE 2: Content Systems Update
        // ============================================
        
        // Update expanded biome system
        if (typeof ExpandedBiomeSystem !== 'undefined') {
            const newBiome = ExpandedBiomeSystem.update(player.depth, dt);
            
            if (newBiome && newBiome !== currentBiome) {
                currentBiome = newBiome;
                onBiomeChanged(newBiome);
                
                // Spawn content for new biome
                spawnBiomeContent(newBiome);
            }
            
            // Apply pressure damage
            if (ExpandedBiomeSystem.shouldApplyPressureDamage()) {
                const damage = ExpandedBiomeSystem.getPressureDamageRate() * dt;
                player.health -= damage;
            }
        }
        
        // Update legacy biome system
        if (typeof BiomeSystem !== 'undefined') {
            BiomeSystem.update(player.depth, dt);
        }
        
        // Update creature ecosystem
        if (typeof CreatureEcosystem !== 'undefined' && player.object3D) {
            CreatureEcosystem.update(dt, player.object3D);
        }
        
        // Update narrative system
        if (typeof NarrativeSystem !== 'undefined') {
            NarrativeSystem.update({
                depth: player.depth,
                artifacts: player.artifactsCollected,
                discoveredRuins: player.discoveredRuins
            });
        }
        
        // Check for nearby POIs
        if (typeof POISystem !== 'undefined') {
            const nearbyPOIs = POISystem.getNearbyPOIs(player.position, 30);
            for (const poi of nearbyPOIs) {
                if (!poi.visited) {
                    showPOIDiscovery(poi);
                }
            }
            
            // Cleanup distant POIs
            POISystem.cleanupDistantPOIs(player.position, 200);
        }
        
        // Update event system
        if (typeof EventSystem !== 'undefined') {
            const gameState = {
                depth: player.depth,
                dangerLevel: currentBiome ? currentBiome.dangerLevel : 0,
                oxygen: player.oxygen,
                playerX: player.position.x,
                playerY: player.position.y,
                playerZ: player.position.z,
                isPaused: currentState === GAME_STATE.PAUSED,
                isInMenu: false,
                isInSafeZone: false,
                isInCave: false,
                flashlightBattery: player.flashlightBattery
            };
            
            EventSystem.update(dt, gameState);
            
            // Apply event effects
            const eventEffects = EventSystem.getActiveEventEffects();
            
            // Apply current forces
            if (eventEffects.forceDirections.length > 0) {
                for (const force of eventEffects.forceDirections) {
                    player.velocity.x += Math.cos(force.angle) * force.strength * dt;
                    player.velocity.z += Math.sin(force.angle) * force.strength * dt;
                }
            }
        }
    }

    function onBiomeChanged(biome) {
        console.log(`Biome changed to: ${biome.name}`);
        
        // Update fog
        if (scene && scene.fog) {
            scene.fog.color.setHex(biome.fogColor);
            scene.fog.density = biome.fogDensity;
        }
        
        // Achievement check
        if (biome.id === 'abyss' && typeof SaveSystem !== 'undefined') {
            SaveSystem.unlockAchievement('deep_diver');
        }
    }

    function spawnBiomeContent(biome) {
        // Spawn POIs
        if (typeof POISystem !== 'undefined') {
            POISystem.spawnForBiome(biome);
        }
        
        // Spawn resources
        if (typeof ResourceSystem !== 'undefined') {
            ResourceSystem.spawnForBiome(biome);
        }
        
        // Spawn creatures
        if (typeof CreatureEcosystem !== 'undefined') {
            CreatureEcosystem.spawnForBiome(biome);
        }
        
        // Spawn data log
        if (typeof NarrativeSystem !== 'undefined') {
            const log = NarrativeSystem.getLogForBiome(biome.id);
            if (log && Math.random() < 0.3) {
                console.log('Data log available in this biome:', log.title);
            }
        }
    }

    function showPOIDiscovery(poi) {
        if (!poi.discoveryShown) {
            poi.discoveryShown = true;
            showNotification(`📍 Discovered: ${poi.config.name}`, 'success');
            
            // Mark as visited
            POISystem.visitPOI(poi.id);
        }
    }

    function handleEventStart(event) {
        console.log('Event started:', event.name);
        
        switch(event.id) {
            case 'creature_ambush':
                // Spawn ambush creatures
                spawnAmbushCreatures(event.data.creatures);
                break;
                
            case 'sinking_debris':
                // Spawn lootable debris
                spawnDebris(event.data.position, event.data.loot);
                break;
                
            case 'leviathan_passing':
                // Trigger leviathan sighting
                triggerLeviathanSighting();
                break;
                
            case 'oxygen_rich_vent':
                // Create oxygen vent effect
                createOxygenVent(player.position);
                break;
                
            case 'whale_fall':
                // Spawn whale fall POI
                if (BiomeSystem.getPOIManager) {
                    BiomeSystem.getPOIManager().spawnPOI('whale_fall', currentBiome);
                }
                break;
        }
    }

    function handlePOISpawned(poi) {
        // Create visual representation of POI
        createPOIVisuals(poi);
    }

    function spawnAmbushCreatures(creatureData) {
        // Implementation would spawn creatures
        showNotification('👹 Ambush! Creatures detected!', 'danger');
    }

    function spawnDebris(position, loot) {
        // Create debris entity
        console.log('Spawning debris at', position, 'with loot:', loot);
    }

    function triggerLeviathanSighting() {
        showNotification('🐋 The Leviathan passes in the distance...', 'warning');
        
        // Unlock achievement if survived
        setTimeout(() => {
            if (player.health > 0 && typeof SaveSystem !== 'undefined') {
                SaveSystem.unlockAchievement('leviathan_witness');
            }
        }, 30000);
    }

    function createOxygenVent(position) {
        // Create visual and gameplay effect
        showNotification('💨 Oxygen-rich vent detected!', 'success');
        
        // Temporarily boost oxygen
        const originalMax = player.maxOxygen;
        player.maxOxygen = 150;
        player.oxygen = Math.min(player.oxygen + 30, player.maxOxygen);
        
        // Reset after event
        setTimeout(() => {
            player.maxOxygen = originalMax;
            player.oxygen = Math.min(player.oxygen, player.maxOxygen);
        }, 30000);
    }

    function createPOIVisuals(poi) {
        // Create 3D representation of POI based on type
        // This would integrate with Three.js scene
    }

    // ============================================
    // MAIN GAME LOOP (Phase 2 Enhanced + Phase 1 Physics)
    // ============================================
    function animate() {
        if (!gameActive && currentState !== GAME_STATE.PAUSED) return;
        requestAnimationFrame(animate);
        
        const dt = clock.getDelta();
        
        // ============================================
        // PHASE 1: Physics-Based Movement
        // ============================================
        if (gameActive && Phase1Integration?.isInitialized()) {
            Phase1Integration.applyPlayerInput(inputState, dt);
        }
        
        // Update session stats
        if (gameActive) {
            SaveSystem.updateSessionStat('distanceSwum', player.currentSpeed * dt);
            if (window.ChallengeManager) ChallengeManager.notify('the-abyss', 'depth', player.depth);
            if (player.depth > SaveSystem.getSessionStats().deepestPoint) {
                SaveSystem.updateSessionStat('deepestPoint', player.depth);
            }
        }
        
        // Phase 2: Update biome and environment
        if (gameActive) {
            updateBiomeAndEnvironment(dt);
        }
        
        // Auto-save check
        if (settings.gameplay.autoSave) {
            autoSave();
        }
        
        updateHUD();
    }

    // Expose globally
    window.AbyssGame = {
        startGame,
        pauseGame,
        resumeGame,
        restartGame,
        togglePhotoMode
    };
})();
