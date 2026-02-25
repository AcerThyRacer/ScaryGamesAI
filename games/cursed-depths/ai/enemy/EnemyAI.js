/* ============================================================
   CURSED DEPTHS — Advanced Enemy AI System
   Phase 7: 50+ enemies with unique behaviors and cooperation
   ============================================================ */

class EnemyAI {
    constructor() {
        // Enemy Database - 50+ Unique Enemies
        this.ENEMIES = {
            // ========== SLIME FAMILY (8 variants) ==========
            slime_green: {
                id: 'slime_green',
                name: 'Green Slime',
                family: 'slime',
                hp: 25,
                damage: 12,
                defense: 2,
                width: 24,
                height: 16,
                speed: 1.5,
                jumpPower: 6,
                aiType: 'hopper',
                biome: 'forest',
                timeSpawn: 'both',
                rare: false,
                bannerDrop: true,
                coins: [0.5, 1.5],
                drops: ['gel'],
                knockbackResist: 0.3,
                specialAbility: 'split_on_death'
            },
            
            slime_blue: {
                id: 'slime_blue',
                name: 'Blue Slime',
                family: 'slime',
                hp: 35,
                damage: 15,
                defense: 3,
                width: 24,
                height: 16,
                speed: 1.8,
                jumpPower: 7,
                aiType: 'hopper',
                biome: 'forest',
                timeSpawn: 'both',
                rare: false,
                bannerDrop: true,
                coins: [0.8, 2.0],
                drops: ['gel', 'blue_moon'],
                knockbackResist: 0.4
            },
            
            ice_slime: {
                id: 'ice_slime',
                name: 'Ice Slime',
                family: 'slime',
                hp: 45,
                damage: 18,
                defense: 5,
                width: 26,
                height: 18,
                speed: 1.3,
                jumpPower: 5,
                aiType: 'hopper',
                biome: 'snow',
                timeSpawn: 'both',
                rare: false,
                bannerDrop: true,
                coins: [1.0, 2.5],
                drops: ['gel', 'ice_blade_fragment'],
                knockbackResist: 0.5,
                specialAbility: 'freeze_player_on_hit'
            },
            
            jungle_slime: {
                id: 'jungle_slime',
                name: 'Jungle Slime',
                family: 'slime',
                hp: 50,
                damage: 20,
                defense: 4,
                width: 28,
                height: 20,
                speed: 2.0,
                jumpPower: 8,
                aiType: 'hopper',
                biome: 'jungle',
                timeSpawn: 'both',
                rare: false,
                bannerDrop: true,
                coins: [1.2, 3.0],
                drops: ['gel', 'vine_rope'],
                knockbackResist: 0.4,
                specialAbility: 'poison_spit'
            },
            
            corrupt_slime: {
                id: 'corrupt_slime',
                name: 'Corrupt Slime',
                family: 'slime',
                hp: 60,
                damage: 22,
                defense: 6,
                width: 30,
                height: 22,
                speed: 1.6,
                jumpPower: 6,
                aiType: 'hopper',
                biome: 'corruption',
                timeSpawn: 'night',
                rare: false,
                bannerDrop: true,
                coins: [1.5, 3.5],
                drops: ['gel', 'corrupt_seeds'],
                knockbackResist: 0.6,
                specialAbility: 'spread_corruption'
            },
            
            crimson_slime: {
                id: 'crimson_slime',
                name: 'Crimson Slime',
                family: 'slime',
                hp: 60,
                damage: 22,
                defense: 6,
                width: 30,
                height: 22,
                speed: 1.6,
                jumpPower: 6,
                aiType: 'hopper',
                biome: 'crimson',
                timeSpawn: 'night',
                rare: false,
                bannerDrop: true,
                coins: [1.5, 3.5],
                drops: ['gel', 'crimson_seeds'],
                knockbackResist: 0.6,
                specialAbility: 'bleed_effect'
            },
            
            mother_slime: {
                id: 'mother_slime',
                name: 'Mother Slime',
                family: 'slime',
                hp: 150,
                damage: 25,
                defense: 8,
                width: 40,
                height: 28,
                speed: 1.2,
                jumpPower: 5,
                aiType: 'hopper',
                biome: 'forest',
                timeSpawn: 'night',
                rare: true,
                bannerDrop: true,
                coins: [5.0, 10.0],
                drops: ['gel', 'slime_staff', 'royal_gel'],
                knockbackResist: 0.7,
                specialAbility: 'spawn_baby_slimes'
            },
            
            king_slime: {
                id: 'king_slime',
                name: 'King Slime',
                family: 'slime',
                hp: 2000,
                damage: 40,
                defense: 10,
                width: 80,
                height: 50,
                speed: 2.5,
                jumpPower: 10,
                aiType: 'boss',
                biome: 'any',
                timeSpawn: 'both',
                rare: false,
                bannerDrop: false,
                boss: true,
                coins: [0, 0],
                drops: ['slime_hook', 'royal_weapon', 'treasure_bag'],
                knockbackResist: 1.0
            },

            // ========== ZOMBIE FAMILY (10 variants) ==========
            zombie: {
                id: 'zombie',
                name: 'Zombie',
                family: 'undead',
                hp: 50,
                damage: 20,
                defense: 4,
                width: 18,
                height: 36,
                speed: 1.0,
                aiType: 'fighter',
                biome: 'forest',
                timeSpawn: 'night',
                rare: false,
                bannerDrop: true,
                coins: [1.0, 2.5],
                drops: ['zombie_arm', 'shackle'],
                knockbackResist: 0.5,
                specialAbility: 'open_doors'
            },
            
            blood_zombie: {
                id: 'blood_zombie',
                name: 'Blood Zombie',
                family: 'undead',
                hp: 80,
                damage: 30,
                defense: 6,
                width: 20,
                height: 38,
                speed: 1.5,
                aiType: 'fighter',
                biome: 'forest',
                timeSpawn: 'blood_moon',
                rare: true,
                bannerDrop: true,
                coins: [3.0, 7.0],
                drops: ['bloody_tear', 'meatball'],
                knockbackResist: 0.6,
                specialAbility: 'summon_drippler'
            },
            
            corrupt_zombie: {
                id: 'corrupt_zombie',
                name: 'Corrupt Zombie',
                family: 'undead',
                hp: 70,
                damage: 28,
                defense: 8,
                width: 20,
                height: 38,
                speed: 1.8,
                aiType: 'fighter',
                biome: 'corruption',
                timeSpawn: 'night',
                rare: false,
                bannerDrop: true,
                coins: [2.0, 4.5],
                drops: ['rotting_flesh', 'corrupt_teeth'],
                knockbackResist: 0.7
            },
            
            crimson_zombie: {
                id: 'crimson_zombie',
                name: 'Crimson Zombie',
                family: 'undead',
                hp: 70,
                damage: 28,
                defense: 8,
                width: 20,
                height: 38,
                speed: 1.8,
                aiType: 'fighter',
                biome: 'crimson',
                timeSpawn: 'night',
                rare: false,
                bannerDrop: true,
                coins: [2.0, 4.5],
                drops: ['vertebra', 'bloody_spine'],
                knockbackResist: 0.7
            },
            
            jungle_zombie: {
                id: 'jungle_zombie',
                name: 'Jungle Zombie',
                family: 'undead',
                hp: 65,
                damage: 26,
                defense: 5,
                width: 18,
                height: 36,
                speed: 2.0,
                aiType: 'fighter',
                biome: 'jungle',
                timeSpawn: 'night',
                rare: false,
                bannerDrop: true,
                coins: [1.8, 4.0],
                drops: ['jungle_spores', 'vines'],
                knockbackResist: 0.5
            },
            
            undead_viking: {
                id: 'undead_viking',
                name: 'Undead Viking',
                family: 'undead',
                hp: 100,
                damage: 35,
                defense: 10,
                width: 22,
                height: 40,
                speed: 1.3,
                aiType: 'fighter',
                biome: 'snow',
                timeSpawn: 'night',
                rare: false,
                bannerDrop: true,
                coins: [3.0, 6.0],
                drops: ['viking_helmet', 'frozen_shield'],
                knockbackResist: 0.8
            },
            
            toxic_sludge: {
                id: 'toxic_sludge',
                name: 'Toxic Sludge',
                family: 'slime',
                hp: 90,
                damage: 32,
                defense: 7,
                width: 26,
                height: 20,
                speed: 1.4,
                jumpPower: 6,
                aiType: 'hopper',
                biome: 'underground_jungle',
                timeSpawn: 'both',
                rare: false,
                bannerDrop: true,
                coins: [2.5, 5.0],
                drops: ['toxic_vial', 'stinger'],
                knockbackResist: 0.6,
                specialAbility: 'poison_cloud'
            },

            // ========== SKELETON FAMILY (8 variants) ==========
            skeleton: {
                id: 'skeleton',
                name: 'Skeleton',
                family: 'undead',
                hp: 55,
                damage: 22,
                defense: 6,
                width: 16,
                height: 38,
                speed: 1.2,
                aiType: 'fighter',
                biome: 'caverns',
                timeSpawn: 'both',
                rare: false,
                bannerDrop: true,
                coins: [1.5, 3.0],
                drops: ['bone', 'skull', 'ancient_gold_helmet'],
                knockbackResist: 0.4,
                specialAbility: 'throw_bone'
            },
            
            headless_horseman: {
                id: 'headless_horseman',
                name: 'Headless Horseman',
                family: 'undead',
                hp: 300,
                damage: 50,
                defense: 15,
                width: 30,
                height: 50,
                speed: 3.5,
                aiType: 'charger',
                biome: 'forest',
                timeSpawn: 'halloween',
                rare: true,
                bannerDrop: true,
                coins: [10.0, 20.0],
                drops: ['horseman_blade', 'cursed_sapling'],
                knockbackResist: 0.9,
                specialAbility: 'pumpkin_projectile'
            },

            // ========== DEMON FAMILY (6 variants) ==========
            demon_eye: {
                id: 'demon_eye',
                name: 'Demon Eye',
                family: 'demon',
                hp: 40,
                damage: 18,
                defense: 3,
                width: 20,
                height: 20,
                speed: 3.0,
                aiType: 'flier',
                biome: 'forest',
                timeSpawn: 'night',
                rare: false,
                bannerDrop: true,
                coins: [1.0, 2.0],
                drops: ['lens', 'black_lens', 'demonic_eye'],
                knockbackResist: 0.3,
                specialAbility: 'charge_attack'
            },
            
            corruptor: {
                id: 'corruptor',
                name: 'Corruptor',
                family: 'demon',
                hp: 100,
                damage: 35,
                defense: 10,
                width: 24,
                height: 24,
                speed: 2.5,
                aiType: 'flier',
                biome: 'corruption',
                timeSpawn: 'hardmode',
                rare: false,
                bannerDrop: true,
                coins: [4.0, 8.0],
                drops: ['cursed_flame', 'souls_of_night'],
                knockbackResist: 0.5,
                specialAbility: 'spit_cursed_flame'
            },

            // ========== SPECIAL ENEMIES (15+) ==========
            antlion: {
                id: 'antlion',
                name: 'Antlion',
                family: 'insect',
                hp: 30,
                damage: 15,
                defense: 2,
                width: 16,
                height: 16,
                speed: 0,
                aiType: 'stationary',
                biome: 'desert',
                timeSpawn: 'both',
                rare: false,
                bannerDrop: true,
                coins: [0.5, 1.5],
                drops: ['antlion_mandible'],
                knockbackResist: 1.0,
                specialAbility: 'shoot_sand'
            },
            
            man_eater: {
                id: 'man_eater',
                name: 'Man Eater',
                family: 'plant',
                hp: 80,
                damage: 30,
                defense: 8,
                width: 20,
                height: 40,
                speed: 0,
                aiType: 'stationary',
                biome: 'jungle',
                timeSpawn: 'both',
                rare: false,
                bannerDrop: true,
                coins: [2.0, 4.0],
                drops: ['vine', 'nature_gift'],
                knockbackResist: 0.9,
                specialAbility: 'bite_attack'
            },
            
            hornet: {
                id: 'hornet',
                name: 'Hornet',
                family: 'insect',
                hp: 45,
                damage: 20,
                defense: 4,
                width: 18,
                height: 18,
                speed: 3.5,
                aiType: 'flier',
                biome: 'jungle',
                timeSpawn: 'both',
                rare: false,
                bannerDrop: true,
                coins: [1.2, 2.8],
                drops: ['bee_wax', 'stinger'],
                knockbackResist: 0.4,
                specialAbility: 'shoot_stinger'
            },
            
            bat: {
                id: 'bat',
                name: 'Bat',
                family: 'creature',
                hp: 30,
                damage: 15,
                defense: 2,
                width: 16,
                height: 12,
                speed: 4.0,
                aiType: 'flier',
                biome: 'caverns',
                timeSpawn: 'night',
                rare: false,
                bannerDrop: true,
                coins: [0.8, 1.8],
                drops: ['bat_wing', 'depth_meter'],
                knockbackResist: 0.3,
                specialAbility: 'echolocation'
            },
            
            mimic: {
                id: 'mimic',
                name: 'Mimic',
                family: 'special',
                hp: 250,
                damage: 45,
                defense: 15,
                width: 32,
                height: 32,
                speed: 2.0,
                aiType: 'passive_aggressive',
                biome: 'any',
                timeSpawn: 'hardmode',
                rare: true,
                bannerDrop: true,
                coins: [10.0, 25.0],
                drops: ['mimic_trophy', 'daedalus_stormbow'],
                knockbackResist: 0.7,
                specialAbility: 'disguise_as_chest'
            },
            
            wraith: {
                id: 'wraith',
                name: 'Wraith',
                family: 'undead',
                hp: 90,
                damage: 35,
                defense: 8,
                width: 22,
                height: 28,
                speed: 2.8,
                aiType: 'flier',
                biome: 'hell',
                timeSpawn: 'night',
                rare: false,
                bannerDrop: true,
                coins: [3.0, 6.0],
                drops: ['ecto_plasma', 'soul_of_night'],
                knockbackResist: 0.5,
                specialAbility: 'phase_through_blocks'
            }
        };

        // Active enemies array
        this.activeEnemies = [];
        
        // AI state machines
        this.aiStates = {};
        
        // Cooperation groups
        this.cooperationGroups = [];
        
        // Enemy spawning configuration
        this.spawnConfig = {
            maxEnemies: 15,
            spawnRate: 0.02,
            maxSpawnsPerWave: 5,
            biomeSpawnBonus: 1.5,
            nightSpawnMultiplier: 2.0,
            eventSpawnMultiplier: 3.0
        };

        // Banners collected
        this.bannersCollected = {};
        
        // Kill counts for banners
        this.killCounts = {};
    }

