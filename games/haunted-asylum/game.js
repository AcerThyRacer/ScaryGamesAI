/* ============================================
   Haunted Asylum — 2D Top-Down Exploration Horror
   Procedural asylum, flashlight, patients, fuse puzzle.
   ============================================ */
(function () {
    'use strict';

    var canvas = document.getElementById('game-canvas');
    var ctx = canvas.getContext('2d');

    var TILE = 36;
    var LIGHT_RADIUS = 160;
    var MAP_W = 40, MAP_H = 30;

    // Cell types
    var WALL = 1, FLOOR = 0, FUSE = 2, RECORD = 3, EXIT = 4, PLAYER_START = 5, PATIENT_SPAWN = 6;

    var player = { x: 0, y: 0, speed: 3 };
    var patients = [];
    var maze = [];
    var fusesFound = 0, totalFuses = 3;
    var recordsFound = 0;
    var battery = 100, sanity = 100;
    var gameActive = false;
    var keysPressed = {};
    var cameraOffset = { x: 0, y: 0 };
    var flickerTimer = 0;
    var timeSurvived = 0;
    var exitPos = { x: 0, y: 0 };
    var interactCooldown = 0;
    var scareFlash = 0;

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    document.addEventListener('keydown', function (e) {
        keysPressed[e.code] = true;
        if (e.code === 'KeyE' && interactCooldown <= 0) tryInteract();
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); }
    });
    document.addEventListener('keyup', function (e) { keysPressed[e.code] = false; });

    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.getElementById('fullscreen-btn').addEventListener('click', function () { GameUtils.toggleFullscreen(); });

    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING); lastTime = performance.now(); },
        onRestart: function () { generateMap(); restartLevel(); }
    });

    // ============ PROCEDURAL MAP GENERATION ============
    function generateMap() {
        maze = [];
        for (var r = 0; r < MAP_H; r++) {
            maze[r] = [];
            for (var c = 0; c < MAP_W; c++) maze[r][c] = WALL;
        }

        // Recursive backtracker maze
        var stack = [];
        var visited = [];
        for (var r = 0; r < MAP_H; r++) { visited[r] = []; for (var c = 0; c < MAP_W; c++) visited[r][c] = false; }

        function carve(r, c) {
            visited[r][c] = true;
            maze[r][c] = FLOOR;
            var dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
            shuffle(dirs);
            dirs.forEach(function (d) {
                var nr = r + d[0], nc = c + d[1];
                if (nr > 0 && nr < MAP_H - 1 && nc > 0 && nc < MAP_W - 1 && !visited[nr][nc]) {
                    maze[r + d[0] / 2][c + d[1] / 2] = FLOOR;
                    carve(nr, nc);
                }
            });
        }

        carve(1, 1);

        // Create rooms (clear out some areas)
        for (var rm = 0; rm < 8; rm++) {
            var rx = 2 + Math.floor(Math.random() * (MAP_W - 8));
            var ry = 2 + Math.floor(Math.random() * (MAP_H - 8));
            var rw = 3 + Math.floor(Math.random() * 3);
            var rh = 3 + Math.floor(Math.random() * 3);
            for (var r = ry; r < Math.min(ry + rh, MAP_H - 1); r++) {
                for (var c = rx; c < Math.min(rx + rw, MAP_W - 1); c++) {
                    maze[r][c] = FLOOR;
                }
            }
        }

        // Place player start
        maze[1][1] = PLAYER_START;
        player.x = 1 * TILE + TILE / 2;
        player.y = 1 * TILE + TILE / 2;

        // Place fuses in distant locations
        var floorCells = [];
        for (var r = 0; r < MAP_H; r++) for (var c = 0; c < MAP_W; c++) {
            if (maze[r][c] === FLOOR && (r > MAP_H / 3 || c > MAP_W / 3)) floorCells.push({ r: r, c: c });
        }
        shuffle(floorCells);
        var placed = 0;
        for (var i = 0; i < floorCells.length && placed < totalFuses; i++) {
            var cell = floorCells[i];
            var dist = Math.abs(cell.r - 1) + Math.abs(cell.c - 1);
            if (dist > 10) {
                maze[cell.r][cell.c] = FUSE;
                placed++;
            }
        }

        // Place records (collectibles)
        for (var rc = 0; rc < 5 && floorCells.length > placed + rc; rc++) {
            var cell = floorCells[placed + rc];
            if (maze[cell.r][cell.c] === FLOOR) maze[cell.r][cell.c] = RECORD;
        }

        // Place exit
        var exitPlaced = false;
        for (var i = floorCells.length - 1; i >= 0; i--) {
            var cell = floorCells[i];
            if (maze[cell.r][cell.c] === FLOOR) {
                maze[cell.r][cell.c] = EXIT;
                exitPos.x = cell.c * TILE + TILE / 2;
                exitPos.y = cell.r * TILE + TILE / 2;
                exitPlaced = true;
                break;
            }
        }

        // Place patients
        patients = [];
        var patientCount = 3 + Math.floor(GameUtils.getMultiplier());
        for (var p = 0; p < patientCount; p++) {
            for (var i = Math.floor(floorCells.length / 3) + p; i < floorCells.length; i++) {
                var cell = floorCells[i];
                if (maze[cell.r][cell.c] === FLOOR) {
                    patients.push({
                        x: cell.c * TILE + TILE / 2,
                        y: cell.r * TILE + TILE / 2,
                        speed: 1.0 + Math.random() * 0.5,
                        dir: Math.random() * Math.PI * 2,
                        chasing: false,
                        patrolTimer: 0,
                        type: Math.floor(Math.random() * 3), // 0=wanderer, 1=sitter, 2=sprinter
                    });
                    break;
                }
            }
        }
    }

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
    }

    function isWall(px, py) {
        var col = Math.floor(px / TILE), row = Math.floor(py / TILE);
        if (row < 0 || row >= MAP_H || col < 0 || col >= MAP_W) return true;
        return maze[row][col] === WALL;
    }
    function canMove(px, py, s) {
        s = s || 7;
        return !isWall(px - s, py - s) && !isWall(px + s, py - s) && !isWall(px - s, py + s) && !isWall(px + s, py + s);
    }

    function tryInteract() {
        var pc = Math.floor(player.x / TILE), pr = Math.floor(player.y / TILE);
        // Check adjacent cells too
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
            var r = pr + dr, c = pc + dc;
            if (r < 0 || r >= MAP_H || c < 0 || c >= MAP_W) continue;
            if (maze[r][c] === FUSE) {
                maze[r][c] = FLOOR;
                fusesFound++;
                battery = Math.min(100, battery + 20);
                HorrorAudio.playCollect();
                if (window.ChallengeManager) ChallengeManager.notify('haunted-asylum', 'fuses_found', 1);
                interactCooldown = 0.5;
                updateHUD();
                return;
            }
            if (maze[r][c] === RECORD) {
                maze[r][c] = FLOOR;
                recordsFound++;
                sanity = Math.min(100, sanity + 5);
                HorrorAudio.playCollect();
                if (window.ChallengeManager) ChallengeManager.notify('haunted-asylum', 'records', 1);
                interactCooldown = 0.5;
                updateHUD();
                return;
            }
        }
    }

    function updateHUD() {
        var fusesEl = document.getElementById('hud-fuses');
        var battEl = document.getElementById('hud-battery');
        var sanEl = document.getElementById('hud-sanity');
        var recEl = document.getElementById('hud-records');
        if (fusesEl) fusesEl.textContent = '🔌 Fuses: ' + fusesFound + ' / ' + totalFuses;
        if (battEl) { battEl.textContent = '🔋 Battery: ' + Math.round(battery) + '%'; battEl.style.color = battery > 50 ? '#00ff88' : battery > 25 ? '#ffaa00' : '#ff4444'; }
        if (sanEl) { sanEl.textContent = '🧠 Sanity: ' + Math.round(sanity) + '%'; sanEl.style.color = sanity > 50 ? '#aa88ff' : sanity > 25 ? '#ff88aa' : '#ff4444'; }
        if (recEl) recEl.textContent = '📋 Records: ' + recordsFound;
    }

    // ============ UPDATE ============
    function update(dt) {
        if (!gameActive) return;
        timeSurvived += dt;
        if (interactCooldown > 0) interactCooldown -= dt;
        if (scareFlash > 0) scareFlash -= dt * 2;

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
        }

        // Battery drain
        battery -= (sprinting ? 0.12 : 0.02) * dt * 60 * GameUtils.getMultiplier();
        if (battery < 0) battery = 0;

        // Sanity drain (faster when near patients or in dark)
        var nearPatient = false;
        patients.forEach(function (p) {
            var dx = player.x - p.x, dy = player.y - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < TILE * 5) nearPatient = true;
        });
        sanity -= (nearPatient ? 0.08 : 0.02) * dt * 60 * GameUtils.getMultiplier();
        if (sanity <= 0) { sanity = 0; gameOver('Your mind broke... You belong here now.'); return; }

        flickerTimer += dt;

        // Challenges
        if (window.ChallengeManager) {
            ChallengeManager.notify('haunted-asylum', 'time_survived', timeSurvived);
            ChallengeManager.notify('haunted-asylum', 'sanity_remaining', Math.round(sanity));
        }

        // Check exit
        if (fusesFound >= totalFuses) {
            var dx = player.x - exitPos.x, dy = player.y - exitPos.y;
            if (Math.sqrt(dx * dx + dy * dy) < TILE * 0.7) { gameWin(); return; }
        }

        // Update patients
        updatePatients(dt);
        updateHUD();

        // Camera
        cameraOffset.x = player.x - canvas.width / 2;
        cameraOffset.y = player.y - canvas.height / 2;
    }

    function updatePatients(dt) {
        patients.forEach(function (p) {
            var dx = player.x - p.x, dy = player.y - p.y, dist = Math.sqrt(dx * dx + dy * dy);
            var detectionRange = LIGHT_RADIUS * (battery / 100) * 1.8;

            p.chasing = dist < detectionRange && battery > 0;

            var spd;
            if (p.chasing) {
                spd = (p.type === 2 ? 2.8 : 1.8) * GameUtils.getMultiplier();
                var angle = Math.atan2(dy, dx);
                var nx = p.x + Math.cos(angle) * spd * TILE * dt;
                var ny = p.y + Math.sin(angle) * spd * TILE * dt;
                if (canMove(nx, p.y, 6)) p.x = nx;
                if (canMove(p.x, ny, 6)) p.y = ny;
            } else {
                if (p.type === 1) return; // Sitter doesn't patrol
                p.patrolTimer -= dt;
                if (p.patrolTimer <= 0) { p.dir = Math.random() * Math.PI * 2; p.patrolTimer = 1.5 + Math.random() * 3; }
                spd = p.speed * 0.4;
                var nx = p.x + Math.cos(p.dir) * spd * TILE * dt;
                var ny = p.y + Math.sin(p.dir) * spd * TILE * dt;
                if (canMove(nx, ny, 6)) { p.x = nx; p.y = ny; } else { p.dir = Math.random() * Math.PI * 2; }
            }

            // Collision check
            if (dist < TILE * 0.45) { gameOver(getPatientDeathMsg(p)); return; }
        });
    }

    function getPatientDeathMsg(p) {
        var msgs = [
            'A patient grabbed you from behind...',
            'You couldn\'t escape their grasp...',
            'They were faster than you expected...',
            'The asylum claimed another soul...',
        ];
        return msgs[Math.floor(Math.random() * msgs.length)];
    }

    // ============ RENDER ============
    function render() {
        var w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        if (!maze.length) return;

        ctx.save();
        ctx.translate(-cameraOffset.x, -cameraOffset.y);

        var startCol = Math.max(0, Math.floor(cameraOffset.x / TILE) - 1);
        var endCol = Math.min(MAP_W, Math.ceil((cameraOffset.x + w) / TILE) + 1);
        var startRow = Math.max(0, Math.floor(cameraOffset.y / TILE) - 1);
        var endRow = Math.min(MAP_H, Math.ceil((cameraOffset.y + h) / TILE) + 1);

        for (var r = startRow; r < endRow; r++) {
            for (var c = startCol; c < endCol; c++) {
                var x = c * TILE, y = r * TILE, cell = maze[r][c];
                if (cell === WALL) {
                    // Asylum walls — tiled look
                    ctx.fillStyle = '#1a2a1a';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = '#243824';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, TILE, TILE);
                    // Cracks
                    if ((r * 7 + c * 13) % 11 === 0) {
                        ctx.strokeStyle = '#0f180f';
                        ctx.beginPath();
                        ctx.moveTo(x + TILE * 0.3, y);
                        ctx.lineTo(x + TILE * 0.5, y + TILE * 0.6);
                        ctx.lineTo(x + TILE * 0.4, y + TILE);
                        ctx.stroke();
                    }
                } else {
                    // Floor tiles
                    ctx.fillStyle = (r + c) % 2 === 0 ? '#0a100a' : '#0c120c';
                    ctx.fillRect(x, y, TILE, TILE);
                }

                if (cell === FUSE) {
                    ctx.fillStyle = '#ff8800';
                    ctx.shadowColor = '#ff8800';
                    ctx.shadowBlur = 12;
                    ctx.font = '20px serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('🔌', x + TILE / 2, y + TILE / 2 + 6);
                    ctx.shadowBlur = 0;
                }
                if (cell === RECORD) {
                    ctx.fillStyle = '#aaaaff';
                    ctx.font = '16px serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('📋', x + TILE / 2, y + TILE / 2 + 5);
                }
                if (cell === EXIT) {
                    var canExit = fusesFound >= totalFuses;
                    ctx.fillStyle = canExit ? 'rgba(0,255,100,0.25)' : 'rgba(80,40,40,0.25)';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = canExit ? '#00ff66' : '#883333';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
                    ctx.fillStyle = canExit ? '#00ff66' : '#883333';
                    ctx.font = '12px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText('EXIT', x + TILE / 2, y + TILE / 2 + 4);
                }
            }
        }

        // Draw patients
        patients.forEach(function (p) {
            var patientColors = ['#668866', '#886666', '#666688'];
            var col = patientColors[p.type] || '#668866';
            ctx.fillStyle = p.chasing ? '#cc4444' : col;
            ctx.shadowColor = p.chasing ? '#ff0000' : col;
            ctx.shadowBlur = p.chasing ? 18 : 6;

            // Body
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, 10, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Eyes (always watching)
            var edx = player.x - p.x, edy = player.y - p.y;
            var eAngle = Math.atan2(edy, edx);
            ctx.fillStyle = p.chasing ? '#ff0000' : '#ffff88';
            ctx.beginPath();
            ctx.arc(p.x + Math.cos(eAngle) * 4 - 3, p.y - 2, 2, 0, Math.PI * 2);
            ctx.arc(p.x + Math.cos(eAngle) * 4 + 3, p.y - 2, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;

            // Patient gown (line below)
            ctx.strokeStyle = col;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y + 8);
            ctx.lineTo(p.x, p.y + 16);
            ctx.stroke();
        });

        // Draw player
        ctx.fillStyle = '#ccccee';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Flashlight cone effect
        var lightR = LIGHT_RADIUS * (battery / 100);
        var flicker = Math.sin(flickerTimer * 12) * 2 + Math.sin(flickerTimer * 19) * 1.5;
        var finalR = Math.max(25, lightR + flicker);

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.96)';
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        var cx = player.x - cameraOffset.x, cy = player.y - cameraOffset.y;
        ctx.moveTo(cx + finalR, cy);
        ctx.arc(cx, cy, finalR, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.restore();

        // Warm light gradient
        var grd = ctx.createRadialGradient(cx, cy, finalR * 0.1, cx, cy, finalR);
        grd.addColorStop(0, 'rgba(200,255,200,0.06)');
        grd.addColorStop(0.5, 'rgba(150,200,150,0.03)');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        // Sanity effects
        if (sanity < 50) {
            // Vignette gets stronger
            var vigGrd = ctx.createRadialGradient(w / 2, h / 2, w * 0.1, w / 2, h / 2, w * 0.5);
            vigGrd.addColorStop(0, 'transparent');
            vigGrd.addColorStop(1, 'rgba(40,0,20,' + (0.3 * (1 - sanity / 50)) + ')');
            ctx.fillStyle = vigGrd;
            ctx.fillRect(0, 0, w, h);
        }
        if (sanity < 30) {
            // Hallucination particles
            ctx.fillStyle = 'rgba(255,0,0,0.1)';
            for (var i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 20, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Scare flash
        if (scareFlash > 0) {
            ctx.fillStyle = 'rgba(255,0,0,' + (scareFlash * 0.3) + ')';
            ctx.fillRect(0, 0, w, h);
        }
    }

    // ============ GAME FLOW ============
    function gameOver(msg) {
        gameActive = false;
        GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playJumpScare();
        setTimeout(function () { HorrorAudio.playDeath(); }, 400);
        HorrorAudio.stopDrone();
        HorrorAudio.stopHeartbeat();
        document.getElementById('death-msg').textContent = msg || 'They caught you...';
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';

        if (window.ChallengeManager) {
            ChallengeManager.notify('haunted-asylum', 'fuses_found', fusesFound);
            ChallengeManager.notify('haunted-asylum', 'records', recordsFound);
            ChallengeManager.notify('haunted-asylum', 'time_survived', timeSurvived);
        }
    }

    function gameWin() {
        gameActive = false;
        HorrorAudio.playWin();
        HorrorAudio.stopDrone();
        HorrorAudio.stopHeartbeat();
        GameUtils.setState(GameUtils.STATE.WIN);

        if (window.ChallengeManager) {
            ChallengeManager.notify('haunted-asylum', 'escapes', 1);
            ChallengeManager.notify('haunted-asylum', 'fuses_found', fusesFound);
            ChallengeManager.notify('haunted-asylum', 'records', recordsFound);
            ChallengeManager.notify('haunted-asylum', 'time_survived', timeSurvived);
            ChallengeManager.notify('haunted-asylum', 'sanity_remaining', Math.round(sanity));
        }

        document.getElementById('win-msg').textContent = 'You escaped! Battery: ' + Math.round(battery) + '% | Sanity: ' + Math.round(sanity) + '% | Records: ' + recordsFound;
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
    }

    function restartLevel() {
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        fusesFound = 0; recordsFound = 0; battery = 100; sanity = 100; timeSurvived = 0;
        player.x = 1 * TILE + TILE / 2;
        player.y = 1 * TILE + TILE / 2;
        HorrorAudio.startDrone(40, 'dark');
        HorrorAudio.startHeartbeat(50);
        gameActive = true;
        GameUtils.setState(GameUtils.STATE.PLAYING);
        lastTime = performance.now();
    }

    function startGame() {
        document.getElementById('start-screen').style.display = 'none';
        var ctrlOverlay = document.getElementById('controls-overlay');
        ctrlOverlay.style.display = 'flex';
        generateMap();
        HorrorAudio.startDrone(40, 'dark');
        HorrorAudio.startHeartbeat(50);
        setTimeout(function () {
            ctrlOverlay.classList.add('hiding');
            setTimeout(function () {
                ctrlOverlay.style.display = 'none';
                ctrlOverlay.classList.remove('hiding');
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                fusesFound = 0; recordsFound = 0; battery = 100; sanity = 100; timeSurvived = 0;
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
