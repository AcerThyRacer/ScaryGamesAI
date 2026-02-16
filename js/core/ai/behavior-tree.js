/**
 * ============================================
 * SGAI AI Framework - Phase 14: Behavior Trees & GOAP
 * ============================================
 * Modular AI decision making.
 * 
 * Key Benefits:
 * - Behavior tree nodes
 * - GOAP planning
 * - Dynamic evaluation
 */

(function(global) {
    'use strict';

    // ============================================
    // BEHAVIOR TREE
    // ============================================

    /**
     * Base node for behavior tree
     */
    class BTNode {
        constructor(options = {}) {
            this.name = options.name || 'Node';
            this.children = [];
            this.parent = null;
            this.status = 'idle'; // idle, running, success, failure
        }

        /**
         * Execute node
         */
        execute(agent, dt) {
            throw new Error('Execute not implemented');
        }

        /**
         * Add child node
         */
        addChild(child) {
            child.parent = this;
            this.children.push(child);
            return this;
        }

        /**
         * Reset node
         */
        reset() {
            this.status = 'idle';
            for (const child of this.children) {
                child.reset();
            }
        }
    }

    /**
     * Sequence node: runs children in order
     */
    class BTSequence extends BTNode {
        constructor(options = {}) {
            super(options);
        }

        execute(agent, dt) {
            for (const child of this.children) {
                child.status = child.execute(agent, dt);
                
                if (child.status === 'failure') {
                    this.status = 'failure';
                    return 'failure';
                }
                
                if (child.status === 'running') {
                    this.status = 'running';
                    return 'running';
                }
            }
            
            this.status = 'success';
            return 'success';
        }
    }

    /**
     * Selector node: tries children until one succeeds
     */
    class BTSelector extends BTNode {
        constructor(options = {}) {
            super(options);
        }

        execute(agent, dt) {
            for (const child of this.children) {
                child.status = child.execute(agent, dt);
                
                if (child.status === 'success') {
                    this.status = 'success';
                    return 'success';
                }
                
                if (child.status === 'running') {
                    this.status = 'running';
                    return 'running';
                }
            }
            
            this.status = 'failure';
            return 'failure';
        }
    }

    /**
     * Parallel node: runs all children
     */
    class BTParallel extends BTNode {
        constructor(options = {}) {
            super(options);
            this.requiredSuccess = options.requiredSuccess || 1;
        }

        execute(agent, dt) {
            let successCount = 0;
            
            for (const child of this.children) {
                child.status = child.execute(agent, dt);
                
                if (child.status === 'success') successCount++;
                if (child.status === 'running') this.status = 'running';
            }
            
            if (successCount >= this.requiredSuccess) {
                this.status = 'success';
            } else {
                this.status = 'running';
            }
            
            return this.status;
        }
    }

    /**
     * Inverter node: inverts child result
     */
    class BTInverter extends BTNode {
        execute(agent, dt) {
            const child = this.children[0];
            if (!child) return 'failure';
            
            const result = child.execute(agent, dt);
            
            if (result === 'success') this.status = 'failure';
            else if (result === 'failure') this.status = 'success';
            else this.status = result;
            
            return this.status;
        }
    }

    /**
     * Condition node: checks a condition
     */
    class BTCondition extends BTNode {
        constructor(options = {}) {
            super(options);
            this.condition = options.condition || (() => true);
        }

        execute(agent, dt) {
            this.status = this.condition(agent) ? 'success' : 'failure';
            return this.status;
        }
    }

    /**
     * Action node: performs an action
     */
    class BTAction extends BTNode {
        constructor(options = {}) {
            super(options);
            this.action = options.action || (() => 'success');
        }

        execute(agent, dt) {
            this.status = this.action(agent, dt);
            return this.status;
        }
    }

    /**
     * Wait node
     */
    class BTWait extends BTNode {
        constructor(options = {}) {
            super(options);
            this.duration = options.duration || 1;
            this.timer = 0;
        }

        execute(agent, dt) {
            this.timer += dt;
            
            if (this.timer >= this.duration) {
                this.timer = 0;
                this.status = 'success';
            } else {
                this.status = 'running';
            }
            
            return this.status;
        }

        reset() {
            super.reset();
            this.timer = 0;
        }
    }

    // ============================================
    // GOAP (Goal-Oriented Action Planning)
    // ============================================

    /**
     * GOAP Agent
     */
    class GOAPAgent {
        constructor(options = {}) {
            this.state = {}; // Current world state
            this.goals = []; // Available goals
            this.actions = []; // Available actions
            this.currentPlan = [];
            this.currentAction = null;
            
            // Config
            this.maxPlanLength = options.maxPlanLength || 10;
        }

        /**
         * Set world state
         */
        setState(key, value) {
            this.state[key] = value;
        }

        /**
         * Get world state
         */
        getState(key) {
            return this.state[key];
        }

        /**
         * Add goal with priority
         */
        addGoal(name, condition, priority = 1) {
            this.goals.push({ name, condition, priority });
            this.goals.sort((a, b) => b.priority - a.priority);
        }

        /**
         * Add action
         */
        addAction(name, preconditions, effects, cost = 1) {
            this.actions.push({
                name,
                preconditions,
                effects,
                cost
            });
        }

        /**
         * Update GOAP agent
         */
        update(dt) {
            // Check if current plan is still valid
            if (this.currentAction) {
                const result = this.currentAction.execute(dt);
                
                if (result === 'success') {
                    // Apply effects
                    for (const [key, value] of Object.entries(this.currentAction.effects)) {
                        this.state[key] = value;
                    }
                    
                    // Get next action
                    this.currentPlan.shift();
                    this.currentAction = this.currentPlan[0] || null;
                } else if (result === 'failure') {
                    // Plan failed, replan
                    this.plan();
                }
            } else {
                // No plan, create one
                this.plan();
            }
        }

        /**
         * Plan actions to achieve goal
         */
        plan() {
            // Find highest priority achievable goal
            for (const goal of this.goals) {
                if (goal.condition(this.state)) {
                    // Goal already achieved
                    this.currentPlan = [];
                    this.currentAction = null;
                    return;
                }
                
                // Try to find plan to achieve goal
                const plan = this._findPlan(goal.condition);
                
                if (plan.length > 0) {
                    this.currentPlan = plan;
                    this.currentAction = plan[0];
                    return;
                }
            }
            
            // No achievable goal
            this.currentPlan = [];
            this.currentAction = null;
        }

        /**
         * Find plan using A*
         */
        _findPlan(goalCondition) {
            // Simplified: BFS through action sequences
            const queue = [{
                state: { ...this.state },
                plan: [],
                cost: 0
            }];
            
            const visited = new Set();
            
            while (queue.length > 0) {
                const current = queue.shift();
                const stateKey = JSON.stringify(current.state);
                
                if (visited.has(stateKey)) continue;
                visited.add(stateKey);
                
                // Check if goal is met
                if (goalCondition(current.state)) {
                    return current.plan;
                }
                
                // Check plan length
                if (current.plan.length >= this.maxPlanLength) continue;
                
                // Try each applicable action
                for (const action of this.actions) {
                    if (this._canExecute(action, current.state)) {
                        // Apply effects
                        const newState = { ...current.state };
                        for (const [key, value] of Object.entries(action.effects)) {
                            newState[key] = value;
                        }
                        
                        queue.push({
                            state: newState,
                            plan: [...current.plan, action],
                            cost: current.cost + action.cost
                        });
                    }
                }
                
                // Sort by cost
                queue.sort((a, b) => a.cost - b.cost);
            }
            
            return [];
        }

        /**
         * Check if action can execute
         */
        _canExecute(action, state) {
            for (const [key, value] of Object.entries(action.preconditions)) {
                if (state[key] !== value) return false;
            }
            return true;
        }

        /**
         * Get current action name
         */
        getCurrentActionName() {
            return this.currentAction ? this.currentAction.name : 'idle';
        }
    }

    // ============================================
    // EXAMPLE: ENEMY AI
    // ============================================

    /**
     * Create enemy behavior tree
     */
    function createEnemyBehaviorTree() {
        // Combat subtree
        const combatSequence = new BTSequence({ name: 'Combat' });
        combatSequence.addChild(new BTCondition({
            name: 'CanSeeEnemy',
            condition: (a) => a.canSeeEnemy()
        }));
        combatSequence.addChild(new BTSelector({ name: 'CombatActions' })
            .addChild(new BTAction({
                name: 'Attack',
                action: (a, dt) => a.attack(dt)
            }))
            .addChild(new BTAction({
                name: 'Chase',
                action: (a, dt) => a.chase(dt)
            }))
        );

        // Patrol subtree
        const patrolSequence = new BTSequence({ name: 'Patrol' });
        patrolSequence.addChild(new BTCondition({
            name: 'NoEnemyVisible',
            condition: (a) => !a.canSeeEnemy()
        }));
        patrolSequence.addChild(new BTAction({
            name: 'Patrol',
            action: (a, dt) => a.patrol(dt)
        }));

        // Flee subtree
        const fleeSequence = new BTSequence({ name: 'Flee' });
        fleeSequence.addChild(new BTCondition({
            name: 'LowHealth',
            condition: (a) => a.getHealth() < 30
        }));
        fleeSequence.addChild(new BTCondition({
            name: 'EnemyNear',
            condition: (a) => a.isEnemyNear()
        }));
        fleeSequence.addChild(new BTAction({
            name: 'Flee',
            action: (a, dt) => a.flee(dt)
        }));

        // Root selector
        return new BTSelector({ name: 'Root' })
            .addChild(fleeSequence)
            .addChild(combatSequence)
            .addChild(patrolSequence);
    }

    /**
     * Create enemy GOAP
     */
    function createEnemyGOAP() {
        const agent = new GOAPAgent({ maxPlanLength: 5 });

        // Goals
        agent.addGoal('Survive', (s) => s.hasEscaped || s.enemyDefeated, 10);
        agent.addGoal('AttackEnemy', (s) => s.enemyDefeated, 8);
        agent.addGoal('HealSelf', (s) => s.health > 70, 5);

        // Actions
        agent.addAction('Attack',
            { hasWeapon: true, enemyInRange: true },
            { enemyDefeated: true },
            1
        );

        agent.addAction('ChaseEnemy',
            { hasWeapon: true },
            { enemyInRange: false },
            2
        );

        agent.addAction('FindWeapon',
            { hasWeapon: false },
            { hasWeapon: true },
            3
        );

        agent.addAction('UsePotion',
            { hasPotion: true, health: true },
            { health: 100, hasPotion: false },
            1
        );

        agent.addAction('Flee',
            { health: true },
            { hasEscaped: true },
            2
        );

        return agent;
    }

    // ============================================
    // EXPORT
    // ============================================

    const SGAI = global.SGAI || {};
    SGAI.BTNode = BTNode;
    SGAI.BTSequence = BTSequence;
    SGAI.BTSelector = BTSelector;
    SGAI.BTParallel = BTParallel;
    SGAI.BTInverter = BTInverter;
    SGAI.BTCondition = BTCondition;
    SGAI.BTAction = BTAction;
    SGAI.BTWait = BTWait;
    SGAI.GOAPAgent = GOAPAgent;
    SGAI.createEnemyBehaviorTree = createEnemyBehaviorTree;
    SGAI.createEnemyGOAP = createEnemyGOAP;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            BTNode, BTSequence, BTSelector, BTParallel, BTInverter,
            BTCondition, BTAction, BTWait,
            GOAPAgent, createEnemyBehaviorTree, createEnemyGOAP
        };
    } else {
        global.SGAI = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);
