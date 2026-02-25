/**
 * Multi-Agent Neural AI System - Phase 6: Advanced AI
 * Coordinates multiple AI agents with shared knowledge and tactical awareness
 * Enables squad-based horror enemies that hunt cooperatively
 */

export class MultiAgentAI {
  constructor(options = {}) {
    this.options = {
      maxAgents: options.maxAgents || 50,
      communicationRange: options.communicationRange || 100,
      sharedMemoryEnabled: options.sharedMemoryEnabled || true,
      tacticalAnalysisEnabled: options.tacticalAnalysisEnabled || true,
      updateInterval: options.updateInterval || 100, // ms
      ...options
    };

    this.agents = new Map();
    this.squads = new Map();
    
    // Shared knowledge base
    this.sharedMemory = {
      playerLastSeen: null,
      playerPosition: null,
      playerVelocity: null,
      suspiciousNoises: [],
      dangerousAreas: [],
      safeZones: [],
      patrolRoutes: []
    };

    // Tactical analysis
    this.tacticalMap = new Map();
    this.coverPositions = [];
    this.ambushPoints = [];
    this.chokepoints = [];

    // Communication network
    this.communicationNetwork = new Map();
    
    // Update timing
    this.lastUpdate = 0;
    this.updateInterval = this.options.updateInterval;
  }

  /**
   * Add an agent to the system
   */
  addAgent(agentConfig) {
    if (this.agents.size >= this.options.maxAgents) {
      console.warn('Max agents reached');
      return null;
    }

    const agent = {
      id: agentConfig.id || this.generateId(),
      type: agentConfig.type || 'hunter',
      position: agentConfig.position || { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      state: agentConfig.state || 'patrol',
      health: agentConfig.health || 100,
      aggression: agentConfig.aggression || 0.5,
      awareness: agentConfig.awareness || 0.7,
      squadId: agentConfig.squadId || null,
      
      // Individual memory
      memory: {
        lastKnownPlayerPos: null,
        personalObservations: [],
        fearLevel: 0,
        alertness: 0.5
      },

      // Behavior tree or state machine
      behavior: agentConfig.behavior || 'default',
      
      // Capabilities
      capabilities: {
        canSee: true,
        canHear: true,
        canCommunicate: true,
        speed: agentConfig.speed || 5,
        perceptionRange: agentConfig.perceptionRange || 50
      }
    };

    this.agents.set(agent.id, agent);
    
    // Add to squad if specified
    if (agent.squadId) {
      this.addToSquad(agent.id, agent.squadId);
    }

    // Setup communication links
    this.setupCommunication(agent.id);

    return agent;
  }

  /**
   * Remove an agent
   */
  removeAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Remove from squad
    if (agent.squadId) {
      this.removeFromSquad(agentId, agent.squadId);
    }

    // Cleanup communication
    this.communicationNetwork.delete(agentId);

    this.agents.delete(agentId);
  }

  /**
   * Create a squad of agents
   */
  createSquad(squadId, agentIds, config = {}) {
    const squad = {
      id: squadId,
      agentIds,
      leader: agentIds[0],
      formation: config.formation || 'spread',
      tactic: config.tactic || 'hunt',
      morale: 1.0,
      coordination: config.coordination || 0.8
    };

    this.squads.set(squadId, squad);

    // Update agent squad references
    agentIds.forEach(agentId => {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.squadId = squadId;
      }
    });

