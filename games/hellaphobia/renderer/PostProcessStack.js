/* ============================================================
   HELLAPHOBIA - POST-PROCESSING STACK
   Bloom | Chromatic Aberration | Film Grain | Vignette
   Color Grading | Scanlines | Distortion | Horror Presets
   ============================================================ */

(function() {
    'use strict';

    const PostProcessStack = {
        // Effect states
        effects: {
            bloom: { enabled: true, intensity: 0.5, threshold: 0.8 },
            chromaticAberration: { enabled: true, intensity: 0.002 },
            filmGrain: { enabled: true, intensity: 0.05, animated: true },
            vignette: { enabled: true, intensity: 0.4, smooth: true },
            colorGrading: { enabled: true, preset: 'horror' },
            scanlines: { enabled: false, intensity: 0.3, animated: true },
            distortion: { enabled: false, intensity: 0.0, animated: false },
            radialBlur: { enabled: false, intensity: 0.0, samples: 8 },
            pixelate: { enabled: false, size: 1 }
        },

        // Color grading presets
        colorPresets: {
            normal: {
                brightness: 1.0,
                contrast: 1.0,
                saturation: 1.0,
                warmth: 1.0,
                tint: [1.0, 1.0, 1.0],
                shadows: [1.0, 1.0, 1.0],
                midtones: [1.0, 1.0, 1.0],
                highlights: [1.0, 1.0, 1.0]
            },
            horror: {
                brightness: 0.85,
                contrast: 1.15,
                saturation: 0.7,
                warmth: 0.8,
                tint: [1.0, 0.95, 0.9],
                shadows: [0.8, 0.75, 0.85],
                midtones: [0.9, 0.85, 0.9],
                highlights: [0.95, 0.9, 0.85]
            },
            nightmare: {
                brightness: 0.7,
                contrast: 1.3,
                saturation: 0.5,
                warmth: 0.6,
                tint: [0.9, 0.85, 1.0],
                shadows: [0.7, 0.65, 0.8],
                midtones: [0.8, 0.75, 0.9],
                highlights: [0.85, 0.8, 0.95]
            },
            flashback: {
                brightness: 1.1,
                contrast: 0.9,
                saturation: 0.4,
                warmth: 1.3,
                tint: [1.0, 0.95, 0.8],
                shadows: [0.9, 0.85, 0.7],
                midtones: [1.0, 0.95, 0.8],
                highlights: [1.0, 0.98, 0.9]
            },
            sanity: {
                brightness: 1.0,
                contrast: 1.0,
                saturation: 1.0,
                warmth: 1.0,
                tint: [1.0, 1.0, 1.0],
                shadows: [1.0, 1.0, 1.0],
                midtones: [1.0, 1.0, 1.0],
                highlights: [1.0, 1.0, 1.0]
            },
            blood: {
                brightness: 0.9,
                contrast: 1.2,
                saturation: 1.3,
                warmth: 1.1,
                tint: [1.0, 0.9, 0.9],
                shadows: [0.9, 0.7, 0.7],
                midtones: [1.0, 0.8, 0.8],
                highlights: [1.0, 0.9, 0.9]
            },
            cold: {
                brightness: 0.95,
                contrast: 1.1,
                saturation: 0.8,
                warmth: 0.7,
                tint: [0.9, 0.95, 1.0],
                shadows: [0.75, 0.8, 0.9],
                midtones: [0.85, 0.9, 1.0],
                highlights: [0.9, 0.95, 1.0]
            },
            void: {
                brightness: 0.5,
                contrast: 1.5,
                saturation: 0.3,
                warmth: 0.5,
                tint: [0.8, 0.8, 0.9],
                shadows: [0.5, 0.5, 0.6],
                midtones: [0.7, 0.7, 0.8],
                highlights: [0.85, 0.85, 0.9]
            },
            glitch: {
                brightness: 1.1,
                contrast: 1.2,
                saturation: 1.2,
                warmth: 1.0,
                tint: [1.0, 1.0, 1.0],
                shadows: [1.0, 0.9, 1.0],
                midtones: [0.9, 1.0, 1.0],
                highlights: [1.0, 1.0, 0.9]
            }
        },

        // Current active preset
        currentPreset: 'horror',

        // Temporal effects
        temporalEffects: [],

        // Intensity multipliers (for dynamic adjustment)
        intensityMultipliers: {
            bloom: 1.0,
            chromatic: 1.0,
            grain: 1.0,
            vignette: 1.0,
            distortion: 1.0
        },

        // Initialize post-processing
        init() {
            this.applyPreset('horror');
            console.log('[PostProcessStack] Initialized');
        },

        // Apply a color grading preset
        applyPreset(presetName) {
            const preset = this.colorPresets[presetName];
            if (!preset) {
                console.warn(`[PostProcessStack] Preset "${presetName}" not found`);
                return;
            }

            this.currentPreset = presetName;
            this.effects.colorGrading.preset = presetName;
        },

        // Get current color grading values
        getColorGrading() {
            const preset = this.colorPresets[this.currentPreset] || this.colorPresets.normal;

            // Apply intensity multipliers
            return {
                brightness: preset.brightness,
                contrast: preset.contrast,
                saturation: preset.saturation,
                warmth: preset.warmth,
                tint: preset.tint,
                shadows: preset.shadows,
                midtones: preset.midtones,
                highlights: preset.highlights
            };
        },

        // Enable/disable effect
        setEffectEnabled(effectName, enabled) {
            if (this.effects[effectName]) {
                this.effects[effectName].enabled = enabled;
            }
        },

        // Set effect intensity
        setEffectIntensity(effectName, intensity) {
            if (this.effects[effectName]) {
                this.effects[effectName].intensity = Math.max(0, Math.min(1, intensity));
            }
        },

        // Set intensity multiplier for dynamic effects
        setIntensityMultiplier(effectName, multiplier) {
            if (this.intensityMultipliers[effectName] !== undefined) {
                this.intensityMultipliers[effectName] = multiplier;
            }
        },

        // Add temporary effect (auto-expires)
        addTemporalEffect(effectName, intensity, duration) {
            this.temporalEffects.push({
                effect: effectName,
                intensity: intensity,
                remainingTime: duration,
                originalIntensity: this.effects[effectName]?.intensity || 0
            });

            // Override intensity
            if (this.effects[effectName]) {
                this.effects[effectName].intensity = intensity;
            }
        },

        // Update temporal effects
        updateTemporalEffects(dt) {
            for (let i = this.temporalEffects.length - 1; i >= 0; i--) {
                const effect = this.temporalEffects[i];
                effect.remainingTime -= dt;

                // Lerp back to original intensity
                if (effect.remainingTime <= 0) {
                    if (this.effects[effect.effect]) {
                        this.effects[effect.effect].intensity = effect.originalIntensity;
                    }
                    this.temporalEffects.splice(i, 1);
                } else if (effect.remainingTime < 0.5) {
                    // Fade out in last 500ms
                    const t = effect.remainingTime / 0.5;
                    if (this.effects[effect.effect]) {
                        this.effects[effect.effect].intensity = effect.originalIntensity + (effect.intensity - effect.originalIntensity) * t;
                    }
                }
            }
        },

        // Trigger glitch effect
        triggerGlitch(intensity = 1.0, duration = 0.5) {
            this.addTemporalEffect('distortion', 0.1 * intensity, duration);
            this.addTemporalEffect('chromaticAberration', 0.01 * intensity, duration);
        },

        // Trigger sanity-based effects
        updateSanityEffects(sanity) {
            const sanityPercent = sanity / 100;

            // Low sanity increases effects
            if (sanityPercent < 0.6) {
                // Uneasy - subtle effects
                this.setIntensityMultiplier('vignette', 1.0 + (0.6 - sanityPercent) * 0.5);
                this.setIntensityMultiplier('grain', 1.0 + (0.6 - sanityPercent) * 0.3);
            }

            if (sanityPercent < 0.4) {
                // Disturbed - noticeable effects
                this.setIntensityMultiplier('chromatic', 1.0 + (0.4 - sanityPercent) * 2);
                this.addTemporalEffect('distortion', 0.03, 0.1);
            }

            if (sanityPercent < 0.2) {
                // Terrified - strong effects
                this.setIntensityMultiplier('bloom', 1.0 + (0.2 - sanityPercent) * 2);
                this.triggerGlitch(0.5, 0.2);
            }

            if (sanityPercent < 0.1) {
                // Broken - extreme effects
                this.setIntensityMultiplier('vignette', 2.0);
                this.setIntensityMultiplier('distortion', 3.0);
                this.triggerGlitch(1.0, 0.3);
            }
        },

        // Update combat-based effects
        updateCombatEffects(lowHealth, hitRecently, bossNearby) {
            if (lowHealth) {
                // Red tint when hurt
                this.addTemporalEffect('colorGrading', 0, 0.3);
                this.applyPreset('blood');
                setTimeout(() => this.applyPreset('horror'), 300);
            }

            if (hitRecently) {
                // Brief distortion on hit
                this.triggerGlitch(0.5, 0.2);
            }

            if (bossNearby) {
                // Increase vignette and grain
                this.setIntensityMultiplier('vignette', 1.5);
                this.setIntensityMultiplier('grain', 1.3);
            }
        },

        // Get post-process settings for WebGL renderer
        getWebGLSettings() {
            const colorGrading = this.getColorGrading();

            return {
                bloom: this.effects.bloom.enabled ? this.effects.bloom.intensity * this.intensityMultipliers.bloom : 0,
                bloomThreshold: this.effects.bloom.threshold,
                bloomIntensity: this.effects.bloom.intensity * this.intensityMultipliers.bloom,

                vignette: this.effects.vignette.enabled ? this.effects.vignette.intensity * this.intensityMultipliers.vignette : 0,
                grain: this.effects.filmGrain.enabled ? this.effects.filmGrain.intensity * this.intensityMultipliers.grain : 0,
                chromatic: this.effects.chromaticAberration.enabled ? this.effects.chromaticAberration.intensity * this.intensityMultipliers.chromatic : 0,

                distortion: this.effects.distortion.enabled ? this.effects.distortion.intensity * this.intensityMultipliers.distortion : 0,
                scanlines: this.effects.scanlines.enabled ? this.effects.scanlines.intensity : 0,

                colorGrade: [
                    colorGrading.tint[0] * colorGrading.brightness,
                    colorGrading.tint[1] * colorGrading.brightness,
                    colorGrading.tint[2] * colorGrading.brightness
                ],

                time: performance.now() / 1000
            };
        },

        // Apply post-processing to Canvas 2D context (fallback)
        applyToCanvas(ctx, width, height) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            const colorGrading = this.getColorGrading();
            const time = performance.now() / 1000;

            // Effect intensities
            const chromaticOffset = this.effects.chromaticAberration.enabled ?
                this.effects.chromaticAberration.intensity * this.intensityMultipliers.chromatic : 0;
            const grainIntensity = this.effects.filmGrain.enabled ?
                this.effects.filmGrain.intensity * this.intensityMultipliers.grain : 0;
            const vignetteIntensity = this.effects.vignette.enabled ?
                this.effects.vignette.intensity * this.intensityMultipliers.vignette : 0;

            // Precompute color grading lookup
            const gradeR = colorGrading.tint[0] * colorGrading.brightness;
            const gradeG = colorGrading.tint[1] * colorGrading.brightness;
            const gradeB = colorGrading.tint[2] * colorGrading.brightness;

            // Apply pixel shader
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;

                    // Chromatic aberration (simplified)
                    let r = data[i];
                    let g = data[i + 1];
                    let b = data[i + 2];

                    if (chromaticOffset > 0.001) {
                        const offsetX = Math.floor((x - width / 2) * chromaticOffset * 10);
                        const neighborI = (y * width + Math.max(0, Math.min(width - 1, x + offsetX))) * 4;
                        r = data[neighborI];
                    }

                    // Film grain
                    if (grainIntensity > 0.001) {
                        const noise = (Math.random() - 0.5) * grainIntensity * 255;
                        r += noise;
                        g += noise;
                        b += noise;
                    }

                    // Vignette
                    if (vignetteIntensity > 0.001) {
                        const nx = (x - width / 2) / (width / 2);
                        const ny = (y - height / 2) / (height / 2);
                        const dist = Math.sqrt(nx * nx + ny * ny);
                        const vignette = 1.0 - dist * vignetteIntensity;
                        r *= vignette;
                        g *= vignette;
                        b *= vignette;
                    }

                    // Color grading
                    r = Math.min(255, Math.max(0, r * gradeR));
                    g = Math.min(255, Math.max(0, g * gradeG));
                    b = Math.min(255, Math.max(0, b * gradeB));

                    data[i] = r;
                    data[i + 1] = g;
                    data[i + 2] = b;
                }
            }

            ctx.putImageData(imageData, 0, 0);
        },

        // Create scanline overlay (Canvas 2D)
        renderScanlines(ctx, width, height) {
            if (!this.effects.scanlines.enabled) return;

            const intensity = this.effects.scanlines.intensity;
            const time = this.effects.scanlines.animated ? performance.now() / 1000 : 0;

            ctx.save();
            ctx.globalAlpha = intensity;
            ctx.fillStyle = '#000000';

            const lineSpacing = 3;
            const yOffset = this.effects.scanlines.animated ? (time * 50) % lineSpacing : 0;

            for (let y = yOffset; y < height; y += lineSpacing) {
                ctx.fillRect(0, y, width, 1);
            }

            ctx.restore();
        },

        // Create film grain overlay (Canvas 2D, more efficient than per-pixel)
        renderFilmGrain(ctx, width, height) {
            if (!this.effects.filmGrain.enabled || this.effects.filmGrain.intensity < 0.01) return;

            const intensity = this.effects.filmGrain.intensity * this.intensityMultipliers.grain * 255;

            ctx.save();

            // Draw random pixels
            for (let i = 0; i < width * height * 0.1; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const gray = Math.random() * intensity;

                ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
                ctx.fillRect(x, y, 1, 1);
            }

            ctx.restore();
        },

        // Create vignette overlay (Canvas 2D)
        renderVignette(ctx, width, height) {
            if (!this.effects.vignette.enabled) return;

            const intensity = this.effects.vignette.intensity * this.intensityMultipliers.vignette;

            ctx.save();

            // Radial gradient from transparent center to dark edges
            const gradient = ctx.createRadialGradient(
                width / 2, height / 2, 0,
                width / 2, height / 2, Math.max(width, height) / 1.5
            );

            const alpha = intensity * 0.8;
            gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
            gradient.addColorStop(0.5, `rgba(0, 0, 0, ${alpha * 0.3})`);
            gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            ctx.restore();
        },

        // Apply color grading lookup (Canvas 2D)
        applyColorGrading(ctx, width, height) {
            const colorGrading = this.getColorGrading();

            ctx.save();

            // Apply tint overlay
            const [tr, tg, tb] = colorGrading.tint;
            if (tr !== 1.0 || tg !== 1.0 || tb !== 1.0) {
                ctx.fillStyle = `rgba(${(tr - 1) * 255}, ${(tg - 1) * 255}, ${(tb - 1) * 255}, 0.3)`;
                ctx.fillRect(0, 0, width, height);
            }

            ctx.restore();
        },

        // Reset all effects to defaults
        reset() {
            this.applyPreset('horror');
            this.intensityMultipliers = {
                bloom: 1.0,
                chromatic: 1.0,
                grain: 1.0,
                vignette: 1.0,
                distortion: 1.0
            };
            this.temporalEffects = [];
        },

        // Save current settings
        saveSettings() {
            return {
                effects: JSON.parse(JSON.stringify(this.effects)),
                currentPreset: this.currentPreset,
                intensityMultipliers: { ...this.intensityMultipliers }
            };
        },

        // Load settings
        loadSettings(settings) {
            if (settings.effects) {
                this.effects = settings.effects;
            }
            if (settings.currentPreset) {
                this.currentPreset = settings.currentPreset;
            }
            if (settings.intensityMultipliers) {
                this.intensityMultipliers = settings.intensityMultipliers;
            }
        },

        // Get debug info
        getDebugInfo() {
            return {
                preset: this.currentPreset,
                activeEffects: Object.entries(this.effects)
                    .filter(([_, e]) => e.enabled)
                    .map(([name, e]) => `${name}: ${e.intensity.toFixed(2)}`),
                temporalEffects: this.temporalEffects.length,
                multipliers: this.intensityMultipliers
            };
        }
    };

    // Export
    window.PostProcessStack = PostProcessStack;

    console.log('[PostProcessStack] Module loaded');
})();
