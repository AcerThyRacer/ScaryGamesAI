/* ============================================
   ScaryGamesAI — Theme System
   Dark/Light mode with system preference detection
   ============================================ */

(function () {
    'use strict';

    const STORAGE_KEY = 'sgai_theme';
    const THEMES = {
        dark: 'dark',
        light: 'light',
        system: 'system',
    };

    let currentTheme = THEMES.dark;
    let systemPreference = 'dark';

    // ═══════════════════════════════════════════════════════════════
    // SYSTEM PREFERENCE DETECTION
    // ═══════════════════════════════════════════════════════════════

    function getSystemPreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    }

    function watchSystemPreference() {
        if (!window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        mediaQuery.addEventListener('change', (e) => {
            systemPreference = e.matches ? 'light' : 'dark';
            if (currentTheme === THEMES.system) {
                applyTheme(systemPreference);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // THEME MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    function loadTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            currentTheme = saved || THEMES.dark;
        } catch (e) {
            currentTheme = THEMES.dark;
        }

        systemPreference = getSystemPreference();
        
        // Determine actual theme to apply
        const themeToApply = currentTheme === THEMES.system ? systemPreference : currentTheme;
        applyTheme(themeToApply);
    }

    function saveTheme() {
        try {
            localStorage.setItem(STORAGE_KEY, currentTheme);
        } catch (e) {}
    }

    function applyTheme(theme) {
        const root = document.documentElement;
        
        // Remove existing theme classes
        root.classList.remove('theme-dark', 'theme-light');
        
        // Add new theme class
        root.classList.add(`theme-${theme}`);
        
        // Set data attribute for CSS selectors
        root.dataset.theme = theme;
        
        // Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme === 'light' ? '#f5f5f5' : '#0a0a0f';
        }

        // Dispatch event for components to react
        window.dispatchEvent(new CustomEvent('theme-change', {
            detail: { theme, actualTheme: theme }
        }));
    }

    function setTheme(theme) {
        if (!Object.values(THEMES).includes(theme)) {
            console.error('Invalid theme:', theme);
            return;
        }

        currentTheme = theme;
        saveTheme();

        const themeToApply = theme === THEMES.system ? systemPreference : theme;
        applyTheme(themeToApply);
    }

    function getTheme() {
        return currentTheme;
    }

    function getActualTheme() {
        return currentTheme === THEMES.system ? systemPreference : currentTheme;
    }

    function toggleTheme() {
        const actual = getActualTheme();
        setTheme(actual === 'dark' ? 'light' : 'dark');
    }

    // ═══════════════════════════════════════════════════════════════
    // THEME TOGGLE BUTTON
    // ═══════════════════════════════════════════════════════════════

    function createToggleButton() {
        const btn = document.createElement('button');
        btn.className = 'theme-toggle-btn';
        btn.setAttribute('aria-label', 'Toggle theme');
        btn.innerHTML = `
            <span class="theme-icon sun">☀️</span>
            <span class="theme-icon moon">🌙</span>
            <span class="theme-icon system">💻</span>
        `;

        btn.addEventListener('click', () => {
            toggleTheme();
            updateButtonIcon(btn);
        });

        updateButtonIcon(btn);
        return btn;
    }

    function updateButtonIcon(btn) {
        const theme = getTheme();
        btn.classList.remove('is-dark', 'is-light', 'is-system');
        
        if (theme === THEMES.dark) {
            btn.classList.add('is-dark');
        } else if (theme === THEMES.light) {
            btn.classList.add('is-light');
        } else {
            btn.classList.add('is-system');
        }
    }

    function injectToggleButton(container = null) {
        const btn = createToggleButton();
        
        if (container) {
            container.appendChild(btn);
        } else {
            // Find navbar or create floating button
            const navbar = document.querySelector('.nav-links') || document.querySelector('.navbar');
            if (navbar) {
                navbar.appendChild(btn);
            } else {
                document.body.appendChild(btn);
            }
        }

        return btn;
    }

    // ═══════════════════════════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════════════════════════

    function injectStyles() {
        if (document.getElementById('theme-system-styles')) return;

        const style = document.createElement('style');
        style.id = 'theme-system-styles';
        style.textContent = `
            /* Theme Toggle Button */
            .theme-toggle-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                overflow: hidden;
            }

            .theme-toggle-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.2);
                transform: rotate(15deg);
            }

            .theme-icon {
                display: none;
                font-size: 18px;
                transition: transform 0.3s ease;
            }

            .theme-toggle-btn.is-dark .theme-icon.moon,
            .theme-toggle-btn.is-light .theme-icon.sun,
            .theme-toggle-btn.is-system .theme-icon.system {
                display: block;
            }

            /* Light Theme Overrides */
            .theme-light {
                --bg-primary: #f5f5f5;
                --bg-secondary: #ffffff;
                --bg-card: rgba(255, 255, 255, 0.9);
                --bg-card-hover: rgba(255, 255, 255, 1);
                --text-primary: #1a1a1a;
                --text-secondary: #666666;
                --text-muted: #999999;
                --border-dark: rgba(0, 0, 0, 0.1);
                --border-glow: rgba(204, 17, 34, 0.2);
            }

            .theme-light body {
                background: var(--bg-primary);
                color: var(--text-primary);
            }

            .theme-light .navbar {
                background: rgba(255, 255, 255, 0.92);
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            }

            .theme-light .nav-logo {
                color: var(--text-primary);
            }

            .theme-light .nav-links a {
                color: var(--text-secondary);
            }

            .theme-light .nav-links a:hover,
            .theme-light .nav-links a.active {
                color: var(--accent-red);
            }

            .theme-light .game-card {
                background: var(--bg-card);
                border-color: rgba(0, 0, 0, 0.1);
            }

            .theme-light .game-card:hover {
                border-color: var(--accent-red);
            }

            .theme-light .section-header h2 {
                color: var(--text-primary);
            }

            .theme-light .section-header p {
                color: var(--text-secondary);
            }

            .theme-light .footer {
                background: rgba(0, 0, 0, 0.02);
                border-top: 1px solid rgba(0, 0, 0, 0.1);
            }

            .theme-light .bg-fog,
            .theme-light .bg-grain {
                opacity: 0.3;
            }

            /* Light theme specific game card styles */
            .theme-light .game-card .game-title {
                color: var(--text-primary);
            }

            .theme-light .game-card .game-desc {
                color: var(--text-secondary);
            }

            /* Theme transition */
            html {
                transition: background-color 0.3s ease, color 0.3s ease;
            }

            html * {
                transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
            }

            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                html, html * {
                    transition: none !important;
                }
            }

            /* Theme selector in settings */
            .theme-selector {
                display: flex;
                gap: 8px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
            }

            .theme-option {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.02);
                border: 2px solid transparent;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .theme-option:hover {
                background: rgba(255, 255, 255, 0.05);
            }

            .theme-option.active {
                border-color: var(--accent-red, #cc1122);
                background: rgba(204, 17, 34, 0.1);
            }

            .theme-option-icon {
                font-size: 24px;
            }

            .theme-option-label {
                font-size: 12px;
                color: var(--text-secondary);
            }
        `;

        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════════════
    // THEME SELECTOR COMPONENT
    // ═══════════════════════════════════════════════════════════════

    function createThemeSelector() {
        const container = document.createElement('div');
        container.className = 'theme-selector';
        container.innerHTML = `
            <div class="theme-option" data-theme="dark">
                <span class="theme-option-icon">🌙</span>
                <span class="theme-option-label">Dark</span>
            </div>
            <div class="theme-option" data-theme="light">
                <span class="theme-option-icon">☀️</span>
                <span class="theme-option-label">Light</span>
            </div>
            <div class="theme-option" data-theme="system">
                <span class="theme-option-icon">💻</span>
                <span class="theme-option-label">System</span>
            </div>
        `;

        // Update active state
        function updateActive() {
            const current = getTheme();
            container.querySelectorAll('.theme-option').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.theme === current);
            });
        }

        updateActive();

        // Bind clicks
        container.querySelectorAll('.theme-option').forEach(opt => {
            opt.addEventListener('click', () => {
                setTheme(opt.dataset.theme);
                updateActive();
            });
        });

        // Listen for external changes
        window.addEventListener('theme-change', updateActive);

        return container;
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    function init() {
        injectStyles();
        watchSystemPreference();
        loadTheme();
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPORTS
    // ═══════════════════════════════════════════════════════════════

    window.ThemeSystem = {
        init,
        getTheme,
        getActualTheme,
        setTheme,
        toggleTheme,
        THEMES,
        createToggleButton,
        createThemeSelector,
        injectToggleButton,
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
