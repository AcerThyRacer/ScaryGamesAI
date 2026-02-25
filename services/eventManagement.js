/**
 * Event Management System
 * Phase 6: Live Events & Seasonal Content
 * 
 * Comprehensive event creation, management, and tracking
 * Supports seasonal, flash, community, esports, and collab events
 * 
 * @module services/eventManagement
 */

class EventManagementSystem {
  /**
   * Create event management system
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.events = new Map();
    this.userEventProgress = new Map();
    this.eventHistory = [];
    this.activeEventsCache = null;
    this.cacheExpiry = config.cacheExpiry || 60000; // 1 minute
    
    // Event type definitions
    this.eventTypes = {
      SEASONAL: 'seasonal',
      FLASH: 'flash',
      COMMUNITY: 'community',
      ESPORTS: 'esports',
      COLLAB: 'collab',
      NARRATIVE: 'narrative'
    };
    
    // Event templates
    this.templates = this.initializeTemplates();
  }
  
  /**
   * Initialize event templates
   */
  initializeTemplates() {
    return {
      halloween: {
        name: 'Halloween Horror Fest',
        type: this.eventTypes.SEASONAL,
        duration: 604800000, // 7 days
        theme: 'halloween',
        features: ['special_skins', 'pumpkin_hunt', 'boss_battle']
      },
      christmas: {
        name: 'Winter Wonderland',
        type: this.eventTypes.SEASONAL,
        duration: 1209600000, // 14 days
        theme: 'winter',
        features: ['gift_exchange', 'snowball_fight', 'holiday_skins']
      },
      flash_weekend: {
        name: 'Weekend Warrior',
        type: this.eventTypes.FLASH,
        duration: 172800000, // 48 hours
        theme: 'competitive',
        features: ['double_xp', 'leaderboard', 'exclusive_rewards']
      },
      community_goal: {
        name: 'Community Challenge',
        type: this.eventTypes.COMMUNITY,
        duration: 604800000, // 7 days
        theme: 'cooperative',
        features: ['global_progress', 'milestone_rewards', 'team_bonus']
      }
    };
  }
  
  /**
   * Create a new event
   * @param {Object} eventConfig - Event configuration
   * @returns {Object} Created event
   */
  createEvent(eventConfig) {
    const eventId = this.generateId('event');
    
    const event = {
      id: eventId,
      name: eventConfig.name,
      type: eventConfig.type,
      description: eventConfig.description || '',
      theme: eventConfig.theme || 'default',
      
      // Timing
      startDate: eventConfig.startDate || Date.now(),
      endDate: eventConfig.endDate || (Date.now() + eventConfig.duration),
      timezone: eventConfig.timezone || 'UTC',
      
      // Event mechanics
      currency: eventConfig.currency || {
        name: 'Event Tokens',
        icon: '🎫',
        earnRate: eventConfig.earnRate || 10 // per activity
      },
      
      // Rewards
      rewards: eventConfig.rewards || [],
      milestoneRewards: eventConfig.milestoneRewards || [],
      
      // Activities
      activities: eventConfig.activities || [],
      challenges: eventConfig.challenges || [],
      
      // Progress tracking
      globalProgress: eventConfig.globalProgress ? {
        current: 0,
        target: eventConfig.globalProgress.target,
        milestones: eventConfig.globalProgress.milestones || []
      } : null,
      
      // Event shop
      shop: eventConfig.shop ? {
        items: eventConfig.shop.items || [],
        refreshRate: eventConfig.shop.refreshRate || 86400000 // daily
      } : null,
      
      // Leaderboards
      leaderboards: eventConfig.leaderboards || [],
      
      // Restrictions
      minLevel: eventConfig.minLevel || 1,
      maxParticipants: eventConfig.maxParticipants || null,
      regions: eventConfig.regions || ['global'],
      
      // Metadata
      imageUrl: eventConfig.imageUrl,
      bannerUrl: eventConfig.bannerUrl,
      trailerUrl: eventConfig.trailerUrl,
      rules: eventConfig.rules || [],
      
      // Status
      status: 'scheduled', // scheduled, active, completed, cancelled
      createdAt: Date.now(),
      updatedAt: Date.now(),
      
      // Analytics
      metrics: {
        participants: 0,
        totalActivities: 0,
        rewardsClaimed: 0,
        revenue: 0
      }
    };
    
    // Validate event
    this.validateEvent(event);
    
    // Store event
    this.events.set(eventId, event);
    
    // Clear cache
    this.activeEventsCache = null;
    
    console.log(`[Event] Created event: ${event.name} (${eventId})`);
    return event;
  }
  
