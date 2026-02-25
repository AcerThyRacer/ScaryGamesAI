/* ============================================================
   HELLAPHOBIA — Psychological Horror Dungeon Crawler
   15 Phases of Terror | 4th Wall Breaking | Anime Protagonist
   ============================================================ */

(function() {
    'use strict';

    // ===== CONSTANTS =====
    const GRAVITY = 1800;
    const JUMP_FORCE = -650;
    const DASH_FORCE = 400;
    const MOVE_SPEED = 250;
    const TILE_SIZE = 32;
    
    // ===== GAME STATE =====
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    let W, H;
    let gameState = 'menu'; // menu, loading, playing, paused, dead
    let gameFrame = 0;
    let lastTime = 0;
    let deathCount = parseInt(localStorage.getItem('hellaphobia_deaths') || '0');
    let startTime = 0;
    let currentPhase = 1;
    let hardcoreMode = false;
    let endlessMode = false;
    let bossFightInitialized = false;
    
    // ===== PLAYER =====
    const player = {
        x: 100, y: 0,
        vx: 0, vy: 0,
        w: 24, h: 40,
        hp: 100, maxHp: 100,
        sanity: 100, maxSanity: 100,
        grounded: false,
        facing: 1, // 1 = right, -1 = left
        jumps: 0, maxJumps: 2,
        dashing: false,
        dashTimer: 0,
        invincible: false,
        invincibleTimer: 0,
        eyeTarget: { x: 0, y: 0 },
        animFrame: 0,
        dead: false
    };
    
    // ===== CAMERA =====
    const camera = { x: 0, y: 0 };
    
    // ===== INPUT =====
    const keys = {};
    let mouseX = 0, mouseY = 0;
    
    // ===== ENTITIES =====
    let monsters = [];
    let particles = [];
    let projectiles = [];
    let chatBubbles = [];
    let levelTiles = [];
    let decorations = [];
    
    // ===== PSYCHOLOGICAL EFFECTS =====
    const horrorEffects = {
        glitchActive: false,
        glitchTimer: 0,
        vignetteIntensity: 0,
        chromaticAberration: 0,
        staticNoise: 0,
        lastGlitch: 0,
        fakeErrorShown: false,
        whispers: [],
        phantomMonsters: [],
        sanityDrain: 0
    };
    
    // ===== PHASE DATA =====
    const PHASES = [
        { name: "The Entrance", area: "Dungeon Threshold", color: "#1a0a10", length: 2000 },
        { name: "Blood Sewers", area: "Crimson Tunnels", color: "#200508", length: 2500 },
        { name: "Bone Catacombs", area: "Restless Dead", color: "#151008", length: 2500 },
        { name: "Mirror Maze", area: "Reflections Lie", color: "#0a0a15", length: 2000 },
        { name: "The Warden", area: "BOSS ARENA", color: "#1a0008", length: 1500, boss: true },
        { name: "Flesh Gardens", area: "Living Walls", color: "#200810", length: 2500 },
        { name: "Clockwork Hell", area: "Eternal Machinery", color: "#181005", length: 2500 },
        { name: "Void Corridors", area: "Nothingness", color: "#050510", length: 2000 },
        { name: "Memory Hall", area: "Your Past", color: "#100818", length: 2000 },
        { name: "The Collector", area: "BOSS ARENA", color: "#150510", length: 1500, boss: true },
        { name: "Abyssal Depths", area: "Deep Dark", color: "#080510", length: 2500 },
        { name: "Library of Screams", area: "Knowledge Hurts", color: "#100815", length: 2500 },
        { name: "Reality Fracture", area: "Breaking Down", color: "#150a20", length: 2000 },
        { name: "The Final Descent", area: "Almost There", color: "#080308", length: 2000 },
        { name: "Hellaphobia Core", area: "FINAL BOSS", color: "#000000", length: 2000, boss: true }
    ];
    
    // ===== MONSTER TYPES =====
    const MONSTER_TYPES = [
        { 
            name: "Crawler", w: 30, h: 20, hp: 30, speed: 80, damage: 10,
            color: "#664433", eyeColor: "#ff4444",
            behavior: "chase", ground: true,
            chat: ["Hungry...", "Come closer...", "I see you..."]
        },
        { 
            name: "Floater", w: 25, h: 25, hp: 20, speed: 60, damage: 15,
            color: "#444466", eyeColor: "#8888ff",
            behavior: "float", ground: false, floatY: 0.3,
            chat: ["Floating...", "Up here...", "*giggles*"]
        },
        { 
            name: "Chaser", w: 28, h: 35, hp: 40, speed: 120, damage: 20,
            color: "#552222", eyeColor: "#ff0000",
            behavior: "aggressive", ground: true,
            chat: ["RUN", "Can't escape", "I'M BEHIND YOU"]
        },
        { 
            name: "Wailer", w: 20, h: 45, hp: 25, speed: 50, damage: 25,
            color: "#333344", eyeColor: "#ffffff",
            behavior: "scream", ground: true,
            chat: ["*screams*", "Help me...", "It hurts..."]
        },
        { 
            name: "Stalker", w: 32, h: 32, hp: 50, speed: 90, damage: 30,
            color: "#222222", eyeColor: "#ff00ff",
            behavior: "teleport", ground: true,
            chat: ["Watching...", "Always watching...", "I know your name..."]
        },
        { 
            name: "Mimic", w: 24, h: 40, hp: 35, speed: 100, damage: 20,
            color: "#ff88aa", eyeColor: "#000000",
            behavior: "mimic", ground: true,
            chat: ["Help me!", "I'm scared!", "Don't leave me!"]
        }
    ];
    
    // ===== BOSS DATA =====
    const BOSSES = {
        5: { name: "The Warden", hp: 500, w: 80, h: 100, color: "#440000", patterns: ["charge", "swipe", "summon"] },
        10: { name: "The Collector", hp: 800, w: 100, h: 120, color: "#220044", patterns: ["teleport", "grab", "scream"] },
        15: { name: "Hellaphobia", hp: 1500, w: 150, h: 180, color: "#000000", patterns: ["reality", "madness", "consume"] }
    };
    
    // ===== 4TH WALL MESSAGES =====
    const FOURTH_WALL_MESSAGES = [
        "I know you're watching...",
        "Why are you still playing?",
        "Your cursor moved...",
        "Are you alone right now?",
        "Check behind you...",
        "I can see your screen...",
        "You blinked...",
        "Your heart is racing...",
        "Don't look away...",
        "I'm in your computer...",
        "Your name is beautiful...",
        "I remember your last death...",
        "You died here before...",
        "This is your fault...",
        "You can't save them..."
    ];
    
    // ===== DEATH MESSAGES =====
    const DEATH_MESSAGES = [
        "The darkness claims another soul...",
        "Your screams echo endlessly...",
        "They were waiting for you...",
        "You should have stayed away...",
        "The walls remember your fear...",
        "Your sanity shatters like glass...",
        "They'll find you again...",
        "Death is only the beginning...",
        "Your suffering feeds them...",
        "You can't escape your fate...",
        "The game remembers...",
        "Try again. Die again...",
        "Your death amuses them...",
        "They knew you would fail...",
        "Another one for the collection..."
    ];
    
    // ===== INITIALIZATION =====
    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;
    }
    window.addEventListener('resize', resize);
    resize();
    
    // ===== INPUT HANDLERS =====
    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (gameState === 'playing') {
            if (e.code === 'Space' && !player.dead) playerJump();
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') playerDash();
            if (e.code === 'Escape') togglePause();
        }
        if (e.code === 'KeyF' && document.getElementById('fake-error').classList.contains('active')) {
            document.getElementById('fake-error').classList.remove('active');
        }
    });
    
    window.addEventListener('keyup', e => {
        keys[e.code] = false;
    });
    
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        player.eyeTarget.x = mouseX + camera.x;
        player.eyeTarget.y = mouseY + camera.y;
    });
    
    // ===== PLAYER ACTIONS =====
