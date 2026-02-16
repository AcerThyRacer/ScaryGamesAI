/* ScaryGamesAI - Native Web Components for shared UI (DRY navbar/footer) */
(function () {
    'use strict';

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    function getPath() {
        try { return (location && location.pathname) ? location.pathname : '/'; } catch (e) { return '/'; }
    }

    function activeClass(href) {
        var p = getPath();
        if (href === '/' && (p === '/' || p === '/index.html')) return 'active';
        if (href !== '/' && p === href) return 'active';
        return '';
    }

    function ariaCurrent(href) {
        return activeClass(href) ? ' aria-current="page"' : '';
    }

    function aboutHref() {
        var p = getPath();
        if (p === '/' || p === '/index.html') return '#about';
        return '/#about';
    }

    function getUserTier() {
        try { return localStorage.getItem('sgai-sub-tier') || 'none'; } catch (e) { return 'none'; }
    }

    function hasMaxTier() {
        return getUserTier() === 'max';
    }

    function getNavLinks() {
        var links = [
            { href: '/', label: 'Home' },
            { href: '/games.html', label: 'Games' },
            { href: '/challenges.html', label: 'Challenges' },
            { href: '/achievements.html', label: 'Achievements' },
            { href: '/leaderboards.html', label: 'Leaderboards' }
        ];

        // Add Ollama tabs only for max tier users
        if (hasMaxTier()) {
            links.push({ href: '/ollama-builder.html', label: 'Game Builder' });
            links.push({ href: '/custom-games.html', label: 'Custom Games' });
        }

        links.push({ href: '/subscription.html', label: 'Subscribe' });
        links.push({ href: '/store.html', label: 'Store' });
        links.push({ href: aboutHref(), label: 'About' });

        return links;
    }

    class SGAINavbar extends HTMLElement {
        connectedCallback() {
            // Avoid double-rendering if reconnected
            if (this._rendered) return;
            this._rendered = true;

            var logoText = 'Scary<span>Games</span>AI';
            // Home page historically used "ScaryGames" only; preserve that look.
            if (getPath() === '/' || getPath() === '/index.html') logoText = 'ScaryGames';

            var links = getNavLinks();

            var items = links.map(function (l) {
                var cls = activeClass(l.href);
                var clsAttr = cls ? (' class="' + escapeHtml(cls) + '"') : '';
                return '<li><a href="' + escapeHtml(l.href) + '"' + clsAttr + ariaCurrent(l.href) + '>' + escapeHtml(l.label) + '</a></li>';
            }).join('');

            this.innerHTML =
                '<nav class="navbar" role="navigation" aria-label="Main navigation">' +
                '  <div class="nav-inner">' +
                '    <a href="/" class="nav-logo">' + logoText + '</a>' +
                '    <ul class="nav-links">' + items + '</ul>' +
                '  </div>' +
                '</nav>';
        }
    }

    class SGAIFooter extends HTMLElement {
        connectedCallback() {
            if (this._rendered) return;
            this._rendered = true;
            var year = (new Date()).getFullYear();
            this.innerHTML =
                '<footer class="footer" role="contentinfo">' +
                '  <div class="footer-inner">' +
                '    <p>&copy; ' + year + ' ScaryGamesAI — Enter at your own risk. 💀</p>' +
                '  </div>' +
                '</footer>';
        }
    }

    if (!customElements.get('sgai-navbar')) customElements.define('sgai-navbar', SGAINavbar);
    if (!customElements.get('sgai-footer')) customElements.define('sgai-footer', SGAIFooter);
})();

