/**
 * Dynamic Challenge Generation API - Phase 1
 * AI-powered challenge generation, adaptive difficulty, cross-game integration
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const postgres = require('../models/postgres');
const observability = require('../services/observability');

// Base challenge definitions from all games
const BASE_CHALLENGES = require('../js/challenges').ALL_CHALLENGES || [];

// Difficulty tuning parameters
const DIFFICULTY_TARGETS = {
  easy: { completionRate: 0.8, multiplier: 0.7 },
  medium: { completionRate: 0.6, multiplier: 1.0 },
  hard: { completionRate: 0.4, multiplier: 1.5 },
  nightmare: { completionRate: 0.2, multiplier: 2.5 }
};

/**
 * GET /api/v1/challenges/daily
 * Get AI-generated daily challenges based on player skill
 */
router.get('/daily', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  const userId = req.user.id;

  try {
    let challenges = [];

    if (postgres.isEnabled()) {
      // Get player's skill assessment
      const skillResult = await postgres.query(
        `SELECT * FROM player_skill_assessments
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 30`,
        [userId]
      );

      // Get recent game sessions
      const sessionsResult = await postgres.query(
        `SELECT game_id, score, duration, completed
         FROM game_sessions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      );

      const skillAssessments = skillResult.rows;
      const sessions = sessionsResult.rows;

      // Calculate player skill profile
      const skillProfile = calculateSkillProfile(skillAssessments, sessions);

      // Get recent challenge completion history
      const challengeHistoryResult = await postgres.query(
        `SELECT metadata, created_at
         FROM entitlements
         WHERE user_id = $1
         AND metadata->>'source' = 'challenge_reward'
         ORDER BY created_at DESC
         LIMIT 20`,
        [userId]
      );

      const completedChallengeIds = challengeHistoryResult.rows.map(e => e.metadata?.challengeId);

      // Generate personalized daily challenges
      challenges = generateDailyChallenges(skillProfile, completedChallengeIds);

      // Record generation for analytics
      await recordChallengeGeneration(userId, 'daily', challenges);
    }

    observability.recordPerfEvent('challenges.daily.fetch', {
      durationMs: Date.now() - startedAt,
      challengeCount: challenges.length,
      userId
    });

    res.json({
      success: true,
      challenges,
      skillProfile,
      refreshAt: Date.now() + 86400000 // Refresh daily
    });
  } catch (error) {
    observability.recordPerfEvent('challenges.daily.fetch', {
      durationMs: Date.now() - startedAt,
      failed: true,
      userId
    }, { force: true });

    res.status(500).json({
      success: false,
      error: 'Unable to generate daily challenges'
    });
  }
});

/**
 * GET /api/v1/challenges/hot-streak
 * Get special "Hot Streak" challenges with bonus rewards
 */
router.get('/hot-streak', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  const userId = req.user.id;

  try {
    let hotStreakChallenges = [];

    if (postgres.isEnabled()) {
      // Check player's recent activity streak
      const streakResult = await postgres.query(
        `SELECT COUNT(DISTINCT DATE(created_at)) as streak_days
         FROM game_sessions
         WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '14 days'`,
        [userId]
      );

      const streakDays = streakResult.rows[0]?.streak_days || 0;

      // Get recently completed challenges
      const recentCompletionsResult = await postgres.query(
        `SELECT metadata, created_at
         FROM entitlements
         WHERE user_id = $1
         AND metadata->>'source' = 'challenge_reward'
         AND created_at >= NOW() - INTERVAL '7 days'
         ORDER BY created_at DESC`,
        [userId]
      );

      const recentCompletions = recentCompletionsResult.rows.length;

      // Generate hot streak challenges if player is active
      if (streakDays >= 3 || recentCompletions >= 5) {
        const multiplier = 1 + (Math.min(streakDays, 14) * 0.1); // Up to 2.4x multiplier

        hotStreakChallenges = generateHotStreakChallenges(streakDays, multiplier);
      }
    }

    observability.recordPerfEvent('challenges.hot_streak.fetch', {
      durationMs: Date.now() - startedAt,
      challengeCount: hotStreakChallenges.length,
      userId
    });

    res.json({
      success: true,
      challenges: hotStreakChallenges,
      eligible: hotStreakChallenges.length > 0,
      message: hotStreakChallenges.length > 0
        ? '🔥 Hot Streak Active! Bonus rewards unlocked!'
        : 'Complete more challenges to unlock Hot Streak bonuses!'
    });
  } catch (error) {
    observability.recordPerfEvent('challenges.hot_streak.fetch', {
      durationMs: Date.now() - startedAt,
      failed: true,
      userId
    }, { force: true });

    res.status(500).json({
      success: false,
      error: 'Unable to load hot streak challenges'
    });
  }
});

/**
 * GET /api/v1/challenges/cross-game
 * Get meta-challenges spanning multiple games
 */
router.get('/cross-game', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  const userId = req.user.id;

  try {
    let metaChallenges = [];

    if (postgres.isEnabled()) {
      // Get player's game diversity
      const gameDiversityResult = await postgres.query(
        `SELECT game_id, COUNT(*) as sessions, MAX(score) as best_score
         FROM game_sessions
         WHERE user_id = $1
         GROUP BY game_id
         HAVING COUNT(*) >= 1`,
        [userId]
      );

      const gameStats = gameDiversityResult.rows;
      const uniqueGames = gameStats.length;

      // Generate meta-challenges based on games played
      metaChallenges = generateMetaChallenges(gameStats, uniqueGames);

      // Check for progressive unlock chains
      const unlockChains = await getProgressiveUnlockChains(userId, gameStats);
      metaChallenges = [...metaChallenges, ...unlockChains];
    }

    observability.recordPerfEvent('challenges.cross_game.fetch', {
      durationMs: Date.now() - startedAt,
      challengeCount: metaChallenges.length,
      userId
    });

    res.json({
      success: true,
      challenges: metaChallenges,
      uniqueGamesPlayed: uniqueGames,
      message: uniqueGames >= 3
        ? '🎮 Master multiple games to unlock exclusive rewards!'
        : 'Try more games to unlock cross-game challenges!'
    });
  } catch (error) {
    observability.recordPerfEvent('challenges.cross_game.fetch', {
      durationMs: Date.now() - startedAt,
      failed: true,
      userId
    }, { force: true });

    res.status(500).json({
      success: false,
      error: 'Unable to load cross-game challenges'
    });
  }
});

/**
 * GET /api/v1/challenges/mastery-tracks
 * Get game-specific mastery tracks with progressive difficulty
 */
router.get('/mastery-tracks', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  const userId = req.user.id;
  const { gameId } = req.query;

  try {
    let masteryTracks = [];

    if (postgres.isEnabled()) {
      // Get player's performance in specific game or all games
      const gameFilter = gameId ? 'AND game_id = $2' : '';
      const params = gameId ? [userId, gameId] : [userId];

      const masteryResult = await postgres.query(
        `SELECT
           game_id,
           COUNT(*) as total_sessions,
           MAX(score) as personal_best,
           AVG(score) as average_score,
           SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completions
         FROM game_sessions
         WHERE user_id = $1 ${gameFilter}
         GROUP BY game_id`,
        params
      );

      const gameMastery = masteryResult.rows;

      // Generate mastery tracks for each game
      for (const mastery of gameMastery) {
        const track = await generateMasteryTrack(mastery, userId);
        if (track) {
          masteryTracks.push(track);
        }
      }
    }

    observability.recordPerfEvent('challenges.mastery_tracks.fetch', {
      durationMs: Date.now() - startedAt,
      trackCount: masteryTracks.length,
      userId
    });

    res.json({
      success: true,
      tracks: masteryTracks,
      message: 'Progress through mastery tiers to unlock exclusive rewards!'
    });
  } catch (error) {
    observability.recordPerfEvent('challenges.mastery_tracks.fetch', {
      durationMs: Date.now() - startedAt,
      failed: true,
      userId
    }, { force: true });

    res.status(500).json({
      success: false,
      error: 'Unable to load mastery tracks'
    });
  }
});

/**
 * POST /api/v1/challenges/adaptive
 * Submit challenge completion for adaptive difficulty adjustment
 */
router.post('/adaptive', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  const userId = req.user.id;

  try {
    const { challengeId, completed, performance, timeToComplete } = req.body;

    if (!challengeId || completed === undefined) {
      return res.status(400).json({
        success: false,
        error: 'challengeId and completed status required'
      });
    }

    if (postgres.isEnabled()) {
      // Record challenge completion
      await postgres.query(
        `INSERT INTO challenge_completions (
           id, user_id, challenge_id, completed, performance_score,
           time_to_complete, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (user_id, challenge_id, created_at) DO UPDATE
         SET completed = $4, performance_score = $5, time_to_complete = $6`,
        [
          `cc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          challengeId,
          completed,
          performance || null,
          timeToComplete || null
        ]
      );

      // Update adaptive difficulty profile
      await updateAdaptiveDifficulty(userId, challengeId, completed, performance);
    }

    observability.recordPerfEvent('challenges.adaptive.update', {
      durationMs: Date.now() - startedAt,
      challengeId,
      completed,
      userId
    });

    res.json({
      success: true,
      message: 'Challenge data recorded for difficulty optimization'
    });
  } catch (error) {
    observability.recordPerfEvent('challenges.adaptive.update', {
      durationMs: Date.now() - startedAt,
      failed: true,
      userId
    }, { force: true });

    res.status(500).json({
      success: false,
      error: 'Unable to record challenge data'
    });
  }
});

