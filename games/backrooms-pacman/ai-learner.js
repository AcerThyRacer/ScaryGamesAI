/**
 * AI Learner - Machine Learning-based prediction system
 * Learns player patterns and predicts movement
 */

var AILearner = (function() {
    'use strict';

    var config = {
        historySize: 100,
        predictionSteps: 10,
        learnRate: 0.1,
        patternThreshold: 3
    };

    var playerHistory = [];
    var patterns = {};
    var currentPattern = null;
    var confidence = 0;
    var lastPrediction = null;

    function recordPlayerPosition(position, timestamp) {
        playerHistory.unshift({
            position: position.clone(),
            timestamp: timestamp,
            gridPos: worldToGrid(position)
        });

        if (playerHistory.length > config.historySize) {
            playerHistory.pop();
        }

        detectPatterns();
    }

    function worldToGrid(position) {
        var CELL = 4;
        return {
            x: Math.floor(position.x / CELL),
            z: Math.floor(position.z / CELL)
        };
    }

    function detectPatterns() {
        if (playerHistory.length < 10) return;

        for (var seqLen = 3; seqLen <= 10; seqLen++) {
            if (playerHistory.length < seqLen * 2) break;

            var recent = playerHistory.slice(0, seqLen);
            var matches = 0;

            for (var i = seqLen; i < playerHistory.length - seqLen; i++) {
                var candidate = playerHistory.slice(i, i + seqLen);
                if (sequencesMatch(recent, candidate)) {
                    matches++;
                }
            }

            if (matches >= config.patternThreshold) {
                var patternKey = recent.map(function(p) {
                    return p.gridPos.x + ',' + p.gridPos.z;
                }).join('|');

                patterns[patternKey] = {
                    sequence: recent,
                    frequency: matches,
                    lastSeen: Date.now()
                };

                currentPattern = patterns[patternKey];
                confidence = Math.min(1.0, matches / 10);
                break;
            }
        }
    }

    function sequencesMatch(seq1, seq2) {
        if (seq1.length !== seq2.length) return false;

        for (var i = 0; i < seq1.length; i++) {
            var dx = Math.abs(seq1[i].gridPos.x - seq2[i].gridPos.x);
            var dz = Math.abs(seq1[i].gridPos.z - seq2[i].gridPos.z);
            if (dx > 1 || dz > 1) return false;
        }

        return true;
    }

    /**
     * Initialize TensorFlow.js model for player behavior prediction
     */
    async function initModel() {
        if (typeof tf === 'undefined') {
            console.warn('[AILearner] TensorFlow.js not loaded. Using fallback pattern matching.');
            return false;
        }
        
        try {
            // Create LSTM model for sequence prediction
            model = tf.sequential();
            
            // LSTM layers for temporal pattern recognition
            model.add(tf.layers.lstm({
                units: 64,
                inputShape: [10, 2], // 10 timesteps, x,z coordinates
                returnSequences: true,
                name: 'lstm_1'
            }));
            
            model.add(tf.layers.dropout({ rate: 0.2 }));
            
            model.add(tf.layers.lstm({
                units: 32,
                returnSequences: false,
                name: 'lstm_2'
            }));
            
            model.add(tf.layers.dropout({ rate: 0.2 }));
            
            // Dense output layer
            model.add(tf.layers.dense({
                units: 2, // Predict next x,z
                activation: 'linear',
                name: 'output'
            }));
            
            // Compile model
            model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'meanSquaredError',
                metrics: ['mae']
            });
            
            console.log('[AILearner] TensorFlow.js model initialized');
            return true;
        } catch (error) {
            console.error('[AILearner] Failed to initialize model:', error);
            return false;
        }
    }
    
    /**
     * Train model on player history
     */
    async function trainOnHistory() {
        if (!model || playerHistory.length < 20) {
            // Not enough data, use fallback
            return false;
        }
        
        try {
            // Prepare training data
            const xs = [];
            const ys = [];
            
            // Create sequences of 10 positions
            for (let i = 0; i < playerHistory.length - 10; i++) {
                const sequence = playerHistory.slice(i, i + 10)
                    .map(p => [p.gridPos.x, p.gridPos.z]);
                const next = [playerHistory[i + 10].gridPos.x, playerHistory[i + 10].gridPos.z];
                
                xs.push(sequence);
                ys.push(next);
            }
            
            // Convert to tensors
            const xsTensor = tf.tensor3d(xs);
            const ysTensor = tf.tensor2d(ys);
            
            // Train model
            const history = await model.fit(xsTensor, ysTensor, {
                epochs: 5,
                batchSize: Math.min(32, xs.length),
                validationSplit: 0.2,
                verbose: 0,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        if (config.debugMode) {
                            console.log('[AILearner] Epoch', epoch, '- loss:', logs.loss.toFixed(4));
                        }
                    }
                }
            });
            
            // Clean up tensors
            xsTensor.dispose();
            ysTensor.dispose();
            
            console.log('[AILearner] Training complete - final loss:', history.history.loss[history.history.loss.length - 1].toFixed(4));
            return true;
        } catch (error) {
            console.error('[AILearner] Training failed:', error);
            return false;
        }
    }
    
    /**
     * Predict next player position using trained model
     * @param {THREE.Vector3} currentPos - Current player position
     * @returns {THREE.Vector3} Predicted position
     */
    function predictNextPosition(currentPos) {
        // Fallback if model not ready
        if (!model || playerHistory.length < 10) {
            return predictLinear(currentPos);
        }
        
        try {
            // Get recent history
            const recent = playerHistory.slice(0, 10)
                .map(p => [p.gridPos.x, p.gridPos.z]);
            
            // Run prediction
            const prediction = tf.tidy(() => {
                const input = tf.tensor3d([recent], [1, 10, 2]);
                const output = model.predict(input);
                return output.dataSync();
            });
            
            // Convert to Vector3
            const predicted = new THREE.Vector3(
                prediction[0] * 4,
                0,
                prediction[1] * 4
            );
            
            lastPrediction = predicted;
            confidence = 0.8; // High confidence with ML
            
            return predicted;
        } catch (error) {
            console.error('[AILearner] Prediction failed:', error);
            return predictLinear(currentPos);
        }
    }
    
    /**
     * Linear prediction fallback
     */
    function predictLinear(currentPos) {
        if (playerHistory.length < 3) {
            return currentPos.clone();
        }
        
        // Simple linear extrapolation
        const recent = playerHistory.slice(0, 3);
        const velocity = new THREE.Vector3()
            .subVectors(recent[0].position, recent[2].position)
            .multiplyScalar(0.5);
        
        const predicted = currentPos.clone().add(velocity);
        lastPrediction = predicted;
        confidence = 0.4;
        
        return predicted;
    }
    
    /**
     * Get prediction statistics
     */
    function getStats() {
        return {
            historySize: playerHistory.length,
            patternCount: Object.keys(patterns).length,
            confidence: confidence,
            hasModel: !!model,
            lastPrediction: lastPrediction
        };
    }

    function findCurrentInPattern(position) {
        if (!currentPattern) return -1;

        var gridPos = worldToGrid(position);

        for (var i = 0; i < currentPattern.sequence.length; i++) {
            var patternPos = currentPattern.sequence[i].gridPos;
            if (Math.abs(patternPos.x - gridPos.x) <= 1 &&
                Math.abs(patternPos.z - gridPos.z) <= 1) {
                return i;
            }
        }

        return -1;
    }

    function gridToWorld(gridPos) {
        var CELL = 4;
        return new THREE.Vector3(
            gridPos.x * CELL + CELL / 2,
            0,
            gridPos.z * CELL + CELL / 2
        );
    }

    function getPredictionConfidence() {
        return confidence;
    }

    function clear() {
        playerHistory = [];
        patterns = {};
        currentPattern = null;
        confidence = 0;
        lastPrediction = null;
    }

    function getStats() {
        return {
            historySize: playerHistory.length,
            patternsDetected: Object.keys(patterns).length,
            confidence: confidence,
            hasPattern: !!currentPattern
        };
    }

    return {
        recordPlayerPosition: recordPlayerPosition,
        predictNextPosition: predictNextPosition,
        getPredictionConfidence: getPredictionConfidence,
        clear: clear,
        getStats: getStats,
        config: config
    };
})();

if (typeof window !== 'undefined') {
    window.AILearner = AILearner;
}
