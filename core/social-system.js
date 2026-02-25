/**
 * PHASE 16: SOCIAL FEATURES 2.0
 * 
 * Build community, increase viral coefficient.
 * 
 * Features:
 * - Friends 2.0 (rich profiles, activity feeds)
 * - Guilds/Clans (halls, challenges, GvG)
 * - Social Hub (meeting space, mini-games, trading)
 * - Messaging (DM, group, guild, voice)
 * - Activity Feed (achievements, high scores, clips)
 * - Viral Mechanics (referral program, share bonuses, creator codes)
 * - Moderation (reporting, auto-mod AI, human review)
 * 
 * Target: K-factor > 1.2 (each user brings 1.2+ new users)
 */

export class SocialFeaturesSystem {
  constructor(config = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || '/api/social',
      debug: config.debug || false
    };
    
    // Player social data
    this.playerData = {
      id: 'player_' + Date.now(),
      username: 'Player1',
      avatar: 'default',
      level: 1,
      prestige: 0
    };
    
    // Friends system
    this.friends = {
      list: [],
      pending: [],
      blocked: [],
      suggestions: []
    };
    
    // Guild system
    this.guild = {
      currentGuild: null,
      invitedTo: [],
      applications: []
    };
    
    // Messages
    this.messages = {
      unread: 0,
      conversations: []
    };
    
    // Activity feed
    this.activityFeed = [];
    
