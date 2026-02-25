/**
 * Phase 1 & 2 Integration Helper
 * Easy integration utilities for games to connect with meta-progression and lore systems
 */

class ScaryGamesAIIntegration {
    constructor(gameId, options = {}) {
        this.gameId = gameId;
        this.apiBaseUrl = options.apiBaseUrl || '/api/v1';
        this.userId = null;
        this.sessionToken = null;
        this.playerProfile = null;
    }

    // ========== Authentication ==========

    /**
     * Initialize integration with user session
     */
    async initialize(userId, sessionToken) {
        this.userId = userId;
        this.sessionToken = sessionToken;
        
        try {
            // Load player profile
            const profileResponse = await this._fetch('/profile');
            this.playerProfile = profileResponse.data;
            
            console.log(`[Integration] Initialized for game ${this.gameId}, player: ${this.playerProfile.profile.username}`);
            
            return this.playerProfile;
        } catch (error) {
            console.error('[Integration] Failed to initialize:', error);
            throw error;
        }
    }

    // ========== Phase 1: Meta-Progression ==========

    /**
     * Award XP to player (master level and/or game mastery)
     */
    async awardXP(options = {}) {
        const { masterXp = 0, gameXp = 0, playtimeSeconds = 0 } = options;
        
        if (masterXp === 0 && gameXp === 0) {
            console.warn('[Integration] No XP to award');
            return;
        }
        
        try {
            const response = await this._fetch('/profile/xp', {
                method: 'POST',
                body: JSON.stringify({
                    masterXp,
                    gameId: this.gameId,
                    gameXp,
                    playtimeSeconds
                })
            });
            
            // Handle level ups
            if (response.data.levelUps && response.data.levelUps.length > 0) {
                response.data.levelUps.forEach(levelUp => {
                    this._triggerLevelUpAnimation(levelUp);
                });
            }
            
            return response.data;
        } catch (error) {
            console.error('[Integration] Failed to award XP:', error);
            throw error;
        }
    }

    /**
     * Award soul fragments to player
     */
    async awardSoulFragments(amount, source, description) {
        try {
            const response = await this._fetch('/soul-fragments', {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    source,
                    description
                })
            });
            
            this._showSoulFragmentReward(amount);
            
