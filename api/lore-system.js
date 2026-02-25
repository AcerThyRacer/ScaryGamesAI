/**
 * Cross-Game Lore System - Phase 41: Metaverse Layer
 * Tracks narrative elements, discoveries, and achievements across all games
 * Creates interconnected storytelling experience
 */

export class LoreSystem {
  constructor(options = {}) {
    this.options = {
      persistenceEnabled: options.persistence !== false,
      storageKey: options.storageKey || 'scarygames_lore',
      ...options
    };

    // Player's lore collection
    this.playerLore = {
      discoveredFacts: new Map(),
      collectedArtifacts: new Map(),
      encounteredEntities: new Map(),
      unlockedSecrets: new Map(),
      timelineProgress: new Map(),
      gameProgress: new Map()
    };

    // Global lore database (would be populated from server)
    this.loreDatabase = new Map();
    
    // Cross-game connections
    this.connections = {
      sharedCharacters: [],
      recurringLocations: [],
      connectedEvents: [],
      easterEggs: []
    };

    // Callbacks
    this.callbacks = {
      onDiscovery: null,
      onConnectionFound: null,
      onSecretUnlocked: null,
      onTimelineUpdate: null
    };

    // Load saved data
    if (this.options.persistenceEnabled) {
      this.load();
    }
  }

  /**
   * Discover a lore element
   */
  discover(element) {
    const { type, id, gameId, data } = element;
    
    const discovery = {
      id,
      type, // 'fact', 'artifact', 'entity', 'secret', 'location'
      gameId,
      data,
      discoveredAt: Date.now(),
      context: {
        game: gameId,
        timestamp: Date.now(),
        playerState: data.playerState || {}
      }
    };

    // Add to appropriate collection
    switch (type) {
      case 'fact':
        this.playerLore.discoveredFacts.set(id, discovery);
        break;
      case 'artifact':
        this.playerLore.collectedArtifacts.set(id, discovery);
        break;
      case 'entity':
        this.playerLore.encounteredEntities.set(id, discovery);
        break;
      case 'secret':
        this.playerLore.unlockedSecrets.set(id, discovery);
        break;
      case 'location':
        this.playerLore.timelineProgress.set(id, discovery);
        break;
    }

    // Check for cross-game connections
    this.checkConnections(discovery);

    // Update timeline
    this.updateTimeline(gameId, discovery);

    // Notify callback
    if (this.callbacks.onDiscovery) {
      this.callbacks.onDiscovery(discovery);
    }

    // Save if persistence enabled
    if (this.options.persistenceEnabled) {
      this.save();
    }

    return discovery;
  }

  /**
   * Check if discovery connects to other games
   */
  checkConnections(discovery) {
    const connections = [];

    // Check shared characters
    this.connections.sharedCharacters.forEach(char => {
      if (discovery.data.character === char.name) {
        connections.push({
          type: 'character',
          name: char.name,
          games: char.appearances,
          description: `${char.name} appears in multiple games`
        });
      }
    });

    // Check recurring locations
    this.connections.recurringLocations.forEach(loc => {
      if (discovery.data.location === loc.name) {
        connections.push({
          type: 'location',
          name: loc.name,
          games: loc.appearances,
          description: `This location connects multiple games`
        });
      }
    });

    // Check connected events
    this.connections.connectedEvents.forEach(event => {
      if (discovery.data.event === event.id) {
        connections.push({
          type: 'event',
          name: event.name,
          description: event.description
        });
      }
    });

    // Notify if connections found
    if (connections.length > 0 && this.callbacks.onConnectionFound) {
      this.callbacks.onConnectionFound({
        discovery,
        connections
      });
    }

    return connections;
  }

  /**
   * Update timeline for a game
   */
  updateTimeline(gameId, discovery) {
    if (!this.playerLore.timelineProgress.has(gameId)) {
      this.playerLore.timelineProgress.set(gameId, []);
    }

    const timeline = this.playerLore.timelineProgress.get(gameId);
    timeline.push({
      ...discovery,
      order: timeline.length
    });

    if (this.callbacks.onTimelineUpdate) {
      this.callbacks.onTimelineUpdate({
        gameId,
        timeline
      });
    }
  }

  /**
   * Record game progress
   */
  recordGameProgress(gameId, progress) {
    this.playerLore.gameProgress.set(gameId, {
      gameId,
      completionPercent: progress.completion || 0,
      achievements: progress.achievements || [],
      playtimeSeconds: progress.playtime || 0,
      difficulty: progress.difficulty || 'normal',
      lastPlayed: Date.now()
    });

    if (this.options.persistenceEnabled) {
      this.save();
    }
  }

  /**
   * Get lore by type
   */
  getLore(type, id) {
    switch (type) {
      case 'fact':
        return this.playerLore.discoveredFacts.get(id);
      case 'artifact':
        return this.playerLore.collectedArtifacts.get(id);
      case 'entity':
        return this.playerLore.encounteredEntities.get(id);
      case 'secret':
        return this.playerLore.unlockedSecrets.get(id);
      default:
        return null;
    }
  }