  /**
   * Validate event configuration
   */
  validateEvent(event) {
    if (!event.name || event.name.length < 3) {
      throw new Error('Event name must be at least 3 characters');
    }
    
    if (event.endDate <= event.startDate) {
      throw new Error('Event end date must be after start date');
    }
    
    if (!Object.values(this.eventTypes).includes(event.type)) {
      throw new Error(`Invalid event type: ${event.type}`);
    }
  }
  
  /**
   * Get event by ID
   */
  getEvent(eventId) {
    return this.events.get(eventId) || null;
  }
  
  /**
   * Get all active events
   */
  getActiveEvents(filters = {}) {
    // Check cache
    if (this.activeEventsCache && Date.now() - this.activeEventsCache.timestamp < this.cacheExpiry) {
      return this.filterEvents(this.activeEventsCache.events, filters);
    }
    
    const now = Date.now();
    const activeEvents = [];
    
    for (const event of this.events.values()) {
      if (event.status === 'active' || 
          (event.startDate <= now && event.endDate > now && event.status !== 'cancelled')) {
        activeEvents.push(event);
      }
    }
    
    // Sort by priority
    activeEvents.sort((a, b) => {
      // Seasonal events have highest priority
      if (a.type === this.eventTypes.SEASONAL && b.type !== this.eventTypes.SEASONAL) return -1;
      if (b.type === this.eventTypes.SEASONAL && a.type !== this.eventTypes.SEASONAL) return 1;
      
      // Then by end date (sooner ending first)
      return a.endDate - b.endDate;
    });
    
    // Cache result
    this.activeEventsCache = {
      events: activeEvents,
      timestamp: Date.now()
    };
    
    return this.filterEvents(activeEvents, filters);
  }
  
  /**
   * Filter events by criteria
   */
  filterEvents(events, filters) {
    return events.filter(event => {
      if (filters.type && event.type !== filters.type) return false;
      if (filters.theme && event.theme !== filters.theme) return false;
      if (filters.region && !event.regions.includes(filters.region)) return false;
      if (filters.minLevel && event.minLevel > filters.minLevel) return false;
      return true;
    });
  }
  
  /**
   * Get upcoming events
   */
  getUpcomingEvents(limit = 5) {
    const now = Date.now();
    const upcoming = [];
    
    for (const event of this.events.values()) {
      if (event.startDate > now && event.status === 'scheduled') {
        upcoming.push(event);
      }
    }
    
    upcoming.sort((a, b) => a.startDate - b.startDate);
    return upcoming.slice(0, limit);
  }
  
  /**
   * Get past events
   */
  getPastEvents(limit = 10) {
    const now = Date.now();
    const past = [];
    
    for (const event of this.events.values()) {
      if (event.endDate < now || event.status === 'completed') {
        past.push(event);
      }
    }
    
    past.sort((a, b) => b.endDate - a.endDate);
    return past.slice(0, limit);
  }
  
  /**
   * Update event status
   */
  updateEventStatus(eventId, status) {
    const event = this.events.get(eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }
    
    const oldStatus = event.status;
    event.status = status;
    event.updatedAt = Date.now();
    
    // Handle status transitions
    if (status === 'active' && oldStatus !== 'active') {
      this.onEventStart(event);
    } else if ((status === 'completed' || status === 'cancelled') && oldStatus === 'active') {
      this.onEventEnd(event);
    }
    
    // Clear cache
    this.activeEventsCache = null;
    
    console.log(`[Event] Event ${event.name} status changed: ${oldStatus} → ${status}`);
    return event;
  }
  
