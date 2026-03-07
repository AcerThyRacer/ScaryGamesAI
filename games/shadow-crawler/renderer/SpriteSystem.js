/* ============================================
   Shadow Crawler - Sprite Animation System
   8-Direction Sprites | Animation States
   Procedural Sprite Generation
   ============================================ */

(function() {
    'use strict';

    const SpriteSystem = {
        // Animation data
        animations: {},
        currentAnimations: {},
        
        // Sprite sheets
        spriteSheets: {},
        
        // Procedural sprites cache
        proceduralSprites: {},
        
        // Initialize
        async init() {
            await this.loadAnimations();
            console.log('[SpriteSystem] Initialized');
        },
        
        // Load animation definitions
        async loadAnimations() {
            // Player animations
            this.animations.player = {
                idle: { frames: 4, fps: 8, loop: true },
                walk: { frames: 8, fps: 12, loop: true },
                run: { frames: 8, fps: 16, loop: true },
                attack: { frames: 6, fps: 18, loop: false },
                hurt: { frames: 3, fps: 15, loop: false },
                death: { frames: 8, fps: 12, loop: false }
            };
            
            // Enemy animations
            this.animations.enemy = {
                idle: { frames: 4, fps: 6, loop: true },
                walk: { frames: 8, fps: 10, loop: true },
                chase: { frames: 8, fps: 14, loop: true },
                attack: { frames: 6, fps: 16, loop: false },
                hurt: { frames: 3, fps: 15, loop: false },
                death: { frames: 8, fps: 12, loop: false }
            };
            
            // Generate procedural sprites
            await this.generateProceduralSprites();
        },
        
        // Generate procedural sprites (fallback if no assets)
        async generateProceduralSprites() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 64;
            canvas.height = 64;
            
            // Generate player sprite
            this.proceduralSprites.player = this.generatePlayerSprite(canvas, ctx);
            
            // Generate enemy sprites
            this.proceduralSprites.shadowWraith = this.generateShadowWraithSprite(canvas, ctx);
            this.proceduralSprites.boneStalker = this.generateBoneStalkerSprite(canvas, ctx);
            this.proceduralSprites.phantom = this.generatePhantomSprite(canvas, ctx);
            this.proceduralSprites.lurker = this.generateLurkerSprite(canvas, ctx);
            this.proceduralSprites.screamer = this.generateScreamerSprite(canvas, ctx);
            this.proceduralSprites.devourer = this.generateDevourerSprite(canvas, ctx);
            
            console.log('[SpriteSystem] Procedural sprites generated');
        },
        
        // Generate player sprite
        generatePlayerSprite(canvas, ctx) {
            const textures = [];
            const directions = 8;
            
            for (let d = 0; d < directions; d++) {
                ctx.clearRect(0, 0, 64, 64);
                
                const angle = (d / directions) * Math.PI * 2;
                ctx.save();
                ctx.translate(32, 32);
                ctx.rotate(angle);
                
                // Body
                ctx.fillStyle = '#aaaacc';
                ctx.beginPath();
                ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Head
                ctx.fillStyle = '#ccccff';
                ctx.beginPath();
                ctx.arc(0, -8, 8, 0, Math.PI * 2);
                ctx.fill();
                
                // Sword
                ctx.strokeStyle = '#8888bb';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(8, 4);
                ctx.lineTo(20, 8);
                ctx.stroke();
                
                ctx.restore();
                
                textures.push(canvas.toDataURL());
            }
            
            return textures;
        },
        
        // Generate shadow wraith sprite
        generateShadowWraithSprite(canvas, ctx) {
            const textures = [];
            
            for (let f = 0; f < 8; f++) {
                ctx.clearRect(0, 0, 64, 64);
                
                const wobble = Math.sin(f * Math.PI / 4) * 2;
                
                // Ethereal body
                const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 24);
                gradient.addColorStop(0, 'rgba(170, 0, 255, 0.8)');
                gradient.addColorStop(0.5, 'rgba(100, 0, 170, 0.6)');
                gradient.addColorStop(1, 'rgba(50, 0, 100, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.ellipse(32, 32 + wobble, 18 + wobble, 22 - wobble, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Glowing eyes
                ctx.fillStyle = '#ff00ff';
                ctx.shadowColor = '#ff00ff';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(26, 28, 3, 0, Math.PI * 2);
                ctx.arc(38, 28, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                
                textures.push(canvas.toDataURL());
            }
            
            return textures;
        },
        
        // Generate bone stalker sprite
        generateBoneStalkerSprite(canvas, ctx) {
            const textures = [];
            
            for (let f = 0; f < 8; f++) {
                ctx.clearRect(0, 0, 64, 64);
                
                const legOffset = Math.sin(f * Math.PI / 4) * 4;
                
                ctx.fillStyle = '#887744';
                
                // Body
                ctx.fillRect(28, 20, 8, 20);
                
                // Head
                ctx.beginPath();
                ctx.arc(32, 16, 8, 0, Math.PI * 2);
                ctx.fill();
                
                // Legs
                ctx.fillRect(26 + legOffset, 40, 4, 12);
                ctx.fillRect(34 - legOffset, 40, 4, 12);
                
                // Arms
                ctx.fillRect(20, 24, 8, 4);
                ctx.fillRect(36, 24, 8, 4);
                
                // Eye sockets
                ctx.fillStyle = '#222';
                ctx.beginPath();
                ctx.arc(30, 14, 3, 0, Math.PI * 2);
                ctx.arc(34, 14, 3, 0, Math.PI * 2);
                ctx.fill();
                
                textures.push(canvas.toDataURL());
            }
            
            return textures;
        },
        
        // Generate phantom sprite
        generatePhantomSprite(canvas, ctx) {
            const textures = [];
            
            for (let f = 0; f < 8; f++) {
                ctx.clearRect(0, 0, 64, 64);
                
                const phase = Math.sin(f * Math.PI / 4) * 0.3;
                ctx.globalAlpha = 0.6 + phase;
                
                // Ghostly form
                const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 20);
                gradient.addColorStop(0, 'rgba(68, 136, 204, 0.8)');
                gradient.addColorStop(1, 'rgba(34, 68, 102, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(32, 32, 20, 0, Math.PI * 2);
                ctx.fill();
                
                // Flowing tail
                ctx.fillStyle = 'rgba(34, 68, 102, 0.5)';
                ctx.beginPath();
                ctx.moveTo(22, 40);
                ctx.quadraticCurveTo(32, 55, 42, 40);
                ctx.quadraticCurveTo(32, 50, 22, 40);
                ctx.fill();
                
                ctx.globalAlpha = 1.0;
                textures.push(canvas.toDataURL());
            }
            
            return textures;
        },
        
        // Generate lurker sprite
        generateLurkerSprite(canvas, ctx) {
            const textures = [];
            
            for (let f = 0; f < 8; f++) {
                ctx.clearRect(0, 0, 64, 64);
                
                const hunch = Math.sin(f * Math.PI / 4) * 3;
                
                // Hunched body
                ctx.fillStyle = '#333300';
                ctx.beginPath();
                ctx.ellipse(32, 36 + hunch, 16, 12, 0, Math.PI, 0);
                ctx.fill();
                
                // Head
                ctx.fillStyle = '#444400';
                ctx.beginPath();
                ctx.arc(32, 24, 10, 0, Math.PI * 2);
                ctx.fill();
                
                // Claws
                ctx.strokeStyle = '#555500';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(20, 36);
                ctx.lineTo(12, 40);
                ctx.moveTo(44, 36);
                ctx.lineTo(52, 40);
                ctx.stroke();
                
                // Glowing eyes
                ctx.fillStyle = '#ffff00';
                ctx.shadowColor = '#ffff00';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(28, 22, 3, 0, Math.PI * 2);
                ctx.arc(36, 22, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                
                textures.push(canvas.toDataURL());
            }
            
            return textures;
        },
        
        // Generate screamer sprite
        generateScreamerSprite(canvas, ctx) {
            const textures = [];
            
            for (let f = 0; f < 8; f++) {
                ctx.clearRect(0, 0, 64, 64);
                
                const mouthOpen = Math.sin(f * Math.PI / 4) > 0 ? 8 : 4;
                
                // Thin body
                ctx.fillStyle = '#880000';
                ctx.beginPath();
                ctx.ellipse(32, 32, 8, 16, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Head
                ctx.fillStyle = '#aa0000';
                ctx.beginPath();
                ctx.arc(32, 20, 10, 0, Math.PI * 2);
                ctx.fill();
                
                // Screaming mouth
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.ellipse(32, 24, 4, mouthOpen / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Wide eyes
                ctx.fillStyle = '#fff';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(28, 18, 4, 0, Math.PI * 2);
                ctx.arc(36, 18, 4, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(28, 18, 2, 0, Math.PI * 2);
                ctx.arc(36, 18, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                
                textures.push(canvas.toDataURL());
            }
            
            return textures;
        },
        
        // Generate devourer (boss) sprite
        generateDevourerSprite(canvas, ctx) {
            const textures = [];
            
            for (let f = 0; f < 8; f++) {
                ctx.clearRect(0, 0, 64, 64);
                
                const pulse = Math.sin(f * Math.PI / 4) * 3;
                
                // Large body
                const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 28 + pulse);
                gradient.addColorStop(0, '#660066');
                gradient.addColorStop(0.5, '#440044');
                gradient.addColorStop(1, '#220022');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.ellipse(32, 32, 28 + pulse, 24 - pulse, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Multiple eyes
                ctx.fillStyle = '#ff00ff';
                ctx.shadowColor = '#ff00ff';
                ctx.shadowBlur = 12;
                
                for (let e = 0; e < 5; e++) {
                    const angle = (e / 5) * Math.PI * 2 + f * 0.2;
                    const ex = 32 + Math.cos(angle) * 16;
                    const ey = 32 + Math.sin(angle) * 16;
                    ctx.beginPath();
                    ctx.arc(ex, ey, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Maw
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(32, 32, 12 + pulse / 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Teeth
                ctx.fillStyle = '#fff';
                for (let t = 0; t < 8; t++) {
                    const tAngle = (t / 8) * Math.PI * 2;
                    const tx = 32 + Math.cos(tAngle) * 10;
                    const ty = 32 + Math.sin(tAngle) * 10;
                    ctx.beginPath();
                    ctx.moveTo(tx, ty);
                    ctx.lineTo(32 + Math.cos(tAngle) * 14, 32 + Math.sin(tAngle) * 14);
                    ctx.stroke();
                }
                
                ctx.shadowBlur = 0;
                textures.push(canvas.toDataURL());
            }
            
            return textures;
        },
        
        // Play animation
        playAnimation(entity, animationName, direction = 0) {
            const key = `${entity.type}_${animationName}`;
            
            if (!this.animations[entity.type] || !this.animations[entity.type][animationName]) {
                return null;
            }
            
            const animDef = this.animations[entity.type][animationName];
            
            this.currentAnimations[key] = {
                entity: entity,
                animation: animationName,
                frame: 0,
                timer: 0,
                frameDuration: 1 / animDef.fps,
                loop: animDef.loop,
                direction: direction,
                totalFrames: animDef.frames
            };
            
            return this.currentAnimations[key];
        },
        
        // Update animations
        update(dt) {
            for (const key in this.currentAnimations) {
                const anim = this.currentAnimations[key];
                anim.timer += dt;
                
                if (anim.timer >= anim.frameDuration) {
                    anim.timer = 0;
                    anim.frame++;
                    
                    if (anim.frame >= anim.totalFrames) {
                        if (anim.loop) {
                            anim.frame = 0;
                        } else {
                            delete this.currentAnimations[key];
                            continue;
                        }
                    }
                }
            }
        },
        
        // Get current frame
        getCurrentFrame(entity, animationName) {
            const key = `${entity.type}_${animationName}`;
            const anim = this.currentAnimations[key];
            
            if (!anim) return 0;
            return anim.frame;
        },
        
        // Get sprite texture
        getSprite(entityType, animationName, frame, direction = 0) {
            const spriteKey = entityType.replace(/([A-Z])/g, '_$1').toLowerCase();
            
            if (this.proceduralSprites[spriteKey] && this.proceduralSprites[spriteKey][frame]) {
                return this.proceduralSprites[spriteKey][frame];
            }
            
            return null;
        },
        
        // Draw animated sprite
        drawSprite(ctx, x, y, width, height, entityType, animationName, direction = 0, flip = false) {
            const frame = this.getCurrentFrame(entityType, animationName);
            const spriteKey = entityType.replace(/([A-Z])/g, '_$1').toLowerCase();
            
            if (this.proceduralSprites[spriteKey] && this.proceduralSprites[spriteKey][frame]) {
                const img = new Image();
                img.src = this.proceduralSprites[spriteKey][frame];
                
                ctx.save();
                ctx.translate(x, y);
                if (flip) ctx.scale(-1, 1);
                ctx.drawImage(img, -width / 2, -height / 2, width, height);
                ctx.restore();
            } else {
                // Fallback: draw colored ellipse
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        
        // Cleanup
        destroy() {
            this.animations = {};
            this.currentAnimations = {};
            this.proceduralSprites = {};
        }
    };

    // Export
    window.ShadowCrawlerSpriteSystem = SpriteSystem;
})();
