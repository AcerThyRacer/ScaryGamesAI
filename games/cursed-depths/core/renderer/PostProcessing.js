/* ============================================================
   CURSED DEPTHS — Screen Shaders & Post-Processing
   Phase 4: Cinematic effects and visual enhancements
   ============================================================ */

class PostProcessing {
    constructor() {
        this.effects = {
            chromaticAberration: 0,
            filmGrain: 0.05,
            vignette: 0.3,
            colorGrading: null,
            blur: 0,
            distortion: 0,
            bloom: 0.15,
            scanlines: 0
        };
        
        this.presets = {
            normal: {
                chromaticAberration: 0,
                filmGrain: 0.05,
                vignette: 0.3,
                colorGrading: null,
                blur: 0,
                distortion: 0,
                bloom: 0.15,
                scanlines: 0
            },
            bossIntro: {
                chromaticAberration: 2,
                filmGrain: 0.1,
                vignette: 0.8,
                colorGrading: [1.2, 0.8, 0.9],
                blur: 0,
                distortion: 0.1,
                bloom: 0.3,
                scanlines: 0
            },
            horrorMoment: {
                chromaticAberration: 1.5,
                filmGrain: 0.3,
                vignette: 0.6,
                colorGrading: [0.9, 0.8, 1.0],
                blur: 0,
                distortion: 0.15,
                bloom: 0.1,
                scanlines: 0
            },
            lowHealth: {
                chromaticAberration: 0.5,
                filmGrain: 0.15,
                vignette: 0.7,
                colorGrading: [0.8, 0.8, 1.0],
                blur: 0,
                distortion: 0,
                bloom: 0.1,
                scanlines: 0
            },
            corruptionNearby: {
                chromaticAberration: 1,
                filmGrain: 0.2,
                vignette: 0.5,
                colorGrading: [1.0, 0.7, 1.0],
                blur: 0,
                distortion: 0.1,
                bloom: 0.2,
                scanlines: 0
            },
            retro: {
                chromaticAberration: 0.5,
                filmGrain: 0.1,
                vignette: 0.4,
                colorGrading: [1.1, 1.0, 0.9],
                blur: 0,
                distortion: 0,
                bloom: 0,
                scanlines: 0.3
            },
            stunned: {
                chromaticAberration: 2,
                filmGrain: 0.1,
                vignette: 0.4,
                colorGrading: null,
                blur: 2,
                distortion: 0.2,
                bloom: 0.2,
                scanlines: 0
            }
        };
        
        this.timer = 0;
        this.targetPreset = null;
    }

    applyPreset(presetName, duration = 60) {
        const preset = this.presets[presetName];
        if (!preset) return;

        this.targetPreset = preset;
        this.timer = duration;
    }

    applyBossIntro(bossName) {
        this.applyPreset('bossIntro', 180); // 3 seconds
        
        // Boss-specific color grading
        const bossColors = {
            'eye_of_cthulhu': [1.2, 0.8, 0.9],
            'eater_of_worlds': [0.8, 1.0, 0.8],
            'brain_of_cthulhu': [1.0, 0.7, 1.0],
            'skeletron': [1.1, 1.0, 0.9],
            'wall_of_flesh': [1.3, 0.7, 0.5],
            'twins': [1.2, 0.9, 0.8],
            'destroyer': [1.0, 0.8, 0.8],
            'plantera': [1.0, 0.8, 1.0],
            'moon_lord': [0.8, 0.9, 1.2]
        };
        
        if (bossColors[bossName]) {
            this.presets.bossIntro.colorGrading = bossColors[bossName];
        }
    }

    applyHorrorMoment() {
        this.applyPreset('horrorMoment', 120);
    }

    applyLowHealth() {
        // Smoothly interpolate to low health preset
        const target = this.presets.lowHealth;
        const speed = 0.1;
        
        for (const key in target) {
            if (typeof this.effects[key] === 'number') {
                this.effects[key] += (target[key] - this.effects[key]) * speed;
            }
        }
    }

    applyCorruptionNearby(evilType) {
        const preset = { ...this.presets.corruptionNearby };
        
        if (evilType === 'corruption') {
            preset.colorGrading = [0.9, 0.8, 1.1];
        } else if (evilType === 'crimson') {
            preset.colorGrading = [1.1, 0.7, 0.8];
        } else if (evilType === 'hallow') {
            preset.colorGrading = [0.9, 1.0, 1.1];
        }
        
        this.applyEffect(preset, 60);
    }

    applyStunned() {
        this.applyPreset('stunned', 30);
    }

    applyRetroMode() {
        this.applyPreset('retro', 999999); // Permanent until changed
    }

    applyEffect(effectConfig, duration = 60) {
        for (const key in effectConfig) {
            if (key in this.effects) {
                this.effects[key] = effectConfig[key];
            }
        }
        this.timer = duration;
    }

