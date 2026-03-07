/**
 * ============================================
 * PROGRESSION MODULES FOR ALL GAMES
 * ============================================
 * Phase 7-8 progression integration for remaining games
 */

(function(global) {
    'use strict';

    // ============================================
    // RITUAL CIRCLE PROGRESSION
    // ============================================

    const ProgressionRitualCircle = {
        integration: null,
        gameId: 'ritual-circle',
        sessionStats: null,

        async init(options = {}) {
            this.integration = options.integration || new Phase78Integration();
            if (!options.integration) await this.integration.init(options);
            console.log('[RitualCircle Progression] Ready');
        },

        setIntegration(integration) { this.integration = integration; },

        onGameStart() {
            this.sessionStats = { startTime: Date.now(), kills: 0, wave: 0, trapsPlaced: 0 };
            this.integration.startGame(this.gameId);
        },

        onGameEnd(gameState) {
            this.integration.endGame(this.gameId);
            this.integration.saveGame(this.gameId, {
                maxWave: gameState.wave,
                totalKills: gameState.totalKills,
                trapsPlaced: gameState.trapsPlaced
            });
        },

        onWaveComplete(wave) {
            this.sessionStats.wave = wave;
            this.integration.trackProgress(this.gameId, { wave: 1 });
            this.integration.progression?.addXP(this.gameId, wave * 25, 'waveComplete');
        },

        onEnemyKill() {
            if (!this.sessionStats) return;
            this.sessionStats.kills++;
            this.integration.trackProgress(this.gameId, { kills: 1 });
        },

        onTrapPlaced() {
            if (!this.sessionStats) return;
            this.sessionStats.trapsPlaced++;
            this.integration.trackProgress(this.gameId, { trapsPlaced: 1 });
        },

        onSpellCast() {
            this.integration.trackProgress(this.gameId, { spellsCast: 1 });
        },

        onCircleDamage(amount) {
            this.integration.trackProgress(this.gameId, { damageTaken: amount });
        },

        getSessionStats() { return this.sessionStats || {}; },
        getPlayerStats() { return this.integration.getGameSummary(this.gameId); },
        getAchievements() { return this.integration.getAchievements(this.gameId); },
        getChallenges() { return this.integration.getCurrentChallenges(); }
    };

    // ============================================
    // SÉANCE PROGRESSION
    // ============================================

    const ProgressionSeance = {
        integration: null,
        gameId: 'seance',
        sessionStats: null,

        async init(options = {}) {
            this.integration = options.integration || new Phase78Integration();
            if (!options.integration) await this.integration.init(options);
            console.log('[Seance Progression] Ready');
        },

        setIntegration(integration) { this.integration = integration; },

        onGameStart() {
            this.sessionStats = { startTime: Date.now(), evidenceFound: 0, sanity: 100 };
            this.integration.startGame(this.gameId);
        },

        onGameEnd(gameState) {
            this.integration.endGame(this.gameId);
            this.integration.saveGame(this.gameId, {
                evidenceFound: gameState.evidence?.length || 0,
                maxSanity: gameState.maxSanity || 100,
                spiritsEncountered: gameState.spiritsEncountered || 0
            });
        },

        onEvidenceFound() {
            if (!this.sessionStats) return;
            this.sessionStats.evidenceFound++;
            this.integration.trackProgress(this.gameId, { evidenceFound: 1 });
            this.integration.progression?.addXP(this.gameId, 50, 'evidence');
        },

        onHauntingSurvived() {
            this.integration.trackProgress(this.gameId, { hauntingsSurvived: 1 });
            this.integration.progression?.addXP(this.gameId, 100, 'hauntingSurvived');
        },

        onSanityChange(sanity) {
            this.sessionStats.sanity = sanity;
            this.integration.trackProgress(this.gameId, { sanity: sanity });
        },

        onSpiritEncountered(spirit) {
            this.integration.trackProgress(this.gameId, { spiritsEncountered: 1 });
        },

        getSessionStats() { return this.sessionStats || {}; },
        getPlayerStats() { return this.integration.getGameSummary(this.gameId); },
        getAchievements() { return this.integration.getAchievements(this.gameId); },
        getChallenges() { return this.integration.getCurrentChallenges(); }
    };

    // ============================================
    // CRYPT TANKS PROGRESSION
    // ============================================

    const ProgressionCryptTanks = {
        integration: null,
        gameId: 'crypt-tanks',
        sessionStats: null,

        async init(options = {}) {
            this.integration = options.integration || new Phase78Integration();
            if (!options.integration) await this.integration.init(options);
            console.log('[CryptTanks Progression] Ready');
        },

        setIntegration(integration) { this.integration = integration; },

        onGameStart() {
            this.sessionStats = { startTime: Date.now(), kills: 0, level: 0 };
            this.integration.startGame(this.gameId);
        },

        onGameEnd(gameState) {
            this.integration.endGame(this.gameId);
            this.integration.saveGame(this.gameId, {
                maxLevel: gameState.level,
                totalKills: gameState.kills,
                bossesDefeated: gameState.bossesDefeated
            });
        },

        onEnemyKill() {
            if (!this.sessionStats) return;
            this.sessionStats.kills++;
            this.integration.trackProgress(this.gameId, { kills: 1 });
        },

        onLevelComplete(level) {
            this.sessionStats.level = level;
            this.integration.trackProgress(this.gameId, { level: 1 });
            this.integration.progression?.addXP(this.gameId, level * 30, 'levelComplete');
        },

        onBossDefeated() {
            this.integration.trackProgress(this.gameId, { bossesDefeated: 1 });
            this.integration.progression?.addXP(this.gameId, 250, 'bossKill');
        },

        onTankDamage(amount) {
            this.integration.trackProgress(this.gameId, { damageTaken: amount });
        },

        getSessionStats() { return this.sessionStats || {}; },
        getPlayerStats() { return this.integration.getGameSummary(this.gameId); },
        getAchievements() { return this.integration.getAchievements(this.gameId); },
        getChallenges() { return this.integration.getCurrentChallenges(); }
    };

    // ============================================
    // YETI RUN PROGRESSION
    // ============================================

    const ProgressionYetiRun = {
        integration: null,
        gameId: 'yeti-run',
        sessionStats: null,

        async init(options = {}) {
            this.integration = options.integration || new Phase78Integration();
            if (!options.integration) await this.integration.init(options);
            console.log('[YetiRun Progression] Ready');
        },

        setIntegration(integration) { this.integration = integration; },

        onGameStart() {
            this.sessionStats = { startTime: Date.now(), distance: 0, obstacles: 0 };
            this.integration.startGame(this.gameId);
        },

        onGameEnd(gameState) {
            this.integration.endGame(this.gameId);
            this.integration.saveGame(this.gameId, {
                maxDistance: gameState.distance,
                obstaclesPassed: gameState.obstaclesPassed,
                highScore: gameState.score
            });
        },

        onDistance(distance) {
            this.sessionStats.distance = distance;
            const milestone = Math.floor(distance / 100);
            this.integration.trackProgress(this.gameId, { distance: milestone });
            
            if (distance >= 1000 && distance % 1000 < 10) {
                this.integration.progression?.addXP(this.gameId, 50, 'distance1k');
            }
        },

        onObstaclePassed() {
            if (!this.sessionStats) return;
            this.sessionStats.obstacles++;
            this.integration.trackProgress(this.gameId, { obstacles: 1 });
        },

        onCollect(item) {
            this.integration.trackProgress(this.gameId, { collects: 1 });
        },

        onCrash() {
            this.integration.trackProgress(this.gameId, { crashes: 1 });
        },

        onPerfectRun() {
            this.integration.progression?.addXP(this.gameId, 300, 'perfectRun');
            this.integration.unlock('features', 'yeti_run_perfect');
        },

        getSessionStats() { return this.sessionStats || {}; },
        getPlayerStats() { return this.integration.getGameSummary(this.gameId); },
        getAchievements() { return this.integration.getAchievements(this.gameId); },
        getChallenges() { return this.integration.getCurrentChallenges(); }
    };

    // ============================================
    // NIGHTMARE RUN PROGRESSION
    // ============================================

    const ProgressionNightmareRun = {
        integration: null,
        gameId: 'nightmare-run',
        sessionStats: null,

        async init(options = {}) {
            this.integration = options.integration || new Phase78Integration();
            if (!options.integration) await this.integration.init(options);
            console.log('[NightmareRun Progression] Ready');
        },

        setIntegration(integration) { this.integration = integration; },

        onGameStart() {
            this.sessionStats = { startTime: Date.now(), distance: 0, kills: 0 };
            this.integration.startGame(this.gameId);
        },

        onGameEnd(gameState) {
            this.integration.endGame(this.gameId);
            this.integration.saveGame(this.gameId, {
                maxDistance: gameState.distance,
                enemiesDefeated: gameState.kills,
                highScore: gameState.score
            });
        },

        onDistance(distance) {
            this.sessionStats.distance = distance;
            this.integration.trackProgress(this.gameId, { distance: Math.floor(distance / 100) });
        },

        onEnemyKill() {
            if (!this.sessionStats) return;
            this.sessionStats.kills++;
            this.integration.trackProgress(this.gameId, { kills: 1 });
        },

        onBossDefeated() {
            this.integration.trackProgress(this.gameId, { bossesDefeated: 1 });
            this.integration.progression?.addXP(this.gameId, 200, 'bossKill');
        },

        onPowerUpCollected() {
            this.integration.trackProgress(this.gameId, { powerUps: 1 });
        },

        getSessionStats() { return this.sessionStats || {}; },
        getPlayerStats() { return this.integration.getGameSummary(this.gameId); },
        getAchievements() { return this.integration.getAchievements(this.gameId); },
        getChallenges() { return this.integration.getCurrentChallenges(); }
    };

    // ============================================
    // CURSED ARCADE PROGRESSION
    // ============================================

    const ProgressionCursedArcade = {
        integration: null,
        gameId: 'cursed-arcade',
        sessionStats: null,

        async init(options = {}) {
            this.integration = options.integration || new Phase78Integration();
            if (!options.integration) await this.integration.init(options);
            console.log('[CursedArcade Progression] Ready');
        },

        setIntegration(integration) { this.integration = integration; },

        onGameStart() {
            this.sessionStats = { startTime: Date.now(), score: 0, gamesPlayed: 0 };
            this.integration.startGame(this.gameId);
        },

        onGameEnd(gameState) {
            this.integration.endGame(this.gameId);
            this.integration.saveGame(this.gameId, {
                highScore: gameState.highScore,
                gamesPlayed: gameState.gamesPlayed,
                cursesSurvived: gameState.cursesSurvived
            });
        },

        onScore(score) {
            this.sessionStats.score = score;
            this.integration.trackProgress(this.gameId, { score: Math.floor(score / 100) });
        },

        onCurseSurvived() {
            this.integration.trackProgress(this.gameId, { cursesSurvived: 1 });
            this.integration.progression?.addXP(this.gameId, 75, 'curseSurvived');
        },

        onGameComplete(gameType) {
            this.integration.trackProgress(this.gameId, { gamesCompleted: 1, gameType });
        },

        onHighScore(score) {
            this.integration.progression?.addXP(this.gameId, 100, 'highScore');
        },

        getSessionStats() { return this.sessionStats || {}; },
        getPlayerStats() { return this.integration.getGameSummary(this.gameId); },
        getAchievements() { return this.integration.getAchievements(this.gameId); },
        getChallenges() { return this.integration.getCurrentChallenges(); }
    };

    // ============================================
    // EXPORT ALL
    // ============================================

    global.ProgressionRitualCircle = ProgressionRitualCircle;
    global.ProgressionSeance = ProgressionSeance;
    global.ProgressionCryptTanks = ProgressionCryptTanks;
    global.ProgressionYetiRun = ProgressionYetiRun;
    global.ProgressionNightmareRun = ProgressionNightmareRun;
    global.ProgressionCursedArcade = ProgressionCursedArcade;

})(typeof window !== 'undefined' ? window : this);
