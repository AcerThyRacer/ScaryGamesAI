/**
 * ScaryGamesAI — Engagement Systems v1.0
 * Phase 8: Account Levels, Mastery, Seasons, Challenges, Events, Retention
 */

var EngagementSystem = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    
    const CONFIG = {
        STORAGE_KEY: 'sgai_engagement',
        XP_PER_LEVEL_BASE: 1000,
        XP_PER_LEVEL_MULTIPLIER: 1.15,
        MAX_LEVEL: 100,
        PRESTIGE_LEVELS: 10,
        MASTERY_MAX_LEVEL: 50,
        SEASON_DURATION_DAYS: 90,
        DAILY_CHALLENGE_COUNT: 5,
        WEEKLY_CHALLENGE_COUNT: 7,
    };

    // ═══════════════════════════════════════════════════════════════
    // ACCOUNT LEVEL SYSTEM
    // ═══════════════════════════════════════════════════════════════
    
    const AccountLevel = {
        level: 1,
        xp: 0,
        totalXP: 0,
        prestige: 0,
        
        // XP sources and their base values
        xpSources: {
            game_complete: 100,
            game_win: 250,
            game_loss: 50,
            achievement_unlock: 50,
            daily_challenge: 75,
            weekly_challenge: 150,
            monthly_challenge: 500,
            secret_found: 25,
            boss_killed: 100,
            level_complete: 50,
            perfect_run: 200, // No deaths
            speedrun: 150,
            first_gameOfDay: 100,
            streak_bonus: 50,
        },
        
        // Level rewards
        levelRewards: {
            5: { souls: 500, title: 'Novice Survivor' },
            10: { souls: 1000, skin: 'bronze_frame', title: 'Horror Enthusiast' },
            15: { souls: 1500, pet_xp: 100, title: 'Fear Challenger' },
            20: { souls: 2000, skin: 'silver_frame', title: 'Nightmare Walker' },
            25: { souls: 2500, bloodGems: 10, title: 'Darkness Dweller' },
            30: { souls: 3000, skill_point: 1, title: 'Shadow Master' },
            35: { souls: 3500, skin: 'gold_frame', title: 'Horror Veteran' },
            40: { souls: 4000, pet: 'shadow_cat', title: 'Terror Expert' },
            45: { souls: 4500, bloodGems: 25, title: 'Fear Conqueror' },
            50: { souls: 5000, skin: 'diamond_frame', title: 'Legendary Survivor' },
            60: { souls: 6000, title: 'Nightmare Lord' },
            70: { souls: 7000, bloodGems: 50, title: 'Eldritch Hunter' },
            80: { souls: 8000, title: 'Immortal Terror' },
            90: { souls: 9000, title: 'Fear Incarnate' },
            100: { souls: 10000, skin: 'elder_frame', title: 'Elder God' },
        },
        
        init: function() {
            this.load();
        },
        
        load: function() {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY + '_account');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    this.level = data.level || 1;
                    this.xp = data.xp || 0;
                    this.totalXP = data.totalXP || 0;
                    this.prestige = data.prestige || 0;
                } catch (e) {}
            }
        },
        
        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_account', JSON.stringify({
                level: this.level,
                xp: this.xp,
                totalXP: this.totalXP,
                prestige: this.prestige,
            }));
        },
        
        // Calculate XP required for a level
        getXPForLevel: function(level) {
            return Math.floor(CONFIG.XP_PER_LEVEL_BASE * Math.pow(CONFIG.XP_PER_LEVEL_MULTIPLIER, level - 1));
        },
        
        // Get total XP required to reach a level from 0
        getTotalXPForLevel: function(level) {
            let total = 0;
            for (let i = 1; i < level; i++) {
                total += this.getXPForLevel(i);
            }
            return total;
        },
        
        // Add XP and handle level ups
        addXP: function(amount, source) {
            const oldLevel = this.level;
            
            // Apply prestige bonus
            const prestigeBonus = 1 + (this.prestige * 0.1);
            const finalAmount = Math.floor(amount * prestigeBonus);
            
            this.xp += finalAmount;
            this.totalXP += finalAmount;
            
            // Check for level ups
            const levelUps = [];
            while (this.level < CONFIG.MAX_LEVEL) {
                const required = this.getXPForLevel(this.level);
                if (this.xp >= required) {
                    this.xp -= required;
                    this.level++;
                    levelUps.push(this.level);
                    
                    // Grant level reward
                    const reward = this.levelRewards[this.level];
                    if (reward) {
                        this.grantReward(reward, this.level);
                    }
                } else {
                    break;
                }
            }
            
            this.save();
            
            // Dispatch events
            document.dispatchEvent(new CustomEvent('xpGained', {
                detail: { amount: finalAmount, source: source, newTotal: this.totalXP }
            }));
            
            if (levelUps.length > 0) {
                document.dispatchEvent(new CustomEvent('levelUp', {
                    detail: { levels: levelUps, newLevel: this.level }
                }));
                
                this.showLevelUpNotification(levelUps);
            }
            
            return {
                xpGained: finalAmount,
                newLevel: this.level,
                levelUps: levelUps,
            };
        },
        
        grantReward: function(reward, level) {
            if (typeof CrossGameMechanics !== 'undefined') {
                if (reward.souls) {
                    CrossGameMechanics.currency.add('souls', reward.souls, 'level_reward_' + level);
                }
                if (reward.bloodGems) {
                    CrossGameMechanics.currency.add('bloodGems', reward.bloodGems, 'level_reward_' + level);
                }
                if (reward.skill_point) {
                    CrossGameMechanics.skills.addPoints(reward.skill_point);
                }
                if (reward.pet_xp && CrossGameMechanics.pets) {
                    CrossGameMechanics.pets.addExperience(reward.pet_xp);
                }
                if (reward.pet) {
                    CrossGameMechanics.pets.grant(reward.pet, 'level_reward');
                }
                if (reward.skin) {
                    const [category, id] = reward.skin.split('_');
                    CrossGameMechanics.skins.grant(category || 'frame', id || reward.skin, 'level_reward');
                }
            }
            
            // Store unlocked titles
            if (reward.title) {
                const titles = JSON.parse(localStorage.getItem('sgai_unlocked_titles') || '[]');
                if (!titles.includes(reward.title)) {
                    titles.push(reward.title);
                    localStorage.setItem('sgai_unlocked_titles', JSON.stringify(titles));
                }
            }
        },
        
        showLevelUpNotification: function(levels) {
            const notification = document.createElement('div');
            notification.className = 'engagement-notification level-up';
            
            let content = '<div class="notification-icon">⬆️</div>';
            content += '<div class="notification-content">';
            content += '<div class="notification-title">LEVEL UP!</div>';
            content += '<div class="notification-message">Level ' + this.level + '</div>';
            
            const reward = this.levelRewards[this.level];
            if (reward) {
                content += '<div class="notification-reward">';
                if (reward.souls) content += '<span>👻 ' + reward.souls + '</span>';
                if (reward.bloodGems) content += '<span>💎 ' + reward.bloodGems + '</span>';
                if (reward.title) content += '<span>🏷️ ' + reward.title + '</span>';
                content += '</div>';
            }
            content += '</div>';
            
            notification.innerHTML = content;
            document.body.appendChild(notification);
            
            setTimeout(() => notification.classList.add('show'), 10);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 500);
            }, 4000);
        },
        
        // Prestige system
        canPrestige: function() {
            return this.level >= CONFIG.MAX_LEVEL && this.prestige < CONFIG.PRESTIGE_LEVELS;
        },
        
        prestige: function() {
            if (!this.canPrestige()) return false;
            
            this.prestige++;
            this.level = 1;
            this.xp = 0;
            
            // Prestige rewards
            const prestigeReward = {
                souls: 10000 * this.prestige,
                bloodGems: 50 * this.prestige,
                title: 'Prestige ' + this.prestige + ' - ' + this.getPrestigeTitle(),
            };
            
            this.grantReward(prestigeReward, 'prestige_' + this.prestige);
            this.save();
            
            document.dispatchEvent(new CustomEvent('prestigeUp', {
                detail: { prestige: this.prestige }
            }));
            
            return true;
        },
        
        getPrestigeTitle: function() {
            const titles = [
                'Reborn', 'Awakened', 'Transcendent', 'Eternal', 'Ascended',
                'Immortal', 'Divine', 'Celestial', 'Omniscient', 'Godlike'
            ];
            return titles[this.prestige - 1] || 'Legendary';
        },
        
        getProgress: function() {
            const currentRequired = this.getXPForLevel(this.level);
            const progress = this.level < CONFIG.MAX_LEVEL ? (this.xp / currentRequired) : 1;
            
            return {
                level: this.level,
                xp: this.xp,
                totalXP: this.totalXP,
                prestige: this.prestige,
                xpToNextLevel: currentRequired - this.xp,
                progress: progress,
                maxLevel: CONFIG.MAX_LEVEL,
            };
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // MASTERY SYSTEM
    // ═══════════════════════════════════════════════════════════════
    
    const MasterySystem = {
        masteries: {},
        
        // Mastery rewards per game
        masteryRewards: {
            5: { souls: 500, badge: 'bronze' },
            10: { souls: 1000, badge: 'silver' },
            20: { souls: 2000, badge: 'gold' },
            30: { souls: 3000, badge: 'platinum' },
            40: { souls: 4000, badge: 'diamond' },
            50: { souls: 5000, badge: 'mythic', title: true },
        },
        
        // XP sources for mastery
        masterySources: {
            game_play: 10,
            game_win: 25,
            secret_found: 5,
            boss_killed: 15,
            perfect_run: 50,
            speedrun: 30,
            no_damage: 40,
        },
        
        init: function() {
            this.load();
        },
        
        load: function() {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY + '_mastery');
            if (saved) {
                try {
                    this.masteries = JSON.parse(saved);
                } catch (e) {}
            }
        },
        
        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_mastery', JSON.stringify(this.masteries));
        },
        
        getMastery: function(gameId) {
            if (!this.masteries[gameId]) {
                this.masteries[gameId] = {
                    level: 1,
                    xp: 0,
                    totalXP: 0,
                    gamesPlayed: 0,
                    wins: 0,
                    secretsFound: 0,
                    bossesKilled: 0,
                    perfectRuns: 0,
                    bestTime: null,
                };
            }
            return this.masteries[gameId];
        },
        
        getXPForMasteryLevel: function(level) {
            return Math.floor(500 * Math.pow(1.1, level - 1));
        },
        
        addMasteryXP: function(gameId, amount, source) {
            const mastery = this.getMastery(gameId);
            const oldLevel = mastery.level;
            
            mastery.xp += amount;
            mastery.totalXP += amount;
            
            // Check for level up
            while (mastery.level < CONFIG.MASTERY_MAX_LEVEL) {
                const required = this.getXPForMasteryLevel(mastery.level);
                if (mastery.xp >= required) {
                    mastery.xp -= required;
                    mastery.level++;
                    
                    // Grant reward
                    const reward = this.masteryRewards[mastery.level];
                    if (reward) {
                        this.grantMasteryReward(gameId, reward, mastery.level);
                    }
                    
                    document.dispatchEvent(new CustomEvent('masteryLevelUp', {
                        detail: { gameId, level: mastery.level }
                    }));
                } else {
                    break;
                }
            }
            
            this.save();
            
            return {
                xpGained: amount,
                newLevel: mastery.level,
                levelUp: mastery.level > oldLevel,
            };
        },
        
        recordGameStats: function(gameId, stats) {
            const mastery = this.getMastery(gameId);
            
            mastery.gamesPlayed++;
            if (stats.won) mastery.wins++;
            if (stats.secretsFound) mastery.secretsFound += stats.secretsFound;
            if (stats.bossesKilled) mastery.bossesKilled += stats.bossesKilled;
            if (stats.perfectRun) mastery.perfectRuns++;
            
            if (stats.time && (!mastery.bestTime || stats.time < mastery.bestTime)) {
                mastery.bestTime = stats.time;
            }
            
            this.save();
        },
        
        grantMasteryReward: function(gameId, reward, level) {
            if (typeof CrossGameMechanics !== 'undefined') {
                if (reward.souls) {
                    CrossGameMechanics.currency.add('souls', reward.souls, 'mastery_' + gameId + '_' + level);
                }
            }
            
            // Store mastery badges
            if (reward.badge) {
                const badges = JSON.parse(localStorage.getItem('sgai_mastery_badges') || '{}');
                badges[gameId + '_' + level] = {
                    game: gameId,
                    level: level,
                    badge: reward.badge,
                    unlockedAt: Date.now(),
                };
                localStorage.setItem('sgai_mastery_badges', JSON.stringify(badges));
            }
            
            // Store mastery titles
            if (reward.title) {
                const gameName = gameId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const titles = JSON.parse(localStorage.getItem('sgai_unlocked_titles') || '[]');
                const title = gameName + ' Master';
                if (!titles.includes(title)) {
                    titles.push(title);
                    localStorage.setItem('sgai_unlocked_titles', JSON.stringify(titles));
                }
            }
        },
        
        getAllMasteries: function() {
            return Object.keys(this.masteries).map(gameId => ({
                gameId,
                ...this.masteries[gameId],
            }));
        },
        
        getTotalMasteryLevel: function() {
            return Object.values(this.masteries).reduce((sum, m) => sum + m.level, 0);
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // SEASON SYSTEM
    // ═══════════════════════════════════════════════════════════════
    
    const SeasonSystem = {
        currentSeason: null,
        seasonProgress: {},
        
        // Season themes
        themes: {
            winter: {
                name: 'Frozen Terror',
                icon: '❄️',
                color: '#00bfff',
                description: 'The cold brings ancient horrors...',
                exclusiveRewards: ['ice_trail', 'frost_aura', 'frozen_frame'],
            },
            spring: {
                name: 'Blooming Nightmare',
                icon: '🌸',
                color: '#ff69b4',
                description: 'Nature has been corrupted...',
                exclusiveRewards: ['flower_trail', 'nature_aura', 'bloom_frame'],
            },
            summer: {
                name: 'Scorching Hell',
                icon: '🔥',
                color: '#ff4500',
                description: 'The heat awakens the damned...',
                exclusiveRewards: ['fire_trail', 'flame_aura', 'inferno_frame'],
            },
            fall: {
                name: 'Harvest of Souls',
                icon: '🎃',
                color: '#ff8c00',
                description: 'The veil grows thin...',
                exclusiveRewards: ['pumpkin_trail', 'spooky_aura', 'harvest_frame'],
            },
        },
        
        init: function() {
            this.load();
            this.checkSeason();
        },
        
        load: function() {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY + '_season');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    this.currentSeason = data.currentSeason;
                    this.seasonProgress = data.seasonProgress || {};
                } catch (e) {}
            }
        },
        
        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_season', JSON.stringify({
                currentSeason: this.currentSeason,
                seasonProgress: this.seasonProgress,
            }));
        },
        
        checkSeason: function() {
            const now = new Date();
            const month = now.getMonth();
            const year = now.getFullYear();
            
            // Determine current season
            let seasonKey;
            if (month >= 0 && month <= 2) seasonKey = 'winter';
            else if (month >= 3 && month <= 5) seasonKey = 'spring';
            else if (month >= 6 && month <= 8) seasonKey = 'summer';
            else seasonKey = 'fall';
            
            const seasonNumber = Math.floor((year - 2024) * 4 + month / 3);
            const seasonId = seasonKey + '_' + seasonNumber;
            
            // Check if new season
            if (this.currentSeason?.id !== seasonId) {
                this.startNewSeason(seasonId, seasonKey);
            }
        },
        
        startNewSeason: function(seasonId, themeKey) {
            // End previous season if exists
            if (this.currentSeason) {
                this.endSeason();
            }
            
            const theme = this.themes[themeKey];
            const now = new Date();
            
            this.currentSeason = {
                id: seasonId,
                theme: themeKey,
                name: theme.name,
                icon: theme.icon,
                color: theme.color,
                description: theme.description,
                startDate: now.toISOString(),
                endDate: new Date(now.getTime() + CONFIG.SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
                exclusiveRewards: theme.exclusiveRewards,
            };
            
            this.seasonProgress = {
                xp: 0,
                level: 1,
                challenges: 0,
                gamesPlayed: 0,
                rewardsClaimed: [],
            };
            
            this.save();
            
            document.dispatchEvent(new CustomEvent('seasonStart', {
                detail: this.currentSeason
            }));
        },
        
        endSeason: function() {
            // Calculate final rewards
            const finalLevel = this.seasonProgress.level;
            const seasonTitle = this.currentSeason.name + ' Veteran';
            
            // Store season history
            const history = JSON.parse(localStorage.getItem('sgai_season_history') || '[]');
            history.push({
                season: this.currentSeason,
                progress: this.seasonProgress,
                completedAt: Date.now(),
            });
            localStorage.setItem('sgai_season_history', JSON.stringify(history));
            
            // Grant end-of-season rewards
            if (typeof CrossGameMechanics !== 'undefined') {
                CrossGameMechanics.currency.add('souls', finalLevel * 500, 'season_end');
            }
        },
        
        getSeasonXPForLevel: function(level) {
            return 1000 + (level - 1) * 500;
        },
        
        addSeasonXP: function(amount) {
            if (!this.currentSeason) return;
            
            this.seasonProgress.xp += amount;
            
            // Check for level up
            while (true) {
                const required = this.getSeasonXPForLevel(this.seasonProgress.level);
                if (this.seasonProgress.xp >= required) {
                    this.seasonProgress.xp -= required;
                    this.seasonProgress.level++;
                    
                    document.dispatchEvent(new CustomEvent('seasonLevelUp', {
                        detail: { level: this.seasonProgress.level, season: this.currentSeason }
                    }));
                } else {
                    break;
                }
            }
            
            this.save();
        },
        
        getSeasonProgress: function() {
            if (!this.currentSeason) return null;
            
            const currentRequired = this.getSeasonXPForLevel(this.seasonProgress.level);
            const daysRemaining = Math.max(0, Math.ceil(
                (new Date(this.currentSeason.endDate) - new Date()) / (24 * 60 * 60 * 1000)
            ));
            
            return {
                season: this.currentSeason,
                level: this.seasonProgress.level,
                xp: this.seasonProgress.xp,
                xpToNext: currentRequired - this.seasonProgress.xp,
                progress: this.seasonProgress.xp / currentRequired,
                daysRemaining: daysRemaining,
                gamesPlayed: this.seasonProgress.gamesPlayed,
                challenges: this.seasonProgress.challenges,
            };
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // DAILY CHALLENGES SYSTEM
    // ═══════════════════════════════════════════════════════════════
    
    const DailyChallenges = {
        challenges: [],
        completedToday: [],
        generatedDate: null,
        
        challengeTypes: [
            { id: 'play_games', name: 'Game Enthusiast', description: 'Play {count} games', type: 'games_played', countRange: [2, 5], xp: 100 },
            { id: 'win_games', name: 'Victorious', description: 'Win {count} games', type: 'games_won', countRange: [1, 3], xp: 200 },
            { id: 'kill_enemies', name: 'Hunter', description: 'Kill {count} enemies', type: 'enemies_killed', countRange: [10, 50], xp: 150 },
            { id: 'find_secrets', name: 'Explorer', description: 'Find {count} secrets', type: 'secrets_found', countRange: [1, 5], xp: 250 },
            { id: 'play_time', name: 'Dedicated', description: 'Play for {count} minutes', type: 'time_played', countRange: [15, 60], xp: 100 },
            { id: 'no_death', name: 'Flawless', description: 'Complete a game without dying', type: 'no_death_run', countRange: [1, 1], xp: 300 },
            { id: 'specific_game', name: 'Game Master', description: 'Play {game}', type: 'play_specific', countRange: [1, 1], xp: 150 },
            { id: 'earn_score', name: 'High Scorer', description: 'Earn {count} total points', type: 'total_score', countRange: [5000, 50000], xp: 150 },
            { id: 'collect_items', name: 'Collector', description: 'Collect {count} items', type: 'items_collected', countRange: [10, 50], xp: 100 },
            { id: 'beat_time', name: 'Speed Demon', description: 'Complete a game in under {count} minutes', type: 'speedrun', countRange: [3, 10], xp: 250 },
        ],
        
        init: function() {
            this.load();
            this.checkRegeneration();
        },
        
        load: function() {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY + '_daily');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    this.challenges = data.challenges || [];
                    this.completedToday = data.completedToday || [];
                    this.generatedDate = data.generatedDate;
                } catch (e) {}
            }
        },
        
        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_daily', JSON.stringify({
                challenges: this.challenges,
                completedToday: this.completedToday,
                generatedDate: this.generatedDate,
            }));
        },
        
        checkRegeneration: function() {
            const today = new Date().toDateString();
            if (this.generatedDate !== today) {
                this.generateChallenges();
            }
        },
        
        generateChallenges: function() {
            const today = new Date();
            const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
            const rng = this.seededRandom(seed);
            
            this.challenges = [];
            this.completedToday = [];
            
            // Shuffle challenge types
            const shuffled = [...this.challengeTypes].sort(() => rng() - 0.5);
            
            // Generate 5 challenges (3 free, 2 premium)
            for (let i = 0; i < CONFIG.DAILY_CHALLENGE_COUNT; i++) {
                const template = shuffled[i % shuffled.length];
                const count = template.countRange[0] + Math.floor(rng() * (template.countRange[1] - template.countRange[0] + 1));
                
                const challenge = {
                    id: 'daily_' + today.toDateString().replace(/ /g, '_') + '_' + i,
                    name: template.name,
                    description: template.description.replace('{count}', count),
                    type: template.type,
                    target: count,
                    progress: 0,
                    xp: template.xp * (1 + (i * 0.2)), // Later challenges worth more
                    premium: i >= 3, // Last 2 are premium
                    completed: false,
                };
                
                // Handle specific game challenges
                if (template.type === 'play_specific') {
                    const games = ['backrooms-pacman', 'shadow-crawler', 'the-abyss', 'cursed-depths', 'blood-tetris'];
                    challenge.targetGame = games[Math.floor(rng() * games.length)];
                    challenge.description = challenge.description.replace('{game}', 
                        challenge.targetGame.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
                }
                
                // Handle time-based challenges
                if (template.type === 'speedrun') {
                    challenge.target = count * 60 * 1000; // Convert to ms
                }
                
                this.challenges.push(challenge);
            }
            
            this.generatedDate = today.toDateString();
            this.save();
        },
        
        seededRandom: function(seed) {
            let s = seed;
            return function() {
                s = Math.sin(s * 9999) * 10000;
                return s - Math.floor(s);
            };
        },
        
        updateProgress: function(type, value, gameId) {
            this.challenges.forEach(challenge => {
                if (challenge.completed) return;
                if (challenge.type !== type) return;
                if (challenge.premium && !this.hasPremiumAccess()) return;
                if (challenge.targetGame && challenge.targetGame !== gameId) return;
                
                if (type === 'speedrun') {
                    // For speedrun, check if value is less than target
                    if (value <= challenge.target) {
                        challenge.progress = challenge.target;
                    }
                } else {
                    challenge.progress = Math.min(challenge.target, challenge.progress + value);
                }
                
                if (challenge.progress >= challenge.target) {
                    this.completeChallenge(challenge);
                }
            });
            
            this.save();
        },
        
        completeChallenge: function(challenge) {
            challenge.completed = true;
            this.completedToday.push(challenge.id);
            
            // Grant XP
            if (typeof AccountLevel !== 'undefined') {
                AccountLevel.addXP(challenge.xp, 'daily_challenge');
            }
            
            // Grant season XP
            if (typeof SeasonSystem !== 'undefined') {
                SeasonSystem.addSeasonXP(challenge.xp / 2);
                SeasonSystem.seasonProgress.challenges++;
            }
            
            document.dispatchEvent(new CustomEvent('challengeComplete', {
                detail: challenge
            }));
            
            this.showChallengeCompleteNotification(challenge);
        },
        
        hasPremiumAccess: function() {
            const tier = localStorage.getItem('sgai-sub-tier') || 'none';
            return tier === 'pro' || tier === 'max';
        },
        
        showChallengeCompleteNotification: function(challenge) {
            const notification = document.createElement('div');
            notification.className = 'engagement-notification challenge-complete';
            notification.innerHTML =
                '<div class="notification-icon">✅</div>' +
                '<div class="notification-content">' +
                '<div class="notification-title">Daily Challenge Complete!</div>' +
                '<div class="notification-message">' + challenge.name + '</div>' +
                '<div class="notification-reward">+' + challenge.xp + ' XP</div>' +
                '</div>';
            
            document.body.appendChild(notification);
            setTimeout(() => notification.classList.add('show'), 10);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 500);
            }, 3000);
        },
        
        getChallenges: function() {
            return this.challenges.map(c => ({
                ...c,
                progressPercent: Math.floor((c.progress / c.target) * 100),
                canAccess: !c.premium || this.hasPremiumAccess(),
            }));
        },
        
        getCompletionRate: function() {
            const accessible = this.challenges.filter(c => !c.premium || this.hasPremiumAccess());
            const completed = accessible.filter(c => c.completed).length;
            return accessible.length > 0 ? completed / accessible.length : 0;
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // WEEKLY EVENTS SYSTEM
    // ═══════════════════════════════════════════════════════════════
    
    const WeeklyEvents = {
        currentEvents: [],
        weekNumber: null,
        
        eventTypes: {
            double_xp: {
                name: 'Double XP Weekend',
                description: 'Earn double XP from all games!',
                icon: '⭐',
                effect: { xpMultiplier: 2 },
                duration: 'weekend',
            },
            theme_week: {
                name: '{theme} Week',
                description: 'Special themed challenges and rewards!',
                icon: '🎭',
                effect: { themedChallenges: true },
                duration: 'week',
            },
            community_goal: {
                name: 'Community Challenge',
                description: 'Work together to unlock rewards!',
                icon: '🤝',
                effect: { communityProgress: true },
                duration: 'week',
            },
            boss_week: {
                name: 'Boss Rush Week',
                description: 'Extra rewards for defeating bosses!',
                icon: '👹',
                effect: { bossRewardMultiplier: 2 },
                duration: 'week',
            },
            speedrun_week: {
                name: 'Speedrun Challenge',
                description: 'Compete for the best times!',
                icon: '⚡',
                effect: { speedrunRewards: true },
                duration: 'week',
            },
            horror_night: {
                name: 'Horror Night',
                description: 'Increased scare intensity and rewards!',
                icon: '🌙',
                effect: { horrorIntensity: 1.5, horrorRewards: true },
                duration: 'weekend',
            },
        },
        
        themes: ['Ghost', 'Vampire', 'Zombie', 'Demon', 'Eldritch', 'Classic', 'Sci-Fi'],
        
        init: function() {
            this.load();
            this.checkEvents();
        },
        
        load: function() {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY + '_weekly');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    this.currentEvents = data.currentEvents || [];
                    this.weekNumber = data.weekNumber;
                } catch (e) {}
            }
        },
        
        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_weekly', JSON.stringify({
                currentEvents: this.currentEvents,
                weekNumber: this.weekNumber,
            }));
        },
        
        checkEvents: function() {
            const now = new Date();
            const weekNumber = this.getWeekNumber(now);
            
            if (this.weekNumber !== weekNumber) {
                this.generateWeeklyEvents(weekNumber);
            }
        },
        
        getWeekNumber: function(date) {
            const start = new Date(date.getFullYear(), 0, 1);
            const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
            return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
        },
        
        generateWeeklyEvents: function(weekNumber) {
            const rng = this.seededRandom(weekNumber);
            
            this.currentEvents = [];
            this.weekNumber = weekNumber;
            
            // Always have community goal
            this.currentEvents.push(this.createEvent('community_goal', weekNumber, rng));
            
            // Add random event
            const eventTypes = Object.keys(this.eventTypes).filter(t => t !== 'community_goal');
            const randomType = eventTypes[Math.floor(rng() * eventTypes.length)];
            this.currentEvents.push(this.createEvent(randomType, weekNumber, rng));
            
            // Weekend event (double XP)
            this.currentEvents.push(this.createEvent('double_xp', weekNumber, rng));
            
            this.save();
        },
        
        createEvent: function(type, weekNumber, rng) {
            const template = this.eventTypes[type];
            const now = new Date();
            
            let startDate, endDate;
            
            if (template.duration === 'weekend') {
                // Friday 6PM to Sunday midnight
                const friday = new Date(now);
                friday.setDate(now.getDate() + (5 - now.getDay() + 7) % 7);
                friday.setHours(18, 0, 0, 0);
                
                const sunday = new Date(friday);
                sunday.setDate(friday.getDate() + 2);
                sunday.setHours(23, 59, 59, 999);
                
                startDate = friday.toISOString();
                endDate = sunday.toISOString();
            } else {
                // Full week
                const monday = new Date(now);
                monday.setDate(now.getDate() - now.getDay() + 1);
                monday.setHours(0, 0, 0, 0);
                
                const nextMonday = new Date(monday);
                nextMonday.setDate(monday.getDate() + 7);
                
                startDate = monday.toISOString();
                endDate = nextMonday.toISOString();
            }
            
            let name = template.name;
            if (type === 'theme_week') {
                name = name.replace('{theme}', this.themes[Math.floor(rng() * this.themes.length)]);
            }
            
            return {
                id: 'event_' + type + '_' + weekNumber,
                type: type,
                name: name,
                description: template.description,
                icon: template.icon,
                effect: template.effect,
                startDate: startDate,
                endDate: endDate,
                progress: 0,
                target: type === 'community_goal' ? 1000000 : 100, // Community score or personal
            };
        },
        
        seededRandom: function(seed) {
            let s = seed;
            return function() {
                s = Math.sin(s * 9999) * 10000;
                return s - Math.floor(s);
            };
        },
        
        isEventActive: function(eventId) {
            const event = this.currentEvents.find(e => e.id === eventId);
            if (!event) return false;
            
            const now = new Date();
            const start = new Date(event.startDate);
            const end = new Date(event.endDate);
            
            return now >= start && now <= end;
        },
        
        getActiveEvents: function() {
            return this.currentEvents.filter(e => this.isEventActive(e.id));
        },
        
        getEventModifiers: function() {
            const active = this.getActiveEvents();
            const modifiers = {
                xpMultiplier: 1,
                bossRewardMultiplier: 1,
                horrorIntensity: 1,
                speedrunRewards: false,
                horrorRewards: false,
                themedChallenges: false,
            };
            
            active.forEach(event => {
                Object.keys(event.effect).forEach(key => {
                    if (typeof modifiers[key] === 'number' && typeof event.effect[key] === 'number') {
                        modifiers[key] *= event.effect[key];
                    } else {
                        modifiers[key] = event.effect[key];
                    }
                });
            });
            
            return modifiers;
        },
        
        updateCommunityProgress: function(amount) {
            const communityEvent = this.currentEvents.find(e => e.type === 'community_goal');
            if (communityEvent) {
                communityEvent.progress = Math.min(communityEvent.target, communityEvent.progress + amount);
                this.save();
            }
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // MONTHLY CHAMPIONSHIPS
    // ═══════════════════════════════════════════════════════════════
    
    const MonthlyChampionships = {
        currentChampionship: null,
        playerRank: null,
        
        championshipTypes: {
            leaderboard_race: {
                name: 'Score Championship',
                description: 'Compete for the highest scores!',
                metric: 'total_score',
            },
            speedrun_challenge: {
                name: 'Speed Championship',
                description: 'Fastest completion times!',
                metric: 'best_time',
            },
            survival_challenge: {
                name: 'Survival Championship',
                description: 'Most wins without dying!',
                metric: 'flawless_runs',
            },
        },
        
        init: function() {
            this.load();
            this.checkChampionship();
        },
        
        load: function() {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY + '_championship');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    this.currentChampionship = data.currentChampionship;
                    this.playerRank = data.playerRank;
                } catch (e) {}
            }
        },
        
        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_championship', JSON.stringify({
                currentChampionship: this.currentChampionship,
                playerRank: this.playerRank,
            }));
        },
        
        checkChampionship: function() {
            const now = new Date();
            const monthKey = now.getFullYear() + '_' + (now.getMonth() + 1);
            
            if (!this.currentChampionship || this.currentChampionship.monthKey !== monthKey) {
                this.startNewChampionship(monthKey);
            }
        },
        
        startNewChampionship: function(monthKey) {
            const types = Object.keys(this.championshipTypes);
            const type = types[Math.floor(this.seededRandom(monthKey)() * types.length)];
            const template = this.championshipTypes[type];
            
            const now = new Date();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            
            this.currentChampionship = {
                id: 'championship_' + monthKey,
                monthKey: monthKey,
                type: type,
                name: template.name,
                description: template.description,
                metric: template.metric,
                startDate: now.toISOString(),
                endDate: endOfMonth.toISOString(),
                score: 0,
                rewards: this.generateRewards(),
            };
            
            this.playerRank = null;
            this.save();
        },
        
        generateRewards: function() {
            return {
                1: { souls: 50000, bloodGems: 200, title: 'Monthly Champion', exclusive: true },
                2: { souls: 25000, bloodGems: 100, title: 'Monthly Runner-Up' },
                3: { souls: 15000, bloodGems: 75, title: 'Monthly Bronze' },
                10: { souls: 10000, bloodGems: 50 },
                25: { souls: 5000, bloodGems: 25 },
                50: { souls: 2500, bloodGems: 10 },
                100: { souls: 1000 },
            };
        },
        
        seededRandom: function(seed) {
            let s = this.hashString(seed);
            return function() {
                s = Math.sin(s * 9999) * 10000;
                return s - Math.floor(s);
            };
        },
        
        hashString: function(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash);
        },
        
        updateScore: function(metric, value) {
            if (!this.currentChampionship) return;
            if (this.currentChampionship.metric !== metric) return;
            
            if (metric === 'best_time') {
                // For time, lower is better
                if (!this.currentChampionship.score || value < this.currentChampionship.score) {
                    this.currentChampionship.score = value;
                }
            } else {
                // For score, higher is better
                this.currentChampionship.score += value;
            }
            
            this.save();
        },
        
        getChampionshipProgress: function() {
            if (!this.currentChampionship) return null;
            
            const now = new Date();
            const end = new Date(this.currentChampionship.endDate);
            const daysRemaining = Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
            
            return {
                championship: this.currentChampionship,
                score: this.currentChampionship.score,
                rank: this.playerRank,
                daysRemaining: daysRemaining,
                potentialReward: this.getPotentialReward(),
            };
        },
        
        getPotentialReward: function() {
            if (!this.playerRank) return null;
            
            const rewards = this.currentChampionship?.rewards || {};
            let reward = null;
            
            for (const rank of [1, 2, 3, 10, 25, 50, 100]) {
                if (this.playerRank <= rank && rewards[rank]) {
                    reward = rewards[rank];
                    break;
                }
            }
            
            return reward;
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // RETENTION FEATURES
    // ═══════════════════════════════════════════════════════════════
    
    const RetentionFeatures = {
        lastSessionDate: null,
        consecutiveDays: 0,
        totalDaysPlayed: 0,
        longestStreak: 0,
        returnBonusClaimed: false,
        
        init: function() {
            this.load();
            this.checkSession();
        },
        
        load: function() {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY + '_retention');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    this.lastSessionDate = data.lastSessionDate;
                    this.consecutiveDays = data.consecutiveDays || 0;
                    this.totalDaysPlayed = data.totalDaysPlayed || 0;
                    this.longestStreak = data.longestStreak || 0;
                    this.returnBonusClaimed = data.returnBonusClaimed || false;
                } catch (e) {}
            }
        },
        
        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_retention', JSON.stringify({
                lastSessionDate: this.lastSessionDate,
                consecutiveDays: this.consecutiveDays,
                totalDaysPlayed: this.totalDaysPlayed,
                longestStreak: this.longestStreak,
                returnBonusClaimed: this.returnBonusClaimed,
            }));
        },
        
        checkSession: function() {
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            
            if (this.lastSessionDate === today) {
                // Already played today
                return;
            }
            
            if (this.lastSessionDate === yesterday) {
                // Consecutive day
                this.consecutiveDays++;
            } else if (this.lastSessionDate && this.lastSessionDate !== today) {
                // Streak broken - check for return bonus
                const daysSinceLastPlay = Math.floor((Date.now() - new Date(this.lastSessionDate).getTime()) / 86400000);
                
                if (daysSinceLastPlay >= 7) {
                    this.showReturnBonus(daysSinceLastPlay);
                }
                
                this.consecutiveDays = 1;
            } else {
                // First time playing
                this.consecutiveDays = 1;
            }
            
            this.totalDaysPlayed++;
            this.longestStreak = Math.max(this.longestStreak, this.consecutiveDays);
            this.lastSessionDate = today;
            this.returnBonusClaimed = false;
            
            this.save();
            
            // Check for streak rewards
            this.checkStreakRewards();
        },
        
        showReturnBonus: function(daysAway) {
            if (this.returnBonusClaimed) return;
            
            const bonusMultiplier = Math.min(3, 1 + (daysAway / 7));
            const bonusSouls = Math.floor(500 * bonusMultiplier);
            const bonusXP = Math.floor(500 * bonusMultiplier);
            
            // Create return bonus modal
            const modal = document.createElement('div');
            modal.className = 'return-bonus-modal';
            modal.innerHTML =
                '<div class="return-bonus-content">' +
                '<div class="return-bonus-icon">👋</div>' +
                '<h2>Welcome Back!</h2>' +
                '<p>You were away for ' + daysAway + ' days.</p>' +
                '<p class="return-bonus-desc">We missed you! Here\'s a welcome back bonus:</p>' +
                '<div class="return-bonus-rewards">' +
                '<div class="reward-item"><span>👻</span><span>+' + bonusSouls + ' Souls</span></div>' +
                '<div class="reward-item"><span>⭐</span><span>+' + bonusXP + ' XP</span></div>' +
                '</div>' +
                '<button class="return-bonus-claim">Claim Bonus</button>' +
                '</div>';
            
            document.body.appendChild(modal);
            
            modal.querySelector('.return-bonus-claim').addEventListener('click', () => {
                // Grant rewards
                if (typeof CrossGameMechanics !== 'undefined') {
                    CrossGameMechanics.currency.add('souls', bonusSouls, 'return_bonus');
                }
                if (typeof AccountLevel !== 'undefined') {
                    AccountLevel.addXP(bonusXP, 'return_bonus');
                }
                
                this.returnBonusClaimed = true;
                this.save();
                
                modal.remove();
            });
        },
        
        checkStreakRewards: function() {
            const streakRewards = {
                7: { souls: 1000, title: 'Dedicated Player' },
                14: { souls: 2000, bloodGems: 10 },
                30: { souls: 5000, bloodGems: 25, title: 'Monthly Master' },
                60: { souls: 10000, bloodGems: 50, title: 'Legendary Dedication' },
                90: { souls: 20000, bloodGems: 100, title: 'Quarterly Champion' },
                180: { souls: 50000, bloodGems: 200, title: 'Half-Year Hero' },
                365: { souls: 100000, bloodGems: 500, title: 'Yearly Legend', exclusive: true },
            };
            
            const reward = streakRewards[this.consecutiveDays];
            if (reward) {
                this.grantStreakReward(reward, this.consecutiveDays);
            }
        },
        
        grantStreakReward: function(reward, days) {
            if (typeof CrossGameMechanics !== 'undefined') {
                if (reward.souls) {
                    CrossGameMechanics.currency.add('souls', reward.souls, 'streak_' + days);
                }
                if (reward.bloodGems) {
                    CrossGameMechanics.currency.add('bloodGems', reward.bloodGems, 'streak_' + days);
                }
            }
            
            if (reward.title) {
                const titles = JSON.parse(localStorage.getItem('sgai_unlocked_titles') || '[]');
                if (!titles.includes(reward.title)) {
                    titles.push(reward.title);
                    localStorage.setItem('sgai_unlocked_titles', JSON.stringify(titles));
                }
            }
            
            // Show notification
            const notification = document.createElement('div');
            notification.className = 'engagement-notification streak-reward';
            notification.innerHTML =
                '<div class="notification-icon">🔥</div>' +
                '<div class="notification-content">' +
                '<div class="notification-title">' + days + ' Day Streak!</div>' +
                '<div class="notification-message">' + (reward.title || 'Streak Reward') + '</div>' +
                '</div>';
            
            document.body.appendChild(notification);
            setTimeout(() => notification.classList.add('show'), 10);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 500);
            }, 4000);
        },
        
        // Catch-up mechanics for returning players
        getCatchUpBonus: function() {
            if (!this.lastSessionDate) return null;
            
            const daysSinceLastPlay = Math.floor(
                (Date.now() - new Date(this.lastSessionDate).getTime()) / 86400000
            );
            
            if (daysSinceLastPlay < 7) return null;
            
            return {
                daysMissed: daysSinceLastPlay,
                xpBoost: Math.min(2, 1 + (daysSinceLastPlay / 14)), // Up to 2x for 14+ days
                duration: 7 * 24 * 60 * 60 * 1000, // 7 days
                message: 'Welcome back! You have a ' + Math.floor(this.getCatchUpBonus().xpBoost * 100) + '% XP boost for the next 7 days!',
            };
        },
        
        // Anniversary rewards
        checkAnniversary: function() {
            const accountCreated = parseInt(localStorage.getItem('sgai_account_created') || Date.now());
            const now = Date.now();
            const yearsSinceCreation = Math.floor((now - accountCreated) / (365 * 24 * 60 * 60 * 1000));
            
            const lastAnniversary = parseInt(localStorage.getItem('sgai_last_anniversary') || '0');
            
            if (yearsSinceCreation > lastAnniversary) {
                this.grantAnniversaryReward(yearsSinceCreation);
                localStorage.setItem('sgai_last_anniversary', yearsSinceCreation.toString());
            }
        },
        
        grantAnniversaryReward: function(years) {
            const rewards = {
                1: { souls: 10000, bloodGems: 50, title: '1 Year Survivor' },
                2: { souls: 25000, bloodGems: 100, title: '2 Year Veteran' },
                3: { souls: 50000, bloodGems: 200, title: '3 Year Legend' },
                5: { souls: 100000, bloodGems: 500, title: '5 Year Elder', exclusive: true },
            };
            
            const reward = rewards[years] || { souls: years * 10000, bloodGems: years * 50 };
            
            if (typeof CrossGameMechanics !== 'undefined') {
                if (reward.souls) {
                    CrossGameMechanics.currency.add('souls', reward.souls, 'anniversary_' + years);
                }
                if (reward.bloodGems) {
                    CrossGameMechanics.currency.add('bloodGems', reward.bloodGems, 'anniversary_' + years);
                }
            }
            
            if (reward.title) {
                const titles = JSON.parse(localStorage.getItem('sgai_unlocked_titles') || '[]');
                if (!titles.includes(reward.title)) {
                    titles.push(reward.title);
                    localStorage.setItem('sgai_unlocked_titles', JSON.stringify(titles));
                }
            }
            
            // Show anniversary modal
            this.showAnniversaryModal(years, reward);
        },
        
        showAnniversaryModal: function(years, reward) {
            const modal = document.createElement('div');
            modal.className = 'anniversary-modal';
            modal.innerHTML =
                '<div class="anniversary-content">' +
                '<div class="anniversary-icon">🎂</div>' +
                '<h2>' + years + ' Year Anniversary!</h2>' +
                '<p>Thank you for being part of ScaryGamesAI!</p>' +
                '<div class="anniversary-rewards">' +
                (reward.souls ? '<div class="reward">👻 +' + reward.souls + ' Souls</div>' : '') +
                (reward.bloodGems ? '<div class="reward">💎 +' + reward.bloodGems + ' Blood Gems</div>' : '') +
                (reward.title ? '<div class="reward">🏷️ ' + reward.title + '</div>' : '') +
                '</div>' +
                '<button class="anniversary-close">Continue</button>' +
                '</div>';
            
            document.body.appendChild(modal);
            modal.querySelector('.anniversary-close').addEventListener('click', () => modal.remove());
        },
        
        getStats: function() {
            return {
                consecutiveDays: this.consecutiveDays,
                totalDaysPlayed: this.totalDaysPlayed,
                longestStreak: this.longestStreak,
                lastSessionDate: this.lastSessionDate,
                catchUpBonus: this.getCatchUpBonus(),
            };
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // HALL OF FAME
    // ═══════════════════════════════════════════════════════════════
    
    const HallOfFame = {
        entries: [],
        
        categories: {
            highest_score: { name: 'Highest Score', icon: '🏆' },
            most_kills: { name: 'Most Kills', icon: '💀' },
            fastest_time: { name: 'Fastest Time', icon: '⚡' },
            longest_survival: { name: 'Longest Survival', icon: '⏱️' },
            most_secrets: { name: 'Most Secrets Found', icon: '🔍' },
            perfect_runs: { name: 'Perfect Runs', icon: '✨' },
        },
        
        init: function() {
            this.load();
        },
        
        load: function() {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY + '_halloffame');
            if (saved) {
                try {
                    this.entries = JSON.parse(saved);
                } catch (e) {}
            }
        },
        
        save: function() {
            localStorage.setItem(CONFIG.STORAGE_KEY + '_halloffame', JSON.stringify(this.entries));
        },
        
        checkEntry: function(category, value, gameId, playerName) {
            const existing = this.entries.find(e => e.category === category && e.gameId === gameId);
            
            if (!existing || this.isBetter(value, existing.value, category)) {
                this.addEntry(category, value, gameId, playerName);
                return true;
            }
            
            return false;
        },
        
        isBetter: function(newValue, existingValue, category) {
            if (category === 'fastest_time') {
                return newValue < existingValue;
            }
            return newValue > existingValue;
        },
        
        addEntry: function(category, value, gameId, playerName) {
            // Remove existing entry for this category/game
            this.entries = this.entries.filter(e => !(e.category === category && e.gameId === gameId));
            
            const categoryInfo = this.categories[category];
            
            this.entries.push({
                category: category,
                categoryName: categoryInfo?.name || category,
                icon: categoryInfo?.icon || '🏅',
                value: value,
                gameId: gameId,
                playerName: playerName || 'Anonymous',
                date: Date.now(),
            });
            
            this.save();
            
            document.dispatchEvent(new CustomEvent('hallOfFameEntry', {
                detail: { category, value, gameId }
            }));
        },
        
        getEntries: function(gameId) {
            if (gameId) {
                return this.entries.filter(e => e.gameId === gameId);
            }
            return this.entries;
        },
        
        getEntriesByCategory: function(category) {
            return this.entries.filter(e => e.category === category);
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // INJECT STYLES
    // ═══════════════════════════════════════════════════════════════
    
    function injectStyles() {
        if (document.getElementById('engagement-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'engagement-styles';
        style.textContent = `
            /* Engagement Notifications */
            .engagement-notification {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.8);
                display: flex;
                align-items: flex-start;
                gap: 16px;
                padding: 24px 32px;
                background: linear-gradient(135deg, rgba(20,20,30,0.98), rgba(10,10,20,0.98));
                border: 2px solid rgba(139,92,246,0.5);
                border-radius: 16px;
                z-index: 10000;
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.68,-0.55,0.265,1.55);
                box-shadow: 0 20px 60px rgba(139,92,246,0.4);
            }
            .engagement-notification.show {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            .engagement-notification.level-up {
                border-color: rgba(0,255,136,0.5);
                box-shadow: 0 20px 60px rgba(0,255,136,0.3);
            }
            .engagement-notification.challenge-complete {
                border-color: rgba(255,170,0,0.5);
                box-shadow: 0 20px 60px rgba(255,170,0,0.3);
            }
            .engagement-notification.streak-reward {
                border-color: rgba(255,68,68,0.5);
                box-shadow: 0 20px 60px rgba(255,68,68,0.3);
            }
            .notification-icon {
                font-size: 48px;
                animation: bounce 0.5s ease-in-out;
            }
            @keyframes bounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }
            .notification-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .notification-title {
                font-family: Creepster, cursive;
                font-size: 1.5rem;
                color: #fff;
            }
            .notification-message {
                font-size: 1rem;
                color: #ccc;
            }
            .notification-reward {
                display: flex;
                gap: 12px;
                margin-top: 8px;
                font-size: 0.9rem;
            }
            .notification-reward span {
                padding: 4px 12px;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
            }
            
            /* Return Bonus Modal */
            .return-bonus-modal {
                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,0.8);
                z-index: 10000;
            }
            .return-bonus-content {
                text-align: center;
                padding: 40px;
                background: linear-gradient(135deg, rgba(30,30,50,0.98), rgba(15,15,30,0.98));
                border: 2px solid rgba(139,92,246,0.5);
                border-radius: 20px;
                max-width: 400px;
            }
            .return-bonus-icon {
                font-size: 64px;
                margin-bottom: 16px;
            }
            .return-bonus-content h2 {
                font-family: Creepster, cursive;
                font-size: 2rem;
                color: #fff;
                margin: 0 0 12px;
            }
            .return-bonus-content p {
                color: #aaa;
                margin: 8px 0;
            }
            .return-bonus-rewards {
                display: flex;
                justify-content: center;
                gap: 24px;
                margin: 24px 0;
            }
            .reward-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 16px;
                background: rgba(255,255,255,0.05);
                border-radius: 12px;
            }
            .reward-item span:first-child {
                font-size: 32px;
            }
            .return-bonus-claim {
                padding: 14px 40px;
                background: linear-gradient(135deg, #8b5cf6, #6d28d9);
                border: none;
                border-radius: 10px;
                color: #fff;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s;
            }
            .return-bonus-claim:hover {
                transform: scale(1.05);
            }
            
            /* Anniversary Modal */
            .anniversary-modal {
                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,0.9);
                z-index: 10000;
            }
            .anniversary-content {
                text-align: center;
                padding: 48px;
                background: linear-gradient(135deg, rgba(50,20,60,0.98), rgba(20,10,40,0.98));
                border: 2px solid rgba(255,215,0,0.5);
                border-radius: 20px;
                max-width: 450px;
            }
            .anniversary-icon {
                font-size: 72px;
                margin-bottom: 16px;
            }
            .anniversary-content h2 {
                font-family: Creepster, cursive;
                font-size: 2.5rem;
                color: #ffd700;
                margin: 0 0 12px;
            }
            .anniversary-rewards {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin: 24px 0;
            }
            .anniversary-rewards .reward {
                padding: 12px;
                background: rgba(255,215,0,0.1);
                border-radius: 8px;
                color: #ffd700;
            }
            .anniversary-close {
                padding: 14px 40px;
                background: linear-gradient(135deg, #ffd700, #ff8c00);
                border: none;
                border-radius: 10px;
                color: #000;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
            }
            
            /* XP Bar */
            .xp-bar-container {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: 300px;
                padding: 12px 16px;
                background: rgba(0,0,0,0.8);
                border-radius: 12px;
                border: 1px solid rgba(139,92,246,0.3);
            }
            .xp-bar-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 0.85rem;
            }
            .xp-bar-level {
                color: #8b5cf6;
                font-weight: 600;
            }
            .xp-bar-progress {
                color: #888;
            }
            .xp-bar-track {
                height: 8px;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
                overflow: hidden;
            }
            .xp-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #8b5cf6, #a78bfa);
                border-radius: 4px;
                transition: width 0.5s ease;
            }
        `;
        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    
    function init() {
        injectStyles();
        AccountLevel.init();
        MasterySystem.init();
        SeasonSystem.init();
        DailyChallenges.init();
        WeeklyEvents.init();
        MonthlyChampionships.init();
        RetentionFeatures.init();
        HallOfFame.init();
        
        console.log('[EngagementSystem] All systems initialized');
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════
    
    return {
        // Account Level
        level: {
            addXP: AccountLevel.addXP.bind(AccountLevel),
            getProgress: AccountLevel.getProgress.bind(AccountLevel),
            canPrestige: AccountLevel.canPrestige.bind(AccountLevel),
            prestige: AccountLevel.prestige.bind(AccountLevel),
            getXPForLevel: AccountLevel.getXPForLevel.bind(AccountLevel),
        },
        
        // Mastery
        mastery: {
            addXP: MasterySystem.addMasteryXP.bind(MasterySystem),
            get: MasterySystem.getMastery.bind(MasterySystem),
            getAll: MasterySystem.getAllMasteries.bind(MasterySystem),
            getTotalLevel: MasterySystem.getTotalMasteryLevel.bind(MasterySystem),
            recordStats: MasterySystem.recordGameStats.bind(MasterySystem),
        },
        
        // Season
        season: {
            getProgress: SeasonSystem.getSeasonProgress.bind(SeasonSystem),
            addXP: SeasonSystem.addSeasonXP.bind(SeasonSystem),
            getCurrent: function() { return SeasonSystem.currentSeason; },
        },
        
        // Daily Challenges
        daily: {
            getChallenges: DailyChallenges.getChallenges.bind(DailyChallenges),
            updateProgress: DailyChallenges.updateProgress.bind(DailyChallenges),
            getCompletionRate: DailyChallenges.getCompletionRate.bind(DailyChallenges),
        },
        
        // Weekly Events
        weekly: {
            getActiveEvents: WeeklyEvents.getActiveEvents.bind(WeeklyEvents),
            getModifiers: WeeklyEvents.getEventModifiers.bind(WeeklyEvents),
            isEventActive: WeeklyEvents.isEventActive.bind(WeeklyEvents),
        },
        
        // Monthly Championships
        championship: {
            getProgress: MonthlyChampionships.getChampionshipProgress.bind(MonthlyChampionships),
            updateScore: MonthlyChampionships.updateScore.bind(MonthlyChampionships),
        },
        
        // Retention
        retention: {
            getStats: RetentionFeatures.getStats.bind(RetentionFeatures),
            checkAnniversary: RetentionFeatures.checkAnniversary.bind(RetentionFeatures),
        },
        
        // Hall of Fame
        hallOfFame: {
            checkEntry: HallOfFame.checkEntry.bind(HallOfFame),
            getEntries: HallOfFame.getEntries.bind(HallOfFame),
        },
        
        // Convenience method to record game completion
        recordGameCompletion: function(gameId, stats) {
            // Account XP
            const baseXP = stats.won ? 250 : 50;
            const bonusXP = stats.perfectRun ? 200 : 0;
            this.level.addXP(baseXP + bonusXP, 'game_complete');
            
            // Mastery
            this.mastery.addXP(gameId, stats.won ? 25 : 10, 'game_play');
            this.mastery.recordStats(gameId, stats);
            
            // Season
            this.season.addXP(baseXP);
            
            // Daily challenges
            this.daily.updateProgress('games_played', 1, gameId);
            if (stats.won) this.daily.updateProgress('games_won', 1, gameId);
            if (stats.secretsFound) this.daily.updateProgress('secrets_found', stats.secretsFound, gameId);
            if (stats.perfectRun) this.daily.updateProgress('no_death_run', 1, gameId);
            if (stats.time) this.daily.updateProgress('speedrun', stats.time, gameId);
            if (stats.score) this.daily.updateProgress('total_score', stats.score, gameId);
            
            // Championship
            this.championship.updateScore('total_score', stats.score || 0);
            if (stats.perfectRun) this.championship.updateScore('flawless_runs', 1);
            
            // Hall of Fame
            if (stats.score) {
                this.hallOfFame.checkEntry('highest_score', stats.score, gameId, stats.playerName);
            }
            if (stats.time) {
                this.hallOfFame.checkEntry('fastest_time', stats.time, gameId, stats.playerName);
            }
        },
        
        // Version
        version: '1.0.0',
    };
})();

// Export for global access
window.EngagementSystem = EngagementSystem;
