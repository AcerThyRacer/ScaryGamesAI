/**
 * PHASE 13: PERSONALIZED STOREFRONT 2.0
 * 
 * AI-driven shop that knows what you want before you do.
 * 
 * Features:
 * - ML recommendation engine
 * - Dynamic pricing based on player behavior
 * - Wishlist 2.0 with alerts
 * - Bundle generator
 * - Try-before-buy demos
 * - Gift suggestions
 * - A/B testing framework
 * - Analytics integration
 * 
 * Target: +30% conversion rate
 */

export class StorefrontSystem {
  constructor(config = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || '/api/store',
      debug: config.debug || false
    };
    
    // Player profile
    this.playerProfile = {
      id: null,
      playHistory: [],
      purchaseHistory: [],
      wishlist: [],
      preferences: {},
      priceRange: { min: 0, max: 50 },
      favoriteGenres: []
    };
    
    // Store inventory
    this.inventory = {
      games: [],
      cosmetics: [],
      bundles: [],
      subscriptions: []
    };
    
    // Recommendations cache
    this.recommendations = new Map();
    
    // A/B test groups
    this.abTestGroups = new Map();
    
    console.log('[Phase 13] STOREFRONT 2.0 initialized');
  }

  async initialize() {
    console.log('[Phase 13] Initializing STOREFRONT 2.0...');
    
    // Load player profile
    await this.loadPlayerProfile();
    
    // Load inventory
    await this.loadInventory();
    
    // Generate initial recommendations
    await this.generateRecommendations();
    
    console.log('[Phase 13] ✅ STOREFRONT 2.0 ready');
  }

  async loadPlayerProfile() {
    // In production, fetch from backend
    this.playerProfile.id = 'player_' + Date.now();
    this.playerProfile.playHistory = [
      { gameId: 'backrooms_pacman', hoursPlayed: 25 },
      { gameId: 'hellaphobia', hoursPlayed: 15 },
      { gameId: 'the_deep', hoursPlayed: 10 }
    ];
    
    this.playerProfile.favoriteGenres = ['survival_horror', 'psychological_horror'];
    this.playerProfile.priceRange = { min: 5, max: 30 };
    
    console.log('[Phase 13] Player profile loaded');
  }

  async loadInventory() {
    // Sample inventory
    this.inventory.games = [
      {
        id: 'backrooms_pacman',
        title: 'Backrooms: Pac-Man',
        price: 9.99,
        genres: ['survival_horror', 'action'],
        rating: 4.8,
        tags: ['multiplayer', 'procedural', 'webgpu']
      },
      {
        id: 'the_deep',
        title: 'The Deep',
        price: 14.99,
        genres: ['survival_horror', 'exploration'],
        rating: 4.7,
        tags: ['underwater', 'cosmic_horror', 'single_player']
      },
      {
        id: 'asylum_architect',
        title: 'Asylum Architect',
        price: 12.99,
        genres: ['strategy', 'horror'],
        rating: 4.9,
        tags: ['reverse_horror', 'management', 'unique']
      }
      // ... more games
    ];
    
    this.inventory.cosmetics = [
      {
        id: 'skin_legendary_1',
        name: 'Legendary Reaper Skin',
        price: 9.99,
        rarity: 'legendary',
        compatibleGames: ['blood_tetris']
      },
      {
        id: 'trail_dragon',
        name: 'Dragon Fire Trail',
        price: 4.99,
        rarity: 'epic',
        compatibleGames: ['blood_tetris', 'backrooms_pacman']
      }
    ];
    
    this.inventory.bundles = [
      {
        id: 'horror_starter_pack',
        name: 'Horror Starter Pack',
        price: 24.99,
        originalPrice: 39.97,
        discount: 0.38,
        items: ['backrooms_pacman', 'hellaphobia', 'the_deep']
      }
    ];
    
    console.log('[Phase 13] Inventory loaded:', this.inventory.games.length, 'games');
  }

  // ML Recommendation Engine
  
  async generateRecommendations() {
    console.log('[Phase 13] Generating personalized recommendations...');
    
    const recommendations = {
      forYou: [],
      similarToPlayed: [],
      trendingInGenre: [],
      bundleSuggestions: [],
      wishlistCompletes: []
    };
    
    // "For You" - based on play history and preferences
    recommendations.forYou = this.calculateForYouRecommendations();
    
    // Similar to played games
    recommendations.similarToPlayed = this.findSimilarGames();
    
    // Trending in favorite genres
    recommendations.trendingInGenre = this.findTrendingInGenre();
    
    // Bundle suggestions
    recommendations.bundleSuggestions = this.suggestBundles();
    
    // Complete wishlist items
    recommendations.wishlistCompletes = this.findWishlistCompletes();
    
    // Cache recommendations
    for (const [category, items] of Object.entries(recommendations)) {
      this.recommendations.set(category, items);
    }
    
    console.log('[Phase 13] Generated', recommendations.forYou.length, 'personalized recommendations');
    
    return recommendations;
  }

  calculateForYouRecommendations() {
    const recommendations = [];
    
    for (const game of this.inventory.games) {
      // Skip already owned/played
      if (this.playerProfile.playHistory.some(h => h.gameId === game.id)) {
        continue;
      }
      
      // Calculate match score
      let matchScore = 0;
      
      // Genre match (40% weight)
      const genreMatch = game.genres.some(g => 
        this.playerProfile.favoriteGenres.includes(g)
      );
      if (genreMatch) matchScore += 40;
      
      // Price range match (20% weight)
      if (game.price >= this.playerProfile.priceRange.min && 
          game.price <= this.playerProfile.priceRange.max) {
        matchScore += 20;
      }
      
      // Rating match (20% weight)
      if (game.rating >= 4.5) matchScore += 20;
      else if (game.rating >= 4.0) matchScore += 10;
      
      // Tag match (20% weight)
      const tagMatch = game.tags.some(tag => 
        this.playerProfile.preferences.likedTags?.includes(tag)
      );
      if (tagMatch) matchScore += 20;
      
      recommendations.push({
        ...game,
        matchScore: matchScore,
        reason: this.generateRecommendationReason(game, matchScore)
      });
    }
    
    // Sort by match score
    recommendations.sort((a, b) => b.matchScore - a.matchScore);
    
    return recommendations.slice(0, 10); // Top 10
  }

  generateRecommendationReason(game, score) {
    const reasons = [];
    
    if (game.genres.some(g => this.playerProfile.favoriteGenres.includes(g))) {
      reasons.push('Matches your favorite genres');
    }
    
    if (game.rating >= 4.5) {
      reasons.push('Highly rated by players');
    }
    
    if (game.price < 10) {
      reasons.push('Great value');
    }
    
    return reasons.join(' • ');
  }

  findSimilarGames() {
    const similar = [];
    
    // Get most played game
    const mostPlayed = this.playerProfile.playHistory.reduce((max, current) => 
      current.hoursPlayed > max.hoursPlayed ? current : max
    , { hoursPlayed: 0 });
    
    if (!mostPlayed.gameId) return similar;
    
    // Find similar games
    const referenceGame = this.inventory.games.find(g => g.id === mostPlayed.gameId);
    if (!referenceGame) return similar;
    
    for (const game of this.inventory.games) {
      if (game.id === referenceGame.id) continue;
      
      // Calculate similarity
      const sharedGenres = game.genres.filter(g => 
        referenceGame.genres.includes(g)
      ).length;
      
      if (sharedGenres >= 2) {
        similar.push({
          ...game,
          similarityScore: sharedGenres / referenceGame.genres.length,
          reason: `Similar to ${referenceGame.title}`
        });
      }
    }
    
    similar.sort((a, b) => b.similarityScore - a.similarityScore);
    return similar.slice(0, 5);
  }

  findTrendingInGenre() {
    const trending = [];
    
    for (const genre of this.playerProfile.favoriteGenres) {
      const gamesInGenre = this.inventory.games.filter(g => 
        g.genres.includes(genre)
      );
      
      // Sort by rating and recent popularity
      gamesInGenre.sort((a, b) => b.rating - a.rating);
      
      trending.push(...gamesInGenre.slice(0, 3));
    }
    
    return [...new Set(trending)].slice(0, 5);
  }

  suggestBundles() {
    const suggestions = [];
    
    for (const bundle of this.inventory.bundles) {
      // Check if player wants any items in bundle
      const wantedItems = bundle.items.filter(itemId => 
        this.playerProfile.wishlist.includes(itemId)
      );
      
      if (wantedItems.length > 0) {
        suggestions.push({
          ...bundle,
          reason: `Includes ${wantedItems.length} item(s) from your wishlist`,
          savings: ((bundle.originalPrice - bundle.price) / bundle.originalPrice * 100).toFixed(0) + '%'
        });
      }
    }
    
    return suggestions;
  }

  findWishlistCompletes() {
    // Find DLC or sequels for wishlisted games
    const completes = [];
    
    for (const itemId of this.playerProfile.wishlist) {
      const game = this.inventory.games.find(g => g.id === itemId);
      if (!game) continue;
      
      // Find related items
      const related = this.inventory.games.filter(g => 
        g.id !== itemId && 
        (g.tags.includes('dlc') || g.tags.includes('sequel')) &&
        g.genres.some(genre => game.genres.includes(genre))
      );
      
      completes.push(...related);
    }
    
    return completes.slice(0, 5);
  }

  // Dynamic Pricing
  
  calculateDynamicPrice(basePrice, playerId) {
    // Personalized discounts based on player behavior
    let discount = 0;
    
    // Loyalty discount (based on playtime)
    const totalHours = this.playerProfile.playHistory.reduce(
      (sum, h) => sum + h.hoursPlayed, 0
    );
    if (totalHours > 100) discount += 0.05;
    if (totalHours > 500) discount += 0.05;
    
    // Purchase history discount
    if (this.playerProfile.purchaseHistory.length > 5) {
      discount += 0.05;
    }
    
    // Wishlist item discount
    // (items in wishlist over 30 days get discount)
    const oldWishlistItems = this.playerProfile.wishlist.filter(id => {
      const addedDate = this.getWishlistAddDate(id);
      return (Date.now() - addedDate) > (30 * 24 * 60 * 60 * 1000);
    });
    
    if (oldWishlistItems.length > 0) {
      discount += 0.10;
    }
    
    // Apply discount
    const finalPrice = basePrice * (1 - discount);
    
    return {
      original: basePrice,
      final: finalPrice.toFixed(2),
      discount: (discount * 100).toFixed(0) + '%',
      reasons: this.getPricingReasons(discount)
    };
  }

  getPricingReasons(discount) {
    const reasons = [];
    
    if (discount >= 0.10) {
      reasons.push('Loyal player discount');
    }
    
    if (discount >= 0.05) {
      reasons.push('Purchase history bonus');
    }
    
    return reasons;
  }

  // Wishlist 2.0
  
  addToWishlist(itemId) {
    if (!this.playerProfile.wishlist.includes(itemId)) {
      this.playerProfile.wishlist.push(itemId);
      console.log('[Phase 13] Added to wishlist:', itemId);
      
      // Set up price alert
      this.setupPriceAlert(itemId);
      
      return true;
    }
    return false;
  }

  removeFromWishlist(itemId) {
    const index = this.playerProfile.wishlist.indexOf(itemId);
    if (index > -1) {
      this.playerProfile.wishlist.splice(index, 1);
      console.log('[Phase 13] Removed from wishlist:', itemId);
      return true;
    }
    return false;
  }

  setupPriceAlert(itemId) {
    console.log('[Phase 13] Price alert set up for:', itemId);
    // In production, set up backend monitoring
  }

  checkPriceAlerts() {
    // Check if any wishlist items dropped in price
    const alerts = [];
    
    for (const itemId of this.playerProfile.wishlist) {
      const game = this.inventory.games.find(g => g.id === itemId);
      if (!game) continue;
      
      const dynamicPrice = this.calculateDynamicPrice(game.price, this.playerProfile.id);
      
      if (dynamicPrice.discount !== '0%') {
        alerts.push({
          itemId: itemId,
          title: game.title,
          originalPrice: game.price,
          salePrice: dynamicPrice.final,
          discount: dynamicPrice.discount
        });
      }
    }
    
    return alerts;
  }

  // Bundle Generator
  
  generateCustomBundle(playerId) {
    // Create personalized bundle from player's wishlist
    const wishlistGames = this.inventory.games.filter(g => 
      this.playerProfile.wishlist.includes(g.id)
    );
    
    if (wishlistGames.length < 2) {
      return null; // Need at least 2 games for bundle
    }
    
    // Take top 3-5 games from wishlist
    const bundleGames = wishlistGames.slice(0, Math.min(5, wishlistGames.length));
    
    // Calculate bundle price (20% discount)
    const totalOriginal = bundleGames.reduce((sum, g) => sum + g.price, 0);
    const bundlePrice = totalOriginal * 0.8;
    
    return {
      id: 'custom_bundle_' + playerId,
      name: 'Your Custom Bundle',
      items: bundleGames.map(g => g.id),
      originalPrice: totalOriginal.toFixed(2),
      bundlePrice: bundlePrice.toFixed(2),
      savings: '20%',
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
  }

  // Try Before Buy
  
  launchDemo(gameId) {
    const game = this.inventory.games.find(g => g.id === gameId);
    if (!game) return false;
    
    console.log('[Phase 13] Launching demo for:', game.title);
    
    // In production, launch limited-time demo
    // Typically 5-10 minutes or limited content
    
    return true;
  }

  // Gift Suggestions
  
  suggestGifts(friendProfile, occasion) {
    const suggestions = [];
    
    // Find games friend doesn't own but matches their profile
    for (const game of this.inventory.games) {
      if (friendProfile.ownedGames?.includes(game.id)) {
        continue;
      }
      
      // Match against friend's preferences
      const matchScore = this.calculateGiftMatchScore(game, friendProfile);
      
      if (matchScore >= 60) {
        suggestions.push({
          ...game,
          matchScore: matchScore,
          occasion: occasion,
          message: this.generateGiftMessage(game, occasion)
        });
      }
    }
    
    suggestions.sort((a, b) => b.matchScore - a.matchScore);
    return suggestions.slice(0, 5);
  }

  calculateGiftMatchScore(game, friendProfile) {
    let score = 0;
    
    // Genre match (50% weight)
    const genreMatch = game.genres.some(g => 
      friendProfile.favoriteGenres?.includes(g)
    );
    if (genreMatch) score += 50;
    
    // Rating (30% weight)
    if (game.rating >= 4.5) score += 30;
    else if (game.rating >= 4.0) score += 20;
    
    // Price appropriateness (20% weight)
    if (game.price >= 10 && game.price <= 30) score += 20;
    
    return score;
  }

  generateGiftMessage(game, occasion) {
    const messages = {
      birthday: `Happy Birthday! Thought you'd love ${game.title}!`,
      holiday: `Happy Holidays! Here's ${game.title} for you!`,
      just_because: `Saw ${game.title} and thought of you!`,
      achievement: `Congrats! Celebrate with ${game.title}!`
    };
    
    return messages[occasion] || `Check out ${game.title}!`;
  }

  // A/B Testing Framework
  
  assignABTest(testName) {
    // Assign player to A/B test group
    if (!this.abTestGroups.has(testName)) {
      // Random assignment
      const group = Math.random() < 0.5 ? 'A' : 'B';
      this.abTestGroups.set(testName, group);
      console.log(`[Phase 13] Assigned to ${testName} group ${group}`);
    }
    
    return this.abTestGroups.get(testName);
  }

  getABTestVariant(testName, variants) {
    const group = this.assignABTest(testName);
    return variants[group];
  }

  // Analytics Integration
  
  trackImpression(itemId, position, context) {
    console.log('[Phase 13] Impression tracked:', {
      itemId,
      position,
      context,
      timestamp: Date.now()
    });
    // Send to analytics backend
  }

  trackClick(itemId, position, context) {
    console.log('[Phase 13] Click tracked:', {
      itemId,
      position,
      context,
      timestamp: Date.now()
    });
    // Send to analytics backend
  }

  trackPurchase(itemId, amount, currency) {
    console.log('[Phase 13] Purchase tracked:', {
      itemId,
      amount,
      currency,
      timestamp: Date.now()
    });
    
    // Update player profile
    this.playerProfile.purchaseHistory.push({
      itemId,
      amount,
      currency,
      date: Date.now()
    });
  }

  async saveProfile() {
    try {
      localStorage.setItem('storefront_profile', JSON.stringify(this.playerProfile));
      console.log('[Phase 13] Profile saved');
    } catch (error) {
      console.error('[Phase 13] Save failed:', error);
    }
  }

  dispose() {
    this.saveProfile();
    console.log('[Phase 13] STOREFRONT 2.0 disposed');
  }
}

// Export singleton helper
let storefrontInstance = null;

export function getStorefrontSystem(config) {
  if (!storefrontInstance) {
    storefrontInstance = new StorefrontSystem(config);
  }
  return storefrontInstance;
}

console.log('[Phase 13] STOREFRONT 2.0 module loaded');
