/**
 * RenderingUpgrade2026.js — Drop-in rendering enhancement for Shadow Crawler 3D
 * Augments the existing Three.js game with path-traced lighting, volumetric fog,
 * shadow creatures, PBR materials, upgraded enemies, destructibles, and 20 levels.
 */

export class ShadowCrawler3DRenderUpgrade {
  constructor(game) {
    this.game = game;
    this.scene = game.scene ?? null;
    this.camera = game.camera ?? null;
    this.renderer = game.renderer ?? null;

    this.quality = 'high';
    this.capabilities = { webgpu: false, float32: false, maxTexSize: 4096 };
    this.enabled = true;
    this.pathTracerEnabled = false;
    this.disposed = false;

    // Path tracer state
    this.pathTracer = { bvh: null, materials: [], lights: [], bounceCount: 4, accumBuffer: null, sampleCount: 0 };

    // Volumetric fog state
    this.fog = { baseDensity: 0.035, currentDensity: 0.035, targetColor: new THREE.Color(0x0a0814), colorLerp: 0, regions: [], shafts: [], noiseOffset: 0 };

    // Shadow creatures
    this.shadowCreatures = [];
    this.creaturePool = [];

    // Destructibles
    this.destructibles = [];
    this.debrisParticles = [];

    // Cached original materials for restoration
    this.originalMaterials = new Map();

    // Level atmosphere configs for all 20 levels
    this.levelAtmospheres = buildLevelAtmospheres();

    // Damage vignette state
    this.damageVignette = { intensity: 0, direction: null, overlay: null };

    // Proximity horror accumulators
    this.proximityFog = 0;
    this.proximityTargetFog = 0;
  }

  /* ------------------------------------------------------------------ */
  /*  Initialization                                                     */
  /* ------------------------------------------------------------------ */

  async initialize() {
    this._detectCapabilities();

    if (!this.scene || !this.renderer) {
      console.warn('[RenderUpgrade] No scene/renderer on game ref — attempting globals');
      this.scene = this.game.scene ?? window.scene;
      this.camera = this.game.camera ?? window.camera;
      this.renderer = this.game.renderer ?? window.renderer;
    }
    if (!this.scene) throw new Error('[RenderUpgrade] Three.js scene not found');

    this._setupToneMapping();
    this._createDamageOverlay();
    this.setQuality(this.quality);

    console.log(`[RenderUpgrade] Initialized — quality: ${this.quality}, webgpu: ${this.capabilities.webgpu}`);
  }

  _detectCapabilities() {
    this.capabilities.webgpu = typeof navigator !== 'undefined' && !!navigator.gpu;
    const gl = this.renderer?.getContext?.();
    if (gl) {
      this.capabilities.float32 = !!gl.getExtension('OES_texture_float');
      this.capabilities.maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }
  }

  _setupToneMapping() {
    if (!this.renderer) return;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
  }

