/**
 * Learning AI & Emotional AI - Phase 4: Advanced AI Systems
 * Reinforcement learning for adaptive difficulty and emotional states
 */

/**
 * Q-Learning for adaptive difficulty
 */
export class QLearning {
  constructor(options = {}) {
    this.learningRate = options.learningRate || 0.1;
    this.discountFactor = options.discountFactor || 0.9;
    this.explorationRate = options.explorationRate || 0.2;
    this.qTable = new Map();
    this.states = [];
    this.actions = [];
    this.currentState = null;
    this.lastAction = null;
    this.lastState = null;
  }

  /**
   * Get or create Q-values for state
   */
  getQValues(state) {
    const key = JSON.stringify(state);
    if (!this.qTable.has(key)) {
      const values = {};
      this.actions.forEach(action => {
        values[action] = 0;
      });
      this.qTable.set(key, values);
    }
    return this.qTable.get(key);
  }

  /**
   * Select action using epsilon-greedy policy
   */
  selectAction(state) {
    this.currentState = state;
    const qValues = this.getQValues(state);

    // Exploration: random action
    if (Math.random() < this.explorationRate) {
      const action = this.actions[Math.floor(Math.random() * this.actions.length)];
      this.lastAction = action;
      this.lastState = state;
      return action;
    }

    // Exploitation: best action
    let bestAction = this.actions[0];
    let bestValue = -Infinity;

    for (const [action, value] of Object.entries(qValues)) {
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }

    this.lastAction = bestAction;
    this.lastState = state;
    return bestAction;
  }

  /**
   * Update Q-values based on reward
   */
  update(reward, nextState) {
    if (!this.lastState || !this.lastAction) return;

    const currentQ = this.getQValues(this.lastState)[this.lastAction];
    const nextQValues = this.getQValues(nextState);
    const maxNextQ = Math.max(...Object.values(nextQValues));

    // Q-learning update formula
    const newQ = currentQ + this.learningRate * (
      reward + this.discountFactor * maxNextQ - currentQ
    );

    this.getQValues(this.lastState)[this.lastAction] = newQ;
  }

  /**
   * Train with episode
   */
  trainEpisode(state, action, reward, nextState) {
    this.selectAction(state);
    this.update(reward, nextState);
  }

  /**
   * Decay exploration rate
   */
  decayExploration(decay = 0.99, minExploration = 0.01) {
    this.explorationRate = Math.max(
      minExploration,
      this.explorationRate * decay
    );
  }

  /**
   * Save Q-table
   */
  save() {
    return JSON.stringify(Object.fromEntries(this.qTable));
  }

  /**
   * Load Q-table
   */
  load(data) {
    this.qTable = new Map(Object.entries(JSON.parse(data)));
  }

  /**
   * Reset learning
   */
  reset() {
    this.qTable.clear();
    this.currentState = null;
    this.lastAction = null;
    this.lastState = null;
  }
}

/**
 * Emotional AI System - NPC emotional states
 */
export class EmotionalAI {
  constructor(agent) {
    this.agent = agent;
    
    // Basic emotions (Plutchik's wheel)
    this.emotions = {
      joy: 0,
      sadness: 0,
      fear: 0,
      anger: 0,
      trust: 0,
      disgust: 0,
      surprise: 0,
      anticipation: 0
    };

    // Emotional decay rates (per second)
    this.decayRates = {
      joy: 0.05,
      sadness: 0.03,
      fear: 0.08,
      anger: 0.06,
      trust: 0.02,
      disgust: 0.04,
      surprise: 0.15,
      anticipation: 0.07
    };

    // Thresholds for emotional states
    this.thresholds = {
      high: 0.7,
      medium: 0.4,
      low: 0.2
    };

    this.currentMood = 'neutral';
    this.emotionalHistory = [];
  }

