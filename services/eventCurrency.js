/**
 * Event Currency & Reward System
 * Phase 6: Live Events & Seasonal Content
 */

class EventCurrencySystem {
  constructor() {
    this.currencies = new Map();
    this.exchangeRates = new Map();
    this.rewardPools = new Map();
  }
  
  createEventCurrency(config) {
    const currency = {
      id: config.id || `currency_${Date.now()}`,
      name: config.name,
      symbol: config.symbol,
      icon: config.icon,
      earnMethods: config.earnMethods || [],
      spendMethods: config.spendMethods || [],
      isPremium: config.isPremium || false,
      isTransferable: config.isTransferable !== undefined ? config.isTransferable : false,
      expiresAt: config.expiresAt || null
    };
    
    this.currencies.set(currency.id, currency);
    return currency;
  }
  
  trackEarnings(userId, currencyId, amount, source) {
    // Track in database
    return { success: true, amount, newBalance: 0 };
  }
  
  spendCurrency(userId, currencyId, amount, destination) {
    // Spend from database
    return { success: true, amount };
  }
  
  createRewardPool(config) {
    const pool = {
      id: config.id || `pool_${Date.now()}`,
      name: config.name,
      items: config.items || [],
      dropRates: config.dropRates || [],
      isLimited: config.isLimited || false,
      totalSupply: config.totalSupply || Infinity,
      remainingSupply: config.remainingSupply || config.totalSupply || Infinity
    };
    
    this.rewardPools.set(pool.id, pool);
    return pool;
  }
  
  claimReward(userId, poolId) {
    const pool = this.rewardPools.get(poolId);
    if (!pool || pool.remainingSupply <= 0) {
      return { success: false, error: 'Pool exhausted' };
    }
    
    // Weighted random selection
    const item = this.selectReward(pool);
    pool.remainingSupply--;
    
    return { success: true, item };
  }
  
  selectReward(pool) {
    const rand = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < pool.items.length; i++) {
      cumulative += pool.dropRates[i] || 0;
      if (rand <= cumulative) {
        return pool.items[i];
      }
    }
    
    return pool.items[pool.items.length - 1];
  }
  
  getStats() {
    return {
      totalCurrencies: this.currencies.size,
      totalPools: this.rewardPools.size
    };
  }
}

module.exports = EventCurrencySystem;
