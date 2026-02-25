/**
 * Automated Optimization System
 * Phase 9: Advanced Analytics & Optimization
 * 
 * Auto-adjust pricing, challenge difficulty, rewards
 */

class AutomatedOptimizationSystem {
  constructor(config = {}) {
    this.optimizationRules = new Map();
    this.adjustmentHistory = new Map();
    this.performanceMetrics = new Map();
    this.autoAdjustments = new Map();
  }
  
  /**
   * Create optimization rule
   */
  createOptimizationRule(config) {
    const rule = {
      id: this.generateId('opt'),
      name: config.name,
      type: config.type, // pricing, difficulty, rewards
      targetMetric: config.targetMetric,
      targetValue: config.targetValue,
      minThreshold: config.minThreshold,
      maxThreshold: config.maxThreshold,
      adjustmentStep: config.adjustmentStep || 0.05,
      cooldownPeriod: config.cooldownPeriod || 3600000, // 1 hour
      isActive: true,
      createdAt: Date.now()
    };
    
    this.optimizationRules.set(rule.id, rule);
    return rule;
  }
  
  /**
   * Run optimization check
   */
  runOptimization(ruleId, currentMetrics) {
    const rule = this.optimizationRules.get(ruleId);
    if (!rule || !rule.isActive) return null;
    
    // Check cooldown
    const lastAdjustment = this.adjustmentHistory.get(rule.id);
    if (lastAdjustment && Date.now() - lastAdjustment < rule.cooldownPeriod) {
      return null;
    }
    
    const current = currentMetrics[rule.targetMetric];
    const target = rule.targetValue;
    const diff = current - target;
    
    // Check if adjustment needed
    if (Math.abs(diff) < rule.minThreshold) {
      return null; // Within acceptable range
    }
    
    // Calculate adjustment
    let adjustment = 0;
    if (diff > 0) {
      // Too high - decrease
      adjustment = -rule.adjustmentStep;
    } else {
      // Too low - increase
      adjustment = rule.adjustmentStep;
    }
    
    // Apply limits
    if (current + adjustment > rule.maxThreshold) {
      adjustment = rule.maxThreshold - current;
    }
    if (current + adjustment < rule.minThreshold) {
      adjustment = rule.minThreshold - current;
    }
    
    // Record adjustment
    this.recordAdjustment(rule.id, current, adjustment, currentMetrics);
    
    return {
      ruleId: rule.id,
      current,
      adjustment,
      newValue: current + adjustment,
      reason: `Target ${target}, current ${current}, diff ${diff}`
    };
  }
  
  /**
   * Auto-adjust challenge difficulty
   */
  autoAdjustChallengeDifficulty(challengeId, completionRate) {
    const targetRate = 0.7; // 70% target
    const tolerance = 0.15; // ±15%
    
    if (completionRate > targetRate + tolerance) {
      // Too easy - increase difficulty
      return { adjustment: 0.1, reason: 'Completion rate too high' };
    } else if (completionRate < targetRate - tolerance) {
      // Too hard - decrease difficulty
      return { adjustment: -0.1, reason: 'Completion rate too low' };
    }
    
    return { adjustment: 0, reason: 'Within target range' };
  }
  
  /**
   * Auto-adjust rewards
   */
  autoAdjustRewards(activityId, engagementRate) {
    const targetEngagement = 0.6; // 60% target
    
    if (engagementRate < targetEngagement * 0.5) {
      // Very low engagement - increase rewards significantly
      return { adjustment: 0.5, reason: 'Very low engagement' };
    } else if (engagementRate < targetEngagement) {
      // Low engagement - increase rewards moderately
      return { adjustment: 0.25, reason: 'Low engagement' };
    } else if (engagementRate > targetEngagement * 1.5) {
      // Very high engagement - can reduce rewards
      return { adjustment: -0.1, reason: 'Very high engagement' };
    }
    
    return { adjustment: 0, reason: 'Optimal engagement' };
  }
  
  /**
   * Predict meta shifts
   */
  predictMetaShifts(gameData) {
    const trends = [];
    
    // Analyze pick rates over time
    if (gameData.pickRates) {
      const sorted = Object.entries(gameData.pickRates)
        .sort((a, b) => b[1] - a[1]);
      
      // Rising picks
      sorted.slice(0, 5).forEach(([item, rate]) => {
        if (rate > gameData.averagePickRate * 2) {
          trends.push({
            item,
            type: 'rising',
            confidence: 0.8,
            recommendation: 'Consider nerf'
          });
        }
      });
      
      // Falling picks
      sorted.slice(-5).forEach(([item, rate]) => {
        if (rate < gameData.averagePickRate * 0.3) {
          trends.push({
            item,
            type: 'falling',
            confidence: 0.7,
            recommendation: 'Consider buff'
          });
        }
      });
    }
    
    return trends;
  }
  
  /**
   * Record adjustment
   */
  recordAdjustment(ruleId, oldValue, adjustment, metrics) {
    this.adjustmentHistory.set(ruleId, {
      timestamp: Date.now(),
      oldValue,
      adjustment,
      newValue: oldValue + adjustment,
      metrics
    });
  }
  
  generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getStats() {
    return {
      totalRules: this.optimizationRules.size,
      activeRules: Array.from(this.optimizationRules.values()).filter(r => r.isActive).length,
      totalAdjustments: this.adjustmentHistory.size
    };
  }
}

module.exports = AutomatedOptimizationSystem;