// Helper Functions

function calculateSkillProfile(skillAssessments, sessions) {
  const profile = {
    overallSkill: 0.5,
    byGame: {},
    preferredDifficulties: [],
    recentPerformance: 'stable'
  };

  if (skillAssessments.length > 0) {
    const avgScore = skillAssessments.reduce((sum, a) => sum + (a.skill_score || 0), 0) / skillAssessments.length;
    profile.overallSkill = Math.min(1.0, avgScore / 100);
  }

  // Analyze by game
  const gamePerformances = {};
  sessions.forEach(session => {
    if (!gamePerformances[session.game_id]) {
      gamePerformances[session.game_id] = { scores: [], completions: 0 };
    }
    gamePerformances[session.game_id].scores.push(session.score || 0);
    if (session.completed) gamePerformances[session.game_id].completions++;
  });

  for (const [gameId, data] of Object.entries(gamePerformances)) {
    const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    const completionRate = data.completions / data.scores.length;
    profile.byGame[gameId] = {
      skill: Math.min(1.0, avgScore / 5000),
      completionRate,
      sessions: data.scores.length
    };
  }

  // Determine preferred difficulty
  const avgCompletionRate = Object.values(profile.byGame).reduce((sum, g) => sum + g.completionRate, 0) / Math.max(1, Object.keys(profile.byGame).length);

  if (avgCompletionRate > 0.7) {
    profile.preferredDifficulties = ['hard', 'nightmare'];
    profile.recentPerformance = 'excellent';
  } else if (avgCompletionRate > 0.5) {
    profile.preferredDifficulties = ['medium', 'hard'];
    profile.recentPerformance = 'good';
  } else if (avgCompletionRate > 0.3) {
    profile.preferredDifficulties = ['easy', 'medium'];
    profile.recentPerformance = 'developing';
  } else {
    profile.preferredDifficulties = ['easy'];
    profile.recentPerformance = 'learning';
  }

  return profile;
}

