/* ============================================
   Mobile Universal Initialization
   Automatically enables mobile controls for ALL games
   - Responsive canvas scaling
   - Safe area handling
   - Touch-friendly UI adjustments
   - Viewport management
   ============================================ */

(function () {
    'use strict';

    const MobileInit = {
        isMobile: false,
        isInitialized: false,
        canvas: null,
        originalCanvasSize: { width: 0, height: 0 },
        
        // Game-specific configurations
        gameConfigs: {
            'backrooms-pacman': { type: 'fps', scaleStrategy: 'fullscreen' },
            'blood-tetris': { type: 'tetris', scaleStrategy: 'fit', aspectRatio: 9/16 },
            'dollhouse': { type: 'pointnclick', scaleStrategy: 'fit', aspectRatio: 800/500 },
            'freddys-nightmare': { type: 'fnaf', scaleStrategy: 'fullscreen' },
            'graveyard-shift': { type: 'fps', scaleStrategy: 'fullscreen' },
            'haunted-asylum': { type: 'topdown', scaleStrategy: 'fullscreen' },
            'nightmare-run': { type: 'runner', scaleStrategy: 'fullscreen' },
            'ritual-circle': { type: 'strategy', scaleStrategy: 'fullscreen' },
            'seance': { type: 'pointnclick', scaleStrategy: 'fit', aspectRatio: 700/500 },
            'shadow-crawler': { type: 'topdown', scaleStrategy: 'fullscreen' },
            'the-abyss': { type: 'fps', scaleStrategy: 'fullscreen' },
            'the-elevator': { type: 'fps', scaleStrategy: 'fullscreen' },
            'total-zombies-medieval': { type: 'strategy', scaleStrategy: 'fit', aspectRatio: 700/700 },
            'web-of-terror': { type: 'fps', scaleStrategy: 'fullscreen' },
            'yeti-run': { type: 'fps', scaleStrategy: 'fullscreen' },
            'zombie-horde': { type: 'strategy', scaleStrategy: 'fit', aspectRatio: 700/700 },
            'cursed-depths': { type: 'platformer', scaleStrategy: 'fullscreen' },
            'cursed-sands': { type: 'fps', scaleStrategy: 'fullscreen' },
        },
        
        currentGame: null,

        /**
         * Detect if this is a touch-capable mobile device
         */
        detectMobile: function () {
            // Must have touch capability
            const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            if (!hasTouch) return false;

            // UA-based detection
            const mobileUA = /Mobi|Android|iPhone|iPad|iPod|Tablet|webOS|BlackBerry|IEMobile|Opera Mini/i;
            if (mobileUA.test(navigator.userAgent)) return true;

            // Screen size heuristic
            if (window.innerWidth < 1024 && window.innerHeight < 1024) return true;

            // Pointer media query
            if (window.matchMedia) {
                const coarse = window.matchMedia('(pointer: coarse)').matches;
                const fine = window.matchMedia('(pointer: fine)').matches;
                if (coarse && !fine) return true;
                if (fine && !coarse) return false;
            }

            return window.innerWidth < 1024;
        },

        /**
         * Identify the current game from URL
         */
        identifyGame: function () {
            const path = window.location.pathname.toLowerCase();
            for (const gameId in this.gameConfigs) {
                if (path.indexOf('/' + gameId + '/') !== -1 || 
                    path.indexOf('/games/' + gameId) !== -1 ||
                    path.endsWith('/' + gameId) ||
                    path.indexOf(gameId.replace(/-/g, '')) !== -1) {
                    return gameId;
                }
            }
            // Fallback: try to match partial paths
            for (const gameId in this.gameConfigs) {
                const parts = gameId.split('-');
                for (const part of parts) {
                    if (path.indexOf(part) !== -1) return gameId;
                }
            }
            return null;
        },

        /**
         * Initialize mobile support for the current game
         */
        init: function () {
            this.isMobile = this.detectMobile();
            if (!this.isMobile) {
                console.log('[MobileInit] Desktop detected, skipping mobile controls');
                return;
            }

            console.log('[MobileInit] Mobile device detected, initializing...');
            
            this.currentGame = this.identifyGame();
            const config = this.currentGame ? this.gameConfigs[this.currentGame] : { type: 'generic', scaleStrategy: 'fullscreen' };
            
            console.log('[MobileInit] Game:', this.currentGame, 'Config:', config);

            // Add mobile class to body
            document.body.classList.add('is-mobile');
            document.documentElement.classList.add('is-mobile');

            // Setup viewport meta tag for mobile
            this.setupViewport();

            // Setup canvas scaling
            this.setupCanvasScaling(config);

            // Setup safe areas
            this.setupSafeAreas();

            // Add touch-friendly styles
            this.addMobileStyles();

            // Prevent default mobile behaviors
            this.preventMobileBehaviors();

            // Handle orientation changes
            this.handleOrientation();

            this.isInitialized = true;
            console.log('[MobileInit] Initialization complete');
        },

        /**
         * Ensure proper viewport meta tag
         */
        setupViewport: function () {
            let viewport = document.querySelector('meta[name="viewport"]');
            if (!viewport) {
                viewport = document.createElement('meta');
                viewport.name = 'viewport';
                document.head.appendChild(viewport);
            }
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        },

        /**
         * Setup responsive canvas scaling
         */
        setupCanvasScaling: function (config) {
            this.canvas = document.getElementById('game-canvas');
            if (!this.canvas) {
                // Wait for canvas to be created
                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        for (const node of mutation.addedNodes) {
                            if (node.id === 'game-canvas' || (node.querySelector && node.querySelector('#game-canvas'))) {
                                this.canvas = document.getElementById('game-canvas');
                                if (this.canvas) {
                                    observer.disconnect();
                                    this.applyCanvasScaling(config);
                                    break;
                                }
                            }
                        }
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            } else {
                this.applyCanvasScaling(config);
            }
        },

        /**
         * Apply canvas scaling based on strategy
         */
        applyCanvasScaling: function (config) {
            const canvas = this.canvas;
            const strategy = config.scaleStrategy || 'fullscreen';

            // Store original size
            this.originalCanvasSize.width = canvas.width;
            this.originalCanvasSize.height = canvas.height;

            const resize = () => {
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                const screenW = window.innerWidth;
                const screenH = window.innerHeight;

                // Get safe areas
                const safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0;
                const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) || 0;
                const safeLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-left')) || 0;
                const safeRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-right')) || 0;

                const availableW = screenW - safeLeft - safeRight;
                const availableH = screenH - safeTop - safeBottom;

                let newWidth, newHeight, canvasW, canvasH;

                switch (strategy) {
                    case 'fit':
                        // Fit to screen while maintaining aspect ratio
                        const aspect = config.aspectRatio || (this.originalCanvasSize.width / this.originalCanvasSize.height);
                        const screenAspect = availableW / availableH;
                        
                        if (screenAspect > aspect) {
                            newHeight = availableH;
                            newWidth = availableH * aspect;
                        } else {
                            newWidth = availableW;
                            newHeight = availableW / aspect;
                        }
                        
                        canvasW = Math.floor(newWidth * dpr);
                        canvasH = Math.floor(newHeight * dpr);
                        break;

                    case 'fullscreen':
                    default:
                        newWidth = availableW;
                        newHeight = availableH;
                        canvasW = Math.floor(availableW * dpr);
                        canvasH = Math.floor(availableH * dpr);
                        break;
                }

                // Set CSS size
                canvas.style.width = newWidth + 'px';
                canvas.style.height = newHeight + 'px';
                canvas.style.position = 'fixed';
                canvas.style.top = '50%';
                canvas.style.left = '50%';
                canvas.style.transform = 'translate(-50%, -50%)';
                
                // Only set internal resolution if not already set by game
                // Some games manage their own canvas size
                if (config.scaleStrategy === 'fit') {
                    canvas.width = canvasW;
                    canvas.height = canvasH;
                }

                // Center in safe area
                canvas.style.marginTop = safeTop + 'px';
                canvas.style.marginBottom = safeBottom + 'px';
            };

            resize();
            window.addEventListener('resize', resize);
            window.addEventListener('orientationchange', () => setTimeout(resize, 100));
        },

        /**
         * Setup CSS safe areas for notched devices
         */
        setupSafeAreas: function () {
            const root = document.documentElement;
            root.style.setProperty('--safe-top', 'env(safe-area-inset-top, 0px)');
            root.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)');
            root.style.setProperty('--safe-left', 'env(safe-area-inset-left, 0px)');
            root.style.setProperty('--safe-right', 'env(safe-area-inset-right, 0px)');
        },

        /**
         * Add mobile-specific styles
         */
        addMobileStyles: function () {
            const style = document.createElement('style');
            style.id = 'mobile-universal-styles';
            style.textContent = `
                /* Mobile Universal Styles */
                body.is-mobile {
                    overflow: hidden;
                    position: fixed;
                    width: 100%;
                    height: 100%;
                    overscroll-behavior: none;
                    -webkit-overflow-scrolling: auto;
                    touch-action: none;
                }
                
                body.is-mobile * {
                    -webkit-tap-highlight-color: transparent;
                }
                
                body.is-mobile #game-canvas {
                    touch-action: none;
                    -webkit-touch-callout: none;
                    -webkit-user-select: none;
                    user-select: none;
                }
                
                /* Scale HUD for mobile */
                body.is-mobile .game-hud {
                    font-size: clamp(10px, 2.5vw, 14px) !important;
                    padding: 8px !important;
                }
                
                body.is-mobile .hud-item {
                    padding: 4px 8px !important;
                    margin: 2px !important;
                }
                
                /* Larger touch targets */
                body.is-mobile .play-btn,
                body.is-mobile .start-btn,
                body.is-mobile button {
                    min-height: 48px !important;
                    min-width: 48px !important;
                    font-size: clamp(14px, 4vw, 18px) !important;
                    padding: 12px 24px !important;
                }
                
                /* Hide keyboard hints on mobile */
                body.is-mobile .control-item:has(.key) {
                    display: none !important;
                }
                
                body.is-mobile .controls-overlay .controls-content h2 {
                    font-size: clamp(18px, 5vw, 28px) !important;
                }
                
                body.is-mobile .game-desc {
                    font-size: clamp(12px, 3vw, 16px) !important;
                    padding: 0 16px !important;
                }
                
                /* Start screen mobile adjustments */
                body.is-mobile .start-screen {
                    padding: 16px !important;
                }
                
                body.is-mobile .start-screen h1 {
                    font-size: clamp(1.5rem, 6vw, 2.5rem) !important;
                }
                
                /* Game over / win screens */
                body.is-mobile .game-over-screen,
                body.is-mobile .game-win-screen {
                    padding: 16px !important;
                }
                
                body.is-mobile .game-over-screen h1,
                body.is-mobile .game-win-screen h1 {
                    font-size: clamp(1.2rem, 5vw, 2rem) !important;
                }
                
                body.is-mobile .game-over-screen p,
                body.is-mobile .game-win-screen p {
                    font-size: clamp(12px, 3vw, 16px) !important;
                }
                
                /* Difficulty selector mobile */
                body.is-mobile .difficulty-selector {
                    flex-direction: column !important;
                    gap: 8px !important;
                }
                
                body.is-mobile .difficulty-btn {
                    width: 100% !important;
                    min-height: 44px !important;
                }
                
                /* Hide back link on mobile (use device back button) */
                body.is-mobile .back-link {
                    font-size: 12px !important;
                    padding: 6px 10px !important;
                }
                
                /* Controls overlay mobile */
                body.is-mobile .controls-overlay .controls-content {
                    max-width: 90vw !important;
                    padding: 20px !important;
                }
                
                body.is-mobile .controls-overlay .control-item {
                    font-size: 12px !important;
                    margin: 4px 0 !important;
                }
                
                /* Fullscreen button bigger on mobile */
                body.is-mobile .fullscreen-btn {
                    min-width: 44px !important;
                    min-height: 44px !important;
                }
            `;
            document.head.appendChild(style);
        },

        /**
         * Prevent default mobile behaviors that interfere with gaming
         */
        preventMobileBehaviors: function () {
            // Prevent pull-to-refresh
            document.body.style.overscrollBehavior = 'none';
            
            // Prevent double-tap zoom
            let lastTouchEnd = 0;
            document.addEventListener('touchend', (e) => {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                }
                lastTouchEnd = now;
            }, { passive: false });

            // Prevent pinch zoom
            document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
            document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
            document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

            // Prevent context menu on long press
            document.addEventListener('contextmenu', (e) => {
                if (this.isMobile) e.preventDefault();
            });

            // Prevent selection
            document.addEventListener('selectstart', (e) => {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            });
        },

        /**
         * Handle orientation changes
         */
        handleOrientation: function () {
            const showOrientationPrompt = () => {
                const isPortrait = window.innerHeight > window.innerWidth;
                let prompt = document.getElementById('mobile-orientation-prompt');
                
                if (isPortrait) {
                    if (!prompt) {
                        prompt = document.createElement('div');
                        prompt.id = 'mobile-orientation-prompt';
                        prompt.innerHTML = `
                            <div class="orientation-content">
                                <div class="rotate-icon">📱↻</div>
                                <p>Rotate your device to landscape<br>for the best gaming experience</p>
                            </div>
                        `;
                        prompt.style.cssText = `
                            position: fixed;
                            inset: 0;
                            z-index: 999999;
                            background: rgba(0, 0, 0, 0.95);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-family: 'Inter', sans-serif;
                        `;
                        const content = prompt.querySelector('.orientation-content');
                        content.style.cssText = `
                            text-align: center;
                            color: #ccc;
                        `;
                        const icon = prompt.querySelector('.rotate-icon');
                        icon.style.cssText = `
                            font-size: 64px;
                            margin-bottom: 16px;
                            animation: rotateWiggle 2s ease-in-out infinite;
                        `;
                        const style = document.createElement('style');
                        style.textContent = `
                            @keyframes rotateWiggle {
                                0%, 100% { transform: rotate(-15deg); }
                                50% { transform: rotate(15deg); }
                            }
                        `;
                        document.head.appendChild(style);
                        document.body.appendChild(prompt);
                    }
                    prompt.style.display = 'flex';
                } else if (prompt) {
                    prompt.style.display = 'none';
                }
            };

            showOrientationPrompt();
            window.addEventListener('resize', showOrientationPrompt);
            window.addEventListener('orientationchange', () => setTimeout(showOrientationPrompt, 100));
        },

        /**
         * Get if mobile is active
         */
        isActive: function () {
            return this.isMobile && this.isInitialized;
        }
    };

    // Expose globally
    window.MobileInit = MobileInit;

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => MobileInit.init());
    } else {
        MobileInit.init();
    }

})();
