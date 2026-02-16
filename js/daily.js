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

    var backendStatus = null;
    var engagementStatus = {
        spin: null,
        treasure: null,
        premium: null,
        conversion: null
    };

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
            gameUrl: '/games/' + GAME_IDS[gameIdx] + '/' + GAME_IDS[gameIdx] + '.html',
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

    function getAuthToken() {
        return localStorage.getItem('sgai-token')
            || localStorage.getItem('sgai_auth_token')
            || 'demo-token';
    }

    function makeIdempotencyKey(scope) {
        return scope + '-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    }

    async function apiRequest(endpoint, options) {
        var response = await fetch('/api' + endpoint, options);
        var data = null;
        try {
            data = await response.json();
        } catch (_) {
            data = null;
        }

        if (!response.ok || (data && data.success === false)) {
            var err = new Error((data && data.error && data.error.message) || ('Request failed (' + response.status + ')'));
            err.code = data && data.error ? data.error.code : null;
            err.status = response.status;
            err.payload = data;
            throw err;
        }

        return data || { success: response.ok };
    }

    async function fetchActivityStatus() {
        var data = await apiRequest('/daily-activity/status', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getAuthToken(),
            }
        });
        backendStatus = data;
        try {
            await fetchEngagementStatus();
        } catch (_) {
            // Keep daily activity available even if engagement endpoints are unavailable.
        }
        return data;
    }

    async function fetchEngagementStatus() {
        var headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getAuthToken()
        };

        var calls = await Promise.allSettled([
            apiRequest('/engagement/daily-spin/status', { method: 'GET', headers: headers }),
            apiRequest('/engagement/treasure-map/status', { method: 'GET', headers: headers }),
            apiRequest('/engagement/premium-currency/sources', { method: 'GET', headers: headers }),
            apiRequest('/engagement/gem-dust/conversion-status', { method: 'GET', headers: headers })
        ]);

        engagementStatus.spin = calls[0].status === 'fulfilled' ? calls[0].value : null;
        engagementStatus.treasure = calls[1].status === 'fulfilled' ? calls[1].value : null;
        engagementStatus.premium = calls[2].status === 'fulfilled' ? calls[2].value : null;
        engagementStatus.conversion = calls[3].status === 'fulfilled' ? calls[3].value : null;
        return engagementStatus;
    }

    async function completeDailyActivity(activityCode) {
        var key = makeIdempotencyKey('daily-activity-complete-' + activityCode);
        var data = await apiRequest('/daily-activity/activities/' + encodeURIComponent(activityCode) + '/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getAuthToken(),
                'idempotency-key': key,
                'x-idempotency-key': key
            },
            body: JSON.stringify({})
        });
        await fetchActivityStatus();
        return data;
    }

    async function claimWeeklyGemCrate() {
        var key = makeIdempotencyKey('weekly-gem-crate-claim');
        var data = await apiRequest('/daily-activity/weekly-crate/claim', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getAuthToken(),
                'idempotency-key': key,
                'x-idempotency-key': key
            },
            body: JSON.stringify({})
        });
        await fetchActivityStatus();
        return data;
    }

    async function claimDailyFreeSpin() {
        var key = makeIdempotencyKey('engagement-spin-free');
        var data = await apiRequest('/engagement/daily-spin/free', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getAuthToken(),
                'idempotency-key': key,
                'x-idempotency-key': key
            },
            body: JSON.stringify({})
        });
        await fetchActivityStatus();
        return data;
    }

    async function claimDailyPremiumSpin() {
        var key = makeIdempotencyKey('engagement-spin-premium');
        var data = await apiRequest('/engagement/daily-spin/premium', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getAuthToken(),
                'idempotency-key': key,
                'x-idempotency-key': key
            },
            body: JSON.stringify({})
        });
        await fetchActivityStatus();
        return data;
    }

    async function claimTreasureMapPiece() {
        var key = makeIdempotencyKey('engagement-map-piece');
        var challenge = getDailyChallenge();
        var data = await apiRequest('/engagement/treasure-map/piece', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getAuthToken(),
                'idempotency-key': key,
                'x-idempotency-key': key
            },
            body: JSON.stringify({ sourceGame: challenge.gameId })
        });
        await fetchActivityStatus();
        return data;
    }

    async function convertGemDustToGem(gems) {
        var parsed = parseInt(gems, 10);
        if (!Number.isFinite(parsed) || parsed < 1 || parsed > 500) {
            throw new Error('Conversion amount must be between 1 and 500');
        }

        var key = makeIdempotencyKey('gem-dust-convert');
        var data = await apiRequest('/engagement/gem-dust/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getAuthToken(),
                'idempotency-key': key,
                'x-idempotency-key': key
            },
            body: JSON.stringify({ gems: parsed })
        });
        await fetchActivityStatus();
        return data;
    }

    function showActionError(err) {
        var msg = err && err.message ? err.message : 'Request failed';
        console.warn('[DailyChallenge] action failed:', msg);
    }

    function renderBackendProgress() {
        if (!backendStatus || !backendStatus.daily || !backendStatus.weekly) return '';

        var daily = backendStatus.daily;
        var weekly = backendStatus.weekly;
        var spin = engagementStatus.spin;
        var treasure = engagementStatus.treasure;
        var conversion = engagementStatus.conversion || engagementStatus.premium?.gemDustConversion || null;
        var gems = Number(engagementStatus.premium?.balances?.gems || conversion?.balances?.gems || 0);
        var convertibleNow = Number(conversion?.convertibleNow || 0);

        return `
            <div class="daily-backend-progress">
                <div class="daily-backend-row">
                    <span>💎 Gem Dust:</span>
                    <strong>${Number(backendStatus.gemDust || 0)}</strong>
                </div>
                <div class="daily-backend-row">
                    <span>🪙 Blood Gems:</span>
                    <strong>${gems}</strong>
                </div>
                <div class="daily-backend-row">
                    <span>Daily Activity:</span>
                    <strong>${Number(daily.completedCount || 0)}/${Number(daily.totalCount || 3)}</strong>
                </div>
                <div class="daily-backend-row">
                    <span>Daily Bonus:</span>
                    <strong>${daily.bonusClaimed ? 'Claimed' : (daily.bonusEligible ? 'Eligible' : 'Locked')}</strong>
                </div>
                <div class="daily-backend-row">
                    <span>Weekly Crate:</span>
                    <strong>${Number(weekly.activityScore || 0)}/${Number(weekly.threshold || 12)} ${weekly.claimed ? '(Claimed)' : ''}</strong>
                </div>
                <div class="daily-backend-row">
                    <span>Daily Spin:</span>
                    <strong>${spin ? (spin.canClaimFreeSpin ? 'Free spin ready' : 'Free spin claimed') : 'Unavailable'}</strong>
                </div>
                <div class="daily-backend-row">
                    <span>Treasure Map:</span>
                    <strong>${treasure ? ((treasure.ownedPieces || []).length + '/6 pieces') : 'Unavailable'}</strong>
                </div>
                <div class="daily-backend-row">
                    <span>Dust Conversion:</span>
                    <strong>${conversion ? (convertibleNow + ' gem(s) ready') : 'Unavailable'}</strong>
                </div>
                <div class="daily-backend-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                    <button class="play-btn" style="font-size:0.8rem;padding:6px 10px;" onclick="DailyChallenge.claimDailyFreeSpinSafe()">🎡 Free Spin</button>
                    <button class="play-btn" style="font-size:0.8rem;padding:6px 10px;" onclick="DailyChallenge.claimTreasureMapPieceSafe()">🗺️ Find Piece</button>
                    <button class="play-btn" style="font-size:0.8rem;padding:6px 10px;" onclick="DailyChallenge.convertOneGemSafe()">🔄 Convert 1 Gem</button>
                </div>
            </div>
        `;
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
                ${renderBackendProgress()}
            </div>`;

        if (!backendStatus) {
            fetchActivityStatus()
                .then(function () {
                    if (container.isConnected) {
                        renderDailyCard(container);
                    }
                })
                .catch(function () {
                    // Keep existing local card rendering if backend is unavailable.
                });
        }
    }

    // Export
    window.DailyChallenge = {
        get: getDailyChallenge,
        complete: completeChallenge,
        isCompletedToday: isCompletedToday,
        getStreak: getStreak,
        renderCard: renderDailyCard,
        fetchActivityStatus: fetchActivityStatus,
        fetchEngagementStatus: fetchEngagementStatus,
        completeActivity: completeDailyActivity,
        claimWeeklyGemCrate: claimWeeklyGemCrate,
        claimDailyFreeSpin: claimDailyFreeSpin,
        claimDailyPremiumSpin: claimDailyPremiumSpin,
        claimTreasureMapPiece: claimTreasureMapPiece,
        convertGemDustToGem: convertGemDustToGem,
        convertOneGem: function () { return convertGemDustToGem(1); },
        claimDailyFreeSpinSafe: function () { return claimDailyFreeSpin().catch(showActionError); },
        claimTreasureMapPieceSafe: function () { return claimTreasureMapPiece().catch(showActionError); },
        convertOneGemSafe: function () { return convertGemDustToGem(1).catch(showActionError); },
        getActivityStatusCache: function () { return backendStatus; }
    };
})();
