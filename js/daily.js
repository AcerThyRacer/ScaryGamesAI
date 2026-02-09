/* ============================================
   ScaryGamesAI — Daily Challenges System
   Deterministic daily game + modifier using date seed
   ============================================ */
(function () {
    'use strict';

    const STORAGE_KEY = 'scarygames_daily';
    const GAME_IDS = [
        'backrooms-pacman', 'shadow-crawler', 'the-abyss', 'nightmare-run', 'yeti-run',
        'blood-tetris', 'seance', 'dollhouse', 'zombie-horde', 'the-elevator',
        'graveyard-shift', 'web-of-terror',
    ];
    const GAME_TITLES = {
        'backrooms-pacman': 'Backrooms: Pac-Man', 'shadow-crawler': 'Shadow Crawler',
        'the-abyss': 'The Abyss', 'nightmare-run': 'Nightmare Run', 'yeti-run': 'Yeti Run',
        'blood-tetris': 'Blood Tetris', 'seance': 'Séance', 'dollhouse': 'The Dollhouse',
        'zombie-horde': 'Zombie Horde', 'the-elevator': 'The Elevator',
        'graveyard-shift': 'Graveyard Shift', 'web-of-terror': 'Web of Terror',
    };
    const MODIFIERS = [
        { id: 'hard_mode', name: '💀 Nightmare Mode', desc: 'Play on the hardest difficulty' },
        { id: 'speed_run', name: '⚡ Speed Run', desc: 'Complete as fast as possible' },
        { id: 'fog_mode', name: '🌫️ Fog Mode', desc: 'Extra thick fog — visibility is limited' },
        { id: 'no_hud', name: '🚫 No HUD', desc: 'Play without the HUD display' },
        { id: 'double_enemies', name: '😈 Double Trouble', desc: 'Twice the enemies/danger' },
        { id: 'low_light', name: '🕯️ Candlelight', desc: 'Extremely low lighting' },
        { id: 'survival', name: '🏆 Survival Challenge', desc: 'Survive as long as possible' },
        { id: 'perfectionist', name: '✨ Perfectionist', desc: 'Collect everything, miss nothing' },
    ];

    // Simple deterministic hash from date string
    function dateSeed(dateStr) {
        var hash = 0;
        for (var i = 0; i < dateStr.length; i++) {
            hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
            hash = hash & hash; // 32-bit int
        }
        return Math.abs(hash);
    }

    function getTodayString() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function getDailyChallenge() {
        var today = getTodayString();
        var seed = dateSeed(today);
        var gameIdx = seed % GAME_IDS.length;
        var modIdx = (seed >> 4) % MODIFIERS.length;
        return {
            date: today,
            gameId: GAME_IDS[gameIdx],
            gameTitle: GAME_TITLES[GAME_IDS[gameIdx]],
            gameUrl: '/games/' + GAME_IDS[gameIdx] + '/',
            modifier: MODIFIERS[modIdx],
        };
    }

    function loadData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : { completed: {}, streak: 0, lastCompleted: null };
        } catch (e) {
            return { completed: {}, streak: 0, lastCompleted: null };
        }
    }

    function saveData(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { }
    }

    function completeChallenge() {
        var data = loadData();
        var today = getTodayString();
        if (data.completed[today]) return false; // already completed
        data.completed[today] = true;
        // Streak logic
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        var yStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
        if (data.lastCompleted === yStr) {
            data.streak++;
        } else {
            data.streak = 1;
        }
        data.lastCompleted = today;
        saveData(data);
        // Achievement for 3-streak
        if (data.streak >= 3 && window.Achievements) {
            Achievements.unlock('meta_streak3');
        }
        return true;
    }

    function isCompletedToday() {
        var data = loadData();
        return !!data.completed[getTodayString()];
    }

    function getStreak() {
        return loadData().streak;
    }

    function renderDailyCard(container) {
        if (!container) return;
        var challenge = getDailyChallenge();
        var completed = isCompletedToday();
        var streak = getStreak();

        container.innerHTML = `
            <div class="daily-card ${completed ? 'completed' : ''}">
                <div class="daily-header">
                    <span class="daily-label">🎯 Daily Challenge</span>
                    ${streak > 0 ? '<span class="daily-streak">🔥 ' + streak + ' day streak</span>' : ''}
                </div>
                <h3 class="daily-game">${challenge.gameTitle}</h3>
                <div class="daily-modifier">
                    <span class="daily-mod-name">${challenge.modifier.name}</span>
                    <span class="daily-mod-desc">${challenge.modifier.desc}</span>
                </div>
                ${completed ?
                '<div class="daily-completed">✅ Completed Today!</div>' :
                '<a href="' + challenge.gameUrl + '" class="play-btn daily-play-btn">▶ Accept Challenge</a>'
            }
            </div>`;
    }

    // Export
    window.DailyChallenge = {
        get: getDailyChallenge,
        complete: completeChallenge,
        isCompletedToday: isCompletedToday,
        getStreak: getStreak,
        renderCard: renderDailyCard,
    };
})();
