/* ============================================
   ScaryGamesAI — Scroll FX System
   ============================================ */
(function() {
    'use strict';

    const ANIMATIONS = [
        'anim-ghost-float', 'anim-zombie-lurch', 'anim-demon-slam', 'anim-blood-rise',
        'anim-crypt-door', 'anim-spider-drop', 'anim-fog-reveal', 'anim-heartbeat-in',
        'anim-glitch-snap', 'anim-shadow-creep', 'anim-whisper-fade', 'anim-chains-drag',
        'anim-mirror-crack', 'anim-vampire-dash', 'anim-grave-dig', 'anim-possessed-shake',
        'anim-banshee-scream', 'anim-warp-reality', 'anim-flicker-in', 'anim-darkness-consume'
    ];

    const EFFECTS = [
        'fx-red-puff', 'fx-red-flash', 'fx-blood-mist', 'fx-ghost-trail', 'fx-shadow-burst'
    ];

    const TARGETS = [
        '.game-card', '.section-header', '.hero-title', '.hero-subtitle', '.hero-cta',
        '.featured-game', '.daily-card', '.pricing-card', '.testimonial-card',
        '.lb-board', '.ach-card', '.hero-desc'
    ];

    // Intersection Observer
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;

                // Randomly pick animation and effect
                const anim = ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)];
                const effect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];

                // Add classes to trigger animation
                // We remove the init class (which hides it) and add the anim class
                el.classList.remove('scroll-anim-init');
                el.classList.add(anim);
                el.classList.add(effect);
                el.classList.add('scroll-anim');

                // Stop observing this element
                obs.unobserve(el);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    function observeElements() {
        const elements = document.querySelectorAll(TARGETS.join(', '));
        elements.forEach(el => {
            if (!el.classList.contains('scroll-anim-init') && !el.classList.contains('scroll-anim')) {
                el.classList.add('scroll-anim-init');
                observer.observe(el);
            }
        });
    }

    const mutationObserver = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                shouldUpdate = true;
            }
        });
        if (shouldUpdate) {
            setTimeout(observeElements, 100);
        }
    });

    function init() {
        observeElements();
        mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
