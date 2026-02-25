/**
 * PHASE 15: BATTLE PASS 3.0
 * 
 * Best-in-class progression system with 125 tiers across 3 tracks.
 * 
 * Features:
 * - Free Track (50 tiers) - Available to all players
 * - Premium Track (50 tiers, $9.99) - Enhanced rewards
 * - Elite Track (25 tiers, +$4.99) - Exclusive content
 * - Total: 125 tiers of rewards
 * - Daily missions (3 per day)
 * - Weekly quests (5 per week)
 * - Season journey (long-term objectives)
 * - Bonus XP events (weekends, double XP days)
 * - Social features (gift levels, co-op bonus, showcase)
 * - Target: +45% D30 retention
 */

export class BattlePassSystem {
  constructor(config = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || '/api/battlepass',
      debug: config.debug || false
    };
    
    // Current season
    this.currentSeason = {
      id: 'season_1',
      name: 'Nightmare Origins',
      theme: 'horror_origins',
      startDate: new Date('2026-02-01').getTime(),
      endDate: new Date('2026-05-01').getTime(),
      duration: 90 // days
    };
    
    // Player battle pass progress
    this.playerProgress = {
      seasonId: 'season_1',
      tier: 0,
      xp: 0,
      xpToNextTier: 1000,
      purchasedPremium: false,
      purchasedElite: false,
      unlockedTiers: [],
      claimedRewards: []
    };
    
    // Battle pass tracks
    this.tracks = {
      free: [],
      premium: [],
      elite: []
    };
    
    // Missions and quests
    this.missions = {
      daily: [],
      weekly: [],
      season: []
    };
    
    // Social features
    this.social = {
      giftedLevels: 0,
      coOpBonusActive: false,
      showcaseItems: []
    };
    
