/**
 * Narrative Campaign System
 * Phase 6: Live Events & Seasonal Content
 * 
 * Story-driven campaigns with branching narratives
 * ARG integration and community mysteries
 * 
 * @module services/narrativeCampaign
 */

class NarrativeCampaignSystem {
  /**
   * Create narrative campaign system
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.campaigns = new Map();
    this.userProgress = new Map();
    this.storyNodes = new Map();
    this.argPuzzles = new Map();
    
    this.campaignTemplates = {
      horror_mystery: {
        chapters: 3,
        duration: 2592000000, // 30 days
        genre: 'horror'
      },
      sci_fi_saga: {
        chapters: 5,
        duration: 4320000000, // 50 days
        genre: 'sci-fi'
      }
    };
  }
  
  /**
   * Create a narrative campaign
   */
  createCampaign(config) {
    const campaignId = this.generateId('campaign');
    
    const campaign = {
      id: campaignId,
      name: config.name,
      description: config.description,
      genre: config.genre || 'horror',
      
      // Story structure
      chapters: config.chapters || [],
      totalChapters: config.chapters.length,
      
      // Branching narrative
      branchingPoints: config.branchingPoints || [],
      
      // ARG elements
      argIntegration: config.argIntegration ? {
        enabled: true,
        puzzles: config.argIntegration.puzzles || [],
        realWorldLocations: config.argIntegration.locations || [],
        qrCodes: config.argIntegration.qrCodes || [],
        socialMediaHandles: config.argIntegration.socialMedia || []
      } : null,
      
      // Choices and consequences
      choiceSystem: config.choiceSystem || {
        enabled: false,
        majorChoices: [],
        consequences: []
      },
      
      // Rewards
      chapterRewards: config.chapterRewards || [],
      endingRewards: config.endingRewards || [],
      
      // Endings
      endings: config.endings || [],
      
      // Characters
      characters: config.characters || [],
      
      // Lore entries
      loreEntries: config.loreEntries || [],
      
      // Timing
      startDate: config.startDate || Date.now(),
      endDate: config.endDate || (Date.now() + config.duration),
      
      // Status
      status: 'scheduled',
      createdAt: Date.now()
    };
    
    // Build story nodes
    this.buildStoryNodes(campaign);
    
    // Store campaign
    this.campaigns.set(campaignId, campaign);
    
    console.log(`[Narrative] Created campaign: ${campaign.name}`);
    return campaign;
  }
  
  /**
   * Build story nodes from chapters
   */
  buildStoryNodes(campaign) {
    campaign.chapters.forEach((chapter, index) => {
      const nodeId = this.generateId('node');
      
      this.storyNodes.set(nodeId, {
        id: nodeId,
        campaignId: campaign.id,
        chapterIndex: index,
        title: chapter.title,
        content: chapter.content,
        choices: chapter.choices || [],
        nextNodes: chapter.nextNodes || [],
        requirements: chapter.requirements || [],
        rewards: chapter.rewards || []
      });
    });
  }
  
  /**
   * Get campaign progress for user
   */
  getUserProgress(userId, campaignId) {
    const key = `${userId}_${campaignId}`;
    
    if (!this.userProgress.has(key)) {
      this.userProgress.set(key, {
        userId,
        campaignId,
        currentChapter: 0,
        completedChapters: [],
        choices: [],
        loreCollected: [],
        puzzlesSolved: [],
        ending: null,
        startedAt: Date.now(),
        lastActiveAt: Date.now()
      });
    }
    
    return this.userProgress.get(key);
  }
  
  /**
   * Advance campaign chapter
   */
  advanceChapter(userId, campaignId) {
    const progress = this.getUserProgress(userId, campaignId);
    const campaign = this.campaigns.get(campaignId);
    
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }
    
    if (progress.currentChapter >= campaign.totalChapters) {
      return { success: false, error: 'Campaign already completed' };
    }
    
    // Check requirements
    const currentChapter = campaign.chapters[progress.currentChapter];
    if (currentChapter.requirements) {
      const met = this.checkChapterRequirements(progress, currentChapter.requirements);
      if (!met) {
        return { success: false, error: 'Requirements not met' };
      }
    }
    
    // Complete chapter
    progress.completedChapters.push(progress.currentChapter);
    progress.currentChapter++;
    progress.lastActiveAt = Date.now();
    
    // Award rewards
    const rewards = campaign.chapterRewards[progress.completedChapters.length - 1];
    
