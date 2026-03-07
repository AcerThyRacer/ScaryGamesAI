/**
 * Haunted Asylum — 2026 Rendering Upgrade
 * Advanced rendering pipeline for 3D first-person asylum horror using Three.js / WebGPU
 * Features: Radiance cascade GI, fluorescent tube area lights, wet floor reflections,
 *           ghost volumetric rendering, dynamic destruction, asylum PBR materials
 */

import { GPUParticleSystem } from '../../core/renderer/GPUParticleSystem.js';
import { RadianceCascades2026 } from '../../core/renderer/RadianceCascades2026.js';
import { AreaLightSystem2026 } from '../../core/renderer/AreaLightSystem2026.js';
import { AtmosphericRenderer2026 } from '../../core/renderer/AtmosphericRenderer2026.js';
import { MaterialSystem2026 } from '../../core/renderer/MaterialSystem2026.js';

// ─── Ward Lighting Presets ─────────────────────────────────────────────

const WARD_PRESETS = {
  reception: {
    ambient: [0.12, 0.11, 0.10], tubes: 6, tubeHP: [0.4, 1.0],
    fog: 0.015, fogColor: [0.08, 0.08, 0.09], puddleChance: 0.1,
    destructibles: ['windows', 'chairs', 'desk_lamp']
  },
  ward: {
    ambient: [0.06, 0.07, 0.06], tubes: 10, tubeHP: [0.1, 0.7],
    fog: 0.03, fogColor: [0.05, 0.06, 0.05], puddleChance: 0.3,
    destructibles: ['windows', 'beds', 'wheelchairs', 'ceiling_tiles']
  },
  basement: {
    ambient: [0.02, 0.02, 0.03], tubes: 4, tubeHP: [0.0, 0.3],
    fog: 0.06, fogColor: [0.03, 0.03, 0.04], puddleChance: 0.6,
    destructibles: ['pipes', 'crates', 'ceiling_tiles']
  },
  roof: {
    ambient: [0.08, 0.08, 0.12], tubes: 0, tubeHP: [0.0, 0.0],
    fog: 0.01, fogColor: [0.06, 0.06, 0.10], puddleChance: 0.4,
    destructibles: ['vents', 'antennas', 'fencing']
  },
  morgue: {
    ambient: [0.04, 0.05, 0.06], tubes: 8, tubeHP: [0.2, 0.6],
    fog: 0.04, fogColor: [0.04, 0.05, 0.06], puddleChance: 0.5,
    destructibles: ['gurneys', 'trays', 'cabinet_doors', 'ceiling_tiles']
  },
  padded_room: {
    ambient: [0.05, 0.05, 0.04], tubes: 1, tubeHP: [0.3, 0.9],
    fog: 0.02, fogColor: [0.05, 0.05, 0.04], puddleChance: 0.0,
    destructibles: ['padding']
  }
};

// ─── Ghost Type Definitions ────────────────────────────────────────────

const GHOST_TYPES = {
  shadow: { absorption: 0.9, emission: 0.0, scattering: 0.1, color: [0.02, 0.02, 0.03], trailDecay: 0.85, distortion: 0.1, density: 2.5 },
  spirit: { absorption: 0.1, emission: 0.7, scattering: 0.6, color: [0.4, 0.55, 0.8], trailDecay: 0.7, distortion: 0.3, density: 1.0 },
  wraith: { absorption: 0.0, emission: 0.05, scattering: 0.05, color: [0.1, 0.1, 0.1], trailDecay: 0.92, distortion: 0.8, density: 0.3 }
};

// ─── Fluorescent Flicker Patterns ──────────────────────────────────────

const FLICKER = {
  healthy: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.95, 1, 1, 1],
  aging:   [1, 1, 0.8, 1, 1, 0.6, 1, 1, 1, 0.9, 1, 0.7, 1, 1, 0.85, 1],
  dying:   [0, 0, 0.5, 0.8, 0, 0, 0.3, 0.9, 0.2, 0, 0, 0.6, 0, 0.1, 0, 0.4],
  startup: [0, 0, 0, 0.2, 0, 0, 0, 0.1, 0.6, 0, 0.8, 0.3, 0.9, 0.5, 0.95, 1],
  dead:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

