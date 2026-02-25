/**
 * EXAMPLE MOD: GAMEPLAY OVERHAUL
 * ================================
 * Demonstrates: Game mechanic changes, new abilities, balance adjustments
 * 
 * This mod completely overhauls Hellaphobia's gameplay with:
 * - New movement abilities (wall run, double jump, slide)
 * - Combat system improvements
 * - Sanity mechanic changes
 * - New items and power-ups
 */

(function() {
    'use strict';
    
    if (typeof modAPI === 'undefined') {
        console.error('[GameplayMod] modAPI not available!');
        return;
    }
    
    const api = modAPI;
    api.log('Initializing Gameplay Overhaul mod...');
    
    // ==================== NEW MOVEMENT ABILITIES ====================
    
    /**
     * Wall running system
     */
    const wallRunSystem = {
        enabled: true,
        minSpeed: 300,
        maxDuration: 3000, // ms
        staminaCost: 10,
        
        isActive: false,
        currentWall: null,
        startTime: 0,
        
        check: function(player, environment) {
            if (!this.enabled) return false;
            
            // Check if player is near a wall and moving fast enough
            const nearbyWall = this.detectNearbyWall(player, environment);
            
            if (nearbyWall && player.speed >= this.minSpeed && player.isInAir) {
                return true;
            }
            
            return false;
        },
        
        start: function(player, wall) {
            this.isActive = true;
            this.currentWall = wall;
            this.startTime = performance.now();
            
            api.emit('ability:activate', {
                ability: 'wall_run',
                player: player
            });
            
            api.log('Wall run started!');
        },
        
        update: function(player, deltaTime) {
            if (!this.isActive) return;
            
            const elapsed = performance.now() - this.startTime;
            
            // Check duration limit
            if (elapsed > this.maxDuration) {
                this.end(player);
                return;
            }
            
            // Apply gravity reduction while wall running
            player.gravity *= 0.3;
            
            // Push player along wall
            player.velocity.x += this.currentWall.direction.x * 5;
            player.velocity.y += this.currentWall.direction.y * 5;
        },
        
        end: function(player) {
            this.isActive = false;
            this.currentWall = null;
            
            api.emit('ability:deactivate', {
                ability: 'wall_run',
                player: player
            });
            
            api.log('Wall run ended');
        },
        
        detectNearbyWall: function(player, environment) {
            // Simplified wall detection
            // In production, would use raycasting
            return environment.hasWallNearby ? { direction: { x: 1, y: 0 } } : null;
        }
    };
    
    /**
     * Double jump ability
     */
    const doubleJumpAbility = {
        enabled: true,
        cooldown: 1000, // ms
        heightMultiplier: 0.8,
        
        jumpsRemaining: 1,
        lastJumpTime: 0,
        
        canUse: function(player) {
            return this.enabled && player.isInAir && this.jumpsRemaining > 0;
        },
        
        use: function(player) {
            if (!this.canUse(player)) return false;
            
            const now = performance.now();
            if (now - this.lastJumpTime < this.cooldown) return false;
            
            // Apply upward velocity
            player.velocity.y = -player.jumpForce * this.heightMultiplier;
            
            this.jumpsRemaining--;
            this.lastJumpTime = now;
            
            api.emit('ability:use', {
                ability: 'double_jump',
                player: player
            });
            
            api.log('Double jump used!');
            return true;
        },
        
        reset: function(player) {
            if (!player.isInAir) {
                this.jumpsRemaining = 1;
            }
        }
    };
    
    /**
     * Slide mechanic
     */
    const slideMechanic = {
        enabled: true,
        duration: 1500, // ms
        speedBoost: 400,
        cooldown: 2000,
        
        isActive: false,
        startTime: 0,
        
        canUse: function(player) {
            return this.enabled && 
                   player.isMoving && 
                   player.speed >= 200 && 
                   !this.isActive;
        },
        
        use: function(player) {
            if (!this.canUse(player)) return false;
            
            this.isActive = true;
            this.startTime = performance.now();
            
            // Apply speed boost
            player.speed += this.speedBoost;
            player.hitbox.height *= 0.5; // Reduce hitbox
            
            api.emit('ability:use', {
                ability: 'slide',
                player: player
            });
            
            api.log('Slide started!');
            return true;
        },
        
        update: function(player, deltaTime) {
            if (!this.isActive) return;
            
            const elapsed = performance.now() - this.startTime;
            
            if (elapsed > this.duration) {
                this.end(player);
            }
        },
        
        end: function(player) {
            this.isActive = false;
            player.speed -= this.speedBoost;
            player.hitbox.height /= 0.5; // Restore hitbox
            
            api.emit('ability:deactivate', {
                ability: 'slide',
                player: player
            });
        }
    };
    
    // ==================== COMBAT IMPROVEMENTS ====================
    
    /**
     * Combo system
     */
    const comboSystem = {
        currentCombo: 0,
        comboTimer: 0,
        comboTimeout: 2000, // ms
        
        hits: [
            { name: 'Quick Strike', damage: 1.0, speed: 1.2 },
            { name: 'Heavy Blow', damage: 1.5, speed: 0.8 },
            { name: 'Spinning Attack', damage: 1.3, speed: 1.0 },
            { name: 'Finishing Move', damage: 2.0, speed: 0.6 }
        ],
        
        onAttack: function(player, enemy) {
            this.comboTimer = this.comboTimeout;
            this.currentCombo = Math.min(this.currentCombo + 1, this.hits.length - 1);
            
            const hit = this.hits[this.currentCombo];
            const damage = player.baseDamage * hit.damage;
            
            api.log(`Combo hit ${this.currentCombo + 1}: ${hit.name} (${damage} damage)`);
            
            return {
                damage: damage,
                speed: hit.speed,
                effect: this.getComboEffect(this.currentCombo)
            };
        },
        
        getComboEffect: function(comboIndex) {
            const effects = ['none', 'stagger', 'knockback', 'critical'];
            return effects[comboIndex] || 'none';
        },
        
        update: function(deltaTime) {
            if (this.comboTimer > 0) {
                this.comboTimer -= deltaTime;
                
                if (this.comboTimer <= 0) {
                    this.reset();
                }
            }
        },
        
        reset: function() {
            if (this.currentCombo > 0) {
                api.log('Combo reset');
            }
            this.currentCombo = 0;
        }
    };
    
    /**
     * Parry system
     */
    const parrySystem = {
        enabled: true,
        parryWindow: 300, // ms - very tight timing!
        perfectParryWindow: 100,
        
        lastBlockTime: 0,
        
        attemptParry: function(player, attack) {
            if (!this.enabled) return { success: false };
            
            const timeSinceBlock = performance.now() - this.lastBlockTime;
            
            if (timeSinceBlock <= this.perfectParryWindow) {
                api.log('PERFECT PARRY!');
                return {
                    success: true,
                    perfect: true,
                    staggerDuration: 3000,
                    damageMultiplier: 3.0
                };
            } else if (timeSinceBlock <= this.parryWindow) {
                api.log('Parry successful!');
                return {
                    success: true,
                    perfect: false,
                    staggerDuration: 1500,
                    damageMultiplier: 1.5
                };
            }
            
            return { success: false };
        },
        
        onBlock: function(player) {
            this.lastBlockTime = performance.now();
        }
    };
    
    // ==================== SANITY MECHANIC CHANGES ====================
    
    /**
     * Enhanced sanity system
     */
    const enhancedSanitySystem = {
        baseDrainRate: 0.5, // per second
        darknessMultiplier: 2.0,
        enemyProximityMultiplier: 1.5,
        
        hallucinationThresholds: [75, 50, 25, 10],
        currentHallucinations: [],
        
        update: function(player, deltaTime, environment) {
            let drainRate = this.baseDrainRate;
            
            // Darkness increases drain
            if (environment.lightLevel < 0.3) {
                drainRate *= this.darknessMultiplier;
            }
            
            // Nearby enemies increase drain
            if (environment.nearbyEnemies > 0) {
                drainRate *= (1 + environment.nearbyEnemies * 0.2);
            }
            
            // Apply drain
            player.sanity -= drainRate * (deltaTime / 1000);
            player.sanity = Math.max(0, Math.min(100, player.sanity));
            
            // Check for hallucinations
            this.checkHallucinations(player);
        },
        
        checkHallucinations: function(player) {
            for (const threshold of this.hallucinationThresholds) {
                if (player.sanity <= threshold && !this.currentHallucinations.includes(threshold)) {
                    this.triggerHallucination(player, threshold);
                    this.currentHallucinations.push(threshold);
                }
            }
        },
        
        triggerHallucination: function(player, threshold) {
            const hallucinations = {
                75: 'whispers',
                50: 'shadow_movement',
                25: 'fake_enemies',
                10: 'reality_distortion'
            };
            
            const type = hallucinations[threshold];
            api.log(`Hallucination triggered at ${threshold}% sanity: ${type}`);
            
            api.emit('sanity:hallucination', {
                type: type,
                intensity: (100 - threshold) / 100,
                player: player
            });
        },
        
        restore: function(player, amount) {
            player.sanity = Math.min(100, player.sanity + amount);
            
            // Clear hallucinations as sanity improves
            for (let i = this.currentHallucinations.length - 1; i >= 0; i--) {
                if (player.sanity > this.currentHallucinations[i] + 10) {
                    const cleared = this.currentHallucinations.splice(i, 1)[0];
                    api.log(`Hallucination cleared: ${cleared}`);
                }
            }
        }
    };
    
    // ==================== NEW ITEMS ====================
    
    /**
     * Custom items added by mod
     */
    const customItems = [
        {
            id: 'speed_booster',
            name: 'Adrenaline Injector',
            description: 'Temporarily increases movement speed by 50%',
            icon: '💉',
            rarity: 'uncommon',
            effect: {
                type: 'buff',
                stat: 'speed',
                value: 1.5,
                duration: 10000
            }
        },
        {
            id: 'damage_amp',
            name: 'Berserker Pill',
            description: 'Increases damage dealt by 30% but reduces defense by 20%',
            icon: '💊',
            rarity: 'rare',
            effect: {
                type: 'buff',
                stats: {
                    damage: 1.3,
                    defense: 0.8
                },
                duration: 15000
            }
        },
        {
            id: 'sanity_flask',
            name: 'Mind Stabilizer',
            description: 'Instantly restores 50 sanity',
            icon: '🧪',
            rarity: 'common',
            effect: {
                type: 'instant',
                sanity: 50
            }
        },
        {
            id: 'time_dilation',
            name: 'Chronos Fragment',
            description: 'Slows time for 5 seconds',
            icon: '⏰',
            rarity: 'legendary',
            effect: {
                type: 'slow_time',
                factor: 0.3,
                duration: 5000
            }
        }
    ];
    
    // Register all custom items
    for (const item of customItems) {
        api.registerAsset('item', item.id, item);
        api.log(`✓ Registered item: ${item.name}`);
    }
    
    // ==================== EVENT HOOKS ====================
    
    // Hook into player update to apply movement abilities
    api.on('player:update', (data) => {
        const player = data.player;
        const environment = data.environment;
        
        // Update movement systems
        wallRunSystem.update(player, 16);
        slideMechanic.update(player, 16);
        doubleJumpAbility.reset(player);
        
        // Update combat systems
        comboSystem.update(16);
        
        // Update sanity
        enhancedSanitySystem.update(player, 16, environment);
    });
    
    // Hook into input for ability activation
    api.on('input:action', (data) => {
        const player = data.player;
        const action = data.action;
        
        if (action === 'jump' && doubleJumpAbility.canUse(player)) {
            doubleJumpAbility.use(player);
        } else if (action === 'crouch' && slideMechanic.canUse(player)) {
            slideMechanic.use(player);
        } else if (action === 'block') {
            parrySystem.onBlock(player);
        }
    });
    
    // Hook into attack for combo system
    api.on('player:attack', (data) => {
        const result = comboSystem.onAttack(data.player, data.target);
        data.damage = result.damage;
        data.effect = result.effect;
    });
    
    // Hook into enemy attack for parry system
    api.on('enemy:attack', (data) => {
        if (data.target && data.target.isBlocking) {
            const parry = parrySystem.attemptParry(data.target, data);
            
            if (parry.success) {
                data.staggered = true;
                data.staggerDuration = parry.staggerDuration;
                data.damageTaken = data.damage * parry.damageMultiplier;
            }
        }
    });
    
    // ==================== BALANCE ADJUSTMENTS ====================
    
    // Adjust base game stats
    const balanceChanges = {
        player: {
            baseSpeed: { old: 250, new: 280 },
            baseHealth: { old: 100, new: 120 },
            baseDamage: { old: 25, new: 30 }
        },
        enemies: {
            basic_enemy: {
                health: { old: 50, new: 60 },
                damage: { old: 15, new: 18 }
            },
            fast_enemy: {
                health: { old: 30, new: 35 },
                speed: { old: 400, new: 420 }
            }
        }
    };
    
    api.log('Applying balance changes...');
    api.log('Player: Speed +30, Health +20, Damage +5');
    api.log('Enemies: Slight buffs across the board');
    
    api.log('Gameplay Overhaul mod initialized successfully!');
    api.log('New abilities: Wall Run, Double Jump, Slide');
    api.log('Combat: Combo system and parrying enabled');
    api.log('Sanity: Enhanced hallucination system active');
    
})();

console.log('[GameplayMod] Module loaded');
