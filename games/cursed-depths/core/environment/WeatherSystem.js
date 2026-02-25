/* ============================================================
   CURSED DEPTHS — Weather & Seasonal System
   Phase 3: Dynamic weather with gameplay effects
   ============================================================ */

class WeatherSystem {
    constructor() {
        this.currentWeather = 'clear';
        this.weatherTimer = 0;
        this.season = 'spring';
        this.seasonDay = 0;
        this.totalDays = 0;
        this.precipitationParticles = [];
        this.windSpeed = 0;
        this.windDirection = 1;
        this.thunderTimer = 0;
        this.lightningActive = false;
        this.lightningTimer = 0;
        
        // Weather transition
        this.transitionProgress = 0;
        this.previousWeather = 'clear';
        
        // Weather configuration
        this.weatherConfig = {
            clear: {
                precipitationChance: 0,
                windMin: 0.5,
                windMax: 2,
                colorTint: null,
                visibility: 1.0
            },
            rain: {
                precipitationChance: 1.0,
                windMin: 2,
                windMax: 5,
                colorTint: 'rgba(100, 120, 140, 0.2)',
                visibility: 0.8,
                growthBonus: 1.5
            },
            thunderstorm: {
                precipitationChance: 1.0,
                windMin: 5,
                windMax: 10,
                colorTint: 'rgba(80, 90, 120, 0.3)',
                visibility: 0.6,
                thunderChance: 0.02,
                growthBonus: 1.5,
                fireRisk: -0.5
            },
            blizzard: {
                precipitationChance: 1.0,
                windMin: 8,
                windMax: 15,
                colorTint: 'rgba(200, 220, 255, 0.3)',
                visibility: 0.4,
                speedPenalty: 0.7
            },
            sandstorm: {
                precipitationChance: 0,
                windMin: 10,
                windMax: 20,
                colorTint: 'rgba(200, 180, 100, 0.4)',
                visibility: 0.3,
                damageOverTime: 2
            },
            meteor_shower: {
                precipitationChance: 0,
                windMin: 0,
                windMax: 1,
                colorTint: 'rgba(100, 50, 50, 0.2)',
                visibility: 0.9,
                meteorChance: 0.05
            }
        };
        
        // Season configuration
        this.seasonConfig = {
            spring: {
                duration: 30, // days
                weatherWeights: { clear: 0.4, rain: 0.4, thunderstorm: 0.15, blizzard: 0, sandstorm: 0.05 },
                cropGrowthBonus: 1.3,
                dayLength: 1.0
            },
            summer: {
                duration: 30,
                weatherWeights: { clear: 0.6, rain: 0.15, thunderstorm: 0.1, blizzard: 0, sandstorm: 0.15 },
                cropGrowthBonus: 1.0,
                dayLength: 1.2
            },
            autumn: {
                duration: 30,
                weatherWeights: { clear: 0.45, rain: 0.35, thunderstorm: 0.1, blizzard: 0, sandstorm: 0.1 },
                cropGrowthBonus: 0.8,
                dayLength: 0.9
            },
            winter: {
                duration: 30,
                weatherWeights: { clear: 0.3, rain: 0.1, thunderstorm: 0, blizzard: 0.5, sandstorm: 0.1 },
                cropGrowthBonus: 0.5,
                dayLength: 0.7
            }
        };
    }

    init() {
        this.season = 'spring';
        this.seasonDay = 0;
        this.totalDays = 0;
        this.currentWeather = 'clear';
        this.weatherTimer = 1200 + Math.random() * 1200;
        this.updateWind();
    }