  /**
   * Event start handler
   */
  onEventStart(event) {
    // Send notifications
    this.sendEventNotifications(event);
    
    // Initialize leaderboards
    if (event.leaderboards && event.leaderboards.length > 0) {
      event.leaderboards.forEach(lb => {
        lb.entries = [];
        lb.lastUpdated = Date.now();
      });
    }
    
    // Record in history
    this.eventHistory.push({
      eventId: event.id,
      action: 'started',
      timestamp: Date.now()
    });
  }
  
  /**
   * Event end handler
   */
  onEventEnd(event) {
    // Distribute final rewards
    this.distributeFinalRewards(event);
    
    // Archive event data
    this.archiveEventData(event);
    
    // Record in history
    this.eventHistory.push({
      eventId: event.id,
      action: 'ended',
      timestamp: Date.now(),
      finalMetrics: event.metrics
    });
  }
  
  /**
   * Track user activity in event
   */
  trackUserActivity(eventId, userId, activity) {
    const event = this.events.get(eventId);
    if (!event || event.status !== 'active') {
      return { success: false, error: 'Event not active' };
    }
    
    // Get or create user progress
    let progress = this.getUserEventProgress(userId, eventId);
    
    // Update activity count
    const activityKey = `${activity.type}_${activity.id}`;
    progress.activities[activityKey] = (progress.activities[activityKey] || 0) + 1;
    
    // Update currency
    if (activity.earnings) {
      progress.currency += activity.earnings;
    }
    
    // Update event metrics
    event.metrics.totalActivities++;
    
    // Update global progress if applicable
    if (event.globalProgress && activity.globalContribution) {
      event.globalProgress.current += activity.globalContribution;
      this.checkGlobalMilestones(event);
    }
    
    // Check for achievements
    this.checkEventAchievements(userId, event, progress);
    
    // Save progress
    this.saveUserEventProgress(userId, eventId, progress);
    
    return {
      success: true,
      progress,
      earnings: activity.earnings || 0
    };
  }
  
  /**
   * Get user event progress
   */
  getUserEventProgress(userId, eventId) {
    const key = `${userId}_${eventId}`;
    
    if (!this.userEventProgress.has(key)) {
      this.userEventProgress.set(key, {
        userId,
        eventId,
        currency: 0,
        activities: {},
        rewardsClaimed: [],
        milestonesReached: [],
        startedAt: Date.now(),
        lastActiveAt: Date.now()
      });
    }
    
    const progress = this.userEventProgress.get(key);
    progress.lastActiveAt = Date.now();
    return progress;
  }
  
  /**
   * Save user event progress
   */
  saveUserEventProgress(userId, eventId, progress) {
    const key = `${userId}_${eventId}`;
    this.userEventProgress.set(key, progress);
  }
  
  /**
   * Claim reward
   */
  claimReward(eventId, userId, rewardId) {
    const event = this.events.get(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }
    
    const progress = this.getUserEventProgress(userId, eventId);
    
    // Check if already claimed
    if (progress.rewardsClaimed.includes(rewardId)) {
      return { success: false, error: 'Reward already claimed' };
    }
    
    // Find reward
    const reward = event.rewards.find(r => r.id === rewardId);
    if (!reward) {
      return { success: false, error: 'Reward not found' };
    }
    
    // Check requirements
    if (reward.requirement) {
      const met = this.checkRewardRequirement(progress, reward.requirement);
      if (!met) {
        return { success: false, error: 'Requirements not met' };
      }
    }
    
    // Claim reward
    progress.rewardsClaimed.push(rewardId);
    event.metrics.rewardsClaimed++;
    
    return {
      success: true,
      reward,
      progress
    };
  }
  
