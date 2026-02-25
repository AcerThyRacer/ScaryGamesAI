// Caribbean Conquest - Main Game Controller
// A 3D AAA Pirate Adventure Game

class CaribbeanConquest {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.deltaTime = 0;
        this.lastTime = 0;
        this.gameTime = 0; // In-game time in seconds
        
        // Game state
        this.player = null;
        this.ships = [];
        this.islands = [];
        this.projectiles = [];
        
        // Systems
        this.renderer = null;
        this.ocean = null;
        this.sky = null;
        this.camera = null;
        this.input = null;
        this.weather = null;
        this.physics = null;
        this.combat = null;
        this.ai = null;
        this.quest = null;
        this.skillTree = null;
        this.islandGenerator = null;
        this.factionManager = null;
        this.difficultyManager = null;
        this.dialogueSystem = null;
        this.performanceMonitor = null;
        this.memoryManager = null;
        this.hud = null;
        
        // Loading
        this.loadProgress = 0;
        this.loadSteps = [
            'Initializing renderer...',
            'Creating ocean...',
            'Building sky...',
            'Loading ships...',
            'Setting up camera...',
            'Initializing systems...',
            'Spawning world...',
            'Ready to sail!'
        ];
        
        this.init();
    }
    
    async init() {
        this.updateLoading(0, this.loadSteps[0]);
        
        // Initialize renderer
        this.renderer = new GameRenderer(this);
        await this.renderer.init();
        this.updateLoading(15, this.loadSteps[1]);
        
        // Create ocean
        this.ocean = new Ocean(this);
        await this.ocean.init();
        this.updateLoading(30, this.loadSteps[2]);
        
        // Create sky
        this.sky = new Sky(this);
        await this.sky.init();
        this.updateLoading(40, this.loadSteps[3]);
        
        // Create player ship
        this.player = new PlayerShip(this);
        await this.player.init();
        this.ships.push(this.player);
        this.updateLoading(50, this.loadSteps[4]);
        
        // Setup camera
        this.camera = new CameraController(this);
        await this.camera.init();
        this.updateLoading(60, this.loadSteps[5]);
        
        // Initialize input
        this.input = new InputSystem(this);
        this.input.init();
        
        // Initialize weather
        this.weather = new WeatherSystem(this);
        this.weather.init();
        
        // Initialize enhanced physics
        this.physics = new EnhancedPhysicsEngine(this);
        this.physics.init();
        
        // Initialize enhanced combat
        this.combat = new EnhancedCombatSystem(this);
        this.combat.init();

 // Initialize enhanced AI
 this.ai = new EnhancedAISystem(this);
 this.ai.init();
        
        // Initialize quest system
        this.quest = new QuestSystem(this);
        this.quest.init();
        
        // Initialize skill tree system
        this.skillTree = new SkillTreeSystem(this);
        this.skillTree.init();
        
        // Initialize island generator system
        this.islandGenerator = new IslandGenerator(this);
        this.islandGenerator.init();
        
        // Initialize faction manager system
        this.factionManager = new FactionManager(this);
        this.factionManager.init();
        
        // Initialize difficulty manager system
        this.difficultyManager = new DifficultyManager(this);
        this.difficultyManager.init();
        
        // Initialize dialogue system
        this.dialogueSystem = new DialogueSystem(this);
        this.dialogueSystem.init();
        
        // Initialize performance monitor
        this.performanceMonitor = new PerformanceMonitor(this);
        this.performanceMonitor.init();
        
        // Initialize memory manager
        this.memoryManager = new MemoryManager(this);
        this.memoryManager.init();
        
        this.updateLoading(75, this.loadSteps[6]);
        
        // Spawn initial world
        await this.spawnWorld();
        this.updateLoading(90, this.loadSteps[7]);
        
        // Initialize HUD
        this.hud = new HUD(this);
        this.hud.init();
        
        // Complete loading
        this.updateLoading(100, 'Setting sail...');
        
        setTimeout(() => {
            this.hideLoading();
            this.start();
        }, 500);
    }
    
    updateLoading(percent, text) {
        this.loadProgress = percent;
        const bar = document.getElementById('loading-bar');
        const loadingText = document.getElementById('loading-text');
        if (bar) bar.style.width = percent + '%';
        if (loadingText) loadingText.textContent = text;
    }
    
    hideLoading() {
        const loading = document.getElementById('loading-screen');
        const hud = document.getElementById('hud');
        if (loading) loading.classList.add('hidden');
        if (hud) hud.style.display = 'block';
    }
    
    async spawnWorld() {
        // Spawn some enemy ships for testing
        const enemyPositions = [
            { x: 200, z: 200 },
            { x: -150, z: 300 },
            { x: 400, z: -200 }
        ];
        
        for (const pos of enemyPositions) {
            const ship = new NPCShip(this, {
                type: 'brig',
                faction: 'pirate',
                position: new THREE.Vector3(pos.x, 0, pos.z)
            });
            await ship.init();
            this.ships.push(ship);
        }
    }
    
    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
        
        // Show welcome notification
        this.hud.showNotification('Welcome, Captain!', 'Press WASD to sail, Q/E to fire cannons');
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.gameLoop());
        
        const now = performance.now();
        this.deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = now;
        
        if (this.isPaused) return;
        
        this.gameTime += this.deltaTime;
        
        // Update all systems
        this.update(this.deltaTime);
        
        // Render
        this.render();
    }
    
    update(dt) {
        // Update input
        this.input.update(dt);
        
        // Update weather
        this.weather.update(dt);
        
        // Update physics
        if (this.physics) {
            this.physics.update(dt);
        }
        
        // Update ocean
        this.ocean.update(dt, this.gameTime);
        
        // Update sky
        this.sky.update(dt, this.gameTime);
        
        // Update player
        this.player.update(dt);
        
        // Update all ships
        for (const ship of this.ships) {
            if (ship !== this.player) {
                ship.update(dt);
            }
        }
        
        // Update AI
        this.ai.update(dt);
        
        // Update combat
        this.combat.update(dt);
        
        // Update camera
        this.camera.update(dt);
        
        // Update HUD
        this.hud.update(dt);
        
        // Update quest
        this.quest.update(dt);
        
        // Update skill tree
        if (this.skillTree) {
            this.skillTree.update(dt);
        }
        
        // Update island generator
        if (this.islandGenerator) {
            this.islandGenerator.update(dt);
        }
        
        // Update faction manager
        if (this.factionManager) {
            this.factionManager.update(dt);
        }
        
        // Update difficulty manager
        if (this.difficultyManager) {
            this.difficultyManager.update(dt);
        }
        
        // Update dialogue system
        if (this.dialogueSystem) {
            this.dialogueSystem.update(dt);
        }
        
        // Update performance monitor
        if (this.performanceMonitor) {
            this.performanceMonitor.update(dt);
        }
        
        // Update memory manager
        if (this.memoryManager) {
            this.memoryManager.update(dt);
        }
    }
    
    render() {
        this.renderer.render();
    }
    
    pause() {
        this.isPaused = true;
        document.getElementById('pause-menu').classList.add('active');
    }
    
    resume() {
        this.isPaused = false;
        document.getElementById('pause-menu').classList.remove('active');
    }
}

// Global game instance
let game;

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    game = new CaribbeanConquest();
});

// Global functions for UI
function resumeGame() {
    game.resume();
}

function openSettings() {
    // TODO: Implement settings menu
    console.log('Settings not yet implemented');
}

function saveGame() {
    // TODO: Implement save system
    console.log('Save not yet implemented');
}

function exitToMenu() {
    if (confirm('Are you sure you want to exit?')) {
        window.location.href = '/games.html';
    }
}