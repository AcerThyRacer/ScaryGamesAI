/**
 * BACKROOMS PACMAN - PHASE 5: INFINITE CONTENT & MODDING
 * Procedural generation, modding system, AI content, community features
 */

(function() {
    'use strict';

    // ============================================
    // PHASE 5.1: PROCEDURAL LEVEL GENERATION
    // ============================================
    
    const ProceduralLevelGen = {
        // Generation parameters
        params: {
            width: 50,
            height: 50,
            roomCount: 20,
            roomMinSize: 3,
            roomMaxSize: 8,
            corridorWidth: 2,
            complexity: 0.7,
            seed: 0
        },
        
        // Generated data
        grid: [],
        rooms: [],
        corridors: [],
        spawnPoints: [],
        items: [],
        
        // Themes
        themes: {
            CLASSIC: {
                name: 'Classic Backrooms',
                wallColor: 0xb5a44c,
                floorColor: 0x8b7355,
                ceilingColor: 0xc4b35a,
                lightColor: 0xffffee,
                fogColor: 0x0a0a0a,
                fogDensity: 0.02,
                ambientSound: 'buzzing',
                entities: ['pacman', 'smiler'],
                items: ['pellet', 'power_pellet'],
                dangerLevel: 0.5
            },
            POOLROOMS: {
                name: 'Poolrooms',
                wallColor: 0x4a90a4,
                floorColor: 0x2c5f6f,
                ceilingColor: 0x6bb3c7,
                lightColor: 0x88ccff,
                fogColor: 0x001122,
                fogDensity: 0.03,
                ambientSound: 'water',
                entities: ['pacman', 'hydrolitis'],
                items: ['pellet', 'oxygen_tank'],
                dangerLevel: 0.7
            },
            REDROOMS: {
                name: 'Red Rooms',
                wallColor: 0x8b0000,
                floorColor: 0x4a0000,
                ceilingColor: 0x660000,
                lightColor: 0xff0000,
                fogColor: 0x220000,
                fogDensity: 0.04,
                ambientSound: 'heartbeat',
                entities: ['pacman', 'red_entity'],
                items: ['pellet', 'blood_vial'],
                dangerLevel: 0.9
            },
            FOREST: {
                name: 'Endless Forest',
                wallColor: 0x2d5016,
                floorColor: 0x3d6b1f,
                ceilingColor: 0x1a3309,
                lightColor: 0x90ee90,
                fogColor: 0x0a1a0a,
                fogDensity: 0.025,
                ambientSound: 'wind',
                entities: ['pacman', 'tree_entity'],
                items: ['pellet', 'mushroom'],
                dangerLevel: 0.6
            }
        },
        
        currentTheme: null,
        
        init(seed = Date.now()) {
            this.params.seed = seed;
            this.rng = this.createRNG(seed);
            console.log('[Phase 5] Procedural level generator initialized with seed:', seed);
        },
        
        createRNG(seed) {
            // Mulberry32 PRNG
            return function() {
                let t = seed += 0x6D2B79F5;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        },
        
        generateLevel(themeName = 'CLASSIC') {
            console.log('[Phase 5] Generating level with theme:', themeName);
            
            this.currentTheme = this.themes[themeName] || this.themes.CLASSIC;
            
            // Reset
            this.grid = [];
            this.rooms = [];
            this.corridors = [];
            this.spawnPoints = [];
            this.items = [];
            
            // Initialize grid
            for (let y = 0; y < this.params.height; y++) {
                this.grid[y] = [];
                for (let x = 0; x < this.params.width; x++) {
                    this.grid[y][x] = 1; // 1 = wall
                }
            }
            
            // Generate rooms
            this.generateRooms();
            
            // Connect rooms with corridors
            this.generateCorridors();
            
            // Place items
            this.placeItems();
            
            // Place entities
            this.placeEntities();
            
            // Create spawn points
            this.createSpawnPoints();
            
            // Validate level
            this.validateLevel();
            
            console.log('[Phase 5] Level generation complete');
            console.log('[Phase 5] Rooms:', this.rooms.length, 'Corridors:', this.corridors.length);
            
            return {
                grid: this.grid,
                rooms: this.rooms,
                corridors: this.corridors,
                spawnPoints: this.spawnPoints,
                items: this.items,
                theme: this.currentTheme
            };
        },
        
        generateRooms() {
            const attempts = this.params.roomCount * 3;
            
            for (let i = 0; i < attempts && this.rooms.length < this.params.roomCount; i++) {
                const width = Math.floor(
                    this.rng() * (this.params.roomMaxSize - this.params.roomMinSize + 1) + 
                    this.params.roomMinSize
                );
                const height = Math.floor(
                    this.rng() * (this.params.roomMaxSize - this.params.roomMinSize + 1) + 
                    this.params.roomMinSize
                );
                
                const x = Math.floor(this.rng() * (this.params.width - width - 2)) + 1;
                const y = Math.floor(this.rng() * (this.params.height - height - 2)) + 1;
                
                const room = { x, y, width, height, center: { x: x + width/2, y: y + height/2 } };
                
                // Check overlap
                if (!this.rooms.some(r => this.roomsOverlap(r, room))) {
                    this.rooms.push(room);
                    
                    // Carve room
                    for (let ry = y; ry < y + height; ry++) {
                        for (let rx = x; rx < x + width; rx++) {
                            this.grid[ry][rx] = 0; // 0 = floor
                        }
                    }
                }
            }
        },
        
        roomsOverlap(r1, r2) {
            return !(r1.x + r1.width < r2.x || 
                    r2.x + r2.width < r1.x || 
                    r1.y + r1.height < r2.y || 
                    r2.y + r2.height < r1.y);
        },
        
        generateCorridors() {
            // Connect each room to the nearest room
            for (let i = 0; i < this.rooms.length; i++) {
                const roomA = this.rooms[i];
                
                // Find nearest room
                let nearest = null;
                let minDist = Infinity;
                
                for (let j = 0; j < this.rooms.length; j++) {
                    if (i === j) continue;
                    
                    const roomB = this.rooms[j];
                    const dist = Math.sqrt(
                        Math.pow(roomA.center.x - roomB.center.x, 2) +
                        Math.pow(roomA.center.y - roomB.center.y, 2)
                    );
                    
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = roomB;
                    }
                }
                
                if (nearest) {
                    this.createCorridor(roomA.center, nearest.center);
                }
            }
            
            // Ensure connectivity with additional corridors
            for (let i = 0; i < this.rooms.length - 1; i++) {
                if (this.rng() < this.params.complexity) {
                    this.createCorridor(
                        this.rooms[i].center,
                        this.rooms[i + 1].center
                    );
                }
            }
        },
        
        createCorridor(start, end) {
            // L-shaped corridor
            const corridor = {
                points: [],
                width: this.params.corridorWidth
            };
            
            // Horizontal then vertical
            let x = Math.floor(start.x);
            let y = Math.floor(start.y);
            const endX = Math.floor(end.x);
            const endY = Math.floor(end.y);
            
            // Horizontal segment
            while (x !== endX) {
                corridor.points.push({ x, y });
                this.carveCorridor(x, y);
                x += x < endX ? 1 : -1;
            }
            
            // Vertical segment
            while (y !== endY) {
                corridor.points.push({ x, y });
                this.carveCorridor(x, y);
                y += y < endY ? 1 : -1;
            }
            
            this.corridors.push(corridor);
        },
        
        carveCorridor(x, y) {
            const halfWidth = Math.floor(this.params.corridorWidth / 2);
            
            for (let dy = -halfWidth; dy <= halfWidth; dy++) {
                for (let dx = -halfWidth; dx <= halfWidth; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < this.params.width && 
                        ny >= 0 && ny < this.params.height) {
                        this.grid[ny][nx] = 0;
                    }
                }
            }
        },
        
        placeItems() {
            const itemTypes = this.currentTheme.items;
            
            // Place items in rooms
            this.rooms.forEach(room => {
                if (this.rng() < 0.7) {
                    const itemType = itemTypes[Math.floor(this.rng() * itemTypes.length)];
                    const x = Math.floor(room.x + this.rng() * room.width);
                    const y = Math.floor(room.y + this.rng() * room.height);
                    
                    this.items.push({
                        type: itemType,
                        x: x,
                        y: y,
                        id: `item_${Date.now()}_${Math.floor(this.rng() * 10000)}`
                    });
                }
            });
        },
        
        placeEntities() {
            const entityTypes = this.currentTheme.entities;
            
            // Place entities in rooms
            this.rooms.forEach(room => {
                if (this.rng() < this.currentTheme.dangerLevel) {
                    const entityType = entityTypes[Math.floor(this.rng() * entityTypes.length)];
                    const x = Math.floor(room.x + this.rng() * room.width);
                    const y = Math.floor(room.y + this.rng() * room.height);
                    
                    // Store entity spawn point
                    this.spawnPoints.push({
                        type: 'entity',
                        entityType: entityType,
                        x: x,
                        y: y
                    });
                }
            });
        },
        
        createSpawnPoints() {
            // Player spawn - safest room
            let safestRoom = this.rooms[0];
            let maxDistance = 0;
            
            this.rooms.forEach(room => {
                let minEnemyDist = Infinity;
                
                this.spawnPoints.forEach(spawn => {
                    if (spawn.type === 'entity') {
                        const dist = Math.sqrt(
                            Math.pow(room.center.x - spawn.x, 2) +
                            Math.pow(room.center.y - spawn.y, 2)
                        );
                        minEnemyDist = Math.min(minEnemyDist, dist);
                    }
                });
                
                if (minEnemyDist > maxDistance) {
                    maxDistance = minEnemyDist;
                    safestRoom = room;
                }
            });
            
            this.spawnPoints.push({
                type: 'player',
                x: safestRoom.center.x,
                y: safestRoom.center.y
            });
        },
        
        validateLevel() {
            // Ensure all rooms are reachable
            // This is a simplified check
            if (this.rooms.length < 3) {
                console.warn('[Phase 5] Level validation failed: Not enough rooms');
                return false;
            }
            
            if (this.spawnPoints.length === 0) {
                console.warn('[Phase 5] Level validation failed: No spawn points');
                return false;
            }
            
            return true;
        },
        
        // Generate 3D mesh from grid
        generateMesh() {
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const uvs = [];
            const indices = [];
            
            const cellSize = 4;
            
            for (let y = 0; y < this.params.height; y++) {
                for (let x = 0; x < this.params.width; x++) {
                    if (this.grid[y][x] === 1) {
                        // Create wall
                        const wx = x * cellSize;
                        const wz = y * cellSize;
                        
                        // Wall vertices (simplified)
                        const base = vertices.length / 3;
                        
                        // Front face
                        vertices.push(
                            wx, 0, wz,
                            wx + cellSize, 0, wz,
                            wx + cellSize, 3, wz,
                            wx, 3, wz
                        );
                        
                        uvs.push(
                            0, 0,
                            1, 0,
                            1, 1,
                            0, 1
                        );
                        
                        indices.push(
                            base, base + 1, base + 2,
                            base, base + 2, base + 3
                        );
                    }
                }
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            
            return geometry;
        },
        
        // Get random theme
        getRandomTheme() {
            const themeNames = Object.keys(this.themes);
            return themeNames[Math.floor(this.rng() * themeNames.length)];
        },
        
        // Export level data
        exportLevel() {
            return {
                version: '1.0',
                seed: this.params.seed,
                theme: this.currentTheme.name,
                grid: this.grid,
                rooms: this.rooms,
                items: this.items,
                spawnPoints: this.spawnPoints,
                generatedAt: Date.now()
            };
        },
        
        // Import level data
        importLevel(data) {
            this.params.seed = data.seed;
            this.rng = this.createRNG(data.seed);
            this.currentTheme = this.themes[Object.keys(this.themes).find(
                k => this.themes[k].name === data.theme
            )] || this.themes.CLASSIC;
            
            this.grid = data.grid;
            this.rooms = data.rooms;
            this.items = data.items;
            this.spawnPoints = data.spawnPoints;
        }
    };

    // ============================================
    // PHASE 5.2: MODDING SYSTEM
    // ============================================
    
    const ModdingSystem = {
        // Loaded mods
        mods: new Map(),
        
        // Mod API
        api: null,
        
        // Asset overrides
        assetOverrides: new Map(),
        
        // Script hooks
        hooks: {
            preUpdate: [],
            postUpdate: [],
            onPlayerMove: [],
            onEntitySpawn: [],
            onItemCollect: [],
            onDamage: [],
            onDeath: [],
            onLevelLoad: [],
            onRender: []
        },
        
        init() {
            console.log('[Phase 5] Initializing modding system...');
            
            // Create mod API
            this.createAPI();
            
            // Load built-in mods
            this.loadBuiltInMods();
            
            // Load user mods from storage
            this.loadUserMods();
            
            console.log('[Phase 5] Modding system initialized');
        },
        
        createAPI() {
            this.api = {
                // Game state access
                getGameState: () => window.PhasesIntegration?.gameState,
                getPlayer: () => window.PhasesIntegration?.gameState?.player,
                getScene: () => window.PhasesIntegration?.scene,
                
                // Entity spawning
                spawnEntity: (type, position, options) => {
                    return this.spawnEntity(type, position, options);
                },
                
                // Item spawning
                spawnItem: (type, position) => {
                    return this.spawnItem(type, position);
                },
                
                // Event hooks
                on: (event, callback) => {
                    this.registerHook(event, callback);
                },
                
                // Asset loading
                loadTexture: (url) => this.loadTexture(url),
                loadModel: (url) => this.loadModel(url),
                loadSound: (url) => this.loadSound(url),
                
                // UI
                createUI: (html, css) => this.createModUI(html, css),
                showNotification: (message, type) => this.showNotification(message, type),
                
                // Audio
                playSound: (soundId, options) => this.playSound(soundId, options),
                playMusic: (musicId) => this.playMusic(musicId),
                
                // Effects
                spawnParticle: (type, position, options) => {
                    return this.spawnParticle(type, position, options);
                },
                
                // Level
                getCurrentLevel: () => ProceduralLevelGen.exportLevel(),
                setLevelTheme: (theme) => {
                    ProceduralLevelGen.currentTheme = ProceduralLevelGen.themes[theme];
                },
                
                // Utils
                log: (message) => console.log('[Mod]', message),
                random: () => Math.random(),
                distance: (a, b) => Math.sqrt(
                    Math.pow(a.x - b.x, 2) + 
                    Math.pow(a.y - b.y, 2) + 
                    Math.pow(a.z - b.z, 2)
                ),
                
                // Storage
                saveData: (key, value) => {
                    localStorage.setItem(`mod_${key}`, JSON.stringify(value));
                },
                loadData: (key) => {
                    const data = localStorage.getItem(`mod_${key}`);
                    return data ? JSON.parse(data) : null;
                },
                
                // Multiplayer
                broadcast: (data) => {
                    if (window.MultiplayerNetwork) {
                        MultiplayerNetwork.broadcast({
                            type: 'mod-message',
                            data: data
                        });
                    }
                },
                
                // Constants
                CONSTANTS: {
                    CELL_SIZE: 4,
                    MAX_HEALTH: 100,
                    PACMAN_SPEED: 3,
                    PLAYER_SPEED: 5
                }
            };
        },
        
        loadBuiltInMods() {
            // Built-in mods
            const builtInMods = [
                {
                    id: 'hardcore_mode',
                    name: 'Hardcore Mode',
                    version: '1.0',
                    author: 'Official',
                    description: 'Permadeath, no saves, increased difficulty',
                    enabled: false,
                    script: `
                        api.on('onDamage', (data) => {
                            if (data.damage > 10) {
                                data.damage *= 2; // Double damage
                            }
                        });
                        
                        api.on('onDeath', () => {
                            api.showNotification('HARDCORE: Progress reset!', 'error');
                            // Reset all progress
                            localStorage.clear();
                        });
                    `
                },
                {
                    id: 'photo_mode',
                    name: 'Photo Mode',
                    version: '1.0',
                    author: 'Official',
                    description: 'Free camera, filters, screenshot tools',
                    enabled: false,
                    script: `
                        let photoMode = false;
                        
                        document.addEventListener('keydown', (e) => {
                            if (e.key === 'P' && e.ctrlKey) {
                                photoMode = !photoMode;
                                api.showNotification(photoMode ? 'Photo Mode ON' : 'Photo Mode OFF');
                            }
                        });
                        
                        api.on('preUpdate', () => {
                            if (photoMode) {
                                // Freeze game
                                return false;
                            }
                        });
                    `
                },
                {
                    id: 'speedrun_timer',
                    name: 'Speedrun Timer',
                    version: '1.0',
                    author: 'Official',
                    description: 'In-game timer with splits and PB tracking',
                    enabled: false,
                    script: `
                        let startTime = 0;
                        let splits = [];
                        
                        api.on('onLevelLoad', () => {
                            startTime = Date.now();
                            splits = [];
                        });
                        
                        // Create timer UI
                        const timer = api.createUI(
                            '<div id="speedrun-timer">00:00:00</div>',
                            '#speedrun-timer { position: fixed; top: 20px; right: 20px; font-size: 24px; font-family: monospace; color: #0f0; text-shadow: 0 0 10px #0f0; }'
                        );
                        
                        api.on('postUpdate', () => {
                            const elapsed = Date.now() - startTime;
                            const hours = Math.floor(elapsed / 3600000);
                            const minutes = Math.floor((elapsed % 3600000) / 60000);
                            const seconds = Math.floor((elapsed % 60000) / 1000);
                            document.getElementById('speedrun-timer').textContent = 
                                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                        });
                    `
                }
            ];
            
            builtInMods.forEach(mod => {
                this.mods.set(mod.id, mod);
            });
        },
        
        loadUserMods() {
            // Load from localStorage
            const saved = localStorage.getItem('backroomsPacman_mods');
            if (saved) {
                const userMods = JSON.parse(saved);
                userMods.forEach(mod => {
                    this.mods.set(mod.id, mod);
                });
            }
        },
        
        saveUserMods() {
            const userMods = Array.from(this.mods.values()).filter(m => !m.builtin);
            localStorage.setItem('backroomsPacman_mods', JSON.stringify(userMods));
        },
        
	enableMod(modId) {
		const mod = this.mods.get(modId);
		if (!mod) return false;

		mod.enabled = true;

		// SECURITY FIX: Block dynamic code execution in production
		if (process.env.NODE_ENV === 'production') {
			console.error('[Phase 5] Dynamic mod execution disabled in production for security');
			mod.enabled = false;
			return false;
		}

		// Execute mod script (dev only - consider removing entirely for production)
		try {
			const fn = new Function('api', mod.script);
			fn(this.api);
			console.log('[Phase 5] Enabled mod:', mod.name);
			return true;
		} catch (error) {
			console.error('[Phase 5] Failed to enable mod:', error);
			mod.enabled = false;
			return false;
		}
	},
        
        disableMod(modId) {
            const mod = this.mods.get(modId);
            if (mod) {
                mod.enabled = false;
                console.log('[Phase 5] Disabled mod:', mod.name);
            }
        },
        
        registerHook(event, callback) {
            if (this.hooks[event]) {
                this.hooks[event].push(callback);
            }
        },
        
        executeHooks(event, data) {
            if (this.hooks[event]) {
                this.hooks[event].forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error('[Phase 5] Hook error:', error);
                    }
                });
            }
        },
        
        // Mod installation
        installMod(modData) {
            // Validate mod
            if (!modData.id || !modData.name || !modData.script) {
                console.error('[Phase 5] Invalid mod data');
                return false;
            }
            
            // Security check (simplified)
            if (modData.script.includes('eval') || modData.script.includes('Function')) {
                console.warn('[Phase 5] Mod contains potentially unsafe code');
            }
            
            // Add to mods
            this.mods.set(modData.id, {
                ...modData,
                installedAt: Date.now(),
                enabled: false
            });
            
            // Save
            this.saveUserMods();
            
            console.log('[Phase 5] Installed mod:', modData.name);
            return true;
        },
        
        uninstallMod(modId) {
            this.mods.delete(modId);
            this.saveUserMods();
            console.log('[Phase 5] Uninstalled mod:', modId);
        },
        
        // Mod UI
        createModUI(html, css) {
            const container = document.createElement('div');
            container.className = 'mod-ui';
            container.innerHTML = html;
            
            if (css) {
                const style = document.createElement('style');
                style.textContent = css;
                container.appendChild(style);
            }
            
            document.body.appendChild(container);
            return container;
        },
        
        showNotification(message, type = 'info') {
            const colors = {
                info: '#00ff88',
                warning: '#ffaa00',
                error: '#ff0000'
            };
            
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.9);
                color: ${colors[type] || colors.info};
                padding: 15px 30px;
                border-radius: 5px;
                border: 2px solid ${colors[type] || colors.info};
                z-index: 10000;
                font-weight: bold;
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        },
        
        // Asset loading
        loadTexture(url) {
            return new Promise((resolve, reject) => {
                const loader = new THREE.TextureLoader();
                loader.load(url, resolve, undefined, reject);
            });
        },
        
        loadModel(url) {
            // Would use GLTFLoader or similar
            console.log('[Phase 5] Loading model:', url);
            return Promise.resolve(null);
        },
        
        loadSound(url) {
            return new Promise((resolve, reject) => {
                const audio = new Audio(url);
                audio.addEventListener('canplaythrough', () => resolve(audio));
                audio.addEventListener('error', reject);
            });
        },
        
        // Entity spawning
        spawnEntity(type, position, options = {}) {
            console.log('[Phase 5] Spawning entity:', type, 'at', position);
            // Would integrate with entity system
            return { id: Date.now(), type, position, ...options };
        },
        
        spawnItem(type, position) {
            console.log('[Phase 5] Spawning item:', type, 'at', position);
            return { id: Date.now(), type, position };
        },
        
        spawnParticle(type, position, options) {
            console.log('[Phase 5] Spawning particle:', type, 'at', position);
        },
        
        playSound(soundId, options) {
            console.log('[Phase 5] Playing sound:', soundId);
        },
        
        playMusic(musicId) {
            console.log('[Phase 5] Playing music:', musicId);
        },
        
        // Get mod list
        getMods() {
            return Array.from(this.mods.values());
        },
        
        // Export mod
        exportMod(modId) {
            const mod = this.mods.get(modId);
            if (!mod) return null;
            
            return JSON.stringify(mod, null, 2);
        }
    };

    // ============================================
    // PHASE 5.3: AI CONTENT GENERATION
    // ============================================
    
    const AIContentGen = {
        // Ollama integration
        ollamaUrl: 'http://localhost:11434',
        
        // Generation queues
        generationQueue: [],
        isGenerating: false,
        
        // Cache
        cache: new Map(),
        
        init() {
            console.log('[Phase 5] Initializing AI content generation...');
            
            // Check Ollama availability
            this.checkOllama();
            
            console.log('[Phase 5] AI content generation initialized');
        },
        
        async checkOllama() {
            try {
                const response = await fetch(`${this.ollamaUrl}/api/tags`);
                if (response.ok) {
                    console.log('[Phase 5] Ollama is available');
                    return true;
                }
            } catch (error) {
                console.warn('[Phase 5] Ollama not available, using fallback generation');
            }
            return false;
        },
        
        // Generate level description
        async generateLevelDescription(theme, difficulty) {
            const prompt = `Generate a creepy description for a Backrooms level with theme "${theme}" and difficulty ${difficulty}/10. 
                Include: atmosphere, dangers, entities, and a short story hook. Keep it under 200 words.`;
            
            return this.generateWithAI(prompt, 'level-desc');
        },
        
        // Generate entity description
        async generateEntityDescription(entityType) {
            const prompt = `Describe a terrifying entity called "${entityType}" that hunts players in the Backrooms. 
                Include: appearance, behavior, abilities, and weakness. Keep it under 150 words.`;
            
            return this.generateWithAI(prompt, 'entity-desc');
        },
        
        // Generate item description
        async generateItemDescription(itemType) {
            const prompt = `Describe a mysterious item called "${itemType}" found in the Backrooms. 
                Include: appearance, function, and potential danger. Keep it under 100 words.`;
            
            return this.generateWithAI(prompt, 'item-desc');
        },
        
        // Generate wall messages
        async generateWallMessages(count = 5) {
            const prompt = `Generate ${count} creepy, cryptic messages that might be scratched or written on walls in the Backrooms. 
                Each should be 1-2 sentences. Make them unsettling and mysterious.`;
            
            return this.generateWithAI(prompt, 'wall-messages');
        },
        
        // Generate document content
        async generateDocumentContent() {
            const prompt = `Write a short, disturbing document found in the Backrooms. 
                It could be a journal entry, warning, or research note. Make it feel authentic and creepy. 100-200 words.`;
            
            return this.generateWithAI(prompt, 'document');
        },
        
        // Generate with AI (Ollama or fallback)
        async generateWithAI(prompt, cacheKey) {
            // Check cache
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            
            // Try Ollama first
            try {
                const result = await this.generateWithOllama(prompt);
                this.cache.set(cacheKey, result);
                return result;
            } catch (error) {
                console.warn('[Phase 5] Ollama generation failed, using fallback');
            }
            
            // Fallback to template-based generation
            const result = this.generateFallback(prompt, cacheKey);
            this.cache.set(cacheKey, result);
            return result;
        },
        
        async generateWithOllama(prompt) {
            const response = await fetch(`${this.ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama2',
                    prompt: prompt,
                    stream: false
                })
            });
            
            if (!response.ok) {
                throw new Error('Ollama request failed');
            }
            
            const data = await response.json();
            return data.response;
        },
        
        generateFallback(prompt, type) {
            // Template-based fallback generation
            const templates = {
                'level-desc': [
                    "The air is thick with humidity and the smell of decay. Flickering fluorescent lights cast long shadows across the yellowed walls. You hear distant footsteps that aren't your own.",
                    "An endless maze of damp carpet and buzzing lights. The walls seem to breathe, expanding and contracting in your peripheral vision. Something watches from the shadows.",
                    "The silence is deafening. Only the hum of lights breaks the void. You've been walking for hours, but the corridors never change."
                ],
                'entity-desc': [
                    "A tall, thin figure with elongated limbs. It moves silently, only visible when you look away. It feeds on fear and isolation.",
                    "A shapeless mass that flows through walls. It leaves a trail of black mold wherever it goes. Don't let it touch you.",
                    "Something that wears the face of your loved ones. It whispers your secrets. It knows what you've done."
                ],
                'wall-messages': [
                    "DON'T TRUST THE LIGHTS",
                    "IT'S BEHIND YOU RIGHT NOW",
                    "LEVEL 9223372036854775807",
                    "NO CLIPPING OUT",
                    "THEY CAN HEAR YOUR THOUGHTS"
                ],
                'document': [
                    "Day 47: I found a door that wasn't there before. It leads to a room full of mannequins. They all face the corner. I think they're listening.",
                    "Warning: Do not follow the smell of almonds. Do not enter rooms with black doors. Do not trust anyone wearing a yellow jacket.",
                    "Research Log: Subject disappeared at 03:47. Last known location: Corridor 7B. Camera footage shows them walking into a wall. They never came out."
                ]
            };
            
            const options = templates[type] || templates['level-desc'];
            return options[Math.floor(Math.random() * options.length)];
        },
        
        // Generate procedural texture
        generateProceduralTexture(type, width = 512, height = 512) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            switch (type) {
                case 'wallpaper':
                    this.generateWallpaperTexture(ctx, width, height);
                    break;
                case 'carpet':
                    this.generateCarpetTexture(ctx, width, height);
                    break;
                case 'concrete':
                    this.generateConcreteTexture(ctx, width, height);
                    break;
                case 'rust':
                    this.generateRustTexture(ctx, width, height);
                    break;
                default:
                    this.generateNoiseTexture(ctx, width, height);
            }
            
            return canvas;
        },
        
        generateWallpaperTexture(ctx, width, height) {
            // Base yellow
            ctx.fillStyle = '#b5a44c';
            ctx.fillRect(0, 0, width, height);
            
            // Pattern
            ctx.fillStyle = '#c4b35a';
            for (let y = 0; y < height; y += 64) {
                ctx.fillRect(0, y, width, 32);
            }
            
            // Water damage
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const r = 50 + Math.random() * 100;
                const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
                grad.addColorStop(0, 'rgba(80, 60, 20, 0.4)');
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            }
        },
        
        generateCarpetTexture(ctx, width, height) {
            // Base brown
            ctx.fillStyle = '#8b7355';
            ctx.fillRect(0, 0, width, height);
            
            // Noise
            const imageData = ctx.getImageData(0, 0, width, height);
            for (let i = 0; i < imageData.data.length; i += 4) {
                const noise = (Math.random() - 0.5) * 30;
                imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
                imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
                imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
            }
            ctx.putImageData(imageData, 0, 0);
        },
        
        generateConcreteTexture(ctx, width, height) {
            ctx.fillStyle = '#666666';
            ctx.fillRect(0, 0, width, height);
            
            // Cracks
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 2;
            for (let i = 0; i < 10; i++) {
                ctx.beginPath();
                ctx.moveTo(Math.random() * width, Math.random() * height);
                for (let j = 0; j < 5; j++) {
                    ctx.lineTo(
                        Math.random() * width,
                        Math.random() * height
                    );
                }
                ctx.stroke();
            }
        },
        
        generateRustTexture(ctx, width, height) {
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(0, 0, width, height);
            
            // Rust patches
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const r = 20 + Math.random() * 50;
                const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
                grad.addColorStop(0, 'rgba(139, 69, 19, 0.8)');
                grad.addColorStop(0.5, 'rgba(160, 82, 45, 0.5)');
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            }
        },
        
        generateNoiseTexture(ctx, width, height) {
            const imageData = ctx.createImageData(width, height);
            for (let i = 0; i < imageData.data.length; i += 4) {
                const value = Math.random() * 255;
                imageData.data[i] = value;
                imageData.data[i + 1] = value;
                imageData.data[i + 2] = value;
                imageData.data[i + 3] = 255;
            }
            ctx.putImageData(imageData, 0, 0);
        },
        
        // Generate sound
        generateProceduralSound(type, duration = 1.0) {
            const sampleRate = 44100;
            const length = sampleRate * duration;
            const buffer = new AudioBuffer({
                length: length,
                numberOfChannels: 1,
                sampleRate: sampleRate
            });
            
            const data = buffer.getChannelData(0);
            
            switch (type) {
                case 'ambient':
                    this.generateAmbientSound(data, length);
                    break;
                case 'footstep':
                    this.generateFootstepSound(data, length);
                    break;
                case 'scare':
                    this.generateScareSound(data, length);
                    break;
                default:
                    // White noise
                    for (let i = 0; i < length; i++) {
                        data[i] = (Math.random() * 2 - 1) * 0.1;
                    }
            }
            
            return buffer;
        },
        
        generateAmbientSound(data, length) {
            // Low frequency drone
            for (let i = 0; i < length; i++) {
                const t = i / length;
                const freq = 50 + Math.sin(t * Math.PI * 2) * 10;
                data[i] = Math.sin(i * freq * Math.PI * 2 / 44100) * 0.1;
                data[i] += (Math.random() * 2 - 1) * 0.05;
            }
        },
        
        generateFootstepSound(data, length) {
            // Short impact
            for (let i = 0; i < length; i++) {
                const t = i / length;
                const envelope = Math.exp(-t * 10);
                data[i] = (Math.random() * 2 - 1) * envelope * 0.5;
            }
        },
        
        generateScareSound(data, length) {
            // Rising pitch with noise
            for (let i = 0; i < length; i++) {
                const t = i / length;
                const freq = 100 + t * 900;
                data[i] = Math.sin(i * freq * Math.PI * 2 / 44100) * (1 - t);
                data[i] += (Math.random() * 2 - 1) * 0.3;
            }
        },
        
        // Clear cache
        clearCache() {
            this.cache.clear();
        }
    };

    // ============================================
    // PHASE 5.4: COMMUNITY CONTENT
    // ============================================
    
    const CommunityContent = {
        // Content database
        content: {
            levels: new Map(),
            mods: new Map(),
            textures: new Map(),
            sounds: new Map(),
            entities: new Map()
        },
        
        // User content
        userContent: new Map(),
        
        // Ratings
        ratings: new Map(),
        
        // Downloads
        downloads: new Map(),
        
        init() {
            console.log('[Phase 5] Initializing community content...');
            
            // Load featured content
            this.loadFeaturedContent();
            
            // Load user content
            this.loadUserContent();
            
            console.log('[Phase 5] Community content initialized');
        },
        
        loadFeaturedContent() {
            // Featured community levels
            const featuredLevels = [
                {
                    id: 'level_liminal_office',
                    type: 'level',
                    name: 'The Liminal Office',
                    author: 'BackroomsExplorer',
                    description: 'An endless office space with no exits. The copiers never stop running.',
                    downloads: 15420,
                    rating: 4.8,
                    tags: ['office', 'liminal', 'popular'],
                    thumbnail: 'office_thumb.jpg'
                },
                {
                    id: 'level_poolrooms_night',
                    type: 'level',
                    name: 'Poolrooms - Nightmare',
                    author: 'WetWalker',
                    description: 'The poolrooms at night. Something swims in the deep end.',
                    downloads: 8932,
                    rating: 4.6,
                    tags: ['poolrooms', 'water', 'dark'],
                    thumbnail: 'pool_night_thumb.jpg'
                },
                {
                    id: 'level_food_court',
                    type: 'level',
                    name: 'Infinite Food Court',
                    author: 'HungryWanderer',
                    description: 'All the food is plastic. The soda machines dispense something else.',
                    downloads: 6754,
                    rating: 4.5,
                    tags: ['food', 'weird', 'liminal'],
                    thumbnail: 'food_court_thumb.jpg'
                }
            ];
            
            featuredLevels.forEach(level => {
                this.content.levels.set(level.id, level);
            });
            
            // Featured mods
            const featuredMods = [
                {
                    id: 'mod_third_person',
                    type: 'mod',
                    name: 'Third Person Camera',
                    author: 'CameraModder',
                    description: 'Play from a third-person perspective with adjustable camera.',
                    downloads: 23100,
                    rating: 4.9,
                    tags: ['camera', 'visual', 'popular']
                },
                {
                    id: 'mod_minimap',
                    type: 'mod',
                    name: 'Minimap & Compass',
                    author: 'Navigator',
                    description: 'Adds a minimap and compass to help navigate the backrooms.',
                    downloads: 18900,
                    rating: 4.7,
                    tags: ['ui', 'navigation', 'helpful']
                }
            ];
            
            featuredMods.forEach(mod => {
                this.content.mods.set(mod.id, mod);
            });
        },
        
        loadUserContent() {
            const saved = localStorage.getItem('backroomsPacman_userContent');
            if (saved) {
                const data = JSON.parse(saved);
                data.forEach(item => {
                    this.userContent.set(item.id, item);
                });
            }
        },
        
        saveUserContent() {
            const data = Array.from(this.userContent.values());
            localStorage.setItem('backroomsPacman_userContent', JSON.stringify(data));
        },
        
        // Publish content
        publishContent(contentData) {
            const content = {
                ...contentData,
                id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                publishedAt: Date.now(),
                downloads: 0,
                rating: 0,
                ratings: []
            };
            
            this.userContent.set(content.id, content);
            this.saveUserContent();
            
            console.log('[Phase 5] Published content:', content.name);
            return content.id;
        },
        
        // Download content
        downloadContent(contentId) {
            // Find in featured or user content
            let content = this.content.levels.get(contentId) ||
                         this.content.mods.get(contentId) ||
                         this.userContent.get(contentId);
            
            if (!content) return null;
            
            // Increment download count
            content.downloads++;
            
            // Track download
            this.downloads.set(contentId, Date.now());
            
            console.log('[Phase 5] Downloaded content:', content.name);
            return content;
        },
        
        // Rate content
        rateContent(contentId, rating) {
            if (rating < 1 || rating > 5) return false;
            
            let content = this.content.levels.get(contentId) ||
                         this.content.mods.get(contentId) ||
                         this.userContent.get(contentId);
            
            if (!content) return false;
            
            // Add rating
            if (!content.ratings) content.ratings = [];
            content.ratings.push({
                rating: rating,
                timestamp: Date.now()
            });
            
            // Calculate average
            const sum = content.ratings.reduce((a, b) => a + b.rating, 0);
            content.rating = sum / content.ratings.length;
            
            this.saveUserContent();
            
            return true;
        },
        
        // Search content
        searchContent(query, filters = {}) {
            const results = [];
            
            // Search levels
            this.content.levels.forEach(level => {
                if (this.matchesSearch(level, query, filters)) {
                    results.push(level);
                }
            });
            
            // Search mods
            this.content.mods.forEach(mod => {
                if (this.matchesSearch(mod, query, filters)) {
                    results.push(mod);
                }
            });
            
            // Search user content
            this.userContent.forEach(content => {
                if (this.matchesSearch(content, query, filters)) {
                    results.push(content);
                }
            });
            
            // Sort by rating
            results.sort((a, b) => b.rating - a.rating);
            
            return results;
        },
        
        matchesSearch(content, query, filters) {
            // Text search
            if (query) {
                const searchText = (content.name + ' ' + content.description).toLowerCase();
                if (!searchText.includes(query.toLowerCase())) {
                    return false;
                }
            }
            
            // Tag filter
            if (filters.tags && filters.tags.length > 0) {
                if (!content.tags || !filters.tags.some(tag => content.tags.includes(tag))) {
                    return false;
                }
            }
            
            // Rating filter
            if (filters.minRating && content.rating < filters.minRating) {
                return false;
            }
            
            return true;
        },
        
        // Get popular content
        getPopularContent(type = 'all', limit = 10) {
            let allContent = [];
            
            if (type === 'all' || type === 'level') {
                allContent = allContent.concat(Array.from(this.content.levels.values()));
            }
            if (type === 'all' || type === 'mod') {
                allContent = allContent.concat(Array.from(this.content.mods.values()));
            }
            
            // Sort by downloads
            allContent.sort((a, b) => b.downloads - a.downloads);
            
            return allContent.slice(0, limit);
        },
        
        // Get new content
        getNewContent(type = 'all', limit = 10) {
            let allContent = [];
            
            if (type === 'all' || type === 'level') {
                allContent = allContent.concat(Array.from(this.content.levels.values()));
            }
            if (type === 'all' || type === 'mod') {
                allContent = allContent.concat(Array.from(this.content.mods.values()));
            }
            
            allContent = allContent.concat(Array.from(this.userContent.values()));
            
            // Sort by date
            allContent.sort((a, b) => b.publishedAt - a.publishedAt);
            
            return allContent.slice(0, limit);
        },
        
        // Get content by ID
        getContent(contentId) {
            return this.content.levels.get(contentId) ||
                   this.content.mods.get(contentId) ||
                   this.userContent.get(contentId);
        },
        
        // Delete user content
        deleteUserContent(contentId) {
            if (this.userContent.has(contentId)) {
                this.userContent.delete(contentId);
                this.saveUserContent();
                return true;
            }
            return false;
        }
    };

    // ============================================
    // PHASE 5.5: DYNAMIC NARRATIVE SYSTEM
    // ============================================
    
    const DynamicNarrative = {
        // Story state
        storyState: {
            currentChapter: 0,
            playerChoices: [],
            discoveredLore: [],
            activeQuests: [],
            completedQuests: [],
            worldState: {}
        },
        
        // Story chapters
        chapters: [
            {
                id: 'awakening',
                title: 'The Awakening',
                description: 'You wake up in the Backrooms with no memory of how you got here.',
                objectives: ['Find a way out', 'Collect 10 pellets', 'Survive 5 minutes'],
                events: ['first_encounter', 'find_document']
            },
            {
                id: 'descent',
                title: 'The Descent',
                description: 'The deeper you go, the more the Backrooms change.',
                objectives: ['Reach level 2', 'Find the exit', 'Avoid the entity'],
                events: ['deeper_level', 'entity_chase']
            },
            {
                id: 'revelation',
                title: 'The Revelation',
                description: 'You begin to understand the nature of this place.',
                objectives: ['Decode the message', 'Find the truth', 'Make a choice'],
                events: ['secret_discovered', 'final_choice']
            }
        ],
        
        // Lore entries
        lore: {
            'backrooms_origin': {
                title: 'The Origin',
                content: 'The Backrooms exist in the spaces between reality, where the laws of physics begin to break down...',
                discovered: false
            },
            'entities': {
                title: 'The Entities',
                content: 'They are not alive in any sense we understand. They are manifestations of the Backrooms themselves...',
                discovered: false
            },
            'noclip': {
                title: 'No-Clipping',
                content: 'Those who no-clip through reality find themselves here. Few ever return...',
                discovered: false
            }
        },
        
        // Quests
        quests: {
            'find_exit': {
                title: 'Find the Exit',
                description: 'Search for a way out of the Backrooms',
                objectives: ['Explore 5 rooms', 'Find the exit door', 'Escape'],
                rewards: ['achievement_escape_attempt']
            },
            'collect_documents': {
                title: 'Archivist',
                description: 'Collect documents to learn more about this place',
                objectives: ['Find 10 documents', 'Read them all'],
                rewards: ['lore_backrooms_origin', 'achievement_archivist']
            },
            'survive_horde': {
                title: 'Survivor',
                description: 'Survive a horde of Pac-Men',
                objectives: ['Survive 5 minutes', 'Kill 20 Pac-Men'],
                rewards: ['achievement_survivor']
            }
        },
        
        init() {
            console.log('[Phase 5] Initializing dynamic narrative...');
            
            // Load saved story state
            this.loadStoryState();
            
            console.log('[Phase 5] Dynamic narrative initialized');
        },
        
        loadStoryState() {
            const saved = localStorage.getItem('backroomsPacman_story');
            if (saved) {
                this.storyState = JSON.parse(saved);
            }
        },
        
        saveStoryState() {
            localStorage.setItem('backroomsPacman_story', JSON.stringify(this.storyState));
        },
        
        // Advance story
        advanceChapter() {
            if (this.storyState.currentChapter < this.chapters.length - 1) {
                this.storyState.currentChapter++;
                const chapter = this.chapters[this.storyState.currentChapter];
                
                console.log('[Phase 5] Advanced to chapter:', chapter.title);
                
                // Trigger chapter events
                chapter.events.forEach(eventId => {
                    this.triggerEvent(eventId);
                });
                
                this.saveStoryState();
                
                return chapter;
            }
            return null;
        },
        
        // Make choice
        makeChoice(choiceId, choice) {
            this.storyState.playerChoices.push({
                id: choiceId,
                choice: choice,
                timestamp: Date.now()
            });
            
            // Update world state based on choice
            this.storyState.worldState[choiceId] = choice;
            
            this.saveStoryState();
            
            console.log('[Phase 5] Player made choice:', choiceId, '=', choice);
        },
        
        // Discover lore
        discoverLore(loreId) {
            if (this.lore[loreId] && !this.lore[loreId].discovered) {
                this.lore[loreId].discovered = true;
                this.storyState.discoveredLore.push(loreId);
                
                console.log('[Phase 5] Discovered lore:', loreId);
                
                this.saveStoryState();
                
                return this.lore[loreId];
            }
            return null;
        },
        
        // Start quest
        startQuest(questId) {
            if (this.quests[questId] && 
                !this.storyState.activeQuests.includes(questId) &&
                !this.storyState.completedQuests.includes(questId)) {
                
                this.storyState.activeQuests.push(questId);
                
                console.log('[Phase 5] Started quest:', questId);
                
                this.saveStoryState();
                
                return this.quests[questId];
            }
            return null;
        },
        
        // Complete quest objective
        completeQuestObjective(questId, objectiveIndex) {
            const quest = this.storyState.activeQuests.find(q => q === questId);
            if (!quest) return false;
            
            // Mark objective complete
            // In a real implementation, track which objectives are done
            
            // Check if all objectives complete
            const allComplete = true; // Simplified
            
            if (allComplete) {
                this.completeQuest(questId);
            }
            
            this.saveStoryState();
            return true;
        },
        
        // Complete quest
        completeQuest(questId) {
            // Remove from active
            this.storyState.activeQuests = this.storyState.activeQuests.filter(q => q !== questId);
            
            // Add to completed
            this.storyState.completedQuests.push(questId);
            
            // Give rewards
            const quest = this.quests[questId];
            if (quest) {
                quest.rewards.forEach(reward => {
                    if (reward.startsWith('lore_')) {
                        this.discoverLore(reward.replace('lore_', ''));
                    } else if (reward.startsWith('achievement_')) {
                        // Unlock achievement
                        if (window.SocialFeatures) {
                            SocialFeatures.unlockAchievement(reward);
                        }
                    }
                });
            }
            
            console.log('[Phase 5] Completed quest:', questId);
            
            this.saveStoryState();
        },
        
        // Trigger story event
        triggerEvent(eventId) {
            console.log('[Phase 5] Triggering event:', eventId);
            
            switch (eventId) {
                case 'first_encounter':
                    // Spawn first Pac-Man
                    break;
                case 'find_document':
                    // Spawn document
                    break;
                case 'deeper_level':
                    // Change level theme
                    break;
                case 'entity_chase':
                    // Start chase sequence
                    break;
                case 'secret_discovered':
                    // Reveal secret
                    this.discoverLore('backrooms_origin');
                    break;
                case 'final_choice':
                    // Present final choice to player
                    break;
            }
        },
        
        // Get current chapter
        getCurrentChapter() {
            return this.chapters[this.storyState.currentChapter];
        },
        
        // Get active quests
        getActiveQuests() {
            return this.storyState.activeQuests.map(id => this.quests[id]).filter(q => q);
        },
        
        // Get discovered lore
        getDiscoveredLore() {
            return this.storyState.discoveredLore.map(id => this.lore[id]).filter(l => l);
        },
        
        // Get narrative context for current situation
        getNarrativeContext(playerState) {
            const context = {
                chapter: this.getCurrentChapter(),
                dangerLevel: playerState.stress || 0,
                location: playerState.position,
                timeInBackrooms: playerState.time || 0,
                discoveries: this.storyState.discoveredLore.length,
                choices: this.storyState.playerChoices
            };
            
            // Generate narrative text based on context
            return this.generateNarrativeText(context);
        },
        
        generateNarrativeText(context) {
            // Template-based narrative generation
            const templates = [
                `You are in ${context.chapter.title}. The air feels ${context.dangerLevel > 0.7 ? 'thick with dread' : 'unsettling'}.`,
                `The ${context.location} stretches endlessly before you. You've been here for ${Math.floor(context.timeInBackrooms / 60)} minutes.`,
                `Something ${context.dangerLevel > 0.5 ? 'watches' : 'waits'} in the shadows.`,
            ];
            
            return templates[Math.floor(Math.random() * templates.length)];
        },
        
        // Reset story
        resetStory() {
            this.storyState = {
                currentChapter: 0,
                playerChoices: [],
                discoveredLore: [],
                activeQuests: [],
                completedQuests: [],
                worldState: {}
            };
            
            // Reset lore
            Object.values(this.lore).forEach(entry => {
                entry.discovered = false;
            });
            
            this.saveStoryState();
            
            console.log('[Phase 5] Story reset');
        }
    };

    // ============================================
    // PHASE 5: MAIN INITIALIZER
    // ============================================
    
    const Phase5InfiniteContent = {
        init(seed) {
            console.log('[Phase 5] Initializing Infinite Content & Modding...');
            
            // Initialize procedural generation
            ProceduralLevelGen.init(seed);
            
            // Initialize modding system
            ModdingSystem.init();
            
            // Initialize AI content generation
            AIContentGen.init();
            
            // Initialize community content
            CommunityContent.init();
            
            // Initialize dynamic narrative
            DynamicNarrative.init();
            
            console.log('[Phase 5] Infinite content initialization complete');
        },
        
        // Level generation
        generateLevel(theme) {
            return ProceduralLevelGen.generateLevel(theme);
        },
        
        // Mod management
        enableMod(modId) {
            return ModdingSystem.enableMod(modId);
        },
        
        disableMod(modId) {
            ModdingSystem.disableMod(modId);
        },
        
        installMod(modData) {
            return ModdingSystem.installMod(modData);
        },
        
        getMods() {
            return ModdingSystem.getMods();
        },
        
        // AI content
        async generateLevelDescription(theme, difficulty) {
            return AIContentGen.generateLevelDescription(theme, difficulty);
        },
        
        async generateEntityDescription(entityType) {
            return AIContentGen.generateEntityDescription(entityType);
        },
        
        generateProceduralTexture(type) {
            return AIContentGen.generateProceduralTexture(type);
        },
        
        // Community content
        publishContent(contentData) {
            return CommunityContent.publishContent(contentData);
        },
        
        downloadContent(contentId) {
            return CommunityContent.downloadContent(contentId);
        },
        
        searchContent(query, filters) {
            return CommunityContent.searchContent(query, filters);
        },
        
        getPopularContent(type, limit) {
            return CommunityContent.getPopularContent(type, limit);
        },
        
        // Narrative
        advanceChapter() {
            return DynamicNarrative.advanceChapter();
        },
        
        makeChoice(choiceId, choice) {
            DynamicNarrative.makeChoice(choiceId, choice);
        },
        
        startQuest(questId) {
            return DynamicNarrative.startQuest(questId);
        },
        
        discoverLore(loreId) {
            return DynamicNarrative.discoverLore(loreId);
        },
        
        getNarrativeContext(playerState) {
            return DynamicNarrative.getNarrativeContext(playerState);
        },
        
        // Execute mod hooks
        executeHook(event, data) {
            ModdingSystem.executeHooks(event, data);
        }
    };

    // Export to global scope
    window.Phase5InfiniteContent = Phase5InfiniteContent;
    window.ProceduralLevelGen = ProceduralLevelGen;
    window.ModdingSystem = ModdingSystem;
    window.AIContentGen = AIContentGen;
    window.CommunityContent = CommunityContent;
    window.DynamicNarrative = DynamicNarrative;

})();
