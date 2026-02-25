// Caribbean Conquest - 3D Renderer Engine
// Handles Three.js scene setup, lighting, and rendering

class GameRenderer {
    constructor(game) {
        this.game = game;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.container = null;
        
        // Render settings
        this.shadowsEnabled = true;
        this.antialias = true;
        this.pixelRatio = Math.min(window.devicePixelRatio, 2);
        
        // Lighting
        this.sunLight = null;
        this.ambientLight = null;
        this.hemisphereLight = null;
    }
    
    async init() {
        this.container = document.getElementById('game-container');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.0008);
        
        // Create camera (will be replaced by camera controller)
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            20000
        );
        this.camera.position.set(0, 50, 100);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.antialias,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.shadowMap.enabled = this.shadowsEnabled;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        this.container.appendChild(this.renderer.domElement);
        
        // Setup lighting
        this.setupLighting();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
        
        return true;
    }
    
    setupLighting() {
        // Hemisphere light (sky/ground gradient)
        this.hemisphereLight = new THREE.HemisphereLight(
            0x87CEEB, // Sky color
            0x3d5c5c, // Ground/water color
            0.6
        );
        this.scene.add(this.hemisphereLight);
        
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0x404080, 0.3);
        this.scene.add(this.ambientLight);
        
        // Sun light (directional)
        this.sunLight = new THREE.DirectionalLight(0xffffee, 1.2);
        this.sunLight.position.set(500, 500, 500);
        this.sunLight.castShadow = true;
        
        // Shadow settings
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 2000;
        this.sunLight.shadow.camera.left = -500;
        this.sunLight.shadow.camera.right = 500;
        this.sunLight.shadow.camera.top = 500;
        this.sunLight.shadow.camera.bottom = -500;
        this.sunLight.shadow.bias = -0.0001;
        
        this.scene.add(this.sunLight);
    }
    
    updateSunPosition(time) {
        // Calculate sun position based on time of day
        const dayProgress = (time % 86400) / 86400; // 24-hour cycle
        const sunAngle = dayProgress * Math.PI * 2 - Math.PI / 2;
        
        const sunRadius = 1000;
        this.sunLight.position.x = Math.cos(sunAngle) * sunRadius;
        this.sunLight.position.y = Math.sin(sunAngle) * sunRadius;
        this.sunLight.position.z = 200;
        
        // Adjust light intensity based on time
        const intensity = Math.max(0, Math.sin(sunAngle)) * 1.5 + 0.2;
        this.sunLight.intensity = intensity;
        
        // Adjust colors for sunrise/sunset
        if (dayProgress > 0.2 && dayProgress < 0.3) {
            // Sunrise - warm orange
            this.sunLight.color.setHex(0xFFAA55);
            this.scene.fog.color.setHex(0xFFAA88);
        } else if (dayProgress > 0.7 && dayProgress < 0.8) {
            // Sunset - warm red
            this.sunLight.color.setHex(0xFF6644);
            this.scene.fog.color.setHex(0xFF8866);
        } else if (dayProgress > 0.8 || dayProgress < 0.2) {
            // Night - blue tint
            this.sunLight.color.setHex(0x4466AA);
            this.scene.fog.color.setHex(0x223355);
        } else {
            // Day - normal
            this.sunLight.color.setHex(0xFFFFEE);
            this.scene.fog.color.setHex(0x87CEEB);
        }
    }
    
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    setCamera(camera) {
        this.camera = camera;
    }
    
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    // Add object to scene
    add(object) {
        this.scene.add(object);
    }
    
    // Remove object from scene
    remove(object) {
        this.scene.remove(object);
    }
}