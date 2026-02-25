/**
 * Procedural Horror Director - Phase 8: AI-Driven Terror
 * Analyzes player behavior and dynamically schedules scares, tension, and relief
 * Uses biometric feedback simulation and pacing algorithms
 */

export class HorrorDirector {
  constructor(options = {}) {
    this.options = {
      baseTension: 0.3,
      maxTension: 1.0,
      tensionDecay: 0.001,
      fearThreshold: 0.7,
      panicThreshold: 0.9,
      minScareInterval: 15000, // 15 seconds
      maxScareInterval: 60000, // 60 seconds
      ...options
    };

    // Player state tracking
    this.playerState = {
      heartRate: 72, // Simulated BPM
      stressLevel: 0,
      fearLevel: 0,
      anticipationLevel: 0,
      lastScareTime: 0,
      playtimeSeconds: 0,
      deaths: 0,
      successes: 0,
      hidingSpots: 0,
      resourcesCollected: 0
    };

    // Tension management
    this.currentTension = this.options.baseTension;
    this.tensionHistory = [];
    this.tensionPhase = 'calm'; // calm, buildup, climax, aftermath
    
    // Scare scheduling
    this.scareQueue = [];
    this.executedScares = [];
    this.lastScareTime = 0;
    this.nextScareTime = Date.now() + this.options.minScareInterval;
    
    // Pacing curves
    this.pacingCurves = {
      exponential: t => Math.pow(t, 2),
      linear: t => t,
      sigmoid: t => 1 / (1 + Math.exp(-10 * (t - 0.5))),
      sine: t => (Math.sin(t * Math.PI - Math.PI/2) + 1) / 2
    };

    // Scare types with intensity ratings
    this.scareTypes = [
      { id: 'ambient', intensity: 0.2, type: 'audio', description: 'Subtle ambient change' },
      { id: 'whisper', intensity: 0.3, type: 'audio', description: 'Ghostly whisper' },
      { id: 'flicker', intensity: 0.4, type: 'visual', description: 'Light flicker' },
      { id: 'shadow', intensity: 0.5, type: 'visual', description: 'Shadow movement' },
      { id: 'footstep', intensity: 0.5, type: 'audio', description: 'Nearby footsteps' },
      { id: 'distant_scream', intensity: 0.6, type: 'audio', description: 'Distant scream' },
      { id: 'object_move', intensity: 0.6, type: 'visual', description: 'Object moves' },
      { id: 'figure_appear', intensity: 0.7, type: 'visual', description: 'Figure appears' },
      { id: 'loud_bang', intensity: 0.8, type: 'audio', description: 'Loud bang' },
      { id: 'jumpscare_minor', intensity: 0.8, type: 'visual', description: 'Minor jumpscare' },
      { id: 'chase_begin', intensity: 0.9, type: 'event', description: 'Chase sequence starts' },
      { id: 'jumpscare_major', intensity: 1.0, type: 'visual', description: 'Major jumpscare' }
    ];

    // Callbacks for triggering events
    this.callbacks = {
      onScare: null,
      onTensionChange: null,
      onPhaseChange: null,
      onPlayerStateUpdate: null
    };

    // Timing
    this.startTime = Date.now();
    this.lastUpdate = Date.now();
  }

  /**
   * Update director state
   */
  update(deltaTime = 1/60) {
    const now = Date.now();
    this.playerState.playtimeSeconds += deltaTime;

    // Update tension
    this.updateTension(deltaTime);
    
    // Check if scare needed
    if (now >= this.nextScareTime && this.currentTension > 0.4) {
      this.scheduleScare();
    }
    
    // Execute scheduled scares
    this.executeScheduledScares(now);
    
    // Update phase
    this.updatePhase();
    
    this.lastUpdate = now;
  }

  /**
   * Update tension based on various factors
   */
  updateTension(deltaTime) {
    // Natural decay
    this.currentTension -= this.options.tensionDecay;
    
    // Add tension from player state
    const fearContribution = this.playerState.fearLevel * 0.3;
    const stressContribution = this.playerState.stressLevel * 0.2;
    const anticipationContribution = this.playerState.anticipationLevel * 0.2;
    
    // Time-based tension (longer playtime = more tension)
    const timeFactor = Math.min(1, this.playerState.playtimeSeconds / 600); // Max at 10 minutes
    const timeTension = timeFactor * 0.3;
    
    // Calculate total tension
    let newTension = this.options.baseTension + 
                     fearContribution + 
                     stressContribution + 
                     anticipationContribution +
                     timeTension;
    
    // Apply pacing curve
    newTension *= this.getPacingMultiplier();
    
    // Clamp
    this.currentTension = Math.max(0, Math.min(this.options.maxTension, newTension));
    
    // Store history
    this.tensionHistory.push({
      time: Date.now(),
      tension: this.currentTension
    });
    
    // Keep history manageable (last 5 minutes)
    if (this.tensionHistory.length > 300) {
      this.tensionHistory.shift();
    }
    
    // Notify callback
    if (this.callbacks.onTensionChange) {
      this.callbacks.onTensionChange(this.currentTension);
    }
  }