  /**
   * Add emotion stimulus
   */
  addEmotion(emotion, intensity) {
    if (!this.emotions.hasOwnProperty(emotion)) return;
    
    this.emotions[emotion] = Math.max(0, Math.min(1, 
      this.emotions[emotion] + intensity
    ));

    // Record in history
    this.emotionalHistory.push({
      emotion,
      intensity,
      timestamp: Date.now()
    });

    // Keep history manageable
    if (this.emotionalHistory.length > 100) {
      this.emotionalHistory.shift();
    }
  }

  /**
   * Update emotions (call every frame)
   */
  update(dt) {
    // Decay all emotions
    for (const [emotion, value] of Object.entries(this.emotions)) {
      this.emotions[emotion] = Math.max(0, 
        value - this.decayRates[emotion] * dt
      );
    }

    // Update current mood based on dominant emotion
    this.updateMood();
  }

  /**
   * Update current mood
   */
  updateMood() {
    let maxEmotion = 'neutral';
    let maxValue = 0;

    for (const [emotion, value] of Object.entries(this.emotions)) {
      if (value > maxValue) {
        maxValue = value;
        maxEmotion = emotion;
      }
    }

    if (maxValue < this.thresholds.low) {
      this.currentMood = 'neutral';
    } else if (maxValue < this.thresholds.medium) {
      this.currentMood = `slightly_${maxEmotion}`;
    } else if (maxValue < this.thresholds.high) {
      this.currentMood = `${maxEmotion}`;
    } else {
      this.currentMood = `very_${maxEmotion}`;
    }
  }

  /**
   * Get emotional state for behavior modification
   */
  getBehaviorModifier() {
    const modifiers = {
      speed: 1,
      aggression: 1,
      accuracy: 1,
      perception: 1,
      decisionTime: 1
    };

    // Fear: faster but less accurate
    if (this.emotions.fear > this.thresholds.medium) {
      modifiers.speed = 1 + this.emotions.fear * 0.3;
      modifiers.accuracy = 1 - this.emotions.fear * 0.4;
    }

    // Anger: more aggressive, less perceptive
    if (this.emotions.anger > this.thresholds.medium) {
      modifiers.aggression = 1 + this.emotions.anger * 0.5;
      modifiers.perception = 1 - this.emotions.anger * 0.3;
    }

    // Sadness: slower, less aggressive
    if (this.emotions.sadness > this.thresholds.medium) {
      modifiers.speed = 1 - this.emotions.sadness * 0.3;
      modifiers.aggression = 1 - this.emotions.sadness * 0.4;
    }

    // Joy: balanced, better accuracy
    if (this.emotions.joy > this.thresholds.medium) {
      modifiers.accuracy = 1 + this.emotions.joy * 0.2;
      modifiers.decisionTime = 1 - this.emotions.joy * 0.2;
    }

    return modifiers;
  }

  /**
   * Get emotion pair (for complex emotions)
   */
  getEmotionPair() {
    const sorted = Object.entries(this.emotions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    if (sorted[0][1] < this.thresholds.low) return null;

    const pairs = {
      'joy+trust': 'love',
      'trust+fear': 'submission',
      'fear+surprise': 'awe',
      'surprise+sadness': 'disapproval',
      'sadness+disgust': 'remorse',
      'disgust+anger': 'contempt',
      'anger+anticipation': 'aggressiveness',
      'anticipation+joy': 'optimism'
    };

    const key = `${sorted[0][0]}+${sorted[1][0]}`;
    const reverseKey = `${sorted[1][0]}+${sorted[0][0]}`;

    return pairs[key] || pairs[reverseKey] || sorted[0][0];
  }

  /**
   * Trigger emotion based on event
   */
  triggerEvent(eventType, intensity = 1) {
    const eventEmotions = {
      'player_spotted': { fear: 0.3, anticipation: 0.4 },
      'player_escaped': { sadness: 0.4, anger: 0.3 },
      'successful_attack': { joy: 0.5, anger: 0.2 },
      'failed_attack': { anger: 0.5, sadness: 0.3 },
      'heard_noise': { anticipation: 0.3, fear: 0.2 },
      'low_health': { fear: 0.6, anger: 0.2 },
      'victory': { joy: 0.8, anticipation: 0.4 },
      'defeat': { sadness: 0.7, anger: 0.3 }
    };

    const emotions = eventEmotions[eventType];
    if (emotions) {
      for (const [emotion, value] of Object.entries(emotions)) {
        this.addEmotion(emotion, value * intensity);
      }
    }
  }

  /**
   * Get emotional state as string
   */
  toString() {
    const active = Object.entries(this.emotions)
      .filter(([_, value]) => value > this.thresholds.low)
      .map(([emotion, value]) => `${emotion}:${value.toFixed(2)}`);

    return active.length > 0 ? active.join(', ') : 'neutral';
  }
}

/**
 * Adaptive Difficulty Manager using Q-Learning
 */
export class AdaptiveDifficulty {
  constructor(game) {
    this.game = game;
    this.ql = new QLearning({
      learningRate: 0.15,
      discountFactor: 0.85,
      explorationRate: 0.3
    });

    this.ql.actions = ['decrease', 'maintain', 'increase'];
    
    this.playerPerformance = {
      deaths: 0,
      successes: 0,
      averageTime: 0,
      healthRemaining: 100
    };

    this.difficultyLevel = 1;
    this.targetSuccessRate = 0.6; // Aim for 60% success rate
  }