  /**
   * Get all lore for a specific game
   */
  getGameLore(gameId) {
    const gameLore = {
      facts: [],
      artifacts: [],
      entities: [],
      secrets: [],
      timeline: []
    };

    this.playerLore.discoveredFacts.forEach(fact => {
      if (fact.gameId === gameId) gameLore.facts.push(fact);
    });

    this.playerLore.collectedArtifacts.forEach(artifact => {
      if (artifact.gameId === gameId) gameLore.artifacts.push(artifact);
    });

    this.playerLore.encounteredEntities.forEach(entity => {
      if (entity.gameId === gameId) gameLore.entities.push(entity);
    });

    this.playerLore.unlockedSecrets.forEach(secret => {
      if (secret.gameId === gameId) gameLore.secrets.push(secret);
    });

    gameLore.timeline = this.playerLore.timelineProgress.get(gameId) || [];

    return gameLore;
  }

  /**
   * Get cross-game connections
   */
  getCrossGameConnections() {
    const connections = {
      characterAppearances: {},
      locationAppearances: {},
      sharedSecrets: [],
      timelineConnections: []
    };

    // Aggregate character appearances
    this.playerLore.encounteredEntities.forEach(entity => {
      const charName = entity.data.character;
      if (charName) {
        if (!connections.characterAppearances[charName]) {
          connections.characterAppearances[charName] = [];
        }
        connections.characterAppearances[charName].push(entity.gameId);
      }
    });

    // Find characters appearing in multiple games
    Object.entries(connections.characterAppearances).forEach(([name, games]) => {
      if (games.length > 1) {
        connections.sharedSecrets.push({
          type: 'character',
          name,
          games: [...new Set(games)],
          description: `${name} has appeared in ${games.length} different games`
        });
      }
    });

    return connections;
  }

  /**
   * Get overall progression statistics
   */
  getProgressionStats() {
    const stats = {
      totalGames: this.playerLore.gameProgress.size,
      totalDiscoveries: 0,
      totalPlaytimeSeconds: 0,
      completionRates: {},
      favoriteGenre: null
    };

    let totalDiscoveries = 0;
    this.playerLore.discoveredFacts.forEach(() => totalDiscoveries++);
    this.playerLore.collectedArtifacts.forEach(() => totalDiscoveries++);
    this.playerLore.encounteredEntities.forEach(() => totalDiscoveries++);
    this.playerLore.unlockedSecrets.forEach(() => totalDiscoveries++);
    stats.totalDiscoveries = totalDiscoveries;

    this.playerLore.gameProgress.forEach((progress, gameId) => {
      stats.totalPlaytimeSeconds += progress.playtimeSeconds || 0;
      stats.completionRates[gameId] = progress.completionPercent || 0;
    });

    return stats;
  }

  /**
   * Export lore data for sharing or backup
   */
  exportData() {
    return {
      version: '1.0',
      exportedAt: Date.now(),
      playerLore: {
        discoveredFacts: Array.from(this.playerLore.discoveredFacts.values()),
        collectedArtifacts: Array.from(this.playerLore.collectedArtifacts.values()),
        encounteredEntities: Array.from(this.playerLore.encounteredEntities.values()),
        unlockedSecrets: Array.from(this.playerLore.unlockedSecrets.values()),
        gameProgress: Array.from(this.playerLore.gameProgress.values())
      },
      connections: this.getCrossGameConnections(),
      stats: this.getProgressionStats()
    };
  }

  /**
   * Import lore data
   */
  importData(data) {
    try {
      // Clear current data
      this.playerLore.discoveredFacts.clear();
      this.playerLore.collectedArtifacts.clear();
      this.playerLore.encounteredEntities.clear();
      this.playerLore.unlockedSecrets.clear();
      this.playerLore.gameProgress.clear();
      this.playerLore.timelineProgress.clear();

      // Import new data
      data.playerLore.discoveredFacts.forEach(fact => {
        this.playerLore.discoveredFacts.set(fact.id, fact);
      });

      data.playerLore.collectedArtifacts.forEach(artifact => {
        this.playerLore.collectedArtifacts.set(artifact.id, artifact);
      });

      data.playerLore.encounteredEntities.forEach(entity => {
        this.playerLore.encounteredEntities.set(entity.id, entity);
      });

      data.playerLore.unlockedSecrets.forEach(secret => {
        this.playerLore.unlockedSecrets.set(secret.id, secret);
      });

      data.playerLore.gameProgress.forEach(progress => {
        this.playerLore.gameProgress.set(progress.gameId, progress);
      });

      if (this.options.persistenceEnabled) {
        this.save();
      }

      return true;
    } catch (error) {
      console.error('Failed to import lore data:', error);
      return false;
    }
  }

  /**
   * Save to persistent storage
   */
  save() {
    try {
      const data = this.exportData();
      localStorage.setItem(this.options.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save lore data:', error);
      return false;
    }
  }

  /**
   * Load from persistent storage
   */
  load() {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (!stored) return false;

      const data = JSON.parse(stored);
      return this.importData(data);
    } catch (error) {
      console.error('Failed to load lore data:', error);
      return false;
    }
  }

  /**
   * Register callbacks
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }

  /**
   * Clear all data
   */
  clear() {
    this.playerLore.discoveredFacts.clear();
    this.playerLore.collectedArtifacts.clear();
    this.playerLore.encounteredEntities.clear();
    this.playerLore.unlockedSecrets.clear();
    this.playerLore.gameProgress.clear();
    this.playerLore.timelineProgress.clear();

    if (this.options.persistenceEnabled) {
      this.save();
    }
  }
}

export default LoreSystem;
