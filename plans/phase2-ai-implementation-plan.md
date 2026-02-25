# Phase 2: AI-Powered Dynamic Experiences - Implementation Plan

## Executive Summary

This document provides a detailed implementation plan for Phase 2 of the ScaryGamesAI roadmap, focusing on AI-powered dynamic experiences. Based on comprehensive codebase analysis, much of the foundational AI infrastructure already exists. This plan identifies enhancement opportunities and gaps to achieve the Phase 2 vision.

---

## Current State Analysis

### Existing AI Infrastructure

#### 1. Core AI System ([`js/ai-system.js`](js/ai-system.js:1))
**Status:** ✅ Comprehensive implementation (2446 lines)

**Existing Capabilities:**
- **Tier-based AI features** - 4 tiers (none, lite/Survivor, pro/Hunter, max/Elder God)
- **PCG (Procedural Content Generation):**
  - Seeded RNG with daily challenges
  - Maze generation (recursive backtracking with loops)
  - Dungeon generation (room-based with corridors)
  - Perlin-like noise terrain generation
  - Item and enemy spawn placement
- **AdaptiveAI** - Learning opponents with:
  - Player path memory and hotspot analysis
  - Reaction time tracking
  - Timing pattern analysis
  - Ambush prediction
- **DynamicDifficulty** - Real-time adjustment:
  - Performance metrics tracking (deaths, damage, escapes)
  - Target difficulty calculation
  - Tier-based constraints
  - Enemy modifiers (speed, damage, aggression, spawn rates)
- **PersonalizedHorror:**
  - 8 fear categories (darkness, jumpscares, chase, psychological, gore, isolation, uncanny, sound)
  - Fear response analysis
  - Optimal intensity calculation
  - Effective fear combinations
- **AIGameMaster:**
  - Session tension tracking
  - Pacing determination (build, accelerate, climax, maintain)
  - Event triggering system
  - Narrative event generation
- **SentimentAnalysis:**
  - Positive/negative/fear word dictionaries
  - Intensity modifiers
  - Topic extraction
  - Feedback analysis with suggestions
- **BehaviorProfiler:**
  - Behavior pattern recording
  - Skill estimation (6 categories)
  - Player type classification (7 archetypes)

#### 2. Phase 5 AI Features ([`js/phase5-ai-features.js`](js/phase5-ai-features.js:1))
**Status:** ✅ Advanced features (2445 lines)

**Existing Capabilities:**
- **Game Refinement:**
  - `refineGame()` - Difficulty adjustment via natural language
  - Plan creation for difficulty, spawn, speed, horror changes
  - Game object modification
- **Bug Fixing AI:**
  - `analyzeAndFixBugs()` - Static code analysis
  - Infinite loop detection
  - Memory leak identification
  - Missing error handling detection
- **Feature Expansion:**
  - `expandFeatures()` - Add levels, power-ups, bosses, enemy types
- **Style Transfer:**
  - `transferStyle()` - 10 visual themes (pixel, neon, realistic, low-poly, hand-drawn, comic, retro, abstract, dark, nightmare)
  - CSS filter application
  - Color palette generation
  - Font and effect application
- **Multimodal Generation:**
  - `generateAudio()` - Procedural music and SFX using Web Audio API
  - `generateNarration()` - Voice narration using Speech Synthesis API
- **Smart Assistance:**
  - `analyzeGame()` - Comprehensive game analysis
  - `calculateBalance()` - Difficulty tuning recommendations
  - Playtest simulation

#### 3. Behavior Trees & GOAP ([`js/core/ai/behavior-tree.js`](js/core/ai/behavior-tree.js:1))
**Status:** ✅ Complete implementation

**Existing Capabilities:**
- BTNode base class
- BTSequence, BTSelector, BTParallel, BTInverter
- BTCondition, BTAction, BTWait
- GOAPAgent with A* pathfinding
- Example enemy AI behaviors

#### 4. Server-Side AI Service ([`services/aiService.js`](services/aiService.js:1))
**Status:** ✅ Comprehensive service (466 lines)

**Existing Capabilities:**
- `generateHorrorProfile()` - Psychological profile generation
- `calculateHorrorTolerance()` - Based on difficulty preference, completion rate, death rate
- `analyzeGenrePreferences()` - Preferred game genres
- `analyzePlayPatterns()` - Time of day, binge behavior, consistency
- `analyzeFearResponses()` - Pause frequency, avoidance patterns
- `calculateSubscriptionPropensity()` - Upgrade likelihood
- `calculateChurnRisk()` - Cancellation risk
- `recommendNextGame()` - Game recommendations
- `recommendTier()` - Subscription tier recommendations
- `getPersonalizedDashboard()` - Personalized dashboard data

---

## Gap Analysis: Current State vs Phase 2 Requirements

### 2.1 AI Director 2.0