            return response.data;
        } catch (error) {
            console.error('[Integration] Failed to award soul fragments:', error);
            throw error;
        }
    }

    /**
     * Record match result for matchmaking
     */
    async recordMatchResult(opponentId, won, scores = {}, additionalStats = {}) {
        try {
            const response = await this._fetch('/matchmaking/result', {
                method: 'POST',
                body: JSON.stringify({
                    gameType: this.gameId,
                    opponentId,
                    won,
                    score: scores.player,
                    opponentScore: scores.opponent,
                    matchDuration: scores.duration,
                    additionalStats
                })
            });
            
            this._showRatingChange(response.data);
            
            return response.data;
        } catch (error) {
            console.error('[Integration] Failed to record match result:', error);
            throw error;
        }
    }

    /**
     * Find a matchmaking opponent
     */
    async findMatch(mode = 'ranked') {
        try {
            const response = await this._fetch('/matchmaking/find', {
                method: 'POST',
                body: JSON.stringify({
                    gameType: this.gameId,
                    mode,
                    maxWaitTime: 30000
                })
            });
            
            return response.data;
        } catch (error) {
            console.error('[Integration] Failed to find match:', error);
            throw error;
        }
    }

    // ========== Phase 2: Lore & Events ==========

    /**
     * Discover a lore fragment
     */
    async discoverLoreFragment(fragmentId, gameContext = {}) {
        try {
            const response = await this._fetch('/lore/fragments/discover', {
                method: 'POST',
                body: JSON.stringify({
                    fragmentId,
                    gameContext: {
                        gameId: this.gameId,
                        ...gameContext
                    }
                })
            });
            
            this._showLoreDiscovery(response.data);
            
            return response.data;
        } catch (error) {
            console.error('[Integration] Failed to discover lore fragment:', error);
            throw error;
        }
    }

    /**
     * Update quest progress
     */
    async updateQuestProgress(eventId, questId, progressType, amount = 1) {
        try {
            const response = await this._fetch(`/events/${eventId}/quest/${questId}/progress`, {
                method: 'POST',
                body: JSON.stringify({
                    progressType,
                    amount,
                    metadata: {
                        gameId: this.gameId
                    }
                })
            });
            
            if (response.data.isCompleted) {
                this._showQuestCompletion(response.data);
            }
            
            return response.data;
        } catch (error) {
            console.error('[Integration] Failed to update quest progress:', error);
            throw error;
        }
    }

    /**
     * Update meta-quest progress (for multi-game quests)
     */
    async updateMetaQuestProgress(questId, amount = 1) {
        try {
            const response = await this._fetch(`/quests/meta/${questId}/progress`, {
                method: 'POST',
                body: JSON.stringify({
                    gameId: this.gameId,
                    amount,
                    metadata: {
                        gameId: this.gameId
                    }
                })
            });
            
            if (response.data.isCompleted) {
                this._showMetaQuestCompletion(response.data);
            }
            
            return response.data;
        } catch (error) {
            console.error('[Integration] Failed to update meta quest progress:', error);
            throw error;
        }
    }

    /**
     * Participate in timeline event
     */
    async participateInTimelineEvent(eventId, choice = null) {
        try {
            const response = await this._fetch('/lore/timeline/progress', {
                method: 'POST',
                body: JSON.stringify({
                    timelineEventId: eventId,
                    choice
                })
            });
            
            if (response.data.communityGoalAchieved) {
                this._showCommunityGoalAchieved(response.data);
            }
            
            return response.data;
        } catch (error) {
            console.error('[Integration] Failed to participate in timeline event:', error);
            throw error;
        }
    }

    // ========== Data Retrieval ==========

    /**
     * Get active events
     */
    async getActiveEvents() {
        try {
            const response = await this._fetch('/events/active');
            return response.data;
        } catch (error) {
            console.error('[Integration] Failed to get active events:', error);
            throw error;
        }
    }

    /**
     * Get active quests for this game
     */
    async getActiveQuests() {
        try {
            const response = await this._fetch('/quests/active');
            return response.data;
        } catch (error) {
            console.error('[Integration] Failed to get active quests:', error);
            throw error;
        }
    }

    /**
     * Get meta-quests
     */
    async getMetaQuests() {
        try {
            const response = await this._fetch('/quests/meta');
            return response.data;
        } catch (error) {
            console.error('[Integration] Failed to get meta quests:', error);
            throw error;
        }
    }

    /**
     * Get player's lore collection stats
     */
    async getLoreStats() {
        try {
            const response = await this._fetch('/lore/stats');
            return response.data;
        } catch (error) {
            console.error('[Integration] Failed to get lore stats:', error);
            throw error;
        }
    }

    /**
     * Get matchmaking profile
     */
    async getMatchmakingProfile() {
        try {
            const response = await this._fetch('/matchmaking/profile');
            return response.data;
        } catch (error) {
            console.error('[Integration] Failed to get matchmaking profile:', error);
            throw error;
        }
    }

    // ========== Internal Helpers ==========

    async _fetch(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (this.sessionToken) {
            headers['Authorization'] = `Bearer ${this.sessionToken}`;
        }
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        
        return response.json();
    }

    _triggerLevelUpAnimation(levelUp) {
        // Dispatch custom event for UI to handle
        const event = new CustomEvent('scarygamesai-levelup', {
            detail: {
                type: levelUp.type,
                oldLevel: levelUp.oldLevel,
                newLevel: levelUp.newLevel,
                gameId: levelUp.gameId
            }
        });
        window.dispatchEvent(event);
        
        console.log(`[Integration] 🎉 LEVEL UP! ${levelUp.type}: ${levelUp.oldLevel} → ${levelUp.newLevel}`);
    }

    _showSoulFragmentReward(amount) {
        const event = new CustomEvent('scarygamesai-soulfragments', {
            detail: { amount }
        });
        window.dispatchEvent(event);
        
        console.log(`[Integration] 💎 Received ${amount} Soul Fragments!`);
    }

    _showRatingChange(data) {
        const event = new CustomEvent('scarygamesai-ratingchange', {
            detail: data
        });
        window.dispatchEvent(event);
        
        const sign = data.ratingChange > 0 ? '+' : '';
        console.log(`[Integration] 📊 Rating: ${sign}${data.ratingChange} → ${data.newRating}`);
    }

    _showLoreDiscovery(data) {
        const event = new CustomEvent('scarygamesai-lorediscovery', {
            detail: data
        });
        window.dispatchEvent(event);
        
        console.log(`[Integration] 📜 Discovered lore: ${data.fragment.title}`);
    }

    _showQuestCompletion(data) {
        const event = new CustomEvent('scarygamesai-questcomplete', {
            detail: data
        });
        window.dispatchEvent(event);
        
        console.log(`[Integration] ✅ Quest Completed! Rewards:`, data.rewardsAwarded);
    }

    _showMetaQuestCompletion(data) {
        const event = new CustomEvent('scarygamesai-metaquestcomplete', {
            detail: data
        });
        window.dispatchEvent(event);
        
        console.log(`[Integration] 🌟 Meta Quest Completed! Unique games:`, data.uniqueGamesPlayed);
    }

    _showCommunityGoalAchieved(data) {
        const event = new CustomEvent('scarygamesai-communitygoal', {
            detail: data
        });
        window.dispatchEvent(event);
        
        console.log(`[Integration] 🎊 Community Goal Achieved! Everyone receives ${data.event.community_reward} soul fragments!`);
    }
}

