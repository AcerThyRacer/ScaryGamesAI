/* ============================================================
   CURSED DEPTHS — Wall of Flesh Boss
   Phase 10: The ultimate pre-hardmode boss with hardmode unlock
   ============================================================ */

class WallOfFlesh extends Boss {
    constructor(x, y, direction = 1) {
        super({
            name: 'Wall of Flesh',
            hp: 8000,
            maxHp: 8000,
            width: 50,
            height: 200,
            defense: 8,
            damage: 50,
            knockbackResist: 1.0,
            boss: true
        });

        // Position and movement
        this.x = x;
        this.y = y;
        this.direction = direction; // 1 = right, -1 = left
        this.baseSpeed = 3.0;
        this.currentSpeed = this.baseSpeed;
        
        // Body parts
        this.hungry = []; // Attached minions
        this.eyes = {
            left: { x: this.x - 15, y: this.y + 40, hp: 800 },
            right: { x: this.x + 15, y: this.y + 40, hp: 800 }
        };
        this.mouth = {
            x: this.x,
            y: this.y + 120,
            width: 30,
            height: 40
        };

        // Attack patterns
        this.lasers = [];
        this.attackTimer = 0;
        this.phase = 1;
        
        // Visual effects
        this.particles = [];
        this.glowIntensity = 0;
        
        // Arena tracking
        this.startX = x;
        this.worldEdgeReached = false;
    }

    update(dt, player, world) {
        // Enrage as HP decreases
        const hpPercent = this.hp / this.maxHp;
        this.currentSpeed = this.baseSpeed + (1 - hpPercent) * 7; // Up to 10 speed at low HP
        
        // Move toward player's side of world
        this.moveHorizontally();
        
        // Check if reached world edge
        this.checkWorldEdge();
        
        // Update hungry minions
        this.updateHungry(player, world);
        
        // Attack patterns
        this.executeAttacks(player, world);
        
        // Collision with player
        this.checkPlayerCollision(player);
        
        // Update lasers
        this.updateLasers(player, world);
        
        // Visual effects
        this.updateParticles();
        
        // Sync body parts
        this.syncBodyParts();
    }

    moveHorizontally() {
        // Always moving in one direction
        this.x += this.currentSpeed * this.direction;
        
        // Slight vertical movement to stay near player height
        const targetY = player.y - 100;
        const dy = targetY - this.y;
        
        if (Math.abs(dy) > 10) {
            this.y += Math.sign(dy) * 2;
        }
    }

    checkWorldEdge() {
        const worldEdgeLeft = 0;
        const worldEdgeRight = WORLD_W * TILE;
        
        if ((this.direction === 1 && this.x >= worldEdgeRight) ||
            (this.direction === -1 && this.x <= worldEdgeLeft)) {
            this.worldEdgeReached = true;
            
            // Player dies and world becomes hardmode anyway
            player.hp = 0;
            triggerHardmode();
        }
    }

    updateHungry(player, world) {
        // Spawn initial hungry if none exist
        if (this.hungry.length === 0) {
            for (let i = 0; i < 6; i++) {
                this.hungry.push({
                    x: this.x + (Math.random() - 0.5) * 100,
                    y: this.y + Math.random() * 150,
                    hp: 200,
                    maxHp: 200,
                    attached: true,
                    offsetAngle: (i / 6) * Math.PI * 2
                });
            }
        }
        
        // Update hungry positions and behavior
        for (const hungry of this.hungry) {
            if (hungry.attached) {
                // Orbit around WoF body
                hungry.offsetAngle += 0.02;
                hungry.x = this.x + Math.cos(hungry.offsetAngle) * 60;
                hungry.y = this.y + 100 + Math.sin(hungry.offsetAngle) * 30;
                
                // Check if player is nearby - detach and attack
                const distToPlayer = Math.sqrt(
                    Math.pow(player.x - hungry.x, 2) + 
                    Math.pow(player.y - hungry.y, 2)
                );
                
                if (distToPlayer < 150 && Math.random() < 0.01) {
                    hungry.attached = false;
                }
            } else {
                // Flying toward player
                const dx = player.x - hungry.x;
                const dy = player.y - hungry.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    hungry.x += (dx / dist) * 4;
                    hungry.y += (dy / dist) * 4;
                }
                
                // Deal damage on contact
                if (dist < 30) {
                    player.hp -= 25;
                    Particles.spawnCombatParticle(player.x, player.y, 25, false);
                }
                
                // Reattach if too far
                const distToWoF = Math.sqrt(
                    Math.pow(this.x - hungry.x, 2) + 
                    Math.pow(this.y - hungry.y, 2)
                );
                
                if (distToWoF > 400) {
                    hungry.attached = true;
                }
            }
        }
        
