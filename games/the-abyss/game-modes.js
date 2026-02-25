/**
 * Game Modes System for The Abyss
 * Phase 1: Foundation & Player Experience
 * 
 * Implements 5 distinct game modes:
 * - Campaign (5 acts, story-driven)
 * - Endless (procedural descent)
 * - Time Attack (daily challenges)
 * - Hardcore (permadeath)
 * - Zen (no threats, exploration)
 */

export class GameModesSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.currentMode = null;
        
        // Mode configurations
        this.modes = {
            campaign: {
                id: 'campaign',
                name: 'Campaign',
                description: 'Story-driven experience through 5 acts',
                unlocked: true,
                difficulty: 'normal',
                features: {
                    story: true,
                    saves: true,
                    checkpoints: true,
                    permadeath: false
                }
            },
            endless: {
                id: 'endless',
                name: 'Endless',
                description: 'Infinite procedural descent - how deep can you go?',
                unlocked: true,
                difficulty: 'normal',
                features: {
                    story: false,
                    saves: false,
                    checkpoints: false,
                    permadeath: false,
                    scoring: true
                }
            },
            timeAttack: {
                id: 'timeAttack',
                name: 'Time Attack',
                description: 'Daily challenges with fixed seeds',
                unlocked: true,
                difficulty: 'hard',
                features: {
                    story: false,
                    saves: false,
                    checkpoints: false,
                    permadeath: false,
                    dailyChallenge: true,
                    leaderboards: true
                }
            },
            hardcore: {
                id: 'hardcore',
                name: 'Hardcore',
                description: 'One life only. No saves. Pure terror.',
                unlocked: false, // Unlock after completing campaign
                difficulty: 'extreme',
                features: {
                    story: false,
                    saves: false,
                    checkpoints: false,
                    permadeath: true,
                    leaderboards: true
                }
            },
            zen: {
                id: 'zen',
                name: 'Zen Mode',
                description: 'No creatures. Infinite oxygen. Just explore.',
                unlocked: true,
                difficulty: 'peaceful',
                features: {
                    story: false,
                    saves: true,
                    checkpoints: true,
                    permadeath: false,
                    infiniteOxygen: true,
                    noCreatures: true,
                    photoMode: true
                }
            }
        };
        
        // Campaign acts
        this.campaignActs = [
            {
                act: 1,
                title: 'The Descent Begins',
                depth: '0-20m',
                biome: 'shallows',
                objectives: [
                    'Learn basic controls',
                    'Collect first artifact',
                    'Reach 20m depth'
                ],
                rewards: ['Basic flashlight upgrade']
            },
            {
                act: 2,
                title: 'Twilight Zone',
                depth: '20-50m',
                biome: 'twilight',
                objectives: [
                    'Find 3 data logs',
                    'Encounter first creature',
                    'Discover shipwreck'
                ],
                rewards: ['Oxygen efficiency +10%']
            },
            {
                act: 3,
                title: 'The Midnight Realm',
                depth: '50-100m',
                biome: 'midnight',
                objectives: [
                    'Navigate underwater cave',
                    'Collect ancient artifact',
                    'Escape predator chase'
                ],
                rewards: ['Advanced sonar']
            },
            {
                act: 4,
                title: 'Abyssal Gates',
                depth: '100-150m',
                biome: 'abyss',
                objectives: [
                    'Find entrance to ancient ruins',
                    'Solve environmental puzzle',
                    'Survive leviathan encounter'
                ],
                rewards: ['Depth suit upgrade']
            },
            {
                act: 5,
                title: 'The Final Depth',
                depth: '150m+',
                biome: 'trench',
                objectives: [
                    'Reach the bottom',
                    'Uncover the truth',
                    'Make the final choice'
                ],
                rewards: ['True ending unlock']
            }
        ];
        
        // Daily challenge configuration
        this.dailyChallenge = {
            seed: null,
            date: null,
            completed: false,
            time: null,
            depth: null
        };
    }
    
    /**
     * Initialize game modes system
     */
    async initialize() {
        console.log('🎮 Initializing game modes...');
        
        // Check unlocks
        await this.checkUnlocks();
        
        // Generate daily challenge if needed
        this.generateDailyChallenge();
        
        // Load saved mode progress
        this.loadModeProgress();
        
        console.log('✓ Game modes initialized');
    }
    
    /**
     * Set current game mode
     */
    setMode(modeId) {
        if (!this.modes[modeId]) {
            throw new Error(`Unknown game mode: ${modeId}`);
        }
        
        const mode = this.modes[modeId];
        
        if (!mode.unlocked) {
            throw new Error(`Game mode ${mode.name} is not unlocked`);
        }
        
        this.currentMode = modeId;
        console.log(`🎮 Game mode set to: ${mode.name}`);
        
        // Apply mode-specific settings
        this.applyModeSettings(mode);
        
        return mode;
    }
    
    /**
     * Apply mode-specific game settings
     */
    applyModeSettings(mode) {
        const state = this.gameState;
        
        switch(mode.id) {
            case 'zen':
                state.infiniteOxygen = true;
                state.noHostileCreatures = true;
                state.photoModeEnabled = true;
                break;
                
            case 'hardcore':
                state.permadeath = true;
                state.savesDisabled = true;
                state.checkpointsDisabled = true;
                break;
                
            case 'endless':
                state.scoringEnabled = true;
                state.proceduralGeneration = true;
                break;
                
            case 'timeAttack':
                state.timerEnabled = true;
                state.fixedSeed = this.dailyChallenge.seed;
                break;
                
            case 'campaign':
                state.storyEnabled = true;
                state.savesEnabled = true;
                state.checkpointsEnabled = true;
                break;
        }
    }
    
    /**
     * Start a new game in current mode
     */
    startNewGame() {
        if (!this.currentMode) {
            throw new Error('No game mode selected');
        }
        
        const mode = this.modes[this.currentMode];
        
        console.log(`🚀 Starting new game: ${mode.name}`);
        
        // Reset game state
        this.resetGameState();
        
        // Setup mode-specific initialization
        if (mode.id === 'campaign') {
            this.startCampaign();
        } else if (mode.id === 'endless') {
            this.startEndless();
        } else if (mode.id === 'timeAttack') {
            this.startTimeAttack();
        } else if (mode.id === 'hardcore') {
            this.startHardcore();
        } else if (mode.id === 'zen') {
            this.startZen();
        }
        
        return { success: true, mode: mode };
    }
    
    /**
     * Start campaign mode
     */
    startCampaign() {
        console.log('📖 Campaign Mode: Act 1 - The Descent Begins');
        
        this.gameState.act = 1;
        this.gameState.currentDepth = 0;
        this.gameState.biome = 'shallows';
        
        // Give starting equipment
        this.gameState.player.equipment = {
            flashlight: 'basic',
            oxygenTank: 'standard',
            suit: 'standard'
        };
        
        // Show intro cinematic
        this.showIntroCinematic(1);
    }
    
    /**
     * Start endless mode
     */
    startEndless() {
        console.log('♾️ Endless Mode: How deep can you go?');
        
        this.gameState.score = 0;
        this.gameState.multiplier = 1.0;
        this.gameState.currentDepth = 0;
        
        // Procedural generation enabled
        this.gameState.proceduralSeed = Date.now();
        
        // Spawn initial resources
        this.spawnInitialResources();
    }
    
    /**
     * Start time attack mode
     */
    startTimeAttack() {
        console.log('⏱️ Time Attack: Daily Challenge');
        
        this.gameState.timer = 0;
        this.gameState.targetDepth = this.dailyChallenge.targetDepth;
        this.gameState.fixedSeed = this.dailyChallenge.seed;
        
        // Fixed starting conditions
        this.gameState.player.oxygen = 100;
        this.gameState.player.flares = 3;
    }
    
    /**
     * Start hardcore mode
     */
    startHardcore() {
        console.log('💀 Hardcore Mode: One life only');
        
        this.gameState.lives = 1;
        this.gameState.difficulty = 'extreme';
        
        // Minimal starting equipment
        this.gameState.player.equipment = {
            flashlight: 'dim',
            oxygenTank: 'small'
        };
    }
    
    /**
     * Start zen mode
     */
    startZen() {
        console.log('🧘 Zen Mode: Peaceful exploration');
        
        this.gameState.infiniteOxygen = true;
        this.gameState.creaturesPassive = true;
        this.gameState.photoModeAvailable = true;
        
        // Start at medium depth for immediate exploration
        this.gameState.currentDepth = 30;
    }
    
    /**
     * Check and update mode unlocks
     */
    async checkUnlocks() {
        // Check if campaign is completed
        const campaignComplete = localStorage.getItem('campaign_complete');
        
        if (campaignComplete === 'true') {
            this.modes.hardcore.unlocked = true;
            console.log('🔓 Hardcore mode unlocked!');
        }
    }
    
    /**
     * Generate daily challenge
     */
    generateDailyChallenge() {
        const today = new Date().toDateString();
        
        // Only generate if it's a new day
        if (this.dailyChallenge.date !== today) {
            // Create seed from date
            const seedString = `daily_${today}`;
            const seed = this.hashString(seedString);
            
            // Random but deterministic target depth
            const depths = [50, 75, 100, 125, 150];
            const depthIndex = seed % depths.length;
            
            this.dailyChallenge = {
                seed: seed,
                date: today,
                targetDepth: depths[depthIndex],
                completed: false,
                time: null,
                depth: null
            };
            
            console.log('📅 Daily challenge generated:', this.dailyChallenge);
        }
    }
    
    /**
     * Complete daily challenge
     */
    completeDailyChallenge(time, depth) {
        if (this.currentMode !== 'timeAttack') {
            return;
        }
        
        this.dailyChallenge.completed = true;
        this.dailyChallenge.time = time;
        this.dailyChallenge.depth = depth;
        
        // Save completion
        localStorage.setItem('daily_challenge_' + this.dailyChallenge.date, JSON.stringify({
            time: time,
            depth: depth
        }));
        
        console.log('✅ Daily challenge completed!', { time, depth });
        
        // Award achievement if exists
        this.awardDailyCompletionAchievement();
    }
    
    /**
     * Handle player death based on mode
     */
    handleDeath() {
        const mode = this.modes[this.currentMode];
        
        if (mode.features.permadeath) {
            // Hardcore: game over, delete save
            console.log('💀 GAME OVER - Hardcore mode');
            this.deleteAllSaves();
            this.returnToMenu();
        } else {
            // Other modes: respawn at checkpoint or last save
            console.log('😵 Death - respawning...');
            this.respawnAtCheckpoint();
        }
    }
    
    /**
     * Respawn at last checkpoint
     */
    respawnAtCheckpoint() {
        const checkpoint = this.gameState.lastCheckpoint;
        
        if (checkpoint) {
            this.gameState.player.position = { ...checkpoint.position };
            this.gameState.player.health = 50; // Penalty
            this.gameState.player.oxygen = 75;
            
            console.log('✨ Respawned at checkpoint');
        } else {
            // No checkpoint, reload last save
            this.loadLastSave();
        }
    }
    
    /**
     * Save checkpoint (if mode allows)
     */
    saveCheckpoint(location) {
        const mode = this.modes[this.currentMode];
        
        if (!mode.features.checkpoints) {
            return;
        }
        
        this.gameState.lastCheckpoint = {
            position: { ...this.gameState.player.position },
            depth: this.gameState.currentDepth,
            timestamp: Date.now()
        };
        
        console.log('💾 Checkpoint saved');
    }
    
    /**
     * Get mode statistics
     */
    getModeStatistics(modeId) {
        const stats = {
            campaign: {
                actsCompleted: this.getActsCompleted(),
                totalPlaytime: this.getTotalPlaytime(),
                artifactsCollected: this.getArtifactsCount(),
                completionPercentage: this.getCampaignCompletion()
            },
            endless: {
                bestDepth: this.getBestEndlessDepth(),
                averageDepth: this.getAverageEndlessDepth(),
                gamesPlayed: this.getEndlessGamesPlayed()
            },
            timeAttack: {
                dailyStreak: this.getDailyStreak(),
                bestTimes: this.getBestTimeAttackTimes(),
                completions: this.getTimeAttackCompletions()
            },
            hardcore: {
                gamesPlayed: this.getHardcoreGamesPlayed(),
                deepestReached: this.getHardcoreDeepestDepth(),
                wins: this.getHardcoreWins()
            },
            zen: {
                explorationPercentage: this.getZenExploration(),
                screenshotsTaken: this.getScreenshotsTaken(),
                playtime: this.getZenPlaytime()
            }
        };
        
        return stats[modeId] || {};
    }
    
    /**
     * Hash string to number
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    
    /**
     * Show intro cinematic for act
     */
    showIntroCinematic(actNumber) {
        const act = this.campaignActs[actNumber - 1];
        
        if (!act) return;
        
        console.log(`🎬 Act ${actNumber}: ${act.title}`);
        console.log(`   Location: ${act.biome} (${act.depth})`);
        console.log(`   Objectives:`, act.objectives);
        
        // In full implementation, show cinematic cutscene
    }
    
    /**
     * Spawn initial resources for endless mode
     */
    spawnInitialResources() {
        // Spawn starter oxygen and flares
        this.gameState.player.oxygen = 100;
        this.gameState.player.flares = 3;
    }
    
    /**
     * Reset game state for new game
     */
    resetGameState() {
        // Clear temporary state
        this.gameState.enemies = [];
        this.gameState.projectiles = [];
        this.gameState.effects = [];
        
        // Reset player
        this.gameState.player.health = 100;
        this.gameState.player.position = { x: 0, y: 0, z: 0 };
    }
    
    /**
     * Delete all saves (hardcore death)
     */
    deleteAllSaves() {
        localStorage.removeItem('abyss_save_1');
        localStorage.removeItem('abyss_save_2');
        localStorage.removeItem('abyss_save_3');
        localStorage.removeItem('abyss_autosave');
        console.log('🗑️ All saves deleted (hardcore death)');
    }
    
    /**
     * Return to menu
     */
    returnToMenu() {
        // Navigate back to main menu
        window.location.href = '/games/the-abyss/menu.html';
    }
    
    /**
     * Load last save
     */
    loadLastSave() {
        // Trigger save system to load most recent save
        console.log('📂 Loading last save...');
    }
    
    /**
     * Load mode progress from storage
     */
    loadModeProgress() {
        // Load campaign progress
        const campaignProgress = localStorage.getItem('campaign_progress');
        if (campaignProgress) {
            this.gameState.campaignProgress = JSON.parse(campaignProgress);
        }
        
        // Load endless records
        const endlessRecords = localStorage.getItem('endless_records');
        if (endlessRecords) {
            this.gameState.endlessRecords = JSON.parse(endlessRecords);
        }
        
        // Load time attack completions
        const timeAttackStats = localStorage.getItem('timeattack_stats');
        if (timeAttackStats) {
            this.gameState.timeAttackStats = JSON.parse(timeAttackStats);
        }
    }
    
    // Statistics helper methods (placeholders)
    getActsCompleted() { return 0; }
    getTotalPlaytime() { return 0; }
    getArtifactsCount() { return 0; }
    getCampaignCompletion() { return 0; }
    getBestEndlessDepth() { return 0; }
    getAverageEndlessDepth() { return 0; }
    getEndlessGamesPlayed() { return 0; }
    getDailyStreak() { return 0; }
    getBestTimeAttackTimes() { return []; }
    getTimeAttackCompletions() { return 0; }
    getHardcoreGamesPlayed() { return 0; }
    getHardcoreDeepestDepth() { return 0; }
    getHardcoreWins() { return 0; }
    getZenExploration() { return 0; }
    getScreenshotsTaken() { return 0; }
    getZenPlaytime() { return 0; }
    awardDailyCompletionAchievement() {}
}
