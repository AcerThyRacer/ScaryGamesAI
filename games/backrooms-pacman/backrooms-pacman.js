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
    let extraPacmanPool = [];
    const EXTRA_PACMAN_POOL_SIZE = 5;
    let playerPos = { x: 0, z: 0 }, yaw = 0, pitch = 0;
    let keys = {}, isRunning = false, gameActive = false, pointerLocked = false, initialized = false;
    let corridorLights = [], dustParticles = null, footstepTimer = 0;
    let distortionOverlay = null, camShake = 0;
    let pacmanAnimTime = 0;
    let visualIntensity = 0; // updated from proximity; used by AI systems too

    // Corridor light management (keep dynamic light count bounded)
    const MAX_ACTIVE_CORRIDOR_LIGHTS = 6;
    let lightManagerCooldown = 0;

    // Finite State Machine (FSM): keep game logic in a single explicit phase.
    const GAME_STATE = {
        MENU: 'MENU',
        PLAYING: 'PLAYING',
        PAUSED: 'PAUSED',
        BLACKOUT: 'BLACKOUT',
        DEAD: 'DEAD',
        WIN: 'WIN'
    };
    let gameState = GAME_STATE.MENU;

    function isGameRunning() {
        return gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.BLACKOUT;
    }

    function setGameState(next) {
        if (gameState === next) return;
        gameState = next;
        gameActive = isGameRunning();
        blackoutActive = (gameState === GAME_STATE.BLACKOUT);

        // Keep the shared container state in sync for overlays/UI.
        if (window.GameUtils && GameUtils.setState) {
            if (gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.BLACKOUT) GameUtils.setState(GameUtils.STATE.PLAYING);
            else if (gameState === GAME_STATE.PAUSED) GameUtils.setState(GameUtils.STATE.PAUSED);
            else if (gameState === GAME_STATE.DEAD) GameUtils.setState(GameUtils.STATE.GAME_OVER);
            else if (gameState === GAME_STATE.WIN) GameUtils.setState(GameUtils.STATE.WIN);
        }
    }

    // Post-processing (Motion Blur)
    let blurTarget, blurScene, blurCamera, blurMaterial;
    let lastYaw = 0, lastPitch = 0;

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

    // ============================================
    // PHASE 1: VISUAL ATMOSPHERE OVERHAUL
    // ============================================

    const DIFFICULTY_SELECTOR_MAP = {
        easy: 'novice',
        normal: 'standard',
        hard: 'hard',
        nightmare: 'nightmare',
        impossible: 'impossible'
    };
    const DIFFICULTY_SETTINGS = {
        novice: {
            key: 'novice',
            name: 'Novice',
            fogDensity: 0.025,
            multiplier: 0.72,
            pacmanSpeedMul: 0.72,
            hasStamina: false,
            staminaMax: 100,
            staminaDrain: 0,
            staminaRegen: 14,
            staminaRecoverAt: 25,
            showMap: true,
            showHUD: true,
            blackoutEnabled: false,
            flashlightEnabled: true,
            extraLives: 3,
            permanentDeath: false,
            spawnTimers: [],
            initialExtraPacmen: 0,
            allowReversal: true,
            darkness: false,
            powerPellets: 6
        },
        standard: {
            key: 'standard',
            name: 'Standard',
            fogDensity: 0.038,
            multiplier: 1.0,
            pacmanSpeedMul: 1.0,
            hasStamina: false,
            staminaMax: 100,
            staminaDrain: 0,
            staminaRegen: 12,
            staminaRecoverAt: 25,
            showMap: true,
            showHUD: true,
            blackoutEnabled: false,
            flashlightEnabled: true,
            extraLives: 1,
            permanentDeath: false,
            spawnTimers: [],
            initialExtraPacmen: 0,
            allowReversal: true,
            darkness: false,
            powerPellets: 4
        },
        hard: {
            key: 'hard',
            name: 'Hard',
            fogDensity: 0.055,
            multiplier: 1.35,
            pacmanSpeedMul: 1.35,
            hasStamina: true,
            staminaMax: 100,
            staminaDrain: 20,
            staminaRegen: 12,
            staminaRecoverAt: 25,
            showMap: false,
            showHUD: true,
            blackoutEnabled: true,
            flashlightEnabled: true,
            extraLives: 1,
            permanentDeath: false,
            spawnTimers: [30],
            initialExtraPacmen: 0,
            allowReversal: false,
            darkness: false,
            powerPellets: 3
        },
        nightmare: {
            key: 'nightmare',
            name: 'Nightmare',
            fogDensity: 0.08,
            multiplier: 1.7,
            pacmanSpeedMul: 1.7,
            hasStamina: true,
            staminaMax: 60,
            staminaDrain: 34,
            staminaRegen: 7,
            staminaRecoverAt: 20,
            showMap: true,
            showHUD: true,
            blackoutEnabled: false,
            flashlightEnabled: true,
            extraLives: 1,
            permanentDeath: true,
            spawnTimers: [20, 45],
            initialExtraPacmen: 1,
            allowReversal: false,
            darkness: false,
            powerPellets: 2
        },
        impossible: {
            key: 'impossible',
            name: 'Impossible',
            fogDensity: 0.12,
            multiplier: 2.8,
            pacmanSpeedMul: 2.8,
            hasStamina: false,
            staminaMax: 100,
            staminaDrain: 0,
            staminaRegen: 12,
            staminaRecoverAt: 25,
            showMap: false,
            showHUD: false,
            blackoutEnabled: false,
            flashlightEnabled: false,
            extraLives: 1,
            permanentDeath: true,
            spawnTimers: [],
            initialExtraPacmen: 0,
            allowReversal: false,
            darkness: true,
            powerPellets: 1
        }
    };
    let selectedDifficultyKey = 'standard';
    let currentDifficulty = DIFFICULTY_SETTINGS.standard;
    let targetFogDensity = currentDifficulty.fogDensity;
    let baseFogDensity = currentDifficulty.fogDensity;
    let playerFlashlight = null;
    let darknessOverlay = null;
    let effectOverlay = null;
    let statusMessageEl = null;
    let statusMessageTimer = null;
    let playerLives = 1;
    let playerHitCooldown = 0;
    let pacmanStunTimer = 0;
    let pacmanBlindTimer = 0;
    let phasingTimer = 0;
    let radarTimer = 0;
    let reversalTimer = 0;
    let decoyTimer = 0;
    let decoyPulseTimer = 0;
    let decoyPos = { x: 0, z: 0 };
    const ABILITY_DEFS = {
        flashbang: { label: 'Flashbang', hotkey: '1', cooldown: 16 },
        decoy: { label: 'Decoy', hotkey: '2', cooldown: 12 },
        phasing: { label: 'Phasing', hotkey: '3', cooldown: 16 },
        radar: { label: 'Radar', hotkey: '4', cooldown: 10 },
        reversal: { label: 'Reversal', hotkey: '5', cooldown: 20 }
    };
    const ABILITY_ORDER = ['flashbang', 'decoy', 'phasing', 'radar', 'reversal'];
    const PELLET_STYLES = {
        normal: { color: 0xFFFF44, scale: 1, light: 0.15 },
        power: { color: 0x66CCFF, scale: 1.4, light: 0.42 },
        flashbang: { color: 0xD7F0FF, scale: 1.22, light: 0.28 },
        decoy: { color: 0xFF8844, scale: 1.22, light: 0.3 },
        phasing: { color: 0xBB77FF, scale: 1.22, light: 0.3 },
        radar: { color: 0x44E3FF, scale: 1.22, light: 0.3 },
        reversal: { color: 0x44FF88, scale: 1.22, light: 0.32 }
    };
    let abilityInventory = {
        flashbang: 0,
        decoy: 0,
        phasing: 0,
        radar: 0,
        reversal: 0
    };
    let abilityCooldowns = {
        flashbang: 0,
        decoy: 0,
        phasing: 0,
        radar: 0,
        reversal: 0
    };

    function getDifficultyMultiplier() {
        return currentDifficulty.multiplier || 1;
    }

    function setDifficulty(difficultyName) {
        var key = DIFFICULTY_SETTINGS[difficultyName] ? difficultyName : 'standard';
        selectedDifficultyKey = key;
        currentDifficulty = DIFFICULTY_SETTINGS[key];
        targetFogDensity = currentDifficulty.fogDensity;
        baseFogDensity = currentDifficulty.fogDensity;
        maxStamina = currentDifficulty.staminaMax;
        stamina = Math.min(stamina, maxStamina);
        if (!currentDifficulty.hasStamina) {
            stamina = maxStamina;
            staminaDrained = false;
        }
        nextBlackout = currentDifficulty.blackoutEnabled ? (15 + Math.random() * 25) : 999999;
        applyDifficultyPresentation();
        invalidateHud();
        console.log('[Backrooms] Difficulty set to:', currentDifficulty.name);
    }

    // Dynamic wall texture system
    let wallMeshes = [];
    let wallDistortionTime = 0;
    let wallCanvas, wallCtx, wallTexture, wallData;
    let wallNeedsUpdate = false;

    // Moisture/grease floor effects
    let moisturePatches = [];
    let floorMoistureMesh = null;

    // Ceiling degradation
    let ceilingMeshes = [];
    let ceilingWireMeshes = [];
    let ceilingDamageTimer = 0;

    // Enhanced flicker system
    let enhancedLights = [];
    let lightFlickerContext = null;

    // VHS/Analog distortion
    let vhsOverlay = null;
    let vhsScanlines = null;
    let vhsChromatic = null;
    let vhsNoiseCanvas, vhsNoiseCtx;
    let vhsTime = 0;

    // Base fog value for dynamic changes is owned by currentDifficulty.

    // A* pathfinding worker
    let pathWorker = null;
    let pathWorkerReady = false;
    let pathReqSeq = 0;
    let pendingPathById = {};

    // Stat modifiers (cheats + future skills) - precompute to keep hot loops branch-light.
    let playerStats = {
        baseSpeed: 5,
        sprintSpeed: 11
    };

    function recomputePlayerStats() {
        var base = 5;
        var sprint = 11;

        // Cheats
        if (cheatsEnabled.superSpeed) {
            base *= 2;
            sprint *= 2;
        }

        // TODO(skills): when BackroomsEnhancements skill trees land, fold their modifiers here.
        playerStats.baseSpeed = base;
        playerStats.sprintSpeed = sprint;
    }

    // HUD cache + dirty checking (avoid layout thrash)
    let hudEls = null;
    let hudLast = {
        collectedPellets: -1,
        totalPellets: -1,
        staminaPct: -999,
        staminaDrained: null,
        showStamina: null,
        pacCount: -1,
        lives: -1,
        abilities: ''
    };

    function ensureHudExtensions() {
        var hud = document.getElementById('game-hud');
        if (!hud) return;
        var controls = hud.querySelector('.hud-controls');

        if (!document.getElementById('hud-lives')) {
            var lives = document.createElement('div');
            lives.id = 'hud-lives';
            lives.className = 'hud-score';
            lives.style.marginLeft = '12px';
            lives.textContent = '';
            if (controls) hud.insertBefore(lives, controls);
            else hud.appendChild(lives);
        }
        if (!document.getElementById('hud-abilities')) {
            var abilities = document.createElement('div');
            abilities.id = 'hud-abilities';
            abilities.style.cssText = 'position:fixed;bottom:58px;left:50%;transform:translateX(-50%);z-index:72;color:#cce8ff;font-family:monospace;font-size:0.78rem;text-shadow:0 0 8px rgba(0,0,0,0.85);white-space:nowrap;';
            abilities.textContent = '';
            hud.appendChild(abilities);
        }
    }

    function cacheHudElements() {
        ensureHudExtensions();
        hudEls = {
            score: document.getElementById('hud-score'),
            pacCount: document.getElementById('hud-pacman-count'),
            staminaContainer: document.getElementById('stamina-bar-container'),
            staminaFill: document.getElementById('stamina-bar-fill'),
            lives: document.getElementById('hud-lives'),
            abilities: document.getElementById('hud-abilities')
        };
    }

    function invalidateHud() {
        hudLast.collectedPellets = -1;
        hudLast.totalPellets = -1;
        hudLast.staminaPct = -999;
        hudLast.staminaDrained = null;
        hudLast.showStamina = null;
        hudLast.pacCount = -1;
        hudLast.lives = -1;
        hudLast.abilities = '';
    }

    // ═══════════════════════════════════════════════════════════════
    // UNIFIED GAME CONTAINER INTEGRATION
    // ═══════════════════════════════════════════════════════════════
    
    let gameContainer = null;
    let cheatsEnabled = {};
    
    function initGameContainer() {
        if (typeof GameContainer === 'undefined') {
            console.warn('GameContainer not available');
            return;
        }
        
        gameContainer = new GameContainer({
            gameId: 'backrooms-pacman',
            gameName: 'Backrooms: Pac-Man',
            container: document.body,
        });
        
        // Set up callbacks
        gameContainer.onRestart = restartGame;
        gameContainer.onExit = () => {
            window.location.href = '/games.html';
        };
        gameContainer.onCheatChange = (cheatId, value) => {
            cheatsEnabled[cheatId] = value;
            applyCheatEffects();
        };
        
        // Load initial cheat states
        if (typeof GameCheats !== 'undefined') {
            cheatsEnabled = GameCheats.getAllActive();
        }
    }
    
    function applyCheatEffects() {
        // God Mode - handled in collision/damage checks
        // Infinite Stamina
        if (cheatsEnabled.infiniteStamina) {
            stamina = maxStamina;
            staminaDrained = false;
        }
        // Super Speed - handled in movement
        recomputePlayerStats();
        // No Blackout
        if (cheatsEnabled.noBlackout) {
            if (gameState === GAME_STATE.BLACKOUT) setGameState(GAME_STATE.PLAYING);
            blackoutActive = false;
            blackoutTimer = 0;
            nextBlackout = 999999;
        }
        // Slower Pac-Man - handled in Pac-Man movement
        // Score Multiplier - handled when collecting pellets
        // Auto Collect - handled in pellet collection
        // Night Vision - can be applied to scene fog/lighting
        if (cheatsEnabled.nightVision) {
            if (scene) {
                scene.fog = new THREE.FogExp2(0x080600, 0.015); // Less fog
            }
        } else {
            if (scene) {
                scene.fog = new THREE.FogExp2(0x080600, currentDifficulty.fogDensity);
            }
        }
        applyDifficultyPresentation();
    }
    
    // Initialize container when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGameContainer);
    } else {
        initGameContainer();
    }

    function mapSelectorToDifficultyKey(selectorKey) {
        return DIFFICULTY_SELECTOR_MAP[selectorKey] || 'standard';
    }

    function mapDifficultyKeyToSelector(diffKey) {
        for (var k in DIFFICULTY_SELECTOR_MAP) {
            if (DIFFICULTY_SELECTOR_MAP[k] === diffKey) return k;
        }
        return 'normal';
    }

    function shouldShowMinimap() {
        return !!currentDifficulty.showMap || radarTimer > 0;
    }

    function ensureDarknessOverlay() {
        if (darknessOverlay) return;
        darknessOverlay = document.createElement('div');
        darknessOverlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:44;background:#000;opacity:0;transition:opacity 0.4s;';
        document.body.appendChild(darknessOverlay);
    }

    function ensureEffectOverlay() {
        if (effectOverlay) return;
        effectOverlay = document.createElement('div');
        effectOverlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:69;opacity:0;transition:opacity 0.2s;';
        document.body.appendChild(effectOverlay);
    }

    function pulseEffectOverlay(color, opacity, durationMs) {
        ensureEffectOverlay();
        if (!effectOverlay) return;
        effectOverlay.style.background = color;
        effectOverlay.style.opacity = String(opacity);
        setTimeout(function () {
            if (effectOverlay) effectOverlay.style.opacity = '0';
        }, durationMs || 220);
    }

    function ensureStatusMessage() {
        if (statusMessageEl) return;
        statusMessageEl = document.createElement('div');
        statusMessageEl.style.cssText = 'position:fixed;top:12%;left:50%;transform:translateX(-50%);z-index:82;pointer-events:none;color:#f5f5f5;font-family:monospace;font-size:1rem;text-shadow:0 0 12px rgba(0,0,0,0.9);opacity:0;transition:opacity 0.25s;';
        document.body.appendChild(statusMessageEl);
    }

    function showStatusMessage(text, color) {
        ensureStatusMessage();
        if (!statusMessageEl) return;
        statusMessageEl.textContent = text;
        statusMessageEl.style.color = color || '#f5f5f5';
        statusMessageEl.style.opacity = '1';
        if (statusMessageTimer) clearTimeout(statusMessageTimer);
        statusMessageTimer = setTimeout(function () {
            if (statusMessageEl) statusMessageEl.style.opacity = '0';
        }, 1700);
    }

    function applyDifficultyPresentation() {
        ensureDarknessOverlay();
        if (darknessOverlay) darknessOverlay.style.opacity = currentDifficulty.darkness ? '0.92' : '0';
        if (scene && scene.fog && !cheatsEnabled.nightVision) {
            scene.fog.density = currentDifficulty.fogDensity;
        }
        if (playerFlashlight) {
            playerFlashlight.visible = !!currentDifficulty.flashlightEnabled;
            playerFlashlight.intensity = currentDifficulty.flashlightEnabled ? 0.8 : 0;
        }
        var hud = document.getElementById('game-hud');
        if (hud && isGameRunning()) hud.style.display = currentDifficulty.showHUD ? 'flex' : 'none';
        var minimap = document.getElementById('minimap-container');
        if (minimap && isGameRunning()) minimap.style.display = shouldShowMinimap() ? 'block' : 'none';
    }

    function syncSelectedDifficultyFromGameUtils() {
        if (selectedDifficultyKey === 'impossible') return;
        selectedDifficultyKey = mapSelectorToDifficultyKey(GameUtils.getDifficulty());
    }

    function refreshDifficultySelectorUI(bar) {
        if (!bar) return;
        var target = mapDifficultyKeyToSelector(selectedDifficultyKey);
        var buttons = bar.querySelectorAll('.gu-diff-btn');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle('active', buttons[i].getAttribute('data-diff') === target);
        }
    }

    function initDifficultySelectorUI() {
        var bar = document.querySelector('#start-screen .gu-difficulty-bar');
        if (!bar) return;
        var labels = { easy: 'Novice', normal: 'Standard', hard: 'Hard', nightmare: 'Nightmare', impossible: 'Impossible' };
        var baseButtons = bar.querySelectorAll('.gu-diff-btn');
        for (var i = 0; i < baseButtons.length; i++) {
            var btn = baseButtons[i];
            var key = btn.getAttribute('data-diff');
            if (labels[key]) btn.textContent = labels[key];
            btn.addEventListener('click', function (ev) {
                selectedDifficultyKey = mapSelectorToDifficultyKey(ev.currentTarget.getAttribute('data-diff'));
                refreshDifficultySelectorUI(bar);
            });
        }

        if (!bar.querySelector('.gu-diff-btn[data-diff="impossible"]')) {
            var impossibleBtn = document.createElement('button');
            impossibleBtn.className = 'gu-diff-btn';
            impossibleBtn.setAttribute('data-diff', 'impossible');
            impossibleBtn.style.setProperty('--diff-color', '#f1f1f1');
            impossibleBtn.textContent = 'Impossible';
            impossibleBtn.addEventListener('click', function () {
                selectedDifficultyKey = 'impossible';
                refreshDifficultySelectorUI(bar);
            });
            bar.appendChild(impossibleBtn);
        }
        refreshDifficultySelectorUI(bar);
    }

    // Integration
    GameUtils.injectDifficultySelector('start-screen');
    initDifficultySelectorUI();

    // Level selector handler
    var levelSelect = document.getElementById('level-select');
    var levelDesc = document.getElementById('level-description');
var levelDescriptions = {
    yellow: 'The classic yellow wallpaper backrooms - standard layout with secrets',
    mono: 'Desaturated version - harder to navigate, same layout',
    infinite: 'Non-Euclidean geometry - paths loop unexpectedly',
    flooded: 'Waterlogged corridors - slippery and dangerous',
    construction: 'Unfinished areas with scaffolding and hazards',
    sewers: '⚠️ TERRIFYING: Dark, slimy tunnels beneath the backrooms. Extreme danger!'
};

    if (levelSelect) {
        levelSelect.addEventListener('change', function() {
            if (levelDesc) {
                levelDesc.textContent = levelDescriptions[this.value] || '';
            }
        });
    }

    GameUtils.initPause({
        onResume: function () { setGameState(GAME_STATE.PLAYING); applyDifficultyPresentation(); try { renderer.domElement.requestPointerLock(); } catch (e) { } lastTime = performance.now(); accumulator = 0; animate(); },
        onRestart: restartGame
    });

    document.getElementById('start-btn').addEventListener('click', function () {
        syncSelectedDifficultyFromGameUtils();
        setDifficulty(selectedDifficultyKey);

        // Handle level selection
        var levelSelect = document.getElementById('level-select');
        if (levelSelect && typeof switchLevel === 'function') {
            switchLevel(levelSelect.value);
        }

// PHASE 8: Initialize all audio systems
HorrorAudio.init();

// Initialize enhanced audio systems
if (typeof Advanced3DAudio !== 'undefined') {
  Advanced3DAudio.init();
  console.log('[Backrooms] Advanced3DAudio initialized');
}

if (typeof DynamicSoundtrack !== 'undefined') {
  DynamicSoundtrack.init();
  console.log('[Backrooms] DynamicSoundtrack initialized');
}

if (typeof ProceduralAudio !== 'undefined') {
  ProceduralAudio.init();
  console.log('[Backrooms] ProceduralAudio initialized');
}

if (typeof BinauralAudio !== 'undefined') {
  BinauralAudio.init();
  console.log('[Backrooms] BinauralAudio initialized');
}

// PHASE 8: Initialize unified audio integration system
if (typeof Phase8AudioIntegration !== 'undefined') {
  Phase8AudioIntegration.init();
  console.log('[Backrooms] ✅ Phase 8 Audio Integration COMPLETE - All systems coordinated');
}

// PHASE 8: Setup reverb zones for the maze
setupAudioReverbZones();

// PHASE 8: Initialize binaural calibration
initBinauralCalibration();

startGame();
});
    document.getElementById('fullscreen-btn').addEventListener('click', function () { GameUtils.toggleFullscreen(); });

    // ---- INPUT (abstraction layer) ----
    function InputManager() {
        this.keyDown = {};
        this.deadzone = 0.18;
        this.axes = { x: 0, y: 0 };
        this.sprint = false;

        // Default bindings (can be extended to user-rebind UI later)
        this.bindings = {
            MOVE_FORWARD: ['KeyW', 'ArrowUp'],
            MOVE_BACK: ['KeyS', 'ArrowDown'],
            MOVE_LEFT: ['KeyA', 'ArrowLeft'],
            MOVE_RIGHT: ['KeyD', 'ArrowRight'],
            SPRINT: ['ShiftLeft', 'ShiftRight']
        };
    }

    InputManager.prototype.handleKey = function (code, down) {
        this.keyDown[code] = down;
    };

    InputManager.prototype.isActionActive = function (action) {
        var list = this.bindings[action] || [];
        for (var i = 0; i < list.length; i++) {
            if (this.keyDown[list[i]]) return true;
        }
        if (action === 'SPRINT') return !!this.sprint;
        return false;
    };

    InputManager.prototype.getMoveAxes = function () {
        return { x: this.axes.x, y: this.axes.y };
    };

    InputManager.prototype.update = function () {
        // Poll gamepad (first connected)
        this.axes.x = 0;
        this.axes.y = 0;
        this.sprint = false;

        if (!navigator.getGamepads) return;
        var pads = navigator.getGamepads();
        if (!pads) return;

        var gp = null;
        for (var i = 0; i < pads.length; i++) {
            if (pads[i]) { gp = pads[i]; break; }
        }
        if (!gp) return;

        var ax0 = gp.axes && gp.axes.length > 0 ? gp.axes[0] : 0;
        var ax1 = gp.axes && gp.axes.length > 1 ? gp.axes[1] : 0;

        // Deadzone
        if (Math.abs(ax0) < this.deadzone) ax0 = 0;
        if (Math.abs(ax1) < this.deadzone) ax1 = 0;

        this.axes.x = Math.max(-1, Math.min(1, ax0));
        this.axes.y = Math.max(-1, Math.min(1, ax1));

        // Sprint: L3 (10) or RT (7)
        var b10 = gp.buttons && gp.buttons[10] ? gp.buttons[10].pressed : false;
        var b7 = gp.buttons && gp.buttons[7] ? gp.buttons[7].value : 0;
        this.sprint = !!b10 || b7 > 0.6;
    };

    var input = new InputManager();

