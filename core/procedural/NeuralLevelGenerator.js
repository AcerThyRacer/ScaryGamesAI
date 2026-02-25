/**
 * Neural Level Generator - Phase 3 Ultimate Enhancement
 * ML-trained procedural generation that learns from player behavior
 * Creates adaptive horror experiences that evolve per player
 */

export class NeuralLevelGenerator {
  constructor(options = {}) {
    this.options = {
      enableLearning: options.enableLearning ?? true,
      enableAdaptation: options.enableAdaptation ?? true,
      playerModelSize: options.playerModelSize ?? 128,
      levelComplexity: options.levelComplexity ?? 'dynamic',
      horrorPacingModel: options.horrorPacingModel ?? 'adaptive',
      ...options
    };

    // Neural network weights (simplified for browser)
    this.weights = new Float32Array(this.options.playerModelSize);
    this.biases = new Float32Array(32);
    
    // Player behavior model
    this.playerModel = {
      fearThreshold: 0.5,
      thrillSeeking: 0.5,
      explorationTendency: 0.5,
      combatPreference: 0.5,
      puzzleSolvingSkill: 0.5,
      stealthSkill: 0.5,
      averageHeartRate: 70, // Simulated
      fearRecoveryRate: 0.1
    };

    // Experience buffer for learning
    this.experienceBuffer = [];
    this.maxExperienceSize = 1000;
    
    // Level generation history
    this.levelHistory = [];
    this.fearPeaks = [];
    this.engagementMetrics = [];

    // Horror pacing curve
    this.pacingCurve = {
      tension: 0.0,
      climax: 0.0,
      release: 0.0,
      buildup: 0.0
    };

    console.log('🧠 Neural Level Generator initialized');
  }

  /**
   * Generate a level adapted to the current player
   */
  async generateLevel(playerData, context = {}) {
    const startTime = performance.now();

    // Update player model from recent behavior
    if (this.options.enableLearning) {
      this.updatePlayerModel(playerData);
    }

    // Calculate optimal horror pacing
    const pacingProfile = this.calculateHorrorPacing(playerData);

    // Generate base layout using WFC or rooms
    const baseLayout = this.generateBaseLayout(pacingProfile, context);

    // Adapt layout to player preferences
    if (this.options.enableAdaptation) {
      this.adaptToPlayer(baseLayout, this.playerModel);
    }

    // Place horror elements based on pacing
    this.placeHorrorElements(baseLayout, pacingProfile);

    // Add quantum items (from QuantumItemSystem)
    this.addQuantumItems(baseLayout, playerData);

    // Store in history for learning
    this.levelHistory.push({
      layout: baseLayout,
      pacingProfile,
      playerModel: { ...this.playerModel },
      timestamp: Date.now()
    });

    const generationTime = performance.now() - startTime;
    console.log(`✓ Neural level generated in ${generationTime.toFixed(2)}ms`);

    return {
      ...baseLayout,
      metadata: {
        pacingProfile,
        playerAdaptation: this.playerModel,
        generationTime,
        neuralWeights: this.weights.slice(0, 10) // First 10 weights for debugging
      }
    };
  }

  /**
   * Update player model based on behavior data
   */
  updatePlayerModel(playerData) {
    const experience = {
      timestamp: Date.now(),
      decisions: playerData.recentDecisions || [],
      fearResponses: playerData.fearResponses || [],
      engagementScore: playerData.engagementScore || 0.5,
      completionTime: playerData.completionTime || 0,
      deaths: playerData.deaths || 0,
      secretsFound: playerData.secretsFound || 0,
      combatEncounters: playerData.combatEncounters || 0,
      puzzlesSolved: playerData.puzzlesSolved || 0
    };

    // Add to experience buffer
    this.experienceBuffer.push(experience);
    if (this.experienceBuffer.length > this.maxExperienceSize) {
      this.experienceBuffer.shift();
    }

    // Update player model traits using weighted average
    const recentExperiences = this.experienceBuffer.slice(-50);
    
    this.playerModel.fearThreshold = this.calculateTraitFromExperiences(
      recentExperiences,
      'fearThreshold',
      (exp) => exp.fearResponses?.length > 0 ? 0.3 : 0.7
    );

    this.playerModel.thrillSeeking = this.calculateTraitFromExperiences(
      recentExperiences,
      'thrillSeeking',
      (exp) => exp.deaths > 3 ? 0.8 : 0.3
    );

    this.playerModel.explorationTendency = this.calculateTraitFromExperiences(
      recentExperiences,
      'explorationTendency',
      (exp) => Math.min(1.0, exp.secretsFound / 5)
    );

    this.playerModel.combatPreference = this.calculateTraitFromExperiences(
      recentExperiences,
      'combatPreference',
      (exp) => Math.min(1.0, exp.combatEncounters / 10)
    );

    this.playerModel.puzzleSolvingSkill = this.calculateTraitFromExperiences(
      recentExperiences,
      'puzzleSolvingSkill',
      (exp) => Math.min(1.0, exp.puzzlesSolved / 3)
    );

    // Update neural network weights
    this.updateNeuralWeights();
  }

