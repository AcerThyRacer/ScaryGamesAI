/**
 * ============================================
 * SGAI PHASE 5: AI & PROCEDURAL GENERATION SYSTEM
 * ============================================
 * Unified AI and procedural content system for all 8 horror games
 * 
 * Features:
 * - Behavior Tree AI
 * - Utility AI Decision Making
 * - Learning AI (Q-Learning)
 * - Wave Function Collapse for level generation
 * - Procedural Content Generation
 * - Adaptive Difficulty
 * - Multi-Agent Coordination
 * 
 * Usage:
 *   const aiSystem = new AISystem();
 *   aiSystem.init('zombie-horde');
 *   const action = aiSystem.selectAction(agent, gameState);
 */

(function(global) {
    'use strict';

    // ============================================
    // AI SYSTEM MANAGER
    // ============================================

    class AISystem {
        constructor() {
            this.currentGame = null;
            this.behaviorTrees = new Map();
            this.utilityAI = new Map();
            this.learningAI = new Map();
            this.proceduralGen = null;
            this.difficultyAdapter = null;
            this.initialized = false;

            // AI profiles for each game
            this.gameProfiles = {
                'blood-tetris': {
                    aiType: 'difficulty',
                    features: ['adaptiveSpeed', 'curseTiming', 'piecePrediction'],
                    difficultyLevels: ['easy', 'normal', 'hard', 'nightmare']
                },
                'ritual-circle': {
                    aiType: 'pathfinding',
                    features: ['enemyPathfinding', 'spawnPositioning', 'waveComposition'],
                    difficultyLevels: ['easy', 'normal', 'hard', 'ritual']
                },
                'zombie-horde': {
                    aiType: 'behavior-tree',
                    features: ['zombieBehavior', 'swarmTactics', 'bossAI', 'spawnWaves'],
                    difficultyLevels: ['easy', 'normal', 'hard', 'horde']
                },
                'seance': {
                    aiType: 'utility',
                    features: ['spiritBehavior', 'hauntingPatterns', 'evidencePlacement'],
                    difficultyLevels: ['easy', 'normal', 'hard', 'supernatural']
                },
                'crypt-tanks': {
                    aiType: 'behavior-tree',
                    features: ['enemyFlanking', 'coverUsage', 'projectileAiming'],
                    difficultyLevels: ['easy', 'normal', 'hard', 'crypt']
                },
                'yeti-run': {
                    aiType: 'procedural',
                    features: ['obstacleGeneration', 'chaseAI', 'pathDifficulty'],
                    difficultyLevels: ['easy', 'normal', 'hard', 'extreme']
                },
                'nightmare-run': {
                    aiType: 'procedural',
                    features: ['levelGeneration', 'enemyPlacement', 'powerupDistribution'],
                    difficultyLevels: ['easy', 'normal', 'hard', 'nightmare']
                },
                'cursed-arcade': {
                    aiType: 'learning',
                    features: ['adaptivePatterns', 'curseSelection', 'bossBehavior'],
                    difficultyLevels: ['easy', 'normal', 'hard', 'cursed']
                }
            };
        }

        /**
         * Initialize AI system for a specific game
         */
        async init(gameId) {
            this.currentGame = gameId;
            this.profile = this.gameProfiles[gameId] || this.gameProfiles['blood-tetris'];

            // Initialize procedural generation
            this.proceduralGen = new ProceduralGenerator(gameId);

            // Initialize difficulty adapter
            this.difficultyAdapter = new DifficultyAdapter(gameId, this.profile);

            // Create game-specific behavior trees
            this._createBehaviorTrees();

            // Create utility AI configurations
            this._createUtilityAI();

            // Initialize learning AI if needed
            if (this.profile.aiType === 'learning') {
                this._initLearningAI();
            }

            this.initialized = true;
            console.log(`[AISystem] Initialized for ${gameId}`);
            return true;
        }

        /**
         * Create behavior trees for the current game
         */
        _createBehaviorTrees() {
            switch (this.currentGame) {
                case 'zombie-horde':
                    this._createZombieBehaviorTree();
                    this._createBossBehaviorTree();
                    break;
                case 'crypt-tanks':
                    this._createEnemyBehaviorTree();
                    this._createBossTankTree();
                    break;
                case 'ritual-circle':
                    this._createEnemyApproachTree();
                    break;
                case 'nightmare-run':
                case 'yeti-run':
                    this._createChaseBehaviorTree();
                    break;
            }
        }

        /**
         * Create utility AI configurations
         */
        _createUtilityAI() {
            switch (this.currentGame) {
                case 'seance':
                    this._createSpiritUtilityAI();
                    break;
                case 'zombie-horde':
                    this._createZombieUtilityAI();
                    break;
                case 'crypt-tanks':
                    this._createTacticalAI();
                    break;
            }
        }

        /**
         * Initialize learning AI
         */
        _initLearningAI() {
            this.learningAI.set('adaptive', new QLearningAI({
                learningRate: 0.1,
                discountFactor: 0.9,
                explorationRate: 0.2,
                states: ['player_skill', 'game_state', 'difficulty'],
                actions: ['increase_challenge', 'decrease_challenge', 'maintain']
            }));
        }

        // ============================================
        // BEHAVIOR TREE IMPLEMENTATIONS
        // ============================================

        /**
         * Zombie Behavior Tree - Zombie Horde
         */
        _createZombieBehaviorTree() {
            const tree = new BehaviorTree({
                root: new Selector([
                    // Boss priority
                    new Sequence([
                        new Condition('isBoss'),
                        new Action('executeBossAbility')
                    ]),
                    // Attack if in range
                    new Sequence([
                        new Condition('isPlayerInRange'),
                        new Action('attack')
                    ]),
                    // Move toward player/base
                    new Sequence([
                        new Condition('hasTarget'),
                        new Action('moveToTarget')
                    ]),
                    // Wander if no target
                    new Action('wander')
                ])
            });

            this.behaviorTrees.set('zombie', tree);
        }

        /**
         * Boss Behavior Tree
         */
        _createBossBehaviorTree() {
            const tree = new BehaviorTree({
                root: new Selector([
                    // Special ability if ready
                    new Sequence([
                        new Condition('abilityReady'),
                        new Condition('hasValidTarget'),
                        new Action('useAbility')
                    ]),
                    // Summon minions if low health
                    new Sequence([
                        new Condition('isLowHealth'),
                        new Condition('canSummon'),
                        new Action('summonMinions')
                    ]),
                    // Attack nearest target
                    new Sequence([
                        new Condition('hasTarget'),
                        new Action('attackTarget')
                    ]),
                    // Move toward base
                    new Action('moveToBase')
                ])
            });

            this.behaviorTrees.set('boss', tree);
        }

        /**
         * Enemy Behavior Tree - Crypt Tanks
         */
        _createEnemyBehaviorTree() {
            const tree = new BehaviorTree({
                root: new Selector([
                    // Take cover if under fire and low health
                    new Sequence([
                        new Condition('isUnderFire'),
                        new Condition('isLowHealth'),
                        new Condition('hasCoverNearby'),
                        new Action('moveToCover')
                    ]),
                    // Flank if in group
                    new Sequence([
                        new Condition('hasAlliesNearby'),
                        new Condition('canFlank'),
                        new Action('flankPlayer')
                    ]),
                    // Attack if in range
                    new Sequence([
                        new Condition('isPlayerInRange'),
                        new Action('attack')
                    ]),
                    // Move toward player
                    new Action('moveToPlayer')
                ])
            });

            this.behaviorTrees.set('enemy', tree);
        }

        /**
         * Boss Tank Behavior Tree
         */
        _createBossTankTree() {
            const tree = new BehaviorTree({
                root: new Selector([
                    // Heavy attack if charged
                    new Sequence([
                        new Condition('isCharged'),
                        new Action('heavyAttack')
                    ]),
                    // Spawn minions
                    new Sequence([
                        new Condition('canSpawn'),
                        new Action('spawnMinions')
                    ]),
                    // Standard attack
                    new Action('standardAttack')
                ])
            });

            this.behaviorTrees.set('bossTank', tree);
        }

        /**
         * Enemy Approach Tree - Ritual Circle
         */
        _createEnemyApproachTree() {
            const tree = new BehaviorTree({
                root: new Selector([
                    // Avoid traps
                    new Sequence([
                        new Condition('trapNearby'),
                        new Action('avoidTrap')
                    ]),
                    // Attack circle
                    new Sequence([
                        new Condition('inRange'),
                        new Action('attackCircle')
                    ]),
                    // Move to circle
                    new Action('moveToCircle')
                ])
            });

            this.behaviorTrees.set('approach', tree);
        }

        /**
         * Chase Behavior Tree - Runner games
         */
        _createChaseBehaviorTree() {
            const tree = new BehaviorTree({
                root: new Selector([
                    // Use special ability
                    new Sequence([
                        new Condition('canUseAbility'),
                        new Action('useAbility')
                    ]),
                    // Chase player
                    new Action('chasePlayer')
                ])
            });

            this.behaviorTrees.set('chase', tree);
        }

        // ============================================
        // UTILITY AI IMPLEMENTATIONS
        // ============================================

        /**
         * Spirit Utility AI - Séance
         */
         _createSpiritUtilityAI() {
            const ai = new UtilityAI();

            // Actions
            ai.addAction('haunt', [
                { id: 'playerNear', weight: 1.5, evaluate: (agent) => agent.playerDistance < 100 ? 1 : 0 },
                { id: 'sanityLow', weight: 2.0, evaluate: (agent) => 1 - (agent.playerSanity / 100) },
                { id: 'evidencePresent', weight: 1.2, evaluate: (agent) => agent.evidenceCount > 0 ? 1 : 0 }
            ]);

            ai.addAction('manifest', [
                { id: 'energyHigh', weight: 1.5, evaluate: (agent) => agent.energy / agent.maxEnergy },
                { id: 'darkness', weight: 1.3, evaluate: (agent) => agent.lightLevel < 0.3 ? 1 : 0 },
                { id: 'fear', weight: 1.8, evaluate: (agent) => agent.playerFear }
            ]);

            ai.addAction('moveObject', [
                { id: 'objectNearby', weight: 1.0, evaluate: (agent) => agent.objectsNearby > 0 ? 1 : 0 },
                { id: 'energy', weight: 0.8, evaluate: (agent) => agent.energy / agent.maxEnergy },
                { id: 'surprise', weight: 1.5, evaluate: (agent) => Math.random() }
            ]);

            ai.addAction('whisper', [
                { id: 'proximity', weight: 1.2, evaluate: (agent) => 1 - Math.min(1, agent.playerDistance / 200) },
                { id: 'silence', weight: 1.0, evaluate: (agent) => agent.ambientNoise < 0.3 ? 1 : 0 }
            ]);

            this.utilityAI.set('spirit', ai);
        }

        /**
         * Zombie Utility AI - Zombie Horde
         */
        _createZombieUtilityAI() {
            const ai = new UtilityAI();

            ai.addAction('attack', [
                { id: 'targetInRange', weight: 2.0, evaluate: (agent) => agent.targetDistance < 30 ? 1 : 0 },
                { id: 'noObstacle', weight: 1.5, evaluate: (agent) => agent.hasLineOfSight ? 1 : 0 },
                { id: 'groupSupport', weight: 1.0, evaluate: (agent) => Math.min(1, agent.alliesNearby / 3) }
            ]);

            ai.addAction('wander', [
                { id: 'noTarget', weight: 1.5, evaluate: (agent) => agent.hasTarget ? 0 : 1 },
                { id: 'random', weight: 0.5, evaluate: (agent) => Math.random() }
            ]);

            ai.addAction('flee', [
                { id: 'lowHealth', weight: 2.0, evaluate: (agent) => 1 - (agent.hp / agent.maxHp) },
                { id: 'dangerNearby', weight: 1.5, evaluate: (agent) => agent.dangerLevel }
            ]);

            this.utilityAI.set('zombie', ai);
        }

        /**
         * Tactical AI - Crypt Tanks
         */
        _createTacticalAI() {
            const ai = new UtilityAI();

            ai.addAction('takeCover', [
                { id: 'underFire', weight: 2.5, evaluate: (agent) => agent.underFire ? 1 : 0 },
                { id: 'lowHealth', weight: 2.0, evaluate: (agent) => 1 - (agent.hp / agent.maxHp) },
                { id: 'coverAvailable', weight: 1.5, evaluate: (agent) => agent.coverDistance < 50 ? 1 : 0 }
            ]);

            ai.addAction('flank', [
                { id: 'teamAttack', weight: 1.8, evaluate: (agent) => agent.teammatesAttacking ? 1 : 0 },
                { id: 'flankRoute', weight: 1.5, evaluate: (agent) => agent.flankRouteClear ? 1 : 0 },
                { id: 'surprise', weight: 1.2, evaluate: (agent) => Math.random() }
            ]);

            ai.addAction('suppress', [
                { id: 'targetVisible', weight: 1.5, evaluate: (agent) => agent.targetVisible ? 1 : 0 },
                { id: 'ammoAvailable', weight: 1.0, evaluate: (agent) => agent.ammo / agent.maxAmmo },
                { id: 'distance', weight: 0.8, evaluate: (agent) => 1 - Math.min(1, agent.targetDistance / 200) }
            ]);

            this.utilityAI.set('tactical', ai);
        }

        // ============================================
        // AI EXECUTION
        // ============================================

        /**
         * Update AI for an entity
         */
        updateAI(entity, entityType, gameState, dt) {
            const tree = this.behaviorTrees.get(entityType);
            if (tree) {
                return tree.update(entity, gameState, dt);
            }

            const ai = this.utilityAI.get(entityType);
            if (ai) {
                return ai.selectAction(entity, gameState);
            }

            return null;
        }

        /**
         * Get behavior tree
         */
        getBehaviorTree(type) {
            return this.behaviorTrees.get(type);
        }

        /**
         * Get utility AI
         */
        getUtilityAI(type) {
            return this.utilityAI.get(type);
        }

        /**
         * Generate procedural content
         */
        generateContent(contentType, params) {
            return this.proceduralGen.generate(contentType, params);
        }

        /**
         * Adjust difficulty based on player performance
         */
        adjustDifficulty(playerStats) {
            return this.difficultyAdapter.adjust(playerStats);
        }

        /**
         * Get recommended difficulty
         */
        getRecommendedDifficulty() {
            return this.difficultyAdapter.getRecommendedLevel();
        }
    }

    // ============================================
    // BEHAVIOR TREE CLASSES
    // ============================================

    class BehaviorTree {
        constructor(config) {
            this.root = config.root;
            this.blackboard = new Map();
        }

        update(agent, gameState, dt) {
            if (!this.root) return 'failure';
            return this.root.execute(agent, gameState, this.blackboard, dt);
        }

        setValue(key, value) {
            this.blackboard.set(key, value);
        }

        getValue(key, defaultValue = null) {
            return this.blackboard.has(key) ? this.blackboard.get(key) : defaultValue;
        }
    }

    class BTNode {
        execute(agent, gameState, blackboard, dt) {
            return 'success';
        }
    }

    class Selector extends BTNode {
        constructor(children = []) {
            super();
            this.children = children;
            this.currentChildIndex = 0;
        }

        execute(agent, gameState, blackboard, dt) {
            if (this.state !== 'running') {
                this.currentChildIndex = 0;
                this.state = 'running';
            }

            while (this.currentChildIndex < this.children.length) {
                const child = this.children[this.currentChildIndex];
                const result = child.execute(agent, gameState, blackboard, dt);

                if (result === 'running') return 'running';
                if (result === 'success') {
                    this.state = 'ready';
                    return 'success';
                }

                this.currentChildIndex++;
            }

            this.state = 'ready';
            return 'failure';
        }
    }

    class Sequence extends BTNode {
        constructor(children = []) {
            super();
            this.children = children;
            this.currentChildIndex = 0;
        }

        execute(agent, gameState, blackboard, dt) {
            if (this.state !== 'running') {
                this.currentChildIndex = 0;
                this.state = 'running';
            }

            while (this.currentChildIndex < this.children.length) {
                const child = this.children[this.currentChildIndex];
                const result = child.execute(agent, gameState, blackboard, dt);

                if (result === 'running') return 'running';
                if (result === 'failure') {
                    this.state = 'ready';
                    return 'failure';
                }

                this.currentChildIndex++;
            }

            this.state = 'ready';
            return 'success';
        }
    }

    class Condition extends BTNode {
        constructor(conditionFn) {
            super();
            this.conditionFn = conditionFn;
        }

        execute(agent, gameState, blackboard, dt) {
            const result = this.conditionFn(agent, gameState);
            return result ? 'success' : 'failure';
        }
    }

    class Action extends BTNode {
        constructor(actionFn) {
            super();
            this.actionFn = actionFn;
        }

        execute(agent, gameState, blackboard, dt) {
            return this.actionFn(agent, gameState, dt);
        }
    }

    // ============================================
    // UTILITY AI CLASSES
    // ============================================

    class UtilityAI {
        constructor() {
            this.actions = [];
            this.considerations = [];
        }

        addAction(actionName, considerations) {
            this.actions.push({
                name: actionName,
                considerations: considerations
            });
        }

        addConsideration(id, evaluateFn, weight = 1) {
            this.considerations.push({ id, evaluate: evaluateFn, weight });
        }

        selectAction(agent, gameState) {
            if (this.actions.length === 0) return null;

            const scoredActions = this.actions.map(action => {
                let totalScore = 0;

                action.considerations.forEach(consideration => {
                    const score = consideration.evaluate(agent, gameState);
                    totalScore += score * consideration.weight;
                });

                return { action, score: totalScore };
            });

            scoredActions.sort((a, b) => b.score - a.score);
            return scoredActions[0].action.name;
        }
    }

    // ============================================
    // Q-LEARNING AI
    // ============================================

    class QLearningAI {
        constructor(config) {
            this.learningRate = config.learningRate || 0.1;
            this.discountFactor = config.discountFactor || 0.9;
            this.explorationRate = config.explorationRate || 0.2;
            this.qTable = new Map();
            this.states = config.states || [];
            this.actions = config.actions || [];
            this.lastState = null;
            this.lastAction = null;
        }

        getStateKey(state) {
            return JSON.stringify(state);
        }

        getQValues(state) {
            const key = this.getStateKey(state);
            if (!this.qTable.has(key)) {
                const values = {};
                this.actions.forEach(action => values[action] = 0);
                this.qTable.set(key, values);
            }
            return this.qTable.get(key);
        }

        selectAction(state) {
            // Exploration
            if (Math.random() < this.explorationRate) {
                return this.actions[Math.floor(Math.random() * this.actions.length)];
            }

            // Exploitation
            const qValues = this.getQValues(state);
            let bestAction = this.actions[0];
            let bestValue = qValues[bestAction];

            this.actions.forEach(action => {
                if (qValues[action] > bestValue) {
                    bestValue = qValues[action];
                    bestAction = action;
                }
            });

            return bestAction;
        }

        learn(state, action, reward, nextState) {
            const qValues = this.getQValues(state);
            const nextQValues = this.getQValues(nextState);

            let maxNextQ = -Infinity;
            this.actions.forEach(a => {
                if (nextQValues[a] > maxNextQ) maxNextQ = nextQValues[a];
            });

            qValues[action] += this.learningRate * (
                reward + this.discountFactor * maxNextQ - qValues[action]
            );

            this.lastState = state;
            this.lastAction = action;
        }

        save() {
            return JSON.stringify(Object.fromEntries(this.qTable));
        }

        load(data) {
            const parsed = JSON.parse(data);
            this.qTable = new Map(Object.entries(parsed));
        }
    }

    // ============================================
    // PROCEDURAL GENERATOR
    // ============================================

    class ProceduralGenerator {
        constructor(gameId) {
            this.gameId = gameId;
            this.seed = Math.random() * 10000;
            this.noise = new SimplexNoise(this.seed);
        }

        generate(contentType, params) {
            switch (contentType) {
                case 'level':
                    return this.generateLevel(params);
                case 'wave':
                    return this.generateWave(params);
                case 'obstacles':
                    return this.generateObstacles(params);
                case 'powerups':
                    return this.generatePowerups(params);
                case 'enemyComposition':
                    return this.generateEnemyComposition(params);
                default:
                    return null;
            }
        }

        generateLevel(params) {
            const { width, height, difficulty } = params;
            const level = [];

            for (let y = 0; y < height; y++) {
                level[y] = [];
                for (let x = 0; x < width; x++) {
                    const noiseValue = this.noise.noise2D(x / 20, y / 20);
                    const obstacleChance = 0.1 + difficulty * 0.1;
                    level[y][x] = noiseValue > (1 - obstacleChance) ? 1 : 0;
                }
            }

            return level;
        }

        generateWave(params) {
            const { waveNumber, availableEnemies, difficulty } = params;
            const baseCount = 5 + waveNumber * 2;
            const enemies = [];

            for (let i = 0; i < baseCount; i++) {
                const enemyIndex = Math.floor(this.noise.noise2D(i, waveNumber) * availableEnemies.length);
                enemies.push(availableEnemies[Math.abs(enemyIndex) % availableEnemies.length]);
            }

            // Add boss every 5 waves
            if (waveNumber % 5 === 0) {
                enemies.push('boss');
            }

            return enemies;
        }

        generateObstacles(params) {
            const { length, difficulty, pattern } = params;
            const obstacles = [];
            const patternTypes = ['random', 'alternating', 'clusters', 'gaps'];
            const selectedPattern = pattern || patternTypes[Math.floor(this.noise.noise2D(length, difficulty) * patternTypes.length)];

            for (let i = 0; i < length; i++) {
                const noiseValue = this.noise.noise2D(i / 10, difficulty);
                
                switch (selectedPattern) {
                    case 'alternating':
                        if (i % 3 === 0) obstacles.push({ position: i, type: 'obstacle' });
                        break;
                    case 'clusters':
                        if (noiseValue > 0.6) {
                            obstacles.push({ position: i, type: 'cluster' });
                            if (noiseValue > 0.8) {
                                obstacles.push({ position: i + 1, type: 'obstacle' });
                            }
                        }
                        break;
                    case 'gaps':
                        if (noiseValue < -0.5) {
                            obstacles.push({ position: i, type: 'gap' });
                        }
                        break;
                    default:
                        if (noiseValue > 0.7 - difficulty * 0.1) {
                            obstacles.push({ position: i, type: 'obstacle' });
                        }
                }
            }

            return obstacles;
        }

        generatePowerups(params) {
            const { count, types, distribution } = params;
            const powerups = [];

            for (let i = 0; i < count; i++) {
                const typeIndex = Math.floor(this.noise.noise2D(i, count) * types.length);
                powerups.push({
                    type: types[Math.abs(typeIndex) % types.length],
                    position: i * 10,
                    rarity: this.noise.noise2D(i, i) > 0.8 ? 'rare' : 'common'
                });
            }

            return powerups;
        }

        generateEnemyComposition(params) {
            const { waveNumber, enemyPool, difficulty } = params;
            const composition = {};

            enemyPool.forEach(enemy => {
                const baseChance = this.noise.noise2D(waveNumber, enemy.length);
                const adjustedChance = baseChance * (1 + difficulty * 0.2);
                
                if (adjustedChance > 0.3) {
                    const count = Math.floor(adjustedChance * 5 * (1 + waveNumber * 0.1));
                    composition[enemy] = count;
                }
            });

            return composition;
        }

        setSeed(seed) {
            this.seed = seed;
            this.noise = new SimplexNoise(seed);
        }
    }

    // ============================================
    // SIMPLEX NOISE (Simplified)
    // ============================================

    class SimplexNoise {
        constructor(seed = 0) {
            this.seed = seed;
            this.perm = [];
            this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
            this._init(seed);
        }

        _init(seed) {
            this.perm = [];
            for (let i = 0; i < 256; i++) {
                this.perm[i] = Math.floor((Math.sin(seed + i) * 10000) % 256);
            }
        }

        noise2D(x, y) {
            const F2 = 0.5 * (Math.sqrt(3) - 1);
            const G2 = (3 - Math.sqrt(3)) / 6;

            const s = (x + y) * F2;
            const i = Math.floor(x + s);
            const j = Math.floor(y + s);

            const t = (i + j) * G2;
            const X0 = i - t;
            const Y0 = j - t;
            const x0 = x - X0;
            const y0 = y - Y0;

            let i1, j1;
            if (x0 > y0) { i1 = 1; j1 = 0; }
            else { i1 = 0; j1 = 1; }

            const x1 = x0 - i1 + G2;
            const y1 = y0 - j1 + G2;
            const x2 = x0 - 1 + 2 * G2;
            const y2 = y0 - 1 + 2 * G2;

            const ii = i & 255;
            const jj = j & 255;

            const gi0 = this.perm[ii + this.perm[jj]] % 12;
            const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
            const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

            let n0 = 0, n1 = 0, n2 = 0;

            let t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 >= 0) {
                t0 *= t0;
                n0 = t0 * t0 * this._dot(this.grad3[gi0], x0, y0);
            }

            let t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 >= 0) {
                t1 *= t1;
                n1 = t1 * t1 * this._dot(this.grad3[gi1], x1, y1);
            }

            let t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 >= 0) {
                t2 *= t2;
                n2 = t2 * t2 * this._dot(this.grad3[gi2], x2, y2);
            }

            return 70 * (n0 + n1 + n2);
        }

        _dot(g, x, y) {
            return g[0] * x + g[1] * y;
        }
    }

    // ============================================
    // DIFFICULTY ADAPTER
    // ============================================

    class DifficultyAdapter {
        constructor(gameId, profile) {
            this.gameId = gameId;
            this.profile = profile;
            this.currentDifficulty = 1.0;
            this.playerPerformance = [];
            this.targetPerformance = 0.7; // 70% success rate ideal
            this.adjustmentRate = 0.05;
        }

        adjust(playerStats) {
            // Track performance
            this.playerPerformance.push(playerStats.performance || 0.5);
            if (this.playerPerformance.length > 20) {
                this.playerPerformance.shift();
            }

            // Calculate average performance
            const avgPerformance = this.playerPerformance.reduce((a, b) => a + b, 0) / this.playerPerformance.length;

            // Adjust difficulty
            if (avgPerformance > this.targetPerformance + 0.1) {
                // Player doing too well, increase difficulty
                this.currentDifficulty = Math.min(3.0, this.currentDifficulty + this.adjustmentRate);
            } else if (avgPerformance < this.targetPerformance - 0.1) {
                // Player struggling, decrease difficulty
                this.currentDifficulty = Math.max(0.5, this.currentDifficulty - this.adjustmentRate);
            }

            return this.currentDifficulty;
        }

        getRecommendedLevel() {
            if (this.currentDifficulty < 0.8) return 'easy';
            if (this.currentDifficulty < 1.2) return 'normal';
            if (this.currentDifficulty < 1.8) return 'hard';
            return this.profile.difficultyLevels[3] || 'extreme';
        }

        getMultiplier() {
            return this.currentDifficulty;
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            AISystem,
            BehaviorTree,
            UtilityAI,
            QLearningAI,
            ProceduralGenerator,
            DifficultyAdapter
        };
    } else {
        global.AISystem = AISystem;
        global.BehaviorTree = BehaviorTree;
        global.UtilityAI = UtilityAI;
        global.QLearningAI = QLearningAI;
        global.ProceduralGenerator = ProceduralGenerator;
        global.DifficultyAdapter = DifficultyAdapter;
    }

})(typeof window !== 'undefined' ? window : this);
