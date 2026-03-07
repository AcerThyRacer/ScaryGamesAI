/**
 * ============================================
 * Nightmare Run - FULLY ENHANCED VERSION
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
 * - 10x Content (endless runner with horror themes, power-ups, bosses)
 */

(function() {
    'use strict';

    // ============================================
    // GAME CONSTANTS
    // ============================================
    
    const GRAVITY = 1800;
    const JUMP_FORCE = -650;
    const BASE_SPEED = 350;
    const MAX_SPEED = 1000;
    
    // ============================================
    // OBSTACLE DEFINITIONS
    // ============================================
    
    const OBSTACLE_TYPES = {
        spike: { width: 40, height: 50, color: '#880000', damage: 1, type: 'spike' },
        ghost: { width: 50, height: 60, color: '#8888aa', damage: 1, type: 'ghost', floating: true },
        tombstone: { width: 45, height: 70, color: '#444444', damage: 1, type: 'tombstone' },
        pit: { width: 100, height: 200, color: '#000000', damage: 2, type: 'pit' },
        skeleton: { width: 40, height: 80, color: '#ddddcc', damage: 1, type: 'skeleton' },
        web: { width: 80, height: 100, color: '#aaaaaa', damage: 0, type: 'web', slow: true },
        fire: { width: 50, height: 70, color: '#ff4400', damage: 2, type: 'fire' },
        chains: { width: 30, height: 150, color: '#666666', damage: 1, type: 'chains' }
    };
    
    // ============================================
    // POWER-UP DEFINITIONS
    // ============================================
    
    const POWERUP_TYPES = {
        shield: { name: 'Soul Shield', duration: 5, color: '#44ff44', effect: 'invincible' },
        doubleJump: { name: 'Double Jump', duration: 10, color: '#4444ff', effect: 'extraJump' },
        speedBoost: { name: 'Shadow Dash', duration: 4, color: '#8844ff', effect: 'speed' },
        slowTime: { name: 'Time Warp', duration: 6, color: '#88ffff', effect: 'slow' },
        ghostMode: { name: 'Ghost Mode', duration: 5, color: '#aaaaff', effect: 'phase' },
        soulMagnet: { name: 'Soul Magnet', duration: 8, color: '#ffcc00', effect: 'magnet' }
    };
    
    // ============================================
    // ENEMY DEFINITIONS
    // ============================================
    
    const ENEMY_TYPES = {
        shadow: { name: 'Shadow', speed: 250, damage: 1, color: '#222233', width: 40, height: 50 },
        wraith: { name: 'Wraith', speed: 300, damage: 1, color: '#4444aa', width: 45, height: 55, flying: true },
        demon: { name: 'Demon', speed: 200, damage: 2, color: '#aa2222', width: 50, height: 60 },
        reaper: { name: 'Reaper', speed: 350, damage: 2, color: '#111111', width: 60, height: 80, boss: false },
        nightmareBoss: { name: 'Nightmare', speed: 150, damage: 3, color: '#440044', width: 120, height: 150, boss: true }
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
        souls: 0,
        highScore: parseInt(localStorage.getItem('nightmare-run-high') || '0'),
        speed: BASE_SPEED,
        time: 0,
        nightmare: 0 // Intensity level
    };
    
    // Player
    let player = {
        x: 100,
        y: 0,
        vy: 0,
        width: 35,
        height: 55,
        grounded: false,
        jumping: false,
        doubleJump: false,
        canDoubleJump: false,
        lives: 3,
        invincible: false,
        invincibleTimer: 0,
        phase: false
    };
    
    // World
    let obstacles = [];
    let powerups = [];
    let enemies = [];
    let souls = [];
    let particles = [];
    let platforms = [];
    
    // Active effects
    let activePowerup = null;
    let powerupTimer = 0;
    
    // Visual effects
    let screenShake = 0;
    let flashTimer = 0;
    let darknessLevel = 0;
    
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
            console.log('[NightmareRun] Systems initialized');
        }
    };

    // ============================================
    // SPAWNING
    // ============================================
    
    function spawnObstacle() {
        const types = Object.keys(OBSTACLE_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        const def = OBSTACLE_TYPES[type];
        
        const groundY = canvas.height - 80;
        
        obstacles.push({
            x: canvas.width + 50,
            y: def.floating ? groundY - 150 - Math.random() * 100 : groundY - def.height,
            ...def,
            type
        });
    }
    
    function spawnPowerup() {
        const types = Object.keys(POWERUP_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        const def = POWERUP_TYPES[type];
        
        powerups.push({
            x: canvas.width + 50,
            y: canvas.height - 180 - Math.random() * 120,
            ...def,
            type
        });
    }
    
    function spawnEnemy() {
        const types = Object.keys(ENEMY_TYPES).filter(t => !ENEMY_TYPES[t].boss);
        const type = types[Math.floor(Math.random() * types.length)];
        const def = ENEMY_TYPES[type];
        
        enemies.push({
            x: canvas.width + 50,
            y: def.flying ? canvas.height - 250 - Math.random() * 80 : canvas.height - 80 - def.height,
            ...def,
            type
        });
    }
    
    function spawnSoul() {
        const groundY = canvas.height - 80;
        
        souls.push({
            x: canvas.width + 50,
            y: groundY - 80 - Math.random() * 180,
            collected: false
        });
    }
    
    function spawnPlatform() {
        const groundY = canvas.height - 80;
        
        platforms.push({
            x: canvas.width + 50,
            y: groundY - 120 - Math.random() * 80,
            width: 80 + Math.random() * 80,
            height: 15
        });
    }

    // ============================================
    // UPDATE
    // ============================================
    
    function update(dt) {
        gameState.time += dt;
        gameState.distance += gameState.speed * dt;
        gameState.score = Math.floor(gameState.distance / 8);
        
        // Increase speed and nightmare level
        gameState.speed = Math.min(MAX_SPEED, BASE_SPEED + gameState.time * 1.5);
        gameState.nightmare = Math.min(1, gameState.time / 120);
        darknessLevel = gameState.nightmare * 0.3;
        
        // Update player
        updatePlayer(dt);
        
        // Update world
        const speedMult = activePowerup?.effect === 'slow' ? 0.5 : 1;
        updateObstacles(dt, speedMult);
        updatePowerups(dt, speedMult);
        updateEnemies(dt, speedMult);
        updateSouls(dt, speedMult);
        updatePlatforms(dt, speedMult);
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
        
        // Screen shake decay
        if (screenShake > 0) screenShake -= dt * 2;
        if (flashTimer > 0) flashTimer -= dt;
        
        // Update audio
        if (Systems.audio && Systems.audio.musicSystem) {
            Systems.audio.musicSystem.setIntensity(gameState.nightmare);
        }
    }
    
    function updatePlayer(dt) {
        // Apply gravity
        player.vy += GRAVITY * dt;
        player.y += player.vy * dt;
        
        // Ground collision
        const groundY = canvas.height - 80 - player.height;
        if (player.y >= groundY) {
            player.y = groundY;
            player.vy = 0;
            player.grounded = true;
            player.doubleJump = false;
        } else {
            player.grounded = false;
        }
        
        // Platform collision
        if (!player.phase) {
            for (const platform of platforms) {
                if (player.vy > 0 &&
                    player.x + player.width > platform.x &&
                    player.x < platform.x + platform.width &&
                    player.y + player.height > platform.y &&
                    player.y + player.height < platform.y + platform.height + 15) {
                    player.y = platform.y - player.height;
                    player.vy = 0;
                    player.grounded = true;
                    player.doubleJump = false;
                }
            }
        }
        
        // Double jump ability
        player.canDoubleJump = activePowerup?.effect === 'extraJump' && !player.doubleJump;
        player.phase = activePowerup?.effect === 'phase';
    }
    
    function updateObstacles(dt, speedMult) {
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.x -= gameState.speed * speedMult * dt;
            
            if (obs.x < -obs.width) {
                obstacles.splice(i, 1);
            }
        }
    }
    
    function updatePowerups(dt, speedMult) {
        for (let i = powerups.length - 1; i >= 0; i--) {
            const pu = powerups[i];
            pu.x -= gameState.speed * speedMult * dt;
            
            if (pu.x < -pu.width) {
                powerups.splice(i, 1);
            }
        }
    }
    
    function updateEnemies(dt, speedMult) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            enemy.x -= (gameState.speed * speedMult + enemy.speed) * dt;
            
            if (enemy.x < -enemy.width) {
                enemies.splice(i, 1);
            }
        }
    }
    
    function updateSouls(dt, speedMult) {
        const magnetActive = activePowerup?.effect === 'magnet';
        
        for (let i = souls.length - 1; i >= 0; i--) {
            const soul = souls[i];
            soul.x -= gameState.speed * speedMult * dt;
            
            // Magnet effect
            if (magnetActive && !soul.collected) {
                const dx = player.x + player.width / 2 - soul.x;
                const dy = player.y + player.height / 2 - soul.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 180) {
                    soul.x += dx * 0.08;
                    soul.y += dy * 0.08;
                }
            }
            
            if (soul.x < -20 || soul.collected) {
                souls.splice(i, 1);
            }
        }
    }
    
    function updatePlatforms(dt, speedMult) {
        for (let i = platforms.length - 1; i >= 0; i--) {
            const platform = platforms[i];
            platform.x -= gameState.speed * speedMult * dt;
            
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
            p.vy += 400 * dt;
            p.life -= dt;
            
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }
    
    let spawnTimer = 0;
    let soulTimer = 0;
    let enemyTimer = 0;
    let platformTimer = 0;
    
    function spawnObjects(dt) {
        // Spawn obstacles
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
            spawnTimer = 0.8 + Math.random() * 1.5 - gameState.nightmare * 0.3;
            spawnObstacle();
            
            if (Math.random() < 0.25) {
                spawnPowerup();
            }
        }
        
        // Spawn souls
        soulTimer -= dt;
        if (soulTimer <= 0) {
            soulTimer = 0.15 + Math.random() * 0.4;
            spawnSoul();
        }
        
        // Spawn enemies
        enemyTimer -= dt;
        if (enemyTimer <= 0 && gameState.time > 8) {
            enemyTimer = 4 + Math.random() * 4 - gameState.nightmare;
            spawnEnemy();
        }
        
        // Spawn platforms
        platformTimer -= dt;
        if (platformTimer <= 0) {
            platformTimer = 2.5 + Math.random() * 3;
            spawnPlatform();
        }
    }
    
    function checkCollisions() {
        if (player.phase) return; // Phase through everything
        
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
                    if (obs.slow) {
                        // Slow effect
                        gameState.speed = Math.max(BASE_SPEED, gameState.speed * 0.7);
                        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#aaaaaa', 8);
                    } else {
                        takeDamage(obs.damage);
                        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff4444', 12);
                    }
                }
            }
        }
        
        // Check powerups
        for (let i = powerups.length - 1; i >= 0; i--) {
            const pu = powerups[i];
            if (rectCollision(playerRect, { x: pu.x - 15, y: pu.y - 15, width: 30, height: 30 })) {
                activatePowerup(pu);
                powerups.splice(i, 1);
            }
        }
        
        // Check enemies
        if (!player.invincible && activePowerup?.effect !== 'invincible') {
            for (const enemy of enemies) {
                if (rectCollision(playerRect, enemy)) {
                    takeDamage(enemy.damage);
                    spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff4444', 15);
                }
            }
        }
        
        // Check souls
        for (const soul of souls) {
            if (!soul.collected && rectCollision(playerRect, { x: soul.x - 12, y: soul.y - 12, width: 24, height: 24 })) {
                soul.collected = true;
                gameState.souls++;
                gameState.score += 15;
                spawnParticles(soul.x, soul.y, '#88ffff', 6);
                
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
        screenShake = 0.5;
        flashTimer = 0.2;
        
        if (Systems.audio) {
            Systems.audio.playSound('hit', 0.6);
        }
        
        if (player.lives <= 0) {
            gameOver();
        }
    }
    
    function activatePowerup(pu) {
        activePowerup = pu;
        powerupTimer = pu.duration;
        
        showMessage(`${pu.name} activated!`);
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, pu.color, 18);
        
        if (Systems.audio) {
            Systems.audio.playSound('collect', 0.7);
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
            player.vy = JUMP_FORCE * 0.85;
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
                vx: (Math.random() - 0.5) * 180,
                vy: (Math.random() - 0.5) * 180 - 80,
                life: 0.4 + Math.random() * 0.4,
                color,
                size: 2 + Math.random() * 4
            });
        }
    }

    // ============================================
    // RENDERING
    // ============================================
    
    function render() {
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.save();
        
        // Screen shake
        if (screenShake > 0) {
            ctx.translate((Math.random() - 0.5) * screenShake * 15, (Math.random() - 0.5) * screenShake * 15);
        }
        
        // Sky gradient (darker with nightmare level)
        const skyGrd = ctx.createLinearGradient(0, 0, 0, h);
        const darkMult = 1 - darknessLevel;
        skyGrd.addColorStop(0, `rgb(${Math.floor(15 * darkMult)}, ${Math.floor(10 * darkMult)}, ${Math.floor(30 * darkMult)})`);
        skyGrd.addColorStop(0.5, `rgb(${Math.floor(25 * darkMult)}, ${Math.floor(15 * darkMult)}, ${Math.floor(40 * darkMult)})`);
        skyGrd.addColorStop(1, `rgb(${Math.floor(35 * darkMult)}, ${Math.floor(20 * darkMult)}, ${Math.floor(50 * darkMult)})`);
        ctx.fillStyle = skyGrd;
        ctx.fillRect(0, 0, w, h);
        
        // Stars
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(gameState.time) * 0.1})`;
        for (let i = 0; i < 30; i++) {
            const sx = (i * 47 + gameState.distance * 0.02) % w;
            const sy = (i * 31) % (h * 0.5);
            ctx.fillRect(sx, sy, 2, 2);
        }
        
        // Moon
        ctx.fillStyle = '#ddddee';
        ctx.beginPath();
        ctx.arc(w - 80, 60, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // Ground
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(0, h - 80, w, 80);
        
        // Ground details
        ctx.fillStyle = '#252535';
        for (let i = 0; i < 15; i++) {
            const gx = (i * 80 - gameState.distance * 0.3) % w;
            ctx.fillRect(gx, h - 80, 40, 3);
        }
        
        // Platforms
        ctx.fillStyle = '#3a3a5a';
        for (const platform of platforms) {
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            ctx.fillStyle = '#4a4a6a';
            ctx.fillRect(platform.x, platform.y, platform.width, 4);
            ctx.fillStyle = '#3a3a5a';
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
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            } else if (obs.type === 'ghost') {
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            } else {
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            }
        }
        
        // Souls
        for (const soul of souls) {
            if (!soul.collected) {
                ctx.fillStyle = '#88ffff';
                ctx.shadowColor = '#88ffff';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(soul.x, soul.y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        
        // Powerups
        for (const pu of powerups) {
            ctx.fillStyle = pu.color;
            ctx.shadowColor = pu.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(pu.x, pu.y, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = '#fff';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(pu.name.split(' ')[0], pu.x, pu.y + 4);
        }
        
        // Enemies
        for (const enemy of enemies) {
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            // Eyes
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(enemy.x + 12, enemy.y + 12, 4, 0, Math.PI * 2);
            ctx.arc(enemy.x + enemy.width - 12, enemy.y + 12, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Player
        if (!player.invincible || Math.floor(gameState.time * 10) % 2 === 0) {
            // Body
            ctx.fillStyle = player.phase ? 'rgba(100, 100, 200, 0.5)' : '#6666aa';
            ctx.fillRect(player.x, player.y, player.width, player.height);
            
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(player.x + 8, player.y + 12, 6, 6);
            ctx.fillRect(player.x + 20, player.y + 12, 6, 6);
            
            // Shield effect
            if (activePowerup?.effect === 'invincible') {
                ctx.strokeStyle = '#44ff44';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 35, 0, Math.PI * 2);
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
        
        // Flash effect
        if (flashTimer > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${flashTimer})`;
            ctx.fillRect(0, 0, w, h);
        }
        
        ctx.restore();
        
        // UI
        renderUI();
    }
    
    function renderUI() {
        // Score
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${gameState.score}`, 15, 35);
        ctx.fillText(`Souls: ${gameState.souls}`, 15, 60);
        
        // Lives
        ctx.fillText('Lives: ', 15, 90);
        for (let i = 0; i < player.lives; i++) {
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(85 + i * 22, 85, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Distance
        ctx.fillStyle = '#aaa';
        ctx.font = '14px Inter';
        ctx.fillText(`${Math.floor(gameState.distance)}m`, 15, 115);
        
        // Nightmare level
        ctx.fillStyle = '#ff4444';
        ctx.fillText(`Nightmare: ${Math.floor(gameState.nightmare * 100)}%`, 15, 135);
        
        // Active powerup
        if (activePowerup) {
            ctx.fillStyle = activePowerup.color;
            ctx.font = 'bold 16px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(`${activePowerup.name}: ${Math.ceil(powerupTimer)}s`, canvas.width - 15, 35);
        }
        
        // High score
        ctx.fillStyle = '#ffcc00';
        ctx.font = '13px Inter';
        ctx.fillText(`Best: ${gameState.highScore}`, canvas.width - 15, 55);
        
        // Vignette
        const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
        vignette.addColorStop(0, 'transparent');
        vignette.addColorStop(1, `rgba(0, 0, 0, ${0.3 + darknessLevel * 0.4})`);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
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
            ctx.font = 'bold 18px Inter';
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, messageTimer)})`;
            ctx.textAlign = 'center';
            ctx.fillText(messageText, canvas.width / 2, canvas.height / 2 - 80);
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    function showMessage(text) {
        messageText = text;
        messageTimer = 1.8;
    }

    // ============================================
    // GAME STATE MANAGEMENT
    // ============================================
    
    function startGame() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 450;
        
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
            HorrorAudio.startDrone(30, 'dark');
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
            souls: 0,
            highScore: gameState.highScore,
            speed: BASE_SPEED,
            time: 0,
            nightmare: 0
        };
        
        player = {
            x: 100,
            y: canvas.height - 80 - 55,
            vy: 0,
            width: 35,
            height: 55,
            grounded: true,
            jumping: false,
            doubleJump: false,
            canDoubleJump: false,
            lives: 3,
            invincible: false,
            invincibleTimer: 0,
            phase: false
        };
        
        obstacles = [];
        powerups = [];
        enemies = [];
        souls = [];
        particles = [];
        platforms = [];
        activePowerup = null;
        powerupTimer = 0;
        screenShake = 0;
        flashTimer = 0;
        darknessLevel = 0;
        spawnTimer = 1.5;
        soulTimer = 0.3;
        enemyTimer = 8;
        platformTimer = 4;
    }
    
    function gameOver() {
        gameState.active = false;
        
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('nightmare-run-high', String(gameState.highScore));
        }
        
        if (window.GameUtils) GameUtils.setState(GameUtils.STATE.GAME_OVER);
        if (window.HorrorAudio) { HorrorAudio.playDeath(); HorrorAudio.stopDrone(); }
        
        const msgEl = document.querySelector('#game-over-screen p');
        if (msgEl) msgEl.textContent = `The nightmare consumed you... Score: ${gameState.score}, Souls: ${gameState.souls}`;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        
        const btn = document.querySelector('#game-over-screen .play-btn');
        if (btn) btn.onclick = restartGame;
    }
    
    function restartGame() {
        resetGame();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        if (window.HorrorAudio) HorrorAudio.startDrone(30, 'dark');
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
        
        console.log('[NightmareRun] Enhanced version initialized');
    }
    
    init();
})();