// ─── Destruction Fragment Templates ────────────────────────────────────

const DESTRUCT = {
  windows:       { count: 24, scale: [0.02, 0.08], mat: 'glass',        refract: true },
  beds:          { count: 8,  scale: [0.1, 0.4],   mat: 'metal_wood',   refract: false },
  wheelchairs:   { count: 12, scale: [0.05, 0.2],  mat: 'metal',        refract: false },
  ceiling_tiles: { count: 6,  scale: [0.15, 0.3],  mat: 'plaster',      refract: false },
  chairs:        { count: 8,  scale: [0.05, 0.15], mat: 'plastic_wood', refract: false },
  desk_lamp:     { count: 5,  scale: [0.02, 0.06], mat: 'metal_glass',  refract: true },
  pipes:         { count: 3,  scale: [0.1, 0.5],   mat: 'metal',        refract: false },
  crates:        { count: 10, scale: [0.05, 0.2],  mat: 'wood',         refract: false },
  gurneys:       { count: 8,  scale: [0.08, 0.3],  mat: 'metal',        refract: false },
  trays:         { count: 6,  scale: [0.03, 0.1],  mat: 'metal',        refract: false },
  cabinet_doors: { count: 4,  scale: [0.1, 0.25],  mat: 'metal',        refract: false },
  vents:         { count: 6,  scale: [0.05, 0.15], mat: 'metal',        refract: false },
  antennas:      { count: 3,  scale: [0.02, 0.3],  mat: 'metal',        refract: false },
  fencing:       { count: 8,  scale: [0.05, 0.2],  mat: 'metal',        refract: false },
  padding:       { count: 4,  scale: [0.2, 0.4],   mat: 'fabric',       refract: false }
};

export class HauntedAsylumRenderUpgrade2026 {

  constructor(game) {
    this.game = game;
    this.renderer = game.renderer || game.core?.renderer || null;
    this.device = this.renderer?.device || window.gpuDevice || null;

    // Subsystems
    this.giSystem = null;
    this.areaLights = null;
    this.atmosphere = null;
    this.materialSystem = null;
    this.particleSystem = null;

    // Ward state
    this.currentWard = 'ward';
    this.wardPreset = WARD_PRESETS.ward;

    // Fluorescent tubes
    this.tubes = [];
    this.tubeTime = 0;

    // Puddles
    this.puddles = [];
    this.puddleReflectionRT = null;
    this.puddleRippleBuffer = null;

    // Ghosts
    this.ghosts = new Map();
    this.nextGhostId = 0;
    this.ghostVolumeTexture = null;
    this.ghostTrailBuffer = null;
    this.ghostDistortionMap = null;

    // Destruction
    this.destructibles = new Map();
    this.fragments = [];
    this.dustParticles = [];
    this.fragmentBuffer = null;
    this.fragmentVelocityBuffer = null;

    // Materials & GI
    this.asylumMaterials = new Map();
    this.giBlockers = new Map();
    this.giDirty = true;

    this.stats = {
      giProbes: 0, activeTubes: 0, activePuddles: 0,
      activeGhosts: 0, fragmentCount: 0, drawCalls: 0
    };
    this.time = 0;
    this.initialized = false;
  }

  // ─── Initialization ──────────────────────────────────────────────

