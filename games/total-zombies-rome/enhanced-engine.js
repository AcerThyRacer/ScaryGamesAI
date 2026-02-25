/**
 * Total War: Zombies - Enhanced Engine
 * Phase 1 & 2 Complete Implementation
 * ECS Architecture + Advanced Zombie AI
 */

class EnhancedZombieEngine {
  constructor() {
    this.initialized = false;
    this.entityManager = null;
    this.systems = [];
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    
    this.gameState = {
      isRunning: false,
      isPaused: false,
      difficulty: 'normal',
      maxZombies: 1000,
      currentWave: 0
    };
    
    this.clock = new THREE.Clock();
    this.lastTime = 0;
  }
  
  async initialize(canvas) {
    console.log('🚀 Initializing Enhanced Zombie Engine...');
    
    // Register ECS components
    ECS.registerComponents();
    
    // Create entity manager
    this.entityManager = new ECS.EntityManager();
    
    // Setup renderer
    this.renderer = new AdvancedRenderer(canvas);
    await this.renderer.initialize();
    this.scene = this.renderer.createScene();
    this.camera = this.renderer.setupCamera(canvas.width / canvas.height);
    this.renderer.setupLighting();
    this.renderer.setupPostProcessing();
    
    // Setup event bus
    window.EventBus = new EventTarget();
    
    // Create systems
    this.createSystems();
    
    // Setup game bounds
    window.GAME_BOUNDS = { x: 100, z: 100 };
    window.GAME_MAX_ZOMBIES = this.gameState.maxZombies;
    
    // Handle resize
    window.addEventListener('resize', () => this.onResize());
    
    this.initialized = true;
    console.log('✅ Enhanced Engine initialized successfully');
    
    return this;
  }
  
  createSystems() {
    // Create swarm AI
    this.swarmAI = new ZombieSwarmAI(this.entityManager);
    
    // Create ECS systems
    this.systems = [
      new ECS.Systems.MovementSystem(this.entityManager),
      new ECS.Systems.HealthSystem(this.entityManager),
      new ECS.Systems.CombatSystem(this.entityManager),
      new ECS.Systems.ZombieAISystem(this.entityManager, this.swarmAI),
      new ECS.Systems.FormationSystem(this.entityManager),
      new ECS.Systems.AnimationSystem(this.entityManager),
      new ECS.Systems.RenderingSystem(this.entityManager, this.scene, this.camera)
    ];
    
    // Sort by priority
    this.systems.sort((a, b) => b.priority - a.priority);
    
    console.log(`✅ Created ${this.systems.length} ECS systems`);
  }
  
  // === ENTITY CREATION ===
  
  createZombie(type, position, faction = 'enemy') {
    const entity = this.entityManager.createEntity();
    
    // Get zombie type data
    const typeData = ZombieTypes[type] || ZombieTypes.shambler;
    
    // Add components
    entity
      .addComponent('position', { x: position.x, y: 0, z: position.z })
      .addComponent('rotation', { x: 0, y: 0, z: 0, w: 1 })
      .addComponent('scale', { x: typeData.modelScale || 1, y: typeData.modelScale || 1, z: typeData.modelScale || 1 })
      .addComponent('velocity')
      .addComponent('movement', {
        speed: typeData.stats.speed,
        maxSpeed: typeData.stats.speed * 1.5
      })
      .addComponent('health', {
        current: typeData.stats.health,
        max: typeData.stats.health,
        damageModifiers: {
          headshot: 2.0,
          fire: 1.5
        }
      })
      .addComponent('faction', {
        team: faction,
        factionId: faction === 'player' ? 1 : 2
      })
      .addComponent('zombieAI', {
        state: 'idle',
        aggression: typeData.stats.aggression
      })
      .addComponent('combat', {
        damage: typeData.stats.damage,
        attackRange: 1.5,
        attackCooldown: 1.0 / typeData.stats.speed
      })
      .addComponent('zombieType', {
        type: type,
        abilities: typeData.abilities,
        weaknesses: typeData.weaknesses
      })
      .addComponent('senses', {
        vision: { range: typeData.stats.detectionRange }
      })
      .addComponent('lod', {
        distances: [0, 20, 50, 100]
      });
    
    // Create visual mesh
    this.createZombieMesh(entity, typeData);
    
    return entity;
  }
  
