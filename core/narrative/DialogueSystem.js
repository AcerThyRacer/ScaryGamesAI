/**
 * Branching Dialogue System - Phase 6: Dynamic Narrative
 * Graph-based dialogue with player choices and consequences
 */

export class DialogueSystem {
  constructor() {
    this.dialogues = new Map();
    this.currentDialogue = null;
    this.currentNode = null;
    this.history = [];
    this.variables = {};
    this.callbacks = {};
  }

  /**
   * Create a new dialogue graph
   */
  createDialogue(id, nodes, startNode = 'start') {
    this.dialogues.set(id, {
      id,
      nodes: new Map(Object.entries(nodes)),
      startNode
    });
    return this.dialogues.get(id);
  }

  /**
   * Start a dialogue
   */
  startDialogue(id, initialVariables = {}) {
    const dialogue = this.dialogues.get(id);
    if (!dialogue) {
      console.error(`Dialogue "${id}" not found`);
      return null;
    }

    this.currentDialogue = dialogue;
    this.currentNode = dialogue.nodes.get(dialogue.startNode);
    this.history = [];
    this.variables = { ...initialVariables };
    
    this.triggerCallback('onStart', id);
    
    return this.getCurrentText();
  }

  /**
   * Get current dialogue text
   */
  getCurrentText() {
    if (!this.currentNode) return null;
    
    // Process variables in text
    let text = this.currentNode.text;
    Object.entries(this.variables).forEach(([key, value]) => {
      text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    
    return {
      text,
      speaker: this.currentNode.speaker,
      choices: this.getAvailableChoices(),
      metadata: this.currentNode.metadata
    };
  }

  /**
   * Get available choices for current node
   */
  getAvailableChoices() {
    if (!this.currentNode || !this.currentNode.choices) return [];
    
    return this.currentNode.choices.filter(choice => {
      if (!choice.condition) return true;
      return this.evaluateCondition(choice.condition);
    }).map(choice => ({
      id: choice.id,
      text: choice.text,
      nextNode: choice.nextNode
    }));
  }

  /**
   * Make a choice
   */
  choose(choiceId) {
    if (!this.currentNode || !this.currentNode.choices) return null;
    
    const choice = this.currentNode.choices.find(c => c.id === choiceId);
    if (!choice) return null;
    
    // Check condition
    if (choice.condition && !this.evaluateCondition(choice.condition)) {
      return null;
    }
    
    // Record history
    this.history.push({
      nodeId: this.currentNode.id,
      choiceId,
      timestamp: Date.now()
    });
    
    // Apply effects
    if (choice.effects) {
      this.applyEffects(choice.effects);
    }
    
    // Move to next node
    this.currentNode = this.currentDialogue.nodes.get(choice.nextNode);
    
    if (!this.currentNode) {
      this.endDialogue();
      return null;
    }
    
    this.triggerCallback('onChoice', choiceId, this.currentNode.id);
    
    return this.getCurrentText();
  }

  /**
   * Evaluate condition
   */
  evaluateCondition(condition) {
    if (typeof condition === 'boolean') return condition;
    if (typeof condition === 'string') {
      return this.evaluateExpression(condition);
    }
    if (typeof condition === 'function') {
      return condition(this.variables, this.history);
    }
    return false;
  }

  /**
   * Evaluate simple expression
   */
  evaluateExpression(expr) {
    try {
      // Safe evaluation with variables
      const vars = this.variables;
      const func = new Function('vars', 'history', `with(vars) { return ${expr}; }`);
      return func(vars, this.history);
    } catch (e) {
      console.error('Condition evaluation error:', e);
      return false;
    }
  }

  /**
   * Apply effects to variables
   */
  applyEffects(effects) {
    if (!effects) return;
    
    Object.entries(effects).forEach(([key, value]) => {
      if (typeof value === 'string' && value.startsWith('+')) {
        this.variables[key] = (this.variables[key] || 0) + parseFloat(value.substring(1));
      } else if (typeof value === 'string' && value.startsWith('-')) {
        this.variables[key] = (this.variables[key] || 0) - parseFloat(value.substring(1));
      } else {
        this.variables[key] = value;
      }
    });
    
    this.triggerCallback('onVariablesChange', this.variables);
  }

  /**
   * End dialogue
   */
  endDialogue() {
    const dialogueId = this.currentDialogue?.id;
    this.currentDialogue = null;
    this.currentNode = null;
    this.triggerCallback('onEnd', dialogueId);
  }

  /**
   * Register callback
   */
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  /**
   * Trigger callback
   */
  triggerCallback(event, ...args) {
    const callbacks = this.callbacks[event] || [];
    callbacks.forEach(cb => cb(...args));
  }

  /**
   * Get dialogue state
   */
  getState() {
    return {
      dialogueId: this.currentDialogue?.id,
      nodeId: this.currentNode?.id,
      variables: { ...this.variables },
      history: [...this.history]
    };
  }

  /**
   * Set dialogue state
   */
  setState(state) {
    if (state.dialogueId) {
      this.currentDialogue = this.dialogues.get(state.dialogueId);
    }
    if (state.nodeId && this.currentDialogue) {
      this.currentNode = this.currentDialogue.nodes.get(state.nodeId);
    }
    this.variables = { ...state.variables };
    this.history = [...state.history];
  }

  /**
   * Export dialogue to JSON
   */
  exportDialogue(id) {
    const dialogue = this.dialogues.get(id);
    if (!dialogue) return null;
    
    return JSON.stringify({
      id: dialogue.id,
      startNode: dialogue.startNode,
      nodes: Array.from(dialogue.nodes.entries())
    }, null, 2);
  }

  /**
   * Import dialogue from JSON
   */
  importDialogue(json) {
    try {
      const data = JSON.parse(json);
      const nodes = new Map(data.nodes);
      return this.createDialogue(data.id, Object.fromEntries(nodes), data.startNode);
    } catch (e) {
      console.error('Failed to import dialogue:', e);
      return null;
    }
  }
}

/**
 * Dialogue Tree Builder for easy creation
 */
export class DialogueBuilder {
  constructor(id) {
    this.id = id;
    this.nodes = {};
    this.currentNodeId = null;
  }

  node(id, text, speaker = '') {
    this.currentNodeId = id;
    this.nodes[id] = {
      id,
      text,
      speaker,
      choices: []
    };
    return this;
  }

  choice(text, nextNode, options = {}) {
    if (!this.currentNodeId) {
      throw new Error('Must call .node() before .choice()');
    }
    
    this.nodes[this.currentNodeId].choices.push({
      id: `choice_${this.nodes[this.currentNodeId].choices.length}`,
      text,
      nextNode,
      condition: options.condition,
      effects: options.effects
    });
    
    return this;
  }

  condition(expr) {
    return expr;
  }

  effects(effectsObj) {
    return effectsObj;
  }

  build() {
    return { id: this.id, nodes: this.nodes };
  }
}

export default DialogueSystem;
