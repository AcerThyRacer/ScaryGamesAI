/**
 * Mod Platform API Routes
 * Handles mod browsing, upload, download, and management
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Rate limiters
const searchLimiter = createRateLimiter({
  scope: 'mod-search',
  limit: 60,
  windowSeconds: 60
});

const uploadLimiter = createRateLimiter({
  scope: 'mod-upload',
  limit: 10,
  windowSeconds: 3600 // 10 uploads per hour
});

const downloadLimiter = createRateLimiter({
  scope: 'mod-download',
  limit: 100,
  windowSeconds: 3600
});

// In-memory mod storage (replace with database in production)
const mods = new Map();
const modDownloads = new Map();

// Initialize with sample mods
mods.set('demo-mod-1', {
  id: 'demo-mod-1',
  name: 'Nightmare Creatures Pack',
  description: 'Adds 10 terrifying new enemy types with unique AI behaviors',
  author: 'HorrorMaster',
  authorId: 'user-001',
  version: '2.1.0',
  rating: 4.8,
  votes: 1523,
  downloads: 45678,
  views: 123456,
  size: '15.2 MB',
  uploaded: '2026-01-15T10:30:00Z',
  updated: '2026-02-10T14:20:00Z',
  tags: ['enemies', 'horror', 'gameplay'],
  thumbnail: '/assets/mods/nightmare-creatures-thumb.jpg',
  screenshots: [
    '/assets/mods/nightmare-creatures-1.jpg',
    '/assets/mods/nightmare-creatures-2.jpg'
  ],
  changelog: 'v2.1.0: Added 2 new monsters, fixed bugs',
  dependencies: [],
  compatibility: {
    minGameVersion: '1.5.0',
    maxGameVersion: '2.0.0'
  },
  downloadUrl: '/assets/mods/nightmare-creatures.zip'
});

mods.set('demo-mod-2', {
  id: 'demo-mod-2',
  name: 'Visual Enhancement Overhaul',
  description: 'Complete visual upgrade with new textures, lighting, and post-processing effects',
  author: 'GraphicsGuru',
  authorId: 'user-002',
  version: '3.0.1',
  rating: 4.9,
  votes: 2847,
  downloads: 89012,
  views: 234567,
  size: '125.8 MB',
  uploaded: '2025-12-01T08:00:00Z',
  updated: '2026-02-05T16:45:00Z',
  tags: ['visual', 'graphics', 'enhancement'],
  thumbnail: '/assets/mods/visual-overhaul-thumb.jpg',
  screenshots: [
    '/assets/mods/visual-overhaul-1.jpg',
    '/assets/mods/visual-overhaul-2.jpg',
    '/assets/mods/visual-overhaul-3.jpg'
  ],
  changelog: 'v3.0.1: Performance improvements, bug fixes',
  dependencies: [],
  compatibility: {
    minGameVersion: '1.8.0',
    maxGameVersion: '*'
  },
  downloadUrl: '/assets/mods/visual-overhaul.zip'
});

/**
 * GET /api/mods/search
 * Search for mods with filters
 */
router.get('/search', searchLimiter, async (req, res) => {
  try {
    const {
      q,
      category,
      tags,
      sort = 'popular',
      time,
      page = 1,
      limit = 20
    } = req.query;

    let results = Array.from(mods.values());

    // Text search
    if (q) {
      const query = q.toLowerCase();
      results = results.filter(mod =>
        mod.name.toLowerCase().includes(query) ||
        mod.description.toLowerCase().includes(query) ||
        mod.author.toLowerCase().includes(query) ||
        mod.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (category) {
      results = results.filter(mod =>
        mod.tags.includes(category.toLowerCase())
      );
    }

    // Tags filter
    if (tags) {
      const tagList = tags.split(',');
      results = results.filter(mod =>
        tagList.some(tag => mod.tags.includes(tag.toLowerCase()))
      );
    }

    // Sorting
    switch (sort) {
      case 'popular':
        results.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        results.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
        break;
      case 'updated':
        results.sort((a, b) => new Date(b.updated) - new Date(a.updated));
        break;
    }

    // Time filter
    if (time) {
      const now = new Date();
      const timeFilters = {
        day: 1,
        week: 7,
        month: 30,
        year: 365
      };
      const days = timeFilters[time.toLowerCase()];
      if (days) {
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        results = results.filter(mod => new Date(mod.uploaded) >= cutoff);
      }
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedResults = results.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedResults,
      total: results.length,
      page: parseInt(page),
      totalPages: Math.ceil(results.length / limit)
    });
  } catch (error) {
    console.error('[mods-api] SEARCH_ERROR:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'Failed to search mods'
      }
    });
  }
});