  /**
   * Check reward requirement
   */
  checkRewardRequirement(progress, requirement) {
    switch (requirement.type) {
      case 'currency':
        return progress.currency >= requirement.amount;
      case 'activities':
        const totalActivities = Object.values(progress.activities).reduce((sum, count) => sum + count, 0);
        return totalActivities >= requirement.amount;
      case 'specific_activity':
        const activityCount = progress.activities[requirement.activityId] || 0;
        return activityCount >= requirement.amount;
      default:
        return false;
    }
  }
  
  /**
   * Check global milestones
   */
  checkGlobalMilestones(event) {
    if (!event.globalProgress) return;
    
    const { current, milestones } = event.globalProgress;
    
    for (const milestone of milestones) {
      if (current >= milestone.target && !milestone.claimed) {
        milestone.claimed = true;
        milestone.claimedAt = Date.now();
        
        // Notify all participants
        this.notifyGlobalMilestone(event, milestone);
      }
    }
  }
  
  /**
   * Update leaderboard
   */
  updateLeaderboard(eventId, leaderboardId, userId, score) {
    const event = this.events.get(eventId);
    if (!event) return;
    
    const leaderboard = event.leaderboards.find(lb => lb.id === leaderboardId);
    if (!leaderboard) return;
    
    // Find or create entry
    let entry = leaderboard.entries.find(e => e.userId === userId);
    
    if (entry) {
      entry.score = Math.max(entry.score, score); // Keep highest score
      entry.updatedAt = Date.now();
    } else {
      leaderboard.entries.push({
        userId,
        score,
        rank: 0,
        updatedAt: Date.now()
      });
    }
    
    // Update ranks
    leaderboard.entries.sort((a, b) => b.score - a.score);
    leaderboard.entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    // Keep only top N
    const maxEntries = leaderboard.maxEntries || 1000;
    if (leaderboard.entries.length > maxEntries) {
      leaderboard.entries = leaderboard.entries.slice(0, maxEntries);
    }
    
    leaderboard.lastUpdated = Date.now();
  }
  
  /**
   * Generate unique ID
   */
  generateId(prefix = 'evt') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Send event notifications
   */
  sendEventNotifications(event) {
    // This would integrate with notification system
    console.log(`[Event] Sending notifications for: ${event.name}`);
  }
  
  /**
   * Distribute final rewards
   */
  distributeFinalRewards(event) {
    // Distribute rewards based on leaderboard rankings
    if (event.leaderboards && event.leaderboards.length > 0) {
      event.leaderboards.forEach(lb => {
        lb.entries.forEach((entry, index) => {
          const reward = event.rewards[index];
          if (reward) {
            // Award to user
            console.log(`[Event] Awarding reward to user ${entry.userId}: ${reward.name}`);
          }
        });
      });
    }
  }
  
  /**
   * Archive event data
   */
  archiveEventData(event) {
    // This would archive to database
    console.log(`[Event] Archiving event: ${event.name}`);
  }
  
  /**
   * Notify global milestone
   */
  notifyGlobalMilestone(event, milestone) {
    console.log(`[Event] Global milestone reached: ${milestone.name}`);
  }
  
  /**
   * Check event achievements
   */
  checkEventAchievements(userId, event, progress) {
    // Check for achievement unlocks
  }
  
  /**
   * Get event statistics
   */
  getStats() {
    const events = Array.from(this.events.values());
    const activeCount = events.filter(e => e.status === 'active').length;
    
    return {
      totalEvents: events.length,
      activeEvents: activeCount,
      upcomingEvents: events.filter(e => e.status === 'scheduled').length,
      completedEvents: events.filter(e => e.status === 'completed').length,
      totalParticipants: events.reduce((sum, e) => sum + e.metrics.participants, 0),
      totalRevenue: events.reduce((sum, e) => sum + e.metrics.revenue, 0)
    };
  }
}

module.exports = EventManagementSystem;