| Requirement | Current State | Gap | Priority |
|-------------|---------------|-----|----------|
| ML-based player skill assessment | ✅ Basic skill estimation in BehaviorProfiler | Need ML algorithms (decision trees, neural nets) for more accurate assessment | HIGH |
| Dynamic spawn rate adjustment | ✅ Basic spawn modifiers in DynamicDifficulty | Need real-time stress-level integration with biometric feedback | HIGH |
| Procedural scare timing optimization | ✅ Basic timing in PersonalizedHorror | Need optimization algorithms for maximum impact | MEDIUM |
| A/B testing framework | ❌ Not implemented | Need complete A/B testing infrastructure | HIGH |

### 2.2 Procedural Content Generation

| Requirement | Current State | Gap | Priority |
|-------------|---------------|-----|----------|
| Wave Function Collapse | ❌ Not implemented | Need WFC algorithm for advanced level generation | HIGH |
| LLM-powered narrative generation | ❌ Not implemented | Need Ollama integration for quest/narrative generation | MEDIUM |
| Procedural enemy placement | ✅ Basic placement in PCG | Need behavior tree integration for intelligent placement | MEDIUM |
| Dynamic loot distribution | ❌ Not implemented | Need loot table system with rarity and player progression | MEDIUM |

### 2.3 AI-Powered Anti-Cheat

| Requirement | Current State | Gap | Priority |
|-------------|---------------|-----|----------|
| Behavioral anomaly detection | ❌ Not implemented | Need baseline behavior modeling and anomaly detection | HIGH |
| Server-side score validation | ⚠️ Basic validation in api/leaderboards.js | Need comprehensive validation with replay verification | HIGH |
| ML-based cheat pattern recognition | ❌ Not implemented | Need cheat pattern database and ML classifier | HIGH |
| Automatic ban escalation | ❌ Not implemented | Need tiered enforcement system | MEDIUM |

### 2.4 Personalized Recommendations Engine

| Requirement | Current State | Gap | Priority |
|-------------|---------------|-----|----------|
| Collaborative filtering | ❌ Not implemented | Need user-item matrix and similarity calculations | HIGH |
| Content-based filtering | ⚠️ Basic in aiService.js | Need enhanced game metadata and similarity algorithms | MEDIUM |
| Real-time updates | ❌ Not implemented | Need streaming updates and cache invalidation | MEDIUM |
| "Because you played X" | ❌ Not implemented | Need game similarity graph | LOW |

---

## Implementation Specifications

### 2.1.1 ML-Based Player Skill Assessment

**File:** [`js/ai-system.js`](js/ai-system.js:1) - Enhance `BehaviorProfiler`

**New Classes:**
```javascript
class SkillAssessmentML {
  constructor() {
    this.model = null;
    this.trainingData = [];
    this.features = [
      'reactionTime',
      'accuracy',
      'survivalTime',
      'damageTaken',
      'enemiesDefeated',
      'itemsCollected',
      'secretsFound',
      'deathCount',
      'completionRate',
      'difficultyPreference'
    ];
  }

  // Decision tree for skill classification
  classifySkill(playerData) {
    // Implementation: Decision tree with entropy-based splits
  }

  // Neural network for continuous skill prediction
  predictSkillScore(playerData) {
    // Implementation: Simple feedforward network
  }

  // Online learning from new player sessions
  updateModel(sessionData) {
    // Implementation: Incremental learning
  }
}
```

**Integration Points:**
- Hook into existing `BehaviorProfiler.recordSession()`
- Update player profile with ML-assessed skill level
- Feed into `DynamicDifficulty` for real-time adjustment

---

### 2.1.2 Dynamic Spawn Rate Adjustment with Stress Detection

**File:** [`js/ai-system.js`](js/ai-system.js:1) - Enhance `DynamicDifficulty`

**New Module:**
```javascript
const StressDetector = {
  // Physiological indicators (if available)
  indicators: {
    mouseMovementVelocity: 0,
    clickFrequency: 0,
    keystrokePressure: 0, // If supported
    pauseFrequency: 0,
    errorRate: 0
  },

  calculateStressLevel(indicators) {
    // Weighted combination of indicators
    // Returns 0-1 stress score
  },

  adjustSpawnRate(baseRate, stressLevel, difficulty) {
    // Higher stress = lower spawn rate (capped by difficulty tier)
    // Implementation of adaptive spawning
  }
};
```

**Integration:**
- Update stress indicators every 500ms during gameplay
- Adjust spawn rates dynamically via `DynamicDifficulty.applyModifiers()`

---

### 2.1.3 A/B Testing Framework

**File:** [`js/ab-testing.js`](js/ab-testing.js) - NEW

