/**
 * Workshop Integration System
 * Phase 8: User-Generated Content & Creator Economy
 * 
 * Steam Workshop-style submission and voting system
 */

class WorkshopIntegration {
  constructor() {
    this.items = new Map();
    this.submissions = new Map();
    this.userSubscriptions = new Map();
    this.creatorProfiles = new Map();
  }
  
  /**
   * Submit item to workshop
   */
  submitItem(userId, item) {
    const submission = {
      id: this.generateId('workshop'),
      userId,
      title: item.title,
      description: item.description,
      category: item.category,
      tags: item.tags || [],
      imageUrl: item.imageUrl,
      downloadUrl: item.downloadUrl,
      status: 'pending', // pending, approved, rejected
      votes: { up: 0, down: 0 },
      views: 0,
      downloads: 0,
      comments: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.submissions.set(submission.id, submission);
    
    // Update creator profile
    this.updateCreatorProfile(userId, submission);
    
    return submission;
  }
  
  /**
   * Vote on workshop item
   */
  voteItem(userId, itemId, voteType) {
    const item = this.submissions.get(itemId);
    if (!item) return { success: false };
    
    // Remove previous vote
    if (item.votes[userId]) {
      item.votes[item.votes[userId]]--;
    }
    
    // Add new vote
    item.votes[voteType]++;
    item.votes[userId] = voteType;
    
    return { success: true, votes: item.votes };
  }
  
  /**
   * Subscribe to item (favorite)
   */
  subscribeItem(userId, itemId) {
    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set());
    }
    
    this.userSubscriptions.get(userId).add(itemId);
    
    const item = this.submissions.get(itemId);
    if (item) item.subscribers = (item.subscribers || 0) + 1;
    
    return { success: true };
  }
  
  /**
   * Get trending items
   */
  getTrendingItems(limit = 10) {
    const items = Array.from(this.submissions.values())
      .filter(i => i.status === 'approved');
    
    // Calculate hot score (Reddit-style algorithm)
    items.forEach(item => {
      const age = (Date.now() - item.createdAt) / 3600000; // hours
      const score = item.votes.up - item.votes.down;
      item.hotScore = score / Math.pow(age + 2, 1.5);
    });
    
    return items.sort((a, b) => b.hotScore - a.hotScore).slice(0, limit);
  }
  
  generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  updateCreatorProfile(userId, submission) {
    if (!this.creatorProfiles.has(userId)) {
      this.creatorProfiles.set(userId, {
        userId,
        totalSubmissions: 0,
        totalVotes: 0,
        totalDownloads: 0,
        items: []
      });
    }
    
    const profile = this.creatorProfiles.get(userId);
    profile.totalSubmissions++;
    profile.items.push(submission.id);
  }
  
  getStats() {
    return {
      totalItems: this.submissions.size,
      activeCreators: this.creatorProfiles.size,
      totalSubscriptions: Array.from(this.userSubscriptions.values())
        .reduce((sum, s) => sum + s.size, 0)
    };
  }
}

module.exports = WorkshopIntegration;
