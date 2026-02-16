/**
 * ============================================
 * SGAI Graphics Framework - Phase 10: Post-Processing
 * ============================================
 * Unified cinematic effects using EffectComposer.
 * 
 * Key Benefits:
 * - HDR Bloom
 * - SSAO
 * - Screen-space effects
 * - Chromatic aberration
 */

(function(global) {
    'use strict';

    // ============================================
    // POST-PROCESSING STACK
    // ============================================

    /**
     * Main post-processing pipeline
     */
    class PostProcessingStack {
        constructor(renderer, scene, camera) {
            this.renderer = renderer;
            this.scene = scene;
            this.camera = camera;
            
            this.composer = null;
            this.renderPass = null;
            this.effects = new Map();
            
            // Effect parameters
            this.params = {
                bloom: { enabled: true, strength: 0.5, radius: 0.4, threshold: 0.85 },
                ssao: { enabled: false, radius: 16, minDistance: 0.005, maxDistance: 0.1 },
                chromatic: { enabled: false, amount: 0.003 },
                vignette: { enabled: true, darkness: 0.5, offset: 1.0 },
                film: { enabled: false, noise: 0.2, scanlines: 0, grayscale: 0 },
                colorCorrection: { enabled: false, saturation: 1, brightness: 0, contrast: 1 }
            };
            
            this._init();
        }

        /**
         * Initialize EffectComposer
         */
        _init() {
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Create composer
            this.composer = new THREE.EffectComposer(this.renderer);
            
            // Render pass
            this.renderPass = new THREE.RenderPass(this.scene, this.camera);
            this.composer.addPass(this.renderPass);
            
            // Add effects
            this._addBloom();
            this._addChromaticAberration();
            this._addVignette();
            
            console.log('[PostProcessing] Initialized');
        }

        /**
         * Add bloom effect
         */
        _addBloom() {
            const bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                this.params.bloom.strength,
                this.params.bloom.radius,
                this.params.bloom.threshold
            );
            
            this.effects.set('bloom', bloomPass);
            this.composer.addPass(bloomPass);
        }

        /**
         * Add chromatic aberration
         */
        _addChromaticAberration() {
            const chromaticShader = {
                uniforms: {
                    tDiffuse: { value: null },
                    uAmount: { value: this.params.chromatic.amount }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tDiffuse;
                    uniform float uAmount;
                    varying vec2 vUv;
                    
                    void main() {
                        vec2 center = vec2(0.5);
                        vec2 dir = vUv - center;
                        float dist = length(dir);
                        
                        float r = texture2D(tDiffuse, vUv + dir * uAmount * dist).r;
                        float g = texture2D(tDiffuse, vUv).g;
                        float b = texture2D(tDiffuse, vUv - dir * uAmount * dist).b;
                        
                        gl_FragColor = vec4(r, g, b, 1.0);
                    }
                `
            };
            
            const chromaticPass = new THREE.ShaderPass(chromaticShader);
            this.effects.set('chromatic', chromaticPass);
            this.composer.addPass(chromaticPass);
        }

        /**
         * Add vignette effect
         */
        _addVignette() {
            const vignetteShader = {
                uniforms: {
                    tDiffuse: { value: null },
                    uDarkness: { value: this.params.vignette.darkness },
                    uOffset: { value: this.params.vignette.offset }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tDiffuse;
                    uniform float uDarkness;
                    uniform float uOffset;
                    varying vec2 vUv;
                    
                    void main() {
                        vec4 color = texture2D(tDiffuse, vUv);
                        vec2 center = vec2(0.5);
                        float dist = distance(vUv, center);
                        float vignette = smoothstep(0.8, uOffset * 0.5, dist * (uDarkness + uOffset));
                        color.rgb *= vignette;
                        gl_FragColor = color;
                    }
                `
            };
            
            const vignettePass = new THREE.ShaderPass(vignetteShader);
            this.effects.set('vignette', vignettePass);
            this.composer.addPass(vignettePass);
        }

        /**
         * Add SSAO
         */
        addSSAO(depthTexture) {
            const ssaoShader = {
                uniforms: {
                    tDiffuse: { value: null },
                    tDepth: { value: depthTexture },
                    uRadius: { value: this.params.ssao.radius },
                    uMinDistance: { value: this.params.ssao.minDistance },
                    uMaxDistance: { value: this.params.ssao.maxDistance }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tDiffuse;
                    uniform sampler2D tDepth;
                    uniform float uRadius;
                    uniform float uMinDistance;
                    uniform float uMaxDistance;
                    varying vec2 vUv;
                    
                    void main() {
                        vec4 color = texture2D(tDiffuse, vUv);
                        float depth = texture2D(tDepth, vUv).r;
                        
                        // Simple AO based on depth
                        float ao = 1.0 - smoothstep(uMinDistance, uMaxDistance, depth);
                        
                        color.rgb *= ao;
                        gl_FragColor = color;
                    }
                `
            };
            
            const ssaoPass = new THREE.ShaderPass(ssaoShader);
            this.effects.set('ssao', ssaoPass);
            this.composer.addPass(ssaoPass, 1); // Add after render pass
            
            this.params.ssao.enabled = true;
        }

        /**
         * Set effect parameter
         */
        setEffect(name, param, value) {
            const effect = this.effects.get(name);
            if (!effect) return;
            
            this.params[name][param] = value;
            
            if (effect.uniforms && effect.uniforms['u' + param]) {
                effect.uniforms['u' + param].value = value;
            }
            
            // Special cases
            if (name === 'bloom' && param === 'strength') {
                effect.strength = value;
            }
            if (name === 'bloom' && param === 'threshold') {
                effect.threshold = value;
            }
        }

        /**
         * Toggle effect
         */
        toggleEffect(name, enabled) {
            this.params[name].enabled = enabled;
            
            // Show/hide effect in composer
            // This is simplified - real implementation would handle pass indices
        }

        /**
         * Render with post-processing
         */
        render() {
            this.composer.render();
        }

        /**
         * Resize
         */
        setSize(width, height) {
            this.composer.setSize(width, height);
            
            const bloom = this.effects.get('bloom');
            if (bloom) {
                bloom.resolution.set(width, height);
            }
        }

        /**
         * Dispose
         */
        dispose() {
            for (const effect of this.effects.values()) {
                if (effect.dispose) effect.dispose();
            }
            this.composer.dispose();
        }
    }

    // ============================================
    // SCREEN EFFECTS
    // ============================================

    /**
     * Screen-space effects controller
     */
    class ScreenEffects {
        constructor() {
            this.intensity = 0;
            this.targetIntensity = 0;
            
            // Effect states
            this.shake = { x: 0, y: 0, intensity: 0 };
            this.damageOverlay = 0;
            this.sanityVignette = 0;
            this.blackout = 0;
            this.distortion = 0;
        }

        /**
         * Screen shake
         */
        shakeScreen(intensity, duration) {
            this.shake.intensity = Math.max(this.shake.intensity, intensity);
            this.shake.duration = duration;
        }

        /**
         * Damage flash
         */
        damageFlash() {
            this.damageOverlay = 1;
        }

        /**
         * Sanity effect
         */
        setSanity(value) {
            // 100 = normal, 0 = insane
            this.sanityVignette = 1 - (value / 100);
        }

        /**
         * Blackout
         */
        setBlackout(value) {
            this.blackout = value;
        }

        /**
         * Distortion (glitch effect)
         */
        setDistortion(value) {
            this.distortion = value;
        }

        /**
         * Update effects
         */
        update(dt) {
            // Decay damage
            if (this.damageOverlay > 0) {
                this.damageOverlay = Math.max(0, this.damageOverlay - dt * 3);
            }
            
            // Decay shake
            if (this.shake.intensity > 0) {
                this.shake.x = (Math.random() - 0.5) * this.shake.intensity;
                this.shake.y = (Math.random() - 0.5) * this.shake.intensity;
                this.shake.intensity = Math.max(0, this.shake.intensity - dt * 10);
            }
            
            // Decay distortion
            if (this.distortion > 0) {
                this.distortion = Math.max(0, this.distortion - dt * 2);
            }
        }

        /**
         * Apply to camera
         */
        applyToCamera(camera) {
            camera.position.x += this.shake.x;
            camera.position.y += this.shake.y;
        }

        /**
         * Get CSS overlay styles
         */
        getOverlayStyles() {
            const styles = [];
            
            // Damage
            if (this.damageOverlay > 0) {
                styles.push(`background: rgba(255,0,0,${this.damageOverlay * 0.5}); pointer-events: none;`);
            }
            
            // Sanity
            if (this.sanityVignette > 0) {
                const darkness = this.sanityVignette * 0.8;
                styles.push(`box-shadow: inset 0 0 100px rgba(0,0,0,${darkness}); pointer-events: none;`);
            }
            
            // Blackout
            if (this.blackout > 0) {
                styles.push(`background: rgba(0,0,0,${this.blackout}); pointer-events: none;`);
            }
            
            return styles.join(' ');
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    const SGAI = global.SGAI || {};
    SGAI.PostProcessingStack = PostProcessingStack;
    SGAI.ScreenEffects = ScreenEffects;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            PostProcessingStack,
            ScreenEffects
        };
    } else {
        global.SGAI = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);
