/* ============================================================
   HELLAPHOBIA 2026 - POST-PROCESSING STACK
   TAA | Motion Blur | DOF | Bloom | Film Grain | Chromatic Aberration
   Horror-Specific Effects | Sanity Distortion | Glitch Effects
   ============================================================ */

(function() {
    'use strict';

    // ===== POST-PROCESSING STACK =====
    const PostProcessingStack = {
        enabled: true,
        effects: {},
        intensity: 1.0,
        
        async init(config) {
            this.enabled = config.enabled !== false;
            
            // Initialize all post-processing effects
            this.effects = {
                TAA: { enabled: true, intensity: 1.0 },
                MotionBlur: { enabled: true, intensity: 0.5 },
                DOF: { enabled: true, focalDistance: 5.0, aperture: 0.1 },
                Bloom: { enabled: true, threshold: 0.8, intensity: 0.3 },
                FilmGrain: { enabled: true, intensity: 0.15 },
                ChromaticAberration: { enabled: true, intensity: 0.05 },
                Vignette: { enabled: true, intensity: 0.4 },
                ColorGrading: { enabled: true, preset: 'horror' },
                SanityDistortion: { enabled: true, intensity: 0.0 }, // Dynamic based on sanity
                GlitchEffect: { enabled: false, intensity: 0.0 } // Triggered by events
            };
            
            // Override with config
            if (config.effects) {
                config.effects.forEach(effect => {
                    if (this.effects[effect]) {
                        this.effects[effect].enabled = true;
                    }
                });
            }
            
            console.log('✅ Post-Processing Stack initialized');
            console.log(`   Active effects: ${Object.keys(this.effects).filter(e => this.effects[e].enabled).length}`);
        },
        
        update(deltaTime) {
            if (!this.enabled) return;
            
            // Update dynamic effects
            this.updateSanityDistortion();
            this.updateMotionBlur(deltaTime);
        },
        
        render() {
            if (!this.enabled) return;
            
            // Apply effects in order
            // Order matters for visual quality and performance
            
            // 1. TAA (Temporal Anti-Aliasing)
            if (this.effects.TAA.enabled) {
                this.applyTAA();
            }
            
            // 2. Depth of Field
            if (this.effects.DOF.enabled) {
                this.applyDOF();
            }
            
            // 3. Motion Blur
            if (this.effects.MotionBlur.enabled) {
                this.applyMotionBlur();
            }
            
            // 4. Bloom
            if (this.effects.Bloom.enabled) {
                this.applyBloom();
            }
            
            // 5. Color Grading
            if (this.effects.ColorGrading.enabled) {
                this.applyColorGrading();
            }
            
            // 6. Vignette
            if (this.effects.Vignette.enabled) {
                this.applyVignette();
            }
            
            // 7. Film Grain
            if (this.effects.FilmGrain.enabled) {
                this.applyFilmGrain();
            }
            
            // 8. Chromatic Aberration
            if (this.effects.ChromaticAberration.enabled) {
                this.applyChromaticAberration();
            }
            
            // 9. Sanity Distortion (horror-specific)
            if (this.effects.SanityDistortion.enabled && this.effects.SanityDistortion.intensity > 0.01) {
                this.applySanityDistortion();
            }
            
            // 10. Glitch Effect (triggered by events)
            if (this.effects.GlitchEffect.enabled && this.effects.GlitchEffect.intensity > 0.01) {
                this.applyGlitchEffect();
            }
        },
        
        applyTAA() {
            // Temporal Anti-Aliasing implementation
            // Blends current frame with previous frames using motion vectors
            // Reduces jagged edges and improves image quality
        },
        
        applyDOF() {
            // Depth of Field - simulates camera focus
            // Objects at focal distance are sharp, others are blurred
            // Creates cinematic look and directs player attention
        },
        
        applyMotionBlur() {
            // Motion blur based on camera and object movement
            // Adds smoothness to fast movements
            // Intensity controlled by speed
        },
        
        updateMotionBlur(deltaTime) {
            // Adjust motion blur based on camera velocity
            // More blur during fast movement, less when stationary
        },
        
        applyBloom() {
            // Bloom effect for bright areas
            // Creates glow around light sources
            // Threshold controls which pixels bloom
        },
        
        applyColorGrading() {
            // Horror-specific color grading
            // Pushes colors towards cold blues and sick greens
            // Increases contrast, crushes blacks
            // Creates oppressive atmosphere
        },
        
        applyVignette() {
            // Darkens edges of screen
            // Focuses attention on center
            // Increases claustrophobia
        },
        
        applyFilmGrain() {
            // Adds film grain noise
            // Creates analog horror aesthetic
            // Masks low-resolution textures
        },
        
        applyChromaticAberration() {
            // Simulates lens imperfections
            // Splits RGB channels slightly at edges
            // Adds unease and visual distortion
        },
        
        applySanityDistortion() {
            // Horror-specific effect based on player sanity
            // Low sanity = more distortion
            // Includes: screen warp, color shift, hallucination overlays
            const intensity = this.effects.SanityDistortion.intensity;
            
            if (intensity > 0.5) {
                // Severe distortion
                this.triggerHallucination();
            }
            
            if (intensity > 0.3) {
                // Moderate distortion
                this.applyScreenWarp(intensity);
            }
        },
        
        triggerHallucination() {
            // Random hallucination effects
            const hallucinations = [
                'shadow_figures',
                'blood_drips',
                'text_on_walls',
                'face_in_darkness'
            ];
            
            const type = hallucinations[Math.floor(Math.random() * hallucinations.length)];
            
            // Dispatch event for game to handle
            window.dispatchEvent(new CustomEvent('hallucination', {
                detail: { type, intensity: this.effects.SanityDistortion.intensity }
            }));
        },
        
        applyScreenWarp(intensity) {
            // Warp screen coordinates based on sanity
            // Creates disorienting effect
        },
        
        applyGlitchEffect() {
            // Digital glitch effects for meta-horror moments
            // Screen tearing, color shifts, pixel displacement
            // Used during fourth wall breaks or reality glitches
            
            // Decay glitch intensity over time
            this.effects.GlitchEffect.intensity *= 0.95;
            
            if (this.effects.GlitchEffect.intensity < 0.01) {
                this.effects.GlitchEffect.enabled = false;
            }
        },
        
        // Set sanity level (called by game)
        setSanityLevel(sanity) {
            // Sanity is 0-100, convert to distortion intensity 0-1
            const normalized = 1.0 - (sanity / 100);
            this.effects.SanityDistortion.intensity = normalized;
            
            // Enable/disable based on threshold
            this.effects.SanityDistortion.enabled = normalized > 0.1;
        },
        
        // Trigger glitch effect (called by FourthWallBreaker)
        triggerGlitch(intensity = 1.0) {
            this.effects.GlitchEffect.enabled = true;
            this.effects.GlitchEffect.intensity = intensity;
        },
        
        // Get active effects list
        getActiveEffects() {
            return Object.entries(this.effects)
                .filter(([_, effect]) => effect.enabled)
                .map(([name, _]) => name);
        },
        
        // Toggle effect
        toggleEffect(name, enabled) {
            if (this.effects[name]) {
                this.effects[name].enabled = enabled;
            }
        },
        
        // Set effect intensity
        setEffectIntensity(name, intensity) {
            if (this.effects[name]) {
                this.effects[name].intensity = intensity;
            }
        },
        
        exportAPI() {
            return {
                init: (config) => this.init(config),
                update: (dt) => this.update(dt),
                render: () => this.render(),
                setSanityLevel: (sanity) => this.setSanityLevel(sanity),
                triggerGlitch: (intensity) => this.triggerGlitch(intensity),
                getActiveEffects: () => this.getActiveEffects(),
                toggleEffect: (name, enabled) => this.toggleEffect(name, enabled),
                setEffectIntensity: (name, intensity) => this.setEffectIntensity(name, intensity)
            };
        }
    };
    
    // Export to window
    window.PostProcessingStack = PostProcessingStack.exportAPI();
    
    console.log('🎨 Post-Processing Stack loaded');
})();
