/* ============================================================
   CURSED DEPTHS — Advanced Particle System
   Phase 2: High-performance particle effects with pooling
   ============================================================ */

class ParticleSystem {
    constructor() {
        this.pools = {
            mining: [],
            combat: [],
            environmental: [],
            magical: [],
            ui: []
        };
        
        this.activeParticles = [];
        this.maxParticles = 2000;
        this.poolSizes = {
            mining: 500,
            combat: 400,
            environmental: 600,
            magical: 300,
            ui: 200
        };
        
        this.enabled = true;
        this.particleQuality = 1.0; // Can be reduced for performance
        
        // Initialize pools
        this.initializePools();
    }

    initializePools() {
        for (const [type, size] of Object.entries(this.poolSizes)) {
            for (let i = 0; i < size; i++) {
                this.pools[type].push(this.createParticle());
            }
        }
    }

    createParticle() {
        return {
            x: 0, y: 0,
            vx: 0, vy: 0,
            life: 0, maxLife: 60,
            color: '#FFFFFF',
            size: 4,
            gravity: 0,
            friction: 0.98,
            alpha: 1,
            rotation: 0,
            rotationSpeed: 0,
            type: 'square', // square, circle, glow, spark
            active: false
        };
    }

    getParticleFromPool(type) {
        const pool = this.pools[type] || this.pools.environmental;
        
        // Try to get inactive particle from pool
        for (const particle of pool) {
            if (!particle.active) {
                return particle;
            }
        }
        
        // Pool exhausted, create new if under limit
        if (this.activeParticles.length < this.maxParticles) {
            const newParticle = this.createParticle();
            pool.push(newParticle);
            return newParticle;
        }
        
        // Recycle oldest particle
        return this.activeParticles[0];
    }

    spawn(config) {
        if (!this.enabled) return null;

        const type = config.type || 'environmental';
        const particle = this.getParticleFromPool(type);

        // Remove from active if already active
        if (particle.active) {
            const index = this.activeParticles.indexOf(particle);
            if (index !== -1) {
                this.activeParticles.splice(index, 1);
            }
        }

        // Configure particle
        particle.x = config.x || 0;
        particle.y = config.y || 0;
        particle.vx = config.vx || 0;
        particle.vy = config.vy || 0;
        particle.life = config.life || 60;
        particle.maxLife = particle.life;
        particle.color = config.color || '#FFFFFF';
        particle.size = (config.size || 4) * this.particleQuality;
        particle.gravity = config.gravity || 0;
        particle.friction = config.friction || 0.98;
        particle.alpha = config.alpha !== undefined ? config.alpha : 1;
        particle.rotation = config.rotation || 0;
        particle.rotationSpeed = config.rotationSpeed || 0;
        particle.type = config.type || 'square';
        particle.active = true;

        // Add special properties
        if (config.fadeOut) particle.fadeOut = true;
        if (config.shrink) particle.shrink = true;
        if (config.oscillate) particle.oscillate = true;

        this.activeParticles.push(particle);
        return particle;
    }

