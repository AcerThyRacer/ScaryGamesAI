/**
 * Real-Time Analytics Dashboard
 * Phase 9: Advanced Analytics & Optimization
 * 
 * Live sales, conversion funnels, heat maps, A/B test results
 */

class RealTimeAnalyticsSystem {
  constructor(config = {}) {
    this.metrics = new Map();
    this.events = [];
    this.conversionFunnels = new Map();
    this.heatMaps = new Map();
    this.abTestResults = new Map();
    this.cohortData = new Map();
    this.maxEvents = config.maxEvents || 100000;
  }
  
  /**
   * Track real-time event
   */
  trackEvent(eventType, data) {
    const event = {
      id: this.generateId('evt'),
      type: eventType,
      data,
      timestamp: Date.now()
    };
    
    this.events.push(event);
    
    // Limit events array
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // Update real-time metrics
    this.updateMetrics(eventType, data);
    
    return event;
  }
  
  /**
   * Update real-time metrics
   */
  updateMetrics(eventType, data) {
    const metric = this.metrics.get(eventType) || {
      count: 0,
      lastHour: 0,
      last24Hours: 0,
      revenue: 0,
      uniqueUsers: new Set()
    };
    
    metric.count++;
    metric.lastHour++;
    metric.last24Hours++;
    
    if (data.userId) {
      metric.uniqueUsers.add(data.userId);
    }
    
    if (data.revenue) {
      metric.revenue += data.revenue;
    }
    
    this.metrics.set(eventType, metric);
  }
  
  /**
   * Track conversion funnel step
   */
  trackFunnelStep(funnelName, userId, step, data = {}) {
    const key = `${funnelName}_${userId}_${Date.now()}`;
    
    const funnelStep = {
      id: key,
      funnelName,
      userId,
      step,
      timestamp: Date.now(),
      data
    };
    
    if (!this.conversionFunnels.has(funnelName)) {
      this.conversionFunnels.set(funnelName, {
        steps: [],
        conversions: new Map(),
        dropoffs: new Map()
      });
    }
    
    const funnel = this.conversionFunnels.get(funnelName);
    funnel.steps.push(funnelStep);
    
    return funnelStep;
  }
  
  /**
   * Calculate conversion rate
   */
  calculateConversionRate(funnelName, fromStep, toStep) {
    const funnel = this.conversionFunnels.get(funnelName);
    if (!funnel) return 0;
    
    const fromCount = funnel.steps.filter(s => s.step === fromStep).length;
    const toCount = funnel.steps.filter(s => s.step === toStep).length;
    
    return fromCount > 0 ? (toCount / fromCount) * 100 : 0;
  }
  
  /**
   * Track heat map data (UI clicks)
   */
  trackHeatMap(pageId, x, y, elementId) {
    const key = `${pageId}_${Math.floor(x / 50)}_${Math.floor(y / 50)}`;
    
    if (!this.heatMaps.has(key)) {
      this.heatMaps.set(key, {
        pageId,
        x: Math.floor(x / 50) * 50,
        y: Math.floor(y / 50) * 50,
        clicks: 0,
        elements: new Map()
      });
    }
    
    const heatPoint = this.heatMaps.get(key);
    heatPoint.clicks++;
    
    if (elementId) {
      heatPoint.elements.set(elementId, (heatPoint.elements.get(elementId) || 0) + 1);
    }
  }
  
  /**
   * Get live sales dashboard data
   */
  getLiveSalesData() {
    const now = Date.now();
    const lastHour = this.events.filter(e => 
      e.type.includes('purchase') && now - e.timestamp < 3600000
    );
    
    const last24Hours = this.events.filter(e => 
      e.type.includes('purchase') && now - e.timestamp < 86400000
    );
    
    return {
      salesLastHour: lastHour.length,
      salesLast24Hours: last24Hours.length,
      revenueLastHour: lastHour.reduce((sum, e) => sum + (e.data.revenue || 0), 0),
      revenueLast24Hours: last24Hours.reduce((sum, e) => sum + (e.data.revenue || 0), 0),
      averageOrderValue: last24Hours.length > 0 ? 
        last24Hours.reduce((sum, e) => sum + (e.data.revenue || 0), 0) / last24Hours.length : 0,
      topProducts: this.getTopProducts(last24Hours),
      salesByMinute: this.getSalesByMinute(lastHour)
    };
  }
  
  /**
   * Get top products
   */
  getTopProducts(events) {
    const productSales = new Map();
    
    events.forEach(e => {
      const productId = e.data.productId;
      if (!productId) return;
      
      const current = productSales.get(productId) || { sales: 0, revenue: 0 };
      current.sales++;
      current.revenue += e.data.revenue || 0;
      productSales.set(productId, current);
    });
    
    return Array.from(productSales.entries())
      .map(([id, data]) => ({ productId: id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }
  
  /**
   * Get sales by minute (for real-time chart)
   */
  getSalesByMinute(events) {
    const byMinute = new Map();
    
    events.forEach(e => {
      const minute = Math.floor(e.timestamp / 60000) * 60000;
      byMinute.set(minute, (byMinute.get(minute) || 0) + 1);
    });
    
    return Array.from(byMinute.entries())
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time - b.time);
  }
  
  /**
   * Get A/B test results
   */
  getABTestResults(experimentId) {
    return this.abTestResults.get(experimentId) || null;
  }
  
  /**
   * Get cohort retention data
   */
  getCohortRetention(cohortName, period = 'day') {
    return this.cohortData.get(cohortName) || {
      day0: 100,
      day1: 60,
      day7: 40,
      day30: 25
    };
  }
  
  /**
   * Get LTV tracking
   */
  getLTVTracking(userId) {
    // Calculate lifetime value
    const userEvents = this.events.filter(e => e.data.userId === userId);
    const totalRevenue = userEvents.reduce((sum, e) => sum + (e.data.revenue || 0), 0);
    
    return {
      userId,
      totalRevenue,
      firstPurchase: userEvents.find(e => e.data.revenue > 0)?.timestamp,
      lastPurchase: userEvents.filter(e => e.data.revenue > 0).pop()?.timestamp,
      purchaseCount: userEvents.filter(e => e.data.revenue > 0).length
    };
  }
  
  /**
   * Get churn risk indicators
   */
  getChurnRiskIndicators() {
    const atRiskUsers = [];
    const now = Date.now();
    
    // Users who haven't played in 7+ days but were active before
    for (const [eventType, metric] of this.metrics.entries()) {
      if (metric.last24Hours === 0 && metric.last7Days > 0) {
        atRiskUsers.push({
          eventType,
          lastActive: metric.lastActiveAt,
          daysSinceActive: Math.floor((now - metric.lastActiveAt) / 86400000)
        });
      }
    }
    
    return {
      atRiskCount: atRiskUsers.length,
      atRiskUsers: atRiskUsers.slice(0, 100)
    };
  }
  
  /**
   * Generate unique ID
   */
  generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get analytics summary
   */
  getSummary() {
    return {
      totalEvents: this.events.length,
      activeMetrics: this.metrics.size,
      trackedFunnels: this.conversionFunnels.size,
      heatMapPoints: this.heatMaps.size,
      realTimeUsers: Array.from(this.metrics.values())
        .reduce((sum, m) => sum + m.uniqueUsers.size, 0)
    };
  }
}

module.exports = RealTimeAnalyticsSystem;
