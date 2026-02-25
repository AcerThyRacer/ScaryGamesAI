/**
 * Rival Matching System
 * Phase 5: AI-Powered Personalization
 * 
 * Matches players with similar-skill rivals for competitive challenges
 * 
 * @module services/challenge/rivalMatcher
 */

class RivalMatcher {
  constructor(config = {}) {
    this.playerPool = new Map();
    this.activeRivalries = new Map();
    this.matchHistory = [];
    this.minSimilarity = config.minSimilarity || 0.7;
  }

  /**
   * Find rival for player
   */
  async findRival(playerId, playerProfile, skillAssessment) {
    const candidates = Array.from(this.playerPool.entries())
      .filter(([id]) => id !== playerId);
    
    const similarities = [];
    
    for (const [candidateId, candidateProfile] of candidates) {
      const similarity = skillAssessment.calculateSkillSimilarity(playerId, candidateId);
      
      if (similarity >= this.minSimilarity) {
        similarities.push({
          playerId: candidateId,
          similarity,
          profile: candidateProfile
        });
      }
    }
    
    if (similarities.length === 0) {
      return null;
    }
    
    // Sort by similarity and return best match
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities[0];
  }

  /**
   * Create rivalry
   */
  createRivalry(player1Id, player2Id, challengeId) {
    const rivalryId = `rivalry_${Date.now()}_${player1Id}_${player2Id}`;
    
    this.activeRivalries.set(rivalryId, {
      id: rivalryId,
      player1: player1Id,
      player2: player2Id,
      challengeId,
      createdAt: Date.now(),
      status: 'active',
      scores: { [player1Id]: 0, [player2Id]: 0 }
    });
    
    return rivalryId;
  }

  /**
   * Update rivalry score
   */
  updateScore(rivalryId, playerId, score) {
    const rivalry = this.activeRivalries.get(rivalryId);
    if (!rivalry) return false;
    
    rivalry.scores[playerId] = score;
    return true;
  }

  getStats() {
    return {
      playersInPool: this.playerPool.size,
      activeRivalries: this.activeRivalries.size,
      totalMatches: this.matchHistory.length
    };
  }
}

module.exports = RivalMatcher;
