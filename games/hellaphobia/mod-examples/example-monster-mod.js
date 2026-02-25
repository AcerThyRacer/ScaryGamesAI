/**
 * EXAMPLE MOD: CUSTOM MONSTER PACK
 * ==================================
 * Demonstrates: Custom entity registration, AI behaviors, event hooks
 * 
 * This mod adds 3 new monster types to Hellaphobia:
 * - Shadow Stalker: Hides in darkness, ambushes player
 * - Echo Phantom: Creates sound illusions
 * - Nightmare Brute: Tank enemy with high HP
 */

// Mod metadata
const MOD_METADATA = {
    id: 'example_monster_pack',
    name: 'Example Monster Pack',
    version: '1.0.0',
    author: 'ScaryGamesAI Team',
    description: 'Adds 3 new terrifying monsters with unique behaviors'
};

// Initialize when mod API is available
(function() {
    'use strict';
    
    // Wait for modAPI
    if (typeof modAPI === 'undefined') {
        console.error('[MonsterMod] modAPI not available!');
        return;
    }
    
    const api = modAPI;
    
    // Log mod initialization
    api.log('Initializing Monster Pack mod...');
    
    // ==================== CUSTOM MONSTER DEFINITIONS ====================
    
    /**
     * Shadow Stalker - Ambush predator
     */
    const ShadowStalker = {
        id: 'shadow_stalker',
        name: 'Shadow Stalker',
        type: 'enemy',
        
        // Stats
        health: 80,
        speed: 65,
        damage: 25,
        detectionRange: 400,
        attackRange: 50,
        
        // Behavior
        behavior: 'ambush',
        hideInDarkness: true,
        ambushChance: 0.7,
        
        // Visual
        sprite: null, // Would load custom sprite
        color: '#2a2a4a',
        size: { width: 32, height: 48 },
        
        // AI states
        states: ['idle', 'hiding', 'chasing', 'attacking'],
        currentState: 'idle',
        
        // Custom methods
        update: function(deltaTime, player, environment) {
            const distanceToPlayer = this.calculateDistance(player);
            
            switch (this.currentState) {
                case 'idle':
                    this.patrol();
                    if (distanceToPlayer < this.detectionRange && this.canSeePlayer(player)) {
                        this.currentState = 'chasing';
                        api.log('Shadow Stalker started chasing!');
                    }
                    break;
                    
                case 'hiding':
                    if (environment.lightLevel < 0.3) {
                        // Stay hidden in darkness
                        this.invisibility = true;
                    } else {
                        this.invisibility = false;
                        if (distanceToPlayer < this.detectionRange) {
                            this.currentState = 'chasing';
                        }
                    }
                    break;
                    
                case 'chasing':
                    this.moveTo(player.position);
                    if (distanceToPlayer < this.attackRange) {
                        this.currentState = 'attacking';
                    }
                    break;
                    
                case 'attacking':
                    this.attack(player);
                    setTimeout(() => {
                        this.currentState = 'chasing';
                    }, 1000);
                    break;
            }
        },
        
        calculateDistance: function(player) {
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            return Math.sqrt(dx * dx + dy * dy);
        },
        
        canSeePlayer: function(player) {
            // Simple line of sight check
            return true; // Simplified for example
        },
        
        patrol: function() {
            // Wander around patrol area
            const angle = Math.random() * Math.PI * 2;
            const speed = this.speed * 0.3;
            this.x += Math.cos(angle) * speed;
            this.y += Math.sin(angle) * speed;
        },
        
        moveTo: function(target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        },
        
        attack: function(player) {
            api.log('Shadow Stalker attacks!');
            // Deal damage to player
            api.emit('enemy:attack', {
                enemy: this,
                target: player,
                damage: this.damage
            });
        }
    };
    
    /**
     * Echo Phantom - Sound illusionist
     */
    const EchoPhantom = {
        id: 'echo_phantom',
        name: 'Echo Phantom',
        type: 'enemy',
        
        health: 60,
        speed: 80,
        damage: 20,
        detectionRange: 500,
        
        // Special ability
        createSoundDecoys: true,
        decoyCount: 3,
        decoyLifetime: 5000,
        
        states: ['idle', 'chasing', 'creating_decoy', 'attacking'],
        currentState: 'idle',
        decoys: [],
        
        update: function(deltaTime, player) {
            const distance = this.calculateDistance(player);
            
            switch (this.currentState) {
                case 'idle':
                    if (distance < this.detectionRange) {
                        this.currentState = 'creating_decoy';
                        this.createDecoy();
                    }
                    break;
                    
                case 'creating_decoy':
                    // Create sound illusion away from phantom
                    const decoyPos = this.createDecoyPosition(player);
                    this.decoys.push({
                        x: decoyPos.x,
                        y: decoyPos.y,
                        lifetime: this.decoyLifetime,
                        sound: 'footsteps'
                    });
                    
                    setTimeout(() => {
                        this.currentState = 'chasing';
                    }, 1000);
                    break;
                    
                case 'chasing':
                    this.moveTo(player);
                    if (distance < 100) {
                        this.currentState = 'attacking';
                    }
                    break;
                    
                case 'attacking':
                    this.attack(player);
                    this.currentState = 'idle';
                    break;
            }
            
            // Update decoys
            this.updateDecoys(deltaTime);
        },
        
        createDecoy: function() {
            api.log('Echo Phantom creating sound decoy!');
            api.emit('sound:play', {
                type: 'footsteps',
                position: { x: this.x + 200, y: this.y },
                volume: 0.8
            });
        },
        
        createDecoyPosition: function(player) {
            // Create decoy in opposite direction from player
            const angle = Math.atan2(player.y - this.y, player.x - this.x) + Math.PI;
            return {
                x: this.x + Math.cos(angle) * 300,
                y: this.y + Math.sin(angle) * 300
            };
        },
        
        updateDecoys: function(deltaTime) {
            for (let i = this.decoys.length - 1; i >= 0; i--) {
                this.decoys[i].lifetime -= deltaTime;
                if (this.decoys[i].lifetime <= 0) {
                    this.decoys.splice(i, 1);
                }
            }
        },
        
        calculateDistance: function(player) {
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            return Math.sqrt(dx * dx + dy * dy);
        },
        
        moveTo: function(target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        },
        
        attack: function(player) {
            api.emit('enemy:attack', {
                enemy: this,
                target: player,
                damage: this.damage
            });
        }
    };
    
    /**
     * Nightmare Brute - Tank enemy
     */
    const NightmareBrute = {
        id: 'nightmare_brute',
        name: 'Nightmare Brute',
        type: 'enemy',
        
        health: 300,
        speed: 40,
        damage: 50,
        detectionRange: 350,
        attackRange: 80,
        
        // Special abilities
        hasArmor: true,
        armorValue: 50,
        chargeAttack: true,
        groundSlam: true,
        
        states: ['idle', 'chasing', 'charging', 'slamming', 'attacking'],
        currentState: 'idle',
        chargeCooldown: 0,
        slamCooldown: 0,
        
        update: function(deltaTime, player) {
            const distance = this.calculateDistance(player);
            
            // Update cooldowns
            if (this.chargeCooldown > 0) this.chargeCooldown -= deltaTime;
            if (this.slamCooldown > 0) this.slamCooldown -= deltaTime;
            
            switch (this.currentState) {
                case 'idle':
                    if (distance < this.detectionRange) {
                        this.currentState = 'chasing';
                    }
                    break;
                    
                case 'chasing':
                    this.moveTo(player);
                    
                    if (distance < 200 && this.chargeCooldown <= 0) {
                        this.currentState = 'charging';
                        this.chargeAttack(player);
                    } else if (distance < this.attackRange) {
                        this.currentState = 'attacking';
                    } else if (distance < 150 && this.slamCooldown <= 0) {
                        this.currentState = 'slamming';
                        this.groundSlam();
                    }
                    break;
                    
                case 'charging':
                    // Fast linear charge toward player
                    this.chargeToward(player);
                    setTimeout(() => {
                        this.currentState = 'chasing';
                        this.chargeCooldown = 5000;
                    }, 1500);
                    break;
                    
                case 'slamming':
                    // Area damage slam
                    api.emit('effect:groundslam', {
                        position: { x: this.x, y: this.y },
                        radius: 150,
                        damage: 40
                    });
                    setTimeout(() => {
                        this.currentState = 'chasing';
                        this.slamCooldown = 8000;
                    }, 2000);
                    break;
                    
                case 'attacking':
                    this.attack(player);
                    setTimeout(() => {
                        this.currentState = 'chasing';
                    }, 1200);
                    break;
            }
        },
        
        calculateDistance: function(player) {
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            return Math.sqrt(dx * dx + dy * dy);
        },
        
        moveTo: function(target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        },
        
        chargeToward: function(target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const chargeSpeed = this.speed * 3;
                this.x += (dx / distance) * chargeSpeed;
                this.y += (dy / distance) * chargeSpeed;
                
                api.emit('effect:dust', {
                    position: { x: this.x, y: this.y }
                });
            }
        },
        
        groundSlam: function() {
            api.log('Nightmare Brute slams the ground!');
        },
        
        attack: function(player) {
            api.emit('enemy:attack', {
                enemy: this,
                target: player,
                damage: this.damage
            });
        },
        
        takeDamage: function(amount, damageType) {
            if (this.hasArmor && damageType !== 'armor_piercing') {
                const armorReduction = this.armorValue / 100;
                amount *= (1 - armorReduction);
                api.log(`Nightmare Brute armor absorbed ${amount} damage`);
            }
            
            this.health -= amount;
            
            if (this.health <= 0) {
                this.die();
            }
        },
        
        die: function() {
            api.log('Nightmare Brute defeated!');
            api.emit('enemy:death', { enemy: this });
            
            // Drop loot
            api.emit('item:spawn', {
                type: 'loot',
                itemId: 'brute_heart',
                position: { x: this.x, y: this.y }
            });
        }
    };
    
    // ==================== REGISTER MONSTERS ====================
    
    api.log('Registering custom monsters...');
    
    // Register each monster type
    api.registerEntity('shadow_stalker', ShadowStalker);
    api.registerEntity('echo_phantom', EchoPhantom);
    api.registerEntity('nightmare_brute', NightmareBrute);
    
    api.log('✓ Registered: Shadow Stalker');
    api.log('✓ Registered: Echo Phantom');
    api.log('✓ Registered: Nightmare Brute');
    
    // ==================== SPAWN HOOKS ====================
    
    // Hook into enemy spawn events to occasionally replace basic enemies with mod enemies
    api.on('enemy:spawn', (data) => {
        const roll = Math.random();
        
        // 10% chance to spawn Shadow Stalker instead
        if (roll < 0.1 && data.environment?.lightLevel < 0.5) {
            api.log('Spawning Shadow Stalker instead of basic enemy');
            api.spawnEntity('shadow_stalker', data.x, data.y);
        }
        // 5% chance for Echo Phantom
        else if (roll < 0.15) {
            api.log('Spawning Echo Phantom');
            api.spawnEntity('echo_phantom', data.x + 100, data.y);
        }
        // 2% chance for Nightmare Brute (mini-boss)
        else if (roll < 0.17) {
            api.log('Spawning Nightmare Brute!');
            api.spawnEntity('nightmare_brute', data.x, data.y);
        }
    });
    
    // Hook into level start to log which monsters are available
    api.on('level:start', (data) => {
        api.log(`Starting level ${data.levelId} with mod monsters enabled`);
    });
    
    // ==================== CUSTOM LOOT ====================
    
    // Add custom loot drop from Nightmare Brute
    api.registerAsset('item', 'brute_heart', {
        name: 'Heart of Darkness',
        description: 'The still-beating heart of a Nightmare Brute',
        icon: '💜',
        rarity: 'epic',
        effect: {
            type: 'buff',
            stat: 'strength',
            value: 20,
            duration: 60000 // 1 minute
        }
    });
    
    api.log('✓ Registered custom loot: Heart of Darkness');
    
    // ==================== ACHIEVEMENTS ====================
    
    // Track kills for achievements
    let stalkerKills = 0;
    let phantomKills = 0;
    let bruteKills = 0;
    
    api.on('enemy:death', (data) => {
        if (data.enemy?.id === 'shadow_stalker') {
            stalkerKills++;
            if (stalkerKills >= 10) {
                api.emit('achievement:unlock', {
                    id: 'shadow_hunter',
                    name: 'Shadow Hunter',
                    description: 'Defeat 10 Shadow Stalkers'
                });
            }
        } else if (data.enemy?.id === 'echo_phantom') {
            phantomKills++;
        } else if (data.enemy?.id === 'nightmare_brute') {
            bruteKills++;
            if (bruteKills >= 1) {
                api.emit('achievement:unlock', {
                    id: 'brute_slayer',
                    name: 'Brute Slayer',
                    description: 'Defeat a Nightmare Brute'
                });
            }
        }
    });
    
    api.log('Monster Pack mod initialized successfully!');
    api.log('New monsters will spawn in dark areas and during regular gameplay');
    
})();

// Export for module systems (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        modId: 'example_monster_pack',
        monsters: ['shadow_stalker', 'echo_phantom', 'nightmare_brute']
    };
}
