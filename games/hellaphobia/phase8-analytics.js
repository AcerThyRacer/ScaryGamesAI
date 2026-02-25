/* ============================================================
   HELLAPHOBIA - PHASE 8: ANALYTICS & PLAYER ENGAGEMENT
   Player Behavior Tracking | Performance Metrics | Daily Challenges
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 8: ANALYTICS CONFIG =====
    const ANALYTICS_CONFIG = {
        BATCH_SIZE: 50,
        FLUSH_INTERVAL: 30000, // 30 seconds
        MAX_QUEUE_SIZE: 1000,
        SAMPLING_RATE: 1.0, // 100% of events
        ANONYMIZE_IP: true
    };

    // ===== PHASE 8: DAILY CHALLENGES SYSTEM =====
    const DailyChallenges = {
        challenges: [],
        completedChallenges: [],
        lastRefresh: null,
        streakCount: 0,
        totalCompleted: 0,

        init() {
            this.loadChallenges();
            this.checkDailyRefresh();
            console.log('Phase 8: Daily Challenges initialized');
        },

        // Generate daily challenges
        generateDailyChallenges() {
            const challengePool = [
                { id: 'speed_run', name: 'Speed Demon', description: 'Complete a phase in under 3 minutes', type: 'time', target: 180, reward: 500 },
                { id: 'no_damage', name: 'Untouchable', description: 'Complete a phase without taking damage', type: 'no_damage', target: 1, reward: 1000 },
                { id: 'kill_count', name: 'Reaper', description: 'Defeat 50 monsters in a session', type: 'kills', target: 50, reward: 300 },
                { id: 'death_defier', name: 'Phoenix', description: 'Die 5 times but complete the phase', type: 'deaths_then_complete', target: 5, reward: 400 },
                { id: 'sanity_master', name: 'Sane Mind', description: 'Complete a phase with sanity above 80%', type: 'sanity_threshold', target: 80, reward: 600 },
                { id: 'explorer', name: 'Explorer', description: 'Find all secret rooms in a phase', type: 'secrets_found', target: 3, reward: 700 },
                { id: 'combo_king', name: 'Combo King', description: 'Achieve a 10-hit combo', type: 'combo', target: 10, reward: 350 },
                { id: 'parry_master', name: 'Parry Master', description: 'Successfully parry 15 attacks', type: 'parries', target: 15, reward: 500 },
                { id: 'stealth_ghost', name: 'Ghost', description: 'Complete a phase without being detected', type: 'stealth', target: 1, reward: 800 },
                { id: 'marathon', name: 'Marathon Runner', description: 'Play for 2 hours straight', type: 'playtime', target: 7200, reward: 600 }
            ];

            // Select 3 random daily challenges
            const shuffled = challengePool.sort(() => Math.random() - 0.5);
            this.challenges = shuffled.slice(0, 3).map(c => ({
                ...c,
                progress: 0,
                completed: false,
                date: new Date().toISOString()
            }));

            this.lastRefresh = Date.now();
            this.saveChallenges();
        },

        // Track progress toward challenges
        trackProgress(type, value) {
            this.challenges.forEach(challenge => {
                if (challenge.completed) return;

                let progressUpdated = false;

                switch (challenge.type) {
                    case 'kills':
                    case 'parries':
                    case 'combo':
                        if (type === challenge.type) {
                            challenge.progress = Math.max(challenge.progress, value);
                            progressUpdated = true;
                        }
                        break;
                    case 'time':
                        if (type === 'phase_complete_time' && value < challenge.target) {
                            challenge.progress = challenge.target - value;
                            progressUpdated = true;
                        }
                        break;
                    case 'playtime':
                        if (type === 'session_time') {
                            challenge.progress = value;
                            progressUpdated = true;
                        }
                        break;
                }

                if (progressUpdated) {
                    this.checkChallengeComplete(challenge);
                }
            });

            this.saveChallenges();
        },

        // Check if challenge is complete
        checkChallengeComplete(challenge) {
            if (challenge.progress >= challenge.target) {
                challenge.completed = true;
                this.completedChallenges.push(challenge.id);
                this.totalCompleted++;
                EventTracker.track('daily_challenge_complete', {
                    challenge_id: challenge.id,
                    challenge_name: challenge.name,
                    reward: challenge.reward
                });
            }
        },

        // Check for daily refresh
        checkDailyRefresh() {
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;

            if (!this.lastRefresh || (now - this.lastRefresh) > oneDay) {
                // Check if player logged in yesterday for streak
                const yesterday = now - oneDay;
                if (this.lastRefresh && (now - this.lastRefresh) < oneDay * 2) {
                    this.streakCount++;
                } else {
                    this.streakCount = 1;
                }

                this.generateDailyChallenges();
                EventTracker.track('daily_challenges_refreshed', {
                    streak: this.streakCount
                });
            }
        },

        // Save challenges to local storage
        saveChallenges() {
            localStorage.setItem('hellaphobia_daily_challenges', JSON.stringify({
                challenges: this.challenges,
                completedChallenges: this.completedChallenges,
                lastRefresh: this.lastRefresh,
                streakCount: this.streakCount,
                totalCompleted: this.totalCompleted
            }));
        },

        // Load challenges from local storage
        loadChallenges() {
            const saved = localStorage.getItem('hellaphobia_daily_challenges');
            if (saved) {
                const data = JSON.parse(saved);
                this.challenges = data.challenges || [];
                this.completedChallenges = data.completedChallenges || [];
                this.lastRefresh = data.lastRefresh;
                this.streakCount = data.streakCount || 0;
                this.totalCompleted = data.totalCompleted || 0;
            } else {
                this.generateDailyChallenges();
            }
        },

        // Get current challenges
        getChallenges() {
            return this.challenges;
        },

        // Get streak info
        getStreakInfo() {
            return {
                current: this.streakCount,
                bonus: Math.floor(this.streakCount / 7) * 100 // 100% bonus every 7 days
            };
        }
    };

    // ===== PHASE 8: PLAYER ENGAGEMENT MANAGER =====
    const PlayerEngagement = {
        engagementScore: 50,
        riskOfChurn: 'medium',
        lastSession: null,
        totalSessions: 0,
        totalPlaytime: 0,

        init() {
            this.loadEngagementData();
            console.log('Phase 8: Player Engagement Manager initialized');
        },

        // Track session start
        trackSessionStart() {
            const now = Date.now();
            const wasAbsent = this.lastSession && (now - this.lastSession) > 7 * 24 * 60 * 60 * 1000;

            if (wasAbsent) {
                // Player returned after absence - trigger winback
                this.triggerWinback();
            }

            this.totalSessions++;
            this.lastSession = now;
            this.saveEngagementData();
        },

        // Track session end
        trackSessionEnd(playtimeSeconds) {
            this.totalPlaytime += playtimeSeconds;
            this.updateEngagementScore(playtimeSeconds);
            this.saveEngagementData();

            EventTracker.track('engagement_update', {
                score: this.engagementScore,
                risk: this.riskOfChurn,
                sessions: this.totalSessions,
                totalPlaytime: this.totalPlaytime
            });
        },

        // Update engagement score based on activity
        updateEngagementScore(sessionPlaytime) {
            // Increase score for active play
            this.engagementScore = Math.min(100, this.engagementScore + 1);

            // Bonus for long sessions
            if (sessionPlaytime > 1800) { // 30 minutes
                this.engagementScore = Math.min(100, this.engagementScore + 2);
            }

            // Calculate churn risk
            const daysSinceLastSession = this.lastSession ?
                (Date.now() - this.lastSession) / (24 * 60 * 60 * 1000) : 0;

            if (daysSinceLastSession > 14) {
                this.riskOfChurn = 'high';
            } else if (daysSinceLastSession > 7) {
                this.riskOfChurn = 'medium';
            } else {
                this.riskOfChurn = 'low';
            }
        },

        // Trigger winback for returning players
        triggerWinback() {
            EventTracker.track('player_winback', {
                absenceDays: Math.floor((Date.now() - this.lastSession) / (24 * 60 * 60 * 1000)),
                totalSessions: this.totalSessions
            });

            // Could offer bonus rewards, special challenges, etc.
            console.log('[Engagement] Welcome back! Here\'s a bonus reward.');
        },

        // Load engagement data
        loadEngagementData() {
            const saved = localStorage.getItem('hellaphobia_engagement');
            if (saved) {
                const data = JSON.parse(saved);
                this.engagementScore = data.score || 50;
                this.lastSession = data.lastSession;
                this.totalSessions = data.sessions || 0;
                this.totalPlaytime = data.playtime || 0;
            }
        },

        // Save engagement data
        saveEngagementData() {
            localStorage.setItem('hellaphobia_engagement', JSON.stringify({
                score: this.engagementScore,
                lastSession: this.lastSession,
                sessions: this.totalSessions,
                playtime: this.totalPlaytime
            }));
        },

        // Get engagement stats
        getStats() {
            return {
                score: this.engagementScore,
                riskOfChurn: this.riskOfChurn,
                totalSessions: this.totalSessions,
                totalPlaytime: this.totalPlaytime,
                avgSessionLength: this.totalSessions > 0 ?
                    Math.floor(this.totalPlaytime / this.totalSessions) : 0
            };
        }
    };

    // ===== PHASE 8: FEAR ANALYTICS =====
    const FearAnalytics = {
        fearProfile: {
            startleResponse: 0.5,
            sustainedFear: 0.5,
            anxietyLevel: 0.5,
            dreadAccumulation: 0.5
        },
        fearEvents: [],
        peakFearMoments: [],

        init() {
            this.loadFearProfile();
            console.log('Phase 8: Fear Analytics initialized');
        },

        // Record fear event
        recordFearEvent(type, intensity, context) {
            const event = {
                type: type, // jumpscare, pursuit, low_sanity, monster_encounter
                intensity: intensity, // 0-1
                context: context,
                timestamp: Date.now(),
                playerState: {
                    sanity: context.sanity || 100,
                    health: context.health || 100,
                    position: context.position || { x: 0, y: 0 }
                }
            };

            this.fearEvents.push(event);

            // Track peak fear moments
            if (intensity > 0.8) {
                this.peakFearMoments.push(event);
            }

            // Update fear profile
            this.updateFearProfile(type, intensity);

            // Keep only last 100 events
            if (this.fearEvents.length > 100) {
                this.fearEvents.shift();
            }

            EventTracker.track('fear_event', {
                type: type,
                intensity: intensity
            });
        },

        // Update player's fear profile
        updateFearProfile(eventType, intensity) {
            switch (eventType) {
                case 'jumpscare':
                    this.fearProfile.startleResponse = this.adjustProfileValue(
                        this.fearProfile.startleResponse,
                        intensity > 0.7 ? 0.1 : -0.05
                    );
                    break;
                case 'pursuit':
                    this.fearProfile.sustainedFear = this.adjustProfileValue(
                        this.fearProfile.sustainedFear,
                        intensity > 0.7 ? 0.1 : -0.05
                    );
                    break;
                case 'low_sanity':
                    this.fearProfile.anxietyLevel = this.adjustProfileValue(
                        this.fearProfile.anxietyLevel,
                        intensity > 0.7 ? 0.1 : -0.05
                    );
                    break;
            }

            this.saveFearProfile();
        },

        // Adjust profile value (0-1 range)
        adjustProfileValue(value, delta) {
            return Math.max(0, Math.min(1, value + delta));
        },

        // Save fear profile
        saveFearProfile() {
            localStorage.setItem('hellaphobia_fear_profile', JSON.stringify(this.fearProfile));
        },

        // Load fear profile
        loadFearProfile() {
            const saved = localStorage.getItem('hellaphobia_fear_profile');
            if (saved) {
                this.fearProfile = JSON.parse(saved);
            }
        },

        // Get fear profile
        getFearProfile() {
            return this.fearProfile;
        },

        // Get fear heatmap data
        getFearHeatmap() {
            return this.fearEvents.map(e => ({
                x: e.context.position?.x || 0,
                y: e.context.position?.y || 0,
                intensity: e.intensity,
                type: e.type
            }));
        }
    };

    // ===== PHASE 8: EVENT TRACKER =====
    const EventTracker = {
        eventQueue: [],
        sessionEvents: 0,
        
        // Track event
        track(eventName, properties = {}) {
            if (Math.random() > ANALYTICS_CONFIG.SAMPLING_RATE) return;
            
            const event = {
                name: eventName,
                properties: {
                    ...properties,
                    timestamp: Date.now(),
                    session_id: SessionManager.getSessionId(),
                    player_id: SessionManager.getPlayerId()
                }
            };
            
            this.eventQueue.push(event);
            this.sessionEvents++;
            
            // Flush if batch size reached
            if (this.eventQueue.length >= ANALYTICS_CONFIG.BATCH_SIZE) {
                this.flush();
            }
            
            // Check max queue size
            if (this.eventQueue.length > ANALYTICS_CONFIG.MAX_QUEUE_SIZE) {
                this.eventQueue = this.eventQueue.slice(-ANALYTICS_CONFIG.MAX_QUEUE_SIZE);
            }
        },
        
        // Track game event
        trackGameEvent(eventType, data) {
            this.track('game_' + eventType, data);
        },
        
        // Track player action
        trackPlayerAction(action, data) {
            this.track('player_' + action, data);
        },
        
        // Track death
        trackDeath(cause, phase, position) {
            this.track('player_death', {
                cause: cause,
                phase: phase,
                position: position,
                time_in_phase: data => data.timeInPhase
            });
        },
        
        // Track level completion
        trackLevelComplete(phase, stats) {
            this.track('level_complete', {
                phase: phase,
                time: stats.time,
                deaths: stats.deaths,
                kills: stats.kills,
                score: stats.score
            });
        },
        
        // Flush events to server
        flush() {
            if (this.eventQueue.length === 0) return;
            
            const events = [...this.eventQueue];
            this.eventQueue = [];
            
            // Send to analytics endpoint
            this.sendEvents(events);
        },
        
        // Send events (simulated)
        sendEvents(events) {
            // In production, this would send to analytics server
            console.log('Analytics: Sending', events.length, 'events');
            
            // Store locally for now
            const stored = this.getStoredEvents();
            stored.push(...events);
            localStorage.setItem('hellaphobia_analytics', JSON.stringify(
                stored.slice(-1000) // Keep last 1000
            ));
        },
        
        // Get stored events
        getStoredEvents() {
            const saved = localStorage.getItem('hellaphobia_analytics');
            return saved ? JSON.parse(saved) : [];
        },
        
        // Get session stats
        getSessionStats() {
            return {
                totalEvents: this.sessionEvents,
                queueSize: this.eventQueue.length
            };
        }
    };

    // ===== PHASE 8: SESSION MANAGER =====
    const SessionManager = {
        sessionId: null,
        playerId: null,
        sessionStart: 0,
        
        init() {
            this.sessionId = this.generateId();
            this.playerId = this.getOrCreatePlayerId();
            this.sessionStart = Date.now();
            
            // Track session start
            EventTracker.track('session_start', {
                player_id: this.playerId,
                screen_resolution: `${window.innerWidth}x${window.innerHeight}`,
                user_agent: navigator.userAgent,
                referrer: document.referrer
            });
            
            // Setup auto-flush
            setInterval(() => EventTracker.flush(), ANALYTICS_CONFIG.FLUSH_INTERVAL);
            
            // Track session end
            window.addEventListener('beforeunload', () => {
                this.trackSessionEnd();
            });
            
            console.log('Phase 8: Session Manager initialized');
        },
        
        // Generate unique ID
        generateId() {
            return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        // Get or create player ID
        getOrCreatePlayerId() {
            let id = localStorage.getItem('hellaphobia_player_id');
            if (!id) {
                id = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('hellaphobia_player_id', id);
            }
            return id;
        },
        
        // Get session ID
        getSessionId() {
            return this.sessionId;
        },
        
        // Get player ID
        getPlayerId() {
            return this.playerId;
        },
        
        // Get session duration
        getSessionDuration() {
            return Date.now() - this.sessionStart;
        },
        
        // Track session end
        trackSessionEnd() {
            EventTracker.track('session_end', {
                duration: this.getSessionDuration(),
                total_events: EventTracker.getSessionStats().totalEvents
            });
            EventTracker.flush();
        }
    };

    // ===== PHASE 8: PERFORMANCE MONITOR =====
    const PerformanceMonitor = {
        metrics: {
            fps: [],
            frameTime: [],
            memory: [],
            loadTime: 0
        },
        
        init() {
            this.metrics.loadTime = performance.now();
            this.startMonitoring();
            console.log('Phase 8: Performance Monitor initialized');
        },
        
        // Start monitoring
        startMonitoring() {
            let lastTime = performance.now();
            let frameCount = 0;
            let lastFpsTime = lastTime;
            
            const measure = () => {
                const now = performance.now();
                const frameTime = now - lastTime;
                lastTime = now;
                frameCount++;
                
                // Calculate FPS every second
                if (now - lastFpsTime >= 1000) {
                    const fps = frameCount;
                    frameCount = 0;
                    lastFpsTime = now;
                    
                    this.metrics.fps.push({
                        timestamp: now,
                        value: fps
                    });
                    
                    // Keep only last 60 seconds
                    this.metrics.fps = this.metrics.fps.filter(
                        m => now - m.timestamp < 60000
                    );
                    
                    // Track low FPS
                    if (fps < 30) {
                        EventTracker.track('performance_low_fps', { fps });
                    }
                }
                
                // Track frame time
                this.metrics.frameTime.push({
                    timestamp: now,
                    value: frameTime
                });
                
                this.metrics.frameTime = this.metrics.frameTime.filter(
                    m => now - m.timestamp < 60000
                );
                
                // Track memory (if available)
                if (performance.memory) {
                    this.metrics.memory.push({
                        timestamp: now,
                        used: performance.memory.usedJSHeapSize,
                        total: performance.memory.totalJSHeapSize
                    });
                    
                    this.metrics.memory = this.metrics.memory.filter(
                        m => now - m.timestamp < 60000
                    );
                }
                
                requestAnimationFrame(measure);
            };
            
            requestAnimationFrame(measure);
        },
        
        // Get average FPS
        getAverageFPS() {
            if (this.metrics.fps.length === 0) return 60;
            const sum = this.metrics.fps.reduce((a, b) => a + b.value, 0);
            return sum / this.metrics.fps.length;
        },
        
        // Get performance report
        getReport() {
            return {
                averageFPS: this.getAverageFPS(),
                minFPS: Math.min(...this.metrics.fps.map(m => m.value), 60),
                maxFPS: Math.max(...this.metrics.fps.map(m => m.value), 60),
                averageFrameTime: this.metrics.frameTime.reduce((a, b) => a + b.value, 0) / this.metrics.frameTime.length,
                loadTime: this.metrics.loadTime,
                memoryUsage: this.metrics.memory.length > 0 
                    ? this.metrics.memory[this.metrics.memory.length - 1].used / 1024 / 1024 
                    : 0
            };
        },
        
        // Track performance event
        trackEvent(event, duration) {
            EventTracker.track('performance_' + event, {
                duration: duration,
                fps: this.getAverageFPS()
            });
        }
    };

    // ===== PHASE 8: HEATMAP GENERATOR =====
    const HeatmapGenerator = {
        deathPositions: [],
        playerPositions: [],
        monsterKills: [],
        
        // Record player position
        recordPosition(x, y, phase) {
            this.playerPositions.push({
                x, y, phase,
                timestamp: Date.now()
            });
            
            // Keep only recent positions
            const cutoff = Date.now() - 60000; // 1 minute
            this.playerPositions = this.playerPositions.filter(
                p => p.timestamp > cutoff
            );
        },
        
        // Record death
        recordDeath(x, y, phase, cause) {
            this.deathPositions.push({
                x, y, phase, cause,
                timestamp: Date.now()
            });
            
            // Keep all deaths (they're important)
            if (this.deathPositions.length > 1000) {
                this.deathPositions = this.deathPositions.slice(-1000);
            }
        },
        
        // Record monster kill
        recordKill(x, y, phase, monsterType) {
            this.monsterKills.push({
                x, y, phase, monsterType,
                timestamp: Date.now()
            });
            
            if (this.monsterKills.length > 1000) {
                this.monsterKills = this.monsterKills.slice(-1000);
            }
        },
        
        // Generate heatmap data
        generateHeatmap(type, phase) {
            let data;
            switch (type) {
                case 'deaths':
                    data = this.deathPositions.filter(d => d.phase === phase);
                    break;
                case 'movement':
                    data = this.playerPositions.filter(p => p.phase === phase);
                    break;
                case 'kills':
                    data = this.monsterKills.filter(k => k.phase === phase);
                    break;
                default:
                    data = [];
            }
            
            // Create grid
            const gridSize = 50;
            const grid = new Map();
            
            for (const point of data) {
                const gx = Math.floor(point.x / gridSize);
                const gy = Math.floor(point.y / gridSize);
                const key = `${gx},${gy}`;
                
                grid.set(key, (grid.get(key) || 0) + 1);
            }
            
            return {
                type: type,
                phase: phase,
                gridSize: gridSize,
                data: Array.from(grid.entries()).map(([key, count]) => {
                    const [gx, gy] = key.split(',').map(Number);
                    return {
                        x: gx * gridSize,
                        y: gy * gridSize,
                        count: count,
                        intensity: Math.min(1, count / 10)
                    };
                })
            };
        },
        
        // Render heatmap
        renderHeatmap(ctx, heatmap, camera) {
            for (const cell of heatmap.data) {
                const cx = cell.x - camera.x;
                const cy = cell.y - camera.y;
                
                // Skip if off-screen
                if (cx < -heatmap.gridSize || cx > canvas.width + heatmap.gridSize) continue;
                
                // Color based on intensity
                const alpha = cell.intensity * 0.5;
                
                switch (heatmap.type) {
                    case 'deaths':
                        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
                        break;
                    case 'movement':
                        ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
                        break;
                    case 'kills':
                        ctx.fillStyle = `rgba(0, 0, 255, ${alpha})`;
                        break;
                }
                
                ctx.fillRect(
                    cx,
                    cy,
                    heatmap.gridSize,
                    heatmap.gridSize
                );
            }
        },
        
        // Get heatmap stats
        getStats() {
            return {
                totalDeaths: this.deathPositions.length,
                totalPositions: this.playerPositions.length,
                totalKills: this.monsterKills.length,
                deathHotspots: this.getHotspots(this.deathPositions),
                killHotspots: this.getHotspots(this.monsterKills)
            };
        },
        
        // Get hotspots (high activity areas)
        getHotspots(data) {
            const gridSize = 100;
            const grid = new Map();
            
            for (const point of data) {
                const gx = Math.floor(point.x / gridSize);
                const gy = Math.floor(point.y / gridSize);
                const key = `${gx},${gy}`;
                
                grid.set(key, (grid.get(key) || 0) + 1);
            }
            
            // Sort by count
            return Array.from(grid.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([key, count]) => {
                    const [gx, gy] = key.split(',').map(Number);
                    return {
                        x: gx * gridSize,
                        y: gy * gridSize,
                        count: count
                    };
                });
        }
    };

    // ===== PHASE 8: FUNNEL ANALYZER =====
    const FunnelAnalyzer = {
        funnel: {
            'game_start': 0,
            'tutorial_complete': 0,
            'phase_1_complete': 0,
            'phase_5_reached': 0,
            'phase_10_reached': 0,
            'game_complete': 0
        },
        
        // Track funnel step
        trackStep(step) {
            if (this.funnel.hasOwnProperty(step)) {
                this.funnel[step]++;
                
                EventTracker.track('funnel_' + step, {
                    count: this.funnel[step]
                });
            }
        },
        
        // Get conversion rates
        getConversionRates() {
            const rates = {};
            const steps = Object.keys(this.funnel);
            
            for (let i = 1; i < steps.length; i++) {
                const current = steps[i];
                const previous = steps[i - 1];
                
                rates[`${previous}_to_${current}`] = 
                    this.funnel[previous] > 0 
                        ? (this.funnel[current] / this.funnel[previous] * 100).toFixed(2) + '%'
                        : '0%';
            }
            
            return rates;
        },
        
        // Get funnel report
        getReport() {
            return {
                steps: this.funnel,
                conversions: this.getConversionRates(),
                overall: this.funnel['game_start'] > 0 
                    ? (this.funnel['game_complete'] / this.funnel['game_start'] * 100).toFixed(2) + '%'
                    : '0%'
            };
        }
    };

    // ===== PHASE 8: RETENTION TRACKER =====
    const RetentionTracker = {
        // Track return visit
        trackReturn() {
            const lastVisit = localStorage.getItem('hellaphobia_last_visit');
            const now = Date.now();
            
            if (lastVisit) {
                const daysSince = Math.floor((now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24));
                
                EventTracker.track('player_return', {
                    days_since_last_visit: daysSince
                });
                
                // Cohort tracking
                if (daysSince === 1) {
                    this.trackCohort('day_1');
                } else if (daysSince === 7) {
                    this.trackCohort('day_7');
                } else if (daysSince === 30) {
                    this.trackCohort('day_30');
                }
            }
            
            localStorage.setItem('hellaphobia_last_visit', now);
        },
        
        // Track cohort
        trackCohort(cohort) {
            EventTracker.track('retention_' + cohort, {
                player_id: SessionManager.getPlayerId()
            });
        },
        
        // Get play history
        getPlayHistory() {
            const history = localStorage.getItem('hellaphobia_play_history');
            return history ? JSON.parse(history) : [];
        },
        
        // Add play session
        addPlaySession(sessionData) {
            const history = this.getPlayHistory();
            history.push({
                date: Date.now(),
                ...sessionData
            });
            
            // Keep last 30 sessions
            if (history.length > 30) {
                history.shift();
            }
            
            localStorage.setItem('hellaphobia_play_history', JSON.stringify(history));
        }
    };

    // ===== PHASE 8: A/B TESTING =====
    const ABTesting = {
        experiments: new Map(),
        
        // Create experiment
        createExperiment(name, variants) {
            // Check if user already assigned
            let assignment = localStorage.getItem(`hellaphobia_ab_${name}`);
            
            if (!assignment) {
                // Random assignment
                assignment = variants[Math.floor(Math.random() * variants.length)];
                localStorage.setItem(`hellaphobia_ab_${name}`, assignment);
            }
            
            this.experiments.set(name, {
                variant: assignment,
                variants: variants
            });
            
            EventTracker.track('ab_test_assignment', {
                experiment: name,
                variant: assignment
            });
            
            return assignment;
        },
        
        // Get variant
        getVariant(name) {
            const exp = this.experiments.get(name);
            return exp ? exp.variant : null;
        },
        
        // Track conversion
        trackConversion(experiment, goal) {
            const exp = this.experiments.get(experiment);
            if (!exp) return;
            
            EventTracker.track('ab_test_conversion', {
                experiment: experiment,
                variant: exp.variant,
                goal: goal
            });
        },
        
        // Get experiment report
        getReport(experiment) {
            const exp = this.experiments.get(experiment);
            if (!exp) return null;
            
            return {
                name: experiment,
                variant: exp.variant,
                allVariants: exp.variants
            };
        }
    };

    // ===== PHASE 8: MAIN API =====
    const Phase8Core = {
        init() {
            SessionManager.init();
            PerformanceMonitor.init();
            RetentionTracker.trackReturn();
            
            console.log('Phase 8: Analytics & Telemetry initialized');
        },
        
        // Event tracking
        track(eventName, properties) {
            EventTracker.track(eventName, properties);
        },
        
        trackGameEvent(eventType, data) {
            EventTracker.trackGameEvent(eventType, data);
        },
        
        trackPlayerAction(action, data) {
            EventTracker.trackPlayerAction(action, data);
        },
        
        // Performance
        trackPerformance(event, duration) {
            PerformanceMonitor.trackEvent(event, duration);
        },
        
        getPerformanceReport() {
            return PerformanceMonitor.getReport();
        },
        
        // Heatmaps
        recordPosition(x, y, phase) {
            HeatmapGenerator.recordPosition(x, y, phase);
        },
        
        recordDeath(x, y, phase, cause) {
            HeatmapGenerator.recordDeath(x, y, phase, cause);
        },
        
        recordKill(x, y, phase, monsterType) {
            HeatmapGenerator.recordKill(x, y, phase, monsterType);
        },
        
        generateHeatmap(type, phase) {
            return HeatmapGenerator.generateHeatmap(type, phase);
        },
        
        renderHeatmap(ctx, heatmap, camera) {
            HeatmapGenerator.renderHeatmap(ctx, heatmap, camera);
        },
        
        getHeatmapStats() {
            return HeatmapGenerator.getStats();
        },
        
        // Funnel
        trackFunnelStep(step) {
            FunnelAnalyzer.trackStep(step);
        },
        
        getFunnelReport() {
            return FunnelAnalyzer.getReport();
        },
        
        // Retention
        addPlaySession(sessionData) {
            RetentionTracker.addPlaySession(sessionData);
        },
        
        getPlayHistory() {
            return RetentionTracker.getPlayHistory();
        },
        
        // A/B Testing
        createExperiment(name, variants) {
            return ABTesting.createExperiment(name, variants);
        },
        
        getVariant(name) {
            return ABTesting.getVariant(name);
        },
        
        trackConversion(experiment, goal) {
            ABTesting.trackConversion(experiment, goal);
        },
        
        // Stats
        getSessionStats() {
            return EventTracker.getSessionStats();
        },
        
        // Flush
        flush() {
            EventTracker.flush();
        }
    };

    // Export Phase 8 systems
    window.Phase8Core = Phase8Core;
    window.EventTracker = EventTracker;
    window.SessionManager = SessionManager;
    window.PerformanceMonitor = PerformanceMonitor;
    window.HeatmapGenerator = HeatmapGenerator;
    window.FunnelAnalyzer = FunnelAnalyzer;
    window.RetentionTracker = RetentionTracker;
    window.ABTesting = ABTesting;
    // Phase 8 Enhanced: Engagement & Analytics
    window.DailyChallenges = DailyChallenges;
    window.PlayerEngagement = PlayerEngagement;
    window.FearAnalytics = FearAnalytics;

})();