**Implementation:**
```javascript
class ABTestingFramework {
  constructor() {
    this.experiments = new Map();
    this.userAssignments = new Map();
  }

  // Create new experiment
  createExperiment(config) {
    // config: { id, name, variants, metric, duration, trafficSplit }
  }

  // Assign user to variant
  getVariant(experimentId, userId) {
    // Consistent hashing for stable assignment
  }

  // Track conversion event
  trackEvent(experimentId, userId, eventName, value) {
    // Store event for analysis
  }

  // Calculate statistical significance
  analyzeResults(experimentId) {
    // T-test or chi-squared test
    // Return confidence level and winner
  }

  // Auto-deploy winner if significant
  autoDeploy(experimentId, threshold = 0.95) {
    // Deploy winning variant
  }
}
```

**Use Cases:**
- Test different AI director parameters
- Test scare timing algorithms
- Test difficulty adjustment curves

---

### 2.2.1 Wave Function Collapse Implementation

**File:** [`js/core/procedural/wfc.js`](js/core/procedural/wfc.js) - NEW

**Implementation:**
```javascript
class WaveFunctionCollapse {
  constructor(tiles, adjacencyRules) {
    this.tiles = tiles; // Array of tile types
    this.rules = adjacencyRules; // Which tiles can neighbor which
    this.grid = null;
    this.observed = null;
  }

  // Initialize grid with superposition of all tiles
  initialize(width, height) {
    // Each cell contains all possible tiles
  }

  // Find cell with lowest entropy (fewest possibilities)
  findLowestEntropyCell() {
    // Return cell with minimum possibilities
  }

  // Collapse a cell to a single tile
  collapseCell(cell) {
    // Random selection weighted by frequency
  }

  // Propagate constraints to neighbors
  propagate(cell) {
    // Remove impossible tiles from neighbors
    // Recursive propagation
  }

  // Generate complete level
  generate(width, height, seed) {
    // Main WFC loop: observe -> collapse -> propagate
  }
}
```

**Tile Types for Horror Games:**
- Floor tiles (normal, damaged, bloody, cracked)
- Wall tiles (solid, broken, door, secret)
- Special tiles (spawn, loot, trap, exit)

---

### 2.2.2 LLM-Powered Narrative Generation

**File:** [`js/core/procedural/narrative.js`](js/core/procedural/narrative.js) - NEW

**Implementation:**
```javascript
class NarrativeGenerator {
  constructor() {
    this.ollamaEndpoint = '/api/ollama';
    this.templates = {
      quest: 'Generate a horror quest with: objective, obstacles, reward',
      dialogue: 'Generate creepy NPC dialogue for: {context}',
      lore: 'Generate backstory for: {location/entity}',
      twist: 'Generate plot twist for: {situation}'
    };
  }

  async generateQuest(gameContext, playerProfile) {
    const prompt = this.buildQuestPrompt(gameContext, playerProfile);
    const response = await this.callOllama(prompt);
    return this.parseQuestResponse(response);
  }

  async generateDialogue(character, situation, playerAction) {
    // Generate contextual NPC dialogue
  }

  async generateLoreFragment(location, discoveredBy) {
    // Generate lore based on location and player actions
  }

  buildQuestPrompt(context, profile) {
    // Build prompt incorporating player's fear profile
    // e.g., if player fears isolation -> generate isolation-themed quest
  }
}
```

**Integration:**
- Hook into existing Ollama integration ([`js/ollama-integration.js`](js/ollama-integration.js:1))
- Cache generated narratives to avoid regeneration
- Use player's fear profile for personalized narratives

---

### 2.2.3 Dynamic Loot Distribution

**File:** [`js/core/procedural/loot.js`](js/core/procedural/loot.js) - NEW

**Implementation:**
```javascript
class LootDistribution {
  constructor() {
    this.lootTables = {
      common: { items: [...], weight: 60 },
      uncommon: { items: [...], weight: 25 },
      rare: { items: [...], weight: 10 },
      legendary: { items: [...], weight: 5 }
    };
    this.playerProgression = 0; // 0-1 based on playtime/achievements
  }

  generateLootDrop(context) {
    // context: { location, enemyType, playerLevel, luck }
    const rarity = this.rollRarity(context.luck);
    const item = this.rollItem(rarity, context);
    return this.scaleItem(item, context.playerLevel);
  }

  rollRarity(luck) {
    // Weighted random with luck modifier
  }

  scaleItem(item, playerLevel) {
    // Scale stats based on player progression
  }
}
```

---

### 2.3.1 Behavioral Anomaly Detection

**File:** [`js/quality-assurance.js`](js/quality-assurance.js:1) - Enhance

