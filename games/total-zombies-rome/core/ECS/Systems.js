/**
 * ECS Systems - Process entities with specific component combinations
 * High-performance batch processing for 2000+ entities
 */

// === BASE SYSTEM ===
class System {
  constructor(entityManager) {
    this.entityManager = entityManager;
    this.enabled = true;
    this.priority = 0;
  }
  
  update(deltaTime) {
    throw new Error('System.update() must be implemented');
  }
  
  onEntityAdded(entity) {}
  onEntityRemoved(entity) {}
}

// === MOVEMENT SYSTEM ===
class MovementSystem extends System {
  constructor(entityManager) {
    super(entityManager);
    this.priority = 100; // High priority - runs first
  }
  
  update(deltaTime) {
    const entities = this.entityManager.query('position', 'velocity', 'movement');
    
    for (const entity of entities) {
      const position = entity.getComponent('position');
      const velocity = entity.getComponent('velocity');
      const movement = entity.getComponent('movement');
      
      if (!movement.canMove) continue;
      
      // Apply acceleration
      if (velocity.vx !== 0 || velocity.vy !== 0 || velocity.vz !== 0) {
        velocity.vx += velocity.ax * deltaTime;
        velocity.vy += velocity.ay * deltaTime;
        velocity.vz += velocity.az * deltaTime;
        
        // Apply deceleration when no input
        const speed = Math.sqrt(velocity.vx ** 2 + velocity.vy ** 2 + velocity.vz ** 2);
        if (speed > 0 && speed < movement.maxSpeed) {
          const decel = movement.deceleration * deltaTime;
          velocity.vx *= (1 - decel);
          velocity.vy *= (1 - decel);
          velocity.vz *= (1 - decel);
        }
        
        // Clamp to max speed
        const currentSpeed = Math.sqrt(velocity.vx ** 2 + velocity.vy ** 2 + velocity.vz ** 2);
        if (currentSpeed > movement.maxSpeed) {
          const ratio = movement.maxSpeed / currentSpeed;
          velocity.vx *= ratio;
          velocity.vy *= ratio;
          velocity.vz *= ratio;
        }
      }
      
      // Update position
      position.x += velocity.vx * deltaTime;
      position.y += velocity.vy * deltaTime;
      position.z += velocity.vz * deltaTime;
      
      // Update movement state
      movement.isMoving = (velocity.vx !== 0 || velocity.vy !== 0 || velocity.vz !== 0);
      
      // Boundary checks (configurable map size)
      const bounds = window.GAME_BOUNDS || { x: 100, z: 100 };
      position.x = Math.max(-bounds.x, Math.min(bounds.x, position.x));
      position.z = Math.max(-bounds.z, Math.min(bounds.z, position.z));
    }
  }
}

// === COMBAT SYSTEM ===
class CombatSystem extends System {
  constructor(entityManager) {
    super(entityManager);
    this.priority = 90;
  }
  
  update(deltaTime) {
    const entities = this.entityManager.query('combat', 'faction');
    
    for (const entity of entities) {
      const combat = entity.getComponent('combat');
      const faction = entity.getComponent('faction');
      const position = entity.getComponent('position');
      
      if (!position || !faction) continue;
      
      // Update attack timer
      combat.update(deltaTime);
      
      // Auto-acquire targets
      if (combat.canAttack() && !entity.target) {
        const target = this.findNearestEnemy(entity, faction, combat.attackRange * 2);
        if (target) {
          entity.target = target;
        }
      }
      
      // Attack if target in range
      if (entity.target && entity.target.active) {
        const targetPos = entity.target.getComponent('position');
        const distance = position.distanceTo(targetPos);
        
        if (distance <= combat.attackRange) {
          this.performAttack(entity, entity.target);
        }
      }
    }
  }
  