        // Remove dead hungry
        this.hungry = this.hungry.filter(h => h.hp > 0);
    }

    executeAttacks(player, world) {
        this.attackTimer++;
        
        // Eye lasers
        if (this.attackTimer % 90 === 0) {
            this.fireEyeLaser('left', player);
            this.fireEyeLaser('right', player);
        }
        
        // Mouth death laser (less frequent but dangerous)
        if (this.attackTimer % 180 === 0) {
            this.fireMouthLaser(player);
        }
        
        // Spawn fireballs at low HP
        if (this.hp < this.maxHp * 0.5 && this.attackTimer % 60 === 0) {
            this.spawnFireball(player);
        }
    }

    fireEyeLaser(eyeName, player) {
        const eye = this.eyes[eyeName];
        if (eye.hp <= 0) return;
        
        const dx = player.x - eye.x;
        const dy = player.y - eye.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.lasers.push({
            x: eye.x,
            y: eye.y,
            vx: (dx / dist) * 8,
            vy: (dy / dist) * 8,
            damage: 30,
            type: 'eye_laser',
            life: 120,
            color: '#FF0000'
        });
    }

    fireMouthLaser(player) {
        const mouth = this.mouth;
        
        // Charge up effect
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                this.particles.push({
                    x: mouth.x + (Math.random() - 0.5) * 40,
                    y: mouth.y + (Math.random() - 0.5) * 50,
                    vx: 0,
                    vy: 0,
                    life: 10,
                    color: '#FF6600',
                    size: 5
                });
            }, i * 100);
        }
        
        // Fire massive laser after delay
        setTimeout(() => {
            const dx = player.x - mouth.x;
            const dy = player.y - mouth.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            this.lasers.push({
                x: mouth.x,
                y: mouth.y,
                vx: (dx / dist) * 12,
                vy: (dy / dist) * 12,
                damage: 60,
                type: 'death_laser',
                life: 180,
                color: '#FF3300',
                width: 20
            });
            
            showStatusMessage('DEATH LASER!');
        }, 3000);
    }

    spawnFireball(player) {
        const dx = player.x - this.mouth.x;
        const dy = player.y - this.mouth.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.lasers.push({
            x: this.mouth.x,
            y: this.mouth.y,
            vx: (dx / dist) * 6,
            vy: (dy / dist) * 6 - 3,
            damage: 40,
            type: 'fireball',
            life: 200,
            color: '#FF6600',
            homing: true
        });
    }

    updateLasers(player, world) {
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            
            // Move laser
            laser.x += laser.vx;
            laser.y += laser.vy;
            
            // Homing for fireballs
            if (laser.homing) {
                const dx = player.x - laser.x;
                const dy = player.y - laser.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    laser.vx += (dx / dist) * 0.1;
                    laser.vy += (dy / dist) * 0.1;
                    
                    // Cap speed
                    const speed = Math.sqrt(laser.vx * laser.vx + laser.vy * laser.vy);
                    if (speed > 10) {
                        laser.vx = (laser.vx / speed) * 10;
                        laser.vy = (laser.vy / speed) * 10;
                    }
                }
            }
            
            // Decrease life
            laser.life--;
            
            // Check collision with player
            const dx = player.x - laser.x;
            const dy = player.y - laser.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 20) {
                player.hp -= laser.damage;
                Particles.spawnCombatParticle(player.x, player.y, laser.damage, false);
                this.lasers.splice(i, 1);
                continue;
            }
            
            // Check collision with blocks
            const tileX = Math.floor(laser.x / TILE);
            const tileY = Math.floor(laser.y / TILE);
            
            if (tileX >= 0 && tileX < WORLD_W && tileY >= 0 && tileY < WORLD_H) {
                const tile = world[tileX + tileY * WORLD_W];
                if (tile !== T.AIR) {
                    // Destroy some blocks
                    if ([T.DIRT, T.STONE, T.SAND].includes(tile)) {
                        world[tileX + tileY * WORLD_W] = T.AIR;
                        Particles.spawnMiningParticle(laser.x, laser.y, tile);
                    }
                    
                    this.lasers.splice(i, 1);
                    continue;
                }
            }
            
            // Remove if expired
            if (laser.life <= 0) {
                this.lasers.splice(i, 1);
            }
        }
    }

    syncBodyParts() {
        // Keep eyes and mouth positioned relative to body
        this.eyes.left.x = this.x - 15;
        this.eyes.left.y = this.y + 40;
        this.eyes.right.x = this.x + 15;
        this.eyes.right.y = this.y + 40;
        this.mouth.x = this.x;
        this.mouth.y = this.y + 120;
    }

    checkPlayerCollision(player) {
        // Body collision
        const dx = player.x - this.x;
        const dy = player.y - (this.y + 100);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 50) {
            player.hp -= this.damage;
            Particles.spawnCombatParticle(player.x, player.y, this.damage, false);
        }
        
        // Hungry collision handled separately
    }

    takeDamage(damage, source) {
        // Reduce damage when hungry are alive
        const hungryReduction = this.hungry.length > 0 ? 0.75 : 1.0;
        const finalDamage = damage * hungryReduction;
        
        this.hp -= finalDamage;
        
        // Flash effect
        this.glowIntensity = 1.0;
        
        // Spawn particles
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: this.x + (Math.random() - 0.5) * 60,
                y: this.y + Math.random() * 200,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30,
                color: '#FF4400',
                size: 4 + Math.random() * 4
            });
        }
        
        // Check death
        if (this.hp <= 0) {
            this.onDeath();
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3; // Gravity
            p.life--;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Decay glow
        if (this.glowIntensity > 0) {
            this.glowIntensity -= 0.05;
        }
    }

    render(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        // Draw main body (fleshy wall)
        ctx.fillStyle = `rgba(180, 80, 60, ${0.8 + this.glowIntensity * 0.2})`;
        ctx.fillRect(screenX - 25, screenY, 50, 200);
        
        // Draw texture details
        ctx.fillStyle = '#AA5544';
        for (let i = 0; i < 10; i++) {
            const detailX = screenX - 20 + (i % 3) * 20;
            const detailY = screenY + i * 20;
            ctx.beginPath();
            ctx.ellipse(detailX, detailY, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw eyes
        this.drawEye(ctx, this.eyes.left, screenX);
        this.drawEye(ctx, this.eyes.right, screenX);
        
        // Draw mouth
        this.drawMouth(ctx, screenX, screenY);
        
        // Draw hungry
        for (const hungry of this.hungry) {
            this.drawHungry(ctx, hungry, screenX, screenY);
        }
        
        // Draw lasers
        for (const laser of this.lasers) {
            this.drawLaser(ctx, laser, camera);
        }
        
        // Draw particles
        for (const p of this.particles) {
            const px = p.x - camera.x;
            const py = p.y - camera.y;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 30;
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // Draw health bar
        this.drawHealthBar(ctx, screenX, screenY - 30);
    }

    drawEye(ctx, eye, screenX) {
        // White of eye
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(eye.x - camera.x, eye.y, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupil (red)
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(eye.x - camera.x, eye.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow
        ctx.fillStyle = `rgba(255, 0, 0, 0.3)`;
        ctx.beginPath();
        ctx.arc(eye.x - camera.x, eye.y, 15, 0, Math.PI * 2);
        ctx.fill();
    }

    drawMouth(ctx, screenX, screenY) {
        const mouthX = this.mouth.x - camera.x;
        const mouthY = this.mouth.y;
        
        // Open mouth
        ctx.fillStyle = '#440000';
        ctx.beginPath();
        ctx.ellipse(mouthX, mouthY, 20, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Teeth
        ctx.fillStyle = '#FFFFFF';
        for (let i = -3; i <= 3; i++) {
            ctx.fillRect(mouthX + i * 6 - 3, mouthY - 20, 6, 8);
            ctx.fillRect(mouthX + i * 6 - 3, mouthY + 12, 6, 8);
        }
    }

    drawHungry(ctx, hungry, screenX, screenY) {
        const hx = hungry.x - camera.x;
        const hy = hungry.y;
        
        // Body
        ctx.fillStyle = '#CC6644';
        ctx.beginPath();
        ctx.ellipse(hx, hy, 15, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Mouth with teeth
        ctx.fillStyle = '#440000';
        ctx.beginPath();
        ctx.arc(hx, hy, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        for (let i = -2; i <= 2; i++) {
            ctx.fillRect(hx + i * 4 - 2, hy - 5, 4, 6);
        }
    }

    drawLaser(ctx, laser, camera) {
        const lx = laser.x - camera.x;
        const ly = laser.y;
        
        ctx.strokeStyle = laser.color;
        ctx.lineWidth = laser.width || 4;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - laser.vx * 3, ly - laser.vy * 3);
        ctx.stroke();
        
        // Glow
        ctx.strokeStyle = laser.color.replace(')', ', 0.3)').replace('rgb', 'rgba');
        ctx.lineWidth = (laser.width || 4) * 2;
        ctx.stroke();
    }

    drawHealthBar(ctx, x, y) {
        const barWidth = 400;
        const barHeight = 20;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);
        
        // Health
        const healthPercent = this.hp / this.maxHp;
        const gradient = ctx.createLinearGradient(x - barWidth / 2, 0, x + barWidth / 2, 0);
        gradient.addColorStop(0, '#FF0000');
        gradient.addColorStop(0.5, '#FF6600');
        gradient.addColorStop(1, '#FFFF00');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x - barWidth / 2, y, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - barWidth / 2, y, barWidth, barHeight);
    }

    onDeath() {
        showMassiveMessage('WALL OF FLESH DEFEATED!');
        
        // Trigger hardmode
        setTimeout(() => {
            triggerHardmode();
        }, 2000);
        
        // Drop treasure
        setTimeout(() => {
            this.dropTreasure();
        }, 3000);
        
        // Register with boss system
        if (typeof BossSummon !== 'undefined') {
            BossSummon.onBossDeath('wall_of_flesh');
        }
    }

    dropTreasure() {
        const drops = [
            'warrior_emblem',
            'summoner_emblem',
            'demon_heart',
            'breaker_blade',
            'clockwork_assault_rifle',
            'laser_rifle',
            'fireflower'
        ];
        
        // Drop 2-3 items
        const count = 2 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < count; i++) {
            const item = drops[Math.floor(Math.random() * drops.length)];
            addItem(item, 1);
            showStatusMessage(`Received ${item}!`);
        }
        
        // Always drop Pwnhammer
        addItem('pwnhammer', 1);
        showStatusMessage('Received Pwnhammer!');
    }
}

// Global function to spawn Wall of Flesh
function spawnWallOfFlesh(x, y, direction) {
    const wof = new WallOfFlesh(x, y, direction);
    
    // Add to active bosses
    if (typeof activeBosses !== 'undefined') {
        activeBosses.push(wof);
    }
    
    showMassiveMessage('THE WALL OF FLESH AWAKENS!');
    
    // Apply post-processing
    if (typeof PostProcess !== 'undefined') {
        PostProcess.applyBossIntro('wall_of_flesh');
    }
    
    return wof;
}

// Trigger hardmode transformation
function triggerHardmode() {
    console.log('[WallOfFlesh] TRIGGERING HARDMODE!');
    
    // Set hardmode flag
    if (typeof Progression !== 'undefined') {
        Progression.triggerHardmode();
    }
    
    // Generate biome stripes (Hallow and Corruption/Crimson)
    generateBiomeStripes();
    
    // Convert some stone to hallowed/corrupted
    convertTilesToHardmode();
    
    // Spawn new ores in caverns
    spawnHardmodeOres();
    
    // Show massive message
    showMassiveMessage('THE OLD GODS HAVE BEEN AWAKENED');
    
    // Change music
    if (typeof AudioManager !== 'undefined') {
        setTimeout(() => {
            AudioManager.playMusic('underworld_hardmode');
        }, 5000);
    }
    
    // Visual effects
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const x = Math.random() * WORLD_W * TILE;
            const y = Math.random() * WORLD_H * TILE;
            Particles.spawnEnvironmentalParticle(x, y, 'smoke');
        }, i * 50);
    }
}

