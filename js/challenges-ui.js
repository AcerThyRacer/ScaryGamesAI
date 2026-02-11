/* ============================================
   ScaryGamesAI — Challenges UI Logic
   Phase 1-6: Visual Overhaul, Rank 2.0,
   Challenge Expansion, Reward Shop,
   Audio & Animations, Responsive & UX.
   ============================================ */
(function () {
    'use strict';

    // ============ GAME DISPLAY NAMES ============
    var GAME_NAMES = {
        'backrooms-pacman': 'Backrooms: Pac-Man',
        'shadow-crawler': 'Shadow Crawler',
        'the-abyss': 'The Abyss',
        'nightmare-run': 'Nightmare Run',
        'yeti-run': 'Yeti Run',
        'blood-tetris': 'Blood Tetris',
        'seance': 'Séance',
        'dollhouse': 'The Dollhouse',
        'zombie-horde': 'Zombie Horde',
        'the-elevator': 'The Elevator',
        'graveyard-shift': 'Graveyard Shift',
        'web-of-terror': 'Web of Terror',
        'freddys-nightmare': "Freddy's Nightmare",
        'haunted-asylum': 'Haunted Asylum',
        'ritual-circle': 'Ritual Circle',
    };

    var GAME_ICONS = {
        'backrooms-pacman': '👾', 'shadow-crawler': '🕷️', 'the-abyss': '🌊',
        'nightmare-run': '🏃', 'yeti-run': '❄️', 'blood-tetris': '🧱',
        'seance': '🔮', 'dollhouse': '🏚️', 'zombie-horde': '🧟',
        'the-elevator': '🛗', 'graveyard-shift': '⚰️', 'web-of-terror': '🕸️',
        'freddys-nightmare': '🐻', 'haunted-asylum': '🏥', 'ritual-circle': '🔮',
    };

    // ============ PHASE 5A: CHALLENGE AUDIO (Web Audio API) ============
    var ChallengeAudio = {
        ctx: null,
        enabled: true,
        _getCtx: function () {
            if (this.ctx) return this.ctx;
            try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.enabled = false; }
            return this.ctx;
        },
        _vol: function () {
            if (window.HorrorAudio && typeof HorrorAudio.getVolume === 'function') return HorrorAudio.getVolume();
            return 0.5;
        },
        _play: function (fn) {
            if (!this.enabled || this._vol() <= 0) return;
            var ctx = this._getCtx();
            if (!ctx) return;
            if (ctx.state === 'suspended') ctx.resume();
            try { fn(ctx, this._vol()); } catch (e) { }
        },
        hover: function () {
            this._play(function (ctx, vol) {
                var osc = ctx.createOscillator(); var g = ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = 200 + Math.random() * 100;
                g.gain.setValueAtTime(vol * 0.03, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                osc.connect(g); g.connect(ctx.destination);
                osc.start(); osc.stop(ctx.currentTime + 0.15);
            });
        },
        reroll: function () {
            this._play(function (ctx, vol) {
                for (var i = 0; i < 6; i++) {
                    var osc = ctx.createOscillator(); var g = ctx.createGain();
                    osc.type = 'square'; osc.frequency.value = 800 + Math.random() * 600;
                    g.gain.setValueAtTime(vol * 0.06, ctx.currentTime + i * 0.04);
                    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.04 + 0.04);
                    osc.connect(g); g.connect(ctx.destination);
                    osc.start(ctx.currentTime + i * 0.04); osc.stop(ctx.currentTime + i * 0.04 + 0.05);
                }
                var chime = ctx.createOscillator(); var cg = ctx.createGain();
                chime.type = 'sine'; chime.frequency.value = 1200;
                cg.gain.setValueAtTime(vol * 0.08, ctx.currentTime + 0.3);
                cg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
                chime.connect(cg); cg.connect(ctx.destination);
                chime.start(ctx.currentTime + 0.3); chime.stop(ctx.currentTime + 0.7);
            });
        },
        complete: function () {
            this._play(function (ctx, vol) {
                [523, 659, 784].forEach(function (f, i) {
                    var osc = ctx.createOscillator(); var g = ctx.createGain();
                    osc.type = 'triangle'; osc.frequency.value = f;
                    g.gain.setValueAtTime(vol * 0.1, ctx.currentTime + i * 0.12);
                    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
                    osc.connect(g); g.connect(ctx.destination);
                    osc.start(ctx.currentTime + i * 0.12); osc.stop(ctx.currentTime + i * 0.12 + 0.4);
                });
            });
        },
        claim: function () {
            this._play(function (ctx, vol) {
                for (var i = 0; i < 5; i++) {
                    var osc = ctx.createOscillator(); var g = ctx.createGain();
                    osc.type = 'sine'; osc.frequency.value = 1000 + i * 200;
                    g.gain.setValueAtTime(vol * 0.07, ctx.currentTime + i * 0.06);
                    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.2);
                    osc.connect(g); g.connect(ctx.destination);
                    osc.start(ctx.currentTime + i * 0.06); osc.stop(ctx.currentTime + i * 0.06 + 0.2);
                }
            });
        },
        rankUp: function () {
            this._play(function (ctx, vol) {
                [261, 329, 392, 523, 659, 784].forEach(function (f, i) {
                    var osc = ctx.createOscillator(); var g = ctx.createGain();
                    osc.type = 'sawtooth'; osc.frequency.value = f;
                    g.gain.setValueAtTime(vol * 0.08, ctx.currentTime + i * 0.15);
                    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.6);
                    osc.connect(g); g.connect(ctx.destination);
                    osc.start(ctx.currentTime + i * 0.15); osc.stop(ctx.currentTime + i * 0.15 + 0.6);
                });
                // Thunder crash — noise burst
                var buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
                var data = buf.getChannelData(0);
                for (var j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.1));
                var src = ctx.createBufferSource(); var ng = ctx.createGain();
                src.buffer = buf; ng.gain.setValueAtTime(vol * 0.15, ctx.currentTime + 0.8);
                ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.3);
                src.connect(ng); ng.connect(ctx.destination);
                src.start(ctx.currentTime + 0.8);
            });
        },
        cursedAccept: function () {
            this._play(function (ctx, vol) {
                for (var i = 0; i < 4; i++) {
                    var osc = ctx.createOscillator(); var g = ctx.createGain();
                    osc.type = 'sawtooth'; osc.frequency.value = 80 + Math.random() * 40;
                    g.gain.setValueAtTime(vol * 0.06, ctx.currentTime + i * 0.1);
                    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15);
                    osc.connect(g); g.connect(ctx.destination);
                    osc.start(ctx.currentTime + i * 0.1); osc.stop(ctx.currentTime + i * 0.1 + 0.15);
                }
            });
        },
        shopBuy: function () {
            this._play(function (ctx, vol) {
                var osc = ctx.createOscillator(); var g = ctx.createGain();
                osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.15);
                g.gain.setValueAtTime(vol * 0.08, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc.connect(g); g.connect(ctx.destination);
                osc.start(); osc.stop(ctx.currentTime + 0.3);
            });
        }
    };

    // ============ PHASE 6D: ARIA LIVE ANNOUNCER ============
    var liveRegion = null;
    function announce(text) {
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.className = 'challenges-live-region';
            liveRegion.setAttribute('role', 'status');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            document.body.appendChild(liveRegion);
        }
        liveRegion.textContent = '';
        setTimeout(function () { liveRegion.textContent = text; }, 100);
    }

    // ============ PHASE 6E: SKELETON HELPERS ============
    function showSkeletons(containerId, count) {
        var el = document.getElementById(containerId);
        if (!el) return;
        var html = '';
        for (var i = 0; i < count; i++) {
            html += '<div class="skeleton-card">' +
                '<div class="skeleton-line short"></div>' +
                '<div class="skeleton-line title"></div>' +
                '<div class="skeleton-line long"></div>' +
                '<div class="skeleton-line medium"></div>' +
                '<div class="skeleton-line bar"></div></div>';
        }
        el.innerHTML = html;
    }

    // ============ PHASE 5D: INTERSECTION OBSERVER ============
    var cardObserver = null;
    function setupCardObserver() {
        if (typeof IntersectionObserver === 'undefined') {
            // Fallback: make all visible immediately
            document.querySelectorAll('.challenge-card, .monthly-card, .cursed-card, .chain-card').forEach(function (el) {
                el.classList.add('card-visible');
            });
            return;
        }
        if (cardObserver) cardObserver.disconnect();
        cardObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('card-visible');
                    cardObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    }

    function observeCards() {
        if (!cardObserver) { setupCardObserver(); }
        document.querySelectorAll('.challenge-card:not(.card-visible), .monthly-card:not(.card-visible), .cursed-card:not(.card-visible), .chain-card:not(.card-visible)').forEach(function (el) {
            cardObserver.observe(el);
        });
    }

    // ============ PHASE 5D: SECTION REVEAL ============
    var sectionObserver = null;
    function setupSectionObserver() {
        if (typeof IntersectionObserver === 'undefined') return;
        sectionObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    sectionObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05 });
        document.querySelectorAll('.section-reveal').forEach(function (el) {
            sectionObserver.observe(el);
        });
    }

    function getGameName(gameId) {
        return GAME_NAMES[gameId] || gameId.replace(/-/g, ' ');
    }

    function init() {
        if (!window.ChallengeManager) {
            console.error('ChallengeManager not found!');
            return;
        }
        // Phase 6E: Show skeletons briefly
        showSkeletons('daily-container', 3);
        showSkeletons('weekly-container', 1);

        setTimeout(function () {
            renderAll();
            initHeroEmbers();
            startResetCountdown();
            renderStreakBar();
            renderBuffsBar();
            renderRankTimeline();
            renderGameFilterTabs();
            renderMonthlyChallenge();
            renderChallengeChains();
            renderCursedChallenge();

            // Phase 5D: Setup observers
            setupCardObserver();
            observeCards();
            setupSectionObserver();
            initParallaxHero();

            // Phase 5A: Card hover sounds
            initCardHoverSounds();

            // Phase 6C: Keyboard shortcuts
            initKeyboardShortcuts();

            // Phase 7: Social & Events
            renderEventBanner();
            renderEventSection();
            renderLeaderboard();
            renderFriendsPanel();
            renderEventArchive();
            renderNotificationSettings();
            addShareButtons();
        }, 200);
    }

    function renderAll() {
        renderRank();
        renderWeekly();
        renderDaily();
    }

    // ============ RANK RENDERING (Phase 2) ============
    function renderRank() {
        var state = ChallengeManager.state;
        var rank = ChallengeManager.getRank();
        var next = ChallengeManager.getNextRank();
        var rankIdx = ChallengeManager.getRankIndex();

        var iconEl = document.getElementById('rank-icon');
        var titleEl = document.getElementById('rank-title');
        var cpEl = document.getElementById('total-cp');
        var progressEl = document.getElementById('rank-progress');
        var nextEl = document.getElementById('next-rank');
        var neededEl = document.getElementById('cp-needed');
        var rankCard = document.querySelector('.rank-card');

        if (iconEl) iconEl.textContent = rank.icon;
        if (titleEl) {
            titleEl.textContent = rank.title;
            titleEl.style.color = rank.color || '';
        }
        if (cpEl) cpEl.textContent = state.cp.toLocaleString();

        // Apply flair class to rank card
        if (rankCard) {
            ChallengeManager.RANKS.forEach(function (r) {
                if (r.flair) rankCard.classList.remove(r.flair);
            });
            if (rank.flair) rankCard.classList.add(rank.flair);
        }

        var progress = 100;
        var needed = 'MAX';
        var nextTitle = 'Max Rank';

        if (next) {
            var prevCp = rank.cp;
            var nextCp = next.cp;
            var current = state.cp;
            progress = Math.max(0, Math.min(100, ((current - prevCp) / (nextCp - prevCp)) * 100));
            needed = (nextCp - current).toLocaleString();
            nextTitle = next.title;
        }

        if (progressEl) progressEl.style.width = progress + '%';
        if (nextEl) {
            nextEl.textContent = nextTitle;
            if (next && next.color) nextEl.style.color = next.color;
        }
        if (neededEl) neededEl.textContent = needed;

        renderMilestoneMarkers(rank, next);
        renderRankTierBadge(rankIdx);

        // Show equipped title
        var titleDisplay = document.getElementById('equipped-title-display');
        if (titleDisplay && state.equipped && state.equipped.title) {
            var titleItem = ChallengeManager.getShopItem(state.equipped.title);
            if (titleItem) {
                titleDisplay.textContent = '« ' + titleItem.name + ' »';
                titleDisplay.style.display = '';
            } else {
                titleDisplay.style.display = 'none';
            }
        } else if (titleDisplay) {
            titleDisplay.style.display = 'none';
        }

        // Show equipped badge
        var badgeDisplay = document.getElementById('equipped-badge-display');
        if (badgeDisplay && state.equipped && state.equipped.badge) {
            var badgeItem = ChallengeManager.getShopItem(state.equipped.badge);
            if (badgeItem) {
                badgeDisplay.textContent = badgeItem.icon;
                badgeDisplay.style.display = '';
            } else {
                badgeDisplay.style.display = 'none';
            }
        } else if (badgeDisplay) {
            badgeDisplay.style.display = 'none';
        }
    }

    // ============ MILESTONE MARKERS ON PROGRESS BAR ============
    function renderMilestoneMarkers(currentRank, nextRank) {
        var track = document.querySelector('.rank-progress-track');
        if (!track) return;
        var old = track.querySelectorAll('.milestone-marker');
        old.forEach(function (m) { m.remove(); });
        if (!nextRank) return;
        var range = nextRank.cp - currentRank.cp;
        var milestones = [0.25, 0.5, 0.75];
        milestones.forEach(function (pct) {
            var marker = document.createElement('div');
            marker.className = 'milestone-marker';
            marker.style.left = (pct * 100) + '%';
            var cp = Math.round(currentRank.cp + range * pct);
            marker.setAttribute('data-tooltip', cp.toLocaleString() + ' CP');
            if (ChallengeManager.state.cp >= cp) marker.classList.add('passed');
            track.appendChild(marker);
        });
    }

    // ============ RANK TIER BADGE ============
    function renderRankTierBadge(rankIdx) {
        var container = document.querySelector('.rank-tier-badge');
        if (!container) return;
        var tier = '';
        if (rankIdx >= 12) tier = 'LEGENDARY';
        else if (rankIdx >= 9) tier = 'MYTHIC';
        else if (rankIdx >= 6) tier = 'EPIC';
        else if (rankIdx >= 3) tier = 'RARE';
        else tier = 'COMMON';
        container.className = 'rank-tier-badge tier-' + tier.toLowerCase();
        container.textContent = tier;
    }

    // ============ RANK TIMELINE ============
    function renderRankTimeline() {
        var container = document.getElementById('rank-timeline');
        if (!container) return;
        var RANKS = ChallengeManager.RANKS;
        var currentIdx = ChallengeManager.getRankIndex();
        var html = '';
        RANKS.forEach(function (rank, i) {
            var achieved = i <= currentIdx;
            var cls = 'timeline-node' + (achieved ? ' achieved' : '') + (i === currentIdx ? ' current' : '');
            var date = '';
            if (ChallengeManager.state.rankHistory) {
                var entry = ChallengeManager.state.rankHistory.find(function (h) { return h.rankIdx === i; });
                if (entry) date = new Date(entry.date).toLocaleDateString();
            }
            html += '<div class="' + cls + '" data-rank-idx="' + i + '">' +
                '<div class="timeline-icon" style="' + (achieved ? 'color:' + rank.color : '') + '">' + rank.icon + '</div>' +
                '<div class="timeline-label">' + rank.title + '</div>' +
                '<div class="timeline-cp">' + rank.cp.toLocaleString() + ' CP</div>' +
                (date ? '<div class="timeline-date">' + date + '</div>' : '') +
                '</div>';
        });
        container.innerHTML = '<div class="timeline-track">' + html + '</div>';
    }

    // ============ BUFFS BAR ============
    function renderBuffsBar() {
        var container = document.getElementById('buffs-bar');
        if (!container) return;
        var buffs = ChallengeManager.getActiveBuffs();
        if (buffs.length === 0) { container.style.display = 'none'; return; }
        container.style.display = '';
        var html = '<div class="buffs-title">⚡ ACTIVE BUFFS</div><div class="buffs-list">';
        buffs.forEach(function (buff) {
            html += '<div class="buff-chip" style="--buff-color: ' + buff.color + '">' +
                '<span class="buff-icon">' + buff.icon + '</span>' +
                '<span class="buff-name">' + buff.name + '</span>' +
                '<span class="buff-value">' + buff.value + '</span></div>';
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // ============ STREAK BAR ============
    function renderStreakBar() {
        var bar = document.getElementById('streak-bar');
        if (!bar) return;
        var streak = 0;
        if (window.DailyChallenge) streak = DailyChallenge.getStreak();
        if (streak > 0) {
            bar.style.display = '';
            var countEl = document.getElementById('streak-count');
            var multEl = document.getElementById('streak-mult-value');
            if (countEl) countEl.textContent = streak;
            var mult = '1×';
            if (streak >= 30) mult = '3×';
            else if (streak >= 14) mult = '2×';
            else if (streak >= 7) mult = '1.5×';
            else if (streak >= 3) mult = '1.25×';
            if (multEl) multEl.textContent = mult;

            // Phase 5B: Scale the fire emoji based on streak
            var fireEl = bar.querySelector('.streak-fire');
            if (fireEl) {
                fireEl.classList.remove('streak-low', 'streak-mid', 'streak-high', 'streak-max');
                if (streak >= 30) fireEl.classList.add('streak-max');
                else if (streak >= 14) fireEl.classList.add('streak-high');
                else if (streak >= 7) fireEl.classList.add('streak-mid');
                else if (streak >= 3) fireEl.classList.add('streak-low');
            }
        } else {
            bar.style.display = 'none';
        }
    }

    // ============ GAME FILTER TABS (Phase 3F) ============
    function renderGameFilterTabs() {
        var container = document.getElementById('game-filter-tabs');
        if (!container) return;

        // Gather unique game IDs from all challenges
        var gameIds = [];
        ChallengeManager.ALL_CHALLENGES.forEach(function (c) {
            if (gameIds.indexOf(c.gameId) === -1) gameIds.push(c.gameId);
        });

        var currentFilter = ChallengeManager.state.activeFilter || 'all';

        var html = '<button class="filter-tab' + (currentFilter === 'all' ? ' active' : '') +
            '" data-filter="all">All Games</button>';

        gameIds.forEach(function (gid) {
            var icon = GAME_ICONS[gid] || '🎮';
            var name = getGameName(gid);
            // Count mastery
            var total = ChallengeManager.ALL_CHALLENGES.filter(function (c) { return c.gameId === gid; }).length;
            html += '<button class="filter-tab' + (currentFilter === gid ? ' active' : '') +
                '" data-filter="' + gid + '" title="' + name + '">' +
                icon + ' ' + name + '</button>';
        });

        container.innerHTML = html;

        // Bind click events
        container.querySelectorAll('.filter-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                ChallengeManager.state.activeFilter = btn.getAttribute('data-filter');
                renderGameFilterTabs();
                renderDaily();
            });
        });
    }

    // ============ DIFFICULTY HELPER ============
    function getDifficultyFromDef(def) {
        var diff = def.difficulty || 'easy';
        var map = {
            'easy': { level: 1, label: 'Easy', class: 'easy', color: '#22c55e' },
            'medium': { level: 2, label: 'Medium', class: 'medium', color: '#eab308' },
            'hard': { level: 3, label: 'Hard', class: 'hard', color: '#ef4444' },
            'nightmare': { level: 4, label: 'Nightmare', class: 'nightmare', color: '#a855f7' }
        };
        return map[diff] || map['easy'];
    }

    // ============ CHALLENGE CARD CREATION ============
    function createCard(challengeObj, isWeekly, index) {
        var def = ChallengeManager.getChallengeDef(challengeObj.id);
        if (!def) return document.createElement('div');

        var pct = Math.min(100, Math.floor((challengeObj.progress / def.target) * 100));
        var card = document.createElement('div');
        var classes = ['challenge-card'];
        if (isWeekly) classes.push('weekly-card');
        if (challengeObj.completed) classes.push('completed');
        if (challengeObj.claimed) classes.push('claimed');
        if (!challengeObj.completed && pct >= 75) classes.push('near-complete');
        card.className = classes.join(' ');
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'article');
        card.setAttribute('aria-label', def.title + ' — ' + (challengeObj.completed ? 'Completed' : pct + '% progress'));

        // Difficulty display using definition field
        var difficulty = getDifficultyFromDef(def);
        var skulls = '';
        for (var s = 0; s < difficulty.level; s++) skulls += '💀';

        // Multiplier preview
        var mult = ChallengeManager.getTotalMultiplier(def.gameId);
        var multHtml = '';
        if (!challengeObj.claimed && mult > 1) {
            multHtml = '<div class="chal-multiplier">⚡ ' + mult.toFixed(2) + '× CP</div>';
        }

        // Build buttons
        var btnHtml = '';
        if (challengeObj.claimed) {
            var rewardInfo = challengeObj._lastReward;
            var claimedText = '✓ Claimed';
            if (rewardInfo && rewardInfo.multiplier > 1) {
                claimedText = '✓ Claimed +' + rewardInfo.final + ' CP (' + rewardInfo.multiplier.toFixed(1) + '×)';
            }
            btnHtml = '<span class="chal-claimed-badge">' + claimedText + '</span>';
        } else if (challengeObj.completed) {
            var finalReward = Math.round(def.reward * mult);
            var rewardText = finalReward !== def.reward ?
                '<span class="reward-boosted">' + finalReward + '</span> CP <span class="reward-base">(base ' + def.reward + ')</span>' :
                def.reward + ' CP';
            btnHtml = '<button class="chal-btn chal-btn-claim" onclick="window.ChallengesUI.claim(\'' +
                (isWeekly ? 'weekly' : index) + '\')" aria-label="Claim CP reward">' +
                'CLAIM ' + rewardText + '</button>';
        } else {
            var rerollBtn = '';
            if (!isWeekly && ChallengeManager.state.rerolls > 0) {
                rerollBtn = '<button class="chal-btn chal-btn-reroll" onclick="window.ChallengesUI.reroll(' +
                    index + ')" title="Reroll Challenge" aria-label="Reroll this challenge">🎲</button>';
            }
            var playUrl = '/games/' + def.gameId + '/';
            btnHtml = '<div class="chal-btn-group">' + rerollBtn +
                '<a href="' + playUrl + '" class="chal-btn chal-btn-play" aria-label="Play ' + getGameName(def.gameId) + '">PLAY ▶</a></div>';
        }

        // Weekly countdown
        var weeklyCountdownHtml = '';
        if (isWeekly && !challengeObj.completed) {
            weeklyCountdownHtml = '<div class="weekly-countdown">' +
                '<span>⏰</span> <span class="countdown-value weekly-countdown-timer">--d --h</span></div>';
        }

        card.innerHTML =
            '<div class="chal-header">' +
            '<div>' +
            '<div class="chal-game">' + (GAME_ICONS[def.gameId] || '🎮') + ' ' + getGameName(def.gameId) + '</div>' +
            '<div class="chal-title">' + def.title + '</div>' +
            '<div class="chal-difficulty ' + difficulty.class + '">' + skulls + ' ' + difficulty.label + '</div>' +
            '</div>' +
            '<div class="chal-reward-block">' +
            '<div class="chal-reward">💎 ' + def.reward + '</div>' +
            multHtml +
            '</div>' +
            '</div>' +
            '<div class="chal-desc">' + def.desc + '</div>' +
            '<div class="chal-progress-wrap">' +
            '<div class="chal-progress-text">' +
            '<span class="chal-progress-label">' + (challengeObj.completed ? '✓ COMPLETED' : 'PROGRESS') + '</span>' +
            '<span class="chal-progress-numbers">' + challengeObj.progress + ' / ' + def.target + '</span>' +
            '</div>' +
            '<div class="chal-progress-bar">' +
            '<div class="chal-progress-fill" style="width: ' + pct + '%"></div>' +
            '</div>' +
            '</div>' +
            weeklyCountdownHtml +
            '<div class="chal-footer">' + btnHtml + '</div>' +
            '<div class="card-tooltip">' + getGameName(def.gameId) + ' · ' + difficulty.label + (mult > 1 ? ' · ' + mult.toFixed(1) + '× CP' : '') + '</div>';

        return card;
    }

    // ============ SECTION RENDERING ============
    function renderWeekly() {
        var container = document.getElementById('weekly-container');
        if (!container) return;
        container.innerHTML = '';
        if (ChallengeManager.state.weekly) {
            container.appendChild(createCard(ChallengeManager.state.weekly, true, -1));
            startWeeklyCountdown();
        } else {
            container.innerHTML =
                '<div class="challenge-empty">' +
                '<div class="challenge-empty-icon">🌑</div>' +
                '<div class="challenge-empty-text">No Active Nightmare</div>' +
                '<div class="challenge-empty-sub">The weekly challenge will appear on Monday...</div></div>';
        }
    }

    function renderDaily() {
        var container = document.getElementById('daily-container');
        if (!container) return;
        container.innerHTML = '';

        var rerollsEl = document.getElementById('rerolls-count');
        if (rerollsEl) {
            rerollsEl.textContent = ChallengeManager.state.rerolls;
            // Show tier bonus info
            var maxRerolls = ChallengeManager.getMaxDailyRerolls();
            var rerollsBadge = document.querySelector('.rerolls-badge');
            if (rerollsBadge && maxRerolls > 3) {
                var bonusSpan = rerollsBadge.querySelector('.reroll-tier-bonus');
                if (!bonusSpan) {
                    bonusSpan = document.createElement('span');
                    bonusSpan.className = 'reroll-tier-bonus';
                    bonusSpan.style.cssText = 'color:#f5c842;font-size:0.7rem;margin-left:4px;';
                    rerollsBadge.appendChild(bonusSpan);
                }
                bonusSpan.textContent = '(+' + (maxRerolls - 3) + ' tier bonus)';
            }
        }

        var activeFilter = ChallengeManager.state.activeFilter || 'all';

        if (ChallengeManager.state.active.length === 0) {
            container.innerHTML =
                '<div class="challenge-empty">' +
                '<div class="challenge-empty-icon">💀</div>' +
                '<div class="challenge-empty-text">The Darkness Awaits</div>' +
                '<div class="challenge-empty-sub">No daily challenges available right now...</div></div>';
            return;
        }

        ChallengeManager.state.active.forEach(function (c, i) {
            var def = ChallengeManager.getChallengeDef(c.id);
            if (activeFilter !== 'all' && def && def.gameId !== activeFilter) return;
            container.appendChild(createCard(c, false, i));
        });

        if (container.children.length === 0) {
            container.innerHTML =
                '<div class="challenge-empty">' +
                '<div class="challenge-empty-icon">🔍</div>' +
                '<div class="challenge-empty-text">No Challenges for This Game</div>' +
                '<div class="challenge-empty-sub">Try selecting "All Games" to see all challenges.</div></div>';
        }
    }

    // ============ MONTHLY EPIC CHALLENGE (Phase 3B) ============
    function renderMonthlyChallenge() {
        var container = document.getElementById('monthly-container');
        if (!container) return;
        container.innerHTML = '';

        var monthly = ChallengeManager.state.monthly;
        if (!monthly) {
            container.innerHTML = '<div class="challenge-empty"><div class="challenge-empty-icon">📅</div>' +
                '<div class="challenge-empty-text">No Monthly Challenge</div></div>';
            return;
        }

        var def = ChallengeManager.getMonthlyDef(monthly.id);
        if (!def) return;

        var pct = Math.min(100, Math.floor((monthly.progress / def.target) * 100));
        var monthName = getMonthName(monthly.month);

        var btnHtml = '';
        if (monthly.claimed) {
            btnHtml = '<span class="chal-claimed-badge">✓ Claimed</span>';
        } else if (monthly.completed) {
            var mult = ChallengeManager.getTotalMultiplier(def.gameId);
            var finalReward = Math.round(def.reward * mult);
            btnHtml = '<button class="chal-btn chal-btn-claim" onclick="window.ChallengesUI.claimMonthly()">' +
                'CLAIM ' + finalReward + ' CP</button>';
        } else {
            var playUrl = '/games/' + def.gameId + '/';
            btnHtml = '<a href="' + playUrl + '" class="chal-btn chal-btn-play">PLAY ▶</a>';
        }

        var card = document.createElement('div');
        card.className = 'challenge-card monthly-card' + (monthly.completed ? ' completed' : '') + (monthly.claimed ? ' claimed' : '');

        card.innerHTML =
            '<div class="monthly-header">' +
            '<div class="monthly-badge">📅 MONTHLY EPIC</div>' +
            '<div class="monthly-month">' + monthName + '</div>' +
            '</div>' +
            '<div class="chal-header">' +
            '<div>' +
            '<div class="chal-game">' + (GAME_ICONS[def.gameId] || '🎮') + ' ' + getGameName(def.gameId) + '</div>' +
            '<div class="chal-title">' + def.title + '</div>' +
            '</div>' +
            '<div class="chal-reward-block"><div class="chal-reward monthly-reward">🏆 ' + def.reward + ' CP</div></div>' +
            '</div>' +
            '<div class="chal-desc">' + def.desc + '</div>' +
            '<div class="chal-progress-wrap">' +
            '<div class="chal-progress-text">' +
            '<span class="chal-progress-label">' + (monthly.completed ? '✓ COMPLETED' : 'PROGRESS') + '</span>' +
            '<span class="chal-progress-numbers">' + monthly.progress.toLocaleString() + ' / ' + def.target.toLocaleString() + '</span>' +
            '</div>' +
            '<div class="chal-progress-bar monthly-progress">' +
            '<div class="chal-progress-fill" style="width: ' + pct + '%"></div>' +
            '</div></div>' +
            '<div class="chal-footer">' + btnHtml;

        // Add monthly reroll button if not completed/claimed
        if (!monthly.completed && !monthly.claimed) {
            var monthlyRerolls = ChallengeManager.state.monthlyRerolls || 0;
            card.innerHTML += '<button class="chal-btn chal-btn-reroll monthly-reroll-btn" ' +
                'onclick="window.ChallengesUI.rerollMonthly()" ' +
                (monthlyRerolls <= 0 ? 'disabled title="No monthly rerolls remaining"' : '') + '>' +
                '🎲 Reroll (' + monthlyRerolls + ' left)</button>';
        }

        card.innerHTML += '</div>';

        container.appendChild(card);
    }

    function getMonthName(monthStr) {
        if (!monthStr) return '';
        var parts = monthStr.split('-');
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[parseInt(parts[1]) - 1] + ' ' + parts[0];
    }

    // ============ CHALLENGE CHAINS (Phase 3C) ============
    function renderChallengeChains() {
        var container = document.getElementById('chains-container');
        if (!container) return;
        container.innerHTML = '';

        ChallengeManager.CHALLENGE_CHAINS.forEach(function (chainDef) {
            var cs = ChallengeManager.state.chains[chainDef.id];
            if (!cs) return;

            var chainEl = document.createElement('div');
            chainEl.className = 'chain-card' + (cs.completed ? ' chain-complete' : '');

            var stepsHtml = '';
            chainDef.steps.forEach(function (stepDef, i) {
                var stepState = cs.steps[i];
                var isActive = i === cs.currentStep && !cs.completed;
                var isCompleted = stepState && stepState.completed;
                var isClaimed = stepState && stepState.claimed;
                var isFuture = i > cs.currentStep;

                var stepClass = 'chain-step' + (isActive ? ' active' : '') + (isCompleted ? ' completed' : '') + (isClaimed ? ' claimed' : '') + (isFuture ? ' locked' : '');

                var pct = 0;
                if (stepState && stepDef.target > 0) {
                    pct = Math.min(100, Math.floor((stepState.progress / stepDef.target) * 100));
                }

                var stepBtn = '';
                if (isClaimed) {
                    stepBtn = '<span class="chain-step-badge">✓</span>';
                } else if (isCompleted) {
                    stepBtn = '<button class="chal-btn chal-btn-claim chain-claim-btn" onclick="window.ChallengesUI.claimChainStep(\'' +
                        chainDef.id + '\',' + i + ')">CLAIM +' + stepDef.reward + ' CP</button>';
                } else if (isActive) {
                    stepBtn = '<div class="chain-step-progress"><div class="chain-step-fill" style="width:' + pct + '%"></div></div>' +
                        '<span class="chain-step-count">' + (stepState ? stepState.progress : 0) + '/' + stepDef.target + '</span>';
                }

                stepsHtml += '<div class="' + stepClass + '">' +
                    '<div class="chain-step-num">' + (i + 1) + '</div>' +
                    '<div class="chain-step-info">' +
                    '<div class="chain-step-title">' + stepDef.title + '</div>' +
                    '<div class="chain-step-lore">' + stepDef.lore + '</div>' +
                    '<div class="chain-step-desc">' + stepDef.desc + '</div>' +
                    '</div>' +
                    '<div class="chain-step-action">' + stepBtn + '</div>' +
                    '</div>';
            });

            var bonusHtml = cs.completed ?
                '<div class="chain-bonus claimed">🏆 Chain Bonus Claimed: +' + chainDef.bonusReward + ' CP</div>' :
                '<div class="chain-bonus">Chain Completion Bonus: +' + chainDef.bonusReward + ' CP</div>';

            chainEl.innerHTML =
                '<div class="chain-header" style="--chain-color: ' + chainDef.color + '">' +
                '<div class="chain-icon">' + chainDef.icon + '</div>' +
                '<div class="chain-info">' +
                '<div class="chain-title">' + chainDef.title + '</div>' +
                '<div class="chain-desc">' + chainDef.desc + '</div>' +
                '<div class="chain-progress-text">' + cs.steps.filter(function (s) { return s.claimed; }).length + ' / ' + chainDef.steps.length + ' steps</div>' +
                '</div></div>' +
                '<div class="chain-steps">' + stepsHtml + '</div>' +
                bonusHtml;

            container.appendChild(chainEl);
        });
    }

    // ============ CURSED CHALLENGE (Phase 3E) ============
    function renderCursedChallenge() {
        var container = document.getElementById('cursed-container');
        if (!container) return;
        container.innerHTML = '';

        var cursed = ChallengeManager.state.cursed;
        if (!cursed) return;

        var def = ChallengeManager.getCursedDef(cursed.id);
        if (!def) return;

        var pct = Math.min(100, Math.floor((cursed.progress / def.target) * 100));

        var card = document.createElement('div');
        var cardClass = 'challenge-card cursed-card';
        if (cursed.completed) cardClass += ' completed';
        if (cursed.claimed) cardClass += ' claimed';
        if (cursed.failed) cardClass += ' failed';
        card.className = cardClass;

        var btnHtml = '';
        if (cursed.failed) {
            btnHtml = '<span class="cursed-failed-badge">💀 CURSE CLAIMED YOU — Lost ' + def.penalty + ' CP</span>';
        } else if (cursed.claimed) {
            btnHtml = '<span class="chal-claimed-badge">✓ Curse Broken</span>';
        } else if (cursed.completed) {
            btnHtml = '<button class="chal-btn chal-btn-claim" onclick="window.ChallengesUI.claimCursed()">' +
                'BREAK THE CURSE — Claim ' + def.reward + ' CP</button>';
        } else if (cursed.accepted) {
            var playUrl = '/games/' + def.gameId + '/';
            btnHtml = '<div class="cursed-active-status">⛓️ Curse Active</div>' +
                '<a href="' + playUrl + '" class="chal-btn chal-btn-play">PLAY ▶</a>';
        } else {
            btnHtml = '<button class="chal-btn cursed-accept-btn" onclick="window.ChallengesUI.acceptCursed()">' +
                '⛓️ ACCEPT THE CURSE</button>';
        }

        card.innerHTML =
            '<div class="cursed-header">' +
            '<div class="cursed-badge">⛓️ CURSED</div>' +
            '<div class="cursed-risk">Risk: -' + def.penalty + ' CP</div>' +
            '</div>' +
            '<div class="chal-header">' +
            '<div>' +
            '<div class="chal-game">' + (GAME_ICONS[def.gameId] || '🎮') + ' ' + getGameName(def.gameId) + '</div>' +
            '<div class="chal-title">' + def.title + '</div>' +
            '</div>' +
            '<div class="chal-reward-block"><div class="chal-reward cursed-reward">⛓️ ' + def.reward + ' CP</div></div>' +
            '</div>' +
            '<div class="chal-desc">' + def.desc + '</div>' +
            (cursed.accepted && !cursed.completed && !cursed.failed ?
                '<div class="chal-progress-wrap">' +
                '<div class="chal-progress-text">' +
                '<span class="chal-progress-label">PROGRESS</span>' +
                '<span class="chal-progress-numbers">' + cursed.progress + ' / ' + def.target + '</span></div>' +
                '<div class="chal-progress-bar cursed-progress">' +
                '<div class="chal-progress-fill" style="width: ' + pct + '%"></div></div></div>' : '') +
            '<div class="chal-footer">' + btnHtml + '</div>';

        container.appendChild(card);
    }

    // ============ SHOP / BLACK MARKET (Phase 4) ============
    function openShop() {
        // Remove existing modal if any
        var existing = document.getElementById('shop-modal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.className = 'shop-modal-overlay';
        modal.id = 'shop-modal';

        var categories = [
            { key: 'badges', name: 'Badges', icon: '🏅' },
            { key: 'name_effects', name: 'Name Effects', icon: '✨' },
            { key: 'card_backs', name: 'Card Backs', icon: '🎨' },
            { key: 'titles', name: 'Titles', icon: '📜' },
            { key: 'themes', name: 'Themes', icon: '🎭' }
        ];

        var activeCategory = 'badges';

        function renderShopContent() {
            var tabsHtml = '';
            categories.forEach(function (cat) {
                tabsHtml += '<button class="shop-tab' + (activeCategory === cat.key ? ' active' : '') +
                    '" data-cat="' + cat.key + '">' + cat.icon + ' ' + cat.name + '</button>';
            });

            var itemsHtml = '';
            var rankIdx = ChallengeManager.getRankIndex();

            ChallengeManager.SHOP_ITEMS.forEach(function (item) {
                if (item.category !== activeCategory) return;

                var owned = ChallengeManager.isOwned(item.id);
                var equipped = ChallengeManager.isEquipped(item.id);
                var canAfford = ChallengeManager.state.cp >= item.cost;
                var rankLocked = rankIdx < item.minRank;
                var rankName = ChallengeManager.getRankByIndex(item.minRank).title;

                var statusHtml = '';
                var btnHtml = '';

                if (owned && equipped) {
                    statusHtml = '<div class="shop-item-status equipped">✓ EQUIPPED</div>';
                    btnHtml = '<button class="shop-item-btn unequip" data-id="' + item.id + '">UNEQUIP</button>';
                } else if (owned) {
                    statusHtml = '<div class="shop-item-status owned">OWNED</div>';
                    btnHtml = '<button class="shop-item-btn equip" data-id="' + item.id + '">EQUIP</button>';
                } else if (rankLocked) {
                    statusHtml = '<div class="shop-item-status locked">🔒 Requires ' + rankName + '</div>';
                    btnHtml = '<button class="shop-item-btn locked" disabled>LOCKED</button>';
                } else if (!canAfford) {
                    statusHtml = '<div class="shop-item-status poor">Need ' + (item.cost - ChallengeManager.state.cp).toLocaleString() + ' more CP</div>';
                    btnHtml = '<button class="shop-item-btn cant-afford" disabled>' + item.cost.toLocaleString() + ' CP</button>';
                } else {
                    btnHtml = '<button class="shop-item-btn buy" data-id="' + item.id + '">' + item.cost.toLocaleString() + ' CP</button>';
                }

                var itemClass = 'shop-item' + (owned ? ' owned' : '') + (equipped ? ' equipped' : '') + (rankLocked ? ' locked' : '');

                itemsHtml += '<div class="' + itemClass + '">' +
                    '<div class="shop-item-icon">' + item.icon + '</div>' +
                    '<div class="shop-item-info">' +
                    '<div class="shop-item-name">' + item.name + '</div>' +
                    '<div class="shop-item-desc">' + item.desc + '</div>' +
                    statusHtml +
                    '</div>' +
                    '<div class="shop-item-action">' + btnHtml + '</div>' +
                    '</div>';
            });

            modal.innerHTML =
                '<div class="shop-modal">' +
                '<div class="shop-header">' +
                '<div class="shop-title-wrap">' +
                '<div class="shop-title">🕯️ The Black Market</div>' +
                '<div class="shop-subtitle">Spend your Challenge Points on dark wares...</div>' +
                '</div>' +
                '<div class="shop-cp-display">💎 ' + ChallengeManager.state.cp.toLocaleString() + ' CP</div>' +
                '<button class="shop-close" id="shop-close-btn">✕</button>' +
                '</div>' +
                '<div class="shop-tabs">' + tabsHtml + '</div>' +
                '<div class="shop-items">' + itemsHtml + '</div>' +
                '</div>';

            // Bind events
            modal.querySelector('#shop-close-btn').addEventListener('click', function () { modal.remove(); });
            modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });

            modal.querySelectorAll('.shop-tab').forEach(function (tab) {
                tab.addEventListener('click', function () {
                    activeCategory = tab.getAttribute('data-cat');
                    renderShopContent();
                });
            });

            modal.querySelectorAll('.shop-item-btn.buy').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var result = ChallengeManager.purchaseItem(btn.getAttribute('data-id'));
                    if (result.ok) {
                        ChallengeAudio.shopBuy();
                        renderShopContent();
                        renderRank();
                        animateCPCount();
                    } else {
                        ChallengeManager.showNotification('Purchase Failed', result.reason, '❌');
                    }
                });
            });

            modal.querySelectorAll('.shop-item-btn.equip, .shop-item-btn.unequip').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    ChallengeManager.equipItem(btn.getAttribute('data-id'));
                    renderShopContent();
                    renderRank();
                });
            });
        }

        renderShopContent();
        document.body.appendChild(modal);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { modal.classList.add('visible'); });
        });
    }

    // ============ ACTIONS ============
    function reroll(index) {
        var container = document.getElementById('daily-container');
        var cards = container ? container.querySelectorAll('.challenge-card') : [];
        var card = cards[index];
        if (ChallengeManager.rerollChallenge(index)) {
            ChallengeAudio.reroll();
            if (card) {
                card.classList.add('rerolling');
                setTimeout(function () {
                    renderDaily();
                    renderStreakBar();
                    renderBuffsBar();
                    observeCards();
                }, 600);
            } else {
                renderDaily();
                observeCards();
            }
            announce('Challenge rerolled. ' + ChallengeManager.state.rerolls + ' rerolls remaining.');
        } else {
            if (ChallengeManager.state.rerolls <= 0) {
                ChallengeManager.showNotification('No Rerolls Left', 'You\'ve used all rerolls for today.', '🎲');
            }
        }
    }

    function claim(ref) {
        var c = (ref === 'weekly') ? ChallengeManager.state.weekly : ChallengeManager.state.active[ref];
        if (!c) return;
        if (ChallengeManager.claimReward(c)) {
            ChallengeAudio.claim();
            var rewardInfo = c._lastReward;
            var container = (ref === 'weekly') ?
                document.getElementById('weekly-container') :
                document.getElementById('daily-container');
            var cards = container ? container.querySelectorAll('.challenge-card') : [];
            var cardEl = (ref === 'weekly') ? cards[0] : cards[ref];
            if (cardEl) spawnCompletionBurst(cardEl);
            if (ref === 'weekly') { triggerLightningFlash(); triggerScreenShake(); }
            animateCPCount();
            var def = ChallengeManager.getChallengeDef(c.id);
            if (rewardInfo && rewardInfo.multiplier > 1) {
                ChallengeManager.showNotification('Reward Claimed!',
                    '+' + rewardInfo.final + ' CP (base ' + rewardInfo.base + ' × ' + rewardInfo.multiplier.toFixed(1) + ')', '💎');
                announce('Reward claimed! Plus ' + rewardInfo.final + ' CP.');
            } else {
                ChallengeManager.showNotification('Reward Claimed!', '+' + def.reward + ' CP', '💎');
                announce('Reward claimed! Plus ' + def.reward + ' CP.');
            }
            if (rewardInfo && rewardInfo.rankedUp) {
                setTimeout(function () { showRankUpCinematic(rewardInfo.newRankIdx); }, 600);
            }
            renderAll();
            renderStreakBar();
            renderBuffsBar();
            renderRankTimeline();
        }
    }

    function claimMonthly() {
        var monthly = ChallengeManager.state.monthly;
        if (!monthly || !monthly.completed || monthly.claimed) return;
        var def = ChallengeManager.getMonthlyDef(monthly.id);
        if (!def) return;

        var prevRankIdx = ChallengeManager.getRankIndex();
        var mult = ChallengeManager.getTotalMultiplier(def.gameId);
        var finalReward = Math.round(def.reward * mult);

        monthly.claimed = true;
        ChallengeManager.state.cp += finalReward;

        var newRankIdx = ChallengeManager.getRankIndex();
        if (newRankIdx > prevRankIdx) {
            if (!ChallengeManager.state.rankHistory) ChallengeManager.state.rankHistory = [];
            ChallengeManager.state.rankHistory.push({ rankIdx: newRankIdx, date: new Date().toISOString() });
            ChallengeManager.state.lastRankIdx = newRankIdx;
        }

        // force save manually since we're modifying state directly
        try { localStorage.setItem('scarygames_challenges_v2', JSON.stringify(ChallengeManager.state)); } catch (e) { }

        ChallengeManager.showNotification('Monthly Epic Claimed!', '+' + finalReward + ' CP', '🏆');
        animateCPCount();
        renderAll();
        renderMonthlyChallenge();
        renderRankTimeline();

        if (newRankIdx > prevRankIdx) {
            setTimeout(function () { showRankUpCinematic(newRankIdx); }, 600);
        }
    }

    function rerollMonthly() {
        if (ChallengeManager.rerollMonthlyChallenge()) {
            ChallengeAudio.reroll();
            var container = document.getElementById('monthly-container');
            if (container) {
                var card = container.querySelector('.monthly-card');
                if (card) {
                    card.classList.add('rerolling');
                    setTimeout(function () {
                        renderMonthlyChallenge();
                        observeCards();
                    }, 600);
                } else {
                    renderMonthlyChallenge();
                    observeCards();
                }
            }
            announce('Monthly challenge rerolled. ' + ChallengeManager.state.monthlyRerolls + ' monthly rerolls remaining.');
        } else {
            if (ChallengeManager.state.monthlyRerolls <= 0) {
                ChallengeManager.showNotification('No Monthly Rerolls', 'You\'ve used all your monthly rerolls for this month.', '🎲');
            }
        }
    }

    function claimChainStep(chainId, stepIdx) {
        if (ChallengeManager.claimChainStep(chainId, stepIdx)) {
            ChallengeAudio.claim();
            animateCPCount();
            renderAll();
            renderChallengeChains();
            renderRankTimeline();

            var cs = ChallengeManager.state.chains[chainId];
            var stepState = cs.steps[stepIdx];
            if (cs.completed) { showRitualCircle(ChallengeManager.getChainDef(chainId).title); }
            if (stepState._lastReward && stepState._lastReward.rankedUp) {
                setTimeout(function () { showRankUpCinematic(stepState._lastReward.newRankIdx); }, 600);
            }
            announce('Chain step claimed.');
        }
    }

    function acceptCursed() {
        if (ChallengeManager.acceptCursedChallenge()) {
            ChallengeAudio.cursedAccept();
            renderCursedChallenge();
            announce('Curse accepted. Complete the challenge before reset or lose CP.');
        }
    }

    function claimCursed() {
        if (ChallengeManager.claimCursedReward()) {
            ChallengeAudio.claim();
            animateCPCount();
            renderAll();
            renderCursedChallenge();
            renderRankTimeline();
            announce('Cursed challenge reward claimed!');

            var cursed = ChallengeManager.state.cursed;
            if (cursed._lastReward && cursed._lastReward.rankedUp) {
                setTimeout(function () { showRankUpCinematic(cursed._lastReward.newRankIdx); }, 600);
            }
        }
    }

    // ============ RANK-UP CINEMATIC (Phase 2 + Phase 5 Audio/Confetti) ============
    function showRankUpCinematic(newRankIdx) {
        var rank = ChallengeManager.getRankByIndex(newRankIdx);
        if (!rank) return;
        ChallengeAudio.rankUp();
        spawnDarkConfetti();
        var overlay = document.createElement('div');
        overlay.className = 'rankup-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Rank Up to ' + rank.title);
        overlay.innerHTML =
            '<div class="rankup-content">' +
            '<div class="rankup-flash"></div>' +
            '<div class="rankup-particles" id="rankup-particles"></div>' +
            '<div class="rankup-badge">' +
            '<div class="rankup-old-rank">' + (newRankIdx > 0 ? ChallengeManager.getRankByIndex(newRankIdx - 1).icon : '') + '</div>' +
            '<div class="rankup-arrow">⬆</div>' +
            '<div class="rankup-icon" style="--rank-color: ' + rank.color + '">' + rank.icon + '</div>' +
            '</div>' +
            '<div class="rankup-label">RANK UP!</div>' +
            '<div class="rankup-title" style="color: ' + rank.color + '">' + rank.title + '</div>' +
            '<div class="rankup-cp-req">' + rank.cp.toLocaleString() + ' CP Achieved</div>' +
            '<button class="rankup-dismiss" onclick="this.closest(\'.rankup-overlay\').remove()">CONTINUE</button></div>';
        document.body.appendChild(overlay);
        var particleContainer = document.getElementById('rankup-particles');
        if (particleContainer) {
            for (var i = 0; i < 40; i++) {
                var p = document.createElement('div');
                p.className = 'rankup-particle';
                p.style.setProperty('--rp-x', (Math.random() * 200 - 100) + 'px');
                p.style.setProperty('--rp-y', (Math.random() * -200 - 50) + 'px');
                p.style.setProperty('--rp-delay', (Math.random() * 0.5) + 's');
                p.style.setProperty('--rp-dur', (0.8 + Math.random() * 0.8) + 's');
                p.style.background = rank.color;
                particleContainer.appendChild(p);
            }
        }
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { overlay.classList.add('visible'); });
        });
        announce('Rank up! You are now ' + rank.title + '.');
        // Focus the dismiss button for accessibility
        var dismissBtn = overlay.querySelector('.rankup-dismiss');
        if (dismissBtn) setTimeout(function () { dismissBtn.focus(); }, 300);
        setTimeout(function () {
            if (overlay.parentNode) {
                overlay.classList.remove('visible');
                setTimeout(function () { overlay.remove(); }, 600);
            }
        }, 6000);
    }

    // ============ HERO EMBER PARTICLES ============
    function initHeroEmbers() {
        var container = document.getElementById('hero-embers');
        if (!container) return;
        for (var i = 0; i < 20; i++) {
            var ember = document.createElement('div');
            ember.className = 'ember';
            ember.style.left = Math.random() * 100 + '%';
            ember.style.bottom = '-10px';
            ember.style.setProperty('--dur', (4 + Math.random() * 6) + 's');
            ember.style.setProperty('--delay', (Math.random() * 8) + 's');
            ember.style.setProperty('--drift', (Math.random() * 40 - 20) + 'px');
            ember.style.width = (2 + Math.random() * 3) + 'px';
            ember.style.height = ember.style.width;
            ember.style.background = Math.random() > 0.5 ? 'var(--accent-red)' : '#ff6633';
            container.appendChild(ember);
        }
    }

    // ============ RESET COUNTDOWN ============
    function startResetCountdown() {
        var timerEl = document.getElementById('reset-timer');
        if (!timerEl) return;
        function update() {
            var now = new Date();
            var tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
            var diff = tomorrow - now;
            var h = Math.floor(diff / 3600000);
            var m = Math.floor((diff % 3600000) / 60000);
            var s = Math.floor((diff % 60000) / 1000);
            timerEl.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        }
        update();
        setInterval(update, 1000);
    }

    // ============ WEEKLY COUNTDOWN ============
    function startWeeklyCountdown() {
        var el = document.querySelector('.weekly-countdown-timer');
        if (!el) return;
        function update() {
            var now = new Date();
            var nextMon = new Date(now);
            nextMon.setDate(nextMon.getDate() + ((1 + 7 - nextMon.getDay()) % 7 || 7));
            nextMon.setHours(0, 0, 0, 0);
            var diff = nextMon - now;
            if (diff <= 0) { el.textContent = 'Resetting...'; return; }
            var days = Math.floor(diff / 86400000);
            var hours = Math.floor((diff % 86400000) / 3600000);
            el.textContent = days + 'd ' + hours + 'h';
        }
        update();
        setInterval(update, 60000);
    }

    // ============ COMPLETION BURST EFFECT ============
    function spawnCompletionBurst(cardEl) {
        var rect = cardEl.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var burst = document.createElement('div');
        burst.className = 'completion-burst';
        burst.style.left = cx + 'px';
        burst.style.top = cy + 'px';
        var colors = ['#cc1122', '#ff4444', '#ff8800', '#ffcc00', '#00ff88', '#8b5cf6'];
        for (var i = 0; i < 16; i++) {
            var p = document.createElement('div');
            p.className = 'burst-particle';
            var angle = (i / 16) * Math.PI * 2;
            var dist = 40 + Math.random() * 60;
            p.style.setProperty('--bx', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--by', Math.sin(angle) * dist + 'px');
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.width = (3 + Math.random() * 5) + 'px';
            p.style.height = p.style.width;
            burst.appendChild(p);
        }
        document.body.appendChild(burst);
        setTimeout(function () { burst.remove(); }, 1000);
    }

    // ============ CP COUNTER ANIMATION ============
    function animateCPCount() {
        var cpEl = document.getElementById('total-cp');
        if (!cpEl) return;
        var target = ChallengeManager.state.cp;
        var current = parseInt(cpEl.textContent.replace(/,/g, '')) || 0;
        if (current === target) return;
        var steps = 20;
        var step = 0;
        var diff = target - current;
        var interval = setInterval(function () {
            step++;
            var val = Math.round(current + (diff * (step / steps)));
            cpEl.textContent = val.toLocaleString();
            if (step >= steps) {
                cpEl.textContent = target.toLocaleString();
                clearInterval(interval);
            }
        }, 30);
    }

    // ============ PHASE 5C: DARK CONFETTI BURST ============
    function spawnDarkConfetti() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var container = document.createElement('div');
        container.className = 'dark-confetti-container';
        var colors = ['#cc1122', '#991122', '#ff4444', '#330000', '#8b5cf6', '#222'];
        var shapes = ['skull', 'square', 'circle', 'square', 'circle'];
        for (var i = 0; i < 50; i++) {
            var p = document.createElement('div');
            var shape = shapes[Math.floor(Math.random() * shapes.length)];
            p.className = 'dark-confetti ' + shape;
            if (shape === 'skull') p.textContent = '\ud83d\udc80';
            else p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.left = Math.random() * 100 + '%';
            p.style.setProperty('--cf-x', (Math.random() * 100 - 50) + 'px');
            p.style.setProperty('--cf-drift', (Math.random() * 60 - 30) + 'px');
            p.style.setProperty('--cf-rot', (Math.random() * 1080) + 'deg');
            p.style.setProperty('--cf-dur', (1.5 + Math.random() * 2) + 's');
            p.style.setProperty('--cf-delay', (Math.random() * 0.5) + 's');
            container.appendChild(p);
        }
        document.body.appendChild(container);
        setTimeout(function () { container.remove(); }, 4000);
    }

    // ============ PHASE 5C: LIGHTNING FLASH ============
    function triggerLightningFlash() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var flash = document.createElement('div');
        flash.className = 'lightning-flash';
        document.body.appendChild(flash);
        setTimeout(function () { flash.remove(); }, 200);
    }

    // ============ PHASE 5C: SCREEN SHAKE ============
    function triggerScreenShake() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var main = document.querySelector('.challenges-page') || document.body;
        main.classList.add('screen-shake');
        setTimeout(function () { main.classList.remove('screen-shake'); }, 500);
    }

    // ============ PHASE 5C: RITUAL CIRCLE (Chain Complete) ============
    function showRitualCircle(chainTitle) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var overlay = document.createElement('div');
        overlay.className = 'ritual-overlay';
        overlay.innerHTML =
            '<svg class="ritual-circle" viewBox="0 0 300 300">' +
            '<circle class="ritual-ring" cx="150" cy="150" r="130"/>' +
            '<polygon class="ritual-pentagram" points="150,20 270,220 40,100 260,100 30,220"/>' +
            '</svg>' +
            '<div class="ritual-text">RITUAL COMPLETE<br>' + (chainTitle || '') + '</div>';
        document.body.appendChild(overlay);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { overlay.classList.add('visible'); });
        });
        overlay.addEventListener('click', function () { overlay.remove(); });
        setTimeout(function () {
            if (overlay.parentNode) {
                overlay.classList.remove('visible');
                setTimeout(function () { overlay.remove(); }, 600);
            }
        }, 5000);
    }

    // ============ PHASE 5D: PARALLAX HERO SCROLL ============
    function initParallaxHero() {
        var hero = document.querySelector('.challenges-hero');
        if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(function () {
                    var scrollY = window.pageYOffset;
                    hero.style.backgroundPositionY = (scrollY * 0.3) + 'px';
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // ============ PHASE 5A: CARD HOVER SOUNDS ============
    function initCardHoverSounds() {
        var lastHover = 0;
        document.addEventListener('mouseover', function (e) {
            var card = e.target.closest('.challenge-card, .monthly-card, .cursed-card, .chain-card');
            if (card) {
                var now = Date.now();
                if (now - lastHover > 200) { // debounce
                    ChallengeAudio.hover();
                    lastHover = now;
                }
            }
        });
    }

    // ============ PHASE 6C: KEYBOARD SHORTCUTS ============
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', function (e) {
            // Don't handle shortcuts if in input/textarea or modal is open
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (document.querySelector('.shop-overlay, .rankup-overlay')) return;

            var key = e.key.toLowerCase();

            if (key === 'r') {
                // Reroll the first non-completed daily
                var state = ChallengeManager.state;
                for (var i = 0; i < state.active.length; i++) {
                    if (!state.active[i].completed && !state.active[i].claimed) {
                        reroll(i);
                        break;
                    }
                }
                e.preventDefault();
            } else if (key === 'c') {
                // Claim all available rewards
                var st = ChallengeManager.state;
                var claimed = false;
                st.active.forEach(function (c, i) {
                    if (c.completed && !c.claimed) { claim(i); claimed = true; }
                });
                if (st.weekly && st.weekly.completed && !st.weekly.claimed) { claim('weekly'); claimed = true; }
                if (!claimed) announce('No rewards available to claim.');
                e.preventDefault();
            } else if (key === 's') {
                openShop();
                e.preventDefault();
            } else if (key >= '1' && key <= '3') {
                var idx = parseInt(key) - 1;
                var cards = document.querySelectorAll('#daily-container .challenge-card');
                if (cards[idx]) {
                    cards[idx].focus();
                    cards[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                e.preventDefault();
            }
        });
    }

    // ============ PHASE 7A: LEADERBOARD RENDERING ============
    var currentLbSort = 'cp';

    function renderLeaderboard() {
        var container = document.getElementById('leaderboard-section');
        if (!container) return;
        var entries = ChallengeManager.getLeaderboard(currentLbSort);
        var sortTabs = [
            { key: 'cp', label: 'Total CP' },
            { key: 'streak', label: 'Streak' },
            { key: 'nightmares', label: 'Nightmares' },
            { key: 'weeklyCP', label: 'Weekly' }
        ];

        var tabsHtml = sortTabs.map(function (t) {
            return '<button class="lb-tab' + (currentLbSort === t.key ? ' active' : '') + '" data-sort="' + t.key + '">' + t.label + '</button>';
        }).join('');

        var rowsHtml = entries.slice(0, 15).map(function (e, i) {
            var pos = i + 1;
            var posClass = pos <= 3 ? ' lb-pos-' + pos : '';
            var rowClass = 'lb-row' + (e.isPlayer ? ' is-player' : '');
            var medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '#' + pos;
            return '<tr class="' + rowClass + '">' +
                '<td class="lb-pos' + posClass + '">' + medal + '</td>' +
                '<td><div class="lb-name"><span class="lb-icon">' + e.icon + '</span>' + e.name + '</div></td>' +
                '<td class="lb-value' + (currentLbSort === 'cp' ? ' highlight' : '') + '">' + e.cp.toLocaleString() + '</td>' +
                '<td class="lb-value' + (currentLbSort === 'streak' ? ' highlight' : '') + '">🔥 ' + e.streak + '</td>' +
                '<td class="lb-value' + (currentLbSort === 'nightmares' ? ' highlight' : '') + '">💀 ' + e.nightmares + '</td>' +
                '<td class="lb-value' + (currentLbSort === 'weeklyCP' ? ' highlight' : '') + '">⚡ ' + e.weeklyCP + '</td>' +
                '</tr>';
        }).join('');

        container.innerHTML =
            '<div class="lb-header">' +
            '<div class="lb-title">⚔️ Challenge Rankings</div>' +
            '<div class="lb-tabs">' + tabsHtml + '</div>' +
            '</div>' +
            '<table class="lb-table">' +
            '<thead><tr><th>Rank</th><th>Player</th><th>Total CP</th><th>Streak</th><th>Nightmares</th><th>Weekly</th></tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody></table>';

        container.querySelectorAll('.lb-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                currentLbSort = btn.getAttribute('data-sort');
                renderLeaderboard();
            });
        });
    }

    // ============ PHASE 7B: FRIENDS PANEL ============

    function renderFriendsPanel() {
        var container = document.getElementById('friends-section');
        if (!container) return;
        var friends = ChallengeManager.state.friends || [];

        var cardsHtml = friends.map(function (f, i) {
            var hasPending = !!f.pending;
            var btnHtml = '';
            if (hasPending) {
                var def = ChallengeManager.getChallengeDef(f.pending.challengeId);
                var chalName = def ? def.title : 'Challenge';
                btnHtml = '<div class="friend-pending-info" style="font-size:0.65rem;color:#fbbf24;margin-bottom:4px;">⚔️ ' + chalName + ' — ' + f.pending.bet + ' CP</div>' +
                    '<button class="friend-btn resolve" onclick="ChallengesUI.resolveDuel(' + i + ')">RESOLVE DUEL</button>';
            } else {
                btnHtml = '<button class="friend-btn" onclick="ChallengesUI.startDuel(' + i + ')">⚔️ CHALLENGE</button>';
            }
            return '<div class="friend-card' + (hasPending ? ' has-pending' : '') + '">' +
                '<div class="friend-avatar">' + f.icon + '</div>' +
                '<div class="friend-name">' + f.name + '</div>' +
                '<div class="friend-rivalry">' +
                '<span class="rivalry-wins">W: ' + f.rivalry.wins + '</span>' +
                '<span class="rivalry-losses">L: ' + f.rivalry.losses + '</span>' +
                '</div>' +
                btnHtml +
                '</div>';
        }).join('');

        container.innerHTML =
            '<div class="lb-header">' +
            '<div class="lb-title">👥 Rivals</div>' +
            '</div>' +
            '<div class="friends-grid">' + cardsHtml + '</div>';
    }

    function startDuel(friendIdx) {
        var result = ChallengeManager.challengeFriend(friendIdx, 50);
        if (result.ok) {
            ChallengeAudio.reroll();
            announce('Challenge sent to ' + result.friend.name + '!');
            renderFriendsPanel();
        } else {
            announce(result.reason);
        }
    }

    function resolveDuel(friendIdx) {
        // Simulate player score as random for demo
        var friend = ChallengeManager.state.friends[friendIdx];
        if (friend && friend.pending) {
            friend.pending.playerScore = Math.floor(Math.random() * friend.pending.friendScore * 1.5);
        }
        var result = ChallengeManager.resolveFriendChallenge(friendIdx);
        if (result) {
            if (result.won) {
                ChallengeAudio.claim();
                spawnDarkConfetti();
                announce('You won the duel against ' + result.friendName + '! +' + result.bet + ' CP');
            } else {
                ChallengeAudio.cursedAccept();
                triggerScreenShake();
                announce('You lost the duel against ' + result.friendName + '!');
            }
            renderFriendsPanel();
            renderRank();
        }
    }

    // ============ PHASE 7C: LIVE EVENTS ============
    var eventCountdownInterval = null;

    function renderEventBanner() {
        var container = document.getElementById('event-banner');
        if (!container) return;
        var evt = ChallengeManager.checkEventSchedule();
        if (!evt) {
            container.style.display = 'none';
            return;
        }
        container.style.display = '';
        container.className = 'event-banner theme-' + evt.theme;
        container.style.setProperty('--evt-color', evt.color);

        container.innerHTML =
            '<div class="event-banner-content">' +
            '<div class="event-icon">' + evt.icon + '</div>' +
            '<div class="event-info">' +
            '<div class="event-title" style="color:' + evt.color + '">' + evt.title + '</div>' +
            '<div class="event-desc">' + evt.desc + '</div>' +
            '<span class="event-multiplier">' + evt.cpMultiplier + '× CP ACTIVE</span>' +
            '</div>' +
            '<div class="event-timer-wrap">' +
            '<div class="event-timer-label">ENDS IN</div>' +
            '<div class="event-timer-value" id="event-countdown">--:--:--</div>' +
            '</div>' +
            '</div>';

        startEventCountdown(evt.endTime);
    }

    function startEventCountdown(endTimeISO) {
        if (eventCountdownInterval) clearInterval(eventCountdownInterval);
        var el = document.getElementById('event-countdown');
        if (!el) return;

        function update() {
            var now = new Date().getTime();
            var end = new Date(endTimeISO).getTime();
            var diff = end - now;
            if (diff <= 0) {
                el.textContent = 'ENDED';
                el.className = 'event-timer-value urgent';
                clearInterval(eventCountdownInterval);
                return;
            }
            var hrs = Math.floor(diff / 3600000);
            var mins = Math.floor((diff % 3600000) / 60000);
            var secs = Math.floor((diff % 60000) / 1000);
            el.textContent = String(hrs).padStart(2, '0') + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

            // Urgency colors
            if (diff < 1800000) { el.className = 'event-timer-value urgent'; }
            else if (diff < 7200000) { el.className = 'event-timer-value warning'; }
            else { el.className = 'event-timer-value safe'; }
        }

        update();
        eventCountdownInterval = setInterval(update, 1000);
    }

    function renderEventSection() {
        var container = document.getElementById('event-challenges-container');
        if (!container) return;
        var evtState = ChallengeManager.state.events.active;
        if (!evtState) {
            container.innerHTML = '';
            return;
        }
        var evtDef = ChallengeManager.getEventDef(evtState.id);
        if (!evtDef) { container.innerHTML = ''; return; }

        var cardsHtml = evtState.challenges.map(function (chal, i) {
            var chalDef = evtDef.challenges[i];
            if (!chalDef) return '';
            var pct = Math.min(100, Math.floor((chal.progress / chalDef.target) * 100));
            var reward = Math.round(chalDef.reward * (evtState.cpMultiplier || 1));
            var btnClass = chal.claimed ? 'claimed' : (chal.completed ? 'active' : 'locked');
            var btnText = chal.claimed ? '✓ CLAIMED' : (chal.completed ? 'CLAIM ' + reward + ' CP' : pct + '% — IN PROGRESS');
            var btnOnclick = chal.completed && !chal.claimed ? ' onclick="ChallengesUI.claimEvent(' + i + ')"' : '';

            return '<div class="event-card theme-' + evtState.theme + '">' +
                '<span class="evt-badge">EVENT</span>' +
                '<div class="evt-card-title">' + chalDef.title + '</div>' +
                '<div class="evt-card-desc">' + chalDef.desc + '</div>' +
                '<div class="evt-card-reward">💎 ' + reward + ' CP (' + evtState.cpMultiplier + '× bonus)</div>' +
                '<div class="evt-progress-bar"><div class="evt-progress-fill" style="width:' + pct + '%"></div></div>' +
                '<button class="evt-btn-claim ' + btnClass + '"' + btnOnclick + '>' + btnText + '</button>' +
                '</div>';
        }).join('');

        container.innerHTML = cardsHtml;
    }

    function claimEvent(chalIdx) {
        var ok = ChallengeManager.claimEventReward(chalIdx);
        if (ok) {
            ChallengeAudio.claim();
            spawnDarkConfetti();
            triggerLightningFlash();
            announce('Event reward claimed!');
            renderEventSection();
            renderRank();
        }
    }

    // ============ PHASE 7D: SHARE MODAL ============

    function openShareModal(challengeObj) {
        var data = ChallengeManager.generateShareData(challengeObj);
        if (!data) return;

        var overlay = document.createElement('div');
        overlay.className = 'share-modal-overlay';
        overlay.innerHTML =
            '<div class="share-modal">' +
            '<div style="font-size:1.2rem;font-weight:800;letter-spacing:2px;margin-bottom:4px;">SHARE ACHIEVEMENT</div>' +
            '<div class="share-preview">' +
            '<div class="share-preview-title">✓ ' + data.title + '</div>' +
            '<div class="share-preview-game">' + (GAME_ICONS[data.game] || '🎮') + ' ' + getGameName(data.game) + ' · ' + data.difficulty.toUpperCase() + '</div>' +
            '<div class="share-preview-rank" style="color:' + data.rankColor + '">' + data.rankIcon + ' ' + data.rank + '</div>' +
            '<div class="share-preview-stats">' +
            '<div class="share-preview-stat"><div class="share-preview-stat-value">💎 ' + data.reward + '</div>CP Earned</div>' +
            '<div class="share-preview-stat"><div class="share-preview-stat-value">' + data.cp.toLocaleString() + '</div>Total CP</div>' +
            '<div class="share-preview-stat"><div class="share-preview-stat-value">🔥 ' + data.streak + '</div>Streak</div>' +
            '</div>' +
            '<div class="share-branding">ScaryGamesAI · ' + data.date + '</div>' +
            '</div>' +
            '<div class="share-actions">' +
            '<button class="share-btn" id="share-copy-btn">📋 COPY TEXT</button>' +
            '<button class="share-btn primary" id="share-close-btn">CLOSE</button>' +
            '</div>' +
            '</div>';

        document.body.appendChild(overlay);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { overlay.classList.add('visible'); });
        });

        overlay.querySelector('#share-close-btn').addEventListener('click', function () {
            overlay.classList.remove('visible');
            setTimeout(function () { overlay.remove(); }, 300);
        });

        overlay.querySelector('#share-copy-btn').addEventListener('click', function () {
            var text = '🏆 I completed "' + data.title + '" on ScaryGamesAI!\n' +
                data.rankIcon + ' Rank: ' + data.rank + '\n' +
                '💎 ' + data.reward + ' CP earned | 🔥 ' + data.streak + '-day streak\n' +
                '#ScaryGamesAI #HorrorGaming';
            navigator.clipboard.writeText(text).then(function () {
                announce('Copied to clipboard!');
                ChallengeManager.showNotification('Copied!', 'Share text copied to clipboard', '📋');
            });
        });

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                overlay.classList.remove('visible');
                setTimeout(function () { overlay.remove(); }, 300);
            }
        });
    }

    // ============ PHASE 7E: EVENT ARCHIVE ============

    function renderEventArchive() {
        var container = document.getElementById('event-archive');
        if (!container) return;
        var archive = ChallengeManager.state.events.archive || [];
        if (archive.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#555;padding:20px;font-size:0.8rem;">No past events yet. The darkness awaits...</div>';
            return;
        }

        var html = archive.map(function (evt) {
            var allClaimed = evt.challenges.every(function (c) { return c.claimed; });
            var badgeClass = allClaimed ? 'completed' : 'missed';
            var badgeText = allClaimed ? '✓ COMPLETED' : 'MISSED';
            var startDate = new Date(evt.startTime).toLocaleDateString();
            return '<div class="archive-card">' +
                '<div class="archive-icon">' + evt.icon + '</div>' +
                '<div class="archive-title">' + evt.title + '</div>' +
                '<div class="archive-date">' + startDate + '</div>' +
                '<span class="archive-badge ' + badgeClass + '">' + badgeText + '</span>' +
                '</div>';
        }).join('');

        container.innerHTML = html;
    }

    // ============ PHASE 7F: NOTIFICATION SETTINGS ============

    function renderNotificationSettings() {
        var container = document.getElementById('notification-settings');
        if (!container) return;
        var notif = ChallengeManager.state.notifications || {};

        var rows = [
            { key: 'enabled', label: '🔔 Push Notifications' },
            { key: 'streakReminder', label: '🔥 Streak Expiry Warnings' },
            { key: 'eventAlert', label: '🎃 Event Start Alerts' }
        ];

        var html = rows.map(function (r) {
            var on = !!notif[r.key];
            return '<div class="notif-row">' +
                '<span class="notif-label">' + r.label + '</span>' +
                '<button class="notif-toggle' + (on ? ' on' : '') + '" data-key="' + r.key + '" aria-label="Toggle ' + r.label + '"></button>' +
                '</div>';
        }).join('');

        container.innerHTML =
            '<div style="font-size:0.85rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">⚙️ Notifications</div>' +
            html;

        container.querySelectorAll('.notif-toggle').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var key = btn.getAttribute('data-key');
                var isOn = btn.classList.contains('on');
                ChallengeManager.toggleNotifications(key, !isOn);
                btn.classList.toggle('on');
                announce((isOn ? 'Disabled' : 'Enabled') + ' ' + key + ' notifications');
            });
        });
    }

    // ============ SHARE BUTTON INJECTION (add to completed challenge cards) ============

    function addShareButtons() {
        document.querySelectorAll('.challenge-card.claimed').forEach(function (card, i) {
            if (card.querySelector('.share-icon-btn')) return; // already added
            var btn = document.createElement('button');
            btn.className = 'share-icon-btn';
            btn.innerHTML = '📤';
            btn.title = 'Share this achievement';
            btn.style.cssText = 'position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:4px 8px;font-size:0.8rem;cursor:pointer;transition:all 0.2s;z-index:2;';
            btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(204,17,34,0.2)'; btn.style.borderColor = '#cc1122'; });
            btn.addEventListener('mouseleave', function () { btn.style.background = 'rgba(255,255,255,0.06)'; btn.style.borderColor = 'rgba(255,255,255,0.1)'; });
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var st = ChallengeManager.state;
                var challengeObj = st.active[i] || st.weekly;
                if (challengeObj) openShareModal(challengeObj);
            });
            card.style.position = 'relative';
            card.appendChild(btn);
        });
    }

    // ============ EXPORT ============
    window.ChallengesUI = {
        init: init,
        render: renderAll,
        reroll: reroll,
        claim: claim,
        claimMonthly: claimMonthly,
        claimChainStep: claimChainStep,
        acceptCursed: acceptCursed,
        claimCursed: claimCursed,
        openShop: openShop,
        announce: announce,
        // Phase 7
        startDuel: startDuel,
        resolveDuel: resolveDuel,
        claimEvent: claimEvent,
        openShareModal: openShareModal,
        rerollMonthly: rerollMonthly,
    };

    document.addEventListener('DOMContentLoaded', init);

})();

