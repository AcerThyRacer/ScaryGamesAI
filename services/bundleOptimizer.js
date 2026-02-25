/**
 * Bundle Optimizer Service
 * Phase 5: AI-Powered Personalization
 * 
 * "Complete Your Look" algorithm for outfit bundling
 * Optimizes item combinations for maximum utility and aesthetic coherence
 * 
 * @module services/bundleOptimizer
 */

class BundleOptimizer {
  /**
   * Create bundle optimizer
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.itemDatabase = new Map(); // itemId -> item data
    this.compatibilityMatrix = new Map(); // itemPair -> compatibility score
    this.styleClusters = new Map(); // clusterId -> items
    this.maxBundleSize = config.maxBundleSize || 5;
    this.minDiscount = config.minDiscount || 0.1; // 10%
    this.maxDiscount = config.maxDiscount || 0.3; // 30%
  }

  /**
   * Add item to database
   * @param {Object} item - Item data
   */
  addItem(item) {
    this.itemDatabase.set(item.itemId, {
      ...item,
      attributes: this.extractAttributes(item)
    });
    
    // Update style clusters
    this.updateStyleClusters(item);
  }

  /**
   * Extract item attributes for compatibility
   * @param {Object} item - Item data
   * @returns {Object} Attributes
   */
  extractAttributes(item) {
    return {
      category: item.category || 'general', // skin, effect, emote, etc.
      style: item.style || 'default', // gothic, cyberpunk, classic, etc.
      colorPalette: item.colorPalette || [], // primary colors
      rarity: item.rarity || 'common',
      price: item.price || 0,
      theme: item.theme || '', // halloween, christmas, etc.
      set: item.setItem || null // belongs to a set
    };
  }

  /**
   * Update style clusters
   * @param {Object} item - Item
   */
  updateStyleClusters(item) {
    const clusterKey = `${item.category}_${item.style}`;
    
    if (!this.styleClusters.has(clusterKey)) {
      this.styleClusters.set(clusterKey, []);
    }
    
    this.styleClusters.get(clusterKey).push(item.itemId);
  }

  /**
   * Calculate compatibility between two items
   * @param {string} itemId1 - First item ID
   * @param {string} itemId2 - Second item ID
   * @returns {number} Compatibility score (0-1)
   */
  calculateCompatibility(itemId1, itemId2) {
    const item1 = this.itemDatabase.get(itemId1);
    const item2 = this.itemDatabase.get(itemId2);
    
    if (!item1 || !item2) return 0;
    
    const cacheKey = `${itemId1}_${itemId2}`;
    if (this.compatibilityMatrix.has(cacheKey)) {
      return this.compatibilityMatrix.get(cacheKey);
    }
    
    let score = 0.5; // Base score
    
    // Same category penalty (don't bundle two skins)
    if (item1.attributes.category === item2.attributes.category) {
      score -= 0.3;
    }
    
    // Same style bonus
    if (item1.attributes.style === item2.attributes.style) {
      score += 0.2;
    }
    
    // Same set bonus
    if (item1.attributes.set && item1.attributes.set === item2.attributes.set) {
      score += 0.3;
    }
    
    // Same theme bonus
    if (item1.attributes.theme && item1.attributes.theme === item2.attributes.theme) {
      score += 0.15;
    }
    
    // Color palette similarity
    const colorOverlap = this.calculateColorOverlap(
      item1.attributes.colorPalette,
      item2.attributes.colorPalette
    );
    score += colorOverlap * 0.1;
    
    // Rarity matching
    const rarityDiff = Math.abs(
      this.rarityToNumber(item1.attributes.rarity) -
      this.rarityToNumber(item2.attributes.rarity)
    );
    score -= (rarityDiff * 0.05);
    
    // Price tier matching
    const priceTier1 = this.getPriceTier(item1.attributes.price);
    const priceTier2 = this.getPriceTier(item2.attributes.price);
    if (priceTier1 === priceTier2) {
      score += 0.05;
    }
    
    // Normalize score
    score = Math.max(0, Math.min(1, score));
    
    this.compatibilityMatrix.set(cacheKey, score);
    return score;
  }

  /**
   * Calculate color palette overlap
   */
  calculateColorOverlap(palette1, palette2) {
    if (!palette1 || palette1.length === 0 || !palette2 || palette2.length === 0) {
      return 0;
    }
    
    const set1 = new Set(palette1.map(c => c.toLowerCase()));
    const set2 = new Set(palette2.map(c => c.toLowerCase()));
    
    let overlap = 0;
    for (const color of set1) {
      if (set2.has(color)) {
        overlap++;
      }
    }
    
    return overlap / Math.max(set1.size, set2.size);
  }

  /**
   * Convert rarity to number
   */
  rarityToNumber(rarity) {
    const rarities = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
    return rarities[rarity?.toLowerCase()] || 1;
  }

  /**
   * Get price tier
   */
  getPriceTier(price) {
    if (price === 0) return 'free';
    if (price < 5) return 'low';
    if (price < 15) return 'medium';
    return 'high';
  }

