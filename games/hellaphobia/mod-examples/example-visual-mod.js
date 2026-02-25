/**
 * EXAMPLE MOD: VISUAL ENHANCEMENT PACK
 * ======================================
 * Demonstrates: Asset overrides, post-processing effects, custom shaders
 * 
 * This mod enhances the visual quality of Hellaphobia with:
 * - Improved lighting and shadows
 * - Film grain and chromatic aberration
 * - Enhanced particle effects
 * - Custom color grading
 */

(function() {
    'use strict';
    
    if (typeof modAPI === 'undefined') {
        console.error('[VisualMod] modAPI not available!');
        return;
    }
    
    const api = modAPI;
    api.log('Initializing Visual Enhancement mod...');
    
    // ==================== CONFIGURATION ====================
    
    const config = {
        enableFilmGrain: true,
        filmGrainIntensity: 0.15,
        
        enableChromaticAberration: true,
        chromaticStrength: 0.003,
        
        enableVignette: true,
        vignetteIntensity: 0.4,
        
        enableColorGrading: true,
        colorTemperature: 6500, // Kelvin
        saturation: 1.2,
        contrast: 1.1,
        
        enableEnhancedLighting: true,
        shadowQuality: 'high',
        lightBloom: true,
        
        enableParticleBoost: true,
        maxParticles: 2000
    };
    
    // ==================== POST-PROCESSING SHADERS ====================
    
    /**
     * Film grain effect shader
     */
    const filmGrainShader = {
        name: 'film_grain',
        type: 'fragment',
        uniforms: {
            time: 'float',
            intensity: 'float',
            resolution: 'vec2'
        },
        code: `
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }
            
            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            
            void mainImage(out vec4 fragColor, in vec2 fragCoord) {
                vec2 uv = fragCoord / resolution;
                float grain = noise(uv * 100.0 + time) * intensity;
                vec3 color = texture2D(iChannel0, uv).rgb;
                fragColor = vec4(color + grain, 1.0);
            }
        `
    };
    
    /**
     * Chromatic aberration shader
     */
    const chromaticAberrationShader = {
        name: 'chromatic_aberration',
        type: 'fragment',
        uniforms: {
            strength: 'float',
            resolution: 'vec2'
        },
        code: `
            void mainImage(out vec4 fragColor, in vec2 fragCoord) {
                vec2 uv = fragCoord / resolution;
                vec2 center = vec2(0.5, 0.5);
                vec2 dir = uv - center;
                float dist = length(dir);
                
                vec2 redUV = uv + dir * strength * dist;
                vec2 greenUV = uv;
                vec2 blueUV = uv - dir * strength * dist;
                
                float r = texture2D(iChannel0, redUV).r;
                float g = texture2D(iChannel0, greenUV).g;
                float b = texture2D(iChannel0, blueUV).b;
                
                fragColor = vec4(r, g, b, 1.0);
            }
        `
    };
    
    /**
     * Vignette shader
     */
    const vignetteShader = {
        name: 'vignette',
        type: 'fragment',
        uniforms: {
            intensity: 'float',
            resolution: 'vec2'
        },
        code: `
            void mainI nput(out vec4 fragColor, in vec2 fragCoord) {
                vec2 uv = fragCoord / resolution;
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(uv, center);
                float vignette = 1.0 - smoothstep(0.3, 0.8, dist * intensity);
                vec3 color = texture2D(iChannel0, uv).rgb;
                fragColor = vec4(color * vignette, 1.0);
            }
        `
    };
    
    /**
     * Color grading shader
     */
    const colorGradingShader = {
        name: 'color_grading',
        type: 'fragment',
        uniforms: {
            temperature: 'float',
            saturation: 'float',
            contrast: 'float'
        },
        code: `
            vec3 adjustTemperature(vec3 color, float temp) {
                float t = temp / 10000.0;
                vec3 warm = vec3(1.0, 0.9, 0.8);
                vec3 cool = vec3(0.8, 0.9, 1.0);
                return mix(color * cool, color * warm, t);
            }
            
            vec3 adjustSaturation(vec3 color, float sat) {
                float gray = dot(color, vec3(0.299, 0.587, 0.114));
                return mix(vec3(gray), color, sat);
            }
            
            vec3 adjustContrast(vec3 color, float cont) {
                return (color - 0.5) * cont + 0.5;
            }
            
            void mainI nput(out vec4 fragColor, in vec2 fragCoord) {
                vec2 uv = fragCoord / resolution;
                vec3 color = texture2D(iChannel0, uv).rgb;
                
                color = adjustTemperature(color, temperature);
                color = adjustSaturation(color, saturation);
                color = adjustContrast(color, contrast);
                
                fragColor = vec4(color, 1.0);
            }
        `
    };
    
    // Register shaders
    api.log('Registering post-processing shaders...');
    api.registerAsset('shader', 'film_grain', filmGrainShader);
    api.registerAsset('shader', 'chromatic_aberration', chromaticAberrationShader);
    api.registerAsset('shader', 'vignette', vignetteShader);
    api.registerAsset('shader', 'color_grading', colorGradingShader);
    
    // ==================== PARTICLE EFFECTS ====================
    
    /**
     * Enhanced blood splatter particles
     */
    const enhancedBloodParticles = {
        id: 'blood_splatter_enhanced',
        type: 'particle_system',
        
        emitter: {
            rate: 50, // particles per second
            lifetime: { min: 0.5, max: 1.5 },
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: Math.PI * 2 },
            size: { start: 8, end: 2, curve: 'easeOut' },
            
            color: {
                start: { r: 0.6, g: 0.0, b: 0.0, a: 1.0 },
                end: { r: 0.3, g: 0.0, b: 0.0, a: 0.0 }
            },
            
            gravity: 200,
            drag: 0.5,
            
            spawnShape: 'circle',
            spawnRadius: 5
        },
        
        update: function(deltaTime) {
            // Custom update logic for blood physics
        }
    };
    
    /**
     * Enhanced explosion particles
     */
    const enhancedExplosionParticles = {
        id: 'explosion_enhanced',
        type: 'particle_system',
        
        emitter: {
            rate: 100,
            lifetime: { min: 0.3, max: 1.0 },
            speed: { min: 200, max: 500 },
            angle: { min: 0, max: Math.PI * 2 },
            size: { start: 15, end: 5, curve: 'easeOut' },
            
            color: {
                start: { r: 1.0, g: 0.8, b: 0.2, a: 1.0 },
                mid: { r: 1.0, g: 0.4, b: 0.1, a: 0.8 },
                end: { r: 0.3, g: 0.3, b: 0.3, a: 0.0 }
            },
            
            gravity: -50,
            drag: 0.8
        }
    };
    
    api.registerAsset('particle_system', 'blood_enhanced', enhancedBloodParticles);
    api.registerAsset('particle_system', 'explosion_enhanced', enhancedExplosionParticles);
    
    // ==================== TEXTURE OVERRIDES ====================
    
    /**
     * Override default textures with higher quality versions
     */
    const textureOverrides = [
        {
            target: 'textures/walls/dungeon_wall.png',
            replacement: 'mods/visual/textures/walls/dungeon_wall_4k.png',
            filter: 'anisotropic',
            mipmaps: true
        },
        {
            target: 'textures/floors/stone_floor.png',
            replacement: 'mods/visual/textures/floors/stone_floor_4k.png',
            normalMap: 'mods/visual/textures/floors/stone_floor_normal.png'
        },
        {
            target: 'textures/enemies/basic_enemy.png',
            replacement: 'mods/visual/textures/enemies/enemy_hd.png',
            filter: 'linear'
        }
    ];
    
    for (const override of textureOverrides) {
        api.overrideAsset(override.target, {
            type: 'texture',
            src: override.replacement,
            settings: override
        });
        api.log(`✓ Overriding texture: ${override.target}`);
    }
    
    // ==================== LIGHTING ENHANCEMENTS ====================
    
    /**
     * Enhanced dynamic lighting system
     */
    const lightingConfig = {
        enableShadows: true,
        shadowResolution: 2048,
        shadowBias: 0.0001,
        
        enableBloom: true,
        bloomThreshold: 0.8,
        bloomIntensity: 0.5,
        bloomRadius: 0.3,
        
        enableAmbientOcclusion: true,
        aoSamples: 16,
        aoRadius: 1.0,
        aoIntensity: 0.3,
        
        pointLights: {
            maxCount: 50,
            maxShadowCount: 8
        },
        
        spotLights: {
            maxCount: 20,
            maxShadowCount: 4
        }
    };
    
    api.on('game:update', (data) => {
        // Apply lighting enhancements each frame
        if (config.enableEnhancedLighting) {
            // Would integrate with game's lighting system
            // Example: Update light quality based on performance
        }
    });
    
    // ==================== PERFORMANCE MONITORING ====================
    
    let fpsHistory = [];
    let lastFrameTime = performance.now();
    
    api.on('game:render', (data) => {
        const now = performance.now();
        const deltaTime = now - lastFrameTime;
        const fps = 1000 / deltaTime;
        lastFrameTime = now;
        
        fpsHistory.push(fps);
        if (fpsHistory.length > 60) {
            fpsHistory.shift();
        }
        
        // Auto-adjust quality if FPS drops
        const avgFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
        
        if (avgFps < 30 && config.enableParticleBoost) {
            api.log('Auto-reducing particle quality for performance');
            config.maxParticles = 1000;
        } else if (avgFps > 55 && config.maxParticles < 2000) {
            config.maxParticles = 2000;
        }
    });
    
    // ==================== UI ENHANCEMENTS ====================
    
    /**
     * Add visual settings panel
     */
    const visualSettingsUI = {
        title: 'Visual Enhancement Settings',
        sections: [
            {
                name: 'Post-Processing',
                options: [
                    { id: 'filmGrain', label: 'Film Grain', type: 'toggle', default: true },
                    { id: 'chromaticAberration', label: 'Chromatic Aberration', type: 'toggle', default: true },
                    { id: 'vignette', label: 'Vignette', type: 'toggle', default: true },
                    { id: 'colorGrading', label: 'Color Grading', type: 'toggle', default: true }
                ]
            },
            {
                name: 'Lighting',
                options: [
                    { id: 'shadows', label: 'Dynamic Shadows', type: 'toggle', default: true },
                    { id: 'bloom', label: 'Bloom', type: 'toggle', default: true },
                    { id: 'ambientOcclusion', label: 'Ambient Occlusion', type: 'toggle', default: true }
                ]
            },
            {
                name: 'Quality',
                options: [
                    { id: 'shadowQuality', label: 'Shadow Quality', type: 'select', options: ['low', 'medium', 'high'], default: 'high' },
                    { id: 'particleCount', label: 'Max Particles', type: 'slider', min: 500, max: 5000, step: 100, default: 2000 }
                ]
            }
        ]
    };
    
    api.log('Visual Enhancement mod initialized!');
    api.log('Post-processing effects enabled');
    api.log('Texture overrides loaded');
    api.log('Enhanced particle systems ready');
    
})();

console.log('[VisualMod] Module loaded');