**New Module:**
```javascript
const AnomalyDetection = {
  // Baseline behavior profiles
  baselines: {
    movement: { avgSpeed: 0, acceleration: 0, turnRate: 0 },
    aiming: { accuracy: 0, reactionTime: 0, tracking: 0 },
    actions: { actionsPerMinute: 0, abilityUsage: 0 }
  },

  // Build baseline from legitimate player data
  buildBaseline(playerId, sessions) {
    // Aggregate statistics from verified legitimate sessions
  },

  // Detect anomalies in current session
  detectAnomalies(currentSession, baseline) {
    const anomalies = [];

    // Statistical outlier detection (Z-score)
    if (this.zScore(currentSession.accuracy, baseline.aiming.accuracy) > 3) {
      anomalies.push({ type: 'impossible_accuracy', severity: 'high' });
    }

    // Pattern detection (impossible human reactions)
    if (currentSession.reactionTime < 50) { // < 50ms is inhuman
      anomalies.push({ type: 'superhuman_reaction', severity: 'critical' });
    }

    return anomalies;
  },

  zScore(value, mean, stddev) {
    return Math.abs((value - mean) / stddev);
  }
};
```

---

### 2.3.2 Server-Side Score Validation

**File:** [`api/leaderboards.js`](api/leaderboards.js:1) - Enhance

**New Validation:**
```javascript
async function validateScoreSubmission(userId, score, gameData) {
  // 1. Check score against theoretical maximum
  const maxPossible = calculateMaxPossibleScore(gameData);
  if (score > maxPossible) {
    return { valid: false, reason: 'exceeds_maximum' };
  }

  // 2. Replay verification (if available)
  if (gameData.replay) {
    const replayValid = await verifyReplay(gameData.replay, score);
    if (!replayValid) {
      return { valid: false, reason: 'replay_mismatch' };
    }
  }

  // 3. Behavioral analysis
  const anomalies = AnomalyDetection.detectAnomalies(
    gameData.session,
    await AnomalyDetection.buildBaseline(userId)
  );
  if (anomalies.length > 0) {
    return { valid: false, reason: 'behavioral_anomaly', anomalies };
  }

  // 4. Rate limiting check
  const recentSubmissions = await getRecentSubmissions(userId);
  if (recentSubmissions.length > MAX_PER_HOUR) {
    return { valid: false, reason: 'rate_limit_exceeded' };
  }

  return { valid: true };
}
```

---

### 2.3.3 ML-Based Cheat Pattern Recognition

**File:** [`services/cheatDetectionService.js`](services/cheatDetectionService.js) - NEW

**Implementation:**
```javascript
class CheatDetectionService {
  constructor() {
    this.cheatPatterns = new Map();
    this.model = null; // Trained classifier
  }

  // Known cheat signatures
  registerCheatPattern(name, pattern) {
    // pattern: { type, indicators, confidence }
    this.cheatPatterns.set(name, pattern);
  }

  // Analyze session for cheat patterns
  analyzeSession(sessionData) {
    const detections = [];

    for (const [name, pattern] of this.cheatPatterns) {
      const match = this.matchPattern(sessionData, pattern);
      if (match.confidence > pattern.threshold) {
        detections.push({ pattern: name, ...match });
      }
    }

    return detections;
  }

  // Train classifier on labeled data
  trainModel(labeledData) {
    // labeledData: [{ features, isCheater }]
    // Use simple logistic regression or decision tree
  }

  matchPattern(session, pattern) {
    // Check if session matches pattern indicators
    // Return confidence score
  }
}

// Known cheat patterns
const CHEAT_PATTERNS = {
  aimbot: {
    indicators: ['perfect_tracking', 'instant_snap', 'wall_aim'],
    threshold: 0.8
  },
  wallhack: {
    indicators: ['pre_aim', 'pre_fire', 'tracking_through_walls'],
    threshold: 0.7
  },
  speedhack: {
    indicators: ['impossible_movement_speed', 'teleportation'],
    threshold: 0.9
  },
  noclip: {
    indicators: ['passing_through_walls', 'floating'],
    threshold: 0.85
  }
};
```

---

### 2.3.4 Automatic Ban Escalation

**File:** [`services/enforcementService.js`](services/enforcementService.js) - NEW

**Implementation:**
```javascript
class EnforcementService {
  constructor() {
    this.escalationTiers = [
      { level: 1, action: 'warning', threshold: 1 },
      { level: 2, action: 'temporary_ban_24h', threshold: 2 },
      { level: 3, action: 'temporary_ban_7d', threshold: 3 },
      { level: 4, action: 'permanent_ban', threshold: 4 }
    ];
  }

  async processViolation(userId, violation) {
    // Record violation
    await this.recordViolation(userId, violation);

    // Get violation count
    const count = await this.getViolationCount(userId);

    // Determine escalation
    const tier = this.escalationTiers.find(t => count >= t.threshold);
    if (tier) {
      await this.applyEnforcement(userId, tier);
    }

    return { action: tier?.action, level: tier?.level };
  }

  async applyEnforcement(userId, tier) {
    switch (tier.action) {
      case 'warning':
        await this.sendWarning(userId);
        break;
      case 'temporary_ban_24h':
        await this.temporaryBan(userId, 24 * 60 * 60 * 1000);
        break;
      case 'temporary_ban_7d':
        await this.temporaryBan(userId, 7 * 24 * 60 * 60 * 1000);
        break;
      case 'permanent_ban':
        await this.permanentBan(userId);
        break;
    }

    await this.notifyModerators(userId, tier);
  }
}
```

