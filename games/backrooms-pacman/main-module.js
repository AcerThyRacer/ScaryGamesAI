/* ============================================
   Backrooms: Pac-Man - ES2022 Module Entry Point
   Dynamic imports for optimal code splitting
   ============================================ */

// Import core modules
import { GameLoop, GameStateManager, GAME_STATE, EventSystem } from './core/index.js';

// Lazy load heavy systems on demand
const SystemLoaders = {
    // Phase 1: Visual Systems
    visualEnhancements: () => import('./systems/VisualEnhancements.js'),
    advancedLighting: () => import('./systems/AdvancedLighting.js'),
    decaySystem: () => import('./systems/DecaySystem.js'),
    dynamicEnvironment: () => import('./systems/DynamicEnvironment.js'),
    
    // Phase 2: AI Systems
    aiLearner: () => import('./ai/AILearner.js'),
    multiAgentPacman: () => import('./ai/MultiAgentPacman.js'),
    enemyVariants: () => import('./ai/EnemyVariants.js'),
    threatAssessment: () => import('./ai/ThreatAssessment.js'),
    phase2AIIntegration: () => import('./ai/Phase2AIIntegration.js'),
    
    // Phase 3: Procedural
    proceduralMaze: () => import('./systems/ProceduralMaze.js'),
    biomeSystem: () => import('./systems/BiomeSystem.js'),
    waveFunctionCollapse: () => import('./systems/WaveFunctionCollapse.js'),
    
    // Phase 4: Psychological
    sanitySystem: () => import('./systems/SanitySystem.js'),
    jumpscareSystem: () => import('./systems/JumpscareSystem.js'),
    horrorDirector: () => import('./systems/HorrorDirector.js'),
    
    // Phase 8: Audio
    phase8AudioIntegration: () => import('./audio/Phase8AudioIntegration.js')
};

// Main game class
class BackroomsPacmanGame {
    constructor() {
        this.eventSystem = new EventSystem();
        this.gameState = new GameStateManager(this);
        this.gameLoop = null;
        
        // Game state
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.pacman = null;
        this.playerPos = { x: 0, z: 0 };
        this.gameActive = false;
        this.blackoutActive = false;
        this.visualIntensity = 0;
        this.currentSpeed = 0;
        this.gameElapsed = 0;
        
        // Loaded systems
        this.loadedSystems = new Map();
    }

    async initialize() {
        try {
            // Load critical systems first
            await this.loadCriticalSystems();
            
            // Initialize Three.js scene
            this.initScene();
            
            // Initialize game objects
            await this.initGameObjects();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Create game loop
            this.gameLoop = new GameLoop(this);
            
            // Show start screen
            this.showStartScreen();
            
            console.log('[Backrooms] Game initialized successfully');
        } catch (error) {
            console.error('[Backrooms] Initialization failed:', error);
            this.showError('Failed to initialize game');
        }
    }

    async loadCriticalSystems() {
        // Load only what's needed for initial render
        const [visualEnhancements] = await Promise.all([
            SystemLoaders.visualEnhancements()
        ]);
        
        this.loadedSystems.set('visualEnhancements', visualEnhancements);
    }

    initScene() {
        // Three.js initialization
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        document.body.appendChild(this.renderer.domElement);
    }

    async initGameObjects() {
        // Create maze, pacman, player, etc.
        // This replaces the original init() function
    }

    setupEventListeners() {
        const { signal } = this.eventSystem;
        
        // Keyboard input
        window.addEventListener('keydown', (e) => this.handleKeyDown(e), { signal });
        window.addEventListener('keyup', (e) => this.handleKeyUp(e), { signal });
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize(), { signal });
        
        // Game controls
        document.getElementById('start-button')?.addEventListener('click', () => {
            this.startGame();
        }, { signal });
    }

    startGame() {
        this.gameState.setState(GAME_STATE.PLAYING);
        this.gameLoop.start();
    }

    showStartScreen() {
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.style.display = 'flex';
        }
    }

    hideStartScreen() {
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.style.display = 'none';
        }
    }

    showError(message) {
        console.error(message);
        // Show error UI
    }

    // Game update methods (stubs - implement from original file)
    capturePrevState() {}
    updateAbilityTimers(dt) {}
    updatePlayer(dt) {}
    updatePacman(dt) {}
    updatePellets() {}
    updateFlickeringLights(dt) {}
    updateBlackout(dt) {}
    updateExtraSpawns(dt) {}
    updateVisualAtmosphere(dt) {}
    updateAudioSystem(dt) {}
    checkSecretRoomDiscovery() {}
    updateProgressionSystems(dt) {}
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    applyInterpolatedRender(alpha) {}
    restoreAfterRender() {}
    resumeGame() {}
    pauseGame() {}
    startBlackout() {}
    handleDeath() {}
    handleWin() {}

    // Input handlers
    handleKeyDown(e) {
        // Handle keyboard input
    }

    handleKeyUp(e) {
        // Handle keyboard release
    }

    handleResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    dispose() {
        this.eventSystem.dispose();
        this.gameLoop?.stop();
        this.gameLoop = null;
        
        // Cleanup Three.js
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }
        
        // Unload systems
        this.loadedSystems.clear();
    }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.gameInstance = new BackroomsPacmanGame();
        window.gameInstance.initialize();
    });
} else {
    window.gameInstance = new BackroomsPacmanGame();
    window.gameInstance.initialize();
}

// Export for external access (cheats, mods, etc.)
export default BackroomsPacmanGame;
