/* ============================================
   ScaryGamesAI — Player Profiles System
   localStorage-based, no backend needed
   ============================================ */
(function () {
    'use strict';

    const STORAGE_KEY = 'scarygames_profile';
    const AVATARS = ['💀', '👻', '🧟', '🎃', '🦇', '🕷️', '🧛', '☠️', '👹', '🤡', '😈', '🪦'];

    const DEFAULT_PROFILE = {
        username: '',
        avatar: '💀',
        created: null,
        totalPlayTime: 0,
        gamesPlayed: 0,
        gameStats: {},
    };

    window.PlayerProfile = {
        data: null,

        load() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                this.data = raw ? JSON.parse(raw) : null;
            } catch (e) { this.data = null; }
            return this.data;
        },

        save() {
            if (!this.data) return;
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch (e) { }
        },

        create(username, avatar) {
            this.data = Object.assign({}, DEFAULT_PROFILE, {
                username: username || 'Player',
                avatar: avatar || '💀',
                created: new Date().toISOString(),
                gameStats: {},
            });
            this.save();
            return this.data;
        },

        exists() {
            if (!this.data) this.load();
            return this.data && this.data.username;
        },

        getAvatar() { return (this.data && this.data.avatar) || '💀'; },
        getUsername() { return (this.data && this.data.username) || 'Player'; },

        recordPlay(gameId, score, duration) {
            if (!this.data) return;
            this.data.gamesPlayed++;
            this.data.totalPlayTime += duration || 0;
            if (!this.data.gameStats[gameId]) {
                this.data.gameStats[gameId] = { plays: 0, bestScore: 0, totalTime: 0 };
            }
            var gs = this.data.gameStats[gameId];
            gs.plays++;
            gs.totalTime += duration || 0;
            if (score > gs.bestScore) gs.bestScore = score;
            this.save();
        },

        getStats() {
            if (!this.data) return null;
            return {
                username: this.data.username,
                avatar: this.data.avatar,
                totalPlayTime: this.data.totalPlayTime,
                gamesPlayed: this.data.gamesPlayed,
                memberSince: this.data.created,
                gameStats: this.data.gameStats,
            };
        },

        updateAvatar(avatar) {
            if (!this.data) return;
            this.data.avatar = avatar;
            this.save();
        },

        updateUsername(name) {
            if (!this.data) return;
            this.data.username = name;
            this.save();
        },

        reset() {
            this.data = null;
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
        },
    };

    // ---- Profile UI ----
    function createProfileButton() {
        // Auth UI (Phase 6) owns the navbar profile surface.
        if (document.getElementById('sgai-auth-slot') || document.getElementById('sgai-auth-widget')) return;

        var nav = document.querySelector('.nav-links') || document.querySelector('nav');
        if (!nav) return;

        var btn = document.createElement('button');
        btn.className = 'profile-btn';
        btn.id = 'profile-btn';
        btn.title = 'Player Profile';

        function updateBtn() {
            if (PlayerProfile.exists()) {
                btn.innerHTML = '<span class="profile-avatar">' + PlayerProfile.getAvatar() + '</span>';
                btn.title = PlayerProfile.getUsername();
            } else {
                btn.innerHTML = '<span class="profile-avatar">👤</span>';
                btn.title = 'Create Profile';
            }
        }
        updateBtn();
        btn.addEventListener('click', function () { openProfileModal(); });
        nav.appendChild(btn);
    }

    function openProfileModal() {
        var existing = document.getElementById('profile-modal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.className = 'profile-modal-overlay';

        if (PlayerProfile.exists()) {
            var stats = PlayerProfile.getStats();
            var gameStatsHTML = '';
            Object.keys(stats.gameStats).forEach(function (gid) {
                var gs = stats.gameStats[gid];
                gameStatsHTML += '<div class="pstat-game"><span class="pstat-name">' + gid + '</span>' +
                    '<span class="pstat-val">' + gs.plays + ' plays · Best: ' + gs.bestScore + '</span></div>';
            });
            if (!gameStatsHTML) gameStatsHTML = '<p class="pstat-empty">No games played yet!</p>';

            var memberDate = stats.memberSince ? new Date(stats.memberSince).toLocaleDateString() : '—';
            var totalMin = Math.round(stats.totalPlayTime / 60);

            modal.innerHTML = `
                <div class="profile-modal">
                    <button class="profile-close" id="profile-close">✕</button>
                    <div class="profile-header">
                        <div class="profile-big-avatar">${stats.avatar}</div>
                        <h2 class="profile-name">${stats.username}</h2>
                        <p class="profile-since">Member since ${memberDate}</p>
                    </div>
                    <div class="profile-stats-grid">
                        <div class="pstat"><span class="pstat-num">${stats.gamesPlayed}</span><span class="pstat-label">Games Played</span></div>
                        <div class="pstat"><span class="pstat-num">${totalMin}m</span><span class="pstat-label">Total Time</span></div>
                        <div class="pstat"><span class="pstat-num">${Object.keys(stats.gameStats).length}</span><span class="pstat-label">Games Tried</span></div>
                    </div>
                    <h3 class="profile-section-title">Game Stats</h3>
                    <div class="profile-game-stats">${gameStatsHTML}</div>
                    <h3 class="profile-section-title">Change Avatar</h3>
                    <div class="avatar-picker" id="avatar-picker">
                        ${AVATARS.map(a => '<button class="avatar-opt' + (a === stats.avatar ? ' active' : '') + '" data-avatar="' + a + '">' + a + '</button>').join('')}
                    </div>
                    <button class="profile-danger-btn" id="profile-reset-btn">Reset Profile</button>
                </div>`;
        } else {
            modal.innerHTML = `
                <div class="profile-modal">
                    <button class="profile-close" id="profile-close">✕</button>
                    <h2 class="profile-create-title">Create Your Profile</h2>
                    <p style="color:var(--text-secondary);margin-bottom:16px;">Choose a name and avatar to track your progress.</p>
                    <input type="text" class="profile-name-input" id="profile-name-input" placeholder="Enter username..." maxlength="20" />
                    <h3 class="profile-section-title">Choose Avatar</h3>
                    <div class="avatar-picker" id="avatar-picker">
                        ${AVATARS.map((a, i) => '<button class="avatar-opt' + (i === 0 ? ' active' : '') + '" data-avatar="' + a + '">' + a + '</button>').join('')}
                    </div>
                    <button class="profile-create-btn" id="profile-create-btn">Create Profile</button>
                </div>`;
        }

        document.body.appendChild(modal);
        setTimeout(function () { modal.classList.add('visible'); }, 10);

        // Events
        document.getElementById('profile-close').addEventListener('click', closeProfileModal);
        modal.addEventListener('click', function (e) { if (e.target === modal) closeProfileModal(); });

        // Avatar picker
        var picker = document.getElementById('avatar-picker');
        if (picker) {
            picker.addEventListener('click', function (e) {
                var opt = e.target.closest('.avatar-opt');
                if (!opt) return;
                picker.querySelectorAll('.avatar-opt').forEach(function (b) { b.classList.remove('active'); });
                opt.classList.add('active');
                if (PlayerProfile.exists()) {
                    PlayerProfile.updateAvatar(opt.getAttribute('data-avatar'));
                    var bigAv = document.querySelector('.profile-big-avatar');
                    if (bigAv) bigAv.textContent = opt.getAttribute('data-avatar');
                    updateProfileButton();
                }
            });
        }

        // Create profile
        var createBtn = document.getElementById('profile-create-btn');
        if (createBtn) {
            createBtn.addEventListener('click', function () {
                var nameInput = document.getElementById('profile-name-input');
                var name = nameInput ? nameInput.value.trim() : 'Player';
                if (!name) name = 'Player';
                var activeAvatar = picker.querySelector('.avatar-opt.active');
                var avatar = activeAvatar ? activeAvatar.getAttribute('data-avatar') : '💀';
                PlayerProfile.create(name, avatar);
                updateProfileButton();
                closeProfileModal();
            });
        }

        // Reset
        var resetBtn = document.getElementById('profile-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                if (confirm('Reset your profile? All stats and achievements will be lost!')) {
                    PlayerProfile.reset();
                    updateProfileButton();
                    closeProfileModal();
                }
            });
        }
    }

    // Allow other UI (ex: auth dropdown) to open the legacy profile modal without injecting a navbar button.
    window.PlayerProfileUIOpen = function () {
        openProfileModal();
    };

    function closeProfileModal() {
        var modal = document.getElementById('profile-modal');
        if (modal) {
            modal.classList.remove('visible');
            setTimeout(function () { modal.remove(); }, 300);
        }
    }

    function updateProfileButton() {
        var btn = document.getElementById('profile-btn');
        if (!btn) return;
        if (PlayerProfile.exists()) {
            btn.innerHTML = '<span class="profile-avatar">' + PlayerProfile.getAvatar() + '</span>';
            btn.title = PlayerProfile.getUsername();
        } else {
            btn.innerHTML = '<span class="profile-avatar">👤</span>';
            btn.title = 'Create Profile';
        }
    }

    // Format time helper
    window.formatPlayTime = function (seconds) {
        if (seconds < 60) return Math.round(seconds) + 's';
        if (seconds < 3600) return Math.round(seconds / 60) + 'm';
        return Math.round(seconds / 3600 * 10) / 10 + 'h';
    };

    // Init on DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        PlayerProfile.load();
        createProfileButton();
    });
})();
