/**
 * Cloth Simulation - Phase 5: Physics & Interaction
 * Dynamic fabric and clothing for horror games
 */

import { VerletPhysics } from './VerletPhysics.js';

export class ClothSimulation extends VerletPhysics {
  constructor(options = {}) {
    super(options);
    this.windEnabled = options.wind !== false;
    this.windForce = options.windForce || { x: 0, y: 0 };
    this.tearDistance = options.tearDistance || 1.5;
  }

  /**
   * Create a cloth sheet
   */
  createCloth(x, y, width, height, segmentsX = 10, segmentsY = 8, pinned = 'top') {
    const points = [];
    const cellWidth = width / segmentsX;
    const cellHeight = height / segmentsY;
    
    // Create grid of points
    for (let gy = 0; gy <= segmentsY; gy++) {
      for (let gx = 0; gx <= segmentsX; gx++) {
        const px = x + gx * cellWidth;
        const py = y + gy * cellHeight;
        
        let isPinned = false;
        if (pinned === 'top' && gy === 0) isPinned = true;
        if (pinned === 'bottom' && gy === segmentsY) isPinned = true;
        if (pinned === 'left' && gx === 0) isPinned = true;
        if (pinned === 'right' && gx === segmentsX) isPinned = true;
        if (pinned === 'corners' && 
            ((gx === 0 && gy === 0) || (gx === segmentsX && gy === 0) ||
             (gx === 0 && gy === segmentsY) || (gx === segmentsX && gy === segmentsY))) {
          isPinned = true;
        }
        
        const point = this.createPoint(px, py, 0.5, isPinned);
        point.clothPoint = true;
        points.push(point);
      }
    }
    
    // Create structural constraints (horizontal and vertical)
    const constraints = [];
    for (let gy = 0; gy <= segmentsY; gy++) {
      for (let gx = 0; gx < segmentsX; gx++) {
        const idx = gy * (segmentsX + 1) + gx;
        
        // Horizontal
        constraints.push(this.createConstraint(points[idx], points[idx + 1], undefined, 1.0));
        
        // Vertical
        if (gy < segmentsY) {
          const vIdx = (gy + 1) * (segmentsX + 1) + gx;
          constraints.push(this.createConstraint(points[idx], points[vIdx], undefined, 1.0));
        }
      }
    }
    
    // Create shear constraints (diagonal)
    for (let gy = 0; gy < segmentsY; gy++) {
      for (let gx = 0; gx < segmentsX; gx++) {
        const idx = gy * (segmentsX + 1) + gx;
        
        // Diagonal 1
        const d1Idx = (gy + 1) * (segmentsX + 1) + (gx + 1);
        constraints.push(this.createConstraint(points[idx], points[d1Idx], undefined, 0.5));
        
        // Diagonal 2
        const d2Idx = (gy + 1) * (segmentsX + 1) + gx;
        constraints.push(this.createConstraint(points[idx + 1], points[d2Idx], undefined, 0.5));
      }
    }
    
    // Create bend constraints (every other point)
    for (let gy = 0; gy <= segmentsY; gy++) {
      for (let gx = 0; gx < segmentsX - 1; gx++) {
        const idx = gy * (segmentsX + 1) + gx;
        constraints.push(this.createConstraint(points[idx], points[idx + 2], undefined, 0.2));
      }
    }
    
    for (let gy = 0; gy < segmentsY - 1; gy++) {
      for (let gx = 0; gx <= segmentsX; gx++) {
        const idx = gy * (segmentsX + 1) + gx;
        const bIdx = (gy + 2) * (segmentsX + 1) + gx;
        constraints.push(this.createConstraint(points[idx], points[bIdx], undefined, 0.2));
      }
    }
    
    const cloth = {
      points,
      constraints,
      type: 'cloth',
      width,
      height,
      segmentsX,
      segmentsY,
      pinned
    };
    
    this.objects.push(cloth);
    return cloth;
  }

  /**
   * Create a flag
   */
  createFlag(x, y, width, height, poleHeight = 100) {
    // Create pole (static line)
    const poleTop = this.createPoint(x, y, 0, true);
    const poleBottom = this.createPoint(x, y + poleHeight, 0, true);
    this.createConstraint(poleTop, poleBottom);
    
    // Create flag attached to pole
    const flag = this.createCloth(x, y, width, height, 12, 8, 'left');
    flag.type = 'flag';
    
    return { poleTop, poleBottom, flag };
  }

