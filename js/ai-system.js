/* ============================================
   ScaryGamesAI — AI/ML System
   Procedural generation, adaptive AI, dynamic
   difficulty, personalized horror, game master,
   and sentiment analysis
   ============================================ */

const SGAIAI = (function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // TIER FEATURES - AI capabilities by subscription
    // ═══════════════════════════════════════════════════════════════

    const TIER_AI_FEATURES = {
        none: {
            label: 'Free',
            proceduralGeneration: 'basic',
            adaptiveAI: false,
            dynamicDifficulty: 'basic',
            personalizedHorror: false,
            aiGameMaster: false,
            learningOpponents: false,
            sentimentAnalysis: false,
            behaviorProfiling: 'basic',
            contentSeeds: 'daily',
        },
        lite: { // Survivor - $2
            label: 'Survivor',
            proceduralGeneration: 'standard',
            adaptiveAI: true,
            dynamicDifficulty: 'standard',
            personalizedHorror: false,
            aiGameMaster: false,
            learningOpponents: true,
            sentimentAnalysis: false,
            behaviorProfiling: 'standard',
            contentSeeds: 'daily',
        },
        pro: { // Hunter - $5
            label: 'Hunter',
            proceduralGeneration: 'advanced',
            adaptiveAI: true,
            dynamicDifficulty: 'advanced',
            personalizedHorror: true,
            aiGameMaster: true,
            learningOpponents: true,
            sentimentAnalysis: true,
            behaviorProfiling: 'advanced',
            contentSeeds: 'unlimited',
        },
        max: { // Elder God - $8
            label: 'Elder God',
            proceduralGeneration: 'extreme',
            adaptiveAI: true,
            dynamicDifficulty: 'extreme',
            personalizedHorror: true,
            aiGameMaster: true,
            learningOpponents: true,
            sentimentAnalysis: true,
            behaviorProfiling: 'complete',
            contentSeeds: 'unlimited',
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════

    let currentTier = 'none';
    let features = TIER_AI_FEATURES.none;
    let initialized = false;

    // Player profile
    let playerProfile = {
        id: null,
        createdAt: null,
        sessions: 0,
        totalPlaytime: 0,
        gamesPlayed: {},
        fears: {
            darkness: 0.5,
            jumpscares: 0.5,
            chase: 0.5,
            psychological: 0.5,
            gore: 0.5,
            isolation: 0.5,
            uncanny: 0.5,
            sound: 0.5,
        },
        skills: {
            reactionTime: 0.5,
            spatialAwareness: 0.5,
            puzzleSolving: 0.5,
            stealth: 0.5,
            combat: 0.5,
            resourceManagement: 0.5,
        },
        preferences: {
            difficulty: 0.5,
            pace: 0.5, // slow vs fast
            exploration: 0.5, // linear vs open
            story: 0.5, // minimal vs rich
        },
        behaviorPatterns: [],
        recentEvents: [],
    };

    // AI Game Master state
    let gameMasterState = {
        active: false,
        currentMood: 'neutral',
        tension: 0,
        pacing: 'normal',
        lastAdjustment: 0,
        narrative: [],
    };

    // Learning AI opponents
    let opponentMemory = new Map();

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    function init() {
        if (initialized) return;

        // Check user tier
        currentTier = localStorage.getItem('sgai-sub-tier') || 'none';
        features = TIER_AI_FEATURES[currentTier] || TIER_AI_FEATURES.none;

        // Load or create player profile
        loadPlayerProfile();

        initialized = true;
        console.log('[SGAIAI] Initialized — Tier:', features.label);
    }

    function loadPlayerProfile() {
        const saved = localStorage.getItem('sgai-player-profile');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                Object.assign(playerProfile, parsed);
            } catch (e) {
                createNewProfile();
            }
        } else {
            createNewProfile();
        }
    }

    function createNewProfile() {
        playerProfile.id = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        playerProfile.createdAt = Date.now();
        savePlayerProfile();
    }

    function savePlayerProfile() {
        localStorage.setItem('sgai-player-profile', JSON.stringify(playerProfile));
    }

    // ═══════════════════════════════════════════════════════════════
    // PROCEDURAL CONTENT GENERATION
    // ═══════════════════════════════════════════════════════════════

    const PCG = {
        // Seeded random number generator
        seededRandom: function (seed) {
            let s = seed;
            return function () {
                s = Math.sin(s * 9999) * 10000;
                return s - Math.floor(s);
            };
        },

        // Generate deterministic seed from date (daily challenges)
        getDailySeed: function (gameId) {
            const d = new Date();
            const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            let hash = 0;
            const str = gameId + dateStr;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash);
        },

        // Generate custom seed
        getCustomSeed: function (input) {
            let hash = 0;
            for (let i = 0; i < input.length; i++) {
                hash = ((hash << 5) - hash) + input.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash);
        },

        // Maze generation (Recursive Backtracking)
        generateMaze: function (width, height, seed, options = {}) {
            const rng = this.seededRandom(seed || Date.now());
            const complexity = options.complexity || 0.5;
            const loops = options.loops || false;

            // Initialize grid with walls
            const maze = [];
            for (let y = 0; y < height; y++) {
                maze[y] = [];
                for (let x = 0; x < width; x++) {
                    maze[y][x] = 1; // 1 = wall
                }
            }

            // Carve passages
            const stack = [];
            const startX = 1;
            const startY = 1;
            maze[startY][startX] = 0;
            stack.push({ x: startX, y: startY });

            const directions = [
                { dx: 0, dy: -2 }, // up
                { dx: 2, dy: 0 },  // right
                { dx: 0, dy: 2 },  // down
                { dx: -2, dy: 0 }, // left
            ];

            while (stack.length > 0) {
                const current = stack[stack.length - 1];

                // Get unvisited neighbors
                const neighbors = [];
                for (const dir of directions) {
                    const nx = current.x + dir.dx;
                    const ny = current.y + dir.dy;
                    if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1) {
                        if (maze[ny][nx] === 1) {
                            neighbors.push({ x: nx, y: ny, dx: dir.dx / 2, dy: dir.dy / 2 });
                        }
                    }
                }

                if (neighbors.length > 0) {
                    // Choose random neighbor
                    const next = neighbors[Math.floor(rng() * neighbors.length)];

                    // Remove wall between
                    maze[current.y + next.dy][current.x + next.dx] = 0;
                    maze[next.y][next.x] = 0;

                    stack.push({ x: next.x, y: next.y });
                } else {
                    stack.pop();
                }
            }

            // Add loops for more complex mazes
            if (loops || complexity > 0.7) {
                const loopCount = Math.floor((width * height * complexity * 0.1));
                for (let i = 0; i < loopCount; i++) {
                    const x = Math.floor(rng() * (width - 2)) + 1;
                    const y = Math.floor(rng() * (height - 2)) + 1;
                    if (maze[y][x] === 1) {
                        // Check if removing this wall creates a valid loop
                        let adjacentPaths = 0;
                        if (y > 0 && maze[y - 1][x] === 0) adjacentPaths++;
                        if (y < height - 1 && maze[y + 1][x] === 0) adjacentPaths++;
                        if (x > 0 && maze[y][x - 1] === 0) adjacentPaths++;
                        if (x < width - 1 && maze[y][x + 1] === 0) adjacentPaths++;

                        if (adjacentPaths >= 2) {
                            maze[y][x] = 0;
                        }
                    }
                }
            }

            // Add features based on tier
            if (features.proceduralGeneration !== 'basic') {
                this.addMazeFeatures(maze, rng, options);
            }

            return maze;
        },

        // Add special features to maze
        addMazeFeatures: function (maze, rng, options) {
            const height = maze.length;
            const width = maze[0].length;
            const featureDensity = options.featureDensity || 0.1;

            // 2 = item/pellet location
            // 3 = special item
            // 4 = spawn point
            // 5 = trap
            // 6 = secret area

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    if (maze[y][x] === 0 && rng() < featureDensity) {
                        const roll = rng();
                        if (roll < 0.6) {
                            maze[y][x] = 2; // Item
                        } else if (roll < 0.75 && features.proceduralGeneration === 'advanced') {
                            maze[y][x] = 3; // Special item
                        } else if (roll < 0.85 && features.proceduralGeneration !== 'standard') {
                            maze[y][x] = 5; // Trap
                        } else if (roll < 0.95 && features.proceduralGeneration === 'extreme') {
                            maze[y][x] = 6; // Secret
                        }
                    }
                }
            }
        },

        // Dungeon generation (room-based)
        generateDungeon: function (width, height, seed, options = {}) {
            const rng = this.seededRandom(seed || Date.now());
            const roomCount = options.roomCount || Math.floor(5 + rng() * 10);
            const minRoomSize = options.minRoomSize || 3;
            const maxRoomSize = options.maxRoomSize || 8;

            // Initialize grid
            const dungeon = [];
            for (let y = 0; y < height; y++) {
                dungeon[y] = [];
                for (let x = 0; x < width; x++) {
                    dungeon[y][x] = { type: 'wall', visited: false };
                }
            }

            const rooms = [];

            // Generate rooms
            for (let i = 0; i < roomCount * 3; i++) { // Try 3x roomCount attempts
                if (rooms.length >= roomCount) break;

                const roomW = minRoomSize + Math.floor(rng() * (maxRoomSize - minRoomSize));
                const roomH = minRoomSize + Math.floor(rng() * (maxRoomSize - minRoomSize));
                const roomX = 1 + Math.floor(rng() * (width - roomW - 2));
                const roomY = 1 + Math.floor(rng() * (height - roomH - 2));

                // Check for overlap
                let overlaps = false;
                for (const room of rooms) {
                    if (roomX < room.x + room.w + 2 &&
                        roomX + roomW + 2 > room.x &&
                        roomY < room.y + room.h + 2 &&
                        roomY + roomH + 2 > room.y) {
                        overlaps = true;
                        break;
                    }
                }

                if (!overlaps) {
                    rooms.push({ x: roomX, y: roomY, w: roomW, h: roomH });

                    // Carve room
                    for (let ry = roomY; ry < roomY + roomH; ry++) {
                        for (let rx = roomX; rx < roomX + roomW; rx++) {
                            dungeon[ry][rx] = { type: 'floor', roomIndex: rooms.length - 1 };
                        }
                    }
                }
            }

            // Connect rooms with corridors
            for (let i = 1; i < rooms.length; i++) {
                const roomA = rooms[i - 1];
                const roomB = rooms[i];

                const ax = Math.floor(roomA.x + roomA.w / 2);
                const ay = Math.floor(roomA.y + roomA.h / 2);
                const bx = Math.floor(roomB.x + roomB.w / 2);
                const by = Math.floor(roomB.y + roomB.h / 2);

                // L-shaped corridor
                if (rng() < 0.5) {
                    this.carveCorridor(dungeon, ax, ay, bx, ay);
                    this.carveCorridor(dungeon, bx, ay, bx, by);
                } else {
                    this.carveCorridor(dungeon, ax, ay, ax, by);
                    this.carveCorridor(dungeon, ax, by, bx, by);
                }
            }

            // Add extra connections for loops
            if (features.proceduralGeneration !== 'basic') {
                const extraConnections = Math.floor(rooms.length * 0.3);
                for (let i = 0; i < extraConnections; i++) {
                    const roomA = rooms[Math.floor(rng() * rooms.length)];
                    const roomB = rooms[Math.floor(rng() * rooms.length)];
                    if (roomA !== roomB) {
                        const ax = Math.floor(roomA.x + roomA.w / 2);
                        const ay = Math.floor(roomA.y + roomA.h / 2);
                        const bx = Math.floor(roomB.x + roomB.w / 2);
                        const by = Math.floor(roomB.y + roomB.h / 2);
                        this.carveCorridor(dungeon, ax, ay, bx, by);
                    }
                }
            }

            // Mark special rooms
            if (rooms.length > 0) {
                // Start room
                dungeon[rooms[0].y][rooms[0].x].type = 'start';

                // End room (boss)
                dungeon[rooms[rooms.length - 1].y + rooms[rooms.length - 1].h - 1]
                    [rooms[rooms.length - 1].x + rooms[rooms.length - 1].w - 1].type = 'boss';

                // Treasure room (if advanced)
                if (features.proceduralGeneration !== 'basic' && rooms.length > 2) {
                    const treasureRoom = rooms[Math.floor(rooms.length / 2)];
                    dungeon[treasureRoom.y + 1][treasureRoom.x + 1].type = 'treasure';
                }
            }

            return { dungeon, rooms };
        },

        carveCorridor: function (dungeon, x1, y1, x2, y2) {
            const dx = x2 > x1 ? 1 : x2 < x1 ? -1 : 0;
            const dy = y2 > y1 ? 1 : y2 < y1 ? -1 : 0;

            let x = x1;
            let y = y1;

            while (x !== x2 || y !== y2) {
                if (y >= 0 && y < dungeon.length && x >= 0 && x < dungeon[0].length) {
                    if (dungeon[y][x].type === 'wall') {
                        dungeon[y][x] = { type: 'corridor' };
                    }
                }

                if (x !== x2) x += dx;
                else if (y !== y2) y += dy;
            }
        },

        // Perlin-like noise for terrain
        noise: function (seed) {
            const rng = this.seededRandom(seed);
            const permutation = [];
            for (let i = 0; i < 256; i++) permutation[i] = i;
            for (let i = 255; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
            }
            const p = [...permutation, ...permutation];

            const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
            const lerp = (t, a, b) => a + t * (b - a);
            const grad = (hash, x, y) => {
                const h = hash & 3;
                const u = h < 2 ? x : y;
                const v = h < 2 ? y : x;
                return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
            };

            return function (x, y) {
                const X = Math.floor(x) & 255;
                const Y = Math.floor(y) & 255;
                x -= Math.floor(x);
                y -= Math.floor(y);
                const u = fade(x);
                const v = fade(y);
                const A = p[X] + Y;
                const B = p[X + 1] + Y;
                return lerp(v,
                    lerp(u, grad(p[A], x, y), grad(p[B], x - 1, y)),
                    lerp(u, grad(p[A + 1], x, y - 1), grad(p[B + 1], x - 1, y - 1))
                );
            };
        },

        // Generate terrain heightmap
        generateTerrain: function (width, height, seed, options = {}) {
            const noise = this.noise(seed || Date.now());
            const scale = options.scale || 0.05;
            const octaves = options.octaves || 4;
            const persistence = options.persistence || 0.5;

            const terrain = [];
            for (let y = 0; y < height; y++) {
                terrain[y] = [];
                for (let x = 0; x < width; x++) {
                    let value = 0;
                    let amplitude = 1;
                    let frequency = scale;
                    let maxValue = 0;

                    for (let o = 0; o < octaves; o++) {
                        value += noise(x * frequency, y * frequency) * amplitude;
                        maxValue += amplitude;
                        amplitude *= persistence;
                        frequency *= 2;
                    }

                    terrain[y][x] = (value / maxValue + 1) / 2; // Normalize to 0-1
                }
            }

            return terrain;
        },

        // Item placement
        placeItems: function (maze, count, seed, options = {}) {
            const rng = this.seededRandom(seed || Date.now());
            const items = [];
            const height = maze.length;
            const width = maze[0].length;

            let attempts = 0;
            while (items.length < count && attempts < count * 10) {
                const x = Math.floor(rng() * width);
                const y = Math.floor(rng() * height);

                // Check if valid placement
                const cellType = typeof maze[y][x] === 'object' ? maze[y][x].type : maze[y][x];
                if (cellType === 0 || cellType === 'floor' || cellType === 'corridor') {
                    // Check minimum distance from other items
                    let tooClose = false;
                    const minDistance = options.minDistance || 3;

                    for (const item of items) {
                        const dist = Math.sqrt(Math.pow(item.x - x, 2) + Math.pow(item.y - y, 2));
                        if (dist < minDistance) {
                            tooClose = true;
                            break;
                        }
                    }

                    if (!tooClose) {
                        items.push({
                            x,
                            y,
                            type: options.itemTypes ?
                                options.itemTypes[Math.floor(rng() * options.itemTypes.length)] :
                                'item',
                            value: Math.floor(rng() * 100),
                        });
                    }
                }
                attempts++;
            }

            return items;
        },

        // Enemy spawn points
        generateSpawnPoints: function (maze, count, seed, playerStart, options = {}) {
            const rng = this.seededRandom(seed || Date.now());
            const spawns = [];
            const height = maze.length;
            const width = maze[0].length;
            const minDistanceFromPlayer = options.minDistanceFromPlayer || 10;

            let attempts = 0;
            while (spawns.length < count && attempts < count * 20) {
                const x = Math.floor(rng() * width);
                const y = Math.floor(rng() * height);

                const cellType = typeof maze[y][x] === 'object' ? maze[y][x].type : maze[y][x];
                if (cellType === 0 || cellType === 'floor') {
                    const distFromPlayer = Math.sqrt(
                        Math.pow(x - playerStart.x, 2) +
                        Math.pow(y - playerStart.y, 2)
                    );

                    if (distFromPlayer >= minDistanceFromPlayer) {
                        spawns.push({ x, y, difficulty: 0.5 + rng() * 0.5 });
                    }
                }
                attempts++;
            }

            return spawns;
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // ADAPTIVE AI OPPONENTS
    // ═══════════════════════════════════════════════════════════════

    const AdaptiveAI = {
        // Create a learning opponent
        createOpponent: function (id, config = {}) {
            const opponent = {
                id,
                type: config.type || 'chaser',
                learningRate: config.learningRate || 0.1,
                memorySize: config.memorySize || 100,

                // Memory of player behavior
                memory: {
                    paths: [],       // Player movement patterns
                    reactions: [],   // Player reactions to events
                    timings: [],     // Player timing patterns
                    weaknesses: {},  // Identified weaknesses
                    predictions: {}, // Behavioral predictions
                },

                // Current state
                state: {
                    mode: 'hunt',
                    target: null,
                    lastKnownPlayerPos: null,
                    confidence: 0.5,
                    adaptationLevel: 0,
                },

                // Behavior modifiers (learned over time)
                modifiers: {
                    aggressiveness: 0.5,
                    unpredictability: 0.5,
                    patience: 0.5,
                    awareness: 0.5,
                },
            };

            opponentMemory.set(id, opponent);
            return opponent;
        },

        // Record player behavior for learning
        recordPlayerAction: function (opponentId, action) {
            if (!features.learningOpponents) return;

            const opponent = opponentMemory.get(opponentId);
            if (!opponent) return;

            const memory = opponent.memory;

            // Store in appropriate memory category
            switch (action.type) {
                case 'move':
                    memory.paths.push({
                        from: action.from,
                        to: action.to,
                        time: action.time,
                        situation: action.situation,
                    });
                    if (memory.paths.length > opponent.memorySize) {
                        memory.paths.shift();
                    }
                    break;

                case 'reaction':
                    memory.reactions.push({
                        stimulus: action.stimulus,
                        response: action.response,
                        responseTime: action.responseTime,
                        success: action.success,
                    });
                    if (memory.reactions.length > opponent.memorySize) {
                        memory.reactions.shift();
                    }
                    break;

                case 'timing':
                    memory.timings.push({
                        event: action.event,
                        duration: action.duration,
                        context: action.context,
                    });
                    if (memory.timings.length > opponent.memorySize) {
                        memory.timings.shift();
                    }
                    break;
            }

            // Analyze patterns
            this.analyzePatterns(opponent);
        },

        // Analyze player patterns
        analyzePatterns: function (opponent) {
            const memory = opponent.memory;

            // Path analysis - find preferred routes
            if (memory.paths.length >= 10) {
                const pathFreq = {};
                for (const path of memory.paths) {
                    const key = `${Math.round(path.to.x / 5)}_${Math.round(path.to.y / 5)}`;
                    pathFreq[key] = (pathFreq[key] || 0) + 1;
                }

                // Find hotspots
                const hotspots = Object.entries(pathFreq)
                    .filter(([_, count]) => count > 3)
                    .map(([key, count]) => {
                        const [x, y] = key.split('_').map(Number);
                        return { x: x * 5, y: y * 5, frequency: count };
                    });

                memory.predictions.hotspots = hotspots;
            }

            // Reaction analysis - find weaknesses
            if (memory.reactions.length >= 10) {
                const reactionSuccess = {};
                for (const reaction of memory.reactions) {
                    if (!reactionSuccess[reaction.stimulus]) {
                        reactionSuccess[reaction.stimulus] = { success: 0, total: 0 };
                    }
                    reactionSuccess[reaction.stimulus].total++;
                    if (!reaction.success) {
                        reactionSuccess[reaction.stimulus].success++;
                    }
                }

                // Identify weaknesses (stimuli player often fails against)
                for (const [stimulus, data] of Object.entries(reactionSuccess)) {
                    if (data.total >= 3 && data.success / data.total > 0.6) {
                        memory.weaknesses[stimulus] = data.success / data.total;
                    }
                }
            }

            // Adjust behavior modifiers based on learning
            opponent.state.adaptationLevel = Math.min(1,
                (memory.paths.length + memory.reactions.length) / (opponent.memorySize * 2)
            );
        },

        // Get AI decision based on learning
        getDecision: function (opponentId, context) {
            const opponent = opponentMemory.get(opponentId);
            if (!opponent) return { action: 'hunt', target: context.playerPos };

            const memory = opponent.memory;
            const modifiers = opponent.modifiers;

            // Base decision
            let decision = {
                action: 'hunt',
                target: context.playerPos,
                confidence: opponent.state.confidence,
            };

            // Exploit learned weaknesses
            if (Object.keys(memory.weaknesses).length > 0 && Math.random() < 0.3) {
                const weaknesses = Object.keys(memory.weaknesses);
                const exploitWeakness = weaknesses[Math.floor(Math.random() * weaknesses.length)];
                decision.exploitWeakness = exploitWeakness;
                decision.confidence += 0.2;
            }

            // Predict player movement
            if (memory.predictions.hotspots && memory.predictions.hotspots.length > 0) {
                const playerPos = context.playerPos;
                let nearestHotspot = null;
                let minDist = Infinity;

                for (const hotspot of memory.predictions.hotspots) {
                    const dist = Math.sqrt(
                        Math.pow(hotspot.x - playerPos.x, 2) +
                        Math.pow(hotspot.y - playerPos.y, 2)
                    );
                    if (dist < minDist && dist < 20) {
                        minDist = dist;
                        nearestHotspot = hotspot;
                    }
                }

                if (nearestHotspot && Math.random() < modifiers.aggressiveness) {
                    // Ambush predicted location
                    decision.action = 'ambush';
                    decision.target = nearestHotspot;
                    decision.confidence = nearestHotspot.frequency / 10;
                }
            }

            // Unpredictability modifier
            if (Math.random() < modifiers.unpredictability * 0.3) {
                decision.action = ['hunt', 'patrol', 'ambush', 'retreat'][Math.floor(Math.random() * 4)];
            }

            // Update confidence based on adaptation
            decision.confidence = Math.min(1, decision.confidence + opponent.state.adaptationLevel * 0.3);

            return decision;
        },

        // Update opponent modifiers
        updateModifier: function (opponentId, modifier, value) {
            const opponent = opponentMemory.get(opponentId);
            if (!opponent || !opponent.modifiers.hasOwnProperty(modifier)) return;

            opponent.modifiers[modifier] = Math.max(0, Math.min(1, value));
        },

        // Get opponent stats
        getOpponentStats: function (opponentId) {
            const opponent = opponentMemory.get(opponentId);
            if (!opponent) return null;

            return {
                adaptationLevel: opponent.state.adaptationLevel,
                memorySize: opponent.memory.paths.length + opponent.memory.reactions.length,
                weaknesses: Object.keys(opponent.memory.weaknesses).length,
                modifiers: { ...opponent.modifiers },
            };
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // DYNAMIC DIFFICULTY ADJUSTMENT
    // ═══════════════════════════════════════════════════════════════

    const DynamicDifficulty = {
        currentDifficulty: 0.5, // 0-1 scale
        targetDifficulty: 0.5,
        adjustmentRate: 0.05,
        lastAdjustment: 0,
        adjustmentCooldown: 30000, // 30 seconds

        // Performance metrics
        metrics: {
            deaths: 0,
            deathsRecent: [],
            damageTaken: [],
            damageDealt: [],
            itemsCollected: 0,
            objectivesCompleted: 0,
            timeInDanger: 0,
            escapeSuccess: 0,
            escapeAttempts: 0,
        },

        // Update difficulty based on performance
        update: function (gameState, deltaTime) {
            if (features.dynamicDifficulty === 'basic') return this.currentDifficulty;

            const now = Date.now();

            // Cooldown between adjustments
            if (now - this.lastAdjustment < this.adjustmentCooldown) {
                return this.currentDifficulty;
            }

            // Calculate performance score
            let performanceScore = 0.5;

            // Death rate
            if (this.metrics.deathsRecent.length > 0) {
                const recentDeaths = this.metrics.deathsRecent.filter(t => now - t < 120000);
                const deathRate = recentDeaths.length / 2; // Per 2 minutes
                performanceScore -= Math.min(0.4, deathRate * 0.2);
            }

            // Damage ratio
            if (this.metrics.damageTaken.length > 0 && this.metrics.damageDealt.length > 0) {
                const recentDamageTaken = this.metrics.damageTaken.filter(d => now - d.time < 60000);
                const recentDamageDealt = this.metrics.damageDealt.filter(d => now - d.time < 60000);

                const taken = recentDamageTaken.reduce((sum, d) => sum + d.amount, 0);
                const dealt = recentDamageDealt.reduce((sum, d) => sum + d.amount, 0);

                if (taken + dealt > 0) {
                    const ratio = dealt / (taken + dealt);
                    performanceScore += (ratio - 0.5) * 0.3;
                }
            }

            // Escape success rate
            if (this.metrics.escapeAttempts > 0) {
                const escapeRate = this.metrics.escapeSuccess / this.metrics.escapeAttempts;
                performanceScore += (escapeRate - 0.5) * 0.2;
            }

            // Time in danger (being chased, low health, etc.)
            if (gameState.timeInDanger !== undefined) {
                const dangerRatio = gameState.timeInDanger / gameState.totalTime;
                performanceScore -= dangerRatio * 0.2;
            }

            // Normalize performance score
            performanceScore = Math.max(0, Math.min(1, performanceScore));

            // Adjust target difficulty
            // If player is doing well, increase difficulty; if struggling, decrease
            if (performanceScore > 0.7) {
                this.targetDifficulty = Math.min(1, this.targetDifficulty + 0.1);
            } else if (performanceScore < 0.3) {
                this.targetDifficulty = Math.max(0, this.targetDifficulty - 0.1);
            }

            // Apply tier-based constraints
            const tierLimits = {
                basic: { min: 0.3, max: 0.7 },
                standard: { min: 0.2, max: 0.8 },
                advanced: { min: 0.1, max: 0.9 },
                extreme: { min: 0, max: 1 },
            };

            const limits = tierLimits[features.dynamicDifficulty] || tierLimits.basic;
            this.targetDifficulty = Math.max(limits.min, Math.min(limits.max, this.targetDifficulty));

            this.lastAdjustment = now;
            return this.currentDifficulty;
        },

        // Smoothly interpolate to target
        getDifficulty: function () {
            const diff = this.targetDifficulty - this.currentDifficulty;
            if (Math.abs(diff) > 0.01) {
                this.currentDifficulty += diff * this.adjustmentRate;
            }
            return this.currentDifficulty;
        },

        // Get difficulty modifiers for game systems
        getModifiers: function () {
            const diff = this.getDifficulty();

            return {
                // Enemy modifiers
                enemySpeed: 0.8 + diff * 0.4,      // 0.8 - 1.2
                enemyDamage: 0.7 + diff * 0.6,     // 0.7 - 1.3
                enemyAggression: 0.5 + diff * 0.5, // 0.5 - 1.0
                enemyCount: 0.8 + diff * 0.4,      // 0.8 - 1.2
                spawnRate: 0.7 + diff * 0.6,       // 0.7 - 1.3

                // Player modifiers
                playerDamage: 1.3 - diff * 0.3,    // 1.3 - 1.0
                playerSpeed: 1.1 - diff * 0.1,     // 1.1 - 1.0
                healthPickups: 1.2 - diff * 0.4,   // 1.2 - 0.8

                // Resource modifiers
                resourceScarcity: 0.7 + diff * 0.6, // 0.7 - 1.3
                ammoDrops: 1.3 - diff * 0.3,        // 1.3 - 1.0

                // Puzzle modifiers
                puzzleComplexity: 0.6 + diff * 0.4, // 0.6 - 1.0
                hintFrequency: 1.2 - diff * 0.4,    // 1.2 - 0.8

                // Horror modifiers
                scareFrequency: 0.6 + diff * 0.4,   // 0.6 - 1.0
                scareIntensity: 0.5 + diff * 0.5,   // 0.5 - 1.0
            };
        },

        // Record events for analysis
        recordEvent: function (eventType, data = {}) {
            const now = Date.now();

            switch (eventType) {
                case 'death':
                    this.metrics.deaths++;
                    this.metrics.deathsRecent.push(now);
                    // Keep only recent deaths
                    this.metrics.deathsRecent = this.metrics.deathsRecent.filter(t => now - t < 600000);
                    break;

                case 'damage_taken':
                    this.metrics.damageTaken.push({ time: now, amount: data.amount || 1 });
                    break;

                case 'damage_dealt':
                    this.metrics.damageDealt.push({ time: now, amount: data.amount || 1 });
                    break;

                case 'item_collected':
                    this.metrics.itemsCollected++;
                    break;

                case 'objective_complete':
                    this.metrics.objectivesCompleted++;
                    break;

                case 'escape_attempt':
                    this.metrics.escapeAttempts++;
                    if (data.success) this.metrics.escapeSuccess++;
                    break;
            }
        },

        // Reset metrics (new game)
        reset: function () {
            this.metrics = {
                deaths: 0,
                deathsRecent: [],
                damageTaken: [],
                damageDealt: [],
                itemsCollected: 0,
                objectivesCompleted: 0,
                timeInDanger: 0,
                escapeSuccess: 0,
                escapeAttempts: 0,
            };
            this.lastAdjustment = 0;
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // PERSONALIZED HORROR SYSTEM
    // ═══════════════════════════════════════════════════════════════

    const PersonalizedHorror = {
        // Fear categories with sub-types
        fearCategories: {
            darkness: ['pitch_black', 'flickering_lights', 'shadows', 'flashlight'],
            jumpscares: ['visual', 'audio', 'combined', 'anticipation'],
            chase: ['relentless', 'teleporting', 'multiple', 'invisible'],
            psychological: ['isolation', 'paranoia', 'hallucinations', 'unreliable_narrator'],
            gore: ['blood', 'body_horror', 'viscera', 'decay'],
            isolation: ['alone', 'abandoned', 'empty_spaces', 'echoes'],
            uncanny: ['dolls', 'mannequins', 'doppelgangers', 'mimics'],
            sound: ['whispers', 'footsteps', 'breathing', 'scratching'],
        },

        // Analyze player response to horror events
        analyzeFearResponse: function (event) {
            if (!features.personalizedHorror) return;

            const fearType = event.fearType;
            const intensity = event.intensity || 0.5;
            const playerResponse = event.playerResponse || {};

            // Calculate effectiveness score
            let effectiveness = 0.5;

            // Did player pause? (fear/overwhelm)
            if (playerResponse.paused) effectiveness += 0.2;

            // Did player turn away? (avoidance)
            if (playerResponse.lookedAway) effectiveness += 0.15;

            // Did player make mistakes after? (disturbed)
            if (playerResponse.mistakesAfter > 0) {
                effectiveness += Math.min(0.2, playerResponse.mistakesAfter * 0.05);
            }

            // Did player complete objective faster? (rushing through fear)
            if (playerResponse.completedFaster) effectiveness += 0.1;

            // Heart rate increase (if available)
            if (playerResponse.heartRateIncrease) {
                effectiveness += Math.min(0.2, playerResponse.heartRateIncrease * 0.1);
            }

            // Did player quit after? (too much)
            if (playerResponse.quitAfter) {
                effectiveness -= 0.3; // May have been too intense
            }

            // Normalize
            effectiveness = Math.max(0, Math.min(1, effectiveness));

            // Update fear profile
            if (playerProfile.fears.hasOwnProperty(fearType)) {
                // Weighted average
                const current = playerProfile.fears[fearType];
                playerProfile.fears[fearType] = current * 0.7 + effectiveness * 0.3;
            }

            savePlayerProfile();
        },

        // Get personalized horror recommendations
        getHorrorProfile: function () {
            const fears = playerProfile.fears;
            const sorted = Object.entries(fears)
                .sort((a, b) => b[1] - a[1]);

            return {
                // Most effective fears (high score = player responds well)
                topFears: sorted.slice(0, 3).map(([fear, score]) => ({ fear, effectiveness: score })),

                // Least effective (maybe desensitized or doesn't work)
                bottomFears: sorted.slice(-3).map(([fear, score]) => ({ fear, effectiveness: score })),

                // Recommended intensity level
                recommendedIntensity: this.calculateOptimalIntensity(),

                // Fear combinations that work well
                effectiveCombinations: this.getEffectiveCombinations(),
            };
        },

        // Calculate optimal scare intensity
        calculateOptimalIntensity: function () {
            const avgFear = Object.values(playerProfile.fears)
                .reduce((a, b) => a + b, 0) / Object.keys(playerProfile.fears).length;

            // Higher fear response = can handle higher intensity
            // But not too high (avoid desensitization)
            let optimal = 0.5;

            if (avgFear > 0.7) {
                optimal = 0.7 + (avgFear - 0.7) * 0.5; // Cap at 0.85
            } else if (avgFear < 0.3) {
                optimal = 0.3 - (0.3 - avgFear) * 0.3; // Floor at 0.15
            } else {
                optimal = avgFear;
            }

            return Math.max(0.15, Math.min(0.85, optimal));
        },

        // Find effective fear combinations
        getEffectiveCombinations: function () {
            const fears = playerProfile.fears;
            const combinations = [];

            // Check two-fear combinations
            const fearTypes = Object.keys(fears);
            for (let i = 0; i < fearTypes.length; i++) {
                for (let j = i + 1; j < fearTypes.length; j++) {
                    const combined = (fears[fearTypes[i]] + fears[fearTypes[j]]) / 2;
                    if (combined > 0.6) {
                        combinations.push({
                            fears: [fearTypes[i], fearTypes[j]],
                            effectiveness: combined,
                        });
                    }
                }
            }

            return combinations.sort((a, b) => b.effectiveness - a.effectiveness).slice(0, 5);
        },

        // Generate personalized horror event
        generateHorrorEvent: function (context = {}) {
            const profile = this.getHorrorProfile();
            const topFear = profile.topFears[0]?.fear || 'darkness';
            const intensity = profile.recommendedIntensity;

            const subTypes = this.fearCategories[topFear] || [];
            const subType = subTypes[Math.floor(Math.random() * subTypes.length)];

            return {
                type: topFear,
                subType,
                intensity,
                timing: this.calculateOptimalTiming(context),
                duration: this.calculateOptimalDuration(topFear, intensity),
                followUp: intensity > 0.6 ? this.generateFollowUp(topFear) : null,
            };
        },

        // Calculate optimal timing for next scare
        calculateOptimalTiming: function (context) {
            const base = 30000; // 30 seconds base
            const variance = 15000; // ±15 seconds

            // Adjust based on player pace
            const paceAdjust = (playerProfile.preferences.pace - 0.5) * -20000;

            // Adjust based on current tension
            const tensionAdjust = (1 - (gameMasterState.tension || 0.5)) * 10000;

            const timing = base + paceAdjust + tensionAdjust + (Math.random() - 0.5) * variance * 2;
            return Math.max(10000, Math.min(120000, timing));
        },

        // Calculate optimal duration
        calculateOptimalDuration: function (fearType, intensity) {
            const baseDurations = {
                jumpscares: 1000,
                chase: 30000,
                darkness: 10000,
                psychological: 20000,
                sound: 5000,
            };

            const base = baseDurations[fearType] || 5000;
            return Math.floor(base * (0.5 + intensity));
        },

        // Generate follow-up event
        generateFollowUp: function (primaryFear) {
            const profile = this.getHorrorProfile();
            const complementaryFears = {
                jumpscares: ['sound', 'darkness'],
                chase: ['sound', 'psychological'],
                darkness: ['sound', 'uncanny'],
                psychological: ['isolation', 'uncanny'],
                sound: ['darkness', 'psychological'],
            };

            const options = complementaryFears[primaryFear] || ['darkness'];
            const followUpFear = options[Math.floor(Math.random() * options.length)];

            return {
                type: followUpFear,
                delay: 5000 + Math.random() * 10000,
                intensity: profile.recommendedIntensity * 0.7,
            };
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // AI GAME MASTER
    // ═══════════════════════════════════════════════════════════════

    const AIGameMaster = {
        // Initialize game master for a session
        startSession: function (gameId, config = {}) {
            if (!features.aiGameMaster) return;

            gameMasterState = {
                active: true,
                gameId,
                currentMood: 'neutral',
                tension: 0.3,
                pacing: 'build',
                lastAdjustment: Date.now(),
                narrative: [],
                sessionStart: Date.now(),
                eventsTriggered: 0,
                playerState: {
                    health: 100,
                    resources: {},
                    position: null,
                    state: 'exploring',
                },
                config: {
                    minTension: config.minTension || 0.1,
                    maxTension: config.maxTension || 0.9,
                    targetPacing: config.targetPacing || 0.5, // events per minute
                    horrorIntensity: config.horrorIntensity || 0.5,
                },
            };

            console.log('[AIGameMaster] Session started for:', gameId);
        },

        // Update game master state
        update: function (gameState, deltaTime) {
            if (!gameMasterState.active || !features.aiGameMaster) return;

            const now = Date.now();
            const sessionTime = (now - gameMasterState.sessionStart) / 1000;

            // Update player state
            gameMasterState.playerState = {
                ...gameMasterState.playerState,
                ...gameState.player,
            };

            // Calculate current tension based on game state
            this.calculateTension(gameState);

            // Determine pacing
            this.determinePacing(sessionTime, gameState);

            // Check if we should trigger an event
            this.checkEventTriggers(gameState);

            // Adjust mood
            this.adjustMood(gameState);

            return this.getDirectorInstructions();
        },

        // Calculate tension level
        calculateTension: function (gameState) {
            let tension = gameMasterState.tension;

            // Factors that increase tension
            if (gameState.player?.health < 50) tension += 0.1;
            if (gameState.player?.inDanger) tension += 0.2;
            if (gameState.enemies?.nearby > 0) tension += 0.15;
            if (gameState.environment?.dark) tension += 0.05;

            // Factors that decrease tension
            if (gameState.player?.inSafeZone) tension -= 0.2;
            if (gameState.player?.recentlyRest) tension -= 0.1;
            if (gameState.player?.objectiveComplete) tension -= 0.15;

            // Gradual decay
            tension *= 0.995;

            // Clamp
            gameMasterState.tension = Math.max(
                gameMasterState.config.minTension,
                Math.min(gameMasterState.config.maxTension, tension)
            );
        },

        // Determine narrative pacing
        determinePacing: function (sessionTime, gameState) {
            const targetEventsPerMinute = gameMasterState.config.targetPacing;
            const currentEventsPerMinute = gameMasterState.eventsTriggered / (sessionTime / 60);

            if (currentEventsPerMinute < targetEventsPerMinute * 0.5) {
                gameMasterState.pacing = 'accelerate';
            } else if (currentEventsPerMinute > targetEventsPerMinute * 1.5) {
                gameMasterState.pacing = 'decelerate';
            } else if (gameMasterState.tension > 0.7) {
                gameMasterState.pacing = 'climax';
            } else if (gameMasterState.tension < 0.3) {
                gameMasterState.pacing = 'build';
            } else {
                gameMasterState.pacing = 'maintain';
            }
        },

        // Check if events should be triggered
        checkEventTriggers: function (gameState) {
            const tension = gameMasterState.tension;
            const pacing = gameMasterState.pacing;
            const now = Date.now();

            // Minimum time between events
            const minInterval = 20000 + (1 - gameMasterState.config.horrorIntensity) * 30000;

            if (now - gameMasterState.lastAdjustment < minInterval) return;

            let shouldTrigger = false;
            let eventType = null;

            // Tension-based triggers
            if (tension < 0.2 && pacing === 'build') {
                shouldTrigger = Math.random() < 0.3;
                eventType = 'ambient_horror';
            } else if (tension > 0.8 && pacing === 'climax') {
                shouldTrigger = Math.random() < 0.4;
                eventType = 'major_event';
            } else if (pacing === 'accelerate') {
                shouldTrigger = Math.random() < 0.2;
                eventType = 'minor_event';
            }

            if (shouldTrigger && eventType) {
                this.triggerEvent(eventType, gameState);
            }
        },

        // Trigger a narrative event
        triggerEvent: function (eventType, gameState) {
            const event = {
                type: eventType,
                timestamp: Date.now(),
                tension: gameMasterState.tension,
                details: {},
            };

            // Get personalized horror if available
            if (features.personalizedHorror) {
                const horrorEvent = PersonalizedHorror.generateHorrorEvent({
                    tension: gameMasterState.tension,
                    playerState: gameMasterState.playerState,
                });
                event.horror = horrorEvent;
            }

            // Generate event details based on type
            switch (eventType) {
                case 'ambient_horror':
                    event.details = {
                        subtype: ['sound', 'visual', 'atmosphere'][Math.floor(Math.random() * 3)],
                        intensity: 0.3 + Math.random() * 0.3,
                    };
                    break;

                case 'minor_event':
                    event.details = {
                        subtype: ['enemy_spawn', 'resource_scarcity', 'environmental_hazard'][Math.floor(Math.random() * 3)],
                        intensity: 0.5 + Math.random() * 0.2,
                    };
                    break;

                case 'major_event':
                    event.details = {
                        subtype: ['boss_encounter', 'chase_sequence', 'revelation'][Math.floor(Math.random() * 3)],
                        intensity: 0.8 + Math.random() * 0.2,
                    };
                    break;
            }

            gameMasterState.narrative.push(event);
            gameMasterState.eventsTriggered++;
            gameMasterState.lastAdjustment = Date.now();

            console.log('[AIGameMaster] Event triggered:', eventType, event.details);
            return event;
        },

        // Adjust mood based on game state
        adjustMood: function (gameState) {
            const tension = gameMasterState.tension;
            const health = gameState.player?.health || 100;

            if (tension > 0.8) {
                gameMasterState.currentMood = 'intense';
            } else if (tension > 0.5) {
                gameMasterState.currentMood = 'suspenseful';
            } else if (health < 30) {
                gameMasterState.currentMood = 'desperate';
            } else if (gameState.player?.objectiveComplete) {
                gameMasterState.currentMood = 'triumphant';
            } else {
                gameMasterState.currentMood = 'neutral';
            }
        },

        // Get instructions for game systems
        getDirectorInstructions: function () {
            return {
                tension: gameMasterState.tension,
                mood: gameMasterState.currentMood,
                pacing: gameMasterState.pacing,
                nextEventIn: this.estimateNextEvent(),
                recommendations: this.getRecommendations(),
            };
        },

        // Estimate time until next event
        estimateNextEvent: function () {
            const base = 30000;
            const tensionMod = (1 - gameMasterState.tension) * 20000;
            return Math.max(10000, base + tensionMod);
        },

        // Get recommendations for game systems
        getRecommendations: function () {
            const recommendations = [];

            // Tension recommendations
            if (gameMasterState.tension < 0.3) {
                recommendations.push({
                    system: 'enemies',
                    action: 'increase_presence',
                    reason: 'Low tension - player is too comfortable',
                });
            } else if (gameMasterState.tension > 0.8) {
                recommendations.push({
                    system: 'resources',
                    action: 'provide_relief',
                    reason: 'High tension - risk of player frustration',
                });
            }

            // Pacing recommendations
            if (gameMasterState.pacing === 'accelerate') {
                recommendations.push({
                    system: 'narrative',
                    action: 'introduce_stakes',
                    reason: 'Pacing too slow - needs engagement',
                });
            }

            // Personalized horror recommendations
            if (features.personalizedHorror) {
                const profile = PersonalizedHorror.getHorrorProfile();
                if (profile.topFears.length > 0) {
                    recommendations.push({
                        system: 'horror',
                        action: 'emphasize_fear',
                        params: { fear: profile.topFears[0].fear },
                        reason: 'Player responds well to this fear type',
                    });
                }
            }

            return recommendations;
        },

        // End session
        endSession: function (results = {}) {
            gameMasterState.active = false;

            // Update player profile with session data
            playerProfile.sessions++;
            playerProfile.totalPlaytime += results.playtime || 0;

            if (results.gameId) {
                if (!playerProfile.gamesPlayed[results.gameId]) {
                    playerProfile.gamesPlayed[results.gameId] = {
                        plays: 0,
                        wins: 0,
                        bestTime: null,
                        totalPlaytime: 0,
                    };
                }
                const gameStats = playerProfile.gamesPlayed[results.gameId];
                gameStats.plays++;
                gameStats.totalPlaytime += results.playtime || 0;
                if (results.won) {
                    gameStats.wins++;
                    if (!gameStats.bestTime || results.time < gameStats.bestTime) {
                        gameStats.bestTime = results.time;
                    }
                }
            }

            savePlayerProfile();
            console.log('[AIGameMaster] Session ended');
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // SENTIMENT ANALYSIS
    // ═══════════════════════════════════════════════════════════════

    const SentimentAnalysis = {
        // Positive/negative word dictionaries
        positiveWords: [
            'great', 'awesome', 'amazing', 'excellent', 'fantastic', 'love', 'best',
            'perfect', 'wonderful', 'incredible', 'brilliant', 'outstanding', 'superb',
            'fun', 'enjoy', 'exciting', 'thrilling', 'scary', 'terrifying', 'creepy',
            'spooky', 'atmospheric', 'immersive', 'beautiful', 'smooth', 'polished',
        ],
        negativeWords: [
            'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'boring',
            'frustrating', 'annoying', 'broken', 'buggy', 'laggy', 'slow', 'ugly',
            'confusing', 'unfair', 'impossible', 'stupid', 'dumb', 'ridiculous',
            'disappointing', 'waste', 'trash', 'garbage', 'useless',
        ],
        fearWords: [
            'scary', 'terrifying', 'creepy', 'spooky', 'horrifying', 'nightmare',
            'frightening', 'unsettling', 'disturbing', 'eerie', 'dread', 'panic',
            'fear', 'terror', 'shock', 'jump', 'scream',
        ],
        intensityModifiers: {
            very: 1.5,
            really: 1.4,
            extremely: 1.7,
            incredibly: 1.6,
            absolutely: 1.5,
            totally: 1.3,
            quite: 1.2,
            somewhat: 0.8,
            slightly: 0.6,
            a bit: 0.7,
            not: -1,
            never: -1,
        },

        // Analyze text sentiment
        analyze: function (text) {
            if (!features.sentimentAnalysis) {
                return { score: 0.5, sentiment: 'neutral', confidence: 0 };
            }

            const words = text.toLowerCase().split(/\s+/);
            let score = 0.5;
            let positiveCount = 0;
            let negativeCount = 0;
            let fearScore = 0;
            let modifier = 1;

            for (let i = 0; i < words.length; i++) {
                const word = words[i].replace(/[^a-z]/g, '');

                // Check for intensity modifiers
                if (this.intensityModifiers[word]) {
                    modifier = this.intensityModifiers[word];
                    continue;
                }

                // Check positive words
                if (this.positiveWords.includes(word)) {
                    positiveCount++;
                    score += 0.05 * modifier;
                }

                // Check negative words
                if (this.negativeWords.includes(word)) {
                    negativeCount++;
                    score -= 0.05 * modifier;
                }

                // Check fear words
                if (this.fearWords.includes(word)) {
                    fearScore += 0.1 * modifier;
                }

                modifier = 1; // Reset modifier
            }

            // Normalize score
            score = Math.max(0, Math.min(1, score));

            // Determine sentiment label
            let sentiment;
            if (score > 0.7) sentiment = 'very_positive';
            else if (score > 0.55) sentiment = 'positive';
            else if (score > 0.45) sentiment = 'neutral';
            else if (score > 0.3) sentiment = 'negative';
            else sentiment = 'very_negative';

            // Calculate confidence based on word count
            const totalSentimentWords = positiveCount + negativeCount;
            const confidence = Math.min(1, totalSentimentWords / 10);

            return {
                score,
                sentiment,
                confidence,
                fearScore: Math.min(1, fearScore),
                breakdown: {
                    positive: positiveCount,
                    negative: negativeCount,
                    fearIndicative: fearScore,
                },
            };
        },

        // Analyze feedback and extract insights
        analyzeFeedback: function (feedback) {
            const analysis = this.analyze(feedback.text);

            // Extract topics mentioned
            const topics = this.extractTopics(feedback.text);

            // Generate response suggestions
            const suggestions = this.generateSuggestions(analysis, topics);

            // Update player profile based on feedback
            if (feedback.gameId && analysis.confidence > 0.5) {
                // If player expresses strong emotion about a game, note it
                playerProfile.recentEvents.push({
                    type: 'feedback',
                    gameId: feedback.gameId,
                    sentiment: analysis.sentiment,
                    timestamp: Date.now(),
                });

                // Keep only recent events
                if (playerProfile.recentEvents.length > 50) {
                    playerProfile.recentEvents = playerProfile.recentEvents.slice(-50);
                }

                savePlayerProfile();
            }

            return {
                ...analysis,
                topics,
                suggestions,
            };
        },

        // Extract topics from text
        extractTopics: function (text) {
            const topicKeywords = {
                gameplay: ['gameplay', 'mechanics', 'controls', 'play', 'game'],
                graphics: ['graphics', 'visuals', 'art', 'look', 'style', 'aesthetic'],
                audio: ['sound', 'music', 'audio', 'voice', 'sfx', 'effects'],
                story: ['story', 'plot', 'narrative', 'character', 'dialogue'],
                difficulty: ['difficult', 'hard', 'easy', 'challenging', 'balance'],
                horror: ['scary', 'horror', 'fear', 'creepy', 'terrifying'],
                performance: ['lag', 'fps', 'slow', 'fast', 'performance', 'bug', 'crash'],
                price: ['price', 'cost', 'money', 'worth', 'value', 'subscription'],
            };

            const topics = [];
            const lowerText = text.toLowerCase();

            for (const [topic, keywords] of Object.entries(topicKeywords)) {
                const matches = keywords.filter(kw => lowerText.includes(kw));
                if (matches.length > 0) {
                    topics.push({
                        topic,
                        relevance: matches.length / keywords.length,
                        keywords: matches,
                    });
                }
            }

            return topics.sort((a, b) => b.relevance - a.relevance);
        },

        // Generate suggestions based on analysis
        generateSuggestions: function (analysis, topics) {
            const suggestions = [];

            // Sentiment-based suggestions
            if (analysis.sentiment === 'very_negative') {
                suggestions.push({
                    priority: 'high',
                    action: 'follow_up',
                    reason: 'Very negative feedback requires attention',
                });
            }

            // Topic-based suggestions
            for (const topic of topics) {
                if (topic.relevance > 0.5 && analysis.score < 0.4) {
                    suggestions.push({
                        priority: 'medium',
                        action: 'investigate',
                        topic: topic.topic,
                        reason: `Negative sentiment about ${topic.topic}`,
                    });
                }
            }

            // Fear analysis suggestions
            if (analysis.fearScore > 0.7) {
                suggestions.push({
                    priority: 'low',
                    action: 'note_effectiveness',
                    reason: 'Player expressed fear - horror is effective',
                });
            }

            return suggestions;
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // BEHAVIOR PROFILING
    // ═══════════════════════════════════════════════════════════════

    const BehaviorProfiler = {
        // Record player behavior
        recordBehavior: function (behavior) {
            const detailLevel = features.behaviorProfiling;

            if (detailLevel === 'basic') {
                // Only record essential metrics
                playerProfile.behaviorPatterns.push({
                    type: behavior.type,
                    timestamp: Date.now(),
                });
            } else {
                // Record detailed behavior
                playerProfile.behaviorPatterns.push({
                    ...behavior,
                    timestamp: Date.now(),
                });

                // Update skill estimates
                this.updateSkillEstimates(behavior);
            }

            // Trim old patterns
            const maxPatterns = detailLevel === 'complete' ? 1000 : detailLevel === 'advanced' ? 500 : 100;
            if (playerProfile.behaviorPatterns.length > maxPatterns) {
                playerProfile.behaviorPatterns = playerProfile.behaviorPatterns.slice(-maxPatterns);
            }

            savePlayerProfile();
        },

        // Update skill estimates based on behavior
        updateSkillEstimates: function (behavior) {
            const skills = playerProfile.skills;

            switch (behavior.type) {
                case 'reaction':
                    // Fast reaction = high reaction time skill
                    if (behavior.responseTime) {
                        const normalized = Math.max(0, Math.min(1, 1 - (behavior.responseTime - 100) / 500));
                        skills.reactionTime = skills.reactionTime * 0.9 + normalized * 0.1;
                    }
                    break;

                case 'combat':
                    // Successful combat = high combat skill
                    if (behavior.success !== undefined) {
                        const delta = behavior.success ? 0.05 : -0.02;
                        skills.combat = Math.max(0, Math.min(1, skills.combat + delta));
                    }
                    break;

                case 'stealth':
                    // Avoiding detection = high stealth skill
                    if (behavior.detected !== undefined) {
                        const delta = behavior.detected ? -0.03 : 0.05;
                        skills.stealth = Math.max(0, Math.min(1, skills.stealth + delta));
                    }
                    break;

                case 'puzzle':
                    // Solving puzzles quickly = high puzzle skill
                    if (behavior.solved && behavior.time) {
                        const normalized = Math.max(0, Math.min(1, 1 - behavior.time / 120000));
                        skills.puzzleSolving = skills.puzzleSolving * 0.9 + normalized * 0.1;
                    }
                    break;

                case 'exploration':
                    // Finding secrets = high spatial awareness
                    if (behavior.foundSecret) {
                        skills.spatialAwareness = Math.min(1, skills.spatialAwareness + 0.05);
                    }
                    break;

                case 'resource':
                    // Efficient resource use = high resource management
                    if (behavior.efficiency !== undefined) {
                        skills.resourceManagement = skills.resourceManagement * 0.9 + behavior.efficiency * 0.1;
                    }
                    break;
            }
        },

        // Get player behavior profile
        getProfile: function () {
            return {
                skills: { ...playerProfile.skills },
                fears: { ...playerProfile.fears },
                preferences: { ...playerProfile.preferences },
                summary: this.generateSummary(),
            };
        },

        // Generate profile summary
        generateSummary: function () {
            const skills = playerProfile.skills;
            const fears = playerProfile.fears;
            const topSkill = Object.entries(skills).sort((a, b) => b[1] - a[1])[0];
            const topFear = Object.entries(fears).sort((a, b) => b[1] - a[1])[0];

            return {
                playerType: this.classifyPlayer(),
                strongestSkill: topSkill ? topSkill[0] : 'unknown',
                biggestFear: topFear ? topFear[0] : 'unknown',
                experience: playerProfile.sessions > 50 ? 'veteran' : playerProfile.sessions > 10 ? 'experienced' : 'new',
            };
        },

        // Classify player type
        classifyPlayer: function () {
            const prefs = playerProfile.preferences;
            const skills = playerProfile.skills;

            // Score different playstyles
            const scores = {
                explorer: (skills.spatialAwareness + prefs.exploration) / 2,
                speedrunner: (skills.reactionTime + (1 - prefs.story)) / 2,
                completionist: (skills.puzzleSolving + prefs.exploration) / 2,
                survivor: (skills.stealth + skills.resourceManagement) / 2,
                fighter: (skills.combat + skills.reactionTime) / 2,
                horror_fan: (fears.jumpscares + fears.chase + fears.psychological) / 3,
            };

            const topType = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
            return topType ? topType[0] : 'balanced';
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    return {
        init: init,

        // Tier management
        setTier: function (tier) {
            currentTier = tier;
            features = TIER_AI_FEATURES[tier] || TIER_AI_FEATURES.none;
        },
        getFeatures: () => ({ ...features }),

        // Procedural Content Generation
        PCG: PCG,
        generateMaze: PCG.generateMaze.bind(PCG),
        generateDungeon: PCG.generateDungeon.bind(PCG),
        generateTerrain: PCG.generateTerrain.bind(PCG),
        placeItems: PCG.placeItems.bind(PCG),
        generateSpawnPoints: PCG.generateSpawnPoints.bind(PCG),
        getDailySeed: PCG.getDailySeed.bind(PCG),

        // Adaptive AI
        AdaptiveAI: AdaptiveAI,
        createOpponent: AdaptiveAI.createOpponent.bind(AdaptiveAI),
        getAIDecision: AdaptiveAI.getDecision.bind(AdaptiveAI),
        recordPlayerAction: AdaptiveAI.recordPlayerAction.bind(AdaptiveAI),

        // Dynamic Difficulty
        DynamicDifficulty: DynamicDifficulty,
        getDifficulty: DynamicDifficulty.getDifficulty.bind(DynamicDifficulty),
        getDifficultyModifiers: DynamicDifficulty.getModifiers.bind(DynamicDifficulty),
        recordDifficultyEvent: DynamicDifficulty.recordEvent.bind(DynamicDifficulty),

        // Personalized Horror
        PersonalizedHorror: PersonalizedHorror,
        getHorrorProfile: PersonalizedHorror.getHorrorProfile.bind(PersonalizedHorror),
        generateHorrorEvent: PersonalizedHorror.generateHorrorEvent.bind(PersonalizedHorror),
        analyzeFearResponse: PersonalizedHorror.analyzeFearResponse.bind(PersonalizedHorror),

        // AI Game Master
        GameMaster: AIGameMaster,
        startGameSession: AIGameMaster.startSession.bind(AIGameMaster),
        updateGameMaster: AIGameMaster.update.bind(AIGameMaster),
        endGameSession: AIGameMaster.endSession.bind(AIGameMaster),

        // Sentiment Analysis
        Sentiment: SentimentAnalysis,
        analyzeSentiment: SentimentAnalysis.analyze.bind(SentimentAnalysis),
        analyzeFeedback: SentimentAnalysis.analyzeFeedback.bind(SentimentAnalysis),

        // Behavior Profiling
        Profiler: BehaviorProfiler,
        recordBehavior: BehaviorProfiler.recordBehavior.bind(BehaviorProfiler),
        getPlayerProfile: BehaviorProfiler.getProfile.bind(BehaviorProfiler),

        // Player data
        playerProfile: playerProfile,
        saveProfile: savePlayerProfile,
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SGAIAI.init());
} else {
    SGAIAI.init();
}

// Export globally
if (typeof window !== 'undefined') {
    window.SGAIAI = SGAIAI;
}
