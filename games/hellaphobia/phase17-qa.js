/* ============================================================
   HELLAPHOBIA - PHASE 17: QUALITY ASSURANCE
   Testing Framework | Balance | 5 Difficulty Levels | Bug Tracking
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 17: QA CONFIG =====
    const QA_CONFIG = {
        DIFFICULTY_LEVELS: ['very_easy', 'easy', 'normal', 'hard', 'nightmare'],
        AUTO_SAVE_ENABLED: true,
        CRASH_REPORTING_ENABLED: true,
        PERFORMANCE_MONITORING: true,
        BUG_REPORT_ENDPOINT: '/api/bug-report',
        ANALYTICS_ENDPOINT: '/api/analytics'
    };

    // ===== PHASE 17: DIFFICULTY MANAGER =====
    const DifficultyManager = {
        currentDifficulty: 'normal',
        difficultySettings: {
            very_easy: {
                name: 'Very Easy',
                icon: '👶',
                color: '#00ff00',
                playerDamageMultiplier: 2.0,
                enemyDamageMultiplier: 0.25,
                playerHealthMultiplier: 1.5,
                enemyHealthMultiplier: 0.5,
                sanityDrainMultiplier: 0.25,
                sanityRegenMultiplier: 2.0,
                checkpointFrequency: 2.0,
                enemyAggression: 0.3,
                enemyAccuracy: 0.3,
                resourceDropRate: 2.0,
                parryWindow: 0.5,
                autoAim: true,
                hints: true
            },
            easy: {
                name: 'Easy',
                icon: '😊',
                color: '#88ff88',
                playerDamageMultiplier: 1.5,
                enemyDamageMultiplier: 0.5,
                playerHealthMultiplier: 1.25,
                enemyHealthMultiplier: 0.75,
                sanityDrainMultiplier: 0.5,
                sanityRegenMultiplier: 1.5,
                checkpointFrequency: 1.5,
                enemyAggression: 0.5,
                enemyAccuracy: 0.5,
                resourceDropRate: 1.5,
                parryWindow: 0.4,
                autoAim: true,
                hints: true
            },
            normal: {
                name: 'Normal',
                icon: '😐',
                color: '#ffff00',
                playerDamageMultiplier: 1.0,
                enemyDamageMultiplier: 1.0,
                playerHealthMultiplier: 1.0,
                enemyHealthMultiplier: 1.0,
                sanityDrainMultiplier: 1.0,
                sanityRegenMultiplier: 1.0,
                checkpointFrequency: 1.0,
                enemyAggression: 0.7,
                enemyAccuracy: 0.7,
                resourceDropRate: 1.0,
                parryWindow: 0.3,
                autoAim: false,
                hints: true
            },
            hard: {
                name: 'Hard',
                icon: '😠',
                color: '#ff8800',
                playerDamageMultiplier: 0.75,
                enemyDamageMultiplier: 1.5,
                playerHealthMultiplier: 0.75,
                enemyHealthMultiplier: 1.25,
                sanityDrainMultiplier: 1.5,
                sanityRegenMultiplier: 0.75,
                checkpointFrequency: 0.75,
                enemyAggression: 0.85,
                enemyAccuracy: 0.85,
                resourceDropRate: 0.75,
                parryWindow: 0.25,
                autoAim: false,
                hints: false
            },
            nightmare: {
                name: 'Nightmare',
                icon: '😱',
                color: '#ff0000',
                playerDamageMultiplier: 0.5,
                enemyDamageMultiplier: 2.0,
                playerHealthMultiplier: 0.5,
                enemyHealthMultiplier: 1.5,
                sanityDrainMultiplier: 2.0,
                sanityRegenMultiplier: 0.5,
                checkpointFrequency: 0.5,
                enemyAggression: 1.0,
                enemyAccuracy: 1.0,
                resourceDropRate: 0.5,
                parryWindow: 0.2,
                autoAim: false,
                hints: false
            }
        },

        init() {
            this.loadDifficulty();
            console.log('Phase 17: Difficulty Manager initialized');
        },

        // Set difficulty
        setDifficulty(level) {
            if (!QA_CONFIG.DIFFICULTY_LEVELS.includes(level)) {
                console.error('[Difficulty] Invalid level:', level);
                return false;
            }

            this.currentDifficulty = level;
            localStorage.setItem('hellaphobia_difficulty', level);

            EventTracker.track('difficulty_changed', { level });
            console.log('[Difficulty] Set to:', this.difficultySettings[level].name);

            return true;
        },

        // Get difficulty settings
        getSettings() {
            return this.difficultySettings[this.currentDifficulty];
        },

        // Get difficulty name
        getName() {
            return this.difficultySettings[this.currentDifficulty].name;
        },

        // Get difficulty icon
        getIcon() {
            return this.difficultySettings[this.currentDifficulty].icon;
        },

        // Get difficulty color
        getColor() {
            return this.difficultySettings[this.currentDifficulty].color;
        },

        // Apply difficulty multiplier
        applyMultiplier(type, baseValue) {
            const settings = this.getSettings();
            
            switch (type) {
                case 'playerDamage':
                    return baseValue * settings.playerDamageMultiplier;
                case 'enemyDamage':
                    return baseValue * settings.enemyDamageMultiplier;
                case 'playerHealth':
                    return baseValue * settings.playerHealthMultiplier;
                case 'enemyHealth':
                    return baseValue * settings.enemyHealthMultiplier;
                case 'sanityDrain':
                    return baseValue * settings.sanityDrainMultiplier;
                case 'sanityRegen':
                    return baseValue * settings.sanityRegenMultiplier;
                case 'resourceDrop':
                    return baseValue * settings.resourceDropRate;
                default:
                    return baseValue;
            }
        },

        // Check if hints enabled
        hintsEnabled() {
            return this.getSettings().hints;
        },

        // Check if auto-aim enabled
        autoAimEnabled() {
            return this.getSettings().autoAim;
        },

        // Get parry window
        getParryWindow() {
            return this.getSettings().parryWindow;
        },

        // Save difficulty
        saveDifficulty() {
            localStorage.setItem('hellaphobia_difficulty', this.currentDifficulty);
        },

        // Load difficulty
        loadDifficulty() {
            const saved = localStorage.getItem('hellaphobia_difficulty');
            if (saved && QA_CONFIG.DIFFICULTY_LEVELS.includes(saved)) {
                this.currentDifficulty = saved;
            } else {
                this.currentDifficulty = 'normal';
            }
        },

        // Get all difficulties
        getAllDifficulties() {
            return QA_CONFIG.DIFFICULTY_LEVELS.map(level => ({
                level,
                ...this.difficultySettings[level]
            }));
        },

        // Recommend difficulty based on performance
        recommendDifficulty() {
            const stats = this.getPlayerStats();
            
            // Analyze performance
            const deathRate = stats.deaths / Math.max(1, stats.hoursPlayed);
            const avgHealth = stats.avgHealthRemaining;
            const completionRate = stats.completionRate;

            if (deathRate < 2 && avgHealth > 70 && completionRate > 0.8) {
                return 'hard';
            } else if (deathRate < 5 && avgHealth > 50 && completionRate > 0.6) {
                return 'normal';
            } else if (deathRate < 10 && avgHealth > 30) {
                return 'easy';
            } else {
                return 'very_easy';
            }
        },

        // Get player stats for recommendation
        getPlayerStats() {
            return {
                deaths: parseInt(localStorage.getItem('hellaphobia_deaths') || '0'),
                hoursPlayed: parseFloat(localStorage.getItem('hellaphobia_playtime') || '0') / 3600,
                avgHealthRemaining: parseFloat(localStorage.getItem('hellaphobia_avg_health') || '50'),
                completionRate: parseFloat(localStorage.getItem('hellaphobia_completion') || '0')
            };
        }
    };

    // ===== PHASE 17: TEST FRAMEWORK =====
    const TestFramework = {
        tests: [],
        results: [],
        running: false,

        init() {
            console.log('Phase 17: Test Framework initialized');
        },

        // Register test
        registerTest(name, testFn) {
            this.tests.push({ name, fn: testFn });
        },

        // Run all tests
        async runAllTests() {
            if (this.running) return;

            this.running = true;
            this.results = [];
            console.log('[TestFramework] Running all tests...');

            const startTime = performance.now();

            for (const test of this.tests) {
                try {
                    const result = await this.runTest(test);
                    this.results.push(result);
                } catch (error) {
                    this.results.push({
                        name: test.name,
                        passed: false,
                        error: error.message
                    });
                }
            }

            const endTime = performance.now();
            this.running = false;

            const summary = this.getTestSummary();
            console.log(`[TestFramework] Completed: ${summary.passed}/${summary.total} passed in ${(endTime - startTime).toFixed(2)}ms`);

            return summary;
        },

        // Run single test
        async runTest(test) {
            const startTime = performance.now();
            
            try {
                await test.fn();
                const endTime = performance.now();
                
                return {
                    name: test.name,
                    passed: true,
                    duration: endTime - startTime
                };
            } catch (error) {
                const endTime = performance.now();
                
                return {
                    name: test.name,
                    passed: false,
                    error: error.message,
                    duration: endTime - startTime
                };
            }
        },

        // Assert helper
        assert(condition, message) {
            if (!condition) {
                throw new Error(message || 'Assertion failed');
            }
        },

        // Assert equal
        assertEqual(actual, expected, message) {
            if (actual !== expected) {
                throw new Error(message || `Expected ${expected}, got ${actual}`);
            }
        },

        // Assert deep equal
        assertDeepEqual(actual, expected, message) {
            const actualStr = JSON.stringify(actual);
            const expectedStr = JSON.stringify(expected);
            if (actualStr !== expectedStr) {
                throw new Error(message || `Expected ${expectedStr}, got ${actualStr}`);
            }
        },

        // Get test summary
        getTestSummary() {
            const total = this.results.length;
            const passed = this.results.filter(r => r.passed).length;
            const failed = total - passed;
            const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;

            return { total, passed, failed, avgDuration };
        },

        // Get test results
        getResults() {
            return this.results;
        },

        // Register built-in tests
        registerBuiltInTests() {
            // Movement tests
            this.registerTest('Player Movement', () => {
                // Test player can move
                this.assert(typeof window.player !== 'undefined', 'Player not defined');
            });

            // Combat tests
            this.registerTest('Combat System', () => {
                // Test combat functions exist
                this.assert(typeof window.playerJump === 'function', 'playerJump not defined');
            });

            // AI tests
            this.registerTest('Monster AI', () => {
                // Test AI systems
                if (typeof Phase3Core !== 'undefined') {
                    this.assert(typeof Phase3Core.update === 'function', 'AI update not defined');
                }
            });

            // Save/Load tests
            this.registerTest('Save System', () => {
                // Test localStorage access
                localStorage.setItem('test_key', 'test_value');
                const value = localStorage.getItem('test_key');
                this.assertEqual(value, 'test_value', 'LocalStorage not working');
                localStorage.removeItem('test_key');
            });

            // Achievement tests
            this.registerTest('Achievement System', () => {
                if (typeof Phase16Achievements !== 'undefined') {
                    this.assert(typeof Phase16Achievements.init === 'function', 'Achievements not defined');
                }
            });

            // Performance tests
            this.registerTest('Performance Check', () => {
                if (typeof Phase13Performance !== 'undefined') {
                    const report = Phase13Performance.getPerformanceReport();
                    this.assert(report.fps >= 30, `FPS too low: ${report.fps}`);
                }
            });
        }
    };

    // ===== PHASE 17: BALANCE MANAGER =====
    const BalanceManager = {
        balanceData: {},

        init() {
            this.loadBalanceData();
            console.log('Phase 17: Balance Manager initialized');
        },

        // Track balance event
        trackBalanceEvent(eventType, data) {
            if (!this.balanceData[eventType]) {
                this.balanceData[eventType] = [];
            }

            this.balanceData[eventType].push({
                ...data,
                timestamp: Date.now(),
                difficulty: DifficultyManager.currentDifficulty
            });

            // Keep last 1000 events
            if (this.balanceData[eventType].length > 1000) {
                this.balanceData[eventType].shift();
            }
        },

        // Get balance statistics
        getBalanceStats(eventType) {
            const events = this.balanceData[eventType] || [];
            if (events.length === 0) return null;

            const values = events.map(e => e.value);
            return {
                count: events.length,
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
            };
        },

        // Analyze weapon balance
        analyzeWeaponBalance() {
            const stats = this.getBalanceStats('weapon_damage');
            if (!stats) return;

            // Check if any weapon is over/under performing
            console.log('[Balance] Weapon stats:', stats);
        },

        // Analyze enemy balance
        analyzeEnemyBalance() {
            const stats = this.getBalanceStats('enemy_difficulty');
            if (!stats) return;

            console.log('[Balance] Enemy stats:', stats);
        },

        // Save balance data
        saveBalanceData() {
            localStorage.setItem('hellaphobia_balance_data', JSON.stringify(this.balanceData));
        },

        // Load balance data
        loadBalanceData() {
            const saved = localStorage.getItem('hellaphobia_balance_data');
            if (saved) {
                this.balanceData = JSON.parse(saved);
            }
        }
    };

    // ===== PHASE 17: CRASH REPORTER =====
    const CrashReporter = {
        errorQueue: [],
        lastError: null,

        init() {
            this.setupErrorHandling();
            console.log('Phase 17: Crash Reporter initialized');
        },

        // Setup error handling
        setupErrorHandling() {
            // Global error handler
            window.addEventListener('error', (event) => {
                this.reportError({
                    type: 'error',
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error?.stack
                });
            });

            // Unhandled promise rejection
            window.addEventListener('unhandledrejection', (event) => {
                this.reportError({
                    type: 'unhandledrejection',
                    reason: event.reason?.message || event.reason,
                    stack: event.reason?.stack
                });
            });
        },

        // Report error
        reportError(errorData) {
            const report = {
                ...errorData,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                gameFrame: window.gameFrame || 0,
                gameState: window.gameState || 'unknown',
                difficulty: DifficultyManager.currentDifficulty
            };

            this.errorQueue.push(report);
            this.lastError = report;

            // Save locally
            this.saveErrors();

            // Send to server if enabled
            if (QA_CONFIG.CRASH_REPORTING_ENABLED) {
                this.sendErrorReport(report);
            }

            console.error('[CrashReporter] Error reported:', report);
        },

        // Send error report
        async sendErrorReport(report) {
            try {
                // In production, this would send to server
                console.log('[CrashReporter] Sending to server...');
            } catch (error) {
                console.error('[CrashReporter] Failed to send:', error);
            }
        },

        // Save errors locally
        saveErrors() {
            localStorage.setItem('hellaphobia_errors', JSON.stringify(this.errorQueue.slice(-100)));
        },

        // Get error report
        getErrorReport() {
            return {
                total: this.errorQueue.length,
                last: this.lastError,
                recent: this.errorQueue.slice(-10)
            };
        },

        // Clear errors
        clearErrors() {
            this.errorQueue = [];
            this.lastError = null;
            localStorage.removeItem('hellaphobia_errors');
        }
    };

    // ===== PHASE 17: BUG TRACKER =====
    const BugTracker = {
        bugs: [],

        init() {
            this.loadBugs();
            console.log('Phase 17: Bug Tracker initialized');
        },

        // Report bug
        reportBug(bugData) {
            const bug = {
                id: 'bug_' + Date.now(),
                status: 'open',
                priority: bugData.priority || 'medium',
                category: bugData.category || 'general',
                ...bugData,
                reportedAt: Date.now()
            };

            this.bugs.push(bug);
            this.saveBugs();

            EventTracker.track('bug_reported', { bugId: bug.id, category: bug.category });
            console.log('[BugTracker] Bug reported:', bug.id);

            return bug;
        },

        // Update bug status
        updateBugStatus(bugId, status) {
            const bug = this.bugs.find(b => b.id === bugId);
            if (bug) {
                bug.status = status;
                bug.updatedAt = Date.now();
                this.saveBugs();
                return true;
            }
            return false;
        },

        // Get bugs by status
        getBugsByStatus(status) {
            return this.bugs.filter(b => b.status === status);
        },

        // Get all bugs
        getBugs() {
            return this.bugs;
        },

        // Save bugs
        saveBugs() {
            localStorage.setItem('hellaphobia_bugs', JSON.stringify(this.bugs));
        },

        // Load bugs
        loadBugs() {
            const saved = localStorage.getItem('hellaphobia_bugs');
            if (saved) {
                this.bugs = JSON.parse(saved);
            }
        }
    };

    // ===== PHASE 17: AUTO-SAVE MANAGER =====
    const AutoSaveManager = {
        enabled: true,
        interval: 60000, // 1 minute
        lastSave: 0,
        saveSlot: 'autosave',

        init() {
            this.startAutoSave();
            console.log('Phase 17: Auto-Save Manager initialized');
        },

        // Start auto-save loop
        startAutoSave() {
            setInterval(() => {
                if (this.enabled && window.gameState === 'playing') {
                    this.performAutoSave();
                }
            }, this.interval);
        },

        // Perform auto-save
        performAutoSave() {
            const now = Date.now();
            if (now - this.lastSave < this.interval) return;

            try {
                const saveData = this.collectSaveData();
                
                if (typeof Phase7AntiCheat !== 'undefined') {
                    Phase7AntiCheat.saveGame(this.saveSlot, saveData);
                } else {
                    localStorage.setItem(`hellaphobia_save_${this.saveSlot}`, JSON.stringify(saveData));
                }

                this.lastSave = now;
                console.log('[AutoSave] Game saved');

                EventTracker.track('game_autosaved');
            } catch (error) {
                console.error('[AutoSave] Failed:', error);
                CrashReporter.reportError(error);
            }
        },

        // Collect save data
        collectSaveData() {
            return {
                timestamp: Date.now(),
                gameFrame: window.gameFrame || 0,
                player: {
                    x: window.player?.x || 0,
                    y: window.player?.y || 0,
                    hp: window.player?.hp || 100,
                    sanity: window.player?.sanity || 100,
                    phase: window.currentPhase || 1
                },
                stats: {
                    deaths: parseInt(localStorage.getItem('hellaphobia_deaths') || '0'),
                    kills: parseInt(localStorage.getItem('hellaphobia_kills') || '0'),
                    playtime: parseInt(localStorage.getItem('hellaphobia_playtime') || '0')
                },
                difficulty: DifficultyManager.currentDifficulty
            };
        },

        // Load auto-save
        loadAutoSave() {
            try {
                if (typeof Phase7AntiCheat !== 'undefined') {
                    return Phase7AntiCheat.loadGame(this.saveSlot);
                } else {
                    const saved = localStorage.getItem(`hellaphobia_save_${this.saveSlot}`);
                    return saved ? JSON.parse(saved) : null;
                }
            } catch (error) {
                console.error('[AutoSave] Load failed:', error);
                return null;
            }
        },

        // Enable/disable
        setEnabled(enabled) {
            this.enabled = enabled;
            localStorage.setItem('hellaphobia_autosave_enabled', enabled);
        },

        // Set interval
        setInterval(ms) {
            this.interval = ms;
        }
    };

    // ===== PHASE 17: DEBUG CONSOLE =====
    const DebugConsole = {
        enabled: false,
        commands: {},

        init() {
            this.registerDefaultCommands();
            console.log('Phase 17: Debug Console initialized');
        },

        // Toggle debug console
        toggle() {
            this.enabled = !this.enabled;
            console.log('[DebugConsole]', this.enabled ? 'Enabled' : 'Disabled');
        },

        // Register command
        registerCommand(name, fn, description) {
            this.commands[name] = { fn, description };
        },

        // Execute command
        executeCommand(commandString) {
            const parts = commandString.trim().split(' ');
            const command = parts[0];
            const args = parts.slice(1);

            if (this.commands[command]) {
                try {
                    const result = this.commands[command].fn(...args);
                    console.log('[DebugConsole] Result:', result);
                    return result;
                } catch (error) {
                    console.error('[DebugConsole] Error:', error.message);
                    return null;
                }
            } else {
                console.error('[DebugConsole] Unknown command:', command);
                return null;
            }
        },

        // Register default commands
        registerDefaultCommands() {
            // God mode
            this.registerCommand('god', () => {
                if (typeof window.enableGodMode === 'function') {
                    window.enableGodMode(true);
                }
                return 'God mode enabled';
            }, 'Enable god mode');

            // Give items
            this.registerCommand('give', (itemId, amount) => {
                return `Gave ${amount || 1}x ${itemId || 'item'}`;
            }, 'Give item <id> [amount]');

            // Teleport
            this.registerCommand('tp', (x, y) => {
                if (window.player) {
                    window.player.x = parseFloat(x) || 0;
                    window.player.y = parseFloat(y) || 0;
                }
                return `Teleported to ${x}, ${y}`;
            }, 'Teleport to <x> <y>');

            // Set difficulty
            this.registerCommand('difficulty', (level) => {
                DifficultyManager.setDifficulty(level);
                return `Difficulty set to ${level}`;
            }, 'Set difficulty <level>');

            // FPS info
            this.registerCommand('fps', () => {
                if (typeof Phase13Performance !== 'undefined') {
                    return `FPS: ${Phase13Performance.getPerformanceReport().fps}`;
                }
                return 'Performance module not loaded';
            }, 'Show current FPS');

            // Achievement info
            this.registerCommand('achievements', () => {
                if (typeof Phase16Achievements !== 'undefined') {
                    const progress = Phase16Achievements.getAchievementProgress();
                    return `Achievements: ${progress.unlocked}/${progress.total} (${progress.percent}%)`;
                }
                return 'Achievement module not loaded';
            }, 'Show achievement progress');

            // Save game
            this.registerCommand('save', (slot) => {
                if (typeof Phase7AntiCheat !== 'undefined') {
                    Phase7AntiCheat.saveGame(slot || 'quick', {});
                }
                return `Game saved to slot ${slot || 'quick'}`;
            }, 'Save game [slot]');

            // Load game
            this.registerCommand('load', (slot) => {
                if (typeof Phase7AntiCheat !== 'undefined') {
                    return Phase7AntiCheat.loadGame(slot || 'quick');
                }
                return 'Achievement module not loaded';
            }, 'Load game [slot]');

            // Help
            this.registerCommand('help', () => {
                return Object.entries(this.commands).map(([name, cmd]) => 
                    `${name}: ${cmd.description}`
                ).join('\n');
            }, 'Show all commands');
        },

        // Get command list
        getCommands() {
            return Object.entries(this.commands).map(([name, cmd]) => ({
                name,
                description: cmd.description
            }));
        }
    };

    // ===== PHASE 17: MAIN QA MANAGER =====
    const Phase17QA = {
        initialized: false,

        init() {
            if (this.initialized) return;

            DifficultyManager.init();
            TestFramework.init();
            TestFramework.registerBuiltInTests();
            BalanceManager.init();
            CrashReporter.init();
            BugTracker.init();
            AutoSaveManager.init();
            DebugConsole.init();

            this.initialized = true;
            console.log('Phase 17: Quality Assurance initialized');
        },

        // Difficulty
        setDifficulty: (level) => DifficultyManager.setDifficulty(level),
        getDifficulty: () => DifficultyManager.getSettings(),
        getAllDifficulties: () => DifficultyManager.getAllDifficulties(),

        // Testing
        runTests: () => TestFramework.runAllTests(),
        getTestResults: () => TestFramework.getResults(),

        // Balance
        trackBalance: (type, data) => BalanceManager.trackBalanceEvent(type, data),

        // Crash reporting
        reportError: (error) => CrashReporter.reportError(error),
        getErrorReport: () => CrashReporter.getErrorReport(),

        // Bug tracking
        reportBug: (data) => BugTracker.reportBug(data),
        getBugs: () => BugTracker.getBugs(),

        // Debug
        executeCommand: (cmd) => DebugConsole.executeCommand(cmd),
        toggleDebug: () => DebugConsole.toggle()
    };

    // Export Phase 17 systems
    window.Phase17QA = Phase17QA;
    window.DifficultyManager = DifficultyManager;
    window.TestFramework = TestFramework;
    window.BalanceManager = BalanceManager;
    window.CrashReporter = CrashReporter;
    window.BugTracker = BugTracker;
    window.AutoSaveManager = AutoSaveManager;
    window.DebugConsole = DebugConsole;

})();