  /**
   * Create hanging curtain
   */
  createCurtain(x, y, width, height, folds = 6) {
    const curtains = [];
    const foldWidth = width / folds;
    
    for (let i = 0; i < folds; i++) {
      const foldX = x + i * foldWidth;
      const isEven = i % 2 === 0;
      
      // Create wavy top edge
      const curtain = this.createCloth(
        foldX,
        y + (isEven ? 0 : 10),
        foldWidth,
        height,
        6,
        10,
        'top'
      );
      
      curtain.type = 'curtain';
      curtains.push(curtain);
    }
    
    return curtains;
  }

  /**
   * Apply wind force to cloth
   */
  applyWind(force) {
    this.windForce = force;
    
    this.points.forEach(point => {
      if (!point.pinned && point.clothPoint) {
        // Add some turbulence
        const turbulenceX = (Math.random() - 0.5) * Math.abs(force.x) * 0.5;
        const turbulenceY = (Math.random() - 0.5) * Math.abs(force.y) * 0.5;
        
        this.applyForce(point, force.x + turbulenceX, force.y + turbulenceY);
      }
    });
  }

  /**
   * Update cloth simulation
   */
  update(deltaTime = this.dt) {
    // Apply wind if enabled
    if (this.windEnabled) {
      const time = Date.now() * 0.001;
      const windX = Math.sin(time) * 20 + Math.cos(time * 2.3) * 10;
      const windY = Math.sin(time * 0.5) * 5;
      this.applyWind({ x: windX, y: windY });
    }
    
    super.update(deltaTime);
    
    // Check for tearing
    if (this.tearDistance > 0) {
      this.checkTearing();
    }
  }

  /**
   * Check if cloth should tear
   */
  checkTearing() {
    this.constraints.forEach(constraint => {
      const dist = this.distance(constraint.point1, constraint.point2);
      
      if (dist > constraint.length * this.tearDistance && !constraint.torn) {
        constraint.torn = true;
        this.removeConstraint(constraint);
        
        // Create small debris at tear point
        const midX = (constraint.point1.x + constraint.point2.x) / 2;
        const midY = (constraint.point1.y + constraint.point2.y) / 2;
        this.createDebris(midX, midY);
      }
    });
  }

  /**
   * Create cloth debris (thread/fiber)
   */
  createDebris(x, y) {
    const debris = this.createPoint(x, y, 0.1);
    debris.vx = (Math.random() - 0.5) * 50;
    debris.vy = (Math.random() - 0.5) * 50;
    debris.oldX = debris.x - debris.vx * this.dt;
    debris.oldY = debris.y - debris.vy * this.dt;
    debris.isDebris = true;
    debris.lifetime = 1 + Math.random();
  }

  /**
   * Handle collisions with other objects
   */
  handleCollisions() {
    super.handleCollisions();
    
    // Cloth self-collision (simplified)
    this.points.forEach((p1, i) => {
      if (!p1.clothPoint || p1.pinned) return;
      
      // Only check nearby points in the array (optimization)
      for (let j = i + 5; j < Math.min(i + 20, this.points.length); j++) {
        const p2 = this.points[j];
        if (!p2.clothPoint || p2.pinned) continue;
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = 8;
        
        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          
          p1.x -= nx * overlap;
          p1.y -= ny * overlap;
          p2.x += nx * overlap;
          p2.y += ny * overlap;
        }
      }
    });
  }

  /**
   * Render cloth as continuous fabric
   */
  render(ctx) {
    // Render cloth as filled/quads
    this.objects.forEach(obj => {
      if (obj.type === 'cloth' || obj.type === 'flag' || obj.type === 'curtain') {
        ctx.fillStyle = this.getClothColor(obj.type);
        ctx.strokeStyle = this.getClothColor(obj.type, true);
        ctx.lineWidth = 1;
        
        const { points, segmentsX, segmentsY } = obj;
        
        // Render as quad mesh
        for (let gy = 0; gy < segmentsY; gy++) {
          for (let gx = 0; gx < segmentsX; gx++) {
            const idx = gy * (segmentsX + 1) + gx;
            
            const p1 = points[idx];
            const p2 = points[idx + 1];
            const p3 = points[idx + segmentsX + 2];
            const p4 = points[idx + segmentsX + 1];
            
            // Draw quad
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.closePath();
            
            ctx.globalAlpha = 0.7;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.stroke();
          }
        }
      }
    });
    
    // Render constraints (optional wireframe)
    // super.render(ctx);
  }

  /**
   * Get cloth color by type
   */
  getClothColor(type, darker = false) {
    const colors = {
      cloth: darker ? '#4466aa' : '#6688cc',
      flag: darker ? '#882222' : '#cc4444',
      curtain: darker ? '#663366' : '#995599'
    };
    return colors[type] || colors.cloth;
  }
}

export default ClothSimulation;
