/**
 * Phase 8: Quality Assurance
 * 
 * Testing (automated gameplay, performance, compatibility, accessibility)
 * Analytics (generation, game, user behavior, A/B testing)
 */

class GameTester {
    constructor() {
        this.isRunning = false;
        this.currentTest = null;
        this.testResults = [];
        
        this._init();
    }
    
    _init() {
        console.log('[Tester] Initializing Game Tester...');
    }
    
    // ============================================
    // AUTOMATED GAMEPLAY TESTING
    // ============================================
    
    /**
     * Run automated gameplay tests
     */
    async runAutomatedTests(gameId, options = {}) {
        const config = {
            iterations: options.iterations || 10,
            duration: options.duration || 60, // seconds per iteration
            difficulty: options.difficulty || 'normal',
            actions: this._getTestActions(options.testType || 'exploratory'),
            ...options
        };
        
        console.log(`[Tester] Running ${config.iterations} automated tests...`);
        
        this.isRunning = true;
        const results = {
            gameId,
            config,
            iterations: [],
            summary: {},
            startTime: new Date().toISOString()
        };
        
        for (let i = 0; i < config.iterations; i++) {
            if (!this.isRunning) break;
            
            console.log(`[Tester] Iteration ${i + 1}/${config.iterations}`);
            
            const iteration = await this._runIteration(gameId, config, i);
            results.iterations.push(iteration);
            
            // Brief pause between iterations
            await this._delay(100);
        }
        
        results.endTime = new Date().toISOString();
        results.summary = this._summarizeResults(results.iterations);
        
        this.testResults.push(results);
        this.isRunning = false;
        
        // Notify completion
        window.dispatchEvent(new CustomEvent('testing:completed', { detail: results }));
        
        return results;
    }
    
    /**
     * Stop running tests
     */
    stopTests() {
        this.isRunning = false;
        console.log('[Tester] Tests stopped by user');
    }
    
    /**
     * Get test actions based on test type
     */
    _getTestActions(testType) {
        const actions = {
            exploratory: ['move_up', 'move_down', 'move_left', 'move_right', 'interact', 'wait'],
            aggressive: ['attack', 'move_toward_enemy', 'use_power', 'dodge'],
            stealth: ['move_slow', 'hide', 'wait', 'observe'],
            puzzle: ['interact', 'select', 'use_item', 'move', 'wait']
        };
        
        return actions[testType] || actions.exploratory;
    }
    
    /**
     * Run single test iteration
     */
    async _runIteration(gameId, config, iterationIndex) {
        const iteration = {
            index: iterationIndex,
            startTime: Date.now(),
            actions: [],
            events: [],
            errors: [],
            endState: null
        };
        
        const canvas = document.querySelector('canvas');
        if (!canvas) {
            iteration.errors.push('No game canvas found');
            return iteration;
        }
        
        // Simulate gameplay for configured duration
        const maxSteps = config.duration * 60; // Assuming 60fps
        let step = 0;
        
        while (step < maxSteps && this.isRunning) {
            // Choose random action from available actions
            const action = config.actions[Math.floor(Math.random() * config.actions.length)];
            
            // Execute action
            const actionResult = await this._executeAction(action, canvas);
            
            iteration.actions.push({
                step,
                action,
                result: actionResult
            });
            
            // Check for game events
            const gameState = this._getGameState(canvas);
            if (gameState) {
                iteration.events.push({
                    step,
                    state: gameState
                });
                
                // Check for errors
                if (gameState.error) {
                    iteration.errors.push({
                        step,
                        error: gameState.error
                    });
                }
                
                // Check for game over
                if (gameState.gameOver) {
                    break;
                }
            }
            
            step++;
            
            // Add some randomness to timing
            await this._delay(50 + Math.random() * 100);
        }
        
        iteration.endTime = Date.now();
        iteration.duration = iteration.endTime - iteration.startTime;
        iteration.endState = this._getGameState(canvas);
        
        return iteration;
    }
    
