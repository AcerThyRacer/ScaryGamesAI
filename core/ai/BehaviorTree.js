/**
 * Behavior Tree System - Phase 4: Advanced AI Systems
 * Hierarchical AI decision-making for all 10 horror games
 * Features: Composite nodes, decorators, blackboard, real-time execution
 */

export class BehaviorTree {
  constructor(root) {
    this.root = root;
    this.blackboard = new Map();
    this.runningNode = null;
  }

  /**
   * Execute one step of the behavior tree
   */
  update(agent, dt) {
    if (!this.root) return 'failure';
    
    const result = this.root.execute(agent, this.blackboard, dt);
    
    if (result === 'running') {
      this.runningNode = this.root;
    } else {
      this.runningNode = null;
    }
    
    return result;
  }

  /**
   * Set blackboard value
   */
  setValue(key, value) {
    this.blackboard.set(key, value);
  }

  /**
   * Get blackboard value
   */
  getValue(key, defaultValue = null) {
    return this.blackboard.has(key) ? this.blackboard.get(key) : defaultValue;
  }

  /**
   * Clear blackboard
   */
  clear() {
    this.blackboard.clear();
    this.runningNode = null;
  }
}

/**
 * Base node class
 */
export class BTNode {
  constructor() {
    this.state = 'ready';
  }

  execute(agent, blackboard, dt) {
    return 'success';
  }

  start(agent, blackboard) {}
  update(agent, blackboard, dt) { return 'success'; }
  end(agent, blackboard, result) {}
}

/**
 * Selector Node - Returns success if any child succeeds
 */
export class Selector extends BTNode {
  constructor(children = []) {
    super();
    this.children = children;
    this.currentChildIndex = 0;
  }

  start(agent, blackboard) {
    this.currentChildIndex = 0;
  }

  execute(agent, blackboard, dt) {
    if (this.state === 'ready') {
      this.start(agent, blackboard);
      this.state = 'running';
    }

    while (this.currentChildIndex < this.children.length) {
      const child = this.children[this.currentChildIndex];
      const result = child.execute(agent, blackboard, dt);

      if (result === 'running') {
        return 'running';
      }

      if (result === 'success') {
        this.end(agent, blackboard, 'success');
        this.state = 'ready';
        return 'success';
      }

      this.currentChildIndex++;
    }

    this.end(agent, blackboard, 'failure');
    this.state = 'ready';
    return 'failure';
  }

  end(agent, blackboard, result) {
    this.children.forEach(child => {
      if (child.state === 'running') {
        child.end(agent, blackboard, 'failure');
        child.state = 'ready';
      }
    });
  }
}

/**
 * Sequence Node - Returns success only if all children succeed
 */
export class Sequence extends BTNode {
  constructor(children = []) {
    super();
    this.children = children;
    this.currentChildIndex = 0;
  }

  start(agent, blackboard) {
    this.currentChildIndex = 0;
  }

  execute(agent, blackboard, dt) {
    if (this.state === 'ready') {
      this.start(agent, blackboard);
      this.state = 'running';
    }

    while (this.currentChildIndex < this.children.length) {
      const child = this.children[this.currentChildIndex];
      const result = child.execute(agent, blackboard, dt);

      if (result === 'running') {
        return 'running';
      }

      if (result === 'failure') {
        this.end(agent, blackboard, 'failure');
        this.state = 'ready';
        return 'failure';
      }

      this.currentChildIndex++;
    }

    this.end(agent, blackboard, 'success');
    this.state = 'ready';
    return 'success';
  }

  end(agent, blackboard, result) {
    this.children.forEach(child => {
      if (child.state === 'running') {
        child.end(agent, blackboard, 'failure');
        child.state = 'ready';
      }
    });
  }
}

/**
 * Action Node - Leaf node that performs an action
 */
export class Action extends BTNode {
  constructor(actionFn) {
    super();
    this.actionFn = actionFn;
  }

  execute(agent, blackboard, dt) {
    this.state = 'running';
    const result = this.actionFn(agent, blackboard, dt);
    
    if (result !== 'running') {
      this.state = 'ready';
    }
    
    return result;
  }
}

/**
 * Condition Node - Checks a condition
 */