    init() {
        console.log(`[EnemyAI] Initialized with ${Object.keys(this.ENEMIES).length} enemy types`);
    }

    update(dt, player, world, camera) {
        // Update all active enemies
        for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
            const enemy = this.activeEnemies[i];
            
            if (!enemy.active || enemy.hp <= 0) {
                this.activeEnemies.splice(i, 1);
                continue;
            }
            
            // Run AI behavior
            this.updateEnemyAI(enemy, player, world, dt);
            
            // Apply physics
            this.applyEnemyPhysics(enemy, world, dt);
            
            // Check collisions with player
            this.checkPlayerCollision(enemy, player);
            
            // Remove if too far away
            if (this.isTooFarAway(enemy, camera)) {
                this.activeEnemies.splice(i, 1);
            }
        }
        
        // Update cooperation groups
        this.updateCooperationGroups();
    }

    updateEnemyAI(enemy, player, world, dt) {
        const aiType = enemy.aiType;
        const data = this.ENEMIES[enemy.type];
        
        switch (aiType) {
            case 'fighter':
                this.fighterAI(enemy, player, world, data);
                break;
            case 'hopper':
                this.hopperAI(enemy, player, world, data);
                break;
            case 'flier':
                this.flierAI(enemy, player, world, data);
                break;
            case 'charger':
                this.chargerAI(enemy, player, world, data);
                break;
            case 'stationary':
                this.stationaryAI(enemy, player, world, data);
                break;
            case 'passive_aggressive':
                this.passiveAggressiveAI(enemy, player, world, data);
                break;
            case 'boss':
                this.bossAI(enemy, player, world, data, dt);
                break;
        }
        
        // Execute special abilities
        if (data.specialAbility) {
            this.executeSpecialAbility(enemy, player, world, data.specialAbility);
        }
    }

    fighterAI(enemy, player, world, data) {
        // Basic fighter: walk toward player, jump over obstacles
        const dx = player.x - enemy.x;
        const distance = Math.abs(dx);
        
        // Move toward player
        if (dx > 0) {
            enemy.vx = data.speed;
            enemy.facing = 1;
        } else {
            enemy.vx = -data.speed;
            enemy.facing = -1;
        }
        
        // Jump if there's a block in front
        if (this.detectObstacle(enemy, world) && enemy.onGround) {
            enemy.vy = -data.jumpPower;
        }
        
        // Special: Zombies open doors
        if (data.specialAbility === 'open_doors') {
            this.tryOpenDoor(enemy, world);
        }
    }

    hopperAI(enemy, player, world, data) {
        // Slime AI: hop randomly but generally toward player
        if (enemy.onGround) {
            // Random hop interval
            if (Math.random() < 0.02) {
                enemy.vy = -data.jumpPower;
                
                // Small horizontal movement toward player
                const dx = player.x - enemy.x;
                enemy.vx = Math.sign(dx) * data.speed * 0.5;
            }
        }
    }

    flierAI(enemy, player, world, data) {
        // Flying enemy: move directly toward player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            enemy.vx = (dx / distance) * data.speed;
            enemy.vy = (dy / distance) * data.speed * 0.5;
        }
        
        // Face player
        enemy.facing = dx > 0 ? 1 : -1;
        
        // Special: Demon Eyes charge
        if (data.specialAbility === 'charge_attack') {
            this.demonEyeCharge(enemy, player);
        }
    }

    chargerAI(enemy, player, world, data) {
        // Charger: build up speed and ram into player
        const dx = player.x - enemy.x;
        const distance = Math.abs(dx);
        
        // Accelerate toward player
        if (dx > 0) {
            enemy.vx += 0.2;
            enemy.facing = 1;
        } else {
            enemy.vx -= 0.2;
            enemy.facing = -1;
        }
        
        // Cap speed
        enemy.vx = Math.max(-data.speed * 3, Math.min(data.speed * 3, enemy.vx));
    }

    stationaryAI(enemy, player, world, data) {
        // Stationary enemies: attack from fixed position
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Face player
        enemy.facing = dx > 0 ? 1 : -1;
        
        // Attack if player in range
        if (distance < 300) {
            this.stationaryAttack(enemy, player, data);
        }
    }

    passiveAggressiveAI(enemy, player, world, data) {
        // Mimic: appear passive until player gets close
        const distance = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
        
        if (enemy.disguised) {
            // Stay still while disguised
            enemy.vx = 0;
            enemy.vy = 0;
            
            // Reveal when player gets close
            if (distance < 100) {
                enemy.disguised = false;
                showStatusMessage(`${data.name} reveals itself!`);
            }
        } else {
            // Aggressive mode
            this.fighterAI(enemy, player, world, data);
        }
    }

    bossAI(enemy, player, world, data, dt) {
        // Boss AI template - specific bosses override this
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        
        // Simple follow behavior
        if (Math.abs(dx) > 50) {
            enemy.vx = Math.sign(dx) * data.speed;
        } else {
            enemy.vx *= 0.9;
        }
        
        if (Math.abs(dy) > 30) {
            enemy.vy = Math.sign(dy) * data.speed * 0.5;
        }
        
        enemy.facing = dx > 0 ? 1 : -1;
    }

    executeSpecialAbility(enemy, player, world, ability) {
        const now = Date.now();
        
        switch (ability) {
            case 'throw_bone':
                if (now - enemy.lastAbility > 3000) {
                    this.throwBone(enemy, player);
                    enemy.lastAbility = now;
                }
                break;
                
            case 'spit_cursed_flame':
                if (now - enemy.lastAbility > 2000) {
                    this.spitCursedFlame(enemy, player);
                    enemy.lastAbility = now;
                }
                break;
                
            case 'shoot_stinger':
                if (now - enemy.lastAbility > 1500) {
                    this.shootStinger(enemy, player);
                    enemy.lastAbility = now;
                }
                break;
                
            case 'poison_spit':
                if (now - enemy.lastAbility > 2500) {
                    this.poisonSpit(enemy, player);
                    enemy.lastAbility = now;
                }
                break;
                
            case 'spawn_baby_slimes':
                if (enemy.hp < enemy.maxHp * 0.5 && !enemy.hasSpawned) {
                    this.spawnBabySlimes(enemy, world);
                    enemy.hasSpawned = true;
                }
                break;
        }
    }

    throwBone(enemy, player) {
        // Create bone projectile
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        projectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: (dx / dist) * 8,
            vy: (dy / dist) * 8,
            damage: 15,
            type: 'bone',
            life: 120
        });
    }

    spitCursedFlame(enemy, player) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        projectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: (dx / dist) * 6,
            vy: (dy / dist) * 6 - 2,
            damage: 25,
            type: 'cursed_flame',
            life: 180,
            debuff: 'cursed_inferno'
        });
    }

    shootStinger(enemy, player) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        projectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: (dx / dist) * 7,
            vy: (dy / dist) * 7,
            damage: 18,
            type: 'stinger',
            life: 150
        });
    }

    poisonSpit(enemy, player) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        projectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: (dx / dist) * 5,
            vy: (dy / dist) * 5 - 3,
            damage: 20,
            type: 'poison',
            life: 200,
            debuff: 'poisoned'
        });
    }

    spawnBabySlimes(enemy, world) {
        showStatusMessage('Mother Slime spawns babies!');
        
        // Spawn 3-5 baby slimes
        const count = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < count; i++) {
            const offsetX = (Math.random() - 0.5) * 100;
            const offsetY = (Math.random() - 0.5) * 50;
            
            this.spawnEnemy('slime_green', enemy.x + offsetX, enemy.y + offsetY);
        }
    }

    applyEnemyPhysics(enemy, world, dt) {
        // Gravity
        enemy.vy += 0.5;
        
        // Apply velocity
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        
        // Collision detection
        enemy.onGround = this.checkGroundCollision(enemy, world);
        this.checkWallCollision(enemy, world);
        
        // Friction
        enemy.vx *= 0.9;
    }

    checkPlayerCollision(enemy, player) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (player.w + enemy.width) / 2) {
            // Deal damage
            const damage = Math.max(1, enemy.damage - player.defense * 0.5);
            player.hp -= damage;
            
            // Knockback
            const knockback = 5 * (1 - enemy.knockbackResist);
            player.vx += Math.sign(dx) * knockback;
            player.vy -= 3;
            
            // Invincibility frames
            player.invincible = 30;
            
            // Spawn damage number
            Particles.spawnCombatParticle(player.x, player.y - 20, damage, false);
        }
    }

    detectObstacle(enemy, world) {
        const checkX = enemy.x + enemy.facing * 20;
        const checkY = enemy.y + 10;
        
        const tileX = Math.floor(checkX / TILE);
        const tileY = Math.floor(checkY / TILE);
        
        if (tileX >= 0 && tileX < WORLD_W && tileY >= 0 && tileY < WORLD_H) {
            const tile = world[tileX + tileY * WORLD_W];
            return tile !== T.AIR;
        }
        
        return false;
    }

    tryOpenDoor(enemy, world) {
        const checkX = enemy.x + enemy.facing * 20;
        const checkY = enemy.y;
        
        const tileX = Math.floor(checkX / TILE);
        const tileY = Math.floor(checkY / TILE);
        
        if (tileX >= 0 && tileX < WORLD_W && tileY >= 0 && tileY < WORLD_H) {
            const tile = world[tileX + tileY * WORLD_W];
            if (tile === T.DOOR) {
                world[tileX + tileY * WORLD_W] = T.AIR; // Open door
            }
        }
    }

    demonEyeCharge(enemy, player) {
        const distance = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
        
        if (distance < 200 && Math.random() < 0.01) {
            // Charge at player
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            enemy.vx = (dx / dist) * 8;
            enemy.vy = (dy / dist) * 8;
        }
    }

    stationaryAttack(enemy, player, data) {
        if (data.specialAbility === 'bite_attack') {
            // Man Eater bite
            const reach = 40;
            const distance = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
            
            if (distance < reach && Math.random() < 0.02) {
                // Bite player
                const damage = data.damage;
                player.hp -= damage;
                Particles.spawnCombatParticle(player.x, player.y, damage, false);
            }
        } else if (data.specialAbility === 'shoot_sand') {
            // Antlion sand projectile
            if (Math.random() < 0.015) {
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                projectiles.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: (dx / dist) * 6,
                    vy: (dy / dist) * 6 - 4,
                    damage: 12,
                    type: 'sand',
                    life: 100
                });
            }
        }
    }

    spawnEnemy(type, x, y) {
        const data = this.ENEMIES[type];
        if (!data) return null;
        
        const enemy = {
            type,
            x,
            y,
            vx: 0,
            vy: 0,
            hp: data.hp,
            maxHp: data.hp,
            damage: data.damage,
            defense: data.defense,
            width: data.width,
            height: data.height,
            speed: data.speed,
            jumpPower: data.jumpPower || 0,
            aiType: data.aiType,
            facing: 1,
            onGround: false,
            active: true,
            knockbackResist: data.knockbackResist,
            lastAbility: 0,
            disguised: data.specialAbility === 'disguise_as_chest'
        };
        
        this.activeEnemies.push(enemy);
        return enemy;
    }

    registerKill(enemyType) {
        // Track kills for banners
        this.killCounts[enemyType] = (this.killCounts[enemyType] || 0) + 1;
        
        // Check for banner drop (every 50 kills)
        const data = this.ENEMIES[enemyType];
        if (data.bannerDrop && this.killCounts[enemyType] % 50 === 0) {
            this.bannersCollected[enemyType] = true;
            showStatusMessage(`Banner unlocked: ${data.name}!`);
        }
    }

    getBannerBonus(enemyType) {
        // Banners provide damage bonus and defense reduction
        if (this.bannersCollected[enemyType]) {
            return {
                damageBonus: 1.5,
                defenseReduction: 10
            };
        }
        return {
            damageBonus: 1.0,
            defenseReduction: 0
        };
    }

    isTooFarAway(enemy, camera) {
        const margin = 200;
        return (
            enemy.x < camera.x - margin ||
            enemy.x > camera.x + W + margin ||
            enemy.y < camera.y - margin ||
            enemy.y > camera.y + H + margin
        );
    }

    updateCooperationGroups() {
        // Enemies in cooperation groups help each other
        for (const group of this.cooperationGroups) {
            let hasAggro = false;
            
            // Check if any member is aggroed
            for (const enemy of group.members) {
                if (enemy.aggroed) {
                    hasAggro = true;
                    break;
                }
            }
            
            // Spread aggro to group members
            if (hasAggro) {
                for (const enemy of group.members) {
                    enemy.aggroed = true;
                }
            }
        }
    }

    render(ctx, camera) {
        for (const enemy of this.activeEnemies) {
            const screenX = enemy.x - camera.x;
            const screenY = enemy.y - camera.y;
            
            // Skip if off-screen
            if (screenX < -50 || screenX > W + 50 || screenY < -50 || screenY > H + 50) {
                continue;
            }
            
            const data = this.ENEMIES[enemy.type];
            
            // Draw enemy based on type
            this.drawEnemy(ctx, enemy, data, screenX, screenY);
            
            // Draw health bar for larger enemies
            if (enemy.maxHp > 50) {
                this.drawEnemyHealthBar(ctx, enemy, screenX, screenY);
            }
        }
    }

    drawEnemy(ctx, enemy, data, x, y) {
        ctx.fillStyle = this.getEnemyColor(enemy.type);
        
        if (enemy.aiType === 'hopper') {
            // Slime body
            ctx.beginPath();
            ctx.ellipse(x, y, data.width / 2, data.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Eyes
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(x - 5, y - 5, 4, 0, Math.PI * 2);
            ctx.arc(x + 5, y - 5, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(x - 5, y - 5, 2, 0, Math.PI * 2);
            ctx.arc(x + 5, y - 5, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (enemy.aiType === 'fighter') {
            // Humanoid body
            ctx.fillRect(x - data.width / 2, y - data.height / 2, data.width, data.height);
            
            // Head
            ctx.fillStyle = '#DDCCBB';
            ctx.beginPath();
            ctx.arc(x, y - data.height / 2 - 8, 10, 0, Math.PI * 2);
            ctx.fill();
        } else if (enemy.aiType === 'flier') {
            // Flying enemy
            ctx.beginPath();
            ctx.arc(x, y, data.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Wings
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            const wingOffset = Math.sin(Date.now() * 0.02) * 5;
            ctx.beginPath();
            ctx.ellipse(x - 10, y + wingOffset, 8, 4, 0.3, 0, Math.PI * 2);
            ctx.ellipse(x + 10, y - wingOffset, 8, 4, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getEnemyColor(type) {
        const colors = {
            slime_green: '#44AA44',
            slime_blue: '#4444AA',
            ice_slime: '#AADDFF',
            jungle_slime: '#22AA22',
            corrupt_slime: '#AA44AA',
            crimson_slime: '#AA2222',
            zombie: '#448844',
            skeleton: '#DDDDCC',
            demon_eye: '#AA2222',
            bat: '#6644AA'
        };
        
        return colors[type] || '#FFFFFF';
    }

    drawEnemyHealthBar(ctx, enemy, x, y) {
        const barWidth = 40;
        const barHeight = 4;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(x - barWidth / 2, y - enemy.height / 2 - 10, barWidth, barHeight);
        
        // Health
        const healthPercent = enemy.hp / enemy.maxHp;
        ctx.fillStyle = healthPercent > 0.5 ? '#44FF44' : healthPercent > 0.25 ? '#FFFF44' : '#FF4444';
        ctx.fillRect(x - barWidth / 2, y - enemy.height / 2 - 10, barWidth * healthPercent, barHeight);
    }
}

// Global enemy AI instance
const EnemySystem = new EnemyAI();

// Initialize on game start
function initEnemyAI() {
    EnemySystem.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnemyAI, EnemySystem, initEnemyAI };
}