  createHuman(position, faction = 'player') {
    const entity = this.entityManager.createEntity();
    
    entity
      .addComponent('position', { x: position.x, y: 0, z: position.z })
      .addComponent('rotation')
      .addComponent('scale')
      .addComponent('velocity')
      .addComponent('movement', {
        speed: 4.0,
        maxSpeed: 6.0
      })
      .addComponent('health', {
        current: 100,
        max: 100,
        regen: 1
      })
      .addComponent('faction', {
        team: faction,
        factionId: faction === 'player' ? 1 : 2
      })
      .addComponent('humanAI', {
        state: 'idle',
        autoAttack: true
      })
      .addComponent('combat', {
        damage: 25,
        attackRange: 2.0,
        attackCooldown: 0.5
      })
      .addComponent('weapon', {
        type: 'assault_rifle',
        damage: 25,
        range: 100,
        ammo: 30,
        maxAmmo: 30,
        reloadTime: 2.0
      });
    
    // Create visual mesh
    this.createHumanMesh(entity);
    
    return entity;
  }
  
  createZombieMesh(entity, typeData) {
    // Simple colored box for now (replace with actual models)
    const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
    
    // Color based on type
    let color = 0x556b2f; // Default zombie green
    if (typeData.tier === 'elite') color = 0x8b0000;
    if (typeData.tier === 'boss') color = 0x4b0082;
    if (typeData.environment === 'arctic') color = 0xadd8e6;
    if (typeData.environment === 'desert') color = 0xd2b48c;
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.8,
      metalness: 0.2
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Scale mesh
    if (typeData.modelScale) {
      mesh.scale.setScalar(typeData.modelScale);
    }
    
    this.scene.add(mesh);
    
    entity.getComponent('mesh').mesh = mesh;
  }
  
  createHumanMesh(entity) {
    const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4169e1, // Player blue
      roughness: 0.6,
      metalness: 0.4
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    this.scene.add(mesh);
    entity.getComponent('mesh').mesh = mesh;
  }
  
  // === GAME LOOP ===
  
  start() {
    if (!this.initialized) {
      console.error('Engine not initialized!');
      return;
    }
    
    this.gameState.isRunning = true;
    this.gameState.isPaused = false;
    this.clock.start();
    
    console.log('🎮 Game started');
    this.gameLoop();
  }
  
  pause() {
    this.gameState.isPaused = true;
  }
  
  resume() {
    this.gameState.isPaused = false;
    this.clock.start();
  }
  
  stop() {
    this.gameState.isRunning = false;
  }
  
  gameLoop() {
    if (!this.gameState.isRunning) return;
    
    requestAnimationFrame(() => this.gameLoop());
    
    if (this.gameState.isPaused) return;
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    
    // Update systems
    for (const system of this.systems) {
      if (system.enabled) {
        system.update(deltaTime);
      }
    }
    
    // Update swarm AI
    const zombies = this.entityManager.query('zombieAI', 'position', 'velocity');
    const humans = this.entityManager.query('humanAI', 'position');
    this.swarmAI.update(deltaTime, zombies, humans, []);
    
    // Update renderer
    this.renderer.updateDynamicLights(deltaTime);
    this.renderer.render();
    
    // Cleanup removed entities
    this.entityManager.processRemovals();
    
    // Update stats display
    this.updateStats();
  }
  
  // === WAVE MANAGEMENT ===
  
  startWave(waveNumber) {
    this.gameState.currentWave = waveNumber;
    
    const zombieCount = Math.min(
      this.gameState.maxZombies,
      50 + waveNumber * 20
    );
    
    const spawnPositions = this.getSpawnPositions(zombieCount);
    
    for (let i = 0; i < zombieCount; i++) {
      const type = this.selectZombieType(waveNumber);
      const position = spawnPositions[i];
      
      this.createZombie(type, position);
    }
    
    console.log(`🧟 Wave ${waveNumber} started: ${zombieCount} zombies`);
  }
  
