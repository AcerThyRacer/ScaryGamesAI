/**
 * Contextual Multi-Armed Bandit for Recommendation Exploration
 * Phase 5: AI-Powered Personalization
 * 
 * Balances exploration vs exploitation using Thompson Sampling
 * Optimizes long-term reward in recommendation scenarios
 * 
 * @module services/ml/contextualBandit
 */

const tf = require('@tensorflow/tfjs-node');

class ContextualBandit {
  /**
   * Create contextual bandit
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.numArms = config.numArms || 100; // Number of items/actions
    this.contextDim = config.contextDim || 20; // Feature dimension
    this.learningRate = config.learningRate || 0.01;
    this.explorationBonus = config.explorationBonus || 1.0;
    
    // Linear model parameters for each arm
    this.weights = new Map(); // armId -> weight vector
    this.bValues = new Map(); // armId -> uncertainty matrix (diagonal approximation)
    this.armPulls = new Map(); // armId -> number of times pulled
    this.armRewards = new Map(); // armId -> cumulative reward
    
    // Global parameters
    this.totalPulls = 0;
    this.totalReward = 0;
    this.history = []; // Pull history for analysis
    
    // Context feature extractors
    this.contextExtractors = config.contextExtractors || {};
    
    // Initialize arms
    this._initializeArms();
  }

  /**
   * Initialize arm parameters
   */
  _initializeArms() {
    for (let armId = 0; armId < this.numArms; armId++) {
      this.weights.set(armId, tf.zeros([this.contextDim]));
      this.bValues.set(armId, tf.ones([this.contextDim])); // Diagonal B matrix
      this.armPulls.set(armId, 0);
      this.armRewards.set(armId, 0);
    }
  }

  /**
   * Extract context features from user/session data
   * @param {Object} context - Context data
   * @returns {Float32Array} Context vector
   */
  extractContext(context) {
    const features = [];
    
    // Time-based features
    const hour = context.hour || 12;
    features.push(Math.sin(2 * Math.PI * hour / 24));
    features.push(Math.cos(2 * Math.PI * hour / 24));
    
    const dayOfWeek = context.dayOfWeek || 0;
    features.push(Math.sin(2 * Math.PI * dayOfWeek / 7));
    features.push(Math.cos(2 * Math.PI * dayOfWeek / 7));
    
    // User features
    features.push(context.userAge || 0);
    features.push(context.subscriptionTier || 0);
    features.push(context.totalPlaytime || 0);
    features.push(context.sessionsLast7Days || 0);
    features.push(context.avgSessionDuration || 0);
    
    // Preference features
    features.push(context.preferredGenre || 0);
    features.push(context.preferredDifficulty || 0);
    features.push(context.recentPurchases || 0);
    features.push(context.wishlistSize || 0);
    
    // Behavioral features
    features.push(context.isReturningUser ? 1 : 0);
    features.push(context.lastSessionDaysAgo || 0);
    features.push(context.churnRiskScore || 0);
    features.push(context.engagementScore || 0);
    
    // Device/context features
    features.push(context.isMobile ? 1 : 0);
    features.push(context.connectionSpeed || 0);
    features.push(context.screenSize || 0);
    
    // Pad or truncate to contextDim
    while (features.length < this.contextDim) {
      features.push(0);
    }
    
    return new Float32Array(features.slice(0, this.contextDim));
  }

  /**
   * Select arm using Thompson Sampling
   * @param {Float32Array} context - Context vector
   * @param {Array} availableArms - Available arms (subset of all arms)
   * @returns {number} Selected arm ID
   */
  selectArm(context, availableArms = null) {
    const arms = availableArms || Array.from({length: this.numArms}, (_, i) => i);
    
    // Sample from posterior for each arm
    let bestArm = arms[0];
    let bestSample = -Infinity;
    
    for (const armId of arms) {
      const sample = this._sampleFromPosterior(armId, context);
      if (sample > bestSample) {
        bestSample = sample;
        bestArm = armId;
      }
    }
    
    return bestArm;
  }