  async initialize() {
    if (!this.device) {
      console.warn('HauntedAsylumRenderUpgrade2026: No GPU device available');
      return false;
    }

    try {
      // Global illumination via radiance cascades
      this.giSystem = new RadianceCascades2026(this.device, {
        cascadeCount: 4, probeSpacing: 1.5, maxBounces: 3,
        updateRate: 'dynamic', colorBleeding: true
      });
      await this.giSystem.initialize();
      this.stats.giProbes = this.giSystem.stats?.probeCount || 0;

      // Area light system for tube lights
      this.areaLights = new AreaLightSystem2026(this.device, {
        maxLights: 128, shadowMapSize: 512, enableIES: true
      });
      await this.areaLights.initialize();

      // Atmospheric fog & dust
      this.atmosphere = new AtmosphericRenderer2026(this.device, {
        enableVolumetricFog: true, fogMode: 'height', maxParticles: 10000
      });
      await this.atmosphere.initialize();

      // PBR material system
      this.materialSystem = new MaterialSystem2026(this.device, {
        maxMaterials: 64, enableSSS: true, enableClearcoat: true, enableDisplacement: true
      });
      await this.materialSystem.initialize();
      this._buildAsylumMaterials();

      // GPU resources — puddle reflections
      this.puddleReflectionRT = this.device.createTexture({
        size: [512, 512, 1], format: 'rgba16float',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
      });
      this.puddleRippleBuffer = this.device.createBuffer({
        size: 1024, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: 'puddle-ripples'
      });

      // GPU resources — ghost volumes
      this.ghostVolumeTexture = this.device.createTexture({
        size: [64, 64, 64], format: 'r16float', dimension: '3d',
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
      });
      this.ghostTrailBuffer = this.device.createBuffer({
        size: 512 * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: 'ghost-trails'
      });
      this.ghostDistortionMap = this.device.createTexture({
        size: [256, 256, 1], format: 'rg16float',
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
      });

      // GPU resources — destruction fragments
      this.fragmentBuffer = this.device.createBuffer({
        size: 256 * 64, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: 'destruction-frags'
      });
      this.fragmentVelocityBuffer = this.device.createBuffer({
        size: 256 * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: 'frag-velocities'
      });

      // Particle system
      if (!this.game.particleSystem && this.renderer) {
        this.particleSystem = new GPUParticleSystem(this.renderer, 20000);
        await this.particleSystem.initialize();
      } else {
        this.particleSystem = this.game.particleSystem || null;
      }

      this.setWardType(this.currentWard);
      this.initialized = true;
      console.log('HauntedAsylumRenderUpgrade2026 initialized');
      return true;
    } catch (err) {
      console.error('Rendering upgrade init failed:', err);
      return false;
    }
  }

  // ─── Asylum-Specific PBR Materials ───────────────────────────────

  _buildAsylumMaterials() {
    const m = this.asylumMaterials;

    // Multi-layer peeling paint: paint → plaster → brick
    m.set('peeling_paint', {
      type: 'multi_layer', displacementScale: 0.003, peelNoiseFreq: 4.0, peelEdgeRoughness: 0.95,
      layers: [
        { name: 'brick',   albedo: [0.45, 0.32, 0.25], roughness: 0.9, metallic: 0.0 },
        { name: 'plaster', albedo: [0.75, 0.72, 0.68], roughness: 0.8, metallic: 0.0, opacity: 0.85 },
        { name: 'paint',   albedo: [0.6, 0.65, 0.55],  roughness: 0.5, metallic: 0.0, opacity: 0.6, peelFactor: 0.4 }
      ]
    });

    // Procedural stained tile floor
    m.set('dirty_tile', {
      type: 'procedural', baseAlbedo: [0.7, 0.7, 0.68], groutColor: [0.3, 0.28, 0.25],
      roughness: 0.6, tileSize: 0.3, groutWidth: 0.01,
      stainColor: [0.25, 0.2, 0.15], stainFreq: 2.5, stainIntensity: 0.5, dirtAccumulation: 0.3
    });

    // Rusted metal for bed frames, gurneys, pipes
    m.set('rusted_metal', {
      type: 'standard', albedo: [0.55, 0.35, 0.2], roughness: 0.75, metallic: 0.85,
      rustColor: [0.5, 0.25, 0.1], rustCoverage: 0.6, rustRoughnessBump: 0.2,
      rustNoiseScale: 8.0, pitting: 0.15
    });

    // Padded room wall fabric
    m.set('padded_wall', {
      type: 'fabric', albedo: [0.65, 0.63, 0.58], roughness: 0.85,
      sheenColor: [0.8, 0.78, 0.72], sheenRoughness: 0.4,
      weave: 'diamond', displacementScale: 0.008, buttonFrequency: 0.5
    });

    // Fresh blood — SSS with wet clearcoat
    m.set('blood_fresh', {
      type: 'sss', albedo: [0.6, 0.02, 0.02], roughness: 0.15,
      sssColor: [0.8, 0.05, 0.02], sssRadius: 0.4, sssStrength: 0.8,
      clearcoat: 0.9, clearcoatRoughness: 0.05, viscosity: 0.7
    });

    // Old dried blood
    m.set('blood_old', {
      type: 'standard', albedo: [0.15, 0.04, 0.03], roughness: 0.85,
      edgeDarkening: 0.3, crackPattern: true, crackScale: 12.0
    });

    // Wet floor clearcoat over tile
    m.set('wet_floor', {
      type: 'clearcoat', baseAlbedo: [0.45, 0.43, 0.4], baseRoughness: 0.6,
      clearcoat: 1.0, clearcoatRoughness: 0.02, ior: 1.33, reflectivity: 0.9
    });

    // Chrome gurney frame
    m.set('gurney_chrome', {
      type: 'standard', albedo: [0.8, 0.8, 0.8], roughness: 0.2, metallic: 1.0,
      wearMask: true, wearRoughness: 0.6, wearCoverage: 0.4
    });

    // Cracked yellowed plastic
    m.set('cracked_plastic', {
      type: 'standard', albedo: [0.55, 0.52, 0.48], roughness: 0.45,
      crackDensity: 0.3, crackDepth: 0.002, yellowing: 0.15
    });
  }

