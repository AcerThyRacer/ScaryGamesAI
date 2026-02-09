/* ============================================
   ScaryGamesAI — Daily & Weekly Challenges System
   Tracks progress, manages challenge generation,
   rewards, and notifications.
   ============================================ */
(function () {
    'use strict';

    const STORAGE_KEY = 'scarygames_challenges_v2';

    // ============ CHALLENGE DEFINITIONS ============
    // Each game has ~5 challenges of varying difficulty.
    // type: 'best' (single run high score) or 'total' (accumulate over multiple runs)
    const ALL_CHALLENGES = [
        // ---- BACKROOMS: PAC-MAN ----
        { id: 'bp_score_1000', gameId: 'backrooms-pacman', title: 'High Scorer', desc: 'Score 1000 points in one game', target: 1000, metric: 'score', type: 'best', reward: 50 },
        { id: 'bp_score_5000', gameId: 'backrooms-pacman', title: 'Pac-Master', desc: 'Score 5000 points in one game', target: 5000, metric: 'score', type: 'best', reward: 150 },
        { id: 'bp_pellets_50', gameId: 'backrooms-pacman', title: 'Munchies', desc: 'Eat 50 pellets total', target: 50, metric: 'pellets_collected', type: 'total', reward: 50 },
        { id: 'bp_time_120', gameId: 'backrooms-pacman', title: 'Survivor', desc: 'Survive for 120 seconds', target: 120, metric: 'time', type: 'best', reward: 100 },

        // ---- SHADOW CRAWLER ----
        { id: 'sc_keys_3', gameId: 'shadow-crawler', title: 'Key Hunter', desc: 'Find 3 keys total', target: 3, metric: 'keys_found', type: 'total', reward: 75 },
        { id: 'sc_levels_1', gameId: 'shadow-crawler', title: 'Dungeon Master', desc: 'Clear 1 level', target: 1, metric: 'levels_cleared', type: 'total', reward: 50 },
        { id: 'sc_time_60', gameId: 'shadow-crawler', title: 'Dark Survivor', desc: 'Survive 60 seconds in one run', target: 60, metric: 'survival_time', type: 'best', reward: 100 },

        // ---- THE ABYSS ----
        { id: 'ab_depth_500', gameId: 'the-abyss', title: 'Going Deep', desc: 'Reach 500m depth', target: 500, metric: 'depth', type: 'best', reward: 100 },
        { id: 'ab_artifacts_3', gameId: 'the-abyss', title: 'Treasure Hunter', desc: 'Collect 3 artifacts total', target: 3, metric: 'artifacts_collected', type: 'total', reward: 75 },
        { id: 'ab_oxygen_50', gameId: 'the-abyss', title: 'Breathless', desc: 'Finish with >50% oxygen', target: 50, metric: 'oxygen', type: 'best', reward: 125 },

        // ---- NIGHTMARE RUN ----
        { id: 'nr_dist_1000', gameId: 'nightmare-run', title: 'Sprinter', desc: 'Run 1000m in one go', target: 1000, metric: 'dist_session', type: 'best', reward: 50 },
        { id: 'nr_dist_5000', gameId: 'nightmare-run', title: 'Marathon', desc: 'Run 5000m total', target: 5000, metric: 'dist_total', type: 'total', reward: 150 },
        { id: 'nr_powerups_10', gameId: 'nightmare-run', title: 'Power Player', desc: 'Collect 10 powerups total', target: 10, metric: 'powerups_collected', type: 'total', reward: 75 },

        // ---- YETI RUN ----
        { id: 'yr_dist_1500', gameId: 'yeti-run', title: 'Snow Sprinter', desc: 'Slide 1500m in one go', target: 1500, metric: 'dist_session', type: 'best', reward: 100 },
        { id: 'yr_dodges_50', gameId: 'yeti-run', title: 'Evasive Action', desc: 'Dodge 50 times total', target: 50, metric: 'dodges', type: 'total', reward: 50 },
        { id: 'yr_jumps_50', gameId: 'yeti-run', title: 'Hop Skip', desc: 'Jump 50 times total', target: 50, metric: 'jumps', type: 'total', reward: 50 },

        // ---- BLOOD TETRIS ----
        { id: 'bt_lines_10', gameId: 'blood-tetris', title: 'Line Clearer', desc: 'Clear 10 lines in one game', target: 10, metric: 'lines_session', type: 'best', reward: 50 },
        { id: 'bt_score_2000', gameId: 'blood-tetris', title: 'High Stacker', desc: 'Score 2000 points', target: 2000, metric: 'score', type: 'best', reward: 100 },
        { id: 'bt_lines_50_total', gameId: 'blood-tetris', title: 'Demolition', desc: 'Clear 50 lines total', target: 50, metric: 'lines_cleared', type: 'total', reward: 100 },

        // ---- SEANCE ----
        { id: 'sn_spirits_3', gameId: 'seance', title: 'Medium', desc: 'Contact 3 spirits total', target: 3, metric: 'spirits', type: 'total', reward: 75 },
        { id: 'sn_calm_60', gameId: 'seance', title: 'Zen Master', desc: 'Keep anger low for 60s', target: 60, metric: 'calm_time', type: 'best', reward: 100 },

        // ---- DOLLHOUSE ----
        { id: 'dh_rooms_5', gameId: 'dollhouse', title: 'Explorer', desc: 'Enter 5 rooms total', target: 5, metric: 'rooms', type: 'total', reward: 50 },
        { id: 'dh_items_3', gameId: 'dollhouse', title: 'Scavenger', desc: 'Find 3 items total', target: 3, metric: 'items', type: 'total', reward: 75 },

        // ---- ZOMBIE HORDE ----
        { id: 'zh_kills_50', gameId: 'zombie-horde', title: 'Zombie Slayer', desc: 'Kill 50 zombies total', target: 50, metric: 'kills', type: 'total', reward: 100 },
        { id: 'zh_wave_5', gameId: 'zombie-horde', title: 'Survivor', desc: 'Reach Wave 5', target: 5, metric: 'wave', type: 'best', reward: 100 },
        { id: 'zh_towers_10', gameId: 'zombie-horde', title: 'Builder', desc: 'Build 10 towers total', target: 10, metric: 'towers', type: 'total', reward: 50 },

        // ---- THE ELEVATOR ----
        { id: 'el_floors_5', gameId: 'the-elevator', title: 'Going Up', desc: 'Visit 5 floors total', target: 5, metric: 'floors_visited', type: 'total', reward: 50 },
        { id: 'el_sanity_80', gameId: 'the-elevator', title: 'Sane', desc: 'Finish with >80% sanity', target: 80, metric: 'sanity', type: 'best', reward: 125 },

        // ---- GRAVEYARD SHIFT ----
        { id: 'gs_ghosts_5', gameId: 'graveyard-shift', title: 'Ghost Buster', desc: 'Spot 5 ghosts total', target: 5, metric: 'ghosts', type: 'total', reward: 75 },
        { id: 'gs_time_180', gameId: 'graveyard-shift', title: 'Night Watch', desc: 'Survive 3 minutes', target: 180, metric: 'time', type: 'best', reward: 100 },

        // ---- WEB OF TERROR ----
        { id: 'wt_webs_10', gameId: 'web-of-terror', title: 'Exterminator', desc: 'Burn 10 webs total', target: 10, metric: 'webs', type: 'total', reward: 50 },
        { id: 'wt_keys_3', gameId: 'web-of-terror', title: 'Key Master', desc: 'Find 3 keys total', target: 3, metric: 'keys', type: 'total', reward: 75 },
    ];

    const RANKS = [
        { cp: 0, title: 'Fresh Meat', icon: '🥩' },
        { cp: 500, title: 'Survivor', icon: '🔦' },
        { cp: 1500, title: 'Hunter', icon: '🗡️' },
        { cp: 3000, title: 'Veteren', icon: '🎖️' },
        { cp: 5000, title: 'Exorcist', icon: '✝️' },
        { cp: 10000, title: 'Nightmare King', icon: '👑' },
    ];

    var state = {
        active: [], // Array of { id, progress, completed, claimed }
        weekly: null, // { id, progress, completed, claimed }
        rerolls: 3,
        lastDate: '',
        cp: 0,
        unlockedRewards: {} // For future use
    };

    // ============ CORE LOGIC ============

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) state = JSON.parse(raw);
        } catch (e) { console.error('Failed to load challenges', e); }

        var today = getTodayString();
        if (state.lastDate !== today) {
            // New day!
            state.lastDate = today;
            state.rerolls = 3;
            generateDailyChallenges();
            // Weekly check (if Monday)
            if (new Date().getDay() === 1 || !state.weekly) {
                generateWeeklyChallenge();
            }
            saveState();
        }
    }

    function saveState() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { }
    }

    function getTodayString() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function generateDailyChallenges() {
        // Pick 3 random distinct challenges
        var pool = ALL_CHALLENGES.filter(function (c) { return true; });
        var selected = [];
        for (var i = 0; i < 3; i++) {
            if (pool.length === 0) break;
            var idx = Math.floor(Math.random() * pool.length);
            var ch = pool.splice(idx, 1)[0];
            selected.push({
                id: ch.id,
                progress: 0,
                completed: false,
                claimed: false
            });
        }
        state.active = selected;
    }

    function generateWeeklyChallenge() {
        // Pick a harder challenge (random for now, maybe filter by reward > 100 later)
        var pool = ALL_CHALLENGES.filter(function (c) { return c.reward >= 100; });
        if (pool.length === 0) pool = ALL_CHALLENGES;
        var idx = Math.floor(Math.random() * pool.length);
        var ch = pool[idx];
        state.weekly = {
            id: ch.id,
            progress: 0,
            completed: false,
            claimed: false
        };
    }

    function rerollChallenge(index) {
        if (state.rerolls <= 0) return false;
        if (index < 0 || index >= state.active.length) return false;
        if (state.active[index].completed) return false; // Don't reroll completed

        // Pick a new challenge not currently active
        var activeIds = state.active.map(function (c) { return c.id; });
        if (state.weekly) activeIds.push(state.weekly.id);

        var pool = ALL_CHALLENGES.filter(function (c) { return activeIds.indexOf(c.id) === -1; });
        if (pool.length === 0) return false;

        var idx = Math.floor(Math.random() * pool.length);
        var ch = pool[idx];

        state.active[index] = {
            id: ch.id,
            progress: 0,
            completed: false,
            claimed: false
        };
        state.rerolls--;
        saveState();
        return true;
    }

    function getChallengeDef(id) {
        return ALL_CHALLENGES.find(function (c) { return c.id === id; });
    }

    // ============ NOTIFICATION ============

    function showNotification(title, message, icon) {
        var container = document.getElementById('challenge-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'challenge-toast-container';
            container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        toast.className = 'challenge-toast';
        // Inline styles for reliability
        toast.style.cssText = 'background:rgba(0,0,0,0.9);border:1px solid #444;border-left:4px solid #cc2222;color:#fff;padding:12px 16px;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.5);font-family:Inter,sans-serif;min-width:250px;transform:translateX(120%);transition:transform 0.3s ease-out;pointer-events:auto;display:flex;align-items:center;gap:12px;';

        toast.innerHTML = '<div style="font-size:24px;">' + (icon || '🎯') + '</div>' +
            '<div><div style="font-weight:700;font-size:14px;color:#cc2222;text-transform:uppercase;margin-bottom:2px;">' + title + '</div>' +
            '<div style="font-size:13px;color:#ccc;">' + message + '</div></div>';

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(function() { toast.style.transform = 'translateX(0)'; });

        // Remove after delay
        setTimeout(function() {
            toast.style.transform = 'translateX(120%)';
            setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
        }, 4000);
    }

    // ============ PROGRESS TRACKING ============

    function notify(gameId, metric, value) {
        var updated = false;
        var checkList = state.active.concat(state.weekly ? [state.weekly] : []);

        checkList.forEach(function (c) {
            if (!c || c.completed) return;
            var def = getChallengeDef(c.id);
            if (!def || def.gameId !== gameId || def.metric !== metric) return;

            var oldProgress = c.progress;
            if (def.type === 'total') {
                c.progress += value;
            } else if (def.type === 'best') {
                if (value > c.progress) c.progress = value;
            }

            // Cap at target for UI cleanliness
            if (c.progress > def.target && def.type === 'total') c.progress = def.target;

            // Check completion
            if (c.progress >= def.target && !c.completed) {
                c.completed = true;
                c.progress = def.target;
                updated = true;
                showNotification('Challenge Complete!', def.title + ': ' + def.desc, '🏆');
                // Auto-claim CP? No, let user claim in UI for dopamine.
            } else if (c.progress > oldProgress) {
                updated = true;
                // Optional: Notify on milestones (25%, 50%, 75%)
                if (def.type === 'total' && def.target > 10) {
                     var pct = c.progress / def.target;
                     var oldPct = oldProgress / def.target;
                     if (pct >= 0.5 && oldPct < 0.5) showNotification('Challenge Update', def.title + ': 50% Complete', '🔥');
                }
            }
        });

        if (updated) saveState();
    }

    function claimReward(challengeRef) {
        if (!challengeRef.completed || challengeRef.claimed) return false;
        var def = getChallengeDef(challengeRef.id);
        if (!def) return false;

        challengeRef.claimed = true;
        state.cp += def.reward;
        saveState();
        return true;
    }

    function getRank() {
        var r = RANKS[0];
        for (var i = 0; i < RANKS.length; i++) {
            if (state.cp >= RANKS[i].cp) r = RANKS[i];
        }
        return r;
    }

    function getNextRank() {
        for (var i = 0; i < RANKS.length; i++) {
            if (state.cp < RANKS[i].cp) return RANKS[i];
        }
        return null;
    }

    // ============ EXPORT ============

    loadState();

    window.ChallengeManager = {
        state: state,
        ALL_CHALLENGES: ALL_CHALLENGES,
        notify: notify,
        rerollChallenge: rerollChallenge,
        claimReward: claimReward,
        getChallengeDef: getChallengeDef,
        getRank: getRank,
        getNextRank: getNextRank,
        showNotification: showNotification
    };

})();
