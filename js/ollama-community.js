/* ============================================
   Community Module - Phase 4
   Public gallery, ratings, reviews, remixing
   ============================================ */

// Local community storage (would be server-side in production)
const COMMUNITY_STORAGE_KEY = 'sgai-community-games';
const RATINGS_KEY = 'sgai-ratings';
const REMIXES_KEY = 'sgai-remixes';

const CommunityModule = {
    // Get community games (mock data for demo)
    async getCommunityGames(options = {}) {
        const { 
            page = 1, 
            limit = 20, 
            sort = 'popular',
            category = 'all',
            search = ''
        } = options;

        // Get community games from localStorage
        const communityGames = this.getCommunityGamesLocal();
        
        // Filter by category
        let filtered = category === 'all' 
            ? communityGames 
            : communityGames.filter(g => g.category === category);
        
        // Filter by search
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(g => 
                g.title.toLowerCase().includes(searchLower) ||
                g.description.toLowerCase().includes(searchLower)
            );
        }
        
        // Sort
        switch(sort) {
            case 'popular':
                filtered.sort((a, b) => (b.plays || 0) - (a.plays || 0));
                break;
            case 'newest':
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'rating':
                filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
                break;
            case 'remixes':
                filtered.sort((a, b) => (b.remixCount || 0) - (a.remixCount || 0));
                break;
        }
        
        // Paginate
        const start = (page - 1) * limit;
        const end = start + limit;
        const games = filtered.slice(start, end);
        
        return {
            games,
            total: filtered.length,
            page,
            totalPages: Math.ceil(filtered.length / limit),
            hasMore: end < filtered.length
        };
    },

    // Get community games from localStorage
    getCommunityGamesLocal() {
        try {
            return JSON.parse(localStorage.getItem(COMMUNITY_STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    },

    // Publish game to community
    publishToCommunity(game, options = {}) {
        const communityGame = {
            id: 'community_' + Date.now(),
            originalId: game.id,
            title: game.title,
            description: game.description,
            html: game.html,
            category: game.category || 'horror',
            author: localStorage.getItem('sgai-username') || 'Anonymous',
            authorId: localStorage.getItem('sgai-user-id') || 'anonymous',
            validation: game.validation,
            createdAt: new Date().toISOString(),
            plays: 0,
            uniquePlays: 0,
            ratings: [],
            averageRating: 0,
            remixCount: 0,
            featured: false,
            tags: options.tags || [],
            ...options
        };
        
        const communityGames = this.getCommunityGamesLocal();
        communityGames.unshift(communityGame);
        localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(communityGames));
        
        return communityGame;
    },

    // Unpublish game from community
    unpublishFromCommunity(communityId) {
        const communityGames = this.getCommunityGamesLocal();
        const filtered = communityGames.filter(g => g.id !== communityId);
        localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(filtered));
        return filtered;
    },

    // Get game by ID
    getCommunityGameById(id) {
        const communityGames = this.getCommunityGamesLocal();
        return communityGames.find(g => g.id === id);
    },

    // ============ RATINGS ============

    // Rate a game
    rateGame(gameId, rating, review = '') {
        const userId = localStorage.getItem('sgai-user-id') || 'anonymous';
        
        const ratings = this.getRatingsLocal();
        
        // Check if already rated
        const existingIndex = ratings.findIndex(r => 
            r.gameId === gameId && r.userId === userId
        );
        
        const ratingEntry = {
            gameId,
            userId,
            rating: Math.min(5, Math.max(1, rating)),
            review: review?.substring(0, 500) || '',
            createdAt: new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
            ratings[existingIndex] = ratingEntry;
        } else {
            ratings.push(ratingEntry);
        }
        
        localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
        
        // Update game average
        this.updateGameAverageRating(gameId);
        
        return ratingEntry;
    },

    // Get ratings for a game
    getGameRatings(gameId) {
        const ratings = this.getRatingsLocal();
        return ratings.filter(r => r.gameId === gameId);
    },

    // Get user's rating for a game
    getUserRating(gameId) {
        const userId = localStorage.getItem('sgai-user-id') || 'anonymous';
        const ratings = this.getRatingsLocal();
        return ratings.find(r => r.gameId === gameId && r.userId === userId);
    },

    getRatingsLocal() {
        try {
            return JSON.parse(localStorage.getItem(RATINGS_KEY)) || [];
        } catch (e) {
            return [];
        }
    },

    // Update game average rating
    updateGameAverageRating(gameId) {
        const ratings = this.getGameRatings(gameId);
        const communityGames = this.getCommunityGamesLocal();
        
        const gameIndex = communityGames.findIndex(g => g.id === gameId);
        if (gameIndex < 0) return;
        
        if (ratings.length === 0) {
            communityGames[gameIndex].averageRating = 0;
        } else {
            const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
            communityGames[gameIndex].averageRating = sum / ratings.length;
        }
        
        communityGames[gameIndex].ratings = ratings.map(r => r.rating);
        localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(communityGames));
    },

    // ============ REMIXING ============

    // Create a remix
    createRemix(originalGame, newPrompt) {
        const userId = localStorage.getItem('sgai-user-id') || 'anonymous';
        
        const remix = {
            id: 'remix_' + Date.now(),
            originalId: originalGame.id,
            originalTitle: originalGame.title,
            newTitle: originalGame.title + ' (Remix)',
            html: originalGame.html,
            newPrompt: newPrompt,
            author: localStorage.getItem('sgai-username') || 'Anonymous',
            authorId: userId,
            createdAt: new Date().toISOString(),
            plays: 0,
            parentRemixId: originalGame.parentRemixId || originalGame.id
        };
        
        const remixes = this.getRemixesLocal();
        remixes.push(remix);
        localStorage.setItem(REMIXES_KEY, JSON.stringify(remixes));
        
        // Update remix count on original
        this.updateRemixCount(originalGame.id);
        
        return remix;
    },

    getRemixesLocal() {
        try {
            return JSON.parse(localStorage.getItem(REMIXES_KEY)) || [];
        } catch (e) {
            return [];
        }
    },

    // Get remixes of a game
    getGameRemixes(gameId) {
        const remixes = this.getRemixesLocal();
        return remixes.filter(r => r.originalId === gameId || r.parentRemixId === gameId);
    },

    // Update remix count
    updateRemixCount(gameId) {
        const communityGames = this.getCommunityGamesLocal();
        const gameIndex = communityGames.findIndex(g => g.id === gameId);
        
        if (gameIndex >= 0) {
            const remixes = this.getRemixesLocal();
            const count = remixes.filter(r => r.originalId === gameId).length;
            communityGames[gameIndex].remixCount = count;
            localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(communityGames));
        }
    },

    // ============ FEATURED GAMES ============

    // Get featured games
    getFeaturedGames(limit = 5) {
        const communityGames = this.getCommunityGamesLocal();
        return communityGames
            .filter(g => g.featured || (g.averageRating >= 4 && g.plays > 10))
            .sort((a, b) => (b.plays || 0) - (a.plays || 0))
            .slice(0, limit);
    },

    // Get trending games
    getTrendingGames(limit = 10, days = 7) {
        const communityGames = this.getCommunityGamesLocal();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return communityGames
            .filter(g => new Date(g.createdAt) > cutoff)
            .sort((a, b) => (b.plays || 0) - (a.plays || 0))
            .slice(0, limit);
    },

    // ============ USER PROFILE ============

    // Get user's published games
    getUserPublishedGames(userId) {
        const communityGames = this.getCommunityGamesLocal();
        return communityGames.filter(g => g.authorId === userId);
    },

    // Get user's ratings
    getUserRatings(userId) {
        const ratings = this.getRatingsLocal();
        return ratings.filter(r => r.userId === userId);
    },

    // Get user's remixes
    getUserRemixes(userId) {
        const remixes = this.getRemixesLocal();
        return remixes.filter(r => r.authorId === userId);
    },

    // ============ STATISTICS ============

    // Get community stats
    getCommunityStats() {
        const communityGames = this.getCommunityGamesLocal();
        const ratings = this.getRatingsLocal();
        const remixes = this.getRemixesLocal();
        
        return {
            totalGames: communityGames.length,
            totalPlays: communityGames.reduce((sum, g) => sum + (g.plays || 0), 0),
            totalRatings: ratings.length,
            totalRemixes: remixes.length,
            averageRating: ratings.length > 0 
                ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
                : 0
        };
    },

    // ============ SEARCH ============

    // Search community
    searchCommunity(query, options = {}) {
        return this.getCommunityGames({
            ...options,
            search: query
        });
    },

    // Get categories with counts
    getCategoriesWithCounts() {
        const communityGames = this.getCommunityGamesLocal();
        const counts = {};
        
        communityGames.forEach(g => {
            const cat = g.category || 'uncategorized';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        
        return Object.entries(counts).map(([name, count]) => ({
            name,
            count,
            icon: this.getCategoryIcon(name)
        }));
    },

    getCategoryIcon(category) {
        const icons = {
            horror: '👻',
            action: '⚔️',
            puzzle: '🧩',
            survival: '🏃',
            adventure: '🗺️',
            arcade: '🕹️',
            default: '🎮'
        };
        return icons[category] || icons.default;
    }
};

// Export
window.CommunityModule = CommunityModule;
