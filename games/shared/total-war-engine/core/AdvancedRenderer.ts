/**
 * Total War Engine - Advanced Renderer
 * WebGPU-first with WebGL2 fallback, PBR materials, and post-processing
 */

import type { EntityId, Vector3, Matrix4, PerformanceMetrics, LODLevel } from '../types';

// ============================================================================
// GPU Capability Detection
// ============================================================================

export interface GPUCapabilities {
  webgpu: boolean;
  webgl2: boolean;
  maxTextureSize: number;
  maxDrawBuffers: number;
  instancing: boolean;
  floatTextures: boolean;
  depthTextures: boolean;
  anisotropicFiltering: boolean;
  vram: number; // Estimated VRAM in MB
}

export async function detectGPUCapabilities(): Promise<GPUCapabilities> {
  const caps: GPUCapabilities = {
    webgpu: false,
    webgl2: false,
    maxTextureSize: 2048,
    maxDrawBuffers: 8,
    instancing: false,
    floatTextures: false,
    depthTextures: false,
    anisotropicFiltering: false,
    vram: 512,
  };

  // Check WebGPU
  if ('gpu' in navigator) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        caps.webgpu = true;
      }
    } catch (e) {
      // WebGPU not available
    }
  }

  // Check WebGL2
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;

  if (gl) {
    caps.webgl2 = true;
    caps.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    caps.maxDrawBuffers = gl.getParameter(gl.MAX_DRAW_BUFFERS);
    caps.instancing = true;
    caps.floatTextures = !!gl.getExtension('EXT_color_buffer_float');
    caps.depthTextures = !!gl.getExtension('WEBGL_depth_texture');

    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    caps.anisotropicFiltering = !!aniso;

    // Estimate VRAM based on max texture size
    if (caps.maxTextureSize >= 16384) {
      caps.vram = 4096;
    } else if (caps.maxTextureSize >= 8192) {
      caps.vram = 2048;
    } else if (caps.maxTextureSize >= 4096) {
      caps.vram = 1024;
    }
  }

  return caps;
}

// ============================================================================
// Quality Presets
// ============================================================================

export type QualityPreset = 'ultra' | 'high' | 'medium' | 'low' | 'auto';

export interface QualitySettings {
  shadowQuality: 'off' | 'low' | 'medium' | 'high' | 'ultra';
  shadowResolution: number;
  shadowCascadeCount: number;
  shadowDistance: number;
  textureQuality: 'low' | 'medium' | 'high' | 'ultra';
  anisotropicLevel: number;
  antiAliasing: 'none' | 'fxaa' | 'smaa' | 'msaa2x' | 'msaa4x' | 'msaa8x';
  lodBias: number;
  maxLodDistance: number;
  particleQuality: 'low' | 'medium' | 'high' | 'ultra';
  maxParticleCount: number;
  postProcessing: boolean;
  ssao: boolean;
  bloom: boolean;
  volumetricFog: boolean;
  godRays: boolean;
  motionBlur: boolean;
  depthOfField: boolean;
  vegetationDensity: number;
  unitDetail: number;
}

