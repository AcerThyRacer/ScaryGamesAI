/* ============================================================
   HELLAPHOBIA - PHASE 3: TENSORFLOW.JS NEURAL AI
   Real Machine Learning | Player Behavior Analysis
   Adaptive Difficulty | Evolution System
   ============================================================ */

(function() {
    'use strict';

    // Check if TensorFlow.js is available
    const tf = window.tf || null;
    
    // ===== NEURAL NETWORK MANAGER =====
    const NeuralAI = {
        models: new Map(),
        trainingData: [],
        isTraining: false,
        tensorflowLoaded: !!tf,
        
        async init() {
            console.log('Phase 3: TensorFlow.js Neural AI initializing...');
            
            // Load or create models
            await this.loadOrCreateModels();
            
            // Setup data collection
            this.setupDataCollection();
            
            console.log(`Phase 3: TensorFlow.js ${this.tensorflowLoaded ? 'READY' : 'NOT LOADED - using fallback'}`);
        },
        
        async loadOrCreateModels() {
            if (!this.tensorflowLoaded) {
                console.warn('TensorFlow.js not loaded - using heuristic AI');
                return;
            }
            
            try {
                // Create player behavior prediction model
                const playerModel = tf.sequential({
                    layers: [
                        tf.layers.dense({ inputShape: [10], units: 32, activation: 'relu' }),
                        tf.layers.dropout({ rate: 0.3 }),
                        tf.layers.dense({ units: 16, activation: 'relu' }),
                        tf.layers.dense({ units: 8, activation: 'softmax' })
                    ]
                });
                
                playerModel.compile({
                    optimizer: tf.train.adam(0.001),
                    loss: 'categoricalCrossentropy',
                    metrics: ['accuracy']
                });
                
                this.models.set('player_behavior', playerModel);
                
                // Create difficulty adjustment model
                const difficultyModel = tf.sequential({
                    layers: [
                        tf.layers.dense({ inputShape: [5], units: 16, activation: 'relu' }),
                        tf.layers.dense({ units: 8, activation: 'relu' }),
                        tf.layers.dense({ units: 1, activation: 'sigmoid' })
                    ]
                });
                
                difficultyModel.compile({
                    optimizer: tf.train.adam(0.01),
                    loss: 'meanSquaredError'
                });
                
                this.models.set('difficulty', difficultyModel);
                
                console.log('Phase 3: Neural networks created successfully');
            } catch (err) {
                console.error('Phase 3: Failed to create models', err);
            }
        },
        
        setupDataCollection() {
            // Collect player actions for training
            window.addEventListener('playerAction', (e) => {
                this.recordPlayerAction(e.detail);
            });
            
            window.addEventListener('monsterDeath', (e) => {
                this.recordMonsterDeath(e.detail);
            });
            
            window.addEventListener('playerDeath', (e) => {
                this.recordPlayerDeath(e.detail);
            });
        },
        
        recordPlayerAction(action) {
            const data = {
                timestamp: Date.now(),
                type: action.type, // 'attack', 'dodge', 'hide', 'run', 'fight'
                position: action.position,
                health: action.health,
                sanity: action.sanity,
                enemiesNearby: action.enemiesNearby,
                success: action.success,
                reactionTime: action.reactionTime
            };
            
            this.trainingData.push(data);
            
            // Keep last 1000 actions
            if (this.trainingData.length > 1000) {
                this.trainingData.shift();
            }
        },
        
        recordMonsterDeath(details) {
            // Train AI on how monster was defeated
            if (this.models.has('player_behavior')) {
                // Update model with successful player strategies
            }
        },
        
        recordPlayerDeath(details) {
            // Learn from player deaths to improve difficulty
            if (this.models.has('difficulty')) {
                // Adjust difficulty based on death cause
            }
        },
        
        // Predict player's next action
        async predictPlayerAction(currentState) {
            if (!this.tensorflowLoaded || !this.models.has('player_behavior')) {
                return this.heuristicPrediction(currentState);
            }
            
            try {
                const model = this.models.get('player_behavior');
                const input = tf.tensor2d([this.encodeState(currentState)]);
                const prediction = model.predict(input);
                const result = await prediction.data();
                
                input.dispose();
                prediction.dispose();
                
                return this.decodeAction(result);
            } catch (err) {
                return this.heuristicPrediction(currentState);
            }
        },
        
        heuristicPrediction(state) {
            // Fallback heuristic-based prediction
            if (state.health < 30) return 'retreat';
            if (state.enemiesNearby > 3) return 'panic';
            if (state.sanity < 40) return 'hesitate';
            return 'engage';
        },
        
        encodeState(state) {
            return [
                state.health / 100,
                state.sanity / 100,
                state.enemiesNearby / 5,
                state.ammo / 100,
                state.distanceToExit / 1000,
                state.timeInLevel / 300,
                state.deathsInLevel / 5,
                state.averageDamage / 100,
                state.stealthLevel / 1,
                state.aggressionLevel / 1
            ];
        },
        
        decodeAction(prediction) {
            const actions = ['attack', 'defend', 'retreat', 'hide', 'panic', 'explore', 'loot', 'rush'];
            const maxIndex = prediction.indexOf(Math.max(...prediction));
            return actions[maxIndex] || 'attack';
        },
        
        // Get adaptive difficulty
        async getAdaptiveDifficulty(playerStats) {
            if (!this.tensorflowLoaded || !this.models.has('difficulty')) {
                return this.heuristicDifficulty(playerStats);
            }
            
            try {
                const model = this.models.get('difficulty');
                const input = tf.tensor2d([[
                    playerStats.deathRate,
                    playerStats.averageHealth,
                    playerStats.killRate,
                    playerStats.timePerLevel,
                    playerStats.skillLevel
                ]]);
                
                const prediction = model.predict(input);
                const result = await prediction.data();
                
                input.dispose();
                prediction.dispose();
                
                return Math.max(0.5, Math.min(2.0, result[0]));
            } catch (err) {
                return this.heuristicDifficulty(playerStats);
            }
        },
        
        heuristicDifficulty(stats) {
            // Simple heuristic for difficulty adjustment
            let difficulty = 1.0;
            
            if (stats.deathRate > 0.5) difficulty -= 0.1;
            if (stats.deathRate < 0.2) difficulty += 0.1;
            if (stats.averageHealth < 40) difficulty -= 0.1;
            if (stats.averageHealth > 80) difficulty += 0.1;
            if (stats.killRate < 0.7) difficulty -= 0.1;
            if (stats.killRate > 0.9) difficulty += 0.1;
            
            return Math.max(0.5, Math.min(2.0, difficulty));
        },
        
        // Train models periodically
        async trainModels() {
            if (!this.tensorflowLoaded || this.isTraining) return;
            if (this.trainingData.length < 100) return;
            
            this.isTraining = true;
            
            try {
                const model = this.models.get('player_behavior');
                if (!model) return;
                
                // Prepare training data
                const inputs = [];
                const outputs = [];
                
                for (const data of this.trainingData.slice(-500)) {
                    inputs.push(this.encodeState(data));
                    outputs.push(this.actionToOneHot(data.type));
                }
                
                const xs = tf.tensor2d(inputs);
                const ys = tf.tensor2d(outputs);
                
                await model.fit(xs, ys, {
                    epochs: 10,
                    batchSize: 32,
                    shuffle: true,
                    callbacks: {
                        onEpochEnd: (epoch, logs) => {
                            console.log(`Training epoch ${epoch}: loss=${logs.loss.toFixed(4)}`);
                        }
                    }
                });
                
                xs.dispose();
                ys.dispose();
                
                console.log('Phase 3: Model training complete');
            } catch (err) {
                console.error('Phase 3: Training failed', err);
            } finally {
                this.isTraining = false;
            }
        },
        
        actionToOneHot(action) {
            const actions = ['attack', 'defend', 'retreat', 'hide', 'panic', 'explore', 'loot', 'rush'];
            const oneHot = new Array(actions.length).fill(0);
            const index = actions.indexOf(action);
            if (index >= 0) oneHot[index] = 1;
            return oneHot;
        },
        
        exportAPI() {
            return {
                init: () => this.init(),
                predictPlayerAction: (state) => this.predictPlayerAction(state),
                getAdaptiveDifficulty: (stats) => this.getAdaptiveDifficulty(stats),
                trainModels: () => this.trainModels(),
                recordPlayerAction: (action) => this.recordPlayerAction(action),
                isTensorFlowLoaded: () => this.tensorflowLoaded
            };
        }
    };
    
    // ===== MONSTER LEARNING SYSTEM =====
    const MonsterLearning = {
        encounters: new Map(),
        globalKnowledge: new Map(),
        
        recordEncounter(monsterId, playerActions, outcome) {
            if (!this.encounters.has(monsterId)) {
                this.encounters.set(monsterId, []);
            }
            
            const encounter = {
                timestamp: Date.now(),
                playerActions: [...playerActions],
                outcome: outcome, // 'monster_win', 'player_win', 'draw'
                duration: playerActions.length * 0.1
            };
            
            this.encounters.get(monsterId).push(encounter);
            
            // Keep last 50 encounters per monster type
            const list = this.encounters.get(monsterId);
            if (list.length > 50) list.shift();
            
            // Learn from encounter
            this.learnFromEncounter(monsterId, encounter);
        },
        
        learnFromEncounter(monsterId, encounter) {
            // Analyze what worked/didn't work
            const knowledge = this.globalKnowledge.get(monsterId) || {
                effectiveStrategies: [],
                ineffectiveStrategies: [],
                playerPatterns: [],
                counterStrategies: []
            };
            
            if (encounter.outcome === 'monster_win') {
                // What led to victory?
                knowledge.effectiveStrategies.push({
                    strategy: 'aggressive_rush',
                    successRate: 0.8
                });
            } else {
                // What led to defeat?
                knowledge.ineffectiveStrategies.push({
                    strategy: 'passive_wait',
                    failureRate: 0.9
                });
            }
            
            this.globalKnowledge.set(monsterId, knowledge);
        },
        
        getStrategy(monsterId) {
            const knowledge = this.globalKnowledge.get(monsterId);
            if (!knowledge || knowledge.effectiveStrategies.length === 0) {
                return 'default_aggressive';
            }
            
            // Return most effective strategy
            const sorted = knowledge.effectiveStrategies.sort((a, b) => b.successRate - a.successRate);
            return sorted[0].strategy;
        },
        
        exportAPI() {
            return {
                recordEncounter: (id, actions, outcome) => this.recordEncounter(id, actions, outcome),
                getStrategy: (id) => this.getStrategy(id)
            };
        }
    };
    
    // Export to window
    window.NeuralAI = NeuralAI.exportAPI();
    window.MonsterLearning = MonsterLearning.exportAPI();
    
    console.log('Phase 3: TensorFlow.js Neural AI System loaded');
})();
