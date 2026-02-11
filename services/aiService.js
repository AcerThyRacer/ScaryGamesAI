/**
 * AI Service - Personalized Recommendations & Analytics
 * Simulates AI-driven features (can be replaced with real ML models)
 */

const db = require('../models/database');

class AIService {
    /**
     * Analyze user behavior and generate horror profile
     */
    async generateHorrorProfile(userId) {
        const user = db.findById('users', userId);
        const analytics = db.find('analytics', { userId });
        const subscriptions = db.find('subscriptions', { userId });
        const achievements = db.find('achievements', { userId });

        // Calculate metrics
        const playSessions = analytics.filter(a => a.type === 'game_session');
        const totalPlayTime = playSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const gamesPlayed = [...new Set(playSessions.map(s => s.gameId))];
        
        // Horror tolerance analysis
        const horrorTolerance = this.calculateHorrorTolerance(playSessions);
        
        // Preferred genres
        const genrePreferences = this.analyzeGenrePreferences(playSessions);
        
        // Play patterns
        const playPatterns = this.analyzePlayPatterns(playSessions);
        
        // Fear response analysis (based on pause frequency, death rate, etc.)
        const fearProfile = this.analyzeFearResponses(analytics);

        // Subscription propensity
        const subscriptionLikelihood = this.calculateSubscriptionPropensity(user, analytics);

        return {
            userId,
            generatedAt: new Date().toISOString(),
            
            // Core metrics
            totalPlayTime,
            gamesPlayed: gamesPlayed.length,
            sessionsCount: playSessions.length,
            averageSessionLength: totalPlayTime / (playSessions.length || 1),
            
            // Psychological profile
            horrorTolerance: {
                score: horrorTolerance,
                level: this.getToleranceLevel(horrorTolerance),
                description: this.getToleranceDescription(horrorTolerance)
            },
            
            fearProfile: {
                primaryTrigger: fearProfile.primaryTrigger,
                avoidancePatterns: fearProfile.avoidancePatterns,
                copingMechanisms: fearProfile.copingMechanisms,
                recommendedIntensity: fearProfile.recommendedIntensity
            },
            
            // Preferences
            genrePreferences,
            playPatterns,
            
            // Behavioral
            subscriptionLikelihood,
            churnRisk: this.calculateChurnRisk(user, subscriptions, analytics),
            upgradePotential: this.calculateUpgradePotential(user, subscriptions),
            
            // Personalized content
            recommendedNextGame: this.recommendNextGame(genrePreferences, fearProfile),
            recommendedTier: this.recommendTier(horrorTolerance, playPatterns),
            personalizedDiscount: this.calculateOptimalDiscount(user, subscriptionLikelihood),
            
            // Archetype
            playerArchetype: this.determineArchetype(horrorTolerance, playPatterns, genrePreferences)
        };
    }

    calculateHorrorTolerance(sessions) {
        if (sessions.length === 0) return 0.5;

        const factors = {
            difficulty: sessions.filter(s => s.difficulty === 'nightmare').length / sessions.length,
            completion: sessions.filter(s => s.completed).length / sessions.length,
            deathRate: sessions.reduce((sum, s) => sum + (s.deaths || 0), 0) / sessions.length,
            avgSessionLength: sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
        };

        // Higher difficulty preference + longer sessions = higher tolerance
        const tolerance = (
            factors.difficulty * 0.3 +
            factors.completion * 0.2 +
            Math.min(factors.deathRate / 10, 1) * 0.2 +
            Math.min(factors.avgSessionLength / 3600, 1) * 0.3
        );

        return Math.min(Math.max(tolerance, 0), 1);
    }

    getToleranceLevel(score) {
        if (score < 0.2) return 'Timid';
        if (score < 0.4) return 'Cautious';
        if (score < 0.6) return 'Steady';
        if (score < 0.8) return 'Fearless';
        return 'Masochistic';
    }

    getToleranceDescription(score) {
        const descriptions = {
            'Timid': 'You prefer the safety of the light. Start with Survivor tier.',
            'Cautious': 'You venture into darkness but keep one eye on the exit.',
            'Steady': 'You face your fears with measured bravery.',
            'Fearless': 'You laugh in the face of terror. Hunter tier recommended.',
            'Masochistic': 'You seek the most intense nightmares. Elder God awaits.'
        };
        return descriptions[this.getToleranceLevel(score)];
    }

