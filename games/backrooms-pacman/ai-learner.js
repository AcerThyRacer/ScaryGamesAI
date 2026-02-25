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

    function predictNextPosition(currentPos, deltaTime) {
        if (currentPattern && confidence > 0.5) {
            var currentIndex = findCurrentInPattern(currentPos);
            if (currentIndex !== -1 && currentIndex < currentPattern.sequence.length - 1) {
                var nextInPattern = currentPattern.sequence[currentIndex + 1];
                var predicted = gridToWorld(nextInPattern.gridPos);
                lastPrediction = predicted;
                return predicted;
            }
        }

        if (playerHistory.length >= 3) {
            var recent = playerHistory.slice(0, 3);
            var velocity = new THREE.Vector3().subVectors(
                recent[0].position,
                recent[2].position
            ).multiplyScalar(0.5);

            var predicted = currentPos.clone().add(
                velocity.multiplyScalar(deltaTime * 2)
            );
            lastPrediction = predicted;
            return predicted;
        }

        return currentPos.clone();
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
