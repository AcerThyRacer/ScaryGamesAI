/**
 * Smart Search API with Semantic Search
 * Phase 5: AI-Powered Personalization
 * 
 * Advanced search with typo tolerance, autocomplete, and semantic matching
 * 
 * @module api/smart-search
 */

const express = require('express');
const router = express.Router();
const postgres = require('../models/postgres');

// Simple in-memory search index (in production, use Elasticsearch/Algolia)
const searchIndex = {
  games: [],
  items: [],
  challenges: [],
  lastUpdated: 0
};

/**
 * GET /api/v1/search
 * Main search endpoint with typo tolerance and semantic matching
 */
router.get('/', async (req, res) => {
  try {
    const {
      q,
      type = 'all',
      limit = 20,
      filters = '{}',
      userId
    } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }
    
    const parsedFilters = JSON.parse(filters);
    
    // Perform search
    const results = await performSearch(q, type, parsedFilters, parseInt(limit), userId);
    
    res.json({
      success: true,
      query: q,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search'
    });
  }
});

/**
 * GET /api/v1/search/autocomplete
 * Search autocomplete suggestions
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters'
      });
    }
    
    const suggestions = await getAutocompleteSuggestions(q, parseInt(limit));
    
    res.json({
      success: true,
      query: q,
      suggestions
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    });
  }
});

/**
 * POST /api/v1/search/index/rebuild
 * Rebuild search index (admin)
 */
router.post('/index/rebuild', async (req, res) => {
  try {
    await rebuildSearchIndex();
    
    res.json({
      success: true,
      message: 'Search index rebuilt successfully',
      stats: {
        games: searchIndex.games.length,
        items: searchIndex.items.length,
        challenges: searchIndex.challenges.length,
        lastUpdated: searchIndex.lastUpdated
      }
    });
  } catch (error) {
    console.error('Index rebuild error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rebuild index'
    });
  }
});

/**
 * Perform search with typo tolerance
 */
