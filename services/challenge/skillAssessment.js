/**
 * Player Skill Assessment Engine
 * Phase 5: AI-Powered Personalization
 * 
 * Multi-dimensional player profiling for challenge matching
 * Assesses reaction time, strategy, exploration, and combat skills
 * 
 * @module services/challenge/skillAssessment
 */

class SkillAssessment {
  /**
   * Create skill assessment engine
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.skillDimensions = config.skillDimensions || [
      'reaction',
      'strategy',
      'exploration',
      'combat',
      'puzzle',
      'stealth'
    ];
    
    this.playerProfiles = new Map(); // playerId -> skill profile
    this.gameMetrics = new Map(); // gameId -> skill requirements
    this.assessmentHistory = [];
  }

  /**
   * Assess player skill from game history
   * @param {string} playerId - Player ID
   * @param {Array} gameHistory - Game history
   * @returns {Object} Skill profile
   */
  async assessPlayerSkill(playerId, gameHistory) {
    const profile = {
      playerId,
      assessedAt: Date.now(),
      skills: {},
      overallRating: 0,
      playstyle: 'balanced',
      confidence: 0
    };
    
    // Initialize skill scores
    for (const dimension of this.skillDimensions) {
      profile.skills[dimension] = {
        rating: 5, // 1-10 scale
        gamesSampled: 0,
        trend: 'stable'
      };
    }
    
    // Analyze each game
    const skillScores = {};
    for (const dimension of this.skillDimensions) {
      skillScores[dimension] = [];
    }
    
    for (const game of gameHistory) {
      const gameSkills = await this.analyzeGamePerformance(game);
      
      for (const dimension of this.skillDimensions) {
        if (gameSkills[dimension]) {
          skillScores[dimension].push(gameSkills[dimension]);
          profile.skills[dimension].gamesSampled++;
        }
      }
    }
    
    // Calculate average skill ratings
    let totalRating = 0;
    let ratedDimensions = 0;
    
    for (const dimension of this.skillDimensions) {
      const scores = skillScores[dimension];
      if (scores.length > 0) {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        profile.skills[dimension].rating = Math.round(avgScore * 10) / 10;
        
        // Calculate trend
        if (scores.length >= 3) {
          const recent = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
          const older = scores.slice(0, -3).reduce((a, b) => a + b, 0) / (scores.length - 3);
          
          if (recent > older + 0.5) {
            profile.skills[dimension].trend = 'improving';
          } else if (recent < older - 0.5) {
            profile.skills[dimension].trend = 'declining';
          }
        }
        
        totalRating += profile.skills[dimension].rating;
        ratedDimensions++;
      }
    }
    
    // Calculate overall rating
    profile.overallRating = ratedDimensions > 0 ? 
      Math.round((totalRating / ratedDimensions) * 10) / 10 : 5;
    
    // Determine playstyle
    profile.playstyle = this.determinePlaystyle(profile.skills);
    
    // Calculate confidence based on sample size
    const totalGames = gameHistory.length;
    profile.confidence = Math.min(totalGames / 20, 1); // Max confidence at 20 games
    
    // Cache profile
    this.playerProfiles.set(playerId, profile);
    
    // Record assessment
    this.assessmentHistory.push({
      playerId,
      timestamp: Date.now(),
      overallRating: profile.overallRating,
      playstyle: profile.playstyle
    });
    
    return profile;
  }

