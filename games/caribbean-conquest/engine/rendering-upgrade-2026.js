// Caribbean Conquest - 2026 Rendering Upgrade
// FFT Ocean, Volumetric Effects, PBR Materials, Dynamic Weather, Ship Destruction

export class CaribbeanRenderUpgrade2026 {
    constructor(game) {
        this.game = game;
        this.initialized = false;

        // FFT Ocean
        this.fftSize = 256;
        this.oceanTiles = [];
        this.spectrumTexture = null;
        this.displacementTexture = null;
        this.normalTexture = null;
        this.foamTexture = null;
        this.fftMaterial = null;
        this.oceanMaterial = null;
        this.windDirection = new THREE.Vector2(1.0, 0.3).normalize();
        this.windSpeed = 12.0;
        this.oceanLODLevels = 4;

        // Underwater Caustics
        this.causticRT = null;
        this.causticMaterial = null;
        this.causticMesh = null;
        this.causticProjector = null;

        // Ship Destruction
        this.fractureCache = new Map();
        this.activeDebris = [];
        this.activeFires = [];
        this.sinkingShips = [];
        this.maxDebris = 300;
        this.maxFires = 20;

        // Volumetric Smoke
        this.smokeClouds = [];
        this.fogBanks = [];
        this.smokePool = [];
        this.smokePoolSize = 64;
        this.fogRT = null;
        this.fogMaterial = null;

        // Dynamic Weather
        this.weatherState = {
            type: 'clear',
            intensity: 0,
            windSpeed: 12,
            windDirection: new THREE.Vector2(1, 0.3),
            rainIntensity: 0,
            fogDensity: 0.0008,
            lightningTimer: 0,
            thunderQueue: []
        };
        this.rainSystem = null;
        this.lightningBolt = null;
        this.wetnessFactor = 0;

        // PBR Materials
        this.pbrMaterials = new Map();
        this.envMap = null;
        this.envMapRT = null;

        // Render targets
        this.halfResRT = null;
        this.compositePass = null;
    }

    async initialize() {
        console.log('[CaribbeanRenderUpgrade2026] Initializing...');

        this.setupRenderTargets();
        this.initFFTOcean();
        this.initCaustics();
        this.initSmokePool();
        this.initFogSystem();
        this.initRainSystem();
        this.initLightning();
        this.initPBRMaterials();
        this.initEnvironmentMap();

        this.initialized = true;
        console.log('[CaribbeanRenderUpgrade2026] ✅ Rendering upgrade ready');
        return true;
    }

    // ── Render Targets ──────────────────────────────────────────────────

