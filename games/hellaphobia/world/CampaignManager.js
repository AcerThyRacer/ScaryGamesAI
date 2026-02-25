/* ============================================================
   HELLAPHOBIA - PHASE 5: 100-LEVEL CAMPAIGN SYSTEM
   10 Themed Worlds | Progressive Difficulty | Story Arcs
   World Bosses | Secret Levels | Multiple Endings
   ============================================================ */

(function() {
    'use strict';

    // ===== WORLD DEFINITIONS =====
    const WORLDS = [
        {
            id: 0,
            name: "The Entrance",
            subtitle: "Dungeon Threshold",
            levels: 10,
            color: "#1a0a10",
            difficulty: 1,
            theme: "tutorial",
            tileset: "stone_brick",
            music: "ambient_entrance",
            description: "The beginning of your nightmare...",
            boss: null,
            unlockRequirement: null
        },
        {
            id: 1,
            name: "Blood Sewers",
            subtitle: "Crimson Tunnels",
            levels: 10,
            difficulty: 2,
            color: "#200508",
            theme: "sewers",
            tileset: "blood_stone",
            music: "dark_corridors",
            description: "The blood flows eternally...",
            boss: { name: "The Warden", hp: 500, phase: 1 },
            unlockRequirement: { world: 0, completed: true }
        },
        {
            id: 2,
            name: "Bone Catacombs",
            subtitle: "Restless Dead",
            levels: 10,
            difficulty: 3,
            color: "#151008",
            theme: "catacombs",
            tileset: "bone_walls",
            music: "undead_chant",
            description: "The dead do not rest...",
            boss: { name: "Bone Collector", hp: 700, phase: 1 },
            unlockRequirement: { world: 1, completed: true }
        },
        {
            id: 3,
            name: "Mirror Maze",
            subtitle: "Reflections Lie",
            levels: 10,
            difficulty: 4,
            color: "#0a0a15",
            theme: "mirror",
            tileset: "crystal_glass",
            music: "shattered_reflection",
            description: "Which one is real?",
            boss: { name: "Mirror Self", hp: 800, phase: 2 },
            unlockRequirement: { world: 2, completed: true }
        },
        {
            id: 4,
            name: "Flesh Gardens",
            subtitle: "Living Walls",
            levels: 10,
            difficulty: 5,
            color: "#200810",
            theme: "organic",
            tileset: "flesh_texture",
            music: "living_nightmare",
            description: "The walls breathe...",
            boss: { name: "Flesh Weaver", hp: 900, phase: 2 },
            unlockRequirement: { world: 3, completed: true }
        },
        {
            id: 5,
            name: "Clockwork Hell",
            subtitle: "Eternal Machinery",
            levels: 10,
            difficulty: 6,
            color: "#181005",
            theme: "mechanical",
            tileset: "metal_gears",
            music: "industrial_horror",
            description: "Time grinds endlessly...",
            boss: { name: "Clockwork Tyrant", hp: 1100, phase: 3 },
            unlockRequirement: { world: 4, completed: true }
        },
        {
            id: 6,
            name: "Void Corridors",
            subtitle: "Nothingness",
            levels: 10,
            difficulty: 7,
            color: "#050510",
            theme: "void",
            tileset: "dark_energy",
            music: "cosmic_dread",
            description: "The void stares back...",
            boss: { name: "Void Walker", hp: 1300, phase: 3 },
            unlockRequirement: { world: 5, completed: true }
        },
        {
            id: 7,
            name: "Memory Hall",
            subtitle: "Your Past",
            levels: 10,
            difficulty: 8,
            color: "#100818",
            theme: "memory",
            tileset: "nostalgic",
            music: "forgotten_memories",
            description: "Remember what you did...",
            boss: { name: "Memory Keeper", hp: 1500, phase: 4 },
            unlockRequirement: { world: 6, completed: true }
        },
        {
            id: 8,
            name: "Reality Fracture",
            subtitle: "Breaking Down",
            levels: 10,
            difficulty: 9,
            color: "#150a20",
            theme: "glitch",
            tileset: "reality_tear",
            music: "chaos_unraveling",
            description: "Nothing is real...",
            boss: { name: "Reality Breaker", hp: 1800, phase: 4 },
            unlockRequirement: { world: 7, completed: true }
        },
        {
            id: 9,
            name: "Hellaphobia Core",
            subtitle: "FINAL BOSS",
            levels: 10,
            difficulty: 10,
            color: "#000000",
            theme: "core",
            tileset: "nightmare_fuel",
            music: "final_confrontation",
            description: "The truth awaits...",
            boss: { name: "Hellaphobia", hp: 3000, phase: 5 },
            unlockRequirement: { world: 8, completed: true }
        }
    ];

    // ===== LEVEL TEMPLATES =====
    const LEVEL_TEMPLATES = {
        standard: {
            length: 2000,
            rooms: 8,
            enemies: 12,
            secrets: 2,
            traps: 5
        },
        combat: {
            length: 1500,
            rooms: 6,
            enemies: 20,
            secrets: 1,
            traps: 3
        },
        exploration: {
            length: 3000,
            rooms: 12,
            enemies: 8,
            secrets: 5,
            traps: 2
        },
        puzzle: {
            length: 1800,
            rooms: 10,
            enemies: 5,
            secrets: 3,
            traps: 8
        },
        boss: {
            length: 1000,
            rooms: 3,
            enemies: 0,
            secrets: 0,
            traps: 0,
            bossArena: true
        },
        secret: {
            length: 800,
            rooms: 4,
            enemies: 15,
            secrets: 1,
            traps: 10,
            hidden: true
        }
    };

    // ===== CAMPAIGN MANAGER =====
    const CampaignManager = {
        currentWorld: 0,
        currentLevel: 0,
        unlockedWorlds: [0],
        completedLevels: new Set(),
        playerStats: {
            totalDeaths: 0,
            totalTime: 0,
            monstersKilled: 0,
            secretsFound: 0,
            achievements: []
        },
        
        init() {
            this.loadProgress();
            console.log('Phase 5: 100-Level Campaign System initialized');
            console.log(` - ${WORLDS.length} worlds defined`);
            console.log(` - ${this.getTotalLevels()} total levels`);
            console.log(` - Unlocked worlds: ${this.unlockedWorlds.length}`);
        },
        
        getTotalLevels() {
            return WORLDS.reduce((sum, w) => sum + w.levels, 0);
        },
        
        // Get current level info
        getCurrentLevelInfo() {
            const world = WORLDS[this.currentWorld];
            if (!world) return null;
            
            return {
                worldId: this.currentWorld,
                worldName: world.name,
                levelId: this.currentLevel,
                levelNumber: this.currentWorld * 10 + this.currentLevel + 1,
                template: this.getLevelTemplate(this.currentLevel),
                difficulty: world.difficulty + (this.currentLevel / 10),
                theme: world.theme,
                isBoss: this.currentLevel === 9,
                isSecret: false
            };
        },
        
        // Get level template based on position
        getLevelTemplate(levelIndex) {
            if (levelIndex === 9) return 'boss';
            if (levelIndex === 0) return 'standard';
            
            const rand = Math.random();
            if (rand < 0.4) return 'standard';
            if (rand < 0.6) return 'combat';
            if (rand < 0.8) return 'exploration';
            if (rand < 0.9) return 'puzzle';
            return 'secret';
        },
        
        // Generate level data
        generateLevel(worldId, levelId, seed = null) {
            const world = WORLDS[worldId];
            const template = LEVEL_TEMPLATES[this.getLevelTemplate(levelId)];
            const difficulty = world.difficulty + (levelId / 10);
            
            if (!seed) seed = Date.now() + worldId * 1000 + levelId;
            
            const rng = this.createRNG(seed);
            
            return {
                worldId,
                levelId,
                seed,
                template: template,
                difficulty,
                theme: world.theme,
                color: world.color,
                tileset: world.tileset,
                music: world.music,
                entities: this.generateEntities(template, difficulty, rng),
                layout: this.generateLayout(template, rng),
                objectives: this.generateObjectives(template, worldId, levelId)
            };
        },
        
        createRNG(seed) {
            let s = seed;
            return {
                next() {
                    s = (s * 1664525 + 1013904223) % 4294967296;
                    return s / 4294967296;
                },
                range(min, max) {
                    return min + this.next() * (max - min);
                },
                choice(array) {
                    return array[Math.floor(this.next() * array.length)];
                }
            };
        },
        
        generateEntities(template, difficulty, rng) {
            const entities = {
                monsters: [],
                items: [],
                traps: [],
                secrets: []
            };
            
            // Generate monsters
            for (let i = 0; i < template.enemies; i++) {
                entities.monsters.push({
                    x: rng.range(100, 2000),
                    y: rng.range(100, 600),
                    type: this.selectMonsterType(difficulty, rng),
                    level: Math.floor(difficulty),
                    aggression: rng.range(0.5, 1.5)
                });
            }
            
            // Generate items
            const itemCount = Math.floor(rng.range(3, 8));
            for (let i = 0; i < itemCount; i++) {
                entities.items.push({
                    x: rng.range(100, 2000),
                    y: rng.range(100, 600),
                    type: rng.choice(['health', 'sanity', 'ammo', 'key']),
                    value: rng.range(10, 50)
                });
            }
            
            // Generate traps
            for (let i = 0; i < template.traps; i++) {
                entities.traps.push({
                    x: rng.range(100, 2000),
                    y: rng.range(100, 600),
                    type: rng.choice(['spike', 'falling', 'poison', 'trigger']),
                    damage: rng.range(10, 30) * difficulty
                });
            }
            
            // Generate secrets
            for (let i = 0; i < template.secrets; i++) {
                entities.secrets.push({
                    x: rng.range(100, 2000),
                    y: rng.range(100, 600),
                    type: rng.choice(['hidden_room', 'treasure', 'lore', 'upgrade']),
                    revealed: false
                });
            }
            
            return entities;
        },
        
        selectMonsterType(difficulty, rng) {
            const types = ['crawler', 'floater', 'chaser', 'wailer', 'stalker', 'mimic'];
            const weights = [30, 25, 20, 15, 10, 5].map(w => w * difficulty);
            
            const total = weights.reduce((a, b) => a + b, 0);
            let random = rng.next() * total;
            
            for (let i = 0; i < types.length; i++) {
                random -= weights[i];
                if (random <= 0) return types[i];
            }
            
            return types[0];
        },
        
        generateLayout(template, rng) {
            // Simple procedural layout generation
            const rooms = [];
            const roomCount = template.rooms;
            
            let currentX = 0;
            let currentY = 0;
            
            for (let i = 0; i < roomCount; i++) {
                const room = {
                    id: i,
                    x: currentX,
                    y: currentY,
                    width: rng.range(200, 400),
                    height: rng.range(150, 300),
                    type: i === 0 ? 'start' : i === roomCount - 1 ? 'exit' : 'normal',
                    connections: []
                };
                
                rooms.push(room);
                
                // Move to next room position
                const direction = rng.choice(['right', 'down', 'right-down']);
                if (direction === 'right') {
                    currentX += room.width + rng.range(50, 100);
                } else if (direction === 'down') {
                    currentY += room.height + rng.range(50, 100);
                } else {
                    currentX += room.width + rng.range(50, 100);
                    currentY += rng.range(50, 100);
                }
            }
            
            // Create connections between adjacent rooms
            for (let i = 0; i < rooms.length - 1; i++) {
                rooms[i].connections.push(i + 1);
                rooms[i + 1].connections.push(i);
            }
            
            return {
                rooms,
                width: currentX + 400,
                height: currentY + 300,
                spawnPoint: { x: rooms[0].x + 50, y: rooms[0].y + rooms[0].height / 2 },
                exitPoint: { x: rooms[rooms.length - 1].x + rooms[rooms.length - 1].width - 50, y: rooms[rooms.length - 1].y + rooms[rooms.length - 1].height / 2 }
            };
        },
        
        generateObjectives(template, worldId, levelId) {
            const objectives = [];
            
            if (template.bossArena) {
                objectives.push({
                    type: 'defeat_boss',
                    description: `Defeat ${WORLDS[worldId].boss.name}`,
                    completed: false
                });
            } else {
                objectives.push({
                    type: 'reach_exit',
                    description: 'Find the exit',
                    completed: false
                });
                
                // Optional objectives
                if (Math.random() < 0.5) {
                    objectives.push({
                        type: 'find_secrets',
                        description: 'Find all secrets',
                        count: template.secrets,
                        completed: false
                    });
                }
                
                if (Math.random() < 0.3) {
                    objectives.push({
                        type: 'survival',
                        description: 'Survive for 2 minutes',
                        time: 120,
                        completed: false
                    });
                }
            }
            
            return objectives;
        },
        
        // Progress tracking
        completeLevel(worldId, levelId, stats) {
            const key = `${worldId}-${levelId}`;
            this.completedLevels.add(key);
            
            // Update player stats
            this.playerStats.totalDeaths += stats.deaths || 0;
            this.playerStats.totalTime += stats.time || 0;
            this.playerStats.monstersKilled += stats.kills || 0;
            this.playerStats.secretsFound += stats.secrets || 0;
            
            // Check if world boss defeated
            if (levelId === 9 && WORLDS[worldId].boss) {
                this.unlockNextWorld(worldId);
            }
            
            // Save progress
            this.saveProgress();
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('levelComplete', {
                detail: { worldId, levelId, stats }
            }));
        },
        
        unlockNextWorld(worldId) {
            const nextWorld = worldId + 1;
            if (nextWorld < WORLDS.length && !this.unlockedWorlds.includes(nextWorld)) {
                this.unlockedWorlds.push(nextWorld);
                this.saveProgress();
                
                window.dispatchEvent(new CustomEvent('worldUnlocked', {
                    detail: { worldId: nextWorld, name: WORLDS[nextWorld].name }
                }));
            }
        },
        
        isLevelCompleted(worldId, levelId) {
            return this.completedLevels.has(`${worldId}-${levelId}`);
        },
        
        isWorldUnlocked(worldId) {
            return this.unlockedWorlds.includes(worldId);
        },
        
        // Save/Load system
        saveProgress() {
            const data = {
                unlockedWorlds: this.unlockedWorlds,
                completedLevels: Array.from(this.completedLevels),
                playerStats: this.playerStats,
                savedAt: Date.now()
            };
            localStorage.setItem('hellaphobia_campaign', JSON.stringify(data));
        },
        
        loadProgress() {
            const saved = localStorage.getItem('hellaphobia_campaign');
            if (saved) {
                const data = JSON.parse(saved);
                this.unlockedWorlds = data.unlockedWorlds || [0];
                this.completedLevels = new Set(data.completedLevels || []);
                this.playerStats = { ...this.playerStats, ...data.playerStats };
            }
        },
        
        // Get campaign statistics
        getStatistics() {
            const totalLevels = this.getTotalLevels();
            const completedCount = this.completedLevels.size;
            
            return {
                totalLevels,
                completedLevels: completedCount,
                completionPercentage: ((completedCount / totalLevels) * 100).toFixed(1),
                unlockedWorlds: this.unlockedWorlds.length,
                totalWorlds: WORLDS.length,
                playerStats: this.playerStats
            };
        },
        
        // Reset progress (for New Game+)
        resetProgress(fullReset = false) {
            if (fullReset) {
                this.unlockedWorlds = [0];
                this.completedLevels.clear();
                this.playerStats = {
                    totalDeaths: 0,
                    totalTime: 0,
                    monstersKilled: 0,
                    secretsFound: 0,
                    achievements: []
                };
                localStorage.removeItem('hellaphobia_campaign');
            } else {
                // Keep achievements and stats, reset progression
                this.unlockedWorlds = [0];
                this.completedLevels.clear();
            }
        },
        
        exportAPI() {
            return {
                init: () => this.init(),
                getCurrentLevelInfo: () => this.getCurrentLevelInfo(),
                generateLevel: (worldId, levelId, seed) => this.generateLevel(worldId, levelId, seed),
                completeLevel: (worldId, levelId, stats) => this.completeLevel(worldId, levelId, stats),
                isLevelCompleted: (worldId, levelId) => this.isLevelCompleted(worldId, levelId),
                isWorldUnlocked: (worldId) => this.isWorldUnlocked(worldId),
                getStatistics: () => this.getStatistics(),
                resetProgress: (full) => this.resetProgress(full),
                getTotalLevels: () => this.getTotalLevels(),
                getWorlds: () => WORLDS
            };
        }
    };
    
    // Export to window
    window.CampaignManager = CampaignManager.exportAPI();
    
    console.log('Phase 5: 100-Level Campaign System loaded');
})();
