/**
 * The Elevator — 2026 Rendering Upgrade
 * Per-floor atmospherics, sanity-driven degradation, PBR elevator interior,
 * floor-transition effects. Requires Three.js (loaded by the-elevator.js).
 */

const FLOOR_PRESETS = (() => {
  const p = [];
  const base = (id, o) => ({
    id, fogColor: o.fogColor || 0x000000, fogDensity: o.fogDensity ?? 0.02,
    lightType: o.lightType || 'fluorescent', lightColor: o.lightColor || 0xfff4e0,
    lightIntensity: o.lightIntensity ?? 1.0, materialState: o.materialState || 'clean',
    particleType: o.particleType || null, postPreset: o.postPreset || 'normal',
    ambientColor: o.ambientColor || 0x222222, ambientIntensity: o.ambientIntensity ?? 0.4,
    extras: o.extras || {},
  });
  for (let i = 1; i <= 5; i++) p.push(base(i, {
    fogColor: 0xe8e0d0, fogDensity: 0.005, lightColor: 0xfff4e0, lightIntensity: 1.0,
    materialState: 'clean', postPreset: 'normal', ambientColor: 0x888878, ambientIntensity: 0.5,
  }));
  for (let i = 6; i <= 10; i++) { const d = (i - 5) / 5; p.push(base(i, {
    fogColor: 0x3a3228, fogDensity: 0.015 + d * 0.01, lightType: 'flickering',
    lightColor: 0xddc890, lightIntensity: 0.6 - d * 0.15, materialState: 'peeling',
    particleType: 'dust', postPreset: 'desaturated', ambientColor: 0x44403a, ambientIntensity: 0.3,
    extras: { flickerSpeed: 3 + d * 5, dustDensity: 40 + d * 60 },
  })); }
  for (let i = 11; i <= 15; i++) { const t = (i - 10) / 5; p.push(base(i, {
    fogColor: 0x200000, fogDensity: 0.025 + t * 0.02, lightType: 'emergency',
    lightColor: 0xff1a00, lightIntensity: 0.4 + t * 0.15, materialState: 'bloody',
    particleType: 'fog_seep', postPreset: 'redshift', ambientColor: 0x330000, ambientIntensity: 0.25,
    extras: { bloodIntensity: t, fogSeepRate: 0.5 + t },
  })); }
  for (let i = 16; i <= 20; i++) { const t = (i - 15) / 5; p.push(base(i, {
    fogColor: 0x0a0014, fogDensity: 0.03 + t * 0.02, lightType: 'pulsing',
    lightColor: 0x8800ff, lightIntensity: 0.35, materialState: 'warped',
    particleType: 'void_motes', postPreset: 'chromatic', ambientColor: 0x110022,
    ambientIntensity: 0.15, extras: { geometryWarp: t * 0.4, colorShiftSpeed: 1 + t * 2 },
  })); }
  for (let i = 21; i <= 24; i++) { const t = (i - 20) / 4; p.push(base(i, {
    fogColor: 0x000000, fogDensity: 0.06 + t * 0.04, lightType: 'dying',
    lightColor: 0x443322, lightIntensity: 0.08 - t * 0.02, materialState: 'fractured',
    particleType: 'reality_cracks', postPreset: 'abyss', ambientColor: 0x050505,
    ambientIntensity: 0.05, extras: { whisperVolume: 0.3 + t * 0.7, fractureDensity: t },
  })); }
  p.push(base(25, {
    fogColor: 0xffffff, fogDensity: 0.0, lightType: 'blinding', lightColor: 0xffffff,
    lightIntensity: 5.0, materialState: 'void', particleType: 'light_dust',
    postPreset: 'whiteout', ambientColor: 0xffffff, ambientIntensity: 2.0,
    extras: { voidToggle: true, oscillateBlindVoid: true },
  }));
  return p;
})();

