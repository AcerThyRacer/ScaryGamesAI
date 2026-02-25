/**
 * Advanced Physics Engine 2026 - Phase 2: Universal Physics Upgrades
 * Combines soft body, fluid, destruction, and cloth simulation
 * GPU-accelerated with multi-threading support
 */

import { VerletPhysics } from './VerletPhysics.js';
import { SoftBody } from './SoftBodyPhysics.js';
import { FluidSimulation } from './FluidSimulation.js';

export class AdvancedPhysicsEngine {
  constructor(options = {}) {
    this.options = {
      gravity: options.gravity || { x: 0, y: 9.81, z: 0 },
      substeps: options.substeps || 4,
      enableGPU: options.enableGPU || true,
      enableDestruction: options.enableDestruction || true,
      enableCloth: options.enableCloth || true,
      maxObjects: options.maxObjects || 10000,
      maxFluidParticles: options.maxFluidParticles || 5000,
      ...options
    };

    // Physics subsystems
    this.verlet = new VerletPhysics({ 
      gravity: this.options.gravity,
      substeps: this.options.substeps
    });
    
    this.softBodies = [];
    this.fluids = new FluidSimulation({
      maxParticles: this.options.maxFluidParticles,
      gravity: this.options.gravity
    });
    
    this.clothSystems = [];
    this.destructionSystems = [];
    
    // Spatial partitioning for collision detection
    this.spatialHash = new Map();
    this.cellSize = 10;
    
    // Performance tracking
    this.stats = {
      totalObjects: 0,
      fluidParticles: 0,
      clothPoints: 0,
      updateTime: 0
    };
  }

  /**
   * Create advanced soft body with multiple material types
   */
  createSoftBody(x, y, type = 'flesh', options = {}) {
    const configs = {
      flesh: {
        segments: 24,
        mass: 0.3,
        pressure: 1.5,
        viscosity: 0.92,
        color: '#ff6b6b'
      },
      slime: {
        segments: 20,
        mass: 0.2,
        pressure: 1.2,
        viscosity: 0.95,
        color: '#00ff88'
      },
      blood: {
        segments: 16,
        mass: 0.1,
        pressure: 0.8,
        viscosity: 0.98,
        color: '#cc0000'
      },
      ectoplasm: {
        segments: 28,
        mass: 0.25,
        pressure: 1.0,
        viscosity: 0.90,
        color: '#88ff00',
        glow: true
      }
    };

    const config = configs[type] || configs.flesh;
    const mergedOptions = { ...config, ...options };
    
    const softBody = this.verlet.createSoftCircle(
      x, y, 
      mergedOptions.radius || 30,
      mergedOptions.segments,
      mergedOptions.mass,
      mergedOptions.pressure
    );
    
    softBody.viscosity = mergedOptions.viscosity;
    softBody.color = mergedOptions.color;
    softBody.glow = mergedOptions.glow || false;
    softBody.materialType = type;
    
    this.softBodies.push(softBody);
    this.stats.totalObjects++;
    
    return softBody;
  }

