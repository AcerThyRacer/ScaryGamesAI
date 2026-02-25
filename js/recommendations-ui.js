/**
 * Recommendations UI Components
 * 
 * Provides UI components for displaying personalized game recommendations,
 * similar games, and recommendation feedback.
 * 
 * @module recommendations-ui
 */

const RecommendationsUI = (function() {
    'use strict';

    /**
     * Recommendation Carousel Component
     */
    class RecommendationCarousel {
        /**
         * Create recommendation carousel
         * @param {Object} config - Configuration
         */
        constructor(config) {
            this.container = typeof config.container === 'string'
                ? document.querySelector(config.container)
                : config.container;
            this.title = config.title || 'Recommended For You';
            this.limit = config.limit || 10;
            this.userId = config.userId;
            this.games = [];
            this.loading = false;
            this._init();
        }

        /**
         * Initialize component
         */
        async _init() {
            this._render();
            await this.loadRecommendations();
        }

        /**
         * Load recommendations from API
         */
        async loadRecommendations() {
            if (this.loading) return;

            this.loading = true;
            this._showLoading();

            try {
                const response = await fetch(`/api/v1/recommendations?limit=${this.limit}`, {
                    headers: {
                        'X-User-ID': this.userId || this._getUserId()
                    }
                });

                const data = await response.json();
                if (data.success) {
                    this.games = data.recommendations;
                    this._renderGames();
                }
            } catch (error) {
                console.error('Failed to load recommendations:', error);
                this._showError();
            } finally {
                this.loading = false;
            }
        }

        /**
         * Render component
         */
        _render() {
            this.container.innerHTML = `
                <div class="recommendation-carousel">
                    <div class="rec-carousel-header">
                        <h2 class="rec-carousel-title">${this.title}</h2>
                        <button class="rec-refresh-btn" aria-label="Refresh recommendations">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M23 4v6h-6M1 20v-6h6"/>
                                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                            </svg>
                        </button>
                    </div>
                    <div class="rec-carousel-content">
                        <div class="rec-carousel-track" id="rec-track">
                            <div class="rec-loading">
                                <div class="rec-spinner"></div>
                                <p>Loading recommendations...</p>
                            </div>
                        </div>
                    </div>
                    <div class="rec-carousel-nav">
                        <button class="rec-nav-btn rec-nav-prev" aria-label="Previous">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                        </button>
                        <button class="rec-nav-btn rec-nav-next" aria-label="Next">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;

            // Bind events
            this.container.querySelector('.rec-refresh-btn').addEventListener('click', () => {
                this.loadRecommendations();
            });

            this.container.querySelector('.rec-nav-prev').addEventListener('click', () => {
                this._scroll(-1);
            });

            this.container.querySelector('.rec-nav-next').addEventListener('click', () => {
                this._scroll(1);
            });
        }

        /**
         * Render games
         */
        _renderGames() {
            const track = this.container.querySelector('#rec-track');
            if (!this.games || this.games.length === 0) {
                track.innerHTML = '<p class="rec-empty">No recommendations available yet. Play more games to get personalized suggestions!</p>';
                return;
            }

            track.innerHTML = this.games.map(game => `
                <div class="rec-game-card" data-game-id="${game.gameId}" data-source="${game.source || 'unknown'}">
                    <div class="rec-game-image">
                        <img src="/assets/games/${game.gameId}/thumb.jpg" alt="${game.name || game.gameId}" 
                             onerror="this.src='/assets/og-game-fallback.svg'">
                        ${game.source ? `<span class="rec-source-badge">${game.source}</span>` : ''}
                    </div>
                    <div class="rec-game-info">
                        <h3 class="rec-game-name">${game.name || game.gameId}</h3>
                        <div class="rec-game-meta">
                            ${game.confidence ? `
                                <span class="rec-confidence" title="Match confidence">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                                    </svg>
                                    ${Math.round((game.confidence || 0) * 100)}%
                                </span>
                            ` : ''}
                            ${game.score ? `
                                <span class="rec-score">Score: ${game.score.toFixed(1)}</span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="rec-game-actions">
                        <button class="rec-play-btn" onclick="window.location.href='/games/${game.gameId}'">
                            Play Now
                        </button>
                        <button class="rec-feedback-btn" data-action="like" aria-label="Like">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                            </svg>
                        </button>
                        <button class="rec-feedback-btn" data-action="dislike" aria-label="Dislike">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');

            // Bind feedback buttons
            this.container.querySelectorAll('.rec-feedback-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const card = e.target.closest('.rec-game-card');
                    const gameId = card.dataset.gameId;
                    const action = btn.dataset.action;
                    this._submitFeedback(gameId, action);
                });
            });
        }

        /**
         * Submit feedback
         */
        async _submitFeedback(gameId, action) {
            try {
                await fetch('/api/v1/recommendations/feedback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': this.userId || this._getUserId()
                    },
                    body: JSON.stringify({
                        gameId,
                        feedbackType: action
                    })
                });

                // Visual feedback
                const card = this.container.querySelector(`[data-game-id="${gameId}"]`);
                if (card) {
                    card.classList.add(`feedback-${action}`);
                }
            } catch (error) {
                console.error('Failed to submit feedback:', error);
            }
        }

        /**
         * Scroll carousel
         */
        _scroll(direction) {
            const track = this.container.querySelector('#rec-track');
            const scrollAmount = 300;
            track.scrollBy({
                left: direction * scrollAmount,
                behavior: 'smooth'
            });
        }

        /**
         * Show loading state
         */
        _showLoading() {
            const track = this.container.querySelector('#rec-track');
            if (track) {
                track.innerHTML = `
                    <div class="rec-loading">
                        <div class="rec-spinner"></div>
                        <p>Loading recommendations...</p>
                    </div>
                `;
            }
        }

        /**
         * Show error state
         */
        _showError() {
            const track = this.container.querySelector('#rec-track');
            if (track) {
                track.innerHTML = `
                    <div class="rec-error">
                        <p>Failed to load recommendations</p>
                        <button onclick="this.closest('.recommendations-ui').loadRecommendations()">
                            Try Again
                        </button>
                    </div>
                `;
            }
        }

        /**
         * Get user ID
         */
        _getUserId() {
            return localStorage.getItem('sgai_user_id') || 'anonymous';
        }
    }

    /**
     * Similar Games Panel Component
     */
    class SimilarGamesPanel {
        /**
         * Create similar games panel
         * @param {Object} config - Configuration
         */
        constructor(config) {
            this.container = typeof config.container === 'string'
                ? document.querySelector(config.container)
                : config.container;
            this.gameId = config.gameId;
            this.title = config.title || 'Because You Played';
            this.limit = config.limit || 5;
            this._init();
        }

        /**
         * Initialize component
         */
        async _init() {
            this._render();
            await this.loadSimilarGames();
        }

        /**
         * Load similar games from API
         */
        async loadSimilarGames() {
            try {
                const response = await fetch(`/api/v1/recommendations/game/${this.gameId}/similar?limit=${this.limit}`);
                const data = await response.json();

                if (data.success && data.similar.length > 0) {
                    this._renderGames(data.similar);
                } else {
                    this.container.style.display = 'none';
                }
            } catch (error) {
                console.error('Failed to load similar games:', error);
            }
        }

        /**
         * Render component
         */
        _render() {
            this.container.innerHTML = `
                <div class="similar-games-panel">
                    <h3 class="similar-panel-title">${this.title}</h3>
                    <div class="similar-games-list" id="similar-list"></div>
                </div>
            `;
        }

        /**
         * Render games list
         */
        _renderGames(games) {
            const list = this.container.querySelector('#similar-list');
            list.innerHTML = games.map((game, index) => `
                <div class="similar-game-item" style="--i: ${index}">
                    <span class="similar-rank">${index + 1}</span>
                    <div class="similar-game-info">
                        <h4 class="similar-game-name">${game.name || game.gameId}</h4>
                        <span class="similar-match">
                            ${Math.round((game.similarity || 0) * 100)}% match
                        </span>
                    </div>
                    <a href="/games/${game.gameId}" class="similar-play-btn">Play</a>
                </div>
            `).join('');
        }
    }

    /**
     * Daily Pick Component
     */
    class DailyPick {
        /**
         * Create daily pick component
         * @param {Object} config - Configuration
         */
        constructor(config) {
            this.container = typeof config.container === 'string'
                ? document.querySelector(config.container)
                : config.container;
            this.userId = config.userId;
            this._init();
        }

        /**
         * Initialize component
         */
        async _init() {
            this._render();
            await this.loadDailyPick();
        }

        /**
         * Load daily pick from API
         */
        async loadDailyPick() {
            try {
                const response = await fetch('/api/v1/recommendations?limit=1&context={"daily":true}', {
                    headers: {
                        'X-User-ID': this.userId || this._getUserId()
                    }
                });

                const data = await response.json();
                if (data.success && data.recommendations.length > 0) {
                    this._renderPick(data.recommendations[0]);
                }
            } catch (error) {
                console.error('Failed to load daily pick:', error);
            }
        }

        /**
         * Render component
         */
        _render() {
            this.container.innerHTML = `
                <div class="daily-pick">
                    <div class="daily-pick-header">
                        <span class="daily-badge">Daily Pick</span>
                        <span class="daily-date">${new Date().toLocaleDateString()}</span>
                    </div>
                    <div class="daily-pick-content" id="daily-content">
                        <div class="daily-loading">Loading your pick...</div>
                    </div>
                </div>
            `;
        }

        /**
         * Render daily pick
         */
        _renderPick(game) {
            const content = this.container.querySelector('#daily-content');
            content.innerHTML = `
                <div class="daily-game">
                    <div class="daily-game-image">
                        <img src="/assets/games/${game.gameId}/hero.jpg" alt="${game.name || game.gameId}"
                             onerror="this.src='/assets/og-game-fallback.svg'">
                    </div>
                    <div class="daily-game-info">
                        <h2 class="daily-game-name">${game.name || game.gameId}</h2>
                        <p class="daily-game-desc">Handpicked based on your play style</p>
                        <a href="/games/${game.gameId}" class="daily-play-btn">Play Now</a>
                    </div>
                </div>
            `;
        }

        /**
         * Get user ID
         */
        _getUserId() {
            return localStorage.getItem('sgai_user_id') || 'anonymous';
        }
    }

    /**
     * Initialize all recommendation components on page
     */
    function initAll(config = {}) {
        const components = {
            carousels: [],
            similarPanels: [],
            dailyPicks: []
        };

        // Initialize carousels
        document.querySelectorAll('[data-recommendations-carousel]').forEach(el => {
            const carousel = new RecommendationCarousel({
                container: el,
                title: el.dataset.recommendationsTitle || 'Recommended For You',
                limit: parseInt(el.dataset.recommendationsLimit) || 10,
                userId: config.userId
            });
            components.carousels.push(carousel);
        });

        // Initialize similar panels
        document.querySelectorAll('[data-similar-games]').forEach(el => {
            const panel = new SimilarGamesPanel({
                container: el,
                gameId: el.dataset.similarGames,
                title: el.dataset.similarTitle || 'Because You Played',
                limit: parseInt(el.dataset.similarLimit) || 5
            });
            components.similarPanels.push(panel);
        });

        // Initialize daily picks
        document.querySelectorAll('[data-daily-pick]').forEach(el => {
            const pick = new DailyPick({
                container: el,
                userId: config.userId
            });
            components.dailyPicks.push(pick);
        });

        return components;
    }

    // Public API
    return {
        RecommendationCarousel,
        SimilarGamesPanel,
        DailyPick,
        initAll,
        VERSION: '1.0.0'
    };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecommendationsUI;
} else if (typeof window !== 'undefined') {
    window.RecommendationsUI = RecommendationsUI;
}