---

### 2.4.1 Collaborative Filtering

**File:** [`services/recommendationService.js`](services/recommendationService.js) - NEW

**Implementation:**
```javascript
class RecommendationService {
  constructor() {
    this.userItemMatrix = new Map(); // userId -> { gameId: rating }
    this.itemUserMatrix = new Map(); // gameId -> { userId: rating }
  }

  // Build user-item matrix from play history
  buildMatrix(playHistory) {
    // playHistory: [{ userId, gameId, playtime, completions }]
    for (const record of playHistory) {
      const rating = this.calculateRating(record);
      this.setUserItemRating(record.userId, record.gameId, rating);
    }
  }

  // Find similar users
  findSimilarUsers(targetUserId, k = 10) {
    const targetRatings = this.userItemMatrix.get(targetUserId);
    const similarities = [];

    for (const [userId, ratings] of this.userItemMatrix) {
      if (userId === targetUserId) continue;

      const similarity = this.cosineSimilarity(targetRatings, ratings);
      similarities.push({ userId, similarity });
    }

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, k);
  }

  // Generate recommendations based on similar users
  recommendForUser(userId, limit = 5) {
    const similarUsers = this.findSimilarUsers(userId);
    const recommendations = new Map();

    // Aggregate games played by similar users
    for (const { userId: similarId, similarity } of similarUsers) {
      const games = this.userItemMatrix.get(similarId);
      for (const [gameId, rating] of Object.entries(games)) {
        if (!this.userItemMatrix.get(userId)[gameId]) {
          // User hasn't played this game
          const current = recommendations.get(gameId) || 0;
          recommendations.set(gameId, current + similarity * rating);
        }
      }
    }

    // Sort by aggregated score
    return Array.from(recommendations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([gameId, score]) => ({ gameId, score }));
  }

  cosineSimilarity(vec1, vec2) {
    // Calculate cosine similarity between two rating vectors
  }
}
```

---

### 2.4.2 Content-Based Filtering

**File:** [`services/recommendationService.js`](services/recommendationService.js) - Enhance

**Implementation:**
```javascript
class ContentBasedFiltering {
  constructor() {
    this.gameFeatures = new Map(); // gameId -> feature vector
    this.featureWeights = {
      genre: 0.3,
      difficulty: 0.15,
      horrorType: 0.25,
      mechanics: 0.15,
      duration: 0.1,
      rating: 0.05
    };
  }

  // Build feature vector for game
  buildGameFeatures(game) {
    return {
      genre: this.encodeGenre(game.genre),
      difficulty: game.difficulty / 10,
      horrorType: this.encodeHorrorType(game.tags),
      mechanics: this.encodeMechanics(game.mechanics),
      duration: Math.min(game.avgDuration / 60, 1), // Normalize to 1 hour
      rating: game.rating / 5
    };
  }

  // Find similar games
  findSimilarGames(gameId, limit = 5) {
    const targetFeatures = this.gameFeatures.get(gameId);
    const similarities = [];

    for (const [id, features] of this.gameFeatures) {
      if (id === gameId) continue;

      const similarity = this.weightedCosineSimilarity(
        targetFeatures,
        features,
        this.featureWeights
      );
      similarities.push({ gameId: id, similarity });
    }

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  // Recommend based on played games
  recommendBasedOnHistory(userId, playedGames) {
    const allSimilar = [];

    for (const game of playedGames) {
      const similar = this.findSimilarGames(game.gameId);
      allSimilar.push(...similar);
    }

    // Aggregate and deduplicate
    const aggregated = new Map();
    for (const { gameId, similarity } of allSimilar) {
      const current = aggregated.get(gameId) || 0;
      aggregated.set(gameId, current + similarity);
    }

    return Array.from(aggregated.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }

  weightedCosineSimilarity(vec1, vec2, weights) {
    // Calculate weighted cosine similarity
  }
}
```

---

### 2.4.3 Hybrid Recommendation Engine

**File:** [`services/recommendationService.js`](services/recommendationService.js) - Main Export

