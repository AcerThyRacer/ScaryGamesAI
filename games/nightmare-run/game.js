/* ============================================
   Nightmare Run — 2D Side-Scrolling Horror Runner
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

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    // Attach listeners immediately
    document.addEventListener('keydown', function (e) {
        keysPressed[e.code] = true;
        if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && gameActive) slowMo = true;
        if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && gameActive) playerJump();
        if ((e.code === 'ArrowDown' || e.code === 'KeyS') && gameActive) playerSlide();
    });
    document.addEventListener('keyup', function (e) {
        keysPressed[e.code] = false;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') slowMo = false;
    });
    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.getElementById('fullscreen-btn').addEventListener('click', function () {
        GameUtils.toggleFullscreen();
    });

    // Inject difficulty & pause
    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () {
            gameActive = true;
            GameUtils.setState(GameUtils.STATE.PLAYING);
            lastTime = performance.now();
        },
        onRestart: restartGame
    });

    document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && gameActive) {
            gameActive = false;
            GameUtils.pauseGame();
        }
    });

    function resetPlayer() {
        player = { x: 120, y: 0, vy: 0, w: 28, h: 50, grounded: true, sliding: false, slideTimer: 0, jumps: 0, maxJumps: 1, invincible: false, invincibleTimer: 0, speedBoost: false, speedTimer: 0 };
        player.y = canvas.height * GROUND_Y - player.h;
    }

    function initBgLayers() {
        bgLayers = [];
        for (var i = 0; i < 4; i++) bgLayers.push({ offset: 0, speed: 0.2 + i * 0.3 });
    }

    var OBSTACLE_TYPES = [
        { name: 'skull', w: 30, h: 35, ground: true, color: '#cccccc' },
        { name: 'hand', w: 20, h: 55, ground: true, color: '#665555' },
        { name: 'wall', w: 50, h: 40, ground: true, color: '#442244' },
        { name: 'pit', w: 60, h: 10, ground: true, color: '#000000' },
        { name: 'eye', w: 25, h: 25, ground: false, flyY: 0.45, color: '#ff3333' },
        { name: 'bat', w: 30, h: 20, ground: false, flyY: 0.35, color: '#333366' },
    ];

    var POWERUP_TYPES = [
        { name: 'invincibility', color: '#00ffff', symbol: '🛡️' },
        { name: 'speed', color: '#ff8800', symbol: '⚡' },
        { name: 'double_jump', color: '#ffff00', symbol: '⇧' },
    ];

    function spawnObstacle() {
        var type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
        var o = { type: type.name, w: type.w, h: type.h, color: type.color, x: canvas.width + 50, passed: false };
        if (type.ground) {
            o.y = canvas.height * GROUND_Y - type.h;
            if (type.name === 'pit') o.y = canvas.height * GROUND_Y;
        } else {
            o.y = canvas.height * type.flyY;
        }
        obstacles.push(o);
    }

    function spawnPowerup() {
        var type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        powerups.push({ type: type.name, color: type.color, symbol: type.symbol, x: canvas.width + 100, y: canvas.height * (0.3 + Math.random() * 0.3), w: 24, h: 24 });
    }

    function playerJump() {
        if (player.jumps < player.maxJumps) {
            player.vy = JUMP_FORCE;
            player.grounded = false;
            player.jumps++;
            player.sliding = false;
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
        }
    }

    function startGame() {
        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay');
        ctrl.style.display = 'flex';
        HorrorAudio.startDrone(65, 'dark');
        setTimeout(function () {
            ctrl.classList.add('hiding');
            setTimeout(function () {
                ctrl.style.display = 'none';
                ctrl.classList.remove('hiding');
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                resetPlayer();
                initBgLayers();
                obstacles = [];
                powerups = [];
                particles = [];
                deathParticles = [];
                score = 0;
                distanceTraveled = 0;
                speedMultiplier = 1;
                spawnTimer = 0;
                powerupTimer = 0;
                gameActive = true;
                GameUtils.setState(GameUtils.STATE.PLAYING);
            }, 800);
        }, 3000);
    }

    function restartGame() {
        resetPlayer();
        initBgLayers();
        obstacles = [];
        powerups = [];
        particles = [];
        deathParticles = [];
        score = 0;
        distanceTraveled = 0;
        speedMultiplier = 1;
        spawnTimer = 0;
        powerupTimer = 0;
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        HorrorAudio.startDrone(65, 'dark');
        gameActive = true;
        GameUtils.setState(GameUtils.STATE.PLAYING);
        lastTime = performance.now();
    }

    var spawnTimer = 0, powerupTimer = 0;

    function update(dt) {
        if (!gameActive) return;
        var timeScale = slowMo ? 0.4 : 1;
        var sDt = dt * timeScale;
        var baseSpeed = 350 * speedMultiplier * (player.speedBoost ? 1.5 : 1) * GameUtils.getMultiplier();

        player.vy += GRAVITY * sDt;
        player.y += player.vy * sDt;
        var groundLevel = canvas.height * GROUND_Y - player.h;
        if (player.y >= groundLevel) { player.y = groundLevel; player.vy = 0; player.grounded = true; player.jumps = 0; }

        if (player.sliding) {
            player.slideTimer -= sDt;
            if (player.slideTimer <= 0) {
                player.sliding = false;
                player.h = 50;
                player.y = canvas.height * GROUND_Y - player.h;
            }
        }

        if (player.invincible) { player.invincibleTimer -= sDt; if (player.invincibleTimer <= 0) player.invincible = false; }
        if (player.speedBoost) { player.speedTimer -= sDt; if (player.speedTimer <= 0) player.speedBoost = false; }

        distanceTraveled += baseSpeed * sDt;
        speedMultiplier = 1 + distanceTraveled / 10000;
        score = Math.floor(distanceTraveled / 10);

        spawnTimer -= sDt;
        if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = 0.8 + Math.random() * 1.5 / speedMultiplier; }
        powerupTimer -= sDt;
        if (powerupTimer <= 0) { spawnPowerup(); powerupTimer = 5 + Math.random() * 8; }

        for (var i = obstacles.length - 1; i >= 0; i--) {
            var o = obstacles[i];
            o.x -= baseSpeed * sDt;
            if (o.x + o.w < 0) { obstacles.splice(i, 1); continue; }
            if (!player.invincible && player.x < o.x + o.w && player.x + player.w > o.x && player.y < o.y + o.h && player.y + player.h > o.y) {
                gameOver(); return;
            }
        }

        for (var i = powerups.length - 1; i >= 0; i--) {
            var p = powerups[i];
            p.x -= baseSpeed * sDt;
            if (p.x + p.w < 0) { powerups.splice(i, 1); continue; }
            if (player.x < p.x + p.w && player.x + player.w > p.x && player.y < p.y + p.h && player.y + player.h > p.y) {
                if (p.type === 'invincibility') { player.invincible = true; player.invincibleTimer = 5; }
                else if (p.type === 'speed') { player.speedBoost = true; player.speedTimer = 4; }
                else if (p.type === 'double_jump') { player.maxJumps = 2; setTimeout(function () { player.maxJumps = 1; }, 8000); }
                HorrorAudio.playPowerup();
                for (var j = 0; j < 8; j++) particles.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 0.6, color: p.color });
                powerups.splice(i, 1);
            }
        }

        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.x += p.vx; p.y += p.vy; p.life -= sDt;
            if (p.life <= 0) particles.splice(i, 1);
        }

        for (var i = 0; i < bgLayers.length; i++) bgLayers[i].offset = (bgLayers[i].offset + bgLayers[i].speed * baseSpeed * sDt) % canvas.width;

        if (shakeDuration > 0) shakeDuration -= sDt;

        updateHUD();
    }

    function render() {
        var w = canvas.width, h = canvas.height;
        ctx.save();
        if (shakeDuration > 0) ctx.translate(Math.random() * 6 - 3, Math.random() * 6 - 3);
        var grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, '#0a0010'); grd.addColorStop(0.6, '#150820'); grd.addColorStop(1, '#0a0510');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);

        for (var i = 0; i < bgLayers.length; i++) {
            ctx.strokeStyle = 'rgba(80,30,60,' + (0.1 + i * 0.05) + ')';
            ctx.lineWidth = 1;
            var off = bgLayers[i].offset;
            for (var x = -off % 80; x < w; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        }

        ctx.fillStyle = '#1a0520';
        ctx.fillRect(0, h * GROUND_Y, w, h * (1 - GROUND_Y));
        ctx.strokeStyle = '#cc1122';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, h * GROUND_Y); ctx.lineTo(w, h * GROUND_Y); ctx.stroke();

        for (var i = 0; i < obstacles.length; i++) {
            var o = obstacles[i];
            ctx.fillStyle = o.color;
            ctx.shadowColor = o.type === 'eye' || o.type === 'bat' ? '#ff0000' : '#660066';
            ctx.shadowBlur = 10;
            ctx.fillRect(o.x, o.y, o.w, o.h);
            ctx.shadowBlur = 0;
            if (o.type === 'skull') {
                ctx.fillStyle = '#000';
                ctx.fillRect(o.x + 6, o.y + 8, 6, 6);
                ctx.fillRect(o.x + 18, o.y + 8, 6, 6);
                ctx.fillRect(o.x + 10, o.y + 20, 10, 4);
            } else if (o.type === 'eye') {
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 3, 0, Math.PI * 2); ctx.fill();
            }
        }

        for (var i = 0; i < powerups.length; i++) {
            var p = powerups[i];
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000';
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(p.symbol, p.x + p.w / 2, p.y + p.h / 2 + 5);
        }

        ctx.fillStyle = player.invincible ? 'rgba(0,255,255,' + (0.5 + Math.sin(Date.now() * 0.01) * 0.5) + ')' : '#cc3355';
        ctx.shadowColor = player.invincible ? '#00ffff' : '#ff0044';
        ctx.shadowBlur = player.invincible ? 20 : 8;
        ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.fillRect(player.x + 8, player.y + 8, 5, 5);
        ctx.fillRect(player.x + 18, player.y + 8, 5, 5);

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;

        for (var i = 0; i < deathParticles.length; i++) {
            var dp = deathParticles[i];
            dp.x += dp.vx; dp.y += dp.vy; dp.vy += 200 * 0.016; dp.life -= 0.016;
            ctx.fillStyle = dp.color;
            ctx.globalAlpha = Math.max(0, dp.life);
            ctx.fillRect(dp.x - 3, dp.y - 3, 6, 6);
        }
        ctx.globalAlpha = 1;

        if (slowMo) {
            ctx.fillStyle = 'rgba(0,0,50,0.3)';
            ctx.fillRect(0, 0, w, h);
        }

        for (var y = 0; y < h; y += 4) {
            ctx.fillStyle = 'rgba(0,0,0,0.03)';
            ctx.fillRect(0, y, w, 2);
        }

        ctx.restore();
    }

    function updateHUD() {
        var el1 = document.getElementById('hud-score');
        var el2 = document.getElementById('hud-best');
        var el3 = document.getElementById('hud-speed');
        if (el1) el1.textContent = '☠ Score: ' + score;
        if (el2) el2.textContent = '👑 Best: ' + bestScore;
        if (el3) el3.textContent = '💀 Speed: x' + speedMultiplier.toFixed(1);
    }

    function gameOver() {
        gameActive = false;
        GameUtils.setState(GameUtils.STATE.GAME_OVER);
        shakeDuration = 0.5;
        HorrorAudio.playJumpScare();
        setTimeout(function () { HorrorAudio.playDeath(); }, 400);
        HorrorAudio.stopDrone();
        if (score > bestScore) { bestScore = score; localStorage.setItem('nightmare_best', String(bestScore)); }
        document.getElementById('final-score').textContent = 'Score: ' + score;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        // Replace location.reload with restart
        var retryBtn = document.querySelector('#game-over-screen .play-btn');
        if (retryBtn) { retryBtn.onclick = restartGame; }
        for (var i = 0; i < 30; i++) {
            deathParticles.push({
                x: player.x + player.w / 2, y: player.y + player.h / 2,
                vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10 - 3,
                life: 1, color: Math.random() > 0.5 ? '#cc1122' : '#ff4444'
            });
        }
    }

    resetPlayer();
    initBgLayers();

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
