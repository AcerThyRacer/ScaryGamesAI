/**
 * ScaryGamesAI - First-Time Bonuses System
 * Frontend module for claiming and displaying first-time bonus rewards
 */

var FirstTimeBonuses = (function() {
    'use strict';

    var STORAGE_KEY = 'sgai_first_time_bonuses';
    var API_BASE = '/api/first-time-bonuses';
    
    // Cache of bonus status
    var bonusStatus = null;
    var isInitialized = false;

    // Bonus configuration (mirrors server)
    var BONUS_CONFIG = {
        first_game_played: { souls: 500, description: 'First game played!' },
        first_win_per_game: { souls: 1000, bloodGems: 10, description: 'First win!' },
        first_referral: { bloodGems: 500, description: 'First friend referred!' },
        first_marketplace_sale: { bloodGems: 100, description: 'First marketplace sale!' },
        first_purchase: { bloodGems: 50, description: 'First store purchase!' },
        first_achievement: { souls: 250, bloodGems: 5, description: 'First achievement!' },
        first_perfect_run: { souls: 2000, bloodGems: 25, description: 'First perfect run!' },
        first_boss_kill: { souls: 750, bloodGems: 15, description: 'First boss defeated!' },
        first_daily_challenge: { souls: 300, horrorCoins: 25, description: 'First daily challenge!' },
        first_prestige: { bloodGems: 100, description: 'First prestige!' }
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

        console.log('[FirstTimeBonuses] Initialized');
    }

    function isLoggedIn() {
        return localStorage.getItem('sgai_token') || localStorage.getItem('token');
    }

    function getAuthHeaders() {
        var token = localStorage.getItem('sgai_token') || localStorage.getItem('token');
        return token ? { 'Authorization': 'Bearer ' + token } : {};
    }

    function generateIdempotencyKey() {
        return 'ftb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ═══════════════════════════════════════════════════════════════
    // API CALLS
    // ═══════════════════════════════════════════════════════════════

    function fetchStatus() {
        return fetch(API_BASE + '/status', {
            method: 'GET',
            headers: Object.assign({}, getAuthHeaders(), { 'Content-Type': 'application/json' })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                bonusStatus = data.bonuses;
                saveCachedStatus();
            }
            return data;
        });
    }

    function checkBonuses(triggerType, gameId, options) {
        options = options || {};
        
        return fetch(API_BASE + '/check', {
            method: 'POST',
            headers: Object.assign({}, getAuthHeaders(), {
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({
                triggerType: triggerType,
                gameId: gameId || null,
                isWin: options.isWin || false,
                isPerfectRun: options.isPerfectRun || false
            })
        })
        .then(function(res) { return res.json(); });
    }

    function claimBonus(bonusType, gameId) {
        var idempotencyKey = generateIdempotencyKey();
        
        return fetch(API_BASE + '/claim', {
            method: 'POST',
            headers: Object.assign({}, getAuthHeaders(), {
                'Content-Type': 'application/json',
                'idempotency-key': idempotencyKey
            }),
            body: JSON.stringify({
                bonusType: bonusType,
                gameId: gameId || null,
                idempotencyKey: idempotencyKey
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                // Update local cache
                updateLocalClaimedStatus(bonusType, gameId);
                
                // Show celebration
                showBonusClaimedNotification(data);
                
                // Dispatch event
                document.dispatchEvent(new CustomEvent('firstTimeBonusClaimed', {
                    detail: data
                }));
            }
            return data;
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // AUTO-CLAIM LOGIC
    // ═══════════════════════════════════════════════════════════════

    function checkAndClaimEligible(triggerType, gameId, options) {
        options = options || {};
        
        return checkBonuses(triggerType, gameId, options)
            .then(function(data) {
                if (!data.success || !data.eligibleBonuses || data.eligibleBonuses.length === 0) {
                    return { claimed: [] };
                }

                // Claim all eligible bonuses
                var claimPromises = data.eligibleBonuses.map(function(bonus) {
                    return claimBonus(bonus.type, bonus.gameId);
                });

                return Promise.all(claimPromises)
                    .then(function(results) {
                        return {
                            claimed: results.filter(function(r) { return r.success; }),
                            failed: results.filter(function(r) { return !r.success; })
                        };
                    });
            });
    }

    // ═══════════════════════════════════════════════════════════════
    // GAME INTEGRATION HELPERS
    // ═══════════════════════════════════════════════════════════════

    function onGameComplete(gameId, stats) {
        stats = stats || {};
        
        return checkAndClaimEligible('game_complete', gameId, {
            isWin: stats.isWin || false,
            isPerfectRun: stats.isPerfectRun || false
        });
    }

    function onReferralConverted() {
        return checkAndClaimEligible('referral_converted');
    }

    function onMarketplaceSale() {
        return checkAndClaimEligible('marketplace_sale');
    }

    function onPurchase() {
        return checkAndClaimEligible('purchase');
    }

    function onAchievement() {
        return checkAndClaimEligible('achievement');
    }

    function onBossKill() {
        return checkAndClaimEligible('boss_kill');
    }

    function onDailyChallenge() {
        return checkAndClaimEligible('daily_challenge');
    }

    function onPrestige() {
        return checkAndClaimEligible('prestige');
    }

    // ═══════════════════════════════════════════════════════════════
    // LOCAL STORAGE
    // ═══════════════════════════════════════════════════════════════

    function loadCachedStatus() {
        try {
            var cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                bonusStatus = JSON.parse(cached);
            }
        } catch (e) {
            bonusStatus = null;
        }
    }

    function saveCachedStatus() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(bonusStatus));
        } catch (e) {}
    }

    function updateLocalClaimedStatus(bonusType, gameId) {
        if (!bonusStatus) bonusStatus = {};
        
        var key = bonusType;
        if (bonusType === 'first_win_per_game' && gameId) {
            if (!bonusStatus[bonusType]) {
                bonusStatus[bonusType] = { claimedGames: [] };
            }
            if (bonusStatus[bonusType].claimedGames) {
                bonusStatus[bonusType].claimedGames.push(gameId);
            }
        } else {
            bonusStatus[bonusType] = bonusStatus[bonusType] || {};
            bonusStatus[bonusType].claimed = true;
            bonusStatus[bonusType].claimedAt = new Date().toISOString();
        }
        
        saveCachedStatus();
    }

    function isBonusClaimed(bonusType, gameId) {
        if (!bonusStatus || !bonusStatus[bonusType]) return false;
        
        if (bonusType === 'first_win_per_game' && gameId) {
            return bonusStatus[bonusType].claimedGames &&
                   bonusStatus[bonusType].claimedGames.indexOf(gameId) >= 0;
        }
        
        return bonusStatus[bonusType].claimed === true;
    }

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════

    function showBonusClaimedNotification(data) {
        var notification = document.createElement('div');
        notification.className = 'ftb-notification';

        var rewardsHtml = '';
        if (data.rewards) {
            if (data.rewards.souls > 0) {
                rewardsHtml += '<span class="ftb-reward"><span class="ftb-icon">👻</span> +' + data.rewards.souls + ' Souls</span>';
            }
            if (data.rewards.bloodGems > 0) {
                rewardsHtml += '<span class="ftb-reward"><span class="ftb-icon">💎</span> +' + data.rewards.bloodGems + ' Blood Gems</span>';
            }
            if (data.rewards.horrorCoins > 0) {
                rewardsHtml += '<span class="ftb-reward"><span class="ftb-icon">🪙</span> +' + data.rewards.horrorCoins + ' Coins</span>';
            }
        }

        notification.innerHTML = 
            '<div class="ftb-notification-content">' +
            '<div class="ftb-notification-icon">🎉</div>' +
            '<div class="ftb-notification-text">' +
            '<div class="ftb-notification-title">First-Time Bonus!</div>' +
            '<div class="ftb-notification-desc">' + (data.description || 'Bonus claimed!') + '</div>' +
            '<div class="ftb-notification-rewards">' + rewardsHtml + '</div>' +
            '</div>' +
            '</div>';

        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(function() {
            notification.classList.add('ftb-show');
        });

        // Auto dismiss
        setTimeout(function() {
            notification.classList.remove('ftb-show');
            setTimeout(function() {
                notification.remove();
            }, 500);
        }, 5000);
    }

    // ═══════════════════════════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════════════════════════

    function injectStyles() {
        if (document.getElementById('ftb-styles')) return;

        var style = document.createElement('style');
        style.id = 'ftb-styles';
        style.textContent = [
            '.ftb-notification {',
            '    position: fixed;',
            '    top: 50%;',
            '    left: 50%;',
            '    transform: translate(-50%, -50%) scale(0.8);',
            '    z-index: 10000;',
            '    opacity: 0;',
            '    pointer-events: none;',
            '    transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);',
            '}',
            '.ftb-notification.ftb-show {',
            '    opacity: 1;',
            '    transform: translate(-50%, -50%) scale(1);',
            '}',
            '.ftb-notification-content {',
            '    background: linear-gradient(135deg, rgba(30, 20, 50, 0.98), rgba(15, 10, 30, 0.98));',
            '    border: 2px solid rgba(255, 215, 0, 0.6);',
            '    border-radius: 20px;',
            '    padding: 30px 40px;',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 20px;',
            '    box-shadow: 0 20px 60px rgba(255, 215, 0, 0.3), 0 0 100px rgba(255, 215, 0, 0.2);',
            '    animation: ftb-glow 2s ease-in-out infinite alternate;',
            '}',
            '@keyframes ftb-glow {',
            '    from { box-shadow: 0 20px 60px rgba(255, 215, 0, 0.3), 0 0 100px rgba(255, 215, 0, 0.2); }',
            '    to { box-shadow: 0 20px 80px rgba(255, 215, 0, 0.5), 0 0 120px rgba(255, 215, 0, 0.3); }',
            '}',
            '.ftb-notification-icon {',
            '    font-size: 64px;',
            '    animation: ftb-bounce 0.6s ease-in-out infinite alternate;',
            '}',
            '@keyframes ftb-bounce {',
            '    from { transform: scale(1) rotate(-5deg); }',
            '    to { transform: scale(1.1) rotate(5deg); }',
            '}',
            '.ftb-notification-text {',
            '    text-align: left;',
            '}',
            '.ftb-notification-title {',
            '    font-family: Creepster, cursive;',
            '    font-size: 1.8rem;',
            '    color: #ffd700;',
            '    margin-bottom: 8px;',
            '    text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);',
            '}',
            '.ftb-notification-desc {',
            '    font-size: 1rem;',
            '    color: #ccc;',
            '    margin-bottom: 12px;',
            '}',
            '.ftb-notification-rewards {',
            '    display: flex;',
            '    gap: 12px;',
            '    flex-wrap: wrap;',
            '}',
            '.ftb-reward {',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 6px;',
            '    padding: 8px 14px;',
            '    background: rgba(255, 255, 255, 0.1);',
            '    border-radius: 8px;',
            '    font-weight: 600;',
            '    color: #fff;',
            '}',
            '.ftb-icon {',
            '    font-size: 1.2rem;',
            '}',
            '@media (max-width: 600px) {',
            '    .ftb-notification-content {',
            '        flex-direction: column;',
            '        text-align: center;',
            '        padding: 20px 30px;',
            '    }',
            '    .ftb-notification-text {',
            '        text-align: center;',
            '    }',
            '    .ftb-notification-rewards {',
            '        justify-content: center;',
            '    }',
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
        checkBonuses: checkBonuses,
        claimBonus: claimBonus,
        checkAndClaimEligible: checkAndClaimEligible,
        isBonusClaimed: isBonusClaimed,
        
        // Game integration helpers
        onGameComplete: onGameComplete,
        onReferralConverted: onReferralConverted,
        onMarketplaceSale: onMarketplaceSale,
        onPurchase: onPurchase,
        onAchievement: onAchievement,
        onBossKill: onBossKill,
        onDailyChallenge: onDailyChallenge,
        onPrestige: onPrestige,

        // Constants
        BONUS_CONFIG: BONUS_CONFIG,

        version: '1.0.0'
    };
})();

// Export for global access
window.FirstTimeBonuses = FirstTimeBonuses;
