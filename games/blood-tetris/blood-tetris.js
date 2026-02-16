/* ============================================
   Blood Tetris — Horror-Themed Puzzle Game
   OVERHAULED: Hold piece, combo system, power-ups,
   bone pieces, cursed events, speed levels, stats
   ============================================ */
(function () {
    'use strict';

    const COLS = 10, ROWS = 20, BLOCK = 32;
    const COLORS = ['#cc2222', '#882222', '#aa3333', '#993311', '#cc4400', '#881144', '#773322'];
    const PIECE_NAMES = ['Femur', 'Skull', 'Ribs', 'Eye', 'Heart', 'Spine', 'Claw'];

    const SHAPES = [
        [[1, 1, 1, 1]],
        [[1, 1], [1, 1]],
        [[0, 1, 0], [1, 1, 1]],
        [[1, 0], [1, 0], [1, 1]],
        [[0, 1], [0, 1], [1, 1]],
        [[0, 1, 1], [1, 1, 0]],
        [[1, 1, 0], [0, 1, 1]],
    ];

    let canvas, ctx;
    let board = [], score = 0, level = 1, lines = 0;
    let current = null, currentX = 0, currentY = 0, currentColor = 0;
    let dropTimer = 0, dropInterval = 800;
    let gameActive = false, lastTime = 0;
    let bgDarken = 0, shakeTimer = 0, shakeMag = 0;
    let bloodLevel = 0, flashTimer = 0;
    let nextPiece = null, nextColor = 0;

    // ── NEW: Hold piece system ────────────────────────
    let holdPiece = null, holdColor = 0, holdUsed = false;

    // ── NEW: Combo system ─────────────────────────────
    let combo = 0, maxCombo = 0, comboTimer = 0;
    let backToBack = false; // consecutive difficult clears

    // ── NEW: Power-ups ────────────────────────────────
    let powerUps = [];
    let activePower = '';
    let powerTimer = 0;
    const POWER_TYPES = [
        { id: 'slow', name: '⏳ Time Slow', duration: 10, color: '#4488ff' },
        { id: 'clear_row', name: '💥 Clear Bottom', duration: 0, color: '#ff8800' },
        { id: 'tiny', name: '🔬 Thin Pieces', duration: 8, color: '#44ff44' },
        { id: 'bomb', name: '💣 Bone Bomb', duration: 0, color: '#ff4444' },
    ];

    // ── NEW: Cursed events ────────────────────────────
    let curseActive = false, curseType = '', curseTimer = 0;
    let nextCurseTime = 30;
    const CURSES = ['flip_controls', 'speed_burst', 'fog', 'garbage_row', 'invisible'];

    // ── NEW: Stats ────────────────────────────────────
    let totalClears = { single: 0, double: 0, triple: 0, tetris: 0 };
    let totalTime = 0, piecesPlaced = 0;

    // ── NEW: Particles ────────────────────────────────
    let particles = [];

    // ── NEW: Messages ─────────────────────────────────
    let msgText = '', msgTimer2 = 0;

    // ── Piece bag (7-bag system for fairness) ─────────
    let pieceBag = [];
    function fillBag() {
        pieceBag = [0, 1, 2, 3, 4, 5, 6];
        for (var i = pieceBag.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pieceBag[i]; pieceBag[i] = pieceBag[j]; pieceBag[j] = t; }
    }
    function nextFromBag() {
        if (pieceBag.length === 0) fillBag();
        var idx = pieceBag.pop();
        return { shape: SHAPES[idx].map(r => r.slice()), color: idx + 1 };
    }

    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; lastTime = performance.now(); gameLoop(); },
        onRestart: restartGame
    });

    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });

    document.addEventListener('keydown', function (e) {
        if (!gameActive) return;
        if (e.code === 'Escape') { gameActive = false; GameUtils.pauseGame(); return; }
        var left = 'ArrowLeft', right = 'ArrowRight';
        if (curseActive && curseType === 'flip_controls') { left = 'ArrowRight'; right = 'ArrowLeft'; }
        if (e.code === left) movePiece(-1, 0);
        else if (e.code === right) movePiece(1, 0);
        else if (e.code === 'ArrowDown') { movePiece(0, 1); score += 1; }
        else if (e.code === 'ArrowUp') rotatePiece();
        else if (e.code === 'Space') { hardDrop(); e.preventDefault(); }
        else if (e.code === 'KeyC' || e.code === 'ShiftLeft') holdCurrentPiece();
    });

    function initBoard() {
        board = [];
        for (var r = 0; r < ROWS; r++) { board[r] = []; for (var c = 0; c < COLS; c++) board[r][c] = 0; }
    }

    function spawnPiece() {
        if (nextPiece) { current = nextPiece.shape; currentColor = nextPiece.color; }
        else { var p = nextFromBag(); current = p.shape; currentColor = p.color; }
        var np = nextFromBag(); nextPiece = { shape: np.shape, color: np.color };
        currentX = Math.floor((COLS - current[0].length) / 2);
        currentY = 0;
        holdUsed = false;
        piecesPlaced++;
        if (collides(current, currentX, currentY)) gameOver();
    }

    // ── Hold Piece ────────────────────────────────────
    function holdCurrentPiece() {
        if (holdUsed) return;
        holdUsed = true;
        if (holdPiece) {
            var temp = { shape: holdPiece, color: holdColor };
            holdPiece = current;
            holdColor = currentColor;
            current = temp.shape;
            currentColor = temp.color;
        } else {
            holdPiece = current;
            holdColor = currentColor;
            spawnPiece();
        }
        currentX = Math.floor((COLS - current[0].length) / 2);
        currentY = 0;
        HorrorAudio.playClick();
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
            for (var r = current.length - 1; r >= 0; r--) rotated[c].push(current[r][c]);
        }
        // Wall kick attempts
        var kicks = [0, -1, 1, -2, 2];
        for (var k = 0; k < kicks.length; k++) {
            if (!collides(rotated, currentX + kicks[k], currentY)) {
                current = rotated;
                currentX += kicks[k];
                HorrorAudio.playClick();
                return;
            }
        }
    }

    function hardDrop() {
        var dropDist = 0;
        while (!collides(current, currentX, currentY + 1)) { currentY++; dropDist++; }
        score += dropDist * 2;
        lockPiece();
        HorrorAudio.playHit();
        // Drop particles
        for (var c = 0; c < current[0].length; c++) {
            spawnParticles(currentX * BLOCK + c * BLOCK + BLOCK / 2, currentY * BLOCK + current.length * BLOCK, COLORS[currentColor - 1], 3);
        }
    }

    function lockPiece() {
        merge();
        clearLines();
        // Check for power-up row
        checkPowerUps();
        spawnPiece();
        dropTimer = 0;
    }

    function clearLines() {
        var cleared = 0;
        var clearedRows = [];
        for (var r = ROWS - 1; r >= 0; r--) {
            var full = true;
            for (var c = 0; c < COLS; c++) { if (!board[r][c]) { full = false; break; } }
            if (full) {
                clearedRows.push(r);
                board.splice(r, 1);
                var newRow = []; for (var c = 0; c < COLS; c++) newRow[c] = 0;
                board.unshift(newRow);
                cleared++; r++;
            }
        }
        if (cleared > 0) {
            // Combo system
            combo++;
            if (combo > maxCombo) maxCombo = combo;
            comboTimer = 2;
            var comboMult = 1 + (combo - 1) * 0.5;

            // Back-to-back bonus for Tetris/T-spin
            var isTetris = cleared >= 4;
            var b2bMult = backToBack && isTetris ? 1.5 : 1;
            backToBack = isTetris;

            var points = [0, 100, 300, 500, 800];
            var gained = Math.floor((points[Math.min(cleared, 4)] || 800) * level * comboMult * b2bMult);
            score += gained;
            lines += cleared;

            // Stats
            if (cleared === 1) totalClears.single++;
            else if (cleared === 2) totalClears.double++;
            else if (cleared === 3) totalClears.triple++;
            else if (cleared >= 4) totalClears.tetris++;

            if (window.ChallengeManager) {
                ChallengeManager.notify('blood-tetris', 'lines_cleared', cleared);
                ChallengeManager.notify('blood-tetris', 'lines_session', lines);
                ChallengeManager.notify('blood-tetris', 'score', score);
            }

            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(60, 800 - (level - 1) * 60);
            bloodLevel = Math.min(ROWS * 0.4, bloodLevel + cleared * 0.6);
            shakeTimer = 0.3; shakeMag = cleared * 2.5;
            flashTimer = 0.15;

            // Messages
            var msgs = ['', 'Single', 'Double!', 'Triple!', '💀 TETRIS!'];
            var msg = msgs[Math.min(cleared, 4)] || '💀 TETRIS!';
            if (combo > 1) msg += ' x' + combo + ' COMBO';
            if (backToBack && isTetris) msg += ' B2B!';
            msg += ' +' + gained;
            showMsg(msg);

            // Spawn power-up occasionally
            if (Math.random() < 0.15 + cleared * 0.05) {
                var pt = POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)];
                var px = Math.floor(Math.random() * COLS);
                powerUps.push({ x: px * BLOCK + BLOCK / 2, y: -20, type: pt, timer: 8 });
            }

            // Particles for cleared rows
            for (var i = 0; i < clearedRows.length; i++) {
                for (var c = 0; c < COLS; c++) spawnParticles(c * BLOCK + BLOCK / 2, clearedRows[i] * BLOCK, '#ff4444', 2);
            }

            if (cleared >= 4) HorrorAudio.playJumpScare();
            else HorrorAudio.playCollect();
        } else {
            combo = 0; // Reset combo on no clear
        }
    }

    function checkPowerUps() {
        // Check if current piece landed on a power-up
        for (var i = powerUps.length - 1; i >= 0; i--) {
            var pu = powerUps[i];
            var pc = Math.floor(pu.x / BLOCK), pr = Math.floor(pu.y / BLOCK);
            if (pr >= currentY && pr <= currentY + current.length && pc >= currentX && pc <= currentX + current[0].length) {
                activatePowerUp(pu.type);
                powerUps.splice(i, 1);
            }
        }
    }

    function activatePowerUp(pt) {
        showMsg(pt.name + ' activated!');
        spawnParticles(COLS * BLOCK / 2, ROWS * BLOCK / 2, pt.color, 15);

        if (pt.id === 'slow') { activePower = 'slow'; powerTimer = pt.duration; }
        else if (pt.id === 'clear_row') {
            // Clear bottom row
            board.splice(ROWS - 1, 1);
            var newRow = []; for (var c = 0; c < COLS; c++) newRow[c] = 0;
            board.unshift(newRow);
            lines++; score += 50 * level;
            shakeTimer = 0.2; shakeMag = 3;
        }
        else if (pt.id === 'tiny') { activePower = 'tiny'; powerTimer = pt.duration; }
        else if (pt.id === 'bomb') {
            // Clear 3x3 area around center
            var cr = Math.floor(ROWS / 2), cc = Math.floor(COLS / 2);
            for (var r = cr - 1; r <= cr + 1; r++) for (var c = cc - 2; c <= cc + 2; c++) {
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = 0;
            }
            score += 100 * level;
            shakeTimer = 0.5; shakeMag = 6;
            spawnParticles(cc * BLOCK, cr * BLOCK, '#ff8800', 25);
        }
    }

    // ── Cursed Events ─────────────────────────────────
    function triggerCurse() {
        curseType = CURSES[Math.floor(Math.random() * CURSES.length)];
        curseActive = true;
        curseTimer = 5 + Math.random() * 5;

        if (curseType === 'flip_controls') { showMsg('⚠ CURSE: Controls reversed!'); }
        else if (curseType === 'speed_burst') { showMsg('⚠ CURSE: Speed surge!'); }
        else if (curseType === 'fog') { showMsg('⚠ CURSE: Fog descends!'); }
        else if (curseType === 'garbage_row') {
            // Add garbage row at bottom
            var row = [];
            var hole = Math.floor(Math.random() * COLS);
            for (var c = 0; c < COLS; c++) row[c] = c === hole ? 0 : 7;
            board.push(row);
            board.shift();
            showMsg('⚠ CURSE: Garbage row added!');
            shakeTimer = 0.3; shakeMag = 4;
            curseActive = false;
        }
        else if (curseType === 'invisible') { showMsg('⚠ CURSE: Invisible piece!'); }

        HorrorAudio.playJumpScare && HorrorAudio.playJumpScare();
    }

    function showMsg(text) { msgText = text; msgTimer2 = 2.5; }

    function spawnParticles(x, y, color, count) {
        for (var i = 0; i < count; i++) {
            particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120 - 30, life: 0.6 + Math.random() * 0.4, maxLife: 1, color: color, size: 2 + Math.random() * 3 });
        }
    }

    function getGhostY() {
        var gy = currentY;
        while (!collides(current, currentX, gy + 1)) gy++;
        return gy;
    }

    function drawBlock(x, y, colorIdx, ghost) {
        var bx = x * BLOCK, by = y * BLOCK;
        var col = COLORS[colorIdx - 1] || '#444';
        if (ghost) {
            ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.3;
            ctx.strokeRect(bx + 1, by + 1, BLOCK - 2, BLOCK - 2);
            ctx.globalAlpha = 1; return;
        }
        ctx.shadowColor = col; ctx.shadowBlur = 6;
        ctx.fillStyle = col; ctx.fillRect(bx + 1, by + 1, BLOCK - 2, BLOCK - 2);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bx + 1, by + 1, BLOCK - 2, 4); ctx.fillRect(bx + 1, by + 1, 4, BLOCK - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(bx + BLOCK - 4, by + 1, 3, BLOCK - 2); ctx.fillRect(bx + 1, by + BLOCK - 4, BLOCK - 2, 3);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(bx + BLOCK * 0.3, by + 2);
        ctx.bezierCurveTo(bx + BLOCK * 0.5, by + BLOCK * 0.4, bx + BLOCK * 0.2, by + BLOCK * 0.7, bx + BLOCK * 0.6, by + BLOCK - 2); ctx.stroke();
    }

    function draw() {
        var w = canvas.width, h = canvas.height;
        var boardPxW = COLS * BLOCK;

        bgDarken = Math.min(0.6, score * 0.00005);
        var bgR = Math.floor(10 - bgDarken * 10);
        ctx.fillStyle = 'rgb(' + bgR + ',0,0)'; ctx.fillRect(0, 0, w, h);

        var sx = 0, sy = 0;
        if (shakeTimer > 0) { sx = (Math.random() - 0.5) * shakeMag; sy = (Math.random() - 0.5) * shakeMag; }
        ctx.save(); ctx.translate(sx, sy);

        // Blood pool
        if (bloodLevel > 0) {
            var bloodH = bloodLevel * BLOCK;
            var bGrd = ctx.createLinearGradient(0, h - bloodH, 0, h);
            bGrd.addColorStop(0, 'rgba(120,0,0,0.3)'); bGrd.addColorStop(1, 'rgba(80,0,0,0.7)');
            ctx.fillStyle = bGrd; ctx.fillRect(0, h - bloodH, boardPxW, bloodH);
            for (var i = 0; i < 5; i++) {
                ctx.fillStyle = 'rgba(160,0,0,0.4)'; ctx.beginPath();
                ctx.arc(Math.random() * boardPxW, h - Math.random() * bloodH, 2 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
            }
        }

        // Grid
        ctx.strokeStyle = 'rgba(60,0,0,0.3)'; ctx.lineWidth = 0.5;
        for (var c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, h); ctx.stroke(); }
        for (var r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(boardPxW, r * BLOCK); ctx.stroke(); }

        // Board pieces
        var invisible = curseActive && curseType === 'invisible';
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                if (board[r][c]) drawBlock(c, r, board[r][c], false);
            }
        }

        // Ghost piece
        if (current && !invisible) {
            var gy = getGhostY();
            for (var r = 0; r < current.length; r++) for (var c = 0; c < current[r].length; c++) {
                if (current[r][c]) drawBlock(currentX + c, gy + r, currentColor, true);
            }
        }

        // Current piece
        if (current) {
            if (invisible) ctx.globalAlpha = 0.08;
            for (var r = 0; r < current.length; r++) for (var c = 0; c < current[r].length; c++) {
                if (current[r][c]) drawBlock(currentX + c, currentY + r, currentColor, false);
            }
            ctx.globalAlpha = 1;
        }

        // Power-ups on board
        for (var i = 0; i < powerUps.length; i++) {
            var pu = powerUps[i];
            ctx.fillStyle = pu.type.color; ctx.shadowColor = pu.type.color; ctx.shadowBlur = 10;
            var bob = Math.sin(Date.now() * 0.005 + i) * 4;
            ctx.beginPath(); ctx.arc(pu.x, pu.y + bob, 8, 0, Math.PI * 2); ctx.fill();
            ctx.font = '10px Inter'; ctx.textAlign = 'center';
            ctx.fillText(pu.type.name.split(' ')[0], pu.x, pu.y + bob - 12);
            ctx.shadowBlur = 0;
        }

        // Particles
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Fog curse
        if (curseActive && curseType === 'fog') {
            ctx.fillStyle = 'rgba(20,0,0,0.5)';
            ctx.fillRect(0, ROWS * BLOCK * 0.3, boardPxW, ROWS * BLOCK * 0.4);
        }

        // Line clear flash
        if (flashTimer > 0) { ctx.fillStyle = 'rgba(200,0,0,' + (flashTimer * 3) + ')'; ctx.fillRect(0, 0, boardPxW, h); }

        ctx.restore();

        // ── Side Panel ────────────────────────────────
        ctx.fillStyle = '#0a0000'; ctx.fillRect(boardPxW, 0, 200, h);
        ctx.strokeStyle = 'rgba(100,0,0,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(boardPxW, 0); ctx.lineTo(boardPxW, h); ctx.stroke();

        var panelX = boardPxW + 15;

        // Hold piece
        ctx.fillStyle = '#aa4444'; ctx.font = '600 14px Inter'; ctx.textAlign = 'left';
        ctx.fillText('HOLD [C]', panelX, 25);
        if (holdPiece) {
            var pb = 16;
            for (var r = 0; r < holdPiece.length; r++) for (var c = 0; c < holdPiece[r].length; c++) {
                if (holdPiece[r][c]) {
                    ctx.fillStyle = holdUsed ? '#444' : COLORS[holdColor - 1];
                    ctx.fillRect(panelX + c * pb, 35 + r * pb, pb - 2, pb - 2);
                }
            }
        }

        // Next piece
        ctx.fillStyle = '#ff4444'; ctx.font = '600 14px Inter';
        ctx.fillText('NEXT', panelX, 100);
        if (nextPiece) {
            var pb = 18;
            for (var r = 0; r < nextPiece.shape.length; r++) for (var c = 0; c < nextPiece.shape[r].length; c++) {
                if (nextPiece.shape[r][c]) {
                    ctx.shadowColor = COLORS[nextPiece.color - 1]; ctx.shadowBlur = 4;
                    ctx.fillStyle = COLORS[nextPiece.color - 1];
                    ctx.fillRect(panelX + c * pb, 110 + r * pb, pb - 2, pb - 2);
                    ctx.shadowBlur = 0;
                }
            }
        }

        // Stats
        ctx.fillStyle = '#cc3333'; ctx.font = '600 13px Inter';
        ctx.fillText('SCORE', panelX, 190); ctx.fillStyle = '#ff6666'; ctx.font = '700 20px monospace'; ctx.fillText(String(score), panelX, 214);
        ctx.fillStyle = '#cc3333'; ctx.font = '600 13px Inter';
        ctx.fillText('LV ' + level + '  |  LINES ' + lines, panelX, 244);

        // Combo display
        if (combo > 1 && comboTimer > 0) {
            ctx.fillStyle = '#ffcc00'; ctx.font = '700 16px Inter';
            ctx.fillText('🔥 x' + combo + ' COMBO', panelX, 275);
        }

        // Active power
        if (activePower && powerTimer > 0) {
            ctx.fillStyle = '#44ff44'; ctx.font = '600 12px Inter';
            ctx.fillText('⚡ ' + activePower.toUpperCase() + ' ' + Math.ceil(powerTimer) + 's', panelX, 300);
        }

        // Active curse
        if (curseActive && curseTimer > 0) {
            ctx.fillStyle = '#ff3333'; ctx.font = '600 12px Inter';
            ctx.fillText('☠ ' + curseType.replace('_', ' ').toUpperCase(), panelX, 320);
        }

        // Stats breakdown
        ctx.fillStyle = '#884444'; ctx.font = '400 11px Inter';
        ctx.fillText('Pieces: ' + piecesPlaced, panelX, 370);
        ctx.fillText('Max Combo: x' + maxCombo, panelX, 386);
        ctx.fillText('Tetris: ' + totalClears.tetris, panelX, 402);

        // Horror text
        if (level >= 3) {
            ctx.globalAlpha = 0.1 + Math.sin(Date.now() * 0.002) * 0.05;
            ctx.fillStyle = '#ff0000'; ctx.font = '600 11px Inter';
            var msgs = ['IT HUNGERS', 'FEED IT', 'NO ESCAPE', 'DEEPER', 'MORE BLOOD', 'NEVER STOP', 'YOU BELONG HERE'];
            ctx.fillText(msgs[level % msgs.length], panelX, 450);
            ctx.globalAlpha = 1;
        }

        // Message
        if (msgTimer2 > 0) {
            ctx.font = '700 18px Inter'; ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255,200,50,' + Math.min(1, msgTimer2) + ')';
            ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 10;
            ctx.fillText(msgText, boardPxW / 2, ROWS * BLOCK / 2);
            ctx.shadowBlur = 0; ctx.textAlign = 'left';
        }

        // Vignette
        var vigGrd = ctx.createRadialGradient(boardPxW / 2, h / 2, boardPxW * 0.3, boardPxW / 2, h / 2, boardPxW * 0.8);
        vigGrd.addColorStop(0, 'transparent'); vigGrd.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vigGrd; ctx.fillRect(0, 0, boardPxW, h);

        // Update HUD
        var s1 = document.getElementById('hud-score'); if (s1) s1.textContent = 'Score: ' + score;
        var s2 = document.getElementById('hud-level'); if (s2) s2.textContent = 'Level: ' + level;
        var s3 = document.getElementById('hud-lines'); if (s3) s3.textContent = 'Lines: ' + lines;
    }

    function startGame() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        canvas.width = COLS * BLOCK + 200; canvas.height = ROWS * BLOCK;
        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        HorrorAudio.startDrone(40, 'dark');
        if (window.QualityFX) QualityFX.init2D(canvas, ctx);
        setTimeout(function () {
            ctrl.classList.add('hiding');
            setTimeout(function () {
                ctrl.style.display = 'none'; ctrl.classList.remove('hiding');
                resetState();
                gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                lastTime = performance.now(); gameLoop();
            }, 800);
        }, 2500);
    }

    function resetState() {
        initBoard(); score = 0; level = 1; lines = 0;
        dropTimer = 0; bloodLevel = 0; bgDarken = 0;
        nextPiece = null; holdPiece = null; holdColor = 0; holdUsed = false;
        combo = 0; maxCombo = 0; comboTimer = 0; backToBack = false;
        powerUps = []; activePower = ''; powerTimer = 0;
        curseActive = false; curseTimer = 0; nextCurseTime = 25 + Math.random() * 15;
        totalClears = { single: 0, double: 0, triple: 0, tetris: 0 };
        totalTime = 0; piecesPlaced = 0; particles = [];
        pieceBag = []; fillBag();
        spawnPiece();
    }

    function restartGame() {
        resetState();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        HorrorAudio.startDrone(40, 'dark');
        gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
        lastTime = performance.now(); gameLoop();
    }

    function gameOver() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playDeath(); HorrorAudio.stopDrone();
        var fs = document.getElementById('final-score');
        if (fs) fs.textContent = 'Score: ' + score + ' | Lv ' + level + ' | Lines: ' + lines + ' | Tetris: ' + totalClears.tetris + ' | Max Combo: x' + maxCombo;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var retryBtn = document.querySelector('#game-over-screen .play-btn'); if (retryBtn) retryBtn.onclick = restartGame;
    }

    function gameLoop(time) {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        if (!time) time = performance.now();
        var dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;
        totalTime += dt;

        // Drop
        var speedMult = curseActive && curseType === 'speed_burst' ? 3 : 1;
        var slowMult = activePower === 'slow' ? 0.5 : 1;
        dropTimer += dt * 1000 * speedMult * slowMult;
        var interval = dropInterval / GameUtils.getMultiplier();
        if (dropTimer >= interval) { dropTimer = 0; if (!movePiece(0, 1)) lockPiece(); }

        // Timers
        if (shakeTimer > 0) shakeTimer -= dt;
        if (flashTimer > 0) flashTimer -= dt;
        if (bloodLevel > 0) bloodLevel = Math.max(0, bloodLevel - dt * 0.1);
        if (comboTimer > 0) comboTimer -= dt;
        if (msgTimer2 > 0) msgTimer2 -= dt;
        if (powerTimer > 0) { powerTimer -= dt; if (powerTimer <= 0) activePower = ''; }
        if (curseTimer > 0) { curseTimer -= dt; if (curseTimer <= 0) curseActive = false; }

        // Curse trigger
        nextCurseTime -= dt;
        if (nextCurseTime <= 0 && level >= 3) {
            triggerCurse();
            nextCurseTime = 20 + Math.random() * 15;
        }

        // Power-up fall
        for (var i = powerUps.length - 1; i >= 0; i--) {
            powerUps[i].y += 30 * dt;
            powerUps[i].timer -= dt;
            if (powerUps[i].timer <= 0 || powerUps[i].y > ROWS * BLOCK) powerUps.splice(i, 1);
        }

        // Particles
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }

        draw();
    }
})();