function handleAbilityHotkey(code) {
    if (code === 'Digit1') return tryUseAbility('flashbang');
    if (code === 'Digit2') return tryUseAbility('decoy');
    if (code === 'Digit3') return tryUseAbility('phasing');
    if (code === 'Digit4') return tryUseAbility('radar');
    if (code === 'Digit5') return tryUseAbility('reversal');
    
    // Phase 6.1: New expanded abilities
    if (typeof ExpandedAbilities !== 'undefined') {
        if (code === 'Digit6') return ExpandedAbilities.useAbility('timeDilation', playerPos);
        if (code === 'Digit7') return ExpandedAbilities.useAbility('possession', playerPos);
        if (code === 'Digit8') return ExpandedAbilities.useAbility('blackoutBomb', playerPos);
    }
    
    return false;
}

// Store listeners for cleanup
document.addEventListener('keydown', window.keydownListener = function (e) {
	keys[e.code] = true; // legacy/debug
	if (!isGameRunning()) return;
	input.handleKey(e.code, true);
	if (!e.repeat) handleAbilityHotkey(e.code);
});
document.addEventListener('keyup', window.keyupListener = function (e) {
	keys[e.code] = false; // legacy/debug
	input.handleKey(e.code, false);
});
document.addEventListener('mousemove', window.mousemoveListener = function (e) {
	if (!pointerLocked || !isGameRunning()) return;
	// Fix camera flick: Clamp movement delta to avoid massive jumps
	var mx = Math.max(-100, Math.min(100, e.movementX));
	var my = Math.max(-100, Math.min(100, e.movementY));
	yaw -= mx * 0.002;
	pitch -= my * 0.002;
	pitch = Math.max(-1.2, Math.min(1.2, pitch));
	// Normalize yaw to prevent float precision loss over time
	yaw = yaw % (Math.PI * 2);
});
document.addEventListener('pointerlockchange', window.pointerlockListener = function () {
	pointerLocked = !!document.pointerLockElement;
});
    document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && isGameRunning()) {
            setGameState(GAME_STATE.PAUSED);
            GameUtils.pauseGame();
        }
    });

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

    // ============================================
    // PHASE 1: VISUAL ATMOSPHERE FUNCTIONS
    // ============================================

    // ---- Dynamic Wall Texture System ----
    // Creates a dynamic canvas texture that can be updated in real-time
    function createDynamicWallTexture() {
        wallCanvas = document.createElement('canvas');
        wallCanvas.width = 512;
        wallCanvas.height = 512;
        wallCtx = wallCanvas.getContext('2d');

        // Base wallpaper pattern
        updateWallTextureBase();

        wallTexture = new THREE.CanvasTexture(wallCanvas);
        wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
        wallTexture.repeat.set(2, 1);
        wallTexture.needsUpdate = true;

        return wallTexture;
    }

    function updateWallTextureBase() {
        // Base color
        wallCtx.fillStyle = '#b5a44c';
        wallCtx.fillRect(0, 0, 512, 512);

        // Wallpaper stripe pattern
        for (var y = 0; y < 512; y += 32) {
            wallCtx.fillStyle = y % 64 === 0 ? '#c4b35a' : '#a89840';
            wallCtx.fillRect(0, y, 512, 16);
        }

        // Water damage stains
        for (var i = 0; i < 15; i++) {
            var sx = Math.random() * 512, sy = Math.random() * 512, sr = 20 + Math.random() * 60;
            var grd = wallCtx.createRadialGradient(sx, sy, 0, sx, sy, sr);
            grd.addColorStop(0, 'rgba(80,60,20,0.5)');
            grd.addColorStop(0.7, 'rgba(60,50,15,0.25)');
            grd.addColorStop(1, 'transparent');
            wallCtx.fillStyle = grd;
            wallCtx.fillRect(0, 0, 512, 512);
        }

        // Cracks
        wallCtx.strokeStyle = 'rgba(50,40,10,0.35)';
        wallCtx.lineWidth = 0.5;
        for (var i = 0; i < 8; i++) {
            wallCtx.beginPath();
            var startX = Math.random() * 512, startY = Math.random() * 512;
            wallCtx.moveTo(startX, startY);
            for (var j = 0; j < 5; j++) {
                wallCtx.lineTo(Math.random() * 512, Math.random() * 512);
            }
            wallCtx.stroke();
        }
    }

    // Called each frame when Pac-Man is near - creates "crawling" distortion effect
    function updateDynamicWallDistortion(intensity, dt) {
        if (!wallCtx || intensity <= 0) return;

        wallDistortionTime += dt * 2 * intensity;

        // Get image data to manipulate
        var imageData = wallCtx.getImageData(0, 0, 512, 512);
        var data = imageData.data;

        // Apply subtle distortion based on proximity
        var distortionStrength = intensity * 8;

        for (var y = 0; y < 512; y += 4) {
            for (var x = 0; x < 512; x += 4) {
                // Create wavy displacement
                var offsetX = Math.sin(y * 0.05 + wallDistortionTime) * distortionStrength;
                var offsetY = Math.cos(x * 0.05 + wallDistortionTime * 0.7) * distortionStrength;

                var srcX = Math.min(511, Math.max(0, x + offsetX));
                var srcY = Math.min(511, Math.max(0, y + offsetY));

                // Copy pixel data with offset (simplified for performance)
                var srcIdx = (srcY * 512 + srcX) * 4;
                var dstIdx = (y * 512 + x) * 4;

                // Apply to 4x4 blocks
                for (var by = 0; by < 4 && y + by < 512; by++) {
                    for (var bx = 0; bx < 4 && x + bx < 512; bx++) {
                        var bsrcIdx = ((y + by) * 512 + (x + bx)) * 4;
                        var bdstIdx = bsrcIdx; // Simplified - same source for block

                        // Darken effect when Pac-Man is very close
                        if (intensity > 0.6) {
                            var darken = intensity * 0.3;
                            data[bsrcIdx] = Math.floor(data[bsrcIdx] * (1 - darken));
                            data[bsrcIdx + 1] = Math.floor(data[bsrcIdx + 1] * (1 - darken));
                            data[bsrcIdx + 2] = Math.floor(data[bsrcIdx + 2] * (1 - darken));
                        }
                    }
                }
            }
        }

        // Add subtle red tint when in extreme danger
        if (intensity > 0.7) {
            for (var i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] + intensity * 30); // Red channel
            }
        }

        wallCtx.putImageData(imageData, 0, 0);

        // Add crawling texture effect - dark veins that move
        wallCtx.globalCompositeOperation = 'overlay';
        var veinOffset = Math.sin(wallDistortionTime * 0.5) * 20;
        for (var i = 0; i < 5; i++) {
            var vx = (Math.sin(i * 1.7 + wallDistortionTime * 0.3) * 0.5 + 0.5) * 512;
            var vy = (Math.cos(i * 2.3 + wallDistortionTime * 0.2) * 0.5 + 0.5) * 512;
            var grad = wallCtx.createRadialGradient(vx + veinOffset, vy, 0, vx + veinOffset, vy, 50 * intensity);
            grad.addColorStop(0, 'rgba(30,20,10,' + (0.1 * intensity) + ')');
            grad.addColorStop(1, 'transparent');
            wallCtx.fillStyle = grad;
            wallCtx.fillRect(0, 0, 512, 512);
        }
        wallCtx.globalCompositeOperation = 'source-over';

        if (wallTexture) {
            wallTexture.needsUpdate = true;
        }
    }

    // ---- Moisture & Grease Floor Effects ----
    function createMoisturePatches() {
        // Create a transparent overlay with wet patches for the floor
        var moistureGeo = new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL);
        var moistureCanvas = document.createElement('canvas');
        moistureCanvas.width = 256;
        moistureCanvas.height = 256;
        var mCtx = moistureCanvas.getContext('2d');

        // Clear to transparent
        mCtx.clearRect(0, 0, 256, 256);

        // Generate random wet patches
        moisturePatches = [];
        for (var i = 0; i < 30; i++) {
            moisturePatches.push({
                x: Math.random(),
                y: Math.random(),
                radius: 0.05 + Math.random() * 0.15,
                opacity: 0.1 + Math.random() * 0.25
            });
        }

        // Draw patches
        for (var i = 0; i < moisturePatches.length; i++) {
            var p = moisturePatches[i];
            var px = p.x * 256;
            var py = p.y * 256;
            var pr = p.radius * 256;

            var grad = mCtx.createRadialGradient(px, py, 0, px, py, pr);
            grad.addColorStop(0, 'rgba(100, 120, 140, ' + p.opacity + ')');
            grad.addColorStop(0.5, 'rgba(80, 100, 120, ' + (p.opacity * 0.5) + ')');
            grad.addColorStop(1, 'transparent');
            mCtx.fillStyle = grad;
            mCtx.fillRect(0, 0, 256, 256);
        }

        var moistureTex = new THREE.CanvasTexture(moistureCanvas);
        moistureTex.wrapS = moistureTex.wrapT = THREE.RepeatWrapping;
        moistureTex.repeat.set(4, 4);

        var moistureMat = new THREE.MeshBasicMaterial({
            map: moistureTex,
            transparent: true,
            opacity: 0.6,
            depthWrite: false
        });

        floorMoistureMesh = new THREE.Mesh(moistureGeo, moistureMat);
        floorMoistureMesh.rotation.x = -Math.PI / 2;
        floorMoistureMesh.position.set((COLS * CELL) / 2, 0.01, (ROWS * CELL) / 2);
        floorMoistureMesh.renderOrder = 1;
        scene.add(floorMoistureMesh);
    }

    // ---- Ceiling Degradation System ----
    function createCeilingDegradation() {
        // Add damaged ceiling tiles and exposed wiring
        var wireMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });

        // Exposed wiring
        for (var i = 0; i < 20; i++) {
            var wireGeo = new THREE.CylinderGeometry(0.02, 0.02, 2 + Math.random() * 4, 4);
            var wire = new THREE.Mesh(wireGeo, wireMat);

            // Random position in maze
            var r = Math.floor(Math.random() * ROWS);
            var c = Math.floor(Math.random() * COLS);
            if (MAZE[r] && MAZE[r][c] === 1) { // Wall
                wire.position.set(c * CELL + CELL / 2, WALL_H - 0.2, r * CELL + CELL / 2);
                wire.rotation.x = Math.random() * Math.PI;
                wire.rotation.z = Math.random() * Math.PI;
                ceilingWireMeshes.push(wire);
                scene.add(wire);
            }
        }

        // Water damage patches on ceiling (darker spots)
        var damageCanvas = document.createElement('canvas');
        damageCanvas.width = 128;
        damageCanvas.height = 128;
        var dCtx = damageCanvas.getContext('2d');

        dCtx.fillStyle = '#8a7d45';
        dCtx.fillRect(0, 0, 128, 128);

        // Panel lines (faded)
        dCtx.strokeStyle = '#706530';
        dCtx.lineWidth = 1;
        for (var x = 0; x < 128; x += 32) {
            dCtx.beginPath();
            dCtx.moveTo(x, 0);
            dCtx.lineTo(x, 128);
            dCtx.stroke();
        }
        for (var y = 0; y < 128; y += 32) {
            dCtx.beginPath();
            dCtx.moveTo(0, y);
            dCtx.lineTo(128, y);
            dCtx.stroke();
        }

        // Water stains and damage
        for (var i = 0; i < 12; i++) {
            var dx = Math.random() * 128;
            var dy = Math.random() * 128;
            var dr = 10 + Math.random() * 25;
            var grad = dCtx.createRadialGradient(dx, dy, 0, dx, dy, dr);
            grad.addColorStop(0, 'rgba(40,35,20,0.6)');
            grad.addColorStop(0.6, 'rgba(50,45,25,0.3)');
            grad.addColorStop(1, 'transparent');
            dCtx.fillStyle = grad;
            dCtx.fillRect(0, 0, 128, 128);
        }

        // Peeling paint effect
        for (var i = 0; i < 8; i++) {
            dCtx.fillStyle = 'rgba(90,80,40,' + (0.1 + Math.random() * 0.2) + ')';
            dCtx.beginPath();
            dCtx.moveTo(Math.random() * 128, Math.random() * 128);
            for (var j = 0; j < 5; j++) {
                dCtx.lineTo(Math.random() * 128, Math.random() * 128);
            }
            dCtx.closePath();
            dCtx.fill();
        }

        var damageTex = new THREE.CanvasTexture(damageCanvas);
        damageTex.wrapS = damageTex.wrapT = THREE.RepeatWrapping;
        damageTex.repeat.set(COLS / 2, ROWS / 2);

        return damageTex;
    }

    // ---- Enhanced Flickering Lights ----
    function createEnhancedFlickerSystem() {
        // Enhance the existing corridor lights with more realistic behavior
        lightFlickerContext = {
            powerFluctuations: 0,
            globalFlickerRate: 1.0,
            lastUpdate: 0
        };
    }

    function updateEnhancedFlicker(dt) {
        if (!lightFlickerContext) return;

        // Global power fluctuation (rare but intense)
        if (Math.random() < 0.001) {
            lightFlickerContext.powerFluctuations = 0.5 + Math.random() * 0.5;
        }
        lightFlickerContext.powerFluctuations *= 0.95; // Decay

        // Update each light with enhanced behavior
        for (var i = 0; i < corridorLights.length; i++) {
            var cl = corridorLights[i];
            if (!cl.light) continue;

            // Add power fluctuation effect
            var baseIntensity = 0.6 * (1 - lightFlickerContext.powerFluctuations);

            // Intensity based on distance to player (farther = dimmer)
            var distToPlayer = Math.sqrt(
                Math.pow(cl.position.x - camera.position.x, 2) +
                Math.pow(cl.position.z - camera.position.z, 2)
            );
            var distFactor = Math.max(0.3, 1 - distToPlayer / (CELL * 10));

            // Apply intensity
            cl.light.intensity = baseIntensity * distFactor;

            // Color temperature shift (warmer when dimmer)
            var warmth = 1 - distFactor;
            var r = Math.floor(255);
            var g = Math.floor(232 - warmth * 30);
            var b = Math.floor(160 - warmth * 60);
            cl.light.color.setRGB(r / 255, g / 255, b / 255);
        }
    }

    // ---- VHS/Analog Distortion System ----
    function createVHSDistortion() {
        vhsOverlay = document.createElement('div');
        vhsOverlay.id = 'vhs-overlay';
        vhsOverlay.style.cssText = `
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 49;
            mix-blend-mode: overlay;
            opacity: 0;
            transition: opacity 0.5s;
        `;

        // Scanlines
        vhsScanlines = document.createElement('div');
        vhsScanlines.id = 'vhs-scanlines';
        vhsScanlines.style.cssText = `
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
                0deg,
                rgba(0, 0, 0, 0.15),
                rgba(0, 0, 0, 0.15) 1px,
                transparent 1px,
                transparent 2px
            );
            animation: vhsScanMove 8s linear infinite;
        `;
        vhsOverlay.appendChild(vhsScanlines);

        // Chromatic aberration layer
        vhsChromatic = document.createElement('div');
        vhsChromatic.id = 'vhs-chromatic';
        vhsChromatic.style.cssText = `
            position: absolute;
            inset: 0;
            background: none;
            mix-blend-mode: color-dodge;
            opacity: 0;
        `;
        vhsOverlay.appendChild(vhsChromatic);

        // Add CSS animation
        var style = document.createElement('style');
        style.textContent = `
            @keyframes vhsScanMove {
                0% { background-position: 0 0; }
                100% { background-position: 0 100px; }
            }
            @keyframes vhsFlicker {
                0%, 100% { opacity: 0.97; }
                50% { opacity: 1; }
            }
            #vhs-scanlines {
                animation: vhsScanMove 8s linear infinite, vhsFlicker 0.15s infinite;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(vhsOverlay);

        // Create noise canvas for static
        vhsNoiseCanvas = document.createElement('canvas');
        vhsNoiseCanvas.width = 128;
        vhsNoiseCanvas.height = 128;
        vhsNoiseCtx = vhsNoiseCanvas.getContext('2d');
    }

    function updateVHSDistortion(intensity, dt) {
        if (!vhsOverlay) return;

        vhsTime += dt;

        // Base VHS effect increases with proximity to Pac-Man
        var vhsIntensity = Math.pow(intensity, 1.5) * 0.7;

        // Add random noise bursts
        if (Math.random() < 0.02 * intensity) {
            vhsIntensity = Math.min(1, vhsIntensity + 0.3);
        }

        // Update overlay opacity
        vhsOverlay.style.opacity = vhsIntensity.toFixed(3);

        // Scanline speed increases with danger
        if (vhsScanlines) {
            vhsScanlines.style.animationDuration = (8 - intensity * 6) + 's';
        }

        // Chromatic aberration - RGB separation effect
        if (vhsChromatic && intensity > 0.3) {
            vhsChromatic.style.opacity = ((intensity - 0.3) * 0.5).toFixed(3);
            // Simulate RGB shift with multiple shadows
            var shift = intensity * 4;
            vhsChromatic.style.textShadow = `
                ${shift}px 0 rgba(255,0,0,${intensity * 0.3}),
                -${shift}px 0 rgba(0,0,255,${intensity * 0.3})
            `;
        }

        // Occasional frame skip effect
        if (intensity > 0.6 && Math.random() < 0.05) {
            document.body.style.transform = `translateX(${(Math.random() - 0.5) * 4}px)`;
            setTimeout(function() {
                document.body.style.transform = '';
            }, 50);
        }
    }

    // ---- Dynamic Fog System ----
    function updateFogDensity(intensity, dt) {
        if (!scene.fog) return;

        // Increase fog density when Pac-Man is near (creates claustrophobic effect)
        var dangerFogBoost = intensity * 0.025;
        var targetDensity = targetFogDensity + dangerFogBoost;

        // Smooth transition
        var currentDensity = scene.fog.density;
        var newDensity = currentDensity + (targetDensity - currentDensity) * dt * 2;
        scene.fog.density = Math.max(baseFogDensity * 0.5, Math.min(baseFogDensity * 3, newDensity));

        // Also adjust fog color slightly - more red when in danger
        var dangerTint = intensity * 0.1;
        scene.fog.color.setRGB(
            0.03 + dangerTint,
            0.02,
            0
        );
    }

    // ---- Initialize All Visual Atmosphere Effects ----
    function initVisualAtmosphere() {
        console.log('[Backrooms] Initializing Visual Atmosphere...');

        // Create dynamic wall texture
        var dynamicWallTex = createDynamicWallTexture();

        // Apply to existing wall meshes
        scene.traverse(function(obj) {
            if (obj.isMesh && obj.material && obj.material.map) {
                // Check if it's a wall by position
                if (obj.position.y === WALL_H / 2) {
                    wallMeshes.push(obj);
                    // Keep original texture but we can blend
                }
            }
        });

        // Create moisture patches on floor
        createMoisturePatches();

        // Enhance ceiling with degradation
        var ceilingDamageTex = createCeilingDegradation();

        // Apply damage texture to ceiling
        scene.traverse(function(obj) {
            if (obj.isMesh && obj.material && obj.geometry.type === 'PlaneGeometry') {
                if (obj.rotation.x === Math.PI / 2 && obj.position.y > WALL_H / 2) {
                    ceilingMeshes.push(obj);
                }
            }
        });

        // Initialize enhanced flicker system
        createEnhancedFlickerSystem();

        // Create VHS distortion overlay
        createVHSDistortion();

        // Apply selected difficulty profile
        setDifficulty(selectedDifficultyKey);

        console.log('[Backrooms] Visual Atmosphere initialized');
    }

    // ---- Main Visual Update (called each frame) ----
    function updateVisualAtmosphere(dt) {
        var intensity = visualIntensity || 0;

        // Update dynamic wall distortion
        updateDynamicWallDistortion(intensity, dt);

        // Update enhanced flickering
        updateEnhancedFlicker(dt);

        // Update VHS distortion
        updateVHSDistortion(intensity, dt);

        // Update fog density
        updateFogDensity(intensity, dt);
    }

    // ============================================
    // PHASE 2: 3D SPATIAL AUDIO SYSTEM
    // ============================================

    // Audio state
    let audioContext = null;
    let masterGain = null;
    let pannerNodes = {};
    let ambientSounds = {};
    let footstepOscillator = null;
    let footstepGain = null;
    let pacmanSoundNodes = [];
    let whisperOscillators = [];

    // Audio configuration
    const AUDIO_CONFIG = {
        // Distance at which Pac-Man sound starts
        soundStartDistance: 30,
        // Distance at which sound is maximum volume
        soundMaxDistance: 3,
        // Maximum volume for Pac-Man sounds
        maxPacmanVolume: 0.9,
        // Footstep timing (seconds)
        footstepInterval: 0.4,
        // Ambient sound volumes
        ambientVolume: 0.15,
        fluorescentHumFreq: 60,
        whisperVolume: 0.08
    };

    // Initialize 3D Audio System
    function initSpatialAudio() {
        try {
            // Get Web Audio context from HorrorAudio if available
            if (window.HorrorAudio && HorrorAudio.getContext) {
                audioContext = HorrorAudio.getContext();
            }

            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Create master gain
            masterGain = audioContext.createGain();
            masterGain.gain.value = 0.7;
            masterGain.connect(audioContext.destination);

            // Initialize ambient sounds
            initAmbientSounds();

console.log('[Backrooms] Spatial Audio initialized');
  } catch (e) {
    console.warn('[Backrooms] Audio initialization failed:', e);
  }
}

// PHASE 8: Setup reverb zones throughout the maze
function setupAudioReverbZones() {
  if (typeof Advanced3DAudio === 'undefined' || !Advanced3DAudio.createReverbZone) return;

  console.log('[Backrooms] Setting up Phase 8 audio reverb zones...');

  // Clear existing zones
  Advanced3DAudio.clearReverbZones();

  // Create reverb zones for different areas
  // Center area (starting position) - small room reverb
  Advanced3DAudio.createReverbZone('center', { x: CELL * COLS / 2, y: 1.5, z: CELL * ROWS / 2 }, CELL * 2, 'small');

  // Corridor zones - corridor reverb
  for (var i = 0; i < 5; i++) {
    var x = CELL * 2 + i * CELL * 3;
    var z = CELL * 2;
    Advanced3DAudio.createReverbZone('corridor_' + i, { x: x, y: 1.5, z: z }, CELL * 1.5, 'corridor');
  }

  // Large open areas - warehouse reverb
  Advanced3DAudio.createReverbZone('open_area_1', { x: CELL * 10, y: 1.5, z: CELL * 10 }, CELL * 4, 'warehouse');

  // Tight spaces (if any) - tight reverb
  Advanced3DAudio.createReverbZone('tight_1', { x: CELL * 5, y: 1.5, z: CELL * 8 }, CELL * 1.2, 'tight');

  // Water areas (if present) - underwater reverb
  // Advanced3DAudio.createReverbZone('water_1', { x: CELL * 15, y: 0.5, z: CELL * 5 }, CELL * 3, 'underwater');

  console.log('[Backrooms] Created', Advanced3DAudio.config.reverbZones ? 'multiple' : '0', 'reverb zones');
}

// PHASE 8: Initialize binaural audio calibration
function initBinauralCalibration() {
  if (typeof BinauralAudio === 'undefined') return;

  // Check if user has completed calibration before
  var calibrationCompleted = localStorage.getItem('binaural_calibration_completed');

  if (!calibrationCompleted && BinauralAudio.getCalibrationStatus) {
    // Offer calibration on first run (after game starts)
    setTimeout(function() {
      console.log('[Backrooms] Offering binaural calibration...');
      // Could show a UI prompt here
      // For now, just log that calibration is available
    }, 5000);
  }
}

// PHASE 8: Trigger procedural audio events based on game state
function triggerProceduralAudioEvent(eventType, params) {
  if (typeof ProceduralAudio === 'undefined') return;

  switch (eventType) {
    case 'whisper':
      ProceduralAudio.generateWhisper();
      break;
    case 'chant':
      ProceduralAudio.generateChant(params.pitch, params.speed, params.intensity);
      break;
    case 'moan':
      ProceduralAudio.generateMoan(params.pitch, params.duration, params.intensity);
      break;
    case 'footstep':
      ProceduralAudio.generateFootstep(params.surface, params.velocity, params.weight);
      break;
    case 'wind':
      ProceduralAudio.generateWind(params.intensity || 0.5);
      break;
    case 'tile_crack':
      ProceduralAudio.generateTileCrack();
      break;
    case 'glass_break':
      ProceduralAudio.generateGlassBreak();
      break;
  }
}

    // Create 3D panner for positional audio
    function create3DPanner(x, y, z) {
        if (!audioContext) return null;

        var panner = audioContext.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'exponential';
        panner.refDistance = 1;
        panner.maxDistance = 50;
        panner.rolloffFactor = 1.5;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 360;
        panner.coneOuterGain = 0;
        panner.setPosition(x, y, z);

        return panner;
    }

    // Update listener position (player position)
    function updateAudioListener() {
        if (!audioContext) return;

        var listener = audioContext.listener;

        // Update position
        if (listener.positionX) {
            listener.positionX.value = camera.position.x;
            listener.positionY.value = camera.position.y;
            listener.positionZ.value = camera.position.z;

            // Get forward direction
            var forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(camera.quaternion);

            var up = new THREE.Vector3(0, 1, 0);
            up.applyQuaternion(camera.quaternion);

            listener.forwardX.value = forward.x;
            listener.forwardY.value = forward.y;
            listener.forwardZ.value = forward.z;
            listener.upX.value = up.x;
            listener.upY.value = up.y;
            listener.upZ.value = up.z;
        }
    }

    // ---- Proximity-Based Audio for Pac-Man ----
    function updatePacmanProximityAudio(pacmanObj, distance, dt) {
        if (!audioContext || !pacmanObj) return;

        var intensity = visualIntensity || 0;

        // Calculate volume based on distance
        var volume = 0;
        if (distance < AUDIO_CONFIG.soundStartDistance) {
            // Exponential volume increase as distance decreases
            var normalizedDist = Math.max(0, distance) / AUDIO_CONFIG.soundStartDistance;
            volume = Math.pow(1 - normalizedDist, 2) * AUDIO_CONFIG.maxPacmanVolume;
        }

        // Apply intensity boost when very close
        if (distance < 5) {
            volume *= (1 + intensity * 0.5);
        }

        // Create or update Pac-Man sound
        updatePacmanSound(pacmanObj, volume, distance);
    }

    // Manage Pac-Man sound (waka-waka chomping)
    function updatePacmanSound(pacmanObj, volume, distance) {
        if (!audioContext) return;

        var pacId = pacmanObj.id || 'main';

        // Create sound nodes if they don't exist
        if (!pannerNodes[pacId]) {
            var panner = create3DPanner(0, 1.5, 0);
            var gain = audioContext.createGain();
            gain.gain.value = 0;

            if (panner) {
                panner.connect(gain);
                gain.connect(masterGain);
            }

            pannerNodes[pacId] = {
                panner: panner,
                gain: gain,
                oscillator: null,
                lastChomp: 0,
                chompInterval: 0.4
            };
        }

        var node = pannerNodes[pacId];

        // Update position
        if (node.panner && pacmanObj.position) {
            node.panner.setPosition(pacmanObj.position.x, pacmanObj.position.y, pacmanObj.position.z);
        }

        // Update volume with smooth transition
        node.gain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.1);

        // Create chomping sound
        node.lastChomp += dt;
        if (volume > 0.1 && node.lastChomp > node.chompInterval) {
            node.lastChomp = 0;
            // Adjust chomp speed based on distance (faster when closer)
            node.chompInterval = 0.15 + (distance / AUDIO_CONFIG.soundStartDistance) * 0.4;
            playChompSound(node.gain, distance);
        }
    }

    // Play chomping sound
    function playChompSound(destination, distance) {
        if (!audioContext) return;

        // Create a quick "waka" sound using oscillator
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();

        osc.type = 'square';
        // Frequency based on distance - higher pitch when closer
        var baseFreq = 200 + (30 - distance) * 10;
        osc.frequency.setValueAtTime(Math.min(500, Math.max(150, baseFreq)), audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(destination);

        osc.start();
        osc.stop(audioContext.currentTime + 0.15);
    }

    // ---- Layered Ambient Sounds ----
    function initAmbientSounds() {
        if (!audioContext) return;

        // Fluorescent light hum
        createFluorescentHum();

        // Distant whispers (occasional)
        scheduleWhispers();

        // Water drips (random)
        scheduleWaterDrips();

        // Paper shuffling (rare)
        schedulePaperShuffles();
    }

    function createFluorescentHum() {
        if (!audioContext) return;

        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        var lfo = audioContext.createOscillator();
        var lfoGain = audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.value = AUDIO_CONFIG.fluorescentHumFreq;

        lfo.type = 'sine';
        lfo.frequency.value = 0.5; // Slow modulation
        lfoGain.gain.value = 5; // Frequency deviation

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        gain.gain.value = AUDIO_CONFIG.ambientVolume * 0.3;

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start();
        lfo.start();

        ambientSounds.fluorescent = { osc: osc, lfo: lfo, gain: gain };
    }

    function scheduleWhispers() {
        if (!audioContext || Math.random() > 0.3) return; // 30% chance

        var delay = 10 + Math.random() * 30; // 10-40 seconds

        setTimeout(function() {
            playWhisper();
            scheduleWhispers(); // Schedule next
        }, delay * 1000);
    }

    function playWhisper() {
        if (!audioContext) return;

        // Create whispered sound using filtered noise
        var bufferSize = 2 * audioContext.sampleRate;
        var noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        var output = noiseBuffer.getChannelData(0);

        for (var i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        var noise = audioContext.createBufferSource();
        noise.buffer = noiseBuffer;

        // Bandpass filter for whisper-like sound
        var filter = audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800 + Math.random() * 400;
        filter.Q.value = 2;

        var gain = audioContext.createGain();
        gain.gain.setValueAtTime(0, audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(AUDIO_CONFIG.whisperVolume, audioContext.currentTime + 0.5);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        noise.start();
        noise.stop(audioContext.currentTime + 2.5);
    }

    function scheduleWaterDrips() {
        if (!audioContext) return;

        var delay = 3 + Math.random() * 8; // 3-11 seconds between drips

        setTimeout(function() {
            playWaterDrip();
            scheduleWaterDrips();
        }, delay * 1000);
    }

    function playWaterDrip() {
        if (!audioContext) return;

        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + Math.random() * 400, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start();
        osc.stop(audioContext.currentTime + 0.2);
    }

    function schedulePaperShuffles() {
        if (!audioContext) return;

        var delay = 15 + Math.random() * 45; // 15-60 seconds

        setTimeout(function() {
            playPaperShuffle();
            schedulePaperShuffles();
        }, delay * 1000);
    }

    function playPaperShuffle() {
        if (!audioContext) return;

        // Short burst of filtered noise
        var bufferSize = 0.3 * audioContext.sampleRate;
        var noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        var output = noiseBuffer.getChannelData(0);

        for (var i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        var noise = audioContext.createBufferSource();
        noise.buffer = noiseBuffer;

        var filter = audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;

        var gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.05, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        noise.start();
        noise.stop(audioContext.currentTime + 0.35);
    }

    // ---- Footstep System ----
    let lastFootstep = 0;
    let currentSurface = 'tile';

    function updateFootsteps(dt, isRunning) {
        if (!audioContext) return;

        var interval = isRunning ? AUDIO_CONFIG.footstepInterval * 0.6 : AUDIO_CONFIG.footstepInterval;
        lastFootstep += dt;

        if (lastFootstep > interval) {
            lastFootstep = 0;
            playFootstep(currentSurface);
        }
    }

    function playFootstep(surface) {
        if (!audioContext) return;

        // Different sounds for different surfaces
        var sounds = {
            tile: { freq: 150, decay: 0.1, type: 'square' },
            carpet: { freq: 80, decay: 0.15, type: 'triangle' },
            hardwood: { freq: 200, decay: 0.08, type: 'sine' },
            wet: { freq: 120, decay: 0.12, type: 'sine' }
        };

        var s = sounds[surface] || sounds.tile;

        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        var filter = audioContext.createBiquadFilter();

        osc.type = s.type;
        osc.frequency.value = s.freq + Math.random() * 20;

        filter.type = 'lowpass';
        filter.frequency.value = 800;

        gain.gain.setValueAtTime(0.15, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + s.decay);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start();
        osc.stop(audioContext.currentTime + s.decay + 0.05);
    }

    // Detect surface under player
    function detectSurface() {
        var c = Math.floor(playerPos.x / CELL);
        var r = Math.floor(playerPos.z / CELL);

        // Check if position has moisture (random based on position hash)
        var hash = (c * 17 + r * 31) % 10;
        if (hash < 2) return 'wet';

        // Default to tile floor
        return 'tile';
    }

// ---- Audio Update Loop ----
function updateAudioSystem(dt) {
  if (!audioContext) return;

  // Update listener position
  updateAudioListener();

  // Update footstep sounds
  if (isGameRunning()) {
    currentSurface = detectSurface();
    updateFootsteps(dt, isRunning);
  }

  // Update ambient sound intensities based on danger
  var intensity = visualIntensity || 0;

  if (ambientSounds.fluorescent) {
    // Reduce ambient hum when in danger (player focus shifts)
    var humVolume = AUDIO_CONFIG.ambientVolume * 0.3 * (1 - intensity * 0.5);
    ambientSounds.fluorescent.gain.gain.setTargetAtTime(humVolume, audioContext.currentTime, 0.5);
  }

  // PHASE 8: Enhanced Dynamic Soundtrack Integration
  if (typeof DynamicSoundtrack !== 'undefined' && DynamicSoundtrack.updateIntensity) {
    // Build game context for leitmotif triggers
    var gameContext = {
      pacman_proximity: pacDist || 999,
      sanity: typeof SanitySystem !== 'undefined' ? SanitySystem.getSanity() : 100,
      blackout: blackoutActive,
      enemies_nearby: extraPacmans ? extraPacmans.length : 0,
      discoveredSecret: false // Would be set when discovering secrets
    };

    // Update dynamic soundtrack with game context
    DynamicSoundtrack.updateIntensity(intensity * 4, dt, gameContext);
  }

  // PHASE 8: Update Advanced 3D Audio reverb zones
  if (typeof Advanced3DAudio !== 'undefined' && Advanced3DAudio.updateReverbZones) {
    if (camera) {
      Advanced3DAudio.updateReverbZones({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      });
    }
  }

  // PHASE 8: Update HorrorAudioEnhanced intensity
  if (typeof HorrorAudioEnhanced !== 'undefined' && HorrorAudioEnhanced.setMusicIntensity) {
    HorrorAudioEnhanced.setMusicIntensity(intensity);

    // Change music theme based on intensity
    if (intensity > 0.8) {
      HorrorAudioEnhanced.setMusicTheme('chase');
    } else if (intensity > 0.5) {
      HorrorAudioEnhanced.setMusicTheme('tension');
    } else if (intensity > 0.2) {
      HorrorAudioEnhanced.setMusicTheme('ambient');
    } else {
      // PHASE 8: Silence mechanic - very low chance to trigger silence
      if (Math.random() < 0.001 && intensity < 0.1) {
        DynamicSoundtrack.setIntensityParameter('force_silence', true);
      }
    }
  }

  // PHASE 8: Update procedural audio based on game state
  if (typeof ProceduralAudio !== 'undefined') {
    // Generate subtle ambient drones during low intensity
    if (intensity < 0.2 && Math.random() < 0.01) {
      ProceduralAudio.playAmbientDrone(40 + Math.random() * 20, 5, 0.05);
    }

    // Generate heartbeat based on stress
    if (typeof StressSystem !== 'undefined') {
      var stress = StressSystem.getStress ? StressSystem.getStress() : 0;
      if (stress > 50 && Math.random() < 0.02) {
        ProceduralAudio.generateHeartbeat(60 + stress);
      }
    }
  }
}

    // ============================================
    // PHASE 3: LEVEL DESIGN EXPANSION
    // ============================================

    // Level configurations
    const LEVEL_CONFIGS = {
        yellow: {
            name: 'Yellow Backrooms',
            wallColor: 0xb5a44c,
            accentColor: 0xc4b35a,
            fogColor: 0x080600,
            fogDensity: 0.038,
            hasSecrets: true,
            nonEuclidean: false,
            description: 'The classic yellow wallpaper backrooms'
        },
        mono: {
            name: 'Mono-Yellow',
            wallColor: 0x999966,
            accentColor: 0xaaaa77,
            fogColor: 0x050500,
            fogDensity: 0.055,
            hasSecrets: true,
            nonEuclidean: false,
            description: 'Desaturated, harder to navigate'
        },
        infinite: {
            name: 'Infinite',
            wallColor: 0x8a7d45,
            accentColor: 0x9a8d55,
            fogColor: 0x020200,
            fogDensity: 0.08,
            hasSecrets: false,
            nonEuclidean: true,
            description: 'Endless looping corridors'
        }
    };

    let currentLevel = 'yellow';
    let secretRooms = [];
    let visualLandmarks = [];
    let corridorTypes = [];
    let levelMazeOverrides = {};

    // Generate secret rooms in the maze
    function generateSecretRooms() {
        secretRooms = [];

        // Find suitable locations for secret rooms (open areas in maze)
        var potentialLocations = [];

        for (var r = 2; r < ROWS - 2; r++) {
            for (var c = 2; c < COLS - 2; c++) {
                // Check if this is a good spot (surrounded by walls)
                if (MAZE[r][c] === 0 && isSurroundedByWalls(r, c)) {
                    potentialLocations.push({ r: r, c: c });
                }
            }
        }

        // Select 3-5 random secret room locations
        var numSecrets = 3 + Math.floor(Math.random() * 3);
        for (var i = 0; i < Math.min(numSecrets, potentialLocations.length); i++) {
            var idx = Math.floor(Math.random() * potentialLocations.length);
            var loc = potentialLocations.splice(idx, 1)[0];

            secretRooms.push({
                r: loc.r,
                c: loc.c,
                revealed: false,
                hasPowerPellet: Math.random() > 0.5,
                position: {
                    x: loc.c * CELL + CELL / 2,
                    z: loc.r * CELL + CELL / 2
                }
            });
        }

        console.log('[Backrooms] Generated', secretRooms.length, 'secret rooms');
    }

    function isSurroundedByWalls(r, c) {
        // Check 3x3 area around position
        for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                var nr = r + dr, nc = c + dc;
                if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
                if (MAZE[nr][nc] !== 1) return false;
            }
        }
        return true;
    }

    // Visual landmarks system
    function generateVisualLandmarks() {
        visualLandmarks = [];

        var landmarkTypes = ['poster', 'sign', 'object', 'mark'];

        // Generate 8-12 landmarks throughout the maze
        var numLandmarks = 8 + Math.floor(Math.random() * 5);

        for (var i = 0; i < numLandmarks; i++) {
            // Find a wall position
            var r = 1 + Math.floor(Math.random() * (ROWS - 2));
            var c = 1 + Math.floor(Math.random() * (COLS - 2));

            if (MAZE[r][c] === 1) { // Wall
                var type = landmarkTypes[Math.floor(Math.random() * landmarkTypes.length)];

                visualLandmarks.push({
                    r: r,
                    c: c,
                    type: type,
                    position: {
                        x: c * CELL + CELL / 2,
                        y: WALL_H * 0.6,
                        z: r * CELL + CELL / 2
                    },
                    color: getLandmarkColor(type)
                });
            }
        }

        // Create landmark meshes
        createLandmarkMeshes();
    }

    function getLandmarkColor(type) {
        switch (type) {
            case 'poster': return 0xcc4444;
            case 'sign': return 0x44cc44;
            case 'object': return 0x4444cc;
            case 'mark': return 0xcccc44;
            default: return 0xffffff;
        }
    }

    function createLandmarkMeshes() {
        for (var i = 0; i < visualLandmarks.length; i++) {
            var lm = visualLandmarks[i];
            var geo, mat, mesh;

            switch (lm.type) {
                case 'poster':
                    geo = new THREE.PlaneGeometry(1.2, 1.6);
                    mat = new THREE.MeshBasicMaterial({
                        color: lm.color,
                        side: THREE.DoubleSide
                    });
                    mesh = new THREE.Mesh(geo, mat);
                    break;

                case 'sign':
                    geo = new THREE.BoxGeometry(0.8, 0.4, 0.1);
                    mat = new THREE.MeshBasicMaterial({ color: lm.color });
                    mesh = new THREE.Mesh(geo, mat);
                    break;

                case 'object':
                    geo = new THREE.SphereGeometry(0.3, 8, 8);
                    mat = new THREE.MeshBasicMaterial({ color: lm.color });
                    mesh = new THREE.Mesh(geo, mat);
                    break;

                case 'mark':
                    geo = new THREE.PlaneGeometry(0.3, 0.3);
                    mat = new THREE.MeshBasicMaterial({
                        color: lm.color,
                        side: THREE.DoubleSide
                    });
                    mesh = new THREE.Mesh(geo, mat);
                    break;
            }

            if (mesh) {
                mesh.position.set(lm.position.x, lm.position.y, lm.position.z);
                // Face into the corridor
                mesh.lookAt(camera.position);
                scene.add(mesh);
            }
        }
    }

    // Corridor variety system
    function generateCorridorVariety() {
        corridorTypes = [];

        // Classify each corridor segment
        for (var r = 1; r < ROWS - 1; r++) {
            for (var c = 1; c < COLS - 1; c++) {
                if (MAZE[r][c] === 0) { // Floor tile
                    var corridorType = classifyCorridor(r, c);
                    corridorTypes.push({
                        r: r,
                        c: c,
                        type: corridorType,
                        position: {
                            x: c * CELL + CELL / 2,
                            z: r * CELL + CELL / 2
                        }
                    });
                }
            }
        }

        // Add corridor decorations based on type
        addCorridorDecorations();
    }

    function classifyCorridor(r, c) {
        // Count open neighbors
        var openCount = 0;
        if (MAZE[r-1] && MAZE[r-1][c] === 0) openCount++;
        if (MAZE[r+1] && MAZE[r+1][c] === 0) openCount++;
        if (MAZE[r][c-1] === 0) openCount++;
        if (MAZE[r][c+1] === 0) openCount++;

        if (openCount >= 3) return 'intersection';
        if (openCount === 2) {
            // Check if it's a straight corridor or corner
            if ((MAZE[r-1] && MAZE[r-1][c] === 0 && MAZE[r+1] && MAZE[r+1][c] === 0) ||
                (MAZE[r][c-1] === 0 && MAZE[r][c+1] === 0)) {
                return 'straight';
            }
            return 'corner';
        }
        return 'narrow';
    }

    function addCorridorDecorations() {
        // Add debris, props, etc. based on corridor type
        for (var i = 0; i < corridorTypes.length; i++) {
            var ct = corridorTypes[i];

            // Random chance to add decoration
            if (Math.random() > 0.85) {
                addDebris(ct.position.x, ct.position.z, ct.type);
            }
        }
    }

    function addDebris(x, z, corridorType) {
        var debrisGeo = new THREE.BoxGeometry(0.2, 0.1, 0.2);
        var debrisMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        var debris = new THREE.Mesh(debrisGeo, debrisMat);

        debris.position.set(
            x + (Math.random() - 0.5) * 2,
            0.05,
            z + (Math.random() - 0.5) * 2
        );
        debris.rotation.y = Math.random() * Math.PI;

        scene.add(debris);
    }

    // Non-Euclidean geometry (path loops)
    let nonEuclideanMappings = {};

    function generateNonEuclideanGeometry() {
        if (currentLevel !== 'infinite') return;

        nonEuclideanMappings = {};

        // Create 3-5 path loops that take you to unexpected places
        var numLoops = 3 + Math.floor(Math.random() * 3);

        for (var i = 0; i < numLoops; i++) {
            // Find two valid positions
            var pos1 = findValidFloorPosition();
            var pos2 = findValidFloorPosition();

            if (pos1 && pos2) {
                // Create a mapping between these positions
                var key1 = pos1.r + ',' + pos1.c;
                var key2 = pos2.r + ',' + pos2.c;

                nonEuclideanMappings[key1] = pos2;
                nonEuclideanMappings[key2] = pos1;
            }
        }

        console.log('[Backrooms] Non-Euclidean mappings:', Object.keys(nonEuclideanMappings).length);
    }

    function findValidFloorPosition() {
        var attempts = 0;
        while (attempts < 50) {
            var r = 2 + Math.floor(Math.random() * (ROWS - 4));
            var c = 2 + Math.floor(Math.random() * (COLS - 4));

            if (MAZE[r] && MAZE[r][c] === 0) {
                return { r: r, c: c };
            }
            attempts++;
        }
        return null;
    }

    function checkNonEuclideanEntry(r, c) {
        var key = r + ',' + c;
        return nonEuclideanMappings[key];
    }

    // Level switching
function switchLevel(levelName) {
    // Phase 3.2: Use Biome System if available
    if (typeof BiomeSystem !== 'undefined') {
        var biome = BiomeSystem.setBiome(levelName);
        if (biome) {
            currentLevel = levelName;
            console.log('[Phase 3.2] Biome switched to:', biome.name);
            return;
        }
    }

    // Fallback to original implementation
    var config = LEVEL_CONFIGS[levelName];
    if (!config) return;

    currentLevel = levelName;
    scene.background = new THREE.Color(config.fogColor);
    scene.fog.color = new THREE.Color(config.fogColor);
    scene.fog.density = config.fogDensity;
    targetFogDensity = config.fogDensity;
    baseFogDensity = config.fogDensity;

    if (config.hasSecrets) {
        generateSecretRooms();
        generateVisualLandmarks();
    }
    generateCorridorVariety();
    if (config.nonEuclidean) {
        generateNonEuclideanGeometry();
    }
    console.log('[Backrooms] Switched to level:', config.name);
}

// Phase 3.1 & 3.4: Generate procedural level for roguelike mode
function generateProceduralLevel(floorNum) {
    if (typeof RoguelikeMode === 'undefined') return null;
    
    var floorData = RoguelikeMode.getFloorData();
    if (!floorData) return null;
    
    console.log('[Phase 3] Generating procedural floor', floorNum);
    
    // Generate maze using procedural system
    if (typeof ProceduralMaze !== 'undefined') {
        var mazeSize = 20 + Math.floor(floorNum / 5) * 5;
        mazeSize = Math.min(mazeSize, 31);
        
        var maze = ProceduralMaze.generate(mazeSize, mazeSize, floorData.seed, floorNum);
        
        // Apply biome settings
        if (typeof BiomeSystem !== 'undefined') {
            BiomeSystem.setBiome(floorData.biome);
        }
        
        return maze;
    }
    
    return null;
}

    // Check for secret room discovery
    function checkSecretRoomDiscovery() {
        for (var i = 0; i < secretRooms.length; i++) {
            var sr = secretRooms[i];
            if (sr.revealed) continue;

            var dx = playerPos.x - sr.position.x;
            var dz = playerPos.z - sr.position.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            // Discover if player is close enough
            if (dist < CELL * 1.5) {
                sr.revealed = true;
                revealSecretRoom(sr);
            }
        }
    }

    function revealSecretRoom(sr) {
        // Visual effect for discovering secret room
        console.log('[Backrooms] Secret room discovered!');

        // Could add visual particles, sound effect, etc.
        if (window.HorrorAudio) {
            try { HorrorAudio.playCollect(); } catch(e) {}
        }
    }

    // ============================================
    // PHASE 7: PROGRESSIVE DIFFICULTY SCALING
    // ============================================

    // Pellet threshold tracking
    let pelletThresholds = {
        reached25: false,
        reached50: false,
        reached75: false,
        reached90: false
    };
    let lastPelletCount = 0;
    let finalChaseMode = false;

    // Boss encounter system
    let bossEncounter = {
        active: false,
        boss: null,
        health: 100,
        maxHealth: 100,
        type: null // 'giant', 'speed', 'armored'
    };
    let bossWarningEl = null;

    // Environmental hazards
    let environmentalHazards = {
        collapsingCeilings: [],
        closingDoors: [],
        flickeringSections: [],
        hazardTimers: []
    };

    // Check pellet thresholds and trigger events
    function checkPelletThresholds() {
        if (totalPellets === 0) return;

        var progress = collectedPellets / totalPellets;
        var threshold = Math.floor(progress * 100);

        // 25% - Pac-Man speed increases
        if (threshold >= 25 && !pelletThresholds.reached25) {
            pelletThresholds.reached25 = true;
            triggerPellet25Event();
        }

        // 50% - Fog increases, extra Pac-Man spawns
        if (threshold >= 50 && !pelletThresholds.reached50) {
            pelletThresholds.reached50 = true;
            triggerPellet50Event();
        }

        // 75% - More frequent blackouts
        if (threshold >= 75 && !pelletThresholds.reached75) {
            pelletThresholds.reached75 = true;
            triggerPellet75Event();
        }

        // 90% - Final chase mode
        if (threshold >= 90 && !pelletThresholds.reached90) {
            pelletThresholds.reached90 = true;
            triggerPellet90Event();
        }
    }

    function triggerPellet25Event() {
        console.log('[Backrooms] 25% threshold - Pac-Man speeds up!');

        // Show notification
        showStatusMessage('Pac-Man is getting faster!', '#ff4444');

        // Increase Pac-Man speed (handled in chase.speed multiplier)
        if (chase) {
            chase.speed *= 1.1;
        }

        // Add environmental hazard
        triggerEnvironmentalHazard('flickering');
    }

    function triggerPellet50Event() {
        console.log('[Backrooms] 50% threshold - New threat emerges!');

        showStatusMessage('Something else is here...', '#ff4444');

        // Increase fog density temporarily
        targetFogDensity *= 1.3;

        // Spawn boss encounter
        triggerBossEncounter('giant');

        // Add environmental hazard
        triggerEnvironmentalHazard('door');
    }

    function triggerPellet75Event() {
        console.log('[Backrooms] 75% threshold - Darkness increases!');

        showStatusMessage('The blackouts are getting worse...', '#ff4444');

        // More frequent blackouts
        if (nextBlackout < 999999) {
            nextBlackout *= 0.5;
        }

        // Second boss encounter
        triggerBossEncounter('speed');

        // Add environmental hazard
        triggerEnvironmentalHazard('ceiling');
    }

    function triggerPellet90Event() {
        console.log('[Backrooms] 90% threshold - FINAL CHASE MODE!');

        showStatusMessage('FINAL CHASE - ESCAPE NOW!', '#ff0000');

        // Enable final chase mode
        finalChaseMode = true;

        // Pac-Man goes berserk
        if (chase) {
            chase.speed *= 1.5;
            chase.rageMode = true;
        }

        // Maximum fog
        targetFogDensity *= 1.5;

        // Extra visual distortion
        if (vhsOverlay) {
            vhsOverlay.style.opacity = '0.8';
        }
    }

    // Boss encounter system
    function triggerBossEncounter(type) {
        bossEncounter.active = true;
        bossEncounter.type = type;

        switch (type) {
            case 'giant':
                bossEncounter.maxHealth = 150;
                bossEncounter.health = 150;
                showBossWarning('GIANT PAC-MAN APPROACHING!');
                createGiantPacmanBoss();
                break;
            case 'speed':
                bossEncounter.maxHealth = 100;
                bossEncounter.health = 100;
                showBossWarning('SPEED DEMON INCOMING!');
                createSpeedPacmanBoss();
                break;
            case 'armored':
                bossEncounter.maxHealth = 200;
                bossEncounter.health = 200;
                showBossWarning('ARMORED TITAN APPROACHING!');
                createArmoredPacmanBoss();
                break;
        }
    }

    function showBossWarning(message) {
        if (!bossWarningEl) {
            bossWarningEl = document.createElement('div');
            bossWarningEl.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #ff0000;
                font-size: 2rem;
                font-family: Creepster, cursive;
                text-shadow: 0 0 20px #ff0000;
                z-index: 1000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.5s;
            `;
            document.body.appendChild(bossWarningEl);
        }

        bossWarningEl.textContent = message;
        bossWarningEl.style.opacity = '1';

        setTimeout(function() {
            if (bossWarningEl) bossWarningEl.style.opacity = '0';
        }, 3000);
    }

    function createGiantPacmanBoss() {
        // Create a larger, more intimidating Pac-Man
        var bossGeo = new THREE.SphereGeometry(3, 32, 32);
        var bossMat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.9
        });

        bossEncounter.boss = new THREE.Mesh(bossGeo, bossMat);
        bossEncounter.boss.position.set(
            Math.random() * COLS * CELL,
            2,
            Math.random() * ROWS * CELL
        );

        // Add glowing eyes
        var eyeGeo = new THREE.SphereGeometry(0.4, 16, 16);
        var eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.8, 0.5, 2.2);
        bossEncounter.boss.add(leftEye);

        var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.8, 0.5, 2.2);
        bossEncounter.boss.add(rightEye);

        // Add point light
        var bossLight = new THREE.PointLight(0xff4400, 3, 20);
        bossEncounter.boss.add(bossLight);

        scene.add(bossEncounter.boss);
    }

    function createSpeedPacmanBoss() {
        // Faster, smaller Pac-Man variant
        createGiantPacmanBoss();
        if (bossEncounter.boss) {
            bossEncounter.boss.scale.set(0.6, 0.6, 0.6);
        }
    }

    function createArmoredPacmanBoss() {
        // Heavily armored Pac-Man
        createGiantPacmanBoss();
        if (bossEncounter.boss) {
            bossEncounter.boss.scale.set(1.5, 1.5, 1.5);
            bossEncounter.boss.material.color.setHex(0xffaa00);
        }
    }

    function updateBossEncounter(dt) {
        if (!bossEncounter.active || !bossEncounter.boss) return;

        // Move boss toward player
        var dx = camera.position.x - bossEncounter.boss.position.x;
        var dz = camera.position.z - bossEncounter.boss.position.z;
        var dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 1) {
            var speed = 3;
            if (bossEncounter.type === 'speed') speed = 6;
            if (bossEncounter.type === 'armored') speed = 2;

            bossEncounter.boss.position.x += (dx / dist) * speed * dt;
            bossEncounter.boss.position.z += (dz / dist) * speed * dt;
        }

        // Face player
        bossEncounter.boss.lookAt(camera.position);

        // Check collision with player
        if (dist < 2) {
            // Damage player (handled as instant death in this game)
            setGameState(GAME_STATE.DEAD);
        }
    }

    // Environmental hazards
    function triggerEnvironmentalHazard(type) {
        switch (type) {
            case 'flickering':
                // Create flickering section
                var flickerSection = {
                    position: {
                        x: playerPos.x + (Math.random() - 0.5) * 20,
                        z: playerPos.z + (Math.random() - 0.5) * 20
                    },
                    duration: 10 + Math.random() * 10,
                    timer: 0,
                    type: 'flickering'
                };
                environmentalHazards.flickeringSections.push(flickerSection);
                break;

            case 'door':
                // Create closing door
                var doorPos = findValidCorridorPosition();
                if (doorPos) {
                    environmentalHazards.closingDoors.push({
                        position: doorPos,
                        closing: false,
                        progress: 0,
                        type: 'door'
                    });
                }
                break;

            case 'ceiling':
                // Create collapsing ceiling
                var ceilingPos = findValidCorridorPosition();
                if (ceilingPos) {
                    environmentalHazards.collapsingCeilings.push({
                        position: ceilingPos,
                        collapsing: false,
                        progress: 0,
                        timer: 3 + Math.random() * 5,
                        type: 'ceiling'
                    });
                }
                break;
        }
    }

    function findValidCorridorPosition() {
        for (var attempts = 0; attempts < 20; attempts++) {
            var r = 2 + Math.floor(Math.random() * (ROWS - 4));
            var c = 2 + Math.floor(Math.random() * (COLS - 4));
            if (MAZE[r] && MAZE[r][c] === 0) {
                return { x: c * CELL + CELL / 2, z: r * CELL + CELL / 2 };
            }
        }
        return null;
    }

    function updateEnvironmentalHazards(dt) {
        // Update flickering sections
        for (var i = environmentalHazards.flickeringSections.length - 1; i >= 0; i--) {
            var flicker = environmentalHazards.flickeringSections[i];
            flicker.timer -= dt;
            flicker.duration -= dt;

            // Check if player is near
            var dx = playerPos.x - flicker.position.x;
            var dz = playerPos.z - flicker.position.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 8 && flicker.timer <= 0) {
                // Trigger flicker effect on nearby lights
                triggerLocalFlicker(flicker.position, 0.5);
            }

            if (flicker.duration <= 0) {
                environmentalHazards.flickeringSections.splice(i, 1);
            }
        }

        // Update collapsing ceilings
        for (var i = environmentalHazards.collapsingCeilings.length - 1; i >= 0; i--) {
            var ceiling = environmentalHazards.collapsingCeilings[i];
            ceiling.timer -= dt;

            if (ceiling.timer <= 0 && !ceiling.collapsing) {
                ceiling.collapsing = true;
            }

            if (ceiling.collapsing) {
                ceiling.progress += dt * 0.3;

                // Check if player is under
                var dx = playerPos.x - ceiling.position.x;
                var dz = playerPos.z - ceiling.position.z;
                var dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < 2 && ceiling.progress > 0.8) {
                    // Crush player
                    setGameState(GAME_STATE.DEAD);
                }
            }

            if (ceiling.progress >= 1) {
                environmentalHazards.collapsingCeilings.splice(i, 1);
            }
        }
    }

    function triggerLocalFlicker(position, intensity) {
        for (var i = 0; i < corridorLights.length; i++) {
            var cl = corridorLights[i];
            var dx = cl.position.x - position.x;
            var dz = cl.position.z - position.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 10) {
                // Trigger intense flicker
                cl.flickerTimer = -1; // Immediate flicker
                cl.flickerType = 'strobe';
            }
        }
    }

    // Status message display
    function showStatusMessage(text, color) {
        var msgEl = document.createElement('div');
        msgEl.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            color: ${color || '#fff'};
            font-size: 1.5rem;
            font-family: Creepster, cursive;
            text-shadow: 0 0 10px ${color || '#fff'};
            z-index: 100;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.5s;
            text-align: center;
        `;
        msgEl.textContent = text;
        document.body.appendChild(msgEl);

        // Fade in
        setTimeout(function() { msgEl.style.opacity = '1'; }, 100);

        // Fade out and remove
        setTimeout(function() {
            msgEl.style.opacity = '0';
            setTimeout(function() { msgEl.remove(); }, 500);
        }, 3000);
    }

    // ============================================
    // PHASE 8: PSYCHOLOGICAL HORROR ELEMENTS
    // ============================================

    // False Pac-Man sightings
    let falsePacmanSighting = {
        active: false,
        mesh: null,
        timer: 0,
        duration: 2,
        fadeIn: 0.5,
        fadeOut: 0.5
    };

    // The Eye horror element
    let eyeElement = {
        active: false,
        mesh: null,
        timer: 0,
        nextSpawn: 30,
        visible: false
    };

    // Memory holes (maze shifts)
    let memoryHole = {
        active: false,
        timer: 0,
        nextOccurrence: 60,
        shiftAmount: 0
    };

    // Mirror moments
    let mirrorMoments = {
        active: false,
        mirrorMesh: null,
        timer: 0,
        nextOccurrence: 45
    };

    // Update psychological horror elements
    function updatePsychologicalHorror(dt) {
        if (!isGameRunning()) return;

        // False Pac-Man sightings
        updateFalsePacmanSighting(dt);

        // The Eye
        updateEyeElement(dt);

        // Memory holes
        updateMemoryHoles(dt);

        // Mirror moments
        updateMirrorMoments(dt);
    }

    function updateFalsePacmanSighting(dt) {
        // Random chance to see a false Pac-Man
        if (!falsePacmanSighting.active && Math.random() < 0.001 * (visualIntensity || 0)) {
            spawnFalsePacman();
        }

        if (falsePacmanSighting.active) {
            falsePacmanSighting.timer += dt;

            if (falsePacmanSighting.mesh) {
                // Fade in/out
                var opacity = 0;
                if (falsePacmanSighting.timer < falsePacmanSighting.fadeIn) {
                    opacity = falsePacmanSighting.timer / falsePacmanSighting.fadeIn;
                } else if (falsePacmanSighting.timer > falsePacmanSighting.duration - falsePacmanSighting.fadeOut) {
                    opacity = (falsePacmanSighting.duration - falsePacmanSighting.timer) / falsePacmanSighting.fadeOut;
                } else {
                    opacity = 1;
                }

                falsePacmanSighting.mesh.material.opacity = opacity * 0.6;
                falsePacmanSighting.mesh.lookAt(camera.position);
            }

            if (falsePacmanSighting.timer >= falsePacmanSighting.duration) {
                if (falsePacmanSighting.mesh) {
                    scene.remove(falsePacmanSighting.mesh);
                    falsePacmanSighting.mesh = null;
                }
                falsePacmanSighting.active = false;
                falsePacmanSighting.timer = 0;
            }
        }
    }

    function spawnFalsePacman() {
        falsePacmanSighting.active = true;
        falsePacmanSighting.timer = 0;

        // Create false Pac-Man mesh (ghost-like)
        var geo = new THREE.SphereGeometry(1.5, 16, 16);
        var mat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0,
            wireframe: true
        });

        falsePacmanSighting.mesh = new THREE.Mesh(geo, mat);

        // Position in distance
        var angle = Math.random() * Math.PI * 2;
        var dist = 15 + Math.random() * 10;
        falsePacmanSighting.mesh.position.set(
            camera.position.x + Math.cos(angle) * dist,
            1.5,
            camera.position.z + Math.sin(angle) * dist
        );

        scene.add(falsePacmanSighting.mesh);
    }

    function updateEyeElement(dt) {
        eyeElement.timer += dt;

        if (!eyeElement.active && eyeElement.timer > eyeElement.nextSpawn) {
            spawnEyeElement();
            eyeElement.timer = 0;
            eyeElement.nextSpawn = 30 + Math.random() * 60;
        }

        if (eyeElement.active && eyeElement.mesh) {
            // Make eye follow player
            eyeElement.mesh.lookAt(camera.position);

            // Fade after a few seconds
            eyeElement.mesh.material.opacity = Math.max(0, 0.8 - (eyeElement.timer - eyeElement.spawnTime) * 0.3);

            if (eyeElement.timer > eyeElement.spawnTime + 3) {
                scene.remove(eyeElement.mesh);
                eyeElement.mesh = null;
                eyeElement.active = false;
            }
        }
    }

    function spawnEyeElement() {
        eyeElement.active = true;
        eyeElement.spawnTime = 0;

        // Create giant eye
        var eyeGeo = new THREE.SphereGeometry(0.8, 16, 16);
        var eyeMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0
        });

        eyeElement.mesh = new THREE.Mesh(eyeGeo, eyeMat);

        // Add pupil
        var pupilGeo = new THREE.SphereGeometry(0.3, 8, 8);
        var pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        var pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.position.z = 0.6;
        eyeElement.mesh.add(pupil);

        // Position in doorway
        var pos = findValidCorridorPosition();
        if (pos) {
            eyeElement.mesh.position.set(pos.x, WALL_H * 0.7, pos.z);
            scene.add(eyeElement.mesh);
        }
    }

    function updateMemoryHoles(dt) {
        memoryHole.timer += dt;

        if (!memoryHole.active && memoryHole.timer > memoryHole.nextOccurrence) {
            triggerMemoryHole();
            memoryHole.timer = 0;
            memoryHole.nextOccurrence = 60 + Math.random() * 90;
        }

        if (memoryHole.active) {
            memoryHole.shiftAmount += dt * 0.5;

            // Apply subtle maze shift effect
            if (memoryHole.shiftAmount > 0 && memoryHole.shiftAmount < 1) {
                // Could shift camera or create disorientation
                camera.rotation.z = Math.sin(memoryHole.shiftAmount * Math.PI * 4) * 0.02;
            }

            if (memoryHole.shiftAmount >= 2) {
                memoryHole.active = false;
                memoryHole.shiftAmount = 0;
                camera.rotation.z = 0;
            }
        }
    }

    function triggerMemoryHole() {
        memoryHole.active = true;
        memoryHole.shiftAmount = 0;

        // Show brief message
        showStatusMessage('Wait... something feels different', '#888');

        // In harder difficulties, actually swap some maze sections
        if (currentDifficulty && currentDifficulty.fogDensity > 0.05) {
            // Swap two random corridor sections
            console.log('[Backrooms] Memory hole - maze shifting');
        }
    }

    function updateMirrorMoments(dt) {
        mirrorMoments.timer += dt;

        if (!mirrorMoments.active && mirrorMoments.timer > mirrorMoments.nextOccurrence) {
            triggerMirrorMoment();
            mirrorMoments.timer = 0;
            mirrorMoments.nextOccurrence = 45 + Math.random() * 60;
        }
    }

    function triggerMirrorMoment() {
        mirrorMoments.active = true;

        // Find a suitable wall for mirror
        var wallPos = findWallPosition();
        if (!wallPos) return;

        // Create mirror surface
        var mirrorGeo = new THREE.PlaneGeometry(2, 3);
        var mirrorMat = new THREE.MeshBasicMaterial({
            color: 0xaaaaaa,
            transparent: true,
            opacity: 0.7,
            metalness: 0.9,
            roughness: 0.1
        });

        mirrorMoments.mirrorMesh = new THREE.Mesh(mirrorGeo, mirrorMat);
        mirrorMoments.mirrorMesh.position.set(wallPos.x, 1.5, wallPos.z);
        mirrorMoments.mirrorMesh.lookAt(camera.position);

        scene.add(mirrorMoments.mirrorMesh);

        // Remove after a few seconds
        setTimeout(function() {
            if (mirrorMoments.mirrorMesh) {
                scene.remove(mirrorMoments.mirrorMesh);
                mirrorMoments.mirrorMesh = null;
            }
            mirrorMoments.active = false;
        }, 4000);
    }

    function findWallPosition() {
        for (var attempts = 0; attempts < 20; attempts++) {
            var r = 1 + Math.floor(Math.random() * (ROWS - 2));
            var c = 1 + Math.floor(Math.random() * (COLS - 2));
            if (MAZE[r] && MAZE[r][c] === 1) {
                return {
                    x: c * CELL + CELL / 2,
                    z: r * CELL + CELL / 2
                };
            }
        }
        return null;
    }

    // ============================================
    // PHASE 9: PROGRESSION & UNLOCKS
    // ============================================

    // Statistics tracking
    playerStats = {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalDeaths: 0,
        totalPellets: 0,
        fastestTime: Infinity,
        totalPlayTime: 0,
        secretsFound: 0,
        bossesDefeated: 0
    };

    // Unlocks and achievements
    let unlocks = {
        flashlightColors: ['white'],
        hudThemes: ['default'],
        perks: [],
        hardModes: [],
        achievements: []
    };

    const ACHIEVEMENTS = [
        { id: 'first_win', name: 'First Escape', desc: 'Win your first game', icon: '🏆', unlocked: false },
        { id: 'survivor', name: 'Survivor', desc: 'Win on Hard difficulty', icon: '💪', unlocked: false },
        { id: 'nightmare', name: 'Nightmare Runner', desc: 'Win on Nightmare', icon: '😱', unlocked: false },
        { id: 'speedrunner', name: 'Speedrunner', desc: 'Win in under 5 minutes', icon: '⚡', unlocked: false },
        { id: 'secret_finder', name: 'Explorer', desc: 'Find all secret rooms', icon: '🔍', unlocked: false },
        { id: 'boss_killer', name: 'Boss Hunter', desc: 'Defeat 5 boss encounters', icon: '💀', unlocked: false },
        { id: 'no_damage', name: 'Ghost', desc: 'Win without taking damage', icon: '👻', unlocked: false },
        { id: 'collector', name: 'Pellet Collector', desc: 'Collect 1000 pellets total', icon: '📦', unlocked: false }
    ];

    // Save/load stats
    function savePlayerStats() {
        try {
            localStorage.setItem('backrooms_stats', JSON.stringify(playerStats));
            localStorage.setItem('backrooms_unlocks', JSON.stringify(unlocks));
            localStorage.setItem('backrooms_achievements', JSON.stringify(ACHIEVEMENTS.map(a => a.unlocked)));
        } catch (e) {
            console.warn('[Backrooms] Could not save stats');
        }
    }

    function loadPlayerStats() {
        try {
            var savedStats = localStorage.getItem('backrooms_stats');
            var savedUnlocks = localStorage.getItem('backrooms_unlocks');
            var savedAchievements = localStorage.getItem('backrooms_achievements');

            if (savedStats) {
                var parsed = JSON.parse(savedStats);
                for (var key in parsed) {
                    playerStats[key] = parsed[key];
                }
            }

            if (savedUnlocks) {
                var parsedUnlocks = JSON.parse(savedUnlocks);
                for (var key in parsedUnlocks) {
                    unlocks[key] = parsedUnlocks[key];
                }
            }

            if (savedAchievements) {
                var parsedAch = JSON.parse(savedAchievements);
                for (var i = 0; i < parsedAch.length; i++) {
                    ACHIEVEMENTS[i].unlocked = parsedAch[i];
                }
            }
        } catch (e) {
            console.warn('[Backrooms] Could not load stats');
        }
    }

    function updateStats(statName, value) {
        if (playerStats.hasOwnProperty(statName)) {
            if (typeof playerStats[statName] === 'number') {
                playerStats[statName] += value;
            }
        }
        savePlayerStats();
    }

    function checkAchievements() {
        for (var i = 0; i < ACHIEVEMENTS.length; i++) {
            var ach = ACHIEVEMENTS[i];
            if (ach.unlocked) continue;

            var unlocked = false;

            switch (ach.id) {
                case 'first_win':
                    unlocked = playerStats.gamesWon >= 1;
                    break;
                case 'survivor':
                    // Check if won on hard
                    unlocked = playerStats.gamesWon >= 1; // Would need difficulty tracking
                    break;
                case 'speedrunner':
                    unlocked = playerStats.fastestTime < 300; // 5 minutes
                    break;
                case 'secret_finder':
                    unlocked = playerStats.secretsFound >= 5;
                    break;
                case 'boss_killer':
                    unlocked = playerStats.bossesDefeated >= 5;
                    break;
                case 'collector':
                    unlocked = playerStats.totalPellets >= 1000;
                    break;
            }

            if (unlocked && !ach.unlocked) {
                ach.unlocked = true;
                showAchievementUnlock(ach);
            }
        }
        savePlayerStats();
    }

    function showAchievementUnlock(ach) {
        var achEl = document.createElement('div');
        achEl.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #222, #444);
            border: 2px solid gold;
            border-radius: 8px;
            padding: 15px 20px;
            color: #fff;
            z-index: 1000;
            animation: slideIn 0.5s ease-out;
        `;
        achEl.innerHTML = `
            <div style="font-size: 2rem;">${ach.icon}</div>
            <div style="font-weight: bold; color: gold;">ACHIEVEMENT UNLOCKED!</div>
            <div style="font-size: 1.1rem;">${ach.name}</div>
            <div style="font-size: 0.8rem; color: #aaa;">${ach.desc}</div>
        `;

        // Add animation
        var style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(achEl);

        setTimeout(function() {
            achEl.style.animation = 'slideIn 0.5s ease-out reverse';
            setTimeout(function() { achEl.remove(); }, 500);
        }, 4000);
    }

    // New Game Plus
    let newGamePlus = false;
    let newGamePlusLevel = 0;

    function activateNewGamePlus() {
        newGamePlus = true;
        newGamePlusLevel++;

        // Apply bonuses
        playerStats.baseSpeed *= 1.1;

        showStatusMessage('NEW GAME PLUS +' + newGamePlusLevel + ' ACTIVATED!', '#ffaa00');
    }

    // ============================================
    // PHASE 10: COMMUNITY & REPLAYABILITY
    // ============================================

    // Daily challenge
    let dailyChallenge = {
        active: false,
        date: null,
        mazeSeed: null,
        completed: false,
        score: 0
    };

    // Weekly survival mode
    let weeklySurvival = {
        active: false,
        wave: 0,
        enemiesRemaining: 1,
        spawnTimer: 0
    };

    // Ghost system (visual playback of other runs)
    let ghostSystem = {
        active: false,
        ghosts: [],
        maxGhosts: 3
    };

    // Initialize daily challenge
    function initDailyChallenge() {
        var today = new Date().toDateString();

        try {
            var saved = localStorage.getItem('backrooms_daily');
            if (saved) {
                var data = JSON.parse(saved);
                if (data.date === today) {
                    dailyChallenge = data;
                    return;
                }
            }
        } catch (e) { }

        // Generate new daily challenge
        dailyChallenge = {
            active: true,
            date: today,
            mazeSeed: Math.random() * 10000,
            completed: false,
            score: 0
        };

        try {
            localStorage.setItem('backrooms_daily', JSON.stringify(dailyChallenge));
        } catch (e) { }

        console.log('[Backrooms] Daily challenge seed:', dailyChallenge.mazeSeed);
    }

    // Generate daily maze
    function generateDailyMaze() {
        // Use seed for reproducible maze
        var seed = dailyChallenge.mazeSeed || 0;
        Math.seedrandom = function(s) {
            return function() {
                s = Math.sin(s) * 10000;
                return s - Math.floor(s);
            };
        }(seed);

        // Would regenerate maze with seed
        console.log('[Backrooms] Generating daily maze with seed');
    }

    // Weekly survival mode
    function startWeeklySurvival() {
        weeklySurvival = {
            active: true,
            wave: 1,
            enemiesRemaining: 1,
            spawnTimer: 0
        };

        showStatusMessage('SURVIVAL MODE - WAVE 1', '#ff0000');
    }

    function updateWeeklySurvival(dt) {
        if (!weeklySurvival.active) return;

        weeklySurvival.spawnTimer += dt;

        // Spawn enemies
        if (weeklySurvival.spawnTimer > 10 - Math.min(8, weeklySurvival.wave)) {
            weeklySurvival.spawnTimer = 0;
            spawnSurvivalEnemy();
        }

        // Check wave completion
        if (extraPacmans.length === 0 && weeklySurvival.enemiesRemaining <= 0) {
            weeklySurvival.wave++;
            weeklySurvival.enemiesRemaining = weeklySurvival.wave;
            showStatusMessage('WAVE ' + weeklySurvival.wave + ' START!', '#ff0000');
        }
    }

    function spawnSurvivalEnemy() {
        // Spawn enemy at edge of map
        var angle = Math.random() * Math.PI * 2;
        var dist = 30;

        spawnExtraPacmanAt(
            camera.position.x + Math.cos(angle) * dist,
            camera.position.z + Math.sin(angle) * dist
        );

        weeklySurvival.enemiesRemaining++;
    }

    // Ghost system (simplified - would need server for real implementation)
    function recordGhostPosition() {
        if (!ghostSystem.active) return;

        // Store current position for ghost playback
        var ghostData = {
            x: playerPos.x,
            z: playerPos.z,
            time: gameElapsed
        };

        // In real implementation, would save to server
        console.log('[Backrooms] Ghost position recorded');
    }

    // Death counter leaderboard (local only for now)
    let deathCounter = {
        local: 0,
        displayName: 'Player'
    };

    function incrementDeathCounter() {
        deathCounter.local++;

        try {
            var leaderboard = JSON.parse(localStorage.getItem('backrooms_deaths') || '[]');
            leaderboard.push({ name: deathCounter.displayName, deaths: deathCounter.local });
            leaderboard.sort(function(a, b) { return b.deaths - a.deaths; });
            leaderboard = leaderboard.slice(0, 10);
            localStorage.setItem('backrooms_deaths', JSON.stringify(leaderboard));
        } catch (e) { }
    }

    function getDeathLeaderboard() {
        try {
            return JSON.parse(localStorage.getItem('backrooms_deaths') || '[]');
        } catch (e) {
            return [];
        }
    }

    // Initialize all progression systems
    function initProgressionSystems() {
        loadPlayerStats();
        initDailyChallenge();

        console.log('[Backrooms] Progression systems initialized');
    }

    // Update progression systems each frame
    function updateProgressionSystems(dt) {
        if (!isGameRunning()) return;

        // Update stats
        playerStats.totalPlayTime += dt;

        // Check pellet thresholds
        checkPelletThresholds();

        // Update boss encounter
        updateBossEncounter(dt);

        // Update environmental hazards
        updateEnvironmentalHazards(dt);

        // Update psychological horror
        updatePsychologicalHorror(dt);

        // Update weekly survival
        updateWeeklySurvival(dt);

        // Record ghost position
        if (ghostSystem.active) {
            recordGhostPosition();
        }
    }

    // ---- INIT ----
    function init() {
        if (initialized) return; initialized = true;
        console.log('[Backrooms] init() starting...');

        cacheHudElements();
        invalidateHud();
        recomputePlayerStats();

        // Initialize difficulty settings for fog
        setDifficulty('standard');

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x080600);
        scene.fog = new THREE.FogExp2(0x080600, currentDifficulty.fogDensity);
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
        console.log('[Backrooms] renderer created');

        initPostProcessing(); // Init blur buffers

