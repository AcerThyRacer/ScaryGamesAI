/**
 * Dynamic Event Scheduler & Memory System - Phase 6
 * Time-based events, NPC memory, and consequence tracking
 */

export class EventScheduler {
  constructor() {
    this.events = [];
    this.activeEvents = new Map();
    this.triggers = [];
    this.timeScale = 1.0;
    this.currentTime = 0;
  }

  scheduleEvent(event) {
    const scheduledEvent = {
      id: event.id || `event_${Date.now()}`,
      type: event.type,
      triggerTime: event.delay || event.time || 0,
      executionTime: event.delay || event.time || 0,
      condition: event.condition,
      action: event.action,
      repeat: event.repeat || false,
      repeatInterval: event.interval || 0,
      priority: event.priority || 0,
      completed: false
    };
    
    this.events.push(scheduledEvent);
    this.events.sort((a, b) => b.priority - a.priority);
    
    return scheduledEvent;
  }

  addTrigger(condition, action, priority = 0) {
    this.triggers.push({
      id: `trigger_${this.triggers.length}`,
      condition,
      action,
      priority,
      active: true
    });
  }

  update(dt, context = {}) {
    this.currentTime += dt * this.timeScale;
    
    // Check triggers
    this.triggers.forEach(trigger => {
      if (!trigger.active) return;
      if (trigger.condition(context)) {
        trigger.action(context);
      }
    });
    
    // Process scheduled events
    this.events.forEach(event => {
      if (event.completed) return;
      
      event.executionTime -= dt * this.timeScale;
      
      if (event.executionTime <= 0 && !event.completed) {
        // Check condition
        if (event.condition && !event.condition(context)) {
          return;
        }
        
        // Execute action
        event.action(context);
        event.completed = true;
        this.activeEvents.set(event.id, event);
        
        // Handle repeat
        if (event.repeat) {
          event.executionTime = event.repeatInterval;
          event.completed = false;
        }
      }
    });
    
    // Cleanup completed non-repeating events
    this.events = this.events.filter(e => !(e.completed && !e.repeat));
  }

  cancelEvent(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.completed = true;
    }
  }

  clear() {
    this.events = [];
    this.activeEvents.clear();
  }
}

export class NPCMemory {
  constructor(npcId) {
    this.npcId = npcId;
    this.memories = [];
    this.relationships = new Map();
    this.knowledge = new Map();
    this.personality = {
      trust: 50,
      fear: 0,
      aggression: 0,
      helpfulness: 50
    };
  }

  remember(event) {
    const memory = {
      id: `memory_${Date.now()}`,
      timestamp: Date.now(),
      type: event.type,
      actor: event.actor,
      target: event.target,
      description: event.description,
      emotionalImpact: event.emotionalImpact || 0,
      importance: event.importance || 1
    };
    
    this.memories.push(memory);
    
    // Update relationships
    if (event.actor && event.emotionalImpact) {
      this.updateRelationship(event.actor, event.emotionalImpact);
    }
    
    // Decay old memories
    this.decayMemories();
    
    return memory;
  }

  updateRelationship(otherId, impact) {
    if (!this.relationships.has(otherId)) {
      this.relationships.set(otherId, {
        trust: 50,
        affinity: 50,
        interactions: 0
      });
    }
    
    const rel = this.relationships.get(otherId);
    rel.trust += impact * 0.1;
    rel.affinity += impact * 0.15;
    rel.interactions++;
    
    // Clamp values
    rel.trust = Math.max(0, Math.min(100, rel.trust));
    rel.affinity = Math.max(0, Math.min(100, rel.affinity));
  }

  getRelationship(otherId) {
    return this.relationships.get(otherId) || null;
  }

  decayMemories() {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    this.memories = this.memories.filter(memory => {
      const age = now - memory.timestamp;
      return age < maxAge;
    });
  }

  getMemories(filters = {}) {
    return this.memories.filter(memory => {
      if (filters.type && memory.type !== filters.type) return false;
      if (filters.actor && memory.actor !== filters.actor) return false;
      if (filters.minImportance && memory.importance < filters.minImportance) return false;
      return true;
    });
  }

  learn(factId, fact) {
    this.knowledge.set(factId, {
      ...fact,
      learnedAt: Date.now(),
      confidence: fact.confidence || 1
    });
  }

  know(factId) {
    return this.knowledge.get(factId);
  }

  forget(factId) {
    this.knowledge.delete(factId);
  }

  getPersonality() {
    return { ...this.personality };
  }

  export() {
    return {
      npcId: this.npcId,
      memories: this.memories,
      relationships: Array.from(this.relationships.entries()),
      knowledge: Array.from(this.knowledge.entries()),
      personality: this.personality
    };
  }

  import(data) {
    this.memories = data.memories || [];
    this.relationships = new Map(data.relationships);
    this.knowledge = new Map(data.knowledge);
    this.personality = data.personality || this.personality;
  }
}

export class ConsequenceTracker {
  constructor() {
    this.consequences = [];
    this.worldState = {};
    this.playerActions = [];
    this.globalVariables = {};
  }

  trackAction(action) {
    const trackedAction = {
      id: `action_${Date.now()}`,
      timestamp: Date.now(),
      type: action.type,
      actor: action.actor,
      target: action.target,
      description: action.description,
      immediateEffects: action.immediateEffects || {},
      delayedEffects: action.delayedEffects || [],
      permanence: action.permanence || 'temporary'
    };
    
    this.playerActions.push(trackedAction);
    
    // Apply immediate effects
    this.applyEffects(trackedAction.immediateEffects);
    
    // Schedule delayed effects
    trackedAction.delayedEffects.forEach(effect => {
      setTimeout(() => {
        this.applyEffects(effect);
      }, effect.delay || 0);
    });
    
    return trackedAction;
  }

  applyEffects(effects) {
    Object.entries(effects).forEach(([key, value]) => {
      if (key.startsWith('world.')) {
        const worldKey = key.substring(6);
        this.worldState[worldKey] = value;
      } else if (key.startsWith('global.')) {
        const globalKey = key.substring(7);
        this.globalVariables[globalKey] = value;
      }
    });
  }

  getWorldState(key) {
    return key ? this.worldState[key] : this.worldState;
  }

  getGlobalVariable(key) {
    return this.globalVariables[key];
  }

  getPlayerHistory(filters = {}) {
    return this.playerActions.filter(action => {
      if (filters.type && action.type !== filters.type) return false;
      if (filters.target && action.target !== filters.target) return false;
      return true;
    });
  }

  hasConsequence(actionType, targetType) {
    return this.playerActions.some(action => 
      action.type === actionType && action.target === targetType
    );
  }

  export() {
    return {
      consequences: this.consequences,
      worldState: this.worldState,
      playerActions: this.playerActions,
      globalVariables: this.globalVariables
    };
  }

  import(data) {
    this.consequences = data.consequences || [];
    this.worldState = data.worldState || {};
    this.playerActions = data.playerActions || [];
    this.globalVariables = data.globalVariables || {};
  }
}

export default { DialogueSystem, EventScheduler, NPCMemory, ConsequenceTracker };
