/**
 * Zombie Swarm AI System
 * Advanced boid-based flocking with tactical behaviors
 */

class ZombieSwarmAI {
  constructor(entityManager) {
    this.entityManager = entityManager;
    
    // Swarm behavior weights
    this.weights = {
      separation: 1.5,
      alignment: 1.0,
      cohesion: 1.2,
      attraction: 2.0,
      avoidance: 1.8,
      obstacleAvoidance: 1.5
    };
    
    // Swarm parameters
    this.parameters = {
      neighborDistance: 3.0,
      desiredSeparation: 1.5,
      maximumSpeed: 4.0,
      maximumForce: 0.1
    };
    
    // Tactical behaviors
    this.tactics = {
      surround: new SurroundTactic(),
      flank: new FlankTactic(),
      wave: new WaveTactic(),
      ambush: new AmbushTactic()
    };
    
    this.currentTactic = null;
    this.tacticTimer = 0;
    this.tacticCooldown = 30; // seconds
  }
  
  update(deltaTime, zombies, targets, obstacles) {
    // Update tactic selection
    this.tacticTimer -= deltaTime;
    if (this.tacticTimer <= 0) {
      this.selectTactic(zombies, targets);
      this.tacticTimer = this.tacticCooldown;
    }
    
    // Apply swarm behavior to each zombie
    for (const zombie of zombies) {
      if (!zombie.active || zombie.getComponent('health')?.isDead()) continue;
      
      const position = zombie.getComponent('position');
      const velocity = zombie.getComponent('velocity');
      const ai = zombie.getComponent('zombieAI');
      
      // Calculate steering forces
      const steering = this.calculateSteering(zombie, zombies, targets, obstacles);
      
      // Apply steering
      this.applySteering(zombie, steering, deltaTime);
      
      // Apply tactical behavior
      if (this.currentTactic && ai) {
        this.currentTactic.apply(zombie, targets, deltaTime);
      }
    }
  }
  
  calculateSteering(zombie, allZombies, targets, obstacles) {
    const position = zombie.getComponent('position');
    const velocity = zombie.getComponent('velocity');
    
    const separation = new THREE.Vector3();
    const alignment = new THREE.Vector3();
    const cohesion = new THREE.Vector3();
    const attraction = new THREE.Vector3();
    const avoidance = new THREE.Vector3();
    const obstacleSteering = new THREE.Vector3();
    
    let neighborCount = 0;
    
    // Check nearby zombies
    const nearbyZombies = this.entityManager.queryInRadius(
      position,
      this.parameters.neighborDistance,
      'position', 'zombieAI'
    );
    
    for (const other of nearbyZombies) {
      if (other === zombie || !other.active) continue;
      
      const otherPos = other.getComponent('position');
      const distance = position.distanceTo(otherPos);
      
      if (distance > 0 && distance < this.parameters.neighborDistance) {
        // Separation
        if (distance < this.parameters.desiredSeparation) {
          const diff = new THREE.Vector3().subVectors(position, otherPos);
          diff.normalize();
          diff.divideScalar(distance);
          separation.add(diff);
        }
        
        // Alignment
        const otherVel = other.getComponent('velocity');
        if (otherVel) {
          alignment.add(otherVel.clone());
        }
        
        // Cohesion
        cohesion.add(otherPos.clone());
        
        neighborCount++;
      }
    }
    
    if (neighborCount > 0) {
      // Average and scale alignment
      alignment.divideScalar(neighborCount);
      alignment.normalize();
      alignment.multiplyScalar(this.parameters.maximumSpeed);
      
      const steerAlignment = new THREE.Vector3().subVectors(alignment, velocity.clone());
      steerAlignment.clampLength(0, this.parameters.maximumForce);
      
      // Average and scale cohesion
      cohesion.divideScalar(neighborCount);
      cohesion.sub(position);
      cohesion.normalize();
      cohesion.multiplyScalar(this.parameters.maximumSpeed);
      
      const steerCohesion = new THREE.Vector3().subVectors(cohesion, velocity.clone());
      steerCohesion.clampLength(0, this.parameters.maximumForce);
      
      // Scale separation
      separation.normalize();
      separation.multiplyScalar(this.parameters.maximumSpeed);
      const steerSeparation = new THREE.Vector3().subVectors(separation, velocity.clone());
      steerSeparation.clampLength(0, this.parameters.maximumForce);
      
      // Apply weights
      separation.multiplyScalar(this.weights.separation);
      alignment.multiplyScalar(this.weights.alignment);
      cohesion.multiplyScalar(this.weights.cohesion);
    }
    
    // Attraction to targets
    for (const target of targets) {
      if (!target.active) continue;
      
      const targetPos = target.getComponent('position');
      const toTarget = new THREE.Vector3().subVectors(targetPos, position);
      const distance = toTarget.length();
      
      if (distance > 0) {
        toTarget.normalize();
        toTarget.multiplyScalar(this.parameters.maximumSpeed);
        
        const steer = new THREE.Vector3().subVectors(toTarget, velocity.clone());
        steer.clampLength(0, this.parameters.maximumForce);
        
        // Stronger when closer
        const strength = Math.max(0, 1 - distance / 50);
        steer.multiplyScalar(strength * this.weights.attraction);
        attraction.add(steer);
      }
    }
    
    // Obstacle avoidance
    if (obstacles) {
      for (const obstacle of obstacles) {
        const toObstacle = new THREE.Vector3().subVectors(obstacle.position, position);
        const distance = toObstacle.length();
        
        if (distance < obstacle.radius + 5) {
          const away = new THREE.Vector3().subVectors(position, obstacle.position);
          away.normalize();
          away.multiplyScalar(this.parameters.maximumSpeed);
          
          const steer = new THREE.Vector3().subVectors(away, velocity.clone());
          steer.clampLength(0, this.parameters.maximumForce);
          steer.multiplyScalar(this.weights.obstacleAvoidance);
          obstacleSteering.add(steer);
        }
      }
    }
    
    // Combine all forces
    const totalSteering = new THREE.Vector3()
      .add(separation)
      .add(alignment)
      .add(cohesion)
      .add(attraction)
      .add(avoidance)
      .add(obstacleSteering);
    
    return totalSteering;
  }
  
