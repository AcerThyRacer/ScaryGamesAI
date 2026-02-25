/**
 * PHASE 14: CHALLENGE SYSTEM EVOLUTION
 * 
 * Endless engagement through daily/weekly challenges.
 * 
 * Features:
 * - Daily challenges (3 rotating per game)
 * - Weekly trials (harder challenges)
 * - Seasonal events
 * - Community goals
 * - Speedrun challenges
 * - Style challenges
 * - Challenge Points system
 * - Tiered rewards (Bronze → Platinum)
 * - Social features (sharing, competition)
 * - Works across ALL games
 * 
 * Target: +25% player retention
 */

export class ChallengeSystem {
  constructor(config = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || '/api/challenges',
      debug: config.debug || false
    };
    
    // Player challenge progress
    this.playerProgress = {
      challengePoints: 0,
      totalCompleted: 0,
      streaks: {
        daily: 0,
        weekly: 0
      },
      ranks: {
        bronze: 0,
        silver: 0,
        gold: 0,
        platinum: 0
      }
    };
    
    // Active challenges
    this.activeChallenges = {
      daily: [],
      weekly: [],
      seasonal: [],
      community: [],
      special: []
    };
    
    // Challenge history
    this.history = [];
    
    console.log('[Phase 14] CHALLENGE SYSTEM initialized');
  }

  async initialize() {
    console.log('[Phase 14] Initializing CHALLENGE SYSTEM...');
    
    // Generate daily challenges
    this.generateDailyChallenges();
    
    // Generate weekly trials
    this.generateWeeklyChallenges();
    
    // Check for seasonal events
    this.checkSeasonalEvents();
    
    console.log('[Phase 14] ✅ CHALLENGE SYSTEM ready');
  }

  generateDailyChallenges() {
    console.log('[Phase 14] Generating daily challenges...');
    
    const today = new Date().toDateString();
    
    // 3 rotating daily challenges per game
    const games = ['backrooms_pacman', 'hellaphobia', 'the_deep', 'blood_tetris'];
    
    this.activeChallenges.daily = [];
    
    for (const game of games) {
      const challenges = this.createDailyChallengesForGame(game);
      this.activeChallenges.daily.push(...challenges);
    }
    
    console.log(`[Phase 14] Generated ${this.activeChallenges.daily.length} daily challenges`);
  }

  createDailyChallengesForGame(gameId) {
    const challengeTemplates = {
      backrooms_pacman: [
        {
          id: 'bp_daily_1',
          title: 'First Steps',
          description: 'Complete your first run',
          type: 'completion',
          target: 1,
          reward: { points: 50, currency: 25 },
          difficulty: 'easy'
        },
        {
          id: 'bp_daily_2',
          title: 'Ghost Hunter',
          description: 'Defeat 20 ghosts',
          type: 'kills',
          target: 20,
          reward: { points: 75, currency: 40 },
          difficulty: 'medium'
        },
        {
          id: 'bp_daily_3',
          title: 'Speed Demon',
          description: 'Complete a run in under 5 minutes',
          type: 'speedrun',
          target: 300, // seconds
          reward: { points: 100, currency: 60 },
          difficulty: 'hard'
        }
      ],
      hellaphobia: [
        {
          id: 'h_daily_1',
          title: 'Dungeon Delver',
          description: 'Complete 3 levels',
          type: 'levels',
          target: 3,
          reward: { points: 60, currency: 30 },
          difficulty: 'easy'
        },
        {
          id: 'h_daily_2',
          title: 'Monster Slayer',
          description: 'Defeat 50 enemies',
          type: 'kills',
          target: 50,
          reward: { points: 80, currency: 45 },
          difficulty: 'medium'
        },
        {
          id: 'h_daily_3',
          title: 'Treasure Hunter',
          description: 'Find 10 secrets',
          type: 'collectibles',
          target: 10,
          reward: { points: 90, currency: 50 },
          difficulty: 'hard'
        }
      ]
      // ... more games
    };
    
    return challengeTemplates[gameId] || [];
  }

  generateWeeklyChallenges() {
    console.log('[Phase 14] Generating weekly challenges...');
    
    // Harder challenges with better rewards
    this.activeChallenges.weekly = [
      {
        id: 'weekly_1',
        title: 'Marathon Runner',
        description: 'Complete 10 runs across any games',
        type: 'marathon',
        target: 10,
        reward: { points: 500, currency: 250, cosmetic: 'rare' },
        difficulty: 'hard',
        expires: this.getEndOfWeek()
      },
      {
        id: 'weekly_2',
        title: 'Master Collector',
        description: 'Find 100 collectibles',
        type: 'collectibles',
        target: 100,
        reward: { points: 600, currency: 300, cosmetic: 'epic' },
        difficulty: 'hard',
        expires: this.getEndOfWeek()
      },
      {
        id: 'weekly_3',
        title: 'Unstoppable',
        description: 'Win 5 games without dying',
        type: 'perfection',
        target: 5,
        reward: { points: 750, currency: 400, cosmetic: 'legendary' },
        difficulty: 'very_hard',
        expires: this.getEndOfWeek()
      }
    ];
    
    console.log(`[Phase 14] Generated ${this.activeChallenges.weekly.length} weekly challenges`);
  }

  getEndOfWeek() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = 7 - dayOfWeek;
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek.getTime();
  }

  checkSeasonalEvents() {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    
    // Halloween event (October)
    if (month === 9) {
      this.activeChallenges.seasonal.push({
        id: 'halloween_2026',
        title: 'Halloween Horror Fest',
        description: 'Complete special Halloween challenges',
        startDate: new Date(now.getFullYear(), 9, 1).getTime(),
        endDate: new Date(now.getFullYear(), 9, 31).getTime(),
        challenges: [
          {
            title: 'Trick or Treat',
            description: 'Play 13 different horror games',
            reward: { points: 1300, currency: 666, cosmetic: 'halloween_exclusive' }
          }
        ]
      });
    }
    
    // Christmas event (December)
    if (month === 11) {
      this.activeChallenges.seasonal.push({
        id: 'christmas_2026',
        title: 'Nightmare Before Christmas',
        description: 'Holiday-themed horror challenges',
        startDate: new Date(now.getFullYear(), 11, 1).getTime(),
        endDate: new Date(now.getFullYear(), 11, 25).getTime(),
        challenges: [
          {
            title: '12 Days of Horror',
            description: 'Complete a challenge each day for 12 days',
            reward: { points: 2026, currency: 1000, cosmetic: 'christmas_exclusive' }
          }
        ]
      });
    }
  }

  // Challenge completion
  
  completeChallenge(challengeId) {
    const challenge = this.findChallenge(challengeId);
    if (!challenge) return false;
    
    console.log(`[Phase 14] Challenge completed: ${challenge.title}`);
    
    // Award rewards
    this.awardRewards(challenge.reward);
    
    // Update progress
    this.playerProgress.totalCompleted++;
    this.updateStreaks(challenge.type);
    
    // Track history
    this.history.push({
      challengeId: challengeId,
      completedAt: Date.now(),
      reward: challenge.reward
    });
    
    // Check for rank up
    this.checkRankUp();
    
    return true;
  }

  findChallenge(challengeId) {
    // Search all challenge categories
    for (const category of Object.values(this.activeChallenges)) {
      if (Array.isArray(category)) {
        const found = category.find(c => c.id === challengeId);
        if (found) return found;
      }
    }
    return null;
  }

  awardRewards(reward) {
    console.log('[Phase 14] Awarding rewards:', reward);
    
    // Add challenge points
    this.playerProgress.challengePoints += reward.points;
    
    // Add currency
    // In production, add to player's currency balance
    
    // Award cosmetics if applicable
    if (reward.cosmetic) {
      console.log(`[Phase 14] Unlocked cosmetic: ${reward.cosmetic}`);
    }
  }

  updateStreaks(challengeType) {
    // Update daily streak
    if (challengeType === 'daily') {
      const lastCompletion = this.history[this.history.length - 1]?.completedAt;
      const now = Date.now();
      
      if (lastCompletion) {
        const hoursSinceLast = (now - lastCompletion) / (1000 * 60 * 60);
        
        if (hoursSinceLast <= 24) {
          this.playerProgress.streaks.daily++;
          console.log(`[Phase 14] Daily streak: ${this.playerProgress.streaks.daily} days!`);
        } else {
          this.playerProgress.streaks.daily = 1; // Reset streak
          console.log('[Phase 14] Daily streak reset');
        }
      } else {
        this.playerProgress.streaks.daily = 1;
      }
    }
    
    // Update weekly streak
    if (challengeType === 'weekly') {
      this.playerProgress.streaks.weekly++;
      console.log(`[Phase 14] Weekly streak: ${this.playerProgress.streaks.weekly} weeks!`);
    }
  }

  checkRankUp() {
    const points = this.playerProgress.challengePoints;
    
    // Determine rank based on points
    let newRank = 'bronze';
    
    if (points >= 10000) newRank = 'platinum';
    else if (points >= 5000) newRank = 'gold';
    else if (points >= 2000) newRank = 'silver';
    
    // Track rank completions
    if (newRank !== this.getCurrentRank()) {
      console.log(`[Phase 14] Rank up! ${this.getCurrentRank()} → ${newRank}`);
      this.playerProgress.ranks[newRank]++;
    }
  }

  getCurrentRank() {
    const points = this.playerProgress.challengePoints;
    
    if (points >= 10000) return 'platinum';
    if (points >= 5000) return 'gold';
    if (points >= 2000) return 'silver';
    return 'bronze';
  }

  // Community Goals
  
  createCommunityGoal(goal) {
    this.activeChallenges.community.push({
      id: `community_${Date.now()}`,
      title: goal.title,
      description: goal.description,
      type: 'community',
      individualTarget: goal.individualTarget,
      communityTarget: goal.communityTarget,
      currentProgress: 0,
      reward: goal.reward,
      expires: goal.expires
    });
    
    console.log('[Phase 14] Community goal created:', goal.title);
  }

  contributeToCommunityGoal(goalId, contribution) {
    const goal = this.activeChallenges.community.find(g => g.id === goalId);
    if (!goal) return false;
    
    goal.currentProgress += contribution;
    
    console.log(`[Phase 14] Contributed ${contribution} to ${goal.title}`);
    console.log(`Progress: ${goal.currentProgress} / ${goal.communityTarget}`);
    
    // Check if goal completed
    if (goal.currentProgress >= goal.communityTarget) {
      this.completeCommunityGoal(goal);
    }
    
    return true;
  }

  completeCommunityGoal(goal) {
    console.log(`[Phase 14] 🎉 COMMUNITY GOAL COMPLETE: ${goal.title}!`);
    
    // Award rewards to all contributors
    // In production, distribute to all participating players
    
    // Remove from active challenges
    const index = this.activeChallenges.community.indexOf(goal);
    if (index > -1) {
      this.activeChallenges.community.splice(index, 1);
    }
  }

  // Speedrun Challenges
  
  createSpeedrunChallenge(gameId, category) {
    return {
      id: `speedrun_${gameId}_${category}`,
      title: `${gameId} Speedrun`,
      description: `Complete ${gameId} as fast as possible`,
      type: 'speedrun',
      category: category, // any%, 100%, etc.
      leaderboard: [],
      reward: {
        points: 1000,
        currency: 500,
        cosmetic: 'speedrunner_title',
        exclusive: true
      }
    };
  }

  submitSpeedrun(gameId, time, category) {
    console.log(`[Phase 14] Speedrun submitted: ${gameId} ${category} in ${time}ms`);
    
    // Add to leaderboard
    // In production, verify run and add to global leaderboard
    
    return true;
  }

  // Style Challenges
  
  createStyleChallenge(gameId, styleRequirements) {
    return {
      id: `style_${gameId}_${Date.now()}`,
      title: 'Style Master',
      description: 'Complete with specific style requirements',
      type: 'style',
      requirements: styleRequirements,
      reward: {
        points: 500,
        currency: 250,
        cosmetic: 'stylish_emote'
      }
    };
  }

  // Social Features
  
  shareChallengeCompletion(challengeId) {
    const challenge = this.findChallenge(challengeId);
    if (!challenge) return;
    
    console.log(`[Phase 14] Sharing completion: ${challenge.title}`);
    
    // Create shareable content
    const shareData = {
      challenge: challenge.title,
      reward: challenge.reward,
      completedAt: new Date().toISOString(),
      playerRank: this.getCurrentRank()
    };
    
    // In production, generate image/video for social media
    console.log('[Phase 14] Share data:', shareData);
  }

  challengeFriend(friendId, challengeId) {
    console.log(`[Phase 14] Challenging friend ${friendId} to ${challengeId}`);
    
    // Send challenge notification to friend
    // In production, send push notification/email
  }

  compareWithFriends(friendIds) {
    const comparison = {
      myPoints: this.playerProgress.challengePoints,
      myRank: this.getCurrentRank(),
      friends: []
    };
    
    for (const friendId of friendIds) {
      // In production, fetch friend's challenge data
      comparison.friends.push({
        id: friendId,
        points: Math.floor(Math.random() * 10000),
        rank: ['bronze', 'silver', 'gold', 'platinum'][Math.floor(Math.random() * 4)]
      });
    }
    
    comparison.friends.sort((a, b) => b.points - a.points);
    
    console.log('[Phase 14] Friend comparison:', comparison);
    return comparison;
  }

  // Reward tiers
  
  getRewardTier(points) {
    if (points >= 100) return 'platinum';
    if (points >= 75) return 'gold';
    if (points >= 50) return 'silver';
    return 'bronze';
  }

  calculateBonusMultiplier() {
    let multiplier = 1.0;
    
    // Daily streak bonus
    if (this.playerProgress.streaks.daily >= 7) {
      multiplier += 0.5; // 50% bonus
    }
    
    // Weekly streak bonus
    if (this.playerProgress.streaks.weekly >= 4) {
      multiplier += 0.3; // 30% bonus
    }
    
    // Rank bonus
    const rank = this.getCurrentRank();
    if (rank === 'platinum') multiplier += 0.4;
    else if (rank === 'gold') multiplier += 0.2;
    else if (rank === 'silver') multiplier += 0.1;
    
    return multiplier;
  }

  // Progress tracking
  
  getProgress() {
    return {
      points: this.playerProgress.challengePoints,
      rank: this.getCurrentRank(),
      totalCompleted: this.playerProgress.totalCompleted,
      dailyStreak: this.playerProgress.streaks.daily,
      weeklyStreak: this.playerProgress.streaks.weekly,
      activeChallenges: this.getActiveChallengeCount()
    };
  }

  getActiveChallengeCount() {
    let count = 0;
    for (const category of Object.values(this.activeChallenges)) {
      if (Array.isArray(category)) {
        count += category.length;
      }
    }
    return count;
  }

  async saveProgress() {
    try {
      localStorage.setItem('challenge_progress', JSON.stringify(this.playerProgress));
      localStorage.setItem('challenge_history', JSON.stringify(this.history));
      console.log('[Phase 14] Progress saved');
    } catch (error) {
      console.error('[Phase 14] Save failed:', error);
    }
  }

  dispose() {
    this.saveProgress();
    console.log('[Phase 14] CHALLENGE SYSTEM disposed');
  }
}

// Export singleton helper
let challengeSystemInstance = null;

export function getChallengeSystem(config) {
  if (!challengeSystemInstance) {
    challengeSystemInstance = new ChallengeSystem(config);
  }
  return challengeSystemInstance;
}

console.log('[Phase 14] CHALLENGE SYSTEM module loaded');
