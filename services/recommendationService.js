/**
 * Hybrid Recommendation Engine
 * 
 * Combines collaborative filtering, content-based filtering, and AI-powered
 * recommendations for personalized game suggestions.
 * 
 * @module services/recommendation
 */

const RecommendationService = (function() {
    'use strict';

    /**
     * Collaborative Filtering implementation
     */
    class CollaborativeFilter {
        /**
         * Create collaborative filter
         * @param {Object} config - Configuration
         */
        constructor(config = {}) {
            this.userItemMatrix = new Map(); // userId -> { gameId: rating }
            this.itemUserMatrix = new Map(); // gameId -> { userId: rating }
            this.userSimilarityCache = new Map();
            this.minSimilarUsers = config.minSimilarUsers || 3;
        }

        /**
         * Add rating to matrix
         * @param {string} userId - User ID
         * @param {string} gameId - Game ID
         * @param {number} rating - Rating (0-5)
         */
        addRating(userId, gameId, rating) {
            // Update user-item matrix
            if (!this.userItemMatrix.has(userId)) {
                this.userItemMatrix.set(userId, {});
            }
            this.userItemMatrix.get(userId)[gameId] = rating;

            // Update item-user matrix
            if (!this.itemUserMatrix.has(gameId)) {
                this.itemUserMatrix.set(gameId, {});
            }
            this.itemUserMatrix.get(gameId)[userId] = rating;

            // Invalidate cache
            this.userSimilarityCache.clear();
        }

        /**
         * Build matrix from play history
         * @param {Array} playHistory - Play history records
         */
        buildFromPlayHistory(playHistory) {
            for (const record of playHistory) {
                const rating = this._calculateRating(record);
                this.addRating(record.userId, record.gameId, rating);
            }
        }

        /**
         * Calculate rating from play metrics
         * @param {Object} record - Play record
         * @returns {number} Rating
         */
        _calculateRating(record) {
            const { playtime = 0, completions = 0, rating = 0, returns = 0 } = record;
            
            // Normalize playtime (assume 60 min max)
            const playtimeScore = Math.min(playtime / 60, 1);
            
            // Completion bonus
            const completionScore = Math.min(completions / 3, 1);
            
            // Return visits indicate enjoyment
            const returnScore = Math.min(returns / 5, 1);

            // Weighted combination
            const calculated = (playtimeScore * 0.3) + (completionScore * 0.4) + (returnScore * 0.3);
            
            // If explicit rating exists, use weighted average
            if (rating > 0) {
                return (calculated * 0.4) + ((rating / 5) * 0.6);
            }

            return calculated * 5; // Scale to 0-5
        }

        /**
         * Find similar users using cosine similarity
         * @param {string} targetUserId - Target user ID
         * @param {number} k - Number of similar users to find
         * @returns {Array} Similar users with similarity scores
         */
        findSimilarUsers(targetUserId, k = 10) {
            const cacheKey = `similar_${targetUserId}_${k}`;
            if (this.userSimilarityCache.has(cacheKey)) {
                return this.userSimilarityCache.get(cacheKey);
            }

            const targetRatings = this.userItemMatrix.get(targetUserId);
            if (!targetRatings) return [];

            const similarities = [];

            for (const [userId, ratings] of this.userItemMatrix) {
                if (userId === targetUserId) continue;

                const similarity = this._cosineSimilarity(targetRatings, ratings);
                if (similarity > 0) {
                    similarities.push({ userId, similarity });
                }
            }

            // Sort by similarity and take top k
            const sorted = similarities.sort((a, b) => b.similarity - a.similarity).slice(0, k);
            this.userSimilarityCache.set(cacheKey, sorted);

            return sorted;
        }

        /**
         * Calculate cosine similarity between two rating vectors
         * @param {Object} vec1 - First vector
         * @param {Object} vec2 - Second vector
         * @returns {number} Similarity (0-1)
         */
        _cosineSimilarity(vec1, vec2) {
            const commonItems = Object.keys(vec1).filter(item => item in vec2);
            if (commonItems.length < 2) return 0; // Need at least 2 common items

            let dotProduct = 0;
            let norm1 = 0;
            let norm2 = 0;

            for (const item of commonItems) {
                dotProduct += vec1[item] * vec2[item];
                norm1 += vec1[item] * vec1[item];
                norm2 += vec2[item] * vec2[item];
            }

            if (norm1 === 0 || norm2 === 0) return 0;

            return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
        }

        /**
         * Generate recommendations for user
         * @param {string} userId - User ID
         * @param {number} limit - Max recommendations
         * @returns {Array} Recommendations
         */
        recommendForUser(userId, limit = 10) {
            const similarUsers = this.findSimilarUsers(userId, this.minSimilarUsers + 5);
            if (similarUsers.length < this.minSimilarUsers) {
                // Not enough similar users, return popular games
                return this._getPopularGames(limit);
            }

            const userRatings = this.userItemMatrix.get(userId) || {};
            const recommendations = new Map();

            // Aggregate games from similar users
            for (const { userId: similarId, similarity } of similarUsers) {
                const similarRatings = this.userItemMatrix.get(similarId);
                for (const [gameId, rating] of Object.entries(similarRatings)) {
                    // Skip games user has already played
                    if (gameId in userRatings) continue;

                    const current = recommendations.get(gameId) || { score: 0, count: 0 };
                    current.score += similarity * rating;
                    current.count += 1;
                    recommendations.set(gameId, current);
                }
            }

            // Convert to array and sort
            const results = Array.from(recommendations.entries())
                .map(([gameId, data]) => ({
                    gameId,
                    score: data.score / data.count, // Average weighted score
                    confidence: Math.min(data.count / similarUsers.length, 1),
                    source: 'collaborative'
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            return results;
        }

        /**
         * Get popular games as fallback
         * @param {number} limit - Max games
         * @returns {Array} Popular games
         */
        _getPopularGames(limit) {
            const gameScores = [];

            for (const [gameId, userRatings] of this.itemUserMatrix) {
                const ratings = Object.values(userRatings);
                if (ratings.length < 3) continue; // Need minimum ratings

                const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                gameScores.push({
                    gameId,
                    score: avgRating,
                    confidence: Math.min(ratings.length / 100, 1),
                    source: 'popular'
                });
            }

            return gameScores.sort((a, b) => b.score - a.score).slice(0, limit);
        }

        /**
         * Get matrix statistics
         * @returns {Object} Stats
         */
        getStats() {
            return {
                users: this.userItemMatrix.size,
                items: this.itemUserMatrix.size,
                ratings: Array.from(this.userItemMatrix.values())
                    .reduce((sum, ratings) => sum + Object.keys(ratings).length, 0)
            };
        }
    }

    /**
     * Content-Based Filtering implementation
     */
    class ContentBasedFilter {
        /**
         * Create content-based filter
         * @param {Object} config - Configuration
         */
        constructor(config = {}) {
            this.gameFeatures = new Map(); // gameId -> feature vector
            this.gameMetadata = new Map(); // gameId -> metadata
            this.featureWeights = config.featureWeights || {
                genre: 0.25,
                difficulty: 0.1,
                horrorType: 0.25,
                mechanics: 0.15,
                duration: 0.1,
                rating: 0.1,
                tags: 0.05
            };
        }

        /**
         * Add game with features
         * @param {string} gameId - Game ID
         * @param {Object} metadata - Game metadata
         */
        addGame(gameId, metadata) {
            const features = this._extractFeatures(metadata);
            this.gameFeatures.set(gameId, features);
            this.gameMetadata.set(gameId, metadata);
        }

        /**
         * Extract feature vector from metadata
         * @param {Object} metadata - Game metadata
         * @returns {Object} Feature vector
         */
        _extractFeatures(metadata) {
            return {
                genre: this._encodeGenre(metadata.genre || []),
                difficulty: (metadata.difficulty || 5) / 10,
                horrorType: this._encodeHorrorType(metadata.tags || []),
                mechanics: this._encodeMechanics(metadata.mechanics || []),
                duration: Math.min((metadata.avgDuration || 30) / 60, 1),
                rating: (metadata.rating || 3) / 5,
                tags: this._encodeTags(metadata.tags || [])
            };
        }

        /**
         * Encode genre to one-hot vector
         * @param {Array} genres - Genre list
         * @returns {Object} One-hot vector
         */
        _encodeGenre(genres) {
            const allGenres = ['action', 'puzzle', 'strategy', 'survival', 'fps', 'platformer', 'horror', 'adventure'];
            const vector = {};
            for (const genre of allGenres) {
                vector[genre] = genres.includes(genre) ? 1 : 0;
            }
            return vector;
        }

        /**
         * Encode horror types
         * @param {Array} tags - Tags
         * @returns {Object} Horror type vector
         */
        _encodeHorrorType(tags) {
            const horrorTypes = ['psychological', 'jumpscare', 'gore', 'supernatural', 'survival', 'stealth'];
            const vector = {};
            for (const type of horrorTypes) {
                vector[type] = tags.some(t => t.toLowerCase().includes(type)) ? 1 : 0;
            }
            return vector;
        }

        /**
         * Encode mechanics
         * @param {Array} mechanics - Mechanics list
         * @returns {Object} Mechanics vector
         */
        _encodeMechanics(mechanics) {
            const allMechanics = ['combat', 'exploration', 'puzzle_solving', 'stealth', 'resource_management', 'crafting', 'base_building'];
            const vector = {};
            for (const mech of allMechanics) {
                vector[mech] = mechanics.includes(mech) ? 1 : 0;
            }
            return vector;
        }

        /**
         * Encode tags to simple count
         * @param {Array} tags - Tags
         * @returns {number} Tag count normalized
         */
        _encodeTags(tags) {
            return Math.min(tags.length / 10, 1);
        }

        /**
         * Find similar games
         * @param {string} gameId - Game ID
         * @param {number} limit - Max results
         * @returns {Array} Similar games
         */
        findSimilarGames(gameId, limit = 5) {
            const targetFeatures = this.gameFeatures.get(gameId);
            if (!targetFeatures) return [];

            const similarities = [];

            for (const [id, features] of this.gameFeatures) {
                if (id === gameId) continue;

                const similarity = this._weightedCosineSimilarity(targetFeatures, features);
                similarities.push({ gameId: id, similarity });
            }

            return similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
        }

        /**
         * Calculate weighted cosine similarity
         * @param {Object} vec1 - First vector
         * @param {Object} vec2 - Second vector
         * @returns {number} Similarity
         */
        _weightedCosineSimilarity(vec1, vec2) {
            let totalSimilarity = 0;
            let totalWeight = 0;

            for (const [feature, weight] of Object.entries(this.featureWeights)) {
                const v1 = vec1[feature];
                const v2 = vec2[feature];

                if (typeof v1 === 'object' && typeof v2 === 'object') {
                    // Vector feature (genre, mechanics, etc.)
                    totalSimilarity += weight * this._cosineSimilarity(v1, v2);
                } else if (typeof v1 === 'number' && typeof v2 === 'number') {
                    // Scalar feature (difficulty, duration, etc.)
                    totalSimilarity += weight * (1 - Math.abs(v1 - v2));
                }
                totalWeight += weight;
            }

            return totalWeight > 0 ? totalSimilarity / totalWeight : 0;
        }

        /**
         * Cosine similarity for vector features
         * @param {Object} vec1 - First vector
         * @param {Object} vec2 - Second vector
         * @returns {number} Similarity
         */
        _cosineSimilarity(vec1, vec2) {
            const keys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
            let dotProduct = 0;
            let norm1 = 0;
            let norm2 = 0;

            for (const key of keys) {
                const v1 = vec1[key] || 0;
                const v2 = vec2[key] || 0;
                dotProduct += v1 * v2;
                norm1 += v1 * v1;
                norm2 += v2 * v2;
            }

            if (norm1 === 0 || norm2 === 0) return 0;
            return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
        }

        /**
         * Recommend based on play history
         * @param {string} userId - User ID
         * @param {Array} playedGames - Played games with metadata
         * @param {number} limit - Max recommendations
         * @returns {Array} Recommendations
         */
        recommendBasedOnHistory(userId, playedGames, limit = 10) {
            if (playedGames.length === 0) {
                return this._getTopRatedGames(limit);
            }

            const allSimilar = [];
            const playedIds = new Set(playedGames.map(g => g.gameId));

            for (const game of playedGames) {
                const similar = this.findSimilarGames(game.gameId, 5);
                for (const s of similar) {
                    if (playedIds.has(s.gameId)) continue;

                    const existing = allSimilar.find(x => x.gameId === s.gameId);
                    if (existing) {
                        existing.similarity += s.similarity;
                        existing.count++;
                    } else {
                        allSimilar.push({ ...s, count: 1 });
                    }
                }
            }

            return allSimilar
                .map(s => ({
                    gameId: s.gameId,
                    score: s.similarity / s.count,
                    confidence: Math.min(s.count / playedGames.length, 1),
                    source: 'content'
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        }

        /**
         * Get top rated games as fallback
         * @param {number} limit - Max games
         * @returns {Array} Top rated games
         */
        _getTopRatedGames(limit) {
            const games = [];
            for (const [gameId, metadata] of this.gameMetadata) {
                games.push({
                    gameId,
                    score: metadata.rating || 3,
                    confidence: 0.5,
                    source: 'top_rated'
                });
            }
            return games.sort((a, b) => b.score - a.score).slice(0, limit);
        }
    }

    /**
     * Hybrid Recommendation Engine
     */
    class HybridRecommendationEngine {
        /**
         * Create hybrid engine
         * @param {Object} config - Configuration
         */
        constructor(config = {}) {
            this.collaborative = new CollaborativeFilter(config.collaborative);
            this.contentBased = new ContentBasedFilter(config.contentBased);
            this.trendingGames = new Map();
            this.recommendationCache = new Map();
            this.cacheExpiry = config.cacheExpiry || 3600000; // 1 hour

            // Weights for hybrid combination
            this.weights = {
                collaborative: 0.35,
                content: 0.35,
                trending: 0.15,
                ai: 0.15
            };
        }

        /**
         * Get personalized recommendations
         * @param {string} userId - User ID
         * @param {Object} context - Context
         * @returns {Promise<Array>} Recommendations
         */
        async getRecommendations(userId, context = {}) {
            const cacheKey = `rec_${userId}_${JSON.stringify(context)}`;
            const cached = this.recommendationCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.recommendations;
            }

            // Get recommendations from each source
            const [collaborative, content, trending, ai] = await Promise.all([
                this._getCollaborative(userId, context),
                this._getContent(userId, context),
                this._getTrending(context),
                this._getAI(userId, context)
            ]);

            // Combine recommendations
            const combined = this._combineRecommendations([
                { source: 'collaborative', recs: collaborative, weight: this.weights.collaborative },
                { source: 'content', recs: content, weight: this.weights.content },
                { source: 'trending', recs: trending, weight: this.weights.trending },
                { source: 'ai', recs: ai, weight: this.weights.ai }
            ]);

            // Add diversity
            const diversified = this._addDiversity(combined, context);

            // Cache result
            this.recommendationCache.set(cacheKey, {
                recommendations: diversified,
                timestamp: Date.now()
            });

            return diversified;
        }

        /**
         * Get collaborative recommendations
         * @param {string} userId - User ID
         * @param {Object} context - Context
         * @returns {Array} Recommendations
         */
        _getCollaborative(userId, context) {
            return this.collaborative.recommendForUser(userId, 15);
        }

        /**
         * Get content-based recommendations
         * @param {string} userId - User ID
         * @param {Object} context - Context
         * @returns {Promise<Array>} Recommendations
         */
        async _getContent(userId, context) {
            const playedGames = context.playedGames || await this._getUserPlayedGames(userId);
            return this.contentBased.recommendBasedOnHistory(userId, playedGames, 15);
        }

        /**
         * Get trending games
         * @param {Object} context - Context
         * @returns {Array} Trending games
         */
        _getTrending(context) {
            const trending = Array.from(this.trendingGames.entries())
                .map(([gameId, score]) => ({
                    gameId,
                    score,
                    confidence: 0.7,
                    source: 'trending'
                }))
                .sort((a, b) => b.score - a.score);

            return trending.slice(0, 10);
        }

        /**
         * Get AI-powered recommendations
         * @param {string} userId - User ID
         * @param {Object} context - Context
         * @returns {Promise<Array>} AI recommendations
         */
        async _getAI(userId, context) {
            // This would integrate with aiService.js
            // For now, return empty array
            return [];
        }

        /**
         * Get user's played games
         * @param {string} userId - User ID
         * @returns {Promise<Array>} Played games
         */
        async _getUserPlayedGames(userId) {
            // This would fetch from backend
            // For now, return empty array
            return [];
        }

        /**
         * Combine recommendations from multiple sources
         * @param {Array} sources - Source recommendations
         * @returns {Array} Combined recommendations
         */
        _combineRecommendations(sources) {
            const combined = new Map();

            for (const { source, recs, weight } of sources) {
                for (const rec of recs) {
                    const gameId = rec.gameId;
                    const current = combined.get(gameId) || {
                        gameId,
                        score: 0,
                        sources: [],
                        sourceScores: {}
                    };

                    current.score += rec.score * weight;
                    current.sources.push(source);
                    current.sourceScores[source] = rec.score;
                    current.confidence = rec.confidence;

                    combined.set(gameId, current);
                }
            }

            return Array.from(combined.values())
                .sort((a, b) => b.score - a.score);
        }

        /**
         * Add diversity to recommendations
         * @param {Array} recommendations - Recommendations
         * @param {Object} context - Context
         * @returns {Array} Diversified recommendations
         */
        _addDiversity(recommendations, context) {
            // Ensure mix of genres, difficulties, etc.
            const result = [];
            const usedGenres = new Set();
            const usedDifficulties = new Set();

            for (const rec of recommendations) {
                const metadata = this.contentBased.gameMetadata.get(rec.gameId);
                if (!metadata) {
                    result.push(rec);
                    continue;
                }

                const genres = metadata.genre || [];
                const difficulty = metadata.difficulty || 5;

                // Check if this adds diversity
                const newGenre = genres.some(g => !usedGenres.has(g));
                const newDifficulty = !usedDifficulties.has(difficulty);

                if (newGenre || newDifficulty || result.length < 3) {
                    result.push(rec);
                    genres.forEach(g => usedGenres.add(g));
                    usedDifficulties.add(difficulty);
                }
            }

            // Fill remaining slots
            const remaining = recommendations.filter(r => !result.find(x => x.gameId === r.gameId));
            result.push(...remaining.slice(0, 10 - result.length));

            return result;
        }

        /**
         * Update trending games
         * @param {Array} gameStats - Game statistics
         */
        updateTrending(gameStats) {
            for (const stat of gameStats) {
                const { gameId, playCount, recentGrowth } = stat;
                const score = (playCount * 0.7) + (recentGrowth * 0.3);
                this.trendingGames.set(gameId, score);
            }
        }

        /**
         * Clear cache
         */
        clearCache() {
            this.recommendationCache.clear();
        }

        /**
         * Get "Because you played X" recommendations
         * @param {string} gameId - Game ID
         * @param {number} limit - Max results
         * @returns {Array} Similar games
         */
        getBecauseYouPlayed(gameId, limit = 5) {
            return this.contentBased.findSimilarGames(gameId, limit);
        }
    }

    // Singleton instance
    let instance = null;

    /**
     * Get or create recommendation engine instance
     * @param {Object} config - Configuration
     * @returns {HybridRecommendationEngine} Instance
     */
    function getInstance(config) {
        if (!instance) {
            instance = new HybridRecommendationEngine(config);
        }
        return instance;
    }

    // Public API
    return {
        CollaborativeFilter,
        ContentBasedFilter,
        HybridRecommendationEngine,
        getInstance,
        VERSION: '1.0.0'
    };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecommendationService;
} else if (typeof window !== 'undefined') {
    window.RecommendationService = RecommendationService;
}
