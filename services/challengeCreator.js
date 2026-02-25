/**
 * Custom Challenge Creator System
 * Phase 8: User-Generated Content & Creator Economy
 * 
 * Drag-and-drop challenge builder with sharing and monetization
 */

class ChallengeCreatorSystem {
  constructor() {
    this.challenges = new Map();
    this.templates = new Map();
    this.userChallenges = new Map();
    this.premiumChallenges = new Map();
  }
  
  /**
   * Create challenge using editor
   */
  createChallenge(userId, config) {
    const challenge = {
      id: this.generateId('challenge'),
      creatorId: userId,
      name: config.name,
      description: config.description,
      type: config.type, // custom, survival, speedrun, puzzle
      difficulty: config.difficulty || 'medium',
      
      // Challenge configuration
      objectives: config.objectives || [],
      rules: config.rules || [],
      winConditions: config.winConditions || [],
      loseConditions: config.loseConditions || [],
      
      // Rewards
      rewards: config.rewards || {
        completion: 100,
        timeBonus: 50,
        perfectBonus: 200
      },
      
      // Settings
      timeLimit: config.timeLimit,
      allowedItems: config.allowedItems || [],
      bannedItems: config.bannedItems || [],
      modifiers: config.modifiers || {},
      
      // Publishing
      isPublished: config.isPublished || false,
      isPremium: config.isPremium || false,
      price: config.price || 0,
      visibility: config.visibility || 'public', // public, friends, private
      
      // Analytics
      plays: 0,
      completions: 0,
      avgCompletionTime: 0,
      rating: 0,
      ratings: 0,
      
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.challenges.set(challenge.id, challenge);
    
    // Track user's challenges
    if (!this.userChallenges.has(userId)) {
      this.userChallenges.set(userId, []);
    }
    this.userChallenges.get(userId).push(challenge.id);
    
    return challenge;
  }
  
  /**
   * Play user-created challenge
   */
  playChallenge(playerId, challengeId) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return { success: false, error: 'Not found' };
    
    // Check if premium and not purchased
    if (challenge.isPremium && !this.isPurchased(playerId, challengeId)) {
      return { success: false, error: 'Purchase required' };
    }
    
    challenge.plays++;
    
    return {
      success: true,
      challenge,
      session: {
        id: this.generateId('session'),
        challengeId,
        playerId,
        startTime: Date.now()
      }
    };
  }
  
  /**
   * Complete challenge
   */
  completeChallenge(sessionId, playerId, challengeId, result) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return;
    
    if (result.completed) {
      challenge.completions++;
      
      // Update average completion time
      const totalTime = challenge.avgCompletionTime * (challenge.completions - 1);
      challenge.avgCompletionTime = (totalTime + result.time) / challenge.completions;
    }
    
    // Calculate and award rewards
    const rewards = this.calculateRewards(challenge, result);
    
    return { success: true, rewards };
  }
  
  /**
   * Rate challenge
   */
  rateChallenge(userId, challengeId, rating) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return;
    
    const totalRating = challenge.rating * challenge.ratings;
    challenge.ratings++;
    challenge.rating = (totalRating + rating) / challenge.ratings;
  }
  
  /**
   * Calculate rewards
   */
  calculateRewards(challenge, result) {
    let total = challenge.rewards.completion;
    
    if (result.time && challenge.timeLimit) {
      const timeBonus = (challenge.timeLimit - result.time) / challenge.timeLimit;
      if (timeBonus > 0.5) {
        total += challenge.rewards.timeBonus;
      }
    }
    
    if (result.perfect) {
      total += challenge.rewards.perfectBonus;
    }
    
    return total;
  }
  
  /**
   * Check if purchased
   */
  isPurchased(playerId, challengeId) {
    // Check database
    return false;
  }
  
  /**
   * Get user's created challenges
   */
  getUserChallenges(userId) {
    const challengeIds = this.userChallenges.get(userId) || [];
    return challengeIds.map(id => this.challenges.get(id)).filter(Boolean);
  }
  
  /**
   * Get trending challenges
   */
  getTrendingChallenges(limit = 10) {
    const challenges = Array.from(this.challenges.values())
      .filter(c => c.isPublished && c.visibility === 'public');
    
    // Calculate trending score
    challenges.forEach(c => {
      const age = (Date.now() - c.createdAt) / 86400000; // days
      c.trendingScore = (c.plays * 0.3 + c.completions * 0.5 + c.rating * 10) / (age + 1);
    });
    
    return challenges.sort((a, b) => b.trendingScore - a.trendingScore).slice(0, limit);
  }
  
  generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getStats() {
    const challenges = Array.from(this.challenges.values());
    return {
      totalChallenges: challenges.length,
      publishedChallenges: challenges.filter(c => c.isPublished).length,
      premiumChallenges: challenges.filter(c => c.isPremium).length,
      totalPlays: challenges.reduce((sum, c) => sum + c.plays, 0),
      avgRating: challenges.reduce((sum, c) => sum + c.rating, 0) / challenges.length
    };
  }
}

module.exports = ChallengeCreatorSystem;
