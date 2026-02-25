/**
 * AI Scheduler & Debugger - Phase 4: Advanced AI Systems
 * Performance-optimized AI execution with real-time debugging
 */

export class AIScheduler {
  constructor() {
    this.agents = [];
    this.updateQueue = [];
    this.maxUpdatesPerFrame = 10;
    this.currentTimeSlice = 0;
    this.statistics = {
      totalAgents: 0,
      activeAgents: 0,
      updateTime: 0,
      averageUpdateTime: 0
    };
  }

  /**
   * Add agent to scheduler
   */
  addAgent(agent) {
    this.agents.push(agent);
    this.statistics.totalAgents++;
  }

  /**
   * Remove agent from scheduler
   */
  removeAgent(agent) {
    const index = this.agents.indexOf(agent);
    if (index !== -1) {
      this.agents.splice(index, 1);
      this.statistics.totalAgents--;
    }
  }

  /**
   * Update AI agents (call every frame)
   */
  update(dt) {
    const startTime = performance.now();
    
    // Sort agents by priority
    this.agents.sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      return priorityB - priorityA;
    });

    // Update subset of agents per frame (performance optimization)
    const updatesThisFrame = Math.min(this.maxUpdatesPerFrame, this.agents.length);
    let activeCount = 0;

    for (let i = 0; i < updatesThisFrame; i++) {
      const index = (this.currentTimeSlice + i) % this.agents.length;
      const agent = this.agents[index];

      if (agent.active !== false) {
        agent.update(dt);
        activeCount++;
      }
    }

    this.currentTimeSlice = (this.currentTimeSlice + updatesThisFrame) % this.agents.length;
    this.statistics.activeAgents = activeCount;
    this.statistics.updateTime = performance.now() - startTime;
    
    // Smooth average update time
    this.statistics.averageUpdateTime = 
      this.statistics.averageUpdateTime * 0.9 + 
      this.statistics.updateTime * 0.1;
  }

  /**
   * Set max updates per frame
   */
  setMaxUpdatesPerFrame(max) {
    this.maxUpdatesPerFrame = max;
  }

  /**
   * Get scheduler statistics
   */
  getStatistics() {
    return this.statistics;
  }

  /**
   * Pause all agents
   */
  pause() {
    this.agents.forEach(agent => {
      agent.paused = true;
    });
  }

  /**
   * Resume all agents
   */
  resume() {
    this.agents.forEach(agent => {
      agent.paused = false;
    });
  }

  /**
   * Clear all agents
   */
  clear() {
    this.agents = [];
    this.statistics.totalAgents = 0;
    this.statistics.activeAgents = 0;
  }
}

/**
 * AI Debugger for real-time visualization
 */
export class AIDebugger {
  constructor(scheduler) {
    this.scheduler = scheduler;
    this.enabled = false;
    this.canvas = null;
    this.ctx = null;
    this.showPaths = true;
    this.showStates = true;
    this.showScores = false;
  }

  /**
   * Set canvas for debugging
   */
  setCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  /**
   * Enable debugging
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable debugging
   */
  disable() {
    this.enabled = false;
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Render debug information
   */
  render() {
    if (!this.enabled || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Render each agent
    this.scheduler.agents.forEach(agent => {
      this.renderAgent(agent);
    });

    // Render statistics
    this.renderStatistics();
  }

  /**
   * Render individual agent
   */
  renderAgent(agent) {
    const x = agent.x || 0;
    const y = agent.y || 0;

    // Draw agent position
    this.ctx.fillStyle = this.getAgentColor(agent);
    this.ctx.beginPath();
    this.ctx.arc(x, y, 5, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw path if available
    if (this.showPaths && agent.currentPath) {
      this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      agent.currentPath.forEach(point => {
        this.ctx.lineTo(point.x, point.y);
      });
      this.ctx.stroke();
    }

    // Draw state if available
    if (this.showStates && agent.currentState) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '10px monospace';
      this.ctx.fillText(agent.currentState, x + 8, y - 8);
    }

    // Draw scores if available
    if (this.showScores && agent.ai?.getScores) {
      const scores = agent.ai.getScores();
      this.ctx.fillStyle = '#ff0';
      this.ctx.font = '9px monospace';
      scores.forEach((score, i) => {
        this.ctx.fillText(`${score.action}: ${score.score.toFixed(2)}`, x + 8, y + i * 10);
      });
    }
  }

  /**
   * Render statistics panel
   */
  renderStatistics() {
    const stats = this.scheduler.getStatistics();
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 200, 100);
    
    this.ctx.fillStyle = '#0f0';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`AI Statistics:`, 20, 30);
    this.ctx.fillText(`Total Agents: ${stats.totalAgents}`, 20, 50);
    this.ctx.fillText(`Active Agents: ${stats.activeAgents}`, 20, 70);
    this.ctx.fillText(`Update Time: ${stats.updateTime.toFixed(2)}ms`, 20, 90);
    this.ctx.fillText(`Avg Update: ${stats.averageUpdateTime.toFixed(2)}ms`, 20, 110);
  }

  /**
   * Get color based on agent state
   */
  getAgentColor(agent) {
    if (agent.state === 'idle') return '#888';
    if (agent.state === 'patrol') return '#0f0';
    if (agent.state === 'chase') return '#f00';
    if (agent.state === 'attack') return '#f0f';
    if (agent.state === 'flee') return '#00f';
    return '#fff';
  }

  /**
   * Toggle debug features
   */
  togglePaths() {
    this.showPaths = !this.showPaths;
  }

  toggleStates() {
    this.showStates = !this.showStates;
  }

  toggleScores() {
    this.showScores = !this.showScores;
  }
}

export default { AIScheduler, AIDebugger };
