/**
 * PHASE 2: ADVANCED AI SYSTEM
 * Backrooms: Pac-Man Flagship Polish
 * 
 * Features:
 * - 6 emotional states (Fear, Aggression, Curiosity, Panic, Rage, Despair)
 * - Emotional state machine with transitions
 * - Squad tactics (4 roles: Leader, Scout, Ambusher, Tank)
 * - Q-learning for adaptive difficulty
 * - Threat assessment and response
 * - Pack hunting behaviors
 * 
 * Target: +35% player engagement, intelligent enemy behavior
 */

import { BehaviorTree } from '../../core/ai/BehaviorTree.js';
import { UtilityAI } from '../../core/ai/UtilityAI.js';

export class AdvancedAISystem {
  constructor(game) {
    this.game = game;
    this.enemies = new Map();
    this.squads = new Map();
    
    // Emotional states
    this.EMOTIONS = {
      FEAR: 'fear',
      AGGRESSION: 'aggression',
      CURIOSITY: 'curiosity',
      PANIC: 'panic',
      RAGE: 'rage',
      DESPAIR: 'despair'
    };
    
    // Squad roles
    this.ROLES = {
      LEADER: 'leader',
      SCOUT: 'scout',
      AMBUSHER: 'ambusher',
      TANK: 'tank'
    };
    
    // Q-learning
    this.qTable = new Map();
    this.learningRate = 0.1;
    this.discountFactor = 0.9;
    this.explorationRate = 0.2;
    
    // Difficulty adaptation
    this.difficultyLevel = 1.0;
    this.playerPerformanceHistory = [];
  }

  initialize() {
    console.log('[Phase2 AI] Initializing Advanced AI System...');
    
    // Create behavior trees for each emotion
    this.createEmotionalBehaviorTrees();
    
    // Initialize utility AI scoring
    this.initializeUtilityAI();
    
    console.log('[Phase2 AI] ✅ Advanced AI System ready');
  }

  createEmotionalBehaviorTrees() {
    // FEAR behavior tree
    this.fearTree = new BehaviorTree({
      root: new BehaviorTree.Selector([
        new BehaviorTree.Sequence([
          new BehaviorTree.Condition(() => this.isPlayerVisible()),
          new BehaviorTree.Action(() => this.fleeFromPlayer())
        ]),
        new BehaviorTree.Action(() => this.hideInShadows()),
        new BehaviorTree.Action(() => this.patrolNervously())
      ])
    });
    
    // AGGRESSION behavior tree
    this.aggressionTree = new BehaviorTree({
      root: new BehaviorTree.Selector([
        new BehaviorTree.Sequence([
          new BehaviorTree.Condition(() => this.isPlayerVisible()),
          new BehaviorTree.Action(() => this.chasePlayer())
        ]),
        new BehaviorTree.Action(() => this.huntLastKnownPosition()),
        new BehaviorTree.Action(() => this.patrolAggressively())
      ])
    });
    
    // CURIOSITY behavior tree
    this.curiosityTree = new BehaviorTree({
      root: new BehaviorTree.Selector([
        new BehaviorTree.Sequence([
          new BehaviorTree.Condition(() => this.hearSuspiciousSound()),
          new BehaviorTree.Action(() => this.investigateSound())
        ]),
        new BehaviorTree.Action(() => this.exploreArea()),
        new BehaviorTree.Action(() => this.patrolCuriously())
      ])
    });
    
    // PANIC behavior tree
    this.panicTree = new BehaviorTree({
      root: new BehaviorTree.Selector([
        new BehaviorTree.Action(() => this.runRandomly()),
        new BehaviorTree.Action(() => this.cowerInCorner()),
        new BehaviorTree.Action(() => this.callForHelp())
      ])
    });
    
    // RAGE behavior tree
    this.rageTree = new BehaviorTree({
      root: new BehaviorTree.Selector([
        new BehaviorTree.Action(() => this.chargeAtPlayer()),
        new BehaviorTree.Action(() => this.attackRelentlessly()),
        new BehaviorTree.Action(() => this.destroyEnvironment())
      ])
    });
    
    // DESPAIR behavior tree
    this.despairTree = new BehaviorTree({
      root: new BehaviorTree.Selector([
        new BehaviorTree.Action(() => this.wanderAimlessly()),
        new BehaviorTree.Action(() => this.sitDejectedly()),
        new BehaviorTree.Action(() => this.giveUpChase())
      ])
    });
  }

