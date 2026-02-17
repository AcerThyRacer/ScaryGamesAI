/* ============================================
   ScaryGamesAI — Authentication UI (Phase 6)
   - Login / Register modal
   - OAuth buttons (Google / Discord / Steam)
   - Navbar avatar + dropdown
   ============================================ */
(function () {
    'use strict';

    const STORAGE = {
        accessToken: 'sgai-token',
        refreshToken: 'sgai-refresh-token',
        sessionId: 'sgai-session-id',
        user: 'sgai-user',
        avatarUrl: 'sgai-user-avatar-url',
        legacyAccessToken: 'sgai_auth_token',
    };

    function safeJsonParse(raw) {
        try { return JSON.parse(raw); } catch { return null; }
    }

    function decodeJwtPayload(token) {
        const parts = String(token || '').split('.');
        if (parts.length < 2) return null;
        try {
            const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
            return safeJsonParse(json);
        } catch {
            return null;
        }
    }

    function nowSeconds() { return Math.floor(Date.now() / 1000); }

    function getAccessToken() {
        return localStorage.getItem(STORAGE.accessToken) || '';
    }

    function getRefreshToken() {
        return localStorage.getItem(STORAGE.refreshToken) || '';
    }

    function getStoredUser() {
        const raw = localStorage.getItem(STORAGE.user);
        return raw ? safeJsonParse(raw) : null;
    }

    function getAvatarUrl() {
        return localStorage.getItem(STORAGE.avatarUrl) || '';
    }

    function setAuthState({ user, tokens, identity } = {}) {
        if (tokens && tokens.accessToken) {
            localStorage.setItem(STORAGE.accessToken, tokens.accessToken);
            localStorage.setItem(STORAGE.legacyAccessToken, tokens.accessToken);
        }
        if (tokens && tokens.refreshToken) localStorage.setItem(STORAGE.refreshToken, tokens.refreshToken);
        if (tokens && tokens.sessionId) localStorage.setItem(STORAGE.sessionId, tokens.sessionId);
        if (user) localStorage.setItem(STORAGE.user, JSON.stringify(user));

        const picture = identity && identity.profile && typeof identity.profile === 'object' ? identity.profile.picture : null;
        if (picture && typeof picture === 'string') localStorage.setItem(STORAGE.avatarUrl, picture);

        window.dispatchEvent(new CustomEvent('sgai:auth-changed', { detail: { user: user || getStoredUser() } }));
    }

    function clearAuthState() {
        localStorage.removeItem(STORAGE.accessToken);
        localStorage.removeItem(STORAGE.refreshToken);
        localStorage.removeItem(STORAGE.sessionId);
        localStorage.removeItem(STORAGE.user);
        localStorage.removeItem(STORAGE.avatarUrl);
        localStorage.removeItem(STORAGE.legacyAccessToken);
        window.dispatchEvent(new CustomEvent('sgai:auth-changed', { detail: { user: null } }));
    }

    function isLoggedIn() {
        const t = getAccessToken();
        if (!t) return false;
        // demo-token is treated as "logged in" in dev-only flows.
        if (t === 'demo-token') return true;
        const payload = decodeJwtPayload(t);
        if (!payload || !payload.exp) return true;
        return payload.exp > nowSeconds();
    }

    function ensureAuthWidget() {
        const slot = document.getElementById('sgai-auth-slot');
        if (!slot) return null;
        if (document.getElementById('sgai-auth-widget')) return document.getElementById('sgai-auth-widget');

        const wrap = document.createElement('div');
        wrap.id = 'sgai-auth-widget';
        wrap.className = 'auth-widget';
        wrap.innerHTML = `
            <button type="button" class="auth-signin-btn" id="sgai-auth-open-btn">Sign In</button>
            <button type="button" class="auth-avatar-btn" id="sgai-auth-avatar-btn" aria-haspopup="menu" aria-expanded="false" style="display:none;">
                <span class="auth-avatar" id="sgai-auth-avatar"></span>
                <span class="auth-avatar-caret" aria-hidden="true">▾</span>
            </button>
            <div class="auth-dropdown" id="sgai-auth-dropdown" role="menu" aria-label="User menu" hidden>
                <div class="auth-dropdown-header" id="sgai-auth-dropdown-header"></div>
                <button type="button" class="auth-dd-item" id="sgai-auth-open-profile">Player Profile</button>
                <button type="button" class="auth-dd-item" id="sgai-auth-logout">Logout</button>
            </div>
        `;
        slot.appendChild(wrap);
        return wrap;
    }

    function closeDropdown() {
        const dd = document.getElementById('sgai-auth-dropdown');
        const btn = document.getElementById('sgai-auth-avatar-btn');
        if (!dd || !btn) return;
        dd.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
    }

    function openDropdown() {
        const dd = document.getElementById('sgai-auth-dropdown');
        const btn = document.getElementById('sgai-auth-avatar-btn');
        if (!dd || !btn) return;
        dd.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
    }

    function toggleDropdown() {
        const dd = document.getElementById('sgai-auth-dropdown');
        if (!dd) return;
        if (dd.hidden) openDropdown();
        else closeDropdown();
    }

    function computeAvatarLabel(user) {
        const avatarUrl = getAvatarUrl();
        if (avatarUrl) return { kind: 'img', value: avatarUrl };

        // Prefer local profile emoji if present (legacy PlayerProfile system).
        try {
            if (window.PlayerProfile && typeof window.PlayerProfile.getAvatar === 'function') {
                const emoji = window.PlayerProfile.getAvatar();
                if (emoji) return { kind: 'text', value: emoji };
            }
        } catch { }

        const name = (user && (user.username || user.email)) ? String(user.username || user.email) : 'Player';
        const initial = name.trim().slice(0, 1).toUpperCase() || 'P';
        return { kind: 'text', value: initial };
    }

    function renderNavbar() {
        ensureAuthWidget();
        const openBtn = document.getElementById('sgai-auth-open-btn');
        const avatarBtn = document.getElementById('sgai-auth-avatar-btn');
        const avatar = document.getElementById('sgai-auth-avatar');
        const header = document.getElementById('sgai-auth-dropdown-header');

        if (!openBtn || !avatarBtn || !avatar || !header) return;

        if (!isLoggedIn()) {
            openBtn.style.display = '';
            avatarBtn.style.display = 'none';
            closeDropdown();
            return;
        }

        const user = getStoredUser() || { username: 'Player', email: null };
        openBtn.style.display = 'none';
        avatarBtn.style.display = '';

        const av = computeAvatarLabel(user);
        if (av.kind === 'img') {
            avatar.innerHTML = `<img class="auth-avatar-img" alt="" src="${av.value}">`;
        } else {
            avatar.textContent = av.value;
        }

        const label = user.username || user.email || 'Player';
        header.textContent = label;
    }

    function ensureModal() {
        if (document.getElementById('sgai-auth-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'sgai-auth-modal-overlay';
        overlay.className = 'auth-modal-overlay';
        overlay.hidden = true;
        overlay.innerHTML = `
            <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="sgai-auth-title">
                <button type="button" class="auth-modal-close" id="sgai-auth-close" aria-label="Close">×</button>
                <h2 class="auth-modal-title" id="sgai-auth-title">Sign In</h2>
                <div class="auth-tabs" role="tablist" aria-label="Authentication">
                    <button type="button" class="auth-tab is-active" id="sgai-auth-tab-login" role="tab" aria-selected="true">Login</button>
                    <button type="button" class="auth-tab" id="sgai-auth-tab-register" role="tab" aria-selected="false">Register</button>
                </div>

                <div class="auth-error" id="sgai-auth-error" role="status" aria-live="polite" hidden></div>

                <form class="auth-form" id="sgai-auth-form" autocomplete="on">
                    <div class="auth-field" id="sgai-auth-field-identifier">
                        <label for="sgai-auth-identifier">Email or username</label>
                        <input id="sgai-auth-identifier" name="identifier" type="text" inputmode="email" autocomplete="email" placeholder="you@example.com or PlayerOne" required>
                    </div>
                    <div class="auth-field" id="sgai-auth-field-email" style="display:none;">
                        <label for="sgai-auth-email">Email</label>
                        <input id="sgai-auth-email" name="email" type="email" autocomplete="email" placeholder="you@example.com">
                    </div>
                    <div class="auth-field" id="sgai-auth-field-username" style="display:none;">
                        <label for="sgai-auth-username">Username</label>
                        <input id="sgai-auth-username" name="username" type="text" autocomplete="username" placeholder="PlayerOne" maxlength="24">
                    </div>

                    <button type="submit" class="auth-submit" id="sgai-auth-submit">Continue</button>
                </form>

                <div class="auth-divider"><span>or continue with</span></div>
                <div class="auth-oauth-row">
                    <button type="button" class="auth-oauth-btn auth-oauth-google" data-provider="google">Google</button>
                    <button type="button" class="auth-oauth-btn auth-oauth-discord" data-provider="discord">Discord</button>
                    <button type="button" class="auth-oauth-btn auth-oauth-steam" data-provider="steam">Steam</button>
                </div>

                <p class="auth-privacy">By continuing you agree to session cookies/storage used for authentication.</p>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    function showError(message) {
        const el = document.getElementById('sgai-auth-error');
        if (!el) return;
        const msg = String(message || '').trim();
        if (!msg) {
            el.hidden = true;
            el.textContent = '';
            return;
        }
        el.hidden = false;
        el.textContent = msg;
    }

    function setMode(mode) {
        const title = document.getElementById('sgai-auth-title');
        const tabLogin = document.getElementById('sgai-auth-tab-login');
        const tabRegister = document.getElementById('sgai-auth-tab-register');
        const fieldIdentifier = document.getElementById('sgai-auth-field-identifier');
        const fieldEmail = document.getElementById('sgai-auth-field-email');
        const fieldUsername = document.getElementById('sgai-auth-field-username');
        const submit = document.getElementById('sgai-auth-submit');

        if (!title || !tabLogin || !tabRegister || !fieldIdentifier || !fieldEmail || !fieldUsername || !submit) return;

        showError('');
        if (mode === 'register') {
            title.textContent = 'Create Account';
            tabLogin.classList.remove('is-active');
            tabLogin.setAttribute('aria-selected', 'false');
            tabRegister.classList.add('is-active');
            tabRegister.setAttribute('aria-selected', 'true');
            fieldIdentifier.style.display = 'none';
            fieldEmail.style.display = '';
            fieldUsername.style.display = '';
            submit.textContent = 'Create Account';
        } else {
            title.textContent = 'Sign In';
            tabRegister.classList.remove('is-active');
            tabRegister.setAttribute('aria-selected', 'false');
            tabLogin.classList.add('is-active');
            tabLogin.setAttribute('aria-selected', 'true');
            fieldIdentifier.style.display = '';
            fieldEmail.style.display = 'none';
            fieldUsername.style.display = 'none';
            submit.textContent = 'Continue';
        }

        const overlay = document.getElementById('sgai-auth-modal-overlay');
        if (overlay) overlay.dataset.mode = mode;
    }

    function openModal(mode = 'login') {
        ensureModal();
        const overlay = document.getElementById('sgai-auth-modal-overlay');
        if (!overlay) return;

        setMode(mode);
        overlay.hidden = false;
        document.body.classList.add('auth-modal-open');
        closeDropdown();

        // MobileControls sits at very high z-index and can intercept taps.
        // Hide it while the auth modal is open so the close (×) button is always clickable.
        try {
            if (window.MobileControls && typeof window.MobileControls.hide === 'function') {
                window.MobileControls.hide();
            }
        } catch {
            // ignore
        }

        setTimeout(() => {
            const input = document.getElementById(mode === 'register' ? 'sgai-auth-email' : 'sgai-auth-identifier');
            if (input) input.focus();
        }, 0);
    }

    function closeModal() {
        const overlay = document.getElementById('sgai-auth-modal-overlay');
        if (!overlay) return;
        overlay.hidden = true;
        showError('');
        document.body.classList.remove('auth-modal-open');

        try {
            if (window.MobileControls && typeof window.MobileControls.show === 'function') {
                window.MobileControls.show();
            }
        } catch {
            // ignore
        }
    }

    async function apiJson(path, body, { auth = false } = {}) {
        const headers = { 'content-type': 'application/json' };
        if (auth) {
            const t = getAccessToken();
            if (t) headers.authorization = `Bearer ${t}`;
        }
        const res = await fetch(path, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(body || {})
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || payload.success === false) {
            const msg = payload?.error?.message || payload?.message || `Request failed (${res.status})`;
            const err = new Error(msg);
            err.code = payload?.error?.code || null;
            err.status = res.status;
            throw err;
        }
        return payload;
    }

    async function submitLogin(identifier) {
        const raw = String(identifier || '').trim();
        if (!raw) throw new Error('Email or username is required');
        const isEmail = raw.includes('@');
        const payload = await apiJson('/api/auth/login', isEmail ? { email: raw } : { username: raw });
        setAuthState({ user: payload.user || null, tokens: payload.tokens || null, identity: payload.identity || null });
        closeModal();
        renderNavbar();
    }

    async function submitRegister(email, username) {
        const e = String(email || '').trim().toLowerCase();
        const u = String(username || '').trim();
        if (!e) throw new Error('Email is required');
        if (!u) throw new Error('Username is required');
        const payload = await apiJson('/api/auth/register', { email: e, username: u });
        setAuthState({ user: payload.user || null, tokens: payload.tokens || null, identity: payload.identity || null });
        closeModal();
        renderNavbar();
    }

    async function startOAuth(provider) {
        const p = String(provider || '').toLowerCase();
        const returnTo = window.location.pathname + window.location.search + window.location.hash;
        const url = `/api/auth/oauth/${encodeURIComponent(p)}/start?returnTo=${encodeURIComponent(returnTo)}`;
        const res = await fetch(url, { credentials: 'include' });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || payload.success === false || !payload.authUrl) {
            throw new Error(payload?.error?.message || 'OAuth start failed');
        }
        window.location.assign(payload.authUrl);
    }

    async function logout() {
        const sessionId = localStorage.getItem(STORAGE.sessionId) || null;
        try {
            await apiJson('/api/auth/logout', sessionId ? { sessionId } : {}, { auth: true });
        } catch {
            // If token is invalid/expired, still clear local state.
        }
        clearAuthState();
        closeDropdown();
        renderNavbar();
    }

    async function refreshIfNeeded() {
        const t = getAccessToken();
        const r = getRefreshToken();
        if (!t && !r) return;
        if (t === 'demo-token') return;

        const payload = decodeJwtPayload(t);
        const exp = payload && payload.exp ? payload.exp : null;
        const needs = !t || (exp != null && exp <= nowSeconds() + 60);
        if (!needs) return;

        // Try refresh (cookie or body token).
        try {
            const body = r ? { refreshToken: r } : {};
            const out = await apiJson('/api/auth/refresh', body);
            setAuthState({ user: getStoredUser(), tokens: out.tokens || null });
        } catch {
            // Avoid getting stuck in a loop with a bad refresh token.
            clearAuthState();
        }
    }

    async function handleOAuthCallbackFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const provider = (params.get('provider') || '').toLowerCase();
        const state = params.get('state') || '';

        if (!provider) throw new Error('Missing provider');
        if (!state) throw new Error('Missing state');

        let payload = null;
        if (provider === 'steam') {
            const steamOpenId = {};
            for (const [k, v] of params.entries()) {
                if (k === 'provider') continue;
                if (k === 'state') continue;
                steamOpenId[k] = v;
            }
            payload = await apiJson(`/api/auth/oauth/${provider}/callback`, { state, steamOpenId });
        } else {
            const code = params.get('code') || '';
            if (!code) throw new Error('Missing code');
            payload = await apiJson(`/api/auth/oauth/${provider}/callback`, { state, code });
        }

        setAuthState({ user: payload.user || null, tokens: payload.tokens || null, identity: payload.identity || null });
        const returnTo = payload.returnTo || '/';
        window.location.assign(returnTo);
    }

    function wireEvents() {
        const widget = ensureAuthWidget();
        if (!widget) return;

        widget.querySelector('#sgai-auth-open-btn')?.addEventListener('click', () => openModal('login'));
        widget.querySelector('#sgai-auth-avatar-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            toggleDropdown();
        });

        document.addEventListener('click', (e) => {
            const w = document.getElementById('sgai-auth-widget');
            if (!w) return;
            if (w.contains(e.target)) return;
            closeDropdown();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeDropdown();
                closeModal();
            }
        });

        ensureModal();
        const overlay = document.getElementById('sgai-auth-modal-overlay');
        if (!overlay) return;

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        document.getElementById('sgai-auth-close')?.addEventListener('click', closeModal);
        document.getElementById('sgai-auth-tab-login')?.addEventListener('click', () => setMode('login'));
        document.getElementById('sgai-auth-tab-register')?.addEventListener('click', () => setMode('register'));

        document.getElementById('sgai-auth-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            showError('');
            const mode = overlay.dataset.mode || 'login';
            const submit = document.getElementById('sgai-auth-submit');
            if (submit) submit.disabled = true;

            try {
                if (mode === 'register') {
                    const email = document.getElementById('sgai-auth-email')?.value;
                    const username = document.getElementById('sgai-auth-username')?.value;
                    await submitRegister(email, username);
                } else {
                    const identifier = document.getElementById('sgai-auth-identifier')?.value;
                    await submitLogin(identifier);
                }
            } catch (err) {
                showError(err && err.message ? err.message : 'Authentication failed');
            } finally {
                if (submit) submit.disabled = false;
            }
        });

        overlay.querySelectorAll('.auth-oauth-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                showError('');
                const provider = btn.getAttribute('data-provider');
                btn.disabled = true;
                try {
                    await startOAuth(provider);
                } catch (err) {
                    showError(err && err.message ? err.message : 'OAuth failed');
                    btn.disabled = false;
                }
            });
        });

        document.getElementById('sgai-auth-logout')?.addEventListener('click', logout);
        document.getElementById('sgai-auth-open-profile')?.addEventListener('click', () => {
            closeDropdown();
            // Legacy local profile modal (kept as "Player Profile").
            if (window.PlayerProfile && typeof window.PlayerProfile.exists === 'function') {
                const btn = document.getElementById('profile-btn');
                if (btn) btn.click();
                else if (typeof window.PlayerProfileUIOpen === 'function') window.PlayerProfileUIOpen();
            } else {
                openModal('login');
            }
        });
    }

    function init() {
        // Only run UI wiring on pages that have a navbar slot.
        if (!document.getElementById('sgai-auth-slot')) return;

        wireEvents();
        refreshIfNeeded().finally(() => {
            renderNavbar();
        });
    }

    // Expose minimal API for oauth callback page and other scripts.
    window.AuthUI = {
        open: openModal,
        close: closeModal,
        logout,
        getAccessToken,
        handleOAuthCallbackFromUrl,
        refreshIfNeeded,
        renderNavbar
    };

    window.addEventListener('sgai:auth-changed', renderNavbar);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

