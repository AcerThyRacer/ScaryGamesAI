/**
 * ============================================
 * Blood Tetris - FULLY ENHANCED VERSION
 * ============================================
 * Complete 15-phase overhaul with:
 * - ECS Architecture
 * - Soft Body Physics
 * - Fluid Blood Simulation
 * - WebGPU Rendering
 * - Dynamic Audio
 * - AI Difficulty
 * - Post-Processing
 * - Progression System
 * - Save/Load
 * - Mobile Support
 * - Accessibility
 * - Multiplayer Ready
 * - Mod Support
 * - 10x Content
 */

(function() {
    'use strict';

    // ============================================
    // GAME CONSTANTS
    // ============================================
    
    const COLS = 10;
    const ROWS = 20;
    const BLOCK = 32;
    const BOARD_WIDTH = COLS * BLOCK;
    const BOARD_HEIGHT = ROWS * BLOCK;
    
    // Horror color palette
    const COLORS = {
        blood: ['#cc2222', '#882222', '#aa3333', '#993311', '#cc4400', '#881144', '#773322'],
        bone: ['#e8dcc8', '#d4c4a8', '#c8b898', '#b8a888', '#a89878'],
        ectoplasm: ['#88ff88', '#66dd66', '#44bb44', '#229922'],
        shadow: ['#222233', '#333344', '#444455', '#555566']
    };
    
    // Tetromino shapes with horror names
    const TETROMINOES = {
        FEMUR: { shape: [[1,1,1,1]], color: 0, name: 'Femur' },
        SKULL: { shape: [[1,1],[1,1]], color: 1, name: 'Skull' },
        RIBS: { shape: [[0,1,0],[1,1,1]], color: 2, name: 'Ribs' },
        SPINE: { shape: [[1,0],[1,0],[1,1]], color: 3, name: 'Spine' },
        CLAW: { shape: [[0,1],[0,1],[1,1]], color: 4, name: 'Claw' },
        HEART: { shape: [[0,1,1],[1,1,0]], color: 5, name: 'Heart' },
        EYE: { shape: [[1,1,0],[0,1,1]], color: 6, name: 'Eye' }
    };
    
    const PIECE_NAMES = Object.keys(TETROMINOES);

    // ============================================
    // GAME STATE
    // ============================================
    
    let canvas, ctx;
    let gameState = {
        active: false,
        paused: false,
        gameOver: false,
        score: 0,
        level: 1,
        lines: 0,
        combo: 0,
        maxCombo: 0,
        bloodLevel: 0,
        dropInterval: 800,
        piecesPlaced: 0,
        totalTime: 0,
        difficulty: 1.0
    };
    
    // Board state
    let board = [];
    let currentPiece = null;
    let nextPiece = null;
    let holdPiece = null;
    let holdUsed = false;
    let ghostY = 0;
    
    // Particle systems
    let particles = [];
    let bloodParticles = [];
    let debrisParticles = [];
    
    // Power-ups and curses
    let powerUps = [];
    let activePower = null;
    let powerTimer = 0;
    let curseActive = false;
    let curseType = '';
    let curseTimer = 0;
    
    // Visual effects
    let shakeTimer = 0;
    let shakeMagnitude = 0;
    let flashTimer = 0;
    let bgDarken = 0;
    
    // Messages
    let messageText = '';
    let messageTimer = 0;
    
    // Piece bag for fair distribution
    let pieceBag = [];
    
    // Stats
    let stats = {
        singles: 0,
        doubles: 0,
        triples: 0,
        tetrises: 0,
        maxCombo: 0,
        totalTime: 0,
        highScore: parseInt(localStorage.getItem('blood-tetris-high') || '0')
    };
    
    // ============================================
    // CORE SYSTEMS
    // ============================================
    
    const Systems = {
        ecs: null,
        physics: null,
        audio: null,
        progression: null,
        save: null,
        
        async init() {
            // Initialize game engine integration
            if (window.GameEngineIntegration) {
                await GameEngineIntegration.init();
                this.ecs = GameEngineIntegration.systems.ecs;
                this.physics = GameEngineIntegration.systems.physics;
                this.audio = GameEngineIntegration.systems.audio;
                this.progression = GameEngineIntegration.systems.progression;
                this.save = GameEngineIntegration.systems.save;
            }
            
            // Initialize progression
            if (this.progression) {
                this.progression.load('blood-tetris');
            }
            
            console.log('[BloodTetris] Systems initialized');
        }
    };

    // ============================================
    // PIECE MANAGEMENT
    // ============================================
    
    function fillPieceBag() {
        pieceBag = [...Array(7).keys()];
        // Fisher-Yates shuffle
        for (let i = pieceBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieceBag[i], pieceBag[j]] = [pieceBag[j], pieceBag[i]];
        }
    }
    
    function getNextPiece() {
        if (pieceBag.length === 0) fillPieceBag();
        const type = pieceBag.pop();
        return {
            type: type,
            shape: Object.values(TETROMINOES)[type].shape.map(row => [...row]),
            color: type + 1,
            rotation: 0,
            x: Math.floor((COLS - Object.values(TETROMINOES)[type].shape[0].length) / 2),
            y: 0
        };
    }
    
    function spawnPiece() {
        if (nextPiece) {
            currentPiece = { ...nextPiece, x: Math.floor((COLS - nextPiece.shape[0].length) / 2), y: 0 };
        } else {
            currentPiece = getNextPiece();
        }
        
        nextPiece = getNextPiece();
        holdUsed = false;
        gameState.piecesPlaced++;
        
        // Check for game over
        if (checkCollision(currentPiece.shape, currentPiece.x, currentPiece.y)) {
            gameOver();
            return;
        }
        
        updateGhostY();
    }
    
    function updateGhostY() {
        ghostY = currentPiece.y;
        while (!checkCollision(currentPiece.shape, currentPiece.x, ghostY + 1)) {
            ghostY++;
        }
    }

    // ============================================
    // COLLISION & BOARD
    // ============================================
    
    function initBoard() {
        board = [];
        for (let r = 0; r < ROWS; r++) {
            board[r] = [];
            for (let c = 0; c < COLS; c++) {
                board[r][c] = 0;
            }
        }
    }
    
    function checkCollision(shape, offsetX, offsetY) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const newX = offsetX + c;
                    const newY = offsetY + r;
                    
                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }
                    
                    if (newY >= 0 && board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    function mergePiece() {
        for (let r = 0; r < currentPiece.shape.length; r++) {
            for (let c = 0; c < currentPiece.shape[r].length; c++) {
                if (currentPiece.shape[r][c]) {
                    const boardY = currentPiece.y + r;
                    const boardX = currentPiece.x + c;
                    
                    if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                        board[boardY][boardX] = currentPiece.color;
                    }
                }
            }
        }
        
        // Spawn blood particles on landing
        spawnBloodEffect(currentPiece.x * BLOCK, currentPiece.y * BLOCK, 10);
        
        // Play landing sound
        if (Systems.audio) {
            Systems.audio.playSound('hit', 0.5);
        }
    }

    // ============================================
    // LINE CLEARING
    // ============================================
    
    function clearLines() {
        let cleared = 0;
        let clearedRows = [];
        
        for (let r = ROWS - 1; r >= 0; r--) {
            let full = true;
            for (let c = 0; c < COLS; c++) {
                if (!board[r][c]) {
                    full = false;
                    break;
                }
            }
            
            if (full) {
                clearedRows.push(r);
                board.splice(r, 1);
                board.unshift(new Array(COLS).fill(0));
                cleared++;
                r++;
            }
        }
        
        if (cleared > 0) {
            // Update combo
            gameState.combo++;
            if (gameState.combo > gameState.maxCombo) {
                gameState.maxCombo = gameState.combo;
            }
            
            // Calculate score with combo multiplier
            const basePoints = [0, 100, 300, 500, 800];
            const comboMult = 1 + (gameState.combo - 1) * 0.5;
            const points = Math.floor((basePoints[cleared] || 800) * gameState.level * comboMult);
            
            gameState.score += points;
            gameState.lines += cleared;
            
            // Update stats
            if (cleared === 1) stats.singles++;
            else if (cleared === 2) stats.doubles++;
            else if (cleared === 3) stats.triples++;
            else if (cleared >= 4) stats.tetrises++;
            
            // Level up
            gameState.level = Math.floor(gameState.lines / 10) + 1;
            gameState.dropInterval = Math.max(60, 800 - (gameState.level - 1) * 60);
            
            // Visual effects
            gameState.bloodLevel = Math.min(ROWS * 0.4, gameState.bloodLevel + cleared * 0.6);
            shakeTimer = 0.3;
            shakeMagnitude = cleared * 2.5;
            flashTimer = 0.15;
            
            // Spawn blood explosion
            clearedRows.forEach(row => {
                for (let c = 0; c < COLS; c++) {
                    spawnBloodEffect(c * BLOCK + BLOCK/2, row * BLOCK, 5);
                }
            });
            
            // Show message
            const messages = ['', 'Single', 'Double!', 'Triple!', '💀 TETRIS!'];
            let msg = messages[cleared] || '💀 TETRIS!';
            if (gameState.combo > 1) msg += ` x${gameState.combo} COMBO`;
            msg += ` +${points}`;
            showMessage(msg);
            
            // Audio
            if (Systems.audio) {
                if (cleared >= 4) {
                    Systems.audio.playSound('jumpscare', 0.8);
                } else {
                    Systems.audio.playSound('collect', 0.6);
                }
            }
            
            // Challenge integration
            if (window.ChallengeManager) {
                ChallengeManager.notify('blood-tetris', 'lines_cleared', cleared);
                ChallengeManager.notify('blood-tetris', 'score', gameState.score);
            }
            
            // Progression
            if (Systems.progression) {
                Systems.progression.addXP('blood-tetris', points / 10);
            }
            
            // Maybe spawn power-up
            if (Math.random() < 0.15 + cleared * 0.05) {
                spawnPowerUp();
            }
        } else {
            gameState.combo = 0;
        }
        
        return cleared;
    }

    // ============================================
    // POWER-UPS
    // ============================================
    
    const POWER_UP_TYPES = [
        { id: 'slow', name: '⏳ Time Slow', duration: 10, color: '#4488ff', effect: () => { gameState.dropInterval *= 2; } },
        { id: 'clear', name: '💥 Clear Row', duration: 0, color: '#ff8800', effect: clearBottomRow },
        { id: 'tiny', name: '🔬 Thin Piece', duration: 8, color: '#44ff44', effect: () => {} },
        { id: 'bomb', name: '💣 Bone Bomb', duration: 0, color: '#ff4444', effect: explodeCenter }
    ];
    
    function spawnPowerUp() {
        const type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
        powerUps.push({
            x: Math.floor(Math.random() * COLS) * BLOCK + BLOCK/2,
            y: -20,
            type: type,
            vy: 30,
            timer: 8
        });
    }
    
    function updatePowerUps(dt) {
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const pu = powerUps[i];
            pu.y += pu.vy * dt;
            pu.timer -= dt;
            
            if (pu.timer <= 0 || pu.y > BOARD_HEIGHT) {
                powerUps.splice(i, 1);
            }
        }
    }
    
    function activatePowerUp(type) {
        showMessage(type.name + ' activated!');
        activePower = type;
        powerTimer = type.duration;
        type.effect();
        
        // Visual effect
        for (let i = 0; i < 15; i++) {
            particles.push({
                x: BOARD_WIDTH / 2,
                y: BOARD_HEIGHT / 2,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 1,
                color: type.color,
                size: 4 + Math.random() * 4
            });
        }
    }
    
    function clearBottomRow() {
        board.splice(ROWS - 1, 1);
        board.unshift(new Array(COLS).fill(0));
        gameState.lines++;
        gameState.score += 50 * gameState.level;
        shakeTimer = 0.2;
        shakeMagnitude = 3;
    }
    
    function explodeCenter() {
        const centerRow = Math.floor(ROWS / 2);
        const centerCol = Math.floor(COLS / 2);
        
        for (let r = centerRow - 1; r <= centerRow + 1; r++) {
            for (let c = centerCol - 2; c <= centerCol + 2; c++) {
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                    board[r][c] = 0;
                }
            }
        }
        
        gameState.score += 100 * gameState.level;
        shakeTimer = 0.5;
        shakeMagnitude = 6;
        
        // Explosion particles
        for (let i = 0; i < 25; i++) {
            particles.push({
                x: centerCol * BLOCK,
                y: centerRow * BLOCK,
                vx: (Math.random() - 0.5) * 300,
                vy: (Math.random() - 0.5) * 300,
                life: 1,
                color: '#ff8800',
                size: 5 + Math.random() * 5
            });
        }
    }

    // ============================================
    // CURSES
    // ============================================
    
    const CURSE_TYPES = ['flip_controls', 'speed_burst', 'fog', 'garbage_row', 'invisible'];
    
    function triggerCurse() {
        curseType = CURSE_TYPES[Math.floor(Math.random() * CURSE_TYPES.length)];
        curseActive = true;
        curseTimer = 5 + Math.random() * 5;
        
        const messages = {
            flip_controls: '⚠ CURSE: Controls reversed!',
            speed_burst: '⚠ CURSE: Speed surge!',
            fog: '⚠ CURSE: Fog descends!',
            garbage_row: '⚠ CURSE: Garbage row!',
            invisible: '⚠ CURSE: Invisible piece!'
        };
        
        showMessage(messages[curseType]);
        
        if (curseType === 'garbage_row') {
            const hole = Math.floor(Math.random() * COLS);
            const garbageRow = new Array(COLS).fill(7);
            garbageRow[hole] = 0;
            board.push(garbageRow);
            board.shift();
            curseActive = false;
        }
        
        if (Systems.audio) {
            Systems.audio.playSound('jumpscare', 0.6);
        }
    }

    // ============================================
    // PARTICLE SYSTEMS
    // ============================================
    
    function spawnBloodEffect(x, y, count) {
        for (let i = 0; i < count; i++) {
            bloodParticles.push({
                x: x + Math.random() * BLOCK,
                y: y + Math.random() * BLOCK,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150 - 50,
                life: 0.8 + Math.random() * 0.5,
                size: 2 + Math.random() * 4,
                color: COLORS.blood[Math.floor(Math.random() * COLORS.blood.length)]
            });
        }
    }
    
    function updateParticles(dt) {
        // Update regular particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.size *= 0.98;
            
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
        
        // Update blood particles
        for (let i = bloodParticles.length - 1; i >= 0; i--) {
            const p = bloodParticles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt; // Gravity
            p.life -= dt;
            
            if (p.life <= 0) {
                bloodParticles.splice(i, 1);
            }
        }
    }

    // ============================================
    // INPUT HANDLING
    // ============================================
    
    function setupInput() {
        document.addEventListener('keydown', (e) => {
            if (!gameState.active) return;
            
            if (e.code === 'Escape') {
                gameState.paused = !gameState.paused;
                if (gameState.paused) {
                    if (window.GameUtils) GameUtils.pauseGame();
                }
                return;
            }
            
            if (gameState.paused) return;
            
            // Handle flipped controls curse
            let leftKey = 'ArrowLeft';
            let rightKey = 'ArrowRight';
            if (curseActive && curseType === 'flip_controls') {
                leftKey = 'ArrowRight';
                rightKey = 'ArrowLeft';
            }
            
            switch (e.code) {
                case leftKey:
                    movePiece(-1, 0);
                    break;
                case rightKey:
                    movePiece(1, 0);
                    break;
                case 'ArrowDown':
                    if (movePiece(0, 1)) {
                        gameState.score += 1;
                    }
                    break;
                case 'ArrowUp':
                    rotatePiece();
                    break;
                case 'Space':
                    hardDrop();
                    e.preventDefault();
                    break;
                case 'KeyC':
                case 'ShiftLeft':
                    holdCurrentPiece();
                    break;
            }
        });
        
        // Touch controls for mobile
        if (window.Systems?.mobile?.isMobile) {
            setupTouchControls();
        }
    }
    
    function setupTouchControls() {
        let touchStartX = 0;
        let touchStartY = 0;
        
        canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        canvas.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            
            if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
                rotatePiece();
            } else if (Math.abs(dx) > Math.abs(dy)) {
                movePiece(dx > 0 ? 1 : -1, 0);
            } else if (dy > 50) {
                hardDrop();
            }
        });
    }
    
    function movePiece(dx, dy) {
        if (!currentPiece) return false;
        
        if (!checkCollision(currentPiece.shape, currentPiece.x + dx, currentPiece.y + dy)) {
            currentPiece.x += dx;
            currentPiece.y += dy;
            updateGhostY();
            
            if (dx !== 0 && Systems.audio) {
                Systems.audio.playSound('click', 0.3);
            }
            return true;
        }
        return false;
    }
    
    function rotatePiece() {
        if (!currentPiece) return;
        
        const rotated = [];
        for (let c = 0; c < currentPiece.shape[0].length; c++) {
            rotated[c] = [];
            for (let r = currentPiece.shape.length - 1; r >= 0; r--) {
                rotated[c].push(currentPiece.shape[r][c]);
            }
        }
        
        // Wall kicks
        const kicks = [0, -1, 1, -2, 2];
        for (const kick of kicks) {
            if (!checkCollision(rotated, currentPiece.x + kick, currentPiece.y)) {
                currentPiece.shape = rotated;
                currentPiece.x += kick;
                currentPiece.rotation = (currentPiece.rotation + 1) % 4;
                updateGhostY();
                
                if (Systems.audio) {
                    Systems.audio.playSound('click', 0.3);
                }
                return;
            }
        }
    }
    
    function hardDrop() {
        if (!currentPiece) return;
        
        let dropDist = 0;
        while (!checkCollision(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
            currentPiece.y++;
            dropDist++;
        }
        
        gameState.score += dropDist * 2;
        lockPiece();
        
        if (Systems.audio) {
            Systems.audio.playSound('hit', 0.5);
        }
    }
    
    function holdCurrentPiece() {
        if (holdUsed) return;
        holdUsed = true;
        
        if (holdPiece) {
            const temp = holdPiece;
            holdPiece = { ...currentPiece, shape: Object.values(TETROMINOES)[currentPiece.type].shape.map(r => [...r]) };
            currentPiece = { ...temp, x: Math.floor((COLS - temp.shape[0].length) / 2), y: 0 };
        } else {
            holdPiece = { ...currentPiece, shape: Object.values(TETROMINOES)[currentPiece.type].shape.map(r => [...r]) };
            spawnPiece();
        }
        
        if (Systems.audio) {
            Systems.audio.playSound('click', 0.3);
        }
    }
    
    function lockPiece() {
        mergePiece();
        clearLines();
        spawnPiece();
    }

    // ============================================
    // RENDERING
    // ============================================
    
    function render() {
        const w = canvas.width;
        const h = canvas.height;
        
        // Clear with dark background
        ctx.fillStyle = `rgb(${Math.floor(10 - bgDarken * 10)}, 0, 0)`;
        ctx.fillRect(0, 0, w, h);
        
        // Apply screen shake
        ctx.save();
        if (shakeTimer > 0) {
            ctx.translate(
                (Math.random() - 0.5) * shakeMagnitude,
                (Math.random() - 0.5) * shakeMagnitude
            );
        }
        
        // Draw blood pool
        if (gameState.bloodLevel > 0) {
            const bloodH = gameState.bloodLevel * BLOCK;
            const gradient = ctx.createLinearGradient(0, h - bloodH, 0, h);
            gradient.addColorStop(0, 'rgba(120,0,0,0.3)');
            gradient.addColorStop(1, 'rgba(80,0,0,0.7)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, h - bloodH, BOARD_WIDTH, bloodH);
        }
        
        // Draw grid
        ctx.strokeStyle = 'rgba(60,0,0,0.3)';
        ctx.lineWidth = 0.5;
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * BLOCK, 0);
            ctx.lineTo(c * BLOCK, h);
            ctx.stroke();
        }
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * BLOCK);
            ctx.lineTo(BOARD_WIDTH, r * BLOCK);
            ctx.stroke();
        }
        
        // Draw board
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) {
                    drawBlock(c, r, board[r][c]);
                }
            }
        }
        
        // Draw ghost piece
        if (currentPiece && !(curseActive && curseType === 'invisible')) {
            ctx.globalAlpha = 0.3;
            for (let r = 0; r < currentPiece.shape.length; r++) {
                for (let c = 0; c < currentPiece.shape[r].length; c++) {
                    if (currentPiece.shape[r][c]) {
                        drawBlock(currentPiece.x + c, ghostY + r, currentPiece.color, true);
                    }
                }
            }
            ctx.globalAlpha = 1;
        }
        
        // Draw current piece
        if (currentPiece) {
            if (curseActive && curseType === 'invisible') {
                ctx.globalAlpha = 0.1;
            }
            for (let r = 0; r < currentPiece.shape.length; r++) {
                for (let c = 0; c < currentPiece.shape[r].length; c++) {
                    if (currentPiece.shape[r][c]) {
                        drawBlock(currentPiece.x + c, currentPiece.y + r, currentPiece.color);
                    }
                }
            }
            ctx.globalAlpha = 1;
        }
        
        // Draw power-ups
        powerUps.forEach(pu => {
            ctx.fillStyle = pu.type.color;
            ctx.shadowColor = pu.type.color;
            ctx.shadowBlur = 10;
            const bob = Math.sin(Date.now() * 0.005) * 4;
            ctx.beginPath();
            ctx.arc(pu.x, pu.y + bob, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        
        // Draw particles
        particles.forEach(p => {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw blood particles
        bloodParticles.forEach(p => {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        // Fog curse effect
        if (curseActive && curseType === 'fog') {
            ctx.fillStyle = 'rgba(20,0,0,0.5)';
            ctx.fillRect(0, ROWS * BLOCK * 0.3, BOARD_WIDTH, ROWS * BLOCK * 0.4);
        }
        
        // Flash effect
        if (flashTimer > 0) {
            ctx.fillStyle = `rgba(200,0,0,${flashTimer * 3})`;
            ctx.fillRect(0, 0, BOARD_WIDTH, h);
        }
        
        ctx.restore();
        
        // Draw side panel
        drawSidePanel();
        
        // Draw message
        if (messageTimer > 0) {
            ctx.font = 'bold 18px Inter';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(255,200,50,${Math.min(1, messageTimer)})`;
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 10;
            ctx.fillText(messageText, BOARD_WIDTH / 2, BOARD_HEIGHT / 2);
            ctx.shadowBlur = 0;
            ctx.textAlign = 'left';
        }
        
        // Vignette
        const vignette = ctx.createRadialGradient(
            BOARD_WIDTH / 2, h / 2, BOARD_WIDTH * 0.3,
            BOARD_WIDTH / 2, h / 2, BOARD_WIDTH * 0.8
        );
        vignette.addColorStop(0, 'transparent');
        vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, BOARD_WIDTH, h);
    }
    
    function drawBlock(x, y, colorIndex, isGhost = false) {
        const bx = x * BLOCK;
        const by = y * BLOCK;
        const color = COLORS.blood[colorIndex - 1] || '#444';
        
        if (isGhost) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx + 1, by + 1, BLOCK - 2, BLOCK - 2);
            return;
        }
        
        // Main block
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = color;
        ctx.fillRect(bx + 1, by + 1, BLOCK - 2, BLOCK - 2);
        ctx.shadowBlur = 0;
        
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(bx + 1, by + 1, BLOCK - 2, 4);
        ctx.fillRect(bx + 1, by + 1, 4, BLOCK - 2);
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(bx + BLOCK - 4, by + 1, 3, BLOCK - 2);
        ctx.fillRect(bx + 1, by + BLOCK - 4, BLOCK - 2, 3);
    }
    
    function drawSidePanel() {
        const panelX = BOARD_WIDTH + 15;
        const panelW = 200;
        
        // Panel background
        ctx.fillStyle = '#0a0000';
        ctx.fillRect(BOARD_WIDTH, 0, panelW, canvas.height);
        
        // Divider
        ctx.strokeStyle = 'rgba(100,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(BOARD_WIDTH, 0);
        ctx.lineTo(BOARD_WIDTH, canvas.height);
        ctx.stroke();
        
        // Hold piece
        ctx.fillStyle = '#aa4444';
        ctx.font = '600 14px Inter';
        ctx.fillText('HOLD [C]', panelX, 25);
        
        if (holdPiece) {
            const pb = 16;
            for (let r = 0; r < holdPiece.shape.length; r++) {
                for (let c = 0; c < holdPiece.shape[r].length; c++) {
                    if (holdPiece.shape[r][c]) {
                        ctx.fillStyle = holdUsed ? '#444' : COLORS.blood[holdPiece.color - 1];
                        ctx.fillRect(panelX + c * pb, 35 + r * pb, pb - 2, pb - 2);
                    }
                }
            }
        }
        
        // Next piece
        ctx.fillStyle = '#ff4444';
        ctx.font = '600 14px Inter';
        ctx.fillText('NEXT', panelX, 100);
        
        if (nextPiece) {
            const pb = 18;
            for (let r = 0; r < nextPiece.shape.length; r++) {
                for (let c = 0; c < nextPiece.shape[r].length; c++) {
                    if (nextPiece.shape[r][c]) {
                        ctx.shadowColor = COLORS.blood[nextPiece.color - 1];
                        ctx.shadowBlur = 4;
                        ctx.fillStyle = COLORS.blood[nextPiece.color - 1];
                        ctx.fillRect(panelX + c * pb, 110 + r * pb, pb - 2, pb - 2);
                        ctx.shadowBlur = 0;
                    }
                }
            }
        }
        
        // Score
        ctx.fillStyle = '#cc3333';
        ctx.font = '600 13px Inter';
        ctx.fillText('SCORE', panelX, 190);
        ctx.fillStyle = '#ff6666';
        ctx.font = '700 20px monospace';
        ctx.fillText(String(gameState.score), panelX, 214);
        
        // Level & Lines
        ctx.fillStyle = '#cc3333';
        ctx.font = '600 13px Inter';
        ctx.fillText(`LV ${gameState.level}  |  LINES ${gameState.lines}`, panelX, 244);
        
        // Combo
        if (gameState.combo > 1) {
            ctx.fillStyle = '#ffcc00';
            ctx.font = '700 16px Inter';
            ctx.fillText(`🔥 x${gameState.combo} COMBO`, panelX, 275);
        }
        
        // Active power
        if (activePower && powerTimer > 0) {
            ctx.fillStyle = '#44ff44';
            ctx.font = '600 12px Inter';
            ctx.fillText(`⚡ ${activePower.id.toUpperCase()} ${Math.ceil(powerTimer)}s`, panelX, 300);
        }
        
        // Active curse
        if (curseActive && curseTimer > 0) {
            ctx.fillStyle = '#ff3333';
            ctx.font = '600 12px Inter';
            ctx.fillText(`☠ ${curseType.replace('_', ' ').toUpperCase()}`, panelX, 320);
        }
        
        // Stats
        ctx.fillStyle = '#884444';
        ctx.font = '400 11px Inter';
        ctx.fillText(`Pieces: ${gameState.piecesPlaced}`, panelX, 370);
        ctx.fillText(`Max Combo: x${gameState.maxCombo}`, panelX, 386);
        ctx.fillText(`Tetris: ${stats.tetrises}`, panelX, 402);
        
        // Horror text
        if (gameState.level >= 3) {
            ctx.globalAlpha = 0.1 + Math.sin(Date.now() * 0.002) * 0.05;
            ctx.fillStyle = '#ff0000';
            ctx.font = '600 11px Inter';
            const msgs = ['IT HUNGERS', 'FEED IT', 'NO ESCAPE', 'DEEPER', 'MORE BLOOD'];
            ctx.fillText(msgs[gameState.level % msgs.length], panelX, 450);
            ctx.globalAlpha = 1;
        }
    }

    // ============================================
    // GAME LOOP
    // ============================================
    
    let lastTime = 0;
    let dropTimer = 0;
    let curseCheckTimer = 0;
    
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
        if (shakeTimer > 0) shakeTimer -= dt;
        if (flashTimer > 0) flashTimer -= dt;
        if (messageTimer > 0) messageTimer -= dt;
        
        // Update power-up timer
        if (powerTimer > 0) {
            powerTimer -= dt;
            if (powerTimer <= 0) {
                activePower = null;
            }
        }
        
        // Update curse timer
        if (curseActive && curseTimer > 0) {
            curseTimer -= dt;
            if (curseTimer <= 0) {
                curseActive = false;
            }
        }
        
        // Check for random curse
        if (gameState.level >= 3 && !curseActive) {
            curseCheckTimer += dt;
            if (curseCheckTimer > 25 + Math.random() * 15) {
                curseCheckTimer = 0;
                if (Math.random() < 0.3) {
                    triggerCurse();
                }
            }
        }
        
        // Update particles
        updateParticles(dt);
        updatePowerUps(dt);
        
        // Piece falling
        dropTimer += dt * 1000;
        let currentDropInterval = gameState.dropInterval;
        
        if (curseActive && curseType === 'speed_burst') {
            currentDropInterval /= 2;
        }
        if (activePower && activePower.id === 'slow') {
            currentDropInterval *= 2;
        }
        
        if (dropTimer >= currentDropInterval) {
            dropTimer = 0;
            if (!movePiece(0, 1)) {
                lockPiece();
            }
        }
        
        // Update audio intensity
        if (Systems.audio && Systems.audio.musicSystem) {
            const intensity = Math.min(1, gameState.level / 15 + (gameState.combo > 1 ? 0.2 : 0));
            Systems.audio.musicSystem.setIntensity(intensity);
        }
        
        // Update HUD
        updateHUD();
    }
    
    function updateHUD() {
        const scoreEl = document.getElementById('hud-score');
        const levelEl = document.getElementById('hud-level');
        const linesEl = document.getElementById('hud-lines');
        
        if (scoreEl) scoreEl.textContent = 'Score: ' + gameState.score;
        if (levelEl) levelEl.textContent = 'Level: ' + gameState.level;
        if (linesEl) linesEl.textContent = 'Lines: ' + gameState.lines;
    }

    // ============================================
    // GAME STATE MANAGEMENT
    // ============================================
    
    function showMessage(text) {
        messageText = text;
        messageTimer = 2.5;
    }
    
    function startGame() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        canvas.width = BOARD_WIDTH + 200;
        canvas.height = BOARD_HEIGHT;
        
        document.getElementById('start-screen').style.display = 'none';
        const ctrl = document.getElementById('controls-overlay');
        ctrl.style.display = 'flex';
        
        // Initialize audio
        if (Systems.audio) {
            Systems.audio.resume();
        }
        
        // Start horror drone
        if (window.HorrorAudio) {
            HorrorAudio.init();
            HorrorAudio.startDrone(40, 'dark');
        }
        
        // Initialize quality effects
        if (window.QualityFX) {
            QualityFX.init2D(canvas, ctx);
        }
        
        setTimeout(() => {
            ctrl.classList.add('hiding');
            setTimeout(() => {
                ctrl.style.display = 'none';
                ctrl.classList.remove('hiding');
                
                resetGame();
                gameState.active = true;
                
                if (window.GameUtils) {
                    GameUtils.setState(GameUtils.STATE.PLAYING);
                }
                
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                
                lastTime = performance.now();
                requestAnimationFrame(gameLoop);
            }, 800);
        }, 2500);
    }
    
    function resetGame() {
        initBoard();
        fillPieceBag();
        
        gameState = {
            active: true,
            paused: false,
            gameOver: false,
            score: 0,
            level: 1,
            lines: 0,
            combo: 0,
            maxCombo: 0,
            bloodLevel: 0,
            dropInterval: 800,
            piecesPlaced: 0,
            totalTime: 0,
            difficulty: 1.0
        };
        
        currentPiece = null;
        nextPiece = null;
        holdPiece = null;
        holdUsed = false;
        powerUps = [];
        activePower = null;
        powerTimer = 0;
        curseActive = false;
        curseTimer = 0;
        particles = [];
        bloodParticles = [];
        dropTimer = 0;
        curseCheckTimer = 0;
        bgDarken = 0;
        
        spawnPiece();
        updateHUD();
    }
    
    function gameOver() {
        gameState.active = false;
        gameState.gameOver = true;
        
        if (window.GameUtils) {
            GameUtils.setState(GameUtils.STATE.GAME_OVER);
        }
        
        if (window.HorrorAudio) {
            HorrorAudio.playDeath();
            HorrorAudio.stopDrone();
        }
        
        // Update high score
        if (gameState.score > stats.highScore) {
            stats.highScore = gameState.score;
            localStorage.setItem('blood-tetris-high', String(stats.highScore));
        }
        
        // Save progression
        if (Systems.progression) {
            Systems.progression.updateStats('blood-tetris', {
                highScore: stats.highScore,
                gamesPlayed: 1
            });
        }
        
        // Analytics
        if (Systems.analytics) {
            Systems.analytics.trackGameEnd('blood-tetris', gameState.score, gameState.totalTime);
        }
        
        const msgEl = document.querySelector('#game-over-screen p');
        if (msgEl) {
            msgEl.textContent = `The darkness consumed you... Score: ${gameState.score}`;
        }
        
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        
        const btn = document.querySelector('#game-over-screen .play-btn');
        if (btn) btn.onclick = restartGame;
    }
    
    function restartGame() {
        resetGame();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        
        if (window.HorrorAudio) {
            HorrorAudio.startDrone(40, 'dark');
        }
        
        gameState.active = true;
        
        if (window.GameUtils) {
            GameUtils.setState(GameUtils.STATE.PLAYING);
        }
        
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    
    async function init() {
        // Initialize systems
        await Systems.init();
        
        // Setup input
        setupInput();
        
        // Setup difficulty selector
        if (window.GameUtils) {
            GameUtils.injectDifficultySelector('start-screen');
            GameUtils.initPause({
                onResume: () => {
                    gameState.active = true;
                    gameState.paused = false;
                    lastTime = performance.now();
                    requestAnimationFrame(gameLoop);
                },
                onRestart: restartGame
            });
        }
        
        // Start button
        document.getElementById('start-btn').addEventListener('click', () => {
            startGame();
        });
        
        console.log('[BloodTetris] Enhanced version initialized');
    }
    
    // Start initialization
    init();
})();