    analyzeGenrePreferences(sessions) {
        const genreStats = {};
        
        sessions.forEach(session => {
            const genre = session.genre || 'unknown';
            if (!genreStats[genre]) {
                genreStats[genre] = { count: 0, totalTime: 0, enjoyment: 0 };
            }
            genreStats[genre].count++;
            genreStats[genre].totalTime += session.duration || 0;
            genreStats[genre].enjoyment += session.satisfaction || 0.5;
        });

        // Calculate preference scores
        const preferences = Object.entries(genreStats)
            .map(([genre, stats]) => ({
                genre,
                score: (stats.count * 0.3) + (stats.totalTime * 0.0001) + (stats.enjoyment * 0.4),
                playCount: stats.count,
                totalTime: stats.totalTime
            }))
            .sort((a, b) => b.score - a.score);

        return preferences;
    }

    analyzePlayPatterns(sessions) {
        if (sessions.length === 0) return {};

        const times = sessions.map(s => new Date(s.timestamp).getHours());
        const days = sessions.map(s => new Date(s.timestamp).getDay());

        // Find preferred time
        const hourCounts = {};
        times.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
        const preferredHour = Object.entries(hourCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0];

        // Find preferred day
        const dayCounts = {};
        days.forEach(d => { dayCounts[d] = (dayCounts[d] || 0) + 1; });
        const preferredDay = Object.entries(dayCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0];

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return {
            preferredTimeOfDay: this.getTimeOfDay(parseInt(preferredHour)),
            preferredDay: dayNames[preferredDay],
            sessionFrequency: sessions.length / 30, // per month
            bingeTendency: this.detectBingeBehavior(sessions),
            consistency: this.calculateConsistency(sessions)
        };
    }

    getTimeOfDay(hour) {
        if (hour >= 5 && hour < 12) return 'Morning';
        if (hour >= 12 && hour < 17) return 'Afternoon';
        if (hour >= 17 && hour < 21) return 'Evening';
        return 'Night Owl';
    }

    detectBingeBehavior(sessions) {
        // Group sessions by day
        const dailySessions = {};
        sessions.forEach(s => {
            const date = new Date(s.timestamp).toDateString();
            dailySessions[date] = (dailySessions[date] || 0) + 1;
        });

        const bingeDays = Object.values(dailySessions).filter(count => count > 3).length;
        return bingeDays / Object.keys(dailySessions).length;
    }

