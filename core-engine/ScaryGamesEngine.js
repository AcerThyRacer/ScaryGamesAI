/**
 * ScaryGamesAI Core Engine v1.0
 * Unified game engine architecture for all 29 games
 * 
 * Features:
 * - WebGPU/WebGL rendering with automatic fallback
 * - Advanced physics engine
 * - Spatial 3D audio
 * - Neural AI director
 * - Horror narrative engine
 * - Player analytics
 * - Monetization manager
 * 
 * @version 1.0.0
 * @author ScaryGamesAI Team
 */

class ScaryGamesEngine {
    constructor(config = {}) {
        console.log('[ScaryGamesEngine] Initializing core engine...');
        
        // Engine configuration
        this.config = {
            targetFPS: config.targetFPS || 60,
            maxDeltaTime: config.maxDeltaTime || 100, // ms
            autoPause: config.autoPause !== false,
            debug: config.debug || false,
            ...config
        };
        
        // Core systems
        this.renderer = null;
        this.physics = null;
        this.audio = null;
        this.ai = null;
        this.narrative = null;
        this.analytics = null;
        this.monetization = null;
        
        // Game state
        this.state = {
            isRunning: false,
            isPaused: false,
            deltaTime: 0,
            elapsedTime: 0,
            frameCount: 0,
            lastFrameTime: 0,
            fps: 0
        };
        
        // Event system
        this.events = new EventTarget();
        
        // Initialize core systems
        this._initializeSystems();
        
        console.log('[ScaryGamesEngine] Core engine initialized successfully');
    }
    
    /**
     * Initialize all core systems
     * @private
     */
    _initializeSystems() {
        // Renderer (auto-detects best available)
        if (typeof WebGPURenderer2026 !== 'undefined') {
            this.renderer = new WebGPURenderer2026(this.config);
            console.log('[ScaryGamesEngine] WebGPU renderer initialized');
        } else if (typeof THREE !== 'undefined') {
            this.renderer = new LegacyWebGLRenderer(this.config);
            console.log('[ScaryGamesEngine] WebGL renderer initialized (fallback)');
        } else {
            this.renderer = new CanvasRenderer(this.config);
            console.log('[ScaryGamesEngine] Canvas renderer initialized (basic fallback)');
        }
        
        // Physics engine
        this.physics = new AdvancedPhysicsEngine(this.config);
        
        // Audio engine
        this.audio = new SpatialAudio3D(this.config);
        
        // AI director
        this.ai = new NeuralAIDirector(this.config);
        
        // Narrative engine
        this.narrative = new HorrorNarrativeEngine(this.config);
        
        // Analytics
        this.analytics = new PlayerAnalytics(this.config);
        
        // Monetization
        this.monetization = new MonetizationManager(this.config);
    }
    
    /**
     * Start the game loop
     * @param {Object} gameInstance - The game instance to run
     */
    async start(gameInstance) {
        if (this.state.isRunning) {
            console.warn('[ScaryGamesEngine] Engine already running');
            return;
        }
        
        console.log('[ScaryGamesEngine] Starting game loop...');
        
        this.gameInstance = gameInstance;
        this.state.isRunning = true;
        this.state.isPaused = false;
        this.state.lastFrameTime = performance.now();
        
        // Initialize game instance
        if (gameInstance.init) {
            await gameInstance.init(this);
        }
        
        // Emit start event
        this.events.dispatchEvent(new CustomEvent('engine:start'));
        
        // Start game loop
        this._gameLoop();
    }
    
    /**
     * Stop the game loop
     */
    stop() {
        if (!this.state.isRunning) return;
        
        console.log('[ScaryGamesEngine] Stopping engine...');
        
        this.state.isRunning = false;
        
        // Emit stop event
        this.events.dispatchEvent(new CustomEvent('engine:stop'));
        
        // Cleanup game instance
        if (this.gameInstance?.destroy) {
            this.gameInstance.destroy();
        }
    }
    
