# BACKROOMS PACMAN - ACTUAL CODE STRUCTURE ANALYSIS

## 1. MAIN GAME FILE: backrooms-pacman.js (Lines 1-100)

```javascript
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
        // ... more maze rows
    ];
    
    var MAZE = [];
    function cloneMaze() { MAZE = []; for (var r = 0; r < MAZE_ORIGINAL.length; r++) MAZE[r] = MAZE_ORIGINAL[r].slice(); }
    cloneMaze();

    const CELL = 4, WALL_H = 3.5, ROWS = MAZE_ORIGINAL.length, COLS = MAZE_ORIGINAL[0].length;

    // CORE GAME OBJECTS
    let scene, camera, renderer;
    let pellets = [], totalPellets = 0, collectedPellets = 0;
    let pacman = null, pacmanParts = {};
    let extraPacmans = []; // Additional Pac-Men on harder difficulties
    let extraPacmanPool = [];
    const EXTRA_PACMAN_POOL_SIZE = 5;
    
    // PLAYER STATE
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
```

### Key Properties:
- **scene, camera, renderer** - Three.js core objects
- **MAZE** - 2D array representing level layout (0=empty, 1=wall, 2=pellet, 3=player start, 4=safe room)
- **pacman** - Main enemy object with mesh and state
- **playerPos** - Player position as {x, z}
- **gameState** - FSM state machine (MENU, PLAYING, PAUSED, BLACKOUT, DEAD, WIN)
- **stamina/maxStamina** - Sprint mechanic
- **visualIntensity** - Shared state for all visual systems
- **corridorLights** - Dynamic lighting system (max 6 active)

---

## 2. ADVANCED LIGHTING SYSTEM: advanced-lighting.js (Lines 1-80)

```javascript
/**
 * Advanced Lighting System for Backrooms Pacman
 * Implements: Screen-space ray marching, dynamic shadows, volumetric lighting
 * 
 * @author ScaryGamesAI
 * @version 1.0
 */

var AdvancedLighting = (function() {
    'use strict';

    // Configuration
    var config = {
        shadowMapSize: 1024,
        shadowCameraNear: 0.5,
        shadowCameraFar: 50.0,
        shadowBias: 0.0001,
        volumetricEnabled: true,
        rayMarchSteps: 64,
        rayMarchMaxDistance: 20.0
    };

    // State
    var scene = null;
    var renderer = null;
    var camera = null;
    var shadowMap = null;
    var shadowCamera = null;
    var lightShaders = null;
    var volumetricQuad = null;
    var enabled = true;

    // Lights tracking
    var dynamicLights = [];
    var flashlight = null;

    /**
     * Initialize advanced lighting system
     */
    function init(threeScene, threeRenderer, threeCamera) {
        scene = threeScene;
        renderer = threeRenderer;
        camera = threeCamera;

        // Create shadow map render target
        shadowMap = new THREE.WebGLRenderTarget(
            config.shadowMapSize,
            config.shadowMapSize,
            {
                format: THREE.RGBAFormat,
                type: THREE.FloatType,
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter
            }
        );

        // Create orthographic camera for shadow mapping
        shadowCamera = new THREE.OrthographicCamera(
            -10, 10, 10, -10,
            config.shadowCameraNear,
            config.shadowCameraFar
        );

        // Load shaders
        loadShaders();

        // Create volumetric light quad
        if (config.volumetricEnabled) {
            createVolumetricQuad();
        }

        console.log('[AdvancedLighting] Initialized with shadows and volumetrics');
    }

    /**
     * Load shader programs
     */
    function loadShaders() {
        // Volumetric light shader
        lightShaders = {
```

### Key Properties:
- **config** - Holds shadowMapSize (1024), rayMarchSteps (64), rayMarchMaxDistance (20)
- **shadowMap** - WebGLRenderTarget for shadow rendering
- **shadowCamera** - Orthographic camera (-10 to 10 units)
- **dynamicLights[]** - Array of active light sources
- **volumetricQuad** - Screen-space quad for volumetric effects
- **Methods**: init(), loadShaders(), createVolumetricQuad()

---

## 3. SANITY SYSTEM: sanity-system.js (Lines 1-60)

