/**
 * Advanced Rendering System
 * WebGPU-ready renderer with post-processing, dynamic lighting, and LOD
 */

class AdvancedRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      antialias: true,
      powerPreference: 'high-performance',
      shadowMap: true,
      ...options
    };
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    
    this.lights = [];
    this.shadows = {
      enabled: true,
      mapSize: 2048
    };
    
    this.postProcessing = {
      enabled: true,
      bloom: true,
      ssao: true,
      colorGrading: true,
      filmGrain: true,
      vignette: true,
      motionBlur: false
    };
    
    this.performance = {
      targetFPS: 60,
      autoAdjustQuality: true,
      currentQuality: 'high'
    };
  }
  
  async initialize() {
    // Create Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.options.antialias,
      powerPreference: this.options.powerPreference,
      precision: 'highp',
      stencil: false,
      alpha: false
    });
    
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = this.options.shadowMap;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Auto-detect quality
    if (this.performance.autoAdjustQuality) {
      this.detectGPUQuality();
    }
    
    console.log('✅ Advanced Renderer initialized');
    return this.renderer;
  }
  
  detectGPUQuality() {
    const gl = this.canvas.getContext('webgl');
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    // Estimate VRAM
    const vram = this.estimateVRAM(gl);
    
    // Determine quality level
    let quality = 'medium';
    
    if (renderer.includes('RTX') || renderer.includes('RX 6') || renderer.includes('RX 7')) {
      quality = 'ultra';
    } else if (renderer.includes('GTX 10') || renderer.includes('RTX 30') || renderer.includes('RX 5')) {
      quality = 'high';
    } else if (renderer.includes('GTX 9') || renderer.includes('RX 4')) {
      quality = 'medium';
    } else {
      quality = 'low';
    }
    
    // Adjust based on VRAM
    if (vram < 2000) quality = 'low';
    else if (vram < 4000 && quality === 'high') quality = 'medium';
    
    this.performance.currentQuality = quality;
    this.applyQualitySettings(quality);
    
    console.log(`🎮 GPU Quality: ${quality} (VRAM: ~${vram}MB)`);
  }
  
  estimateVRAM(gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 2000;
    
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    // Rough estimates based on GPU names
    if (renderer.includes('RTX 40')) return 12000;
    if (renderer.includes('RTX 30')) return 8000;
    if (renderer.includes('RTX 20')) return 6000;
    if (renderer.includes('GTX 1080')) return 8000;
    if (renderer.includes('GTX 1070')) return 6000;
    if (renderer.includes('GTX 1060')) return 4000;
    if (renderer.includes('RX 7')) return 12000;
    if (renderer.includes('RX 6')) return 8000;
    if (renderer.includes('RX 5')) return 6000;
    
    return 2000; // Default conservative estimate
  }
  
  applyQualitySettings(quality) {
    const settings = {
      ultra: {
        shadowMapSize: 4096,
        pixelRatio: 2,
        maxZombies: 2000,
        enableShadows: true,
        enableSSAO: true,
        enableBloom: true,
        enableReflections: true
      },
      high: {
        shadowMapSize: 2048,
        pixelRatio: 1.5,
        maxZombies: 1000,
        enableShadows: true,
        enableSSAO: true,
        enableBloom: true,
        enableReflections: false
      },
      medium: {
        shadowMapSize: 1024,
        pixelRatio: 1,
        maxZombies: 500,
        enableShadows: true,
        enableSSAO: false,
        enableBloom: true,
        enableReflections: false
      },
      low: {
        shadowMapSize: 512,
        pixelRatio: 0.75,
        maxZombies: 200,
        enableShadows: false,
        enableSSAO: false,
        enableBloom: false,
        enableReflections: false
      }
    };
    
    const config = settings[quality];
    
    this.renderer.setPixelRatio(config.pixelRatio);
    this.shadows.mapSize = config.shadowMapSize;
    this.shadows.enabled = config.enableShadows;
    this.postProcessing.ssao = config.enableSSAO;
    this.postProcessing.bloom = config.enableBloom;
    
    // Update shadow maps
    this.scene?.traverse(object => {
      if (object.isLight && object.castShadow) {
        object.shadow.mapSize.width = config.shadowMapSize;
        object.shadow.mapSize.height = config.shadowMapSize;
        object.shadow.camera.updateProjectionMatrix();
      }
    });
    
    window.GAME_MAX_ZOMBIES = config.maxZombies;
  }
  
  createScene() {
    this.scene = new THREE.Scene();
    
    // Fog for atmosphere
    this.scene.fog = new THREE.FogExp2(0x0a0a00, 0.015);
    this.scene.background = new THREE.Color(0x0a0a00);
    
    return this.scene;
  }
  
  setupCamera(aspect, fov = 50) {
    this.camera = new THREE.PerspectiveCamera(
      fov,
      aspect,
      0.1,
      1000
    );
    
    this.camera.position.set(0, 30, 40);
    this.camera.lookAt(0, 0, 0);
    
    return this.camera;
  }
  
  setupLighting(config = {}) {
    const {
      sunIntensity = 1.0,
      ambientIntensity = 0.3,
      hemiIntensity = 0.2,
      sunColor = 0xffffff,
      ambientColor = 0x445566,
      hemiSky = 0x88aacc,
      hemiGround = 0x445533
    } = config;
    
    // Sun (Directional Light)
    this.sunLight = new THREE.DirectionalLight(sunColor, sunIntensity);
    this.sunLight.position.set(50, 100, 50);
    this.sunLight.castShadow = this.shadows.enabled;
    
    if (this.shadows.enabled) {
      this.sunLight.shadow.mapSize.width = this.shadows.mapSize;
      this.sunLight.shadow.mapSize.height = this.shadows.mapSize;
      this.sunLight.shadow.camera.left = -100;
      this.sunLight.shadow.camera.right = 100;
      this.sunLight.shadow.camera.top = 100;
      this.sunLight.shadow.camera.bottom = -100;
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 200;
      this.sunLight.shadow.bias = -0.0001;
      this.sunLight.shadow.normalBias = 0.02;
    }
    
    this.scene.add(this.sunLight);
    this.lights.push(this.sunLight);
    
    // Ambient Light
    this.ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
    this.scene.add(this.ambientLight);
    this.lights.push(this.ambientLight);
    
    // Hemisphere Light
    this.hemiLight = new THREE.HemisphereLight(hemiSky, hemiGround, hemiIntensity);
    this.scene.add(this.hemiLight);
    this.lights.push(this.hemiLight);
    
    return {
      sun: this.sunLight,
      ambient: this.ambientLight,
      hemisphere: this.hemiLight
    };
  }
  
  createDynamicLight(config) {
    const {
      type = 'point',
      position = { x: 0, y: 0, z: 0 },
      color = 0xffffff,
      intensity = 1.0,
      range = 10,
      castShadow = false,
      flicker = false
    } = config;
    
    let light;
    
    if (type === 'point') {
      light = new THREE.PointLight(color, intensity, range);
      light.position.set(position.x, position.y, position.z);
      
      if (castShadow) {
        light.castShadow = true;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
      }
    } else if (type === 'spot') {
      const { angle = Math.PI / 6, penumbra = 0.2 } = config;
      light = new THREE.SpotLight(color, intensity, range, angle, penumbra);
      light.position.set(position.x, position.y, position.z);
      
      if (castShadow) {
        light.castShadow = true;
      }
    }
    
    if (flicker) {
      light.userData.flicker = true;
      light.userData.flickerSpeed = 5 + Math.random() * 5;
      light.userData.flickerAmount = 0.3;
    }
    
    this.scene.add(light);
    this.lights.push(light);
    
    return light;
  }
  
  updateDynamicLights(deltaTime) {
    const time = performance.now() * 0.001;
    
    this.lights.forEach(light => {
      if (light.userData.flicker) {
        const flickerSpeed = light.userData.flickerSpeed || 5;
        const flickerAmount = light.userData.flickerAmount || 0.3;
        
        const flicker = Math.sin(time * flickerSpeed) * 0.5 +
                       Math.sin(time * flickerSpeed * 2.3) * 0.3 +
                       Math.random() * flickerAmount;
        
        light.intensity = light.userData.baseIntensity || light.intensity;
        light.intensity *= (0.7 + flicker * 0.3);
      }
    });
  }
  
  setupPostProcessing() {
    if (!this.postProcessing.enabled) return;
    
    this.composer = new THREE.EffectComposer(this.renderer);
    
    // Render pass
    const renderPass = new THREE.RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    // SSAO Pass
    if (this.postProcessing.ssao) {
      const ssaoPass = new THREE.SSAOPass(this.scene, this.camera, window.innerWidth, window.innerHeight);
      ssaoPass.kernelRadius = 16;
      ssaoPass.minDistance = 0.005;
      ssaoPass.maxDistance = 0.1;
      this.composer.addPass(ssaoPass);
    }
    
    // Bloom Pass
    if (this.postProcessing.bloom) {
      const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5,  // strength
        0.4,  // radius
        0.85  // threshold
      );
      this.composer.addPass(bloomPass);
    }
    
    // Color Grading (custom shader pass)
    if (this.postProcessing.colorGrading) {
      const colorGradingPass = new THREE.ShaderPass(ColorGradingShader);
      colorGradingPass.uniforms.contrast.value = 1.1;
      colorGradingPass.uniforms.saturation.value = 1.2;
      colorGradingPass.uniforms.brightness.value = 1.0;
      this.composer.addPass(colorGradingPass);
    }
    
    // Film Grain
    if (this.postProcessing.filmGrain) {
      const filmGrainPass = new THREE.ShaderPass(FilmGrainShader);
      filmGrainPass.uniforms.intensity.value = 0.15;
      filmGrainPass.uniforms.size.value = 1.5;
      this.composer.addPass(filmGrainPass);
    }
    
    // Vignette
    if (this.postProcessing.vignette) {
      const vignettePass = new THREE.ShaderPass(VignetteShader);
      vignettePass.uniforms.darkness.value = 0.6;
      vignettePass.uniforms.offset.value = 0.8;
      this.composer.addPass(vignettePass);
    }
    
    return this.composer;
  }
  
  render() {
    if (this.composer && this.postProcessing.enabled) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }
  
  // Create horror atmosphere
  setupHorrorAtmosphere() {
    // Dark fog
    this.scene.fog = new THREE.FogExp2(0x050505, 0.02);
    this.scene.background = new THREE.Color(0x050505);
    
    // Dim lighting
    this.ambientLight.intensity = 0.2;
    this.sunLight.intensity = 0.5;
    
    // Add some eerie colored lights
    this.createDynamicLight({
      type: 'point',
      position: { x: -10, y: 5, z: -10 },
      color: 0x00ff00,
      intensity: 0.5,
      range: 20,
      flicker: true
    });
    
    this.createDynamicLight({
      type: 'point',
      position: { x: 10, y: 5, z: 10 },
      color: 0xff0000,
      intensity: 0.3,
      range: 15,
      flicker: true
    });
  }
}

// === SHADER DEFINITIONS ===

const ColorGradingShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'contrast': { value: 1.0 },
    'saturation': { value: 1.0 },
    'brightness': { value: 1.0 }
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
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Contrast
      color.rgb = ((color.rgb - 0.5) * contrast) + 0.5;
      
      // Saturation
      float luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
      color.rgb = mix(vec3(luminance), color.rgb, saturation);
      
      // Brightness
      color.rgb *= brightness;
      
      gl_FragColor = color;
    }
  `
};

const FilmGrainShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'intensity': { value: 0.15 },
    'size': { value: 1.5 }
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
    
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      float grain = rand(vUv * size) * intensity;
      color.rgb += grain;
      
      gl_FragColor = color;
    }
  `
};

const VignetteShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'darkness': { value: 0.6 },
    'offset': { value: 0.8 }
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
    uniform float darkness;
    uniform float offset;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      vec2 uv = vUv * 2.0 - 1.0;
      float dist = length(uv);
      float vignette = smoothstep(offset, offset - darkness, dist);
      
      color.rgb *= vignette;
      
      gl_FragColor = color;
    }
  `
};

// Export
window.AdvancedRenderer = AdvancedRenderer;
console.log('✅ Advanced Renderer module loaded');