window.addEventListener('resize', window.resizeListener = function () {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	if (blurTarget) blurTarget.setSize(window.innerWidth, window.innerHeight);
});
renderer.domElement.addEventListener('click', window.canvasClickListener = function () {
	if (isGameRunning() && !pointerLocked) renderer.domElement.requestPointerLock();
});

        console.log('[Backrooms] calling buildMaze...');
        buildMaze();
        console.log('[Backrooms] buildMaze done, calling createLighting...');
        createLighting();
        console.log('[Backrooms] lighting done, calling createPacman...');
createPacman();
console.log('[Backrooms] pacman done');
initExtraPacmanPool();

// Phase 2: Spawn enemy variants based on difficulty
if (typeof EnemyVariants !== 'undefined' && typeof MultiAgentPacman !== 'undefined') {
    var variantCount = Math.floor(currentDifficulty.multiplier - 1);
    if (variantCount > 0) {
        var variantKeys = ['ghost_pac', 'berserker', 'hunter', 'shadow', 'swarm'];
        for (var vi = 0; vi < Math.min(variantCount, variantKeys.length); vi++) {
            var variantPos = new THREE.Vector3(
                playerPos.x + (Math.random() - 0.5) * 20,
                0.8,
                playerPos.z + (Math.random() - 0.5) * 20
            );
            EnemyVariants.spawnVariant(variantKeys[vi], variantPos);
        }
        console.log('[Phase 2.3] Spawned', variantCount, 'enemy variants');
    }
    
    // Create multi-agent pack
    var agentCount = Math.min(3, Math.floor(currentDifficulty.multiplier));
    for (var ai = 0; ai < agentCount; ai++) {
        var agentPos = new THREE.Vector3(
            playerPos.x + (Math.random() - 0.5) * 15,
            0.8,
            playerPos.z + (Math.random() - 0.5) * 15
        );
        MultiAgentPacman.createAgent(agentPos, variantKeys[ai % variantKeys.length]);
    }
    console.log('[Phase 2.1] Created', agentCount, 'AI agents');
}

