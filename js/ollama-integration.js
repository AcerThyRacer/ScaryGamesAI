/* ============================================
   Ollama Integration Module - Phase 1-3 Complete
   Auto-detects Ollama models and generates games
   Only accessible to MAX tier subscribers
   ============================================ */

const OLLAMA_API_BASE = 'http://localhost:11434/api';
const CUSTOM_GAMES_STORAGE_KEY = 'sgai-custom-games';
const OLLAMA_DETECTED_MODELS_KEY = 'sgai-ollama-models';
const PROMPT_HISTORY_KEY = 'sgai-prompt-history';
const GAME_CATEGORIES_KEY = 'sgai-game-categories';

// ==================== SYSTEM PROMPTS ====================

const SYSTEM_PROMPTS = {
    default: {
        name: 'Default Game Developer',
        description: 'Standard game generation with balanced output',
        prompt: `You are a game developer AI. Create a complete, playable HTML5 game based on the user's request.

IMPORTANT REQUIREMENTS:
1. Use vanilla JavaScript with HTML5 Canvas for rendering
2. Include complete game logic: player movement, collision detection, game loop, win/lose conditions
3. Use horror/spooky theme with appropriate dark colors
4. Include score system and progressive difficulty
5. Make games self-contained in a single HTML file with inline CSS and JS
6. Include proper game states: start screen, gameplay, game over
7. Use keyboard controls: WASD/Arrows for movement, Space for action
8. Add visual feedback: particle effects, screen shake, flash effects

Return ONLY the complete HTML code, no explanations or markdown formatting.`
    },
    detailed: {
        name: 'Detailed Developer',
        description: 'More comprehensive games with extra features',
        prompt: `You are an expert game developer AI. Create a highly polished, complete HTML5 game.

REQUIREMENTS:
- Use vanilla JavaScript with HTML5 Canvas
- Complete game loop with requestAnimationFrame
- Player with smooth movement and controls
- Multiple enemy types with AI behaviors
- Power-ups, collectibles, and upgrades
- Particle effects and screen shake
- Progressive difficulty scaling
- Score tracking and high scores
- Start screen, gameplay, game over, and victory states
- Sound effects using Web Audio API
- Keyboard: WASD/Arrows move, Space action, P pause, M mute
- Responsive design

Return ONLY the complete HTML code, no explanations.`
    },
    arcade: {
        name: 'Arcade Style',
        description: 'Classic arcade games with retro feel',
        prompt: `Create a classic arcade-style HTML5 game.

REQUIREMENTS:
- Retro pixel-art style graphics (use canvas drawing)
- Simple one-button or arrow key controls
- Endless gameplay with increasing difficulty
- High score system
- Particle effects for explosions/collectibles
- Neon or bright color scheme on dark background
- Smooth 60fps gameplay
- Start screen with instructions
- Game over screen with score display

Return ONLY the complete HTML code.`
    },
    story: {
        name: 'Story-Driven',
        description: 'Games with narrative elements',
        prompt: `Create a story-driven HTML5 horror game with narrative elements.

REQUIREMENTS:
- Compelling story intro
- Narrative progression through gameplay
- Multiple endings based on player choices
- Atmospheric storytelling
- Text overlays for story beats
- Character dialogue system
- Choice-based mechanics
- Horror atmosphere with appropriate visuals

Return ONLY the complete HTML code.`
    },
    minimal: {
        name: 'Minimalist',
        description: 'Simple, clean games',
        prompt: `Create a minimalist HTML5 game.

REQUIREMENTS:
- Clean, simple visuals
- Essential gameplay only
- No unnecessary features
- Smooth controls
- Clear objectives
- Minimal but effective feedback

Return ONLY the complete HTML code.`
    }
};

// ==================== GAME STYLE PRESETS ====================