async function performSearch(query, type, filters, limit, userId) {
  // Ensure index is loaded
  if (searchIndex.games.length === 0) {
    await rebuildSearchIndex();
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  const tokens = normalizedQuery.split(/\s+/);
  
  let results = [];
  
  // Search in appropriate indexes
  if (type === 'all' || type === 'games') {
    const gameResults = searchInIndex(searchIndex.games, tokens, filters);
    results = results.concat(gameResults.map(r => ({ ...r, searchType: 'game' })));
  }
  
  if (type === 'all' || type === 'items') {
    const itemResults = searchInIndex(searchIndex.items, tokens, filters);
    results = results.concat(itemResults.map(r => ({ ...r, searchType: 'item' })));
  }
  
  if (type === 'all' || type === 'challenges') {
    const challengeResults = searchInIndex(searchIndex.challenges, tokens, filters);
    results = results.concat(challengeResults.map(r => ({ ...r, searchType: 'challenge' })));
  }
  
  // Apply personalization boost
  if (userId) {
    results = applyPersonalizationBoost(results, userId);
  }
  
  // Sort by relevance score
  results.sort((a, b) => b.score - a.score);
  
  // Apply limit
  return results.slice(0, limit);
}

/**
 * Search in index with typo tolerance
 */
function searchInIndex(index, tokens, filters) {
  const results = [];
  
  for (const item of index) {
    let score = 0;
    let matchedTokens = 0;
    
    // Check each token
    for (const token of tokens) {
      const tokenScore = calculateTokenMatch(token, item);
      if (tokenScore > 0) {
        score += tokenScore;
        matchedTokens++;
      }
    }
    
    // Skip if no matches
    if (score === 0) continue;
    
    // Apply filter boosts
    if (filters.genres?.length > 0 && item.genres) {
      const genreMatch = filters.genres.some(g => 
        item.genres.some(ig => ig.toLowerCase().includes(g.toLowerCase()))
      );
      if (genreMatch) score *= 1.5;
    }
    
    if (filters.minRating && item.rating) {
      if (item.rating >= filters.minRating) score *= 1.2;
    }
    
    if (filters.maxPrice && item.price) {
      if (item.price <= filters.maxPrice) score *= 1.1;
    }
    
    // Boost by popularity
    if (item.popularity) {
      score *= (1 + Math.log1p(item.popularity) / 10);
    }
    
    // Boost by rating
    if (item.rating) {
      score *= (1 + item.rating / 20);
    }
    
    // Normalize score by number of tokens
    score = score * (matchedTokens / tokens.length);
    
    results.push({
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      score: score,
      matchedTokens,
      metadata: item.metadata || {}
    });
  }
  
  return results;
}

/**
 * Calculate match score for a token
 */
function calculateTokenMatch(token, item) {
  let score = 0;
  
  const searchText = [
    item.name,
    item.description,
    ...(item.genres || []),
    ...(item.tags || []),
    item.category
  ].filter(Boolean).join(' ').toLowerCase();
  
  // Exact match
  if (item.name.toLowerCase() === token) {
    score += 10;
  }
  
  // Starts with
  if (item.name.toLowerCase().startsWith(token)) {
    score += 5;
  }
  
  // Contains
  if (item.name.toLowerCase().includes(token)) {
    score += 3;
  }
  
  // In description
  if (searchText.includes(token)) {
    score += 1;
  }
  
  // Fuzzy match (typo tolerance)
  const fuzzyMatches = findFuzzyMatches(token, searchText);
  score += fuzzyMatches * 0.5;
  
  return score;
}

/**
 * Find fuzzy matches using Levenshtein distance
 */
function findFuzzyMatches(token, text) {
  const words = text.split(/\s+/);
  let matches = 0;
  
  for (const word of words) {
    const distance = levenshteinDistance(token, word);
    
    // Allow 1-2 character differences based on token length
    const maxDistance = token.length <= 4 ? 1 : 2;
    
    if (distance <= maxDistance) {
      matches++;
    }
  }
  
  return matches;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Get autocomplete suggestions
 */
async function getAutocompleteSuggestions(query, limit) {
  const normalizedQuery = query.toLowerCase().trim();
  const suggestions = new Set();
  
  // Search in game names
  for (const game of searchIndex.games) {
    if (game.name.toLowerCase().startsWith(normalizedQuery)) {
      suggestions.add(game.name);
    }
    
    // Also check genres and tags
    if (game.genres) {
      for (const genre of game.genres) {
        if (genre.toLowerCase().startsWith(normalizedQuery)) {
          suggestions.add(genre);
        }
      }
    }
  }
  
  // Search in item names
  for (const item of searchIndex.items) {
    if (item.name.toLowerCase().startsWith(normalizedQuery)) {
      suggestions.add(item.name);
    }
  }
  
  // Add popular searches
  const popularSearches = await getPopularSearches(normalizedQuery);
  popularSearches.forEach(s => suggestions.add(s));
  
  return Array.from(suggestions).slice(0, limit);
}

/**
 * Get popular searches
 */
async function getPopularSearches(query) {
  try {
    const result = await postgres.query(
      `SELECT search_query, COUNT(*) as count
       FROM search_analytics
       WHERE search_query ILIKE $1
       AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY search_query
       ORDER BY count DESC
       LIMIT 5`,
      [`${query}%`]
    );
    
    return result.rows.map(r => r.search_query);
  } catch (error) {
    console.warn('Failed to get popular searches:', error);
    return [];
  }
}

/**
 * Apply personalization boost to results
 */
function applyPersonalizationBoost(results, userId) {
  // This would fetch user preferences and boost accordingly
  // For now, simple implementation
  
  return results.map(result => {
    let boostedScore = result.score;
    
    // Boost based on previous interactions (would come from DB)
    if (result.searchType === 'game') {
      // Example: boost games in preferred genres
      if (result.metadata.genres?.includes('horror')) {
        boostedScore *= 1.2;
      }
    }
    
    return {
      ...result,
      score: boostedScore,
      personalized: boostedScore > result.score
    };
  });
}

/**
 * Rebuild search index
 */
async function rebuildSearchIndex() {
  console.log('[Search] Rebuilding index...');
  
  // Load games
  const gamesResult = await postgres.query(
    `SELECT id, name, description, genre, tags, rating, play_count, 
            release_date, price, image_url
     FROM games
     WHERE is_active = TRUE`
  );
  
  searchIndex.games = gamesResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    genres: row.genre ? [row.genre] : [],
    tags: row.tags || [],
    rating: parseFloat(row.rating) || 0,
    popularity: parseInt(row.play_count) || 0,
    price: parseFloat(row.price) || 0,
    imageUrl: row.image_url,
    metadata: {
      releaseDate: row.release_date,
      genres: row.genre ? [row.genre] : []
    }
  }));
  
  // Load items (cosmetics, etc.)
  const itemsResult = await postgres.query(
    `SELECT id, name, description, category, price, rating, image_url
     FROM store_items
     WHERE is_active = TRUE`
  );
  
  searchIndex.items = itemsResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category,
    rating: parseFloat(row.rating) || 0,
    price: parseFloat(row.price) || 0,
    imageUrl: row.image_url,
    metadata: {
      category: row.category
    }
  }));
  
  // Load challenges
  const challengesResult = await postgres.query(
    `SELECT id, name, description, challenge_type, reward_coins, reward_gems
     FROM challenges
     WHERE is_active = TRUE`
  );
  
  searchIndex.challenges = challengesResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.challenge_type,
    metadata: {
      type: row.challenge_type,
      rewards: {
        coins: row.reward_coins,
        gems: row.reward_gems
      }
    }
  }));
  
  searchIndex.lastUpdated = Date.now();
  
  console.log(`[Search] Index rebuilt: ${searchIndex.games.length} games, ${searchIndex.items.length} items, ${searchIndex.challenges.length} challenges`);
}

/**
 * Initialize search index on startup
 */
async function initSearchIndex() {
  try {
    await rebuildSearchIndex();
    
    // Rebuild index every hour
    setInterval(() => {
      rebuildSearchIndex().catch(console.error);
    }, 3600000);
    
    console.log('[Search] Index initialized');
  } catch (error) {
    console.error('[Search] Failed to initialize index:', error);
  }
}

// Initialize on module load
initSearchIndex();

module.exports = router;