  /**
   * Get current state for Q-learning
   */
  getState() {
    const successRate = this.playerPerformance.successes / 
                       Math.max(1, this.playerPerformance.deaths + this.playerPerformance.successes);
    
    return {
      successRate: successRate < 0.3 ? 'low' : successRate < 0.7 ? 'medium' : 'high',
      health: this.playerPerformance.healthRemaining < 30 ? 'low' : 
              this.playerPerformance.healthRemaining < 70 ? 'medium' : 'high',
      deaths: this.playerPerformance.deaths < 3 ? 'low' : 
              this.playerPerformance.deaths < 10 ? 'medium' : 'high'
    };
  }

  /**
   * Calculate reward based on player experience
   */
  calculateReward(action) {
    const successRate = this.playerPerformance.successes / 
                       Math.max(1, this.playerPerformance.deaths + this.playerPerformance.successes);
    
    // Reward for keeping success rate near target
    const deviation = Math.abs(successRate - this.targetSuccessRate);
    let reward = 1 - deviation * 2;

    // Bonus for player engagement
    if (this.playerPerformance.healthRemaining > 20) {
      reward += 0.2;
    }

    return reward;
  }

  /**
   * Update difficulty based on learning
   */
  updateDifficulty() {
    const state = this.getState();
    const action = this.ql.selectAction(state);

    if (action === 'increase' && this.difficultyLevel < 10) {
      this.difficultyLevel++;
    } else if (action === 'decrease' && this.difficultyLevel > 1) {
      this.difficultyLevel--;
    }

    return action;
  }

  /**
   * Record player death
   */
  recordDeath(healthRemaining) {
    this.playerPerformance.deaths++;
    this.playerPerformance.healthRemaining = healthRemaining;

    const state = this.getState();
    const reward = this.calculateReward();
    
    this.ql.update(reward, state);
    this.ql.decayExploration();
  }

  /**
   * Record player success
   */
  recordSuccess(timeTaken, healthRemaining) {
    this.playerPerformance.successes++;
    this.playerPerformance.averageTime = timeTaken;
    this.playerPerformance.healthRemaining = healthRemaining;

    const state = this.getState();
    const reward = this.calculateReward();
    
    this.ql.update(reward, state);
    this.ql.decayExploration();
  }

  /**
   * Get difficulty multipliers
   */
  getMultipliers() {
    return {
      enemyDamage: 0.8 + this.difficultyLevel * 0.15,
      enemyHealth: 0.8 + this.difficultyLevel * 0.12,
      enemySpeed: 0.9 + this.difficultyLevel * 0.05,
      playerDamage: 1.2 - this.difficultyLevel * 0.08,
      itemSpawnRate: 1.0 - this.difficultyLevel * 0.05
    };
  }
}

export default { QLearning, EmotionalAI, AdaptiveDifficulty };