const GAME_STYLES = {
    pixel_art: {
        name: 'Pixel Art',
        icon: '👾',
        description: 'Retro 8-bit/16-bit style',
        css: 'image-rendering: pixelated;'
    },
    neon: {
        name: 'Neon',
        icon: '💜',
        description: 'Glowing neon effects',
        css: 'filter: drop-shadow(0 0 10px currentColor);'
    },
    realistic: {
        name: 'Realistic',
        icon: '🎬',
        description: 'Photo-realistic graphics',
        css: ''
    },
    low_poly: {
        name: 'Low Poly',
        icon: '🔷',
        description: '3D low polygon style',
        css: ''
    },
    hand_drawn: {
        name: 'Hand Drawn',
        icon: '✏️',
        description: 'Artistic hand-drawn look',
        css: ''
    },
    comic: {
        name: 'Comic Book',
        icon: '💬',
        description: 'Comic-style visuals',
        css: 'filter: contrast(1.2) saturate(1.2);'
    },
    retro: {
        name: 'Retro CRT',
        icon: '📺',
        description: 'Old school CRT effect',
        css: 'filter: brightness(1.1) contrast(1.1);'
    },
    abstract: {
        name: 'Abstract',
        icon: '🔮',
        description: 'Abstract geometric art',
        css: ''
    }
};

// ==================== ERROR MESSAGES ====================

const ERROR_MESSAGES = {
    connection: {
        title: 'Connection Error',
        message: 'Could not connect to Ollama. Make sure Ollama is running on your computer.',
        solution: 'Start Ollama using: ollama serve'
    },
    timeout: {
        title: 'Generation Timeout',
        message: 'The game generation took too long and was cancelled.',
        solution: 'Try a simpler prompt or increase the timeout in advanced options.'
    },
    model_not_found: {
        title: 'Model Not Found',
        message: 'The selected AI model could not be found.',
        solution: 'Pull the model using: ollama pull <model-name>'
    },
    invalid_response: {
        title: 'Invalid Response',
        message: 'Ollama returned an unexpected response.',
        solution: 'Try again with a different model or prompt.'
    },
    no_models: {
        title: 'No Models Available',
        message: 'No Ollama models found on your system.',
        solution: 'Install models using: ollama pull <model-name>'
    },
    rate_limit: {
        title: 'Rate Limited',
        message: 'Too many requests. Please wait a moment.',
        solution: 'Wait a few seconds before trying again.'
    },
    partial: {
        title: 'Incomplete Generation',
        message: 'The generation was interrupted but a partial game was saved.',
        solution: 'You can still try to play the game or regenerate.'
    }
};

// ==================== PROMPT TEMPLATES ====================