    spawnMiningParticle(x, y, tileType) {
        const tileData = TILE_DATA[tileType] || { color: '#888888' };
        const count = Math.floor(8 * this.particleQuality);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            
            this.spawn({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 20 + Math.random() * 20,
                color: tileData.color,
                size: 3 + Math.random() * 4,
                gravity: 0.3,
                friction: 0.95,
                type: 'square',
                fadeOut: true,
                shrink: true
            });
        }
    }

    spawnCombatParticle(x, y, damage, isCrit) {
        // Damage number
        this.spawn({
            x, y,
            vx: (Math.random() - 0.5) * 2,
            vy: -3 - Math.random() * 2,
            life: 40,
            color: isCrit ? '#FFDD00' : '#FFFFFF',
            size: isCrit ? 12 : 8,
            type: 'text',
            text: Math.floor(damage),
            fadeOut: true,
            shrink: false
        });

        // Blood splatter
        const bloodCount = Math.floor(isCrit ? 15 : 8);
        for (let i = 0; i < bloodCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 5;
            
            this.spawn({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 20,
                color: `hsl(${0 + Math.random() * 20}, ${70 + Math.random() * 30}%, ${30 + Math.random() * 20}%)`,
                size: 2 + Math.random() * 4,
                gravity: 0.4,
                type: 'circle',
                fadeOut: true
            });
        }
    }

    spawnMagicParticle(x, y, spellType) {
        const configs = {
            fireball: {
                color: '#FF6600',
                count: 20,
                speed: 3,
                glow: true
            },
            frostbolt: {
                color: '#00FFFF',
                count: 15,
                speed: 2,
                glow: true
            },
            lightning: {
                color: '#FFFF00',
                count: 10,
                speed: 5,
                glow: true
            },
            arcane: {
                color: '#AA00FF',
                count: 25,
                speed: 2,
                glow: true
            },
            holy: {
                color: '#FFDD44',
                count: 30,
                speed: 1.5,
                glow: true
            }
        };

        const config = configs[spellType] || configs.arcane;
        
        for (let i = 0; i < config.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = config.speed * (0.5 + Math.random() * 0.5);
            
            this.spawn({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 20 + Math.random() * 20,
                color: config.color,
                size: 3 + Math.random() * 3,
                gravity: 0,
                friction: 0.9,
                type: config.glow ? 'glow' : 'circle',
                fadeOut: true
            });
        }
    }

    spawnEnvironmentalParticle(x, y, envType) {
        const configs = {
            dust: {
                color: 'rgba(160,140,120,',
                count: 1,
                speed: 0.3,
                life: 200
            },
            smoke: {
                color: 'rgba(100,100,100,',
                count: 5,
                speed: 1,
                life: 60
            },
            steam: {
                color: 'rgba(200,200,200,',
                count: 8,
                speed: 1.5,
                life: 80
            },
            spark: {
                color: '#FFAA00',
                count: 10,
                speed: 4,
                life: 30
            },
            leaf: {
                color: '#22AA22',
                count: 3,
                speed: 1,
                life: 150
            },
            snowflake: {
                color: '#FFFFFF',
                count: 1,
                speed: 0.5,
                life: 300
            },
            raindrop: {
                color: '#4488FF',
                count: 1,
                speed: 8,
                life: 40
            }
        };

        const config = configs[envType] || configs.dust;
        
        for (let i = 0; i < config.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = config.speed * (0.5 + Math.random() * 0.5);
            
            this.spawn({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: config.life * (0.8 + Math.random() * 0.4),
                color: typeof config.color === 'string' ? config.color : config.color,
                size: envType === 'snowflake' ? 2 + Math.random() * 2 : 3 + Math.random() * 3,
                gravity: envType === 'smoke' || envType === 'steam' ? -0.05 : 0.1,
                type: envType === 'spark' ? 'glow' : 'square',
                fadeOut: true,
                oscillate: envType === 'leaf'
            });
        }
    }

    spawnEnemyDeath(x, y, enemyType) {
        const deathEffects = {
            slime: { color: '#44FF44', count: 20, type: 'circle' },
            zombie: { color: '#448844', count: 25, type: 'circle' },
            skeleton: { color: '#DDDDCC', count: 15, type: 'square' },
            demon: { color: '#FF44AA', count: 30, type: 'glow' },
            ghost: { color: 'rgba(100,150,200,0.5)', count: 40, type: 'glow' },
            boss: { color: '#FFDD00', count: 100, type: 'glow' }
        };

        const effect = deathEffects[enemyType] || { color: '#FFFFFF', count: 20, type: 'square' };
        
        for (let i = 0; i < effect.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            
            this.spawn({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 40 + Math.random() * 40,
                color: typeof effect.color === 'string' ? effect.color : effect.color,
                size: 3 + Math.random() * 5,
                gravity: 0.3,
                type: effect.type,
                fadeOut: true
            });
        }
    }

    update() {
        if (!this.enabled) return;

        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];
            
            if (!p.active) {
                this.activeParticles.splice(i, 1);
                continue;
            }

            // Update position
            p.x += p.vx;
            p.y += p.vy;
            
            // Apply physics
            p.vy += p.gravity;
            p.vx *= p.friction;
            p.vy *= p.friction;
            
            // Update life
            p.life--;
            
            // Update appearance
            if (p.fadeOut) {
                p.alpha = p.life / p.maxLife;
            }
            
            if (p.shrink) {
                p.size *= 0.95;
            }
            
            if (p.oscillate) {
                p.x += Math.sin(p.life * 0.1) * 0.5;
            }
            
            p.rotation += p.rotationSpeed;

            // Remove dead particles
            if (p.life <= 0 || p.size < 0.5) {
                p.active = false;
                this.activeParticles.splice(i, 1);
                
                // Return to pool
                const poolType = this.getPoolTypeForParticle(p);
                if (poolType && this.pools[poolType]) {
                    this.pools[poolType].push(p);
                }
            }
        }
    }

    getPoolTypeForParticle(particle) {
        // Simple heuristic based on properties
        if (particle.gravity > 0.2) return 'mining';
        if (particle.type === 'text') return 'ui';
        if (particle.type === 'glow') return 'magical';
        if (particle.color.includes('FF') || particle.color.includes('AA')) return 'combat';
        return 'environmental';
    }

    render(ctx, camera) {
        if (!this.enabled || this.activeParticles.length === 0) return;

        ctx.save();
        
        for (const p of this.activeParticles) {
            if (!p.active) continue;

            const screenX = Math.floor(p.x - camera.x);
            const screenY = Math.floor(p.y - camera.y);

            // Skip if off-screen
            if (screenX < -20 || screenX > W + 20 || screenY < -20 || screenY > H + 20) {
                continue;
            }

            ctx.globalAlpha = p.alpha;

            switch (p.type) {
                case 'square':
                    ctx.fillStyle = p.color;
                    ctx.fillRect(screenX - p.size / 2, screenY - p.size / 2, p.size, p.size);
                    break;
                    
                case 'circle':
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'glow':
                    // Outer glow
                    const gradient = ctx.createRadialGradient(
                        screenX, screenY, 0,
                        screenX, screenY, p.size * 2
                    );
                    gradient.addColorStop(0, p.color);
                    gradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, p.size * 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'text':
                    ctx.fillStyle = p.color;
                    ctx.font = `bold ${p.size}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillText(p.text || '', screenX, screenY);
                    break;
            }

            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }

    clear() {
        for (const p of this.activeParticles) {
            p.active = false;
        }
        this.activeParticles = [];
    }

    setQuality(quality) {
        this.particleQuality = Math.max(0.25, Math.min(1.0, quality));
    }

    getActiveCount() {
        return this.activeParticles.length;
    }

    getStats() {
        return {
            active: this.activeParticles.length,
            max: this.maxParticles,
            pools: {
                mining: this.pools.mining.filter(p => !p.active).length,
                combat: this.pools.combat.filter(p => !p.active).length,
                environmental: this.pools.environmental.filter(p => !p.active).length,
                magical: this.pools.magical.filter(p => !p.active).length,
                ui: this.pools.ui.filter(p => !p.active).length
            }
        };
    }
}

// Global particle system instance
const Particles = new ParticleSystem();

// Initialize on game start
function initParticles() {
    Particles.initializePools();
    Particles.setQuality(1.0);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ParticleSystem, Particles, initParticles };
}
