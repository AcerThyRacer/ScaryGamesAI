/* ============================================================
   HELLAPHOBIA - PHASE 1 VISUAL INTEGRATION
   WebGL Rendering | Sprites | Lighting | Post-Processing
   Complete Visual Overhaul Integration
   ============================================================ */

(function() {
    'use strict';

    const Phase1VisualIntegration = {
        // System references
        webgl: null,
        sprites: null,
        lighting: null,
        postProcess: null,

        // State
        initialized: false,
        useWebGL: false,
        useSprites: false,

        // Quality settings
        quality: 'high', // low, medium, high, ultra

        // Performance tracking
        stats: {
            fps: 60,
            frameTime: 16.67,
            drawCalls: 0,
            lightCount: 0,
            spriteCount: 0
        },

        // Initialize all visual systems
        async init() {
            console.log('[Phase1Visual] Initializing visual systems...');

            // Detect quality settings based on hardware
            this.detectQuality();

            // Initialize sprite system first (needed for textures)
            if (typeof SpriteSystem !== 'undefined') {
                SpriteSystem.init();
                this.sprites = SpriteSystem;
                this.useSprites = true;
            }

            // Initialize WebGL renderer
            const canvas = document.getElementById('game-canvas');
            if (typeof WebGLRenderer !== 'undefined' && canvas) {
                this.useWebGL = await WebGLRenderer.init(canvas);
                this.webgl = WebGLRenderer;

                if (this.useWebGL) {
                    console.log('[Phase1Visual] WebGL rendering enabled');
                } else {
                    console.log('[Phase1Visual] Using Canvas 2D fallback');
                }
            }

            // Initialize lighting system
            if (typeof LightingSystem !== 'undefined') {
                LightingSystem.init();
                this.lighting = LightingSystem;
            }

            // Initialize post-processing
            if (typeof PostProcessStack !== 'undefined') {
                PostProcessStack.init();
                this.postProcess = PostProcessStack;
            }

            // Set up quality settings
            this.applyQualitySettings(this.quality);

            // Start performance monitoring
            this.startPerformanceMonitoring();

            this.initialized = true;
            console.log('[Phase1Visual] Visual systems initialized');

            // Dispatch event for other systems
            window.dispatchEvent(new CustomEvent('visualSystemsReady', {
                detail: { useWebGL: this.useWebGL, useSprites: this.useSprites }
            }));
        },

        // Detect appropriate quality settings
        detectQuality() {
            // Simple heuristic - can be expanded
            const canvas = document.getElementById('game-canvas');
            const area = canvas ? canvas.width * canvas.height : 0;

            if (area > 2000000) {
                this.quality = 'ultra';
            } else if (area > 1000000) {
                this.quality = 'high';
            } else if (area > 500000) {
                this.quality = 'medium';
            } else {
                this.quality = 'low';
            }

            console.log(`[Phase1Visual] Auto-detected quality: ${this.quality} (${canvas?.width}x${canvas?.height})`);
        },

        // Apply quality settings
        applyQualitySettings(quality) {
            const settings = {
                low: {
                    maxLights: 8,
                    shadows: false,
                    bloom: false,
                    spriteResolution: 0.5,
                    particleLimit: 100
                },
                medium: {
                    maxLights: 16,
                    shadows: false,
                    bloom: true,
                    spriteResolution: 0.75,
                    particleLimit: 300
                },
                high: {
                    maxLights: 32,
                    shadows: true,
                    bloom: true,
                    spriteResolution: 1.0,
                    particleLimit: 500
                },
                ultra: {
                    maxLights: 64,
                    shadows: true,
                    bloom: true,
                    chromaticAberration: true,
                    spriteResolution: 1.0,
                    particleLimit: 1000
                }
            };

            const s = settings[quality];

            // Apply to lighting
            if (this.lighting) {
                this.lighting.maxLights = s.maxLights;
                this.lighting.shadowsEnabled = s.shadows;
            }

            // Apply to post-process
            if (this.postProcess) {
                this.postProcess.setEffectEnabled('bloom', s.bloom);
                if (quality === 'ultra') {
                    this.postProcess.setEffectEnabled('chromaticAberration', true);
                }
            }

            console.log(`[Phase1Visual] Applied ${quality} quality settings`);
        },

        // Update visual systems
        update(dt, time, player, monsters) {
            if (!this.initialized) return;

            // Update lighting
            if (this.lighting) {
                this.lighting.update(dt, time);
                this.stats.lightCount = this.lighting.getLightCount();
            }

            // Update post-process temporal effects
            if (this.postProcess) {
                this.postProcess.updateTemporalEffects(dt);

                // Update sanity-based effects
                if (player) {
                    this.postProcess.updateSanityEffects(player.sanity);
                    this.postProcess.updateCombatEffects(
                        player.hp < 30,
                        player.invincible && player.invincibleTimer > 0.8,
                        window.BossFightManager && BossFightManager.state === 'combat'
                    );
                }
            }

            // Update sprite animations
            if (this.sprites) {
                // Player animation
                if (player && !player.dead) {
                    this.updatePlayerAnimation(player);
                }

                // Monster animations
                if (monsters) {
                    for (const monster of monsters) {
                        this.updateMonsterAnimation(monster);
                    }
                }
            }
        },

        // Update player animation
        updatePlayerAnimation(player) {
            if (!this.sprites) return;

            const direction = this.getDirectionName(player.facing, player.vy);

            if (player.dashing) {
                this.sprites.playAnimation('player', `player_run_${direction}`, false);
            } else if (player.vy !== 0) {
                this.sprites.playAnimation('player', `player_jump_${direction}`, false);
            } else if (Math.abs(player.vx) > 10) {
                this.sprites.playAnimation('player', `player_run_${direction}`, true);
            } else if (Math.abs(player.vx) > 1) {
                this.sprites.playAnimation('player', `player_walk_${direction}`, true);
            } else {
                this.sprites.playAnimation('player', `player_${direction}_idle`, true);
            }
        },

        // Update monster animation
        updateMonsterAnimation(monster) {
            if (!this.sprites || !monster.type) return;

            const direction = this.getDirectionName(
                monster.vx > 0 ? 1 : -1,
                monster.vy
            );

            if (Math.abs(monster.vx) > 5 || Math.abs(monster.vy) > 5) {
                this.sprites.playAnimation(monster.id, `${monster.type}_walk`, true);
            } else {
                this.sprites.playAnimation(monster.id, `${monster.type}_idle`, true);
            }
        },

        // Get direction name from velocity
        getDirectionName(facing, vy) {
            if (vy < -5) return 'up';
            if (vy > 5) return 'down';
            if (facing > 0) return 'right';
            return 'left';
        },

        // Render using visual systems
        render(ctx, camera, player, monsters, tiles, particles) {
            if (!this.initialized) return;

            const W = ctx.canvas.width;
            const H = ctx.canvas.height;

            // Begin frame (WebGL)
            if (this.useWebGL && this.webgl) {
                this.webgl.beginFrame();
                this.webgl.setCamera(camera.x, camera.y);
            }

            // Draw tiles
            this.renderTiles(ctx, tiles, camera);

            // Draw monsters with sprites
            this.renderMonsters(ctx, monsters, camera);

            // Draw player with sprite
            this.renderPlayer(ctx, player, camera);

            // Draw particles
            this.renderParticles(ctx, particles, camera);

            // Draw lighting overlay
            this.renderLighting(ctx, camera);

            // End frame (WebGL with post-process)
            if (this.useWebGL && this.webgl) {
                const ppSettings = this.postProcess ? this.postProcess.getWebGLSettings() : {};
                this.webgl.endFrame(ppSettings);
            } else {
                // Apply post-process to Canvas 2D
                if (this.postProcess) {
                    this.postProcess.applyToCanvas(ctx, W, H);
                    this.postProcess.renderScanlines(ctx, W, H);
                    this.postProcess.renderVignette(ctx, W, H);
                }
            }

            // Update stats
            this.stats.drawCalls++;
        },

        // Render tiles
        renderTiles(ctx, tiles, camera) {
            if (!tiles || tiles.length === 0) return;

            const W = ctx.canvas.width;
            const H = ctx.canvas.height;

            // Cull tiles outside viewport
            for (const tile of tiles) {
                const tx = tile.x - camera.x;
                const ty = tile.y - camera.y;

                // Skip if outside viewport
                if (tx < -64 || ty < -64 || tx > W || ty > H) continue;

                if (this.useWebGL && this.sprites) {
                    // WebGL sprite rendering
                    const spriteName = tile.type === 'wall' ? `wall_${tile.variation || 0}` : `floor_${tile.variation || 0}`;
                    const sprite = this.sprites.getSprite(spriteName);

                    if (sprite) {
                        this.webgl.drawSprite(
                            tx, ty, tile.width || 32, tile.height || 32,
                            sprite.atlasRegion,
                            [1, 1, 1, 1]
                        );
                    }
                } else {
                    // Canvas 2D fallback
                    this.drawTileCanvas(ctx, tile, tx, ty);
                }
            }
        },

        // Draw tile in Canvas 2D
        drawTileCanvas(ctx, tile, x, y) {
            if (tile.type === 'wall') {
                ctx.fillStyle = tile.color || '#444455';
                ctx.fillRect(x, y, tile.width || 32, tile.height || 32);

                // Brick pattern
                ctx.strokeStyle = '#555566';
                ctx.strokeRect(x, y, tile.width || 32, tile.height || 32);
            } else {
                ctx.fillStyle = tile.color || '#2a2a3a';
                ctx.fillRect(x, y, tile.width || 32, tile.height || 32);

                // Texture
                ctx.strokeStyle = '#3a3a4a';
                ctx.strokeRect(x, y, tile.width || 32, tile.height || 32);
            }
        },

        // Render monsters
        renderMonsters(ctx, monsters, camera) {
            if (!monsters || monsters.length === 0) return;

            const W = ctx.canvas.width;
            const H = ctx.canvas.height;

            for (const monster of monsters) {
                const mx = monster.x - camera.x;
                const my = monster.y - camera.y;

                // Skip if outside viewport
                if (mx < -64 || my < -64 || mx > W || my > H) continue;

                if (this.useWebGL && this.sprites) {
                    // Get animated sprite
                    const spriteName = this.sprites.updateAnimation(monster.id, 1/60);
                    const sprite = spriteName ? this.sprites.getSprite(spriteName) :
                                   this.sprites.getSprite(`${monster.type}_down_idle`);

                    if (sprite) {
                        // Flash when hit
                        const color = monster.flash > 0 ? [2, 2, 2, 1] : [1, 1, 1, 1];

                        this.webgl.drawSprite(
                            mx, my, monster.width || 32, monster.height || 32,
                            sprite.atlasRegion,
                            color
                        );
                    }
                } else {
                    // Canvas 2D fallback
                    this.drawMonsterCanvas(ctx, monster, mx, my);
                }
            }
        },

        // Draw monster in Canvas 2D
        drawMonsterCanvas(ctx, monster, x, y) {
            ctx.fillStyle = monster.color || '#ff4444';

            // Body
            ctx.beginPath();
            ctx.ellipse(x + monster.width/2, y + monster.height/2,
                       monster.width/2, monster.height/2.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = monster.eyeColor || '#ffff00';
            ctx.beginPath();
            ctx.arc(x + monster.width/3, y + monster.height/2, 4, 0, Math.PI * 2);
            ctx.arc(x + monster.width*2/3, y + monster.height/2, 4, 0, Math.PI * 2);
            ctx.fill();

            // Glow effect for some monsters
            if (monster.glow) {
                ctx.shadowColor = monster.eyeColor;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(x + monster.width/2, y + monster.height/2,
                       monster.width/1.5, 0, Math.PI * 2);
                ctx.strokeStyle = monster.eyeColor;
                ctx.globalAlpha = 0.3;
                ctx.stroke();
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;
            }
        },

        // Render player
        renderPlayer(ctx, player, camera) {
            if (player.dead) return;

            const px = player.x - camera.x;
            const py = player.y - camera.y;
            const W = ctx.canvas.width;
            const H = ctx.canvas.height;

            // Skip if outside viewport
            if (px < -64 || py < -64 || px > W || py > H) return;

            if (this.useWebGL && this.sprites) {
                // Get animated sprite
                const spriteName = this.sprites.updateAnimation('player', 1/60);
                const sprite = spriteName ? this.sprites.getSprite(spriteName) :
                               this.sprites.getSprite('player_down_idle');

                if (sprite) {
                    // Flash when invincible
                    const alpha = player.invincible ?
                        0.5 + 0.5 * Math.sin(Date.now() * 0.02) : 1.0;

                    this.webgl.drawSprite(
                        px, py, player.w, player.h,
                        sprite.atlasRegion,
                        [1, 1, 1, alpha]
                    );
                }
            } else {
                // Canvas 2D fallback
                this.drawPlayerCanvas(ctx, player, px, py);
            }
        },

        // Draw player in Canvas 2D
        drawPlayerCanvas(ctx, player, x, y) {
            const bodyColor = '#4a9eff';
            const skinColor = '#ffdbac';

            // Body
            ctx.fillStyle = bodyColor;
            ctx.fillRect(x, y, player.w, player.h);

            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + player.w/2 - 8, y + 8, 6, 6);
            ctx.fillRect(x + player.w/2 + 2, y + 8, 6, 6);

            // Pupils
            ctx.fillStyle = '#222222';
            ctx.fillRect(x + player.w/2 - 6, y + 10, 3, 3);
            ctx.fillRect(x + player.w/2 + 4, y + 10, 3, 3);

            // Flash when invincible
            if (player.invincible) {
                ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.02);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x, y, player.w, player.h);
                ctx.globalAlpha = 1.0;
            }
        },

        // Render particles
        renderParticles(ctx, particles, camera) {
            if (!particles || particles.length === 0) return;

            for (const p of particles) {
                const px = p.x - camera.x;
                const py = p.y - camera.y;

                // Skip if outside viewport or dead
                if (p.life <= 0) continue;
                if (px < -10 || py < -10 || px > ctx.canvas.width || py > ctx.canvas.height) continue;

                if (this.useWebGL) {
                    // Simple quad for particles in WebGL
                    this.webgl.drawSprite(
                        px, py, p.size, p.size,
                        { u: 0.7, v: 0.7, w: 0.05, h: 0.05 },
                        [...p.color, p.life]
                    );
                } else {
                    // Canvas 2D
                    ctx.globalAlpha = p.life;
                    ctx.fillStyle = p.color ? `rgb(${p.color[0]*255},${p.color[1]*255},${p.color[2]*255})` : '#ffffff';
                    ctx.fillRect(px, py, p.size, p.size);
                    ctx.globalAlpha = 1.0;
                }
            }
        },

        // Render lighting overlay
        renderLighting(ctx, camera) {
            if (!this.lighting || !this.useWebGL) return;

            // WebGL handles lighting in shaders
            // This is for Canvas 2D fallback
        },

        // Start performance monitoring
        startPerformanceMonitoring() {
            let frameCount = 0;
            let lastTime = performance.now();

            const monitor = () => {
                frameCount++;
                const now = performance.now();

                if (now - lastTime >= 1000) {
                    this.stats.fps = frameCount;
                    this.stats.frameTime = 1000 / frameCount;
                    frameCount = 0;
                    lastTime = now;

                    // Auto-adjust quality if FPS too low
                    if (this.stats.fps < 30 && this.quality !== 'low') {
                        console.warn('[Phase1Visual] FPS low, reducing quality');
                        // Could auto-downgrade quality here
                    }
                }

                requestAnimationFrame(monitor);
            };

            monitor();
        },

        // Get current stats
        getStats() {
            return { ...this.stats };
        },

        // Set quality
        setQuality(quality) {
            this.quality = quality;
            this.applyQualitySettings(quality);
        },

        // Toggle WebGL
        toggleWebGL() {
            if (this.useWebGL) {
                console.log('[Phase1Visual] Would switch to Canvas 2D (requires restart)');
            } else {
                console.log('[Phase1Visual] Would switch to WebGL (requires restart)');
            }
        },

        // Trigger visual effect
        triggerEffect(effectName, intensity = 1.0, duration = 0.5) {
            if (this.postProcess) {
                this.postProcess.addTemporalEffect(effectName, intensity, duration);
            }
        },

        // Cleanup
        dispose() {
            if (this.webgl) {
                this.webgl.dispose();
            }
            this.initialized = false;
        }
    };

    // Export
    window.Phase1VisualIntegration = Phase1VisualIntegration;

    // Note: Initialization is handled by hellaphobia.js game loop
    // Auto-init removed to prevent double-initialization

    console.log('[Phase1VisualIntegration] Module loaded (awaiting game init)');
})();
