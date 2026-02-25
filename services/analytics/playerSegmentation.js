/**
 * Player Segmentation Engine
 * Phase 5: AI-Powered Personalization
 * 
 * RFM analysis and K-means clustering for player segmentation
 * 
 * @module services/analytics/playerSegmentation
 */

class PlayerSegmentation {
  constructor(config = {}) {
    this.segments = new Map();
    this.playerAssignments = new Map();
    this.segmentDefinitions = {
      newbies: { description: 'New players, learning the ropes' },
      casual: { description: 'Occasional players, low spending' },
      regular: { description: 'Consistent players, moderate engagement' },
      grinder: { description: 'High playtime, achievement-focused' },
      whale: { description: 'High spenders, valuable customers' },
      at_risk: { description: 'Previously active, now declining' },
      churned: { description: 'No longer active' }
    };
  }

  /**
   * Segment player using RFM analysis
   */
  segmentPlayer(player) {
    const rfm = this.calculateRFM(player);
    const segment = this.assignSegment(rfm, player);
    
    this.playerAssignments.set(player.id, {
      segment,
      rfm,
      timestamp: Date.now()
    });
    
    return segment;
  }

  /**
   * Calculate RFM scores
   */
  calculateRFM(player) {
    // Recency: Days since last session
    const lastSession = player.lastSessionAt ? 
      (Date.now() - new Date(player.lastSessionAt).getTime()) / 86400000 : 999;
    
    const recencyScore = lastSession <= 1 ? 5 :
                        lastSession <= 3 ? 4 :
                        lastSession <= 7 ? 3 :
                        lastSession <= 14 ? 2 : 1;
    
    // Frequency: Sessions in last 30 days
    const sessionsLast30Days = (player.sessions || [])
      .filter(s => Date.now() - s.timestamp < 30 * 86400000)
      .length;
    
    const frequencyScore = sessionsLast30Days >= 20 ? 5 :
                          sessionsLast30Days >= 10 ? 4 :
                          sessionsLast30Days >= 5 ? 3 :
                          sessionsLast30Days >= 2 ? 2 : 1;
    
    // Monetary: Total spending
    const totalSpending = player.totalSpending || 0;
    
    const monetaryScore = totalSpending >= 100 ? 5 :
                         totalSpending >= 50 ? 4 :
                         totalSpending >= 20 ? 3 :
                         totalSpending >= 5 ? 2 : 1;
    
    return {
      recency: recencyScore,
      frequency: frequencyScore,
      monetary: monetaryScore,
      rfmScore: recencyScore * 100 + frequencyScore * 10 + monetaryScore
    };
  }

  /**
   * Assign segment based on RFM
   */
  assignSegment(rfm, player) {
    // New player
    if ((player.totalSessions || 0) < 3) {
      return 'newbies';
    }
    
    // Churned
    if (rfm.recency === 1) {
      return 'churned';
    }
    
    // At risk
    if (rfm.recency <= 2 && rfm.frequency >= 3) {
      return 'at_risk';
    }
    
    // Whale
    if (rfm.monetary >= 5) {
      return 'whale';
    }
    
    // Grinder
    if (rfm.frequency >= 4 && (player.totalPlaytime || 0) > 100) {
      return 'grinder';
    }
    
    // Regular
    if (rfm.frequency >= 3 && rfm.recency >= 3) {
      return 'regular';
    }
    
    // Casual
    return 'casual';
  }

  getStats() {
    const distribution = {};
    for (const segment of this.segmentDefinitions.keys()) {
      distribution[segment] = 0;
    }
    
    for (const [, assignment] of this.playerAssignments.entries()) {
      distribution[assignment.segment] = (distribution[assignment.segment] || 0) + 1;
    }
    
    return { distribution, totalPlayers: this.playerAssignments.size };
  }
}

module.exports = PlayerSegmentation;