    resetToNormal() {
        this.targetPreset = this.presets.normal;
        this.timer = 60;
    }

    update() {
        if (this.timer > 0 && this.targetPreset) {
            this.timer--;
            
            // Smoothly interpolate effects
            const progress = 1 - (this.timer / 60);
            const easeProgress = this.easeInOutCubic(progress);
            
            for (const key in this.effects) {
                if (typeof this.effects[key] === 'number' && typeof this.targetPreset[key] === 'number') {
                    const target = this.targetPreset[key];
                    const current = this.effects[key];
                    this.effects[key] = current + (target - current) * easeProgress * 0.2;
                }
            }
            
            if (this.timer <= 0) {
                this.targetPreset = null;
            }
        }
    }

    easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    render(ctx) {
        // Apply post-processing effects to entire canvas
        
        // 1. Chromatic aberration (split RGB channels)
        if (this.effects.chromaticAberration > 0.01) {
            this.applyChromaticAberration(ctx, this.effects.chromaticAberration);
        }

        // 2. Film grain
        if (this.effects.filmGrain > 0.01) {
            this.applyFilmGrain(ctx, this.effects.filmGrain);
        }

        // 3. Vignette
        if (this.effects.vignette > 0.01) {
            this.applyVignette(ctx, this.effects.vignette);
        }

        // 4. Color grading
        if (this.effects.colorGrading) {
            this.applyColorGrading(ctx, this.effects.colorGrading);
        }

        // 5. Scanlines (retro effect)
        if (this.effects.scanlines > 0.01) {
            this.applyScanlines(ctx, this.effects.scanlines);
        }

        // 6. Bloom (glow effect for bright areas)
        if (this.effects.bloom > 0.01) {
            this.applyBloom(ctx, this.effects.bloom);
        }
    }

    applyChromaticAberration(ctx, strength) {
        const imageData = ctx.getImageData(0, 0, W, H);
        const data = imageData.data;
        const offset = Math.floor(strength * 2);
        
        // Only process every other pixel for performance
        for (let y = 0; y < H; y += 2) {
            for (let x = 0; x < W; x += 2) {
                const i = (y * W + x) * 4;
                
                // Shift red channel left
                if (x > offset) {
                    const ri = ((y * W + (x - offset)) * 4);
                    data[i] = data[ri];
                }
                
                // Shift blue channel right
                if (x < W - offset) {
                    const bi = ((y * W + (x + offset)) * 4);
                    data[i + 2] = data[bi + 2];
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    applyFilmGrain(ctx, intensity) {
        const imageData = ctx.getImageData(0, 0, W, H);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 16) { // Process every 4th pixel
            const grain = (Math.random() - 0.5) * intensity * 50;
            data[i] = Math.min(255, Math.max(0, data[i] + grain));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    applyVignette(ctx, intensity) {
        const gradient = ctx.createRadialGradient(W / 2, H / 2, H / 3, W / 2, H / 2, H);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
    }

    applyColorGrading(ctx, grading) {
        const imageData = ctx.getImageData(0, 0, W, H);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] * grading[0]));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * grading[1]));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * grading[2]));
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    applyScanlines(ctx, intensity) {
        ctx.fillStyle = `rgba(0, 0, 0, ${intensity})`;
        
        for (let y = 0; y < H; y += 4) {
            ctx.fillRect(0, y, W, 2);
        }
    }

    applyBloom(ctx, intensity) {
        // Simplified bloom - just add glow to bright areas
        // Full bloom would require multi-pass rendering
        
        ctx.globalCompositeOperation = 'screen';
        ctx.filter = `blur(${4 * intensity}px)`;
        ctx.globalAlpha = intensity * 0.3;
        
        ctx.drawImage(ctx.canvas, 0, 0);
        
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    // Biome-specific color grading
    applyBiomeGrading(biome) {
        const biomeGrades = {
            forest: [1.0, 1.05, 0.95],
            desert: [1.1, 1.05, 0.9],
            snow: [0.95, 1.0, 1.1],
            jungle: [0.95, 1.1, 0.95],
            corruption: [0.9, 0.85, 1.1],
            crimson: [1.1, 0.85, 0.9],
            hallow: [0.9, 0.95, 1.15],
            underworld: [1.2, 0.85, 0.8],
            dungeon: [0.85, 0.9, 1.0]
        };
        
        const grading = biomeGrades[biome] || [1, 1, 1];
        this.effects.colorGrading = grading;
    }

    getEffects() {
        return { ...this.effects };
    }

    setEnabled(enabled) {
        // Could be used to toggle effects for performance
        this.enabled = enabled;
    }
}

// Global post-processing instance
const PostProcess = new PostProcessing();

// Initialize on game start
function initPostProcessing() {
    PostProcess.resetToNormal();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PostProcessing, PostProcess, initPostProcessing };
}
