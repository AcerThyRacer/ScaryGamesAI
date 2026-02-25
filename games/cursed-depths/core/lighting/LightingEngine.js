/* ============================================================
   CURSED DEPTHS — Advanced Lighting Engine
   Phase 1: Dynamic lighting with multiple modes and tile occlusion
   ============================================================ */

class LightingEngine {
    constructor() {
        this.lightMap = null;
        this.lightSources = [];
        this.mode = 'color'; // 'color', 'white', 'retro'
        this.enabled = true;
        this.dirty = true;
        
        // Lighting constants
        this.AMBIENT_LIGHT = 0.15;
        this.MAX_LIGHTS = 500;
        this.LIGHT_DECAY = 0.92;
        
        // Tile transparency map
        this.tileTransparency = {};
        this.initTileTransparency();
    }

    init(width, height) {
        this.lightMap = new Float32Array(width * height);
        this.width = width;
        this.height = height;
    }

    initTileTransparency() {
        // Define how much light passes through each tile type (0 = opaque, 1 = fully transparent)
        const transparency = {
            [T.AIR]: 1.0,
            [T.WATER]: 0.9,
            [T.GLASS]: 0.8,
            [T.LEAVES]: 0.4,
            [T.COBWEB]: 0.6,
            [T.TORCH]: 1.0,
            [T.CHANDELIER]: 0.7,
            [T.GLOW_SHROOM]: 0.8,
            [T.WORKBENCH]: 0.3,
            [T.TABLE]: 0.2,
            [T.CHAIR]: 0.3,
            [T.BED]: 0.2,
            [T.BOOKSHELF]: 0.4,
            [T.DOOR]: 0.1,
            [T.DUNGEON_DOOR]: 0.1,
            [T.TEMPLE_DOOR]: 0.1
        };
        this.tileTransparency = transparency;
    }

    setMode(mode) {
        if (['color', 'white', 'retro'].includes(mode)) {
            this.mode = mode;
            this.dirty = true;
        }
    }

    addLightSource(x, y, radius, color, intensity = 1.0) {
        if (this.lightSources.length >= this.MAX_LIGHTS) {
            // Remove oldest light source
            this.lightSources.shift();
        }

        this.lightSources.push({
            x, y, radius, color, intensity,
            id: Math.random().toString(36).substr(2, 9)
        });
        this.dirty = true;
    }

    removeLightSource(id) {
        const index = this.lightSources.findIndex(l => l.id === id);
        if (index !== -1) {
            this.lightSources.splice(index, 1);
            this.dirty = true;
        }
    }

    clearLightSources() {
        this.lightSources = [];
        this.dirty = true;
    }

    update(world, camera) {
        if (!this.enabled || !this.lightMap) return;

        // Clear lightmap with ambient light
        this.lightMap.fill(this.AMBIENT_LIGHT);

        // Calculate day/night ambient modifier
        const timeOfDay = getDayTimeFactor();
        const ambientModifier = 0.5 + timeOfDay * 0.5; // 0.5 at night, 1.0 during day

        // Process each light source
        for (const light of this.lightSources) {
            this.castLight(light, world);
        }

        // Apply biome-specific color tints
        this.applyBiomeColors(world, camera);

        this.dirty = false;
    }

