/**
 * Verlet Integration Physics Engine - Phase 5: Physics & Interaction
 * Stable physics simulation for horror game objects and characters
 */

export class VerletPhysics {
  constructor(options = {}) {
    this.gravity = options.gravity || { x: 0, y: 9.81 };
    this.friction = options.friction || 0.99;
    this.bounce = options.bounce || 0.8;
    this.points = [];
    this.constraints = [];
    this.objects = [];
    this.spatialHash = new Map();
    this.cellSize = options.cellSize || 50;
    this.subSteps = options.subSteps || 8;
    this.dt = options.dt || 1 / 60;
  }

  /**
   * Create a physics point
   */
  createPoint(x, y, mass = 1, pinned = false) {
    const point = {
      x: x,
      y: y,
      oldX: x,
      oldY: y,
      mass: mass,
      pinned: pinned,
      forces: { x: 0, y: 0 },
      id: this.points.length
    };
    this.points.push(point);
    return point;
  }

  /**
   * Create constraint between points
   */
  createConstraint(point1, point2, length = null, stiffness = 1) {
    const constraint = {
      point1: point1,
      point2: point2,
      length: length || this.distance(point1, point2),
      stiffness: stiffness
    };
    this.constraints.push(constraint);
    return constraint;
  }

  /**
   * Calculate distance between points
   */
  distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Update physics simulation
   */
  update(deltaTime = this.dt) {
    const subStepDt = deltaTime / this.subSteps;
    
    for (let step = 0; step < this.subSteps; step++) {
      // Update points
      this.points.forEach(point => {
        if (!point.pinned) {
          // Verlet integration
          const vx = (point.x - point.oldX) * this.friction;
          const vy = (point.y - point.oldY) * this.friction;
          
          point.oldX = point.x;
          point.oldY = point.y;
          
          point.x += vx;
          point.y += vy;
          
          // Apply gravity
          point.y += this.gravity.y * subStepDt * subStepDt;
          point.x += this.gravity.x * subStepDt * subStepDt;
          
          // Apply forces
          if (point.forces.x !== 0 || point.forces.y !== 0) {
            point.x += point.forces.x / point.mass * subStepDt;
            point.y += point.forces.y / point.mass * subStepDt;
            point.forces.x = 0;
            point.forces.y = 0;
          }
        }
      });

      // Satisfy constraints
      this.constraints.forEach(constraint => {
        this.satisfyConstraint(constraint);
      });

      // Handle collisions
      this.handleCollisions();
    }

    // Update spatial hash
    this.updateSpatialHash();
  }

  /**
   * Satisfy a single constraint
   */
  satisfyConstraint(constraint) {
    const { point1, point2, length, stiffness } = constraint;
    
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) return;
    
    const diff = (length - dist) / dist * stiffness;
    const offsetX = dx * diff * 0.5;
    const offsetY = dy * diff * 0.5;
    
    if (!point1.pinned) {
      point1.x -= offsetX;
      point1.y -= offsetY;
    }
    