**Implementation:**
```javascript
class HybridRecommendationEngine {
  constructor() {
    this.collaborativeFilter = new RecommendationService();
    this.contentBasedFilter = new ContentBasedFiltering();
    this.trendingGames = new Map(); // gameId -> trendScore
  }

  // Main recommendation endpoint
  async getRecommendations(userId, context = {}) {
    const playedGames = await this.getUserPlayedGames(userId);
    const userProfile = await this.getUserProfile(userId);

    // Get recommendations from each source
    const collaborative = this.collaborativeFilter.recommendForUser(userId, 10);
    const contentBased = this.contentBasedFilter.recommendBasedOnHistory(
      userId,
      playedGames
    );

    // Get personalized recommendations from existing aiService
    const aiRecommendations = await aiService.recommendNextGame(
      userProfile.genrePreferences,
      userProfile.fearProfile
    );

    // Hybrid combination
    const combined = this.combineRecommendations([
      { source: 'collaborative', recs: collaborative, weight: 0.4 },
      { source: 'content', recs: contentBased, weight: 0.35 },
      { source: 'ai', recs: aiRecommendations, weight: 0.25 }
    ]);

    // Apply context filters (platform, region, availability)
    const filtered = this.applyContextFilters(combined, context);

    // Add diversity (ensure variety in genres)
    const diversified = this.addDiversity(filtered);

    return {
      recommendations: diversified.slice(0, 10),
      metadata: {
        sources: { collaborative, contentBased, aiRecommendations },
        userId,
        timestamp: Date.now()
      }
    };
  }

  combineRecommendations(sources) {
    const combined = new Map();

    for (const { source, recs, weight } of sources) {
      for (const rec of recs) {
        const gameId = rec.gameId;
        const current = combined.get(gameId) || { gameId, score: 0, sources: [] };
        current.score += rec.score * weight;
        current.sources.push(source);
        combined.set(gameId, current);
      }
    }

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score);
  }

  addDiversity(recommendations, diversityFactor = 0.3) {
    // Ensure mix of genres, difficulties, etc.
    // Reorder to avoid same genre consecutively
  }
}
```

---

## Database Schema Changes

**File:** [`db/migrations/013_ai_expansion.sql`](db/migrations/013_ai_expansion.sql) - NEW

```sql
-- Phase 2 AI Expansion Migration
-- Created: 2026-02-17

-- A/B Testing
CREATE TABLE ab_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, running, completed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    traffic_split DECIMAL(5,2) DEFAULT 50.00,
    primary_metric VARCHAR(100),
    winner_variant VARCHAR(100)
);

CREATE TABLE ab_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES ab_experiments(id),
    name VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    weight INTEGER DEFAULT 1
);

CREATE TABLE ab_assignments (
    user_id UUID NOT NULL,
    experiment_id UUID REFERENCES ab_experiments(id),
    variant_id UUID REFERENCES ab_variants(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, experiment_id)
);

CREATE TABLE ab_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES ab_assignments(id),
    event_name VARCHAR(100) NOT NULL,
    event_value DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cheat Detection
CREATE TABLE cheat_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    game_id VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- behavioral_anomaly, score_validation, pattern_match
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    evidence JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, actioned, dismissed
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE enforcement_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL, -- warning, temporary_ban, permanent_ban
    reason TEXT,
    duration_hours INTEGER, -- For temporary bans
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) -- System or moderator
);

-- Recommendation Cache
CREATE TABLE recommendation_cache (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    recommendations JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    context JSONB
);

-- Player Skill Assessment
CREATE TABLE player_skill_assessments (
    user_id UUID NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    assessment_date DATE DEFAULT CURRENT_DATE,
    skill_score DECIMAL(5,2), -- 0-100
    skill_tier VARCHAR(20), -- novice, intermediate, advanced, expert, master
    features JSONB, -- Raw features used for assessment
    PRIMARY KEY (user_id, game_id, assessment_date)
);

-- Loot Distribution Tracking
CREATE TABLE loot_drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    game_id VARCHAR(100) NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    rarity VARCHAR(20) NOT NULL, -- common, uncommon, rare, legendary
    context JSONB, -- Location, enemy, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_cheat_reports_user ON cheat_reports(user_id);
CREATE INDEX idx_cheat_reports_status ON cheat_reports(status);
CREATE INDEX idx_enforcement_actions_user ON enforcement_actions(user_id);
CREATE INDEX idx_recommendation_cache_expires ON recommendation_cache(expires_at);
CREATE INDEX idx_player_skill_assessments_date ON player_skill_assessments(assessment_date);
CREATE INDEX idx_loot_drops_user ON loot_drops(user_id);

-- Update existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS ab_test_assignments JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS cheat_flags INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skill_assessment_version INTEGER DEFAULT 1;
```

---

## API Endpoints

### A/B Testing API

**File:** [`api/ab-testing.js`](api/ab-testing.js) - NEW

```javascript
// GET /api/v1/ab/experiments - List active experiments
// GET /api/v1/ab/experiments/:id - Get experiment details
// POST /api/v1/ab/experiments - Create experiment (admin)
// PUT /api/v1/ab/experiments/:id - Update experiment (admin)
// POST /api/v1/ab/experiments/:id/start - Start experiment (admin)
// POST /api/v1/ab/experiments/:id/stop - Stop experiment (admin)
// GET /api/v1/ab/experiments/:id/results - Get results (admin)
// POST /api/v1/ab/assign - Get user's variant assignment
// POST /api/v1/ab/events - Track conversion event
```

### Recommendations API

**File:** [`api/recommendations.js`](api/recommendations.js) - NEW

