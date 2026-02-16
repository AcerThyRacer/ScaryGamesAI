/* ============================================
   ScaryGamesAI — Global Search System
   Fuzzy search with keyboard shortcuts (Ctrl+K)
   ============================================ */

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // SEARCH CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    const CONFIG = {
        maxResults: 8,
        maxRecentSearches: 5,
        minQueryLength: 1,
        debounceMs: 150,
        storageKey: 'sgai_recent_searches',
    };

    // ═══════════════════════════════════════════════════════════════
    // FUZZY SEARCH ALGORITHM
    // ═══════════════════════════════════════════════════════════════

    /**
     * Fuzzy match - returns score if query matches target, 0 otherwise
     * Higher score = better match
     */
    function fuzzyMatch(query, target) {
        if (!query || !target) return 0;
        
        const q = query.toLowerCase().trim();
        const t = target.toLowerCase().trim();
        
        // Exact match - highest score
        if (t === q) return 100;
        
        // Starts with query - very high score
        if (t.startsWith(q)) return 90;
        
        // Contains query as whole word - high score
        const words = t.split(/\s+/);
        for (const word of words) {
            if (word === q) return 80;
            if (word.startsWith(q)) return 70;
        }
        
        // Contains query - medium score
        if (t.includes(q)) return 60;
        
        // Fuzzy character matching
        let score = 0;
        let qIndex = 0;
        let consecutive = 0;
        
        for (let i = 0; i < t.length && qIndex < q.length; i++) {
            if (t[i] === q[qIndex]) {
                consecutive++;
                score += consecutive * 2; // Bonus for consecutive matches
                qIndex++;
            } else {
                consecutive = 0;
            }
        }
        
        // Only return score if all query characters were found
        return qIndex === q.length ? Math.max(10, score) : 0;
    }

    /**
     * Calculate search score for an item
     */
    function calculateScore(query, item) {
        let maxScore = 0;
        
        // Search in title (highest priority)
        const titleScore = fuzzyMatch(query, item.title) * 1.5;
        maxScore = Math.max(maxScore, titleScore);
        
        // Search in name
        if (item.name) {
            const nameScore = fuzzyMatch(query, item.name) * 1.4;
            maxScore = Math.max(maxScore, nameScore);
        }
        
        // Search in description
        if (item.desc || item.description) {
            const descScore = fuzzyMatch(query, item.desc || item.description) * 0.8;
            maxScore = Math.max(maxScore, descScore);
        }
        
        // Search in tags
        if (item.tags && Array.isArray(item.tags)) {
            for (const tag of item.tags) {
                const tagScore = fuzzyMatch(query, tag) * 1.2;
                maxScore = Math.max(maxScore, tagScore);
            }
        }
        
        // Search in category
        if (item.category) {
            const catScore = fuzzyMatch(query, item.category) * 1.1;
            maxScore = Math.max(maxScore, catScore);
        }
        
        return maxScore;
    }

    // ═══════════════════════════════════════════════════════════════
    // DATA SOURCES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Collect all searchable items from various sources
     */
    function collectSearchableItems() {
        const items = [];
        
        // 1. Games from main.js GAMES array
        if (typeof GAMES !== 'undefined' && Array.isArray(GAMES)) {
            GAMES.forEach(game => {
                items.push({
                    type: 'game',
                    id: game.id,
                    title: game.title,
                    desc: game.desc,
                    tags: game.tags,
                    category: game.category,
                    url: game.url,
                    icon: getGameIcon(game.id),
                    isNew: game.isNew,
                    requiredTier: game.requiredTier,
                });
            });
        }
        
        // 2. Achievements
        if (typeof AchievementSystem !== 'undefined') {
            try {
                const achievements = AchievementSystem.getAll();
                achievements.forEach(ach => {
                    items.push({
                        type: 'achievement',
                        id: ach.id,
                        title: ach.title,
                        desc: ach.desc,
                        icon: ach.icon || '🏆',
                        game: ach.game,
                        unlocked: ach.unlocked,
                    });
                });
            } catch (e) {}
        }
        
        // Direct access to achievements data
        if (items.filter(i => i.type === 'achievement').length === 0) {
            try {
                const achData = localStorage.getItem('scarygames_achievements');
                const unlocked = achData ? JSON.parse(achData) : {};
                
                // Add known achievements
                const knownAchievements = getKnownAchievements();
                knownAchievements.forEach(ach => {
                    items.push({
                        type: 'achievement',
                        id: ach.id,
                        title: ach.title,
                        desc: ach.desc,
                        icon: ach.icon || '🏆',
                        game: ach.game,
                        unlocked: unlocked[ach.id] || false,
                    });
                });
            } catch (e) {}
        }
        
        // 3. Store items
        if (typeof ScaryStore !== 'undefined') {
            try {
                const storeItems = ScaryStore.getAllSearchableItems ? 
                    ScaryStore.getAllSearchableItems() : 
                    getStoreItemsFromCosmetics();
                storeItems.forEach(item => {
                    items.push({
                        type: 'store',
                        id: item.id,
                        title: item.name,
                        desc: item.rarity + (item.type ? ' ' + item.type : ''),
                        icon: item.image || '✨',
                        category: item.category || item.type,
                        price: item.price,
                        currency: item.currency,
                        rarity: item.rarity,
                    });
                });
            } catch (e) {}
        }
        
        // 4. Challenges
        if (typeof DailyChallenge !== 'undefined') {
            try {
                const challenge = DailyChallenge.getCurrentChallenge ? 
                    DailyChallenge.getCurrentChallenge() : null;
                if (challenge) {
                    items.push({
                        type: 'challenge',
                        id: 'daily',
                        title: challenge.title || 'Daily Challenge',
                        desc: challenge.description || challenge.desc,
                        icon: '🎯',
                    });
                }
            } catch (e) {}
        }
        
        // 5. Pages (static)
        const pages = [
            { id: 'home', title: 'Home', desc: 'Main page', icon: '🏠', url: '/' },
            { id: 'games', title: 'Games', desc: 'Browse all games', icon: '🎮', url: '/games.html' },
            { id: 'store', title: 'Store', desc: 'Premium cosmetics and battle pass', icon: '🛒', url: '/store.html' },
            { id: 'challenges', title: 'Challenges', desc: 'Daily and weekly challenges', icon: '🎯', url: '/challenges.html' },
            { id: 'achievements', title: 'Achievements', desc: 'Track your accomplishments', icon: '🏆', url: '/achievements.html' },
            { id: 'leaderboards', title: 'Leaderboards', desc: 'Global player rankings', icon: '📊', url: '/leaderboards.html' },
            { id: 'subscribe', title: 'Subscribe', desc: 'Premium subscription tiers', icon: '⭐', url: '/subscription.html' },
        ];
        pages.forEach(page => {
            items.push({
                type: 'page',
                ...page,
            });
        });
        
        // 6. Player profile
        if (typeof PlayerProfile !== 'undefined' && PlayerProfile.exists()) {
            const profile = PlayerProfile.getStats();
            if (profile) {
                items.push({
                    type: 'profile',
                    id: 'my-profile',
                    title: profile.username,
                    desc: `Level ${Math.floor(profile.totalPlayTime / 60)} • ${profile.gamesPlayed} games played`,
                    icon: profile.avatar || '💀',
                    url: '/achievements.html',
                });
            }
        }
        
        return items;
    }

    /**
     * Get game icon based on ID
     */
    function getGameIcon(gameId) {
        const icons = {
            'backrooms-pacman': '🟡',
            'shadow-crawler': '🌑',
            'the-abyss': '🌊',
            'nightmare-run': '🏃',
            'yeti-run': '🦣',
            'blood-tetris': '🩸',
            'seance': '👻',
            'dollhouse': '🧸',
            'zombie-horde': '🧟',
            'the-elevator': '🛗',
            'graveyard-shift': '🪦',
            'web-of-terror': '🕷️',
            'total-zombies-medieval': '⚔️',
            'cursed-depths': '⛏️',
            'freddys-nightmare': '🐻',
            'haunted-asylum': '🏥',
            'ritual-circle': '🔮',
            'cursed-sands': '🏜️',
        };
        return icons[gameId] || '🎮';
    }

    /**
     * Get known achievements list
     */
    function getKnownAchievements() {
        return [
            { id: 'bp_first_pellet', title: 'First Bite', desc: 'Collect your first pellet', icon: '⚫', game: 'backrooms-pacman' },
            { id: 'bp_speed_demon', title: 'Speed Demon', desc: 'Collect all pellets in under 3 minutes', icon: '⚡', game: 'backrooms-pacman' },
            { id: 'bp_survivor', title: 'Corridor Survivor', desc: 'Survive 2 minutes without being caught', icon: '🏃', game: 'backrooms-pacman' },
            { id: 'bp_win', title: 'Escape the Backrooms', desc: 'Collect all pellets and escape', icon: '🚪', game: 'backrooms-pacman' },
            { id: 'sc_first_key', title: 'Key Finder', desc: 'Collect your first key', icon: '🔑', game: 'shadow-crawler' },
            { id: 'sc_all_levels', title: 'Shadow Master', desc: 'Complete all levels', icon: '🌑', game: 'shadow-crawler' },
            { id: 'ab_first_artifact', title: 'Deep Discovery', desc: 'Collect your first artifact', icon: '🔮', game: 'the-abyss' },
            { id: 'ab_deep_diver', title: 'Deep Diver', desc: 'Reach the deepest depth', icon: '🤿', game: 'the-abyss' },
            { id: 'nr_1000m', title: 'Nightmare Mile', desc: 'Survive 1000m', icon: '🏃', game: 'nightmare-run' },
            { id: 'nr_5000m', title: 'Marathon Runner', desc: 'Survive 5000m', icon: '🏅', game: 'nightmare-run' },
            { id: 'yr_1000m', title: 'Snow Runner', desc: 'Survive 1000m', icon: '❄️', game: 'yeti-run' },
            { id: 'yr_5000m', title: 'Blizzard Warrior', desc: 'Survive 5000m', icon: '🌨️', game: 'yeti-run' },
            { id: 'bt_first_line', title: 'First Blood', desc: 'Clear your first line', icon: '🩸', game: 'blood-tetris' },
            { id: 'bt_tetris', title: 'Bone Crush', desc: 'Clear 4 lines at once', icon: '💥', game: 'blood-tetris' },
            { id: 'sn_first_spirit', title: 'Medium', desc: 'Contact your first spirit', icon: '👻', game: 'seance' },
            { id: 'dh_escape', title: 'Dollhouse Escapee', desc: 'Escape the dollhouse', icon: '🏠', game: 'dollhouse' },
            { id: 'zh_wave10', title: 'Zombie Slayer', desc: 'Survive 10 waves', icon: '⚔️', game: 'zombie-horde' },
            { id: 'el_escape', title: 'Floor Zero', desc: 'Reach Floor 0 and escape', icon: '🆓', game: 'the-elevator' },
            { id: 'gs_dawn', title: 'Daybreak', desc: 'Survive until dawn', icon: '🌅', game: 'graveyard-shift' },
            { id: 'wt_escape', title: 'Mine Escape', desc: 'Find all keys and escape', icon: '🕷️', game: 'web-of-terror' },
            { id: 'meta_first_game', title: 'Welcome to ScaryGames', desc: 'Play your first game', icon: '🎮', game: null },
            { id: 'meta_all_games', title: 'Completionist', desc: 'Play all games', icon: '🏆', game: null },
        ];
    }

    /**
     * Get store items from COSMETICS
     */
    function getStoreItemsFromCosmetics() {
        const items = [];
        // This will be populated if ScaryStore is available
        return items;
    }

    // ═══════════════════════════════════════════════════════════════
    // SEARCH ENGINE
    // ═══════════════════════════════════════════════════════════════

    let searchIndex = null;
    let recentSearches = [];

    function initSearchIndex() {
        if (!searchIndex) {
            searchIndex = collectSearchableItems();
        }
        return searchIndex;
    }

    function loadRecentSearches() {
        try {
            const raw = localStorage.getItem(CONFIG.storageKey);
            recentSearches = raw ? JSON.parse(raw) : [];
        } catch (e) {
            recentSearches = [];
        }
    }

    function saveRecentSearches() {
        try {
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(recentSearches));
        } catch (e) {}
    }

    function addRecentSearch(query) {
        if (!query || query.length < 2) return;
        
        // Remove duplicate
        recentSearches = recentSearches.filter(q => q.toLowerCase() !== query.toLowerCase());
        
        // Add to front
        recentSearches.unshift(query);
        
        // Trim to max
        if (recentSearches.length > CONFIG.maxRecentSearches) {
            recentSearches = recentSearches.slice(0, CONFIG.maxRecentSearches);
        }
        
        saveRecentSearches();
    }

    /**
     * Perform search and return ranked results
     */
    function search(query, typeFilter = null) {
        initSearchIndex();
        
        if (!query || query.length < CONFIG.minQueryLength) {
            return { results: [], recent: recentSearches };
        }
        
        const results = [];
        
        for (const item of searchIndex) {
            // Apply type filter
            if (typeFilter && item.type !== typeFilter) continue;
            
            const score = calculateScore(query, item);
            
            if (score > 0) {
                results.push({ ...item, score });
            }
        }
        
        // Sort by score descending
        results.sort((a, b) => b.score - a.score);
        
        // Limit results
        const limitedResults = results.slice(0, CONFIG.maxResults);
        
        return { results: limitedResults, recent: [] };
    }

    // ═══════════════════════════════════════════════════════════════
    // SEARCH UI
    // ═══════════════════════════════════════════════════════════════

    let modal = null;
    let input = null;
    let resultsContainer = null;
    let isOpen = false;
    let selectedIndex = -1;
    let currentResults = [];
    let currentTypeFilter = null;

    function createModal() {
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'search-modal';
        modal.className = 'search-modal';
        modal.innerHTML = `
            <div class="search-backdrop"></div>
            <div class="search-container">
                <div class="search-header">
                    <div class="search-input-wrapper">
                        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <input type="text" class="search-input" placeholder="Search games, achievements, store..." autocomplete="off" spellcheck="false">
                        <div class="search-shortcut-hint">
                            <kbd>Ctrl</kbd><kbd>K</kbd>
                        </div>
                    </div>
                    <div class="search-filters">
                        <button class="search-filter-btn active" data-filter="all">All</button>
                        <button class="search-filter-btn" data-filter="game">Games</button>
                        <button class="search-filter-btn" data-filter="achievement">Achievements</button>
                        <button class="search-filter-btn" data-filter="store">Store</button>
                        <button class="search-filter-btn" data-filter="page">Pages</button>
                    </div>
                </div>
                <div class="search-body">
                    <div class="search-results"></div>
                    <div class="search-empty">
                        <div class="search-empty-icon">🔍</div>
                        <p>Start typing to search...</p>
                    </div>
                    <div class="search-recent">
                        <div class="search-recent-header">
                            <span>Recent searches</span>
                            <button class="search-clear-recent">Clear</button>
                        </div>
                        <div class="search-recent-list"></div>
                    </div>
                </div>
                <div class="search-footer">
                    <div class="search-footer-hint">
                        <span><kbd>↑↓</kbd> Navigate</span>
                        <span><kbd>Enter</kbd> Select</span>
                        <span><kbd>Esc</kbd> Close</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Cache elements
        input = modal.querySelector('.search-input');
        resultsContainer = modal.querySelector('.search-results');

        // Bind events
        bindModalEvents();

        return modal;
    }

    function bindModalEvents() {
        // Close on backdrop click
        modal.querySelector('.search-backdrop').addEventListener('click', close);

        // Input handling with debounce
        let debounceTimer;
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                performSearch(e.target.value);
            }, CONFIG.debounceMs);
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateResults(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateResults(-1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                selectCurrent();
            } else if (e.key === 'Escape') {
                close();
            }
        });

        // Filter buttons
        modal.querySelectorAll('.search-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.search-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const filter = btn.dataset.filter;
                currentTypeFilter = filter === 'all' ? null : filter;
                performSearch(input.value);
            });
        });

        // Clear recent searches
        modal.querySelector('.search-clear-recent').addEventListener('click', () => {
            recentSearches = [];
            saveRecentSearches();
            renderRecentSearches();
        });

        // Global keyboard shortcut
        document.addEventListener('keydown', (e) => {
            // Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                toggle();
            }
            // Slash key (when not in input)
            if (e.key === '/' && !isInputFocused()) {
                e.preventDefault();
                open();
            }
        });
    }

    function isInputFocused() {
        const active = document.activeElement;
        return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    }

    function performSearch(query) {
        const searchResult = search(query, currentTypeFilter);
        currentResults = searchResult.results;
        selectedIndex = -1;

        const recentContainer = modal.querySelector('.search-recent');
        const emptyContainer = modal.querySelector('.search-empty');

        if (!query || query.length < CONFIG.minQueryLength) {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
            recentContainer.style.display = 'block';
            emptyContainer.style.display = 'none';
            renderRecentSearches();
            return;
        }

        recentContainer.style.display = 'none';
        
        if (currentResults.length === 0) {
            resultsContainer.style.display = 'none';
            emptyContainer.style.display = 'flex';
            emptyContainer.innerHTML = `
                <div class="search-empty-icon">😕</div>
                <p>No results found for "${escapeHtml(query)}"</p>
                <p class="search-empty-hint">Try searching for games, achievements, or store items</p>
            `;
            return;
        }

        emptyContainer.style.display = 'none';
        resultsContainer.style.display = 'block';
        renderResults(currentResults);
    }

    function renderResults(results) {
        const grouped = groupByType(results);
        let html = '';

        const typeOrder = ['game', 'achievement', 'store', 'profile', 'challenge', 'page'];
        const typeNames = {
            game: '🎮 Games',
            achievement: '🏆 Achievements',
            store: '✨ Store',
            profile: '👤 Profile',
            challenge: '🎯 Challenges',
            page: '📄 Pages',
        };

        for (const type of typeOrder) {
            if (!grouped[type] || grouped[type].length === 0) continue;

            html += `<div class="search-group">
                <div class="search-group-header">${typeNames[type] || type}</div>
                <div class="search-group-items">`;

            for (let i = 0; i < grouped[type].length; i++) {
                const item = grouped[type][i];
                const globalIndex = results.indexOf(item);
                html += renderResultItem(item, globalIndex);
            }

            html += '</div></div>';
        }

        resultsContainer.innerHTML = html;

        // Bind click events
        resultsContainer.querySelectorAll('.search-result-item').forEach((el, index) => {
            el.addEventListener('click', () => selectItem(index));
            el.addEventListener('mouseenter', () => {
                selectedIndex = index;
                updateSelection();
            });
        });
    }

    function renderResultItem(item, index) {
        const typeIcon = getTypeIcon(item.type);
        const badge = item.isNew ? '<span class="search-badge new">NEW</span>' : '';
        const tierBadge = item.requiredTier ? `<span class="search-badge tier ${item.requiredTier}">${getTierName(item.requiredTier)}</span>` : '';
        const unlockedBadge = item.type === 'achievement' && item.unlocked ? '<span class="search-badge unlocked">✓</span>' : '';
        const priceTag = item.price !== undefined ? `<span class="search-price">${formatPrice(item)}</span>` : '';
        
        return `
            <div class="search-result-item" data-index="${index}">
                <div class="search-result-icon">${escapeHtml(item.icon || typeIcon)}</div>
                <div class="search-result-content">
                    <div class="search-result-title">${escapeHtml(item.title)}${badge}${tierBadge}${unlockedBadge}</div>
                    <div class="search-result-desc">${escapeHtml(item.desc || '')}</div>
                </div>
                ${priceTag}
            </div>
        `;
    }

    function getTypeIcon(type) {
        const icons = {
            game: '🎮',
            achievement: '🏆',
            store: '✨',
            profile: '👤',
            challenge: '🎯',
            page: '📄',
        };
        return icons[type] || '📌';
    }

    function getTierName(tier) {
        const names = {
            lite: 'Survivor',
            pro: 'Hunter',
            max: 'Elder God',
        };
        return names[tier] || tier;
    }

    function formatPrice(item) {
        if (item.price === 0) return 'FREE';
        const currency = item.currency === 'gems' ? '💎' : '👻';
        return `${currency} ${item.price}`;
    }

    function groupByType(results) {
        return results.reduce((acc, item) => {
            if (!acc[item.type]) acc[item.type] = [];
            acc[item.type].push(item);
            return acc;
        }, {});
    }

    function renderRecentSearches() {
        const recentList = modal.querySelector('.search-recent-list');
        const recentContainer = modal.querySelector('.search-recent');
        
        if (recentSearches.length === 0) {
            recentContainer.style.display = 'none';
            return;
        }

        recentList.innerHTML = recentSearches.map(q => `
            <button class="search-recent-item" data-query="${escapeHtml(q)}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>${escapeHtml(q)}</span>
            </button>
        `).join('');

        // Bind click events
        recentList.querySelectorAll('.search-recent-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.dataset.query;
                input.value = query;
                performSearch(query);
            });
        });
    }

    function navigateResults(direction) {
        if (currentResults.length === 0) return;

        selectedIndex += direction;
        
        if (selectedIndex < 0) selectedIndex = currentResults.length - 1;
        if (selectedIndex >= currentResults.length) selectedIndex = 0;

        updateSelection();
        scrollToSelected();
    }

    function updateSelection() {
        resultsContainer.querySelectorAll('.search-result-item').forEach((el, index) => {
            el.classList.toggle('selected', index === selectedIndex);
        });
    }

    function scrollToSelected() {
        const selected = resultsContainer.querySelector('.search-result-item.selected');
        if (selected) {
            selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    function selectCurrent() {
        if (selectedIndex >= 0 && selectedIndex < currentResults.length) {
            selectItem(selectedIndex);
        } else if (currentResults.length > 0) {
            selectItem(0);
        }
    }

    function selectItem(index) {
        const item = currentResults[index];
        if (!item) return;

        // Save to recent searches
        addRecentSearch(input.value);

        // Handle navigation
        if (item.url) {
            window.location.href = item.url;
        } else if (item.type === 'game' && item.id) {
            window.location.href = `/games/${item.id}/${item.id}.html`;
        } else if (item.type === 'store' && typeof ScaryStore !== 'undefined') {
            close();
            ScaryStore.openStore(item.category || 'featured');
        } else if (item.type === 'achievement') {
            window.location.href = '/achievements.html';
        }

        close();
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    function open() {
        createModal();
        loadRecentSearches();
        modal.classList.add('open');
        document.body.classList.add('search-modal-open');
        input.value = '';
        input.focus();
        isOpen = true;
        selectedIndex = -1;
        currentResults = [];
        currentTypeFilter = null;
        
        // Reset filters
        modal.querySelectorAll('.search-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === 'all');
        });
        
        // Show initial state
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        modal.querySelector('.search-recent').style.display = 'block';
        modal.querySelector('.search-empty').style.display = 'none';
        renderRecentSearches();
    }

    function close() {
        if (!modal) return;
        modal.classList.remove('open');
        document.body.classList.remove('search-modal-open');
        isOpen = false;
    }

    function toggle() {
        if (isOpen) {
            close();
        } else {
            open();
        }
    }

    function refreshIndex() {
        searchIndex = null;
        initSearchIndex();
    }

    // ═══════════════════════════════════════════════════════════════
    // SEARCH BUTTON IN NAVBAR
    // ═══════════════════════════════════════════════════════════════

    function createSearchButton() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        // Check if button already exists
        if (navLinks.querySelector('.nav-search-btn')) return;

        const searchBtn = document.createElement('button');
        searchBtn.className = 'nav-search-btn';
        searchBtn.setAttribute('aria-label', 'Search');
        searchBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
            </svg>
            <span class="nav-search-shortcut">Ctrl K</span>
        `;

        searchBtn.addEventListener('click', open);
        navLinks.appendChild(searchBtn);
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    function init() {
        loadRecentSearches();
        initSearchIndex();
        createSearchButton();
        
        // Pre-create modal for faster first open
        if (document.readyState === 'complete') {
            createModal();
        } else {
            window.addEventListener('load', createModal);
        }
    }

    // Export global API
    window.GlobalSearch = {
        open,
        close,
        toggle,
        search,
        refreshIndex,
    };

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
