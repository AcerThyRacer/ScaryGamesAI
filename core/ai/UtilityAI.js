/**
 * Utility AI System - Phase 4: Advanced AI Systems
 * Dynamic need-based behavior selection for horror game NPCs
 */

export class UtilityAI {
  constructor(agent) {
    this.agent = agent;
    this.actions = [];
    this.considerations = [];
    this.selectedAction = null;
    this.scorer = new DefaultScorer();
  }

  /**
   * Add an action with considerations
   */
  addAction(action) {
    this.actions.push(action);
    return this;
  }

  /**
   * Add a consideration (factor that affects decision)
   */
  addConsideration(consideration) {
    this.considerations.push(consideration);
    return this;
  }

  /**
   * Select best action based on utility scores
   */
  selectAction() {
    if (this.actions.length === 0) return null;

    const scoredActions = this.actions.map(action => {
      let totalScore = 0;
      const scores = {};

      // Calculate score for each consideration
      action.considerations.forEach(considerationId => {
        const consideration = this.considerations.find(c => c.id === considerationId);
        if (consideration) {
          const score = consideration.evaluate(this.agent);
          scores[considerationId] = score;
          totalScore += score * (consideration.weight || 1);
        }
      });

      // Add action's base score
      totalScore += action.baseScore || 0;

      return {
        action,
        score: totalScore,
        scores
      };
    });

    // Sort by score (highest first)
    scoredActions.sort((a, b) => b.score - a.score);

    // Select best action
    const best = scoredActions[0];
    this.selectedAction = best.action;

    return best.action;
  }

  /**
   * Execute selected action
   */
  execute(dt) {
    if (!this.selectedAction) return 'failure';
    return this.selectedAction.execute(this.agent, dt);
  }

  /**
   * Update and select action
   */
  update(dt) {
    this.selectAction();
    return this.execute(dt);
  }

  /**
   * Get action scores for debugging
   */
  getScores() {
    return this.actions.map(action => {
      let totalScore = 0;
      const scores = {};

      action.considerations.forEach(considerationId => {
        const consideration = this.considerations.find(c => c.id === considerationId);
        if (consideration) {
          const score = consideration.evaluate(this.agent);
          scores[considerationId] = score;
          totalScore += score * (consideration.weight || 1);
        }
      });

      totalScore += action.baseScore || 0;

      return {
        action: action.name || action.id,
        score: totalScore,
        scores
      };
    });
  }
}

/**
 * Base consideration class
 */
export class Consideration {
  constructor(id, evaluateFn, weight = 1) {
    this.id = id;
    this.evaluate = evaluateFn;
    this.weight = weight;
  }
}

/**
 * Action class
 */
export class Action {
  constructor(id, executeFn, considerations = [], baseScore = 0) {
    this.id = id;
    this.name = id;
    this.execute = executeFn;
    this.considerations = considerations;
    this.baseScore = baseScore;
  }
}

/**
 * Default scorer with common utility functions
 */
export class DefaultScorer {
  /**
   * Linear score: y = x
   */
  linear(value) {
    return Math.max(0, Math.min(1, value));
  }

  /**
   * Inverse linear: y = 1 - x
   */
  inverseLinear(value) {
    return 1 - this.linear(value);
  }

  /**
   * Quadratic: y = x^2
   */
  quadratic(value) {
    return Math.pow(this.linear(value), 2);
  }

  /**
   * Inverse quadratic: y = 1 - x^2
   */
  inverseQuadratic(value) {
    return 1 - this.quadratic(value);
  }

  /**
   * Exponential: y = x^n
   */
  exponential(value, exponent = 2) {
    return Math.pow(this.linear(value), exponent);
  }

  /**
   * Sigmoid: y = 1 / (1 + e^(-k(x-x0)))
   */
  sigmoid(value, k = 10, x0 = 0.5) {
    const normalized = this.linear(value);
    return 1 / (1 + Math.exp(-k * (normalized - x0)));
  }

  /**
   * Threshold: y = x > threshold ? 1 : 0
   */
  threshold(value, threshold = 0.5) {
    return this.linear(value) > threshold ? 1 : 0;
  }