    /**
     * Execute action in game
     */
    async _executeAction(action, canvas) {
        const result = { action, success: true };
        
        // Map actions to keyboard events
        const actionMap = {
            'move_up': { key: 'ArrowUp', type: 'keydown' },
            'move_down': { key: 'ArrowDown', type: 'keydown' },
            'move_left': { key: 'ArrowLeft', type: 'keydown' },
            'move_right': { key: 'ArrowRight', type: 'keydown' },
            'interact': { key: 'Space', type: 'keydown' },
            'attack': { key: 'KeyZ', type: 'keydown' },
            'use_power': { key: 'KeyX', type: 'keydown' },
            'dodge': { key: 'Shift', type: 'keydown' },
            'hide': { key: 'KeyH', type: 'keydown' },
            'select': { key: 'Enter', type: 'keydown' },
            'use_item': { key: 'KeyQ', type: 'keydown' }
        };
        
        const keyEvent = actionMap[action];
        if (keyEvent) {
            try {
                canvas.dispatchEvent(new KeyboardEvent(keyEvent.type, {
                    key: keyEvent.key,
                    bubbles: true
                }));
            } catch (e) {
                result.success = false;
                result.error = e.message;
            }
        }
        
        return result;
    }
    
    /**
     * Get current game state
     */
    _getGameState(canvas) {
        // Try to get state from game object
        if (canvas.game) {
            return {
                score: canvas.game.score || 0,
                health: canvas.game.health || 100,
                level: canvas.game.level || 1,
                gameOver: canvas.game.gameOver || false,
                paused: canvas.game.paused || false
            };
        }
        
        // Try to read from canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Basic heuristics
            return {
                hasContent: ctx.getImageData(0, 0, 1, 1).data.some(d => d > 0)
            };
        }
        