```javascript
// GET /api/v1/recommendations - Get personalized recommendations
// GET /api/v1/recommendations/game/:gameId/similar - Get similar games
// GET /api/v1/recommendations/user/:userId - Get recommendations for specific user (admin)
// POST /api/v1/recommendations/feedback - Submit feedback on recommendation
// DELETE /api/v1/recommendations/cache - Clear recommendation cache
```

### Anti-Cheat API

**File:** [`api/anticheat.js`](api/anticheat.js) - NEW

```javascript
// POST /api/v1/anticheat/report - Submit cheat report
// GET /api/v1/anticheat/reports - List reports (admin)
// GET /api/v1/anticheat/reports/:id - Get report details (admin)
// PUT /api/v1/anticheat/reports/:id/review - Review report (admin)
// POST /api/v1/anticheat/enforce - Apply enforcement action (admin)
// GET /api/v1/anticheat/user/:userId/history - Get user's cheat history (admin)
```

### AI Metrics API

**File:** [`api/engagement.js`](api/engagement.js:1) - Enhance

```javascript
// Existing endpoints + new:
// POST /api/v1/engagement/skill-assessment - Submit skill assessment data
// GET /api/v1/engagement/stress-levels - Get stress level history
// POST /api/v1/engagement/ab-test-event - Track A/B test event
```

---

## UI Components

### Recommendations UI

**File:** [`js/recommendations-ui.js`](js/recommendations-ui.js) - NEW

**Components:**
- `RecommendationCarousel` - Horizontal scroll of recommended games
- `SimilarGamesPanel` - "Because you played X" section
- `PersonalizedDailyPick` - Daily featured recommendation
- `RecommendationFeedback` - Thumbs up/down for recommendations

### A/B Testing UI (Admin)

**File:** [`js/admin/ab-testing-ui.js`](js/admin/ab-testing-ui.js) - NEW

**Components:**
- `ExperimentCreator` - Form to create new A/B test
- `ExperimentDashboard` - Live results visualization
- `VariantPreview` - Preview of each variant
- `StatisticalSignificance` - Confidence level indicator

### Anti-Cheat Dashboard (Admin)

**File:** [`js/admin/anticheat-ui.js`](js/admin/anticheat-ui.js) - NEW

**Components:**
- `CheatReportQueue` - Queue of pending reports
- `EvidenceViewer` - Replay and statistics viewer
- `EnforcementHistory` - User's enforcement timeline
- `PatternAnalytics` - Cheat pattern trends

---

## Integration Points

### Existing Systems to Modify

1. **[`js/ai-system.js`](js/ai-system.js:1)**
   - Add `SkillAssessmentML` class
   - Enhance `DynamicDifficulty` with stress detection
   - Integrate WFC into `PCG` module

2. **[`js/phase5-ai-features.js`](js/phase5-ai-features.js:1)**
   - Add A/B testing integration
   - Enhance game analysis with ML metrics

3. **[`services/aiService.js`](services/aiService.js:1)**
   - Integrate hybrid recommendation engine
   - Add collaborative filtering

4. **[`js/quality-assurance.js`](js/quality-assurance.js:1)**
   - Add `AnomalyDetection` module
   - Integrate cheat pattern recognition

5. **[`api/leaderboards.js`](api/leaderboards.js:1)**
   - Add score validation middleware

6. **[`middleware/auth.js`](middleware/auth.js:1)**
   - Add cheat detection checks

7. **[`js/ollama-integration.js`](js/ollama-integration.js:1)**
   - Add narrative generation endpoints

---

## Testing Strategy

### Unit Tests

**Files:**
- [`tests/unit/ab-testing.test.js`](tests/unit/)
- [`tests/unit/recommendation-service.test.js`](tests/unit/)
- [`tests/unit/cheat-detection.test.js`](tests/unit/)
- [`tests/unit/wfc.test.js`](tests/unit/)

### Integration Tests

**Files:**
- [`tests/integration/ab-testing-api.test.js`](tests/integration/)
- [`tests/integration/recommendations-api.test.js`](tests/integration/)
- [`tests/integration/anticheat-api.test.js`](tests/integration/)

### E2E Tests

**Files:**
- [`tests/e2e/ab-testing-flow.test.js`](tests/e2e/)
- [`tests/e2e/recommendations-flow.test.js`](tests/e2e/)
- [`tests/e2e/cheat-detection-flow.test.js`](tests/e2e/)

---

## Performance Considerations

### Caching Strategy

1. **Recommendation Cache**
   - Cache recommendations per user for 1 hour
   - Invalidate on significant play activity
   - Use Redis for distributed caching

2. **Similarity Cache**
   - Pre-compute game similarity matrix daily
   - Cache user-user similarity for active users

3. **WFC Cache**
   - Cache generated levels by seed
   - Share common level segments

### Database Optimization

1. **Indexes**
   - All foreign keys indexed
   - Composite indexes for common queries
   - Partial indexes for status columns

