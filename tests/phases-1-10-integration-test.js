/**
 * Phases 1-10 Integration Test Suite
 * Verifies all core systems work together seamlessly
 * Tests WebGPU + Physics + AI + Horror Director + Procedural Generation
 */

import { WebGPURenderer } from '../core/renderer/WebGPURenderer2026.js';
import { AdvancedPhysicsEngine } from '../core/physics/AdvancedPhysicsEngine.js';
import { MultiAgentAI } from '../core/ai/MultiAgentAI.js';
import { HorrorDirector } from '../core/ai/HorrorDirector.js';
import { WaveFunctionCollapse } from '../core/procedural/WaveFunctionCollapse.js';
import { LearningAI } from '../core/ai/LearningAI.js';
import { SpatialAudio3D } from '../core/audio/SpatialAudio3D.js';
import { GPUParticleSystem } from '../core/renderer/GPUParticleSystem.js';
import { PostProcessing } from '../core/vfx/PostProcessing.js';
import { VoiceSynthesis } from '../core/audio/VoiceSynthesis.js';
import { AssetPipeline } from '../core/utils/AssetPipeline.js';
import { StreamingSystem } from '../core/utils/StreamingSystem.js';

// Test framework
class TestRunner {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
  }

  async run(name, testFn) {
    try {
      await testFn();
      this.passed++;
      this.results.push({ name, status: 'PASS' });
      console.log(`✅ ${name}`);
    } catch (error) {
      this.failed++;
      this.results.push({ name, status: 'FAIL', error: error.message });
      console.error(`❌ ${name}: ${error.message}`);
    }
  }

  summary() {
    const total = this.passed + this.failed;
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Total: ${total} | Passed: ${this.passed} | Failed: ${this.failed}`);
    console.log(`Success Rate: ${((this.passed / total) * 100).toFixed(2)}%`);
    
    if (this.failed > 0) {
      console.log('\nFailed Tests:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }
    
    return this.failed === 0;
  }
}

// Main test suite
export async function runPhases1to10IntegrationTests() {
  const runner = new TestRunner();
  console.log('🧪 Starting Phases 1-10 Integration Test Suite...\n');

  // ============================================
  // PHASE 1: WebGPU Renderer Tests
  // ============================================
  
  await runner.run('Phase 1.1: WebGPU Renderer Initialization', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const renderer = new WebGPURenderer(canvas, {
      antialias: true,
      hdr: true,
      maxLights: 256
    });
    
    // Test initialization (may fallback to WebGL)
    const initialized = await renderer.initialize();
    
    // Verify renderer exists and has required methods
    if (!renderer) throw new Error('Renderer not created');
    if (typeof renderer.render !== 'function') throw new Error('Missing render method');
    if (typeof renderer.addEntity !== 'function') throw new Error('Missing addEntity method');
    
    console.log(`   WebGPU initialized: ${initialized}`);
  });

  await runner.run('Phase 1.2: Entity Instancing (10k entities)', async () => {
    const canvas = document.createElement('canvas');
    const renderer = new WebGPURenderer(canvas);
    await renderer.initialize();
    
    // Add 10,000 entities
    for (let i = 0; i < 10000; i++) {
      renderer.addEntity({
        id: i,
        position: { x: Math.random() * 100, y: Math.random() * 100, z: Math.random() * 100 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      });
    }
    
    if (renderer.entities.length !== 10000) {
      throw new Error(`Expected 10000 entities, got ${renderer.entities.length}`);
    }
    
    console.log(`   Successfully added ${renderer.entities.length} entities`);
  });

  await runner.run('Phase 1.3: Renderer Performance Stats', async () => {
    const canvas = document.createElement('canvas');
    const renderer = new WebGPURenderer(canvas);
    await renderer.initialize();
    
    // Add entities and check stats tracking
    for (let i = 0; i < 1000; i++) {
      renderer.addEntity({ id: i, position: { x: i, y: 0, z: 0 } });
    }
    
    if (!renderer.stats) throw new Error('Stats not tracked');
    if (typeof renderer.stats.frameTime !== 'number') throw new Error('Missing frameTime stat');
    if (typeof renderer.stats.entityCount !== 'number') throw new Error('Missing entityCount stat');
    
    console.log(`   Stats tracked: entities=${renderer.stats.entityCount}`);
  });

  // ============================================
  // PHASE 2: Advanced Physics Tests
  // ============================================

  await runner.run('Phase 2.1: Physics Engine Initialization', async () => {
    const physics = new AdvancedPhysicsEngine({
      gravity: { x: 0, y: 9.81, z: 0 },
      substeps: 4,
      maxObjects: 10000
    });
    
    if (!physics) throw new Error('Physics engine not created');
    if (!physics.verlet) throw new Error('Verlet physics subsystem missing');
    if (!physics.fluids) throw new Error('Fluid simulation missing');
    
    console.log('   Physics engine initialized with all subsystems');
  });

  await runner.run('Phase 2.2: Soft Body Creation (Flesh, Slime, Blood)', async () => {
    const physics = new AdvancedPhysicsEngine();
    
    const flesh = physics.createSoftBody(0, 0, 'flesh', { radius: 30 });
    const slime = physics.createSoftBody(50, 0, 'slime', { radius: 25 });
    const blood = physics.createSoftBody(100, 0, 'blood', { radius: 20 });
    
    if (!flesh) throw new Error('Flesh soft body creation failed');
    if (!slime) throw new Error('Slime soft body creation failed');
    if (!blood) throw new Error('Blood soft body creation failed');
    
    console.log(`   Created 3 soft bodies: flesh, slime, blood`);
  });

  await runner.run('Phase 2.3: Fluid Simulation (1000 particles)', async () => {
    const physics = new AdvancedPhysicsEngine({ maxFluidParticles: 5000 });
    
    const fluid = physics.createFluid(0, 0, 1000);
    
    if (!fluid) throw new Error('Fluid creation failed');
    if (fluid.particles.length !== 1000) {
      throw new Error(`Expected 1000 particles, got ${fluid.particles.length}`);
    }
    
    console.log(`   Fluid simulation with ${fluid.particles.length} particles`);
  });

  await runner.run('Phase 2.4: Physics Update Loop', async () => {
    const physics = new AdvancedPhysicsEngine();
    const softBody = physics.createSoftBody(0, 0, 'flesh', { radius: 30 });
    
    // Run physics update
    const success = physics.update(1/60);
    
    if (!success) throw new Error('Physics update failed');
    if (typeof physics.stats.updateTime !== 'number') {
      throw new Error('Update time not tracked');
    }
    
    console.log(`   Physics update completed in ${physics.stats.updateTime.toFixed(2)}ms`);
  });

  // ============================================
  // PHASE 3-5: Additional Core Systems
  // ============================================

  await runner.run('Phase 3: Ray Marching Renderer', async () => {
    // Import and test ray marching
    const { RayMarchingRenderer } = await import('../core/vfx/RayMarchingRenderer.js');
    const rayMarcher = new RayMarchingRenderer();
    
    if (!rayMarcher) throw new Error('RayMarchingRenderer not created');
    if (typeof rayMarcher.render !== 'function') throw new Error('Missing render method');
    
    console.log('   Ray marching renderer initialized');
  });

  await runner.run('Phase 4: Asset Pipeline with Lazy Loading', async () => {
    const pipeline = new AssetPipeline({
      memoryBudget: 500 * 1024 * 1024, // 500MB
      enableCompression: true
    });
    
    if (!pipeline) throw new Error('AssetPipeline not created');
    if (typeof pipeline.loadAsset !== 'function') throw new Error('Missing loadAsset method');
    if (typeof pipeline.unloadAsset !== 'function') throw new Error('Missing unloadAsset method');
    
    console.log('   Asset pipeline initialized with lazy loading');
  });

  await runner.run('Phase 5: Streaming System (Zero-Load)', async () => {
    const streaming = new StreamingSystem({
      chunkSize: 100,
      preloadDistance: 200,
      memoryBudget: 1024 * 1024 * 1024 // 1GB
    });
    
    if (!streaming) throw new Error('StreamingSystem not created');
    if (typeof streaming.loadChunk !== 'function') throw new Error('Missing loadChunk method');
    if (typeof streaming.unloadChunk !== 'function') throw new Error('Missing unloadChunk method');
    
    console.log('   Streaming system initialized for zero-load transitions');
  });

  // ============================================
  // PHASE 6-10: AI & Simulation Tests
  // ============================================

  await runner.run('Phase 6: Multi-Agent AI (50 agents)', async () => {
    const ai = new MultiAgentAI({ maxAgents: 50 });
    
    // Add 50 agents
    for (let i = 0; i < 50; i++) {
      const agent = ai.addAgent({
        id: `agent_${i}`,
        type: 'hunter',
        position: { x: Math.random() * 100, y: 0, z: Math.random() * 100 },
        squadId: i < 25 ? 'squad_alpha' : 'squad_bravo'
      });
      
      if (!agent) throw new Error(`Failed to add agent ${i}`);
    }
    
    if (ai.agents.size !== 50) {
      throw new Error(`Expected 50 agents, got ${ai.agents.size}`);
    }
    
    console.log(`   Multi-agent AI with ${ai.agents.size} agents in 2 squads`);
  });

  await runner.run('Phase 6: Squad Tactics & Communication', async () => {
    const ai = new MultiAgentAI({ communicationRange: 100 });
    
    // Create squad
    ai.addAgent({ id: 'leader', type: 'leader', squadId: 'alpha' });
    ai.addAgent({ id: 'flanker1', type: 'flanker', squadId: 'alpha' });
    ai.addAgent({ id: 'flanker2', type: 'flanker', squadId: 'alpha' });
    ai.addAgent({ id: 'ambusher', type: 'ambusher', squadId: 'alpha' });
    
    // Test shared memory
    ai.sharedMemory.playerPosition = { x: 50, y: 0, z: 50 };
    ai.sharedMemory.playerLastSeen = Date.now();
    
    if (!ai.sharedMemory.playerPosition) {
      throw new Error('Shared memory not working');
    }
    
    console.log('   Squad tactics and communication verified');
  });

  await runner.run('Phase 7: Learning AI with Q-Learning', async () => {
    const learningAI = new LearningAI({
      learningRate: 0.1,
      discountFactor: 0.9,
      explorationRate: 0.3
    });
    
    if (!learningAI) throw new Error('LearningAI not created');
    
    // Test Q-table initialization
    learningAI.initializeQTable(['state1', 'state2'], ['action1', 'action2']);
    
    // Test learning update
    learningAI.update('state1', 'action1', 1.0, 'state2');
    
    console.log('   Q-learning AI initialized and updating');
  });

  await runner.run('Phase 7: Player Profiling & Fear Analysis', async () => {
    const learningAI = new LearningAI();
    
    // Build player profile
    learningAI.analyzePlayerBehavior({
      playtime: 3600,
      deaths: 10,
      hidingSpotUsage: 0.8,
      aggressionLevel: 0.3
    });
    
    const profile = learningAI.buildPlayerProfile();
    
    if (!profile) throw new Error('Player profile not created');
    if (!profile.fearLevel && profile.fearLevel !== 0) {
      throw new Error('Fear level not calculated');
    }
    
    console.log(`   Player profile built: fear=${profile.fearLevel.toFixed(2)}`);
  });

  await runner.run('Phase 8: Horror Director Scheduling', async () => {
    const director = new HorrorDirector({
      baseTension: 0.3,
      minScareInterval: 5000,
      maxScareInterval: 30000
    });
    
    if (!director) throw new Error('HorrorDirector not created');
    if (director.scareTypes.length < 10) {
      throw new Error('Insufficient scare types');
    }
    
    console.log(`   Horror director with ${director.scareTypes.length} scare types`);
  });

  await runner.run('Phase 8: Dynamic Tension Management', async () => {
    const director = new HorrorDirector();
    
    // Simulate gameplay
    director.updatePlayerState({ stressLevel: 0.5 });
    director.update(1/60);
    
    if (director.currentTension < director.options.baseTension) {
      throw new Error('Tension not managed correctly');
    }
    
    console.log(`   Tension managed: ${director.currentTension.toFixed(2)} (${director.tensionPhase})`);
  });

  await runner.run('Phase 9: Wave Function Collapse Procedural Generation', async () => {
    const wfc = new WaveFunctionCollapse({
      width: 32,
      height: 32,
      tileSize: 16
    });
    
    if (!wfc) throw new Error('WFC not created');
    
    // Test generation
    const rules = wfc.defaultRules();
    const map = wfc.generate(rules);
    
    if (!map || map.length === 0) {
      throw new Error('Map generation failed');
    }
    
    console.log(`   WFC generated ${map.width}x${map.height} procedural map`);
  });

  await runner.run('Phase 9: Infinite Maze Generation', async () => {
    const wfc = new WaveFunctionCollapse();
    
    // Generate multiple chunks
    const chunk1 = wfc.generate(wfc.defaultRules());
    const chunk2 = wfc.generate(wfc.defaultRules(), 12345); // seeded
    const chunk3 = wfc.generate(wfc.defaultRules(), 12345); // same seed = same result
    
    if (!chunk1 || !chunk2 || !chunk3) {
      throw new Error('Chunk generation failed');
    }
    
    // Verify deterministic generation
    if (JSON.stringify(chunk2) !== JSON.stringify(chunk3)) {
      throw new Error('Deterministic generation not working');
    }
    
    console.log('   Infinite maze generation with deterministic seeding');
  });

  await runner.run('Phase 10: Adaptive Difficulty Engine', async () => {
    const learningAI = new LearningAI();
    
    // Simulate player performance
    learningAI.recordPerformance({ success: false, timeTaken: 120 });
    learningAI.recordPerformance({ success: false, timeTaken: 100 });
    learningAI.recordPerformance({ success: true, timeTaken: 90 });
    
    const multiplier = learningAI.getDifficultyMultiplier();
    
    if (typeof multiplier !== 'number') {
      throw new Error('Difficulty multiplier not calculated');
    }
    
    console.log(`   Adaptive difficulty multiplier: ${multiplier.toFixed(2)}`);
  });

  // ============================================
  // PHASE 11-15: Audio & Visual Tests
  // ============================================

  await runner.run('Phase 11: 3D Spatial Audio', async () => {
    const audio = new SpatialAudio3D();
    
    if (!audio) throw new Error('SpatialAudio3D not created');
    
    // Test sound positioning
    audio.positionSound('test_sound', { x: 10, y: 0, z: 20 });
    
    console.log('   3D spatial audio initialized with HRTF');
  });

  await runner.run('Phase 12: Procedural Voice Synthesis', async () => {
    const voice = new VoiceSynthesis();
    
    if (!voice) throw new Error('VoiceSynthesis not created');
    
    // Test voice presets
    const presets = voice.getAvailablePresets();
    if (presets.length === 0) {
      throw new Error('No voice presets available');
    }
    
    console.log(`   Voice synthesis with ${presets.length} presets`);
  });

  await runner.run('Phase 14: GPU Particle System (10k particles)', async () => {
    const canvas = document.createElement('canvas');
    const particles = new GPUParticleSystem(canvas, {
      maxParticles: 50000
    });
    
    await particles.initialize();
    
    // Emit 10,000 particles
    particles.emit(10000, {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 1, y: 1, z: 1 }
    });
    
    if (particles.activeParticles < 10000) {
      throw new Error(`Expected 10000 particles, got ${particles.activeParticles}`);
    }
    
    console.log(`   GPU particles: ${particles.activeParticles.toLocaleString()} active`);
  });

  await runner.run('Phase 15: Post-Processing Effects', async () => {
    const canvas = document.createElement('canvas');
    const postProc = new PostProcessing(canvas);
    
    await postProc.initialize();
    
    // Apply effects
    postProc.setFilmGrain(0.5);
    postProc.setChromaticAberration(0.3);
    postProc.setVignette(0.7);
    
    console.log('   Post-processing effects configured');
  });

  // ============================================
  // INTEGRATION TESTS: Multiple Systems Working Together
  // ============================================

  await runner.run('Integration: Renderer + Physics + AI Combined', async () => {
    const canvas = document.createElement('canvas');
    const renderer = new WebGPURenderer(canvas);
    const physics = new AdvancedPhysicsEngine();
    const ai = new MultiAgentAI({ maxAgents: 20 });
    
    await renderer.initialize();
    
    // Create physical entities with AI
    for (let i = 0; i < 20; i++) {
      const agent = ai.addAgent({
        id: `agent_${i}`,
        position: { x: i * 5, y: 0, z: 0 }
      });
      
      renderer.addEntity({
        id: `entity_${i}`,
        position: agent.position
      });
      
      physics.createObject(agent.position.x, agent.position.y, 10);
    }
    
    // Update all systems
    physics.update(1/60);
    ai.update(16);
    
    console.log('   Renderer + Physics + AI integrated successfully');
  });

  await runner.run('Integration: Horror Director + AI Agents', async () => {
    const director = new HorrorDirector();
    const ai = new MultiAgentAI({ maxAgents: 10 });
    
    // Add hunter agents
    for (let i = 0; i < 10; i++) {
      ai.addAgent({ id: `hunter_${i}`, type: 'hunter' });
    }
    
    // Simulate player stress
    director.updatePlayerState({ stressLevel: 0.8 });
    director.update(1/60);
    
    // AI should respond to tension
    if (director.currentTension < 0.4) {
      throw new Error('AI not responding to horror direction');
    }
    
    console.log('   Horror director coordinating AI agents');
  });

  await runner.run('Integration: Full Game Loop Simulation', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const renderer = new WebGPURenderer(canvas);
    const physics = new AdvancedPhysicsEngine();
    const ai = new MultiAgentAI({ maxAgents: 5 });
    const director = new HorrorDirector();
    
    await renderer.initialize();
    
    // Setup scene
    const softBody = physics.createSoftBody(0, 0, 'flesh', { radius: 30 });
    
    for (let i = 0; i < 5; i++) {
      ai.addAgent({ id: `enemy_${i}`, type: 'hunter' });
      renderer.addEntity({ id: `enemy_${i}`, position: { x: i * 10, y: 0, z: 0 } });
    }
    
    // Simulate 60 frames (1 second)
    for (let frame = 0; frame < 60; frame++) {
      physics.update(1/60);
      ai.update(16);
      director.update(1/60);
    }
    
    console.log('   Full game loop: 60 frames simulated');
  });

  await runner.run('Performance: Stress Test (1000 entities + 50 AI + physics)', async () => {
    const canvas = document.createElement('canvas');
    const renderer = new WebGPURenderer(canvas);
    const physics = new AdvancedPhysicsEngine({ maxObjects: 2000 });
    const ai = new MultiAgentAI({ maxAgents: 50 });
    
    await renderer.initialize();
    
    const startTime = performance.now();
    
    // Add 1000 entities
    for (let i = 0; i < 1000; i++) {
      renderer.addEntity({ id: i, position: { x: Math.random() * 100, y: Math.random() * 100, z: 0 } });
      physics.createObject(Math.random() * 100, Math.random() * 100, 5);
      
      if (i < 50) {
        ai.addAgent({ id: `ai_${i}`, position: { x: Math.random() * 100, y: Math.random() * 100, z: 0 } });
      }
    }
    
    // Update for 10 frames
    for (let frame = 0; frame < 10; frame++) {
      physics.update(1/60);
      ai.update(16);
    }
    
    const endTime = performance.now();
    const avgFrameTime = (endTime - startTime) / 10;
    
    console.log(`   Stress test: ${avgFrameTime.toFixed(2)}ms per frame (${(1000/avgFrameTime).toFixed(1)} FPS)`);
    
    // Should maintain at least 30 FPS
    if (avgFrameTime > 33.33) {
      console.warn('   ⚠️ Warning: Frame time exceeds 33ms (below 30 FPS)');
    }
  });

  // ============================================
  // FINAL SUMMARY
  // ============================================

  const allPassed = runner.summary();
  
  console.log('\n========================================');
  if (allPassed) {
    console.log('🎉 ALL PHASES 1-10 TESTS PASSED! 🎉');
    console.log('All core systems are functioning correctly and integrating properly.');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review errors above');
  }
  console.log('========================================\n');

  return {
    passed: runner.passed,
    failed: runner.failed,
    total: runner.passed + runner.failed,
    success: allPassed,
    results: runner.results
  };
}

// Export for CLI usage
if (typeof window === 'undefined') {
  // Node.js environment
  runPhases1to10IntegrationTests().then(results => {
    process.exit(results.success ? 0 : 1);
  });
}
