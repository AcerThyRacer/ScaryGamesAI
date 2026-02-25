/* ============================================
   CURSED ARCADE — FULL IMPLEMENTATION
   Retro Horror Arcade Game
   Collect tokens, avoid ghosts, escape the machine
   ============================================ */
(function () {
    'use strict';

    // ============================================
    // GAME CONFIGURATION & CONSTANTS
    // ============================================
    const CONFIG = {
        TILE_SIZE: 30,
        MAZE_WIDTH: 21,
        MAZE_HEIGHT: 15,
        MAX_LEVELS: 10,
        BASE_LIVES: 3,
        MAX_LIVES: 5,
        POWER_UP_DURATION: 8000,
        SPRINT_COST: 35,
        SPRINT_REGEN: 20,
        GHOST_RESPAWN_TIME: 3000,
        PARTICLE_LIFETIME: 1000,
        SCREEN_SHAKE_DURATION: 300,
        CURSED_EVENT_CHANCE: 0.001,
        BOSS_LEVEL_INTERVAL: 3
    };

    // ============================================
    // GAME STATE
    // ============================================
    const state = {
        canvas: null,
        ctx: null,
        gameActive: false,
        gamePaused: false,
        animationId: null,
        lastTime: 0,
        gameContainer: null,
        
        // Game progression
        difficulty: 'normal',
        level: 1,
        lives: 3,
        score: 0,
        tokensCollected: 0,
        totalTokens: 0,
        highScore: parseInt(localStorage.getItem('cursedArcade_highScore') || '0'),
        
        // Grid
        gridOffsetX: 0,
        gridOffsetY: 0,
        
        // Screen effects
        screenShake: 0,
        screenShakeIntensity: 0,
        glitchEffect: 0,
        vignetteIntensity: 0,
        
        // Cursed events
        cursedEventActive: false,
        cursedEventTimer: 0,
        cursedEventType: null,
        
        // Boss battle
        bossActive: false,
        bossHealth: 100,
        bossMaxHealth: 100,
        
        // Combo system
        combo: 0,
        comboTimer: 0,
        comboMultiplier: 1
    };

    // ============================================
    // PLAYER
    // ============================================
    const player = {
        x: 0, y: 0,
        gridX: 1, gridY: 1,
        dirX: 0, dirY: 0,
        nextDirX: 0, nextDirY: 0,
        speed: 4,
        sprintSpeed: 8,
        isSprinting: false,
        sprintEnergy: 100,
        color: '#00ff88',
        radius: 10,
        invulnerable: false,
        invulnerableTimer: 0,
        powerUpActive: false,
        powerUpTimer: 0,
        animationFrame: 0
    };

    // ============================================
    // GHOSTS
    // ============================================
    const GHOST_TYPES = {
        BLINKY: { name: 'Blinky', color: '#ff4444', speedMod: 1.0, ai: 'chase' },
        PINKY: { name: 'Pinky', color: '#ff88cc', speedMod: 0.95, ai: 'ambush' },
        INKY: { name: 'Inky', color: '#00ffff', speedMod: 0.9, ai: 'flank' },
        CLYDE: { name: 'Clyde', color: '#ffaa00', speedMod: 0.85, ai: 'random' },
        SHADOW: { name: 'Shadow', color: '#440044', speedMod: 1.2, ai: 'chase' },
        SPECTER: { name: 'Specter', color: '#ffffff', speedMod: 1.3, ai: 'predict' }
    };

    let ghosts = [];
    let ghostSpawnQueue = [];

    // ============================================
    // MAZE & COLLECTIBLES
    // ============================================
    let maze = [];
    let tokens = [];
    let powerUps = [];
    let portals = [];
    let traps = [];

    // ============================================
    // PARTICLES & EFFECTS
    // ============================================
    let particles = [];
    let floatingTexts = [];
    let lightningBolts = [];

    // ============================================
    // INPUT
    // ============================================
    const keys = {};
    let touchStartX = 0;
    let touchStartY = 0;

    // ============================================
    // DIFFICULTY SETTINGS
    // ============================================
    const difficultySettings = {
        easy: { ghostSpeed: 1.5, ghostCount: 2, ghostSpawnDelay: 5000, tokenValue: 10 },
        normal: { ghostSpeed: 2, ghostCount: 3, ghostSpawnDelay: 4000, tokenValue: 10 },
        hard: { ghostSpeed: 2.8, ghostCount: 4, ghostSpawnDelay: 2500, tokenValue: 15 },
        nightmare: { ghostSpeed: 3.8, ghostCount: 5, ghostSpawnDelay: 1500, tokenValue: 20 }
    };

    // ============================================
    // POWER-UP TYPES
    // ============================================
    const POWER_UPS = {
        POWER: { color: '#ff00ff', icon: '⚡', duration: 8000, name: 'Power Pellet' },
        SPEED: { color: '#00ffff', icon: '»', duration: 5000, name: 'Speed Boost' },
        SHIELD: { color: '#ffff00', icon: '◆', duration: 6000, name: 'Shield' },
        GHOST_FREEZE: { color: '#8888ff', icon: '❄', duration: 4000, name: 'Ghost Freeze' },
        EXTRA_LIFE: { color: '#ff0000', icon: '♥', duration: 0, name: 'Extra Life' },
        SCORE_MULTIPLIER: { color: '#ffaa00', icon: '×2', duration: 10000, name: '2x Score' }
    };

    // ============================================
    // CURSED EVENTS
    // ============================================
    const CURSED_EVENTS = {
        STATIC: { name: 'Static Storm', duration: 5000 },
        INVERSION: { name: 'Inverted Controls', duration: 8000 },
        DARKNESS: { name: 'Eternal Darkness', duration: 6000 },
        HALLUCINATION: { name: 'Ghost Hallucinations', duration: 7000 },
        TIME_WARP: { name: 'Time Warp', duration: 5000 },
        GLITCH: { name: 'Reality Glitch', duration: 4000 }
    };

    // ============================================
    // MAZE TEMPLATES (1=wall, 0=empty, 2=token, 3=power-up, 4=portal, 5=trap)
    // ============================================
    const mazeTemplates = [
        // Level 1 - Classic
        [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,1,2,1,1,2,1,2,1,1,1,2,1,1,1,1,2,1],
            [1,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,1],
            [1,2,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,2,1,2,1],
            [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1,2,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,2,1,2,1],
            [1,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,1],
            [1,2,1,1,1,2,1,1,2,1,2,1,1,2,1,1,1,2,1,2,1],
            [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,1,2,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        // Level 2 - Spiral
        [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1],
            [1,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,1],
            [1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1],
            [1,2,1,2,1,2,2,2,2,2,2,2,2,2,2,2,1,2,1,2,1],
            [1,2,1,2,1,2,1,1,1,1,1,1,1,1,1,2,1,2,1,2,1],
            [1,2,1,2,1,2,1,2,2,2,2,2,2,2,1,2,1,2,1,2,1],
            [1,2,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,2,1],
            [1,2,1,2,1,2,1,2,2,2,2,2,2,2,1,2,1,2,1,2,1],
            [1,2,1,2,1,2,1,1,1,1,1,1,1,1,1,2,1,2,1,2,1],
            [1,2,1,2,1,2,2,2,2,2,2,2,2,2,2,2,1,2,1,2,1],
            [1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1],
            [1,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        // Level 3 - Cross
        [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,1,2,1],
            [1,2,1,2,2,2,2,2,1,2,2,2,1,2,2,2,2,2,1,2,1],
            [1,2,1,2,1,1,1,2,1,1,1,1,1,2,1,1,1,2,1,2,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,2,1,1,1,2,1,1,1,1,1,2,1,1,1,2,1,2,1],
            [1,2,1,2,2,2,2,2,1,2,2,2,1,2,2,2,2,2,1,2,1],
            [1,2,1,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,1,2,1],
            [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        // Level 4 - Maze
        [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,2,2,2,1,2,2,2,2,2,2,2,2,2,2,2,1,2,2,2,1],
            [1,2,1,2,1,2,1,1,1,1,1,1,1,1,1,2,1,2,1,2,1],
            [1,2,1,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,1,2,1],
            [1,2,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,2,1],
            [1,2,2,2,2,2,2,2,1,2,2,2,1,2,2,2,2,2,2,2,1],
            [1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1],
            [1,2,2,2,2,2,2,2,1,2,2,2,1,2,2,2,2,2,2,2,1],
            [1,2,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,2,1],
            [1,2,1,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,1,2,1],
            [1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        // Level 5 - Boss Arena
        [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1],
            [1,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,1],
            [1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1],
            [1,2,1,2,1,2,2,2,2,2,2,2,2,2,2,2,1,2,1,2,1],
            [1,2,1,2,1,2,1,1,1,1,1,1,1,1,1,2,1,2,1,2,1],
            [1,2,1,2,1,2,1,2,2,2,2,2,2,2,1,2,1,2,1,2,1],
            [1,2,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,2,1],
            [1,2,1,2,1,2,1,2,2,2,2,2,2,2,1,2,1,2,1,2,1],
            [1,2,1,2,1,2,1,1,1,1,1,1,1,1,1,2,1,2,1,2,1],
            [1,2,1,2,1,2,2,2,2,2,2,2,2,2,2,2,1,2,1,2,1],
            [1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1],
            [1,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ]
    ];

    // ============================================
    // AUDIO SYSTEM
    // ============================================
    const AudioSystem = {
        ctx: null,
        enabled: true,
        
        init() {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                this.enabled = false;
            }
        },
        
        playTone(freq, duration, type = 'sine', volume = 0.3) {
            if (!this.enabled || !this.ctx) return;
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        },
        
        playCollect() {
            this.playTone(880, 0.1, 'sine', 0.2);
            setTimeout(() => this.playTone(1760, 0.15, 'sine', 0.2), 50);
        },
        
        playPowerUp() {
            this.playTone(440, 0.1, 'square', 0.3);
            setTimeout(() => this.playTone(660, 0.1, 'square', 0.3), 100);
            setTimeout(() => this.playTone(880, 0.3, 'square', 0.3), 200);
        },
        
        playGhostEat() {
            this.playTone(200, 0.1, 'sawtooth', 0.4);
            setTimeout(() => this.playTone(150, 0.2, 'sawtooth', 0.4), 100);
        },
        
        playDeath() {
            this.playTone(440, 0.3, 'sawtooth', 0.4);
            setTimeout(() => this.playTone(330, 0.3, 'sawtooth', 0.4), 300);
            setTimeout(() => this.playTone(220, 0.5, 'sawtooth', 0.4), 600);
        },
        
        playLevelComplete() {
            this.playTone(523, 0.2, 'square', 0.3);
            setTimeout(() => this.playTone(659, 0.2, 'square', 0.3), 200);
            setTimeout(() => this.playTone(784, 0.2, 'square', 0.3), 400);
            setTimeout(() => this.playTone(1047, 0.6, 'square', 0.3), 600);
        },
        
        playCursedEvent() {
            this.playTone(100, 0.5, 'sawtooth', 0.3);
            setTimeout(() => this.playTone(80, 0.5, 'sawtooth', 0.3), 200);
            setTimeout(() => this.playTone(60, 1, 'sawtooth', 0.3), 400);
        },
        
        playBossHit() {
            this.playTone(150, 0.1, 'square', 0.5);
            this.playTone(100, 0.2, 'sawtooth', 0.4);
        }
    };

    // ============================================
    // PARTICLE SYSTEM
    // ============================================
    function createParticle(x, y, color, type = 'normal') {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color,
            life: CONFIG.PARTICLE_LIFETIME,
            maxLife: CONFIG.PARTICLE_LIFETIME,
            size: Math.random() * 4 + 2,
            type
        });
    }

    function createExplosion(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            createParticle(x, y, color, 'explosion');
        }
    }

    function createFloatingText(x, y, text, color = '#fff') {
        floatingTexts.push({
            x, y,
            text,
            color,
            life: 1500,
            vy: -1
        });
    }

    // ============================================
    // SCREEN EFFECTS
    // ============================================
    function triggerScreenShake(intensity = 10, duration = CONFIG.SCREEN_SHAKE_DURATION) {
        state.screenShake = duration;
        state.screenShakeIntensity = intensity;
    }

    function triggerGlitchEffect() {
        state.glitchEffect = 500;
    }

    function applyScreenShake() {
        if (state.screenShake > 0) {
            const intensity = state.screenShakeIntensity * (state.screenShake / CONFIG.SCREEN_SHAKE_DURATION);
            const dx = (Math.random() - 0.5) * intensity;
            const dy = (Math.random() - 0.5) * intensity;
            state.ctx.save();
            state.ctx.translate(dx, dy);
            state.screenShake -= 16;
        }
    }

    function restoreScreenShake() {
        if (state.screenShake > 0) {
            state.ctx.restore();
        }
    }

    // ============================================
    // CURSED EVENTS
    // ============================================
    function triggerCursedEvent() {
        if (state.cursedEventActive) return;
        
        const eventTypes = Object.keys(CURSED_EVENTS);
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const event = CURSED_EVENTS[eventType];
        
        state.cursedEventActive = true;
        state.cursedEventType = eventType;
        state.cursedEventTimer = event.duration;
        
        AudioSystem.playCursedEvent();
        triggerScreenShake(15, 500);
        createFloatingText(state.canvas.width / 2, state.canvas.height / 2, event.name, '#ff0000');
        
        // Apply event effects
        switch (eventType) {
            case 'INVERSION':
                // Handled in input processing
                break;
            case 'DARKNESS':
                state.vignetteIntensity = 0.8;
                break;
            case 'HALLUCINATION':
                spawnHallucinationGhosts();
                break;
            case 'TIME_WARP':
                // Slow down player
                player.speed *= 0.5;
                break;
            case 'GLITCH':
                triggerGlitchEffect();
                break;
        }
    }

    function updateCursedEvents(dt) {
        if (!state.cursedEventActive) {
            // Random chance to trigger
            if (Math.random() < CONFIG.CURSED_EVENT_CHANCE) {
                triggerCursedEvent();
            }
            return;
        }
        
        state.cursedEventTimer -= dt * 1000;
        
        if (state.cursedEventTimer <= 0) {
            endCursedEvent();
        }
    }

    function endCursedEvent() {
        state.cursedEventActive = false;
        
        // Restore effects
        switch (state.cursedEventType) {
            case 'DARKNESS':
                state.vignetteIntensity = 0;
                break;
            case 'TIME_WARP':
                player.speed = 4;
                break;
            case 'HALLUCINATION':
                // Remove hallucination ghosts
                ghosts = ghosts.filter(g => !g.isHallucination);
                break;
        }
        
        state.cursedEventType = null;
    }

    function spawnHallucinationGhosts() {
        for (let i = 0; i < 3; i++) {
            const spawnX = Math.floor(Math.random() * (CONFIG.MAZE_WIDTH - 2)) + 1;
            const spawnY = Math.floor(Math.random() * (CONFIG.MAZE_HEIGHT - 2)) + 1;
            
            if (maze[spawnY][spawnX] === 0) {
                ghosts.push({
                    gridX: spawnX, gridY: spawnY,
                    x: state.gridOffsetX + spawnX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                    y: state.gridOffsetY + spawnY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                    dirX: 0, dirY: 0,
                    speed: difficultySettings[state.difficulty].ghostSpeed * 0.5,
                    color: '#444444',
                    name: 'Hallucination',
                    state: 'chase',
                    isHallucination: true,
                    frightenedTimer: 0
                });
            }
        }
    }

    // ============================================
    // BOSS SYSTEM
    // ============================================
    function isBossLevel() {
        return state.level % CONFIG.BOSS_LEVEL_INTERVAL === 0 && state.level > 0;
    }

    function initBossBattle() {
        state.bossActive = true;
        state.bossHealth = 100 + (state.level * 20);
        state.bossMaxHealth = state.bossHealth;
        
        // Spawn boss ghost
        const bossGhost = {
            gridX: Math.floor(CONFIG.MAZE_WIDTH / 2),
            gridY: Math.floor(CONFIG.MAZE_HEIGHT / 2),
            x: state.gridOffsetX + Math.floor(CONFIG.MAZE_WIDTH / 2) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
            y: state.gridOffsetY + Math.floor(CONFIG.MAZE_HEIGHT / 2) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
            dirX: 0, dirY: 0,
            speed: difficultySettings[state.difficulty].ghostSpeed * 0.8,
            color: '#ff0000',
            name: 'Arcade Demon',
            state: 'chase',
            isBoss: true,
            size: 25,
            frightenedTimer: 0,
            attackPattern: 0,
            attackTimer: 0
        };
        
        ghosts = [bossGhost];
        createFloatingText(state.canvas.width / 2, state.canvas.height / 3, 'BOSS BATTLE!', '#ff0000');
    }

    function updateBoss(dt) {
        if (!state.bossActive) return;
        
        const boss = ghosts.find(g => g.isBoss);
        if (!boss) return;
        
        boss.attackTimer += dt * 1000;
        
        // Boss attack patterns
        if (boss.attackTimer > 3000) {
            boss.attackPattern = (boss.attackPattern + 1) % 3;
            boss.attackTimer = 0;
            
            switch (boss.attackPattern) {
                case 0: // Charge attack
                    createFloatingText(boss.x, boss.y - 30, 'CHARGE!', '#ff8800');
                    boss.speed *= 2;
                    setTimeout(() => boss.speed /= 2, 2000);
                    break;
                case 1: // Spawn minions
                    createFloatingText(boss.x, boss.y - 30, 'SUMMON!', '#8800ff');
                    spawnGhostMinions();
                    break;
                case 2: // Screen shake
                    createFloatingText(boss.x, boss.y - 30, 'TREMBLE!', '#ff0000');
                    triggerScreenShake(20, 2000);
                    break;
            }
        }
    }

    function spawnGhostMinions() {
        const settings = difficultySettings[state.difficulty];
        for (let i = 0; i < 2; i++) {
            const spawnPoints = [
                { x: 1, y: 1 },
                { x: CONFIG.MAZE_WIDTH - 2, y: 1 },
                { x: 1, y: CONFIG.MAZE_HEIGHT - 2 },
                { x: CONFIG.MAZE_WIDTH - 2, y: CONFIG.MAZE_HEIGHT - 2 }
            ];
            const spawn = spawnPoints[i % spawnPoints.length];
            
            ghosts.push({
                gridX: spawn.x, gridY: spawn.y,
                x: state.gridOffsetX + spawn.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                y: state.gridOffsetY + spawn.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                dirX: 0, dirY: 0,
                speed: settings.ghostSpeed * 0.7,
                color: '#666666',
                name: 'Minion',
                state: 'chase',
                isMinion: true,
                frightenedTimer: 0
            });
        }
    }

    function damageBoss(amount = 10) {
        state.bossHealth -= amount;
        AudioSystem.playBossHit();
        triggerScreenShake(5, 200);
        
        if (state.bossHealth <= 0) {
            defeatBoss();
        }
    }

    function defeatBoss() {
        createExplosion(state.canvas.width / 2, state.canvas.height / 2, '#ff0000', 50);
        state.bossActive = false;
        state.score += 1000;
        createFloatingText(state.canvas.width / 2, state.canvas.height / 2, '+1000', '#ffd700');
        
        // Clear remaining minions
        ghosts = [];
        
        // Auto-complete level
        setTimeout(() => nextLevel(), 2000);
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        state.canvas = document.getElementById('game-canvas');
        state.ctx = state.canvas.getContext('2d');
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Setup input
        setupInput();
        
        // Setup UI
        setupUI();
        
        // Initialize audio
        AudioSystem.init();
        
        // Initialize Game Container
        initGameContainer();
        
        // Setup mobile controls
        setupMobileControls();
    }

    function setupInput() {
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        
        // Touch controls
        state.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        state.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        state.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    function setupUI() {
        document.getElementById('start-btn').addEventListener('click', startGame);
        document.getElementById('gameover-retry-btn').addEventListener('click', restartGame);
        document.getElementById('win-retry-btn').addEventListener('click', restartGame);
        
        document.getElementById('difficulty-select').addEventListener('change', function(e) {
            state.difficulty = e.target.value;
        });
    }

    function initGameContainer() {
        if (typeof GameContainer === 'undefined') return;
        
        state.gameContainer = new GameContainer({
            gameId: 'cursed-arcade',
            gameName: 'Cursed Arcade',
            canvas: state.canvas,
            container: document.body
        });
        
        state.gameContainer.onRestart = () => restartGame();
        state.gameContainer.onExit = () => window.location.href = '/games.html';
        state.gameContainer.onSettingsChange = (settings) => {
            if (settings.gameplay?.difficulty) {
                state.difficulty = settings.gameplay.difficulty;
            }
        };
    }

    function resizeCanvas() {
        state.canvas.width = window.innerWidth;
        state.canvas.height = window.innerHeight;
        
        state.gridOffsetX = (state.canvas.width - CONFIG.MAZE_WIDTH * CONFIG.TILE_SIZE) / 2;
        state.gridOffsetY = (state.canvas.height - CONFIG.MAZE_HEIGHT * CONFIG.TILE_SIZE) / 2;
    }

    // ============================================
    // INPUT HANDLING
    // ============================================
    function handleKeyDown(e) {
        keys[e.code] = true;
        
        if (!state.gameActive || state.gamePaused) return;
        
        let dirX = 0, dirY = 0;
        
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                dirY = -1;
                break;
            case 'KeyS':
            case 'ArrowDown':
                dirY = 1;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                dirX = -1;
                break;
            case 'KeyD':
            case 'ArrowRight':
                dirX = 1;
                break;
            case 'Space':
                player.isSprinting = true;
                return;
            case 'Escape':
                togglePause();
                return;
        }
        
        // Apply inversion curse
        if (state.cursedEventType === 'INVERSION') {
            dirX *= -1;
            dirY *= -1;
        }
        
        if (dirX !== 0 || dirY !== 0) {
            player.nextDirX = dirX;
            player.nextDirY = dirY;
        }
    }

    function handleKeyUp(e) {
        keys[e.code] = false;
        if (e.code === 'Space') {
            player.isSprinting = false;
        }
    }

    function handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (!state.gameActive || state.gamePaused) return;
        
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const threshold = 30;
        
        if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
            let dirX = 0, dirY = 0;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                dirX = dx > 0 ? 1 : -1;
            } else {
                dirY = dy > 0 ? 1 : -1;
            }
            
            // Apply inversion curse
            if (state.cursedEventType === 'INVERSION') {
                dirX *= -1;
                dirY *= -1;
            }
            
            player.nextDirX = dirX;
            player.nextDirY = dirY;
            
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }
    }

    function handleTouchEnd(e) {
        e.preventDefault();
    }

    function togglePause() {
        state.gamePaused = !state.gamePaused;
        if (state.gamePaused) {
            if (state.gameContainer) state.gameContainer.pause();
        } else {
            if (state.gameContainer) state.gameContainer.resume();
            state.lastTime = performance.now();
            gameLoop();
        }
    }

    // ============================================
    // MOBILE CONTROLS
    // ============================================
    function setupMobileControls() {
        // Check if mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile && typeof MobileGameControls !== 'undefined') {
            MobileGameControls.init({
                gameId: 'cursed-arcade',
                dpad: true,
                actionButtons: [
                    { id: 'sprint', label: 'SPRINT', key: 'Space' }
                ]
            });
        }
    }

    // ============================================
    // LEVEL LOADING
    // ============================================
    function loadLevel(levelNum) {
        const templateIndex = (levelNum - 1) % mazeTemplates.length;
        const template = mazeTemplates[templateIndex];
        
        maze = [];
        tokens = [];
        powerUps = [];
        portals = [];
        traps = [];
        state.totalTokens = 0;
        state.tokensCollected = 0;
        
        // Parse template
        for (let y = 0; y < CONFIG.MAZE_HEIGHT; y++) {
            maze[y] = [];
            for (let x = 0; x < CONFIG.MAZE_WIDTH; x++) {
                const cell = template[y]?.[x] || 0;
                maze[y][x] = cell === 1 ? 1 : 0;
                
                switch (cell) {
                    case 2:
                        tokens.push({ x, y, collected: false, value: difficultySettings[state.difficulty].tokenValue });
                        state.totalTokens++;
                        break;
                    case 3:
                        // Random power-up
                        const powerTypes = Object.keys(POWER_UPS);
                        const powerType = powerTypes[Math.floor(Math.random() * powerTypes.length)];
                        powerUps.push({ x, y, collected: false, type: powerType });
                        break;
                    case 4:
                        portals.push({ x, y, targetX: CONFIG.MAZE_WIDTH - 1 - x, targetY: CONFIG.MAZE_HEIGHT - 1 - y });
                        break;
                    case 5:
                        traps.push({ x, y, active: true });
                        break;
                }
            }
        }
        
        // Reset player
        resetPlayer();
        
        // Check for boss level
        if (isBossLevel()) {
            initBossBattle();
        } else {
            spawnGhosts();
        }
    }

    function resetPlayer() {
        player.gridX = 1;
        player.gridY = 1;
        player.x = state.gridOffsetX + player.gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        player.y = state.gridOffsetY + player.gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        player.dirX = 0;
        player.dirY = 0;
        player.nextDirX = 0;
        player.nextDirY = 0;
        player.sprintEnergy = 100;
        player.powerUpActive = false;
        player.invulnerable = false;
    }

    function spawnGhosts() {
        ghosts = [];
        const settings = difficultySettings[state.difficulty];
        const ghostCount = Math.min(settings.ghostCount + Math.floor((state.level - 1) / 2), 6);
        
        const ghostTypes = Object.keys(GHOST_TYPES);
        const spawnPoints = [
            { x: CONFIG.MAZE_WIDTH - 2, y: 1 },
            { x: CONFIG.MAZE_WIDTH - 2, y: CONFIG.MAZE_HEIGHT - 2 },
            { x: 1, y: CONFIG.MAZE_HEIGHT - 2 },
            { x: Math.floor(CONFIG.MAZE_WIDTH / 2), y: Math.floor(CONFIG.MAZE_HEIGHT / 2) },
            { x: Math.floor(CONFIG.MAZE_WIDTH / 2), y: 1 },
            { x: Math.floor(CONFIG.MAZE_WIDTH / 2), y: CONFIG.MAZE_HEIGHT - 2 }
        ];
        
        for (let i = 0; i < ghostCount; i++) {
            const spawn = spawnPoints[i % spawnPoints.length];
            const typeKey = ghostTypes[i % ghostTypes.length];
            const type = GHOST_TYPES[typeKey];
            
            ghosts.push({
                gridX: spawn.x,
                gridY: spawn.y,
                x: state.gridOffsetX + spawn.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                y: state.gridOffsetY + spawn.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                dirX: 0,
                dirY: 0,
                speed: settings.ghostSpeed * type.speedMod + (state.level * 0.1),
                color: type.color,
                name: type.name,
                ai: type.ai,
                state: 'chase',
                frightenedTimer: 0,
                frozen: false
            });
        }
    }

    // ============================================
    // GAME FLOW
    // ============================================
    function startGame() {
        state.difficulty = document.getElementById('difficulty-select').value;
        
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('controls-overlay').style.display = 'flex';
        document.getElementById('scanline-effect').style.display = 'block';
        
        setTimeout(() => {
            document.getElementById('controls-overlay').style.display = 'none';
            document.getElementById('game-hud').style.display = 'flex';
            document.getElementById('back-link').style.display = 'none';
            
            state.level = 1;
            state.lives = CONFIG.BASE_LIVES;
            state.score = 0;
            state.combo = 0;
            state.comboMultiplier = 1;
            
            loadLevel(state.level);
            state.gameActive = true;
            state.gamePaused = false;
            
            if (state.gameContainer) state.gameContainer.start();
            
            state.lastTime = performance.now();
            gameLoop();
        }, 2500);
    }

    function restartGame() {
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        
        state.level = 1;
        state.lives = CONFIG.BASE_LIVES;
        state.score = 0;
        state.combo = 0;
        state.comboMultiplier = 1;
        state.bossActive = false;
        
        loadLevel(state.level);
        state.gameActive = true;
        state.gamePaused = false;
        
        state.lastTime = performance.now();
        gameLoop();
    }

    function nextLevel() {
        state.level++;
        
        if (state.level > CONFIG.MAX_LEVELS) {
            gameWin();
            return;
        }
        
        AudioSystem.playLevelComplete();
        createFloatingText(state.canvas.width / 2, state.canvas.height / 2, `LEVEL ${state.level}`, '#00ff88');
        
        loadLevel(state.level);
        
        state.gamePaused = true;
        setTimeout(() => {
            state.gamePaused = false;
            state.lastTime = performance.now();
            gameLoop();
        }, 1500);
    }

    // ============================================
    // UPDATE FUNCTIONS
    // ============================================
    function update(dt) {
        if (state.gamePaused) return;
        
        // Update cursed events
        updateCursedEvents(dt);
        
        // Update combo
        updateCombo(dt);
        
        // Update player
        updatePlayer(dt);
        
        // Update ghosts
        updateGhosts(dt);
        
        // Update boss
        updateBoss(dt);
        
        // Update particles
        updateParticles(dt);
        
        // Update floating texts
        updateFloatingTexts(dt);
        
        // Update power-ups
        updatePowerUps(dt);
        
        // Update HUD
        updateHUD();
    }

    function updatePlayer(dt) {
        // Sprint energy
        if (player.isSprinting && player.sprintEnergy > 0) {
            player.sprintEnergy -= dt * CONFIG.SPRINT_COST;
            if (player.sprintEnergy < 0) player.sprintEnergy = 0;
        } else if (!player.isSprinting && player.sprintEnergy < 100) {
            player.sprintEnergy += dt * CONFIG.SPRINT_REGEN;
            if (player.sprintEnergy > 100) player.sprintEnergy = 100;
        }
        
        // Power-up timer
        if (player.powerUpActive) {
            player.powerUpTimer -= dt * 1000;
            if (player.powerUpTimer <= 0) {
                player.powerUpActive = false;
            }
        }
        
        // Invulnerability
        if (player.invulnerable) {
            player.invulnerableTimer -= dt * 1000;
            if (player.invulnerableTimer <= 0) {
                player.invulnerable = false;
            }
        }
        
        // Try to change direction at center of tile
        const centerX = state.gridOffsetX + player.gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const centerY = state.gridOffsetY + player.gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const distToCenter = Math.abs(player.x - centerX) + Math.abs(player.y - centerY);
        
        if (distToCenter < 2 && (player.nextDirX !== 0 || player.nextDirY !== 0)) {
            const nextX = player.gridX + player.nextDirX;
            const nextY = player.gridY + player.nextDirY;
            
            if (canMoveTo(nextX, nextY)) {
                player.dirX = player.nextDirX;
                player.dirY = player.nextDirY;
            }
        }
        
        // Move player
        const currentSpeed = (player.isSprinting && player.sprintEnergy > 0) ? player.sprintSpeed : player.speed;
        const newX = player.x + player.dirX * currentSpeed * dt * 60;
        const newY = player.y + player.dirY * currentSpeed * dt * 60;
        
        const newGridX = Math.floor((newX - state.gridOffsetX) / CONFIG.TILE_SIZE);
        const newGridY = Math.floor((newY - state.gridOffsetY) / CONFIG.TILE_SIZE);
        
        if (canMoveTo(newGridX, newGridY)) {
            player.x = newX;
            player.y = newY;
            player.gridX = newGridX;
            player.gridY = newGridY;
        } else {
            player.x = centerX;
            player.y = centerY;
        }
        
        // Check portals
        checkPortals();
        
        // Check traps
        checkTraps();
        
        // Collect tokens
        collectTokens();
        
        // Collect power-ups
        collectPowerUps();
    }

    function canMoveTo(gridX, gridY) {
        return gridX >= 0 && gridX < CONFIG.MAZE_WIDTH && 
               gridY >= 0 && gridY < CONFIG.MAZE_HEIGHT && 
               maze[gridY][gridX] === 0;
    }

    function checkPortals() {
        for (const portal of portals) {
            if (player.gridX === portal.x && player.gridY === portal.y) {
                player.gridX = portal.targetX;
                player.gridY = portal.targetY;
                player.x = state.gridOffsetX + player.gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                player.y = state.gridOffsetY + player.gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                createFloatingText(player.x, player.y - 20, 'WARP!', '#8800ff');
                triggerScreenShake(5, 200);
                break;
            }
        }
    }

    function checkTraps() {
        for (const trap of traps) {
            if (trap.active && player.gridX === trap.x && player.gridY === trap.y && !player.invulnerable) {
                playerHit();
                trap.active = false;
                setTimeout(() => trap.active = true, 5000);
            }
        }
    }

    function collectTokens() {
        for (const token of tokens) {
            if (!token.collected) {
                const tokenX = state.gridOffsetX + token.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const tokenY = state.gridOffsetY + token.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const dist = Math.hypot(player.x - tokenX, player.y - tokenY);
                
                if (dist < CONFIG.TILE_SIZE / 2) {
                    token.collected = true;
                    state.tokensCollected++;
                    
                    // Combo system
                    state.combo++;
                    state.comboTimer = 2000;
                    state.comboMultiplier = 1 + Math.floor(state.combo / 5) * 0.5;
                    
                    const points = Math.floor(token.value * state.comboMultiplier);
                    state.score += points;
                    
                    AudioSystem.playCollect();
                    createExplosion(tokenX, tokenY, '#ffd700', 5);
                    createFloatingText(tokenX, tokenY - 15, `+${points}`, '#ffd700');
                    
                    if (state.gameContainer) state.gameContainer.addScore(points);
                }
            }
        }
        
        // Check level complete
        if (state.tokensCollected >= state.totalTokens && !state.bossActive) {
            nextLevel();
        }
    }

    function collectPowerUps() {
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const powerUp = powerUps[i];
            if (!powerUp.collected) {
                const powerX = state.gridOffsetX + powerUp.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const powerY = state.gridOffsetY + powerUp.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const dist = Math.hypot(player.x - powerX, player.y - powerY);
                
                if (dist < CONFIG.TILE_SIZE / 2) {
                    powerUp.collected = true;
                    applyPowerUp(powerUp.type);
                    powerUps.splice(i, 1);
                }
            }
        }
    }

    function applyPowerUp(type) {
        const powerUp = POWER_UPS[type];
        AudioSystem.playPowerUp();
        createFloatingText(player.x, player.y - 30, powerUp.name, powerUp.color);
        createExplosion(player.x, player.y, powerUp.color, 15);
        
        switch (type) {
            case 'POWER':
                player.powerUpActive = true;
                player.powerUpTimer = powerUp.duration;
                // Make ghosts frightened
                for (const ghost of ghosts) {
                    if (!ghost.isBoss) {
                        ghost.state = 'frightened';
                        ghost.frightenedTimer = powerUp.duration;
                    }
                }
                break;
            case 'SPEED':
                player.speed = 6;
                setTimeout(() => player.speed = 4, powerUp.duration);
                break;
            case 'SHIELD':
                player.invulnerable = true;
                player.invulnerableTimer = powerUp.duration;
                break;
            case 'GHOST_FREEZE':
                for (const ghost of ghosts) {
                    if (!ghost.isBoss) {
                        ghost.frozen = true;
                        setTimeout(() => ghost.frozen = false, powerUp.duration);
                    }
                }
                break;
            case 'EXTRA_LIFE':
                if (state.lives < CONFIG.MAX_LIVES) {
                    state.lives++;
                    createFloatingText(state.canvas.width / 2, state.canvas.height / 2, 'EXTRA LIFE!', '#ff0000');
                } else {
                    state.score += 500;
                    createFloatingText(player.x, player.y - 30, '+500', '#ffd700');
                }
                break;
            case 'SCORE_MULTIPLIER':
                state.comboMultiplier = 2;
                setTimeout(() => state.comboMultiplier = 1, powerUp.duration);
                break;
        }
    }

    function updateCombo(dt) {
        if (state.combo > 0) {
            state.comboTimer -= dt * 1000;
            if (state.comboTimer <= 0) {
                state.combo = 0;
                state.comboMultiplier = 1;
            }
        }
    }

    function updateGhosts(dt) {
        for (const ghost of ghosts) {
            if (ghost.frozen) continue;
            
            // Update frightened timer
            if (ghost.state === 'frightened') {
                ghost.frightenedTimer -= dt * 1000;
                if (ghost.frightenedTimer <= 0) {
                    ghost.state = 'chase';
                }
            }
            
            // AI movement
            const dirs = getValidDirections(ghost);
            
            if (dirs.length > 0) {
                let chosenDir;
                
                if (ghost.state === 'frightened') {
                    // Run away from player
                    chosenDir = dirs[Math.floor(Math.random() * dirs.length)];
                } else {
                    // Use AI based on ghost type
                    chosenDir = chooseDirectionWithAI(ghost, dirs);
                }
                
                ghost.dirX = chosenDir.x;
                ghost.dirY = chosenDir.y;
            }
            
            // Move ghost
            const speed = ghost.state === 'frightened' ? ghost.speed * 0.5 : ghost.speed;
            ghost.x += ghost.dirX * speed * dt * 60;
            ghost.y += ghost.dirY * speed * dt * 60;
            ghost.gridX = Math.floor((ghost.x - state.gridOffsetX) / CONFIG.TILE_SIZE);
            ghost.gridY = Math.floor((ghost.y - state.gridOffsetY) / CONFIG.TILE_SIZE);
            
            // Check collision with player
            const dist = Math.hypot(player.x - ghost.x, player.y - ghost.y);
            const collisionDist = ghost.isBoss ? ghost.size + player.radius : CONFIG.TILE_SIZE * 0.6;
            
            if (dist < collisionDist) {
                if (ghost.state === 'frightened' && !ghost.isBoss) {
                    // Eat ghost
                    eatGhost(ghost);
                } else if (!player.invulnerable) {
                    playerHit();
                }
            }
            
            // Boss collision with tokens (destroys them)
            if (ghost.isBoss) {
                for (const token of tokens) {
                    if (!token.collected) {
                        const tokenX = state.gridOffsetX + token.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                        const tokenY = state.gridOffsetY + token.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                        if (Math.hypot(ghost.x - tokenX, ghost.y - tokenY) < ghost.size) {
                            token.collected = true;
                            createFloatingText(tokenX, tokenY, 'EATEN!', '#ff0000');
                        }
                    }
                }
            }
        }
    }

    function getValidDirections(ghost) {
        const dirs = [];
        const possible = [
            { x: -1, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: -1 },
            { x: 0, y: 1 }
        ];
        
        for (const dir of possible) {
            const newX = ghost.gridX + dir.x;
            const newY = ghost.gridY + dir.y;
            
            if (canMoveTo(newX, newY) && !(dir.x === -ghost.dirX && dir.y === -ghost.dirY)) {
                dirs.push(dir);
            }
        }
        
        // Must reverse if no other option
        if (dirs.length === 0 && (ghost.dirX !== 0 || ghost.dirY !== 0)) {
            const reverseX = -ghost.dirX;
            const reverseY = -ghost.dirY;
            const reverseGridX = ghost.gridX + reverseX;
            const reverseGridY = ghost.gridY + reverseY;
            
            if (canMoveTo(reverseGridX, reverseGridY)) {
                dirs.push({ x: reverseX, y: reverseY });
            }
        }
        
        return dirs;
    }

    function chooseDirectionWithAI(ghost, dirs) {
        let targetX = player.gridX;
        let targetY = player.gridY;
        
        // Modify target based on AI type
        switch (ghost.ai) {
            case 'ambush':
                // Target ahead of player
                targetX += player.dirX * 4;
                targetY += player.dirY * 4;
                break;
            case 'flank':
                // Target opposite side
                targetX = CONFIG.MAZE_WIDTH - 1 - player.gridX;
                targetY = CONFIG.MAZE_HEIGHT - 1 - player.gridY;
                break;
            case 'random':
                // Random target
                if (Math.random() < 0.3) {
                    return dirs[Math.floor(Math.random() * dirs.length)];
                }
                break;
            case 'predict':
                // Predict player position
                targetX += player.dirX * 2;
                targetY += player.dirY * 2;
                break;
        }
        
        // Choose direction closest to target
        let bestDir = dirs[0];
        let bestDist = Infinity;
        
        for (const dir of dirs) {
            const newX = ghost.gridX + dir.x;
            const newY = ghost.gridY + dir.y;
            const dist = Math.abs(newX - targetX) + Math.abs(newY - targetY);
            
            if (dist < bestDist) {
                bestDist = dist;
                bestDir = dir;
            }
        }
        
        return bestDir;
    }

    function eatGhost(ghost) {
        const index = ghosts.indexOf(ghost);
        if (index > -1) {
            ghosts.splice(index, 1);
            
            const points = 200 * (state.combo + 1);
            state.score += points;
            
            AudioSystem.playGhostEat();
            createExplosion(ghost.x, ghost.y, ghost.color, 15);
            createFloatingText(ghost.x, ghost.y - 20, `+${points}`, '#fff');
            
            // Respawn ghost after delay
            setTimeout(() => {
                if (state.gameActive && !state.bossActive) {
                    const spawnPoints = [
                        { x: CONFIG.MAZE_WIDTH - 2, y: 1 },
                        { x: CONFIG.MAZE_WIDTH - 2, y: CONFIG.MAZE_HEIGHT - 2 },
                        { x: 1, y: CONFIG.MAZE_HEIGHT - 2 }
                    ];
                    const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
                    
                    ghosts.push({
                        gridX: spawn.x, gridY: spawn.y,
                        x: state.gridOffsetX + spawn.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                        y: state.gridOffsetY + spawn.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                        dirX: 0, dirY: 0,
                        speed: ghost.speed,
                        color: ghost.color,
                        name: ghost.name,
                        ai: ghost.ai,
                        state: 'chase',
                        frightenedTimer: 0,
                        frozen: false
                    });
                }
            }, CONFIG.GHOST_RESPAWN_TIME);
        }
    }

    function playerHit() {
        if (player.invulnerable) return;
        
        state.lives--;
        AudioSystem.playDeath();
        triggerScreenShake(15, 500);
        createExplosion(player.x, player.y, '#ff0000', 20);
        
        if (state.lives <= 0) {
            gameOver();
        } else {
            resetPlayer();
            spawnGhosts();
            
            player.invulnerable = true;
            player.invulnerableTimer = 2000;
            
            state.gamePaused = true;
            setTimeout(() => {
                state.gamePaused = false;
            }, 1000);
        }
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt * 1000;
            p.vy += 0.1; // Gravity
            
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function updateFloatingTexts(dt) {
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y += ft.vy;
            ft.life -= dt * 1000;
            
            if (ft.life <= 0) {
                floatingTexts.splice(i, 1);
            }
        }
    }

    function updatePowerUps(dt) {
        // Power-ups pulse animation
        for (const powerUp of powerUps) {
            if (!powerUp.collected) {
                powerUp.pulse = (Math.sin(Date.now() / 200) + 1) / 2;
            }
        }
    }

    function updateHUD() {
        document.getElementById('hud-score').textContent = `Tokens: ${state.tokensCollected} / ${state.totalTokens}`;
        document.getElementById('hud-lives').textContent = `Lives: ${state.lives}`;
        document.getElementById('hud-level').textContent = `Level: ${state.level}`;
        
        // Update score display
        const scoreEl = document.getElementById('hud-score-total');
        if (scoreEl) {
            scoreEl.textContent = `Score: ${state.score}`;
        }
        
        // Update high score display
        const highScoreEl = document.getElementById('hud-highscore');
        if (highScoreEl) {
            highScoreEl.textContent = `High: ${state.highScore}`;
        }
    }

    // ============================================
    // RENDERING
    // ============================================
    function draw() {
        const ctx = state.ctx;
        
        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
        
        // Apply screen shake
        applyScreenShake();
        
        // Draw background grid
        drawBackgroundGrid();
        
        // Draw maze
        drawMaze();
        
        // Draw portals
        drawPortals();
        
        // Draw traps
        drawTraps();
        
        // Draw tokens
        drawTokens();
        
        // Draw power-ups
        drawPowerUps();
        
        // Draw ghosts
        drawGhosts();
        
        // Draw player
        drawPlayer();
        
        // Draw particles
        drawParticles();
        
        // Draw floating texts
        drawFloatingTexts();
        
        // Draw boss health bar
        if (state.bossActive) {
            drawBossHealthBar();
        }
        
        // Draw combo
        if (state.combo > 1) {
            drawCombo();
        }
        
        // Draw cursed event overlay
        if (state.cursedEventActive) {
            drawCursedOverlay();
        }
        
        // Draw vignette
        drawVignette();
        
        // Draw glitch effect
        if (state.glitchEffect > 0) {
            drawGlitch();
            state.glitchEffect -= 16;
        }
        
        // Restore screen shake
        restoreScreenShake();
    }

    function drawBackgroundGrid() {
        const ctx = state.ctx;
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.03)';
        ctx.lineWidth = 1;
        
        const gridSize = 40;
        for (let x = 0; x < state.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, state.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < state.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(state.canvas.width, y);
            ctx.stroke();
        }
    }

    function drawMaze() {
        const ctx = state.ctx;
        
        for (let y = 0; y < CONFIG.MAZE_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAZE_WIDTH; x++) {
                const posX = state.gridOffsetX + x * CONFIG.TILE_SIZE;
                const posY = state.gridOffsetY + y * CONFIG.TILE_SIZE;
                
                if (maze[y][x] === 1) {
                    // Wall with gradient
                    const gradient = ctx.createLinearGradient(posX, posY, posX, posY + CONFIG.TILE_SIZE);
                    gradient.addColorStop(0, '#1a1a3e');
                    gradient.addColorStop(1, '#0a0a1e');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(posX, posY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                    
                    // Wall border
                    ctx.strokeStyle = '#2a2a5e';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(posX, posY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                    
                    // Wall highlight
                    ctx.fillStyle = '#2a2a5e';
                    ctx.fillRect(posX + 2, posY + 2, CONFIG.TILE_SIZE - 4, 2);
                    
                    // Occasional wall detail
                    if ((x + y) % 7 === 0) {
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                        ctx.fillRect(posX + 8, posY + 8, CONFIG.TILE_SIZE - 16, CONFIG.TILE_SIZE - 16);
                    }
                } else {
                    // Floor
                    ctx.fillStyle = '#0f0f1a';
                    ctx.fillRect(posX, posY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                    
                    // Subtle floor pattern
                    ctx.fillStyle = 'rgba(0, 255, 136, 0.02)';
                    ctx.fillRect(posX + 10, posY + 10, 2, 2);
                }
            }
        }
    }

    function drawPortals() {
        const ctx = state.ctx;
        
        for (const portal of portals) {
            const x = state.gridOffsetX + portal.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            const y = state.gridOffsetY + portal.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            
            // Portal swirl effect
            const time = Date.now() / 500;
            for (let i = 0; i < 3; i++) {
                const radius = 8 + i * 4 + Math.sin(time + i) * 2;
                const alpha = 0.6 - i * 0.15;
                ctx.fillStyle = `rgba(136, 0, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Center
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawTraps() {
        const ctx = state.ctx;
        
        for (const trap of traps) {
            if (!trap.active) continue;
            
            const x = state.gridOffsetX + trap.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            const y = state.gridOffsetY + trap.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            
            // Spike trap
            const spikeHeight = 8 + Math.sin(Date.now() / 200) * 3;
            ctx.fillStyle = '#ff4444';
            
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(x + i * 6, y + 8);
                ctx.lineTo(x + i * 6 + 3, y - spikeHeight);
                ctx.lineTo(x + i * 6 + 6, y + 8);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    function drawTokens() {
        const ctx = state.ctx;
        
        for (const token of tokens) {
            if (token.collected) continue;
            
            const x = state.gridOffsetX + token.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            const y = state.gridOffsetY + token.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            
            // Glow
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 10);
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Token
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Shine
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x - 1, y - 1, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawPowerUps() {
        const ctx = state.ctx;
        
        for (const powerUp of powerUps) {
            if (powerUp.collected) continue;
            
            const x = state.gridOffsetX + powerUp.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            const y = state.gridOffsetY + powerUp.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            const info = POWER_UPS[powerUp.type];
            const pulse = powerUp.pulse || 0.5;
            
            // Glow
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12 + pulse * 4);
            gradient.addColorStop(0, info.color + '80');
            gradient.addColorStop(1, info.color + '00');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 12 + pulse * 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Icon background
            ctx.fillStyle = info.color;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Icon text
            ctx.fillStyle = '#000';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(info.icon, x, y + 1);
        }
    }

    function drawGhosts() {
        const ctx = state.ctx;
        
        for (const ghost of ghosts) {
            const isFrightened = ghost.state === 'frightened';
            const color = isFrightened ? '#0000ff' : ghost.color;
            const size = ghost.isBoss ? ghost.size : 10;
            
            // Glow
            const gradient = ctx.createRadialGradient(ghost.x, ghost.y, 0, ghost.x, ghost.y, size * 1.5);
            gradient.addColorStop(0, color + '80');
            gradient.addColorStop(1, color + '00');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(ghost.x, ghost.y, size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Ghost body
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(ghost.x, ghost.y - size * 0.3, size, Math.PI, 0);
            
            // Wavy bottom
            const waveCount = ghost.isBoss ? 5 : 3;
            for (let i = 0; i <= waveCount; i++) {
                const wx = ghost.x + size - (i * size * 2 / waveCount);
                const wy = ghost.y + size * 0.7 + (i % 2 === 0 ? 0 : size * 0.3);
                ctx.lineTo(wx, wy);
            }
            
            ctx.closePath();
            ctx.fill();
            
            // Eyes
            const eyeY = ghost.y - size * 0.5;
            const eyeOffset = size * 0.4;
            
            if (isFrightened) {
                // Scared eyes
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(ghost.x - eyeOffset * 0.5, eyeY, size * 0.25, 0, Math.PI * 2);
                ctx.arc(ghost.x + eyeOffset * 0.5, eyeY, size * 0.25, 0, Math.PI * 2);
                ctx.fill();
                
                // Mouth
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(ghost.x, eyeY + size * 0.3, size * 0.3, 0, Math.PI);
                ctx.stroke();
            } else {
                // Normal eyes
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(ghost.x - eyeOffset * 0.5, eyeY, size * 0.3, 0, Math.PI * 2);
                ctx.arc(ghost.x + eyeOffset * 0.5, eyeY, size * 0.3, 0, Math.PI * 2);
                ctx.fill();
                
                // Pupils (look at player)
                ctx.fillStyle = '#000';
                const pupilOffset = Math.min(size * 0.1, 2);
                const dx = player.x - ghost.x;
                const dy = player.y - ghost.y;
                const dist = Math.hypot(dx, dy);
                const px = dx / dist * pupilOffset;
                const py = dy / dist * pupilOffset;
                
                ctx.beginPath();
                ctx.arc(ghost.x - eyeOffset * 0.5 + px, eyeY + py, size * 0.15, 0, Math.PI * 2);
                ctx.arc(ghost.x + eyeOffset * 0.5 + px, eyeY + py, size * 0.15, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Boss crown
            if (ghost.isBoss) {
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.moveTo(ghost.x - 15, ghost.y - 25);
                ctx.lineTo(ghost.x - 10, ghost.y - 35);
                ctx.lineTo(ghost.x - 5, ghost.y - 25);
                ctx.lineTo(ghost.x, ghost.y - 35);
                ctx.lineTo(ghost.x + 5, ghost.y - 25);
                ctx.lineTo(ghost.x + 10, ghost.y - 35);
                ctx.lineTo(ghost.x + 15, ghost.y - 25);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    function drawPlayer() {
        const ctx = state.ctx;
        
        // Invulnerability flash
        if (player.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // Glow
        const gradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 15);
        gradient.addColorStop(0, player.color + '80');
        gradient.addColorStop(1, player.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Body
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#000';
        const eyeOffsetX = player.dirX * 2;
        const eyeOffsetY = player.dirY * 2;
        ctx.beginPath();
        ctx.arc(player.x - 3 + eyeOffsetX, player.y - 2 + eyeOffsetY, 2, 0, Math.PI * 2);
        ctx.arc(player.x + 3 + eyeOffsetX, player.y - 2 + eyeOffsetY, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Sprint indicator
        if (player.isSprinting && player.sprintEnergy > 0) {
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
            ctx.stroke();
            
            // Trail effect
            ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
            ctx.beginPath();
            ctx.arc(player.x - player.dirX * 8, player.y - player.dirY * 8, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Power-up indicator
        if (player.powerUpActive) {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Shield indicator
        if (player.invulnerable && !player.powerUpActive) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 16, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
    }

    function drawParticles() {
        const ctx = state.ctx;
        
        for (const p of particles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawFloatingTexts() {
        const ctx = state.ctx;
        
        for (const ft of floatingTexts) {
            const alpha = Math.min(ft.life / 1000, 1);
            ctx.fillStyle = ft.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ft.text, ft.x, ft.y);
        }
    }

    function drawBossHealthBar() {
        const ctx = state.ctx;
        const barWidth = 300;
        const barHeight = 20;
        const x = (state.canvas.width - barWidth) / 2;
        const y = 60;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Health
        const healthPercent = state.bossHealth / state.bossMaxHealth;
        const healthColor = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00';
        ctx.fillStyle = healthColor;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`ARCADE DEMON - ${Math.floor(healthPercent * 100)}%`, state.canvas.width / 2, y + 14);
    }

    function drawCombo() {
        const ctx = state.ctx;
        const x = state.canvas.width / 2;
        const y = 100;
        
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${state.combo}x COMBO!`, x, y);
        
        ctx.fillStyle = '#888';
        ctx.font = '14px Arial';
        ctx.fillText(`x${state.comboMultiplier.toFixed(1)} Multiplier`, x, y + 20);
    }

    function drawCursedOverlay() {
        const ctx = state.ctx;
        
        switch (state.cursedEventType) {
            case 'STATIC':
                // Static noise
                for (let i = 0; i < 100; i++) {
                    const x = Math.random() * state.canvas.width;
                    const y = Math.random() * state.canvas.height;
                    const w = Math.random() * 50 + 10;
                    const h = Math.random() * 5 + 1;
                    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
                    ctx.fillRect(x, y, w, h);
                }
                break;
            case 'DARKNESS':
                // Vignette
                const gradient = ctx.createRadialGradient(
                    state.canvas.width / 2, state.canvas.height / 2, 0,
                    state.canvas.width / 2, state.canvas.height / 2, state.canvas.width * 0.4
                );
                gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
                break;
            case 'GLITCH':
                // RGB shift
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                ctx.fillRect(Math.random() * 10 - 5, 0, state.canvas.width, state.canvas.height);
                ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
                ctx.fillRect(Math.random() * 10 - 5, 0, state.canvas.width, state.canvas.height);
                ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
                ctx.fillRect(Math.random() * 10 - 5, 0, state.canvas.width, state.canvas.height);
                ctx.globalCompositeOperation = 'source-over';
                break;
        }
        
        // Event name
        if (state.cursedEventType) {
            const event = CURSED_EVENTS[state.cursedEventType];
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(event.name.toUpperCase(), state.canvas.width / 2, 150);
        }
    }

    function drawVignette() {
        if (state.vignetteIntensity <= 0) return;
        
        const ctx = state.ctx;
        const gradient = ctx.createRadialGradient(
            state.canvas.width / 2, state.canvas.height / 2, state.canvas.width * 0.3,
            state.canvas.width / 2, state.canvas.height / 2, state.canvas.width * 0.7
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${state.vignetteIntensity})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
    }

    function drawGlitch() {
        const ctx = state.ctx;
        
        // Horizontal slices
        for (let i = 0; i < 5; i++) {
            const y = Math.random() * state.canvas.height;
            const h = Math.random() * 20 + 5;
            const offset = (Math.random() - 0.5) * 20;
            
            ctx.drawImage(
                state.canvas,
                0, y, state.canvas.width, h,
                offset, y, state.canvas.width, h
            );
        }
    }

    // ============================================
    // GAME LOOP
    // ============================================
    function gameLoop() {
        if (!state.gameActive) return;
        
        const currentTime = performance.now();
        const dt = Math.min((currentTime - state.lastTime) / 1000, 0.1);
        state.lastTime = currentTime;
        
        update(dt);
        draw();
        
        state.animationId = requestAnimationFrame(gameLoop);
    }

    // ============================================
    // GAME END STATES
    // ============================================
    function gameOver() {
        state.gameActive = false;
        cancelAnimationFrame(state.animationId);
        
        // Update high score
        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem('cursedArcade_highScore', state.highScore.toString());
        }
        
        if (state.gameContainer) state.gameContainer.gameOver(state.score);
        
        document.getElementById('game-hud').style.display = 'none';
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('final-score').textContent = `Score: ${state.score} | Level: ${state.level} | High Score: ${state.highScore}`;
    }

    function gameWin() {
        state.gameActive = false;
        cancelAnimationFrame(state.animationId);
        
        // Update high score
        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem('cursedArcade_highScore', state.highScore.toString());
        }
        
        if (state.gameContainer) state.gameContainer.victory(state.score);
        
        document.getElementById('game-hud').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('win-stats').textContent = `Final Score: ${state.score} | Lives: ${state.lives} | High Score: ${state.highScore}`;
    }

    // ============================================
    // START
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