```javascript
/**
 * Sanity System - Full integration with visual/audio hallucinations
 */

var SanitySystem = (function() {
    'use strict';

    var config = {
        maxSanity: 100,
        minSanity: 0,
        baseDrainRate: 0.3,        // Per second
        pacmanNearbyDrain: 1.5,    // When Pac-Man is close
        blackoutDrain: 2.0,        // During blackout events
        hidingRecovery: 0.8,       // In safe zones
        safeZoneRecovery: 0.5,     // In safe rooms
        pelletBonus: 0.2,          // Per pellet collected
        powerPelletBonus: 5.0,     // Power pellet pickup
        hallucinationThreshold: 40, // Sanity level for visual hallucinations
        audioHallucinationThreshold: 30, // For audio hallucinations
        visualDistortionThreshold: 50    // For visual distortion
    };

    var state = {
        current: 100,              // Current sanity value (0-100)
        previous: 100,
        isHallucinating: false,
        visualDistortion: 0,       // 0-1 intensity
        audioDistortion: 0,        // 0-1 intensity
        lastSanityChange: 0
    };

    var scene = null;
    var camera = null;
    var enabled = true;

    function init(threeScene, threeCamera) {
        scene = threeScene;
        camera = threeCamera;
        state.current = config.maxSanity;
        state.previous = config.maxSanity;
        console.log('[SanitySystem] Initialized');
    }

    function update(deltaTime, playerPos, pacmanPos, isBlackout, isHiding) {
        if (!enabled) return;

        state.previous = state.current;
        var now = Date.now();

        // Base drain
        var drainRate = config.baseDrainRate;

        // Pac-Man nearby drain
        if (pacmanPos && playerPos) {
            var dist = new THREE.Vector3(
                playerPos.x - pacmanPos.x,
                0,
                playerPos.z - pacmanPos.z
            ).length();
```

### Key Storage/Access:
- **state.current** - Primary sanity value (0-100)
- **state.isHallucinating** - Boolean flag
- **state.visualDistortion** - 0-1 intensity for visual effects
- **state.audioDistortion** - 0-1 intensity for audio effects
- **Drain conditions**: baseDrainRate (0.3), pacmanNearby (1.5), blackout (2.0)
- **Recovery**: hidingRecovery (0.8), safeZoneRecovery (0.5)
- **Thresholds**: 40 for hallucinations, 30 for audio, 50 for visual distortion

---

## 4. WAVE FUNCTION COLLAPSE: wave-function-collapse.js (Lines 1-60)

```javascript
/**
 * PHASE 3: WAVE FUNCTION COLLAPSE MAZE GENERATION
 * Advanced procedural generation with constraints and room templates
 */

var WaveFunctionCollapse = (function() {
    'use strict';

    var config = {
        gridSize: 20,
        cellSize: 4,
        wallHeight: 3.5,
        
        // Tile types
        tiles: {
            EMPTY: 0,
            WALL: 1,
            PELLET: 2,
            POWER_PELLET: 3,
            SAFE_ROOM: 4,
            TRAP_ROOM: 5,
            TREASURE_ROOM: 6,
            BOSS_ROOM: 7,
            EXIT: 8
        },
        
        // Adjacency rules for WFC
        adjacencyRules: {},
        
        // Room templates
        roomTemplates: [],
        
        // Generation parameters
        entropy: [],
        observed: [],
        superposition: []
    };

    var state = {
        grid: [],
        collapsed: [],
        valid: true,
        seed: Date.now(),
        currentBiome: 'yellow'
    };

    /**
     * Initialize WFC system
     */
    function init(biome) {
        state.currentBiome = biome || 'yellow';
        state.seed = Date.now();
        console.log('[WFC] Initialized for biome:', state.currentBiome);
    }

    /**
     * Generate maze using Wave Function Collapse algorithm
     */
    function generateMaze(width, height, options) {
        config.gridSize = width || 20;
```

### Key Properties:
- **config.tiles** - Enum: EMPTY(0), WALL(1), PELLET(2), POWER_PELLET(3), SAFE_ROOM(4), TRAP_ROOM(5), TREASURE_ROOM(6), BOSS_ROOM(7), EXIT(8)
- **state.grid** - 2D array of collapsed tile values
- **state.currentBiome** - 'yellow' or other biome types
- **config.adjacencyRules** - Constraints for valid neighbor tiles
- **config.entropy** - Tracking uncertainty during collapse
- **Methods**: init(biome), generateMaze(width, height, options)

---

## 5. WEBGPU MIGRATION: webgpu-migration.js (Lines 1-80)

