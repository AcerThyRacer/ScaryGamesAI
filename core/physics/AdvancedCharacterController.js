/**
 * Advanced Character Controller - Phase 2 Enhancement
 * Capsule-based movement with collisions, step climbing, slope handling, and ragdoll blending
 */

export class AdvancedCharacterController {
  constructor(options = {}) {
    this.options = {
      maxSlopeAngle: options.maxSlopeAngle || 45,
      stepHeight: options.stepHeight || 0.5,
      minGroundDistance: options.minGroundDistance || 0.2,
      enableRagdollBlending: options.enableRagdollBlending || true,
      enablePushPull: options.enablePushPull || true,
      ...options
    };

    this.characters = new Map();
    this.stats = { activeCharacters: 0, updateTime: 0 };
  }

  createCharacter(id, config) {
    const character = {
      id,
      
      // Capsule collider
      capsule: {
        radius: config.radius || 0.5,
        height: config.height || 1.8,
        position: config.position || { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 }
      },
      
      // Movement state
      isGrounded: false,
      isSloped: false,
      slopeAngle: 0,
      isStepping: false,
      currentStep: 0,
      
      // Ground info
      groundNormal: { x: 0, y: 1, z: 0 },
      groundDistance: 0,
      groundVelocity: { x: 0, y: 0, z: 0 },
      
      // Input
      inputDirection: { x: 0, y: 0, z: 0 },
      lookDirection: { x: 0, y: 0, z: -1 },
      jumpPressed: false,
      sprintPressed: false,
      
      // Movement parameters
      moveSpeed: config.moveSpeed || 5.0,
      sprintSpeed: config.sprintSpeed || 8.0,
      jumpForce: config.jumpForce || 7.0,
      gravity: config.gravity || 9.81,
      acceleration: config.acceleration || 10.0,
      deceleration: config.deceleration || 15.0,
      
      // Collision response
      pushableObjects: [],
      pushedByObjects: []
    };

    this.characters.set(id, character);
    this.stats.activeCharacters++;
    return character;
  }

  update(characterId, deltaTime, environment) {
    const startTime = performance.now();
    const character = this.characters.get(characterId);
    if (!character) return;

    // Ground detection
    this.detectGround(character, environment);
    
    // Handle slopes
    this.handleSlopes(character, deltaTime);
    
    // Apply input
    this.applyMovementInput(character, deltaTime);
    
    // Apply gravity
    this.applyGravity(character, deltaTime);
    
    // Step climbing
    if (this.options.enableRagdollBlending) {
      this.handleStepClimbing(character, deltaTime);
    }
    
    // Collision resolution
    this.resolveCollisions(character, deltaTime, environment);
    
    // Push/pull dynamics
    if (this.options.enablePushPull) {
      this.handlePushPull(character, deltaTime);
    }
    
    // Update position
    this.updatePosition(character, deltaTime);

    this.stats.updateTime = performance.now() - startTime;
  }

  detectGround(character, environment) {
    const { capsule, minGroundDistance } = character;
    
    // Raycast down from capsule bottom
    const rayStart = {
      x: capsule.position.x,
      y: capsule.position.y - capsule.height / 2 + 0.1,
      z: capsule.position.z
    };
    
    const rayLength = minGroundDistance + 0.5;
    const hit = this.raycast(rayStart, { x: 0, y: -1, z: 0 }, rayLength, environment);
    
    if (hit && hit.distance <= minGroundDistance + 0.2) {
      character.isGrounded = true;
      character.groundDistance = hit.distance;
      character.groundNormal = hit.normal;
      
      // Calculate slope angle
      character.slopeAngle = Math.acos(hit.normal.y) * (180 / Math.PI);
      character.isSloped = character.slopeAngle > 5;
    } else {
      character.isGrounded = false;
      character.groundDistance = Infinity;
      character.groundNormal = { x: 0, y: 1, z: 0 };
      character.slopeAngle = 0;
      character.isSloped = false;
    }
  }

  raycast(start, direction, length, environment) {
    // Simplified raycast - would use spatial partitioning in production
    if (environment && environment.groundY !== undefined) {
      const distance = (start.y - environment.groundY) / -direction.y;
      if (distance >= 0 && distance <= length) {
        return {
          distance,
          normal: { x: 0, y: 1, z: 0 },
          point: {
            x: start.x + direction.x * distance,
            y: environment.groundY,
            z: start.z + direction.z * distance
          }
        };
      }
    }
    return null;
  }

  handleSlopes(character, deltaTime) {
    if (!character.isSloped) return;
    
    const { groundNormal, slopeAngle, maxSlopeAngle } = character;
    
    // Check if slope is too steep
    if (slopeAngle > maxSlopeAngle) {
      // Slide down slope
      const slideDirection = {
        x: -groundNormal.x,
        y: 0,
        z: -groundNormal.z
      };
      
      const slideForce = Math.sin((slopeAngle - maxSlopeAngle) * Math.PI / 180) * character.gravity;
      
      character.velocity.x += slideDirection.x * slideForce * deltaTime;
      character.velocity.z += slideDirection.z * slideForce * deltaTime;
    }
  }

