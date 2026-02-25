/**
 * ============================================
 * THE DEEP - PHASE 6: UNDERWATER HORROR GAME
 * Complete Implementation
 * ============================================
 * 
 * A terrifying underwater exploration game set in the Mariana Trench.
 * Features:
 * - Pressure management system
 * - Sonar-based navigation
 * - Bioluminescent creatures
 * - Submarine upgrade system
 * - Lovecraftian horror elements
 */

class TheDeepGame {
  constructor() {
    // Game state
    this.initialized = false;
    this.gameActive = false;
    this.paused = false;
    
    // Player/Submarine state
    this.submarine = {
      position: { x: 0, y: -100, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      depth: 0,
      pressure: 0,
      oxygen: 100,
      fuel: 100,
      health: 100,
      hullIntegrity: 100,
      upgrades: []
    };
    
    // Game systems
    this.pressureSystem = null;
    this.sonarSystem = null;
    this.creatureSystem = null;
    this.upgradeSystem = null;
    this.environmentSystem = null;
    
    // World generation
    this.worldChunks = new Map();
    this.chunkSize = 100;
    this.renderDistance = 5;
    
    // Creatures and encounters
    this.activeCreatures = [];
    this.encounters = [];
    
    // Resources
    this.resources = {
      scrap: 0,
      crystals: 0,
      samples: 0
    };
    
    // Mission/Quest system
    this.currentMission = null;
    this.missions = [];
  }
  
  /**
   * Initialize the game
   */
  async initialize() {
    console.log('[The Deep] Initializing...');
    
    try {
      // Setup Three.js scene
      await this.setupScene();
      
      // Initialize game systems
      this.pressureSystem = new PressureSystem(this);
      this.sonarSystem = new SonarSystem(this);
      this.creatureSystem = new CreatureSystem(this);
      this.upgradeSystem = new UpgradeSystem(this);
      this.environmentSystem = new EnvironmentSystem(this);
      
      // Generate initial world
      await this.generateInitialWorld();
      
      // Setup controls
      this.setupControls();
      
      // Setup UI
      this.setupUI();
      
      this.initialized = true;
      this.gameActive = true;
      
      console.log('[The Deep] ✓ Game initialized successfully');
      
      // Start game loop
      this.lastTime = performance.now();
      this.gameLoop();
      
    } catch (error) {
      console.error('[The Deep] ✗ Initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Setup Three.js scene, camera, renderer
   */
  async setupScene() {
    // Import Three.js
    const THREE = await import('three');
    
    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x001e36, 0.02);
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.set(0, 5, 10);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    
    // Add to DOM
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }
    
    // Lighting
    this.setupLighting();
    
    // Handle resize
    window.addEventListener('resize', () => this.onWindowResize(), false);
  }
  
  /**
   * Setup underwater lighting
   */
  setupLighting() {
    const THREE = await import('three');
    
    // Ambient light (dim blue)
    const ambientLight = new THREE.AmbientLight(0x001e36, 0.5);
    this.scene.add(ambientLight);
    
    // Submarine spotlight
    this.spotLight = new THREE.SpotLight(0xffffff, 2);
    this.spotLight.position.set(0, 0, 0);
    this.spotLight.angle = Math.PI / 6;
    this.spotLight.penumbra = 0.5;
    this.spotLight.distance = 100;
    this.spotLight.castShadow = true;
    this.scene.add(this.spotLight);
    
    // Bioluminescent particles
    this.createBioluminescentParticles();
  }
  
  /**
   * Create bioluminescent particle system
   */
  createBioluminescentParticles() {
    const THREE = await import('three');
    
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 500 - 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 500;
      
      // Blue-green bioluminescent colors
      colors[i * 3] = 0.0;
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.5;
      colors[i * 3 + 2] = 1.0;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }
  
  /**
   * Generate initial underwater world
   */
  async generateInitialWorld() {
    console.log('[The Deep] Generating underwater world...');
    
    // Generate terrain chunks around player
    for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
      for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
        this.generateChunk(x, z);
      }
    }
    
    // Create starting area
    this.createStartingArea();
    
    // Spawn initial creatures
    this.creatureSystem.spawnInitialCreatures();
  }
  