  /**
   * Sample from posterior distribution for an arm
   * @param {number} armId - Arm ID
   * @param {Float32Array} context - Context vector
   * @returns {number} Sampled value
   */
  _sampleFromPosterior(armId, context) {
    const weights = this.weights.get(armId);
    const bValues = this.bValues.get(armId);
    
    // Mean prediction
    const contextTensor = tf.tensor1d(Array.from(context));
    const mean = tf.tidy(() => {
      return weights.dot(contextTensor).dataSync()[0];
    });
    
    // Uncertainty (variance)
    const variance = tf.tidy(() => {
      const bInv = tf.div(1.0, bValues.add(1e-6)); // Inverse of diagonal B
      const uncertainty = contextTensor.mul(bInv).mul(contextTensor).sum();
      return uncertainty.dataSync()[0];
    });
    
    // Thompson sampling: sample from normal distribution
    const std = Math.sqrt(variance) * this.explorationBonus;
    const sample = mean + std * this._sampleNormal();
    
    contextTensor.dispose();
    
    return sample;
  }

  /**
   * Sample from standard normal distribution
   * @returns {number} Sample
   */
  _sampleNormal() {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Update arm parameters after observing reward
   * @param {number} armId - Arm ID
   * @param {Float32Array} context - Context vector
   * @param {number} reward - Observed reward
   */
  update(armId, context, reward) {
    const contextTensor = tf.tensor1d(Array.from(context));
    
    tf.tidy(() => {
      // Update B matrix (diagonal approximation)
      const bValues = this.bValues.get(armId);
      const contextSquared = contextTensor.square();
      this.bValues.set(armId, bValues.add(contextSquared.mul(this.learningRate)));
      
      // Update weight vector
      const weights = this.weights.get(armId);
      const prediction = weights.dot(contextTensor).dataSync()[0];
      const error = reward - prediction;
      
      // Gradient update
      const gradient = contextTensor.mul(error).mul(this.learningRate);
      this.weights.set(armId, weights.add(gradient));
    });
    
    // Update statistics
    this.armPulls.set(armId, this.armPulls.get(armId) + 1);
    this.armRewards.set(armId, this.armRewards.get(armId) + reward);
    this.totalPulls++;
    this.totalReward += reward;
    
    // Record history
    this.history.push({
      armId,
      context: Array.from(context),
      reward,
      timestamp: Date.now()
    });
    
    // Limit history size
    if (this.history.length > 100000) {
      this.history.shift();
    }
    
    contextTensor.dispose();
  }

  /**
   * Get expected reward for arm given context
   * @param {number} armId - Arm ID
   * @param {Float32Array} context - Context vector
   * @returns {number} Expected reward
   */
  getExpectedReward(armId, context) {
    const weights = this.weights.get(armId);
    const contextTensor = tf.tensor1d(Array.from(context));
    
    const expectedReward = tf.tidy(() => {
      return weights.dot(contextTensor).dataSync()[0];
    });
    
    contextTensor.dispose();
    return expectedReward;
  }

  /**
   * Get upper confidence bound for arm
   * @param {number} armId - Arm ID
   * @param {Float32Array} context - Context vector
   * @param {number} delta - Confidence parameter
   * @returns {number} UCB value
   */
  getUCB(armId, context, delta = 0.05) {
    const expectedReward = this.getExpectedReward(armId, context);
    
    const bValues = this.bValues.get(armId);
    const contextTensor = tf.tensor1d(Array.from(context));
    
    const uncertainty = tf.tidy(() => {
      const bInv = tf.div(1.0, bValues.add(1e-6));
      return contextTensor.mul(bInv).mul(contextTensor).sum().dataSync()[0];
    });
    
    const confidenceBonus = Math.sqrt(2 * Math.log(1 / delta)) * Math.sqrt(uncertainty);
    
    contextTensor.dispose();
    
    return expectedReward + confidenceBonus;
  }

  /**
   * Get best arm for context (exploitation)
   * @param {Float32Array} context - Context vector
   * @param {Array} availableArms - Available arms
   * @returns {number} Best arm ID
   */
  getBestArm(context, availableArms = null) {
    const arms = availableArms || Array.from({length: this.numArms}, (_, i) => i);
    
    let bestArm = arms[0];
    let bestReward = -Infinity;
    
    for (const armId of arms) {
      const expectedReward = this.getExpectedReward(armId, context);
      if (expectedReward > bestReward) {
        bestReward = expectedReward;
        bestArm = armId;
      }
    }
    
    return bestArm;
  }

  /**
   * Get arm statistics
   * @param {number} armId - Arm ID
   * @returns {Object} Statistics
   */
  getArmStats(armId) {
    return {
      pulls: this.armPulls.get(armId),
      totalReward: this.armRewards.get(armId),
      avgReward: this.armPulls.get(armId) > 0 ? 
        this.armRewards.get(armId) / this.armPulls.get(armId) : 0,
      explorationBonus: this.explorationBonus
    };
  }

  /**
   * Get overall bandit statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const avgReward = this.totalPulls > 0 ? this.totalReward / this.totalPulls : 0;
    
    // Calculate regret (simplified)
    const optimalReward = this.history.reduce((sum, h) => {
      return sum + Math.max(...Array.from(this.armRewards.values()).map(r => r / Math.max(1, this.armPulls.get(Array.from(this.armPulls.keys()).find(k => this.armRewards.get(k) === r)) || 1)));
    }, 0);
    
    const regret = optimalReward - this.totalReward;
    
    return {
      totalPulls: this.totalPulls,
      totalReward: this.totalReward,
      avgReward,
      regret,
      numArms: this.numArms,
      contextDim: this.contextDim,
      historySize: this.history.length
    };
  }

  /**
   * Reset bandit (clear all learned parameters)
   */
  reset() {
    // Dispose old tensors
    for (const armId of this.weights.keys()) {
      this.weights.get(armId).dispose();
      this.bValues.get(armId).dispose();
    }
    
    this.weights.clear();
    this.bValues.clear();
    this.armPulls.clear();
    this.armRewards.clear();
    
    this.totalPulls = 0;
    this.totalReward = 0;
    this.history = [];
    
    this._initializeArms();
  }

  /**
   * Export model parameters
   * @returns {Object} Exported parameters
   */
  export() {
    const exportData = {
      numArms: this.numArms,
      contextDim: this.contextDim,
      learningRate: this.learningRate,
      explorationBonus: this.explorationBonus,
      weights: {},
      bValues: {},
      armPulls: Object.fromEntries(this.armPulls),
      armRewards: Object.fromEntries(this.armRewards),
      totalPulls: this.totalPulls,
      totalReward: this.totalReward
    };
    
    // Export weights as arrays
    for (const [armId, weight] of this.weights.entries()) {
      exportData.weights[armId] = Array.from(weight.dataSync());
    }
    
    for (const [armId, bValue] of this.bValues.entries()) {
      exportData.bValues[armId] = Array.from(bValue.dataSync());
    }
    
    return exportData;
  }

  /**
   * Import model parameters
   * @param {Object} data - Imported data
   */
  import(data) {
    this.reset();
    
    this.numArms = data.numArms;
    this.contextDim = data.contextDim;
    this.learningRate = data.learningRate;
    this.explorationBonus = data.explorationBonus;
    
    // Import weights
    for (const [armId, weightArray] of Object.entries(data.weights)) {
      this.weights.set(parseInt(armId), tf.tensor1d(weightArray));
    }
    
    for (const [armId, bValueArray] of Object.entries(data.bValues)) {
      this.bValues.set(parseInt(armId), tf.tensor1d(bValueArray));
    }
    
    for (const [armId, pulls] of Object.entries(data.armPulls)) {
      this.armPulls.set(parseInt(armId), pulls);
    }
    
    for (const [armId, reward] of Object.entries(data.armRewards)) {
      this.armRewards.set(parseInt(armId), reward);
    }
    
    this.totalPulls = data.totalPulls;
    this.totalReward = data.totalReward;
  }

  /**
   * Dispose all tensors
   */
  dispose() {
    for (const weight of this.weights.values()) {
      weight.dispose();
    }
    for (const bValue of this.bValues.values()) {
      bValue.dispose();
    }
    this.weights.clear();
    this.bValues.clear();
  }
}

module.exports = ContextualBandit;
