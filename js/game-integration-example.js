/**
 * ScaryGamesAI — Game Integration Guide
 * This file demonstrates how to integrate the new Universal Game System
 * and Cross-Game Mechanics into any game.
 * 
 * Copy this pattern into your game's main JS file.
 */

/* ============================================
   INTEGRATION EXAMPLE FOR ANY GAME
   ============================================ */

(function() {
    'use strict';

    // ========== GAME CONFIGURATION ==========
    var GAME_ID = 'your-game-id'; // Must match a key in UniversalGameSystem.games
    var GAME_NAME = 'Your Game Name';

    // ========== GAME STATE ==========
    var gameState = {
        score: 0,
        health: 100,
        lives: 3,
        level: 1,
        kills: 0,
        itemsCollected: 0,
        secretsFound: 0,
        distanceTraveled: 0,
        damageDealt: 0,
        isVictory: false
    };

    // ========== INTEGRATION SETUP ==========

    /**
     * Call this when your game starts
     */
    function initGame() {
        // Initialize GameUtils with game ID
        GameUtils.initGame(GAME_ID, {
            onResume: onResume,
            onRestart: restartGame,
            onQuit: quitToMenu
        });

        // Get gameplay modifiers from skills, pets, skins
        var modifiers = GameUtils.getGameplayModifiers();
        applyModifiers(modifiers);

        // Start session tracking
        if (typeof UniversalGameSystem !== 'undefined') {
            UniversalGameSystem.stats.recordEvent('game_start', { game: GAME_ID });
        }

        // Start replay recording (optional)
        if (typeof UniversalGameSystem !== 'undefined') {
            UniversalGameSystem.replays.startRecording(GAME_ID, {
                score: 0,
                level: 1
            });
        }

        console.log('Game initialized with modifiers:', modifiers);
    }

    /**
     * Apply skill/pet/skin modifiers to your game
     */
    function applyModifiers(modifiers) {
        // Damage bonus from skills
        if (modifiers.damageBonus) {
            // Multiply your damage by (1 + modifiers.damageBonus)
            gameState.damageMultiplier = 1 + modifiers.damageBonus;
        }

        // Health bonus from skills
        if (modifiers.healthBonus) {
            gameState.maxHealth = 100 * (1 + modifiers.healthBonus);
            gameState.health = gameState.maxHealth;
        }

        // Speed bonus from skills
        if (modifiers.speedBonus) {
            gameState.playerSpeed = 5 * (1 + modifiers.speedBonus);
        }

        // Critical hit chance from skills
        if (modifiers.critChance) {
            gameState.critChance = modifiers.critChance;
        }

        // Item find bonus from skills/pets
        if (modifiers.itemFindBonus || modifiers.findChance) {
            gameState.itemFindChance = 0.1 + (modifiers.itemFindBonus || 0) + (modifiers.findChance || 0);
        }

        // Soul bonus from skills
        if (modifiers.soulBonus) {
            gameState.soulMultiplier = 1 + modifiers.soulBonus;
        }

        // Pet abilities
        if (modifiers.findItems) {
            // Pet will help find items - implement visual indicator
            gameState.petItemFinder = true;
        }

        if (modifiers.canRevive) {
            // Phoenix pet can revive player once
            gameState.canRevive = true;
            gameState.reviveHealth = modifiers.reviveHealth;
        }

        // Skin effects
        if (modifiers.transparency) {
            gameState.playerTransparency = modifiers.transparency;
        }

        if (modifiers.trail) {
            gameState.playerTrail = modifiers.trail;
        }
    }

    // ========== EVENT TRACKING EXAMPLES ==========

    /**
     * Track when player kills an enemy
     */
    function onEnemyKilled(enemy) {
        gameState.kills++;

        // Record the event
        GameUtils.recordEvent('kill', {
            enemyType: enemy.type,
            level: gameState.level
        });

        // Update score
        var baseScore = enemy.scoreValue || 10;
        var critMultiplier = 1;

        // Check for critical hit
        if (gameState.critChance && Math.random() < gameState.critChance) {
            critMultiplier = 2;
            GameUtils.recordEvent('critical', {});
        }

        // Apply damage multiplier
        var scoreGain = Math.floor(baseScore * critMultiplier * (gameState.damageMultiplier || 1));
        gameState.score += scoreGain;

        // Record score event
        GameUtils.recordEvent('score', { score: gameState.score });

        // Blood splatter effect (if enabled)
        if (GameUtils.getSettings().screenShake) {
            GameUtils.spawnBloodSplatter(enemy.x, enemy.y, 20);
        }
    }

    /**
     * Track when player takes damage
     */
    function onPlayerDamage(amount, source) {
        // Pet damage absorption (Cursed Doll)
        if (gameState.damageAbsorb && Math.random() < gameState.damageAbsorb) {
            amount = Math.floor(amount * (1 - gameState.damageAbsorb));
        }

        // Apply damage
        var actualDamage = Math.max(1, amount);
        gameState.health -= actualDamage;

        // Record the event
        GameUtils.recordEvent('damage_taken', {
            amount: actualDamage,
            source: source
        });

        // Visual effects
        GameUtils.onPlayerDamage(0.5);
        if (GameUtils.getSettings().screenShake) {
            GameUtils.shakeScreen(10, 200);
        }

        // Check for death
        if (gameState.health <= 0) {
            onPlayerDeath();
        }
    }

    /**
     * Track when player dies
     */
    function onPlayerDeath() {
        gameState.lives--;

        // Record death
        GameUtils.recordEvent('death', {
            level: gameState.level,
            score: gameState.score
        });

        // Visual effects
        GameUtils.onPlayerDeath();

        // Check for revival (Phoenix pet)
        if (gameState.canRevive && gameState.lives > 0) {
            gameState.health = gameState.maxHealth * gameState.reviveHealth;
            gameState.canRevive = false; // One-time use
            GameUtils.showNotification('Phoenix revived you!', 'success');
            return;
        }

        if (gameState.lives <= 0) {
            gameOver(false);
        }
    }

    /**
     * Track item collection
     */
    function onItemCollected(item) {
        gameState.itemsCollected++;

        // Record the event
        GameUtils.recordEvent('item_collect', {
            itemType: item.type,
            rarity: item.rarity
        });

        // Pet bonus: extra items
        if (gameState.petItemFinder && Math.random() < (gameState.findChance || 0)) {
            // Give extra item
            giveExtraItem(item);
        }
    }

    /**
     * Track secret found
     */
    function onSecretFound(secret) {
        gameState.secretsFound++;

        // Record the event
        GameUtils.recordEvent('secret_found', {
            secretId: secret.id
        });

        // Visual feedback
        GameUtils.showNotification('Secret found!', 'success');
    }

    /**
     * Track distance traveled (for endless runners, etc.)
     */
    function updateDistance(delta) {
        gameState.distanceTraveled += delta;

        // Record periodically (every 100m)
        if (Math.floor(gameState.distanceTraveled / 100) > Math.floor((gameState.distanceTraveled - delta) / 100)) {
            GameUtils.recordEvent('distance', { distance: gameState.distanceTraveled });
        }
    }

    /**
     * Track score changes
     */
    function updateScore(points) {
        var multiplier = 1;

        // Apply soul bonus from skills (converts to score)
        if (gameState.soulMultiplier) {
            multiplier = gameState.soulMultiplier;
        }

        gameState.score += Math.floor(points * multiplier);

        // Record significant score milestones
        if (gameState.score >= 1000 && gameState.score - points < 1000) {
            GameUtils.showNotification('Score: 1,000!', 'success');
        }
    }

    // ========== GAME FLOW ==========

    /**
     * Called when game ends (win or lose)
     */
    function gameOver(victory) {
        gameState.isVictory = victory;

        // Stop replay recording
        var replay = null;
        if (typeof UniversalGameSystem !== 'undefined') {
            replay = UniversalGameSystem.replays.stopRecording({
                score: gameState.score,
                deathCount: 3 - gameState.lives,
                isHighScore: isHighScore(gameState.score)
            });
        }

        // End session and get stats
        var session = GameUtils.endGame({
            isVictory: victory,
            score: gameState.score
        });

        // Show game over screen
        showGameOverScreen(victory, session);
    }

    function isHighScore(score) {
        if (typeof UniversalGameSystem !== 'undefined') {
            var stats = UniversalGameSystem.stats.getGameStats(GAME_ID);
            return score > stats.highScore;
        }
        return false;
    }

    function showGameOverScreen(victory, session) {
        var overlay = document.createElement('div');
        overlay.className = 'game-over-overlay';

        var currencyEarned = { souls: 0, bloodGems: 0 };
        if (typeof CrossGameMechanics !== 'undefined' && session) {
            currencyEarned = CrossGameMechanics.currency.calculateEarnings(GAME_ID, session, victory);
        }

        overlay.innerHTML =
            '<div class="game-over-content">' +
            '<h1>' + (victory ? '🏆 Victory!' : '💀 Game Over') + '</h1>' +
            '<div class="game-over-stats">' +
            '<div class="stat"><span>Score</span><span>' + GameUtils.formatNumber(gameState.score) + '</span></div>' +
            '<div class="stat"><span>Kills</span><span>' + gameState.kills + '</span></div>' +
            '<div class="stat"><span>Items</span><span>' + gameState.itemsCollected + '</span></div>' +
            '<div class="stat"><span>Secrets</span><span>' + gameState.secretsFound + '</span></div>' +
            '</div>' +
            '<div class="game-over-rewards">' +
            '<div class="reward"><span>👻 Souls</span><span>+' + currencyEarned.souls + '</span></div>' +
            (currencyEarned.bloodGems > 0 ? '<div class="reward blood"><span>💎 Blood Gems</span><span>+' + currencyEarned.bloodGems + '</span></div>' : '') +
            '</div>' +
            '<div class="game-over-buttons">' +
            '<button onclick="restartGame()">Play Again</button>' +
            '<button onclick="quitToMenu()">Main Menu</button>' +
            '<button onclick="shareScore()">Share</button>' +
            '</div>' +
            '</div>';

        document.body.appendChild(overlay);
    }

    // ========== PAUSE/RESUME HANDLERS ==========

    function onResume() {
        // Called when game resumes from pause
        // Resume game loop, sounds, etc.
        resumeGameLoop();
    }

    function restartGame() {
        // Reset game state
        gameState = {
            score: 0,
            health: 100,
            lives: 3,
            level: 1,
            kills: 0,
            itemsCollected: 0,
            secretsFound: 0,
            distanceTraveled: 0,
            damageDealt: 0,
            isVictory: false
        };

        // Remove game over screen if present
        var overlay = document.querySelector('.game-over-overlay');
        if (overlay) overlay.remove();

        // Re-initialize
        initGame();
        startGameLoop();
    }

    function quitToMenu() {
        // End session without victory
        GameUtils.endGame({ isVictory: false });

        // Navigate to games page
        window.location.href = '/games.html';
    }

    function shareScore() {
        // Screenshot + share
        if (typeof UniversalGameSystem !== 'undefined') {
            UniversalGameSystem.media.screenshot();
            // Could also integrate with social sharing
        }
    }

    // ========== PLACEHOLDER FUNCTIONS ==========

    function resumeGameLoop() { /* Implement based on your game */ }
    function startGameLoop() { /* Implement based on your game */ }
    function giveExtraItem(item) { /* Implement based on your game */ }

    // ========== EXPORTS FOR DEBUGGING ==========
    window.GAME_DEBUG = {
        state: gameState,
        addCurrency: function(souls, gems) {
            if (typeof CrossGameMechanics !== 'undefined') {
                if (souls) CrossGameMechanics.addCurrency('souls', souls, 'debug');
                if (gems) CrossGameMechanics.addCurrency('bloodGems', gems, 'debug');
            }
        },
        unlockAchievement: function(id) {
            if (typeof UniversalGameSystem !== 'undefined') {
                UniversalGameSystem.achievements.unlockAchievement(id);
            }
        },
        grantPet: function(id) {
            if (typeof CrossGameMechanics !== 'undefined') {
                CrossGameMechanics.pets.grant(id, 'debug');
            }
        },
        grantSkin: function(category, id) {
            if (typeof CrossGameMechanics !== 'undefined') {
                CrossGameMechanics.skins.grant(category, id, 'debug');
            }
        },
        addSkillPoints: function(amount) {
            if (typeof CrossGameMechanics !== 'undefined') {
                CrossGameMechanics.skills.addPoints(amount);
            }
        }
    };

})();
