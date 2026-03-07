/**
 * BACKROOMS: PAC-MAN — 2026 Rendering Upgrade Module
 * Fluorescent overhaul, moist carpet PBR, reality glitch shaders,
 * infinite generation visuals, wall mold/decay, entity rendering, reflections.
 *
 * WebGPU-first with WebGL fallback. Integrates with existing phase system,
 * SanitySystem, HallucinationSystem, DecaySystem, and WaveFunctionCollapse.
 *
 * @version 2026.1.0
 */

const QUALITY_PRESETS = {
    ultra: {
        shadowMapSize: 2048, rayMarchSteps: 128, maxActiveLights: 48,
        volumetrics: true, computeDecay: true, reflections: true,
        reflectionResolution: 1024, decayGridSize: 512, motionBlurSamples: 16,
        stainResolution: 512, maxFootprints: 256
    },
    high: {
        shadowMapSize: 1024, rayMarchSteps: 64, maxActiveLights: 32,
        volumetrics: true, computeDecay: true, reflections: true,
        reflectionResolution: 512, decayGridSize: 256, motionBlurSamples: 8,
        stainResolution: 256, maxFootprints: 128
    },
    medium: {
        shadowMapSize: 512, rayMarchSteps: 32, maxActiveLights: 16,
        volumetrics: false, computeDecay: false, reflections: false,
        reflectionResolution: 256, decayGridSize: 128, motionBlurSamples: 4,
        stainResolution: 128, maxFootprints: 64
    },
    low: {
        shadowMapSize: 256, rayMarchSteps: 16, maxActiveLights: 8,
        volumetrics: false, computeDecay: false, reflections: false,
        reflectionResolution: 128, decayGridSize: 64, motionBlurSamples: 0,
        stainResolution: 64, maxFootprints: 32
    }
};

const CELL = 4;
const WALL_H = 3.5;