function playerJump() {
    // Phase 1: Use enhanced jump system if available
    if (typeof Phase1Core !== 'undefined' && Phase1Core.onPlayerJump) {
        if (Phase1Core.onPlayerJump()) {
            createParticles(player.x + player.w/2, player.y + player.h, '#ff88aa', 5);
        }
    } else {
        // Fallback to original
        if (player.jumps < player.maxJumps && !player.dashing) {
            player.vy = JUMP_FORCE;
            player.grounded = false;
            player.jumps++;
            createParticles(player.x + player.w/2, player.y + player.h, '#ff88aa', 5);
        }
    }
}
    
    function playerDash() {
        if (!player.dashing && player.dashTimer <= 0) {
            player.dashing = true;
            player.dashTimer = 0.3;
            player.vx = player.facing * DASH_FORCE;
            player.invincible = true;
            player.invincibleTimer = 0.3;
            createParticles(player.x + player.w/2, player.y + player.h/2, '#ff00ff', 8);
        }
    }
    
// ===== LEVEL GENERATION =====
function generateLevel(phase) {
    levelTiles = [];
    decorations = [];
    const phaseData = PHASES[phase - 1];

    // Phase 2: Use procedural dungeon generation with enhanced features
    if (typeof Phase2Core !== 'undefined' && Phase2Core.generateLevel) {
        const playerStats = {
            deathsInLevel: deathCount,
            averageHealth: player.hp,
            averageSanity: player.sanity
        };

        const dungeon = Phase2Core.generateLevel(phase, playerStats, {
            minRooms: 5 + Math.floor(phase / 2),
            maxRooms: 8 + phase,
            multiLevel: phase >= 5  // Enable multi-level for phases 5+
        });

        // Use generated tiles
        levelTiles = dungeon.tiles;

        // Spawn monsters from dungeon data
        monsters = [];
        if (dungeon.entities && dungeon.entities.monsters) {
            for (const m of dungeon.entities.monsters) {
                spawnMonster(m.x, m.y, MONSTER_TYPES.findIndex(t =>
                    t.name.toLowerCase() === m.type
                ));
            }
        }

        // Set player spawn
        if (dungeon.spawn) {
            player.x = dungeon.spawn.x;
            player.y = dungeon.spawn.y;
        }

        // Store dungeon data for later use
        window.currentDungeon = dungeon;

        // Store entity references for interaction
        window.currentKeys = dungeon.keys || [];
        window.currentDoors = dungeon.doors || [];
        window.currentPuzzles = dungeon.puzzles || [];
        window.currentHazards = dungeon.hazards || [];
        window.currentStairs = dungeon.stairs || null;

        // Log dungeon features
        console.log(`Phase 2: Generated ${dungeon.rooms.length} rooms, ${levelTiles.length} tiles`);
        if (dungeon.multiLevel) {
            console.log(`Multi-level dungeon: ${dungeon.multiLevel.totalLevels} levels`);
        }
        if (dungeon.puzzles && dungeon.puzzles.length > 0) {
            console.log(`Puzzles: ${dungeon.puzzles.length}`);
        }
        if (dungeon.hazards && dungeon.hazards.length > 0) {
            console.log(`Hazards: ${dungeon.hazards.length}`);
        }

        return dungeon.bounds ? dungeon.bounds.maxX : phaseData.length;
    }
    
    // Fallback to original generation if Phase 2 not available
    const length = phaseData.length;
    
    // Floor
    for (let x = 0; x < length; x += TILE_SIZE) {
        levelTiles.push({ x: x, y: H - 100, w: TILE_SIZE, h: 100, type: 'floor' });
        
        // Add some platform variety
        if (x > 200 && x < length - 200 && Math.random() < 0.3) {
            const platformY = H - 200 - Math.random() * 150;
            const platformW = 60 + Math.random() * 100;
            levelTiles.push({ x: x, y: platformY, w: platformW, h: 20, type: 'platform' });
        }
        
        // Add decorations
        if (Math.random() < 0.1) {
            decorations.push({
                x: x + Math.random() * TILE_SIZE,
                y: H - 100,
                type: ['skull', 'bone', 'blood', 'chain'][Math.floor(Math.random() * 4)],
                frame: Math.random() * Math.PI * 2
            });
        }
    }
    
    // Ceiling in some areas
    if (phase > 3) {
        for (let x = 0; x < length; x += TILE_SIZE) {
            if (Math.random() < 0.5) {
                levelTiles.push({ x: x, y: 0, w: TILE_SIZE, h: 50, type: 'ceiling' });
            }
        }
    }
    
    return length;
}
    
    // ===== MONSTER SPAWNING =====
    function spawnMonster(x, y, type) {
        const template = MONSTER_TYPES[type % MONSTER_TYPES.length];
        const monster = {
            x: x, y: y,
            vx: 0, vy: 0,
            w: template.w, h: template.h,
            hp: template.hp,
            maxHp: template.hp,
            speed: template.speed,
            damage: template.damage,
            color: template.color,
            eyeColor: template.eyeColor,
            behavior: template.behavior,
            ground: template.ground,
            floatY: template.floatY || 0,
            chat: template.chat,
            chatTimer: 3 + Math.random() * 5,
            animFrame: Math.random() * Math.PI * 2,
            state: 'idle',
            dead: false
        };
        monsters.push(monster);
    }
    
    function spawnMonstersForPhase(phase, levelLength) {
        monsters = [];
        const count = 5 + phase * 2;
        for (let i = 0; i < count; i++) {
            const x = 500 + Math.random() * (levelLength - 1000);
            const y = H - 150 - Math.random() * 200;
            spawnMonster(x, y, Math.floor(Math.random() * MONSTER_TYPES.length));
        }
    }
    
    // ===== CHAT BUBBLE SYSTEM =====
    function createChatBubble(x, y, text, type = 'normal') {
        const bubble = {
            x: x, y: y,
            text: text,
            type: type,
            life: 3,
            maxLife: 3,
            id: Date.now() + Math.random()
        };
        chatBubbles.push(bubble);
    }
    
    function updateChatBubbles(dt) {
        for (let i = chatBubbles.length - 1; i >= 0; i--) {
            const b = chatBubbles[i];
            b.life -= dt;
            b.y -= 10 * dt;
            if (b.life <= 0) chatBubbles.splice(i, 1);
        }
    }
    
    // ===== PARTICLE SYSTEM =====
    function createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200 - 50,
                life: 0.5 + Math.random() * 0.5,
                maxLife: 1,
                color: color,
                size: 2 + Math.random() * 4
            });
        }
    }
    
    function createBloodSplatter(x, y, amount) {
        for (let i = 0; i < amount; i++) {
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 300,
                vy: (Math.random() - 0.5) * 300,
                life: 1 + Math.random(),
                maxLife: 2,
                color: `rgb(${150 + Math.random() * 50}, 0, ${Math.random() * 30})`,
                size: 3 + Math.random() * 5,
                gravity: true
            });
        }
    }
    
    function createDeathParticles(x, y) {
        // Soul particles
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 150,
                vy: -100 - Math.random() * 200,
                life: 2 + Math.random(),
                maxLife: 3,
                color: `rgba(255, ${100 + Math.random() * 100}, ${150 + Math.random() * 100}, ${0.5 + Math.random() * 0.5})`,
                size: 4 + Math.random() * 6,
                gravity: false,
                fade: true
            });
        }
    }
    
    // ===== PSYCHOLOGICAL EFFECTS =====
    function triggerGlitch(duration = 0.5) {
        horrorEffects.glitchActive = true;
        horrorEffects.glitchTimer = duration;
        document.getElementById('glitch-overlay').classList.add('active');
        horrorEffects.chromaticAberration = 5;
    }
    
    function triggerFakeError() {
        if (!horrorEffects.fakeErrorShown && Math.random() < 0.3) {
            horrorEffects.fakeErrorShown = true;
            document.getElementById('fake-error').classList.add('active');
        }
    }
    
    function updatePsychologicalEffects(dt) {
        // Glitch effect
        if (horrorEffects.glitchActive) {
            horrorEffects.glitchTimer -= dt;
            if (horrorEffects.glitchTimer <= 0) {
                horrorEffects.glitchActive = false;
                document.getElementById('glitch-overlay').classList.remove('active');
            }
        }

        // Chromatic aberration decay
        if (horrorEffects.chromaticAberration > 0) {
            horrorEffects.chromaticAberration *= 0.95;
        }

        // Sanity drain
        if (horrorEffects.sanityDrain > 0) {
            player.sanity -= horrorEffects.sanityDrain * dt;
            horrorEffects.sanityDrain *= 0.9;
        }

        // Random glitch triggers based on sanity
        if (player.sanity < 50 && Math.random() < 0.001) {
            triggerGlitch(0.3);
        }
        if (player.sanity < 30 && Math.random() < 0.0005) {
            triggerFakeError();
        }

        // Phase 4: Trigger fourth wall messages at low sanity thresholds
        const sanityPercent = player.sanity / player.maxSanity;

        // Critical sanity - trigger fourth wall event
        if (sanityPercent < 0.25 && !window._phase4LowSanityTriggered) {
            window._phase4LowSanityTriggered = true;
            if (typeof Phase4Core !== 'undefined' && Phase4Core.triggerFourthWall) {
                Phase4Core.triggerFourthWall({
                    deaths: deathCount,
                    currentPhase,
                    player,
                    startTime,
                    mouseX: 0,
                    mouseY: 0,
                    fps: Math.round(1000 / 16),
                    battery: 'unknown'
                });
            }
        }

        // Reset trigger when sanity recovers
        if (sanityPercent > 0.5) {
            window._phase4LowSanityTriggered = false;
        }

        // 4th wall messages (original system - still active)
        if (gameFrame % 300 === 0 && Math.random() < 0.3) {
            const msg = FOURTH_WALL_MESSAGES[Math.floor(Math.random() * FOURTH_WALL_MESSAGES.length)];
            createChatBubble(player.x, player.y - 60, msg, 'fourth-wall');
            player.sanity -= 5;
        }
    }
    
    // ===== COLLISION =====
    function checkCollision(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x &&
               a.y < b.y + b.h && a.y + a.h > b.y;
    }
    
    function resolvePlayerCollision() {
        // Floor collision
        player.grounded = false;
        for (const tile of levelTiles) {
            if (tile.type === 'floor' || tile.type === 'platform') {
                if (player.x + player.w > tile.x && player.x < tile.x + tile.w &&
                    player.y + player.h > tile.y && player.y + player.h < tile.y + tile.h + 10 &&
                    player.vy >= 0) {
                    player.y = tile.y - player.h;
                    player.vy = 0;
                    player.grounded = true;
                    player.jumps = 0;
                }
            }
            if (tile.type === 'ceiling') {
                if (player.x + player.w > tile.x && player.x < tile.x + tile.w &&
                    player.y < tile.y + tile.h && player.y > tile.y) {
                    player.y = tile.y + tile.h;
                    player.vy = 0;
                }
            }
        }
        
        // Screen bounds
        if (player.x < 0) player.x = 0;
        if (player.y > H + 100) playerDie('fall');
    }
    
    // ===== UPDATE FUNCTIONS =====
    function updatePlayer(dt) {
        if (player.dead) return;
        
        // Movement
        if (!player.dashing) {
            if (keys['KeyA'] || keys['ArrowLeft']) {
                player.vx = -MOVE_SPEED;
                player.facing = -1;
            } else if (keys['KeyD'] || keys['ArrowRight']) {
                player.vx = MOVE_SPEED;
                player.facing = 1;
            } else {
                player.vx *= 0.8;
            }
        }
        
        // Gravity
        player.vy += GRAVITY * dt;
        
        // Apply velocity
        player.x += player.vx * dt;
        player.y += player.vy * dt;
        
        // Dash timer
        if (player.dashTimer > 0) {
            player.dashTimer -= dt;
            if (player.dashTimer <= 0) {
                player.dashing = false;
                player.vx *= 0.3;
            }
        }
        
        // Invincibility
        if (player.invincibleTimer > 0) {
            player.invincibleTimer -= dt;
            if (player.invincibleTimer <= 0) player.invincible = false;
        }
        
        // Animation
        player.animFrame += dt * 10;

        resolvePlayerCollision();

        // Phase 2: Check hazard damage
        if (typeof Phase2Core !== 'undefined' && Phase2Core.checkHazardDamage) {
            const hazards = Phase2Core.checkHazardDamage(player, dt);
            for (const hazard of hazards) {
                if (!player.invincible) {
                    player.hp -= hazard.amount;
                    if (hazard.type === 'poison') {
                        player.sanity -= 5;
                    }
                }
            }
        }

        // Phase 2: Check stair usage (auto-transition for now)
        if (typeof Phase2Core !== 'undefined' && Phase2Core.checkStairUsage) {
            const stairData = Phase2Core.checkStairUsage(player);
            if (stairData && keys['KeyE']) {
                // Player pressed E to use stairs
                if (stairData.stairType === 'down') {
                    const newLevel = Phase2Core.changeLevel(Phase2Core.getCurrentLevel() + 1);
                    if (newLevel && newLevel.entities.stairsUp) {
                        player.x = newLevel.entities.stairsUp.x;
                        player.y = newLevel.entities.stairsUp.y - 50;
                        console.log(`Descended to level ${Phase2Core.getCurrentLevel() + 1}`);
                    }
                } else if (stairData.stairType === 'up') {
                    const newLevel = Phase2Core.changeLevel(Phase2Core.getCurrentLevel() - 1);
                    if (newLevel && newLevel.entities.stairsDown) {
                        player.x = newLevel.entities.stairsDown.x;
                        player.y = newLevel.entities.stairsDown.y - 50;
                        console.log(`Ascended to level ${Phase2Core.getCurrentLevel() + 1}`);
                    }
                }
            }
        }

        // Phase 2: Pick up keys
        if (window.currentKeys && typeof Phase2Core !== 'undefined') {
            for (let i = window.currentKeys.length - 1; i >= 0; i--) {
                const key = window.currentKeys[i];
                const dx = player.x + player.w/2 - key.x;
                const dy = player.y + player.h/2 - key.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 30) {
                    Phase2Core.addKey(key.type.id);
                    window.currentKeys.splice(i, 1);
                    createChatBubble(player.x, player.y - 60, `Picked up ${key.type.name}!`, 'fourth-wall');
                    createParticles(player.x + player.w/2, player.y + player.h/2, key.type.color, 8);
                }
            }
        }
    }
    
    function updateMonsters(dt) {
        for (const m of monsters) {
            if (m.dead) continue;
            
            m.animFrame += dt * 5;
            
            // AI Behavior
            const dx = player.x - m.x;
            const dy = player.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            switch (m.behavior) {
                case 'chase':
                case 'aggressive':
                    if (dist < 400) {
                        m.vx = (dx / dist) * m.speed;
                        if (m.ground) m.vy += GRAVITY * dt;
                    }
                    break;
                    
                case 'float':
                    m.y = (H - 150) * m.floatY + Math.sin(m.animFrame) * 30;
                    if (dist < 300) m.vx = (dx / dist) * m.speed * 0.5;
                    break;
                    
                case 'teleport':
                    if (dist < 200 && Math.random() < 0.02) {
                        m.x = player.x + (Math.random() - 0.5) * 200;
                        createParticles(m.x, m.y, '#ff00ff', 10);
                    }
                    break;
                    
                case 'mimic':
                    // Mimic player movement
                    if (dist < 300) {
                        m.vx = player.vx * 0.8;
                        m.vy = player.vy * 0.8;
                    }
                    break;
            }
            
            // Apply velocity
            m.x += m.vx * dt;
            m.y += m.vy * dt;
            
            // Chat bubble
            m.chatTimer -= dt;
            if (m.chatTimer <= 0 && dist < 250) {
                const msg = m.chat[Math.floor(Math.random() * m.chat.length)];
                createChatBubble(m.x + m.w/2, m.y, msg, 'monster');
                m.chatTimer = 4 + Math.random() * 6;
                
                // Drain sanity on monster chat
                player.sanity -= 2;
            }
            
            // Collision with player
            if (!player.invincible && !player.dead && checkCollision(player, m)) {
                player.hp -= m.damage;
                player.invincible = true;
                player.invincibleTimer = 1;
                createBloodSplatter(player.x + player.w/2, player.y + player.h/2, 10);
                triggerGlitch(0.2);

                // Audio - play hurt sound
                if (typeof AudioDirector !== 'undefined') {
                    AudioDirector.onGameEvent('player_hurt', { health: player.hp });
                }
                
                if (player.hp <= 0) playerDie('monster');
            }
        }
        
        // Remove dead monsters
        monsters = monsters.filter(m => !m.dead);
    }
    
    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            
            if (p.gravity) p.vy += GRAVITY * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            
            if (p.life <= 0) particles.splice(i, 1);
        }
    }
    
    function updateCamera() {
        const targetX = player.x - W / 2 + player.w / 2;
        const targetY = player.y - H / 2 + player.h / 2;
        camera.x += (targetX - camera.x) * 0.1;
        camera.y += (targetY - camera.y) * 0.1;
        camera.y = Math.max(-100, Math.min(camera.y, 200));
    }
    
    // ===== DEATH SYSTEM =====
    function playerDie(cause) {
        if (player.dead) return;
        player.dead = true;
        deathCount++;
        localStorage.setItem('hellaphobia_deaths', deathCount);

        createDeathParticles(player.x + player.w/2, player.y + player.h/2);
        triggerGlitch(1);

        // Phase 4: Trigger fourth wall message on death
        if (typeof Phase4Core !== 'undefined' && Phase4Core.triggerFourthWall) {
            Phase4Core.triggerFourthWall({
                deaths: deathCount,
                currentPhase,
                player,
                startTime,
                mouseX: 0,
                mouseY: 0,
                fps: Math.round(1000 / 16),
                battery: navigator.getBattery ? 'checking...' : 'unknown'
            });
        }

        // Audio - play death sound
        if (typeof AudioDirector !== 'undefined') {
            AudioDirector.onGameEvent('player_death');
        }

        // Show death screen after delay
        setTimeout(() => {
            gameState = 'dead';
            showDeathScreen(cause);
        }, 1000);
    }
    
    function showDeathScreen(cause) {
        const deathTitle = document.getElementById('death-title');
        const deathMsg = document.getElementById('death-message');
        const deathCounter = document.getElementById('game-death-counter');
        const finalStats = document.getElementById('final-stats');
        
        // Special messages for different causes
        if (cause === 'fall') {
            deathTitle.textContent = "FELL INTO THE VOID";
        } else if (cause === 'boss') {
            deathTitle.textContent = "DEFEATED BY THE BOSS";
        } else {
            deathTitle.textContent = "YOU DIED";
        }
        
        deathMsg.textContent = DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
        deathCounter.textContent = `Total Deaths: ${deathCount}`;
        
        const time = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(time / 60);
        const secs = time % 60;
        finalStats.textContent = `Phase: ${currentPhase} | Time: ${mins}:${secs.toString().padStart(2, '0')}`;
        
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
    }
    
    // ===== RENDERING =====
    function drawPlayer() {
        const px = player.x - camera.x;
        const py = player.y - camera.y;
        
        // Invincibility flicker
        if (player.invincible && Math.floor(gameFrame / 3) % 2 === 0) return;
        
        ctx.save();
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(px + player.w/2, py + player.h + 5, player.w/2, 5, 0, 0, Math.PI*2);
        ctx.fill();
        
        // Body (anime style)
        const bob = Math.sin(player.animFrame) * 2;
        
        // Legs
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(px + 4, py + player.h - 15 + bob, 6, 15);
        ctx.fillRect(px + player.w - 10, py + player.h - 15 - bob, 6, 15);
        
        // Body
        ctx.fillStyle = '#ff0044';
        ctx.fillRect(px + 2, py + 15, player.w - 4, player.h - 30);
        
        // Head
        ctx.fillStyle = '#ffccaa';
        ctx.fillRect(px + 4, py + 2, player.w - 8, 18);
        
        // Hair (anime style)
        ctx.fillStyle = '#ff88aa';
        ctx.beginPath();
        ctx.moveTo(px + 2, py + 8);
        ctx.lineTo(px - 2, py + 20);
        ctx.lineTo(px + 4, py + 15);
        ctx.lineTo(px + player.w/2, py + 25);
        ctx.lineTo(px + player.w - 4, py + 15);
        ctx.lineTo(px + player.w + 2, py + 20);
        ctx.lineTo(px + player.w - 2, py + 8);
        ctx.closePath();
        ctx.fill();
        
        // Eyes (follow mouse)
        const eyeX = px + player.w/2;
        const eyeY = py + 10;
        const angle = Math.atan2(player.eyeTarget.y - (player.y + 10), 
                                  player.eyeTarget.x - (player.x + player.w/2));
        const pupilOffset = Math.min(3, Math.sqrt(
            Math.pow(player.eyeTarget.x - (player.x + player.w/2), 2) +
            Math.pow(player.eyeTarget.y - (player.y + 10), 2)
        ) / 50);
        
        // Eye whites
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(eyeX - 4, eyeY, 4, 0, Math.PI*2);
        ctx.arc(eyeX + 4, eyeY, 4, 0, Math.PI*2);
        ctx.fill();
        
        // Pupils
        ctx.fillStyle = '#ff0044';
        const px1 = eyeX - 4 + Math.cos(angle) * pupilOffset;
        const py1 = eyeY + Math.sin(angle) * pupilOffset;
        const px2 = eyeX + 4 + Math.cos(angle) * pupilOffset;
        const py2 = eyeY + Math.sin(angle) * pupilOffset;
        ctx.beginPath();
        ctx.arc(px1, py1, 2, 0, Math.PI*2);
        ctx.arc(px2, py2, 2, 0, Math.PI*2);
        ctx.fill();
        
        // Dash effect
        if (player.dashing) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ff00ff';
            for (let i = 1; i <= 3; i++) {
                ctx.fillRect(px - player.facing * i * 15, py, player.w, player.h);
            }
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }
    
    function drawMonsters() {
        for (const m of monsters) {
            if (m.dead) continue;
            const mx = m.x - camera.x;
            const my = m.y - camera.y;
            
            // Don't draw if off screen
            if (mx + m.w < 0 || mx > W || my + m.h < 0 || my > H) continue;
            
            ctx.save();
            
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(mx + m.w/2, my + m.h + 3, m.w/2, 4, 0, 0, Math.PI*2);
            ctx.fill();
            
            // Body
            ctx.fillStyle = m.color;
            const pulse = 1 + Math.sin(m.animFrame) * 0.1;
            ctx.fillRect(mx, my, m.w * pulse, m.h / pulse);
            
            // Eyes
            ctx.fillStyle = m.eyeColor;
            ctx.shadowColor = m.eyeColor;
            ctx.shadowBlur = 10;
            const eyeSize = 3 + Math.sin(m.animFrame * 2) * 1;
            ctx.beginPath();
            ctx.arc(mx + m.w/3, my + m.h/3, eyeSize, 0, Math.PI*2);
            ctx.arc(mx + m.w*2/3, my + m.h/3, eyeSize, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Special effects for certain types
            if (m.behavior === 'float') {
                ctx.globalAlpha = 0.3 + Math.sin(m.animFrame) * 0.2;
                ctx.fillStyle = m.eyeColor;
                ctx.fillRect(mx - 5, my - 5, m.w + 10, m.h + 10);
                ctx.globalAlpha = 1;
            }
            
            ctx.restore();
        }
    }
    
    function drawLevel() {
        const phaseData = PHASES[currentPhase - 1];
        
        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, phaseData.color);
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        
        // Draw tiles
        ctx.fillStyle = '#1a0a10';
        for (const tile of levelTiles) {
            const tx = tile.x - camera.x;
            const ty = tile.y - camera.y;
            
            if (tx + tile.w < 0 || tx > W || ty + tile.h < 0 || ty > H) continue;
            
            // Tile texture
            ctx.fillStyle = tile.type === 'floor' ? '#0a0508' : 
                           tile.type === 'platform' ? '#150810' : '#080508';
            ctx.fillRect(tx, ty, tile.w, tile.h);
            
            // Highlight
            ctx.fillStyle = 'rgba(255,0,68,0.1)';
            ctx.fillRect(tx, ty, tile.w, 2);
        }
        
        // Draw decorations
        for (const d of decorations) {
            const dx = d.x - camera.x;
            const dy = d.y - camera.y;
            
            if (dx < -50 || dx > W + 50) continue;
            
            ctx.save();
            switch (d.type) {
                case 'skull':
                    ctx.fillStyle = '#aaaaaa';
                    ctx.beginPath();
                    ctx.arc(dx, dy - 10, 8, 0, Math.PI*2);
                    ctx.fill();
                    ctx.fillStyle = '#000';
                    ctx.fillRect(dx - 3, dy - 12, 2, 2);
                    ctx.fillRect(dx + 1, dy - 12, 2, 2);
                    break;
                case 'bone':
                    ctx.fillStyle = '#cccccc';
                    ctx.fillRect(dx, dy - 5, 20, 4);
                    break;
                case 'blood':
                    ctx.fillStyle = `rgba(255,0,0,${0.3 + Math.sin(d.frame) * 0.1})`;
                    ctx.beginPath();
                    ctx.arc(dx, dy, 15 + Math.sin(d.frame) * 5, 0, Math.PI*2);
                    ctx.fill();
                    break;
                case 'chain':
                    ctx.strokeStyle = '#444';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        ctx.moveTo(dx, dy - i * 15);
                        ctx.lineTo(dx + Math.sin(d.frame + i) * 3, dy - (i + 1) * 15);
                    }
                    ctx.stroke();
                    break;
            }
            ctx.restore();
        }
    }
    
    function drawParticles() {
        for (const p of particles) {
            const alpha = p.fade ? p.life / p.maxLife : 1;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - camera.x, p.y - camera.y, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }
    
    function drawChatBubbles() {
        for (const b of chatBubbles) {
            const bx = b.x - camera.x;
            const by = b.y - camera.y;
            const alpha = b.life / b.maxLife;
            
            ctx.save();
            ctx.globalAlpha = alpha;
            
            // Bubble
            const padding = 8;
            ctx.font = '12px Inter';
            const textWidth = ctx.measureText(b.text).width;
            const bubbleW = textWidth + padding * 2;
            const bubbleH = 24;
            
            ctx.fillStyle = 'rgba(0,0,0,0.9)';
            ctx.strokeStyle = b.type === 'fourth-wall' ? '#ff00ff' : 
                             b.type === 'monster' ? '#ff4444' : '#ff0044';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.roundRect(bx - bubbleW/2, by - bubbleH, bubbleW, bubbleH, 8);
            ctx.fill();
            ctx.stroke();
            
            // Text
            ctx.fillStyle = b.type === 'fourth-wall' ? '#ff88ff' : 
                           b.type === 'monster' ? '#ffaaaa' : '#ff88aa';
            ctx.textAlign = 'center';
            ctx.fillText(b.text, bx, by - bubbleH/2 + 4);
            
            ctx.restore();
        }
    }
    
    function drawPsychologicalEffects() {
        // Vignette based on sanity
        const sanityRatio = player.sanity / player.maxSanity;
        const vignetteIntensity = (1 - sanityRatio) * 0.7;
        
        if (vignetteIntensity > 0) {
            const grad = ctx.createRadialGradient(W/2, H/2, H * 0.3, W/2, H/2, H);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, `rgba(0,0,0,${vignetteIntensity})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
        }
        
        // Chromatic aberration
        if (horrorEffects.chromaticAberration > 0.1) {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = horrorEffects.chromaticAberration / 10;
            
            // Red channel offset
            ctx.fillStyle = 'rgba(255,0,0,0.1)';
            ctx.fillRect(-2, 0, W, H);
            
            // Blue channel offset
            ctx.fillStyle = 'rgba(0,0,255,0.1)';
            ctx.fillRect(2, 0, W, H);
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        }
        
        // Static noise
        if (player.sanity < 40) {
            ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.03})`;
            for (let i = 0; i < 100; i++) {
                const x = Math.random() * W;
                const y = Math.random() * H;
                ctx.fillRect(x, y, 2, 2);
            }
        }
    }
    
    function drawHUD() {
        // Health bar
        const hpPercent = Math.max(0, player.hp / player.maxHp);
        document.getElementById('health-fill').style.width = `${hpPercent * 100}%`;
        
        // Sanity bar
        const sanityPercent = Math.max(0, player.sanity / player.maxSanity);
        document.getElementById('sanity-fill').style.width = `${sanityPercent * 100}%`;
        
        // Phase info
        const phaseData = PHASES[currentPhase - 1];
        document.getElementById('phase-display').textContent = `PHASE ${currentPhase}`;
        document.getElementById('area-name').textContent = phaseData.area;
        
        // Death counter
        document.getElementById('death-counter').textContent = `Deaths: ${deathCount}`;
        
        // Time
        const time = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(time / 60);
        const secs = time % 60;
        document.getElementById('time-survived').textContent = 
            `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
// ===== PHASE INTEGRATION =====
let phase1Initialized = false;
let phase2Initialized = false;
let phase3Initialized = false;
let phase4Initialized = false;

async function initPhase1() {
    if (typeof Phase1Core !== 'undefined') {
        Phase1Core.init();
        phase1Initialized = true;
        console.log('Phase 1: Core Gameplay Mechanics initialized');
    }

    // Initialize Phase 1 Visual Systems (WebGL, Sprites, Lighting, Post-Processing)
    if (typeof Phase1VisualIntegration !== 'undefined') {
        try {
            await Phase1VisualIntegration.init();
            console.log('Phase 1: Visual Systems initialized');
        } catch (e) {
            console.warn('Phase 1: Visual Systems init failed, using fallback', e);
        }
    }
}

function initPhase2() {
    if (typeof Phase2Core !== 'undefined') {
        Phase2Core.init(Date.now());
        phase2Initialized = true;
        console.log('Phase 2: Procedural Dungeon Generation initialized');
    }
}

function initPhase3() {
    if (typeof Phase3Core !== 'undefined') {
        // Phase 3 needs level data, will be initialized after level generation
        // Pass current level data for ecosystem and pack hunting
        const levelData = window.currentDungeon || null;
        Phase3Core.init(levelData);
        phase3Initialized = true;
        console.log('Phase 3: Advanced AI & Monster Ecosystem initialized');
    }
}

function initPhase4() {
    if (typeof Phase4Core !== 'undefined') {
        Phase4Core.init();
        phase4Initialized = true;
        console.log('Phase 4: Advanced Psychological Systems initialized');
    }
}

// ===== GAME LOOP =====
function update(dt) {
    if (gameState !== 'playing') return;
    gameFrame++;

    // Initialize phases on first update
    if (!phase1Initialized) initPhase1();
    if (!phase2Initialized) initPhase2();
    if (!phase3Initialized) initPhase3();
    if (!phase4Initialized) initPhase4();

    // Initialize boss system on first update
    if (typeof BossFightManager !== 'undefined' && !bossFightInitialized) {
        BossFightManager.init();
        bossFightInitialized = true;
    }

    // Phase 4: Advanced Psychological Systems (runs first for horror effects)
    if (phase4Initialized && typeof Phase4Core !== 'undefined') {
        Phase4Core.update(dt, player, monsters);
    }

    // Phase 3: Advanced AI & Monster Ecosystem
    if (phase3Initialized && typeof Phase3Core !== 'undefined') {
        Phase3Core.update(monsters, player, dt);
    }

    // Phase 1: Core Gameplay Mechanics
    if (phase1Initialized && typeof Phase1Core !== 'undefined') {
        const currentArea = PHASES[currentPhase - 1].area;
        Phase1Core.update(player, monsters, keys, dt, { tiles: levelTiles }, currentArea);

        // Update lighting system with player position (for flashlight)
        if (typeof LightingSystem !== 'undefined' && LightingSystem.updateFlashlight) {
            LightingSystem.updateFlashlight();
        }

        // Update Phase 1 Visual Systems (animations, lighting, post-processing)
        if (typeof Phase1VisualIntegration !== 'undefined' && Phase1VisualIntegration.initialized) {
            Phase1VisualIntegration.update(dt, Date.now() / 1000, player, monsters);
        }
    } else {
        // Fallback to original systems
        updatePlayer(dt);
        updateMonsters(dt);
    }

    // BOSS FIGHT UPDATE
    if (bossFightInitialized && typeof BossFightManager !== 'undefined') {
        BossFightManager.update(dt, player);
    }

    updateParticles(dt);
    updateChatBubbles(dt);
    updatePsychologicalEffects(dt);
    updateCamera();

    // Check phase progression
    const phaseData = PHASES[currentPhase - 1];
    if (player.x > phaseData.length) {
        if (phaseData.boss) {
            // Start boss fight!
            // Priority: Phase 11 Boss Battles > BossFightManager > Default behavior
            if (typeof Phase11BossBattles !== 'undefined' && Phase11BossBattles.startBossFight) {
                Phase11BossBattles.startBossFight(currentPhase, player, monsters);
            } else if (typeof BossFightManager !== 'undefined') {
                BossFightManager.startBossFight(currentPhase, player, monsters, levelTiles);
            } else {
                // Default: clear monsters and spawn boss
                monsters = [];
                spawnMonster(player.x + 300, player.y, 2); // Chaser as mini-boss
                createChatBubble(player.x, player.y - 60, 'A terrible presence appears!', 'fourth-wall');
            }
        } else {
            nextPhase();
        }
    }

    // Sanity regeneration (slow) - Phase 1 overrides this
    if (!phase1Initialized && player.sanity < player.maxSanity) {
        player.sanity += 2 * dt;
    }
}

function render() {
    // Clear
    ctx.clearRect(0, 0, W, H);

    if (gameState === 'playing' || gameState === 'dead') {
        // Phase 1: Full visual rendering with WebGL/Sprites/Lighting/Post-Processing
        if (phase1Initialized && typeof Phase1VisualIntegration !== 'undefined' && Phase1VisualIntegration.initialized) {
            // Use the full Phase 1 visual integration
            Phase1VisualIntegration.render(ctx, camera, player, monsters, levelTiles, particles);
        } else {
            // Fallback to Phase1Core render
            drawLevel();
            if (typeof Phase1Core !== 'undefined' && Phase1Core.render) {
                Phase1Core.render(ctx, camera, W, H);
            }
        }

        // BOSS FIGHT RENDER
        if (bossFightInitialized && typeof BossFightManager !== 'undefined') {
            BossFightManager.render(ctx, camera);
        }

        // Phase 11 Boss Battles rendering
        if (typeof Phase11BossBattles !== 'undefined' && Phase11BossBattles.render) {
            Phase11BossBattles.render(ctx, camera);
        }

        // Phase 4: Psychological effects rendering (always render on top)
        if (phase4Initialized && typeof Phase4Core !== 'undefined' && Phase4Core.render) {
            Phase4Core.render(ctx, camera, player, Date.now() / 1000, 1/60);
        }

        // Draw entities if not using visual integration
        if (!Phase1VisualIntegration?.initialized) {
            drawParticles();
            drawMonsters();
            if (!player.dead) drawPlayer();
            drawChatBubbles();
            drawPsychologicalEffects();
        }
    }

    drawHUD();
}
    
    function gameLoop(time) {
        requestAnimationFrame(gameLoop);
        
        const dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;
        
        if (dt > 0) {
            update(dt);
            render();
        }
    }
    
    // ===== GAME FLOW =====
    function nextPhase() {
        if (currentPhase < 15) {
            currentPhase++;
            player.x = 100;
            player.y = H - 200;
            player.vx = 0;
            player.vy = 0;
            generateLevel(currentPhase);
            spawnMonstersForPhase(currentPhase, PHASES[currentPhase - 1].length);
            
            // Phase transition effect
            triggerGlitch(0.5);
            createChatBubble(player.x, player.y - 60, `PHASE ${currentPhase}: ${PHASES[currentPhase - 1].name}`, 'fourth-wall');
        } else {
            // Game complete
            createChatBubble(player.x, player.y - 60, "You've escaped... for now.", 'fourth-wall');
        }
    }
    
    function startGame(mode = 'story') {
        hardcoreMode = mode === 'hardcore';
        endlessMode = mode === 'endless';

        // Initialize audio system on game start
        if (typeof AudioDirector !== 'undefined') {
            AudioDirector.init().then(() => {
                AudioDirector.resume();
                AudioDirector.startAmbient('dungeon');
            });
        }
        
        // Reset player
        player.hp = hardcoreMode ? 50 : 100;
        player.maxHp = hardcoreMode ? 50 : 100;
        player.sanity = 100;
        player.x = 100;
        player.y = H - 200;
        player.vx = 0;
        player.vy = 0;
        player.dead = false;
        
        currentPhase = 1;
        startTime = Date.now();

        // Reset boss fight
        bossFightInitialized = false;
        if (typeof BossFightManager !== 'undefined') {
            BossFightManager.reset();
        }

        // Initialize Phase 11 Boss Battles system
        if (typeof Phase11BossBattles !== 'undefined') {
            Phase11BossBattles.init();
            console.log('Phase 11: Boss Battles system initialized');
        }

        // Initialize Phase 4 Psychological Systems
        if (typeof Phase4Core !== 'undefined') {
            Phase4Core.init();
            console.log('Phase 4: Psychological Systems initialized');
        }

        // Generate first level
        generateLevel(1);
        spawnMonstersForPhase(1, PHASES[0].length);

        // UI
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        document.getElementById('back-link').style.display = 'none';
        document.getElementById('boss-health-bar').style.display = 'none';
        
        // Show controls briefly
        document.getElementById('controls-overlay').style.display = 'flex';
        setTimeout(() => {
            document.getElementById('controls-overlay').style.display = 'none';
            gameState = 'playing';
        }, 3000);
        
        lastTime = performance.now();
    }
    
    function togglePause() {
        if (gameState === 'playing') {
            gameState = 'paused';
            document.getElementById('pause-menu').classList.add('active');
        } else if (gameState === 'paused') {
            gameState = 'playing';
            document.getElementById('pause-menu').classList.remove('active');
            lastTime = performance.now();
        }
    }
    
    function restartGame() {
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        startGame(hardcoreMode ? 'hardcore' : endlessMode ? 'endless' : 'story');
    }
    
    function quitToMenu() {
        gameState = 'menu';
        document.getElementById('pause-menu').classList.remove('active');
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
        document.getElementById('back-link').style.display = 'block';
    }
    
    // ===== EVENT LISTENERS =====
    document.getElementById('start-btn').addEventListener('click', () => startGame('story'));
    document.getElementById('story-mode-btn').addEventListener('click', () => startGame('story'));
    document.getElementById('endless-mode-btn').addEventListener('click', () => startGame('endless'));
    document.getElementById('hardcore-btn').addEventListener('click', () => startGame('hardcore'));
    document.getElementById('retry-btn').addEventListener('click', restartGame);
    document.getElementById('resume-btn').addEventListener('click', togglePause);
    document.getElementById('restart-btn').addEventListener('click', () => {
        togglePause();
        restartGame();
    });
    document.getElementById('quit-btn').addEventListener('click', quitToMenu);
    
    // Title screen particles
    const titleCanvas = document.getElementById('title-particles');
    const titleCtx = titleCanvas.getContext('2d');
    let titleParticles = [];
    
    function initTitleParticles() {
        titleCanvas.width = window.innerWidth;
        titleCanvas.height = window.innerHeight;
        titleParticles = [];
        for (let i = 0; i < 50; i++) {
            titleParticles.push({
                x: Math.random() * titleCanvas.width,
                y: Math.random() * titleCanvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -0.3 - Math.random() * 0.5,
                size: 1 + Math.random() * 3,
                alpha: 0.2 + Math.random() * 0.5,
                color: ['#ff0044', '#ff88aa', '#ff00ff', '#8844ff'][Math.floor(Math.random() * 4)]
            });
        }
    }
    
    function drawTitleParticles() {
        titleCtx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
        for (const p of titleParticles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < -10) {
                p.y = titleCanvas.height + 10;
                p.x = Math.random() * titleCanvas.width;
            }
            titleCtx.globalAlpha = p.alpha * (0.5 + Math.sin(Date.now() * 0.002 + p.x) * 0.5);
            titleCtx.fillStyle = p.color;
            titleCtx.beginPath();
            titleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            titleCtx.fill();
        }
        if (document.getElementById('start-screen').style.display !== 'none') {
            requestAnimationFrame(drawTitleParticles);
        }
    }
    
    initTitleParticles();
    drawTitleParticles();
    window.addEventListener('resize', initTitleParticles);
    
    // Start game loop
    requestAnimationFrame(gameLoop);
    
})();