  /**
   * Get pacing multiplier based on current phase
   */
  getPacingMultiplier() {
    switch (this.tensionPhase) {
      case 'calm': return 0.8;
      case 'buildup': return 1.2;
      case 'climax': return 1.5;
      case 'aftermath': return 0.6;
      default: return 1.0;
    }
  }

  /**
   * Update tension phase
   */
  updatePhase() {
    const oldPhase = this.tensionPhase;
    
    if (this.currentTension < 0.3) {
      this.tensionPhase = 'calm';
    } else if (this.currentTension < 0.5) {
      this.tensionPhase = 'buildup';
    } else if (this.currentTension < 0.8) {
      this.tensionPhase = 'climax';
    } else {
      this.tensionPhase = 'aftermath';
    }
    
    if (oldPhase !== this.tensionPhase && this.callbacks.onPhaseChange) {
      this.callbacks.onPhaseChange(this.tensionPhase);
    }
  }

  /**
   * Schedule a scare based on current tension
   */
  scheduleScare() {
    const now = Date.now();
    const timeSinceLastScare = now - this.lastScareTime;
    
    // Determine appropriate scare intensity
    const availableIntensity = Math.min(1, this.currentTension * 1.2);
    
    // Filter scares by available intensity
    const availableScares = this.scareTypes.filter(s => 
      s.intensity <= availableIntensity && 
      !this.executedScares.includes(s.id)
    );
    
    if (availableScares.length === 0) {
      // Reset executed scares if nothing available
      this.executedScares = [];
      return;
    }
    
    // Weight selection by intensity match
    const targetIntensity = this.currentTension;
    const weightedScares = availableScares.map(scare => ({
      ...scare,
      weight: 1 / (1 + Math.abs(scare.intensity - targetIntensity))
    }));
    
    const totalWeight = weightedScares.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    
    let selectedScare = weightedScares[0];
    for (const scare of weightedScares) {
      random -= scare.weight;
      if (random <= 0) {
        selectedScare = scare;
        break;
      }
    }
    
    // Schedule the scare
    this.scareQueue.push({
      ...selectedScare,
      scheduledTime: now + Math.random() * 2000, // Execute within 2 seconds
      priority: selectedScare.intensity
    });
    
    // Update timing
    this.lastScareTime = now;
    this.executedScares.push(selectedScare.id);
    
    // Calculate next scare time based on tension
    const tensionFactor = 1 - this.currentTension;
    const interval = this.options.minScareInterval + 
                    (this.options.maxScareInterval - this.options.minScareInterval) * tensionFactor;
    this.nextScareTime = now + interval;
  }

  /**
   * Execute scheduled scares
   */
  executeScheduledScares(now) {
    const readyScares = this.scareQueue.filter(s => now >= s.scheduledTime);
    
    readyScares.sort((a, b) => b.priority - a.priority);
    
    readyScares.forEach(scare => {
      if (this.callbacks.onScare) {
        this.callbacks.onScare(scare);
      }
      
      // Remove from queue
      this.scareQueue = this.scareQueue.filter(s => s !== scare);
    });
  }

  /**
   * Record player action that affects horror experience
   */
  recordPlayerAction(actionType, data = {}) {
    const actions = {
      'hear_sound': { fear: 0.1, anticipation: 0.2 },
      'see_shadow': { fear: 0.15, anticipation: 0.1 },
      'enter_dark_room': { fear: 0.2, anticipation: 0.3 },
      'find_resource': { fear: -0.1, stress: -0.1 },
      'low_health': { fear: 0.3, stress: 0.2 },
      'hide': { fear: -0.2, stress: -0.1 },
      'die': { fear: 0.5, stress: 0.3 },
      'escape': { fear: -0.3, stress: -0.4 },
      'monster_nearby': { fear: 0.4, anticipation: 0.3 },
      'jumpscare': { fear: 0.6, stress: 0.4 }
    };

    const effect = actions[actionType] || {};
    
    for (const [stat, value] of Object.entries(effect)) {
      if (this.playerState.hasOwnProperty(stat)) {
        this.playerState[stat] = Math.max(0, Math.min(1, 
          this.playerState[stat] + value
        ));
      }
    }
    
    // Update specific counters
    if (data.deaths) this.playerState.deaths = data.deaths;
    if (data.successes) this.playerState.successes = data.successes;
    
    if (this.callbacks.onPlayerStateUpdate) {
      this.callbacks.onPlayerStateUpdate(this.playerState);
    }
  }

