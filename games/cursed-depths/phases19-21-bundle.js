/* ============================================================
   CURSED DEPTHS - PHASES 19-21 BUNDLE
   Speedrun Mode | New Game+ | Arena & PvP
   ============================================================ */

// ===== PHASE 19: SPEEDRUN MODE =====
const SpeedrunSystem = {
    active: false,
    timer: 0,
    splits: {},
    bestTimes: {},
    
    categories: {
        any_percent: {
            name: 'Any%',
            description: 'Beat the game as fast as possible',
            requiredBosses: ['demon_lord']
        },
        all_bosses: {
            name: 'All Bosses',
            description: 'Defeat all bosses',
            requiredBosses: ['eye', 'bone', 'demon', 'hive', 'frost', 'corruption', 'crimson']
        },
        100_percent: {
            name: '100%',
            description: 'All bosses, all biomes, all trophies',
            requiredBosses: ['all'],
            requiredBiomes: 20,
            requiredTrophies: 'all'
        }
    },
    
    init() {
        console.log('⏱️ Phase 19: Speedrun System initialized');
        this.loadBestTimes();
    },
    
    loadBestTimes() {
        const saved = localStorage.getItem('cursed_depths_speedruns');
        if (saved) {
            this.bestTimes = JSON.parse(saved);
        }
    },
    
    saveBestTimes() {
        localStorage.setItem('cursed_depths_speedruns', JSON.stringify(this.bestTimes));
    },
    
    startSpeedrun(category = 'any_percent') {
        if (this.active) return;
        
        this.active = true;
        this.timer = 0;
        this.splits = {
            category,
            startTime: Date.now(),
            bossKills: {},
            biomeDiscoveries: {},
            segments: {}
        };
        
        showBossMessage(`⏱️ Speedrun Started: ${this.categories[category].name}`, '#FFDD44');
        
        // Show split timer UI
        this.showSplitTimer();
    },
    
    stopSpeedrun(reason = 'cancelled') {
        if (!this.active) return;
        
        const finalTime = this.timer;
        this.active = false;
        
        showBossMessage(`Speedrun ${reason}: ${this.formatTime(finalTime)}`, reason === 'completed' ? '#44FF88' : '#FF4444');
        
        // Save if completed
        if (reason === 'completed') {
            this.saveRun(this.splits.category, finalTime);
        }
        
        this.hideSplitTimer();
    },
    
    update(dt) {
        if (!this.active) return;
        
        this.timer += dt;
        this.updateSplitDisplay();
    },
    
    recordSplit(splitName) {
        if (!this.active) return;
        
        const currentTime = this.timer;
        this.splits.segments[splitName] = {
            time: currentTime,
            delta: currentTime - (this.splits.segments[Object.keys(this.splits.segments).length - 1]?.time || 0)
        };
        
        showFloatingText(`${splitName}: ${this.formatTime(currentTime)}`, window.innerWidth / 2, 150, '#44FF88');
    },
    
    onBossDefeated(bossId) {
        if (!this.active) return;
        
        this.splits.bossKills[bossId] = this.timer;
        this.recordSplit(`${bossId} defeated`);
        
        // Check for completion
        this.checkCategoryCompletion();
    },
    
    onBiomeDiscovered(biomeId) {
        if (!this.active) return;
        
        this.splits.biomeDiscoveries[biomeId] = this.timer;
    },
    
    checkCategoryCompletion() {
        const category = this.categories[this.splits.category];
        
        if (category.requiredBosses.includes('all')) {
            // Check all bosses
            const allBosses = ['eye', 'bone', 'demon', 'hive', 'frost'];
            const allDefeated = allBosses.every(b => this.splits.bossKills[b]);
            
            if (allDefeated) {
                this.completeSpeedrun();
            }
        } else {
            // Check specific bosses
            const requiredDefeated = category.requiredBosses.every(b => this.splits.bossKills[b]);
            
            if (requiredDefeated) {
                this.completeSpeedrun();
            }
        }
    },
    
    completeSpeedrun() {
        this.stopSpeedrun('completed');
        
        // Show results screen
        this.showResultsScreen();
    },
    
    saveRun(category, time) {
        if (!this.bestTimes[category]) {
            this.bestTimes[category] = [];
        }
        
        this.bestTimes[category].push({
            time,
            date: new Date().toISOString(),
            splits: this.splits.segments
        });
        
        // Keep only top 10 runs
        this.bestTimes[category].sort((a, b) => a.time - b.time);
        this.bestTimes[category] = this.bestTimes[category].slice(0, 10);
        
        this.saveBestTimes();
    },
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    },
    
    showSplitTimer() {
        const ui = document.createElement('div');
        ui.id = 'speedrun-timer';
        ui.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            border: 2px solid #FFDD44;
            border-radius: 10px;
            padding: 15px 30px;
            color: white;
            font-family: 'Inter', sans-serif;
            z-index: 10000;
        `;
        
        ui.innerHTML = `
            <div style="text-align: center; font-size: 24px; font-weight: bold;" id="speedrun-time">00:00.00</div>
            <div style="text-align: center; font-size: 12px; color: #AAAAAA; margin-top: 5px;" id="speedrun-category">Any%</div>
        `;
        
        document.getElementById('game-container').appendChild(ui);
    },
    
    updateSplitDisplay() {
        const timerEl = document.getElementById('speedrun-time');
        if (timerEl) {
            timerEl.textContent = this.formatTime(this.timer);
        }
    },
    
    hideSplitTimer() {
        const ui = document.getElementById('speedrun-timer');
        if (ui) ui.remove();
    },
    
    showResultsScreen() {
        const results = document.createElement('div');
        results.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: 'Inter', sans-serif;
            z-index: 10001;
        `;
        
        results.innerHTML = `
            <h1 style="font-size: 48px; color: #44FF88;">Speedrun Complete!</h1>
            <h2 style="font-size: 32px;">${this.formatTime(this.timer)}</h2>
            <p style="font-size: 18px; color: #AAAAAA;">Category: ${this.categories[this.splits.category].name}</p>
            <button onclick="this.parentElement.remove()" style="margin-top: 30px; padding: 15px 30px; font-size: 18px; background: #4488FF; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
        `;
        
        document.body.appendChild(results);
    },
    
    getPersonalBest(category) {
        const runs = this.bestTimes[category];
        return runs && runs.length > 0 ? runs[0].time : null;
    }
};