    castLight(light, world) {
        const radius = Math.floor(light.radius);
        const centerX = Math.floor(light.x / TILE);
        const centerY = Math.floor(light.y / TILE);

        // Bresenham-style raycasting from center
        for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
            let x = centerX;
            let y = centerY;
            let currentIntensity = light.intensity;

            const dx = Math.cos(angle);
            const dy = Math.sin(angle);

            for (let i = 0; i < radius; i++) {
                x += dx;
                y += dy;

                if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) break;

                const tileIndex = Math.floor(x) + Math.floor(y) * WORLD_W;
                const tile = world[tileIndex] || T.AIR;

                // Get tile transparency
                const transparency = this.tileTransparency[tile] || 0;

                // Apply light to this position
                const existingLight = this.lightMap[tileIndex];
                const newLight = currentIntensity * (1 - transparency);
                
                if (newLight > existingLight) {
                    this.lightMap[tileIndex] = newLight;
                }

                // Reduce intensity based on distance and tile occlusion
                currentIntensity *= this.LIGHT_DECAY;
                currentIntensity *= (0.5 + transparency * 0.5);

                if (currentIntensity < 0.01) break;
            }
        }

        // Fill circle with smooth falloff
        this.fillLightCircle(centerX, centerY, radius, light.intensity);
    }

    fillLightCircle(cx, cy, radius, maxIntensity) {
        const r2 = radius * radius;
        for (let y = Math.max(0, cy - radius); y <= Math.min(WORLD_H - 1, cy + radius); y++) {
            for (let x = Math.max(0, cx - radius); x <= Math.min(WORLD_W - 1, cx + radius); x++) {
                const dx = x - cx;
                const dy = y - cy;
                const dist2 = dx * dx + dy * dy;

                if (dist2 <= r2) {
                    const dist = Math.sqrt(dist2);
                    const intensity = maxIntensity * (1 - dist / radius);
                    const tileIndex = x + y * WORLD_W;
                    
                    if (intensity > this.lightMap[tileIndex]) {
                        this.lightMap[tileIndex] = intensity;
                    }
                }
            }
        }
    }

    applyBiomeColors(world, camera) {
        // Get player's current biome
        const playerDepth = Math.floor(player.y / TILE);
        const playerX = Math.floor(player.x / TILE);
        
        let biomeColor = null;
        let tintStrength = 0.15;

        if (playerDepth > CAVE_Y && playerDepth < MUSH_Y) {
            biomeColor = [0.9, 0.85, 0.7]; // Underground brown tint
        } else if (playerDepth >= MUSH_Y && playerDepth < FROZEN_Y) {
            biomeColor = [0.8, 0.7, 1.0]; // Mushroom purple tint
        } else if (playerDepth >= FROZEN_Y && playerDepth < FLESH_Y) {
            biomeColor = [0.7, 0.85, 1.0]; // Ice blue tint
        } else if (playerDepth >= HIVE_Y && playerDepth < ABYSS_Y) {
            biomeColor = [1.0, 0.9, 0.6]; // Hive golden tint
        } else if (playerDepth >= ABYSS_Y) {
            biomeColor = [0.6, 0.7, 0.9]; // Deep abyss blue tint
        }

        // Check for corruption/crimson/hallow
        const checkRadius = 20;
        let evilCount = 0, crimsonCount = 0, hallowCount = 0;
        
        for (let dy = -checkRadius; dy <= checkRadius; dy += 5) {
            for (let dx = -checkRadius; dx <= checkRadius; dx += 5) {
                const tx = playerX + dx;
                const ty = playerY + dy;
                if (tx >= 0 && tx < WORLD_W && ty >= 0 && ty < WORLD_H) {
                    const tile = world[tx + ty * WORLD_W];
                    if ([T.CORRUPTION, T.EBONSTONE, T.CORRUPT_GRASS].includes(tile)) evilCount++;
                    if ([T.CRIMSON, T.CRIMSTONE, T.CRIMSON_GRASS].includes(tile)) crimsonCount++;
                    if ([T.HALLOWED_STONE, T.HALLOWED_GRASS, T.PEARLSTONE].includes(tile)) hallowCount++;
                }
            }
        }

        if (evilCount > 10) {
            biomeColor = [0.7, 0.5, 0.9]; // Purple corruption tint
            tintStrength = 0.25;
        } else if (crimsonCount > 10) {
            biomeColor = [0.9, 0.4, 0.5]; // Red crimson tint
            tintStrength = 0.25;
        } else if (hallowCount > 10) {
            biomeColor = [0.7, 0.8, 1.0]; // Blue/pink hallow tint
            tintStrength = 0.2;
        }

        // Apply biome tint to lightmap
        if (biomeColor) {
            for (let i = 0; i < this.lightMap.length; i++) {
                this.lightMap[i] *= (biomeColor[0] * tintStrength + (1 - tintStrength));
            }
        }
    }

    render(ctx, camera) {
        if (!this.enabled || !this.lightMap) return;

        const startX = Math.floor(camera.x / TILE);
        const startY = Math.floor(camera.y / TILE);
        const endX = Math.min(WORLD_W - 1, startX + Math.ceil(W / TILE) + 2);
        const endY = Math.min(WORLD_H - 1, startY + Math.ceil(H / TILE) + 2);

        // Create overlay based on lighting mode
        switch (this.mode) {
            case 'color':
                this.renderColorMode(ctx, startX, startY, endX, endY, camera);
                break;
            case 'white':
                this.renderWhiteMode(ctx, startX, startY, endX, endY, camera);
                break;
            case 'retro':
                this.renderRetroMode(ctx, startX, startY, endX, endY, camera);
                break;
        }
    }

    renderColorMode(ctx, startX, startY, endX, endY, camera) {
        const tileSize = TILE;
        
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const lightLevel = this.lightMap[x + y * WORLD_W] || this.AMBIENT_LIGHT;
                
                // Create darkness overlay (inverse of light)
                const darkness = 1 - lightLevel;
                
                if (darkness > 0.02) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
                    ctx.fillRect(
                        Math.floor(x * tileSize - camera.x),
                        Math.floor(y * tileSize - camera.y),
                        tileSize + 1,
                        tileSize + 1
                    );
                }
            }
        }
    }

    renderWhiteMode(ctx, startX, startY, endX, endY, camera) {
        const tileSize = TILE;
        
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const lightLevel = this.lightMap[x + y * WORLD_W] || this.AMBIENT_LIGHT;
                const darkness = 1 - lightLevel;
                
                if (darkness > 0.02) {
                    // Monochrome darkness
                    ctx.fillStyle = `rgba(${Math.floor(darkness * 255)}, ${Math.floor(darkness * 255)}, ${Math.floor(darkness * 255)}, ${darkness * 0.9})`;
                    ctx.fillRect(
                        Math.floor(x * tileSize - camera.x),
                        Math.floor(y * tileSize - camera.y),
                        tileSize + 1,
                        tileSize + 1
                    );
                }
            }
        }
    }

    renderRetroMode(ctx, startX, startY, endX, endY, camera) {
        const tileSize = TILE;
        
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const lightLevel = this.lightMap[x + y * WORLD_W] || this.AMBIENT_LIGHT;
                
                // Binary lighting (fully lit or fully dark)
                if (lightLevel < 0.4) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                    ctx.fillRect(
                        Math.floor(x * tileSize - camera.x),
                        Math.floor(y * tileSize - camera.y),
                        tileSize + 1,
                        tileSize + 1
                    );
                }
            }
        }
    }

    // Helper: Add torch light at world position
    addTorch(x, y, color = '#FFAA33') {
        this.addLightSource(x, y, 120, color, 0.9);
    }

    // Helper: Add campfire light
    addCampfire(x, y) {
        this.addLightSource(x, y, 180, '#FF6622', 1.0);
    }

    // Helper: Add chandelier light
    addChandelier(x, y) {
        this.addLightSource(x, y, 200, '#FFDD44', 1.1);
    }

    // Helper: Add glowshroom light
    addGlowshroom(x, y) {
        const colors = ['#33FFAA', '#AA33FF', '#33AAFF'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        this.addLightSource(x, y, 100, color, 0.7);
    }

    // Helper: Add projectile trail light
    addProjectileLight(x, y, color = '#FFFF00') {
        this.addLightSource(x, y, 40, color, 0.6);
        // Auto-remove after short duration
        setTimeout(() => {
            // Find and remove this light (could be optimized with IDs)
        }, 100);
    }

    // Helper: Get light level at position
    getLightAt(x, y) {
        const tx = Math.floor(x / TILE);
        const ty = Math.floor(y / TILE);
        
        if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) {
            return this.AMBIENT_LIGHT;
        }
        
        return this.lightMap[tx + ty * WORLD_W] || this.AMBIENT_LIGHT;
    }

    // Helper: Is position in darkness?
    isDark(x, y, threshold = 0.3) {
        return this.getLightAt(x, y) < threshold;
    }
}

// Global lighting instance
const Lighting = new LightingEngine();

// Initialize on game start
function initLighting() {
    Lighting.init(WORLD_W, WORLD_H);
    Lighting.setMode('color');
}

// Utility: Get day time factor (0 = midnight, 1 = noon)
function getDayTimeFactor() {
    // dayTime is 0-1 cycle: 0.0 = 6 AM, 0.25 = 12 PM, 0.5 = 6 PM, 0.75 = 12 AM
    const time = dayTime || 0;
    
    if (time < 0.25) {
        // Morning (6 AM to 12 PM): 0 to 1
        return time * 4;
    } else if (time < 0.5) {
        // Afternoon (12 PM to 6 PM): 1 to 0
        return 1 - (time - 0.25) * 4;
    } else if (time < 0.75) {
        // Evening (6 PM to 12 AM): 0 to 0
        return 0;
    } else {
        // Night (12 AM to 6 AM): 0 to 0
        return 0;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LightingEngine, Lighting, initLighting };
}