    update() {
        // Update season day counter
        this.seasonDay++;
        if (this.seasonDay >= this.seasonConfig[this.season].duration) {
            this.changeSeason();
        }

        // Update weather timer
        this.weatherTimer--;
        if (this.weatherTimer <= 0) {
            this.changeWeather();
        }

        // Update precipitation
        this.updatePrecipitation();

        // Update wind
        if (Math.random() < 0.01) {
            this.updateWind();
        }

        // Handle thunder
        const config = this.weatherConfig[this.currentWeather];
        if (config.thunderChance && Math.random() < config.thunderChance) {
            this.triggerThunder();
        }

        // Update lightning visual
        if (this.lightningActive) {
            this.lightningTimer--;
            if (this.lightningTimer <= 0) {
                this.lightningActive = false;
            }
        }

        // Transition effect
        if (this.transitionProgress > 0) {
            this.transitionProgress -= 0.01;
            if (this.transitionProgress < 0) {
                this.transitionProgress = 0;
                this.previousWeather = this.currentWeather;
            }
        }
    }

    changeSeason() {
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        const currentIndex = seasons.indexOf(this.season);
        this.season = seasons[(currentIndex + 1) % 4];
        this.seasonDay = 0;
        this.totalDays++;

        // Show season change notification
        showSeasonChangeNotification(this.season);
    }

    changeWeather() {
        const biome = this.getBiomeAtPlayer();
        const season = this.season;
        const weights = this.seasonConfig[season].weatherWeights;

        // Filter possible weather based on biome
        let possibleWeather = [];
        let totalWeight = 0;

        for (const [weather, weight] of Object.entries(weights)) {
            // Biome-specific restrictions
            if (biome === 'desert' && weather === 'blizzard') continue;
            if ((biome === 'snow' || biome === 'ice') && weather === 'sandstorm') continue;
            if (biome === 'underground' && weather !== 'clear') continue;

            if (weight > 0) {
                possibleWeather.push({ weather, weight });
                totalWeight += weight;
            }
        }

        if (possibleWeather.length === 0) {
            possibleWeather = [{ weather: 'clear', weight: 1 }];
            totalWeight = 1;
        }

        // Roll for weather
        let roll = Math.random() * totalWeight;
        let selected = 'clear';

        for (const { weather, weight } of possibleWeather) {
            roll -= weight;
            if (roll <= 0) {
                selected = weather;
                break;
            }
        }

        // Start transition
        this.previousWeather = this.currentWeather;
        this.currentWeather = selected;
        this.transitionProgress = 1.0;

        // Set new timer based on weather type
        const durations = {
            clear: 2400,
            rain: 1800,
            thunderstorm: 900,
            blizzard: 1200,
            sandstorm: 600,
            meteor_shower: 300
        };

        this.weatherTimer = (durations[selected] || 1200) + Math.random() * 1200;

        // Update wind for new weather
        this.updateWind();
    }

    updatePrecipitation() {
        const config = this.weatherConfig[this.currentWeather];
        const biome = this.getBiomeAtPlayer();

        // Clear old particles
        if (this.precipitationParticles.length > 500) {
            this.precipitationParticles.splice(0, 100);
        }

        // Spawn new precipitation
        if (config.precipitationChance > 0 && Math.random() < config.precipitationChance * 0.3) {
            const isSnow = this.season === 'winter' || biome === 'snow' || biome === 'ice';
            
            for (let i = 0; i < 5; i++) {
                const x = player.x + (Math.random() - 0.5) * W;
                const y = player.y - H / 2 - Math.random() * 100;
                
                this.precipitationParticles.push({
                    x, y,
                    vx: this.windSpeed * this.windDirection * (0.5 + Math.random() * 0.5),
                    vy: isSnow ? 1 + Math.random() : 8 + Math.random() * 4,
                    size: isSnow ? 2 + Math.random() * 3 : 2,
                    life: 60,
                    type: isSnow ? 'snowflake' : 'raindrop'
                });
            }
        }

        // Update precipitation particles
        for (let i = this.precipitationParticles.length - 1; i >= 0; i--) {
            const p = this.precipitationParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            // Check collision with ground/blocks
            const tileX = Math.floor(p.x / TILE);
            const tileY = Math.floor(p.y / TILE);
            
            if (tileY >= 0 && tileY < WORLD_H && tileX >= 0 && tileX < WORLD_W) {
                const tile = world[tileX + tileY * WORLD_W];
                if (tile && tile !== T.AIR && tile !== T.WATER) {
                    // Hit ground - spawn splash/impact
                    if (p.type === 'raindrop' && Math.random() < 0.3) {
                        Particles.spawnEnvironmentalParticle(p.x, p.y, 'splash');
                    }
                    this.precipitationParticles.splice(i, 1);
                    continue;
                }
            }

            if (p.life <= 0 || p.y > player.y + H / 2) {
                this.precipitationParticles.splice(i, 1);
            }
        }
    }