// ===== PHASE 20: NEW GAME+ SYSTEM =====
const NewGamePlusSystem = {
    unlocked: false,
    currentMode: 'normal',
    legendaryStacks: 0,
    
    modes: {
        normal: {
            name: 'Normal',
            description: 'Standard gameplay',
            modifiers: {}
        },
        expert: {
            name: 'Expert',
            description: 'Increased difficulty, better loot',
            modifiers: {
                enemyDamage: 1.5,
                enemyHealth: 1.5,
                lootQuality: 1.5,
                coinDrop: 2.0
            },
            unlockRequirement: 'beat_game_once'
        },
        master: {
            name: 'Master',
            description: 'Extreme difficulty, legendary loot',
            modifiers: {
                enemyDamage: 2.0,
                enemyHealth: 2.0,
                lootQuality: 2.0,
                coinDrop: 3.0,
                rareDrops: 2.0
            },
            unlockRequirement: 'beat_expert'
        },
        legendary: {
            name: 'Legendary',
            description: 'Ultimate challenge, maximum rewards',
            modifiers: {
                enemyDamage: 3.0,
                enemyHealth: 3.0,
                lootQuality: 3.0,
                coinDrop: 5.0,
                rareDrops: 3.0,
                exclusiveLegendaryDrops: true
            },
            unlockRequirement: 'beat_master'
        }
    },
    
    init() {
        console.log('🔄 Phase 20: New Game+ System initialized');
        this.checkUnlocks();
    },
    
    checkUnlocks() {
        const saveData = localStorage.getItem('cursed_depths_save');
        if (saveData) {
            const data = JSON.parse(saveData);
            
            if (data.gameCompleted) {
                this.unlocked = true;
                this.modes.expert.unlocked = true;
            }
            
            if (data.expertCompleted) {
                this.modes.master.unlocked = true;
            }
            
            if (data.masterCompleted) {
                this.modes.legendary.unlocked = true;
            }
        }
    },
    
    startNewGamePlus(mode = 'expert') {
        if (!this.unlocked) {
            showFloatingText('Complete the game first!', window.innerWidth / 2, 300, '#FF4444');
            return;
        }
        
        if (!this.modes[mode].unlocked) {
            showFloatingText('Unlock this mode first!', window.innerWidth / 2, 300, '#FF4444');
            return;
        }
        
        this.currentMode = mode;
        
        // Carry over progress
        this.carryOverProgress();
        
        // Apply mode modifiers
        this.applyModeModifiers(mode);
        
        showBossMessage(`🔄 New Game+ Started: ${this.modes[mode].name}`, '#FFDD44');
    },
    
    carryOverProgress() {
        // Keep these from previous playthrough:
        const keep = {
            skillPoints: player.skillPoints,
            unlockedSkills: player.unlockedSkills,
            factionReputation: FactionSystem ? Object.assign({}, FactionSystem.factions) : {},
            collectedTrophies: TrophySystem ? player.collectedTrophies : new Set(),
            collectedBanners: TrophySystem ? player.collectedBanners : new Set(),
            cosmetics: player.cosmetics || []
        };
        
        // Reset these:
        player.x = 100;
        player.y = 100;
        player.hp = 100;
        player.maxHp = 100;
        player.inventory = [];
        player.coins = 0;
        
        // Restore kept progress
        Object.assign(player, keep);
        
        // Bonus based on mode
        if (this.currentMode === 'expert') {
            player.coins = 1000;
        } else if (this.currentMode === 'master') {
            player.coins = 5000;
            player.startWithTier2Gear = true;
        } else if (this.currentMode === 'legendary') {
            player.coins = 10000;
            player.startWithTier3Gear = true;
            this.legendaryStacks++;
        }
    },
    
    applyModeModifiers(mode) {
        const modifiers = this.modes[mode].modifiers;
        
        // Apply to enemy stats
        window.enemyDamageMultiplier = modifiers.enemyDamage || 1;
        window.enemyHealthMultiplier = modifiers.enemyHealth || 1;
        window.lootQualityMultiplier = modifiers.lootQuality || 1;
        window.coinDropMultiplier = modifiers.coinDrop || 1;
        window.rareDropMultiplier = modifiers.rareDrops || 1;
    },
    
    completeGameOnMode(mode) {
        if (mode === 'normal') {
            this.unlocked = true;
            this.modes.expert.unlocked = true;
        } else if (mode === 'expert') {
            this.modes.master.unlocked = true;
        } else if (mode === 'master') {
            this.modes.legendary.unlocked = true;
        } else if (mode === 'legendary') {
            this.legendaryStacks++;
            showBossMessage(`👑 Legendary Stacks: ${this.legendaryStacks}`, '#FFDD44');
        }
        
        this.saveProgress();
    },
    
    saveProgress() {
        const data = {
            unlocked: this.unlocked,
            currentMode: this.currentMode,
            legendaryStacks: this.legendaryStacks,
            expertUnlocked: this.modes.expert.unlocked,
            masterUnlocked: this.modes.master.unlocked,
            legendaryUnlocked: this.modes.legendary.unlocked
        };
        
        localStorage.setItem('cursed_depths_ngp', JSON.stringify(data));
    },
    
    renderModeSelect(ctx) {
        const startX = window.innerWidth / 2 - 200;
        const startY = window.innerHeight / 2 - 150;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(startX, startY, 400, 300);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Select Difficulty', window.innerWidth / 2, startY + 40);
        
        let y = startY + 80;
        
        Object.entries(this.modes).forEach(([key, mode]) => {
            const canSelect = !mode.unlockRequirement || mode.unlocked;
            
            ctx.globalAlpha = canSelect ? 1.0 : 0.5;
            ctx.fillStyle = canSelect ? '#44FF88' : '#FF4444';
            ctx.font = 'bold 18px Inter';
            ctx.fillText(mode.name, window.innerWidth / 2, y);
            
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#AAAAAA';
            ctx.font = '12px Inter';
            ctx.fillText(mode.description, window.innerWidth / 2, y + 20);
            
            y += 60;
        });
    }
};

