/**
 * Limited-Time Game Modes
 * Phase 6: Live Events & Seasonal Content
 */

class LimitedTimeModes {
  constructor() {
    this.modes = new Map();
    this.activeInstances = new Map();
  }
  
  createMode(config) {
    const mode = {
      id: config.id || `mode_${Date.now()}`,
      name: config.name,
      description: config.description,
      type: config.type, // survival, speedrun, hardcore, etc.
      rules: config.rules || [],
      modifiers: config.modifiers || {},
      rewards: config.rewards || [],
      duration: config.duration,
      maxPlayers: config.maxPlayers || 100,
      startDate: config.startDate,
      endDate: config.endDate,
      status: 'scheduled'
    };
    
    this.modes.set(mode.id, mode);
    return mode;
  }
  
  startMode(modeId, instanceConfig) {
    const mode = this.modes.get(modeId);
    if (!mode) return null;
    
    const instance = {
      id: `instance_${Date.now()}`,
      modeId,
      players: [],
      startTime: Date.now(),
      state: 'active',
      ...instanceConfig
    };
    
    this.activeInstances.set(instance.id, instance);
    return instance;
  }
  
  joinInstance(instanceId, userId) {
    const instance = this.activeInstances.get(instanceId);
    if (!instance || instance.players.length >= instance.maxPlayers) {
      return { success: false, error: 'Cannot join' };
    }
    
    instance.players.push(userId);
    return { success: true };
  }
  
  getStats() {
    return {
      totalModes: this.modes.size,
      activeInstances: this.activeInstances.size
    };
  }
}

module.exports = LimitedTimeModes;
