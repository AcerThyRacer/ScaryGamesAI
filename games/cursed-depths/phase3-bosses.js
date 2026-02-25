/* ============================================================
   CURSED DEPTHS - PHASE 3: BOSS REWORKS
   5 Epic Multi-Phase Bosses | Advanced AI | Unique Mechanics
   ============================================================ */

// ===== BOSS REWORK SYSTEM =====
const BossReworks = {
    activeBoss: null,
    
    init() {
        console.log('👹 Phase 3: Boss Reworks initialized');
        this.defineBosses();
    },
    
    defineBosses() {
        // Override existing boss definitions with enhanced versions
        this.enhanceEyeOfTerror();
        this.enhanceBoneColossus();
        this.enhanceDemonLord();
        this.enhanceHiveQueen();
        this.enhanceFrostTitan();
    },
    
    // === BOSS 1: EYE OF TERROR ===
    enhanceEyeOfTerror() {
        const eyeBoss = {
            name: 'Eye of Terror',
            hp: 2800,
            maxHp: 2800,
            phase: 1,
            phaseThreshold: 0.5, // Transform at 50% HP
            
            // Phase 1 abilities
            phase1Abilities: [
                { name: 'charge', cooldown: 3, damage: 40 },
                { name: 'spawn_servant', cooldown: 5, damage: 0 },
                { name: 'dash', cooldown: 2, damage: 35 }
            ],
            
            // Phase 2 abilities (enraged)
            phase2Abilities: [
                { name: 'fast_charge', cooldown: 1.5, damage: 50 },
                { name: 'bite', cooldown: 2, damage: 60 },
                { name: 'spawn_more_servants', cooldown: 3, damage: 0 },
                { name: 'teleport', cooldown: 4, damage: 0 }
            ],
            
            states: {
                idle: { duration: 2, next: 'charge' },
                charge: { duration: 1.5, next: 'recover' },
                recover: { duration: 1, next: 'idle' },
                bite: { duration: 0.5, next: 'idle' }
            },
            
            currentState: 'idle',
            stateTimer: 0,
            
            update(dt, player) {
                this.stateTimer += dt;
                
                // Check phase transition
                if (this.phase === 1 && this.hp <= this.maxHp * this.phaseThreshold) {
                    this.transformPhase2();
                }
                
                // Execute current state
                const state = this.states[this.currentState];
                if (this.stateTimer >= state.duration) {
                    this.currentState = state.next;
                    this.stateTimer = 0;
                    this.executeState(player);
                }
                
                // Move towards player
                this.moveTowardsPlayer(player, dt);
            },
            
            transformPhase2() {
                this.phase = 2;
                this.hp = this.hp * 1.2; // Heal 20% on transform
                this.maxHp = this.maxHp * 1.2;
                
                // Visual transformation
                triggerShake(10);
                spawnParticles(this.x, this.y, 'transformation', 50);
                
                // Announce transformation
                showBossMessage('EYE OF TERROR TRANSFORMS!', '#FF0000');
            },
            
            executeState(player) {
                switch(this.currentState) {
                    case 'charge':
                        this.chargeAtPlayer(player);
                        break;
                    case 'bite':
                        this.biteAttack(player);
                        break;
                    case 'spawn_servant':
                        this.spawnServants();
                        break;
                }
            },
            
            chargeAtPlayer(player) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                this.vx = Math.cos(angle) * 15;
                this.vy = Math.sin(angle) * 15;
                
                // Charge visual effect
                createChargeTrail(this.x, this.y, angle);
            },
            
            biteAttack(player) {
                const dist = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
                if (dist < 60) {
                    player.hp -= 60;
                    triggerShake(5);
                    AnimationSystem.spawnDamageNumber(player.x, player.y, 60, true);
                }
            },
            
            spawnServants() {
                for (let i = 0; i < 3; i++) {
                    const angle = (Math.PI * 2 / 3) * i;
                    enemies.push({
                        x: this.x + Math.cos(angle) * 80,
                        y: this.y + Math.sin(angle) * 80,
                        type: 'servant_of_cthulhu',
                        hp: 50,
                        maxHp: 50,
                        vx: Math.cos(angle) * 3,
                        vy: Math.sin(angle) * 3
                    });
                }
            },
            
            moveTowardsPlayer(player, dt) {
                if (this.currentState !== 'charge') {
                    const angle = Math.atan2(player.y - this.y, player.x - this.x);
                    const speed = this.phase === 2 ? 4 : 2.5;
                    this.x += Math.cos(angle) * speed;
                    this.y += Math.sin(angle) * speed;
                }
            }
        };
        
        // Replace or add boss
        window.BOSSES = window.BOSSES || {};
        window.BOSSES.eye_of_terror = eyeBoss;
    },
    
    // === BOSS 2: BONE COLOSSUS ===
    enhanceBoneColossus() {
        const boneBoss = {
            name: 'Bone Colossus',
            hp: 4200,
            maxHp: 4200,
            phase: 1,
            phaseThreshold: 0.6,
            
            // Attack patterns
            attacks: {
                bone_projectile: { cooldown: 2, damage: 35, speed: 8 },
                ground_slam: { cooldown: 5, damage: 50, area: 100 },
                bone_spear_rain: { cooldown: 8, damage: 40, count: 12 },
                summon_skeleton: { cooldown: 6, damage: 0, count: 3 }
            },
            
            phase: 1,
            attackCooldown: 0,
            
            update(dt, player) {
                this.attackCooldown -= dt;
                
                // Phase transition
                if (this.phase === 1 && this.hp <= this.maxHp * this.phaseThreshold) {
                    this.enterPhase2();
                }
                
                // Attack logic
                if (this.attackCooldown <= 0) {
                    this.chooseAttack(player);
                }
                
                // Slow movement
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                this.x += Math.cos(angle) * 1.5;
                this.y += Math.sin(angle) * 1.5;
            },
            
            enterPhase2() {
                this.phase = 2;
                this.attackCooldown = 2;
                
                // Enrage视觉效果
                triggerShake(15);
                screenShake.intensity = 15;
                
                showBossMessage('BONE COLOSSUS ENRAGES!', '#D4C9A8');
            },
            
            chooseAttack(player) {
                const dist = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
                
                if (this.phase === 2 && Math.random() < 0.4) {
                    // Phase 2 exclusive: bone spear rain
                    this.boneSpearRain(player);
                    this.attackCooldown = this.attacks.bone_spear_rain.cooldown;
                } else if (dist < 150) {
                    // Close range: ground slam
                    this.groundSlam(player);
                    this.attackCooldown = this.attacks.ground_slam.cooldown;
                } else if (dist < 400) {
                    // Medium range: bone projectiles
                    this.shootBoneProjectile(player);
                    this.attackCooldown = this.attacks.bone_projectile.cooldown;
                } else {
                    // Far range: summon minions
                    this.summonSkeletons();
                    this.attackCooldown = this.attacks.summon_skeleton.cooldown;
                }
            },
            
            shootBoneProjectile(player) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                projectiles.push({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(angle) * this.attacks.bone_projectile.speed,
                    vy: Math.sin(angle) * this.attacks.bone_projectile.speed,
                    damage: this.attacks.bone_projectile.damage,
                    type: 'bone',
                    size: 12
                });
            },
            
            groundSlam(player) {
                // Create shockwave
                shockwaves.push({
                    x: this.x,
                    y: this.y,
                    radius: 0,
                    maxRadius: this.attacks.ground_slam.area,
                    damage: this.attacks.ground_slam.damage
                });
                
                triggerShake(8);
            },
            
            boneSpearRain(player) {
                for (let i = 0; i < this.attacks.bone_spear_rain.count; i++) {
                    const angle = (Math.PI * 2 / this.attacks.bone_spear_rain.count) * i;
                    setTimeout(() => {
                        projectiles.push({
                            x: player.x + Math.cos(angle) * 200,
                            y: player.y + Math.sin(angle) * 200,
                            vx: 0,
                            vy: 15,
                            damage: this.attacks.bone_spear_rain.damage,
                            type: 'bone_spear',
                            size: 8
                        });
                    }, i * 100);
                }
            },
            
            summonSkeletons() {
                for (let i = 0; i < this.attacks.summon_skeleton.count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    enemies.push({
                        x: this.x + Math.cos(angle) * 150,
                        y: this.y + Math.sin(angle) * 150,
                        type: 'skeleton',
                        hp: 80,
                        maxHp: 80
                    });
                }
            }
        };
        
        window.BOSSES.bone_colossus = boneBoss;
    },
    
    // === BOSS 3: DEMON LORD ===
    enhanceDemonLord() {
        const demonBoss = {
            name: 'Demon Lord',
            hp: 6500,
            maxHp: 6500,
            phase: 1,
            phaseThreshold: 0.5,
            
            // Teleportation system
            teleportCooldown: 0,
            teleportInterval: 4,
            
            // Attack patterns
            attacks: {
                shadow_bolt: { damage: 45, speed: 10, count: 3 },
                laser_beam: { damage: 70, duration: 3, width: 20 },
                demon_scythe: { damage: 55, speed: 8, homing: true },
                teleport_slash: { damage: 80, range: 80 }
            },
            
            update(dt, player) {
                this.teleportCooldown -= dt;
                
                // Phase transition
                if (this.phase === 1 && this.hp <= this.maxHp * this.phaseThreshold) {
                    this.revealTrueForm();
                }
                
                // Teleport frequently in phase 2
                if (this.phase === 2 && this.teleportCooldown <= 0) {
                    this.teleportNearPlayer(player);
                    this.teleportCooldown = this.phase === 2 ? 2 : 4;
                }
                
                // Attack logic
                if (this.teleportCooldown < this.teleportInterval * 0.5) {
                    this.performAttack(player);
                }
                
                // Float towards player slowly
                if (!this.teleporting) {
                    const angle = Math.atan2(player.y - this.y, player.x - this.x);
                    this.x += Math.cos(angle) * 2;
                    this.y += Math.sin(angle) * 2;
                }
            },
            
            revealTrueForm() {
                this.phase = 2;
                this.hp = this.hp * 1.3;
                this.maxHp = this.maxHp * 1.3;
                this.teleportInterval = 2;
                
                // Dramatic transformation
                triggerShake(20);
                screenShake.intensity = 20;
                createExplosion(this.x, this.y, 'shadow', 100);
                
                showBossMessage('DEMON LORD REVEALS TRUE FORM!', '#6600CC');
            },
            
            teleportNearPlayer(player) {
                this.teleporting = true;
                
                // Disappear effect
                createExplosion(this.x, this.y, 'shadow', 30);
                
                setTimeout(() => {
                    // Appear behind player
                    const offset = 150;
                    this.x = player.x + (Math.random() - 0.5) * offset * 2;
                    this.y = player.y + (Math.random() - 0.5) * offset * 2;
                    
                    // Appear effect
                    createExplosion(this.x, this.y, 'shadow', 30);
                    this.teleporting = false;
                    
                    // Immediate attack after teleport
                    this.teleportSlash(player);
                }, 500);
            },
            
            performAttack(player) {
                const rand = Math.random();
                
                if (rand < 0.4) {
                    // Shadow bolt spread
                    for (let i = 0; i < this.attacks.shadow_bolt.count; i++) {
                        const angle = Math.atan2(player.y - this.y, player.x - this.x) + (i - 1) * 0.3;
                        projectiles.push({
                            x: this.x,
                            y: this.y,
                            vx: Math.cos(angle) * this.attacks.shadow_bolt.speed,
                            vy: Math.sin(angle) * this.attacks.shadow_bolt.speed,
                            damage: this.attacks.shadow_bolt.damage,
                            type: 'shadow',
                            size: 10
                        });
                    }
                } else if (rand < 0.7 && this.phase === 2) {
                    // Laser beam (phase 2 only)
                    this.fireLaserBeam(player);
                } else {
                    // Homing demon scythes
                    for (let i = 0; i < 2; i++) {
                        projectiles.push({
                            x: this.x + (Math.random() - 0.5) * 100,
                            y: this.y + (Math.random() - 0.5) * 100,
                            vx: 0,
                            vy: 0,
                            damage: this.attacks.demon_scythe.damage,
                            type: 'demon_scythe',
                            homing: true,
                            target: player,
                            speed: this.attacks.demon_scythe.speed
                        });
                    }
                }
            },
            
            fireLaserBeam(player) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                
                // Create laser beam
                lasers.push({
                    x: this.x,
                    y: this.y,
                    angle: angle,
                    width: this.attacks.laser_beam.width,
                    duration: this.attacks.laser_beam.duration,
                    damage: this.attacks.laser_beam.damage,
                    tickRate: 0.2
                });
            },
            
            teleportSlash(player) {
                const dist = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
                if (dist < this.attacks.teleport_slash.range) {
                    player.hp -= this.attacks.teleport_slash.damage;
                    triggerShake(6);
                    AnimationSystem.spawnDamageNumber(player.x, player.y, this.attacks.teleport_slash.damage, true);
                }
            }
        };
        
        window.BOSSES.demon_lord = demonBoss;
    },
    
    // === BOSS 4: HIVE QUEEN ===
    enhanceHiveQueen() {
        const hiveBoss = {
            name: 'Hive Queen',
            hp: 5200,
            maxHp: 5200,
            phase: 1,
            phaseThreshold: 0.55,
            
            // Honey pool system
            honeyPools: [],
            
            // Bee spawning
            beeSpawnRate: 3,
            beeSpawnTimer: 0,
            
            attacks: {
                honey_shot: { damage: 35, speed: 7, slow: true },
                toxic_cloud: { damage: 25, duration: 10, area: 80 },
                bee_summon: { count: 5, hp: 30 },
                enraged_charge: { damage: 70, speed: 12 }
            },
            
            update(dt, player) {
                this.beeSpawnTimer += dt;
                
                // Phase transition
                if (this.phase === 1 && this.hp <= this.maxHp * this.phaseThreshold) {
                    this.enrageMode();
                }
                
                // Spawn bees periodically
                if (this.beeSpawnTimer >= this.beeSpawnRate) {
                    this.summonBees();
                    this.beeSpawnTimer = 0;
                }
                
                // Hover movement
                this.y += Math.sin(Date.now() * 0.003) * 0.5;
                this.x += Math.cos(Date.now() * 0.002) * 0.3;
                
                // Attack logic
                if (Math.random() < 0.02) {
                    this.shootHoney(player);
                }
                
                if (this.phase === 2 && Math.random() < 0.015) {
                    this.createToxicCloud(player);
                }
            },
            
            enrageMode() {
                this.phase = 2;
                this.beeSpawnRate = 1.5; // Spawn bees faster
                this.hp = this.hp * 1.15;
                this.maxHp = this.maxHp * 1.15;
                
                // Visual rage effect
                triggerShake(12);
                createExplosion(this.x, this.y, 'toxic', 60);
                
                showBossMessage('HIVE QUEEN ENRAGES!', '#DDAA33');
            },
            
            shootHoney(player) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                projectiles.push({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(angle) * this.attacks.honey_shot.speed,
                    vy: Math.sin(angle) * this.attacks.honey_shot.speed,
                    damage: this.attacks.honey_shot.damage,
                    type: 'honey',
                    slow: this.attacks.honey_shot.slow,
                    size: 14
                });
            },
            
            createToxicCloud(player) {
                toxicZones.push({
                    x: player.x + (Math.random() - 0.5) * 200,
                    y: player.y + (Math.random() - 0.5) * 200,
                    radius: this.attacks.toxic_cloud.area,
                    damage: this.attacks.toxic_cloud.damage,
                    duration: this.attacks.toxic_cloud.duration
                });
            },
            
            summonBees() {
                const count = this.phase === 2 ? this.attacks.bee_summon.count * 2 : this.attacks.bee_summon.count;
                
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    enemies.push({
                        x: this.x + Math.cos(angle) * 100,
                        y: this.y + Math.sin(angle) * 100,
                        type: 'angry_bee',
                        hp: this.attacks.bee_summon.hp,
                        maxHp: this.attacks.bee_summon.hp,
                        aggressive: true
                    });
                }
            },
            
            enragedCharge(player) {
                if (this.phase === 2 && Math.random() < 0.005) {
                    const angle = Math.atan2(player.y - this.y, player.x - this.x);
                    this.vx = Math.cos(angle) * this.attacks.enraged_charge.speed;
                    this.vy = Math.sin(angle) * this.attacks.enraged_charge.speed;
                    
                    setTimeout(() => {
                        this.vx = 0;
                        this.vy = 0;
                    }, 800);
                }
            }
        };
        
        window.BOSSES.hive_queen = hiveBoss;
    },
    
    // === BOSS 5: FROST TITAN ===
    enhanceFrostTitan() {
        const frostBoss = {
            name: 'Frost Titan',
            hp: 5800,
            maxHp: 5800,
            phase: 1,
            phaseThreshold: 0.5,
            
            // Frost aura
            frostAura: { damage: 10, radius: 150, slow: 0.6 },
            
            // Ice spike system
            iceSpikes: [],
            
            attacks: {
                ice_shard: { damage: 40, speed: 9, count: 5 },
                frost_breath: { damage: 50, duration: 4, width: 60 },
                ice_spike_eruption: { damage: 55, delay: 1.5, count: 8 },
                blizzard: { duration: 10, damage: 30, frequency: 0.5 }
            },
            
            blizzardActive: false,
            blizzardTimer: 0,
            
            update(dt, player) {
                // Apply frost aura damage
                const dist = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
                if (dist < this.frostAura.radius) {
                    player.hp -= this.frostAura.damage * dt;
                    player.speed *= this.frostAura.slow;
                }
                
                // Phase transition
                if (this.phase === 1 && this.hp <= this.maxHp * this.phaseThreshold) {
                    this.activateBlizzard();
                }
                
                // Blizzard tick
                if (this.blizzardActive) {
                    this.blizzardTimer += dt;
                    if (this.blizzardTimer >= this.attacks.blizzard.frequency) {
                        player.hp -= this.attacks.blizzard.damage;
                        AnimationSystem.spawnDamageNumber(player.x, player.y, this.attacks.blizzard.damage, false);
                        this.blizzardTimer = 0;
                    }
                }
                
                // Attack patterns
                if (Math.random() < 0.015) {
                    this.shootIceShards(player);
                }
                
                if (this.phase === 2 && Math.random() < 0.01) {
                    this.eruptIceSpikes(player);
                }
                
                // Slow stomping movement
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                this.x += Math.cos(angle) * 1.2;
                this.y += Math.sin(angle) * 1.2;
            },
            
            activateBlizzard() {
                this.phase = 2;
                this.blizzardActive = true;
                this.hp = this.hp * 1.2;
                this.maxHp = this.maxHp * 1.2;
                
                // Visual blizzard effect
                triggerShake(15);
                createSnowStorm(this.x, this.y, 300);
                
                showBossMessage('FROST TITAN SUMMONS BLIZZARD!', '#44CCFF');
            },
            
            shootIceShards(player) {
                for (let i = 0; i < this.attacks.ice_shard.count; i++) {
                    const angle = Math.atan2(player.y - this.y, player.x - this.x) + (i - 2) * 0.25;
                    projectiles.push({
                        x: this.x,
                        y: this.y,
                        vx: Math.cos(angle) * this.attacks.ice_shard.speed,
                        vy: Math.sin(angle) * this.attacks.ice_shard.speed,
                        damage: this.attacks.ice_shard.damage,
                        type: 'ice',
                        freeze: true,
                        size: 10
                    });
                }
            },
            
            eruptIceSpikes(player) {
                for (let i = 0; i < this.attacks.ice_spike_eruption.count; i++) {
                    const angle = (Math.PI * 2 / this.attacks.ice_spike_eruption.count) * i;
                    const spikeX = player.x + Math.cos(angle) * 150;
                    const spikeY = player.y + Math.sin(angle) * 150;
                    
                    setTimeout(() => {
                        iceSpikes.push({
                            x: spikeX,
                            y: spikeY,
                            damage: this.attacks.ice_spike_eruption.damage,
                            duration: 2
                        });
                        
                        createExplosion(spikeX, spikeY, 'ice', 20);
                    }, this.attacks.ice_spike_eruption.delay * 1000);
                }
            }
        };
        
        window.BOSSES.frost_titan = frostBoss;
    }
};

// Initialize boss reworks
BossReworks.init();

console.log('👹 Phase 3: Boss Reworks complete - 5 epic multi-phase bosses ready');