  // ─── Ward Configuration ──────────────────────────────────────────

  setWardType(type) {
    const p = WARD_PRESETS[type];
    if (!p) { console.warn(`Unknown ward type: ${type}`); return; }
    this.currentWard = type;
    this.wardPreset = p;
    this.atmosphere?.setFogDensity?.(p.fog);
    this.atmosphere?.setFogColor?.(p.fogColor);
    this._rebuildTubes(p.tubes, p.tubeHP);
    this.giDirty = true;
  }

  _rebuildTubes(count, hpRange) {
    this.tubes = [];
    for (let i = 0; i < count; i++) {
      const hp = hpRange[0] + Math.random() * (hpRange[1] - hpRange[0]);
      const pattern = hp <= 0 ? 'dead' : hp < 0.3 ? 'dying' : hp < 0.6 ? 'aging' : 'healthy';
      const tube = {
        id: i, position: [0, 2.8, i * 3.5], length: 1.2, health: hp, pattern,
        patternIndex: Math.floor(Math.random() * FLICKER[pattern].length),
        phase: Math.random() * Math.PI * 2,
        intensity: hp > 0 ? 0.6 + hp * 0.4 : 0,
        color: [0.9, 0.95, 1.0],
        humFrequency: 100 + (1 - hp) * 60,
        humVolume: hp > 0 ? 0.05 + (1 - hp) * 0.15 : 0,
        startupTimer: -1, lightId: null, brightness: 0
      };
      if (this.areaLights && hp > 0) {
        tube.lightId = this.areaLights.addLight?.({
          type: 'tube', position: tube.position, direction: [0, -1, 0],
          color: tube.color, intensity: 0, length: 1.2, radius: 0.02,
          iesProfile: 'fluorescent_tube'
        });
      }
      this.tubes.push(tube);
    }
    this.stats.activeTubes = this.tubes.filter(t => t.health > 0).length;
  }

  _updateTubes(dt) {
    this.tubeTime += dt;
    for (const tube of this.tubes) {
      if (tube.health <= 0) { tube.brightness = 0; continue; }

      // Startup sequence: brief flash → off → buzz → on → flicker → steady (or fail)
      if (tube.startupTimer >= 0) {
        tube.startupTimer += dt;
        const sp = FLICKER.startup;
        const idx = Math.min(Math.floor(tube.startupTimer * 8), sp.length - 1);
        tube.brightness = sp[idx] * tube.intensity;
        if (tube.startupTimer >= sp.length / 8) tube.startupTimer = -1;
      } else {
        const pat = FLICKER[tube.pattern];
        const speed = tube.pattern === 'dying' ? 6 : tube.pattern === 'aging' ? 3 : 1;
        tube.patternIndex = Math.floor((this.tubeTime * speed + tube.phase) % pat.length);
        tube.brightness = pat[tube.patternIndex] * tube.intensity;
      }

      // Push brightness to area light
      if (tube.lightId != null) {
        this.areaLights?.updateLight?.(tube.lightId, { intensity: tube.brightness });
      }
    }
  }

  // ─── Ghost Volumetric System ─────────────────────────────────────