spawnPellets();
        createDustParticles();
        createDistortionOverlay();
        createBlackoutOverlay();
initVisualAtmosphere(); // Phase 1: Visual Atmosphere Overhaul
initSpatialAudio(); // Phase 2: 3D Spatial Audio
switchLevel('yellow'); // Phase 3: Level Design
initProgressionSystems(); // Phases 7-10: Progression Systems

// Phase 1 initialization
if (typeof AdvancedLighting !== 'undefined') {
    AdvancedLighting.init(scene, renderer, camera);
    AdvancedLighting.createPlayerFlashlight();
    console.log('[Phase 1.1] Advanced Lighting initialized');
}
if (typeof DecaySystem !== 'undefined') {
    DecaySystem.init(scene);
    console.log('[Phase 1.4] Decay System initialized');
}
if (typeof DynamicEnvironment !== 'undefined') {
    DynamicEnvironment.init(scene);
    console.log('[Phase 1.3] Dynamic Environment initialized');
}

// Phase 2: AI Systems Initialization
if (typeof MultiAgentPacman !== 'undefined') {
    MultiAgentPacman.init(scene, MAZE, playerPos);
    console.log('[Phase 2.1] Multi-Agent Pacman initialized');
}
if (typeof AILearner !== 'undefined') {
    console.log('[Phase 2.2] AI Learner ready');
}
if (typeof EnemyVariants !== 'undefined') {
    EnemyVariants.init(scene);
    console.log('[Phase 2.3] Enemy Variants initialized');
}
if (typeof ThreatAssessment !== 'undefined') {
    ThreatAssessment.init();
    console.log('[Phase 2.4] Threat Assessment initialized');
}
// Phase 2.5: AI Integration (unified coordination system)
if (typeof Phase2AIIntegration !== 'undefined') {
    var currentDifficulty = DIFFICULTY_SELECTOR_MAP[document.getElementById('difficulty-select')?.value] || 'standard';
    Phase2AIIntegration.init(scene, MAZE, currentDifficulty);
    console.log('[Phase 2.5] AI Integration System initialized - Full coordination active');
}