  applySteering(zombie, steering, deltaTime) {
    const velocity = zombie.getComponent('velocity');
    const movement = zombie.getComponent('movement');
    
    if (!velocity || !movement) return;
    
    // Apply steering to velocity
    velocity.vx += steering.x * deltaTime;
    velocity.vy += steering.y * deltaTime;
    velocity.vz += steering.z * deltaTime;
    
    // Limit to maximum speed
    const speed = Math.sqrt(velocity.vx ** 2 + velocity.vy ** 2 + velocity.vz ** 2);
    const maxSpeed = movement.maxSpeed || this.parameters.maximumSpeed;
    
    if (speed > maxSpeed) {
      const ratio = maxSpeed / speed;
      velocity.vx *= ratio;
      velocity.vy *= ratio;
      velocity.vz *= ratio;
    }
    
    // Rotate zombie to face movement direction
    if (speed > 0.1) {
      const targetRotation = Math.atan2(velocity.vx, velocity.vz);
      const rotation = zombie.getComponent('rotation');
      
      // Smooth rotation
      let diff = targetRotation - rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      
      rotation.y += diff * movement.rotationSpeed * deltaTime;
    }
  }
  
  selectTactic(zombies, targets) {
    const numZombies = zombies.filter(z => z.active).length;
    const numTargets = targets.filter(t => t.active).length;
    
    // Simple tactic selection logic
    if (numZombies > 100 && numTargets < 5) {
      this.currentTactic = this.tactics.wave;
    } else if (numZombies > 50 && numTargets >= 5) {
      this.currentTactic = this.tactics.flank;
    } else if (numTargets === 1) {
      this.currentTactic = this.tactics.surround;
    } else {
      this.currentTactic = null;
    }
    
    console.log(`Swarm tactic: ${this.currentTactic?.name || 'none'}`);
  }
}

// === TACTIC IMPLEMENTATIONS ===

class SurroundTactic {
  constructor() {
    this.name = 'surround';
  }
  
  apply(zombie, targets, deltaTime) {
    if (targets.length === 0) return;
    
    const target = targets[0];
    const targetPos = target.getComponent('position');
    const zombiePos = zombie.getComponent('position');
    
    // Calculate position on circle around target
    const angle = Math.atan2(zombiePos.z - targetPos.z, zombiePos.x - targetPos.x);
    const radius = 8;
    
    const targetX = targetPos.x + Math.cos(angle) * radius;
    const targetZ = targetPos.z + Math.sin(angle) * radius;
    
    // Move toward target position
    const velocity = zombie.getComponent('velocity');
    const direction = new THREE.Vector3(targetX - zombiePos.x, 0, targetZ - zombiePos.z).normalize();
    
    velocity.vx = direction.x * 2;
    velocity.vz = direction.z * 2;
  }
}

class FlankTactic {
  constructor() {
    this.name = 'flank';
  }
  
  apply(zombie, targets, deltaTime) {
    if (targets.length === 0) return;
    
    const target = targets[0];
    const targetPos = target.getComponent('position');
    const zombiePos = zombie.getComponent('position');
    
    // Flank from sides
    const toTarget = new THREE.Vector3().subVectors(targetPos, zombiePos);
    const right = new THREE.Vector3(-toTarget.z, 0, toTarget.x).normalize();
    
    // 70% go right, 30% go left
    const flankDirection = Math.random() < 0.7 ? right : right.clone().negate();
    
    const velocity = zombie.getComponent('velocity');
    velocity.vx += flankDirection.x * 1.5 * deltaTime;
    velocity.vz += flankDirection.z * 1.5 * deltaTime;
  }
}

class WaveTactic {
  constructor() {
    this.name = 'wave';
  }
  
  apply(zombie, targets, deltaTime) {
    if (targets.length === 0) return;
    
    const target = targets[0];
    const targetPos = target.getComponent('position');
    const zombiePos = zombie.getComponent('position');
    
    // Direct charge
    const toTarget = new THREE.Vector3().subVectors(targetPos, zombiePos).normalize();
    
    const velocity = zombie.getComponent('velocity');
    const speed = zombie.getComponent('movement')?.maxSpeed || 4.0;
    
    velocity.vx = toTarget.x * speed * 1.2; // 20% speed boost
    velocity.vz = toTarget.z * speed * 1.2;
  }
}

class AmbushTactic {
  constructor() {
    this.name = 'ambush';
  }
  
  apply(zombie, targets, deltaTime) {
    // Wait for targets to come close, then attack
    const ai = zombie.getComponent('zombieAI');
    if (ai && ai.state !== 'attacking') {
      ai.setState('idle');
    }
  }
}

// Export
window.ZombieSwarmAI = ZombieSwarmAI;
console.log('✅ Zombie Swarm AI loaded');
