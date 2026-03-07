// The Deep / The Abyss - 2026 Underwater Rendering Upgrade
// Volumetric absorption, bioluminescence, caustics, depth pressure effects

export class UnderwaterRenderUpgrade2026 {
    constructor(game) {
        this.game = game;
        this.initialized = false;

        // Depth state
        this.currentDepth = 0;       // meters below surface
        this.maxSafeDepth = 6000;
        this.crushDepth = 8000;

        // Underwater light absorption (Beer-Lambert)
        this.absorptionCoefficients = {
            r: 0.45,   // red absorbs fastest
            g: 0.07,   // green absorbs moderately
            b: 0.02    // blue persists deepest
        };
        this.surfaceLight = 1.0;
        this.ambientFloor = 0.002;
        this.godRayIntensity = 1.0;
        this.visibilityRange = 80;

        // Caustics
        this.causticMaterial = null;
        this.causticMesh = null;
        this.causticScale = 12.0;
        this.causticIntensity = 1.0;
        this.causticDepthFade = 200; // fully faded by this depth

        // Bioluminescent creatures
        this.bioCreatures = [];
        this.bioPlankton = null;
        this.planktonCount = 3000;
        this.planktonDisturbance = [];
        this.maxBioCreatures = 60;

        // Particle systems
        this.siltSystem = null;
        this.bubbleSystem = null;
        this.marineSnowSystem = null;
        this.debrisParticles = [];
        this.currentDirection = new THREE.Vector3(0.3, 0, 0.1);
        this.currentStrength = 0.5;

        // Pressure / depth effects
        this.depthEffects = {
            distortion: 0,
            desaturation: 0,
            vignetteStrength: 0,
            tunnelVision: 0,
            crackOverlay: null,
            heartbeatRate: 0
        };
        this.crackOverlay = null;
        this.vignettePass = null;

        // Underwater fog volume
        this.fogUniforms = null;
        this.underwaterFogColor = new THREE.Color(0x0a1a2f);
        this.turbidityZones = [];
        this.thermalVents = [];

        // God rays
        this.godRayMesh = null;
        this.godRayMaterial = null;

        // Render targets
        this.depthColorRT = null;
        this.volumetricRT = null;
    }

    async initialize() {
        console.log('[UnderwaterRenderUpgrade2026] Initializing...');

        this.setupRenderTargets();
        this.initUnderwaterFog();
        this.initGodRays();
        this.initCaustics();
        this.initBioluminescence();
        this.initSiltSystem();
        this.initBubbleSystem();
        this.initMarineSnow();
        this.initDepthEffects();
        this.initThermalVents();

        this.initialized = true;
        console.log('[UnderwaterRenderUpgrade2026] ✅ Rendering upgrade ready');
        return true;
    }

