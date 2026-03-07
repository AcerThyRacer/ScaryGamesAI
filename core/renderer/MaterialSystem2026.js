/**
 * Advanced PBR Material System 2026
 * WebGPU-based physically-based rendering material pipeline with horror-specific presets.
 * Supports extended PBR: SSS, iridescence, clearcoat, sheen, anisotropy, transmission.
 */

// Material type bitmask flags
const MaterialType = {
  DIFFUSE:     0x01,
  METAL:       0x02,
  GLASS:       0x04,
  EMISSIVE:    0x08,
  SSS:         0x10,
  IRIDESCENT:  0x20,
  CLOTH:       0x40
};

// Byte size of one MaterialData struct (padded to 16-byte alignment)
// 4 + 3+1 + 1+1 + 1+1+1+1+1+1+1+1 + 1+3+3 + 1+1+1 + 5 texture i32 + 1 u32 = 32 floats = 128 bytes
// Actual count: we lay out 36 f32-sized slots → 144 bytes, padded to 160 for alignment
const MATERIAL_STRIDE_FLOATS = 40;
const MATERIAL_STRIDE_BYTES = MATERIAL_STRIDE_FLOATS * 4;

export class MaterialSystem2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      maxMaterials: options.maxMaterials || 1024,
      maxTextures: options.maxTextures || 512,
      enableSSS: options.enableSSS !== undefined ? options.enableSSS : true,
      enableIridescence: options.enableIridescence !== undefined ? options.enableIridescence : true,
      ...options
    };

    this.materials = new Map();
    this.materialData = [];
    this.nextMaterialId = 0;

    this.textures = [];
    this.textureViews = [];
    this.nextTextureIndex = 0;

    this.materialBuffer = null;
    this.textureArray = null;
    this.textureArrayView = null;
    this.sampler = null;
    this.textureBindGroupLayout = null;
    this.textureBindGroup = null;

    this.initialized = false;

    this.stats = {
      materialsCreated: 0,
      texturesLoaded: 0,
      bufferSizeBytes: 0
    };
  }

  async initialize() {
    try {
      this._createMaterialBuffer();
      this._createSampler();
      this._createTextureArray();
      this._createTextureBindGroupLayout();
      this._registerPresets();

      this.initialized = true;
      console.log('✓ MaterialSystem2026 initialized');
      console.log(`  • Max materials: ${this.options.maxMaterials}`);
      console.log(`  • Max textures: ${this.options.maxTextures}`);
      console.log(`  • SSS: ${this.options.enableSSS}, Iridescence: ${this.options.enableIridescence}`);
      return true;
    } catch (error) {
      console.error('MaterialSystem2026 initialization failed:', error);
      return false;
    }
  }

  // ── GPU Resource Creation ─────────────────────────────────────────

  _createMaterialBuffer() {
    const size = this.options.maxMaterials * MATERIAL_STRIDE_BYTES;
    this.materialBuffer = this.device.createBuffer({
      label: 'MaterialSystem2026 material buffer',
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    this.stats.bufferSizeBytes = size;
  }

  _createSampler() {
    this.sampler = this.device.createSampler({
      label: 'MaterialSystem2026 sampler',
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      maxAnisotropy: 16
    });
  }

  _createTextureArray() {
    this.textureArray = this.device.createTexture({
      label: 'MaterialSystem2026 texture array',
      size: { width: 1024, height: 1024, depthOrArrayLayers: Math.max(1, this.options.maxTextures) },
      format: 'rgba8unorm',
      mipLevelCount: 11, // log2(1024) + 1
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
    this.textureArrayView = this.textureArray.createView({
      dimension: '2d-array',
      arrayLayerCount: this.options.maxTextures
    });
  }

  _createTextureBindGroupLayout() {
    this.textureBindGroupLayout = this.device.createBindGroupLayout({
      label: 'MaterialSystem2026 texture bind group layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, texture: { sampleType: 'float', viewDimension: '2d-array' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, sampler: { type: 'filtering' } }
      ]
    });
    this._rebuildTextureBindGroup();
  }

  _rebuildTextureBindGroup() {
    this.textureBindGroup = this.device.createBindGroup({
      label: 'MaterialSystem2026 texture bind group',
      layout: this.textureBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.materialBuffer } },
        { binding: 1, resource: this.textureArrayView },
        { binding: 2, resource: this.sampler }
      ]
    });
  }

  // ── Material CRUD ─────────────────────────────────────────────────

  _defaultMaterial() {
    return {
      albedo: [1, 1, 1, 1],
      emission: [0, 0, 0],
      emissionStrength: 0,
      roughness: 0.5,
      metallic: 0,
      transmission: 0,
      ior: 1.5,
      clearcoat: 0,
      clearcoatRoughness: 0.1,
      sheen: 0,
      sheenTint: 0,
      anisotropy: 0,
      anisotropyRotation: 0,
      subsurface: 0,
      subsurfaceRadius: [1, 0.2, 0.1],
      subsurfaceColor: [1, 1, 1],
      iridescence: 0,
      iridescenceIOR: 1.3,
      iridescenceThickness: 400,
      albedoTexture: -1,
      normalTexture: -1,
      roughnessMetallicTexture: -1,
      emissionTexture: -1,
      occlusionTexture: -1,
      materialType: MaterialType.DIFFUSE
    };
  }

  _packMaterial(params) {
    const m = { ...this._defaultMaterial(), ...params };
    const buf = new Float32Array(MATERIAL_STRIDE_FLOATS);
    const i32 = new Int32Array(buf.buffer);
    const u32 = new Uint32Array(buf.buffer);

    // vec4 albedo (0-3)
    buf[0] = m.albedo[0]; buf[1] = m.albedo[1]; buf[2] = m.albedo[2]; buf[3] = m.albedo[3];
    // vec3 emission + emissionStrength (4-7)
    buf[4] = m.emission[0]; buf[5] = m.emission[1]; buf[6] = m.emission[2]; buf[7] = m.emissionStrength;
    // roughness, metallic, transmission, ior (8-11)
    buf[8] = m.roughness; buf[9] = m.metallic; buf[10] = m.transmission; buf[11] = m.ior;
    // clearcoat, clearcoatRoughness, sheen, sheenTint (12-15)
    buf[12] = m.clearcoat; buf[13] = m.clearcoatRoughness; buf[14] = m.sheen; buf[15] = m.sheenTint;
    // anisotropy, anisotropyRotation, subsurface, pad (16-19)
    buf[16] = m.anisotropy; buf[17] = m.anisotropyRotation; buf[18] = m.subsurface; buf[19] = 0;
    // vec3 subsurfaceRadius + pad (20-23)
    buf[20] = m.subsurfaceRadius[0]; buf[21] = m.subsurfaceRadius[1]; buf[22] = m.subsurfaceRadius[2]; buf[23] = 0;
    // vec3 subsurfaceColor + pad (24-27)
    buf[24] = m.subsurfaceColor[0]; buf[25] = m.subsurfaceColor[1]; buf[26] = m.subsurfaceColor[2]; buf[27] = 0;
    // iridescence, iridescenceIOR, iridescenceThickness, pad (28-31)
    buf[28] = m.iridescence; buf[29] = m.iridescenceIOR; buf[30] = m.iridescenceThickness; buf[31] = 0;
    // texture indices as i32 (32-36)
    i32[32] = m.albedoTexture; i32[33] = m.normalTexture;
    i32[34] = m.roughnessMetallicTexture; i32[35] = m.emissionTexture; i32[36] = m.occlusionTexture;
    // materialType as u32 (37), pad (38-39)
    u32[37] = m.materialType; u32[38] = 0; u32[39] = 0;

    return buf;
  }

  createMaterial(name, params = {}) {
    if (this.nextMaterialId >= this.options.maxMaterials) {
      throw new Error(`Material limit reached (${this.options.maxMaterials})`);
    }
    const id = this.nextMaterialId++;
    const packed = this._packMaterial(params);
    this.materialData[id] = packed;
    this.materials.set(name, { id, name, params: { ...this._defaultMaterial(), ...params } });

    this.device.queue.writeBuffer(
      this.materialBuffer,
      id * MATERIAL_STRIDE_BYTES,
      packed.buffer
    );
    this.stats.materialsCreated++;
    return id;
  }

  getMaterial(name) {
    const entry = this.materials.get(name);
    return entry ? entry.id : -1;
  }

  updateMaterial(id, params) {
    if (id < 0 || id >= this.nextMaterialId) return;

    let entry = null;
    for (const [, v] of this.materials) {
      if (v.id === id) { entry = v; break; }
    }
    if (entry) Object.assign(entry.params, params);

    const merged = entry ? entry.params : { ...this._defaultMaterial(), ...params };
    const packed = this._packMaterial(merged);
    this.materialData[id] = packed;
    this.device.queue.writeBuffer(this.materialBuffer, id * MATERIAL_STRIDE_BYTES, packed.buffer);
  }

  getMaterialBuffer() {
    return this.materialBuffer;
  }

  getTextureBindGroup() {
    return this.textureBindGroup;
  }

  getTextureBindGroupLayout() {
    return this.textureBindGroupLayout;
  }

  // ── Texture Management ────────────────────────────────────────────

  async loadTexture(url, isSRGB = false) {
    if (this.nextTextureIndex >= this.options.maxTextures) {
      throw new Error(`Texture limit reached (${this.options.maxTextures})`);
    }

    const response = await fetch(url);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: isSRGB ? 'default' : 'none' });

    const index = this.nextTextureIndex++;

    this.device.queue.copyExternalImageToTexture(
      { source: bitmap, flipY: false },
      { texture: this.textureArray, origin: { x: 0, y: 0, z: index } },
      { width: Math.min(bitmap.width, 1024), height: Math.min(bitmap.height, 1024) }
    );

    this._generateMipmaps(index);
    bitmap.close();

    this.stats.texturesLoaded++;
    return index;
  }

  _generateMipmaps(layerIndex) {
    // Mipmap generation via blit passes
    const mipLevels = 11;
    for (let level = 1; level < mipLevels; level++) {
      const srcView = this.textureArray.createView({
        dimension: '2d',
        baseMipLevel: level - 1, mipLevelCount: 1,
        baseArrayLayer: layerIndex, arrayLayerCount: 1
      });
      const dstView = this.textureArray.createView({
        dimension: '2d',
        baseMipLevel: level, mipLevelCount: 1,
        baseArrayLayer: layerIndex, arrayLayerCount: 1
      });

      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: dstView,
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 0 }
        }]
      });

      // In production, a blit pipeline would sample srcView at half-resolution.
      // Here we end the pass; integration with the engine's blit pipeline is expected.
      pass.end();
      this.device.queue.submit([encoder.finish()]);
    }
  }

  // ── Horror Presets ────────────────────────────────────────────────

  _registerPresets() {
    this._presets = {
      blood: {
        albedo: [0.35, 0.01, 0.01, 1],
        roughness: 0.1, metallic: 0,
        subsurface: 0.4, subsurfaceRadius: [0.8, 0.05, 0.02],
        subsurfaceColor: [0.6, 0.0, 0.0],
        materialType: MaterialType.DIFFUSE | MaterialType.SSS
      },
      driedBlood: {
        albedo: [0.15, 0.01, 0.005, 1],
        roughness: 0.8, metallic: 0,
        materialType: MaterialType.DIFFUSE
      },
      flesh: {
        albedo: [0.75, 0.45, 0.38, 1],
        roughness: 0.5, metallic: 0,
        subsurface: 0.6, subsurfaceRadius: [1.0, 0.2, 0.1],
        subsurfaceColor: [0.8, 0.25, 0.15],
        materialType: MaterialType.DIFFUSE | MaterialType.SSS
      },
      rottingFlesh: {
        albedo: [0.35, 0.38, 0.2, 1],
        roughness: 0.7, metallic: 0,
        emission: [0.02, 0.04, 0.0], emissionStrength: 0.3,
        subsurface: 0.5, subsurfaceRadius: [0.6, 0.4, 0.1],
        subsurfaceColor: [0.3, 0.4, 0.1],
        materialType: MaterialType.DIFFUSE | MaterialType.SSS | MaterialType.EMISSIVE
      },
      bone: {
        albedo: [0.88, 0.85, 0.78, 1],
        roughness: 0.4, metallic: 0,
        subsurface: 0.15, subsurfaceRadius: [0.5, 0.3, 0.2],
        subsurfaceColor: [0.9, 0.85, 0.75],
        materialType: MaterialType.DIFFUSE | MaterialType.SSS
      },
      ectoplasm: {
        albedo: [0.2, 0.85, 0.3, 0.6],
        roughness: 0.3, metallic: 0,
        transmission: 0.7, ior: 1.36,
        emission: [0.05, 0.3, 0.05], emissionStrength: 1.5,
        subsurface: 0.6, subsurfaceRadius: [0.3, 1.0, 0.3],
        subsurfaceColor: [0.1, 0.8, 0.2],
        materialType: MaterialType.GLASS | MaterialType.SSS | MaterialType.EMISSIVE
      },
      ghostly: {
        albedo: [0.9, 0.92, 1.0, 0.15],
        roughness: 0.05, metallic: 0,
        transmission: 0.95, ior: 1.01,
        emission: [0.3, 0.35, 0.5], emissionStrength: 0.6,
        materialType: MaterialType.GLASS | MaterialType.EMISSIVE
      },
      cursedMetal: {
        albedo: [0.08, 0.06, 0.1, 1],
        roughness: 0.3, metallic: 1.0,
        iridescence: 0.8, iridescenceIOR: 1.8, iridescenceThickness: 350,
        materialType: MaterialType.METAL | MaterialType.IRIDESCENT
      },
      ancientStone: {
        albedo: [0.42, 0.4, 0.38, 1],
        roughness: 0.9, metallic: 0,
        materialType: MaterialType.DIFFUSE
      },
      wetStone: {
        albedo: [0.28, 0.27, 0.25, 1],
        roughness: 0.1, metallic: 0,
        clearcoat: 0.6, clearcoatRoughness: 0.05,
        materialType: MaterialType.DIFFUSE
      },
      porcelain: {
        albedo: [0.95, 0.93, 0.9, 1],
        roughness: 0.15, metallic: 0,
        clearcoat: 0.9, clearcoatRoughness: 0.03,
        subsurface: 0.3, subsurfaceRadius: [0.6, 0.35, 0.3],
        subsurfaceColor: [0.95, 0.9, 0.85],
        materialType: MaterialType.DIFFUSE | MaterialType.SSS
      },
      wax: {
        albedo: [0.85, 0.7, 0.4, 1],
        roughness: 0.4, metallic: 0,
        transmission: 0.15, ior: 1.44,
        subsurface: 0.7, subsurfaceRadius: [1.0, 0.6, 0.25],
        subsurfaceColor: [0.9, 0.65, 0.3],
        materialType: MaterialType.DIFFUSE | MaterialType.SSS
      },
      water: {
        albedo: [0.8, 0.9, 1.0, 0.1],
        roughness: 0.0, metallic: 0,
        transmission: 1.0, ior: 1.33,
        materialType: MaterialType.GLASS
      },
      ice: {
        albedo: [0.8, 0.9, 1.0, 0.9],
        roughness: 0.08, metallic: 0,
        transmission: 0.9, ior: 1.31,
        subsurface: 0.2, subsurfaceRadius: [0.3, 0.5, 0.8],
        subsurfaceColor: [0.7, 0.85, 1.0],
        materialType: MaterialType.GLASS | MaterialType.SSS
      },
      glass: {
        albedo: [1.0, 1.0, 1.0, 0.05],
        roughness: 0.0, metallic: 0,
        transmission: 1.0, ior: 1.5,
        clearcoat: 0.5, clearcoatRoughness: 0.01,
        materialType: MaterialType.GLASS
      },
      stainedGlass: {
        albedo: [0.6, 0.15, 0.15, 0.7],
        roughness: 0.02, metallic: 0,
        transmission: 1.0, ior: 1.5,
        clearcoat: 0.5, clearcoatRoughness: 0.01,
        materialType: MaterialType.GLASS
      },
      rust: {
        albedo: [0.55, 0.25, 0.08, 1],
        roughness: 0.85, metallic: 0.2,
        materialType: MaterialType.DIFFUSE | MaterialType.METAL
      },
      chrome: {
        albedo: [0.95, 0.95, 0.96, 1],
        roughness: 0.02, metallic: 1.0,
        materialType: MaterialType.METAL
      },
      wood: {
        albedo: [0.42, 0.26, 0.13, 1],
        roughness: 0.6, metallic: 0,
        anisotropy: 0.3, anisotropyRotation: 0.0,
        materialType: MaterialType.DIFFUSE
      },
      fabric: {
        albedo: [0.5, 0.5, 0.5, 1],
        roughness: 0.9, metallic: 0,
        sheen: 0.8, sheenTint: 0.5,
        materialType: MaterialType.CLOTH
      },
      leather: {
        albedo: [0.2, 0.12, 0.06, 1],
        roughness: 0.5, metallic: 0,
        sheen: 0.3, sheenTint: 0.3,
        materialType: MaterialType.DIFFUSE
      },
      candle: {
        albedo: [0.85, 0.7, 0.4, 1],
        roughness: 0.4, metallic: 0,
        emission: [1.0, 0.65, 0.2], emissionStrength: 3.0,
        subsurface: 0.7, subsurfaceRadius: [1.0, 0.6, 0.25],
        subsurfaceColor: [0.9, 0.65, 0.3],
        materialType: MaterialType.DIFFUSE | MaterialType.SSS | MaterialType.EMISSIVE
      },
      lava: {
        albedo: [0.1, 0.02, 0.01, 1],
        roughness: 0.6, metallic: 0,
        emission: [1.0, 0.35, 0.02], emissionStrength: 8.0,
        subsurface: 0.3, subsurfaceRadius: [1.0, 0.15, 0.02],
        subsurfaceColor: [1.0, 0.2, 0.0],
        materialType: MaterialType.DIFFUSE | MaterialType.SSS | MaterialType.EMISSIVE
      },
      neonLight: {
        albedo: [0.01, 0.01, 0.01, 1],
        roughness: 0.1, metallic: 0,
        emission: [0.2, 0.8, 1.0], emissionStrength: 15.0,
        materialType: MaterialType.EMISSIVE
      },
      oilSlick: {
        albedo: [0.02, 0.02, 0.02, 1],
        roughness: 0.05, metallic: 0.1,
        iridescence: 1.0, iridescenceIOR: 1.39, iridescenceThickness: 300,
        materialType: MaterialType.DIFFUSE | MaterialType.IRIDESCENT
      },
      spiderSilk: {
        albedo: [0.9, 0.88, 0.85, 0.7],
        roughness: 0.35, metallic: 0,
        transmission: 0.2, ior: 1.55,
        anisotropy: 0.8, anisotropyRotation: 0.0,
        sheen: 0.5, sheenTint: 0.1,
        materialType: MaterialType.DIFFUSE | MaterialType.CLOTH
      },
      fog: {
        albedo: [0.7, 0.72, 0.75, 0.02],
        roughness: 1.0, metallic: 0,
        transmission: 0.98, ior: 1.0,
        materialType: MaterialType.DIFFUSE
      }
    };
  }

  getPreset(presetName) {
    const p = this._presets[presetName];
    if (!p) return null;
    return { ...this._defaultMaterial(), ...p };
  }

  createFromPreset(presetName) {
    const params = this.getPreset(presetName);
    if (!params) throw new Error(`Unknown preset: ${presetName}`);
    return this.createMaterial(presetName, params);
  }

  // ── WGSL Shader Code ─────────────────────────────────────────────

  getShaderCode() {
    return /* wgsl */`
// ────────────────────────────────────────────────────────────────
// MaterialSystem2026 — PBR WGSL evaluation code
// ────────────────────────────────────────────────────────────────

const PI: f32 = 3.141592653589793;
const INV_PI: f32 = 0.3183098861837907;

const MAT_DIFFUSE:    u32 = 0x01u;
const MAT_METAL:      u32 = 0x02u;
const MAT_GLASS:      u32 = 0x04u;
const MAT_EMISSIVE:   u32 = 0x08u;
const MAT_SSS:        u32 = 0x10u;
const MAT_IRIDESCENT: u32 = 0x20u;
const MAT_CLOTH:      u32 = 0x40u;

struct MaterialData {
  albedo: vec4<f32>,
  emission: vec3<f32>,
  emissionStrength: f32,
  roughness: f32,
  metallic: f32,
  transmission: f32,
  ior: f32,
  clearcoat: f32,
  clearcoatRoughness: f32,
  sheen: f32,
  sheenTint: f32,
  anisotropy: f32,
  anisotropyRotation: f32,
  subsurface: f32,
  _pad0: f32,
  subsurfaceRadius: vec3<f32>,
  _pad1: f32,
  subsurfaceColor: vec3<f32>,
  _pad2: f32,
  iridescence: f32,
  iridescenceIOR: f32,
  iridescenceThickness: f32,
  _pad3: f32,
  albedoTexture: i32,
  normalTexture: i32,
  roughnessMetallicTexture: i32,
  emissionTexture: i32,
  occlusionTexture: i32,
  materialType: u32,
  _pad4: u32,
  _pad5: u32,
};

struct BRDFResult {
  diffuse: vec3<f32>,
  specular: vec3<f32>,
  clearcoat: vec3<f32>,
  sheen: vec3<f32>,
  emission: vec3<f32>,
  transmission: vec3<f32>,
};

struct BRDFSample {
  direction: vec3<f32>,
  pdf: f32,
  weight: vec3<f32>,
  isSpecular: bool,
};

// ── Fresnel ─────────────────────────────────────────────────────

fn fresnelSchlick(cosTheta: f32, f0: vec3<f32>) -> vec3<f32> {
  let ct = clamp(cosTheta, 0.0, 1.0);
  let t = 1.0 - ct;
  let t2 = t * t;
  return f0 + (vec3<f32>(1.0) - f0) * (t2 * t2 * t);
}

fn fresnelSchlickRoughness(cosTheta: f32, f0: vec3<f32>, roughness: f32) -> vec3<f32> {
  let ct = clamp(cosTheta, 0.0, 1.0);
  let t = 1.0 - ct;
  let t2 = t * t;
  return f0 + (max(vec3<f32>(1.0 - roughness), f0) - f0) * (t2 * t2 * t);
}

fn fresnelDielectric(cosI: f32, eta: f32) -> f32 {
  let sinT2 = eta * eta * (1.0 - cosI * cosI);
  if (sinT2 > 1.0) { return 1.0; }
  let cosT = sqrt(1.0 - sinT2);
  let ci = abs(cosI);
  let rs = (eta * ci - cosT) / (eta * ci + cosT);
  let rp = (ci - eta * cosT) / (ci + eta * cosT);
  return 0.5 * (rs * rs + rp * rp);
}

// ── GGX Distribution ────────────────────────────────────────────

fn ggxDistribution(NdotH: f32, roughness: f32) -> f32 {
  let a = roughness * roughness;
  let a2 = a * a;
  let d = NdotH * NdotH * (a2 - 1.0) + 1.0;
  return a2 / (PI * d * d + 1e-7);
}

fn ggxAnisotropicDistribution(NdotH: f32, TdotH: f32, BdotH: f32, ax: f32, ay: f32) -> f32 {
  let tx = TdotH / ax;
  let bx = BdotH / ay;
  let d = tx * tx + bx * bx + NdotH * NdotH;
  return 1.0 / (PI * ax * ay * d * d + 1e-7);
}

// ── Smith GGX Visibility ────────────────────────────────────────

fn smithGGXVisibility(NdotV: f32, NdotL: f32, roughness: f32) -> f32 {
  let a = roughness * roughness;
  let a2 = a * a;
  let ggxV = NdotL * sqrt(NdotV * NdotV * (1.0 - a2) + a2);
  let ggxL = NdotV * sqrt(NdotL * NdotL * (1.0 - a2) + a2);
  let denom = ggxV + ggxL;
  if (denom < 1e-7) { return 0.0; }
  return 0.5 / denom;
}

// ── Subsurface Scattering ───────────────────────────────────────

fn evaluateSSS(material: MaterialData, thickness: f32) -> vec3<f32> {
  if ((material.materialType & MAT_SSS) == 0u || material.subsurface <= 0.0) {
    return vec3<f32>(0.0);
  }
  let scatter = exp(-thickness / max(material.subsurfaceRadius, vec3<f32>(0.001)));
  return material.subsurfaceColor * scatter * material.subsurface;
}

fn subsurfaceBRDF(NdotL: f32, subsurface: f32) -> f32 {
  // Wrap lighting approximation for SSS
  let w = 0.5 * subsurface;
  let wNdotL = (NdotL + w) / ((1.0 + w) * (1.0 + w));
  return max(wNdotL, 0.0) * INV_PI;
}

// ── Iridescence (Thin-Film Interference) ────────────────────────

fn evaluateIridescence(material: MaterialData, cosTheta: f32) -> vec3<f32> {
  if ((material.materialType & MAT_IRIDESCENT) == 0u || material.iridescence <= 0.0) {
    return vec3<f32>(1.0);
  }
  let eta = material.iridescenceIOR;
  let thickness = material.iridescenceThickness;

  // Optical path difference
  let sinTheta2 = 1.0 - cosTheta * cosTheta;
  let cosRefr = sqrt(max(1.0 - sinTheta2 / (eta * eta), 0.0));
  let opd = 2.0 * eta * thickness * cosRefr;

  // Wavelengths for RGB (nm)
  let wavelengths = vec3<f32>(650.0, 532.0, 450.0);
  let phase = 2.0 * PI * opd / wavelengths;
  let thinFilm = cos(phase) * 0.5 + 0.5;

  // Blend between base and iridescent Fresnel
  let base = fresnelDielectric(cosTheta, eta);
  let iridColor = mix(vec3<f32>(base), thinFilm, material.iridescence);
  return iridColor;
}

// ── Clearcoat ───────────────────────────────────────────────────

fn evaluateClearcoat(material: MaterialData, NdotH: f32, NdotV: f32, NdotL: f32) -> vec3<f32> {
  if (material.clearcoat <= 0.0) { return vec3<f32>(0.0); }
  let D = ggxDistribution(NdotH, material.clearcoatRoughness);
  let V = smithGGXVisibility(NdotV, NdotL, material.clearcoatRoughness);
  let F = fresnelSchlick(NdotV, vec3<f32>(0.04));
  return F * D * V * material.clearcoat;
}

// ── Sheen ───────────────────────────────────────────────────────

fn evaluateSheen(material: MaterialData, NdotV: f32, NdotL: f32) -> vec3<f32> {
  if (material.sheen <= 0.0) { return vec3<f32>(0.0); }
  let FV = 1.0 - NdotV;
  let FL = 1.0 - NdotL;
  let Fd90 = 0.5 + 2.0 * material.roughness * FV * FV;
  let sheenBase = vec3<f32>(1.0);
  let sheenColor = mix(sheenBase, material.albedo.rgb, material.sheenTint);
  // Charlie sheen approximation
  let sinNdotL = sqrt(max(1.0 - NdotL * NdotL, 0.0));
  return sheenColor * material.sheen * sinNdotL;
}

// ── Full Material Evaluation ────────────────────────────────────

fn evaluateMaterial(
  material: MaterialData,
  uv: vec2<f32>,
  normal: vec3<f32>,
  viewDir: vec3<f32>,
  lightDir: vec3<f32>
) -> BRDFResult {
  var result: BRDFResult;

  let N = normalize(normal);
  let V = normalize(viewDir);
  let L = normalize(lightDir);
  let H = normalize(V + L);

  let NdotV = max(dot(N, V), 1e-4);
  let NdotL = max(dot(N, L), 0.0);
  let NdotH = max(dot(N, H), 0.0);
  let VdotH = max(dot(V, H), 0.0);

  let baseColor = material.albedo.rgb;
  let roughness = max(material.roughness, 0.04);

  // Dielectric F0 from IOR
  let iorRatio = (material.ior - 1.0) / (material.ior + 1.0);
  let f0Dielectric = vec3<f32>(iorRatio * iorRatio);
  let f0 = mix(f0Dielectric, baseColor, material.metallic);

  // Fresnel
  var F = fresnelSchlick(VdotH, f0);

  // Iridescence modulates Fresnel
  if ((material.materialType & MAT_IRIDESCENT) != 0u) {
    let irid = evaluateIridescence(material, VdotH);
    F = F * irid;
  }

  // Specular (Cook-Torrance)
  let D = ggxDistribution(NdotH, roughness);
  let G = smithGGXVisibility(NdotV, NdotL, roughness);
  result.specular = F * D * G * NdotL;

  // Diffuse (Lambertian with energy conservation)
  let kD = (vec3<f32>(1.0) - F) * (1.0 - material.metallic);

  if ((material.materialType & MAT_SSS) != 0u && material.subsurface > 0.0) {
    // Blend Lambertian and subsurface wrap lighting
    let lambertian = NdotL * INV_PI;
    let sss = subsurfaceBRDF(dot(N, L), material.subsurface);
    result.diffuse = kD * baseColor * mix(lambertian, sss, material.subsurface);
  } else {
    result.diffuse = kD * baseColor * NdotL * INV_PI;
  }

  // Clearcoat
  result.clearcoat = evaluateClearcoat(material, NdotH, NdotV, NdotL) * NdotL;

  // Sheen
  result.sheen = evaluateSheen(material, NdotV, NdotL) * NdotL;

  // Transmission
  if (material.transmission > 0.0) {
    let fresnelT = fresnelDielectric(VdotH, material.ior);
    result.transmission = baseColor * (1.0 - fresnelT) * material.transmission;
  } else {
    result.transmission = vec3<f32>(0.0);
  }

  // Emission
  result.emission = material.emission * material.emissionStrength;

  return result;
}

// ── Importance Sampling ─────────────────────────────────────────

fn sampleGGXVNDF(Ve: vec3<f32>, roughness: f32, u1: f32, u2: f32) -> vec3<f32> {
  // Stretch view direction
  let Vh = normalize(vec3<f32>(roughness * Ve.x, roughness * Ve.y, Ve.z));
  // Build orthonormal basis
  let lensq = Vh.x * Vh.x + Vh.y * Vh.y;
  let T1 = select(vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(-Vh.y, Vh.x, 0.0) / sqrt(lensq), lensq > 1e-7);
  let T2 = cross(Vh, T1);
  // Sample disk
  let r = sqrt(u1);
  let phi = 2.0 * PI * u2;
  let t1 = r * cos(phi);
  var t2 = r * sin(phi);
  let s = 0.5 * (1.0 + Vh.z);
  t2 = (1.0 - s) * sqrt(max(1.0 - t1 * t1, 0.0)) + s * t2;
  // Reproject
  let Nh = t1 * T1 + t2 * T2 + sqrt(max(1.0 - t1 * t1 - t2 * t2, 0.0)) * Vh;
  return normalize(vec3<f32>(roughness * Nh.x, roughness * Nh.y, max(Nh.z, 0.0)));
}

fn sampleCosineHemisphere(u1: f32, u2: f32) -> vec3<f32> {
  let phi = 2.0 * PI * u1;
  let cosTheta = sqrt(1.0 - u2);
  let sinTheta = sqrt(u2);
  return vec3<f32>(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
}

fn buildTBN(N: vec3<f32>) -> mat3x3<f32> {
  var T: vec3<f32>;
  if (abs(N.y) < 0.999) {
    T = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), N));
  } else {
    T = normalize(cross(vec3<f32>(1.0, 0.0, 0.0), N));
  }
  let B = cross(N, T);
  return mat3x3<f32>(T, B, N);
}

fn sampleBRDF(
  material: MaterialData,
  normal: vec3<f32>,
  viewDir: vec3<f32>,
  random: vec4<f32>
) -> BRDFSample {
  var sample: BRDFSample;
  let N = normalize(normal);
  let V = normalize(viewDir);
  let NdotV = max(dot(N, V), 1e-4);
  let roughness = max(material.roughness, 0.04);

  let tbn = buildTBN(N);
  let Ve = transpose(tbn) * V;

  let iorRatio = (material.ior - 1.0) / (material.ior + 1.0);
  let f0Dielectric = iorRatio * iorRatio;
  let f0 = mix(f0Dielectric, 1.0, material.metallic);

  // Choose lobe: diffuse vs specular
  let specProb = mix(f0, 1.0, pow(1.0 - NdotV, 5.0));
  let diffProb = (1.0 - material.metallic) * (1.0 - material.transmission);
  let totalProb = specProb + diffProb;
  let pSpec = specProb / max(totalProb, 1e-4);

  if (random.x < pSpec) {
    // Specular GGX VNDF sampling
    let H_local = sampleGGXVNDF(Ve, roughness, random.y, random.z);
    let H = tbn * H_local;
    let L = reflect(-V, H);
    let NdotL = dot(N, L);
    if (NdotL <= 0.0) {
      sample.pdf = 0.0;
      sample.weight = vec3<f32>(0.0);
      sample.direction = L;
      sample.isSpecular = true;
      return sample;
    }

    let VdotH = max(dot(V, H), 0.0);
    let NdotH = max(dot(N, H), 0.0);

    let D = ggxDistribution(NdotH, roughness);
    let G = smithGGXVisibility(NdotV, NdotL, roughness);
    let baseColor = material.albedo.rgb;
    let f0v = mix(vec3<f32>(f0Dielectric), baseColor, material.metallic);
    let F = fresnelSchlick(VdotH, f0v);

    sample.direction = L;
    sample.pdf = pSpec * D * NdotH / max(4.0 * VdotH, 1e-4);
    sample.weight = F * G * D / max(sample.pdf, 1e-4) * NdotL;
    sample.isSpecular = true;
  } else {
    // Diffuse cosine-weighted sampling
    let L_local = sampleCosineHemisphere(random.y, random.z);
    let L = tbn * L_local;
    let NdotL = max(dot(N, L), 0.0);
    let H = normalize(V + L);
    let VdotH = max(dot(V, H), 0.0);
    let f0v = mix(vec3<f32>(f0Dielectric), material.albedo.rgb, material.metallic);
    let F = fresnelSchlick(VdotH, f0v);

    sample.direction = L;
    sample.pdf = (1.0 - pSpec) * NdotL * INV_PI;
    let kD = (vec3<f32>(1.0) - F) * (1.0 - material.metallic);
    sample.weight = kD * material.albedo.rgb;
    sample.isSpecular = false;
  }

  return sample;
}
`;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────

  getStats() {
    return { ...this.stats, activeMaterials: this.nextMaterialId };
  }

  dispose() {
    if (this.materialBuffer) { this.materialBuffer.destroy(); this.materialBuffer = null; }
    if (this.textureArray) { this.textureArray.destroy(); this.textureArray = null; }
    this.materials.clear();
    this.materialData.length = 0;
    this.nextMaterialId = 0;
    this.nextTextureIndex = 0;
    this.initialized = false;
    console.log('✓ MaterialSystem2026 disposed');
  }
}
