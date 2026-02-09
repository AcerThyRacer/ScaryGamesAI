/* ============================================
   Shadow Crawler — 2D Top-Down Horror Dungeon
   ============================================ */

(function () {
    'use strict';

    var canvas = document.getElementById('game-canvas');
    var ctx = canvas.getContext('2d');

    var TILE = 40;
    var LIGHT_RADIUS = 140;

    var LEVELS = [
        [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 3, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1], [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1], [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1], [1, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 2, 0, 1], [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1], [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 1], [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1], [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]],
        [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 3, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1], [1, 0, 1, 0, 0, 0, 0, 5, 1, 0, 0, 0, 0, 0, 1, 0, 1], [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1], [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1], [1, 2, 0, 0, 1, 0, 0, 0, 5, 0, 0, 0, 1, 0, 0, 2, 1], [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1], [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1], [1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1], [1, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]],
        [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 3, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1], [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1], [1, 0, 0, 1, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 1], [1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1], [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1], [1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1], [1, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 1], [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1], [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1], [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1], [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 4, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]
    ];

    var currentLevel = 0;
    var player = { x: 0, y: 0, speed: 3 };
    var enemies = [];
    var keys_collected = 0;
    var total_keys = 0;
    var torchLevel = 100;
    var gameActive = false;
    var keysPressed = {};
    var maze = [];
    var exitPos = { x: 0, y: 0 };
    var cameraOffset = { x: 0, y: 0 };
    var flickerTimer = 0;

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    // Attach listeners immediately
    document.addEventListener('keydown', function (e) {
        keysPressed[e.code] = true;
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); }
    });
    document.addEventListener('keyup', function (e) { keysPressed[e.code] = false; });
    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.getElementById('fullscreen-btn').addEventListener('click', function () {
        GameUtils.toggleFullscreen();
    });

    // Inject difficulty & pause
    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING); lastTime = performance.now(); },
        onRestart: function () { currentLevel = 0; restartLevel(); }
    });

    function loadLevel(level) {
        maze = [];
        for (var r = 0; r < LEVELS[level].length; r++) maze[r] = LEVELS[level][r].slice();
        enemies = [];
        keys_collected = 0;
        total_keys = 0;
        torchLevel = 100;
        for (var r = 0; r < maze.length; r++) {
            for (var c = 0; c < maze[r].length; c++) {
                if (maze[r][c] === 3) { player.x = c * TILE + TILE / 2; player.y = r * TILE + TILE / 2; }
                if (maze[r][c] === 2) total_keys++;
                if (maze[r][c] === 4) { exitPos.x = c * TILE + TILE / 2; exitPos.y = r * TILE + TILE / 2; }
                if (maze[r][c] === 5) {
                    enemies.push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, speed: 1.0 + level * 0.3, dir: Math.random() * Math.PI * 2, chasing: false, patrolTimer: 0 });
                }
            }
        }
        updateHUD();
    }

    function updateHUD() {
        var keysEl = document.getElementById('hud-keys');
        var torchEl = document.getElementById('hud-torch');
        var levelEl = document.getElementById('hud-level');
        if (keysEl) keysEl.textContent = '🔑 Keys: ' + keys_collected + ' / ' + total_keys;
        if (torchEl) { torchEl.textContent = '🔥 Torch: ' + Math.round(torchLevel) + '%'; torchEl.style.color = torchLevel > 50 ? '#ffaa00' : torchLevel > 25 ? '#ff6600' : '#ff0000'; }
        if (levelEl) levelEl.textContent = 'Level ' + (currentLevel + 1);
    }

    function isWall(px, py) {
        var col = Math.floor(px / TILE), row = Math.floor(py / TILE);
        if (row < 0 || row >= maze.length || col < 0 || col >= maze[0].length) return true;
        return maze[row][col] === 1;
    }
    function canMove(px, py, s) { s = s || 8; return !isWall(px - s, py - s) && !isWall(px + s, py - s) && !isWall(px - s, py + s) && !isWall(px + s, py + s); }

    function update(dt) {
        if (!gameActive) return;
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
        }
        torchLevel -= (sprinting ? 0.15 : 0.02) * dt * 60 * GameUtils.getMultiplier();
        if (torchLevel <= 0) { torchLevel = 0; gameOver(); return; }
        flickerTimer += dt;
        var pc = Math.floor(player.x / TILE), pr = Math.floor(player.y / TILE);
        if (pr >= 0 && pr < maze.length && pc >= 0 && pc < maze[0].length && maze[pr][pc] === 2) {
            maze[pr][pc] = 0; keys_collected++; torchLevel = Math.min(100, torchLevel + 15);
            HorrorAudio.playCollect();
            updateHUD();
        }
        if (keys_collected >= total_keys) {
            var dx = player.x - exitPos.x, dy = player.y - exitPos.y;
            if (Math.sqrt(dx * dx + dy * dy) < TILE * 0.6) { levelComplete(); return; }
        }
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            var edx = player.x - e.x, edy = player.y - e.y, eDist = Math.sqrt(edx * edx + edy * edy);
            e.chasing = eDist < LIGHT_RADIUS * (torchLevel / 100) * 1.5;
            var espeed = e.chasing ? 1.8 * GameUtils.getMultiplier() : 0.8 * GameUtils.getMultiplier();
            if (e.chasing) {
                var angle = Math.atan2(edy, edx);
                var nx = e.x + Math.cos(angle) * espeed * TILE * dt;
                var ny = e.y + Math.sin(angle) * espeed * TILE * dt;
                if (canMove(nx, e.y, 6)) e.x = nx;
                if (canMove(e.x, ny, 6)) e.y = ny;
            } else {
                e.patrolTimer -= dt;
                if (e.patrolTimer <= 0) { e.dir = Math.random() * Math.PI * 2; e.patrolTimer = 1 + Math.random() * 2; }
                var nx = e.x + Math.cos(e.dir) * e.speed * 0.5 * TILE * dt;
                var ny = e.y + Math.sin(e.dir) * e.speed * 0.5 * TILE * dt;
                if (canMove(nx, ny, 6)) { e.x = nx; e.y = ny; } else { e.dir = Math.random() * Math.PI * 2; }
            }
            if (eDist < TILE * 0.4) { gameOver(); return; }
        }
        cameraOffset.x = player.x - canvas.width / 2;
        cameraOffset.y = player.y - canvas.height / 2;
        updateHUD();
    }

    function render() {
        var w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
        if (!maze.length) return;
        ctx.save();
        ctx.translate(-cameraOffset.x, -cameraOffset.y);
        var startCol = Math.max(0, Math.floor(cameraOffset.x / TILE));
        var endCol = Math.min(maze[0].length, Math.ceil((cameraOffset.x + w) / TILE) + 1);
        var startRow = Math.max(0, Math.floor(cameraOffset.y / TILE));
        var endRow = Math.min(maze.length, Math.ceil((cameraOffset.y + h) / TILE) + 1);
        for (var r = startRow; r < endRow; r++) {
            for (var c = startCol; c < endCol; c++) {
                var x = c * TILE, y = r * TILE, cell = maze[r][c];
                if (cell === 1) { ctx.fillStyle = '#1a1030'; ctx.fillRect(x, y, TILE, TILE); ctx.strokeStyle = '#2a1848'; ctx.lineWidth = 1; ctx.strokeRect(x, y, TILE, TILE); }
                else { ctx.fillStyle = '#0a0814'; ctx.fillRect(x, y, TILE, TILE); }
                if (cell === 2) {
                    ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
                    ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2, 6, 0, Math.PI * 2); ctx.fill();
                    ctx.shadowBlur = 0; ctx.fillRect(x + TILE / 2 - 1, y + TILE / 2, 2, 10); ctx.fillRect(x + TILE / 2, y + TILE / 2 + 7, 5, 2);
                }
                if (cell === 4) {
                    var canExit = keys_collected >= total_keys;
                    ctx.fillStyle = canExit ? 'rgba(0,255,136,0.3)' : 'rgba(100,50,50,0.3)';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = canExit ? '#00ff88' : '#663333'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
                    ctx.fillStyle = canExit ? '#00ff88' : '#663333'; ctx.font = '16px Inter'; ctx.textAlign = 'center'; ctx.fillText('EXIT', x + TILE / 2, y + TILE / 2 + 5);
                }
            }
        }
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            ctx.fillStyle = e.chasing ? 'rgba(180,0,0,0.8)' : 'rgba(60,0,80,0.6)';
            ctx.shadowColor = e.chasing ? '#ff0000' : '#6600aa'; ctx.shadowBlur = e.chasing ? 20 : 10;
            var wobble = Math.sin(Date.now() * 0.005) * 3;
            ctx.beginPath(); ctx.ellipse(e.x, e.y, 12 + wobble, 10 - wobble / 2, 0, 0, Math.PI * 2); ctx.fill();
            if (e.chasing) { ctx.fillStyle = '#ff3333'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(e.x - 4, e.y - 2, 2, 0, Math.PI * 2); ctx.arc(e.x + 4, e.y - 2, 2, 0, Math.PI * 2); ctx.fill(); }
            ctx.shadowBlur = 0;
        }
        ctx.fillStyle = '#aaaacc'; ctx.beginPath(); ctx.arc(player.x, player.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        var lightR = LIGHT_RADIUS * (torchLevel / 100);
        var flicker = Math.sin(flickerTimer * 15) * 3 + Math.sin(flickerTimer * 23) * 2;
        var finalR = Math.max(20, lightR + flicker);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.97)';
        ctx.beginPath(); ctx.rect(0, 0, w, h);
        var cx = player.x - cameraOffset.x, cy = player.y - cameraOffset.y;
        ctx.moveTo(cx + finalR, cy); ctx.arc(cx, cy, finalR, 0, Math.PI * 2, true); ctx.fill();
        ctx.restore();
        var grd = ctx.createRadialGradient(cx, cy, finalR * 0.1, cx, cy, finalR);
        grd.addColorStop(0, 'rgba(255,200,100,0.08)'); grd.addColorStop(0.5, 'rgba(255,150,50,0.04)'); grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    }

    function gameOver() {
        gameActive = false;
        GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playJumpScare();
        setTimeout(function () { HorrorAudio.playDeath(); }, 400);
        HorrorAudio.stopDrone(); HorrorAudio.stopHeartbeat();
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var retryBtn = document.querySelector('#game-over-screen .play-btn');
        if (retryBtn) { retryBtn.onclick = function () { currentLevel = 0; restartLevel(); }; }
    }

    function levelComplete() {
        gameActive = false;
        HorrorAudio.playWin();
        currentLevel++;
        if (currentLevel >= LEVELS.length) {
            document.getElementById('win-msg').textContent = 'You escaped all dungeons! You are free!';
            document.getElementById('next-level-btn').textContent = '▶ Play Again';
            document.getElementById('next-level-btn').onclick = function () { currentLevel = 0; restartLevel(); };
            GameUtils.setState(GameUtils.STATE.WIN);
        } else {
            document.getElementById('win-msg').textContent = 'Level ' + currentLevel + ' cleared!';
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

    var lastTime = 0;
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
