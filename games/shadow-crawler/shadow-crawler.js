/* ============================================
   Shadow Crawler — 2D Top-Down Horror Dungeon
   OVERHAULED: Procedural dungeons, 6 enemy types,
   inventory, traps, bosses, torch upgrades, minimap
   ============================================ */

(function () {
    'use strict';

    var canvas = document.getElementById('game-canvas');
    var ctx = canvas.getContext('2d');

    // ── Constants ──────────────────────────────────────
    var TILE = 40;
    var LIGHT_RADIUS = 160;
    var MAX_LEVELS = 10;

    // Cell types: 0=floor, 1=wall, 2=key, 3=player, 4=exit, 5=enemy,
    // 6=trap_spikes, 7=torch_pickup, 8=health_potion, 9=shield, 10=boss

    // ── Player State ──────────────────────────────────
    var player = { x: 0, y: 0, speed: 3, hp: 100, maxHp: 100, shield: 0, invincTimer: 0, facing: 0 };
    var inventory = { keys: 0, torches: 0, potions: 0, shields: 0, coins: 0 };
    var stats = { kills: 0, levelsCleared: 0, totalCoins: 0, damageDealt: 0 };

    // ── Game State ─────────────────────────────────────
    var currentLevel = 0;
    var enemies = [];
    var particles = [];
    var traps = [];
    var pickups = [];
    var total_keys = 0;
    var torchLevel = 100;
    var torchMax = 100;
    var gameActive = false;
    var keysPressed = {};
    var maze = [];
    var mazeW = 0, mazeH = 0;
    var exitPos = { x: 0, y: 0 };
    var cameraOffset = { x: 0, y: 0 };
    var flickerTimer = 0;
    var survivalTime = 0;
    var bossActive = false;
    var screenShake = 0;
    var damageFlash = 0;
    var msgQueue = [];
    var msgTimer = 0;
    var lastTime = 0;
    var footstepTimer = 0;

    // ── Minimap ────────────────────────────────────────
    var minimapCanvas = null;
    var minimapCtx = null;
    var explored = [];

    // ── Setup ──────────────────────────────────────────
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    document.addEventListener('keydown', function (e) {
        keysPressed[e.code] = true;
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); }
        if (e.code === 'KeyE' && gameActive) usePotion();
        if (e.code === 'Space' && gameActive) playerAttack();
    });
    document.addEventListener('keyup', function (e) { keysPressed[e.code] = false; });
    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.getElementById('fullscreen-btn').addEventListener('click', function () { GameUtils.toggleFullscreen(); });

    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING); lastTime = performance.now(); },
        onRestart: function () { currentLevel = 0; stats = { kills: 0, levelsCleared: 0, totalCoins: 0, damageDealt: 0 }; inventory = { keys: 0, torches: 0, potions: 0, shields: 0, coins: 0 }; player.hp = player.maxHp; restartLevel(); }
    });

    // ── Procedural Dungeon Generator ──────────────────
    function generateDungeon(level) {
        var w = 17 + Math.min(level * 2, 12);
        var h = 13 + Math.min(level * 2, 10);
        if (w % 2 === 0) w++;
        if (h % 2 === 0) h++;
        mazeW = w; mazeH = h;

        // Fill with walls
        var grid = [];
        for (var r = 0; r < h; r++) { grid[r] = []; for (var c = 0; c < w; c++) grid[r][c] = 1; }

        // Recursive backtracker
        function carve(r, c) {
            grid[r][c] = 0;
            var dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
            shuffle(dirs);
            for (var i = 0; i < dirs.length; i++) {
                var nr = r + dirs[i][0], nc = c + dirs[i][1];
                if (nr > 0 && nr < h - 1 && nc > 0 && nc < w - 1 && grid[nr][nc] === 1) {
                    grid[r + dirs[i][0] / 2][c + dirs[i][1] / 2] = 0;
                    carve(nr, nc);
                }
            }
        }
        carve(1, 1);

        // Open extra passages for playability
        var extraPaths = 8 + level * 3;
        for (var i = 0; i < extraPaths; i++) {
            var r = 2 + Math.floor(Math.random() * (h - 4));
            var c = 2 + Math.floor(Math.random() * (w - 4));
            if (grid[r][c] === 1) {
                var adj = 0;
                if (r > 0 && grid[r - 1][c] === 0) adj++;
                if (r < h - 1 && grid[r + 1][c] === 0) adj++;
                if (c > 0 && grid[r][c - 1] === 0) adj++;
                if (c < w - 1 && grid[r][c + 1] === 0) adj++;
                if (adj >= 2) grid[r][c] = 0;
            }
        }

        // Place player start
        grid[1][1] = 3;

        // Place exit far from start
        var bestDist = 0, exitR = h - 2, exitC = w - 2;
        for (var r = 1; r < h - 1; r++) {
            for (var c = 1; c < w - 1; c++) {
                if (grid[r][c] === 0) {
                    var d = Math.abs(r - 1) + Math.abs(c - 1);
                    if (d > bestDist) { bestDist = d; exitR = r; exitC = c; }
                }
            }
        }
        grid[exitR][exitC] = 4;

        // Place keys
        var numKeys = 3 + Math.floor(level * 0.8);
        placeItems(grid, 2, numKeys, w, h);

        // Place enemies (varied types encoded in enemy array, cell=5 is generic marker)
        var numEnemies = 2 + level + Math.floor(level / 2);
        placeItems(grid, 5, numEnemies, w, h);

        // Place traps
        var numTraps = 1 + Math.floor(level * 0.7);
        placeItems(grid, 6, numTraps, w, h);

        // Place torch pickups
        placeItems(grid, 7, 2 + Math.floor(level / 3), w, h);

        // Place health potions
        placeItems(grid, 8, 1 + Math.floor(level / 2), w, h);

        // Place shield pickups
        if (level >= 2) placeItems(grid, 9, 1, w, h);

        // Boss on every 3rd level
        if (level > 0 && level % 3 === 2) {
            placeItems(grid, 10, 1, w, h);
        }

        return grid;
    }

    function placeItems(grid, type, count, w, h) {
        var placed = 0, tries = 0;
        while (placed < count && tries < 500) {
            var r = 1 + Math.floor(Math.random() * (h - 2));
            var c = 1 + Math.floor(Math.random() * (w - 2));
            if (grid[r][c] === 0) { grid[r][c] = type; placed++; }
            tries++;
        }
    }

    function shuffle(arr) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } }

    // ── Enemy Types ───────────────────────────────────
    // 0=Shadow Wraith, 1=Bone Stalker, 2=Phantom, 3=Lurker, 4=Screamer, 5=Devourer(boss)
    var ENEMY_TYPES = [
        { name: 'Shadow Wraith', color: '#6600aa', chaseColor: '#aa00ff', speed: 1.2, hp: 2, dmg: 15, size: 12, behavior: 'patrol', xp: 10 },
        { name: 'Bone Stalker', color: '#887744', chaseColor: '#ccaa44', speed: 1.6, hp: 3, dmg: 20, size: 14, behavior: 'ambush', xp: 15 },
        { name: 'Phantom', color: '#224466', chaseColor: '#4488cc', speed: 2.0, hp: 1, dmg: 10, size: 10, behavior: 'phase', xp: 12 },
        { name: 'Lurker', color: '#333300', chaseColor: '#666600', speed: 0.8, hp: 5, dmg: 25, size: 16, behavior: 'ambush', xp: 20 },
        { name: 'Screamer', color: '#880000', chaseColor: '#ff0000', speed: 1.4, hp: 2, dmg: 12, size: 11, behavior: 'screamer', xp: 18 },
        { name: 'Devourer', color: '#440044', chaseColor: '#ff00ff', speed: 1.0, hp: 20, dmg: 30, size: 24, behavior: 'boss', xp: 100 }
    ];

    // ── Load Level ─────────────────────────────────────
    function loadLevel(level) {
        maze = generateDungeon(level);
        enemies = [];
        traps = [];
        pickups = [];
        particles = [];
        total_keys = 0;
        inventory.keys = 0;
        survivalTime = 0;
        bossActive = false;

        // Init explored map
        explored = [];
        for (var r = 0; r < mazeH; r++) { explored[r] = []; for (var c = 0; c < mazeW; c++) explored[r][c] = false; }

        for (var r = 0; r < mazeH; r++) {
            for (var c = 0; c < mazeW; c++) {
                var cell = maze[r][c];
                var cx = c * TILE + TILE / 2, cy = r * TILE + TILE / 2;
                if (cell === 3) { player.x = cx; player.y = cy; maze[r][c] = 0; }
                if (cell === 2) total_keys++;
                if (cell === 4) { exitPos.x = cx; exitPos.y = cy; }
                if (cell === 5) {
                    var typeIdx = Math.min(Math.floor(Math.random() * Math.min(level + 2, 5)), 4);
                    var et = ENEMY_TYPES[typeIdx];
                    enemies.push({
                        x: cx, y: cy, type: typeIdx,
                        hp: et.hp, maxHp: et.hp,
                        speed: et.speed * (1 + level * 0.05),
                        dir: Math.random() * Math.PI * 2,
                        chasing: false, patrolTimer: 0,
                        phaseTimer: 0, screamCooldown: 0,
                        stunTimer: 0, hitFlash: 0,
                        spawnX: cx, spawnY: cy
                    });
                    maze[r][c] = 0;
                }
                if (cell === 6) { traps.push({ x: cx, y: cy, type: 'spikes', active: true, timer: 0, phase: Math.random() * Math.PI * 2 }); maze[r][c] = 0; }
                if (cell === 7) { pickups.push({ x: cx, y: cy, type: 'torch', collected: false }); maze[r][c] = 0; }
                if (cell === 8) { pickups.push({ x: cx, y: cy, type: 'potion', collected: false }); maze[r][c] = 0; }
                if (cell === 9) { pickups.push({ x: cx, y: cy, type: 'shield', collected: false }); maze[r][c] = 0; }
                if (cell === 10) {
                    var boss = ENEMY_TYPES[5];
                    enemies.push({
                        x: cx, y: cy, type: 5,
                        hp: boss.hp + level * 5, maxHp: boss.hp + level * 5,
                        speed: boss.speed, dir: 0,
                        chasing: false, patrolTimer: 0,
                        phaseTimer: 0, screamCooldown: 0,
                        stunTimer: 0, hitFlash: 0,
                        spawnX: cx, spawnY: cy
                    });
                    bossActive = true;
                    maze[r][c] = 0;
                }
            }
        }

        // Init minimap
        if (!minimapCanvas) {
            minimapCanvas = document.createElement('canvas');
            minimapCtx = minimapCanvas.getContext('2d');
        }
        minimapCanvas.width = mazeW * 3;
        minimapCanvas.height = mazeH * 3;

        updateHUD();
        showMessage('Level ' + (level + 1) + ' — ' + (bossActive ? '⚠ BOSS LEVEL!' : 'Find ' + total_keys + ' keys'));
    }

    // ── Messages ──────────────────────────────────────
    function showMessage(text) { msgQueue.push(text); if (msgQueue.length === 1) msgTimer = 3; }

    // ── HUD ───────────────────────────────────────────
    function updateHUD() {
        var keysEl = document.getElementById('hud-keys');
        var torchEl = document.getElementById('hud-torch');
        var levelEl = document.getElementById('hud-level');
        if (keysEl) keysEl.textContent = '🔑 ' + inventory.keys + '/' + total_keys;
        if (torchEl) {
            torchEl.textContent = '🔥 ' + Math.round(torchLevel) + '%';
            torchEl.style.color = torchLevel > 50 ? '#ffaa00' : torchLevel > 25 ? '#ff6600' : '#ff0000';
        }
        if (levelEl) levelEl.textContent = 'Lv ' + (currentLevel + 1) + ' | HP:' + Math.round(player.hp) + ' | 💰' + inventory.coins + (player.shield > 0 ? ' | 🛡' + Math.round(player.shield) : '');
    }

    // ── Collision ─────────────────────────────────────
    function isWall(px, py) {
        var col = Math.floor(px / TILE), row = Math.floor(py / TILE);
        if (row < 0 || row >= mazeH || col < 0 || col >= mazeW) return true;
        return maze[row][col] === 1;
    }
    function canMove(px, py, s) { s = s || 8; return !isWall(px - s, py - s) && !isWall(px + s, py - s) && !isWall(px - s, py + s) && !isWall(px + s, py + s); }

    // ── Player Attack ─────────────────────────────────
    function playerAttack() {
        var range = 50;
        var attacked = false;
        for (var i = enemies.length - 1; i >= 0; i--) {
            var e = enemies[i];
            var dx = e.x - player.x, dy = e.y - player.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < range) {
                e.hp--;
                e.hitFlash = 0.2;
                e.stunTimer = 0.3;
                stats.damageDealt++;
                spawnParticles(e.x, e.y, ENEMY_TYPES[e.type].chaseColor, 5);
                HorrorAudio.playHit && HorrorAudio.playHit();
                attacked = true;
                if (e.hp <= 0) {
                    inventory.coins += ENEMY_TYPES[e.type].xp;
                    stats.kills++;
                    stats.totalCoins += ENEMY_TYPES[e.type].xp;
                    spawnParticles(e.x, e.y, '#ffcc00', 12);
                    showMessage(ENEMY_TYPES[e.type].name + ' slain! +' + ENEMY_TYPES[e.type].xp + '💰');
                    enemies.splice(i, 1);
                    if (e.type === 5) { bossActive = false; showMessage('🏆 BOSS DEFEATED!'); }
                }
            }
        }
        if (!attacked) {
            // Attack visual
            spawnParticles(player.x + Math.cos(player.facing) * 20, player.y + Math.sin(player.facing) * 20, '#aaaacc', 3);
        }
    }

    // ── Use Potion ────────────────────────────────────
    function usePotion() {
        if (inventory.potions > 0 && player.hp < player.maxHp) {
            inventory.potions--;
            player.hp = Math.min(player.maxHp, player.hp + 40);
            showMessage('❤️ Used potion! HP restored');
            spawnParticles(player.x, player.y, '#ff4444', 8);
        }
    }

    // ── Particles ─────────────────────────────────────
    function spawnParticles(x, y, color, count) {
        for (var i = 0; i < count; i++) {
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                life: 0.5 + Math.random() * 0.5,
                maxLife: 0.5 + Math.random() * 0.5,
                color: color,
                size: 2 + Math.random() * 3
            });
        }
    }

    // ── Damage Player ─────────────────────────────────
    function damagePlayer(amount) {
        if (player.invincTimer > 0) return;
        if (player.shield > 0) {
            var absorbed = Math.min(player.shield, amount);
            player.shield -= absorbed;
            amount -= absorbed;
        }
        player.hp -= amount;
        player.invincTimer = 0.8;
        damageFlash = 0.3;
        screenShake = 0.2;
        if (navigator.vibrate) navigator.vibrate(100);
        if (player.hp <= 0) { player.hp = 0; gameOver(); }
    }

    // ── Update ────────────────────────────────────────
    function update(dt) {
        if (!gameActive) return;
        survivalTime += dt;
        if (window.ChallengeManager) ChallengeManager.notify('shadow-crawler', 'survival_time', survivalTime);

        // Player movement
        var sprinting = keysPressed['ShiftLeft'] || keysPressed['ShiftRight'];
        var speed = (sprinting ? player.speed * 1.8 : player.speed) * TILE;
        var mx = 0, my = 0;
        if (keysPressed['KeyW'] || keysPressed['ArrowUp']) my -= 1;
        if (keysPressed['KeyS'] || keysPressed['ArrowDown']) my += 1;
        if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) mx -= 1;
        if (keysPressed['KeyD'] || keysPressed['ArrowRight']) mx += 1;
        var len = Math.sqrt(mx * mx + my * my);
        if (len > 0) {
            mx = (mx / len) * speed * dt; my = (my / len) * speed * dt;
            if (canMove(player.x + mx, player.y)) player.x += mx;
            if (canMove(player.x, player.y + my)) player.y += my;
            player.facing = Math.atan2(my, mx);
            footstepTimer -= dt;
            if (footstepTimer <= 0) { HorrorAudio.playFootstep('stone'); footstepTimer = sprinting ? 0.22 : 0.4; }
        }

        // Torch drain
        torchLevel -= (sprinting ? 0.12 : 0.015) * dt * 60 * GameUtils.getMultiplier();
        if (torchLevel <= 0) { torchLevel = 0; damagePlayer(5 * dt * 60); }
        flickerTimer += dt;

        // Invincibility timer
        if (player.invincTimer > 0) player.invincTimer -= dt;
        if (damageFlash > 0) damageFlash -= dt;
        if (screenShake > 0) screenShake -= dt;

        // Message timer
        if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) { msgQueue.shift(); if (msgQueue.length > 0) msgTimer = 3; } }

        // Update explored
        var pr = Math.floor(player.y / TILE), pc = Math.floor(player.x / TILE);
        for (var dr = -3; dr <= 3; dr++) for (var dc = -3; dc <= 3; dc++) {
            var er = pr + dr, ec = pc + dc;
            if (er >= 0 && er < mazeH && ec >= 0 && ec < mazeW) explored[er][ec] = true;
        }

        // Key collection
        if (pr >= 0 && pr < mazeH && pc >= 0 && pc < mazeW && maze[pr][pc] === 2) {
            maze[pr][pc] = 0; inventory.keys++;
            torchLevel = Math.min(torchMax, torchLevel + 12);
            HorrorAudio.playCollect();
            spawnParticles(player.x, player.y, '#FFD700', 8);
            showMessage('🔑 Key found! (' + inventory.keys + '/' + total_keys + ')');
            if (window.ChallengeManager) ChallengeManager.notify('shadow-crawler', 'keys_found', 1);
        }

        // Pickup collection
        for (var i = pickups.length - 1; i >= 0; i--) {
            var p = pickups[i];
            if (p.collected) continue;
            var pdx = player.x - p.x, pdy = player.y - p.y;
            if (Math.sqrt(pdx * pdx + pdy * pdy) < TILE * 0.5) {
                p.collected = true;
                if (p.type === 'torch') { torchLevel = Math.min(torchMax, torchLevel + 30); inventory.torches++; showMessage('🔥 Torch refueled! +30%'); spawnParticles(p.x, p.y, '#ffaa00', 6); }
                if (p.type === 'potion') { inventory.potions++; showMessage('🧪 Health potion collected! (E to use)'); spawnParticles(p.x, p.y, '#ff4444', 6); }
                if (p.type === 'shield') { player.shield = Math.min(50, player.shield + 25); inventory.shields++; showMessage('🛡️ Shield activated!'); spawnParticles(p.x, p.y, '#4488ff', 6); }
                HorrorAudio.playCollect();
            }
        }

        // Exit check
        if (inventory.keys >= total_keys && !bossActive) {
            var dx = player.x - exitPos.x, dy = player.y - exitPos.y;
            if (Math.sqrt(dx * dx + dy * dy) < TILE * 0.6) { levelComplete(); return; }
        }

        // Trap updates
        for (var i = 0; i < traps.length; i++) {
            var t = traps[i];
            t.timer += dt;
            var active = Math.sin(t.timer * 2 + t.phase) > 0.3;
            t.active = active;
            if (active) {
                var tdx = player.x - t.x, tdy = player.y - t.y;
                if (Math.sqrt(tdx * tdx + tdy * tdy) < TILE * 0.4) {
                    damagePlayer(8 * GameUtils.getMultiplier());
                    spawnParticles(t.x, t.y, '#ff4444', 4);
                }
            }
        }

        // Enemy updates
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            var et = ENEMY_TYPES[e.type];
            if (e.stunTimer > 0) { e.stunTimer -= dt; continue; }
            if (e.hitFlash > 0) e.hitFlash -= dt;

            var edx = player.x - e.x, edy = player.y - e.y;
            var eDist = Math.sqrt(edx * edx + edy * edy);
            var detectRange = LIGHT_RADIUS * (torchLevel / 100) * 1.5;

            // Behavior
            if (et.behavior === 'patrol' || et.behavior === 'boss') {
                e.chasing = eDist < detectRange;
            } else if (et.behavior === 'ambush') {
                e.chasing = eDist < detectRange * 0.6;
            } else if (et.behavior === 'phase') {
                e.chasing = eDist < detectRange;
                e.phaseTimer += dt;
            } else if (et.behavior === 'screamer') {
                e.chasing = eDist < detectRange;
                if (e.chasing && e.screamCooldown <= 0) {
                    // Scream effect: brief torch reduction
                    torchLevel = Math.max(5, torchLevel - 10);
                    screenShake = 0.3;
                    e.screamCooldown = 8;
                    showMessage('⚡ ' + et.name + ' SCREAMS!');
                }
                if (e.screamCooldown > 0) e.screamCooldown -= dt;
            }

            var espeed = e.chasing ? et.speed * 1.5 * GameUtils.getMultiplier() : et.speed * 0.5;
            if (et.behavior === 'boss') espeed *= 0.8;

            if (e.chasing) {
                var angle = Math.atan2(edy, edx);
                var canPhase = et.behavior === 'phase' && Math.sin(e.phaseTimer * 3) > 0.5;
                var nx = e.x + Math.cos(angle) * espeed * TILE * dt;
                var ny = e.y + Math.sin(angle) * espeed * TILE * dt;
                if (canPhase || canMove(nx, e.y, 6)) e.x = nx;
                if (canPhase || canMove(e.x, ny, 6)) e.y = ny;
            } else {
                e.patrolTimer -= dt;
                if (e.patrolTimer <= 0) { e.dir = Math.random() * Math.PI * 2; e.patrolTimer = 1 + Math.random() * 2; }
                var nx = e.x + Math.cos(e.dir) * espeed * TILE * dt;
                var ny = e.y + Math.sin(e.dir) * espeed * TILE * dt;
                if (canMove(nx, ny, 6)) { e.x = nx; e.y = ny; } else { e.dir = Math.random() * Math.PI * 2; }
            }

            // Boss special: spawn minions
            if (et.behavior === 'boss' && e.hp < e.maxHp * 0.5 && Math.random() < 0.005) {
                var mType = Math.floor(Math.random() * 3);
                var mt = ENEMY_TYPES[mType];
                enemies.push({
                    x: e.x + (Math.random() - 0.5) * 60, y: e.y + (Math.random() - 0.5) * 60,
                    type: mType, hp: mt.hp, maxHp: mt.hp, speed: mt.speed,
                    dir: Math.random() * Math.PI * 2, chasing: true, patrolTimer: 0,
                    phaseTimer: 0, screamCooldown: 0, stunTimer: 0, hitFlash: 0,
                    spawnX: e.x, spawnY: e.y
                });
                showMessage('⚠ Boss summoned a ' + mt.name + '!');
            }

            if (eDist < TILE * 0.4) damagePlayer(et.dmg);
        }

        // Particles
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Camera
        cameraOffset.x += (player.x - canvas.width / 2 - cameraOffset.x) * 6 * dt;
        cameraOffset.y += (player.y - canvas.height / 2 - cameraOffset.y) * 6 * dt;
        if (screenShake > 0) {
            cameraOffset.x += (Math.random() - 0.5) * 8;
            cameraOffset.y += (Math.random() - 0.5) * 8;
        }

        updateHUD();
    }

    // ── Render ─────────────────────────────────────────
    function render() {
        var w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
        if (!maze.length) return;
        ctx.save();
        ctx.translate(-cameraOffset.x, -cameraOffset.y);

        var startCol = Math.max(0, Math.floor(cameraOffset.x / TILE));
        var endCol = Math.min(mazeW, Math.ceil((cameraOffset.x + w) / TILE) + 1);
        var startRow = Math.max(0, Math.floor(cameraOffset.y / TILE));
        var endRow = Math.min(mazeH, Math.ceil((cameraOffset.y + h) / TILE) + 1);

        // Draw tiles
        for (var r = startRow; r < endRow; r++) {
            for (var c = startCol; c < endCol; c++) {
                var x = c * TILE, y = r * TILE, cell = maze[r][c];
                if (cell === 1) {
                    ctx.fillStyle = '#1a1030'; ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = '#2a1848'; ctx.lineWidth = 1; ctx.strokeRect(x, y, TILE, TILE);
                    // Brick detail
                    ctx.fillStyle = '#221440';
                    ctx.fillRect(x + 2, y + 2, TILE / 2 - 2, TILE / 2 - 2);
                    ctx.fillRect(x + TILE / 2 + 1, y + TILE / 2 + 1, TILE / 2 - 3, TILE / 2 - 3);
                } else {
                    ctx.fillStyle = '#0a0814'; ctx.fillRect(x, y, TILE, TILE);
                    // Floor detail
                    if ((r + c) % 3 === 0) { ctx.fillStyle = '#0c0a18'; ctx.fillRect(x, y, TILE, TILE); }
                }

                // Keys
                if (cell === 2) {
                    var bob = Math.sin(Date.now() * 0.003 + c) * 3;
                    ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 12;
                    ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2 + bob, 6, 0, Math.PI * 2); ctx.fill();
                    ctx.fillRect(x + TILE / 2 - 1, y + TILE / 2 + bob, 2, 10);
                    ctx.fillRect(x + TILE / 2, y + TILE / 2 + bob + 7, 5, 2);
                    ctx.shadowBlur = 0;
                }

                // Exit
                if (cell === 4) {
                    var canExit = inventory.keys >= total_keys && !bossActive;
                    var pulse = Math.sin(Date.now() * 0.005) * 0.15 + 0.3;
                    ctx.fillStyle = canExit ? 'rgba(0,255,136,' + pulse + ')' : 'rgba(100,50,50,' + pulse + ')';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = canExit ? '#00ff88' : '#663333'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
                    ctx.fillStyle = canExit ? '#00ff88' : '#663333'; ctx.font = '11px Inter'; ctx.textAlign = 'center'; ctx.fillText('EXIT', x + TILE / 2, y + TILE / 2 + 4);
                }
            }
        }

        // Traps
        for (var i = 0; i < traps.length; i++) {
            var t = traps[i];
            if (t.active) {
                ctx.fillStyle = 'rgba(255,60,0,0.6)'; ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 8;
                for (var s = 0; s < 4; s++) {
                    var sx = t.x - 8 + (s % 2) * 16, sy = t.y - 8 + Math.floor(s / 2) * 16;
                    ctx.beginPath(); ctx.moveTo(sx, sy + 5); ctx.lineTo(sx - 3, sy - 5); ctx.lineTo(sx + 3, sy - 5); ctx.fill();
                }
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = 'rgba(100,40,0,0.3)';
                ctx.fillRect(t.x - 10, t.y - 10, 20, 20);
            }
        }

        // Pickups
        for (var i = 0; i < pickups.length; i++) {
            var p = pickups[i];
            if (p.collected) continue;
            var bob = Math.sin(Date.now() * 0.004 + i) * 3;
            if (p.type === 'torch') {
                ctx.fillStyle = '#ff8800'; ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 10;
                ctx.fillRect(p.x - 2, p.y + bob - 8, 4, 16);
                ctx.beginPath(); ctx.arc(p.x, p.y + bob - 10, 5, 0, Math.PI * 2); ctx.fill();
            } else if (p.type === 'potion') {
                ctx.fillStyle = '#ff3366'; ctx.shadowColor = '#ff0044'; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.arc(p.x, p.y + bob, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ff6688'; ctx.fillRect(p.x - 3, p.y + bob - 10, 6, 4);
            } else if (p.type === 'shield') {
                ctx.fillStyle = '#4488ff'; ctx.shadowColor = '#2266dd'; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.moveTo(p.x, p.y + bob - 10); ctx.lineTo(p.x + 8, p.y + bob); ctx.lineTo(p.x, p.y + bob + 8); ctx.lineTo(p.x - 8, p.y + bob); ctx.closePath(); ctx.fill();
            }
            ctx.shadowBlur = 0;
        }

        // Enemies
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            var et = ENEMY_TYPES[e.type];
            var col = e.hitFlash > 0 ? '#ffffff' : (e.chasing ? et.chaseColor : et.color);
            ctx.fillStyle = col;
            ctx.shadowColor = e.chasing ? et.chaseColor : et.color;
            ctx.shadowBlur = e.chasing ? 20 : 10;
            var wobble = Math.sin(Date.now() * 0.005 + i) * 3;
            var sz = et.size;
            ctx.beginPath(); ctx.ellipse(e.x, e.y, sz + wobble, sz - wobble / 2, 0, 0, Math.PI * 2); ctx.fill();
            if (e.chasing) {
                ctx.fillStyle = '#ff3333'; ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(e.x - sz * 0.3, e.y - sz * 0.2, 2, 0, Math.PI * 2); ctx.arc(e.x + sz * 0.3, e.y - sz * 0.2, 2, 0, Math.PI * 2); ctx.fill();
            }
            // HP bar for tough enemies
            if (et.hp > 2 || e.type === 5) {
                var barW = sz * 2, barH = 3;
                ctx.fillStyle = '#333'; ctx.fillRect(e.x - barW / 2, e.y - sz - 8, barW, barH);
                ctx.fillStyle = e.type === 5 ? '#ff00ff' : '#ff4444';
                ctx.fillRect(e.x - barW / 2, e.y - sz - 8, barW * (e.hp / e.maxHp), barH);
            }
            ctx.shadowBlur = 0;
        }

        // Player
        var playerAlpha = player.invincTimer > 0 ? (Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.3) : 1;
        ctx.globalAlpha = playerAlpha;
        ctx.fillStyle = '#aaaacc'; ctx.beginPath(); ctx.arc(player.x, player.y, 8, 0, Math.PI * 2); ctx.fill();
        // Sword indicator
        var swordX = player.x + Math.cos(player.facing) * 14;
        var swordY = player.y + Math.sin(player.facing) * 14;
        ctx.strokeStyle = '#8888bb'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(player.x + Math.cos(player.facing) * 10, player.y + Math.sin(player.facing) * 10);
        ctx.lineTo(swordX, swordY); ctx.stroke();
        // Shield glow
        if (player.shield > 0) {
            ctx.strokeStyle = 'rgba(68,136,255,' + (0.3 + Math.sin(Date.now() * 0.003) * 0.15) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(player.x, player.y, 12, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Particles
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Lighting
        if (window.QualityFX && QualityFX.isRT()) {
            var lx = player.x - cameraOffset.x, ly = player.y - cameraOffset.y;
            var lightR = LIGHT_RADIUS * (torchLevel / 100);
            var flicker = Math.sin(flickerTimer * 15) * 3 + Math.sin(flickerTimer * 23) * 2;
            QualityFX.addLight2D(lx, ly, Math.max(20, lightR + flicker), 'rgba(255,180,50,0.4)', 1.0);
        } else {
            ctx.restore();
            var lightR = LIGHT_RADIUS * (torchLevel / 100);
            var flicker = Math.sin(flickerTimer * 15) * 3 + Math.sin(flickerTimer * 23) * 2;
            var finalR = Math.max(20, lightR + flicker);
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.97)';
            ctx.beginPath(); ctx.rect(0, 0, canvas.width, canvas.height);
            var cx = player.x - cameraOffset.x, cy = player.y - cameraOffset.y;
            ctx.moveTo(cx + finalR, cy); ctx.arc(cx, cy, finalR, 0, Math.PI * 2, true); ctx.fill();
            ctx.restore();
            var grd = ctx.createRadialGradient(cx, cy, finalR * 0.1, cx, cy, finalR);
            grd.addColorStop(0, 'rgba(255,200,100,0.08)'); grd.addColorStop(0.5, 'rgba(255,150,50,0.04)'); grd.addColorStop(1, 'transparent');
            ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Damage flash
            if (damageFlash > 0) {
                ctx.fillStyle = 'rgba(255,0,0,' + (damageFlash * 0.5) + ')';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Draw minimap
            renderMinimap();

            // Draw messages
            if (msgQueue.length > 0 && msgTimer > 0) {
                ctx.save();
                ctx.font = '16px Inter'; ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, msgTimer) + ')';
                ctx.fillText(msgQueue[0], canvas.width / 2, 60);
                ctx.restore();
            }

            // HP bar on screen
            renderPlayerHP();
            return;
        }
        ctx.restore();

        // Damage flash
        if (damageFlash > 0) {
            ctx.fillStyle = 'rgba(255,0,0,' + (damageFlash * 0.5) + ')';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        renderMinimap();
        renderPlayerHP();

        if (msgQueue.length > 0 && msgTimer > 0) {
            ctx.save();
            ctx.font = '16px Inter'; ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, msgTimer) + ')';
            ctx.fillText(msgQueue[0], canvas.width / 2, 60);
            ctx.restore();
        }
    }

    // ── Player HP Bar ─────────────────────────────────
    function renderPlayerHP() {
        var barW = 120, barH = 8, barX = 10, barY = canvas.height - 30;
        ctx.fillStyle = '#222'; ctx.fillRect(barX, barY, barW, barH);
        var hpPct = player.hp / player.maxHp;
        ctx.fillStyle = hpPct > 0.5 ? '#44cc44' : hpPct > 0.25 ? '#ccaa00' : '#cc2222';
        ctx.fillRect(barX, barY, barW * hpPct, barH);
        ctx.strokeStyle = '#555'; ctx.strokeRect(barX, barY, barW, barH);
        ctx.fillStyle = '#ccc'; ctx.font = '10px Inter'; ctx.textAlign = 'left';
        ctx.fillText('HP: ' + Math.round(player.hp) + '/' + player.maxHp, barX, barY - 4);
        if (player.shield > 0) {
            ctx.fillStyle = '#4488ff';
            ctx.fillRect(barX, barY + barH + 2, barW * (player.shield / 50), 4);
        }
    }

    // ── Minimap ───────────────────────────────────────
    function renderMinimap() {
        if (!minimapCanvas) return;
        var mw = minimapCanvas.width, mh = minimapCanvas.height;
        minimapCtx.fillStyle = 'rgba(0,0,0,0.7)';
        minimapCtx.fillRect(0, 0, mw, mh);
        for (var r = 0; r < mazeH; r++) {
            for (var c = 0; c < mazeW; c++) {
                if (!explored[r][c]) continue;
                var px = c * 3, py = r * 3;
                if (maze[r][c] === 1) { minimapCtx.fillStyle = '#333'; }
                else if (maze[r][c] === 2) { minimapCtx.fillStyle = '#FFD700'; }
                else if (maze[r][c] === 4) { minimapCtx.fillStyle = inventory.keys >= total_keys ? '#00ff88' : '#663333'; }
                else { minimapCtx.fillStyle = '#111'; }
                minimapCtx.fillRect(px, py, 3, 3);
            }
        }
        // Player dot
        var pmc = Math.floor(player.x / TILE) * 3 + 1;
        var pmr = Math.floor(player.y / TILE) * 3 + 1;
        minimapCtx.fillStyle = '#00ccff'; minimapCtx.fillRect(pmc - 1, pmr - 1, 3, 3);
        // Enemy dots
        for (var i = 0; i < enemies.length; i++) {
            var ec = Math.floor(enemies[i].x / TILE) * 3 + 1;
            var er = Math.floor(enemies[i].y / TILE) * 3 + 1;
            if (explored[Math.floor(enemies[i].y / TILE)] && explored[Math.floor(enemies[i].y / TILE)][Math.floor(enemies[i].x / TILE)])
                minimapCtx.fillStyle = enemies[i].type === 5 ? '#ff00ff' : '#ff3333';
            minimapCtx.fillRect(ec, er, 2, 2);
        }
        // Draw to main canvas
        ctx.drawImage(minimapCanvas, canvas.width - mw - 10, 10);
        ctx.strokeStyle = '#444'; ctx.strokeRect(canvas.width - mw - 10, 10, mw, mh);
    }

    // ── Game Flow ─────────────────────────────────────
    function gameOver() {
        gameActive = false;
        GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playJumpScare();
        setTimeout(function () { HorrorAudio.playDeath(); }, 400);
        HorrorAudio.stopDrone(); HorrorAudio.stopHeartbeat();
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var retryBtn = document.querySelector('#game-over-screen .play-btn');
        if (retryBtn) { retryBtn.onclick = function () { currentLevel = 0; player.hp = player.maxHp; player.shield = 0; restartLevel(); }; }
    }

    function levelComplete() {
        gameActive = false;
        HorrorAudio.playWin();
        stats.levelsCleared++;
        if (window.ChallengeManager) ChallengeManager.notify('shadow-crawler', 'levels_cleared', 1);
        currentLevel++;
        // Bonus: heal between levels
        player.hp = Math.min(player.maxHp, player.hp + 20);
        torchLevel = Math.min(torchMax, torchLevel + 20);
        if (currentLevel >= MAX_LEVELS) {
            document.getElementById('win-msg').textContent = 'All ' + MAX_LEVELS + ' dungeons conquered! Kills: ' + stats.kills + ' | Coins: ' + stats.totalCoins;
            document.getElementById('next-level-btn').textContent = '▶ Play Again';
            document.getElementById('next-level-btn').onclick = function () { currentLevel = 0; player.hp = player.maxHp; player.shield = 0; stats = { kills: 0, levelsCleared: 0, totalCoins: 0, damageDealt: 0 }; restartLevel(); };
            GameUtils.setState(GameUtils.STATE.WIN);
        } else {
            document.getElementById('win-msg').textContent = 'Level ' + currentLevel + ' cleared! Kills: ' + stats.kills + ' | HP: ' + Math.round(player.hp);
            document.getElementById('next-level-btn').textContent = '▶ Next Level';
            document.getElementById('next-level-btn').onclick = function () { restartLevel(); };
        }
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
    }

    function restartLevel() {
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        loadLevel(currentLevel);
        HorrorAudio.startDrone(45, 'dark');
        HorrorAudio.startHeartbeat(55);
        gameActive = true;
        GameUtils.setState(GameUtils.STATE.PLAYING);
        lastTime = performance.now();
    }

    function startGame() {
        document.getElementById('start-screen').style.display = 'none';
        var ctrlOverlay = document.getElementById('controls-overlay');
        ctrlOverlay.style.display = 'flex';
        HorrorAudio.startDrone(45, 'dark');
        HorrorAudio.startHeartbeat(55);
        if (window.QualityFX) QualityFX.init2D(canvas, ctx);
        setTimeout(function () {
            ctrlOverlay.classList.add('hiding');
            setTimeout(function () {
                ctrlOverlay.style.display = 'none';
                ctrlOverlay.classList.remove('hiding');
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                loadLevel(currentLevel);
                gameActive = true;
                GameUtils.setState(GameUtils.STATE.PLAYING);
            }, 800);
        }, 3000);
    }

    // ── Game Loop ─────────────────────────────────────
    function gameLoop(time) {
        requestAnimationFrame(gameLoop);
        if (!time) time = performance.now();
        var dt = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;
        if (dt <= 0) return;
        update(dt);
        render();
    }
    lastTime = performance.now();
    gameLoop();
})();
