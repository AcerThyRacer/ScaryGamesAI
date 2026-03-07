/**
 * GAME MANAGER - Central Game Loop Orchestration
 * Coordinates all 70+ modules with proper update order and timing
 */

var GameManager = (function() {
    'use strict';
    
    // Configuration
    var config = {
        targetFPS: 60,
        maxFrameTime: 1000 / 30, // Minimum 30 FPS
        enableStats: true,
        enableDebug: false,
        autoStart: false
    };
    
    // State
    var state = {
        systems: {},
        updateOrder: [],
        isRunning: false,
        isPaused: false,
        lastTime: 0,
        frameCount: 0,
        fps: 0,
        fpsUpdateTime: 0,
        totalTime: 0,
        deltaTime: 0,
        frameTime: 0,
        accumulatedTime: 0,
        fixedTimeStep: 1000 / 60, // 16.67ms
        animationFrameId: null
    };
    
    // Statistics
    var stats = {
        frames: 0,
        updateTimes: {},
        slowestFrames: [],
        averageFrameTime: 0,
        memoryUsage: 0
    };
    
    /**
     * Register a system with the game manager
     * @param {string} name - System name
     * @param {object} system - System object with update/init/start/stop methods
     * @param {number} priority - Update priority (lower = earlier)
     */
    function registerSystem(name, system, priority) {
        if (state.systems[name]) {
            console.warn('[GameManager] System already registered:', name);
            return;
        }
        
        state.systems[name] = {
            instance: system,
            priority: priority || 100,
            enabled: true,
            lastUpdateTime: 0,
            totalUpdateTime: 0,
            updateCount: 0
        };
        
        // Insert into update order (sorted by priority)
        var orderEntry = { name: name, priority: priority || 100 };
        var inserted = false;
        
        for (var i = 0; i < state.updateOrder.length; i++) {
            if (state.updateOrder[i].priority > priority) {
                state.updateOrder.splice(i, 0, orderEntry);
                inserted = true;
                break;
            }
        }
        
        if (!inserted) {
            state.updateOrder.push(orderEntry);
        }
        
        // Initialize system if it has init method
        if (system.init) {
            try {
                system.init();
                if (config.enableDebug) {
                    console.log('[GameManager] Initialized system:', name);
                }
            } catch (error) {
                console.error('[GameManager] Failed to initialize system:', name, error);
            }
        }
        
        if (config.enableDebug) {
            console.log('[GameManager] Registered system:', name, '(priority:', priority + ')');
        }
    }
    
    /**
     * Unregister a system
     * @param {string} name - System name
     */
    function unregisterSystem(name) {
        if (!state.systems[name]) {
            console.warn('[GameManager] System not found:', name);
            return;
        }
        
        // Call stop if exists
        if (state.systems[name].instance.stop) {
            try {
                state.systems[name].instance.stop();
            } catch (error) {
                console.error('[GameManager] Error stopping system:', name, error);
            }
        }
        
        // Remove from systems
        delete state.systems[name];
        
        // Remove from update order
        state.updateOrder = state.updateOrder.filter(function(entry) {
            return entry.name !== name;
        });
        
        if (config.enableDebug) {
            console.log('[GameManager] Unregistered system:', name);
        }
    }
    
    /**
     * Enable or disable a system
     * @param {string} name - System name
     * @param {boolean} enabled - Enabled state
     */
    function setSystemEnabled(name, enabled) {
        if (!state.systems[name]) {
            console.warn('[GameManager] System not found:', name);
            return;
        }
        
        state.systems[name].enabled = enabled;
        
        if (config.enableDebug) {
            console.log('[GameManager] System', name, enabled ? 'enabled' : 'disabled');
        }
    }
    
    /**
     * Start the game loop
     */
    function start() {
        if (state.isRunning) {
            console.warn('[GameManager] Game already running');
            return;
        }
        
        state.isRunning = true;
        state.isPaused = false;
        state.lastTime = performance.now();
        state.fpsUpdateTime = state.lastTime;
        state.totalTime = 0;
        
        // Start all systems
        for (var i = 0; i < state.updateOrder.length; i++) {
            var systemName = state.updateOrder[i].name;
            var system = state.systems[systemName].instance;
            
            if (system.start) {
                try {
                    system.start();
                } catch (error) {
                    console.error('[GameManager] Error starting system:', systemName, error);
                }
            }
        }
        
        // Begin game loop
        state.animationFrameId = requestAnimationFrame(gameLoop);
        
        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('game:started', { timestamp: Date.now() });
        }
        
        console.log('[GameManager] Game started - Target FPS:', config.targetFPS);
    }
    
    /**
     * Stop the game loop
     */
    function stop() {
        if (!state.isRunning) return;
        
        state.isRunning = false;
        
        if (state.animationFrameId) {
            cancelAnimationFrame(state.animationFrameId);
            state.animationFrameId = null;
        }
        
        // Stop all systems
        for (var i = 0; i < state.updateOrder.length; i++) {
            var systemName = state.updateOrder[i].name;
            var system = state.systems[systemName].instance;
            
            if (system.stop) {
                try {
                    system.stop();
                } catch (error) {
                    console.error('[GameManager] Error stopping system:', systemName, error);
                }
            }
        }
        
        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('game:stopped', { timestamp: Date.now() });
        }
        
        console.log('[GameManager] Game stopped');
    }
    
    /**
     * Pause the game loop
     */
    function pause() {
        if (!state.isRunning || state.isPaused) return;
        
        state.isPaused = true;
        
        // Pause all systems
        for (var i = 0; i < state.updateOrder.length; i++) {
            var systemName = state.updateOrder[i].name;
            var system = state.systems[systemName].instance;
            
            if (system.pause) {
                try {
                    system.pause();
                } catch (error) {
                    console.error('[GameManager] Error pausing system:', systemName, error);
                }
            }
        }
        
        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('game:paused', { timestamp: Date.now() });
        }
        
        console.log('[GameManager] Game paused');
    }
    
    /**
     * Resume the game loop
     */
    function resume() {
        if (!state.isRunning || !state.isPaused) return;
        
        state.isPaused = false;
        state.lastTime = performance.now();
        
        // Resume all systems
        for (var i = 0; i < state.updateOrder.length; i++) {
            var systemName = state.updateOrder[i].name;
            var system = state.systems[systemName].instance;
            
            if (system.resume) {
                try {
                    system.resume();
                } catch (error) {
                    console.error('[GameManager] Error resuming system:', systemName, error);
                }
            }
        }
        
        // Resume game loop
        state.animationFrameId = requestAnimationFrame(gameLoop);
        
        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('game:resumed', { timestamp: Date.now() });
        }
        
        console.log('[GameManager] Game resumed');
    }
    
    /**
     * Main game loop
     * @param {number} currentTime - Current timestamp
     */
    function gameLoop(currentTime) {
        if (!state.isRunning) return;
        
        state.animationFrameId = requestAnimationFrame(gameLoop);
        
        // Calculate delta time
        state.deltaTime = currentTime - state.lastTime;
        state.lastTime = currentTime;
        
        // Cap delta time to prevent spiral of death
        if (state.deltaTime > config.maxFrameTime) {
            state.deltaTime = config.maxFrameTime;
        }
        
        if (state.isPaused) return;
        
        // Update statistics
        state.frameTime = state.deltaTime;
        state.totalTime += state.deltaTime;
        state.frameCount++;
        
        // Calculate FPS every second
        if (currentTime - state.fpsUpdateTime >= 1000) {
            state.fps = Math.round((state.frameCount * 1000) / (currentTime - state.fpsUpdateTime));
            state.frameCount = 0;
            state.fpsUpdateTime = currentTime;
            
            if (config.enableStats) {
                updateStats();
            }
        }
        
        // Update all systems in priority order
        for (var i = 0; i < state.updateOrder.length; i++) {
            var entry = state.updateOrder[i];
            var systemData = state.systems[entry.name];
            
            if (!systemData.enabled) continue;
            
            var system = systemData.instance;
            
            if (system.update) {
                var startTime = performance.now();
                
                try {
                    system.update(state.deltaTime, state.totalTime);
                } catch (error) {
                    console.error('[GameManager] Error updating system:', entry.name, error);
                }
                
                // Track update time
                var updateTime = performance.now() - startTime;
                systemData.lastUpdateTime = updateTime;
                systemData.totalUpdateTime += updateTime;
                systemData.updateCount++;
                
                if (config.enableDebug && updateTime > 10) {
                    console.warn('[GameManager] Slow system update:', entry.name, '(' + updateTime.toFixed(2) + 'ms)');
                }
            }
        }
        
        // Track slow frames
        if (state.frameTime > 50) {
            stats.slowestFrames.push({
                time: currentTime,
                frameTime: state.frameTime,
                systemTimes: {}
            });
            
            // Keep only last 10 slow frames
            if (stats.slowestFrames.length > 10) {
                stats.slowestFrames.shift();
            }
        }
    }
    
    /**
     * Update statistics
     */
    function updateStats() {
        stats.frames++;
        
        // Calculate average frame time
        var totalUpdate = 0;
        var systemCount = 0;
        
        for (var name in state.systems) {
            var systemData = state.systems[name];
            if (systemData.updateCount > 0) {
                totalUpdate += systemData.lastUpdateTime;
                systemCount++;
            }
        }
        
        stats.averageFrameTime = systemCount > 0 ? totalUpdate / systemCount : 0;
        
        // Memory usage (if available)
        if (window.performance && performance.memory) {
            stats.memoryUsage = performance.memory.usedJSHeapSize;
        }
        
        // Emit stats event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('game:stats', getStats());
        }
    }
    
    /**
     * Get game statistics
     * @returns {object} Game statistics
     */
    function getStats() {
        var systemStats = {};
        
        for (var name in state.systems) {
            var systemData = state.systems[name];
            systemStats[name] = {
                enabled: systemData.enabled,
                lastUpdateTime: systemData.lastUpdateTime,
                averageUpdateTime: systemData.updateCount > 0 ? 
                    systemData.totalUpdateTime / systemData.updateCount : 0,
                updateCount: systemData.updateCount
            };
        }
        
        return {
            fps: state.fps,
            frameTime: state.frameTime,
            deltaTime: state.deltaTime,
            totalTime: state.totalTime,
            isRunning: state.isRunning,
            isPaused: state.isPaused,
            systemCount: state.updateOrder.length,
            systems: systemStats,
            slowestFrames: stats.slowestFrames,
            memoryUsage: stats.memoryUsage,
            averageFrameTime: stats.averageFrameTime
        };
    }
    
    /**
     * Get system by name
     * @param {string} name - System name
     * @returns {object|null} System instance
     */
    function getSystem(name) {
        if (!state.systems[name]) {
            console.warn('[GameManager] System not found:', name);
            return null;
        }
        
        return state.systems[name].instance;
    }
    
    /**
     * Check if system exists
     * @param {string} name - System name
     * @returns {boolean}
     */
    function hasSystem(name) {
        return !!state.systems[name];
    }
    
    /**
     * Get all registered systems
     * @returns {Array<string>} System names
     */
    function getSystemNames() {
        return state.updateOrder.map(function(entry) {
            return entry.name;
        });
    }
    
    /**
     * Set configuration
     * @param {object} newConfig - New configuration
     */
    function setConfig(newConfig) {
        for (var key in newConfig) {
            if (config.hasOwnProperty(key)) {
                config[key] = newConfig[key];
            }
        }
        
        console.log('[GameManager] Configuration updated');
    }
    
    /**
     * Reset all statistics
     */
    function resetStats() {
        stats.frames = 0;
        stats.slowestFrames = [];
        stats.averageFrameTime = 0;
        
        for (var name in state.systems) {
            state.systems[name].totalUpdateTime = 0;
            state.systems[name].updateCount = 0;
        }
        
        console.log('[GameManager] Statistics reset');
    }
    
    // Public API
    return {
        registerSystem: registerSystem,
        unregisterSystem: unregisterSystem,
        setSystemEnabled: setSystemEnabled,
        start: start,
        stop: stop,
        pause: pause,
        resume: resume,
        getStats: getStats,
        getSystem: getSystem,
        hasSystem: hasSystem,
        getSystemNames: getSystemNames,
        setConfig: setConfig,
        resetStats: resetStats,
        
        // State accessors
        isRunning: function() { return state.isRunning; },
        isPaused: function() { return state.isPaused; },
        getFPS: function() { return state.fps; },
        getDeltaTime: function() { return state.deltaTime; },
        getTotalTime: function() { return state.totalTime; },
        
        // Direct state access (use carefully)
        state: state,
        config: config
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.GameManager = GameManager;
}

console.log('[GameManager] Module loaded - Game loop orchestration ready');