const PROMPT_TEMPLATES = {
    genres: {
        endless_runner: {
            name: 'Endless Runner',
            icon: '🏃',
            description: 'Run as far as you can while avoiding obstacles',
            prompt: 'Create an endless runner game where the player runs through {setting} while being chased by {threat}. Include obstacles to jump over, collectibles to gather, and increasing speed over time. Use {visual_style} visuals.'
        },
        maze_escape: {
            name: 'Maze Escape',
            icon: '🔱',
            description: 'Navigate through mysterious mazes',
            prompt: 'Create a first-person maze escape game where the player must find the exit before time runs out. Include {mechanic} and spooky ambient sounds. The maze should be {complexity}.'
        },
        zombie_shooter: {
            name: 'Zombie Shooter',
            icon: '🔫',
            description: 'Shoot waves of undead enemies',
            prompt: 'Create a top-down zombie shooter game with WASD movement and mouse aiming. Include different {enemy_types}, ammo management, and wave-based gameplay with increasing difficulty.'
        },
        puzzle_horror: {
            name: 'Puzzle Horror',
            icon: '🧩',
            description: 'Solve puzzles in terrifying environments',
            prompt: 'Create a point-and-click puzzle horror game where the player must solve {puzzle_type} to escape {location}. Include atmospheric {effect} effects and creepy music.'
        },
        stealth_horror: {
            name: 'Stealth Horror',
            icon: '👁️',
            description: 'Hide and survive from deadly threats',
            prompt: 'Create a stealth horror game where the player must hide from {enemy} that roams the area. Include {hiding_spot}, line-of-sight mechanics, and tension-building audio.'
        },
        wave_survival: {
            name: 'Wave Survival',
            icon: '🌊',
            description: 'Survive endless waves of enemies',
            prompt: 'Create a wave-based survival game where players defend against increasingly difficult waves of {enemies}. Include {powerups}, {upgrades}, and strategic positioning.'
        },
        dungeon_crawler: {
            name: 'Dungeon Crawler',
            icon: '🗡️',
            description: 'Explore dark dungeons and fight monsters',
            prompt: 'Create a top-down dungeon crawler with {view} perspective. Include {combat_system}, {progression}, and {loot_system}. Explore procedurally generated rooms.'
        },
        escape_room: {
            name: 'Escape Room',
            icon: '🚪',
            description: 'Find clues and solve puzzles to escape',
            prompt: 'Create an escape room game with multiple {puzzle_types}. The player must find clues, combine items, and solve riddles to escape {location} before time runs out.'
        }
    },
    themes: {
        horror: { name: 'Classic Horror', icon: '👻', description: 'Traditional horror with ghosts and monsters' },
        thriller: { name: 'Psychological Thriller', icon: '🔪', description: 'Mind-bending psychological terror' },
        supernatural: { name: 'Supernatural', icon: '🜏', description: 'Paranormal phenomena and occult themes' },
        slasher: { name: 'Slasher', icon: '🩸', description: 'Gore and intense action horror' },
        cosmic: { name: 'Cosmic Horror', icon: '🐙', description: 'Eldritch horrors from beyond' },
        zombie: { name: 'Zombie Apocalypse', icon: '🧟', description: 'Survive the undead horde' }
    },
    difficulties: {
        easy: { name: 'Easy', description: 'Relaxed gameplay', multiplier: 0.7 },
        medium: { name: 'Medium', description: 'Balanced challenge', multiplier: 1.0 },
        hard: { name: 'Hard', description: 'Tough challenges', multiplier: 1.5 },
        extreme: { name: 'Extreme', description: 'Maximum difficulty', multiplier: 2.0 }
    },
    settings: [
        'dark forest', 'abandoned hospital', 'haunted mansion', 'underground bunker',
        'cursed cemetery', 'demon temple', 'vampire castle', 'zombie apocalypse city',
        'alien spaceship', 'deep sea base', 'abandoned school', 'psychiatric ward',
        'ancient tomb', 'cursed village', 'nightmare dimension', 'abandoned asylum'
    ],
    threats: [
        'shadowy creatures', 'possessed dolls', 'crawling nightmares', 'angry spirits',
        'mutated zombies', 'hunting demons', 'ancient curses', 'parasitic aliens',
        'spectral hunters', 'flesh-eating monsters', 'mind-controlling entities'
    ],
    visualStyles: [
        'dark atmospheric', 'pixel art horror', 'realistic shadows', 'neon nightmare',
        'vintage grainy', 'minimalist dark', 'surreal twisted', 'comic book horror'
    ],
    mechanics: [
        'flashlight mechanic', 'limited vision', 'sound-based detection', 'sanity system',
        'stamina management', 'inventory system', 'crafting mechanics', 'health regeneration'
    ]
};

const RECOMMENDED_PROMPTS = [
    { id: 'endless-runner', title: 'Endless Runner', category: 'genre', genre: 'endless_runner', prompt: 'Create a horror endless runner game where the player runs through a dark forest while being chased by shadowy creatures. Include obstacles to jump over, coins to collect, and increasing speed over time. Use dark atmospheric colors.' },
    { id: 'maze-escape', title: 'Maze Escape', category: 'genre', genre: 'maze_escape', prompt: 'Create a first-person maze escape game where the player must find the exit before time runs out. Include a flashlight mechanic and spooky ambient sounds.' },
    { id: 'zombie-shooter', title: 'Zombie Shooter', category: 'genre', genre: 'zombie_shooter', prompt: 'Create a top-down zombie shooter game with WASD movement and mouse aiming. Include different zombie types, ammo management, and wave-based gameplay.' },
    { id: 'puzzle-horror', title: 'Puzzle Horror', category: 'genre', genre: 'puzzle_horror', prompt: 'Create a point-and-click puzzle horror game where the player must solve riddles to escape a haunted room.' },
    { id: 'stealth-horror', title: 'Stealth Horror', category: 'genre', genre: 'stealth_horror', prompt: 'Create a stealth horror game where the player must hide from a killer that roams the area.' },
    { id: 'wave-survival', title: 'Wave Survival', category: 'genre', genre: 'wave_survival', prompt: 'Create a wave-based survival game where you defend against waves of zombies.' },
    { id: 'dungeon-crawler', title: 'Dungeon Crawler', category: 'genre', genre: 'dungeon_crawler', prompt: 'Create a top-down dungeon crawler with procedural rooms.' },
    { id: 'escape-room', title: 'Escape Room', category: 'genre', genre: 'escape_room', prompt: 'Create an escape room game with multiple puzzle types.' }
];

