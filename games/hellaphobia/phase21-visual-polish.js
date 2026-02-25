/* ============================================================
   HELLAPHOBIA - PHASE 21: VISUAL POLISH & ENHANCEMENTS
   Advanced Effects | Animations | Particle Systems | Post-Processing
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 21: ENHANCED PARTICLE SYSTEM =====
    const EnhancedParticleEngine = {
        pools: {
            spark: [],
            smoke: [],
            fire: [],
            blood: [],
            magic: [],
            soul: [],
            glitch: [],
            emoji: []
        },
        activeParticles: [],
        maxParticles: 2000,

        init() {
            this.createPools();
            console.log('Phase 21: Enhanced Particle Engine initialized');
        },

        // Create particle pools
        createPools() {
            const poolTypes = ['spark', 'smoke', 'fire', 'blood', 'magic', 'soul', 'glitch', 'emoji'];
            poolTypes.forEach(type => {
                for (let i = 0; i < 250; i++) {
                    this.pools[type].push(this.createParticle(type));
                }
            });
        },

        // Create particle
        createParticle(type) {
            const base = {
                x: 0, y: 0,
                vx: 0, vy: 0,
                life: 1, maxLife: 1,
                size: 4,
                color: '#ffffff',
                alpha: 1,
                rotation: 0,
                rotationSpeed: 0,
                gravity: 0,
                drag: 0.98,
                type: type,
                active: false
            };

            switch (type) {
                case 'spark':
                    return { ...base, color: '#ffff00', gravity: 0.5 };
                case 'smoke':
                    return { ...base, color: '#888888', size: 8, drag: 0.95 };
                case 'fire':
                    return { ...base, color: '#ff4400', gravity: -0.3 };
                case 'blood':
                    return { ...base, color: '#ff0000', gravity: 0.8 };
                case 'magic':
                    return { ...base, color: '#aa00ff', size: 6 };
                case 'soul':
                    return { ...base, color: '#00ffff', alpha: 0.7 };
                case 'glitch':
                    return { ...base, color: '#ff00ff', size: 2 };
                case 'emoji':
                    return { ...base, text: '💀', size: 16 };
            }
        },

        // Emit particles
        emit(type, x, y, count = 10, options = {}) {
            for (let i = 0; i < count; i++) {
                const particle = this.getPooledParticle(type);
                if (!particle) continue;

                particle.x = x;
                particle.y = y;
                particle.active = true;
                particle.life = 1;
                particle.maxLife = options.life || 1 + Math.random();

                // Velocity with spread
                const angle = (options.angle || 0) + (Math.random() - 0.5) * (options.spread || Math.PI * 2);
                const speed = options.speed || 100 + Math.random() * 100;
                particle.vx = Math.cos(angle) * speed;
                particle.vy = Math.sin(angle) * speed;

                // Apply options
                if (options.color) particle.color = options.color;
                if (options.size) particle.size = options.size;
                if (options.gravity !== undefined) particle.gravity = options.gravity;
                if (options.text) particle.text = options.text;

                this.activeParticles.push(particle);
            }
        },

        // Get pooled particle
        getPooledParticle(type) {
            const pool = this.pools[type];
            for (const p of pool) {
                if (!p.active) {
                    p.active = true;
                    return p;
                }
            }
            // Create new if pool exhausted
            if (this.activeParticles.length < this.maxParticles) {
                const newParticle = this.createParticle(type);
                newParticle.active = true;
                return newParticle;
            }
            return null;
        },

        // Update particles
        update(dt) {
            for (let i = this.activeParticles.length - 1; i >= 0; i--) {
                const p = this.activeParticles[i];

                if (!p.active) {
                    this.activeParticles.splice(i, 1);
                    continue;
                }

                // Update life
                p.life -= dt / p.maxLife;
                p.alpha = p.life;

                if (p.life <= 0) {
                    p.active = false;
                    this.activeParticles.splice(i, 1);
                    continue;
                }

                // Apply physics
                p.vy += p.gravity * 100 * dt;
                p.vx *= p.drag;
                p.vy *= p.drag;

                p.x += p.vx * dt;
                p.y += p.vy * dt;

                p.rotation += p.rotationSpeed * dt;
            }
        },

        // Render particles
        render(ctx, camera) {
            for (const p of this.activeParticles) {
                if (!p.active) continue;

                const screenX = p.x - camera.x;
                const screenY = p.y - camera.y;

                // Cull off-screen
                if (screenX < -50 || screenX > ctx.canvas.width + 50 ||
                    screenY < -50 || screenY > ctx.canvas.height + 50) continue;

                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.rotate(p.rotation);
                ctx.globalAlpha = p.alpha;

                if (p.type === 'emoji') {
                    ctx.font = `${p.size}px Arial`;
                    ctx.fillText(p.text, 0, 0);
                } else {
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }
        },

        // Special effects
        emitExplosion(x, y, color) {
            this.emit('spark', x, y, 30, { spread: Math.PI * 2, speed: 200, color });
            this.emit('fire', x, y, 20, { spread: Math.PI * 2, speed: 150 });
            this.emit('smoke', x, y, 15, { spread: Math.PI * 2, speed: 100 });
        },

        emitBlood(x, y, amount = 20) {
            this.emit('blood', x, y, amount, { spread: Math.PI, speed: 150, gravity: 0.5 });
        },

        emitMagic(x, y, color = '#aa00ff') {
            this.emit('magic', x, y, 15, { spread: Math.PI * 2, speed: 80, color });
        },

        emitSoul(x, y) {
            this.emit('soul', x, y, 10, { spread: Math.PI, speed: 50, gravity: -0.5 });
        },

        emitGlitch(x, y) {
            this.emit('glitch', x, y, 20, { spread: Math.PI * 2, speed: 300 });
        },

        emitEmoji(x, y, emoji) {
            this.emit('emoji', x, y, 5, { spread: Math.PI * 2, speed: 100, text: emoji });
        },

        // Clear all particles
        clear() {
            this.activeParticles = [];
        },

        // Get stats
        getStats() {
            return {
                active: this.activeParticles.length,
                max: this.maxParticles
            };
        }
    };

    // ===== PHASE 21: POST-PROCESSING MANAGER =====
    const PostProcessingManager = {
        effects: {
            vignette: { enabled: true, intensity: 0.5 },
            chromaticAberration: { enabled: true, intensity: 0.003 },
            filmGrain: { enabled: true, intensity: 0.05 },
            scanlines: { enabled: false, intensity: 0.1 },
            bloom: { enabled: true, threshold: 0.8, intensity: 0.3 },
            colorGrading: { enabled: true, preset: 'horror' },
            radialBlur: { enabled: false, intensity: 0.01 },
            distortion: { enabled: false, intensity: 0.02 }
        },

        init() {
            console.log('Phase 21: Post-Processing Manager initialized');
        },

        // Apply all effects
        apply(ctx, canvas) {
            const width = canvas.width;
            const height = canvas.height;

            // Get image data
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // Apply effects
            if (this.effects.vignette.enabled) this.applyVignette(data, width, height);
            if (this.effects.filmGrain.enabled) this.applyFilmGrain(data, width, height);
            if (this.effects.colorGrading.enabled) this.applyColorGrading(data, width, height);

            // Put back
            ctx.putImageData(imageData, 0, 0);

            // Overlay effects (chromatic aberration, scanlines)
            if (this.effects.chromaticAberration.enabled) {
                this.applyChromaticAberration(ctx, width, height);
            }
            if (this.effects.scanlines.enabled) {
                this.applyScanlines(ctx, width, height);
            }
        },

        // Vignette effect
        applyVignette(data, width, height) {
            const centerX = width / 2;
            const centerY = height / 2;
            const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
            const intensity = this.effects.vignette.intensity;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    const dx = x - centerX;
                    const dy = y - centerY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const vignette = 1 - (dist / maxDist) * intensity;

                    data[i] *= vignette;
                    data[i + 1] *= vignette;
                    data[i + 2] *= vignette;
                }
            }
        },

        // Film grain effect
        applyFilmGrain(data, width, height) {
            const intensity = this.effects.filmGrain.intensity * 255;

            for (let i = 0; i < data.length; i += 4) {
                const grain = (Math.random() - 0.5) * intensity;
                data[i] += grain;
                data[i + 1] += grain;
                data[i + 2] += grain;
            }
        },

        // Color grading
        applyColorGrading(data, width, height) {
            const presets = {
                horror: { r: 1.1, g: 0.8, b: 0.9, contrast: 1.1 },
                normal: { r: 1, g: 1, b: 1, contrast: 1 },
                cold: { r: 0.9, g: 0.95, b: 1.1, contrast: 1.05 },
                warm: { r: 1.1, g: 1.05, b: 0.9, contrast: 1.05 }
            };

            const preset = presets[this.effects.colorGrading.preset] || presets.normal;

            for (let i = 0; i < data.length; i += 4) {
                // Apply contrast
                data[i] = ((data[i] / 255 - 0.5) * preset.contrast + 0.5) * 255;
                data[i + 1] = ((data[i + 1] / 255 - 0.5) * preset.contrast + 0.5) * 255;
                data[i + 2] = ((data[i + 2] / 255 - 0.5) * preset.contrast + 0.5) * 255;

                // Apply color channels
                data[i] *= preset.r;
                data[i + 1] *= preset.g;
                data[i + 2] *= preset.b;
            }
        },

        // Chromatic aberration
        applyChromaticAberration(ctx, width, height) {
            const intensity = this.effects.chromaticAberration.intensity * width;
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // Red channel offset
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    const redX = Math.min(width - 1, x + intensity);
                    const redI = (y * width + redX) * 4;
                    data[i] = data[redI];
                }
            }

            ctx.putImageData(imageData, 0, 0);
        },

        // Scanlines
        applyScanlines(ctx, width, height) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.effects.scanlines.intensity})`;
            for (let y = 0; y < height; y += 4) {
                ctx.fillRect(0, y, width, 2);
            }
        },

        // Enable/disable effect
        setEffect(name, enabled) {
            if (this.effects[name]) {
                this.effects[name].enabled = enabled;
            }
        },

        // Set intensity
        setIntensity(name, intensity) {
            if (this.effects[name]) {
                this.effects[name].intensity = intensity;
            }
        },

        // Get all effects
        getEffects() {
            return { ...this.effects };
        }
    };

    // ===== PHASE 21: DYNAMIC LIGHTING =====
    const DynamicLighting = {
        lights: [],
        shadows: [],
        lightMap: null,

        init() {
            console.log('Phase 21: Dynamic Lighting initialized');
        },

        // Add light
        addLight(x, y, radius, color, intensity = 1) {
            this.lights.push({
                id: 'light_' + Date.now(),
                x, y, radius, color, intensity,
                flicker: Math.random() * 0.2,
                flickerSpeed: 2 + Math.random() * 3
            });
        },

        // Remove light
        removeLight(id) {
            this.lights = this.lights.filter(l => l.id !== id);
        },

        // Update lights
        update(dt) {
            for (const light of this.lights) {
                // Flicker effect
                light.intensity = 1 + Math.sin(Date.now() * light.flickerSpeed / 1000) * light.flicker;
            }
        },

        // Render lights
        render(ctx, camera) {
            // Create darkness overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            // Cut out light circles
            ctx.globalCompositeOperation = 'destination-out';

            for (const light of this.lights) {
                const screenX = light.x - camera.x;
                const screenY = light.y - camera.y;

                // Cull off-screen lights
                if (screenX < -light.radius || screenX > ctx.canvas.width + light.radius ||
                    screenY < -light.radius || screenY > ctx.canvas.height + light.radius) continue;

                const gradient = ctx.createRadialGradient(
                    screenX, screenY, 0,
                    screenX, screenY, light.radius
                );

                gradient.addColorStop(0, `rgba(255, 255, 255, ${light.intensity})`);
                gradient.addColorStop(0.5, `rgba(255, 255, 255, ${light.intensity * 0.5})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(screenX, screenY, light.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalCompositeOperation = 'source-over';
        },

        // Get lights
        getLights() {
            return this.lights;
        },

        // Clear all lights
        clear() {
            this.lights = [];
        }
    };

    // ===== PHASE 21: SCREEN SHAKE MANAGER =====
    const ScreenShakeManager = {
        shakes: [],
        totalShake: { x: 0, y: 0 },

        init() {
            console.log('Phase 21: Screen Shake Manager initialized');
        },

        // Add shake
        addShake(intensity, duration, decay = 0.9) {
            this.shakes.push({
                intensity,
                duration,
                decay,
                angle: Math.random() * Math.PI * 2
            });
        },

        // Update shake
        update(dt) {
            this.totalShake = { x: 0, y: 0 };

            for (let i = this.shakes.length - 1; i >= 0; i--) {
                const shake = this.shakes[i];
                shake.duration -= dt;

                if (shake.duration <= 0) {
                    this.shakes.splice(i, 1);
                    continue;
                }

                shake.intensity *= shake.decay;
                shake.angle += dt * 10;

                this.totalShake.x += Math.cos(shake.angle) * shake.intensity;
                this.totalShake.y += Math.sin(shake.angle) * shake.intensity;
            }
        },

        // Get shake offset
        getShakeOffset() {
            return this.totalShake;
        },

        // Clear shakes
        clear() {
            this.shakes = [];
            this.totalShake = { x: 0, y: 0 };
        }
    };

    // ===== PHASE 21: ANIMATION SYSTEM =====
    const AnimationSystem = {
        animations: new Map(),
        tweens: [],

        init() {
            console.log('Phase 21: Animation System initialized');
        },

        // Create animation
        createAnimation(id, frames, options = {}) {
            this.animations.set(id, {
                id,
                frames,
                currentFrame: 0,
                timer: 0,
                fps: options.fps || 12,
                loop: options.loop !== false,
                playing: false
            });
        },

        // Play animation
        play(id) {
            const anim = this.animations.get(id);
            if (anim) {
                anim.playing = true;
                anim.currentFrame = 0;
                anim.timer = 0;
            }
        },

        // Stop animation
        stop(id) {
            const anim = this.animations.get(id);
            if (anim) {
                anim.playing = false;
                anim.currentFrame = 0;
            }
        },

        // Update animations
        update(dt) {
            for (const anim of this.animations.values()) {
                if (!anim.playing) continue;

                anim.timer += dt;
                const frameTime = 1 / anim.fps;

                while (anim.timer >= frameTime) {
                    anim.timer -= frameTime;
                    anim.currentFrame++;

                    if (anim.currentFrame >= anim.frames.length) {
                        if (anim.loop) {
                            anim.currentFrame = 0;
                        } else {
                            anim.playing = false;
                            anim.currentFrame = anim.frames.length - 1;
                        }
                    }
                }
            }

            // Update tweens
            this.updateTweens(dt);
        },

        // Create tween
        tween(target, properties, duration, easing = 'linear') {
            const tween = {
                target,
                properties,
                duration,
                elapsed: 0,
                easing,
                startValues: {},
                complete: false
            };

            // Store start values
            for (const key in properties) {
                tween.startValues[key] = target[key];
            }

            this.tweens.push(tween);
            return tween;
        },

        // Update tweens
        updateTweens(dt) {
            for (let i = this.tweens.length - 1; i >= 0; i--) {
                const tween = this.tweens[i];
                tween.elapsed += dt;

                if (tween.elapsed >= tween.duration) {
                    // Apply final values
                    for (const key in tween.properties) {
                        tween.target[key] = tween.properties[key];
                    }
                    this.tweens.splice(i, 1);
                    continue;
                }

                // Apply easing
                const progress = tween.elapsed / tween.duration;
                const eased = this.applyEasing(progress, tween.easing);

                // Apply interpolated values
                for (const key in tween.properties) {
                    const start = tween.startValues[key];
                    const end = tween.properties[key];
                    tween.target[key] = start + (end - start) * eased;
                }
            }
        },

        // Easing functions
        applyEasing(t, type) {
            switch (type) {
                case 'linear': return t;
                case 'easeIn': return t * t;
                case 'easeOut': return t * (2 - t);
                case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                case 'bounce': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                default: return t;
            }
        },

        // Get animation frame
        getFrame(id) {
            const anim = this.animations.get(id);
            if (anim && anim.frames.length > 0) {
                return anim.frames[anim.currentFrame];
            }
            return null;
        }
    };

    // ===== PHASE 21: MAIN VISUAL POLISH MANAGER =====
    const Phase21VisualPolish = {
        initialized: false,

        init() {
            if (this.initialized) return;

            EnhancedParticleEngine.init();
            PostProcessingManager.init();
            DynamicLighting.init();
            ScreenShakeManager.init();
            AnimationSystem.init();

            this.initialized = true;
            console.log('Phase 21: Visual Polish initialized');
        },

        // Update all systems
        update(dt) {
            EnhancedParticleEngine.update(dt);
            PostProcessingManager.update(dt);
            DynamicLighting.update(dt);
            ScreenShakeManager.update(dt);
            AnimationSystem.update(dt);
        },

        // Render all systems
        render(ctx, camera) {
            EnhancedParticleEngine.render(ctx, camera);
            DynamicLighting.render(ctx, camera);
        },

        // Apply post-processing
        applyPostProcessing(ctx, canvas) {
            PostProcessingManager.apply(ctx, canvas);
        },

        // Get shake offset
        getShakeOffset() {
            return ScreenShakeManager.getShakeOffset();
        },

        // Particle effects
        emitExplosion: (x, y, color) => EnhancedParticleEngine.emitExplosion(x, y, color),
        emitBlood: (x, y, amount) => EnhancedParticleEngine.emitBlood(x, y, amount),
        emitMagic: (x, y, color) => EnhancedParticleEngine.emitMagic(x, y, color),
        emitSoul: (x, y) => EnhancedParticleEngine.emitSoul(x, y),
        emitGlitch: (x, y) => EnhancedParticleEngine.emitGlitch(x, y),
        emitEmoji: (x, y, emoji) => EnhancedParticleEngine.emitEmoji(x, y, emoji),

        // Lighting
        addLight: (x, y, radius, color, intensity) => DynamicLighting.addLight(x, y, radius, color, intensity),
        removeLight: (id) => DynamicLighting.removeLight(id),

        // Screen shake
        addShake: (intensity, duration) => ScreenShakeManager.addShake(intensity, duration),

        // Post-processing
        setEffect: (name, enabled) => PostProcessingManager.setEffect(name, enabled),
        setIntensity: (name, intensity) => PostProcessingManager.setIntensity(name, intensity),

        // Animations
        createAnimation: (id, frames, options) => AnimationSystem.createAnimation(id, frames, options),
        playAnimation: (id) => AnimationSystem.play(id),
        stopAnimation: (id) => AnimationSystem.stop(id),
        tween: (target, properties, duration, easing) => AnimationSystem.tween(target, properties, duration, easing)
    };

    // Export Phase 21 systems
    window.Phase21VisualPolish = Phase21VisualPolish;
    window.EnhancedParticleEngine = EnhancedParticleEngine;
    window.PostProcessingManager = PostProcessingManager;
    window.DynamicLighting = DynamicLighting;
    window.ScreenShakeManager = ScreenShakeManager;
    window.AnimationSystem = AnimationSystem;

})();