```javascript
/**
 * PHASE 9.2: WebGPU Migration Layer
 * Progressive enhancement from Three.js r128 to WebGPU backend
 * Compute shaders for AI and particles
 * Better multi-GPU utilization
 */

const WebGPUMigration = (function() {
    'use strict';

    // Feature detection
    let adapter = null;
    let device = null;
    let context = null;
    let isSupported = false;
    let useWebGPU = false;

    // Compute pipelines
    let computePipelines = new Map();
    let bindGroups = new Map();
    let computeBuffers = new Map();

    // Configuration
    const config = {
        preferWebGPU: true,
        fallbackToWebGL: true,
        enableComputeShaders: true,
        multiGPU: false,
        debugMode: false
    };

    /**
     * Initialize WebGPU
     */
    async function init(canvas, options = {}) {
        Object.assign(config, options);

        console.log('[WebGPU] Initializing...');

        // Check WebGPU support
        if (!navigator.gpu) {
            console.log('[WebGPU] Not supported, falling back to WebGL');
            if (config.fallbackToWebGL) {
                return { success: false, fallback: 'webgl' };
            }
            throw new Error('WebGPU not supported');
        }

        try {
            // Request adapter
            adapter = await navigator.gpu.requestAdapter({
                powerPreference: config.preferWebGPU ? 'high-performance' : 'default',
                compatibleSurface: canvas
            });

            if (!adapter) {
                throw new Error('Failed to get GPU adapter');
            }

            // Get adapter info
            const adapterInfo = await adapter.requestAdapterInfo();
            console.log('[WebGPU] Adapter:', adapterInfo.device);
            console.log('[WebGPU] Vendor:', adapterInfo.vendor);
            console.log('[WebGPU] Architecture:', adapterInfo.architecture);

            // Request device
            const requiredFeatures = [];
            
            if (config.enableComputeShaders) {
                requiredFeatures.push('shader-f16');
            }

            if (config.multiGPU) {
                // Check for multiple GPUs
                const adapters = await navigator.gpu.requestAdapters();
                if (adapters.length > 1) {
                    console.log('[WebGPU] Multiple GPUs detected:', adapters.length);
                    // Would implement multi-GPU logic here
                }
            }
```

### Key Detection/Fallback:
- **navigator.gpu** - Main detection (if null → fallback to WebGL)
- **adapter** - GPU adapter obtained via requestAdapter()
- **device** - GPU device with compute shader support
- **context** - Canvas WebGPU context
- **config.preferWebGPU** - Boolean flag for high-performance vs default
- **config.fallbackToWebGL** - Enable/disable WebGL fallback
- **requiredFeatures** - Include 'shader-f16' for compute shaders
- **Return pattern**: `{ success: false, fallback: 'webgl' }` when unavailable

---

## 6. PHASE 1 VISUAL REVOLUTION: phase1-visual-revolution.js (Lines 1-80)