    return {
      success: true,
      progress,
      rewards,
      nextChapter: campaign.chapters[progress.currentChapter]
    };
  }
  
  /**
   * Make a story choice
   */
  makeChoice(userId, campaignId, nodeId, choiceId) {
    const progress = this.getUserProgress(userId, campaignId);
    const node = this.storyNodes.get(nodeId);
    
    if (!node) {
      return { success: false, error: 'Story node not found' };
    }
    
    const choice = node.choices.find(c => c.id === choiceId);
    if (!choice) {
      return { success: false, error: 'Choice not found' };
    }
    
    // Record choice
    progress.choices.push({
      nodeId,
      choiceId,
      timestamp: Date.now()
    });
    
    // Apply consequences
    if (choice.consequences) {
      this.applyConsequences(progress, choice.consequences);
    }
    
    return {
      success: true,
      nextNode: choice.nextNode,
      consequences: choice.consequences
    };
  }
  
  /**
   * Check chapter requirements
   */
  checkChapterRequirements(progress, requirements) {
    for (const req of requirements) {
      switch (req.type) {
        case 'min_chapters':
          if (progress.completedChapters.length < req.count) return false;
          break;
        case 'lore_collected':
          const collectedCount = progress.loreCollected.length;
          if (collectedCount < req.count) return false;
          break;
        case 'puzzles_solved':
          const solvedCount = progress.puzzlesSolved.length;
          if (solvedCount < req.count) return false;
          break;
      }
    }
    return true;
  }
  
  /**
   * Apply choice consequences
   */
  applyConsequences(progress, consequences) {
    consequences.forEach(consequence => {
      switch (consequence.type) {
        case 'unlock_node':
          // Unlock story node
          break;
        case 'lock_node':
          // Lock story node
          break;
        case 'add_lore':
          progress.loreCollected.push(consequence.loreId);
          break;
        case 'modify_stat':
          // Modify character stat
          break;
      }
    });
  }
  
  /**
   * Create ARG puzzle
   */
  createARGPuzzle(config) {
    const puzzleId = this.generateId('arg');
    
    const puzzle = {
      id: puzzleId,
      type: config.type, // cipher, qr_code, audio, video, image
      difficulty: config.difficulty || 'medium',
      content: config.content,
      hint: config.hint,
      solution: config.solution,
      reward: config.reward,
      location: config.location, // real-world or in-game
      campaignId: config.campaignId,
      
      // Tracking
      solvedBy: [],
      firstSolveAt: null,
      createdAt: Date.now()
    };
    
    this.argPuzzles.set(puzzleId, puzzle);
    return puzzle;
  }
  
  /**
   * Solve ARG puzzle
   */
  solvePuzzle(userId, puzzleId, solution) {
    const puzzle = this.argPuzzles.get(puzzleId);
    if (!puzzle) {
      return { success: false, error: 'Puzzle not found' };
    }
    
    // Check if already solved
    if (puzzle.solvedBy.includes(userId)) {
      return { success: false, error: 'Already solved' };
    }
    
    // Verify solution
    const isCorrect = this.verifySolution(solution, puzzle.solution);
    if (!isCorrect) {
      return { success: false, error: 'Incorrect solution' };
    }
    
    // Mark as solved
    puzzle.solvedBy.push(userId);
    if (!puzzle.firstSolveAt) {
      puzzle.firstSolveAt = Date.now();
    }
    
    // Update user progress
    const progress = this.getUserProgress(userId, puzzle.campaignId);
    progress.puzzlesSolved.push(puzzleId);
    
    return {
      success: true,
      reward: puzzle.reward,
      isFirstSolver: puzzle.solvedBy.length === 1
    };
  }
  
  /**
   * Verify puzzle solution
   */
  verifySolution(userSolution, correctSolution) {
    // Normalize solutions for comparison
    const normalize = (str) => str.toLowerCase().trim();
    return normalize(userSolution) === normalize(correctSolution);
  }
  
  /**
   * Get lore entry
   */
  getLoreEntry(campaignId, entryId) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;
    
    return campaign.loreEntries.find(entry => entry.id === entryId);
  }
  
  /**
   * Collect lore entry
   */
  collectLore(userId, campaignId, entryId) {
    const progress = this.getUserProgress(userId, campaignId);
    
    if (!progress.loreCollected.includes(entryId)) {
      progress.loreCollected.push(entryId);
    }
    
    return {
      success: true,
      lore: this.getLoreEntry(campaignId, entryId),
      totalCollected: progress.loreCollected.length
    };
  }
  
  /**
   * Determine campaign ending
   */
  determineEnding(userId, campaignId) {
    const progress = this.getUserProgress(userId, campaignId);
    const campaign = this.campaigns.get(campaignId);
    
    if (!campaign || progress.currentChapter < campaign.totalChapters) {
      return null;
    }
    
    // Determine ending based on choices
    const endingId = this.calculateEnding(progress, campaign.endings);
    progress.ending = endingId;
    
    return campaign.endings.find(e => e.id === endingId);
  }
  
  /**
   * Calculate which ending user gets
   */
  calculateEnding(progress, endings) {
    // Simple heuristic: count choice types
    const choiceCounts = {};
    
    progress.choices.forEach(choice => {
      choiceCounts[choice.choiceId] = (choiceCounts[choice.choiceId] || 0) + 1;
    });
    
    // Match to ending requirements
    for (const ending of endings) {
      if (ending.requirements) {
        const met = ending.requirements.every(req => {
          return choiceCounts[req.choiceId] >= req.count;
        });
        
        if (met) {
          return ending.id;
        }
      }
    }
    
    // Default ending
    return endings.find(e => e.isDefault)?.id || endings[0]?.id;
  }
  
  /**
   * Generate unique ID
   */
  generateId(prefix = 'narr') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get campaign statistics
   */
  getStats() {
    const campaigns = Array.from(this.campaigns.values());
    
    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalProgressions: this.userProgress.size,
      totalPuzzles: this.argPuzzles.size,
      avgCompletionRate: this.calculateAvgCompletionRate(campaigns)
    };
  }
  
  /**
   * Calculate average completion rate
   */
  calculateAvgCompletionRate(campaigns) {
    if (campaigns.length === 0) return 0;
    
    const rates = campaigns.map(c => {
      const completions = Array.from(this.userProgress.values())
        .filter(p => p.campaignId === c.id && p.ending !== null).length;
      const started = Array.from(this.userProgress.values())
        .filter(p => p.campaignId === c.id).length;
      
      return started > 0 ? completions / started : 0;
    });
    
    return rates.reduce((sum, r) => sum + r, 0) / rates.length;
  }
}

module.exports = NarrativeCampaignSystem;
