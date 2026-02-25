/**
 * PHASE 5: COOPERATIVE & ASYMMETRIC GAME MODES
 * Full co-op (2-4 players) and asymmetric (1 Pac-Man vs survivors)
 */

var CooperativeGameModes = (function() {
    'use strict';

    var config = {
        // Game modes
        modes: {
            COOP_SURVIVAL: 'coop_survival',
            COOP_SPEEDRUN: 'coop_speedrun',
            ASYMMETRIC: 'asymmetric',
            COMPETITIVE: 'competitive'
        },
        
        // Co-op settings
        coop: {
            sharedLives: true,
            reviveEnabled: true,
            reviveTime: 5, // seconds
            sharedPellets: false,
            cooperativeAbilities: true
        },
        
        // Asymmetric settings
        asymmetric: {
            pacManAbilities: ['wall_smash', 'teleport', 'spawn_minion', 'sonar'],
            survivorAbilities: ['hide', 'distract', 'barricade', 'heal'],
            pacManWinCondition: 'eliminate_all',
            survivorWinCondition: 'collect_all_pellets'
        }
    };

    var state = {
        mode: null,
        gamePhase: 'lobby', // lobby, playing, ended
        teams: {},
        sharedResources: {
            lives: 3,
            pellets: 0,
            abilities: {}
        },
        objectives: [],
        timers: {}
    };

    /**
     * Initialize cooperative game modes
     */
    function init(mode) {
        state.mode = mode;
        state.gamePhase = 'lobby';
        
        console.log('[CooperativeGameModes] Initialized mode:', mode);
        
        switch (mode) {
            case config.modes.COOP_SURVIVAL:
                setupCoopSurvival();
                break;
            case config.modes.COOP_SPEEDRUN:
                setupCoopSpeedrun();
                break;
            case config.modes.ASYMMETRIC:
                setupAsymmetric();
                break;
            case config.modes.COMPETITIVE:
                setupCompetitive();
                break;
        }
    }

    /**
     * Setup co-op survival mode
     */
    function setupCoopSurvival() {
        state.sharedResources.lives = 3 + Math.floor(Math.random() * 2); // 3-4 lives
        state.objectives = [
            { type: 'collect_pellets', target: 100, current: 0 },
            { type: 'survive_time', target: 600, current: 0 } // 10 minutes
        ];
        
        console.log('[CoopSurvival] Setup with', state.sharedResources.lives, 'shared lives');
    }

    /**
     * Setup co-op speedrun mode
     */
    function setupCoopSpeedrun() {
        state.sharedResources.lives = 1; // One life only
        state.objectives = [
            { type: 'collect_pellets', target: 50, current: 0, timed: true }
        ];
        
        // Start timer
        state.timers.speedrun = Date.now();
        
        console.log('[CoopSpeedrun] Setup - Speed to collect all pellets!');
    }

    /**
     * Setup asymmetric mode
     */
    function setupAsymmetric() {
        state.teams = {
            pacman: { players: [], score: 0 },
            survivors: { players: [], score: 0 }
        };
        
        state.objectives = {
            pacman: { type: 'eliminate_survivors', remaining: 0 },
            survivors: { type: 'collect_pellets_and_escape', collected: 0, escaped: 0 }
        };
        
        console.log('[Asymmetric] Setup - 1 Pac-Man vs Survivors');
    }

    /**
     * Setup competitive mode
     */
    function setupCompetitive() {
        state.teams = {};
        state.objectives = [
            { type: 'most_pellets', timeLimit: 300 } // 5 minutes
        ];
        
        console.log('[Competitive] Setup - Last man standing');
    }

    /**
     * Add player to team
     */
    function addPlayerToTeam(playerId, team) {
        if (!state.teams[team]) {
            state.teams[team] = { players: [] };
        }
        
        state.teams[team].players.push(playerId);
        
        // Assign team-specific abilities
        assignTeamAbilities(playerId, team);
        
        console.log('[CooperativeGameModes] Player', playerId, 'joined team', team);
    }

    /**
     * Assign abilities based on team
     */
    function assignTeamAbilities(playerId, team) {
        var abilities = [];
        
        switch (team) {
            case 'survivors':
                abilities = ['flashlight', 'sprint', 'hide', 'revive'];
                break;
            case 'pacman':
                abilities = ['wall_smash', 'sonar', 'speed_boost'];
                break;
            default:
                abilities = ['flashlight', 'sprint'];
        }
        
        state.sharedResources.abilities[playerId] = abilities;
    }

    /**
     * Player downed - can be revived
     */
    function playerDowned(playerId) {
        if (state.mode === config.modes.ASYMMETRIC) {
            // In asymmetric, downed = eliminated
            playerEliminated(playerId);
            return;
        }
        
        // Start revive timer
        var reviveTime = config.coop.reviveTime;
        
        console.log('[Coop] Player', playerId, 'downed! Revive in', reviveTime, 'seconds');
        
        state.timers['revive_' + playerId] = setTimeout(function() {
            // If not revived in time, eliminate
            if (isPlayerDowned(playerId)) {
                playerEliminated(playerId);
            }
        }, reviveTime * 1000);
        
        // Notify other players
        broadcastReviveRequest(playerId);
    }

    /**
     * Check if player is downed
     */
    function isPlayerDowned(playerId) {
        return state.timers['revive_' + playerId] !== undefined;
    }

    /**
     * Revive downed player
     */
    function revivePlayer(reviverId, downedId) {
        if (!state.timers['revive_' + downedId]) return false;
        
        clearTimeout(state.timers['revive_' + downedId]);
        delete state.timers['revive_' + downedId];
        
        console.log('[Coop] Player', reviverId, 'revived', downedId);
        
        // Grant bonus for successful revive
        grantTeamBonus(reviverId, 'successful_revive');
        
        return true;
    }

    /**
     * Player eliminated
     */
    function playerEliminated(playerId) {
        console.log('[CooperativeGameModes] Player', playerId, 'eliminated');
        
        // Remove from team
        for (var team in state.teams) {
            var index = state.teams[team].players.indexOf(playerId);
            if (index !== -1) {
                state.teams[team].players.splice(index, 1);
            }
        }
        
        // Check win condition
        checkWinCondition();
    }

    /**
     * Use shared life
     */
    function useSharedLife() {
        if (state.sharedResources.lives > 0) {
            state.sharedResources.lives--;
            console.log('[Coop] Shared life used. Remaining:', state.sharedResources.lives);
            
            if (state.sharedResources.lives <= 0) {
                console.log('[Coop] No more shared lives!');
            }
            
            return true;
        }
        return false;
    }

    /**
     * Collect pellet (co-op)
     */
    function collectPellet(playerId, value) {
        if (config.coop.sharedPellets) {
            state.sharedResources.pellets += value;
        } else {
            // Individual tracking would be in player stats
        }
        
        // Update objective progress
        updateObjectiveProgress('collect_pellets', value);
    }

    /**
     * Update objective progress
     */
    function updateObjectiveProgress(objectiveType, amount) {
        for (var i = 0; i < state.objectives.length; i++) {
            var obj = state.objectives[i];
            if (obj.type === objectiveType) {
                obj.current += amount;
                
                if (obj.current >= obj.target) {
                    onObjectiveCompleted(obj);
                }
            }
        }
    }

    /**
     * Objective completed
     */
    function onObjectiveCompleted(objective) {
        console.log('[CooperativeGameModes] Objective completed:', objective);
        
        // Grant rewards
        grantTeamRewards(objective);
        
        // Check win condition
        checkWinCondition();
    }

    /**
     * Check win condition
     */
    function checkWinCondition() {
        var winner = null;
        
        switch (state.mode) {
            case config.modes.COOP_SURVIVAL:
                // Win if all objectives complete
                var allComplete = state.objectives.every(function(obj) {
                    return obj.current >= obj.target;
                });
                if (allComplete) {
                    winner = 'survivors';
                }
                break;
                
            case config.modes.ASYMMETRIC:
                // Check if all survivors eliminated
                var survivorsAlive = state.teams.survivors.players.length;
                if (survivorsAlive === 0) {
                    winner = 'pacman';
                }
                // Check if survivors escaped
                else if (state.objectives.survivors.escaped >= survivorsAlive) {
                    winner = 'survivors';
                }
                break;
        }
        
        if (winner) {
            endGame(winner);
        }
    }

    /**
     * End game
     */
    function endGame(winner) {
        state.gamePhase = 'ended';
        
        console.log('[CooperativeGameModes] Game Over! Winner:', winner);
        
        // Calculate rewards
        var rewards = calculateEndGameRewards(winner);
        
        // Distribute rewards
        distributeRewards(rewards);
    }

    /**
     * Calculate end game rewards
     */
    function calculateEndGameRewards(winner) {
        var rewards = {
            essence: 0,
            xp: 0,
            unlocks: []
        };
        
        // Base rewards
        if (winner === 'survivors') {
            rewards.essence = 100;
            rewards.xp = 50;
        } else {
            rewards.essence = 80;
            rewards.xp = 40;
        }
        
        // Bonus for performance
        rewards.essence += state.sharedResources.pellets;
        
        return rewards;
    }

    /**
     * Distribute rewards to players
     */
    function distributeRewards(rewards) {
        console.log('[CooperativeGameModes] Distributing rewards:', rewards);
        
        // Would integrate with progression system
        if (typeof RoguelikeMode !== 'undefined') {
            // Add rewards to all players
        }
    }

    /**
     * Grant team bonus
     */
    function grantTeamBonus(playerId, reason) {
        console.log('[CooperativeGameModes] Team bonus for', playerId, ':', reason);
        
        // Small XP/essence bonus
        if (typeof RoguelikeMode !== 'undefined') {
            // Grant bonus
        }
    }

    /**
     * Broadcast revive request to teammates
     */
    function broadcastReviveRequest(downedId) {
        if (typeof MultiplayerNetwork !== 'undefined') {
            MultiplayerNetwork.sendGameAction('REVIVE_REQUEST', {
                downedPlayer: downedId,
                location: getDownedLocation(downedId)
            });
        }
    }

    /**
     * Get downed player location
     */
    function getDownedLocation(playerId) {
        // Would return player position when downed
        return { x: 0, y: 0, z: 0 };
    }

    /**
     * Get current game state
     */
    function getGameState() {
        return {
            mode: state.mode,
            phase: state.gamePhase,
            teams: state.teams,
            sharedResources: state.sharedResources,
            objectives: state.objectives,
            timers: Object.keys(state.timers).length
        };
    }

    // Public API
    return {
        init: init,
        addPlayerToTeam: addPlayerToTeam,
        playerDowned: playerDowned,
        revivePlayer: revivePlayer,
        useSharedLife: useSharedLife,
        collectPellet: collectPellet,
        getGameState: getGameState,
        config: config,
        state: state
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.CooperativeGameModes = CooperativeGameModes;
}

console.log('[CooperativeGameModes] Module loaded - Co-op & Asymmetric ready');
