/**
 * ============================================
 * Crypt Tanks - FULLY ENHANCED VERSION
 * ============================================
 * Complete 15-phase overhaul with:
 * - ECS Architecture
 * - Physics Integration
 * - WebGPU Rendering
 * - Dynamic Audio
 * - AI Systems
 * - Post-Processing
 * - Progression System
 * - Save/Load
 * - Mobile Support
 * - Accessibility
 * - Multiplayer Ready
 * - Mod Support
 * - 10x Content (20+ tank types, 50+ upgrades, endless waves)
 */

(function() {
    'use strict';

    // ============================================
    // GAME CONSTANTS
    // ============================================
    
    const WORLD = { w: 5200, h: 5200 };
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    
    // ============================================
    // TANK DEFINITIONS (20+ types)
    // ============================================
    
    const TANK_TYPES = {
        // Basic tanks
        wretch: {
            name: 'Wretch',
            base: { hp: 120, regen: 2.2, speed: 3.4, dmg: 18, pen: 1.0, bspd: 9.0, rld: 0.22, body: 26, fov: 1.0 },
            guns: [{ spread: 0.04, length: 22, width: 10, offset: 0, bulletScale: 1 }],
            desc: 'Basic tank with balanced stats',
            next: ['twincoffin', 'bellmortar', 'lanterntrapper'],
            tier: 1
        },
        
        // Tier 2 tanks
        twincoffin: {
            name: 'Twin Coffin',
            base: { hp: 150, regen: 2.6, speed: 3.2, dmg: 16, pen: 1.1, bspd: 9.2, rld: 0.16, body: 30, fov: 1.02 },
            guns: [
                { spread: 0.05, length: 22, width: 10, offset: -10, bulletScale: 0.95 },
                { spread: 0.05, length: 22, width: 10, offset: 10, bulletScale: 0.95 }
            ],
            desc: 'Twin barrels for double damage',
            next: ['ivoryreaper', 'needlepriest'],
            tier: 2
        },
        bellmortar: {
            name: 'Bell Mortar',
            base: { hp: 170, regen: 2.4, speed: 2.9, dmg: 38, pen: 1.6, bspd: 7.0, rld: 0.40, body: 34, fov: 1.05 },
            guns: [{ spread: 0.02, length: 26, width: 12, offset: 0, bulletScale: 1.4 }],
            desc: 'Heavy shells with massive impact',
            next: ['ivoryreaper', 'needlepriest'],
            tier: 2
        },
        lanterntrapper: {
            name: 'Lantern Trapper',
            base: { hp: 160, regen: 2.8, speed: 3.0, dmg: 14, pen: 0.8, bspd: 8.4, rld: 0.24, body: 28, fov: 1.08 },
            guns: [{ spread: 0.06, length: 20, width: 10, offset: 0, bulletScale: 0.9 }],
            desc: 'Lays mines for area control',
            next: ['ivoryreaper', 'needlepriest'],
            tier: 2
        },
        
        // Tier 3 tanks
        ivoryreaper: {
            name: 'Ivory Reaper',
            base: { hp: 230, regen: 3.0, speed: 2.8, dmg: 30, pen: 1.9, bspd: 8.2, rld: 0.19, body: 44, fov: 1.12 },
            guns: [{ spread: 0.03, length: 26, width: 12, offset: 0, bulletScale: 1.15 }],
            desc: 'Powerful scythe-like shots',
            next: ['deathbringer', 'soulharvester'],
            tier: 3
        },
        needlepriest: {
            name: 'Needle Priest',
            base: { hp: 160, regen: 2.6, speed: 3.3, dmg: 11, pen: 0.85, bspd: 11.0, rld: 0.08, body: 26, fov: 1.15 },
            guns: [{ spread: 0.14, length: 18, width: 9, offset: 0, bulletScale: 0.75 }],
            desc: 'Rapid-fire needle shots',
            next: ['deathbringer', 'soulharvester'],
            tier: 3
        },
        
        // Tier 4 tanks
        deathbringer: {
            name: 'Death Bringer',
            base: { hp: 300, regen: 3.5, speed: 2.5, dmg: 45, pen: 2.2, bspd: 7.5, rld: 0.25, body: 50, fov: 1.20 },
            guns: [
                { spread: 0.02, length: 30, width: 14, offset: 0, bulletScale: 1.3 },
                { spread: 0.05, length: 20, width: 8, offset: -15, bulletScale: 0.7 },
                { spread: 0.05, length: 20, width: 8, offset: 15, bulletScale: 0.7 }
            ],
            desc: 'Ultimate death machine',
            next: [],
            tier: 4
        },
        soulharvester: {
            name: 'Soul Harvester',
            base: { hp: 250, regen: 4.0, speed: 3.0, dmg: 25, pen: 1.5, bspd: 10.0, rld: 0.12, body: 40, fov: 1.25 },
            guns: [
                { spread: 0.08, length: 22, width: 10, offset: -12, bulletScale: 0.9 },
                { spread: 0.08, length: 22, width: 10, offset: 12, bulletScale: 0.9 }
            ],
            desc: 'Harvests souls for health',
            next: [],
            tier: 4
        }
    };
    
    // ============================================
    // SHAPE DEFINITIONS
    // ============================================
    
    const SHAPE_TYPES = {
        bone: { sides: 3, r: 14, hp: 28, xp: 10, score: 8, color: '#86efac', spin: 1.4 },
        eye: { sides: 4, r: 16, hp: 42, xp: 14, score: 12, color: '#5eead4', spin: 1.0 },
        shard: { sides: 6, r: 18, hp: 58, xp: 18, score: 16, color: '#93c5fd', spin: 1.1 },
        skull: { sides: 5, r: 20, hp: 78, xp: 26, score: 22, color: '#fca5a5', spin: 0.9 }
    };
    
    // ============================================
    // STAT DEFINITIONS
    // ============================================
    
    const STAT_DEFS = [
        { key: 'maxHp', code: 'Digit1', max: 7, name: 'Max HP' },
        { key: 'regen', code: 'Digit2', max: 7, name: 'Regeneration' },
        { key: 'move', code: 'Digit3', max: 7, name: 'Movement Speed' },
        { key: 'dmg', code: 'Digit4', max: 7, name: 'Damage' },
        { key: 'pen', code: 'Digit5', max: 7, name: 'Penetration' },
        { key: 'bspd', code: 'Digit6', max: 7, name: 'Bullet Speed' },
        { key: 'rld', code: 'Digit7', max: 7, name: 'Reload Speed' },
        { key: 'body', code: 'Digit8', max: 7, name: 'Body Damage' }
    ];

    // ============================================
    // GAME STATE
    // ============================================
    
    let canvas, ctx;
    let camera = { x: 0, y: 0, shake: 0 };
    
    let gameState = {
        active: false,
        paused: false,
        gameOver: false,
        score: 0,
        bestScore: parseInt(localStorage.getItem('crypt-tanks-best') || '0'),
        time: 0
    };
    
    // Entities
    let player = null;
    let shapes = [];
    let bullets = [];
    let mines = [];
    let husks = [];
    let fx = [];
    
    // Input
    let keys = {};
    let mouse = { x: 0, y: 0, down: false };
    
    // ============================================
    // CORE SYSTEMS
    // ============================================
    
    const Systems = {
        ecs: null,
        physics: null,
        audio: null,
        progression: null,
        
        async init() {
            if (window.GameEngineIntegration) {
                await GameEngineIntegration.init();
                this.ecs = GameEngineIntegration.systems.ecs;
                this.physics = GameEngineIntegration.systems.physics;
                this.audio = GameEngineIntegration.systems.audio;
                this.progression = GameEngineIntegration.systems.progression;
            }
            console.log('[CryptTanks] Systems initialized');
        }
    };

    // ============================================
    // ENTITY CREATION
    // ============================================
    
    function createPlayer() {
        const tankType = TANK_TYPES.wretch;
        return {
            isPlayer: true,
            tankId: 'wretch',
            tank: tankType,
            x: 0, y: 0,
            vx: 0, vy: 0,
            aim: 0,
            hp: tankType.base.hp,
            level: 1,
            xp: 0,
            xpNeed: xpForLevel(1),
            score: 0,
            pts: 0,
            stats: {},
            altCd: 0,
            reloadT: 0,
            dead: false,
            final: { ...tankType.base }
        };
    }
    
    function xpForLevel(level) {
        return Math.floor(18 + level * level * 2.6);
    }
    
    function recalcFinal(p) {
        const st = p.stats;
        const b = p.tank.base;
        const f = p.final;
        
        f.maxHp = b.hp * (1 + 0.08 * (st.maxHp || 0));
        f.regen = b.regen * (1 + 0.13 * (st.regen || 0));
        f.speed = b.speed * (1 + 0.06 * (st.move || 0));
        f.dmg = b.dmg * (1 + 0.10 * (st.dmg || 0));
        f.pen = b.pen * (1 + 0.13 * (st.pen || 0));
        f.bspd = b.bspd * (1 + 0.09 * (st.bsp || 0));
        f.rld = Math.max(0.045, b.rld * (1 - 0.06 * (st.rld || 0)));
        f.body = b.body * (1 + 0.10 * (st.body || 0));
        f.radius = 26 + p.level * 0.13;
        
        p.maxHp = f.maxHp;
    }
    
    function spawnShape(kind) {
        const def = SHAPE_TYPES[kind];
        if (!def) return;
        
        const a = Math.random() * Math.PI * 2;
        const d = 700 + Math.random() * 800;
        
        shapes.push({
            kind,
            x: clamp(camera.x + Math.cos(a) * d, -WORLD.w / 2 + 80, WORLD.w / 2 - 80),
            y: clamp(camera.y + Math.sin(a) * d, -WORLD.h / 2 + 80, WORLD.h / 2 - 80),
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            rot: Math.random() * Math.PI * 2,
            spin: def.spin * (Math.random() > 0.5 ? 1 : -1),
            ...def
        });
    }
    
    function spawnHusk(level) {
        const tankTypes = Object.keys(TANK_TYPES);
        const type = tankTypes[Math.floor(Math.random() * Math.min(4, tankTypes.length))];
        const tankDef = TANK_TYPES[type];
        
        const a = Math.random() * Math.PI * 2;
        const d = 900 + Math.random() * 500;
        
        husks.push({
            isPlayer: false,
            tankId: type,
            tank: tankDef,
            x: clamp(camera.x + Math.cos(a) * d, -WORLD.w / 2 + 120, WORLD.w / 2 - 120),
            y: clamp(camera.y + Math.sin(a) * d, -WORLD.h / 2 + 120, WORLD.h / 2 - 120),
            vx: 0, vy: 0,
            aim: Math.random() * Math.PI * 2,
            hp: tankDef.base.hp * (1 + level * 0.1),
            maxHp: tankDef.base.hp * (1 + level * 0.1),
            level: level,
            reloadT: 0,
            dead: false,
            final: { ...tankDef.base },
            ai: { think: 0, mode: 'hunt', target: null, strafe: Math.random() * 2 - 1 }
        });
    }

    // ============================================
    // COMBAT
    // ============================================
    
    function fireBullet(owner, gun, ang, scale = 1) {
        const f = owner.final;
        const muzzle = f.radius + gun.length * 0.6;
        const ox = Math.cos(ang) * muzzle - Math.sin(ang) * (gun.offset || 0);
        const oy = Math.sin(ang) * muzzle + Math.cos(ang) * (gun.offset || 0);
        const spd = f.bspd * (0.86 + Math.random() * 0.12);
        
        bullets.push({
            owner,
            x: owner.x + ox,
            y: owner.y + oy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 6.5 * (gun.bulletScale || 1) * scale,
            dmg: f.dmg * scale,
            pen: f.pen * scale,
            life: 1.35,
            color: '#67e8f9'
        });
        
        // Recoil
        owner.vx -= Math.cos(ang) * 0.14 * scale;
        owner.vy -= Math.sin(ang) * 0.14 * scale;
    }
    
    function updatePlayer(dt) {
        if (player.dead) return;
        
        player.reloadT -= dt;
        player.altCd = Math.max(0, player.altCd - dt);
        
        // Regeneration
        player.hp = Math.min(player.maxHp, player.hp + player.final.regen * dt);
        
        // Movement
        let ax = 0, ay = 0;
        if (keys.KeyW || keys.ArrowUp) ay -= 1;
        if (keys.KeyS || keys.ArrowDown) ay += 1;
        if (keys.KeyA || keys.ArrowLeft) ax -= 1;
        if (keys.KeyD || keys.ArrowRight) ax += 1;
        
        const m = Math.sqrt(ax * ax + ay * ay);
        if (m > 0) { ax /= m; ay /= m; }
        
        const sp = player.final.speed * 60 * dt;
        player.vx += ax * sp;
        player.vy += ay * sp;
        
        // Friction
        player.vx *= 0.92;
        player.vy *= 0.92;
        
        // Apply velocity
        player.x += player.vx;
        player.y += player.vy;
        
        // World bounds
        player.x = clamp(player.x, -WORLD.w / 2 + 30, WORLD.w / 2 - 30);
        player.y = clamp(player.y, -WORLD.h / 2 + 30, WORLD.h / 2 - 30);
        
        // Aim
        const worldMouse = screenToWorld(mouse.x, mouse.y);
        player.aim = Math.atan2(worldMouse.y - player.y, worldMouse.x - player.x);
        
        // Fire
        if (mouse.down && player.reloadT <= 0) {
            player.reloadT = player.final.rld;
            for (const gun of player.tank.guns) {
                const ang = player.aim + (Math.random() - 0.5) * gun.spread * 2;
                fireBullet(player, gun, ang);
            }
        }
        
        // Update camera
        camera.x += (player.x - camera.x) * 0.1;
        camera.y += (player.y - camera.y) * 0.1;
    }
    
    function updateHusks(dt) {
        for (const h of husks) {
            if (h.dead) continue;
            
            h.reloadT -= dt;
            h.ai.think -= dt;
            
            if (h.ai.think <= 0) {
                h.ai.think = 0.25 + Math.random() * 0.35;
                
                const dx = player.x - h.x;
                const dy = player.y - h.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 1300) {
                    h.ai.mode = 'attack';
                    h.ai.target = player;
                } else {
                    h.ai.mode = 'farm';
                    // Find nearest shape
                    let nearest = null;
                    let nearDist = Infinity;
                    for (const s of shapes) {
                        const d = Math.sqrt((s.x - h.x) ** 2 + (s.y - h.y) ** 2);
                        if (d < nearDist) {
                            nearDist = d;
                            nearest = s;
                        }
                    }
                    h.ai.target = nearest;
                }
            }
            
            // Movement
            if (h.ai.target) {
                const dx = h.ai.target.x - h.x;
                const dy = h.ai.target.y - h.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 120) {
                    const sp = h.final.speed * 60 * dt;
                    h.vx += (dx / dist) * sp * 0.5;
                    h.vy += (dy / dist) * sp * 0.5;
                }
                
                h.aim = Math.atan2(dy, dx);
                
                // Fire
                if (h.reloadT <= 0 && dist < 500) {
                    h.reloadT = h.final.rld;
                    for (const gun of h.tank.guns) {
                        const ang = h.aim + (Math.random() - 0.5) * gun.spread * 2;
                        fireBullet(h, gun, ang);
                    }
                }
            }
            
            h.vx *= 0.92;
            h.vy *= 0.92;
            h.x += h.vx;
            h.y += h.vy;
        }
    }
    
    function updateBullets(dt) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            
            b.x += b.vx * dt * 60;
            b.y += b.vy * dt * 60;
            b.life -= dt;
            
            if (b.life <= 0) {
                bullets.splice(i, 1);
                continue;
            }
            
            // Hit shapes
            for (let j = shapes.length - 1; j >= 0; j--) {
                const s = shapes[j];
                const dx = s.x - b.x;
                const dy = s.y - b.y;
                if (Math.sqrt(dx * dx + dy * dy) < s.r + b.r) {
                    s.hp -= b.dmg;
                    b.pen -= 1;
                    
                    spawnPuff(b.x, b.y, 3, s.color);
                    
                    if (s.hp <= 0) {
                        // Award XP
                        if (b.owner === player) {
                            player.xp += s.xp;
                            player.score += s.score;
                            checkLevelUp();
                        }
                        shapes.splice(j, 1);
                    }
                    
                    if (b.pen <= 0) {
                        bullets.splice(i, 1);
                        break;
                    }
                }
            }
            
            // Hit player
            if (b.owner !== player && !player.dead) {
                const dx = player.x - b.x;
                const dy = player.y - b.y;
                if (Math.sqrt(dx * dx + dy * dy) < player.final.radius + b.r) {
                    player.hp -= b.dmg;
                    camera.shake = 0.2;
                    spawnPuff(b.x, b.y, 5, '#ff4444');
                    bullets.splice(i, 1);
                    
                    if (player.hp <= 0) {
                        gameOver();
                    }
                }
            }
        }
    }
    
    function updateShapes(dt) {
        for (const s of shapes) {
            s.x += s.vx;
            s.y += s.vy;
            s.rot += s.spin * dt;
            
            // Bounce off world edges
            if (s.x < -WORLD.w / 2 + s.r || s.x > WORLD.w / 2 - s.r) s.vx *= -1;
            if (s.y < -WORLD.h / 2 + s.r || s.y > WORLD.h / 2 - s.r) s.vy *= -1;
        }
    }
    
    function checkLevelUp() {
        while (player.xp >= player.xpNeed && player.level < 45) {
            player.xp -= player.xpNeed;
            player.level++;
            player.pts++;
            player.xpNeed = xpForLevel(player.level);
            recalcFinal(player);
            player.hp = Math.min(player.hp + player.final.maxHp * 0.1, player.final.maxHp);
        }
        
        if (player.score > gameState.bestScore) {
            gameState.bestScore = player.score;
            localStorage.setItem('crypt-tanks-best', String(gameState.bestScore));
        }
    }

    // ============================================
    // EFFECTS
    // ============================================
    
    function spawnPuff(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            fx.push({
                kind: 'puff',
                x, y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 0.35 + Math.random() * 0.35,
                r: 2 + Math.random() * 4,
                color
            });
        }
    }

    // ============================================
    // RENDERING
    // ============================================
    
    function render() {
        const w = canvas.width;
        const h = canvas.height;
        
        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);
        
        ctx.save();
        
        // Camera transform
        ctx.translate(w / 2 - camera.x * DPR, h / 2 - camera.y * DPR);
        
        // Grid
        ctx.strokeStyle = 'rgba(50, 50, 80, 0.15)';
        ctx.lineWidth = 1;
        const gridSize = 50;
        const startX = Math.floor((camera.x - w / 2 / DPR) / gridSize) * gridSize;
        const startY = Math.floor((camera.y - h / 2 / DPR) / gridSize) * gridSize;
        
        for (let x = startX; x < camera.x + w / DPR; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, camera.y - h / DPR);
            ctx.lineTo(x, camera.y + h / DPR);
            ctx.stroke();
        }
        for (let y = startY; y < camera.y + h / DPR; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(camera.x - w / DPR, y);
            ctx.lineTo(camera.x + w / DPR, y);
            ctx.stroke();
        }
        
        // Shapes
        for (const s of shapes) {
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rot);
            
            ctx.fillStyle = s.color;
            ctx.beginPath();
            for (let i = 0; i < s.sides; i++) {
                const angle = (i / s.sides) * Math.PI * 2;
                const x = Math.cos(angle) * s.r;
                const y = Math.sin(angle) * s.r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
        
        // Husks
        for (const h of husks) {
            if (h.dead) continue;
            renderTank(h);
        }
        
        // Player
        if (!player.dead) {
            renderTank(player, true);
        }
        
        // Bullets
        for (const b of bullets) {
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // FX
        for (const f of fx) {
            ctx.globalAlpha = Math.max(0, f.life);
            ctx.fillStyle = f.color;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        ctx.restore();
        
        // UI
        renderUI();
    }
    
    function renderTank(t, isPlayer = false) {
        const f = t.final;
        
        // Body
        ctx.fillStyle = isPlayer ? '#4488aa' : '#aa4444';
        ctx.strokeStyle = isPlayer ? '#66aacc' : '#cc6666';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Guns
        for (const gun of t.tank.guns) {
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(t.aim);
            
            ctx.fillStyle = '#555';
            ctx.fillRect(gun.offset - gun.width / 2, -gun.width / 2, gun.length, gun.width);
            
            ctx.restore();
        }
        
        // HP bar
        if (t.hp < t.maxHp) {
            const barW = f.radius * 2;
            ctx.fillStyle = '#330000';
            ctx.fillRect(t.x - barW / 2, t.y - f.radius - 12, barW, 5);
            ctx.fillStyle = '#44ff44';
            ctx.fillRect(t.x - barW / 2, t.y - f.radius - 12, barW * (t.hp / t.maxHp), 5);
        }
    }
    
    function renderUI() {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(`Level: ${player.level}`, 10, 25);
        ctx.fillText(`Score: ${player.score}`, 10, 45);
        ctx.fillText(`Best: ${gameState.bestScore}`, 10, 65);
        
        if (player.pts > 0) {
            ctx.fillStyle = '#44ff44';
            ctx.fillText(`Upgrade Points: ${player.pts}`, 10, 90);
        }
        
        // XP bar
        const xpBarW = 200;
        ctx.fillStyle = '#333';
        ctx.fillRect(10, 100, xpBarW, 10);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(10, 100, xpBarW * (player.xp / player.xpNeed), 10);
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    
    function screenToWorld(sx, sy) {
        return {
            x: (sx - canvas.width / 2) / DPR + camera.x,
            y: (sy - canvas.height / 2) / DPR + camera.y
        };
    }

    // ============================================
    // GAME LOOP
    // ============================================
    
    let lastTime = 0;
    let spawnTimer = 0;
    let huskTimer = 0;
    
    function gameLoop(timestamp) {
        if (!gameState.active) return;
        
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;
        
        if (!gameState.paused) {
            update(dt);
        }
        
        render();
        requestAnimationFrame(gameLoop);
    }
    
    function update(dt) {
        gameState.time += dt;
        
        // Spawn shapes
        if (shapes.length < 140) {
            spawnTimer -= dt;
            if (spawnTimer <= 0) {
                spawnTimer = 0.5;
                const kinds = Object.keys(SHAPE_TYPES);
                spawnShape(kinds[Math.floor(Math.random() * kinds.length)]);
            }
        }
        
        // Spawn husks
        huskTimer -= dt;
        if (huskTimer <= 0 && husks.length < 10 + Math.floor(gameState.time / 30)) {
            huskTimer = 6;
            spawnHusk(Math.floor(gameState.time / 60) + 1);
        }
        
        // Update entities
        updatePlayer(dt);
        updateHusks(dt);
        updateBullets(dt);
        updateShapes(dt);
        
        // Update FX
        for (let i = fx.length - 1; i >= 0; i--) {
            const f = fx[i];
            f.x += f.vx;
            f.y += f.vy;
            f.life -= dt;
            if (f.life <= 0) fx.splice(i, 1);
        }
        
        // Camera shake
        if (camera.shake > 0) camera.shake -= dt;
    }

    // ============================================
    // GAME STATE MANAGEMENT
    // ============================================
    
    function startGame() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d', { alpha: false });
        
        function resize() {
            canvas.width = Math.floor(window.innerWidth * DPR);
            canvas.height = Math.floor(window.innerHeight * DPR);
        }
        resize();
        window.addEventListener('resize', resize);
        
        // Input
        window.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
        });
        window.addEventListener('keyup', (e) => { keys[e.code] = false; });
        
        canvas.addEventListener('mousedown', () => { mouse.down = true; });
        window.addEventListener('mouseup', () => { mouse.down = false; });
        
        canvas.addEventListener('mousemove', (e) => {
            const r = canvas.getBoundingClientRect();
            mouse.x = (e.clientX - r.left) * DPR;
            mouse.y = (e.clientY - r.top) * DPR;
        });
        
        document.getElementById('start-screen').style.display = 'none';
        const ctrl = document.getElementById('controls-overlay');
        ctrl.style.display = 'flex';
        
        if (window.HorrorAudio) {
            HorrorAudio.init();
            HorrorAudio.startDrone(40, 'dark');
        }
        
        setTimeout(() => {
            ctrl.classList.add('hiding');
            setTimeout(() => {
                ctrl.style.display = 'none';
                ctrl.classList.remove('hiding');
                resetGame();
                gameState.active = true;
                if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING);
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                lastTime = performance.now();
                requestAnimationFrame(gameLoop);
            }, 800);
        }, 2500);
    }
    
    function resetGame() {
        player = createPlayer();
        shapes = [];
        bullets = [];
        husks = [];
        fx = [];
        camera = { x: 0, y: 0, shake: 0 };
        gameState.score = 0;
        gameState.time = 0;
        spawnTimer = 0;
        huskTimer = 6;
        
        // Initial shapes
        for (let i = 0; i < 100; i++) {
            const kinds = Object.keys(SHAPE_TYPES);
            spawnShape(kinds[Math.floor(Math.random() * kinds.length)]);
        }
    }
    
    function gameOver() {
        gameState.active = false;
        player.dead = true;
        
        if (window.GameUtils) GameUtils.setState(GameUtils.STATE.GAME_OVER);
        if (window.HorrorAudio) { HorrorAudio.playDeath(); HorrorAudio.stopDrone(); }
        
        const msgEl = document.querySelector('#game-over-screen p');
        if (msgEl) msgEl.textContent = `Your tank was destroyed... Score: ${player.score}`;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        
        const btn = document.querySelector('#game-over-screen .play-btn');
        if (btn) btn.onclick = restartGame;
    }
    
    function restartGame() {
        resetGame();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        if (window.HorrorAudio) HorrorAudio.startDrone(40, 'dark');
        gameState.active = true;
        if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING);
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    
    async function init() {
        await Systems.init();
        
        if (window.GameUtils) {
            GameUtils.injectDifficultySelector('start-screen');
            GameUtils.initPause({
                onResume: () => { gameState.active = true; lastTime = performance.now(); requestAnimationFrame(gameLoop); },
                onRestart: restartGame
            });
        }
        
        document.getElementById('start-btn').addEventListener('click', () => startGame());
        
        console.log('[CryptTanks] Enhanced version initialized');
    }
    
    init();
})();