function generateDailyChallenges(skillProfile, completedChallengeIds) {
  const challenges = [];
  const difficulties = ['easy', 'medium', 'hard'];

  // Filter base challenges by skill appropriateness
  const availableChallenges = BASE_CHALLENGES.filter(c => {
    const targetRate = DIFFICULTY_TARGETS[c.difficulty]?.completionRate || 0.5;
    const skillMatch = skillProfile.overallSkill >= (targetRate - 0.2) && skillProfile.overallSkill <= (targetRate + 0.3);
    const notCompleted = !completedChallengeIds.includes(c.id);
    return skillMatch && notCompleted;
  });

  // Pick one challenge from each difficulty
  for (const difficulty of difficulties) {
    const pool = availableChallenges.filter(c => c.difficulty === difficulty);
    if (pool.length > 0) {
      const selected = pool[Math.floor(Math.random() * pool.length)];
      challenges.push({
        ...selected,
        generated: true,
        skillMatch: skillProfile.overallSkill,
        dailyBonus: true
      });
    }
  }

  // Fill remaining slots if needed
  while (challenges.length < 3 && availableChallenges.length > 0) {
    const random = availableChallenges[Math.floor(Math.random() * availableChallenges.length)];
    if (!challenges.find(c => c.id === random.id)) {
      challenges.push({
        ...random,
        generated: true,
        dailyBonus: true
      });
    }
  }

  return challenges;
}

function generateHotStreakChallenges(streakDays, multiplier) {
  const challenges = [];

  // Pick 2-3 harder challenges with bonus multipliers
  const hardChallenges = BASE_CHALLENGES.filter(c => ['hard', 'nightmare'].includes(c.difficulty));

  const count = Math.min(3, Math.max(2, Math.floor(streakDays / 3)));

  for (let i = 0; i < count && i < hardChallenges.length; i++) {
    const base = hardChallenges[i];
    challenges.push({
      ...base,
      id: `${base.id}_hot_streak`,
      title: `🔥 ${base.title}`,
      reward: Math.floor(base.reward * multiplier),
      hotStreak: true,
      multiplier,
      streakDays
    });
  }

  return challenges;
}