export const QUALITY_PRESETS: Record<QualityPreset, QualitySettings> = {
  ultra: {
    shadowQuality: 'ultra',
    shadowResolution: 4096,
    shadowCascadeCount: 4,
    shadowDistance: 200,
    textureQuality: 'ultra',
    anisotropicLevel: 16,
    antiAliasing: 'msaa8x',
    lodBias: 1.0,
    maxLodDistance: 150,
    particleQuality: 'ultra',
    maxParticleCount: 10000,
    postProcessing: true,
    ssao: true,
    bloom: true,
    volumetricFog: true,
    godRays: true,
    motionBlur: true,
    depthOfField: true,
    vegetationDensity: 1.0,
    unitDetail: 1.0,
  },
  high: {
    shadowQuality: 'high',
    shadowResolution: 2048,
    shadowCascadeCount: 3,
    shadowDistance: 150,
    textureQuality: 'high',
    anisotropicLevel: 8,
    antiAliasing: 'msaa4x',
    lodBias: 0.8,
    maxLodDistance: 120,
    particleQuality: 'high',
    maxParticleCount: 5000,
    postProcessing: true,
    ssao: true,
    bloom: true,
    volumetricFog: true,
    godRays: false,
    motionBlur: false,
    depthOfField: false,
    vegetationDensity: 0.8,
    unitDetail: 0.9,
  },
  medium: {
    shadowQuality: 'medium',
    shadowResolution: 1024,
    shadowCascadeCount: 2,
    shadowDistance: 100,
    textureQuality: 'medium',
    anisotropicLevel: 4,
    antiAliasing: 'fxaa',
    lodBias: 0.5,
    maxLodDistance: 80,
    particleQuality: 'medium',
    maxParticleCount: 2000,
    postProcessing: true,
    ssao: false,
    bloom: true,
    volumetricFog: false,
    godRays: false,
    motionBlur: false,
    depthOfField: false,
    vegetationDensity: 0.5,
    unitDetail: 0.7,
  },
  low: {
    shadowQuality: 'low',
    shadowResolution: 512,
    shadowCascadeCount: 1,
    shadowDistance: 50,
    textureQuality: 'low',
    anisotropicLevel: 1,
    antiAliasing: 'none',
    lodBias: 0.0,
    maxLodDistance: 50,
    particleQuality: 'low',
    maxParticleCount: 500,
    postProcessing: false,
    ssao: false,
    bloom: false,
    volumetricFog: false,
    godRays: false,
    motionBlur: false,
    depthOfField: false,
    vegetationDensity: 0.2,
    unitDetail: 0.4,
  },
  auto: {
    shadowQuality: 'medium',
    shadowResolution: 1024,
    shadowCascadeCount: 2,
    shadowDistance: 100,
    textureQuality: 'medium',
    anisotropicLevel: 4,
    antiAliasing: 'fxaa',
    lodBias: 0.5,
    maxLodDistance: 80,
    particleQuality: 'medium',
    maxParticleCount: 2000,
    postProcessing: true,
    ssao: false,
    bloom: true,
    volumetricFog: false,
    godRays: false,
    motionBlur: false,
    depthOfField: false,
    vegetationDensity: 0.5,
    unitDetail: 0.7,
  },
};

// ============================================================================
// PBR Material
// ============================================================================

export interface PBRMaterial {
  albedoColor: [number, number, number];
  albedoMap?: GPUTexture | WebGLTexture | null;
  metallic: number;
  metallicMap?: GPUTexture | WebGLTexture | null;
  roughness: number;
  roughnessMap?: GPUTexture | WebGLTexture | null;
  normalMap?: GPUTexture | WebGLTexture | null;
  occlusionMap?: GPUTexture | WebGLTexture | null;
  emissiveColor: [number, number, number];
  emissiveMap?: GPUTexture | WebGLTexture | null;
  emissiveIntensity: number;
  alphaCutoff: number;
  doubleSided: boolean;
}

export const DEFAULT_MATERIAL: PBRMaterial = {
  albedoColor: [0.8, 0.8, 0.8],
  metallic: 0.0,
  roughness: 0.5,
  emissiveColor: [0, 0, 0],
  emissiveIntensity: 0,
  alphaCutoff: 0.5,
  doubleSided: false,
};

// Material presets for common surfaces
export const MATERIAL_PRESETS: Record<string, PBRMaterial> = {
  steel: {
    ...DEFAULT_MATERIAL,
    albedoColor: [0.6, 0.62, 0.65],
    metallic: 0.95,
    roughness: 0.25,
  },
  bronze: {
    ...DEFAULT_MATERIAL,
    albedoColor: [0.8, 0.6, 0.3],
    metallic: 0.9,
    roughness: 0.35,
  },
  leather: {
    ...DEFAULT_MATERIAL,
    albedoColor: [0.35, 0.2, 0.1],
    metallic: 0.0,
    roughness: 0.8,
  },
  cloth: {
    ...DEFAULT_MATERIAL,
    albedoColor: [0.5, 0.1, 0.1],
    metallic: 0.0,
    roughness: 0.95,
  },
  skin: {
    ...DEFAULT_MATERIAL,
    albedoColor: [0.9, 0.75, 0.65],
    metallic: 0.0,
    roughness: 0.7,
  },
  zombieSkin: {
    ...DEFAULT_MATERIAL,
    albedoColor: [0.4, 0.55, 0.4],
    metallic: 0.0,
    roughness: 0.85,
  },
  stone: {
    ...DEFAULT_MATERIAL,
    albedoColor: [0.5, 0.48, 0.45],
    metallic: 0.0,
    roughness: 0.9,
  },
  wood: {
    ...DEFAULT_MATERIAL,
    albedoColor: [0.4, 0.25, 0.1],
    metallic: 0.0,
    roughness: 0.85,
  },
  grass: {
    ...DEFAULT_MATERIAL,
    albedoColor: [0.3, 0.5, 0.2],
    metallic: 0.0,
    roughness: 0.95,
  },
  dirt: {
    ...DEFAULT_MATERIAL,
    albedoColor: [0.4, 0.35, 0.25],
    metallic: 0.0,
    roughness: 1.0,
  },
};

