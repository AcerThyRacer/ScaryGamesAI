/* ============================================
   Collaboration Module - Phase 4
   Multiplayer, tournaments, leaderboards
   ============================================ */

const TOURNAMENTS_KEY = 'sgai-tournaments';
const LEADERBOARDS_KEY = 'sgai-leaderboards';
const ACHIEVEMENTS_KEY = 'sgai-achievements';

const CollaborationModule = {
    // ============ LEADERBOARDS ============

    // Get leaderboard entries
    getLeaderboard(gameId, options = {}) {
        const { limit = 100, timeframe = 'all' } = options;
        
        const leaderboards = this.getLeaderboardsLocal();
        const board = leaderboards[gameId] || [];
        
        let filtered = board;
        
        // Filter by timeframe
        if (timeframe !== 'all') {
            const cutoff = new Date();
            if (timeframe === 'daily') cutoff.setDate(cutoff.getDate() - 1);
            if (timeframe === 'weekly') cutoff.setDate(cutoff.getDate() - 7);
            if (timeframe === 'monthly') cutoff.setMonth(cutoff.getMonth() - 1);
            
            filtered = board.filter(e => new Date(e.date) > cutoff);
        }
        
        // Sort and limit
        filtered.sort((a, b) => b.score - a.score);
        return filtered.slice(0, limit);
    },

    // Submit score
    submitScore(gameId, score, metadata = {}) {
        const userId = localStorage.getItem('sgai-user-id') || 'anonymous';
        const username = localStorage.getItem('sgai-username') || 'Player';
        
        const entry = {
            id: 'entry_' + Date.now(),
            gameId,
            userId,
            username: username.substring(0, 20),
            score: Math.floor(score),
            date: new Date().toISOString(),
            metadata
        };
        
        const leaderboards = this.getLeaderboardsLocal();
        
        if (!leaderboards[gameId]) {
            leaderboards[gameId] = [];
        }
        
        leaderboards[gameId].push(entry);
        
        // Keep only last 1000 entries per game
        if (leaderboards[gameId].length > 1000) {
            leaderboards[gameId].sort((a, b) => b.score - a.score);
            leaderboards[gameId] = leaderboards[gameId].slice(0, 1000);
        }
        
        localStorage.setItem(LEADERBOARDS_KEY, JSON.stringify(leaderboards));
        
        // Check for high score
        const rank = this.getRank(gameId, entry.id);
        
        return { entry, rank };
    },

    // Get user's rank
    getRank(gameId, entryId) {
        const leaderboard = this.getLeaderboard(gameId);
        const index = leaderboard.findIndex(e => e.id === entryId);
        return index >= 0 ? index + 1 : null;
    },

    // Get user's best score
    getUserBestScore(gameId, userId) {
        const leaderboard = this.getLeaderboard(gameId);
        const userEntries = leaderboard.filter(e => e.userId === userId);
        
        if (userEntries.length === 0) return null;
        
        return Math.max(...userEntries.map(e => e.score));
    },

    getLeaderboardsLocal() {
        try {
            return JSON.parse(localStorage.getItem(LEADERBOARDS_KEY)) || {};
        } catch (e) {
            return {};
        }
    },

    // ============ TOURNAMENTS ============

    // Get active tournaments
    getActiveTournaments() {
        const tournaments = this.getTournamentsLocal();
        const now = new Date();
        
        return tournaments.filter(t => {
            const start = new Date(t.startDate);
            const end = new Date(t.endDate);
            return now >= start && now <= end && t.status === 'active';
        });
    },

    // Get upcoming tournaments
    getUpcomingTournaments() {
        const tournaments = this.getTournamentsLocal();
        const now = new Date();
        
        return tournaments.filter(t => {
            const start = new Date(t.startDate);
            return start > now && t.status === 'upcoming';
        }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    },

    // Get tournament by ID
    getTournamentById(id) {
        const tournaments = this.getTournamentsLocal();
        return tournaments.find(t => t.id === id);
    },

    // Create tournament (for demo)
    createTournament(data) {
        const tournament = {
            id: 'tournament_' + Date.now(),
            title: data.title,
            description: data.description,
            gameId: data.gameId,
            gameTitle: data.gameTitle,
            startDate: data.startDate,
            endDate: data.endDate,
            status: 'upcoming',
            type: data.type || 'score', // score, survival, fastest
            prizes: data.prizes || [],
            maxParticipants: data.maxParticipants || 100,
            participants: [],
            createdAt: new Date().toISOString(),
            createdBy: localStorage.getItem('sgai-user-id') || 'anonymous'
        };
        
        const tournaments = this.getTournamentsLocal();
        tournaments.push(tournament);
        localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(tournaments));
        
        return tournament;
    },

    // Join tournament
    joinTournament(tournamentId) {
        const userId = localStorage.getItem('sgai-user-id') || 'anonymous';
        
        const tournaments = this.getTournamentsLocal();
        const index = tournaments.findIndex(t => t.id === tournamentId);
        
        if (index < 0) return null;
        
        const tournament = tournaments[index];
        
        // Check if already joined
        if (!tournament.participants.includes(userId)) {
            if (tournament.participants.length < tournament.maxParticipants) {
                tournament.participants.push(userId);
                localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(tournaments));
            }
        }
        
        return tournament;
    },

    // Get tournament leaderboard
    getTournamentLeaderboard(tournamentId) {
        const tournament = this.getTournamentById(tournamentId);
        if (!tournament) return [];
        
        // Get scores for this tournament's game within timeframe
        const leaderboard = this.getLeaderboard(tournament.gameId);
        const start = new Date(tournament.startDate);
        
        return leaderboard
            .filter(e => new Date(e.date) >= start)
            .slice(0, 10);
    },

    getTournamentsLocal() {
        try {
            return JSON.parse(localStorage.getItem(TOURNAMENTS_KEY)) || this.getDefaultTournaments();
        } catch (e) {
            return this.getDefaultTournaments();
        }
    },

    // Get some default tournaments for demo
    getDefaultTournaments() {
        const now = new Date();
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        const monthEnd = new Date(now);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        
        return [
            {
                id: 'tournament_weekly',
                title: 'Weekly Horror Challenge',
                description: 'Compete for the highest score this week!',
                gameId: 'zombie-shooter',
                gameTitle: 'Zombie Shooter',
                startDate: now.toISOString(),
                endDate: weekEnd.toISOString(),
                status: 'active',
                type: 'score',
                prizes: ['🏆 Gold Badge', '💎 500 Gems', '🎁 Exclusive Skin'],
                maxParticipants: 100,
                participants: ['user1', 'user2', 'user3'],
                createdAt: now.toISOString()
            },
            {
                id: 'tournament_monthly',
                title: 'Monthly Master',
                description: 'The ultimate monthly competition',
                gameId: 'wave-survival',
                gameTitle: 'Wave Survival',
                startDate: now.toISOString(),
                endDate: monthEnd.toISOString(),
                status: 'active',
                type: 'survival',
                prizes: ['👑 Champion Title', '💎 2000 Gems', '🎭 Legendary Skin'],
                maxParticipants: 500,
                participants: ['user1', 'user2'],
                createdAt: now.toISOString()
            }
        ];
    },

    // ============ ACHIEVEMENTS ============

    // Get all achievements
    getAchievements() {
        return [
            // Generation achievements
            { id: 'first_game', name: 'Game Creator', desc: 'Generate your first game', icon: '🎮', rarity: 'common', type: 'generation' },
            { id: 'ten_games', name: 'Prolific Creator', desc: 'Generate 10 games', icon: '✦', rarity: 'uncommon', type: 'generation', requirement: 10 },
            { id: 'fifty_games', name: 'Master Architect', desc: 'Generate 50 games', icon: '👑', rarity: 'legendary', type: 'generation', requirement: 50 },
            
            // Community achievements
            { id: 'first_share', name: 'Sharing is Caring', desc: 'Share a game with the community', icon: '📤', rarity: 'common', type: 'community' },
            { id: 'ten_likes', name: 'Popular Creator', desc: 'Get 10 likes on community games', icon: '❤️', rarity: 'uncommon', type: 'community', requirement: 10 },
            { id: 'first_remix', name: 'Remixer', desc: 'Create a remix of a community game', icon: '🎵', rarity: 'common', type: 'remix' },
            
            // Score achievements
            { id: 'high_scorer', name: 'High Scorer', desc: 'Score 10,000 points', icon: '💯', rarity: 'common', type: 'score', requirement: 10000 },
            { id: 'legendary_scorer', name: 'Legend', desc: 'Score 100,000 points', icon: '🏆', rarity: 'legendary', type: 'score', requirement: 100000 },
            
            // Tournament achievements
            { id: 'first_tournament', name: 'Competitor', desc: 'Join your first tournament', icon: '🏁', rarity: 'common', type: 'tournament' },
            { id: 'tournament_winner', name: 'Champion', desc: 'Win a tournament', icon: '🥇', rarity: 'legendary', type: 'tournament' },
            
            // Rating achievements
            { id: 'first_rate', name: 'Critic', desc: 'Rate 5 community games', icon: '⭐', rarity: 'common', type: 'rating', requirement: 5 },
            { id: 'helpful_reviewer', name: 'Helpful Reviewer', desc: 'Write 10 reviews', icon: '📝', rarity: 'uncommon', type: 'rating', requirement: 10 }
        ];
    },

    // Get user's achievements
    getUserAchievements() {
        const userId = localStorage.getItem('sgai-user-id') || 'anonymous';
        
        try {
            const data = JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY)) || {};
            return data[userId] || { achievements: [], stats: {} };
        } catch (e) {
            return { achievements: [], stats: {} };
        }
    },

    // Unlock achievement
    unlockAchievement(achievementId) {
        const userId = localStorage.getItem('sgai-user-id') || 'anonymous';
        
        const data = JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY)) || {};
        if (!data[userId]) data[userId] = { achievements: [], stats: {} };
        
        if (!data[userId].achievements.includes(achievementId)) {
            data[userId].achievements.push(achievementId);
            localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(data));
            return true; // New achievement unlocked
        }
        
        return false;
    },

    // Update achievement stats
    updateAchievementStat(stat, value) {
        const userId = localStorage.getItem('sgai-user-id') || 'anonymous';
        
        const data = JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY)) || {};
        if (!data[userId]) data[userId] = { achievements: [], stats: {} };
        
        data[userId].stats[stat] = value;
        localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(data));
        
        // Check for new achievements based on stats
        this.checkStatAchievements(stat, value);
    },

    // Check if stats unlock achievements
    checkStatAchievements(stat, value) {
        const achievements = this.getAchievements();
        
        achievements.forEach(achievement => {
            if (achievement.requirement && achievement.type === 'generation') {
                if (stat === 'games_generated' && value >= achievement.requirement) {
                    this.unlockAchievement(achievement.id);
                }
            }
        });
    },

    // Get achievement progress
    getAchievementProgress(achievementId) {
        const achievement = this.getAchievements().find(a => a.id === achievementId);
        if (!achievement) return null;
        
        const userData = this.getUserAchievements();
        const unlocked = userData.achievements.includes(achievementId);
        
        if (!achievement.requirement) {
            return { unlocked, progress: unlocked ? 100 : 0 };
        }
        
        const currentValue = userData.stats[achievement.type + 's'] || 0;
        const progress = Math.min(100, (currentValue / achievement.requirement) * 100);
        
        return { unlocked, progress, current: currentValue, required: achievement.requirement };
    },

    // ============ STATISTICS ============

    // Get user stats
    getUserStats(userId) {
        const leaderboards = this.getLeaderboardsLocal();
        const userData = this.getUserAchievements();
        
        let totalScores = 0;
        let gamesPlayed = new Set();
        let bestScore = 0;
        
        Object.entries(leaderboards).forEach(([gameId, entries]) => {
            entries.forEach(entry => {
                if (entry.userId === userId) {
                    totalScores += entry.score;
                    gamesPlayed.add(gameId);
                    if (entry.score > bestScore) bestScore = entry.score;
                }
            });
        });
        
        return {
            totalScores,
            gamesPlayed: gamesPlayed.size,
            bestScore,
            achievements: userData.achievements.length,
            tournamentsJoined: userData.stats.tournaments_joined || 0
        };
    },

    // ============ GLOBAL LEADERBOARD ============

    // Get global leaderboard (all games combined)
    getGlobalLeaderboard(limit = 50) {
        const leaderboards = this.getLeaderboardsLocal();
        const allEntries = [];
        
        Object.entries(leaderboards).forEach(([gameId, entries]) => {
            entries.forEach(entry => {
                allEntries.push({ ...entry, gameId });
            });
        });
        
        // Aggregate by user
        const userScores = {};
        allEntries.forEach(entry => {
            if (!userScores[entry.userId]) {
                userScores[entry.userId] = {
                    userId: entry.userId,
                    username: entry.username,
                    totalScore: 0,
                    gamesPlayed: new Set()
                };
            }
            userScores[entry.userId].totalScore += entry.score;
            userScores[entry.userId].gamesPlayed.add(entry.gameId);
        });
        
        return Object.values(userScores)
            .map(u => ({
                ...u,
                gamesPlayed: u.gamesPlayed.size
            }))
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, limit);
    }
};

// Export
window.CollaborationModule = CollaborationModule;