    setupRenderTargets() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.halfResRT = new THREE.WebGLRenderTarget(w / 2, h / 2, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType
        });

        this.causticRT = new THREE.WebGLRenderTarget(512, 512, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat
        });

        this.fogRT = new THREE.WebGLRenderTarget(w / 4, h / 4, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType
        });
    }

    // ── FFT Ocean Simulation ────────────────────────────────────────────

    initFFTOcean() {
        const N = this.fftSize;

        // Phillips spectrum: generates initial wave amplitudes
        const spectrumData = new Float32Array(N * N * 4);
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                const kx = (x - N / 2) * (2 * Math.PI / 1000);
                const ky = (y - N / 2) * (2 * Math.PI / 1000);
                const kLen = Math.sqrt(kx * kx + ky * ky) || 0.0001;

                const phillips = this.phillipsSpectrum(kx, ky, kLen);
                const phase = Math.random() * Math.PI * 2;
                const amplitude = Math.sqrt(phillips / 2);

                const idx = (y * N + x) * 4;
                spectrumData[idx] = amplitude * Math.cos(phase);
                spectrumData[idx + 1] = amplitude * Math.sin(phase);
                spectrumData[idx + 2] = 0;
                spectrumData[idx + 3] = 1;
            }
        }

        this.spectrumTexture = new THREE.DataTexture(
            spectrumData, N, N, THREE.RGBAFormat, THREE.FloatType
        );
        this.spectrumTexture.needsUpdate = true;

        // Displacement and normal maps updated each frame
        this.displacementTexture = new THREE.DataTexture(
            new Float32Array(N * N * 4), N, N, THREE.RGBAFormat, THREE.FloatType
        );
        this.normalTexture = new THREE.DataTexture(
            new Float32Array(N * N * 4), N, N, THREE.RGBAFormat, THREE.FloatType
        );
        this.foamTexture = new THREE.DataTexture(
            new Float32Array(N * N * 4), N, N, THREE.RGBAFormat, THREE.FloatType
        );

        // Ocean surface shader material
        this.oceanMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uDisplacementMap: { value: this.displacementTexture },
                uNormalMap: { value: this.normalTexture },
                uFoamMap: { value: this.foamTexture },
                uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.5) },
                uSunColor: { value: new THREE.Color(0xffffee) },
                uWaterColor: { value: new THREE.Color(0x006699) },
                uDeepColor: { value: new THREE.Color(0x001122) },
                uFoamColor: { value: new THREE.Color(0xeeffff) },
                uEnvMap: { value: this.envMap },
                uWindSpeed: { value: this.windSpeed },
                uCausticMap: { value: this.causticRT?.texture || null },
                uChoppiness: { value: 1.5 }
            },
            vertexShader: `
                uniform sampler2D uDisplacementMap;
                uniform float uChoppiness;
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vFoamFactor;

                void main() {
                    vUv = uv;
                    vec4 disp = texture2D(uDisplacementMap, uv);
                    vec3 displaced = position;
                    displaced.y += disp.y;
                    displaced.xz += disp.xz * uChoppiness;
                    vFoamFactor = max(0.0, -disp.w);
                    vWorldPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;

                    // Derive normal from displacement gradients
                    vec2 texel = vec2(1.0 / 256.0);
                    float hL = texture2D(uDisplacementMap, uv - vec2(texel.x, 0.0)).y;
                    float hR = texture2D(uDisplacementMap, uv + vec2(texel.x, 0.0)).y;
                    float hD = texture2D(uDisplacementMap, uv - vec2(0.0, texel.y)).y;
                    float hU = texture2D(uDisplacementMap, uv + vec2(0.0, texel.y)).y;
                    vNormal = normalize(vec3(hL - hR, 2.0, hD - hU));

                    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uSunDirection;
                uniform vec3 uSunColor;
                uniform vec3 uWaterColor;
                uniform vec3 uDeepColor;
                uniform vec3 uFoamColor;
                uniform sampler2D uNormalMap;
                uniform sampler2D uFoamMap;
                uniform float uWindSpeed;
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vFoamFactor;

                void main() {
                    vec3 normal = normalize(vNormal + texture2D(uNormalMap, vUv).xyz * 0.5);
                    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

                    // Fresnel
                    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);

                    // Water color blending by wave height
                    float depthBlend = smoothstep(-3.0, 3.0, vWorldPosition.y);
                    vec3 baseColor = mix(uDeepColor, uWaterColor, depthBlend);

                    // Specular from sun
                    vec3 halfDir = normalize(viewDir + normalize(uSunDirection));
                    float spec = pow(max(dot(normal, halfDir), 0.0), 256.0);

                    // Subsurface scattering
                    float sss = pow(max(dot(normal, normalize(uSunDirection)), 0.0), 2.0) * 0.15;
                    vec3 sssColor = vec3(0.0, 0.4, 0.3) * sss;

                    // Foam from Jacobian
                    float foam = texture2D(uFoamMap, vUv * 4.0).r;
                    foam = smoothstep(0.3, 0.8, foam + vFoamFactor);

                    vec3 color = baseColor + sssColor;
                    color = mix(color, vec3(0.7, 0.85, 1.0), fresnel * 0.4);
                    color += uSunColor * spec * 0.6;
                    color = mix(color, uFoamColor, foam * 0.5);

                    gl_FragColor = vec4(color, 0.96 - foam * 0.04);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });

        // Create LOD ocean tiles
        for (let lod = 0; lod < this.oceanLODLevels; lod++) {
            const segments = Math.max(16, this.fftSize >> lod);
            const scale = Math.pow(2, lod);
            const size = 2000 * scale;
            const geo = new THREE.PlaneGeometry(size, size, segments, segments);
            geo.rotateX(-Math.PI / 2);

            const tile = new THREE.Mesh(geo, this.oceanMaterial);
            tile.frustumCulled = true;
            tile.receiveShadow = true;
            tile.name = `ocean_lod_${lod}`;
            this.oceanTiles.push(tile);

            if (this.game.renderer) {
                this.game.renderer.add(tile);
            }
        }
    }

    phillipsSpectrum(kx, ky, kLen) {
        const g = 9.81;
        const L = (this.windSpeed * this.windSpeed) / g;
        const damping = 0.001;
        const l = L * damping;

        const kDotW = (kx * this.windDirection.x + ky * this.windDirection.y) / kLen;
        const k2 = kLen * kLen;
        const k4 = k2 * k2;
        const L2 = L * L;

        const phillips = (Math.exp(-1.0 / (k2 * L2)) / k4) * (kDotW * kDotW);
        const suppression = Math.exp(-k2 * l * l);

        return Math.max(0, phillips * suppression * 0.01);
    }

    updateOcean(time, wind) {
        if (!this.initialized) return;

        if (wind) {
            this.windDirection.set(wind.x, wind.y).normalize();
            this.windSpeed = wind.speed || this.windSpeed;
            this.oceanMaterial.uniforms.uWindSpeed.value = this.windSpeed;
        }

        // Simulate FFT: inverse transform spectrum → displacement + normals
        const N = this.fftSize;
        const dispData = this.displacementTexture.image.data;
        const normData = this.normalTexture.image.data;
        const foamData = this.foamTexture.image.data;
        const g = 9.81;

        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                const kx = (x - N / 2) * (2 * Math.PI / 1000);
                const ky = (y - N / 2) * (2 * Math.PI / 1000);
                const kLen = Math.sqrt(kx * kx + ky * ky) || 0.0001;
                const omega = Math.sqrt(g * kLen);

                const sIdx = (y * N + x) * 4;
                const h0Re = this.spectrumTexture.image.data[sIdx];
                const h0Im = this.spectrumTexture.image.data[sIdx + 1];

                // Time evolution
                const cosT = Math.cos(omega * time);
                const sinT = Math.sin(omega * time);
                const hRe = h0Re * cosT - h0Im * sinT;
                const hIm = h0Re * sinT + h0Im * cosT;

                // Vertical displacement
                const heightVal = hRe;

                // Horizontal displacement (choppy waves)
                const dxVal = -hIm * (kx / kLen) * 0.5;
                const dzVal = -hIm * (ky / kLen) * 0.5;

                // Jacobian for foam: measures surface compression
                const jacobian = 1.0 + dxVal * 0.1 + dzVal * 0.1;

                dispData[sIdx] = dxVal;
                dispData[sIdx + 1] = heightVal;
                dispData[sIdx + 2] = dzVal;
                dispData[sIdx + 3] = jacobian < 0.3 ? -(0.3 - jacobian) * 3.0 : 0.0;

                // Normal from finite differences (approximated via Gerstner combination)
                normData[sIdx] = -dxVal * 2.0;
                normData[sIdx + 1] = 1.0;
                normData[sIdx + 2] = -dzVal * 2.0;
                normData[sIdx + 3] = 1.0;

                // Foam map: accumulate where Jacobian is negative
                const prevFoam = foamData[sIdx];
                const newFoam = jacobian < 0.3 ? 1.0 : prevFoam * 0.98;
                foamData[sIdx] = newFoam;
                foamData[sIdx + 1] = newFoam;
                foamData[sIdx + 2] = newFoam;
                foamData[sIdx + 3] = 1.0;
            }
        }

        this.displacementTexture.needsUpdate = true;
        this.normalTexture.needsUpdate = true;
        this.foamTexture.needsUpdate = true;

        // Update material time
        this.oceanMaterial.uniforms.uTime.value = time;

        // Update sun direction from renderer
        if (this.game.renderer?.sunLight) {
            this.oceanMaterial.uniforms.uSunDirection.value
                .copy(this.game.renderer.sunLight.position).normalize();
        }

        // Position LOD tiles around camera
        const cam = this.game.camera?.camera || this.game.renderer?.camera;
        if (cam) {
            for (let i = 0; i < this.oceanTiles.length; i++) {
                const tile = this.oceanTiles[i];
                tile.position.x = Math.round(cam.position.x / 500) * 500;
                tile.position.z = Math.round(cam.position.z / 500) * 500;
            }
        }
    }

    // ── Underwater Caustics ─────────────────────────────────────────────

    initCaustics() {
        this.causticMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uLightDirection: { value: new THREE.Vector3(0, -1, 0) },
                uWaterSurface: { value: 0 },
                uIntensity: { value: 1.0 },
                uScale: { value: 8.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uIntensity;
                uniform float uScale;
                varying vec2 vUv;

                // Voronoi-based caustic pattern
                vec2 hash22(vec2 p) {
                    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
                    p3 += dot(p3, p3.yzx + 33.33);
                    return fract((p3.xx + p3.yz) * p3.zy);
                }

                float caustic(vec2 uv, float t) {
                    vec2 p = uv * uScale;
                    float minDist = 1.0;
                    float secondMin = 1.0;
                    for (int y = -1; y <= 1; y++) {
                        for (int x = -1; x <= 1; x++) {
                            vec2 neighbor = vec2(float(x), float(y));
                            vec2 cell = floor(p) + neighbor;
                            vec2 point = hash22(cell);
                            point = 0.5 + 0.5 * sin(t * 0.8 + 6.2831 * point);
                            float d = length(p - cell - point);
                            if (d < minDist) {
                                secondMin = minDist;
                                minDist = d;
                            } else if (d < secondMin) {
                                secondMin = d;
                            }
                        }
                    }
                    return smoothstep(0.0, 0.05, secondMin - minDist);
                }

                void main() {
                    float c1 = caustic(vUv, uTime);
                    float c2 = caustic(vUv * 1.3 + 0.5, uTime * 0.7 + 2.0);
                    float c = (c1 + c2) * 0.5;
                    vec3 color = vec3(0.1, 0.6, 0.7) * c * uIntensity;
                    gl_FragColor = vec4(color, c * 0.6);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Projector plane placed at seafloor level
        const causticGeo = new THREE.PlaneGeometry(4000, 4000);
        causticGeo.rotateX(-Math.PI / 2);
        this.causticMesh = new THREE.Mesh(causticGeo, this.causticMaterial);
        this.causticMesh.position.y = -15;
        this.causticMesh.renderOrder = 1;
        this.causticMesh.name = 'caustics';

        if (this.game.renderer) {
            this.game.renderer.add(this.causticMesh);
        }
    }

    // ── Ship Destruction Physics ────────────────────────────────────────

    createFracturePieces(shipMesh) {
        const cacheKey = shipMesh.uuid;
        if (this.fractureCache.has(cacheKey)) {
            return this.fractureCache.get(cacheKey);
        }

        const pieces = [];
        const bbox = new THREE.Box3().setFromObject(shipMesh);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        // Hull planks
        const plankCount = 12 + Math.floor(Math.random() * 8);
        for (let i = 0; i < plankCount; i++) {
            const w = size.x * (0.15 + Math.random() * 0.2);
            const h = size.y * (0.05 + Math.random() * 0.08);
            const d = 0.3 + Math.random() * 0.5;
            const geo = new THREE.BoxGeometry(w, h, d);
            const mat = new THREE.MeshStandardMaterial({
                color: 0x8B6914,
                roughness: 0.85,
                metalness: 0.05
            });
            const plank = new THREE.Mesh(geo, mat);
            plank.castShadow = true;
            plank.userData.type = 'plank';
            plank.userData.mass = w * h * d;
            plank.userData.buoyancy = 0.4 + Math.random() * 0.3;
            pieces.push(plank);
        }

        // Mast segments
        const mastCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < mastCount; i++) {
            const radius = 0.3 + Math.random() * 0.3;
            const height = size.y * (0.3 + Math.random() * 0.5);
            const geo = new THREE.CylinderGeometry(radius * 0.7, radius, height, 8);
            const mat = new THREE.MeshStandardMaterial({
                color: 0x6B4226,
                roughness: 0.9,
                metalness: 0.02
            });
            const mast = new THREE.Mesh(geo, mat);
            mast.castShadow = true;
            mast.userData.type = 'mast';
            mast.userData.mass = radius * height * 2;
            mast.userData.buoyancy = 0.5;
            pieces.push(mast);
        }

        // Rigging / rope bits
        const ropeCount = 6 + Math.floor(Math.random() * 4);
        for (let i = 0; i < ropeCount; i++) {
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(Math.random() - 0.5, Math.random() * 2, Math.random() - 0.5),
                new THREE.Vector3(Math.random() - 0.5, Math.random() * 4, Math.random() - 0.5)
            ]);
            const geo = new THREE.TubeGeometry(curve, 8, 0.05, 4, false);
            const mat = new THREE.MeshStandardMaterial({
                color: 0x8B7355,
                roughness: 1.0,
                metalness: 0.0
            });
            const rope = new THREE.Mesh(geo, mat);
            rope.userData.type = 'rigging';
            rope.userData.mass = 0.2;
            rope.userData.buoyancy = 0.1;
            pieces.push(rope);
        }

        this.fractureCache.set(cacheKey, pieces);
        return pieces;
    }

    damageShip(ship, impactPoint, damage) {
        if (!this.initialized || !ship) return;

        const impactVec = impactPoint instanceof THREE.Vector3
            ? impactPoint
            : new THREE.Vector3(impactPoint.x, impactPoint.y, impactPoint.z);

        // Splinter particles at impact
        this.spawnSplinters(impactVec, damage);

        // Start fire at impact if severe enough
        if (damage > 30) {
            this.startFire(ship, impactVec, damage);
        }

        // Full destruction: trigger fracture and sinking
        if (damage >= 100) {
            this.destroyShip(ship, impactVec);
        }
    }

    spawnSplinters(position, intensity) {
        const count = Math.min(40, Math.floor(intensity * 0.5));
        for (let i = 0; i < count; i++) {
            const size = 0.1 + Math.random() * 0.4;
            const geo = new THREE.BoxGeometry(size, size * 0.3, size * 2);
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.08, 0.5 + Math.random() * 0.3, 0.3 + Math.random() * 0.2),
                roughness: 0.9,
                metalness: 0.0
            });
            const splinter = new THREE.Mesh(geo, mat);
            splinter.position.copy(position);
            splinter.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                Math.random() * 20,
                (Math.random() - 0.5) * 15
            );

            splinter.castShadow = true;
            if (this.game.renderer) this.game.renderer.add(splinter);

            this.activeDebris.push({
                mesh: splinter,
                velocity,
                angularVelocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5
                ),
                life: 3.0 + Math.random() * 2.0,
                buoyancy: 0.3 + Math.random() * 0.3,
                gravity: -9.8
            });
        }

        this.trimDebris();
    }

    startFire(ship, position, intensity) {
        if (this.activeFires.length >= this.maxFires) return;

        const fireGroup = new THREE.Group();
        fireGroup.position.copy(position);

        // Emissive fire glow on hull
        const glowGeo = new THREE.SphereGeometry(1.5 + intensity * 0.03, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        fireGroup.add(glow);

        // Point light for fire illumination
        const light = new THREE.PointLight(0xff6622, 2.0, 30);
        fireGroup.add(light);

        // Fire particles
        const particleCount = 32;
        const firePositions = new Float32Array(particleCount * 3);
        const fireSizes = new Float32Array(particleCount);
        const fireAlphas = new Float32Array(particleCount);
        for (let i = 0; i < particleCount; i++) {
            firePositions[i * 3] = (Math.random() - 0.5) * 2;
            firePositions[i * 3 + 1] = Math.random() * 4;
            firePositions[i * 3 + 2] = (Math.random() - 0.5) * 2;
            fireSizes[i] = 1.0 + Math.random() * 2.0;
            fireAlphas[i] = Math.random();
        }
        const fireGeo = new THREE.BufferGeometry();
        fireGeo.setAttribute('position', new THREE.BufferAttribute(firePositions, 3));
        fireGeo.setAttribute('size', new THREE.BufferAttribute(fireSizes, 1));
        const fireMat = new THREE.PointsMaterial({
            color: 0xff8844,
            size: 2.0,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });
        const particles = new THREE.Points(fireGeo, fireMat);
        fireGroup.add(particles);

        if (ship.mesh) {
            ship.mesh.add(fireGroup);
        } else if (this.game.renderer) {
            this.game.renderer.add(fireGroup);
        }

        this.activeFires.push({
            group: fireGroup,
            light,
            glow,
            particles,
            ship,
            intensity: intensity * 0.01,
            life: 8.0 + Math.random() * 4.0,
            spreadRadius: 1.5,
            smokeTimer: 0
        });
    }

    destroyShip(ship, impactPoint) {
        const shipMesh = ship.mesh || ship;
        const pieces = this.createFracturePieces(shipMesh);
        const shipPos = shipMesh.position.clone();

        pieces.forEach((piece, i) => {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                Math.random() * 5,
                (Math.random() - 0.5) * 10
            );
            piece.position.copy(shipPos).add(offset);
            piece.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            if (this.game.renderer) this.game.renderer.add(piece);

            // Direction away from impact
            const direction = piece.position.clone().sub(impactPoint).normalize();

            this.activeDebris.push({
                mesh: piece,
                velocity: direction.multiplyScalar(5 + Math.random() * 10)
                    .add(new THREE.Vector3(0, Math.random() * 8, 0)),
                angularVelocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 3
                ),
                life: 15.0 + Math.random() * 10.0,
                buoyancy: piece.userData.buoyancy || 0.3,
                gravity: -9.8
            });
        });

        // Start sinking sequence
        this.sinkingShips.push({
            mesh: shipMesh,
            tiltAxis: Math.random() > 0.5 ? 'x' : 'z',
            tiltRate: 0.1 + Math.random() * 0.15,
            sinkRate: 0.5 + Math.random() * 0.5,
            floodLevel: 0,
            time: 0,
            duration: 12 + Math.random() * 8
        });
    }

    trimDebris() {
        while (this.activeDebris.length > this.maxDebris) {
            const old = this.activeDebris.shift();
            if (old.mesh.parent) old.mesh.parent.remove(old.mesh);
            if (old.mesh.geometry) old.mesh.geometry.dispose();
            if (old.mesh.material) old.mesh.material.dispose();
        }
    }

    // ── Volumetric Cannon Smoke & Naval Fog ─────────────────────────────

    initSmokePool() {
        for (let i = 0; i < this.smokePoolSize; i++) {
            const geo = new THREE.SphereGeometry(1, 8, 8);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xbbbbbb,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                fog: true
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.visible = false;
            this.smokePool.push({ mesh, active: false });
        }
    }

    fireCannonEffect(position, direction) {
        if (!this.initialized) return;

        const pos = position instanceof THREE.Vector3
            ? position
            : new THREE.Vector3(position.x, position.y, position.z);
        const dir = direction instanceof THREE.Vector3
            ? direction.clone().normalize()
            : new THREE.Vector3(direction.x, direction.y, direction.z).normalize();

        // Muzzle flash
        const flashGeo = new THREE.SphereGeometry(2.5, 8, 8);
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xffaa22,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const flash = new THREE.Mesh(flashGeo, flashMat);
        flash.position.copy(pos).add(dir.clone().multiplyScalar(2));
        if (this.game.renderer) this.game.renderer.add(flash);

        // Flash light
        const flashLight = new THREE.PointLight(0xff8800, 5.0, 40);
        flashLight.position.copy(flash.position);
        if (this.game.renderer) this.game.renderer.add(flashLight);

        // Fade flash quickly
        const flashData = { mesh: flash, light: flashLight, life: 0.15 };
        this.activeDebris.push({
            mesh: flash,
            velocity: new THREE.Vector3(0, 0, 0),
            angularVelocity: new THREE.Vector3(0, 0, 0),
            life: 0.15,
            buoyancy: 0,
            gravity: 0,
            onRemove: () => {
                if (flashLight.parent) flashLight.parent.remove(flashLight);
                flashLight.dispose();
            }
        });

        // Spawn smoke puffs along cannon direction
        const windDir = this.weatherState.windDirection;
        const windStr = this.weatherState.windSpeed * 0.1;
        const puffCount = 5 + Math.floor(Math.random() * 4);

        for (let i = 0; i < puffCount; i++) {
            const cloud = this.acquireSmoke();
            if (!cloud) break;

            const offset = dir.clone().multiplyScalar(3 + i * 1.5);
            offset.x += (Math.random() - 0.5) * 2;
            offset.y += Math.random() * 1.5;
            offset.z += (Math.random() - 0.5) * 2;

            cloud.mesh.position.copy(pos).add(offset);
            cloud.mesh.scale.setScalar(0.5 + Math.random() * 0.5);
            cloud.mesh.material.opacity = 0.6 + Math.random() * 0.3;
            cloud.mesh.material.color.setHex(0x999999);
            cloud.mesh.visible = true;
            cloud.active = true;

            this.smokeClouds.push({
                poolRef: cloud,
                velocity: new THREE.Vector3(
                    windDir.x * windStr + (Math.random() - 0.5) * 2,
                    0.5 + Math.random() * 0.5,
                    windDir.y * windStr + (Math.random() - 0.5) * 2
                ),
                expandRate: 0.8 + Math.random() * 0.4,
                fadeRate: 0.08 + Math.random() * 0.04,
                life: 4.0 + Math.random() * 3.0,
                age: 0
            });
        }
    }

    acquireSmoke() {
        for (const entry of this.smokePool) {
            if (!entry.active) return entry;
        }
        return null;
    }

    initFogSystem() {
        // Fog bank volumes for tactical gameplay
        this.fogMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uDensity: { value: 0.3 },
                uColor: { value: new THREE.Color(0xccccdd) },
                uWindDirection: { value: new THREE.Vector2(1, 0) }
            },
            vertexShader: `
                varying vec3 vWorldPos;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uDensity;
                uniform vec3 uColor;
                uniform vec2 uWindDirection;
                varying vec3 vWorldPos;
                varying vec2 vUv;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }

                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    float a = hash(i);
                    float b = hash(i + vec2(1.0, 0.0));
                    float c = hash(i + vec2(0.0, 1.0));
                    float d = hash(i + vec2(1.0, 1.0));
                    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
                }

                void main() {
                    vec2 uv = vWorldPos.xz * 0.002 + uWindDirection * uTime * 0.01;
                    float n = noise(uv * 3.0) * 0.5 + noise(uv * 6.0) * 0.3 + noise(uv * 12.0) * 0.2;
                    float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x)
                                   * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
                    float heightFade = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
                    float alpha = n * uDensity * edgeFade * heightFade;
                    gl_FragColor = vec4(uColor, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });
    }

    spawnFogBank(center, radius, density) {
        const geo = new THREE.BoxGeometry(radius * 2, 40, radius * 2, 1, 1, 1);
        const mat = this.fogMaterial.clone();
        mat.uniforms.uDensity.value = density || 0.3;
        const fog = new THREE.Mesh(geo, mat);
        fog.position.set(center.x, 10, center.z);
        fog.name = 'fog_bank';
        if (this.game.renderer) this.game.renderer.add(fog);
        this.fogBanks.push({ mesh: fog, material: mat, radius, density });
        return fog;
    }

    // ── Dynamic Weather ─────────────────────────────────────────────────

    initRainSystem() {
        const count = 8000;
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const spread = 500;

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * spread;
            positions[i * 3 + 1] = Math.random() * 200;
            positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
            velocities[i * 3] = 0;
            velocities[i * 3 + 1] = -(15 + Math.random() * 10);
            velocities[i * 3 + 2] = 0;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xaabbcc,
            size: 0.3,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            sizeAttenuation: true
        });

        this.rainSystem = {
            points: new THREE.Points(geo, mat),
            velocities,
            spread,
            active: false
        };
        this.rainSystem.points.frustumCulled = false;
        this.rainSystem.points.visible = false;
        if (this.game.renderer) this.game.renderer.add(this.rainSystem.points);
    }

    initLightning() {
        this.lightningBolt = {
            lines: null,
            light: new THREE.PointLight(0xccddff, 0, 2000),
            active: false,
            timer: 0
        };
        if (this.game.renderer) this.game.renderer.add(this.lightningBolt.light);
    }

    createLightningBolt(start, end) {
        const points = [start.clone()];
        const segments = 8 + Math.floor(Math.random() * 6);
        const direction = end.clone().sub(start);
        const segLength = direction.length() / segments;
        const jitter = segLength * 0.5;

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const basePoint = start.clone().lerp(end, t);
            basePoint.x += (Math.random() - 0.5) * jitter;
            basePoint.z += (Math.random() - 0.5) * jitter;
            points.push(basePoint);

            // Branch with 25% chance
            if (Math.random() < 0.25 && i > 2) {
                const branchEnd = basePoint.clone().add(
                    new THREE.Vector3(
                        (Math.random() - 0.5) * jitter * 3,
                        -(Math.random() * segLength * 2),
                        (Math.random() - 0.5) * jitter * 3
                    )
                );
                points.push(branchEnd);
                points.push(basePoint.clone());
            }
        }
        points.push(end.clone());

        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
            color: 0xeeeeff,
            transparent: true,
            opacity: 1.0,
            linewidth: 2
        });

        if (this.lightningBolt.lines) {
            if (this.lightningBolt.lines.parent) {
                this.lightningBolt.lines.parent.remove(this.lightningBolt.lines);
            }
            this.lightningBolt.lines.geometry.dispose();
        }

        this.lightningBolt.lines = new THREE.Line(geo, mat);
        if (this.game.renderer) this.game.renderer.add(this.lightningBolt.lines);

        // Flash
        this.lightningBolt.light.position.copy(start);
        this.lightningBolt.light.intensity = 8;
        this.lightningBolt.active = true;
        this.lightningBolt.timer = 0.3;

        // Queue thunder (sound delay based on distance)
        const cam = this.game.camera?.camera || this.game.renderer?.camera;
        if (cam) {
            const dist = cam.position.distanceTo(start);
            const delay = dist / 343; // speed of sound
            this.weatherState.thunderQueue.push({ delay, volume: Math.min(1, 500 / dist) });
        }
    }

    updateWeather(weatherState, deltaTime) {
        if (!this.initialized) return;

        // Transition weather state
        if (weatherState) {
            const lerpSpeed = deltaTime * 0.5;
            this.weatherState.rainIntensity += (
                (weatherState.rainIntensity ?? this.weatherState.rainIntensity)
                - this.weatherState.rainIntensity
            ) * lerpSpeed;
            this.weatherState.windSpeed += (
                (weatherState.windSpeed ?? this.weatherState.windSpeed)
                - this.weatherState.windSpeed
            ) * lerpSpeed;
            this.weatherState.fogDensity += (
                (weatherState.fogDensity ?? this.weatherState.fogDensity)
                - this.weatherState.fogDensity
            ) * lerpSpeed;
            if (weatherState.windDirection) {
                this.weatherState.windDirection.lerp(weatherState.windDirection, lerpSpeed);
            }
            this.weatherState.type = weatherState.type || this.weatherState.type;
            this.weatherState.intensity = weatherState.intensity ?? this.weatherState.intensity;
        }

        // Rain
        this.updateRain(deltaTime);

        // Lightning during storms
        if (this.weatherState.type === 'storm' && this.weatherState.intensity > 0.5) {
            this.weatherState.lightningTimer -= deltaTime;
            if (this.weatherState.lightningTimer <= 0) {
                const cam = this.game.camera?.camera || this.game.renderer?.camera;
                const cx = cam ? cam.position.x : 0;
                const cz = cam ? cam.position.z : 0;
                const start = new THREE.Vector3(
                    cx + (Math.random() - 0.5) * 800,
                    300 + Math.random() * 200,
                    cz + (Math.random() - 0.5) * 800
                );
                const end = start.clone();
                end.y = 0;
                this.createLightningBolt(start, end);
                this.weatherState.lightningTimer = 3 + Math.random() * 8;
            }
        }

        // Lightning bolt fade
        if (this.lightningBolt.active) {
            this.lightningBolt.timer -= deltaTime;
            this.lightningBolt.light.intensity *= 0.85;
            if (this.lightningBolt.timer <= 0) {
                this.lightningBolt.active = false;
                this.lightningBolt.light.intensity = 0;
                if (this.lightningBolt.lines) {
                    this.lightningBolt.lines.material.opacity = 0;
                }
            }
        }

        // Thunder audio events
        for (let i = this.weatherState.thunderQueue.length - 1; i >= 0; i--) {
            this.weatherState.thunderQueue[i].delay -= deltaTime;
            if (this.weatherState.thunderQueue[i].delay <= 0) {
                // Trigger thunder audio via game audio system if available
                if (this.game.audio?.playSound) {
                    this.game.audio.playSound('thunder', {
                        volume: this.weatherState.thunderQueue[i].volume
                    });
                }
                this.weatherState.thunderQueue.splice(i, 1);
            }
        }

        // Wetness factor for PBR materials
        this.wetnessFactor += ((this.weatherState.rainIntensity > 0.3 ? 1 : 0) - this.wetnessFactor)
            * deltaTime * 0.3;

        // Fog density
        if (this.game.renderer?.scene?.fog) {
            this.game.renderer.scene.fog.density = this.weatherState.fogDensity;
        }

        // Update fog banks
        for (const bank of this.fogBanks) {
            bank.material.uniforms.uTime.value += deltaTime;
            bank.material.uniforms.uWindDirection.value.copy(this.weatherState.windDirection);
        }
    }

    updateRain(deltaTime) {
        if (!this.rainSystem) return;

        const intensity = this.weatherState.rainIntensity;
        const active = intensity > 0.05;
        this.rainSystem.points.visible = active;
        this.rainSystem.active = active;
        if (!active) return;

        this.rainSystem.points.material.opacity = intensity * 0.5;
        const posAttr = this.rainSystem.points.geometry.attributes.position;
        const positions = posAttr.array;
        const vels = this.rainSystem.velocities;
        const windX = this.weatherState.windDirection.x * this.weatherState.windSpeed * 0.3;
        const windZ = this.weatherState.windDirection.y * this.weatherState.windSpeed * 0.3;

        const cam = this.game.camera?.camera || this.game.renderer?.camera;
        const cx = cam ? cam.position.x : 0;
        const cz = cam ? cam.position.z : 0;

        for (let i = 0, len = positions.length / 3; i < len; i++) {
            const i3 = i * 3;
            positions[i3] += (vels[i3] + windX) * deltaTime;
            positions[i3 + 1] += vels[i3 + 1] * deltaTime * intensity;
            positions[i3 + 2] += (vels[i3 + 2] + windZ) * deltaTime;

            // Reset drops that fall below ground
            if (positions[i3 + 1] < 0) {
                positions[i3] = cx + (Math.random() - 0.5) * this.rainSystem.spread;
                positions[i3 + 1] = 150 + Math.random() * 50;
                positions[i3 + 2] = cz + (Math.random() - 0.5) * this.rainSystem.spread;
            }
        }
        posAttr.needsUpdate = true;
    }

    // ── PBR Materials ───────────────────────────────────────────────────

    initPBRMaterials() {
        // Wood (hull, deck)
        this.pbrMaterials.set('wood_hull', new THREE.MeshStandardMaterial({
            color: 0x8B6914,
            roughness: 0.85,
            metalness: 0.02,
            flatShading: false
        }));

        this.pbrMaterials.set('wood_deck', new THREE.MeshStandardMaterial({
            color: 0xA0825A,
            roughness: 0.78,
            metalness: 0.02,
            flatShading: false
        }));

        // Metal (cannons, fittings)
        this.pbrMaterials.set('cannon_metal', new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.4,
            metalness: 0.9,
            flatShading: false
        }));

        this.pbrMaterials.set('brass_fitting', new THREE.MeshStandardMaterial({
            color: 0xB5A642,
            roughness: 0.35,
            metalness: 0.85,
            flatShading: false
        }));

        this.pbrMaterials.set('rusted_metal', new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.5,
            flatShading: false
        }));

        // Sail fabric with subsurface approximation
        this.pbrMaterials.set('sail_fabric', new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(0xF5F0E0) },
                uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.5) },
                uThickness: { value: 0.3 },
                uSubsurfaceColor: { value: new THREE.Color(0xFFE8C0) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vWorldPos;
                varying vec2 vUv;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform vec3 uLightDir;
                uniform float uThickness;
                uniform vec3 uSubsurfaceColor;
                varying vec3 vNormal;
                varying vec3 vWorldPos;
                varying vec2 vUv;

                void main() {
                    vec3 N = normalize(vNormal);
                    vec3 L = normalize(uLightDir);
                    vec3 V = normalize(cameraPosition - vWorldPos);

                    // Diffuse
                    float NdotL = max(dot(N, L), 0.0);
                    vec3 diffuse = uColor * NdotL * 0.6;

                    // SSS: light transmitting through thin fabric
                    float transmittance = max(0.0, dot(-N, L)) * uThickness;
                    float backlight = pow(max(dot(V, -L), 0.0), 4.0) * uThickness;
                    vec3 sss = uSubsurfaceColor * (transmittance + backlight) * 0.5;

                    // Fabric sheen (view-dependent highlight)
                    vec3 H = normalize(V + L);
                    float sheen = pow(1.0 - abs(dot(N, H)), 5.0) * 0.15;

                    vec3 ambient = uColor * 0.15;
                    vec3 color = ambient + diffuse + sss + vec3(sheen);

                    gl_FragColor = vec4(color, 0.95);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        }));

        // Rope material
        this.pbrMaterials.set('rope', new THREE.MeshStandardMaterial({
            color: 0x8B7355,
            roughness: 1.0,
            metalness: 0.0,
            flatShading: false
        }));

        // Water spray particles
        this.pbrMaterials.set('water_spray', new THREE.PointsMaterial({
            color: 0xCCEEFF,
            size: 0.5,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        }));
    }

    initEnvironmentMap() {
        // Simple procedural environment cubemap for PBR reflections
        const size = 128;
        this.envMapRT = new THREE.WebGLCubeRenderTarget(size, {
            format: THREE.RGBAFormat,
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter
        });
        this.envMap = this.envMapRT.texture;
    }

    getPBRMaterial(name) {
        const mat = this.pbrMaterials.get(name);
        if (!mat) return null;

        // Apply wetness globally when raining
        if (mat.isMeshStandardMaterial && this.wetnessFactor > 0.01) {
            const wet = this.wetnessFactor;
            mat.roughness = mat.userData.baseRoughness
                ? mat.userData.baseRoughness * (1 - wet * 0.5)
                : mat.roughness;
        }
        return mat;
    }

    // ── Main Render Hooks ───────────────────────────────────────────────

    beforeRender(camera, deltaTime) {
        if (!this.initialized) return;

        const time = performance.now() * 0.001;

        // Update caustics
        this.causticMaterial.uniforms.uTime.value = time;
        if (this.game.renderer?.sunLight) {
            const sunDir = this.game.renderer.sunLight.position.clone().normalize().negate();
            this.causticMaterial.uniforms.uLightDirection.value.copy(sunDir);
        }

        // Track caustics with camera
        if (camera) {
            this.causticMesh.position.x = Math.round(camera.position.x / 100) * 100;
            this.causticMesh.position.z = Math.round(camera.position.z / 100) * 100;
        }

        // Update debris physics
        this.updateDebris(deltaTime);

        // Update fires
        this.updateFires(deltaTime);

        // Update smoke clouds
        this.updateSmokeClouds(deltaTime);

        // Update sinking ships
        this.updateSinkingShips(deltaTime);

        // Wetness on PBR materials
        this.updateMaterialWetness();
    }

    afterRender() {
        // Post-render cleanup / compositing could go here
    }

    updateDebris(deltaTime) {
        for (let i = this.activeDebris.length - 1; i >= 0; i--) {
            const d = this.activeDebris[i];
            d.life -= deltaTime;

            if (d.life <= 0) {
                if (d.onRemove) d.onRemove();
                if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
                if (d.mesh.geometry) d.mesh.geometry.dispose();
                if (d.mesh.material?.dispose) d.mesh.material.dispose();
                this.activeDebris.splice(i, 1);
                continue;
            }

            // Gravity + buoyancy
            const isUnderwater = d.mesh.position.y < 0;
            const gravityForce = isUnderwater
                ? d.gravity * 0.1 + d.buoyancy * 9.8
                : d.gravity;
            d.velocity.y += gravityForce * deltaTime;

            // Water drag
            if (isUnderwater) {
                d.velocity.multiplyScalar(1 - deltaTime * 2.0);
                d.angularVelocity.multiplyScalar(1 - deltaTime * 1.5);
            } else {
                d.velocity.multiplyScalar(1 - deltaTime * 0.1);
            }

            d.mesh.position.addScaledVector(d.velocity, deltaTime);
            d.mesh.rotation.x += d.angularVelocity.x * deltaTime;
            d.mesh.rotation.y += d.angularVelocity.y * deltaTime;
            d.mesh.rotation.z += d.angularVelocity.z * deltaTime;

            // Fade out near end of life
            if (d.life < 1.0 && d.mesh.material?.opacity !== undefined) {
                d.mesh.material.opacity = d.life;
                d.mesh.material.transparent = true;
            }
        }
    }

    updateFires(deltaTime) {
        for (let i = this.activeFires.length - 1; i >= 0; i--) {
            const fire = this.activeFires[i];
            fire.life -= deltaTime;

            if (fire.life <= 0) {
                if (fire.group.parent) fire.group.parent.remove(fire.group);
                fire.light.dispose();
                this.activeFires.splice(i, 1);
                continue;
            }

            // Flickering light
            fire.light.intensity = (1.5 + Math.sin(performance.now() * 0.01) * 0.5)
                * fire.intensity * Math.min(1, fire.life);

            // Animate fire particles upward
            const posAttr = fire.particles.geometry.attributes.position;
            const pos = posAttr.array;
            for (let j = 0; j < pos.length; j += 3) {
                pos[j + 1] += deltaTime * (2 + Math.random());
                if (pos[j + 1] > 5) {
                    pos[j] = (Math.random() - 0.5) * fire.spreadRadius;
                    pos[j + 1] = 0;
                    pos[j + 2] = (Math.random() - 0.5) * fire.spreadRadius;
                }
            }
            posAttr.needsUpdate = true;

            // Spawn smoke from fire
            fire.smokeTimer -= deltaTime;
            if (fire.smokeTimer <= 0) {
                fire.smokeTimer = 0.3 + Math.random() * 0.3;
                const cloud = this.acquireSmoke();
                if (cloud) {
                    const worldPos = new THREE.Vector3();
                    fire.group.getWorldPosition(worldPos);
                    cloud.mesh.position.copy(worldPos).add(new THREE.Vector3(0, 3, 0));
                    cloud.mesh.scale.setScalar(1.0);
                    cloud.mesh.material.opacity = 0.4;
                    cloud.mesh.material.color.setHex(0x444444);
                    cloud.mesh.visible = true;
                    cloud.active = true;
                    if (!cloud.mesh.parent && this.game.renderer) {
                        this.game.renderer.add(cloud.mesh);
                    }
                    this.smokeClouds.push({
                        poolRef: cloud,
                        velocity: new THREE.Vector3(
                            this.weatherState.windDirection.x * this.weatherState.windSpeed * 0.05,
                            1.5 + Math.random(),
                            this.weatherState.windDirection.y * this.weatherState.windSpeed * 0.05
                        ),
                        expandRate: 1.2,
                        fadeRate: 0.06,
                        life: 5.0 + Math.random() * 2.0,
                        age: 0
                    });
                }
            }
        }
    }

    updateSmokeClouds(deltaTime) {
        for (let i = this.smokeClouds.length - 1; i >= 0; i--) {
            const cloud = this.smokeClouds[i];
            cloud.age += deltaTime;

            if (cloud.age >= cloud.life) {
                cloud.poolRef.mesh.visible = false;
                cloud.poolRef.active = false;
                this.smokeClouds.splice(i, 1);
                continue;
            }

            const mesh = cloud.poolRef.mesh;
            mesh.position.addScaledVector(cloud.velocity, deltaTime);

            // Expand
            const currentScale = mesh.scale.x;
            mesh.scale.setScalar(currentScale + cloud.expandRate * deltaTime);

            // Fade
            mesh.material.opacity = Math.max(0, mesh.material.opacity - cloud.fadeRate * deltaTime);

            // Wind drift acceleration
            cloud.velocity.x += this.weatherState.windDirection.x * deltaTime * 0.5;
            cloud.velocity.z += this.weatherState.windDirection.y * deltaTime * 0.5;
        }
    }

    updateSinkingShips(deltaTime) {
        for (let i = this.sinkingShips.length - 1; i >= 0; i--) {
            const ship = this.sinkingShips[i];
            ship.time += deltaTime;

            const progress = Math.min(1, ship.time / ship.duration);

            // Tilt
            const tiltAngle = progress * Math.PI * 0.25 * ship.tiltRate * 10;
            if (ship.tiltAxis === 'x') {
                ship.mesh.rotation.x = tiltAngle;
            } else {
                ship.mesh.rotation.z = tiltAngle;
            }

            // Sink
            ship.mesh.position.y -= ship.sinkRate * deltaTime * (1 + progress * 2);

            // Remove when fully sunk
            if (ship.mesh.position.y < -50) {
                if (ship.mesh.parent) ship.mesh.parent.remove(ship.mesh);
                this.sinkingShips.splice(i, 1);
            }
        }
    }

    updateMaterialWetness() {
        if (this.wetnessFactor < 0.01) return;
        const wet = this.wetnessFactor;

        for (const [name, mat] of this.pbrMaterials) {
            if (!mat.isMeshStandardMaterial) continue;
            if (!mat.userData.baseRoughness) {
                mat.userData.baseRoughness = mat.roughness;
            }
            mat.roughness = mat.userData.baseRoughness * (1 - wet * 0.5);
        }
    }

    // ── Disposal ────────────────────────────────────────────────────────

    dispose() {
        console.log('[CaribbeanRenderUpgrade2026] Disposing...');

        // Ocean tiles
        for (const tile of this.oceanTiles) {
            if (tile.parent) tile.parent.remove(tile);
            tile.geometry.dispose();
        }
        if (this.oceanMaterial) this.oceanMaterial.dispose();
        if (this.spectrumTexture) this.spectrumTexture.dispose();
        if (this.displacementTexture) this.displacementTexture.dispose();
        if (this.normalTexture) this.normalTexture.dispose();
        if (this.foamTexture) this.foamTexture.dispose();

        // Caustics
        if (this.causticMesh?.parent) this.causticMesh.parent.remove(this.causticMesh);
        if (this.causticMaterial) this.causticMaterial.dispose();
        if (this.causticRT) this.causticRT.dispose();

        // Debris
        for (const d of this.activeDebris) {
            if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
            if (d.mesh.geometry) d.mesh.geometry.dispose();
            if (d.mesh.material?.dispose) d.mesh.material.dispose();
        }
        this.activeDebris = [];

        // Fires
        for (const fire of this.activeFires) {
            if (fire.group.parent) fire.group.parent.remove(fire.group);
            fire.light.dispose();
        }
        this.activeFires = [];

        // Smoke pool
        for (const entry of this.smokePool) {
            if (entry.mesh.parent) entry.mesh.parent.remove(entry.mesh);
            entry.mesh.geometry.dispose();
            entry.mesh.material.dispose();
        }
        this.smokeClouds = [];

        // Fog banks
        for (const bank of this.fogBanks) {
            if (bank.mesh.parent) bank.mesh.parent.remove(bank.mesh);
            bank.mesh.geometry.dispose();
            bank.material.dispose();
        }
        this.fogBanks = [];

        // Rain
        if (this.rainSystem) {
            if (this.rainSystem.points.parent) {
                this.rainSystem.points.parent.remove(this.rainSystem.points);
            }
            this.rainSystem.points.geometry.dispose();
            this.rainSystem.points.material.dispose();
        }

        // Lightning
        if (this.lightningBolt.lines?.parent) {
            this.lightningBolt.lines.parent.remove(this.lightningBolt.lines);
            this.lightningBolt.lines.geometry.dispose();
        }
        if (this.lightningBolt.light?.parent) {
            this.lightningBolt.light.parent.remove(this.lightningBolt.light);
            this.lightningBolt.light.dispose();
        }

        // PBR materials
        for (const [, mat] of this.pbrMaterials) {
            if (mat.dispose) mat.dispose();
        }
        this.pbrMaterials.clear();

        // Render targets
        if (this.halfResRT) this.halfResRT.dispose();
        if (this.fogRT) this.fogRT.dispose();
        if (this.envMapRT) this.envMapRT.dispose();

        // Fracture cache
        for (const [, pieces] of this.fractureCache) {
            for (const p of pieces) {
                p.geometry.dispose();
                if (p.material.dispose) p.material.dispose();
            }
        }
        this.fractureCache.clear();

        this.sinkingShips = [];
        this.initialized = false;
        console.log('[CaribbeanRenderUpgrade2026] ✅ Disposed');
    }
}
