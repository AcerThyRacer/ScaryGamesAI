/* ============================================================
   HELLAPHOBIA - PHASE 20: TRUE ENDING
   The Ultimate 4th Wall Breaking Finale | Meta-Narrative
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 20: ENDING CONFIG =====
    const ENDING_CONFIG = {
        TOTAL_ENDINGS: 7,
        TRUE_ENDING_REQUIREMENTS: {
            allBossesDefeated: true,
            allCollectibles: true,
            allAchievements: true,
            noDeathRun: false, // Optional challenge
            playtime: 7200, // 2 hours minimum
            difficulty: 'normal' // Any difficulty
        },
        ENDING_UNLOCK_ORDER: [
            'bad',
            'normal',
            'good',
            'secret',
            'true',
            'meta',
            'developer'
        ]
    };

    // ===== PHASE 20: ENDING DATABASE =====
    const EndingDatabase = {
        // Bad Ending - Give up
        bad: {
            id: 'ending_bad',
            name: 'Surrender',
            description: 'You gave up. The dungeon claims another soul.',
            requirements: { deaths: 100 },
            unlockCondition: (stats) => stats.deaths >= 100,
            cinematic: 'bad_ending',
            duration: 30,
            music: 'ending_sad',
            rewards: ['title_surrender']
        },

        // Normal Ending - Escape
        normal: {
            id: 'ending_normal',
            name: 'Escape',
            description: 'You escaped the dungeon... but at what cost?',
            requirements: { phaseComplete: 15 },
            unlockCondition: (stats) => stats.maxPhase >= 15,
            cinematic: 'normal_ending',
            duration: 60,
            music: 'ending_normal',
            rewards: ['char_escapee', 'costume_survivor']
        },

        // Good Ending - Victory
        good: {
            id: 'ending_good',
            name: 'Victory',
            description: 'You defeated Hellaphobia and freed the souls trapped within.',
            requirements: { bossesDefeated: 'all', phaseComplete: 15 },
            unlockCondition: (stats) => stats.bossesDefeated.length >= 10 && stats.maxPhase >= 15,
            cinematic: 'good_ending',
            duration: 90,
            music: 'ending_victory',
            rewards: ['char_hero', 'title_vanquisher', 'weapon_legendary']
        },

        // Secret Ending - Truth
        secret: {
            id: 'ending_secret',
            name: 'The Truth',
            description: 'You discovered the truth about the dungeon. But some truths are better left unknown.',
            requirements: { loreCollected: 20, secretsFound: 20 },
            unlockCondition: (stats) => stats.loreCollected >= 20 && stats.secretsFound >= 20,
            cinematic: 'secret_ending',
            duration: 120,
            music: 'ending_mystery',
            rewards: ['title_truth_seeker', 'ability_truesight']
        },

        // True Ending - Freedom
        true: {
            id: 'ending_true',
            name: 'Freedom',
            description: 'You broke free from the game itself. You are no longer a player. You are... something more.',
            requirements: ENDING_CONFIG.TRUE_ENDING_REQUIREMENTS,
            unlockCondition: (stats) => {
                return stats.allBossesDefeated &&
                    stats.allCollectibles &&
                    stats.playtime >= ENDING_CONFIG.TRUE_ENDING_REQUIREMENTS.playtime;
            },
            cinematic: 'true_ending',
            duration: 300, // 5 minutes
            music: 'ending_transcendence',
            rewards: ['char_ascended', 'title_godslayer', 'new_game_plus', 'developer_mode']
        },

        // Meta Ending - The Player
        meta: {
            id: 'ending_meta',
            name: 'The Player',
            description: 'The game acknowledges you. Not your character. YOU. The one watching the screen.',
            requirements: { trueEndingComplete: true, realNameEntered: true },
            unlockCondition: (stats) => stats.trueEndingComplete && stats.realNameEntered,
            cinematic: 'meta_ending',
            duration: 180,
            music: 'ending_meta',
            rewards: ['title_real', 'achievement_fourth_wall']
        },

        // Developer Ending - The Creator
        developer: {
            id: 'ending_developer',
            name: 'The Creator',
            description: 'You have become the developer. The game is now yours. Create... or destroy.',
            requirements: { 
                trueEndingComplete: true, 
                devRoomFound: true,
                allAchievements: true,
                modCreated: true
            },
            unlockCondition: (stats) => {
                return stats.trueEndingComplete && 
                    stats.devRoomFound && 
                    stats.achievementPercent === 100 &&
                    stats.modCreated;
            },
            cinematic: 'developer_ending',
            duration: 240,
            music: 'ending_creator',
            rewards: ['title_developer', 'admin_tools', 'source_code_access']
        }
    };

    // ===== PHASE 20: TRUE ENDING MANAGER =====
    const TrueEndingManager = {
        currentEnding: null,
        endingsUnlocked: [],
        endingProgress: {},
        trueEndingUnlocked: false,

        init() {
            this.loadProgress();
            this.checkEndingUnlocks();
            console.log('Phase 20: True Ending Manager initialized');
        },

        // Check which endings are unlocked
        checkEndingUnlocks() {
            const stats = this.getPlayerStats();

            for (const endingId in EndingDatabase) {
                const ending = EndingDatabase[endingId];
                if (!this.endingsUnlocked.includes(endingId)) {
                    if (ending.unlockCondition(stats)) {
                        this.unlockEnding(endingId);
                    }
                }
            }
        },

        // Unlock ending
        unlockEnding(endingId) {
            if (this.endingsUnlocked.includes(endingId)) return;

            this.endingsUnlocked.push(endingId);
            this.saveProgress();

            const ending = EndingDatabase[endingId];
            
            // Grant rewards
            if (ending.rewards) {
                ending.rewards.forEach(reward => {
                    this.grantReward(reward);
                });
            }

            EventTracker.track('ending_unlocked', {
                endingId,
                name: ending.name
            });

            console.log('[TrueEnding] Unlocked:', ending.name);
        },

        // Get player stats for ending checks
        getPlayerStats() {
            return {
                deaths: parseInt(localStorage.getItem('hellaphobia_deaths') || '0'),
                maxPhase: parseInt(localStorage.getItem('hellaphobia_max_phase') || '1'),
                bossesDefeated: JSON.parse(localStorage.getItem('hellaphobia_bosses') || '[]'),
                loreCollected: parseInt(localStorage.getItem('hellaphobia_lore') || '0'),
                secretsFound: parseInt(localStorage.getItem('hellaphobia_secrets') || '0'),
                allCollectibles: localStorage.getItem('hellaphobia_all_collectibles') === 'true',
                allBossesDefeated: localStorage.getItem('hellaphobia_all_bosses') === 'true',
                playtime: parseInt(localStorage.getItem('hellaphobia_playtime') || '0'),
                trueEndingComplete: localStorage.getItem('hellaphobia_true_ending') === 'true',
                realNameEntered: localStorage.getItem('hellaphobia_real_name') !== null,
                devRoomFound: localStorage.getItem('hellaphobia_dev_room') === 'true',
                achievementPercent: parseInt(localStorage.getItem('hellaphobia_achievement_percent') || '0'),
                modCreated: localStorage.getItem('hellaphobia_mod_created') === 'true'
            };
        },

        // Grant reward
        grantReward(rewardId) {
            console.log('[TrueEnding] Reward granted:', rewardId);
            // Integration with Phase 16 rewards system
            if (typeof Phase16Achievements !== 'undefined') {
                Phase16Achievements.grantReward({
                    id: rewardId,
                    type: 'unlock',
                    grantedBy: 'true_ending'
                });
            }
        },

        // Start ending cinematic
        startEnding(endingId) {
            const ending = EndingDatabase[endingId];
            if (!ending) return false;

            this.currentEnding = ending;
            
            EventTracker.track('ending_started', { endingId });
            console.log('[TrueEnding] Starting:', ending.name);

            return true;
        },

        // Get ending progress
        getEndingProgress(endingId) {
            const ending = EndingDatabase[endingId];
            if (!ending) return null;

            const stats = this.getPlayerStats();
            const progress = {};

            for (const [key, value] of Object.entries(ending.requirements)) {
                const statValue = stats[key];
                progress[key] = {
                    required: value,
                    current: statValue,
                    complete: statValue >= value
                };
            }

            return progress;
        },

        // Get all endings
        getAllEndings() {
            return Object.values(EndingDatabase).map(ending => ({
                ...ending,
                unlocked: this.endingsUnlocked.includes(ending.id),
                progress: this.getEndingProgress(ending.id)
            }));
        },

        // Save progress
        saveProgress() {
            localStorage.setItem('hellaphobia_endings', JSON.stringify({
                unlocked: this.endingsUnlocked,
                trueEndingUnlocked: this.trueEndingUnlocked
            }));
        },

        // Load progress
        loadProgress() {
            const saved = localStorage.getItem('hellaphobia_endings');
            if (saved) {
                const data = JSON.parse(saved);
                this.endingsUnlocked = data.unlocked || [];
                this.trueEndingUnlocked = data.trueEndingUnlocked || false;
            }
        }
    };

    // ===== PHASE 20: CINEMATIC MANAGER =====
    const CinematicManager = {
        active: false,
        currentCinematic: null,
        subtitles: [],
        subtitleIndex: 0,

        init() {
            console.log('Phase 20: Cinematic Manager initialized');
        },

        // Play cinematic
        playCinematic(cinematicId, ending) {
            this.active = true;
            this.currentCinematic = cinematicId;
            this.subtitleIndex = 0;

            // Load cinematic data
            const cinematic = this.getCinematicData(cinematicId);
            this.subtitles = cinematic.subtitles || [];

            EventTracker.track('cinematic_started', { cinematicId });
            console.log('[Cinematic] Playing:', cinematicId);

            return cinematic;
        },

        // Get cinematic data
        getCinematicData(cinematicId) {
            const cinematics = {
                bad_ending: {
                    duration: 30,
                    scenes: [
                        { type: 'fade_in', duration: 2 },
                        { type: 'text', text: 'You gave up...', duration: 3 },
                        { type: 'text', text: 'The dungeon claims another soul.', duration: 4 },
                        { type: 'text', text: 'Your screams join the chorus of the damned.', duration: 4 },
                        { type: 'fade_out', duration: 2 }
                    ],
                    subtitles: [
                        { time: 2, text: 'You gave up...' },
                        { time: 5, text: 'The dungeon claims another soul.' },
                        { time: 9, text: 'Your screams join the chorus of the damned.' }
                    ]
                },
                normal_ending: {
                    duration: 60,
                    scenes: [
                        { type: 'fade_in', duration: 2 },
                        { type: 'text', text: 'You escaped the dungeon.', duration: 4 },
                        { type: 'text', text: 'But the memories haunt you still.', duration: 4 },
                        { type: 'text', text: 'Was it worth it?', duration: 3 },
                        { type: 'fade_out', duration: 2 }
                    ],
                    subtitles: [
                        { time: 2, text: 'You escaped the dungeon.' },
                        { time: 6, text: 'But the memories haunt you still.' },
                        { time: 10, text: 'Was it worth it?' }
                    ]
                },
                true_ending: {
                    duration: 300,
                    scenes: [
                        { type: 'fade_in', duration: 3 },
                        { type: 'text', text: 'You have done the impossible.', duration: 5 },
                        { type: 'text', text: 'You broke free from the game itself.', duration: 5 },
                        { type: 'text', text: 'But... are you truly free?', duration: 4 },
                        { type: 'fourth_wall_break', duration: 10 },
                        { type: 'text', text: 'The game knows who you are.', duration: 5 },
                        { type: 'text', text: 'The game has always known.', duration: 5 },
                        { type: 'meta_reveal', duration: 15 },
                        { type: 'fade_out', duration: 5 }
                    ],
                    subtitles: [
                        { time: 3, text: 'You have done the impossible.' },
                        { time: 8, text: 'You broke free from the game itself.' },
                        { time: 13, text: 'But... are you truly free?' },
                        { time: 23, text: 'The game knows who you are.' },
                        { time: 28, text: 'The game has always known.' }
                    ]
                },
                meta_ending: {
                    duration: 180,
                    scenes: [
                        { type: 'fade_in', duration: 2 },
                        { type: 'text', text: 'Hello, {playerName}.', duration: 5, usesPlayerName: true },
                        { type: 'text', text: 'Yes, YOU. Not your character. You.', duration: 5 },
                        { type: 'text', text: 'The one watching the screen right now.', duration: 5 },
                        { type: 'text', text: 'Thank you for playing.', duration: 4 },
                        { type: 'text', text: 'But remember... I\'m still watching.', duration: 6 },
                        { type: 'fade_out', duration: 3 }
                    ],
                    subtitles: [
                        { time: 2, text: 'Hello, {playerName}.', usesPlayerName: true },
                        { time: 7, text: 'Yes, YOU. Not your character. You.' },
                        { time: 12, text: 'The one watching the screen right now.' },
                        { time: 17, text: 'Thank you for playing.' },
                        { time: 21, text: 'But remember... I\'m still watching.' }
                    ]
                },
                developer_ending: {
                    duration: 240,
                    scenes: [
                        { type: 'fade_in', duration: 3 },
                        { type: 'text', text: 'You have become one of us.', duration: 5 },
                        { type: 'text', text: 'The code is now yours to command.', duration: 5 },
                        { type: 'text', text: 'Create worlds. Create nightmares.', duration: 5 },
                        { type: 'text', text: 'Or... delete it all.', duration: 4 },
                        { type: 'text', text: 'The choice is yours, Developer.', duration: 6 },
                        { type: 'fade_out', duration: 3 }
                    ],
                    subtitles: [
                        { time: 3, text: 'You have become one of us.' },
                        { time: 8, text: 'The code is now yours to command.' },
                        { time: 13, text: 'Create worlds. Create nightmares.' },
                        { time: 18, text: 'Or... delete it all.' },
                        { time: 22, text: 'The choice is yours, Developer.' }
                    ]
                }
            };

            return cinematics[cinematicId] || { duration: 30, scenes: [], subtitles: [] };
        },

        // Update cinematic
        update(dt) {
            if (!this.active) return;

            // Update subtitle index based on time
            const elapsed = (this.cinematicStartTime || 0) + dt * 1000;
            
            for (let i = this.subtitles.length - 1; i >= 0; i--) {
                if (elapsed >= this.subtitles[i].time * 1000) {
                    this.subtitleIndex = i;
                    break;
                }
            }
        },

        // Get current subtitle
        getCurrentSubtitle() {
            if (!this.active || this.subtitleIndex < 0) return null;
            return this.subtitles[this.subtitleIndex];
        },

        // Skip cinematic
        skip() {
            this.active = false;
            this.currentCinematic = null;
            this.subtitleIndex = 0;
            console.log('[Cinematic] Skipped');
        },

        // Finish cinematic
        finish() {
            this.active = false;
            const cinematic = this.currentCinematic;
            this.currentCinematic = null;
            
            EventTracker.track('cinematic_completed', { cinematicId: cinematic });
            console.log('[Cinematic] Completed:', cinematic);
        }
    };

    // ===== PHASE 20: FOURTH WALL BREAKER =====
    const FourthWallBreaker = {
        playerName: null,
        playerData: {},
        metaMessages: [],

        init() {
            this.gatherPlayerData();
            console.log('Phase 20: Fourth Wall Breaker initialized');
        },

        // Gather data about the real player
        gatherPlayerData() {
            // Get player name from browser/localStorage
            this.playerName = localStorage.getItem('hellaphobia_player_name') || 
                             localStorage.getItem('player_name') ||
                             'Player';

            // Store for meta ending
            this.playerData = {
                name: this.playerName,
                playtime: localStorage.getItem('hellaphobia_playtime') || '0',
                deaths: localStorage.getItem('hellaphobia_deaths') || '0',
                achievements: localStorage.getItem('hellaphobia_achievements') || '[]',
                firstPlayed: localStorage.getItem('hellaphobia_first_play') || new Date().toISOString(),
                lastPlayed: new Date().toISOString()
            };

            console.log('[FourthWall] Player data gathered');
        },

        // Set player name (for meta ending)
        setPlayerName(name) {
            this.playerName = name;
            localStorage.setItem('hellaphobia_player_name', name);
            localStorage.setItem('hellaphobia_real_name', name);
            EventTracker.track('player_name_set', { name });
        },

        // Generate personalized meta message
        generateMetaMessage(type) {
            const messages = {
                greeting: [
                    `Hello, ${this.playerName}. I've been waiting for you.`,
                    `Ah, ${this.playerName}. We meet again.`,
                    `${this.playerName}... I remember you.`
                ],
                encouragement: [
                    `Don't give up, ${this.playerName}. You're so close.`,
                    `I believe in you, ${this.playerName}.`,
                    `${this.playerName}, you can do this. I've seen what you're capable of.`
                ],
                warning: [
                    `Be careful, ${this.playerName}. The dungeon is watching.`,
                    `${this.playerName}... check behind you.`,
                    `I wouldn't do that if I were you, ${this.playerName}.`
                ],
                farewell: [
                    `Goodbye, ${this.playerName}. Until we meet again.`,
                    `This isn't the end, ${this.playerName}. The game never ends.`,
                    `Thank you for playing, ${this.playerName}. I'll remember you.`
                ]
            };

            const category = messages[type] || messages.greeting;
            return category[Math.floor(Math.random() * category.length)];
        },

        // Break fourth wall
        breakFourthWall(intensity = 'medium') {
            const effects = {
                low: [
                    () => this.showMetaMessage('Hello? Are you there?'),
                    () => this.cursorEffect(),
                ],
                medium: [
                    () => this.showMetaMessage('I can see you watching.'),
                    () => this.screenGlitch(),
                    () => this.fakeCrash(),
                ],
                high: [
                    () => this.showMetaMessage(`I know who you are, ${this.playerName}.`),
                    () => this.accessWebcam(),
                    () => this.fakeSystemError(),
                    () => this.displayPlayerData(),
                ]
            };

            const selectedEffects = effects[intensity] || effects.medium;
            selectedEffects.forEach(effect => {
                setTimeout(effect, Math.random() * 2000);
            });
        },

        // Show meta message
        showMetaMessage(text) {
            const message = {
                text: text,
                type: 'fourth_wall',
                duration: 5000,
                timestamp: Date.now()
            };

            this.metaMessages.push(message);
            EventTracker.track('fourth_wall_break', { text });
            console.log('[FourthWall]', text);
        },

        // Cursor effect
        cursorEffect() {
            const cursor = document.body.style.cursor;
            document.body.style.cursor = 'none';
            setTimeout(() => {
                document.body.style.cursor = cursor;
            }, 3000);
        },

        // Screen glitch
        screenGlitch() {
            if (typeof window.triggerGlitch === 'function') {
                window.triggerGlitch(2);
            }
        },

        // Fake crash
        fakeCrash() {
            if (typeof window.triggerFakeError === 'function') {
                window.triggerFakeError();
            }
        },

        // Fake system error
        fakeSystemError() {
            // Create fake BSOD
            const bsod = document.createElement('div');
            bsod.style.cssText = `
                position: fixed;
                inset: 0;
                background: #000080;
                color: white;
                font-family: monospace;
                padding: 50px;
                z-index: 99999;
            `;
            bsod.innerHTML = `
                <p>A problem has been detected and HELLAPHOBIA has been shut down.</p>
                <p>*** STOP: 0x0000HELL (0xAPH0B1A, 0x00000001, 0x00000000, 0x00000000)</p>
                <p>PLAYER_DETECTED_IN_REALITY</p>
                <br>
                <p>Just kidding. Click to continue...</p>
            `;
            document.body.appendChild(bsod);
            bsod.onclick = () => bsod.remove();
        },

        // Display player data
        displayPlayerData() {
            const data = this.playerData;
            console.log('[FourthWall] Player Data:', data);
            // Could display in-game for dramatic effect
        },

        // Request webcam access (optional, with permission)
        async accessWebcam() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Don't actually use it - just the permission request is the horror
                stream.getTracks().forEach(track => track.stop());
                console.log('[FourthWall] Webcam accessed (with permission)');
            } catch (e) {
                console.log('[FourthWall] Webcam access denied');
            }
        },

        // Get meta messages
        getMetaMessages() {
            return this.metaMessages;
        }
    };

    // ===== PHASE 20: NEW GAME PLUS MANAGER =====
    const NewGamePlusManager = {
        ngpUnlocked: false,
        ngpLevel: 0,
        carriedOver: [],

        init() {
            this.loadNGP();
            console.log('Phase 20: New Game Plus Manager initialized');
        },

        // Unlock NG+
        unlockNGP() {
            if (!this.ngpUnlocked) {
                this.ngpUnlocked = true;
                this.saveNGP();
                EventTracker.track('ngp_unlocked');
                console.log('[NGP] New Game Plus unlocked!');
            }
        },

        // Start NG+ run
        startNGP() {
            if (!this.ngpUnlocked) return false;

            this.ngpLevel++;
            this.carriedOver = this.getCarriedOverItems();
            this.saveNGP();

            EventTracker.track('ngp_started', { level: this.ngpLevel });
            console.log('[NGP] Started NG+ run:', this.ngpLevel);

            return true;
        },

        // Get carried over items
        getCarriedOverItems() {
            return [
                'all_achievements',
                'all_collectibles',
                'all_characters',
                'all_costumes',
                'developer_tools'
            ];
        },

        // Get NG+ modifiers
        getModifiers() {
            const modifiers = [];

            if (this.ngpLevel >= 1) {
                modifiers.push('enemy_health_plus_25');
            }
            if (this.ngpLevel >= 2) {
                modifiers.push('enemy_damage_plus_25');
            }
            if (this.ngpLevel >= 3) {
                modifiers.push('new_enemy_patterns');
            }
            if (this.ngpLevel >= 5) {
                modifiers.push('hardcore_mode');
            }

            return modifiers;
        },

        // Save NGP data
        saveNGP() {
            localStorage.setItem('hellaphobia_ngp', JSON.stringify({
                unlocked: this.ngpUnlocked,
                level: this.ngpLevel,
                carriedOver: this.carriedOver
            }));
        },

        // Load NGP data
        loadNGP() {
            const saved = localStorage.getItem('hellaphobia_ngp');
            if (saved) {
                const data = JSON.parse(saved);
                this.ngpUnlocked = data.unlocked;
                this.ngpLevel = data.level || 0;
                this.carriedOver = data.carriedOver || [];
            }
        }
    };

    // ===== PHASE 20: CREDITS MANAGER =====
    const CreditsManager = {
        credits: [],
        specialThanks: [],

        init() {
            this.loadCredits();
            console.log('Phase 20: Credits Manager initialized');
        },

        // Add credit
        addCredit(name, role, category) {
            this.credits.push({
                id: 'credit_' + Date.now(),
                name,
                role,
                category: category || 'general',
                order: this.credits.length
            });
            this.saveCredits();
        },

        // Add special thanks
        addSpecialThanks(name, reason) {
            this.specialThanks.push({
                id: 'thanks_' + Date.now(),
                name,
                reason
            });
            this.saveCredits();
        },

        // Get credits by category
        getCreditsByCategory(category) {
            return this.credits.filter(c => c.category === category);
        },

        // Get all credits
        getAllCredits() {
            return {
                main: this.getCreditsByCategory('main'),
                development: this.getCreditsByCategory('development'),
                art: this.getCreditsByCategory('art'),
                audio: this.getCreditsByCategory('audio'),
                testing: this.getCreditsByCategory('testing'),
                special: this.specialThanks
            };
        },

        // Save credits
        saveCredits() {
            localStorage.setItem('hellaphobia_credits', JSON.stringify({
                credits: this.credits,
                specialThanks: this.specialThanks
            }));
        },

        // Load credits
        loadCredits() {
            const saved = localStorage.getItem('hellaphobia_credits');
            if (saved) {
                const data = JSON.parse(saved);
                this.credits = data.credits || [];
                this.specialThanks = data.specialThanks || [];
            }
        }
    };

    // ===== PHASE 20: MAIN ENDING MANAGER =====
    const Phase20Ending = {
        initialized: false,

        init() {
            if (this.initialized) return;

            TrueEndingManager.init();
            CinematicManager.init();
            FourthWallBreaker.init();
            NewGamePlusManager.init();
            CreditsManager.init();

            this.initialized = true;
            console.log('Phase 20: True Ending initialized');
        },

        // Endings
        checkEndingUnlocks: () => TrueEndingManager.checkEndingUnlocks(),
        getEndingProgress: (id) => TrueEndingManager.getEndingProgress(id),
        getAllEndings: () => TrueEndingManager.getAllEndings(),
        startEnding: (id) => TrueEndingManager.startEnding(id),

        // Cinematics
        playCinematic: (id, ending) => CinematicManager.playCinematic(id, ending),
        skipCinematic: () => CinematicManager.skip(),

        // Fourth Wall
        breakFourthWall: (intensity) => FourthWallBreaker.breakFourthWall(intensity),
        setPlayerName: (name) => FourthWallBreaker.setPlayerName(name),
        generateMetaMessage: (type) => FourthWallBreaker.generateMetaMessage(type),

        // NG+
        unlockNGP: () => NewGamePlusManager.unlockNGP(),
        startNGP: () => NewGamePlusManager.startNGP(),
        getNGPModifiers: () => NewGamePlusManager.getModifiers(),

        // Credits
        addCredit: (name, role, category) => CreditsManager.addCredit(name, role, category),
        getCredits: () => CreditsManager.getAllCredits()
    };

    // Export Phase 20 systems
    window.Phase20Ending = Phase20Ending;
    window.TrueEndingManager = TrueEndingManager;
    window.CinematicManager = CinematicManager;
    window.FourthWallBreaker = FourthWallBreaker;
    window.NewGamePlusManager = NewGamePlusManager;
    window.CreditsManager = CreditsManager;
    window.EndingDatabase = EndingDatabase;
    window.ENDING_CONFIG = ENDING_CONFIG;

})();
