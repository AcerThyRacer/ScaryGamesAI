/* ============================================
   ScaryGamesAI — Page Transitions v1.0
   Cinematic page transition overlays &
   scroll progress bar.
   ============================================ */

const PageTransitions = (function () {
    'use strict';

    let transitionEl = null;
    let progressBar = null;
    let currentStyle = 0;

    // 8 transition style names
    const STYLES = ['fade', 'blood-wipe', 'glitch', 'dissolve', 'slash', 'static', 'spiral', 'shatter'];

    function init() {
        createTransitionOverlay();
        createScrollProgressBar();
        interceptLinks();
        initAnimatedNavLinks();
        updateScrollProgress();
        window.addEventListener('scroll', updateScrollProgress, { passive: true });
        console.log('[PageTransitions] Initialized with ' + STYLES.length + ' transition styles');
    }

    /* ── Transition Overlay ── */
    function createTransitionOverlay() {
        transitionEl = document.createElement('div');
        transitionEl.id = 'page-transition';
        transitionEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;pointer-events:none;opacity:0;transition:none;';
        document.body.appendChild(transitionEl);

        const style = document.createElement('style');
        style.textContent = `
            /* === Transition Animations === */
            @keyframes ptFade { 0%{opacity:0} 40%{opacity:1} 100%{opacity:1} }
            @keyframes ptBloodWipe { 0%{transform:translateX(-100%)} 100%{transform:translateX(0)} }
            @keyframes ptGlitch {
                0%{opacity:0} 10%{opacity:1} 15%{opacity:0} 20%{opacity:1}
                25%{opacity:0} 35%{opacity:1} 40%{opacity:0.8;transform:translate(3px,-2px)}
                50%{opacity:1;transform:translate(-2px,1px)} 60%{opacity:1}
                100%{opacity:1}
            }
            @keyframes ptDissolve {
                0%{backdrop-filter:blur(0);opacity:0} 50%{backdrop-filter:blur(20px);opacity:0.7}
                100%{backdrop-filter:blur(40px);opacity:1}
            }
            @keyframes ptSlash {
                0%{clip-path:polygon(0 0,0 0,0 100%,0 100%)} 
                100%{clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}
            }
            @keyframes ptStatic {
                0%{opacity:0;background-size:3px 3px} 30%{opacity:0.8} 60%{opacity:0.4;background-size:2px 2px}
                80%{opacity:0.9} 100%{opacity:1;background-size:4px 4px}
            }
            @keyframes ptSpiral {
                0%{transform:scale(0) rotate(0deg);opacity:0;border-radius:50%}
                60%{opacity:1;border-radius:30%}
                100%{transform:scale(2) rotate(180deg);opacity:1;border-radius:0}
            }
            @keyframes ptShatter {
                0%{opacity:0;filter:blur(0)} 20%{opacity:0.5;filter:blur(2px)}
                40%{opacity:0.3;filter:blur(0)} 60%{opacity:0.8;filter:blur(4px)}
                80%{opacity:0.6;filter:blur(1px)} 100%{opacity:1;filter:blur(0)}
            }

            #page-transition.pt-fade { background:#000; animation:ptFade 0.5s ease forwards; }
            #page-transition.pt-blood-wipe {
                background:linear-gradient(90deg,#1a0000,#330000 40%,#880000 80%,#cc0000);
                animation:ptBloodWipe 0.5s ease-out forwards;
            }
            #page-transition.pt-glitch {
                background:#0a0a0f;
                animation:ptGlitch 0.5s steps(4) forwards;
            }
            #page-transition.pt-dissolve {
                background:rgba(0,0,0,0.95);
                animation:ptDissolve 0.5s ease forwards;
            }
            #page-transition.pt-slash {
                background:linear-gradient(135deg,#000,#1a0000);
                animation:ptSlash 0.4s ease-out forwards;
            }
            #page-transition.pt-static {
                background-image:url("data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='%23222'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23111'/%3E%3C/svg%3E");
                background-color:#000;
                animation:ptStatic 0.5s steps(3) forwards;
            }
            #page-transition.pt-spiral {
                background:radial-gradient(circle,#330000,#000);
                animation:ptSpiral 0.5s ease-in forwards;
            }
            #page-transition.pt-shatter {
                background:linear-gradient(45deg,#0a0a0f 25%,#1a0000 50%,#0a0a0f 75%);
                animation:ptShatter 0.5s ease forwards;
            }

            /* === Scroll Progress Bar === */
            #scroll-progress {
                position:fixed;
                top:0;
                left:0;
                height:3px;
                width:0%;
                background:linear-gradient(90deg,var(--accent-red,#cc1122),#ff4444,var(--accent-red,#cc1122));
                z-index:10001;
                transition:width 0.1s linear;
                box-shadow:0 0 8px var(--accent-red-glow, rgba(204,17,34,0.5));
                border-radius:0 2px 2px 0;
            }

            /* === Animated Nav Links === */
            .nav-links a {
                position:relative;
                overflow:hidden;
            }
            .nav-links a::before {
                content:'';
                position:absolute;
                bottom:2px;
                left:0;
                width:0;
                height:2px;
                background:linear-gradient(90deg,transparent,var(--accent-red,#cc1122),transparent);
                transition:width 0.35s cubic-bezier(0.25,0.8,0.25,1);
                box-shadow:0 0 6px var(--accent-red-glow, rgba(204,17,34,0.4));
                border-radius:1px;
            }
            .nav-links a:hover::before {
                width:100%;
            }
            .nav-links a:hover {
                text-shadow:0 0 10px var(--accent-red-glow, rgba(204,17,34,0.4));
            }
        `;
        document.head.appendChild(style);
    }

    /* ── Scroll Progress Bar ── */
    function createScrollProgressBar() {
        progressBar = document.createElement('div');
        progressBar.id = 'scroll-progress';
        document.body.appendChild(progressBar);
    }

    function updateScrollProgress() {
        if (!progressBar) return;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = pct + '%';
    }

    /* ── Nav Link Animation ── */
    function initAnimatedNavLinks() {
        const links = document.querySelectorAll('.nav-links a');
        links.forEach(link => {
            // Add ripple effect on click
            link.addEventListener('click', function (e) {
                const ripple = document.createElement('span');
                ripple.style.cssText = `
                    position:absolute;top:50%;left:50%;
                    width:0;height:0;border-radius:50%;
                    background:var(--accent-red-glow, rgba(204,17,34,0.3));
                    transform:translate(-50%,-50%);
                    animation:navRipple 0.4s ease-out forwards;
                    pointer-events:none;
                `;
                link.appendChild(ripple);
                setTimeout(() => ripple.remove(), 500);
            });
        });

        // Add ripple keyframes
        const rippleStyle = document.createElement('style');
        rippleStyle.textContent = `
            @keyframes navRipple {
                0% { width:0; height:0; opacity:1; }
                100% { width:120px; height:120px; opacity:0; }
            }
        `;
        document.head.appendChild(rippleStyle);
    }

    /* ── Link Interception ── */
    function interceptLinks() {
        document.addEventListener('click', function (e) {
            const link = e.target.closest('a[href]');
            if (!link) return;
            const href = link.getAttribute('href');

            // Only intercept internal navigation links
            if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('javascript:')) return;
            if (link.target === '_blank') return;

            e.preventDefault();

            // Pick a random transition style
            currentStyle = Math.floor(Math.random() * STYLES.length);
            const styleName = STYLES[currentStyle];

            // Reset and trigger transition
            transitionEl.className = '';
            transitionEl.style.opacity = '';
            transitionEl.style.pointerEvents = 'all';

            // Force reflow
            void transitionEl.offsetWidth;

            transitionEl.classList.add('pt-' + styleName);

            // Navigate after transition animation
            setTimeout(function () {
                window.location.href = href;
            }, 450);
        });
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { init, STYLES };
})();
