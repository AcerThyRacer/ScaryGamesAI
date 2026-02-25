/**
 * Neural Collaborative Filtering (NCF) Model
 * Phase 5: AI-Powered Personalization
 * 
 * Deep learning-based recommendation using TensorFlow.js
 * Combines matrix factorization with multi-layer perceptron
 * 
 * @module services/ml/neuralCollaborativeFiltering
 */

const tf = require('@tensorflow/tfjs-node');

class NeuralCollaborativeFilter {
  /**
   * Create NCF model
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.numUsers = config.numUsers || 10000;
    this.numItems = config.numItems || 1000;
    this.embeddingDim = config.embeddingDim || 32;
    this.learningRate = config.learningRate || 0.001;
    this.batchSize = config.batchSize || 64;
    this.epochs = config.epochs || 10;
    
    this.model = null;
    this.userEmbedding = null;
    this.itemEmbedding = null;
    this.isCompiled = false;
    this.trainingHistory = [];
    
    // Cache for predictions
    this.predictionCache = new Map();
    this.cacheMaxSize = config.cacheMaxSize || 10000;
  }

  /**
   * Build the NCF model architecture
   * GMF + MLP fusion
   */
  buildModel() {
    // User input
    const userInput = tf.input({shape: [1], name: 'user_input'});
    const itemInput = tf.input({shape: [1], name: 'item_input'});

    // User embedding layer
    this.userEmbedding = tf.layers.embedding({
      inputDim: this.numUsers,
      outputDim: this.embeddingDim,
      embeddingsInitializer: 'randomNormal',
      name: 'user_embedding'
    }).apply(userInput);

    // Item embedding layer
    this.itemEmbedding = tf.layers.embedding({
      inputDim: this.numItems,
      outputDim: this.embeddingDim,
      embeddingsInitializer: 'randomNormal',
      name: 'item_embedding'
    }).apply(itemInput);

    // Flatten embeddings
    const userFlat = tf.layers.flatten().apply(this.userEmbedding);
    const itemFlat = tf.layers.flatten().apply(this.itemEmbedding);

    // Element-wise multiplication (GMF component)
    const gmfVector = tf.layers.multiply().apply([userFlat, itemFlat]);

    // Concatenation for MLP
    const mlpVector = tf.layers.concatenate().apply([userFlat, itemFlat]);

    // MLP layers
    const mlp1 = tf.layers.dense({
      units: 64,
      activation: 'relu',
      kernelInitializer: 'heNormal',
      name: 'mlp_dense_1'
    }).apply(mlpVector);
    
    const dropout1 = tf.layers.dropout({ rate: 0.3 }).apply(mlp1);
    
    const mlp2 = tf.layers.dense({
      units: 32,
      activation: 'relu',
      kernelInitializer: 'heNormal',
      name: 'mlp_dense_2'
    }).apply(dropout1);
    
    const dropout2 = tf.layers.dropout({ rate: 0.3 }).apply(mlp2);

    // Fuse GMF and MLP
    const fused = tf.layers.concatenate().apply([gmfVector, mlp2]);

    // Output layer
    const output = tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
      kernelInitializer: 'glorotUniform',
      name: 'prediction'
    }).apply(fused);

    // Create model
    this.model = tf.model({
      inputs: [userInput, itemInput],
      outputs: output,
      name: 'neural_collaborative_filter'
    });

    // Compile model
    this.model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'auc']
    });

    this.isCompiled = true;
    console.log('[NCF] Model built and compiled successfully');
    
    return this.model;
  }

  /**
   * Train the model
   * @param {Array} interactions - Training data [{userId, itemId, rating}]
   * @param {Object} options - Training options
   */
  async train(interactions, options = {}) {
    if (!this.isCompiled) {
      this.buildModel();
    }

    const {
      validationSplit = 0.2,
      epochs = this.epochs,
      batchSize = this.batchSize,
      verbose = true
    } = options;

    console.log(`[NCF] Training with ${interactions.length} interactions...`);

    // Prepare data
    const { userIndices, itemIndices, ratings } = this._prepareData(interactions);

    // Convert to tensors
    const userTensor = tf.tensor2d(userIndices, [userIndices.length, 1], 'int32');
    const itemTensor = tf.tensor2d(itemIndices, [itemIndices.length, 1], 'int32');
    const ratingTensor = tf.tensor2d(ratings, [ratings.length, 1], 'float32');

    // Train model
    const history = await this.model.fit(
      [userTensor, itemTensor],
      ratingTensor,
      {
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
              console.log(`[NCF] Epoch ${epoch}: loss=${logs.loss.toFixed(4)}, acc=${logs.acc?.toFixed(4)}`);
            }
          }
        }
      }
    );

    // Cleanup tensors
    userTensor.dispose();
    itemTensor.dispose();
    ratingTensor.dispose();

    console.log('[NCF] Training completed');
    return history;
  }

  /**
   * Prepare data for training
   * @param {Array} interactions - Interactions
   * @returns {Object} Prepared data
   */
  _prepareData(interactions) {
    const userIndices = [];
    const itemIndices = [];
    const ratings = [];

    for (const interaction of interactions) {
      userIndices.push([interaction.userId]);
      itemIndices.push([interaction.itemId]);
      
      // Convert rating to binary (implicit feedback)
      ratings.push([interaction.rating > 3 ? 1 : 0]);
    }

    return { userIndices, itemIndices, ratings };
  }

  /**
   * Predict rating for user-item pair
   * @param {number} userId - User ID
   * @param {number} itemId - Item ID
   * @returns {Promise<number>} Predicted rating
   */
  async predict(userId, itemId) {
    const cacheKey = `${userId}_${itemId}`;
    if (this.predictionCache.has(cacheKey)) {
      return this.predictionCache.get(cacheKey);
    }

    if (!this.model) {
      throw new Error('Model not trained yet');
    }

    const userTensor = tf.tensor2d([[userId]], [1, 1], 'int32');
    const itemTensor = tf.tensor2d([[itemId]], [1, 1], 'int32');

    const prediction = this.model.predict([userTensor, itemTensor]);
    const rating = (await prediction.data())[0];

    // Cleanup
    userTensor.dispose();
    itemTensor.dispose();
    prediction.dispose();

    // Cache result
    if (this.predictionCache.size >= this.cacheMaxSize) {
      // Remove oldest entry
      const firstKey = this.predictionCache.keys().next().value;
      this.predictionCache.delete(firstKey);
    }
    this.predictionCache.set(cacheKey, rating);

    return rating;
  }

  /**
   * Get top N recommendations for user
   * @param {number} userId - User ID
   * @param {Array} excludedItems - Items to exclude (already played)
   * @param {number} topN - Number of recommendations
   * @returns {Promise<Array>} Recommendations
   */
  async getTopNRecommendations(userId, excludedItems = [], topN = 10) {
    const recommendations = [];
    const excludedSet = new Set(excludedItems);

    for (let itemId = 0; itemId < this.numItems; itemId++) {
      if (excludedSet.has(itemId)) continue;

      const rating = await this.predict(userId, itemId);
      recommendations.push({ itemId, score: rating, source: 'ncf' });
    }

    // Sort by score and return top N
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, topN);
  }

  /**
   * Get user embedding vector
   * @param {number} userId - User ID
   * @returns {Float32Array} Embedding vector
   */
  getUserEmbedding(userId) {
    if (!this.userEmbedding) {
      throw new Error('Model not built yet');
    }

    const userTensor = tf.tensor2d([[userId]], [1, 1], 'int32');
    const embedding = this.userEmbedding.apply(userTensor);
    const data = embedding.dataSync();
    
    userTensor.dispose();
    embedding.dispose();

    return data;
  }

  /**
   * Get item embedding vector
   * @param {number} itemId - Item ID
   * @returns {Float32Array} Embedding vector
   */
  getItemEmbedding(itemId) {
    if (!this.itemEmbedding) {
      throw new Error('Model not built yet');
    }

    const itemTensor = tf.tensor2d([[itemId]], [1, 1], 'int32');
    const embedding = this.itemEmbedding.apply(itemTensor);
    const data = embedding.dataSync();
    
    itemTensor.dispose();
    embedding.dispose();

    return data;
  }

  /**
   * Save model to disk
   * @param {string} path - Save path
   */
  async save(path) {
    if (!this.model) {
      throw new Error('No model to save');
    }

    await this.model.save(`file://${path}`);
    console.log(`[NCF] Model saved to ${path}`);
  }

  /**
   * Load model from disk
   * @param {string} path - Load path
   */
  async load(path) {
    this.model = await tf.loadLayersModel(`file://${path}`);
    this.isCompiled = true;
    console.log(`[NCF] Model loaded from ${path}`);
  }

  /**
   * Get model statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      numUsers: this.numUsers,
      numItems: this.numItems,
      embeddingDim: this.embeddingDim,
      isCompiled: this.isCompiled,
      cacheSize: this.predictionCache.size,
      trainingEpochs: this.trainingHistory.length,
      lastTrainingLoss: this.trainingHistory.length > 0 ? 
        this.trainingHistory[this.trainingHistory.length - 1].loss : null
    };
  }

  /**
   * Clear prediction cache
   */
  clearCache() {
    this.predictionCache.clear();
  }

  /**
   * Dispose model resources
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
    }
    if (this.userEmbedding) {
      this.userEmbedding.dispose();
    }
    if (this.itemEmbedding) {
      this.itemEmbedding.dispose();
    }
    this.predictionCache.clear();
  }
}

module.exports = NeuralCollaborativeFilter;