  findNearestEnemy(entity, faction, maxRange) {
    const position = entity.getComponent('position');
    const candidates = this.entityManager.queryInRadius(position, maxRange, 'faction', 'health', 'position');
    
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const candidate of candidates) {
      if (candidate === entity) continue;
      
      const otherFaction = candidate.getComponent('faction');
      if (faction.isHostile(otherFaction.factionId)) {
        const dist = position.distanceTo(candidate.getComponent('position'));
        if (dist < nearestDist) {
          nearest = candidate;
          nearestDist = dist;
        }
      }
    }
    
    return nearest;
  }
  
  performAttack(attacker, defender) {
    const combat = attacker.getComponent('combat');
    const defenderHealth = defender.getComponent('health');
    
    if (!combat.canAttack() || !defenderHealth) return;
    
    // Calculate damage
    let damage = combat.damage;
    
    // Apply damage modifiers
    const damageType = combat.attackType || 'physical';
    damage = defenderHealth.takeDamage(damage, damageType, attacker);
    
    // Trigger callbacks
    combat.onHit?.(attacker, defender, damage);
    
    // Start cooldown
    combat.startAttack();
    
    // Visual feedback
    this.spawnDamageNumber(defender, damage);
  }
  
  spawnDamageNumber(target, damage) {
    // Implemented in rendering system
    window.EventBus?.emit('damageDealt', { target, damage });
  }
}

// === ZOMBIE AI SYSTEM ===
class ZombieAISystem extends System {
  constructor(entityManager, swarmBehavior) {
    super(entityManager);
    this.priority = 80;
    this.swarmBehavior = swarmBehavior;
    this.updateInterval = 1 / 30; // Update at 30 FPS for performance
    this.accumulator = 0;
  }
  
  update(deltaTime) {
    this.accumulator += deltaTime;
    
    if (this.accumulator < this.updateInterval) return;
    
    const deltaTime = this.accumulator;
    this.accumulator = 0;
    
    const zombies = this.entityManager.query('zombieAI', 'position', 'velocity', 'faction', 'health');
    const humans = this.entityManager.query('humanAI', 'position', 'faction', 'health');
    
    if (humans.length === 0) return;
    
    for (const zombie of zombies) {
      if (!zombie.active || zombie.getComponent('health').isDead()) continue;
      
      const ai = zombie.getComponent('zombieAI');
      const position = zombie.getComponent('position');
      const velocity = zombie.getComponent('velocity');
      const faction = zombie.getComponent('faction');
      
      // State machine
      switch (ai.state) {
        case 'idle':
          this.updateIdleState(zombie, ai, position, velocity, deltaTime);
          break;
          
        case 'wandering':
          this.updateWanderingState(zombie, ai, position, velocity, deltaTime);
          break;
          
        case 'chasing':
          this.updateChasingState(zombie, ai, position, velocity, humans, deltaTime);
          break;
          
        case 'attacking':
          this.updateAttackingState(zombie, ai, position, velocity, humans, deltaTime);
          break;
          
        case 'fleeing':
          this.updateFleeingState(zombie, ai, position, velocity, deltaTime);
          break;
      }
      
      // Update target reference
      if (ai.target && !ai.target.active) {
        ai.setTarget(null);
        ai.setState('wandering');
      }
    }
  }
  
  updateIdleState(zombie, ai, position, velocity, deltaTime) {
    // Random chance to start wandering
    if (Math.random() < 0.01) {
      ai.setState('wandering');
    }
    
    // Check for nearby humans
    const human = this.detectNearbyHumans(zombie, position, ai);
    if (human) {
      ai.setTarget(human);
      ai.setState('chasing');
    }
    
    // Slow to stop
    velocity.vx *= 0.95;
    velocity.vz *= 0.95;
  }
  
