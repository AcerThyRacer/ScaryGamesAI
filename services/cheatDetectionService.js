/**
 * AI-Powered Cheat Detection Service
 * 
 * Detects cheating through behavioral anomaly detection, pattern recognition,
 * and server-side validation.
 * 
 * @module services/cheatDetection
 */

const CheatDetectionService = (function() {
    'use strict';

    // Known cheat patterns
    const CHEAT_PATTERNS = {
        aimbot: {
            id: 'aimbot',
            name: 'Aimbot Detection',
            indicators: ['perfect_tracking', 'instant_snap', 'wall_aim', 'superhuman_accuracy'],
            threshold: 0.8,
            severity: 'critical'
        },
        wallhack: {
            id: 'wallhack',
            name: 'Wallhack Detection',
            indicators: ['pre_aim', 'pre_fire', 'tracking_through_walls', 'knowledge_of_positions'],
            threshold: 0.7,
            severity: 'high'
        },
        speedhack: {
            id: 'speedhack',
            name: 'Speedhack Detection',
            indicators: ['impossible_movement_speed', 'teleportation', 'unnatural_acceleration'],
            threshold: 0.9,
            severity: 'high'
        },
        noclip: {
            id: 'noclip',
            name: 'No-clip Detection',
            indicators: ['passing_through_walls', 'floating', 'ignoring_collision'],
            threshold: 0.85,
            severity: 'high'
        },
        triggerbot: {
            id: 'triggerbot',
            name: 'Triggerbot Detection',
            indicators: ['instant_fire_on_crosshair', 'perfect_reaction_time', 'no_missed_shots'],
            threshold: 0.75,
            severity: 'medium'
        },
        stat_manipulation: {
            id: 'stat_manipulation',
            name: 'Stat Manipulation',
            indicators: ['impossible_score', 'negative_latency', 'modified_game_state'],
            threshold: 0.95,
            severity: 'critical'
        }
    };

    // Baseline human performance limits
    const HUMAN_LIMITS = {
        reactionTime: { min: 100, average: 250 }, // ms
        accuracy: { max: 95 }, // % (professional players)
        turnsPerSecond: { max: 10 },
        movementSpeed: { max: 1.0 }, // Normalized
        clicksPerSecond: { max: 12 },
        headshotRate: { max: 70 } // % (professional players)
    };

    /**
     * Behavioral anomaly detection
     */
    const AnomalyDetection = {
        /**
         * Calculate Z-score for a value
         * @param {number} value - Value
         * @param {number} mean - Mean
         * @param {number} stddev - Standard deviation
         * @returns {number} Z-score
         */
        zScore(value, mean, stddev) {
            if (stddev === 0) return 0;
            return Math.abs((value - mean) / stddev);
        },

        /**
         * Detect anomalies in session data
         * @param {Object} session - Session data
         * @param {Object} baseline - User's baseline
         * @returns {Array} Detected anomalies
         */
        detectAnomalies(session, baseline) {
            const anomalies = [];

            // Check reaction time
            if (session.avgReactionTime < HUMAN_LIMITS.reactionTime.min) {
                anomalies.push({
                    type: 'superhuman_reaction',
                    severity: 'critical',
                    value: session.avgReactionTime,
                    threshold: HUMAN_LIMITS.reactionTime.min,
                    confidence: 0.95
                });
            } else if (baseline && session.avgReactionTime) {
                const zScore = this.zScore(
                    session.avgReactionTime,
                    baseline.avgReactionTime || 250,
                    baseline.reactionTimeStdDev || 50
                );
                if (zScore > 4) {
                    anomalies.push({
                        type: 'abnormal_reaction_improvement',
                        severity: 'high',
                        value: zScore,
                        confidence: 0.8
                    });
                }
            }

            // Check accuracy
            if (session.accuracy > HUMAN_LIMITS.accuracy.max) {
                anomalies.push({
                    type: 'impossible_accuracy',
                    severity: 'critical',
                    value: session.accuracy,
                    threshold: HUMAN_LIMITS.accuracy.max,
                    confidence: 0.98
                });
            }

            // Check headshot rate
            if (session.headshotRate > HUMAN_LIMITS.headshotRate.max) {
                anomalies.push({
                    type: 'suspicious_headshot_rate',
                    severity: 'high',
                    value: session.headshotRate,
                    threshold: HUMAN_LIMITS.headshotRate.max,
                    confidence: 0.85
                });
            }

            // Check movement speed
            if (session.maxSpeed > HUMAN_LIMITS.movementSpeed.max * 1.5) {
                anomalies.push({
                    type: 'impossible_speed',
                    severity: 'high',
                    value: session.maxSpeed,
                    threshold: HUMAN_LIMITS.movementSpeed.max,
                    confidence: 0.9
                });
            }

            // Check for perfect tracking
            if (session.trackingPerfectness > 0.98 && session.duration > 60) {
                anomalies.push({
                    type: 'perfect_tracking',
                    severity: 'high',
                    value: session.trackingPerfectness,
                    confidence: 0.85
                });
            }

            // Check for wall-banging
            if (session.wallBangs > 0 && session.wallBangAccuracy > 0.7) {
                anomalies.push({
                    type: 'suspicious_wallbangs',
                    severity: 'medium',
                    value: session.wallBangAccuracy,
                    confidence: 0.7
                });
            }

            return anomalies;
        },

        /**
         * Build baseline from historical sessions
         * @param {Array} sessions - Historical sessions
         * @returns {Object} Baseline statistics
         */
        buildBaseline(sessions) {
            if (sessions.length === 0) return null;

            const stats = {
                avgReactionTime: 0,
                reactionTimeStdDev: 0,
                avgAccuracy: 0,
                accuracyStdDev: 0,
                avgSpeed: 0,
                speedStdDev: 0,
                sessionCount: sessions.length
            };

            // Calculate means
            const reactionTimes = sessions.map(s => s.avgReactionTime || 250);
            const accuracies = sessions.map(s => s.accuracy || 50);
            const speeds = sessions.map(s => s.maxSpeed || 1);

            stats.avgReactionTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
            stats.avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
            stats.avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

            // Calculate standard deviations
            stats.reactionTimeStdDev = this._stdDev(reactionTimes, stats.avgReactionTime);
            stats.accuracyStdDev = this._stdDev(accuracies, stats.avgAccuracy);
            stats.speedStdDev = this._stdDev(speeds, stats.avgSpeed);

            return stats;
        },

        /**
         * Calculate standard deviation
         * @param {Array} values - Values
         * @param {number} mean - Mean
         * @returns {number} Standard deviation
         */
        _stdDev(values, mean) {
            if (values.length < 2) return 50; // Default
            const variance = values.reduce((sum, v) => Math.pow(v - mean, 2), 0) / (values.length - 1);
            return Math.sqrt(variance);
        }
    };

    /**
     * Cheat Detection Service class
     */
    class CheatDetectionServiceClass {
        /**
         * Create cheat detection service
         * @param {Object} config - Configuration
         */
        constructor(config = {}) {
            this.patterns = new Map(Object.entries(CHEAT_PATTERNS));
            this.userBaselines = new Map();
            this.suspiciousSessions = new Map();
            this.reportThreshold = config.reportThreshold || 0.7;
            this.banThreshold = config.banThreshold || 0.9;
        }

        /**
         * Analyze session for cheat patterns
         * @param {Object} session - Session data
         * @returns {Object} Analysis results
         */
        analyzeSession(session) {
            const detections = [];
            const anomalies = AnomalyDetection.detectAnomalies(
                session,
                this.userBaselines.get(session.userId)
            );

            // Check each cheat pattern
            for (const [patternId, pattern] of this.patterns) {
                const match = this._matchPattern(session, pattern);
                if (match.confidence > pattern.threshold) {
                    detections.push({
                        pattern: patternId,
                        name: pattern.name,
                        confidence: match.confidence,
                        severity: pattern.severity,
                        indicators: match.indicators
                    });
                }
            }

            // Add anomalies
            for (const anomaly of anomalies) {
                detections.push({
                    pattern: 'anomaly',
                    name: anomaly.type,
                    confidence: anomaly.confidence,
                    severity: anomaly.severity,
                    details: anomaly
                });
            }

            // Calculate overall cheat probability
            const overallProbability = this._calculateOverallProbability(detections);

            // Store suspicious sessions
            if (overallProbability > this.reportThreshold) {
                this._storeSuspiciousSession(session, detections, overallProbability);
            }

            return {
                sessionId: session.id,
                userId: session.userId,
                gameId: session.gameId,
                detections,
                overallProbability,
                requiresReview: overallProbability > this.reportThreshold,
                autoBan: overallProbability > this.banThreshold,
                analyzedAt: Date.now()
            };
        }

        /**
         * Match session against cheat pattern
         * @param {Object} session - Session data
         * @param {Object} pattern - Cheat pattern
         * @returns {Object} Match result
         */
        _matchPattern(session, pattern) {
            const indicators = [];
            let totalConfidence = 0;

            for (const indicator of pattern.indicators) {
                const detected = this._checkIndicator(session, indicator);
                if (detected) {
                    indicators.push(indicator);
                    totalConfidence += detected.confidence;
                }
            }

            return {
                indicators,
                confidence: indicators.length > 0 ? totalConfidence / pattern.indicators.length : 0
            };
        }

        /**
         * Check specific indicator in session
         * @param {Object} session - Session data
         * @param {string} indicator - Indicator name
         * @returns {Object|null} Detection result
         */
        _checkIndicator(session, indicator) {
            switch (indicator) {
                case 'perfect_tracking':
                    if (session.trackingPerfectness > 0.98) {
                        return { confidence: 0.9 };
                    }
                    break;
                case 'instant_snap':
                    if (session.avgSnapTime < 50) {
                        return { confidence: 0.95 };
                    }
                    break;
                case 'superhuman_accuracy':
                    if (session.accuracy > HUMAN_LIMITS.accuracy.max) {
                        return { confidence: 0.98 };
                    }
                    break;
                case 'impossible_movement_speed':
                    if (session.maxSpeed > HUMAN_LIMITS.movementSpeed.max * 1.5) {
                        return { confidence: 0.9 };
                    }
                    break;
                case 'perfect_reaction_time':
                    if (session.avgReactionTime < HUMAN_LIMITS.reactionTime.min) {
                        return { confidence: 0.95 };
                    }
                    break;
                case 'no_missed_shots':
                    if (session.shotsFired > 50 && session.accuracy === 100) {
                        return { confidence: 0.99 };
                    }
                    break;
                case 'teleportation':
                    if (session.maxDistancePerFrame > 10) {
                        return { confidence: 0.95 };
                    }
                    break;
            }
            return null;
        }

        /**
         * Calculate overall cheat probability
         * @param {Array} detections - Detections
         * @returns {number} Probability
         */
        _calculateOverallProbability(detections) {
            if (detections.length === 0) return 0;

            // Weight by severity
            const severityWeights = {
                critical: 1.0,
                high: 0.8,
                medium: 0.5,
                low: 0.3
            };

            let weightedSum = 0;
            let totalWeight = 0;

            for (const detection of detections) {
                const weight = severityWeights[detection.severity] || 0.5;
                weightedSum += detection.confidence * weight;
                totalWeight += weight;
            }

            return totalWeight > 0 ? weightedSum / totalWeight : 0;
        }

        /**
         * Store suspicious session for review
         * @param {Object} session - Session
         * @param {Array} detections - Detections
         * @param {number} probability - Cheat probability
         */
        _storeSuspiciousSession(session, detections, probability) {
            const key = `${session.userId}:${session.id}`;
            this.suspiciousSessions.set(key, {
                session,
                detections,
                probability,
                storedAt: Date.now()
            });

            // Limit storage
            if (this.suspiciousSessions.size > 1000) {
                const oldest = Array.from(this.suspiciousSessions.entries())
                    .sort((a, b) => a[1].storedAt - b[1].storedAt)[0];
                this.suspiciousSessions.delete(oldest[0]);
            }
        }

        /**
         * Update user baseline
         * @param {string} userId - User ID
         * @param {Object} session - Session data
         */
        updateUserBaseline(userId, session) {
            const sessions = Array.from(this.suspiciousSessions.values())
                .filter(s => s.session.userId === userId)
                .map(s => s.session);

            // Also include recent legitimate sessions
            // (In production, fetch from database)

            const baseline = AnomalyDetection.buildBaseline(sessions);
            if (baseline) {
                this.userBaselines.set(userId, baseline);
            }
        }

        /**
         * Get suspicious sessions for review
         * @param {Object} filters - Filters
         * @returns {Array} Suspicious sessions
         */
        getSuspiciousSessions(filters = {}) {
            let sessions = Array.from(this.suspiciousSessions.values());

            if (filters.userId) {
                sessions = sessions.filter(s => s.session.userId === filters.userId);
            }
            if (filters.minProbability) {
                sessions = sessions.filter(s => s.probability >= filters.minProbability);
            }
            if (filters.severity) {
                sessions = sessions.filter(s =>
                    s.detections.some(d => d.severity === filters.severity)
                );
            }

            return sessions.sort((a, b) => b.probability - a.probability);
        }

        /**
         * Validate score submission
         * @param {Object} scoreData - Score data
         * @returns {Object} Validation result
         */
        validateScore(scoreData) {
            const { userId, score, gameId, sessionData } = scoreData;

            // Check against theoretical maximum
            const maxPossible = this._calculateMaxScore(gameId, sessionData);
            if (score > maxPossible) {
                return {
                    valid: false,
                    reason: 'exceeds_maximum',
                    score,
                    maxPossible
                };
            }

            // Check for statistical outliers
            if (sessionData) {
                const analysis = this.analyzeSession(sessionData);
                if (analysis.overallProbability > this.banThreshold) {
                    return {
                        valid: false,
                        reason: 'suspicious_behavior',
                        probability: analysis.overallProbability,
                        detections: analysis.detections
                    };
                }
            }

            return { valid: true };
        }

        /**
         * Calculate theoretical maximum score
         * @param {string} gameId - Game ID
         * @param {Object} sessionData - Session data
         * @returns {number} Maximum possible score
         */
        _calculateMaxScore(gameId, sessionData) {
            // Base maximum on game configuration and session duration
            const baseMax = 100000; // Default max
            const durationMultiplier = (sessionData?.duration || 600) / 600;
            const difficultyMultiplier = sessionData?.difficulty ? 1 + (sessionData.difficulty * 0.5) : 1;

            return Math.floor(baseMax * durationMultiplier * difficultyMultiplier);
        }

        /**
         * Get detection statistics
         * @returns {Object} Statistics
         */
        getStats() {
            const sessions = Array.from(this.suspiciousSessions.values());
            const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
            const byPattern = {};

            for (const session of sessions) {
                for (const detection of session.detections) {
                    bySeverity[detection.severity]++;
                    byPattern[detection.pattern] = (byPattern[detection.pattern] || 0) + 1;
                }
            }

            return {
                totalSuspicious: sessions.length,
                bySeverity,
                byPattern,
                baselinesTracked: this.userBaselines.size
            };
        }

        /**
         * Clear old suspicious sessions
         * @param {number} maxAge - Max age in ms
         */
        clearOldSessions(maxAge = 7 * 24 * 60 * 60 * 1000) {
            const now = Date.now();
            for (const [key, data] of this.suspiciousSessions.entries()) {
                if (now - data.storedAt > maxAge) {
                    this.suspiciousSessions.delete(key);
                }
            }
        }
    }

    // Singleton instance
    let instance = null;

    /**
     * Get or create cheat detection instance
     * @param {Object} config - Configuration
     * @returns {CheatDetectionServiceClass} Instance
     */
    function getInstance(config) {
        if (!instance) {
            instance = new CheatDetectionServiceClass(config);
        }
        return instance;
    }

    // Public API
    return {
        CheatDetectionService: CheatDetectionServiceClass,
        AnomalyDetection,
        CHEAT_PATTERNS,
        HUMAN_LIMITS,
        getInstance,
        VERSION: '1.0.0'
    };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CheatDetectionService;
} else if (typeof window !== 'undefined') {
    window.CheatDetectionService = CheatDetectionService;
}
