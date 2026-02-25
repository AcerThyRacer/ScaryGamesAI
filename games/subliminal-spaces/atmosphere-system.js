/**
 * Atmosphere System for Subliminal Spaces
 * Manages volumetric fog, particles, light shafts, and environmental effects
 */

import { GPUParticleSystem } from '../../core/renderer/GPUParticleSystem.js';

export class AtmosphereSystem {
    constructor(options = {}) {
        this.options = {
            enableVolumetricFog: options.enableVolumetricFog !== undefined ? options.enableVolumetricFog : true,
            enableParticles: options.enableParticles !== undefined ? options.enableParticles : true,
            enableLightShafts: options.enableLightShafts !== undefined ? options.enableLightShafts : true,
            ...options
        };

        this.particleSystem = null;
        this.fogDensity = 0.02;
        this.fogColor = { r: 0.7, g: 0.7, b: 0.75 };
        this.lightShafts = [];
        this.currentPreset = null;

        // Environmental state
        this.state = {
            time: 0,
            windDirection: { x: 0, z: 1 },
            windSpeed: 0.5,
            turbulence: 0.3
        };

        // Preset configurations for different location types
        this.presets = {
            empty_mall: {
                fogDensity: 0.025,
                fogColor: { r: 0.75, g: 0.72, b: 0.68 },
                particleCount: 500,
                particleType: 'dust',
                lightShaftIntensity: 0.4,
                ambientOcclusion: 0.6
            },
            office_complex: {
                fogDensity: 0.015,
                fogColor: { r: 0.72, g: 0.75, b: 0.78 },
                particleCount: 300,
                particleType: 'dust',
                lightShaftIntensity: 0.3,
                ambientOcclusion: 0.5
            },
            hotel_corridor: {
                fogDensity: 0.03,
                fogColor: { r: 0.78, g: 0.7, b: 0.6 },
                particleCount: 600,
                particleType: 'dust_heavy',
                lightShaftIntensity: 0.5,
                ambientOcclusion: 0.7
            },
            indoor_pool: {
                fogDensity: 0.05,
                fogColor: { r: 0.65, g: 0.75, b: 0.8 },
                particleCount: 800,
                particleType: 'steam',
                lightShaftIntensity: 0.6,
                ambientOcclusion: 0.8
            },
            parking_garage: {
                fogDensity: 0.035,
                fogColor: { r: 0.6, g: 0.6, b: 0.65 },
                particleCount: 700,
                particleType: 'exhaust',
                lightShaftIntensity: 0.3,
                ambientOcclusion: 0.7
            },
            school_hallway: {
                fogDensity: 0.02,
                fogColor: { r: 0.73, g: 0.73, b: 0.76 },
                particleCount: 400,
                particleType: 'chalk_dust',
                lightShaftIntensity: 0.4,
                ambientOcclusion: 0.5
            },
            hospital_wing: {
                fogDensity: 0.028,
                fogColor: { r: 0.85, g: 0.87, b: 0.9 },
                particleCount: 350,
                particleType: 'sterile',
                lightShaftIntensity: 0.5,
                ambientOcclusion: 0.6
            },
            backrooms_level: {
                fogDensity: 0.04,
                fogColor: { r: 0.85, g: 0.75, b: 0.5 },
                particleCount: 900,
                particleType: 'mold_spores',
                lightShaftIntensity: 0.7,
                ambientOcclusion: 0.8
            }
        };
    }

