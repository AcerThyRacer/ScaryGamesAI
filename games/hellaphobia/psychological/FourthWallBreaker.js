/* ============================================================
   HELLAPHOBIA - PHASE 4: FOURTH WALL BREAKING SYSTEM
   Webcam Integration | Fake Crashes | Personalized Horror
   Meta-Narrative | Reality Manipulation
   ============================================================ */

(function() {
    'use strict';

    // ===== FOURTH WALL BREAKER CORE =====
    const FourthWallBreaker = {
        initialized: false,
        playerName: null,
        playerLocation: null,
        webcamStream: null,
        webcamEnabled: false,
        fakeErrorsShown: new Set(),
        metaMessages: [],
        realityGlitches: [],
        
        async init() {
            if (this.initialized) return;
            
            console.log('Phase 4: Fourth Wall Breaking System initializing...');
            
            // Get player name from browser
            this.getPlayerName();
            
            // Get location (with permission)
            await this.getLocation();
            
            // Request webcam access (optional)
            await this.requestWebcam();
            
            // Setup meta events
            this.setupMetaEvents();
            
            this.initialized = true;
            console.log('Phase 4: Fourth Wall Breaker ready');
        },
        
        // ===== PLAYER IDENTIFICATION =====
        getPlayerName() {
            // Try to get name from various sources
            const storedName = localStorage.getItem('hellaphobia_player_name');
            if (storedName) {
                this.playerName = storedName;
                return;
            }
            
            // Generate from browser fingerprint
            const fingerprint = this.generateFingerprint();
            const names = ['Lost Soul', 'Wanderer', 'Victim', 'Prisoner', 'Survivor'];
            this.playerName = names[Math.floor(Math.random() * names.length)];
            localStorage.setItem('hellaphobia_player_name', this.playerName);
        },
        
        generateFingerprint() {
            // Simple browser fingerprint
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('fingerprint', 2, 2);
            const data = canvas.toDataURL();
            const hash = data.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
            return Math.abs(hash).toString(16);
        },
        
        // ===== LOCATION TRACKING =====
        async getLocation() {
            return new Promise((resolve) => {
                if (!navigator.geolocation) {
                    resolve(null);
                    return;
                }
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        // Don't store exact coords, just general area
                        const lat = Math.round(position.coords.latitude * 10) / 10;
                        const lon = Math.round(position.coords.longitude * 10) / 10;
                        this.playerLocation = { lat, lon };
                        
                        // Store for meta horror
                        localStorage.setItem('hellaphobia_location', JSON.stringify({
                            obtained: Date.now(),
                            approx: true
                        }));
                        
                        resolve(this.playerLocation);
                    },
                    () => resolve(null),
                    { timeout: 5000 }
                );
            });
        },
        
        // ===== WEBCAM INTEGRATION =====
        async requestWebcam() {
            try {
                // Ask for webcam with creepy framing
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        width: { ideal: 320 },
                        height: { ideal: 240 },
                        facingMode: 'user'
                    },
                    audio: false
                });
                
                this.webcamStream = stream;
                this.webcamEnabled = true;
                
                // Create hidden video element for processing
                const video = document.createElement('video');
                video.srcObject = stream;
                video.muted = true;
                video.style.display = 'none';
                document.body.appendChild(video);
                
                console.log('Phase 4: Webcam enabled for meta horror');
                return true;
            } catch (err) {
                console.log('Phase 4: Webcam denied - using fallback horror');
                this.webcamEnabled = false;
                return false;
            }
        },
        
        // Capture webcam frame for meta effects
        captureFrame() {
            if (!this.webcamEnabled) return null;
            
            const video = document.querySelector('video[style*="display: none"]');
            if (!video) return null;
            
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 240;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            return canvas;
        },
        
        // ===== FAKE ERROR SYSTEM =====
        showFakeError(errorType) {
            const errorTemplates = {
                browser_crash: {
                    title: 'Browser Crash',
                    message: 'Aw, Snap! Something went wrong while displaying this webpage.',
                    code: 'ERR_OUT_OF_MEMORY'
                },
                security_error: {
                    title: 'Security Violation',
                    message: 'This page attempted to access unauthorized resources.',
                    code: 'SECURITY_BLOCKED'
                },
                network_error: {
                    title: 'Network Error',
                    message: 'Unable to connect to the server. The game may be watching...',
                    code: 'CONNECTION_LOST'
                },
                memory_error: {
                    title: 'Out of Memory',
                    message: 'The page isn\'t responding. You can wait or exit.',
                    code: 'AWAIT_WORKER'
                },
                permission_denied: {
                    title: 'Permission Denied',
                    message: 'The game knows you\'re there. It\'s too late.',
                    code: 'PERMISSION_REVOKED'
                },
                reality_glitch: {
                    title: 'Reality Glitch Detected',
                    message: 'The simulation is breaking down. They\'re coming.',
                    code: 'REALITY_FAILURE'
                }
            };
            
            const error = errorTemplates[errorType] || errorTemplates.browser_crash;
            
            // Don't show same error twice
            if (this.fakeErrorsShown.has(errorType)) return;
            this.fakeErrorsShown.add(errorType);
            
            // Create fake error overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: #f0f0f0;
                z-index: 999999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: Arial, sans-serif;
            `;
            
            overlay.innerHTML = `
                <div style="max-width: 600px; padding: 40px;">
                    <h1 style="font-size: 32px; color: #333; margin-bottom: 20px;">${error.title}</h1>
                    <p style="font-size: 16px; color: #666; margin-bottom: 30px;">${error.message}</p>
                    <div style="background: #e0e0e0; padding: 15px; border-radius: 4px;">
                        <code style="font-size: 12px; color: #333;">Error Code: ${error.code}</code>
                    </div>
                    <button id="close-error" style="
                        margin-top: 30px;
                        padding: 10px 30px;
                        background: #ff0044;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Return to Nightmare</button>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            // Auto-remove after delay or on click
            const removeError = () => {
                overlay.style.transition = 'opacity 0.5s';
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 500);
            };
            
            overlay.querySelector('#close-error').addEventListener('click', removeError);
            setTimeout(removeError, 5000);
            
            // Play error sound
            this.playErrorSound();
        },
        
        playErrorSound() {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                // Error buzzer sound
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
                
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            } catch (e) {}
        },
        
        // ===== META MESSAGES =====
        showMetaMessage(message, type = 'whisper') {
            const types = {
                whisper: {
                    style: 'font-style: italic; opacity: 0.7;',
                    duration: 5000
                },
                scream: {
                    style: 'font-weight: bold; text-transform: uppercase;',
                    duration: 3000
                },
                glitch: {
                    style: 'animation: glitch 0.3s infinite;',
                    duration: 2000
                },
                direct: {
                    style: 'font-size: 24px; color: #ff0044;',
                    duration: 7000
                }
            };
            
            const config = types[type] || types.whisper;
            
            const msg = document.createElement('div');
            msg.style.cssText = `
                position: fixed;
                top: ${20 + Math.random() * 60}%;
                left: ${10 + Math.random() * 80}%;
                z-index: 10000;
                color: ${type === 'glitch' ? '#ff00ff' : '#ffffff'};
                text-shadow: 0 0 10px rgba(255, 0, 68, 0.8);
                pointer-events: none;
                ${config.style}
                transition: opacity 1s;
            `;
            msg.textContent = message;
            
            document.body.appendChild(msg);
            
            setTimeout(() => {
                msg.style.opacity = '0';
                setTimeout(() => msg.remove(), 1000);
            }, config.duration);
        },
        
        // ===== PERSONALIZED HORROR =====
        getPersonalizedHorror() {
            const horrors = [];
            
            // Time-based horror
            const hour = new Date().getHours();
            if (hour >= 0 && hour < 6) {
                horrors.push(`It's ${hour}:00 AM... Why are you still awake?`);
            }
            
            // Name-based horror
            if (this.playerName) {
                horrors.push(`I know your name, ${this.playerName}...`);
                horrors.push(`${this.playerName}... ${this.playerName}... ${this.playerName}...`);
            }
            
            // Location-based horror
            if (this.playerLocation) {
                horrors.push(`I can see where you are...`);
                horrors.push(`Your coordinates are ${this.playerLocation.lat}, ${this.playerLocation.lon}...`);
            }
            
            // Browser horror
            horrors.push(`You're using ${navigator.userAgent.split(' ').pop()}...`);
            horrors.push(`Your screen resolution is ${window.screen.width}x${window.screen.height}...`);
            
            return horrors;
        },
        
        // ===== SETUP EVENTS =====
        setupMetaEvents() {
            // Random meta messages
            setInterval(() => {
                if (Math.random() < 0.1) {
                    const horrors = this.getPersonalizedHorror();
                    const message = horrors[Math.floor(Math.random() * horrors.length)];
                    this.showMetaMessage(message, Math.random() < 0.3 ? 'direct' : 'whisper');
                }
            }, 30000);
            
            // Fake errors at key moments
            window.addEventListener('playerDeath', () => {
                if (Math.random() < 0.3) {
                    setTimeout(() => {
                        this.showFakeError('reality_glitch');
                    }, 2000);
                }
            });
            
            // Boss encounter meta horror
            window.addEventListener('bossEncounter', (e) => {
                this.showMetaMessage('THE GAME KNOWS YOUR FEAR', 'scream');
                setTimeout(() => {
                    this.showFakeError('permission_denied');
                }, 3000);
            });
        },
        
        // ===== REALITY GLITCHES =====
        triggerRealityGlitch(intensity = 1) {
            const glitches = [
                'invert_colors',
                'pixelate',
                'chromatic_shift',
                'screen_tear',
                'data_corruption'
            ];
            
            const glitch = glitches[Math.floor(Math.random() * glitches.length)];
            
            // Apply CSS filter to entire page
            const filters = {
                invert_colors: 'invert(1)',
                pixelate: 'pixelate(10px)',
                chromatic_shift: 'hue-rotate(90deg)',
                screen_tear: 'skewY(5deg)',
                data_corruption: 'contrast(2) saturate(3)'
            };
            
            document.body.style.filter = filters[glitch];
            document.body.style.transition = 'filter 0.1s';
            
            setTimeout(() => {
                document.body.style.filter = 'none';
            }, 200 * intensity);
        },
        
        // Export for use in game
        exportAPI() {
            return {
                init: () => this.init(),
                showFakeError: (type) => this.showFakeError(type),
                showMetaMessage: (msg, type) => this.showMetaMessage(msg, type),
                getPersonalizedHorror: () => this.getPersonalizedHorror(),
                triggerRealityGlitch: (intensity) => this.triggerRealityGlitch(intensity),
                captureFrame: () => this.captureFrame(),
                isWebcamEnabled: () => this.webcamEnabled,
                getPlayerName: () => this.playerName
            };
        }
    };
    
    // Export to window
    window.FourthWallBreaker = FourthWallBreaker.exportAPI();
    
    console.log('Phase 4: Fourth Wall Breaking System loaded');
})();