  /**
   * Distance score: closer = higher score
   */
  distance(current, target, maxDistance = 100) {
    const dist = Math.sqrt(
      Math.pow(target.x - current.x, 2) +
      Math.pow(target.y - current.y, 2)
    );
    return 1 - Math.min(1, dist / maxDistance);
  }

  /**
   * Health score: lower health = higher score (for fleeing)
   */
  health(currentHealth, maxHealth = 100) {
    return 1 - (currentHealth / maxHealth);
  }

  /**
   * Time-based score: oscillates over time
   */
  oscillating(time, frequency = 1) {
    return (Math.sin(time * frequency * Math.PI * 2) + 1) / 2;
  }
}

/**
 * Pre-built considerations for horror games
 */
export class HorrorConsiderations {
  /**
   * Distance to player consideration
   */
  static distanceToPlayer(agent, maxDistance = 50) {
    if (!agent.player) return 0;
    const dx = agent.player.x - agent.x;
    const dz = agent.player.z - agent.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return 1 - Math.min(1, distance / maxDistance);
  }

  /**
   * Health consideration (low health = high score for defensive actions)
   */
  static lowHealth(agent) {
    return 1 - (agent.health / agent.maxHealth);
  }

  /**
   * Aggression consideration (based on game state)
   */
  static aggression(agent) {
    return agent.aggression || 0.5;
  }

  /**
   * Fear consideration (based on player's flashlight, etc.)
   */
  static fear(agent) {
    return agent.fear || 0;
  }

  /**
   * Line of sight consideration
   */
  static hasLineOfSight(agent) {
    return agent.hasLineOfSight ? 1 : 0;
  }

  /**
   * Cover availability consideration
   */
  static nearCover(agent, maxDistance = 10) {
    if (!agent.nearCover) return 0;
    const dx = agent.coverPosition.x - agent.x;
    const dz = agent.coverPosition.z - agent.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return 1 - Math.min(1, distance / maxDistance);
  }

  /**
   * Ammo/resource consideration
   */
  static lowResources(agent) {
    return 1 - (agent.ammo / agent.maxAmmo);
  }

  /**
   * Group behavior consideration (strength in numbers)
   */
  static nearAllies(agent, maxDistance = 20, minAllies = 2) {
    if (!agent.allies || agent.allies.length === 0) return 0;
    
    const nearbyAllies = agent.allies.filter(ally => {
      const dx = ally.x - agent.x;
      const dz = ally.z - agent.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      return distance <= maxDistance;
    });

    const score = nearbyAllies.length / minAllies;
    return Math.min(1, score);
  }

  /**
   * Time since last action (for variety)
   */
  static timeSinceLastAction(agent, maxTime = 10) {
    const timeSince = (Date.now() - agent.lastActionTime) / 1000;
    return Math.min(1, timeSince / maxTime);
  }

  /**
   * Random factor (for unpredictability)
   */
  static random() {
    return Math.random();
  }
}

/**
 * Utility AI Builder for easy configuration
 */
export class UtilityAIBuilder {
  constructor(agent) {
    this.ai = new UtilityAI(agent);
    this.scorer = new DefaultScorer();
  }

  action(id, executeFn) {
    this.currentAction = new Action(id, executeFn);
    return this;
  }

  withConsideration(id, evaluateFn, weight = 1) {
    this.currentAction.considerations.push(id);
    this.ai.addConsideration(new Consideration(id, evaluateFn, weight));
    return this;
  }

  withDistanceConsideration(weight = 1) {
    return this.withConsideration(
      'distance',
      (agent) => HorrorConsiderations.distanceToPlayer(agent),
      weight
    );
  }

  withHealthConsideration(weight = 1) {
    return this.withConsideration(
      'health',
      (agent) => HorrorConsiderations.lowHealth(agent),
      weight
    );
  }

  withAggressionConsideration(weight = 1) {
    return this.withConsideration(
      'aggression',
      (agent) => HorrorConsiderations.aggression(agent),
      weight
    );
  }

  build() {
    this.ai.addAction(this.currentAction);
    return this;
  }

  getAI() {
    return this.ai;
  }
}

export default UtilityAI;