/**
 * GET /api/mods/:id
 * Get mod details
 */
router.get('/:id', async (req, res) => {
  try {
    const mod = mods.get(req.params.id);
    
    if (!mod) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MOD_NOT_FOUND',
          message: 'Mod not found'
        }
      });
    }

    // Increment view count
    mod.views = (mod.views || 0) + 1;

    res.json({
      success: true,
      data: mod
    });
  } catch (error) {
    console.error('[mods-api] GET_MOD_ERROR:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_MOD_ERROR',
        message: 'Failed to get mod details'
      }
    });
  }
});

/**
 * POST /api/mods/:id/download
 * Download mod file
 */
router.post('/:id/download', downloadLimiter, requireAuth, async (req, res) => {
  try {
    const mod = mods.get(req.params.id);
    
    if (!mod) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MOD_NOT_FOUND',
          message: 'Mod not found'
        }
      });
    }

    // Track download
    mod.downloads = (mod.downloads || 0) + 1;
    
    // Log download for analytics
    modDownloads.set(req.params.id, {
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      downloadUrl: mod.downloadUrl,
      filename: `${mod.name.replace(/\s+/g, '-').toLowerCase()}-${mod.version}.zip`
    });
  } catch (error) {
    console.error('[mods-api] DOWNLOAD_ERROR:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_ERROR',
        message: 'Failed to download mod'
      }
    });
  }
});

/**
 * POST /api/mods/upload
 * Upload new mod (authenticated)
 */
router.post('/upload', uploadLimiter, requireAuth, async (req, res) => {
  try {
    const { name, description, version, tags, changelog, metadata } = req.body;

    // Validate required fields
    if (!name || !description || !version) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: name, description, version'
        }
      });
    }

    // Generate mod ID
    const modId = `mod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create mod entry
    const newMod = {
      id: modId,
      name,
      description,
      author: req.user.username,
      authorId: req.user.id,
      version,
      rating: 0,
      votes: 0,
      downloads: 0,
      views: 0,
      uploaded: new Date().toISOString(),
      updated: new Date().toISOString(),
      tags: tags || [],
      changelog: changelog || 'Initial upload',
      ...metadata,
      compatibility: {
        minGameVersion: '1.0.0',
        maxGameVersion: '*'
      }
    };

    // Store mod
    mods.set(modId, newMod);

    console.log('[mods-api] MOD_UPLOADED:', {
      modId,
      userId: req.user.id,
      name
    });

    res.status(201).json({
      success: true,
      data: {
        modId,
        ...newMod
      }
    });
  } catch (error) {
    console.error('[mods-api] UPLOAD_ERROR:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'Failed to upload mod'
      }
    });
  }
});

/**
 * POST /api/mods/:id/rate
 * Rate a mod (authenticated)
 */
router.post('/:id/rate', requireAuth, async (req, res) => {
  try {
    const { rating } = req.body;
    const modId = req.params.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rating must be between 1 and 5'
        }
      });
    }

    const mod = mods.get(modId);
    if (!mod) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MOD_NOT_FOUND',
          message: 'Mod not found'
        }
      });
    }

    // Update rating (simplified - would track user votes in production)
    const totalRating = mod.rating * mod.votes;
    mod.votes++;
    mod.rating = (totalRating + rating) / mod.votes;

    res.json({
      success: true,
      data: {
        rating: mod.rating,
        votes: mod.votes
      }
    });
  } catch (error) {
    console.error('[mods-api] RATE_ERROR:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RATE_ERROR',
        message: 'Failed to rate mod'
      }
    });
  }
});

/**
 * GET /api/mods/user/:userId
 * Get mods by user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const userMods = Array.from(mods.values()).filter(
      mod => mod.authorId === req.params.userId
    );

    res.json({
      success: true,
      data: userMods,
      total: userMods.length
    });
  } catch (error) {
    console.error('[mods-api] GET_USER_MODS_ERROR:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_USER_MODS_ERROR',
        message: 'Failed to get user mods'
      }
    });
  }
});

export default router;
