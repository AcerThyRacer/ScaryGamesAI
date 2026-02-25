/**
 * Co-op & Competitive Game Modes - Phase 7
 * Pre-built multiplayer modes for horror games
 */

export class CooperativeMode {
  constructor(network, options = {}) {
    this.network = network;
    this.players = new Map();
    this.sharedState = {};
    this.objectives = [];
    this.host = options.host || false;
  }

  join(playerId, playerData) {
    this.players.set(playerId, {
      id: playerId,
      ...playerData,
      joinedAt: Date.now()
    });
    
    if (this.host) {
      this.syncState();
    }
  }

  leave(playerId) {
    this.players.delete(playerId);
  }

  addObjective(objective) {
    this.objectives.push({
      id: `obj_${this.objectives.length}`,
      ...objective,
      completed: false,
      progress: 0
    });
  }

  updateObjectiveProgress(objectiveId, progress) {
    const objective = this.objectives.find(o => o.id === objectiveId);
    if (objective) {
      objective.progress = progress;
      if (progress >= objective.target) {
        objective.completed = true;
        this.onObjectiveComplete(objective);
      }
      this.syncState();
    }
  }

  onObjectiveComplete(objective) {
    console.log('Objective completed:', objective.id);
    this.network.send('objective_complete', {
      objectiveId: objective.id,
      rewards: objective.rewards
    });
  }

  shareResource(resourceType, amount, targetPlayerId = null) {
    if (targetPlayerId) {
      this.network.send('resource_transfer', {
        from: this.network.playerId,
        to: targetPlayerId,
        resource: resourceType,
        amount
      });
    } else {
      // Broadcast to all
      this.network.broadcast('resource_shared', {
        from: this.network.playerId,
        resource: resourceType,
        amount
      });
    }
  }

  revivePlayer(targetPlayerId) {
    this.network.send('player_revived', {
      reviver: this.network.playerId,
      target: targetPlayerId
    });
  }

  syncState() {
    this.network.send('state_sync', {
      sharedState: this.sharedState,
      objectives: this.objectives,
      players: Array.from(this.players.values())
    });
  }

  updateSharedState(key, value) {
    this.sharedState[key] = value;
    if (this.host) {
      this.syncState();
    }
  }
}

export class CompetitiveMode {
  constructor(network, options = {}) {
    this.network = network;
    this.players = new Map();
    this.scores = new Map();
    this.matchState = 'waiting'; // waiting, playing, ended
    this.timer = 0;
    this.maxTime = options.maxTime || 300; // 5 minutes
  }

  join(playerId, playerData) {
    this.players.set(playerId, {
      id: playerId,
      ...playerData,
      score: 0
    });
    this.scores.set(playerId, 0);
  }

  leave(playerId) {
    this.players.delete(playerId);
    this.scores.delete(playerId);
  }

  startMatch() {
    this.matchState = 'playing';
    this.timer = this.maxTime;
    this.network.send('match_started', {
      duration: this.maxTime
    });
  }

  endMatch() {
    this.matchState = 'ended';
    
    // Determine winner
    let winner = null;
    let maxScore = 0;
    
    this.scores.forEach((score, playerId) => {
      if (score > maxScore) {
        maxScore = score;
        winner = playerId;
      }
    });
    
    this.network.send('match_ended', {
      winner,
      scores: Object.fromEntries(this.scores)
    });
  }

  updateScore(playerId, points) {
    const current = this.scores.get(playerId) || 0;
    this.scores.set(playerId, current + points);
    
    this.network.send('score_update', {
      playerId,
      score: current + points,
      delta: points
    });
  }

  getLeaderboard() {
    return Array.from(this.scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([playerId, score], index) => ({
        rank: index + 1,
        playerId,
        score
      }));
  }

  updateTimer(dt) {
    if (this.matchState === 'playing') {
      this.timer -= dt;
      
      if (this.timer <= 0) {
        this.endMatch();
      }
      
      if (this.timer % 10 < dt) { // Every 10 seconds
        this.network.send('timer_update', {
          remaining: Math.ceil(this.timer)
        });
      }
    }
  }
}

/**
 * Blood Tetris Battle Mode
 */
export class TetrisBattle extends CompetitiveMode {
  sendGarbageLines(targetPlayerId, lines) {
    this.network.send('garbage_attack', {
      from: this.network.playerId,
      to: targetPlayerId,
      lines
    });
  }

  clearLines(lines) {
    const lineBonuses = { 1: 0, 2: 1, 3: 3, 4: 6 }; // Tetris bonus
    const garbageToSend = lineBonuses[lines] || 0;
    
    if (garbageToSend > 0) {
      // Send to random opponent
      const opponents = Array.from(this.players.keys())
        .filter(id => id !== this.network.playerId);
      
      if (opponents.length > 0) {
        const target = opponents[Math.floor(Math.random() * opponents.length)];
        this.sendGarbageLines(target, garbageToSend);
      }
    }
    
    this.updateScore(this.network.playerId, lines * 100);
  }
}

/**
 * Zombie Horde Co-op Mode
 */
export class ZombieCoop extends CooperativeMode {
  constructor(network, options = {}) {
    super(network, options);
    this.wave = 0;
    this.zombiesRemaining = 0;
    this.baseHealth = options.baseHealth || 100;
  }

  startWave(zombieCount) {
    this.wave++;
    this.zombiesRemaining = zombieCount;
    
    this.network.send('wave_started', {
      wave: this.wave,
      zombies: zombieCount
    });
  }

  zombieKilled(killerId) {
    this.zombiesRemaining--;
    
    if (this.zombiesRemaining <= 0) {
      this.completeWave();
    }
    
    this.updateScore(killerId, 10);
  }

  completeWave() {
    this.network.send('wave_complete', {
      wave: this.wave,
      rewards: {
        ammo: 50,
        health: 25
      }
    });
  }

  baseDamaged(amount) {
    this.baseHealth -= amount;
    
    this.updateSharedState('baseHealth', this.baseHealth);
    
    if (this.baseHealth <= 0) {
      this.gameOver();
    }
  }

  gameOver() {
    this.network.send('game_over', {
      reason: 'base_destroyed',
      wavesCompleted: this.wave
    });
  }
}

/**
 * Séance Group Ritual Mode
 */
export class RitualSession extends CooperativeMode {
  constructor(network, options = {}) {
    super(network, options);
    this.ritualProgress = 0;
    this.ritualTarget = 100;
    this.spiritPresence = 0;
  }

  performRitualAction(playerId, actionType, power) {
    this.ritualProgress += power;
    
    this.network.send('ritual_action', {
      player: playerId,
      action: actionType,
      power
    });
    
    if (this.ritualProgress >= this.ritualTarget) {
      this.completeRitual();
    }
  }

  spiritAppears(strength) {
    this.spiritPresence = strength;
    
    this.network.send('spirit_manifest', {
      strength
    });
  }

  completeRitual() {
    this.network.send('ritual_complete', {
      success: true,
      participants: Array.from(this.players.keys())
    });
  }
}

export default {
  CooperativeMode,
  CompetitiveMode,
  TetrisBattle,
  ZombieCoop,
  RitualSession
};