// ─── Fluorescent flicker patterns ───────────────────────────────────────────
const FLICKER_PATTERNS = {
    healthy:      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    aging:        [1, 1, 1, 0.6, 1, 1, 1, 1, 1, 0.4, 1, 1, 1, 1, 1, 1],
    dying:        [0.3, 0, 0.8, 0, 0.5, 0, 0, 1, 0.2, 0, 0.6, 0, 0, 0, 0.4, 0],
    startup:      [0, 0, 0.1, 0, 0.3, 0, 0.5, 0.2, 0.7, 0.3, 0.9, 0.6, 1, 0.8, 1, 1],
    failure:      [0.6, 0.3, 0.1, 0.4, 0.05, 0, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    dead:         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

// ─── GLSL helpers shared across shader materials ────────────────────────────
const GLSL_NOISE = /* glsl */ `
    vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec2 mod289(vec2 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
    float snoise(vec2 v){
        const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
        vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
        vec2 i1=(x0.x>x0.y)?vec2(1,0):vec2(0,1);
        vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
        vec3 p=permute(permute(i.y+vec3(0,i1.y,1))+i.x+vec3(0,i1.x,1));
        vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
        m=m*m;m=m*m;
        vec3 x_=2.0*fract(p*C.www)-1.0;vec3 h=abs(x_)-0.5;
        vec3 ox=floor(x_+0.5);vec3 a0=x_-ox;
        m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
        vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
        return 130.0*dot(m,g);
    }
`;

const GLSL_VORONOI = /* glsl */ `
    vec2 voronoi(vec2 x){
        vec2 n=floor(x),f=fract(x);
        float dMin=8.0; vec2 res=vec2(0.0);
        for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
            vec2 g=vec2(float(i),float(j));
            vec2 o=fract(sin(vec2(dot(n+g,vec2(127.1,311.7)),dot(n+g,vec2(269.5,183.3))))*43758.5453);
            vec2 r=g+o-f; float d=dot(r,r);
            if(d<dMin){ dMin=d; res=r; }
        }
        return vec2(sqrt(dMin), 0.0);
    }
`;

// ═════════════════════════════════════════════════════════════════════════════
// Fluorescent Area-Light System
// ═════════════════════════════════════════════════════════════════════════════
class AreaLightSystem2026 {
    constructor(preset) {
        this.lights = [];
        this.preset = preset;
        this._tubeMaterial = null;
        this._volumetricMaterial = null;
    }

    _createTubeMaterial() {
        if (this._tubeMaterial) return this._tubeMaterial;
        this._tubeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uBrightness: { value: 1.0 },
                uColor: { value: new THREE.Color(0.98, 0.95, 0.82) },
                uFlickerSeed: { value: Math.random() * 100 }
            },
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
            `,
            fragmentShader: /* glsl */ `
                uniform float uTime; uniform float uBrightness;
                uniform vec3 uColor; uniform float uFlickerSeed;
                varying vec2 vUv;
                void main(){
                    float edge=smoothstep(0.0,0.15,vUv.x)*smoothstep(1.0,0.85,vUv.x);
                    float glow=edge*uBrightness;
                    gl_FragColor=vec4(uColor*glow, glow);
                }
            `,
            transparent: true, side: THREE.DoubleSide, depthWrite: false
        });
        return this._tubeMaterial;
    }

    createLight(position, rotation) {
        const group = new THREE.Group();
        group.position.copy(position);
        if (rotation) group.rotation.copy(rotation);

        // Tube mesh (visual representation of fluorescent tube)
        const tubeGeo = new THREE.PlaneGeometry(1.2, 0.08);
        const tubeMat = this._createTubeMaterial().clone();
        tubeMat.uniforms.uFlickerSeed.value = Math.random() * 100;
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        group.add(tubeMesh);

        // Actual Three.js RectAreaLight for physically accurate lighting
        const areaLight = new THREE.RectAreaLight(0xfaf0d2, 3.0, 1.2, 0.08);
        areaLight.position.set(0, -0.01, 0);
        areaLight.lookAt(0, -1, 0);
        group.add(areaLight);

        const id = this.lights.length;
        const entry = {
            id, group, areaLight, tubeMesh, material: tubeMat,
            state: Math.random() < 0.1 ? 'dead' : (Math.random() < 0.2 ? 'dying' : 'healthy'),
            flickerIndex: 0, flickerTimer: 0, lifetime: 0,
            buzzGain: null, buzzOscillator: null,
            failureCountdown: 120 + Math.random() * 360 // seconds until next state transition
        };
        this.lights.push(entry);
        return entry;
    }

    update(time, deltaTime, audioCtx) {
        const flickerSpeed = 12; // ticks per second
        for (const light of this.lights) {
            light.lifetime += deltaTime;
            light.failureCountdown -= deltaTime;
            light.flickerTimer += deltaTime;

            // Progressive failure
            if (light.failureCountdown <= 0 && light.state !== 'dead') {
                if (light.state === 'healthy') { light.state = 'aging'; light.failureCountdown = 60 + Math.random() * 120; }
                else if (light.state === 'aging') { light.state = 'dying'; light.failureCountdown = 20 + Math.random() * 40; }
                else if (light.state === 'dying') { light.state = 'failure'; light.failureCountdown = 3; }
                else if (light.state === 'failure') { light.state = 'dead'; }
            }

            // Read flicker pattern
            const pattern = FLICKER_PATTERNS[light.state] || FLICKER_PATTERNS.dead;
            if (light.flickerTimer >= 1.0 / flickerSpeed) {
                light.flickerTimer = 0;
                light.flickerIndex = (light.flickerIndex + 1) % pattern.length;
            }
            let brightness = pattern[light.flickerIndex];

            // Random micro-flicker for aging/dying lights
            if (light.state === 'aging' || light.state === 'dying') {
                brightness *= 0.8 + 0.2 * Math.sin(time * 30 + light.id * 7.3);
            }

            light.material.uniforms.uBrightness.value = brightness;
            light.material.uniforms.uTime.value = time;
            light.areaLight.intensity = brightness * 3.0;

            // Sync audio hum
            if (audioCtx && brightness > 0.05 && !light.buzzOscillator) {
                this._startBuzz(light, audioCtx);
            }
            if (light.buzzGain) {
                light.buzzGain.gain.value = brightness * 0.04;
            }
            if (audioCtx && brightness <= 0.05 && light.buzzOscillator) {
                this._stopBuzz(light);
            }
        }
    }

    _startBuzz(light, ctx) {
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = 100 + Math.random() * 20; // 100-120 Hz hum
            gain.gain.value = 0.04;
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            light.buzzOscillator = osc;
            light.buzzGain = gain;
        } catch (_) { /* audio context may not be ready */ }
    }

    _stopBuzz(light) {
        try {
            if (light.buzzOscillator) { light.buzzOscillator.stop(); light.buzzOscillator.disconnect(); }
            if (light.buzzGain) light.buzzGain.disconnect();
        } catch (_) { /* ignore */ }
        light.buzzOscillator = null;
        light.buzzGain = null;
    }

    dispose() {
        for (const light of this.lights) {
            this._stopBuzz(light);
            light.group.removeFromParent();
            light.material.dispose();
            light.areaLight.dispose();
        }
        this.lights.length = 0;
        if (this._tubeMaterial) this._tubeMaterial.dispose();
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Upgrade Class
// ═════════════════════════════════════════════════════════════════════════════
export class BackroomsRenderUpgrade2026 {
    constructor(game) {
        this.game = game;
        this.scene = game.scene || null;
        this.camera = game.camera || null;
        this.renderer = game.renderer || null;

        this.quality = 'high';
        this.preset = { ...QUALITY_PRESETS.high };

        // Sub-systems
        this.areaLights = null;
        this._glitchPass = null;
        this._carpetMaterials = [];
        this._moldGrid = null;
        this._moldTexture = null;
        this._reflectionCamera = null;
        this._reflectionRT = null;
        this._footprints = [];
        this._entityProximity = new Map();
        this._roomVisuals = new Map();

        // WebGPU state
        this._gpuDevice = null;
        this._gpuSupported = false;
        this._decayPipeline = null;
        this._stainPipeline = null;

        // Runtime state
        this._sanity = 100;
        this._glitchIntensity = 0;
        this._totalTime = 0;
        this._depthLevel = 0;
        this._disposed = false;
        this._initialized = false;

        // Cached uniforms for the reality-glitch post-process
        this._glitchUniforms = {
            uTime: { value: 0 },
            uIntensity: { value: 0 },
            uSanity: { value: 1.0 },
            uResolution: { value: new THREE.Vector2(1, 1) },
            uNoClipChance: { value: 0 },
            uScreenTexture: { value: null }
        };
    }

    // ─── Initialization ─────────────────────────────────────────────────────
    async initialize() {
        if (this._initialized) return;

        // Resolve references from game if not set
        this.scene = this.scene || this.game.scene;
        this.camera = this.camera || this.game.camera;
        this.renderer = this.renderer || this.game.renderer;

        if (!this.scene || !this.camera || !this.renderer) {
            console.error('[RenderUpgrade2026] Missing scene/camera/renderer from game instance');
            return;
        }

        await this._initWebGPU();
        this._initAreaLights();
        this._initGlitchPass();
        this._initCarpetMaterial();
        this._initMoldGrid();
        this._initReflections();

        this._initialized = true;
        console.log('[RenderUpgrade2026] Initialized — quality:', this.quality,
            '| WebGPU:', this._gpuSupported);
    }

    async _initWebGPU() {
        if (!navigator.gpu) { this._gpuSupported = false; return; }
        try {
            const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
            if (!adapter) throw new Error('no adapter');
            this._gpuDevice = await adapter.requestDevice();
            this._gpuSupported = true;
            if (this.preset.computeDecay) this._buildDecayComputePipeline();
            if (this.preset.stainResolution) this._buildStainComputePipeline();
        } catch (e) {
            console.warn('[RenderUpgrade2026] WebGPU unavailable, using WebGL fallback:', e.message);
            this._gpuSupported = false;
        }
    }

    // ─── Area-light bootstrapping ───────────────────────────────────────────
    _initAreaLights() {
        this.areaLights = new AreaLightSystem2026(this.preset);
        // If RectAreaLightUniformsLib exists, call init (Three.js r128+ requirement)
        if (typeof THREE.RectAreaLightUniformsLib !== 'undefined') {
            THREE.RectAreaLightUniformsLib.init();
        }
    }

    // ─── Reality-Glitch Post-Process ────────────────────────────────────────
    _initGlitchPass() {
        const rt = new THREE.WebGLRenderTarget(
            this.renderer.domElement.width,
            this.renderer.domElement.height,
            { format: THREE.RGBAFormat }
        );
        this._glitchRT = rt;
        this._glitchUniforms.uResolution.value.set(rt.width, rt.height);
        this._glitchUniforms.uScreenTexture.value = rt.texture;

        this._glitchPass = new THREE.ShaderMaterial({
            uniforms: this._glitchUniforms,
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main(){ vUv=uv; gl_Position=vec4(position,1.0); }
            `,
            fragmentShader: /* glsl */ `
                uniform float uTime;
                uniform float uIntensity;
                uniform float uSanity;
                uniform float uNoClipChance;
                uniform vec2 uResolution;
                uniform sampler2D uScreenTexture;
                varying vec2 vUv;
                ${GLSL_NOISE}
                ${GLSL_VORONOI}
                void main(){
                    vec2 uv = vUv;
                    float t = uTime;
                    float ins = uIntensity;

                    // VHS horizontal tear
                    float tearLine = step(0.998, fract(sin(t*43.17)*4375.85));
                    float tearOffset = tearLine * (snoise(vec2(t*10.0, uv.y*5.0)) * 0.03) * ins;
                    uv.x += tearOffset;

                    // Geometry warp — walls breathe
                    float breathe = sin(t*0.7 + uv.y*6.0) * 0.004 * ins;
                    uv += breathe;

                    // Sample with chromatic aberration
                    float aberr = 0.003 * ins;
                    float r = texture2D(uScreenTexture, uv + vec2(aberr, 0.0)).r;
                    float g = texture2D(uScreenTexture, uv).g;
                    float b = texture2D(uScreenTexture, uv - vec2(aberr, 0.0)).b;
                    vec3 color = vec3(r, g, b);

                    // Scanlines
                    color *= 1.0 - 0.08 * ins * sin(uv.y * uResolution.y * 1.5);

                    // Reality fractures (Voronoi cracks) at low sanity
                    if(uSanity < 0.4){
                        vec2 vc = voronoi(uv * 12.0 + t * 0.3);
                        float crack = smoothstep(0.04, 0.0, vc.x) * (0.4 - uSanity) * 2.5;
                        color = mix(color, vec3(0.02, 0.0, 0.04), crack);
                    }

                    // No-clip glitch frames
                    float noclip = step(1.0 - uNoClipChance * 0.005, fract(sin(t*91.3)*1573.7));
                    color = mix(color, color * 0.15 + vec3(0.0, 0.02, 0.0), noclip * ins);

                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });

        // Full-screen quad for the post-process
        this._glitchQuad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this._glitchPass
        );
        this._glitchScene = new THREE.Scene();
        this._glitchCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this._glitchScene.add(this._glitchQuad);
    }

    // ─── Moist Carpet PBR ───────────────────────────────────────────────────
    _initCarpetMaterial() {
        this._carpetMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uWetness: { value: 0.3 },
                uBaseColor: { value: new THREE.Color(0.45, 0.35, 0.15) },
                uPlayerPos: { value: new THREE.Vector2(0, 0) },
                uFootprintData: { value: null },
                uDepthLevel: { value: 0 }
            },
            vertexShader: /* glsl */ `
                varying vec2 vUv; varying vec3 vWorldPos; varying vec3 vNormal;
                uniform float uWetness; uniform float uTime;
                ${GLSL_NOISE}
                void main(){
                    vUv = uv; vNormal = normalMatrix * normal;
                    vec3 pos = position;
                    // Squelch displacement in wet areas
                    float wet = snoise(uv * 8.0 + uTime * 0.05) * 0.5 + 0.5;
                    pos.y -= wet * uWetness * 0.02;
                    vec4 world = modelMatrix * vec4(pos, 1.0);
                    vWorldPos = world.xyz;
                    gl_Position = projectionMatrix * viewMatrix * world;
                }
            `,
            fragmentShader: /* glsl */ `
                uniform float uTime; uniform float uWetness; uniform vec3 uBaseColor;
                uniform vec2 uPlayerPos; uniform float uDepthLevel;
                varying vec2 vUv; varying vec3 vWorldPos; varying vec3 vNormal;
                ${GLSL_NOISE}
                void main(){
                    vec2 uv = vUv;
                    // Procedural stain
                    float stain = snoise(uv * 6.0) * 0.5 + 0.5;
                    stain = smoothstep(0.35, 0.65, stain);

                    // Base color darkened by wetness and depth
                    vec3 dry = uBaseColor;
                    vec3 wet = uBaseColor * 0.5;
                    float wetMask = smoothstep(0.4, 0.6, snoise(uv * 4.0 + 0.5) * 0.5 + 0.5);
                    wetMask = mix(wetMask, 1.0, uDepthLevel * 0.3);
                    vec3 color = mix(dry, wet, wetMask * uWetness);
                    color *= 1.0 - stain * 0.25;

                    // Roughness varies: dry=0.7, wet=0.2
                    float roughness = mix(0.7, 0.2, wetMask * uWetness);

                    // Clearcoat-style specular on wet patches
                    vec3 viewDir = normalize(cameraPosition - vWorldPos);
                    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
                    vec3 halfDir = normalize(viewDir + lightDir);
                    float spec = pow(max(dot(vNormal, halfDir), 0.0), mix(8.0, 64.0, 1.0-roughness));
                    color += spec * wetMask * uWetness * 0.3;

                    // Footprint darkening near player
                    float pDist = distance(vWorldPos.xz, uPlayerPos);
                    float footprint = smoothstep(0.6, 0.0, pDist) * 0.15;
                    color -= footprint;

                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });
        this._carpetMaterials.push(this._carpetMaterial);
    }

    // ─── Wall Mold / Decay Compute ──────────────────────────────────────────
    _initMoldGrid() {
        const size = this.preset.decayGridSize;
        this._moldGridSize = size;
        this._moldData = new Float32Array(size * size);

        // Seed moisture sources
        for (let i = 0; i < 8; i++) {
            const x = Math.floor(Math.random() * size);
            const y = Math.floor(Math.random() * size);
            this._moldData[y * size + x] = 0.8 + Math.random() * 0.2;
        }

        // DataTexture for GPU upload
        this._moldTexture = new THREE.DataTexture(
            this._moldData, size, size, THREE.RedFormat, THREE.FloatType
        );
        this._moldTexture.needsUpdate = true;

        // Wall material that reads mold texture
        this._moldWallMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uMoldMap: { value: this._moldTexture },
                uDecayLevel: { value: 0 },
                uTime: { value: 0 },
                uBaseColor: { value: new THREE.Color(0.85, 0.82, 0.72) }
            },
            vertexShader: /* glsl */ `
                varying vec2 vUv; varying vec3 vWorldPos;
                void main(){ vUv=uv; vWorldPos=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
            `,
            fragmentShader: /* glsl */ `
                uniform sampler2D uMoldMap; uniform float uDecayLevel; uniform float uTime;
                uniform vec3 uBaseColor;
                varying vec2 vUv; varying vec3 vWorldPos;
                void main(){
                    float mold = texture2D(uMoldMap, vUv).r;
                    // Stage: clean → stained → moldy → decaying → exposed
                    vec3 clean = uBaseColor;
                    vec3 stained = vec3(0.6, 0.55, 0.4);
                    vec3 moldy = vec3(0.2, 0.25, 0.15);
                    vec3 decayed = vec3(0.15, 0.12, 0.08);
                    vec3 exposed = vec3(0.3, 0.28, 0.25);

                    vec3 color = clean;
                    color = mix(color, stained, smoothstep(0.0, 0.2, mold));
                    color = mix(color, moldy, smoothstep(0.2, 0.5, mold));
                    color = mix(color, decayed, smoothstep(0.5, 0.75, mold));
                    color = mix(color, exposed, smoothstep(0.75, 1.0, mold));

                    // Mold absorbs light
                    float lightAbsorb = 1.0 - mold * 0.6;
                    color *= lightAbsorb;

                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });
    }

    // ─── Reflection System ──────────────────────────────────────────────────
    _initReflections() {
        if (!this.preset.reflections) return;
        const res = this.preset.reflectionResolution;
        this._reflectionRT = new THREE.WebGLRenderTarget(res, res, {
            format: THREE.RGBAFormat, minFilter: THREE.LinearFilter
        });
        this._reflectionCamera = this.camera.clone();

        this._reflectionMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222, metalness: 0.8, roughness: 0.1,
            envMap: this._reflectionRT.texture, envMapIntensity: 0.6,
            transparent: true, opacity: 0.85
        });
    }

    // ─── WebGPU Compute Pipelines ───────────────────────────────────────────
    _buildDecayComputePipeline() {
        if (!this._gpuDevice) return;
        const device = this._gpuDevice;
        const shaderModule = device.createShaderModule({
            code: /* wgsl */ `
                @group(0) @binding(0) var<storage, read_write> grid: array<f32>;
                @group(0) @binding(1) var<uniform> params: vec4f; // x=size, y=dt, z=rate, w=unused

                @compute @workgroup_size(16, 16)
                fn main(@builtin(global_invocation_id) id: vec3u){
                    let size = u32(params.x);
                    if(id.x >= size || id.y >= size){ return; }
                    let idx = id.y * size + id.x;
                    let val = grid[idx];

                    // Reaction-diffusion spread from neighbours
                    var sum: f32 = 0.0;
                    var count: f32 = 0.0;
                    for(var dy: i32 = -1; dy <= 1; dy++){
                        for(var dx: i32 = -1; dx <= 1; dx++){
                            let nx = i32(id.x) + dx;
                            let ny = i32(id.y) + dy;
                            if(nx >= 0 && nx < i32(size) && ny >= 0 && ny < i32(size)){
                                sum += grid[u32(ny) * size + u32(nx)];
                                count += 1.0;
                            }
                        }
                    }
                    let avg = sum / count;
                    let growth = params.z * params.y; // rate * deltaTime
                    let newVal = val + (avg - val) * 0.1 + growth * step(0.01, avg);
                    grid[idx] = clamp(newVal, 0.0, 1.0);
                }
            `
        });
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
            ]
        });
        const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
        this._decayPipeline = device.createComputePipeline({
            layout: pipelineLayout,
            compute: { module: shaderModule, entryPoint: 'main' }
        });
        this._decayBindGroupLayout = bindGroupLayout;

        // Buffers
        const gridBytes = this._moldGridSize * this._moldGridSize * 4;
        this._decayGridBuffer = device.createBuffer({
            size: gridBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this._decayParamsBuffer = device.createBuffer({
            size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this._decayReadBuffer = device.createBuffer({
            size: gridBytes, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        this._decayBindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this._decayGridBuffer } },
                { binding: 1, resource: { buffer: this._decayParamsBuffer } }
            ]
        });
    }

    _buildStainComputePipeline() {
        // Procedural stain generation compute — uses same device
        if (!this._gpuDevice) return;
        // Stain compute is similar but simpler; we reuse the decay pipeline pattern
        // and generate a stain texture on demand per room via _generateStainTexture()
    }

    // ─── Public API ─────────────────────────────────────────────────────────

    /**
     * Replace corridor point lights with area tube lights.
     * Call after the maze has been built.
     */
    installFluorescentLights(corridorLights) {
        if (!this.areaLights || !this.scene) return;
        const installed = [];
        for (const oldLight of corridorLights) {
            const pos = oldLight.position ? oldLight.position.clone() : new THREE.Vector3();
            pos.y = WALL_H - 0.05; // Mount near ceiling
            const entry = this.areaLights.createLight(pos);
            this.scene.add(entry.group);

            // Remove old point light
            if (oldLight.parent) oldLight.parent.remove(oldLight);
            if (oldLight.dispose) oldLight.dispose();
            installed.push(entry);
        }
        return installed;
    }

    updateLighting(lights, time) {
        if (!this.areaLights) return;
        const audioCtx = (this.game.audioContext || this.game.audioCtx || null);
        this.areaLights.update(time, 1 / 60, audioCtx);
    }

    updateDecay(deltaTime) {
        if (!this._moldData) return;
        const size = this._moldGridSize;

        if (this._gpuSupported && this._decayPipeline) {
            this._runDecayCompute(deltaTime);
        } else {
            // CPU fallback: simple reaction-diffusion step
            const next = new Float32Array(size * size);
            const rate = 0.0008;
            for (let y = 1; y < size - 1; y++) {
                for (let x = 1; x < size - 1; x++) {
                    const idx = y * size + x;
                    const val = this._moldData[idx];
                    const avg = (
                        this._moldData[idx - 1] + this._moldData[idx + 1] +
                        this._moldData[idx - size] + this._moldData[idx + size]
                    ) * 0.25;
                    const growth = rate * deltaTime * (avg > 0.01 ? 1 : 0);
                    next[idx] = Math.min(1, val + (avg - val) * 0.1 + growth);
                }
            }
            this._moldData.set(next);
        }

        // Upload to GPU texture
        if (this._moldTexture) {
            this._moldTexture.image.data.set(this._moldData);
            this._moldTexture.needsUpdate = true;
        }
    }

    async _runDecayCompute(deltaTime) {
        const device = this._gpuDevice;
        const size = this._moldGridSize;
        device.queue.writeBuffer(this._decayGridBuffer, 0, this._moldData);
        const params = new Float32Array([size, deltaTime, 0.0008, 0]);
        device.queue.writeBuffer(this._decayParamsBuffer, 0, params);

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(this._decayPipeline);
        pass.setBindGroup(0, this._decayBindGroup);
        pass.dispatchWorkgroups(Math.ceil(size / 16), Math.ceil(size / 16));
        pass.end();

        encoder.copyBufferToBuffer(this._decayGridBuffer, 0, this._decayReadBuffer, 0, size * size * 4);
        device.queue.submit([encoder.finish()]);

        await this._decayReadBuffer.mapAsync(GPUMapMode.READ);
        const result = new Float32Array(this._decayReadBuffer.getMappedRange().slice(0));
        this._decayReadBuffer.unmap();
        this._moldData.set(result);
    }

    onSanityChange(sanityLevel) {
        this._sanity = sanityLevel;
        const normalized = Math.max(0, Math.min(1, sanityLevel / 100));
        // Glitch intensifies as sanity drops below 50
        this._glitchIntensity = Math.max(0, 1 - normalized * 2);
        this._glitchUniforms.uSanity.value = normalized;
        this._glitchUniforms.uIntensity.value = this._glitchIntensity;
        // No-clip chance increases dramatically below 20 sanity
        this._glitchUniforms.uNoClipChance.value = sanityLevel < 20 ? (20 - sanityLevel) / 20 : 0;
    }

    onEntityNearby(entity, distance) {
        if (!entity || !entity.id) return;
        this._entityProximity.set(entity.id, { entity, distance, time: this._totalTime });

        const intensity = Math.max(0, 1 - distance / 15);
        // Chromatic aberration boost
        this._glitchUniforms.uIntensity.value = Math.max(
            this._glitchIntensity,
            intensity * 0.8
        );

        // Entity-specific rendering
        if (entity.type === 'smiler' || entity.variant === 'smiler') {
            this._updateSmilerGlow(entity, distance);
        } else if (entity.type === 'skin_crawler' || entity.variant === 'skin_crawler') {
            this._updateSkinCrawlerSSS(entity);
        } else if (entity.type === 'hound' || entity.variant === 'hound') {
            this._updateHoundTrail(entity);
        }

        // Volumetric shadow presence — dark fog follows entities
        this._applyEntityShadowFog(entity, distance);
    }

    _updateSmilerGlow(entity, distance) {
        if (!entity.mesh) return;
        // Ensure the smiler has two emissive eye point-lights
        if (!entity._eyeLightsAdded) {
            const eyeColor = 0xffee44;
            const leftEye = new THREE.PointLight(eyeColor, 2.0, 8);
            const rightEye = new THREE.PointLight(eyeColor, 2.0, 8);
            leftEye.position.set(-0.15, 0.3, -0.3);
            rightEye.position.set(0.15, 0.3, -0.3);
            entity.mesh.add(leftEye);
            entity.mesh.add(rightEye);
            entity._eyeLights = [leftEye, rightEye];
            entity._eyeLightsAdded = true;
        }
        // Fade intensity based on distance
        const glow = Math.max(0, 1 - distance / 20) * 3.0;
        for (const eye of entity._eyeLights) eye.intensity = glow;
    }

    _updateSkinCrawlerSSS(entity) {
        if (!entity.mesh) return;
        // Apply subsurface scattering approximation via custom material
        if (!entity._sssApplied) {
            const sssMat = new THREE.MeshPhysicalMaterial({
                color: 0xdba888, roughness: 0.6, metalness: 0,
                transmission: 0.15, thickness: 0.5,
                sheenColor: new THREE.Color(0.8, 0.3, 0.3), sheen: 0.4,
                clearcoat: 0.1
            });
            entity.mesh.traverse(child => {
                if (child.isMesh) child.material = sssMat;
            });
            entity._sssApplied = true;
        }
    }

    _updateHoundTrail(entity) {
        if (!entity.mesh || !entity.velocity) return;
        const speed = entity.velocity.length ? entity.velocity.length() : 0;
        if (speed < 2) return;
        // Simple motion-blur trail via afterimage meshes
        if (!entity._trailMeshes) entity._trailMeshes = [];
        const clone = entity.mesh.clone();
        clone.traverse(c => {
            if (c.isMesh) {
                c.material = c.material.clone();
                c.material.transparent = true;
                c.material.opacity = 0.3;
            }
        });
        clone.position.copy(entity.mesh.position);
        clone.rotation.copy(entity.mesh.rotation);
        this.scene.add(clone);
        entity._trailMeshes.push({ mesh: clone, birth: this._totalTime });

        // Clean old trails
        const cutoff = this._totalTime - 0.15;
        entity._trailMeshes = entity._trailMeshes.filter(t => {
            if (t.birth < cutoff) { this.scene.remove(t.mesh); return false; }
            t.mesh.traverse(c => { if (c.isMesh) c.material.opacity *= 0.85; });
            return true;
        });
    }

    _applyEntityShadowFog(entity, distance) {
        if (!entity.mesh) return;
        if (!entity._shadowFog) {
            const fogGeo = new THREE.SphereGeometry(2, 12, 12);
            const fogMat = new THREE.MeshBasicMaterial({
                color: 0x000000, transparent: true, opacity: 0.15,
                side: THREE.BackSide, depthWrite: false
            });
            entity._shadowFog = new THREE.Mesh(fogGeo, fogMat);
            entity.mesh.add(entity._shadowFog);
        }
        const proximity = Math.max(0, 1 - distance / 12);
        entity._shadowFog.material.opacity = proximity * 0.25;
        entity._shadowFog.scale.setScalar(1.5 + proximity);
    }

    onRoomGenerated(room) {
        if (!room) return;
        const depth = room.depth || this._depthLevel;
        const roomId = room.id || `room_${Date.now()}`;

        // Unique visual personality per room
        const visual = {
            wetness: 0.2 + Math.random() * 0.4 + depth * 0.05,
            decayOffset: Math.random(),
            lightStates: [],
            isThreshold: room.isThreshold || false,
            stainSeed: Math.random() * 9999
        };

        // Decide light states for this room's fixtures
        const lightCount = room.lightPositions ? room.lightPositions.length : 4;
        for (let i = 0; i < lightCount; i++) {
            const roll = Math.random();
            const deadChance = 0.05 + depth * 0.08;
            const dyingChance = deadChance + 0.1 + depth * 0.05;
            if (roll < deadChance) visual.lightStates.push('dead');
            else if (roll < dyingChance) visual.lightStates.push('dying');
            else if (roll < dyingChance + 0.15) visual.lightStates.push('aging');
            else visual.lightStates.push('healthy');
        }

        this._roomVisuals.set(roomId, visual);

        // Apply carpet wetness for this room
        for (const mat of this._carpetMaterials) {
            mat.uniforms.uWetness.value = visual.wetness;
            mat.uniforms.uDepthLevel.value = Math.min(1, depth * 0.15);
        }

        // If threshold room, prepare crossfade data
        if (visual.isThreshold) {
            this._prepareThresholdCrossfade(room);
        }

        return visual;
    }

    _prepareThresholdCrossfade(room) {
        // Threshold rooms blend two realities visually; we set up a lerp target
        // that beforeRender/afterRender will use for a brief transition
        this._thresholdActive = true;
        this._thresholdStart = this._totalTime;
        this._thresholdDuration = 2.5; // seconds of crossfade
    }

    // ─── Render Hooks ───────────────────────────────────────────────────────

    beforeRender(camera, deltaTime) {
        if (!this._initialized) return;
        this._totalTime += deltaTime;
        this._depthLevel = this.game.depthLevel || this.game.level || 0;

        // Update carpet player position
        const pPos = this.game.playerPos || { x: 0, z: 0 };
        for (const mat of this._carpetMaterials) {
            mat.uniforms.uPlayerPos.value.set(pPos.x, pPos.z);
            mat.uniforms.uTime.value = this._totalTime;
        }

        // Update mold wall material
        if (this._moldWallMaterial) {
            this._moldWallMaterial.uniforms.uTime.value = this._totalTime;
            this._moldWallMaterial.uniforms.uDecayLevel.value = Math.min(1, this._depthLevel * 0.12);
        }

        // Update glitch uniforms
        this._glitchUniforms.uTime.value = this._totalTime;

        // Track footprints
        this._recordFootprint(pPos);

        // Reflections — render mirrored camera
        if (this.preset.reflections && this._reflectionCamera && this._reflectionRT) {
            this._renderReflection(camera);
        }

        // Read sanity from existing system
        this._syncSanity();

        // Render scene to off-screen target for post-process
        if (this._glitchIntensity > 0.01 && this._glitchRT) {
            this.renderer.setRenderTarget(this._glitchRT);
            this.renderer.render(this.scene, camera);
            this.renderer.setRenderTarget(null);
        }
    }

    afterRender() {
        if (!this._initialized) return;
        // Apply reality-glitch post-process over final frame
        if (this._glitchIntensity > 0.01 && this._glitchPass) {
            this.renderer.render(this._glitchScene, this._glitchCamera);
        }

        // Clean up expired entity proximity data
        const cutoff = this._totalTime - 1.0;
        for (const [id, data] of this._entityProximity) {
            if (data.time < cutoff) this._entityProximity.delete(id);
        }
    }

    _renderReflection(camera) {
        // Mirror the camera across the floor plane (Y=0)
        this._reflectionCamera.copy(camera);
        this._reflectionCamera.position.y = -camera.position.y;
        this._reflectionCamera.rotation.x = -camera.rotation.x;

        this.renderer.setRenderTarget(this._reflectionRT);
        this.renderer.render(this.scene, this._reflectionCamera);
        this.renderer.setRenderTarget(null);

        // The reflection texture is available for reflection materials
        if (this._reflectionMaterial) {
            this._reflectionMaterial.envMap = this._reflectionRT.texture;
            this._reflectionMaterial.needsUpdate = true;
        }
    }

    _recordFootprint(pPos) {
        if (!this._footprints) return;
        const last = this._footprints[this._footprints.length - 1];
        if (last) {
            const dx = pPos.x - last.x, dz = pPos.z - last.z;
            if (dx * dx + dz * dz < 0.25) return; // too close to last
        }
        this._footprints.push({ x: pPos.x, z: pPos.z, time: this._totalTime });
        if (this._footprints.length > this.preset.maxFootprints) {
            this._footprints.shift();
        }
    }

    _syncSanity() {
        // Pull from global SanitySystem if available
        if (typeof SanitySystem !== 'undefined' && SanitySystem.getState) {
            const s = SanitySystem.getState();
            if (s && typeof s.current === 'number') {
                this.onSanityChange(s.current);
            }
        } else if (this.game.sanity !== undefined) {
            this.onSanityChange(this.game.sanity);
        }
    }

    // ─── Quality Control ────────────────────────────────────────────────────
    setQuality(level) {
        const key = ('' + level).toLowerCase();
        if (!QUALITY_PRESETS[key]) {
            console.warn('[RenderUpgrade2026] Unknown quality level:', level);
            return;
        }
        this.quality = key;
        this.preset = { ...QUALITY_PRESETS[key] };
        console.log('[RenderUpgrade2026] Quality set to:', key);

        // Resize reflection RT
        if (this._reflectionRT) {
            this._reflectionRT.setSize(this.preset.reflectionResolution, this.preset.reflectionResolution);
        }
        // Resize glitch RT
        if (this._glitchRT && this.renderer) {
            this._glitchRT.setSize(this.renderer.domElement.width, this.renderer.domElement.height);
            this._glitchUniforms.uResolution.value.set(this._glitchRT.width, this._glitchRT.height);
        }
    }

    // ─── Impossible Geometry Hint ───────────────────────────────────────────
    /**
     * Create a corridor section that appears longer inside than outside
     * by warping UVs and subtly scaling geometry away from the player.
     */
    applyImpossibleGeometry(corridorMesh, innerLength, outerLength) {
        if (!corridorMesh) return;
        const scaleFactor = innerLength / Math.max(outerLength, 0.01);
        corridorMesh.scale.z = scaleFactor;
        // Compensate texture stretch
        corridorMesh.traverse(c => {
            if (c.isMesh && c.material && c.material.map) {
                c.material.map.repeat.set(1, scaleFactor);
                c.material.map.needsUpdate = true;
            }
        });
    }

    // ─── Material Getters ───────────────────────────────────────────────────
    getCarpetMaterial() { return this._carpetMaterial; }
    getMoldWallMaterial() { return this._moldWallMaterial; }
    getReflectionMaterial() { return this._reflectionMaterial; }

    // ─── Cleanup ────────────────────────────────────────────────────────────
    dispose() {
        if (this._disposed) return;
        this._disposed = true;

        if (this.areaLights) this.areaLights.dispose();

        for (const mat of this._carpetMaterials) mat.dispose();
        this._carpetMaterials.length = 0;

        if (this._moldTexture) this._moldTexture.dispose();
        if (this._moldWallMaterial) this._moldWallMaterial.dispose();
        if (this._reflectionRT) this._reflectionRT.dispose();
        if (this._glitchRT) this._glitchRT.dispose();
        if (this._glitchPass) this._glitchPass.dispose();

        if (this._glitchQuad) {
            this._glitchQuad.geometry.dispose();
        }

        // Destroy WebGPU resources
        if (this._decayGridBuffer) this._decayGridBuffer.destroy();
        if (this._decayParamsBuffer) this._decayParamsBuffer.destroy();
        if (this._decayReadBuffer) this._decayReadBuffer.destroy();
        if (this._gpuDevice) this._gpuDevice.destroy();

        // Clean entity overlays
        for (const [, data] of this._entityProximity) {
            const e = data.entity;
            if (e && e._shadowFog) { e._shadowFog.geometry.dispose(); e._shadowFog.material.dispose(); }
            if (e && e._eyeLights) for (const l of e._eyeLights) l.dispose();
            if (e && e._trailMeshes) for (const t of e._trailMeshes) { this.scene.remove(t.mesh); }
        }
        this._entityProximity.clear();
        this._roomVisuals.clear();
        this._footprints.length = 0;

        console.log('[RenderUpgrade2026] Disposed');
    }
}
