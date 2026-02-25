/**
 * Cosmetic Design Contest System
 * Phase 8: User-Generated Content & Creator Economy
 * 
 * Monthly design contests with community voting
 * Winning designs become real cosmetics with creator royalties
 */

class DesignContestSystem {
  constructor(config = {}) {
    this.contests = new Map();
    this.submissions = new Map();
    this.votes = new Map();
    this.winningDesigns = new Map();
    this.creatorRoyalties = new Map();
  }
  
  /**
   * Create monthly design contest
   */
  createContest(config) {
    const contest = {
      id: config.id || `contest_${Date.now()}`,
      theme: config.theme,
      title: config.title || `${config.theme} Design Contest`,
      description: config.description,
      category: config.category, // skin, effect, emote, weapon
      status: 'open', // open, voting, completed, awarded
      submissionDeadline: config.submissionDeadline,
      votingDeadline: config.votingDeadline,
      prizePool: config.prizePool || {
        first: 5000, // gems
        second: 2000,
        third: 1000,
        royaltyRate: 0.10 // 10% of sales
      },
      judges: config.judges || [], // Dev team + community leaders
      maxSubmissions: config.maxSubmissions || 1000,
      currentSubmissions: 0,
      rules: config.rules || [
        'Original designs only',
        'No copyrighted material',
        'Must fit theme',
        'One submission per user'
      ],
      submissionGuidelines: config.guidelines || {},
      createdAt: Date.now()
    };
    
    this.contests.set(contest.id, contest);
    return contest;
  }
  
  /**
   * Submit design to contest
   */
  submitDesign(userId, contestId, design) {
    const contest = this.contests.get(contestId);
    if (!contest || contest.status !== 'open') {
      return { success: false, error: 'Contest not open' };
    }
    
    if (contest.currentSubmissions >= contest.maxSubmissions) {
      return { success: false, error: 'Contest full' };
    }
    
    // Check if user already submitted
    const existingSubmission = Array.from(this.submissions.values())
      .find(s => s.contestId === contestId && s.userId === userId);
    
    if (existingSubmission) {
      return { success: false, error: 'Already submitted' };
    }
    
    const submission = {
      id: this.generateId('sub'),
      contestId,
      userId,
      design: {
        name: design.name,
        description: design.description,
        imageUrl: design.imageUrl,
        thumbnailUrl: design.thumbnailUrl,
        designFile: design.designFile, // PSD, PNG, etc.
        conceptArt: design.conceptArt
      },
      votes: 0,
      voteScore: 0, // Weighted score
      judgeScore: 0,
      finalScore: 0,
      rank: null,
      status: 'pending_review',
      submittedAt: Date.now()
    };
    
    this.submissions.set(submission.id, submission);
    contest.currentSubmissions++;
    
    return { success: true, submission };
  }
  
  /**
   * Vote on submission (community voting)
   */
  voteSubmission(userId, submissionId, voteType = 'upvote') {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      return { success: false, error: 'Submission not found' };
    }
    
    const contest = this.contests.get(submission.contestId);
    if (!contest || contest.status !== 'voting') {
      return { success: false, error: 'Voting not active' };
    }
    
    // Check if already voted
    const userVote = this.votes.get(`${userId}_${submissionId}`);
    if (userVote) {
      return { success: false, error: 'Already voted' };
    }
    
    // Record vote
    const vote = {
      userId,
      submissionId,
      voteType,
      timestamp: Date.now()
    };
    
    this.votes.set(`${userId}_${submissionId}`, vote);
    
    // Update submission votes
    submission.votes += voteType === 'upvote' ? 1 : -1;
    submission.voteScore = submission.votes;
    
