/* ============================================================
   HELLAPHOBIA - DYNAMIC LIGHTING SYSTEM
   Per-Pixel Lighting | Shadows | Multiple Light Types
   Flashlight System | Light Flicker | Color Tinting
   ============================================================ */

(function() {
    'use strict';

    const LightingSystem = {
        // Light sources
        lights: [],
        maxLights: 32,

        // Player flashlight
        flashlight: {
            enabled: true,
            x: 0,
            y: 0,
            angle: 0,
            coneAngle: 45,
            range: 250,
            intensity: 1.0,
            color: [1.0, 0.95, 0.8],
            flicker: { speed: 0, amplitude: 0 }
        },

        // Global lighting
        ambientLight: 0.15,
        globalColor: [1.0, 1.0, 1.0],

        // Shadow casting
        shadowsEnabled: true,
        shadowOpacity: 0.7,

        // Light culling
        cullingEnabled: true,
        cullingRadius: 600,

        // Initialize lighting system
        init() {
            this.lights = [];
            console.log('[LightingSystem] Initialized');
        },

        // Add a light source
        addLight(config) {
            if (this.lights.length >= this.maxLights) {
                // Remove oldest light
                this.lights.shift();
            }

            const light = {
                id: config.id || `light_${Date.now()}`,
                type: config.type || 'point', // point, spot, directional
                x: config.x || 0,
                y: config.y || 0,
                z: config.z || 0, // For pseudo-3D effect
                range: config.range || 150,
                color: config.color || [1.0, 1.0, 1.0],
                intensity: config.intensity || 1.0,
                angle: config.angle || 0,
                coneAngle: config.coneAngle || 45,
                castShadows: config.castShadows !== false,

                // Flicker effect
                flicker: config.flicker || {
                    enabled: false,
                    speed: 2.0,
                    amplitude: 0.3,
                    phase: Math.random() * Math.PI * 2
                },

                // Animation
                animated: config.animated || false,
                animationType: config.animationType || 'none', // pulse, flicker, strobe
                animationSpeed: config.animationSpeed || 1.0,
                animationPhase: Math.random() * Math.PI * 2,

                // Priority (for culling)
                priority: config.priority || 1,

                // Tags (for selective enabling)
                tags: config.tags || []
            };

            this.lights.push(light);
            return light;
        },

        // Remove a light by ID
        removeLight(id) {
            const index = this.lights.findIndex(l => l.id === id);
            if (index >= 0) {
                this.lights.splice(index, 1);
            }
        },

        // Remove lights by tag
        removeLightsByTag(tag) {
            this.lights = this.lights.filter(l => !l.tags.includes(tag));
        },

        // Update all lights
        update(dt, time) {
            // Update flashlight position
            this.updateFlashlight();

            // Update each light
            for (let i = this.lights.length - 1; i >= 0; i--) {
                const light = this.lights[i];

                // Handle flicker
                if (light.flicker.enabled) {
                    light.flicker.phase += light.flicker.speed * dt;
                    light.currentIntensity = light.intensity * (
                        1 + Math.sin(light.flicker.phase) * light.flicker.amplitude
                    );
                } else {
                    light.currentIntensity = light.intensity;
                }

                // Handle animations
                if (light.animated) {
                    light.animationPhase += light.animationSpeed * dt;

                    switch (light.animationType) {
                        case 'pulse':
                            light.currentIntensity = light.intensity * (0.7 + 0.3 * Math.sin(light.animationPhase));
                            break;
                        case 'flicker':
                            light.currentIntensity = light.intensity * (
                                0.5 + 0.5 * Math.abs(Math.sin(light.animationPhase * 3)) * Math.sin(light.animationPhase * 7)
                            );
                            break;
                        case 'strobe':
                            light.currentIntensity = Math.sin(light.animationPhase) > 0.7 ? light.intensity : 0;
                            break;
                    }
                }

                // Remove expired lights
                if (light.lifetime !== undefined) {
                    light.lifetime -= dt;
                    if (light.lifetime <= 0) {
                        this.lights.splice(i, 1);
                    }
                }
            }
        },

        // Update flashlight based on player
        updateFlashlight() {
            if (!player || !this.flashlight.enabled) return;

            // Flashlight follows player position
            this.flashlight.x = player.x + player.w / 2;
            this.flashlight.y = player.y + player.h / 2;

            // Flashlight angle follows player facing
            this.flashlight.angle = player.facing > 0 ? 0 : Math.PI;

            // Slight flicker when player is low on sanity
            if (player.sanity < 40) {
                const sanityFlicker = (40 - player.sanity) / 40;
                this.flashlight.intensity = 1.0 - sanityFlicker * 0.3 * (0.5 + 0.5 * Math.sin(Date.now() * 0.01));
            } else {
                this.flashlight.intensity = 1.0;
            }
        },

        // Set flashlight enabled
        setFlashlightEnabled(enabled) {
            this.flashlight.enabled = enabled;
        },

        // Set flashlight properties
        setFlashlight(props) {
            Object.assign(this.flashlight, props);
        },

        // Get all lights affecting a position
        getLightsAtPosition(x, y, radius = null) {
            const checkRadius = radius || this.cullingRadius;
            const affectedLights = [];

            // Check regular lights
            for (const light of this.lights) {
                const dx = light.x - x;
                const dy = light.y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < checkRadius && dist < light.range) {
                    affectedLights.push(light);
                }
            }

            // Check flashlight
            if (this.flashlight.enabled) {
                const fdx = this.flashlight.x - x;
                const fdy = this.flashlight.y - y;
                const fDist = Math.sqrt(fdx * fdx + fdy * fdy);

                if (fDist < this.flashlight.range) {
                    // Check if in cone
                    const angleToLight = Math.atan2(fdy, fdx);
                    const angleDiff = Math.abs(angleToLight - this.flashlight.angle);

                    if (angleDiff < this.flashlight.coneAngle * Math.PI / 180) {
                        affectedLights.push({
                            ...this.flashlight,
                            type: 'spot',
                            currentIntensity: this.flashlight.intensity
                        });
                    }
                }
            }

            return affectedLights;
        },

        // Calculate light intensity at position
        getLightIntensityAt(x, y, normalX = 0, normalY = -1) {
            let totalIntensity = this.ambientLight;
            let totalColor = [
                this.globalColor[0] * this.ambientLight,
                this.globalColor[1] * this.ambientLight,
                this.globalColor[2] * this.ambientLight
            ];

            const lights = this.getLightsAtPosition(x, y);

            for (const light of lights) {
                const dx = light.x - x;
                const dy = light.y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > light.range) continue;

                // Distance attenuation (quadratic)
                let attenuation = 1.0 - (dist / light.range);
                attenuation = attenuation * attenuation;

                // Spot light cone attenuation
                if (light.type === 'spot') {
                    const angleToLight = Math.atan2(dy, dx);
                    const lightAngle = light.angle || 0;
                    let angleDiff = Math.abs(angleToLight - lightAngle);

                    // Normalize angle difference
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    angleDiff = Math.abs(angleDiff);

                    const coneRad = (light.coneAngle || 45) * Math.PI / 180;
                    const coneFactor = 1.0 - (angleDiff / coneRad);

                    if (coneFactor > 0) {
                        attenuation *= coneFactor * coneFactor;
                    } else {
                        continue; // Outside cone
                    }
                }

                // Add light contribution
                const intensity = (light.currentIntensity || light.intensity) * attenuation;
                totalIntensity += intensity;

                totalColor[0] += light.color[0] * intensity;
                totalColor[1] += light.color[1] * intensity;
                totalColor[2] += light.color[2] * intensity;
            }

            // Clamp values
            totalColor = totalColor.map(c => Math.min(1.0, c));

            return {
                intensity: Math.min(1.0, totalIntensity),
                color: totalColor
            };
        },

        // Create torch light (flickering warm light)
        createTorch(x, y, range = 120) {
            return this.addLight({
                x, y,
                range,
                color: [1.0, 0.7, 0.3],
                intensity: 0.8,
                flicker: {
                    enabled: true,
                    speed: 3.0 + Math.random() * 2.0,
                    amplitude: 0.3
                },
                castShadows: true,
                tags: ['torch', 'static']
            });
        },

        // Create lantern light (gentle warm light)
        createLantern(x, y, range = 100) {
            return this.addLight({
                x, y,
                range,
                color: [1.0, 0.8, 0.4],
                intensity: 0.6,
                castShadows: true,
                tags: ['lantern', 'static']
            });
        },

        // Create magical light (colored, pulsing)
        createMagicLight(x, y, color, range = 80) {
            return this.addLight({
                x, y,
                range,
                color,
                intensity: 0.7,
                animated: true,
                animationType: 'pulse',
                animationSpeed: 2.0,
                castShadows: true,
                tags: ['magic', 'dynamic']
            });
        },

        // Create flickering light (unstable)
        createFlickerLight(x, y, range = 100) {
            return this.addLight({
                x, y,
                range,
                color: [1.0, 0.9, 0.8],
                intensity: 0.8,
                flicker: {
                    enabled: true,
                    speed: 8.0,
                    amplitude: 0.5
                },
                animated: true,
                animationType: 'flicker',
                animationSpeed: 5.0,
                castShadows: true,
                tags: ['flicker', 'dynamic']
            });
        },

        // Create ambient zone (subtle background lighting)
        createAmbientZone(x, y, range, color, intensity = 0.2) {
            return this.addLight({
                x, y,
                range,
                color,
                intensity,
                castShadows: false,
                tags: ['ambient', 'zone']
            });
        },

        // Temporary light (auto-expires)
        createTempLight(x, y, range, color, lifetime) {
            return this.addLight({
                x, y,
                range,
                color,
                intensity: 1.0,
                lifetime,
                castShadows: false,
                tags: ['temp', 'dynamic']
            });
        },

        // Set ambient light level
        setAmbientLight(level) {
            this.ambientLight = Math.max(0, Math.min(1, level));
        },

        // Set global light color
        setGlobalColor(r, g, b) {
            this.globalColor = [r, g, b];
        },

        // Clear all lights
        clearLights() {
            this.lights = [];
        },

        // Remove dynamic lights only (keep static)
        clearDynamicLights() {
            this.lights = this.lights.filter(l => !l.tags.includes('dynamic'));
        },

        // Get light count
        getLightCount() {
            return this.lights.length;
        },

        // Debug render (for Canvas 2D fallback)
        renderDebug(ctx, camera) {
            if (!this.debugEnabled) return;

            // Draw light positions
            for (const light of this.lights) {
                const lx = light.x - camera.x;
                const ly = light.y - camera.y;

                // Draw range circle
                ctx.beginPath();
                ctx.arc(lx, ly, light.range, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${light.color[0] * 255}, ${light.color[1] * 255}, ${light.color[2] * 255}, 0.2)`;
                ctx.stroke();

                // Draw light center
                ctx.beginPath();
                ctx.arc(lx, ly, 5, 0, Math.PI * 2);
                ctx.fillStyle = `rgb(${light.color[0] * 255}, ${light.color[1] * 255}, ${light.color[2] * 255})`;
                ctx.fill();
            }

            // Draw flashlight
            if (this.flashlight.enabled && player) {
                const fx = this.flashlight.x - camera.x;
                const fy = this.flashlight.y - camera.y;

                // Draw cone
                ctx.beginPath();
                ctx.moveTo(fx, fy);
                ctx.arc(
                    fx, fy,
                    this.flashlight.range,
                    this.flashlight.angle - this.flashlight.coneAngle * Math.PI / 180,
                    this.flashlight.angle + this.flashlight.coneAngle * Math.PI / 180
                );
                ctx.closePath();
                ctx.fillStyle = `rgba(255, 200, 150, 0.1)`;
                ctx.fill();
                ctx.strokeStyle = `rgba(255, 200, 150, 0.3)`;
                ctx.stroke();
            }
        },

        // Enable/disable debug mode
        setDebug(enabled) {
            this.debugEnabled = enabled;
        },

        // Export light data for saving
        exportLights() {
            return this.lights
                .filter(l => l.tags.includes('static'))
                .map(l => ({
                    id: l.id,
                    type: l.type,
                    x: l.x,
                    y: l.y,
                    range: l.range,
                    color: l.color,
                    intensity: l.intensity,
                    flicker: l.flicker,
                    tags: l.tags
                }));
        },

        // Import light data from save
        importLights(data) {
            data.forEach(lightData => {
                this.addLight(lightData);
            });
        }
    };

    // Export
    window.LightingSystem = LightingSystem;

    console.log('[LightingSystem] Module loaded');
})();
