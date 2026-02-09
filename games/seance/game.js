/* ============================================
   Séance — Spirit Board Puzzle Horror Game
   Canvas 2D
   ============================================ */
(function () {
    'use strict';

    var canvas, ctx;
    var gameActive = false, lastTime = 0;

    // Spirit board layout
    var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    var NUMBERS = '0123456789'.split('');
    var boardW = 700, boardH = 500;
    var letterPositions = [];
    var numberPositions = [];
    var yesPos = { x: 120, y: 100, text: 'YES' };
    var noPos = { x: 580, y: 100, text: 'NO' };
    var goodbyePos = { x: 350, y: 440, text: 'GOODBYE' };

    // Planchette
    var planchette = { x: 350, y: 280, targetX: 350, targetY: 280, radius: 28 };
    var mouseX = 350, mouseY = 280;
    var selectedLetters = '';
    var clickCooldown = 0;

    // Spirits
    var SPIRITS = [
        { name: 'EMILY', clue: 'I drowned in the lake at age seven', anger: 'You disturb my rest!' },
        { name: 'MARCUS', clue: 'The fire took me on a winter night', anger: 'Leave me be, mortal!' },
        { name: 'VERA', clue: 'Poisoned by the one I loved most', anger: 'You know nothing of pain!' },
        { name: 'THOMAS', clue: 'I fell from the bell tower in 1892', anger: 'Do not speak my name wrong!' },
        { name: 'LILLIAN', clue: 'The plague took me but my spirit lingers', anger: 'Foolish mortal!' },
    ];
    var currentSpirit = 0, spiritsFreed = 0, angerLevel = 0, maxAnger = 5;
    var spiritMessage = '', msgTimer = 0, msgFade = 1;
    var boardShake = 0, candleFlicker = 0;
    var ghostAlpha = 0, ghostX = 0, ghostY = 0;
    var planchetteMoving = false, planchetteTimer = 0;
    var revealedClue = false, clueTimer = 0;
    var currentCalmTime = 0;

    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; lastTime = performance.now(); gameLoop(); },
        onRestart: restartGame
    });

    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });

    document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); }
    });

    // Calculate letter positions in arc
    function layoutBoard() {
        letterPositions = [];
        // Two rows of letters in an arc
        for (var i = 0; i < 13; i++) {
            var angle = -0.6 + (i / 12) * 1.2;
            letterPositions.push({ x: boardW / 2 + Math.sin(angle) * 260, y: 180 + Math.cos(angle) * -40, letter: LETTERS[i] });
        }
        for (var i = 0; i < 13; i++) {
            var angle = -0.55 + (i / 12) * 1.1;
            letterPositions.push({ x: boardW / 2 + Math.sin(angle) * 240, y: 240 + Math.cos(angle) * -30, letter: LETTERS[i + 13] });
        }
        numberPositions = [];
        for (var i = 0; i < 10; i++) {
            numberPositions.push({ x: 160 + i * 45, y: 340, letter: NUMBERS[i] });
        }
    }

    function startGame() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        canvas.width = boardW; canvas.height = boardH;
        layoutBoard();

        canvas.addEventListener('mousemove', function (e) {
            var rect = canvas.getBoundingClientRect();
            mouseX = (e.clientX - rect.left) * (boardW / rect.width);
            mouseY = (e.clientY - rect.top) * (boardH / rect.height);
        });
        canvas.addEventListener('click', function () { selectAtPlanchette(); });

        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        HorrorAudio.startDrone(35, 'dark');

        setTimeout(function () {
            ctrl.classList.add('hiding');
            setTimeout(function () {
                ctrl.style.display = 'none'; ctrl.classList.remove('hiding');
                currentSpirit = 0; spiritsFreed = 0; angerLevel = 0;
                selectedLetters = ''; revealedClue = false;
                showSpiritClue();
                gameActive = true;
                GameUtils.setState(GameUtils.STATE.PLAYING);
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                lastTime = performance.now(); gameLoop();
            }, 800);
        }, 2500);
    }

    function restartGame() {
        currentSpirit = 0; spiritsFreed = 0; angerLevel = 0;
        selectedLetters = ''; revealedClue = false;
        showSpiritClue();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        HorrorAudio.startDrone(35, 'dark');
        gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
        lastTime = performance.now(); gameLoop();
    }

    function showSpiritClue() {
        if (currentSpirit < SPIRITS.length) {
            spiritMessage = '"' + SPIRITS[currentSpirit].clue + '"';
            msgTimer = 4; msgFade = 1;
            revealedClue = true; clueTimer = 4;
        }
    }

    function selectAtPlanchette() {
        if (clickCooldown > 0 || !gameActive) return;
        clickCooldown = 0.3;

        // Check letters
        var allPositions = letterPositions.concat(numberPositions);
        for (var i = 0; i < allPositions.length; i++) {
            var lp = allPositions[i];
            var dx = planchette.x - lp.x, dy = planchette.y - lp.y;
            if (Math.sqrt(dx * dx + dy * dy) < 30) {
                selectedLetters += lp.letter;
                HorrorAudio.playClick();
                // The planchette briefly glows
                candleFlicker = 0.5;

                // Check answer
                checkAnswer();
                updateHUD();
                return;
            }
        }

        // Check GOODBYE
        if (Math.abs(planchette.x - goodbyePos.x) < 60 && Math.abs(planchette.y - goodbyePos.y) < 20) {
            // Clear selection
            selectedLetters = '';
            HorrorAudio.playHover();
            updateHUD();
        }
    }

    function checkAnswer() {
        if (currentSpirit >= SPIRITS.length) return;
        var target = SPIRITS[currentSpirit].name;

        if (target.indexOf(selectedLetters) === 0) {
            // On track
            if (selectedLetters === target) {
                // Correct! Spirit freed
                spiritsFreed++;
                if (window.ChallengeManager) ChallengeManager.notify('seance', 'spirits_freed', 1);
                spiritMessage = '💀 ' + target + ' has been freed...';
                msgTimer = 3; msgFade = 1;
                boardShake = 0.5;
                HorrorAudio.playWin();
                ghostAlpha = 1; ghostX = boardW / 2; ghostY = boardH / 2;
                selectedLetters = '';
                currentSpirit++;
                if (currentSpirit >= SPIRITS.length) {
                    setTimeout(function () { gameWin(); }, 2000);
                } else {
                    setTimeout(function () { showSpiritClue(); }, 3000);
                }
            }
        } else {
            // Wrong! Spirit angered
            angerLevel++;
            selectedLetters = '';
            spiritMessage = SPIRITS[currentSpirit].anger;
            msgTimer = 2.5; msgFade = 1;
            boardShake = 0.8;
            HorrorAudio.playJumpScare();
            if (angerLevel >= maxAnger) {
                setTimeout(function () { gameOver(); }, 1500);
            }
        }
        updateHUD();
    }

    function updateHUD() {
        var s1 = document.getElementById('hud-spirits');
        if (s1) s1.textContent = 'Spirits Freed: ' + spiritsFreed + '/' + SPIRITS.length;
        var s2 = document.getElementById('hud-anger');
        if (s2) {
            var filled = ''; for (var i = 0; i < maxAnger; i++) filled += i < angerLevel ? '●' : '○';
            s2.textContent = 'Anger: ' + filled;
            s2.style.color = angerLevel >= 3 ? '#ff3333' : '';
        }
    }

    function gameOver() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playDeath(); HorrorAudio.stopDrone();
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-over-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function gameWin() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.WIN);
        HorrorAudio.playWin(); HorrorAudio.stopDrone();
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-win-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function draw(dt) {
        var w = boardW, h = boardH;

        // Board background — aged wood
        var bgGrd = ctx.createLinearGradient(0, 0, 0, h);
        bgGrd.addColorStop(0, '#2a1a0a'); bgGrd.addColorStop(0.5, '#3a2510'); bgGrd.addColorStop(1, '#1a0e05');
        ctx.fillStyle = bgGrd; ctx.fillRect(0, 0, w, h);

        // Wood grain
        ctx.strokeStyle = 'rgba(60,40,15,0.3)'; ctx.lineWidth = 0.5;
        for (var i = 0; i < 30; i++) {
            var gy = i * (h / 30) + Math.sin(i * 0.5) * 3;
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy + Math.sin(i) * 5); ctx.stroke();
        }

        // Shake
        ctx.save();
        if (boardShake > 0) ctx.translate((Math.random() - 0.5) * boardShake * 8, (Math.random() - 0.5) * boardShake * 8);

        // Decorative border
        ctx.strokeStyle = '#886633'; ctx.lineWidth = 3;
        ctx.strokeRect(15, 15, w - 30, h - 30);
        ctx.strokeStyle = '#664422'; ctx.lineWidth = 1;
        ctx.strokeRect(20, 20, w - 40, h - 40);

        // YES / NO
        ctx.font = '700 24px serif'; ctx.textAlign = 'center';
        ctx.fillStyle = '#ccaa66'; ctx.fillText('YES', yesPos.x, yesPos.y);
        ctx.fillText('NO', noPos.x, noPos.y);

        // Letters
        ctx.font = '600 20px serif';
        for (var i = 0; i < letterPositions.length; i++) {
            var lp = letterPositions[i];
            var isSelected = selectedLetters.indexOf(lp.letter) !== -1;
            var dx = planchette.x - lp.x, dy = planchette.y - lp.y;
            var near = Math.sqrt(dx * dx + dy * dy) < 30;
            ctx.fillStyle = near ? '#ffdd88' : (isSelected ? '#ff8844' : '#aa8844');
            if (near) { ctx.shadowColor = '#ffdd88'; ctx.shadowBlur = 8; }
            ctx.fillText(lp.letter, lp.x, lp.y);
            ctx.shadowBlur = 0;
        }

        // Numbers
        ctx.font = '600 18px serif';
        for (var i = 0; i < numberPositions.length; i++) {
            var np = numberPositions[i];
            ctx.fillStyle = '#887744';
            ctx.fillText(np.letter, np.x, np.y);
        }

        // GOODBYE
        ctx.font = '700 20px serif';
        ctx.fillStyle = '#887744'; ctx.fillText('GOODBYE', goodbyePos.x, goodbyePos.y);

        // Sun and moon decorations
        ctx.fillStyle = 'rgba(200,160,60,0.3)';
        ctx.beginPath(); ctx.arc(100, 60, 20, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(600, 60, 18, Math.PI * 0.3, Math.PI * 1.7); ctx.fill();

        // Selected letters display
        if (selectedLetters.length > 0) {
            ctx.font = '700 28px serif'; ctx.fillStyle = '#ffcc44';
            ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 12;
            ctx.fillText(selectedLetters, w / 2, 400);
            ctx.shadowBlur = 0;
        }

        // Planchette (teardrop shape)
        ctx.save();
        ctx.translate(planchette.x, planchette.y);
        var glow = candleFlicker > 0 ? 0.6 : 0.15;
        ctx.shadowColor = '#ffaa44'; ctx.shadowBlur = 10 + glow * 20;
        ctx.fillStyle = 'rgba(80,50,20,0.9)';
        ctx.beginPath();
        ctx.moveTo(0, -planchette.radius);
        ctx.bezierCurveTo(planchette.radius, -planchette.radius * 0.5, planchette.radius, planchette.radius * 0.5, 0, planchette.radius);
        ctx.bezierCurveTo(-planchette.radius, planchette.radius * 0.5, -planchette.radius, -planchette.radius * 0.5, 0, -planchette.radius);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Lens hole
        ctx.fillStyle = 'rgba(255,220,150,0.2)';
        ctx.beginPath(); ctx.arc(0, -5, 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Spirit message
        if (msgTimer > 0) {
            ctx.globalAlpha = Math.min(1, msgFade);
            ctx.font = 'italic 600 16px serif'; ctx.fillStyle = '#cc8833';
            ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 8;
            ctx.fillText(spiritMessage, w / 2, 130);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        // Ghost apparition
        if (ghostAlpha > 0) {
            ctx.globalAlpha = ghostAlpha * 0.4;
            ctx.fillStyle = '#aabbff';
            ctx.beginPath(); ctx.arc(ghostX, ghostY - 20, 30, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(ghostX - 20, ghostY + 10, 40, 40);
            ctx.globalAlpha = 1;
        }

        // Candles at corners
        var candleGlowBase = 0.4 + Math.sin(Date.now() * 0.005) * 0.1;
        var cPositions = [[40, h - 40], [w - 40, h - 40], [40, 50], [w - 40, 50]];
        for (var i = 0; i < cPositions.length; i++) {
            var cp = cPositions[i];
            // Flame
            ctx.fillStyle = 'rgba(255,180,50,' + candleGlowBase + ')';
            ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.arc(cp[0], cp[1] - 8, 5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Candle body
            ctx.fillStyle = '#ddd'; ctx.fillRect(cp[0] - 3, cp[1] - 3, 6, 14);
        }

        ctx.restore();

        // Vignette
        var vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.6);
        vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
    }

    function gameLoop(time) {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        if (!time) time = performance.now();
        var dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;

        if (angerLevel < 2) {
            currentCalmTime += dt;
            if (window.ChallengeManager) ChallengeManager.notify('seance', 'calm_time', currentCalmTime);
        } else {
            currentCalmTime = 0;
        }

        // Planchette follows mouse smoothly
        planchette.x += (mouseX - planchette.x) * 6 * dt;
        planchette.y += (mouseY - planchette.y) * 6 * dt;

        // Clamp to board
        planchette.x = Math.max(30, Math.min(boardW - 30, planchette.x));
        planchette.y = Math.max(30, Math.min(boardH - 30, planchette.y));

        // Timers
        if (msgTimer > 0) { msgTimer -= dt; msgFade = Math.min(1, msgTimer); }
        if (boardShake > 0) boardShake -= dt * 2;
        if (candleFlicker > 0) candleFlicker -= dt * 2;
        if (clickCooldown > 0) clickCooldown -= dt;
        if (ghostAlpha > 0) { ghostAlpha -= dt * 0.5; ghostY -= dt * 30; }

        draw(dt);
    }
})();
