/**
 * A/B Testing Admin Dashboard
 * 
 * Provides UI for managing A/B experiments, viewing results,
 * and deploying winners.
 * 
 * @module ab-testing-dashboard
 */

const ABTestingDashboard = (function() {
    'use strict';

    /**
     * A/B Testing Dashboard Component
     */
    class ABDashboard {
        /**
         * Create dashboard
         * @param {Object} config - Configuration
         */
        constructor(config) {
            this.container = typeof config.container === 'string'
                ? document.querySelector(config.container)
                : config.container;
            this.apiBase = config.apiBase || '/api/v1/ab';
            this.refreshInterval = config.refreshInterval || 30000; // 30s
            this._init();
        }

        /**
         * Initialize dashboard
         */
        async _init() {
            this._render();
            this._attachEventListeners();
            await this.loadExperiments();
            
            // Auto-refresh
            if (this.refreshInterval) {
                setInterval(() => this.loadExperiments(), this.refreshInterval);
            }
        }

        /**
         * Render dashboard
         */
        _render() {
            this.container.innerHTML = `
                <div class="ab-dashboard">
                    <div class="ab-dashboard-header">
                        <h1>A/B Testing Dashboard</h1>
                        <button class="ab-create-btn" id="ab-create-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                            New Experiment
                        </button>
                    </div>
                    
                    <div class="ab-stats-overview">
                        <div class="ab-stat-card">
                            <span class="ab-stat-label">Active Experiments</span>
                            <span class="ab-stat-value" id="ab-active-count">0</span>
                        </div>
                        <div class="ab-stat-card">
                            <span class="ab-stat-label">Total Conversions</span>
                            <span class="ab-stat-value" id="ab-conversions-count">0</span>
                        </div>
                        <div class="ab-stat-card">
                            <span class="ab-stat-label">Avg. Confidence</span>
                            <span class="ab-stat-value" id="ab-confidence-avg">0%</span>
                        </div>
                        <div class="ab-stat-card">
                            <span class="ab-stat-label">Winners Deployed</span>
                            <span class="ab-stat-value" id="ab-deployed-count">0</span>
                        </div>
                    </div>

                    <div class="ab-experiments-list" id="ab-experiments-list">
                        <div class="ab-loading">
                            <div class="ab-spinner"></div>
                            <p>Loading experiments...</p>
                        </div>
                    </div>
                </div>

                <!-- Create Experiment Modal -->
                <div class="ab-modal" id="ab-create-modal" style="display:none;">
                    <div class="ab-modal-content">
                        <div class="ab-modal-header">
                            <h2>Create New Experiment</h2>
                            <button class="ab-modal-close" id="ab-modal-close">&times;</button>
                        </div>
                        <form id="ab-create-form" class="ab-form">
                            <div class="ab-form-group">
                                <label for="ab-name">Experiment Name</label>
                                <input type="text" id="ab-name" name="name" required 
                                       placeholder="e.g., Horror Intensity Test">
                            </div>
                            <div class="ab-form-group">
                                <label for="ab-description">Description</label>
                                <textarea id="ab-description" name="description" rows="3"
                                          placeholder="What are you testing?"></textarea>
                            </div>
                            <div class="ab-form-group">
                                <label for="ab-parameter">AI Parameter</label>
                                <select id="ab-parameter" name="parameter" required>
                                    <option value="">Select parameter...</option>
                                    <option value="horror_intensity">Horror Intensity</option>
                                    <option value="spawn_rate">Enemy Spawn Rate</option>
                                    <option value="difficulty_scaling">Difficulty Scaling</option>
                                    <option value="audio_mix">Audio Mix</option>
                                    <option value="visual_effects">Visual Effects</option>
                                </select>
                            </div>
                            <div class="ab-variants-section" id="ab-variants-section">
                                <label>Variants</label>
                                <div class="ab-variant-row">
                                    <input type="text" name="variant_a_name" value="Control (A)" readonly>
                                    <input type="number" name="variant_a_value" step="0.1" 
                                           placeholder="Value" required>
                                </div>
                                <div class="ab-variant-row">
                                    <input type="text" name="variant_b_name" value="Test (B)" readonly>
                                    <input type="number" name="variant_b_value" step="0.1" 
                                           placeholder="Value" required>
                                </div>
                            </div>
                            <div class="ab-form-group">
                                <label for="ab-success-metric">Success Metric</label>
                                <select id="ab-success-metric" name="successMetric" required>
                                    <option value="conversion">Conversion</option>
                                    <option value="engagement_time">Engagement Time</option>
                                    <option value="retention">Retention</option>
                                    <option value="revenue">Revenue</option>
                                </select>
                            </div>
                            <div class="ab-form-group">
                                <label for="ab-target-size">Target Sample Size</label>
                                <input type="number" id="ab-target-size" name="targetSampleSize" 
                                       value="1000" min="100">
                            </div>
                            <div class="ab-form-actions">
                                <button type="button" class="ab-btn-secondary" id="ab-cancel-btn">Cancel</button>
                                <button type="submit" class="ab-btn-primary">Create Experiment</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Results Modal -->
                <div class="ab-modal" id="ab-results-modal" style="display:none;">
                    <div class="ab-modal-content ab-modal-large">
                        <div class="ab-modal-header">
                            <h2>Experiment Results</h2>
                            <button class="ab-modal-close" id="ab-results-close">&times;</button>
                        </div>
                        <div id="ab-results-content" class="ab-results-content">
                            <!-- Results will be rendered here -->
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * Attach event listeners
         */
        _attachEventListeners() {
            // Create button
            const createBtn = this.container.querySelector('#ab-create-btn');
            const modal = this.container.querySelector('#ab-create-modal');
            const closeBtn = this.container.querySelector('#ab-modal-close');
            const cancelBtn = this.container.querySelector('#ab-cancel-btn');

            createBtn.addEventListener('click', () => {
                modal.style.display = 'block';
            });

            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });

            cancelBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });

            // Close modal on outside click
            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });

            // Form submission
            const form = this.container.querySelector('#ab-create-form');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this._handleCreateExperiment(new FormData(form));
            });

            // Results modal close
            const resultsModal = this.container.querySelector('#ab-results-modal');
            const resultsClose = this.container.querySelector('#ab-results-close');
            resultsClose.addEventListener('click', () => {
                resultsModal.style.display = 'none';
            });
            window.addEventListener('click', (e) => {
                if (e.target === resultsModal) {
                    resultsModal.style.display = 'none';
                }
            });
        }

        /**
         * Load experiments from API
         */
        async loadExperiments() {
            try {
                const response = await fetch(`${this.apiBase}/experiments`);
                const data = await response.json();
                
                if (data.success) {
                    this._renderExperiments(data.experiments);
                    this._updateStats(data.experiments);
                }
            } catch (error) {
                console.error('Failed to load experiments:', error);
                this._showError('Failed to load experiments');
            }
        }

        /**
         * Render experiments list
         * @param {Array} experiments - Experiments data
         */
        _renderExperiments(experiments) {
            const list = this.container.querySelector('#ab-experiments-list');
            
            if (experiments.length === 0) {
                list.innerHTML = `
                    <div class="ab-empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                        <p>No experiments yet. Create your first A/B test!</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = experiments.map(exp => `
                <div class="ab-experiment-card" data-id="${exp.id}">
                    <div class="ab-exp-header">
                        <div class="ab-exp-info">
                            <h3>${exp.name}</h3>
                            <p class="ab-exp-desc">${exp.description || 'No description'}</p>
                            <span class="ab-exp-parameter">Parameter: ${exp.parameter}</span>
                        </div>
                        <span class="ab-status-badge ab-status-${exp.status}">${exp.status}</span>
                    </div>
                    
                    <div class="ab-exp-variants">
                        ${exp.variants.map(v => `
                            <div class="ab-variant-card">
                                <span class="ab-variant-name">${v.name}</span>
                                <span class="ab-variant-value">${v.value}</span>
                                <span class="ab-variant-assignments">${v.assignments || 0} users</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="ab-exp-metrics">
                        <div class="ab-metric">
                            <span class="ab-metric-label">Conversions</span>
                            <span class="ab-metric-value">${exp.totalConversions || 0}</span>
                        </div>
                        <div class="ab-metric">
                            <span class="ab-metric-label">Sample Size</span>
                            <span class="ab-metric-value">${exp.totalAssignments || 0}/${exp.targetSampleSize}</span>
                        </div>
                        <div class="ab-metric">
                            <span class="ab-metric-label">Confidence</span>
                            <span class="ab-metric-value">${exp.confidence ? (exp.confidence * 100).toFixed(1) : 0}%</span>
                        </div>
                    </div>
                    
                    <div class="ab-exp-actions">
                        ${exp.status === 'draft' ? `
                            <button class="ab-btn-small ab-btn-start" data-action="start">Start</button>
                        ` : ''}
                        ${exp.status === 'running' ? `
                            <button class="ab-btn-small ab-btn-results" data-action="results">Results</button>
                            <button class="ab-btn-small ab-btn-stop" data-action="stop">Stop</button>
                        ` : ''}
                        ${exp.status === 'completed' && !exp.winnerDeployed ? `
                            <button class="ab-btn-small ab-btn-deploy" data-action="deploy">Deploy Winner</button>
                        ` : ''}
                        <button class="ab-btn-small ab-btn-secondary" data-action="details">Details</button>
                    </div>
                </div>
            `).join('');

            // Attach action listeners
            list.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const card = e.target.closest('.ab-experiment-card');
                    const experimentId = card.dataset.id;
                    const action = e.target.dataset.action;
                    this._handleAction(experimentId, action);
                });
            });
        }

        /**
         * Update statistics
         * @param {Array} experiments - Experiments data
         */
        _updateStats(experiments) {
            const active = experiments.filter(e => e.status === 'running').length;
            const totalConversions = experiments.reduce((sum, e) => sum + (e.totalConversions || 0), 0);
            const avgConfidence = experiments.filter(e => e.confidence)
                .reduce((sum, e) => sum + e.confidence, 0) / (experiments.length || 1);
            const deployed = experiments.filter(e => e.winnerDeployed).length;

            this.container.querySelector('#ab-active-count').textContent = active;
            this.container.querySelector('#ab-conversions-count').textContent = totalConversions;
            this.container.querySelector('#ab-confidence-avg').textContent = (avgConfidence * 100).toFixed(1) + '%';
            this.container.querySelector('#ab-deployed-count').textContent = deployed;
        }

        /**
         * Handle create experiment
         * @param {FormData} formData - Form data
         */
        async _handleCreateExperiment(formData) {
            const data = {
                name: formData.get('name'),
                description: formData.get('description'),
                parameter: formData.get('parameter'),
                variants: [
                    {
                        name: formData.get('variant_a_name'),
                        value: parseFloat(formData.get('variant_a_value'))
                    },
                    {
                        name: formData.get('variant_b_name'),
                        value: parseFloat(formData.get('variant_b_value'))
                    }
                ],
                successMetric: formData.get('successMetric'),
                targetSampleSize: parseInt(formData.get('targetSampleSize'))
            };

            try {
                const response = await fetch(`${this.apiBase}/experiments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                
                if (result.success) {
                    this.container.querySelector('#ab-create-modal').style.display = 'none';
                    await this.loadExperiments();
                    this._showToast('Experiment created successfully!', 'success');
                } else {
                    this._showToast('Failed to create experiment: ' + result.error, 'error');
                }
            } catch (error) {
                this._showToast('Failed to create experiment: ' + error.message, 'error');
            }
        }

        /**
         * Handle action button click
         * @param {string} experimentId - Experiment ID
         * @param {string} action - Action type
         */
        async _handleAction(experimentId, action) {
            switch (action) {
                case 'start':
                    await this._startExperiment(experimentId);
                    break;
                case 'stop':
                    await this._stopExperiment(experimentId);
                    break;
                case 'results':
                    await this._showResults(experimentId);
                    break;
                case 'deploy':
                    await this._deployWinner(experimentId);
                    break;
                case 'details':
                    await this._showResults(experimentId);
                    break;
            }
        }

        /**
         * Start experiment
         * @param {string} experimentId - Experiment ID
         */
        async _startExperiment(experimentId) {
            try {
                const response = await fetch(`${this.apiBase}/experiments/${experimentId}/start`, {
                    method: 'POST'
                });

                const result = await response.json();
                
                if (result.success) {
                    await this.loadExperiments();
                    this._showToast('Experiment started!', 'success');
                } else {
                    this._showToast('Failed to start: ' + result.error, 'error');
                }
            } catch (error) {
                this._showToast('Failed to start: ' + error.message, 'error');
            }
        }

        /**
         * Stop experiment
         * @param {string} experimentId - Experiment ID
         */
        async _stopExperiment(experimentId) {
            try {
                const response = await fetch(`${this.apiBase}/experiments/${experimentId}/stop`, {
                    method: 'POST'
                });

                const result = await response.json();
                
                if (result.success) {
                    await this.loadExperiments();
                    this._showToast('Experiment stopped', 'success');
                } else {
                    this._showToast('Failed to stop: ' + result.error, 'error');
                }
            } catch (error) {
                this._showToast('Failed to stop: ' + error.message, 'error');
            }
        }

        /**
         * Show results
         * @param {string} experimentId - Experiment ID
         */
        async _showResults(experimentId) {
            try {
                const response = await fetch(`${this.apiBase}/experiments/${experimentId}/results`);
                const data = await response.json();
                
                if (data.success) {
                    this._renderResults(data.results);
                    this.container.querySelector('#ab-results-modal').style.display = 'block';
                }
            } catch (error) {
                this._showToast('Failed to load results: ' + error.message, 'error');
            }
        }

        /**
         * Render results
         * @param {Object} results - Results data
         */
        _renderResults(results) {
            const content = this.container.querySelector('#ab-results-content');
            
            content.innerHTML = `
                <div class="ab-results-header">
                    <h3>${results.experiment.name}</h3>
                    <p>${results.experiment.description}</p>
                </div>
                
                <div class="ab-results-grid">
                    <div class="ab-results-summary">
                        <div class="ab-summary-stat">
                            <span class="ab-summary-label">Total Users</span>
                            <span class="ab-summary-value">${results.experiment.totalAssignments || 0}</span>
                        </div>
                        <div class="ab-summary-stat">
                            <span class="ab-summary-label">Total Conversions</span>
                            <span class="ab-summary-value">${results.experiment.totalConversions || 0}</span>
                        </div>
                        <div class="ab-summary-stat">
                            <span class="ab-summary-label">Confidence Level</span>
                            <span class="ab-summary-value">${results.confidence ? (results.confidence * 100).toFixed(1) : 0}%</span>
                        </div>
                        <div class="ab-summary-stat">
                            <span class="ab-summary-label">Statistical Significance</span>
                            <span class="ab-summary-value ${results.significant ? 'significant' : 'not-significant'}">
                                ${results.significant ? 'Yes' : 'No'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="ab-variants-comparison">
                        <h4>Variant Performance</h4>
                        ${results.variants.map((v, i) => `
                            <div class="ab-variant-result ${v.isWinner ? 'winner' : ''}">
                                <div class="ab-vr-header">
                                    <span class="ab-vr-name">${v.name}</span>
                                    ${v.isWinner ? '<span class="ab-winner-badge">🏆 Winner</span>' : ''}
                                </div>
                                <div class="ab-vr-value">${v.value}</div>
                                <div class="ab-vr-stats">
                                    <span>Users: ${v.assignments || 0}</span>
                                    <span>Conversions: ${v.conversions || 0}</span>
                                    <span>Rate: ${v.conversionRate ? (v.conversionRate * 100).toFixed(2) : 0}%</span>
                                </div>
                                ${v.lift ? `
                                    <div class="ab-vr-lift">
                                        Lift: ${v.lift > 0 ? '+' : ''}${(v.lift * 100).toFixed(2)}%
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${results.recommendation ? `
                    <div class="ab-recommendation">
                        <h4>Recommendation</h4>
                        <p>${results.recommendation}</p>
                    </div>
                ` : ''}
            `;
        }

        /**
         * Deploy winner
         * @param {string} experimentId - Experiment ID
         */
        async _deployWinner(experimentId) {
            if (!confirm('Are you sure you want to deploy the winning variant? This will apply the changes globally.')) {
                return;
            }

            try {
                const response = await fetch(`${this.apiBase}/experiments/${experimentId}/deploy`, {
                    method: 'POST'
                });

                const result = await response.json();
                
                if (result.success) {
                    await this.loadExperiments();
                    this._showToast('Winner deployed successfully!', 'success');
                } else {
                    this._showToast('Failed to deploy: ' + result.error, 'error');
                }
            } catch (error) {
                this._showToast('Failed to deploy: ' + error.message, 'error');
            }
        }

        /**
         * Show toast notification
         * @param {string} message - Message
         * @param {string} type - Type (success/error)
         */
        _showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `ab-toast ab-toast-${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('ab-toast-hide');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        /**
         * Show error state
         * @param {string} message - Error message
         */
        _showError(message) {
            const list = this.container.querySelector('#ab-experiments-list');
            list.innerHTML = `
                <div class="ab-error-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v4M12 16h.01"/>
                    </svg>
                    <p>${message}</p>
                    <button class="ab-btn-primary" onclick="this.closest('.ab-dashboard').__vue__.loadExperiments()">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    // Public API
    return {
        ABDashboard,
        VERSION: '1.0.0'
    };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ABTestingDashboard;
} else if (typeof window !== 'undefined') {
    window.ABTestingDashboard = ABTestingDashboard;
}