    updateWind() {
        const config = this.weatherConfig[this.currentWeather];
        this.windSpeed = config.windMin + Math.random() * (config.windMax - config.windMin);
        this.windDirection = Math.random() < 0.5 ? -1 : 1;
    }

    triggerThunder() {
        this.thunderTimer = 60;
        this.lightningActive = true;
        this.lightningTimer = 10;

        // Play thunder sound (when audio system is implemented)
        // AudioManager.playSound('thunder');

        // Lightning can strike and cause fires
        if (Math.random() < 0.3) {
            this.triggerLightningStrike();
        }
    }

    triggerLightningStrike() {
        // Pick random location near player
        const strikeX = player.x + (Math.random() - 0.5) * 400;
        const strikeY = player.y + (Math.random() - 0.5) * 300;

        // Visual flash handled in render
        // Could ignite flammable blocks nearby
        this.igniteNearby(strikeX, strikeY);
    }

    igniteNearby(x, y) {
        const radius = 50;
        const centerX = Math.floor(x / TILE);
        const centerY = Math.floor(y / TILE);

        for (let dy = -radius / TILE; dy <= radius / TILE; dy++) {
            for (let dx = -radius / TILE; dx <= radius / TILE; dx++) {
                const tx = centerX + dx;
                const ty = centerY + dy;
                
                if (tx >= 0 && tx < WORLD_W && ty >= 0 && ty < WORLD_H) {
                    const tile = world[tx + ty * WORLD_W];
                    // Check for flammable tiles
                    if ([T.WOOD, T.LEAVES, T.PLANKS].includes(tile)) {
                        if (Math.random() < 0.1) {
                            world[tx + ty * WORLD_W] = T.TORCH; // Replace with torch/fire
                            Particles.spawnEnvironmentalParticle(tx * TILE, ty * TILE, 'smoke');
                        }
                    }
                }
            }
        }
    }

    getBiomeAtPlayer() {
        const depth = Math.floor(player.y / TILE);
        const surfaceY = SURFACE_Y;

        if (depth > ABYSS_Y) return 'abyss';
        if (depth > HIVE_Y) return 'underworld';
        if (depth > FLESH_Y) return 'underground_jungle';
        if (depth > FROZEN_Y) return 'ice_caves';
        if (depth > MUSH_Y) return 'mushroom_caves';
        if (depth > CAVE_Y) return 'underground';
        
        // Surface biomes - check horizontal position and tile types
        const playerTileX = Math.floor(player.x / TILE);
        const surfaceTile = world[playerTileX + surfaceY * WORLD_W];

        if (surfaceTile === T.SAND) return 'desert';
        if (surfaceTile === T.SNOW || surfaceTile === T.ICE) return 'snow';
        if (surfaceTile === T.JUNGLE_GRASS) return 'jungle';
        if ([T.CORRUPT_GRASS, T.EBONSTONE].includes(surfaceTile)) return 'corruption';
        if ([T.CRIMSON_GRASS, T.CRIMSTONE].includes(surfaceTile)) return 'crimson';
        if ([T.HALLOWED_GRASS, T.PEARLSTONE].includes(surfaceTile)) return 'hallow';

        return 'forest';
    }