  initializeUtilityAI() {
    this.utilityAI = new UtilityAI({
      actions: [
        {
          name: 'chase',
          scoreFunction: (state) => this.scoreChase(state)
        },
        {
          name: 'flee',
          scoreFunction: (state) => this.scoreFlee(state)
        },
        {
          name: 'patrol',
          scoreFunction: (state) => this.scorePatrol(state)
        },
        {
          name: 'ambush',
          scoreFunction: (state) => this.scoreAmbush(state)
        },
        {
          name: 'hide',
          scoreFunction: (state) => this.scoreHide(state)
        },
        {
          name: 'callForHelp',
          scoreFunction: (state) => this.scoreCallForHelp(state)
        }
      ]
    });
  }

  createEnemy(id, config = {}) {
    const enemy = {
      id,
      position: config.position || { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      
      // Emotional state
      currentEmotion: this.EMOTIONS.CURIOSITY,
      emotionLevels: {
        [this.EMOTIONS.FEAR]: 0.3,
        [this.EMOTIONS.AGGRESSION]: 0.5,
        [this.EMOTIONS.CURIOSITY]: 0.7,
        [this.EMOTIONS.PANIC]: 0.0,
        [this.EMOTIONS.RAGE]: 0.0,
        [this.EMOTIONS.DESPAIR]: 0.0
      },
      
      // Squad role
      role: config.role || this.ROLES.SCOUT,
      squadId: config.squadId || null,
      
      // AI components
      behaviorTree: null,
      utilityAI: this.utilityAI.clone(),
      
      // Q-learning
      qTable: new Map(),
      
      // State
      currentState: 'idle',
      target: null,
      lastKnownPlayerPosition: null,
      
      // Stats
      speed: config.speed || 3.0,
      health: config.health || 100,
      detectionRange: config.detectionRange || 15,
      
      // Memory
      memory: {
        playerPositions: [],
        dangerousAreas: [],
        safeSpots: []
      }
    };
    
    // Assign behavior tree based on initial emotion
    enemy.behaviorTree = this.getBehaviorTreeForEmotion(enemy.currentEmotion);
    
    this.enemies.set(id, enemy);
    
    // Add to squad if specified
    if (enemy.squadId) {
      this.addToSquad(enemy.squadId, enemy);
    }
    
    return enemy;
  }

  getBehaviorTreeForEmotion(emotion) {
    switch (emotion) {
      case this.EMOTIONS.FEAR: return this.fearTree;
      case this.EMOTIONS.AGGRESSION: return this.aggressionTree;
      case this.EMOTIONS.CURIOSITY: return this.curiosityTree;
      case this.EMOTIONS.PANIC: return this.panicTree;
      case this.EMOTIONS.RAGE: return this.rageTree;
      case this.EMOTIONS.DESPAIR: return this.despairTree;
      default: return this.curiosityTree;
    }
  }

  updateEmotions(enemy, deltaTime, gameState) {
    const { emotionLevels } = enemy;
    const playerDistance = this.distanceToPlayer(enemy);
    const playerVisible = this.isPlayerVisibleFrom(enemy);
    const recentDamage = enemy.recentDamage || 0;
    const squadSize = this.getSquadSize(enemy.squadId);
    
    // Update fear based on player proximity and power
    if (playerVisible && playerDistance < 10) {
      emotionLevels[this.EMOTIONS.FEAR] += deltaTime * 0.5;
    } else {
      emotionLevels[this.EMOTIONS.FEAR] -= deltaTime * 0.2;
    }
    
    // Update aggression based on squad size and confidence
    if (squadSize >= 3 && playerDistance < 20) {
      emotionLevels[this.EMOTIONS.AGGRESSION] += deltaTime * 0.4;
    }
    
    // Update curiosity when hearing sounds
    if (gameState.recentSounds && gameState.recentSounds.length > 0) {
      emotionLevels[this.EMOTIONS.CURIOSITY] += deltaTime * 0.6;
    }
    
    // Update panic when damaged or alone
    if (recentDamage > 50 || (squadSize === 1 && playerVisible)) {
      emotionLevels[this.EMOTIONS.PANIC] += deltaTime * 0.8;
    }
    
    // Update rage when frustrated (can't reach player)
    if (playerVisible && playerDistance < 5 && !enemy.canReachPlayer) {
      emotionLevels[this.EMOTIONS.RAGE] += deltaTime * 1.0;
    }
    
    // Update despair after long unsuccessful hunt
    if (enemy.timeSincePlayerContact > 120) {
      emotionLevels[this.EMOTIONS.DESPAIR] += deltaTime * 0.3;
    }
    
    // Clamp values
    for (const emotion in emotionLevels) {
      emotionLevels[emotion] = Math.max(0, Math.min(1, emotionLevels[emotion]));
    }
    
    // Determine dominant emotion
    const dominantEmotion = this.getDominantEmotion(emotionLevels);
    
    // Transition if new emotion is significantly stronger
    if (dominantEmotion !== enemy.currentEmotion) {
      const transitionThreshold = 0.3;
      if (emotionLevels[dominantEmotion] - emotionLevels[enemy.currentEmotion] > transitionThreshold) {
        this.transitionEmotion(enemy, dominantEmotion);
      }
    }
    
    // Decay emotions over time
    this.decayEmotions(emotionLevels, deltaTime);
  }

  getDominantEmotion(emotionLevels) {
    let maxLevel = 0;
    let dominant = this.EMOTIONS.CURIOSITY;
    
    for (const [emotion, level] of Object.entries(emotionLevels)) {
      if (level > maxLevel) {
        maxLevel = level;
        dominant = emotion;
      }
    }
    
    return dominant;
  }

  transitionEmotion(enemy, newEmotion) {
    const oldEmotion = enemy.currentEmotion;
    enemy.currentEmotion = newEmotion;
    enemy.behaviorTree = this.getBehaviorTreeForEmotion(newEmotion);
    
    console.log(`[Phase2 AI] Enemy ${enemy.id} emotion: ${oldEmotion} → ${newEmotion}`);
    
    // Trigger emotion-specific effects
    this.onEmotionChanged(enemy, oldEmotion, newEmotion);
  }

  onEmotionChanged(enemy, oldEmotion, newEmotion) {
    switch (newEmotion) {
      case this.EMOTIONS.FEAR:
        // Increase movement speed, decrease accuracy
        enemy.speed *= 1.3;
        break;
        
      case this.EMOTIONS.RAGE:
        // Significantly increase speed and damage
        enemy.speed *= 1.5;
        enemy.damageMultiplier = 2.0;
        break;
        
      case this.EMOTIONS.PANIC:
        // Erratic movement, call for help
        this.callNearbyEnemies(enemy);
        break;
        
      case this.EMOTIONS.DESPAIR:
        // Give up chase, wander aimlessly
        enemy.target = null;
        break;
    }
  }

  decayEmotions(emotionLevels, deltaTime) {
    const decayRates = {
      [this.EMOTIONS.FEAR]: 0.1,
      [this.EMOTIONS.AGGRESSION]: 0.15,
      [this.EMOTIONS.CURIOSITY]: 0.2,
      [this.EMOTIONS.PANIC]: 0.3,
      [this.EMOTIONS.RAGE]: 0.25,
      [this.EMOTIONS.DESPAIR]: 0.05
    };
    
    for (const [emotion, rate] of Object.entries(decayRates)) {
      emotionLevels[emotion] -= deltaTime * rate;
    }
  }

  updateSquadTactics(deltaTime) {
    for (const [squadId, squad] of this.squads) {
      this.updateSquad(squad, deltaTime);
    }
  }

  updateSquad(squad, deltaTime) {
    const leader = squad.members.find(m => m.role === this.ROLES.LEADER);
    
    if (!leader) return;
    
    // Leader coordinates squad
    const members = squad.members;
    
    // Formation logic
    switch (squad.tactic) {
      case 'hunt':
        this.executeHuntFormation(squad, leader);
        break;
      case 'ambush':
        this.executeAmbushFormation(squad, leader);
        break;
      case 'defend':
        this.executeDefendFormation(squad, leader);
        break;
      case 'flank':
        this.executeFlankFormation(squad, leader);
        break;
    }
    
    // Squad communication
    this.shareInformation(squad);
  }

  executeHuntFormation(squad, leader) {
    const members = squad.members;
    
    // Scout moves ahead
    const scouts = members.filter(m => m.role === this.ROLES.SCOUT);
    scouts.forEach(scout => {
      scout.target = this.predictPlayerPosition(2.0); // 2 seconds ahead
    });
    
    // Tank protects leader
    const tanks = members.filter(m => m.role === this.ROLES.TANK);
    tanks.forEach(tank => {
      tank.target = this.getPositionBetween(leader.position, scout.position, 0.3);
    });
    
    // Ambushers try to cut off escape routes
    const ambushers = members.filter(m => m.role === this.ROLES.AMBUSHER);
    ambushers.forEach(ambusher => {
      ambusher.target = this.getInterceptPosition();
    });
    
    // Leader coordinates from behind
    leader.target = this.getPositionBehind(leader, 10);
  }

  executeAmbushFormation(squad, leader) {
    const members = squad.members;
    
    // Set up ambush along predicted player path
    const ambushPoints = this.calculateAmbushPoints();
    
    members.forEach((member, index) => {
      if (ambushPoints[index]) {
        member.target = ambushPoints[index];
        member.currentState = 'hiding';
      }
    });
  }

  calculateAmbushPoints() {
    // Calculate optimal ambush positions along common player paths
    const points = [];
    const commonPaths = this.getCommonPlayerPaths();
    
    for (const path of commonPaths) {
      const ambushPoint = this.findNearbyCover(path);
      if (ambushPoint) {
        points.push(ambushPoint);
      }
    }
    
    return points;
  }

  shareInformation(squad) {
    // Share last known player position
    const sharedInfo = {
      lastKnownPosition: null,
      time: Date.now()
    };
    
    for (const member of squad.members) {
      if (member.lastKnownPlayerPosition) {
        if (!sharedInfo.lastKnownPosition || 
            member.lastKnownPlayerPosition.time > sharedInfo.time) {
          sharedInfo.lastKnownPosition = member.lastKnownPlayerPosition;
          sharedInfo.time = member.lastKnownPlayerPosition.time;
        }
      }
    }
    
    // Distribute to all squad members
    for (const member of squad.members) {
      if (sharedInfo.lastKnownPosition) {
        member.lastKnownPlayerPosition = sharedInfo.lastKnownPosition;
      }
    }
  }

  // Q-Learning implementation
  updateQLearning(enemy, state, action, reward, nextState) {
    const stateKey = JSON.stringify(state);
    const nextStateKey = JSON.stringify(nextState);
    
    // Initialize Q-values if not present
    if (!enemy.qTable.has(stateKey)) {
      enemy.qTable.set(stateKey, {});
    }
    
    const currentQ = enemy.qTable.get(stateKey)[action] || 0;
    
    // Get max Q-value for next state
    let maxNextQ = 0;
    if (enemy.qTable.has(nextStateKey)) {
      const nextQValues = enemy.qTable.get(nextStateKey);
      maxNextQ = Math.max(...Object.values(nextQValues), 0);
    }
    
    // Q-learning update formula
    const newQ = currentQ + this.learningRate * (
      reward + this.discountFactor * maxNextQ - currentQ
    );
    
    enemy.qTable.get(stateKey)[action] = newQ;
  }

  chooseAction(enemy, state) {
    const stateKey = JSON.stringify(state);
    
    // Exploration vs exploitation
    if (Math.random() < this.explorationRate) {
      // Explore: random action
      const actions = ['chase', 'flee', 'patrol', 'ambush', 'hide'];
      return actions[Math.floor(Math.random() * actions.length)];
    } else {
      // Exploit: best known action
      if (!enemy.qTable.has(stateKey)) {
        return 'patrol'; // Default action
      }
      
      const qValues = enemy.qTable.get(stateKey);
      let bestAction = 'patrol';
      let bestValue = -Infinity;
      
      for (const [action, value] of Object.entries(qValues)) {
        if (value > bestValue) {
          bestValue = value;
          bestAction = action;
        }
      }
      
      return bestAction;
    }
  }

  adaptDifficulty(playerPerformance) {
    // Track player performance
    this.playerPerformanceHistory.push({
      timestamp: Date.now(),
      ...playerPerformance
    });
    
    // Keep only recent history (last 10 minutes)
    const cutoff = Date.now() - 10 * 60 * 1000;
    this.playerPerformanceHistory = this.playerPerformanceHistory.filter(
      p => p.timestamp > cutoff
    );
    
    // Analyze performance trend
    const avgPerformance = this.calculateAveragePerformance();
    
    // Adjust difficulty
    if (avgPerformance.deathRate > 0.7) {
      // Player dying too much, reduce difficulty
      this.difficultyLevel = Math.max(0.5, this.difficultyLevel - 0.05);
    } else if (avgPerformance.deathRate < 0.2 && avgPerformance completionRate > 0.8) {
      // Player doing too well, increase difficulty
      this.difficultyLevel = Math.min(2.0, this.difficultyLevel + 0.05);
    }
    
    // Apply difficulty modifier to enemies
    this.applyDifficultyModifier();
  }

  applyDifficultyModifier() {
    const modifier = this.difficultyLevel;
    
    for (const enemy of this.enemies.values()) {
      // Adjust enemy stats based on difficulty
      enemy.speed = enemy.baseSpeed * (0.8 + modifier * 0.4);
      enemy.detectionRange = enemy.baseDetectionRange * (0.8 + modifier * 0.4);
      enemy.emotionDecayRate = modifier; // Higher difficulty = emotions persist longer
    }
  }

  update(deltaTime, time) {
    // Update all enemies
    for (const [id, enemy] of this.enemies) {
      // Update emotional state
      this.updateEmotions(enemy, deltaTime, this.game.getState());
      
      // Update behavior tree
      if (enemy.behaviorTree) {
        enemy.behaviorTree.update(enemy, deltaTime);
      }
      
      // Update utility AI
      if (enemy.utilityAI) {
        const state = this.getCurrentState(enemy);
        const action = enemy.utilityAI.chooseAction(state);
        this.executeAction(enemy, action);
      }
      
      // Q-learning update (periodic)
      if (time % 1000 < 16) { // Once per second
        const state = this.getCurrentState(enemy);
        const action = this.chooseAction(enemy, state);
        const reward = this.calculateReward(enemy, action);
        // Store for next update
        enemy.pendingQLearning = { state, action, reward };
      }
    }
    
    // Update squad tactics
    this.updateSquadTactics(deltaTime);
    
    // Adapt difficulty based on player performance
    if (time % 5000 < 16) { // Every 5 seconds
      this.adaptDifficulty(this.game.getPlayerPerformance());
    }
  }

  // Utility functions (to be implemented with game integration)
  distanceToPlayer(enemy) { /* ... */ }
  isPlayerVisibleFrom(enemy) { /* ... */ }
  getSquadSize(squadId) { /* ... */ }
  predictPlayerPosition(secondsAhead) { /* ... */ }
  getPositionBetween(pos1, pos2, t) { /* ... */ }
  getInterceptPosition() { /* ... */ }
  getPositionBehind(entity, distance) { /* ... */ }
  getCommonPlayerPaths() { /* ... */ }
  findNearbyCover(position) { /* ... */ }
  getCurrentState(enemy) { /* ... */ }
  executeAction(enemy, action) { /* ... */ }
  calculateReward(enemy, action) { /* ... */ }
  calculateAveragePerformance() { /* ... */ }
  callNearbyEnemies(enemy) { /* ... */ }
  addToSquad(squadId, enemy) { /* ... */ }
  hearSuspiciousSound() { /* ... */ }
  fleeFromPlayer() { /* ... */ }
  hideInShadows() { /* ... */ }
  patrolNervously() { /* ... */ }
  chasePlayer() { /* ... */ }
  huntLastKnownPosition() { /* ... */ }
  patrolAggressively() { /* ... */ }
  investigateSound() { /* ... */ }
  exploreArea() { /* ... */ }
  patrolCuriously() { /* ... */ }
  runRandomly() { /* ... */ }
  cowerInCorner() { /* ... */ }
  chargeAtPlayer() { /* ... */ }
  attackRelentlessly() { /* ... */ }
  destroyEnvironment() { /* ... */ }
  wanderAimlessly() { /* ... */ }
  sitDejectedly() { /* ... */ }
  giveUpChase() { /* ... */ }
  isPlayerVisible() { /* ... */ }
  callForHelp() { /* ... */ }
  scoreChase(state) { /* ... */ }
  scoreFlee(state) { /* ... */ }
  scorePatrol(state) { /* ... */ }
  scoreAmbush(state) { /* ... */ }
  scoreHide(state) { /* ... */ }
  scoreCallForHelp(state) { /* ... */ }

  dispose() {
    this.enemies.clear();
    this.squads.clear();
    this.qTable.clear();
    console.log('[Phase2 AI] Advanced AI System disposed');
  }
}

// Export singleton instance helper
let aiSystemInstance = null;

export function getAdvancedAISystem(game) {
  if (!aiSystemInstance) {
    aiSystemInstance = new AdvancedAISystem(game);
  }
  return aiSystemInstance;
}
