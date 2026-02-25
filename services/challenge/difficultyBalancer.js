/**
 * Dynamic Difficulty Adjustment (DDA) System
 * Phase 5: AI-Powered Personalization
 * 
 * Real-time challenge difficulty optimization
 * Targets 70% completion rate for optimal engagement
 * 
 * @module services/challenge/difficultyBalancer
 */

class DifficultyBalancer {
  /**
   * Create DDA system
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.targetCompletionRate = config.targetCompletionRate || 0.7; // 70% sweet spot
    this.adjustmentSpeed = config.adjustmentSpeed || 0.1; // How fast to adjust
    this.minDifficulty = config.minDifficulty || 1;
    this.maxDifficulty = config.maxDifficulty || 10;
    this.difficultyLevels = config.difficultyLevels || [
      'very_easy',
      'easy',
      'medium',
      'hard',
      'very_hard',
      'extreme'
    ];
    
    this.challengeHistory = new Map(); // challengeId -> history
    this.playerPerformance = new Map(); // playerId -> performance tracking
    this.difficultyPresets = new Map(); // presetId -> preset config
  }

  /**
   * Calculate optimal difficulty for a challenge
   * @param {string} playerId - Player ID
   * @param {Object} challengeConfig - Challenge configuration
   * @param {Object} playerProfile - Player skill profile
   * @returns {Object} Optimal difficulty settings
   */
  calculateOptimalDifficulty(playerId, challengeConfig, playerProfile) {
    // Get player's historical performance
    const performance = this.getPlayerPerformance(playerId);
    
    // Base difficulty on player's overall rating
    let baseDifficulty = playerProfile?.overallRating || 5;
    
    // Adjust based on recent performance trend
    if (performance.recentCompletionRates.length > 0) {
      const avgRecentCompletion = performance.recentCompletionRates.reduce(
        (sum, r) => sum + r, 0
      ) / performance.recentCompletionRates.length;
      
      // If completing too many, increase difficulty
      if (avgRecentCompletion > this.targetCompletionRate + 0.1) {
        baseDifficulty += 1;
      }
      // If completing too few, decrease difficulty
      else if (avgRecentCompletion < this.targetCompletionRate - 0.1) {
        baseDifficulty -= 1;
      }
    }
    
    // Adjust based on challenge type
    const typeModifier = this.getChallengeTypeModifier(challengeConfig.type);
    baseDifficulty += typeModifier;
    
    // Clamp to valid range
    baseDifficulty = Math.max(this.minDifficulty, Math.min(this.maxDifficulty, baseDifficulty));
    
    // Generate difficulty settings
    const settings = this.generateDifficultySettings(baseDifficulty, challengeConfig);
    
    return {
      difficulty: Math.round(baseDifficulty * 10) / 10,
      difficultyLevel: this.getDifficultyLevel(baseDifficulty),
      settings,
      targetCompletionRate: this.targetCompletionRate,
      confidence: this.calculateConfidence(performance)
    };
  }

  /**
   * Get player's performance history
   */
  getPlayerPerformance(playerId) {
    if (!this.playerPerformance.has(playerId)) {
      this.playerPerformance.set(playerId, {
        recentCompletionRates: [],
        recentScores: [],
        timeSpent: [],
        lastUpdated: Date.now()
      });
    }
    return this.playerPerformance.get(playerId);
  }

  /**
   * Get challenge type modifier
   */
  getChallengeTypeModifier(challengeType) {
    const modifiers = {
      daily: 0,
      weekly: 0.5,
      monthly: 1,
      event: 1.5,
      ranked: 2,
      survival: 1,
      speedrun: 1.5,
      perfection: 2
    };
    return modifiers[challengeType] || 0;
  }