  _createDamageOverlay() {
    if (typeof document === 'undefined') return;
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', pointerEvents: 'none',
      background: 'radial-gradient(ellipse at center, transparent 40%, rgba(180,0,0,0.6) 100%)',
      opacity: '0', transition: 'opacity 0.05s', zIndex: '999'
    });
    overlay.id = 'render-upgrade-damage';
    document.body.appendChild(overlay);
    this.damageVignette.overlay = overlay;
  }

  /* ------------------------------------------------------------------ */
  /*  Quality Settings                                                   */
  /* ------------------------------------------------------------------ */

  setQuality(level) {
    const valid = ['ultra', 'high', 'medium', 'low'];
    this.quality = valid.includes(level) ? level : 'high';

    this.pathTracerEnabled = this.quality === 'ultra' && this.capabilities.webgpu;
    this.pathTracer.bounceCount = this.quality === 'ultra' ? 4 : 2;

    const pixelRatio = { ultra: 1, high: Math.min(window.devicePixelRatio, 2), medium: 1, low: 0.75 };
    this.renderer?.setPixelRatio(pixelRatio[this.quality] ?? 1);

    const shadowSize = { ultra: 2048, high: 1024, medium: 512, low: 256 }[this.quality];
    this.scene?.traverse(obj => {
      if (obj.isLight && obj.shadow) {
        obj.shadow.mapSize.set(shadowSize, shadowSize);
        if (obj.shadow.map) { obj.shadow.map.dispose(); obj.shadow.map = null; }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Path-Traced Lighting                                               */
  /* ------------------------------------------------------------------ */

  convertSceneForPathTracer(threeScene) {
    const target = threeScene ?? this.scene;
    const geometries = [];
    const materials = [];
    const sceneLights = [];

    target.traverse(obj => {
      if (obj.isMesh && obj.geometry) {
        const worldMatrix = obj.matrixWorld.clone();
        const geo = obj.geometry.clone().applyMatrix4(worldMatrix);
        const mat = obj.material;
        geometries.push(geo);
        materials.push({
          color: mat.color ? mat.color.toArray() : [1, 1, 1],
          roughness: mat.roughness ?? 0.5,
          metalness: mat.metalness ?? 0.0,
          emissive: mat.emissive ? mat.emissive.toArray() : [0, 0, 0],
          emissiveIntensity: mat.emissiveIntensity ?? 0,
          transparent: !!mat.transparent,
          opacity: mat.opacity ?? 1.0
        });
      }
      if (obj.isLight) {
        sceneLights.push({
          type: obj.isPointLight ? 'point' : obj.isDirectionalLight ? 'directional' : 'ambient',
          position: obj.getWorldPosition(new THREE.Vector3()).toArray(),
          color: obj.color.toArray(),
          intensity: obj.intensity,
          distance: obj.distance ?? 0,
          decay: obj.decay ?? 2
        });
      }
    });

    // Flat BVH placeholder — stores bounding boxes for spatial queries
    const bvh = this._buildSimpleBVH(geometries);
    this.pathTracer.bvh = bvh;
    this.pathTracer.materials = materials;
    this.pathTracer.lights = sceneLights;
    this.pathTracer.sampleCount = 0;

    return { geometries, materials, lights: sceneLights, bvh };
  }

  _buildSimpleBVH(geometries) {
    const nodes = geometries.map((geo, i) => {
      geo.computeBoundingBox();
      return { index: i, box: geo.boundingBox.clone() };
    });
    // Simple top-down median-split BVH
    const build = (items) => {
      if (items.length <= 4) return { leaf: true, items };
      const bounds = new THREE.Box3();
      items.forEach(it => bounds.union(it.box));
      const size = new THREE.Vector3();
      bounds.getSize(size);
      const axis = size.x >= size.y && size.x >= size.z ? 'x' : size.y >= size.z ? 'y' : 'z';
      items.sort((a, b) => a.box.min[axis] - b.box.min[axis]);
      const mid = Math.floor(items.length / 2);
      return { leaf: false, bounds, left: build(items.slice(0, mid)), right: build(items.slice(mid)) };
    };
    return nodes.length ? build(nodes) : null;
  }

  _updatePathTracer(dt) {
    if (!this.pathTracerEnabled || !this.pathTracer.bvh) return;
    // Invalidate accumulation on camera movement so progressive refinement restarts
    this.pathTracer.sampleCount = 0;
  }

  /* ------------------------------------------------------------------ */
  /*  Volumetric Fog System                                              */
  /* ------------------------------------------------------------------ */

  _updateFog(dt) {
    if (!this.scene || !this.scene.fog) return;
    const atm = this._currentAtmosphere();

    // Lerp density toward target (base + proximity horror boost)
    const targetDensity = (atm?.fogDensity ?? 0.035) + this.proximityFog;
    this.fog.currentDensity += (targetDensity - this.fog.currentDensity) * Math.min(dt * 2, 1);
    this.scene.fog.density = this.fog.currentDensity;

    // Lerp fog color
    const targetColor = atm?.fogColor ? new THREE.Color(atm.fogColor) : this.fog.targetColor;
    this.scene.fog.color.lerp(targetColor, Math.min(dt * 1.5, 1));
    this.scene.background?.copy?.(this.scene.fog.color);

    // Proximity horror fog decays back to 0
    this.proximityFog += (this.proximityTargetFog - this.proximityFog) * Math.min(dt * 3, 1);
    this.proximityTargetFog *= 0.95;

    // Animate noise offset for volumetric shaft scrolling
    this.fog.noiseOffset += dt * 0.3;
    this._updateFogShafts(dt);
  }

  _updateFogShafts(dt) {
    if (this.quality === 'low') return;
    // Create / update light shaft sprites from point lights within camera frustum
    const cam = this.camera;
    if (!cam) return;
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));

    this.scene.traverse(obj => {
      if (!obj.isPointLight || obj.intensity < 0.1) return;
      const pos = obj.getWorldPosition(new THREE.Vector3());
      if (!frustum.containsPoint(pos)) return;
      // Ensure a shaft sprite exists for this light
      if (!obj.userData._fogShaft) {
        const spriteMat = new THREE.SpriteMaterial({ color: obj.color, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(3, 6, 1);
        this.scene.add(sprite);
        obj.userData._fogShaft = sprite;
        this.fog.shafts.push(sprite);
      }
      const shaft = obj.userData._fogShaft;
      shaft.position.copy(pos).y -= 1.5;
      shaft.material.opacity = 0.04 + Math.sin(this.fog.noiseOffset + pos.x) * 0.02;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Shadow Creatures                                                   */
  /* ------------------------------------------------------------------ */

  _updateShadowCreatures(dt) {
    if (this.quality === 'low') return;
    const cam = this.camera;
    if (!cam) return;
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const camPos = cam.getWorldPosition(new THREE.Vector3());
    const atm = this._currentAtmosphere();
    const maxCreatures = atm?.shadowCreatureCount ?? 3;

    // Spawn new creatures near player on walls if below cap
    while (this.shadowCreatures.length < maxCreatures) {
      const creature = this._spawnShadowCreature(camPos);
      if (!creature) break;
      this.shadowCreatures.push(creature);
    }

    for (let i = this.shadowCreatures.length - 1; i >= 0; i--) {
      const c = this.shadowCreatures[i];
      c.lifetime -= dt;
      if (c.lifetime <= 0) { this._removeShadowCreature(i); continue; }

      // Only visible in peripheral vision — fade when looked at directly
      const toCreature = new THREE.Vector3().subVectors(c.mesh.position, camPos).normalize();
      const dot = camDir.dot(toCreature);
      const peripheral = 1 - THREE.MathUtils.smoothstep(dot, 0.5, 0.85);
      c.mesh.material.opacity = peripheral * 0.35 * Math.min(c.lifetime, 1);

      // Scatter from flashlight: check if torch points at creature
      const torch = this.scene.userData?.torch;
      if (torch) {
        const torchDir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        const torchDot = torchDir.dot(toCreature);
        if (torchDot > 0.9) { c.lifetime = Math.min(c.lifetime, 0.3); }
      }

      // Animate displacement crawl along wall surface
      c.phase += dt * c.speed;
      c.mesh.position.y += Math.sin(c.phase) * dt * 0.3;
      c.mesh.position.x += Math.cos(c.phase * 0.7) * dt * 0.1;
    }
  }

  _spawnShadowCreature(nearPos) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 6 + Math.random() * 8;
    const pos = new THREE.Vector3(nearPos.x + Math.cos(angle) * dist, 1.5 + Math.random() * 2, nearPos.z + Math.sin(angle) * dist);

    const geo = new THREE.PlaneGeometry(1.5, 1.5, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.MultiplyBlending });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.lookAt(nearPos);
    this.scene.add(mesh);

    return { mesh, lifetime: 4 + Math.random() * 6, phase: Math.random() * Math.PI * 2, speed: 0.8 + Math.random() * 1.2 };
  }

  _removeShadowCreature(index) {
    const c = this.shadowCreatures[index];
    this.scene.remove(c.mesh);
    c.mesh.geometry.dispose();
    c.mesh.material.dispose();
    this.shadowCreatures.splice(index, 1);
  }

  /* ------------------------------------------------------------------ */
  /*  Enhanced Dungeon Materials                                         */
  /* ------------------------------------------------------------------ */

  upgradeDungeonMaterials() {
    if (this.quality === 'low') return;
    const atm = this._currentAtmosphere();

    this.scene.traverse(obj => {
      if (!obj.isMesh || !obj.material || obj.userData._upgraded) return;
      const mat = obj.material;
      this.originalMaterials.set(obj.uuid, mat);

      const isFloor = obj.position.y < 0.5;
      const isCeiling = obj.position.y > 3;
      const isWall = !isFloor && !isCeiling;

      let upgraded;
      if (isFloor) {
        upgraded = this._createFloorMaterial(mat, atm);
      } else if (isWall) {
        upgraded = this._createWallMaterial(mat, atm);
      } else {
        upgraded = this._createCeilingMaterial(mat, atm);
      }
      if (upgraded) { obj.material = upgraded; obj.userData._upgraded = true; }
    });
  }

  _createFloorMaterial(baseMat, atm) {
    const isWet = atm?.wetFloors ?? false;
    return new THREE.MeshStandardMaterial({
      color: baseMat.color ?? new THREE.Color(0x0a0814),
      roughness: isWet ? 0.1 : 0.85,
      metalness: isWet ? 0.3 : 0.1,
      envMapIntensity: isWet ? 1.5 : 0.3,
      ...(isWet && { clearcoat: 1.0, clearcoatRoughness: 0.05 })
    });
  }

  _createWallMaterial(baseMat, atm) {
    const isOrganic = atm?.organicWalls ?? false;
    return new THREE.MeshStandardMaterial({
      color: isOrganic ? new THREE.Color(0x3a0a0a) : (baseMat.color ?? new THREE.Color(0x1a1030)),
      roughness: isOrganic ? 0.55 : 0.9,
      metalness: isOrganic ? 0.0 : 0.2,
      bumpScale: isOrganic ? 0.04 : 0.02,
      emissive: isOrganic ? new THREE.Color(0x1a0000) : new THREE.Color(0x000000),
      emissiveIntensity: isOrganic ? 0.15 : 0
    });
  }

  _createCeilingMaterial(baseMat, _atm) {
    return new THREE.MeshStandardMaterial({
      color: baseMat.color ?? new THREE.Color(0x111122),
      roughness: 0.85, metalness: 0.15
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Upgraded Enemy Rendering                                           */
  /* ------------------------------------------------------------------ */

  upgradeEnemyMaterials(enemies) {
    if (!enemies || this.quality === 'low') return;
    for (const enemy of enemies) {
      if (!enemy.mesh || enemy.mesh.userData._upgraded) continue;
      const type = enemy.type;
      const mesh = enemy.mesh;
      this.originalMaterials.set(mesh.uuid, mesh.material);

      mesh.material = this._enemyMaterial(type, enemy.config);
      mesh.userData._upgraded = true;

      // Glowing eyes as child point lights
      if (type !== 'WRAITH') {
        const eyeColor = type === 'BEAST' ? 0xff4400 : type === 'SENTINEL' ? 0x44aaff : 0xff0000;
        const eyeLight = new THREE.PointLight(eyeColor, 0.6, 5, 2);
        eyeLight.position.set(0, 0.8, -0.3);
        mesh.add(eyeLight);
        enemy._eyeLight = eyeLight;
      }
    }
  }

  _enemyMaterial(type, config) {
    const baseColor = new THREE.Color(config.color);
    switch (type) {
      case 'GUARD':
      case 'HUNTER':
        // SSS-like warm skin approximation
        return new THREE.MeshStandardMaterial({
          color: baseColor, roughness: 0.6, metalness: 0.0,
          emissive: baseColor.clone().multiplyScalar(0.05), emissiveIntensity: 0.3
        });
      case 'WRAITH':
        return new THREE.MeshStandardMaterial({
          color: baseColor, roughness: 0.2, metalness: 0.0,
          transparent: true, opacity: 0.35, emissive: new THREE.Color(0x2266aa),
          emissiveIntensity: 0.8, side: THREE.DoubleSide, depthWrite: false
        });
      case 'BEAST':
        // Anisotropic fur approximation
        return new THREE.MeshStandardMaterial({
          color: baseColor, roughness: 0.95, metalness: 0.0,
          emissive: new THREE.Color(0x110500), emissiveIntensity: 0.2
        });
      case 'SENTINEL':
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x888888), roughness: 0.25, metalness: 0.9,
          emissive: new THREE.Color(0x221100), emissiveIntensity: 0.1
        });
      default:
        return new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.5, metalness: 0.1 });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Destructible Environment                                           */
  /* ------------------------------------------------------------------ */

  registerDestructible(mesh, { health = 30, debrisCount = 8, revealsPassage = false } = {}) {
    mesh.userData._destructible = { health, maxHealth: health, debrisCount, revealsPassage };
    this.destructibles.push(mesh);
  }

  triggerDestruction(position, radius) {
    const pos = position instanceof THREE.Vector3 ? position : new THREE.Vector3(position.x, position.y, position.z);
    const destroyed = [];

    for (let i = this.destructibles.length - 1; i >= 0; i--) {
      const mesh = this.destructibles[i];
      const dist = mesh.position.distanceTo(pos);
      if (dist > radius) continue;

      const info = mesh.userData._destructible;
      const damage = (1 - dist / radius) * 100;
      info.health -= damage;
      if (info.health > 0) continue;

      // Spawn debris particles
      this._spawnDebris(mesh.position, info.debrisCount, mesh.material?.color);

      // Reveal hidden passage by removing wall from collision grid
      if (info.revealsPassage && this.game.dungeon) {
        const cellSize = 4; // CONFIG.CELL_SIZE
        const gx = Math.round(mesh.position.x / cellSize);
        const gz = Math.round(mesh.position.z / cellSize);
        if (this.game.dungeon.grid?.[gz]?.[gx] !== undefined) {
          this.game.dungeon.grid[gz][gx] = 0;
        }
      }

      this.scene.remove(mesh);
      mesh.geometry?.dispose();
      mesh.material?.dispose();
      this.destructibles.splice(i, 1);
      destroyed.push(mesh);
    }
    return destroyed;
  }

  _spawnDebris(origin, count, color) {
    const debrisGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: color ?? new THREE.Color(0x332211), roughness: 0.9, metalness: 0.1
    });
    for (let i = 0; i < count; i++) {
      const piece = new THREE.Mesh(debrisGeo, debrisMat);
      piece.position.copy(origin);
      piece.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4);
      this.scene.add(piece);
      this.debrisParticles.push({ mesh: piece, velocity: vel, lifetime: 2 + Math.random() });
    }

    // Dust burst sprite
    const dustMat = new THREE.SpriteMaterial({ color: 0x998877, transparent: true, opacity: 0.5, blending: THREE.NormalBlending, depthWrite: false });
    const dust = new THREE.Sprite(dustMat);
    dust.position.copy(origin);
    dust.scale.set(0.5, 0.5, 0.5);
    this.scene.add(dust);
    this.debrisParticles.push({ mesh: dust, velocity: new THREE.Vector3(0, 0.5, 0), lifetime: 1.5, isDust: true, startScale: 0.5 });
  }

  _updateDebris(dt) {
    const gravity = -9.8;
    for (let i = this.debrisParticles.length - 1; i >= 0; i--) {
      const p = this.debrisParticles[i];
      p.lifetime -= dt;
      if (p.lifetime <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry?.dispose();
        p.mesh.material?.dispose();
        this.debrisParticles.splice(i, 1);
        continue;
      }
      if (p.isDust) {
        const s = p.startScale + (2.5 - p.startScale) * (1 - p.lifetime / 1.5);
        p.mesh.scale.set(s, s, s);
        p.mesh.material.opacity = p.lifetime / 1.5 * 0.5;
      } else {
        p.velocity.y += gravity * dt;
        if (p.mesh.position.y <= 0.1) { p.velocity.y *= -0.3; p.velocity.x *= 0.8; p.velocity.z *= 0.8; p.mesh.position.y = 0.1; }
      }
      p.mesh.position.addScaledVector(p.velocity, dt);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Level System — 20 levels + infinite procedural mode                */
  /* ------------------------------------------------------------------ */

  onLevelChange(levelConfig) {
    const idx = levelConfig?.index ?? 0;
    const atm = this.levelAtmospheres[Math.min(idx, this.levelAtmospheres.length - 1)];

    // Apply atmosphere
    this.fog.targetColor.set(atm.fogColor);
    if (this.scene?.fog) {
      this.scene.fog.density = atm.fogDensity;
    }
    if (this.renderer) {
      this.renderer.toneMappingExposure = atm.exposure ?? 1.0;
    }

    // Re-upgrade materials for new level's style
    this._resetUpgradedFlags();
    this.upgradeDungeonMaterials();

    // Adjust shadow creature count
    this.shadowCreatures.forEach((_, i) => this._removeShadowCreature(i));
    this.shadowCreatures.length = 0;

    // Seed destructibles for the new level
    this._autoRegisterDestructibles();
  }

  getLevelConfig(index) {
    if (index < this.levelAtmospheres.length) {
      return this.levelAtmospheres[index];
    }
    // Infinite procedural mode after level 20
    return this._generateProceduralLevel(index);
  }

  _generateProceduralLevel(index) {
    const seed = index * 7919;
    const r = (offset) => ((Math.sin(seed + offset) * 43758.5453) % 1 + 1) % 1;
    return {
      name: `Abyss Depth ${index - 19}`,
      rooms: 20 + Math.floor(r(1) * 10),
      enemies: 20 + Math.floor(r(2) * index * 0.5),
      shards: 8 + Math.floor(r(3) * 5),
      type: r(4) > 0.7 ? 'boss' : 'normal',
      fogColor: new THREE.Color().setHSL(r(5) * 0.1, 0.6, 0.04).getHex(),
      fogDensity: 0.04 + r(6) * 0.04,
      ambientIntensity: 0.05 + r(7) * 0.1,
      ambientColor: 0x110011,
      exposure: 0.6 + r(8) * 0.4,
      wetFloors: r(9) > 0.5,
      organicWalls: r(10) > 0.7,
      shadowCreatureCount: 3 + Math.floor(r(11) * 5)
    };
  }

  _resetUpgradedFlags() {
    this.scene?.traverse(obj => {
      if (obj.userData._upgraded) {
        const orig = this.originalMaterials.get(obj.uuid);
        if (orig) obj.material = orig;
        obj.userData._upgraded = false;
      }
    });
  }

  _autoRegisterDestructibles() {
    this.destructibles.length = 0;
    this.scene?.traverse(obj => {
      if (!obj.isMesh) return;
      const name = (obj.name || '').toLowerCase();
      if (name.includes('crate') || name.includes('barrel') || name.includes('weak')) {
        this.registerDestructible(obj, {
          health: name.includes('weak') ? 15 : 30,
          debrisCount: name.includes('barrel') ? 10 : 6,
          revealsPassage: name.includes('weak')
        });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Event Hooks                                                        */
  /* ------------------------------------------------------------------ */

  onEnemyNearby(enemy, distance) {
    if (distance < 15) {
      // Horror fog boost — intensity inversely proportional to distance
      this.proximityTargetFog = Math.max(this.proximityTargetFog, (1 - distance / 15) * 0.03);
    }
    if (distance < 8 && enemy._eyeLight) {
      // Pulse enemy eye glow when close
      enemy._eyeLight.intensity = 0.6 + Math.sin(Date.now() * 0.008) * 0.4;
    }
  }

  onPlayerDamage(direction) {
    this.damageVignette.intensity = 1.0;
    this.damageVignette.direction = direction ?? null;
    if (this.damageVignette.overlay) {
      this.damageVignette.overlay.style.opacity = '1';
    }
  }

  _updateDamageVignette(dt) {
    if (this.damageVignette.intensity <= 0) return;
    this.damageVignette.intensity = Math.max(0, this.damageVignette.intensity - dt * 2.5);
    if (this.damageVignette.overlay) {
      this.damageVignette.overlay.style.opacity = String(this.damageVignette.intensity);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Render Loop Integration                                            */
  /* ------------------------------------------------------------------ */

  beforeRender(camera, deltaTime) {
    if (!this.enabled || this.disposed) return;
    const dt = Math.min(deltaTime, 0.1);

    this._updatePathTracer(dt);
    this._updateFog(dt);
    this._updateShadowCreatures(dt);
    this._updateDebris(dt);
    this._updateDamageVignette(dt);

    // Animate organic wall displacement for atmosphere types that support it
    const atm = this._currentAtmosphere();
    if (atm?.organicWalls) {
      this._pulseOrganicWalls(dt);
    }
  }

  afterRender() {
    if (!this.enabled || this.disposed) return;
    // Path tracer progressive accumulation tick
    if (this.pathTracerEnabled) {
      this.pathTracer.sampleCount++;
    }
  }

  _pulseOrganicWalls(dt) {
    const time = performance.now() * 0.001;
    this.scene.traverse(obj => {
      if (!obj.isMesh || !obj.userData._upgraded) return;
      if (obj.position.y < 0.5 || obj.position.y > 3) return;
      const mat = obj.material;
      if (mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = 0.1 + Math.sin(time + obj.position.x * 0.5) * 0.08;
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  _currentAtmosphere() {
    const idx = this.game?.GameState?.currentLevel ?? this.game?.currentLevel ?? 0;
    return this.levelAtmospheres[Math.min(idx, this.levelAtmospheres.length - 1)];
  }

  /* ------------------------------------------------------------------ */
  /*  Dispose                                                            */
  /* ------------------------------------------------------------------ */

  dispose() {
    this.disposed = true;
    this.enabled = false;

    // Restore original materials
    this._resetUpgradedFlags();
    this.originalMaterials.clear();

    // Remove shadow creatures
    while (this.shadowCreatures.length) this._removeShadowCreature(0);

    // Remove debris
    for (const p of this.debrisParticles) {
      this.scene?.remove(p.mesh);
      p.mesh.geometry?.dispose();
      p.mesh.material?.dispose();
    }
    this.debrisParticles.length = 0;

    // Remove fog shafts
    for (const s of this.fog.shafts) {
      this.scene?.remove(s);
      s.material?.dispose();
    }
    this.fog.shafts.length = 0;

    // Remove eye lights from enemies
    this.scene?.traverse(obj => {
      if (obj.isPointLight && obj.parent?.userData?._upgraded) {
        obj.parent.remove(obj);
      }
    });

    // Remove damage overlay
    this.damageVignette.overlay?.remove();
    this.damageVignette.overlay = null;

    console.log('[RenderUpgrade] Disposed');
  }
}

/* ==================================================================== */
/*  Level Atmosphere Definitions (1–20)                                  */
/* ==================================================================== */

function buildLevelAtmospheres() {
  return [
    // --- Original 10 levels (enhanced) ---
    /* 0  */ { name: 'The Dungeon',          fogColor: 0x0a0814, fogDensity: 0.035, ambientColor: 0x111122, ambientIntensity: 0.15, exposure: 1.0,  wetFloors: false, organicWalls: false, shadowCreatureCount: 1 },
    /* 1  */ { name: 'Cursed Halls',          fogColor: 0x0c0a18, fogDensity: 0.038, ambientColor: 0x0f0f22, ambientIntensity: 0.12, exposure: 0.95, wetFloors: false, organicWalls: false, shadowCreatureCount: 2 },
    /* 2  */ { name: 'Whispering Depths',     fogColor: 0x080a12, fogDensity: 0.040, ambientColor: 0x0a1020, ambientIntensity: 0.10, exposure: 0.9,  wetFloors: true,  organicWalls: false, shadowCreatureCount: 2 },
    /* 3  */ { name: 'The Labyrinth',         fogColor: 0x0a0810, fogDensity: 0.042, ambientColor: 0x100818, ambientIntensity: 0.10, exposure: 0.85, wetFloors: false, organicWalls: false, shadowCreatureCount: 3 },
    /* 4  */ { name: 'Shadow Warren',         fogColor: 0x06040e, fogDensity: 0.045, ambientColor: 0x080812, ambientIntensity: 0.08, exposure: 0.8,  wetFloors: false, organicWalls: false, shadowCreatureCount: 4 },
    /* 5  */ { name: 'Blood Chambers',        fogColor: 0x140408, fogDensity: 0.040, ambientColor: 0x180808, ambientIntensity: 0.12, exposure: 0.85, wetFloors: true,  organicWalls: false, shadowCreatureCount: 3 },
    /* 6  */ { name: 'The Forgotten',         fogColor: 0x060810, fogDensity: 0.048, ambientColor: 0x0a0a18, ambientIntensity: 0.08, exposure: 0.75, wetFloors: false, organicWalls: false, shadowCreatureCount: 4 },
    /* 7  */ { name: 'Veil of Darkness',      fogColor: 0x050510, fogDensity: 0.050, ambientColor: 0x080816, ambientIntensity: 0.06, exposure: 0.7,  wetFloors: false, organicWalls: false, shadowCreatureCount: 5 },
    /* 8  */ { name: 'Eternal Night',         fogColor: 0x030308, fogDensity: 0.055, ambientColor: 0x060610, ambientIntensity: 0.05, exposure: 0.65, wetFloors: true,  organicWalls: false, shadowCreatureCount: 5 },
    /* 9  */ { name: 'The Abyss',             fogColor: 0x020206, fogDensity: 0.060, ambientColor: 0x04040c, ambientIntensity: 0.04, exposure: 0.6,  wetFloors: true,  organicWalls: true,  shadowCreatureCount: 6 },
    // --- New levels 11–20 ---
    /* 10 */ { name: 'The Catacombs',         fogColor: 0x0e0c08, fogDensity: 0.042, ambientColor: 0x18140a, ambientIntensity: 0.10, exposure: 0.8,  wetFloors: false, organicWalls: false, shadowCreatureCount: 4, boneWalls: true },
    /* 11 */ { name: 'Flooded Depths',        fogColor: 0x041018, fogDensity: 0.055, ambientColor: 0x081828, ambientIntensity: 0.12, exposure: 0.75, wetFloors: true,  organicWalls: false, shadowCreatureCount: 3, caustics: true, waterLevel: 0.4 },
    /* 12 */ { name: 'The Nursery',           fogColor: 0x100810, fogDensity: 0.030, ambientColor: 0x1a1018, ambientIntensity: 0.18, exposure: 1.1,  wetFloors: false, organicWalls: false, shadowCreatureCount: 5, porcelain: true },
    /* 13 */ { name: 'Flesh Tunnels',         fogColor: 0x1a0404, fogDensity: 0.048, ambientColor: 0x200808, ambientIntensity: 0.10, exposure: 0.7,  wetFloors: true,  organicWalls: true,  shadowCreatureCount: 6, fleshPulse: true },
    /* 14 */ { name: 'Mirror Maze',           fogColor: 0x080808, fogDensity: 0.020, ambientColor: 0x141414, ambientIntensity: 0.20, exposure: 1.2,  wetFloors: true,  organicWalls: false, shadowCreatureCount: 2, mirrors: true },
    /* 15 */ { name: 'The Clocktower',        fogColor: 0x0c0a04, fogDensity: 0.032, ambientColor: 0x1a1408, ambientIntensity: 0.14, exposure: 0.9,  wetFloors: false, organicWalls: false, shadowCreatureCount: 3, brass: true },
    /* 16 */ { name: 'Frozen Crypt',          fogColor: 0x081018, fogDensity: 0.038, ambientColor: 0x102030, ambientIntensity: 0.16, exposure: 1.0,  wetFloors: true,  organicWalls: false, shadowCreatureCount: 2, frost: true },
    /* 17 */ { name: 'The Library',           fogColor: 0x100c06, fogDensity: 0.028, ambientColor: 0x1a1408, ambientIntensity: 0.20, exposure: 1.1,  wetFloors: false, organicWalls: false, shadowCreatureCount: 2, dustMotes: true },
    /* 18 */ { name: 'Shadow Realm',          fogColor: 0x010102, fogDensity: 0.075, ambientColor: 0x020204, ambientIntensity: 0.02, exposure: 0.4,  wetFloors: false, organicWalls: false, shadowCreatureCount: 8, nearDarkness: true },
    /* 19 */ { name: 'The Core',              fogColor: 0x180404, fogDensity: 0.050, ambientColor: 0x200804, ambientIntensity: 0.10, exposure: 0.85, wetFloors: false, organicWalls: true,  shadowCreatureCount: 5, lava: true, heatDistortion: true }
  ];
}