  calculateTraitFromExperiences(experiences, traitName, calculator) {
    if (experiences.length === 0) return 0.5;

    const values = experiences.map(calculator);
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * Calculate optimal horror pacing for this player
   */
  calculateHorrorPacing(playerData) {
    // Analyze player's fear response patterns
    const avgFear = this.playerModel.fearThreshold;
    const recovery = this.playerModel.fearRecoveryRate;
    const thrill = this.playerModel.thrillSeeking;

    // Determine pacing style
    let pacingStyle;
    if (avgFear < 0.3 && thrill > 0.7) {
      pacingStyle = 'intense'; // High intensity, frequent scares
    } else if (avgFear > 0.7) {
      pacingStyle = 'slow_burn'; // Gradual buildup, psychological
    } else if (recovery > 0.5) {
      pacingStyle = 'roller_coaster'; // Peaks and valleys
    } else {
      pacingStyle = 'sustained'; // Moderate, consistent tension
    }

    // Generate pacing curve
    const duration = playerData.expectedDuration || 1800; // 30 seconds default
    const phases = this.generatePacingPhases(pacingStyle, duration);

    return {
      style: pacingStyle,
      phases,
      targetFearCurve: this.calculateTargetFearCurve(phases),
      scareDensity: this.calculateScareDensity(pacingStyle, avgFear),
      climaxPosition: this.findOptimalClimaxPosition(phases)
    };
  }

  generatePacingPhases(style, duration) {
    const phases = [];
    let currentTime = 0;

    switch (style) {
      case 'intense':
        // Frequent high-intensity moments
        while (currentTime < duration) {
          phases.push({ type: 'buildup', duration: 15, intensity: 0.3 });
          phases.push({ type: 'scare', duration: 5, intensity: 0.9 });
          phases.push({ type: 'release', duration: 10, intensity: 0.2 });
          currentTime += 30;
        }
        break;

      case 'slow_burn':
        // Long buildups, rare climaxes
        phases.push({ type: 'atmosphere', duration: duration * 0.6, intensity: 0.2 });
        phases.push({ type: 'buildup', duration: duration * 0.2, intensity: 0.5 });
        phases.push({ type: 'climax', duration: duration * 0.1, intensity: 1.0 });
        phases.push({ type: 'resolution', duration: duration * 0.1, intensity: 0.3 });
        break;

      case 'roller_coaster':
        // Alternating peaks and valleys
        const cycles = 4;
        const cycleDuration = duration / cycles;
        for (let i = 0; i < cycles; i++) {
          phases.push({ type: 'valley', duration: cycleDuration * 0.5, intensity: 0.2 });
          phases.push({ type: 'buildup', duration: cycleDuration * 0.3, intensity: 0.6 });
          phases.push({ type: 'peak', duration: cycleDuration * 0.2, intensity: 0.85 });
        }
        break;

      case 'sustained':
        // Consistent moderate tension
        phases.push({ type: 'tension', duration: duration * 0.7, intensity: 0.5 });
        phases.push({ type: 'escalation', duration: duration * 0.2, intensity: 0.7 });
        phases.push({ type: 'climax', duration: duration * 0.1, intensity: 0.95 });
        break;
    }

    return phases;
  }

  calculateTargetFearCurve(phases) {
    return phases.map(phase => ({
      time: phase.duration,
      fear: phase.intensity,
      type: phase.type
    }));
  }

  calculateScareDensity(style, avgFear) {
    const baseDensity = {
      intense: 0.8,
      slow_burn: 0.2,
      roller_coaster: 0.5,
      sustained: 0.4
    };

    // Adjust based on player fear threshold
    const adjustment = (1.0 - avgFear) * 0.3;
    return Math.min(1.0, baseDensity[style] + adjustment);
  }

  findOptimalClimaxPosition(phases) {
    // Find the phase with highest intensity
    let maxIntensity = 0;
    let climaxPosition = 0.5; // Default to middle

    let cumulativeTime = 0;
    for (const phase of phases) {
      if (phase.intensity > maxIntensity) {
        maxIntensity = phase.intensity;
        climaxPosition = cumulativeTime / 1800; // Normalize to 0-1
      }
      cumulativeTime += phase.duration;
    }

    return climaxPosition;
  }

  /**
   * Generate base layout using enhanced algorithms
   */
  generateBaseLayout(pacingProfile, context) {
    // Select algorithm based on pacing needs
    const algorithm = this.selectGenerationAlgorithm(pacingProfile, context);

    let layout;
    if (algorithm === 'wfc') {
      layout = this.generateWFCLayout(context);
    } else if (algorithm === 'rooms') {
      layout = this.generateRoomLayout(context);
    } else {
      layout = this.generateHybridLayout(context);
    }

    return layout;
  }

  selectGenerationAlgorithm(pacingProfile, context) {
    // Choose based on desired pacing and constraints
    if (pacingProfile.style === 'slow_burn') {
      return 'rooms'; // More controlled pacing
    } else if (pacingProfile.style === 'intense') {
      return 'hybrid'; // Unpredictable layouts
    }
    return 'wfc'; // Balanced approach
  }

  generateWFCLayout(context) {
    // Enhanced WFC with neural guidance
    const width = context.width || 40;
    const height = context.height || 30;
    const grid = new Array(width * height).fill('empty');

    // Neural network influences tile selection
    const seedTile = this.selectSeedTileNeural();
    
    // Simple WFC-like propagation (full implementation would use core/procedural/WaveFunctionCollapse.js)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const entropy = this.calculateCellEntropy(x, y, grid, width, height);
        
        if (entropy > 0.5) {
          grid[index] = this.selectTileNeural(x, y, grid, width, height);
        }
      }
    }

