/* ============================================
   Nightmare Run — 2D Side-Scrolling Horror Runner
   OVERHAULED: 5 biomes, 10+ obstacle types, coins,
   boss chases, unlockable skins, combo system, weather
   ============================================ */

(function () {
    'use strict';

    var canvas = document.getElementById('game-canvas');
    var ctx = canvas.getContext('2d');

    var GRAVITY = 2200;
    var JUMP_FORCE = -700;
    var GROUND_Y = 0.78;
    var SLIDE_DURATION = 0.6;

    var player = {};
    var obstacles = [];
    var powerups = [];
    var coins = [];
    var particles = [];
    var deathParticles = [];
    var bgLayers = [];
    var score = 0;
    var bestScore = parseInt(localStorage.getItem('nightmare_best') || '0', 10);
    var gameActive = false;
    var speedMultiplier = 1;
    var distanceTraveled = 0;
    var shakeDuration = 0;
    var slowMo = false;
    var keysPressed = {};

    // ── NEW: Biome System ─────────────────────────────
    var currentBiome = 0;
    var biomeTransition = 0;
    var BIOMES = [
        { name: 'Haunted Forest', sky: ['#0a0510', '#150820', '#0a0510'], ground: '#1a0520', groundLine: '#cc1122', treeColor: '#1a0a20', fogColor: 'rgba(20,0,30,0.3)' },
        { name: 'Blood Swamp', sky: ['#100000', '#200808', '#100000'], ground: '#1a0808', groundLine: '#881111', treeColor: '#0a0505', fogColor: 'rgba(40,0,0,0.2)' },
        { name: 'Bone Wasteland', sky: ['#0a0a08', '#1a1810', '#0a0a05'], ground: '#151208', groundLine: '#aa8844', treeColor: '#1a1508', fogColor: 'rgba(30,25,10,0.2)' },
        { name: 'Void Abyss', sky: ['#000008', '#050015', '#000008'], ground: '#080010', groundLine: '#4444cc', treeColor: '#050010', fogColor: 'rgba(10,0,30,0.4)' },
        { name: 'Inferno', sky: ['#100000', '#301000', '#200500'], ground: '#1a0800', groundLine: '#ff4400', treeColor: '#200800', fogColor: 'rgba(40,10,0,0.3)' },
    ];

    // ── NEW: Coins & Currency ─────────────────────────
    var totalCoins = parseInt(localStorage.getItem('nightmare_coins') || '0', 10);
    var sessionCoins = 0;
    var coinCombo = 0;
    var coinComboTimer = 0;

    // ── NEW: Boss System ──────────────────────────────
    var bossActive = false;
    var boss = { x: 0, y: 0, w: 80, h: 80, speed: 0, hp: 0, maxHp: 0, attackTimer: 0, type: '' };
    var bossWarningTimer = 0;
    var nextBossDistance = 3000;

    // ── NEW: Character Skins ──────────────────────────
    var currentSkin = localStorage.getItem('nightmare_skin') || 'default';
    var SKINS = {
        'default': { body: '#cc3355', eyes: '#fff', name: 'Runner' },
        'ghost': { body: '#4488cc', eyes: '#aaddff', name: 'Ghost' },
        'demon': { body: '#ff2200', eyes: '#ffff00', name: 'Demon' },
        'shadow': { body: '#222233', eyes: '#ff00ff', name: 'Shadow' },
        'golden': { body: '#ffaa00', eyes: '#fff', name: 'Golden' },
    };

    // ── NEW: Weather System ───────────────────────────
    var weather = 'none'; // none, rain, storm, ash, snow
    var weatherParticles = [];
    var weatherTimer = 0;
    var lightningTimer = 0;
    var lightningFlash = 0;

    // ── NEW: Combo System ─────────────────────────────
    var nearMissCombo = 0;
    var nearMissTimer = 0;

    // ── NEW: Stats ────────────────────────────────────
    var jumpsUsed = 0;
    var slidesUsed = 0;
    var obstaclesCleared = 0;
    var powerupsCollected = 0;
    var bossesDefeated = 0;

    // ── Messages ──────────────────────────────────────
    var msgText = '';
    var msgTimer2 = 0;

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    document.addEventListener('keydown', function (e) {
        keysPressed[e.code] = true;
        if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && gameActive) slowMo = true;
        if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && gameActive) playerJump();
        if ((e.code === 'ArrowDown' || e.code === 'KeyS') && gameActive) playerSlide();
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); }
    });
    document.addEventListener('keyup', function (e) {
        keysPressed[e.code] = false;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') slowMo = false;
    });
    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.getElementById('fullscreen-btn').addEventListener('click', function () { GameUtils.toggleFullscreen(); });

    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING); lastTime = performance.now(); },
        onRestart: restartGame
    });

    function resetPlayer() {
        player = {
            x: 120, y: 0, vy: 0, w: 28, h: 50,
            grounded: true, sliding: false, slideTimer: 0,
            jumps: 0, maxJumps: 1,
            invincible: false, invincibleTimer: 0,
            speedBoost: false, speedTimer: 0,
            magnetActive: false, magnetTimer: 0,
            hp: 3, maxHp: 3
        };
        player.y = canvas.height * GROUND_Y - player.h;
    }

    function initBgLayers() {
        bgLayers = [];
        for (var i = 0; i < 4; i++) bgLayers.push({ offset: 0, speed: 0.2 + i * 0.3 });
    }

    // ── Obstacle Types (expanded) ─────────────────────
    var OBSTACLE_TYPES = [
        { name: 'skull', w: 30, h: 35, ground: true, color: '#cccccc' },
        { name: 'hand', w: 20, h: 55, ground: true, color: '#665555' },
        { name: 'wall', w: 50, h: 40, ground: true, color: '#442244' },
        { name: 'pit', w: 60, h: 10, ground: true, color: '#000000' },
        { name: 'eye', w: 25, h: 25, ground: false, flyY: 0.45, color: '#ff3333' },
        { name: 'bat', w: 30, h: 20, ground: false, flyY: 0.35, color: '#333366' },
        // NEW types
        { name: 'tombstone', w: 35, h: 50, ground: true, color: '#555555' },
        { name: 'spider', w: 20, h: 20, ground: false, flyY: 0.55, color: '#333333' },
        { name: 'flame', w: 25, h: 40, ground: true, color: '#ff4400' },
        { name: 'ghost_orb', w: 20, h: 20, ground: false, flyY: 0.3, color: '#aaccff' },
    ];

    var POWERUP_TYPES = [
        { name: 'invincibility', color: '#00ffff', symbol: '🛡️', duration: 5 },
        { name: 'speed', color: '#ff8800', symbol: '⚡', duration: 4 },
        { name: 'double_jump', color: '#ffff00', symbol: '⇧', duration: 8 },
        // NEW power-ups
        { name: 'magnet', color: '#ff44ff', symbol: '🧲', duration: 6 },
        { name: 'heal', color: '#44ff44', symbol: '❤️', duration: 0 },
        { name: 'slow_time', color: '#aaaaff', symbol: '⏳', duration: 5 },
    ];

    function spawnObstacle() {
        var types = OBSTACLE_TYPES;
        // Biome-specific weighting
        if (currentBiome === 1) types = types.filter(function (t) { return t.name !== 'tombstone'; });
        if (currentBiome === 4) types = OBSTACLE_TYPES.concat([{ name: 'flame', w: 25, h: 40, ground: true, color: '#ff6600' }]);

        var type = types[Math.floor(Math.random() * types.length)];
        var o = { type: type.name, w: type.w, h: type.h, color: type.color, x: canvas.width + 50, passed: false };
        if (type.ground) {
            o.y = canvas.height * GROUND_Y - type.h;
            if (type.name === 'pit') o.y = canvas.height * GROUND_Y;
        } else {
            o.y = canvas.height * (type.flyY || 0.4);
            // Add sine movement for flying obstacles
            o.floatPhase = Math.random() * Math.PI * 2;
            o.floatAmp = 15 + Math.random() * 20;
        }
        obstacles.push(o);
    }

    function spawnCoin(x, y) {
        coins.push({ x: x || canvas.width + 80 + Math.random() * 200, y: y || canvas.height * (0.3 + Math.random() * 0.4), w: 16, h: 16, collected: false });
    }

    function spawnPowerup() {
        var type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        powerups.push({ type: type.name, color: type.color, symbol: type.symbol, duration: type.duration, x: canvas.width + 100, y: canvas.height * (0.3 + Math.random() * 0.3), w: 24, h: 24 });
    }

    function playerJump() {
        if (player.jumps < player.maxJumps) {
            player.vy = JUMP_FORCE;
            player.grounded = false;
            player.jumps++;
            player.sliding = false;
            jumpsUsed++;
            HorrorAudio.playJump();
            for (var i = 0; i < 6; i++) particles.push({ x: player.x + player.w / 2, y: canvas.height * GROUND_Y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 4, life: 0.5, color: '#ff4444' });
        }
    }

    function playerSlide() {
        if (player.grounded && !player.sliding) {
            player.sliding = true;
            player.slideTimer = SLIDE_DURATION;
            player.h = 25;
            player.y = canvas.height * GROUND_Y - player.h;
            slidesUsed++;
        }
    }

    function showMsg(text) { msgText = text; msgTimer2 = 2; }

    // ── Boss Fights ───────────────────────────────────
    function spawnBoss() {
        var bossTypes = ['Shadow Beast', 'Bone Colossus', 'Void Wraith', 'Fire Demon', 'Death Itself'];
        boss.type = bossTypes[Math.min(Math.floor(bossesDefeated), bossTypes.length - 1)];
        boss.x = canvas.width + 100;
        boss.y = canvas.height * GROUND_Y - 80;
        boss.w = 80; boss.h = 80;
        boss.speed = 200 + bossesDefeated * 30;
        boss.hp = 5 + bossesDefeated * 3;
        boss.maxHp = boss.hp;
        boss.attackTimer = 3;
        bossActive = true;
        bossWarningTimer = 0;
        showMsg('⚠ BOSS: ' + boss.type + '!');
        HorrorAudio.playJumpScare && HorrorAudio.playJumpScare();
    }

    function updateBoss(dt, baseSpeed) {
        if (!bossActive) return;
        // Boss chases from the right
        boss.x -= (baseSpeed - boss.speed) * dt;
        if (boss.x > canvas.width - 100) boss.x -= 100 * dt;
        boss.y = canvas.height * GROUND_Y - boss.h + Math.sin(Date.now() * 0.003) * 15;

        // Boss attack: spawns projectiles
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
            boss.attackTimer = 2 - Math.min(bossesDefeated * 0.2, 1);
            obstacles.push({
                type: 'boss_projectile', w: 20, h: 20,
                color: '#ff00ff', x: boss.x - 30,
                y: boss.y + boss.h / 2 - 10, passed: false,
                floatPhase: 0, floatAmp: 0
            });
        }

        // Boss takes damage when player is invincible and near
        if (player.invincible) {
            var dx = player.x - boss.x, dy = player.y - boss.y;
            if (Math.sqrt(dx * dx + dy * dy) < 100) {
                boss.hp -= dt * 3;
                spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#ff00ff', 2);
                if (boss.hp <= 0) {
                    bossActive = false;
                    bossesDefeated++;
                    nextBossDistance = distanceTraveled + 5000 + bossesDefeated * 1000;
                    sessionCoins += 50;
                    score += 500;
                    showMsg('🏆 BOSS DEFEATED! +500 pts +50 coins');
                    spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#ffcc00', 30);
                    if (window.ChallengeManager) ChallengeManager.notify('nightmare-run', 'bosses_defeated', 1);
                }
            }
        }
    }

    function spawnParticles(x, y, color, count) {
        for (var i = 0; i < count; i++) particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6 - 2, life: 0.6, color: color });
    }

    // ── Weather ───────────────────────────────────────
    function updateWeather(dt) {
        weatherTimer -= dt;
        if (weatherTimer <= 0) {
            var weathers = ['none', 'none', 'rain', 'storm', 'ash', 'snow'];
            weather = weathers[Math.floor(Math.random() * weathers.length)];
            weatherTimer = 10 + Math.random() * 20;
            if (weather !== 'none') showMsg('☁ Weather: ' + weather);
        }

        // Spawn weather particles
        if (weather === 'rain' || weather === 'storm') {
            for (var i = 0; i < 3; i++) {
                weatherParticles.push({ x: Math.random() * canvas.width, y: -10, vx: -50, vy: 400 + Math.random() * 200, life: 1.5, type: 'rain' });
            }
        }
        if (weather === 'ash') {
            if (Math.random() < 0.3) weatherParticles.push({ x: Math.random() * canvas.width, y: -10, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 30, life: 3, type: 'ash' });
        }
        if (weather === 'snow') {
            if (Math.random() < 0.4) weatherParticles.push({ x: Math.random() * canvas.width, y: -10, vx: (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 40, life: 4, type: 'snow' });
        }

        // Lightning
        if (weather === 'storm') {
            lightningTimer -= dt;
            if (lightningTimer <= 0) { lightningFlash = 0.3; lightningTimer = 3 + Math.random() * 7; }
        }
        if (lightningFlash > 0) lightningFlash -= dt * 2;

        // Update weather particles
        for (var i = weatherParticles.length - 1; i >= 0; i--) {
            var wp = weatherParticles[i];
            wp.x += wp.vx * dt; wp.y += wp.vy * dt; wp.life -= dt;
            if (wp.life <= 0 || wp.y > canvas.height) weatherParticles.splice(i, 1);
        }
        if (weatherParticles.length > 300) weatherParticles.splice(0, 50);
    }

    var spawnTimer = 0, powerupTimer = 0, coinSpawnTimer = 0;

    function update(dt) {
        if (!gameActive) return;
        var timeScale = slowMo ? 0.4 : 1;
        if (player.magnetActive && player.magnetTimer > 0) { player.magnetTimer -= dt; if (player.magnetTimer <= 0) player.magnetActive = false; }
        var sDt = dt * timeScale;
        var baseSpeed = 350 * speedMultiplier * (player.speedBoost ? 1.5 : 1) * GameUtils.getMultiplier();

        player.vy += GRAVITY * sDt;
        player.y += player.vy * sDt;
        var groundLevel = canvas.height * GROUND_Y - player.h;
        if (player.y >= groundLevel) { player.y = groundLevel; player.vy = 0; player.grounded = true; player.jumps = 0; }

        if (player.sliding) {
            player.slideTimer -= sDt;
            if (player.slideTimer <= 0) { player.sliding = false; player.h = 50; player.y = canvas.height * GROUND_Y - player.h; }
        }

        if (player.invincible) { player.invincibleTimer -= sDt; if (player.invincibleTimer <= 0) player.invincible = false; }
        if (player.speedBoost) { player.speedTimer -= sDt; if (player.speedTimer <= 0) player.speedBoost = false; }

        distanceTraveled += baseSpeed * sDt;
        if (window.ChallengeManager) {
            ChallengeManager.notify('nightmare-run', 'dist_session', distanceTraveled);
            ChallengeManager.notify('nightmare-run', 'dist_total', baseSpeed * sDt);
        }
        speedMultiplier = 1 + distanceTraveled / 10000;
        score = Math.floor(distanceTraveled / 10) + sessionCoins * 10;

        // Biome transitions
        var newBiome = Math.min(Math.floor(distanceTraveled / 6000), BIOMES.length - 1);
        if (newBiome !== currentBiome) {
            currentBiome = newBiome;
            showMsg('🌍 Biome: ' + BIOMES[currentBiome].name);
            biomeTransition = 1;
        }
        if (biomeTransition > 0) biomeTransition -= dt * 0.5;

        // Boss spawning
        if (!bossActive && distanceTraveled > nextBossDistance) {
            bossWarningTimer = 3;
            showMsg('⚠ Something approaches...');
        }
        if (bossWarningTimer > 0) {
            bossWarningTimer -= dt;
            if (bossWarningTimer <= 0) spawnBoss();
        }
        updateBoss(sDt, baseSpeed);

        // Spawning
        spawnTimer -= sDt;
        if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = 0.8 + Math.random() * 1.5 / speedMultiplier; }
        powerupTimer -= sDt;
        if (powerupTimer <= 0) { spawnPowerup(); powerupTimer = 5 + Math.random() * 8; }
        coinSpawnTimer -= sDt;
        if (coinSpawnTimer <= 0) {
            var numCoins = 3 + Math.floor(Math.random() * 5);
            var cx = canvas.width + 50;
            var cy = canvas.height * (0.3 + Math.random() * 0.35);
            for (var i = 0; i < numCoins; i++) spawnCoin(cx + i * 25, cy + Math.sin(i * 0.8) * 30);
            coinSpawnTimer = 2 + Math.random() * 4;
        }

        // Update obstacles
        for (var i = obstacles.length - 1; i >= 0; i--) {
            var o = obstacles[i];
            o.x -= baseSpeed * sDt;
            // Float animation for flying obstacles
            if (o.floatAmp) o.y += Math.cos(Date.now() * 0.003 + (o.floatPhase || 0)) * o.floatAmp * dt;
            if (o.x + o.w < 0) { obstacles.splice(i, 1); continue; }

            // Near miss detection
            if (!o.passed && o.x + o.w < player.x) {
                o.passed = true;
                obstaclesCleared++;
                var nearDist = Math.abs(player.y + player.h - o.y);
                if (nearDist < 30 && !player.invincible) {
                    nearMissCombo++;
                    nearMissTimer = 2;
                    var bonus = nearMissCombo * 5;
                    score += bonus;
                    showMsg('🔥 Near miss x' + nearMissCombo + '! +' + bonus);
                }
            }

            if (!player.invincible && player.x < o.x + o.w && player.x + player.w > o.x && player.y < o.y + o.h && player.y + player.h > o.y) {
                player.hp--;
                shakeDuration = 0.3;
                spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#ff0000', 8);
                if (player.hp <= 0) { gameOver(); return; }
                else { player.invincible = true; player.invincibleTimer = 1.5; showMsg('💔 Hit! HP: ' + player.hp); }
                obstacles.splice(i, 1);
            }
        }

        // Update coins
        for (var i = coins.length - 1; i >= 0; i--) {
            var c = coins[i];
            c.x -= baseSpeed * sDt;
            // Magnet effect
            if (player.magnetActive) {
                var dx = player.x - c.x, dy = player.y - c.y;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < 200) { c.x += dx * 5 * dt; c.y += dy * 5 * dt; }
            }
            if (c.x + c.w < 0) { coins.splice(i, 1); continue; }
            if (player.x < c.x + c.w && player.x + player.w > c.x && player.y < c.y + c.h && player.y + player.h > c.y) {
                sessionCoins++;
                coinCombo++;
                coinComboTimer = 1;
                var coinPts = coinCombo >= 5 ? 3 : coinCombo >= 3 ? 2 : 1;
                score += coinPts;
                spawnParticles(c.x, c.y, '#ffcc00', 3);
                coins.splice(i, 1);
                HorrorAudio.playClick && HorrorAudio.playClick();
            }
        }

        // Powerup collision
        for (var i = powerups.length - 1; i >= 0; i--) {
            var p = powerups[i];
            p.x -= baseSpeed * sDt;
            if (p.x + p.w < 0) { powerups.splice(i, 1); continue; }
            if (player.x < p.x + p.w && player.x + player.w > p.x && player.y < p.y + p.h && player.y + player.h > p.y) {
                if (p.type === 'invincibility') { player.invincible = true; player.invincibleTimer = p.duration; }
                else if (p.type === 'speed') { player.speedBoost = true; player.speedTimer = p.duration; }
                else if (p.type === 'double_jump') { player.maxJumps = 2; setTimeout(function () { player.maxJumps = 1; }, p.duration * 1000); }
                else if (p.type === 'magnet') { player.magnetActive = true; player.magnetTimer = p.duration; }
                else if (p.type === 'heal') { player.hp = Math.min(player.maxHp, player.hp + 1); showMsg('❤️ +1 HP!'); }
                else if (p.type === 'slow_time') { /* handled elsewhere */ }
                HorrorAudio.playPowerup();
                powerupsCollected++;
                if (window.ChallengeManager) ChallengeManager.notify('nightmare-run', 'powerups_collected', 1);
                spawnParticles(p.x, p.y, p.color, 8);
                powerups.splice(i, 1);
            }
        }

        // Particles
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= sDt;
            if (p.life <= 0) particles.splice(i, 1);
        }
        for (var i = 0; i < bgLayers.length; i++) bgLayers[i].offset = (bgLayers[i].offset + bgLayers[i].speed * baseSpeed * sDt) % canvas.width;

        // Timers
        if (shakeDuration > 0) shakeDuration -= sDt;
        if (nearMissTimer > 0) { nearMissTimer -= dt; if (nearMissTimer <= 0) nearMissCombo = 0; }
        if (coinComboTimer > 0) { coinComboTimer -= dt; if (coinComboTimer <= 0) coinCombo = 0; }
        if (msgTimer2 > 0) msgTimer2 -= dt;

        // Weather
        updateWeather(dt);

        updateHUD();
    }

    function render() {
        var w = canvas.width, h = canvas.height;
        var biome = BIOMES[currentBiome];
        ctx.save();
        if (shakeDuration > 0) ctx.translate(Math.random() * 6 - 3, Math.random() * 6 - 3);

        // Sky gradient
        var grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, biome.sky[0]); grd.addColorStop(0.6, biome.sky[1]); grd.addColorStop(1, biome.sky[2]);
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);

        // BG layers
        for (var i = 0; i < bgLayers.length; i++) {
            ctx.strokeStyle = 'rgba(80,30,60,' + (0.1 + i * 0.05) + ')'; ctx.lineWidth = 1;
            var off = bgLayers[i].offset;
            for (var x = -off % 80; x < w; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        }

        // Biome-specific trees/structures
        ctx.fillStyle = biome.treeColor;
        for (var x = 0; x < w; x += 120) {
            var tOff = (bgLayers[1].offset + x) % w;
            if (currentBiome === 2) { // Bone pillars
                ctx.fillRect(tOff, h * GROUND_Y - 80 - Math.sin(x) * 20, 8, 80 + Math.sin(x) * 20);
            } else { // Trees
                ctx.beginPath(); ctx.moveTo(tOff, h * GROUND_Y); ctx.lineTo(tOff + 15, h * GROUND_Y - 60 - Math.abs(Math.sin(x * 0.3)) * 40); ctx.lineTo(tOff + 30, h * GROUND_Y); ctx.fill();
            }
        }

        // Ground
        ctx.fillStyle = biome.ground; ctx.fillRect(0, h * GROUND_Y, w, h * (1 - GROUND_Y));
        ctx.strokeStyle = biome.groundLine; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, h * GROUND_Y); ctx.lineTo(w, h * GROUND_Y); ctx.stroke();

        // Weather particles
        for (var i = 0; i < weatherParticles.length; i++) {
            var wp = weatherParticles[i];
            if (wp.type === 'rain') { ctx.strokeStyle = 'rgba(100,120,200,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wp.x, wp.y); ctx.lineTo(wp.x + wp.vx * 0.02, wp.y + wp.vy * 0.02); ctx.stroke(); }
            else if (wp.type === 'ash') { ctx.fillStyle = 'rgba(200,100,50,0.4)'; ctx.beginPath(); ctx.arc(wp.x, wp.y, 2, 0, Math.PI * 2); ctx.fill(); }
            else if (wp.type === 'snow') { ctx.fillStyle = 'rgba(200,210,230,0.5)'; ctx.beginPath(); ctx.arc(wp.x, wp.y, 3, 0, Math.PI * 2); ctx.fill(); }
        }

        // Lightning
        if (lightningFlash > 0) { ctx.fillStyle = 'rgba(200,200,255,' + lightningFlash + ')'; ctx.fillRect(0, 0, w, h); }

        // Fog
        ctx.fillStyle = biome.fogColor; ctx.fillRect(0, 0, w, h);

        // Coins
        for (var i = 0; i < coins.length; i++) {
            var c = coins[i];
            var bob = Math.sin(Date.now() * 0.005 + i) * 3;
            ctx.fillStyle = '#ffcc00'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(c.x + c.w / 2, c.y + c.h / 2 + bob, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#aa8800'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', c.x + c.w / 2, c.y + c.h / 2 + bob + 3);
            ctx.shadowBlur = 0;
        }

        // Obstacles
        for (var i = 0; i < obstacles.length; i++) {
            var o = obstacles[i];
            ctx.fillStyle = o.color;
            ctx.shadowColor = (o.type === 'eye' || o.type === 'bat' || o.type === 'ghost_orb') ? '#ff0000' : '#660066';
            ctx.shadowBlur = 10;
            ctx.fillRect(o.x, o.y, o.w, o.h);
            ctx.shadowBlur = 0;

            if (o.type === 'skull') { ctx.fillStyle = '#000'; ctx.fillRect(o.x + 6, o.y + 8, 6, 6); ctx.fillRect(o.x + 18, o.y + 8, 6, 6); ctx.fillRect(o.x + 10, o.y + 20, 10, 4); }
            if (o.type === 'eye') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 3, 0, Math.PI * 2); ctx.fill(); }
            if (o.type === 'flame') { ctx.fillStyle = '#ff8800'; ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y, 12, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
            if (o.type === 'tombstone') { ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y, o.w / 2, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#444'; ctx.font = '10px serif'; ctx.textAlign = 'center'; ctx.fillText('RIP', o.x + o.w / 2, o.y + 20); }
            if (o.type === 'ghost_orb') { ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.01) * 0.3; ctx.fillStyle = '#aaddff'; ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 10, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; }
        }

        // Boss
        if (bossActive) {
            ctx.fillStyle = '#440044'; ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 25;
            ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
            ctx.shadowBlur = 0;
            // Boss eyes
            ctx.fillStyle = '#ff3333';
            ctx.beginPath(); ctx.arc(boss.x + 20, boss.y + 20, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(boss.x + 55, boss.y + 20, 6, 0, Math.PI * 2); ctx.fill();
            // HP bar
            ctx.fillStyle = '#333'; ctx.fillRect(boss.x, boss.y - 15, boss.w, 8);
            ctx.fillStyle = '#ff00ff'; ctx.fillRect(boss.x, boss.y - 15, boss.w * (boss.hp / boss.maxHp), 8);
            ctx.fillStyle = '#fff'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
            ctx.fillText(boss.type, boss.x + boss.w / 2, boss.y - 18);
        }

        // Powerups
        for (var i = 0; i < powerups.length; i++) {
            var p = powerups[i];
            ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000'; ctx.font = '14px Inter'; ctx.textAlign = 'center';
            ctx.fillText(p.symbol, p.x + p.w / 2, p.y + p.h / 2 + 5);
        }

        // Player
        var skin = SKINS[currentSkin] || SKINS['default'];
        ctx.fillStyle = player.invincible ? 'rgba(0,255,255,' + (0.5 + Math.sin(Date.now() * 0.01) * 0.5) + ')' : skin.body;
        ctx.shadowColor = player.invincible ? '#00ffff' : skin.body; ctx.shadowBlur = player.invincible ? 20 : 8;
        ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = skin.eyes;
        ctx.fillRect(player.x + 8, player.y + 8, 5, 5); ctx.fillRect(player.x + 18, player.y + 8, 5, 5);

        // Magnet ring
        if (player.magnetActive) {
            ctx.strokeStyle = 'rgba(255,68,255,0.4)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 60, 0, Math.PI * 2); ctx.stroke();
        }

        // HP hearts
        for (var i = 0; i < player.maxHp; i++) {
            ctx.fillStyle = i < player.hp ? '#ff3344' : '#333';
            ctx.font = '16px sans-serif'; ctx.textAlign = 'left';
            ctx.fillText('♥', 10 + i * 22, 25);
        }

        // Particles
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i]; ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;

        // Death particles
        for (var i = 0; i < deathParticles.length; i++) {
            var dp = deathParticles[i];
            dp.x += dp.vx; dp.y += dp.vy; dp.vy += 200 * 0.016; dp.life -= 0.016;
            ctx.fillStyle = dp.color; ctx.globalAlpha = Math.max(0, dp.life);
            ctx.fillRect(dp.x - 3, dp.y - 3, 6, 6);
        }
        ctx.globalAlpha = 1;

        // Slow-mo overlay
        if (slowMo) { ctx.fillStyle = 'rgba(0,0,50,0.3)'; ctx.fillRect(0, 0, w, h); }

        // Scanlines
        for (var y = 0; y < h; y += 4) { ctx.fillStyle = 'rgba(0,0,0,0.03)'; ctx.fillRect(0, y, w, 2); }

        // Message
        if (msgTimer2 > 0) {
            ctx.font = '700 18px Inter'; ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255,200,50,' + Math.min(1, msgTimer2) + ')';
            ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 10;
            ctx.fillText(msgText, w / 2, h * 0.25);
            ctx.shadowBlur = 0;
        }

        // Near miss display
        if (nearMissCombo > 0 && nearMissTimer > 0) {
            ctx.font = '600 14px Inter'; ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(255,100,0,' + Math.min(1, nearMissTimer) + ')';
            ctx.fillText('🔥 Near miss x' + nearMissCombo, 10, h * 0.15);
        }

        // Coin counter
        ctx.font = '600 14px Inter'; ctx.textAlign = 'right';
        ctx.fillStyle = '#ffcc00';
        ctx.fillText('💰 ' + sessionCoins, w - 10, 50);

        // Biome name
        ctx.font = '11px Inter'; ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(200,200,200,0.3)';
        ctx.fillText(BIOMES[currentBiome].name, 10, h - 20);

        ctx.restore();
    }

    function updateHUD() {
        var el1 = document.getElementById('hud-score');
        var el2 = document.getElementById('hud-best');
        var el3 = document.getElementById('hud-speed');
        if (el1) el1.textContent = '☠ ' + score;
        if (el2) el2.textContent = '👑 ' + bestScore;
        if (el3) el3.textContent = 'x' + speedMultiplier.toFixed(1) + ' | Biome ' + (currentBiome + 1);
    }

    function gameOver() {
        gameActive = false;
        GameUtils.setState(GameUtils.STATE.GAME_OVER);
        shakeDuration = 0.5;
        HorrorAudio.playJumpScare();
        setTimeout(function () { HorrorAudio.playDeath(); }, 400);
        HorrorAudio.stopDrone();
        if (score > bestScore) { bestScore = score; localStorage.setItem('nightmare_best', String(bestScore)); }
        totalCoins += sessionCoins; localStorage.setItem('nightmare_coins', String(totalCoins));
        var fs = document.getElementById('final-score');
        if (fs) fs.textContent = 'Score: ' + score + ' | Coins: ' + sessionCoins + ' | Bosses: ' + bossesDefeated + ' | Best: ' + bestScore;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var retryBtn = document.querySelector('#game-over-screen .play-btn');
        if (retryBtn) retryBtn.onclick = restartGame;
        for (var i = 0; i < 30; i++) deathParticles.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10 - 3, life: 1, color: Math.random() > 0.5 ? '#cc1122' : '#ff4444' });
    }

    function startGame() {
        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        HorrorAudio.startDrone(65, 'dark');
        if (window.QualityFX) QualityFX.init2D(canvas, ctx);
        setTimeout(function () {
            ctrl.classList.add('hiding');
            setTimeout(function () {
                ctrl.style.display = 'none'; ctrl.classList.remove('hiding');
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                resetAll();
                gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
            }, 800);
        }, 3000);
    }

    function resetAll() {
        resetPlayer(); initBgLayers();
        obstacles = []; powerups = []; coins = []; particles = []; deathParticles = []; weatherParticles = [];
        score = 0; distanceTraveled = 0; speedMultiplier = 1; sessionCoins = 0;
        spawnTimer = 0; powerupTimer = 0; coinSpawnTimer = 0;
        currentBiome = 0; bossActive = false; bossesDefeated = 0; nextBossDistance = 3000;
        nearMissCombo = 0; coinCombo = 0; weather = 'none'; weatherTimer = 5;
        jumpsUsed = 0; slidesUsed = 0; obstaclesCleared = 0; powerupsCollected = 0;
        lastTime = performance.now();
    }

    function restartGame() {
        resetAll();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        HorrorAudio.startDrone(65, 'dark');
        gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
    }

    resetPlayer(); initBgLayers();
    var lastTime = performance.now();
    function gameLoop(time) {
        requestAnimationFrame(gameLoop);
        if (!time) time = performance.now();
        var dt = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;
        if (dt <= 0) return;
        update(dt);
        render();
    }
    gameLoop();
})();