  /**
   * Generate optimal bundle for user
   * @param {Object} userPreferences - User preferences
   * @param {Array} ownedItems - Items user already owns
   * @param {number} targetSize - Target bundle size
   * @returns {Object} Optimized bundle
   */
  generateBundle(userPreferences, ownedItems = [], targetSize = 3) {
    const ownedSet = new Set(ownedItems);
    const candidates = this.getCandidateItems(userPreferences, ownedSet);
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Greedy bundle construction
    const bundle = [];
    let totalCompatibility = 0;
    
    // Start with highest priority item
    candidates.sort((a, b) => b.priority - a.priority);
    bundle.push(candidates[0]);
    
    // Add compatible items
    for (let i = 1; i < candidates.length && bundle.length < targetSize; i++) {
      const candidate = candidates[i];
      
      // Check compatibility with all items in bundle
      let avgCompatibility = 0;
      for (const item of bundle) {
        avgCompatibility += this.calculateCompatibility(item.itemId, candidate.itemId);
      }
      avgCompatibility /= bundle.length;
      
      // Add if compatible enough
      if (avgCompatibility >= 0.6) {
        bundle.push(candidate);
        totalCompatibility += avgCompatibility;
      }
    }
    
    if (bundle.length < 2) {
      return null; // Need at least 2 items for a bundle
    }
    
    // Calculate bundle metrics
    const originalPrice = bundle.reduce((sum, item) => sum + item.price, 0);
    const avgCompatibility = totalCompatibility / (bundle.length - 1);
    const discount = this.calculateOptimalDiscount(avgCompatibility, bundle.length);
    const bundlePrice = originalPrice * (1 - discount);
    
    return {
      items: bundle.map(item => ({
        itemId: item.itemId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl
      })),
      originalPrice,
      bundlePrice,
      discount: discount * 100,
      savings: originalPrice - bundlePrice,
      compatibility: avgCompatibility,
      bundleName: this.generateBundleName(bundle),
      reason: this.generateBundleReason(bundle, userPreferences)
    };
  }

  /**
   * Get candidate items for bundling
   */
  getCandidateItems(userPreferences, ownedSet) {
    const candidates = [];
    
    for (const [itemId, item] of this.itemDatabase.entries()) {
      if (ownedSet.has(itemId)) continue; // Skip owned items
      
      let priority = 0;
      
      // Boost based on user preferences
      if (userPreferences.preferredStyle && 
          item.attributes.style === userPreferences.preferredStyle) {
        priority += 3;
      }
      
      if (userPreferences.preferredCategory && 
          item.attributes.category === userPreferences.preferredCategory) {
        priority += 2;
      }
      
      // Boost based on popularity
      priority += (item.popularity || 0) / 100;
      
      // Boost based on rating
      priority += (item.rating || 0) / 5;
      
      // Boost if part of a set user is collecting
      if (item.attributes.set && userPreferences.collectionSets?.includes(item.attributes.set)) {
        priority += 5;
      }
      
      // Boost if on sale
      if (item.isOnSale) {
        priority += 1;
      }
      
      candidates.push({
        ...item,
        priority
      });
    }
    
    return candidates.sort((a, b) => b.priority - a.priority).slice(0, 20);
  }

  /**
   * Calculate optimal discount based on compatibility and size
   */
  calculateOptimalDiscount(compatibility, bundleSize) {
    let discount = this.minDiscount;
    
    // Compatibility bonus
    discount += (compatibility - 0.5) * 0.2;
    
    // Size bonus
    discount += (bundleSize - 2) * 0.05;
    
    return Math.min(discount, this.maxDiscount);
  }

  /**
   * Generate bundle name
   */
  generateBundleName(bundle) {
    if (bundle.length === 0) return 'Bundle';
    
    const styles = bundle.map(item => item.attributes.style);
    const dominantStyle = styles.sort((a, b) => 
      styles.filter(s => s === a).length - styles.filter(s => s === b).length
    )[styles.length - 1];
    
    const categories = bundle.map(item => item.attributes.category);
    const hasFullSet = new Set(categories).size === categories.length;
    
    if (hasFullSet) {
      return `Complete ${dominantStyle} Set`;
    } else {
      return `${dominantStyle} Essentials`;
    }
  }

  /**
   * Generate bundle reason
   */
  generateBundleReason(bundle, userPreferences) {
    const reasons = [];
    
    // Style match
    if (userPreferences.preferredStyle) {
      const styleMatches = bundle.filter(item => 
        item.attributes.style === userPreferences.preferredStyle
      ).length;
      
      if (styleMatches > 0) {
        reasons.push(`${styleMatches} items match your preferred ${userPreferences.preferredStyle} style`);
      }
    }
    
    // Collection completion
    const sets = bundle.filter(item => item.attributes.set);
    if (sets.length > 0) {
      const setNames = [...new Set(sets.map(item => item.attributes.set))];
      reasons.push(`Complete your ${setNames.join(', ')} collection`);
    }
    
    // Category diversity
    const categories = [...new Set(bundle.map(item => item.attributes.category))];
    if (categories.length >= 3) {
      reasons.push('Complete look with complementary items');
    }
    
    return reasons.length > 0 ? reasons[0] : 'Perfect combination for you';
  }

  /**
   * Get multiple bundle options
   * @param {Object} userPreferences - Preferences
   * @param {Array} ownedItems - Owned items
   * @param {number} numOptions - Number of options
   * @returns {Array} Bundle options
   */
  getBundleOptions(userPreferences, ownedItems, numOptions = 3) {
    const options = [];
    
    for (let size = 2; size <= Math.min(this.maxBundleSize, 2 + numOptions); size++) {
      const bundle = this.generateBundle(userPreferences, ownedItems, size);
      if (bundle) {
        options.push(bundle);
      }
    }
    
    return options.slice(0, numOptions);
  }

  /**
   * Get item database size
   */
  getStats() {
    return {
      totalItems: this.itemDatabase.size,
      styleClusters: this.styleClusters.size,
      compatibilityPairs: this.compatibilityMatrix.size
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.compatibilityMatrix.clear();
  }
}

module.exports = BundleOptimizer;
