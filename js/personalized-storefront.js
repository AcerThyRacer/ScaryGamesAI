/**
 * Personalized Storefront Dynamic Layout Engine
 * Phase 5: AI-Powered Personalization
 * 
 * Real-time homepage personalization based on user preferences and behavior
 * Dynamically rearranges UI components for maximum engagement
 * 
 * @module js/personalized-storefront
 */

const PersonalizedStorefront = (function() {
  'use strict';
  
  // Configuration
  const config = {
    apiBase: '/api/v1',
    cacheExpiry: 300000, // 5 minutes
    maxSections: 8,
    minSections: 3,
    animationDuration: 300
  };
  
  // State
  let userProfile = null;
  let layoutConfig = null;
  let sections = [];
  let isPersonalizing = false;
  
  // Section templates
  const sectionTemplates = {
    hero: {
      type: 'hero',
      title: 'Featured',
      component: 'HeroCarousel',
      priority: 10,
      size: 'large'
    },
    forYou: {
      type: 'forYou',
      title: 'Recommended For You',
      component: 'RecommendationGrid',
      priority: 9,
      size: 'medium',
      requiresML: true
    },
    trending: {
      type: 'trending',
      title: 'Trending Now',
      component: 'TrendingCarousel',
      priority: 8,
      size: 'medium'
    },
    newReleases: {
      type: 'newReleases',
      title: 'New Releases',
      component: 'GameGrid',
      priority: 7,
      size: 'medium'
    },
    continuePlaying: {
      type: 'continuePlaying',
      title: 'Continue Playing',
      component: 'ContinuePlayingGrid',
      priority: 9,
      size: 'small'
    },
    similarToPlayed: {
      type: 'similarToPlayed',
      title: 'Because You Played',
      component: 'SimilarGamesCarousel',
      priority: 8,
      size: 'medium',
      requiresML: true
    },
    bundleDeals: {
      type: 'bundleDeals',
      title: 'Complete Your Look',
      component: 'BundleGrid',
      priority: 6,
      size: 'small',
      requiresML: true
    },
    social: {
      type: 'social',
      title: 'Friends Are Playing',
      component: 'SocialFeed',
      priority: 5,
      size: 'small'
    },
    challenges: {
      type: 'challenges',
      title: 'Your Challenges',
      component: 'ChallengeList',
      priority: 7,
      size: 'small'
    },
    seasonal: {
      type: 'seasonal',
      title: 'Seasonal Event',
      component: 'SeasonalBanner',
      priority: 8,
      size: 'medium'
    }
  };
  
  /**
   * Initialize personalized storefront
   */
  async function init() {
    console.log('[Storefront] Initializing...');
    
    // Load user profile
    await loadUserProfile();
    
    // Generate personalized layout
    await generateLayout();
    
    // Render sections
    renderLayout();
    
    // Setup real-time updates
    setupRealTimeUpdates();
    
    console.log('[Storefront] Initialized');
    return true;
  }
  
  /**
   * Load user profile and preferences
   */
  async function loadUserProfile() {
    try {
      // Try to fetch from API
      const response = await fetch(`${config.apiBase}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${getUserToken()}`
        }
      });
      
      if (response.ok) {
        userProfile = await response.json();
      } else {
        // Fallback to cached profile
        userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      }
      
      // Extract preferences
      userProfile.preferences = userProfile.preferences || {};
      userProfile.playHistory = userProfile.playHistory || [];
      userProfile.segments = userProfile.segments || [];
      
    } catch (error) {
      console.warn('[Storefront] Failed to load profile:', error);
      userProfile = getDefaultProfile();
    }
  }
  
  /**
   * Get default profile for new users
   */
  function getDefaultProfile() {
    return {
      userId: 'anonymous',
      isNewUser: true,
      preferences: {
        genres: [],
        difficulty: 5
      },
      playHistory: [],
      segments: ['new']
    };
  }
  
  /**
   * Generate personalized layout
   */
  async function generateLayout() {
    isPersonalizing = true;
    
    // Determine which sections to show
    const availableSections = determineAvailableSections();
    
    // Calculate section priorities based on user profile
    const prioritizedSections = calculateSectionPriorities(availableSections);
    
    // Select top sections
    sections = prioritizedSections.slice(0, config.maxSections);
    
    // Generate layout configuration
    layoutConfig = generateLayoutConfig(sections);
    
    isPersonalizing = false;
    
    console.log('[Storefront] Layout generated with', sections.length, 'sections');
    return layoutConfig;
  }
  
  /**
   * Determine available sections based on user state
   */
  function determineAvailableSections() {
    const available = [];
    
    // Hero section always available
    available.push(sectionTemplates.hero);
    
    // For You section (requires some play history)
    if (userProfile.playHistory.length > 0 || userProfile.segments.includes('returning')) {
      available.push(sectionTemplates.forYou);
    }
    
    // Continue Playing (if has in-progress games)
    const inProgressGames = userProfile.playHistory.filter(g => g.inProgress);
    if (inProgressGames.length > 0) {
      available.push(sectionTemplates.continuePlaying);
    }
    
    // Similar to Played (requires play history)
    if (userProfile.playHistory.length >= 2) {
      available.push(sectionTemplates.similarToPlayed);
    }
    
    // Trending always available
    available.push(sectionTemplates.trending);
    
    // New Releases always available
    available.push(sectionTemplates.newReleases);
    
    // Bundle Deals (if has purchases)
    if (userProfile.purchases?.length > 0) {
      available.push(sectionTemplates.bundleDeals);
    }
    
    // Social (if has friends)
    if (userProfile.friends?.length > 0) {
      available.push(sectionTemplates.social);
    }
    
    // Challenges always available
    available.push(sectionTemplates.challenges);
    
    // Seasonal (if active event)
    if (userProfile.activeEvents?.length > 0) {
      available.push(sectionTemplates.seasonal);
    }
    
    return available;
  }
  
  /**
   * Calculate section priorities based on user profile
   */
  function calculateSectionPriorities(sections) {
    return sections.map(section => {
      let priority = section.priority;
      
      // Boost priority based on user segments
      if (userProfile.segments.includes('social')) {
        if (section.type === 'social') priority += 3;
      }
      
      if (userProfile.segments.includes('collector')) {
        if (section.type === 'bundleDeals' || section.type === 'newReleases') priority += 2;
      }
      
      if (userProfile.segments.includes('competitive')) {
        if (section.type === 'challenges' || section.type === 'trending') priority += 2;
      }
      
      // Boost based on play history
      if (section.requiresML && userProfile.mlEnabled) {
        priority += 2;
      }
      
      // Time-based boosts
      const hour = new Date().getHours();
      if (hour >= 18 || hour <= 2) { // Evening/night
        if (section.type === 'continuePlaying') priority += 1;
      }
      
      // Weekend boost
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        if (section.type === 'social' || section.type === 'challenges') priority += 1;
      }
      
      return { ...section, calculatedPriority: priority };
    }).sort((a, b) => b.calculatedPriority - a.calculatedPriority);
  }
  
  /**
   * Generate layout configuration
   */
  function generateLayoutConfig(sections) {
    const config = {
      layout: 'responsive-grid',
      sections: [],
      theme: userProfile.preferences.theme || 'dark'
    };
    
    // First section is always full-width hero
    if (sections[0]) {
      config.sections.push({
        ...sections[0],
        layout: 'full-width',
        order: 1
      });
    }
    
    // Remaining sections in grid
    const remainingSections = sections.slice(1);
    const columns = determineGridColumnCount();
    
    for (let i = 0; i < remainingSections.length; i++) {
      const section = remainingSections[i];
      const span = determineSectionSpan(section);
      
      config.sections.push({
        ...section,
        layout: 'grid',
        gridColumn: `span ${span}`,
        order: i + 2
      });
    }
    
    return config;
  }
  
  /**
   * Determine grid column count based on screen size
   */
  function determineGridColumnCount() {
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }
  
  /**
   * Determine section span based on size and content
   */
  function determineSectionSpan(section) {
    if (section.size === 'large') return 2;
    if (section.size === 'medium') return 1;
    if (section.size === 'small') return 1;
    return 1;
  }
  
  /**
   * Render layout to DOM
   */
  function renderLayout() {
    const container = document.getElementById('storefront-container');
    if (!container) {
      console.warn('[Storefront] Container not found');
      return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Add layout class
    container.className = `storefront-layout ${layoutConfig.layout}`;
    container.setAttribute('data-theme', layoutConfig.theme);
    
    // Render sections
    layoutConfig.sections.forEach(section => {
      const sectionElement = createSectionElement(section);
      container.appendChild(sectionElement);
    });
    
    // Trigger animations
    triggerEntranceAnimations();
  }
  
  /**
   * Create section DOM element
   */
  function createSectionElement(section) {
    const element = document.createElement('section');
    element.className = `storefront-section section-${section.type}`;
    element.setAttribute('data-section-type', section.type);
    element.style.gridColumn = section.gridColumn || 'auto';
    
    // Section header
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
      <h2 class="section-title">${section.title}</h2>
      ${section.component === 'RecommendationGrid' ? 
        '<span class="ml-badge">AI Powered</span>' : ''}
    `;
    
    element.appendChild(header);
    
    // Section content
    const content = document.createElement('div');
    content.className = 'section-content';
    content.id = `section-${section.type}-content`;
    
    // Load section content
    loadSectionContent(section, content);
    
    element.appendChild(content);
    
    return element;
  }
  
  /**
   * Load section content via API
   */
  async function loadSectionContent(section, container) {
    try {
      container.innerHTML = '<div class="loading-spinner"></div>';
      
      let endpoint;
      switch (section.type) {
        case 'forYou':
          endpoint = `${config.apiBase}/recommendations?userId=${userProfile.userId}&limit=8`;
          break;
        case 'trending':
          endpoint = `${config.apiBase}/games/trending?limit=8`;
          break;
        case 'similarToPlayed':
          const lastPlayed = userProfile.playHistory[0]?.gameId;
          endpoint = `${config.apiBase}/games/${lastPlayed}/similar?limit=8`;
          break;
        case 'continuePlaying':
          endpoint = `${config.apiBase}/user/in-progress?limit=6`;
          break;
        case 'bundleDeals':
          endpoint = `${config.apiBase}/bundles/personalized?userId=${userProfile.userId}`;
          break;
        case 'challenges':
          endpoint = `${config.apiBase}/challenges/active?userId=${userProfile.userId}`;
          break;
        default:
          endpoint = `${config.apiBase}/games/featured?limit=8`;
      }
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to load content');
      
      const data = await response.json();
      
      // Render content using appropriate component
      renderSectionContent(section.component, data, container);
      
    } catch (error) {
      console.error(`[Storefront] Failed to load ${section.type}:`, error);
      container.innerHTML = '<div class="section-error">Failed to load content</div>';
    }
  }
  
  /**
   * Render section content using component
   */
  function renderSectionContent(componentType, data, container) {
    container.innerHTML = '';
    
    switch (componentType) {
      case 'RecommendationGrid':
      case 'GameGrid':
        renderGrid(container, data.games || data.recommendations || []);
        break;
      case 'HeroCarousel':
      case 'TrendingCarousel':
      case 'SimilarGamesCarousel':
        renderCarousel(container, data.games || []);
        break;
      case 'ContinuePlayingGrid':
        renderContinuePlaying(container, data.games || []);
        break;
      case 'BundleGrid':
        renderBundles(container, data.bundles || []);
        break;
      case 'ChallengeList':
        renderChallenges(container, data.challenges || []);
        break;
      case 'SocialFeed':
        renderSocialFeed(container, data.activities || []);
        break;
      case 'SeasonalBanner':
        renderSeasonalBanner(container, data.events || []);
        break;
    }
  }
  
  /**
   * Render grid layout
   */
  function renderGrid(container, items) {
    const grid = document.createElement('div');
    grid.className = 'item-grid';
    
    items.forEach(item => {
      const card = createGameCard(item);
      grid.appendChild(card);
    });
    
    container.appendChild(grid);
  }
  
  /**
   * Render carousel layout
   */
  function renderCarousel(container, items) {
    const carousel = document.createElement('div');
    carousel.className = 'carousel';
    
    const track = document.createElement('div');
    track.className = 'carousel-track';
    
    items.forEach(item => {
      const card = createGameCard(item, { large: true });
      track.appendChild(card);
    });
    
    carousel.appendChild(track);
    
    // Add navigation
    const prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-nav prev';
    prevBtn.innerHTML = '‹';
    prevBtn.onclick = () => scrollCarousel(carousel, -1);
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-nav next';
    nextBtn.innerHTML = '›';
    nextBtn.onclick = () => scrollCarousel(carousel, 1);
    
    carousel.appendChild(prevBtn);
    carousel.appendChild(nextBtn);
    
    container.appendChild(carousel);
  }
  
  /**
   * Create game card element
   */
  function createGameCard(game, options = {}) {
    const card = document.createElement('div');
    card.className = `game-card ${options.large ? 'card-large' : ''}`;
    card.setAttribute('data-game-id', game.id);
    
    card.innerHTML = `
      <div class="card-image" style="background-image: url('${game.imageUrl || '/images/placeholder.jpg'}')">
        ${game.discount ? `<span class="discount-badge">-${game.discount}%</span>` : ''}
        ${game.isNew ? `<span class="new-badge">NEW</span>` : ''}
      </div>
      <div class="card-info">
        <h3 class="card-title">${game.name}</h3>
        <div class="card-meta">
          ${game.rating ? `<span class="rating">★ ${game.rating.toFixed(1)}</span>` : ''}
          ${game.price ? `<span class="price">$${game.price}</span>` : ''}
        </div>
        ${game.reason ? `<p class="recommendation-reason">${game.reason}</p>` : ''}
      </div>
    `;
    
    card.onclick = () => navigateToGame(game.id);
    
    return card;
  }
  
  /**
   * Scroll carousel
   */
  function scrollCarousel(carousel, direction) {
    const track = carousel.querySelector('.carousel-track');
    const scrollAmount = carousel.offsetWidth * 0.8;
    track.scrollBy({
      left: direction * scrollAmount,
      behavior: 'smooth'
    });
  }
  
  /**
   * Render continue playing section
   */
  function renderContinuePlaying(container, games) {
    const grid = document.createElement('div');
    grid.className = 'continue-grid';
    
    games.forEach(game => {
      const card = document.createElement('div');
      card.className = 'continue-card';
      card.innerHTML = `
        <div class="progress-bar">
          <div class="progress" style="width: ${game.progress || 0}%"></div>
        </div>
        <img src="${game.imageUrl}" alt="${game.name}">
        <h4>${game.name}</h4>
        <button class="resume-btn">Resume</button>
      `;
      card.onclick = () => launchGame(game.id);
      grid.appendChild(card);
    });
    
    container.appendChild(grid);
  }
  
  /**
   * Render bundles section
   */
  function renderBundles(container, bundles) {
    const grid = document.createElement('div');
    grid.className = 'bundle-grid';
    
    bundles.forEach(bundle => {
      const card = document.createElement('div');
      card.className = 'bundle-card';
      card.innerHTML = `
        <h4>${bundle.name}</h4>
        <p class="bundle-items">${bundle.items.length} items</p>
        <p class="bundle-price">$${bundle.price} <span class="original-price">$${bundle.originalPrice}</span></p>
        <button class="buy-btn">Get Bundle</button>
      `;
      grid.appendChild(card);
    });
    
    container.appendChild(grid);
  }
  
  /**
   * Render challenges section
   */
  function renderChallenges(container, challenges) {
    const list = document.createElement('div');
    list.className = 'challenge-list';
    
    challenges.forEach(challenge => {
      const item = document.createElement('div');
      item.className = `challenge-item ${challenge.isCompleted ? 'completed' : ''}`;
      item.innerHTML = `
        <h4>${challenge.name}</h4>
        <p>${challenge.description}</p>
        <div class="challenge-reward">🎁 ${challenge.reward}</div>
      `;
      list.appendChild(item);
    });
    
    container.appendChild(list);
  }
  
  /**
   * Render social feed section
   */
  function renderSocialFeed(container, activities) {
    const feed = document.createElement('div');
    feed.className = 'social-feed';
    
    activities.forEach(activity => {
      const item = document.createElement('div');
      item.className = 'feed-item';
      item.innerHTML = `
        <img src="${activity.userAvatar}" class="avatar">
        <div class="feed-content">
          <p><strong>${activity.username}</strong> ${activity.action}</p>
          <p class="feed-time">${timeAgo(activity.timestamp)}</p>
        </div>
      `;
      feed.appendChild(item);
    });
    
    container.appendChild(feed);
  }
  
  /**
   * Render seasonal banner
   */
  function renderSeasonalBanner(container, events) {
    if (events.length === 0) return;
    
    const event = events[0];
    const banner = document.createElement('div');
    banner.className = 'seasonal-banner';
    banner.style.backgroundImage = `url('${event.imageUrl}')`;
    banner.innerHTML = `
      <div class="banner-content">
        <h2>${event.name}</h2>
        <p>${event.description}</p>
        <p class="event-timer">Ends in: <span id="event-countdown">${formatTimeRemaining(event.endsAt)}</span></p>
        <button class="cta-btn">Join Event</button>
      </div>
    `;
    container.appendChild(banner);
    
    // Start countdown
    startCountdown(event.endsAt);
  }
  
  /**
   * Trigger entrance animations
   */
  function triggerEntranceAnimations() {
    const sections = document.querySelectorAll('.storefront-section');
    sections.forEach((section, index) => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        section.style.transition = `opacity ${config.animationDuration}ms, transform ${config.animationDuration}ms`;
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
      }, index * 100);
    });
  }
  
  /**
   * Setup real-time updates
   */
  function setupRealTimeUpdates() {
    // Refresh layout every 5 minutes
    setInterval(async () => {
      if (!isPersonalizing) {
        await generateLayout();
        renderLayout();
      }
    }, config.cacheExpiry);
    
    // Listen for user activity
    document.addEventListener('userActivity', () => {
      // Refresh on significant user actions
      debouncedRefresh();
    });
  }
  
  /**
   * Debounced refresh
   */
  let refreshTimeout;
  function debouncedRefresh() {
    clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(async () => {
      await loadUserProfile();
      await generateLayout();
      renderLayout();
    }, 2000);
  }
  
  /**
   * Navigate to game detail
   */
  function navigateToGame(gameId) {
    window.location.href = `/games/${gameId}`;
  }
  
  /**
   * Launch game
   */
  function launchGame(gameId) {
    window.location.href = `/play/${gameId}`;
  }
  
  /**
   * Helper: Get user token
   */
  function getUserToken() {
    return localStorage.getItem('authToken') || '';
  }
  
  /**
   * Helper: Time ago format
   */
  function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
  
  /**
   * Helper: Format time remaining
   */
  function formatTimeRemaining(endTime) {
    const now = Date.now();
    const end = new Date(endTime).getTime();
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    return `${hours}h ${minutes}m`;
  }
  
  /**
   * Helper: Start countdown
   */
  function startCountdown(endTime) {
    const interval = setInterval(() => {
      const element = document.getElementById('event-countdown');
      if (!element) {
        clearInterval(interval);
        return;
      }
      element.textContent = formatTimeRemaining(endTime);
    }, 60000);
  }
  
  // Public API
  return {
    init,
    refresh: generateLayout,
    getLayout: () => layoutConfig,
    getSections: () => sections,
    getUserProfile: () => userProfile
  };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PersonalizedStorefront;
} else if (typeof window !== 'undefined') {
  window.PersonalizedStorefront = PersonalizedStorefront;
}
