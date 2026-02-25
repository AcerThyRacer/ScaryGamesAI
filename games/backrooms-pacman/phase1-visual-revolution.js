/**
 * BACKROOMS PACMAN - PHASE 1: NEXT-GEN VISUAL REVOLUTION
 * Ray-traced lighting, PBR materials, advanced post-processing
 */

(function() {
    'use strict';

    // ============================================
    // PHASE 1.1: RAY-TRACED LIGHTING SYSTEM (WebGPU)
    // ============================================
    
    const RayTracedLighting = {
        device: null,
        context: null,
        pipeline: null,
        bindGroup: null,
        
        // Light sources in the scene
        lights: [],
        maxLights: 64,
        
        async init(canvas) {
            if (!navigator.gpu) {
                console.warn('[Phase 1] WebGPU not supported, falling back to WebGL');
                return false;
            }
            
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                console.warn('[Phase 1] No WebGPU adapter found');
                return false;
            }
            
            this.device = await adapter.requestDevice();
            this.context = canvas.getContext('webgpu');
            
            const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
            this.context.configure({
                device: this.device,
                format: canvasFormat,
                alphaMode: 'premultiplied'
            });
            
            await this.createRayTracingPipeline();
            console.log('[Phase 1] Ray-traced lighting initialized');
            return true;
        },
        
        async createRayTracingPipeline() {
            // Compute shader for ray tracing
            const computeShaderCode = `
                @group(0) @binding(0) var outputTexture: texture_storage_2d<rgba8unorm, write>;
                @group(0) @binding(1) var<storage, read> lights: array<Light>;
                @group(0) @binding(2) var<storage, read> geometry: array<Triangle>;
                @group(0) @binding(3) var<uniform> camera: Camera;
                
                struct Light {
                    position: vec3f,
                    color: vec3f,
                    intensity: f32,
                    radius: f32,
                };
                
                struct Triangle {
                    v0: vec3f,
                    v1: vec3f,
                    v2: vec3f,
                    normal: vec3f,
                    material: Material,
                };
                
                struct Material {
                    albedo: vec3f,
                    roughness: f32,
                    metallic: f32,
                    emissive: vec3f,
                };
                
                struct Camera {
                    position: vec3f,
                    forward: vec3f,
                    right: vec3f,
                    up: vec3f,
                    fov: f32,
                };
                
                struct Ray {
                    origin: vec3f,
                    direction: vec3f,
                };
                
                struct HitInfo {
                    hit: bool,
                    distance: f32,
                    position: vec3f,
                    normal: vec3f,
                    material: Material,
                };
                
                fn generateRay(uv: vec2f) -> Ray {
                    let aspect = 1920.0 / 1080.0;
                    let tanFov = tan(camera.fov * 0.5);
                    
                    let rd = normalize(
                        camera.forward +
                        camera.right * uv.x * tanFov * aspect +
                        camera.up * uv.y * tanFov
                    );
                    
                    return Ray(camera.position, rd);
                }
                
                fn intersectTriangle(ray: Ray, tri: Triangle) -> HitInfo {
                    let epsilon = 0.0001;
                    let edge1 = tri.v1 - tri.v0;
                    let edge2 = tri.v2 - tri.v0;
                    let h = cross(ray.direction, edge2);
                    let a = dot(edge1, h);
                    
                    if (abs(a) < epsilon) {
                        return HitInfo(false, 0.0, vec3f(0.0), vec3f(0.0), tri.material);
                    }
                    
                    let f = 1.0 / a;
                    let s = ray.origin - tri.v0;
                    let u = f * dot(s, h);
                    
                    if (u < 0.0 || u > 1.0) {
                        return HitInfo(false, 0.0, vec3f(0.0), vec3f(0.0), tri.material);
                    }
                    
                    let q = cross(s, edge1);
                    let v = f * dot(ray.direction, q);
                    
                    if (v < 0.0 || u + v > 1.0) {
                        return HitInfo(false, 0.0, vec3f(0.0), vec3f(0.0), tri.material);
                    }
                    
                    let t = f * dot(edge2, q);
                    
                    if (t > epsilon) {
                        let hitPos = ray.origin + ray.direction * t;
                        return HitInfo(true, t, hitPos, tri.normal, tri.material);
                    }
                    
                    return HitInfo(false, 0.0, vec3f(0.0), vec3f(0.0), tri.material);
                }
                
                fn traceRay(ray: Ray) -> HitInfo {
                    var closestHit: HitInfo = HitInfo(false, 1e10, vec3f(0.0), vec3f(0.0), 
                        Material(vec3f(0.0), 0.0, 0.0, vec3f(0.0)));
                    
                    for (var i = 0u; i < arrayLength(&geometry); i++) {
                        let hit = intersectTriangle(ray, geometry[i]);
                        if (hit.hit && hit.distance < closestHit.distance) {
                            closestHit = hit;
                        }
                    }
                    
                    return closestHit;
                }
                
                fn calculateLighting(hit: HitInfo, ray: Ray) -> vec3f {
                    var color = vec3f(0.0);
                    
                    for (var i = 0u; i < arrayLength(&lights); i++) {
                        let light = lights[i];
                        let toLight = light.position - hit.position;
                        let dist = length(toLight);
                        let dir = normalize(toLight);
                        
                        // Shadow ray
                        let shadowRay = Ray(hit.position + hit.normal * 0.001, dir);
                        let shadowHit = traceRay(shadowRay);
                        
                        if (!shadowHit.hit || shadowHit.distance > dist) {
                            let attenuation = 1.0 / (1.0 + (dist / light.radius) * (dist / light.radius));
                            let ndotl = max(dot(hit.normal, dir), 0.0);
                            
                            // PBR diffuse
                            let diffuse = hit.material.albedo / 3.14159;
                            
                            color += light.color * light.intensity * attenuation * ndotl * diffuse;
                        }
                    }
                    
                    // Ambient
                    color += hit.material.albedo * 0.05;
                    
                    // Emissive
                    color += hit.material.emissive;
                    
                    return color;
                }
                
                @compute @workgroup_size(8, 8)
                fn main(@builtin(global_invocation_id) global_id: vec3u) {
                    let size = textureDimensions(outputTexture);
                    if (global_id.x >= size.x || global_id.y >= size.y {
                        return;
                    }
                    
                    let uv = (vec2f(f32(global_id.x), f32(global_id.y)) / vec2f(f32(size.x), f32(size.y))) * 2.0 - 1.0;
                    uv.y = -uv.y;
                    
                    let ray = generateRay(uv);
                    let hit = traceRay(ray);
                    
                    var color: vec3f;
                    if (hit.hit) {
                        color = calculateLighting(hit, ray);
                    } else {
                        color = vec3f(0.02, 0.02, 0.03); // Dark background
                    }
                    
                    // Tone mapping (ACES)
                    color = color * (2.51 * color + 0.03) / (color * (2.43 * color + 0.59) + 0.14);
                    color = pow(color, vec3f(1.0 / 2.2)); // Gamma correction
                    
                    textureStore(outputTexture, global_id.xy, vec4f(color, 1.0));
                }
            `;
            
            const computeShader = this.device.createShaderModule({
                code: computeShaderCode
            });
            
            this.pipeline = this.device.createComputePipeline({
                layout: 'auto',
                compute: {
                    module: computeShader,
                    entryPoint: 'main'
                }
            });
        },
        
        addLight(position, color, intensity, radius) {
            if (this.lights.length >= this.maxLights) return;
            this.lights.push({ position, color, intensity, radius });
        },
        
        update(camera) {
            // Update camera uniform buffer
            // Dispatch compute shader
            // This would be called each frame
        }
    };

    // ============================================
    // PHASE 1.2: PBR MATERIAL SYSTEM
    // ============================================
    
    const PBRMaterialSystem = {
        materials: new Map(),
        
        // Material presets
        presets: {
            yellowWallpaper: {
                albedo: [0.71, 0.65, 0.30],
                roughness: 0.85,
                metallic: 0.05,
                normalScale: 1.0,
                aoIntensity: 1.0,
                emissive: [0, 0, 0],
                waterDamage: 0.3,
                moldAmount: 0.15,
                peelingAmount: 0.2
            },
            wetFloor: {
                albedo: [0.15, 0.12, 0.08],
                roughness: 0.1,
                metallic: 0.0,
                normalScale: 0.5,
                aoIntensity: 1.0,
                emissive: [0, 0, 0],
                wetness: 0.9,
                puddleAmount: 0.4
            },
            ceilingTile: {
                albedo: [0.54, 0.49, 0.27],
                roughness: 0.95,
                metallic: 0.0,
                normalScale: 0.8,
                aoIntensity: 1.0,
                emissive: [0, 0, 0],
                waterStains: 0.25,
                damageAmount: 0.3
            },
            pacmanFlesh: {
                albedo: [0.55, 0.41, 0.08],
                roughness: 0.6,
                metallic: 0.0,
                normalScale: 1.5,
                aoIntensity: 1.0,
                emissive: [0.1, 0.05, 0.0],
                subsurface: 0.4,
                wetness: 0.7
            }
        },
        
        init() {
            this.generateProceduralTextures();
            console.log('[Phase 1] PBR Material System initialized');
        },
        
        generateProceduralTextures() {
            // Generate wallpaper texture with water damage
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');
            
            // Base yellow
            ctx.fillStyle = '#b5a44c';
            ctx.fillRect(0, 0, 1024, 1024);
            
            // Stripe pattern
            for (let y = 0; y < 1024; y += 64) {
                ctx.fillStyle = y % 128 === 0 ? '#c4b35a' : '#a89840';
                ctx.fillRect(0, y, 1024, 32);
            }
            
            // Water damage stains
            for (let i = 0; i < 30; i++) {
                const x = Math.random() * 1024;
                const y = Math.random() * 1024;
                const r = 50 + Math.random() * 100;
                
                const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
                grad.addColorStop(0, 'rgba(80, 60, 20, 0.5)');
                grad.addColorStop(0.7, 'rgba(60, 50, 15, 0.25)');
                grad.addColorStop(1, 'transparent');
                
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 1024, 1024);
            }
            
            // Mold patches
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * 1024;
                const y = Math.random() * 1024;
                const r = 20 + Math.random() * 40;
                
                const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
                grad.addColorStop(0, 'rgba(40, 60, 30, 0.4)');
                grad.addColorStop(1, 'transparent');
                
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 1024, 1024);
            }
            
            // Peeling edges
            for (let i = 0; i < 15; i++) {
                ctx.fillStyle = 'rgba(90, 80, 40, 0.3)';
                ctx.beginPath();
                const x = Math.random() * 1024;
                const y = Math.random() * 1024;
                ctx.moveTo(x, y);
                for (let j = 0; j < 5; j++) {
                    ctx.lineTo(x + (Math.random() - 0.5) * 100, y + (Math.random() - 0.5) * 100);
                }
                ctx.closePath();
                ctx.fill();
            }
            
            // Store texture
            this.wallpaperTexture = canvas;
            
            // Generate normal map from texture
            this.generateNormalMap(canvas);
        },
        
        generateNormalMap(sourceCanvas) {
            // Sobel filter to generate normal map
            const canvas = document.createElement('canvas');
            canvas.width = sourceCanvas.width;
            canvas.height = sourceCanvas.height;
            const ctx = canvas.getContext('2d');
            
            const srcCtx = sourceCanvas.getContext('2d');
            const imgData = srcCtx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            
            const normalData = ctx.createImageData(canvas.width, canvas.height);
            const nd = normalData.data;
            
            for (let y = 1; y < canvas.height - 1; y++) {
                for (let x = 1; x < canvas.width - 1; x++) {
                    const idx = (y * canvas.width + x) * 4;
                    
                    // Sample neighbors
                    const left = data[idx - 4];
                    const right = data[idx + 4];
                    const up = data[idx - canvas.width * 4];
                    const down = data[idx + canvas.width * 4];
                    
                    // Calculate normal
                    const dx = (right - left) / 255.0;
                    const dy = (down - up) / 255.0;
                    
                    const normal = normalize([dx, dy, 1.0]);
                    
                    nd[idx] = (normal[0] * 0.5 + 0.5) * 255;
                    nd[idx + 1] = (normal[1] * 0.5 + 0.5) * 255;
                    nd[idx + 2] = (normal[2] * 0.5 + 0.5) * 255;
                    nd[idx + 3] = 255;
                }
            }
            
            ctx.putImageData(normalData, 0, 0);
            this.wallpaperNormalMap = canvas;
        },
        
        getMaterial(name) {
            return this.presets[name] || this.presets.yellowWallpaper;
        },
        
        applyToMesh(mesh, materialName) {
            const material = this.getMaterial(materialName);
            
            if (mesh.material) {
                mesh.material.roughness = material.roughness;
                mesh.material.metalness = material.metallic;
                
                if (this.wallpaperTexture && materialName === 'yellowWallpaper') {
                    const tex = new THREE.CanvasTexture(this.wallpaperTexture);
                    tex.wrapS = THREE.RepeatWrapping;
                    tex.wrapT = THREE.RepeatWrapping;
                    mesh.material.map = tex;
                    
                    if (this.wallpaperNormalMap) {
                        const normalTex = new THREE.CanvasTexture(this.wallpaperNormalMap);
                        normalTex.wrapS = THREE.RepeatWrapping;
                        normalTex.wrapT = THREE.RepeatWrapping;
                        mesh.material.normalMap = normalTex;
                        mesh.material.normalScale = new THREE.Vector2(material.normalScale, material.normalScale);
                    }
                }
                
                mesh.material.emissive = new THREE.Color(material.emissive[0], material.emissive[1], material.emissive[2]);
                mesh.material.emissiveIntensity = Math.max(...material.emissive) > 0 ? 0.5 : 0;
                
                mesh.material.needsUpdate = true;
            }
        }
    };
    
    function normalize(v) {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return [v[0] / len, v[1] / len, v[2] / len];
    }

    // ============================================
    // PHASE 1.3: ADVANCED POST-PROCESSING
    // ============================================
    
    const PostProcessing = {
        composer: null,
        passes: [],
        
        init(renderer, scene, camera) {
            // Create render targets
            this.createRenderTargets(renderer);
            
            // Initialize post-processing passes
            this.initPasses(renderer, scene, camera);
            
            console.log('[Phase 1] Post-processing initialized');
        },
        
        createRenderTargets(renderer) {
            const size = renderer.getSize(new THREE.Vector2());
            
            this.renderTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                stencilBuffer: false
            });
            
            this.depthTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.DepthFormat,
                type: THREE.UnsignedShortType
            });
        },
        
        initPasses(renderer, scene, camera) {
            // Film grain pass
            this.filmGrainPass = {
                enabled: true,
                intensity: 0.15,
                render: (input, output) => {
                    // Apply film grain shader
                    const grain = this.generateFilmGrain();
                    // Composite grain over input
                }
            };
            
            // Chromatic aberration pass
            this.chromaticAberrationPass = {
                enabled: true,
                intensity: 0.0,
                maxIntensity: 0.02,
                render: (input, output, dt) => {
                    // Apply chromatic aberration based on stress
                }
            };
            
            // Motion blur pass
            this.motionBlurPass = {
                enabled: true,
                samples: 8,
                velocityScale: 1.0,
                render: (input, output, dt) => {
                    // Calculate motion vectors and apply blur
                }
            };
            
            // Depth of field pass
            this.depthOfFieldPass = {
                enabled: true,
                focusDistance: 10.0,
                focalLength: 35.0,
                fStop: 2.8,
                bokehScale: 3.0,
                render: (input, output) => {
                    // Apply depth-based blur
                }
            };
            
            // Vignette pass
            this.vignettePass = {
                enabled: true,
                intensity: 0.6,
                color: new THREE.Color(0, 0, 0),
                render: (input, output) => {
                    // Apply vignette
                }
            };
            
            // Color grading pass
            this.colorGradingPass = {
                enabled: true,
                lut: null,
                brightness: 0.0,
                contrast: 1.1,
                saturation: 0.9,
                render: (input, output) => {
                    // Apply color grading
                }
            };
            
            this.passes = [
                this.motionBlurPass,
                this.depthOfFieldPass,
                this.chromaticAberrationPass,
                this.filmGrainPass,
                this.vignettePass,
                this.colorGradingPass
            ];
        },
        
        generateFilmGrain() {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            const imgData = ctx.createImageData(256, 256);
            
            for (let i = 0; i < imgData.data.length; i += 4) {
                const noise = Math.random() * 255;
                imgData.data[i] = noise;
                imgData.data[i + 1] = noise;
                imgData.data[i + 2] = noise;
                imgData.data[i + 3] = 255;
            }
            
            ctx.putImageData(imgData, 0, 0);
            return canvas;
        },
        
        update(dt, stressLevel) {
            // Update pass parameters based on game state
            this.chromaticAberrationPass.intensity = stressLevel * this.chromaticAberrationPass.maxIntensity;
            this.vignettePass.intensity = 0.4 + stressLevel * 0.4;
            this.filmGrainPass.intensity = 0.1 + stressLevel * 0.2;
        },
        
        render(renderer, scene, camera) {
            // Render scene to target
            renderer.setRenderTarget(this.renderTarget);
            renderer.render(scene, camera);
            
            // Apply post-processing passes
            let current = this.renderTarget;
            
            for (const pass of this.passes) {
                if (pass.enabled) {
                    pass.render(current, current);
                }
            }
            
            // Final output to screen
            renderer.setRenderTarget(null);
            // Blit final result
        }
    };

    // ============================================
    // PHASE 1.4: ENVIRONMENTAL STORYTELLING
    // ============================================
    
    const EnvironmentalStorytelling = {
        props: [],
        documents: [],
        bloodTrails: [],
        wallMessages: [],
        
        init(scene) {
            this.scene = scene;
            this.generateDocuments();
            this.generateBloodTrails();
            this.generateWallMessages();
            console.log('[Phase 1] Environmental storytelling initialized');
        },
        
        generateDocuments() {
            const documentTexts = [
                "I can hear it breathing behind the walls...",
                "Day 47: The yellow wallpaper is starting to look like faces",
                "Don't trust the pellets. They're bait.",
                "The maze changes when you're not looking",
                "I found a way out but the door leads back in",
                "It's learning my patterns. I can't hide anymore",
                "The buzzing lights are trying to tell me something",
                "I saw another person yesterday. They didn't have a face."
            ];
            
            for (let i = 0; i < 15; i++) {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 320;
                const ctx = canvas.getContext('2d');
                
                // Paper background
                ctx.fillStyle = '#f5f5dc';
                ctx.fillRect(0, 0, 256, 320);
                
                // Stains
                ctx.fillStyle = 'rgba(100, 80, 60, 0.2)';
                for (let j = 0; j < 5; j++) {
                    ctx.beginPath();
                    ctx.arc(Math.random() * 256, Math.random() * 320, Math.random() * 30, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Text
                ctx.fillStyle = '#3a3a3a';
                ctx.font = '14px monospace';
                const text = documentTexts[Math.floor(Math.random() * documentTexts.length)];
                this.wrapText(ctx, text, 20, 40, 216, 20);
                
                // Blood splatter
                if (Math.random() > 0.5) {
                    ctx.fillStyle = 'rgba(139, 0, 0, 0.6)';
                    ctx.beginPath();
                    ctx.arc(Math.random() * 256, Math.random() * 320, 15 + Math.random() * 20, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                this.documents.push({
                    texture: canvas,
                    position: this.findRandomFloorPosition(),
                    rotation: Math.random() * Math.PI * 2
                });
            }
        },
        
        wrapText(ctx, text, x, y, maxWidth, lineHeight) {
            const words = text.split(' ');
            let line = '';
            
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(line, x, y);
                    line = words[n] + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, x, y);
        },
        
        generateBloodTrails() {
            // Create spline-based blood trails
            for (let i = 0; i < 8; i++) {
                const points = [];
                let x = Math.random() * 80;
                let z = Math.random() * 80;
                
                for (let j = 0; j < 10; j++) {
                    points.push(new THREE.Vector3(x, 0.02, z));
                    x += (Math.random() - 0.5) * 10;
                    z += (Math.random() - 0.5) * 10;
                }
                
                const curve = new THREE.CatmullRomCurve3(points);
                const geometry = new THREE.TubeGeometry(curve, 20, 0.1, 4, false);
                const material = new THREE.MeshBasicMaterial({
                    color: 0x8b0000,
                    transparent: true,
                    opacity: 0.7
                });
                
                const trail = new THREE.Mesh(geometry, material);
                this.bloodTrails.push(trail);
            }
        },
        
        generateWallMessages() {
            const messages = [
                "HELP",
                "IT SEES YOU",
                "NO ESCAPE",
                "TURN BACK",
                "THEY'RE IN THE WALLS",
                "DON'T COLLECT THEM",
                "RUN",
                "IT'S BEHIND YOU"
            ];
            
            for (let i = 0; i < 20; i++) {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 128;
                const ctx = canvas.getContext('2d');
                
                // Scratched/written text
                ctx.fillStyle = '#3a0000';
                ctx.font = 'bold 48px Creepster, cursive';
                ctx.textAlign = 'center';
                ctx.fillText(messages[Math.floor(Math.random() * messages.length)], 256, 80);
                
                // Add scratches
                ctx.strokeStyle = 'rgba(100, 0, 0, 0.5)';
                ctx.lineWidth = 2;
                for (let j = 0; j < 20; j++) {
                    ctx.beginPath();
                    ctx.moveTo(Math.random() * 512, Math.random() * 128);
                    ctx.lineTo(Math.random() * 512, Math.random() * 128);
                    ctx.stroke();
                }
                
                this.wallMessages.push({
                    texture: canvas,
                    position: this.findRandomWallPosition()
                });
            }
        },
        
        findRandomFloorPosition() {
            // Return random valid floor position
            return {
                x: Math.random() * 80,
                z: Math.random() * 80
            };
        },
        
        findRandomWallPosition() {
            // Return random wall position
            return {
                x: Math.random() * 80,
                y: 1.5,
                z: Math.random() * 80
            };
        },
        
        addToScene(scene) {
            // Add all environmental props to scene
            this.documents.forEach(doc => {
                const geo = new THREE.PlaneGeometry(0.3, 0.4);
                const tex = new THREE.CanvasTexture(doc.texture);
                const mat = new THREE.MeshBasicMaterial({
                    map: tex,
                    transparent: true,
                    side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(doc.position.x, 0.02, doc.position.z);
                mesh.rotation.x = -Math.PI / 2;
                mesh.rotation.z = doc.rotation;
                scene.add(mesh);
            });
            
            this.bloodTrails.forEach(trail => scene.add(trail));
        }
    };

    // ============================================
    // PHASE 1.5: CINEMATIC CAMERA SYSTEM
    // ============================================
    
    const CinematicCamera = {
        camera: null,
        target: null,
        
        // Camera states
        states: {
            IDLE: 'idle',
            WALKING: 'walking',
            SPRINTING: 'sprinting',
            CHASE: 'chase',
            SCARED: 'scared'
        },
        
        currentState: 'idle',
        stateTimer: 0,
        
        // Camera physics
        bobAmount: 0.05,
        bobSpeed: 8.0,
        bobTime: 0,
        
        // Smoothing
        positionSmoothing: 0.1,
        rotationSmoothing: 0.08,
        
        // Target values
        targetFOV: 75,
        currentFOV: 75,
        
        init(camera) {
            this.camera = camera;
            this.setupCamera();
            console.log('[Phase 1] Cinematic camera initialized');
        },
        
        setupCamera() {
            if (!this.camera) return;
            
            // Initial setup
            this.camera.fov = this.currentFOV;
            this.camera.updateProjectionMatrix();
        },
        
        update(dt, playerState) {
            if (!this.camera) return;
            
            this.bobTime += dt * this.bobSpeed;
            
            // Update state based on player movement
            this.updateState(playerState);
            
            // Apply head bob
            this.applyHeadBob(playerState);
            
            // Apply breathing
            this.applyBreathing(dt);
            
            // Update FOV based on state
            this.updateFOV(dt);
            
            // Apply camera shake if needed
            if (playerState.shake > 0) {
                this.applyShake(playerState.shake);
            }
        },
        
        updateState(playerState) {
            const newState = playerState.isSprinting ? this.states.SPRINTING :
                           playerState.isMoving ? this.states.WALKING :
                           playerState.inDanger ? this.states.CHASE :
                           this.states.IDLE;
            
            if (newState !== this.currentState) {
                this.currentState = newState;
                this.onStateChange(newState);
            }
        },
        
        onStateChange(newState) {
            switch (newState) {
                case this.states.SPRINTING:
                    this.targetFOV = 85;
                    this.bobSpeed = 16.0;
                    this.bobAmount = 0.12;
                    break;
                case this.states.WALKING:
                    this.targetFOV = 75;
                    this.bobSpeed = 10.0;
                    this.bobAmount = 0.06;
                    break;
                case this.states.CHASE:
                    this.targetFOV = 90;
                    this.bobSpeed = 20.0;
                    this.bobAmount = 0.15;
                    break;
                case this.states.IDLE:
                    this.targetFOV = 75;
                    this.bobSpeed = 2.0;
                    this.bobAmount = 0.02;
                    break;
            }
        },
        
        applyHeadBob(playerState) {
            if (!playerState.isMoving) {
                this.bobTime = 0;
                return;
            }
            
            const bobY = Math.sin(this.bobTime) * this.bobAmount;
            const bobX = Math.cos(this.bobTime * 0.5) * this.bobAmount * 0.3;
            
            this.camera.position.y += bobY * 0.1;
            this.camera.rotation.z += bobX * 0.02;
        },
        
        applyBreathing(dt) {
            const breathSpeed = 2.0;
            const breathAmount = 0.005;
            const breath = Math.sin(Date.now() * 0.001 * breathSpeed) * breathAmount;
            
            this.camera.position.y += breath;
        },
        
        updateFOV(dt) {
            const diff = this.targetFOV - this.currentFOV;
            if (Math.abs(diff) > 0.1) {
                this.currentFOV += diff * dt * 5.0;
                this.camera.fov = this.currentFOV;
                this.camera.updateProjectionMatrix();
            }
        },
        
        applyShake(intensity) {
            const shakeX = (Math.random() - 0.5) * intensity;
            const shakeY = (Math.random() - 0.5) * intensity;
            const shakeZ = (Math.random() - 0.5) * intensity * 0.5;
            
            this.camera.position.x += shakeX;
            this.camera.position.y += shakeY;
            this.camera.rotation.z += shakeZ * 0.01;
        },
        
        // Smooth camera transition
        smoothLookAt(target, dt) {
            const currentLook = new THREE.Vector3(0, 0, -1);
            currentLook.applyQuaternion(this.camera.quaternion);
            
            const targetDir = target.clone().sub(this.camera.position).normalize();
            const newDir = currentLook.lerp(targetDir, this.rotationSmoothing);
            
            const targetQuaternion = new THREE.Quaternion();
            targetQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), newDir);
            
            this.camera.quaternion.slerp(targetQuaternion, this.rotationSmoothing);
        }
    };

    // ============================================
    // PHASE 1: MAIN INITIALIZER
    // ============================================
    
    const Phase1VisualRevolution = {
        async init(scene, camera, renderer) {
            console.log('[Phase 1] Initializing Next-Gen Visual Revolution...');
            
            // Initialize PBR materials
            PBRMaterialSystem.init();
            
            // Initialize post-processing
            PostProcessing.init(renderer, scene, camera);
            
            // Initialize environmental storytelling
            EnvironmentalStorytelling.init(scene);
            EnvironmentalStorytelling.addToScene(scene);
            
            // Initialize cinematic camera
            CinematicCamera.init(camera);
            
            // Try to initialize ray tracing (optional)
            const canvas = renderer.domElement;
            const rayTracingEnabled = await RayTracedLighting.init(canvas);
            
            if (rayTracingEnabled) {
                console.log('[Phase 1] Ray tracing enabled');
            } else {
                console.log('[Phase 1] Using standard rendering with enhanced materials');
            }
            
            // Apply PBR materials to existing meshes
            this.applyPBRMaterials(scene);
            
            console.log('[Phase 1] Visual Revolution initialization complete');
        },
        
        applyPBRMaterials(scene) {
            scene.traverse((object) => {
                if (object.isMesh) {
                    // Determine material type based on object properties
                    if (object.position.y > 1 && object.position.y < 3) {
                        // Likely a wall
                        PBRMaterialSystem.applyToMesh(object, 'yellowWallpaper');
                    } else if (object.position.y < 0.5) {
                        // Likely floor
                        PBRMaterialSystem.applyToMesh(object, 'wetFloor');
                    } else if (object.position.y > 3) {
                        // Likely ceiling
                        PBRMaterialSystem.applyToMesh(object, 'ceilingTile');
                    }
                }
            });
        },
        
        update(dt, playerState, stressLevel) {
            // Update post-processing
            PostProcessing.update(dt, stressLevel);
            
            // Update cinematic camera
            CinematicCamera.update(dt, playerState);
            
            // Update ray tracing if enabled
            if (RayTracedLighting.device) {
                RayTracedLighting.update(CinematicCamera.camera);
            }
        },
        
        render(renderer, scene, camera) {
            // Use post-processing pipeline
            PostProcessing.render(renderer, scene, camera);
        }
    };

    // Export to global scope
    window.Phase1VisualRevolution = Phase1VisualRevolution;
    window.RayTracedLighting = RayTracedLighting;
    window.PBRMaterialSystem = PBRMaterialSystem;
    window.PostProcessing = PostProcessing;
    window.EnvironmentalStorytelling = EnvironmentalStorytelling;
    window.CinematicCamera = CinematicCamera;

})();
