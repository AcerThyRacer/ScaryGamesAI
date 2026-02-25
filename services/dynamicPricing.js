/**
 * Dynamic Pricing Engine
 * Phase 7: Monetization Innovation
 * 
 * Demand-based pricing, inventory clearance, price elasticity
 */

class DynamicPricingEngine {
  constructor(config = {}) {
    this.priceRules = new Map();
    this.priceHistory = new Map();
    this.demandData = new Map();
    this.elasticityModels = new Map();
  }
  
  /**
   * Create pricing rule
   */
  createPriceRule(config) {
    const rule = {
      id: config.id || `rule_${Date.now()}`,
      itemId: config.itemId,
      basePrice: config.basePrice,
      modifiers: config.modifiers || {},
      minPrice: config.minPrice || config.basePrice * 0.5,
      maxPrice: config.maxPrice || config.basePrice * 2.0,
      isActive: true,
      createdAt: Date.now()
    };
    
    this.priceRules.set(rule.id, rule);
    return rule;
  }
  
  /**
   * Calculate dynamic price
   */
  calculatePrice(itemId, context = {}) {
    const rule = this.getPriceRuleForItem(itemId);
    if (!rule) return null;
    
    let price = rule.basePrice;
    
    // Apply demand modifier
    const demand = this.demandData.get(itemId) || { level: 1.0 };
    if (context.applyDemand !== false) {
      price *= demand.level;
    }
    
    // Apply time-based modifier
    if (context.hour) {
      const timeMultiplier = this.getTimeMultiplier(context.hour);
      price *= timeMultiplier;
    }
    
    // Apply inventory modifier
    if (context.inventory) {
      const inventoryMultiplier = this.getInventoryMultiplier(context.inventory);
      price *= inventoryMultiplier;
    }
    
    // Apply user segment modifier
    if (context.userSegment) {
      const segmentMultiplier = this.getSegmentMultiplier(context.userSegment);
      price *= segmentMultiplier;
    }
    
    // Clamp to min/max
    price = Math.max(rule.minPrice, Math.min(rule.maxPrice, price));
    
    return Math.round(price * 100) / 100;
  }
  
  /**
   * Get price rule for item
   */
  getPriceRuleForItem(itemId) {
    return Array.from(this.priceRules.values())
      .find(rule => rule.itemId === itemId && rule.isActive);
  }
  
  /**
   * Get time multiplier
   */
  getTimeMultiplier(hour) {
    // Peak hours (6-9 PM) have higher prices
    if (hour >= 18 && hour <= 21) return 1.1;
    // Night hours (12-6 AM) have lower prices
    if (hour >= 0 && hour <= 6) return 0.9;
    return 1.0;
  }
  
  /**
   * Get inventory multiplier
   */
  getInventoryMultiplier(inventory) {
    if (inventory < 10) return 1.2; // Low stock = higher price
    if (inventory > 100) return 0.85; // Overstock = discount
    return 1.0;
  }
  
  /**
   * Get segment multiplier
   */
  getSegmentMultiplier(segment) {
    const multipliers = {
      whale: 1.0, // Willing to pay full price
      grinder: 0.9, // Price sensitive
      casual: 1.0,
      new: 0.85 // New user discount
    };
    return multipliers[segment] || 1.0;
  }
  
  /**
   * Update demand data
   */
  updateDemand(itemId, metrics) {
    const current = this.demandData.get(itemId) || { level: 1.0, views: 0, purchases: 0 };
    
    const viewVelocity = metrics.viewsLast24h / 24; // per hour
    const conversionRate = metrics.purchasesLast24h / Math.max(1, metrics.viewsLast24h);
    
    // Calculate demand level (0.5 - 2.0)
    let demandLevel = 1.0;
    
    if (viewVelocity > 100) demandLevel += 0.3;
    else if (viewVelocity > 50) demandLevel += 0.15;
    else if (viewVelocity < 10) demandLevel -= 0.15;
    
    if (conversionRate > 0.1) demandLevel += 0.3;
    else if (conversionRate > 0.05) demandLevel += 0.15;
    else if (conversionRate < 0.02) demandLevel -= 0.15;
    
    demandLevel = Math.max(0.5, Math.min(2.0, demandLevel));
    
    this.demandData.set(itemId, {
      level: demandLevel,
      views: metrics.viewsLast24h,
      purchases: metrics.purchasesLast24h,
      conversionRate,
      viewVelocity,
      updatedAt: Date.now()
    });
  }
  
  /**
   * Get price elasticity
   */
  getPriceElasticity(itemId) {
    const history = this.priceHistory.get(itemId) || [];
    if (history.length < 5) return -1.5; // Default elastic
    
    // Calculate elasticity from price/quantity changes
    // Elasticity = % change in quantity / % change in price
    let totalElasticity = 0;
    let count = 0;
    
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      
      const priceChange = (curr.price - prev.price) / prev.price;
      const quantityChange = (curr.quantity - prev.quantity) / prev.quantity;
      
      if (priceChange !== 0) {
        const elasticity = quantityChange / priceChange;
        totalElasticity += elasticity;
        count++;
      }
    }
    
    return count > 0 ? totalElasticity / count : -1.5;
  }
  
  /**
   * Optimize price
   */
  optimizePrice(itemId, goal = 'revenue') {
    const elasticity = this.getPriceElasticity(itemId);
    const rule = this.getPriceRuleForItem(itemId);
    const demand = this.demandData.get(itemId);
    
    if (!rule || !demand) return rule?.basePrice || 0;
    
    let optimalPrice = rule.basePrice;
    
    if (goal === 'revenue') {
      // Revenue maximization
      if (Math.abs(elasticity) > 1) {
        // Elastic - lower price increases revenue
        optimalPrice = rule.basePrice * 0.9;
      } else {
        // Inelastic - raise price increases revenue
        optimalPrice = rule.basePrice * 1.1;
      }
    } else if (goal === 'clearance') {
      // Inventory clearance - aggressive discount
      optimalPrice = rule.basePrice * 0.7;
    }
    
    return Math.round(optimalPrice * 100) / 100;
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      totalRules: this.priceRules.size,
      activeRules: Array.from(this.priceRules.values()).filter(r => r.isActive).length,
      itemsTracked: this.demandData.size
    };
  }
}

module.exports = DynamicPricingEngine;
