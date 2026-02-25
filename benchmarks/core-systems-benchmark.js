/**
 * Core Systems Performance Benchmarking Suite
 * Comprehensive performance analysis for Phases 1-10 systems
 * Measures FPS, memory, update times, and scalability
 */

import { WebGPURenderer } from '../core/renderer/WebGPURenderer2026.js';
import { AdvancedPhysicsEngine } from '../core/physics/AdvancedPhysicsEngine.js';
import { MultiAgentAI } from '../core/ai/MultiAgentAI.js';
import { HorrorDirector } from '../core/ai/HorrorDirector.js';
import { GPUParticleSystem } from '../core/renderer/GPUParticleSystem.js';

class BenchmarkRunner {
  constructor() {
    this.results = [];
    this.benchmarks = [];
  }

  async run(name, benchmarkFn, iterations = 5) {
    console.log(`\n🔵 Running: ${name}`);
    
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const result = await benchmarkFn();
      results.push(result);
      
      // Small delay between runs
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Calculate statistics
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const min = Math.min(...results);
    const max = Math.max(...results);
    const stdDev = Math.sqrt(results.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / results.length);
    
    const benchmarkResult = {
      name,
      avg,
      min,
      max,
      stdDev,
      iterations: results,
      unit: 'ms'
    };
    
    this.benchmarks.push(benchmarkResult);
    
    console.log(`   Avg: ${avg.toFixed(2)}ms | Min: ${min.toFixed(2)}ms | Max: ${max.toFixed(2)}ms | σ: ${stdDev.toFixed(2)}`);
    
    return benchmarkResult;
  }

  summary() {
    console.log('\n========================================');
    console.log('📊 BENCHMARK SUMMARY');
    console.log('========================================');
    
    this.benchmarks.forEach(b => {
      const status = b.avg < 16.67 ? '✅' : b.avg < 33.33 ? '⚠️' : '❌';
      console.log(`${status} ${b.name}: ${b.avg.toFixed(2)}ms (${(1000/b.avg).toFixed(1)} FPS)`);
    });
    
    console.log('========================================\n');
  }

  exportJSON() {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      benchmarks: this.benchmarks
    }, null, 2);
  }
}

// ============================================
// RENDERER BENCHMARKS
// ============================================

export async function benchmarkRenderer() {
  const runner = new BenchmarkRunner();
  
  console.log('\n🎨 WEBGPU RENDERER BENCHMARKS\n');
  
  // Test 1: Entity Count Scaling
  await runner.run('Renderer: 100 entities', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const renderer = new WebGPURenderer(canvas);
    await renderer.initialize();
    
    for (let i = 0; i < 100; i++) {
      renderer.addEntity({ id: i, position: { x: Math.random() * 100, y: Math.random() * 100, z: Math.random() * 100 } });
    }
    
    const start = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      renderer.render();
    }
    const elapsed = performance.now() - start;
    
    return elapsed / 60; // Average per frame
  });
  
  await runner.run('Renderer: 1,000 entities', async () => {
    const canvas = document.createElement('canvas');
    const renderer = new WebGPURenderer(canvas);
    await renderer.initialize();
    
    for (let i = 0; i < 1000; i++) {
      renderer.addEntity({ id: i, position: { x: Math.random() * 100, y: Math.random() * 100, z: Math.random() * 100 } });
    }
    
    const start = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      renderer.render();
    }
    const elapsed = performance.now() - start;
    
    return elapsed / 60;
  });
  
  await runner.run('Renderer: 10,000 entities', async () => {
    const canvas = document.createElement('canvas');
    const renderer = new WebGPURenderer(canvas);
    await renderer.initialize();
    
    for (let i = 0; i < 10000; i++) {
      renderer.addEntity({ id: i, position: { x: Math.random() * 100, y: Math.random() * 100, z: Math.random() * 100 } });
    }
    
    const start = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      renderer.render();
    }
    const elapsed = performance.now() - start;
    
    return elapsed / 60;
  });
  
  await runner.run('Renderer: 100,000 entities (Stress)', async () => {
    const canvas = document.createElement('canvas');
    const renderer = new WebGPURenderer(canvas, { enableInstancing: true });
    await renderer.initialize();
    
    for (let i = 0; i < 100000; i++) {
      renderer.addEntity({ id: i, position: { x: Math.random() * 200, y: Math.random() * 200, z: Math.random() * 200 } });
    }
    
    const start = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      renderer.render();
    }
    const elapsed = performance.now() - start;
    
    return elapsed / 60;
  });
  
  // Test 2: Light Count Impact
  await runner.run('Renderer: 0 lights', async () => {
    const canvas = document.createElement('canvas');
    const renderer = new WebGPURenderer(canvas, { maxLights: 0 });
    await renderer.initialize();
    
    for (let i = 0; i < 1000; i++) {
      renderer.addEntity({ id: i, position: { x: Math.random() * 100, y: Math.random() * 100, z: 0 } });
    }
    
    const start = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      renderer.render();
    }
    
    return (performance.now() - start) / 60;
  });
  
  await runner.run('Renderer: 64 lights', async () => {
    const canvas = document.createElement('canvas');
    const renderer = new WebGPURenderer(canvas, { maxLights: 64 });
    await renderer.initialize();
    
    for (let i = 0; i < 1000; i++) {
      renderer.addEntity({ id: i, position: { x: Math.random() * 100, y: Math.random() * 100, z: 0 } });
    }
    
    // Add lights
    for (let i = 0; i < 64; i++) {
      renderer.addLight({
        position: { x: Math.random() * 100, y: Math.random() * 100, z: 10 },
        color: { r: 1, g: 1, b: 1 },
        intensity: 1,
        radius: 10
      });
    }
    
    const start = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      renderer.render();
    }
    
    return (performance.now() - start) / 60;
  });
  
  await runner.run('Renderer: 256 lights (Max)', async () => {
    const canvas = document.createElement('canvas');
    const renderer = new WebGPURenderer(canvas, { maxLights: 256 });
    await renderer.initialize();
    
    for (let i = 0; i < 1000; i++) {
      renderer.addEntity({ id: i, position: { x: Math.random() * 100, y: Math.random() * 100, z: 0 } });
    }
    
    for (let i = 0; i < 256; i++) {
      renderer.addLight({
        position: { x: Math.random() * 100, y: Math.random() * 100, z: 10 },
        color: { r: Math.random(), g: Math.random(), b: Math.random() },
        intensity: 1,
        radius: 10
      });
    }
    
    const start = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      renderer.render();
    }
    
    return (performance.now() - start) / 60;
  });
  
  runner.summary();
  return runner.benchmarks;
}

