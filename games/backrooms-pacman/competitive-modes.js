/**
 * PHASE 10.4: Competitive Game Modes
 * Speedrun, Survival, and Arena modes with leaderboards
 */

const CompetitiveModes = (function() {
    'use strict';

    // Game modes
    const MODES = {
        SPEEDRUN: 'speedrun',
        SURVIVAL: 'survival',
        ARENA: 'arena',
        CLASSIC: 'classic'
    };

    // Configuration
    const config = {
        currentMode: MODES.CLASSIC,
        leaderboardsEnabled: true,
        apiBase: '/api',
        modes: {
            speedrun: {
                name: 'Speedrun',
                description: 'Collect all pellets as fast as possible',
                objective: 'time',
                timeLimit: null,
                pellets: 'all',
                enemies: 'standard',
                powerups: 'enabled'
            },
            survival: {
                name: 'Survival',
                description: 'Survive endless waves of enemies',
                objective: 'survival',
                waves: 'infinite',
                difficulty: 'scaling',
                powerups: 'random'
            },
            arena: {
                name: 'Arena',
                description: 'Compete against other players',
                objective: 'competition',
                players: '2-8',
                teams: 'optional',
                rounds: 'best-of-3'
            }
        }
    };

    // State
    let currentMode = MODES.CLASSIC;
    let modeState = null;
    let leaderboardData = null;

    /**
     * Initialize competitive modes
     */
    function init() {
        console.log('[CompetitiveModes] Initialized');
        loadLeaderboards();
    }

    /**
     * Set game mode
     */
    function setMode(mode) {
        if (!MODES[mode.toUpperCase()]) {
            throw new Error('Invalid game mode: ' + mode);
        }

        currentMode = MODES[mode.toUpperCase()];
        modeState = initializeModeState(currentMode);

        console.log('[CompetitiveModes] Mode set to:', currentMode);
        return modeState;
    }

    /**
     * Initialize mode state
     */
    function initializeModeState(mode) {
        const state = {
            mode,
            startTime: Date.now(),
            endTime: null,
            score: 0,
            pellets: 0,
            wave: 0,
            enemiesDefeated: 0,
            powerupsUsed: 0,
            deaths: 0,
            ranking: null
        };

        switch (mode) {
            case MODES.SPEEDRUN:
                state.targetPellets = getTotalPellets();
                state.bestTime = getPersonalBest(mode);
                break;

            case MODES.SURVIVAL:
                state.currentWave = 0;
                state.enemiesRemaining = 0;
                state.health = 100;
                break;

            case MODES.ARENA:
                state.opponents = [];
                state.round = 0;
                state.roundsWon = 0;
                break;
        }

        return state;
    }

    /**
     * Start speedrun mode
     */
    function startSpeedrun() {
        setMode('speedrun');
        
        console.log('[Speedrun] Started! Collect all pellets as fast as possible.');
        
        // Reset timer
        modeState.startTime = Date.now();
        
        // Hide unnecessary UI elements
        hideNonEssentialUI();
        
        // Show speedrun timer
        showSpeedrunTimer();
        
        return modeState;
    }

    /**
     * Start survival mode
     */
    function startSurvival() {
        setMode('survival');
        
        console.log('[Survival] Started! Survive endless waves.');
        
        // Start first wave
        startNextWave();
        
        // Show survival HUD
        showSurvivalHUD();
        
        return modeState;
    }

    /**
     * Start arena mode
     */
    function startArena(playerCount = 4) {
        setMode('arena');
        
        console.log('[Arena] Started with', playerCount, 'players');
        
        // Initialize opponents
        modeState.opponents = generateAIOpponents(playerCount - 1);
        
        // Show arena HUD
        showArenaHUD();
        
        return modeState;
    }

    /**
     * Start next survival wave
     */
    function startNextWave() {
        modeState.wave++;
        modeState.enemiesRemaining = calculateEnemiesForWave(modeState.wave);
        
        console.log('[Survival] Wave', modeState.wave, 'started with', modeState.enemiesRemaining, 'enemies');
        
        // Spawn enemies
        spawnEnemies(modeState.enemiesRemaining);
        
        // Update HUD
        updateSurvivalHUD();
    }

    /**
     * Calculate enemies for wave
     */
    function calculateEnemiesForWave(wave) {
        // Exponential scaling
        return Math.floor(3 * Math.pow(1.2, wave - 1));
    }

    /**
     * Generate AI opponents
     */
    function generateAIOpponents(count) {
        const opponents = [];
        const names = ['Shadow', 'Phantom', 'Reaper', 'Wraith', 'Specter', 'Ghost', 'Demon', 'Fiend'];
        
        for (let i = 0; i < count; i++) {
            opponents.push({
                id: `ai-${i}`,
                name: names[i % names.length],
                pellets: 0,
                powerups: 0,
                skill: 0.5 + Math.random() * 0.5,
                position: { x: 0, z: 0 }
            });
        }
        
        return opponents;
    }

    /**
     * Handle pellet collection
     */
    function onPelletCollected(pelletType = 'normal') {
        if (!modeState) return;
        
        modeState.pellets++;
        
        if (currentMode === MODES.SPEEDRUN) {
            // Check if speedrun complete
            if (modeState.pellets >= modeState.targetPellets) {
                completeSpeedrun();
            } else {
                updateSpeedrunTimer();
            }
        } else if (currentMode === MODES.ARENA) {
            // Update opponent tracking
            updateOpponentProgress();
        }
    }

    /**
     * Complete speedrun
     */
    function completeSpeedrun() {
        modeState.endTime = Date.now();
        const timeMs = modeState.endTime - modeState.startTime;
        const timeSec = timeMs / 1000;
        
        modeState.score = timeSec;
        
        console.log('[Speedrun] Completed in', timeSec.toFixed(2), 'seconds');
        
        // Submit to leaderboard
        submitLeaderboardEntry('speedrun', {
            time: timeSec,
            pellets: modeState.pellets,
            deaths: modeState.deaths
        });
        
        // Show completion screen
        showSpeedrunResults(timeSec);
    }

    /**
     * Handle player death
     */
    function onDeath() {
        if (!modeState) return;
        
        modeState.deaths++;
        
        if (currentMode === MODES.SURVIVAL) {
            // Check if game over
            modeState.health -= 25;
            
            if (modeState.health <= 0) {
                endSurvival();
            }
        }
    }

    /**
     * End survival game
     */
    function endSurvival() {
        console.log('[Survival] Game Over! Reached wave', modeState.wave);
        
        modeState.score = modeState.wave;
        
        // Submit to leaderboard
        submitLeaderboardEntry('survival', {
            wave: modeState.wave,
            enemiesDefeated: modeState.enemiesDefeated,
            time: (Date.now() - modeState.startTime) / 1000
        });
        
        // Show results
        showSurvivalResults();
    }

    /**
     * Submit leaderboard entry
     */
    async function submitLeaderboardEntry(mode, stats) {
        if (!config.leaderboardsEnabled) return;
        
        try {
            const response = await fetch(`${config.apiBase}/leaderboards/${mode}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mode,
                    stats,
                    timestamp: Date.now(),
                    platform: 'web'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                modeState.ranking = result.ranking;
                console.log('[Leaderboard] Submitted! Ranking:', result.ranking);
            }
        } catch (error) {
            console.error('[Leaderboard] Submission failed:', error);
        }
    }

    /**
     * Load leaderboards
     */
    async function loadLeaderboards() {
        if (!config.leaderboardsEnabled) return;
        
        try {
            const response = await fetch(`${config.apiBase}/leaderboards`);
            if (response.ok) {
                leaderboardData = await response.json();
                console.log('[Leaderboard] Loaded data');
            }
        } catch (error) {
            console.error('[Leaderboard] Load failed:', error);
        }
    }

    /**
     * Get leaderboard for mode
     */
    function getLeaderboard(mode, limit = 10) {
        if (!leaderboardData) return [];
        
        const modeData = leaderboardData[mode] || [];
        return modeData.slice(0, limit);
    }

    /**
     * Get personal best
     */
    function getPersonalBest(mode) {
        const key = `backrooms-${mode}-best`;
        return localStorage.getItem(key) || null;
    }

    /**
     * Update personal best
     */
    function updatePersonalBest(mode, score) {
        const key = `backrooms-${mode}-best`;
        const current = getPersonalBest(mode);
        
        if (!current || score < current) {
            localStorage.setItem(key, score);
            console.log('[PersonalBest] New record for', mode, ':', score);
        }
    }

    /**
     * Show speedrun timer
     */
    function showSpeedrunTimer() {
        // Create or update timer element
        let timerEl = document.getElementById('speedrun-timer');
        
        if (!timerEl) {
            timerEl = document.createElement('div');
            timerEl.id = 'speedrun-timer';
            timerEl.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 2rem;
                font-family: 'Courier New', monospace;
                color: #fff;
                z-index: 1000;
                border: 2px solid #ffcc00;
            `;
            document.body.appendChild(timerEl);
        }
        
        // Update timer
        function update() {
            if (currentMode !== MODES.SPEEDRUN) {
                timerEl.style.display = 'none';
                return;
            }
            
            const elapsed = (Date.now() - modeState.startTime) / 1000;
            timerEl.textContent = formatTime(elapsed);
            timerEl.style.display = 'block';
            
            requestAnimationFrame(update);
        }
        
        update();
    }

    /**
     * Format time
     */
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    /**
     * Show survival HUD
     */
    function showSurvivalHUD() {
        let hudEl = document.getElementById('survival-hud');
        
        if (!hudEl) {
            hudEl = document.createElement('div');
            hudEl.id = 'survival-hud';
            hudEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                padding: 15px;
                border-radius: 8px;
                color: #fff;
                z-index: 1000;
                border: 2px solid #ff4444;
                min-width: 150px;
            `;
            document.body.appendChild(hudEl);
        }
        
        updateSurvivalHUD();
    }

    /**
     * Update survival HUD
     */
    function updateSurvivalHUD() {
        const hudEl = document.getElementById('survival-hud');
        if (!hudEl) return;
        
        hudEl.innerHTML = `
            <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 10px; color: #ff4444;">SURVIVAL</div>
            <div style="margin-bottom: 5px;">Wave: <strong>${modeState.wave}</strong></div>
            <div style="margin-bottom: 5px;">Enemies: <strong>${modeState.enemiesRemaining}</strong></div>
            <div>Health: <strong>${modeState.health}%</strong></div>
        `;
    }

    /**
     * Show arena HUD
     */
    function showArenaHUD() {
        let hudEl = document.getElementById('arena-hud');
        
        if (!hudEl) {
            hudEl = document.createElement('div');
            hudEl.id = 'arena-hud';
            hudEl.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                background: rgba(0, 0, 0, 0.8);
                padding: 15px;
                border-radius: 8px;
                color: #fff;
                z-index: 1000;
                border: 2px solid #4488ff;
                min-width: 200px;
            `;
            document.body.appendChild(hudEl);
        }
        
        updateArenaHUD();
    }

    /**
     * Update arena HUD
     */
    function updateArenaHUD() {
        const hudEl = document.getElementById('arena-hud');
        if (!hudEl) return;
        
        let opponentsHtml = modeState.opponents.map(opp => `
            <div style="font-size: 0.9rem; margin: 5px 0;">
                ${opp.name}: ${opp.pellets} pellets
            </div>
        `).join('');
        
        hudEl.innerHTML = `
            <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 10px; color: #4488ff;">ARENA</div>
            <div style="margin-bottom: 10px;">Your pellets: <strong>${modeState.pellets}</strong></div>
            <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 10px;">
                <strong>Opponents:</strong>
                ${opponentsHtml}
            </div>
        `;
    }

    /**
     * Update opponent progress
     */
    function updateOpponentProgress() {
        if (currentMode !== MODES.ARENA) return;
        
        // Simulate opponent progress
        modeState.opponents.forEach(opp => {
            if (Math.random() < opp.skill * 0.1) {
                opp.pellets++;
            }
        });
        
        updateArenaHUD();
    }

    /**
     * Show speedrun results
     */
    function showSpeedrunResults(time) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            color: #fff;
            z-index: 2000;
            border: 3px solid #ffcc00;
            min-width: 400px;
        `;
        
        modal.innerHTML = `
            <h2 style="color: #ffcc00; margin-bottom: 20px; font-size: 2rem;">SPEEDRUN COMPLETE!</h2>
            <div style="font-size: 3rem; margin: 20px 0; font-family: 'Courier New', monospace;">
                ${formatTime(time)}
            </div>
            <div style="margin: 20px 0; font-size: 1.2rem;">
                Pellets: ${modeState.pellets} | Deaths: ${modeState.deaths}
            </div>
            ${modeState.ranking ? `
                <div style="color: #4ade80; font-size: 1.5rem; margin: 20px 0;">
                    🏆 Rank #${modeState.ranking}
                </div>
            ` : ''}
            <button onclick="this.closest('div[style*=fixed]').remove()" 
                style="margin-top: 30px; padding: 12px 30px; background: #ffcc00; border: none; border-radius: 8px; 
                color: #000; font-size: 1.1rem; cursor: pointer; font-weight: bold;">
                Continue
            </button>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Show survival results
     */
    function showSurvivalResults() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            color: #fff;
            z-index: 2000;
            border: 3px solid #ff4444;
            min-width: 400px;
        `;
        
        modal.innerHTML = `
            <h2 style="color: #ff4444; margin-bottom: 20px; font-size: 2rem;">SURVIVAL COMPLETE</h2>
            <div style="font-size: 3rem; margin: 20px 0; color: #ff4444;">
                Wave ${modeState.wave}
            </div>
            <div style="margin: 20px 0; font-size: 1.2rem;">
                Enemies Defeated: ${modeState.enemiesDefeated}
            </div>
            ${modeState.ranking ? `
                <div style="color: #4ade80; font-size: 1.5rem; margin: 20px 0;">
                    🏆 Rank #${modeState.ranking}
                </div>
            ` : ''}
            <button onclick="this.closest('div[style*=fixed]').remove()" 
                style="margin-top: 30px; padding: 12px 30px; background: #ff4444; border: none; border-radius: 8px; 
                color: #fff; font-size: 1.1rem; cursor: pointer; font-weight: bold;">
                Continue
            </button>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Hide non-essential UI
     */
    function hideNonEssentialUI() {
        // Hide unnecessary HUD elements during competitive modes
        const elements = document.querySelectorAll('.hud-decoration, .hud-ambient');
        elements.forEach(el => el.style.display = 'none');
    }

    /**
     * Get total pellets
     */
    function getTotalPellets() {
        // This would query the actual game state
        return 244; // Default maze pellet count
    }

    /**
     * Spawn enemies
     */
    function spawnEnemies(count) {
        // This would integrate with the enemy spawning system
        console.log('[Survival] Spawning', count, 'enemies');
    }

    // Public API
    return {
        init,
        setMode,
        startSpeedrun,
        startSurvival,
        startArena,
        onPelletCollected,
        onDeath,
        getLeaderboard,
        getPersonalBest,
        MODES,
        getCurrentMode: () => currentMode,
        getModeState: () => modeState
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CompetitiveModes;
}