  /**
   * Analyze performance in a single game
   * @param {Object} game - Game data
   * @returns {Object} Skill scores
   */
  async analyzeGamePerformance(game) {
    const skills = {};
    const gameType = game.gameType || 'general';
    
    // Reaction time assessment
    if (game.avgReactionTime) {
      // Faster reaction = higher score (normalize to 1-10)
      const reactionScore = Math.max(1, Math.min(10, 
        10 - (game.avgReactionTime / 200) * 10
      ));
      skills.reaction = reactionScore;
    }
    
    // Strategy assessment
    if (gameType === 'strategy' || gameType === 'puzzle') {
      const strategyMetrics = [
        game.completionRate || 0.5,
        game.optimalMovesRatio || 0.5,
        game.resourceEfficiency || 0.5
      ];
      skills.strategy = this.averageMetrics(strategyMetrics) * 10;
    }
    
    // Exploration assessment
    if (game.areaExplored !== undefined) {
      skills.exploration = Math.min(10, (game.areaExplored / 100) * 10);
    }
    if (game.secretsFound !== undefined) {
      const secretScore = Math.min(10, (game.secretsFound / game.totalSecrets) * 10);
      skills.exploration = (skills.exploration + secretScore) / 2;
    }
    
    // Combat assessment
    if (gameType === 'action' || gameType === 'combat') {
      const combatMetrics = [
        game.accuracy || 0.5,
        game.kdRatio || 1,
        game.damageTakenRatio || 0.5
      ];
      skills.combat = this.averageMetrics(combatMetrics) * 10;
    }
    
    // Puzzle assessment
    if (game.puzzlesSolved !== undefined) {
      const puzzleScore = Math.min(10, (game.puzzlesSolved / game.totalPuzzles) * 10);
      const hintUsage = game.hintsUsed ? 1 - (game.hintsUsed / game.totalPuzzles) : 0.5;
      skills.puzzle = ((puzzleScore + hintUsage) / 2) * 10;
    }
    
    // Stealth assessment
    if (gameType === 'stealth') {
      const stealthMetrics = [
        game.undetectedRatio || 0.5,
        game.silentTakedownsRatio || 0.5
      ];
      skills.stealth = this.averageMetrics(stealthMetrics) * 10;
    }
    
    return skills;
  }

  /**
   * Average multiple metrics
   */
  averageMetrics(metrics) {
    return metrics.reduce((sum, m) => sum + m, 0) / metrics.length;
  }

  /**
   * Determine player's dominant playstyle
   */
  determinePlaystyle(skills) {
    const maxSkill = Object.entries(skills)
      .sort((a, b) => b[1].rating - a[1].rating)[0];
    
    if (!maxSkill) return 'balanced';
    
    const [dimension, data] = maxSkill;
    
    // If top skill is significantly higher than others
    const ratings = Object.values(skills).map(s => s.rating);
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    
    if (data.rating > avgRating + 2) {
      return this.dimensionToPlaystyle(dimension);
    }
    
    return 'balanced';
  }

  /**
   * Convert skill dimension to playstyle name
   */
  dimensionToPlaystyle(dimension) {
    const mapping = {
      reaction: 'reflex',
      strategy: 'tactician',
      exploration: 'explorer',
      combat: 'warrior',
      puzzle: 'solver',
      stealth: 'shadow'
    };
    return mapping[dimension] || 'balanced';
  }

  /**
   * Get player skill profile
   * @param {string} playerId - Player ID
   * @returns {Object|null} Skill profile
   */
  getPlayerProfile(playerId) {
    return this.playerProfiles.get(playerId) || null;
  }

  /**
   * Calculate skill similarity between players
   * @param {string} player1 - Player 1 ID
   * @param {string} player2 - Player 2 ID
   * @returns {number} Similarity (0-1)
   */
  calculateSkillSimilarity(player1, player2) {
    const profile1 = this.playerProfiles.get(player1);
    const profile2 = this.playerProfiles.get(player2);
    
    if (!profile1 || !profile2) return 0;
    
    let totalDiff = 0;
    let comparedDimensions = 0;
    
    for (const dimension of this.skillDimensions) {
      const rating1 = profile1.skills[dimension]?.rating || 5;
      const rating2 = profile2.skills[dimension]?.rating || 5;
      
      totalDiff += Math.abs(rating1 - rating2);
      comparedDimensions++;
    }
    
    const avgDiff = totalDiff / comparedDimensions;
    return Math.max(0, 1 - (avgDiff / 10));
  }