// ============================================
// PHYSICS BENCHMARKS
// ============================================

export async function benchmarkPhysics() {
  const runner = new BenchmarkRunner();
  
  console.log('\n⚙️ PHYSICS ENGINE BENCHMARKS\n');
  
  await runner.run('Physics: 100 rigid bodies', async () => {
    const physics = new AdvancedPhysicsEngine({ maxObjects: 1000 });
    
    for (let i = 0; i < 100; i++) {
      physics.createObject(Math.random() * 100, Math.random() * 100, 5);
    }
    
    const start = performance.now();
    for (let step = 0; step < 60; step++) {
      physics.update(1/60);
    }
    const elapsed = performance.now() - start;
    
    return elapsed / 60;
  });
  
  await runner.run('Physics: 1,000 rigid bodies', async () => {
    const physics = new AdvancedPhysicsEngine({ maxObjects: 2000 });
    
    for (let i = 0; i < 1000; i++) {
      physics.createObject(Math.random() * 100, Math.random() * 100, 5);
    }
    
    const start = performance.now();
    for (let step = 0; step < 60; step++) {
      physics.update(1/60);
    }
    
    return (performance.now() - start) / 60;
  });
  
  await runner.run('Physics: 10,000 rigid bodies', async () => {
    const physics = new AdvancedPhysicsEngine({ maxObjects: 15000 });
    
    for (let i = 0; i < 10000; i++) {
      physics.createObject(Math.random() * 200, Math.random() * 200, 3);
    }
    
    const start = performance.now();
    for (let step = 0; step < 60; step++) {
      physics.update(1/60);
    }
    
    return (performance.now() - start) / 60;
  });
  
  await runner.run('Physics: 1 soft body (24 segments)', async () => {
    const physics = new AdvancedPhysicsEngine();
    const softBody = physics.createSoftBody(0, 0, 'flesh', { radius: 30, segments: 24 });
    
    const start = performance.now();
    for (let step = 0; step < 60; step++) {
      physics.update(1/60);
    }
    
    return (performance.now() - start) / 60;
  });
  
  await runner.run('Physics: 10 soft bodies', async () => {
    const physics = new AdvancedPhysicsEngine();
    
    for (let i = 0; i < 10; i++) {
      physics.createSoftBody(i * 50, 0, 'flesh', { radius: 20, segments: 20 });
    }
    
    const start = performance.now();
    for (let step = 0; step < 60; step++) {
      physics.update(1/60);
    }
    
    return (performance.now() - start) / 60;
  });
  
  await runner.run('Physics: Fluid sim (1,000 particles)', async () => {
    const physics = new AdvancedPhysicsEngine({ maxFluidParticles: 5000 });
    const fluid = physics.createFluid(0, 0, 1000);
    
    const start = performance.now();
    for (let step = 0; step < 60; step++) {
      physics.update(1/60);
    }
    
    return (performance.now() - start) / 60;
  });
  
  await runner.run('Physics: Fluid sim (5,000 particles)', async () => {
    const physics = new AdvancedPhysicsEngine({ maxFluidParticles: 5000 });
    const fluid = physics.createFluid(0, 0, 5000);
    
    const start = performance.now();
    for (let step = 0; step < 60; step++) {
      physics.update(1/60);
    }
    
    return (performance.now() - start) / 60;
  });
  
  await runner.run('Physics: Combined stress test', async () => {
    const physics = new AdvancedPhysicsEngine({ maxObjects: 5000, maxFluidParticles: 2000 });
    
    // Rigid bodies
    for (let i = 0; i < 1000; i++) {
      physics.createObject(Math.random() * 200, Math.random() * 200, 5);
    }
    
    // Soft bodies
    for (let i = 0; i < 5; i++) {
      physics.createSoftBody(i * 60, 50, 'flesh', { radius: 25 });
    }
    
    // Fluid
    physics.createFluid(100, 100, 1000);
    
    const start = performance.now();
    for (let step = 0; step < 60; step++) {
      physics.update(1/60);
    }
    
    return (performance.now() - start) / 60;
  });
  
  runner.summary();
  return runner.benchmarks;
}