  selectZombieType(waveNumber) {
    // Increase variety with wave number
    const availableTypes = [];
    
    // Always include basic types
    availableTypes.push('shambler', 'runner');
    
    // Add special types from wave 3
    if (waveNumber >= 3) {
      availableTypes.push('bloater', 'spitter', 'howler');
    }
    
    // Add elite types from wave 5
    if (waveNumber >= 5) {
      availableTypes.push('tank', 'hunter', 'charger');
    }
    
    // Add boss types from wave 10
    if (waveNumber >= 10 && Math.random() < 0.1) {
      availableTypes.push('alphaZombie', 'necromancer');
    }
    
    // Select random type
    return availableTypes[Math.floor(Math.random() * availableTypes.length)];
  }
  
  getSpawnPositions(count) {
    const positions = [];
    const bounds = window.GAME_BOUNDS;
    
    for (let i = 0; i < count; i++) {
      // Spawn on edges of map
      const angle = (i / count) * Math.PI * 2;
      const radius = Math.min(bounds.x, bounds.z) * 0.8;
      
      positions.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius
      });
    }
    
    return positions;
  }
  
  // === CAMERA CONTROL ===
  
  setupCameraControl() {
    const cameraPos = { x: 0, z: -30 };
    const cameraDist = 40;
    const cameraAngle = 0;
    
    const keys = {};
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
    
    const updateCamera = () => {
      if (!this.gameState.isRunning) return;
      
      const speed = 20 * 0.016;
      
      if (keys['KeyW'] || keys['ArrowUp']) {
        cameraPos.z -= speed;
      }
      if (keys['KeyS'] || keys['ArrowDown']) {
        cameraPos.z += speed;
      }
      if (keys['KeyA'] || keys['ArrowLeft']) {
        cameraPos.x -= speed;
      }
      if (keys['KeyD'] || keys['ArrowRight']) {
        cameraPos.x += speed;
      }
      
      this.camera.position.set(
        cameraPos.x,
        cameraDist * 0.7,
        cameraPos.z + cameraDist
      );
      this.camera.lookAt(cameraPos.x, 0, cameraPos.z);
      
      requestAnimationFrame(updateCamera);
    };
    
    updateCamera();
  }
  
  // === UTILITIES ===
  
  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.renderer.resize(width, height);
  }
  
  updateStats() {
    const stats = this.entityManager.getStats();
    
    // Update HUD if exists
    const hudElement = document.getElementById('entity-stats');
    if (hudElement) {
      hudElement.textContent = `Entities: ${stats.active} | Zombies: ${stats.byComponent.get('zombieAI') || 0} | FPS: ${Math.round(1000 / (this.clock.getElapsedTime() * 1000 / this.clock.getFrame()))}`;
    }
  }
  
  getStats() {
    return {
      entities: this.entityManager.getStats(),
      gameState: this.gameState,
      performance: this.renderer.performance
    };
  }
  
  // === CLEANUP ===
  
  destroy() {
    this.stop();
    this.entityManager.clear();
    this.systems = [];
    
    if (this.renderer) {
      this.renderer.renderer.dispose();
    }
    
    console.log('🛑 Engine destroyed');
  }
}

// === GLOBAL EXPORT ===
window.EnhancedZombieEngine = EnhancedZombieEngine;
console.log('✅ Enhanced Zombie Engine module loaded');

// === AUTO-INIT ON LOAD ===
window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('game-canvas');
  
  if (canvas) {
    const engine = new EnhancedZombieEngine();
    await engine.initialize(canvas);
    
    // Expose to window for debugging
    window.gameEngine = engine;
    
    // Start with demo
    engine.setupCameraControl();
    
    console.log('🎮 Press Start button or run: window.gameEngine.start()');
  }
});