  /**
   * Generate difficulty settings based on difficulty value
   */
  generateDifficultySettings(difficulty, challengeConfig) {
    const settings = {};
    const normalizedDifficulty = difficulty / 10; // 0-1 scale
    
    switch (challengeConfig.type) {
      case 'combat':
        settings.enemyHealth = 0.5 + (normalizedDifficulty * 1); // 0.5-1.5x
        settings.enemyDamage = 0.5 + (normalizedDifficulty * 1); // 0.5-1.5x
        settings.enemyCount = Math.floor(1 + (normalizedDifficulty * 4)); // 1-5
        settings.timeLimit = challengeConfig.baseTimeLimit * (1.5 - normalizedDifficulty); // 1.5x-0.5x
        break;
        
      case 'puzzle':
        settings.numHints = Math.floor(5 * (1 - normalizedDifficulty)); // 5-0 hints
        settings.timeLimit = challengeConfig.baseTimeLimit * (1.5 - normalizedDifficulty * 0.5);
        settings.complexity = Math.ceil(1 + (normalizedDifficulty * 4)); // 1-5
        break;
        
      case 'exploration':
        settings.hiddenItemsRatio = 0.3 + (normalizedDifficulty * 0.5); // 30-80% hidden
        settings.mapRevealed = 1 - normalizedDifficulty; // 100-0% revealed
        settings.timeLimit = challengeConfig.baseTimeLimit * (1.2 - normalizedDifficulty * 0.4);
        break;
        
      case 'speedrun':
        settings.timeLimit = challengeConfig.baseTimeLimit * (1.5 - normalizedDifficulty * 0.7); // 1.5x-0.8x
        settings.checkpoints = Math.floor(5 * (1 - normalizedDifficulty)); // 5-0
        break;
        
      case 'survival':
        settings.enemySpawnRate = 0.5 + (normalizedDifficulty * 1); // 0.5-1.5x
        settings.resourceAvailability = 1 - (normalizedDifficulty * 0.6); // 100-40%
        settings.healingEffectiveness = 1 - (normalizedDifficulty * 0.5); // 100-50%
        break;
        
      default:
        // Generic settings
        settings.targetScore = Math.floor(challengeConfig.baseScore * (0.5 + normalizedDifficulty));
        settings.timeLimit = challengeConfig.baseTimeLimit * (1.3 - normalizedDifficulty * 0.6);
        settings.lives = Math.floor(5 * (1 - normalizedDifficulty * 0.6)); // 5-2
    }
    
    return settings;
  }

  /**
   * Get difficulty level name from numeric value
   */
  getDifficultyLevel(difficulty) {
    const normalized = difficulty / 10;
    const index = Math.floor(normalized * this.difficultyLevels.length);
    return this.difficultyLevels[Math.min(index, this.difficultyLevels.length - 1)];
  }