    calculateConsistency(sessions) {
        if (sessions.length < 2) return 0;
        
        const sorted = sessions.sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        const gaps = [];
        for (let i = 1; i < sorted.length; i++) {
            const diff = new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp);
            gaps.push(diff / (1000 * 60 * 60 * 24)); // days
        }
        
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        return Math.max(0, 1 - (avgGap / 7)); // Higher score for more frequent play
    }

    analyzeFearResponses(analytics) {
        const pauseEvents = analytics.filter(a => a.type === 'game_pause');
        const deathEvents = analytics.filter(a => a.type === 'player_death');
        const quitEvents = analytics.filter(a => a.type === 'game_quit');

        // Detect avoidance patterns
        const suddenQuits = quitEvents.filter(q => {
            const session = analytics.find(a => 
                a.type === 'game_session' && 
                a.gameId === q.gameId &&
                new Date(a.timestamp) > new Date(q.timestamp)
            );
            return !session; // No subsequent session = possible rage quit
        });

        const pauseFrequency = pauseEvents.length / analytics.filter(a => a.type === 'game_session').length;

        return {
            primaryTrigger: this.identifyPrimaryTrigger(deathEvents),
            avoidancePatterns: suddenQuits.length > 5 ? 'High' : suddenQuits.length > 2 ? 'Moderate' : 'Low',
            copingMechanisms: pauseFrequency > 0.5 ? 'Frequent Pauser' : 'Persistent',
            recommendedIntensity: pauseFrequency > 0.7 ? 0.3 : pauseFrequency > 0.3 ? 0.6 : 0.9
        };
    }

    identifyPrimaryTrigger(deathEvents) {
        const causes = {};
        deathEvents.forEach(d => {
            const cause = d.cause || 'unknown';
            causes[cause] = (causes[cause] || 0) + 1;
        });

        const sorted = Object.entries(causes).sort((a, b) => b[1] - a[1]);
        return sorted[0]?.[0] || 'unknown';
    }

    calculateSubscriptionPropensity(user, analytics) {
        const factors = {
            engagement: analytics.filter(a => a.type === 'game_session').length / 30,
            variety: new Set(analytics.map(a => a.gameId)).size / 13,
            achievementDrive: analytics.filter(a => a.type === 'achievement_unlocked').length / 10,
            socialActivity: analytics.filter(a => a.type === 'social_share').length
        };

        return (
            factors.engagement * 0.4 +
            factors.variety * 0.2 +
            Math.min(factors.achievementDrive, 1) * 0.3 +
            Math.min(factors.socialActivity / 5, 1) * 0.1
        );
    }

    calculateChurnRisk(user, subscriptions, analytics) {
        const activeSub = subscriptions.find(s => s.status === 'active');
        if (!activeSub) return 0;

        const recentSessions = analytics.filter(a => {
            const daysAgo = (Date.now() - new Date(a.timestamp)) / (1000 * 60 * 60 * 24);
            return a.type === 'game_session' && daysAgo <= 7;
        });

        const subscriptionAge = (Date.now() - new Date(activeSub.startedAt)) / (1000 * 60 * 60 * 24);
        
        // High risk if: low recent activity, subscription about to renew, declining engagement
        const activityDrop = recentSessions.length < 2;
        const renewalApproaching = activeSub.expiresAt && 
            (new Date(activeSub.expiresAt) - Date.now()) / (1000 * 60 * 60 * 24) < 7;

        let risk = 0;
        if (activityDrop) risk += 0.4;
        if (renewalApproaching && recentSessions.length === 0) risk += 0.4;
        if (subscriptionAge > 30 && recentSessions.length < subscriptionAge / 10) risk += 0.2;

        return Math.min(risk, 1);
    }

    calculateUpgradePotential(user, subscriptions) {
        const activeSub = subscriptions.find(s => s.status === 'active');
        if (!activeSub) return 0;
        if (activeSub.tier === 'elder') return 0;

        const daysSubscribed = (Date.now() - new Date(activeSub.startedAt)) / (1000 * 60 * 60 * 24);
        
        // Higher potential if: been subscribed for a while, already upgraded once
        const upgradeHistory = subscriptions.filter(s => s.upgradedFrom).length;
        
        return Math.min((daysSubscribed / 30) * 0.5 + (upgradeHistory * 0.3), 0.9);
    }

    recommendNextGame(genrePreferences, fearProfile) {
        if (genrePreferences.length === 0) {
            return { gameId: 'backrooms-pacman', reason: 'Good starter horror' };
        }

        const topGenre = genrePreferences[0].genre;
        
        // Recommend based on genre preference and fear tolerance
        const recommendations = {
            fps: { game: 'web-of-terror', reason: 'You enjoy first-person immersion' },
            survival: { game: 'the-abyss', reason: 'Your fear tolerance suits underwater horror' },
            puzzle: { game: 'dollhouse', reason: 'You prefer psychological tension' },
            strategy: { game: 'total-zombies-medieval', reason: 'You like tactical challenges' }
        };

        return recommendations[topGenre] || { game: 'shadow-crawler', reason: 'Balanced horror experience' };
    }

    recommendTier(horrorTolerance, playPatterns) {
        if (horrorTolerance > 0.8 && playPatterns.sessionFrequency > 0.5) {
            return { tier: 'elder', confidence: 0.9, reason: 'Your masochistic tendencies demand ultimate power' };
        }
        if (horrorTolerance > 0.5 && playPatterns.consistency > 0.6) {
            return { tier: 'hunter', confidence: 0.8, reason: 'Your steady bravery deserves enhanced tools' };
        }
        return { tier: 'survivor', confidence: 0.7, reason: 'Start your journey with essential protections' };
    }

    calculateOptimalDiscount(user, propensity) {
        // Lower propensity = higher discount needed
        if (propensity < 0.2) return 50;
        if (propensity < 0.4) return 30;
        if (propensity < 0.6) return 20;
        if (propensity < 0.8) return 10;
        return 0; // High propensity needs no discount
    }

    determineArchetype(tolerance, patterns, genres) {
        const archetypes = [
            {
                name: 'The Methodical Survivor',
                traits: ['cautious', 'strategic', 'prepared'],
                match: tolerance < 0.4 && patterns.consistency > 0.5
            },
            {
                name: 'The Thrill Seeker',
                traits: ['impulsive', 'adrenaline-driven', 'persistent'],
                match: tolerance > 0.7 && patterns.bingeTendency > 0.5
            },
            {
                name: 'The Completionist',
                traits: ['perfectionist', 'persistent', 'achievement-oriented'],
                match: genres.length > 5 && patterns.consistency > 0.7
            },
            {
                name: 'The Social Horror Fan',
                traits: ['extroverted', 'community-driven', 'competitive'],
                match: false // Would need social data
            },
            {
                name: 'The Night Wanderer',
                traits: ['nocturnal', 'immersive', 'atmosphere-appreciating'],
                match: patterns.preferredTimeOfDay === 'Night Owl'
            }
        ];

        const matching = archetypes.filter(a => a.match);
        return matching.length > 0 ? matching[0] : archetypes[0];
    }

    /**
     * Get personalized dashboard data
     */
    async getPersonalizedDashboard(userId) {
        const profile = await this.generateHorrorProfile(userId);
        const bp = await db.getUserBattlePass(userId);
        const subscription = await db.getActiveSubscription(userId);

        return {
            profile,
            battlePass: bp,
            subscription,
            
            // Personalized content
            dailyRecommendation: await this.getDailyRecommendation(userId, profile),
            challenges: this.generatePersonalizedChallenges(profile),
            
            // Insights
            insights: this.generateInsights(profile),
            
            // Next steps
            suggestedActions: this.generateSuggestedActions(profile, subscription)
        };
    }

    async getDailyRecommendation(userId, profile) {
        const recommendations = [
            `Try ${profile.recommendedNextGame.game} - ${profile.recommendedNextGame.reason}`,
            `Your horror tolerance is ${profile.horrorTolerance.level}. ${profile.horrorTolerance.description}`,
            `You're a ${profile.playerArchetype.name}. ${profile.playerArchetype.traits.join(', ')}`,
            `Consider upgrading to ${profile.recommendedTier.tier} tier - ${profile.recommendedTier.reason}`
        ];

        // Rotate based on day
        const dayOfMonth = new Date().getDate();
        return recommendations[dayOfMonth % recommendations.length];
    }

    generatePersonalizedChallenges(profile) {
        return [
            {
                type: 'exploration',
                description: `Play a ${profile.genrePreferences[1]?.genre || 'different genre'} game`,
                reward: '50 XP'
            },
            {
                type: 'intensity',
                description: `Try a game at ${profile.fearProfile.recommendedIntensity > 0.7 ? 'Nightmare' : 'Hard'} difficulty`,
                reward: '100 XP'
            },
            {
                type: 'social',
                description: 'Share your favorite scary moment',
                reward: '25 XP'
            }
        ];
    }

    generateInsights(profile) {
        return [
            `You've played ${profile.gamesPlayed} different nightmares`,
            `Your average session is ${Math.floor(profile.averageSessionLength / 60)} minutes`,
            profile.playPatterns.bingeTendency > 0.5 ? 'You tend to binge-play horror games' : 'You prefer shorter, controlled doses of fear',
            `You're most active during ${profile.playPatterns.preferredTimeOfDay.toLowerCase()}s`
        ];
    }

    generateSuggestedActions(profile, subscription) {
        const actions = [];

        if (!subscription) {
            actions.push({
                type: 'subscribe',
                priority: 'high',
                message: `Start as a ${profile.recommendedTier.tier} - ${profile.recommendedTier.reason}`,
                discount: profile.personalizedDiscount
            });
        } else if (profile.upgradePotential > 0.6 && subscription.tier !== 'elder') {
            actions.push({
                type: 'upgrade',
                priority: 'medium',
                message: 'You\'re ready for more power...'
            });
        }

        if (profile.churnRisk > 0.6) {
            actions.push({
                type: 'retention',
                priority: 'high',
                message: 'We miss you... Here\'s a special offer'
            });
        }

        return actions;
    }
}

module.exports = new AIService();
