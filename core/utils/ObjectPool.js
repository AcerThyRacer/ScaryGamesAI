/**
 * Object Pooling System - Phase 1: Memory Management
 * Universal object pooling for all 10 horror games
 * Eliminates garbage collection pauses and improves performance
 */

export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.active = [];
    this.maxSize = 10000;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  acquire() {
    let obj;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      // Create new object if pool is empty (up to maxSize)
      if (this.active.length < this.maxSize) {
        obj = this.createFn();
      } else {
        console.warn('ObjectPool exceeded maxSize, reusing oldest');
        obj = this.active.shift();
      }
    }
    
    if (obj) {
      this.active.push(obj);
    }
    
    return obj;
  }

  release(obj) {
    const idx = this.active.indexOf(obj);
    if (idx !== -1) {
      this.active.splice(idx, 1);
      
      // Reset object before returning to pool
      if (this.resetFn) {
        this.resetFn(obj);
      }
      
      // Return to pool if not too large
      if (this.pool.length < this.maxSize) {
        this.pool.push(obj);
      }
    }
  }

  releaseAll() {
    while (this.active.length > 0) {
      const obj = this.active.pop();
      if (this.resetFn) {
        this.resetFn(obj);
      }
      if (this.pool.length < this.maxSize) {
        this.pool.push(obj);
      }
    }
  }

  get stats() {
    return {
      active: this.active.length,
      pooled: this.pool.length,
      total: this.active.length + this.pool.length
    };
  }

  // Pre-allocate additional objects
  expand(count) {
    for (let i = 0; i < count; i++) {
      if (this.pool.length < this.maxSize) {
        this.pool.push(this.createFn());
      }
    }
  }

  // Shrink pool to save memory
  shrink(targetSize) {
    while (this.pool.length > targetSize) {
      this.pool.pop();
    }
  }
}

/**
 * Particle-specific object pool
 * Optimized for GPU particle systems
 */
export class ParticlePool extends ObjectPool {
  constructor(initialSize = 1000) {
    super(
      () => ({
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        color: { r: 1, g: 1, b: 1, a: 1 },
        active: false
      }),
      (p) => {
        p.x = p.y = p.z = 0;
        p.vx = p.vy = p.vz = 0;
        p.life = 0;
        p.maxLife = 1;
        p.size = 1;
        p.color = { r: 1, g: 1, b: 1, a: 1 };
        p.active = false;
      },
      initialSize
    );
  }

  emit(x, y, z, vx, vy, vz, life, size, color) {
    const particle = this.acquire();
    if (!particle) return null;
    
    particle.x = x;
    particle.y = y;
    particle.z = z;
    particle.vx = vx;
    particle.vy = vy;
    particle.vz = vz;
    particle.life = 0;
    particle.maxLife = life;
    particle.size = size;
    particle.color = { ...color };
    particle.active = true;
    
    return particle;
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life += dt;
      
      if (p.life >= p.maxLife) {
        this.release(p);
        continue;
      }
      
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      
      // Gravity
      p.vy -= 9.8 * dt;
      
      // Air resistance
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.vz *= 0.99;
    }
  }
}

/**
 * Entity pool for game objects (enemies, items, etc.)
 */
export class EntityPool extends ObjectPool {
  constructor(entityType, initialSize = 50) {
    super(
      () => ({
        type: entityType,
        x: 0,
        y: 0,
        z: 0,
        rotation: 0,
        scale: 1,
        active: false,
        health: 100,
        state: 'idle',
        stateTimer: 0,
        data: {}
      }),
      (e) => {
        e.x = e.y = e.z = 0;
        e.rotation = 0;
        e.scale = 1;
        e.active = false;
        e.health = 100;
        e.state = 'idle';
        e.stateTimer = 0;
        e.data = {};
      },
      initialSize
    );
  }

  spawn(x, y, z, data = {}) {
    const entity = this.acquire();
    if (!entity) return null;
    
    entity.x = x;
    entity.y = y;
    entity.z = z;
    entity.active = true;
    entity.data = { ...data };
    
    return entity;
  }
}

export default ObjectPool;