  spawnGhost(type, position, path = []) {
    const cfg = GHOST_TYPES[type];
    if (!cfg) { console.warn(`Unknown ghost type: ${type}`); return -1; }
    const id = this.nextGhostId++;
    this.ghosts.set(id, {
      id, type, cfg: { ...cfg },
      position: [...position], prevPosition: [...position],
      path: path.map(p => [...p]), pathIndex: 0, pathProgress: 0,
      speed: 1.5 + Math.random() * 0.5,
      trail: [], maxTrailLength: 32,
      volumeOffset: [Math.random() * 1e3, Math.random() * 1e3, Math.random() * 1e3],
      animPhase: Math.random() * Math.PI * 2,
      opacity: 0, fadeIn: true, alive: true
    });
    this.stats.activeGhosts = this.ghosts.size;
    return id;
  }

  removeGhost(id) {
    const g = this.ghosts.get(id);
    if (g) { g.alive = false; g.fadeIn = false; }
  }

  _updateGhosts(dt) {
    const toRemove = [];
    for (const [id, g] of this.ghosts) {
      if (g.fadeIn) g.opacity = Math.min(1, g.opacity + dt * 0.5);
      if (!g.alive) { g.opacity -= dt * 0.8; if (g.opacity <= 0) { toRemove.push(id); continue; } }

      g.prevPosition = [...g.position];
      g.animPhase += dt * 2.0;

      // Follow path with floating bob
      if (g.path.length >= 2) {
        g.pathProgress += dt * g.speed;
        const a = g.path[g.pathIndex];
        const b = g.path[(g.pathIndex + 1) % g.path.length];
        const seg = this._dist3(a, b);
        if (seg > 0 && g.pathProgress >= seg) {
          g.pathProgress -= seg;
          g.pathIndex = (g.pathIndex + 1) % g.path.length;
        }
        const t = seg > 0 ? g.pathProgress / seg : 0;
        g.position = [
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t + Math.sin(g.animPhase) * 0.1,
          a[2] + (b[2] - a[2]) * t
        ];
      }

      // Fading volumetric trail behind movement
      g.trail.unshift([...g.position, g.opacity]);
      if (g.trail.length > g.maxTrailLength) g.trail.pop();
      for (const tp of g.trail) tp[3] *= g.cfg.trailDecay;
    }
    for (const id of toRemove) this.ghosts.delete(id);
    this.stats.activeGhosts = this.ghosts.size;
  }

  _dist3(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // ─── Dynamic Destruction ─────────────────────────────────────────

  breakObject(objectId) {
    const obj = this.destructibles.get(objectId);
    if (!obj || obj.broken) return false;
    obj.broken = true;

    const tmpl = DESTRUCT[obj.category] || DESTRUCT.chairs;
    for (let i = 0; i < tmpl.count; i++) {
      const sc = tmpl.scale[0] + Math.random() * (tmpl.scale[1] - tmpl.scale[0]);
      const ang = Math.random() * Math.PI * 2;
      this.fragments.push({
        position: [
          obj.position[0] + (Math.random() - 0.5) * obj.size,
          obj.position[1] + Math.random() * obj.size,
          obj.position[2] + (Math.random() - 0.5) * obj.size
        ],
        velocity: [Math.cos(ang) * (1.5 + Math.random() * 2.5), 1 + Math.random() * 3, Math.sin(ang) * (1.5 + Math.random() * 2.5)],
        rotation: [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28],
        angularVel: [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8],
        scale: sc, material: tmpl.mat, hasRefraction: tmpl.refract,
        lifetime: 5 + Math.random() * 3, age: 0, settled: false, bounces: 0
      });
    }

    // Dust burst particles for debris catching light shafts
    this._spawnDustBurst(obj.position, tmpl.count);
    this.stats.fragmentCount = this.fragments.length;
    this.giDirty = true;
    return true;
  }

  _spawnDustBurst(position, intensity) {
    const count = intensity * 8;
    for (let i = 0; i < count; i++) {
      this.dustParticles.push({
        position: [
          position[0] + (Math.random() - 0.5) * 0.5,
          position[1] + Math.random() * 0.5,
          position[2] + (Math.random() - 0.5) * 0.5
        ],
        velocity: [(Math.random() - 0.5) * 2, 0.5 + Math.random() * 1.5, (Math.random() - 0.5) * 2],
        size: 0.02 + Math.random() * 0.06,
        opacity: 0.6 + Math.random() * 0.4,
        lifetime: 2 + Math.random() * 3, age: 0
      });
    }
  }

  _updateFragments(dt) {
    const gravity = -9.81;
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i];
      f.age += dt;
      if (f.age >= f.lifetime) { this.fragments.splice(i, 1); continue; }
      if (f.settled) continue;

      f.velocity[1] += gravity * dt;
      f.position[0] += f.velocity[0] * dt;
      f.position[1] += f.velocity[1] * dt;
      f.position[2] += f.velocity[2] * dt;
      f.rotation[0] += f.angularVel[0] * dt;
      f.rotation[1] += f.angularVel[1] * dt;
      f.rotation[2] += f.angularVel[2] * dt;

      // Ground bounce
      if (f.position[1] <= f.scale * 0.5) {
        f.position[1] = f.scale * 0.5;
        f.velocity[1] *= -0.3;
        f.velocity[0] *= 0.7; f.velocity[2] *= 0.7;
        f.angularVel[0] *= 0.5; f.angularVel[1] *= 0.5; f.angularVel[2] *= 0.5;
        f.bounces++;
        if (f.bounces >= 3 || Math.abs(f.velocity[1]) < 0.1) {
          f.settled = true;
          f.velocity = [0, 0, 0]; f.angularVel = [0, 0, 0];
        }
      }
      f.velocity[0] *= 0.98; f.velocity[2] *= 0.98;
    }