// ============================================================================
// LOD System
// ============================================================================

export class LODSystem {
  private lodDistances: number[] = [30, 60, 100, 200];
  private lodLevels: Map<EntityId, number> = new Map();

  updateLOD(entityId: EntityId, distance: number): number {
    let level = 0;
    for (let i = 0; i < this.lodDistances.length; i++) {
      if (distance > this.lodDistances[i]) {
        level = i + 1;
      }
    }
    this.lodLevels.set(entityId, level);
    return level;
  }

  getLODLevel(entityId: EntityId): number {
    return this.lodLevels.get(entityId) || 0;
  }

  setLODDistances(distances: number[]): void {
    this.lodDistances = distances;
  }

  getLODStats(): LODLevel[] {
    const stats: Map<number, number> = new Map();
    for (const level of this.lodLevels.values()) {
      stats.set(level, (stats.get(level) || 0) + 1);
    }

    return Array.from(stats.entries()).map(([level, count]) => ({
      distance: this.lodDistances[level] || Infinity,
      entityCount: count,
      detailLevel: level === 0 ? 'full' : level === 1 ? 'simplified' : 'billboard',
    }));
  }
}

// ============================================================================
// Instanced Renderer
// ============================================================================

interface InstanceData {
  matrix: Float32Array;
  color: Float32Array;
  entityId: number;
}

export class InstancedRenderer {
  private instancePools: Map<string, InstanceData[]> = new Map();
  private maxInstancesPerDraw: number = 1000;
  private instanceBuffers: Map<string, WebGLBuffer> = new Map();
  private gl: WebGL2RenderingContext | null = null;

  initialize(gl: WebGL2RenderingContext): void {
    this.gl = gl;
  }

  addInstance(meshId: string, matrix: Float32Array, color: Float32Array, entityId: number): void {
    if (!this.instancePools.has(meshId)) {
      this.instancePools.set(meshId, []);
    }
    this.instancePools.get(meshId)!.push({ matrix, color, entityId });
  }

  clearInstances(): void {
    for (const pool of this.instancePools.values()) {
      pool.length = 0;
    }
  }

  renderInstanced(meshId: string): number {
    const instances = this.instancePools.get(meshId);
    if (!instances || instances.length === 0) return 0;

    // In real implementation, this would use gl.drawArraysInstanced
    const instanceCount = Math.min(instances.length, this.maxInstancesPerDraw);

    // Batch draw
    return instanceCount;
  }

  getInstanceCount(meshId: string): number {
    return this.instancePools.get(meshId)?.length || 0;
  }

  getTotalInstanceCount(): number {
    let total = 0;
    for (const pool of this.instancePools.values()) {
      total += pool.length;
    }
    return total;
  }
}

// ============================================================================
// Post Processing
// ============================================================================

export interface PostProcessPass {
  name: string;
  enabled: boolean;
  shader?: string;
  uniformBindings: Map<string, any>;
}

export class PostProcessing {
  private passes: PostProcessPass[] = [];
  private framebuffer: WebGLFramebuffer | null = null;

  addPass(pass: PostProcessPass): void {
    this.passes.push(pass);
  }

  removePass(name: string): void {
    this.passes = this.passes.filter(p => p.name !== name);
  }

  enablePass(name: string): void {
    const pass = this.passes.find(p => p.name === name);
    if (pass) pass.enabled = true;
  }

  disablePass(name: string): void {
    const pass = this.passes.find(p => p.name === name);
    if (pass) pass.enabled = false;
  }

  getEnabledPasses(): PostProcessPass[] {
    return this.passes.filter(p => p.enabled);
  }

  render(): void {
    for (const pass of this.passes) {
      if (pass.enabled) {
        this.renderPass(pass);
      }
    }
  }

  private renderPass(pass: PostProcessPass): void {
    // Implementation would apply shader effects
  }
}

// ============================================================================
// Main Renderer Class
// ============================================================================

