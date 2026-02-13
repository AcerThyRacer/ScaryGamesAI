/**
 * Cache Service
 * Phase 1.1: Redis-first cache with in-memory fallback
 */

const Redis = require('ioredis');

class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (hit.expiresAt && Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return hit.value;
  }

  set(key, value, ttlSeconds = 60) {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
    });
  }

  del(key) {
    this.store.delete(key);
  }

  delPrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

class CacheService {
  constructor() {
    this.memory = new MemoryCache();
    this.redis = null;
    this.redisReady = false;
    this.namespace = process.env.CACHE_NAMESPACE || 'sgai';
    this.initRedis();
  }

  initRedis() {
    if (!process.env.REDIS_URL) return;

    this.redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });

    this.redis.on('error', (err) => {
      this.redisReady = false;
      console.warn('[cache] Redis unavailable, using memory fallback:', err.message);
    });

    this.redis.connect()
      .then(() => {
        this.redisReady = true;
        console.log('[cache] Redis connected');
      })
      .catch((err) => {
        this.redisReady = false;
        console.warn('[cache] Redis connection failed, using memory fallback:', err.message);
      });
  }

  key(input) {
    return `${this.namespace}:${input}`;
  }

  async get(key) {
    const namespaced = this.key(key);
    if (this.redis && this.redisReady) {
      const value = await this.redis.get(namespaced);
      return value;
    }
    return this.memory.get(namespaced);
  }

  async set(key, value, ttlSeconds = 60) {
    const namespaced = this.key(key);
    if (this.redis && this.redisReady) {
      if (ttlSeconds) {
        await this.redis.set(namespaced, value, 'EX', ttlSeconds);
      } else {
        await this.redis.set(namespaced, value);
      }
      return;
    }

    this.memory.set(namespaced, value, ttlSeconds);
  }

  async increment(key, ttlSeconds = 60) {
    const namespaced = this.key(key);

    if (this.redis && this.redisReady) {
      const next = await this.redis.incr(namespaced);
      if (next === 1 && ttlSeconds) {
        await this.redis.expire(namespaced, ttlSeconds);
      }
      return next;
    }

    const current = Number(this.memory.get(namespaced) || 0);
    const next = current + 1;
    this.memory.set(namespaced, next, ttlSeconds);
    return next;
  }

  async del(key) {
    const namespaced = this.key(key);
    if (this.redis && this.redisReady) {
      await this.redis.del(namespaced);
      return;
    }

    this.memory.del(namespaced);
  }

  async delPrefix(prefix) {
    const namespacedPrefix = this.key(prefix);
    if (this.redis && this.redisReady) {
      const stream = this.redis.scanStream({ match: `${namespacedPrefix}*`, count: 100 });
      const pipeline = this.redis.pipeline();

      return new Promise((resolve, reject) => {
        stream.on('data', (keys) => {
          if (keys.length) keys.forEach((k) => pipeline.del(k));
        });
        stream.on('end', async () => {
          await pipeline.exec();
          resolve();
        });
        stream.on('error', reject);
      });
    }

    this.memory.delPrefix(namespacedPrefix);
  }

  async getJson(key) {
    const value = await this.get(key);
    if (!value) return null;

    if (typeof value !== 'string') return value;

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async setJson(key, value, ttlSeconds = 60) {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  status() {
    return {
      provider: this.redis && this.redisReady ? 'redis' : 'memory',
      redisConfigured: !!process.env.REDIS_URL,
      redisReady: !!this.redisReady,
      namespace: this.namespace
    };
  }
}

module.exports = new CacheService();
