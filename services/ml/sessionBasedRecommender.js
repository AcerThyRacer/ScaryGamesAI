/**
 * Session-Based Recommendation using GRU4Rec
 * Phase 5: AI-Powered Personalization
 * 
 * Recurrent neural network for sequential recommendation
 * Predicts next item based on session history
 * 
 * @module services/ml/sessionBasedRecommender
 */

const tf = require('@tensorflow/tfjs-node');

class SessionBasedRecommender {
  /**
   * Create session-based recommender
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.numItems = config.numItems || 1000;
    this.embeddingDim = config.embeddingDim || 64;
    this.hiddenSize = config.hiddenSize || 128;
    this.numLayers = config.numLayers || 2;
    this.learningRate = config.learningRate || 0.001;
    this.sequenceLength = config.sequenceLength || 20;
    this.batchSize = config.batchSize || 32;
    
    this.model = null;
    this.isCompiled = false;
    this.trainingHistory = [];
    
    // Session cache for real-time recommendations
    this.sessionCache = new Map(); // sessionId -> session data
    this.itemEmbeddings = null;
    
    // Item metadata for cold start
    this.itemMetadata = new Map(); // itemId -> metadata
  }

  /**
   * Build GRU4Rec model
   */
  buildModel() {
    const input = tf.input({shape: [this.sequenceLength], name: 'input_sequence'});
    
    // Embedding layer
    const embedding = tf.layers.embedding({
      inputDim: this.numItems + 1, // +1 for padding
      outputDim: this.embeddingDim,
      embeddingsInitializer: 'randomNormal',
      maskZero: true,
      name: 'item_embedding'
    }).apply(input);
    
    // GRU layers
    let gruOutput = embedding;
    for (let i = 0; i < this.numLayers; i++) {
      gruOutput = tf.layers.gru({
        units: this.hiddenSize,
        returnSequences: i < this.numLayers - 1,
        dropout: 0.2,
        recurrentDropout: 0.2,
        name: `gru_layer_${i}`
      }).apply(gruOutput);
    }
    
    // Dense layers
    const dense1 = tf.layers.dense({
      units: 64,
      activation: 'relu',
      kernelInitializer: 'heNormal',
      name: 'dense_1'
    }).apply(gruOutput);
    
    const dropout = tf.layers.dropout({ rate: 0.3 }).apply(dense1);
    
    // Output layer (next item prediction)
    const output = tf.layers.dense({
      units: this.numItems,
      activation: 'softmax',
      kernelInitializer: 'glorotUniform',
      name: 'output'
    }).apply(dropout);
    
    this.model = tf.model({
      inputs: input,
      outputs: output,
      name: 'gru4rec'
    });
    
    // Compile with custom loss
    this.model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy', 'topKCategoricalAccuracy']
    });
    
    this.isCompiled = true;
    console.log('[SessionRec] Model built and compiled');
    
    return this.model;
  }

  /**
   * Train the model
   * @param {Array} sessions - Training sessions [[item1, item2, ...], ...]
   * @param {Object} options - Training options
   */
  async train(sessions, options = {}) {
    if (!this.isCompiled) {
      this.buildModel();
    }
    
    const {
      epochs = 10,
      batchSize = this.batchSize,
      validationSplit = 0.2,
      verbose = true
    } = options;
    
    console.log(`[SessionRec] Training with ${sessions.length} sessions...`);
    
    // Prepare sequences
    const { sequences, targets } = this._prepareSequences(sessions);
    
    // Convert to tensors
    const seqTensor = tf.tensor2d(sequences, [sequences.length, this.sequenceLength], 'int32');
    const targetTensor = tf.oneHot(tf.tensor1d(targets, 'int32'), this.numItems);
    
    // Train
    const history = await this.model.fit(seqTensor, targetTensor, {
      epochs,
      batchSize,
      validationSplit,
      verbose,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          this.trainingHistory.push({
            epoch,
            ...logs,
            timestamp: Date.now()
          });
          
          if (verbose) {
            console.log(`[SessionRec] Epoch ${epoch}: loss=${logs.loss.toFixed(4)}, acc=${logs.acc?.toFixed(4)}`);
          }
        }
      }
    });
    
    // Extract item embeddings
    this._extractItemEmbeddings();
    
    // Cleanup
    seqTensor.dispose();
    targetTensor.dispose();
    
    console.log('[SessionRec] Training completed');
    return history;
  }

  /**
   * Prepare sequences for training
   * @param {Array} sessions - Sessions
   * @returns {Object} Prepared data
   */
  _prepareSequences(sessions) {
    const sequences = [];
    const targets = [];
    
    for (const session of sessions) {
      if (session.length < 2) continue;
      
      // Create multiple training examples from each session
      for (let i = 1; i < session.length; i++) {
        const seq = session.slice(Math.max(0, i - this.sequenceLength), i);
        
        // Pad sequence if needed
        while (seq.length < this.sequenceLength) {
          seq.unshift(0); // Padding with 0
        }
        
        sequences.push(seq);
        targets.push(session[i]);
      }
    }
    
    return { sequences, targets };
  }

  /**
   * Extract item embeddings from trained model
   */
  _extractItemEmbeddings() {
    const embeddingLayer = this.model.getLayer('item_embedding');
    this.itemEmbeddings = embeddingLayer.getWeights()[0].dataSync();
    console.log('[SessionRec] Item embeddings extracted');
  }

  /**
   * Get recommendation for current session
   * @param {Array} sessionHistory - Current session [item1, item2, ...]
   * @param {number} topN - Number of recommendations
   * @param {Array} excludeItems - Items to exclude
   * @returns {Promise<Array>} Recommendations
   */
  async getRecommendations(sessionHistory, topN = 10, excludeItems = []) {
    if (!this.model) {
      throw new Error('Model not trained yet');
    }
    
    // Prepare input sequence
    const sequence = sessionHistory.slice(-this.sequenceLength);
    while (sequence.length < this.sequenceLength) {
      sequence.unshift(0);
    }
    
    const inputTensor = tf.tensor2d([sequence], [1, this.sequenceLength], 'int32');
    
    // Get prediction
    const prediction = this.model.predict(inputTensor);
    const probabilities = await prediction.data();
    
    // Convert to item scores
    const scores = [];
    for (let itemId = 1; itemId < this.numItems; itemId++) {
      if (!excludeItems.includes(itemId)) {
        scores.push({
          itemId,
          score: probabilities[itemId],
          source: 'session_based'
        });
      }
    }
    
    // Sort and return top N
    scores.sort((a, b) => b.score - a.score);
    
    inputTensor.dispose();
    prediction.dispose();
    
    return scores.slice(0, topN);
  }

  /**
   * Update session cache
   * @param {string} sessionId - Session ID
   * @param {Object} sessionData - Session data
   */
  updateSession(sessionId, sessionData) {
    this.sessionCache.set(sessionId, {
      ...sessionData,
      lastUpdated: Date.now()
    });
    
    // Limit cache size
    if (this.sessionCache.size > 10000) {
      const oldestKey = this.sessionCache.keys().next().value;
      this.sessionCache.delete(oldestKey);
    }
  }

  /**
   * Get session from cache
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session data
   */
  getSession(sessionId) {
    return this.sessionCache.get(sessionId) || null;
  }

  /**
   * Add item to session
   * @param {string} sessionId - Session ID
   * @param {number} itemId - Item ID
   * @returns {Promise<Array>} Updated recommendations
   */
  async addItemToSession(sessionId, itemId) {
    let session = this.getSession(sessionId);
    
    if (!session) {
      session = {
        sessionId,
        items: [],
        startTime: Date.now()
      };
    }
    
    session.items.push(itemId);
    session.lastUpdated = Date.now();
    this.updateSession(sessionId, session);
    
    // Get updated recommendations
    const recommendations = await this.getRecommendations(
      session.items,
      10,
      session.items // Exclude already viewed items
    );
    
    return recommendations;
  }

  /**
   * Get similar items using embeddings
   * @param {number} itemId - Item ID
   * @param {number} topN - Number of similar items
   * @returns {Array} Similar items
   */
  getSimilarItems(itemId, topN = 10) {
    if (!this.itemEmbeddings) {
      throw new Error('Item embeddings not available');
    }
    
    const itemEmbedding = this._getItemEmbedding(itemId);
    const similarities = [];
    
    for (let otherItemId = 1; otherItemId < this.numItems; otherItemId++) {
      if (otherItemId === itemId) continue;
      
      const otherEmbedding = this._getItemEmbedding(otherItemId);
      const similarity = this._cosineSimilarity(itemEmbedding, otherEmbedding);
      
      similarities.push({
        itemId: otherItemId,
        similarity,
        source: 'embedding_similarity'
      });
    }
    
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topN);
  }

  /**
   * Get item embedding vector
   * @param {number} itemId - Item ID
   * @returns {Float32Array} Embedding vector
   */
  _getItemEmbedding(itemId) {
    const start = itemId * this.embeddingDim;
    return this.itemEmbeddings.slice(start, start + this.embeddingDim);
  }

  /**
   * Calculate cosine similarity
   * @param {Float32Array} vec1 - Vector 1
   * @param {Float32Array} vec2 - Vector 2
   * @returns {number} Similarity
   */
  _cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Set item metadata for cold start
   * @param {number} itemId - Item ID
   * @param {Object} metadata - Metadata
   */
  setItemMetadata(itemId, metadata) {
    this.itemMetadata.set(itemId, metadata);
  }

  /**
   * Get cold start recommendation for new items
   * @param {Object} userPreferences - User preferences
   * @param {number} topN - Number of recommendations
   * @returns {Array} Recommendations
   */
  getColdStartRecommendations(userPreferences, topN = 10) {
    const candidates = [];
    
    for (const [itemId, metadata] of this.itemMetadata.entries()) {
      let score = 0;
      
      // Match genre
      if (userPreferences.preferredGenre && metadata.genre) {
        if (metadata.genre.includes(userPreferences.preferredGenre)) {
          score += 0.5;
        }
      }
      
      // Match difficulty
      if (userPreferences.preferredDifficulty && metadata.difficulty) {
        const diffDiff = Math.abs(metadata.difficulty - userPreferences.preferredDifficulty);
        score += Math.max(0, 1 - diffDiff / 10);
      }
      
      // Popularity bonus
      score += (metadata.popularity || 0) / 100;
      
      candidates.push({
        itemId,
        score,
        source: 'cold_start'
      });
    }
    
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, topN);
  }

  /**
   * Save model
   * @param {string} path - Save path
   */
  async save(path) {
    if (!this.model) {
      throw new Error('No model to save');
    }
    
    await this.model.save(`file://${path}`);
    console.log(`[SessionRec] Model saved to ${path}`);
  }

  /**
   * Load model
   * @param {string} path - Load path
   */
  async load(path) {
    this.model = await tf.loadLayersModel(`file://${path}`);
    this.isCompiled = true;
    this._extractItemEmbeddings();
    console.log(`[SessionRec] Model loaded from ${path}`);
  }

  /**
   * Get model statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      numItems: this.numItems,
      embeddingDim: this.embeddingDim,
      hiddenSize: this.hiddenSize,
      numLayers: this.numLayers,
      sequenceLength: this.sequenceLength,
      isCompiled: this.isCompiled,
      trainingEpochs: this.trainingHistory.length,
      sessionCacheSize: this.sessionCache.size,
      itemMetadataSize: this.itemMetadata.size
    };
  }

  /**
   * Clear session cache
   */
  clearCache() {
    this.sessionCache.clear();
  }

  /**
   * Dispose model
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
    }
    this.sessionCache.clear();
  }
}

module.exports = SessionBasedRecommender;
