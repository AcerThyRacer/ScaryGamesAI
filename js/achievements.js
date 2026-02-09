/* ============================================
   ScaryGamesAI — Achievements System
   50+ achievements across all 12 games
   ============================================ */
(function () {
    'use strict';

    const STORAGE_KEY = 'scarygames_achievements';

    // All achievements — { id, title, desc, icon, game (null=meta), secret }
    const ALL_ACHIEVEMENTS = [
        // ---- BACKROOMS: PAC-MAN ----
        { id: 'bp_first_pellet', title: 'First Bite', desc: 'Collect your first pellet', icon: '⚫', game: 'backrooms-pacman' },
        { id: 'bp_speed_demon', title: 'Speed Demon', desc: 'Collect all pellets in under 3 minutes', icon: '⚡', game: 'backrooms-pacman' },
        { id: 'bp_survivor', title: 'Corridor Survivor', desc: 'Survive 2 minutes without being caught', icon: '🏃', game: 'backrooms-pacman' },
        { id: 'bp_win', title: 'Escape the Backrooms', desc: 'Collect all pellets and escape', icon: '🚪', game: 'backrooms-pacman' },
        { id: 'bp_hard_win', title: 'Nightmare Backrooms', desc: 'Win on Hard difficulty', icon: '💀', game: 'backrooms-pacman' },

        // ---- SHADOW CRAWLER ----
        { id: 'sc_first_key', title: 'Key Finder', desc: 'Collect your first key', icon: '🔑', game: 'shadow-crawler' },
        { id: 'sc_no_torch', title: 'No Torch Left Behind', desc: 'Clear a level with >80% torch remaining', icon: '🔦', game: 'shadow-crawler' },
        { id: 'sc_all_levels', title: 'Shadow Master', desc: 'Complete all levels', icon: '🌑', game: 'shadow-crawler' },
        { id: 'sc_speed', title: 'Speedy Shadow', desc: 'Complete a level in under 30 seconds', icon: '💨', game: 'shadow-crawler' },

        // ---- THE ABYSS ----
        { id: 'ab_first_artifact', title: 'Deep Discovery', desc: 'Collect your first artifact', icon: '🔮', game: 'the-abyss' },
        { id: 'ab_all_artifacts', title: 'Abyss Scholar', desc: 'Collect all artifacts', icon: '📚', game: 'the-abyss' },
        { id: 'ab_deep_diver', title: 'Deep Diver', desc: 'Reach the deepest depth', icon: '🤿', game: 'the-abyss' },
        { id: 'ab_oxygen_master', title: 'Breath Control', desc: 'Win with 50%+ oxygen remaining', icon: '💨', game: 'the-abyss' },

        // ---- NIGHTMARE RUN ----
        { id: 'nr_1000m', title: 'Nightmare Mile', desc: 'Survive 1000m', icon: '🏃', game: 'nightmare-run' },
        { id: 'nr_5000m', title: 'Marathon Runner', desc: 'Survive 5000m', icon: '🏅', game: 'nightmare-run' },
        { id: 'nr_powerup', title: 'Power Player', desc: 'Collect 10 powerups in a single run', icon: '⚡', game: 'nightmare-run' },
        { id: 'nr_close_call', title: 'Close Call', desc: 'Dodge 3 obstacles in 2 seconds', icon: '😰', game: 'nightmare-run' },

        // ---- YETI RUN ----
        { id: 'yr_1000m', title: 'Snow Runner', desc: 'Survive 1000m', icon: '❄️', game: 'yeti-run' },
        { id: 'yr_sprint', title: 'Ice Breaker', desc: 'Sprint for 30 consecutive seconds', icon: '🏔️', game: 'yeti-run' },
        { id: 'yr_no_hit', title: 'Untouched', desc: 'Run 500m without hitting anything', icon: '✨', game: 'yeti-run' },
        { id: 'yr_5000m', title: 'Blizzard Warrior', desc: 'Survive 5000m', icon: '🌨️', game: 'yeti-run' },

        // ---- BLOOD TETRIS ----
        { id: 'bt_first_line', title: 'First Blood', desc: 'Clear your first line', icon: '🩸', game: 'blood-tetris' },
        { id: 'bt_tetris', title: 'Bone Crush', desc: 'Clear 4 lines at once', icon: '💥', game: 'blood-tetris' },
        { id: 'bt_100_lines', title: 'Blood Bath', desc: 'Clear 100 total lines', icon: '🛁', game: 'blood-tetris' },
        { id: 'bt_level10', title: 'Master Stacker', desc: 'Reach level 10', icon: '🏗️', game: 'blood-tetris' },

        // ---- SEANCE ----
        { id: 'sn_first_spirit', title: 'Medium', desc: 'Successfully contact your first spirit', icon: '👻', game: 'seance' },
        { id: 'sn_all_spirits', title: 'Spirit Whisperer', desc: 'Free all spirits', icon: '🕯️', game: 'seance' },
        { id: 'sn_anger', title: 'Angered the Dead', desc: 'Max out spirit anger', icon: '😡', game: 'seance' },
        { id: 'sn_no_anger', title: 'Gentle Medium', desc: 'Win without angering any spirit', icon: '😇', game: 'seance' },

        // ---- DOLLHOUSE ----
        { id: 'dh_first_room', title: 'Room Explorer', desc: 'Enter a new room', icon: '🚪', game: 'dollhouse' },
        { id: 'dh_escape', title: 'Dollhouse Escapee', desc: 'Escape the dollhouse', icon: '🏠', game: 'dollhouse' },
        { id: 'dh_speed', title: 'Speed Escape', desc: 'Escape in under 2 minutes', icon: '⏱️', game: 'dollhouse' },
        { id: 'dh_all_items', title: 'Collector', desc: 'Find every item', icon: '🧸', game: 'dollhouse' },

        // ---- ZOMBIE HORDE ----
        { id: 'zh_wave5', title: 'Survivor', desc: 'Survive 5 waves', icon: '🧟', game: 'zombie-horde' },
        { id: 'zh_wave10', title: 'Zombie Slayer', desc: 'Survive 10 waves', icon: '⚔️', game: 'zombie-horde' },
        { id: 'zh_100_kills', title: 'Century', desc: 'Kill 100 zombies in one game', icon: '💯', game: 'zombie-horde' },
        { id: 'zh_flame', title: 'Pyromaniac', desc: 'Place 3 flame towers', icon: '🔥', game: 'zombie-horde' },

        // ---- THE ELEVATOR ----
        { id: 'el_first_floor', title: 'Going Down', desc: 'Visit your first floor', icon: '🛗', game: 'the-elevator' },
        { id: 'el_escape', title: 'Floor Zero', desc: 'Reach Floor 0 and escape', icon: '🆓', game: 'the-elevator' },
        { id: 'el_insane', title: 'Sanity Check', desc: 'Escape with over 50% sanity', icon: '🧠', game: 'the-elevator' },
        { id: 'el_all_themes', title: 'Floor Collector', desc: 'Visit all floor themes', icon: '🗺️', game: 'the-elevator' },

        // ---- GRAVEYARD SHIFT ----
        { id: 'gs_dawn', title: 'Daybreak', desc: 'Survive until dawn', icon: '🌅', game: 'graveyard-shift' },
        { id: 'gs_all_dist', title: 'Full Patrol', desc: 'Investigate all disturbances', icon: '📋', game: 'graveyard-shift' },
        { id: 'gs_stealth', title: 'Ghost Walker', desc: 'Stay crouched for 60 seconds straight', icon: '🤫', game: 'graveyard-shift' },
        { id: 'gs_no_torch', title: 'Dark Patrol', desc: 'Survive without using the flashlight', icon: '🌑', game: 'graveyard-shift' },

        // ---- WEB OF TERROR ----
        { id: 'wt_first_key', title: 'Key Found', desc: 'Find your first key', icon: '🔑', game: 'web-of-terror' },
        { id: 'wt_escape', title: 'Mine Escape', desc: 'Find all keys and escape', icon: '🕷️', game: 'web-of-terror' },
        { id: 'wt_burn_webs', title: 'Web Burner', desc: 'Burn 10 webs', icon: '🔥', game: 'web-of-terror' },
        { id: 'wt_low_torch', title: 'Ember Light', desc: 'Escape with less than 10% torch', icon: '🕯️', game: 'web-of-terror' },

        // ---- META / GLOBAL ----
        { id: 'meta_first_game', title: 'Welcome to ScaryGames', desc: 'Play your first game', icon: '🎮', game: null },
        { id: 'meta_5_games', title: 'Explorer', desc: 'Play 5 different games', icon: '🗺️', game: null },
        { id: 'meta_all_games', title: 'Completionist', desc: 'Play all 12 games', icon: '🏆', game: null },
        { id: 'meta_1hr', title: 'Dedicated Player', desc: 'Play for a total of 1 hour', icon: '⏰', game: null },
        { id: 'meta_streak3', title: 'Streak Master', desc: 'Complete 3 daily challenges in a row', icon: '🔥', game: null },
        { id: 'meta_night_owl', title: 'Night Owl', desc: 'Play between midnight and 5 AM', icon: '🦉', game: null, secret: true },
        { id: 'meta_die_10', title: 'Persistent', desc: 'Die 10 times total', icon: '💪', game: null, secret: true },
    ];

    var unlocked = {};

    function loadUnlocked() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            unlocked = raw ? JSON.parse(raw) : {};
        } catch (e) { unlocked = {}; }
    }

    function saveUnlocked() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked)); } catch (e) { }
    }

    function isUnlocked(id) { return !!unlocked[id]; }

    function unlock(id) {
        if (unlocked[id]) return false; // already unlocked
        var ach = ALL_ACHIEVEMENTS.find(function (a) { return a.id === id; });
        if (!ach) return false;
        unlocked[id] = { date: new Date().toISOString() };
        saveUnlocked();
        showToast(ach);
        return true;
    }

    function showToast(ach) {
        var toast = document.createElement('div');
        toast.className = 'achievement-toast';
        toast.innerHTML = '<div class="ach-toast-icon">' + ach.icon + '</div>' +
            '<div class="ach-toast-text"><div class="ach-toast-title">🏆 Achievement Unlocked!</div>' +
            '<div class="ach-toast-name">' + ach.title + '</div>' +
            '<div class="ach-toast-desc">' + ach.desc + '</div></div>';
        document.body.appendChild(toast);
        setTimeout(function () { toast.classList.add('visible'); }, 50);
        setTimeout(function () { toast.classList.remove('visible'); setTimeout(function () { toast.remove(); }, 500); }, 4000);
    }

    function getAll() { return ALL_ACHIEVEMENTS; }
    function getUnlocked() { return Object.keys(unlocked); }
    function getProgress() { return { total: ALL_ACHIEVEMENTS.length, unlocked: Object.keys(unlocked).length }; }

    function renderGallery(container) {
        if (!container) return;
        container.innerHTML = '';
        var progress = getProgress();
        var header = document.createElement('div');
        header.className = 'ach-gallery-header';
        header.innerHTML = '<h2>Achievements</h2><p>' + progress.unlocked + ' / ' + progress.total + ' unlocked</p>' +
            '<div class="ach-progress-bar"><div class="ach-progress-fill" style="width:' + (progress.unlocked / progress.total * 100) + '%"></div></div>';
        container.appendChild(header);

        ALL_ACHIEVEMENTS.forEach(function (ach) {
            var isUn = isUnlocked(ach.id);
            var card = document.createElement('div');
            card.className = 'ach-card' + (isUn ? ' unlocked' : '') + (ach.secret && !isUn ? ' secret' : '');
            card.innerHTML = '<div class="ach-card-icon">' + (ach.secret && !isUn ? '❓' : ach.icon) + '</div>' +
                '<div class="ach-card-info"><div class="ach-card-title">' + (ach.secret && !isUn ? '???' : ach.title) + '</div>' +
                '<div class="ach-card-desc">' + (ach.secret && !isUn ? 'This achievement is secret' : ach.desc) + '</div>' +
                (ach.game ? '<div class="ach-card-game">' + ach.game + '</div>' : '<div class="ach-card-game">Global</div>') +
                '</div>' +
                (isUn ? '<div class="ach-card-check">✓</div>' : '');
            container.appendChild(card);
        });
    }

    // Export
    window.Achievements = {
        unlock: unlock,
        isUnlocked: isUnlocked,
        getAll: getAll,
        getUnlocked: getUnlocked,
        getProgress: getProgress,
        renderGallery: renderGallery,
    };

    loadUnlocked();
})();