// ========== Game-Specific Integration Examples ==========

/**
 * Example: Backrooms Pac-Man Integration
 */
class BackroomsPacmanIntegration extends ScaryGamesAIIntegration {
    constructor() {
        super('backrooms_pacman');
    }

    async onPelletCollected(count) {
        // Award small XP for pellets
        if (count % 10 === 0) {
            await this.awardXP({ gameXp: 5, masterXp: 2 });
        }
    }

    async onGhostEaten(ghostType) {
        // Award XP and possibly soul fragments
        const xp = ghostType === 'normal' ? 20 : 50;
        const souls = ghostType === 'normal' ? 1 : 3;
        
        await this.awardXP({ gameXp: xp });
        await this.awardSoulFragments(souls, 'ghost_eaten', `Ate a ${ghostType} ghost`);
    }

    async onLevelComplete(level, timeSeconds) {
        // Award XP based on performance
        const timeBonus = Math.max(0, 100 - timeSeconds);
        const xp = 100 + timeBonus + (level * 10);
        
        await this.awardXP({ gameXp: xp, masterXp: 50, playtimeSeconds: timeSeconds });
        
        // Update quest progress
        const activeQuests = await this.getActiveQuests();
        for (const quest of activeQuests.quests) {
            if (quest.objective_type === 'complete_levels') {
                await this.updateQuestProgress(quest.event_id, quest.id, 'levels', 1);
            }
        }
    }

    async onLoreFragmentFound(fragmentId, level) {
        await this.discoverLoreFragment(fragmentId, {
            level,
            location: 'backrooms_maze'
        });
    }
}

/**
 * Example: Shadow Crawler Integration
 */
class ShadowCrawlerIntegration extends ScaryGamesAIIntegration {
    constructor() {
        super('shadow_crawler');
    }

    async onEnemyDefeated(enemyType, level) {
        const xp = enemyType === 'boss' ? 200 : 20;
        const souls = enemyType === 'boss' ? 10 : 2;
        
        await this.awardXP({ gameXp: xp });
        await this.awardSoulFragments(souls, 'enemy_defeated', `Defeated ${enemyType}`);
    }

    async onDungeonComplete(dungeonId, floor, clearTimeSeconds) {
        const xp = 150 + (floor * 20);
        const timeBonus = Math.max(0, 300 - clearTimeSeconds) / 10;
        
        await this.awardXP({ 
            gameXp: xp + timeBonus, 
            masterXp: 75,
            playtimeSeconds: clearTimeSeconds
        });
    }

    async onLoreDiscovered(fragmentId, location) {
        await this.discoverLoreFragment(fragmentId, {
            location,
            context: 'dungeon_exploration'
        });
    }
}

// Export for use in games
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ScaryGamesAIIntegration,
        BackroomsPacmanIntegration,
        ShadowCrawlerIntegration
    };
}

// Also expose globally for browser
if (typeof window !== 'undefined') {
    window.ScaryGamesAIIntegration = ScaryGamesAIIntegration;
    window.BackroomsPacmanIntegration = BackroomsPacmanIntegration;
    window.ShadowCrawlerIntegration = ShadowCrawlerIntegration;
}