```javascript
/**
 * BACKROOMS PACMAN - PHASE 1: NEXT-GEN VISUAL REVOLUTION
 * Ray-traced lighting, PBR materials, advanced post-processing
 */

(function() {
    'use strict';

    // ============================================
    // PHASE 1.1: RAY-TRACED LIGHTING SYSTEM (WebGPU)
    // ============================================
    
    const RayTracedLighting = {
        device: null,
        context: null,
        pipeline: null,
        bindGroup: null,
        
        // Light sources in the scene
        lights: [],
        maxLights: 64,
        
        async init(canvas) {
            if (!navigator.gpu) {
                console.warn('[Phase 1] WebGPU not supported, falling back to WebGL');
                return false;
            }
            
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                console.warn('[Phase 1] No WebGPU adapter found');
                return false;
            }
            
            this.device = await adapter.requestDevice();
            this.context = canvas.getContext('webgpu');
            
            const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
            this.context.configure({
                device: this.device,
                format: canvasFormat,
                alphaMode: 'premultiplied'
            });
            
            await this.createRayTracingPipeline();
            console.log('[Phase 1] Ray-traced lighting initialized');
            return true;
        },
        
        async createRayTracingPipeline() {
            // Compute shader for ray tracing
            const computeShaderCode = `
                @group(0) @binding(0) var outputTexture: texture_storage_2d<rgba8unorm, write>;
                @group(0) @binding(1) var<storage, read> lights: array<Light>;
                @group(0) @binding(2) var<storage, read> geometry: array<Triangle>;
                @group(0) @binding(3) var<uniform> camera: Camera;
                
                struct Light {
                    position: vec3f,
                    color: vec3f,
                    intensity: f32,
                    radius: f32,
                };
                
                struct Triangle {
                    v0: vec3f,
                    v1: vec3f,
                    v2: vec3f,
                    normal: vec3f,
                    material: Material,
                };
                
                struct Material {
                    albedo: vec3f,
                    roughness: f32,
                    metallic: f32,
                    emissive: vec3f,
                };
                
                struct Camera {
```

### Key Integration Points:
- **RayTracedLighting.device** - WebGPU device reference
- **RayTracedLighting.lights[]** - Max 64 lights array
- **computeShaderCode** - WGSL shader for ray tracing
- **Struct definitions**: Light, Triangle, Material, Camera
- **Integration**: Fallback to WebGL if WebGPU unavailable
- **Canvas format**: Uses navigator.gpu.getPreferredCanvasFormat()

---

## 7. DECAY SYSTEM: decay-system.js (Lines 1-60)

```javascript
/**
 * Weathering & Decay System for Backrooms Pacman
 * Implements: Environmental degradation, blood splatters, footprint trails
 * 
 * @author ScaryGamesAI
 * @version 1.0
 */

var DecaySystem = (function() {
    'use strict';

    // Configuration
    var config = {
        decayRate: 0.001,          // How fast environment decays per second
        maxDecay: 0.8,             // Maximum decay level (0-1)
        bloodDecayRate: 0.0005,    // How fast blood fades
        footprintDecayRate: 0.02,  // How fast footprints fade
        maxBloodSplatters: 100,
        maxFootprints: 200,
        enableDecay: true,
        enableBlood: true,
        enableFootprints: true
    };

    // State
    var scene = null;
    var decayLevel = 0;            // Overall decay level (0 to maxDecay)
    var decayTime = 0;
    var bloodSplatters = [];
    var footprints = [];
    var wallDecals = [];
    var floorDecals = [];
    var enabled = true;

    // Texture cache
    var bloodTexture = null;
    var footprintTexture = null;
    var crackTexture = null;

    /**
     * Initialize decay system
     */
    function init(threeScene) {
        scene = threeScene;
        decayLevel = 0;
        decayTime = 0;

        // Create procedural textures
        createDecalTextures();

        console.log('[DecaySystem] Initialized');
    }

    /**
     * Create procedural decal textures
     */
    function createDecalTextures() {
        // Blood splatter texture
        bloodTexture = createBloodTexture();
```

### Key Properties:
- **decayLevel** - 0 to maxDecay (0.8), tracks overall environment degradation
- **decayRate** - 0.001 per second (environmental, not blood)
- **bloodDecayRate** - 0.0005 per second (slower fade)
- **footprintDecayRate** - 0.02 per second (faster fade)
- **bloodSplatters[]** - Array of blood decals (max 100)
- **footprints[]** - Array of footprints (max 200)
- **wallDecals/floorDecals** - Positional decay elements
- **Textures**: bloodTexture, footprintTexture, crackTexture (procedurally generated)

---

## 8. HALLUCINATION SYSTEM: hallucination-system.js (Lines 1-60)

```javascript
/**
 * PHASE 4: PSYCHOLOGICAL HORROR - HALLUCINATIONS & MENTAL BREAKDOWN
 * Advanced sanity system with visual/audio hallucinations and fear mechanics
 */

var HallucinationSystem = (function() {
    'use strict';

    var config = {
        // Hallucination types
        types: {
            VISUAL: 'visual',
            AUDIO: 'audio',
            PERIPHERAL: 'peripheral',
            ENVIRONMENTAL: 'environmental'
        },
        
        // Triggers
        triggers: {
            LOW_SANITY: 50,
            HIGH_STRESS: 70,
            DARKNESS: 0.3,
            ENEMY_PROXIMITY: 8,
            ISOLATION_TIME: 60
        },
        
        // Frequencies
        baseFrequency: 0.1, // Base chance per second
        sanityMultiplier: 3.0, // Multiplier when sanity is low
        stressMultiplier: 2.0 // Multiplier when stressed
    };

    var state = {
        scene: null,
        camera: null,
        activeHallucinations: [],
        hallucinationHistory: [],
        playerSanity: 100,
        playerStress: 0,
        lastHallucinationTime: 0,
        enabled: true
    };

    /**
     * Initialize hallucination system
     */
    function init(scene, camera) {
        state.scene = scene;
        state.camera = camera;
        console.log('[HallucinationSystem] Initialized');
    }

    /**
     * Update hallucination system
     */
    function update(deltaTime, playerPos, pacmanPos, sanity, stress) {
        if (!state.enabled) return;
        
        state.playerSanity = sanity;
        state.playerStress = stress;
```

### Key Triggers & Configuration:
- **config.types**: VISUAL, AUDIO, PERIPHERAL, ENVIRONMENTAL
- **Trigger thresholds**: LOW_SANITY(50), HIGH_STRESS(70), DARKNESS(0.3), ENEMY_PROXIMITY(8), ISOLATION_TIME(60)
- **state.activeHallucinations[]** - Array of currently active hallucinations
- **state.hallucinationHistory[]** - History for pattern analysis
- **baseFrequency** - 0.1 (10% chance per second)
- **sanityMultiplier** - 3.0× when sanity is low
- **stressMultiplier** - 2.0× when stressed
- **playerSanity/playerStress** - Real-time state values

---

## 9. GHOST SYSTEM: ghost-system.js (Lines 1-60)

```javascript
/**
 * Ghost System - Dead players become haunting ghosts
 */

var GhostSystem = (function() {
    'use strict';

    var config = {
        ghostSpeed: 8.0,
        possessDuration: 5,
        scareCooldown: 10,
        maxGhosts: 10
    };

    var ghosts = {};
    var scene = null;
    var enabled = true;

    function init(threeScene) {
        scene = threeScene;
        ghosts = {};
        console.log('[GhostSystem] Initialized');
    }

    function createGhost(playerId, playerData) {
        if (Object.keys(ghosts).length >= config.maxGhosts) {
            console.log('[GhostSystem] Max ghosts reached');
            return null;
        }

        var ghost = {
            id: 'ghost_' + playerId,
            originalPlayerId: playerId,
            position: new THREE.Vector3(
                playerData.position.x,
                playerData.position.y + 1,
                playerData.position.z
            ),
            velocity: new THREE.Vector3(),
            mesh: null,
            state: 'idle',
            scareCooldown: 0,
            possessTarget: null
        };

        ghost.mesh = createGhostMesh(ghost.position);
        if (ghost.mesh) {
            scene.add(ghost.mesh);
        }

        ghosts[playerId] = ghost;
        console.log('[GhostSystem] Created ghost for player', playerId);

        return ghost;
    }

    function createGhostMesh(position) {
        var group = new THREE.Group();

        var geometry = new THREE.SphereGeometry(0.6, 16, 16);
```

### Key Entity Structure:
- **config.ghostSpeed** - 8.0 units/second
- **config.maxGhosts** - 10 concurrent ghosts
- **ghosts{}** - Object keyed by playerId
- **Ghost properties**:
  - id, originalPlayerId
  - position (THREE.Vector3), velocity
  - mesh (THREE.Group or geometry)
  - state ('idle', 'chasing', 'possessing')
  - scareCooldown, possessTarget
- **Methods**: init(scene), createGhost(playerId, data), createGhostMesh(position)

---

## 10. ADVANCED AI: phase2-advanced-ai.js (Lines 1-60)

```javascript
/**
 * BACKROOMS PACMAN - PHASE 2: ADVANCED AI & MACHINE LEARNING
 * Neural network-powered enemies, procedural generation, adaptive difficulty
 */

(function() {
    'use strict';

    // ============================================
    // PHASE 2.1: NEURAL NETWORK-POWERED PAC-MAN AI
    // ============================================
    
    const NeuralPacmanAI = {
        // Neural network weights (simplified for browser)
        weights: {
            inputToHidden: [],
            hiddenToOutput: []
        },
        
        // Player behavior memory
        playerMemory: {
            positions: [],
            decisions: [],
            patterns: {},
            maxMemory: 1000
        },
        
        // AI personality
        personality: {
            aggression: 0.5,
            curiosity: 0.5,
            caution: 0.5,
            playfulness: 0.3
        },
        
        // Emotional state
        emotionalState: {
            excitement: 0,
            frustration: 0,
            confidence: 0.5,
            boredom: 0
        },
        
        init() {
            this.initializeNetwork();
            this.loadPlayerData();
            console.log('[Phase 2] Neural Pac-Man AI initialized');
        },
        
        initializeNetwork() {
            // Initialize neural network with random weights
            const inputSize = 12; // Player pos, velocity, distance, time, etc.
            const hiddenSize = 24;
            const outputSize = 4; // Move directions
            
            // Xavier initialization
            const xavier = (inSize, outSize) => Math.sqrt(2 / (inSize + outSize));
            
            this.weights.inputToHidden = [];
            for (let i = 0; i < inputSize; i++) {
```

### Key AI Architecture:
- **Neural network layers**: inputSize(12), hiddenSize(24), outputSize(4)
- **Inputs**: Player position, velocity, distance, time, etc.
- **Outputs**: Move directions (4 cardinal)
- **Personality traits**: aggression(0.5), curiosity(0.5), caution(0.5), playfulness(0.3)
- **Emotional state**: excitement, frustration, confidence, boredom
- **playerMemory**: positions[], decisions[], patterns{}, maxMemory(1000)
- **Initialization**: Xavier weight initialization

---

## 11. SHADER FILES

### 11.1 Shadow Map Vertex Shader (shadowMap.vert)

```glsl
// Shadow Map Vertex Shader
// For dynamic shadow casting

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
uniform mat4 lightSpaceMatrix;

attribute vec3 position;
attribute vec2 uv;

varying vec2 vUv;
varying vec4 vLightSpacePos;

void main() {
    vUv = uv;
    vLightSpacePos = lightSpaceMatrix * modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

### 11.2 Shadow Map Fragment Shader (shadowMap.frag)

```glsl
// Shadow Map Fragment Shader
// Simple depth rendering for shadow mapping

uniform sampler2D baseTexture;
uniform float alphaTest;

varying vec2 vUv;
varying vec4 vLightSpacePos;

void main() {
    vec4 texColor = texture2D(baseTexture, vUv);
    
    // Alpha test for cutouts
    if (texColor.a < alphaTest) discard;
    
    // Output depth (handled by WebGL automatically)
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
```

### 11.3 Volumetric Light Vertex Shader (volumetricLight.vert)

```glsl
// Volumetric Light Vertex Shader
// Creates god rays and light shafts through dust

attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;

void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vViewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

### 11.4 Volumetric Light Fragment Shader (volumetricLight.frag - First 30 lines)

```glsl
// Volumetric Light Fragment Shader
// Simulates light shafts through dusty air

uniform float time;
uniform vec3 lightColor;
uniform float lightIntensity;
uniform vec3 cameraPosition;
uniform vec3 lightPosition;
uniform float dustDensity;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;

// Noise for dust variation
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy) * 2.0);
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
```

### 11.5 Wall Distortion Vertex Shader (wallDistortion.vert)

```glsl
// Wall Distortion Vertex Shader
// Creates real-time crawling distortion effect on walls

uniform float time;
uniform float intensity;
uniform vec2 pacmanPosition;
varying vec2 vUv;
varying float vDistortion;
varying vec3 vWorldPosition;

// Simplex noise function
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy) * 2.0);
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
```

### 11.6 Wall Distortion Fragment Shader (wallDistortion.frag)

```glsl
// Wall Distortion Fragment Shader
// Creates crawling vein patterns and color shifts

uniform float time;
uniform float intensity;
uniform sampler2D baseTexture;
uniform vec3 bloodColor;
uniform float bloodIntensity;

varying vec2 vUv;
varying float vDistortion;
varying vec3 vWorldPosition;

// Noise functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy) * 2.0);
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
```

---

## SUMMARY: KEY PATTERNS & PROPERTIES

### Global Game State Object Pattern:
```javascript
let gameState = GAME_STATE.MENU;
let scene, camera, renderer;
let playerPos = { x: 0, z: 0 };
let MAZE = [];
```

### Module Pattern Used:
```javascript
var SystemName = (function() {
    'use strict';
    var config = { /* settings */ };
    var state = { /* runtime state */ };
    var scene = null;
    
    function init(scene) { /* ... */ }
    function update(deltaTime) { /* ... */ }
    
    return { init, update, /* public API */ };
})();
```

### Sanity Storage Pattern:
```javascript
var state = {
    current: 100,           // 0-100 scale
    visualDistortion: 0,    // 0-1 intensity
    audioDistortion: 0,     // 0-1 intensity
    isHallucinating: false  // boolean flag
};
```

### WebGPU Detection Pattern:
```javascript
if (!navigator.gpu) {
    return { success: false, fallback: 'webgl' };
}
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
```

### AI Neural Network Pattern:
```javascript
weights: {
    inputToHidden: [],      // 12 → 24
    hiddenToOutput: []      // 24 → 4
}
personality: {
    aggression: 0.5,
    curiosity: 0.5,
    caution: 0.5
}
```