    return { success: true, vote };
  }
  
  /**
   * Judge scoring (dev team + community leaders)
   */
  judgeSubmission(judgeId, submissionId, scores) {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      return { success: false, error: 'Submission not found' };
    }
    
    const contest = this.contests.get(submission.contestId);
    if (!contest || !contest.judges.includes(judgeId)) {
      return { success: false, error: 'Not authorized' };
    }
    
    // Scoring criteria (1-10 each)
    const criteria = {
      creativity: scores.creativity || 5,
      theme: scores.theme || 5,
      quality: scores.quality || 5,
      marketability: scores.marketability || 5
    };
    
    const averageScore = (criteria.creativity + criteria.theme + criteria.quality + criteria.marketability) / 4;
    
    submission.judgeScore = averageScore;
    
    // Calculate final score (70% community, 30% judges)
    submission.finalScore = (submission.voteScore * 0.7) + (submission.judgeScore * 10 * 0.3);
    
    return { success: true, scores: criteria, averageScore };
  }
  
  /**
   * End contest and determine winners
   */
  endContest(contestId) {
    const contest = this.contests.get(contestId);
    if (!contest) {
      return { success: false, error: 'Contest not found' };
    }
    
    contest.status = 'completed';
    
    // Get all submissions for contest
    const contestSubmissions = Array.from(this.submissions.values())
      .filter(s => s.contestId === contestId)
      .sort((a, b) => b.finalScore - a.finalScore);
    
    // Assign ranks
    contestSubmissions.forEach((submission, index) => {
      submission.rank = index + 1;
      
      if (index === 0) {
        // First place - becomes real cosmetic with royalty
        this.createWinningCosmetic(submission, contest);
      }
    });
    
    // Award prizes
    this.awardPrizes(contestSubmissions.slice(0, 3), contest.prizePool);
    
    return {
      success: true,
      winners: contestSubmissions.slice(0, 3),
      totalSubmissions: contestSubmissions.length
    };
  }
  
  /**
   * Create winning design as real cosmetic
   */
  createWinningCosmetic(submission, contest) {
    const cosmetic = {
      id: this.generateId('cosmetic'),
      name: submission.design.name,
      type: contest.category,
      description: `${submission.design.description}\n\nWinner: ${contest.theme} Contest`,
      creatorId: submission.userId,
      contestId: contest.id,
      imageUrl: submission.design.imageUrl,
      rarity: 'legendary',
      price: 14.99,
      royaltyRate: contest.prizePool.royaltyRate,
      totalSales: 0,
      totalRevenue: 0,
      creatorEarnings: 0,
      isLimitedEdition: true,
      editionSize: 10000,
      soldCount: 0,
      createdAt: Date.now()
    };
    
    this.winningDesigns.set(cosmetic.id, cosmetic);
    
    // Setup royalty tracking
    this.creatorRoyalties.set(submission.userId, {
      userId: submission.userId,
      cosmetics: [cosmetic.id],
      totalEarnings: 0,
      lastPayout: null
    });
    
    return cosmetic;
  }
  
  /**
   * Award prizes to top 3
   */
  awardPrizes(winners, prizePool) {
    winners.forEach((submission, index) => {
      const prize = index === 0 ? prizePool.first :
                   index === 1 ? prizePool.second :
                   prizePool.third;
      
      // Award gems to creator
      this.awardGems(submission.userId, prize);
    });
  }
  
  /**
   * Track cosmetic sale and calculate royalty
   */
  trackCosmeticSale(cosmeticId) {
    const cosmetic = this.winningDesigns.get(cosmeticId);
    if (!cosmetic) return;
    
    cosmetic.totalSales++;
    cosmetic.totalRevenue += cosmetic.price;
    cosmetic.soldCount++;
    
    const royalty = cosmetic.price * cosmetic.royaltyRate;
    cosmetic.creatorEarnings += royalty;
    
    // Update creator royalties
    const creatorRoyalty = this.creatorRoyalties.get(cosmetic.creatorId);
    if (creatorRoyalty) {
      creatorRoyalty.totalEarnings += royalty;
    }
  }
  
  /**
   * Get contest entries
   */
  getContestEntries(contestId, limit = 20, sortBy = 'votes') {
    const entries = Array.from(this.submissions.values())
      .filter(s => s.contestId === contestId);
    
    entries.sort((a, b) => {
      if (sortBy === 'votes') return b.votes - a.votes;
      if (sortBy === 'score') return b.finalScore - a.finalScore;
      if (sortBy === 'newest') return b.submittedAt - a.submittedAt;
      return 0;
    });
    
    return entries.slice(0, limit);
  }
  
  /**
   * Get user submissions
   */
  getUserSubmissions(userId) {
    return Array.from(this.submissions.values())
      .filter(s => s.userId === userId);
  }
  
  /**
   * Award gems
   */
  awardGems(userId, amount) {
    console.log(`[Contest] Awarded ${amount} gems to ${userId}`);
  }
  
  /**
   * Generate unique ID
   */
  generateId(prefix = 'contest') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get contest statistics
   */
  getStats() {
    const contests = Array.from(this.contests.values());
    const submissions = Array.from(this.submissions.values());
    const winningDesigns = Array.from(this.winningDesigns.values());
    
    return {
      totalContests: contests.length,
      activeContests: contests.filter(c => c.status === 'open').length,
      totalSubmissions: submissions.length,
      totalWinningDesigns: winningDesigns.length,
      totalCreatorEarnings: winningDesigns.reduce((sum, c) => sum + c.creatorEarnings, 0),
      totalRoyaltiesPaid: Array.from(this.creatorRoyalties.values())
        .reduce((sum, r) => sum + r.totalEarnings, 0)
    };
  }
}

module.exports = DesignContestSystem;
