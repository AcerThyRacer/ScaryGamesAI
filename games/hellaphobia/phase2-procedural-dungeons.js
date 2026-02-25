/* ============================================================
   HELLAPHOBIA - PHASE 2: PROCEDURAL DUNGEON GENERATION
   Wave Function Collapse | Room-Based | Secrets | Dynamic Difficulty
   FULL IMPLEMENTATION
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 2: WAVE FUNCTION COLLAPSE ALGORITHM =====
    const WFC = {
        // Tile types with connection rules
        TILE_TYPES: {
            EMPTY: { id: 0, connections: { n: 0, s: 0, e: 0, w: 0 }, weight: 10 },
            FLOOR: { id: 1, connections: { n: 1, s: 1, e: 1, w: 1 }, weight: 50 },
            WALL_N: { id: 2, connections: { n: 0, s: 1, e: 0, w: 0 }, weight: 5 },
            WALL_S: { id: 3, connections: { n: 1, s: 0, e: 0, w: 0 }, weight: 5 },
            WALL_E: { id: 4, connections: { n: 0, s: 0, e: 0, w: 1 }, weight: 5 },
            WALL_W: { id: 5, connections: { n: 0, s: 0, e: 1, w: 0 }, weight: 5 },
            CORNER_NE: { id: 6, connections: { n: 0, s: 1, e: 0, w: 1 }, weight: 3 },
            CORNER_NW: { id: 7, connections: { n: 0, s: 1, e: 1, w: 0 }, weight: 3 },
            CORNER_SE: { id: 8, connections: { n: 1, s: 0, e: 0, w: 1 }, weight: 3 },
            CORNER_SW: { id: 9, connections: { n: 1, s: 0, e: 1, w: 0 }, weight: 3 },
            DOOR_N: { id: 10, connections: { n: 0, s: 1, e: 0, w: 0 }, weight: 2 },
            DOOR_S: { id: 11, connections: { n: 1, s: 0, e: 0, w: 0 }, weight: 2 },
            DOOR_E: { id: 12, connections: { n: 0, s: 0, e: 0, w: 1 }, weight: 2 },
            DOOR_W: { id: 13, connections: { n: 0, s: 0, e: 1, w: 0 }, weight: 2 },
            TRAP_SPIKE: { id: 14, connections: { n: 1, s: 1, e: 1, w: 1 }, weight: 1 },
            HIDDEN_DOOR: { id: 15, connections: { n: 1, s: 1, e: 1, w: 1 }, weight: 0.5 }
        },

        // Compatibility rules between tile types
        COMPATIBILITY: {},

        initializeCompatibility() {
            // Build compatibility matrix
            const types = Object.values(this.TILE_TYPES);
            types.forEach(t1 => {
                this.COMPATIBILITY[t1.id] = {};
                types.forEach(t2 => {
                    // Check if tiles can connect
                    const canConnect = (
                        (t1.connections.n === t2.connections.s) &&
                        (t1.connections.s === t2.connections.n) &&
                        (t1.connections.e === t2.connections.w) &&
                        (t1.connections.w === t2.connections.e)
                    );
                    this.COMPATIBILITY[t1.id][t2.id] = canConnect;
                });
            });
        },

        // Generate a level using WFC
        generate(width, height, seed = null) {
            if (!seed) seed = Date.now();
            const rng = this.createRNG(seed);
            
            // Initialize grid with all possibilities
            const grid = [];
            for (let y = 0; y < height; y++) {
                grid[y] = [];
                for (let x = 0; x < width; x++) {
                    grid[y][x] = {
                        x, y,
                        possibilities: Object.keys(this.TILE_TYPES).map(k => this.TILE_TYPES[k].id),
                        collapsed: false,
                        tile: null
                    };
                }
            }

            // Collapse cells until all are collapsed
            while (this.hasUncollapsed(grid)) {
                const cell = this.findLowestEntropy(grid, rng);
                if (!cell) break;
                
                this.collapse(cell, rng);
                this.propagate(grid, cell);
            }

            return {
                grid,
                width,
                height,
                seed,
                tiles: this.convertToTiles(grid)
            };
        },

        createRNG(seed) {
            // Simple LCG random number generator
            let s = seed;
            return {
                next() {
                    s = (s * 1664525 + 1013904223) % 4294967296;
                    return s / 4294967296;
                },
                range(min, max) {
                    return min + this.next() * (max - min);
                }
            };
        },

        hasUncollapsed(grid) {
            for (let row of grid) {
                for (let cell of row) {
                    if (!cell.collapsed) return true;
                }
            }
            return false;
        },

        findLowestEntropy(grid, rng) {
            let minEntropy = Infinity;
            let candidates = [];

            for (let row of grid) {
                for (let cell of row) {
                    if (cell.collapsed) continue;
                    
                    const entropy = this.calculateEntropy(cell);
                    if (entropy < minEntropy) {
                        minEntropy = entropy;
                        candidates = [cell];
                    } else if (entropy === minEntropy) {
                        candidates.push(cell);
                    }
                }
            }

            return candidates.length > 0 ? candidates[Math.floor(rng.next() * candidates.length)] : null;
        },

        calculateEntropy(cell) {
            if (cell.possibilities.length === 0) return Infinity;
            
            // Calculate weighted entropy
            let totalWeight = 0;
            let entropy = 0;
            
            for (let id of cell.possibilities) {
                const type = Object.values(this.TILE_TYPES).find(t => t.id === id);
                const weight = type ? type.weight : 1;
                totalWeight += weight;
            }
            
            for (let id of cell.possibilities) {
                const type = Object.values(this.TILE_TYPES).find(t => t.id === id);
                const weight = type ? type.weight : 1;
                const p = weight / totalWeight;
                entropy -= p * Math.log(p);
            }
            
            return entropy;
        },

        collapse(cell, rng) {
            // Weighted random selection
            const weights = cell.possibilities.map(id => {
                const type = Object.values(this.TILE_TYPES).find(t => t.id === id);
                return type ? type.weight : 1;
            });
            
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            let random = rng.next() * totalWeight;
            
            let selectedId = cell.possibilities[0];
            for (let i = 0; i < cell.possibilities.length; i++) {
                random -= weights[i];
                if (random <= 0) {
                    selectedId = cell.possibilities[i];
                    break;
                }
            }
            
            cell.collapsed = true;
            cell.tile = selectedId;
            cell.possibilities = [selectedId];
        },

        propagate(grid, collapsedCell) {
            const stack = [collapsedCell];
            
            while (stack.length > 0) {
                const cell = stack.pop();
                const neighbors = this.getNeighbors(grid, cell);
                
                for (let dir in neighbors) {
                    const neighbor = neighbors[dir];
                    if (neighbor.collapsed) continue;
                    
                    const validPossibilities = neighbor.possibilities.filter(id => {
                        return this.COMPATIBILITY[cell.tile][id];
                    });
                    
                    if (validPossibilities.length < neighbor.possibilities.length) {
                        neighbor.possibilities = validPossibilities;
                        if (!stack.includes(neighbor)) {
                            stack.push(neighbor);
                        }
                    }
                }
            }
        },

        getNeighbors(grid, cell) {
            const neighbors = {};
            const dirs = [
                { name: 'n', dx: 0, dy: -1 },
                { name: 's', dx: 0, dy: 1 },
                { name: 'e', dx: 1, dy: 0 },
                { name: 'w', dx: -1, dy: 0 }
            ];
            
            for (let dir of dirs) {
                const nx = cell.x + dir.dx;
                const ny = cell.y + dir.dy;
                if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[0].length) {
                    neighbors[dir.name] = grid[ny][nx];
                }
            }
            
            return neighbors;
        },

        convertToTiles(grid) {
            const tiles = [];
            for (let row of grid) {
                for (let cell of row) {
                    if (cell.tile !== null) {
                        const type = Object.values(this.TILE_TYPES).find(t => t.id === cell.tile);
                        tiles.push({
                            x: cell.x * 32,
                            y: cell.y * 32,
                            w: 32,
                            h: 32,
                            type: this.getTileTypeName(cell.tile),
                            gridX: cell.x,
                            gridY: cell.y
                        });
                    }
                }
            }
            return tiles;
        },

        getTileTypeName(id) {
            const names = Object.keys(this.TILE_TYPES);
            for (let name of names) {
                if (this.TILE_TYPES[name].id === id) return name.toLowerCase();
            }
            return 'floor';
        }
    };

    // ===== PHASE 2: ROOM-BASED GENERATION =====
    const RoomGenerator = {
        ROOM_TEMPLATES: {
            // Basic rooms
            START: {
                width: 8, height: 6,
                layout: [
                    '########',
                    '#......#',
                    '#..S...#',
                    '#......#',
                    '#......#',
                    '########'
                ],
                exits: [{ x: 7, y: 2, dir: 'e' }],
                type: 'start'
            },
            END: {
                width: 8, height: 6,
                layout: [
                    '########',
                    '#......#',
                    '#..E...#',
                    '#......#',
                    '#......#',
                    '########'
                ],
                exits: [{ x: 0, y: 2, dir: 'w' }],
                type: 'end'
            },
            HALLWAY_H: {
                width: 12, height: 4,
                layout: [
                    '############',
                    '#..........#',
                    '#..........#',
                    '############'
                ],
                exits: [{ x: 0, y: 1, dir: 'w' }, { x: 11, y: 1, dir: 'e' }],
                type: 'hallway'
            },
            HALLWAY_V: {
                width: 4, height: 12,
                layout: [
                    '####',
                    '#..#',
                    '#..#',
                    '#..#',
                    '#..#',
                    '#..#',
                    '#..#',
                    '#..#',
                    '#..#',
                    '#..#',
                    '#..#',
                    '####'
                ],
                exits: [{ x: 1, y: 0, dir: 'n' }, { x: 1, y: 11, dir: 's' }],
                type: 'hallway'
            },
            CHAMBER_SMALL: {
                width: 10, height: 8,
                layout: [
                    '##########',
                    '#........#',
                    '#...##...#',
                    '#...##...#',
                    '#...##...#',
                    '#...##...#',
                    '#........#',
                    '##########'
                ],
                exits: [
                    { x: 0, y: 3, dir: 'w' },
                    { x: 9, y: 3, dir: 'e' },
                    { x: 5, y: 0, dir: 'n' },
                    { x: 5, y: 7, dir: 's' }
                ],
                type: 'chamber'
            },
            CHAMBER_LARGE: {
                width: 16, height: 12,
                layout: [
                    '################',
                    '#..............#',
                    '#...########...#',
                    '#...#......#...#',
                    '#...#......#...#',
                    '#...#......#...#',
                    '#...#......#...#',
                    '#...#......#...#',
                    '#...########...#',
                    '#..............#',
                    '#..............#',
                    '################'
                ],
                exits: [
                    { x: 0, y: 5, dir: 'w' },
                    { x: 15, y: 5, dir: 'e' },
                    { x: 8, y: 0, dir: 'n' },
                    { x: 8, y: 11, dir: 's' }
                ],
                type: 'chamber'
            },
            TREASURE: {
                width: 8, height: 6,
                layout: [
                    '########',
                    '#......#',
                    '#..C...#',
                    '#......#',
                    '#......#',
                    '########'
                ],
                exits: [{ x: 0, y: 2, dir: 'w' }],
                type: 'treasure',
                locked: true
            },
            TRAP_ROOM: {
                width: 10, height: 8,
                layout: [
                    '##########',
                    '#.T....T.#',
                    '#........#',
                    '#...##...#',
                    '#...##...#',
                    '#.T....T.#',
                    '#........#',
                    '##########'
                ],
                exits: [{ x: 0, y: 3, dir: 'w' }, { x: 9, y: 3, dir: 'e' }],
                type: 'trap'
            },
            BOSS: {
                width: 20, height: 14,
                layout: [
                    '####################',
                    '#..................#',
                    '#...############...#',
                    '#...#..........#...#',
                    '#...#..........#...#',
                    '#...#..........#...#',
                    '#...#..........#...#',
                    '#...#..........#...#',
                    '#...#..........#...#',
                    '#...#..........#...#',
                    '#...############...#',
                    '#..................#',
                    '#.........B........#',
                    '####################'
                ],
                exits: [{ x: 0, y: 6, dir: 'w' }],
                type: 'boss',
                locked: true
            }
        },

        // Generate a dungeon with rooms
        generateDungeon(config) {
            const {
                minRooms = 5,
                maxRooms = 10,
                worldTheme = 'dungeon',
                difficulty = 1,
                seed = Date.now()
            } = config;

            const rng = WFC.createRNG(seed);
            const numRooms = Math.floor(rng.range(minRooms, maxRooms));
            
            // Initialize dungeon
            const dungeon = {
                rooms: [],
                corridors: [],
                width: 0,
                height: 0,
                seed,
                theme: worldTheme,
                difficulty,
                tiles: [],
                entities: {
                    monsters: [],
                    items: [],
                    traps: [],
                    secrets: []
                }
            };

            // Place start room
            const startRoom = this.placeRoom(dungeon, 'START', 0, 0, rng);
            
            // Generate connected rooms
            let currentRoom = startRoom;
            const roomQueue = [currentRoom];
            const placedRooms = 1;
            
            while (placedRooms < numRooms && roomQueue.length > 0) {
                currentRoom = roomQueue.shift();
                
                // Try to place rooms from each exit
                for (let exit of currentRoom.exits) {
                    if (exit.connected) continue;
                    
                    const nextRoomType = this.selectNextRoomType(dungeon, placedRooms, numRooms, rng);
                    const nextRoom = this.tryPlaceRoom(dungeon, currentRoom, exit, nextRoomType, rng);
                    
                    if (nextRoom) {
                        roomQueue.push(nextRoom);
                        placedRooms++;
                        
                        // Create corridor
                        this.createCorridor(dungeon, currentRoom, nextRoom, exit);
                    }
                }
            }

            // Generate tiles from rooms
            dungeon.tiles = this.roomsToTiles(dungeon);
            
            // Place entities
            this.placeEntities(dungeon, rng);
            
            // Calculate bounds
            this.calculateBounds(dungeon);
            
            return dungeon;
        },

        placeRoom(dungeon, type, x, y, rng) {
            const template = this.ROOM_TEMPLATES[type];
            const room = {
                id: dungeon.rooms.length,
                type,
                x,
                y,
                width: template.width,
                height: template.height,
                layout: template.layout,
                exits: template.exits.map(e => ({ ...e, connected: false })),
                locked: template.locked || false,
                visited: false
            };
            
            dungeon.rooms.push(room);
            return room;
        },

        selectNextRoomType(dungeon, placed, total, rng) {
            const remaining = total - placed;
            
            if (remaining === 1) return 'END';
            if (placed === total - 2 && rng.next() < 0.3) return 'TREASURE';
            if (placed === total - 1) return 'BOSS';
            
            const types = ['HALLWAY_H', 'HALLWAY_V', 'CHAMBER_SMALL', 'CHAMBER_SMALL', 'CHAMBER_LARGE', 'TRAP_ROOM'];
            return types[Math.floor(rng.next() * types.length)];
        },

        tryPlaceRoom(dungeon, fromRoom, fromExit, type, rng) {
            const template = this.ROOM_TEMPLATES[type];
            
            // Calculate position based on exit direction
            let x = fromRoom.x;
            let y = fromRoom.y;
            
            switch(fromExit.dir) {
                case 'n': y -= template.height; break;
                case 's': y += fromRoom.height; break;
                case 'e': x += fromRoom.width; break;
                case 'w': x -= template.width; break;
            }
            
            // Check for overlap
            if (this.checkOverlap(dungeon, x, y, template.width, template.height)) {
                return null;
            }
            
            // Place the room
            const room = this.placeRoom(dungeon, type, x, y, rng);
            fromExit.connected = true;
            
            // Mark corresponding exit as connected
            const oppositeDir = { n: 's', s: 'n', e: 'w', w: 'e' }[fromExit.dir];
            const matchingExit = room.exits.find(e => e.dir === oppositeDir);
            if (matchingExit) matchingExit.connected = true;
            
            return room;
        },

        checkOverlap(dungeon, x, y, width, height) {
            const padding = 2; // Minimum space between rooms
            for (let room of dungeon.rooms) {
                if (x < room.x + room.width + padding &&
                    x + width + padding > room.x &&
                    y < room.y + room.height + padding &&
                    y + height + padding > room.y) {
                    return true;
                }
            }
            return false;
        },

        createCorridor(dungeon, room1, room2, exit) {
            // Simple corridor between room centers
            const x1 = room1.x + room1.width / 2;
            const y1 = room1.y + room1.height / 2;
            const x2 = room2.x + room2.width / 2;
            const y2 = room2.y + room2.height / 2;
            
            dungeon.corridors.push({
                from: room1.id,
                to: room2.id,
                x1, y1, x2, y2,
                width: 3
            });
        },

        roomsToTiles(dungeon) {
            const tiles = [];
            
            // Convert rooms to tiles
            for (let room of dungeon.rooms) {
                for (let y = 0; y < room.layout.length; y++) {
                    for (let x = 0; x < room.layout[y].length; x++) {
                        const char = room.layout[y][x];
                        const worldX = (room.x + x) * 32;
                        const worldY = (room.y + y) * 32;
                        
                        let type = 'floor';
                        if (char === '#') type = 'wall';
                        else if (char === 'S') type = 'spawn';
                        else if (char === 'E') type = 'exit';
                        else if (char === 'C') type = 'chest';
                        else if (char === 'B') type = 'boss_spawn';
                        else if (char === 'T') type = 'trap_spike';
                        else if (char === '.') type = 'floor';
                        
                        tiles.push({
                            x: worldX,
                            y: worldY,
                            w: 32,
                            h: 32,
                            type,
                            roomId: room.id
                        });
                    }
                }
            }
            
            // Convert corridors to tiles
            for (let corridor of dungeon.corridors) {
                const tiles_x = Math.floor(corridor.x1);
                const tiles_y = Math.floor(corridor.y1);
                const tiles_x2 = Math.floor(corridor.x2);
                const tiles_y2 = Math.floor(corridor.y2);
                
                // Horizontal corridor
                if (tiles_y === tiles_y2) {
                    const minX = Math.min(tiles_x, tiles_x2);
                    const maxX = Math.max(tiles_x, tiles_x2);
                    for (let x = minX; x <= maxX; x++) {
                        for (let y = tiles_y - 1; y <= tiles_y + 1; y++) {
                            tiles.push({
                                x: x * 32,
                                y: y * 32,
                                w: 32,
                                h: 32,
                                type: y === tiles_y ? 'floor' : 'wall',
                                corridor: true
                            });
                        }
                    }
                }
                // Vertical corridor
                else if (tiles_x === tiles_x2) {
                    const minY = Math.min(tiles_y, tiles_y2);
                    const maxY = Math.max(tiles_y, tiles_y2);
                    for (let y = minY; y <= maxY; y++) {
                        for (let x = tiles_x - 1; x <= tiles_x + 1; x++) {
                            tiles.push({
                                x: x * 32,
                                y: y * 32,
                                w: 32,
                                h: 32,
                                type: x === tiles_x ? 'floor' : 'wall',
                                corridor: true
                            });
                        }
                    }
                }
            }
            
            return tiles;
        },

        placeEntities(dungeon, rng) {
            // Place monsters
            const monsterCount = Math.floor(3 + dungeon.difficulty * 2 + rng.next() * 3);
            for (let i = 0; i < monsterCount; i++) {
                const room = dungeon.rooms[Math.floor(rng.next() * dungeon.rooms.length)];
                if (room.type === 'start') continue;
                
                dungeon.entities.monsters.push({
                    x: (room.x + 2 + Math.floor(rng.next() * (room.width - 4))) * 32,
                    y: (room.y + 2 + Math.floor(rng.next() * (room.height - 4))) * 32,
                    type: this.selectMonsterType(dungeon.difficulty, rng),
                    roomId: room.id
                });
            }
            
            // Place items
            const itemCount = Math.floor(2 + rng.next() * 3);
            for (let i = 0; i < itemCount; i++) {
                const room = dungeon.rooms[Math.floor(rng.next() * dungeon.rooms.length)];
                dungeon.entities.items.push({
                    x: (room.x + 2 + Math.floor(rng.next() * (room.width - 4))) * 32,
                    y: (room.y + 2 + Math.floor(rng.next() * (room.height - 4))) * 32,
                    type: rng.next() < 0.5 ? 'health' : 'sanity',
                    roomId: room.id
                });
            }
            
            // Place secrets
            this.placeSecrets(dungeon, rng);
        },

        selectMonsterType(difficulty, rng) {
            const types = ['crawler', 'floater', 'chaser', 'wailer', 'stalker'];
            const weights = [30, 25, 20, 15, 10];
            
            // Higher difficulty = more dangerous monsters
            if (difficulty > 2) {
                weights[2] += 10; // More chasers
                weights[4] += 10; // More stalkers
            }
            if (difficulty > 4) {
                weights[3] += 10; // More wailers
            }
            
            const total = weights.reduce((a, b) => a + b, 0);
            let random = rng.next() * total;
            
            for (let i = 0; i < types.length; i++) {
                random -= weights[i];
                if (random <= 0) return types[i];
            }
            
            return types[0];
        },

        placeSecrets(dungeon, rng) {
            // Hidden rooms
            const secretRoomCount = Math.floor(rng.next() * 2);
            for (let i = 0; i < secretRoomCount; i++) {
                // Find a room with an unconnected exit
                const roomsWithExits = dungeon.rooms.filter(r => 
                    r.exits.some(e => !e.connected)
                );
                
                if (roomsWithExits.length === 0) continue;
                
                const room = roomsWithExits[Math.floor(rng.next() * roomsWithExits.length)];
                const exit = room.exits.find(e => !e.connected);
                
                // Create secret room
                const secretRoom = this.tryPlaceRoom(dungeon, room, exit, 'TREASURE', rng);
                if (secretRoom) {
                    secretRoom.isSecret = true;
                    dungeon.entities.secrets.push({
                        type: 'hidden_room',
                        roomId: secretRoom.id,
                        x: secretRoom.x * 32,
                        y: secretRoom.y * 32
                    });
                }
            }
            
            // Hidden passages in walls
            const passageCount = Math.floor(rng.next() * 3);
            for (let i = 0; i < passageCount; i++) {
                const wallTiles = dungeon.tiles.filter(t => t.type === 'wall' && !t.corridor);
                if (wallTiles.length === 0) continue;
                
                const tile = wallTiles[Math.floor(rng.next() * wallTiles.length)];
                tile.type = 'hidden_door';
                tile.secret = true;
                
                dungeon.entities.secrets.push({
                    type: 'hidden_door',
                    x: tile.x,
                    y: tile.y
                });
            }
        },

        calculateBounds(dungeon) {
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;
            
            for (let room of dungeon.rooms) {
                minX = Math.min(minX, room.x * 32);
                minY = Math.min(minY, room.y * 32);
                maxX = Math.max(maxX, (room.x + room.width) * 32);
                maxY = Math.max(maxY, (room.y + room.height) * 32);
            }
            
            dungeon.width = maxX - minX;
            dungeon.height = maxY - minY;
            dungeon.bounds = { minX, minY, maxX, maxY };
        }
    };

    // ===== PHASE 2: DYNAMIC DIFFICULTY =====
    const DifficultySystem = {
        calculateDifficulty(playerStats, levelNumber) {
            const baseDifficulty = Math.min(10, Math.floor(levelNumber / 10) + 1);
            
            // Adjust based on player performance
            const deathAdjustment = Math.min(3, playerStats.deathsInLevel * 0.5);
            const healthAdjustment = (100 - playerStats.averageHealth) / 50;
            const sanityAdjustment = (100 - playerStats.averageSanity) / 50;
            
            // Calculate dynamic difficulty
            let difficulty = baseDifficulty - deathAdjustment + healthAdjustment + sanityAdjustment;
            difficulty = Math.max(1, Math.min(10, difficulty));
            
            return {
                level: Math.floor(difficulty),
                monsterCount: Math.floor(3 + difficulty * 1.5),
                monsterStrength: 1 + (difficulty * 0.1),
                trapDensity: difficulty * 0.1,
                resourceScarcity: difficulty * 0.05,
                secretChance: Math.max(0.1, 0.5 - (difficulty * 0.04))
            };
        },

        adjustMonsters(monsters, difficulty) {
            return monsters.map(m => ({
                ...m,
                hp: Math.floor(m.hp * difficulty.monsterStrength),
                damage: Math.floor(m.damage * difficulty.monsterStrength),
                speed: m.speed * (1 + (difficulty.level * 0.05))
            }));
        },

        adjustResources(items, difficulty) {
            // Reduce resources at higher difficulties
            return items.filter(() => Math.random() > difficulty.resourceScarcity);
        }
    };

    // ===== PHASE 2: SEED-BASED SHARING =====
    const SeedSystem = {
        encodeSeed(dungeon) {
            const data = {
                seed: dungeon.seed,
                theme: dungeon.theme,
                difficulty: dungeon.difficulty,
                rooms: dungeon.rooms.length
            };
            return btoa(JSON.stringify(data));
        },

        decodeSeed(seedString) {
            try {
                return JSON.parse(atob(seedString));
            } catch (e) {
                return null;
            }
        },

        generateFromSeed(seedString) {
            const data = this.decodeSeed(seedString);
            if (!data) return null;
            
            return RoomGenerator.generateDungeon({
                seed: data.seed,
                worldTheme: data.theme,
                difficulty: data.difficulty
            });
        }
    };

    // ===== PHASE 2: MULTI-LEVEL DUNGEONS =====
    const MultiLevelSystem = {
        // Staircase types for vertical connectivity
        STAIR_TYPES: {
            STAIRS_UP: { id: 'stairs_up', symbol: '<', connectsTo: 'above' },
            STAIRS_DOWN: { id: 'stairs_down', symbol: '>', connectsTo: 'below' },
            ELEVATOR: { id: 'elevator', symbol: '≡', connectsTo: 'both' },
            LADDER_UP: { id: 'ladder_up', symbol: '↑', connectsTo: 'above' },
            LADDER_DOWN: { id: 'ladder_down', symbol: '↓', connectsTo: 'below' }
        },

        // Generate multi-level dungeon
        generateMultiLevel(levelNumber, config = {}) {
            const numLevels = Math.min(5, Math.max(2, Math.floor(levelNumber / 5) + 1));
            const levels = [];
            let currentConfig = { ...config };

            for (let level = 0; level < numLevels; level++) {
                // First level always has stairs down
                // Last level has stairs up only
                // Middle levels have both

                if (level === 0) {
                    currentConfig.hasStairsUp = false;
                    currentConfig.hasStairsDown = true;
                } else if (level === numLevels - 1) {
                    currentConfig.hasStairsUp = true;
                    currentConfig.hasStairsDown = false;
                } else {
                    currentConfig.hasStairsUp = true;
                    currentConfig.hasStairsDown = true;
                }

                currentConfig.levelDepth = level + 1;
                const levelData = RoomGenerator.generateDungeon(currentConfig);
                levelData.depth = level + 1;
                levelData.totalLevels = numLevels;

                // Place staircases
                this.placeStaircases(levelData, level, numLevels);

                levels.push(levelData);

                // Next level uses same seed offset for connectivity
                currentConfig.seed = currentConfig.seed + 1000;
                currentConfig.minRooms = Math.max(3, currentConfig.minRooms - 1);
            }

            return {
                levels,
                currentLevel: 0,
                totalLevels: numLevels
            };
        },

        placeStaircases(levelData, levelIndex, totalLevels) {
            const rng = WFC.createRNG(levelData.seed + levelIndex * 100);

            // Find suitable rooms for stairs
            const nonStartRooms = levelData.rooms.filter(r =>
                r.type !== 'start' && r.type !== 'end' && r.type !== 'boss'
            );

            if (nonStartRooms.length < 2) return;

            // Place stairs down (to deeper level)
            if (levelIndex < totalLevels - 1) {
                const stairsDownRoom = nonStartRooms[Math.floor(rng.next() * nonStartRooms.length)];
                const stairTile = this.findStairPosition(levelData, stairsDownRoom, rng);
                if (stairTile) {
                    stairTile.type = 'stairs_down';
                    stairTile.stairData = {
                        connectsTo: levelIndex + 1,
                        stairType: 'down'
                    };
                    levelData.entities.stairsDown = {
                        x: stairTile.x,
                        y: stairTile.y,
                        roomId: stairsDownRoom.id,
                        targetLevel: levelIndex + 1
                    };
                }
            }

            // Place stairs up (to surface)
            if (levelIndex > 0) {
                const stairsUpRoom = nonStartRooms[Math.floor(rng.next() * nonStartRooms.length)];
                const stairTile = this.findStairPosition(levelData, stairsUpRoom, rng);
                if (stairTile) {
                    stairTile.type = 'stairs_up';
                    stairTile.stairData = {
                        connectsTo: levelIndex - 1,
                        stairType: 'up'
                    };
                    levelData.entities.stairsUp = {
                        x: stairTile.x,
                        y: stairTile.y,
                        roomId: stairsUpRoom.id,
                        targetLevel: levelIndex - 1
                    };
                }
            }
        },

        findStairPosition(levelData, room, rng) {
            // Find a floor tile near the center of the room for stairs
            for (let y = 1; y < room.height - 1; y++) {
                for (let x = 1; x < room.width - 1; x++) {
                    const worldX = room.x + x;
                    const worldY = room.y + y;
                    const tile = levelData.tiles.find(t =>
                        Math.floor(t.x / 32) === worldX &&
                        Math.floor(t.y / 32) === worldY &&
                        t.type === 'floor'
                    );
                    if (tile) return tile;
                }
            }
            return null;
        },

        // Check if player is using stairs
        checkStairUsage(player, levelData) {
            const playerTileX = Math.floor(player.x / 32);
            const playerTileY = Math.floor(player.y / 32);

            const stairTile = levelData.tiles.find(t =>
                Math.floor(t.x / 32) === playerTileX &&
                Math.floor(t.y / 32) === playerTileY &&
                (t.type === 'stairs_up' || t.type === 'stairs_down')
            );

            return stairTile ? stairTile.stairData : null;
        }
    };

    // ===== PHASE 2: KEY/DOOR PROGRESSION =====
    const KeyDoorSystem = {
        KEY_TYPES: {
            BRASS_KEY: { id: 'brass_key', name: 'Brass Key', color: '#DAA520', opens: ['brass_door'] },
            IRON_KEY: { id: 'iron_key', name: 'Iron Key', color: '#708090', opens: ['iron_door'] },
            BLOOD_KEY: { id: 'blood_key', name: 'Blood Key', color: '#8B0000', opens: ['blood_door'] },
            SHADOW_KEY: { id: 'shadow_key', name: 'Shadow Key', color: '#4B0082', opens: ['shadow_door'] },
            MASTER_KEY: { id: 'master_key', name: 'Master Key', color: '#FFD700', opens: ['all'] }
        },

        DOOR_TYPES: {
            BRASS_DOOR: { id: 'brass_door', name: 'Brass Door', hp: 50, requires: ['brass_key', 'master_key'] },
            IRON_DOOR: { id: 'iron_door', name: 'Iron Door', hp: 100, requires: ['iron_key', 'master_key'] },
            BLOOD_DOOR: { id: 'blood_door', name: 'Blood Door', hp: 150, requires: ['blood_key', 'master_key'] },
            SHADOW_DOOR: { id: 'shadow_door', name: 'Shadow Door', hp: 200, requires: ['shadow_key', 'master_key'] },
            LOCKED_DOOR: { id: 'locked_door', name: 'Locked Door', hp: 75, requires: [] }
        },

        // Initialize player inventory
        initInventory() {
            return {
                keys: [],
                maxKeys: 10
            };
        },

        // Add key to inventory
        addKey(inventory, keyType) {
            if (inventory.keys.length >= inventory.maxKeys) return false;

            const existingKey = inventory.keys.find(k => k.id === keyType.id);
            if (existingKey) {
                existingKey.count = (existingKey.count || 1) + 1;
            } else {
                inventory.keys.push({ ...keyType, count: 1 });
            }
            return true;
        },

        // Check if player can open door
        canOpenDoor(inventory, doorType) {
            if (doorType.id === 'locked_door') return true; // Can be broken down

            for (const key of inventory.keys) {
                if (key.opens.includes(doorType.id) || key.opens.includes('all')) {
                    return true;
                }
            }
            return false;
        },

        // Use key on door
        useKey(inventory, doorType) {
            if (!this.canOpenDoor(inventory, doorType)) return false;

            // Find and use appropriate key
            for (let i = 0; i < inventory.keys.length; i++) {
                const key = inventory.keys[i];
                if (key.opens.includes(doorType.id) || key.opens.includes('all')) {
                    key.count--;
                    if (key.count <= 0) {
                        inventory.keys.splice(i, 1);
                    }
                    return true;
                }
            }
            return false;
        },

        // Place keys and doors in dungeon
        placeKeysAndDoors(levelData, difficulty) {
            const rng = WFC.createRNG(levelData.seed + 500);

            // Determine which key types to use based on depth
            const availableKeys = Object.values(this.KEY_TYPES);
            const numKeys = Math.min(3, Math.floor(difficulty / 3) + 1);

            // Place keys in rooms
            for (let i = 0; i < numKeys; i++) {
                const keyType = availableKeys[Math.floor(rng.next() * availableKeys.length)];
                const room = levelData.rooms.find(r => r.type === 'treasure' || r.type === 'chamber');
                if (room) {
                    levelData.entities.keys = levelData.entities.keys || [];
                    levelData.entities.keys.push({
                        type: keyType,
                        x: (room.x + Math.floor(rng.next() * room.width)) * 32,
                        y: (room.y + Math.floor(rng.next() * room.height)) * 32,
                        roomId: room.id
                    });
                }
            }

            // Place locked doors in hallways
            const availableDoors = Object.values(this.DOOR_TYPES);
            const hallways = levelData.rooms.filter(r => r.type === 'hallway');

            for (const hallway of hallways) {
                if (rng.next() < 0.3) { // 30% chance for locked door
                    const doorType = availableDoors[Math.floor(rng.next() * availableDoors.length)];
                    const exit = hallway.exits[0];
                    if (exit) {
                        levelData.entities.doors = levelData.entities.doors || [];
                        levelData.entities.doors.push({
                            type: doorType,
                            x: (hallway.x + exit.x) * 32,
                            y: (hallway.y + exit.y) * 32,
                            exitDir: exit.dir,
                            roomId: hallway.id,
                            open: false,
                            hp: doorType.hp
                        });
                    }
                }
            }
        }
    };

    // ===== PHASE 2: PUZZLE ROOMS =====
    const PuzzleSystem = {
        PUZZLE_TYPES: {
            LEVER_SEQUENCE: {
                id: 'lever_sequence',
                name: 'Lever Sequence',
                description: 'Pull levers in the correct order',
                difficulty: 2
            },
            FLOOR_TILES: {
                id: 'floor_tiles',
                name: 'Pressure Plates',
                description: 'Step on all plates to unlock',
                difficulty: 1
            },
            STATUE_FACING: {
                id: 'statue_facing',
                name: 'Statue Puzzle',
                description: 'Face all statues the same direction',
                difficulty: 3
            },
            MEMORY_SEQUENCE: {
                id: 'memory_sequence',
                name: 'Memory Puzzle',
                description: 'Remember and repeat the pattern',
                difficulty: 4
            },
            LIGHT_BEAM: {
                id: 'light_beam',
                name: 'Light Beam',
                description: 'Redirect light to the target',
                difficulty: 5
            }
        },

        // Generate puzzle room
        generatePuzzleRoom(puzzleType, seed) {
            const rng = WFC.createRNG(seed);
            const puzzle = { ...puzzleType, seed, solved: false, state: {} };

            switch (puzzleType.id) {
                case 'lever_sequence':
                    puzzle.state = this.generateLeverSequence(rng);
                    break;
                case 'floor_tiles':
                    puzzle.state = this.generateFloorTiles(rng);
                    break;
                case 'statue_facing':
                    puzzle.state = this.generateStatuePuzzle(rng);
                    break;
                case 'memory_sequence':
                    puzzle.state = this.generateMemorySequence(rng);
                    break;
                case 'light_beam':
                    puzzle.state = this.generateLightBeam(rng);
                    break;
            }

            return puzzle;
        },

        generateLeverSequence(rng) {
            const numLevers = 3 + Math.floor(rng.next() * 3);
            const sequence = [];
            for (let i = 0; i < numLevers; i++) {
                sequence.push(rng.next() < 0.5); // true = up, false = down
            }
            return {
                levers: sequence,
                current: new Array(numLevers).fill(false),
                attempts: 0
            };
        },

        generateFloorTiles(rng) {
            const gridSize = 2 + Math.floor(rng.next() * 2);
            const tiles = [];
            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < gridSize; x++) {
                    tiles.push({ x, y, pressed: false });
                }
            }
            return {
                tiles,
                gridSize,
                solution: tiles.map(t => true), // All must be pressed
                resetTimer: 0
            };
        },

        generateStatuePuzzle(rng) {
            const numStatues = 4;
            const directions = ['north', 'south', 'east', 'west'];
            const target = directions[Math.floor(rng.next() * 4)];
            const statues = [];
            for (let i = 0; i < numStatues; i++) {
                statues.push({
                    id: i,
                    facing: directions[Math.floor(rng.next() * 4)]
                });
            }
            return { statues, target };
        },

        generateMemorySequence(rng) {
            const length = 3 + Math.floor(rng.next() * 4);
            const sequence = [];
            const positions = ['nw', 'ne', 'sw', 'se'];
            for (let i = 0; i < length; i++) {
                sequence.push(positions[Math.floor(rng.next() * 4)]);
            }
            return {
                sequence,
                playerIndex: 0,
                showing: true,
                timer: 0
            };
        },

        generateLightBeam(rng) {
            return {
                source: { x: 0, y: 3, direction: 'east' },
                target: { x: 10, y: 3 },
                mirrors: [],
                beamPath: []
            };
        },

        // Check if puzzle is solved
        checkSolved(puzzle) {
            switch (puzzle.id) {
                case 'lever_sequence':
                    return JSON.stringify(puzzle.state.levers) === JSON.stringify(puzzle.state.current);
                case 'floor_tiles':
                    return puzzle.state.tiles.every(t => t.pressed);
                case 'statue_facing':
                    return puzzle.state.statues.every(s => s.facing === puzzle.state.target);
                case 'memory_sequence':
                    return puzzle.solved; // Set externally when player completes
                case 'light_beam':
                    return puzzle.solved; // Set externally when beam reaches target
            }
            return false;
        },

        // Place puzzle rooms in dungeon
        placePuzzles(levelData, difficulty) {
            const rng = WFC.createRNG(levelData.seed + 700);

            // Chance for puzzle room based on difficulty
            const puzzleChance = Math.min(0.5, 0.1 + difficulty * 0.05);

            if (rng.next() < puzzleChance) {
                // Find a suitable room for puzzle
                const puzzleRoom = levelData.rooms.find(r =>
                    r.type === 'chamber' || r.type === 'trap'
                );

                if (puzzleRoom) {
                    const availablePuzzles = Object.values(this.PUZZLE_TYPES)
                        .filter(p => p.difficulty <= difficulty + 1);

                    const puzzleType = availablePuzzles[Math.floor(rng.next() * availablePuzzles.length)];
                    const puzzle = this.generatePuzzleRoom(puzzleType, levelData.seed + puzzleRoom.id);

                    levelData.entities.puzzles = levelData.entities.puzzles || [];
                    levelData.entities.puzzles.push({
                        ...puzzle,
                        roomId: puzzleRoom.id,
                        reward: {
                            type: rng.next() < 0.5 ? 'health' : 'sanity',
                            amount: 25
                        }
                    });

                    puzzleRoom.hasPuzzle = true;
                    puzzleRoom.puzzleType = puzzleType.id;
                }
            }
        }
    };

    // ===== PHASE 2: ENVIRONMENTAL HAZARDS =====
    const HazardSystem = {
        HAZARD_TYPES: {
            SPIKE_TRAP: { id: 'spike_trap', damage: 20, type: 'physical', trigger: 'step' },
            PITFALL: { id: 'pitfall', damage: 30, type: 'fall', trigger: 'step' },
            FIRE_GRATE: { id: 'fire_grate', damage: 15, type: 'fire', trigger: 'proximity' },
            POISON_GAS: { id: 'poison_gas', damage: 5, type: 'poison', trigger: 'area' },
            COLLAPSING_FLOOR: { id: 'collapsing_floor', damage: 40, type: 'fall', trigger: 'delayed' },
            SWINGING_BLADE: { id: 'swinging_blade', damage: 35, type: 'physical', trigger: 'timed' },
            ELECTRIC_FIELD: { id: 'electric_field', damage: 25, type: 'electric', trigger: 'area' },
            ICE_PATCH: { id: 'ice_patch', damage: 0, type: 'movement', trigger: 'step' }
        },

        // Place hazards in dungeon
        placeHazards(levelData, difficulty) {
            const rng = WFC.createRNG(levelData.seed + 300);
            const hazardDensity = Math.min(0.4, difficulty * 0.04);

            // Place floor hazards
            const floorTiles = levelData.tiles.filter(t => t.type === 'floor' && !t.corridor);

            for (const tile of floorTiles) {
                if (rng.next() < hazardDensity) {
                    const hazardType = this.selectHazardType(difficulty, rng);
                    const hazard = {
                        ...hazardType,
                        x: tile.x,
                        y: tile.y,
                        roomId: tile.roomId,
                        active: true,
                        timer: 0
                    };

                    levelData.entities.hazards = levelData.entities.hazards || [];
                    levelData.entities.hazards.push(hazard);

                    // Mark tile as hazardous
                    tile.hazard = hazardType.id;
                }
            }

            // Add some area hazards to rooms
            const rooms = levelData.rooms.filter(r => r.type === 'chamber' || r.type === 'hallway');
            for (const room of rooms) {
                if (rng.next() < 0.2) {
                    // Area hazard (gas cloud, electric field)
                    const areaHazard = {
                        ...this.HAZARD_TYPES.POISON_GAS,
                        x: (room.x + room.width / 2) * 32,
                        y: (room.y + room.height / 2) * 32,
                        radius: room.width * 16,
                        roomId: room.id,
                        active: true
                    };

                    levelData.entities.hazards.push(areaHazard);
                }
            }
        },

        selectHazardType(difficulty, rng) {
            const available = Object.values(this.HAZARD_TYPES).filter(h =>
                h.type === 'physical' || h.type === 'fall' ||
                (difficulty >= 3 && h.type === 'fire') ||
                (difficulty >= 5 && h.type === 'poison') ||
                (difficulty >= 7 && h.type === 'electric')
            );

            return available[Math.floor(rng.next() * available.length)];
        },

        // Check if player is in hazard area
        checkHazardExposure(player, hazards, dt) {
            const damage = [];

            for (const hazard of hazards) {
                if (!hazard.active) continue;

                const dx = player.x - hazard.x;
                const dy = player.y - hazard.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                switch (hazard.trigger) {
                    case 'step':
                        if (dist < 16) {
                            damage.push({ amount: hazard.damage, type: hazard.type });
                        }
                        break;

                    case 'proximity':
                        if (dist < 40) {
                            damage.push({ amount: hazard.damage, type: hazard.type });
                        }
                        break;

                    case 'area':
                        if (dist < hazard.radius) {
                            damage.push({ amount: hazard.damage * dt, type: hazard.type });
                        }
                        break;

                    case 'timed':
                        hazard.timer += dt;
                        if (hazard.timer % 3 < dt && dist < 32) {
                            damage.push({ amount: hazard.damage, type: hazard.type });
                        }
                        break;

                    case 'delayed':
                        if (dist < 16) {
                            hazard.timer += dt;
                            if (hazard.timer > 1.0) {
                                hazard.active = false; // Collapsed
                                damage.push({ amount: hazard.damage, type: hazard.type });
                            }
                        }
                        break;
                }
            }

            return damage;
        },

        // Update hazards (animated elements)
        updateHazards(hazards, dt, time) {
            for (const hazard of hazards) {
                if (hazard.type === 'swinging_blade') {
                    hazard.swingPhase = time * 2;
                }

                if (hazard.type === 'fire_grate') {
                    hazard.flicker = Math.sin(time * 10) * 0.3 + 0.7;
                }

                if (hazard.type === 'poison_gas' || hazard.type === 'electric_field') {
                    hazard.pulse = Math.sin(time * 3) * 0.2 + 0.8;
                }
            }
        }
    };

    // ===== PHASE 2: PREFAB ROOM TEMPLATES =====
    const PrefabRoomSystem = {
        // Additional themed room templates
        PREFAB_TEMPLATES: {
            // Shrine rooms
            SHRINE_HEALTH: {
                width: 10, height: 8,
                layout: [
                    '##########',
                    '#........#',
                    '#...####.#',
                    '#...#H.#.#',
                    '#...####.#',
                    '#........#',
                    '#........#',
                    '##########'
                ],
                exits: [{ x: 0, y: 5, dir: 'w' }, { x: 9, y: 5, dir: 'e' }],
                type: 'shrine',
                shrineType: 'health'
            },
            SHRINE_SANITY: {
                width: 10, height: 8,
                layout: [
                    '##########',
                    '#........#',
                    '#...####.#',
                    '#...#S.#.#',
                    '#...####.#',
                    '#........#',
                    '#........#',
                    '##########'
                ],
                exits: [{ x: 0, y: 5, dir: 'w' }, { x: 9, y: 5, dir: 'e' }],
                type: 'shrine',
                shrineType: 'sanity'
            },

            // Arena rooms
            ARENA_SMALL: {
                width: 12, height: 10,
                layout: [
                    '############',
                    '#..........#',
                    '#.########.#',
                    '#.#......#.#',
                    '#.#......#.#',
                    '#.#......#.#',
                    '#.#......#.#',
                    '#.########.#',
                    '#..........#',
                    '############'
                ],
                exits: [
                    { x: 0, y: 4, dir: 'w' },
                    { x: 11, y: 4, dir: 'e' },
                    { x: 6, y: 0, dir: 'n' },
                    { x: 6, y: 9, dir: 's' }
                ],
                type: 'arena'
            },

            // Library room
            LIBRARY: {
                width: 14, height: 10,
                layout: [
                    '##############',
                    '#............#',
                    '#.###....###.#',
                    '#.#B#....#B#.#',
                    '#.#..........#',
                    '#.#..........#',
                    '#.#B#....#B#.#',
                    '#.###....###.#',
                    '#............#',
                    '##############'
                ],
                exits: [{ x: 0, y: 4, dir: 'w' }, { x: 13, y: 4, dir: 'e' }],
                type: 'library'
            },

            // Garden room
            GARDEN: {
                width: 12, height: 10,
                layout: [
                    '############',
                    '#..........#',
                    '#.~......~.#',
                    '#.~.####.~.#',
                    '#..........#',
                    '#..........#',
                    '#.~.####.~.#',
                    '#.~......~.#',
                    '#..........#',
                    '############'
                ],
                exits: [
                    { x: 0, y: 4, dir: 'w' },
                    { x: 11, y: 4, dir: 'e' }
                ],
                type: 'garden'
            },

            // Throne room
            THRONE: {
                width: 16, height: 12,
                layout: [
                    '################',
                    '#..............#',
                    '#.####....####.#',
                    '#.#T#......#T#.#',
                    '#.####....####.#',
                    '#..............#',
                    '#..............#',
                    '#......BB......#',
                    '#......BB......#',
                    '#.####....####.#',
                    '#..............#',
                    '################'
                ],
                exits: [{ x: 8, y: 11, dir: 's' }],
                type: 'throne'
            },

            // Bridge room
            BRIDGE: {
                width: 16, height: 8,
                layout: [
                    '################',
                    '#####......#####',
                    '####..........####',
                    '###............###',
                    '###............###',
                    '####..........####',
                    '#####......#####',
                    '################'
                ],
                exits: [
                    { x: 0, y: 3, dir: 'w' },
                    { x: 15, y: 3, dir: 'e' }
                ],
                type: 'bridge'
            },

            // Crypt room
            CRYPT: {
                width: 12, height: 10,
                layout: [
                    '############',
                    '#..........#',
                    '#.C......C.#',
                    '#.C......C.#',
                    '#.C......C.#',
                    '#.C......C.#',
                    '#.C......C.#',
                    '#.C......C.#',
                    '#..........#',
                    '############'
                ],
                exits: [{ x: 0, y: 4, dir: 'w' }, { x: 11, y: 4, dir: 'e' }],
                type: 'crypt'
            },

            // Maze room (mini puzzle)
            MAZE_SMALL: {
                width: 10, height: 10,
                layout: [
                    '##########',
                    '#S.#.....#',
                    '#.##.###.#',
                    '#....#.#.#',
                    '####.#.#.#',
                    '#....#...#',
                    '#.######.#',
                    '#......E.#',
                    '#.######.#',
                    '##########'
                ],
                exits: [{ x: 0, y: 1, dir: 'w' }],
                type: 'maze'
            }
        },

        // Add prefab rooms to available templates
        integratePrefabs() {
            for (const [name, template] of Object.entries(this.PREFAB_TEMPLATES)) {
                RoomGenerator.ROOM_TEMPLATES[name] = template;
            }
        },

        // Select prefab based on theme
        selectPrefabForTheme(theme, rng) {
            const themedPrefabs = {
                dungeon: ['ARENA_SMALL', 'CRYPT', 'THRONE'],
                sewers: ['BRIDGE', 'GARDEN'],
                catacombs: ['CRYPT', 'LIBRARY', 'SHRINE_HEALTH'],
                mirror: ['MAZE_SMALL', 'LIBRARY'],
                flesh: ['GARDEN', 'ARENA_SMALL'],
                clockwork: ['BRIDGE', 'THRONE'],
                void: ['MAZE_SMALL', 'SHRINE_SANITY'],
                memory: ['LIBRARY', 'THRONE'],
                core: ['ARENA_SMALL', 'THRONE', 'MAZE_SMALL']
            };

            const options = themedPrefabs[theme] || ['ARENA_SMALL'];
            const prefabName = options[Math.floor(rng.next() * options.length)];

            return this.PREFAB_TEMPLATES[prefabName];
        }
    };

    // ===== PHASE 2: MAIN CONTROLLER =====
    const Phase2Core = {
        initialized: false,
        currentDungeon: null,
        multiLevelDungeon: null,
        playerInventory: null,

        init() {
            if (this.initialized) return;

            WFC.initializeCompatibility();
            PrefabRoomSystem.integratePrefabs();
            this.playerInventory = KeyDoorSystem.initInventory();
            console.log('Phase 2: Procedural Dungeon Generation initialized');
            console.log('Phase 2: Advanced features loaded (Multi-level, Keys/Doors, Puzzles, Hazards, Prefabs)');
            this.initialized = true;
        },

        generateLevel(levelNumber, playerStats = {}, config = {}) {
            if (!this.initialized) this.init();

            // Calculate difficulty
            const difficulty = DifficultySystem.calculateDifficulty(playerStats, levelNumber);

            // Determine world theme based on level
            const themes = ['dungeon', 'sewers', 'catacombs', 'mirror', 'prison', 'flesh', 'clockwork', 'void', 'memory', 'core'];
            const themeIndex = Math.min(themes.length - 1, Math.floor((levelNumber - 1) / 10));

            // Generate multi-level dungeon for levels 5+
            const useMultiLevel = levelNumber >= 5 && config.multiLevel !== false;

            if (useMultiLevel) {
                this.multiLevelDungeon = MultiLevelSystem.generateMultiLevel(levelNumber, {
                    minRooms: config.minRooms || 5 + Math.floor(levelNumber / 5),
                    maxRooms: config.maxRooms || 8 + Math.floor(levelNumber / 4),
                    worldTheme: config.theme || themes[themeIndex],
                    difficulty: config.difficulty || difficulty.level,
                    seed: config.seed || Date.now() + levelNumber
                });

                // Use first level for now (player can traverse to others)
                const dungeon = this.multiLevelDungeon.levels[0];
                this.currentDungeon = dungeon;

                // Place entities with new systems
                this.placeAllEntities(dungeon, difficulty, themes[themeIndex]);

                return {
                    tiles: dungeon.tiles,
                    entities: dungeon.entities,
                    spawn: this.findSpawnPoint(dungeon),
                    exit: this.findExitPoint(dungeon),
                    secrets: dungeon.entities.secrets,
                    keys: dungeon.entities.keys,
                    doors: dungeon.entities.doors,
                    puzzles: dungeon.entities.puzzles,
                    hazards: dungeon.entities.hazards,
                    stairs: dungeon.entities.stairsDown || dungeon.entities.stairsUp,
                    seed: SeedSystem.encodeSeed(dungeon),
                    difficulty: difficulty,
                    bounds: dungeon.bounds,
                    multiLevel: this.multiLevelDungeon
                };
            }

            // Generate single-level dungeon
            const dungeon = RoomGenerator.generateDungeon({
                minRooms: config.minRooms || 5 + Math.floor(levelNumber / 5),
                maxRooms: config.maxRooms || 10 + Math.floor(levelNumber / 3),
                worldTheme: config.theme || themes[themeIndex],
                difficulty: config.difficulty || difficulty.level,
                seed: config.seed || Date.now() + levelNumber
            });

            this.currentDungeon = dungeon;

            // Place all entities including new systems
            this.placeAllEntities(dungeon, difficulty, themes[themeIndex]);

            // Apply difficulty adjustments
            dungeon.entities.monsters = DifficultySystem.adjustMonsters(
                dungeon.entities.monsters,
                difficulty
            );
            dungeon.entities.items = DifficultySystem.adjustResources(
                dungeon.entities.items,
                difficulty
            );

            return {
                tiles: dungeon.tiles,
                entities: dungeon.entities,
                spawn: this.findSpawnPoint(dungeon),
                exit: this.findExitPoint(dungeon),
                secrets: dungeon.entities.secrets,
                keys: dungeon.entities.keys,
                doors: dungeon.entities.doors,
                puzzles: dungeon.entities.puzzles,
                hazards: dungeon.entities.hazards,
                stairs: dungeon.entities.stairsDown || dungeon.entities.stairsUp,
                seed: SeedSystem.encodeSeed(dungeon),
                difficulty: difficulty,
                bounds: dungeon.bounds
            };
        },

        // Place all entities including new systems
        placeAllEntities(dungeon, difficulty, theme) {
            // Original entity placement
            RoomGenerator.placeEntities(dungeon, WFC.createRNG(dungeon.seed + 100));

            // Place keys and locked doors
            KeyDoorSystem.placeKeysAndDoors(dungeon, difficulty);

            // Place puzzles
            PuzzleSystem.placePuzzles(dungeon, difficulty);

            // Place hazards
            HazardSystem.placeHazards(dungeon, difficulty);
        },

        findSpawnPoint(dungeon) {
            const startRoom = dungeon.rooms.find(r => r.type === 'start');
            if (startRoom) {
                return {
                    x: (startRoom.x + startRoom.width / 2) * 32,
                    y: (startRoom.y + startRoom.height / 2) * 32
                };
            }
            return { x: 100, y: 100 };
        },

        findExitPoint(dungeon) {
            const endRoom = dungeon.rooms.find(r => r.type === 'end' || r.type === 'boss');
            if (endRoom) {
                return {
                    x: (endRoom.x + endRoom.width / 2) * 32,
                    y: (endRoom.y + endRoom.height / 2) * 32
                };
            }
            return { x: dungeon.width - 100, y: dungeon.height - 100 };
        },

        getRoomAt(x, y) {
            if (!this.currentDungeon) return null;
            
            const gridX = Math.floor(x / 32);
            const gridY = Math.floor(y / 32);
            
            return this.currentDungeon.rooms.find(r => 
                gridX >= r.x && gridX < r.x + r.width &&
                gridY >= r.y && gridY < r.y + r.height
            );
        },

        isInSecretArea(x, y) {
            const room = this.getRoomAt(x, y);
            return room && room.isSecret;
        },

        revealSecret(x, y) {
            const secret = this.currentDungeon.entities.secrets.find(s => 
                Math.abs(s.x - x) < 50 && Math.abs(s.y - y) < 50
            );
            
            if (secret && secret.type === 'hidden_door') {
                const tile = this.currentDungeon.tiles.find(t => 
                    t.x === secret.x && t.y === secret.y
                );
                if (tile) {
                    tile.type = 'door_open';
                    tile.secret = false;
                    return true;
                }
            }
            
            return false;
        },

        // Generate from shared seed
        generateFromSeed(seedString) {
            return SeedSystem.generateFromSeed(seedString);
        },

        // Get current dungeon info
        getCurrentDungeon() {
            return this.currentDungeon;
        },

        // ===== NEW SYSTEMS INTEGRATION =====

        // Multi-level dungeon methods
        changeLevel(newLevelIndex) {
            if (!this.multiLevelDungeon) return null;

            if (newLevelIndex < 0 || newLevelIndex >= this.multiLevelDungeon.totalLevels) {
                return null;
            }

            this.multiLevelDungeon.currentLevel = newLevelIndex;
            return this.multiLevelDungeon.levels[newLevelIndex];
        },

        getCurrentLevel() {
            return this.multiLevelDungeon ? this.multiLevelDungeon.currentLevel : 0;
        },

        getTotalLevels() {
            return this.multiLevelDungeon ? this.multiLevelDungeon.totalLevels : 1;
        },

        checkStairUsage(player) {
            if (!this.currentDungeon) return null;
            return MultiLevelSystem.checkStairUsage(player, this.currentDungeon);
        },

        // Key/Door system methods
        addKey(keyTypeId) {
            const keyType = Object.values(KeyDoorSystem.KEY_TYPES).find(k => k.id === keyTypeId);
            if (keyType) {
                return KeyDoorSystem.addKey(this.playerInventory, keyType);
            }
            return false;
        },

        canOpenDoor(doorTypeId) {
            const doorType = Object.values(KeyDoorSystem.DOOR_TYPES).find(d => d.id === doorTypeId);
            return doorType ? KeyDoorSystem.canOpenDoor(this.playerInventory, doorType) : false;
        },

        useKey(doorTypeId) {
            const doorType = Object.values(KeyDoorSystem.DOOR_TYPES).find(d => d.id === doorTypeId);
            return doorType ? KeyDoorSystem.useKey(this.playerInventory, doorType) : false;
        },

        getInventory() {
            return this.playerInventory;
        },

        // Puzzle system methods
        interactWithPuzzle(puzzleId, interactionData) {
            if (!this.currentDungeon || !this.currentDungeon.entities.puzzles) return false;

            const puzzle = this.currentDungeon.entities.puzzles.find(p => p.id === puzzleId);
            if (!puzzle) return false;

            // Handle different puzzle interactions
            switch (puzzle.id) {
                case 'lever_sequence':
                    puzzle.state.current[interactionData.leverIndex] = interactionData.value;
                    return PuzzleSystem.checkSolved(puzzle);
                case 'floor_tiles':
                    const tile = puzzle.state.tiles.find(t =>
                        t.x === interactionData.x && t.y === interactionData.y
                    );
                    if (tile) {
                        tile.pressed = true;
                        return PuzzleSystem.checkSolved(puzzle);
                    }
                    return false;
                case 'statue_facing':
                    const statue = puzzle.state.statues.find(s => s.id === interactionData.statueId);
                    if (statue) {
                        const directions = ['north', 'south', 'east', 'west'];
                        const currentIndex = directions.indexOf(statue.facing);
                        statue.facing = directions[(currentIndex + 1) % 4];
                        return PuzzleSystem.checkSolved(puzzle);
                    }
                    return false;
            }
            return false;
        },

        // Hazard system methods
        checkHazardDamage(player, dt) {
            if (!this.currentDungeon || !this.currentDungeon.entities.hazards) return [];

            const hazards = this.currentDungeon.entities.hazards;
            return HazardSystem.checkHazardExposure(player, hazards, dt);
        },

        updateHazards(dt, time) {
            if (!this.currentDungeon || !this.currentDungeon.entities.hazards) return;
            HazardSystem.updateHazards(this.currentDungeon.entities.hazards, dt, time);
        },

        // Get all system data for save/load
        getSystemData() {
            return {
                multiLevel: this.multiLevelDungeon,
                inventory: this.playerInventory,
                currentDungeon: this.currentDungeon
            };
        },

        // Load system data
        loadSystemData(data) {
            if (data.multiLevel) this.multiLevelDungeon = data.multiLevel;
            if (data.inventory) this.playerInventory = data.inventory;
            if (data.currentDungeon) this.currentDungeon = data.currentDungeon;
        }
    };

    // Export Phase 2 systems
    window.Phase2Core = Phase2Core;
    window.WFC = WFC;
    window.RoomGenerator = RoomGenerator;
    window.DifficultySystem = DifficultySystem;
    window.SeedSystem = SeedSystem;
    window.MultiLevelSystem = MultiLevelSystem;
    window.KeyDoorSystem = KeyDoorSystem;
    window.PuzzleSystem = PuzzleSystem;
    window.HazardSystem = HazardSystem;
    window.PrefabRoomSystem = PrefabRoomSystem;
})();
