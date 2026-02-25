/**
 * A/B Testing API
 * 
 * Provides endpoints for experiment management, user assignment,
 * and event tracking.
 * 
 * @module api/ab-testing
 */

const express = require('express');
const router = express.Router();

// Import A/B testing framework
const ABTesting = require('../js/ab-testing');
const abTesting = ABTesting.getInstance();

// Import database
const db = require('../models/database');

/**
 * GET /api/v1/ab/experiments
 * List all experiments
 */
router.get('/experiments', async (req, res) => {
    try {
        const { status, includeResults } = req.query;
        let experiments = abTesting.getExperiments();

        // Filter by status
        if (status) {
            experiments = experiments.filter(e => e.status === status);
        }

        // Optionally include results
        if (includeResults === 'true') {
            experiments = experiments.map(e => ({
                ...e,
                results: e.status === 'completed' ? abTesting.analyzeResults(e.id) : null
            }));
        }

        res.json({
            success: true,
            experiments,
            count: experiments.length
        });
    } catch (error) {
        console.error('List experiments API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list experiments'
        });
    }
});

/**
 * GET /api/v1/ab/experiments/active
 * Get active experiments for user
 */
router.get('/experiments/active', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || req.query.userId;
        const activeExperiments = abTesting.getActiveExperiments();

        // Get user's assignments
        const assignments = activeExperiments.map(exp => ({
            experimentId: exp.id,
            name: exp.name,
            variant: userId ? abTesting.getVariant(exp.id, userId) : null
        }));

        res.json({
            success: true,
            experiments: assignments
        });
    } catch (error) {
        console.error('Active experiments API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get active experiments'
        });
    }
});

/**
 * GET /api/v1/ab/experiments/:id
 * Get experiment details
 */
router.get('/experiments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const experiment = abTesting.getExperiment(id);

        if (!experiment) {
            return res.status(404).json({
                success: false,
                error: 'Experiment not found'
            });
        }

        res.json({
            success: true,
            experiment
        });
    } catch (error) {
        console.error('Get experiment API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get experiment'
        });
    }
});

/**
 * POST /api/v1/ab/experiments
 * Create new experiment (admin)
 */
router.post('/experiments', async (req, res) => {
    try {
        const config = req.body;

        // Validate required fields
        if (!config.name || !config.variants || config.variants.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'name and at least 2 variants required'
            });
        }

        const experiment = abTesting.createExperiment(config);

        // Store in database
        await db.create('ab_experiments', {
            id: experiment.id,
            name: experiment.name,
            description: experiment.description,
            status: experiment.status,
            config: JSON.stringify(experiment),
            createdAt: experiment.createdAt
        });

        res.status(201).json({
            success: true,
            experiment
        });
    } catch (error) {
        console.error('Create experiment API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create experiment'
        });
    }
});

/**
 * PUT /api/v1/ab/experiments/:id
 * Update experiment (admin)
 */
router.put('/experiments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const experiment = abTesting.getExperiment(id);
        if (!experiment) {
            return res.status(404).json({
                success: false,
                error: 'Experiment not found'
            });
        }

        // Apply updates
        Object.assign(experiment, updates);

        res.json({
            success: true,
            experiment
        });
    } catch (error) {
        console.error('Update experiment API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update experiment'
        });
    }
});

/**
 * POST /api/v1/ab/experiments/:id/start
 * Start experiment (admin)
 */
router.post('/experiments/:id/start', async (req, res) => {
    try {
        const { id } = req.params;

        abTesting.startExperiment(id);

        // Update database
        await db.update('ab_experiments', id, {
            status: 'running',
            startedAt: Date.now()
        });

        res.json({
            success: true,
            message: 'Experiment started'
        });
    } catch (error) {
        console.error('Start experiment API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start experiment'
        });
    }
});

/**
 * POST /api/v1/ab/experiments/:id/stop
 * Stop experiment (admin)
 */
router.post('/experiments/:id/stop', async (req, res) => {
    try {
        const { id } = req.params;

        abTesting.stopExperiment(id);

        // Update database
        await db.update('ab_experiments', id, {
            status: 'completed',
            completedAt: Date.now()
        });

        res.json({
            success: true,
            message: 'Experiment stopped'
        });
    } catch (error) {
        console.error('Stop experiment API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop experiment'
        });
    }
});

/**
 * GET /api/v1/ab/experiments/:id/results
 * Get experiment results (admin)
 */
router.get('/experiments/:id/results', async (req, res) => {
    try {
        const { id } = req.params;

        const experiment = abTesting.getExperiment(id);
        if (!experiment) {
            return res.status(404).json({
                success: false,
                error: 'Experiment not found'
            });
        }

        const results = abTesting.analyzeResults(id);

        res.json({
            success: true,
            experimentId: id,
            results
        });
    } catch (error) {
        console.error('Get results API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get results'
        });
    }
});

/**
 * POST /api/v1/ab/experiments/:id/deploy
 * Auto-deploy winner (admin)
 */
router.post('/experiments/:id/deploy', async (req, res) => {
    try {
        const { id } = req.params;
        const { threshold = 0.95 } = req.body;

        const result = abTesting.autoDeploy(id, threshold);

        if (!result) {
            return res.status(400).json({
                success: false,
                error: 'No winner determined yet'
            });
        }

        res.json({
            success: true,
            deployment: result
        });
    } catch (error) {
        console.error('Deploy API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to deploy winner'
        });
    }
});

/**
 * POST /api/v1/ab/assign
 * Get user's variant assignment
 */
router.post('/assign', async (req, res) => {
    try {
        const { experimentId, userId } = req.body;

        if (!experimentId || !userId) {
            return res.status(400).json({
                success: false,
                error: 'experimentId and userId required'
            });
        }

        const variant = abTesting.getVariant(experimentId, userId);

        if (!variant) {
            return res.status(404).json({
                success: false,
                error: 'Not assigned to experiment or experiment not found'
            });
        }

        res.json({
            success: true,
            experimentId,
            userId,
            variant
        });
    } catch (error) {
        console.error('Assign API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get assignment'
        });
    }
});

/**
 * POST /api/v1/ab/events
 * Track conversion event
 */
router.post('/events', async (req, res) => {
    try {
        const { experimentId, userId, variantId, eventName, value } = req.body;

        if (!experimentId || !userId || !eventName) {
            return res.status(400).json({
                success: false,
                error: 'experimentId, userId, and eventName required'
            });
        }

        // Track event
        abTesting.trackEvent(experimentId, userId, eventName, value || 1);

        // Store in database
        await db.create('ab_events', {
            id: _generateId(),
            experimentId,
            userId,
            variantId,
            eventName,
            value: value || 1,
            timestamp: Date.now()
        });

        res.json({
            success: true,
            message: 'Event tracked'
        });
    } catch (error) {
        console.error('Track event API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track event'
        });
    }
});

/**
 * GET /api/v1/ab/stats
 * Get A/B testing statistics (admin)
 */
router.get('/stats', async (req, res) => {
    try {
        const experiments = abTesting.getExperiments();
        const activeCount = abTesting.getActiveExperiments().length;

        const stats = {
            total: experiments.length,
            active: activeCount,
            draft: experiments.filter(e => e.status === 'draft').length,
            completed: experiments.filter(e => e.status === 'completed').length,
            totalEvents: abTesting.events.length
        };

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Stats API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stats'
        });
    }
});

/**
 * Generate unique ID
 */
function _generateId() {
    return 'abe_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

module.exports = router;
