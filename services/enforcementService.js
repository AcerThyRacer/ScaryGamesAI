/**
 * Enforcement Service
 * 
 * Handles automatic ban escalation, warnings, and enforcement actions
 * based on cheat detection reports and user violation history.
 * 
 * @module services/enforcement
 */

const EnforcementService = (function() {
    'use strict';

    // Escalation tiers
    const ESCALATION_TIERS = [
        { level: 1, action: 'warning', threshold: 1, duration: null },
        { level: 2, action: 'temporary_ban_24h', threshold: 2, duration: 24 * 60 * 60 * 1000 },
        { level: 3, action: 'temporary_ban_7d', threshold: 3, duration: 7 * 24 * 60 * 60 * 1000 },
        { level: 4, action: 'temporary_ban_30d', threshold: 4, duration: 30 * 24 * 60 * 60 * 1000 },
        { level: 5, action: 'permanent_ban', threshold: 5, duration: null }
    ];

    // Violation types and their severity
    const VIOLATION_SEVERITY = {
        behavioral_anomaly: 'medium',
        score_validation: 'medium',
        pattern_match: 'high',
        aimbot: 'critical',
        wallhack: 'high',
        speedhack: 'high',
        noclip: 'high',
        triggerbot: 'medium',
        stat_manipulation: 'critical',
        manual_report: 'low',
        admin_action: 'critical'
    };

    /**
     * Enforcement Service class
     */
    class EnforcementServiceClass {
        /**
         * Create enforcement service
         * @param {Object} config - Configuration
         */
        constructor(config = {}) {
            this.violations = new Map(); // userId -> [violations]
            this.bans = new Map(); // userId -> ban info
            this.warnings = new Map(); // userId -> [warnings]
            this.escalationTiers = config.escalationTiers || ESCALATION_TIERS;
            this.autoEnforce = config.autoEnforce !== false;
            this.notifyCallback = config.notifyCallback || null;
        }

        /**
         * Process a violation report
         * @param {Object} violation - Violation data
         * @returns {Promise<Object>} Enforcement result
         */
        async processViolation(violation) {
            const {
                userId,
                gameId,
                reportType,
                severity,
                evidence,
                timestamp = Date.now()
            } = violation;

            // Record violation
            const recordedViolation = this._recordViolation(userId, {
                gameId,
                reportType,
                severity: severity || VIOLATION_SEVERITY[reportType] || 'medium',
                evidence,
                timestamp
            });

            // Get violation count
            const violationCount = this.getViolationCount(userId);
            const recentViolations = this.getRecentViolations(userId, 30 * 24 * 60 * 60 * 1000);

            // Determine escalation tier
            const tier = this._getEscalationTier(violationCount, recentViolations.length);

            // Apply enforcement if auto-enforce is enabled
            let enforcementResult = null;
            if (this.autoEnforce && tier && tier.level > 0) {
                enforcementResult = await this._applyEnforcement(userId, tier, recordedViolation);
            }

            // Notify if callback provided
            if (this.notifyCallback) {
                await this.notifyCallback({
                    type: 'violation_processed',
                    userId,
                    violation: recordedViolation,
                    enforcement: enforcementResult
                });
            }

            return {
                violationId: recordedViolation.id,
                violationCount,
                tier: tier?.level || 0,
                enforcement: enforcementResult
            };
        }

        /**
         * Record a violation
         * @param {string} userId - User ID
         * @param {Object} violation - Violation data
         * @returns {Object} Recorded violation
         */
        _recordViolation(userId, violation) {
            const recorded = {
                id: this._generateId(),
                userId,
                ...violation,
                reviewed: false,
                reviewedBy: null,
                reviewedAt: null
            };

            // Store in memory
            if (!this.violations.has(userId)) {
                this.violations.set(userId, []);
            }
            this.violations.get(userId).push(recorded);

            return recorded;
        }

        /**
         * Get violation count for user
         * @param {string} userId - User ID
         * @returns {number} Violation count
         */
        getViolationCount(userId) {
            const userViolations = this.violations.get(userId);
            return userViolations ? userViolations.length : 0;
        }

        /**
         * Get recent violations
         * @param {string} userId - User ID
         * @param {number} window - Time window in ms
         * @returns {Array} Recent violations
         */
        getRecentViolations(userId, window = 30 * 24 * 60 * 60 * 1000) {
            const userViolations = this.violations.get(userId);
            if (!userViolations) return [];

            const now = Date.now();
            return userViolations.filter(v => now - v.timestamp < window);
        }

        /**
         * Get escalation tier based on violations
         * @param {number} totalCount - Total violation count
         * @param {number} recentCount - Recent violation count
         * @returns {Object|null} Escalation tier
         */
        _getEscalationTier(totalCount, recentCount) {
            // Use recent count for escalation (last 30 days)
            const count = Math.max(totalCount, recentCount);

            // Find appropriate tier
            for (let i = this.escalationTiers.length - 1; i >= 0; i--) {
                if (count >= this.escalationTiers[i].threshold) {
                    return this.escalationTiers[i];
                }
            }

            return null;
        }

        /**
         * Apply enforcement action
         * @param {string} userId - User ID
         * @param {Object} tier - Escalation tier
         * @param {Object} violation - Triggering violation
         * @returns {Promise<Object>} Enforcement result
         */
        async _applyEnforcement(userId, tier, violation) {
            const enforcement = {
                id: this._generateId(),
                userId,
                actionType: tier.action,
                reason: `Automatic enforcement - ${tier.action}`,
                violationId: violation.id,
                duration: tier.duration,
                createdAt: Date.now(),
                createdBy: 'system',
                expiresAt: tier.duration ? Date.now() + tier.duration : null
            };

            // Apply the enforcement
            switch (tier.action) {
                case 'warning':
                    await this._sendWarning(userId, tier, violation);
                    break;
                case 'temporary_ban_24h':
                case 'temporary_ban_7d':
                case 'temporary_ban_30d':
                    await this._temporaryBan(userId, tier.duration, tier.action);
                    break;
                case 'permanent_ban':
                    await this._permanentBan(userId, 'Repeated violations');
                    break;
            }

            // Store enforcement record
            this.bans.set(userId, enforcement);

            return enforcement;
        }

        /**
         * Send warning to user
         * @param {string} userId - User ID
         * @param {Object} tier - Tier info
         * @param {Object} violation - Violation
         */
        async _sendWarning(userId, tier, violation) {
            const warning = {
                id: this._generateId(),
                userId,
                message: this._getWarningMessage(tier, violation),
                tier: tier.level,
                createdAt: Date.now()
            };

            if (!this.warnings.has(userId)) {
                this.warnings.set(userId, []);
            }
            this.warnings.get(userId).push(warning);
        }

        /**
         * Get warning message
         * @param {Object} tier - Tier
         * @param {Object} violation - Violation
         * @returns {string} Warning message
         */
        _getWarningMessage(tier, violation) {
            const messages = {
                1: `Warning: Unusual activity detected in ${violation.gameId}. Please review our fair play policy. Further violations will result in temporary bans.`,
                2: `Second violation detected. Your account has been temporarily banned for 24 hours. Please review our fair play policy.`,
                3: `Third violation detected. Your account has been banned for 7 days. Continued violations will result in permanent ban.`,
                4: `Fourth violation detected. Your account has been banned for 30 days. This is your final warning.`,
                5: `Multiple violations detected. Your account has been permanently banned.`
            };
            return messages[tier.level] || messages[1];
        }

        /**
         * Apply temporary ban
         * @param {string} userId - User ID
         * @param {number} duration - Duration in ms
         * @param {string} type - Ban type
         */
        async _temporaryBan(userId, duration, type) {
            // In production, this would update the database
            // and invalidate user sessions
            console.log(`Temporary ban applied to ${userId}: ${type}`);
        }

        /**
         * Apply permanent ban
         * @param {string} userId - User ID
         * @param {string} reason - Reason
         */
        async _permanentBan(userId, reason) {
            // In production, this would update the database
            // and permanently disable the account
            console.log(`Permanent ban applied to ${userId}: ${reason}`);
        }

        /**
         * Check if user is banned
         * @param {string} userId - User ID
         * @returns {Object} Ban status
         */
        checkBanStatus(userId) {
            const ban = this.bans.get(userId);
            if (!ban) {
                return { banned: false };
            }

            const now = Date.now();
            if (ban.actionType === 'permanent_ban') {
                return {
                    banned: true,
                    permanent: true,
                    reason: ban.reason,
                    expiresAt: null
                };
            }

            if (ban.expiresAt && now < ban.expiresAt) {
                return {
                    banned: true,
                    permanent: false,
                    reason: ban.reason,
                    expiresAt: ban.expiresAt,
                    remainingMs: ban.expiresAt - now
                };
            }

            // Ban has expired
            return { banned: false, expired: true };
        }

        /**
         * Review a violation (admin action)
         * @param {string} violationId - Violation ID
         * @param {Object} review - Review data
         * @returns {Object} Review result
         */
        reviewViolation(violationId, review) {
            const { reviewedBy, decision, notes } = review;

            // Find violation
            for (const [userId, violations] of this.violations.entries()) {
                const violation = violations.find(v => v.id === violationId);
                if (violation) {
                    violation.reviewed = true;
                    violation.reviewedBy = reviewedBy;
                    violation.reviewedAt = Date.now();
                    violation.decision = decision; // upheld, dismissed, escalated
                    violation.notes = notes;

                    // If escalated, process additional enforcement
                    if (decision === 'escalated') {
                        const newSeverity = review.newSeverity || 'critical';
                        violation.severity = newSeverity;
                        return this.processViolation({
                            userId,
                            gameId: violation.gameId,
                            reportType: violation.reportType,
                            severity: newSeverity,
                            evidence: violation.evidence
                        });
                    }

                    return { success: true, violation };
                }
            }

            return { success: false, error: 'Violation not found' };
        }

        /**
         * Manual enforcement action (admin)
         * @param {string} userId - User ID
         * @param {Object} action - Action data
         * @returns {Promise<Object>} Enforcement result
         */
        async manualEnforcement(userId, action) {
            const { actionType, reason, duration, adminId } = action;

            const enforcement = {
                id: this._generateId(),
                userId,
                actionType,
                reason: reason || 'Manual enforcement',
                duration: duration || null,
                createdAt: Date.now(),
                createdBy: adminId || 'admin',
                expiresAt: duration ? Date.now() + duration : null,
                manual: true
            };

            // Apply enforcement
            switch (actionType) {
                case 'warning':
                    this.warnings.set(userId, [...(this.warnings.get(userId) || []), enforcement]);
                    break;
                case 'temporary_ban':
                    this.bans.set(userId, enforcement);
                    break;
                case 'permanent_ban':
                    this.bans.set(userId, enforcement);
                    break;
            }

            if (this.notifyCallback) {
                await this.notifyCallback({
                    type: 'manual_enforcement',
                    userId,
                    enforcement
                });
            }

            return enforcement;
        }

        /**
         * Appeal a ban
         * @param {string} userId - User ID
         * @param {string} reason - Appeal reason
         * @returns {Object} Appeal result
         */
        submitAppeal(userId, reason) {
            const ban = this.bans.get(userId);
            if (!ban) {
                return { success: false, error: 'No ban found' };
            }

            const appeal = {
                id: this._generateId(),
                userId,
                banId: ban.id,
                reason,
                status: 'pending',
                submittedAt: Date.now()
            };

            // In production, store in database and notify admins
            console.log(`Appeal submitted by ${userId}: ${reason}`);

            return { success: true, appeal };
        }

        /**
         * Get enforcement statistics
         * @returns {Object} Statistics
         */
        getStats() {
            const allViolations = Array.from(this.violations.values()).flat();
            const allBans = Array.from(this.bans.values());
            const allWarnings = Array.from(this.warnings.values()).flat();

            const byType = {};
            const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };

            for (const v of allViolations) {
                byType[v.reportType] = (byType[v.reportType] || 0) + 1;
                bySeverity[v.severity]++;
            }

            return {
                totalViolations: allViolations.length,
                totalBans: allBans.length,
                totalWarnings: allWarnings.length,
                byType,
                bySeverity,
                activeBans: allBans.filter(b => !b.expiresAt || Date.now() < b.expiresAt).length,
                usersWithViolations: this.violations.size
            };
        }

        /**
         * Generate unique ID
         * @returns {string} Unique ID
         */
        _generateId() {
            return 'enf_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
        }

        /**
         * Clear old data
         * @param {number} maxAge - Max age in ms
         */
        clearOldData(maxAge = 90 * 24 * 60 * 60 * 1000) {
            const now = Date.now();

            // Clear old violations
            for (const [userId, violations] of this.violations.entries()) {
                const filtered = violations.filter(v => now - v.timestamp < maxAge);
                if (filtered.length === 0) {
                    this.violations.delete(userId);
                } else {
                    this.violations.set(userId, filtered);
                }
            }

            // Clear expired bans
            for (const [userId, ban] of this.bans.entries()) {
                if (ban.expiresAt && now > ban.expiresAt && ban.actionType !== 'permanent_ban') {
                    this.bans.delete(userId);
                }
            }
        }
    }

    // Singleton instance
    let instance = null;

    /**
     * Get or create enforcement service instance
     * @param {Object} config - Configuration
     * @returns {EnforcementServiceClass} Instance
     */
    function getInstance(config) {
        if (!instance) {
            instance = new EnforcementServiceClass(config);
        }
        return instance;
    }

    // Public API
    return {
        EnforcementService: EnforcementServiceClass,
        ESCALATION_TIERS,
        VIOLATION_SEVERITY,
        getInstance,
        VERSION: '1.0.0'
    };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnforcementService;
} else if (typeof window !== 'undefined') {
    window.EnforcementService = EnforcementService;
}