function generateBiomeStripes() {
    // Create diagonal stripes of Hallow and Corruption/Crimson
    const stripeCount = 3;
    const stripeWidth = 100;
    
    for (let i = 0; i < stripeCount; i++) {
        const startX = (WORLD_W / (stripeCount + 1)) * (i + 1);
        const evilType = i % 2 === 0 ? 'corruption' : 'hallow';
        
        for (let y = CAVE_Y; y < ABYSS_Y; y++) {
            for (let x = startX - stripeWidth; x < startX + stripeWidth; x++) {
                if (x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H) {
                    const tileIndex = Math.floor(x) + y * WORLD_W;
                    const tile = world[tileIndex];
                    
                    if (tile === T.STONE) {
                        if (evilType === 'corruption') {
                            world[tileIndex] = T.EBONSTONE;
                        } else if (evilType === 'hallow') {
                            world[tileIndex] = T.PEARLSTONE;
                        }
                    } else if (tile === T.GRASS) {
                        if (evilType === 'corruption') {
                            world[tileIndex] = T.CORRUPT_GRASS;
                        } else if (evilType === 'hallow') {
                            world[tileIndex] = T.HALLOWED_GRASS;
                        }
                    }
                }
            }
        }
    }
}

function convertTilesToHardmode() {
    // Randomly convert some stone to corrupted versions
    const conversionCount = 1000;
    
    for (let i = 0; i < conversionCount; i++) {
        const x = Math.floor(Math.random() * WORLD_W);
        const y = CAVE_Y + Math.floor(Math.random() * (ABYSS_Y - CAVE_Y));
        
        if (x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H) {
            const tileIndex = x + y * WORLD_W;
            const tile = world[tileIndex];
            
            if (tile === T.STONE && Math.random() < 0.5) {
                world[tileIndex] = Math.random() < 0.5 ? T.EBONSTONE : T.PEARLSTONE;
            }
        }
    }
}

function spawnHardmodeOres() {
    // Spawn Cobalt/Palladium, Mythril/Orichalcum, Adamantite/Titanium
    const oreTypes = [T.COBALT_ORE, T.MYTHRIL_ORE, T.TITANIUM_ORE];
    
    for (const ore of oreTypes) {
        const veinCount = 50;
        
        for (let i = 0; i < veinCount; i++) {
            const centerX = Math.floor(Math.random() * WORLD_W);
            const centerY = CAVE_Y + Math.floor(Math.random() * (ABYSS_Y - CAVE_Y));
            const veinSize = 20 + Math.floor(Math.random() * 30);
            
            for (let j = 0; j < veinSize; j++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 30;
                const x = Math.floor(centerX + Math.cos(angle) * radius);
                const y = Math.floor(centerY + Math.sin(angle) * radius);
                
                if (x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H) {
                    const tileIndex = x + y * WORLD_W;
                    const tile = world[tileIndex];
                    
                    if (tile === T.STONE) {
                        world[tileIndex] = ore;
                    }
                }
            }
        }
    }
    
    showStatusMessage('Your world has been blessed with new ores!');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WallOfFlesh, spawnWallOfFlesh, triggerHardmode };
}