// ============================================
// AI BENCHMARKS
// ============================================

export async function benchmarkAI() {
  const runner = new BenchmarkRunner();
  
  console.log('\n🤖 AI SYSTEMS BENCHMARKS\n');
  
  await runner.run('AI: 1 agent update', async () => {
    const ai = new MultiAgentAI({ maxAgents: 1 });
    ai.addAgent({ id: 'agent1', type: 'hunter' });
    
    const start = performance.now();
    for (let step = 0; step < 1000; step++) {
      ai.update(16);
    }
    
    return (performance.now() - start) / 1000;
  });
  
  await runner.run('AI: 10 agents update', async () => {
    const ai = new MultiAgentAI({ maxAgents: 10 });
    
    for (let i = 0; i < 10; i++) {
      ai.addAgent({ id: `agent${i}`, type: 'hunter' });
    }
    
    const start = performance.now();
    for (let step = 0; step < 1000; step++) {
      ai.update(16);
    }
    
    return (performance.now() - start) / 1000;
  });
  
  await runner.run('AI: 50 agents update', async () => {
    const ai = new MultiAgentAI({ maxAgents: 50 });
    
    for (let i = 0; i < 50; i++) {
      ai.addAgent({ id: `agent${i}`, type: 'hunter', squadId: i < 25 ? 'alpha' : 'bravo' });
    }
    
    const start = performance.now();
    for (let step = 0; step < 1000; step++) {
      ai.update(16);
    }
    
    return (performance.now() - start) / 1000;
  });
  
  await runner.run('AI: Squad communication overhead', async () => {
    const ai = new MultiAgentAI({ 
      maxAgents: 50,
      communicationRange: 100,
      sharedMemoryEnabled: true
    });
    
    for (let i = 0; i < 50; i++) {
      ai.addAgent({ 
        id: `agent${i}`, 
        type: 'hunter',
        squadId: 'main',
        canCommunicate: true
      });
    }
    
    // Simulate shared memory updates
    ai.sharedMemory.playerPosition = { x: 50, y: 50, z: 0 };
    
    const start = performance.now();
    for (let step = 0; step < 1000; step++) {
      ai.update(16);
    }
    
    return (performance.now() - start) / 1000;
  });
  
  await runner.run('AI: Horror Director update', async () => {
    const director = new HorrorDirector();
    
    const start = performance.now();
    for (let step = 0; step < 1000; step++) {
      director.updatePlayerState({ stressLevel: Math.random() });
      director.update(1/60);
    }
    
    return (performance.now() - start) / 1000;
  });
  
  await runner.run('AI: Learning AI Q-table update', async () => {
    const { LearningAI } = await import('../core/ai/LearningAI.js');
    const learningAI = new LearningAI({ learningRate: 0.1 });
    
    learningAI.initializeQTable(['state1', 'state2', 'state3'], ['action1', 'action2']);
    
    const start = performance.now();
    for (let step = 0; step < 1000; step++) {
      learningAI.update('state1', 'action1', Math.random(), 'state2');
    }
    
    return (performance.now() - start) / 1000;
  });
  
  runner.summary();
  return runner.benchmarks;
}

// ============================================
// PARTICLE BENCHMARKS
// ============================================