    // Dust particles drift upward through light shafts
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i];
      p.age += dt;
      if (p.age >= p.lifetime) { this.dustParticles.splice(i, 1); continue; }
      p.opacity = (1 - p.age / p.lifetime) * 0.5;
      p.velocity[1] += 0.2 * dt;
      p.position[0] += p.velocity[0] * dt;
      p.position[1] += p.velocity[1] * dt;
      p.position[2] += p.velocity[2] * dt;
      p.velocity[0] *= 0.99; p.velocity[2] *= 0.99;
      p.size += dt * 0.01;
    }
    this.stats.fragmentCount = this.fragments.length;
  }

  // ─── Wet Floor Puddle System ─────────────────────────────────────

  addPuddle(position, size = 1.0) {
    const puddle = {
      id: this.puddles.length, position: [...position], size,
      ripples: [], maxRipples: 8,
      dripTimer: Math.random() * 2, dripInterval: 0.8 + Math.random() * 2,
      reflectionStrength: 0.85
    };
    this.puddles.push(puddle);
    this.stats.activePuddles = this.puddles.length;
    return puddle.id;
  }

  _updatePuddles(dt) {
    for (const puddle of this.puddles) {
      puddle.dripTimer += dt;
      if (puddle.dripTimer >= puddle.dripInterval) {
        puddle.dripTimer -= puddle.dripInterval;
        if (puddle.ripples.length < puddle.maxRipples) {
          puddle.ripples.push({
            center: [(Math.random() - 0.5) * puddle.size * 0.8, (Math.random() - 0.5) * puddle.size * 0.8],
            radius: 0, maxRadius: puddle.size * 0.4,
            amplitude: 0.003 + Math.random() * 0.005,
            speed: 0.6 + Math.random() * 0.3, age: 0
          });
        }
      }
      for (let i = puddle.ripples.length - 1; i >= 0; i--) {
        const rp = puddle.ripples[i];
        rp.age += dt; rp.radius += rp.speed * dt; rp.amplitude *= 0.97;
        if (rp.radius >= rp.maxRadius || rp.amplitude < 1e-4) puddle.ripples.splice(i, 1);
      }
    }
  }

  // Reflected camera for puddle ray-traced reflections (ghosts visible in reflections)
  _computePuddleReflection(camera) {
    if (!this.puddles.length) return;
    const reflY = -(camera.position?.[1] || 1.6);
    this._reflectedCamera = {
      position: [camera.position?.[0] || 0, reflY, camera.position?.[2] || 0],
      pitch: -(camera.pitch || 0), yaw: camera.yaw || 0
    };
  }

  // ─── GI Blockers (doors / windows) ──────────────────────────────

  setGIBlocker(id, position, size, open) {
    this.giBlockers.set(id, { position, size, open });
    this.giDirty = true;
  }

  _updateGI() {
    if (!this.giDirty || !this.giSystem) return;
    this.giDirty = false;
    const blockerData = [];
    for (const [, b] of this.giBlockers) {
      blockerData.push({ position: b.position, size: b.size, transmittance: b.open ? 0.95 : 0.02 });
    }
    this.giSystem.setBlockers?.(blockerData);
    this.giSystem.markDirty?.();
  }

  // ─── GPU Data Uploads ────────────────────────────────────────────

  _uploadGhostData() {
    if (!this.ghosts.size) return;
    const arr = [];
    for (const [, g] of this.ghosts) {
      arr.push(
        g.position[0], g.position[1], g.position[2], g.opacity,
        g.cfg.absorption, g.cfg.emission, g.cfg.scattering, g.cfg.density,
        g.cfg.color[0], g.cfg.color[1], g.cfg.color[2], g.cfg.distortion,
        g.volumeOffset[0], g.volumeOffset[1], g.volumeOffset[2], g.animPhase
      );
    }
    const data = new Float32Array(arr);
    this.device.queue.writeBuffer(
      this.ghostTrailBuffer, 0, data.buffer, data.byteOffset,
      Math.min(data.byteLength, this.ghostTrailBuffer.size)
    );
  }

  _uploadFragmentData() {
    if (!this.fragments.length) return;
    const arr = [];
    for (const f of this.fragments) {
      arr.push(
        f.position[0], f.position[1], f.position[2], f.scale,
        f.rotation[0], f.rotation[1], f.rotation[2], f.hasRefraction ? 1 : 0,
        f.velocity[0], f.velocity[1], f.velocity[2], f.settled ? 1 : 0,
        f.age / f.lifetime, 0, 0, 0
      );
    }
    const data = new Float32Array(arr);
    this.device.queue.writeBuffer(
      this.fragmentBuffer, 0, data.buffer, data.byteOffset,
      Math.min(data.byteLength, this.fragmentBuffer.size)
    );
  }

  // ─── Render Hooks ────────────────────────────────────────────────

  beforeRender(camera, deltaTime) {
    if (!this.initialized) return;
    this.time += deltaTime;
    const dt = Math.min(deltaTime, 0.05);

    this._updateTubes(dt);
    this._updatePuddles(dt);
    this._updateGhosts(dt);
    this._updateFragments(dt);
    this._updateGI();
    this._computePuddleReflection(camera);
    this._uploadGhostData();
    this._uploadFragmentData();

    this.giSystem?.update?.(deltaTime);
    this.atmosphere?.update?.(deltaTime, camera);
    this.areaLights?.update?.(deltaTime);

    this.stats.activeTubes = this.tubes.filter(t => t.brightness > 0).length;
    this.stats.drawCalls = (
      this.stats.activeTubes + this.stats.activePuddles +
      this.stats.activeGhosts * 2 + this.stats.fragmentCount
    );
  }

  afterRender() {
    // Post-frame: swap ping-pong buffers, clear transient state
  }

  getStats() { return { ...this.stats }; }

  // ─── Cleanup ─────────────────────────────────────────────────────

  dispose() {
    this.ghosts.clear();
    this.puddles = [];
    this.tubes = [];
    this.fragments = [];
    this.dustParticles = [];
    this.destructibles.clear();
    this.giBlockers.clear();
    this.asylumMaterials.clear();

    this.puddleReflectionRT?.destroy();
    this.puddleRippleBuffer?.destroy();
    this.ghostVolumeTexture?.destroy();
    this.ghostTrailBuffer?.destroy();
    this.ghostDistortionMap?.destroy();
    this.fragmentBuffer?.destroy();
    this.fragmentVelocityBuffer?.destroy();

    this.giSystem?.dispose?.();
    this.areaLights?.dispose?.();
    this.atmosphere?.dispose?.();
    this.materialSystem?.dispose?.();
    if (this.particleSystem && this.particleSystem !== this.game.particleSystem) {
      this.particleSystem.dispose?.();
    }

    this.initialized = false;
    console.log('HauntedAsylumRenderUpgrade2026 disposed');
  }
}

export default HauntedAsylumRenderUpgrade2026;
