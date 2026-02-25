/* ============================================================
   HELLAPHOBIA - PHASE 1: CORE GAMEPLAY MECHANICS OVERHAUL
   Enhanced Movement | Deep Combat | Psychological Systems
   FULL IMPLEMENTATION
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 1: ENHANCED MOVEMENT SYSTEM =====
    const MOVEMENT = {
        ACCELERATION: 1200,
        DECELERATION: 800,
        MAX_SPEED: 300,
        AIR_CONTROL: 0.6,
        WALL_JUMP_FORCE: { x: 400, y: -550 },
        SLIDE_DURATION: 0.8,
        CROUCH_SPEED: 100,
        DASH_COOLDOWN: 0.5,
        DASH_FORCE: 500,
        DASH_DURATION: 0.2,
        JUMP_FORCE: -650,
        GRAVITY: 1800,
        WALL_SLIDE_GRAVITY: 0.3
    };

    const MOVE_STATES = {
        IDLE: 'idle',
        WALKING: 'walking',
        RUNNING: 'running',
        JUMPING: 'jumping',
        FALLING: 'falling',
        WALL_SLIDING: 'wall_sliding',
        DASHING: 'dashing',
        CROUCHING: 'crouching',
        SLIDING: 'sliding',
        PARRYING: 'parrying'
    };

    // ===== PHASE 1: COMBAT SYSTEM =====
    const COMBAT = {
        MELEE: {
            damage: 25,
            range: 40,
            cooldown: 0.5,
            comboWindow: 0.8,
            comboCount: 0,
            lastAttackTime: 0
        },
        RANGED_SANITY: {
            damage: 50,
            cost: 20,
            speed: 600,
            cooldown: 1.5,
            lastAttackTime: 0
        },
        PARRY: {
            window: 0.3,
            sanityRestore: 15,
            invincibility: 0.5,
            active: false,
            timer: 0
        },
        STEALTH: {
            detectionRadius: 150,
            noiseLevel: 0,
            visibility: 1.0,
            inShadow: false
        }
    };

    // ===== PHASE 1: ENHANCED PSYCHOLOGICAL SYSTEMS =====
    const PSYCHOLOGY = {
        sanity: {
            current: 100,
            max: 100,
            drainRate: 2,
            restoreRate: 5,
            hallucinationThreshold: 60,
            distortionThreshold: 40,
            breakThreshold: 20,
            lastDrain: 0
        },
        fear: {
            current: 0,
            max: 100,
            buildRate: 10,
            decayRate: 15,
            panicThreshold: 80,
            isPanicking: false
        },
        trauma: {
            deathsInArea: {},
            permanentEffects: [],
            phobiasDeveloped: []
        },
        hallucinations: {
            active: [],
            lastSpawn: 0,
            spawnRate: 5
        }
    };

    // ===== PHASE 1: ENHANCED MONSTER AI =====
    const AI_STATES = {
        PATROL: 'patrol',
        INVESTIGATE: 'investigate',
        ALERT: 'alert',
        CHASE: 'chase',
        SEARCH: 'search',
        RETURN: 'return',
        STUNNED: 'stunned'
    };

    const SENSES = {
        SIGHT_RANGE: 400,
        SIGHT_ANGLE: 120,
        HEARING_RANGE: 300,
        SMELL_RANGE: 150
    };

    // ===== PHASE 1: ENVIRONMENTAL INTERACTION =====
    const ENVIRONMENT = {
        hidingSpots: [],
        destructible: [],
        interactive: [],
        traps: [],
        lights: [],
        shadows: [],
        safeZones: []
    };

    // ===== PHASE 1: ENHANCED PLAYER STATE =====
    const Phase1Player = {
        // Movement state
        moveState: MOVE_STATES.IDLE,
        facing: 1,
        vx: 0,
        vy: 0,
        grounded: false,
        wallSliding: false,
        wallDirection: 0,
        crouching: false,
        sliding: false,
        slideTimer: 0,
        dashCooldown: 0,
        dashing: false,
        dashTimer: 0,
        jumps: 0,
        maxJumps: 2,
        
        // Combat state
        comboCount: 0,
        comboTimer: 0,
        parryActive: false,
        parryTimer: 0,
        stealthActive: false,
        
        // Psychological state
        sanity: 100,
        fear: 0,
        trauma: [],
        broken: false,
        
        // Environmental state
        inShadow: false,
        hiding: false,
        currentHidingSpot: null,
        
        // Position (synced with main player)
        x: 0,
        y: 0,
        w: 24,
        h: 40
    };

    // ===== PHASE 1: PROJECTILES =====
    const Phase1Projectiles = {
        projectiles: [],
        
        createSanityProjectile(x, y, direction, speed, damage) {
            this.projectiles.push({
                x: x,
                y: y,
                vx: direction * speed,
                vy: 0,
                damage: damage,
                life: 3,
                maxLife: 3,
                type: 'sanity_blast',
                direction: direction
            });
            
            // Create visual effect
            Phase1Effects.createRangedEffect(x, y, direction);
        },
        
        update(dt, monsters, levelTiles) {
            this.projectiles = this.projectiles.filter(p => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                
                // Check collisions with monsters
                let hit = false;
                monsters.forEach(monster => {
                    if (!monster.dead && Phase1Combat.checkCollision(p, monster)) {
                        monster.hp -= p.damage;
                        Phase1Effects.createHitEffect(monster.x + monster.w/2, monster.y + monster.h/2);
                        hit = true;
                        
                        // Knockback
                        monster.vx = p.direction * 100;
                        
                        if (monster.hp <= 0) {
                            monster.dead = true;
                            Phase1Psychology.onMonsterKilled(Phase1Player);
                        }
                    }
                });
                
                // Check collisions with level tiles
                levelTiles.forEach(tile => {
                    if (tile.type !== 'decoration' && Phase1Combat.checkCollision(p, tile)) {
                        hit = true;
                        Phase1Effects.createHitEffect(p.x, p.y);
                    }
                });
                
                return p.life > 0 && !hit;
            });
        },
        
        render(ctx, camera) {
            ctx.save();
            this.projectiles.forEach(p => {
                const px = p.x - camera.x;
                const py = p.y - camera.y;
                
                // Glow effect
                ctx.shadowColor = '#8844ff';
                ctx.shadowBlur = 10;
                ctx.fillStyle = '#aa66ff';
                ctx.beginPath();
                ctx.arc(px, py, 6, 0, Math.PI * 2);
                ctx.fill();
                
                // Trail
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#8844ff';
                ctx.beginPath();
                ctx.arc(px - p.vx * 0.02, py, 4, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }
    };

    // ===== PHASE 1: MOVEMENT SYSTEM IMPLEMENTATION =====
    const Phase1Movement = {
        update(player, dt, keys, levelTiles) {
            const p = Phase1Player;
            
            // Sync position from main player
            p.x = player.x;
            p.y = player.y;
            p.w = player.w;
            p.h = player.h;
            
            // Handle crouch/slide input
            if (keys['KeyS'] || keys['ArrowDown']) {
                if (!p.crouching && !p.sliding && p.grounded) {
                    if (Math.abs(p.vx) > 100) {
                        // Initiate slide
                        p.sliding = true;
                        p.slideTimer = MOVEMENT.SLIDE_DURATION;
                        p.moveState = MOVE_STATES.SLIDING;
                        Phase1Effects.createSlideEffect(p.x + p.w/2, p.y + p.h);
                    } else {
                        // Crouch
                        p.crouching = true;
                        p.moveState = MOVE_STATES.CROUCHING;
                    }
                }
            } else {
                p.crouching = false;
                if (p.sliding && p.slideTimer <= 0) {
                    p.sliding = false;
                }
            }
            
            // Handle dash
            if (p.dashCooldown > 0) p.dashCooldown -= dt;
            if ((keys['ShiftLeft'] || keys['ShiftRight']) && p.dashCooldown <= 0 && !p.sliding && !p.dashing) {
                this.initiateDash(player, p);
            }
            
            // Handle wall jump
            if (keys['Space'] && p.wallSliding) {
                this.wallJump(player, p);
                keys['Space'] = false; // Prevent double jump
            }
            
            // Horizontal movement with momentum
            if (!p.sliding && !p.dashing) {
                let targetSpeed = 0;
                if (keys['KeyA'] || keys['ArrowLeft']) {
                    targetSpeed = -MOVEMENT.MAX_SPEED;
                    p.facing = -1;
                } else if (keys['KeyD'] || keys['ArrowRight']) {
                    targetSpeed = MOVEMENT.MAX_SPEED;
                    p.facing = 1;
                }
                
                // Apply acceleration/deceleration
                if (targetSpeed !== 0) {
                    const accel = p.grounded ? MOVEMENT.ACCELERATION : MOVEMENT.ACCELERATION * MOVEMENT.AIR_CONTROL;
                    p.vx += (targetSpeed - p.vx) * accel * dt;
                    p.moveState = p.crouching ? MOVE_STATES.CROUCHING : MOVE_STATES.WALKING;
                } else {
                    const decel = p.grounded ? MOVEMENT.DECELERATION : MOVEMENT.DECELERATION * 0.5;
                    p.vx *= (1 - decel * dt);
                    if (Math.abs(p.vx) < 10) p.vx = 0;
                    if (p.grounded && !p.crouching) p.moveState = MOVE_STATES.IDLE;
                }
                
                // Crouch speed limit
                if (p.crouching) {
                    p.vx = Math.max(-MOVEMENT.CROUCH_SPEED, Math.min(MOVEMENT.CROUCH_SPEED, p.vx));
                }
            }
            
            // Slide physics
            if (p.sliding) {
                p.slideTimer -= dt;
                p.vx *= 0.95; // Friction
                if (p.slideTimer <= 0 || Math.abs(p.vx) < 50) {
                    p.sliding = false;
                }
            }
            
            // Dash physics
            if (p.dashing) {
                p.vx = p.facing * MOVEMENT.DASH_FORCE;
                p.dashTimer -= dt;
                if (p.dashTimer <= 0) {
                    p.dashing = false;
                    p.vx *= 0.3;
                    player.invincible = false;
                }
            }
            
            // Wall sliding detection
            this.checkWallSlide(player, p, levelTiles);
            
            // Apply gravity
            if (p.wallSliding) {
                p.vy += MOVEMENT.GRAVITY * MOVEMENT.WALL_SLIDE_GRAVITY * dt;
            } else {
                p.vy += MOVEMENT.GRAVITY * dt;
            }
            
            // Apply velocity
            player.x += p.vx * dt;
            player.y += p.vy * dt;
            
            // Update player reference
            player.vx = p.vx;
            player.vy = p.vy;
            player.facing = p.facing;
            player.grounded = p.grounded;
            
            // Update move state based on vertical movement
            if (!p.grounded && !p.wallSliding && !p.dashing) {
                if (p.vy < 0) {
                    p.moveState = MOVE_STATES.JUMPING;
                } else if (p.vy > 0) {
                    p.moveState = MOVE_STATES.FALLING;
                }
            }
        },
        
        initiateDash(player, p) {
            p.dashing = true;
            p.dashTimer = MOVEMENT.DASH_DURATION;
            p.dashCooldown = MOVEMENT.DASH_COOLDOWN;
            p.moveState = MOVE_STATES.DASHING;
            player.invincible = true;
            player.invincibleTimer = MOVEMENT.DASH_DURATION;
            
            // Create dash particles
            Phase1Effects.createDashParticles(player.x + player.w/2, player.y + player.h/2, p.facing);
            
            // Play dash sound
            Phase1Audio.playDashSound();
        },
        
        checkWallSlide(player, p, levelTiles) {
            // Check for wall contact
            const wallCheck = this.checkWallContact(player, levelTiles);
            if (wallCheck.contact && !p.grounded && p.vy > 0) {
                p.wallSliding = true;
                p.wallDirection = wallCheck.direction;
                p.vy *= 0.8; // Slow fall
                p.moveState = MOVE_STATES.WALL_SLIDING;
            } else {
                p.wallSliding = false;
                p.wallDirection = 0;
            }
        },
        
        checkWallContact(player, levelTiles) {
            // Check left and right for walls
            const leftCheck = { x: player.x - 2, y: player.y + 5, w: 2, h: player.h - 10 };
            const rightCheck = { x: player.x + player.w, y: player.y + 5, w: 2, h: player.h - 10 };
            
            let leftWall = false;
            let rightWall = false;
            
            levelTiles.forEach(tile => {
                if (tile.type === 'wall' || tile.type === 'floor' || tile.type === 'platform') {
                    if (Phase1Combat.checkCollision(leftCheck, tile)) leftWall = true;
                    if (Phase1Combat.checkCollision(rightCheck, tile)) rightWall = true;
                }
            });
            
            if (leftWall) return { contact: true, direction: -1 };
            if (rightWall) return { contact: true, direction: 1 };
            return { contact: false, direction: 0 };
        },
        
        wallJump(player, p) {
            if (p.wallSliding) {
                p.vx = MOVEMENT.WALL_JUMP_FORCE.x * -p.wallDirection;
                p.vy = MOVEMENT.WALL_JUMP_FORCE.y;
                p.wallSliding = false;
                p.moveState = MOVE_STATES.JUMPING;
                p.jumps = 1;
                
                Phase1Effects.createWallJumpParticles(player.x + player.w/2, player.y + player.h/2);
                Phase1Audio.playWallJumpSound();
            }
        },
        
        onPlayerGrounded() {
            Phase1Player.grounded = true;
            Phase1Player.jumps = 0;
            Phase1Player.wallSliding = false;
        },
        
        onPlayerJump() {
            if (Phase1Player.jumps < Phase1Player.maxJumps && !Phase1Player.dashing) {
                Phase1Player.vy = MOVEMENT.JUMP_FORCE;
                Phase1Player.grounded = false;
                Phase1Player.jumps++;
                Phase1Player.moveState = MOVE_STATES.JUMPING;
                return true;
            }
            return false;
        }
    };

    // ===== PHASE 1: COMBAT SYSTEM IMPLEMENTATION =====
    const Phase1Combat = {
        update(player, dt, keys, monsters) {
            const p = Phase1Player;
            const c = COMBAT;
            
            // Update combo timer
            if (p.comboTimer > 0) {
                p.comboTimer -= dt;
                if (p.comboTimer <= 0) {
                    p.comboCount = 0;
                }
            }
            
            // Update parry
            if (p.parryActive) {
                p.parryTimer -= dt;
                if (p.parryTimer <= 0) {
                    p.parryActive = false;
                }
            }
            
            // Melee attack
            if (keys['KeyJ'] || keys['KeyZ']) {
                this.performMeleeAttack(player, p, monsters);
                keys['KeyJ'] = false;
                keys['KeyZ'] = false;
            }
            
            // Ranged sanity attack
            if (keys['KeyK'] || keys['KeyX']) {
                this.performRangedAttack(player, p);
                keys['KeyK'] = false;
                keys['KeyX'] = false;
            }
            
            // Parry
            if (keys['KeyL'] || keys['KeyC']) {
                this.initiateParry(player, p);
                keys['KeyL'] = false;
                keys['KeyC'] = false;
            }
            
            // Stealth toggle
            if (keys['KeyH'] || keys['KeyV']) {
                this.toggleStealth(player, p);
                keys['KeyH'] = false;
                keys['KeyV'] = false;
            }
            
            // Update stealth
            this.updateStealth(player, p, dt);
        },
        
        performMeleeAttack(player, p, monsters) {
            const c = COMBAT.MELEE;
            const now = Date.now() / 1000;
            if (now - c.lastAttackTime < c.cooldown) return;
            
            c.lastAttackTime = now;
            p.comboCount++;
            p.comboTimer = c.comboWindow;
            
            // Calculate damage based on combo
            let damage = c.damage;
            if (p.comboCount >= 3) {
                damage *= 1.5; // Combo bonus
                Phase1Effects.createComboEffect(player.x, player.y, p.comboCount);
            }
            
            // Check for hits
            const attackBox = {
                x: player.x + (p.facing > 0 ? player.w : -c.range),
                y: player.y,
                w: c.range,
                h: player.h
            };
            
            let hitSomething = false;
            monsters.forEach(monster => {
                if (!monster.dead && this.checkCollision(attackBox, monster)) {
                    monster.hp -= damage;
                    hitSomething = true;
                    Phase1Effects.createHitEffect(monster.x + monster.w/2, monster.y + monster.h/2);
                    Phase1Effects.createBloodSplatter(monster.x + monster.w/2, monster.y + monster.h/2, 5);
                    
                    // Knockback
                    monster.vx = p.facing * 200;
                    monster.vy = -100;
                    
                    if (monster.hp <= 0) {
                        monster.dead = true;
                        Phase1Psychology.onMonsterKilled(player);
                    }
                }
            });
            
            // Create attack visual
            Phase1Effects.createMeleeEffect(player.x + player.w/2, player.y + player.h/2, p.facing);
            Phase1Audio.playMeleeSound();
            
            // Screen shake on hit
            if (hitSomething) {
                Phase1Effects.triggerScreenShake(0.2);
            }
        },
        
        performRangedAttack(player, p) {
            const c = COMBAT.RANGED_SANITY;
            const now = Date.now() / 1000;
            if (now - c.lastAttackTime < c.cooldown) return;
            if (p.sanity < c.cost) {
                Phase1UI.showInsufficientSanity();
                return;
            }
            
            c.lastAttackTime = now;
            p.sanity -= c.cost;
            
            // Create projectile
            Phase1Projectiles.createSanityProjectile(
                player.x + player.w/2,
                player.y + player.h/2,
                p.facing,
                c.speed,
                c.damage
            );
            
            Phase1Audio.playRangedSound();
        },
        
        initiateParry(player, p) {
            if (p.parryActive) return;
            p.parryActive = true;
            p.parryTimer = COMBAT.PARRY.window;
            p.moveState = MOVE_STATES.PARRYING;
            Phase1Effects.createParryEffect(player.x + player.w/2, player.y + player.h/2);
            Phase1Audio.playParrySound();
        },
        
        checkParrySuccess(monster) {
            const p = Phase1Player;
            if (!p.parryActive) return false;
            
            // Successful parry
            p.sanity = Math.min(100, p.sanity + COMBAT.PARRY.sanityRestore);
            p.parryActive = false;
            Phase1Effects.createParrySuccessEffect(p.x, p.y);
            Phase1UI.showParrySuccess();
            Phase1Audio.playParrySuccessSound();
            
            return true;
        },
        
        toggleStealth(player, p) {
            if (p.stealthActive) {
                p.stealthActive = false;
                COMBAT.STEALTH.visibility = 1.0;
                Phase1Effects.createUnstealthEffect(player.x, player.y);
            } else if (p.inShadow) {
                p.stealthActive = true;
                COMBAT.STEALTH.visibility = 0.3;
                Phase1Effects.createStealthEffect(player.x, player.y);
                Phase1Audio.playStealthSound();
            } else {
                Phase1UI.showNotInShadow();
            }
        },
        
        updateStealth(player, p, dt) {
            const s = COMBAT.STEALTH;
            
            // Calculate noise level based on movement
            s.noiseLevel = Math.abs(p.vx) / MOVEMENT.MAX_SPEED;
            if (p.sliding) s.noiseLevel *= 0.5;
            if (p.crouching) s.noiseLevel *= 0.3;
            if (p.stealthActive) s.noiseLevel *= 0.2;
            
            // Check if in shadow
            p.inShadow = Phase1Environment.checkInShadow(player);
            
            // Update visibility
            if (p.stealthActive) {
                s.visibility = p.inShadow ? 0.2 : 0.5;
            } else {
                s.visibility = p.inShadow ? 0.7 : 1.0;
            }
        },
        
        checkCollision(a, b) {
            return a.x < b.x + b.w && a.x + a.w > b.x && 
                   a.y < b.y + b.h && a.y + a.h > b.y;
        }
    };

    // ===== PHASE 1: PSYCHOLOGICAL SYSTEMS IMPLEMENTATION =====
    const Phase1Psychology = {
        update(player, dt, monsters, currentArea) {
            const psy = PSYCHOLOGY;
            const p = Phase1Player;
            
            // Update sanity
            this.updateSanity(player, p, dt, monsters);
            
            // Update fear
            this.updateFear(player, p, dt, monsters);
            
            // Check for hallucinations
            this.updateHallucinations(player, p, dt);
            
            // Apply psychological effects
            this.applyPsychologicalEffects(player, p);
            
            // Update UI
            Phase1UI.updatePsychologyUI(p);
            
            // Sync back to main player
            player.sanity = p.sanity;
        },
        
        updateSanity(player, p, dt, monsters) {
            const psy = PSYCHOLOGY.sanity;
            let drain = 0;
            let restore = 0;
            
            // Check proximity to monsters
            let nearMonster = false;
            monsters.forEach(monster => {
                if (!monster.dead) {
                    const dist = this.getDistance(player, monster);
                    if (dist < 200) {
                        nearMonster = true;
                        drain += psy.drainRate * dt;
                    }
                }
            });
            
            // Restore in safe zones
            if (Phase1Environment.isInSafeZone(player)) {
                restore = psy.restoreRate * dt;
            }
            
            // Apply changes
            p.sanity = Math.max(0, Math.min(psy.max, p.sanity - drain + restore));
            
            // Check thresholds
            if (p.sanity < psy.breakThreshold && !p.broken) {
                this.triggerSanityBreak(player);
            } else if (p.sanity < psy.distortionThreshold) {
                this.triggerRealityDistortion(player);
            } else if (p.sanity < psy.hallucinationThreshold) {
                this.enableHallucinations(player);
            }
            
            // Reset broken state if sanity recovers
            if (p.sanity > psy.breakThreshold + 10) {
                p.broken = false;
            }
        },
        
        updateFear(player, p, dt, monsters) {
            const fear = PSYCHOLOGY.fear;
            let build = 0;
            
            // Build fear when monsters are visible
            monsters.forEach(monster => {
                if (!monster.dead && this.canSee(player, monster)) {
                    build += fear.buildRate * dt;
                }
            });
            
            // Decay fear when safe
            const decay = fear.decayRate * dt;
            p.fear = Math.max(0, Math.min(fear.max, p.fear + build - decay));
            
            // Check panic
            if (p.fear >= fear.panicThreshold && !fear.isPanicking) {
                this.triggerPanic(player);
            } else if (p.fear < fear.panicThreshold * 0.5) {
                fear.isPanicking = false;
            }
        },
        
        updateHallucinations(player, p, dt) {
            const hall = PSYCHOLOGY.hallucinations;
            if (p.sanity > PSYCHOLOGY.sanity.hallucinationThreshold) {
                // Clear existing hallucinations if sanity recovered
                hall.active = [];
                return;
            }
            
            hall.lastSpawn += dt;
            
            // Spawn hallucinations based on sanity level
            const spawnChance = (100 - p.sanity) / 100 * 0.3;
            if (hall.lastSpawn > hall.spawnRate && Math.random() < spawnChance) {
                this.spawnHallucination(player);
                hall.lastSpawn = 0;
            }
            
            // Update active hallucinations
            hall.active = hall.active.filter(h => {
                h.life -= dt;
                return h.life > 0;
            });
        },
        
        spawnHallucination(player) {
            const types = ['phantom_monster', 'whisper', 'shadow_figure', 'fake_item', 'blood_drip'];
            const type = types[Math.floor(Math.random() * types.length)];
            const hallucination = {
                type: type,
                x: player.x + (Math.random() - 0.5) * 400,
                y: player.y + (Math.random() - 0.5) * 300,
                life: 3 + Math.random() * 5,
                maxLife: 8
            };
            
            PSYCHOLOGY.hallucinations.active.push(hallucination);
            
            // Trigger effect based on type
            switch(type) {
                case 'phantom_monster':
                    Phase1Effects.createPhantomMonster(hallucination.x, hallucination.y);
                    break;
                case 'whisper':
                    Phase1Audio.playWhisper();
                    break;
                case 'shadow_figure':
                    Phase1Effects.createShadowFigure(hallucination.x, hallucination.y);
                    break;
                case 'blood_drip':
                    Phase1Effects.createBloodDrip(hallucination.x, hallucination.y);
                    break;
            }
        },
        
        applyPsychologicalEffects(player, p) {
            // Apply visual effects based on sanity
            const sanityRatio = p.sanity / 100;
            
            // Vignette intensity
            Phase1Effects.setVignetteIntensity(1 - sanityRatio);
            
            // Chromatic aberration
            if (p.sanity < 50) {
                Phase1Effects.setChromaticAberration((50 - p.sanity) / 10);
            }
            
            // Screen distortion
            if (p.sanity < 30) {
                Phase1Effects.setScreenDistortion(true);
            } else {
                Phase1Effects.setScreenDistortion(false);
            }
            
            // Panic effects
            if (PSYCHOLOGY.fear.isPanicking) {
                Phase1Effects.setPanicMode(true);
                // Reduce player control
                Phase1Player.vx *= 0.9;
            } else {
                Phase1Effects.setPanicMode(false);
            }
        },
        
        triggerSanityBreak(player) {
            Phase1Player.broken = true;
            Phase1Effects.triggerSanityBreakEffect();
            Phase1Audio.playSanityBreak();
            
            // Spawn multiple hallucinations
            for (let i = 0; i < 5; i++) {
                setTimeout(() => this.spawnHallucination(player), i * 500);
            }
        },
        
        triggerRealityDistortion(player) {
            Phase1Effects.triggerGlitch(2.0);
            Phase1World.distortReality();
        },
        
        triggerPanic(player) {
            PSYCHOLOGY.fear.isPanicking = true;
            Phase1Audio.playHeartbeat();
            Phase1UI.showPanicIndicator();
        },
        
        onMonsterKilled(player) {
            // Reduce fear slightly
            Phase1Player.fear = Math.max(0, Phase1Player.fear - 20);
        },
        
        onPlayerDeath(player, area) {
            const trauma = PSYCHOLOGY.trauma;
            
            // Track death in area
            if (!trauma.deathsInArea[area]) {
                trauma.deathsInArea[area] = 0;
            }
            trauma.deathsInArea[area]++;
            
            // Apply trauma effects after multiple deaths
            if (trauma.deathsInArea[area] >= 3) {
                this.applyTraumaEffect(area);
            }
        },
        
        applyTraumaEffect(area) {
            const effects = [
                'fear_in_area',
                'phantom_pain',
                'haunted_by_death'
            ];
            const effect = effects[Math.floor(Math.random() * effects.length)];
            
            PSYCHOLOGY.trauma.permanentEffects.push({
                area: area,
                effect: effect,
                applied: Date.now()
            });
            
            Phase1UI.showTraumaWarning(area, effect);
        },
        
        getDistance(a, b) {
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            return Math.sqrt(dx * dx + dy * dy);
        },
        
        canSee(a, b) {
            // Simple line of sight check
            const dist = this.getDistance(a, b);
            return dist < 400; // Basic visibility range
        }
    };

    // ===== PHASE 1: ENHANCED MONSTER AI =====
    const Phase1AI = {
        update(monster, player, dt) {
            const ai = monster.phase1AI || this.initializeAI(monster);
            
            // Update senses
            this.updateSenses(monster, ai, player);
            
            // State machine
            switch(ai.state) {
                case AI_STATES.PATROL:
                    this.patrolState(monster, ai, dt);
                    break;
                case AI_STATES.INVESTIGATE:
                    this.investigateState(monster, ai, player, dt);
                    break;
                case AI_STATES.ALERT:
                    this.alertState(monster, ai, player, dt);
                    break;
                case AI_STATES.CHASE:
                    this.chaseState(monster, ai, player, dt);
                    break;
                case AI_STATES.SEARCH:
                    this.searchState(monster, ai, dt);
                    break;
                case AI_STATES.RETURN:
                    this.returnState(monster, ai, dt);
                    break;
                case AI_STATES.STUNNED:
                    this.stunnedState(monster, ai, dt);
                    break;
            }
            
            // Update learning
            this.updateLearning(monster, ai, player);
            
            monster.phase1AI = ai;
        },
        
        initializeAI(monster) {
            return {
                state: AI_STATES.PATROL,
                patrolPoints: this.generatePatrolPoints(monster),
                currentPatrolIndex: 0,
                alertLevel: 0,
                lastKnownPlayerPos: null,
                searchTimer: 0,
                stunTimer: 0,
                canSeePlayer: false,
                canHearPlayer: false,
                canSmellPlayer: false,
                playerPatterns: {
                    hidingSpots: [],
                    escapeRoutes: [],
                    attackPatterns: []
                },
                aggression: 1.0,
                fear: 0
            };
        },
        
        generatePatrolPoints(monster) {
            // Generate patrol waypoints around spawn
            const points = [];
            for (let i = 0; i < 4; i++) {
                points.push({
                    x: monster.x + Math.cos(i * Math.PI / 2) * 200,
                    y: monster.y + Math.sin(i * Math.PI / 2) * 100
                });
            }
            return points;
        },
        
        updateSenses(monster, ai, player) {
            const dist = Phase1Psychology.getDistance(monster, player);
            
            // Sight - check visibility
            ai.canSeePlayer = dist < SENSES.SIGHT_RANGE && 
                             this.hasLineOfSight(monster, player) && 
                             COMBAT.STEALTH.visibility > 0.3;
            
            // Hearing - check noise level
            ai.canHearPlayer = dist < SENSES.HEARING_RANGE && COMBAT.STEALTH.noiseLevel > 0.3;
            
            // Smell - always detect if close enough
            ai.canSmellPlayer = dist < SENSES.SMELL_RANGE;
            
            // Update alert level
            if (ai.canSeePlayer) {
                ai.alertLevel = Math.min(100, ai.alertLevel + 2);
                ai.lastKnownPlayerPos = { x: player.x, y: player.y };
            } else if (ai.canHearPlayer) {
                ai.alertLevel = Math.min(100, ai.alertLevel + 1);
            } else {
                ai.alertLevel = Math.max(0, ai.alertLevel - 0.5);
            }
            
            // State transitions
            this.checkStateTransitions(monster, ai, player);
        },
        
        checkStateTransitions(monster, ai, player) {
            const dist = ai.lastKnownPlayerPos ? 
                Phase1Psychology.getDistance(monster, ai.lastKnownPlayerPos) : Infinity;
            
            switch(ai.state) {
                case AI_STATES.PATROL:
                    if (ai.canSeePlayer) {
                        ai.state = AI_STATES.CHASE;
                    } else if (ai.canHearPlayer) {
                        ai.state = AI_STATES.INVESTIGATE;
                    }
                    break;
                case AI_STATES.INVESTIGATE:
                    if (ai.canSeePlayer) {
                        ai.state = AI_STATES.CHASE;
                    } else if (ai.alertLevel < 20) {
                        ai.state = AI_STATES.RETURN;
                    }
                    break;
                case AI_STATES.CHASE:
                    if (!ai.canSeePlayer && dist > 300) {
                        ai.state = AI_STATES.SEARCH;
                        ai.searchTimer = 5;
                    }
                    break;
                case AI_STATES.SEARCH:
                    if (ai.canSeePlayer) {
                        ai.state = AI_STATES.CHASE;
                    } else if (ai.searchTimer <= 0) {
                        ai.state = AI_STATES.RETURN;
                    }
                    break;
                case AI_STATES.RETURN:
                    if (ai.canSeePlayer) {
                        ai.state = AI_STATES.CHASE;
                    } else if (this.atPatrolStart(monster, ai)) {
                        ai.state = AI_STATES.PATROL;
                    }
                    break;
            }
        },
        
        patrolState(monster, ai, dt) {
            const target = ai.patrolPoints[ai.currentPatrolIndex];
            this.moveTo(monster, target, monster.speed * 0.5);
            if (this.reachedTarget(monster, target)) {
                ai.currentPatrolIndex = (ai.currentPatrolIndex + 1) % ai.patrolPoints.length;
            }
        },
        
        investigateState(monster, ai, player, dt) {
            if (ai.lastKnownPlayerPos) {
                this.moveTo(monster, ai.lastKnownPlayerPos, monster.speed * 0.7);
            }
        },
        
        chaseState(monster, ai, player, dt) {
            // Direct chase with prediction
            const predictX = player.x + player.vx * 0.5;
            const predictY = player.y + player.vy * 0.5;
            this.moveTo(monster, { x: predictX, y: predictY }, monster.speed * ai.aggression);
            
            // Check for attack
            const dist = Phase1Psychology.getDistance(monster, player);
            if (dist < 50) {
                this.attackPlayer(monster, player);
            }
        },
        
        searchState(monster, ai, dt) {
            ai.searchTimer -= dt;
            if (ai.lastKnownPlayerPos) {
                const searchPoint = {
                    x: ai.lastKnownPlayerPos.x + Math.sin(ai.searchTimer * 2) * 100,
                    y: ai.lastKnownPlayerPos.y + Math.cos(ai.searchTimer * 2) * 50
                };
                this.moveTo(monster, searchPoint, monster.speed * 0.4);
            }
        },
        
        returnState(monster, ai, dt) {
            const start = ai.patrolPoints[0];
            this.moveTo(monster, start, monster.speed * 0.6);
        },
        
        stunnedState(monster, ai, dt) {
            ai.stunTimer -= dt;
            if (ai.stunTimer <= 0) {
                ai.state = AI_STATES.SEARCH;
            }
        },
        
        moveTo(monster, target, speed) {
            const dx = target.x - monster.x;
            const dy = target.y - monster.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
                monster.vx = (dx / dist) * speed;
                monster.vy = (dy / dist) * speed;
            } else {
                monster.vx = 0;
                monster.vy = 0;
            }
        },
        
        reachedTarget(monster, target) {
            const dx = monster.x - target.x;
            const dy = monster.y - target.y;
            return Math.sqrt(dx * dx + dy * dy) < 20;
        },
        
        atPatrolStart(monster, ai) {
            const start = ai.patrolPoints[0];
            return this.reachedTarget(monster, start);
        },
        
        hasLineOfSight(monster, player) {
            // Simple line of sight - could be improved with raycasting
            return true;
        },
        
        attackPlayer(monster, player) {
            if (Phase1Player.parryActive) {
                Phase1Combat.checkParrySuccess(monster);
                monster.phase1AI.state = AI_STATES.STUNNED;
                monster.phase1AI.stunTimer = 2;
            } else if (!player.invincible) {
                player.hp -= monster.damage;
                Phase1Psychology.updateFear(player, Phase1Player, 0.1, [monster]);
                Phase1Effects.createBloodSplatter(player.x + player.w/2, player.y + player.h/2, 10);
                Phase1Effects.triggerScreenShake(0.3);
            }
        },
        
        updateLearning(monster, ai, player) {
            if (ai.state === AI_STATES.SEARCH) {
                if (!ai.playerPatterns.hidingSpots.includes(ai.lastKnownPlayerPos)) {
                    ai.playerPatterns.hidingSpots.push(ai.lastKnownPlayerPos);
                }
            }
            
            if (ai.state === AI_STATES.CHASE && ai.canSeePlayer) {
                ai.aggression = Math.min(1.5, ai.aggression + 0.01);
            } else if (ai.state === AI_STATES.RETURN) {
                ai.aggression = Math.max(0.8, ai.aggression - 0.005);
            }
        }
    };

    // ===== PHASE 1: ENVIRONMENTAL INTERACTION =====
    const Phase1Environment = {
        hidingSpots: [],
        destructible: [],
        interactive: [],
        traps: [],
        
        initialize(levelData) {
            this.parseLevelForInteractions(levelData);
        },
        
        parseLevelForInteractions(levelData) {
            this.hidingSpots = [];
            this.destructible = [];
            this.interactive = [];
            this.traps = [];
            
            if (!levelData || !levelData.tiles) return;
            
            levelData.tiles.forEach(tile => {
                if (tile.type === 'locker' || tile.type === 'shadow') {
                    this.hidingSpots.push({
                        x: tile.x, y: tile.y, w: tile.w, h: tile.h,
                        type: tile.type, occupied: false
                    });
                } else if (tile.type === 'breakable_wall' || tile.type === 'weak_floor') {
                    this.destructible.push({
                        x: tile.x, y: tile.y, w: tile.w, h: tile.h,
                        hp: 50, type: tile.type
                    });
                } else if (tile.type === 'lever' || tile.type === 'door' || tile.type === 'note') {
                    this.interactive.push({
                        x: tile.x, y: tile.y, w: tile.w, h: tile.h,
                        type: tile.type, activated: false, data: tile.data || {}
                    });
                } else if (tile.type === 'spike_trap' || tile.type === 'falling_rock') {
                    this.traps.push({
                        x: tile.x, y: tile.y, w: tile.w, h: tile.h,
                        type: tile.type, armed: true, triggered: false
                    });
                } else if (tile.type === 'safe_zone') {
                    ENVIRONMENT.safeZones.push({
                        x: tile.x, y: tile.y, w: tile.w, h: tile.h
                    });
                }
            });
        },
        
        update(player, dt, keys) {
            this.updateHidingSpots(player);
            this.updateInteractive(player, keys);
            this.updateTraps(player, dt);
        },
        
        updateHidingSpots(player) {
            const p = Phase1Player;
            let inHidingSpot = false;
            
            this.hidingSpots.forEach(spot => {
                if (this.checkCollision(player, spot)) {
                    inHidingSpot = true;
                    p.currentHidingSpot = spot;
                    p.inShadow = true;
                    
                    if (p.crouching && !p.hiding) {
                        this.enterHiding(player, spot);
                    }
                }
            });
            
            if (!inHidingSpot) {
                p.currentHidingSpot = null;
                p.inShadow = false;
                if (p.hiding) {
                    this.exitHiding(player);
                }
            }
        },
        
        enterHiding(player, spot) {
            Phase1Player.hiding = true;
            spot.occupied = true;
            Phase1Effects.createHideEffect(player.x, player.y);
            Phase1Audio.playHideSound();
        },
        
        exitHiding(player) {
            Phase1Player.hiding = false;
            if (Phase1Player.currentHidingSpot) {
                Phase1Player.currentHidingSpot.occupied = false;
            }
            Phase1Effects.createUnhideEffect(player.x, player.y);
        },
        
        updateInteractive(player, keys) {
            this.interactive.forEach(obj => {
                if (this.checkProximity(player, obj, 50)) {
                    Phase1UI.showInteractionPrompt(obj.type);
                    
                    if (keys['KeyE'] || keys['Enter']) {
                        this.interactWithObject(player, obj);
                        keys['KeyE'] = false;
                        keys['Enter'] = false;
                    }
                }
            });
        },
        
        interactWithObject(player, obj) {
            switch(obj.type) {
                case 'lever':
                    obj.activated = !obj.activated;
                    Phase1Effects.createLeverEffect(obj.x, obj.y);
                    this.triggerLinkedObjects(obj);
                    break;
                case 'door':
                    obj.activated = !obj.activated;
                    Phase1Effects.createDoorEffect(obj.x, obj.y, obj.activated);
                    break;
                case 'note':
                    Phase1UI.showNote(obj.data.text || 'A mysterious note...');
                    break;
            }
            Phase1Audio.playInteractionSound(obj.type);
        },
        
        triggerLinkedObjects(lever) {
            if (lever.data.linkedTo) {
                this.interactive.forEach(obj => {
                    if (obj.data.id === lever.data.linkedTo) {
                        obj.activated = lever.activated;
                    }
                });
            }
        },
        
        updateTraps(player, dt) {
            this.traps.forEach(trap => {
                if (!trap.armed || trap.triggered) return;
                
                if (this.checkCollision(player, trap)) {
                    this.triggerTrap(trap, player);
                }
            });
        },
        
        triggerTrap(trap, victim) {
            trap.triggered = true;
            switch(trap.type) {
                case 'spike_trap':
                    victim.hp -= 30;
                    Phase1Effects.createSpikeEffect(trap.x, trap.y);
                    break;
                case 'falling_rock':
                    victim.hp -= 40;
                    Phase1Effects.createRockFallEffect(trap.x, trap.y);
                    break;
            }
            Phase1Audio.playTrapSound(trap.type);
            Phase1Effects.triggerScreenShake(0.4);
        },
        
        checkInShadow(player) {
            // Check if player is in a shadow area
            for (const spot of this.hidingSpots) {
                if (this.checkCollision(player, spot)) return true;
            }
            return false;
        },
        
        isInSafeZone(player) {
            for (const zone of ENVIRONMENT.safeZones) {
                if (this.checkCollision(player, zone)) return true;
            }
            return false;
        },
        
        checkCollision(a, b) {
            return a.x < b.x + b.w && a.x + a.w > b.x && 
                   a.y < b.y + b.h && a.y + a.h > b.y;
        },
        
        checkProximity(a, b, distance) {
            const dx = (a.x + a.w/2) - (b.x + b.w/2);
            const dy = (a.y + a.h/2) - (b.y + b.h/2);
            return Math.sqrt(dx * dx + dy * dy) < distance;
        },
        
        render(ctx, camera) {
            // Render hiding spots
            ctx.save();
            this.hidingSpots.forEach(spot => {
                const sx = spot.x - camera.x;
                const sy = spot.y - camera.y;
                
                if (spot.type === 'shadow') {
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(sx, sy, spot.w, spot.h);
                } else if (spot.type === 'locker') {
                    ctx.fillStyle = '#2a1a1a';
                    ctx.fillRect(sx, sy, spot.w, spot.h);
                    ctx.strokeStyle = '#ff0044';
                    ctx.strokeRect(sx, sy, spot.w, spot.h);
                }
            });
            
            // Render interactive objects
            this.interactive.forEach(obj => {
                const ox = obj.x - camera.x;
                const oy = obj.y - camera.y;
                
                if (obj.type === 'lever') {
                    ctx.fillStyle = obj.activated ? '#00ff44' : '#ff0044';
                    ctx.fillRect(ox, oy, obj.w, obj.h);
                } else if (obj.type === 'door') {
                    ctx.fillStyle = obj.activated ? '#00ff44' : '#442222';
                    ctx.fillRect(ox, oy, obj.w, obj.h);
                }
            });
            
            // Render traps
            this.traps.forEach(trap => {
                if (!trap.triggered) {
                    const tx = trap.x - camera.x;
                    const ty = trap.y - camera.y;
                    
                    if (trap.type === 'spike_trap') {
                        ctx.fillStyle = '#444';
                        ctx.fillRect(tx, ty, trap.w, trap.h);
                        // Spikes
                        ctx.fillStyle = '#888';
                        for (let i = 0; i < trap.w; i += 10) {
                            ctx.beginPath();
                            ctx.moveTo(tx + i, ty + trap.h);
                            ctx.lineTo(tx + i + 5, ty);
                            ctx.lineTo(tx + i + 10, ty + trap.h);
                            ctx.fill();
                        }
                    }
                }
            });
            ctx.restore();
        }
    };

    // ===== PHASE 1: EFFECTS SYSTEM =====
    const Phase1Effects = {
        particles: [],
        screenShake: 0,
        vignetteIntensity: 0,
        chromaticAberration: 0,
        screenDistortion: false,
        panicMode: false,
        
        // Particle effects
        createDashParticles(x, y, direction) {
            for (let i = 0; i < 8; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: -direction * (100 + Math.random() * 100),
                    vy: (Math.random() - 0.5) * 100,
                    life: 0.3 + Math.random() * 0.3,
                    color: '#ff00ff',
                    size: 3 + Math.random() * 4
                });
            }
        },
        
        createWallJumpParticles(x, y) {
            for (let i = 0; i < 6; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 200,
                    vy: Math.random() * 100,
                    life: 0.4,
                    color: '#ff88aa',
                    size: 2 + Math.random() * 3
                });
            }
        },
        
        createSlideEffect(x, y) {
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: x + (Math.random() - 0.5) * 20,
                    y: y,
                    vx: (Math.random() - 0.5) * 50,
                    vy: -20 - Math.random() * 30,
                    life: 0.5,
                    color: '#444',
                    size: 2 + Math.random() * 3
                });
            }
        },
        
        createMeleeEffect(x, y, direction) {
            for (let i = 0; i < 4; i++) {
                this.particles.push({
                    x: x + direction * 20,
                    y: y + (Math.random() - 0.5) * 20,
                    vx: direction * (50 + Math.random() * 50),
                    vy: (Math.random() - 0.5) * 50,
                    life: 0.2,
                    color: '#ff0044',
                    size: 4 + Math.random() * 4
                });
            }
        },
        
        createRangedEffect(x, y, direction) {
            for (let i = 0; i < 6; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: direction * (100 + Math.random() * 100),
                    vy: (Math.random() - 0.5) * 50,
                    life: 0.3,
                    color: '#8844ff',
                    size: 3 + Math.random() * 3
                });
            }
        },
        
        createParryEffect(x, y) {
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                this.particles.push({
                    x: x, y: y,
                    vx: Math.cos(angle) * 100,
                    vy: Math.sin(angle) * 100,
                    life: 0.4,
                    color: '#ffff00',
                    size: 3 + Math.random() * 3
                });
            }
        },
        
        createParrySuccessEffect(x, y) {
            for (let i = 0; i < 15; i++) {
                const angle = (i / 15) * Math.PI * 2;
                this.particles.push({
                    x: x, y: y,
                    vx: Math.cos(angle) * 150,
                    vy: Math.sin(angle) * 150,
                    life: 0.5,
                    color: '#00ff44',
                    size: 4 + Math.random() * 4
                });
            }
        },
        
        createComboEffect(x, y, combo) {
            for (let i = 0; i < combo * 3; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 200,
                    vy: -100 - Math.random() * 100,
                    life: 0.6,
                    color: '#ffaa00',
                    size: 3 + Math.random() * 3
                });
            }
        },
        
        createHitEffect(x, y) {
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 150,
                    vy: (Math.random() - 0.5) * 150,
                    life: 0.3,
                    color: '#ffffff',
                    size: 2 + Math.random() * 3
                });
            }
        },
        
        createStealthEffect(x, y) {
            for (let i = 0; i < 8; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 50,
                    vy: -30 - Math.random() * 30,
                    life: 0.5,
                    color: '#444466',
                    size: 4 + Math.random() * 4
                });
            }
        },
        
        createUnstealthEffect(x, y) {
            for (let i = 0; i < 6; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 100,
                    vy: (Math.random() - 0.5) * 100,
                    life: 0.3,
                    color: '#ff0044',
                    size: 3 + Math.random() * 3
                });
            }
        },
        
        createHideEffect(x, y) {
            for (let i = 0; i < 10; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 30,
                    vy: -20 - Math.random() * 20,
                    life: 0.4,
                    color: '#000000',
                    size: 5 + Math.random() * 5
                });
            }
        },
        
        createUnhideEffect(x, y) {
            for (let i = 0; i < 8; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 50,
                    vy: (Math.random() - 0.5) * 50,
                    life: 0.3,
                    color: '#ff88aa',
                    size: 3 + Math.random() * 3
                });
            }
        },
        
        createDestructionEffect(x, y, type) {
            const color = type === 'breakable_wall' ? '#664433' : '#444444';
            for (let i = 0; i < 12; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 200,
                    vy: -50 - Math.random() * 150,
                    life: 0.8,
                    color: color,
                    size: 4 + Math.random() * 6,
                    gravity: true
                });
            }
        },
        
        createLeverEffect(x, y) {
            for (let i = 0; i < 6; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 50,
                    vy: -30 - Math.random() * 30,
                    life: 0.4,
                    color: '#ffff00',
                    size: 3 + Math.random() * 3
                });
            }
        },
        
        createDoorEffect(x, y, open) {
            const color = open ? '#00ff44' : '#ff0044';
            for (let i = 0; i < 8; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 100,
                    vy: (Math.random() - 0.5) * 100,
                    life: 0.5,
                    color: color,
                    size: 4 + Math.random() * 4
                });
            }
        },
        
        createSpikeEffect(x, y) {
            for (let i = 0; i < 10; i++) {
                this.particles.push({
                    x: x + Math.random() * 32,
                    y: y,
                    vx: (Math.random() - 0.5) * 100,
                    vy: -50 - Math.random() * 100,
                    life: 0.4,
                    color: '#ff0000',
                    size: 3 + Math.random() * 3
                });
            }
        },
        
        createRockFallEffect(x, y) {
            for (let i = 0; i < 15; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 150,
                    vy: -100 - Math.random() * 100,
                    life: 1.0,
                    color: '#666',
                    size: 5 + Math.random() * 8,
                    gravity: true
                });
            }
        },
        
        createBloodSplatter(x, y, amount) {
            for (let i = 0; i < amount; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 300,
                    vy: (Math.random() - 0.5) * 300,
                    life: 1 + Math.random(),
                    color: `rgb(${150 + Math.random() * 50}, 0, ${Math.random() * 30})`,
                    size: 3 + Math.random() * 5,
                    gravity: true
                });
            }
        },
        
        createPhantomMonster(x, y) {
            for (let i = 0; i < 20; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 100,
                    vy: -20 - Math.random() * 50,
                    life: 2 + Math.random(),
                    color: 'rgba(100,0,100,0.5)',
                    size: 8 + Math.random() * 8,
                    fade: true
                });
            }
        },
        
        createShadowFigure(x, y) {
            for (let i = 0; i < 15; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 50,
                    vy: -10 - Math.random() * 30,
                    life: 3 + Math.random(),
                    color: 'rgba(0,0,0,0.8)',
                    size: 10 + Math.random() * 10,
                    fade: true
                });
            }
        },
        
        createBloodDrip(x, y) {
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: x + (Math.random() - 0.5) * 20,
                    y: y,
                    vx: 0,
                    vy: 50 + Math.random() * 50,
                    life: 1 + Math.random(),
                    color: '#aa0000',
                    size: 2 + Math.random() * 3,
                    gravity: true
                });
            }
        },
        
        // Screen effects
        triggerScreenShake(duration) {
            this.screenShake = duration;
        },
        
        setVignetteIntensity(intensity) {
            this.vignetteIntensity = intensity;
        },
        
        setChromaticAberration(amount) {
            this.chromaticAberration = amount;
        },
        
        setScreenDistortion(active) {
            this.screenDistortion = active;
        },
        
        setPanicMode(active) {
            this.panicMode = active;
        },
        
        triggerGlitch(duration) {
            const glitchOverlay = document.getElementById('glitch-overlay');
            if (glitchOverlay) {
                glitchOverlay.classList.add('active');
                setTimeout(() => {
                    glitchOverlay.classList.remove('active');
                }, duration * 1000);
            }
        },
        
        triggerSanityBreakEffect() {
            this.triggerGlitch(3.0);
            this.setVignetteIntensity(0.9);
            this.setChromaticAberration(5);
            this.setScreenDistortion(true);
            
            // Gradually recover
            setTimeout(() => {
                this.setVignetteIntensity(0.5);
                this.setChromaticAberration(2);
            }, 3000);
        },
        
        update(dt) {
            // Update screen shake
            if (this.screenShake > 0) {
                this.screenShake -= dt;
            }
            
            // Update particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.life -= dt;
                
                if (p.gravity) {
                    p.vy += 500 * dt;
                }
                
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                }
            }
        },
        
        render(ctx, camera, W, H) {
            // Apply screen shake
            ctx.save();
            if (this.screenShake > 0) {
                const shakeX = (Math.random() - 0.5) * 10 * this.screenShake;
                const shakeY = (Math.random() - 0.5) * 10 * this.screenShake;
                ctx.translate(shakeX, shakeY);
            }
            
            // Render particles
            this.particles.forEach(p => {
                const alpha = p.fade ? p.life / 2 : 1;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x - camera.x, p.y - camera.y, p.size, p.size);
            });
            ctx.globalAlpha = 1;
            
            // Vignette
            if (this.vignetteIntensity > 0) {
                const grad = ctx.createRadialGradient(W/2, H/2, H * 0.3, W/2, H/2, H);
                grad.addColorStop(0, 'rgba(0,0,0,0)');
                grad.addColorStop(1, `rgba(0,0,0,${this.vignetteIntensity})`);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, W, H);
            }
            
            // Chromatic aberration
            if (this.chromaticAberration > 0.1) {
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = this.chromaticAberration / 10;
                ctx.fillStyle = 'rgba(255,0,0,0.1)';
                ctx.fillRect(-2, 0, W, H);
                ctx.fillStyle = 'rgba(0,0,255,0.1)';
                ctx.fillRect(2, 0, W, H);
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 1;
            }
            
            // Panic mode - red overlay
            if (this.panicMode) {
                ctx.fillStyle = `rgba(255,0,0,${0.1 + Math.random() * 0.1})`;
                ctx.fillRect(0, 0, W, H);
            }
            
            ctx.restore();
        }
    };

    // ===== PHASE 1: AUDIO SYSTEM =====
    const Phase1Audio = {
        sounds: {},
        
        init() {
            // Initialize audio context and load sounds
            this.sounds = {};
        },
        
        playDashSound() {
            this.playTone(200, 0.1, 'sawtooth');
        },
        
        playWallJumpSound() {
            this.playTone(300, 0.15, 'square');
        },
        
        playMeleeSound() {
            this.playTone(150, 0.1, 'sawtooth');
        },
        
        playRangedSound() {
            this.playTone(400, 0.2, 'sine');
        },
        
        playParrySound() {
            this.playTone(600, 0.15, 'square');
        },
        
        playParrySuccessSound() {
            this.playTone(800, 0.3, 'sine');
        },
        
        playStealthSound() {
            this.playTone(100, 0.3, 'sine');
        },
        
        playHideSound() {
            this.playTone(50, 0.2, 'sine');
        },
        
        playInteractionSound(type) {
            const freq = type === 'lever' ? 400 : type === 'door' ? 300 : 500;
            this.playTone(freq, 0.15, 'square');
        },
        
        playTrapSound(type) {
            this.playTone(100, 0.3, 'sawtooth');
        },
        
        playWhisper() {
            // Subtle whisper sound
            this.playTone(200 + Math.random() * 100, 1.0, 'sine', 0.1);
        },
        
        playSanityBreak() {
            // Distorted sound
            this.playTone(100, 2.0, 'sawtooth');
        },
        
        playHeartbeat() {
            this.playTone(40, 0.5, 'sine', 0.3);
        },
        
        playTone(frequency, duration, type = 'sine', volume = 0.1) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.frequency.value = frequency;
                osc.type = type;
                gain.gain.value = volume;
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.start();
                osc.stop(ctx.currentTime + duration);
            } catch (e) {
                // Audio not available
            }
        }
    };

    // ===== PHASE 1: UI SYSTEM =====
    const Phase1UI = {
        messages: [],
        
        showInsufficientSanity() {
            this.showMessage('Insufficient Sanity!', '#8844ff');
        },
        
        showParrySuccess() {
            this.showMessage('PARRY SUCCESS!', '#00ff44');
        },
        
        showPanicIndicator() {
            this.showMessage('PANIC!', '#ff0000');
        },
        
        showTraumaWarning(area, effect) {
            this.showMessage(`Trauma: ${effect.replace(/_/g, ' ')}`, '#ff0044');
        },
        
        showNote(text) {
            this.showMessage(text, '#ff88aa', 3);
        },
        
        showInteractionPrompt(type) {
            // This would show a prompt near the player
        },
        
        showNotInShadow() {
            this.showMessage('Find shadows to hide!', '#888');
        },
        
        showMessage(text, color = '#fff', duration = 1.5) {
            this.messages.push({
                text: text,
                color: color,
                life: duration,
                maxLife: duration
            });
        },
        
        updatePsychologyUI(p) {
            // Update sanity bar
            const sanityFill = document.getElementById('sanity-fill');
            if (sanityFill) {
                sanityFill.style.width = `${p.sanity}%`;
            }
        },
        
        update(dt) {
            // Update messages
            for (let i = this.messages.length - 1; i >= 0; i--) {
                this.messages[i].life -= dt;
                if (this.messages[i].life <= 0) {
                    this.messages.splice(i, 1);
                }
            }
        },
        
        render(ctx, W, H) {
            // Render messages
            ctx.save();
            ctx.font = 'bold 20px Inter';
            ctx.textAlign = 'center';
            
            this.messages.forEach((msg, i) => {
                const alpha = msg.life / msg.maxLife;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = msg.color;
                ctx.fillText(msg.text, W/2, H/2 - 50 - i * 30);
            });
            
            ctx.restore();
        }
    };

    // ===== PHASE 1: INPUT HANDLING =====
    const Phase1Input = {
        interactPressed: false,
        
        update(keys) {
            this.interactPressed = keys['KeyE'] || keys['Enter'];
        }
    };

    // ===== PHASE 1: WORLD STATE =====
    const Phase1World = {
        realityDistorted: false,
        
        distortReality() {
            this.realityDistorted = true;
            setTimeout(() => {
                this.realityDistorted = false;
            }, 5000);
        },
        
        isRealityDistorted() {
            return this.realityDistorted;
        }
    };

    // ===== PHASE 1: MAIN UPDATE LOOP =====
    const Phase1Core = {
        initialized: false,
        
        init() {
            if (this.initialized) return;
            
            Phase1Audio.init();
            console.log('Phase 1: Core Gameplay Mechanics initialized');
            this.initialized = true;
        },
        
        update(player, monsters, keys, dt, levelTiles, currentArea) {
            if (!this.initialized) this.init();
            
            // Update input
            Phase1Input.update(keys);
            
            // Update movement
            Phase1Movement.update(player, dt, keys, levelTiles);
            
            // Update combat
            Phase1Combat.update(player, dt, keys, monsters);
            
            // Update psychology
            Phase1Psychology.update(player, dt, monsters, currentArea);
            
            // Update environment
            Phase1Environment.update(player, dt, keys);
            
            // Update AI for each monster
            monsters.forEach(monster => {
                if (!monster.dead) {
                    Phase1AI.update(monster, player, dt);
                }
            });
            
            // Update projectiles
            Phase1Projectiles.update(dt, monsters, levelTiles);
            
            // Update effects
            Phase1Effects.update(dt);
            
            // Update UI
            Phase1UI.update(dt);
            
            // Sync Phase1Player back to main player
            player.sanity = Phase1Player.sanity;
            player.fear = Phase1Player.fear;
        },
        
        render(ctx, camera, W, H) {
            // Render environment
            Phase1Environment.render(ctx, camera);
            
            // Render projectiles
            Phase1Projectiles.render(ctx, camera);
            
            // Render effects
            Phase1Effects.render(ctx, camera, W, H);
            
            // Render UI
            Phase1UI.render(ctx, W, H);
        },
        
        // Expose methods for external use
        onPlayerGrounded() {
            Phase1Movement.onPlayerGrounded();
        },
        
        onPlayerJump() {
            return Phase1Movement.onPlayerJump();
        },
        
        initializeEnvironment(levelData) {
            Phase1Environment.initialize(levelData);
        },
        
        getPlayerState() {
            return Phase1Player;
        }
    };

    // Export Phase 1 systems
    window.Phase1Core = Phase1Core;
    window.Phase1Movement = Phase1Movement;
    window.Phase1Combat = Phase1Combat;
    window.Phase1Psychology = Phase1Psychology;
    window.Phase1AI = Phase1AI;
    window.Phase1Environment = Phase1Environment;
    window.Phase1Effects = Phase1Effects;
    window.Phase1Audio = Phase1Audio;
    window.Phase1UI = Phase1UI;
    window.Phase1Projectiles = Phase1Projectiles;
    window.Phase1Player = Phase1Player;
    window.MOVE_STATES = MOVE_STATES;
    window.AI_STATES = AI_STATES;
    window.COMBAT = COMBAT;
    window.MOVEMENT = MOVEMENT;
})();