2. **Connection Pooling**
   - Use existing PgBouncer configuration
   - Tune pool size for AI workload

---

## Security Considerations

1. **Rate Limiting**
   - A/B test event tracking: 100 events/minute
   - Recommendation requests: 30 requests/minute
   - Cheat reports: 10 reports/hour

2. **Data Privacy**
   - Anonymize A/B test data for analysis
   - Encrypt cheat evidence at rest
   - GDPR-compliant data retention

3. **Access Control**
   - Admin-only endpoints for enforcement
   - Role-based access for cheat reports
   - Audit logging for all enforcement actions

---

## Rollout Plan

### Week 1-2: Foundation
- [ ] Create database migration
- [ ] Set up A/B testing framework
- [ ] Build recommendation service skeleton

### Week 3-4: AI Director 2.0
- [ ] Implement ML skill assessment
- [ ] Add stress detection
- [ ] Build A/B testing UI

### Week 5-6: Procedural Generation
- [ ] Implement WFC algorithm
- [ ] Create narrative generator
- [ ] Build loot distribution system

### Week 7-8: Anti-Cheat
- [ ] Implement anomaly detection
- [ ] Add server-side validation
- [ ] Build cheat pattern recognition
- [ ] Create enforcement system

### Week 9-10: Recommendations & Polish
- [ ] Complete hybrid recommendation engine
- [ ] Build UI components
- [ ] Integration testing
- [ ] Documentation

---

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Player Retention (D7) | Current | +30% | Analytics |
| Game Discovery Rate | Current | +25% | Recommendation clicks |
| Cheat Reports | Current | -90% | Report volume |
| A/B Test Win Rate | N/A | >60% | Experiment results |
| Recommendation CTR | N/A | >15% | UI analytics |
| False Positive Ban Rate | N/A | <1% | Appeal reviews |

---

## Appendix: File Creation Summary

### New Files to Create

**Core AI:**
- [`js/core/procedural/wfc.js`](js/core/procedural/wfc.js)
- [`js/core/procedural/narrative.js`](js/core/procedural/narrative.js)
- [`js/core/procedural/loot.js`](js/core/procedural/loot.js)
- [`js/ab-testing.js`](js/ab-testing.js)
- [`js/recommendations-ui.js`](js/recommendations-ui.js)

**Services:**
- [`services/recommendationService.js`](services/recommendationService.js)
- [`services/cheatDetectionService.js`](services/cheatDetectionService.js)
- [`services/enforcementService.js`](services/enforcementService.js)
- [`services/proceduralService.js`](services/proceduralService.js)

**API:**
- [`api/recommendations.js`](api/recommendations.js)
- [`api/ab-testing.js`](api/ab-testing.js)
- [`api/anticheat.js`](api/anticheat.js)

**Database:**
- [`db/migrations/013_ai_expansion.sql`](db/migrations/013_ai_expansion.sql)

**Admin UI:**
- [`js/admin/ab-testing-ui.js`](js/admin/ab-testing-ui.js)
- [`js/admin/anticheat-ui.js`](js/admin/anticheat-ui.js)

**Tests:**
- [`tests/unit/ab-testing.test.js`](tests/unit/ab-testing.test.js)
- [`tests/unit/recommendation-service.test.js`](tests/unit/recommendation-service.test.js)
- [`tests/unit/cheat-detection.test.js`](tests/unit/cheat-detection.test.js)
- [`tests/unit/wfc.test.js`](tests/unit/wfc.test.js)
- [`tests/integration/ab-testing-api.test.js`](tests/integration/ab-testing-api.test.js)
- [`tests/integration/recommendations-api.test.js`](tests/integration/recommendations-api.test.js)
- [`tests/integration/anticheat-api.test.js`](tests/integration/anticheat-api.test.js)
- [`tests/e2e/ab-testing-flow.test.js`](tests/e2e/ab-testing-flow.test.js)
- [`tests/e2e/recommendations-flow.test.js`](tests/e2e/recommendations-flow.test.js)
- [`tests/e2e/cheat-detection-flow.test.js`](tests/e2e/cheat-detection-flow.test.js)

### Files to Modify

- [`js/ai-system.js`](js/ai-system.js:1) - Enhance AI director
- [`js/phase5-ai-features.js`](js/phase5-ai-features.js:1) - Add ML models
- [`js/quality-assurance.js`](js/quality-assurance.js:1) - Enhanced detection
- [`services/aiService.js`](services/aiService.js:1) - Integrate recommendations
- [`middleware/auth.js`](middleware/auth.js:1) - Add cheat detection
- [`api/leaderboards.js`](api/leaderboards.js:1) - Score validation
- [`api/engagement.js`](api/engagement.js:1) - Track AI metrics
- [`api/index.js`](api/index.js:1) - Mount new routes

---

*Document Version: 1.0*
*Created: 2026-02-17*
*Author: Architect Mode Analysis*