  /**
   * Find players with similar skill
   * @param {string} playerId - Player ID
   * @param {Array} candidatePlayers - Candidate player IDs
   * @param {number} maxResults - Max results
   * @returns {Array} Similar players
   */
  findSimilarPlayers(playerId, candidatePlayers, maxResults = 10) {
    const similarities = [];
    
    for (const candidateId of candidatePlayers) {
      if (candidateId === playerId) continue;
      
      const similarity = this.calculateSkillSimilarity(playerId, candidateId);
      similarities.push({
        playerId: candidateId,
        similarity,
        profile: this.playerProfiles.get(candidateId)
      });
    }
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  /**
   * Get skill requirements for a game
   * @param {string} gameId - Game ID
   * @returns {Object} Skill requirements
   */
  getGameRequirements(gameId) {
    return this.gameMetrics.get(gameId) || this.getDefaultRequirements();
  }

  /**
   * Get default skill requirements
   */
  getDefaultRequirements() {
    return {
      reaction: 5,
      strategy: 5,
      exploration: 5,
      combat: 5,
      puzzle: 5,
      stealth: 5,
      difficulty: 'medium'
    };
  }

  /**
   * Predict player performance in a game
   * @param {string} playerId - Player ID
   * @param {string} gameId - Game ID
   * @returns {Object} Performance prediction
   */
  predictPerformance(playerId, gameId) {
    const playerProfile = this.playerProfiles.get(playerId);
    const gameRequirements = this.getGameRequirements(gameId);
    
    if (!playerProfile) {
      return {
        predictedCompletionRate: 0.5,
        predictedDifficulty: 'medium',
        confidence: 0
      };
    }
    
    // Calculate skill match
    let skillMatch = 0;
    let comparedSkills = 0;
    
    for (const dimension of this.skillDimensions) {
      const playerSkill = playerProfile.skills[dimension]?.rating || 5;
      const requiredSkill = gameRequirements[dimension] || 5;
      
      // How well player skill matches requirement
      const match = 1 - (Math.abs(playerSkill - requiredSkill) / 10);
      skillMatch += match;
      comparedSkills++;
    }
    
    const avgSkillMatch = skillMatch / comparedSkills;
    
    // Predict completion rate based on skill match
    const predictedCompletionRate = Math.min(0.95, Math.max(0.1, avgSkillMatch));
    
    // Predict difficulty
    let predictedDifficulty = 'medium';
    if (avgSkillMatch > 0.8) {
      predictedDifficulty = 'easy';
    } else if (avgSkillMatch < 0.4) {
      predictedDifficulty = 'hard';
    }
    
    return {
      predictedCompletionRate,
      predictedDifficulty,
      skillMatch: avgSkillMatch,
      confidence: playerProfile.confidence
    };
  }

  /**
   * Get assessment statistics
   */
  getStats() {
    const profiles = Array.from(this.playerProfiles.values());
    
    return {
      totalAssessments: this.assessmentHistory.length,
      avgOverallRating: profiles.length > 0 ?
        profiles.reduce((sum, p) => sum + p.overallRating, 0) / profiles.length : 5,
      playstyleDistribution: this.calculatePlaystyleDistribution(profiles),
      skillAverages: this.calculateSkillAverages(profiles)
    };
  }

  /**
   * Calculate playstyle distribution
   */
  calculatePlaystyleDistribution(profiles) {
    const distribution = {};
    profiles.forEach(p => {
      distribution[p.playstyle] = (distribution[p.playstyle] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Calculate skill averages
   */
  calculateSkillAverages(profiles) {
    const averages = {};
    
    for (const dimension of this.skillDimensions) {
      const ratings = profiles
        .map(p => p.skills[dimension]?.rating || 5)
        .filter(r => r > 0);
      
      averages[dimension] = ratings.length > 0 ?
        ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 5;
    }
    
    return averages;
  }
}

module.exports = SkillAssessment;
