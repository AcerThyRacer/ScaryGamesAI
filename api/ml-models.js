/**
 * ML Models Management API
 * Phase 5: AI-Powered Personalization
 * 
 * Endpoints for model training, management, and inference
 * 
 * @module api/ml-models
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Import ML models
const NeuralCollaborativeFilter = require('../services/ml/neuralCollaborativeFiltering');
const ContextualBandit = require('../services/ml/contextualBandit');
const SessionBasedRecommender = require('../services/ml/sessionBasedRecommender');
const FeatureEngineeringPipeline = require('../services/ml/featureEngineering');

// Import database
const postgres = require('../models/postgres');

// Initialize models (singleton pattern)
const models = {
  ncf: null,
  bandit: null,
  sessionRec: null,
  features: null
};

/**
 * Get or create model instance
 */
function getModel(modelType) {
  if (!models[modelType]) {
    switch (modelType) {
      case 'ncf':
        models.ncf = new NeuralCollaborativeFilter({
          numUsers: 10000,
          numItems: 1000,
          embeddingDim: 32
        });
        break;
      case 'bandit':
        models.bandit = new ContextualBandit({
          numArms: 1000,
          contextDim: 20
        });
        break;
      case 'sessionRec':
        models.sessionRec = new SessionBasedRecommender({
          numItems: 1000,
          embeddingDim: 64,
          hiddenSize: 128
        });
        break;
      case 'features':
        models.features = new FeatureEngineeringPipeline();
        break;
    }
  }
  return models[modelType];
}

/**
 * GET /api/v1/ml/models
 * List all available models
 */
router.get('/models', async (req, res) => {
  try {
    const modelList = [];
    
    // Check database for saved models
    const result = await postgres.query(
      'SELECT * FROM ml_models ORDER BY created_at DESC'
    );
    
    for (const row of result.rows) {
      modelList.push({
        id: row.id,
        name: row.model_name,
        type: row.model_type,
        version: row.version,
        status: row.status,
        accuracy: row.metrics?.accuracy,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    }
    
    res.json({
      success: true,
      models: modelList
    });
  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list models'
    });
  }
});

/**
 * GET /api/v1/ml/models/:id
 * Get model details
 */
router.get('/models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await postgres.query(
      'SELECT * FROM ml_models WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }
    
    const model = result.rows[0];
    res.json({
      success: true,
      model: {
        ...model,
        config: model.config || {},
        metrics: model.metrics || {}
      }
    });
  } catch (error) {
    console.error('Get model error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get model'
    });
  }
});

/**
 * POST /api/v1/ml/models/train
 * Train a new model
 */
