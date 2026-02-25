/**
 * Recommendations API
 * 
 * Provides endpoints for personalized game recommendations,
 * similar games, and recommendation feedback.
 * 
 * @module api/recommendations
 */

const express = require('express');
const router = express.Router();

// Import recommendation service
const RecommendationService = require('../services/recommendationService');
const recommendationEngine = RecommendationService.getInstance();

// Import database
const db = require('../models/database');

/**
 * Middleware to get user from request
 */
async function getUser(req, res, next) {
    const userId = req.headers['x-user-id'] || req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
    }
    req.userId = userId;
    next();
}

/**
 * GET /api/v1/recommendations
 * Get personalized recommendations for user
 */
router.get('/', getUser, async (req, res) => {
    try {
        const { userId } = req;
        const { limit = 10, context = '{}' } = req.query;
        const parsedContext = JSON.parse(context);

        // Get user's play history
        const playHistory = await _getUserPlayHistory(userId);

        // Get recommendations
        const recommendations = await recommendationEngine.getRecommendations(userId, {
            ...parsedContext,
            playedGames: playHistory,
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            recommendations,
            metadata: {
                userId,
                count: recommendations.length,
                generatedAt: Date.now()
            }
        });
    } catch (error) {
        console.error('Recommendations API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get recommendations'
        });
    }
});

/**
 * GET /api/v1/recommendations/game/:gameId/similar
 * Get similar games to a specific game
 */
router.get('/game/:gameId/similar', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { limit = 5 } = req.query;

        const similar = recommendationEngine.getBecauseYouPlayed(gameId, parseInt(limit));

        res.json({
            success: true,
            gameId,
            similar,
            count: similar.length
        });
    } catch (error) {
        console.error('Similar games API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get similar games'
        });
    }
});

/**
 * GET /api/v1/recommendations/user/:userId
 * Get recommendations for a specific user (admin)
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 10 } = req.query;

        const recommendations = await recommendationEngine.getRecommendations(userId, {
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            userId,
            recommendations,
            count: recommendations.length
        });
    } catch (error) {
        console.error('User recommendations API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user recommendations'
        });
    }
});

/**
 * POST /api/v1/recommendations/feedback
 * Submit feedback on a recommendation
 */
router.post('/feedback', getUser, async (req, res) => {
    try {
        const { userId } = req;
        const { gameId, recommendationId, feedbackType, value } = req.body;

        if (!gameId || !feedbackType) {
            return res.status(400).json({
                success: false,
                error: 'gameId and feedbackType required'
            });
        }

        // Record feedback
        const feedback = {
            id: _generateId(),
            userId,
            gameId,
            recommendationId,
            feedbackType, // click, dismiss, play, like, dislike
            value: value || 1,
            timestamp: Date.now()
        };

        // Store feedback in database
        await db.create('recommendation_feedback', feedback);

        // Update collaborative filtering matrix
        if (feedbackType === 'like' || feedbackType === 'play') {
            const rating = feedbackType === 'like' ? 5 : 4;
            recommendationEngine.collaborative.addRating(userId, gameId, rating);
        } else if (feedbackType === 'dislike' || feedbackType === 'dismiss') {
            const rating = feedbackType === 'dislike' ? 1 : 2;
            recommendationEngine.collaborative.addRating(userId, gameId, rating);
        }

        res.json({
            success: true,
            feedback
        });
    } catch (error) {
        console.error('Feedback API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit feedback'
        });
    }
});

/**
 * POST /api/v1/recommendations/cache/clear
 * Clear recommendation cache (admin)
 */
router.post('/cache/clear', async (req, res) => {
    try {
        const { userId } = req.body;

        if (userId) {
            // Clear specific user cache
            recommendationEngine.clearCache(userId);
        } else {
            // Clear all cache
            recommendationEngine.clearCache();
        }

        res.json({
            success: true,
            message: userId ? `Cache cleared for user ${userId}` : 'Cache cleared for all users'
        });
    } catch (error) {
        console.error('Cache clear API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache'
        });
    }
});

/**
 * GET /api/v1/recommendations/stats
 * Get recommendation statistics (admin)
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = {
            collaborative: recommendationEngine.collaborative.getStats(),
            cacheSize: recommendationEngine.recommendationCache.size,
            trendingCount: recommendationEngine.trendingGames.size
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
 * POST /api/v1/recommendations/trending
 * Update trending games (admin)
 */
router.post('/trending', async (req, res) => {
    try {
        const { gameStats } = req.body;

        if (!gameStats || !Array.isArray(gameStats)) {
            return res.status(400).json({
                success: false,
                error: 'gameStats array required'
            });
        }

        recommendationEngine.updateTrending(gameStats);

        res.json({
            success: true,
            message: 'Trending games updated'
        });
    } catch (error) {
        console.error('Trending API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update trending games'
        });
    }
});

/**
 * GET /api/v1/recommendations/game/:gameId/why
 * Get explanation for why a game was recommended
 */
router.get('/game/:gameId/why', getUser, async (req, res) => {
    try {
        const { gameId } = req.params;
        const { userId } = req;

        // Get user's played games
        const playHistory = await _getUserPlayHistory(userId);

        // Find which played games are similar to this one
        const similar = recommendationEngine.contentBased.findSimilarGames(gameId, 10);
        const matchingPlayed = playHistory.filter(played =>
            similar.find(s => s.gameId === played.gameId)
        );

        const reasons = [];

        if (matchingPlayed.length > 0) {
            reasons.push({
                type: 'similar_to_played',
                message: `Similar to games you've played: ${matchingPlayed.slice(0, 3).map(g => g.name).join(', ')}`,
                games: matchingPlayed.slice(0, 3)
            });
        }

        // Check if trending
        if (recommendationEngine.trendingGames.has(gameId)) {
            reasons.push({
                type: 'trending',
                message: 'Popular game right now'
            });
        }

        res.json({
            success: true,
            gameId,
            reasons
        });
    } catch (error) {
        console.error('Why recommended API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get recommendation reasons'
        });
    }
});

/**
 * Helper: Get user's play history
 */
async function _getUserPlayHistory(userId) {
    try {
        // In production, fetch from database
        const sessions = db.find('game_sessions', { userId }) || [];

        // Aggregate by game
        const byGame = {};
        for (const session of sessions) {
            if (!byGame[session.gameId]) {
                byGame[session.gameId] = {
                    gameId: session.gameId,
                    playtime: 0,
                    sessions: 0,
                    completions: 0,
                    lastPlayed: 0
                };
            }
            byGame[session.gameId].playtime += session.duration || 0;
            byGame[session.gameId].sessions++;
            if (session.completed) byGame[session.gameId].completions++;
            byGame[session.gameId].lastPlayed = Math.max(
                byGame[session.gameId].lastPlayed,
                session.timestamp
            );
        }

        return Object.values(byGame);
    } catch (error) {
        console.error('Error getting play history:', error);
        return [];
    }
}

/**
 * Generate unique ID
 */
function _generateId() {
    return 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

module.exports = router;