    return {
      grid,
      width,
      height,
      algorithm: 'wfc',
      rooms: [],
      connections: []
    };
  }

  generateRoomLayout(context) {
    // Enhanced room generation with pacing-aware placement
    const roomCount = Math.floor(8 + this.playerModel.explorationTendency * 4);
    const rooms = [];

    for (let i = 0; i < roomCount; i++) {
      const room = {
        x: Math.random() * 800,
        y: Math.random() * 600,
        width: 50 + Math.random() * 100,
        height: 50 + Math.random() * 100,
        type: this.selectRoomTypeNeural(i, roomCount),
        doors: []
      };
      rooms.push(room);
    }

    // Generate corridors between rooms
    const connections = this.generateCorridors(rooms);

    return {
      rooms,
      connections,
      algorithm: 'rooms',
      grid: null,
      width: 1000,
      height: 800
    };
  }

  generateHybridLayout(context) {
    // Combine WFC and room-based approaches
    const wfcPart = this.generateWFCLayout({ ...context, width: 20, height: 15 });
    const roomPart = this.generateRoomLayout({ ...context, roomCount: 5 });

    return {
      ...wfcPart,
      rooms: roomPart.rooms,
      connections: roomPart.connections,
      algorithm: 'hybrid'
    };
  }

  /**
   * Neural network-guided decisions
   */
  selectSeedTileNeural() {
    // Use neural weights to influence starting tile
    const activation = this.sigmoid(this.weights[0] * 2.0 + this.biases[0]);
    return activation > 0.5 ? 'floor' : 'wall';
  }

  selectTileNeural(x, y, grid, width, height) {
    // Calculate local features
    const neighbors = this.getNeighborTiles(x, y, grid, width, height);
    
    // Neural decision
    let activation = this.biases[1];
    for (let i = 0; i < Math.min(neighbors.length, 8); i++) {
      activation += this.weights[i + 2] * (neighbors[i] === 'floor' ? 1 : -1);
    }

    return this.sigmoid(activation) > 0.5 ? 'floor' : 'wall';
  }

  selectRoomTypeNeural(index, totalRooms) {
    const roomTypes = ['corridor', 'storage', 'danger', 'safe', 'treasure', 'boss'];
    
    // Neural selection based on position and player model
    const activation = this.sigmoid(
      this.weights[10] * (index / totalRooms) +
      this.weights[11] * this.playerModel.combatPreference +
      this.biases[2]
    );

    const typeIndex = Math.floor(activation * roomTypes.length);
    return roomTypes[Math.min(typeIndex, roomTypes.length - 1)];
  }

  calculateCellEntropy(x, y, grid, width, height) {
    // Calculate how constrained this cell is
    const neighbors = this.getNeighborTiles(x, y, grid, width, height);
    const uniqueNeighbors = new Set(neighbors);
    return uniqueNeighbors.size / 8.0; // Normalized 0-1
  }

  getNeighborTiles(x, y, grid, width, height) {
    const neighbors = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          neighbors.push(grid[ny * width + nx]);
        } else {
          neighbors.push('wall'); // Out of bounds = wall
        }
      }
    }
    return neighbors;
  }

  /**
   * Adapt layout to player preferences
   */
  adaptToPlayer(layout, playerModel) {
    // Adjust room sizes based on exploration tendency
    if (layout.rooms) {
      for (const room of layout.rooms) {
        const sizeMultiplier = 0.8 + playerModel.explorationTendency * 0.4;
        room.width *= sizeMultiplier;
        room.height *= sizeMultiplier;
      }
    }

    // Adjust corridor width based on stealth skill
    if (layout.connections) {
      for (const conn of layout.connections) {
        conn.width = 2.0 + (1.0 - playerModel.stealthSkill) * 2.0;
      }
    }
  }

  /**
   * Place horror elements based on pacing profile
   */
  placeHorrorElements(layout, pacingProfile) {
    layout.horrorElements = [];

    // Place scares according to pacing phases
    pacingProfile.phases.forEach((phase, index) => {
      if (phase.type === 'scare' || phase.type === 'climax' || phase.type === 'peak') {
        const element = this.createHorrorElement(phase, index);
        layout.horrorElements.push(element);
      }
    });

    // Add ambient horror elements
    this.addAmbientHorror(layout);
  }

  createHorrorElement(phase, index) {
    const scareTypes = [
      'jumpscare_visual',
      'jumpscare_audio',
      'environmental_change',
      'entity_appearance',
      'psychological_effect',
      'narrative_revelation'
    ];

    const intensity = phase.intensity;
    const typeIndex = Math.floor(intensity * scareTypes.length);
    
    return {
      type: scareTypes[Math.min(typeIndex, scareTypes.length - 1)],
      position: { x: Math.random() * 1000, y: Math.random() * 800 },
      intensity,
      triggered: false,
      cooldown: 30000 // 30 seconds
    };
  }

  addAmbientHorror(layout) {
    // Add subtle horror elements throughout
    const ambientTypes = [
      'flickering_light',
      'distant_sound',
      'shadow_movement',
      'temperature_drop',
      'whisper'
    ];

    for (let i = 0; i < 10; i++) {
      layout.horrorElements.push({
        type: 'ambient_' + ambientTypes[Math.floor(Math.random() * ambientTypes.length)],
        position: { x: Math.random() * 1000, y: Math.random() * 800 },
        intensity: 0.2 + Math.random() * 0.3,
        triggered: false,
        repeatInterval: 5000 + Math.random() * 10000
      });
    }
  }

  /**
   * Add quantum items to the level
   */
  addQuantumItems(layout, playerData) {
    layout.quantumItems = [];

    // Place 3-5 quantum items per level
    const itemCount = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < itemCount; i++) {
      layout.quantumItems.push({
        id: `quantum_${Date.now()}_${i}`,
        position: {
          x: Math.random() * 1000,
          y: Math.random() * 800
        },
        superpositionState: 'unobserved',
        possibleEffects: this.generatePossibleEffects(),
        collapsedEffect: null,
        entangledWith: null // Will be set by QuantumItemSystem
      });
    }
  }

  generatePossibleEffects() {
    const effects = [
      'healing', 'damage', 'speed_boost', 'fear_induction',
      'invisibility', 'enemy_spawn', 'item_spawn', 'teleportation',
      'time_slow', 'reality_distortion'
    ];

    // Return 2-3 random effects
    const count = 2 + Math.floor(Math.random() * 2);
    const selected = [];
    for (let i = 0; i < count; i++) {
      const effect = effects[Math.floor(Math.random() * effects.length)];
      if (!selected.includes(effect)) {
        selected.push(effect);
      }
    }
    return selected;
  }

  /**
   * Update neural network weights based on experience
   */
  updateNeuralWeights() {
    // Simplified weight update (would use backprop in production)
    const recentPerformance = this.experienceBuffer.slice(-10);
    
    if (recentPerformance.length < 5) return;

    const avgEngagement = recentPerformance.reduce((sum, exp) => 
      sum + (exp.engagementScore || 0.5), 0) / recentPerformance.length;

    // Adjust weights to maximize engagement
    const learningRate = 0.01;
    for (let i = 0; i < this.weights.length; i++) {
      const gradient = (avgEngagement - 0.5) * Math.random();
      this.weights[i] += learningRate * gradient;
      
      // Clamp weights to prevent explosion
      this.weights[i] = Math.max(-2, Math.min(2, this.weights[i]));
    }
  }

  /**
   * Activation function
   */
  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Get player model for debugging
   */
  getPlayerModel() {
    return { ...this.playerModel };
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      levelsGenerated: this.levelHistory.length,
      avgGenerationTime: this.levelHistory.length > 0 ? 
        this.levelHistory.reduce((sum, l) => sum + l.metadata.generationTime, 0) / this.levelHistory.length : 0,
      playerModelTraits: Object.keys(this.playerModel).length,
      experienceBufferSize: this.experienceBuffer.length,
      currentPacingStyle: this.pacingCurve
    };
  }
}
