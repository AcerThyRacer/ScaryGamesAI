# Phase 1 & 2 Quick Reference Guide

## 🚀 Quick Start (5 Minutes)

### 1. Run Database Migrations
```bash
psql -d scarygamesai -f db/migrations/020_phase1_universal_profile.sql
psql -d scarygamesai -f db/migrations/021_phase1_matchmaking.sql
psql -d scarygamesai -f db/migrations/022_phase2_lore_system.sql
psql -d scarygamesai -f db/migrations/023_phase2_events_quests.sql
```

### 2. Restart Server
```bash
npm restart
# or
node server.js
```

### 3. Include Integration in Your Game
```html
<script src="/js/phase1-2-integration.js"></script>
<script>
  const integration = new ScaryGamesAIIntegration('your_game_id');
  await integration.initialize(userId, token);
</script>
```

---

## 📊 Phase 1: Meta-Progression Cheat Sheet

### Universal Profile
```javascript
// Get player profile
GET /api/v1/profile

// Award XP (master + game)
POST /api/v1/profile/xp
{
  "masterXp": 100,
  "gameId": "backrooms_pacman",
  "gameXp": 50,
  "playtimeSeconds": 300
}

// Award Soul Fragments
POST /api/v1/soul-fragments
{
  "amount": 25,
  "source": "achievement",
  "description": "Completed level 10"
}
```

### Matchmaking
```javascript
// Find match
POST /api/v1/matchmaking/find
{
  "gameType": "backrooms_pacman",
  "mode": "ranked"
}

// Report result
POST /api/v1/matchmaking/result
{
  "gameType": "backrooms_pacman",
  "opponentId": "uuid",
  "won": true,
  "score": 2500,
  "opponentScore": 1800,
  "matchDuration": 420
}

// Get leaderboard
GET /api/v1/matchmaking/leaderboard?gameType=backrooms_pacman&limit=100
```

### Integration Helper
```javascript
// Initialize
const integration = new BackroomsPacmanIntegration();
await integration.initialize(userId, token);

// Award XP after game
await integration.awardXP({
  masterXp: 100,
  gameXp: 50,
  playtimeSeconds: 300
});

// Record ranked match
await integration.recordMatchResult(opponentId, true, {
  player: 2500,
  opponent: 1800,
  duration: 420
});
```

---

## 📖 Phase 2: Lore & Events Cheat Sheet

### Lore System
```javascript
// Get universe overview
GET /api/v1/lore/universe

// Discover fragment
POST /api/v1/lore/fragments/discover
{
  "fragmentId": "uuid",
  "gameContext": {
    "gameId": "backrooms_pacman",
    "level": 5,
    "location": "secret_room"
  }
}

// Get player's lore stats
GET /api/v1/lore/stats
```

### Events & Quests
```javascript
// Get active events
GET /api/v1/events/active

// Update quest progress
POST /api/v1/events/:eventId/quest/:questId/progress
{
  "progressType": "enemies_defeated",
  "amount": 10
}

// Get meta-quests (multi-game)
GET /api/v1/quests/meta

// Update meta-quest progress
POST /api/v1/quests/meta/:questId/progress
{
  "gameId": "backrooms_pacman",
  "amount": 1
}

// Get community goals
GET /api/v1/community/goals
```

### Integration Helper
```javascript
// Discover lore
await integration.discoverLoreFragment('fragment-uuid', {
  level: 5,
  location: 'deep_maze'
});

// Update quest progress
await integration.updateQuestProgress(eventId, questId, 'kills', 5);

// Get active quests
const quests = await integration.getActiveQuests();
```

---

## 🎮 Game Integration Examples

### Backrooms Pac-Man
```javascript
class BackroomsPacmanIntegration extends ScaryGamesAIIntegration {
  constructor() {
    super('backrooms_pacman');
  }

  async onPelletCollected(count) {
    if (count % 10 === 0) {
      await this.awardXP({ gameXp: 5, masterXp: 2 });
    }
  }

  async onGhostEaten(ghostType) {
    const xp = ghostType === 'normal' ? 20 : 50;
    const souls = ghostType === 'normal' ? 1 : 3;
    await this.awardXP({ gameXp: xp });
    await this.awardSoulFragments(souls, 'ghost_eaten', `Ate ${ghostType} ghost`);
  }

  async onLevelComplete(level, timeSeconds) {
    const xp = 100 + Math.max(0, 100 - timeSeconds) + (level * 10);
    await this.awardXP({ gameXp: xp, masterXp: 50, playtimeSeconds: timeSeconds });
  }

  async onLoreFragmentFound(fragmentId, level) {
    await this.discoverLoreFragment(fragmentId, { level, location: 'backrooms_maze' });
  }
}
```

### Shadow Crawler
```javascript
class ShadowCrawlerIntegration extends ScaryGamesAIIntegration {
  constructor() {
    super('shadow_crawler');
  }

  async onEnemyDefeated(enemyType, level) {
    const xp = enemyType === 'boss' ? 200 : 20;
    const souls = enemyType === 'boss' ? 10 : 2;
    await this.awardXP({ gameXp: xp });
    await this.awardSoulFragments(souls, 'enemy_defeated', `Defeated ${enemyType}`);
  }

  async onDungeonComplete(dungeonId, floor, clearTimeSeconds) {
    const xp = 150 + (floor * 20) + Math.max(0, 300 - clearTimeSeconds) / 10;
    await this.awardXP({ gameXp: xp, masterXp: 75, playtimeSeconds: clearTimeSeconds });
  }
}
```

