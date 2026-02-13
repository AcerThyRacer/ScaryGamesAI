/**
 * ScaryGamesAI — Universal Game System
 * Provides: Stats tracking, achievements, cloud sync, replays, screenshots, spectator mode
 * Works across ALL 18 games
 */

var UniversalGameSystem = (function() {
    'use strict';

    // ============ CONFIGURATION ============
    var CONFIG = {
        STORAGE_KEY: 'sgai_universal_data',
        CLOUD_SYNC_INTERVAL: 30000, // 30 seconds
        MAX_REPLAYS_PER_GAME: 10,
        MAX_SCREENSHOTS_PER_GAME: 20,
        SCREENSHOT_QUALITY: 0.9,
        CLIP_DURATION_MS: 10000, // 10 second clips
        SERVER_URL: '/api/game-data'
    };

    // ============ GAME REGISTRY ============
    // All 18 games with their metadata
    var GAME_REGISTRY = {
        'backrooms-pacman': { name: 'Backrooms Pac-Man', genre: 'horror-chase', tier: 'free', maxPlayers: 1 },
        'shadow-crawler': { name: 'Shadow Crawler', genre: 'dungeon-crawler', tier: 'free', maxPlayers: 1 },
        'the-abyss': { name: 'The Abyss', genre: 'underwater-horror', tier: 'free', maxPlayers: 1 },
        'cursed-depths': { name: 'Cursed Depths', genre: 'survival-sandbox', tier: 'free', maxPlayers: 1 },
        'freddys-nightmare': { name: "Freddy's Nightmare", genre: 'fnaf-style', tier: 'free', maxPlayers: 1 },
        'haunted-asylum': { name: 'Haunted Asylum', genre: 'exploration', tier: 'free', maxPlayers: 1 },
        'cursed-sands': { name: 'Cursed Sands', genre: 'open-world', tier: 'free', maxPlayers: 1 },
        'nightmare-run': { name: 'Nightmare Run', genre: 'endless-runner', tier: 'pro', maxPlayers: 1 },
        'yeti-run': { name: 'Yeti Run', genre: 'endless-runner', tier: 'pro', maxPlayers: 1 },
        'blood-tetris': { name: 'Blood Tetris', genre: 'puzzle', tier: 'pro', maxPlayers: 1 },
        'seance': { name: 'Séance', genre: 'puzzle', tier: 'pro', maxPlayers: 1 },
        'dollhouse': { name: 'Dollhouse', genre: 'escape-room', tier: 'pro', maxPlayers: 1 },
        'ritual-circle': { name: 'Ritual Circle', genre: 'tower-defense', tier: 'pro', maxPlayers: 1 },
        'zombie-horde': { name: 'Zombie Horde', genre: 'strategy-td', tier: 'max', maxPlayers: 1 },
        'the-elevator': { name: 'The Elevator', genre: 'psychological-horror', tier: 'max', maxPlayers: 1 },
        'graveyard-shift': { name: 'Graveyard Shift', genre: 'stealth-horror', tier: 'max', maxPlayers: 1 },
        'web-of-terror': { name: 'Web of Terror', genre: 'spider-horror', tier: 'max', maxPlayers: 1 },
        'total-zombies-medieval': { name: 'Total Zombies Medieval', genre: 'strategy-battle', tier: 'max', maxPlayers: 1 }
    };

    // ============ STATS TRACKING ============
    var StatsTracker = {
        currentSession: null,
        sessionStartTime: null,

        init: function(gameId) {
            if (!GAME_REGISTRY[gameId]) {
                console.error('Unknown game:', gameId);
                return;
            }

            this.sessionStartTime = Date.now();
            this.currentSession = {
                gameId: gameId,
                startTime: this.sessionStartTime,
                events: [],
                metrics: {
                    deaths: 0,
                    kills: 0,
                    itemsCollected: 0,
                    damageDealt: 0,
                    damageTaken: 0,
                    timeInCombat: 0,
                    secretsFound: 0,
                    achievementsUnlocked: 0,
                    score: 0,
                    distanceTraveled: 0,
                    jumps: 0,
                    attacks: 0,
                    successfulBlocks: 0,
                    criticalHits: 0,
                    healingDone: 0,
                    currencyEarned: 0
                }
            };
        },

        recordEvent: function(eventType, data) {
            if (!this.currentSession) return;

            this.currentSession.events.push({
                type: eventType,
                timestamp: Date.now(),
                data: data || {}
            });

            // Update metrics based on event
            switch(eventType) {
                case 'death':
                    this.currentSession.metrics.deaths++;
                    break;
                case 'kill':
                    this.currentSession.metrics.kills++;
                    break;
                case 'item_collect':
                    this.currentSession.metrics.itemsCollected++;
                    break;
                case 'damage_dealt':
                    this.currentSession.metrics.damageDealt += (data.amount || 0);
                    break;
                case 'damage_taken':
                    this.currentSession.metrics.damageTaken += (data.amount || 0);
                    break;
                case 'secret_found':
                    this.currentSession.metrics.secretsFound++;
                    break;
                case 'score':
                    this.currentSession.metrics.score = Math.max(this.currentSession.metrics.score, data.score || 0);
                    break;
                case 'distance':
                    this.currentSession.metrics.distanceTraveled += (data.distance || 0);
                    break;
                case 'jump':
                    this.currentSession.metrics.jumps++;
                    break;
                case 'attack':
                    this.currentSession.metrics.attacks++;
                    break;
                case 'block':
                    this.currentSession.metrics.successfulBlocks++;
                    break;
                case 'critical':
                    this.currentSession.metrics.criticalHits++;
                    break;
                case 'heal':
                    this.currentSession.metrics.healingDone += (data.amount || 0);
                    break;
                case 'currency':
                    this.currentSession.metrics.currencyEarned += (data.amount || 0);
                    break;
            }
        },

        endSession: function() {
            if (!this.currentSession) return null;

            var session = this.currentSession;
            session.endTime = Date.now();
            session.duration = session.endTime - session.startTime;
            session.events = null; // Don't store all events, just metrics

            // Save to local storage
            this.saveSessionStats(session);

            // Update global stats
            this.updateGlobalStats(session);

            this.currentSession = null;
            this.sessionStartTime = null;

            return session;
        },

        saveSessionStats: function(session) {
            var stats = this.getGameStats(session.gameId);

            // Update totals
            stats.totalSessions++;
            stats.totalTime += session.duration;
            stats.totalDeaths += session.metrics.deaths;
            stats.totalKills += session.metrics.kills;
            stats.totalItemsCollected += session.metrics.itemsCollected;
            stats.totalSecretsFound += session.metrics.secretsFound;
            stats.totalCurrencyEarned += session.metrics.currencyEarned;

            // Update bests
            if (session.metrics.score > stats.highScore) {
                stats.highScore = session.metrics.score;
                stats.highScoreDate = session.endTime;
            }

            if (session.duration > stats.longestSession) {
                stats.longestSession = session.duration;
            }

            if (session.metrics.kills > stats.mostKillsInSession) {
                stats.mostKillsInSession = session.metrics.kills;
            }

            // Update averages (running average)
            stats.averageScore = Math.round((stats.averageScore * (stats.totalSessions - 1) + session.metrics.score) / stats.totalSessions);
            stats.averageDeathsPerSession = (stats.averageDeathsPerSession * (stats.totalSessions - 1) + session.metrics.deaths) / stats.totalSessions;

            // Last played
            stats.lastPlayed = session.endTime;

            this.saveGameStats(session.gameId, stats);
        },

        getGameStats: function(gameId) {
            var data = StorageManager.get('stats_' + gameId);
            return data || {
                gameId: gameId,
                totalSessions: 0,
                totalTime: 0,
                totalDeaths: 0,
                totalKills: 0,
                totalItemsCollected: 0,
                totalSecretsFound: 0,
                totalCurrencyEarned: 0,
                highScore: 0,
                highScoreDate: null,
                longestSession: 0,
                mostKillsInSession: 0,
                averageScore: 0,
                averageDeathsPerSession: 0,
                lastPlayed: null
            };
        },

        saveGameStats: function(gameId, stats) {
            StorageManager.set('stats_' + gameId, stats);
        },

        updateGlobalStats: function(session) {
            var global = this.getGlobalStats();

            global.totalSessions++;
            global.totalTime += session.duration;
            global.totalDeaths += session.metrics.deaths;
            global.totalKills += session.metrics.kills;
            global.gamesPlayed[session.gameId] = (global.gamesPlayed[session.gameId] || 0) + 1;

            if (session.metrics.score > global.highestScoreEver) {
                global.highestScoreEver = session.metrics.score;
                global.highestScoreGame = session.gameId;
            }

            StorageManager.set('global_stats', global);
        },

        getGlobalStats: function() {
            var data = StorageManager.get('global_stats');
            return data || {
                totalSessions: 0,
                totalTime: 0,
                totalDeaths: 0,
                totalKills: 0,
                gamesPlayed: {},
                highestScoreEver: 0,
                highestScoreGame: null,
                accountCreated: Date.now()
            };
        },

        getSessionDuration: function() {
            if (!this.sessionStartTime) return 0;
            return Date.now() - this.sessionStartTime;
        }
    };

    // ============ ACHIEVEMENT SYSTEM ============
    var AchievementSystem = {
        achievements: {},
        gameAchievements: {},

        // Universal achievements (work across all games)
        universalAchievements: [
            { id: 'first_blood', name: 'First Blood', description: 'Get your first kill', icon: '🩸', requirement: { type: 'total_kills', value: 1 } },
            { id: 'serial_killer', name: 'Serial Killer', description: 'Kill 100 enemies total', icon: '🔪', requirement: { type: 'total_kills', value: 100 } },
            { id: 'mass_murderer', name: 'Mass Murderer', description: 'Kill 1000 enemies total', icon: '💀', requirement: { type: 'total_kills', value: 1000 } },
            { id: 'persistent', name: 'Persistent', description: 'Play for 1 hour total', icon: '⏰', requirement: { type: 'total_time', value: 3600000 } },
            { id: 'dedicated', name: 'Dedicated', description: 'Play for 10 hours total', icon: '🕐', requirement: { type: 'total_time', value: 36000000 } },
            { id: 'obsessed', name: 'Obsessed', description: 'Play for 100 hours total', icon: '⌚', requirement: { type: 'total_time', value: 360000000 } },
            { id: 'explorer', name: 'Explorer', description: 'Play 5 different games', icon: '🗺️', requirement: { type: 'games_played', value: 5 } },
            { id: 'connoisseur', name: 'Connoisseur', description: 'Play all 18 games', icon: '🎭', requirement: { type: 'games_played', value: 18 } },
            { id: 'death_prone', name: 'Death Prone', description: 'Die 50 times', icon: '⚰️', requirement: { type: 'total_deaths', value: 50 } },
            { id: 'survivor', name: 'Survivor', description: 'Complete 10 sessions without dying', icon: '🛡️', requirement: { type: 'deathless_sessions', value: 10 } },
            { id: 'high_roller', name: 'High Roller', description: 'Earn 10,000 currency total', icon: '💰', requirement: { type: 'total_currency', value: 10000 } },
            { id: 'night_owl', name: 'Night Owl', description: 'Play between 2 AM and 5 AM', icon: '🦉', requirement: { type: 'time_of_day', value: { start: 2, end: 5 } } },
            { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Play on Saturday or Sunday', icon: '📅', requirement: { type: 'day_of_week', value: [0, 6] } },
            { id: 'streak_7', name: 'Week Streak', description: 'Play 7 days in a row', icon: '🔥', requirement: { type: 'daily_streak', value: 7 } },
            { id: 'streak_30', name: 'Monthly Streak', description: 'Play 30 days in a row', icon: '🌟', requirement: { type: 'daily_streak', value: 30 } }
        ],

        // Per-game achievement templates
        gameAchievementTemplates: {
            score_1000: { name: 'Scorer', description: 'Score 1000 points', icon: '🎯', requirement: { type: 'score', value: 1000 } },
            score_10000: { name: 'High Scorer', description: 'Score 10,000 points', icon: '🏆', requirement: { type: 'score', value: 10000 } },
            score_100000: { name: 'Score Master', description: 'Score 100,000 points', icon: '👑', requirement: { type: 'score', value: 100000 } },
            no_deaths: { name: 'Flawless', description: 'Complete a session without dying', icon: '✨', requirement: { type: 'session_deaths', value: 0 } },
            speedrun: { name: 'Speed Demon', description: 'Complete in under 5 minutes', icon: '⚡', requirement: { type: 'session_time', value: 300000, operator: 'less' } },
            secret_finder: { name: 'Secret Finder', description: 'Find a secret', icon: '🔍', requirement: { type: 'secrets_found', value: 1 } },
            completionist: { name: 'Completionist', description: 'Find all secrets', icon: '💯', requirement: { type: 'all_secrets', value: true } }
        },

        init: function() {
            this.loadAchievements();
            this.generateGameAchievements();
        },

        loadAchievements: function() {
            var data = StorageManager.get('achievements');
            if (data) {
                this.achievements = data.unlocked || {};
            }
        },

        generateGameAchievements: function() {
            // Generate achievements for each game based on templates
            Object.keys(GAME_REGISTRY).forEach(function(gameId) {
                var game = GAME_REGISTRY[gameId];
                this.gameAchievements[gameId] = [];

                // Add score achievements
                this.gameAchievements[gameId].push(
                    { id: gameId + '_score_1000', ...this.gameAchievementTemplates.score_1000 },
                    { id: gameId + '_score_10000', ...this.gameAchievementTemplates.score_10000 },
                    { id: gameId + '_score_100000', ...this.gameAchievementTemplates.score_100000 },
                    { id: gameId + '_no_deaths', ...this.gameAchievementTemplates.no_deaths },
                    { id: gameId + '_secret_finder', ...this.gameAchievementTemplates.secret_finder }
                );
            }.bind(this));
        },

        checkAchievement: function(achievementId, stats, sessionStats) {
            var achievement = this.findAchievement(achievementId);
            if (!achievement || this.achievements[achievementId]) return false;

            var req = achievement.requirement;
            var value = 0;

            switch(req.type) {
                case 'total_kills':
                    value = stats.totalKills;
                    break;
                case 'total_time':
                    value = stats.totalTime;
                    break;
                case 'total_deaths':
                    value = stats.totalDeaths;
                    break;
                case 'total_currency':
                    value = stats.totalCurrencyEarned || 0;
                    break;
                case 'games_played':
                    value = Object.keys(stats.gamesPlayed || {}).length;
                    break;
                case 'score':
                    value = sessionStats ? sessionStats.metrics.score : 0;
                    break;
                case 'session_deaths':
                    value = sessionStats ? sessionStats.metrics.deaths : 0;
                    break;
                case 'session_time':
                    value = sessionStats ? sessionStats.duration : 0;
                    break;
                case 'secrets_found':
                    value = sessionStats ? sessionStats.metrics.secretsFound : 0;
                    break;
                case 'daily_streak':
                    value = this.getDailyStreak();
                    break;
                case 'time_of_day':
                    var hour = new Date().getHours();
                    return hour >= req.value.start && hour < req.value.end;
                case 'day_of_week':
                    var day = new Date().getDay();
                    return req.value.includes(day);
            }

            var operator = req.operator || 'gte';
            if (operator === 'less') {
                return value < req.value;
            }
            return value >= req.value;
        },

        checkAllAchievements: function(sessionStats) {
            var globalStats = StatsTracker.getGlobalStats();
            var newlyUnlocked = [];

            // Check universal achievements
            this.universalAchievements.forEach(function(achievement) {
                if (this.checkAchievement(achievement.id, globalStats, sessionStats)) {
                    this.unlockAchievement(achievement.id);
                    newlyUnlocked.push(achievement);
                }
            }.bind(this));

            // Check game-specific achievements
            if (sessionStats && this.gameAchievements[sessionStats.gameId]) {
                this.gameAchievements[sessionStats.gameId].forEach(function(achievement) {
                    if (this.checkAchievement(achievement.id, globalStats, sessionStats)) {
                        this.unlockAchievement(achievement.id);
                        newlyUnlocked.push(achievement);
                    }
                }.bind(this));
            }

            return newlyUnlocked;
        },

        unlockAchievement: function(achievementId) {
            if (this.achievements[achievementId]) return;

            this.achievements[achievementId] = {
                unlockedAt: Date.now()
            };

            StorageManager.set('achievements', { unlocked: this.achievements });

            // Dispatch event
            var achievement = this.findAchievement(achievementId);
            if (achievement) {
                this.showAchievementNotification(achievement);
                document.dispatchEvent(new CustomEvent('achievementUnlocked', { detail: achievement }));
            }
        },

        findAchievement: function(achievementId) {
            // Check universal achievements
            var universal = this.universalAchievements.find(function(a) { return a.id === achievementId; });
            if (universal) return universal;

            // Check game achievements
            for (var gameId in this.gameAchievements) {
                var game = this.gameAchievements[gameId].find(function(a) { return a.id === achievementId; });
                if (game) return game;
            }
            return null;
        },

        getDailyStreak: function() {
            var data = StorageManager.get('daily_streak');
            if (!data) return 0;

            var today = new Date().setHours(0, 0, 0, 0);
            var yesterday = today - 86400000;

            if (data.lastPlayDate >= yesterday) {
                return data.streak;
            }
            return 0;
        },

        showAchievementNotification: function(achievement) {
            var notification = document.createElement('div');
            notification.className = 'ugs-achievement-notification';
            notification.innerHTML =
                '<div class="ugs-achievement-inner">' +
                '<span class="ugs-achievement-icon">' + achievement.icon + '</span>' +
                '<div class="ugs-achievement-info">' +
                '<span class="ugs-achievement-title">Achievement Unlocked!</span>' +
                '<span class="ugs-achievement-name">' + achievement.name + '</span>' +
                '<span class="ugs-achievement-desc">' + achievement.description + '</span>' +
                '</div>' +
                '</div>';

            document.body.appendChild(notification);

            // Animate in
            requestAnimationFrame(function() {
                notification.classList.add('ugs-show');
            });

            // Remove after delay
            setTimeout(function() {
                notification.classList.remove('ugs-show');
                setTimeout(function() {
                    notification.remove();
                }, 500);
            }, 4000);
        },

        getUnlockedAchievements: function() {
            return Object.keys(this.achievements).map(function(id) {
                var achievement = this.findAchievement(id);
                return achievement ? { ...achievement, unlockedAt: this.achievements[id].unlockedAt } : null;
            }.bind(this)).filter(Boolean);
        },

        getAchievementProgress: function(achievementId) {
            var achievement = this.findAchievement(achievementId);
            if (!achievement) return { current: 0, target: 0, percent: 0 };

            var globalStats = StatsTracker.getGlobalStats();
            var current = 0;
            var target = achievement.requirement.value;

            switch(achievement.requirement.type) {
                case 'total_kills': current = globalStats.totalKills; break;
                case 'total_time': current = globalStats.totalTime; break;
                case 'games_played': current = Object.keys(globalStats.gamesPlayed).length; break;
                case 'total_deaths': current = globalStats.totalDeaths; break;
            }

            return {
                current: current,
                target: target,
                percent: Math.min(100, Math.round((current / target) * 100))
            };
        }
    };

    // ============ REPLAY SYSTEM ============
    var ReplaySystem = {
        isRecording: false,
        currentReplay: null,
        frameData: [],
        inputHistory: [],
        startTime: 0,

        startRecording: function(gameId, initialState) {
            this.isRecording = true;
            this.startTime = Date.now();
            this.frameData = [];
            this.inputHistory = [];
            this.currentReplay = {
                id: 'replay_' + Date.now(),
                gameId: gameId,
                version: '1.0',
                timestamp: this.startTime,
                initialState: initialState || {},
                frames: [],
                inputs: [],
                metadata: {
                    score: 0,
                    duration: 0,
                    deathCount: 0
                }
            };
        },

        recordFrame: function(frameData) {
            if (!this.isRecording) return;

            this.frameData.push({
                time: Date.now() - this.startTime,
                data: frameData
            });

            // Keep only last 60 seconds of frames at 60fps for memory
            if (this.frameData.length > 3600) {
                this.frameData.shift();
            }
        },

        recordInput: function(inputType, inputData) {
            if (!this.isRecording) return;

            this.inputHistory.push({
                time: Date.now() - this.startTime,
                type: inputType,
                data: inputData
            });
        },

        stopRecording: function(metadata) {
            if (!this.isRecording) return null;

            this.isRecording = false;
            this.currentReplay.frames = this.frameData;
            this.currentReplay.inputs = this.inputHistory;
            this.currentReplay.metadata = {
                ...this.currentReplay.metadata,
                ...metadata,
                duration: Date.now() - this.startTime
            };

            // Only save if it was a good run (high score or low deaths)
            if (metadata && (metadata.isHighScore || metadata.deathCount === 0)) {
                this.saveReplay(this.currentReplay);
            }

            return this.currentReplay;
        },

        saveReplay: function(replay) {
            var replays = this.getReplays(replay.gameId);

            // Add new replay
            replays.push(replay);

            // Keep only best replays
            replays.sort(function(a, b) {
                return (b.metadata.score || 0) - (a.metadata.score || 0);
            });
            replays = replays.slice(0, CONFIG.MAX_REPLAYS_PER_GAME);

            StorageManager.set('replays_' + replay.gameId, replays);
        },

        getReplays: function(gameId) {
            return StorageManager.get('replays_' + gameId) || [];
        },

        getReplay: function(gameId, replayId) {
            var replays = this.getReplays(gameId);
            return replays.find(function(r) { return r.id === replayId; });
        },

        deleteReplay: function(gameId, replayId) {
            var replays = this.getReplays(gameId);
            replays = replays.filter(function(r) { return r.id !== replayId; });
            StorageManager.set('replays_' + gameId, replays);
        },

        shareReplay: function(gameId, replayId) {
            var replay = this.getReplay(gameId, replayId);
            if (!replay) return null;

            // Generate shareable code
            var shareCode = btoa(JSON.stringify({
                gameId: replay.gameId,
                version: replay.version,
                frames: replay.frames.slice(0, 100), // Truncate for sharing
                metadata: replay.metadata
            }));

            return {
                code: shareCode,
                url: window.location.origin + '/replay?code=' + shareCode
            };
        },

        loadReplayFromCode: function(code) {
            try {
                return JSON.parse(atob(code));
            } catch (e) {
                console.error('Invalid replay code:', e);
                return null;
            }
        }
    };

    // ============ SCREENSHOT/CLIP SYSTEM ============
    var MediaCapture = {
        screenshots: [],
        clips: [],
        isRecordingClip: false,
        clipFrames: [],
        clipStartTime: 0,
        mediaRecorder: null,
        recordedChunks: [],

        captureScreenshot: function(canvas) {
            if (!canvas) canvas = document.getElementById('game-canvas');
            if (!canvas) return null;

            var dataUrl = canvas.toDataURL('image/webp', CONFIG.SCREENSHOT_QUALITY);
            var screenshot = {
                id: 'ss_' + Date.now(),
                gameId: StatsTracker.currentSession ? StatsTracker.currentSession.gameId : 'unknown',
                timestamp: Date.now(),
                dataUrl: dataUrl,
                score: StatsTracker.currentSession ? StatsTracker.currentSession.metrics.score : 0
            };

            this.screenshots.push(screenshot);

            // Keep only recent screenshots
            if (this.screenshots.length > CONFIG.MAX_SCREENSHOTS_PER_GAME) {
                this.screenshots.shift();
            }

            StorageManager.set('screenshots', this.screenshots);

            // Show notification
            this.showCaptureNotification('Screenshot saved!');

            return screenshot;
        },

        startClipRecording: function(canvas) {
            if (!canvas) canvas = document.getElementById('game-canvas');
            if (!canvas || this.isRecordingClip) return false;

            try {
                var stream = canvas.captureStream(30);
                this.mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp9'
                });

                this.recordedChunks = [];
                this.mediaRecorder.ondataavailable = function(e) {
                    if (e.data.size > 0) {
                        this.recordedChunks.push(e.data);
                    }
                }.bind(this);

                this.mediaRecorder.onstop = function() {
                    this.saveClip();
                }.bind(this);

                this.mediaRecorder.start();
                this.isRecordingClip = true;
                this.clipStartTime = Date.now();

                this.showCaptureNotification('Recording clip...');

                // Auto-stop after duration
                setTimeout(function() {
                    if (this.isRecordingClip) {
                        this.stopClipRecording();
                    }
                }.bind(this), CONFIG.CLIP_DURATION_MS);

                return true;
            } catch (e) {
                console.error('Failed to start recording:', e);
                return false;
            }
        },

        stopClipRecording: function() {
            if (!this.isRecordingClip || !this.mediaRecorder) return;

            this.mediaRecorder.stop();
            this.isRecordingClip = false;
        },

        saveClip: function() {
            if (this.recordedChunks.length === 0) return;

            var blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            var url = URL.createObjectURL(blob);

            var clip = {
                id: 'clip_' + Date.now(),
                gameId: StatsTracker.currentSession ? StatsTracker.currentSession.gameId : 'unknown',
                timestamp: Date.now(),
                url: url,
                blob: blob,
                duration: Date.now() - this.clipStartTime,
                score: StatsTracker.currentSession ? StatsTracker.currentSession.metrics.score : 0
            };

            this.clips.push(clip);
            StorageManager.set('clips_meta', this.clips.map(function(c) {
                return { id: c.id, gameId: c.gameId, timestamp: c.timestamp, duration: c.duration, score: c.score };
            }));

            this.showCaptureNotification('Clip saved!');

            return clip;
        },

        showCaptureNotification: function(message) {
            var notification = document.createElement('div');
            notification.className = 'ugs-capture-notification';
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(function() {
                notification.classList.add('ugs-show');
            }, 10);

            setTimeout(function() {
                notification.classList.remove('ugs-show');
                setTimeout(function() { notification.remove(); }, 300);
            }, 2000);
        },

        shareScreenshot: function(screenshotId) {
            var screenshot = this.screenshots.find(function(s) { return s.id === screenshotId; });
            if (!screenshot) return;

            // Convert to blob for sharing
            fetch(screenshot.dataUrl)
                .then(function(res) { return res.blob(); })
                .then(function(blob) {
                    if (navigator.share) {
                        navigator.share({
                            title: 'ScaryGamesAI Screenshot',
                            files: [new File([blob], 'screenshot.webp', { type: 'image/webp' })]
                        });
                    } else {
                        // Fallback: download
                        var a = document.createElement('a');
                        a.href = screenshot.dataUrl;
                        a.download = 'scarygames_screenshot_' + screenshot.timestamp + '.webp';
                        a.click();
                    }
                });
        },

        downloadScreenshot: function(screenshotId) {
            var screenshot = this.screenshots.find(function(s) { return s.id === screenshotId; });
            if (!screenshot) return;

            var a = document.createElement('a');
            a.href = screenshot.dataUrl;
            a.download = 'scarygames_screenshot_' + screenshot.timestamp + '.webp';
            a.click();
        },

        getScreenshots: function(gameId) {
            if (gameId) {
                return this.screenshots.filter(function(s) { return s.gameId === gameId; });
            }
            return this.screenshots;
        }
    };

    // ============ CLOUD SYNC ============
    var CloudSync = {
        syncInterval: null,
        isSyncing: false,
        lastSync: 0,
        pendingChanges: false,

        init: function() {
            // Check if user is logged in
            if (!this.isLoggedIn()) return;

            // Initial sync
            this.sync();

            // Set up interval
            this.syncInterval = setInterval(function() {
                this.sync();
            }.bind(this), CONFIG.CLOUD_SYNC_INTERVAL);

            // Sync before unload
            window.addEventListener('beforeunload', function() {
                if (this.pendingChanges) {
                    this.sync(true);
                }
            }.bind(this));
        },

        isLoggedIn: function() {
            // Check for auth token
            return localStorage.getItem('sgai_auth_token') !== null;
        },

        sync: function(force) {
            if (this.isSyncing || (!force && !this.pendingChanges)) return;

            this.isSyncing = true;

            var data = {
                globalStats: StatsTracker.getGlobalStats(),
                achievements: AchievementSystem.achievements,
                gameStats: {},
                settings: StorageManager.get('user_settings') || {}
            };

            // Collect all game stats
            Object.keys(GAME_REGISTRY).forEach(function(gameId) {
                data.gameStats[gameId] = StatsTracker.getGameStats(gameId);
            });

            fetch(CONFIG.SERVER_URL + '/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('sgai_auth_token')
                },
                body: JSON.stringify(data)
            })
            .then(function(response) { return response.json(); })
            .then(function(result) {
                if (result.success) {
                    this.lastSync = Date.now();
                    this.pendingChanges = false;

                    // Merge any server data
                    if (result.data) {
                        this.mergeServerData(result.data);
                    }
                }
            }.bind(this))
            .catch(function(error) {
                console.error('Cloud sync failed:', error);
            })
            .finally(function() {
                this.isSyncing = false;
            }.bind(this));
        },

        mergeServerData: function(serverData) {
            // Merge strategy: newer data wins
            if (serverData.globalStats) {
                var localStats = StatsTracker.getGlobalStats();
                var merged = this.mergeStats(localStats, serverData.globalStats);
                StorageManager.set('global_stats', merged);
            }

            if (serverData.achievements) {
                // Merge achievements
                var localAchievements = AchievementSystem.achievements;
                for (var id in serverData.achievements) {
                    if (!localAchievements[id] ||
                        serverData.achievements[id].unlockedAt < localAchievements[id].unlockedAt) {
                        localAchievements[id] = serverData.achievements[id];
                    }
                }
                StorageManager.set('achievements', { unlocked: localAchievements });
            }
        },

        mergeStats: function(local, server) {
            // Simple merge: take the higher values
            return {
                totalSessions: Math.max(local.totalSessions || 0, server.totalSessions || 0),
                totalTime: Math.max(local.totalTime || 0, server.totalTime || 0),
                totalDeaths: Math.max(local.totalDeaths || 0, server.totalDeaths || 0),
                totalKills: Math.max(local.totalKills || 0, server.totalKills || 0),
                highestScoreEver: Math.max(local.highestScoreEver || 0, server.highestScoreEver || 0),
                gamesPlayed: { ...local.gamesPlayed, ...server.gamesPlayed },
                accountCreated: Math.min(local.accountCreated || Date.now(), server.accountCreated || Date.now())
            };
        },

        markPending: function() {
            this.pendingChanges = true;
        }
    };

    // ============ SPECTATOR MODE ============
    var SpectatorMode = {
        isActive: false,
        targetPlayer: null,
        spectators: [],
        replayPlayback: null,
        playbackSpeed: 1,

        enterSpectatorMode: function(replay) {
            this.isActive = true;
            this.replayPlayback = replay;

            // Create spectator UI
            this.createSpectatorUI();
        },

        exitSpectatorMode: function() {
            this.isActive = false;
            this.replayPlayback = null;

            // Remove spectator UI
            var ui = document.getElementById('ugs-spectator-ui');
            if (ui) ui.remove();
        },

        createSpectatorUI: function() {
            var ui = document.createElement('div');
            ui.id = 'ugs-spectator-ui';
            ui.className = 'ugs-spectator-ui';
            ui.innerHTML =
                '<div class="ugs-spectator-header">' +
                '<span class="ugs-spectator-title">👁️ Spectator Mode</span>' +
                '<div class="ugs-spectator-controls">' +
                '<button class="ugs-spectator-btn" data-action="slower">⏪</button>' +
                '<span class="ugs-spectator-speed">' + this.playbackSpeed + 'x</span>' +
                '<button class="ugs-spectator-btn" data-action="faster">⏩</button>' +
                '<button class="ugs-spectator-btn" data-action="exit">✖️ Exit</button>' +
                '</div>' +
                '</div>' +
                '<div class="ugs-spectator-info">' +
                '<span class="ugs-spectator-score">Score: 0</span>' +
                '<span class="ugs-spectator-time">00:00</span>' +
                '</div>';

            document.body.appendChild(ui);

            // Add event listeners
            ui.querySelector('[data-action="slower"]').addEventListener('click', function() {
                this.setPlaybackSpeed(this.playbackSpeed - 0.25);
            }.bind(this));

            ui.querySelector('[data-action="faster"]').addEventListener('click', function() {
                this.setPlaybackSpeed(this.playbackSpeed + 0.25);
            }.bind(this));

            ui.querySelector('[data-action="exit"]').addEventListener('click', function() {
                this.exitSpectatorMode();
            }.bind(this));
        },

        setPlaybackSpeed: function(speed) {
            this.playbackSpeed = Math.max(0.25, Math.min(4, speed));
            var speedEl = document.querySelector('.ugs-spectator-speed');
            if (speedEl) speedEl.textContent = this.playbackSpeed + 'x';
        },

        updateSpectatorInfo: function(score, time) {
            var scoreEl = document.querySelector('.ugs-spectator-score');
            var timeEl = document.querySelector('.ugs-spectator-time');

            if (scoreEl) scoreEl.textContent = 'Score: ' + score;
            if (timeEl) {
                var minutes = Math.floor(time / 60000);
                var seconds = Math.floor((time % 60000) / 1000);
                timeEl.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
            }
        }
    };

    // ============ DAILY CHALLENGE INTEGRATION ============
    var DailyChallengeIntegration = {
        challenges: [],
        completedToday: [],

        init: function() {
            this.loadTodayChallenges();
        },

        loadTodayChallenges: function() {
            var stored = StorageManager.get('daily_challenges');
            var today = new Date().toDateString();

            if (stored && stored.date === today) {
                this.challenges = stored.challenges;
                this.completedToday = stored.completed || [];
            } else {
                this.generateDailyChallenges();
            }
        },

        generateDailyChallenges: function() {
            var today = new Date().toDateString();
            var seed = today.split('').reduce(function(a, b) { return a + b.charCodeAt(0); }, 0);

            var possibleChallenges = [
                { id: 'play_3_games', name: 'Triple Threat', description: 'Play 3 different games', target: 3, type: 'games_played', reward: 100 },
                { id: 'score_5000', name: 'Score Hunter', description: 'Score 5000 points in any game', target: 5000, type: 'score', reward: 150 },
                { id: 'survive_10min', name: 'Survivor', description: 'Play for 10 minutes without dying', target: 600000, type: 'survival_time', reward: 200 },
                { id: 'no_deaths', name: 'Flawless', description: 'Complete a game without dying', target: 0, type: 'no_deaths', reward: 250 },
                { id: 'kill_50', name: 'Exterminator', description: 'Kill 50 enemies total', target: 50, type: 'total_kills', reward: 100 },
                { id: 'play_specific', name: 'Game Master', description: 'Play the featured game', target: 1, type: 'featured_game', reward: 75 },
                { id: 'secret_hunter', name: 'Secret Hunter', description: 'Find 3 secrets', target: 3, type: 'secrets_found', reward: 175 }
            ];

            // Shuffle and pick 3 challenges based on date seed
            var shuffled = possibleChallenges.sort(function() { return 0.5 - (seed % 100) / 100; });
            this.challenges = shuffled.slice(0, 3).map(function(c, i) {
                return { ...c, id: 'daily_' + today + '_' + i };
            });

            this.completedToday = [];

            StorageManager.set('daily_challenges', {
                date: today,
                challenges: this.challenges,
                completed: this.completedToday
            });
        },

        checkChallengeProgress: function(sessionStats) {
            var progress = [];

            this.challenges.forEach(function(challenge) {
                if (this.completedToday.includes(challenge.id)) return;

                var current = 0;
                switch(challenge.type) {
                    case 'games_played':
                        current = 1; // Each session counts as 1 game
                        break;
                    case 'score':
                        current = sessionStats.metrics.score;
                        break;
                    case 'survival_time':
                        if (sessionStats.metrics.deaths === 0) {
                            current = sessionStats.duration;
                        }
                        break;
                    case 'no_deaths':
                        current = sessionStats.metrics.deaths === 0 ? 1 : 0;
                        break;
                    case 'total_kills':
                        current = sessionStats.metrics.kills;
                        break;
                    case 'secrets_found':
                        current = sessionStats.metrics.secretsFound;
                        break;
                }

                progress.push({
                    challenge: challenge,
                    current: current,
                    target: challenge.target,
                    completed: current >= challenge.target
                });

                if (current >= challenge.target) {
                    this.completeChallenge(challenge);
                }
            }.bind(this));

            return progress;
        },

        completeChallenge: function(challenge) {
            if (this.completedToday.includes(challenge.id)) return;

            this.completedToday.push(challenge.id);

            StorageManager.set('daily_challenges', {
                date: new Date().toDateString(),
                challenges: this.challenges,
                completed: this.completedToday
            });

            // Award currency
            if (typeof CrossGameMechanics !== 'undefined') {
                CrossGameMechanics.addCurrency('souls', challenge.reward);
            }

            // Show notification
            this.showChallengeCompleteNotification(challenge);
        },

        showChallengeCompleteNotification: function(challenge) {
            var notification = document.createElement('div');
            notification.className = 'ugs-challenge-notification';
            notification.innerHTML =
                '<div class="ugs-challenge-inner">' +
                '<span class="ugs-challenge-icon">✅</span>' +
                '<div class="ugs-challenge-info">' +
                '<span class="ugs-challenge-title">Daily Challenge Complete!</span>' +
                '<span class="ugs-challenge-name">' + challenge.name + '</span>' +
                '<span class="ugs-challenge-reward">+' + challenge.reward + ' Souls</span>' +
                '</div>' +
                '</div>';

            document.body.appendChild(notification);

            requestAnimationFrame(function() {
                notification.classList.add('ugs-show');
            });

            setTimeout(function() {
                notification.classList.remove('ugs-show');
                setTimeout(function() { notification.remove(); }, 500);
            }, 4000);
        },

        getChallenges: function() {
            return this.challenges.map(function(c) {
                return {
                    ...c,
                    completed: this.completedToday.includes(c.id)
                };
            }.bind(this));
        }
    };

    // ============ STORAGE MANAGER ============
    var StorageManager = {
        get: function(key) {
            try {
                var data = localStorage.getItem(CONFIG.STORAGE_KEY + '_' + key);
                return data ? JSON.parse(data) : null;
            } catch (e) {
                console.error('StorageManager get error:', e);
                return null;
            }
        },

        set: function(key, value) {
            try {
                localStorage.setItem(CONFIG.STORAGE_KEY + '_' + key, JSON.stringify(value));
                if (CloudSync.isLoggedIn) {
                    CloudSync.markPending();
                }
            } catch (e) {
                console.error('StorageManager set error:', e);
            }
        },

        remove: function(key) {
            try {
                localStorage.removeItem(CONFIG.STORAGE_KEY + '_' + key);
            } catch (e) {
                console.error('StorageManager remove error:', e);
            }
        },

        clear: function() {
            Object.keys(localStorage).forEach(function(key) {
                if (key.startsWith(CONFIG.STORAGE_KEY + '_')) {
                    localStorage.removeItem(key);
                }
            });
        }
    };

    // ============ INJECT STYLES ============
    function injectStyles() {
        if (document.getElementById('ugs-injected-styles')) return;

        var style = document.createElement('style');
        style.id = 'ugs-injected-styles';
        style.textContent = [
            // Achievement Notification
            '.ugs-achievement-notification{position:fixed;top:20px;right:20px;z-index:99999;transform:translateX(120%);transition:transform 0.5s cubic-bezier(0.68,-0.55,0.265,1.55);}',
            '.ugs-achievement-notification.ugs-show{transform:translateX(0);}',
            '.ugs-achievement-inner{display:flex;align-items:center;gap:16px;padding:16px 24px;background:linear-gradient(135deg,rgba(139,92,246,0.9),rgba(79,70,229,0.9));border:1px solid rgba(167,139,250,0.3);border-radius:12px;box-shadow:0 10px 40px rgba(139,92,246,0.4);}',
            '.ugs-achievement-icon{font-size:40px;animation:ugs-pulse 1s ease-in-out infinite;}',
            '@keyframes ugs-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.15);}}',
            '.ugs-achievement-info{display:flex;flex-direction:column;gap:2px;}',
            '.ugs-achievement-title{font-size:0.75rem;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;}',
            '.ugs-achievement-name{font-size:1.1rem;font-weight:700;color:#fff;}',
            '.ugs-achievement-desc{font-size:0.85rem;color:rgba(255,255,255,0.8);}',

            // Capture Notification
            '.ugs-capture-notification{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(100px);padding:12px 24px;background:rgba(0,255,136,0.9);color:#000;font-weight:600;border-radius:8px;font-size:0.9rem;transition:transform 0.3s ease;z-index:99999;}',
            '.ugs-capture-notification.ugs-show{transform:translateX(-50%) translateY(0);}',

            // Challenge Notification
            '.ugs-challenge-notification{position:fixed;top:20px;left:20px;z-index:99999;transform:translateX(-120%);transition:transform 0.5s cubic-bezier(0.68,-0.55,0.265,1.55);}',
            '.ugs-challenge-notification.ugs-show{transform:translateX(0);}',
            '.ugs-challenge-inner{display:flex;align-items:center;gap:16px;padding:16px 24px;background:linear-gradient(135deg,rgba(0,255,136,0.9),rgba(16,185,129,0.9));border:1px solid rgba(0,255,136,0.3);border-radius:12px;box-shadow:0 10px 40px rgba(0,255,136,0.3);}',
            '.ugs-challenge-icon{font-size:40px;}',
            '.ugs-challenge-info{display:flex;flex-direction:column;gap:2px;}',
            '.ugs-challenge-title{font-size:0.75rem;color:rgba(0,0,0,0.6);text-transform:uppercase;letter-spacing:1px;}',
            '.ugs-challenge-name{font-size:1.1rem;font-weight:700;color:#000;}',
            '.ugs-challenge-reward{font-size:0.9rem;color:rgba(0,0,0,0.7);font-weight:600;}',

            // Spectator UI
            '.ugs-spectator-ui{position:fixed;top:0;left:0;right:0;z-index:9999;padding:16px 24px;background:linear-gradient(180deg,rgba(0,0,0,0.8),transparent);}',
            '.ugs-spectator-header{display:flex;justify-content:space-between;align-items:center;}',
            '.ugs-spectator-title{font-family:Creepster,cursive;font-size:1.5rem;color:#cc1122;text-shadow:0 0 20px rgba(204,17,34,0.5);}',
            '.ugs-spectator-controls{display:flex;align-items:center;gap:12px;}',
            '.ugs-spectator-btn{padding:8px 16px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#fff;cursor:pointer;transition:all 0.2s;}',
            '.ugs-spectator-btn:hover{background:rgba(255,255,255,0.2);}',
            '.ugs-spectator-speed{min-width:50px;text-align:center;color:#fff;font-weight:600;}',
            '.ugs-spectator-info{display:flex;gap:24px;margin-top:12px;}',
            '.ugs-spectator-score,.ugs-spectator-time{color:#fff;font-weight:600;}'
        ].join('\n');
        document.head.appendChild(style);
    }

    // ============ PUBLIC API ============
    return {
        // Initialization
        init: function(gameId) {
            injectStyles();
            StatsTracker.init(gameId);
            AchievementSystem.init();
            DailyChallengeIntegration.init();
            CloudSync.init();
        },

        // Stats
        stats: {
            recordEvent: StatsTracker.recordEvent.bind(StatsTracker),
            endSession: StatsTracker.endSession.bind(StatsTracker),
            getGameStats: StatsTracker.getGameStats.bind(StatsTracker),
            getGlobalStats: StatsTracker.getGlobalStats.bind(StatsTracker),
            getSessionDuration: StatsTracker.getSessionDuration.bind(StatsTracker)
        },

        // Achievements
        achievements: {
            checkAll: AchievementSystem.checkAllAchievements.bind(AchievementSystem),
            getUnlocked: AchievementSystem.getUnlockedAchievements.bind(AchievementSystem),
            getProgress: AchievementSystem.getAchievementProgress.bind(AchievementSystem)
        },

        // Replays
        replays: {
            startRecording: ReplaySystem.startRecording.bind(ReplaySystem),
            recordFrame: ReplaySystem.recordFrame.bind(ReplaySystem),
            recordInput: ReplaySystem.recordInput.bind(ReplaySystem),
            stopRecording: ReplaySystem.stopRecording.bind(ReplaySystem),
            getReplays: ReplaySystem.getReplays.bind(ReplaySystem),
            share: ReplaySystem.shareReplay.bind(ReplaySystem)
        },

        // Media
        media: {
            screenshot: MediaCapture.captureScreenshot.bind(MediaCapture),
            startClip: MediaCapture.startClipRecording.bind(MediaCapture),
            stopClip: MediaCapture.stopClipRecording.bind(MediaCapture),
            shareScreenshot: MediaCapture.shareScreenshot.bind(MediaCapture),
            downloadScreenshot: MediaCapture.downloadScreenshot.bind(MediaCapture),
            getScreenshots: MediaCapture.getScreenshots.bind(MediaCapture)
        },

        // Spectator
        spectator: {
            enter: SpectatorMode.enterSpectatorMode.bind(SpectatorMode),
            exit: SpectatorMode.exitSpectatorMode.bind(SpectatorMode),
            updateInfo: SpectatorMode.updateSpectatorInfo.bind(SpectatorMode)
        },

        // Daily Challenges
        daily: {
            getChallenges: DailyChallengeIntegration.getChallenges.bind(DailyChallengeIntegration),
            checkProgress: DailyChallengeIntegration.checkChallengeProgress.bind(DailyChallengeIntegration)
        },

        // Cloud
        cloud: {
            sync: CloudSync.sync.bind(CloudSync),
            isLoggedIn: CloudSync.isLoggedIn.bind(CloudSync)
        },

        // Game Registry
        games: GAME_REGISTRY,

        // Version
        version: '2.0.0'
    };
})();

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Will be initialized by individual games with their gameId
    });
}
