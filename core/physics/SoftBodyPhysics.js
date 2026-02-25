/**
 * Soft Body Physics - Phase 5: Physics & Interaction
 * Deformable objects and characters for horror games
 */

import { VerletPhysics } from './VerletPhysics.js';

export class SoftBody extends VerletPhysics {
  constructor(options = {}) {
    super(options);
    this.pressureEnabled = options.pressure || true;
    this.collisionIterations = options.collisionIterations || 3;
  }

  /**
   * Create a soft body circle (balloon, blob, etc.)
   */
  createSoftCircle(x, y, radius, segments = 16, mass = 0.5, pressure = 1) {
    const center = this.createPoint(x, y, mass * 2);
    const points = [];
    
    // Create outer points
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      points.push(this.createPoint(px, py, mass));
    }
    
    // Connect to center (spokes)
    points.forEach(point => {
      this.createConstraint(center, point, radius, 0.5);
    });
    
    // Connect adjacent outer points (rim)
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      this.createConstraint(points[i], points[next], undefined, 0.8);
    }
    
    // Add cross-braces for stability
    for (let i = 0; i < segments; i += 2) {
      const opposite = (i + Math.floor(segments / 2)) % segments;
      this.createConstraint(points[i], points[opposite], undefined, 0.3);
    }
    
    const softBody = {
      center,
      points,
      type: 'soft_circle',
      radius,
      segments,
      pressure,
      restArea: Math.PI * radius * radius
    };
    
    this.objects.push(softBody);
    return softBody;
  }

  /**
   * Create a soft body rectangle (pillow, cushion, etc.)
   */
  createSoftRectangle(x, y, width, height, gridX = 4, gridY = 4, mass = 0.5) {
    const points = [];
    const cellWidth = width / gridX;
    const cellHeight = height / gridY;
    
    // Create grid of points
    for (let gy = 0; gy <= gridY; gy++) {
      for (let gx = 0; gx <= gridX; gx++) {
        const px = x + gx * cellWidth;
        const py = y + gy * cellHeight;
        const pinned = (gy === 0 && gx === 0) || (gy === 0 && gx === gridX);
        points.push(this.createPoint(px, py, mass, pinned));
      }
    }
    
    // Create horizontal constraints
    for (let gy = 0; gy <= gridY; gy++) {
      for (let gx = 0; gx < gridX; gx++) {
        const idx = gy * (gridX + 1) + gx;
        this.createConstraint(points[idx], points[idx + 1]);
      }
    }
    
    // Create vertical constraints
    for (let gy = 0; gy < gridY; gy++) {
      for (let gx = 0; gx <= gridX; gx++) {
        const idx = gy * (gridX + 1) + gx;
        this.createConstraint(points[idx], points[idx + gridX + 1]);
      }
    }
    
    // Create diagonal constraints for shear resistance
    for (let gy = 0; gy < gridY; gy++) {
      for (let gx = 0; gx < gridX; gx++) {
        const idx = gy * (gridX + 1) + gx;
        this.createConstraint(points[idx], points[idx + gridX + 2]);
        this.createConstraint(points[idx + 1], points[idx + gridX]);
      }
    }
    
    const softBody = {
      points,
      type: 'soft_rectangle',
      width,
      height,
      gridX,
      gridY,
      restArea: width * height
    };
    
    this.objects.push(softBody);
    return softBody;
  }

  /**
   * Create a slime blob with viscosity
   */
  createSlimeBlob(x, y, radius, viscosity = 0.95) {
    const blob = this.createSoftCircle(x, y, radius, 20, 0.3, 1.2);
    blob.viscosity = viscosity;
    blob.type = 'slime_blob';
    
    // Add extra internal constraints for slime behavior
    const points = blob.points;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 2; j < points.length; j++) {
        if (j !== i + points.length / 2) { // Skip already connected
          this.createConstraint(points[i], points[j], undefined, 0.1);
        }
      }
    }
    
    return blob;
  }

  /**
   * Update soft bodies with pressure simulation
   */
  update(deltaTime = this.dt) {
    super.update(deltaTime);
    
    // Apply pressure to soft bodies
    if (this.pressureEnabled) {
      this.objects.forEach(obj => {
        if (obj.type === 'soft_circle' || obj.type === 'slime_blob') {
          this.applyPressure(obj);
        } else if (obj.type === 'soft_rectangle') {
          this.applyAreaConstraint(obj);
        }
      });
    }
  }

  /**
   * Apply internal pressure to maintain volume
   */
  applyPressure(softBody) {
    const { points, center, restArea, pressure } = softBody;
    
    // Calculate current area
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      area += p1.x * p2.y - p2.x * p1.y;
    }
    area = Math.abs(area) / 2;
    
    // Calculate pressure force
    const pressureRatio = restArea / area;
    const force = (pressureRatio - 1) * pressure * 0.01;
    
    // Apply force outward from center
    points.forEach(point => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        point.x += (dx / dist) * force;
        point.y += (dy / dist) * force;
      }
    });
  }

  /**
   * Apply area constraint for rectangular soft bodies
   */
  applyAreaConstraint(softBody) {
    const { points, gridX, gridY, restArea } = softBody;
    
    // Simple volume preservation by maintaining overall dimensions
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    
    const currentWidth = maxX - minX;
    const currentHeight = maxY - minY;
    const currentArea = currentWidth * currentHeight;
    
    const areaRatio = Math.sqrt(restArea / currentArea);
    
    // Adjust points to maintain area
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    points.forEach(point => {
      if (!point.pinned) {
        point.x = centerX + (point.x - centerX) * areaRatio;
        point.y = centerY + (point.y - centerY) * areaRatio;
      }
    });
  }

  /**
   * Handle collisions between soft bodies
   */
  handleCollisions() {
    super.handleCollisions();
    
    // Soft body to soft body collisions
    for (let i = 0; i < this.objects.length; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        const obj1 = this.objects[i];
        const obj2 = this.objects[j];
        
        if (obj1.type.includes('soft') && obj2.type.includes('soft')) {
          this.handleSoftCollision(obj1, obj2);
        }
      }
    }
  }

  /**
   * Handle collision between two soft bodies
   */
  handleSoftCollision(obj1, obj2) {
    const points1 = obj1.points;
    const points2 = obj2.points;
    const minDist = 10;
    
    points1.forEach(p1 => {
      points2.forEach(p2 => {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          
          if (!p1.pinned) {
            p1.x -= nx * overlap;
            p1.y -= ny * overlap;
          }
          if (!p2.pinned) {
            p2.x += nx * overlap;
            p2.y += ny * overlap;
          }
        }
      });
    });
  }

  /**
   * Render soft body with filled shape
   */
  render(ctx) {
    super.render(ctx);
    
    // Render soft bodies as filled shapes
    ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
    ctx.lineWidth = 2;
    
    this.objects.forEach(obj => {
      if (obj.type === 'soft_circle' || obj.type === 'slime_blob') {
        ctx.beginPath();
        const points = obj.points;
        ctx.moveTo(points[0].x, points[0].y);
        
        // Draw smooth curve through points
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          const midX = (prev.x + curr.x) / 2;
          const midY = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
        
        // Close the loop
        const last = points[points.length - 1];
        const first = points[0];
        const midX = (last.x + first.x) / 2;
        const midY = (last.y + first.y) / 2;
        ctx.quadraticCurveTo(last.x, last.y, midX, midY);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
      }
    });
  }
}

export default SoftBody;
