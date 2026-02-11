/* ============================================
   Séance — Spirit Board Puzzle Horror Game
   OVERHAULED: 15 spirits, candle mechanic, poltergeist
   events, ritual stages, multiple endings, atmosphere
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

    // ── 15 Spirits (grouped by difficulty stage) ──────
    var SPIRITS = [
        // Stage 1: Gentle spirits
        { name: 'EMILY', clue: 'I drowned in the lake at age seven', anger: 'You disturb my rest!', stage: 1, reward: 'candle' },
        { name: 'THOMAS', clue: 'I fell from the bell tower in 1892', anger: 'Do not speak my name wrong!', stage: 1, reward: 'shield' },
        { name: 'ROSE', clue: 'The garden was my sanctuary until the frost took me', anger: 'Leave the garden in peace!', stage: 1, reward: 'candle' },
        // Stage 2: Restless spirits
        { name: 'MARCUS', clue: 'The fire took me on a winter night', anger: 'Leave me be, mortal!', stage: 2, reward: 'candle' },
        { name: 'VERA', clue: 'Poisoned by the one I loved most', anger: 'You know nothing of pain!', stage: 2, reward: 'shield' },
        { name: 'LILLIAN', clue: 'The plague took me but my spirit lingers', anger: 'Foolish mortal!', stage: 2, reward: 'candle' },
        { name: 'EDGAR', clue: 'I was buried alive in the cellar walls', anger: 'Let me OUT!', stage: 2, reward: 'shield' },
        // Stage 3: Malevolent spirits
        { name: 'HELENA', clue: 'I waited at the altar but death came instead', anger: 'You mock my grief!', stage: 3, reward: 'candle' },
        { name: 'SOLOMON', clue: 'The coven cursed me for my betrayal in 1743', anger: 'You dare invoke me?!', stage: 3, reward: 'shield' },
        { name: 'AGATHA', clue: 'I hear the children singing my lullaby still', anger: 'Silence the children!', stage: 3, reward: 'candle' },
        { name: 'WARD', clue: 'I was the last patient in the asylum', anger: 'They cannot keep me here!', stage: 3, reward: 'shield' },
        { name: 'IVY', clue: 'I danced in moonlight before the wolf found me', anger: 'The moon reveals all lies!', stage: 3, reward: 'candle' },
        // Stage 4: Ancient spirits
        { name: 'AZRAEL', clue: 'I am the keeper of the threshold between worlds', anger: 'YOU CANNOT CONTAIN ME!', stage: 4, reward: 'seal' },
        { name: 'NOCTIS', clue: 'Before your kind I walked these lands in shadow', anger: 'RETURN ME AND PERISH!', stage: 4, reward: 'seal' },
        { name: 'MORRIGAN', clue: 'War and death are my eternal companions', anger: 'ALL SHALL KNEEL!', stage: 4, reward: 'victory' },
    ];

    // ── Game State ─────────────────────────────────────
    var currentSpirit = 0, spiritsFreed = 0;
    var angerLevel = 0, maxAnger = 5;
    var spiritMessage = '', msgTimer = 0, msgFade = 1;
    var boardShake = 0, candleFlicker = 0;
    var ghostAlpha = 0, ghostX = 0, ghostY = 0;
    var currentCalmTime = 0;
    var totalTime = 0;

    // ── Candle System ──────────────────────────────────
    var candles = [
        { x: 40, y: 460, lit: true, fuel: 100 },
        { x: 660, y: 460, lit: true, fuel: 100 },
        { x: 40, y: 50, lit: true, fuel: 100 },
        { x: 660, y: 50, lit: true, fuel: 100 }
    ];
    var extraCandles = 0; // bonus candles earned
    var shieldActive = false, shieldTimer = 0;

    // ── Poltergeist Events ─────────────────────────────
    var poltergeistActive = false, poltergeistTimer = 0, nextPoltergeist = 15;
    var poltergeistType = ''; // 'shake','flicker','planchette_move','whisper','darkness'
    var planchetteHaunted = false, hauntTimer = 0;
    var whisperText = '', whisperAlpha = 0;
    var darknessAlpha = 0;

    // ── Ritual Progress ───────────────────────────────
    var ritualStage = 1; // 1-4
    var sealsCollected = 0;
    var ending = ''; // 'peace','power','consumed'

    // ── Particles ──────────────────────────────────────
    var particles = [];
    var smokeParticles = [];

    // ── Hint System ───────────────────────────────────
    var hintTimer = 0;
    var showHint = false;
    var hintLetter = '';

    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; lastTime = performance.now(); gameLoop(); },
        onRestart: restartGame
    });

    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); }
        if (e.code === 'KeyH' && gameActive) activateHint();
        if (e.code === 'Backspace' && gameActive && selectedLetters.length > 0) {
            selectedLetters = selectedLetters.slice(0, -1);
            updateHUD();
        }
    });

    function layoutBoard() {
        letterPositions = [];
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
        // Touch support
        canvas.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var rect = canvas.getBoundingClientRect();
            var t = e.touches[0];
            mouseX = (t.clientX - rect.left) * (boardW / rect.width);
            mouseY = (t.clientY - rect.top) * (boardH / rect.height);
        }, { passive: false });
        canvas.addEventListener('click', function () { selectAtPlanchette(); });
        canvas.addEventListener('touchend', function (e) { e.preventDefault(); selectAtPlanchette(); }, { passive: false });

        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        HorrorAudio.startDrone(35, 'dark');

        if (window.QualityFX) QualityFX.init2D(canvas, ctx);

        setTimeout(function () {
            ctrl.classList.add('hiding');
            setTimeout(function () {
                ctrl.style.display = 'none'; ctrl.classList.remove('hiding');
                resetGameState();
                showSpiritClue();
                gameActive = true;
                GameUtils.setState(GameUtils.STATE.PLAYING);
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                lastTime = performance.now(); gameLoop();
            }, 800);
        }, 2500);
    }

    function resetGameState() {
        currentSpirit = 0; spiritsFreed = 0; angerLevel = 0; maxAnger = 5;
        selectedLetters = ''; totalTime = 0; currentCalmTime = 0;
        ritualStage = 1; sealsCollected = 0; ending = '';
        poltergeistActive = false; nextPoltergeist = 12 + Math.random() * 8;
        shieldActive = false; shieldTimer = 0; extraCandles = 0;
        particles = []; smokeParticles = [];
        for (var i = 0; i < candles.length; i++) { candles[i].lit = true; candles[i].fuel = 100; }
        updateHUD();
    }

    function restartGame() {
        resetGameState();
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
            var sp = SPIRITS[currentSpirit];
            ritualStage = sp.stage;
            spiritMessage = '"' + sp.clue + '"';
            msgTimer = 5; msgFade = 1;
            hintTimer = 0; showHint = false;
            if (sp.stage >= 3) {
                boardShake = 0.3;
                nextPoltergeist = 8 + Math.random() * 5;
            }
        }
    }

    function activateHint() {
        if (currentSpirit >= SPIRITS.length) return;
        var target = SPIRITS[currentSpirit].name;
        var nextIdx = selectedLetters.length;
        if (nextIdx < target.length) {
            hintLetter = target[nextIdx];
            showHint = true;
            hintTimer = 3;
            // Costs a candle point
            for (var i = 0; i < candles.length; i++) {
                if (candles[i].lit) { candles[i].fuel -= 8; break; }
            }
        }
    }

    function selectAtPlanchette() {
        if (clickCooldown > 0 || !gameActive || planchetteHaunted) return;
        clickCooldown = 0.25;

        var allPositions = letterPositions.concat(numberPositions);
        for (var i = 0; i < allPositions.length; i++) {
            var lp = allPositions[i];
            var dx = planchette.x - lp.x, dy = planchette.y - lp.y;
            if (Math.sqrt(dx * dx + dy * dy) < 30) {
                selectedLetters += lp.letter;
                HorrorAudio.playClick();
                candleFlicker = 0.5;
                spawnParticles(planchette.x, planchette.y, '#ffcc44', 4);
                checkAnswer();
                updateHUD();
                return;
            }
        }

        // GOODBYE - clear selection
        if (Math.abs(planchette.x - goodbyePos.x) < 60 && Math.abs(planchette.y - goodbyePos.y) < 20) {
            selectedLetters = '';
            HorrorAudio.playHover();
            updateHUD();
        }
    }

    function checkAnswer() {
        if (currentSpirit >= SPIRITS.length) return;
        var target = SPIRITS[currentSpirit].name;

        if (target.indexOf(selectedLetters) === 0) {
            if (selectedLetters === target) {
                // Correct! Spirit freed
                spiritsFreed++;
                var sp = SPIRITS[currentSpirit];
                if (window.ChallengeManager) ChallengeManager.notify('seance', 'spirits_freed', 1);
                spiritMessage = '💀 ' + target + ' has been freed...';
                msgTimer = 3; msgFade = 1;
                boardShake = 0.6;
                HorrorAudio.playWin();
                ghostAlpha = 1; ghostX = boardW / 2; ghostY = boardH / 2;
                selectedLetters = '';

                // Apply reward
                if (sp.reward === 'candle') {
                    for (var i = 0; i < candles.length; i++) { candles[i].fuel = Math.min(100, candles[i].fuel + 25); if (!candles[i].lit && candles[i].fuel > 20) candles[i].lit = true; }
                    showMessage('🕯 Candles restored');
                } else if (sp.reward === 'shield') {
                    shieldActive = true; shieldTimer = 15;
                    showMessage('🛡 Spirit shield activated');
                } else if (sp.reward === 'seal') {
                    sealsCollected++;
                    showMessage('🔮 Ancient seal obtained (' + sealsCollected + '/2)');
                    boardShake = 1.0;
                    spawnParticles(boardW / 2, boardH / 2, '#ff00ff', 20);
                }

                currentSpirit++;
                if (currentSpirit >= SPIRITS.length) {
                    ending = sealsCollected >= 2 ? 'power' : 'peace';
                    setTimeout(function () { gameWin(); }, 2500);
                } else {
                    setTimeout(function () { showSpiritClue(); }, 3000);
                }
            }
        } else {
            // Wrong!
            angerLevel++;
            selectedLetters = '';
            spiritMessage = SPIRITS[currentSpirit].anger;
            msgTimer = 2.5; msgFade = 1;
            boardShake = 0.8;
            HorrorAudio.playJumpScare();
            spawnParticles(boardW / 2, boardH / 2, '#ff3333', 10);

            // Spirit anger effect: blow out a candle
            if (!shieldActive) {
                for (var i = candles.length - 1; i >= 0; i--) {
                    if (candles[i].lit) { candles[i].lit = false; candles[i].fuel -= 20; showMessage('🕯 A candle was extinguished!'); break; }
                }
            } else {
                showMessage('🛡 Shield absorbed the anger!');
                shieldActive = false; shieldTimer = 0;
            }

            // Check all candles out = death
            var litCount = 0;
            for (var i = 0; i < candles.length; i++) if (candles[i].lit) litCount++;
            if (litCount === 0) { setTimeout(function () { ending = 'consumed'; gameOver(); }, 1500); return; }

            if (angerLevel >= maxAnger) {
                setTimeout(function () { ending = 'consumed'; gameOver(); }, 1500);
            }
        }
        updateHUD();
    }

    function showMessage(text) { spiritMessage = text; msgTimer = 3; msgFade = 1; }

    // ── Poltergeist Events ────────────────────────────
    function triggerPoltergeist() {
        var types = ['shake', 'flicker', 'planchette_move', 'whisper', 'darkness'];
        poltergeistType = types[Math.floor(Math.random() * types.length)];
        poltergeistActive = true;
        poltergeistTimer = 2 + Math.random() * 2;

        if (poltergeistType === 'shake') { boardShake = 1.2; showMessage('👻 The board trembles violently...'); }
        if (poltergeistType === 'flicker') { showMessage('🕯 The candles flicker wildly!'); }
        if (poltergeistType === 'planchette_move') { planchetteHaunted = true; hauntTimer = 3; showMessage('⚡ Something is moving the planchette!'); }
        if (poltergeistType === 'whisper') { whisperText = SPIRITS[Math.floor(Math.random() * Math.min(currentSpirit + 1, SPIRITS.length))].clue.split(' ').slice(0, 3).join(' ') + '...'; whisperAlpha = 1; showMessage('👂 Whispers from beyond...'); }
        if (poltergeistType === 'darkness') { darknessAlpha = 0.7; showMessage('🌑 Darkness encroaches!'); }
    }

    // ── Particles ─────────────────────────────────────
    function spawnParticles(x, y, color, count) {
        for (var i = 0; i < count; i++) {
            particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80 - 20, life: 0.8 + Math.random() * 0.5, maxLife: 1.3, color: color, size: 2 + Math.random() * 3 });
        }
    }
    function spawnSmoke(x, y) {
        smokeParticles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 10, vy: -15 - Math.random() * 10, life: 1.5 + Math.random(), maxLife: 2.5, size: 3 + Math.random() * 5, alpha: 0.3 });
    }

    function updateHUD() {
        var s1 = document.getElementById('hud-spirits');
        if (s1) s1.textContent = '👻 ' + spiritsFreed + '/' + SPIRITS.length + ' | Stage ' + ritualStage;
        var s2 = document.getElementById('hud-anger');
        if (s2) {
            var filled = ''; for (var i = 0; i < maxAnger; i++) filled += i < angerLevel ? '🔴' : '⚫';
            s2.textContent = filled;
            s2.style.color = angerLevel >= 3 ? '#ff3333' : '';
        }
    }

    function gameOver() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playDeath(); HorrorAudio.stopDrone();
        var msgEl = document.querySelector('#game-over-screen p');
        if (msgEl) msgEl.textContent = ending === 'consumed' ? 'The darkness consumed you... all candles are extinguished.' : 'The spirits have overwhelmed you...';
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-over-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function gameWin() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.WIN);
        HorrorAudio.playWin(); HorrorAudio.stopDrone();
        var msgEl = document.querySelector('#game-win-screen p');
        if (msgEl) {
            if (ending === 'power') msgEl.textContent = '🔮 You command the spirit realm! All ' + SPIRITS.length + ' spirits freed. The ancient seals grant you dominion over the dead.';
            else msgEl.textContent = '✨ All ' + SPIRITS.length + ' spirits have found peace. The board falls silent. Time: ' + Math.round(totalTime) + 's';
        }
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-win-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function draw(dt) {
        var w = boardW, h = boardH;

        // Board background
        var bgGrd = ctx.createLinearGradient(0, 0, 0, h);
        bgGrd.addColorStop(0, '#2a1a0a'); bgGrd.addColorStop(0.5, '#3a2510'); bgGrd.addColorStop(1, '#1a0e05');
        ctx.fillStyle = bgGrd; ctx.fillRect(0, 0, w, h);

        // Wood grain
        ctx.strokeStyle = 'rgba(60,40,15,0.3)'; ctx.lineWidth = 0.5;
        for (var i = 0; i < 30; i++) {
            var gy = i * (h / 30) + Math.sin(i * 0.5) * 3;
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy + Math.sin(i) * 5); ctx.stroke();
        }

        ctx.save();
        if (boardShake > 0) ctx.translate((Math.random() - 0.5) * boardShake * 10, (Math.random() - 0.5) * boardShake * 10);

        // Ritual stage indicator (glowing border)
        var stageColors = ['#886633', '#cc8833', '#ff4444', '#ff00ff'];
        ctx.strokeStyle = stageColors[ritualStage - 1] || '#886633';
        ctx.lineWidth = 3; ctx.strokeRect(15, 15, w - 30, h - 30);
        ctx.strokeStyle = 'rgba(100,70,30,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(20, 20, w - 40, h - 40);

        // Stage symbols in corners (ritual circles)
        if (ritualStage >= 3) {
            ctx.save(); ctx.globalAlpha = 0.15 + Math.sin(Date.now() * 0.002) * 0.08;
            ctx.strokeStyle = '#ff3333'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(w / 2, h / 2, 160, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(w / 2, h / 2, 155, 0, Math.PI * 2); ctx.stroke();
            for (var i = 0; i < 5; i++) {
                var a = (i / 5) * Math.PI * 2 + Date.now() * 0.0005;
                ctx.beginPath(); ctx.arc(w / 2 + Math.cos(a) * 157, h / 2 + Math.sin(a) * 157, 8, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();
        }

        // YES / NO
        ctx.font = '700 24px serif'; ctx.textAlign = 'center';
        ctx.fillStyle = '#ccaa66'; ctx.fillText('YES', yesPos.x, yesPos.y);
        ctx.fillText('NO', noPos.x, noPos.y);

        // Letters
        ctx.font = '600 20px serif';
        for (var i = 0; i < letterPositions.length; i++) {
            var lp = letterPositions[i];
            var dx = planchette.x - lp.x, dy = planchette.y - lp.y;
            var near = Math.sqrt(dx * dx + dy * dy) < 30;
            var isHint = showHint && lp.letter === hintLetter;
            ctx.fillStyle = isHint ? '#44ff44' : near ? '#ffdd88' : '#aa8844';
            if (near || isHint) { ctx.shadowColor = isHint ? '#44ff44' : '#ffdd88'; ctx.shadowBlur = 10; }
            ctx.fillText(lp.letter, lp.x, lp.y);
            ctx.shadowBlur = 0;
        }

        // Numbers
        ctx.font = '600 18px serif';
        for (var i = 0; i < numberPositions.length; i++) {
            ctx.fillStyle = '#887744'; ctx.fillText(numberPositions[i].letter, numberPositions[i].x, numberPositions[i].y);
        }

        ctx.font = '700 20px serif';
        ctx.fillStyle = '#887744'; ctx.fillText('GOODBYE', goodbyePos.x, goodbyePos.y);

        // Sun and moon
        ctx.fillStyle = 'rgba(200,160,60,0.3)';
        ctx.beginPath(); ctx.arc(100, 60, 20, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(600, 60, 18, Math.PI * 0.3, Math.PI * 1.7); ctx.fill();

        // Selected letters
        if (selectedLetters.length > 0) {
            ctx.font = '700 28px serif'; ctx.fillStyle = '#ffcc44';
            ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 12;
            ctx.fillText(selectedLetters, w / 2, 400);
            ctx.shadowBlur = 0;
            // Backspace hint
            ctx.font = '11px Inter'; ctx.fillStyle = 'rgba(200,200,200,0.3)';
            ctx.fillText('(Backspace to undo)', w / 2, 418);
        }

        // Spirit name hint (stage display)
        if (currentSpirit < SPIRITS.length) {
            ctx.font = '11px Inter'; ctx.fillStyle = 'rgba(180,140,80,0.4)';
            ctx.fillText('Spirit ' + (currentSpirit + 1) + '/' + SPIRITS.length + ' — Stage ' + ritualStage, w / 2, 470);
        }

        // Planchette
        ctx.save();
        ctx.translate(planchette.x, planchette.y);
        var glow = candleFlicker > 0 ? 0.6 : 0.15;
        if (planchetteHaunted) { ctx.rotate(Math.sin(Date.now() * 0.01) * 0.1); glow = 0.8; }
        ctx.shadowColor = planchetteHaunted ? '#ff0000' : '#ffaa44'; ctx.shadowBlur = 10 + glow * 20;
        ctx.fillStyle = planchetteHaunted ? 'rgba(100,20,20,0.9)' : 'rgba(80,50,20,0.9)';
        ctx.beginPath();
        ctx.moveTo(0, -planchette.radius);
        ctx.bezierCurveTo(planchette.radius, -planchette.radius * 0.5, planchette.radius, planchette.radius * 0.5, 0, planchette.radius);
        ctx.bezierCurveTo(-planchette.radius, planchette.radius * 0.5, -planchette.radius, -planchette.radius * 0.5, 0, -planchette.radius);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = shieldActive ? 'rgba(100,200,255,0.3)' : 'rgba(255,220,150,0.2)';
        ctx.beginPath(); ctx.arc(0, -5, 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Spirit message
        if (msgTimer > 0) {
            ctx.globalAlpha = Math.min(1, msgFade);
            ctx.font = 'italic 600 16px serif'; ctx.fillStyle = ritualStage >= 3 ? '#ff4444' : '#cc8833';
            ctx.shadowColor = ritualStage >= 3 ? '#ff0000' : '#ff6600'; ctx.shadowBlur = 8;
            ctx.fillText(spiritMessage, w / 2, 130);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }

        // Ghost apparition
        if (ghostAlpha > 0) {
            ctx.globalAlpha = ghostAlpha * 0.4;
            ctx.fillStyle = '#aabbff';
            ctx.beginPath(); ctx.arc(ghostX, ghostY - 20, 30, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(ghostX - 20, ghostY + 10, 40, 40);
            ctx.globalAlpha = 1;
        }

        // Whisper text
        if (whisperAlpha > 0) {
            ctx.globalAlpha = whisperAlpha * 0.5;
            ctx.font = 'italic 12px serif'; ctx.fillStyle = '#8888cc';
            ctx.fillText(whisperText, 100 + Math.sin(Date.now() * 0.002) * 20, 380);
            ctx.globalAlpha = 1;
        }

        // Candles
        for (var i = 0; i < candles.length; i++) {
            var c = candles[i];
            if (c.lit) {
                var flick = 0.4 + Math.sin(Date.now() * 0.005 + i * 2) * 0.1;
                if (poltergeistActive && poltergeistType === 'flicker') flick *= 0.3 + Math.random() * 0.7;
                ctx.fillStyle = 'rgba(255,180,50,' + flick + ')';
                ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 15 + flick * 10;
                ctx.beginPath(); ctx.arc(c.x, c.y - 8, 5 + Math.sin(Date.now() * 0.008 + i) * 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
                if (window.QualityFX) QualityFX.addLight2D(c.x, c.y - 8, 100, 'rgba(255,140,40,0.2)', 0.5 + flick * 0.5);
            }
            // Candle body
            var bodyH = Math.max(3, 14 * (c.fuel / 100));
            ctx.fillStyle = c.lit ? '#ddd' : '#777';
            ctx.fillRect(c.x - 3, c.y - 3, 6, bodyH);
        }

        // Particles
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
        }
        // Smoke
        for (var i = 0; i < smokeParticles.length; i++) {
            var sp = smokeParticles[i];
            ctx.globalAlpha = sp.alpha * Math.max(0, sp.life / sp.maxLife);
            ctx.fillStyle = '#aaa';
            ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Shield visual
        if (shieldActive) {
            ctx.strokeStyle = 'rgba(100,200,255,' + (0.2 + Math.sin(Date.now() * 0.005) * 0.1) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(planchette.x, planchette.y, 40, 0, Math.PI * 2); ctx.stroke();
        }

        if (window.QualityFX) QualityFX.addLight2D(planchette.x, planchette.y, 80, 'rgba(200,255,255,0.1)', 0.4);

        ctx.restore();

        // Darkness overlay (poltergeist)
        if (darknessAlpha > 0) {
            ctx.fillStyle = 'rgba(0,0,0,' + darknessAlpha + ')';
            ctx.fillRect(0, 0, w, h);
        }

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
        totalTime += dt;

        if (angerLevel < 2) {
            currentCalmTime += dt;
            if (window.ChallengeManager) ChallengeManager.notify('seance', 'calm_time', currentCalmTime);
        } else { currentCalmTime = 0; }

        // Planchette movement
        if (planchetteHaunted) {
            planchette.x += (Math.sin(Date.now() * 0.003) * 100 + boardW / 2 - planchette.x) * 3 * dt;
            planchette.y += (Math.cos(Date.now() * 0.004) * 60 + boardH / 2 - planchette.y) * 3 * dt;
            hauntTimer -= dt;
            if (hauntTimer <= 0) planchetteHaunted = false;
        } else {
            planchette.x += (mouseX - planchette.x) * 6 * dt;
            planchette.y += (mouseY - planchette.y) * 6 * dt;
        }
        planchette.x = Math.max(30, Math.min(boardW - 30, planchette.x));
        planchette.y = Math.max(30, Math.min(boardH - 30, planchette.y));

        // Timers
        if (msgTimer > 0) { msgTimer -= dt; msgFade = Math.min(1, msgTimer); }
        if (boardShake > 0) boardShake -= dt * 2;
        if (candleFlicker > 0) candleFlicker -= dt * 2;
        if (clickCooldown > 0) clickCooldown -= dt;
        if (ghostAlpha > 0) { ghostAlpha -= dt * 0.5; ghostY -= dt * 30; }
        if (whisperAlpha > 0) whisperAlpha -= dt * 0.3;
        if (darknessAlpha > 0) darknessAlpha -= dt * 0.3;
        if (shieldTimer > 0) { shieldTimer -= dt; if (shieldTimer <= 0) shieldActive = false; }
        if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) showHint = false; }

        // Candle fuel drain
        var mult = GameUtils.getMultiplier();
        for (var i = 0; i < candles.length; i++) {
            if (candles[i].lit) {
                candles[i].fuel -= 0.02 * mult * dt * 60;
                if (candles[i].fuel <= 0) { candles[i].lit = false; candles[i].fuel = 0; showMessage('🕯 A candle burned out!'); }
                // Smoke particles
                if (Math.random() < 0.05) spawnSmoke(candles[i].x, candles[i].y - 12);
            }
        }

        // Check all candles out
        var litCount = 0;
        for (var i = 0; i < candles.length; i++) if (candles[i].lit) litCount++;
        if (litCount === 0 && gameActive) { ending = 'consumed'; gameOver(); return; }

        // Poltergeist events
        nextPoltergeist -= dt;
        if (nextPoltergeist <= 0 && ritualStage >= 2) {
            triggerPoltergeist();
            nextPoltergeist = (ritualStage >= 4 ? 5 : ritualStage >= 3 ? 8 : 12) + Math.random() * 8;
        }
        if (poltergeistActive) {
            poltergeistTimer -= dt;
            if (poltergeistTimer <= 0) poltergeistActive = false;
        }

        // Particles
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }
        for (var i = smokeParticles.length - 1; i >= 0; i--) {
            var sp = smokeParticles[i]; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.life -= dt; sp.size += dt * 2;
            if (sp.life <= 0) smokeParticles.splice(i, 1);
        }

        draw(dt);
    }
})();
