/**
 * Quest System - Daily/weekly challenges and objectives
 */

var QuestSystem = (function() {
    'use strict';

    var dailyQuests = [
        {
            id: 'daily_1',
            title: 'First Steps',
            description: 'Collect 25 pellets',
            type: 'collect_pellets',
            target: 25,
            reward: { souls: 50, gems: 5 }
        },
        {
            id: 'daily_2',
            title: 'Survivor',
            description: 'Survive for 5 minutes',
            type: 'survive_time',
            target: 300,
            reward: { souls: 75, gems: 8 }
        },
        {
            id: 'daily_3',
            title: 'Close Call',
            description: 'Escape from Pac-Man 3 times',
            type: 'escape_enemy',
            target: 3,
            reward: { souls: 100, gems: 10 }
        },
        {
            id: 'daily_4',
            title: 'Power Hunter',
            description: 'Collect 2 power pellets',
            type: 'collect_power',
            target: 2,
            reward: { souls: 60, gems: 6 }
        }
    ];

    var weeklyQuests = [
        {
            id: 'weekly_1',
            title: 'Marathon Runner',
            description: 'Collect 500 pellets total',
            type: 'collect_pellets',
            target: 500,
            reward: { souls: 500, gems: 50 }
        },
        {
            id: 'weekly_2',
            title: 'Nightmare Survivor',
            description: 'Complete a game on Nightmare difficulty',
            type: 'complete_difficulty',
            target: 'nightmare',
            reward: { souls: 750, gems: 75 }
        },
        {
            id: 'weekly_3',
            title: 'Variant Slayer',
            description: 'Defeat 10 special variants',
            type: 'defeat_variant',
            target: 10,
            reward: { souls: 600, gems: 60 }
        }
    ];

    var achievements = [
        {
            id: 'ach_1',
            title: 'First Blood',
            description: 'Die for the first time',
            type: 'death',
            target: 1,
            reward: { souls: 10 }
        },
        {
            id: 'ach_2',
            title: 'Speed Demon',
            description: 'Complete a game in under 2 minutes',
            type: 'speed_complete',
            target: 120,
            reward: { souls: 200, gems: 20 }
        },
        {
            id: 'ach_3',
            title: 'Completionist',
            description: 'Collect all pellets in a game',
            type: 'all_pellets',
            target: 1,
            reward: { souls: 300, gems: 30 }
        },
        {
            id: 'ach_4',
            title: 'Masochist',
            description: 'Complete a game on Impossible difficulty',
            type: 'complete_impossible',
            target: 1,
            reward: { souls: 1000, gems: 100 }
        }
    ];

    var activeQuests = [];
    var completedQuests = [];
    var questProgress = {};

    function init() {
        loadProgress();
        generateDailyQuests();
        console.log('[QuestSystem] Initialized');
    }

    function generateDailyQuests() {
        var today = new Date().toDateString();
        var lastGenerated = localStorage.getItem('quest_last_daily');

        if (lastGenerated !== today) {
            activeQuests = [];
            questProgress = {};

            // Select 3 random daily quests
            var shuffled = dailyQuests.sort(function() { return 0.5 - Math.random(); });
            activeQuests = shuffled.slice(0, 3);

            activeQuests.forEach(function(quest) {
                questProgress[quest.id] = 0;
            });

            localStorage.setItem('quest_last_daily', today);
            console.log('[QuestSystem] Generated new daily quests');
        }
    }

    function updateProgress(questType, amount) {
        var updated = [];

        activeQuests.forEach(function(quest) {
            if (quest.type === questType) {
                questProgress[quest.id] = (questProgress[quest.id] || 0) + amount;

                if (questProgress[quest.id] >= quest.target && !completedQuests.includes(quest.id)) {
                    completeQuest(quest);
                    updated.push(quest);
                }
            }
        });

        // Check achievements
        achievements.forEach(function(ach) {
            if (ach.type === questType && !completedQuests.includes(ach.id)) {
                var current = questProgress[ach.id] || 0;
                if (current >= ach.target) {
                    completeAchievement(ach);
                }
            }
        });

        saveProgress();
        return updated;
    }

    function completeQuest(quest) {
        if (completedQuests.includes(quest.id)) return;

        completedQuests.push(quest.id);
        console.log('[QuestSystem] Quest completed:', quest.title);

        // Award rewards
        if (typeof CrossGameMechanics !== 'undefined') {
            CrossGameMechanics.currency.addSouls(quest.reward.souls);
            if (quest.reward.gems) {
                CrossGameMechanics.currency.addBloodGems(quest.reward.gems);
            }
        }

        // Show notification
        showQuestNotification(quest);
    }

    function completeAchievement(achievement) {
        if (completedQuests.includes(achievement.id)) return;

        completedQuests.push(achievement.id);
        console.log('[QuestSystem] Achievement unlocked:', achievement.title);

        if (typeof CrossGameMechanics !== 'undefined') {
            CrossGameMechanics.currency.addSouls(achievement.reward.souls);
            if (achievement.reward.gems) {
                CrossGameMechanics.currency.addBloodGems(achievement.reward.gems);
            }
        }

        showAchievementNotification(achievement);
    }

    function showQuestNotification(quest) {
        var notification = document.createElement('div');
        notification.style.cssText = 'position:fixed;top:80px;right:20px;background:rgba(0,100,0,0.9);padding:15px;border-radius:8px;color:#fff;z-index:9999;animation:slideIn 0.3s ease-out;';
        notification.innerHTML = '<h3 style="margin:0 0 5px 0;">✅ Quest Complete!</h3>' +
                                '<p style="margin:0;">' + quest.title + '</p>' +
                                '<p style="margin:5px 0 0 0;color:#ffff88;">+' + quest.reward.souls + ' Souls' +
                                (quest.reward.gems ? ' +' + quest.reward.gems + ' Gems' : '') + '</p>';

        document.body.appendChild(notification);
        setTimeout(function() { notification.remove(); }, 4000);
    }

    function showAchievementNotification(achievement) {
        var notification = document.createElement('div');
        notification.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(100,50,0,0.95);padding:20px;border-radius:12px;color:#fff;z-index:9999;border:2px solid #ffaa00;';
        notification.innerHTML = '<h2 style="margin:0 0 10px 0;color:#ffaa00;">🏆 Achievement Unlocked!</h2>' +
                                '<p style="margin:0;font-size:1.2rem;">' + achievement.title + '</p>' +
                                '<p style="margin:5px 0 0 0;color:#aaa;">' + achievement.description + '</p>';

        document.body.appendChild(notification);
        setTimeout(function() { notification.remove(); }, 5000);
    }

    function getActiveQuests() {
        return activeQuests.map(function(quest) {
            return {
                quest: quest,
                progress: questProgress[quest.id] || 0,
                completed: completedQuests.includes(quest.id)
            };
        });
    }

    function getCompletedQuests() {
        return completedQuests;
    }

    function getAchievements() {
        return achievements.map(function(ach) {
            return {
                achievement: ach,
                unlocked: completedQuests.includes(ach.id)
            };
        });
    }

    function saveProgress() {
        try {
            localStorage.setItem('quest_progress', JSON.stringify({
                activeQuests: activeQuests,
                completedQuests: completedQuests,
                questProgress: questProgress
            }));
        } catch (e) {
            console.error('[QuestSystem] Failed to save');
        }
    }

    function loadProgress() {
        try {
            var saved = localStorage.getItem('quest_progress');
            if (saved) {
                var data = JSON.parse(saved);
                activeQuests = data.activeQuests || [];
                completedQuests = data.completedQuests || [];
                questProgress = data.questProgress || {};
            }
        } catch (e) {
            console.error('[QuestSystem] Failed to load');
        }
    }

    function reset() {
        activeQuests = [];
        completedQuests = [];
        questProgress = {};
        localStorage.removeItem('quest_progress');
        localStorage.removeItem('quest_last_daily');
    }

    return {
        init: init,
        updateProgress: updateProgress,
        getActiveQuests: getActiveQuests,
        getCompletedQuests: getCompletedQuests,
        getAchievements: getAchievements,
        reset: reset
    };
})();

if (typeof window !== 'undefined') {
    window.QuestSystem = QuestSystem;
}