function generateMetaChallenges(gameStats, uniqueGames) {
  const challenges = [];

  // Multi-game mastery challenge
  if (uniqueGames >= 3) {
    const topGames = gameStats.slice(0, Math.min(5, uniqueGames));
    const totalSessions = topGames.reduce((sum, g) => sum + g.sessions, 0);

    challenges.push({
      id: `meta_diversity_${uniqueGames}`,
      title: 'Game Hopper',
      desc: `Play ${uniqueGames} different games`,
      gameId: 'meta',
      target: uniqueGames,
      metric: 'unique_games',
      type: 'total',
      reward: 100 * uniqueGames,
      difficulty: 'medium',
      meta: true,
      progress: Math.min(uniqueGames, uniqueGames),
      games: topGames.map(g => g.game_id)
    });
  }

  // Cross-game score mastery
  if (uniqueGames >= 2) {
    const totalBestScore = gameStats.reduce((sum, g) => sum + (g.best_score || 0), 0);

    challenges.push({
      id: `meta_score_master`,
      title: 'Score Master',
      desc: 'Achieve high scores across multiple games',
      gameId: 'meta',
      target: 10000 * uniqueGames,
      metric: 'combined_best_score',
      type: 'total',
      reward: 500 * uniqueGames,
      difficulty: 'hard',
      meta: true,
      progress: totalBestScore,
      games: gameStats.map(g => g.game_id)
    });
  }

  return challenges;
}

async function getProgressiveUnlockChains(userId, gameStats) {
  const chains = [];

  // Example: Complete challenge in Game A to unlock special challenge in Game B
  const hasPlayedGame = (gameId) => gameStats.some(g => g.game_id === gameId);

  if (hasPlayedGame('backrooms-pacman') && hasPlayedGame('shadow-crawler')) {
    chains.push({
      id: 'unlock_chain_1',
      title: 'Shadow Maze Master',
      desc: 'Complete the shadow maze challenge',
      gameId: 'backrooms-pacman',
      target: 5000,
      metric: 'score',
      type: 'best',
      reward: 750,
      difficulty: 'hard',
      chain: true,
      prerequisite: 'shadow-crawler'
    });
  }

  return chains;
}

async function generateMasteryTrack(mastery, userId) {
  const { game_id, total_sessions, personal_best, average_score, completions } = mastery;

  // Determine current mastery tier
  let tier = 'novice';
  let nextTier = 'apprentice';
  let progress = 0;
  let target = 10;

  if (total_sessions >= 50) {
    tier = 'master';
    nextTier = 'legend';
    progress = completions;
    target = 100;
  } else if (total_sessions >= 20) {
    tier = 'expert';
    nextTier = 'master';
    progress = completions;
    target = 50;
  } else if (total_sessions >= 10) {
    tier = 'adept';
    nextTier = 'expert';
    progress = completions;
    target = 20;
  } else if (total_sessions >= 5) {
    tier = 'apprentice';
    nextTier = 'adept';
    progress = completions;
    target = 10;
  } else {
    progress = total_sessions;
    target = 5;
  }

  return {
    gameId: game_id,
    currentTier: tier,
    nextTier,
    progress,
    target,
    percentComplete: Math.round((progress / target) * 100),
    stats: {
      sessions: total_sessions,
      personalBest: personal_best,
      averageScore: Math.round(average_score || 0),
      completions
    },
    nextChallenge: {
      title: `${nextTier} Challenge`,
      desc: `Complete ${target} runs in ${game_id}`,
      reward: 500 * (target / 10)
    }
  };
}

async function updateAdaptiveDifficulty(userId, challengeId, completed, performance) {
  // Update user's adaptive profile based on completion
  // This would typically update a user profile table with difficulty preferences

  if (postgres.isEnabled()) {
    await postgres.query(
      `INSERT INTO user_adaptive_profile (
         user_id, challenge_id, completed, performance_score,
         difficulty_adjustment, created_at
       ) VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, challenge_id) DO UPDATE
       SET completed = $3, performance_score = $4,
           difficulty_adjustment = user_adaptive_profile.difficulty_adjustment + $5,
           updated_at = NOW()`,
      [userId, challengeId, completed, performance || 0, completed ? 0.05 : -0.1]
    );
  }
}

async function recordChallengeGeneration(userId, type, challenges) {
  if (postgres.isEnabled()) {
    await postgres.query(
      `INSERT INTO challenge_generation_log (
         id, user_id, generation_type, challenge_count, metadata, created_at
       ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        `cgl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type,
        challenges.length,
        JSON.stringify({ challengeIds: challenges.map(c => c.id) })
      ]
    );
  }
}

module.exports = router;
