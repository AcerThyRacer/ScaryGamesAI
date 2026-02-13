/**
 * ScaryGamesAI — AI Enhancement Module v2.0
 * Phase 3: ML Fear Prediction, Heart Rate, Audio Analysis, 
 * Dynamic Pacing, A/B Testing, Ghost Replay, Coach AI
 */

var SGAIAIEnhanced = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    
    const CONFIG = {
        HEART_RATE_SAMPLE_RATE: 1000, // ms between samples
        AUDIO_SAMPLE_RATE: 100, // ms between audio analysis
        ENGAGEMENT_WINDOW: 60000, // 1 minute rolling window
        AB_TEST_BUCKET_SIZE: 100, // users per bucket
        COMMUNITY_SYNC_INTERVAL: 300000, // 5 minutes
        GHOST_REPLAY_RESOLUTION: 100, // ms per frame
        COACH_ANALYSIS_INTERVAL: 30000, // 30 seconds
    };

    // ═══════════════════════════════════════════════════════════════
    // ML FEAR PREDICTION MODEL
    // ═══════════════════════════════════════════════════════════════
    
    const MLPredictor = {
        model: null,
        trainingData: [],
        predictions: [],
        accuracy: 0,
        
        // Feature weights (learned over time)
        weights: {
            // Player behavior features
            pauseFrequency: 0.15,
            movementSpeed: 0.12,
            lookAroundRate: 0.10,
            resourceUsage: 0.08,
            mistakeRate: 0.12,
            
            // Physiological features
            heartRateVariance: 0.18,
            breathingPattern: 0.10,
            
            // Game state features
            enemyDistance: 0.08,
            lightLevel: 0.07,
            soundIntensity: 0.10,
            timeSinceLastScare: 0.05,
            
            // Historical features
            fearHistory: 0.15,
            sessionProgress: 0.08,
        },
        
        // Bias terms
        biases: {
            darkness: 0.3,
            jumpscares: 0.25,
            chase: 0.2,
            psychological: 0.15,
            gore: 0.1,
        },
        
        init: function() {
            this.loadModel();
            console.log('[MLPredictor] Initialized with accuracy:', this.accuracy.toFixed(2));
        },
        
        loadModel: function() {
            const saved = localStorage.getItem('sgai_ml_model');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    this.weights = data.weights || this.weights;
                    this.biases = data.biases || this.biases;
                    this.accuracy = data.accuracy || 0;
                    this.trainingData = data.trainingData || [];
                } catch (e) {
                    console.warn('[MLPredictor] Failed to load model, using defaults');
                }
            }
        },
        
        saveModel: function() {
            localStorage.setItem('sgai_ml_model', JSON.stringify({
                weights: this.weights,
                biases: this.biases,
                accuracy: this.accuracy,
                trainingData: this.trainingData.slice(-100), // Keep last 100 samples
            }));
        },
        
        // Extract features from current game state
        extractFeatures: function(gameState, playerMetrics) {
            return {
                // Player behavior
                pauseFrequency: playerMetrics.pauses / Math.max(1, playerMetrics.sessionTime / 60000),
                movementSpeed: playerMetrics.avgSpeed || 0.5,
                lookAroundRate: playerMetrics.lookEvents / Math.max(1, playerMetrics.sessionTime / 1000),
                resourceUsage: playerMetrics.resourcesUsed / Math.max(1, playerMetrics.resourcesFound),
                mistakeRate: playerMetrics.mistakes / Math.max(1, playerMetrics.actions),
                
                // Physiological (if available)
                heartRateVariance: playerMetrics.heartRateVar || 0.5,
                breathingPattern: playerMetrics.breathingRate || 0.5,
                
                // Game state
                enemyDistance: gameState.nearestEnemy ? 
                    Math.min(1, 50 / Math.max(1, gameState.nearestEnemy)) : 1,
                lightLevel: gameState.lightLevel || 0.5,
                soundIntensity: gameState.soundIntensity || 0.5,
                timeSinceLastScare: Math.min(1, (Date.now() - gameState.lastScare) / 60000),
                
                // Historical
                fearHistory: this.getHistoricalFearScore(),
                sessionProgress: gameState.progress || 0.5,
            };
        },
        
        // Predict fear response for each category
        predictFear: function(features, fearType) {
            let score = this.biases[fearType] || 0.2;
            
            // Weighted sum of features
            for (const key in features) {
                const weight = this.weights[key] || 0.1;
                score += features[key] * weight;
            }
            
            // Apply sigmoid activation
            score = 1 / (1 + Math.exp(-5 * (score - 0.5)));
            
            return Math.max(0, Math.min(1, score));
        },
        
        // Predict all fear categories
        predictAllFears: function(features) {
            const fearTypes = ['darkness', 'jumpscares', 'chase', 'psychological', 'gore', 'isolation', 'uncanny', 'sound'];
            const predictions = {};
            
            for (const fear of fearTypes) {
                predictions[fear] = this.predictFear(features, fear);
            }
            
            return predictions;
        },
        
        // Get optimal next scare based on predictions
        getOptimalScare: function(features, context) {
            const predictions = this.predictAllFears(features);
            
            // Sort by predicted effectiveness
            const sorted = Object.entries(predictions)
                .sort((a, b) => b[1] - a[1]);
            
            // Avoid repeating recent scares
            const recentScares = context.recentScares || [];
            const filtered = sorted.filter(([type]) => !recentScares.includes(type));
            
            if (filtered.length === 0) return sorted[0];
            
            // Pick from top 3 with some randomness for variety
            const topThree = filtered.slice(0, 3);
            const selected = topThree[Math.floor(Math.random() * topThree.length)];
            
            return {
                type: selected[0],
                predictedEffectiveness: selected[1],
                intensity: this.calculateOptimalIntensity(selected[1], context),
                confidence: this.accuracy,
            };
        },
        
        calculateOptimalIntensity: function(effectiveness, context) {
            // Higher effectiveness = can handle higher intensity
            // But we want to keep it challenging, not overwhelming
            const baseIntensity = 0.3 + effectiveness * 0.4;
            
            // Adjust based on current tension
            const tensionAdjust = (context.tension || 0.5) * 0.2;
            
            // Adjust based on session time (ramp up over time)
            const sessionProgress = Math.min(1, context.sessionTime / 1800000); // 30 min
            const progressAdjust = sessionProgress * 0.1;
            
            return Math.max(0.1, Math.min(0.9, baseIntensity + tensionAdjust + progressAdjust));
        },
        
        // Train model with actual outcomes
        train: function(features, fearType, actualEffectiveness) {
            const predicted = this.predictFear(features, fearType);
            const error = actualEffectiveness - predicted;
            
            // Simple gradient descent
            const learningRate = 0.01;
            
            for (const key in features) {
                if (this.weights[key] !== undefined) {
                    this.weights[key] += learningRate * error * features[key];
                    // Keep weights in reasonable range
                    this.weights[key] = Math.max(0.01, Math.min(0.3, this.weights[key]));
                }
            }
            
            // Adjust bias
            this.biases[fearType] = (this.biases[fearType] || 0.2) + learningRate * error * 0.5;
            this.biases[fearType] = Math.max(0.1, Math.min(0.5, this.biases[fearType]));
            
            // Update accuracy tracking
            this.trainingData.push({
                features: features,
                fearType: fearType,
                predicted: predicted,
                actual: actualEffectiveness,
                timestamp: Date.now(),
            });
            
            // Calculate rolling accuracy
            this.calculateAccuracy();
            
            // Save updated model
            this.saveModel();
        },
        
        calculateAccuracy: function() {
            if (this.trainingData.length < 10) {
                this.accuracy = 0.5;
                return;
            }
            
            let totalError = 0;
            const recent = this.trainingData.slice(-50);
            
            for (const sample of recent) {
                totalError += Math.abs(sample.predicted - sample.actual);
            }
            
            this.accuracy = 1 - (totalError / recent.length);
        },
        
        getHistoricalFearScore: function() {
            const profile = localStorage.getItem('sgai-player-profile');
            if (!profile) return 0.5;
            
            try {
                const parsed = JSON.parse(profile);
                const fears = parsed.fears || {};
                const values = Object.values(fears);
                return values.reduce((a, b) => a + b, 0) / values.length;
            } catch (e) {
                return 0.5;
            }
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // REAL-TIME HEART RATE INTEGRATION
    // ═══════════════════════════════════════════════════════════════
    
    const HeartRateMonitor = {
        isActive: false,
        currentRate: 70,
        baseline: 70,
        samples: [],
        variance: 0,
        peaks: [],
        
        // WebRTC camera for photoplethysmography
        video: null,
        canvas: null,
        ctx: null,
        
        start: async function() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: 640, height: 480 }
                });
                
                this.video = document.createElement('video');
                this.video.srcObject = stream;
                await this.video.play();
                
                this.canvas = document.createElement('canvas');
                this.canvas.width = 100;
                this.canvas.height = 100;
                this.ctx = this.canvas.getContext('2d');
                
                this.isActive = true;
                this.baseline = await this.calibrateBaseline();
                
                console.log('[HeartRate] Monitoring started, baseline:', this.baseline);
                
                this.sample();
                
                return true;
            } catch (e) {
                console.warn('[HeartRate] Could not start monitoring:', e.message);
                return false;
            }
        },
        
        stop: function() {
            this.isActive = false;
            if (this.video) {
                this.video.srcObject.getTracks().forEach(t => t.stop());
                this.video = null;
            }
        },
        
        calibrateBaseline: function() {
            return new Promise((resolve) => {
                const samples = [];
                let count = 0;
                
                const calibrate = () => {
                    if (count >= 30) {
                        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
                        resolve(avg);
                        return;
                    }
                    
                    const rate = this.detectFromCamera();
                    if (rate > 50 && rate < 150) {
                        samples.push(rate);
                    }
                    count++;
                    setTimeout(calibrate, 200);
                };
                
                calibrate();
            });
        },
        
        // Photoplethysmography - detect pulse from camera
        detectFromCamera: function() {
            if (!this.video || !this.ctx) return this.currentRate;
            
            // Draw video frame to canvas
            this.ctx.drawImage(this.video, 0, 0, 100, 100);
            
            // Get pixel data
            const imageData = this.ctx.getImageData(0, 0, 100, 100);
            const pixels = imageData.data;
            
            // Calculate average red channel value
            let totalRed = 0;
            let count = 0;
            
            for (let i = 0; i < pixels.length; i += 4) {
                totalRed += pixels[i]; // Red channel
                count++;
            }
            
            const avgRed = totalRed / count;
            
            // Store sample
            this.samples.push({
                value: avgRed,
                time: Date.now(),
            });
            
            // Keep only recent samples (5 seconds)
            const cutoff = Date.now() - 5000;
            this.samples = this.samples.filter(s => s.time > cutoff);
            
            // Detect peaks for heart rate calculation
            if (this.samples.length >= 30) {
                return this.calculateRateFromPeaks();
            }
            
            return this.currentRate;
        },
        
        calculateRateFromPeaks: function() {
            const values = this.samples.map(s => s.value);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            
            // Find peaks
            const peaks = [];
            for (let i = 1; i < values.length - 1; i++) {
                if (values[i] > values[i-1] && values[i] > values[i+1] && values[i] > avg) {
                    peaks.push(this.samples[i].time);
                }
            }
            
            // Calculate BPM from peak intervals
            if (peaks.length >= 2) {
                let totalInterval = 0;
                for (let i = 1; i < peaks.length; i++) {
                    totalInterval += peaks[i] - peaks[i-1];
                }
                const avgInterval = totalInterval / (peaks.length - 1);
                const bpm = 60000 / avgInterval;
                
                if (bpm > 40 && bpm < 200) {
                    this.currentRate = Math.round(bpm);
                }
            }
            
            // Calculate variance
            if (this.samples.length > 10) {
                const recentRates = this.samples.slice(-10).map(s => s.value);
                const mean = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
                const squaredDiffs = recentRates.map(v => Math.pow(v - mean, 2));
                this.variance = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length);
            }
            
            return this.currentRate;
        },
        
        sample: function() {
            if (!this.isActive) return;
            
            this.detectFromCamera();
            
            setTimeout(() => this.sample(), CONFIG.HEART_RATE_SAMPLE_RATE);
        },
        
        // Get current metrics
        getMetrics: function() {
            const increase = this.currentRate - this.baseline;
            const percentIncrease = (increase / this.baseline) * 100;
            
            return {
                currentRate: this.currentRate,
                baseline: this.baseline,
                increase: increase,
                percentIncrease: percentIncrease,
                variance: this.variance,
                isElevated: percentIncrease > 15,
                isHigh: percentIncrease > 30,
                isVeryHigh: percentIncrease > 50,
            };
        },
        
        // Record event impact on heart rate
        recordEventImpact: function(eventType, beforeRate) {
            const afterRate = this.currentRate;
            const impact = {
                eventType,
                beforeRate,
                afterRate,
                delta: afterRate - beforeRate,
                percentChange: ((afterRate - beforeRate) / beforeRate) * 100,
                timestamp: Date.now(),
            };
            
            // Store for analysis
            const impacts = JSON.parse(localStorage.getItem('sgai_hr_impacts') || '[]');
            impacts.push(impact);
            localStorage.setItem('sgai_hr_impacts', JSON.stringify(impacts.slice(-100)));
            
            return impact;
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // AUDIO ANALYSIS FOR PLAYER REACTIONS
    // ═══════════════════════════════════════════════════════════════
    
    const AudioAnalyzer = {
        isActive: false,
        audioContext: null,
        analyser: null,
        microphone: null,
        dataArray: null,
        
        // Analysis results
        currentLevel: 0,
        peakLevel: 0,
        suddenIncreases: [],
        
        // Pattern detection
        patterns: {
            gasp: false,
            scream: false,
            heavyBreathing: false,
            silence: false,
        },
        
        start: async function() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 2048;
                
                this.microphone = this.audioContext.createMediaStreamSource(stream);
                this.microphone.connect(this.analyser);
                
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                
                this.isActive = true;
                this.analyze();
                
                console.log('[AudioAnalyzer] Started');
                return true;
            } catch (e) {
                console.warn('[AudioAnalyzer] Could not start:', e.message);
                return false;
            }
        },
        
        stop: function() {
            this.isActive = false;
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
        },
        
        analyze: function() {
            if (!this.isActive) return;
            
            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Calculate average level
            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                sum += this.dataArray[i];
            }
            const avgLevel = sum / this.dataArray.length;
            
            // Track sudden increases
            const previousLevel = this.currentLevel;
            this.currentLevel = avgLevel / 255; // Normalize to 0-1
            
            if (this.currentLevel > this.peakLevel) {
                this.peakLevel = this.currentLevel;
            }
            
            // Detect sudden increase (potential gasp/scream)
            if (this.currentLevel > previousLevel * 2 && this.currentLevel > 0.3) {
                this.suddenIncreases.push({
                    time: Date.now(),
                    level: this.currentLevel,
                    previousLevel: previousLevel,
                });
                
                // Keep only recent
                this.suddenIncreases = this.suddenIncreases.filter(
                    s => Date.now() - s.time < 30000
                );
            }
            
            // Detect patterns
            this.detectPatterns();
            
            setTimeout(() => this.analyze(), CONFIG.AUDIO_SAMPLE_RATE);
        },
        
        detectPatterns: function() {
            const level = this.currentLevel;
            const recentPeaks = this.suddenIncreases.filter(
                s => Date.now() - s.time < 5000
            );
            
            // Gasps: short, sharp increases
            this.patterns.gasp = recentPeaks.length > 0 && 
                recentPeaks.some(s => s.level > 0.5 && s.level < 0.8);
            
            // Screams: sustained high level
            this.patterns.scream = level > 0.7;
            
            // Heavy breathing: rhythmic medium level
            if (this.suddenIncreases.length >= 3) {
                const intervals = [];
                for (let i = 1; i < this.suddenIncreases.length; i++) {
                    intervals.push(this.suddenIncreases[i].time - this.suddenIncreases[i-1].time);
                }
                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                this.patterns.heavyBreathing = avgInterval > 1000 && avgInterval < 3000;
            }
            
            // Silence: very low level
            this.patterns.silence = level < 0.05;
        },
        
        getMetrics: function() {
            return {
                currentLevel: this.currentLevel,
                peakLevel: this.peakLevel,
                recentPeaks: this.suddenIncreases.length,
                patterns: { ...this.patterns },
                isReacting: this.currentLevel > 0.2 || this.patterns.gasp || this.patterns.scream,
            };
        },
        
        // Get reaction strength (0-1)
        getReactionStrength: function() {
            let strength = this.currentLevel;
            
            if (this.patterns.gasp) strength += 0.2;
            if (this.patterns.scream) strength += 0.4;
            if (this.patterns.heavyBreathing) strength += 0.1;
            
            return Math.min(1, strength);
        },
        
        reset: function() {
            this.peakLevel = 0;
            this.suddenIncreases = [];
            this.patterns = {
                gasp: false,
                scream: false,
                heavyBreathing: false,
                silence: false,
            };
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // DYNAMIC PACING ENGINE
    // ═══════════════════════════════════════════════════════════════
    
    const DynamicPacing = {
        currentPace: 0.5, // 0 = slow, 1 = fast
        targetPace: 0.5,
        engagement: 0.5,
        
        // Engagement metrics
        metrics: {
            actionsPerMinute: 0,
            timeSinceLastAction: 0,
            explorationRate: 0,
            objectiveProgress: 0,
            deathRate: 0,
            pauseRate: 0,
        },
        
        // Pacing history
        history: [],
        
        update: function(gameState, deltaTime) {
            // Calculate engagement score
            this.calculateEngagement(gameState);
            
            // Adjust target pace based on engagement
            this.adjustTargetPace(gameState);
            
            // Smooth transition to target
            const diff = this.targetPace - this.currentPace;
            this.currentPace += diff * 0.1;
            
            // Record history
            this.history.push({
                time: Date.now(),
                pace: this.currentPace,
                engagement: this.engagement,
            });
            
            // Keep only recent history
            const cutoff = Date.now() - CONFIG.ENGAGEMENT_WINDOW;
            this.history = this.history.filter(h => h.time > cutoff);
            
            return this.getPacingModifiers();
        },
        
        calculateEngagement: function(gameState) {
            let score = 0.5;
            
            // High action rate = high engagement
            if (this.metrics.actionsPerMinute > 30) score += 0.2;
            else if (this.metrics.actionsPerMinute > 15) score += 0.1;
            else if (this.metrics.actionsPerMinute < 5) score -= 0.1;
            
            // Active exploration = high engagement
            score += this.metrics.explorationRate * 0.2;
            
            // Making progress = engaged
            if (this.metrics.objectiveProgress > 0.5) score += 0.1;
            
            // Frequent deaths might indicate frustration
            if (this.metrics.deathRate > 3) score -= 0.15;
            
            // Frequent pauses might indicate boredom or overwhelm
            if (this.metrics.pauseRate > 5) score -= 0.1;
            
            // Audio/heart rate indicators
            if (AudioAnalyzer.isActive && AudioAnalyzer.getMetrics().isReacting) {
                score += 0.1;
            }
            
            if (HeartRateMonitor.isActive) {
                const hr = HeartRateMonitor.getMetrics();
                if (hr.isElevated) score += 0.05;
                if (hr.isHigh) score += 0.1;
            }
            
            this.engagement = Math.max(0, Math.min(1, score));
        },
        
        adjustTargetPace: function(gameState) {
            // High engagement = can handle faster pace
            if (this.engagement > 0.7) {
                this.targetPace = Math.min(1, this.targetPace + 0.05);
            }
            // Low engagement = slow down
            else if (this.engagement < 0.3) {
                this.targetPace = Math.max(0.2, this.targetPace - 0.05);
            }
            
            // Session progress affects pace (ramp up over time)
            const sessionProgress = Math.min(1, gameState.sessionTime / 1800000);
            this.targetPace = this.targetPace * 0.8 + (0.3 + sessionProgress * 0.5) * 0.2;
        },
        
        getPacingModifiers: function() {
            const pace = this.currentPace;
            
            return {
                // Event frequency
                eventFrequency: 0.5 + pace * 0.5, // 0.5 - 1.0
                
                // Enemy behavior
                enemyAggression: 0.3 + pace * 0.5,
                enemySpeed: 0.6 + pace * 0.4,
                
                // Horror timing
                scareFrequency: 0.4 + pace * 0.4,
                tensionBuildRate: 0.5 + pace * 0.3,
                
                // Resource availability
                resourceScarcity: 0.5 + pace * 0.3,
                
                // Pacing recommendations
                shouldTriggerEvent: this.shouldTriggerEvent(),
                recommendedEventType: this.getRecommendedEventType(),
                nextEventDelay: this.getNextEventDelay(),
                
                // Meta info
                currentPace: pace,
                engagement: this.engagement,
                targetPace: this.targetPace,
            };
        },
        
        shouldTriggerEvent: function() {
            const lastEvent = this.history.filter(h => h.event).pop();
            if (!lastEvent) return true;
            
            const timeSince = Date.now() - lastEvent.time;
            const minDelay = 15000 + (1 - this.currentPace) * 30000;
            
            return timeSince > minDelay;
        },
        
        getRecommendedEventType: function() {
            const pace = this.currentPace;
            const engagement = this.engagement;
            
            // High pace + high engagement = intense events
            if (pace > 0.7 && engagement > 0.6) {
                return ['chase', 'boss_encounter', 'major_event'][Math.floor(Math.random() * 3)];
            }
            
            // Low engagement = ambient horror to build interest
            if (engagement < 0.4) {
                return ['ambient_horror', 'mystery', 'discovery'][Math.floor(Math.random() * 3)];
            }
            
            // Default: variety
            return ['minor_event', 'ambient_horror', 'jumpscare', 'resource_find'][Math.floor(Math.random() * 4)];
        },
        
        getNextEventDelay: function() {
            const baseDelay = 20000;
            const paceModifier = (1 - this.currentPace) * 20000;
            const engagementModifier = this.engagement < 0.4 ? 10000 : 0;
            
            return baseDelay + paceModifier - engagementModifier + Math.random() * 10000;
        },
        
        recordAction: function(actionType) {
            this.metrics.timeSinceLastAction = 0;
            
            // Update actions per minute
            const now = Date.now();
            this.history.push({ time: now, action: actionType });
            
            const recent = this.history.filter(h => now - h.time < 60000 && h.action);
            this.metrics.actionsPerMinute = recent.length;
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // A/B TESTING FOR SCARE EFFECTIVENESS
    // ═══════════════════════════════════════════════════════════════
    
    const ABTesting = {
        experiments: {},
        results: {},
        
        experiments: {
            jumpscare_timing: {
                name: 'Jumpscare Timing',
                variants: ['immediate', 'delayed', 'anticipated'],
                active: true,
            },
            chase_intensity: {
                name: 'Chase Intensity',
                variants: ['relentless', 'periodic', 'teleporting'],
                active: true,
            },
            darkness_duration: {
                name: 'Darkness Duration',
                variants: ['short', 'medium', 'long'],
                active: true,
            },
            sound_type: {
                name: 'Horror Sound Type',
                variants: ['whispers', 'footsteps', 'breathing', 'scratching'],
                active: true,
            },
        },
        
        init: function() {
            // Assign user to experiment buckets
            this.assignBuckets();
            
            // Load previous results
            this.loadResults();
        },
        
        assignBuckets: function() {
            const userId = this.getUserId();
            
            for (const expId in this.experiments) {
                const exp = this.experiments[expId];
                const hash = this.hashString(userId + expId);
                const variantIndex = hash % exp.variants.length;
                
                exp.assignedVariant = exp.variants[variantIndex];
            }
        },
        
        getUserId: function() {
            let userId = localStorage.getItem('sgai_user_id');
            if (!userId) {
                userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('sgai_user_id', userId);
            }
            return userId;
        },
        
        hashString: function(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash);
        },
        
        getVariant: function(experimentId) {
            const exp = this.experiments[experimentId];
            return exp ? exp.assignedVariant : null;
        },
        
        recordResult: function(experimentId, metric, value) {
            const variant = this.getVariant(experimentId);
            if (!variant) return;
            
            if (!this.results[experimentId]) {
                this.results[experimentId] = {};
            }
            if (!this.results[experimentId][variant]) {
                this.results[experimentId][variant] = {};
            }
            if (!this.results[experimentId][variant][metric]) {
                this.results[experimentId][variant][metric] = [];
            }
            
            this.results[experimentId][variant][metric].push({
                value,
                timestamp: Date.now(),
            });
            
            this.saveResults();
        },
        
        getAnalysis: function(experimentId) {
            const expResults = this.results[experimentId];
            if (!expResults) return null;
            
            const analysis = {};
            
            for (const variant in expResults) {
                analysis[variant] = {};
                
                for (const metric in expResults[variant]) {
                    const values = expResults[variant][metric].map(r => r.value);
                    const avg = values.reduce((a, b) => a + b, 0) / values.length;
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    
                    analysis[variant][metric] = {
                        average: avg,
                        min,
                        max,
                        samples: values.length,
                    };
                }
            }
            
            return analysis;
        },
        
        loadResults: function() {
            const saved = localStorage.getItem('sgai_ab_results');
            if (saved) {
                try {
                    this.results = JSON.parse(saved);
                } catch (e) {}
            }
        },
        
        saveResults: function() {
            localStorage.setItem('sgai_ab_results', JSON.stringify(this.results));
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // COMMUNITY FEAR DATA AGGREGATION
    // ═══════════════════════════════════════════════════════════════
    
    const CommunityData = {
        aggregatedData: null,
        lastSync: 0,
        
        // Local contribution
        contributions: [],
        
        init: function() {
            this.loadLocalData();
            this.sync();
            
            // Periodic sync
            setInterval(() => this.sync(), CONFIG.COMMUNITY_SYNC_INTERVAL);
        },
        
        loadLocalData: function() {
            const saved = localStorage.getItem('sgai_community_contributions');
            if (saved) {
                try {
                    this.contributions = JSON.parse(saved);
                } catch (e) {}
            }
        },
        
        contribute: function(eventType, effectiveness, context) {
            const contribution = {
                eventType,
                effectiveness,
                context: {
                    game: context.game,
                    difficulty: context.difficulty,
                    sessionTime: Math.floor(context.sessionTime / 60000), // Minutes
                    playerTier: context.tier,
                },
                timestamp: Date.now(),
            };
            
            this.contributions.push(contribution);
            
            // Keep only recent contributions
            this.contributions = this.contributions.slice(-100);
            
            localStorage.setItem('sgai_community_contributions', JSON.stringify(this.contributions));
        },
        
        sync: async function() {
            try {
                // In production, this would sync with server
                // For now, we'll use local aggregation
                
                const response = await fetch('/api/community/fear-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contributions: this.contributions,
                        lastSync: this.lastSync,
                    }),
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.aggregatedData = data.aggregated;
                    this.lastSync = Date.now();
                    
                    // Clear sent contributions
                    this.contributions = [];
                    localStorage.setItem('sgai_community_contributions', '[]');
                }
            } catch (e) {
                // Fallback: use local aggregation
                this.aggregatedData = this.aggregateLocal();
            }
        },
        
        aggregateLocal: function() {
            const aggregated = {
                byEventType: {},
                byDifficulty: {},
                byGame: {},
                overall: { totalSamples: 0, avgEffectiveness: 0 },
            };
            
            let totalEffectiveness = 0;
            
            for (const c of this.contributions) {
                // By event type
                if (!aggregated.byEventType[c.eventType]) {
                    aggregated.byEventType[c.eventType] = { total: 0, sum: 0, avg: 0 };
                }
                aggregated.byEventType[c.eventType].total++;
                aggregated.byEventType[c.eventType].sum += c.effectiveness;
                
                // By difficulty
                const diff = c.context.difficulty;
                if (!aggregated.byDifficulty[diff]) {
                    aggregated.byDifficulty[diff] = { total: 0, sum: 0, avg: 0 };
                }
                aggregated.byDifficulty[diff].total++;
                aggregated.byDifficulty[diff].sum += c.effectiveness;
                
                // By game
                const game = c.context.game;
                if (!aggregated.byGame[game]) {
                    aggregated.byGame[game] = { total: 0, sum: 0, avg: 0 };
                }
                aggregated.byGame[game].total++;
                aggregated.byGame[game].sum += c.effectiveness;
                
                totalEffectiveness += c.effectiveness;
            }
            
            // Calculate averages
            aggregated.overall.totalSamples = this.contributions.length;
            aggregated.overall.avgEffectiveness = this.contributions.length > 0 ?
                totalEffectiveness / this.contributions.length : 0;
            
            for (const type in aggregated.byEventType) {
                const t = aggregated.byEventType[type];
                t.avg = t.sum / t.total;
            }
            
            for (const diff in aggregated.byDifficulty) {
                const d = aggregated.byDifficulty[diff];
                d.avg = d.sum / d.total;
            }
            
            for (const game in aggregated.byGame) {
                const g = aggregated.byGame[game];
                g.avg = g.sum / g.total;
            }
            
            return aggregated;
        },
        
        getCommunityInsights: function() {
            if (!this.aggregatedData) {
                this.aggregatedData = this.aggregateLocal();
            }
            
            const data = this.aggregatedData;
            
            // Find most effective fear types
            const fearTypes = Object.entries(data.byEventType || {})
                .map(([type, stats]) => ({ type, effectiveness: stats.avg, samples: stats.total }))
                .filter(f => f.samples >= 3)
                .sort((a, b) => b.effectiveness - a.effectiveness);
            
            return {
                topFears: fearTypes.slice(0, 5),
                bottomFears: fearTypes.slice(-5).reverse(),
                overallAvg: data.overall.avgEffectiveness,
                sampleSize: data.overall.totalSamples,
                lastUpdated: this.lastSync,
            };
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // GHOST REPLAY SYSTEM
    // ═══════════════════════════════════════════════════════════════
    
    const GhostReplay = {
        ghosts: [],
        currentGhost: null,
        playbackIndex: 0,
        isPlaying: false,
        
        // Create ghost from top player data
        createGhost: function(playerData, score, game) {
            return {
                id: 'ghost_' + Date.now(),
                name: playerData.name || 'Top Player',
                score: score,
                game: game,
                frames: playerData.frames || [],
                createdAt: Date.now(),
            };
        },
        
        // Load ghosts for a specific game
        loadGhosts: function(gameId) {
            const saved = localStorage.getItem('sgai_ghosts_' + gameId);
            if (saved) {
                try {
                    this.ghosts = JSON.parse(saved);
                    this.ghosts.sort((a, b) => b.score - a.score);
                } catch (e) {
                    this.ghosts = [];
                }
            }
        },
        
        // Save ghost
        saveGhost: function(gameId) {
            localStorage.setItem('sgai_ghosts_' + gameId, JSON.stringify(this.ghosts.slice(0, 10)));
        },
        
        // Start playback
        startPlayback: function(ghostIndex) {
            if (this.ghosts.length === 0) return false;
            
            this.currentGhost = this.ghosts[ghostIndex] || this.ghosts[0];
            this.playbackIndex = 0;
            this.isPlaying = true;
            
            return true;
        },
        
        // Stop playback
        stopPlayback: function() {
            this.isPlaying = false;
            this.currentGhost = null;
            this.playbackIndex = 0;
        },
        
        // Get current frame
        getCurrentFrame: function() {
            if (!this.currentGhost || !this.isPlaying) return null;
            
            const frame = this.currentGhost.frames[this.playbackIndex];
            
            // Advance index
            this.playbackIndex++;
            if (this.playbackIndex >= this.currentGhost.frames.length) {
                this.stopPlayback();
            }
            
            return frame;
        },
        
        // Generate AI ghost from patterns
        generateAIGhost: function(gameId, difficulty) {
            // Load community patterns
            const patterns = this.loadPatterns(gameId);
            
            // Generate synthetic ghost
            const ghost = {
                id: 'ai_ghost_' + Date.now(),
                name: 'AI Shadow',
                score: this.estimateScore(patterns, difficulty),
                game: gameId,
                frames: this.generateFrames(patterns, difficulty),
                createdAt: Date.now(),
                isAI: true,
            };
            
            return ghost;
        },
        
        loadPatterns: function(gameId) {
            const saved = localStorage.getItem('sgai_patterns_' + gameId);
            return saved ? JSON.parse(saved) : { paths: [], actions: [], timings: [] };
        },
        
        estimateScore: function(patterns, difficulty) {
            // Estimate based on pattern efficiency
            const baseScore = 1000;
            const difficultyMultiplier = 0.5 + difficulty * 0.5;
            const efficiencyBonus = patterns.paths.length > 0 ? 
                Math.min(2, patterns.paths.length / 10) : 1;
            
            return Math.floor(baseScore * difficultyMultiplier * efficiencyBonus);
        },
        
        generateFrames: function(patterns, difficulty) {
            const frames = [];
            const duration = 60000; // 1 minute ghost
            const frameCount = duration / CONFIG.GHOST_REPLAY_RESOLUTION;
            
            for (let i = 0; i < frameCount; i++) {
                const t = i / frameCount;
                
                frames.push({
                    time: i * CONFIG.GHOST_REPLAY_RESOLUTION,
                    position: {
                        x: Math.sin(t * Math.PI * 2) * 50 + 100,
                        y: 0,
                        z: Math.cos(t * Math.PI * 2) * 50 + 100,
                    },
                    rotation: {
                        y: t * Math.PI * 2,
                    },
                    action: Math.random() < 0.1 ? 'interact' : 'move',
                });
            }
            
            return frames;
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // COACH AI
    // ═══════════════════════════════════════════════════════════════
    
    const CoachAI = {
        analysisResults: null,
        lastAnalysis: 0,
        suggestions: [],
        
        // Analyze gameplay
        analyze: function(gameState, playerMetrics) {
            const now = Date.now();
            if (now - this.lastAnalysis < CONFIG.COACH_ANALYSIS_INTERVAL) {
                return this.analysisResults;
            }
            
            this.lastAnalysis = now;
            
            const analysis = {
                strengths: [],
                weaknesses: [],
                suggestions: [],
                score: 0,
            };
            
            // Analyze survival
            if (playerMetrics.deaths < 1) {
                analysis.strengths.push({ area: 'survival', score: 1, message: 'Perfect survival rate!' });
            } else if (playerMetrics.deaths < 3) {
                analysis.strengths.push({ area: 'survival', score: 0.7, message: 'Good survival awareness' });
            } else {
                analysis.weaknesses.push({ area: 'survival', score: 0.3, message: 'Try to be more cautious' });
                analysis.suggestions.push({
                    type: 'survival',
                    priority: 'high',
                    tip: 'Use cover and listen for enemy sounds. Consider lowering difficulty to learn patterns.',
                });
            }
            
            // Analyze resource management
            const resourceRatio = playerMetrics.resourcesUsed / Math.max(1, playerMetrics.resourcesFound);
            if (resourceRatio > 0.9) {
                analysis.weaknesses.push({ area: 'resources', score: 0.4, message: 'Using resources too quickly' });
                analysis.suggestions.push({
                    type: 'resources',
                    priority: 'medium',
                    tip: 'Save powerful items for emergencies. Explore more to find additional resources.',
                });
            } else if (resourceRatio < 0.3) {
                analysis.strengths.push({ area: 'resources', score: 0.8, message: 'Excellent resource conservation' });
            }
            
            // Analyze exploration
            if (playerMetrics.secretsFound > 3) {
                analysis.strengths.push({ area: 'exploration', score: 0.9, message: 'Great at finding secrets!' });
            } else if (playerMetrics.secretsFound === 0 && playerMetrics.sessionTime > 300000) {
                analysis.suggestions.push({
                    type: 'exploration',
                    priority: 'low',
                    tip: 'Try checking behind objects and in corners. There may be hidden secrets!',
                });
            }
            
            // Analyze combat (if applicable)
            if (playerMetrics.combatEncounters > 0) {
                const killRate = playerMetrics.kills / playerMetrics.combatEncounters;
                if (killRate > 0.8) {
                    analysis.strengths.push({ area: 'combat', score: 0.9, message: 'Excellent combat skills!' });
                } else if (killRate < 0.3) {
                    analysis.weaknesses.push({ area: 'combat', score: 0.3, message: 'Struggling in combat' });
                    analysis.suggestions.push({
                        type: 'combat',
                        priority: 'high',
                        tip: 'Try using hit-and-run tactics. Watch enemy attack patterns.',
                    });
                }
            }
            
            // Analyze speed/efficiency
            if (playerMetrics.objectiveTime && playerMetrics.averageObjectiveTime) {
                if (playerMetrics.objectiveTime < playerMetrics.averageObjectiveTime * 0.7) {
                    analysis.strengths.push({ area: 'speed', score: 0.9, message: 'Completing objectives quickly!' });
                } else if (playerMetrics.objectiveTime > playerMetrics.averageObjectiveTime * 1.5) {
                    analysis.suggestions.push({
                        type: 'efficiency',
                        priority: 'low',
                        tip: 'Consider planning your route more efficiently.',
                    });
                }
            }
            
            // Calculate overall score
            const strengthAvg = analysis.strengths.length > 0 ?
                analysis.strengths.reduce((a, b) => a + b.score, 0) / analysis.strengths.length : 0.5;
            const weaknessAvg = analysis.weaknesses.length > 0 ?
                analysis.weaknesses.reduce((a, b) => a + b.score, 0) / analysis.weaknesses.length : 0.5;
            
            analysis.score = (strengthAvg * 0.6 + (1 - weaknessAvg) * 0.4);
            
            this.analysisResults = analysis;
            this.suggestions = analysis.suggestions;
            
            return analysis;
        },
        
        // Get personalized tips
        getTips: function(gameId) {
            const tips = {
                'backrooms-pacman': [
                    'Listen for Pac-Man\'s movement sounds to predict his path.',
                    'Use corners to break line of sight.',
                    'Power pellets let you move faster temporarily.',
                    'Sprint is limited - save it for emergencies.',
                ],
                'shadow-crawler': [
                    'Conserve torch fuel by staying near light sources.',
                    'Listen for enemy footsteps before entering rooms.',
                    'Shields block one hit - use them wisely.',
                    'Explore side paths for hidden treasures.',
                ],
                'the-abyss': [
                    'Manage oxygen carefully - surface regularly.',
                    'Use sonar to detect threats in murky water.',
                    'Upgrade your submersible for deeper dives.',
                    'Some creatures are attracted to light.',
                ],
            };
            
            return tips[gameId] || [
                'Take your time to explore the environment.',
                'Listen carefully - audio cues are important.',
                'Don\'t be afraid to retreat and regroup.',
                'Check your objectives regularly.',
            ];
        },
        
        // Show coaching notification
        showSuggestion: function(suggestion) {
            const notification = document.createElement('div');
            notification.className = 'coach-suggestion';
            notification.innerHTML =
                '<div class="coach-icon">💡</div>' +
                '<div class="coach-content">' +
                '<div class="coach-title">Coach Tip</div>' +
                '<div class="coach-message">' + suggestion.tip + '</div>' +
                '</div>';
            
            document.body.appendChild(notification);
            
            setTimeout(() => notification.classList.add('show'), 10);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 5000);
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // NARRATIVE GENERATOR
    // ═══════════════════════════════════════════════════════════════
    
    const NarrativeGenerator = {
        templates: {
            intro: [
                'The {adjective} {location} stretches before you...',
                'You find yourself in a {location}. Something feels {adjective}.',
                '{adjective.capitalize()} whispers echo through the {location}.',
            ],
            discovery: [
                'You discover a {object} covered in {substance}.',
                'A {object} lies abandoned, stained with {substance}.',
                'Something catches your eye - a {object}, {adjective}.',
            ],
            danger: [
                '{enemy.capitalize()} emerges from the {location}!',
                'You hear {enemy} approaching from {direction}.',
                'The {location} grows {adjective}. {enemy.capitalize()} is near.',
            ],
            escape: [
                'You barely escape the {enemy}.',
                'With seconds to spare, you evade the {enemy}.',
                'The {object} provides cover as {enemy} passes by.',
            ],
            climax: [
                'The final confrontation awaits.',
                'You sense the end is near...',
                'One final challenge stands between you and escape.',
            ],
        },
        
        vocabulary: {
            adjective: ['dark', 'eerie', 'ominous', 'sinister', 'foreboding', 'ancient', 'forgotten', 'cursed'],
            location: ['corridor', 'chamber', 'passage', 'hall', 'room', 'tunnel', 'void'],
            object: ['artifact', 'relic', 'remains', 'journal', 'key', 'symbol', 'door'],
            substance: ['blood', 'dust', 'shadows', 'darkness', 'rust', 'decay'],
            enemy: ['creature', 'shadow', 'presence', 'horror', 'entity', 'phantom'],
            direction: ['behind', 'ahead', 'the left', 'the right', 'above', 'below'],
        },
        
        generate: function(type, context) {
            const templates = this.templates[type] || this.templates.intro;
            const template = templates[Math.floor(Math.random() * templates.length)];
            
            let result = template;
            
            // Replace placeholders
            for (const [key, values] of Object.entries(this.vocabulary)) {
                const regex = new RegExp(`{${key}(?:\\.capitalize)?}`, 'g');
                result = result.replace(regex, (match) => {
                    const value = values[Math.floor(Math.random() * values.length)];
                    return match.includes('.capitalize') ? 
                        value.charAt(0).toUpperCase() + value.slice(1) : value;
                });
            }
            
            // Replace context placeholders
            if (context) {
                for (const [key, value] of Object.entries(context)) {
                    result = result.replace(`{${key}}`, value);
                }
            }
            
            return result;
        },
        
        // Generate a story arc for a session
        generateStoryArc: function(gameId, sessionProgress) {
            const arc = {
                intro: this.generate('intro'),
                events: [],
                climax: null,
                resolution: null,
            };
            
            // Add discovery events
            const discoveryCount = Math.floor(sessionProgress * 5);
            for (let i = 0; i < discoveryCount; i++) {
                arc.events.push({
                    type: 'discovery',
                    text: this.generate('discovery'),
                    progress: (i + 1) / (discoveryCount + 2),
                });
            }
            
            // Add danger events
            const dangerCount = Math.floor(sessionProgress * 3);
            for (let i = 0; i < dangerCount; i++) {
                arc.events.push({
                    type: 'danger',
                    text: this.generate('danger'),
                    progress: 0.3 + (i / dangerCount) * 0.4,
                });
            }
            
            // Add escape events
            arc.events.push({
                type: 'escape',
                text: this.generate('escape'),
                progress: 0.8,
            });
            
            // Climax
            arc.climax = this.generate('climax');
            
            // Sort by progress
            arc.events.sort((a, b) => a.progress - b.progress);
            
            return arc;
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // CHALLENGE MODES
    // ═══════════════════════════════════════════════════════════════
    
    const ChallengeModes = {
        modes: {
            permadeath: {
                name: 'Permadeath',
                description: 'One life. No respawns.',
                icon: '💀',
                modifiers: {
                    lives: 1,
                    checkpoints: false,
                    saves: false,
                },
                scoreMultiplier: 2.0,
            },
            speedrun: {
                name: 'Speedrun',
                description: 'Complete as fast as possible.',
                icon: '⚡',
                modifiers: {
                    timer: true,
                    showTimer: true,
                    leaderboard: 'speedrun',
                },
                scoreMultiplier: 1.5,
            },
            hardcore: {
                name: 'Hardcore',
                description: 'Permadeath + Nightmare difficulty.',
                icon: '☠️',
                modifiers: {
                    lives: 1,
                    difficulty: 'nightmare',
                    checkpoints: false,
                    saves: false,
                },
                scoreMultiplier: 3.0,
            },
            pacifist: {
                name: 'Pacifist',
                description: 'Complete without killing.',
                icon: '☮️',
                modifiers: {
                    noKills: true,
                    stealthOnly: true,
                },
                scoreMultiplier: 2.5,
            },
            ironman: {
                name: 'Ironman',
                description: 'No HUD, no map, no hints.',
                icon: '🛡️',
                modifiers: {
                    noHUD: true,
                    noMap: true,
                    noHints: true,
                },
                scoreMultiplier: 2.0,
            },
            nightmare: {
                name: 'Endless Nightmare',
                description: 'Infinite waves of increasing difficulty.',
                icon: '👹',
                modifiers: {
                    endless: true,
                    difficultyScaling: 1.1,
                    bossEvery: 5,
                },
                scoreMultiplier: 1.0,
            },
        },
        
        activeMode: null,
        
        activate: function(modeId) {
            if (!this.modes[modeId]) return false;
            
            this.activeMode = {
                id: modeId,
                ...this.modes[modeId],
                startTime: Date.now(),
                stats: {
                    deaths: 0,
                    kills: 0,
                    timeElapsed: 0,
                },
            };
            
            return true;
        },
        
        deactivate: function() {
            const result = this.activeMode;
            this.activeMode = null;
            return result;
        },
        
        getModifiers: function() {
            if (!this.activeMode) return {};
            return this.activeMode.modifiers;
        },
        
        getScoreMultiplier: function() {
            if (!this.activeMode) return 1.0;
            return this.activeMode.scoreMultiplier;
        },
        
        recordStat: function(stat, value) {
            if (!this.activeMode) return;
            if (this.activeMode.stats[stat] !== undefined) {
                this.activeMode.stats[stat] += value || 1;
            }
        },
        
        isFailed: function() {
            if (!this.activeMode) return false;
            
            // Check permadeath failure
            if (this.activeMode.modifiers.lives === 1 && this.activeMode.stats.deaths >= 1) {
                return true;
            }
            
            // Check pacifist failure
            if (this.activeMode.modifiers.noKills && this.activeMode.stats.kills > 0) {
                return true;
            }
            
            return false;
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // PER-GAME DIFFICULTY PROFILES
    // ═══════════════════════════════════════════════════════════════
    
    const GameProfiles = {
        profiles: {},
        
        games: {
            'backrooms-pacman': {
                name: 'Backrooms Pac-Man',
                type: 'horror-chase',
                defaultDifficulty: 0.5,
                difficultyRange: { min: 0.2, max: 0.9 },
                skillFactors: ['reactionTime', 'spatialAwareness'],
            },
            'shadow-crawler': {
                name: 'Shadow Crawler',
                type: 'dungeon-crawler',
                defaultDifficulty: 0.4,
                difficultyRange: { min: 0.2, max: 0.8 },
                skillFactors: ['resourceManagement', 'combat'],
            },
            'the-abyss': {
                name: 'The Abyss',
                type: 'underwater-horror',
                defaultDifficulty: 0.5,
                difficultyRange: { min: 0.3, max: 0.85 },
                skillFactors: ['resourceManagement', 'exploration'],
            },
            'cursed-depths': {
                name: 'Cursed Depths',
                type: 'survival-sandbox',
                defaultDifficulty: 0.35,
                difficultyRange: { min: 0.1, max: 0.7 },
                skillFactors: ['resourceManagement', 'exploration', 'combat'],
            },
            // ... other games
        },
        
        init: function() {
            this.loadProfiles();
        },
        
        loadProfiles: function() {
            const saved = localStorage.getItem('sgai_game_profiles');
            if (saved) {
                try {
                    this.profiles = JSON.parse(saved);
                } catch (e) {}
            }
        },
        
        saveProfiles: function() {
            localStorage.setItem('sgai_game_profiles', JSON.stringify(this.profiles));
        },
        
        getProfile: function(gameId) {
            if (!this.profiles[gameId]) {
                const game = this.games[gameId] || {};
                this.profiles[gameId] = {
                    difficulty: game.defaultDifficulty || 0.5,
                    playCount: 0,
                    totalScore: 0,
                    highScore: 0,
                    averageDeathRate: 0.5,
                    completionRate: 0,
                    lastPlayed: null,
                };
            }
            return this.profiles[gameId];
        },
        
        updateProfile: function(gameId, sessionData) {
            const profile = this.getProfile(gameId);
            
            profile.playCount++;
            profile.totalScore += sessionData.score || 0;
            profile.highScore = Math.max(profile.highScore, sessionData.score || 0);
            profile.lastPlayed = Date.now();
            
            // Update running averages
            const n = profile.playCount;
            profile.averageDeathRate = ((profile.averageDeathRate * (n - 1)) + (sessionData.deaths || 0)) / n;
            profile.completionRate = ((profile.completionRate * (n - 1)) + (sessionData.completed ? 1 : 0)) / n;
            
            // Adjust difficulty based on performance
            this.adjustDifficulty(gameId, sessionData);
            
            this.saveProfiles();
        },
        
        adjustDifficulty: function(gameId, sessionData) {
            const profile = this.getProfile(gameId);
            const game = this.games[gameId] || {};
            
            let adjustment = 0;
            
            // Death rate adjustment
            if (sessionData.deaths > 5) adjustment -= 0.1;
            else if (sessionData.deaths > 3) adjustment -= 0.05;
            else if (sessionData.deaths === 0 && sessionData.completed) adjustment += 0.1;
            
            // Score adjustment
            if (sessionData.score > profile.highScore * 1.2) adjustment += 0.05;
            
            // Completion adjustment
            if (sessionData.completed) adjustment += 0.05;
            
            // Apply adjustment
            profile.difficulty += adjustment;
            
            // Clamp to game's difficulty range
            const range = game.difficultyRange || { min: 0.2, max: 0.8 };
            profile.difficulty = Math.max(range.min, Math.min(range.max, profile.difficulty));
        },
        
        getRecommendedDifficulty: function(gameId) {
            return this.getProfile(gameId).difficulty;
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // INJECT STYLES
    // ═══════════════════════════════════════════════════════════════
    
    function injectStyles() {
        if (document.getElementById('sai-enhanced-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'sai-enhanced-styles';
        style.textContent = `
            /* Coach Suggestion */
            .coach-suggestion {
                position: fixed;
                bottom: 80px;
                left: 20px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 16px;
                background: linear-gradient(135deg, rgba(0,100,200,0.9), rgba(0,50,150,0.9));
                border: 1px solid rgba(100,150,255,0.3);
                border-radius: 12px;
                max-width: 320px;
                transform: translateX(-120%);
                transition: transform 0.4s cubic-bezier(0.68,-0.55,0.265,1.55);
                z-index: 9999;
                box-shadow: 0 10px 40px rgba(0,100,200,0.3);
            }
            .coach-suggestion.show { transform: translateX(0); }
            .coach-icon { font-size: 28px; }
            .coach-content { display: flex; flex-direction: column; gap: 4px; }
            .coach-title { font-size: 0.75rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px; }
            .coach-message { font-size: 0.9rem; color: #fff; line-height: 1.4; }
            
            /* Heart Rate Display */
            .heart-rate-display {
                position: fixed;
                top: 60px;
                right: 20px;
                padding: 12px 16px;
                background: rgba(0,0,0,0.8);
                border: 1px solid rgba(255,100,100,0.3);
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 1000;
            }
            .heart-rate-icon { font-size: 20px; animation: pulse 1s infinite; }
            @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }
            .heart-rate-value { font-size: 1.1rem; font-weight: 600; color: #ff6666; }
            .heart-rate-label { font-size: 0.7rem; color: #888; }
        `;
        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    
    function init() {
        injectStyles();
        MLPredictor.init();
        ABTesting.init();
        CommunityData.init();
        GameProfiles.init();
        
        console.log('[SGAIAIEnhanced] Phase 3 systems initialized');
    }

    // Auto-init on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════
    
    return {
        // ML Predictor
        ml: {
            predictFear: MLPredictor.predictFear.bind(MLPredictor),
            predictAllFears: MLPredictor.predictAllFears.bind(MLPredictor),
            getOptimalScare: MLPredictor.getOptimalScare.bind(MLPredictor),
            train: MLPredictor.train.bind(MLPredictor),
            getAccuracy: function() { return MLPredictor.accuracy; },
        },
        
        // Heart Rate
        heartRate: {
            start: HeartRateMonitor.start.bind(HeartRateMonitor),
            stop: HeartRateMonitor.stop.bind(HeartRateMonitor),
            getMetrics: HeartRateMonitor.getMetrics.bind(HeartRateMonitor),
            recordEventImpact: HeartRateMonitor.recordEventImpact.bind(HeartRateMonitor),
            isActive: function() { return HeartRateMonitor.isActive; },
        },
        
        // Audio Analysis
        audio: {
            start: AudioAnalyzer.start.bind(AudioAnalyzer),
            stop: AudioAnalyzer.stop.bind(AudioAnalyzer),
            getMetrics: AudioAnalyzer.getMetrics.bind(AudioAnalyzer),
            getReactionStrength: AudioAnalyzer.getReactionStrength.bind(AudioAnalyzer),
            isActive: function() { return AudioAnalyzer.isActive; },
        },
        
        // Dynamic Pacing
        pacing: {
            update: DynamicPacing.update.bind(DynamicPacing),
            getModifiers: DynamicPacing.getPacingModifiers.bind(DynamicPacing),
            recordAction: DynamicPacing.recordAction.bind(DynamicPacing),
            getEngagement: function() { return DynamicPacing.engagement; },
        },
        
        // A/B Testing
        ab: {
            getVariant: ABTesting.getVariant.bind(ABTesting),
            recordResult: ABTesting.recordResult.bind(ABTesting),
            getAnalysis: ABTesting.getAnalysis.bind(ABTesting),
        },
        
        // Community Data
        community: {
            contribute: CommunityData.contribute.bind(CommunityData),
            getInsights: CommunityData.getCommunityInsights.bind(CommunityData),
            sync: CommunityData.sync.bind(CommunityData),
        },
        
        // Ghost Replay
        ghost: {
            loadGhosts: GhostReplay.loadGhosts.bind(GhostReplay),
            startPlayback: GhostReplay.startPlayback.bind(GhostReplay),
            stopPlayback: GhostReplay.stopPlayback.bind(GhostReplay),
            getCurrentFrame: GhostReplay.getCurrentFrame.bind(GhostReplay),
            generateAIGhost: GhostReplay.generateAIGhost.bind(GhostReplay),
        },
        
        // Coach AI
        coach: {
            analyze: CoachAI.analyze.bind(CoachAI),
            getTips: CoachAI.getTips.bind(CoachAI),
            showSuggestion: CoachAI.showSuggestion.bind(CoachAI),
        },
        
        // Narrative Generator
        narrative: {
            generate: NarrativeGenerator.generate.bind(NarrativeGenerator),
            generateStoryArc: NarrativeGenerator.generateStoryArc.bind(NarrativeGenerator),
        },
        
        // Challenge Modes
        challenges: {
            modes: ChallengeModes.modes,
            activate: ChallengeModes.activate.bind(ChallengeModes),
            deactivate: ChallengeModes.deactivate.bind(ChallengeModes),
            getModifiers: ChallengeModes.getModifiers.bind(ChallengeModes),
            getScoreMultiplier: ChallengeModes.getScoreMultiplier.bind(ChallengeModes),
            isFailed: ChallengeModes.isFailed.bind(ChallengeModes),
            recordStat: ChallengeModes.recordStat.bind(ChallengeModes),
        },
        
        // Game Profiles
        profiles: {
            get: GameProfiles.getProfile.bind(GameProfiles),
            update: GameProfiles.updateProfile.bind(GameProfiles),
            getRecommendedDifficulty: GameProfiles.getRecommendedDifficulty.bind(GameProfiles),
        },
        
        // Version
        version: '3.0.0',
    };
})();

// Export for global access
window.SGAIAIEnhanced = SGAIAIEnhanced;