const TUTORIAL_STEPS = [
    { title: 'Welcome to Game Builder', content: 'Create AI-powered horror games instantly.', position: 'center' },
    { title: 'Choose a Game Type', content: 'Pick from 8 game types with customizable options.', position: 'top' },
    { title: 'Set Difficulty', content: 'Choose Easy, Medium, Hard, or Extreme.', position: 'top' },
    { title: 'Customize Your Game', content: 'Add your own setting, enemies, visual style.', position: 'top' },
    { title: 'Generate & Play', content: 'Click Generate and watch AI create your game!', position: 'bottom' }
];

const PROMPT_TIPS = [
    'Be specific about game mechanics you want',
    'Mention the setting clearly',
    'Include difficulty preferences',
    'Specify visual style',
    'Add special features like power-ups'
];

const EXAMPLE_PROMPTS = [
    'Create a top-down zombie shooter with wave-based gameplay, multiple weapon types, and increasing difficulty.',
    'Build a first-person maze escape game with a flashlight mechanic and random maze generation.',
    'Create an endless runner where you run through a dark forest being chased by shadowy creatures.'
];

const KEYBOARD_SHORTCUTS = {
    'Ctrl+G': 'Generate game',
    'Ctrl+S': 'Save game',
    'Ctrl+H': 'Toggle history',
    'Ctrl+?': 'Show help',
    'Escape': 'Close modal/Stop generation'
};

// ==================== MAIN INTEGRATION ====================

