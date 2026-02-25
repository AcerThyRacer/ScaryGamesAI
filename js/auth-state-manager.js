/**
 * Auth State Manager - Single Source of Truth
 * Centralized authentication state management
 * Prevents inconsistencies between localStorage, cookies, and app state
 */

const AuthStateManager = (function() {
	'use strict';

	// Private state - single source of truth
	let state = {
		isLoggedIn: false,
		user: null,
		token: null,
		refreshToken: null,
		sessionId: null,
		avatarUrl: null,
		lastSyncTime: null
	};

	// Event listeners for state changes
	const listeners = new Set();

	// Storage keys
	const STORAGE_KEYS = {
		accessToken: 'sgai-token',
		refreshToken: 'sgai-refresh-token',
		sessionId: 'sgai-session-id',
		user: 'sgai-user',
		avatarUrl: 'sgai-user-avatar-url'
	};

	/**
	 * Decode JWT payload to extract user info
	 */
	function decodeJwtPayload(token) {
		try {
			const parts = String(token || '').split('.');
			if (parts.length < 2) return null;
			const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
			return JSON.parse(json);
		} catch {
			return null;
		}
	}

	/**
	 * Check if token is expired
	 */
	function isTokenExpired(token, bufferSeconds = 60) {
		if (!token) return true;
		const payload = decodeJwtPayload(token);
		if (!payload || !payload.exp) return false;
		return payload.exp <= (Math.floor(Date.now() / 1000) + bufferSeconds);
	}

	/**
	 * Save state to localStorage (persist)
	 */
	function persistState() {
		try {
			if (state.token) {
				localStorage.setItem(STORAGE_KEYS.accessToken, state.token);
			} else {
				localStorage.removeItem(STORAGE_KEYS.accessToken);
			}

			if (state.refreshToken) {
				localStorage.setItem(STORAGE_KEYS.refreshToken, state.refreshToken);
			} else {
				localStorage.removeItem(STORAGE_KEYS.refreshToken);
			}

			if (state.sessionId) {
				localStorage.setItem(STORAGE_KEYS.sessionId, state.sessionId);
			} else {
				localStorage.removeItem(STORAGE_KEYS.sessionId);
			}

			if (state.user) {
				localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.user));
			} else {
				localStorage.removeItem(STORAGE_KEYS.user);
			}

			if (state.avatarUrl) {
				localStorage.setItem(STORAGE_KEYS.avatarUrl, state.avatarUrl);
			} else {
				localStorage.removeItem(STORAGE_KEYS.avatarUrl);
			}

			state.lastSyncTime = Date.now();
		} catch (error) {
			console.error('[AuthStateManager] Failed to persist state:', error);
		}
	}

	/**
	 * Load state from localStorage (initialize)
	 */
	function loadState() {
		try {
			const token = localStorage.getItem(STORAGE_KEYS.accessToken);
			const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
			const sessionId = localStorage.getItem(STORAGE_KEYS.sessionId);
			const userRaw = localStorage.getItem(STORAGE_KEYS.user);
			const avatarUrl = localStorage.getItem(STORAGE_KEYS.avatarUrl);

			state.token = token || null;
			state.refreshToken = refreshToken || null;
			state.sessionId = sessionId || null;
			state.user = userRaw ? JSON.parse(userRaw) : null;
			state.avatarUrl = avatarUrl || null;

			// Validate token
			if (state.token && isTokenExpired(state.token)) {
				console.warn('[AuthStateManager] Token expired on load');
				state.isLoggedIn = false;
			} else {
				state.isLoggedIn = !!state.token;
			}

			state.lastSyncTime = Date.now();
		} catch (error) {
			console.error('[AuthStateManager] Failed to load state:', error);
			clearState();
		}
	}

	/**
	 * Clear all state
	 */
	function clearState() {
		state = {
			isLoggedIn: false,
			user: null,
			token: null,
			refreshToken: null,
			sessionId: null,
			avatarUrl: null,
			lastSyncTime: Date.now()
		};

		// Clear localStorage
		Object.values(STORAGE_KEYS).forEach(key => {
			localStorage.removeItem(key);
		});
	}

	/**
	 * Update state and notify listeners
	 */
	function setState(newState) {
		const oldState = { ...state };
		state = { ...state, ...newState };

		// Determine if login/logout occurred
		if (oldState.isLoggedIn !== state.isLoggedIn) {
			if (state.isLoggedIn) {
				console.log('[AuthStateManager] User logged in');
			} else {
				console.log('[AuthStateManager] User logged out');
			}
		}

		// Persist to localStorage
		persistState();

		// Notify all listeners
		listeners.forEach(listener => {
			try {
				listener({ ...state });
			} catch (error) {
				console.error('[AuthStateManager] Listener error:', error);
			}
		});

		// Dispatch custom event for other scripts
		window.dispatchEvent(new CustomEvent('auth-state-changed', {
			detail: { ...state },
			bubbles: true
		}));
	}

	/**
	 * Subscribe to state changes
	 */
	function subscribe(listener) {
		if (typeof listener !== 'function') {
			throw new Error('Listener must be a function');
		}

		listeners.add(listener);

		// Return unsubscribe function
		return function unsubscribe() {
			listeners.delete(listener);
		};
	}

	/**
	 * Get current state (immutable copy)
	 */
	function getState() {
		return { ...state };
	}

	/**
	 * Get access token
	 */
	function getToken() {
		return state.token;
	}

	/**
	 * Get user info
	 */
	function getUser() {
		return state.user;
	}

	/**
	 * Check if logged in
	 */
	function isLoggedIn() {
		return state.isLoggedIn && !isTokenExpired(state.token);
	}

	/**
	 * Initialize auth state from storage
	 */
	function init() {
		loadState();
		console.log('[AuthStateManager] Initialized', { isLoggedIn: state.isLoggedIn });
		return state;
	}

	/**
	 * Login with token and user data
	 */
	function login({ token, refreshToken, sessionId, user, avatarUrl }) {
		setState({
			isLoggedIn: true,
			token,
			refreshToken: refreshToken || null,
			sessionId: sessionId || null,
			user: user || null,
			avatarUrl: avatarUrl || null,
			lastSyncTime: Date.now()
		});
	}

	/**
	 * Logout and clear all state
	 */
	function logout() {
		clearState();
		setState({});
	}

	/**
	 * Update token (e.g., after refresh)
	 */
	function updateToken({ token, refreshToken }) {
		setState({
			token,
			refreshToken: refreshToken || state.refreshToken,
			lastSyncTime: Date.now()
		});
	}

	/**
	 * Update user profile
	 */
	function updateUser(userData) {
		setState({
			user: { ...state.user, ...userData },
			lastSyncTime: Date.now()
		});
	}

	/**
	 * Update avatar URL
	 */
	function updateAvatarUrl(avatarUrl) {
		setState({ avatarUrl });
	}

	return {
		// Core methods
		init,
		setState,
		getState,
		subscribe,

		// Convenience methods
		isLoggedIn,
		getToken,
		getUser,
		login,
		logout,
		updateToken,
		updateUser,
		updateAvatarUrl,

		// Constants
		STORAGE_KEYS
	};
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
	module.exports = AuthStateManager;
}

// Auto-initialize in browser
if (typeof window !== 'undefined') {
	window.AuthStateManager = AuthStateManager;
	AuthStateManager.init();
}
