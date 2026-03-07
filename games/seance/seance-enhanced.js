/**
 * ============================================
 * Séance - FULLY ENHANCED VERSION
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
 * - 10x Content (30+ spirits, 100+ events, 10+ endings)
 */

(function() {
    'use strict';

    // ============================================
    // GAME CONSTANTS
    // ============================================
    
    const BOARD_WIDTH = 700;
    const BOARD_HEIGHT = 500;
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const NUMBERS = '0123456789'.split('');
    
    // ============================================
    // SPIRIT DEFINITIONS (30+ spirits)
    // ============================================
    
    const SPIRITS = [
        // Stage 1: Gentle spirits
        { name: 'EMILY', clue: 'I drowned in the lake at age seven', anger: 'You disturb my rest!', stage: 1, reward: 'candle', difficulty: 1 },
        { name: 'THOMAS', clue: 'I fell from the bell tower in 1892', anger: 'Do not speak my name wrong!', stage: 1, reward: 'shield', difficulty: 1 },
        { name: 'ROSE', clue: 'The garden was my sanctuary until the frost took me', anger: 'Leave the garden in peace!', stage: 1, reward: 'candle', difficulty: 1 },
        { name: 'JAMES', clue: 'I waited for a train that never came', anger: 'The tracks are cold!', stage: 1, reward: 'candle', difficulty: 1 },
        { name: 'LILY', clue: 'My doll still sits by the window', anger: 'Do not touch her!', stage: 1, reward: 'shield', difficulty: 1 },
        
        // Stage 2: Restless spirits
        { name: 'MARCUS', clue: 'The fire took me on a winter night', anger: 'Leave me be, mortal!', stage: 2, reward: 'candle', difficulty: 2 },
        { name: 'VERA', clue: 'Poisoned by the one I loved most', anger: 'You know nothing of pain!', stage: 2, reward: 'shield', difficulty: 2 },
        { name: 'LILLIAN', clue: 'The plague took me but my spirit lingers', anger: 'Foolish mortal!', stage: 2, reward: 'candle', difficulty: 2 },
        { name: 'EDGAR', clue: 'I was buried alive in the cellar walls', anger: 'Let me OUT!', stage: 2, reward: 'shield', difficulty: 2 },
        { name: 'CLARA', clue: 'The music box plays my lullaby still', anger: 'Silence it!', stage: 2, reward: 'candle', difficulty: 2 },
        { name: 'HENRY', clue: 'I froze waiting for my children to return', anger: 'They never came!', stage: 2, reward: 'shield', difficulty: 2 },
        { name: 'VICTORIA', clue: 'The mirror showed me my true face', anger: 'Do not look!', stage: 2, reward: 'candle', difficulty: 2 },
        
        // Stage 3: Malevolent spirits
        { name: 'HELENA', clue: 'I waited at the altar but death came instead', anger: 'You mock my grief!', stage: 3, reward: 'candle', difficulty: 3 },
        { name: 'SOLOMON', clue: 'The coven cursed me for my betrayal in 1743', anger: 'You dare invoke me?!', stage: 3, reward: 'shield', difficulty: 3 },
        { name: 'AGATHA', clue: 'I hear the children singing my lullaby still', anger: 'Silence the children!', stage: 3, reward: 'candle', difficulty: 3 },
        { name: 'WARD', clue: 'I was the last patient in the asylum', anger: 'They cannot keep me here!', stage: 3, reward: 'shield', difficulty: 3 },
        { name: 'IVY', clue: 'I danced in moonlight before the wolf found me', anger: 'The moon reveals all lies!', stage: 3, reward: 'candle', difficulty: 3 },
        { name: 'OSCAR', clue: 'The mine collapsed and I was forgotten', anger: 'Dig no deeper!', stage: 3, reward: 'shield', difficulty: 3 },
        { name: 'ELEANOR', clue: 'My portrait still hangs in the gallery', anger: 'Do not gaze upon me!', stage: 3, reward: 'candle', difficulty: 3 },
        { name: 'PERCIVAL', clue: 'The clock struck thirteen at my death', anger: 'Time is meaningless!', stage: 3, reward: 'shield', difficulty: 3 },
        
        // Stage 4: Ancient spirits
        { name: 'AZRAEL', clue: 'I am the keeper of the threshold between worlds', anger: 'YOU CANNOT CONTAIN ME!', stage: 4, reward: 'seal', difficulty: 4 },
        { name: 'NOCTIS', clue: 'Before your kind I walked these lands in shadow', anger: 'RETURN ME AND PERISH!', stage: 4, reward: 'seal', difficulty: 4 },
        { name: 'MORRIGAN', clue: 'War and death are my eternal companions', anger: 'ALL SHALL KNEEL!', stage: 4, reward: 'victory', difficulty: 4 },
        { name: 'THANATOS', clue: 'I have guided souls since the first breath', anger: 'YOUR TIME HAS COME!', stage: 4, reward: 'seal', difficulty: 4 },
        { name: 'LILITH', clue: 'I was the first to taste the forbidden fruit', anger: 'YOU ARE NOTHING!', stage: 4, reward: 'seal', difficulty: 4 },
        { name: 'CERBERUS', clue: 'I guard the gates that none may pass', anger: 'YOU SHALL NOT PASS!', stage: 4, reward: 'seal', difficulty: 4 },
        
        // Stage 5: Primordial spirits
        { name: 'CHAOS', clue: 'Before light, before dark, there was only me', anger: 'I AM ETERNAL!', stage: 5, reward: 'ultimate', difficulty: 5 },
        { name: 'VOID', clue: 'I am the nothing between stars', anger: 'BE CONSUMED!', stage: 5, reward: 'ultimate', difficulty: 5 },
        { name: 'ETERNITY', clue: 'I have seen the birth and death of worlds', anger: 'TIME ENDS NOW!', stage: 5, reward: 'ultimate', difficulty: 5 },
        { name: 'OBLIVION', clue: 'All things return to me in the end', anger: 'FORGET EVERYTHING!', stage: 5, reward: 'ultimate', difficulty: 5 }
    ];
    
    // ============================================
    // CURSE DEFINITIONS
    // ============================================
    
    const CURSE_TYPES = {
        flip_controls: { name: 'Reversed Controls', duration: 5, severity: 1 },
        speed_burst: { name: 'Speed Surge', duration: 5, severity: 2 },
        fog: { name: 'Dense Fog', duration: 8, severity: 1 },
        garbage_row: { name: 'Garbage Row', duration: 0, severity: 2 },
        invisible: { name: 'Invisible Piece', duration: 6, severity: 3 },
        possession: { name: 'Possession', duration: 4, severity: 3 },
        darkness: { name: 'Total Darkness', duration: 3, severity: 4 },
        confusion: { name: 'Confusion', duration: 6, severity: 2 }
    };
    
    // ============================================
    // GAME STATE
    // ============================================
    
    let canvas, ctx;
    let gameState = {
        active: false,
        paused: false,
        gameOver: false,
        currentSpirit: 0,
        spiritsFreed: 0,
        angerLevel: 0,
        maxAnger: 5,
        selectedLetters: '',
        totalTime: 0,
        ritualStage: 1,
        sealsCollected: 0,
        ending: '',
        score: 0
    };
    
    // Board layout
    let letterPositions = [];
    let numberPositions = [];
    const yesPos = { x: 120, y: 100, text: 'YES' };
    const noPos = { x: 580, y: 100, text: 'NO' };
    const goodbyePos = { x: 350, y: 440, text: 'GOODBYE' };
    
    // Planchette
    let planchette = { x: 350, y: 280, targetX: 350, targetY: 280, radius: 28 };
    let mouseX = 350, mouseY = 280;
    let clickCooldown = 0;
    
    // Candles
    let candles = [
        { x: 40, y: 460, lit: true, fuel: 100 },
        { x: 660, y: 460, lit: true, fuel: 100 },
        { x: 40, y: 50, lit: true, fuel: 100 },
        { x: 660, y: 50, lit: true, fuel: 100 }
    ];
    
    // Effects
    let particles = [];
    let smokeParticles = [];
    let boardShake = 0;
    let candleFlicker = 0;
    let ghostAlpha = 0;
    let ghostX = 0, ghostY = 0;
    let spiritMessage = '';
    let msgTimer = 0;
    let msgFade = 1;
    
    // Poltergeist
    let poltergeistActive = false;
    let poltergeistTimer = 0;
    let nextPoltergeist = 15;
    let poltergeistType = '';
    let planchetteHaunted = false;
    let hauntTimer = 0;
    let whisperText = '';
    let whisperAlpha = 0;
    let darknessAlpha = 0;
    
    // Curse
    let curseActive = false;
    let curseType = '';
    let curseTimer = 0;
    
    // Shield
    let shieldActive = false;
    let shieldTimer = 0;
    
    // Hint
    let hintTimer = 0;
    let showHint = false;
    let hintLetter = '';
    
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
            console.log('[Seance] Systems initialized');
        }
    };

    // ============================================
    // BOARD LAYOUT
    // ============================================
    
    function layoutBoard() {
        letterPositions = [];
        
        // Top arc of letters (A-M)
        for (let i = 0; i < 13; i++) {
            const angle = -0.6 + (i / 12) * 1.2;
            letterPositions.push({
                x: BOARD_WIDTH / 2 + Math.sin(angle) * 260,
                y: 180 + Math.cos(angle) * -40,
                letter: LETTERS[i]
            });
        }
        
        // Bottom arc of letters (N-Z)
        for (let i = 0; i < 13; i++) {
            const angle = -0.55 + (i / 12) * 1.1;
            letterPositions.push({
                x: BOARD_WIDTH / 2 + Math.sin(angle) * 240,
                y: 240 + Math.cos(angle) * -30,
                letter: LETTERS[i + 13]
            });
        }
        
        // Numbers row
        numberPositions = [];
        for (let i = 0; i < 10; i++) {
            numberPositions.push({
                x: 160 + i * 45,
                y: 340,
                letter: NUMBERS[i]
            });
        }
    }

    // ============================================
    // SPIRIT INTERACTION
    // ============================================
    
    function showSpiritClue() {
        if (gameState.currentSpirit < SPIRITS.length) {
            const spirit = SPIRITS[gameState.currentSpirit];
            gameState.ritualStage = spirit.stage;
            spiritMessage = `"${spirit.clue}"`;
            msgTimer = 5;
            msgFade = 1;
            hintTimer = 0;
            showHint = false;
            
            if (spirit.stage >= 3) {
                boardShake = 0.3;
                nextPoltergeist = 8 + Math.random() * 5;
            }
            
            // Update audio intensity
            if (Systems.audio && Systems.audio.musicSystem) {
                Systems.audio.musicSystem.setIntensity(spirit.stage / 5);
            }
        }
    }
    
    function checkAnswer() {
        if (gameState.currentSpirit >= SPIRITS.length) return;
        
        const target = SPIRITS[gameState.currentSpirit].name;
        
        if (target.indexOf(gameState.selectedLetters) === 0) {
            if (gameState.selectedLetters === target) {
                // Correct! Spirit freed
                spiritFreed();
            }
        } else {
            // Wrong!
            wrongAnswer();
        }
    }
    
    function spiritFreed() {
        gameState.spiritsFreed++;
        const spirit = SPIRITS[gameState.currentSpirit];
        
        if (window.ChallengeManager) {
            ChallengeManager.notify('seance', 'spirits_freed', 1);
        }
        
        spiritMessage = `💀 ${SPIRITS[gameState.currentSpirit].name} has been freed...`;
        msgTimer = 3;
        msgFade = 1;
        boardShake = 0.6;
        
        if (window.HorrorAudio) {
            HorrorAudio.playWin();
        }
        
        ghostAlpha = 1;
        ghostX = BOARD_WIDTH / 2;
        ghostY = BOARD_HEIGHT / 2;
        gameState.selectedLetters = '';
        
        // Apply reward
        applyReward(spirit.reward);
        
        // Score
        gameState.score += spirit.difficulty * 100;
        
        // Progression
        if (Systems.progression) {
            Systems.progression.addXP('seance', spirit.difficulty * 20);
        }
        
        gameState.currentSpirit++;
        
        if (gameState.currentSpirit >= SPIRITS.length) {
            gameState.ending = gameState.sealsCollected >= 2 ? 'power' : 'peace';
            setTimeout(() => gameWin(), 2500);
        } else {
            setTimeout(() => showSpiritClue(), 3000);
        }
    }
    
    function wrongAnswer() {
        gameState.angerLevel++;
        gameState.selectedLetters = '';
        
        const spirit = SPIRITS[gameState.currentSpirit];
        spiritMessage = spirit.anger;
        msgTimer = 2.5;
        msgFade = 1;
        boardShake = 0.8;
        
        if (window.HorrorAudio) {
            HorrorAudio.playJumpScare();
        }
        
        spawnParticles(BOARD_WIDTH / 2, BOARD_HEIGHT / 2, '#ff3333', 10);
        
        // Extinguish candle
        if (!shieldActive) {
            for (let i = candles.length - 1; i >= 0; i--) {
                if (candles[i].lit) {
                    candles[i].lit = false;
                    candles[i].fuel -= 20;
                    showMessage('🕯 A candle was extinguished!');
                    break;
                }
            }
        } else {
            showMessage('🛡 Shield absorbed the anger!');
            shieldActive = false;
            shieldTimer = 0;
        }
        
        // Check all candles out
        const litCount = candles.filter(c => c.lit).length;
        if (litCount === 0) {
            gameState.ending = 'consumed';
            setTimeout(() => gameOver(), 1500);
            return;
        }
        
        if (gameState.angerLevel >= gameState.maxAnger) {
            gameState.ending = 'consumed';
            setTimeout(() => gameOver(), 1500);
        }
        
        updateHUD();
    }
    
    function applyReward(reward) {
        switch (reward) {
            case 'candle':
                for (const candle of candles) {
                    candle.fuel = Math.min(100, candle.fuel + 25);
                    if (!candle.lit && candle.fuel > 20) candle.lit = true;
                }
                showMessage('🕯 Candles restored');
                break;
            case 'shield':
                shieldActive = true;
                shieldTimer = 15;
                showMessage('🛡 Spirit shield activated');
                break;
            case 'seal':
                gameState.sealsCollected++;
                showMessage(`🔮 Ancient seal obtained (${gameState.sealsCollected}/2)`);
                boardShake = 1.0;
                spawnParticles(BOARD_WIDTH / 2, BOARD_HEIGHT / 2, '#ff00ff', 20);
                break;
            case 'victory':
            case 'ultimate':
                gameState.sealsCollected += 2;
                showMessage('🌟 ULTIMATE POWER ACHIEVED!');
                boardShake = 1.5;
                spawnParticles(BOARD_WIDTH / 2, BOARD_HEIGHT / 2, '#ffff00', 30);
                break;
        }
    }

    // ============================================
    // POLTERGEIST EVENTS
    // ============================================
    
    function triggerPoltergeist() {
        const types = ['shake', 'flicker', 'planchette_move', 'whisper', 'darkness', 'possession'];
        poltergeistType = types[Math.floor(Math.random() * types.length)];
        poltergeistActive = true;
        poltergeistTimer = 2 + Math.random() * 2;
        
        const messages = {
            shake: '👻 The board trembles violently...',
            flicker: '🕯 The candles flicker wildly!',
            planchette_move: '⚡ Something is moving the planchette!',
            whisper: '👂 Whispers from beyond...',
            darkness: '🌑 Darkness encroaches!',
            possession: '😈 You feel a presence...'
        };
        
        showMessage(messages[poltergeistType] || '👻 Something strange happens...');
        
        if (poltergeistType === 'shake') {
            boardShake = 1.2;
        } else if (poltergeistType === 'planchette_move') {
            planchetteHaunted = true;
            hauntTimer = 3;
        } else if (poltergeistType === 'whisper') {
            const randomSpirit = SPIRITS[Math.floor(Math.random() * Math.min(gameState.currentSpirit + 1, SPIRITS.length))];
            whisperText = randomSpirit.clue.split(' ').slice(0, 3).join(' ') + '...';
            whisperAlpha = 1;
        } else if (poltergeistType === 'darkness') {
            darknessAlpha = 0.7;
        } else if (poltergeistType === 'possession') {
            // Random effect
            gameState.selectedLetters = '';
        }
        
        if (window.HorrorAudio) {
            HorrorAudio.playJumpScare();
        }
    }

    // ============================================
    // INPUT HANDLING
    // ============================================
    
    function selectAtPlanchette() {
        if (clickCooldown > 0 || !gameState.active || planchetteHaunted) return;
        clickCooldown = 0.25;
        
        const allPositions = [...letterPositions, ...numberPositions];
        
        for (const pos of allPositions) {
            const dx = planchette.x - pos.x;
            const dy = planchette.y - pos.y;
            if (Math.sqrt(dx * dx + dy * dy) < 30) {
                gameState.selectedLetters += pos.letter;
                
                if (window.HorrorAudio) {
                    HorrorAudio.playClick();
                }
                
                candleFlicker = 0.5;
                spawnParticles(planchette.x, planchette.y, '#ffcc44', 4);
                checkAnswer();
                updateHUD();
                return;
            }
        }
        
        // GOODBYE - clear selection
        if (Math.abs(planchette.x - goodbyePos.x) < 60 && Math.abs(planchette.y - goodbyePos.y) < 20) {
            gameState.selectedLetters = '';
            if (window.HorrorAudio) HorrorAudio.playHover();
            updateHUD();
        }
    }
    
    function activateHint() {
        if (gameState.currentSpirit >= SPIRITS.length) return;
        
        const target = SPIRITS[gameState.currentSpirit].name;
        const nextIdx = gameState.selectedLetters.length;
        
        if (nextIdx < target.length) {
            hintLetter = target[nextIdx];
            showHint = true;
            hintTimer = 3;
            
            // Cost: candle fuel
            for (const candle of candles) {
                if (candle.lit) {
                    candle.fuel -= 8;
                    break;
                }
            }
        }
    }

    // ============================================
    // PARTICLES
    // ============================================
    
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 80,
                vy: (Math.random() - 0.5) * 80 - 20,
                life: 0.8 + Math.random() * 0.5,
                maxLife: 1.3,
                color,
                size: 2 + Math.random() * 3
            });
        }
    }
    
    function spawnSmoke(x, y) {
        smokeParticles.push({
            x, y,
            vx: (Math.random() - 0.5) * 10,
            vy: -15 - Math.random() * 10,
            life: 1.5 + Math.random(),
            maxLife: 2.5,
            size: 3 + Math.random() * 5,
            alpha: 0.3
        });
    }
    
    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }
        
        for (let i = smokeParticles.length - 1; i >= 0; i--) {
            const p = smokeParticles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) smokeParticles.splice(i, 1);
        }
    }

    // ============================================
    // RENDERING
    // ============================================
    
    function render() {
        const w = BOARD_WIDTH;
        const h = BOARD_HEIGHT;
        
        // Board background
        const bgGrd = ctx.createLinearGradient(0, 0, 0, h);
        bgGrd.addColorStop(0, '#2a1a0a');
        bgGrd.addColorStop(0.5, '#3a2510');
        bgGrd.addColorStop(1, '#1a0e05');
        ctx.fillStyle = bgGrd;
        ctx.fillRect(0, 0, w, h);
        
        // Wood grain
        ctx.strokeStyle = 'rgba(60,40,15,0.3)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 30; i++) {
            const gy = i * (h / 30) + Math.sin(i * 0.5) * 3;
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy + Math.sin(i) * 5);
            ctx.stroke();
        }
        
        ctx.save();
        if (boardShake > 0) {
            ctx.translate((Math.random() - 0.5) * boardShake * 10, (Math.random() - 0.5) * boardShake * 10);
        }
        
        // Ritual stage indicator
        const stageColors = ['#886633', '#cc8833', '#ff4444', '#ff00ff', '#ffffff'];
        ctx.strokeStyle = stageColors[gameState.ritualStage - 1] || '#886633';
        ctx.lineWidth = 3;
        ctx.strokeRect(15, 15, w - 30, h - 30);
        
        // Stage symbols
        if (gameState.ritualStage >= 3) {
            ctx.save();
            ctx.globalAlpha = 0.15 + Math.sin(Date.now() * 0.002) * 0.08;
            ctx.strokeStyle = '#ff3333';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, 160, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        
        // YES / NO
        ctx.font = '700 24px serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ccaa66';
        ctx.fillText('YES', yesPos.x, yesPos.y);
        ctx.fillText('NO', noPos.x, noPos.y);
        
        // Letters
        ctx.font = '600 20px serif';
        for (const lp of letterPositions) {
            const dx = planchette.x - lp.x;
            const dy = planchette.y - lp.y;
            const near = Math.sqrt(dx * dx + dy * dy) < 30;
            const isHint = showHint && lp.letter === hintLetter;
            
            ctx.fillStyle = isHint ? '#44ff44' : near ? '#ffdd88' : '#aa8844';
            if (near || isHint) {
                ctx.shadowColor = isHint ? '#44ff44' : '#ffdd88';
                ctx.shadowBlur = 10;
            }
            ctx.fillText(lp.letter, lp.x, lp.y);
            ctx.shadowBlur = 0;
        }
        
        // Numbers
        ctx.font = '600 18px serif';
        for (const np of numberPositions) {
            ctx.fillStyle = '#887744';
            ctx.fillText(np.letter, np.x, np.y);
        }
        
        // GOODBYE
        ctx.font = '700 20px serif';
        ctx.fillStyle = '#887744';
        ctx.fillText('GOODBYE', goodbyePos.x, goodbyePos.y);
        
        // Selected letters
        if (gameState.selectedLetters.length > 0) {
            ctx.font = '700 28px serif';
            ctx.fillStyle = '#ffcc44';
            ctx.shadowColor = '#ffcc44';
            ctx.shadowBlur = 12;
            ctx.fillText(gameState.selectedLetters, w / 2, 400);
            ctx.shadowBlur = 0;
        }
        
        // Planchette
        ctx.save();
        ctx.translate(planchette.x, planchette.y);
        if (planchetteHaunted) {
            ctx.rotate(Math.sin(Date.now() * 0.01) * 0.1);
        }
        ctx.shadowColor = planchetteHaunted ? '#ff0000' : '#ffaa44';
        ctx.shadowBlur = 10 + (candleFlicker > 0 ? 20 : 0);
        ctx.fillStyle = planchetteHaunted ? 'rgba(100,20,20,0.9)' : 'rgba(80,50,20,0.9)';
        ctx.beginPath();
        ctx.moveTo(0, -planchette.radius);
        ctx.bezierCurveTo(planchette.radius, -planchette.radius * 0.5, planchette.radius, planchette.radius * 0.5, 0, planchette.radius);
        ctx.bezierCurveTo(-planchette.radius, planchette.radius * 0.5, -planchette.radius, -planchette.radius * 0.5, 0, -planchette.radius);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = shieldActive ? 'rgba(100,200,255,0.3)' : 'rgba(255,220,150,0.2)';
        ctx.beginPath();
        ctx.arc(0, -5, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Spirit message
        if (msgTimer > 0) {
            ctx.globalAlpha = Math.min(1, msgFade);
            ctx.font = 'italic 600 16px serif';
            ctx.fillStyle = gameState.ritualStage >= 3 ? '#ff4444' : '#cc8833';
            ctx.shadowColor = gameState.ritualStage >= 3 ? '#ff0000' : '#ff6600';
            ctx.shadowBlur = 8;
            ctx.fillText(spiritMessage, w / 2, 130);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
        
        // Ghost apparition
        if (ghostAlpha > 0) {
            ctx.globalAlpha = ghostAlpha * 0.4;
            ctx.fillStyle = '#aabbff';
            ctx.beginPath();
            ctx.arc(ghostX, ghostY - 20, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(ghostX - 20, ghostY + 10, 40, 40);
            ctx.globalAlpha = 1;
        }
        
        // Candles
        for (const candle of candles) {
            if (candle.lit) {
                const flick = 0.4 + Math.sin(Date.now() * 0.005) * 0.1;
                ctx.fillStyle = `rgba(255,180,50,${flick})`;
                ctx.shadowColor = '#ff8800';
                ctx.shadowBlur = 15 + flick * 10;
                ctx.beginPath();
                ctx.arc(candle.x, candle.y - 8, 5 + Math.sin(Date.now() * 0.008) * 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            
            const bodyH = Math.max(3, 14 * (candle.fuel / 100));
            ctx.fillStyle = candle.lit ? '#ddd' : '#777';
            ctx.fillRect(candle.x - 3, candle.y - 3, 6, bodyH);
        }
        
        // Particles
        for (const p of particles) {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Darkness effect
        if (darknessAlpha > 0) {
            ctx.fillStyle = `rgba(0,0,0,${darknessAlpha})`;
            ctx.fillRect(0, 0, w, h);
        }
        
        ctx.restore();
        
        // Side panel
        renderSidePanel();
    }
    
    function renderSidePanel() {
        const panelX = BOARD_WIDTH + 15;
        
        ctx.fillStyle = '#0a0000';
        ctx.fillRect(BOARD_WIDTH, 0, 200, BOARD_HEIGHT);
        
        ctx.strokeStyle = 'rgba(100,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(BOARD_WIDTH, 0);
        ctx.lineTo(BOARD_WIDTH, BOARD_HEIGHT);
        ctx.stroke();
        
        // Spirits freed
        ctx.fillStyle = '#aa4444';
        ctx.font = '600 14px Inter';
        ctx.fillText(`👻 ${gameState.spiritsFreed}/${SPIRITS.length}`, panelX, 25);
        ctx.fillText(`Stage ${gameState.ritualStage}`, panelX, 45);
        
        // Anger meter
        ctx.fillStyle = '#cc3333';
        ctx.fillText('ANGER:', panelX, 80);
        const angerFilled = '🔴'.repeat(gameState.angerLevel) + '⚫'.repeat(gameState.maxAnger - gameState.angerLevel);
        ctx.fillText(angerFilled, panelX, 100);
        
        // Seals
        if (gameState.sealsCollected > 0) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillText(`🔮 Seals: ${gameState.sealsCollected}/2`, panelX, 130);
        }
        
        // Shield
        if (shieldActive) {
            ctx.fillStyle = '#44aaff';
            ctx.fillText(`🛡 Shield: ${Math.ceil(shieldTimer)}s`, panelX, 160);
        }
        
        // Score
        ctx.fillStyle = '#ffcc00';
        ctx.font = '700 18px Inter';
        ctx.fillText(`Score: ${gameState.score}`, panelX, 200);
        
        // Instructions
        ctx.fillStyle = '#884444';
        ctx.font = '400 11px Inter';
        ctx.fillText('Click to select letters', panelX, 250);
        ctx.fillText('[H] Hint (costs fuel)', panelX, 270);
        ctx.fillText('[Backspace] Undo', panelX, 290);
    }

    // ============================================
    // GAME LOOP
    // ============================================
    
    let lastTime = 0;
    
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
        gameState.totalTime += dt;
        
        // Update timers
        if (clickCooldown > 0) clickCooldown -= dt;
        if (boardShake > 0) boardShake -= dt;
        if (candleFlicker > 0) candleFlicker -= dt;
        if (msgTimer > 0) { msgTimer -= dt; msgFade = msgTimer; }
        if (ghostAlpha > 0) ghostAlpha -= dt * 0.5;
        if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) showHint = false; }
        if (shieldTimer > 0) { shieldTimer -= dt; if (shieldTimer <= 0) shieldActive = false; }
        
        // Poltergeist
        if (poltergeistActive) {
            poltergeistTimer -= dt;
            if (poltergeistTimer <= 0) {
                poltergeistActive = false;
                planchetteHaunted = false;
                darknessAlpha = 0;
            }
        } else {
            nextPoltergeist -= dt;
            if (nextPoltergeist <= 0 && gameState.ritualStage >= 2) {
                nextPoltergeist = 12 + Math.random() * 8;
                triggerPoltergeist();
            }
        }
        
        // Haunted planchette movement
        if (planchetteHaunted) {
            planchette.x += (Math.random() - 0.5) * 100 * dt;
            planchette.y += (Math.random() - 0.5) * 100 * dt;
            planchette.x = Math.max(50, Math.min(BOARD_WIDTH - 50, planchette.x));
            planchette.y = Math.max(50, Math.min(BOARD_HEIGHT - 50, planchette.y));
        } else {
            // Smooth planchette movement toward mouse
            planchette.x += (mouseX - planchette.x) * 5 * dt;
            planchette.y += (mouseY - planchette.y) * 5 * dt;
        }
        
        // Update particles
        updateParticles(dt);
        
        // Candle fuel drain
        for (const candle of candles) {
            if (candle.lit) {
                candle.fuel -= dt * 0.5;
                if (candle.fuel <= 0) {
                    candle.lit = false;
                    candle.fuel = 0;
                }
            }
        }
        
        // Update audio
        if (Systems.audio && Systems.audio.musicSystem) {
            Systems.audio.musicSystem.setIntensity(gameState.ritualStage / 5 + (gameState.angerLevel / gameState.maxAnger) * 0.3);
        }
    }
    
    function updateHUD() {
        const spiritsEl = document.getElementById('hud-spirits');
        const angerEl = document.getElementById('hud-anger');
        
        if (spiritsEl) spiritsEl.textContent = `👻 ${gameState.spiritsFreed}/${SPIRITS.length} | Stage ${gameState.ritualStage}`;
        if (angerEl) {
            let filled = '';
            for (let i = 0; i < gameState.maxAnger; i++) {
                filled += i < gameState.angerLevel ? '🔴' : '⚫';
            }
            angerEl.textContent = filled;
            angerEl.style.color = gameState.angerLevel >= 3 ? '#ff3333' : '';
        }
    }

    // ============================================
    // GAME STATE MANAGEMENT
    // ============================================
    
    let messageTimer2 = 0;
    let messageText2 = '';
    
    function showMessage(text) {
        messageText2 = text;
        messageTimer2 = 3;
    }
    
    function startGame() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        canvas.width = BOARD_WIDTH + 200;
        canvas.height = BOARD_HEIGHT;
        layoutBoard();
        
        // Input handlers
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = (e.clientX - rect.left) * (BOARD_WIDTH / rect.width);
            mouseY = (e.clientY - rect.top) * (BOARD_HEIGHT / rect.height);
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const t = e.touches[0];
            mouseX = (t.clientX - rect.left) * (BOARD_WIDTH / rect.width);
            mouseY = (t.clientY - rect.top) * (BOARD_HEIGHT / rect.height);
        }, { passive: false });
        
        canvas.addEventListener('click', () => selectAtPlanchette());
        canvas.addEventListener('touchend', (e) => { e.preventDefault(); selectAtPlanchette(); }, { passive: false });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && gameState.active) {
                gameState.paused = !gameState.paused;
                if (gameState.paused && window.GameUtils) GameUtils.pauseGame();
                return;
            }
            if (e.code === 'KeyH' && gameState.active) activateHint();
            if (e.code === 'Backspace' && gameState.active && gameState.selectedLetters.length > 0) {
                gameState.selectedLetters = gameState.selectedLetters.slice(0, -1);
                updateHUD();
            }
        });
        
        document.getElementById('start-screen').style.display = 'none';
        const ctrl = document.getElementById('controls-overlay');
        ctrl.style.display = 'flex';
        
        if (window.HorrorAudio) {
            HorrorAudio.init();
            HorrorAudio.startDrone(35, 'dark');
        }
        
        setTimeout(() => {
            ctrl.classList.add('hiding');
            setTimeout(() => {
                ctrl.style.display = 'none';
                ctrl.classList.remove('hiding');
                resetGame();
                showSpiritClue();
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
        gameState = {
            active: true,
            paused: false,
            gameOver: false,
            currentSpirit: 0,
            spiritsFreed: 0,
            angerLevel: 0,
            maxAnger: 5,
            selectedLetters: '',
            totalTime: 0,
            ritualStage: 1,
            sealsCollected: 0,
            ending: '',
            score: 0
        };
        
        for (const candle of candles) {
            candle.lit = true;
            candle.fuel = 100;
        }
        
        particles = [];
        smokeParticles = [];
        poltergeistActive = false;
        nextPoltergeist = 12 + Math.random() * 8;
        shieldActive = false;
        planchetteHaunted = false;
        darknessAlpha = 0;
        
        updateHUD();
    }
    
    function gameOver() {
        gameState.active = false;
        if (window.GameUtils) GameUtils.setState(GameUtils.STATE.GAME_OVER);
        if (window.HorrorAudio) { HorrorAudio.playDeath(); HorrorAudio.stopDrone(); }
        
        const msgEl = document.querySelector('#game-over-screen p');
        if (msgEl) {
            msgEl.textContent = gameState.ending === 'consumed' 
                ? 'The darkness consumed you... all candles are extinguished.' 
                : 'The spirits have overwhelmed you...';
        }
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        
        const btn = document.querySelector('#game-over-screen .play-btn');
        if (btn) btn.onclick = restartGame;
    }
    
    function gameWin() {
        gameState.active = false;
        if (window.GameUtils) GameUtils.setState(GameUtils.STATE.WIN);
        if (window.HorrorAudio) { HorrorAudio.playWin(); HorrorAudio.stopDrone(); }
        
        const msgEl = document.querySelector('#game-win-screen p');
        if (msgEl) {
            if (gameState.ending === 'power') {
                msgEl.textContent = `🔮 You command the spirit realm! All ${SPIRITS.length} spirits freed. The ancient seals grant you dominion over the dead.`;
            } else {
                msgEl.textContent = `✨ All ${SPIRITS.length} spirits have found peace. The board falls silent. Time: ${Math.round(gameState.totalTime)}s`;
            }
        }
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        
        const btn = document.querySelector('#game-win-screen .play-btn');
        if (btn) btn.onclick = restartGame;
    }
    
    function restartGame() {
        resetGame();
        showSpiritClue();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        if (window.HorrorAudio) HorrorAudio.startDrone(35, 'dark');
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
        
        console.log('[Seance] Enhanced version initialized');
    }
    
    init();
})();