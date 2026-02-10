/* ============================================
   Blood Tetris — Horror-Themed Puzzle Game
   Canvas 2D
   ============================================ */
(function () {
    'use strict';

    const COLS = 10, ROWS = 20, BLOCK = 32;
    const COLORS = ['#cc2222', '#882222', '#aa3333', '#993311', '#cc4400', '#881144', '#773322'];
    const PIECE_NAMES = ['Femur', 'Skull', 'Ribs', 'Eye', 'Heart', 'Spine', 'Claw'];

    // Tetromino shapes
    const SHAPES = [
        [[1, 1, 1, 1]],                           // I - Femur
        [[1, 1], [1, 1]],                         // O - Skull
        [[0, 1, 0], [1, 1, 1]],                     // T - Ribs
        [[1, 0], [1, 0], [1, 1]],                   // L - Eye
        [[0, 1], [0, 1], [1, 1]],                   // J - Heart
        [[0, 1, 1], [1, 1, 0]],                     // S - Spine
        [[1, 1, 0], [0, 1, 1]],                     // Z - Claw
    ];

    let canvas, ctx;
    let board = [], score = 0, level = 1, lines = 0;
    let current = null, currentX = 0, currentY = 0, currentColor = 0;
    let dropTimer = 0, dropInterval = 800;
    let gameActive = false, lastTime = 0;
    let bgDarken = 0; // gets darker as score rises
    let shakeTimer = 0, shakeMag = 0;
    let bloodLevel = 0; // visual blood rising from bottom
    let flashTimer = 0;
    let nextPiece = null, nextColor = 0;

    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; lastTime = performance.now(); gameLoop(); },
        onRestart: restartGame
    });

    document.getElementById('start-btn').addEventListener('click', function () {
        HorrorAudio.init(); startGame();
    });

    document.addEventListener('keydown', function (e) {
        if (!gameActive) return;
        if (e.code === 'Escape') { gameActive = false; GameUtils.pauseGame(); return; }
        if (e.code === 'ArrowLeft') movePiece(-1, 0);
        else if (e.code === 'ArrowRight') movePiece(1, 0);
        else if (e.code === 'ArrowDown') { movePiece(0, 1); score += 1; }
        else if (e.code === 'ArrowUp') rotatePiece();
        else if (e.code === 'Space') { hardDrop(); e.preventDefault(); }
    });

    function initBoard() {
        board = [];
        for (var r = 0; r < ROWS; r++) { board[r] = []; for (var c = 0; c < COLS; c++) board[r][c] = 0; }
    }

    function randomPiece() {
        var idx = Math.floor(Math.random() * SHAPES.length);
        return { shape: SHAPES[idx].map(function (r) { return r.slice(); }), color: idx + 1 };
    }

    function spawnPiece() {
        if (nextPiece) {
            current = nextPiece.shape; currentColor = nextPiece.color;
        } else {
            var p = randomPiece(); current = p.shape; currentColor = p.color;
        }
        var np = randomPiece(); nextPiece = { shape: np.shape, color: np.color };
        currentX = Math.floor((COLS - current[0].length) / 2);
        currentY = 0;
        if (collides(current, currentX, currentY)) gameOver();
    }

    function collides(shape, ox, oy) {
        for (var r = 0; r < shape.length; r++) {
            for (var c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    var nx = ox + c, ny = oy + r;
                    if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
                    if (ny >= 0 && board[ny][nx]) return true;
                }
            }
        }
        return false;
    }

    function merge() {
        for (var r = 0; r < current.length; r++) {
            for (var c = 0; c < current[r].length; c++) {
                if (current[r][c]) {
                    var ny = currentY + r, nx = currentX + c;
                    if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) board[ny][nx] = currentColor;
                }
            }
        }
    }

    function movePiece(dx, dy) {
        if (!collides(current, currentX + dx, currentY + dy)) {
            currentX += dx; currentY += dy;
            if (dx !== 0) HorrorAudio.playClick();
            return true;
        }
        return false;
    }

    function rotatePiece() {
        var rotated = [];
        for (var c = 0; c < current[0].length; c++) {
            rotated[c] = [];
            for (var r = current.length - 1; r >= 0; r--) {
                rotated[c].push(current[r][c]);
            }
        }
        if (!collides(rotated, currentX, currentY)) {
            current = rotated;
            HorrorAudio.playClick();
        }
    }

    function hardDrop() {
        while (!collides(current, currentX, currentY + 1)) { currentY++; score += 2; }
        lockPiece();
        HorrorAudio.playHit();
    }

    function lockPiece() {
        merge();
        clearLines();
        spawnPiece();
        dropTimer = 0;
    }

    function clearLines() {
        var cleared = 0;
        for (var r = ROWS - 1; r >= 0; r--) {
            var full = true;
            for (var c = 0; c < COLS; c++) { if (!board[r][c]) { full = false; break; } }
            if (full) {
                board.splice(r, 1);
                var newRow = []; for (var c = 0; c < COLS; c++) newRow[c] = 0;
                board.unshift(newRow);
                cleared++; r++; // re-check this row
            }
        }
        if (cleared > 0) {
            var points = [0, 100, 300, 500, 800];
            score += (points[cleared] || 800) * level;
            lines += cleared;
            if (window.ChallengeManager) {
                ChallengeManager.notify('blood-tetris', 'lines_cleared', cleared);
                ChallengeManager.notify('blood-tetris', 'lines_session', lines);
                ChallengeManager.notify('blood-tetris', 'score', score);
            }
            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(80, 800 - (level - 1) * 70);
            bloodLevel = Math.min(ROWS * 0.4, bloodLevel + cleared * 0.5);
            shakeTimer = 0.3; shakeMag = cleared * 2;
            flashTimer = 0.15;

            if (cleared >= 4) {
                HorrorAudio.playJumpScare();
            } else {
                HorrorAudio.playCollect();
            }
        }
    }

    function startGame() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        canvas.width = COLS * BLOCK + 180; // extra space for next piece and score
        canvas.height = ROWS * BLOCK;

        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';

        HorrorAudio.startDrone(40, 'dark');

        if (window.QualityFX) QualityFX.init2D(canvas, ctx);

        setTimeout(function () {
            ctrl.classList.add('hiding');
            setTimeout(function () {
                ctrl.style.display = 'none'; ctrl.classList.remove('hiding');
                initBoard(); score = 0; level = 1; lines = 0;
                dropTimer = 0; bloodLevel = 0; bgDarken = 0;
                nextPiece = null;
                spawnPiece();
                gameActive = true;
                GameUtils.setState(GameUtils.STATE.PLAYING);
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                lastTime = performance.now();
                gameLoop();
            }, 800);
        }, 2500);
    }

    function restartGame() {
        initBoard(); score = 0; level = 1; lines = 0;
        dropTimer = 0; bloodLevel = 0; bgDarken = 0;
        nextPiece = null;
        spawnPiece();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        HorrorAudio.startDrone(40, 'dark');
        gameActive = true;
        GameUtils.setState(GameUtils.STATE.PLAYING);
        lastTime = performance.now();
        gameLoop();
    }

    function gameOver() {
        gameActive = false;
        GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playDeath();
        HorrorAudio.stopDrone();
        document.getElementById('final-score').textContent = 'Score: ' + score + ' | Level: ' + level;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var retryBtn = document.querySelector('#game-over-screen .play-btn');
        if (retryBtn) retryBtn.onclick = restartGame;
    }

    function drawBlock(x, y, colorIdx, ghost) {
        var bx = x * BLOCK, by = y * BLOCK;
        var col = COLORS[colorIdx - 1] || '#444';
        if (ghost) {
            ctx.strokeStyle = col; ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.3;
            ctx.strokeRect(bx + 1, by + 1, BLOCK - 2, BLOCK - 2);
            ctx.globalAlpha = 1;
            return;
        }
        // Glow
        ctx.shadowColor = col; ctx.shadowBlur = 6;
        ctx.fillStyle = col;
        ctx.fillRect(bx + 1, by + 1, BLOCK - 2, BLOCK - 2);
        ctx.shadowBlur = 0;
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(bx + 1, by + 1, BLOCK - 2, 4);
        ctx.fillRect(bx + 1, by + 1, 4, BLOCK - 2);
        // Shadow edge
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(bx + BLOCK - 4, by + 1, 3, BLOCK - 2);
        ctx.fillRect(bx + 1, by + BLOCK - 4, BLOCK - 2, 3);
        // Vein-like detail for horror
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(bx + BLOCK * 0.3, by + 2);
        ctx.bezierCurveTo(bx + BLOCK * 0.5, by + BLOCK * 0.4, bx + BLOCK * 0.2, by + BLOCK * 0.7, bx + BLOCK * 0.6, by + BLOCK - 2);
        ctx.stroke();
    }

    function getGhostY() {
        var gy = currentY;
        while (!collides(current, currentX, gy + 1)) gy++;
        return gy;
    }

    function draw() {
        var w = canvas.width, h = canvas.height;
        var boardW = COLS * BLOCK;

        // Background - gets darker with score
        bgDarken = Math.min(0.6, score * 0.00005);
        var bgR = Math.floor(10 - bgDarken * 10);
        ctx.fillStyle = 'rgb(' + bgR + ',0,0)';
        ctx.fillRect(0, 0, w, h);

        // Shake offset
        var sx = 0, sy = 0;
        if (shakeTimer > 0) {
            sx = (Math.random() - 0.5) * shakeMag;
            sy = (Math.random() - 0.5) * shakeMag;
        }
        ctx.save(); ctx.translate(sx, sy);

        // Blood pool at bottom
        if (bloodLevel > 0) {
            var bloodH = bloodLevel * BLOCK;
            var bGrd = ctx.createLinearGradient(0, h - bloodH, 0, h);
            bGrd.addColorStop(0, 'rgba(120,0,0,0.3)');
            bGrd.addColorStop(1, 'rgba(80,0,0,0.7)');
            ctx.fillStyle = bGrd;
            ctx.fillRect(0, h - bloodH, boardW, bloodH);
            // Bubbles in blood
            for (var i = 0; i < 5; i++) {
                ctx.fillStyle = 'rgba(160,0,0,0.4)';
                ctx.beginPath();
                ctx.arc(Math.random() * boardW, h - Math.random() * bloodH, 2 + Math.random() * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Grid lines
        ctx.strokeStyle = 'rgba(60,0,0,0.3)'; ctx.lineWidth = 0.5;
        for (var c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, h); ctx.stroke(); }
        for (var r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(boardW, r * BLOCK); ctx.stroke(); }

        // Board
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                if (board[r][c]) {
                    drawBlock(c, r, board[r][c], false);
                    // Light from static blocks
                    if (window.QualityFX && Math.random() < 0.1) { // Optimize: flickering random blocks
                        var col = COLORS[board[r][c]-1];
                        QualityFX.addLight2D(c * BLOCK + BLOCK/2, r * BLOCK + BLOCK/2, 60, col, 0.4);
                    }
                }
            }
        }

        // Ghost piece
        if (current) {
            var gy = getGhostY();
            for (var r = 0; r < current.length; r++) {
                for (var c = 0; c < current[r].length; c++) {
                    if (current[r][c]) drawBlock(currentX + c, gy + r, currentColor, true);
                }
            }
        }

        // Current piece
        if (current) {
            for (var r = 0; r < current.length; r++) {
                for (var c = 0; c < current[r].length; c++) {
                    if (current[r][c]) {
                        drawBlock(currentX + c, currentY + r, currentColor, false);
                        // Active piece light
                        if (window.QualityFX) {
                            var col = COLORS[currentColor-1];
                            QualityFX.addLight2D((currentX + c) * BLOCK + BLOCK/2, (currentY + r) * BLOCK + BLOCK/2, 100, col, 0.6);
                        }
                    }
                }
            }
        }

        // Line clear flash
        if (flashTimer > 0) {
            ctx.fillStyle = 'rgba(200,0,0,' + (flashTimer * 3) + ')';
            ctx.fillRect(0, 0, boardW, h);
        }

        ctx.restore();

        // Side panel — dark background
        ctx.fillStyle = '#0a0000';
        ctx.fillRect(boardW, 0, 180, h);
        ctx.strokeStyle = 'rgba(100,0,0,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(boardW, 0); ctx.lineTo(boardW, h); ctx.stroke();

        // Next piece preview
        ctx.fillStyle = '#ff4444'; ctx.font = '600 16px Inter, sans-serif';
        ctx.fillText('NEXT', boardW + 20, 30);
        if (nextPiece) {
            var previewBlock = 20;
            for (var r = 0; r < nextPiece.shape.length; r++) {
                for (var c = 0; c < nextPiece.shape[r].length; c++) {
                    if (nextPiece.shape[r][c]) {
                        var px = boardW + 20 + c * previewBlock, py = 45 + r * previewBlock;
                        ctx.shadowColor = COLORS[nextPiece.color - 1]; ctx.shadowBlur = 4;
                        ctx.fillStyle = COLORS[nextPiece.color - 1];
                        ctx.fillRect(px, py, previewBlock - 2, previewBlock - 2);
                        ctx.shadowBlur = 0;
                    }
                }
            }
        }

        // Score display
        ctx.fillStyle = '#cc3333'; ctx.font = '600 14px Inter, sans-serif';
        ctx.fillText('SCORE', boardW + 20, 140);
        ctx.fillStyle = '#ff6666'; ctx.font = '700 22px Inter, monospace';
        ctx.fillText(String(score), boardW + 20, 168);

        ctx.fillStyle = '#cc3333'; ctx.font = '600 14px Inter, sans-serif';
        ctx.fillText('LEVEL', boardW + 20, 210);
        ctx.fillStyle = '#ff6666'; ctx.font = '700 22px Inter, monospace';
        ctx.fillText(String(level), boardW + 20, 238);

        ctx.fillStyle = '#cc3333'; ctx.font = '600 14px Inter, sans-serif';
        ctx.fillText('LINES', boardW + 20, 280);
        ctx.fillStyle = '#ff6666'; ctx.font = '700 22px Inter, monospace';
        ctx.fillText(String(lines), boardW + 20, 308);

        // Horror text that appears at higher levels
        if (level >= 3) {
            ctx.globalAlpha = 0.1 + Math.sin(Date.now() * 0.002) * 0.05;
            ctx.fillStyle = '#ff0000'; ctx.font = '600 11px Inter, sans-serif';
            var msgs = ['IT HUNGERS', 'FEED IT', 'NO ESCAPE', 'DEEPER', 'MORE'];
            ctx.fillText(msgs[level % msgs.length], boardW + 20, 380);
            ctx.globalAlpha = 1;
        }

        // Vignette over entire canvas
        var vigGrd = ctx.createRadialGradient(boardW / 2, h / 2, boardW * 0.3, boardW / 2, h / 2, boardW * 0.8);
        vigGrd.addColorStop(0, 'transparent');
        vigGrd.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vigGrd;
        ctx.fillRect(0, 0, boardW, h);

        // Update HUD
        var s1 = document.getElementById('hud-score'); if (s1) s1.textContent = 'Score: ' + score;
        var s2 = document.getElementById('hud-level'); if (s2) s2.textContent = 'Level: ' + level;
        var s3 = document.getElementById('hud-lines'); if (s3) s3.textContent = 'Lines: ' + lines;
    }

    function gameLoop(time) {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        if (!time) time = performance.now();
        var dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;

        // Drop timer
        dropTimer += dt * 1000;
        var interval = dropInterval / GameUtils.getMultiplier();
        if (dropTimer >= interval) {
            dropTimer = 0;
            if (!movePiece(0, 1)) lockPiece();
        }

        // Decay effects
        if (shakeTimer > 0) shakeTimer -= dt;
        if (flashTimer > 0) flashTimer -= dt;
        if (bloodLevel > 0) bloodLevel = Math.max(0, bloodLevel - dt * 0.1);

        draw();
    }
})();