    return squad;
  }

  /**
   * Add agent to squad
   */
  addToSquad(agentId, squadId) {
    const squad = this.squads.get(squadId);
    if (!squad) return;

    if (!squad.agentIds.includes(agentId)) {
      squad.agentIds.push(agentId);
    }

    const agent = this.agents.get(agentId);
    if (agent) {
      agent.squadId = squadId;
    }
  }

  /**
   * Remove agent from squad
   */
  removeFromSquad(agentId, squadId) {
    const squad = this.squads.get(squadId);
    if (!squad) return;

    squad.agentIds = squad.agentIds.filter(id => id !== agentId);

    const agent = this.agents.get(agentId);
    if (agent) {
      agent.squadId = null;
    }
  }

  /**
   * Update all agents
   */
  update(deltaTime, gameState) {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;

    this.lastUpdate = now;

    // Update shared memory from environment
    this.updateSharedMemory(gameState);

    // Update tactical analysis
    if (this.options.tacticalAnalysisEnabled) {
      this.updateTacticalMap(gameState);
    }

    // Update each agent
    this.agents.forEach((agent, agentId) => {
      this.updateAgent(agent, deltaTime, gameState);
    });

    // Update squads
    this.squads.forEach(squad => {
      this.updateSquad(squad, deltaTime, gameState);
    });

    // Process communications
    this.processCommunications();
  }

  /**
   * Update individual agent
   */
  updateAgent(agent, deltaTime, gameState) {
    // Perception update
    this.updateAgentPerception(agent, gameState);

    // Decision making based on state
    switch (agent.state) {
      case 'patrol':
        this.updatePatrolState(agent, deltaTime);
        break;
      case 'investigate':
        this.updateInvestigateState(agent, deltaTime);
        break;
      case 'chase':
        this.updateChaseState(agent, deltaTime);
        break;
      case 'attack':
        this.updateAttackState(agent, deltaTime);
        break;
      case 'flee':
        this.updateFleeState(agent, deltaTime);
        break;
      case 'ambush':
        this.updateAmbushState(agent, deltaTime);
        break;
    }

    // Update memory
    agent.memory.personalObservations.push({
      timestamp: Date.now(),
      position: { ...agent.position },
      state: agent.state
    });

    // Keep memory manageable
    if (agent.memory.personalObservations.length > 50) {
      agent.memory.personalObservations.shift();
    }
  }

  /**
   * Update agent perception
   */
  updateAgentPerception(agent, gameState) {
    const { player } = gameState;
    if (!player) return;

    // Calculate distance to player
    const dx = player.position.x - agent.position.x;
    const dy = player.position.y - agent.position.y;
    const dz = player.position.z - agent.position.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

    // Check line of sight (simplified)
    const hasLineOfSight = this.checkLineOfSight(agent.position, player.position, gameState);

    // Update awareness based on visibility
    if (hasLineOfSight && distance < agent.capabilities.perceptionRange) {
      agent.memory.alertness = Math.min(1.0, agent.memory.alertness + 0.1);
      agent.memory.lastKnownPlayerPos = { ...player.position };
      
      // Share with squad
      if (agent.squadId) {
        this.sharedMemory.playerPosition = { ...player.position };
        this.sharedMemory.playerLastSeen = Date.now();
      }
    } else {
      // Decay alertness
      agent.memory.alertness = Math.max(0, agent.memory.alertness - 0.01);
    }

    // Hear sounds
    if (gameState.sounds && agent.capabilities.canHear) {
      gameState.sounds.forEach(sound => {
        const soundDist = Math.sqrt(
          Math.pow(sound.x - agent.position.x, 2) +
          Math.pow(sound.z - agent.position.z, 2)
        );
        
        if (soundDist < agent.capabilities.perceptionRange * 2) {
          agent.memory.alertness = Math.min(1.0, agent.memory.alertness + 0.05);
          
          // Move toward sound if curious
          if (agent.state === 'patrol' && agent.aggression > 0.3) {
            agent.state = 'investigate';
            agent.memory.lastKnownPlayerPos = { x: sound.x, y: sound.y, z: sound.z };
          }
        }
      });
    }
  }

  /**
   * Update patrol state
   */
  updatePatrolState(agent, deltaTime) {
    // Follow patrol route or wander
    if (this.sharedMemory.patrolRoutes.length > 0) {
      // Follow assigned patrol route
      const route = this.sharedMemory.patrolRoutes[0];
      // Implementation would move agent along route points
    } else {
      // Random wandering
      const angle = Math.random() * Math.PI * 2;
      agent.velocity.x = Math.cos(angle) * agent.capabilities.speed * 0.5;
      agent.velocity.z = Math.sin(angle) * agent.capabilities.speed * 0.5;
    }

    // Transition to investigate if alerted
    if (agent.memory.alertness > 0.7) {
      agent.state = 'investigate';
    }
  }

  /**
   * Update investigate state
   */
  updateInvestigateState(agent, deltaTime) {
    if (!agent.memory.lastKnownPlayerPos) {
      agent.state = 'patrol';
      return;
    }

    // Move toward last known position
    const dx = agent.memory.lastKnownPlayerPos.x - agent.position.x;
    const dz = agent.memory.lastKnownPlayerPos.z - agent.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);

    if (dist > 2) {
      agent.velocity.x = (dx / dist) * agent.capabilities.speed;
      agent.velocity.z = (dz / dist) * agent.capabilities.speed;
    } else {
      // Arrived at position, look around
      if (agent.memory.alertness < 0.5) {
        agent.state = 'patrol';
      }
    }
  }

  /**
   * Update chase state
   */
  updateChaseState(agent, deltaTime) {
    if (!this.sharedMemory.playerPosition) {
      agent.state = 'investigate';
      return;
    }

    // Full speed pursuit
    const dx = this.sharedMemory.playerPosition.x - agent.position.x;
    const dz = this.sharedMemory.playerPosition.z - agent.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);

    if (dist > 1) {
      agent.velocity.x = (dx / dist) * agent.capabilities.speed * 1.5;
      agent.velocity.z = (dz / dist) * agent.capabilities.speed * 1.5;
    }

    // Attack if close enough
    if (dist < 5) {
      agent.state = 'attack';
    }
  }

  /**
   * Update attack state
   */
  updateAttackState(agent, deltaTime) {
    // Attack logic would go here
    // For now, just stay in place
    agent.velocity = { x: 0, y: 0, z: 0 };
  }

  /**
   * Update flee state
   */
  updateFleeState(agent, deltaTime) {
    if (!this.sharedMemory.playerPosition) {
      agent.state = 'patrol';
      return;
    }

    // Run away from player
    const dx = agent.position.x - this.sharedMemory.playerPosition.x;
    const dz = agent.position.z - this.sharedMemory.playerPosition.z;
    const dist = Math.sqrt(dx*dx + dz*dz);

    if (dist > 0) {
      agent.velocity.x = (dx / dist) * agent.capabilities.speed * 1.5;
      agent.velocity.z = (dz / dist) * agent.capabilities.speed * 1.5;
    }
  }

  /**
   * Update ambush state
   */
  updateAmbushState(agent, deltaTime) {
    // Stay hidden and wait
    agent.velocity = { x: 0, y: 0, z: 0 };
    
    // Jump out if player nearby
    if (this.sharedMemory.playerPosition) {
      const dist = Math.sqrt(
        Math.pow(agent.position.x - this.sharedMemory.playerPosition.x, 2) +
        Math.pow(agent.position.z - this.sharedMemory.playerPosition.z, 2)
      );
      
      if (dist < 10 && agent.aggression > 0.5) {
        agent.state = 'attack';
      }
    }
  }

  /**
   * Update squad tactics
   */
  updateSquad(squad, deltaTime, gameState) {
    if (squad.agentIds.length < 2) return;

    const leader = this.agents.get(squad.leader);
    if (!leader) return;

    // Coordinate squad movement based on tactic
    switch (squad.tactic) {
      case 'hunt':
        this.executeHuntTactic(squad, gameState);
        break;
      case 'flank':
        this.executeFlankTactic(squad, gameState);
        break;
      case 'surround':
        this.executeSurroundTactic(squad, gameState);
        break;
      case 'ambush':
        this.executeAmbushTactic(squad, gameState);
        break;
    }

    // Maintain formation
    if (squad.formation !== 'none') {
      this.maintainFormation(squad);
    }
  }

  /**
   * Execute hunting tactic
   */
  executeHuntTactic(squad, gameState) {
    if (!this.sharedMemory.playerPosition) return;

    squad.agentIds.forEach((agentId, index) => {
      const agent = this.agents.get(agentId);
      if (!agent) return;

      if (agent.state !== 'chase') {
        agent.state = 'chase';
      }

      // Spread out while chasing
      const offsetAngle = (index / squad.agentIds.length) * Math.PI * 2;
      const offsetDist = 10;
      
      // Adjust target position slightly
      agent.memory.targetOffset = {
        x: Math.cos(offsetAngle) * offsetDist,
        z: Math.sin(offsetAngle) * offsetDist
      };
    });
  }

  /**
   * Maintain squad formation
   */
  maintainFormation(squad) {
    const leader = this.agents.get(squad.leader);
    if (!leader) return;

    const formationOffsets = {
      'spread': squad.agentIds.map((id, i) => ({
        x: Math.cos(i * Math.PI / 3) * 15,
        z: Math.sin(i * Math.PI / 3) * 15
      })),
      'line': squad.agentIds.map((id, i) => ({
        x: (i - squad.agentIds.length/2) * 8,
        z: 0
      })),
      'wedge': squad.agentIds.map((id, i) => ({
        x: i * 6,
        z: Math.abs(i - squad.agentIds.length/2) * 8
      }))
    };

    const offsets = formationOffsets[squad.formation] || formationOffsets['spread'];

    squad.agentIds.forEach((agentId, index) => {
      const agent = this.agents.get(agentId);
      if (!agent || agentId === squad.leader) return;

      const offset = offsets[index];
      if (!offset) return;

      // Move toward formation position relative to leader
      const targetX = leader.position.x + offset.x;
      const targetZ = leader.position.z + offset.z;

      const dx = targetX - agent.position.x;
      const dz = targetZ - agent.position.z;
      const dist = Math.sqrt(dx*dx + dz*dz);

      if (dist > 2) {
        agent.velocity.x = (dx / dist) * agent.capabilities.speed * 0.8;
        agent.velocity.z = (dz / dist) * agent.capabilities.speed * 0.8;
      }
    });
  }

  /**
   * Setup communication links
   */
  setupCommunication(agentId) {
    const links = [];
    
    this.agents.forEach((otherAgent, otherId) => {
      if (otherId === agentId) return;
      
      const dist = Math.sqrt(
        Math.pow(agent.position.x - otherAgent.position.x, 2) +
        Math.pow(agent.position.z - otherAgent.position.z, 2)
      );
      
      if (dist < this.options.communicationRange) {
        links.push(otherId);
      }
    });

    this.communicationNetwork.set(agentId, links);
  }

  /**
   * Process inter-agent communication
   */
  processCommunications() {
    this.communicationNetwork.forEach((links, agentId) => {
      const agent = this.agents.get(agentId);
      if (!agent || !agent.capabilities.canCommunicate) return;

      // Share important information
      if (agent.memory.lastKnownPlayerPos) {
        links.forEach(linkedId => {
          const linkedAgent = this.agents.get(linkedId);
          if (linkedAgent && !linkedAgent.memory.lastKnownPlayerPos) {
            // Share player position
            linkedAgent.memory.lastKnownPlayerPos = { ...agent.memory.lastKnownPlayerPos };
            linkedAgent.memory.alertness = Math.max(linkedAgent.memory.alertness, agent.memory.alertness);
          }
        });
      }
    });
  }

  /**
   * Update shared memory
   */
  updateSharedMemory(gameState) {
    // Update from game state
    if (gameState.player) {
      // Only update if recently seen by any agent
      let recentlySeen = false;
      this.agents.forEach(agent => {
        if (agent.memory.lastKnownPlayerPos) {
          recentlySeen = true;
        }
      });

      if (recentlySeen) {
        this.sharedMemory.playerPosition = { ...gameState.player.position };
        this.sharedMemory.playerLastSeen = Date.now();
      }
    }

    // Clear old data
    if (this.sharedMemory.playerLastSeen && 
        Date.now() - this.sharedMemory.playerLastSeen > 30000) {
      this.sharedMemory.playerPosition = null;
    }
  }

  /**
   * Update tactical map
   */
  updateTacticalMap(gameState) {
    // Analyze level for tactical positions
    // This would use raycasting and spatial analysis
    
    // Placeholder: mark some positions as cover
    this.coverPositions = [];
    this.ambushPoints = [];
    this.chokepoints = [];
  }

  /**
   * Simple line of sight check
   */
  checkLineOfSight(from, to, gameState) {
    // Simplified - would use raycasting in real implementation
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // Assume clear LOS for now
    return dist < 100;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get system statistics
   */
  getStats() {
    return {
      totalAgents: this.agents.size,
      totalSquads: this.squads.size,
      activeAgents: Array.from(this.agents.values()).filter(a => a.state !== 'patrol').length,
      communicationLinks: Array.from(this.communicationNetwork.values()).reduce((sum, links) => sum + links.length, 0)
    };
  }
}

export default MultiAgentAI;
