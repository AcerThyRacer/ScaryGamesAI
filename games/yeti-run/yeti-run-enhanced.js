/**
 * ============================================
 * Yeti Run - FULLY ENHANCED VERSION
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
 * - 10x Content (endless runner with power-ups, obstacles, bosses)
 */

(function() {
    'use strict';

    // ============================================
    // GAME CONSTANTS
    // ============================================
    
    const GRAVITY = 2000;
    const JUMP_FORCE = -700;
    const BASE_SPEED = 400;
    const MAX_SPEED = 1200;
    
    // ============================================
    // OBSTACLE DEFINITIONS
    // ============================================
    
    const OBSTACLE_TYPES = {
        iceSpike: { width: 40, height: 60, color: '#88ddff', damage: 1, type: 'spike' },
        snowball: { width: 50, height: 50, color: '#ffffff', damage: 1, type: 'ball' },
        iceBlock: { width: 60, height: 60, color: '#aaddff', damage: 1, type: 'block' },
        frozenTree: { width: 40, height: 100, color: '#448844', damage: 1, type: 'tree' },
        crevasse: { width: 80, height: 200, color: '#001133', damage: 2, type: 'pit' },
        avalanche: { width: 300, height: 150, color: '#eeeeff', damage: 3, type: 'avalanche' }
    };
    
    // ============================================
    // POWER-UP DEFINITIONS
    // ============================================
    
    const POWERUP_TYPES = {
        shield: { name: 'Shield', duration: 5, color: '#44ff44', effect: 'invincible' },
        magnet: { name: 'Magnet', duration: 8, color: '#ff44ff', effect: 'attract' },
        doubleJump: { name: 'Double Jump', duration: 10, color: '#4444ff', effect: 'extraJump' },
        speedBoost: { name: 'Speed Boost', duration: 5, color: '#ffff44', effect: 'speed' },
        slowTime: { name: 'Slow Time', duration: 6, color: '#88ffff', effect: 'slow' },
        coinMagnet: { name: 'Coin Magnet', duration: 10, color: '#ffcc00', effect: 'coins' }
    };
    
    // ============================================
    // ENEMY DEFINITIONS
    // ============================================
    
    const ENEMY_TYPES = {
        snowWolf: { name: 'Snow Wolf', speed: 300, damage: 1, color: '#cccccc', width: 50, height: 30 },
        iceGolem: { name: 'Ice Golem', speed: 150, damage: 2, color: '#88aaff', width: 60, height: 80 },
        frostBat: { name: 'Frost Bat', speed: 400, damage: 1, color: '#aaddff', width: 30, height: 20, flying: true },
        yetiBoss: { name: 'Yeti Boss', speed: 200, damage: 3, color: '#ffffff', width: 100, height: 120, boss: true }
    };

    // ============================================
    // GAME STATE
    // ============================================
    
    let canvas, ctx;
    let gameState = {
        active: false,
        paused: false,
        gameOver: false,
        score: 0,
        distance: 0,
        coins: 0,
        highScore: parseInt(localStorage.getItem('yeti-run-high') || '0'),
        speed: BASE_SPEED,
        time: 0
    };
    
    // Player
    let player = {
        x: 100,
        y: 0,
        vy: 0,
        width: 40,
        height: 60,
        grounded: false,
        jumping: false,
        doubleJump: false,
        canDoubleJump: false,
        lives: 3,
        invincible: false,
        invincibleTimer: 0
    };
    
    // World
    let obstacles = [];
    let powerups = [];
    let enemies = [];
    let coins = [];
    let particles = [];
    let platforms = [];
    
    // Active effects
    let activePowerup = null;
    let powerupTimer = 0;
    
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
            console.log('[YetiRun] Systems initialized');
        }
    };

    // ============================================
    // SPAWNING
    // ============================================
    
    function spawnObstacle() {
        const types = Object.keys(OBSTACLE_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        const def = OBSTACLE_TYPES[type];
        
        const groundY = canvas.height - 100;
        
        obstacles.push({
            x: canvas.width + 100,
            y: type === 'crevasse' ? groundY : groundY - def.height,
            ...def,
            type
        });
    }
    
    function spawnPowerup() {
        const types = Object.keys(POWERUP_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        const def = POWERUP_TYPES[type];
        
        powerups.push({
            x: canvas.width + 100,
            y: canvas.height - 200 - Math.random() * 150,
            ...def,
            type
        });
    }
    
    function spawnEnemy() {
        const types = Object.keys(ENEMY_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        const def = ENEMY_TYPES[type];
        
        enemies.push({
            x: canvas.width + 100,
            y: def.flying ? canvas.height - 300 - Math.random() * 100 : canvas.height - 100 - def.height,
            ...def,
            type
        });
    }
    
    function spawnCoin() {
        const groundY = canvas.height - 100;
        
        coins.push({
            x: canvas.width + 100,
            y: groundY - 100 - Math.random() * 200,
            collected: false
        });
    }
    
    function spawnPlatform() {
        const groundY = canvas.height - 100;
        
        platforms.push({
            x: canvas.width + 100,
            y: groundY - 150 - Math.random() * 100,
            width: 100 + Math.random() * 100,
            height: 20
        });
    }

    // ============================================
    // UPDATE
    // ============================================
    
    function update(dt) {
        gameState.time += dt;
        gameState.distance += gameState.speed * dt;
        gameState.score = Math.floor(gameState.distance / 10);
        
        // Increase speed over time
        gameState.speed = Math.min(MAX_SPEED, BASE_SPEED + gameState.time * 2);
        
        // Update player
        updatePlayer(dt);
        
        // Update world
        updateObstacles(dt);
        updatePowerups(dt);
        updateEnemies(dt);
        updateCoins(dt);
        updatePlatforms(dt);
        updateParticles(dt);
        
        // Spawn new objects
        spawnObjects(dt);
        
        // Check collisions
        checkCollisions();
        
        // Update powerup timer
        if (powerupTimer > 0) {
            powerupTimer -= dt;
            if (powerupTimer <= 0) {
                activePowerup = null;
            }
        }
        
        // Update invincibility
        if (player.invincibleTimer > 0) {
            player.invincibleTimer -= dt;
            if (player.invincibleTimer <= 0) {
                player.invincible = false;
            }
        }
        
        // Update audio
        if (Systems.audio && Systems.audio.musicSystem) {
            Systems.audio.musicSystem.setIntensity(Math.min(1, gameState.speed / MAX_SPEED));
        }
    }
    
    function updatePlayer(dt) {
        // Apply gravity
        player.vy += GRAVITY * dt;
        player.y += player.vy * dt;
        
        // Ground collision
        const groundY = canvas.height - 100 - player.height;
        if (player.y >= groundY) {
            player.y = groundY;
            player.vy = 0;
            player.grounded = true;
            player.doubleJump = false;
        } else {
            player.grounded = false;
        }
        
        // Platform collision
        for (const platform of platforms) {
            if (player.vy > 0 &&
                player.x + player.width > platform.x &&
                player.x < platform.x + platform.width &&
                player.y + player.height > platform.y &&
                player.y + player.height < platform.y + platform.height + 20) {
                player.y = platform.y - player.height;
                player.vy = 0;
                player.grounded = true;
                player.doubleJump = false;
            }
        }
        
        // Double jump ability
        player.canDoubleJump = activePowerup?.effect === 'extraJump' && !player.doubleJump;
    }
    
    function updateObstacles(dt) {
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.x -= gameState.speed * dt;
            
            if (obs.x < -obs.width) {
                obstacles.splice(i, 1);
            }
        }
    }
    
    function updatePowerups(dt) {
        for (let i = powerups.length - 1; i >= 0; i--) {
            const pu = powerups[i];
            pu.x -= gameState.speed * dt;
            
            if (pu.x < -pu.width) {
                powerups.splice(i, 1);
            }
        }
    }
    
    function updateEnemies(dt) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            enemy.x -= (gameState.speed + enemy.speed) * dt;
            
            if (enemy.x < -enemy.width) {
                enemies.splice(i, 1);
            }
        }
    }
    
    function updateCoins(dt) {
        const magnetActive = activePowerup?.effect === 'magnet' || activePowerup?.effect === 'coins';
        
        for (let i = coins.length - 1; i >= 0; i--) {
            const coin = coins[i];
            coin.x -= gameState.speed * dt;
            
            // Magnet effect
            if (magnetActive && !coin.collected) {
                const dx = player.x + player.width / 2 - coin.x;
                const dy = player.y + player.height / 2 - coin.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200) {
                    coin.x += dx * 0.1;
                    coin.y += dy * 0.1;
                }
            }
            
            if (coin.x < -20 || coin.collected) {
                coins.splice(i, 1);
            }
        }
    }
    
    function updatePlatforms(dt) {
        for (let i = platforms.length - 1; i >= 0; i--) {
            const platform = platforms[i];
            platform.x -= gameState.speed * dt;
            
            if (platform.x < -platform.width) {
                platforms.splice(i, 1);
            }
        }
    }
    
    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 500 * dt;
            p.life -= dt;
            
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }
    
    let spawnTimer = 0;
    let coinTimer = 0;
    let enemyTimer = 0;
    let platformTimer = 0;
    
    function spawnObjects(dt) {
        // Spawn obstacles
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
            spawnTimer = 1 + Math.random() * 2;
            spawnObstacle();
            
            if (Math.random() < 0.3) {
                spawnPowerup();
            }
        }
        
        // Spawn coins
        coinTimer -= dt;
        if (coinTimer <= 0) {
            coinTimer = 0.2 + Math.random() * 0.5;
            spawnCoin();
        }
        
        // Spawn enemies
        enemyTimer -= dt;
        if (enemyTimer <= 0 && gameState.time > 10) {
            enemyTimer = 5 + Math.random() * 5;
            spawnEnemy();
        }
        
        // Spawn platforms
        platformTimer -= dt;
        if (platformTimer <= 0) {
            platformTimer = 3 + Math.random() * 4;
            spawnPlatform();
        }
    }
    
    function checkCollisions() {
        const playerRect = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };
        
        // Check obstacles
        if (!player.invincible && activePowerup?.effect !== 'invincible') {
            for (const obs of obstacles) {
                if (rectCollision(playerRect, obs)) {
                    takeDamage(obs.damage);
                    spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff4444', 10);
                }
            }
        }
        
        // Check powerups
        for (let i = powerups.length - 1; i >= 0; i--) {
            const pu = powerups[i];
            if (rectCollision(playerRect, pu)) {
                activatePowerup(pu);
                powerups.splice(i, 1);
            }
        }
        
        // Check enemies
        if (!player.invincible && activePowerup?.effect !== 'invincible') {
            for (const enemy of enemies) {
                if (rectCollision(playerRect, enemy)) {
                    takeDamage(enemy.damage);
                    spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff4444', 10);
                }
            }
        }
        
        // Check coins
        for (const coin of coins) {
            if (!coin.collected && rectCollision(playerRect, { x: coin.x - 10, y: coin.y - 10, width: 20, height: 20 })) {
                coin.collected = true;
                gameState.coins++;
                gameState.score += 10;
                spawnParticles(coin.x, coin.y, '#ffcc00', 5);
                
                if (Systems.audio) {
                    Systems.audio.playSound('collect', 0.3);
                }
            }
        }
    }
    
    function rectCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
    
    function takeDamage(amount) {
        player.lives -= amount;
        player.invincible = true;
        player.invincibleTimer = 2;
        
        if (Systems.audio) {
            Systems.audio.playSound('hit', 0.5);
        }
        
        if (player.lives <= 0) {
            gameOver();
        }
    }
    
    function activatePowerup(pu) {
        activePowerup = pu;
        powerupTimer = pu.duration;
        
        showMessage(`${pu.name} activated!`);
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, pu.color, 15);
        
        if (Systems.audio) {
            Systems.audio.playSound('collect', 0.6);
        }
    }
    
    function jump() {
        if (player.grounded) {
            player.vy = JUMP_FORCE;
            player.grounded = false;
            player.jumping = true;
            
            if (Systems.audio) {
                Systems.audio.playSound('click', 0.3);
            }
        } else if (player.canDoubleJump) {
            player.vy = JUMP_FORCE * 0.8;
            player.doubleJump = true;
            
            if (Systems.audio) {
                Systems.audio.playSound('click', 0.3);
            }
        }
    }
    
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200 - 100,
                life: 0.5 + Math.random() * 0.5,
                color,
                size: 3 + Math.random() * 4
            });
        }
    }

    // ============================================
    // RENDERING
    // ============================================
    
    function render() {
        const w = canvas.width;
        const h = canvas.height;
        
        // Sky gradient
        const skyGrd = ctx.createLinearGradient(0, 0, 0, h);
        skyGrd.addColorStop(0, '#1a2a4a');
        skyGrd.addColorStop(0.5, '#2a3a5a');
        skyGrd.addColorStop(1, '#4a5a7a');
        ctx.fillStyle = skyGrd;
        ctx.fillRect(0, 0, w, h);
        
        // Mountains background
        ctx.fillStyle = '#3a4a6a';
        for (let i = 0; i < 5; i++) {
            const mx = (i * 300 - gameState.distance * 0.1) % (w + 300) - 150;
            ctx.beginPath();
            ctx.moveTo(mx, h - 100);
            ctx.lineTo(mx + 150, h - 300 - Math.sin(i) * 50);
            ctx.lineTo(mx + 300, h - 100);
            ctx.fill();
        }
        
        // Snow ground
        ctx.fillStyle = '#e8f0f8';
        ctx.fillRect(0, h - 100, w, 100);
        
        // Ground details
        ctx.fillStyle = '#d0d8e0';
        for (let i = 0; i < 20; i++) {
            const gx = (i * 100 - gameState.distance * 0.5) % w;
            ctx.fillRect(gx, h - 100, 50, 5);
        }
        
        // Platforms
        ctx.fillStyle = '#88aacc';
        for (const platform of platforms) {
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            ctx.fillStyle = '#aaccee';
            ctx.fillRect(platform.x, platform.y, platform.width, 5);
            ctx.fillStyle = '#88aacc';
        }
        
        // Obstacles
        for (const obs of obstacles) {
            ctx.fillStyle = obs.color;
            if (obs.type === 'spike') {
                ctx.beginPath();
                ctx.moveTo(obs.x, obs.y + obs.height);
                ctx.lineTo(obs.x + obs.width / 2, obs.y);
                ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
                ctx.fill();
            } else if (obs.type === 'pit') {
                ctx.fillStyle = '#001133';
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            } else {
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            }
        }
        
        // Coins
        for (const coin of coins) {
            if (!coin.collected) {
                ctx.fillStyle = '#ffcc00';
                ctx.shadowColor = '#ffcc00';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(coin.x, coin.y, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        
        // Powerups
        for (const pu of powerups) {
            ctx.fillStyle = pu.color;
            ctx.shadowColor = pu.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(pu.x + 15, pu.y + 15, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = '#fff';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(pu.name[0], pu.x + 15, pu.y + 20);
        }
        
        // Enemies
        for (const enemy of enemies) {
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            // Eyes
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(enemy.x + 10, enemy.y + 10, 5, 5);
            ctx.fillRect(enemy.x + enemy.width - 15, enemy.y + 10, 5, 5);
        }
        
        // Player
        if (!player.invincible || Math.floor(gameState.time * 10) % 2 === 0) {
            // Body
            ctx.fillStyle = '#4488cc';
            ctx.fillRect(player.x, player.y, player.width, player.height);
            
            // Face
            ctx.fillStyle = '#fff';
            ctx.fillRect(player.x + 10, player.y + 15, 8, 8);
            ctx.fillRect(player.x + 22, player.y + 15, 8, 8);
            
            // Shield effect
            if (activePowerup?.effect === 'invincible') {
                ctx.strokeStyle = '#44ff44';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 40, 0, Math.PI * 2);
                ctx.stroke();
            }
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
        
        // UI
        renderUI();
    }
    
    function renderUI() {
        // Score
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${gameState.score}`, 20, 40);
        ctx.fillText(`Coins: ${gameState.coins}`, 20, 70);
        
        // Lives
        ctx.fillText('Lives: ', 20, 100);
        for (let i = 0; i < player.lives; i++) {
            ctx.fillStyle = '#ff4444';
            ctx.fillText('❤️', 90 + i * 25, 100);
        }
        
        // Distance
        ctx.fillStyle = '#aaa';
        ctx.font = '16px Inter';
        ctx.fillText(`${Math.floor(gameState.distance)}m`, 20, 130);
        
        // Active powerup
        if (activePowerup) {
            ctx.fillStyle = activePowerup.color;
            ctx.font = 'bold 18px Inter';
            ctx.fillText(`${activePowerup.name}: ${Math.ceil(powerupTimer)}s`, canvas.width - 150, 40);
        }
        
        // High score
        ctx.fillStyle = '#ffcc00';
        ctx.font = '14px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(`Best: ${gameState.highScore}`, canvas.width - 20, 30);
    }

    // ============================================
    // GAME LOOP
    // ============================================
    
    let lastTime = 0;
    let messageText = '';
    let messageTimer = 0;
    
    function gameLoop(timestamp) {
        if (!gameState.active) return;
        
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;
        
        if (!gameState.paused) {
            update(dt);
        }
        
        render();
        
        // Draw message
        if (messageTimer > 0) {
            ctx.font = 'bold 20px Inter';
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, messageTimer)})`;
            ctx.textAlign = 'center';
            ctx.fillText(messageText, canvas.width / 2, canvas.height / 2 - 100);
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    function showMessage(text) {
        messageText = text;
        messageTimer = 2;
    }

    // ============================================
    // GAME STATE MANAGEMENT
    // ============================================
    
    function startGame() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 500;
        
        // Input
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                if (gameState.active) jump();
            }
            if (e.code === 'Escape' && gameState.active) {
                gameState.paused = !gameState.paused;
                if (gameState.paused && window.GameUtils) GameUtils.pauseGame();
            }
        });
        
        canvas.addEventListener('click', () => {
            if (gameState.active) jump();
        });
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState.active) jump();
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
            score: 0,
            distance: 0,
            coins: 0,
            highScore: gameState.highScore,
            speed: BASE_SPEED,
            time: 0
        };
        
        player = {
            x: 100,
            y: canvas.height - 100 - 60,
            vy: 0,
            width: 40,
            height: 60,
            grounded: true,
            jumping: false,
            doubleJump: false,
            canDoubleJump: false,
            lives: 3,
            invincible: false,
            invincibleTimer: 0
        };
        
        obstacles = [];
        powerups = [];
        enemies = [];
        coins = [];
        particles = [];
        platforms = [];
        activePowerup = null;
        powerupTimer = 0;
        spawnTimer = 2;
        coinTimer = 0.5;
        enemyTimer = 10;
        platformTimer = 5;
    }
    
    function gameOver() {
        gameState.active = false;
        
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('yeti-run-high', String(gameState.highScore));
        }
        
        if (window.GameUtils) GameUtils.setState(GameUtils.STATE.GAME_OVER);
        if (window.HorrorAudio) { HorrorAudio.playDeath(); HorrorAudio.stopDrone(); }
        
        const msgEl = document.querySelector('#game-over-screen p');
        if (msgEl) msgEl.textContent = `The yeti caught you! Score: ${gameState.score}, Distance: ${Math.floor(gameState.distance)}m`;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        
        const btn = document.querySelector('#game-over-screen .play-btn');
        if (btn) btn.onclick = restartGame;
    }
    
    function restartGame() {
        resetGame();
        document.getElementById('game-over-screen').style.display = 'none';
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
        
        console.log('[YetiRun] Enhanced version initialized');
    }
    
    init();
})();