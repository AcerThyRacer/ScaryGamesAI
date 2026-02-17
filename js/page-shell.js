/* ============================================
   ScaryGamesAI — Shared Page Shell Enhancements
   Standardizes navigation + baseline accessibility
   ============================================ */

(function () {
    const ACCESSIBILITY_STORAGE_KEYS = {
        highContrast: 'sgai-high-contrast',
        colorblindMode: 'sgai-colorblind-mode',
    };

    const COLORBLIND_FILTERS = {
        none: 'none',
        protanopia: 'url(#protanopia-filter)',
        deuteranopia: 'url(#deuteranopia-filter)',
        tritanopia: 'url(#tritanopia-filter)',
        achromatopsia: 'grayscale(100%)',
    };

    function ensureSkipLink() {
        if (document.querySelector('.skip-link')) return;

        const main = document.querySelector('main');
        if (!main) return;

        if (!main.id) {
            main.id = 'main-content';
        }

        const skip = document.createElement('a');
        skip.className = 'skip-link';
        skip.href = `#${main.id}`;
        skip.textContent = 'Skip to main content';

        document.body.insertBefore(skip, document.body.firstChild);
    }

    function normalizeNavigation() {
        const nav = document.querySelector('.navbar');
        if (!nav) return;

        nav.setAttribute('role', 'navigation');
        if (!nav.getAttribute('aria-label')) {
            nav.setAttribute('aria-label', 'Main navigation');
        }

        const links = nav.querySelectorAll('.nav-links a[href]');
        const currentPath = window.location.pathname.replace(/\/$/, '') || '/';

        links.forEach((link) => {
            const href = link.getAttribute('href');
            if (!href) return;

            if (href.startsWith('#')) return;

            const normalizedHref = href.replace(/\/$/, '') || '/';
            const isHomeAnchor = href.startsWith('/#') && currentPath === '/';
            const isCurrent = normalizedHref === currentPath || isHomeAnchor;

            if (isCurrent) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    function enforceNavigationLinkOrder() {
        const nav = document.querySelector('.navbar');
        if (!nav) return;

        const linksContainer = nav.querySelector('.nav-links');
        if (!linksContainer) return;

        const desiredLinks = [
            { href: '/', label: 'Home' },
            { href: '/games.html', label: 'Games' },
            { href: '/challenges.html', label: 'Challenges' },
            { href: '/achievements.html', label: 'Achievements' },
            { href: '/leaderboards.html', label: 'Leaderboards' },
            { href: '/subscription.html', label: 'Subscribe' },
            { href: '/store.html', label: 'Store' },
            { href: '/#about', label: 'About' },
        ];

        const oldLinks = Array.from(linksContainer.querySelectorAll('a[href]'));
        if (!oldLinks.length) return;

        if (linksContainer.tagName !== 'UL') {
            const ul = document.createElement('ul');
            ul.className = linksContainer.className || 'nav-links';
            linksContainer.replaceWith(ul);
            desiredLinks.forEach(({ href, label }) => {
                const li = document.createElement('li');
                const existing = oldLinks.find((a) => a.getAttribute('href') === href);
                if (existing) {
                    li.appendChild(existing);
                } else {
                    const a = document.createElement('a');
                    a.href = href;
                    a.textContent = label;
                    li.appendChild(a);
                }
                ul.appendChild(li);
            });
            return;
        }

        const byHref = new Map(oldLinks.map((a) => [a.getAttribute('href'), a]));
        linksContainer.innerHTML = '';

        desiredLinks.forEach(({ href, label }) => {
            const li = document.createElement('li');
            const existing = byHref.get(href);
            if (existing) {
                li.appendChild(existing);
            } else {
                const a = document.createElement('a');
                a.href = href;
                a.textContent = label;
                li.appendChild(a);
            }
            linksContainer.appendChild(li);
        });
    }

    function ensureAuthSlot() {
        const nav = document.querySelector('.navbar');
        if (!nav) return;

        const links = nav.querySelector('.nav-links');
        if (!links) return;

        if (document.getElementById('sgai-auth-slot')) return;

        const li = document.createElement('li');
        li.id = 'sgai-auth-slot';
        li.className = 'nav-auth-slot';
        links.appendChild(li);
    }

    function registerAuthUiClient() {
        // Auth/OAuth UI intentionally disabled.
    }

    function normalizeMainLandmark() {
        const main = document.querySelector('main');
        if (!main) return;

        main.setAttribute('role', 'main');
        if (!main.id) {
            main.id = 'main-content';
        }
    }

    function setupMotionPreferences() {
        const root = document.documentElement;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

        const applyMotionPreference = () => {
            if (mq.matches) {
                root.setAttribute('data-reduced-motion', 'true');
            } else {
                root.removeAttribute('data-reduced-motion');
            }
        };

        applyMotionPreference();

        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', applyMotionPreference);
        } else if (typeof mq.addListener === 'function') {
            mq.addListener(applyMotionPreference);
        }
    }

    function improveKeyboardSupport() {
        const clickables = document.querySelectorAll('[onclick]:not(button):not(a):not(input):not(select):not(textarea)');

        clickables.forEach((node) => {
            if (!node.hasAttribute('tabindex')) {
                node.setAttribute('tabindex', '0');
            }
            if (!node.hasAttribute('role')) {
                node.setAttribute('role', 'button');
            }
            if (!node.hasAttribute('aria-label')) {
                const label = (node.textContent || '').trim().replace(/\s+/g, ' ');
                if (label) node.setAttribute('aria-label', label.slice(0, 120));
            }

            node.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    node.click();
                }
            });
        });
    }

    function applyLazyMediaDefaults() {
        const imgs = document.querySelectorAll('img:not([loading])');
        imgs.forEach((img) => {
            img.loading = 'lazy';
            if (!img.decoding) img.decoding = 'async';
        });

        const videos = document.querySelectorAll('video');
        videos.forEach((video) => {
            if (!video.hasAttribute('preload')) {
                video.setAttribute('preload', 'metadata');
            }
            if (!video.hasAttribute('playsinline')) {
                video.setAttribute('playsinline', '');
            }
        });
    }

    function applyHighContrastPreference(enabled) {
        if (enabled) {
            document.documentElement.setAttribute('data-high-contrast', 'true');
        } else {
            document.documentElement.removeAttribute('data-high-contrast');
        }
    }

    function applyColorblindMode(mode) {
        const selectedMode = COLORBLIND_FILTERS[mode] ? mode : 'none';

        if (window.VisualEnhancements && typeof window.VisualEnhancements.setColorblindMode === 'function') {
            window.VisualEnhancements.setColorblindMode(selectedMode);
            return;
        }

        const filter = COLORBLIND_FILTERS[selectedMode] || 'none';
        document.body.style.filter = filter;
        document.body.style.setProperty('-webkit-filter', filter);
    }

    function loadAccessibilityPreferences() {
        const highContrast = localStorage.getItem(ACCESSIBILITY_STORAGE_KEYS.highContrast) === 'true';
        const colorblindMode = localStorage.getItem(ACCESSIBILITY_STORAGE_KEYS.colorblindMode) || 'none';

        applyHighContrastPreference(highContrast);
        applyColorblindMode(colorblindMode);
    }

    function createAccessibilityPanel() {
        if (document.getElementById('a11y-settings-panel')) return;

        const panel = document.createElement('section');
        panel.id = 'a11y-settings-panel';
        panel.className = 'a11y-panel';
        panel.setAttribute('aria-label', 'Accessibility settings');
        panel.setAttribute('aria-hidden', 'true');

        panel.innerHTML = `
            <div class="a11y-panel-header">
                <h2 id="a11y-panel-title">Accessibility</h2>
                <button type="button" class="a11y-close" id="a11y-close-btn" aria-label="Close accessibility settings">×</button>
            </div>
            <div class="a11y-panel-content">
                <label class="a11y-control-row" for="a11y-high-contrast-toggle">
                    <span>High contrast mode</span>
                    <input id="a11y-high-contrast-toggle" type="checkbox">
                </label>
                <label class="a11y-control-stack" for="a11y-colorblind-select">
                    <span>Colorblind mode</span>
                    <select id="a11y-colorblind-select">
                        <option value="none">Off</option>
                        <option value="protanopia">Protanopia (red-light)</option>
                        <option value="deuteranopia">Deuteranopia (green-light)</option>
                        <option value="tritanopia">Tritanopia (blue-light)</option>
                        <option value="achromatopsia">Achromatopsia (grayscale)</option>
                    </select>
                </label>
                <p class="a11y-help-text">Game controls are listed on each game page in the Keyboard & Game Controls section.</p>
            </div>
        `;

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.id = 'a11y-settings-toggle';
        toggleBtn.className = 'a11y-toggle';
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-controls', 'a11y-settings-panel');
        toggleBtn.setAttribute('aria-label', 'Open accessibility settings');
        toggleBtn.textContent = 'Accessibility';

        function setPanelOpen(open) {
            panel.classList.toggle('is-open', open);
            panel.setAttribute('aria-hidden', open ? 'false' : 'true');
            toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                document.getElementById('a11y-high-contrast-toggle')?.focus();
            }
        }

        document.body.appendChild(toggleBtn);
        document.body.appendChild(panel);

        const highContrastToggle = panel.querySelector('#a11y-high-contrast-toggle');
        const colorblindSelect = panel.querySelector('#a11y-colorblind-select');
        const closeBtn = panel.querySelector('#a11y-close-btn');

        const storedContrast = localStorage.getItem(ACCESSIBILITY_STORAGE_KEYS.highContrast) === 'true';
        const storedColorblind = localStorage.getItem(ACCESSIBILITY_STORAGE_KEYS.colorblindMode) || 'none';

        highContrastToggle.checked = storedContrast;
        colorblindSelect.value = COLORBLIND_FILTERS[storedColorblind] ? storedColorblind : 'none';

        toggleBtn.addEventListener('click', () => {
            setPanelOpen(!panel.classList.contains('is-open'));
        });

        closeBtn.addEventListener('click', () => setPanelOpen(false));

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && panel.classList.contains('is-open')) {
                setPanelOpen(false);
            }
        });

        highContrastToggle.addEventListener('change', () => {
            applyHighContrastPreference(highContrastToggle.checked);
            localStorage.setItem(ACCESSIBILITY_STORAGE_KEYS.highContrast, String(highContrastToggle.checked));
        });

        colorblindSelect.addEventListener('change', () => {
            applyColorblindMode(colorblindSelect.value);
            localStorage.setItem(ACCESSIBILITY_STORAGE_KEYS.colorblindMode, colorblindSelect.value);
        });
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                // Non-fatal: continue without offline cache
            });
        });
    }

    function registerObservabilityClient() {
        if (document.querySelector('script[data-observability-client="true"]')) return;

        var inject = function () {
            var script = document.createElement('script');
            script.src = '/js/observability-client.js';
            script.defer = true;
            script.dataset.observabilityClient = 'true';
            document.head.appendChild(script);
        };

        var isGameRoute = window.location.pathname.indexOf('/games/') === 0;
        var hasCriticalUi = !!document.querySelector('.hero, .game-grid, .navbar');

        if (!isGameRoute || hasCriticalUi) {
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(inject, { timeout: 1500 });
            } else {
                setTimeout(inject, 300);
            }
            return;
        }

        inject();
    }

    function initPageShell() {
        normalizeMainLandmark();
        ensureSkipLink();
        enforceNavigationLinkOrder();
        ensureAuthSlot();
        normalizeNavigation();
        setupMotionPreferences();
        improveKeyboardSupport();
        applyLazyMediaDefaults();
        loadAccessibilityPreferences();
        createAccessibilityPanel();
        registerServiceWorker();
        registerObservabilityClient();
        registerAuthUiClient();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPageShell);
    } else {
        initPageShell();
    }
})();
