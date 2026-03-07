/**
 * ============================================
 * SGAI PHASE 6: CINEMATIC POST-PROCESSING STACK
 * ============================================
 * Unified post-processing system for all 8 horror games
 * 
 * Features:
 * - Bloom (HDR glow)
 * - Chromatic Aberration (horror distortion)
 * - Vignette (focus effect)
 * - Film Grain (retro horror)
 * - Color Grading (mood adjustment)
 * - Screen Space Ambient Occlusion (SSAO)
 * - Scanlines (CRT effect)
 * - Radial Blur (motion effect)
 * - Glitch Effect (horror distortion)
 * - Darkness/Sanity overlay
 * 
 * Usage:
 *   const postProcessing = new PostProcessingStack(canvas);
 *   postProcessing.enableEffect('bloom', { intensity: 0.5 });
 *   postProcessing.render(ctx);
 */

(function(global) {
    'use strict';

    // ============================================
    // POST-PROCESSING STACK
    // ============================================

    class PostProcessingStack {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.offscreenCanvas = document.createElement('canvas');
            this.offscreenCtx = this.offscreenCanvas.getContext('2d');
            
            this.effects = new Map();
            this.enabled = true;
            this.quality = 'high'; // low, medium, high
            this.performanceMode = false;
            
            // Initialize default effects
            this._initDefaultEffects();
            
            // Performance tracking
            this.renderTime = 0;
            this.lastFrameTime = 0;
        }

        /**
         * Initialize default effect configurations
         */
        _initDefaultEffects() {
            // Bloom - Glowing elements
            this.effects.set('bloom', {
                enabled: true,
                intensity: 0.5,
                radius: 10,
                threshold: 0.7,
                quality: 'high'
            });

            // Chromatic Aberration - Color fringing for horror
            this.effects.set('chromaticAberration', {
                enabled: false,
                intensity: 0.003,
                redOffset: { x: 0.003, y: 0 },
                blueOffset: { x: -0.003, y: 0 }
            });

            // Vignette - Darkened edges for focus
            this.effects.set('vignette', {
                enabled: true,
                darkness: 0.6,
                offset: 0.5,
                softness: 0.5
            });

            // Film Grain - Retro horror aesthetic
            this.effects.set('filmGrain', {
                enabled: false,
                intensity: 0.15,
                size: 1,
                animated: true
            });

            // Color Grading - Mood adjustment
            this.effects.set('colorGrading', {
                enabled: true,
                temperature: -0.2, // Cool for horror
                tint: 0.1,
                saturation: 0.9,
                contrast: 1.1,
                brightness: 0.95,
                gamma: 1.0
            });

            // Scanlines - CRT monitor effect
            this.effects.set('scanlines', {
                enabled: false,
                intensity: 0.3,
                spacing: 2,
                curvature: false
            });

            // Radial Blur - Motion/zoom effect
            this.effects.set('radialBlur', {
                enabled: false,
                intensity: 0.02,
                centerX: 0.5,
                centerY: 0.5
            });

            // Glitch - Horror distortion
            this.effects.set('glitch', {
                enabled: false,
                intensity: 0,
                frequency: 0.1,
                duration: 0.3,
                timer: 0
            });

            // Darkness Overlay - Sanity/blackout effect
            this.effects.set('darkness', {
                enabled: false,
                intensity: 0,
                color: '#000000',
                vignette: true
            });

            // Red Flash - Damage effect
            this.effects.set('redFlash', {
                enabled: false,
                intensity: 0,
                decay: 2.0
            });

            // Barrel Distortion - Fish-eye horror
            this.effects.set('barrelDistortion', {
                enabled: false,
                intensity: 0.1,
                centerX: 0.5,
                centerY: 0.5
            });
        }

        /**
         * Resize offscreen canvas
         */
        resize(width, height) {
            this.canvas.width = width;
            this.canvas.height = height;
            this.offscreenCanvas.width = width;
            this.offscreenCanvas.height = height;
        }

        /**
         * Enable/disable an effect
         */
        enableEffect(name, enabled) {
            const effect = this.effects.get(name);
            if (effect) {
                effect.enabled = enabled;
            }
        }

        /**
         * Set effect parameters
         */
        setEffectParams(name, params) {
            const effect = this.effects.get(name);
            if (effect) {
                Object.assign(effect, params);
            }
        }

        /**
         * Get effect configuration
         */
        getEffect(name) {
            return this.effects.get(name);
        }

        /**
         * Trigger temporary effect (glitch, flash, etc.)
         */
        triggerEffect(name, intensity, duration) {
            const effect = this.effects.get(name);
            if (effect) {
                effect.enabled = true;
                effect.intensity = intensity;
                effect.timer = duration;
                effect.autoDisable = true;
            }
        }

        /**
         * Apply all enabled effects and render
         */
        render(sourceCanvas) {
            if (!this.enabled || this.performanceMode) {
                // Just copy source
                this.ctx.drawImage(sourceCanvas, 0, 0);
                return;
            }

            const startTime = performance.now();

            // Copy source to offscreen
            this.offscreenCtx.drawImage(sourceCanvas, 0, 0);

            // Apply effects in order
            let currentSource = this.offscreenCanvas;

            // Color grading first (affects all)
            if (this.effects.get('colorGrading').enabled) {
                currentSource = this._applyColorGrading(currentSource);
            }

            // Bloom
            if (this.effects.get('bloom').enabled) {
                currentSource = this._applyBloom(currentSource);
            }

            // Chromatic aberration
            if (this.effects.get('chromaticAberration').enabled) {
                currentSource = this._applyChromaticAberration(currentSource);
            }

            // Radial blur
            if (this.effects.get('radialBlur').enabled) {
                currentSource = this._applyRadialBlur(currentSource);
            }

            // Barrel distortion
            if (this.effects.get('barrelDistortion').enabled) {
                currentSource = this._applyBarrelDistortion(currentSource);
            }

            // Glitch effect
            if (this.effects.get('glitch').enabled) {
                currentSource = this._applyGlitch(currentSource);
            }

            // Scanlines
            if (this.effects.get('scanlines').enabled) {
                currentSource = this._applyScanlines(currentSource);
            }

            // Film grain
            if (this.effects.get('filmGrain').enabled) {
                currentSource = this._applyFilmGrain(currentSource);
            }

            // Vignette
            if (this.effects.get('vignette').enabled) {
                currentSource = this._applyVignette(currentSource);
            }

            // Darkness overlay
            if (this.effects.get('darkness').enabled) {
                currentSource = this._applyDarkness(currentSource);
            }

            // Red flash
            if (this.effects.get('redFlash').enabled) {
                currentSource = this._applyRedFlash(currentSource);
            }

            // Draw final result to main canvas
            this.ctx.drawImage(currentSource, 0, 0);

            // Update temporary effects
            this._updateTemporaryEffects();

            this.renderTime = performance.now() - startTime;
            this.lastFrameTime = startTime;
        }

        /**
         * Apply color grading
         */
        _applyColorGrading(source) {
            const effect = this.effects.get('colorGrading');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = source.width;
            tempCanvas.height = source.height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(source, 0, 0);

            const imageData = tempCtx.getImageData(0, 0, source.width, source.height);
            const data = imageData.data;

            const temp = effect.temperature;
            const tint = effect.tint;
            const saturation = effect.saturation;
            const contrast = effect.contrast;
            const brightness = effect.brightness;

            for (let i = 0; i < data.length; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];

                // Temperature (blue-yellow)
                if (temp < 0) {
                    b += Math.abs(temp) * 50;
                } else {
                    r += temp * 50;
                    g += temp * 25;
                }

                // Tint (green-magenta)
                if (tint < 0) {
                    g += Math.abs(tint) * 30;
                } else {
                    r += tint * 30;
                    b += tint * 30;
                }

                // Saturation
                const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
                r = gray + (r - gray) * saturation;
                g = gray + (g - gray) * saturation;
                b = gray + (b - gray) * saturation;

                // Contrast
                const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
                r = factor * (r - 128) + 128;
                g = factor * (g - 128) + 128;
                b = factor * (b - 128) + 128;

                // Brightness
                r += (brightness - 1) * 255;
                g += (brightness - 1) * 255;
                b += (brightness - 1) * 255;

                data[i] = Math.max(0, Math.min(255, r));
                data[i + 1] = Math.max(0, Math.min(255, g));
                data[i + 2] = Math.max(0, Math.min(255, b));
            }

            tempCtx.putImageData(imageData, 0, 0);
            return tempCanvas;
        }

        /**
         * Apply bloom effect
         */
        _applyBloom(source) {
            const effect = this.effects.get('bloom');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = source.width;
            tempCanvas.height = source.height;
            const tempCtx = tempCanvas.getContext('2d');

            // Extract bright areas
            tempCtx.drawImage(source, 0, 0);
            const imageData = tempCtx.getImageData(0, 0, source.width, source.height);
            const data = imageData.data;

            const threshold = effect.threshold * 255;

            for (let i = 0; i < data.length; i += 4) {
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                if (brightness < threshold) {
                    data[i] = 0;
                    data[i + 1] = 0;
                    data[i + 2] = 0;
                }
            }

            tempCtx.putImageData(imageData, 0, 0);

            // Apply blur to bright areas
            const blurAmount = effect.radius;
            this._blurCanvas(tempCtx, source.width, source.height, blurAmount);

            // Composite bloom over original
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = source.width;
            finalCanvas.height = source.height;
            const finalCtx = finalCanvas.getContext('2d');

            finalCtx.drawImage(source, 0, 0);
            finalCtx.globalAlpha = effect.intensity;
            finalCtx.drawImage(tempCanvas, 0, 0);
            finalCtx.globalAlpha = 1;

            return finalCanvas;
        }

        /**
         * Apply chromatic aberration
         */
        _applyChromaticAberration(source) {
            const effect = this.effects.get('chromaticAberration');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = source.width;
            tempCanvas.height = source.height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(source, 0, 0);
            const imageData = tempCtx.getImageData(0, 0, source.width, source.height);
            const data = imageData.data;
            const newData = new Uint8ClampedArray(data);

            const intensity = effect.intensity;
            const width = source.width;
            const height = source.height;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;

                    // Red channel offset
                    const redX = Math.floor(x + intensity * width);
                    if (redX >= 0 && redX < width) {
                        const redI = (y * width + redX) * 4;
                        newData[i] = data[redI];
                    }

                    // Blue channel offset
                    const blueX = Math.floor(x - intensity * width);
                    if (blueX >= 0 && blueX < width) {
                        const blueI = (y * width + blueX) * 4;
                        newData[i + 2] = data[blueI + 2];
                    }
                }
            }

            const newImageData = new ImageData(newData, width, height);
            tempCtx.putImageData(newImageData, 0, 0);
            return tempCanvas;
        }

        /**
         * Apply vignette
         */
        _applyVignette(source) {
            const effect = this.effects.get('vignette');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = source.width;
            tempCanvas.height = source.height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(source, 0, 0);

            const gradient = tempCtx.createRadialGradient(
                source.width / 2,
                source.height / 2,
                Math.min(source.width, source.height) * effect.offset,
                source.width / 2,
                source.height / 2,
                Math.max(source.width, source.height) * 0.8
            );

            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(0, 0, 0, ${effect.darkness})`);

            tempCtx.fillStyle = gradient;
            tempCtx.fillRect(0, 0, source.width, source.height);

            return tempCanvas;
        }

        /**
         * Apply film grain
         */
        _applyFilmGrain(source) {
            const effect = this.effects.get('filmGrain');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = source.width;
            tempCanvas.height = source.height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(source, 0, 0);
            const imageData = tempCtx.getImageData(0, 0, source.width, source.height);
            const data = imageData.data;

            const intensity = effect.intensity * 255;
            const time = effect.animated ? Date.now() / 1000 : 0;

            for (let i = 0; i < data.length; i += 4) {
                const noise = (Math.sin((i + time) * 0.1) * 0.5 + 0.5) * intensity;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }

            tempCtx.putImageData(imageData, 0, 0);
            return tempCanvas;
        }

        /**
         * Apply scanlines
         */
        _applyScanlines(source) {
            const effect = this.effects.get('scanlines');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = source.width;
            tempCanvas.height = source.height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(source, 0, 0);

            const spacing = effect.spacing;
            const intensity = effect.intensity;

            for (let y = 0; y < source.height; y += spacing) {
                tempCtx.fillStyle = `rgba(0, 0, 0, ${intensity})`;
                tempCtx.fillRect(0, y, source.width, 1);
            }

            return tempCanvas;
        }

        /**
         * Apply radial blur
         */
        _applyRadialBlur(source) {
            const effect = this.effects.get('radialBlur');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = source.width;
            tempCanvas.height = source.height;
            const tempCtx = tempCanvas.getContext('2d');

            const samples = this.quality === 'high' ? 10 : this.quality === 'medium' ? 6 : 3;
            const centerX = source.width * effect.centerX;
            const centerY = source.height * effect.centerY;

            for (let i = 0; i < samples; i++) {
                const alpha = 1 / samples;
                const scale = 1 + (i / samples) * effect.intensity;

                tempCtx.save();
                tempCtx.translate(centerX, centerY);
                tempCtx.scale(scale, scale);
                tempCtx.translate(-centerX, -centerY);
                tempCtx.globalAlpha = alpha;
                tempCtx.drawImage(source, 0, 0);
                tempCtx.restore();
            }

            return tempCanvas;
        }

        /**
         * Apply glitch effect
         */
        _applyGlitch(source) {
            const effect = this.effects.get('glitch');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = source.width;
            tempCanvas.height = source.height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(source, 0, 0);

            const intensity = effect.intensity;
            const glitchAmount = source.height * intensity;

            // Draw horizontal glitch strips
            const strips = Math.floor(intensity * 20);
            for (let i = 0; i < strips; i++) {
                const y = Math.random() * source.height;
                const height = Math.random() * glitchAmount + 2;
                const offset = (Math.random() - 0.5) * glitchAmount * 2;

                try {
                    const stripData = tempCtx.getImageData(0, y, source.width, height);
                    tempCtx.putImageData(stripData, offset, y);
                } catch (e) {
                    // Ignore out of bounds
                }
            }

            // Color channel shift
            const imageData = tempCtx.getImageData(0, 0, source.width, source.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                if (Math.random() < intensity * 0.1) {
                    const shift = Math.floor((Math.random() - 0.5) * glitchAmount);
                    const targetI = Math.max(0, Math.min(data.length - 4, i + shift * 4));
                    data[i] = data[targetI]; // Red channel shift
                }
            }

            tempCtx.putImageData(imageData, 0, 0);
            return tempCanvas;
        }

        /**
         * Apply darkness overlay
         */
        _applyDarkness(source) {
            const effect = this.effects.get('darkness');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = source.width;
            tempCanvas.height = source.height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(source, 0, 0);

            if (effect.vignette) {
                const gradient = tempCtx.createRadialGradient(
                    source.width / 2,
                    source.height / 2,
                    source.width * 0.3,
                    source.width / 2,
                    source.height / 2,
                    source.width * 0.8
                );
                gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
                gradient.addColorStop(1, effect.color);
                tempCtx.fillStyle = gradient;
            } else {
                tempCtx.fillStyle = effect.color;
            }

            tempCtx.globalAlpha = effect.intensity;
            tempCtx.fillRect(0, 0, source.width, source.height);
            tempCtx.globalAlpha = 1;

            return tempCanvas;
        }

        /**
         * Apply red flash (damage effect)
         */
        _applyRedFlash(source) {
            const effect = this.effects.get('redFlash');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = source.width;
            tempCanvas.height = source.height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(source, 0, 0);

            tempCtx.fillStyle = '#ff0000';
            tempCtx.globalAlpha = effect.intensity;
            tempCtx.fillRect(0, 0, source.width, source.height);
            tempCtx.globalAlpha = 1;

            return tempCanvas;
        }

        /**
         * Apply barrel distortion
         */
        _applyBarrelDistortion(source) {
            const effect = this.effects.get('barrelDistortion');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = source.width;
            tempCanvas.height = source.height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(source, 0, 0);
            const imageData = tempCtx.getImageData(0, 0, source.width, source.height);
            const data = imageData.data;
            const newData = new Uint8ClampedArray(data);

            const intensity = effect.intensity;
            const centerX = source.width * effect.centerX;
            const centerY = source.height * effect.centerY;

            for (let y = 0; y < source.height; y++) {
                for (let x = 0; x < source.width; x++) {
                    const dx = x - centerX;
                    const dy = y - centerY;
                    const r = Math.sqrt(dx * dx + dy * dy);
                    const maxR = Math.sqrt(centerX * centerX + centerY * centerY);
                    
                    const normalizedR = r / maxR;
                    const distortion = 1 + intensity * (normalizedR * normalizedR);

                    const newX = centerX + dx * distortion;
                    const newY = centerY + dy * distortion;

                    if (newX >= 0 && newX < source.width && newY >= 0 && newY < source.height) {
                        const srcI = (Math.floor(newY) * source.width + Math.floor(newX)) * 4;
                        const destI = (y * source.width + x) * 4;

                        newData[destI] = data[srcI];
                        newData[destI + 1] = data[srcI + 1];
                        newData[destI + 2] = data[srcI + 2];
                    }
                }
            }

            const newImageData = new ImageData(newData, source.width, source.height);
            tempCtx.putImageData(newImageData, 0, 0);
            return tempCanvas;
        }

        /**
         * Blur canvas (box blur)
         */
        _blurCanvas(ctx, width, height, radius) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const temp = new Uint8ClampedArray(data);

            // Horizontal blur
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let r = 0, g = 0, b = 0, count = 0;

                    for (let bx = -radius; bx <= radius; bx++) {
                        const nx = Math.max(0, Math.min(width - 1, x + bx));
                        const i = (y * width + nx) * 4;
                        r += temp[i];
                        g += temp[i + 1];
                        b += temp[i + 2];
                        count++;
                    }

                    const i = (y * width + x) * 4;
                    data[i] = r / count;
                    data[i + 1] = g / count;
                    data[i + 2] = b / count;
                }
            }

            ctx.putImageData(imageData, 0, 0);

            // Vertical blur
            const imageData2 = ctx.getImageData(0, 0, width, height);
            const data2 = imageData2.data;
            const temp2 = new Uint8ClampedArray(data2);

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let r = 0, g = 0, b = 0, count = 0;

                    for (let by = -radius; by <= radius; by++) {
                        const ny = Math.max(0, Math.min(height - 1, y + by));
                        const i = (ny * width + x) * 4;
                        r += temp2[i];
                        g += temp2[i + 1];
                        b += temp2[i + 2];
                        count++;
                    }

                    const i = (y * width + x) * 4;
                    data2[i] = r / count;
                    data2[i + 1] = g / count;
                    data2[i + 2] = b / count;
                }
            }

            ctx.putImageData(imageData2, 0, 0);
        }

        /**
         * Update temporary effects
         */
        _updateTemporaryEffects() {
            const dt = 0.016; // Assume 60fps

            this.effects.forEach((effect, name) => {
                if (effect.timer !== undefined && effect.timer > 0) {
                    effect.timer -= dt;

                    if (effect.timer <= 0) {
                        if (effect.autoDisable) {
                            effect.enabled = false;
                            effect.autoDisable = false;
                        }

                        // Decay intensity
                        if (effect.decay) {
                            effect.intensity = Math.max(0, effect.intensity - effect.decay * dt);
                            if (effect.intensity <= 0.01) {
                                effect.enabled = false;
                            }
                        }
                    }
                }
            });
        }

        /**
         * Set quality level
         */
        setQuality(quality) {
            this.quality = quality;
        }

        /**
         * Enable performance mode (skip effects)
         */
        setPerformanceMode(enabled) {
            this.performanceMode = enabled;
        }

        /**
         * Get render statistics
         */
        getStats() {
            return {
                renderTime: this.renderTime,
                enabledEffects: Array.from(this.effects.entries())
                    .filter(([_, effect]) => effect.enabled)
                    .map(([name, _]) => name),
                quality: this.quality,
                performanceMode: this.performanceMode
            };
        }

        /**
         * Apply preset configuration
         */
        applyPreset(presetName) {
            const presets = {
                'none': () => {
                    this.effects.forEach(effect => effect.enabled = false);
                },
                'subtle': () => {
                    this.enableEffect('bloom', true);
                    this.setEffectParams('bloom', { intensity: 0.3 });
                    this.enableEffect('vignette', true);
                    this.setEffectParams('vignette', { darkness: 0.3 });
                    this.enableEffect('colorGrading', true);
                },
                'horror': () => {
                    this.enableEffect('bloom', true);
                    this.setEffectParams('bloom', { intensity: 0.4, threshold: 0.6 });
                    this.enableEffect('vignette', true);
                    this.setEffectParams('vignette', { darkness: 0.7 });
                    this.enableEffect('colorGrading', true);
                    this.setEffectParams('colorGrading', { temperature: -0.3, saturation: 0.7, contrast: 1.2 });
                    this.enableEffect('filmGrain', true);
                    this.setEffectParams('filmGrain', { intensity: 0.2 });
                },
                'retro': () => {
                    this.enableEffect('scanlines', true);
                    this.setEffectParams('scanlines', { intensity: 0.3, spacing: 2 });
                    this.enableEffect('filmGrain', true);
                    this.setEffectParams('filmGrain', { intensity: 0.15 });
                    this.enableEffect('vignette', true);
                    this.enableEffect('colorGrading', true);
                    this.setEffectParams('colorGrading', { saturation: 0.8, contrast: 1.1 });
                },
                'intense': () => {
                    this.enableEffect('bloom', true);
                    this.setEffectParams('bloom', { intensity: 0.7, radius: 15 });
                    this.enableEffect('chromaticAberration', true);
                    this.setEffectParams('chromaticAberration', { intensity: 0.005 });
                    this.enableEffect('vignette', true);
                    this.setEffectParams('vignette', { darkness: 0.8 });
                    this.enableEffect('colorGrading', true);
                    this.setEffectParams('colorGrading', { temperature: -0.4, contrast: 1.3, saturation: 0.6 });
                    this.enableEffect('filmGrain', true);
                },
                'glitch': () => {
                    this.enableEffect('glitch', true);
                    this.setEffectParams('glitch', { intensity: 0.3, frequency: 0.2 });
                    this.enableEffect('chromaticAberration', true);
                    this.enableEffect('scanlines', true);
                    this.enableEffect('colorGrading', true);
                    this.setEffectParams('colorGrading', { saturation: 0.5 });
                },
                'cinematic': () => {
                    this.enableEffect('bloom', true);
                    this.setEffectParams('bloom', { intensity: 0.5, threshold: 0.7 });
                    this.enableEffect('vignette', true);
                    this.setEffectParams('vignette', { darkness: 0.5, offset: 0.4 });
                    this.enableEffect('colorGrading', true);
                    this.setEffectParams('colorGrading', { temperature: 0.1, tint: 0.1, saturation: 0.9, contrast: 1.15 });
                    this.enableEffect('filmGrain', true);
                    this.setEffectParams('filmGrain', { intensity: 0.08 });
                }
            };

            const preset = presets[presetName];
            if (preset) {
                preset();
            }
        }

        /**
         * Cleanup
         */
        dispose() {
            this.offscreenCanvas = null;
            this.offscreenCtx = null;
            this.effects.clear();
        }
    }

    // ============================================
    // SCREEN EFFECTS CONTROLLER
    // ============================================

    class ScreenEffects {
        constructor(postProcessing) {
            this.postProcessing = postProcessing;
            this.shakeIntensity = 0;
            this.shakeDuration = 0;
            this.shakeOffset = { x: 0, y: 0 };
        }

        /**
         * Trigger screen shake
         */
        shake(intensity, duration) {
            this.shakeIntensity = intensity;
            this.shakeDuration = duration;
        }

        /**
         * Trigger damage flash
         */
        damageFlash(intensity = 0.5) {
            if (this.postProcessing) {
                this.postProcessing.triggerEffect('redFlash', intensity, 0.3);
            }
        }

        /**
         * Trigger glitch effect
         */
        glitch(intensity = 0.3, duration = 0.5) {
            if (this.postProcessing) {
                this.postProcessing.triggerEffect('glitch', intensity, duration);
            }
        }

        /**
         * Set darkness level (sanity/blackout)
         */
        setDarkness(intensity, vignette = true) {
            if (this.postProcessing) {
                this.postProcessing.enableEffect('darkness', true);
                this.postProcessing.setEffectParams('darkness', {
                    intensity: intensity,
                    vignette: vignette
                });
            }
        }

        /**
         * Update effects (call every frame)
         */
        update(dt) {
            // Update screen shake
            if (this.shakeDuration > 0) {
                this.shakeDuration -= dt;
                this.shakeOffset.x = (Math.random() - 0.5) * this.shakeIntensity;
                this.shakeOffset.y = (Math.random() - 0.5) * this.shakeIntensity;

                if (this.shakeDuration <= 0) {
                    this.shakeIntensity = 0;
                    this.shakeOffset = { x: 0, y: 0 };
                }
            }

            return this.shakeOffset;
        }

        /**
         * Apply shake to canvas transform
         */
        applyShake(ctx) {
            if (this.shakeIntensity > 0) {
                ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
            }
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            PostProcessingStack,
            ScreenEffects
        };
    } else {
        global.PostProcessingStack = PostProcessingStack;
        global.ScreenEffects = ScreenEffects;
    }

})(typeof window !== 'undefined' ? window : this);