router.post('/models/train', async (req, res) => {
  const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
  if (!idempotencyKey) {
    return res.status(400).json({ 
      success: false, 
      error: 'idempotency-key required' 
    });
  }
  
  try {
    const { modelType, config = {}, trainingData } = req.body;
    
    if (!modelType || !['ncf', 'sessionRec'].includes(modelType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model type. Must be ncf or sessionRec'
      });
    }
    
    // Create model record
    const modelId = generateId('ml');
    await postgres.query(
      `INSERT INTO ml_models (id, model_name, model_type, version, status, config, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [modelId, `${modelType}_model`, modelType, '1.0.0', 'training', JSON.stringify(config)]
    );
    
    // Start training asynchronously
    trainModelAsync(modelId, modelType, config, trainingData)
      .catch(err => console.error('Async training error:', err));
    
    res.status(202).json({
      success: true,
      modelId,
      status: 'training',
      message: 'Model training started'
    });
  } catch (error) {
    console.error('Train model error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to train model'
    });
  }
});

/**
 * Async model training function
 */
async function trainModelAsync(modelId, modelType, config, trainingData) {
  try {
    const model = getModel(modelType);
    
    // Update status
    await postgres.query(
      'UPDATE ml_models SET status = $1 WHERE id = $2',
      ['training', modelId]
    );
    
    // Train model
    const startTime = Date.now();
    const history = await model.train(trainingData, {
      epochs: config.epochs || 10,
      batchSize: config.batchSize || 64,
      verbose: false
    });
    
    const trainingTime = Date.now() - startTime;
    
    // Calculate final metrics
    const finalMetrics = {
      loss: history.history?.loss?.[history.history.loss.length - 1],
      accuracy: history.history?.acc?.[history.history.acc.length - 1],
      epochs: history.history?.epoch?.length || 0,
      trainingTime
    };
    
    // Save model
    const modelPath = path.join(__dirname, '..', 'models', 'trained', modelId);
    await fs.mkdir(modelPath, { recursive: true });
    await model.save(modelPath);
    
    // Update model record
    await postgres.query(
      `UPDATE ml_models 
       SET status = $1, metrics = $2, model_path = $3, updated_at = NOW()
       WHERE id = $4`,
      ['ready', JSON.stringify(finalMetrics), modelPath, modelId]
    );
    
    console.log(`[ML] Model ${modelId} trained successfully in ${trainingTime}ms`);
  } catch (error) {
    console.error(`[ML] Training failed for ${modelId}:`, error);
    
    await postgres.query(
      `UPDATE ml_models 
       SET status = $1, error_message = $2, updated_at = NOW()
       WHERE id = $3`,
      ['failed', error.message, modelId]
    );
  }
}

/**
 * POST /api/v1/ml/models/:id/predict
 * Get prediction from model
 */
router.post('/models/:id/predict', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, itemId, context } = req.body;
    
    // Get model from database
    const result = await postgres.query(
      'SELECT * FROM ml_models WHERE id = $1 AND status = $2',
      [id, 'ready']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found or not ready'
      });
    }
    
    const modelRecord = result.rows[0];
    const modelType = modelRecord.model_type;
    const model = getModel(modelType);
    
    // Load model if needed
    if (modelRecord.model_path) {
      try {
        await model.load(modelRecord.model_path);
      } catch (err) {
        console.warn('Model load failed, using in-memory:', err);
      }
    }
    
    let prediction;
    
    if (modelType === 'ncf') {
      prediction = await model.predict(userId, itemId);
    } else if (modelType === 'bandit') {
      const featurePipeline = getModel('features');
      const contextFeatures = await featurePipeline.extractContextFeatures(context || {});
      prediction = model.selectArm(contextFeatures);
    } else if (modelType === 'sessionRec') {
      prediction = await model.getRecommendations(context?.sessionHistory || [], 10);
    }
    
    res.json({
      success: true,
      modelId: id,
      prediction
    });
  } catch (error) {
    console.error('Predict error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get prediction'
    });
  }
});

/**
 * POST /api/v1/ml/bandit/select
 * Select arm from contextual bandit
 */
router.post('/bandit/select', async (req, res) => {
  try {
    const { userId, context, availableItems } = req.body;
    
    const bandit = getModel('bandit');
    const featurePipeline = getModel('features');
    
    // Extract context features
    const contextFeatures = await featurePipeline.extractContextFeatures({
      ...context,
      userId
    });
    
    // Select arm
    const selectedArm = bandit.selectArm(
      contextFeatures,
      availableItems?.map(i => i.itemId)
    );
    
    // Get expected reward
    const expectedReward = bandit.getExpectedReward(selectedArm, contextFeatures);
    
    res.json({
      success: true,
      selectedItemId: selectedArm,
      expectedReward,
      exploration: true
    });
  } catch (error) {
    console.error('Bandit select error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to select arm'
    });
  }
});

/**
 * POST /api/v1/ml/bandit/update
 * Update bandit with reward
 */
router.post('/bandit/update', async (req, res) => {
  try {
    const { armId, context, reward } = req.body;
    
    const bandit = getModel('bandit');
    const featurePipeline = getModel('features');
    
    const contextFeatures = await featurePipeline.extractContextFeatures(context || {});
    bandit.update(armId, contextFeatures, reward);
    
    res.json({
      success: true,
      message: 'Bandit updated'
    });
  } catch (error) {
    console.error('Bandit update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bandit'
    });
  }
});

/**
 * POST /api/v1/ml/features/extract
 * Extract features for user/item/context
 */
router.post('/features/extract', async (req, res) => {
  try {
    const { userId, itemId, context } = req.body;
    
    const featurePipeline = getModel('features');
    
    const features = {};
    
    if (userId) {
      // Fetch user data from database
      const userResult = await postgres.query(
        `SELECT u.*, 
                json_agg(DISTINCT jsonb_build_object('gameId', gh.game_id, 'rating', gh.rating)) as play_history
         FROM users u
         LEFT JOIN game_history gh ON u.id = gh.user_id
         WHERE u.id = $1
         GROUP BY u.id`,
        [userId]
      );
      
      if (userResult.rows.length > 0) {
        const userData = userResult.rows[0];
        features.user = await featurePipeline.extractUserFeatures({
          userId: userData.id,
          age: userData.age,
          subscriptionTier: userData.subscription_tier,
          accountCreatedAt: userData.created_at,
          totalPlaytime: userData.total_playtime,
          playHistory: userData.play_history || [],
          sessions: userData.sessions || [],
          preferences: userData.preferences || {},
          loginStreak: userData.login_streak,
          wishlist: userData.wishlist,
          collection: userData.collection
        });
      }
    }
    
    if (itemId) {
      // Fetch item data from database
      const itemResult = await postgres.query(
        'SELECT * FROM games WHERE id = $1',
        [itemId]
      );
      
      if (itemResult.rows.length > 0) {
        const itemData = itemResult.rows[0];
        features.item = await featurePipeline.extractItemFeatures({
          itemId: itemData.id,
          genre: itemData.genre,
          difficulty: itemData.difficulty,
          duration: itemData.avg_duration,
          releaseDate: itemData.release_date,
          isLimitedEdition: itemData.is_limited,
          price: itemData.price,
          playCount: itemData.play_count,
          rating: itemData.rating,
          ratingCount: itemData.rating_count,
          trendingScore: itemData.trending_score
        });
      }
    }
    
    if (context) {
      features.context = await featurePipeline.extractContextFeatures(context);
    }
    
    res.json({
      success: true,
      features
    });
  } catch (error) {
    console.error('Feature extraction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extract features'
    });
  }
});

/**
 * GET /api/v1/ml/stats
 * Get ML system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      models: {},
      cache: {}
    };
    
    // Get model stats
    for (const [modelType, model] of Object.entries(models)) {
      if (model && typeof model.getStats === 'function') {
        stats.models[modelType] = model.getStats();
      }
    }
    
    // Get feature pipeline cache stats
    if (models.features) {
      stats.cache = models.features.getStats();
    }
    
    // Get database model count
    const modelCount = await postgres.query(
      'SELECT COUNT(*) as count, status FROM ml_models GROUP BY status'
    );
    
    stats.database = {
      totalModels: modelCount.rows.reduce((sum, r) => sum + parseInt(r.count), 0),
      byStatus: modelCount.rows.reduce((acc, r) => {
        acc[r.status] = parseInt(r.count);
        return acc;
      }, {})
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
});

/**
 * Helper: Generate unique ID
 */
function generateId(prefix = 'ml') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = router;
