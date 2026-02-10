/* ============================================
   The Abyss - Advanced Post-Processing Stack
   Bloom, SSR, SSAO, Motion Blur, Color Grading
   Phase 1 Implementation
   ============================================ */

const PostProcessStack = (function() {
    'use strict';

    // Post-processing configuration
    const CONFIG = {
        // Bloom
        bloomStrength: 1.5,
        bloomRadius: 0.5,
        bloomThreshold: 0.8,
        
        // SSR (Screen Space Reflections)
        ssrEnabled: true,
        ssrQuality: 'high', // low, medium, high
        ssrMaxDistance: 50,
        
        // SSAO
        ssaoEnabled: true,
        ssaoRadius: 2,
        ssaoIntensity: 1.5,
        
        // Motion Blur
        motionBlurEnabled: true,
        motionBlurStrength: 0.5,
        
        // Color Grading
        colorGradingEnabled: true,
        contrast: 1.1,
        saturation: 1.0,
        brightness: 0.0,
        tint: new THREE.Color(0x001133),
        
        // Chromatic Aberration
        chromaticAberration: 0.5,
        
        // Vignette
        vignetteIntensity: 0.4,
        vignetteSize: 1.5
    };

    // Passes
    let composer = null;
    let renderPass = null;
    let ssaoPass = null;
    let ssrPass = null;
    let bloomPass = null;
    let motionBlurPass = null;
    let colorGradingPass = null;
    let chromaticAberrationPass = null;
    let vignettePass = null;
    let outputPass = null;

    // Motion blur data
    let previousViewMatrix = new THREE.Matrix4();
    let previousProjectionMatrix = new THREE.Matrix4();

    // ============================================
    // INITIALIZATION
    // ============================================
    function init(renderer, scene, camera) {
        console.log('🎨 Initializing Post-Process Stack...');
        
        composer = new THREE.EffectComposer(renderer);
        
        // 1. Render Pass
        renderPass = new THREE.RenderPass(scene, camera);
        composer.addPass(renderPass);
        
        // 2. SSAO Pass (Ambient Occlusion)
        if (CONFIG.ssaoEnabled && THREE.SSAOPass) {
            initSSAO(renderer, scene, camera);
        }
        
        // 3. SSR Pass (Screen Space Reflections)
        if (CONFIG.ssrEnabled) {
            initSSR(renderer, scene, camera);
        }
        
        // 4. Bloom Pass
        initBloom(renderer);
        
        // 5. Motion Blur
        if (CONFIG.motionBlurEnabled) {
            initMotionBlur(camera);
        }
        
        // 6. Color Grading
        if (CONFIG.colorGradingEnabled) {
            initColorGrading();
        }
        
        // 7. Chromatic Aberration
        initChromaticAberration();
        
        // 8. Vignette
        initVignette();
        
        // 9. Output Pass (tone mapping)
        initOutputPass();
        
        console.log('✅ Post-Process Stack ready');
        return composer;
    }

    // ============================================
    // SSAO (Screen Space Ambient Occlusion)
    // ============================================
    function initSSAO(renderer, scene, camera) {
        ssaoPass = new THREE.SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
        ssaoPass.kernelRadius = CONFIG.ssaoRadius;
        ssaoPass.minDistance = 0.005;
        ssaoPass.maxDistance = 0.1;
        ssaoPass.output = THREE.SSAOPass.OUTPUT.Default; // SSAO + Beauty
        
        // Custom SSAO shader modification for underwater look
        ssaoPass.uniforms['intensity'].value = CONFIG.ssaoIntensity;
        
        composer.addPass(ssaoPass);
    }

    // ============================================
    // SSR (Screen Space Reflections)
    // ============================================
    function initSSR(renderer, scene, camera) {
        // Custom SSR implementation using ShaderPass
        const ssrShader = {
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: null },
                cameraMatrixWorld: { value: new THREE.Matrix4() },
                cameraProjectionMatrix: { value: new THREE.Matrix4() },
                cameraProjectionMatrixInverse: { value: new THREE.Matrix4() },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                maxDistance: { value: CONFIG.ssrMaxDistance },
                resolutionScale: { value: CONFIG.ssrQuality === 'high' ? 1.0 : 0.5 }
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
                uniform mat4 cameraMatrixWorld;
                uniform mat4 cameraProjectionMatrix;
                uniform mat4 cameraProjectionMatrixInverse;
                uniform vec2 resolution;
                uniform float maxDistance;
                uniform float resolutionScale;
                
                varying vec2 vUv;
                
                // Simple SSR implementation
                vec3 getWorldPosition(vec2 uv, float depth) {
                    vec4 clipSpace = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
                    vec4 viewSpace = cameraProjectionMatrixInverse * clipSpace;
                    viewSpace /= viewSpace.w;
                    return (cameraMatrixWorld * viewSpace).xyz;
                }
                
                vec2 getScreenPosition(vec3 worldPos) {
                    vec4 clipSpace = cameraProjectionMatrix * inverse(cameraMatrixWorld) * vec4(worldPos, 1.0);
                    clipSpace /= clipSpace.w;
                    return clipSpace.xy * 0.5 + 0.5;
                }
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    float depth = texture2D(tDepth, vUv).r;
                    
                    // Only calculate SSR for pixels close to water surface
                    if (depth > 0.99) {
                        gl_FragColor = color;
                        return;
                    }
                    
                    vec3 worldPos = getWorldPosition(vUv, depth);
                    vec3 viewDir = normalize(cameraMatrixWorld[3].xyz - worldPos);
                    vec3 normal = vec3(0.0, 1.0, 0.0); // Simplified - would use normal map
                    vec3 reflectDir = reflect(-viewDir, normal);
                    
                    // Ray march for reflection
                    vec3 rayPos = worldPos;
                    vec2 rayUV = vUv;
                    float stepSize = maxDistance / 20.0;
                    
                    for (int i = 0; i < 20; i++) {
                        rayPos += reflectDir * stepSize;
                        rayUV = getScreenPosition(rayPos);
                        
                        if (rayUV.x < 0.0 || rayUV.x > 1.0 || rayUV.y < 0.0 || rayUV.y > 1.0) {
                            break;
                        }
                        
                        float rayDepth = texture2D(tDepth, rayUV).r;
                        vec3 rayWorldPos = getWorldPosition(rayUV, rayDepth);
                        
                        if (rayWorldPos.y > rayPos.y) {
                            // Hit something
                            vec3 reflectionColor = texture2D(tDiffuse, rayUV).rgb;
                            float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.0);
                            color.rgb = mix(color.rgb, reflectionColor, fresnel * 0.3);
                            break;
                        }
                    }
                    
                    gl_FragColor = color;
                }
            `
        };

        ssrPass = new THREE.ShaderPass(ssrShader);
        ssrPass.uniforms.tDepth.value = composer.renderTarget2.depthTexture || 
            new THREE.DepthTexture(window.innerWidth, window.innerHeight);
        
        composer.addPass(ssrPass);
    }

    // ============================================
    // BLOOM (HDR Glow)
    // ============================================
    function initBloom(renderer) {
        const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
        
        bloomPass = new THREE.UnrealBloomPass(
            resolution,
            CONFIG.bloomStrength,
            CONFIG.bloomRadius,
            CONFIG.bloomThreshold
        );
        
        composer.addPass(bloomPass);
    }

    // ============================================
    // MOTION BLUR
    // ============================================
    function initMotionBlur(camera) {
        const motionBlurShader = {
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: null },
                velocityScale: { value: CONFIG.motionBlurStrength },
                deltaTime: { value: 0.016 }
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
                uniform float velocityScale;
                uniform float deltaTime;
                
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    
                    // Simple radial blur based on distance from center (camera movement)
                    vec2 center = vec2(0.5);
                    vec2 dir = vUv - center;
                    float dist = length(dir);
                    
                    // Sample along blur direction
                    int samples = 8;
                    vec4 blurColor = vec4(0.0);
                    
                    for (int i = 0; i < samples; i++) {
                        float t = float(i) / float(samples - 1);
                        vec2 offset = dir * t * velocityScale * dist * 0.5;
                        blurColor += texture2D(tDiffuse, vUv + offset);
                    }
                    
                    blurColor /= float(samples);
                    
                    // Blend based on motion intensity
                    gl_FragColor = mix(color, blurColor, velocityScale * dist * 2.0);
                }
            `
        };

        motionBlurPass = new THREE.ShaderPass(motionBlurShader);
        composer.addPass(motionBlurPass);
    }

    // ============================================
    // COLOR GRADING
    // ============================================
    function initColorGrading() {
        const colorGradingShader = {
            uniforms: {
                tDiffuse: { value: null },
                contrast: { value: CONFIG.contrast },
                saturation: { value: CONFIG.saturation },
                brightness: { value: CONFIG.brightness },
                tint: { value: CONFIG.tint },
                tintStrength: { value: 0.3 }
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
                uniform float contrast;
                uniform float saturation;
                uniform float brightness;
                uniform vec3 tint;
                uniform float tintStrength;
                
                varying vec2 vUv;
                
                vec3 adjustContrast(vec3 color, float value) {
                    return 0.5 + (color - 0.5) * value;
                }
                
                vec3 adjustSaturation(vec3 color, float value) {
                    const vec3 luminance = vec3(0.2126, 0.7152, 0.0722);
                    float gray = dot(color, luminance);
                    return mix(vec3(gray), color, value);
                }
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    
                    // Apply brightness
                    color.rgb += brightness;
                    
                    // Apply contrast
                    color.rgb = adjustContrast(color.rgb, contrast);
                    
                    // Apply saturation
                    color.rgb = adjustSaturation(color.rgb, saturation);
                    
                    // Apply underwater tint
                    color.rgb = mix(color.rgb, tint, tintStrength * (1.0 - color.r));
                    
                    // Depth-based blue shift for underwater feel
                    float depth = 1.0 - color.r * 0.3; // Simplified
                    color.rgb = mix(color.rgb, vec3(0.0, 0.2, 0.4), depth * 0.2);
                    
                    gl_FragColor = color;
                }
            `
        };

        colorGradingPass = new THREE.ShaderPass(colorGradingShader);
        composer.addPass(colorGradingPass);
    }

    // ============================================
    // CHROMATIC ABERRATION
    // ============================================
    function initChromaticAberration() {
        const chromaticShader = {
            uniforms: {
                tDiffuse: { value: null },
                aberrationStrength: { value: CONFIG.chromaticAberration }
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
                uniform float aberrationStrength;
                
                varying vec2 vUv;
                
                void main() {
                    vec2 center = vec2(0.5);
                    vec2 direction = vUv - center;
                    float dist = length(direction);
                    
                    float strength = aberrationStrength * dist * 0.02;
                    
                    float r = texture2D(tDiffuse, vUv + direction * strength * 1.0).r;
                    float g = texture2D(tDiffuse, vUv + direction * strength * 0.5).g;
                    float b = texture2D(tDiffuse, vUv + direction * strength * 0.0).b;
                    
                    gl_FragColor = vec4(r, g, b, 1.0);
                }
            `
        };

        chromaticAberrationPass = new THREE.ShaderPass(chromaticShader);
        composer.addPass(chromaticAberrationPass);
    }

    // ============================================
    // VIGNETTE
    // ============================================
    function initVignette() {
        const vignetteShader = {
            uniforms: {
                tDiffuse: { value: null },
                intensity: { value: CONFIG.vignetteIntensity },
                size: { value: CONFIG.vignetteSize }
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
                uniform float intensity;
                uniform float size;
                
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    
                    vec2 center = vec2(0.5);
                    float dist = distance(vUv, center);
                    
                    float vignette = smoothstep(size, size * 0.5, dist);
                    vignette = mix(1.0 - intensity, 1.0, vignette);
                    
                    // Add slight color tint to vignette for underwater feel
                    vec3 vignetteColor = vec3(0.0, 0.05, 0.1);
                    color.rgb = mix(vignetteColor, color.rgb, vignette);
                    
                    gl_FragColor = color;
                }
            `
        };

        vignettePass = new THREE.ShaderPass(vignetteShader);
        composer.addPass(vignettePass);
    }

    // ============================================
    // OUTPUT PASS
    // ============================================
    function initOutputPass() {
        outputPass = new THREE.ShaderPass(THREE.CopyShader);
        outputPass.renderToScreen = true;
        composer.addPass(outputPass);
    }

    // ============================================
    // UPDATE FUNCTIONS
    // ============================================
    function update(camera, deltaTime) {
        // Update SSR matrices
        if (ssrPass) {
            ssrPass.uniforms.cameraMatrixWorld.value.copy(camera.matrixWorld);
            ssrPass.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);
            ssrPass.uniforms.cameraProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse);
        }
        
        // Update motion blur
        if (motionBlurPass) {
            motionBlurPass.uniforms.deltaTime.value = deltaTime;
        }
        
        // Store matrices for next frame
        previousViewMatrix.copy(camera.matrixWorldInverse);
        previousProjectionMatrix.copy(camera.projectionMatrix);
    }

    function setSize(width, height) {
        composer.setSize(width, height);
        
        if (ssaoPass) {
            ssaoPass.setSize(width, height);
        }
        if (ssrPass) {
            ssrPass.uniforms.resolution.value.set(width, height);
        }
    }

    // ============================================
    // CONFIGURATION SETTERS
    // ============================================
    function setBloomStrength(strength) {
        CONFIG.bloomStrength = strength;
        if (bloomPass) bloomPass.strength = strength;
    }

    function setBloomThreshold(threshold) {
        CONFIG.bloomThreshold = threshold;
        if (bloomPass) bloomPass.threshold = threshold;
    }

    function setSSAOIntensity(intensity) {
        CONFIG.ssaoIntensity = intensity;
        if (ssaoPass) ssaoPass.uniforms['intensity'].value = intensity;
    }

    function setMotionBlurStrength(strength) {
        CONFIG.motionBlurStrength = strength;
        if (motionBlurPass) motionBlurPass.uniforms.velocityScale.value = strength;
    }

    function setContrast(value) {
        CONFIG.contrast = value;
        if (colorGradingPass) colorGradingPass.uniforms.contrast.value = value;
    }

    function setSaturation(value) {
        CONFIG.saturation = value;
        if (colorGradingPass) colorGradingPass.uniforms.saturation.value = value;
    }

    function setChromaticAberration(value) {
        CONFIG.chromaticAberration = value;
        if (chromaticAberrationPass) {
            chromaticAberrationPass.uniforms.aberrationStrength.value = value;
        }
    }

    function setVignette(intensity) {
        CONFIG.vignetteIntensity = intensity;
        if (vignettePass) vignettePass.uniforms.intensity.value = intensity;
    }

    // ============================================
    // DISPOSAL
    // ============================================
    function dispose() {
        composer?.dispose();
        renderPass?.dispose();
        ssaoPass?.dispose();
        bloomPass?.dispose();
        motionBlurPass?.dispose();
        colorGradingPass?.dispose();
        chromaticAberrationPass?.dispose();
        vignettePass?.dispose();
        outputPass?.dispose();
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        init,
        update,
        setSize,
        dispose,
        getComposer: () => composer,
        
        // Configuration
        setBloomStrength,
        setBloomThreshold,
        setSSAOIntensity,
        setMotionBlurStrength,
        setContrast,
        setSaturation,
        setChromaticAberration,
        setVignette,
        getConfig: () => ({ ...CONFIG })
    };
})();

// Global access
window.PostProcessStack = PostProcessStack;