  /**
   * Force tension to specific level
   */
  setTension(level, reason = '') {
    this.currentTension = Math.max(0, Math.min(1, level));
  }

  /**
   * Trigger immediate scare
   */
  triggerImmediateScare(scareId) {
    const scare = this.scareTypes.find(s => s.id === scareId);
    if (!scare) return;
    
    this.scareQueue.push({
      ...scare,
      scheduledTime: Date.now(),
      priority: 1.0
    });
  }

  /**
   * Build up tension over time
   */
  startTensionBuildup(duration = 30000, targetTension = 0.8) {
    const startTime = Date.now();
    const startTension = this.currentTension;
    
    const buildupInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Smooth interpolation
      this.currentTension = startTension + (targetTension - startTension) * 
                           this.pacingCurves.sigmoid(progress);
      
      if (progress >= 1) {
        clearInterval(buildupInterval);
      }
    }, 100);
  }

  /**
   * Quick tension release (aftermath)
   */
  triggerRelief() {
    const reliefInterval = setInterval(() => {
      this.currentTension -= 0.05;
      this.playerState.fearLevel -= 0.1;
      this.playerState.stressLevel -= 0.1;
      
      if (this.currentTension <= this.options.baseTension) {
        this.currentTension = this.options.baseTension;
        clearInterval(reliefInterval);
      }
    }, 200);
  }

  /**
   * Get recommended audio/visual settings based on tension
   */
  getRecommendedSettings() {
    return {
      musicVolume: 0.3 + this.currentTension * 0.7,
      musicIntensity: this.currentTension,
      reverbAmount: 0.2 + this.currentTension * 0.6,
      lowPassFrequency: 20000 - this.currentTension * 15000,
      vignetteIntensity: this.currentTension * 0.8,
      filmGrain: this.currentTension * 0.6,
      chromaticAberration: this.currentTension * 0.4,
      colorSaturation: 1.0 - this.currentTension * 0.3,
      contrast: 1.0 + this.currentTension * 0.2
    };
  }

  /**
   * Get detailed statistics
   */
  getStats() {
    return {
      currentTension: this.currentTension,
      phase: this.tensionPhase,
      playtimeSeconds: this.playerState.playtimeSeconds,
      scaresExecuted: this.executedScares.length,
      scaresScheduled: this.scareQueue.length,
      averageTension: this.calculateAverageTension(),
      peakTension: Math.max(...this.tensionHistory.map(h => h.tension), 0),
      playerState: { ...this.playerState }
    };
  }

  /**
   * Calculate average tension over history
   */
  calculateAverageTension() {
    if (this.tensionHistory.length === 0) return 0;
    const sum = this.tensionHistory.reduce((acc, h) => acc + h.tension, 0);
    return sum / this.tensionHistory.length;
  }

  /**
   * Export session data for analytics
   */
  exportSessionData() {
    return {
      startTime: this.startTime,
      duration: Date.now() - this.startTime,
      tensionCurve: this.tensionHistory,
      scares: this.executedScares,
      finalState: this.playerState,
      stats: this.getStats()
    };
  }

  /**
   * Register callbacks
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }

  /**
   * Reset director state
   */
  reset() {
    this.currentTension = this.options.baseTension;
    this.tensionHistory = [];
    this.tensionPhase = 'calm';
    this.scareQueue = [];
    this.executedScares = [];
    this.lastScareTime = 0;
    this.nextScareTime = Date.now() + this.options.minScareInterval;
    
    this.playerState = {
      heartRate: 72,
      stressLevel: 0,
      fearLevel: 0,
      anticipationLevel: 0,
      lastScareTime: 0,
      playtimeSeconds: 0,
      deaths: 0,
      successes: 0,
      hidingSpots: 0,
      resourcesCollected: 0
    };
  }
}

export default HorrorDirector;