        return null;
    }
    
    /**
     * Summarize test results
     */
    _summarizeResults(iterations) {
        const totalErrors = iterations.reduce((sum, i) => sum + i.errors.length, 0);
        const totalActions = iterations.reduce((sum, i) => sum + i.actions.length, 0);
        
        const gameOvers = iterations.filter(i => i.endState?.gameOver).length;
        const avgDuration = iterations.reduce((sum, i) => sum + i.duration, 0) / iterations.length;
        
        // Analyze common issues
        const errorTypes = {};
        iterations.forEach(i => {
            i.errors.forEach(e => {
                const key = e.error?.substring(0, 50) || 'unknown';
                errorTypes[key] = (errorTypes[key] || 0) + 1;
            });
        });
        
        return {
            totalIterations: iterations.length,
            totalErrors,
            totalActions,
            errorRate: totalErrors / totalActions,
            gameOverRate: gameOvers / iterations.length,
            avgDuration: Math.round(avgDuration),
            errorTypes,
            success: totalErrors === 0
        };
    }
    
    // ============================================
    // PERFORMANCE PROFILING
    // ============================================
    
    /**
     * Profile game performance
     */
    async profilePerformance(gameId) {
        console.log('[Tester] Profiling game performance...');
        
        const results = {
            gameId,
            timestamp: new Date().toISOString(),
            fps: await this._measureFPS(),
            memory: this._measureMemory(),
            renderTime: await this._measureRenderTime(),
            loadTime: this._measureLoadTime(),
            network: this._measureNetwork(),
            recommendations: []
        };
        
        // Generate recommendations
        results.recommendations = this._generatePerformanceRecommendations(results);
        
        return results;
    }
    
    /**
     * Measure frames per second
     */
    async _measureFPS() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        const frames = [];
        let lastTime = performance.now();
        let frameCount = 0;
        
        // Measure for 2 seconds
        return new Promise(resolve => {
            const measure = () => {
                const currentTime = performance.now();
                frameCount++;
                
                if (currentTime - lastTime >= 2000) {
                    const fps = Math.round(frameCount / 2);
                    resolve({
                        average: fps,
                        target: 60,
                        status: fps >= 55 ? 'good' : fps >= 30 ? 'ok' : 'poor'
                    });
                } else {
                    requestAnimationFrame(measure);
                }
            };
            
            measure();
        });
    }
    
    /**
     * Measure memory usage
     */
    _measureMemory() {
        const perf = window.performance;
        
        if (perf.memory) {
            const used = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
            const total = Math.round(perf.memory.totalJSHeapSize / 1024 / 1024);
            const limit = Math.round(perf.memory.jsHeapSizeLimit / 1024 / 1024);
            
            return {
                used,
                total,
                limit,
                status: used < total * 0.7 ? 'good' : used < total * 0.9 ? 'ok' : 'critical'
            };
        }
        
        return { status: 'unavailable' };
    }
    
    /**
     * Measure render time
     */
    async _measureRenderTime() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        const times = [];
        const iterations = 100;
        
        // Simple render operation
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.fillRect(10, 10, 50, 50);
            
            times.push(performance.now() - start);
        }
        
        const avg = times.reduce((a, b) => a + b, 0) / times;
        
        return {
            average: Math.round(avg * 100) / 100,
            min: Math.round(Math.min(...times) * 100) / 100,
            max: Math.round(Math.max(...times) * 100) / 100,
            target: 16.67, // 60fps = 16.67ms
            status: avg < 10 ? 'good' : avg < 16 ? 'ok' : 'poor'
        };
    }
    
    /**
     * Measure page load time
     */
    _measureLoadTime() {
        const perf = window.performance;
        
        if (perf.timing) {
            const loadTime = perf.timing.loadEventEnd - perf.timing.navigationStart;
            const domReady = perf.timing.domContentLoadedEventEnd - perf.timing.navigationStart;
            const firstPaint = perf.timing.responseEnd - perf.timing.navigationStart;
            
            return {
                total: loadTime,
                domReady,
                firstPaint,
                status: loadTime < 3000 ? 'good' : loadTime < 5000 ? 'ok' : 'slow'
            };
        }
        
        return { status: 'unavailable' };
    }
    
    /**
     * Measure network requests
     */
    _measureNetwork() {
        const perf = window.performance;
        
        if (perf.getEntriesByType) {
            const resources = perf.getEntriesByType('resource');
            const images = resources.filter(r => r.initiatorType === 'img');
            const scripts = resources.filter(r => r.initiatorType === 'script');
            
            const totalSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
            const totalTime = resources.reduce((sum, r) => sum + r.duration, 0);
            
            return {
                totalRequests: resources.length,
                images: images.length,
                scripts: scripts.length,
                totalSize: Math.round(totalSize / 1024),
                totalTime: Math.round(totalTime),
                status: totalTime < 2000 ? 'good' : totalTime < 5000 ? 'ok' : 'slow'
            };
        }
        
        return { status: 'unavailable' };
    }
    
    /**
     * Generate performance recommendations
     */
    _generatePerformanceRecommendations(results) {
        const recommendations = [];
        
        if (results.fps?.status === 'poor') {
            recommendations.push({
                type: 'fps',
                issue: 'Low frame rate detected',
                suggestion: 'Reduce game complexity, optimize rendering, use requestAnimationFrame properly'
            });
        }
        
        if (results.memory?.status === 'critical') {
            recommendations.push({
                type: 'memory',
                issue: 'High memory usage',
                suggestion: 'Implement object pooling, clean up unused resources, use smaller assets'
            });
        }
        
        if (results.renderTime?.status === 'poor') {
            recommendations.push({
                type: 'render',
                issue: 'Slow render time',
                suggestion: 'Batch draw calls, use canvas layers, cache rendered elements'
            });
        }
        
        if (results.loadTime?.status === 'slow') {
            recommendations.push({
                type: 'load',
                issue: 'Slow load time',
                suggestion: 'Compress assets, implement lazy loading, use CDN'
            });
        }
        
        if (results.network?.status === 'slow') {
            recommendations.push({
                type: 'network',
                issue: 'Slow network requests',
                suggestion: 'Reduce asset sizes, enable compression, optimize images'
            });
        }
        
        return recommendations;
    }
    
    // ============================================
    // COMPATIBILITY TESTING
    // ============================================
    
    /**
     * Test browser compatibility
     */
    async testCompatibility(gameData) {
        console.log('[Tester] Testing browser compatibility...');
        
        const browser = this._getBrowserInfo();
        const features = this._detectFeatures();
        
        const results = {
            browser,
            features,
            tests: [],
            recommendations: []
        };
        
        // Test canvas support
        const canvasTest = this._testCanvas();
        results.tests.push(canvasTest);
        
        // Test WebGL support
        const webglTest = this._testWebGL();
        results.tests.push(webglTest);
        
        // Test audio support
        const audioTest = this._testAudio();
        results.tests.push(audioTest);
        
        // Test localStorage
        const storageTest = this._testStorage();
        results.tests.push(storageTest);
        
        // Generate recommendations
        results.recommendations = results.tests
            .filter(t => !t.supported)
            .map(t => ({
                feature: t.feature,
                issue: `${t.feature} not supported`,
                suggestion: t.fallback || 'Use fallback or notify user'
            }));
        
        return results;
    }
    
    _getBrowserInfo() {
        const ua = navigator.userAgent;
        
        return {
            name: /Chrome/.test(ua) ? 'Chrome' : 
                  /Firefox/.test(ua) ? 'Firefox' : 
                  /Safari/.test(ua) ? 'Safari' : 
                  /Edge/.test(ua) ? 'Edge' : 'Unknown',
            version: ua.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/)?.[2] || 'Unknown',
            platform: navigator.platform,
            mobile: /Mobile|Android|iPhone/.test(ua)
        };
    }
    
    _detectFeatures() {
        return {
            canvas: !!document.createElement('canvas').getContext,
            webgl: !!(document.createElement('canvas').getContext('webgl') || 
                     document.createElement('canvas').getContext('experimental-webgl')),
            webgl2: !!document.createElement('canvas').getContext('webgl2'),
            audio: !!window.AudioContext || !!window.webkitAudioContext,
            speechSynthesis: !!window.speechSynthesis,
            localStorage: (() => {
                try {
                    localStorage.setItem('test', 'test');
                    localStorage.removeItem('test');
                    return true;
                } catch (e) {
                    return false;
                }
            })(),
            indexedDB: !!window.indexedDB,
            webWorkers: !!window.Worker,
            serviceWorker: 'serviceWorker' in navigator
        };
    }
    
    _testCanvas() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const supported = !!(ctx && ctx.fillRect);
        
        return {
            feature: 'Canvas 2D',
            supported,
            fallback: supported ? null : 'Use WebGL or DOM-based rendering'
        };
    }
    
    _testWebGL() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        const supported = !!gl;
        
        return {
            feature: 'WebGL',
            supported,
            fallback: supported ? null : 'Use Canvas 2D fallback'
        };
    }
    
    _testAudio() {
        const supported = !!(window.AudioContext || window.webkitAudioContext);
        
        return {
            feature: 'Web Audio API',
            supported,
            fallback: supported ? null : 'Use HTML5 Audio element'
        };
    }
    
    _testStorage() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return { feature: 'LocalStorage', supported: true };
        } catch (e) {
            return { feature: 'LocalStorage', supported: false, fallback: 'Use cookies or server storage' };
        }
    }
    
    // ============================================
    // ACCESSIBILITY TESTING
    // ============================================
    
    /**
     * Test accessibility
     */
    async testAccessibility(gameElement) {
        console.log('[Tester] Testing accessibility...');
        
        const results = {
            score: 0,
            issues: [],
            recommendations: []
        };
        
        // Check for keyboard accessibility
        const keyboardCheck = this._checkKeyboardAccessibility(gameElement);
        results.issues.push(...keyboardCheck.issues);
        results.score += keyboardCheck.score;
        
        // Check for color contrast
        const contrastCheck = this._checkColorContrast(gameElement);
        results.issues.push(...contrastCheck.issues);
        results.score += contrastCheck.score;
        
        // Check for screen reader support
        const screenReaderCheck = this._checkScreenReaderSupport(gameElement);
        results.issues.push(...screenReaderCheck.issues);
        results.score += screenReaderCheck.score;
        
        // Check for focus indicators
        const focusCheck = this._checkFocusIndicators(gameElement);
        results.issues.push(...focusCheck.issues);
        results.score += focusCheck.score;
        
        // Generate recommendations
        results.recommendations = results.issues
            .filter(i => i.severity === 'critical')
            .map(i => i.recommendation);
        
        return results;
    }
    
    _checkKeyboardAccessibility(element) {
        const issues = [];
        let score = 25;
        
        // Check if game can receive keyboard input
        if (!element.querySelector('canvas')) {
            issues.push({
                type: 'keyboard',
                severity: 'critical',
                message: 'No canvas element found',
                recommendation: 'Ensure game canvas is focusable and receives keyboard events'
            });
            score -= 25;
        }
        
        return { issues, score: Math.max(0, score) };
    }
    
    _checkColorContrast(element) {
        const issues = [];
        let score = 25;
        
        // Basic check - would need actual color analysis
        const hasLightText = element.querySelectorAll('*').some(el => {
            const color = getComputedStyle(el).color;
            return color && !color.includes('rgb(0, 0, 0)');
        });
        
        if (!hasLightText) {
            issues.push({
                type: 'contrast',
                severity: 'medium',
                message: 'Cannot verify color contrast',
                recommendation: 'Ensure text has sufficient contrast (4.5:1 for normal text)'
            });
            score -= 10;
        }
        
        return { issues, score: Math.max(0, score) };
    }
    
    _checkScreenReaderSupport(element) {
        const issues = [];
        let score = 25;
        
        // Check for ARIA labels
        if (!element.getAttribute('role') && !element.getAttribute('aria-label')) {
            issues.push({
                type: 'screenReader',
                severity: 'medium',
                message: 'No ARIA role or label found',
                recommendation: 'Add role="application" or aria-label to game container'
            });
            score -= 15;
        }
        
        return { issues, score: Math.max(0, score) };
    }
    
    _checkFocusIndicators(element) {
        const issues = [];
        let score = 25;
        
        // Check if focus styles exist
        const hasFocusStyles = Array.from(document.styleSheets).some(sheet => {
            try {
                const rules = sheet.cssRules || sheet.rules;
                return Array.from(rules).some(rule => 
                    rule.selectorText && rule.selectorText.includes(':focus')
                );
            } catch (e) {
                return false;
            }
        });
        
        if (!hasFocusStyles) {
            issues.push({
                type: 'focus',
                severity: 'low',
                message: 'No focus indicators found',
                recommendation: 'Add visible focus styles for keyboard navigation'
            });
            score -= 5;
        }
        
        return { issues, score: Math.max(0, score) };
    }
    
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Analytics Class
class Analytics {
    constructor() {
        this.sessionId = 'session-' + Date.now();
        this.events = [];
        this.userId = this._getUserId();
        
        this._init();
    }
    
