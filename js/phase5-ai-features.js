/**
 * Phase 5: Advanced AI Features
 * 
 * This module provides sophisticated AI capabilities for game enhancement:
 * - Game Refinement (iterative improvement, bug fixing, feature expansion, style transfer)
 * - Multimodal Generation (image-to-game, audio generation, voice narration)
 * - Smart Assistance (game analyzer, balance calculator, playtest simulator)
 * 
 * @author ScaryGamesAI
 * @version 1.0.0
 */

class Phase5AIFeatures {
    constructor() {
        this.aiSystem = window.AISystem || null;
        this.gameContainer = window.GameContainer || null;
        this.ollama = window.OllamaIntegration || null;
        
        // Feature state
        this.currentAnalysis = null;
        this.styleTransferState = null;
        this.playtestResults = null;
        this.audioGenerator = null;
        this.voiceNarration = null;
        
        // Configuration
        this.config = {
            // Game refinement settings
            refinement: {
                maxIterations: 5,
                difficultyStep: 0.15, // 15% harder per iteration
                enemySpawnRate: 1.2,  // 20% more enemies
                useOllama: true
            },
            // Multimodal settings
            multimodal: {
                imageModel: 'llava',
                audioModel: 'audio-generation',
                voiceModel: 'tts',
                maxGenerationTime: 30000
            },
            // Smart assistance settings
            assistance: {
                playtestIterations: 10,
                analysisDepth: 'comprehensive', // quick, standard, comprehensive
                balanceSampleSize: 100
            }
        };
        
        this._init();
    }
    
    _init() {
        console.log('[Phase5] Initializing Advanced AI Features...');
        
        // Check tier access
        const tier = this.aiSystem?.getFeatureTier?.('phase5') || 'none';
        console.log(`[Phase5] Current tier: ${tier}`);
        
        // Initialize sub-systems
        this._initAudioGeneration();
        this._initVoiceNarration();
        
        // Setup event listeners
        this._setupEventListeners();
        
        console.log('[Phase5] Advanced AI Features initialized');
    }
    
    _setupEventListeners() {
        // Listen for game events
        document.addEventListener('game:loaded', (e) => this._onGameLoaded(e));
        document.addEventListener('game:ended', (e) => this._onGameEnded(e));
    }
    
    _onGameLoaded(event) {
        this.currentGame = event.detail?.gameId;
        console.log(`[Phase5] Game loaded: ${this.currentGame}`);
    }
    
    _onGameEnded(event) {
        // Save game metrics for analysis
        if (event.detail?.metrics) {
            this._storeGameMetrics(event.detail.metrics);
        }
    }
    
    // ============================================
    // SECTION 5.1: GAME REFINEMENT
    // ============================================
    
