/**
 * Fluid Simulation - Phase 5: Physics & Interaction
 * Blood, water, and ectoplasm physics for horror games
 */

export class FluidSimulation {
  constructor(options = {}) {
    this.particles = [];
    this.maxParticles = options.maxParticles || 2000;
    this.gravity = options.gravity || { x: 0, y: 9.81 };
    this.viscosity = options.viscosity || 0.98;
    this.pressureMultiplier = options.pressureMultiplier || 0.5;
    this.spacing = options.spacing || 5;
    this.smoothingRadius = options.smoothingRadius || 15;
    this.restDensity = options.restDensity || 1;
    this.gasConstant = options.gasConstant || 2000;
    this.dt = options.dt || 1 / 60;
    this.spatialHash = new Map();
  }

  /**
   * Add fluid particle
   */
  addParticle(x, y, type = 'blood') {
    if (this.particles.length >= this.maxParticles) return null;
    
    const particle = {
      x, y,
      oldX: x,
      oldY: y,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      density: 0,
      pressure: 0,
      type,
      color: this.getFluidColor(type),
      size: this.spacing * 0.8,
      id: this.particles.length
    };
    
    this.particles.push(particle);
    return particle;
  }

  /**
   * Get fluid color by type
   */
  getFluidColor(type) {
    const colors = {
      blood: '#cc0000',
      water: '#4488ff',
      ectoplasm: '#00ff88',
      acid: '#88ff00',
      oil: '#221100'
    };
    return colors[type] || '#cc0000';
  }

  /**
   * Update fluid simulation using SPH (Smoothed Particle Hydrodynamics)
   */
  update(deltaTime = this.dt) {
    // Update spatial hash
    this.updateSpatialHash();
    
    // Calculate densities and pressures
    this.calculateDensities();
    this.calculatePressures();
    
    // Apply forces
    this.applyForces();
    
    // Integrate positions
    this.integrate(deltaTime);
    
    // Handle boundary collisions
    this.handleBoundaries();
    
    // Limit particles
    if (this.particles.length > this.maxParticles) {
      this.particles.splice(0, this.particles.length - this.maxParticles);
    }
  }

  /**
   * Update spatial hash for neighbor lookup
   */
  updateSpatialHash() {
    this.spatialHash.clear();
    
    this.particles.forEach(particle => {
      const cellX = Math.floor(particle.x / this.smoothingRadius);
      const cellY = Math.floor(particle.y / this.smoothingRadius);
      const key = `${cellX},${cellY}`;
      
      if (!this.spatialHash.has(key)) {
        this.spatialHash.set(key, []);
      }
      this.spatialHash.get(key).push(particle);
    });
  }

