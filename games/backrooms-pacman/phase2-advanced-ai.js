/**
 * BACKROOMS PACMAN - PHASE 2: ADVANCED AI & MACHINE LEARNING
 * Neural network-powered enemies, procedural generation, adaptive difficulty
 */

(function() {
    'use strict';

    // ============================================
    // PHASE 2.1: NEURAL NETWORK-POWERED PAC-MAN AI
    // ============================================
    
    const NeuralPacmanAI = {
        // Neural network weights (simplified for browser)
        weights: {
            inputToHidden: [],
            hiddenToOutput: []
        },
        
        // Player behavior memory
        playerMemory: {
            positions: [],
            decisions: [],
            patterns: {},
            maxMemory: 1000
        },
        
        // AI personality
        personality: {
            aggression: 0.5,
            curiosity: 0.5,
            caution: 0.5,
            playfulness: 0.3
        },
        
        // Emotional state
        emotionalState: {
            excitement: 0,
            frustration: 0,
            confidence: 0.5,
            boredom: 0
        },
        
        init() {
            this.initializeNetwork();
            this.loadPlayerData();
            console.log('[Phase 2] Neural Pac-Man AI initialized');
        },
        
        initializeNetwork() {
            // Initialize neural network with random weights
            const inputSize = 12; // Player pos, velocity, distance, time, etc.
            const hiddenSize = 24;
            const outputSize = 4; // Move directions
            
            // Xavier initialization
            const xavier = (inSize, outSize) => Math.sqrt(2 / (inSize + outSize));
            
            this.weights.inputToHidden = [];
            for (let i = 0; i < inputSize; i++) {
                this.weights.inputToHidden[i] = [];
                for (let h = 0; h < hiddenSize; h++) {
                    this.weights.inputToHidden[i][h] = (Math.random() - 0.5) * 2 * xavier(inputSize, hiddenSize);
                }
            }
            
            this.weights.hiddenToOutput = [];
            for (let h = 0; h < hiddenSize; h++) {
                this.weights.hiddenToOutput[h] = [];
                for (let o = 0; o < outputSize; o++) {
                    this.weights.hiddenToOutput[h][o] = (Math.random() - 0.5) * 2 * xavier(hiddenSize, outputSize);
                }
            }
        },
        
        // Neural network forward pass
        predict(playerState, pacmanState, environment) {
            // Prepare input features
            const inputs = this.extractFeatures(playerState, pacmanState, environment);
            
            // Hidden layer
            const hidden = [];
            for (let h = 0; h < 24; h++) {
                let sum = 0;
                for (let i = 0; i < inputs.length; i++) {
                    sum += inputs[i] * this.weights.inputToHidden[i][h];
                }
                hidden[h] = this.relu(sum);
            }
            
            // Output layer
            const outputs = [];
            for (let o = 0; o < 4; o++) {
                let sum = 0;
                for (let h = 0; h < 24; h++) {
                    sum += hidden[h] * this.weights.hiddenToOutput[h][o];
                }
                outputs[o] = sum;
            }
            
            // Softmax activation
            const expOutputs = outputs.map(o => Math.exp(o));
            const sumExp = expOutputs.reduce((a, b) => a + b, 0);
            const probabilities = expOutputs.map(e => e / sumExp);
            
            // Apply personality modifiers
            return this.applyPersonality(probabilities, playerState);
        },
        
        extractFeatures(playerState, pacmanState, environment) {
            const dx = playerState.x - pacmanState.x;
            const dy = playerState.y - pacmanState.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            return [
                playerState.x / 100, // Normalized position
                playerState.y / 100,
                playerState.vx / 10, // Normalized velocity
                playerState.vy / 10,
                pacmanState.x / 100,
                pacmanState.y / 100,
                dx / 100, // Relative position
                dy / 100,
                distance / 100,
                environment.timeOfDay,
                environment.noiseLevel,
                this.emotionalState.confidence
            ];
        },
        
        relu(x) {
            return Math.max(0, x);
        },
        
        applyPersonality(probabilities, playerState) {
            // Modify probabilities based on personality
            const modified = [...probabilities];
            
            // Aggression: prefer direct chase
            if (this.personality.aggression > 0.7) {
                const maxIdx = modified.indexOf(Math.max(...modified));
                modified[maxIdx] *= 1.2;
            }
            
            // Caution: avoid direct confrontation when player is powered up
            if (this.personality.caution > 0.6 && playerState.isPoweredUp) {
                modified = modified.map(p => p * 0.8);
            }
            
            // Curiosity: explore unseen areas
            if (this.personality.curiosity > 0.7) {
                // Boost probability for least visited direction
                const leastVisited = this.findLeastVisitedDirection();
                modified[leastVisited] *= 1.3;
            }
            
            // Re-normalize
            const sum = modified.reduce((a, b) => a + b, 0);
            return modified.map(p => p / sum);
        },
        
        findLeastVisitedDirection() {
            // Return index of least visited direction
            const visits = [0, 0, 0, 0]; // Up, Down, Left, Right
            // Logic to count visits would go here
            return visits.indexOf(Math.min(...visits));
        },
        
        // Learn from player behavior
        learn(playerAction, outcome) {
            // Store in memory
            this.playerMemory.decisions.push({
                action: playerAction,
                outcome: outcome,
                timestamp: Date.now()
            });
            
            // Keep memory size limited
            if (this.playerMemory.decisions.length > this.playerMemory.maxMemory) {
                this.playerMemory.decisions.shift();
            }
            
            // Update emotional state
            this.updateEmotions(outcome);
            
            // Train network periodically
            if (this.playerMemory.decisions.length % 100 === 0) {
                this.trainNetwork();
            }
        },
        
        updateEmotions(outcome) {
            if (outcome.success) {
                this.emotionalState.excitement = Math.min(1, this.emotionalState.excitement + 0.1);
                this.emotionalState.confidence = Math.min(1, this.emotionalState.confidence + 0.05);
                this.emotionalState.frustration = Math.max(0, this.emotionalState.frustration - 0.1);
            } else {
                this.emotionalState.frustration = Math.min(1, this.emotionalState.frustration + 0.15);
                this.emotionalState.confidence = Math.max(0, this.emotionalState.confidence - 0.05);
            }
            
            // Boredom increases over time without interaction
            this.emotionalState.boredom = Math.min(1, this.emotionalState.boredom + 0.001);
        },
        
        trainNetwork() {
            // Simplified backpropagation
            const learningRate = 0.01;
            const batchSize = Math.min(32, this.playerMemory.decisions.length);
            
            // Sample batch
            const batch = [];
            for (let i = 0; i < batchSize; i++) {
                const idx = Math.floor(Math.random() * this.playerMemory.decisions.length);
                batch.push(this.playerMemory.decisions[idx]);
            }
            
            // Update weights (simplified)
            // In a real implementation, this would compute gradients
            console.log('[Phase 2] Training neural network...');
        },
        
        // Predict player movement
        predictPlayerMovement(playerState, timeHorizon = 1) {
            // Analyze recent movement patterns
            const recentPositions = this.playerMemory.positions.slice(-20);
            
            if (recentPositions.length < 5) {
                return { x: playerState.x, y: playerState.y };
            }
            
            // Calculate velocity trend
            let vx = 0, vy = 0;
            for (let i = 1; i < recentPositions.length; i++) {
                vx += recentPositions[i].x - recentPositions[i-1].x;
                vy += recentPositions[i].y - recentPositions[i-1].y;
            }
            vx /= (recentPositions.length - 1);
            vy /= (recentPositions.length - 1);
            
            // Detect patterns
            const pattern = this.detectPattern(recentPositions);
            
            // Adjust prediction based on pattern
            let predictedX = playerState.x + vx * timeHorizon;
            let predictedY = playerState.y + vy * timeHorizon;
            
            if (pattern === 'circling') {
                // Predict circular movement
                const angle = Math.atan2(vy, vx);
                predictedX = playerState.x + Math.cos(angle + 0.5) * 5;
                predictedY = playerState.y + Math.sin(angle + 0.5) * 5;
            } else if (pattern === 'hiding') {
                // Player likely staying in corners
                predictedX = playerState.x;
                predictedY = playerState.y;
            }
            
            return { x: predictedX, y: predictedY };
        },
        
        detectPattern(positions) {
            // Simple pattern detection
            if (positions.length < 10) return 'unknown';
            
            // Check for circling
            let totalAngle = 0;
            for (let i = 2; i < positions.length; i++) {
                const v1 = {
                    x: positions[i-1].x - positions[i-2].x,
                    y: positions[i-1].y - positions[i-2].y
                };
                const v2 = {
                    x: positions[i].x - positions[i-1].x,
                    y: positions[i].y - positions[i-1].y
                };
                const angle = Math.atan2(v2.y, v2.x) - Math.atan2(v1.y, v1.x);
                totalAngle += angle;
            }
            
            if (Math.abs(totalAngle) > Math.PI) {
                return 'circling';
            }
            
            // Check for hiding (low movement)
            let totalMovement = 0;
            for (let i = 1; i < positions.length; i++) {
                const dx = positions[i].x - positions[i-1].x;
                const dy = positions[i].y - positions[i-1].y;
                totalMovement += Math.sqrt(dx * dx + dy * dy);
            }
            
            if (totalMovement / positions.length < 0.5) {
                return 'hiding';
            }
            
            return 'random';
        },
        
        savePlayerData() {
            const data = {
                memory: this.playerMemory,
                personality: this.personality,
                weights: this.weights
            };
            localStorage.setItem('backroomsPacman_aiData', JSON.stringify(data));
        },
        
        loadPlayerData() {
            const saved = localStorage.getItem('backroomsPacman_aiData');
            if (saved) {
                const data = JSON.parse(saved);
                this.playerMemory = data.memory || this.playerMemory;
                this.personality = data.personality || this.personality;
                this.weights = data.weights || this.weights;
            }
        }
    };

    // ============================================
    // PHASE 2.2: PROCEDURAL ENEMY GENERATION
    // ============================================
    
    const ProceduralEnemyGenerator = {
        enemyTypes: [],
        evolutionGeneration: 0,
        
        // Enemy archetypes
        archetypes: {
            HUNTER: {
                speed: 1.0,
                vision: 1.0,
                aggression: 1.0,
                stealth: 0.3,
                abilities: ['chase', 'predict']
            },
            STALKER: {
                speed: 0.7,
                vision: 1.2,
                aggression: 0.6,
                stealth: 0.9,
                abilities: ['ambush', 'track']
            },
            TRAPPER: {
                speed: 0.5,
                vision: 0.8,
                aggression: 0.4,
                stealth: 0.7,
                abilities: ['trap', 'block']
            },
            SWARMER: {
                speed: 1.2,
                vision: 0.6,
                aggression: 0.8,
                stealth: 0.2,
                abilities: ['swarm', 'flank']
            }
        },
        
        init() {
            this.generateInitialPopulation();
            console.log('[Phase 2] Procedural enemy generator initialized');
        },
        
        generateInitialPopulation() {
            // Generate 20 initial enemy variants
            for (let i = 0; i < 20; i++) {
                this.enemyTypes.push(this.generateEnemyVariant());
            }
        },
        
        generateEnemyVariant(parent1, parent2) {
            const archetypeKeys = Object.keys(this.archetypes);
            const archetype = this.archetypes[archetypeKeys[Math.floor(Math.random() * archetypeKeys.length)]];
            
            // Mutate or combine traits
            let traits = { ...archetype };
            
            if (parent1 && parent2) {
                // Crossover
                traits = this.crossover(parent1, parent2);
            }
            
            // Mutation
            traits = this.mutate(traits);
            
            // Generate visual appearance
            const appearance = this.generateAppearance(traits);
            
            // Generate behavior tree
            const behaviorTree = this.generateBehaviorTree(traits);
            
            return {
                id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                generation: this.evolutionGeneration,
                traits,
                appearance,
                behaviorTree,
                fitness: 0,
                encounters: 0,
                kills: 0
            };
        },
        
        crossover(parent1, parent2) {
            const child = {};
            const traits = ['speed', 'vision', 'aggression', 'stealth'];
            
            traits.forEach(trait => {
                // Randomly choose from either parent
                child[trait] = Math.random() > 0.5 ? parent1.traits[trait] : parent2.traits[trait];
                // Add small random variation
                child[trait] *= (0.9 + Math.random() * 0.2);
                child[trait] = Math.max(0.1, Math.min(2.0, child[trait]));
            });
            
            // Combine abilities
            const abilities = [...new Set([...parent1.traits.abilities, ...parent2.traits.abilities])];
            child.abilities = abilities.slice(0, 3);
            
            return child;
        },
        
        mutate(traits) {
            const mutationRate = 0.1;
            const mutated = { ...traits };
            
            ['speed', 'vision', 'aggression', 'stealth'].forEach(trait => {
                if (Math.random() < mutationRate) {
                    mutated[trait] *= (0.8 + Math.random() * 0.4);
                    mutated[trait] = Math.max(0.1, Math.min(2.0, mutated[trait]));
                }
            });
            
            // Possible new ability
            if (Math.random() < mutationRate * 0.5) {
                const newAbilities = ['teleport', 'clone', 'scream', 'invisible', 'wallPhase'];
                const newAbility = newAbilities[Math.floor(Math.random() * newAbilities.length)];
                if (!mutated.abilities.includes(newAbility)) {
                    mutated.abilities.push(newAbility);
                }
            }
            
            return mutated;
        },
        
        generateAppearance(traits) {
            // Generate procedural appearance based on traits
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Base color based on aggression
            const hue = traits.aggression > 0.7 ? 0 : traits.stealth > 0.7 ? 240 : 60;
            const saturation = 50 + traits.aggression * 50;
            const lightness = 30 + traits.stealth * 30;
            
            ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            ctx.fillRect(0, 0, 128, 128);
            
            // Add details based on abilities
            traits.abilities.forEach((ability, i) => {
                ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
                ctx.beginPath();
                ctx.arc(64 + Math.cos(i * Math.PI * 2 / 3) * 30, 
                       64 + Math.sin(i * Math.PI * 2 / 3) * 30, 
                       15, 0, Math.PI * 2);
                ctx.fill();
            });
            
            return {
                texture: canvas,
                color: { h: hue, s: saturation, l: lightness },
                size: 0.5 + traits.speed * 0.5
            };
        },
        
        generateBehaviorTree(traits) {
            // Generate behavior tree based on traits
            const nodes = [];
            
            // Root: Selector
            nodes.push({ type: 'selector', children: [1, 2, 3] });
            
            // Child 1: Can see player?
            nodes.push({
                type: 'sequence',
                children: [4, 5],
                condition: 'canSeePlayer'
            });
            
            // Child 2: Heard player?
            nodes.push({
                type: 'sequence',
                children: [6, 7],
                condition: 'heardPlayer'
            });
            
            // Child 3: Patrol
            nodes.push({ type: 'action', action: 'patrol' });
            
            // Chase or ambush based on traits
            if (traits.aggression > 0.6) {
                nodes.push({ type: 'action', action: 'chase' });
            } else {
                nodes.push({ type: 'action', action: 'ambush' });
            }
            
            // Investigate
            nodes.push({ type: 'action', action: 'investigate' });
            nodes.push({ type: 'action', action: 'moveToSound' });
            
            return nodes;
        },
        
        // Evolve enemies based on performance
        evolve() {
            console.log('[Phase 2] Evolving enemy population...');
            
            // Sort by fitness
            this.enemyTypes.sort((a, b) => b.fitness - a.fitness);
            
            // Keep top 50%
            const survivors = this.enemyTypes.slice(0, Math.floor(this.enemyTypes.length / 2));
            
            // Generate offspring
            const offspring = [];
            while (offspring.length < this.enemyTypes.length - survivors.length) {
                const parent1 = survivors[Math.floor(Math.random() * survivors.length)];
                const parent2 = survivors[Math.floor(Math.random() * survivors.length)];
                offspring.push(this.generateEnemyVariant(parent1, parent2));
            }
            
            this.enemyTypes = [...survivors, ...offspring];
            this.evolutionGeneration++;
            
            console.log(`[Phase 2] Generation ${this.evolutionGeneration} complete`);
        },
        
        // Get enemy for encounter
        getEnemyForEncounter(difficulty, playerSkill) {
            // Select enemy based on difficulty and player skill
            const suitable = this.enemyTypes.filter(e => {
                const challenge = e.traits.aggression * e.traits.speed;
                return Math.abs(challenge - playerSkill) < 0.5;
            });
            
            if (suitable.length === 0) {
                return this.enemyTypes[Math.floor(Math.random() * this.enemyTypes.length)];
            }
            
            return suitable[Math.floor(Math.random() * suitable.length)];
        },
        
        // Report encounter result
        reportEncounter(enemyId, result) {
            const enemy = this.enemyTypes.find(e => e.id === enemyId);
            if (enemy) {
                enemy.encounters++;
                if (result === 'kill') {
                    enemy.kills++;
                }
                enemy.fitness = enemy.kills / enemy.encounters;
            }
        }
    };

    // ============================================
    // PHASE 2.3: DYNAMIC DIFFICULTY ADJUSTMENT 2.0
    // ============================================
    
    const DynamicDifficulty = {
        playerSkill: 0.5,
        difficultyHistory: [],
        adjustmentRate: 0.1,
        
        // Metrics
        metrics: {
            survivalTime: [],
            pelletsCollected: [],
            deaths: 0,
            nearMisses: 0,
            exploration: 0
        },
        
        init() {
            this.loadDifficultyData();
            console.log('[Phase 2] Dynamic Difficulty system initialized');
        },
        
        update(playerState, gameState, dt) {
            // Collect metrics
            this.collectMetrics(playerState, gameState, dt);
            
            // Calculate skill
            const newSkill = this.calculateSkill();
            
            // Smooth adjustment
            this.playerSkill += (newSkill - this.playerSkill) * this.adjustmentRate;
            this.playerSkill = Math.max(0, Math.min(1, this.playerSkill));
            
            // Apply difficulty changes
            this.applyDifficulty(gameState);
        },
        
        collectMetrics(playerState, gameState, dt) {
            // Track survival time
            if (!this.sessionStart) {
                this.sessionStart = Date.now();
            }
            
            // Track exploration
            if (playerState.hasMoved) {
                this.metrics.exploration += dt;
            }
            
            // Track near misses
            if (playerState.nearPacman) {
                this.metrics.nearMisses++;
            }
        },
        
        calculateSkill() {
            // Calculate skill based on multiple factors
            let skill = 0.5;
            
            // Survival time factor
            const survivalTime = (Date.now() - this.sessionStart) / 1000;
            const survivalScore = Math.min(1, survivalTime / 300); // 5 minutes = max
            
            // Death penalty
            const deathPenalty = Math.min(0.5, this.metrics.deaths * 0.1);
            
            // Exploration bonus
            const explorationScore = Math.min(1, this.metrics.exploration / 600);
            
            // Near miss handling
            const nearMissScore = Math.max(0, 1 - this.metrics.nearMisses / 20);
            
            skill = (survivalScore + explorationScore + nearMissScore) / 3 - deathPenalty;
            
            return Math.max(0, Math.min(1, skill));
        },
        
        applyDifficulty(gameState) {
            // Adjust game parameters based on skill
            const difficulty = this.playerSkill;
            
            // Pac-Man speed
            gameState.pacmanSpeed = 2 + difficulty * 4;
            
            // Pac-Man vision
            gameState.pacmanVision = 10 + difficulty * 20;
            
            // Number of Pac-Men
            gameState.pacmanCount = Math.floor(1 + difficulty * 4);
            
            // Pellet spawn rate
            gameState.pelletSpawnRate = 1 - difficulty * 0.5;
            
            // Power-up duration
            gameState.powerUpDuration = 10 - difficulty * 5;
            
            // Maze complexity
            gameState.mazeComplexity = 0.3 + difficulty * 0.7;
        },
        
        onPlayerDeath() {
            this.metrics.deaths++;
            // Temporarily reduce difficulty
            this.playerSkill = Math.max(0, this.playerSkill - 0.2);
        },
        
        onPelletCollected() {
            this.metrics.pelletsCollected.push(Date.now());
        },
        
        saveDifficultyData() {
            const data = {
                playerSkill: this.playerSkill,
                metrics: this.metrics,
                history: this.difficultyHistory
            };
            localStorage.setItem('backroomsPacman_difficulty', JSON.stringify(data));
        },
        
        loadDifficultyData() {
            const saved = localStorage.getItem('backroomsPacman_difficulty');
            if (saved) {
                const data = JSON.parse(saved);
                this.playerSkill = data.playerSkill || 0.5;
                this.metrics = data.metrics || this.metrics;
            }
        }
    };

    // ============================================
    // PHASE 2.4: MULTI-AGENT COORDINATION
    // ============================================
    
    const MultiAgentCoordination = {
        agents: [],
        communicationRange: 30,
        
        init() {
            console.log('[Phase 2] Multi-agent coordination initialized');
        },
        
        registerAgent(agent) {
            this.agents.push({
                id: agent.id,
                position: { x: agent.x, y: agent.y },
                role: 'scout',
                state: 'idle',
                target: null,
                lastUpdate: Date.now()
            });
        },
        
        update(agents, playerState) {
            // Update agent positions
            agents.forEach(agent => {
                const registered = this.agents.find(a => a.id === agent.id);
                if (registered) {
                    registered.position = { x: agent.x, y: agent.y };
                    registered.lastUpdate = Date.now();
                }
            });
            
            // Assign roles
            this.assignRoles(playerState);
            
            // Coordinate tactics
            this.coordinateTactics(playerState);
            
            // Share information
            this.shareInformation();
        },
        
        assignRoles(playerState) {
            const activeAgents = this.agents.filter(a => 
                Date.now() - a.lastUpdate < 5000
            );
            
            if (activeAgents.length < 2) return;
            
            // Find closest agent to player (hunter)
            let closest = activeAgents[0];
            let minDist = Infinity;
            
            activeAgents.forEach(agent => {
                const dx = agent.position.x - playerState.x;
                const dy = agent.position.y - playerState.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < minDist) {
                    minDist = dist;
                    closest = agent;
                }
            });
            
            closest.role = 'hunter';
            
            // Assign flankers
            activeAgents.forEach(agent => {
                if (agent.id !== closest.id) {
                    const dx = agent.position.x - playerState.x;
                    const dy = agent.position.y - playerState.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < this.communicationRange) {
                        agent.role = 'flanker';
                    } else {
                        agent.role = 'scout';
                    }
                }
            });
        },
        
        coordinateTactics(playerState) {
            const hunters = this.agents.filter(a => a.role === 'hunter');
            const flankers = this.agents.filter(a => a.role === 'flanker');
            
            // Pincer movement
            if (hunters.length > 0 && flankers.length > 0) {
                const hunter = hunters[0];
                
                // Position flankers on opposite sides
                flankers.forEach((flanker, i) => {
                    const angle = (i + 1) * Math.PI / (flankers.length + 1);
                    const targetX = playerState.x + Math.cos(angle) * 10;
                    const targetY = playerState.y + Math.sin(angle) * 10;
                    
                    flanker.target = { x: targetX, y: targetY };
                    flanker.state = 'flanking';
                });
            }
            
            // Ambush setup
            if (flankers.length >= 2) {
                this.setupAmbush(playerState, flankers);
            }
        },
        
        setupAmbush(playerState, flankers) {
            // Predict player path
            const predictedPos = this.predictPlayerPosition(playerState, 2);
            
            // Position agents at ambush points
            flankers.forEach((flanker, i) => {
                const offset = i === 0 ? -5 : 5;
                flanker.target = {
                    x: predictedPos.x + offset,
                    y: predictedPos.y
                };
                flanker.state = 'ambushing';
            });
        },
        
        predictPlayerPosition(playerState, timeAhead) {
            return {
                x: playerState.x + playerState.vx * timeAhead,
                y: playerState.y + playerState.vy * timeAhead
            };
        },
        
        shareInformation() {
            // Agents share player position
            const hunters = this.agents.filter(a => a.role === 'hunter');
            
            if (hunters.length > 0) {
                const playerPos = hunters[0].target;
                
                // Share with all agents in range
                this.agents.forEach(agent => {
                    if (agent.role !== 'hunter') {
                        const dx = agent.position.x - hunters[0].position.x;
                        const dy = agent.position.y - hunters[0].position.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        if (dist < this.communicationRange) {
                            agent.target = playerPos;
                        }
                    }
                });
            }
        },
        
        getAgentRole(agentId) {
            const agent = this.agents.find(a => a.id === agentId);
            return agent ? agent.role : 'scout';
        },
        
        getAgentTarget(agentId) {
            const agent = this.agents.find(a => a.id === agentId);
            return agent ? agent.target : null;
        }
    };

    // ============================================
    // PHASE 2.5: PLAYER BEHAVIOR ANALYSIS
    // ============================================
    
    const PlayerBehaviorAnalysis = {
        // Player profile
        profile: {
            playstyle: 'balanced', // aggressive, cautious, explorer, speedrunner
            weaknesses: [],
            strengths: [],
            preferredRoutes: [],
            fearTriggers: [],
            stressResponse: 'freeze' // freeze, fight, flight
        },
        
        // Session data
        sessionData: {
            movements: [],
            decisions: [],
            reactions: [],
            stressLevels: [],
            exploration: new Set()
        },
        
        init() {
            this.loadProfile();
            console.log('[Phase 2] Player behavior analysis initialized');
        },
        
        update(playerState, gameState, dt) {
            // Track player data
            this.trackMovement(playerState);
            this.trackDecisions(playerState, gameState);
            this.trackStress(playerState);
            this.trackExploration(playerState);
            
            // Analyze periodically
            if (this.sessionData.movements.length % 100 === 0) {
                this.analyzeBehavior();
            }
        },
        
        trackMovement(playerState) {
            this.sessionData.movements.push({
                x: playerState.x,
                y: playerState.y,
                vx: playerState.vx,
                vy: playerState.vy,
                timestamp: Date.now()
            });
            
            // Keep last 500 movements
            if (this.sessionData.movements.length > 500) {
                this.sessionData.movements.shift();
            }
        },
        
        trackDecisions(playerState, gameState) {
            // Track significant decisions
            if (playerState.action) {
                this.sessionData.decisions.push({
                    action: playerState.action,
                    context: {
                        nearPacman: playerState.nearPacman,
                        health: playerState.health,
                        pellets: playerState.pellets
                    },
                    timestamp: Date.now()
                });
            }
        },
        
        trackStress(playerState) {
            this.sessionData.stressLevels.push({
                level: playerState.stress || 0,
                timestamp: Date.now()
            });
        },
        
        trackExploration(playerState) {
            // Track visited areas
            const gridX = Math.floor(playerState.x / 5);
            const gridY = Math.floor(playerState.y / 5);
            this.sessionData.exploration.add(`${gridX},${gridY}`);
        },
        
        analyzeBehavior() {
            // Determine playstyle
            this.determinePlaystyle();
            
            // Identify weaknesses
            this.identifyWeaknesses();
            
            // Identify strengths
            this.identifyStrengths();
            
            // Analyze stress response
            this.analyzeStressResponse();
            
            // Save profile
            this.saveProfile();
        },
        
        determinePlaystyle() {
            const movements = this.sessionData.movements;
            if (movements.length < 50) return;
            
            // Calculate average speed
            let totalSpeed = 0;
            movements.forEach(m => {
                totalSpeed += Math.sqrt(m.vx * m.vx + m.vy * m.vy);
            });
            const avgSpeed = totalSpeed / movements.length;
            
            // Calculate exploration ratio
            const explorationRatio = this.sessionData.exploration.size / 100;
            
            // Determine playstyle
            if (avgSpeed > 5 && explorationRatio < 0.3) {
                this.profile.playstyle = 'speedrunner';
            } else if (avgSpeed < 2 && explorationRatio > 0.7) {
                this.profile.playstyle = 'explorer';
            } else if (this.sessionData.decisions.filter(d => d.action === 'attack').length > 10) {
                this.profile.playstyle = 'aggressive';
            } else {
                this.profile.playstyle = 'cautious';
            }
        },
        
        identifyWeaknesses() {
            this.profile.weaknesses = [];
            
            // Check for patterns that lead to death
            const deaths = this.sessionData.decisions.filter(d => 
                d.context.health <= 0
            );
            
            if (deaths.length > 0) {
                // Analyze what happened before death
                deaths.forEach(death => {
                    const beforeDeath = this.sessionData.decisions.filter(d => 
                        d.timestamp < death.timestamp && 
                        d.timestamp > death.timestamp - 5000
                    );
                    
                    if (beforeDeath.some(d => d.action === 'sprint')) {
                        if (!this.profile.weaknesses.includes('overextension')) {
                            this.profile.weaknesses.push('overextension');
                        }
                    }
                });
            }
            
            // Check for panic patterns
            const panicStresses = this.sessionData.stressLevels.filter(s => s.level > 0.8);
            if (panicStresses.length > 10) {
                this.profile.weaknesses.push('stress_management');
            }
        },
        
        identifyStrengths() {
            this.profile.strengths = [];
            
            // Check for good evasion
            const nearMisses = this.sessionData.decisions.filter(d => 
                d.context.nearPacman && d.context.health > 0
            );
            
            if (nearMisses.length > 5) {
                this.profile.strengths.push('evasion');
            }
            
            // Check for exploration
            if (this.sessionData.exploration.size > 50) {
                this.profile.strengths.push('exploration');
            }
        },
        
        analyzeStressResponse() {
            const highStress = this.sessionData.stressLevels.filter(s => s.level > 0.7);
            
            if (highStress.length === 0) return;
            
            // Analyze what happens after high stress
            let freezeCount = 0;
            let fightCount = 0;
            let flightCount = 0;
            
            highStress.forEach(stress => {
                const after = this.sessionData.movements.filter(m => 
                    m.timestamp > stress.timestamp && 
                    m.timestamp < stress.timestamp + 1000
                );
                
                if (after.length === 0) {
                    freezeCount++;
                } else {
                    const avgSpeed = after.reduce((sum, m) => 
                        sum + Math.sqrt(m.vx * m.vx + m.vy * m.vy), 0
                    ) / after.length;
                    
                    if (avgSpeed > 7) {
                        flightCount++;
                    } else {
                        fightCount++;
                    }
                }
            });
            
            // Determine dominant response
            if (freezeCount > fightCount && freezeCount > flightCount) {
                this.profile.stressResponse = 'freeze';
            } else if (fightCount > flightCount) {
                this.profile.stressResponse = 'fight';
            } else {
                this.profile.stressResponse = 'flight';
            }
        },
        
        // Get personalized horror recommendations
        getHorrorRecommendations() {
            const recommendations = [];
            
            if (this.profile.weaknesses.includes('stress_management')) {
                recommendations.push({
                    type: 'intensity',
                    value: 'gradual_increase',
                    reason: 'Player shows stress sensitivity'
                });
            }
            
            if (this.profile.playstyle === 'explorer') {
                recommendations.push({
                    type: 'environmental',
                    value: 'hidden_details',
                    reason: 'Player enjoys exploration'
                });
            }
            
            if (this.profile.stressResponse === 'freeze') {
                recommendations.push({
                    type: 'jump_scare',
                    value: 'delayed',
                    reason: 'Player freezes under stress'
                });
            }
            
            return recommendations;
        },
        
        saveProfile() {
            localStorage.setItem('backroomsPacman_playerProfile', JSON.stringify(this.profile));
        },
        
        loadProfile() {
            const saved = localStorage.getItem('backroomsPacman_playerProfile');
            if (saved) {
                this.profile = JSON.parse(saved);
            }
        },
        
        // Get optimal jump scare timing
        getOptimalJumpScareTime() {
            // Analyze stress patterns to find optimal timing
            const stresses = this.sessionData.stressLevels;
            if (stresses.length < 10) return 5000; // Default 5 seconds
            
            // Find average time between stress peaks
            let totalTime = 0;
            let peakCount = 0;
            let lastPeak = 0;
            
            stresses.forEach((s, i) => {
                if (s.level > 0.6 && (i === 0 || stresses[i-1].level <= 0.6)) {
                    if (lastPeak > 0) {
                        totalTime += s.timestamp - lastPeak;
                        peakCount++;
                    }
                    lastPeak = s.timestamp;
                }
            });
            
            if (peakCount === 0) return 5000;
            
            return totalTime / peakCount;
        }
    };

    // ============================================
    // PHASE 2: MAIN INITIALIZER
    // ============================================
    
    const Phase2AdvancedAI = {
        init() {
            console.log('[Phase 2] Initializing Advanced AI & Machine Learning...');
            
            NeuralPacmanAI.init();
            ProceduralEnemyGenerator.init();
            DynamicDifficulty.init();
            MultiAgentCoordination.init();
            PlayerBehaviorAnalysis.init();
            
            console.log('[Phase 2] Advanced AI initialization complete');
        },
        
        update(playerState, gameState, dt) {
            // Update neural AI
            NeuralPacmanAI.playerMemory.positions.push({
                x: playerState.x,
                y: playerState.y,
                timestamp: Date.now()
            });
            
            if (NeuralPacmanAI.playerMemory.positions.length > 100) {
                NeuralPacmanAI.playerMemory.positions.shift();
            }
            
            // Update dynamic difficulty
            DynamicDifficulty.update(playerState, gameState, dt);
            
            // Update player behavior analysis
            PlayerBehaviorAnalysis.update(playerState, gameState, dt);
            
            // Update multi-agent coordination
            if (gameState.pacmen) {
                MultiAgentCoordination.update(gameState.pacmen, playerState);
            }
        },
        
        // Get AI decision for a Pac-Man
        getPacmanDecision(pacmanState, playerState, environment) {
            return NeuralPacmanAI.predict(playerState, pacmanState, environment);
        },
        
        // Generate new enemy
        generateEnemy(difficulty, playerSkill) {
            return ProceduralEnemyGenerator.getEnemyForEncounter(difficulty, playerSkill);
        },
        
        // Report encounter result for evolution
        reportEncounter(enemyId, result) {
            ProceduralEnemyGenerator.reportEncounter(enemyId, result);
        },
        
        // Evolve enemies
        evolveEnemies() {
            ProceduralEnemyGenerator.evolve();
        },
        
        // Get player profile
        getPlayerProfile() {
            return PlayerBehaviorAnalysis.profile;
        },
        
        // Get horror recommendations
        getHorrorRecommendations() {
            return PlayerBehaviorAnalysis.getHorrorRecommendations();
        },
        
        // Get optimal jump scare timing
        getOptimalJumpScareTime() {
            return PlayerBehaviorAnalysis.getOptimalJumpScareTime();
        },
        
        // Save all AI data
        save() {
            NeuralPacmanAI.savePlayerData();
            DynamicDifficulty.saveDifficultyData();
            PlayerBehaviorAnalysis.saveProfile();
        }
    };

    // Export to global scope
    window.Phase2AdvancedAI = Phase2AdvancedAI;
    window.NeuralPacmanAI = NeuralPacmanAI;
    window.ProceduralEnemyGenerator = ProceduralEnemyGenerator;
    window.DynamicDifficulty = DynamicDifficulty;
    window.MultiAgentCoordination = MultiAgentCoordination;
    window.PlayerBehaviorAnalysis = PlayerBehaviorAnalysis;

})();