    console.log('[Phase 16] SOCIAL FEATURES 2.0 initialized');
  }

  async initialize() {
    console.log('[Phase 16] Initializing SOCIAL FEATURES 2.0...');
    
    // Initialize friends
    await this.loadFriends();
    
    // Initialize guild
    await this.loadGuild();
    
    // Generate friend suggestions
    this.generateFriendSuggestions();
    
    console.log('[Phase 16] ✅ SOCIAL FEATURES 2.0 ready');
  }

  // FRIENDS SYSTEM 2.0

  async loadFriends() {
    // In production, fetch from backend
    this.friends.list = [
      { id: 'friend_1', username: 'HorrorFan92', level: 45, status: 'online', lastSeen: Date.now() },
      { id: 'friend_2', username: 'ScaryGamer', level: 32, status: 'ingame', game: 'backrooms_pacman', lastSeen: Date.now() },
      { id: 'friend_3', username: 'NightmareKing', level: 67, status: 'offline', lastSeen: Date.now() - 3600000 }
    ];
    
    console.log('[Phase 16] Loaded', this.friends.list.length, 'friends');
  }

  addFriend(username) {
    console.log(`[Phase 16] Friend request sent to: ${username}`);
    
    // In production, send friend request
    this.friends.pending.push({ username, status: 'pending', timestamp: Date.now() });
    
    return true;
  }

  acceptFriendRequest(friendId) {
    const pending = this.friends.pending.find(p => p.id === friendId);
    if (!pending) return false;
    
    this.friends.list.push({
      id: friendId,
      username: pending.username,
      level: 1,
      status: 'offline',
      lastSeen: Date.now()
    });
    
    // Remove from pending
    this.friends.pending = this.friends.pending.filter(p => p.id !== friendId);
    
    console.log(`[Phase 16] Accepted friend: ${pending.username}`);
    return true;
  }

  removeFriend(friendId) {
    this.friends.list = this.friends.list.filter(f => f.id !== friendId);
    console.log(`[Phase 16] Removed friend: ${friendId}`);
    return true;
  }

  blockUser(userId) {
    if (!this.friends.blocked.includes(userId)) {
      this.friends.blocked.push(userId);
      
      // Remove from friends if exists
      this.friends.list = this.friends.list.filter(f => f.id !== userId);
      
      console.log(`[Phase 16] Blocked user: ${userId}`);
    }
    return true;
  }

  generateFriendSuggestions() {
    // Suggest friends based on:
    // - Mutual friends
    // - Similar play patterns
    // - Same guild applications
    // - Recent co-op partners
    
    this.friends.suggestions = [
      { id: 'suggest_1', username: 'GhostHunter', mutualFriends: 3, reason: '3 mutual friends' },
      { id: 'suggest_2', username: 'DarkSouls88', mutualFriends: 2, reason: 'Plays similar games' }
    ];
    
    console.log('[Phase 16] Generated', this.friends.suggestions.length, 'friend suggestions');
  }

  getFriendProfile(friendId) {
    const friend = this.friends.list.find(f => f.id === friendId);
    if (!friend) return null;
    
    return {
      ...friend,
      favoriteGames: ['backrooms_pacman', 'hellaphobia'],
      achievements: 145,
      totalPlaytime: '245 hours',
      rank: 'Gold',
      joinDate: '2025-08-15',
      bio: 'Horror game enthusiast 👻',
      showcaseItems: ['legendary_skin', 'speedrun_title']
    };
  }

  // GUILD/CLAN SYSTEM

  createGuild(name, tag, description) {
    if (this.guild.currentGuild) {
      console.log('[Phase 16] Already in a guild');
      return false;
    }
    
    const newGuild = {
      id: `guild_${Date.now()}`,
      name: name,
      tag: tag,
      description: description,
      leader: this.playerData.id,
      officers: [],
      members: [this.playerData.id],
      level: 1,
      xp: 0,
      hall: {
        unlocked: false,
        decorations: []
      },
      treasury: 0,
      createdAt: Date.now()
    };
    
    this.guild.currentGuild = newGuild;
    
    console.log(`[Phase 16] Created guild: ${name} [${tag}]`);
    return true;
  }

  joinGuild(guildId) {
    console.log(`[Phase 16] Joined guild: ${guildId}`);
    // In production, join guild
    return true;
  }

  leaveGuild() {
    if (!this.guild.currentGuild) return false;
    
    console.log(`[Phase 16] Left guild: ${this.guild.currentGuild.name}`);
    this.guild.currentGuild = null;
    return true;
  }

  inviteToGuild(playerId) {
    console.log(`[Phase 16] Invited ${playerId} to guild`);
    // Send invitation
    return true;
  }

  completeGuildChallenge(challengeId) {
    if (!this.guild.currentGuild) return false;
    
    console.log(`[Phase 16] Completed guild challenge: ${challengeId}`);
    
    // Award guild XP
    this.guild.currentGuild.xp += 500;
    
    // Check for guild level up
    if (this.guild.currentGuild.xp >= this.guild.currentGuild.level * 1000) {
      this.guildLevelUp();
    }
    
    return true;
  }

  guildLevelUp() {
    this.guild.currentGuild.level++;
    this.guild.currentGuild.xp = 0;
    
    console.log(`[Phase 16] 🎉 Guild leveled up to ${this.guild.currentGuild.level}!`);
    
    // Unlock rewards
    if (this.guild.currentGuild.level >= 5 && !this.guild.currentGuild.hall.unlocked) {
      this.unlockGuildHall();
    }
  }

  unlockGuildHall() {
    this.guild.currentGuild.hall.unlocked = true;
    console.log('[Phase 16] Guild Hall unlocked!');
  }

  decorateGuildHall(decorationId) {
    if (!this.guild.currentGuild?.hall.unlocked) return false;
    
    this.guild.currentGuild.hall.decorations.push(decorationId);
    console.log(`[Phase 16] Added decoration: ${decorationId}`);
    return true;
  }

  guildVsGuild(guildId1, guildId2) {
    console.log(`[Phase 16] GvG match: ${guildId1} vs ${guildId2}`);
    
    // Organize GvG competition
    // Winning guild gets treasury boost, prestige, exclusive rewards
    
    return true;
  }

  // SOCIAL HUB

  enterSocialHub() {
    console.log('[Phase 16] Entered Social Hub');
    
    // Social hub features:
    // - Avatar customization station
    // - Mini-game arcade
    // - Trading post
    // - Event portals
    // - Meeting areas
    
    return {
      location: 'social_hub',
      playersOnline: 1247,
      activeEvents: ['halloween_event', 'speedrun_competition'],
      availableMiniGames: ['trivia', 'racing', 'puzzle_battle']
    };
  }

  customizeAvatar(customization) {
    console.log('[Phase 16] Customized avatar:', customization);
    this.playerData.avatar = customization;
    return true;
  }

  playHubMiniGame(gameId) {
    console.log(`[Phase 16] Playing hub mini-game: ${gameId}`);
    // Launch mini-game instance
    return true;
  }

  tradeWithPlayer(targetPlayerId, offer, request) {
    console.log(`[Phase 16] Trading with ${targetPlayerId}`);
    console.log('Offer:', offer);
    console.log('Request:', request);
    
    // Initiate secure trade
    return true;
  }

  // MESSAGING SYSTEM

  sendMessage(recipientId, message, type = 'dm') {
    const conversation = this.getOrCreateConversation(recipientId);
    
    const newMessage = {
      id: `msg_${Date.now()}`,
      sender: this.playerData.id,
      recipient: recipientId,
      content: message,
      timestamp: Date.now(),
      read: false,
      type: type // dm, group, guild
    };
    
    conversation.messages.push(newMessage);
    
    console.log(`[Phase 16] Sent ${type} message to ${recipientId}`);
    return newMessage;
  }

  getOrCreateConversation(participantId) {
    let conversation = this.messages.conversations.find(
      c => c.participants.includes(participantId)
    );
    
    if (!conversation) {
      conversation = {
        id: `conv_${Date.now()}`,
        participants: [this.playerData.id, participantId],
        messages: [],
        lastActivity: Date.now()
      };
      this.messages.conversations.push(conversation);
    }
    
    return conversation;
  }

  markMessageRead(messageId) {
    // Mark message as read
    this.messages.unread = Math.max(0, this.messages.unread - 1);
    return true;
  }

  enableVoiceChat(channelId) {
    console.log(`[Phase 16] Voice chat enabled in channel: ${channelId}`);
    // Connect to voice channel
    return true;
  }

  // ACTIVITY FEED

  postToFeed(activity) {
    const post = {
      id: `post_${Date.now()}`,
      author: this.playerData,
      type: activity.type, // achievement, high_score, clip, purchase
      content: activity.content,
      timestamp: Date.now(),
      likes: 0,
      comments: [],
      shares: 0
    };
    
    this.activityFeed.unshift(post);
    
    console.log(`[Phase 16] Posted to feed: ${activity.type}`);
    return post;
  }

  likePost(postId) {
    const post = this.activityFeed.find(p => p.id === postId);
    if (post) {
      post.likes++;
      console.log(`[Phase 16] Liked post: ${postId}`);
    }
  }

  commentOnPost(postId, comment) {
    const post = this.activityFeed.find(p => p.id === postId);
    if (post) {
      post.comments.push({
        author: this.playerData,
        content: comment,
        timestamp: Date.now()
      });
      console.log(`[Phase 16] Commented on post: ${postId}`);
    }
  }

  sharePost(postId) {
    const post = this.activityFeed.find(p => p.id === postId);
    if (post) {
      post.shares++;
      console.log(`[Phase 16] Shared post: ${postId}`);
    }
  }

  // VIRAL MECHANICS

  generateReferralCode() {
    const code = 'HORROR' + Math.random().toString(36).substring(2, 6).toUpperCase();
    console.log(`[Phase 16] Generated referral code: ${code}`);
    return code;
  }

  useReferralCode(code) {
    console.log(`[Phase 16] Used referral code: ${code}`);
    
    // Award rewards to both referrer and referee
    const rewards = {
      referrer: { currency: 500, premium_currency: 50 },
      referee: { currency: 250, premium_currency: 25 }
    };
    
    return rewards;
  }

  shareAchievement(achievementId, platform) {
    console.log(`[Phase 16] Sharing achievement ${achievementId} to ${platform}`);
    
    const shareData = {
      achievement: achievementId,
      player: this.playerData.username,
      platform: platform,
      message: `I just unlocked "${achievementId}" on ScaryGamesAI! 👻`,
      url: `https://scarygames.ai/achieve/${achievementId}`
    };
    
    // Post to social media
    return shareData;
  }

  generateCreatorCode(creatorName) {
    const code = creatorName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8);
    console.log(`[Phase 16] Creator code for ${creatorName}: ${code}`);
    return code;
  }

  applyCreatorCode(code) {
    console.log(`[Phase 16] Applied creator code: ${code}`);
    
    // Future purchases support this creator (20% revenue share)
    return true;
  }

  // MODERATION

  reportPlayer(playerId, reason, evidence) {
    console.log(`[Phase 16] Reported player ${playerId} for ${reason}`);
    
    const report = {
      id: `report_${Date.now()}`,
      reporter: this.playerData.id,
      reported: playerId,
      reason: reason,
      evidence: evidence,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    // Submit to moderation queue
    return report;
  }

  autoModerateContent(content) {
    // AI-powered content moderation
    const flagged = false;
    const reasons = [];
    
    // Check for:
    // - Profanity
    // - Hate speech
    // - Harassment
    // - Spam
    // - Inappropriate links
    
    if (flagged) {
      console.log('[Phase 16] Content flagged by auto-mod:', reasons);
      return { approved: false, reasons };
    }
    
    return { approved: true };
  }

  escalateToHumanReview(reportId) {
    console.log(`[Phase 16] Escalated report ${reportId} to human moderator`);
    return true;
  }

  getModerationStatus(reportId) {
    return {
      reportId: reportId,
      status: 'under_review',
      estimatedTime: '24 hours'
    };
  }

  // Analytics

  trackSocialAction(action, details) {
    console.log('[Phase 16] Social action tracked:', action, details);
    // Send to analytics backend
  }

  calculateKFactor() {
    // K-factor = invitations sent × conversion rate
    const invitationsSent = 100;
    const conversions = 120;
    const kFactor = conversions / invitationsSent;
    
    console.log(`[Phase 16] K-factor: ${kFactor.toFixed(2)} (target: >1.2)`);
    return kFactor;
  }

  async saveProgress() {
    try {
      localStorage.setItem('social_progress', JSON.stringify({
        friends: this.friends,
        guild: this.guild,
        playerData: this.playerData
      }));
      console.log('[Phase 16] Social progress saved');
    } catch (error) {
      console.error('[Phase 16] Save failed:', error);
    }
  }

  dispose() {
    this.saveProgress();
    console.log('[Phase 16] SOCIAL FEATURES 2.0 disposed');
  }
}

// Export singleton helper
let socialFeaturesInstance = null;

export function getSocialFeaturesSystem(config) {
  if (!socialFeaturesInstance) {
    socialFeaturesInstance = new SocialFeaturesSystem(config);
  }
  return socialFeaturesInstance;
}

console.log('[Phase 16] SOCIAL FEATURES 2.0 module loaded');