    _init() {
        console.log('[Analytics] Initializing Analytics...');
        this._loadStoredEvents();
        
        // Track session start
        this.track('session.start', {
            url: window.location.href,
            referrer: document.referrer
        });
        
        // Setup automatic tracking
        this._setupAutoTracking();
    }
    
    _loadStoredEvents() {
        const stored = localStorage.getItem('sgai-analytics-events');
        if (stored) {
            try {
                // Only load recent events
                const events = JSON.parse(stored);
                this.events = events.slice(-500);
            } catch (e) {
                this.events = [];
            }
        }
    }
    
    _saveEvents() {
        localStorage.setItem('sgai-analytics-events', JSON.stringify(this.events.slice(-1000)));
    }
    
    _getUserId() {
        let userId = localStorage.getItem('sgai-user-id');
        if (!userId) {
            userId = 'user-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('sgai-user-id', userId);
        }
        return userId;
    }
    
    _setupAutoTracking() {
        // Track page views
        window.addEventListener('popstate', () => {
            this.track('pageview', { url: window.location.href });
        });
        
        // Track errors
        window.addEventListener('error', (e) => {
            this.track('error', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno
            });
        });
    }
    
    // ============================================
    // EVENT TRACKING
    // ============================================
    
    /**
     * Track event
     */
    track(eventName, properties = {}) {
        const event = {
            id: 'evt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            name: eventName,
            properties,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            userId: this.userId
        };
        
        this.events.push(event);
        this._saveEvents();
        
        // Dispatch for real-time listeners
        window.dispatchEvent(new CustomEvent('analytics:event', { detail: event }));
        
        return event;
    }
    
    /**
     * Track generation event
     */
    trackGeneration(prompt, result) {
        return this.track('generation', {
            promptLength: prompt.length,
            success: result?.success || false,
            duration: result?.duration || 0,
            provider: result?.provider || 'ollama'
        });
    }
    
    /**
     * Track game play
     */
    trackGamePlay(gameId, data = {}) {
        return this.track('game.play', {
            gameId,
            ...data
        });
    }
    
    /**
     * Track feature usage
     */
    trackFeature(featureName, action = 'use') {
        return this.track('feature', {
            feature: featureName,
            action
        });
    }
    
    // ============================================
    // ANALYTICS QUERIES
    // ============================================
    
    /**
     * Get generation analytics
     */
    getGenerationAnalytics(dateRange = null) {
        const events = this._filterEvents('generation', dateRange);
        
        const total = events.length;
        const successful = events.filter(e => e.properties.success).length;
        const failed = total - successful;
        
        const avgDuration = events.reduce((sum, e) => sum + (e.properties.duration || 0), 0) / total || 0;
        
        // By provider
        const byProvider = {};
        events.forEach(e => {
            const provider = e.properties.provider || 'unknown';
            byProvider[provider] = (byProvider[provider] || 0) + 1;
        });
        
        return {
            total,
            successful,
            failed,
            successRate: total > 0 ? (successful / total * 100).toFixed(1) : 0,
            avgDuration: Math.round(avgDuration),
            byProvider,
            dateRange
        };
    }
    
    /**
     * Get game analytics
     */
    getGameAnalytics(gameId = null, dateRange = null) {
        let events = this._filterEvents('game.play', dateRange);
        
        if (gameId) {
            events = events.filter(e => e.properties.gameId === gameId);
        }
        
        const totalPlays = events.length;
        const completions = events.filter(e => e.properties.completed).length;
        
        const avgPlayTime = events.reduce((sum, e) => sum + (e.properties.duration || 0), 0) / totalPlays || 0;
        
        // By game
        const byGame = {};
        events.forEach(e => {
            const gid = e.properties.gameId || 'unknown';
            byGame[gid] = (byGame[gid] || 0) + 1;
        });
        
        return {
            totalPlays,
            completions,
            completionRate: totalPlays > 0 ? (completions / totalPlays * 100).toFixed(1) : 0,
            avgPlayTime: Math.round(avgPlayTime),
            byGame,
            dateRange
        };
    }
    
    /**
     * Get user behavior analytics
     */
    getUserBehaviorAnalytics(dateRange = null) {
        const events = this._filterEvents(null, dateRange);
        
        // User journey
        const sessionEvents = events.filter(e => e.sessionId === this.sessionId);
        
        // Feature usage
        const featureEvents = this._filterEvents('feature', dateRange);
        const featureUsage = {};
        featureEvents.forEach(e => {
            const feature = e.properties.feature;
            featureUsage[feature] = (featureUsage[feature] || 0) + 1;
        });
        
        // Top events
        const eventCounts = {};
        events.forEach(e => {
            eventCounts[e.name] = (eventCounts[e.name] || 0) + 1;
        });
        
        return {
            totalEvents: events.length,
            uniqueSessions: [...new Set(events.map(e => e.sessionId))].length,
            featureUsage,
            topEvents: Object.entries(eventCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {}),
            dateRange
        };
    }
    
    /**
     * Get common errors
     */
    getCommonErrors(dateRange = null) {
        const errorEvents = this._filterEvents('error', dateRange);
        
        const errorCounts = {};
        errorEvents.forEach(e => {
            const key = e.properties.message?.substring(0, 100) || 'Unknown';
            errorCounts[key] = (errorCounts[key] || 0) + 1;
        });
        
        return Object.entries(errorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([error, count]) => ({ error, count }));
    }
    
    _filterEvents(eventName, dateRange) {
        let filtered = [...this.events];
        
        if (eventName) {
            filtered = filtered.filter(e => e.name === eventName);
        }
        
        if (dateRange) {
            const start = new Date(dateRange.start || 0);
            const end = new Date(dateRange.end || Date.now());
            filtered = filtered.filter(e => {
                const ts = new Date(e.timestamp);
                return ts >= start && ts <= end;
            });
        }
        
        return filtered;
    }
    
    // ============================================
    // A/B TESTING
    // ============================================
    
    /**
     * Create A/B test
     */
    createABTest(testId, variants) {
        const test = {
            id: testId,
            variants,
            startedAt: new Date().toISOString(),
            participants: {},
            conversions: {}
        };
        
        // Randomly assign user
        const variantKeys = Object.keys(variants);
        const assignedVariant = variantKeys[Math.floor(Math.random() * variantKeys.length)];
        
        this._saveABTest(test);
        
        return {
            testId,
            variant: assignedVariant,
            variantConfig: variants[assignedVariant]
        };
    }
    
    /**
     * Track A/B test conversion
     */
    trackABConversion(testId, conversion) {
        const test = this._getABTest(testId);
        if (!test) return;
        
        if (!test.conversions[conversion]) {
            test.conversions[conversion] = 0;
        }
        test.conversions[conversion]++;
        
        this._saveABTest(test);
    }
    
    /**
     * Get A/B test results
     */
    getABTestResults(testId) {
        const test = this._getABTest(testId);
        if (!test) return null;
        
        const results = {};
        
        for (const [variant, participants] of Object.entries(test.participants || {})) {
            const conversions = test.conversions?.[variant] || 0;
            results[variant] = {
                participants,
                conversions,
                rate: participants > 0 ? (conversions / participants * 100).toFixed(2) : 0
            };
        }
        
        return results;
    }
    
    _saveABTest(test) {
        const tests = this._getABTests();
        tests[test.id] = test;
        localStorage.setItem('sgai-ab-tests', JSON.stringify(tests));
    }
    
    _getABTest(testId) {
        return this._getABTests()[testId];
    }
    
    _getABTests() {
        const stored = localStorage.getItem('sgai-ab-tests');
        return stored ? JSON.parse(stored) : {};
    }
    
    // ============================================
    // EXPORT
    // ============================================
    
    /**
     * Export analytics data
     */
    exportData(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.events, null, 2);
        }
        
        if (format === 'csv') {
            const headers = ['id', 'name', 'timestamp', 'sessionId', 'userId'];
            const rows = this.events.map(e => 
                headers.map(h => e[h] || '').join(',')
            );
            return [headers.join(','), ...rows].join('\n');
        }
        
        return null;
    }
    
    /**
     * Clear all analytics data
     */
    clearData() {
        this.events = [];
        localStorage.removeItem('sgai-analytics-events');
        localStorage.removeItem('sgai-user-id');
        
        return { success: true };
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.GameTester = GameTester;
    window.Analytics = Analytics;
    
    // Auto-initialize
    window.gameTester = new GameTester();
    window.analytics = new Analytics();
});

export default GameTester;
