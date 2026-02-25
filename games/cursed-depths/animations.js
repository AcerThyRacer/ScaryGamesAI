/* ============================================================
   CURSED DEPTHS - PHASE 1: SMOOTH ANIMATIONS SYSTEM
   Player Animations | Tool Swings | Visual Feedback | Particles
   ============================================================ */

// ===== ANIMATION DATA STRUCTURES =====
const AnimationSystem = {
    // Player animation states
    playerState: 'idle', // idle, walk, run, jump, fall, swim, climb, attack, mine
    playerFrame: 0,
    playerFrameTimer: 0,
    playerDirection: 1, // 1 = right, -1 = left
    
    // Animation frame data (simulated sprite sheets)
    animations: {
        idle: { frames: 4, speed: 8, loop: true },
        walk: { frames: 6, speed: 6, loop: true },
        run: { frames: 6, speed: 4, loop: true },
        jump: { frames: 3, speed: 5, loop: false },
        fall: { frames: 2, speed: 3, loop: true },
        swim: { frames: 4, speed: 7, loop: true },
        climb: { frames: 4, speed: 6, loop: true },
        attack_sword: { frames: 5, speed: 3, loop: false },
        attack_pick: { frames: 4, speed: 4, loop: false },
        attack_axe: { frames: 4, speed: 5, loop: false },
        attack_staff: { frames: 4, speed: 4, loop: false },
        hurt: { frames: 2, speed: 4, loop: false },
        death: { frames: 6, speed: 5, loop: false }
    },
    
    // Secondary motion (hair, clothing, accessories)
    secondaryMotion: [],
    
    // Particle effects
    particles: [],
    
    // Damage numbers
    damageNumbers: [],
    
    init() {
        console.log('⚡ Phase 1: Animation System initialized');
        this.initSecondaryMotion();
    },
    
    initSecondaryMotion() {
        // Initialize hair/clothing physics objects
        for (let i = 0; i < 5; i++) {
            this.secondaryMotion.push({
                x: 0, y: 0,
                vx: 0, vy: 0,
                targetX: 0, targetY: 0,
                stiffness: 0.3 + Math.random() * 0.2,
                damping: 0.9
            });
        }
    },
    
    update(player, dt) {
        // Update animation state based on player actions
        this.determinePlayerState(player);
        
        // Update animation frame
        this.updateAnimationFrame(dt);
        
        // Update secondary motion
        this.updateSecondaryMotion(player);
        
        // Update particles
        this.updateParticles(dt);
        
        // Update damage numbers
        this.updateDamageNumbers(dt);
        
        // Spawn movement particles
        this.spawnMovementParticles(player);
    },
    
    determinePlayerState(player) {
        if (player.attacking) {
            this.playerState = `attack_${player.attackType || 'sword'}`;
        } else if (player.mining) {
            this.playerState = 'attack_pick';
        } else if (player.inWater) {
            this.playerState = 'swim';
        } else if (player.climbing) {
            this.playerState = 'climb';
        } else if (!player.onGround && player.vy < 0) {
            this.playerState = 'jump';
        } else if (!player.onGround && player.vy > 0) {
            this.playerState = 'fall';
        } else if (Math.abs(player.vx) > PLAYER_SPEED * 1.5) {
            this.playerState = 'run';
        } else if (Math.abs(player.vx) > 0.5) {
            this.playerState = 'walk';
        } else {
            this.playerState = 'idle';
        }
        
        // Update direction
        if (player.vx !== 0) {
            this.playerDirection = player.vx > 0 ? 1 : -1;
        }
    },
    
    updateAnimationFrame(dt) {
        const anim = this.animations[this.playerState];
        if (!anim) return;
        
        this.playerFrameTimer++;
        
        if (this.playerFrameTimer >= anim.speed) {
            this.playerFrameTimer = 0;
            this.playerFrame++;
            
            if (this.playerFrame >= anim.frames) {
                if (anim.loop) {
                    this.playerFrame = 0;
                } else {
                    this.playerFrame = anim.frames - 1;
                }
            }
        }
    },
    
    updateSecondaryMotion(player) {
        // Calculate player velocity for wind resistance
        const velX = player.vx * 0.5;
        const velY = player.vy * 0.3;
        
        // Update each secondary motion element
        this.secondaryMotion.forEach((elem, index) => {
            // Target position follows player with offset
            elem.targetX = player.x + player.w / 2;
            elem.targetY = player.y + player.h / 2 - index * 3;
            
            // Apply physics
            const dx = elem.targetX - elem.x;
            const dy = elem.targetY - elem.y;
            
            elem.vx += dx * elem.stiffness;
            elem.vy += dy * elem.stiffness;
            
            // Add wind from movement
            elem.vx += velX * (index + 1) * 0.1;
            elem.vy += velY * (index + 1) * 0.1;
            
            // Apply damping
            elem.vx *= elem.damping;
            elem.vy *= elem.damping;
            
            // Update position
            elem.x += elem.vx;
            elem.y += elem.vy;
        });
    },
    
    spawnMovementParticles(player) {
        // Only spawn when moving
        if (Math.abs(player.vx) < 1 && Math.abs(player.vy) < 1) return;
        
        // Ground particles when running
        if (player.onGround && Math.abs(player.vx) > PLAYER_SPEED) {
            if (Math.random() < 0.3) {
                this.particles.push({
                    x: player.x + player.w / 2 + (Math.random() - 0.5) * 20,
                    y: player.y + player.h,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -Math.random() * 2 - 1,
                    size: 2 + Math.random() * 2,
                    life: 20 + Math.random() * 10,
                    maxLife: 30,
                    color: `rgba(${160 + Math.random() * 40}, ${140 + Math.random() * 40}, ${120 + Math.random() * 40},`,
                    type: 'dust'
                });
            }
        }
        
        // Water splash when swimming
        if (player.inWater && Math.abs(player.vx) > 1) {
            if (Math.random() < 0.4) {
                this.particles.push({
                    x: player.x + player.w / 2,
                    y: player.y + Math.random() * player.h,
                    vx: (Math.random() - 0.5) * 3,
                    vy: (Math.random() - 0.5) * 3,
                    size: 3 + Math.random() * 2,
                    life: 15 + Math.random() * 10,
                    maxLife: 25,
                    color: 'rgba(100,150,255,',
                    type: 'water'
                });
            }
        }
    },
    
    spawnAttackParticles(x, y, type) {
        const particleSets = {
            sword: { color: '#FFFFFF', count: 5, speed: 3 },
            pick: { color: '#AAAAAA', count: 4, speed: 2 },
            axe: { color: '#8B6914', count: 4, speed: 2 },
            staff: { color: '#88DDFF', count: 8, speed: 4 },
            fire: { color: '#FF4400', count: 10, speed: 3 },
            ice: { color: '#AADDFF', count: 10, speed: 3 },
            shadow: { color: '#7700CC', count: 12, speed: 4 }
        };
        
        const set = particleSets[type] || particleSets.sword;
        
        for (let i = 0; i < set.count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * set.speed * 2,
                vy: (Math.random() - 0.5) * set.speed * 2,
                size: 2 + Math.random() * 3,
                life: 15 + Math.random() * 10,
                maxLife: 25,
                color: set.color,
                type: 'attack'
            });
        }
    },
    
    spawnDamageNumber(x, y, damage, crit = false) {
        this.damageNumbers.push({
            x: x,
            y: y,
            text: Math.floor(damage),
            vy: -2,
            life: 60,
            maxLife: 60,
            crit: crit,
            scale: crit ? 2 : 1
        });
    },
    
    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            
            // Apply gravity to some particles
            if (p.type === 'dust' || p.type === 'attack') {
                p.vy += 0.1;
            }
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    },
    
    updateDamageNumbers(dt) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i];
            
            dn.y += dn.vy;
            dn.vy *= 0.95; // Slow down over time
            dn.life--;
            
            if (dn.life <= 0) {
                this.damageNumbers.splice(i, 1);
            }
        }
    },
    
    render(ctx, camX, camY) {
        // Render particles
        this.particles.forEach(p => {
            const alpha = Math.min(1, p.life / 20);
            ctx.fillStyle = `${p.color}${alpha.toFixed(2)})`;
            
            if (p.type === 'attack') {
                ctx.globalCompositeOperation = 'lighter';
            }
            
            ctx.beginPath();
            ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
        });
        
        // Render damage numbers
        this.damageNumbers.forEach(dn => {
            const alpha = Math.min(1, dn.life / 20);
            ctx.save();
            ctx.translate(dn.x - camX, dn.y - camY);
            ctx.scale(dn.scale, dn.scale);
            
            if (dn.crit) {
                ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
                ctx.font = 'bold 24px Inter';
                ctx.shadowColor = '#FF0000';
                ctx.shadowBlur = 8;
            } else {
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.font = 'bold 16px Inter';
                ctx.shadowColor = '#000000';
                ctx.shadowBlur = 4;
            }
            
            ctx.textAlign = 'center';
            ctx.fillText(dn.text, 0, 0);
            ctx.restore();
        });
    },
    
    // Get current animation frame for rendering
    getPlayerRenderData(player) {
        return {
            state: this.playerState,
            frame: this.playerFrame,
            direction: this.playerDirection,
            secondaryMotion: this.secondaryMotion.map(s => ({ x: s.x, y: s.y }))
        };
    },
    
    triggerHurt() {
        this.playerState = 'hurt';
        this.playerFrame = 0;
        this.playerFrameTimer = 0;
    },
    
    triggerDeath() {
        this.playerState = 'death';
        this.playerFrame = 0;
        this.playerFrameTimer = 0;
    }
};

// Export globally
window.AnimationSystem = AnimationSystem;

console.log('⚡ Animation System loaded');