  /**
   * Generate a terrain chunk
   */
  generateChunk(chunkX, chunkZ) {
    const THREE = await import('three');
    
    const key = `${chunkX},${chunkZ}`;
    if (this.worldChunks.has(key)) return;
    
    // Create chunk geometry
    const geometry = new THREE.PlaneGeometry(
      this.chunkSize,
      this.chunkSize,
      50,
      50
    );
    
    // Displace vertices for terrain
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      // Perlin noise-like displacement
      const noise = this.simpleNoise(x + chunkX * this.chunkSize, y + chunkZ * this.chunkSize);
      positions[i + 2] = noise * 50; // Height variation
    }
    
    geometry.computeVertexNormals();
    
    // Material
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(
      chunkX * this.chunkSize,
      -1000, // Deep ocean floor
      chunkZ * this.chunkSize
    );
    
    this.scene.add(mesh);
    this.worldChunks.set(key, mesh);
  }
  
  /**
   * Simple noise function for terrain generation
   */
  simpleNoise(x, y) {
    const sin = Math.sin(x * 0.1 + y * 0.1) * Math.cos(x * 0.05 - y * 0.05);
    const cos = Math.cos(x * 0.07 + y * 0.08);
    return (sin + cos) * 0.5;
  }
  
  /**
   * Create starting area with tutorial elements
   */
  createStartingArea() {
    // Research station
    this.createResearchStation();
    
    // Tutorial markers
    this.createTutorialMarkers();
    
    // Initial resources
    this.spawnResourceCluster();
  }
  
  /**
   * Setup player controls
   */
  setupControls() {
    this.controls = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      boost: false,
      lights: false,
      sonar: false
    };
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => this.onKeyDown(e), false);
    document.addEventListener('keyup', (e) => this.onKeyUp(e), false);
    
    // Mouse controls
    document.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
    document.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
  }
  
  onKeyDown(event) {
    switch (event.code) {
      case 'KeyW': this.controls.forward = true; break;
      case 'KeyS': this.controls.backward = true; break;
      case 'KeyA': this.controls.left = true; break;
      case 'KeyD': this.controls.right = true; break;
      case 'Space': this.controls.up = true; break;
      case 'ShiftLeft': this.controls.down = true; break;
      case 'KeyQ': this.controls.boost = true; break;
      case 'KeyF': this.controls.lights = true; break;
      case 'KeyE': this.controls.sonar = true; break;
    }
  }
  
  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW': this.controls.forward = false; break;
      case 'KeyS': this.controls.backward = false; break;
      case 'KeyA': this.controls.left = false; break;
      case 'KeyD': this.controls.right = false; break;
      case 'Space': this.controls.up = false; break;
      case 'ShiftLeft': this.controls.down = false; break;
      case 'KeyQ': this.controls.boost = false; break;
      case 'KeyF': this.controls.lights = false; break;
      case 'KeyE': this.controls.sonar = false; break;
    }
  }
  
  onMouseMove(event) {
    if (!this.gameActive || this.paused) return;
    
    // Rotate submarine based on mouse movement
    this.submarine.rotation.y -= event.movementX * 0.002;
    this.submarine.rotation.x -= event.movementY * 0.002;
    
    // Clamp vertical rotation
    this.submarine.rotation.x = Math.max(
      -Math.PI / 3,
      Math.min(Math.PI / 3, this.submarine.rotation.x)
    );
  }
  
  onMouseDown(event) {
    if (!this.gameActive || this.paused) return;
    
    // Left click: Use tool/weapon
    if (event.button === 0) {
      this.useTool();
    }
    
    // Right click: Alternative action
    if (event.button === 2) {
      this.alternativeAction();
    }
  }
  
  /**
   * Main game loop
   */
  gameLoop() {
    requestAnimationFrame(() => this.gameLoop());
    
    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    
    if (!this.gameActive || this.paused) return;
    
    // Update systems
    this.updateSubmarine(deltaTime);
    this.pressureSystem.update(deltaTime);
    this.sonarSystem.update(deltaTime);
    this.creatureSystem.update(deltaTime);
    this.environmentSystem.update(deltaTime);
    this.updateChunks();
    
    // Render
    this.renderer.render(this.scene, this.camera);
    
    // Update UI
    this.updateUI(deltaTime);
  }
  
  /**
   * Update submarine physics and movement
   */
  updateSubmarine(deltaTime) {
    const speed = this.controls.boost ? 15 : 8;
    const acceleration = 5;
    
    // Calculate movement direction
    const direction = new THREE.Vector3();
    
    if (this.controls.forward) direction.z -= 1;
    if (this.controls.backward) direction.z += 1;
    if (this.controls.left) direction.x -= 1;
    if (this.controls.right) direction.x += 1;
    if (this.controls.up) direction.y += 1;
    if (this.controls.down) direction.y -= 1;
    
    // Apply rotation to direction
    direction.applyEuler(new THREE.Euler(
      this.submarine.rotation.x,
      this.submarine.rotation.y,
      0
    ));
    
    // Normalize and apply speed
    if (direction.length() > 0) {
      direction.normalize();
      this.submarine.velocity.x += direction.x * acceleration * deltaTime;
      this.submarine.velocity.y += direction.y * acceleration * deltaTime;
      this.submarine.velocity.z += direction.z * acceleration * deltaTime;
    }
    
    // Apply drag
    const drag = 0.95;
    this.submarine.velocity.x *= drag;
    this.submarine.velocity.y *= drag;
    this.submarine.velocity.z *= drag;
    
    // Update position
    this.submarine.position.x += this.submarine.velocity.x * deltaTime;
    this.submarine.position.y += this.submarine.velocity.y * deltaTime;
    this.submarine.position.z += this.submarine.velocity.z * deltaTime;
    
    // Update depth
    this.submarine.depth = -this.submarine.position.y;
    
    // Update pressure based on depth
    this.submarine.pressure = this.pressureSystem.calculatePressure(this.submarine.depth);
    
    // Consume resources
    this.consumeResources(deltaTime);
    
    // Update camera to follow submarine
    this.camera.position.copy(this.submarine.position);
    this.camera.rotation.set(
      this.submarine.rotation.x,
      this.submarine.rotation.y,
      0
    );
    
    // Update spotlight
    if (this.spotLight) {
      this.spotLight.position.copy(this.submarine.position);
      this.spotLight.target.position.copy(
        new THREE.Vector3(
          this.submarine.position.x - Math.sin(this.submarine.rotation.y) * 10,
          this.submarine.position.y,
          this.submarine.position.z - Math.cos(this.submarine.rotation.y) * 10
        )
      );
      this.spotLight.target.updateMatrixWorld();
    }
  }
  
  /**
   * Consume oxygen and fuel over time
   */
  consumeResources(deltaTime) {
    // Oxygen consumption
    const oxygenConsumption = 2; // per second
    this.submarine.oxygen -= oxygenConsumption * deltaTime;
    
    // Fuel consumption (increases with boost)
    const fuelConsumption = this.controls.boost ? 10 : 3;
    this.submarine.fuel -= fuelConsumption * deltaTime;
    
    // Check for depletion
    if (this.submarine.oxygen <= 0) {
      this.submarine.oxygen = 0;
      this.takeDamage(5 * deltaTime, 'suffocation');
    }
    
    if (this.submarine.fuel <= 0) {
      this.submarine.fuel = 0;
      // Drift helplessly
    }
  }
  
  /**
   * Take damage from various sources
   */
  takeDamage(amount, source) {
    this.submarine.health -= amount;
    this.submarine.hullIntegrity -= amount * 0.5;
    
    // Visual feedback
    this.showDamageIndicator(source);
    
    // Check for game over
    if (this.submarine.health <= 0 || this.submarine.hullIntegrity <= 0) {
      this.gameOver();
    }
  }
  
  /**
   * Update active world chunks based on player position
   */
  updateChunks() {
    const currentChunkX = Math.floor(this.submarine.position.x / this.chunkSize);
    const currentChunkZ = Math.floor(this.submarine.position.z / this.chunkSize);
    
    // Generate new chunks in view
    for (let x = currentChunkX - this.renderDistance; x <= currentChunkX + this.renderDistance; x++) {
      for (let z = currentChunkZ - this.renderDistance; z <= currentChunkZ + this.renderDistance; z++) {
        this.generateChunk(x, z);
      }
    }
    
    // Remove distant chunks
    const keysToRemove = [];
    this.worldChunks.forEach((chunk, key) => {
      const [chunkX, chunkZ] = key.split(',').map(Number);
      const dx = Math.abs(chunkX - currentChunkX);
      const dz = Math.abs(chunkZ - currentChunkZ);
      
      if (dx > this.renderDistance + 2 || dz > this.renderDistance + 2) {
        // Remove from scene
        this.scene.remove(chunk);
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => this.worldChunks.delete(key));
  }
  
  /**
   * Setup UI elements
   */
  setupUI() {
    // Create HUD overlay
    const hudHTML = `
      <div id="deep-hud">
        <div class="hud-top">
          <div class="depth-gauge">
            <span class="label">DEPTH</span>
            <span class="value" id="depth-value">0</span>
            <span class="unit">m</span>
          </div>
          <div class="pressure-gauge">
            <span class="label">PRESSURE</span>
            <span class="value" id="pressure-value">0</span>
            <span class="unit">ATM</span>
          </div>
        </div>
        
        <div class="hud-bottom">
          <div class="status-bars">
            <div class="status-bar">
              <span class="bar-label">HULL</span>
              <div class="bar-container">
                <div class="bar-fill" id="hull-bar"></div>
              </div>
            </div>
            <div class="status-bar">
              <span class="bar-label">OXYGEN</span>
              <div class="bar-container">
                <div class="bar-fill" id="oxygen-bar"></div>
              </div>
            </div>
            <div class="status-bar">
              <span class="bar-label">FUEL</span>
              <div class="bar-container">
                <div class="bar-fill" id="fuel-bar"></div>
              </div>
            </div>
          </div>
          
          <div class="resources">
            <div class="resource-item">
              <span class="icon">🔧</span>
              <span class="amount" id="scrap-count">0</span>
            </div>
            <div class="resource-item">
              <span class="icon">💎</span>
              <span class="amount" id="crystal-count">0</span>
            </div>
            <div class="resource-item">
              <span class="icon">🧬</span>
              <span class="amount" id="sample-count">0</span>
            </div>
          </div>
        </div>
        
        <div class="sonar-display" id="sonar-display">
          <canvas id="sonar-canvas"></canvas>
        </div>
      </div>
    `;
    
    const container = document.getElementById('game-container');
    if (container) {
      const hudDiv = document.createElement('div');
      hudDiv.innerHTML = hudHTML;
      container.appendChild(hudDiv);
    }
  }
  
  /**
   * Update HUD elements
   */
  updateUI(deltaTime) {
    // Update gauges
    document.getElementById('depth-value').textContent = Math.round(this.submarine.depth);
    document.getElementById('pressure-value').textContent = this.submarine.pressure.toFixed(1);
    
    // Update bars
    const hullBar = document.getElementById('hull-bar');
    const oxygenBar = document.getElementById('oxygen-bar');
    const fuelBar = document.getElementById('fuel-bar');
    
    if (hullBar) hullBar.style.width = `${this.submarine.hullIntegrity}%`;
    if (oxygenBar) oxygenBar.style.width = `${this.submarine.oxygen}%`;
    if (fuelBar) fuelBar.style.width = `${this.submarine.fuel}%`;
    
    // Color coding for low resources
    if (this.submarine.oxygen < 20) oxygenBar.style.background = '#ff0000';
    if (this.submarine.fuel < 20) fuelBar.style.background = '#ff0000';
    
    // Update resource counts
    document.getElementById('scrap-count').textContent = this.resources.scrap;
    document.getElementById('crystal-count').textContent = this.resources.crystals;
    document.getElementById('sample-count').textContent = this.resources.samples;
    
    // Update sonar display
    this.sonarSystem.renderToCanvas();
  }
  
  /**
   * Show damage indicator
   */
  showDamageIndicator(source) {
    // Visual feedback for damage
    const flash = document.createElement('div');
    flash.className = 'damage-flash';
    flash.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, transparent 50%, rgba(255,0,0,0.5) 100%);
      pointer-events: none;
      animation: fadeOut 0.5s ease-out;
    `;
    
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(flash);
      setTimeout(() => flash.remove(), 500);
    }
  }
  
  /**
   * Game over handler
   */
  gameOver() {
    this.gameActive = false;
    
    const gameOverScreen = document.createElement('div');
    gameOverScreen.className = 'game-over-screen';
    gameOverScreen.innerHTML = `
      <div class="game-over-content">
        <h1>MISSION FAILED</h1>
        <p>Your submarine was crushed by the immense pressure of the deep.</p>
        <div class="final-stats">
          <div>Max Depth: ${Math.round(this.submarine.depth)}m</div>
          <div>Resources Collected: ${this.resources.scrap + this.resources.crystals + this.resources.samples}</div>
          <div>Time Survived: ${Math.round((performance.now() - this.startTime) / 1000)}s</div>
        </div>
        <button onclick="location.reload()">TRY AGAIN</button>
      </div>
    `;
    
    gameOverScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      color: white;
      font-family: Arial, sans-serif;
    `;
    
    document.body.appendChild(gameOverScreen);
  }
  
  /**
   * Window resize handler
   */
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Export game class
export { TheDeepGame };

/*
// USAGE:
import { TheDeepGame } from './the-deep-game.js';

const game = new TheDeepGame();
await game.initialize();
*/
