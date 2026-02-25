/* ============================================================
   HELLAPHOBIA - SPRITE SYSTEM
   Texture Atlasing | Sprite Animations | 8-Direction Rendering
   Procedural Sprite Generation
   ============================================================ */

(function() {
    'use strict';

    const SpriteSystem = {
        // Sprite definitions
        sprites: {},
        animations: {},
        atlases: {},

        // Current animation state
        activeAnimations: new Map(),

        // Procedural sprite cache
        spriteCanvases: {},

        // Initialize sprite system
        init() {
            this.defineSprites();
            this.defineAnimations();
            this.generateAllSprites();
            console.log('[SpriteSystem] Initialized');
        },

        // Define sprite metadata
        defineSprites() {
            // Player sprites (8 directions × 4 states)
            const directions = ['down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left', 'down-left'];

            directions.forEach((dir, index) => {
                this.sprites[`player_${dir}_idle`] = {
                    width: 32,
                    height: 40,
                    pivot: { x: 0.5, y: 1.0 },
                    atlasRegion: this.getAtlasRegion('player', index)
                };

                this.sprites[`player_${dir}_walk_1`] = {
                    width: 32,
                    height: 40,
                    pivot: { x: 0.5, y: 1.0 },
                    atlasRegion: this.getAtlasRegion('player_walk', index * 2)
                };

                this.sprites[`player_${dir}_walk_2`] = {
                    width: 32,
                    height: 40,
                    pivot: { x: 0.5, y: 1.0 },
                    atlasRegion: this.getAtlasRegion('player_walk', index * 2 + 1)
                };

                this.sprites[`player_${dir}_run_1`] = {
                    width: 32,
                    height: 40,
                    pivot: { x: 0.5, y: 1.0 },
                    atlasRegion: this.getAtlasRegion('player_run', index * 2)
                };

                this.sprites[`player_${dir}_run_2`] = {
                    width: 32,
                    height: 40,
                    pivot: { x: 0.5, y: 1.0 },
                    atlasRegion: this.getAtlasRegion('player_run', index * 2 + 1)
                };
            });

            // Monster sprites
            const monsterTypes = ['crawler', 'chaser', 'wailer', 'stalker', 'brute', 'phantom'];

            monsterTypes.forEach(type => {
                directions.forEach((dir, index) => {
                    this.sprites[`${type}_${dir}_idle`] = {
                        width: 32,
                        height: 32,
                        pivot: { x: 0.5, y: 1.0 },
                        atlasRegion: this.getAtlasRegion(`monster_${type}`, index)
                    };

                    this.sprites[`${type}_${dir}_walk_1`] = {
                        width: 32,
                        height: 32,
                        pivot: { x: 0.5, y: 1.0 },
                        atlasRegion: this.getAtlasRegion(`monster_${type}_walk`, index * 2)
                    };

                    this.sprites[`${type}_${dir}_walk_2`] = {
                        width: 32,
                        height: 32,
                        pivot: { x: 0.5, y: 1.0 },
                        atlasRegion: this.getAtlasRegion(`monster_${type}_walk`, index * 2 + 1)
                    };
                });
            });

            // Environment sprites
            for (let i = 0; i < 8; i++) {
                this.sprites[`floor_${i}`] = {
                    width: 32,
                    height: 32,
                    pivot: { x: 0, y: 0 },
                    atlasRegion: this.getAtlasRegion('floor', i)
                };

                this.sprites[`wall_${i}`] = {
                    width: 32,
                    height: 32,
                    pivot: { x: 0, y: 0 },
                    atlasRegion: this.getAtlasRegion('wall', i)
                };
            }

            // Effect sprites
            this.sprites['blood_1'] = { width: 16, height: 16, pivot: { x: 0.5, y: 0.5 }, atlasRegion: { u: 0.7, v: 0.7, w: 0.05, h: 0.05 } };
            this.sprites['blood_2'] = { width: 20, height: 20, pivot: { x: 0.5, y: 0.5 }, atlasRegion: { u: 0.75, v: 0.7, w: 0.05, h: 0.05 } };
            this.sprites['spark_1'] = { width: 8, height: 8, pivot: { x: 0.5, y: 0.5 }, atlasRegion: { u: 0.8, v: 0.7, w: 0.03, h: 0.03 } };
            this.sprites['smoke_1'] = { width: 24, height: 24, pivot: { x: 0.5, y: 0.5 }, atlasRegion: { u: 0.85, v: 0.7, w: 0.05, h: 0.05 } };
        },

        // Define animations
        defineAnimations() {
            // Player animations
            this.animations['player_idle'] = {
                frames: ['player_down_idle'],
                frameTime: 0.5,
                loop: true
            };

            this.animations['player_walk_down'] = {
                frames: ['player_down_walk_1', 'player_down_walk_2'],
                frameTime: 0.15,
                loop: true
            };

            this.animations['player_walk_up'] = {
                frames: ['player_up_walk_1', 'player_up_walk_2'],
                frameTime: 0.15,
                loop: true
            };

            this.animations['player_walk_left'] = {
                frames: ['player_left_walk_1', 'player_left_walk_2'],
                frameTime: 0.15,
                loop: true
            };

            this.animations['player_walk_right'] = {
                frames: ['player_right_walk_1', 'player_right_walk_2'],
                frameTime: 0.15,
                loop: true
            };

            this.animations['player_run_down'] = {
                frames: ['player_down_run_1', 'player_down_run_2'],
                frameTime: 0.08,
                loop: true
            };

            this.animations['player_run_up'] = {
                frames: ['player_up_run_1', 'player_up_run_2'],
                frameTime: 0.08,
                loop: true
            };

            this.animations['player_run_left'] = {
                frames: ['player_left_run_1', 'player_left_run_2'],
                frameTime: 0.08,
                loop: true
            };

            this.animations['player_run_right'] = {
                frames: ['player_right_run_1', 'player_right_run_2'],
                frameTime: 0.08,
                loop: true
            };

            // Monster animations
            ['crawler', 'chaser', 'wailer', 'stalker', 'brute', 'phantom'].forEach(type => {
                this.animations[`${type}_idle`] = {
                    frames: [`${type}_down_idle`],
                    frameTime: 0.5,
                    loop: true
                };

                this.animations[`${type}_walk`] = {
                    frames: [`${type}_down_walk_1`, `${type}_down_walk_2`],
                    frameTime: 0.2,
                    loop: true
                };
            });

            // Effect animations
            this.animations['blood_splatter'] = {
                frames: ['blood_1', 'blood_2'],
                frameTime: 0.1,
                loop: false
            };

            this.animations['spark'] = {
                frames: ['spark_1'],
                frameTime: 0.05,
                loop: false
            };

            this.animations['smoke_puff'] = {
                frames: ['smoke_1'],
                frameTime: 0.3,
                loop: false
            };
        },

        // Get atlas region for sprite
        getAtlasRegion(baseName, index) {
            // Calculate position in atlas grid
            const atlasWidth = 1024;
            const tileSize = 64;
            const cols = atlasWidth / tileSize;

            const col = index % cols;
            const row = Math.floor(index / cols);

            return {
                u: (col * tileSize) / atlasWidth,
                v: (row * tileSize) / atlasHeight,
                w: tileSize / atlasWidth,
                h: tileSize / atlasHeight
            };
        },

        // Generate all sprites procedurally
        generateAllSprites() {
            // Create sprite canvas cache
            const mainCanvas = document.createElement('canvas');
            mainCanvas.width = 2048;
            mainCanvas.height = 2048;
            const ctx = mainCanvas.getContext('2d');

            let currentX = 10;
            let currentY = 10;
            const tileSize = 64;
            const spacing = 10;

            // Generate player sprites
            const directions = [
                { name: 'down', angle: 0 },
                { name: 'down-right', angle: 45 },
                { name: 'right', angle: 90 },
                { name: 'up-right', angle: 135 },
                { name: 'up', angle: 180 },
                { name: 'up-left', angle: 225 },
                { name: 'left', angle: 270 },
                { name: 'down-left', angle: 315 }
            ];

            // Player sprites
            directions.forEach((dir, dirIndex) => {
                // Idle
                this.drawPlayerSprite(ctx, currentX, currentY, dir.angle, 'idle', 0);
                this.sprites[`player_${dir.name}_idle`] = {
                    width: 32,
                    height: 40,
                    pivot: { x: 0.5, y: 1.0 },
                    atlasRegion: this.uvFromCanvas(currentX, currentY, 32, 40, mainCanvas.width, mainCanvas.height)
                };
                currentX += tileSize + spacing;

                // Walk frames
                for (let f = 0; f < 2; f++) {
                    this.drawPlayerSprite(ctx, currentX, currentY, dir.angle, 'walk', f);
                    this.sprites[`player_${dir.name}_walk_${f + 1}`] = {
                        width: 32,
                        height: 40,
                        pivot: { x: 0.5, y: 1.0 },
                        atlasRegion: this.uvFromCanvas(currentX, currentY, 32, 40, mainCanvas.width, mainCanvas.height)
                    };
                    currentX += tileSize + spacing;
                }

                // Run frames
                for (let f = 0; f < 2; f++) {
                    this.drawPlayerSprite(ctx, currentX, currentY, dir.angle, 'run', f);
                    this.sprites[`player_${dir.name}_run_${f + 1}`] = {
                        width: 32,
                        height: 40,
                        pivot: { x: 0.5, y: 1.0 },
                        atlasRegion: this.uvFromCanvas(currentX, currentY, 32, 40, mainCanvas.width, mainCanvas.height)
                    };
                    currentX += tileSize + spacing;
                }

                // Wrap to next row
                if (dirIndex % 4 === 3) {
                    currentX = 10;
                    currentY += tileSize + spacing;
                }
            }

            // Next row for monsters
            currentY += spacing * 2;
            currentX = 10;

            // Monster sprites
            const monsterTypes = [
                { name: 'crawler', color: '#664433', eyeColor: '#ff4444', size: 32 },
                { name: 'chaser', color: '#44aa44', eyeColor: '#ff0000', size: 32 },
                { name: 'wailer', color: '#4444aa', eyeColor: '#ffff00', size: 32 },
                { name: 'stalker', color: '#333333', eyeColor: '#ffffff', size: 32 },
                { name: 'brute', color: '#883333', eyeColor: '#ff6600', size: 32 },
                { name: 'phantom', color: '#666688', eyeColor: '#aaffff', size: 32 }
            ];

            monsterTypes.forEach((monster, mIndex) => {
                directions.forEach((dir, dirIndex) => {
                    this.drawMonsterSprite(ctx, currentX, currentY, monster, dir.angle);
                    this.sprites[`${monster.name}_${dir.name}_idle`] = {
                        width: monster.size,
                        height: monster.size,
                        pivot: { x: 0.5, y: 1.0 },
                        atlasRegion: this.uvFromCanvas(currentX, currentY, monster.size, monster.size, mainCanvas.width, mainCanvas.height)
                    };
                    currentX += tileSize + spacing;
                });

                // Walk frames for each monster
                for (let f = 0; f < 2; f++) {
                    directions.forEach((dir, dirIndex) => {
                        this.drawMonsterSprite(ctx, currentX, currentY, monster, dir.angle, f);
                        this.sprites[`${monster.name}_${dir.name}_walk_${f + 1}`] = {
                            width: monster.size,
                            height: monster.size,
                            pivot: { x: 0.5, y: 1.0 },
                            atlasRegion: this.uvFromCanvas(currentX, currentY, monster.size, monster.size, mainCanvas.width, mainCanvas.height)
                        };
                        currentX += tileSize + spacing;
                    });
                }

                currentX = 10;
                currentY += tileSize + spacing;
            }

            // Generate floor and wall tiles
            currentY += spacing * 2;
            currentX = 10;

            for (let i = 0; i < 8; i++) {
                // Floor tiles
                this.drawFloorTile(ctx, currentX, currentY, i);
                this.sprites[`floor_${i}`] = {
                    width: 32,
                    height: 32,
                    pivot: { x: 0, y: 0 },
                    atlasRegion: this.uvFromCanvas(currentX, currentY, 32, 32, mainCanvas.width, mainCanvas.height)
                };
                currentX += tileSize + spacing;

                // Wall tiles
                this.drawWallTile(ctx, currentX, currentY, i);
                this.sprites[`wall_${i}`] = {
                    width: 32,
                    height: 32,
                    pivot: { x: 0, y: 0 },
                    atlasRegion: this.uvFromCanvas(currentX, currentY, 32, 32, mainCanvas.width, mainCanvas.height)
                };
                currentX += tileSize + spacing;
            }

            // Generate effect sprites
            currentY += spacing * 2;
            currentX = 10;

            // Blood splatters
            for (let i = 0; i < 4; i++) {
                this.drawBloodSplatter(ctx, currentX, currentY, i);
                this.sprites[`blood_${i + 1}`] = {
                    width: 16 + i * 4,
                    height: 16 + i * 4,
                    pivot: { x: 0.5, y: 0.5 },
                    atlasRegion: this.uvFromCanvas(currentX, currentY, 16 + i * 4, 16 + i * 4, mainCanvas.width, mainCanvas.height)
                };
                currentX += tileSize + spacing;
            }

            // Store the main atlas canvas
            this.mainAtlas = mainCanvas;
            this.mainAtlasDataUrl = mainCanvas.toDataURL('image/png');
        },

        // Draw player sprite
        drawPlayerSprite(ctx, x, y, angle, state, frame) {
            ctx.save();
            ctx.translate(x + 16, y + 20);
            ctx.rotate(angle * Math.PI / 180);

            const bodyColor = '#4a9eff';
            const skinColor = '#ffdbac';
            const eyeColor = '#ffffff';
            const pupilColor = '#222222';

            // Body animation offset
            let bodyOffset = 0;
            let legOffset = 0;

            if (state === 'walk') {
                legOffset = frame === 0 ? -3 : 3;
                bodyOffset = Math.sin(frame * Math.PI) * 2;
            } else if (state === 'run') {
                legOffset = frame === 0 ? -6 : 6;
                bodyOffset = Math.sin(frame * Math.PI) * 4;
            }

            // Legs
            ctx.fillStyle = '#3366aa';
            ctx.fillRect(-8 + legOffset, 10 + bodyOffset, 6, 12);
            ctx.fillRect(2 - legOffset, 10 + bodyOffset, 6, 12);

            // Body
            ctx.fillStyle = bodyColor;
            ctx.fillRect(-10, -8 + bodyOffset, 20, 22);

            // Arms
            ctx.fillStyle = skinColor;
            ctx.fillRect(-14, -6 + bodyOffset, 4, 14);
            ctx.fillRect(10, -6 + bodyOffset, 4, 14);

            // Head
            ctx.fillStyle = skinColor;
            ctx.beginPath();
            ctx.arc(0, -14 + bodyOffset, 10, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = eyeColor;
            ctx.beginPath();
            ctx.arc(-4, -16 + bodyOffset, 3, 0, Math.PI * 2);
            ctx.arc(4, -16 + bodyOffset, 3, 0, Math.PI * 2);
            ctx.fill();

            // Pupils (follow cursor direction approximation)
            ctx.fillStyle = pupilColor;
            ctx.beginPath();
            ctx.arc(-3, -16 + bodyOffset, 1.5, 0, Math.PI * 2);
            ctx.arc(3, -16 + bodyOffset, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Hair
            ctx.fillStyle = '#443322';
            ctx.beginPath();
            ctx.arc(0, -18 + bodyOffset, 11, Math.PI, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        },

        // Draw monster sprite
        drawMonsterSprite(ctx, x, y, monster, angle, frame = 0) {
            ctx.save();
            ctx.translate(x + 16, y + 16);
            ctx.rotate(angle * Math.PI / 180);

            const legOffset = frame === 0 ? -2 : 2;

            // Body
            ctx.fillStyle = monster.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, 14, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            // Legs
            ctx.fillStyle = monster.color;
            ctx.fillRect(-10 + legOffset, 8, 4, 6);
            ctx.fillRect(6 - legOffset, 8, 4, 6);

            // Eyes
            ctx.fillStyle = monster.eyeColor;
            ctx.beginPath();
            ctx.arc(-6, -2, 4, 0, Math.PI * 2);
            ctx.arc(6, -2, 4, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-5, -2, 2, 0, Math.PI * 2);
            ctx.arc(5, -2, 2, 0, Math.PI * 2);
            ctx.fill();

            // Glow effect for some monsters
            if (['phantom', 'wailer'].includes(monster.name)) {
                ctx.shadowColor = monster.eyeColor;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(0, 0, 18, 0, Math.PI * 2);
                ctx.strokeStyle = monster.eyeColor;
                ctx.globalAlpha = 0.3;
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }

            ctx.restore();
        },

        // Draw floor tile
        drawFloorTile(ctx, x, y, variation) {
            const tileSize = 32;

            // Base color
            const hues = [240, 250, 230, 260, 245, 235, 255, 240];
            const sats = [15, 12, 18, 14, 16, 13, 15, 17];
            const lights = [22, 20, 24, 19, 23, 21, 20, 22];

            ctx.fillStyle = `hsl(${hues[variation]}, ${sats[variation]}%, ${lights[variation]}%)`;
            ctx.fillRect(x, y, tileSize, tileSize);

            // Add texture
            ctx.fillStyle = `hsl(${hues[variation]}, ${sats[variation]}%, ${lights[variation] + 5}%)`;
            for (let i = 0; i < 8; i++) {
                const px = (i * 7) % tileSize;
                const py = Math.floor(i / 2) * 8 + 4;
                ctx.fillRect(x + px, y + py, 2, 2);
            }

            // Border
            ctx.strokeStyle = `hsl(${hues[variation]}, ${sats[variation]}%, ${lights[variation] - 5}%)`;
            ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1);
        },

        // Draw wall tile
        drawWallTile(ctx, x, y, variation) {
            const tileSize = 32;

            const hues = [250, 245, 255, 240, 248, 252, 246, 250];
            const sats = [20, 18, 22, 19, 21, 17, 20, 23];
            const lights = [28, 26, 30, 27, 29, 25, 28, 26];

            ctx.fillStyle = `hsl(${hues[variation]}, ${sats[variation]}%, ${lights[variation]}%)`;
            ctx.fillRect(x, y, tileSize, tileSize);

            // Brick pattern
            ctx.strokeStyle = `hsl(${hues[variation]}, ${sats[variation]}%, ${lights[variation] - 10}%)`;
            ctx.lineWidth = 1;

            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(x, y + tileSize / 2);
            ctx.lineTo(x + tileSize, y + tileSize / 2);
            ctx.stroke();

            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(x + tileSize / 2, y);
            ctx.lineTo(x + tileSize / 2, y + tileSize / 2);
            ctx.moveTo(x + tileSize / 4, y + tileSize / 2);
            ctx.lineTo(x + tileSize / 4, y + tileSize);
            ctx.moveTo(x + tileSize * 0.75, y + tileSize / 2);
            ctx.lineTo(x + tileSize * 0.75, y + tileSize);
            ctx.stroke();
        },

        // Draw blood splatter
        drawBloodSplatter(ctx, x, y, variation) {
            const size = 16 + variation * 4;
            const center = size / 2;

            ctx.fillStyle = '#aa0000';
            ctx.beginPath();

            // Irregular blob shape
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const radius = center * (0.6 + Math.random() * 0.4);
                const px = x + center + Math.cos(angle) * radius;
                const py = y + center + Math.sin(angle) * radius;

                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }

            ctx.closePath();
            ctx.fill();

            // Add some droplets
            ctx.fillStyle = '#880000';
            for (let i = 0; i < 3; i++) {
                const dx = x + Math.random() * size;
                const dy = y + Math.random() * size;
                ctx.beginPath();
                ctx.arc(dx, dy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        },

        // Convert canvas coordinates to UV
        uvFromCanvas(x, y, w, h, atlasW, atlasH) {
            return {
                u: x / atlasW,
                v: y / atlasH,
                w: w / atlasW,
                h: h / atlasH
            };
        },

        // Get sprite by name
        getSprite(name) {
            return this.sprites[name] || null;
        },

        // Get animation by name
        getAnimation(name) {
            return this.animations[name] || null;
        },

        // Play animation
        playAnimation(entityId, animationName, reset = false) {
            const anim = this.animations[animationName];
            if (!anim) return;

            const existing = this.activeAnimations.get(entityId);
            if (existing && existing.name === animationName && !reset) {
                return;
            }

            this.activeAnimations.set(entityId, {
                name: animationName,
                frames: anim.frames,
                frameTime: anim.frameTime,
                loop: anim.loop,
                currentFrame: 0,
                timer: 0,
                finished: false
            });
        },

        // Stop animation
        stopAnimation(entityId) {
            this.activeAnimations.delete(entityId);
        },

        // Update animation
        updateAnimation(entityId, dt) {
            const anim = this.activeAnimations.get(entityId);
            if (!anim) return null;

            anim.timer += dt;

            if (anim.timer >= anim.frameTime) {
                anim.timer -= anim.frameTime;
                anim.currentFrame++;

                if (anim.currentFrame >= anim.frames.length) {
                    if (anim.loop) {
                        anim.currentFrame = 0;
                    } else {
                        anim.currentFrame = anim.frames.length - 1;
                        anim.finished = true;
                    }
                }
            }

            return anim.frames[anim.currentFrame];
        },

        // Get current sprite for entity
        getCurrentSprite(entityId) {
            const spriteName = this.updateAnimation(entityId, 0);
            if (spriteName) {
                return this.sprites[spriteName];
            }
            return null;
        },

        // Get atlas texture
        getAtlasTexture() {
            return this.mainAtlas;
        },

        // Get atlas as data URL (for WebGL texture creation)
        getAtlasDataURL() {
            return this.mainAtlasDataUrl;
        }
    };

    // Export
    window.SpriteSystem = SpriteSystem;

    console.log('[SpriteSystem] Module loaded');
})();
