/**
 * Destruction System - Phase 5: Physics & Interaction
 * Breakable environments for horror games
 */

import { VerletPhysics } from './VerletPhysics.js';

export class DestructionSystem extends VerletPhysics {
  constructor(options = {}) {
    super(options);
    this.debrisEnabled = options.debris !== false;
    this.dustEnabled = options.dust !== false;
    this.soundEnabled = options.sound !== false;
    this.fracturePatterns = ['radial', 'grid', 'voronoi'];
  }

  /**
   * Create a breakable wall
   */
  createBreakableWall(x, y, width, height, segmentsX = 4, segmentsY = 6, health = 100) {
    const points = [];
    const cellWidth = width / segmentsX;
    const cellHeight = height / segmentsY;
    
    // Create grid of points
    for (let gy = 0; gy <= segmentsY; gy++) {
      for (let gx = 0; gx <= segmentsX; gx++) {
        const px = x + gx * cellWidth;
        const py = y + gy * cellHeight;
        const point = this.createPoint(px, py, 1, gy === segmentsY); // Top row pinned
        point.health = health / (segmentsX * segmentsY);
        point.maxHealth = health / (segmentsX * segmentsY);
        points.push(point);
      }
    }
    
    // Create constraints with health
    const constraints = [];
    for (let gy = 0; gy <= segmentsY; gy++) {
      for (let gx = 0; gx < segmentsX; gx++) {
        const idx = gy * (segmentsX + 1) + gx;
        
        // Horizontal
        const hConstraint = this.createConstraint(points[idx], points[idx + 1]);
        hConstraint.health = health * 0.3;
        hConstraint.maxHealth = health * 0.3;
        constraints.push(hConstraint);
        
        // Vertical
        if (gy < segmentsY) {
          const vIdx = (gy + 1) * (segmentsX + 1) + gx;
          const vConstraint = this.createConstraint(points[idx], points[vIdx]);
          vConstraint.health = health * 0.3;
          vConstraint.maxHealth = health * 0.3;
          constraints.push(vConstraint);
        }
      }
    }
    
    const wall = {
      points,
      constraints,
      type: 'breakable_wall',
      width,
      height,
      segmentsX,
      segmentsY,
      totalHealth: health
    };
    
    this.objects.push(wall);
    return wall;
  }

  /**
   * Apply damage to breakable object
   */
  applyDamage(object, x, y, damage, radius = 50) {
    if (object.type !== 'breakable_wall') return;
    
    let brokenConstraints = 0;
    
    // Damage points near impact
    object.points.forEach(point => {
      const dx = point.x - x;
      const dy = point.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < radius) {
        const damageRatio = 1 - dist / radius;
        point.health -= damage * damageRatio;
        
        if (point.health <= 0 && !point.broken) {
          point.broken = true;
          this.createDebris(point.x, point.y);
        }
      }
    });
    
    // Damage constraints
    object.constraints.forEach(constraint => {
      const midX = (constraint.point1.x + constraint.point2.x) / 2;
      const midY = (constraint.point1.y + constraint.point2.y) / 2;
      
      const dx = midX - x;
      const dy = midY - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < radius) {
        const damageRatio = 1 - dist / radius;
        constraint.health -= damage * damageRatio;
        
        if (constraint.health <= 0 && !constraint.broken) {
          constraint.broken = true;
          brokenConstraints++;
          this.removeConstraint(constraint);
          this.createDebris(midX, midY, 3);
        }
      }
    });
    
    // Check if wall is destroyed
    const remainingConstraints = object.constraints.filter(c => !c.broken).length;
    if (remainingConstraints < object.constraints.length * 0.2) {
      this.destroyObject(object);
    }
    
    return brokenConstraints > 0;
  }

  /**
   * Create debris from broken object
   */
  createDebris(x, y, count = 1) {
    if (!this.debrisEnabled) return;
    
    for (let i = 0; i < count; i++) {
      const debris = this.createPoint(
        x + (Math.random() - 0.5) * 10,
        y + (Math.random() - 0.5) * 10,
        0.5
      );
      
      // Random explosion velocity
      debris.vx = (Math.random() - 0.5) * 200;
      debris.vy = (Math.random() - 0.5) * 200;
      debris.oldX = debris.x - debris.vx * this.dt;
      debris.oldY = debris.y - debris.vy * this.dt;
      
      debris.isDebris = true;
      debris.lifetime = 2 + Math.random() * 3; // Seconds
    }
  }

  /**
   * Destroy entire object
   */
  destroyObject(object) {
    object.destroyed = true;
    
    // Convert all points to debris
    object.points.forEach(point => {
      if (!point.broken) {
        this.createDebris(point.x, point.y);
      }
    });
    
    // Remove object
    const idx = this.objects.indexOf(object);
    if (idx !== -1) {
      this.objects.splice(idx, 1);
    }
  }

  /**
   * Update destruction system
   */
  update(deltaTime = this.dt) {
    super.update(deltaTime);
    
    // Update debris lifetime
    this.points = this.points.filter(point => {
      if (point.isDebris) {
        point.lifetime -= deltaTime;
        return point.lifetime > 0;
      }
      return true;
    });
  }

  /**
   * Fracture surface into pieces
   */
  fractureSurface(x, y, width, height, pattern = 'radial', pieces = 8) {
    const fragments = [];
    
    if (pattern === 'radial') {
      // Radial fracture pattern
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      
      for (let i = 0; i < pieces; i++) {
        const angle1 = (i / pieces) * Math.PI * 2;
        const angle2 = ((i + 1) / pieces) * Math.PI * 2;
        
        const fragment = {
          points: [
            { x: centerX, y: centerY },
            { x: centerX + Math.cos(angle1) * width, y: centerY + Math.sin(angle1) * height },
            { x: centerX + Math.cos(angle2) * width, y: centerY + Math.sin(angle2) * height }
          ],
          velocity: {
            x: Math.cos((angle1 + angle2) / 2) * 50,
            y: Math.sin((angle1 + angle2) / 2) * 50
          }
        };
        
        fragments.push(fragment);
      }
    } else if (pattern === 'grid') {
      // Grid fracture pattern
      const cols = Math.floor(Math.sqrt(pieces));
      const rows = Math.floor(pieces / cols);
      const pieceWidth = width / cols;
      const pieceHeight = height / rows;
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          fragments.push({
            points: [
              { x: x + col * pieceWidth, y: y + row * pieceHeight },
              { x: x + (col + 1) * pieceWidth, y: y + row * pieceHeight },
              { x: x + (col + 1) * pieceWidth, y: y + (row + 1) * pieceHeight },
              { x: x + col * pieceWidth, y: y + (row + 1) * pieceHeight }
            ],
            velocity: {
              x: (Math.random() - 0.5) * 100,
              y: (Math.random() - 0.5) * 100
            }
          });
        }
      }
    }
    
    return fragments;
  }

  /**
   * Render destruction effects
   */
  render(ctx) {
    super.render(ctx);
    
    // Render dust particles
    if (this.dustEnabled) {
      ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
      this.points.forEach(point => {
        if (point.isDebris && point.lifetime < 1) {
          ctx.globalAlpha = point.lifetime;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
    }
  }
}

export default DestructionSystem;