  /**
   * Update player performance after challenge completion
   * @param {string} playerId - Player ID
   * @param {Object} result - Challenge result
   */
  updatePerformance(playerId, result) {
    const performance = this.getPlayerPerformance(playerId);
    
    // Add completion result
    performance.recentCompletionRates.push(result.completed ? 1 : 0);
    
    // Keep only last 10 results
    if (performance.recentCompletionRates.length > 10) {
      performance.recentCompletionRates.shift();
    }
    
    // Add score if available
    if (result.score !== undefined) {
      performance.recentScores.push(result.score);
      if (performance.recentScores.length > 10) {
        performance.recentScores.shift();
      }
    }
    
    // Add time spent if available
    if (result.timeSpent !== undefined) {
      performance.timeSpent.push(result.timeSpent);
      if (performance.timeSpent.length > 10) {
        performance.timeSpent.shift();
      }
    }
    
    performance.lastUpdated = Date.now();
    
    // Update challenge history
    if (result.challengeId) {
      if (!this.challengeHistory.has(result.challengeId)) {
        this.challengeHistory.set(result.challengeId, []);
      }
      
      this.challengeHistory.get(result.challengeId).push({
        playerId,
        result,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Adjust difficulty in real-time based on performance
   * @param {string} playerId - Player ID
   * @param {Object} currentState - Current challenge state
   * @returns {Object} Adjusted settings
   */
  adjustInRealTime(playerId, currentState) {
    const performance = this.getPlayerPerformance(playerId);
    const adjustment = {};
    
    // Check if player is struggling
    if (currentState.failures > 3 && !currentState.completed) {
      // Reduce difficulty
      adjustment.difficultyMultiplier = 0.9;
      adjustment.reason = 'player_struggling';
    }
    // Check if player is dominating
    else if (currentState.score > currentState.expectedScore * 1.5) {
      // Increase difficulty
      adjustment.difficultyMultiplier = 1.1;
      adjustment.reason = 'player_dominating';
    }
    // Check time performance
    else if (currentState.elapsedTime < currentState.expectedTime * 0.5) {
      adjustment.difficultyMultiplier = 1.05;
      adjustment.reason = 'too_fast';
    }
    else if (currentState.elapsedTime > currentState.expectedTime * 2) {
      adjustment.difficultyMultiplier = 0.95;
      adjustment.reason = 'too_slow';
    }
    
    if (adjustment.difficultyMultiplier) {
      // Apply adjustment with speed factor
      const actualAdjustment = 1 + ((adjustment.difficultyMultiplier - 1) * this.adjustmentSpeed);
      adjustment.difficultyMultiplier = actualAdjustment;
    }
    
    return adjustment;
  }

  /**
   * Calculate confidence in difficulty recommendation
   */
  calculateConfidence(performance) {
    let confidence = 0.5; // Base confidence
    
    // More data = higher confidence
    const dataPoints = performance.recentCompletionRates.length;
    confidence += Math.min(dataPoints / 20, 0.3);
    
    // Consistent performance = higher confidence
    if (performance.recentCompletionRates.length >= 5) {
      const variance = this.calculateVariance(performance.recentCompletionRates);
      if (variance < 0.1) {
        confidence += 0.2; // Very consistent
      }
    }
    
    return Math.min(confidence, 1);
  }

  /**
   * Calculate variance
   */
  calculateVariance(values) {
    if (values.length < 2) return 1;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1);
  }

  /**
   * Analyze challenge difficulty balance
   * @param {string} challengeId - Challenge ID
   * @returns {Object} Analysis
   */
  analyzeChallengeBalance(challengeId) {
    const history = this.challengeHistory.get(challengeId);
    
    if (!history || history.length < 10) {
      return {
        balanced: false,
        reason: 'insufficient_data',
        completionRate: null,
        recommendation: null
      };
    }
    
    const completionRates = history.map(h => h.result.completed ? 1 : 0);
    const avgCompletionRate = completionRates.reduce((sum, r) => sum + r, 0) / completionRates.length;
    
    const isBalanced = Math.abs(avgCompletionRate - this.targetCompletionRate) < 0.15;
    
    let recommendation = null;
    if (!isBalanced) {
      if (avgCompletionRate > this.targetCompletionRate + 0.15) {
        recommendation = 'increase_difficulty';
      } else if (avgCompletionRate < this.targetCompletionRate - 0.15) {
        recommendation = 'decrease_difficulty';
      }
    }
    
    return {
      balanced: isBalanced,
      completionRate: avgCompletionRate,
      targetRate: this.targetCompletionRate,
      sampleSize: history.length,
      recommendation
    };
  }

  /**
   * Create difficulty preset
   * @param {string} presetId - Preset ID
   * @param {Object} config - Preset configuration
   */
  createPreset(presetId, config) {
    this.difficultyPresets.set(presetId, {
      id: presetId,
      ...config,
      createdAt: Date.now()
    });
  }

  /**
   * Get difficulty preset
   */
  getPreset(presetId) {
    return this.difficultyPresets.get(presetId) || null;
  }

  /**
   * Get DDA statistics
   */
  getStats() {
    const challenges = Array.from(this.challengeHistory.entries());
    
    const balancedChallenges = challenges.filter(([, history]) => {
      const analysis = this.analyzeChallengeBalance(history[0]?.challengeId);
      return analysis.balanced;
    }).length;
    
    return {
      totalChallengesTracked: challenges.length,
      balancedChallenges,
      balanceRate: challenges.length > 0 ? balancedChallenges / challenges.length : 0,
      avgTargetCompletionRate: this.targetCompletionRate,
      playersTracked: this.playerPerformance.size
    };
  }
}

module.exports = DifficultyBalancer;