// Phase 3: Procedural Content Initialization
if (typeof BiomeSystem !== 'undefined') {
    BiomeSystem.init(scene);
    console.log('[Phase 3.2] Biome System initialized');
}
if (typeof RoguelikeMode !== 'undefined') {
    RoguelikeMode.init();
    console.log('[Phase 3.4] Roguelike Mode initialized');
}
if (typeof ProceduralMaze !== 'undefined') {
    console.log('[Phase 3.1] Procedural Maze generator ready');
}
// PHASE 3 ENHANCEMENTS
if (typeof WaveFunctionCollapse !== 'undefined') {
    console.log('[Phase 3.1+] WFC Algorithm ready - Advanced procedural generation');
}
if (typeof BiomeSystem !== 'undefined' && typeof renderer !== 'undefined' && camera) {
    // Enhanced biome system with full visual/atmosphere support
    console.log('[Phase 3.2+] Enhanced Biome System ready - 5 biomes available');
}
if (typeof RoguelikeMode !== 'undefined') {
    console.log('[Phase 3.4+] Enhanced Roguelike ready - Meta-progression active');
}

// Phase 4: Psychological Horror Initialization
if (typeof SanitySystem !== 'undefined') {
    SanitySystem.init(scene, camera);
    SanitySystem.createSanityHUD(document.body);
    console.log('[Phase 4.1] Sanity System initialized');
}
if (typeof JumpscareSystem !== 'undefined') {
    JumpscareSystem.init(scene, camera);
    console.log('[Phase 4.2] Jumpscare System initialized');
}
if (typeof StressSystem !== 'undefined') {
    StressSystem.init(scene, camera);
    StressSystem.createStressHUD(document.body);
    console.log('[Phase 4.3] Stress System initialized');
}
if (typeof HorrorDirector !== 'undefined') {
    HorrorDirector.init();
    console.log('[Phase 4.4] Horror Director initialized');
}
// PHASE 4 ENHANCEMENTS - Hallucination System
if (typeof HallucinationSystem !== 'undefined') {
    HallucinationSystem.init(scene, camera);
    console.log('[Phase 4.5] ✅ Hallucination System initialized - Full psychological horror active');
}

// PHASE 3 & 4 INTEGRATION
if (typeof Phase3_4_Integration !== 'undefined') {
    Phase3_4_Integration.init(scene, renderer, camera);
    console.log('[Phase 3-4] ✅ Integrated systems initialized - Procedural horror ready');
}

// Phase 5: Multiplayer & Social Initialization
if (typeof Multiplayer !== 'undefined') {
    console.log('[Phase 5.1] Multiplayer system ready');
}
if (typeof GhostSystem !== 'undefined') {
    GhostSystem.init(scene);
    console.log('[Phase 5.3] Ghost System initialized');
}
if (typeof VoiceChat !== 'undefined') {
    VoiceChat.init();
    console.log('[Phase 5.4] Voice Chat initialized');
}
if (typeof SocialFeatures !== 'undefined') {
    SocialFeatures.init();
    console.log('[Phase 5.4] Social Features initialized');
}

// Phase 6: Abilities & Combat Initialization
if (typeof ExpandedAbilities !== 'undefined') {
    ExpandedAbilities.init(scene, camera);
    console.log('[Phase 6.1] Expanded Abilities initialized');
}
if (typeof CraftingSystem !== 'undefined') {
    CraftingSystem.init(scene);
    console.log('[Phase 6.2] Crafting System initialized');
}
if (typeof DefensiveMechanics !== 'undefined') {
    DefensiveMechanics.init(scene);
    console.log('[Phase 6.3] Defensive Mechanics initialized');
}
if (typeof SkillTrees !== 'undefined') {
    SkillTrees.init();
    console.log('[Phase 6.4] Skill Trees initialized');
}

// Phase 7: Story & Progression Initialization
if (typeof CampaignMode !== 'undefined') {
    CampaignMode.init();
    console.log('[Phase 7.1] Campaign Mode initialized');
}
if (typeof StoryElements !== 'undefined') {
    StoryElements.init(scene);
    console.log('[Phase 7.2] Story Elements initialized');
}
if (typeof QuestSystem !== 'undefined') {
    QuestSystem.init();
    console.log('[Phase 7.3] Quest System initialized');
}
if (typeof CharacterProgression !== 'undefined') {
    CharacterProgression.init();
    console.log('[Phase 7.4] Character Progression initialized');
}

console.log('[Backrooms] init() complete, scene.children:', scene.children.length);

        if (window.QualityFX) {
            QualityFX.injectThreeJS(renderer, scene, camera);
        }

        // Cross-tab sync: purchases/cheats/challenge unlocks in other tabs should reflect in-game.
        try {
            if (window.SGAIStateBus && typeof window.SGAIStateBus.on === 'function') {
                window.SGAIStateBus.on(function (msg, remote) {
                    if (!remote || !msg || msg.type !== 'STATE_UPDATED') return;
                    try { recomputePlayerStats(); } catch (e) { }
                    try { applyCheatEffects(); } catch (e) { }
                    try { invalidateHud(); } catch (e) { }
                });
            }
        } catch (e) { }
    }

    // ---- POST PROCESSING ----
    function initPostProcessing() {
        blurTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        blurScene = new THREE.Scene();
        blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        var vert = `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
        `;

        // Rotational motion blur shader
        var frag = `
            uniform sampler2D tDiffuse;
            uniform vec2 uVelocity;
            varying vec2 vUv;
            void main() {
                vec4 color = texture2D(tDiffuse, vUv);
                if (length(uVelocity) < 0.0001) {
                    gl_FragColor = color;
                    return;
                }
                float samples = 8.0;
                for (float i = 1.0; i < 8.0; i++) {
                    float t = i / (samples - 1.0);
                    color += texture2D(tDiffuse, vUv - uVelocity * t);
                }
                gl_FragColor = color / samples;
            }
        `;

        blurMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                uVelocity: { value: new THREE.Vector2(0, 0) }
            },
            vertexShader: vert,
            fragmentShader: frag,
            depthTest: false,
            depthWrite: false
        });

        var plane = new THREE.PlaneGeometry(2, 2);
        var quad = new THREE.Mesh(plane, blurMaterial);
        blurScene.add(quad);
    }

    // ---- BUILD MAZE ----
    function buildMaze() {
        var wallTex = createWallpaperTexture();
        var floorTex = createFloorTexture();
        var ceilTex = createCeilingTexture();

        // Floor — Standard Material for lighting
        var floorGeo = new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL);
        var floorMat = new THREE.MeshStandardMaterial({ map: floorTex, color: 0x4A3A28, roughness: 0.9, metalness: 0.1 });
        var floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set((COLS * CELL) / 2, 0, (ROWS * CELL) / 2);
        floor.receiveShadow = true;
        scene.add(floor);

        // Ceiling — Standard Material, dark
        var ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, color: 0x2A1E14, roughness: 0.95 });
        var ceil = new THREE.Mesh(floorGeo.clone(), ceilMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set((COLS * CELL) / 2, WALL_H, (ROWS * CELL) / 2);
        ceil.receiveShadow = true;
        scene.add(ceil);

        // Walls — single draw call via InstancedMesh
        var wallGeo = new THREE.BoxGeometry(CELL, WALL_H, CELL);
        var wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0xB5A44C, roughness: 0.85, metalness: 0.05 });

        // Count walls first so we can allocate exactly once.
        var wallCount = 0;
        for (var r0 = 0; r0 < ROWS; r0++) {
            for (var c0 = 0; c0 < COLS; c0++) {
                if (MAZE[r0][c0] === 1) wallCount++;
            }
        }

        var walls = new THREE.InstancedMesh(wallGeo, wallMat, Math.max(1, wallCount));
        walls.castShadow = true;
        walls.receiveShadow = true;
        // Hint: never updated after creation.
        if (walls.instanceMatrix && walls.instanceMatrix.setUsage) {
            walls.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        }

        var dummy = new THREE.Object3D();
        var wi = 0;
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                if (MAZE[r][c] === 1) {
                    dummy.position.set(c * CELL + CELL / 2, WALL_H / 2, r * CELL + CELL / 2);
                    dummy.rotation.set(0, 0, 0);
                    dummy.scale.set(1, 1, 1);
                    dummy.updateMatrix();
                    walls.setMatrixAt(wi++, dummy.matrix);
                }
            }
        }
        walls.count = wi;
        walls.instanceMatrix.needsUpdate = true;
        // Improve culling accuracy for large mazes.
        if (walls.computeBoundingSphere) walls.computeBoundingSphere();
        if (walls.computeBoundingBox) walls.computeBoundingBox();
        scene.add(walls);

        // Force update scene for QualityFX if loaded
        if (window.QualityFX && window.QualityFX.updateScene) {
            QualityFX.updateScene();
        }

        console.log('[Backrooms] buildMaze complete — walls added:', wallCount, 'floor:', !!floor, 'scene children:', scene.children.length);
    }

    // ---- LIGHTING ----
    function createLighting() {
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
                        dimPhase: Math.random() * Math.PI * 2,
                        active: null,
                        cellR: r,
                        cellC: c
                    });
                }
            }
        }