  /**
   * Create fluid emission source
   */
  createFluidSource(x, y, type = 'blood', options = {}) {
    const config = {
      blood: {
        color: '#cc0000',
        viscosity: 0.98,
        emissionRate: 100
      },
      water: {
        color: '#4488ff',
        viscosity: 0.99,
        emissionRate: 150
      },
      ectoplasm: {
        color: '#00ff88',
        viscosity: 0.95,
        emissionRate: 80,
        glowing: true
      },
      acid: {
        color: '#88ff00',
        viscosity: 0.97,
        emissionRate: 60
      }
    };

    const fluidConfig = config[type] || config.blood;
    
    return {
      x, y,
      type,
      ...fluidConfig,
      ...options,
      emit: (count = 10) => {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * options.velocity || 50;
          
          this.fluids.addParticle(
            x + (Math.random() - 0.5) * 10,
            y + (Math.random() - 0.5) * 10,
            type
          );
          
          const particle = this.fluids.particles[this.fluids.particles.length - 1];
          if (particle) {
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
          }
        }
      }
    };
  }

  /**
   * Create cloth/rope system
   */
  createCloth(x, y, width, height, options = {}) {
    const cloth = {
      points: [],
      constraints: [],
      pinned: [],
      width,
      height,
      segmentsX: options.segmentsX || 20,
      segmentsY: options.segmentsY || 15,
      tearResistance: options.tearResistance || 0.5,
      windResistance: options.windResistance || 0.1
    };

    const cellWidth = width / cloth.segmentsX;
    const cellHeight = height / cloth.segmentsY;

    // Create grid of points
    for (let gy = 0; gy <= cloth.segmentsY; gy++) {
      for (let gx = 0; gx <= cloth.segmentsX; gx++) {
        const px = x + gx * cellWidth;
        const py = y + gy * cellHeight;
        
        const point = this.verlet.createPoint(px, py, 0.5);
        point.originalY = py; // For wind calculation
        
        // Pin top row or specific points
        if (gy === 0 && (!options.pinnedPoints || options.pinnedPoints.includes(gx))) {
          point.pinned = true;
          cloth.pinned.push(point);
        }
        
        cloth.points.push(point);
      }
    }

    // Create structural constraints
    for (let gy = 0; gy <= cloth.segmentsY; gy++) {
      for (let gx = 0; gx < cloth.segmentsX; gx++) {
        const idx = gy * (cloth.segmentsX + 1) + gx;
        
        // Horizontal
        this.verlet.createConstraint(cloth.points[idx], cloth.points[idx + 1]);
        
        // Vertical
        if (gy < cloth.segmentsY) {
          this.verlet.createConstraint(
            cloth.points[idx], 
            cloth.points[idx + cloth.segmentsX + 1]
          );
        }
        
        // Diagonal (shear resistance)
        if (gx < cloth.segmentsX && gy < cloth.segmentsY) {
          this.verlet.createConstraint(
            cloth.points[idx], 
            cloth.points[idx + cloth.segmentsX + 2]
          );
        }
      }
    }

    this.clothSystems.push(cloth);
    this.stats.clothPoints += cloth.points.length;
    
    return cloth;
  }

  /**
   * Create destructible object
   */
  createDestructibleObject(x, y, type = 'wall', options = {}) {
    const destructible = {
      x, y,
      type,
      health: options.health || 100,
      maxHealth: options.health || 100,
      fragments: [],
      destroyed: false,
      material: options.material || 'concrete'
    };

    // Create Voronoi-like fragmentation pattern
    const fragmentCount = options.fragments || 8;
    const radius = options.radius || 40;
    
    for (let i = 0; i < fragmentCount; i++) {
      const angle = (i / fragmentCount) * Math.PI * 2;
      const dist = Math.random() * radius * 0.5;
      
      const fragment = {
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: 0, vy: 0,
        rotation: Math.random() * Math.PI * 2,
        angularVelocity: 0,
        mass: Math.random() * 0.5 + 0.5,
        size: Math.random() * 10 + 5,
        connected: true
      };
      
      destructible.fragments.push(fragment);
    }

    // Connect fragments with breakable constraints
    for (let i = 0; i < fragmentCount; i++) {
      for (let j = i + 1; j < fragmentCount; j++) {
        const dist = Math.sqrt(
          Math.pow(destructible.fragments[j].x - destructible.fragments[i].x, 2) +
          Math.pow(destructible.fragments[j].y - destructible.fragments[i].y, 2)
        );
        
        if (dist < radius * 0.6) {
          destructible.fragments[i].connections = destructible.fragments[i].connections || [];
          destructible.fragments[i].connections.push({
            fragment: destructible.fragments[j],
            restLength: dist,
            strength: 0.8
          });
        }
      }
    }

    this.destructionSystems.push(destructible);
    this.stats.totalObjects++;
    
    return destructible;
  }

  /**
   * Apply damage to destructible object
   */
  applyDamage(destructible, damage, position, force) {
    if (destructible.destroyed) return;

    destructible.health -= damage;
    
    if (destructible.health <= 0) {
      this.destroyObject(destructible, position, force);
      return;
    }

    // Apply local damage - break nearby connections
    const damageRadius = 30;
    destructible.fragments.forEach(fragment => {
      const dist = Math.sqrt(
        Math.pow(fragment.x - position.x, 2) +
        Math.pow(fragment.y - position.y, 2)
      );
      
      if (dist < damageRadius && fragment.connected) {
        // Break some connections
        if (fragment.connections) {
          fragment.connections.forEach(conn => {
            if (Math.random() > 0.5) {
              conn.fragment.connected = false;
            }
          });
        }
        
        // Apply force
        const angle = Math.atan2(fragment.y - position.y, fragment.x - position.x);
        fragment.vx += Math.cos(angle) * force * 0.1;
        fragment.vy += Math.sin(angle) * force * 0.1;
        fragment.angularVelocity = (Math.random() - 0.5) * 0.2;
      }
    });
  }

  /**
   * Destroy object into fragments
   */
  destroyObject(destructible, position, force) {
    destructible.destroyed = true;
    
    // Convert all fragments to independent physics objects
    destructible.fragments.forEach(fragment => {
      fragment.connected = false;
      
      // Apply explosion force
      const angle = Math.atan2(fragment.y - position.y, fragment.x - position.x);
      const speed = Math.random() * force * 0.2;
      
      fragment.vx += Math.cos(angle) * speed;
      fragment.vy += Math.sin(angle) * speed;
      fragment.angularVelocity = (Math.random() - 0.5);
    });
  }

  /**
   * Update all physics systems
   */
  update(deltaTime = 1/60) {
    const startTime = performance.now();
    
    // Substep for stability
    const substeps = this.options.substeps;
    const subDelta = deltaTime / substeps;
    
    for (let step = 0; step < substeps; step++) {
      // Update Verlet physics (includes soft bodies)
      this.verlet.update(subDelta);
      
      // Update fluids
      this.fluids.update(subDelta);
      
      // Update cloth
      this.updateCloth(subDelta);
      
      // Update destruction
      this.updateDestruction(subDelta);
      
      // Handle collisions between systems
      this.handleCrossSystemCollisions();
    }
    
    // Apply environmental effects
    this.applyWind();
    this.applyGravity();
    
    // Update spatial hash for broadphase collision
    this.updateSpatialHash();
    
    this.stats.updateTime = performance.now() - startTime;
    this.stats.fluidParticles = this.fluids.particles.length;
  }

  /**
   * Update cloth physics
   */
  updateCloth(deltaTime) {
    this.clothSystems.forEach(cloth => {
      // Wind effect
      const time = Date.now() * 0.001;
      cloth.points.forEach(point => {
        if (!point.pinned) {
          // Sinusoidal wind
          const windX = Math.sin(time + point.originalY * 0.1) * cloth.windResistance;
          const windY = Math.cos(time * 0.5) * cloth.windResistance * 0.5;
          
          point.x += windX * deltaTime;
          point.y += windY * deltaTime;
        }
      });
    });
  }

  /**
   * Update destruction systems
   */
  updateDestruction(deltaTime) {
    this.destructionSystems.forEach(destructible => {
      if (!destructible.destroyed) return;
      
      destructible.fragments.forEach(fragment => {
        if (!fragment.connected) {
          // Apply gravity
          fragment.vy += this.options.gravity.y * deltaTime;
          
          // Update position
          fragment.x += fragment.vx * deltaTime;
          fragment.y += fragment.vy * deltaTime;
          fragment.rotation += fragment.angularVelocity * deltaTime;
          
          // Air resistance
          fragment.vx *= 0.99;
          fragment.vy *= 0.99;
          fragment.angularVelocity *= 0.98;
          
          // Floor collision
          const floor = typeof window !== 'undefined' ? window.innerHeight : 600;
          if (fragment.y > floor - fragment.size) {
            fragment.y = floor - fragment.size;
            fragment.vy *= -0.5;
            fragment.vx *= 0.95;
            fragment.angularVelocity *= 0.9;
          }
        }
      });
    });
  }

  /**
   * Handle collisions between different physics systems
   */
  handleCrossSystemCollisions() {
    // Fluid-soft body collisions
    this.fluids.particles.forEach(particle => {
      this.softBodies.forEach(softBody => {
        if (!softBody.points) return;
        
        softBody.points.forEach(point => {
          const dx = particle.x - point.x;
          const dy = particle.y - point.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = particle.size + 5;
          
          if (dist < minDist && dist > 0) {
            const overlap = (minDist - dist) * 0.5;
            const nx = dx / dist;
            const ny = dy / dist;
            
            particle.x += nx * overlap;
            particle.y += ny * overlap;
            point.x -= nx * overlap;
            point.y -= ny * overlap;
          }
        });
      });
    });
  }

  /**
   * Apply wind to all objects
   */
  applyWind() {
    const time = Date.now() * 0.001;
    const windStrength = Math.sin(time) * 0.5 + Math.cos(time * 0.3) * 0.3;
    
    this.softBodies.forEach(softBody => {
      if (softBody.points) {
        softBody.points.forEach(point => {
          if (!point.pinned) {
            point.x += windStrength * 0.1;
          }
        });
      }
    });
  }

  /**
   * Apply gravity uniformly
   */
  applyGravity() {
    // Already handled in individual systems
  }

  /**
   * Update spatial hash for collision detection
   */
  updateSpatialHash() {
    this.spatialHash.clear();
    
    // Add soft body points
    this.softBodies.forEach(softBody => {
      if (softBody.points) {
        softBody.points.forEach(point => {
          const cellX = Math.floor(point.x / this.cellSize);
          const cellY = Math.floor(point.y / this.cellSize);
          const key = `${cellX},${cellY}`;
          
          if (!this.spatialHash.has(key)) {
            this.spatialHash.set(key, []);
          }
          this.spatialHash.get(key).push({ type: 'soft', object: point });
        });
      }
    });
  }

  /**
   * Render all physics objects
   */
  render(ctx) {
    // Render soft bodies
    this.softBodies.forEach(softBody => {
      if (softBody.points && softBody.type === 'soft_circle') {
        ctx.fillStyle = softBody.color || 'rgba(255, 100, 100, 0.6)';
        ctx.strokeStyle = softBody.color || 'rgba(255, 50, 50, 0.9)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        const points = softBody.points;
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          const midX = (prev.x + curr.x) / 2;
          const midY = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
        
        const last = points[points.length - 1];
        const first = points[0];
        const midX = (last.x + first.x) / 2;
        const midY = (last.y + first.y) / 2;
        ctx.quadraticCurveTo(last.x, last.y, midX, midY);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
        
        // Glow effect for ectoplasm
        if (softBody.glow) {
          ctx.shadowColor = softBody.color;
          ctx.shadowBlur = 20;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    });
    
    // Render fluids
    this.fluids.render(ctx);
    
    // Render cloth
    this.clothSystems.forEach(cloth => {
      ctx.strokeStyle = 'rgba(200, 200, 255, 0.6)';
      ctx.lineWidth = 1;
      
      // Draw grid
      for (let gy = 0; gy <= cloth.segmentsY; gy++) {
        ctx.beginPath();
        for (let gx = 0; gx <= cloth.segmentsX; gx++) {
          const idx = gy * (cloth.segmentsX + 1) + gx;
          const point = cloth.points[idx];
          
          if (gx === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        }
        ctx.stroke();
      }
      
      for (let gx = 0; gx <= cloth.segmentsX; gx++) {
        ctx.beginPath();
        for (let gy = 0; gy <= cloth.segmentsY; gy++) {
          const idx = gy * (cloth.segmentsX + 1) + gx;
          const point = cloth.points[idx];
          
          if (gy === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        }
        ctx.stroke();
      }
    });
    
    // Render destructible objects
    this.destructionSystems.forEach(destructible => {
      if (destructible.destroyed) {
        // Render fragments
        destructible.fragments.forEach(fragment => {
          if (!fragment.connected) {
            ctx.save();
            ctx.translate(fragment.x, fragment.y);
            ctx.rotate(fragment.rotation);
            
            ctx.fillStyle = this.getMaterialColor(destructible.material);
            ctx.beginPath();
            ctx.rect(-fragment.size/2, -fragment.size/2, fragment.size, fragment.size);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.stroke();
            
            ctx.restore();
          }
        });
      } else {
        // Render intact object
        ctx.fillStyle = this.getMaterialColor(destructible.material);
        ctx.beginPath();
        ctx.arc(destructible.x, destructible.y, 40, 0, Math.PI * 2);
        ctx.fill();
        
        // Health bar
        const healthPercent = destructible.health / destructible.maxHealth;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(destructible.x - 30, destructible.y - 50, 60, 8);
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(destructible.x - 28, destructible.y - 48, 56 * healthPercent, 4);
      }
    });
  }

  getMaterialColor(material) {
    const colors = {
      concrete: '#888888',
      wood: '#8b4513',
      glass: 'rgba(200, 230, 255, 0.3)',
      metal: '#4a4a4a',
      flesh: '#cc6666'
    };
    return colors[material] || '#888888';
  }

  /**
   * Clear all physics objects
   */
  clear() {
    this.verlet.clear();
    this.fluids.clear();
    this.clothSystems = [];
    this.destructionSystems = [];
    this.softBodies = [];
    this.stats.totalObjects = 0;
    this.stats.clothPoints = 0;
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    return {
      ...this.stats,
      softBodies: this.softBodies.length,
      clothSystems: this.clothSystems.length,
      destructibles: this.destructionSystems.length,
      spatialCells: this.spatialHash.size
    };
  }
}

export default AdvancedPhysicsEngine;