    setupRenderTargets() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.depthColorRT = new THREE.WebGLRenderTarget(w, h, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType
        });

        this.volumetricRT = new THREE.WebGLRenderTarget(w / 2, h / 2, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType
        });
    }

    // ── Underwater Fog & Light Absorption ───────────────────────────────

    initUnderwaterFog() {
        this.fogUniforms = {
            uDepth: { value: 0 },
            uAbsorptionR: { value: this.absorptionCoefficients.r },
            uAbsorptionG: { value: this.absorptionCoefficients.g },
            uAbsorptionB: { value: this.absorptionCoefficients.b },
            uFogColor: { value: this.underwaterFogColor },
            uFogDensity: { value: 0.015 },
            uVisibility: { value: this.visibilityRange },
            uTime: { value: 0 }
        };

        // Full-screen fog quad applied as post-process overlay
        const fogGeo = new THREE.PlaneGeometry(2, 2);
        const fogMat = new THREE.ShaderMaterial({
            uniforms: this.fogUniforms,
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uDepth;
                uniform float uAbsorptionR;
                uniform float uAbsorptionG;
                uniform float uAbsorptionB;
                uniform vec3 uFogColor;
                uniform float uFogDensity;
                uniform float uVisibility;
                uniform float uTime;
                varying vec2 vUv;

                void main() {
                    // Beer-Lambert absorption per channel
                    float depthFactor = uDepth * 0.01;
                    float transmittanceR = exp(-uAbsorptionR * depthFactor);
                    float transmittanceG = exp(-uAbsorptionG * depthFactor);
                    float transmittanceB = exp(-uAbsorptionB * depthFactor);

                    vec3 absorption = vec3(transmittanceR, transmittanceG, transmittanceB);

                    // Exponential distance fog
                    float fogFactor = 1.0 - exp(-uFogDensity * depthFactor * 2.0);
                    fogFactor = clamp(fogFactor, 0.0, 0.95);

                    // Deep water becomes black
                    vec3 deepColor = mix(uFogColor, vec3(0.0), smoothstep(3000.0, 8000.0, uDepth));
                    vec3 color = mix(absorption, deepColor, fogFactor);

                    gl_FragColor = vec4(color, fogFactor);
                }
            `,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });

        this.underwaterFogQuad = new THREE.Mesh(fogGeo, fogMat);
        this.underwaterFogQuad.frustumCulled = false;
        this.underwaterFogQuad.renderOrder = 999;
    }

    // ── God Rays (volumetric light shafts from surface) ─────────────────

    initGodRays() {
        const rayCount = 12;
        const rays = [];

        for (let i = 0; i < rayCount; i++) {
            const width = 20 + Math.random() * 40;
            const height = 300 + Math.random() * 200;
            const geo = new THREE.PlaneGeometry(width, height);
            const mat = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uIntensity: { value: 1.0 },
                    uDepth: { value: 0 },
                    uColor: { value: new THREE.Color(0.6, 0.85, 0.95) }
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vWorldPos;
                    void main() {
                        vUv = uv;
                        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float uTime;
                    uniform float uIntensity;
                    uniform float uDepth;
                    uniform vec3 uColor;
                    varying vec2 vUv;
                    varying vec3 vWorldPos;

                    void main() {
                        // Fade at edges and bottom
                        float edgeFade = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
                        float bottomFade = smoothstep(0.0, 0.4, vUv.y);

                        // Animated wavering
                        float waver = sin(vUv.y * 8.0 + uTime * 0.5) * 0.15 + 0.85;
                        float shimmer = sin(vWorldPos.x * 0.1 + uTime * 0.3) * 0.1 + 0.9;

                        // Depth attenuation: god rays fade with depth
                        float depthAtten = exp(-uDepth * 0.005);

                        float alpha = edgeFade * bottomFade * waver * shimmer * uIntensity * depthAtten;
                        alpha = clamp(alpha * 0.3, 0.0, 0.4);

                        gl_FragColor = vec4(uColor, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false
            });

            const ray = new THREE.Mesh(geo, mat);
            // Distribute rays across the scene above
            ray.position.set(
                (Math.random() - 0.5) * 400,
                100 + Math.random() * 100,
                (Math.random() - 0.5) * 400
            );
            ray.rotation.set(
                -0.1 + Math.random() * 0.2,
                Math.random() * Math.PI * 2,
                -0.05 + Math.random() * 0.1
            );
            ray.userData.baseY = ray.position.y;
            ray.userData.swaySpeed = 0.2 + Math.random() * 0.3;
            ray.userData.swayAmount = 5 + Math.random() * 10;
            rays.push(ray);

            if (this.game.renderer) {
                this.game.renderer.add(ray);
            }
        }

        this.godRays = rays;
    }

    // ── Caustic Patterns on Seafloor ────────────────────────────────────

    initCaustics() {
        this.causticMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uIntensity: { value: this.causticIntensity },
                uScale: { value: this.causticScale },
                uDepth: { value: 0 },
                uDepthFade: { value: this.causticDepthFade }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vWorldPos;
                void main() {
                    vUv = uv;
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uIntensity;
                uniform float uScale;
                uniform float uDepth;
                uniform float uDepthFade;
                varying vec2 vUv;
                varying vec3 vWorldPos;

                vec2 hash22(vec2 p) {
                    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
                    p3 += dot(p3, p3.yzx + 33.33);
                    return fract((p3.xx + p3.yz) * p3.zy);
                }

                float voronoiCaustic(vec2 uv, float time) {
                    vec2 p = uv * uScale;
                    float minDist = 1.0;
                    float secondMin = 1.0;
                    for (int y = -1; y <= 1; y++) {
                        for (int x = -1; x <= 1; x++) {
                            vec2 neighbor = vec2(float(x), float(y));
                            vec2 cell = floor(p) + neighbor;
                            vec2 point = hash22(cell);
                            point = 0.5 + 0.5 * sin(time + 6.2831 * point);
                            float d = length(p - cell - point);
                            if (d < minDist) {
                                secondMin = minDist;
                                minDist = d;
                            } else if (d < secondMin) {
                                secondMin = d;
                            }
                        }
                    }
                    return smoothstep(0.0, 0.06, secondMin - minDist);
                }

                void main() {
                    vec2 worldUV = vWorldPos.xz * 0.005;
                    float c1 = voronoiCaustic(worldUV, uTime * 0.6);
                    float c2 = voronoiCaustic(worldUV * 1.5 + 0.33, uTime * 0.4 + 3.0);
                    float caustic = (c1 + c2) * 0.5;

                    // Depth attenuation
                    float depthAtten = 1.0 - smoothstep(0.0, uDepthFade, uDepth);

                    float alpha = caustic * uIntensity * depthAtten;
                    vec3 color = vec3(0.15, 0.65, 0.75) * alpha;

                    gl_FragColor = vec4(color, alpha * 0.5);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Large projected plane at seafloor
        const geo = new THREE.PlaneGeometry(2000, 2000);
        geo.rotateX(-Math.PI / 2);
        this.causticMesh = new THREE.Mesh(geo, this.causticMaterial);
        this.causticMesh.renderOrder = 1;
        this.causticMesh.name = 'underwater_caustics';

        if (this.game.renderer) {
            this.game.renderer.add(this.causticMesh);
        }
    }

    updateCaustics(time, surfaceWaves) {
        if (!this.causticMaterial) return;

        this.causticMaterial.uniforms.uTime.value = time;
        this.causticMaterial.uniforms.uDepth.value = this.currentDepth;

        // Adjust caustic intensity based on surface waves if provided
        if (surfaceWaves) {
            const waveIntensity = surfaceWaves.amplitude || 1.0;
            this.causticMaterial.uniforms.uIntensity.value = this.causticIntensity * waveIntensity;
            // Adjust scale for choppier waves
            this.causticMaterial.uniforms.uScale.value =
                this.causticScale * (1.0 + (surfaceWaves.choppiness || 0) * 0.3);
        }

        // Position caustics below camera
        const cam = this.game.camera?.camera || this.game.renderer?.camera;
        if (cam) {
            this.causticMesh.position.x = Math.round(cam.position.x / 50) * 50;
            this.causticMesh.position.y = cam.position.y - 20;
            this.causticMesh.position.z = Math.round(cam.position.z / 50) * 50;
        }
    }

    // ── Bioluminescent Creatures ────────────────────────────────────────

    initBioluminescence() {
        // Plankton particle cloud
        const positions = new Float32Array(this.planktonCount * 3);
        const colors = new Float32Array(this.planktonCount * 3);
        const sizes = new Float32Array(this.planktonCount);
        const phases = new Float32Array(this.planktonCount);

        for (let i = 0; i < this.planktonCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 500;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 500;

            // Blue-green bioluminescent colors
            const hue = 0.45 + Math.random() * 0.15;
            const col = new THREE.Color().setHSL(hue, 0.8, 0.5);
            colors[i * 3] = col.r;
            colors[i * 3 + 1] = col.g;
            colors[i * 3 + 2] = col.b;

            sizes[i] = 0.3 + Math.random() * 0.7;
            phases[i] = Math.random() * Math.PI * 2;
        }

        const planktonGeo = new THREE.BufferGeometry();
        planktonGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        planktonGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        planktonGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        planktonGeo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

        const planktonMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uBrightness: { value: 0.5 },
                uDepth: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                attribute float phase;
                uniform float uTime;
                uniform float uBrightness;
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vColor = color;
                    // Pulsing glow
                    float pulse = sin(uTime * 1.5 + phase) * 0.5 + 0.5;
                    vAlpha = pulse * uBrightness;

                    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (200.0 / -mvPos.z) * (0.5 + pulse * 0.5);
                    gl_Position = projectionMatrix * mvPos;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    float glow = smoothstep(0.5, 0.0, dist);
                    gl_FragColor = vec4(vColor * glow, vAlpha * glow);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        });

        this.bioPlankton = {
            points: new THREE.Points(planktonGeo, planktonMat),
            phases
        };
        this.bioPlankton.points.frustumCulled = false;
        this.bioPlankton.points.name = 'bioluminescent_plankton';

        if (this.game.renderer) {
            this.game.renderer.add(this.bioPlankton.points);
        }
    }

    addBioluminescentCreature(type, position) {
        if (this.bioCreatures.length >= this.maxBioCreatures) return null;

        const pos = position instanceof THREE.Vector3
            ? position
            : new THREE.Vector3(position.x, position.y, position.z);

        const creature = { type, group: new THREE.Group(), lights: [], meshes: [] };
        creature.group.position.copy(pos);

        switch (type) {
            case 'anglerfish': {
                // Body (dark sphere)
                const bodyGeo = new THREE.SphereGeometry(2, 12, 8);
                const bodyMat = new THREE.MeshStandardMaterial({
                    color: 0x1a1a2e,
                    roughness: 0.9,
                    metalness: 0.1
                });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                creature.group.add(body);
                creature.meshes.push(body);

                // Lure light
                const lureLight = new THREE.PointLight(0x44ffaa, 3.0, 25);
                lureLight.position.set(0, 2.5, 2);
                creature.group.add(lureLight);
                creature.lights.push(lureLight);

                // Lure glow sphere
                const lureGeo = new THREE.SphereGeometry(0.3, 8, 8);
                const lureMat = new THREE.MeshBasicMaterial({
                    color: 0x44ffaa,
                    transparent: true,
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending
                });
                const lure = new THREE.Mesh(lureGeo, lureMat);
                lure.position.copy(lureLight.position);
                creature.group.add(lure);
                creature.meshes.push(lure);

                creature.attractionRadius = 25;
                creature.pulseSpeed = 1.2;
                break;
            }

            case 'jellyfish': {
                // Bell (translucent dome)
                const bellGeo = new THREE.SphereGeometry(1.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
                const bellMat = new THREE.ShaderMaterial({
                    uniforms: {
                        uTime: { value: 0 },
                        uColor: { value: new THREE.Color(0.3, 0.5, 1.0) },
                        uEmission: { value: new THREE.Color(0.1, 0.3, 0.8) }
                    },
                    vertexShader: `
                        varying vec3 vNormal;
                        varying vec3 vWorldPos;
                        void main() {
                            vNormal = normalize(normalMatrix * normal);
                            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform float uTime;
                        uniform vec3 uColor;
                        uniform vec3 uEmission;
                        varying vec3 vNormal;
                        varying vec3 vWorldPos;

                        void main() {
                            vec3 V = normalize(cameraPosition - vWorldPos);
                            float rim = 1.0 - max(dot(V, vNormal), 0.0);
                            rim = pow(rim, 3.0);

                            float pulse = sin(uTime * 2.0) * 0.3 + 0.7;
                            vec3 color = uColor * 0.3 + uEmission * pulse * 0.5;
                            color += vec3(0.4, 0.6, 1.0) * rim * 0.5;

                            float alpha = 0.3 + rim * 0.4 + pulse * 0.1;
                            gl_FragColor = vec4(color, alpha);
                        }
                    `,
                    transparent: true,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                const bell = new THREE.Mesh(bellGeo, bellMat);
                creature.group.add(bell);
                creature.meshes.push(bell);

                // Inner glow light
                const jellyLight = new THREE.PointLight(0x3366ff, 2.0, 15);
                creature.group.add(jellyLight);
                creature.lights.push(jellyLight);

                creature.pulseSpeed = 2.0;
                creature.bobSpeed = 0.8;
                creature.bobAmount = 1.0;
                break;
            }

            default: {
                // Generic glowing orb
                const orbGeo = new THREE.SphereGeometry(0.8, 8, 8);
                const orbMat = new THREE.MeshBasicMaterial({
                    color: 0x22aaff,
                    transparent: true,
                    opacity: 0.7,
                    blending: THREE.AdditiveBlending
                });
                const orb = new THREE.Mesh(orbGeo, orbMat);
                creature.group.add(orb);
                creature.meshes.push(orb);

                const orbLight = new THREE.PointLight(0x22aaff, 1.5, 12);
                creature.group.add(orbLight);
                creature.lights.push(orbLight);

                creature.pulseSpeed = 1.5;
                break;
            }
        }

        if (this.game.renderer) {
            this.game.renderer.add(creature.group);
        }

        this.bioCreatures.push(creature);
        return creature;
    }

    disturbSediment(position, intensity) {
        const pos = position instanceof THREE.Vector3
            ? position
            : new THREE.Vector3(position.x, position.y, position.z);

        // Record disturbance for plankton wake effect
        this.planktonDisturbance.push({
            position: pos.clone(),
            intensity: Math.min(1, intensity),
            radius: 5 + intensity * 10,
            life: 2.0 + intensity * 2.0,
            age: 0
        });

        // Kick up silt particles
        if (!this.siltSystem) return;

        const posAttr = this.siltSystem.points.geometry.attributes.position;
        const positions = posAttr.array;
        const vels = this.siltSystem.velocities;
        const count = Math.min(80, Math.floor(intensity * 50));

        let kicked = 0;
        for (let i = 0; i < positions.length / 3 && kicked < count; i++) {
            const i3 = i * 3;
            const dx = positions[i3] - pos.x;
            const dy = positions[i3 + 1] - pos.y;
            const dz = positions[i3 + 2] - pos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < 15) {
                const force = (1 - dist / 15) * intensity;
                vels[i3] += (dx / (dist + 0.1)) * force * 3;
                vels[i3 + 1] += force * 5;
                vels[i3 + 2] += (dz / (dist + 0.1)) * force * 3;
                kicked++;
            }
        }
    }

    // ── Underwater Particle Systems ─────────────────────────────────────

    initSiltSystem() {
        const count = 2000;
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 300;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
            velocities[i * 3] = 0;
            velocities[i * 3 + 1] = 0;
            velocities[i * 3 + 2] = 0;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0x887766,
            size: 0.4,
            transparent: true,
            opacity: 0.3,
            depthWrite: false,
            sizeAttenuation: true
        });

        this.siltSystem = {
            points: new THREE.Points(geo, mat),
            velocities,
            count
        };
        this.siltSystem.points.frustumCulled = false;
        this.siltSystem.points.name = 'silt_particles';

        if (this.game.renderer) {
            this.game.renderer.add(this.siltSystem.points);
        }
    }

    initBubbleSystem() {
        const count = 500;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const speeds = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 150;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
            sizes[i] = 0.2 + Math.random() * 0.8;
            speeds[i] = 1 + Math.random() * 3;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                varying float vSize;
                void main() {
                    vSize = size;
                    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (150.0 / -mvPos.z);
                    gl_Position = projectionMatrix * mvPos;
                }
            `,
            fragmentShader: `
                varying float vSize;

                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;

                    // Bubble: bright rim, transparent center
                    float rim = smoothstep(0.3, 0.5, dist);
                    float inner = smoothstep(0.5, 0.2, dist) * 0.15;
                    float alpha = rim * 0.5 + inner;

                    vec3 color = vec3(0.7, 0.85, 1.0);
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.bubbleSystem = {
            points: new THREE.Points(geo, mat),
            speeds,
            count
        };
        this.bubbleSystem.points.frustumCulled = false;
        this.bubbleSystem.points.name = 'bubbles';

        if (this.game.renderer) {
            this.game.renderer.add(this.bubbleSystem.points);
        }
    }

    initMarineSnow() {
        const count = 1500;
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 400;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
            velocities[i * 3] = (Math.random() - 0.5) * 0.2;
            velocities[i * 3 + 1] = -(0.2 + Math.random() * 0.5);
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xccccaa,
            size: 0.3,
            transparent: true,
            opacity: 0.2,
            depthWrite: false,
            sizeAttenuation: true
        });

        this.marineSnowSystem = {
            points: new THREE.Points(geo, mat),
            velocities,
            count
        };
        this.marineSnowSystem.points.frustumCulled = false;
        this.marineSnowSystem.points.name = 'marine_snow';

        if (this.game.renderer) {
            this.game.renderer.add(this.marineSnowSystem.points);
        }
    }

    // ── Pressure / Depth Effects ────────────────────────────────────────

    initDepthEffects() {
        // Crack overlay (screen-space quad, hidden initially)
        const crackGeo = new THREE.PlaneGeometry(2, 2);
        const crackMat = new THREE.ShaderMaterial({
            uniforms: {
                uIntensity: { value: 0 },
                uTime: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uIntensity;
                uniform float uTime;
                varying vec2 vUv;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }

                float crackPattern(vec2 uv) {
                    // Radial cracks from edges and corners
                    float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
                    float cornerDist = min(
                        min(length(uv), length(uv - vec2(1.0, 0.0))),
                        min(length(uv - vec2(0.0, 1.0)), length(uv - vec2(1.0)))
                    );

                    float crack = 0.0;
                    for (float i = 0.0; i < 5.0; i++) {
                        vec2 p = uv * (3.0 + i * 2.0) + vec2(i * 1.7, i * 2.3);
                        float h = hash(floor(p));
                        float d = length(fract(p) - 0.5);
                        crack += smoothstep(0.02, 0.0, abs(d - 0.3 * h)) * 0.2;
                    }

                    // Stronger cracks at edges
                    crack *= smoothstep(0.3, 0.0, edgeDist) + smoothstep(0.4, 0.0, cornerDist) * 0.5;
                    return crack;
                }

                void main() {
                    if (uIntensity < 0.01) discard;
                    float crack = crackPattern(vUv) * uIntensity;
                    float pulse = sin(uTime * 3.0) * 0.1 + 0.9;
                    vec3 color = mix(vec3(0.5, 0.5, 0.6), vec3(1.0, 1.0, 1.0), crack);
                    gl_FragColor = vec4(color, crack * pulse * 0.8);
                }
            `,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
        this.crackOverlay = new THREE.Mesh(crackGeo, crackMat);
        this.crackOverlay.frustumCulled = false;
        this.crackOverlay.renderOrder = 1000;
        this.crackOverlay.visible = false;

        // Vignette + tunnel vision overlay
        const vignGeo = new THREE.PlaneGeometry(2, 2);
        const vignMat = new THREE.ShaderMaterial({
            uniforms: {
                uVignetteStrength: { value: 0 },
                uTunnelVision: { value: 0 },
                uPulse: { value: 0 },
                uDesaturation: { value: 0 },
                uDistortion: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uVignetteStrength;
                uniform float uTunnelVision;
                uniform float uPulse;
                uniform float uDesaturation;
                uniform float uDistortion;
                varying vec2 vUv;

                void main() {
                    vec2 uv = vUv;

                    // Lens distortion (barrel)
                    if (uDistortion > 0.01) {
                        vec2 centered = uv - 0.5;
                        float r2 = dot(centered, centered);
                        uv = 0.5 + centered * (1.0 + uDistortion * r2);
                    }

                    // Vignette
                    float dist = length(uv - 0.5) * 2.0;

                    // Tunnel vision narrows the clear area
                    float tunnelRadius = 1.0 - uTunnelVision * 0.6;
                    float vignette = smoothstep(tunnelRadius, tunnelRadius - 0.3, dist);
                    float vignetteAlpha = (1.0 - vignette) * uVignetteStrength;

                    // Heartbeat pulse
                    float pulse = uPulse * (1.0 - vignette) * 0.3;

                    float alpha = max(vignetteAlpha, pulse);
                    vec3 color = vec3(0.0, 0.0, 0.02);

                    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.95));
                }
            `,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
        this.vignettePass = new THREE.Mesh(vignGeo, vignMat);
        this.vignettePass.frustumCulled = false;
        this.vignettePass.renderOrder = 1001;
    }

    // ── Thermal Vents ───────────────────────────────────────────────────

    initThermalVents() {
        // Pre-create a reusable vent material
        this.ventMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uIntensity: { value: 1.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vWorldPos;
                void main() {
                    vUv = uv;
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uIntensity;
                varying vec2 vUv;
                varying vec3 vWorldPos;

                float noise(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }

                void main() {
                    vec2 uv = vUv;
                    // Rising heat distortion
                    uv.x += sin(uv.y * 10.0 + uTime * 2.0) * 0.05;
                    float n = noise(uv * 8.0 + uTime * 0.5);

                    float fade = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
                    float edgeFade = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);

                    // Warm glow color
                    vec3 color = mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.6, 0.2), n);
                    float alpha = n * fade * edgeFade * uIntensity * 0.4;

                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
    }

    addThermalVent(position, intensity) {
        const pos = position instanceof THREE.Vector3
            ? position
            : new THREE.Vector3(position.x, position.y, position.z);

        const ventGroup = new THREE.Group();
        ventGroup.position.copy(pos);

        // Shimmer plane
        const shimmerGeo = new THREE.PlaneGeometry(6, 20);
        const shimmerMat = this.ventMaterial.clone();
        shimmerMat.uniforms.uIntensity.value = intensity || 1.0;
        const shimmer = new THREE.Mesh(shimmerGeo, shimmerMat);
        shimmer.position.y = 10;
        ventGroup.add(shimmer);

        // Glow light
        const light = new THREE.PointLight(0xff4400, intensity * 2, 30);
        light.position.y = 2;
        ventGroup.add(light);

        if (this.game.renderer) {
            this.game.renderer.add(ventGroup);
        }

        const vent = { group: ventGroup, material: shimmerMat, light, intensity: intensity || 1.0 };
        this.thermalVents.push(vent);
        return vent;
    }

    // ── Depth Control ───────────────────────────────────────────────────

    setDepth(meters) {
        this.currentDepth = Math.max(0, meters);
        const depth = this.currentDepth;

        // Update fog absorption
        if (this.fogUniforms) {
            this.fogUniforms.uDepth.value = depth;
            // Increase fog density with depth
            this.fogUniforms.uFogDensity.value = 0.015 + depth * 0.000005;
            this.fogUniforms.uVisibility.value = Math.max(5, this.visibilityRange - depth * 0.01);
        }

        // Update scene fog directly
        if (this.game.renderer?.scene?.fog) {
            const fogDensity = 0.001 + depth * 0.0000008;
            this.game.renderer.scene.fog.density = fogDensity;

            // Shift fog color with depth
            const depthT = Math.min(1, depth / 6000);
            const fogColor = new THREE.Color().lerpColors(
                new THREE.Color(0x0a3050),
                new THREE.Color(0x000005),
                depthT
            );
            this.game.renderer.scene.fog.color.copy(fogColor);
            if (this.game.renderer.scene.background?.isColor) {
                this.game.renderer.scene.background.copy(fogColor);
            }
        }

        // Caustic depth fade
        if (this.causticMaterial) {
            this.causticMaterial.uniforms.uDepth.value = depth;
        }

        // God ray depth attenuation
        if (this.godRays) {
            for (const ray of this.godRays) {
                ray.material.uniforms.uDepth.value = depth;
            }
        }

        // Plankton brightness increases in deep/dark zones
        if (this.bioPlankton) {
            const bioIntensity = depth > 500 ? Math.min(1, (depth - 500) / 3000) : 0.1;
            this.bioPlankton.points.material.uniforms.uBrightness.value = bioIntensity;
        }

        // Pressure / depth effects on player
        this.updatePressureEffects(depth);
    }

    updatePressureEffects(depth) {
        const safeRatio = depth / this.maxSafeDepth;
        const crushRatio = Math.max(0, (depth - this.maxSafeDepth) / (this.crushDepth - this.maxSafeDepth));

        // Lens distortion increases with depth
        this.depthEffects.distortion = Math.min(0.3, safeRatio * 0.15 + crushRatio * 0.15);

        // Color desaturation at extreme depth
        this.depthEffects.desaturation = Math.min(1, safeRatio * 0.3 + crushRatio * 0.7);

        // Vignette
        this.depthEffects.vignetteStrength = Math.min(1, safeRatio * 0.3 + crushRatio * 0.5);

        // Tunnel vision at crush depth
        this.depthEffects.tunnelVision = crushRatio * 0.8;

        // Screen cracking at dangerous depth
        const crackIntensity = crushRatio > 0 ? crushRatio : 0;
        if (this.crackOverlay) {
            this.crackOverlay.visible = crackIntensity > 0.01;
            this.crackOverlay.material.uniforms.uIntensity.value = crackIntensity;
        }

        // Heartbeat rate
        this.depthEffects.heartbeatRate = crushRatio > 0 ? 1.5 + crushRatio * 2.5 : 0;

        // Apply vignette uniforms
        if (this.vignettePass) {
            const u = this.vignettePass.material.uniforms;
            u.uVignetteStrength.value = this.depthEffects.vignetteStrength;
            u.uTunnelVision.value = this.depthEffects.tunnelVision;
            u.uDistortion.value = this.depthEffects.distortion;
            u.uDesaturation.value = this.depthEffects.desaturation;
        }
    }

    // ── Main Render Hooks ───────────────────────────────────────────────

    beforeRender(camera, deltaTime) {
        if (!this.initialized) return;

        const time = performance.now() * 0.001;

        // Update god rays
        this.updateGodRays(time, camera);

        // Update bioluminescent creatures
        this.updateBioCreatures(time, deltaTime);

        // Update plankton
        this.updatePlankton(time, deltaTime, camera);

        // Update particle systems
        this.updateSilt(deltaTime, camera);
        this.updateBubbles(deltaTime, camera);
        this.updateMarineSnow(deltaTime, camera);

        // Update disturbance zones
        this.updateDisturbances(deltaTime);

        // Update thermal vents
        for (const vent of this.thermalVents) {
            vent.material.uniforms.uTime.value = time;
            // Flickering light
            vent.light.intensity = vent.intensity * 2 * (0.8 + Math.sin(time * 3) * 0.2);
        }

        // Update pressure effect overlays
        if (this.crackOverlay) {
            this.crackOverlay.material.uniforms.uTime.value = time;
        }
        if (this.vignettePass && this.depthEffects.heartbeatRate > 0) {
            const pulse = Math.pow(Math.sin(time * this.depthEffects.heartbeatRate * Math.PI), 8);
            this.vignettePass.material.uniforms.uPulse.value = pulse;
        }

        // Update underwater fog
        if (this.fogUniforms) {
            this.fogUniforms.uTime.value = time;
        }
    }

    afterRender() {
        // Post-render compositing pass could go here
    }

    updateGodRays(time, camera) {
        if (!this.godRays) return;

        for (const ray of this.godRays) {
            ray.material.uniforms.uTime.value = time;
            ray.material.uniforms.uIntensity.value = this.godRayIntensity;

            // Gentle sway
            ray.position.y = ray.userData.baseY
                + Math.sin(time * ray.userData.swaySpeed) * ray.userData.swayAmount;

            // Face camera (billboard on Y axis)
            if (camera) {
                ray.lookAt(camera.position.x, ray.position.y, camera.position.z);
            }
        }
    }

    updateBioCreatures(time, deltaTime) {
        for (const creature of this.bioCreatures) {
            const pulse = Math.sin(time * (creature.pulseSpeed || 1.5));

            // Pulse lights
            for (const light of creature.lights) {
                light.intensity = (2.0 + pulse) * 0.5;
            }

            // Jellyfish bobbing
            if (creature.bobSpeed) {
                creature.group.position.y += Math.sin(time * creature.bobSpeed)
                    * creature.bobAmount * deltaTime;
            }

            // Update shader time for jellyfish bells
            for (const mesh of creature.meshes) {
                if (mesh.material.uniforms?.uTime) {
                    mesh.material.uniforms.uTime.value = time;
                }
            }
        }
    }

    updatePlankton(time, deltaTime, camera) {
        if (!this.bioPlankton) return;

        this.bioPlankton.points.material.uniforms.uTime.value = time;
        this.bioPlankton.points.material.uniforms.uDepth.value = this.currentDepth;

        // Keep plankton centered on camera
        if (camera) {
            this.bioPlankton.points.position.set(
                camera.position.x,
                camera.position.y,
                camera.position.z
            );
        }

        // Bioluminescent wake: brighten plankton near disturbances
        const posAttr = this.bioPlankton.points.geometry.attributes.position;
        const positions = posAttr.array;

        for (const dist of this.planktonDisturbance) {
            const worldDistPos = dist.position;
            for (let i = 0; i < positions.length; i += 3) {
                const dx = positions[i] + (this.bioPlankton.points.position.x - worldDistPos.x);
                const dy = positions[i + 1] + (this.bioPlankton.points.position.y - worldDistPos.y);
                const dz = positions[i + 2] + (this.bioPlankton.points.position.z - worldDistPos.z);
                const d = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (d < dist.radius) {
                    const force = (1 - d / dist.radius) * dist.intensity * deltaTime;
                    positions[i] += (dx / (d + 0.1)) * force * 2;
                    positions[i + 2] += (dz / (d + 0.1)) * force * 2;
                }
            }
        }
        posAttr.needsUpdate = true;
    }

    updateSilt(deltaTime, camera) {
        if (!this.siltSystem) return;

        const posAttr = this.siltSystem.points.geometry.attributes.position;
        const positions = posAttr.array;
        const vels = this.siltSystem.velocities;

        // Center silt on camera
        if (camera) {
            this.siltSystem.points.position.copy(camera.position);
        }

        for (let i = 0; i < this.siltSystem.count; i++) {
            const i3 = i * 3;

            // Apply current
            vels[i3] += this.currentDirection.x * this.currentStrength * deltaTime * 0.5;
            vels[i3 + 1] += this.currentDirection.y * this.currentStrength * deltaTime * 0.5;
            vels[i3 + 2] += this.currentDirection.z * this.currentStrength * deltaTime * 0.5;

            // Gravity settling
            vels[i3 + 1] -= 0.3 * deltaTime;

            // Drag
            vels[i3] *= 0.98;
            vels[i3 + 1] *= 0.98;
            vels[i3 + 2] *= 0.98;

            positions[i3] += vels[i3] * deltaTime;
            positions[i3 + 1] += vels[i3 + 1] * deltaTime;
            positions[i3 + 2] += vels[i3 + 2] * deltaTime;

            // Respawn if drifted too far
            const dist = Math.abs(positions[i3]) + Math.abs(positions[i3 + 1]) + Math.abs(positions[i3 + 2]);
            if (dist > 200) {
                positions[i3] = (Math.random() - 0.5) * 300;
                positions[i3 + 1] = (Math.random() - 0.5) * 100;
                positions[i3 + 2] = (Math.random() - 0.5) * 300;
                vels[i3] = 0;
                vels[i3 + 1] = 0;
                vels[i3 + 2] = 0;
            }
        }
        posAttr.needsUpdate = true;
    }

    updateBubbles(deltaTime, camera) {
        if (!this.bubbleSystem) return;

        const posAttr = this.bubbleSystem.points.geometry.attributes.position;
        const positions = posAttr.array;

        if (camera) {
            this.bubbleSystem.points.position.copy(camera.position);
        }

        this.bubbleSystem.points.material.uniforms.uTime.value += deltaTime;

        for (let i = 0; i < this.bubbleSystem.count; i++) {
            const i3 = i * 3;
            const speed = this.bubbleSystem.speeds[i];

            // Rise
            positions[i3 + 1] += speed * deltaTime;

            // Wobble sideways
            positions[i3] += Math.sin(positions[i3 + 1] * 0.5 + i) * 0.02;
            positions[i3 + 2] += Math.cos(positions[i3 + 1] * 0.3 + i * 1.3) * 0.02;

            // Current drift
            positions[i3] += this.currentDirection.x * this.currentStrength * deltaTime * 0.3;
            positions[i3 + 2] += this.currentDirection.z * this.currentStrength * deltaTime * 0.3;

            // Reset at top
            if (positions[i3 + 1] > 80) {
                positions[i3] = (Math.random() - 0.5) * 200;
                positions[i3 + 1] = -75;
                positions[i3 + 2] = (Math.random() - 0.5) * 200;
            }
        }
        posAttr.needsUpdate = true;
    }

    updateMarineSnow(deltaTime, camera) {
        if (!this.marineSnowSystem) return;

        const posAttr = this.marineSnowSystem.points.geometry.attributes.position;
        const positions = posAttr.array;
        const vels = this.marineSnowSystem.velocities;

        if (camera) {
            this.marineSnowSystem.points.position.copy(camera.position);
        }

        for (let i = 0; i < this.marineSnowSystem.count; i++) {
            const i3 = i * 3;

            positions[i3] += (vels[i3] + this.currentDirection.x * this.currentStrength * 0.2) * deltaTime;
            positions[i3 + 1] += vels[i3 + 1] * deltaTime;
            positions[i3 + 2] += (vels[i3 + 2] + this.currentDirection.z * this.currentStrength * 0.2) * deltaTime;

            // Reset at bottom
            if (positions[i3 + 1] < -100) {
                positions[i3] = (Math.random() - 0.5) * 400;
                positions[i3 + 1] = 100;
                positions[i3 + 2] = (Math.random() - 0.5) * 400;
            }
        }
        posAttr.needsUpdate = true;
    }

    updateDisturbances(deltaTime) {
        for (let i = this.planktonDisturbance.length - 1; i >= 0; i--) {
            const d = this.planktonDisturbance[i];
            d.age += deltaTime;
            d.intensity *= 0.95;
            if (d.age >= d.life || d.intensity < 0.01) {
                this.planktonDisturbance.splice(i, 1);
            }
        }
    }

    // ── Disposal ────────────────────────────────────────────────────────

    dispose() {
        console.log('[UnderwaterRenderUpgrade2026] Disposing...');

        // God rays
        if (this.godRays) {
            for (const ray of this.godRays) {
                if (ray.parent) ray.parent.remove(ray);
                ray.geometry.dispose();
                ray.material.dispose();
            }
            this.godRays = [];
        }

        // Caustics
        if (this.causticMesh?.parent) this.causticMesh.parent.remove(this.causticMesh);
        if (this.causticMesh?.geometry) this.causticMesh.geometry.dispose();
        if (this.causticMaterial) this.causticMaterial.dispose();

        // Bioluminescent plankton
        if (this.bioPlankton) {
            if (this.bioPlankton.points.parent) {
                this.bioPlankton.points.parent.remove(this.bioPlankton.points);
            }
            this.bioPlankton.points.geometry.dispose();
            this.bioPlankton.points.material.dispose();
        }

        // Bio creatures
        for (const creature of this.bioCreatures) {
            if (creature.group.parent) creature.group.parent.remove(creature.group);
            for (const light of creature.lights) light.dispose();
            for (const mesh of creature.meshes) {
                mesh.geometry.dispose();
                if (mesh.material.dispose) mesh.material.dispose();
            }
        }
        this.bioCreatures = [];

        // Silt system
        if (this.siltSystem) {
            if (this.siltSystem.points.parent) this.siltSystem.points.parent.remove(this.siltSystem.points);
            this.siltSystem.points.geometry.dispose();
            this.siltSystem.points.material.dispose();
        }

        // Bubble system
        if (this.bubbleSystem) {
            if (this.bubbleSystem.points.parent) this.bubbleSystem.points.parent.remove(this.bubbleSystem.points);
            this.bubbleSystem.points.geometry.dispose();
            this.bubbleSystem.points.material.dispose();
        }

        // Marine snow
        if (this.marineSnowSystem) {
            if (this.marineSnowSystem.points.parent) this.marineSnowSystem.points.parent.remove(this.marineSnowSystem.points);
            this.marineSnowSystem.points.geometry.dispose();
            this.marineSnowSystem.points.material.dispose();
        }

        // Thermal vents
        for (const vent of this.thermalVents) {
            if (vent.group.parent) vent.group.parent.remove(vent.group);
            vent.material.dispose();
            vent.light.dispose();
        }
        this.thermalVents = [];

        // Depth effect overlays
        if (this.crackOverlay) {
            this.crackOverlay.geometry.dispose();
            this.crackOverlay.material.dispose();
        }
        if (this.vignettePass) {
            this.vignettePass.geometry.dispose();
            this.vignettePass.material.dispose();
        }
        if (this.underwaterFogQuad) {
            this.underwaterFogQuad.geometry.dispose();
            this.underwaterFogQuad.material.dispose();
        }

        // Render targets
        if (this.depthColorRT) this.depthColorRT.dispose();
        if (this.volumetricRT) this.volumetricRT.dispose();

        // Vent material template
        if (this.ventMaterial) this.ventMaterial.dispose();

        this.planktonDisturbance = [];
        this.turbidityZones = [];
        this.initialized = false;
        console.log('[UnderwaterRenderUpgrade2026] ✅ Disposed');
    }
}
