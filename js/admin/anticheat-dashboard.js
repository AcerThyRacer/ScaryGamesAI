/**
 * Anti-Cheat Admin Dashboard
 * 
 * Provides UI for monitoring cheat reports, reviewing violations,
 * managing bans, and viewing enforcement statistics.
 * 
 * @module anticheat-dashboard
 */

const AntiCheatDashboard = (function() {
    'use strict';

    /**
     * Anti-Cheat Dashboard Component
     */
    class ACDashboard {
        /**
         * Create dashboard
         * @param {Object} config - Configuration
         */
        constructor(config) {
            this.container = typeof config.container === 'string'
                ? document.querySelector(config.container)
                : config.container;
            this.apiBase = config.apiBase || '/api/v1/anticheat';
            this.refreshInterval = config.refreshInterval || 15000; // 15s
            this._init();
        }

        /**
         * Initialize dashboard
         */
        async _init() {
            this._render();
            this._attachEventListeners();
            await this.loadReports();
            await this.loadStats();
            
            // Auto-refresh
            if (this.refreshInterval) {
                setInterval(() => {
                    this.loadReports();
                    this.loadStats();
                }, this.refreshInterval);
            }
        }

        /**
         * Render dashboard
         */
        _render() {
            this.container.innerHTML = `
                <div class="ac-dashboard">
                    <div class="ac-dashboard-header">
                        <h1>Anti-Cheat Dashboard</h1>
                        <div class="ac-header-actions">
                            <button class="ac-btn ac-btn-refresh" id="ac-refresh-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M23 4v6h-6M1 20v-6h6"/>
                                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </div>
                    
                    <div class="ac-stats-overview">
                        <div class="ac-stat-card ac-stat-critical">
                            <span class="ac-stat-label">Pending Reviews</span>
                            <span class="ac-stat-value" id="ac-pending-count">0</span>
                        </div>
                        <div class="ac-stat-card ac-stat-warning">
                            <span class="ac-stat-label">Active Bans</span>
                            <span class="ac-stat-value" id="ac-bans-count">0</span>
                        </div>
                        <div class="ac-stat-card ac-stat-info">
                            <span class="ac-stat-label">Reports Today</span>
                            <span class="ac-stat-value" id="ac-today-count">0</span>
                        </div>
                        <div class="ac-stat-card ac-stat-success">
                            <span class="ac-stat-label">Accuracy Rate</span>
                            <span class="ac-stat-value" id="ac-accuracy-rate">0%</span>
                        </div>
                    </div>

                    <div class="ac-tabs">
                        <button class="ac-tab active" data-tab="reports">Cheat Reports</button>
                        <button class="ac-tab" data-tab="enforcement">Enforcement Actions</button>
                        <button class="ac-tab" data-tab="analytics">Analytics</button>
                    </div>

                    <div class="ac-tab-content">
                        <div class="ac-tab-panel active" id="ac-reports-panel">
                            <div class="ac-reports-list" id="ac-reports-list">
                                <div class="ac-loading">
                                    <div class="ac-spinner"></div>
                                    <p>Loading reports...</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="ac-tab-panel" id="ac-enforcement-panel">
                            <div class="ac-enforcement-list" id="ac-enforcement-list">
                                <div class="ac-loading">
                                    <div class="ac-spinner"></div>
                                    <p>Loading enforcement actions...</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="ac-tab-panel" id="ac-analytics-panel">
                            <div class="ac-analytics" id="ac-analytics">
                                <div class="ac-loading">
                                    <div class="ac-spinner"></div>
                                    <p>Loading analytics...</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Review Modal -->
                    <div class="ac-modal" id="ac-review-modal" style="display:none;">
                        <div class="ac-modal-content ac-modal-large">
                            <div class="ac-modal-header">
                                <h2>Review Cheat Report</h2>
                                <button class="ac-modal-close" id="ac-modal-close">&times;</button>
                            </div>
                            <div id="ac-review-content" class="ac-review-content">
                                <!-- Review content will be rendered here -->
                            </div>
                        </div>
                    </div>

                    <!-- User History Modal -->
                    <div class="ac-modal" id="ac-history-modal" style="display:none;">
                        <div class="ac-modal-content">
                            <div class="ac-modal-header">
                                <h2>User Violation History</h2>
                                <button class="ac-modal-close" id="ac-history-close">&times;</button>
                            </div>
                            <div id="ac-history-content" class="ac-history-content">
                                <!-- History content will be rendered here -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * Attach event listeners
         */
        _attachEventListeners() {
            // Refresh button
            this.container.querySelector('#ac-refresh-btn').addEventListener('click', () => {
                this.loadReports();
                this.loadStats();
            });

            // Tabs
            this.container.querySelectorAll('.ac-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    this._switchTab(e.target.dataset.tab);
                });
            });

            // Modals
            const reviewModal = this.container.querySelector('#ac-review-modal');
            const historyModal = this.container.querySelector('#ac-history-modal');
            
            this.container.querySelector('#ac-modal-close').addEventListener('click', () => {
                reviewModal.style.display = 'none';
            });
            
            this.container.querySelector('#ac-history-close').addEventListener('click', () => {
                historyModal.style.display = 'none';
            });

            // Close on outside click
            window.addEventListener('click', (e) => {
                if (e.target === reviewModal) reviewModal.style.display = 'none';
                if (e.target === historyModal) historyModal.style.display = 'none';
            });
        }

        /**
         * Switch tab
         * @param {string} tabName - Tab name
         */
        _switchTab(tabName) {
            this.container.querySelectorAll('.ac-tab').forEach(t => t.classList.remove('active'));
            this.container.querySelectorAll('.ac-tab-panel').forEach(p => p.classList.remove('active'));
            
            this.container.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
            this.container.querySelector(`#ac-${tabName}-panel`).classList.add('active');
            
            // Load content if needed
            if (tabName === 'enforcement' && !this._enforcementLoaded) {
                this.loadEnforcementActions();
                this._enforcementLoaded = true;
            } else if (tabName === 'analytics' && !this._analyticsLoaded) {
                this.loadAnalytics();
                this._analyticsLoaded = true;
            }
        }

        /**
         * Load reports from API
         */
        async loadReports() {
            try {
                const response = await fetch(`${this.apiBase}/reports?status=pending`);
                const data = await response.json();
                
                if (data.success) {
                    this._renderReports(data.reports);
                    this._updatePendingCount(data.reports.length);
                }
            } catch (error) {
                console.error('Failed to load reports:', error);
            }
        }

        /**
         * Load enforcement actions
         */
        async loadEnforcementActions() {
            try {
                const response = await fetch(`${this.apiBase}/enforcement?limit=50`);
                const data = await response.json();
                
                if (data.success) {
                    this._renderEnforcementActions(data.actions);
                }
            } catch (error) {
                console.error('Failed to load enforcement actions:', error);
            }
        }

        /**
         * Load statistics
         */
        async loadStats() {
            try {
                const response = await fetch(`${this.apiBase}/stats`);
                const data = await response.json();
                
                if (data.success) {
                    this._updateStats(data.stats);
                }
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }

        /**
         * Load analytics
         */
        async loadAnalytics() {
            try {
                const response = await fetch(`${this.apiBase}/analytics`);
                const data = await response.json();
                
                if (data.success) {
                    this._renderAnalytics(data.analytics);
                }
            } catch (error) {
                console.error('Failed to load analytics:', error);
            }
        }

        /**
         * Render reports list
         * @param {Array} reports - Reports data
         */
        _renderReports(reports) {
            const list = this.container.querySelector('#ac-reports-list');
            
            if (reports.length === 0) {
                list.innerHTML = `
                    <div class="ac-empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p>No pending reports. All clear!</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = `
                <table class="ac-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Type</th>
                            <th>Source</th>
                            <th>Confidence</th>
                            <th>Time</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reports.map(report => `
                            <tr class="ac-report-row ac-priority-${report.priority || 'medium'}">
                                <td><code>${report.id.slice(0, 8)}</code></td>
                                <td>
                                    <div class="ac-user-cell">
                                        <span class="ac-username">${report.userId}</span>
                                        <button class="ac-link-btn" data-user="${report.userId}">History</button>
                                    </div>
                                </td>
                                <td><span class="ac-cheat-type">${report.cheatType}</span></td>
                                <td><span class="ac-source-badge ac-source-${report.source}">${report.source}</span></td>
                                <td>
                                    <div class="ac-confidence-bar">
                                        <div class="ac-confidence-fill" style="width: ${(report.confidence || 0) * 100}%"></div>
                                        <span>${((report.confidence || 0) * 100).toFixed(0)}%</span>
                                    </div>
                                </td>
                                <td>${new Date(report.timestamp).toLocaleString()}</td>
                                <td>
                                    <button class="ac-btn-small ac-btn-review" data-report="${report.id}">Review</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            // Attach event listeners
            list.querySelectorAll('.ac-btn-review').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this._openReviewModal(e.target.dataset.report);
                });
            });

            list.querySelectorAll('.ac-link-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this._openUserHistory(e.target.dataset.user);
                });
            });
        }

        /**
         * Render enforcement actions
         * @param {Array} actions - Actions data
         */
        _renderEnforcementActions(actions) {
            const list = this.container.querySelector('#ac-enforcement-list');
            
            list.innerHTML = `
                <table class="ac-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Action</th>
                            <th>Reason</th>
                            <th>Duration</th>
                            <th>Expires</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${actions.map(action => `
                            <tr>
                                <td><span class="ac-username">${action.userId}</span></td>
                                <td><span class="ac-action-badge ac-action-${action.actionType}">${action.actionType}</span></td>
                                <td>${action.reason}</td>
                                <td>${action.duration || 'Permanent'}</td>
                                <td>${action.expiresAt ? new Date(action.expiresAt).toLocaleDateString() : 'N/A'}</td>
                                <td><span class="ac-status-badge ac-status-${action.status}">${action.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        /**
         * Render analytics
         * @param {Object} analytics - Analytics data
         */
        _renderAnalytics(analytics) {
            const container = this.container.querySelector('#ac-analytics');
            
            container.innerHTML = `
                <div class="ac-analytics-grid">
                    <div class="ac-analytics-card">
                        <h3>Detection Accuracy</h3>
                        <div class="ac-analytics-value">${(analytics.accuracy * 100).toFixed(1)}%</div>
                        <p class="ac-analytics-desc">Based on upheld reports</p>
                    </div>
                    
                    <div class="ac-analytics-card">
                        <h3>Reports by Type</h3>
                        <div class="ac-chart-container">
                            ${this._renderPieChart(analytics.reportsByType)}
                        </div>
                    </div>
                    
                    <div class="ac-analytics-card">
                        <h3>Detections Over Time</h3>
                        <div class="ac-chart-container">
                            ${this._renderBarChart(analytics.detectionsOverTime)}
                        </div>
                    </div>
                    
                    <div class="ac-analytics-card">
                        <h3>Top Cheat Types</h3>
                        <ul class="ac-top-list">
                            ${Object.entries(analytics.topCheatTypes || {})
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([type, count]) => `
                                    <li>
                                        <span>${type}</span>
                                        <span class="ac-count">${count}</span>
                                    </li>
                                `).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        /**
         * Render pie chart (simplified)
         * @param {Object} data - Data
         */
        _renderPieChart(data) {
            if (!data || Object.keys(data).length === 0) {
                return '<p>No data available</p>';
            }
            
            const total = Object.values(data).reduce((a, b) => a + b, 0);
            const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
            let cumulative = 0;
            
            return `
                <div class="ac-pie-chart">
                    ${Object.entries(data).map(([type, count], i) => {
                        const percentage = (count / total) * 100;
                        const color = colors[i % colors.length];
                        return `
                            <div class="ac-pie-segment" style="background: ${color}; width: ${percentage}%">
                                <span>${type}</span>
                                <span>${count}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        /**
         * Render bar chart (simplified)
         * @param {Array} data - Data
         */
        _renderBarChart(data) {
            if (!data || data.length === 0) {
                return '<p>No data available</p>';
            }
            
            const maxValue = Math.max(...data.map(d => d.value));
            
            return `
                <div class="ac-bar-chart">
                    ${data.map(d => `
                        <div class="ac-bar-item">
                            <div class="ac-bar" style="height: ${(d.value / maxValue) * 100}%"></div>
                            <span class="ac-bar-label">${d.label}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        /**
         * Update statistics display
         * @param {Object} stats - Statistics
         */
        _updateStats(stats) {
            if (stats.activeBans !== undefined) {
                this.container.querySelector('#ac-bans-count').textContent = stats.activeBans;
            }
            if (stats.reportsToday !== undefined) {
                this.container.querySelector('#ac-today-count').textContent = stats.reportsToday;
            }
            if (stats.accuracyRate !== undefined) {
                this.container.querySelector('#ac-accuracy-rate').textContent = (stats.accuracyRate * 100).toFixed(1) + '%';
            }
        }

        /**
         * Update pending count
         * @param {number} count - Count
         */
        _updatePendingCount(count) {
            this.container.querySelector('#ac-pending-count').textContent = count;
        }

        /**
         * Open review modal
         * @param {string} reportId - Report ID
         */
        async _openReviewModal(reportId) {
            try {
                const response = await fetch(`${this.apiBase}/reports/${reportId}`);
                const data = await response.json();
                
                if (data.success) {
                    this._renderReviewContent(data.report);
                    this.container.querySelector('#ac-review-modal').style.display = 'block';
                }
            } catch (error) {
                this._showToast('Failed to load report details', 'error');
            }
        }

        /**
         * Render review content
         * @param {Object} report - Report data
         */
        _renderReviewContent(report) {
            const content = this.container.querySelector('#ac-review-content');
            
            content.innerHTML = `
                <div class="ac-review-header">
                    <div class="ac-review-meta">
                        <span class="ac-report-id">Report #${report.id.slice(0, 8)}</span>
                        <span class="ac-report-time">${new Date(report.timestamp).toLocaleString()}</span>
                    </div>
                    <span class="ac-priority-badge ac-priority-${report.priority}">${report.priority}</span>
                </div>
                
                <div class="ac-review-grid">
                    <div class="ac-review-section">
                        <h4>User Information</h4>
                        <dl class="ac-dl">
                            <dt>User ID</dt>
                            <dd>${report.userId}</dd>
                            <dt>Username</dt>
                            <dd>${report.username || 'Unknown'}</dd>
                            <dt>Previous Violations</dt>
                            <dd>${report.previousViolations || 0}</dd>
                        </dl>
                    </div>
                    
                    <div class="ac-review-section">
                        <h4>Violation Details</h4>
                        <dl class="ac-dl">
                            <dt>Cheat Type</dt>
                            <dd><span class="ac-cheat-type">${report.cheatType}</span></dd>
                            <dt>Source</dt>
                            <dd><span class="ac-source-badge ac-source-${report.source}">${report.source}</span></dd>
                            <dt>Confidence</dt>
                            <dd>
                                <div class="ac-confidence-bar">
                                    <div class="ac-confidence-fill" style="width: ${(report.confidence || 0) * 100}%"></div>
                                    <span>${((report.confidence || 0) * 100).toFixed(1)}%</span>
                                </div>
                            </dd>
                        </dl>
                    </div>
                </div>
                
                ${report.evidence ? `
                    <div class="ac-review-section">
                        <h4>Evidence</h4>
                        <pre class="ac-evidence">${JSON.stringify(report.evidence, null, 2)}</pre>
                    </div>
                ` : ''}
                
                ${report.sessionData ? `
                    <div class="ac-review-section">
                        <h4>Session Analysis</h4>
                        <div class="ac-session-metrics">
                            ${Object.entries(report.sessionData).map(([key, value]) => `
                                <div class="ac-metric-item">
                                    <span class="ac-metric-label">${key}</span>
                                    <span class="ac-metric-value">${typeof value === 'number' ? value.toFixed(2) : value}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="ac-review-actions">
                    <select id="ac-action-select" class="ac-select">
                        <option value="">Select action...</option>
                        <option value="dismiss">Dismiss Report</option>
                        <option value="warning">Issue Warning</option>
                        <option value="ban_24h">24 Hour Ban</option>
                        <option value="ban_7d">7 Day Ban</option>
                        <option value="ban_30d">30 Day Ban</option>
                        <option value="ban_permanent">Permanent Ban</option>
                    </select>
                    <textarea id="ac-reason-input" class="ac-textarea" placeholder="Reason for action (optional)"></textarea>
                    <div class="ac-action-buttons">
                        <button class="ac-btn ac-btn-secondary" id="ac-dismiss-btn">Dismiss</button>
                        <button class="ac-btn ac-btn-primary" id="ac-apply-btn">Apply Action</button>
                    </div>
                </div>
            `;

            // Attach action listeners
            content.querySelector('#ac-dismiss-btn').addEventListener('click', () => {
                this._handleReviewDecision(report.id, 'dismiss', '');
            });

            content.querySelector('#ac-apply-btn').addEventListener('click', () => {
                const action = content.querySelector('#ac-action-select').value;
                const reason = content.querySelector('#ac-reason-input').value;
                if (!action) {
                    this._showToast('Please select an action', 'error');
                    return;
                }
                this._handleReviewDecision(report.id, action, reason);
            });
        }

        /**
         * Handle review decision
         * @param {string} reportId - Report ID
         * @param {string} action - Action
         * @param {string} reason - Reason
         */
        async _handleReviewDecision(reportId, action, reason) {
            try {
                const response = await fetch(`${this.apiBase}/reports/${reportId}/review`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, reason })
                });

                const result = await response.json();
                
                if (result.success) {
                    this.container.querySelector('#ac-review-modal').style.display = 'none';
                    await this.loadReports();
                    this._showToast('Report processed successfully', 'success');
                } else {
                    this._showToast('Failed to process report: ' + result.error, 'error');
                }
            } catch (error) {
                this._showToast('Failed to process report: ' + error.message, 'error');
            }
        }

        /**
         * Open user history modal
         * @param {string} userId - User ID
         */
        async _openUserHistory(userId) {
            try {
                const response = await fetch(`${this.apiBase}/user/${userId}/history`);
                const data = await response.json();
                
                if (data.success) {
                    this._renderUserHistory(data.history);
                    this.container.querySelector('#ac-history-modal').style.display = 'block';
                }
            } catch (error) {
                this._showToast('Failed to load user history', 'error');
            }
        }

        /**
         * Render user history
         * @param {Object} history - History data
         */
        _renderUserHistory(history) {
            const content = this.container.querySelector('#ac-history-content');
            
            content.innerHTML = `
                <div class="ac-history-header">
                    <h3>${history.userId}</h3>
                    <span class="ac-risk-score ac-risk-${history.riskLevel || 'low'}">
                        Risk: ${(history.riskScore || 0).toFixed(2)}
                    </span>
                </div>
                
                <div class="ac-history-section">
                    <h4>Violation Summary</h4>
                    <dl class="ac-dl">
                        <dt>Total Reports</dt>
                        <dd>${history.totalReports || 0}</dd>
                        <dt>Upheld Violations</dt>
                        <dd>${history.upheldViolations || 0}</dd>
                        <dt>Current Status</dt>
                        <dd><span class="ac-status-badge ac-status-${history.currentStatus || 'good'}">${history.currentStatus || 'good'}</span></dd>
                    </dl>
                </div>
                
                ${history.violations && history.violations.length > 0 ? `
                    <div class="ac-history-section">
                        <h4>Violation History</h4>
                        <ul class="ac-history-list">
                            ${history.violations.map(v => `
                                <li>
                                    <span class="ac-violation-type">${v.type}</span>
                                    <span class="ac-violation-action">${v.action}</span>
                                    <span class="ac-violation-date">${new Date(v.date).toLocaleDateString()}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : '<p>No previous violations</p>'}
            `;
        }

        /**
         * Show toast notification
         * @param {string} message - Message
         * @param {string} type - Type
         */
        _showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `ac-toast ac-toast-${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('ac-toast-hide');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }

    // Public API
    return {
        ACDashboard,
        VERSION: '1.0.0'
    };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AntiCheatDashboard;
} else if (typeof window !== 'undefined') {
    window.AntiCheatDashboard = AntiCheatDashboard;
}