  applyMovementInput(character, deltaTime) {
    const { inputDirection, lookDirection, moveSpeed, sprintSpeed, isGrounded } = character;
    
    if (inputDirection.x === 0 && inputDirection.z === 0) {
      // Apply deceleration
      character.velocity.x *= 0.9;
      character.velocity.z *= 0.9;
      return;
    }
    
    // Calculate movement direction relative to look direction
    const forward = { x: lookDirection.x, y: 0, z: lookDirection.z };
    const right = { x: -lookDirection.z, y: 0, z: lookDirection.x };
    
    const moveDirection = {
      x: forward.x * inputDirection.z + right.x * inputDirection.x,
      y: 0,
      z: forward.z * inputDirection.z + right.z * inputDirection.x
    };
    
    // Normalize
    const length = Math.sqrt(moveDirection.x ** 2 + moveDirection.z ** 2);
    if (length > 0) {
      moveDirection.x /= length;
      moveDirection.z /= length;
    }
    
    // Determine target speed
    const targetSpeed = character.sprintPressed ? sprintSpeed : moveSpeed;
    
    // Accelerate towards target speed
    const currentSpeed = Math.sqrt(character.velocity.x ** 2 + character.velocity.z ** 2);
    const acceleration = character.acceleration * deltaTime;
    
    if (currentSpeed < targetSpeed) {
      const newSpeed = Math.min(currentSpeed + acceleration, targetSpeed);
      const scale = newSpeed / Math.max(currentSpeed, 0.001);
      character.velocity.x = moveDirection.x * newSpeed;
      character.velocity.z = moveDirection.z * newSpeed;
    }
  }

  applyGravity(character, deltaTime) {
    if (!character.isGrounded) {
      character.velocity.y -= character.gravity * deltaTime;
    }
  }

  handleStepClimbing(character, deltaTime) {
    const { capsule, stepHeight, isGrounded } = character;
    
    if (!isGrounded || character.inputDirection.x === 0 && character.inputDirection.z === 0) {
      return;
    }
    
    // Check for step obstacle
    const stepRayStart = {
      x: capsule.position.x,
      y: capsule.position.y - capsule.height / 2,
      z: capsule.position.z
    };
    
    const moveDirection = {
      x: character.inputDirection.x,
      y: 0,
      z: character.inputDirection.z
    };
    
    const stepHit = this.raycast(stepRayStart, moveDirection, capsule.radius + 0.1, {});
    
    if (stepHit && stepHit.distance < capsule.radius) {
      // Try to step up
      const stepUp = {
        x: 0,
        y: stepHeight,
        z: 0
      };
      
      const stepCheck = this.raycast(
        { ...stepRayStart, y: stepRayStart.y + stepHeight },
        { x: 0, y: -1, z: 0 },
        stepHeight + 0.2,
        {}
      );
      
      if (stepCheck && stepCheck.distance <= stepHeight) {
        // Valid step - move up
        character.position.y += stepHeight - stepCheck.distance;
        character.isStepping = true;
        character.currentStep = stepHeight - stepCheck.distance;
      }
    }
  }

  resolveCollisions(character, deltaTime, environment) {
    const { capsule } = character;
    
    // Check capsule against environment
    const collisions = this.checkCapsuleCollisions(capsule, environment);
    
    for (const collision of collisions) {
      // Resolve penetration
      const penetrationDepth = collision.depth;
      const correction = {
        x: collision.normal.x * penetrationDepth,
        y: collision.normal.y * penetrationDepth,
        z: collision.normal.z * penetrationDepth
      };
      
      character.position.x += correction.x;
      character.position.y += correction.y;
      character.position.z += correction.z;
      
      // Reflect velocity
      const dotProduct = 
        character.velocity.x * collision.normal.x +
        character.velocity.y * collision.normal.y +
        character.velocity.z * collision.normal.z;
      
      if (dotProduct < 0) {
        character.velocity.x -= (1 + 0.3) * dotProduct * collision.normal.x;
        character.velocity.y -= (1 + 0.3) * dotProduct * collision.normal.y;
        character.velocity.z -= (1 + 0.3) * dotProduct * collision.normal.z;
      }
    }
  }

  checkCapsuleCollisions(capsule, environment) {
    // Simplified collision detection
    const collisions = [];
    
    // Ground collision
    if (capsule.position.y - capsule.height / 2 - capsule.radius < 0) {
      collisions.push({
        normal: { x: 0, y: 1, z: 0 },
        depth: capsule.radius + capsule.height / 2 - capsule.position.y
      });
    }
    
    return collisions;
  }

  handlePushPull(character, deltaTime) {
    // Push physics objects
    for (const obj of character.pushableObjects) {
      const dx = character.position.x - obj.position.x;
      const dz = character.position.z - obj.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < character.capsule.radius + obj.radius) {
        // Push object
        const force = 50.0;
        const dirX = dx / distance;
        const dirZ = dz / distance;
        
        obj.velocity.x += dirX * force * deltaTime;
        obj.velocity.z += dirZ * force * deltaTime;
      }
    }
  }

  updatePosition(character, deltaTime) {
    const { capsule, velocity } = character;
    
    capsule.position.x += velocity.x * deltaTime;
    capsule.position.y += velocity.y * deltaTime;
    capsule.position.z += velocity.z * deltaTime;
  }

  setInput(characterId, input) {
    const character = this.characters.get(characterId);
    if (!character) return;
    
    character.inputDirection = input.direction || { x: 0, y: 0, z: 0 };
    character.lookDirection = input.look || { x: 0, y: 0, z: -1 };
    character.jumpPressed = input.jump || false;
    character.sprintPressed = input.sprint || false;
    
    // Handle jump
    if (character.jumpPressed && character.isGrounded) {
      character.velocity.y = character.jumpForce;
      character.isGrounded = false;
    }
  }

  getStats() {
    return {
      ...this.stats,
      characterCount: this.characters.size
    };
  }
}