  /**
   * Get neighboring particles
   */
  getNeighbors(particle) {
    const cellX = Math.floor(particle.x / this.smoothingRadius);
    const cellY = Math.floor(particle.y / this.smoothingRadius);
    const neighbors = [];
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cell = this.spatialHash.get(key);
        if (cell) {
          neighbors.push(...cell);
        }
      }
    }
    
    return neighbors;
  }

  /**
   * Smoothing kernel function
   */
  kernel(r) {
    const h = this.smoothingRadius;
    if (r >= h) return 0;
    
    const factor = 315 / (64 * Math.PI * Math.pow(h, 9));
    return factor * Math.pow(h * h - r * r, 3);
  }

  /**
   * Gradient of smoothing kernel
   */
  kernelGradient(r) {
    const h = this.smoothingRadius;
    if (r >= h) return 0;
    
    const factor = -45 / (Math.PI * Math.pow(h, 6));
    return factor * Math.pow(h - r, 2);
  }

  /**
   * Calculate densities for all particles
   */
  calculateDensities() {
    this.particles.forEach(particle => {
      let density = 0;
      const neighbors = this.getNeighbors(particle);
      
      neighbors.forEach(neighbor => {
        const dx = neighbor.x - particle.x;
        const dy = neighbor.y - particle.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        density += neighbor.mass || 1 * this.kernel(r);
      });
      
      particle.density = density;
    });
  }

  /**
   * Calculate pressures from densities
   */
  calculatePressures() {
    this.particles.forEach(particle => {
      particle.pressure = this.gasConstant * (particle.density - this.restDensity);
    });
  }

  /**
   * Apply forces to particles
   */
  applyForces() {
    this.particles.forEach(particle => {
      // Reset forces
      particle.fx = 0;
      particle.fy = 0;
      
      // Gravity
      particle.fx += this.gravity.x * (particle.mass || 1);
      particle.fy += this.gravity.y * (particle.mass || 1);
      
      // Pressure forces
      const neighbors = this.getNeighbors(particle);
      neighbors.forEach(neighbor => {
        if (neighbor === particle) return;
        
        const dx = neighbor.x - particle.x;
        const dy = neighbor.y - particle.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        
        if (r > 0 && r < this.smoothingRadius) {
          const pressureForce = -0.5 * (particle.pressure + neighbor.pressure) / 
                               Math.max(particle.density, neighbor.density);
          const gradient = this.kernelGradient(r);
          
          const fx = pressureForce * gradient * (dx / r);
          const fy = pressureForce * gradient * (dy / r);
          
          particle.fx += fx;
          particle.fy += fy;
        }
      });
      
      // Viscosity forces
      neighbors.forEach(neighbor => {
        if (neighbor === particle) return;
        
        const dvx = neighbor.vx - particle.vx;
        const dvy = neighbor.vy - particle.vy;
        
        particle.fx += this.viscosity * dvx;
        particle.fy += this.viscosity * dvy;
      });
    });
  }

  /**
   * Integrate particle positions
   */
  integrate(deltaTime) {
    this.particles.forEach(particle => {
      const mass = particle.mass || 1;
      
      // Update velocities
      particle.vx += particle.fx / mass * deltaTime;
      particle.vy += particle.fy / mass * deltaTime;
      
      // Apply damping
      particle.vx *= 0.99;
      particle.vy *= 0.99;
      
      // Update positions
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
    });
  }

  /**
   * Handle boundary collisions
   */
  handleBoundaries() {
    const width = typeof window !== 'undefined' ? window.innerWidth : 800;
    const height = typeof window !== 'undefined' ? window.innerHeight : 600;
    
    this.particles.forEach(particle => {
      // Floor
      if (particle.y > height - this.spacing) {
        particle.y = height - this.spacing;
        particle.vy *= -0.5;
        particle.vx *= 0.95;
      }
      
      // Ceiling
      if (particle.y < this.spacing) {
        particle.y = this.spacing;
        particle.vy *= -0.5;
      }
      
      // Walls
      if (particle.x > width - this.spacing) {
        particle.x = width - this.spacing;
        particle.vx *= -0.5;
      }
      
      if (particle.x < this.spacing) {
        particle.x = this.spacing;
        particle.vx *= -0.5;
      }
    });
  }

  /**
   * Emit fluid from a point
   */
  emit(x, y, count = 10, type = 'blood', velocity = null) {
    for (let i = 0; i < count; i++) {
      const particle = this.addParticle(
        x + (Math.random() - 0.5) * 10,
        y + (Math.random() - 0.5) * 10,
        type
      );
      
      if (particle && velocity) {
        particle.vx = velocity.x + (Math.random() - 0.5) * 50;
        particle.vy = velocity.y + (Math.random() - 0.5) * 50;
      }
    }
  }

  /**
   * Create blood splatter
   */
  splatter(x, y, amount = 50, force = 100) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * force;
      
      this.emit(x, y, 1, 'blood', {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      });
    }
  }

  /**
   * Render fluid particles
   */
  render(ctx) {
    this.particles.forEach(particle => {
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * Clear all particles
   */
  clear() {
    this.particles = [];
    this.spatialHash.clear();
  }

  /**
   * Get simulation statistics
   */
  getStats() {
    return {
      particles: this.particles.length,
      maxParticles: this.maxParticles,
      viscosity: this.viscosity,
      spacing: this.spacing
    };
  }
}

export default FluidSimulation;