    if (!point2.pinned) {
      point2.x += offsetX;
      point2.y += offsetY;
    }
  }

  /**
   * Handle collisions with bounds and objects
   */
  handleCollisions() {
    this.points.forEach(point => {
      if (point.pinned) return;

      // Floor collision
      if (point.y > window.innerHeight - 10) {
        point.y = window.innerHeight - 10;
        const vx = (point.x - point.oldX) * this.bounce;
        point.oldX = point.x - vx;
        point.oldY = point.y;
      }

      // Ceiling collision
      if (point.y < 10) {
        point.y = 10;
        const vx = (point.x - point.oldX) * this.bounce;
        point.oldX = point.x - vx;
        point.oldY = point.y;
      }

      // Wall collisions
      if (point.x > window.innerWidth - 10) {
        point.x = window.innerWidth - 10;
        const vy = (point.y - point.oldY) * this.bounce;
        point.oldX = point.x;
        point.oldY = point.y - vy;
      }

      if (point.x < 10) {
        point.x = 10;
        const vy = (point.y - point.oldY) * this.bounce;
        point.oldX = point.x;
        point.oldY = point.y - vy;
      }
    });
  }

  /**
   * Update spatial hash for collision detection
   */
  updateSpatialHash() {
    this.spatialHash.clear();
    
    this.points.forEach(point => {
      const cellX = Math.floor(point.x / this.cellSize);
      const cellY = Math.floor(point.y / this.cellSize);
      const key = `${cellX},${cellY}`;
      
      if (!this.spatialHash.has(key)) {
        this.spatialHash.set(key, []);
      }
      this.spatialHash.get(key).push(point);
    });
  }

  /**
   * Get nearby points for collision detection
   */
  getNearbyPoints(point, radius = 1) {
    const cellX = Math.floor(point.x / this.cellSize);
    const cellY = Math.floor(point.y / this.cellSize);
    const nearby = [];
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cell = this.spatialHash.get(key);
        if (cell) {
          nearby.push(...cell);
        }
      }
    }
    
    return nearby;
  }

  /**
   * Apply force to a point
   */
  applyForce(point, fx, fy) {
    point.forces.x += fx;
    point.forces.y += fy;
  }

  /**
   * Apply explosion force
   */
  applyExplosion(x, y, force, radius) {
    this.points.forEach(point => {
      const dx = point.x - x;
      const dy = point.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < radius && dist > 0) {
        const normalizedDist = dist / radius;
        const explosionForce = force * (1 - normalizedDist);
        const fx = (dx / dist) * explosionForce;
        const fy = (dy / dist) * explosionForce;
        
        this.applyForce(point, fx, fy);
      }
    });
  }

  /**
   * Create a rectangle object
   */
  createRectangle(x, y, width, height, mass = 1, pinned = false) {
    const points = [
      this.createPoint(x, y, mass, pinned),
      this.createPoint(x + width, y, mass, pinned),
      this.createPoint(x + width, y + height, mass, pinned),
      this.createPoint(x, y + height, mass, pinned)
    ];
    
    // Create edges
    this.createConstraint(points[0], points[1]);
    this.createConstraint(points[1], points[2]);
    this.createConstraint(points[2], points[3]);
    this.createConstraint(points[3], points[0]);
    
    // Create cross-braces for stability
    this.createConstraint(points[0], points[2]);
    this.createConstraint(points[1], points[3]);
    
    const rect = { points, type: 'rectangle', width, height };
    this.objects.push(rect);
    return rect;
  }

  /**
   * Create a rope
   */
  createRope(x, y, segments, length, mass = 0.5) {
    const points = [];
    const segmentLength = length / segments;
    
    for (let i = 0; i <= segments; i++) {
      const pinned = i === 0;
      points.push(this.createPoint(x, y + i * segmentLength, mass, pinned));
      
      if (i > 0) {
        this.createConstraint(points[i], points[i - 1], segmentLength);
      }
    }
    
    const rope = { points, type: 'rope', segments };
    this.objects.push(rope);
    return rope;
  }

  /**
   * Create a ragdoll (simplified human figure)
   */
  createRagdoll(x, y, scale = 1) {
    // Head
    const head = this.createPoint(x, y, 1);
    
    // Body
    const shoulder = this.createPoint(x, y + 20 * scale, 1);
    const spine = this.createPoint(x, y + 40 * scale, 1);
    const hip = this.createPoint(x, y + 60 * scale, 1);
    
    // Arms
    const lShoulder = this.createPoint(x - 15 * scale, y + 20 * scale, 0.5);
    const lElbow = this.createPoint(x - 15 * scale, y + 35 * scale, 0.5);
    const lHand = this.createPoint(x - 15 * scale, y + 50 * scale, 0.3);
    
    const rShoulder = this.createPoint(x + 15 * scale, y + 20 * scale, 0.5);
    const rElbow = this.createPoint(x + 15 * scale, y + 35 * scale, 0.5);
    const rHand = this.createPoint(x + 15 * scale, y + 50 * scale, 0.3);
    
    // Legs
    const lHip = this.createPoint(x - 10 * scale, y + 60 * scale, 0.8);
    const lKnee = this.createPoint(x - 10 * scale, y + 80 * scale, 0.6);
    const lFoot = this.createPoint(x - 10 * scale, y + 100 * scale, 0.4);
    
    const rHip = this.createPoint(x + 10 * scale, y + 60 * scale, 0.8);
    const rKnee = this.createPoint(x + 10 * scale, y + 80 * scale, 0.6);
    const rFoot = this.createPoint(x + 10 * scale, y + 100 * scale, 0.4);
    
    // Constraints
    this.createConstraint(head, shoulder);
    this.createConstraint(shoulder, spine);
    this.createConstraint(spine, hip);
    
    // Arms
    this.createConstraint(shoulder, lShoulder);
    this.createConstraint(lShoulder, lElbow);
    this.createConstraint(lElbow, lHand);
    
    this.createConstraint(shoulder, rShoulder);
    this.createConstraint(rShoulder, rElbow);
    this.createConstraint(rElbow, rHand);
    
    // Legs
    this.createConstraint(hip, lHip);
    this.createConstraint(lHip, lKnee);
    this.createConstraint(lKnee, lFoot);
    
    this.createConstraint(hip, rHip);
    this.createConstraint(rHip, rKnee);
    this.createConstraint(rKnee, rFoot);
    
    // Stability constraints
    this.createConstraint(lShoulder, rShoulder);
    this.createConstraint(lHip, rHip);
    
    const ragdoll = {
      head, shoulder, spine, hip,
      lShoulder, lElbow, lHand,
      rShoulder, rElbow, rHand,
      lHip, lKnee, lFoot,
      rHip, rKnee, rFoot,
      type: 'ragdoll'
    };
    
    this.objects.push(ragdoll);
    return ragdoll;
  }

  /**
   * Clear all physics objects
   */
  clear() {
    this.points = [];
    this.constraints = [];
    this.objects = [];
    this.spatialHash.clear();
  }

  /**
   * Render physics objects for debugging
   */
  render(ctx) {
    // Render constraints
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1;
    this.constraints.forEach(constraint => {
      ctx.beginPath();
      ctx.moveTo(constraint.point1.x, constraint.point1.y);
      ctx.lineTo(constraint.point2.x, constraint.point2.y);
      ctx.stroke();
    });
    
    // Render points
    ctx.fillStyle = '#f00';
    this.points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * Get physics statistics
   */
  getStats() {
    return {
      points: this.points.length,
      constraints: this.constraints.length,
      objects: this.objects.length,
      spatialHashSize: this.spatialHash.size
    };
  }
}

export default VerletPhysics;
