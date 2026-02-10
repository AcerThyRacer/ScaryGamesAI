/* ============================================
   The Abyss - Volumetric Rendering System
   Volumetric Fog, God Rays, and Caustics
   Phase 1 Implementation
   ============================================ */

const VolumetricSystem = (function() {
    'use strict';

    // Volumetric configuration
    const CONFIG = {
        fogDensity: 0.025,
        fogColor: new THREE.Color(0x020510),
        scattering: 0.7,
        absorption: 0.3,
        godRayIntensity: 1.0,
        causticsIntensity: 0.8,
        causticsSpeed: 0.5,
        noiseScale: 0.1,
        stepCount: 64 // Ray marching steps
    };

    // Shader materials
    let volumetricFogMaterial = null;
    let godRayMaterial = null;
    let causticsMaterial = null;
    let volumetricMesh = null;
    let godRayMesh = null;
    let causticsLight = null;
    let noiseTexture = null;
    let causticsTexture = null;

    // Animation
    let time = 0;
    let isActive = false;

    // ============================================
    // INITIALIZATION
    // ============================================
    function init(scene, camera, renderer) {
        console.log('🌫️ Initializing Volumetric System...');

        // Create noise texture for fog variation
        createNoiseTexture();

        // Create caustics texture
        createCausticsTexture();

        // Setup volumetric fog
        setupVolumetricFog(scene, camera);

        // Setup god rays
        setupGodRays(scene, camera);

        // Setup caustics projection
        setupCaustics(scene);

        isActive = true;
        console.log('✅ Volumetric System ready');

        return true;
    }

    // ============================================
    // NOISE TEXTURE GENERATION
    // ============================================
    function createNoiseTexture() {
        const size = 256;
        const data = new Uint8Array(size * size * size);

        // 3D Perlin-like noise
        for (let z = 0; z < size; z++) {
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const index = z * size * size + y * size + x;
                    const noise = PerlinNoise3D(
                        x * CONFIG.noiseScale,
                        y * CONFIG.noiseScale,
                        z * CONFIG.noiseScale
                    );
                    data[index] = Math.floor((noise + 1) * 0.5 * 255);
                }
            }
        }

        noiseTexture = new THREE.Data3DTexture(data, size, size, size);
        noiseTexture.format = THREE.RedFormat;
        noiseTexture.minFilter = THREE.LinearFilter;
        noiseTexture.magFilter = THREE.LinearFilter;
        noiseTexture.wrapS = THREE.RepeatWrapping;
        noiseTexture.wrapT = THREE.RepeatWrapping;
        noiseTexture.wrapR = THREE.RepeatWrapping;
        noiseTexture.needsUpdate = true;
    }

    // Simple Perlin noise implementation
    function PerlinNoise3D(x, y, z) {
        const p = new Uint8Array(512);
        const permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];

        for (let i = 0; i < 256; i++) {
            p[256 + i] = p[i] = permutation[i];
        }

        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = fade(x);
        const v = fade(y);
        const w = fade(z);

        const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
        const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;

        return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z),
            grad(p[BA], x - 1, y, z)),
            lerp(u, grad(p[AB], x, y - 1, z),
            grad(p[BB], x - 1, y - 1, z))),
            lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1),
            grad(p[BA + 1], x - 1, y, z - 1)),
            lerp(u, grad(p[AB + 1], x, y - 1, z - 1),
            grad(p[BB + 1], x - 1, y - 1, z - 1))));
    }

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(t, a, b) { return a + t * (b - a); }
    function grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    // ============================================
    // CAUSTICS TEXTURE
    // ============================================
    function createCausticsTexture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Generate caustic pattern
        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const u = x / size;
                const v = y / size;

                // Multiple overlapping sine waves for caustic effect
                let intensity = 0;
                intensity += Math.sin(u * 20 + v * 15) * 0.5 + 0.5;
                intensity += Math.sin(u * 35 - v * 25) * 0.5 + 0.5;
                intensity += Math.sin((u + v) * 30) * 0.5 + 0.5;
                intensity /= 3;

                // Sharpen for caustic look
                intensity = Math.pow(intensity, 3);

                const idx = (y * size + x) * 4;
                const val = Math.floor(intensity * 255);
                data[idx] = val;
                data[idx + 1] = val;
                data[idx + 2] = val;
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        causticsTexture = new THREE.CanvasTexture(canvas);
        causticsTexture.wrapS = THREE.RepeatWrapping;
        causticsTexture.wrapT = THREE.RepeatWrapping;
    }

    // ============================================
    // VOLUMETRIC FOG SHADER
    // ============================================
    function setupVolumetricFog(scene, camera) {
        const vertexShader = `
            varying vec3 vWorldPosition;
            varying vec3 vCameraPosition;

            void main() {
                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                vCameraPosition = cameraPosition;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform vec3 fogColor;
            uniform float fogDensity;
            uniform float scattering;
            uniform float absorption;
            uniform float time;
            uniform sampler3D noiseTexture;
            uniform vec3 lightDirection;
            uniform vec3 lightColor;
            uniform float lightIntensity;

            varying vec3 vWorldPosition;
            varying vec3 vCameraPosition;

            // Ray marching settings
            const int MAX_STEPS = 64;
            const float STEP_SIZE = 0.5;

            // Noise function
            float getNoise(vec3 pos) {
                return texture3D(noiseTexture, pos * 0.01 + vec3(time * 0.02)).r;
            }

            void main() {
                vec3 rayOrigin = vCameraPosition;
                vec3 rayDir = normalize(vWorldPosition - vCameraPosition);

                float totalDensity = 0.0;
                vec3 accumulatedLight = vec3(0.0);
                float transmittance = 1.0;

                // Ray march through volume
                for (int i = 0; i < MAX_STEPS; i++) {
                    float t = float(i) * STEP_SIZE;
                    vec3 pos = rayOrigin + rayDir * t;

                    // Sample density with noise
                    float density = fogDensity * (0.5 + 0.5 * getNoise(pos));

                    // Height-based density (denser at bottom)
                    density *= 1.0 + smoothstep(-50.0, -200.0, pos.y) * 2.0;

                    // Light scattering
                    float lightScatter = max(0.0, dot(rayDir, -lightDirection));
                    lightScatter = pow(lightScatter, 4.0) * lightIntensity;

                    vec3 stepLight = lightColor * lightScatter * scattering * density * STEP_SIZE;
                    accumulatedLight += stepLight * transmittance;

                    // Absorption
                    transmittance *= exp(-density * absorption * STEP_SIZE);
                    totalDensity += density;

                    if (transmittance < 0.01) break;
                }

                vec3 finalColor = fogColor * (1.0 - transmittance) + accumulatedLight;
                float alpha = 1.0 - transmittance;

                gl_FragColor = vec4(finalColor, alpha * 0.8);
            }
        `;

        // Create fullscreen quad for ray marching
        const geometry = new THREE.PlaneGeometry(2, 2);
        volumetricFogMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                fogColor: { value: CONFIG.fogColor },
                fogDensity: { value: CONFIG.fogDensity },
                scattering: { value: CONFIG.scattering },
                absorption: { value: CONFIG.absorption },
                time: { value: 0 },
                noiseTexture: { value: noiseTexture },
                lightDirection: { value: new THREE.Vector3(0, -1, 0) },
                lightColor: { value: new THREE.Color(0x4488ff) },
                lightIntensity: { value: 1.0 }
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        volumetricMesh = new THREE.Mesh(geometry, volumetricFogMaterial);
        volumetricMesh.frustumCulled = false;

        // Add to scene (will be rendered in post-processing)
        scene.add(volumetricMesh);
    }

    // ============================================
    // GOD RAYS (LIGHT SHAFTS)
    // ============================================
    function setupGodRays(scene, camera) {
        const vertexShader = `
            varying vec2 vUv;
            varying vec3 vWorldPosition;

            void main() {
                vUv = uv;
                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform vec3 sunPosition;
            uniform vec3 sunColor;
            uniform float intensity;
            uniform float time;
            uniform sampler2D noiseTexture;

            varying vec2 vUv;
            varying vec3 vWorldPosition;

            void main() {
                vec2 sunScreenPos = sunPosition.xy; // Projected to screen space
                vec2 dir = vUv - sunScreenPos;
                float dist = length(dir);

                // Radial blur for god rays
                vec4 color = vec4(0.0);
                float samples = 32.0;

                for (float i = 0.0; i < samples; i++) {
                    float scale = 1.0 - (i / samples) * 0.8;
                    vec2 offset = dir * scale;

                    // Add some noise variation
                    float noise = texture2D(noiseTexture, vUv * 3.0 + time * 0.1).r;

                    float atten = 1.0 - (i / samples);
                    color += vec4(sunColor, 1.0) * atten * (0.5 + noise * 0.5);
                }

                color /= samples;

                // Fade out at edges
                float fade = 1.0 - smoothstep(0.3, 1.0, dist);

                gl_FragColor = vec4(color.rgb * intensity, color.a * fade * 0.3);
            }
        `;

        godRayMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                sunPosition: { value: new THREE.Vector3(0, 10, 0) },
                sunColor: { value: new THREE.Color(0x66aaff) },
                intensity: { value: CONFIG.godRayIntensity },
                time: { value: 0 },
                noiseTexture: { value: causticsTexture }
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });

        // Create light shaft geometry (cone from surface)
        const geometry = new THREE.ConeGeometry(20, 100, 32, 1, true);
        godRayMesh = new THREE.Mesh(geometry, godRayMaterial);
        godRayMesh.position.set(0, -50, 0);

        scene.add(godRayMesh);
    }

    // ============================================
    // CAUSTICS PROJECTION
    // ============================================
    function setupCaustics(scene) {
        // Project caustics from above
        causticsLight = new THREE.SpotLight(0x44aaff, CONFIG.causticsIntensity);
        causticsLight.position.set(0, 50, 0);
        causticsLight.angle = Math.PI / 3;
        causticsLight.penumbra = 0.5;
        causticsLight.decay = 2;
        causticsLight.distance = 200;

        // Custom caustics map
        if (causticsTexture) {
            causticsLight.map = causticsTexture;
        }

        scene.add(causticsLight);
        scene.add(causticsLight.target);
    }

    // ============================================
    // UPDATE LOOP
    // ============================================
    function update(deltaTime, elapsedTime) {
        if (!isActive) return;

        time += deltaTime;

        // Update shader uniforms
        if (volumetricFogMaterial) {
            volumetricFogMaterial.uniforms.time.value = elapsedTime;
        }

        if (godRayMaterial) {
            godRayMaterial.uniforms.time.value = elapsedTime;

            // Animate god ray mesh
            if (godRayMesh) {
                godRayMesh.rotation.y = elapsedTime * 0.05;
                godRayMesh.material.uniforms.intensity.value =
                    CONFIG.godRayIntensity * (0.8 + Math.sin(elapsedTime * 0.5) * 0.2);
            }
        }

        // Animate caustics
        if (causticsTexture) {
            causticsTexture.offset.x += deltaTime * CONFIG.causticsSpeed * 0.1;
            causticsTexture.offset.y += deltaTime * CONFIG.causticsSpeed * 0.05;
        }

        // Pulse caustics light
        if (causticsLight) {
            causticsLight.intensity = CONFIG.causticsIntensity *
                (0.9 + Math.sin(elapsedTime * 2) * 0.1);
        }
    }

    // ============================================
    // CONFIGURATION
    // ============================================
    function setFogDensity(density) {
        CONFIG.fogDensity = density;
        if (volumetricFogMaterial) {
            volumetricFogMaterial.uniforms.fogDensity.value = density;
        }
    }

    function setFogColor(color) {
        CONFIG.fogColor.set(color);
        if (volumetricFogMaterial) {
            volumetricFogMaterial.uniforms.fogColor.value.set(color);
        }
    }

    function setGodRayIntensity(intensity) {
        CONFIG.godRayIntensity = intensity;
    }

    function setCausticsIntensity(intensity) {
        CONFIG.causticsIntensity = intensity;
        if (causticsLight) {
            causticsLight.intensity = intensity;
        }
    }

    function setLightDirection(direction) {
        if (volumetricFogMaterial) {
            volumetricFogMaterial.uniforms.lightDirection.value.copy(direction);
        }
    }

    // ============================================
    // DISPOSAL
    // ============================================
    function dispose() {
        isActive = false;

        volumetricFogMaterial?.dispose();
        godRayMaterial?.dispose();
        causticsMaterial?.dispose();
        noiseTexture?.dispose();
        causticsTexture?.dispose();

        if (volumetricMesh) {
            volumetricMesh.geometry.dispose();
        }
        if (godRayMesh) {
            godRayMesh.geometry.dispose();
        }
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        init,
        update,
        dispose,
        setFogDensity,
        setFogColor,
        setGodRayIntensity,
        setCausticsIntensity,
        setLightDirection,
        getConfig: () => ({ ...CONFIG }),
        isActive: () => isActive
    };
})();

// Global access
window.VolumetricSystem = VolumetricSystem;