    /**
     * Make the game harder based on player feedback or automatic analysis
     * @param {string} gameId - The game to modify
     * @param {string} instruction - User instruction (e.g., "Make it harder", "Add more enemies")
     * @returns {Promise<Object>} Result of the refinement
     */
    async refineGame(gameId, instruction) {
        console.log(`[Phase5] Refining game: ${gameId} - "${instruction}"`);
        
        const tier = this.aiSystem?.getFeatureTier?.('phase5') || 'none';
        if (tier === 'none') {
            return { success: false, error: 'Phase 5 features require subscription' };
        }
        
        try {
            // Get current game state
            const gameState = this._getGameState(gameId);
            
            // Analyze the instruction and determine what to change
            const refinementPlan = this._createRefinementPlan(instruction, gameState);
            
            // Apply refinements
            const result = await this._applyRefinement(gameId, refinementPlan);
            
            return {
                success: true,
                gameId,
                instruction,
                changes: refinementPlan.changes,
                result
            };
        } catch (error) {
            console.error('[Phase5] Refinement error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Create a refinement plan based on user instruction
     */
    _createRefinementPlan(instruction, gameState) {
        const instructionLower = instruction.toLowerCase();
        const changes = [];
        
        // Parse instruction and determine changes
        if (instructionLower.includes('hard') || instructionLower.includes('difficult')) {
            changes.push({
                type: 'difficulty',
                property: 'enemySpeed',
                multiplier: 1 + this.config.refinement.difficultyStep
            });
            changes.push({
                type: 'difficulty', 
                property: 'enemyDamage',
                multiplier: 1 + this.config.refinement.difficultyStep
            });
            changes.push({
                type: 'difficulty',
                property: 'spawnRate',
                multiplier: this.config.refinement.enemySpawnRate
            });
        }
        
        if (instructionLower.includes('more enemies') || instructionLower.includes('add enemy')) {
            changes.push({
                type: 'spawn',
                property: 'maxEnemies',
                operation: 'multiply',
                value: 1.5
            });
            changes.push({
                type: 'spawn',
                property: 'spawnInterval',
                operation: 'multiply',
                value: 0.8
            });
        }
        
        if (instructionLower.includes('less enemies') || instructionLower.includes('fewer enemies')) {
            changes.push({
                type: 'spawn',
                property: 'maxEnemies',
                operation: 'multiply',
                value: 0.6
            });
            changes.push({
                type: 'spawn',
                property: 'spawnInterval',
                operation: 'multiply',
                value: 1.3
            });
        }
        
        if (instructionLower.includes('faster') || instructionLower.includes('speed')) {
            changes.push({
                type: 'speed',
                property: 'playerSpeed',
                multiplier: 1.2
            });
            changes.push({
                type: 'speed',
                property: 'enemySpeed',
                multiplier: 1.3
            });
        }
        
        if (instructionLower.includes('slower')) {
            changes.push({
                type: 'speed',
                property: 'playerSpeed',
                multiplier: 0.8
            });
        }
        
        if (instructionLower.includes('scarier') || instructionLower.includes('horror')) {
            changes.push({
                type: 'horror',
                property: 'darkness',
                value: 0.3 // Add 30% darkness
            });
            changes.push({
                type: 'horror',
                property: 'jumpScareChance',
                value: 0.1 // 10% chance increase
            });
            changes.push({
                type: 'horror',
                property: 'ambientSound',
                enable: true
            });
        }
        
        if (instructionLower.includes('easier') || instructionLower.includes('simple')) {
            changes.push({
                type: 'difficulty',
                property: 'enemySpeed',
                multiplier: 0.85
            });
            changes.push({
                type: 'difficulty',
                property: 'playerHealth',
                multiplier: 1.25
            });
        }
        
        if (instructionLower.includes('level') && instructionLower.includes('add')) {
            changes.push({
                type: 'level',
                action: 'add',
                count: 1
            });
        }
        
        if (instructionLower.includes('boss')) {
            changes.push({
                type: 'boss',
                action: 'add',
                bossType: this._detectBossType(instructionLower)
            });
        }
        
        if (instructionLower.includes('power') || instructionLower.includes('upgrade')) {
            changes.push({
                type: 'powerup',
                action: 'add',
                count: 3
            });
        }
        
        return {
            instruction,
            gameState,
            changes,
            iterations: Math.min(changes.length, this.config.refinement.maxIterations)
        };
    }
    
    /**
     * Detect what type of boss based on instruction
     */
    _detectBossType(instruction) {
        if (instruction.includes('final')) return 'final';
        if (instruction.includes('mini')) return 'mini';
        if (instruction.includes('elite')) return 'elite';
        if (instruction.includes('secret')) return 'secret';
        return 'standard';
    }
    
    /**
     * Apply refinement changes to game
     */
    async _applyRefinement(gameId, plan) {
        const results = [];
        
        for (const change of plan.changes) {
            try {
                const result = await this._applyChange(gameId, change);
                results.push({ change, result, success: true });
            } catch (error) {
                results.push({ change, error: error.message, success: false });
            }
        }
        
        return results;
    }
    
    /**
     * Apply a single change to the game
     */
    async _applyChange(gameId, change) {
        // Get game element
        const gameFrame = document.querySelector(`[data-game-id="${gameId}"]`);
        if (!gameFrame) {
            // Try to find game canvas
            const canvas = document.querySelector('canvas');
            if (canvas && canvas.game) {
                return this._applyChangeToGameObject(canvas.game, change);
            }
            throw new Error('Game not found');
        }
        
        // Apply change based on type
        switch (change.type) {
            case 'difficulty':
                return this._applyDifficultyChange(gameFrame, change);
            case 'spawn':
                return this._applySpawnChange(gameFrame, change);
            case 'speed':
                return this._applySpeedChange(gameFrame, change);
            case 'horror':
                return this._applyHorrorChange(gameFrame, change);
            case 'level':
                return this._applyLevelChange(gameFrame, change);
            case 'boss':
                return this._applyBossChange(gameFrame, change);
            case 'powerup':
                return this._applyPowerupChange(gameFrame, change);
            default:
                console.warn(`[Phase5] Unknown change type: ${change.type}`);
        }
    }
    
    _applyChangeToGameObject(game, change) {
        // Direct game object modification
        switch (change.property) {
            case 'enemySpeed':
                if (game.enemies) {
                    game.enemies.forEach(enemy => {
                        enemy.speed = (enemy.speed || 1) * (change.multiplier || 1);
                    });
                }
                break;
            case 'enemyDamage':
                if (game.enemies) {
                    game.enemies.forEach(enemy => {
                        enemy.damage = (enemy.damage || 10) * (change.multiplier || 1);
                    });
                }
                break;
            case 'playerSpeed':
                if (game.player) {
                    game.player.speed = (game.player.speed || 5) * (change.multiplier || 1);
                }
                break;
            case 'playerHealth':
                if (game.player) {
                    game.player.maxHealth = (game.player.maxHealth || 100) * (change.multiplier || 1);
                    game.player.health = game.player.maxHealth;
                }
                break;
            case 'maxEnemies':
                game.maxEnemies = (game.maxEnemies || 10) * (change.value || 1);
                break;
            case 'spawnInterval':
                game.spawnInterval = (game.spawnInterval || 2000) * (change.value || 1);
                break;
        }
        
        return { applied: true, change };
    }
    
    _applyDifficultyChange(gameFrame, change) {
        // Find and modify difficulty-related elements
        const selector = `[data-difficulty], .difficulty-slider, [data-enemy-speed]`;
        const elements = gameFrame.querySelectorAll(selector);
        
        elements.forEach(el => {
            const current = parseFloat(el.dataset.enemySpeed || el.dataset.difficulty || 1);
            const newValue = current * (change.multiplier || 1);
            el.dataset.enemySpeed = newValue;
            el.dataset.difficulty = newValue;
        });
        
        return { elementsModified: elements.length, change };
    }
    
    _applySpawnChange(gameFrame, change) {
        const selector = `[data-max-enemies], [data-spawn-interval]`;
        const elements = gameFrame.querySelectorAll(selector);
        
        elements.forEach(el => {
            if (change.property === 'maxEnemies' && el.dataset.maxEnemies) {
                const current = parseInt(el.dataset.maxEnemies);
                el.dataset.maxEnemies = Math.floor(current * (change.value || 1));
            }
            if (change.property === 'spawnInterval' && el.dataset.spawnInterval) {
                const current = parseInt(el.dataset.spawnInterval);
                el.dataset.spawnInterval = Math.floor(current * (change.value || 1));
            }
        });
        
        return { elementsModified: elements.length, change };
    }
    
    _applySpeedChange(gameFrame, change) {
        const selector = `[data-speed], .speed-value`;
        const elements = gameFrame.querySelectorAll(selector);
        
        elements.forEach(el => {
            const current = parseFloat(el.dataset.speed || el.textContent || 1);
            const newValue = current * (change.multiplier || 1);
            el.dataset.speed = newValue;
            el.textContent = newValue.toFixed(1);
        });
        
        return { elementsModified: elements.length, change };
    }
    
    _applyHorrorChange(gameFrame, change) {
        const results = {};
        
        if (change.property === 'darkness' && change.value) {
            // Create or update darkness overlay
            let overlay = gameFrame.querySelector('.horror-darkness-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'horror-darkness-overlay';
                overlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: black;
                    opacity: ${change.value};
                    pointer-events: none;
                    z-index: 100;
                `;
                gameFrame.appendChild(overlay);
            } else {
                const current = parseFloat(overlay.style.opacity || 0);
                overlay.style.opacity = Math.min(current + change.value, 0.8);
            }
            results.darkness = true;
        }
        
        if (change.property === 'jumpScareChance' && change.value) {
            // Update jump scare probability
            const scareEl = gameFrame.querySelector('[data-jumpscare-chance]');
            if (scareEl) {
                const current = parseFloat(scareEl.dataset.jumpscareChance);
                scareEl.dataset.jumpscareChance = Math.min(current + change.value, 0.5);
            }
            results.jumpScare = true;
        }
        
        if (change.property === 'ambientSound' && change.enable) {
            // Add ambient horror sounds
            this._addAmbientHorrorSound(gameFrame);
            results.ambientSound = true;
        }
        
        return results;
    }
    
    _addAmbientHorrorSound(gameFrame) {
        const audio = new Audio();
        audio.src = this._getAmbientSoundUrl();
        audio.loop = true;
        audio.volume = 0.3;
        
        // Store reference
        gameFrame.dataset.hasAmbientSound = 'true';
        
        // Play when game starts
        const playAudio = () => {
            audio.play().catch(e => console.log('[Phase5] Audio autoplay blocked'));
            gameFrame.removeEventListener('game:start', playAudio);
        };
        gameFrame.addEventListener('game:start', playAudio);
        
        return { soundAdded: true };
    }
    
    _getAmbientSoundUrl() {
        // Use Web Audio API for procedural horror ambience
        return ''; // Will be generated procedurally
    }
    
    _applyLevelChange(gameFrame, change) {
        if (change.action === 'add') {
            // Trigger level generation event
            const event = new CustomEvent('game:addLevel', {
                detail: { count: change.count || 1 }
            });
            gameFrame.dispatchEvent(event);
            return { levelsAdded: change.count || 1 };
        }
        return { noChange: true };
    }
    
    _applyBossChange(gameFrame, change) {
        if (change.action === 'add') {
            const event = new CustomEvent('game:addBoss', {
                detail: { bossType: change.bossType || 'standard' }
            });
            gameFrame.dispatchEvent(event);
            return { bossAdded: change.bossType };
        }
        return { noChange: true };
    }
    
    _applyPowerupChange(gameFrame, change) {
        if (change.action === 'add') {
            const event = new CustomEvent('game:addPowerups', {
                detail: { count: change.count || 3 }
            });
            gameFrame.dispatchEvent(event);
            return { powerupsAdded: change.count || 3 };
        }
        return { noChange: true };
    }
    
    _getGameState(gameId) {
        // Gather current game parameters
        const gameFrame = document.querySelector(`[data-game-id="${gameId}"]`) || 
                         document.querySelector('.game-container');
        
        if (!gameFrame) return {};
        
        return {
            difficulty: parseFloat(gameFrame.dataset.difficulty || 1),
            maxEnemies: parseInt(gameFrame.dataset.maxEnemies || 10),
            playerSpeed: parseFloat(gameFrame.dataset.playerSpeed || 5),
            enemySpeed: parseFloat(gameFrame.dataset.enemySpeed || 3),
            level: parseInt(gameFrame.dataset.level || 1),
            score: parseInt(gameFrame.dataset.score || 0),
            hasBoss: gameFrame.dataset.hasBoss === 'true'
        };
    }
    
    // ============================================
    // SECTION 5.1.2: BUG FIXING AI
    // ============================================
    
    /**
     * Analyze game for bugs and issues
     * @param {string} gameId - The game to analyze
     * @returns {Promise<Object>} Analysis results with potential fixes
     */
    async analyzeAndFixBugs(gameId) {
        console.log(`[Phase5] Analyzing bugs in game: ${gameId}`);
        
        const tier = this.aiSystem?.getFeatureTier?.('phase5') || 'none';
        if (tier === 'none') {
            return { success: false, error: 'Phase 5 features require subscription' };
        }
        
        try {
            // Gather game data
            const gameData = await this._gatherGameData(gameId);
            
            // Run bug analysis
            const analysis = await this._runBugAnalysis(gameData);
            
            // Generate fixes
            if (analysis.issues.length > 0 && analysis.autoFixable.length > 0) {
                await this._applyBugFixes(gameId, analysis.autoFixable);
            }
            
            return {
                success: true,
                gameId,
                analysis,
                fixesApplied: analysis.autoFixable.length,
                issuesFound: analysis.issues.length
            };
        } catch (error) {
            console.error('[Phase5] Bug analysis error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async _gatherGameData(gameId) {
        const gameFrame = document.querySelector(`[data-game-id="${gameId}"]`) || 
                         document.querySelector('.game-container');
        
        if (!gameFrame) {
            // Try to find the actual game script
            const scripts = document.querySelectorAll('script[data-game]');
            for (const script of scripts) {
                if (script.dataset.game === gameId) {
                    return {
                        source: script.textContent,
                        url: script.src
                    };
                }
            }
            throw new Error('Game not found');
        }
        
        // Gather DOM state
        const state = {
            html: gameFrame.innerHTML.substring(0, 5000), // First 5000 chars
            scripts: Array.from(document.querySelectorAll('script')).map(s => s.src).filter(Boolean),
            styles: Array.from(document.querySelectorAll('style')).map(s => s.textContent).filter(Boolean),
            consoleErrors: this._getConsoleErrors(),
            performanceMetrics: this._getPerformanceMetrics()
        };
        
        return state;
    }
    
    _getConsoleErrors() {
        // This would need to hook into console in a real implementation
        return [];
    }
    
    _getPerformanceMetrics() {
        if (performance && performance.getEntriesByType) {
            const entries = performance.getEntriesByType('resource');
            return entries.map(e => ({
                name: e.name,
                duration: e.duration,
                type: e.initiatorType
            }));
        }
        return [];
    }
    
    async _runBugAnalysis(gameData) {
        const issues = [];
        const autoFixable = [];
        const warnings = [];
        
        // Analyze source code if available
        if (gameData.source) {
            // Check for common bugs
            const source = gameData.source;
            
            // Check for infinite loops
            if (this._hasPotentialInfiniteLoop(source)) {
                issues.push({
                    type: 'performance',
                    severity: 'high',
                    description: 'Potential infinite loop detected',
                    location: this._findLoopLocations(source)
                });
            }
            
            // Check for missing error handling
            if (!source.includes('try') && !source.includes('catch')) {
                warnings.push({
                    type: 'error-handling',
                    severity: 'low',
                    description: 'No try-catch blocks found'
                });
            }
            
            // Check for memory leaks (event listeners without cleanup)
            if (source.includes('addEventListener') && !source.includes('removeEventListener')) {
                warnings.push({
                    type: 'memory',
                    severity: 'medium',
                    description: 'Potential memory leak: addEventListener without removeEventListener'
                });
                autoFixable.push({
                    issue: 'missing-event-cleanup',
                    fix: 'Add removeEventListener in game cleanup'
                });
            }
            
            // Check for undefined variables
            const undefinedVars = this._findPotentialUndefinedVars(source);
            if (undefinedVars.length > 0) {
                issues.push({
                    type: 'runtime',
                    severity: 'high',
                    description: 'Potential undefined variable references',
                    variables: undefinedVars
                });
            }
        }
        
        if (gameData.performanceMetrics) {
            const slowResources = gameData.performanceMetrics.filter(m => m.duration > 3000);
            if (slowResources.length > 0) {
                warnings.push({
                    type: 'performance',
                    severity: 'medium',
                    description: 'Slow resource loading detected',
                    resources: slowResources.map(r => r.name)
                });
            }
        }
        
        // Analyze game state for runtime issues
        if (gameData.html) {
            // Check for canvas without context check
            if (gameData.html.includes('<canvas') && !gameData.html.includes('getContext')) {
                issues.push({
                    type: 'runtime',
                    severity: 'high',
                    description: 'Canvas element found but getContext might not be called'
                });
            }
        }
        
        return {
            issues,
            warnings,
            autoFixable,
            timestamp: new Date().toISOString()
        };
    }
    
    _hasPotentialInfiniteLoop(source) {
        // Simple heuristic detection
        const patterns = [
            /while\s*\(\s*true\s*\)/,
            /while\s*\(\s*1\s*\)/,
            /for\s*\(\s*;\s*;\s*\)/
        ];
        
        return patterns.some(pattern => pattern.test(source));
    }
    
    _findLoopLocations(source) {
        const locations = [];
        const lines = source.split('\n');
        
        lines.forEach((line, index) => {
            if (line.includes('while') || line.includes('for')) {
                locations.push({ line: index + 1, content: line.trim().substring(0, 50) });
            }
        });
        
        return locations;
    }
    
    _findPotentialUndefinedVars(source) {
        // Simple pattern matching for potential undefined references
        const patterns = [
            /(\w+)\s*\.\s*(\w+)\s*\(/
        ];
        
        // This is a simplified check - real implementation would use AST
        return [];
    }
    
    async _applyBugFixes(gameId, fixes) {
        const results = [];
        
        for (const fix of fixes) {
            try {
                // Dispatch event for game to handle the fix
                const event = new CustomEvent('game:applyFix', {
                    detail: { fix }
                });
                document.dispatchEvent(event);
                
                results.push({ fix, applied: true });
            } catch (error) {
                results.push({ fix, applied: false, error: error.message });
            }
        }
        
        return results;
    }
    
    // ============================================
    // SECTION 5.1.3: FEATURE EXPANSION
    // ============================================
    
    /**
     * Add new features to a game (levels, power-ups, bosses)
     * @param {string} gameId - The game to enhance
     * @param {Object} features - Features to add
     * @returns {Promise<Object>} Result
     */
    async expandFeatures(gameId, features) {
        console.log(`[Phase5] Expanding features for: ${gameId}`);
        
        const tier = this.aiSystem?.getFeatureTier?.('phase5') || 'none';
        if (tier === 'none') {
            return { success: false, error: 'Phase 5 features require subscription' };
        }
        
        const results = {
            gameId,
            added: [],
            errors: []
        };
        
        // Add levels
        if (features.levels && features.levels > 0) {
            const levelResult = await this._addLevels(gameId, features.levels);
            results.added.push({ type: 'levels', count: levelResult.count });
            if (levelResult.error) results.errors.push(levelResult.error);
        }
        
        // Add power-ups
        if (features.powerups && features.powerups.length > 0) {
            for (const powerup of features.powerups) {
                const puResult = await this._addPowerup(gameId, powerup);
                results.added.push({ type: 'powerup', name: powerup.name });
                if (puResult.error) results.errors.push(puResult.error);
            }
        }
        
        // Add boss
        if (features.boss) {
            const bossResult = await this._addBoss(gameId, features.boss);
            results.added.push({ type: 'boss', boss: bossResult });
            if (bossResult.error) results.errors.push(bossResult.error);
        }
        
        // Add new enemy types
        if (features.enemies && features.enemies.length > 0) {
            for (const enemy of features.enemies) {
                const enemyResult = await this._addEnemyType(gameId, enemy);
                results.added.push({ type: 'enemy', name: enemy.name });
            }
        }
        
        return {
            success: results.errors.length === 0,
            ...results
        };
    }
    
    async _addLevels(gameId, count) {
        const event = new CustomEvent('game:addLevels', {
            detail: { count }
        });
        document.dispatchEvent(event);
        
        return { count };
    }
    
    async _addPowerup(gameId, powerup) {
        const event = new CustomEvent('game:addPowerup', {
            detail: { powerup }
        });
        document.dispatchEvent(event);
        
        return { name: powerup.name, added: true };
    }
    
    async _addBoss(gameId, bossConfig) {
        const event = new CustomEvent('game:addBoss', {
            detail: { boss: bossConfig }
        });
        document.dispatchEvent(event);
        
        return { boss: bossConfig.name || 'boss', added: true };
    }
    
    async _addEnemyType(gameId, enemy) {
        const event = new CustomEvent('game:addEnemyType', {
            detail: { enemy }
        });
        document.dispatchEvent(event);
        
        return { name: enemy.name, added: true };
    }
    
    // ============================================
    // SECTION 5.1.4: STYLE TRANSFER
    // ============================================
    
    /**
     * Change visual theme of game without breaking gameplay
     * @param {string} gameId - The game to restyle
     * @param {string} theme - Target theme (pixel, neon, realistic, etc.)
     * @returns {Promise<Object>} Result
     */
    async transferStyle(gameId, theme) {
        console.log(`[Phase5] Transferring style: ${gameId} -> ${theme}`);
        
        const tier = this.aiSystem?.getFeatureTier?.('phase5') || 'none';
        if (tier === 'none') {
            return { success: false, error: 'Phase 5 features require subscription' };
        }
        
        // Style presets
        const styles = {
            pixel: {
                cssFilter: 'pixelated',
                colorPalette: ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#f1f1f1'],
                font: 'Press Start 2P, monospace',
                effects: ['scanlines', 'crt-curve']
            },
            neon: {
                cssFilter: 'none',
                colorPalette: ['#0d0d0d', '#ff00ff', '#00ffff', '#ffff00', '#ff0080'],
                font: 'Orbitron, sans-serif',
                effects: ['glow', 'bloom']
            },
            realistic: {
                cssFilter: 'none',
                colorPalette: ['#2d2d2d', '#4a4a4a', '#6b6b6b', '#8b4513', '#d2691e'],
                font: 'Roboto, sans-serif',
                effects: ['depth-of-field', 'ambient-occlusion']
            },
            'low-poly': {
                cssFilter: 'none',
                colorPalette: ['#1e3a5f', '#3d5a80', '#98c1d9', '#e0fbfc', '#293241'],
                font: 'Rajdhani, sans-serif',
                effects: ['flat-shading', 'edge-detection']
            },
            'hand-drawn': {
                cssFilter: 'none',
                colorPalette: ['#2b2b2b', '#4a3728', '#8b7355', '#c4a484', '#f5deb3'],
                font: 'Caveat, cursive',
                effects: ['sketch', 'paper-texture']
            },
            comic: {
                cssFilter: 'none',
                colorPalette: ['#000000', '#ff0000', '#ffff00', '#0000ff', '#ffffff'],
                font: 'Bangers, cursive',
                effects: ['halftone', 'bold-outlines']
            },
            retro: {
                cssFilter: 'none',
                colorPalette: ['#000000', '#00ff00', '#ff00ff', '#00ffff', '#ffffff'],
                font: 'VT323, monospace',
                effects: ['scanlines', 'flicker']
            },
            abstract: {
                cssFilter: 'none',
                colorPalette: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'],
                font: 'Montserrat, sans-serif',
                effects: ['geometric', 'motion-blur']
            },
            dark: {
                cssFilter: 'none',
                colorPalette: ['#0a0a0a', '#1a1a1a', '#2d2d2d', '#404040', '#f5f5f5'],
                font: 'Inter, sans-serif',
                effects: ['vignette']
            },
            nightmare: {
                cssFilter: 'none',
                colorPalette: ['#0d0000', '#1a0505', '#2b0808', '#4a0a0a', '#ff3030'],
                font: 'Creepster, cursive',
                effects: ['distortion', 'glitch', 'noise']
            }
        };
        
        const styleConfig = styles[theme.toLowerCase()];
        if (!styleConfig) {
            return { 
                success: false, 
                error: `Unknown theme: ${theme}. Available: ${Object.keys(styles).join(', ')}` 
            };
        }
        
        // Apply style to game
        const result = await this._applyStyle(gameId, styleConfig);
        
        return {
            success: true,
            gameId,
            theme,
            applied: result
        };
    }
    
    async _applyStyle(gameId, styleConfig) {
        const gameFrame = document.querySelector(`[data-game-id="${gameId}"]`) || 
                         document.querySelector('.game-container');
        
        if (!gameFrame) {
            // Try canvas
            const canvas = document.querySelector('canvas');
            if (canvas) {
                return this._applyStyleToCanvas(canvas, styleConfig);
            }
            throw new Error('Game not found');
        }
        
        const applied = [];
        
        // Create style element
        const styleId = `style-transfer-${gameId}`;
        let styleEl = document.getElementById(styleId);
        
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }
        
        // Generate CSS
        const css = this._generateStyleCSS(gameId, styleConfig);
        styleEl.textContent = css;
        applied.push('css');
        
        // Apply effects container
        let effectsContainer = gameFrame.querySelector('.style-effects');
        if (!effectsContainer) {
            effectsContainer = document.createElement('div');
            effectsContainer.className = 'style-effects';
            effectsContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 1000;
            `;
            
            // Insert as first child
            gameFrame.insertBefore(effectsContainer, gameFrame.firstChild);
        }
        
        // Add effect layers
        for (const effect of styleConfig.effects) {
            const effectLayer = this._createEffectLayer(effect);
            effectsContainer.appendChild(effectLayer);
            applied.push(`effect:${effect}`);
        }
        
        return applied;
    }
    
    _applyStyleToCanvas(canvas, styleConfig) {
        // Apply styles directly to canvas context
        const ctx = canvas.getContext('2d');
        
        // Store original draw function
        const originalDraw = ctx.drawImage;
        
        // Wrap drawImage to apply filters
        ctx.drawImage = function(...args) {
            ctx.save();
            
            // Apply color palette transformation
            if (styleConfig.cssFilter === 'pixelated') {
                ctx.imageSmoothingEnabled = false;
            }
            
            originalDraw.apply(this, args);
            ctx.restore();
        };
        
        return ['canvas-styled'];
    }
    
    _generateStyleCSS(gameId, styleConfig) {
        const selector = `[data-game-id="${gameId}"], .game-container[data-game-id="${gameId}"]`;
        
        let css = `
            ${selector} {
                --theme-primary: ${styleConfig.colorPalette[0]};
                --theme-secondary: ${styleConfig.colorPalette[1]};
                --theme-accent: ${styleConfig.colorPalette[3]};
                --theme-text: ${styleConfig.colorPalette[styleConfig.colorPalette.length - 1]};
                font-family: ${styleConfig.font};
            }
        `;
        
        // Add effect-specific CSS
        if (styleConfig.effects.includes('scanlines')) {
            css += `
                ${selector} .style-effects::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: repeating-linear-gradient(
                        0deg,
                        rgba(0, 0, 0, 0.15),
                        rgba(0, 0, 0, 0.15) 1px,
                        transparent 1px,
                        transparent 2px
                    );
                    pointer-events: none;
                }
            `;
        }
        
        if (styleConfig.effects.includes('glow')) {
            css += `
                ${selector} * {
                    text-shadow: 0 0 5px currentColor, 0 0 10px currentColor;
                }
            `;
        }
        
        if (styleConfig.effects.includes('crt-curve')) {
            css += `
                ${selector} {
                    border-radius: 10px;
                    box-shadow: 
                        inset 0 0 50px rgba(0,0,0,0.5),
                        0 0 20px rgba(0,0,0,0.5);
                }
            `;
        }
        
        if (styleConfig.effects.includes('vignette')) {
            css += `
                ${selector} .style-effects::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(
                        ellipse at center,
                        transparent 0%,
                        transparent 60%,
                        rgba(0,0,0,0.6) 100%
                    );
                }
            `;
        }
        
        if (styleConfig.effects.includes('noise')) {
            css += `
                ${selector} .style-effects::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0.05;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E");
                    animation: noiseAnim 0.5s steps(10) infinite;
                }
                @keyframes noiseAnim {
                    0% { transform: translate(0, 0); }
                    10% { transform: translate(-5%, -5%); }
                    20% { transform: translate(-10%, 5%); }
                    30% { transform: translate(5%, -10%); }
                    40% { transform: translate(-5%, 15%); }
                    50% { transform: translate(-10%, 5%); }
                    60% { transform: translate(15%, 0); }
                    70% { transform: translate(0, 10%); }
                    80% { transform: translate(-15%, 0); }
                    90% { transform: translate(10%, 5%); }
                    100% { transform: translate(0, 0); }
                }
            `;
        }
        
        if (styleConfig.effects.includes('glitch')) {
            css += `
                @keyframes glitch {
                    0% { clip-path: inset(40% 0 61% 0); transform: translate(-2px, 0); }
                    20% { clip-path: inset(92% 0 1% 0); transform: translate(1px, 0); }
                    40% { clip-path: inset(43% 0 1% 0); transform: translate(-1px, 0); }
                    60% { clip-path: inset(25% 0 58% 0); transform: translate(1px, 0); }
                    80% { clip-path: inset(54% 0 7% 0); transform: translate(-2px, 0); }
                    100% { clip-path: inset(58% 0 43% 0); transform: translate(2px, 0); }
                }
                ${selector} .style-effects.glitch {
                    animation: glitch 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both infinite;
                }
            `;
        }
        
        return css;
    }
    
    _createEffectLayer(effect) {
        const layer = document.createElement('div');
        layer.className = `effect-${effect}`;
        layer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;
        
        // Effect-specific styling
        switch (effect) {
            case 'glow':
                layer.style.boxShadow = 'inset 0 0 50px rgba(255,255,255,0.1)';
                break;
            case 'bloom':
                layer.style.mixBlendMode = 'screen';
                break;
            case 'sketch':
                layer.style.opacity = '0.3';
                break;
            case 'paper-texture':
                layer.style.backgroundImage = 'url("data:image/svg+xml,...paper...")';
                break;
        }
        
        return layer;
    }
    
    // ============================================
    // SECTION 5.2: MULTIMODAL GENERATION
    // ============================================
    
    /**
     * Initialize audio generation system
     */
    _initAudioGeneration() {
        // Web Audio API context
        this.audioCtx = null;
        this.audioBuffers = {};
        
        // Sound presets
        this.soundPresets = {
            horror: {
                lowFreq: 80,
                highFreq: 200,
                modulation: 0.5,
                reverb: 0.8
            },
            action: {
                lowFreq: 200,
                highFreq: 800,
                modulation: 0.8,
                reverb: 0.3
            },
            ambient: {
                lowFreq: 40,
                highFreq: 150,
                modulation: 0.2,
                reverb: 0.9
            },
            menu: {
                lowFreq: 300,
                highFreq: 600,
                modulation: 0.1,
                reverb: 0.2
            }
        };
    }
    
    /**
     * Generate audio (music or SFX) using Web Audio API
     * @param {string} type - 'music' or 'sfx'
     * @param {string} style - Style preset
     * @param {number} duration - Duration in seconds
     * @returns {Promise<Object>} Generated audio data
     */
    async generateAudio(type, style, duration = 10) {
        console.log(`[Phase5] Generating ${type} in ${style} style for ${duration}s`);
        
        const tier = this.aiSystem?.getFeatureTier?.('phase5') || 'none';
        if (tier === 'none') {
            return { success: false, error: 'Phase 5 features require subscription' };
        }
        
        try {
            // Initialize audio context
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            let audioData;
            
            if (type === 'music') {
                audioData = await this._generateMusic(style, duration);
            } else if (type === 'sfx') {
                audioData = await this._generateSFX(style, duration);
            } else {
                throw new Error(`Unknown audio type: ${type}`);
            }
            
            return {
                success: true,
                type,
                style,
                duration,
                ...audioData
            };
        } catch (error) {
            console.error('[Phase5] Audio generation error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Generate procedural music
     */
    async _generateMusic(style, duration) {
        const preset = this.soundPresets[style] || this.soundPresets.ambient;
        
        // Create oscillators for melody generation
        const oscillators = [];
        const gainNodes = [];
        
        const sampleRate = this.audioCtx.sampleRate;
        const numSamples = sampleRate * duration;
        
        // Create offline context for rendering
        const offlineCtx = new OfflineAudioContext(2, numSamples, sampleRate);
        
        // Generate melody using procedural algorithms
        const bpm = style === 'action' ? 150 : style === 'horror' ? 60 : 100;
        const beatDuration = 60 / bpm;
        const numBeats = Math.floor(duration / beatDuration);
        
        // Create melody pattern
        const scale = this._getScaleForStyle(style);
        
        for (let channel = 0; channel < 2; channel++) {
            const oscillator = offlineCtx.createOscillator();
            const gainNode = offlineCtx.createGain();
            
            // Configure based on preset
            oscillator.type = channel === 0 ? 'sawtooth' : 'sine';
            
            // Generate frequency pattern
            const frequencies = [];
            for (let i = 0; i < numBeats; i++) {
                const noteIndex = Math.floor(Math.random() * scale.length);
                const octave = Math.random() > 0.7 ? 2 : 1;
                frequencies.push(scale[noteIndex] * octave);
            }
            
            // Create frequency automation
            oscillator.frequency.setValueAtTime(frequencies[0], 0);
            for (let i = 1; i < frequencies.length; i++) {
                oscillator.frequency.setValueAtTime(
                    frequencies[i],
                    i * beatDuration
                );
            }
            
            // Create gain envelope
            gainNode.gain.setValueAtTime(0, 0);
            for (let i = 0; i < numBeats; i++) {
                const beatTime = i * beatDuration;
                gainNode.gain.setValueAtTime(0.3, beatTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, beatTime + beatDuration * 0.9);
            }
            
            oscillator.connect(gainNode);
            gainNode.connect(offlineCtx.destination);
            oscillator.start(0);
            oscillator.stop(duration);
        }
        
        // Render audio
        const renderedBuffer = await offlineCtx.startRendering();
        
        // Convert to WAV
        const wavBlob = this._audioBufferToWAV(renderedBuffer);
        const url = URL.createObjectURL(wavBlob);
        
        return {
            url,
            format: 'wav',
            buffer: renderedBuffer
        };
    }
    
    /**
     * Generate procedural SFX
     */
    async _generateSFX(style, duration) {
        const preset = this.soundPresets[style] || this.soundPresets.ambient;
        
        const sampleRate = this.audioCtx.sampleRate;
        const numSamples = sampleRate * duration;
        
        const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate);
        
        // Create noise for texture
        const noiseBuffer = offlineCtx.createBuffer(1, numSamples, sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < numSamples; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.1;
        }
        
        const noiseSource = offlineCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        // Bandpass filter for horror effect
        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = (preset.lowFreq + preset.highFreq) / 2;
        filter.Q.value = 1;
        
        // Envelope
        const gainNode = offlineCtx.createGain();
        gainNode.gain.setValueAtTime(0, 0);
        gainNode.gain.linearRampToValueAtTime(0.8, 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, duration);
        
        // Connect
        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        
        noiseSource.start(0);
        noiseSource.stop(duration);
        
        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = this._audioBufferToWAV(renderedBuffer);
        const url = URL.createObjectURL(wavBlob);
        
        return {
            url,
            format: 'wav',
            buffer: renderedBuffer
        };
    }
    
    /**
     * Get musical scale for style
     */
    _getScaleForStyle(style) {
        const scales = {
            horror: [55, 58, 62, 65, 73, 82, 87], // Minor/dark
            action: [110, 123, 131, 147, 165, 175, 196, 220], // Major/powerful
            ambient: [65, 73, 82, 87, 98, 110], // Pentatonic
            menu: [196, 220, 247, 262, 294, 330], // Simple major
            default: [110, 123, 131, 147, 165, 175, 196] // Natural minor
        };
        
        return scales[style] || scales.default;
    }
    
    /**
     * Convert AudioBuffer to WAV blob
     */
    _audioBufferToWAV(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        
        const dataLength = buffer.length * blockAlign;
        const headerLength = 44;
        const totalLength = headerLength + dataLength;
        
        const arrayBuffer = new ArrayBuffer(totalLength);
        const view = new DataView(arrayBuffer);
        
        // WAV header
        this._writeString(view, 0, 'RIFF');
        view.setUint32(4, totalLength - 8, true);
        this._writeString(view, 8, 'WAVE');
        this._writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        this._writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);
        
        // Write audio data
        const channels = [];
        for (let i = 0; i < numChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }
        
        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                const sample = Math.max(-1, Math.min(1, channels[ch][i]));
                view.setInt16(offset, sample * 0x7FFF, true);
                offset += 2;
            }
        }
        
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }
    
    _writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
    
    /**
     * Initialize voice narration system
     */
    _initVoiceNarration() {
        this.speechSynthesis = window.speechSynthesis || null;
        this.voiceConfigs = {
            narrator: {
                voice: null,
                rate: 0.9,
                pitch: 0.8,
                volume: 1
            },
            creepy: {
                voice: null,
                rate: 0.7,
                pitch: 0.5,
                volume: 0.9
            },
            dramatic: {
                voice: null,
                rate: 0.85,
                pitch: 1.1,
                volume: 1
            },
            whispered: {
                voice: null,
                rate: 0.8,
                pitch: 0.9,
                volume: 0.7
            }
        };
        
        // Load available voices
        if (this.speechSynthesis) {
            this.speechSynthesis.onvoiceschanged = () => {
                this._loadVoices();
            };
        }
    }
    
    _loadVoices() {
        const voices = this.speechSynthesis?.getVoices() || [];
        
        // Try to find dark/creepy voices
        const creepyVoice = voices.find(v => 
            v.name.includes('Daniel') || 
            v.name.includes('Zira') ||
            v.name.includes('Google UK English Male')
        );
        
        this.voiceConfigs.narrator.voice = voices[0] || null;
        this.voiceConfigs.creepy.voice = creepyVoice || voices[0];
        this.voiceConfigs.dramatic.voice = voices.find(v => v.gender === 'male') || voices[0];
        this.voiceConfigs.whispered.voice = voices.find(v => v.name.includes('Samantha')) || voices[0];
    }
    
    /**
     * Generate voice narration for story intro/outro
     * @param {string} text - Text to narrate
     * @param {string} style - Voice style (narrator, creepy, dramatic, whispered)
     * @returns {Promise<Object>} Generated narration
     */
    async generateNarration(text, style = 'narrator') {
        console.log(`[Phase5] Generating narration: "${text.substring(0, 50)}..." in ${style}`);
        
        const tier = this.aiSystem?.getFeatureTier?.('phase5') || 'none';
        if (tier === 'none') {
            return { success: false, error: 'Phase 5 features require subscription' };
        }
        
        try {
            if (!this.speechSynthesis) {
                // Fallback: generate audio using Web Speech API
                return this._generateSpeechFallback(text, style);
            }
            
            const config = this.voiceConfigs[style] || this.voiceConfigs.narrator;
            
            return new Promise((resolve) => {
                const utterance = new SpeechSynthesisUtterance(text);
                
                utterance.voice = config.voice;
                utterance.rate = config.rate;
                utterance.pitch = config.pitch;
                utterance.volume = config.volume;
                
                // For generating audio file, we'd need Web Speech API recording
                // For now, provide playback function
                utterance.onend = () => {
                    resolve({
                        success: true,
                        text,
                        style,
                        played: true
                    });
                };
                
                utterance.onerror = (e) => {
                    resolve({
                        success: false,
                        error: e.error
                    });
                };
                
                // Play the narration
                this.speechSynthesis.speak(utterance);
                
                // Return immediate result
                resolve({
                    success: true,
                    text,
                    style,
                    played: true,
                    note: 'Audio playback initiated. Recording requires additional setup.'
                });
            });
        } catch (error) {
            console.error('[Phase5] Narration error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async _generateSpeechFallback(text, style) {
        // Simple fallback using Oscillator for basic feedback
        return {
            success: true,
            text,
            style,
            played: false,
            message: 'Speech synthesis not available. Text: ' + text.substring(0, 100)
        };
    }
    
    // ============================================
    // SECTION 5.3: SMART ASSISTANCE
    // ============================================
    
    /**
     * Analyze game and suggest improvements
     * @param {string} gameId - The game to analyze
     * @returns {Promise<Object>} Analysis with suggestions
     */
    async analyzeGame(gameId) {
        console.log(`[Phase5] Analyzing game: ${gameId}`);
        
        const tier = this.aiSystem?.getFeatureTier?.('phase5') || 'none';
        if (tier === 'none') {
            return { success: false, error: 'Phase 5 features require subscription' };
        }
        
        try {
            // Gather game data
            const gameData = await this._gatherGameData(gameId);
            const metrics = this._getGameMetrics(gameId);
            
            // Run comprehensive analysis
            const analysis = {
                performance: await this._analyzePerformance(gameData, metrics),
                gameplay: await this._analyzeGameplay(gameData, metrics),
                engagement: await this._analyzeEngagement(gameData, metrics),
                balance: await this._analyzeBalance(gameData, metrics),
                accessibility: await this._analyzeAccessibility(gameData, metrics),
                suggestions: []
            };
            
            // Generate suggestions based on analysis
            analysis.suggestions = this._generateSuggestions(analysis);
            
            // Store analysis
            this.currentAnalysis = analysis;
            
            return {
                success: true,
                gameId,
                analysis,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[Phase5] Analysis error:', error);
            return { success: false, error: error.message };
        }
    }
    
    _getGameMetrics(gameId) {
        // Get stored metrics for this game
        const stored = localStorage.getItem(`sgai_metrics_${gameId}`);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return {};
            }
        }
        
        return {
            playCount: 0,
            avgSessionLength: 0,
            completionRate: 0,
            deathCount: 0,
            scoreDistribution: [],
            playerFeedback: []
        };
    }
    
    _storeGameMetrics(metrics) {
        if (!this.currentGame) return;
        
        const existing = this._getGameMetrics(this.currentGame);
        const updated = {
            ...existing,
            ...metrics,
            lastPlayed: new Date().toISOString()
        };
        
        localStorage.setItem(`sgai_metrics_${this.currentGame}`, JSON.stringify(updated));
    }
    
    async _analyzePerformance(gameData, metrics) {
        const analysis = {
            score: 0,
            issues: [],
            recommendations: []
        };
        
        // Check loading time
        if (gameData.performanceMetrics) {
            const totalLoadTime = gameData.performanceMetrics.reduce((sum, m) => sum + m.duration, 0);
            
            if (totalLoadTime > 5000) {
                analysis.issues.push('Slow loading time detected');
                analysis.recommendations.push('Optimize assets and use lazy loading');
            }
            
            if (totalLoadTime < 2000) {
                analysis.score = 100;
            } else if (totalLoadTime < 3000) {
                analysis.score = 80;
            } else if (totalLoadTime < 5000) {
                analysis.score = 60;
            } else {
                analysis.score = 40;
            }
        }
        
        // Check code quality
        if (gameData.source) {
            const hasMinification = gameData.source.length < 5000;
            if (!hasMinification) {
                analysis.recommendations.push('Consider code minification for production');
            }
        }
        
        return analysis;
    }
    
    async _analyzeGameplay(gameData, metrics) {
        const analysis = {
            score: 0,
            strengths: [],
            weaknesses: [],
            recommendations: []
        };
        
        // Analyze based on player metrics
        if (metrics.completionRate !== undefined) {
            if (metrics.completionRate < 0.1) {
                analysis.weaknesses.push('Very low completion rate - game may be too difficult');
                analysis.recommendations.push('Consider adding a difficulty selector');
            } else if (metrics.completionRate > 0.5) {
                analysis.strengths.push('Good completion rate');
                analysis.score += 30;
            }
        }
        
        if (metrics.avgSessionLength !== undefined) {
            if (metrics.avgSessionLength > 300) { // 5 minutes
                analysis.strengths.push('Good player engagement');
                analysis.score += 30;
            } else if (metrics.avgSessionLength < 60) {
                analysis.weaknesses.push('Short sessions - players may be losing interest');
                analysis.recommendations.push('Add intermediate goals or checkpoints');
            }
        }
        
        // Analyze source code for gameplay issues
        if (gameData.source) {
            const source = gameData.source;
            
            // Check for save system
            if (!source.includes('save') && !source.includes('localStorage')) {
                analysis.recommendations.push('Add save/load system for better player retention');
            }
            
            // Check for tutorials
            if (!source.includes('tutorial') && !source.includes('help')) {
                analysis.recommendations.push('Consider adding a tutorial or help system');
            }
            
            // Check for feedback
            if (!source.includes('score') && !source.includes('points')) {
                analysis.weaknesses.push('No scoring system detected');
                analysis.recommendations.push('Add scoring to increase player motivation');
            }
        }
        
        analysis.score = Math.min(analysis.score, 100);
        return analysis;
    }
    
    async _analyzeEngagement(gameData, metrics) {
        const analysis = {
            score: 0,
            features: [],
            recommendations: []
        };
        
        // Check for engagement features
        if (gameData.source) {
            const source = gameData.source;
            
            const engagementFeatures = [
                { name: 'Achievements', check: source.includes('achievement') },
                { name: 'Leaderboards', check: source.includes('leaderboard') || source.includes('highscore') },
                { name: 'Upgrades', check: source.includes('upgrade') || source.includes('powerup') },
                { name: 'Progression', check: source.includes('level') || source.includes('progress') },
                { name: 'Collection', check: source.includes('collect') || source.includes('item') },
                { name: 'Customization', check: source.includes('skin') || source.includes('customize') }
            ];
            
            engagementFeatures.forEach(feature => {
                if (feature.check) {
                    analysis.features.push(feature.name);
                }
            });
            
            analysis.score = Math.min(engagementFeatures.filter(f => f.check).length * 15 + 20, 100);
            
            // Recommendations
            if (!analysis.features.includes('Achievements')) {
                analysis.recommendations.push('Add achievements for long-term engagement');
            }
            if (!analysis.features.includes('Leaderboards')) {
                analysis.recommendations.push('Add leaderboards for competitive play');
            }
        }
        
        return analysis;
    }
    
    async _analyzeBalance(gameData, metrics) {
        const analysis = {
            difficulty: 'unknown',
            recommendations: []
        };
        
        // Analyze difficulty based on available data
        if (metrics.deathCount !== undefined && metrics.playCount !== undefined) {
            const deathRate = metrics.deathCount / Math.max(metrics.playCount, 1);
            
            if (deathRate > 0.8) {
                analysis.difficulty = 'very-hard';
                analysis.recommendations.push('Game is extremely difficult - consider adding difficulty levels');
            } else if (deathRate > 0.5) {
                analysis.difficulty = 'hard';
            } else if (deathRate > 0.3) {
                analysis.difficulty = 'moderate';
            } else if (deathRate > 0.1) {
                analysis.difficulty = 'easy';
            } else {
                analysis.difficulty = 'very-easy';
                analysis.recommendations.push('Game is very easy - increase challenge for veteran players');
            }
        }
        
        return analysis;
    }
    
    async _analyzeAccessibility(gameData, metrics) {
        const analysis = {
            score: 0,
            features: [],
            recommendations: []
        };
        
        // Check for accessibility features
        if (gameData.source) {
            const source = gameData.source;
            
            const accessibilityFeatures = [
                { name: 'Keyboard Controls', check: source.includes('keydown') || source.includes('keyup') },
                { name: 'Mouse Controls', check: source.includes('mousedown') || source.includes('click') },
                { name: 'Touch Support', check: source.includes('touchstart') || source.includes('touchend') },
                { name: 'Audio Feedback', check: source.includes('Audio') || source.includes('audio') },
                { name: 'Visual Indicators', check: source.includes('color') || source.includes('visual') }
            ];
            
            accessibilityFeatures.forEach(feature => {
                if (feature.check) {
                    analysis.features.push(feature.name);
                }
            });
            
            analysis.score = Math.min(accessibilityFeatures.filter(f => f.check).length * 20, 100);
            
            if (!analysis.features.includes('Touch Support')) {
                analysis.recommendations.push('Add touch controls for mobile devices');
            }
            if (!analysis.features.includes('Audio Feedback')) {
                analysis.recommendations.push('Add audio cues for better accessibility');
            }
        }
        
        return analysis;
    }
    
    _generateSuggestions(analysis) {
        const suggestions = [];
        
        // Prioritize suggestions by impact
        const prioritySuggestions = [];
        
        // High priority: major gameplay issues
        if (analysis.gameplay?.weaknesses?.length > 0) {
            analysis.gameplay.weaknesses.forEach(weakness => {
                prioritySuggestions.push({
                    priority: 'high',
                    category: 'gameplay',
                    suggestion: weakness
                });
            });
        }
        
        // Medium priority: engagement features
        if (analysis.engagement?.recommendations?.length > 0) {
            analysis.engagement.recommendations.forEach(rec => {
                prioritySuggestions.push({
                    priority: 'medium',
                    category: 'engagement',
                    suggestion: rec
                });
            });
        }
        
        // Lower priority: nice to have
        if (analysis.accessibility?.recommendations?.length > 0) {
            analysis.accessibility.recommendations.forEach(rec => {
                prioritySuggestions.push({
                    priority: 'low',
                    category: 'accessibility',
                    suggestion: rec
                });
            });
        }
        
        return prioritySuggestions;
    }
    
    // ============================================
    // SECTION 5.3.2: BALANCE CALCULATOR
    // ============================================
    
    /**
     * Calculate and recommend difficulty tuning
     * @param {string} gameId - The game to balance
     * @param {Object} targetMetrics - Desired metrics (completionRate, avgSessionLength, etc.)
     * @returns {Promise<Object>} Balance recommendations
     */
    async calculateBalance(gameId, targetMetrics = {}) {
        console.log(`[Phase5] Calculating balance for: ${gameId}`);
        
        const tier = this.aiSystem?.getFeatureTier?.('phase5') || 'none';
        if (tier === 'none') {
            return { success: false, error: 'Phase 5 features require subscription' };
        }
        
        try {
            // Get current metrics
            const currentMetrics = this._getGameMetrics(gameId);
            
            // Get game parameters
            const gameParams = this._getGameParams(gameId);
            
            // Calculate balance recommendations
            const balance = this._calculateBalanceRecommendations(
                currentMetrics,
                targetMetrics,
                gameParams
            );
            
            return {
                success: true,
                gameId,
                current: currentMetrics,
                target: targetMetrics,
                recommendations: balance
            };
        } catch (error) {
            console.error('[Phase5] Balance calculation error:', error);
            return { success: false, error: error.message };
        }
    }
    
    _getGameParams(gameId) {
        // Get current game parameters
        const gameFrame = document.querySelector(`[data-game-id="${gameId}"]`) || 
                         document.querySelector('.game-container');
        
        if (!gameFrame) return {};
        
        return {
            enemyCount: parseInt(gameFrame.dataset.maxEnemies || 10),
            enemySpeed: parseFloat(gameFrame.dataset.enemySpeed || 3),
            enemyDamage: parseFloat(gameFrame.dataset.enemyDamage || 10),
            playerHealth: parseFloat(gameFrame.dataset.playerHealth || 100),
            playerSpeed: parseFloat(gameFrame.dataset.playerSpeed || 5),
            spawnRate: parseFloat(gameFrame.dataset.spawnRate || 1)
        };
    }
    
    _calculateBalanceRecommendations(current, target, params) {
        const recommendations = [];
        
        // Default targets if not specified
        const targetCompletionRate = target.completionRate ?? 0.3;
        const targetSessionLength = target.avgSessionLength ?? 180; // 3 minutes
        const targetDeathRate = target.deathRate ?? 0.3;
        
        // Current death rate
        const currentDeathRate = current.deathCount && current.playCount 
            ? current.deathCount / current.playCount 
            : 0.3;
        
        // Compare and recommend
        if (currentDeathRate > targetDeathRate + 0.1) {
            // Too hard - reduce difficulty
            const reduction = Math.min((currentDeathRate - targetDeathRate) * 100, 30);
            
            recommendations.push({
                type: 'difficulty',
                action: 'reduce',
                amount: `${reduction.toFixed(0)}%`,
                changes: [
                    { param: 'enemySpeed', multiply: 0.9 },
                    { param: 'enemyDamage', multiply: 0.85 },
                    { param: 'playerHealth', multiply: 1.2 },
                    { param: 'enemyCount', multiply: 0.8 }
                ]
            });
        } else if (currentDeathRate < targetDeathRate - 0.1) {
            // Too easy - increase difficulty
            const increase = Math.min((targetDeathRate - currentDeathRate) * 100, 30);
            
            recommendations.push({
                type: 'difficulty',
                action: 'increase',
                amount: `${increase.toFixed(0)}%`,
                changes: [
                    { param: 'enemySpeed', multiply: 1.1 },
                    { param: 'enemyDamage', multiply: 1.15 },
                    { param: 'playerHealth', multiply: 0.9 },
                    { param: 'enemyCount', multiply: 1.2 }
                ]
            });
        }
        
        // Session length recommendations
        if (current.avgSessionLength < targetSessionLength - 30) {
            recommendations.push({
                type: 'engagement',
                action: 'increase',
                reason: 'Players leave too quickly',
                changes: [
                    { param: 'addCheckpoints' },
                    { param: 'reduceSpawnRate', multiply: 0.9 }
                ]
            });
        } else if (current.avgSessionLength > targetSessionLength + 60) {
            recommendations.push({
                type: 'engagement',
                action: 'decrease',
                reason: 'Sessions too long - may indicate lack of progress',
                changes: [
                    { param: 'increaseSpawnRate', multiply: 1.2 },
                    { param: 'addBossLevel' }
                ]
            });
        }
        
        // Return balanced recommendations
        return recommendations;
    }
    
    // ============================================
    // SECTION 5.3.3: PLAYTEST SIMULATOR
    // ============================================
    
    /**
     * Simulate AI playing the game and report issues
     * @param {string} gameId - The game to playtest
     * @param {number} iterations - Number of playtest iterations
     * @returns {Promise<Object>} Playtest results
     */
    async simulatePlaytest(gameId, iterations = 10) {
        console.log(`[Phase5] Running playtest simulation: ${gameId} (${iterations} iterations)`);
        
        const tier = this.aiSystem?.getFeatureTier?.('phase5') || 'none';
        if (tier === 'none') {
            return { success: false, error: 'Phase 5 features require subscription' };
        }
        
        try {
            const results = {
                iterations,
                completed: 0,
                failed: 0,
                issues: [],
                metrics: {
                    avgScore: 0,
                    avgTime: 0,
                    avgDeaths: 0,
                    completionRate: 0
                },
                behaviors: [],
                recommendations: []
            };
            
            // Simulate each iteration
            for (let i = 0; i < iterations; i++) {
                const simResult = await this._simulateGameplay(gameId, i);
                
                if (simResult.completed) {
                    results.completed++;
                } else {
                    results.failed++;
                    
                    if (simResult.issue) {
                        results.issues.push(simResult.issue);
                    }
                }
                
                // Accumulate metrics
                results.metrics.avgScore += simResult.score || 0;
                results.metrics.avgTime += simResult.duration || 0;
                results.metrics.avgDeaths += simResult.deaths || 0;
                
                // Track behaviors
                if (simResult.behaviors) {
                    results.behaviors.push(...simResult.behaviors);
                }
                
                // Small delay between simulations
                await this._delay(50);
            }
            
            // Calculate averages
            results.metrics.avgScore /= iterations;
            results.metrics.avgTime /= iterations;
            results.metrics.avgDeaths /= iterations;
            results.metrics.completionRate = results.completed / iterations;
            
            // Analyze issues and generate recommendations
            results.recommendations = this._analyzePlaytestResults(results);
            
            // Store results
            this.playtestResults = results;
            
            return {
                success: true,
                gameId,
                results,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[Phase5] Playtest simulation error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Simulate a single gameplay session
     */
    async _simulateGameplay(gameId, iteration) {
        const result = {
            completed: false,
            score: 0,
            duration: 0,
            deaths: 0,
            issue: null,
            behaviors: []
        };
        
        // Get game config
        const params = this._getGameParams(gameId);
        
        // Simulate gameplay based on game type
        // This is a simplified simulation - real implementation would analyze game code
        
        const baseDifficulty = (params.enemySpeed || 3) / 5;
        const playerSkill = 0.5 + (Math.random() * 0.4); // 0.5-0.9 skill level
        
        // Determine outcome based on difficulty vs skill
        const difficultyFactor = baseDifficulty / playerSkill;
        
        if (difficultyFactor > 1.5) {
            // Very hard - likely fail
            result.completed = Math.random() > 0.7;
            result.deaths = Math.floor(Math.random() * 5) + 3;
            result.duration = 30 + Math.random() * 60;
            
            if (!result.completed) {
                result.issue = 'Too difficult for average player';
            }
        } else if (difficultyFactor > 1.0) {
            // Moderate - some challenge
            result.completed = Math.random() > 0.3;
            result.deaths = Math.floor(Math.random() * 3) + 1;
            result.duration = 60 + Math.random() * 90;
            
            if (result.completed && result.deaths > 2) {
                result.behaviors.push({
                    type: 'frustrating',
                    description: 'Player died multiple times but completed'
                });
            }
        } else {
            // Easy - likely complete
            result.completed = true;
            result.deaths = Math.floor(Math.random() * 2);
            result.duration = 45 + Math.random() * 60;
            
            if (result.duration < 60) {
                result.behaviors.push({
                    type: 'quick-complete',
                    description: 'Player completed very quickly'
                });
            }
        }
        
        // Calculate score
        if (result.completed) {
            result.score = (1000 - result.deaths * 100) * (1 + result.duration / 300);
        }
        
        // Add behavioral observations
        if (result.deaths > 3) {
            result.behaviors.push({
                type: 'high-deaths',
                description: `Died ${result.deaths} times`
            });
        }
        
        return result;
    }
    
    /**
     * Analyze playtest results and generate recommendations
     */
    _analyzePlaytestResults(results) {
        const recommendations = [];
        
        // Analyze completion rate
        if (results.metrics.completionRate < 0.2) {
            recommendations.push({
                issue: 'Very low completion rate',
                severity: 'high',
                suggestion: 'Significantly reduce difficulty or add difficulty settings'
            });
        } else if (results.metrics.completionRate < 0.5) {
            recommendations.push({
                issue: 'Below average completion rate',
                severity: 'medium',
                suggestion: 'Tune difficulty - consider adding checkpoints or power-ups'
            });
        }
        
        // Analyze death rate
        const avgDeaths = results.metrics.avgDeaths;
        if (avgDeaths > 5) {
            recommendations.push({
                issue: 'Too many deaths on average',
                severity: 'high',
                suggestion: 'Reduce enemy damage or increase player health'
            });
        } else if (avgDeaths > 3) {
            recommendations.push({
                issue: 'Higher than ideal death rate',
                severity: 'medium',
                suggestion: 'Review enemy placement and attack patterns'
            });
        }
        
        // Analyze unique issues
        const uniqueIssues = [...new Set(results.issues)];
        if (uniqueIssues.length > 0) {
            uniqueIssues.forEach(issue => {
                recommendations.push({
                    issue,
                    severity: 'high',
                    suggestion: 'Investigate and fix gameplay issue'
                });
            });
        }
        
        // Analyze behaviors
        const behaviorTypes = results.behaviors.map(b => b.type);
        const quickCompletes = behaviorTypes.filter(b => b === 'quick-complete').length;
        
        if (quickCompletes > results.iterations * 0.5) {
            recommendations.push({
                issue: 'Game is too short/easy',
                severity: 'medium',
                suggestion: 'Add more content or increase difficulty'
            });
        }
        
        return recommendations;
    }
    
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // ============================================
    // IMAGE TO GAME (Simplified)
    // ============================================
    
    /**
     * Generate a game from an image (concept art)
     * This is a simplified version - full implementation would use computer vision
     * @param {string} imageUrl - URL of the concept art
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} Generated game data
     */
    async generateFromImage(imageUrl, options = {}) {
        console.log(`[Phase5] Generating game from image: ${imageUrl.substring(0, 50)}...`);
        
        const tier = this.aiSystem?.getFeatureTier?.('phase5') || 'none';
        if (tier === 'none') {
            return { success: false, error: 'Phase 5 features require subscription' };
        }
        
        try {
            // In a full implementation, this would:
            // 1. Analyze the image using computer vision
            // 2. Extract colors, shapes, objects, mood
            // 3. Generate game based on analysis
            
            // For now, return placeholder with analysis
            const analysis = await this._analyzeImage(imageUrl);
            
            // Generate game based on analysis
            const gameTemplate = this._generateGameTemplate(analysis, options);
            
            return {
                success: true,
                imageUrl,
                analysis,
                gameTemplate,
                note: 'Full image-to-game requires Ollama MAX tier with vision model'
            };
        } catch (error) {
            console.error('[Phase5] Image-to-game error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Analyze image for game generation (simplified)
     */
    async _analyzeImage(imageUrl) {
        // This would use actual computer vision in production
        return {
            dominantColors: ['#1a1a2e', '#e94560', '#0f3460'],
            mood: 'dark',
            suggestedGenre: 'horror',
            suggestedStyle: 'pixel',
            detectedObjects: ['silhouette', 'shadow', 'eyes'],
            complexity: 'medium'
        };
    }
    
    /**
     * Generate game template from image analysis
     */
    _generateGameTemplate(analysis, options) {
        return {
            title: options.title || 'Generated Game',
            genre: analysis.suggestedGenre,
            style: analysis.suggestedStyle,
            colors: analysis.dominantColors,
            mechanics: ['survival', 'escape'],
            enemies: this._suggestEnemies(analysis.mood),
            setting: analysis.mood
        };
    }
    
    _suggestEnemies(mood) {
        const enemies = {
            dark: ['shadow', 'demon', 'wraith'],
            bright: ['slime', 'blob', 'robot'],
            mysterious: ['ghost', 'phantom', 'specter']
        };
        
        return enemies[mood] || enemies.dark;
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    
    /**
     * Get feature availability
     */
    getFeatureAvailability() {
        const tier = this.aiSystem?.getFeatureTier?.('phase5') || 'none';
        
        return {
            tier,
            features: {
                gameRefinement: tier !== 'none',
                bugFixing: tier !== 'none',
                featureExpansion: tier !== 'none',
                styleTransfer: tier !== 'none',
                imageToGame: tier === 'max',
                audioGeneration: tier !== 'none',
                voiceNarration: tier !== 'none',
                gameAnalyzer: tier !== 'none',
                balanceCalculator: tier !== 'none',
                playtestSimulator: tier === 'pro' || tier === 'max'
            }
        };
    }
    
    /**
     * Get current analysis results
     */
    getAnalysis() {
        return this.currentAnalysis;
    }
    
    /**
     * Get playtest results
     */
    getPlaytestResults() {
        return this.playtestResults;
    }
}

// Initialize Phase 5 features
window.Phase5AIFeatures = Phase5AIFeatures;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.phase5Features = new Phase5AIFeatures();
});