  updateWanderingState(zombie, ai, position, velocity, deltaTime) {
    // Check for humans
    const human = this.detectNearbyHumans(zombie, position, ai);
    if (human) {
      ai.setTarget(human);
      ai.setState('chasing');
      return;
    }
    
    // Wander behavior
    if (!ai.wanderDirection || Math.random() < 0.02) {
      const angle = Math.random() * Math.PI * 2;
      ai.wanderDirection = {
        x: Math.cos(angle),
        z: Math.sin(angle)
      };
    }
    
    const speed = zombie.getComponent('movement')?.speed || 2.0;
    velocity.vx = ai.wanderDirection.x * speed * 0.5;
    velocity.vz = ai.wanderDirection.z * speed * 0.5;
    
    // Random state change
    if (Math.random() < 0.01) {
      ai.setState('idle');
    }
  }
  
  updateChasingState(zombie, ai, position, velocity, humans, deltaTime) {
    if (!ai.target || !ai.target.active) {
      ai.setState('wandering');
      return;
    }
    
    const targetPos = ai.target.getComponent('position');
    const distance = position.distanceTo(targetPos);
    
    // Check if target is dead
    const targetHealth = ai.target.getComponent('health');
    if (targetHealth && targetHealth.isDead()) {
      ai.setTarget(null);
      ai.setState('wandering');
      return;
    }
    
    // Attack range check
    const combat = zombie.getComponent('combat');
    const attackRange = combat ? combat.attackRange : 1.5;
    
    if (distance <= attackRange) {
      ai.setState('attacking');
      return;
    }
    
    // Swarm behavior: avoid overcrowding
    const nearbyZombies = this.entityManager.queryInRadius(position, 2.0, 'position', 'zombieAI');
    const separation = new THREE.Vector3();
    
    for (const other of nearbyZombies) {
      if (other === zombie) continue;
      const otherPos = other.getComponent('position');
      const diff = new THREE.Vector3().subVectors(position, otherPos);
      const dist = diff.length();
      if (dist > 0) {
        diff.divideScalar(dist);
        separation.add(diff);
      }
    }
    
    // Move toward target
    const direction = new THREE.Vector3().subVectors(targetPos, position).normalize();
    
    // Combine with separation
    direction.add(separation.multiplyScalar(0.5)).normalize();
    
    const speed = zombie.getComponent('movement')?.maxSpeed || 4.0;
    velocity.vx = direction.x * speed;
    velocity.vz = direction.z * speed;
    
    // Remember last seen position
    ai.lastSeenTarget = targetPos.clone();
  }
  
  updateAttackingState(zombie, ai, position, velocity, humans, deltaTime) {
    if (!ai.target || !ai.target.active) {
      ai.setState('wandering');
      return;
    }
    
    const targetPos = ai.target.getComponent('position');
    const distance = position.distanceTo(targetPos);
    
    const combat = zombie.getComponent('combat');
    const attackRange = combat ? combat.attackRange : 1.5;
    
    // Back off if too close
    if (distance < attackRange * 0.5) {
      const away = new THREE.Vector3().subVectors(position, targetPos).normalize();
      const speed = zombie.getComponent('movement')?.speed || 2.0;
      velocity.vx = away.x * speed * 0.5;
      velocity.vz = away.z * speed * 0.5;
    } else if (distance > attackRange) {
      // Move closer
      ai.setState('chasing');
    }
    
    // Attack handled by CombatSystem
  }
  
  updateFleeingState(zombie, ai, position, velocity, deltaTime) {
    // Flee from threat
    if (ai.threatPosition) {
      const direction = new THREE.Vector3().subVectors(position, ai.threatPosition).normalize();
      const speed = zombie.getComponent('movement')?.maxSpeed || 4.0;
      velocity.vx = direction.x * speed * 1.2;
      velocity.vz = direction.z * speed * 1.2;
      
      // Stop fleeing after distance
      const distance = position.distanceTo(ai.threatPosition);
      if (distance > 30) {
        ai.setState('wandering');
      }
    } else {
      ai.setState('wandering');
    }
  }
  