const SHADER_CHUNKS = {
  chromaticAberration: {
    uniforms: { tDiffuse: { value: null }, amount: { value: 0.0 }, angle: { value: 0.0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform float angle;
      varying vec2 vUv; void main(){
        vec2 o=amount*vec2(cos(angle),sin(angle));
        gl_FragColor=vec4(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b,1.0);
      }`,
  },
  staticNoise: {
    uniforms: { tDiffuse: { value: null }, time: { value: 0.0 }, intensity: { value: 0.0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform float intensity;
      varying vec2 vUv;
      float rand(vec2 c){ return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453); }
      void main(){ vec4 c=texture2D(tDiffuse,vUv); gl_FragColor=vec4(c.rgb+vec3(rand(vUv*time)*intensity),1.0); }`,
  },
  sanityDistort: {
    uniforms: { tDiffuse: { value: null }, sanity: { value: 1.0 }, time: { value: 0.0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float sanity; uniform float time;
      varying vec2 vUv; void main(){
        float ins=1.0-sanity; vec2 uv=vUv;
        uv.x+=sin(uv.y*20.0+time*3.0)*ins*0.008;
        uv.y+=cos(uv.x*15.0+time*2.5)*ins*0.006;
        vec4 c=texture2D(tDiffuse,uv);
        float g=dot(c.rgb,vec3(0.299,0.587,0.114));
        c.rgb=mix(c.rgb,vec3(g),ins*0.5);
        c.rgb+=mix(vec3(0.0),vec3(0.1,0.0,0.15),ins)*ins;
        c.rgb*=1.0-distance(vUv,vec2(0.5))*ins*1.6;
        gl_FragColor=c;
      }`,
  },
};

function lerpColor(a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), t); }
function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

export class ElevatorRenderUpgrade2026 {
  constructor(game) {
    this.game = game;
    this.scene = null; this.renderer = null; this.camera = null;
    this.clock = new THREE.Clock();
    this.currentFloor = 1; this.targetFloor = 1; this.sanity = 1.0;
    this.doorsOpen = false; this.inEmergency = false;
    this.elapsedTime = 0; this.transitionProgress = 1.0;
    this.transitionFrom = null; this.transitionTo = null;
    this.elevatorGroup = null; this.interiorLights = [];
    this.mirrorCamera = null; this.mirrorRT = null;
    this.doorLeft = null; this.doorRight = null;
    this.floorIndicator = null; this.buttonPanel = null;
    this.floorParticles = null;
    this.postProcessing = { chromaticAberration: 0, staticIntensity: 0, vignetteStrength: 0.3, bloomStrength: 0 };
    this._ppRT = null; this._ppScene = null; this._ppCamera = null; this._sanityMat = null;
    this._flickerTimer = 0; this._flickerState = true;
    this._doorAnim = { active: false, opening: false, progress: 0 };
    this._emergencyPulse = 0; this._voidOscillate = 0;
    this._buttons = [];
  }

  async initialize() {
    this.scene = this.game.scene || window.scene;
    this.renderer = this.game.renderer || window.renderer;
    this.camera = this.game.camera || window.camera;
    this._buildElevatorInterior();
    this._setupMirrorReflection();
    this._setupPostProcessing();
    this._buildFloorIndicator();
    this._buildButtonPanel();
    this.setFloor(this.currentFloor);
    return this;
  }

  // --- Elevator interior: chrome walls, fluorescent tube, doors, grate ---
  _buildElevatorInterior() {
    this.elevatorGroup = new THREE.Group();
    this.elevatorGroup.name = 'elevator_interior';
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xb8b8c0, metalness: 0.85, roughness: 0.25, envMapIntensity: 1.2 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.3, roughness: 0.6 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.1, roughness: 0.8 });
    const W = 2.4, H = 2.8, D = 2.0;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    this.elevatorGroup.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
    ceil.rotation.x = Math.PI / 2; ceil.position.y = H;
    this.elevatorGroup.add(ceil);

    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
    back.position.set(0, H/2, -D/2); back.receiveShadow = true;
    this.elevatorGroup.add(back);
    const sideGeo = new THREE.PlaneGeometry(D, H);
    const left = new THREE.Mesh(sideGeo, wallMat);
    left.position.set(-W/2, H/2, 0); left.rotation.y = Math.PI/2; left.receiveShadow = true;
    this.elevatorGroup.add(left);
    const right = new THREE.Mesh(sideGeo, wallMat.clone());
    right.position.set(W/2, H/2, 0); right.rotation.y = -Math.PI/2; right.receiveShadow = true;
    this.elevatorGroup.add(right);

    // Mirror panel
    this.mirrorMesh = new THREE.Mesh(new THREE.PlaneGeometry(W*0.6, H*0.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.mirrorMesh.position.set(0, H*0.55, -D/2+0.01);
    this.elevatorGroup.add(this.mirrorMesh);

    // Doors
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.15 });
    const doorGeo = new THREE.BoxGeometry(W/2, H, 0.04);
    this.doorLeft = new THREE.Mesh(doorGeo, doorMat);
    this.doorLeft.position.set(-W/4, H/2, D/2); this.doorLeft.castShadow = true;
    this.elevatorGroup.add(this.doorLeft);
    this.doorRight = new THREE.Mesh(doorGeo, doorMat.clone());
    this.doorRight.position.set(W/4, H/2, D/2); this.doorRight.castShadow = true;
    this.elevatorGroup.add(this.doorRight);

    // Fluorescent tube with IES-style emissive
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 2.0 });
    this._fluorescentTube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.08), tubeMat);
    this._fluorescentTube.position.set(0, H-0.05, 0);
    this.elevatorGroup.add(this._fluorescentTube);

    const mainLight = new THREE.RectAreaLight(0xfff4e0, 4, 1.2, 0.3);
    mainLight.position.set(0, H-0.06, 0); mainLight.lookAt(0,0,0);
    this.elevatorGroup.add(mainLight); this.interiorLights.push(mainLight);
    const fill = new THREE.PointLight(0xfff4e0, 0.5, 6);
    fill.position.set(0, H*0.7, 0); fill.castShadow = true; fill.shadow.mapSize.set(512,512);
    this.elevatorGroup.add(fill); this.interiorLights.push(fill);

    // Grate (shaft visible through depth fog)
    const grate = new THREE.Mesh(new THREE.PlaneGeometry(W*0.3, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.4, transparent: true, opacity: 0.6 }));
    grate.rotation.x = -Math.PI/2; grate.position.set(0, 0.001, D/2-0.1);
    this.elevatorGroup.add(grate);
    this.scene.add(this.elevatorGroup);
  }

  // --- Mirror render-to-texture (possibly wrong reflection at low sanity) ---
  _setupMirrorReflection() {
    this.mirrorRT = new THREE.WebGLRenderTarget(512, 512,
      { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
    this.mirrorCamera = this.camera.clone();
    this.mirrorMesh.material = new THREE.MeshBasicMaterial({ map: this.mirrorRT.texture });
  }

  _updateMirror() {
    if (!this.mirrorCamera) return;
    this.mirrorCamera.position.copy(this.camera.position);
    this.mirrorCamera.position.z = -this.camera.position.z - 2.0;
    this.mirrorCamera.quaternion.copy(this.camera.quaternion);
    this.mirrorCamera.quaternion.y *= -1; this.mirrorCamera.quaternion.w *= -1;
    if (this.sanity < 0.5) {
      const d = (1-this.sanity*2)*0.3;
      this.mirrorCamera.position.x += Math.sin(this.elapsedTime*1.3)*d;
      this.mirrorCamera.position.y += Math.cos(this.elapsedTime*0.9)*d*0.5;
    }
    this.mirrorMesh.visible = false;
    this.renderer.setRenderTarget(this.mirrorRT);
    this.renderer.render(this.scene, this.mirrorCamera);
    this.renderer.setRenderTarget(null);
    this.mirrorMesh.visible = true;
  }

  // --- Post-processing (sanity distortion, chromatic aberration, static) ---
  _setupPostProcessing() {
    this._ppRT = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight,
      { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this._ppQuad = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.ShaderMaterial(SHADER_CHUNKS.sanityDistort));
    this._ppScene = new THREE.Scene();
    this._ppCamera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this._ppScene.add(this._ppQuad);
    this._sanityMat = this._ppQuad.material;
    this._chromaticMat = new THREE.ShaderMaterial(SHADER_CHUNKS.chromaticAberration);
    this._staticMat = new THREE.ShaderMaterial(SHADER_CHUNKS.staticNoise);
  }

  // --- Floor indicator (emissive number display above door) ---
  _buildFloorIndicator() {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
    this._indicatorCtx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas); tex.minFilter = THREE.LinearFilter;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    mesh.position.set(0, 2.55, 1.0);
    this.elevatorGroup.add(mesh);
    this.floorIndicator = { mesh, texture: tex };
    this._drawFloorNumber(this.currentFloor);
  }

  _drawFloorNumber(n) {
    const ctx = this._indicatorCtx; ctx.clearRect(0,0,128,64); ctx.fillStyle = '#000'; ctx.fillRect(0,0,128,64);
    const c = new THREE.Color(FLOOR_PRESETS[Math.min(n,25)-1]?.lightColor || 0xff3300);
    ctx.fillStyle = `rgb(${c.r*255|0},${c.g*255|0},${c.b*255|0})`;
    ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(n), 64, 32);
    this.floorIndicator.texture.needsUpdate = true;
  }

  // --- Button panel with subtle glow ---
  _buildButtonPanel() {
    const panel = new THREE.Group();
    panel.add(new THREE.Mesh(new THREE.BoxGeometry(0.3,0.8,0.02),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 })));
    this._buttons = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const num = r*5+c+1; if (num > 25) break;
      const btn = new THREE.Mesh(new THREE.CircleGeometry(0.018,16),
        new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x443300, emissiveIntensity: 0.3, metalness: 0.6, roughness: 0.4 }));
      btn.position.set(-0.1+c*0.05, 0.3-r*0.08, 0.012); btn.userData.floor = num;
      panel.add(btn); this._buttons.push(btn);
    }
    panel.position.set(1.15, 1.3, -0.5); panel.rotation.y = -Math.PI/2;
    this.elevatorGroup.add(panel); this.buttonPanel = panel;
  }

  _highlightButton(n) {
    for (const b of this._buttons) {
      const on = b.userData.floor === n;
      b.material.emissiveIntensity = on ? 1.5 : 0.3;
      b.material.emissive.setHex(on ? 0xffaa00 : 0x443300);
    }
  }

  // --- Particle system (dust, fog seep, void motes, reality cracks, light dust) ---
  _clearParticles() {
    if (this.floorParticles) {
      this.elevatorGroup.remove(this.floorParticles);
      this.floorParticles.geometry.dispose(); this.floorParticles.material.dispose();
      this.floorParticles = null;
    }
  }

  _spawnParticles(type, preset) {
    this._clearParticles();
    const count = { dust: preset.extras.dustDensity||60, fog_seep: 80, void_motes: 120, reality_cracks: 200, light_dust: 150 }[type] || 0;
    if (!count) return;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count*3), vel = new Float32Array(count*3);
    for (let i = 0; i < count; i++) {
      pos[i*3]=(Math.random()-0.5)*2.4; pos[i*3+1]=Math.random()*2.8; pos[i*3+2]=(Math.random()-0.5)*2;
      vel[i*3]=(Math.random()-0.5)*0.1; vel[i*3+1]=type==='dust'?-0.02:(Math.random()-0.5)*0.05; vel[i*3+2]=(Math.random()-0.5)*0.1;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.userData.velocities = vel;
    const props = { dust:[0xaa9977,.015,.35], fog_seep:[0x881100,.06,.2], void_motes:[0x6600cc,.03,.5],
      reality_cracks:[0xffffff,.008,.9], light_dust:[0xffffff,.02,.6] }[type]||[0xffffff,.01,.3];
    this.floorParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      color: props[0], size: props[1], transparent: true, opacity: props[2], depthWrite: false, blending: THREE.AdditiveBlending }));
    this.elevatorGroup.add(this.floorParticles);
  }

  _updateParticles(dt) {
    if (!this.floorParticles) return;
    const p = this.floorParticles.geometry.attributes.position, v = this.floorParticles.geometry.userData.velocities;
    for (let i = 0; i < p.count; i++) {
      p.array[i*3]+=v[i*3]*dt; p.array[i*3+1]+=v[i*3+1]*dt; p.array[i*3+2]+=v[i*3+2]*dt;
      if (p.array[i*3+1]<0) p.array[i*3+1]=2.8; if (p.array[i*3+1]>2.8) p.array[i*3+1]=0;
    }
    p.needsUpdate = true;
  }

  // --- Floor management ---
  setFloor(floorNumber) {
    const n = Math.max(1, Math.min(25, floorNumber));
    if (n === this.currentFloor && this.transitionProgress >= 1) return;
    this.transitionFrom = FLOOR_PRESETS[this.currentFloor-1];
    this.transitionTo = FLOOR_PRESETS[n-1];
    this.targetFloor = n; this.transitionProgress = 0;
    this._drawFloorNumber(n); this._highlightButton(n);
    this._spawnParticles(this.transitionTo.particleType, this.transitionTo);
  }

  _applyPreset(preset, blend) {
    if (!preset) return;
    const t = easeInOutCubic(blend);
    if (!this.scene.fog) this.scene.fog = new THREE.FogExp2(preset.fogColor, preset.fogDensity);
    else if (this.transitionFrom) {
      this.scene.fog.color.copy(lerpColor(this.transitionFrom.fogColor, preset.fogColor, t));
      this.scene.fog.density = THREE.MathUtils.lerp(this.transitionFrom.fogDensity, preset.fogDensity, t);
    }
    const lc = this.transitionFrom ? lerpColor(this.transitionFrom.lightColor, preset.lightColor, t) : new THREE.Color(preset.lightColor);
    const li = this.transitionFrom ? THREE.MathUtils.lerp(this.transitionFrom.lightIntensity, preset.lightIntensity, t) : preset.lightIntensity;
    for (const l of this.interiorLights) { l.color.copy(lc); l.intensity = li; }
    if (this._fluorescentTube) { this._fluorescentTube.material.emissive.copy(lc); this._fluorescentTube.material.emissiveIntensity = li*2; }
    const ca = { normal:0, desaturated:0.001, redshift:0.003, chromatic:0.006, abyss:0.004, whiteout:0.002 };
    this.postProcessing.chromaticAberration = ca[preset.postPreset] || 0;
  }

  // --- Door animations with lighting transition ---
  openDoors(floorConfig) {
    if (this._doorAnim.active) return;
    this._doorAnim = { active: true, opening: true, progress: 0 };
    this.doorsOpen = true;
    if (floorConfig?.fogOverride) FLOOR_PRESETS[this.currentFloor-1].fogDensity = floorConfig.fogOverride;
  }

  closeDoors() {
    if (this._doorAnim.active && this._doorAnim.opening) return;
    this._doorAnim = { active: true, opening: false, progress: 0 };
  }

  _updateDoors(dt) {
    const a = this._doorAnim; if (!a.active) return;
    a.progress += dt * 0.8;
    const t = easeInOutCubic(Math.min(a.progress, 1)), hw = 0.6;
    if (a.opening) {
      this.doorLeft.position.x = THREE.MathUtils.lerp(-hw, -hw*2, t);
      this.doorRight.position.x = THREE.MathUtils.lerp(hw, hw*2, t);
      const preset = FLOOR_PRESETS[this.currentFloor-1];
      const spill = preset.lightIntensity > 0.5 ? 0.3*t : -0.2*t;
      for (const l of this.interiorLights) l.intensity += spill*dt;
    } else {
      this.doorLeft.position.x = THREE.MathUtils.lerp(-hw*2, -hw, t);
      this.doorRight.position.x = THREE.MathUtils.lerp(hw*2, hw, t);
    }
    if (a.progress >= 1) {
      a.active = false;
      if (!a.opening) { this.doorsOpen = false; for (const l of this.interiorLights) { l.color.setHex(0xfff4e0); l.intensity = 1.0; } }
      else this.currentFloor = this.targetFloor;
    }
  }

  // --- Sanity visual degradation ---
  setSanity(level) {
    this.sanity = Math.max(0, Math.min(1, level));
    const ins = 1 - this.sanity;
    this.postProcessing.chromaticAberration += ins * 0.005;
    this.postProcessing.staticIntensity = ins > 0.6 ? (ins-0.6)*0.5 : 0;
    if (this.sanity > 0.3 && this.sanity < 0.7) this._flickerTimer = Math.random()*2;
    if (this._sanityMat) this._sanityMat.uniforms.sanity.value = this.sanity;
  }

  _applySanityEffects(dt) {
    const ins = 1 - this.sanity; if (ins < 0.05) return;
    // Shadows move at low sanity
    if (ins > 0.4 && this.interiorLights.length > 1) {
      const dl = this.interiorLights[1];
      dl.position.x = Math.sin(this.elapsedTime*0.7)*ins*0.5;
      dl.position.z = Math.cos(this.elapsedTime*0.5)*ins*0.3;
    }
    // Peripheral movement flicker
    if (ins > 0.2 && Math.random() < ins*0.005) {
      const f = this.interiorLights[0]; if (f) { const o = f.intensity; f.intensity *= 0.3; setTimeout(()=>{ f.intensity=o; },60); }
    }
  }

  // --- Emergency stop: lights cut, red backup pulse ---
  triggerEmergency() {
    this.inEmergency = true; this._emergencyPulse = 0;
    for (const l of this.interiorLights) l.intensity = 0;
    if (this._fluorescentTube) this._fluorescentTube.material.emissiveIntensity = 0;
  }

  _updateEmergency(dt) {
    if (!this.inEmergency) return;
    this._emergencyPulse += dt*3;
    const pulse = (Math.sin(this._emergencyPulse)*0.5+0.5)*0.6;
    for (const l of this.interiorLights) { l.color.setHex(0xff0000); l.intensity = pulse; }
    if (this._fluorescentTube) { this._fluorescentTube.material.emissive.setHex(0xff0000); this._fluorescentTube.material.emissiveIntensity = pulse*3; }
  }

  _updateFlicker(dt) {
    const preset = FLOOR_PRESETS[this.currentFloor-1];
    if (preset.lightType !== 'flickering' && preset.lightType !== 'dying') return;
    this._flickerTimer += dt * (preset.extras.flickerSpeed || 5);
    if (this._flickerTimer > 1) {
      this._flickerTimer -= 1; this._flickerState = Math.random() > 0.3;
      const f = this._flickerState ? 1.0 : 0.05+Math.random()*0.2;
      for (const l of this.interiorLights) l.intensity = preset.lightIntensity*f;
      if (this._fluorescentTube) this._fluorescentTube.material.emissiveIntensity = f*2;
    }
  }

  // --- Floor 25: blinding white / absolute void oscillation ---
  _updateVoidOscillation(dt) {
    if (this.currentFloor !== 25) return;
    this._voidOscillate += dt * 0.3;
    const t = (Math.sin(this._voidOscillate)+1)/2;
    const c = lerpColor(0x000000, 0xffffff, t);
    if (this.scene.fog) this.scene.fog.color.copy(c);
    for (const l of this.interiorLights) { l.color.copy(c); l.intensity = THREE.MathUtils.lerp(0,5,t); }
  }

  // --- Render hooks ---
  beforeRender(camera, deltaTime) {
    const dt = deltaTime ?? this.clock.getDelta(); this.elapsedTime += dt;
    this.camera = camera || this.camera;
    if (this.transitionProgress < 1) {
      this.transitionProgress += dt*0.7; if (this.transitionProgress>1) this.transitionProgress=1;
      this._applyPreset(this.transitionTo, this.transitionProgress);
    }
    this._updateDoors(dt); this._updateFlicker(dt); this._updateEmergency(dt);
    this._updateParticles(dt); this._updateVoidOscillation(dt); this._applySanityEffects(dt);
    this._updateMirror();
    if (this._sanityMat) this._sanityMat.uniforms.time.value = this.elapsedTime;
    if (this._staticMat) this._staticMat.uniforms.time.value = this.elapsedTime;
    if (this.postProcessing.chromaticAberration>0.0005||this.postProcessing.staticIntensity>0.01||this.sanity<0.95) {
      this.renderer.setRenderTarget(this._ppRT);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this._sanityMat.uniforms.tDiffuse.value = this._ppRT.texture;
      this.renderer.render(this._ppScene, this._ppCamera);
    }
  }

  afterRender() { /* reserved for additional post-frame work */ }

  dispose() {
    this._clearParticles();
    if (this.mirrorRT) this.mirrorRT.dispose();
    if (this._ppRT) this._ppRT.dispose();
    if (this.elevatorGroup) {
      this.elevatorGroup.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach(m=>m.dispose());
      });
      this.scene.remove(this.elevatorGroup);
    }
    this.interiorLights.length = 0; this._buttons.length = 0;
    this.elevatorGroup = null; this.mirrorMesh = null;
    this.doorLeft = null; this.doorRight = null;
    this.floorIndicator = null; this.buttonPanel = null;
  }
}