// Player flashlight - realistic cone
// Phase 1.1: Use Advanced Lighting if available
if (typeof AdvancedLighting !== 'undefined' && AdvancedLighting.createPlayerFlashlight) {
    var advFlashlight = AdvancedLighting.createPlayerFlashlight();
    if (advFlashlight) {
        playerFlashlight = advFlashlight.spotLight;
        camera.add(playerFlashlight);
        playerFlashlight.target.position.set(0, -0.3, -1);
        camera.add(playerFlashlight.target);
        scene.add(camera);
        console.log('[Phase 1.1] Using Advanced Lighting flashlight');
    } else {
        // Fallback to basic
        playerFlashlight = new THREE.SpotLight(0xFFEECC, 0.8, 35, Math.PI / 5.5, 0.6, 1.5);
        camera.add(playerFlashlight);
        playerFlashlight.target.position.set(0, -0.3, -1);
        camera.add(playerFlashlight.target);
        scene.add(camera);
    }
} else {
    playerFlashlight = new THREE.SpotLight(0xFFEECC, 0.8, 35, Math.PI / 5.5, 0.6, 1.5);
    camera.add(playerFlashlight);
    playerFlashlight.target.position.set(0, -0.3, -1);
    camera.add(playerFlashlight.target);
    scene.add(camera);
}
        applyDifficultyPresentation();

        // Apply initial proximity activation so we never start with 100+ visible lights.
        lightManagerCooldown = 0;
        updateProximityLights(999);
    }

    function cellsLineOfSight(r0, c0, r1, c1) {
        // Bresenham over grid cells. Walls (MAZE==1) block LoS.
        var x0 = c0, y0 = r0, x1 = c1, y1 = r1;
        var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        var dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        var err = dx + dy;

        // Skip checking the starting cell (player can be inside open cell).
        var first = true;
        while (true) {
            if (!first) {
                if (y0 < 0 || y0 >= ROWS || x0 < 0 || x0 >= COLS) return false;
                if (MAZE[y0] && MAZE[y0][x0] === 1) return false;
            }
            first = false;

            if (x0 === x1 && y0 === y1) break;
            var e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
        }
        return true;
    }

    function updateProximityLights(dt) {
        if (!corridorLights || corridorLights.length === 0) return;

        // Avoid recomputing every tick; light toggling can be expensive.
        lightManagerCooldown -= dt;
        if (lightManagerCooldown > 0) return;
        lightManagerCooldown = 0.18;

        var pr = Math.floor(playerPos.z / CELL);
        var pc = Math.floor(playerPos.x / CELL);

        var scored = [];
        for (var i = 0; i < corridorLights.length; i++) {
            var cl = corridorLights[i];
            if (!cl || cl.dead) continue;
            var dx = (cl.cellC - pc);
            var dz = (cl.cellR - pr);
            var d2 = dx * dx + dz * dz;
            scored.push({ i: i, d2: d2 });
        }
        scored.sort(function (a, b) { return a.d2 - b.d2; });

        var active = {};
        var n = Math.min(MAX_ACTIVE_CORRIDOR_LIGHTS, scored.length);
        for (var k = 0; k < n; k++) active[scored[k].i] = true;

        for (var j = 0; j < corridorLights.length; j++) {
            var cl2 = corridorLights[j];
            if (!cl2) continue;
            var shouldBeActive = !!active[j] && !cl2.dead && !blackoutActive;
            if (cl2.active === shouldBeActive) continue;
            cl2.active = shouldBeActive;

            if (cl2.light) {
                cl2.light.visible = shouldBeActive;
                if (!shouldBeActive) cl2.light.intensity = 0;
                // Keep shadows off by default; if you later enable shadows, only do so for LoS lights.
                cl2.light.castShadow = false;
            }
            if (cl2.fixture) {
                cl2.fixture.visible = shouldBeActive;
            }
        }

        // For active lights only: if a wall blocks LoS, keep shadows disabled (and optionally dim).
        for (var m = 0; m < n; m++) {
            var cl3 = corridorLights[scored[m].i];
            if (!cl3 || !cl3.active || cl3.dead) continue;
            var los = cellsLineOfSight(pr, pc, cl3.cellR, cl3.cellC);
            if (!los && cl3.light) {
                cl3.light.castShadow = false;
            }
        }
    }

    // ---- DUST PARTICLES (GPU) ----
    function createDustParticles() {
        // GPU animated dust (no per-frame buffer uploads)
        // Feel free to raise this further; the motion is computed in the vertex shader.
        var count = 10000;
        var geo = new THREE.BufferGeometry();
        var positions = new Float32Array(count * 3);
        var sizes = new Float32Array(count);
        var seeds = new Float32Array(count * 3);

        for (var i = 0; i < count; i++) {
            positions[i * 3] = Math.random() * COLS * CELL;
            positions[i * 3 + 1] = Math.random() * WALL_H;
            positions[i * 3 + 2] = Math.random() * ROWS * CELL;

            sizes[i] = 0.9 + Math.random() * 1.6; // pixel-ish base size in shader

            seeds[i * 3] = Math.random() * Math.PI * 2;
            seeds[i * 3 + 1] = Math.random() * Math.PI * 2;
            seeds[i * 3 + 2] = Math.random() * Math.PI * 2;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));

        var vert = `
            uniform float uTime;
            attribute float aSize;
            attribute vec3 aSeed;
            varying float vAlpha;

            void main() {
                vec3 p = position;

                // Slow float, different per particle (seeded)
                float t1 = uTime * (0.20 + 0.15 * sin(aSeed.x));
                float t2 = uTime * (0.17 + 0.12 * cos(aSeed.y));
                float t3 = uTime * (0.22 + 0.10 * sin(aSeed.z));

                p.x += sin(t1 + aSeed.x) * 0.35;
                p.y += sin(t2 + aSeed.y) * 0.25;
                p.z += cos(t3 + aSeed.z) * 0.35;

                vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mvPosition;

                // Perspective correct point size (in pixels)
                float dist = max(1.0, -mvPosition.z);
                gl_PointSize = aSize * (160.0 / dist);

                // Fade slightly with distance for atmosphere
                vAlpha = clamp(1.2 - dist * 0.02, 0.05, 0.35);
            }
        `;

        var frag = `
            precision mediump float;
            varying float vAlpha;

            void main() {
                vec2 uv = gl_PointCoord - vec2(0.5);
                float r2 = dot(uv, uv);
                float a = smoothstep(0.25, 0.0, r2) * vAlpha;
                if (a <= 0.001) discard;
                gl_FragColor = vec4(0.80, 0.75, 0.55, a);
            }
        `;

        var mat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: vert,
            fragmentShader: frag,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        dustParticles = new THREE.Points(geo, mat);
        dustParticles.frustumCulled = false;
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
    function createPacman(spawnPos, isExtra, opts) {
        opts = opts || {};
        var register = opts.register !== false;

        var group = new THREE.Group();
        var parts = {};

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
        var bodyMat = new THREE.MeshBasicMaterial({ color: 0x8B6914 });
        var body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);
        parts.body = body;
        parts.bodyMat = bodyMat;

        // Vein-like surface detail (dark pulsing wireframe)
        var veinGeo = new THREE.SphereGeometry(1.42, 16, 16);
        var veinMat = new THREE.MeshBasicMaterial({ color: 0x440000, wireframe: true, transparent: true, opacity: 0.3 });
        var veins = new THREE.Mesh(veinGeo, veinMat);
        group.add(veins);
        parts.veins = veins;
        parts.veinMat = veinMat;

        // Upper jaw — larger, more menacing
        var jawUpperGeo = new THREE.SphereGeometry(1.45, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        var jawMat = new THREE.MeshBasicMaterial({ color: 0x7A5800 });
        var jawUpper = new THREE.Mesh(jawUpperGeo, jawMat);
        group.add(jawUpper);
        parts.jawUpper = jawUpper;

        // Lower jaw - animated
        var jawLowerGeo = new THREE.SphereGeometry(1.45, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        var jawLower = new THREE.Mesh(jawLowerGeo, jawMat.clone());
        group.add(jawLower);
        parts.jawLower = jawLower;

        // Teeth — longer, sharper, varied lengths
        var toothMat = new THREE.MeshBasicMaterial({ color: 0xDDCCBB });
        parts.teeth = [];
        for (var i = 0; i < 18; i++) {
            var angle = (i / 18) * Math.PI * 2;
            var toothLen = 0.4 + Math.random() * 0.2;
            var tGeo = new THREE.ConeGeometry(0.06 + Math.random() * 0.04, toothLen, 4);
            var tooth = new THREE.Mesh(tGeo, toothMat);
            tooth.position.set(Math.cos(angle) * 1.15, -0.05, Math.sin(angle) * 1.15);
            tooth.rotation.z = Math.PI;
            tooth.lookAt(0, -1, 0);
            group.add(tooth);
            parts.teeth.push(tooth);
            var tooth2 = new THREE.Mesh(tGeo, toothMat);
            tooth2.position.set(Math.cos(angle) * 1.1, 0.05, Math.sin(angle) * 1.1);
            tooth2.lookAt(0, 1, 0);
            group.add(tooth2);
            parts.teeth.push(tooth2);
        }

        // Inner mouth — deeper red, pulsing horror
        var mouthGeo = new THREE.SphereGeometry(1.0, 16, 16);
        var mouthMat = new THREE.MeshBasicMaterial({ color: 0xCC0000, side: THREE.BackSide });
        var mouth = new THREE.Mesh(mouthGeo, mouthMat);
        group.add(mouth);
        parts.mouthMat = mouthMat;

        // Drool strands hanging from jaw
        parts.drool = [];
        for (var i = 0; i < 6; i++) {
            var dAngle = (i / 6) * Math.PI * 2;
            var droolGeo = new THREE.CylinderGeometry(0.015, 0.005, 0.6 + Math.random() * 0.4, 4);
            var droolMat = new THREE.MeshBasicMaterial({ color: 0x99AA44, transparent: true, opacity: 0.5 });
            var drool = new THREE.Mesh(droolGeo, droolMat);
            drool.position.set(Math.cos(dAngle) * 0.9, -0.4, Math.sin(dAngle) * 0.9);
            drool.userData = { phase: Math.random() * Math.PI * 2 };
            group.add(drool);
            parts.drool.push(drool);
        }

        // Eyes - 5 bloodshot eyes (asymmetric, unsettling)
        parts.eyes = [];
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
            parts.eyes.push({ iris: iris, pupil: pupil, sclera: sclera, basePos: { x: ep.x, y: ep.y, z: ep.z }, size: ep.s });
        }

        // Spines protruding from the top
        parts.spines = [];
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
            parts.spines.push(spine);
        }

        // Tendrils — more, longer, thicker
        parts.tendrils = [];
        for (var i = 0; i < 12; i++) {
            var angle = (i / 12) * Math.PI * 2;
            var tLen = 1.5 + Math.random() * 1.0;
            var tendGeo = new THREE.CylinderGeometry(0.03, 0.1, tLen, 6);
            var tendMat = new THREE.MeshBasicMaterial({ color: 0x665500 });
            var tendril = new THREE.Mesh(tendGeo, tendMat);
            tendril.position.set(Math.cos(angle) * 1.2, -0.4, Math.sin(angle) * 1.2);
            tendril.userData = { angle: angle, phase: Math.random() * Math.PI * 2 };
            group.add(tendril);
            parts.tendrils.push(tendril);
        }

        // Glow light — more intense
        var glow = new THREE.PointLight(0xFF4400, 2.0, 18);
        group.add(glow);
        parts.glow = glow;

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
        var diffMult = getDifficultyMultiplier();
        // Increased base speed to force sprinting (Player Walk=5, Sprint=11)
        var baseSpeed = 5.2 * (0.8 + diffMult * 0.3);

        // 3D Sound
        var sound = HorrorAudio.create3DSound('monster_breath');
        if (sound) sound.setPosition(spawnPos ? spawnPos.x : 0, 1.3, spawnPos ? spawnPos.z : 0);

        group.userData = group.userData || {};
        group.userData.chase = {
            speed: baseSpeed,
            pathTimer: 0,
            path: [],
            pathPending: false,
            pathReqId: 0,
            lastPathSig: '',
            mode: 'patrol',
            patrolTarget: null,
            rageMode: false,
            lastPlayerRow: -1,
            lastPlayerCol: -1,
            ambushTimer: 0,
            hearingRange: 18 + diffMult * 3
        };
        group.userData.audio = { sound: sound };
        group.userData.render = { parts: parts };
        scene.add(group);

        group.pacParts = parts;

        if (register) {
            if (isExtra) {
                extraPacmans.push(group);
            } else {
                pacman = group;
                pacmanParts = parts;
            }
        }

        return group;
    }

    function initExtraPacmanPool() {
        if (extraPacmanPool && extraPacmanPool.length) return;
        extraPacmanPool = [];
        for (var i = 0; i < EXTRA_PACMAN_POOL_SIZE; i++) {
            var g = createPacman({ x: 9999, z: 9999 }, true, { register: false });
            g.visible = false;
            g.userData.active = false;
            g.userData.pooled = true;
            // Keep the always-on sound inaudible while pooled.
            if (g.userData.audio && g.userData.audio.sound) g.userData.audio.sound.setPosition(9999, 0, 9999);
            extraPacmanPool.push(g);
        }
    }

    function acquireExtraPacman(spawnPos) {
        if (!extraPacmanPool || extraPacmanPool.length === 0) initExtraPacmanPool();

        var g = null;
        for (var i = 0; i < extraPacmanPool.length; i++) {
            if (!extraPacmanPool[i].userData.active) { g = extraPacmanPool[i]; break; }
        }
        if (!g) {
            console.warn('[Backrooms] Extra pacman pool exhausted; skipping spawn.');
            return null;
        }

        // Reset runtime state
        var diffMult = getDifficultyMultiplier();
        var baseSpeed = 5.2 * (0.8 + diffMult * 0.3);
        var chase = g.userData.chase;
        if (!chase) {
            chase = g.userData.chase = {
                speed: baseSpeed,
                pathTimer: 0,
                path: [],
                pathPending: false,
                pathReqId: 0,
                lastPathSig: '',
                mode: 'patrol',
                patrolTarget: null,
                rageMode: false,
                lastPlayerRow: -1,
                lastPlayerCol: -1,
                ambushTimer: 0,
                hearingRange: 18 + diffMult * 3
            };
        } else {
            chase.speed = baseSpeed;
            chase.pathTimer = 0;
            chase.path = [];
            chase.pathPending = false;
            chase.pathReqId = 0;
            chase.lastPathSig = '';
            chase.mode = 'patrol';
            chase.patrolTarget = null;
            chase.rageMode = false;
            chase.lastPlayerRow = -1;
            chase.lastPlayerCol = -1;
            chase.ambushTimer = 0;
            chase.hearingRange = 18 + diffMult * 3;
        }

        g.position.set(spawnPos.x, 1.3, spawnPos.z);
        g.visible = true;
        g.userData.active = true;
        if (g.userData.audio && g.userData.audio.sound) g.userData.audio.sound.setPosition(spawnPos.x, 1.3, spawnPos.z);

        return g;
    }

    // ---- PELLETS ----
    function spawnPellets() {
        // Object pooling: build pellets once, then reset state on restart.
        if (!pellets || pellets.length === 0) {
            var pelletGeo = new THREE.SphereGeometry(0.18, 16, 16);
            var pelletMat = new THREE.MeshBasicMaterial({ color: 0xFFFF44 });
            for (var r = 0; r < ROWS; r++) {
                for (var c = 0; c < COLS; c++) {
                    if (MAZE[r][c] === 2) {
                        var p = new THREE.Mesh(pelletGeo, pelletMat.clone());
                        p.position.set(c * CELL + CELL / 2, 1.0, r * CELL + CELL / 2);
                        p.userData = { row: r, col: c, collected: false, type: 'normal' };
                        // Individual glow (kept as child so we never remove/re-add lights during gameplay)
                        var pLight = new THREE.PointLight(0xFFFF00, 0.15, 3);
                        p.add(pLight);
                        scene.add(p);
                        pellets.push(p);
                        totalPellets++;
                    }
                }
            }
        } else {
            // Reset existing pellet instances
            for (var i = 0; i < pellets.length; i++) {
                var pp = pellets[i];
                if (!pp || !pp.userData) continue;
                pp.userData.collected = false;
                pp.visible = true;
                // Restore glow light
                if (pp.children) {
                    for (var ci = 0; ci < pp.children.length; ci++) {
                        if (pp.children[ci].isLight) pp.children[ci].intensity = 0.15;
                    }
                }
                pp.position.set(pp.userData.col * CELL + CELL / 2, 1.0, pp.userData.row * CELL + CELL / 2);
            }
        }
        assignSpecialPellets();
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

    function initPathWorker() {
        if (!window.Worker) return;
        if (pathWorker) return;

        try {
            pathWorker = new Worker('ai-worker.js');
        } catch (e) {
            console.warn('[Backrooms] Failed to create path worker:', e);
            pathWorker = null;
            return;
        }

        pathWorkerReady = false;
        pathReqSeq = 0;
        pendingPathById = {};

        pathWorker.onmessage = function (ev) {
            var msg = ev.data || {};
            if (msg.type === 'ready') {
                pathWorkerReady = true;
                return;
            }
            if (msg.type === 'path') {
                var id = msg.id;
                var pac = pendingPathById[id];
                delete pendingPathById[id];
                if (!pac || !pac.userData || !pac.userData.chase || pac.userData.chase.pathReqId !== id) return;
                pac.userData.chase.pathPending = false;
                pac.userData.chase.path = msg.path || [];
                return;
            }
        };

        pathWorker.onerror = function (err) {
            console.warn('[Backrooms] Path worker error; falling back to main-thread A*:', err);
            try { pathWorker.terminate(); } catch (e) { }
            pathWorker = null;
            pathWorkerReady = false;
            pendingPathById = {};
        };

        // Send maze wall grid once (transfer buffer for efficiency).
        try {
            var walls = new Uint8Array(ROWS * COLS);
            for (var r = 0; r < ROWS; r++) {
                for (var c = 0; c < COLS; c++) {
                    walls[r * COLS + c] = (MAZE[r][c] === 1) ? 1 : 0;
                }
            }
            pathWorker.postMessage({ type: 'init', rows: ROWS, cols: COLS, walls: walls }, [walls.buffer]);
        } catch (e) {
            console.warn('[Backrooms] Failed to init path worker:', e);
        }
    }

    function requestPathForPac(pac, sr, sc, er, ec) {
        var ud = pac.userData;
        if (!ud || !ud.chase) return;
        var chase = ud.chase;

        // If worker isn't ready, fall back to synchronous A*.
        if (!pathWorker || !pathWorkerReady) {
            chase.pathPending = false;
            chase.path = findPath(sr, sc, er, ec);
            return;
        }

        var sig = sr + ',' + sc + '->' + er + ',' + ec;
        if (chase.pathPending && chase.lastPathSig === sig) return;

        chase.lastPathSig = sig;
        chase.pathPending = true;
        var id = ++pathReqSeq;
        chase.pathReqId = id;
        pendingPathById[id] = pac;

        try {
            pathWorker.postMessage({ type: 'path', id: id, sr: sr, sc: sc, er: er, ec: ec });
        } catch (e) {
            // Worker can fail in some embed contexts; fall back.
            chase.pathPending = false;
            chase.path = findPath(sr, sc, er, ec);
        }
    }

    // ---- GAME FLOW ----
    function startGame() {
        if (!GameUtils.checkWebGL()) { document.getElementById('start-screen').style.display = 'none'; GameUtils.showBrowserError(); return; }
        syncSelectedDifficultyFromGameUtils();
        setDifficulty(selectedDifficultyKey);
        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        console.log('[Backrooms] startGame - calling init()...');
        try { init(); } catch (e) { console.error('Init error:', e); GameUtils.showBrowserError(); return; }
        console.log('[Backrooms] init() returned successfully');
        resetRoundState();
        setupExtraSpawnTimers();
        spawnInitialExtraPacmen();
        initPathWorker();

        // Initialize AI systems
        if (typeof SGAIAI !== 'undefined') {
            SGAIAI.init();

            // Start AI Game Master session
            const aiFeatures = SGAIAI.getFeatures();
            if (aiFeatures.aiGameMaster) {
                SGAIAI.startGameSession('backrooms-pacman', {
                    minTension: 0.1,
                    maxTension: 0.9,
                    targetPacing: 0.3,
                    horrorIntensity: 0.7,
                });
            }

            // Record behavior
            SGAIAI.recordBehavior({ type: 'game_start', game: 'backrooms-pacman' });
        }

        // Enhanced audio: Start dynamic music if available (tier-based)
        if (typeof HorrorAudioEnhanced !== 'undefined' && HorrorAudioEnhanced.getFeatures().dynamicMusic) {
            HorrorAudioEnhanced.init();
            HorrorAudioEnhanced.startDynamicMusic('tension');
            HorrorAudioEnhanced.startHeartbeat(60);
        } else {
            // Fallback to basic audio
            HorrorAudio.startDrone(55, 'dark');
            HorrorAudio.startHeartbeat(60);
        }

        // Show subtitle for game start
        if (typeof HorrorAudioEnhanced !== 'undefined') {
            HorrorAudioEnhanced.showSubtitle('objective_new', { text: 'Collect all pellets to escape...' });
        }

        setTimeout(function () {
            ctrl.classList.add('hiding');
            setTimeout(function () {
                ctrl.style.display = 'none'; ctrl.classList.remove('hiding');
                setGameState(GAME_STATE.PLAYING);
                applyDifficultyPresentation();
                document.getElementById('back-link').style.display = 'none';
                try { renderer.domElement.requestPointerLock(); } catch (e) { }
                lastTime = performance.now(); accumulator = 0; animate();
            }, 800);
        }, 3500);
    }

    function restartGame() {
        setDifficulty(selectedDifficultyKey);
        cloneMaze();
        // Cancel any in-flight worker responses for the old entities.
        pendingPathById = {};
        pathReqSeq = 0;
        invalidateHud();
        collectedPellets = 0;
        yaw = 0; pitch = 0; lastYaw = 0; lastPitch = 0; keys = {}; isRunning = false; camShake = 0;

        // Cleanup sounds
        if (pacman) {
            if (pacman.userData.audio && pacman.userData.audio.sound) pacman.userData.audio.sound.stop();
            scene.remove(pacman);
        }
        pacman = null;

        // Return spawned extras to the pool (do not destroy; their geometry/sounds are prewarmed)
        for (var i = 0; i < extraPacmans.length; i++) {
            var ep = extraPacmans[i];
            if (!ep) continue;
            ep.visible = false;
            ep.userData.active = false;
            ep.position.set(9999, -50, 9999);
            if (ep.userData.chase) {
                ep.userData.chase.path = [];
                ep.userData.chase.mode = 'patrol';
                ep.userData.chase.pathPending = false;
                ep.userData.chase.pathReqId = 0;
                ep.userData.chase.lastPathSig = '';
            }
            if (ep.userData.audio && ep.userData.audio.sound) ep.userData.audio.sound.setPosition(9999, 0, 9999);
        }
        extraPacmans = [];

        stamina = maxStamina; staminaDrained = false;
        resetRoundState();
        gameElapsed = 0; extraSpawnTimers = [];
        setupExtraSpawnTimers();
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
            if (MAZE[r][c] === 3) { playerPos.x = c * CELL + CELL / 2; playerPos.z = r * CELL + CELL / 2; }
        }
        camera.position.x = playerPos.x; camera.position.z = playerPos.z;
        createPacman();
        spawnInitialExtraPacmen();
        spawnPellets();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        try { if (window.A11y && typeof window.A11y.releaseFocusTrap === 'function') window.A11y.releaseFocusTrap(); } catch (e) { }
        HorrorAudio.startDrone(55, 'dark'); HorrorAudio.startHeartbeat(60);
        setGameState(GAME_STATE.PLAYING);
        applyDifficultyPresentation();
        try { renderer.domElement.requestPointerLock(); } catch (e) { }
        lastTime = performance.now(); accumulator = 0; animate();
    }

    function resetPlayerToSpawn() {
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                if (MAZE[r][c] === 3) {
                    playerPos.x = c * CELL + CELL / 2;
                    playerPos.z = r * CELL + CELL / 2;
                    camera.position.x = playerPos.x;
                    camera.position.z = playerPos.z;
                    camera.position.y = 1.6;
                    return;
                }
            }
        }
    }

    function resetRoundState() {
        playerLives = currentDifficulty.extraLives;
        playerHitCooldown = 0;
        pacmanStunTimer = 0;
        pacmanBlindTimer = 0;
        phasingTimer = 0;
        radarTimer = 0;
        reversalTimer = 0;
        decoyTimer = 0;
        decoyPulseTimer = 0;
        decoyPos.x = playerPos.x;
        decoyPos.z = playerPos.z;
        for (var i = 0; i < ABILITY_ORDER.length; i++) {
            var k = ABILITY_ORDER[i];
            abilityInventory[k] = 0;
            abilityCooldowns[k] = 0;
        }
    }

    function buildAbilityHudText() {
        var parts = [];
        for (var i = 0; i < ABILITY_ORDER.length; i++) {
            var key = ABILITY_ORDER[i];
            if (key === 'reversal' && !currentDifficulty.allowReversal) continue;
            var def = ABILITY_DEFS[key];
            var count = abilityInventory[key] || 0;
            var cd = abilityCooldowns[key] || 0;
            parts.push(def.hotkey + ':' + count + (cd > 0 ? ' (' + Math.ceil(cd) + 's)' : ''));
        }
        return parts.length ? ('Abilities ' + parts.join('  ')) : '';
    }

    function grantAbility(type) {
        if (!ABILITY_DEFS[type]) return;
        if (type === 'reversal' && !currentDifficulty.allowReversal) return;
        abilityInventory[type] = Math.min(4, (abilityInventory[type] || 0) + 1);
        showStatusMessage(ABILITY_DEFS[type].label + ' acquired', '#9ad8ff');
        updateHUD();
    }

    function tryUseAbility(type) {
        if (!ABILITY_DEFS[type]) return false;
        if (type === 'reversal' && !currentDifficulty.allowReversal) {
            showStatusMessage('Reversal disabled on this difficulty', '#ffaa66');
            return false;
        }
        if ((abilityInventory[type] || 0) <= 0) return false;
        if ((abilityCooldowns[type] || 0) > 0) return false;

        abilityInventory[type] = Math.max(0, (abilityInventory[type] || 0) - 1);
        abilityCooldowns[type] = ABILITY_DEFS[type].cooldown;

        if (type === 'flashbang') {
            pacmanBlindTimer = Math.max(pacmanBlindTimer, 3);
            pulseEffectOverlay('rgba(220,245,255,0.85)', 0.7, 220);
            showStatusMessage('Flashbang detonated', '#d8f1ff');
        } else if (type === 'decoy') {
            decoyPos.x = playerPos.x;
            decoyPos.z = playerPos.z;
            decoyTimer = Math.max(decoyTimer, 6);
            decoyPulseTimer = 0;
            pulseEffectOverlay('rgba(255,136,68,0.35)', 0.35, 250);
            showStatusMessage('Decoy deployed', '#ffb183');
        } else if (type === 'phasing') {
            phasingTimer = Math.max(phasingTimer, 2.2);
            pulseEffectOverlay('rgba(184,119,255,0.42)', 0.4, 260);
            showStatusMessage('Phasing active', '#d8a8ff');
        } else if (type === 'radar') {
            radarTimer = Math.max(radarTimer, 3);
            pulseEffectOverlay('rgba(68,227,255,0.28)', 0.28, 220);
            showStatusMessage('Radar ping emitted', '#85f0ff');
            applyDifficultyPresentation();
        } else if (type === 'reversal') {
            reversalTimer = Math.max(reversalTimer, 4);
            pulseEffectOverlay('rgba(68,255,136,0.3)', 0.3, 260);
            showStatusMessage('Pack mentality reversed', '#9dffb8');
        }

        updateHUD();
        return true;
    }

    function updateAbilityTimers(dt) {
        var hadRadar = radarTimer > 0;
        if (playerHitCooldown > 0) playerHitCooldown = Math.max(0, playerHitCooldown - dt);
        if (pacmanStunTimer > 0) pacmanStunTimer = Math.max(0, pacmanStunTimer - dt);
        if (pacmanBlindTimer > 0) pacmanBlindTimer = Math.max(0, pacmanBlindTimer - dt);
        if (phasingTimer > 0) phasingTimer = Math.max(0, phasingTimer - dt);
        if (radarTimer > 0) radarTimer = Math.max(0, radarTimer - dt);
        if (reversalTimer > 0) reversalTimer = Math.max(0, reversalTimer - dt);
        if (decoyTimer > 0) {
            decoyTimer = Math.max(0, decoyTimer - dt);
            decoyPulseTimer -= dt;
            if (decoyPulseTimer <= 0) {
                decoyPulseTimer = 0.8;
                try { HorrorAudio.playFootstep('stone'); } catch (e) { }
            }
        }
        for (var i = 0; i < ABILITY_ORDER.length; i++) {
            var key = ABILITY_ORDER[i];
            if (abilityCooldowns[key] > 0) abilityCooldowns[key] = Math.max(0, abilityCooldowns[key] - dt);
        }
        if ((radarTimer > 0) !== hadRadar) applyDifficultyPresentation();
    }

    function onPlayerCaught() {
        if (phasingTimer > 0 || playerHitCooldown > 0 || cheatsEnabled.godMode) return;
        if (!currentDifficulty.permanentDeath && playerLives > 1) {
            playerLives--;
            playerHitCooldown = 2.5;
            phasingTimer = Math.max(phasingTimer, 1.1);
            pacmanStunTimer = Math.max(pacmanStunTimer, 1.4);
            resetPlayerToSpawn();
            showStatusMessage('Life lost - ' + playerLives + ' remaining', '#ffbe7f');
            pulseEffectOverlay('rgba(255,64,32,0.4)', 0.45, 240);
            updateHUD();
            return;
        }
        gameOver();
    }

    function applyPelletStyle(pellet) {
        if (!pellet || !pellet.userData) return;
        var type = pellet.userData.type || 'normal';
        var style = PELLET_STYLES[type] || PELLET_STYLES.normal;
        if (pellet.material && pellet.material.color) pellet.material.color.setHex(style.color);
        pellet.scale.set(style.scale, style.scale, style.scale);
        if (pellet.children) {
            for (var i = 0; i < pellet.children.length; i++) {
                if (pellet.children[i].isLight) {
                    pellet.children[i].color.setHex(style.color);
                    pellet.children[i].intensity = pellet.userData.collected ? 0 : style.light;
                }
            }
        }
    }

    function assignSpecialPellets() {
        if (!pellets || pellets.length === 0) return;
        var available = [];
        for (var i = 0; i < pellets.length; i++) {
            var p = pellets[i];
            if (!p || !p.userData) continue;
            p.userData.type = 'normal';
            applyPelletStyle(p);
            available.push(p);
        }
        function takeRandomPellet() {
            if (!available.length) return null;
            var idx = Math.floor(Math.random() * available.length);
            return available.splice(idx, 1)[0];
        }
        for (var pi = 0; pi < currentDifficulty.powerPellets; pi++) {
            var powerPellet = takeRandomPellet();
            if (!powerPellet) break;
            powerPellet.userData.type = 'power';
            applyPelletStyle(powerPellet);
        }
        var utilityTypes = ['flashbang', 'decoy', 'phasing', 'radar'];
        if (currentDifficulty.allowReversal) utilityTypes.push('reversal');
        for (var ui = 0; ui < utilityTypes.length; ui++) {
            var special = takeRandomPellet();
            if (!special) break;
            special.userData.type = utilityTypes[ui];
            applyPelletStyle(special);
        }
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
        var hasStamina = currentDifficulty.hasStamina;

        // Input-derived sprint flag (don’t trust raw key state in gamepad/rebind future)
        isRunning = input && input.isActionActive('SPRINT');

        // Stamina management
        if (hasStamina && !cheatsEnabled.infiniteStamina) {
            if (isRunning && stamina > 0 && !staminaDrained) {
                var drainRate = currentDifficulty.staminaDrain;
                stamina = Math.max(0, stamina - drainRate * dt);
                if (stamina <= 0) { staminaDrained = true; isRunning = false; }
            } else {
                var regenRate = currentDifficulty.staminaRegen;
                stamina = Math.min(maxStamina, stamina + regenRate * dt);
                if (stamina > currentDifficulty.staminaRecoverAt) staminaDrained = false;
            }
        } else if (cheatsEnabled.infiniteStamina) {
            stamina = maxStamina;
            staminaDrained = false;
        } else {
            stamina = maxStamina;
            staminaDrained = false;
        }

        // Can't sprint if stamina drained
        var canSprint = isRunning && (!hasStamina || (!staminaDrained && stamina > 0));

        // Velocity-based speed — sprint ramps up and decelerates
        var targetSpeed = 0;
        var fx = -Math.sin(yaw), fz = -Math.cos(yaw);
        var rx = Math.cos(yaw), rz = -Math.sin(yaw);
        var inputX = 0, inputZ = 0;

        // Update input (gamepad polling) once per simulation tick.
        if (input) input.update();

        // Digital inputs
        if (input && input.isActionActive('MOVE_FORWARD')) { inputX += fx; inputZ += fz; }
        if (input && input.isActionActive('MOVE_BACK')) { inputX -= fx; inputZ -= fz; }
        if (input && input.isActionActive('MOVE_LEFT')) { inputX -= rx; inputZ -= rz; }
        if (input && input.isActionActive('MOVE_RIGHT')) { inputX += rx; inputZ += rz; }

        // Analog (gamepad left stick)
        if (input) {
            var a = input.getMoveAxes();
            // axes: x = strafe, y = forward (negative means forward)
            inputX += rx * a.x + fx * (-a.y);
            inputZ += rz * a.x + fz * (-a.y);
        }

        var inputLen = Math.sqrt(inputX * inputX + inputZ * inputZ);
        if (inputLen > 0) {
            inputX /= inputLen; inputZ /= inputLen;
            // Apply speed multipliers
            targetSpeed = canSprint ? playerStats.sprintSpeed : playerStats.baseSpeed;
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

        // Smooth camera follow via exponential lerp
        var lerpFactor = 1 - Math.pow(0.0001, dt);
        camera.position.x += (playerPos.x - camera.position.x) * lerpFactor;
        camera.position.z += (playerPos.z - camera.position.z) * lerpFactor;
        camera.position.y += ((1.6 + headBob) - camera.position.y) * lerpFactor;

        // Camera shake from proximity
        if (camShake > 0) {
            camera.position.x += (Math.random() - 0.5) * camShake * 0.15;
            camera.position.z += (Math.random() - 0.5) * camShake * 0.15;
            camera.position.y += (Math.random() - 0.5) * camShake * 0.08;
        }
        camera.rotation.order = 'YXZ';
        camera.rotation.y = yaw + headTilt;
        camera.rotation.x = pitch;

        // Update 3D Audio Listener
        var cx = Math.sin(yaw);
        var cz = Math.cos(yaw); // camera direction (approx based on yaw)
        // actually standard calculation:
        // forward vector: (-sin(yaw)cos(pitch), sin(pitch), -cos(yaw)cos(pitch))?
        // simple Y-rotation forward is: x = -sin(yaw), z = -cos(yaw) (OpenGL convention)
        // But ThreeJS defaults -Z forward.
        // We can just use ThreeJS method:
        var dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        HorrorAudio.updateListener(
            camera.position.x, camera.position.y, camera.position.z,
            dir.x, dir.y, dir.z,
            0, 1, 0
        );
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
        if (!ud || !ud.chase) return;
        var chase = ud.chase;
        var audio = ud.audio;
        var diffMult = getDifficultyMultiplier();
        var pacRow = Math.floor(pac.position.z / CELL);
        var pacCol = Math.floor(pac.position.x / CELL);
        var playerRow = Math.floor(playerPos.z / CELL);
        var playerCol = Math.floor(playerPos.x / CELL);
        var ddx = pac.position.x - playerPos.x, ddz = pac.position.z - playerPos.z;
        var pacDist = Math.sqrt(ddx * ddx + ddz * ddz);

        if (pacmanStunTimer > 0) {
            chase.path = [];
            chase.pathPending = false;
            if (audio && audio.sound) audio.sound.setPosition(pac.position.x, pac.position.y, pac.position.z);
            if (pacParts && pacParts.glow) {
                pacParts.glow.intensity = 1.2;
                pacParts.glow.color.setHex(0x66ccff);
            }
            pac.position.y = 1.3 + Math.sin(pacmanAnimTime * 2) * 0.05;
            return;
        }

        // Rage mode when few pellets remain
        var pelletsLeft = totalPellets - collectedPellets;
        chase.rageMode = pelletsLeft <= Math.ceil(totalPellets * 0.2);
        var speedMul = chase.rageMode ? 1.8 : 1.15; // Pac-Man is faster overall, rage is terrifying
        
        // Slower Pac-Man cheat
        if (cheatsEnabled.slowerPacman) {
            speedMul *= 0.5;
        }
        
        // Hearing — detect running from farther
        var hearingDist = isRunning ? 30 : chase.hearingRange;
        var forcedTarget = null;

        if (reversalTimer > 0 && currentDifficulty.allowReversal) {
            var fleeCells = getOpenCells();
            var bestCell = null;
            var bestDist2 = -1;
            for (var fi = 0; fi < Math.min(24, fleeCells.length); fi++) {
                var rc = fleeCells[Math.floor(Math.random() * fleeCells.length)];
                var dx2 = rc.c - playerCol;
                var dz2 = rc.r - playerRow;
                var d2 = dx2 * dx2 + dz2 * dz2;
                if (d2 > bestDist2) {
                    bestDist2 = d2;
                    bestCell = rc;
                }
            }
            if (!bestCell && fleeCells.length) bestCell = fleeCells[Math.floor(Math.random() * fleeCells.length)];
            forcedTarget = bestCell;
            chase.mode = 'flee';
        } else if (decoyTimer > 0) {
            var decoyRow = Math.max(1, Math.min(ROWS - 2, Math.floor(decoyPos.z / CELL)));
            var decoyCol = Math.max(1, Math.min(COLS - 2, Math.floor(decoyPos.x / CELL)));
            if (MAZE[decoyRow] && MAZE[decoyRow][decoyCol] !== 1) {
                forcedTarget = { r: decoyRow, c: decoyCol };
                chase.mode = 'decoy';
            }
        }

        // AI mode selection
        chase.ambushTimer -= dt;
        if (forcedTarget) {
            // Decoy/reversal overrides default mode selection.
        } else if (pacmanBlindTimer > 0) {
            chase.mode = 'patrol';
        } else if (pacDist > hearingDist && !chase.rageMode) {
            chase.mode = 'patrol';
        } else if (chase.ambushTimer <= 0 && Math.random() < 0.15 && pacDist > 8) {
            chase.mode = 'ambush';
            chase.ambushTimer = 5 + Math.random() * 5;
        } else {
            chase.mode = 'chase';
        }

        // Path update
        chase.pathTimer -= dt;
        if (chase.pathTimer <= 0) {
            // Faster reaction time
            chase.pathTimer = chase.rageMode ? 0.15 : 0.25;
            if (forcedTarget) {
                if (!chase.pathPending) requestPathForPac(pac, pacRow, pacCol, forcedTarget.r, forcedTarget.c);
            } else if (pacmanBlindTimer > 0) {
                chase.pathTimer = 0.4;
                if (!chase.patrolTarget || (Math.abs(pacRow - chase.patrolTarget.r) < 2 && Math.abs(pacCol - chase.patrolTarget.c) < 2)) {
                    var blindCells = getOpenCells();
                    chase.patrolTarget = blindCells[Math.floor(Math.random() * blindCells.length)];
                }
                if (!chase.pathPending) requestPathForPac(pac, pacRow, pacCol, chase.patrolTarget.r, chase.patrolTarget.c);
            } else if (chase.mode === 'chase') {
                if (!chase.pathPending) requestPathForPac(pac, pacRow, pacCol, playerRow, playerCol);
            } else if (chase.mode === 'ambush') {
                // Predict player position - move to where they're heading
                var predR = playerRow + Math.round(-Math.cos(yaw) * 4);
                var predC = playerCol + Math.round(-Math.sin(yaw) * 4);
                predR = Math.max(1, Math.min(ROWS - 2, predR));
                predC = Math.max(1, Math.min(COLS - 2, predC));
                if (MAZE[predR] && MAZE[predR][predC] !== 1) {
                    if (!chase.pathPending) requestPathForPac(pac, pacRow, pacCol, predR, predC);
                } else {
                    if (!chase.pathPending) requestPathForPac(pac, pacRow, pacCol, playerRow, playerCol);
                }
            } else {
                // Patrol - pick a random intersection
                if (!chase.patrolTarget || (Math.abs(pacRow - chase.patrolTarget.r) < 2 && Math.abs(pacCol - chase.patrolTarget.c) < 2)) {
                    var cells = getOpenCells();
                    chase.patrolTarget = cells[Math.floor(Math.random() * cells.length)];
                }
                if (!chase.pathPending) requestPathForPac(pac, pacRow, pacCol, chase.patrolTarget.r, chase.patrolTarget.c);
            }
        }

        // Movement
        if (chase.path && chase.path.length > 0) {
            var next = chase.path[0];
            var tx = next.c * CELL + CELL / 2, tz = next.r * CELL + CELL / 2;
            var dx = tx - pac.position.x, dz = tz - pac.position.z;
            var dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 0.3) chase.path.shift();
            else {
                var spd = chase.speed * diffMult * speedMul * dt;
                if (pacmanBlindTimer > 0) spd *= 0.65;
                pac.position.x += (dx / dist) * spd;
                pac.position.z += (dz / dist) * spd;
                pac.rotation.y = Math.atan2(dx, dz);
            }
        }

        // Update 3D Sound Position
        if (audio && audio.sound) {
            audio.sound.setPosition(pac.position.x, pac.position.y, pac.position.z);
            // Occlusion: muffle when blocked by walls (native WebAudio lowpass)
            var pr = Math.floor(playerPos.z / CELL), pc = Math.floor(playerPos.x / CELL);
            var occluded = !cellsLineOfSight(pr, pc, pacRow, pacCol);
            if (audio.sound.setOccluded) audio.sound.setOccluded(occluded);
        }

        // ---- ANIMATE PAC-MAN ----
        pacmanAnimTime += dt;
        var t = pacmanAnimTime;

        // Jaw animation - opens wider when close to player
        var jawOpen = (0.15 + (pacDist < 8 ? 0.35 * (1 - pacDist / 8) : 0)) * (0.5 + Math.sin(t * 4) * 0.5);
        if (pacParts.jawUpper) pacParts.jawUpper.rotation.x = -jawOpen * 0.4;
        if (pacParts.jawLower) pacParts.jawLower.rotation.x = jawOpen * 0.6;

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
                var spPulse = 1 + (chase.rageMode ? Math.sin(t * 8 + i) * 0.3 : Math.sin(t * 2 + i) * 0.1);
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
            if (reversalTimer > 0 && currentDifficulty.allowReversal) {
                pacParts.glow.color.setHex(0x44ff99);
            } else if (pacmanBlindTimer > 0) {
                pacParts.glow.color.setHex(0xddeeff);
            } else {
                if (reversalTimer > 0 && currentDifficulty.allowReversal) {
                    pacParts.glow.color.setHex(0x44ff99);
                } else if (pacmanBlindTimer > 0) {
                    pacParts.glow.color.setHex(0xddeeff);
                } else {
                    pacParts.glow.color.setHex(chase.rageMode ? 0xFF0000 : 0xFF4400);
                }
            }
        }

        // Bob
        pac.position.y = 1.3 + Math.sin(t * 2) * 0.2;

        // Dynamic heartbeat (use closest pacman)
        var bpm = Math.min(180, Math.max(50, 200 - pacDist * 5));
        HorrorAudio.setHeartbeatBPM(Math.round(bpm));

        // Visual Enhancements: Set intensity based on Pac-Man proximity
        // 0 = far away, 1 = very close (danger)
        var visualIntensity = Math.max(0, Math.min(1, (15 - pacDist) / 15));
        GameUtils.setIntensityLevel(visualIntensity);

        // Phase 2: Update 3D spatial audio for Pac-Man
        if (pacman) {
            updatePacmanProximityAudio(pacman, pacDist, fixedStep);
        }

        // Dynamic Music: Set intensity based on danger
        if (typeof HorrorAudioEnhanced !== 'undefined' && HorrorAudioEnhanced.setMusicIntensity) {
            HorrorAudioEnhanced.setMusicIntensity(visualIntensity);

            // Change music theme based on distance
            if (pacDist < 5 && visualIntensity > 0.7) {
                HorrorAudioEnhanced.setMusicTheme('chase');
            } else if (pacDist < 10) {
                HorrorAudioEnhanced.setMusicTheme('tension');
            } else {
                HorrorAudioEnhanced.setMusicTheme('ambient');
            }
        }

        // Camera shake & distortion
        var shakeAmt = Math.max(0, (8 - pacDist) / 8) * (chase.rageMode ? 1.5 : 1);
        if (shakeAmt > camShake) camShake = shakeAmt;
        if (distortionOverlay) {
            var distAmt = Math.min(1, Math.max(0, (10 - pacDist) / 10) * 0.7);
            var cur = parseFloat(distortionOverlay.style.opacity) || 0;
            if (distAmt > cur) distortionOverlay.style.opacity = distAmt;
        }

        // Nearby lights flicker violently
        for (var i = 0; i < corridorLights.length; i++) {
            var cl = corridorLights[i];
            if (cl.dead || !cl.active) continue;
            var lx = cl.light.position.x - pac.position.x, lz = cl.light.position.z - pac.position.z;
            var ldist = Math.sqrt(lx * lx + lz * lz);
            if (ldist < 8) cl.light.intensity = cl.baseIntensity * (0.2 + Math.random() * 0.8);
        }

        // Kill check
        if (pacDist < 1.8) onPlayerCaught();
    }

    // Wrapper: update ALL pacmans
    function updatePacman(dt) {
        camShake = 0; // Reset per frame, each pac can increase it
        if (distortionOverlay) distortionOverlay.style.opacity = '0';
        updateSinglePacman(pacman, pacmanParts, dt);
        for (var i = 0; i < extraPacmans.length; i++) {
            updateSinglePacman(extraPacmans[i], extraPacmans[i].pacParts, dt);
        }
    }

    // Render-rate animation pass (uses renderTime so it looks smooth at 60/120/144Hz).
    // This is intentionally "visual-only": AI/paths/collision stay in the fixed-timestep loop.
    function updatePacmanRenderAnimations(t) {
        var allPacs = [pacman].concat(extraPacmans);
        var minDist = 999999;

        // Reset per-render effects
        camShake = 0;
        if (distortionOverlay) distortionOverlay.style.opacity = '0';

        for (var pi = 0; pi < allPacs.length; pi++) {
            var pac = allPacs[pi];
            if (!pac || !pac.position) continue;

            var pacParts = (pi === 0) ? pacmanParts : pac.pacParts;
            if (!pacParts) continue;

            var dxp = pac.position.x - playerPos.x, dzp = pac.position.z - playerPos.z;
            var pacDist = Math.sqrt(dxp * dxp + dzp * dzp);
            if (pacDist < minDist) minDist = pacDist;

            var chase = pac.userData && pac.userData.chase ? pac.userData.chase : null;
            if (!chase) chase = { rageMode: false };

            // Jaw animation - opens wider when close to player
            var jawOpen = (0.15 + (pacDist < 8 ? 0.35 * (1 - pacDist / 8) : 0)) * (0.5 + Math.sin(t * 4) * 0.5);
            if (pacParts.jawUpper) pacParts.jawUpper.rotation.x = -jawOpen * 0.4;
            if (pacParts.jawLower) pacParts.jawLower.rotation.x = jawOpen * 0.6;

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
                for (var di = 0; di < pacParts.drool.length; di++) {
                    var d = pacParts.drool[di];
                    d.rotation.x = Math.sin(t * 2 + d.userData.phase) * 0.3;
                    d.rotation.z = Math.cos(t * 1.5 + d.userData.phase) * 0.2;
                    d.scale.y = 1 + Math.sin(t * 3 + di) * 0.2;
                }
            }

            // Eyes track player — all 5 eyes with independent twitching
            if (pacParts.eyes && pacParts.eyes.length) {
                for (var ei = 0; ei < pacParts.eyes.length; ei++) {
                    var eye = pacParts.eyes[ei];
                    var dirX = playerPos.x - pac.position.x, dirZ = playerPos.z - pac.position.z;
                    var dirLen = Math.sqrt(dirX * dirX + dirZ * dirZ);
                    if (dirLen > 0) {
                        var s = eye.size || 0.22;
                        var twitch = Math.sin(t * 8 + ei * 3) * 0.02;
                        var lookX = (dirX / dirLen) * s * 0.3 + twitch;
                        var lookZ = (dirZ / dirLen) * s * 0.3;
                        eye.iris.position.x = eye.basePos.x + lookX;
                        eye.iris.position.z = eye.basePos.z + lookZ - s * 0.55;
                        eye.pupil.position.x = eye.basePos.x + lookX * 1.3;
                        eye.pupil.position.z = eye.basePos.z + lookZ * 1.3 - s * 0.8;
                    }
                }
            }

            // Spines pulse outward when enraged
            if (pacParts.spines) {
                for (var si = 0; si < pacParts.spines.length; si++) {
                    var sp = pacParts.spines[si];
                    var spPulse = 1 + ((chase.rageMode) ? Math.sin(t * 8 + si) * 0.3 : Math.sin(t * 2 + si) * 0.1);
                    sp.scale.set(spPulse, spPulse, spPulse);
                }
            }

            // Tendrils wave — more aggressive
            if (pacParts.tendrils) {
                for (var ti = 0; ti < pacParts.tendrils.length; ti++) {
                    var tend = pacParts.tendrils[ti];
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
            }

            // Glow intensity based on proximity
            if (pacParts.glow) {
                pacParts.glow.intensity = 1 + Math.max(0, (10 - pacDist) / 10) * 3;
                if (reversalTimer > 0 && currentDifficulty.allowReversal) {
                    pacParts.glow.color.setHex(0x44ff99);
                } else if (pacmanBlindTimer > 0) {
                    pacParts.glow.color.setHex(0xddeeff);
                } else {
                    pacParts.glow.color.setHex(chase.rageMode ? 0xFF0000 : 0xFF4400);
                }
            }

            // Bob (visual-only)
            pac.position.y = 1.3 + Math.sin(t * 2) * 0.2;

            // Camera shake & distortion
            var shakeAmt = Math.max(0, (8 - pacDist) / 8) * (chase.rageMode ? 1.5 : 1);
            if (shakeAmt > camShake) camShake = shakeAmt;
            if (distortionOverlay) {
                var distAmt = Math.min(1, Math.max(0, (10 - pacDist) / 10) * 0.7);
                var cur = parseFloat(distortionOverlay.style.opacity) || 0;
                if (distAmt > cur) distortionOverlay.style.opacity = distAmt;
            }
        }

        if (minDist < 999998) {
            // Dynamic heartbeat (use closest pacman)
            var bpm = Math.min(180, Math.max(50, 200 - minDist * 5));
            HorrorAudio.setHeartbeatBPM(Math.round(bpm));

            // Visual Enhancements intensity
            visualIntensity = Math.max(0, Math.min(1, (15 - minDist) / 15));
            GameUtils.setIntensityLevel(visualIntensity);

            if (typeof HorrorAudioEnhanced !== 'undefined' && HorrorAudioEnhanced.setMusicIntensity) {
                HorrorAudioEnhanced.setMusicIntensity(visualIntensity);
                if (minDist < 5 && visualIntensity > 0.7) {
                    HorrorAudioEnhanced.setMusicTheme('chase');
                } else if (minDist < 10) {
                    HorrorAudioEnhanced.setMusicTheme('tension');
                } else {
                    HorrorAudioEnhanced.setMusicTheme('ambient');
                }
            }
        } else {
            visualIntensity = 0;
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
            var dist = Math.sqrt(dx * dx + dz * dz);
            
            // Magnetic pellets cheat - attract pellets from further away
            var collectDist = cheatsEnabled.superCollectRange ? 3.5 : 1.2;
            
            if (dist < collectDist) {
                p.userData.collected = true;
                // IMPORTANT: Do NOT scene.remove(p) — removing a mesh with a child
                // PointLight changes the scene light count, forcing Three.js to
                // recompile ALL shaders (MeshStandardMaterial), causing a freeze.
                // Instead, hide the pellet and disable its light.
                p.visible = false;
                if (p.children) {
                    for (var ci = 0; ci < p.children.length; ci++) {
                        if (p.children[ci].isLight) p.children[ci].intensity = 0;
                    }
                }

                var pelletType = p.userData.type || 'normal';
                if (pelletType === 'power') {
                    pacmanStunTimer = Math.max(pacmanStunTimer, 3.5);
                    pulseEffectOverlay('rgba(102,204,255,0.35)', 0.35, 260);
                    showStatusMessage('Power pellet: Pac-Man stunned', '#88d8ff');
                } else if (ABILITY_DEFS[pelletType]) {
                    grantAbility(pelletType);
                }
                
                // Score multiplier cheat
                var pelletValue = cheatsEnabled.scoreMultiplier ? 2 : 1;
collectedPellets += pelletValue;

  try {
    HorrorAudio.playCollect();
  } catch (e) { console.warn('[Backrooms] playCollect error:', e); }

  // PHASE 8: Trigger discovery leitmotif for special pellets
  if (pelletType === 4 || pelletType === 5) { // Power pellet or secret
    if (typeof DynamicSoundtrack !== 'undefined') {
      DynamicSoundtrack.setIntensityParameter('discovery', true);
    }
    if (typeof HorrorAudioEnhanced !== 'undefined') {
      HorrorAudioEnhanced.showSubtitle('pickup_powerup', {
        text: 'Power-up acquired!',
        duration: 2000
      });
    }
  }
                try {
                    updateHUD();
                } catch (e) { console.warn('[Backrooms] updateHUD error:', e); }
                try {
                    if (window.ChallengeManager) {
                        ChallengeManager.notify('backrooms-pacman', 'pellets', 1);
                        ChallengeManager.notify('backrooms-pacman', 'score', collectedPellets * 100);
                    }
                } catch (e) { console.warn('[Backrooms] ChallengeManager error:', e); }
                if (collectedPellets >= totalPellets) gameWin();
            }
        }
    }

    // ---- FLICKERING LIGHTS (ADVANCED) ----
    function updateFlickeringLights(dt) {
        var now = Date.now();

        updateProximityLights(dt);

        if (currentDifficulty.darkness) {
            for (var di = 0; di < corridorLights.length; di++) {
                var dl = corridorLights[di];
                if (!dl || !dl.light) continue;
                dl.light.visible = false;
                dl.light.intensity = 0;
                dl.active = null;
                if (dl.fixture) dl.fixture.visible = false;
                if (dl.fixMat) dl.fixMat.color.setHex(0x111111);
            }
            return;
        }

        for (var i = 0; i < corridorLights.length; i++) {
            var cl = corridorLights[i];
            if (cl.dead) {
                if (cl.light) cl.light.visible = false;
                cl.light.intensity = 0;
                if (cl.fixMat) cl.fixMat.color.setHex(0x333333);
                continue;
            }

            // During blackout, all lights go dark
            if (blackoutActive) {
                if (cl.light) cl.light.visible = false;
                cl.light.intensity = 0;
                if (cl.fixMat) cl.fixMat.color.setHex(0x222222);
                continue;
            }

            if (!cl.active) continue;

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
        if (!currentDifficulty.blackoutEnabled) {
            blackoutActive = false;
            if (gameState === GAME_STATE.BLACKOUT) setGameState(GAME_STATE.PLAYING);
            blackoutOverlay.style.opacity = '0';
            var warnOff = document.getElementById('blackout-warning');
            if (warnOff) warnOff.style.opacity = '0';
            return;
        }
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
                if (gameState === GAME_STATE.BLACKOUT) setGameState(GAME_STATE.PLAYING);
                blackoutOverlay.style.opacity = '0';
                if (warn) warn.style.opacity = '0';
                nextBlackout = 20 + Math.random() * 30;
            }
        } else {
            // Blackout timer - skip if noBlackout cheat is active
            if (!cheatsEnabled.noBlackout) {
                nextBlackout -= dt;
                if (nextBlackout <= 0 && isGameRunning()) {
                    // Start blackout!
blackoutActive = true;
      setGameState(GAME_STATE.BLACKOUT);
      blackoutTimer = 4 + Math.random() * 2; // 4-6 seconds
      blackoutOverlay.style.opacity = '0.85';
      HorrorAudio.playJumpScare(); // scary sound on blackout

      // PHASE 8: Enhanced blackout audio
      if (typeof DynamicSoundtrack !== 'undefined') {
        DynamicSoundtrack.setIntensityParameter('blackout', true);
      }
      if (typeof ProceduralAudio !== 'undefined') {
        // Generate random whispers during blackout
        setTimeout(function() {
          ProceduralAudio.generateWhisper();
        }, 1000 + Math.random() * 2000);
      }
                }
            }
        }
    }

    // ---- DUST UPDATE ----
    function updateDust(dt) {
        if (!dustParticles || !dustParticles.material || !dustParticles.material.uniforms) return;
        dustParticles.material.uniforms.uTime.value = renderTime;
    }

    // ---- HUD & MINIMAP ----
    function updateHUD() {
        if (!hudEls) cacheHudElements();
        if (!hudEls) return;
        var hudVisible = currentDifficulty.showHUD;
        if (hudVisible && hudEls.score && (collectedPellets !== hudLast.collectedPellets || totalPellets !== hudLast.totalPellets)) {
            hudEls.score.textContent = 'Pellets: ' + collectedPellets + ' / ' + totalPellets;
            hudLast.collectedPellets = collectedPellets;
            hudLast.totalPellets = totalPellets;
        }

        // Stamina bar
        var showStamina = currentDifficulty.hasStamina && hudVisible;
        if (hudEls.staminaContainer && showStamina !== hudLast.showStamina) {
            hudEls.staminaContainer.style.display = showStamina ? 'block' : 'none';
            hudLast.showStamina = showStamina;
        }
        if (showStamina && hudEls.staminaFill) {
            var pct = Math.floor((stamina / maxStamina) * 100);
            if (pct !== hudLast.staminaPct) {
                hudEls.staminaFill.style.width = pct + '%';
                hudLast.staminaPct = pct;
            }
            if (staminaDrained !== hudLast.staminaDrained) {
                hudEls.staminaFill.style.background = staminaDrained ? '#cc2222' : (stamina < 30 ? '#ff6600' : '#00cc66');
                hudLast.staminaDrained = staminaDrained;
            }
        }
        // Pac-Man count
        if (hudEls.pacCount) {
            var total = 1 + extraPacmans.length;
            if (total !== hudLast.pacCount) {
                hudEls.pacCount.textContent = total > 1 ? '☠️ x' + total : '';
                hudLast.pacCount = total;
            }
        }
        if (hudEls.lives && playerLives !== hudLast.lives) {
            hudEls.lives.textContent = currentDifficulty.extraLives > 1 ? ('Lives: ' + playerLives) : '';
            hudLast.lives = playerLives;
        }
        if (hudEls.abilities) {
            var abilityText = hudVisible ? buildAbilityHudText() : '';
            if (abilityText !== hudLast.abilities) {
                hudEls.abilities.textContent = abilityText;
                hudLast.abilities = abilityText;
            }
            hudEls.abilities.style.display = hudVisible ? 'block' : 'none';
        }
    }

    function drawMinimap() {
        var container = document.getElementById('minimap-container');
        var visible = shouldShowMinimap() && isGameRunning();
        if (container) container.style.display = visible ? 'block' : 'none';
        if (!visible) return;
        var canvas = document.getElementById('minimap-canvas');
        if (!canvas) return;
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
    setGameState(GAME_STATE.DEAD);

    // Update stats
    playerStats.gamesPlayed++;
    playerStats.gamesLost++;
    playerStats.totalDeaths++;
    playerStats.totalPellets += collectedPellets;
    if (gameElapsed < playerStats.fastestTime) {
        playerStats.fastestTime = gameElapsed;
    }
    incrementDeathCounter();
    checkAchievements();
    savePlayerStats();

    // Phase 5.3: Create ghost if multiplayer is active
    if (typeof Multiplayer !== 'undefined' && Multiplayer.getState().connected) {
        var mpState = Multiplayer.getState();
        if (typeof GhostSystem !== 'undefined') {
            GhostSystem.createGhost(mpState.localPlayerId, {
                position: camera.position,
                state: 'dead'
            });
            console.log('[Game] Player died, created ghost');
        }
    }

    // Visual Enhancements: Death effect
    GameUtils.onPlayerDeath();

        // AI System: End session with loss and record death
        if (typeof SGAIAI !== 'undefined') {
            const aiFeatures = SGAIAI.getFeatures();
            if (aiFeatures.aiGameMaster) {
                SGAIAI.endGameSession({
                    gameId: 'backrooms-pacman',
                    won: false,
                    playtime: gameElapsed,
                    time: gameElapsed,
                });
            }
            SGAIAI.recordBehavior({ type: 'game_death', game: 'backrooms-pacman' });
            SGAIAI.recordDifficultyEvent('death');

            // Analyze fear response if personalized horror is enabled
            if (aiFeatures.personalizedHorror) {
                SGAIAI.analyzeFearResponse({
                    fearType: 'chase',
                    intensity: 0.9,
                    playerResponse: {
                        quitAfter: false,
                    },
                });
            }
        }

        HorrorAudio.playJumpScare(); setTimeout(function () { HorrorAudio.playDeath(); }, 400);
        HorrorAudio.stopHeartbeat(); HorrorAudio.stopDrone();
        try { document.exitPointerLock(); } catch (e) { }
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        document.getElementById('minimap-container').style.display = 'none';
        if (distortionOverlay) distortionOverlay.style.opacity = '0';
        var retryBtn = document.querySelector('#game-over-screen .play-btn');
        if (retryBtn) retryBtn.onclick = restartGame;

        // Accessibility: trap focus in the game over dialog.
        try {
            var modal = document.getElementById('game-over-screen');
            if (window.A11y && typeof window.A11y.trapFocus === 'function') {
                window.A11y.trapFocus(modal, { initialFocus: retryBtn });
            } else if (retryBtn && retryBtn.focus) {
                retryBtn.focus({ preventScroll: true });
            }
        } catch (e) { }
    }

    function gameWin() {
        setGameState(GAME_STATE.WIN);

        // Update stats
        playerStats.gamesPlayed++;
        playerStats.gamesWon++;
        playerStats.totalPellets += collectedPellets;
        if (gameElapsed < playerStats.fastestTime) {
            playerStats.fastestTime = gameElapsed;
        }
        checkAchievements();
        savePlayerStats();

        // Activate New Game Plus if first win
        if (!newGamePlus) {
            activateNewGamePlus();
        }

        // AI System: End session with win
        if (typeof SGAIAI !== 'undefined') {
            const aiFeatures = SGAIAI.getFeatures();
            if (aiFeatures.aiGameMaster) {
                SGAIAI.endGameSession({
                    gameId: 'backrooms-pacman',
                    won: true,
                    playtime: gameElapsed,
                    time: gameElapsed,
                });
            }
            SGAIAI.recordBehavior({ type: 'game_win', game: 'backrooms-pacman' });
            SGAIAI.recordDifficultyEvent('objective_complete');
        }

        HorrorAudio.playWin(); HorrorAudio.stopHeartbeat(); HorrorAudio.stopDrone();
        try { document.exitPointerLock(); } catch (e) { }
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        document.getElementById('minimap-container').style.display = 'none';
        if (distortionOverlay) distortionOverlay.style.opacity = '0';
        var retryBtn = document.querySelector('#game-win-screen .play-btn');
        if (retryBtn) retryBtn.onclick = restartGame;

        // Accessibility: trap focus in the win dialog.
        try {
            var modal = document.getElementById('game-win-screen');
            if (window.A11y && typeof window.A11y.trapFocus === 'function') {
                window.A11y.trapFocus(modal, { initialFocus: retryBtn });
            } else if (retryBtn && retryBtn.focus) {
                retryBtn.focus({ preventScroll: true });
            }
        } catch (e) { }
    }

    // ---- EXTRA PAC-MAN SPAWN SYSTEM ----
    function setupExtraSpawnTimers() {
        extraSpawnTimers = [];
        var timers = currentDifficulty.spawnTimers || [];
        for (var i = 0; i < timers.length; i++) {
            extraSpawnTimers.push({ time: timers[i], spawned: false });
        }
    }

    function spawnInitialExtraPacmen() {
        var count = currentDifficulty.initialExtraPacmen || 0;
        for (var i = 0; i < count; i++) spawnExtraPacman(false);
    }

    function spawnExtraPacman(withWarning) {
        var cells = getOpenCells();
        if (!cells || cells.length === 0) return;
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
        var ep = acquireExtraPacman({ x: sx, z: sz });
        if (ep) {
            extraPacmans.push(ep);
            if (withWarning !== false) showSpawnWarning();
        }
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

        // Accessibility: announce the warning for screen readers.
        try {
            if (window.A11y && typeof window.A11y.announce === 'function') {
                window.A11y.announce('Another hunter has spawned. ' + count + ' Pac-Man hunting you.', 'assertive');
            }
        } catch (e) { }

        // Visual Enhancements: Jumpscare effect
        GameUtils.onJumpscare();

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
    var lastFrameTime = 0; // For freeze detection
    var fixedStep = 1 / 60;
    var accumulator = 0;
    var maxSubSteps = 8;
    var renderTime = 0;

    // For render interpolation (store previous sim state each fixed tick).
    var prevPlayerPos = { x: 0, z: 0 };
    var prevCamPos = null;
    var prevCamRot = { x: 0, y: 0, z: 0 };
    var simCamPos = null;
    var simCamRot = { x: 0, y: 0, z: 0 };
    var renderInterpActive = false;

    function capturePrevState() {
        // Player is stored as scalar x/z (not a THREE.Vector3)
        prevPlayerPos.x = playerPos.x;
        prevPlayerPos.z = playerPos.z;

        // Camera might not exist early during startup.
        if (camera && camera.position) {
            if (!prevCamPos) prevCamPos = new THREE.Vector3();
            prevCamPos.copy(camera.position);
            prevCamRot.x = camera.rotation.x;
            prevCamRot.y = camera.rotation.y;
            prevCamRot.z = camera.rotation.z;
        }

        // Interpolate main pacman(s) if present.
        var all = [];
        if (pacman) all.push(pacman);
        if (extraPacmans && extraPacmans.length) {
            for (var i = 0; i < extraPacmans.length; i++) all.push(extraPacmans[i]);
        }
        for (var j = 0; j < all.length; j++) {
            var o = all[j];
            if (!o || !o.position || !o.userData) continue;
            if (!o.userData.prevPos) o.userData.prevPos = new THREE.Vector3();
            o.userData.prevPos.copy(o.position);
            if (!o.userData.prevQuat) o.userData.prevQuat = new THREE.Quaternion();
            o.userData.prevQuat.copy(o.quaternion);
        }
    }

    function applyInterpolatedRender(alpha) {
        renderInterpActive = false;
        // Camera interpolation: temporarily override transform for rendering only.
        if (camera && camera.position && prevCamPos) {
            if (!simCamPos) simCamPos = new THREE.Vector3();
            simCamPos.copy(camera.position);
            simCamRot.x = camera.rotation.x;
            simCamRot.y = camera.rotation.y;
            simCamRot.z = camera.rotation.z;

            camera.position.lerpVectors(prevCamPos, simCamPos, alpha);
            camera.rotation.x = prevCamRot.x + (simCamRot.x - prevCamRot.x) * alpha;
            camera.rotation.y = prevCamRot.y + (simCamRot.y - prevCamRot.y) * alpha;
            camera.rotation.z = prevCamRot.z + (simCamRot.z - prevCamRot.z) * alpha;
            renderInterpActive = true;
        }

        // Pacman interpolation: temporarily override positions for rendering only.
        var all = [];
        if (pacman) all.push(pacman);
        if (extraPacmans && extraPacmans.length) {
            for (var i = 0; i < extraPacmans.length; i++) all.push(extraPacmans[i]);
        }
        for (var k = 0; k < all.length; k++) {
            var o = all[k];
            if (!o || !o.position || !o.userData || !o.userData.prevPos) continue;
            if (!o.userData._simPos) o.userData._simPos = new THREE.Vector3();
            o.userData._simPos.copy(o.position);
            o.position.lerpVectors(o.userData.prevPos, o.userData._simPos, alpha);
            if (!o.userData._simQuat) o.userData._simQuat = new THREE.Quaternion();
            o.userData._simQuat.copy(o.quaternion);
            if (o.userData.prevQuat) o.quaternion.slerpQuaternions(o.userData.prevQuat, o.userData._simQuat, alpha);
            o.userData._renderInterpApplied = true;
            renderInterpActive = true;
        }
    }

    function restoreAfterRender() {
        if (!renderInterpActive) return;

        if (camera && camera.position && simCamPos) {
            camera.position.copy(simCamPos);
            camera.rotation.x = simCamRot.x;
            camera.rotation.y = simCamRot.y;
            camera.rotation.z = simCamRot.z;
        }

        var all = [];
        if (pacman) all.push(pacman);
        if (extraPacmans && extraPacmans.length) {
            for (var i = 0; i < extraPacmans.length; i++) all.push(extraPacmans[i]);
        }
        for (var k = 0; k < all.length; k++) {
            var o = all[k];
            if (!o || !o.position || !o.userData || !o.userData._renderInterpApplied || !o.userData._simPos) continue;
            o.position.copy(o.userData._simPos);
            if (o.userData._simQuat) o.quaternion.copy(o.userData._simQuat);
            o.userData._renderInterpApplied = false;
        }
    }

    // Freeze detection watchdog — restarts game loop if stalled > 2s
    setInterval(function () {
        if (!isGameRunning()) return;
        var now = performance.now();
        if (lastFrameTime > 0 && (now - lastFrameTime) > 2000) {
            console.warn('[Backrooms] Freeze detected! Restarting game loop...');
            lastTime = now;
            try { requestAnimationFrame(animate); } catch (e) { /* safety */ }
        }
    }, 1000);

    function animate(time) {
        if (!isGameRunning()) return;
        requestAnimationFrame(animate);
        if (!time) time = performance.now();

        var frameDt = (time - lastTime) / 1000;
        if (!isFinite(frameDt) || frameDt < 0) frameDt = 0;
        // Clamp hard to avoid "spiral of death" on tab switch / hitches.
        if (frameDt > 0.25) frameDt = 0.25;
        lastTime = time;
        lastFrameTime = time; // Track for freeze detection

        renderTime += frameDt;
        accumulator += frameDt;
        var subSteps = 0;

        try {
            if (window.ChallengeManager) {
                ChallengeManager.notify('backrooms-pacman', 'time', gameElapsed);
            }

            // AI Game Master update (if available)
            if (typeof SGAIAI !== 'undefined' && SGAIAI.getFeatures().aiGameMaster) {
                const directorInstructions = SGAIAI.updateGameMaster({
                    player: {
                        health: 100, // This game doesn't have health
                        inDanger: visualIntensity > 0.5,
                        inSafeZone: false,
                        position: { x: playerPos.x, z: playerPos.z },
                    },
                    enemies: {
                        nearby: 1 + extraPacmans.length,
                    },
                     environment: {
                         dark: true,
                     },
                }, frameDt);

                // Apply director recommendations
                if (directorInstructions && directorInstructions.recommendations) {
                    directorInstructions.recommendations.forEach(rec => {
                        if (rec.system === 'horror' && rec.params) {
                            // Could trigger personalized horror events
                        }
                    });
                }
            }

            // Dynamic Difficulty (if available)
            if (typeof SGAIAI !== 'undefined' && SGAIAI.getFeatures().dynamicDifficulty !== 'basic') {
                SGAIAI.recordDifficultyEvent('time_in_danger', {
                    inDanger: visualIntensity > 0.6,
                });
            }

            while (accumulator >= fixedStep && subSteps < maxSubSteps) {
                capturePrevState();

                updateAbilityTimers(fixedStep);
                updatePlayer(fixedStep);
                updatePacman(fixedStep);
                updatePellets();
                updateFlickeringLights(fixedStep);
                updateBlackout(fixedStep);
                updateExtraSpawns(fixedStep);
updateVisualAtmosphere(fixedStep); // Phase 1: Visual Atmosphere

// Phase 8: Unified Audio Integration (replaces individual audio updates)
if (typeof Phase8AudioIntegration !== 'undefined' && Phase8AudioIntegration.update) {
    Phase8AudioIntegration.update(
        fixedStep,
        playerPos,
        pacman ? pacman.position : null,
        {
            isRunning: isRunning,
            isMoving: currentSpeed > 0.1,
            blackoutActive: blackoutActive,
            jumpscareActive: false
        }
    );
} else {
    updateAudioSystem(fixedStep); // Fallback to legacy system
}

checkSecretRoomDiscovery(); // Phase 3: Check for secret rooms
updateProgressionSystems(fixedStep); // Phases 7-10: Progression Systems

// PHASE 3 & 4 INTEGRATED UPDATES
if (typeof Phase3_4_Integration !== 'undefined') {
    Phase3_4_Integration.update(
        fixedStep,
        playerPos,
        pacman ? pacman.position : null,
        {
            blackoutActive: blackoutActive,
            sanity: typeof SanitySystem !== 'undefined' ? SanitySystem.getSanity() : 100,
            stress: typeof StressSystem !== 'undefined' ? StressSystem.getStress() : 0
        }
    );
}

// Phase 1 updates
if (typeof AdvancedLighting !== 'undefined') {
    AdvancedLighting.updateLights(fixedStep, renderTime);
}
if (typeof DecaySystem !== 'undefined') {
    var currentSanity = (typeof BackroomsEnhancements !== 'undefined') ? 
        BackroomsEnhancements.sanity.sanity : 100;
    DecaySystem.update(fixedStep, playerPos, pacman ? pacman.position : null, currentSanity);
}
if (typeof DynamicEnvironment !== 'undefined') {
    var currentSanity2 = (typeof BackroomsEnhancements !== 'undefined') ? 
        BackroomsEnhancements.sanity.sanity : 100;
    DynamicEnvironment.update(fixedStep, playerPos, pacman ? pacman.position : null, currentSanity2, blackoutActive);
}

// Phase 2: AI Systems Updates (UNIFIED INTEGRATION)
if (typeof Phase2AIIntegration !== 'undefined') {
    // Use unified integration system for coordinated AI behavior
    var allPacmans = [];
    if (pacman) allPacmans.push(pacman);
    if (extraPacmans && extraPacmans.length) allPacmans = allPacmans.concat(extraPacmans);
    
    Phase2AIIntegration.update(
        fixedStep,
        playerPos,
        pacman ? pacman.position : null,
        extraPacmans,
        {
            isRunning: isRunning,
            nearEnemies: allPacmans.length,
            gameState: gameState
        }
    );
} else {
    // Fallback to individual system updates if integration not available
    if (typeof AILearner !== 'undefined') {
        AILearner.recordPlayerPosition(playerPos, Date.now());
    }
    if (typeof MultiAgentPacman !== 'undefined') {
        MultiAgentPacman.update(fixedStep, playerPos, pacman ? pacman.position : null);
    }
    if (typeof EnemyVariants !== 'undefined') {
        var activeVariants = EnemyVariants.getActiveVariants();
        for (var i = 0; i < activeVariants.length; i++) {
            EnemyVariants.updateVariant(activeVariants[i], fixedStep, playerPos);
        }
    }
    if (typeof ThreatAssessment !== 'undefined') {
        ThreatAssessment.update(fixedStep);
        if (pacman) {
            ThreatAssessment.updatePlayerSighting(playerPos);
        }
    }
}

// Phase 4: Psychological Horror Updates
var currentSanityVal = 100;
if (typeof SanitySystem !== 'undefined') {
    var isHiding = false;
    SanitySystem.update(fixedStep, playerPos, pacman ? pacman.position : null, blackoutActive, isHiding);
    currentSanityVal = SanitySystem.getSanity();
    SanitySystem.updateSanityHUD();
}

if (typeof StressSystem !== 'undefined') {
    StressSystem.update(fixedStep, playerPos, pacman ? pacman.position : null, currentSanityVal, blackoutActive, isRunning);
    StressSystem.updateStressHUD();
    StressSystem.applyStressEffects(camera);
}

if (typeof JumpscareSystem !== 'undefined') {
    JumpscareSystem.update(fixedStep, playerPos, pacman ? pacman.position : null, currentSanityVal, blackoutActive);
}

if (typeof HorrorDirector !== 'undefined') {
    HorrorDirector.update(fixedStep,
        { sanity: currentSanityVal, stress: StressSystem.getStress() },
        { nearby: 1 + (extraPacmans ? extraPacmans.length : 0) },
        { dark: true, blackout: blackoutActive }
    );
}

// Phase 5: Multiplayer & Social Updates
if (typeof Multiplayer !== 'undefined' && Multiplayer.getState().connected) {
    Multiplayer.updatePlayerPosition(
        camera.position,
        { x: camera.rotation.y, y: camera.rotation.x }
    );
    Multiplayer.updatePlayerState({
        sanity: currentSanityVal,
        stress: StressSystem ? StressSystem.getStress() : 0,
        pellets: collectedPellets
    });
}

if (typeof GhostSystem !== 'undefined') {
    var livingPlayers = Multiplayer.getState ? Multiplayer.getRemotePlayers() : [];
    var ghosts = GhostSystem.getGhosts();
    for (var ghostId in ghosts) {
        GhostSystem.updateGhost(ghosts[ghostId], fixedStep, livingPlayers);
    }
}

if (typeof VoiceChat !== 'undefined' && VoiceChat.isLocalPlayerSpeaking) {
    var isSpeaking = VoiceChat.isLocalPlayerSpeaking();
    if (isSpeaking && Multiplayer.setPlayerSpeaking) {
        Multiplayer.setPlayerSpeaking(Multiplayer.getState().localPlayerId, true);
    }
}

// Phase 6: Abilities & Combat Updates
if (typeof ExpandedAbilities !== 'undefined') {
    var activeEffects = ExpandedAbilities.getActiveEffects();
    if (activeEffects.possession && playerPos) {
        ExpandedAbilities.controlPossessedPacman(playerPos);
    }
}

if (typeof CraftingSystem !== 'undefined') {
    var collected = CraftingSystem.collectResource(playerPos, 2);
    if (collected.length > 0) {
        console.log('[Phase 6.2] Collected resources:', collected);
    }
}

if (typeof DefensiveMechanics !== 'undefined') {
    DefensiveMechanics.updateHiding(fixedStep, playerPos);
    var enemies = [];
    if (pacman) enemies.push(pacman);
    if (extraPacmans) enemies = enemies.concat(extraPacmans);
    DefensiveMechanics.updateTraps(fixedStep, enemies);
}

// Phase 7: Story & Progression Updates
if (typeof StoryElements !== 'undefined') {
    StoryElements.checkCollection(playerPos, 2);
    StoryElements.renderWallMessages(camera);
}

if (typeof QuestSystem !== 'undefined') {
    QuestSystem.updateProgress('time', fixedStep);
}

if (typeof CharacterProgression !== 'undefined') {
    CharacterProgression.addXP(fixedStep * 0.1);
}

                accumulator -= fixedStep;
                subSteps++;
            }
            if (subSteps >= maxSubSteps) {
                // Drop remainder to prevent a runaway catch-up loop.
                accumulator = 0;
            }

            updateHUD();
            drawMinimap();
        } catch (loopErr) {
            console.error('[Backrooms] Game loop error (recovered):', loopErr);
        }

        // Render with Motion Blur
        try {
            var alpha = fixedStep > 0 ? (accumulator / fixedStep) : 0;
            if (alpha < 0) alpha = 0;
            if (alpha > 1) alpha = 1;
            applyInterpolatedRender(alpha);

            // Render-rate visual animation + GPU dust uniform update
            updatePacmanRenderAnimations(renderTime);
            updateDust(frameDt);

            var dy = camera && camera.rotation ? (camera.rotation.y - lastYaw) : 0;
            var dp = camera && camera.rotation ? (camera.rotation.x - lastPitch) : 0;
            // Handle wrap-around for yaw
            if (Math.abs(dy) > Math.PI) dy = dy > 0 ? dy - Math.PI * 2 : dy + Math.PI * 2;

            if (blurMaterial) {
                // Strength multiplier
                var s = 0.5;
                blurMaterial.uniforms.uVelocity.value.set(dy * s, dp * s);
            }
            if (camera && camera.rotation) {
                lastYaw = camera.rotation.y;
                lastPitch = camera.rotation.x;
            } else {
                lastYaw = 0;
                lastPitch = 0;
            }

// Phase 1.1: Advanced Lighting Render Pass
if (typeof AdvancedLighting !== 'undefined') {
    // Apply ray-marched shadows
    AdvancedLighting.applyRayMarchedShadows();
    
    // Render volumetric lighting pass
    AdvancedLighting.renderVolumetricPass();
}

if (blurTarget) {
    renderer.setRenderTarget(blurTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    blurMaterial.uniforms.tDiffuse.value = blurTarget.texture;
    renderer.render(blurScene, blurCamera);
} else {
    renderer.render(scene, camera);
}

restoreAfterRender();
} catch (renderErr) {
		console.error('[Backrooms] Render error (recovered):', renderErr);
	}
}

/**
 * Cleanup function to prevent memory leaks
 * Call this when game state changes or game is stopped
 */
function cleanupGame() {
	console.log('[Backrooms] Cleaning up game resources...');

	// Remove event listeners
	window.removeEventListener('resize', window.resizeListener);
	document.removeEventListener('keydown', window.keydownListener);
	document.removeEventListener('keyup', window.keyupListener);
	document.removeEventListener('mousemove', window.mousemoveListener);
	document.removeEventListener('pointerlockchange', window.pointerlockListener);

	// Clear animation frames
	if (window.animationFrameId) {
		cancelAnimationFrame(window.animationFrameId);
		window.animationFrameId = null;
	}

	// Clear intervals
	if (window.gameInterval) {
		clearInterval(window.gameInterval);
		window.gameInterval = null;
	}
	if (window.aiInterval) {
		clearInterval(window.aiInterval);
		window.aiInterval = null;
	}

	// Stop audio
	if (backgroundMusic) {
		backgroundMusic.pause();
		backgroundMusic.src = '';
	}

	// Dispose Three.js resources
	if (renderer) {
		renderer.dispose();
		renderer.forceContextLoss();
		renderer.domElement.removeEventListener('click', window.canvasClickListener);
	}

	if (scene) {
		// Traverse and dispose all geometries and materials
		scene.traverse((object) => {
			if (object.geometry) {
				object.geometry.dispose();
			}
			if (object.material) {
				if (Array.isArray(object.material)) {
					object.material.forEach(m => m.dispose());
				} else {
					object.material.dispose();
				}
			}
		});
	}

	// Clear references
	scene = null;
	camera = null;
	renderer = null;
	blurMaterial = null;
	blurTarget = null;

	console.log('[Backrooms] Cleanup complete');
}

// Store listeners for cleanup
window.resizeListener = null;
window.keydownListener = null;
window.keyupListener = null;
window.mousemoveListener = null;
window.pointerlockListener = null;
window.canvasClickListener = null;
window.animationFrameId = null;
window.gameInterval = null;
window.aiInterval = null;

// Expose cleanup function globally
window.cleanupBackroomsGame = cleanupGame;

})();
