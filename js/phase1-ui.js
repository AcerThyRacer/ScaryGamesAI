/**
 * Phase 1: Dynamic Store & Challenges UI Components
 * Flash sales, smart bundles, dynamic challenges
 */

const Phase1UI = (function() {
  'use strict';

  /**
   * Flash Sale Widget Component
   */
  class FlashSaleWidget {
    constructor(config) {
      this.container = typeof config.container === 'string'
        ? document.querySelector(config.container)
        : config.container;
      this.userId = config.userId;
      this.saleData = null;
      this.timerInterval = null;
      this._init();
    }

    async _init() {
      this._render();
      await this.loadFlashSale();
    }

    async loadFlashSale() {
      try {
        const response = await fetch('/api/v1/inventory/flash-sale', {
          headers: {
            'X-User-ID': this.userId || localStorage.getItem('sgai_user_id') || 'anonymous'
          }
        });

        const data = await response.json();
        if (data.success) {
          this.saleData = data.sale;
          this._renderSale();
          this._startTimer();
        }
      } catch (error) {
        console.error('Failed to load flash sale:', error);
      }
    }

    _render() {
      this.container.innerHTML = `
        <div class="flash-sale-widget" id="flash-sale-widget">
          <div class="flash-sale-header">
            <h3>⚡ Flash Sale</h3>
            <span class="flash-sale-badge">Limited Time</span>
          </div>
          <div class="flash-sale-content">
            <div class="flash-sale-loading">Loading...</div>
          </div>
        </div>
      `;
    }

    _renderSale() {
      const content = this.container.querySelector('.flash-sale-content');
      const theme = this.saleData.theme || 'normal';

      content.innerHTML = `
        <div class="flash-sale-timer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span id="flash-sale-countdown">--:--:--</span>
        </div>
        <div class="flash-sale-type">${this._formatSaleType(this.saleData.type)}</div>
        <div class="flash-sale-items">
          ${this.saleData.items.slice(0, 4).map(item => `
            <div class="flash-sale-item" data-item-key="${item.item_key}">
              <div class="flash-sale-item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-prices">
                  <span class="original-price">${item.originalPrice}</span>
                  <span class="sale-price">${item.salePrice}</span>
                </div>
                <div class="discount-badge">-${item.discountPercent}%</div>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="view-all-flash-btn">View All Deals</button>
      `;

      // Bind view all button
      this.container.querySelector('.view-all-flash-btn').addEventListener('click', () => {
        this._openFullStore();
      });
    }

    _startTimer() {
      if (this.timerInterval) clearInterval(this.timerInterval);

      const updateTimer = () => {
        const remaining = Math.max(0, this.saleData.timeRemaining - (Date.now() - this.saleData.startTime));
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        const countdownEl = this.container.querySelector('#flash-sale-countdown');
        if (countdownEl) {
          countdownEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        if (remaining <= 0) {
          clearInterval(this.timerInterval);
          this.loadFlashSale(); // Refresh sale
        }
      };

      updateTimer();
      this.timerInterval = setInterval(updateTimer, 1000);
    }

    _formatSaleType(type) {
      const types = {
        'mystery_box': '🎁 Mystery Box Sale',
        'category_discount': 'Category Discount',
        'bundle_deal': '📦 Bundle Deal',
        'rarity_flash': '✨ Rare Items Flash'
      };
      return types[type] || 'Flash Sale';
    }

    _openFullStore() {
      // Navigate to store page or open modal
      if (window.openStore) {
        window.openStore();
      } else {
        window.location.href = '/#store';
      }
    }

    destroy() {
      if (this.timerInterval) clearInterval(this.timerInterval);
    }
  }

  /**
   * Smart Bundles Carousel Component
   */
  class SmartBundlesCarousel {
    constructor(config) {
      this.container = typeof config.container === 'string'
        ? document.querySelector(config.container)
        : config.container;
      this.userId = config.userId;
      this.bundles = [];
      this._init();
    }

    async _init() {
      this._render();
      await this.loadBundles();
    }

    async loadBundles() {
      try {
        const [recommendedRes, completeSetRes] = await Promise.all([
          fetch('/api/v1/bundles/recommended', {
            headers: { 'X-User-ID': this.userId || localStorage.getItem('sgai_user_id') }
          }),
          fetch('/api/v1/bundles/complete-set', {
            headers: { 'X-User-ID': this.userId || localStorage.getItem('sgai_user_id') }
          })
        ]);

        const recommended = await recommendedRes.json();
        const completeSet = await completeSetRes.json();

        this.bundles = [
          ...(recommended.bundles || []),
          ...(completeSet.bundles || [])
        ].slice(0, 6);

        this._renderBundles();
      } catch (error) {
        console.error('Failed to load bundles:', error);
      }
    }

    _render() {
      this.container.innerHTML = `
        <div class="smart-bundles-carousel">
          <div class="bundles-header">
            <h3>🎁 Smart Bundles</h3>
            <span class="bundles-subtitle">AI-curated just for you</span>
          </div>
          <div class="bundles-track" id="bundles-track">
            <div class="bundles-loading">Loading bundles...</div>
          </div>
        </div>
      `;
    }

    _renderBundles() {
      const track = this.container.querySelector('#bundles-track');

      if (this.bundles.length === 0) {
        track.innerHTML = '<p class="no-bundles">Play more games to unlock personalized bundles!</p>';
        return;
      }

      track.innerHTML = this.bundles.map((bundle, idx) => `
        <div class="bundle-card" style="--i: ${idx}">
          <div class="bundle-header">
            <h4>${bundle.name}</h4>
            ${bundle.completionBonus ? '<span class="completion-bonus">Complete Set!</span>' : ''}
          </div>
          <div class="bundle-items-preview">
            ${bundle.items.slice(0, 3).map(item => `
              <div class="bundle-item" title="${item.name}">
                <span class="item-icon">${item.metadata?.icon || '🎮'}</span>
              </div>
            `).join('')}
            ${bundle.items.length > 3 ? `<div class="more-items">+${bundle.items.length - 3}</div>` : ''}
          </div>
          <div class="bundle-pricing">
            <span class="original-price">${bundle.totalOriginalPrice}</span>
            <span class="bundle-price">${bundle.finalPrice}</span>
            <span class="discount-badge">-${bundle.discountPercent}%</span>
          </div>
          ${bundle.reasons?.length > 0 ? `
            <div class="bundle-reasons">
              ${bundle.reasons.map(r => `<span class="reason-tag">${r}</span>`).join('')}
            </div>
          ` : ''}
          <button class="purchase-bundle-btn" data-bundle-idx="${idx}">
            Purchase - ${bundle.finalPrice}
          </button>
        </div>
      `).join('');

      // Bind purchase buttons
      this.container.querySelectorAll('.purchase-bundle-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const idx = parseInt(e.target.dataset.bundleIdx);
          await this._purchaseBundle(this.bundles[idx]);
        });
      });
    }

    async _purchaseBundle(bundle) {
      const itemKeys = bundle.items.map(i => i.item_key);

      try {
        const response = await fetch('/api/v1/bundles/purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': this.userId || localStorage.getItem('sgai_user_id')
          },
          body: JSON.stringify({ itemKeys })
        });

        const result = await response.json();
        if (result.success) {
          alert(`Bundle purchased! ${result.message}`);
          this.loadBundles(); // Refresh
        } else {
          alert(`Purchase failed: ${result.error}`);
        }
      } catch (error) {
        console.error('Bundle purchase error:', error);
        alert('Failed to purchase bundle');
      }
    }
  }

  /**
   * Dynamic Challenges Panel Component
   */
  class DynamicChallengesPanel {
    constructor(config) {
      this.container = typeof config.container === 'string'
        ? document.querySelector(config.container)
        : config.container;
      this.userId = config.userId;
      this.challenges = {
        daily: [],
        hotStreak: [],
        crossGame: []
      };
      this._init();
    }

    async _init() {
      this._render();
      await this.loadChallenges();
    }

    async loadChallenges() {
      try {
        const [dailyRes, hotStreakRes, crossGameRes] = await Promise.all([
          fetch('/api/v1/challenges/daily', {
            headers: { 'X-User-ID': this.userId || localStorage.getItem('sgai_user_id') }
          }),
          fetch('/api/v1/challenges/hot-streak', {
            headers: { 'X-User-ID': this.userId || localStorage.getItem('sgai_user_id') }
          }),
          fetch('/api/v1/challenges/cross-game', {
            headers: { 'X-User-ID': this.userId || localStorage.getItem('sgai_user_id') }
          })
        ]);

        const daily = await dailyRes.json();
        const hotStreak = await hotStreakRes.json();
        const crossGame = await crossGameRes.json();

        this.challenges = {
          daily: daily.challenges || [],
          hotStreak: hotStreak.challenges || [],
          crossGame: crossGame.challenges || []
        };

        this._renderChallenges();
      } catch (error) {
        console.error('Failed to load dynamic challenges:', error);
      }
    }

    _render() {
      this.container.innerHTML = `
        <div class="dynamic-challenges-panel">
          <div class="challenges-tabs">
            <button class="tab-btn active" data-tab="daily">Daily</button>
            <button class="tab-btn" data-tab="hot-streak">🔥 Hot Streak</button>
            <button class="tab-btn" data-tab="cross-game">Cross-Game</button>
          </div>
          <div class="challenges-content" id="challenges-content">
            <!-- Content rendered dynamically -->
          </div>
        </div>
      `;

      // Bind tab switching
      this.container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          this._renderTabContent(e.target.dataset.tab);
        });
      });
    }

    _renderChallenges() {
      this._renderTabContent('daily');
    }

    _renderTabContent(tab) {
      const content = this.container.querySelector('#challenges-content');

      switch (tab) {
        case 'daily':
          content.innerHTML = this._renderDailyChallenges();
          break;
        case 'hot-streak':
          content.innerHTML = this._renderHotStreakChallenges();
          break;
        case 'cross-game':
          content.innerHTML = this._renderCrossGameChallenges();
          break;
      }
    }

    _renderDailyChallenges() {
      if (this.challenges.daily.length === 0) {
        return '<p class="no-challenges">Play games to unlock personalized daily challenges!</p>';
      }

      return `
        <div class="challenges-section">
          <div class="section-header">
            <h4>📅 Daily Challenges</h4>
            <span class="skill-match">Skill-matched for you</span>
          </div>
          <div class="challenges-list">
            ${this.challenges.daily.map(challenge => `
              <div class="challenge-card ${challenge.generated ? 'generated' : ''}">
                <div class="challenge-header">
                  <span class="difficulty ${challenge.difficulty}">${challenge.difficulty}</span>
                  ${challenge.dailyBonus ? '<span class="bonus-badge">Daily Bonus</span>' : ''}
                </div>
                <h5>${challenge.title}</h5>
                <p>${challenge.desc}</p>
                <div class="challenge-footer">
                  <span class="reward">🏆 ${challenge.reward} CP</span>
                  <span class="game-tag">${challenge.gameId}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    _renderHotStreakChallenges() {
      if (this.challenges.hotStreak.length === 0) {
        return `
          <div class="hot-streak-locked">
            <div class="lock-icon">🔒</div>
            <h4>Hot Streak Locked</h4>
            <p>Complete challenges on consecutive days to unlock bonus rewards!</p>
          </div>
        `;
      }

      return `
        <div class="challenges-section hot-streak-section">
          <div class="section-header">
            <h4>🔥 Hot Streak Challenges</h4>
            <span class="streak-bonus">Bonus Multiplier Active!</span>
          </div>
          <div class="challenges-list">
            ${this.challenges.hotStreak.map(challenge => `
              <div class="challenge-card hot-streak">
                <div class="challenge-header">
                  <span class="difficulty ${challenge.difficulty}">${challenge.difficulty}</span>
                  <span class="multiplier-badge">${challenge.multiplier.toFixed(1)}x CP</span>
                </div>
                <h5>${challenge.title}</h5>
                <p>${challenge.desc}</p>
                <div class="challenge-footer">
                  <span class="reward">🏆 ${challenge.reward} CP</span>
                  <span class="game-tag">${challenge.gameId}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    _renderCrossGameChallenges() {
      if (this.challenges.crossGame.length === 0) {
        return `
          <div class="cross-game-locked">
            <div class="lock-icon">🎮</div>
            <h4>Play More Games!</h4>
            <p>Try at least 3 different games to unlock cross-game challenges</p>
          </div>
        `;
      }

      return `
        <div class="challenges-section cross-game-section">
          <div class="section-header">
            <h4>🎮 Cross-Game Challenges</h4>
            <span class="meta-badge">Meta Challenge</span>
          </div>
          <div class="challenges-list">
            ${this.challenges.crossGame.map(challenge => `
              <div class="challenge-card meta-challenge">
                <div class="challenge-header">
                  <span class="difficulty ${challenge.difficulty}">${challenge.difficulty}</span>
                  ${challenge.meta ? '<span class="meta-tag">Meta</span>' : ''}
                </div>
                <h5>${challenge.title}</h5>
                <p>${challenge.desc}</p>
                ${challenge.games ? `
                  <div class="games-involved">
                    ${challenge.games.map(g => `<span class="game-pill">${g}</span>`).join('')}
                  </div>
                ` : ''}
                <div class="challenge-footer">
                  <span class="reward">🏆 ${challenge.reward} CP</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  /**
   * Initialize all Phase 1 components
   */
  function initAll(config = {}) {
    const components = {
      flashSale: null,
      bundles: null,
      challenges: null
    };

    // Initialize Flash Sale Widget
    const flashSaleContainer = document.querySelector('[data-flash-sale]');
    if (flashSaleContainer) {
      components.flashSale = new FlashSaleWidget({
        container: flashSaleContainer,
        userId: config.userId
      });
    }

    // Initialize Smart Bundles Carousel
    const bundlesContainer = document.querySelector('[data-smart-bundles]');
    if (bundlesContainer) {
      components.bundles = new SmartBundlesCarousel({
        container: bundlesContainer,
        userId: config.userId
      });
    }

    // Initialize Dynamic Challenges Panel
    const challengesContainer = document.querySelector('[data-dynamic-challenges]');
    if (challengesContainer) {
      components.challenges = new DynamicChallengesPanel({
        container: challengesContainer,
        userId: config.userId
      });
    }

    return components;
  }

  // Public API
  return {
    FlashSaleWidget,
    SmartBundlesCarousel,
    DynamicChallengesPanel,
    initAll,
    VERSION: '1.0.0'
  };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Phase1UI;
} else if (typeof window !== 'undefined') {
  window.Phase1UI = Phase1UI;
}