const OllamaIntegration = {
    worker: null,
    generationInProgress: false,
    generationAbortController: null,
    
    // Initialize Web Worker
    initWorker() {
        if (!this.worker && typeof Worker !== 'undefined') {
            try {
                this.worker = new Worker('/js/ollama-worker.js');
                this.worker.onmessage = this.handleWorkerMessage.bind(this);
                this.worker.onerror = this.handleWorkerError.bind(this);
            } catch (e) {
                console.warn('Web Worker not supported:', e);
            }
        }
        return this.worker;
    },
    
    // Handle worker messages
    handleWorkerMessage(e) {
        const { type, progress, status, result, error, errorType, tokens, chunk, warning } = e.data;
        
        if (type === 'progress' && this.onProgress) {
            this.onProgress(progress, status, tokens, chunk);
        }
        
        if (type === 'complete' && this.onComplete) {
            this.onComplete(result, tokens, warning);
        }
        
        if (type === 'error' && this.onError) {
            this.onError(error, errorType);
        }
    },
    
    // Handle worker errors
    handleWorkerError(error) {
        console.error('Worker error:', error);
        if (this.onError) {
            this.onError(error.message, 'worker');
        }
    },
    
    // Check if Ollama is running
    async checkOllamaStatus() {
        try {
            const response = await fetch(`${OLLAMA_API_BASE}/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch (e) {
            return false;
        }
    },
    
    // Get all available models
    async getModels() {
        // Check cache first
        try {
            const cached = await OllamaDB.getCache('ollama-models');
            if (cached && cached.length > 0) {
                return cached;
            }
        } catch (e) {}
        
        try {
            const response = await fetch(`${OLLAMA_API_BASE}/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(10000)
            });
            if (!response.ok) return [];
            
            const data = await response.json();
            const models = data.models || [];
            
            // Cache the models for 5 minutes
            try {
                await OllamaDB.setCache('ollama-models', models, 300000);
            } catch (e) {
                localStorage.setItem(OLLAMA_DETECTED_MODELS_KEY, JSON.stringify(models));
            }
            
            return models;
        } catch (e) {
            const cached = localStorage.getItem(OLLAMA_DETECTED_MODELS_KEY);
            return cached ? JSON.parse(cached) : [];
        }
    },
    
    // Generate a game using Web Worker (non-blocking)
    generateGameAsync(prompt, model, options = {}, onProgress, onComplete, onError) {
        this.onProgress = onProgress;
        this.onComplete = onComplete;
        this.onError = onError;
        
        const worker = this.initWorker();
        
        if (worker) {
            this.generationInProgress = true;
            worker.postMessage({
                type: 'generate',
                data: { prompt, model, options }
            });
        } else {
            // Fallback to direct generation
            this.generateGame(prompt, model, options, onProgress, onComplete).catch(onError);
        }
    },
    
    // Cancel current generation
    cancelGeneration() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.generationInProgress = false;
    },
    
    // Generate game (direct - for fallback)
    async generateGame(prompt, model, options = {}, onChunk, onProgress) {
        const { timeout = 180000, temperature = 0.7, topP = 0.9, maxTokens = 8000 } = options;
        
        const systemPrompt = this.getSystemPrompt(options.systemPrompt || 'default');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(`${OLLAMA_API_BASE}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: `${systemPrompt}\n\nUser request: ${prompt}`,
                    stream: true,
                    options: { temperature, top_p: topP, num_predict: maxTokens }
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }
            
            let fullResponse = '';
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let tokenCount = 0;
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.response) {
                            fullResponse += data.response;
                            tokenCount++;
                            if (onChunk) onChunk(fullResponse, tokenCount);
                            if (onProgress) onProgress(Math.min(95, 50 + tokenCount * 0.5));
                        }
                        if (data.done) {
                            if (onProgress) onProgress(100);
                            return fullResponse;
                        }
                    } catch (e) {}
                }
            }
            
            return fullResponse;
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                throw new Error('Generation timed out. Try a simpler prompt.');
            }
            throw e;
        }
    },
    
    // Get system prompt by type
    getSystemPrompt(type = 'default') {
        return SYSTEM_PROMPTS[type]?.prompt || SYSTEM_PROMPTS.default.prompt;
    },
    
    // Get available system prompts
    getSystemPrompts() {
        return SYSTEM_PROMPTS;
    },
    
    // Get game styles
    getGameStyles() {
        return GAME_STYLES;
    },
    
    // Get error message
    getErrorMessage(errorType) {
        return ERROR_MESSAGES[errorType] || ERROR_MESSAGES.connection;
    },
    
    // Generate with fallback models
    async generateWithFallback(prompt, models, options = {}, onProgress, onChunk) {
        const errors = [];
        
        for (const model of models) {
            try {
                const result = await this.generateGame(prompt, model, options, onChunk, onProgress);
                return { success: true, result, model, errors };
            } catch (e) {
                errors.push({ model, error: e.message });
                console.warn(`Generation failed with model ${model}:`, e);
            }
        }
        
        return { success: false, errors };
    },
    
    // Validate generated game
    validateGame(html) {
        const issues = [];
        const warnings = [];
        
        if (!html.includes('<canvas')) issues.push('Missing <canvas>');
        if (!html.includes('<script')) issues.push('Missing <script>');
        if (!html.includes('requestAnimationFrame') && !html.includes('setInterval')) {
            warnings.push('No standard game loop');
        }
        if (!html.includes('keydown') && !html.includes('keyup')) {
            warnings.push('No keyboard controls');
        }
        
        const maliciousPatterns = [
            { pattern: /eval\s*\(/g, message: 'Contains eval()' },
            { pattern: /document\.cookie/g, message: 'Accesses cookies' },
            { pattern: /fetch\s*\(\s*['"]/g, message: 'External requests' }
        ];
        
        for (const { pattern, message } of maliciousPatterns) {
            if (pattern.test(html)) warnings.push(message);
        }
        
        return {
            valid: issues.length === 0,
            issues,
            warnings,
            score: Math.max(0, 100 - issues.length * 20 - warnings.length * 5),
            metadata: this.extractMetadata(html)
        };
    },
    
    // Extract game metadata
    extractMetadata(html) {
        return {
            title: (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || 'Generated Game',
            canvasWidth: parseInt((html.match(/<canvas[^>]*width\s*=\s*["']?(\d+)/i) || [])[1]) || 800,
            canvasHeight: parseInt((html.match(/<canvas[^>]*height\s*=\s*["']?(\d+)/i) || [])[1]) || 600,
            hasSound: /Audio|audio|Howler/.test(html),
            hasParticles: /particle|Particle/.test(html),
            estimatedComplexity: html.length > 20000 ? 'complex' : html.length > 10000 ? 'moderate' : 'simple'
        };
    },
    
    // Parse generated game
    parseGeneratedGame(htmlContent, title, validation = null) {
        if (!title) {
            title = (htmlContent.match(/<title>(.*?)<\/title>/i) || [])[1] || 'Generated Game';
        }
        
        if (!validation) validation = this.validateGame(htmlContent);
        
        return {
            id: 'custom_' + Date.now(),
            title,
            description: (htmlContent.match(/<meta name="description" content="([^"]+)"/i) || [])[1] || 'AI-generated horror game',
            html: htmlContent,
            validation,
            category: 'uncategorized',
            thumbnail: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            played: false,
            playCount: 0,
            highScore: 0,
            versions: [{ id: 'v1', html: htmlContent, createdAt: new Date().toISOString() }]
        };
    },
    
    // ============ GAME STORAGE (IndexedDB) ============
    
    async saveCustomGame(game) {
        try {
            await OllamaDB.saveGame(game);
            // Also save to localStorage as backup
            const games = this.getCustomGamesLocal();
            games.push(game);
            localStorage.setItem(CUSTOM_GAMES_STORAGE_KEY, JSON.stringify(games));
            return game;
        } catch (e) {
            // Fallback to localStorage
            const games = this.getCustomGamesLocal();
            games.push(game);
            localStorage.setItem(CUSTOM_GAMES_STORAGE_KEY, JSON.stringify(games));
            return game;
        }
    },
    
    async getCustomGames() {
        try {
            return await OllamaDB.getAllGames();
        } catch (e) {
            return this.getCustomGamesLocal();
        }
    },
    
    getCustomGamesLocal() {
        try {
            const games = localStorage.getItem(CUSTOM_GAMES_STORAGE_KEY);
            return games ? JSON.parse(games) : [];
        } catch (e) {
            return [];
        }
    },
    
    async getGameById(id) {
        try {
            return await OllamaDB.getGame(id);
        } catch (e) {
            return this.getCustomGamesLocal().find(g => g.id === id);
        }
    },
    
    async deleteCustomGame(id) {
        try {
            await OllamaDB.deleteGame(id);
        } catch (e) {}
        
        const games = this.getCustomGamesLocal().filter(g => g.id !== id);
        localStorage.setItem(CUSTOM_GAMES_STORAGE_KEY, JSON.stringify(games));
        return games;
    },
    
    async updateGame(id, updates) {
        try {
            await OllamaDB.updateGame(id, updates);
        } catch (e) {}
        
        const games = this.getCustomGamesLocal();
        const index = games.findIndex(g => g.id === id);
        if (index !== -1) {
            games[index] = { ...games[index], ...updates, updatedAt: new Date().toISOString() };
            localStorage.setItem(CUSTOM_GAMES_STORAGE_KEY, JSON.stringify(games));
        }
        return games;
    },
    
    getCategories() {
        const games = this.getCustomGamesLocal();
        const categories = new Set(games.map(g => g.category || 'uncategorized'));
        return Array.from(categories);
    },
    
    searchGames(query) {
        const games = this.getCustomGamesLocal();
        const lowerQuery = query.toLowerCase();
        return games.filter(g => 
            g.title.toLowerCase().includes(lowerQuery) ||
            g.description.toLowerCase().includes(lowerQuery)
        );
    },
    
    sortGames(games, sortBy, order = 'desc') {
        return [...games].sort((a, b) => {
            let comparison = 0;
            switch(sortBy) {
                case 'title': comparison = a.title.localeCompare(b.title); break;
                case 'created': comparison = new Date(a.createdAt) - new Date(b.createdAt); break;
                case 'updated': comparison = new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt); break;
                case 'played': comparison = (a.playCount || 0) - (b.playCount || 0); break;
                case 'score': comparison = (a.highScore || 0) - (b.highScore || 0); break;
            }
            return order === 'desc' ? -comparison : comparison;
        });
    },
    
    // ============ GAME STATS ============
    
    updateGameStats(gameId, stats) {
        const games = this.getCustomGamesLocal();
        const game = games.find(g => g.id === gameId);
        if (game) {
            game.played = true;
            game.playCount = (game.playCount || 0) + 1;
            if (stats.highScore && stats.highScore > (game.highScore || 0)) {
                game.highScore = stats.highScore;
            }
            localStorage.setItem(CUSTOM_GAMES_STORAGE_KEY, JSON.stringify(games));
        }
        return games;
    },
    
    // ============ PROMPT SYSTEM ============
    
    getRecommendedPrompts() { return RECOMMENDED_PROMPTS; },
    getPromptTemplates() { return PROMPT_TEMPLATES; },
    getTutorialSteps() { return TUTORIAL_STEPS; },
    getPromptTips() { return PROMPT_TIPS; },
    getExamplePrompts() { return EXAMPLE_PROMPTS; },
    getKeyboardShortcuts() { return KEYBOARD_SHORTCUTS; },
    
    buildPromptFromTemplate(templateId, customizations) {
        const template = PROMPT_TEMPLATES.genres[templateId];
        if (!template) return null;
        
        let prompt = template.prompt;
        const replacements = {
            '{setting}': customizations.setting || 'dark forest',
            '{threat}': customizations.threat || 'shadowy creatures',
            '{visual_style}': customizations.visualStyle || 'dark atmospheric',
            '{mechanic}': customizations.mechanic || 'flashlight',
            '{complexity}': customizations.complexity || 'randomly generated',
            '{enemy_types}': customizations.enemyTypes || 'different zombie types',
            '{puzzle_type}': customizations.puzzleType || 'riddles',
            '{location}': customizations.location || 'haunted room',
            '{effect}': customizations.effect || 'lighting',
            '{enemy}': customizations.enemy || 'a killer',
            '{hiding_spot}': customizations.hidingSpot || 'hiding spots',
            '{enemies}': customizations.enemies || 'zombies',
            '{powerups}': customizations.powerups || 'health packs',
            '{upgrades}': customizations.upgrades || 'weapon upgrades'
        };
        
        for (const [placeholder, value] of Object.entries(replacements)) {
            prompt = prompt.replace(new RegExp(placeholder, 'g'), value);
        }
        
        const difficulty = customizations.difficulty || 'medium';
        const diffSettings = PROMPT_TEMPLATES.difficulties[difficulty];
        if (difficulty !== 'medium') {
            prompt += ` Set difficulty to ${diffSettings.name.toLowerCase()}.`;
        }
        
        return prompt;
    },
    
    // Prompt history
    getPromptHistory() {
        try {
            return JSON.parse(localStorage.getItem(PROMPT_HISTORY_KEY)) || [];
        } catch (e) {
            return [];
        }
    },
    
    addToPromptHistory(prompt) {
        const history = this.getPromptHistory();
        history.unshift({ prompt, timestamp: new Date().toISOString() });
        if (history.length > 20) history.pop();
        localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(history));
        return history;
    },
    
    clearPromptHistory() {
        localStorage.removeItem(PROMPT_HISTORY_KEY);
    },
    
    // ============ UTILITY ============
    
    hasMaxTier() {
        return (localStorage.getItem('sgai-sub-tier') || 'none') === 'max';
    },
    
    isTutorialCompleted() {
        return localStorage.getItem('sgai-tutorial-completed') === 'true';
    },
    
    completeTutorial() {
        localStorage.setItem('sgai-tutorial-completed', 'true');
    },
    
    sanitizeGameHtml(html) {
        let sanitized = html;
        sanitized = sanitized.replace(/<script[^>]*src\s*=\s*["'][^"']+["'][^>]*>/gi, '');
        sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
        sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
        return sanitized;
    },
    
    exportGameAsHtml(game) {
        const blob = new Blob([game.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${game.title.replace(/[^a-z0-9]/gi, '_')}.html`;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    // Check prompt length
    checkPromptLength(prompt) {
        const maxLength = 2000;
        const length = prompt.length;
        return {
            length,
            maxLength,
            percent: Math.round((length / maxLength) * 100),
            isOverLimit: length > maxLength
        };
    }
};

// Export
window.OllamaIntegration = OllamaIntegration;
window.OllamaDB = OllamaDB;
window.SYSTEM_PROMPTS = SYSTEM_PROMPTS;
window.GAME_STYLES = GAME_STYLES;
window.ERROR_MESSAGES = ERROR_MESSAGES;
