/* ============================================
   Mobile Patcher - Runtime Mobile Support Injection
   This script patches all games for mobile compatibility
   by injecting touch controls and canvas scaling at runtime.
   ============================================ */

(function () {
    'use strict';

    console.log('[MobilePatcher] Loading...');

    // Detect mobile
    function isMobile() {
        const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (!hasTouch) return false;
        if (/Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(navigator.userAgent)) return true;
        if (window.innerWidth < 1024) return true;
        return false;
    }

    if (!isMobile()) {
        console.log('[MobilePatcher] Desktop detected, exiting');
        return;
    }

    console.log('[MobilePatcher] Mobile device detected, applying patches...');

    // ══════════════════════════════════════════════
    // 1. FIX CANVAS SCALING
    // ══════════════════════════════════════════════
    function fixCanvasScaling() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = window.innerWidth;
            const h = window.innerHeight;

            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.margin = '0';
            canvas.style.padding = '0';
        };

        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', () => setTimeout(resize, 100));

        console.log('[MobilePatcher] Canvas scaling fixed');
    }

    // ══════════════════════════════════════════════
    // 2. ADD MOBILE CSS
    // ══════════════════════════════════════════════
    function addMobileCSS() {
        if (document.getElementById('mobile-patcher-css')) return;

        const style = document.createElement('style');
        style.id = 'mobile-patcher-css';
        style.textContent = `
            body.is-mobile {
                overflow: hidden !important;
                position: fixed !important;
                width: 100% !important;
                height: 100% !important;
                overscroll-behavior: none !important;
                touch-action: none !important;
            }
            
            body.is-mobile #game-canvas {
                touch-action: none !important;
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                user-select: none !important;
            }
            
            body.is-mobile .start-screen,
            body.is-mobile .game-over-screen,
            body.is-mobile .game-win-screen {
                padding: 16px !important;
            }
            
            body.is-mobile .start-screen h1 {
                font-size: clamp(1.2rem, 6vw, 2rem) !important;
            }
            
            body.is-mobile .game-desc {
                font-size: clamp(12px, 3vw, 16px) !important;
            }
            
            body.is-mobile .start-btn,
            body.is-mobile .play-btn,
            body.is-mobile button {
                min-height: 48px !important;
                min-width: 160px !important;
                font-size: clamp(14px, 4vw, 18px) !important;
                padding: 12px 24px !important;
            }
            
            body.is-mobile .game-hud {
                font-size: 12px !important;
            }
            
            body.is-mobile .hud-btn {
                min-width: 44px !important;
                min-height: 44px !important;
            }
            
            body.is-mobile .control-item {
                display: none !important;
            }
            
            body.is-mobile .controls-start-hint::before {
                content: 'Use on-screen touch controls to play';
                display: block;
                font-size: 14px;
                color: rgba(255,255,255,0.7);
                margin-bottom: 8px;
            }
        `;
        document.head.appendChild(style);
        document.body.classList.add('is-mobile');

        console.log('[MobilePatcher] Mobile CSS added');
    }

    // ══════════════════════════════════════════════
    // 3. PREVENT MOBILE GESTURES
    // ══════════════════════════════════════════════
    function preventMobileGestures() {
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
        document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
        document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
        document.addEventListener('gestureend', e => e.preventDefault(), { passive: false });

        // Prevent context menu
        document.addEventListener('contextmenu', e => e.preventDefault());

        // Prevent selection
        document.addEventListener('selectstart', e => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        });

        console.log('[MobilePatcher] Mobile gestures prevented');
    }

    // ══════════════════════════════════════════════
    // 4. FIX VIEWPORT
    // ══════════════════════════════════════════════
    function fixViewport() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

        console.log('[MobilePatcher] Viewport fixed');
    }

    // ══════════════════════════════════════════════
    // 5. POINTER LOCK BYPASS
    // ══════════════════════════════════════════════
    function bypassPointerLock() {
        // Wait for canvas to exist
        const checkCanvas = setInterval(() => {
            const canvas = document.getElementById('game-canvas');
            if (canvas) {
                clearInterval(checkCanvas);

                // Override pointerLockElement
                try {
                    Object.defineProperty(document, 'pointerLockElement', {
                        get: function () {
                            return canvas;
                        },
                        configurable: true
                    });
                    console.log('[MobilePatcher] Pointer lock bypassed');
                } catch (e) {
                    console.warn('[MobilePatcher] Could not bypass pointer lock');
                }

                // Prevent actual pointer lock
                const orig = HTMLElement.prototype.requestPointerLock;
                HTMLElement.prototype.requestPointerLock = function () {
                    // No-op
                };
            }
        }, 100);

        // Also check after DOM ready
        setTimeout(() => {
            const canvas = document.getElementById('game-canvas');
            if (canvas) {
                try {
                    Object.defineProperty(document, 'pointerLockElement', {
                        get: () => canvas,
                        configurable: true
                    });
                } catch (e) { }
            }
        }, 1000);
    }

    // ══════════════════════════════════════════════
    // 6. ORIENTATION PROMPT
    // ══════════════════════════════════════════════
    function addOrientationPrompt() {
        const check = () => {
            const isPortrait = window.innerHeight > window.innerWidth;
            let prompt = document.getElementById('mobile-orientation-overlay');

            if (isPortrait) {
                if (!prompt) {
                    prompt = document.createElement('div');
                    prompt.id = 'mobile-orientation-overlay';
                    prompt.innerHTML = `
                        <div style="text-align:center;color:#fff;font-family:Inter,sans-serif;">
                            <div style="font-size:64px;margin-bottom:16px;animation:rotateWiggle 2s ease-in-out infinite;">📱↻</div>
                            <h2 style="font-size:18px;margin-bottom:8px;">Rotate Your Device</h2>
                            <p style="font-size:14px;color:rgba(255,255,255,0.6);max-width:250px;">For the best experience, please rotate to landscape mode</p>
                        </div>
                    `;
                    prompt.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;';

                    const style = document.createElement('style');
                    style.textContent = '@keyframes rotateWiggle{0%,100%{transform:rotate(-20deg)}50%{transform:rotate(20deg)}}';
                    document.head.appendChild(style);

                    document.body.appendChild(prompt);
                }
                prompt.style.display = 'flex';
            } else if (prompt) {
                prompt.style.display = 'none';
            }
        };

        check();
        window.addEventListener('resize', check);
        window.addEventListener('orientationchange', () => setTimeout(check, 100));
    }

    // ══════════════════════════════════════════════
    // 7. SAFE AREAS
    // ══════════════════════════════════════════════
    function setupSafeAreas() {
        const root = document.documentElement;
        root.style.setProperty('--safe-top', 'env(safe-area-inset-top, 0px)');
        root.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)');
        root.style.setProperty('--safe-left', 'env(safe-area-inset-left, 0px)');
        root.style.setProperty('--safe-right', 'env(safe-area-inset-right, 0px)');
    }

    // ══════════════════════════════════════════════
    // INITIALIZE
    // ══════════════════════════════════════════════
    function init() {
        fixViewport();
        addMobileCSS();
        setupSafeAreas();
        preventMobileGestures();
        bypassPointerLock();
        addOrientationPrompt();

        // Fix canvas when it exists
        const checkCanvas = setInterval(() => {
            if (document.getElementById('game-canvas')) {
                clearInterval(checkCanvas);
                fixCanvasScaling();
            }
        }, 100);

        // Also try after DOM ready
        setTimeout(fixCanvasScaling, 500);

        console.log('[MobilePatcher] All patches applied');
    }

    // Run on DOM ready or immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
