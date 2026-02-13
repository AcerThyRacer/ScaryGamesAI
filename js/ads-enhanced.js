/**
 * ScaryGamesAI - Enhanced Watch-to-Earn Ads System
 * Features:
 * - Interactive ads (answer a question): 50 coins
 * - Choose-your-reward: souls, coins, or gem dust
 * - Ad streaks: 5 ads in a row = 2x bonus on 5th
 * - Daily ad chest: after 10 ads, unlock random chest
 */

var AdsEnhanced = (function() {
    'use strict';

    var API_BASE = '/api/ads';
    var STORAGE_KEY = 'sgai_ads_enhanced';

    // State
    var status = null;
    var currentSession = null;
    var isInitialized = false;

    // Reward types
    var REWARD_TYPES = {
        coins: { icon: '🪙', name: 'Horror Coins', description: 'Spend in the seasonal store' },
        souls: { icon: '👻', name: 'Souls', description: 'Free currency for cosmetics' },
        gem_dust: { icon: '✨', name: 'Gem Dust', description: 'Collect to convert to Blood Gems' }
    };

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    function init() {
        if (isInitialized) return;
        isInitialized = true;

        loadCachedStatus();
        injectStyles();

        // Pre-fetch status if user is logged in
        if (isLoggedIn()) {
            fetchStatus().catch(function() {});
        }

        console.log('[AdsEnhanced] Initialized');
    }

    function isLoggedIn() {
        return localStorage.getItem('sgai_token') || localStorage.getItem('token');
    }

    function getAuthHeaders() {
        var token = localStorage.getItem('sgai_token') || localStorage.getItem('token');
        var headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        return headers;
    }

    function generateIdempotencyKey() {
        return 'ads_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ═══════════════════════════════════════════════════════════════
    // API CALLS
    // ═══════════════════════════════════════════════════════════════

    function fetchStatus() {
        return fetch(API_BASE + '/status', {
            method: 'GET',
            headers: getAuthHeaders()
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                status = data;
                saveCachedStatus();
            }
            return data;
        });
    }

    function startAd(placementKey, options) {
        options = options || {};
        var idempotencyKey = generateIdempotencyKey();
        var rewardType = options.rewardType || 'coins';
        var isInteractive = options.isInteractive || false;

        return fetch(API_BASE + '/start', {
            method: 'POST',
            headers: Object.assign({}, getAuthHeaders(), {
                'idempotency-key': idempotencyKey
            }),
            body: JSON.stringify({
                placementKey: placementKey,
                rewardType: rewardType,
                isInteractive: isInteractive,
                idempotencyKey: idempotencyKey
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                currentSession = {
                    sessionId: data.sessionId,
                    nonce: data.nonce,
                    reward: data.reward,
                    startTime: Date.now(),
                    interactive: data.interactive || null,
                    rewardType: rewardType
                };
            }
            return data;
        });
    }

    function completeAd(interactiveAnswer) {
        if (!currentSession) {
            return Promise.reject(new Error('No active ad session'));
        }

        var idempotencyKey = generateIdempotencyKey();

        return fetch(API_BASE + '/complete', {
            method: 'POST',
            headers: Object.assign({}, getAuthHeaders(), {
                'idempotency-key': idempotencyKey
            }),
            body: JSON.stringify({
                sessionId: currentSession.sessionId,
                nonce: currentSession.nonce,
                interactiveAnswer: interactiveAnswer,
                idempotencyKey: idempotencyKey
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                // Show notification
                showAdCompleteNotification(data);

                // Check for streak bonus
                if (data.isStreakBonus) {
                    showStreakBonusNotification(data);
                }

                // Check for chest availability
                if (data.chestAvailable) {
                    showChestAvailableNotification();
                }

                // Update status
                status = status || {};
                status.completedToday = data.adsWatchedToday;

                // Dispatch event
                document.dispatchEvent(new CustomEvent('adCompleted', {
                    detail: data
                }));
            }
            currentSession = null;
            return data;
        });
    }

    function claimDailyChest() {
        var idempotencyKey = generateIdempotencyKey();

        return fetch(API_BASE + '/claim-chest', {
            method: 'POST',
            headers: Object.assign({}, getAuthHeaders(), {
                'idempotency-key': idempotencyKey
            }),
            body: JSON.stringify({
                idempotencyKey: idempotencyKey
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                showChestOpenAnimation(data);

                // Update status
                if (status && status.chest) {
                    status.chest.claimedToday = true;
                    status.chest.available = false;
                }

                // Dispatch event
                document.dispatchEvent(new CustomEvent('chestClaimed', {
                    detail: data
                }));
            }
            return data;
        });
    }

    function getRewardTypes() {
        return fetch(API_BASE + '/reward-types', {
            method: 'GET',
            headers: getAuthHeaders()
        })
        .then(function(res) { return res.json(); });
    }

    // ═══════════════════════════════════════════════════════════════
    // UI HELPERS
    // ═══════════════════════════════════════════════════════════════

    function showRewardSelector(callback) {
        var overlay = document.createElement('div');
        overlay.className = 'ads-reward-selector-overlay';

        var optionsHtml = Object.keys(REWARD_TYPES).map(function(type) {
            var info = REWARD_TYPES[type];
            return '<button class="ads-reward-option" data-type="' + type + '">' +
                '<span class="ads-reward-icon">' + info.icon + '</span>' +
                '<span class="ads-reward-name">' + info.name + '</span>' +
                '<span class="ads-reward-desc">' + info.description + '</span>' +
                '</button>';
        }).join('');

        overlay.innerHTML =
            '<div class="ads-reward-selector">' +
            '<h3>Choose Your Reward</h3>' +
            '<p>Select what you want to earn from this ad:</p>' +
            '<div class="ads-reward-options">' + optionsHtml + '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(function() {
            overlay.classList.add('ads-show');
        });

        // Handle clicks
        overlay.querySelectorAll('.ads-reward-option').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var type = this.getAttribute('data-type');
                overlay.classList.remove('ads-show');
                setTimeout(function() {
                    overlay.remove();
                }, 300);
                if (callback) callback(type);
            });
        });
    }

    function showInteractiveQuestion(question, callback) {
        var overlay = document.createElement('div');
        overlay.className = 'ads-interactive-overlay';

        var optionsHtml = question.options.map(function(opt, idx) {
            return '<button class="ads-interactive-option" data-index="' + idx + '">' + opt + '</button>';
        }).join('');

        overlay.innerHTML =
            '<div class="ads-interactive-modal">' +
            '<div class="ads-interactive-header">' +
            '<span class="ads-interactive-icon">❓</span>' +
            '<h3>Quick Question!</h3>' +
            '<p class="ads-interactive-bonus">Answer correctly for bonus rewards!</p>' +
            '</div>' +
            '<div class="ads-interactive-question">' + question.question + '</div>' +
            '<div class="ads-interactive-options">' + optionsHtml + '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(function() {
            overlay.classList.add('ads-show');
        });

        // Handle clicks
        overlay.querySelectorAll('.ads-interactive-option').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var index = parseInt(this.getAttribute('data-index'), 10);
                overlay.classList.remove('ads-show');
                setTimeout(function() {
                    overlay.remove();
                }, 300);
                if (callback) callback(index);
            });
        });
    }

    function showAdCompleteNotification(data) {
        var notification = document.createElement('div');
        notification.className = 'ads-notification ads-reward';

        var rewardIcon = REWARD_TYPES[data.reward.type]?.icon || '🪙';
        var rewardName = REWARD_TYPES[data.reward.type]?.name || 'Coins';

        notification.innerHTML =
            '<div class="ads-notification-icon">' + rewardIcon + '</div>' +
            '<div class="ads-notification-content">' +
            '<div class="ads-notification-title">+' + data.reward.amount + ' ' + rewardName + '</div>' +
            (data.reward.streakBonus > 0 ? 
                '<div class="ads-notification-bonus">🔥 Streak Bonus: +' + data.reward.streakBonus + '</div>' : '') +
            '</div>';

        document.body.appendChild(notification);

        requestAnimationFrame(function() {
            notification.classList.add('ads-show');
        });

        setTimeout(function() {
            notification.classList.remove('ads-show');
            setTimeout(function() {
                notification.remove();
            }, 300);
        }, 2500);
    }

    function showStreakBonusNotification(data) {
        var notification = document.createElement('div');
        notification.className = 'ads-notification ads-streak';

        notification.innerHTML =
            '<div class="ads-notification-icon">🔥</div>' +
            '<div class="ads-notification-content">' +
            '<div class="ads-notification-title">5x Streak Complete!</div>' +
            '<div class="ads-notification-desc">2x bonus applied!</div>' +
            '</div>';

        document.body.appendChild(notification);

        requestAnimationFrame(function() {
            notification.classList.add('ads-show');
        });

        setTimeout(function() {
            notification.classList.remove('ads-show');
            setTimeout(function() {
                notification.remove();
            }, 300);
        }, 3000);
    }

    function showChestAvailableNotification() {
        var notification = document.createElement('div');
        notification.className = 'ads-notification ads-chest-available';

        notification.innerHTML =
            '<div class="ads-notification-icon">🎁</div>' +
            '<div class="ads-notification-content">' +
            '<div class="ads-notification-title">Daily Chest Ready!</div>' +
            '<div class="ads-notification-desc">You watched 10 ads!</div>' +
            '<button class="ads-chest-claim-btn">Claim Chest</button>' +
            '</div>';

        document.body.appendChild(notification);

        var btn = notification.querySelector('.ads-chest-claim-btn');
        btn.addEventListener('click', function() {
            notification.remove();
            claimDailyChest();
        });

        requestAnimationFrame(function() {
            notification.classList.add('ads-show');
        });
    }

    function showChestOpenAnimation(data) {
        var overlay = document.createElement('div');
        overlay.className = 'ads-chest-overlay';

        var rewardsHtml = '';
        if (data.rewards) {
            if (data.rewards.coins) {
                rewardsHtml += '<div class="ads-chest-reward"><span class="ads-chest-icon">🪙</span> +' + data.rewards.coins + ' Coins</div>';
            }
            if (data.rewards.souls) {
                rewardsHtml += '<div class="ads-chest-reward"><span class="ads-chest-icon">👻</span> +' + data.rewards.souls + ' Souls</div>';
            }
            if (data.rewards.blood_gems) {
                rewardsHtml += '<div class="ads-chest-reward"><span class="ads-chest-icon">💎</span> +' + data.rewards.blood_gems + ' Blood Gems</div>';
            }
        }

        var rarityClass = 'ads-chest-' + data.chestType;

        overlay.innerHTML =
            '<div class="ads-chest-modal ' + rarityClass + '">' +
            '<div class="ads-chest-box">' +
            '<div class="ads-chest-emoji">🎁</div>' +
            '</div>' +
            '<h2 class="ads-chest-title">' + data.chestType.toUpperCase() + ' CHEST!</h2>' +
            '<div class="ads-chest-rewards">' + rewardsHtml + '</div>' +
            '<button class="ads-chest-close">Awesome!</button>' +
            '</div>';

        document.body.appendChild(overlay);

        var closeBtn = overlay.querySelector('.ads-chest-close');
        closeBtn.addEventListener('click', function() {
            overlay.classList.remove('ads-show');
            setTimeout(function() {
                overlay.remove();
            }, 300);
        });

        // Animate
        requestAnimationFrame(function() {
            overlay.classList.add('ads-show');
            setTimeout(function() {
                overlay.querySelector('.ads-chest-box').classList.add('ads-open');
            }, 500);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // LOCAL STORAGE
    // ═══════════════════════════════════════════════════════════════

    function loadCachedStatus() {
        try {
            var cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                status = JSON.parse(cached);
            }
        } catch (e) {
            status = null;
        }
    }

    function saveCachedStatus() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
        } catch (e) {}
    }

    // ═══════════════════════════════════════════════════════════════
    // CONVENIENCE METHODS
    // ═══════════════════════════════════════════════════════════════

    function watchAd(placementKey, options) {
        options = options || {};

        return new Promise(function(resolve, reject) {
            // Show reward selector if choose-your-reward mode
            if (options.chooseReward) {
                showRewardSelector(function(rewardType) {
                    options.rewardType = rewardType;
                    proceedWithAd(placementKey, options, resolve, reject);
                });
            } else {
                proceedWithAd(placementKey, options, resolve, reject);
            }
        });
    }

    function proceedWithAd(placementKey, options, resolve, reject) {
        startAd(placementKey, options)
            .then(function(data) {
                if (!data.success) {
                    reject(data);
                    return;
                }

                // Simulate ad watching (in production, this would be actual ad display)
                var adDuration = options.duration || 20000; // 20 seconds minimum

                setTimeout(function() {
                    // Check if interactive ad
                    if (currentSession && currentSession.interactive) {
                        showInteractiveQuestion(currentSession.interactive, function(answerIndex) {
                            completeAd(answerIndex).then(resolve).catch(reject);
                        });
                    } else {
                        completeAd().then(resolve).catch(reject);
                    }
                }, adDuration);
            })
            .catch(reject);
    }

    function getStreakProgress() {
        if (!status || !status.streak) return { current: 0, target: 5, percent: 0 };
        return {
            current: status.streak.current,
            target: status.streak.target,
            percent: (status.streak.current / status.streak.target) * 100,
            nextBonus: status.streak.nextStreakBonus,
            multiplier: status.streak.multiplier
        };
    }

    function getChestProgress() {
        if (!status || !status.chest) return { adsWatched: 0, threshold: 10, percent: 0, available: false };
        return {
            adsWatched: status.chest.adsWatched,
            threshold: status.chest.threshold,
            percent: (status.chest.adsWatched / status.chest.threshold) * 100,
            available: status.chest.available,
            claimedToday: status.chest.claimedToday
        };
    }

    function getRemainingAds() {
        if (!status) return 20;
        return status.remainingToday || 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════════════════════════

    function injectStyles() {
        if (document.getElementById('ads-enhanced-styles')) return;

        var style = document.createElement('style');
        style.id = 'ads-enhanced-styles';
        style.textContent = [
            // Notifications
            '.ads-notification {',
            '    position: fixed;',
            '    top: 20px;',
            '    right: 20px;',
            '    padding: 16px 24px;',
            '    border-radius: 12px;',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 12px;',
            '    z-index: 10000;',
            '    transform: translateX(150%);',
            '    transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);',
            '    font-family: Inter, sans-serif;',
            '}',
            '.ads-notification.ads-show {',
            '    transform: translateX(0);',
            '}',
            '.ads-notification.ads-reward {',
            '    background: linear-gradient(135deg, rgba(0, 255, 136, 0.9), rgba(0, 200, 100, 0.9));',
            '    color: #000;',
            '}',
            '.ads-notification.ads-streak {',
            '    background: linear-gradient(135deg, rgba(255, 100, 0, 0.9), rgba(255, 50, 0, 0.9));',
            '    color: #fff;',
            '}',
            '.ads-notification.ads-chest-available {',
            '    background: linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 180, 0, 0.95));',
            '    color: #000;',
            '}',
            '.ads-notification-icon {',
            '    font-size: 32px;',
            '}',
            '.ads-notification-title {',
            '    font-size: 1.1rem;',
            '    font-weight: 700;',
            '}',
            '.ads-notification-desc {',
            '    font-size: 0.85rem;',
            '    opacity: 0.8;',
            '}',
            '.ads-notification-bonus {',
            '    font-size: 0.9rem;',
            '    color: #ff6600;',
            '    font-weight: 600;',
            '}',
            '.ads-chest-claim-btn {',
            '    margin-top: 8px;',
            '    padding: 8px 16px;',
            '    background: #000;',
            '    color: #ffd700;',
            '    border: none;',
            '    border-radius: 6px;',
            '    cursor: pointer;',
            '    font-weight: 600;',
            '}',

            // Reward Selector
            '.ads-reward-selector-overlay {',
            '    position: fixed;',
            '    inset: 0;',
            '    background: rgba(0, 0, 0, 0.85);',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    z-index: 10000;',
            '    opacity: 0;',
            '    transition: opacity 0.3s;',
            '}',
            '.ads-reward-selector-overlay.ads-show {',
            '    opacity: 1;',
            '}',
            '.ads-reward-selector {',
            '    background: linear-gradient(135deg, rgba(30, 20, 50, 0.98), rgba(15, 10, 30, 0.98));',
            '    border: 2px solid rgba(139, 92, 246, 0.5);',
            '    border-radius: 20px;',
            '    padding: 30px;',
            '    text-align: center;',
            '    max-width: 400px;',
            '}',
            '.ads-reward-selector h3 {',
            '    font-family: Creepster, cursive;',
            '    font-size: 1.8rem;',
            '    color: #fff;',
            '    margin-bottom: 8px;',
            '}',
            '.ads-reward-selector p {',
            '    color: #aaa;',
            '    margin-bottom: 20px;',
            '}',
            '.ads-reward-options {',
            '    display: flex;',
            '    flex-direction: column;',
            '    gap: 12px;',
            '}',
            '.ads-reward-option {',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 16px;',
            '    padding: 16px;',
            '    background: rgba(255, 255, 255, 0.05);',
            '    border: 1px solid rgba(255, 255, 255, 0.1);',
            '    border-radius: 12px;',
            '    cursor: pointer;',
            '    transition: all 0.2s;',
            '    color: #fff;',
            '    text-align: left;',
            '}',
            '.ads-reward-option:hover {',
            '    background: rgba(139, 92, 246, 0.2);',
            '    border-color: rgba(139, 92, 246, 0.5);',
            '}',
            '.ads-reward-icon {',
            '    font-size: 32px;',
            '}',
            '.ads-reward-name {',
            '    font-size: 1.1rem;',
            '    font-weight: 600;',
            '}',
            '.ads-reward-desc {',
            '    font-size: 0.85rem;',
            '    color: #888;',
            '    margin-left: auto;',
            '}',

            // Interactive Question
            '.ads-interactive-overlay {',
            '    position: fixed;',
            '    inset: 0;',
            '    background: rgba(0, 0, 0, 0.9);',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    z-index: 10000;',
            '    opacity: 0;',
            '    transition: opacity 0.3s;',
            '}',
            '.ads-interactive-overlay.ads-show {',
            '    opacity: 1;',
            '}',
            '.ads-interactive-modal {',
            '    background: linear-gradient(135deg, rgba(50, 30, 70, 0.98), rgba(25, 15, 40, 0.98));',
            '    border: 2px solid rgba(255, 215, 0, 0.5);',
            '    border-radius: 20px;',
            '    padding: 30px;',
            '    text-align: center;',
            '    max-width: 450px;',
            '}',
            '.ads-interactive-icon {',
            '    font-size: 48px;',
            '    display: block;',
            '    margin-bottom: 12px;',
            '}',
            '.ads-interactive-modal h3 {',
            '    font-family: Creepster, cursive;',
            '    font-size: 1.8rem;',
            '    color: #ffd700;',
            '    margin-bottom: 8px;',
            '}',
            '.ads-interactive-bonus {',
            '    color: #00ff88;',
            '    font-size: 0.9rem;',
            '    margin-bottom: 20px;',
            '}',
            '.ads-interactive-question {',
            '    font-size: 1.1rem;',
            '    color: #fff;',
            '    margin-bottom: 20px;',
            '    padding: 16px;',
            '    background: rgba(255, 255, 255, 0.05);',
            '    border-radius: 12px;',
            '}',
            '.ads-interactive-options {',
            '    display: grid;',
            '    grid-template-columns: 1fr 1fr;',
            '    gap: 10px;',
            '}',
            '.ads-interactive-option {',
            '    padding: 14px;',
            '    background: rgba(255, 255, 255, 0.08);',
            '    border: 1px solid rgba(255, 255, 255, 0.15);',
            '    border-radius: 10px;',
            '    color: #fff;',
            '    cursor: pointer;',
            '    transition: all 0.2s;',
            '    font-size: 0.95rem;',
            '}',
            '.ads-interactive-option:hover {',
            '    background: rgba(255, 215, 0, 0.2);',
            '    border-color: rgba(255, 215, 0, 0.5);',
            '}',

            // Chest Animation
            '.ads-chest-overlay {',
            '    position: fixed;',
            '    inset: 0;',
            '    background: rgba(0, 0, 0, 0.95);',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    z-index: 10000;',
            '    opacity: 0;',
            '    transition: opacity 0.3s;',
            '}',
            '.ads-chest-overlay.ads-show {',
            '    opacity: 1;',
            '}',
            '.ads-chest-modal {',
            '    text-align: center;',
            '    padding: 40px;',
            '}',
            '.ads-chest-box {',
            '    font-size: 100px;',
            '    animation: ads-chest-shake 0.5s ease-in-out infinite;',
            '}',
            '.ads-chest-box.ads-open {',
            '    animation: ads-chest-open 0.5s ease-out forwards;',
            '}',
            '@keyframes ads-chest-shake {',
            '    0%, 100% { transform: rotate(-5deg); }',
            '    50% { transform: rotate(5deg); }',
            '}',
            '@keyframes ads-chest-open {',
            '    0% { transform: scale(1); }',
            '    50% { transform: scale(1.3); }',
            '    100% { transform: scale(1); }',
            '}',
            '.ads-chest-title {',
            '    font-family: Creepster, cursive;',
            '    font-size: 2.5rem;',
            '    color: #ffd700;',
            '    margin: 20px 0;',
            '    text-shadow: 0 0 30px rgba(255, 215, 0, 0.5);',
            '}',
            '.ads-chest-rewards {',
            '    display: flex;',
            '    flex-direction: column;',
            '    gap: 12px;',
            '    margin-bottom: 24px;',
            '}',
            '.ads-chest-reward {',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    gap: 10px;',
            '    padding: 12px 24px;',
            '    background: rgba(255, 255, 255, 0.1);',
            '    border-radius: 10px;',
            '    font-size: 1.2rem;',
            '    color: #fff;',
            '}',
            '.ads-chest-icon {',
            '    font-size: 1.5rem;',
            '}',
            '.ads-chest-close {',
            '    padding: 14px 40px;',
            '    background: linear-gradient(135deg, #ffd700, #ff8c00);',
            '    border: none;',
            '    border-radius: 10px;',
            '    color: #000;',
            '    font-size: 1.1rem;',
            '    font-weight: 700;',
            '    cursor: pointer;',
            '}',
            '.ads-chest-common .ads-chest-title { color: #aaa; }',
            '.ads-chest-uncommon .ads-chest-title { color: #4ade80; }',
            '.ads-chest-rare .ads-chest-title { color: #60a5fa; }',
            '.ads-chest-epic .ads-chest-title { color: #c084fc; }',
            '.ads-chest-legendary .ads-chest-title { color: #ffd700; text-shadow: 0 0 50px rgba(255, 215, 0, 0.8); }',

            // Responsive
            '@media (max-width: 600px) {',
            '    .ads-interactive-options { grid-template-columns: 1fr; }',
            '    .ads-reward-desc { display: none; }',
            '}'
        ].join('\n');

        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        init: init,
        fetchStatus: fetchStatus,
        watchAd: watchAd,
        claimDailyChest: claimDailyChest,
        getStreakProgress: getStreakProgress,
        getChestProgress: getChestProgress,
        getRemainingAds: getRemainingAds,

        // Low-level API
        startAd: startAd,
        completeAd: completeAd,

        // Constants
        REWARD_TYPES: REWARD_TYPES,

        version: '2.0.0'
    };
})();

// Export for global access
window.AdsEnhanced = AdsEnhanced;
