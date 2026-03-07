/**
 * ============================================
 * ZOMBIE HORDE - PHASE 7-8 PROGRESSION
 * ============================================
 */

(function(global) {
    'use strict';

    const ProgressionZombieHorde = {
        integration: null,
        gameId: 'zombie-horde',
        sessionStats: null,

        async init(options = {}) {
            this.integration = options.integration || new Phase78Integration();
            if (!options.integration) await this.integration.init(options);
            console.log('[ZombieHorde Progression] Ready');
        },

        setIntegration(integration) { this.integration = integration; },

        onGameStart(gameState) {
            this.sessionStats = { startTime: Date.now(), kills: 0, wave: 0, bossesDefeated: 0 };
            this.integration.startGame(this.gameId);
        },

        onGameEnd(gameState) {
            this.integration.endGame(this.gameId);
            this.integration.saveGame(this.gameId, {
                maxWave: gameState.wave,
                totalKills: gameState.totalKills,
                bossesDefeated: gameState.bossesDefeated,
                turretsPlaced: gameState.turretsPlaced
            });
        },

        onWaveComplete(wave, gameState) {
            this.sessionStats.wave = wave;
            this.integration.trackProgress(this.gameId, { wave: 1 });
            this.integration.progression?.addXP(this.gameId, wave * 20, 'waveComplete');
        },

        onZombieKill(zombie, gameState) {
            if (!this.sessionStats) return;
            this.sessionStats.kills++;
            this.integration.trackProgress(this.gameId, { kills: 1 });
            
            if (zombie.isBoss) {
                this.onBossDefeated(gameState);
            }
        },

        onBossDefeated(gameState) {
            if (!this.sessionStats) return;
            this.sessionStats.bossesDefeated++;
            this.integration.trackProgress(this.gameId, { bossesDefeated: 1 });
            this.integration.progression?.addXP(this.gameId, 200, 'bossKill');
            this.integration.unlock('features', 'zombie_horde_boss_slayer');
        },

        onTurretPlaced(turret) {
            this.integration.trackProgress(this.gameId, { turretsPlaced: 1 });
        },

        onBaseDamage(amount) {
            this.integration.trackProgress(this.gameId, { damageTaken: amount });
        },

        getSessionStats() { return this.sessionStats || {}; },
        getPlayerStats() { return this.integration.getGameSummary(this.gameId); },
        getAchievements() { return this.integration.getAchievements(this.gameId); },
        getChallenges() { return this.integration.getCurrentChallenges(); }
    };

    global.ProgressionZombieHorde = ProgressionZombieHorde;

})(typeof window !== 'undefined' ? window : this);