    applyWeatherEffects() {
        const config = this.weatherConfig[this.currentWeather];
        
        // Apply visibility modifier to rendering
        ctx.globalAlpha = config.visibility || 1.0;

        // Apply movement speed penalty
        if (config.speedPenalty) {
            player.vx *= config.speedPenalty;
        }

        // Apply damage over time
        if (config.damageOverTime && Math.random() < 0.02) {
            player.hp -= config.damageOverTime;
            // Show damage indicator
            Particles.spawn({
                x: player.x,
                y: player.y - 20,
                text: `-${config.damageOverTime}`,
                color: '#FF0000',
                type: 'text',
                life: 30
            });
        }

        // Reset global alpha
        ctx.globalAlpha = 1.0;
    }

    getCropGrowthMultiplier() {
        const seasonConfig = this.seasonConfig[this.season];
        const weatherConfig = this.weatherConfig[this.currentWeather];
        
        let multiplier = seasonConfig.cropGrowthBonus;
        if (weatherConfig && weatherConfig.growthBonus) {
            multiplier *= weatherConfig.growthBonus;
        }
        
        return multiplier;
    }

    render(ctx, camera) {
        // Render weather overlay tint
        const config = this.weatherConfig[this.currentWeather];
        if (config.colorTint && this.transitionProgress > 0) {
            ctx.fillStyle = config.colorTint;
            ctx.fillRect(0, 0, W, H);
        }

        // Render lightning flash
        if (this.lightningActive) {
            const flashIntensity = this.lightningTimer / 10;
            ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity * 0.3})`;
            ctx.fillRect(0, 0, W, H);
        }

        // Render precipitation
        for (const p of this.precipitationParticles) {
            const screenX = p.x - camera.x;
            const screenY = p.y - camera.y;

            if (screenX < -10 || screenX > W + 10 || screenY < -10 || screenY > H + 10) {
                continue;
            }

            if (p.type === 'raindrop') {
                ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(screenX + p.vx * 2, screenY + 10);
                ctx.stroke();
            } else if (p.type === 'snowflake') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Render wind effects (leaves, debris)
        if (this.windSpeed > 5) {
            this.renderWindDebris(ctx, camera);
        }
    }

    renderWindDebris(ctx, camera) {
        const debrisCount = Math.floor(this.windSpeed * 2);
        
        for (let i = 0; i < debrisCount; i++) {
            const x = (gameFrame * this.windSpeed * this.windDirection + i * 100) % W;
            const y = (i * 37) % H;
            
            ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
            ctx.fillRect(x, y, 3, 1);
        }
    }

    getCurrentWeatherName() {
        const names = {
            clear: 'Clear Skies',
            rain: 'Rain',
            thunderstorm: 'Thunderstorm',
            blizzard: 'Blizzard',
            sandstorm: 'Sandstorm',
            meteor_shower: 'Meteor Shower'
        };
        return names[this.currentWeather] || 'Unknown';
    }

    getCurrentSeasonName() {
        const names = {
            spring: 'Spring',
            summer: 'Summer',
            autumn: 'Autumn',
            winter: 'Winter'
        };
        return names[this.season] || 'Unknown';
    }

    getDayInSeason() {
        return this.seasonDay + 1;
    }
}

// Global weather instance
const Weather = new WeatherSystem();

// Initialize on game start
function initWeather() {
    Weather.init();
}

// Notification helper
function showSeasonChangeNotification(season) {
    const messages = {
        spring: '🌸 Spring has arrived! Plants grow faster.',
        summer: '☀️ Summer begins! Days are longer.',
        autumn: '🍂 Autumn comes! Harvest time.',
        winter: '❄️ Winter arrives! Bundle up.'
    };
    
    // Show notification (integrate with existing UI system)
    if (typeof eventBannerText !== 'undefined') {
        eventBannerText = messages[season];
        eventBannerTimer = 300; // 5 seconds at 60 FPS
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WeatherSystem, Weather, initWeather };
}