    async initialize() {
        console.log('🌫️ Initializing Atmosphere System...');

        try {
            // Create canvas for particle system
            const canvas = document.createElement('canvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            // Initialize GPU particle system
            this.particleSystem = new GPUParticleSystem(canvas, {
                maxParticles: 10000,
                enableCollisions: false,
                enableWind: true
            });

            await this.particleSystem.initialize();

            console.log('✅ Atmosphere System initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Atmosphere System:', error);
            throw error;
        }
    }

    setPreset(locationType) {
        const preset = this.presets[locationType];

        if (!preset) {
            console.warn(`No preset found for ${locationType}, using default`);
            return;
        }

        this.currentPreset = preset;
        this.fogDensity = preset.fogDensity;
        this.fogColor = preset.fogColor;

        // Emit particles based on preset
        if (this.options.enableParticles && this.particleSystem) {
            this.emitParticlesForPreset(preset);
        }

        // Setup light shafts
        if (this.options.enableLightShafts) {
            this.setupLightShafts(preset.lightShaftIntensity);
        }

        console.log(`🎨 Atmosphere preset: ${locationType}`);
    }

    emitParticlesForPreset(preset) {
        if (!this.particleSystem) return;

        // Clear existing particles
        this.particleSystem.clear();

        // Emit new particles
        const config = this.getParticleConfig(preset.particleType);

        for (let i = 0; i < preset.particleCount; i++) {
            const position = {
                x: (Math.random() - 0.5) * 100,
                y: Math.random() * 10,
                z: (Math.random() - 0.5) * 100
            };

            const velocity = {
                x: (Math.random() - 0.5) * 0.5,
                y: Math.random() * 0.2 + 0.1,
                z: (Math.random() - 0.5) * 0.5
            };

            this.particleSystem.emit(1, {
                position,
                velocity,
                color: config.color,
                size: config.size,
                lifetime: config.lifetime,
                drag: config.drag
            });
        }
    }

    getParticleConfig(type) {
        const configs = {
            dust: {
                color: { r: 0.8, g: 0.75, b: 0.6, a: 0.6 },
                size: 0.05,
                lifetime: 10,
                drag: 0.95
            },
            dust_heavy: {
                color: { r: 0.7, g: 0.65, b: 0.5, a: 0.8 },
                size: 0.08,
                lifetime: 15,
                drag: 0.9
            },
            steam: {
                color: { r: 0.9, g: 0.95, b: 1.0, a: 0.4 },
                size: 0.1,
                lifetime: 8,
                drag: 0.85
            },
            exhaust: {
                color: { r: 0.4, g: 0.4, b: 0.45, a: 0.7 },
                size: 0.06,
                lifetime: 12,
                drag: 0.88
            },
            chalk_dust: {
                color: { r: 0.95, g: 0.95, b: 0.95, a: 0.5 },
                size: 0.03,
                lifetime: 20,
                drag: 0.92
            },
            sterile: {
                color: { r: 0.95, g: 0.97, b: 1.0, a: 0.3 },
                size: 0.02,
                lifetime: 15,
                drag: 0.96
            },
            mold_spores: {
                color: { r: 0.7, g: 0.6, b: 0.4, a: 0.6 },
                size: 0.04,
                lifetime: 25,
                drag: 0.9
            }
        };

        return configs[type] || configs.dust;
    }

    setupLightShafts(intensity = 0.5) {
        this.lightShafts = [];

        // Create god rays from light sources
        const numShafts = Math.floor(intensity * 10);

        for (let i = 0; i < numShafts; i++) {
            this.lightShafts.push({
                position: {
                    x: (Math.random() - 0.5) * 80,
                    y: 8,
                    z: (Math.random() - 0.5) * 80
                },
                direction: { x: 0, y: -1, z: 0 },
                angle: 0.3,
                length: 15,
                intensity: intensity * (0.5 + Math.random() * 0.5),
                color: { r: 0.95, g: 0.9, b: 0.7 }
            });
        }
    }

    update(deltaTime, playerPosition, cameraRotation) {
        this.state.time += deltaTime;

        // Update particle system
        if (this.particleSystem) {
            this.particleSystem.update(deltaTime);

            // Add wind effect
            if (this.state.windSpeed > 0) {
                this.applyWind(deltaTime);
            }
        }

        // Update fog density based on player position and time
        this.updateFogDynamics(deltaTime, playerPosition);

        // Animate light shafts
        if (this.options.enableLightShafts) {
            this.animateLightShafts(deltaTime);
        }
    }

    applyWind(deltaTime) {
        if (!this.particleSystem) return;

        // Apply wind force to particles
        const windForce = {
            x: this.state.windDirection.x * this.state.windSpeed,
            y: 0,
            z: this.state.windDirection.z * this.state.windSpeed
        };

        // This would be applied in the particle system update
        // Simplified here
    }

    updateFogDynamics(deltaTime, playerPosition) {
        // Subtle fog density variations
        const timeVariation = Math.sin(this.state.time * 0.1) * 0.005;
        
        if (this.currentPreset) {
            const baseDensity = this.currentPreset.fogDensity;
            this.fogDensity = baseDensity + timeVariation;

            // Increase fog in corners/edges
            const distFromCenter = Math.hypot(playerPosition.x, playerPosition.z);
            if (distFromCenter > 40) {
                this.fogDensity += 0.01;
            }
        }
    }

    animateLightShafts(deltaTime) {
        // Slowly rotate light shafts
        this.lightShafts.forEach((shaft, index) => {
            shaft.position.x += Math.sin(this.state.time + index) * 0.01;
            shaft.position.z += Math.cos(this.state.time + index * 0.5) * 0.01;
        });
    }

    flickerLights() {
        // Trigger light flickering effect
        this.lightShafts.forEach(shaft => {
            const originalIntensity = shaft.intensity;
            shaft.intensity = 0;

            setTimeout(() => {
                shaft.intensity = originalIntensity;
            }, 100 + Math.random() * 200);
        });

        // Also affect fog density briefly
        const originalFog = this.fogDensity;
        this.fogDensity *= 1.5;

        setTimeout(() => {
            this.fogDensity = originalFog;
        }, 300);
    }

    changeLighting(preset) {
        // Transition to new lighting preset
        if (typeof preset === 'string') {
            this.setPreset(preset);
        } else if (typeof preset === 'object') {
            // Smooth transition to new values
            const duration = 2000;
            const startFog = { ...this.fogColor };
            const endFog = preset.fogColor || startFog;

            const startTime = Date.now();

            const transition = () => {
                const elapsed = Date.now() - startTime;
                const t = Math.min(elapsed / duration, 1);

                this.fogColor.r = startFog.r + (endFog.r - startFog.r) * t;
                this.fogColor.g = startFog.g + (endFog.g - startFog.g) * t;
                this.fogColor.b = startFog.b + (endFog.b - startFog.b) * t;

                if (t < 1) {
                    requestAnimationFrame(transition);
                }
            };

            transition();
        }
    }

    getEffects() {
        return {
            fog: {
                density: this.fogDensity,
                color: this.fogColor
            },
            particles: this.particleSystem ? {
                active: true,
                count: this.particleSystem.activeParticles
            } : {
                active: false
            },
            lightShafts: this.lightShafts,
            ambientOcclusion: this.currentPreset ? this.currentPreset.ambientOcclusion : 0.5
        };
    }

    // Getters
    getFogDensity() {
        return this.fogDensity;
    }

    getFogColor() {
        return { ...this.fogColor };
    }

    getLightShafts() {
        return [...this.lightShafts];
    }

    // Setters
    setFogDensity(density) {
        this.fogDensity = Math.max(0, Math.min(1, density));
    }

    setFogColor(color) {
        this.fogColor = { ...color };
    }

    setWind(direction, speed) {
        this.state.windDirection = direction;
        this.state.windSpeed = speed;
    }

    // Cleanup
    destroy() {
        if (this.particleSystem) {
            this.particleSystem.destroy();
        }
    }
}

// Export for module usage
if (typeof window !== 'undefined') {
    window.AtmosphereSystem = AtmosphereSystem;
}
