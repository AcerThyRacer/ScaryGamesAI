/* ============================================
   Mobile Setup - Loads before game.js
   Automatically included via base layout or game HTML
   Ensures MobileControls is initialized before game runs
   ============================================ */

(function () {
    'use strict';

    // Load CSS first
    function loadCSS(href, id) {
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    // Load JS synchronously
    function loadJS(src, id) {
        if (document.getElementById(id)) return;
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = false;
        document.head.appendChild(script);
    }

    // Check if mobile
    function isMobile() {
        const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (!hasTouch) return false;
        if (/Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(navigator.userAgent)) return true;
        if (window.innerWidth < 1024) return true;
        return false;
    }

    // Main initialization
    function initMobile() {
        if (!isMobile()) {
            console.log('[MobileSetup] Desktop detected');
            return;
        }

        console.log('[MobileSetup] Mobile detected, loading mobile support...');

        // Load CSS
        loadCSS('/css/mobile-controls.css', 'mc-css');
        loadCSS('/css/mobile-enhancements.css', 'mc-enhance-css');

        // Mark body as mobile
        document.body.classList.add('is-mobile');

        // Load mobile scripts in order
        // Note: These must be loaded BEFORE game.js
        // If game.js is already loaded, we patch post-hoc

        if (typeof MobileControls === 'undefined') {
            loadJS('/js/mobile-controls.js', 'mc-js');
        }

        // Mobile universal init will be loaded
        if (typeof MobileInit === 'undefined') {
            loadJS('/js/mobile-universal-init.js', 'mc-init-js');
        }

        // Game bindings
        if (typeof MobileGameBindings === 'undefined') {
            loadJS('/js/mobile-game-bindings.js', 'mc-bindings-js');
        }

        // Patcher for runtime fixes
        loadJS('/js/mobile-patcher.js', 'mc-patcher-js');

        console.log('[MobileSetup] Mobile scripts loaded');
    }

    // Run immediately
    initMobile();

    // Also run on DOMContentLoaded for dynamic elements
    document.addEventListener('DOMContentLoaded', () => {
        if (isMobile()) {
            document.body.classList.add('is-mobile');
        }
    });

    // Export for global access
    window.MobileSetup = {
        isMobile: isMobile,
        init: initMobile
    };

})();