export async function benchmarkParticles() {
  const runner = new BenchmarkRunner();
  
  console.log('\n✨ GPU PARTICLE BENCHMARKS\n');
  
  await runner.run('Particles: 1,000 particles', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const particles = new GPUParticleSystem(canvas, { maxParticles: 50000 });
    await particles.initialize();
    
    particles.emit(1000, {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 1, y: 1, z: 1 },
      lifetime: 5
    });
    
    const start = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      particles.update(1/60);
      particles.render();
    }
    
    return (performance.now() - start) / 60;
  });
  
  await runner.run('Particles: 10,000 particles', async () => {
    const canvas = document.createElement('canvas');
    const particles = new GPUParticleSystem(canvas, { maxParticles: 50000 });
    await particles.initialize();
    
    particles.emit(10000, {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 1, y: 1, z: 1 },
      lifetime: 5
    });
    
    const start = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      particles.update(1/60);
      particles.render();
    }
    
    return (performance.now() - start) / 60;
  });
  
  await runner.run('Particles: 50,000 particles (Max)', async () => {
    const canvas = document.createElement('canvas');
    const particles = new GPUParticleSystem(canvas, { maxParticles: 50000 });
    await particles.initialize();
    
    particles.emit(50000, {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 1, y: 1, z: 1 },
      lifetime: 5
    });
    
    const start = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      particles.update(1/60);
      particles.render();
    }
    
    return (performance.now() - start) / 60;
  });
  
  runner.summary();
  return runner.benchmarks;
}

// ============================================
// MEMORY BENCHMARKS
// ============================================

export async function benchmarkMemory() {
  const runner = new BenchmarkRunner();
  
  console.log('\n💾 MEMORY USAGE BENCHMARKS\n');
  
  await runner.run('Memory: Renderer baseline', async () => {
    const canvas = document.createElement('canvas');
    const renderer = new WebGPURenderer(canvas);
    await renderer.initialize();
    
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  });
  
  await runner.run('Memory: Renderer + 10k entities', async () => {
    const canvas = document.createElement('canvas');
    const renderer = new WebGPURenderer(canvas);
    await renderer.initialize();
    
    for (let i = 0; i < 10000; i++) {
      renderer.addEntity({ id: i, position: { x: Math.random() * 100, y: Math.random() * 100, z: Math.random() * 100 } });
    }
    
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  });
  
  await runner.run('Memory: Physics with 1k objects', async () => {
    const physics = new AdvancedPhysicsEngine({ maxObjects: 10000 });
    
    for (let i = 0; i < 1000; i++) {
      physics.createObject(Math.random() * 100, Math.random() * 100, 5);
    }
    
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  });
  
  await runner.run('Memory: AI with 50 agents', async () => {
    const ai = new MultiAgentAI({ maxAgents: 50 });
    
    for (let i = 0; i < 50; i++) {
      ai.addAgent({ id: `agent${i}`, type: 'hunter' });
    }
    
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  });
  
  runner.summary();
  return runner.benchmarks;
}

// ============================================
// FULL INTEGRATION BENCHMARK
// ============================================

export async function benchmarkFullIntegration() {
  const runner = new BenchmarkRunner();
  
  console.log('\n🔗 FULL INTEGRATION BENCHMARK\n');
  
  await runner.run('Integration: All systems combined', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const renderer = new WebGPURenderer(canvas);
    const physics = new AdvancedPhysicsEngine({ maxObjects: 2000 });
    const ai = new MultiAgentAI({ maxAgents: 20 });
    const director = new HorrorDirector();
    
    await renderer.initialize();
    
    // Setup scene
    for (let i = 0; i < 500; i++) {
      renderer.addEntity({ id: i, position: { x: Math.random() * 100, y: Math.random() * 100, z: 0 } });
      physics.createObject(Math.random() * 100, Math.random() * 100, 5);
      
      if (i < 20) {
        ai.addAgent({ id: `ai_${i}`, position: { x: Math.random() * 100, y: Math.random() * 100, z: 0 } });
      }
    }
    
    const start = performance.now();
    
    // Simulate 60 frames with all systems
    for (let frame = 0; frame < 60; frame++) {
      renderer.render();
      physics.update(1/60);
      ai.update(16);
      director.update(1/60);
    }
    
    const elapsed = performance.now() - start;
    
    return elapsed / 60;
  });
  
  runner.summary();
  return runner.benchmarks;
}

// ============================================
// MAIN RUNNER
// ============================================

export async function runAllBenchmarks() {
  console.log('🚀 Starting Complete Performance Benchmark Suite...\n');
  console.log('This will take several minutes. Please wait...\n');
  
  const allResults = {
    timestamp: new Date().toISOString(),
    renderer: await benchmarkRenderer(),
    physics: await benchmarkPhysics(),
    ai: await benchmarkAI(),
    particles: await benchmarkParticles(),
    memory: await benchmarkMemory(),
    integration: await benchmarkFullIntegration()
  };
  
  // Export results
  console.log('\n📁 EXPORTING RESULTS...\n');
  console.log(JSON.stringify(allResults, null, 2));
  
  return allResults;
}

// Auto-run if executed directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runAllBenchmarks().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
}