  detectNearbyHumans(zombie, position, ai) {
    const senses = zombie.getComponent('senses');
    const visionRange = senses ? senses.vision.range : 30;
    
    const humans = this.entityManager.queryInRadius(position, visionRange, 'humanAI', 'position', 'faction');
    const faction = zombie.getComponent('faction');
    
    for (const human of humans) {
      const humanFaction = human.getComponent('faction');
      if (faction.isHostile(humanFaction.factionId)) {
        // Line of sight check (simplified)
        return human;
      }
    }
    
    return null;
  }
}

// === ANIMATION SYSTEM ===
class AnimationSystem extends System {
  constructor(entityManager) {
    super(entityManager);
    this.priority = 70;
  }
  
  update(deltaTime) {
    const entities = this.entityManager.query('animation', 'zombieAI', 'movement');
    
    for (const entity of entities) {
      const animation = entity.getComponent('animation');
      const ai = entity.getComponent('zombieAI');
      const movement = entity.getComponent('movement');
      
      if (!animation.mixer) continue;
      
      // Update animation mixer
      animation.mixer.update(deltaTime);
      
      // Blend animations based on state
      if (ai.state === 'chasing' && movement.isMoving) {
        animation.play('run');
      } else if (ai.state === 'attacking') {
        animation.play('attack');
      } else if (movement.isMoving) {
        animation.play('walk');
      } else {
        animation.play('idle');
      }
    }
  }
}

// === RENDERING SYSTEM ===
class RenderingSystem extends System {
  constructor(entityManager, scene, camera) {
    super(entityManager);
    this.scene = scene;
    this.camera = camera;
    this.priority = 10; // Low priority - runs last
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();
  }
  
  update(deltaTime) {
    // Update frustum for culling
    this.projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
    
    // Update visible entities
    const entities = this.entityManager.query('mesh', 'position', 'rotation');
    
    for (const entity of entities) {
      const meshComp = entity.getComponent('mesh');
      const position = entity.getComponent('position');
      const rotation = entity.getComponent('rotation');
      
      if (!meshComp.mesh) continue;
      
      // Update transform
      meshComp.mesh.position.set(position.x, position.y, position.z);
      meshComp.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      
      // Frustum culling
      const boundingSphere = meshComp.mesh.geometry.boundingSphere;
      if (boundingSphere) {
        const worldSphere = boundingSphere.clone();
        worldSphere.applyMatrix4(meshComp.mesh.matrixWorld);
        
        if (!this.frustum.intersectsSphere(worldSphere)) {
          meshComp.mesh.visible = false;
          continue;
        }
      }
      
      meshComp.mesh.visible = meshComp.visible;
    }
  }
  
  // LOD management
  updateLOD(entities, camera) {
    const lodEntities = this.entityManager.query('lod', 'mesh');
    
    for (const entity of lodEntities) {
      const lod = entity.getComponent('lod');
      const meshComp = entity.getComponent('mesh');
      
      if (!meshComp.mesh) continue;
      
      const distance = camera.position.distanceTo(meshComp.mesh.position);
      const newLevel = lod.updateLevel(distance);
      
      // Update mesh detail based on LOD level
      if (lod.level !== newLevel) {
        this.applyLODLevel(meshComp, newLevel);
      }
    }
  }
  
  applyLODLevel(meshComp, level) {
    // Simplify mesh based on LOD level
    // Implementation depends on mesh complexity
  }
}

// === HEALTH SYSTEM ===
class HealthSystem extends System {
  constructor(entityManager) {
    super(entityManager);
    this.priority = 95;
  }
  
  update(deltaTime) {
    const entities = this.entityManager.query('health', 'position');
    
    for (const entity of entities) {
      const health = entity.getComponent('health');
      
      // Regen
      if (health.regen > 0 && !health.isDead()) {
        health.heal(health.regen * deltaTime);
      }
      
      // Death handling
      if (health.isDead()) {
        this.handleDeath(entity);
      }
    }
  }
  