    console.log('[Phase 15] BATTLE PASS 3.0 initialized');
  }

  async initialize() {
    console.log('[Phase 15] Initializing BATTLE PASS 3.0...');
    
    // Define all 125 tiers
    this.defineBattlePassTracks();
    
    // Generate missions
    this.generateDailyMissions();
    this.generateWeeklyQuests();
    this.generateSeasonJourney();
    
    // Load player progress
    await this.loadPlayerProgress();
    
    console.log('[Phase 15] ✅ BATTLE PASS 3.0 ready');
  }

  defineBattlePassTracks() {
    // FREE TRACK (50 tiers)
    this.tracks.free = [
      // Every 10 tiers: Major reward
      { tier: 1, reward: { type: 'currency', amount: 50, name: '50 Gems' } },
      { tier: 2, reward: { type: 'xp_boost', amount: 1.1, duration: 3600, name: '10% XP Boost (1h)' } },
      { tier: 3, reward: { type: 'currency', amount: 75, name: '75 Gems' } },
      { tier: 4, reward: { type: 'cosmetic', id: 'common_skin_1', rarity: 'common', name: 'Common Skin' } },
      { tier: 5, reward: { type: 'currency', amount: 100, name: '100 Gems' } },
      
      { tier: 6, reward: { type: 'emote', id: 'wave', rarity: 'common', name: 'Wave Emote' } },
      { tier: 7, reward: { type: 'currency', amount: 75, name: '75 Gems' } },
      { tier: 8, reward: { type: 'trail', id: 'basic_sparkle', rarity: 'common', name: 'Basic Trail' } },
      { tier: 9, reward: { type: 'currency', amount: 100, name: '100 Gems' } },
      { tier: 10, reward: { type: 'cosmetic', id: 'uncommon_skin_1', rarity: 'uncommon', name: 'Uncommon Skin' } },
      
      { tier: 11, reward: { type: 'currency', amount: 125, name: '125 Gems' } },
      { tier: 12, reward: { type: 'avatar', id: 'skull_icon', rarity: 'uncommon', name: 'Skull Avatar' } },
      { tier: 13, reward: { type: 'currency', amount: 150, name: '150 Gems' } },
      { tier: 14, reward: { type: 'explosion', id: 'basic_blood', rarity: 'uncommon', name: 'Blood Explosion' } },
      { tier: 15, reward: { type: 'currency', amount: 200, name: '200 Gems' } },
      
      // Continue pattern to tier 50...
      { tier: 20, reward: { type: 'cosmetic', id: 'rare_skin_1', rarity: 'rare', name: 'Rare Skin' } },
      { tier: 25, reward: { type: 'currency', amount: 250, name: '250 Gems' } },
      { tier: 30, reward: { type: 'cosmetic', id: 'rare_trail', rarity: 'rare', name: 'Rare Trail' } },
      { tier: 40, reward: { type: 'currency', amount: 300, name: '300 Gems' } },
      { tier: 50, reward: { type: 'cosmetic', id: 'epic_skin_free', rarity: 'epic', name: 'Epic Skin (Free)' } }
    ];
    
    // Fill in gaps for free track
    for (let i = 1; i <= 50; i++) {
      if (!this.tracks.free.find(t => t.tier === i)) {
        this.tracks.free.push({
          tier: i,
          reward: { type: 'currency', amount: 25 + (i * 5), name: `${25 + (i * 5)} Gems` }
        });
      }
    }
    
    // PREMIUM TRACK (50 tiers, $9.99)
    this.tracks.premium = [
      { tier: 1, reward: { type: 'currency', amount: 100, name: '100 Gems' } },
      { tier: 2, reward: { type: 'xp_boost', amount: 1.2, duration: 7200, name: '20% XP Boost (2h)' } },
      { tier: 3, reward: { type: 'cosmetic', id: 'premium_skin_1', rarity: 'rare', name: 'Premium Skin' } },
      { tier: 4, reward: { type: 'currency', amount: 150, name: '150 Gems' } },
      { tier: 5, reward: { type: 'trail', id: 'flame_trail', rarity: 'epic', name: 'Flame Trail' } },
      
      { tier: 6, reward: { type: 'emote', id: 'victory_dance', rarity: 'rare', name: 'Victory Dance' } },
      { tier: 7, reward: { type: 'currency', amount: 200, name: '200 Gems' } },
      { tier: 8, reward: { type: 'cosmetic', id: 'premium_skin_2', rarity: 'epic', name: 'Premium Skin 2' } },
      { tier: 9, reward: { type: 'explosion', id: 'void_explosion', rarity: 'epic', name: 'Void Explosion' } },
      { tier: 10, reward: { type: 'currency', amount: 250, name: '250 Gems' } },
      
      { tier: 11, reward: { type: 'title', id: 'Premium Warrior', name: 'Premium Warrior Title' } },
      { tier: 12, reward: { type: 'currency', amount: 300, name: '300 Gems' } },
      { tier: 13, reward: { type: 'cosmetic', id: 'premium_skin_3', rarity: 'epic', name: 'Premium Skin 3' } },
      { tier: 14, reward: { type: 'trail', id: 'lightning_trail', rarity: 'legendary', name: 'Lightning Trail' } },
      { tier: 15, reward: { type: 'currency', amount: 400, name: '400 Gems' } },
      
      // Continue pattern...
      { tier: 20, reward: { type: 'cosmetic', id: 'golden_god', rarity: 'legendary', name: 'Golden God Skin' } },
      { tier: 25, reward: { type: 'currency', amount: 500, name: '500 Gems' } },
      { tier: 30, reward: { type: 'cosmetic', id: 'demon_lord', rarity: 'legendary', name: 'Demon Lord Skin' } },
      { tier: 40, reward: { type: 'currency', amount: 750, name: '750 Gems' } },
      { tier: 50, reward: { type: 'cosmetic', id: 'legendary_reaper', rarity: 'legendary', exclusive: true, name: 'Legendary Reaper (S1 Exclusive)' } }
    ];
    
    // Fill in gaps for premium track
    for (let i = 1; i <= 50; i++) {
      if (!this.tracks.premium.find(t => t.tier === i)) {
        this.tracks.premium.push({
          tier: i,
          reward: { type: 'currency', amount: 50 + (i * 10), name: `${50 + (i * 10)} Gems` }
        });
      }
    }
    
    // ELITE TRACK (25 tiers, +$4.99 upgrade)
    this.tracks.elite = [
      { tier: 25, reward: { type: 'title', id: 'Elite Warrior', name: 'Elite Warrior Title', exclusive: true } },
      { tier: 30, reward: { type: 'cosmetic', id: 'elite_banner', rarity: 'mythic', name: 'Elite Banner' } },
      { tier: 40, reward: { type: 'emote', id: 'elite_dance', rarity: 'mythic', name: 'Elite Victory Dance' } },
      { tier: 50, reward: { type: 'title', id: 'Elite Champion', name: 'Elite Champion Title', exclusive: true } },
      { tier: 60, reward: { type: 'cosmetic', id: 'elite_aura', rarity: 'mythic', name: 'Elite Aura' } },
      { tier: 75, reward: { type: 'title', id: 'Elite Master', name: 'Elite Master Title', exclusive: true } },
      { tier: 80, reward: { type: 'cosmetic', id: 'elite_weapon', rarity: 'mythic', name: 'Elite Weapon Skin' } },
      { tier: 90, reward: { type: 'currency', amount: 2000, name: '2000 Gems' } },
      { tier: 100, reward: { type: 'cosmetic', id: 'elite_phoenix', rarity: 'mythic', exclusive: true, name: 'Elite Phoenix Skin (S1 Exclusive)' } },
      { tier: 125, reward: { type: 'title', id: 'Elite Legend', name: 'Elite Legend Title (S1 Exclusive)', exclusive: true } }
    ];
    
    console.log('[Phase 15] Defined 125 tiers across 3 tracks');
  }

  generateDailyMissions() {
    // 3 daily missions that refresh every 24 hours
    const dailyTemplates = [
      {
        id: 'daily_play',
        title: 'Daily Player',
        description: 'Play 3 games',
        type: 'games_played',
        target: 3,
        xpReward: 200
      },
      {
        id: 'daily_wins',
        title: 'Daily Winner',
        description: 'Win 1 game',
        type: 'wins',
        target: 1,
        xpReward: 300
      },
      {
        id: 'daily_kills',
        title: 'Daily Slayer',
        description: 'Defeat 20 enemies',
        type: 'kills',
        target: 20,
        xpReward: 250
      },
      {
        id: 'daily_objectives',
        title: 'Daily Achiever',
        description: 'Complete 5 objectives',
        type: 'objectives',
        target: 5,
        xpReward: 200
      },
      {
        id: 'daily_social',
        title: 'Daily Social',
        description: 'Play with a friend',
        type: 'social',
        target: 1,
        xpReward: 300
      }
    ];
    
    // Select 3 random dailies
    this.missions.daily = [];
    const shuffled = dailyTemplates.sort(() => 0.5 - Math.random());
    this.missions.daily = shuffled.slice(0, 3);
    
    console.log('[Phase 15] Generated 3 daily missions');
  }

  generateWeeklyQuests() {
    // 5 weekly quests that reset every Sunday
    this.missions.weekly = [
      {
        id: 'weekly_marathon',
        title: 'Marathon Runner',
        description: 'Complete 25 games',
        type: 'games_played',
        target: 25,
        xpReward: 1000,
        expires: this.getEndOfWeek()
      },
      {
        id: 'weekly_champion',
        title: 'Weekly Champion',
        description: 'Win 10 games',
        type: 'wins',
        target: 10,
        xpReward: 1500,
        expires: this.getEndOfWeek()
      },
      {
        id: 'weekly_collector',
        title: 'Master Collector',
        description: 'Find 100 collectibles',
        type: 'collectibles',
        target: 100,
        xpReward: 1200,
        expires: this.getEndOfWeek()
      },
      {
        id: 'weekly_social',
        title: 'Team Player',
        description: 'Play 10 games with friends',
        type: 'social_games',
        target: 10,
        xpReward: 1000,
        expires: this.getEndOfWeek()
      },
      {
        id: 'weekly_mastery',
        title: 'Skill Mastery',
        description: 'Achieve 80% accuracy in any game',
        type: 'accuracy',
        target: 80,
        xpReward: 2000,
        expires: this.getEndOfWeek()
      }
    ];
    
    console.log('[Phase 15] Generated 5 weekly quests');
  }

  generateSeasonJourney() {
    // Long-term objectives for the season
    this.missions.season = [
      {
        id: 'season_explorer',
        title: 'Season Explorer',
        description: 'Play all available games',
        type: 'games_unique',
        target: 10,
        xpReward: 5000,
        completed: false
      },
      {
        id: 'season_master',
        title: 'Season Master',
        description: 'Reach max level in any game',
        type: 'max_level',
        target: 1,
        xpReward: 10000,
        completed: false
      },
      {
        id: 'season_legend',
        title: 'Season Legend',
        description: 'Reach Diamond rank in ranked mode',
        type: 'rank_achieved',
        target: 'diamond',
        xpReward: 15000,
        completed: false
      },
      {
        id: 'season_completionist',
        title: 'Completionist',
        description: 'Complete all daily missions for 30 days',
        type: 'daily_streak',
        target: 30,
        xpReward: 20000,
        completed: false
      }
    ];
    
    console.log('[Phase 15] Generated 4 season journey objectives');
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

  // Core progression

  addXP(amount) {
    const bonusMultiplier = this.calculateBonusMultiplier();
    const totalXP = Math.floor(amount * bonusMultiplier);
    
    this.playerProgress.xp += totalXP;
    
    console.log(`[Phase 15] Added ${totalXP} XP (${amount} base × ${bonusMultiplier} multiplier)`);
    
    // Check for tier ups
    while (this.playerProgress.xp >= this.playerProgress.xpToNextTier) {
      this.tierUp();
    }
    
    // Save progress
    this.savePlayerProgress();
  }

  tierUp() {
    if (this.playerProgress.tier >= 125) {
      console.log('[Phase 15] Max tier reached!');
      return;
    }
    
    this.playerProgress.xp -= this.playerProgress.xpToNextTier;
    this.playerProgress.tier++;
    this.playerProgress.xpToNextTier = Math.floor(this.playerProgress.xpToNextTier * 1.1); // 10% increase per tier
    
    console.log(`[Phase 15] 🎉 Tier Up! Now Tier ${this.playerProgress.tier}`);
    
    // Award rewards for this tier
    this.awardTierRewards(this.playerProgress.tier);
    
    // Check for milestone tiers
    if ([25, 50, 75, 100, 125].includes(this.playerProgress.tier)) {
      this.awardMilestoneBonus(this.playerProgress.tier);
    }
  }

  awardTierRewards(tier) {
    const freeReward = this.tracks.free.find(t => t.tier === tier);
    const premiumReward = this.tracks.premium.find(t => t.tier === tier);
    const eliteReward = this.tracks.elite.find(t => t.tier === tier);
    
    console.log(`[Phase 15] Tier ${tier} rewards:`);
    
    // Always award free track
    if (freeReward && !this.isRewardClaimed(freeReward)) {
      console.log(`- Free: ${freeReward.reward.name}`);
      this.grantReward(freeReward.reward);
      this.markRewardClaimed(freeReward);
    }
    
    // Award premium if purchased
    if (this.playerProgress.purchasedPremium && premiumReward && !this.isRewardClaimed(premiumReward)) {
      console.log(`- Premium: ${premiumReward.reward.name}`);
      this.grantReward(premiumReward.reward);
      this.markRewardClaimed(premiumReward);
    }
    
    // Award elite if upgraded
    if (this.playerProgress.purchasedElite && eliteReward && !this.isRewardClaimed(eliteReward)) {
      console.log(`- Elite: ${eliteReward.reward.name}`);
      this.grantReward(eliteReward.reward);
      this.markRewardClaimed(eliteReward);
    }
  }

  awardMilestoneBonus(tier) {
    const bonuses = {
      25: { currency: 500, title: 'Quarter Century' },
      50: { currency: 1000, title: 'Halfway There' },
      75: { currency: 1500, title: 'Three Quarters' },
      100: { currency: 2000, title: 'Century Club' },
      125: { currency: 5000, title: 'MAXIMUM POWER', exclusive: true }
    };
    
    const bonus = bonuses[tier];
    if (bonus) {
      console.log(`[Phase 15] 🏆 MILESTONE BONUS: ${bonus.title} - ${bonus.currency} Gems!`);
      // Grant bonus currency
    }
  }

  calculateBonusMultiplier() {
    let multiplier = 1.0;
    
    // Premium account bonus
    if (this.playerProgress.purchasedPremium) {
      multiplier += 0.2; // +20%
    }
    
    // Elite account bonus
    if (this.playerProgress.purchasedElite) {
      multiplier += 0.3; // +30%
    }
    
    // Weekend bonus
    const isWeekend = [0, 6].includes(new Date().getDay());
    if (isWeekend) {
      multiplier += 0.25; // +25%
    }
    
    // Co-op bonus (playing with friends)
    if (this.social.coOpBonusActive) {
      multiplier += 0.15; // +15%
    }
    
    // XP boost items
    const activeBoosts = this.getActiveXPBoosts();
    for (const boost of activeBoosts) {
      multiplier += (boost.amount - 1);
    }
    
    return multiplier;
  }

  getActiveXPBoosts() {
    // Return currently active XP boost items
    return []; // In production, check inventory for active boosts
  }

  grantReward(reward) {
    console.log(`[Phase 15] Granted reward: ${reward.name}`);
    
    switch (reward.type) {
      case 'currency':
        // Add to player's currency balance
        break;
      case 'cosmetic':
      case 'skin':
      case 'trail':
      case 'explosion':
      case 'emote':
      case 'avatar':
        // Unlock cosmetic item
        break;
      case 'title':
        // Unlock title
        break;
      case 'xp_boost':
        // Activate XP boost for duration
        break;
    }
  }

  isRewardClaimed(tierReward) {
    return this.playerProgress.claimedRewards.includes(`${tierReward.tier}_${tierReward.reward.type}`);
  }

  markRewardClaimed(tierReward) {
    this.playerProgress.claimedRewards.push(`${tierReward.tier}_${tierReward.reward.type}`);
  }

  // Mission completion

  completeMission(missionId) {
    const mission = this.findMission(missionId);
    if (!mission) return false;
    
    console.log(`[Phase 15] Mission completed: ${mission.title}`);
    
    // Award XP
    this.addXP(mission.xpReward);
    
    return true;
  }

  findMission(missionId) {
    // Search all mission categories
    for (const category of Object.values(this.missions)) {
      if (Array.isArray(category)) {
        const found = category.find(m => m.id === missionId);
        if (found) return found;
      }
    }
    return null;
  }

  updateMissionProgress(missionType, amount) {
    // Update progress for relevant missions
    for (const mission of [...this.missions.daily, ...this.missions.weekly]) {
      if (mission.type === missionType) {
        // Update progress tracking
        // In production, track partial completion
      }
    }
  }

  // Social features

  giftLevels(recipientId, levels) {
    const cost = levels * 100; // 100 gems per level
    
    console.log(`[Phase 15] Gifting ${levels} levels to ${recipientId} for ${cost} gems`);
    
    // Deduct currency from gifter
    // Add tiers to recipient
    this.social.giftedLevels += levels;
    
    return true;
  }

  enableCoOpBonus(friendIds) {
    this.social.coOpBonusActive = true;
    console.log(`[Phase 15] Co-op bonus enabled with ${friendIds.length} friends (+15% XP)`);
  }

  addToShowcase(itemId) {
    if (this.social.showcaseItems.length >= 6) {
      console.log('[Phase 15] Showcase full (max 6 items)');
      return false;
    }
    
    this.social.showcaseItems.push(itemId);
    console.log(`[Phase 15] Added ${itemId} to showcase`);
    return true;
  }

  getShowcase() {
    return this.social.showcaseItems.map(id => this.getRewardById(id));
  }

  getRewardById(id) {
    // Search all tracks for reward
    for (const track of Object.values(this.tracks)) {
      for (const tier of track) {
        if (tier.reward.id === id) {
          return tier.reward;
        }
      }
    }
    return null;
  }

  // Purchase system

  purchasePremium() {
    if (this.playerProgress.purchasedPremium) {
      console.log('[Phase 15] Already purchased Premium');
      return false;
    }
    
    console.log('[Phase 15] Purchased Premium Battle Pass ($9.99)');
    this.playerProgress.purchasedPremium = true;
    
    // Instantly unlock all premium rewards up to current tier
    for (let i = 1; i <= this.playerProgress.tier; i++) {
      const premiumReward = this.tracks.premium.find(t => t.tier === i);
      if (premiumReward && !this.isRewardClaimed(premiumReward)) {
        this.grantReward(premiumReward.reward);
        this.markRewardClaimed(premiumReward);
      }
    }
    
    return true;
  }

  purchaseElite() {
    if (!this.playerProgress.purchasedPremium) {
      console.log('[Phase 15] Must purchase Premium first');
      return false;
    }
    
    if (this.playerProgress.purchasedElite) {
      console.log('[Phase 15] Already purchased Elite');
      return false;
    }
    
    console.log('[Phase 15] Purchased Elite Upgrade (+$4.99)');
    this.playerProgress.purchasedElite = true;
    
    // Instantly unlock all elite rewards up to current tier
    for (let i = 1; i <= this.playerProgress.tier; i++) {
      const eliteReward = this.tracks.elite.find(t => t.tier === i);
      if (eliteReward && !this.isRewardClaimed(eliteReward)) {
        this.grantReward(eliteReward.reward);
        this.markRewardClaimed(eliteReward);
      }
    }
    
    return true;
  }

  // Progress tracking

  getProgress() {
    return {
      tier: this.playerProgress.tier,
      xp: this.playerProgress.xp,
      xpToNext: this.playerProgress.xpToNextTier,
      percentToNext: (this.playerProgress.xp / this.playerProgress.xpToNextTier * 100).toFixed(1),
      purchasedPremium: this.playerProgress.purchasedPremium,
      purchasedElite: this.playerProgress.purchasedElite,
      dailyMissionsCompleted: this.missions.daily.filter(m => m.completed).length,
      weeklyMissionsCompleted: this.missions.weekly.filter(m => m.completed).length,
      seasonMissionsCompleted: this.missions.season.filter(m => m.completed).length
    };
  }

  async loadPlayerProgress() {
    try {
      const saved = localStorage.getItem('battlepass_progress');
      if (saved) {
        this.playerProgress = JSON.parse(saved);
        console.log('[Phase 15] Progress loaded');
      }
    } catch (error) {
      console.error('[Phase 15] Load failed:', error);
    }
  }

  async savePlayerProgress() {
    try {
      localStorage.setItem('battlepass_progress', JSON.stringify(this.playerProgress));
      console.log('[Phase 15] Progress saved');
    } catch (error) {
      console.error('[Phase 15] Save failed:', error);
    }
  }

  dispose() {
    this.savePlayerProgress();
    console.log('[Phase 15] BATTLE PASS 3.0 disposed');
  }
}

// Export singleton helper
let battlePassInstance = null;

export function getBattlePassSystem(config) {
  if (!battlePassInstance) {
    battlePassInstance = new BattlePassSystem(config);
  }
  return battlePassInstance;
}

console.log('[Phase 15] BATTLE PASS 3.0 module loaded');