export class AdvancedRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private device: GPUDevice | null = null;
  private capabilities: GPUCapabilities | null = null;
  private qualitySettings: QualitySettings;
  private qualityPreset: QualityPreset = 'auto';
  private lodSystem: LODSystem;
  private instancedRenderer: InstancedRenderer;
  private postProcessing: PostProcessing;

  private performanceMetrics: PerformanceMetrics = {
    fps: 60,
    frameTime: 16.67,
    entityCount: 0,
    activeEntityCount: 0,
    drawCalls: 0,
    triangles: 0,
    memoryUsed: 0,
    gpuMemoryUsed: 0,
  };

  private frameCount: number = 0;
  private lastFPSUpdate: number = 0;
  private fpsAccumulator: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.qualitySettings = QUALITY_PRESETS.auto;
    this.lodSystem = new LODSystem();
    this.instancedRenderer = new InstancedRenderer();
    this.postProcessing = new PostProcessing();
  }

  async initialize(): Promise<boolean> {
    this.capabilities = await detectGPUCapabilities();

    // Try WebGPU first
    if (this.capabilities.webgpu) {
      const success = await this.initWebGPU();
      if (success) return true;
    }

    // Fallback to WebGL2
    if (this.capabilities.webgl2) {
      return this.initWebGL2();
    }

    console.error('No suitable GPU API available');
    return false;
  }

  private async initWebGPU(): Promise<boolean> {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) return false;

      this.device = await adapter.requestDevice();
      console.log('WebGPU initialized successfully');
      return true;
    } catch (e) {
      console.warn('WebGPU initialization failed:', e);
      return false;
    }
  }

  private initWebGL2(): boolean {
    this.gl = this.canvas.getContext('webgl2', {
      antialias: this.qualitySettings.antiAliasing.startsWith('msaa'),
      alpha: false,
      depth: true,
      stencil: true,
      powerPreference: 'high-performance',
    });

    if (!this.gl) {
      console.error('WebGL2 not available');
      return false;
    }

    this.instancedRenderer.initialize(this.gl);
    console.log('WebGL2 initialized successfully');
    return true;
  }

  setQuality(preset: QualityPreset): void {
    this.qualityPreset = preset;
    this.qualitySettings =
      preset === 'auto' ? this.getAutoQuality() : QUALITY_PRESETS[preset];
    this.applyQualitySettings();
  }

  private getAutoQuality(): QualitySettings {
    if (!this.capabilities) return QUALITY_PRESETS.medium;

    const vram = this.capabilities.vram;
    if (vram >= 4096) return QUALITY_PRESETS.ultra;
    if (vram >= 2048) return QUALITY_PRESETS.high;
    if (vram >= 1024) return QUALITY_PRESETS.medium;
    return QUALITY_PRESETS.low;
  }

  private applyQualitySettings(): void {
    // Apply texture quality, shadow settings, etc.
    this.lodSystem.setLODDistances([
      30 * this.qualitySettings.lodBias,
      60 * this.qualitySettings.lodBias,
      100 * this.qualitySettings.lodBias,
      200 * this.qualitySettings.lodBias,
    ]);
  }

  beginFrame(): void {
    const now = performance.now();
    this.fpsAccumulator++;
    if (now - this.lastFPSUpdate >= 1000) {
      this.performanceMetrics.fps = this.fpsAccumulator;
      this.performanceMetrics.frameTime = 1000 / this.fpsAccumulator;
      this.fpsAccumulator = 0;
      this.lastFPSUpdate = now;
    }

    this.frameCount++;
    this.performanceMetrics.drawCalls = 0;
    this.performanceMetrics.triangles = 0;
    this.instancedRenderer.clearInstances();

    // Clear buffers
    if (this.gl) {
      this.gl.clearColor(0.1, 0.1, 0.12, 1.0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }
  }

  endFrame(): void {
    // Render instanced meshes
    this.performanceMetrics.drawCalls += this.instancedRenderer.getTotalInstanceCount();

    // Post-processing
    if (this.qualitySettings.postProcessing) {
      this.postProcessing.render();
    }
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  getCapabilities(): GPUCapabilities | null {
    return this.capabilities;
  }

  getQualitySettings(): QualitySettings {
    return { ...this.qualitySettings };
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    if (this.gl) {
      this.gl.viewport(0, 0, width, height);
    }
  }

  getLODSystem(): LODSystem {
    return this.lodSystem;
  }

  getInstancedRenderer(): InstancedRenderer {
    return this.instancedRenderer;
  }

  getPostProcessing(): PostProcessing {
    return this.postProcessing;
  }

  destroy(): void {
    this.gl = null;
    this.device = null;
  }
}

export default AdvancedRenderer;
