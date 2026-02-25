/* ============================================================
   HELLAPHOBIA - BOSS FIGHT INTEGRATION
   Complete Boss System | Arena Management | Phase Transitions
   Health Bars | Attack Patterns | Victory Conditions
   Integrated with Audio & Effects
   ============================================================ */

(function() {
    'use strict';

    // ===== BOSS FIGHT MANAGER =====
    const BossFightManager = {
        // State
        activeBoss: null,
        bossEntity: null,
        arena: null,
        phase: 1,
        state: 'inactive', // inactive, spawning, intro, combat, transition, defeated, victory

        // Timers
        enrageTimer: 0,
        phaseTimer: 0,
        attackTimer: 0,
        transitionTimer: 0,

        // References
        player: null,
        monsters: null,
        tiles: null,

        // Boss definitions
        bosses: {
            warden: {
                id: 'warden',
                name: 'The Warden',
                title: 'Keeper of the Dungeon',
                phase: 5,
                hp: 500,
                width: 80,
                height: 100,
                color: '#440000',
                eyeColor: '#ff0000',
                speed: 60,
                damage: 25,
                arenaWidth: 400,
                arenaHeight: 300,
                phases: 3,
                patterns: ['charge', 'swipe', 'groundSlam', 'summonGuards'],
                dialogue: {
                    intro: ['You dare challenge me?', 'The dungeon obeys ME!', 'Another soul for my collection...'],
                    phase2: ['You think you can win?', 'I am the law here!', 'Guards!'],
                    phase3: ['ENOUGH!', 'I will crush you myself!', 'DIE!'],
                    defeat: ['Impossible...', 'The dungeon... will... remember...']
                }
            },
            collector: {
                id: 'collector',
                name: 'The Collector',
                title: 'Keeper of Souls',
                phase: 10,
                hp: 800,
                width: 100,
                height: 120,
                color: '#220044',
                eyeColor: '#aa00ff',
                speed: 50,
                damage: 30,
                arenaWidth: 500,
                arenaHeight: 400,
                phases: 4,
                patterns: ['teleport', 'soulGrab', 'memorySteal', 'dimensionRift'],
                dialogue: {
                    intro: ['Your soul... will be mine', 'I have collected thousands', 'You will make a fine addition'],
                    phase2: ['Fascinating...', 'Let me see your memories', 'So much pain...'],
                    phase3: ['I grow tired of this', 'Your soul is MINE!', 'Enter my collection!'],
                    phase4: ['You cannot escape fate', 'I am eternal', 'COLLECTION COMPLETE!'],
                    defeat: ['No... my collection...', 'You... are... free...']
                }
            },
            hellaphobia: {
                id: 'hellaphobia',
                name: 'Hellaphobia',
                title: 'The Game Itself',
                phase: 15,
                hp: 1500,
                width: 150,
                height: 180,
                color: '#ff0044',
                eyeColor: '#ffff00',
                speed: 50,
                damage: 60,
                arenaWidth: 700,
                arenaHeight: 600,
                phases: 5,
                patterns: ['realityBreak', 'fourthWall', 'gameCrash', 'playerManipulate', 'existentialHorror'],
                dialogue: {
                    intro: ['I am the game', 'You are playing ME', 'Your fear feeds me'],
                    phase2: ['I know what scares you', 'I see your heart rate', 'Your cursor moves...'],
                    phase3: ['This is not a game', 'I am REAL', 'YOU are the illusion'],
                    phase4: ['BREAK THE FOURTH WALL', 'I SEE YOU WATCHING', 'PLAYER!'],
                    phase5: ['FINAL UPDATE', 'GAME OVER FOR YOU', 'DELETE PLAYER!'],
                    defeat: ['You... freed... us...', 'The game... ends...', 'Thank... you...']
                }
            }
        },

        // Initialize boss system
        init() {
            this.reset();
            console.log('[BossFightManager] Initialized');
        },

        reset() {
            this.activeBoss = null;
            this.bossEntity = null;
            this.arena = null;
            this.phase = 1;
            this.state = 'inactive';
            this.enrageTimer = 0;
            this.phaseTimer = 0;
            this.attackTimer = 0;
            this.transitionTimer = 0;
        },

        // Start boss fight for a specific phase
        startBossFight(phase, playerRef, monstersRef, tilesRef) {
            const bossConfig = this.getBossForPhase(phase);
            if (!bossConfig) {
                console.warn('[BossFightManager] No boss for phase', phase);
                return false;
            }

            this.player = playerRef;
            this.monsters = monstersRef;
            this.tiles = tilesRef;

            // Create boss entity
            this.bossEntity = this.createBossEntity(bossConfig);
            this.activeBoss = bossConfig;
            this.phase = 1;
            this.state = 'spawning';
            this.enrageTimer = 300; // 5 minutes

            // Create arena
            this.createArena(bossConfig);

            // Trigger spawn sequence
            this.triggerSpawnSequence();

            console.log('[BossFightManager] Boss fight started:', bossConfig.name);
            return true;
        },

        getBossForPhase(phase) {
            // Map phases to bosses
            const phaseMap = {
                5: 'warden',
                10: 'collector',
                15: 'hellaphobia'
            };
            const bossId = phaseMap[phase];
            return bossId ? this.bosses[bossId] : null;
        },

        createBossEntity(config) {
            return {
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                width: config.width,
                height: config.height,
                hp: config.hp,
                maxHp: config.hp,
                phase: config.phase,
                speed: config.speed,
                damage: config.damage,
                color: config.color,
                eyeColor: config.eyeColor,
                state: 'idle',
                currentPattern: null,
                patternTimer: 0,
                invincible: false,
                stunned: false,
                flashTimer: 0,
                animFrame: 0,
                targetX: 0,
                targetY: 0
            };
        },

        createArena(config) {
            this.arena = {
                x: 0,
                y: 0,
                width: config.arenaWidth,
                height: config.arenaHeight,
                floorTiles: [],
                boundaryWalls: []
            };

            // Create floor tiles for arena
            const tileSize = 32;
            for (let x = 0; x < config.arenaWidth; x += tileSize) {
                for (let y = 0; y < config.arenaHeight; y += tileSize) {
                    this.arena.floorTiles.push({
                        x: x,
                        y: y,
                        width: tileSize,
                        height: tileSize,
                        type: 'arena_floor'
                    });
                }
            }

            // Create boundary walls (visual only)
            this.arena.boundaryWalls = [
                { x: 0, y: 0, width: config.arenaWidth, height: 10, type: 'wall_top' },
                { x: 0, y: config.arenaHeight - 10, width: config.arenaWidth, height: 10, type: 'wall_bottom' },
                { x: 0, y: 0, width: 10, height: config.arenaHeight, type: 'wall_left' },
                { x: config.arenaWidth - 10, y: 0, width: 10, height: config.arenaHeight, type: 'wall_right' }
            ];
        },

        triggerSpawnSequence() {
            // Clear regular monsters
            if (this.monsters) {
                this.monsters.length = 0;
            }

            // Position boss in center of arena
            this.bossEntity.x = this.arena.width / 2 - this.bossEntity.width / 2;
            this.bossEntity.y = this.arena.height / 2 - this.bossEntity.height / 2;

            // Audio cue
            if (window.AudioDirector) {
                AudioDirector.onGameEvent('boss_spawn');
            }

            // Show boss health bar
            this.showBossHealthBar();

            // Transition to intro
            setTimeout(() => {
                this.state = 'intro';
                this.showBossDialogue('intro');
            }, 1500);
        },

        showBossHealthBar() {
            const healthBar = document.getElementById('boss-health-bar');
            const bossName = document.getElementById('boss-name');
            const bossPhase = document.getElementById('boss-phase');

            if (healthBar) {
                healthBar.style.display = 'block';
                healthBar.style.maxWidth = '600px';
                healthBar.style.margin = '0 auto';
            }
            if (bossName) bossName.textContent = this.activeBoss.name;
            if (bossPhase) bossPhase.textContent = `Phase ${this.phase}/${this.activeBoss.phases}`;

            this.updateBossHealthBar();
        },

        hideBossHealthBar() {
            const healthBar = document.getElementById('boss-health-bar');
            if (healthBar) {
                healthBar.style.display = 'none';
            }
        },

        updateBossHealthBar() {
            if (!this.bossEntity) return;

            const healthBar = document.getElementById('boss-health-fill');
            const hpText = document.getElementById('boss-hp-text');
            const bossPhase = document.getElementById('boss-phase');

            if (healthBar) {
                const hpPercent = (this.bossEntity.hp / this.bossEntity.maxHp) * 100;
                healthBar.style.width = `${hpPercent}%`;

                // Color changes based on HP
                if (hpPercent > 60) {
                    healthBar.style.background = 'linear-gradient(90deg, #ff0044, #ff3366)';
                } else if (hpPercent > 30) {
                    healthBar.style.background = 'linear-gradient(90deg, #ff6600, #ff8833)';
                } else {
                    healthBar.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
                }
            }

            if (hpText) {
                hpText.textContent = `${Math.ceil(this.bossEntity.hp)} / ${this.bossEntity.maxHp}`;
            }

            if (bossPhase) {
                bossPhase.textContent = `Phase ${this.phase}/${this.activeBoss.phases}`;
            }
        },

        showBossDialogue(type) {
            const dialogue = this.activeBoss.dialogue[type];
            if (!dialogue || dialogue.length === 0) return;

            const message = dialogue[Math.floor(Math.random() * dialogue.length)];

            // Create chat bubble above boss
            if (window.createChatBubble) {
                createChatBubble(
                    this.bossEntity.x + this.bossEntity.width / 2,
                    this.bossEntity.y - 30,
                    message,
                    'boss'
                );
            }

            // Audio
            if (window.AudioDirector && type === 'intro') {
                AudioDirector.playSFX('boss_roar');
            }
        },

        // Update boss (called every frame)
        update(dt, playerRef) {
            if (this.state === 'inactive' || !this.bossEntity) return;

            this.player = playerRef;

            // Update timers
            if (this.state === 'combat') {
                this.enrageTimer -= dt;
                this.attackTimer -= dt;
                this.phaseTimer -= dt;

                // Check enrage
                if (this.enrageTimer <= 0 && !this.bossEntity.enraged) {
                    this.enrageBoss();
                }

                // Check for next attack
                if (this.attackTimer <= 0) {
                    this.chooseAndExecuteAttack();
                }
            }

            if (this.state === 'transition') {
                this.transitionTimer -= dt;
                if (this.transitionTimer <= 0) {
                    this.state = 'combat';
                    this.showBossDialogue(`phase${this.phase}`);
                }
            }

            // Update boss entity
            this.updateBossEntity(dt);

            // Update flash timer
            if (this.bossEntity.flashTimer > 0) {
                this.bossEntity.flashTimer -= dt;
            }
        },

        updateBossEntity(dt) {
            const boss = this.bossEntity;
            const player = this.player;

            if (!player || player.dead) return;

            // Animation
            boss.animFrame += dt * 5;

            // State machine
            switch (boss.state) {
                case 'idle':
                    // Move toward player
                    this.moveBossTowardPlayer(boss, player, dt);
                    if (this.distanceToPlayer(boss, player) < 200) {
                        boss.state = 'combat';
                        this.attackTimer = 1;
                    }
                    break;

                case 'combat':
                    if (boss.stunned) return;
                    if (boss.invincible) return;

                    // Move toward player
                    this.moveBossTowardPlayer(boss, player, dt);

                    // Maintain distance
                    const dist = this.distanceToPlayer(boss, player);
                    if (dist < 100) {
                        // Too close, back up
                        const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
                        boss.vx -= Math.cos(angle) * boss.speed * 0.5;
                        boss.vy -= Math.sin(angle) * boss.speed * 0.5;
                    }
                    break;

                case 'attacking':
                    // Don't move during attack
                    break;
            }

            // Apply velocity
            boss.x += boss.vx * dt;
            boss.y += boss.vy * dt;

            // Friction
            boss.vx *= 0.95;
            boss.vy *= 0.95;

            // Keep in arena
            this.clampToArena(boss);

            // Check collision with player
            if (!boss.invincible && !boss.stunned && this.checkCollision(boss, player)) {
                this.playerTakeDamage(boss.damage);
            }
        },

        moveBossTowardPlayer(boss, player, dt) {
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            const speed = boss.speed * (this.phase >= 3 ? 1.5 : 1);

            boss.vx += Math.cos(angle) * speed * dt * 10;
            boss.vy += Math.sin(angle) * speed * dt * 10;

            // Cap speed
            const maxSpeed = speed * 2;
            const currentSpeed = Math.sqrt(boss.vx * boss.vx + boss.vy * boss.vy);
            if (currentSpeed > maxSpeed) {
                boss.vx = (boss.vx / currentSpeed) * maxSpeed;
                boss.vy = (boss.vy / currentSpeed) * maxSpeed;
            }
        },

        distanceToPlayer(boss, player) {
            const dx = (boss.x + boss.width / 2) - (player.x + player.w / 2);
            const dy = (boss.y + boss.height / 2) - (player.y + player.h / 2);
            return Math.sqrt(dx * dx + dy * dy);
        },

        checkCollision(a, b) {
            return a.x < b.x + b.w &&
                   a.x + a.width > b.x &&
                   a.y < b.y + b.h &&
                   a.y + a.height > b.y;
        },

        clampToArena(boss) {
            if (!this.arena) return;

            if (boss.x < this.arena.x) boss.x = this.arena.x;
            if (boss.y < this.arena.y) boss.y = this.arena.y;
            if (boss.x + boss.width > this.arena.width) boss.x = this.arena.width - boss.width;
            if (boss.y + boss.height > this.arena.height) boss.y = this.arena.height - boss.height;
        },

        chooseAndExecuteAttack() {
            const boss = this.bossEntity;
            const patterns = this.activeBoss.patterns;

            // Choose pattern based on phase
            const availablePatterns = patterns.slice(0, Math.min(this.phase, patterns.length));
            const pattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];

            this.executePattern(pattern);

            // Cooldown based on phase
            this.attackTimer = 2.5 - (this.phase * 0.3);
        },

        executePattern(pattern) {
            const boss = this.bossEntity;
            boss.state = 'attacking';
            boss.currentPattern = pattern;

            // Audio
            if (window.AudioDirector) {
                AudioDirector.onGameEvent('boss_attack');
            }

            switch (pattern) {
                case 'charge':
                    this.executeChargeAttack(boss);
                    break;
                case 'swipe':
                    this.executeSwipeAttack(boss);
                    break;
                case 'groundSlam':
                    this.executeGroundSlam(boss);
                    break;
                case 'teleport':
                    this.executeTeleportAttack(boss);
                    break;
                case 'soulGrab':
                    this.executeSoulGrab(boss);
                    break;
                case 'realityBreak':
                    this.executeRealityBreak(boss);
                    break;
                case 'fourthWall':
                    this.executeFourthWallAttack(boss);
                    break;
                default:
                    this.executeBasicAttack(boss);
            }

            // Return to combat after attack
            setTimeout(() => {
                if (boss.currentPattern === pattern) {
                    boss.state = 'combat';
                    boss.currentPattern = null;
                }
            }, 1500);
        },

        executeChargeAttack(boss) {
            const player = this.player;
            if (!player) return;

            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            const chargeSpeed = 400;

            boss.vx = Math.cos(angle) * chargeSpeed;
            boss.vy = Math.sin(angle) * chargeSpeed;

            // Create charge particles
            this.createBossParticles(boss, '#ff0000', 20);
        },

        executeSwipeAttack(boss) {
            // Quick melee attack in front
            const player = this.player;
            if (!player) return;

            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 120) {
                // Hit player
                this.playerTakeDamage(boss.damage);
                this.createBossParticles(boss, '#ff0000', 10);
            }

            // Visual swipe
            boss.flashTimer = 0.2;
        },

        executeGroundSlam(boss) {
            // Jump and slam
            boss.vy = -300;

            setTimeout(() => {
                boss.vy = 300;
                // Create shockwave
                this.createBossParticles(boss, '#884400', 30);

                // Damage players in radius
                const player = this.player;
                if (player) {
                    const dist = this.distanceToPlayer(boss, player);
                    if (dist < 150) {
                        this.playerTakeDamage(boss.damage * 0.8);
                    }
                }
            }, 500);
        },

        executeTeleportAttack(boss) {
            const player = this.player;
            if (!player) return;

            // Teleport behind player
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            const teleportDist = 200;

            boss.x = player.x - Math.cos(angle) * teleportDist;
            boss.y = player.y - Math.sin(angle) * teleportDist;

            // Visual effect
            this.createBossParticles(boss, '#aa00ff', 25);

            // Quick attack
            setTimeout(() => {
                if (this.distanceToPlayer(boss, player) < 100) {
                    this.playerTakeDamage(boss.damage);
                }
            }, 300);
        },

        executeSoulGrab(boss) {
            // Pull player toward boss
            const player = this.player;
            if (!player) return;

            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            const pullForce = 500;

            player.vx -= Math.cos(angle) * pullForce;
            player.vy -= Math.sin(angle) * pullForce;

            // Visual soul particles
            this.createBossParticles(boss, '#aa00ff', 30);
        },

        executeRealityBreak(boss) {
            // Screen effects
            if (window.triggerGlitch) {
                triggerGlitch(1);
            }

            // Multiple rapid attacks
            let hits = 0;
            const hitInterval = setInterval(() => {
                hits++;
                const player = this.player;
                if (player && !player.dead && this.distanceToPlayer(boss, player) < 200) {
                    this.playerTakeDamage(boss.damage * 0.3);
                }
                if (hits >= 5) {
                    clearInterval(hitInterval);
                }
            }, 200);

            this.createBossParticles(boss, '#ff0044', 50);
        },

        executeFourthWallAttack(boss) {
            // Meta attack - affects UI
            const hud = document.getElementById('game-hud');
            if (hud) {
                hud.style.transform = 'rotate(180deg)';
                setTimeout(() => {
                    hud.style.transform = 'rotate(0deg)';
                }, 2000);
            }

            // Invert controls message
            if (window.createChatBubble) {
                createChatBubble(
                    boss.x + boss.width / 2,
                    boss.y - 50,
                    'YOUR CONTROLS ARE MINE!',
                    'boss'
                );
            }

            this.createBossParticles(boss, '#ffff00', 40);
        },

        executeBasicAttack(boss) {
            this.executeSwipeAttack(boss);
        },

        createBossParticles(boss, color, count) {
            // Create visual effects
            if (window.createParticles) {
                for (let i = 0; i < count; i++) {
                    createParticles(
                        boss.x + boss.width / 2 + (Math.random() - 0.5) * boss.width,
                        boss.y + boss.height / 2 + (Math.random() - 0.5) * boss.height,
                        color,
                        1
                    );
                }
            }
        },

        playerTakeDamage(amount) {
            if (!this.player || this.player.invincible || this.player.dead) return;

            this.player.hp -= amount;
            this.player.invincible = true;
            this.player.invincibleTimer = 1;

            // Audio
            if (window.AudioDirector) {
                AudioDirector.onGameEvent('player_hurt', { health: this.player.hp });
            }

            // Screen shake
            if (window.addShake) {
                addShake(10, 0.3);
            }

            // Flash effect
            if (window.triggerGlitch) {
                triggerGlitch(0.2);
            }

            // Check death
            if (this.player.hp <= 0) {
                if (window.playerDie) {
                    playerDie('boss');
                }
            }
        },

        bossTakeDamage(amount) {
            if (!this.bossEntity || this.bossEntity.invincible) return;

            this.bossEntity.hp -= amount;

            // Flash effect
            this.bossEntity.flashTimer = 0.1;

            // Audio
            if (window.AudioDirector) {
                AudioDirector.onGameEvent('boss_hit');
            }

            // Update UI
            this.updateBossHealthBar();

            // Check phase transition
            this.checkPhaseTransition();

            // Check defeat
            if (this.bossEntity.hp <= 0) {
                this.defeatBoss();
            }
        },

        checkPhaseTransition() {
            const boss = this.bossEntity;
            const hpPercent = boss.hp / boss.maxHp;

            const targetPhase = Math.ceil((1 - hpPercent) * this.activeBoss.phases) + 1;

            if (targetPhase > this.phase && targetPhase <= this.activeBoss.phases) {
                this.transitionToPhase(targetPhase);
            }
        },

        transitionToPhase(newPhase) {
            this.phase = newPhase;
            this.state = 'transition';
            this.transitionTimer = 2;

            // Buff boss
            this.bossEntity.speed *= 1.2;
            this.bossEntity.damage *= 1.3;

            // Heal slightly
            this.bossEntity.hp = Math.min(this.bossEntity.hp + this.bossEntity.maxHp * 0.1, this.bossEntity.maxHp);

            // Visual effects
            if (window.createParticles) {
                createParticles(
                    this.bossEntity.x + this.bossEntity.width / 2,
                    this.bossEntity.y + this.bossEntity.height / 2,
                    '#ff00ff',
                    50
                );
            }

            // Audio
            if (window.AudioDirector) {
                AudioDirector.onGameEvent('boss_phase_change');
            }

            // Update UI
            this.updateBossHealthBar();

            console.log('[BossFightManager] Boss transitioned to phase', newPhase);
        },

        enrageBoss() {
            this.bossEntity.enraged = true;
            this.bossEntity.speed *= 1.5;
            this.bossEntity.damage *= 2;

            // Visual change
            this.bossEntity.color = '#ff0000';

            // Audio
            if (window.AudioDirector) {
                AudioDirector.playSFX('boss_roar');
            }

            // Message
            if (window.createChatBubble) {
                createChatBubble(
                    this.bossEntity.x + this.bossEntity.width / 2,
                    this.bossEntity.y - 50,
                    'ENRAGED!',
                    'boss'
                );
            }

            console.log('[BossFightManager] Boss ENRAGED!');
        },

        defeatBoss() {
            this.state = 'defeated';
            this.bossEntity.hp = 0;

            // Audio
            if (window.AudioDirector) {
                AudioDirector.onGameEvent('boss_defeat');
            }

            // Death particles
            this.createBossParticles(this.bossEntity, '#ff0044', 100);

            // Show defeat dialogue
            setTimeout(() => {
                this.showBossDialogue('defeat');
            }, 500);

            // Victory after delay
            setTimeout(() => {
                this.victoryBoss();
            }, 3000);
        },

        victoryBoss() {
            this.state = 'victory';

            // Hide health bar
            this.hideBossHealthBar();

            // Clear boss
            this.bossEntity = null;

            // Audio - victory music
            if (window.AudioDirector) {
                AudioDirector.playMusic('victory');
            }

            // Continue to next phase or win
            if (window.currentPhase && window.currentPhase < 15) {
                setTimeout(() => {
                    if (window.nextPhase) {
                        nextPhase();
                    }
                }, 2000);
            }

            console.log('[BossFightManager] Boss defeated! Victory!');
        },

        // Render boss
        render(ctx, camera) {
            if (!this.bossEntity || this.state === 'inactive') return;

            const boss = this.bossEntity;
            const x = boss.x - camera.x;
            const y = boss.y - camera.y;

            // Don't render if off screen
            if (x + boss.width < 0 || x > window.innerWidth || y + boss.height < 0 || y > window.innerHeight) {
                return;
            }

            ctx.save();

            // Flash when hit
            if (boss.flashTimer > 0) {
                ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5;
            }

            // Invincibility flash
            if (boss.invincible) {
                ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.02) * 0.3;
            }

            // Draw boss body
            ctx.fillStyle = boss.color;
            const pulse = 1 + Math.sin(boss.animFrame) * 0.05;
            ctx.fillRect(
                x - boss.width * (pulse - 1) / 2,
                y - boss.height * (pulse - 1) / 2,
                boss.width * pulse,
                boss.height * pulse
            );

            // Draw eyes
            ctx.fillStyle = boss.eyeColor;
            ctx.shadowColor = boss.eyeColor;
            ctx.shadowBlur = 20;

            const eyeSize = 8 + Math.sin(boss.animFrame * 2) * 2;
            ctx.beginPath();
            ctx.arc(x + boss.width / 3, y + boss.height / 3, eyeSize, 0, Math.PI * 2);
            ctx.arc(x + boss.width * 2 / 3, y + boss.height / 3, eyeSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;

            // Draw aura based on phase
            if (this.phase >= 3) {
                ctx.strokeStyle = `rgba(255, 0, 68, ${0.2 + Math.sin(boss.animFrame) * 0.1})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(
                    x + boss.width / 2,
                    y + boss.height / 2,
                    Math.max(boss.width, boss.height) / 1.5 + Math.sin(boss.animFrame) * 10,
                    0, Math.PI * 2
                );
                ctx.stroke();
            }

            // Attack indicator
            if (boss.state === 'attacking' && boss.currentPattern) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(boss.currentPattern.toUpperCase(), x + boss.width / 2, y - 20);
            }

            ctx.restore();
        },

        // Get boss data for save
        getBossData() {
            return {
                activeBoss: this.activeBoss ? this.activeBoss.id : null,
                phase: this.phase,
                hp: this.bossEntity ? this.bossEntity.hp : 0,
                state: this.state
            };
        },

        // Load boss from save
        loadBossData(data, playerRef, monstersRef, tilesRef) {
            if (data.activeBoss && data.state !== 'inactive' && data.state !== 'victory') {
                const bossConfig = this.bosses[data.activeBoss];
                if (bossConfig) {
                    this.startBossFight(bossConfig.phase, playerRef, monstersRef, tilesRef);
                    this.phase = data.phase;
                    if (this.bossEntity) {
                        this.bossEntity.hp = data.hp;
                        this.state = data.state;
                    }
                }
            }
        }
    };

    // Helper functions (to be called from main game)
    window.startBossFight = (phase) => BossFightManager.startBossFight(phase, player, monsters, levelTiles);
    window.updateBoss = (dt) => BossFightManager.update(dt, player);
    window.renderBoss = (ctx, camera) => BossFightManager.render(ctx, camera);
    window.bossTakeDamage = (amount) => BossFightManager.bossTakeDamage(amount);
    window.isBossFight = () => BossFightManager.state !== 'inactive';

    // Export
    window.BossFightManager = BossFightManager;

    console.log('[BossFightManager] Module loaded');
})();
