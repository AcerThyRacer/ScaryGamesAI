/**
 * Physics & Interaction Systems Module - Phase 5 + Phase 2 Enhancement
 * Universal physics library for all 10 horror games
 * Enhanced with advanced vehicle, character, soft body, and fracture systems
 */

// Original Phase 5 systems
export { VerletPhysics } from './VerletPhysics.js';
export { SoftBody } from './SoftBodyPhysics.js';
export { FluidSimulation } from './FluidSimulation.js';
export { DestructionSystem } from './DestructionSystem.js';
export { ClothSimulation } from './ClothSimulation.js';

// Phase 2 Enhancement systems
export { AdvancedPhysicsEngine } from './AdvancedPhysicsEngine.js';
export { FractureSystem } from './FractureSystem.js';
export { VehiclePhysicsSystem } from './VehiclePhysics.js';
export { AdvancedCharacterController } from './AdvancedCharacterController.js';
export { SoftBodyEvolutionSystem } from './SoftBodyEvolution.js';

/**
 * Create a complete physics world
 * @param {Object} options - Physics configuration
 * @returns {Object} Physics systems
 */
export function createPhysicsWorld(options = {}) {
  const verlet = new VerletPhysics(options);
  const softBody = new SoftBody(options);
  const fluid = new FluidSimulation(options);
  const destruction = new DestructionSystem(options);
  const cloth = new ClothSimulation(options);
  
  return {
    verlet,
    softBody,
    fluid,
    destruction,
    cloth,
    
    update(dt) {
      verlet.update(dt);
      softBody.update(dt);
      fluid.update(dt);
      destruction.update(dt);
      cloth.update(dt);
    },
    
    render(ctx) {
      verlet.render(ctx);
      softBody.render(ctx);
      fluid.render(ctx);
      destruction.render(ctx);
      cloth.render(ctx);
    },
    
    clear() {
      verlet.clear();
      softBody.clear();
      fluid.clear();
      destruction.clear();
      cloth.clear();
    }
  };
}

export default {
  VerletPhysics,
  SoftBody,
  FluidSimulation,
  DestructionSystem,
  ClothSimulation,
  createPhysicsWorld
};