// ===== PHASE 21: ARENA & PVP SYSTEM =====
const ArenaSystem = {
    arenas: {},
    challenges: [],
    pvpEnabled: false,
    
    init() {
        console.log('⚔️ Phase 21: Arena & PvP System initialized');
        this.defineArenas();
        this.defineChallenges();
    },
    
    defineArenas() {
        this.arenas = {
            colosseum: {
                id: 'colosseum',
                name: 'The Colosseum',
                description: 'Classic arena combat',
                size: { width: 400, height: 300 },
                hazards: [],
                waves: 10,
                enemiesPerWave: [3, 4, 5, 6, 7, 8, 10, 12, 15, 20],
                bossWave: 10,
                rewards: {
                    completion: 'colosseum_champion_title',
                    perWave: 'coins'
                }
            },
            gauntlet: {
                id: 'gauntlet',
                name: 'Endless Gauntlet',
                description: 'Survive as long as possible',
                size: { width: 300, height: 300 },
                hazards: ['spikes', 'lava_pools'],
                endless: true,
                scalingDifficulty: true,
                rewards: {
                    highScore: 'gauntlet_master_title'
                }
            },
            boss_rush: {
                id: 'boss_rush',
                name: 'Boss Rush',
                description: 'Fight all bosses sequentially',
                size: { width: 500, height: 400 },
                bosses: ['eye', 'bone', 'demon', 'hive', 'frost'],
                healingBetween: true,
                rewards: {
                    completion: 'boss_slayer_legendary'
                }
            },
            dungeon_challenge: {
                id: 'dungeon_challenge',
                name: 'Dungeon Challenge',
                description: 'Navigate deadly traps',
                size: { width: 600, height: 400 },
                hazards: ['traps', 'puzzles', 'parkour'],
                timed: true,
                rewards: {
                    speedBonus: 'dungeon_master_title'
                }
            }
        };
    },
    
    defineChallenges() {
        this.challenges = [
            {
                id: 'slime_wave',
                name: 'Slime Wave',
                description: 'Survive 5 waves of slimes',
                arena: 'colosseum',
                enemies: ['slime'],
                waves: 5,
                difficulty: 'easy',
                reward: 'slime Slayer_title'
            },
            {
                id: 'undead_army',
                name: 'Undead Army',
                description: 'Defeat 50 undead enemies',
                arena: 'colosseum',
                enemies: ['skeleton', 'zombie'],
                count: 50,
                difficulty: 'medium',
                reward: 'exorcist_title'
            },
            {
                id: 'demon_horde',
                name: 'Demon Horde',
                description: 'Survive against demons',
                arena: 'colosseum',
                enemies: ['demon', 'imp'],
                waves: 8,
                difficulty: 'hard',
                reward: 'demon_hunter_title'
            }
        ];
    },
    
    startChallenge(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) return;
        
        this.activeChallenge = {
            ...challenge,
            currentWave: 0,
            enemiesRemaining: 0,
            completed: false
        };
        
        this.startWave();
        
        showBossMessage(`⚔️ Challenge Started: ${challenge.name}`, '#FFDD44');
    },
    
    startWave() {
        if (!this.activeChallenge) return;
        
        this.activeChallenge.currentWave++;
        const wave = this.activeChallenge.currentWave;
        
        // Spawn enemies for this wave
        const enemyCount = this.activeChallenge.enemiesPerWave ? 
            this.activeChallenge.enemiesPerWave[wave - 1] : 
            this.activeChallenge.count / this.activeChallenge.waves;
        
        for (let i = 0; i < enemyCount; i++) {
            const enemyType = this.activeChallenge.enemies[Math.floor(Math.random() * this.activeChallenge.enemies.length)];
            enemies.push({
                x: Math.random() * 800,
                y: Math.random() * 600,
                type: enemyType,
                wave: wave
            });
        }
        
        this.activeChallenge.enemiesRemaining = enemyCount;
        
        showBossMessage(`Wave ${wave} Started!`, '#FF4444');
    },
    
    onEnemyDefeated(enemy) {
        if (!this.activeChallenge) return;
        
        this.activeChallenge.enemiesRemaining--;
        
        if (this.activeChallenge.enemiesRemaining <= 0) {
            if (this.activeChallenge.currentWave >= this.activeChallenge.waves) {
                this.completeChallenge();
            } else {
                setTimeout(() => this.startWave(), 3000);
            }
        }
    },
    
    completeChallenge() {
        this.activeChallenge.completed = true;
        
        const reward = this.activeChallenge.reward;
        giveReward(reward);
        
        showBossMessage(`🏆 Challenge Complete! Reward: ${reward}`, '#44FF88');
        
        this.activeChallenge = null;
    },
    
    enablePvP() {
        this.pvpEnabled = true;
        showBossMessage('⚔️ PvP Enabled!', '#FF4444');
    },
    
    disablePvP() {
        this.pvpEnabled = false;
        showBossMessage('PvP Disabled', '#AAAAAA');
    },
    
    update(dt) {
        if (this.pvpEnabled && players.length > 1) {
            this.updatePvPCombat(dt);
        }
    },
    
    updatePvPCombat(dt) {
        // Check for PvP combat
        players.forEach((p1, i) => {
            players.forEach((p2, j) => {
                if (i !== j) {
                    const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
                    
                    if (dist < 100) {
                        // In combat range
                        p1.inPvPCombat = true;
                        p2.inPvPCombat = true;
                    }
                }
            });
        });
    },
    
    renderArenaUI(ctx) {
        if (!this.activeChallenge) return;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(20, 20, 200, 100);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(`Challenge: ${this.activeChallenge.name}`, 30, 45);
        
        ctx.font = '14px Inter';
        ctx.fillText(`Wave: ${this.activeChallenge.currentWave}/${this.activeChallenge.waves}`, 30, 70);
        
        ctx.fillText(`Enemies: ${this.activeChallenge.enemiesRemaining}`, 30, 95);
    }
};

// Export globally
window.SpeedrunSystem = SpeedrunSystem;
window.NewGamePlusSystem = NewGamePlusSystem;
window.ArenaSystem = ArenaSystem;

console.log('⏱️🔄⚔️ Phases 19-21 loaded: Speedrun, NG+, Arena');