  handleDeath(entity) {
    const zombieAI = entity.getComponent('zombieAI');
    const humanAI = entity.getComponent('humanAI');
    
    if (zombieAI) {
      // Zombie death
      window.EventBus?.emit('zombieKilled', { entity });
    } else if (humanAI) {
      // Human death
      window.EventBus?.emit('humanKilled', { entity });
    }
    
    // Trigger death handlers
    const health = entity.getComponent('health');
    health.deathHandlers.forEach(handler => handler());
  }
}

// === FORMATION SYSTEM ===
class FormationSystem extends System {
  constructor(entityManager) {
    super(entityManager);
    this.priority = 85;
    this.formations = new Map();
  }
  
  update(deltaTime) {
    const entities = this.entityManager.query('formation', 'position', 'movement');
    
    // Group by formation
    this.formations.clear();
    
    for (const entity of entities) {
      const formation = entity.getComponent('formation');
      if (formation.formationType === 'none' || formation.formationId === -1) continue;
      
      if (!this.formations.has(formation.formationId)) {
        this.formations.set(formation.formationId, []);
      }
      this.formations.get(formation.formationId).push(entity);
    }
    
    // Update formations
    for (const [formationId, members] of this.formations) {
      this.updateFormation(members, deltaTime);
    }
  }
  
  updateFormation(members, deltaTime) {
    if (members.length === 0) return;
    
    // Get formation leader
    const leader = members.find(m => m.getComponent('formation').positionInFormation === 0) || members[0];
    const leaderPos = leader.getComponent('position');
    const leaderVel = leader.getComponent('velocity');
    
    for (const member of members) {
      if (member === leader) continue;
      
      const formation = member.getComponent('formation');
      const position = member.getComponent('position');
      const velocity = member.getComponent('velocity');
      
      // Calculate target position in formation
      const targetX = leaderPos.x + formation.relativeOffset.x;
      const targetZ = leaderPos.z + formation.relativeOffset.z;
      
      // Move toward target position
      const dx = targetX - position.x;
      const dz = targetZ - position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist > 0.1) {
        const speed = member.getComponent('movement')?.speed || 3.0;
        velocity.vx = (dx / dist) * speed;
        velocity.vz = (dz / dist) * speed;
      } else {
        velocity.vx = leaderVel.vx;
        velocity.vz = leaderVel.vz;
      }
    }
  }
  
  // Create formation
  createFormation(type, entities, centerPosition) {
    const formationId = Date.now();
    
    const offsets = this.calculateFormationOffsets(type, entities.length);
    
    entities.forEach((entity, index) => {
      const formation = entity.getComponent('formation') || entity.addComponent('formation');
      formation.formationType = type;
      formation.formationId = formationId;
      formation.positionInFormation = index;
      formation.relativeOffset = offsets[index];
    });
    
    return formationId;
  }
  
  calculateFormationOffsets(type, count) {
    const offsets = [];
    
    switch (type) {
      case 'line':
        for (let i = 0; i < count; i++) {
          offsets.push({ x: (i - count / 2) * 1.5, z: 0 });
        }
        break;
        
      case 'wedge':
        let row = 0;
        let placed = 0;
        while (placed < count) {
          const inRow = Math.min(row * 2 + 1, count - placed);
          for (let i = 0; i < inRow; i++) {
            offsets.push({
              x: (i - (inRow - 1) / 2) * 1.5,
              z: row * 1.5
            });
            placed++;
          }
          row++;
        }
        break;
        
      case 'circle':
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const radius = Math.max(3, count * 0.3);
          offsets.push({
            x: Math.cos(angle) * radius,
            z: Math.sin(angle) * radius
          });
        }
        break;
        
      case 'swarm':
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 10;
          offsets.push({
            x: Math.cos(angle) * radius,
            z: Math.sin(angle) * radius
          });
        }
        break;
    }
    
    return offsets;
  }
}

// === EXPORT ALL SYSTEMS ===
window.ECS.Systems = {
  System,
  MovementSystem,
  CombatSystem,
  ZombieAISystem,
  AnimationSystem,
  RenderingSystem,
  HealthSystem,
  FormationSystem
};

console.log('✅ ECS Systems loaded');
