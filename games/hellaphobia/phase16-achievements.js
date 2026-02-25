/* ============================================================
   HELLAPHOBIA - PHASE 16: ACHIEVEMENTS & REWARDS
   100+ Achievements | Titles | Profile | Mastery System
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 16: ACHIEVEMENT DATABASE =====
    const AchievementDatabase = {
        // Story Achievements (15)
        story: [
            { id: 'story_001', name: 'First Steps', description: 'Complete Phase 1', icon: '👣', points: 10, rarity: 'common', requirement: { type: 'phase_complete', phase: 1 } },
            { id: 'story_002', name: 'Getting Started', description: 'Complete Phase 3', icon: '🚶', points: 15, rarity: 'common', requirement: { type: 'phase_complete', phase: 3 } },
            { id: 'story_003', name: 'Halfway There', description: 'Complete Phase 5', icon: '🏃', points: 25, rarity: 'uncommon', requirement: { type: 'phase_complete', phase: 5 } },
            { id: 'story_004', name: 'Veteran', description: 'Complete Phase 7', icon: '⭐', points: 35, rarity: 'uncommon', requirement: { type: 'phase_complete', phase: 7 } },
            { id: 'story_005', name: 'Expert', description: 'Complete Phase 10', icon: '🏆', points: 50, rarity: 'rare', requirement: { type: 'phase_complete', phase: 10 } },
            { id: 'story_006', name: 'Master', description: 'Complete Phase 12', icon: '💎', points: 75, rarity: 'epic', requirement: { type: 'phase_complete', phase: 12 } },
            { id: 'story_007', name: 'Legend', description: 'Complete Phase 14', icon: '👑', points: 100, rarity: 'legendary', requirement: { type: 'phase_complete', phase: 14 } },
            { id: 'story_008', name: 'The Warden Falls', description: 'Defeat The Warden', icon: '⚔️', points: 50, rarity: 'rare', requirement: { type: 'boss_defeat', boss: 'warden' } },
            { id: 'story_009', name: 'Soul Collector', description: 'Defeat The Collector', icon: '💀', points: 75, rarity: 'epic', requirement: { type: 'boss_defeat', boss: 'collector' } },
            { id: 'story_010', name: 'Game Breaker', description: 'Defeat Hellaphobia', icon: '🎮', points: 200, rarity: 'legendary', requirement: { type: 'boss_defeat', boss: 'hellaphobia' } },
            { id: 'story_011', name: 'True Ending', description: 'Unlock the true ending', icon: '✨', points: 500, rarity: 'legendary', requirement: { type: 'ending', ending: 'true' } },
            { id: 'story_012', name: 'Storyteller', description: 'Complete all story modes', icon: '📖', points: 100, rarity: 'epic', requirement: { type: 'all_stories' } },
            { id: 'story_013', name: 'Lore Master', description: 'Find all lore collectibles', icon: '📚', points: 75, rarity: 'epic', requirement: { type: 'collectibles', category: 'lore', count: 20 } },
            { id: 'story_014', name: 'Secret Hunter', description: 'Discover all secret levels', icon: '🗝️', points: 100, rarity: 'legendary', requirement: { type: 'secrets', count: 20 } },
            { id: 'story_015', name: 'Completionist', description: '100% complete the game', icon: '💯', points: 1000, rarity: 'mythic', requirement: { type: 'completion', percent: 100 } }
        ],

        // Combat Achievements (20)
        combat: [
            { id: 'combat_001', name: 'First Blood', description: 'Defeat your first enemy', icon: '🩸', points: 10, rarity: 'common', requirement: { type: 'kills', count: 1 } },
            { id: 'combat_002', name: 'Monster Slayer', description: 'Defeat 100 enemies', icon: '⚔️', points: 25, rarity: 'uncommon', requirement: { type: 'kills', count: 100 } },
            { id: 'combat_003', name: 'Monster Hunter', description: 'Defeat 500 enemies', icon: '🏹', points: 50, rarity: 'rare', requirement: { type: 'kills', count: 500 } },
            { id: 'combat_004', name: 'Monster Exterminator', description: 'Defeat 1000 enemies', icon: '💀', points: 75, rarity: 'epic', requirement: { type: 'kills', count: 1000 } },
            { id: 'combat_005', name: 'Death Incarnate', description: 'Defeat 5000 enemies', icon: '☠️', points: 150, rarity: 'legendary', requirement: { type: 'kills', count: 5000 } },
            { id: 'combat_006', name: 'Combo Novice', description: 'Achieve a 5-hit combo', icon: '👊', points: 15, rarity: 'common', requirement: { type: 'combo', count: 5 } },
            { id: 'combat_007', name: 'Combo Master', description: 'Achieve a 20-hit combo', icon: '💥', points: 50, rarity: 'rare', requirement: { type: 'combo', count: 20 } },
            { id: 'combat_008', name: 'Combo God', description: 'Achieve a 50-hit combo', icon: '🔥', points: 100, rarity: 'legendary', requirement: { type: 'combo', count: 50 } },
            { id: 'combat_009', name: 'Parry Beginner', description: 'Successfully parry 10 attacks', icon: '🛡️', points: 20, rarity: 'common', requirement: { type: 'parries', count: 10 } },
            { id: 'combat_010', name: 'Parry Master', description: 'Successfully parry 100 attacks', icon: '⚡', points: 50, rarity: 'rare', requirement: { type: 'parries', count: 100 } },
            { id: 'combat_011', name: 'Untouchable', description: 'Parry 500 attacks', icon: '👻', points: 100, rarity: 'epic', requirement: { type: 'parries', count: 500 } },
            { id: 'combat_012', name: 'Headshot Hero', description: 'Get 50 critical hits', icon: '🎯', points: 30, rarity: 'uncommon', requirement: { type: 'criticals', count: 50 } },
            { id: 'combat_013', name: 'Critical Mass', description: 'Get 200 critical hits', icon: '💢', points: 60, rarity: 'rare', requirement: { type: 'criticals', count: 200 } },
            { id: 'combat_014', name: 'Stealth Killer', description: 'Defeat 50 enemies with stealth', icon: '🥷', points: 40, rarity: 'uncommon', requirement: { type: 'stealth_kills', count: 50 } },
            { id: 'combat_015', name: 'Shadow Assassin', description: 'Defeat 200 enemies with stealth', icon: '🌑', points: 80, rarity: 'epic', requirement: { type: 'stealth_kills', count: 200 } },
            { id: 'combat_016', name: 'Ranged Expert', description: 'Defeat 100 enemies with ranged attacks', icon: '🏹', points: 35, rarity: 'uncommon', requirement: { type: 'ranged_kills', count: 100 } },
            { id: 'combat_017', name: 'Melee Master', description: 'Defeat 200 enemies with melee', icon: '🗡️', points: 40, rarity: 'rare', requirement: { type: 'melee_kills', count: 200 } },
            { id: 'combat_018', name: 'No Scope', description: 'Defeat a boss using only ranged attacks', icon: '🎯', points: 75, rarity: 'epic', requirement: { type: 'boss_ranged_only' } },
            { id: 'combat_019', name: 'Pacifist', description: 'Complete a phase without killing', icon: '🕊️', points: 100, rarity: 'legendary', requirement: { type: 'pacifist_phase' } },
            { id: 'combat_020', name: 'Warrior', description: 'Complete a phase using only melee', icon: '⚔️', points: 50, rarity: 'rare', requirement: { type: 'melee_only_phase' } }
        ],

        // Survival Achievements (15)
        survival: [
            { id: 'survival_001', name: 'Still Breathing', description: 'Survive with 1 HP', icon: '❤️', points: 25, rarity: 'uncommon', requirement: { type: 'low_hp_survive', hp: 1 } },
            { id: 'survival_002', name: 'Phoenix', description: 'Revive from death', icon: '🔥', points: 50, rarity: 'rare', requirement: { type: 'revive' } },
            { id: 'survival_003', name: 'Immortal', description: 'Complete a phase without dying', icon: '♾️', points: 75, rarity: 'epic', requirement: { type: 'no_death_phase' } },
            { id: 'survival_004', name: 'Iron Man', description: 'Complete the game without dying', icon: '🛡️', points: 500, rarity: 'mythic', requirement: { type: 'no_death_run' } },
            { id: 'survival_005', name: 'Healthy', description: 'Complete a phase with full HP', icon: '💪', points: 20, rarity: 'common', requirement: { type: 'full_hp_phase' } },
            { id: 'survival_006', name: 'Sane Mind', description: 'Complete a phase with 100% sanity', icon: '🧠', points: 30, rarity: 'uncommon', requirement: { type: 'full_sanity_phase' } },
            { id: 'survival_007', name: 'Perfect Run', description: 'Complete a phase without taking damage', icon: '✨', points: 100, rarity: 'legendary', requirement: { type: 'no_damage_phase' } },
            { id: 'survival_008', name: 'Flawless', description: 'Complete the game without taking damage', icon: '💎', points: 1000, rarity: 'mythic', requirement: { type: 'no_damage_run' } },
            { id: 'survival_009', name: 'Endurance', description: 'Survive for 30 minutes', icon: '⏱️', points: 40, rarity: 'uncommon', requirement: { type: 'survival_time', minutes: 30 } },
            { id: 'survival_010', name: 'Marathon', description: 'Survive for 2 hours', icon: '🏃', points: 100, rarity: 'epic', requirement: { type: 'survival_time', minutes: 120 } },
            { id: 'survival_011', name: 'Ultra Marathon', description: 'Survive for 5 hours', icon: '🏆', points: 200, rarity: 'legendary', requirement: { type: 'survival_time', minutes: 300 } },
            { id: 'survival_012', name: 'Last Stand', description: 'Defeat 10 enemies with less than 10% HP', icon: '🩹', points: 50, rarity: 'rare', requirement: { type: 'low_hp_kills', count: 10 } },
            { id: 'survival_013', name: 'Comeback Kid', description: 'Win after being at death\'s door', icon: '🔄', points: 35, rarity: 'uncommon', requirement: { type: 'comeback_win' } },
            { id: 'survival_014', name: 'Resilient', description: 'Survive 1000 damage in a single run', icon: '🔨', points: 40, rarity: 'rare', requirement: { type: 'damage_survived', amount: 1000 } },
            { id: 'survival_015', name: 'Unbreakable', description: 'Survive 5000 damage in a single run', icon: '🏔️', points: 100, rarity: 'epic', requirement: { type: 'damage_survived', amount: 5000 } }
        ],

        // Speed Achievements (10)
        speed: [
            { id: 'speed_001', name: 'Quick Start', description: 'Complete Phase 1 in under 2 minutes', icon: '⚡', points: 25, rarity: 'uncommon', requirement: { type: 'speed_phase', phase: 1, time: 120 } },
            { id: 'speed_002', name: 'Speedster', description: 'Complete Phase 5 in under 5 minutes', icon: '💨', points: 50, rarity: 'rare', requirement: { type: 'speed_phase', phase: 5, time: 300 } },
            { id: 'speed_003', name: 'Flash', description: 'Complete Phase 10 in under 10 minutes', icon: '🌩️', points: 75, rarity: 'epic', requirement: { type: 'speed_phase', phase: 10, time: 600 } },
            { id: 'speed_004', name: 'Speed Demon', description: 'Complete the game in under 1 hour', icon: '🏎️', points: 200, rarity: 'legendary', requirement: { type: 'speed_run', time: 3600 } },
            { id: 'speed_005', name: 'Lightning Fast', description: 'Complete the game in under 30 minutes', icon: '⚡', points: 500, rarity: 'mythic', requirement: { type: 'speed_run', time: 1800 } },
            { id: 'speed_006', name: 'Record Breaker', description: 'Set a leaderboard record', icon: '📊', points: 100, rarity: 'epic', requirement: { type: 'leaderboard_record' } },
            { id: 'speed_007', name: 'Top 10', description: 'Reach top 10 on any leaderboard', icon: '🏅', points: 150, rarity: 'legendary', requirement: { type: 'leaderboard_top', rank: 10 } },
            { id: 'speed_008', name: '#1 Player', description: 'Reach #1 on any leaderboard', icon: '👑', points: 500, rarity: 'mythic', requirement: { type: 'leaderboard_top', rank: 1 } },
            { id: 'speed_009', name: 'Quick Draw', description: 'Defeat a boss in under 30 seconds', icon: '🎯', points: 75, rarity: 'epic', requirement: { type: 'speed_boss', time: 30 } },
            { id: 'speed_010', name: 'Blink and Miss', description: 'Defeat a boss in under 10 seconds', icon: '👁️', points: 200, rarity: 'legendary', requirement: { type: 'speed_boss', time: 10 } }
        ],

        // Collection Achievements (15)
        collection: [
            { id: 'collect_001', name: 'Treasure Hunter', description: 'Find 10 collectibles', icon: '💰', points: 20, rarity: 'common', requirement: { type: 'collectibles', count: 10 } },
            { id: 'collect_002', name: 'Collector', description: 'Find 25 collectibles', icon: '📦', points: 40, rarity: 'uncommon', requirement: { type: 'collectibles', count: 25 } },
            { id: 'collect_003', name: 'Hoarder', description: 'Find 50 collectibles', icon: '💎', points: 75, rarity: 'rare', requirement: { type: 'collectibles', count: 50 } },
            { id: 'collect_004', name: 'Completionist', description: 'Find all collectibles', icon: '🏆', points: 200, rarity: 'legendary', requirement: { type: 'collectibles', count: 100 } },
            { id: 'collect_005', name: 'First Find', description: 'Find your first collectible', icon: '🔍', points: 10, rarity: 'common', requirement: { type: 'collectibles', count: 1 } },
            { id: 'collect_006', name: 'Character Collector', description: 'Unlock all characters', icon: '🎭', points: 100, rarity: 'epic', requirement: { type: 'characters', count: 6 } },
            { id: 'collect_007', name: 'Fashion Icon', description: 'Unlock all costumes', icon: '👔', points: 75, rarity: 'rare', requirement: { type: 'costumes', count: 10 } },
            { id: 'collect_008', name: 'Art Lover', description: 'Unlock all concept art', icon: '🎨', points: 50, rarity: 'rare', requirement: { type: 'gallery', count: 50 } },
            { id: 'collect_009', name: 'Music Master', description: 'Unlock all music tracks', icon: '🎵', points: 40, rarity: 'uncommon', requirement: { type: 'music', count: 20 } },
            { id: 'collect_010', name: 'Mod Enthusiast', description: 'Subscribe to 10 workshop mods', icon: '📥', points: 25, rarity: 'common', requirement: { type: 'workshop_subscribe', count: 10 } },
            { id: 'collect_011', name: 'Mod Creator', description: 'Upload your first mod', icon: '📤', points: 50, rarity: 'uncommon', requirement: { type: 'workshop_upload' } },
            { id: 'collect_012', name: 'Popular Creator', description: 'Get 1000 downloads on a mod', icon: '⭐', points: 100, rarity: 'epic', requirement: { type: 'workshop_downloads', count: 1000 } },
            { id: 'collect_013', name: 'Level Designer', description: 'Create and save 5 custom levels', icon: '🏗️', points: 50, rarity: 'rare', requirement: { type: 'levels_created', count: 5 } },
            { id: 'collect_014', name: 'Monster Maker', description: 'Create 10 custom monsters', icon: '👹', points: 40, rarity: 'uncommon', requirement: { type: 'monsters_created', count: 10 } },
            { id: 'collect_015', name: 'Storyteller', description: 'Create a custom story', icon: '📖', points: 60, rarity: 'rare', requirement: { type: 'story_created' } }
        ],

        // Challenge Achievements (15)
        challenge: [
            { id: 'challenge_001', name: 'First Steps', description: 'Complete the tutorial', icon: '👶', points: 10, rarity: 'common', requirement: { type: 'tutorial_complete' } },
            { id: 'challenge_002', name: 'Daily Challenge', description: 'Complete a daily challenge', icon: '📅', points: 20, rarity: 'common', requirement: { type: 'daily_challenge' } },
            { id: 'challenge_003', name: 'Weekly Warrior', description: 'Complete all weekly challenges', icon: '📆', points: 50, rarity: 'rare', requirement: { type: 'weekly_challenges' } },
            { id: 'challenge_004', name: 'Monthly Master', description: 'Complete all monthly challenges', icon: '🗓️', points: 100, rarity: 'epic', requirement: { type: 'monthly_challenges' } },
            { id: 'challenge_005', name: 'Streak Master', description: 'Maintain a 7-day login streak', icon: '🔥', points: 50, rarity: 'rare', requirement: { type: 'login_streak', days: 7 } },
            { id: 'challenge_006', name: 'Dedicated', description: 'Maintain a 30-day login streak', icon: '💪', points: 150, rarity: 'legendary', requirement: { type: 'login_streak', days: 30 } },
            { id: 'challenge_007', name: 'Boss Rush', description: 'Defeat all bosses in boss rush mode', icon: '👹', points: 200, rarity: 'legendary', requirement: { type: 'boss_rush_complete' } },
            { id: 'challenge_008', name: 'Endless Runner', description: 'Reach wave 50 in endless mode', icon: '∞', points: 75, rarity: 'epic', requirement: { type: 'endless_wave', wave: 50 } },
            { id: 'challenge_009', name: 'Endless God', description: 'Reach wave 100 in endless mode', icon: '♾️', points: 200, rarity: 'legendary', requirement: { type: 'endless_wave', wave: 100 } },
            { id: 'challenge_010', name: 'Hardcore', description: 'Complete a phase in hardcore mode', icon: '☠️', points: 100, rarity: 'epic', requirement: { type: 'hardcore_phase' } },
            { id: 'challenge_011', name: 'Masochist', description: 'Complete the game in hardcore mode', icon: '💀', points: 500, rarity: 'mythic', requirement: { type: 'hardcore_complete' } },
            { id: 'challenge_012', name: 'Nightmare', description: 'Complete a phase in nightmare mode', icon: '😱', points: 150, rarity: 'legendary', requirement: { type: 'nightmare_phase' } },
            { id: 'challenge_013', name: 'Insane', description: 'Complete the game in nightmare mode', icon: '🤯', points: 1000, rarity: 'mythic', requirement: { type: 'nightmare_complete' } },
            { id: 'challenge_014', name: 'Co-op Partner', description: 'Complete a phase in co-op', icon: '🤝', points: 30, rarity: 'uncommon', requirement: { type: 'coop_complete' } },
            { id: 'challenge_015', name: 'Team Player', description: 'Complete the game in co-op', icon: '👥', points: 150, rarity: 'epic', requirement: { type: 'coop_complete_game' } }
        ],

        // Special Achievements (10)
        special: [
            { id: 'special_001', name: 'Early Bird', description: 'Play during beta', icon: '🐦', points: 100, rarity: 'mythic', requirement: { type: 'beta_player' } },
            { id: 'special_002', name: 'Community Member', description: 'Join the Discord', icon: '💬', points: 25, rarity: 'common', requirement: { type: 'discord_join' } },
            { id: 'special_003', name: 'Social Butterfly', description: 'Share your achievement', icon: '📢', points: 20, rarity: 'common', requirement: { type: 'social_share' } },
            { id: 'special_004', name: 'Reviewer', description: 'Leave a review', icon: '⭐', points: 30, rarity: 'uncommon', requirement: { type: 'review_leave' } },
            { id: 'special_005', name: 'Bug Hunter', description: 'Report a valid bug', icon: '🐛', points: 50, rarity: 'rare', requirement: { type: 'bug_report' } },
            { id: 'special_006', name: 'Helper', description: 'Help another player', icon: '🤗', points: 40, rarity: 'uncommon', requirement: { type: 'help_player' } },
            { id: 'special_007', name: 'Mentor', description: 'Guide 10 new players', icon: '🧙', points: 100, rarity: 'epic', requirement: { type: 'mentor_players', count: 10 } },
            { id: 'special_008', name: 'Anniversary', description: 'Play on the anniversary', icon: '🎂', points: 50, rarity: 'rare', requirement: { type: 'anniversary_login' } },
            { id: 'special_009', name: 'Holiday Spirit', description: 'Play during a holiday event', icon: '🎄', points: 30, rarity: 'uncommon', requirement: { type: 'holiday_event' } },
            { id: 'special_010', name: 'Developer Friend', description: 'Meet the developer', icon: '👨‍💻', points: 100, rarity: 'legendary', requirement: { type: 'dev_meet' } }
        ]
    };

    // ===== PHASE 16: ACHIEVEMENT MANAGER =====
    const AchievementManager = {
        unlockedAchievements: [],
        progress: {},
        totalPoints: 0,
        lastCheck: 0,

        init() {
            this.loadProgress();
            this.checkAllAchievements();
            console.log('Phase 16: Achievement Manager initialized');
        },

        // Check all achievements
        checkAllAchievements() {
            const playerStats = this.getPlayerStats();

            for (const category in AchievementDatabase) {
                AchievementDatabase[category].forEach(achievement => {
                    if (!this.isUnlocked(achievement.id)) {
                        this.checkAchievement(achievement, playerStats);
                    }
                });
            }
        },

        // Check single achievement
        checkAchievement(achievement, stats) {
            const requirement = achievement.requirement;
            let unlocked = false;

            switch (requirement.type) {
                case 'kills':
                    unlocked = stats.totalKills >= requirement.count;
                    break;
                case 'phase_complete':
                    unlocked = stats.maxPhase >= requirement.phase;
                    break;
                case 'boss_defeat':
                    unlocked = stats.bossesDefeated.includes(requirement.boss);
                    break;
                case 'combo':
                    unlocked = stats.maxCombo >= requirement.count;
                    break;
                case 'parries':
                    unlocked = stats.totalParries >= requirement.count;
                    break;
                case 'collectibles':
                    unlocked = stats.totalCollectibles >= requirement.count;
                    break;
                case 'speed_phase':
                    const phaseTime = stats.phaseTimes[requirement.phase];
                    unlocked = phaseTime && phaseTime <= requirement.time;
                    break;
                case 'speed_run':
                    unlocked = stats.bestTime && stats.bestTime <= requirement.time;
                    break;
                case 'no_damage_phase':
                    unlocked = stats.noDamagePhases > 0;
                    break;
                case 'no_death_run':
                    unlocked = stats.noDeathRun;
                    break;
                case 'login_streak':
                    unlocked = stats.loginStreak >= requirement.days;
                    break;
                case 'completion':
                    unlocked = stats.completionPercent >= requirement.percent;
                    break;
            }

            if (unlocked) {
                this.unlockAchievement(achievement.id);
            } else {
                // Update progress
                this.updateProgress(achievement, stats);
            }
        },

        // Unlock achievement
        unlockAchievement(achievementId) {
            if (this.isUnlocked(achievementId)) return;

            const achievement = this.findAchievement(achievementId);
            if (!achievement) return;

            this.unlockedAchievements.push({
                id: achievementId,
                unlockedAt: Date.now()
            });

            this.totalPoints += achievement.points;

            // Save progress
            this.saveProgress();

            // Show notification
            this.showUnlockNotification(achievement);

            // Track event
            EventTracker.track('achievement_unlocked', {
                achievementId,
                name: achievement.name,
                points: achievement.points,
                rarity: achievement.rarity
            });

            console.log('[Achievement] Unlocked:', achievement.name);
        },

        // Find achievement by ID
        findAchievement(achievementId) {
            for (const category in AchievementDatabase) {
                const achievement = AchievementDatabase[category].find(a => a.id === achievementId);
                if (achievement) return achievement;
            }
            return null;
        },

        // Check if achievement is unlocked
        isUnlocked(achievementId) {
            return this.unlockedAchievements.some(a => a.id === achievementId);
        },

        // Update progress for achievement
        updateProgress(achievement, stats) {
            const requirement = achievement.requirement;
            let current = 0;

            switch (requirement.type) {
                case 'kills':
                    current = stats.totalKills;
                    break;
                case 'collectibles':
                    current = stats.totalCollectibles;
                    break;
                case 'parries':
                    current = stats.totalParries;
                    break;
                case 'combo':
                    current = stats.maxCombo;
                    break;
            }

            if (current > 0) {
                this.progress[achievement.id] = {
                    current: current,
                    required: requirement.count || 100,
                    percent: Math.min(100, Math.round((current / (requirement.count || 100)) * 100))
                };
            }
        },

        // Get player stats
        getPlayerStats() {
            return {
                totalKills: parseInt(localStorage.getItem('hellaphobia_kills') || '0'),
                maxPhase: parseInt(localStorage.getItem('hellaphobia_max_phase') || '1'),
                bossesDefeated: JSON.parse(localStorage.getItem('hellaphobia_bosses') || '[]'),
                maxCombo: parseInt(localStorage.getItem('hellaphobia_max_combo') || '0'),
                totalParries: parseInt(localStorage.getItem('hellaphobia_parries') || '0'),
                totalCollectibles: parseInt(localStorage.getItem('hellaphobia_collectibles_count') || '0'),
                phaseTimes: JSON.parse(localStorage.getItem('hellaphobia_phase_times') || '{}'),
                bestTime: parseInt(localStorage.getItem('hellaphobia_best_time') || '0'),
                noDamagePhases: parseInt(localStorage.getItem('hellaphobia_no_damage') || '0'),
                noDeathRun: localStorage.getItem('hellaphobia_no_death_run') === 'true',
                loginStreak: parseInt(localStorage.getItem('hellaphobia_login_streak') || '0'),
                completionPercent: parseInt(localStorage.getItem('hellaphobia_completion') || '0')
            };
        },

        // Show unlock notification
        showUnlockNotification(achievement) {
            const rarityColors = {
                common: '#888888',
                uncommon: '#00ff00',
                rare: '#0088ff',
                epic: '#aa00ff',
                legendary: '#ffaa00',
                mythic: '#ff0044'
            };

            const color = rarityColors[achievement.rarity] || '#ffffff';

            // Create notification
            const notification = {
                title: '🏆 Achievement Unlocked!',
                text: achievement.name,
                subtext: achievement.description,
                points: `+${achievement.points} points`,
                color: color,
                icon: achievement.icon,
                duration: 5000
            };

            if (typeof window.showAchievementNotification === 'function') {
                window.showAchievementNotification(notification);
            }
        },

        // Save progress
        saveProgress() {
            localStorage.setItem('hellaphobia_achievements', JSON.stringify({
                unlocked: this.unlockedAchievements,
                totalPoints: this.totalPoints,
                progress: this.progress
            }));
        },

        // Load progress
        loadProgress() {
            const saved = localStorage.getItem('hellaphobia_achievements');
            if (saved) {
                const data = JSON.parse(saved);
                this.unlockedAchievements = data.unlocked || [];
                this.totalPoints = data.totalPoints || 0;
                this.progress = data.progress || {};
            }
        },

        // Get achievement progress
        getProgress() {
            const total = this.getTotalAchievements();
            const unlocked = this.unlockedAchievements.length;

            return {
                unlocked: unlocked,
                total: total,
                percent: Math.round((unlocked / total) * 100),
                points: this.totalPoints,
                byRarity: this.getByRarity(),
                byCategory: this.getByCategory()
            };
        },

        // Get total achievements
        getTotalAchievements() {
            let total = 0;
            for (const category in AchievementDatabase) {
                total += AchievementDatabase[category].length;
            }
            return total;
        },

        // Get achievements by rarity
        getByRarity() {
            const rarity = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 };

            this.unlockedAchievements.forEach(a => {
                const achievement = this.findAchievement(a.id);
                if (achievement && achievement.rarity) {
                    rarity[achievement.rarity]++;
                }
            });

            return rarity;
        },

        // Get achievements by category
        getByCategory() {
            const category = {};

            for (const cat in AchievementDatabase) {
                category[cat] = this.unlockedAchievements.filter(a =>
                    AchievementDatabase[cat].some(ach => ach.id === a.id)
                ).length;
            }

            return category;
        },

        // Get all achievements
        getAllAchievements() {
            return AchievementDatabase;
        },

        // Get unlocked achievements
        getUnlockedAchievements() {
            return this.unlockedAchievements.map(a => ({
                ...this.findAchievement(a.id),
                unlockedAt: a.unlockedAt
            }));
        },

        // Get locked achievements
        getLockedAchievements() {
            const all = [];
            for (const category in AchievementDatabase) {
                all.push(...AchievementDatabase[category]);
            }
            return all.filter(a => !this.isUnlocked(a.id));
        },

        // Get achievements by category
        getByCategoryName(categoryName) {
            return AchievementDatabase[categoryName] || [];
        },

        // Get achievements by rarity
        getByRarityName(rarityName) {
            const all = [];
            for (const category in AchievementDatabase) {
                all.push(...AchievementDatabase[category].filter(a => a.rarity === rarityName));
            }
            return all;
        }
    };

    // ===== PHASE 16: TITLE SYSTEM =====
    const TitleSystem = {
        titles: [],
        equippedTitle: null,

        init() {
            this.loadTitles();
            console.log('Phase 16: Title System initialized');
        },

        // Unlock title
        unlockTitle(titleId) {
            if (!this.titles.includes(titleId)) {
                this.titles.push(titleId);
                this.saveTitles();

                EventTracker.track('title_unlocked', { titleId });
                console.log('[Title] Unlocked:', titleId);
            }
        },

        // Equip title
        equipTitle(titleId) {
            if (this.titles.includes(titleId)) {
                this.equippedTitle = titleId;
                localStorage.setItem('hellaphobia_equipped_title', titleId);
                console.log('[Title] Equipped:', titleId);
            }
        },

        // Get equipped title
        getEquippedTitle() {
            return this.equippedTitle;
        },

        // Get all titles
        getTitles() {
            return this.titles.map(id => this.getTitleData(id));
        },

        // Get title data
        getTitleData(titleId) {
            const titles = {
                'novice': { name: 'Novice', icon: '👶', color: '#888888' },
                'warrior': { name: 'Warrior', icon: '⚔️', color: '#00ff00' },
                'veteran': { name: 'Veteran', icon: '⭐', color: '#0088ff' },
                'expert': { name: 'Expert', icon: '💎', color: '#aa00ff' },
                'master': { name: 'Master', icon: '👑', color: '#ffaa00' },
                'legend': { name: 'Legend', icon: '🔥', color: '#ff0044' },
                'mythic': { name: 'Mythic', icon: '✨', color: '#ff00ff' },
                'speedster': { name: 'Speedster', icon: '⚡', color: '#ffff00' },
                'hunter': { name: 'Hunter', icon: '🏹', color: '#00ff88' },
                'survivor': { name: 'Survivor', icon: '🛡️', color: '#ff8800' }
            };
            return titles[titleId] || { name: titleId, icon: '📛', color: '#888888' };
        },

        // Save titles
        saveTitles() {
            localStorage.setItem('hellaphobia_titles', JSON.stringify(this.titles));
        },

        // Load titles
        loadTitles() {
            const saved = localStorage.getItem('hellaphobia_titles');
            if (saved) {
                this.titles = JSON.parse(saved);
            }
            this.equippedTitle = localStorage.getItem('hellaphobia_equipped_title');
        }
    };

    // ===== PHASE 16: PROFILE SYSTEM =====
    const ProfileSystem = {
        profile: null,

        init() {
            this.loadProfile();
            console.log('Phase 16: Profile System initialized');
        },

        // Get or create profile
        getProfile() {
            if (!this.profile) {
                this.profile = {
                    playerId: this.getPlayerId(),
                    playerName: 'Player',
                    level: 1,
                    experience: 0,
                    prestige: 0,
                    joinDate: Date.now(),
                    lastLogin: Date.now(),
                    totalPlaytime: 0,
                    avatar: 'default',
                    border: 'default',
                    theme: 'default'
                };
            }
            return this.profile;
        },

        // Update profile
        updateProfile(updates) {
            Object.assign(this.profile, updates);
            this.saveProfile();
        },

        // Add experience
        addExperience(amount) {
            this.profile.experience += amount;

            // Check for level up
            const xpForNextLevel = this.profile.level * 1000;
            if (this.profile.experience >= xpForNextLevel) {
                this.profile.experience -= xpForNextLevel;
                this.profile.level++;
                this.onLevelUp();
            }

            this.saveProfile();
        },

        // Level up handler
        onLevelUp() {
            console.log('[Profile] Level up! New level:', this.profile.level);
            EventTracker.track('level_up', { level: this.profile.level });

            // Show notification
            if (typeof window.showLevelUpNotification === 'function') {
                window.showLevelUpNotification(this.profile.level);
            }
        },

        // Prestige
        prestige() {
            if (this.profile.level >= 100) {
                this.profile.prestige++;
                this.profile.level = 1;
                this.profile.experience = 0;
                this.saveProfile();

                EventTracker.track('prestige', { prestige: this.profile.prestige });
                console.log('[Profile] Prestiged! New prestige:', this.profile.prestige);
            }
        },

        // Get player ID
        getPlayerId() {
            let playerId = localStorage.getItem('hellaphobia_player_id');
            if (!playerId) {
                playerId = 'player_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('hellaphobia_player_id', playerId);
            }
            return playerId;
        },

        // Save profile
        saveProfile() {
            localStorage.setItem('hellaphobia_profile', JSON.stringify(this.profile));
        },

        // Load profile
        loadProfile() {
            const saved = localStorage.getItem('hellaphobia_profile');
            if (saved) {
                this.profile = JSON.parse(saved);
            }
        },

        // Get profile stats
        getStats() {
            return {
                ...this.getProfile(),
                achievements: AchievementManager.getProgress(),
                titles: TitleSystem.getTitles().length,
                equippedTitle: TitleSystem.getEquippedTitle()
            };
        }
    };

    // ===== PHASE 16: MASTERY SYSTEM =====
    const MasterySystem = {
        masteries: {},

        init() {
            this.loadMasteries();
            console.log('Phase 16: Mastery System initialized');
        },

        // Add mastery XP
        addMasteryXp(category, amount) {
            if (!this.masteries[category]) {
                this.masteries[category] = { level: 1, xp: 0 };
            }

            this.masteries[category].xp += amount;

            // Check for level up
            const xpForNext = this.masteries[category].level * 5000;
            if (this.masteries[category].xp >= xpForNext) {
                this.masteries[category].xp -= xpForNext;
                this.masteries[category].level++;
                this.onMasteryLevelUp(category);
            }

            this.saveMasteries();
        },

        // Mastery level up
        onMasteryLevelUp(category) {
            console.log('[Mastery] Level up!', category, this.masteries[category].level);
            EventTracker.track('mastery_level_up', {
                category,
                level: this.masteries[category].level
            });
        },

        // Get mastery level
        getMasteryLevel(category) {
            return this.masteries[category]?.level || 1;
        },

        // Get all masteries
        getMasteries() {
            return this.masteries;
        },

        // Save masteries
        saveMasteries() {
            localStorage.setItem('hellaphobia_masteries', JSON.stringify(this.masteries));
        },

        // Load masteries
        loadMasteries() {
            const saved = localStorage.getItem('hellaphobia_masteries');
            if (saved) {
                this.masteries = JSON.parse(saved);
            }
        }
    };

    // ===== PHASE 16: REWARDS SYSTEM =====
    const RewardsSystem = {
        rewards: [],

        init() {
            console.log('Phase 16: Rewards System initialized');
        },

        // Grant reward
        grantReward(reward) {
            this.rewards.push({
                ...reward,
                grantedAt: Date.now(),
                claimed: false
            });

            EventTracker.track('reward_granted', reward);
            console.log('[Rewards] Granted:', reward);
        },

        // Claim reward
        claimReward(rewardId) {
            const reward = this.rewards.find(r => r.id === rewardId);
            if (reward && !reward.claimed) {
                reward.claimed = true;

                // Apply reward effect
                this.applyReward(reward);

                EventTracker.track('reward_claimed', reward);
                return true;
            }
            return false;
        },

        // Apply reward effect
        applyReward(reward) {
            switch (reward.type) {
                case 'currency':
                    if (typeof window.addCurrency === 'function') {
                        window.addCurrency(reward.amount);
                    }
                    break;
                case 'item':
                    if (typeof Phase12Secrets !== 'undefined') {
                        // Add item to inventory
                    }
                    break;
                case 'unlock':
                    // Unlock content
                    break;
                case 'boost':
                    // Apply temporary boost
                    break;
            }
        },

        // Get unclaimed rewards
        getUnclaimedRewards() {
            return this.rewards.filter(r => !r.claimed);
        },

        // Get all rewards
        getAllRewards() {
            return this.rewards;
        }
    };

    // ===== PHASE 16: MAIN ACHIEVEMENTS MANAGER =====
    const Phase16Achievements = {
        initialized: false,

        init() {
            if (this.initialized) return;

            AchievementManager.init();
            TitleSystem.init();
            ProfileSystem.init();
            MasterySystem.init();
            RewardsSystem.init();

            this.initialized = true;
            console.log('Phase 16: Achievements & Rewards initialized');
        },

        // Achievements
        checkAchievements: () => AchievementManager.checkAllAchievements(),
        getAchievementProgress: () => AchievementManager.getProgress(),
        getUnlockedAchievements: () => AchievementManager.getUnlockedAchievements(),
        getAllAchievements: () => AchievementManager.getAllAchievements(),

        // Titles
        unlockTitle: (id) => TitleSystem.unlockTitle(id),
        equipTitle: (id) => TitleSystem.equipTitle(id),
        getTitles: () => TitleSystem.getTitles(),

        // Profile
        getProfile: () => ProfileSystem.getStats(),
        addExperience: (amount) => ProfileSystem.addExperience(amount),
        prestige: () => ProfileSystem.prestige(),

        // Mastery
        addMasteryXp: (category, amount) => MasterySystem.addMasteryXp(category, amount),
        getMasteries: () => MasterySystem.getMasteries(),

        // Rewards
        grantReward: (reward) => RewardsSystem.grantReward(reward),
        claimReward: (id) => RewardsSystem.claimReward(id)
    };

    // Export Phase 16 systems
    window.Phase16Achievements = Phase16Achievements;
    window.AchievementManager = AchievementManager;
    window.TitleSystem = TitleSystem;
    window.ProfileSystem = ProfileSystem;
    window.MasterySystem = MasterySystem;
    window.RewardsSystem = RewardsSystem;
    window.AchievementDatabase = AchievementDatabase;

})();