    /**
     * Pause the game
     */
    pause() {
        if (!this.state.isRunning || this.state.isPaused) return;
        
        console.log('[ScaryGamesEngine] Pausing engine...');
        this.state.isPaused = true;
        
        // Emit pause event
        this.events.dispatchEvent(new CustomEvent('engine:pause'));
    }
    
    /**
     * Resume the game
     */
    resume() {
        if (!this.state.isRunning || !this.state.isPaused) return;
        
        console.log('[ScaryGamesEngine] Resuming engine...');
        this.state.isPaused = false;
        this.state.lastFrameTime = performance.now();
        
        // Emit resume event
        this.events.dispatchEvent(new CustomEvent('engine:resume'));
    }
    
    /**
     * Main game loop
     * @private
     */
    _gameLoop() {
        if (!this.state.isRunning) return;
        
        requestAnimationFrame((currentTime) => {
            if (this.state.isPaused) {
                this._gameLoop();
                return;
            }
            
            // Calculate delta time
            const deltaTime = currentTime - this.state.lastFrameTime;
            this.state.lastFrameTime = currentTime;
            
            // Clamp delta time to prevent spiral of death
            const clampedDelta = Math.min(deltaTime, this.config.maxDeltaTime);
            this.state.deltaTime = clampedDelta / 1000; // Convert to seconds
            this.state.elapsedTime += this.state.deltaTime;
            this.state.frameCount++;
            
            // Calculate FPS every second
            if (this.state.frameCount % 60 === 0) {
                this.state.fps = Math.round(1 / this.state.deltaTime);
            }
            
            // Update systems
            this._updateSystems();
            
            // Update game instance
            if (this.gameInstance?.update) {
                this.gameInstance.update(this.state.deltaTime, this.state.elapsedTime);
            }
            
            // Render
            if (this.gameInstance?.render) {
                this.gameInstance.render(this.renderer);
            }
            
            // Continue loop
            this._gameLoop();
        });
    }
    
    /**
     * Update all systems
     * @private
     */
    _updateSystems() {
        const dt = this.state.deltaTime;
        const elapsed = this.state.elapsedTime;
        
        // Update physics
        if (this.physics?.update) {
            this.physics.update(dt, elapsed);
        }
        
        // Update audio
        if (this.audio?.update) {
            this.audio.update(dt, elapsed);
        }
        
        // Update AI
        if (this.ai?.update) {
            this.ai.update(dt, elapsed);
        }
        
        // Update narrative
        if (this.narrative?.update) {
            this.narrative.update(dt, elapsed);
        }
        
        // Update analytics
        if (this.analytics?.update) {
            this.analytics.update(dt, elapsed);
        }
        
        // Update monetization
        if (this.monetization?.update) {
            this.monetization.update(dt, elapsed);
        }
    }
    
    /**
     * Register event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    on(event, handler) {
        this.events.addEventListener(event, handler);
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    off(event, handler) {
        this.events.removeEventListener(event, handler);
    }
    
    /**
     * Dispatch custom event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data = {}) {
        this.events.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
    
    /**
     * Get engine statistics
     * @returns {Object} Engine stats
     */
    getStats() {
        return {
            fps: this.state.fps,
            deltaTime: this.state.deltaTime,
            elapsedTime: this.state.elapsedTime,
            frameCount: this.state.frameCount,
            isRunning: this.state.isRunning,
            isPaused: this.state.isPaused
        };
    }
    
    /**
     * Resize engine canvas
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width, height) {
        if (this.renderer?.resize) {
            this.renderer.resize(width, height);
        }
        
        // Emit resize event
        this.events.dispatchEvent(new CustomEvent('engine:resize', { 
            detail: { width, height } 
        }));
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScaryGamesEngine;
} else {
    window.ScaryGamesEngine = ScaryGamesEngine;
}
