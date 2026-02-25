/**
 * A/B Testing Framework for AI Features
 * 
 * Provides experiment creation, user assignment, event tracking,
 * and statistical analysis for AI parameter optimization.
 * 
 * @module ab-testing
 */

const ABTesting = (function() {
    'use strict';

    /**
     * Statistical utility functions
     */
    const Statistics = {
        /**
         * Calculate mean of array
         * @param {Array} values - Values
         * @returns {number} Mean
         */
        mean(values) {
            if (values.length === 0) return 0;
            return values.reduce((a, b) => a + b, 0) / values.length;
        },

        /**
         * Calculate standard deviation
         * @param {Array} values - Values
         * @returns {number} Standard deviation
         */
        stdDev(values) {
            if (values.length < 2) return 0;
            const m = this.mean(values);
            const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / (values.length - 1);
            return Math.sqrt(variance);
        },

        /**
         * Two-sample t-test
         * @param {Array} sample1 - First sample
         * @param {Array} sample2 - Second sample
         * @returns {Object} Test results
         */
        tTest(sample1, sample2) {
            const n1 = sample1.length;
            const n2 = sample2.length;

            if (n1 < 2 || n2 < 2) {
                return { t: 0, p: 1, significant: false };
            }

            const mean1 = this.mean(sample1);
            const mean2 = this.mean(sample2);
            const std1 = this.stdDev(sample1);
            const std2 = this.stdDev(sample2);

            // Pooled standard error
            const se = Math.sqrt((std1 * std1 / n1) + (std2 * std2 / n2));
            if (se === 0) {
                return { t: 0, p: 1, significant: false };
            }

            const t = (mean1 - mean2) / se;
            const df = n1 + n2 - 2; // Degrees of freedom

            // Approximate p-value using normal distribution for large samples
            const p = this._pValueFromT(t, df);

            return {
                t,
                p,
                significant: p < 0.05,
                mean1,
                mean2,
                std1,
                std2,
                n1,
                n2
            };
        },

        /**
         * Chi-squared test for conversion rates
         * @param {number} successes1 - Successes in group 1
         * @param {number} trials1 - Total trials in group 1
         * @param {number} successes2 - Successes in group 2
         * @param {number} trials2 - Total trials in group 2
         * @returns {Object} Test results
         */
        chiSquared(successes1, trials1, successes2, trials2) {
            const failures1 = trials1 - successes1;
            const failures2 = trials2 - successes2;
            const total = trials1 + trials2;
            const totalSuccesses = successes1 + successes2;
            const totalFailures = failures1 + failures2;

            if (totalSuccesses === 0 || totalFailures === 0) {
                return { chi2: 0, p: 1, significant: false };
            }

            // Expected values
            const e1s = (trials1 * totalSuccesses) / total;
            const e1f = (trials1 * totalFailures) / total;
            const e2s = (trials2 * totalSuccesses) / total;
            const e2f = (trials2 * totalFailures) / total;

            // Chi-squared statistic
            const chi2 = (
                Math.pow(successes1 - e1s, 2) / e1s +
                Math.pow(failures1 - e1f, 2) / e1f +
                Math.pow(successes2 - e2s, 2) / e2s +
                Math.pow(failures2 - e2f, 2) / e2f
            );

            const p = this._pValueFromChi2(chi2, 1);

            return {
                chi2,
                p,
                significant: p < 0.05,
                rate1: successes1 / trials1,
                rate2: successes2 / trials2
            };
        },

        /**
         * Approximate p-value from t-statistic
         * @param {number} t - T-statistic
         * @param {number} df - Degrees of freedom
         * @returns {number} P-value
         */
        _pValueFromT(t, df) {
            // Approximation using normal distribution for large df
            const absT = Math.abs(t);
            // Simple approximation: use error function approximation
            const x = absT / Math.sqrt(1 + absT * absT / (2 * df));
            return 1 - this._erf(x / Math.sqrt(2));
        },

        /**
         * Approximate p-value from chi-squared
         * @param {number} chi2 - Chi-squared statistic
         * @param {number} df - Degrees of freedom
         * @returns {number} P-value
         */
        _pValueFromChi2(chi2, df) {
            // Approximation for df=1
            return Math.exp(-chi2 / 2);
        },

        /**
         * Error function approximation
         * @param {number} x - Input
         * @returns {number} erf(x)
         */
        _erf(x) {
            // Abramowitz and Stegun approximation
            const sign = x >= 0 ? 1 : -1;
            x = Math.abs(x);
            const a1 = 0.254829592;
            const a2 = -0.284496736;
            const a3 = 1.421413741;
            const a4 = -1.453152027;
            const a5 = 1.061405429;
            const p = 0.3275911;
            const t = 1 / (1 + p * x);
            const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
            return sign * y;
        },

        /**
         * Calculate confidence interval
         * @param {Array} values - Values
         * @param {number} confidence - Confidence level (0.95 for 95%)
         * @returns {Object} Confidence interval
         */
        confidenceInterval(values, confidence = 0.95) {
            const n = values.length;
            if (n < 2) return { lower: 0, upper: 0, margin: 0 };

            const mean = this.mean(values);
            const stdErr = this.stdDev(values) / Math.sqrt(n);

            // Z-score for confidence level
            const zScores = { 0.9: 1.645, 0.95: 1.96, 0.99: 2.576 };
            const z = zScores[confidence] || 1.96;

            const margin = z * stdErr;

            return {
                lower: mean - margin,
                upper: mean + margin,
                margin
            };
        }
    };

    /**
     * A/B Testing Framework class
     */
    class ABTestingFramework {
        /**
         * Create A/B testing framework
         * @param {Object} config - Configuration
         */
        constructor(config = {}) {
            this.experiments = new Map();
            this.userAssignments = new Map();
            this.events = [];
            this.storageKey = config.storageKey || 'sgai_ab_tests';
            this.apiEndpoint = config.apiEndpoint || '/api/v1/ab';
            this.userId = config.userId || null;
            this._loadFromStorage();
        }

        /**
         * Load assignments from localStorage
         */
        _loadFromStorage() {
            try {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    const data = JSON.parse(stored);
                    this.userAssignments = new Map(data.assignments || []);
                }
            } catch (e) {
                console.warn('Failed to load A/B test storage:', e);
            }
        }

        /**
         * Save assignments to localStorage
         */
        _saveToStorage() {
            try {
                const data = {
                    assignments: Array.from(this.userAssignments.entries()),
                    timestamp: Date.now()
                };
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            } catch (e) {
                console.warn('Failed to save A/B test storage:', e);
            }
        }

        /**
         * Create a new experiment
         * @param {Object} config - Experiment configuration
         * @returns {Object} Experiment
         */
        createExperiment(config) {
            const experiment = {
                id: config.id || this._generateId(),
                name: config.name,
                description: config.description || '',
                status: config.status || 'draft', // draft, running, completed
                variants: config.variants || [],
                trafficSplit: config.trafficSplit || 50,
                primaryMetric: config.primaryMetric || 'conversion',
                secondaryMetrics: config.secondaryMetrics || [],
                createdAt: Date.now(),
                startedAt: null,
                completedAt: null,
                results: null
            };

            // Validate variants
            if (experiment.variants.length < 2) {
                throw new Error('Experiment must have at least 2 variants');
            }

            // Normalize weights
            const totalWeight = experiment.variants.reduce((sum, v) => sum + (v.weight || 1), 0);
            experiment.variants = experiment.variants.map(v => ({
                ...v,
                weight: (v.weight || 1) / totalWeight
            }));

            this.experiments.set(experiment.id, experiment);
            return experiment;
        }

        /**
         * Get experiment by ID
         * @param {string} experimentId - Experiment ID
         * @returns {Object|null} Experiment
         */
        getExperiment(experimentId) {
            return this.experiments.get(experimentId) || null;
        }

        /**
         * Start an experiment
         * @param {string} experimentId - Experiment ID
         */
        startExperiment(experimentId) {
            const experiment = this.experiments.get(experimentId);
            if (!experiment) {
                throw new Error(`Experiment ${experimentId} not found`);
            }
            experiment.status = 'running';
            experiment.startedAt = Date.now();
            this._saveToStorage();
        }

        /**
         * Stop an experiment
         * @param {string} experimentId - Experiment ID
         */
        stopExperiment(experimentId) {
            const experiment = this.experiments.get(experimentId);
            if (!experiment) {
                throw new Error(`Experiment ${experimentId} not found`);
            }
            experiment.status = 'completed';
            experiment.completedAt = Date.now();
            experiment.results = this.analyzeResults(experimentId);
            this._saveToStorage();
        }

        /**
         * Get or create user's variant assignment
         * @param {string} experimentId - Experiment ID
         * @param {string} userId - User ID
         * @returns {Object|null} Assigned variant
         */
        getVariant(experimentId, userId = this.userId) {
            const experiment = this.experiments.get(experimentId);
            if (!experiment || experiment.status !== 'running') {
                return null;
            }

            const assignmentKey = `${experimentId}:${userId}`;

            // Check existing assignment
            if (this.userAssignments.has(assignmentKey)) {
                const variantId = this.userAssignments.get(assignmentKey);
                return experiment.variants.find(v => v.id === variantId) || null;
            }

            // Check if user is in traffic split
            const hash = this._hash(userId + experimentId);
            const normalizedHash = hash % 100;

            if (normalizedHash >= this.trafficSplit) {
                // User not in experiment
                return null;
            }

            // Assign variant based on weights
            const variant = this._selectVariant(experiment.variants, hash);
            this.userAssignments.set(assignmentKey, variant.id);
            this._saveToStorage();

            return variant;
        }

        /**
         * Select variant based on weights
         * @param {Array} variants - Variants
         * @param {number} seed - Random seed
         * @returns {Object} Selected variant
         */
        _selectVariant(variants, seed) {
            const rng = seed / 0xffffffff;
            let cumulative = 0;

            for (const variant of variants) {
                cumulative += variant.weight;
                if (rng < cumulative) {
                    return variant;
                }
            }

            return variants[variants.length - 1];
        }

        /**
         * Track an event for A/B testing
         * @param {string} experimentId - Experiment ID
         * @param {string} userId - User ID
         * @param {string} eventName - Event name
         * @param {number} value - Event value
         */
        trackEvent(experimentId, userId, eventName, value = 1) {
            const assignmentKey = `${experimentId}:${userId}`;
            if (!this.userAssignments.has(assignmentKey)) {
                return; // User not in experiment
            }

            const event = {
                id: this._generateId(),
                experimentId,
                userId,
                variantId: this.userAssignments.get(assignmentKey),
                eventName,
                value,
                timestamp: Date.now()
            };

            this.events.push(event);

            // Also send to server
            this._sendEventToServer(event);
        }

        /**
         * Send event to server
         * @param {Object} event - Event
         */
        async _sendEventToServer(event) {
            try {
                await fetch(this.apiEndpoint + '/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(event)
                });
            } catch (e) {
                console.warn('Failed to send A/B test event:', e);
            }
        }

        /**
         * Analyze experiment results
         * @param {string} experimentId - Experiment ID
         * @returns {Object} Analysis results
         */
        analyzeResults(experimentId) {
            const experiment = this.experiments.get(experimentId);
            if (!experiment) {
                return null;
            }

            // Group events by variant
            const variantEvents = {};
            for (const variant of experiment.variants) {
                variantEvents[variant.id] = {
                    conversions: [],
                    values: [],
                    count: 0
                };
            }

            for (const event of this.events) {
                if (event.experimentId !== experimentId) continue;
                if (!variantEvents[event.variantId]) continue;

                variantEvents[event.variantId].count++;
                if (event.eventName === experiment.primaryMetric) {
                    variantEvents[event.variantId].conversions.push(event.value);
                }
                variantEvents[event.variantId].values.push(event.value);
            }

            // Calculate metrics per variant
            const results = {
                experimentId,
                analyzedAt: Date.now(),
                variants: {}
            };

            for (const [variantId, data] of Object.entries(variantEvents)) {
                const variant = experiment.variants.find(v => v.id === variantId);
                results.variants[variantId] = {
                    name: variant.name,
                    count: data.count,
                    conversions: data.conversions.length,
                    conversionRate: data.count > 0 ? data.conversions.length / data.count : 0,
                    meanValue: Statistics.mean(data.values),
                    stdDev: Statistics.stdDev(data.values),
                    confidenceInterval: Statistics.confidenceInterval(data.values)
                };
            }

            // Statistical comparison (control vs treatment)
            const variantIds = Object.keys(variantEvents);
            if (variantIds.length >= 2) {
                const control = variantEvents[variantIds[0]];
                const treatment = variantEvents[variantIds[1]];

                if (control.conversions.length > 0 && treatment.conversions.length > 0) {
                    const tTest = Statistics.tTest(control.conversions, treatment.conversions);
                    results.statisticalTest = {
                        type: 't-test',
                        ...tTest,
                        control: variantIds[0],
                        treatment: variantIds[1]
                    };

                    // Determine winner
                    if (tTest.significant) {
                        results.winner = tTest.mean1 > tTest.mean2 ? variantIds[0] : variantIds[1];
                        results.confidence = 1 - tTest.p;
                    }
                }

                // Chi-squared for conversion rates
                const chi2 = Statistics.chiSquared(
                    control.conversions.length, control.count,
                    treatment.conversions.length, treatment.count
                );
                results.chiSquared = chi2;
            }

            return results;
        }

        /**
         * Auto-deploy winner if statistically significant
         * @param {string} experimentId - Experiment ID
         * @param {number} threshold - Confidence threshold (default 0.95)
         * @returns {Object|null} Deployment result
         */
        autoDeploy(experimentId, threshold = 0.95) {
            const results = this.analyzeResults(experimentId);
            if (!results || !results.winner) {
                return null;
            }

            if (results.confidence < threshold) {
                return { deployed: false, reason: 'insufficient_confidence' };
            }

            const winner = results.variants[results.winner];
            
            // In a real implementation, this would trigger deployment
            console.log(`Auto-deploying variant: ${winner.name}`);

            return {
                deployed: true,
                variant: results.winner,
                confidence: results.confidence,
                improvement: this._calculateImprovement(results, results.winner)
            };
        }

        /**
         * Calculate improvement percentage
         * @param {Object} results - Results
         * @param {string} winnerId - Winner variant ID
         * @returns {number} Improvement percentage
         */
        _calculateImprovement(results, winnerId) {
            const winner = results.variants[winnerId];
            const baseline = Object.values(results.variants).find(v => v !== winner);
            if (!baseline) return 0;

            return ((winner.meanValue - baseline.meanValue) / baseline.meanValue) * 100;
        }

        /**
         * Generate unique ID
         * @returns {string} Unique ID
         */
        _generateId() {
            return 'ab_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
        }

        /**
         * Hash function for consistent assignment
         * @param {string} str - Input string
         * @returns {number} Hash
         */
        _hash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash);
        }

        /**
         * Get all experiments
         * @returns {Array} Experiments
         */
        getExperiments() {
            return Array.from(this.experiments.values());
        }

        /**
         * Get active experiments
         * @returns {Array} Active experiments
         */
        getActiveExperiments() {
            return this.getExperiments().filter(e => e.status === 'running');
        }

        /**
         * Clear all data
         */
        clear() {
            this.experiments.clear();
            this.userAssignments.clear();
            this.events = [];
            localStorage.removeItem(this.storageKey);
        }

        /**
         * Export data
         * @returns {Object} Exported data
         */
        export() {
            return {
                experiments: Array.from(this.experiments.entries()),
                assignments: Array.from(this.userAssignments.entries()),
                events: this.events,
                exportedAt: Date.now()
            };
        }

        /**
         * Import data
         * @param {Object} data - Data to import
         */
        import(data) {
            this.experiments = new Map(data.experiments || []);
            this.userAssignments = new Map(data.assignments || []);
            this.events = data.events || [];
        }
    }

    // Singleton instance
    let instance = null;

    /**
     * Get or create A/B testing instance
     * @param {Object} config - Configuration
     * @returns {ABTestingFramework} Instance
     */
    function getInstance(config) {
        if (!instance) {
            instance = new ABTestingFramework(config);
        }
        return instance;
    }

    // Public API
    return {
        ABTestingFramework,
        Statistics,
        getInstance,
        VERSION: '1.0.0'
    };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ABTesting;
} else if (typeof window !== 'undefined') {
    window.ABTesting = ABTesting;
}