export class Condition extends BTNode {
  constructor(conditionFn) {
    super();
    this.conditionFn = conditionFn;
  }

  execute(agent, blackboard, dt) {
    const result = this.conditionFn(agent, blackboard);
    return result ? 'success' : 'failure';
  }
}

/**
 * Decorator Node - Modifies child behavior
 */
export class Decorator extends BTNode {
  constructor(child) {
    super();
    this.child = child;
  }

  execute(agent, blackboard, dt) {
    return this.child.execute(agent, blackboard, dt);
  }
}

/**
 * Inverter - Inverts result (success <-> failure)
 */
export class Inverter extends Decorator {
  execute(agent, blackboard, dt) {
    const result = this.child.execute(agent, blackboard, dt);
    
    if (result === 'success') return 'failure';
    if (result === 'failure') return 'success';
    return 'running';
  }
}

/**
 * Repeater - Repeats child execution N times
 */
export class Repeater extends Decorator {
  constructor(child, count) {
    super(child);
    this.count = count;
    this.currentCount = 0;
  }

  start(agent, blackboard) {
    this.currentCount = 0;
  }

  execute(agent, blackboard, dt) {
    if (this.state === 'ready') {
      this.start(agent, blackboard);
      this.state = 'running';
    }

    const result = this.child.execute(agent, blackboard, dt);

    if (result === 'success') {
      this.currentCount++;
      if (this.currentCount >= this.count) {
        this.state = 'ready';
        return 'success';
      }
      this.child.state = 'ready';
      return 'running';
    }

    if (result === 'failure') {
      this.state = 'ready';
      return 'failure';
    }

    return 'running';
  }
}

/**
 * Cooldown - Adds cooldown before child can execute
 */
export class Cooldown extends Decorator {
  constructor(child, duration) {
    super(child);
    this.duration = duration;
    this.timer = 0;
  }

  execute(agent, blackboard, dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      return 'running';
    }

    const result = this.child.execute(agent, blackboard, dt);

    if (result === 'success' || result === 'failure') {
      this.timer = this.duration;
    }

    return result;
  }
}

/**
 * Priority Selector - Executes children based on priority
 */
export class PrioritySelector extends Selector {
  constructor(children = [], priorities = []) {
    super(children);
    this.priorities = priorities;
  }

  start(agent, blackboard) {
    // Sort children by priority (higher first)
    const indexed = this.children.map((child, i) => ({
      child,
      priority: this.priorities[i] || 0
    }));
    
    indexed.sort((a, b) => b.priority - a.priority);
    this.sortedChildren = indexed.map(item => item.child);
    this.currentChildIndex = 0;
  }
}

/**
 * Parallel Node - Executes all children simultaneously
 */
export class Parallel extends BTNode {
  constructor(children = [], policy = 'success_one') {
    super();
    this.children = children;
    this.policy = policy; // 'success_one', 'fail_one', 'always_complete'
    this.results = [];
  }

  start(agent, blackboard) {
    this.results = this.children.map(() => null);
  }

  execute(agent, blackboard, dt) {
    if (this.state === 'ready') {
      this.start(agent, blackboard);
      this.state = 'running';
    }

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < this.children.length; i++) {
      if (this.results[i] !== null) continue;

      const result = this.children[i].execute(agent, blackboard, dt);

      if (result === 'running') {
        continue;
      }

      this.results[i] = result;

      if (result === 'success') {
        successCount++;
        if (this.policy === 'success_one') {
          this.end(agent, blackboard, 'success');
          this.state = 'ready';
          return 'success';
        }
      } else {
        failureCount++;
        if (this.policy === 'fail_one') {
          this.end(agent, blackboard, 'failure');
          this.state = 'ready';
          return 'failure';
        }
      }
    }

    const allComplete = this.results.every(r => r !== null);
    
    if (allComplete) {
      if (this.policy === 'always_complete') {
        const result = successCount >= failureCount ? 'success' : 'failure';
        this.end(agent, blackboard, result);
        this.state = 'ready';
        return result;
      }
    }

    return 'running';
  }

  end(agent, blackboard, result) {
    this.children.forEach((child, i) => {
      if (child.state === 'running') {
        child.end(agent, blackboard, result);
        child.state = 'ready';
      }
    });
  }
}

export default BehaviorTree;