---

## 🗄️ Database Tables Quick Reference

### Phase 1 Tables
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `player_profiles` | Master progression | master_level, prestige_rank, soul_fragments |
| `game_mastery` | Per-game stats | game_id, mastery_level, playtime_seconds |
| `shared_inventory` | Cosmetics | item_id, item_rarity, is_equipped |
| `player_friends` | Friend system | friend_profile_id, status, games_played_together |
| `matchmaking_ratings` | ELO ratings | game_type, rating, rating_deviation |
| `match_history` | Match records | opponent_id, won, rating_change |

### Phase 2 Tables
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `lore_timeline` | Universe timeline | era_name, chronological_order |
| `lore_fragments` | Collectible lore | category, rarity, game_id |
| `revelations` | Backstory unlocks | required_fragments, difficulty |
| `game_connections` | Easter eggs | game_id_1, game_id_2, connection_type |
| `events` | Limited-time events | event_type, start_date, end_date |
| `event_quests` | Event objectives | objective_type, target_value |
| `meta_quests` | Multi-game quests | required_games[], target_value |
| `event_community_goals` | Collective objectives | goal_target, current_progress |

---

## 🔧 Common Tasks

### Add a New Lore Fragment
```sql
INSERT INTO lore_fragments (title, description, content, category, rarity, game_id)
VALUES (
  'The First Experiment',
  'A diary entry from Dr. ████████',
  'Day 47: The subject shows unprecedented adaptation...',
  'document',
  'rare',
  'backrooms_pacman'
);
```

### Create a New Event
```sql
INSERT INTO events (title, description, event_type, start_date, end_date, reward_pool)
VALUES (
  'Halloween Horror Week',
  'Special Halloween-themed challenges',
  'seasonal',
  '2026-10-25 00:00:00',
  '2026-11-01 23:59:59',
  '{"soulFragments": 500, "items": [{"id": "halloween_mask", "type": "cosmetic"}]}'
);
```

### Add Event Quest
```sql
INSERT INTO event_quests (event_id, title, objective_type, target_value, rewards)
VALUES (
  'event-uuid',
  'Ghost Hunter',
  'kill',
  50,
  '{"soulFragments": 100, "items": []}'
);
```

---

## 📈 Monitoring & Analytics

### Get Player Stats
```javascript
// Profile stats
GET /api/v1/profile

// Matchmaking stats
GET /api/v1/matchmaking/stats?gameType=backrooms_pacman

// Lore collection stats
GET /api/v1/lore/stats

// Quest progress
GET /api/v1/quests/active
```

### Event Metrics
```sql
-- Event participation
SELECT title, participation_count, unique_participants
FROM events
WHERE is_active = true;

-- Community goal progress
SELECT goal_name, current_progress, goal_target, is_achieved
FROM event_community_goals
WHERE event_id = 'event-uuid';

-- Most popular quests
SELECT title, COUNT(*) as completions
FROM event_quests eq
JOIN player_quest_progress pqp ON eq.id = pqp.quest_id
WHERE pqp.is_completed = true
GROUP BY eq.id
ORDER BY completions DESC;
```

---

## ⚙️ Configuration

### ELO System Tuning
Edit `api/matchmaking.js`:
```javascript
const ELO_CONFIG = {
  INITIAL_RATING: 1200,
  K_FACTOR: 32,
  K_FACTOR_NEW_PLAYER: 40,
  K_FACTOR_HIGH_RATED: 24,
  BONUS_WIN_STREAK: 5,
  PENALTY_LOSE_STREAK: -3
};
```

### Soul Fragment Rewards
Edit lore fragment discovery rewards in `api/lore-system.js`:
```javascript
const soulReward = fragment.rarity === 'legendary' ? 50 : 
                   fragment.rarity === 'epic' ? 25 : 
                   fragment.rarity === 'rare' ? 10 : 5;
```

---

## 🐛 Troubleshooting

### Issue: Player profile not found
**Solution:** Profile is auto-created on first API call. Ensure user is authenticated.

### Issue: Matchmaking not finding opponents
**Solution:** Expand search radius in `api/matchmaking.js`:
```javascript
const minRating = Math.max(0, playerRating.rating - 300); // Was 200
const maxRating = playerRating.rating + 300;
```

### Issue: Quest progress not updating
**Solution:** Check event is active and quest exists:
```sql
SELECT * FROM events WHERE id = 'event-uuid' AND is_active = true;
SELECT * FROM event_quests WHERE id = 'quest-uuid';
```

---

## 📞 Support

- **Full Documentation:** `PHASE1_2_IMPLEMENTATION_COMPLETE.md`
- **API Reference:** `/docs/api` (coming soon)
- **Database Schema:** `db/migrations/020-023_*.sql`
- **Integration Examples:** `js/phase1-2-integration.js`

---

**Last Updated:** February 17, 2026  
**Status:** ✅ Production Ready  
**Coverage:** All 10 Top Games
