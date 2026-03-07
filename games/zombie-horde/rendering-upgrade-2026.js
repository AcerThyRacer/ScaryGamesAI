/**
 * Zombie Games — 2026 Rendering Upgrade
 * GPU-instanced crowd rendering, blood decal accumulation, dismemberment with
 * Verlet ragdoll, fire propagation, day/night cycle, environmental effects.
 * Compatible with zombie-horde, total-zombies-medieval, total-zombies-rome.
 */

const MAX_INSTANCES = 12000, MAX_BLOOD_DECALS = 4096, MAX_RAGDOLL_PARTS = 256, MAX_FIRE_PARTICLES = 2000;
const LOD_DETAILED = 20, LOD_MEDIUM = 50, LOD_BILLBOARD = 100;

const DAY_PHASES = {
  DAWN:  { start: 5,  end: 7,  skyColor: 0xff9944, fogColor: 0xdd8833, fogDensity: 0.008, ambient: 0.3,  sunAngle: 10  },
  DAY:   { start: 7,  end: 17, skyColor: 0x88bbee, fogColor: 0xccddee, fogDensity: 0.002, ambient: 1.0,  sunAngle: 70  },
  DUSK:  { start: 17, end: 19, skyColor: 0xcc4422, fogColor: 0x993311, fogDensity: 0.006, ambient: 0.35, sunAngle: 170 },
  NIGHT: { start: 19, end: 5,  skyColor: 0x0a0a18, fogColor: 0x050510, fogDensity: 0.015, ambient: 0.06, sunAngle: 250 },
};

// --- Verlet physics for lightweight ragdoll ---
class VerletPoint {
  constructor(x, y, z) { this.x=x; this.y=y; this.z=z; this.px=x; this.py=y; this.pz=z; this.ax=0; this.ay=-9.81; this.az=0; }
  update(dt) {
    const vx=this.x-this.px, vy=this.y-this.py, vz=this.z-this.pz;
    this.px=this.x; this.py=this.y; this.pz=this.z;
    this.x+=vx+this.ax*dt*dt; this.y+=vy+this.ay*dt*dt; this.z+=vz+this.az*dt*dt;
    if (this.y<0) { this.y=0; this.py=0; }
  }
}

class VerletConstraint {
  constructor(a, b, length) { this.a=a; this.b=b; this.length=length; }
  solve() {
    const dx=this.b.x-this.a.x, dy=this.b.y-this.a.y, dz=this.b.z-this.a.z;
    const dist=Math.sqrt(dx*dx+dy*dy+dz*dz)||0.001;
    const diff=(this.length-dist)/dist*0.5;
    this.a.x-=dx*diff; this.a.y-=dy*diff; this.a.z-=dz*diff;
    this.b.x+=dx*diff; this.b.y+=dy*diff; this.b.z+=dz*diff;
  }
}

const PART_OFFSETS = {
  head:  [{x:0,y:1.7,z:0},{x:0,y:1.5,z:0}],
  arm_l: [{x:-0.3,y:1.3,z:0},{x:-0.6,y:1.0,z:0},{x:-0.8,y:0.7,z:0}],
  arm_r: [{x:0.3,y:1.3,z:0},{x:0.6,y:1.0,z:0},{x:0.8,y:0.7,z:0}],
  torso: [{x:0,y:1.3,z:0},{x:0,y:1.0,z:0},{x:0,y:0.7,z:0}],
  leg_l: [{x:-0.15,y:0.7,z:0},{x:-0.15,y:0.35,z:0},{x:-0.15,y:0,z:0}],
  leg_r: [{x:0.15,y:0.7,z:0},{x:0.15,y:0.35,z:0},{x:0.15,y:0,z:0}],
};

class RagdollBody {
  constructor(position, partType) {
    this.alive=true; this.age=0; this.partType=partType; this.mesh=null;
    const offsets = PART_OFFSETS[partType] || [{x:0,y:0,z:0}];
    this.points = offsets.map(o => new VerletPoint(position.x+o.x, position.y+o.y, position.z+o.z));
    this.constraints = [];
    for (let i=1; i<this.points.length; i++) {
      const a=this.points[i-1], b=this.points[i];
      this.constraints.push(new VerletConstraint(a, b, Math.sqrt((b.x-a.x)**2+(b.y-a.y)**2+(b.z-a.z)**2)));
    }
    const angle=Math.random()*Math.PI*2, imp=1.5+Math.random()*2;
    for (const pt of this.points) { pt.px-=Math.cos(angle)*imp*0.016; pt.py-=(2+Math.random()*3)*0.016; pt.pz-=Math.sin(angle)*imp*0.016; }
  }
  update(dt) {
    this.age+=dt;
    for (const pt of this.points) pt.update(dt);
    for (let i=0;i<3;i++) for (const c of this.constraints) c.solve();
  }
  get position() { const p=this.points[0]; return {x:p.x,y:p.y,z:p.z}; }
}

// --- Blood decal pool with LRU eviction ---
class BloodDecalPool {
  constructor(max) { this.max=max; this.nextId=0; this.group=null; this._pool=[]; }
  init(scene) {
    this.group = new THREE.Group(); this.group.name='blood_decals'; scene.add(this.group);
    for (let i=0; i<this.max; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color:0x660000, roughness:0.35, metalness:0.05, transparent:true, opacity:0.9,
        depthWrite:false, emissive:0x220000, emissiveIntensity:0.15, side:THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1,1), mat);
      mesh.visible=false; mesh.receiveShadow=true; mesh.rotation.x=-Math.PI/2;
      this.group.add(mesh);
      this._pool.push({ mesh, active:false, age:0, id:i });
    }
  }
  add(position, normal, size) {
    let slot = this._pool.find(s=>!s.active);
    if (!slot) { let oldest=this._pool[0]; for (const s of this._pool) if (s.age>oldest.age) oldest=s; slot=oldest; }
    slot.active=true; slot.age=0; slot.id=this.nextId++;
    const m=slot.mesh; m.visible=true;
    m.position.set(position.x, position.y+0.02, position.z); m.scale.set(size,size,1);
    if (normal) {
      const q=new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0,1,0), new THREE.Vector3(normal.x,normal.y,normal.z).normalize());
      m.quaternion.copy(q);
    }
    m.rotation.z=Math.random()*Math.PI*2;
    const shade=0.6+Math.random()*0.4;
    m.material.color.setRGB(shade*0.4,0,0); m.material.opacity=0.85+Math.random()*0.15;
  }
  update(dt) {
    for (const s of this._pool) { if (!s.active) continue; s.age+=dt;
      if (s.age>120) { s.mesh.material.opacity-=dt*0.3;
        if (s.mesh.material.opacity<=0) { s.active=false; s.mesh.visible=false; }
      }
    }
  }
  dispose() {
    for (const s of this._pool) { s.mesh.geometry.dispose(); s.mesh.material.dispose(); }
    if (this.group && this.group.parent) this.group.parent.remove(this.group);
  }
}

// --- Fire particle system with propagation ---
class FireSystem {
  constructor(max) { this.max=max; this.burningZombies=new Map(); this.group=null; this.activeCount=0; }
  init(scene) {
    this.group=new THREE.Group(); this.group.name='fire_particles'; scene.add(this.group);
    const geo=new THREE.BufferGeometry();
    this.positions=new Float32Array(this.max*3); this.colors=new Float32Array(this.max*3);
    this.sizes=new Float32Array(this.max); this.velocities=new Float32Array(this.max*3);
    this.lifetimes=new Float32Array(this.max*2);
    geo.setAttribute('position',new THREE.BufferAttribute(this.positions,3));
    geo.setAttribute('customColor',new THREE.BufferAttribute(this.colors,3));
    geo.setAttribute('size',new THREE.BufferAttribute(this.sizes,1));
    this.points=new THREE.Points(geo, new THREE.PointsMaterial({
      size:0.5, vertexColors:true, transparent:true, opacity:0.85,
      depthWrite:false, blending:THREE.AdditiveBlending, sizeAttenuation:true }));
    this.group.add(this.points); this.activeCount=0;
  }
  _emit(x,y,z) {
    if (this.activeCount>=this.max) return;
    const i=this.activeCount, i3=i*3, i2=i*2;
    this.positions[i3]=x+(Math.random()-0.5)*0.3;
    this.positions[i3+1]=y+Math.random()*0.2;
    this.positions[i3+2]=z+(Math.random()-0.5)*0.3;
    this.velocities[i3]=(Math.random()-0.5)*0.4;
    this.velocities[i3+1]=1.5+Math.random()*2;
    this.velocities[i3+2]=(Math.random()-0.5)*0.4;
    const t=Math.random();
    this.colors[i3]=1; this.colors[i3+1]=0.3+t*0.5; this.colors[i3+2]=t*0.1;
    this.sizes[i]=0.3+Math.random()*0.4;
    this.lifetimes[i2]=0; this.lifetimes[i2+1]=0.4+Math.random()*0.6;
    this.activeCount++;
  }
  ignite(zombieId, position) {
    if (this.burningZombies.has(zombieId)) return;
    const light=new THREE.PointLight(0xff6600,2,8);
    light.position.set(position.x,(position.y||0)+1,position.z);
    this.group.add(light);
    this.burningZombies.set(zombieId, {
      light, position:{...position}, age:0, charLevel:0, spreadReady:false });
  }
  updateBurning(dt, getPos) {
    for (const [id,d] of this.burningZombies) {
      d.age+=dt; d.charLevel=Math.min(1, d.age/8);
      const pos=getPos(id);
      if (pos) {
        d.position.x=pos.x; d.position.y=pos.y||0; d.position.z=pos.z;
        d.light.position.set(pos.x,(pos.y||0)+1,pos.z);
      }
      const rate=Math.max(1, Math.floor(6-d.charLevel*3));
      for (let i=0;i<rate;i++) this._emit(d.position.x, d.position.y||0, d.position.z);
      // Smoke from charring zombies
      if (d.charLevel>0.3 && this.activeCount<this.max) {
        this._emit(d.position.x, (d.position.y||0)+0.5, d.position.z);
        const s3=(this.activeCount-1)*3;
        if (s3>=0) {
          this.colors[s3]=0.15; this.colors[s3+1]=0.12; this.colors[s3+2]=0.1;
          this.velocities[s3+1]=0.6+Math.random()*0.4;
        }
      }
      d.light.intensity=1.5+Math.sin(d.age*8)*0.5+Math.random()*0.3;
      if (d.age>2) d.spreadReady=true;
    }
  }
  update(dt) {
    let w=0;
    for (let i=0;i<this.activeCount;i++) {
      const i3=i*3, i2=i*2; this.lifetimes[i2]+=dt;
      if (this.lifetimes[i2]>=this.lifetimes[i2+1]) continue;
      const lr=this.lifetimes[i2]/this.lifetimes[i2+1];
      this.positions[i3]+=this.velocities[i3]*dt;
      this.positions[i3+1]+=this.velocities[i3+1]*dt;
      this.positions[i3+2]+=this.velocities[i3+2]*dt;
      this.velocities[i3+1]-=dt*0.5;
      this.sizes[i]*=(1-lr*0.3);
      if (w!==i) {
        const w3=w*3, w2=w*2;
        this.positions[w3]=this.positions[i3]; this.positions[w3+1]=this.positions[i3+1]; this.positions[w3+2]=this.positions[i3+2];
        this.colors[w3]=this.colors[i3]; this.colors[w3+1]=this.colors[i3+1]; this.colors[w3+2]=this.colors[i3+2];
        this.sizes[w]=this.sizes[i];
        this.velocities[w3]=this.velocities[i3]; this.velocities[w3+1]=this.velocities[i3+1]; this.velocities[w3+2]=this.velocities[i3+2];
        this.lifetimes[w2]=this.lifetimes[i2]; this.lifetimes[w2+1]=this.lifetimes[i2+1];
      }
      w++;
    }
    this.activeCount=w;
    const g=this.points.geometry;
    g.attributes.position.needsUpdate=true;
    g.attributes.customColor.needsUpdate=true;
    g.attributes.size.needsUpdate=true;
    g.setDrawRange(0,this.activeCount);
  }
  getSpreadCandidates(allZombies, radius) {
    const res=[];
    for (const [,d] of this.burningZombies) {
      if (!d.spreadReady) continue;
      for (const z of allZombies) {
        if (this.burningZombies.has(z.id)) continue;
        const dx=(z.x||0)-d.position.x, dz=(z.z||z.y||0)-d.position.z;
        if (dx*dx+dz*dz<radius*radius) res.push(z);
      }
    }
    return res;
  }
  dispose() {
    for (const [,d] of this.burningZombies) { this.group.remove(d.light); d.light.dispose(); }
    this.burningZombies.clear();
    if (this.points) { this.points.geometry.dispose(); this.points.material.dispose(); }
    if (this.group && this.group.parent) this.group.parent.remove(this.group);
  }
}

// --- Helpers ---
function lerpColor3(a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), t); }
function getPhase(h) {
  if (h>=5 && h<7) return 'DAWN';
  if (h>=7 && h<17) return 'DAY';
  if (h>=17 && h<19) return 'DUSK';
  return 'NIGHT';
}
function phaseBlend(h) {
  const p=getPhase(h), d=DAY_PHASES[p];
  let s=d.start, e=d.end;
  if (p==='NIGHT') { const a=h<5?h+24:h; s=19; e=29; return Math.min(1,(a-s)/(e-s)); }
  return Math.min(1,(h-s)/(e-s));
}

// ---------------------------------------------------------------------------
// Main class
// ---------------------------------------------------------------------------
export class ZombieRenderUpgrade2026 {
  constructor(game) {
    this.game=game; this.scene=null; this.renderer=null; this.camera=null;
    this.is3D=false; this.ctx=null;
    this.instanceMesh=null; this.instanceCount=0;
    this.lodGroups = { detailed:null, medium:null, billboard:null, dot:null };
    this.bloodDecals = new BloodDecalPool(MAX_BLOOD_DECALS);
    this.fireSystem = new FireSystem(MAX_FIRE_PARTICLES);
    this.ragdolls = [];
    this.timeOfDay = 12;
    this.sunLight=null; this.moonLight=null; this.ambientLight=null; this._hemiLight=null;
    this._dustParticles=null; this._rainParticles=null;
    this._muzzleFlash=null; this._muzzleFlashTimer=0;
    this._weatherState='clear'; this.elapsedTime=0; this._initialized=false;
    this._instanceColors=null;
    this._lodMat=new THREE.Matrix4();
    this._lodPos=new THREE.Vector3();
    this._lodQuat=new THREE.Quaternion();
    this._lodScale=new THREE.Vector3(1,1,1);
  }

  async initialize() {
    this.scene = this.game.scene || window.scene;
    this.renderer = this.game.renderer || window.renderer;
    this.camera = this.game.camera || window.camera;
    this.ctx = this.game.ctx || window.ctx;
    this.is3D = !!(this.scene && this.renderer);
    if (this.is3D) {
      this._initInstances();
      this.bloodDecals.init(this.scene);
      this.fireSystem.init(this.scene);
      this._initDayNight();
      this._initDust();
      this._initRain();
      this._initMuzzleFlash();
    }
    this._initialized = true;
    return this;
  }

  // --- GPU instanced zombie rendering with 4-tier automatic LOD ---
  _initInstances() {
    const v = new Float32Array([
      -0.2,0.6,-0.1, 0.2,0.6,-0.1, 0.2,1.4,-0.1, -0.2,1.4,-0.1,
      -0.2,0.6,0.1,  0.2,0.6,0.1,  0.2,1.4,0.1,  -0.2,1.4,0.1,
      -0.1,1.4,-0.08,0.1,1.4,-0.08,0.1,1.7,-0.08,-0.1,1.7,-0.08,
      -0.1,1.4,0.08, 0.1,1.4,0.08, 0.1,1.7,0.08, -0.1,1.7,0.08,
      -0.18,0,-0.08,-0.05,0,-0.08,-0.05,0.6,-0.08,-0.18,0.6,-0.08,
       0.05,0,-0.08, 0.18,0,-0.08, 0.18,0.6,-0.08, 0.05,0.6,-0.08,
    ]);
    const idx = new Uint16Array([
      0,1,2,0,2,3, 4,6,5,4,7,6, 0,4,5,0,5,1, 2,6,7,2,7,3, 0,3,7,0,7,4, 1,5,6,1,6,2,
      8,9,10,8,10,11, 12,14,13,12,15,14, 8,12,13,8,13,9, 10,14,15,10,15,11, 8,11,15,8,15,12, 9,13,14,9,14,10,
      16,17,18,16,18,19, 20,21,22,20,22,23]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color:0x556644, roughness:0.8, metalness:0.05 });

    this.instanceMesh = new THREE.InstancedMesh(geo, mat, MAX_INSTANCES);
    this.instanceMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instanceMesh.castShadow = true;
    this.instanceMesh.receiveShadow = true;
    this.instanceMesh.count = 0;
    this.instanceMesh.frustumCulled = false;
    const colAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_INSTANCES*3), 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    this.instanceMesh.instanceColor = colAttr;
    this._instanceColors = colAttr.array;
    this.scene.add(this.instanceMesh);

    // Medium LOD — simplified box
    const makeLOD = (geo, mat, opts) => {
      const m = new THREE.InstancedMesh(geo, mat, MAX_INSTANCES);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0; m.frustumCulled = false;
      if (opts) Object.assign(m, opts);
      this.scene.add(m); return m;
    };
    this.lodGroups.medium = makeLOD(
      new THREE.BoxGeometry(0.4, 1.7, 0.2),
      new THREE.MeshStandardMaterial({ color:0x556644, roughness:0.9 }));
    this.lodGroups.billboard = makeLOD(
      new THREE.PlaneGeometry(0.5, 1.7),
      new THREE.MeshBasicMaterial({ color:0x556644, transparent:true, opacity:0.8, side:THREE.DoubleSide }));
    this.lodGroups.dot = makeLOD(
      new THREE.SphereGeometry(0.15, 4, 3),
      new THREE.MeshBasicMaterial({ color:0x445533 }));
  }

  // --- Batch update all zombie instances with LOD sorting ---
  updateZombieInstances(zombies) {
    if (!this.is3D || !this.instanceMesh) return;
    if (!zombies || !zombies.length) {
      this.instanceMesh.count=0;
      this.lodGroups.medium.count=0;
      this.lodGroups.billboard.count=0;
      this.lodGroups.dot.count=0;
      return;
    }
    const cam=this.camera.position;
    const mat=this._lodMat, pos=this._lodPos, q=this._lodQuat, sc=this._lodScale;
    let dc=0, mc=0, bc=0, dtc=0;

    for (let i=0; i<zombies.length && i<MAX_INSTANCES; i++) {
      const z=zombies[i], zx=z.x||0, zy=z.y||0, zz=z.z||0;
      pos.set(zx, zy, zz);
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, z.rotation||z.angle||0);
      sc.set(1,1,1); mat.compose(pos, q, sc);
      const dx=cam.x-zx, dz=cam.z-zz, dist=Math.sqrt(dx*dx+dz*dz);

      if (dist < LOD_DETAILED) {
        this.instanceMesh.setMatrixAt(dc, mat);
        this._setColor(dc, z); dc++;
      } else if (dist < LOD_MEDIUM) {
        this.lodGroups.medium.setMatrixAt(mc, mat); mc++;
      } else if (dist < LOD_BILLBOARD) {
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.atan2(dx, dz));
        mat.compose(pos, q, sc);
        this.lodGroups.billboard.setMatrixAt(bc, mat); bc++;
      } else {
        this.lodGroups.dot.setMatrixAt(dtc, mat); dtc++;
      }
    }

    this.instanceMesh.count=dc; this.instanceMesh.instanceMatrix.needsUpdate=true;
    if (this.instanceMesh.instanceColor) this.instanceMesh.instanceColor.needsUpdate=true;
    this.lodGroups.medium.count=mc; this.lodGroups.medium.instanceMatrix.needsUpdate=true;
    this.lodGroups.billboard.count=bc; this.lodGroups.billboard.instanceMatrix.needsUpdate=true;
    this.lodGroups.dot.count=dtc; this.lodGroups.dot.instanceMatrix.needsUpdate=true;
    this.instanceCount = zombies.length;
  }

  _setColor(idx, zombie) {
    const i3=idx*3, burning=this.fireSystem.burningZombies.has(zombie.id);
    if (burning) {
      const ch = this.fireSystem.burningZombies.get(zombie.id).charLevel;
      this._instanceColors[i3]=0.15+(1-ch)*0.5;
      this._instanceColors[i3+1]=0.05+(1-ch)*0.2;
      this._instanceColors[i3+2]=0.02;
    } else {
      const dmg = Math.min(1, (zombie.damageState||zombie.damage||0)/100);
      this._instanceColors[i3]=0.33+dmg*0.3;
      this._instanceColors[i3+1]=0.4-dmg*0.2;
      this._instanceColors[i3+2]=0.27-dmg*0.15;
    }
  }

  // --- Blood decal API (3D deferred decals or 2D canvas fallback) ---
  addBloodDecal(position, normal, size) {
    if (this.is3D) {
      this.bloodDecals.add(position, normal, size || (0.5 + Math.random() * 1.5));
    } else if (this.ctx) {
      const ctx=this.ctx, r=(size||8)+Math.random()*(size||8);
      ctx.save();
      const g=ctx.createRadialGradient(position.x,position.y,0,position.x,position.y,r);
      g.addColorStop(0,'rgba(120,0,0,0.9)');
      g.addColorStop(0.6,'rgba(80,0,0,0.5)');
      g.addColorStop(1,'rgba(60,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath();
      ctx.arc(position.x, position.y, r, 0, Math.PI*2);
      ctx.fill(); ctx.restore();
    }
  }

  // --- Dismemberment with Verlet ragdoll physics ---
  triggerDismember(zombie, partType) {
    if (this.ragdolls.length >= MAX_RAGDOLL_PARTS) {
      const old = this.ragdolls.shift();
      if (old.mesh && old.mesh.parent) old.mesh.parent.remove(old.mesh);
    }
    const pos = { x:zombie.x||0, y:zombie.y||0, z:zombie.z||0 };
    const ragdoll = new RagdollBody(pos, partType);

    if (this.is3D) {
      const geos = {
        head:  () => new THREE.SphereGeometry(0.12, 8, 6),
        arm_l: () => new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6),
        arm_r: () => new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6),
        torso: () => new THREE.BoxGeometry(0.4, 0.6, 0.2),
        leg_l: () => new THREE.CylinderGeometry(0.06, 0.05, 0.6, 6),
        leg_r: () => new THREE.CylinderGeometry(0.06, 0.05, 0.6, 6),
      };
      ragdoll.mesh = new THREE.Mesh(
        (geos[partType] || geos.head)(),
        new THREE.MeshStandardMaterial({ color:0x556644, roughness:0.85 }));
      ragdoll.mesh.castShadow = true;
      this.scene.add(ragdoll.mesh);
      // Blood spray burst at separation point
      for (let i=0; i<12; i++) {
        this.bloodDecals.add(
          { x:pos.x+(Math.random()-0.5)*0.8, y:(pos.y||0)+0.01, z:(pos.z||0)+(Math.random()-0.5)*0.8 },
          { x:0, y:1, z:0 }, 0.3+Math.random()*0.5);
      }
    }
    this.ragdolls.push(ragdoll);
    return ragdoll;
  }

  _updateRagdolls(dt) {
    for (let i=this.ragdolls.length-1; i>=0; i--) {
      const r=this.ragdolls[i]; r.update(dt);
      if (r.mesh) { const p=r.position; r.mesh.position.set(p.x,p.y,p.z);
        if (r.points.length>1) { const l=r.points[r.points.length-1]; r.mesh.lookAt(l.x,l.y,l.z); } }
      if (r.age>15) {
        if (r.mesh&&r.mesh.parent) { r.mesh.geometry.dispose(); r.mesh.material.dispose(); r.mesh.parent.remove(r.mesh); }
        this.ragdolls.splice(i,1);
      }
    }
  }

  // --- Fire propagation API ---
  igniteZombie(zombie) {
    const id = zombie.id ?? zombie.index ?? Math.random();
    this.fireSystem.ignite(id, { x:zombie.x||0, y:zombie.y||0, z:zombie.z||0 });
  }

  _updateFireSpread(dt, allZombies) {
    if (!allZombies) return;
    for (const z of this.fireSystem.getSpreadCandidates(allZombies, 1.5)) {
      this.igniteZombie(z);
    }
  }

  // --- Day/Night cycle with dynamic atmosphere ---
  _initDayNight() {
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1);
    this.sunLight.position.set(50, 80, 30); this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const sc = this.sunLight.shadow.camera;
    sc.left=-60; sc.right=60; sc.top=60; sc.bottom=-60; sc.near=1; sc.far=200;
    this.scene.add(this.sunLight);
    this.moonLight = new THREE.DirectionalLight(0x8899bb, 0.15);
    this.moonLight.position.set(-30, 40, -20); this.scene.add(this.moonLight);
    this.ambientLight = new THREE.AmbientLight(0x444444, 0.4); this.scene.add(this.ambientLight);
    this._hemiLight = new THREE.HemisphereLight(0x88bbee, 0x443322, 0.3); this.scene.add(this._hemiLight);
    this.setTimeOfDay(12);
  }

  setTimeOfDay(hours) {
    this.timeOfDay = hours % 24; if (!this.is3D) return;
    const phase=getPhase(this.timeOfDay), blend=phaseBlend(this.timeOfDay), cur=DAY_PHASES[phase];
    const phases=['DAWN','DAY','DUSK','NIGHT'], next=DAY_PHASES[phases[(phases.indexOf(phase)+1)%4]];
    const sky=lerpColor3(cur.skyColor,next.skyColor,blend), fog=lerpColor3(cur.fogColor,next.fogColor,blend);
    const fogD=THREE.MathUtils.lerp(cur.fogDensity,next.fogDensity,blend);
    const amb=THREE.MathUtils.lerp(cur.ambient,next.ambient,blend);
    if (this.scene.background && this.scene.background.isColor) this.scene.background.copy(sky);
    else this.scene.background = sky.clone();
    if (!this.scene.fog) this.scene.fog=new THREE.FogExp2(fog.getHex(),fogD);
    else { this.scene.fog.color.copy(fog); this.scene.fog.density=fogD; }
    const sunA=THREE.MathUtils.degToRad(THREE.MathUtils.lerp(cur.sunAngle,next.sunAngle,blend));
    this.sunLight.position.set(Math.cos(sunA)*80, Math.sin(sunA)*80+10, 30);
    this.sunLight.intensity=Math.max(0, amb*1.2);
    this.sunLight.color.copy(lerpColor3(cur.skyColor, 0xffffff, 0.5));
    this.moonLight.intensity = phase==='NIGHT'?0.2 : phase==='DUSK'?0.08 : 0;
    this.ambientLight.intensity=amb*0.5; this._hemiLight.intensity=amb*0.3; this._hemiLight.color.copy(sky);
  }

  // --- Environmental effects ---
  _initDust() {
    const n=500, geo=new THREE.BufferGeometry(), pos=new Float32Array(n*3), vel=new Float32Array(n*3);
    for (let i=0;i<n;i++) { pos[i*3]=(Math.random()-0.5)*80; pos[i*3+1]=Math.random()*3; pos[i*3+2]=(Math.random()-0.5)*80;
      vel[i*3]=(Math.random()-0.5)*0.5; vel[i*3+1]=-0.1+Math.random()*0.05; vel[i*3+2]=(Math.random()-0.5)*0.5; }
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.userData.velocities=vel;
    this._dustParticles=new THREE.Points(geo, new THREE.PointsMaterial({
      color:0xaa9977,size:0.08,transparent:true,opacity:0.3,depthWrite:false,sizeAttenuation:true}));
    this.scene.add(this._dustParticles);
  }

  _initRain() {
    const n=3000, geo=new THREE.BufferGeometry(), pos=new Float32Array(n*3), vel=new Float32Array(n*3);
    for (let i=0;i<n;i++) { pos[i*3]=(Math.random()-0.5)*100; pos[i*3+1]=Math.random()*40; pos[i*3+2]=(Math.random()-0.5)*100;
      vel[i*3]=-0.5; vel[i*3+1]=-12-Math.random()*5; vel[i*3+2]=-0.3; }
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.userData.velocities=vel;
    this._rainParticles=new THREE.Points(geo, new THREE.PointsMaterial({
      color:0xaabbcc,size:0.04,transparent:true,opacity:0.4,depthWrite:false,sizeAttenuation:true}));
    this._rainParticles.visible=false; this.scene.add(this._rainParticles);
  }

  _initMuzzleFlash() {
    this._muzzleFlash=new THREE.PointLight(0xffaa44,0,8);
    this._muzzleFlash.castShadow=false; this.scene.add(this._muzzleFlash); this._muzzleFlashTimer=0;
  }

  triggerMuzzleFlash(position) {
    if (!this._muzzleFlash) return;
    this._muzzleFlash.position.set(position.x,position.y||1,position.z);
    this._muzzleFlash.intensity=3+Math.random()*2; this._muzzleFlashTimer=0.06;
  }

  setWeather(state) { this._weatherState=state; if(this._rainParticles) this._rainParticles.visible=(state==='rain'); }

  triggerExplosion(position, radius) {
    if (!this.is3D) return;
    this.bloodDecals.add({x:position.x,y:0.01,z:position.z},{x:0,y:1,z:0},radius*2);
    const last=this.bloodDecals._pool.find(s=>s.id===this.bloodDecals.nextId-1);
    if (last&&last.mesh.material) { last.mesh.material.color.setRGB(0.08,0.06,0.04); last.mesh.material.emissive.setHex(0x110800); }
    this.triggerMuzzleFlash(position); this._muzzleFlash.intensity=8; this._muzzleFlashTimer=0.15;
  }

  triggerBarricadeDestruction(position) {
    if (!this.is3D) return;
    for (let i=0;i<8;i++) this.bloodDecals.add(
      {x:position.x+(Math.random()-0.5)*0.8,y:0.01,z:(position.z||0)+(Math.random()-0.5)*0.8},{x:0,y:1,z:0},0.3+Math.random()*0.5);
  }

  _updateDust(dt) {
    if (!this._dustParticles) return;
    const p=this._dustParticles.geometry.attributes.position;
    const v=this._dustParticles.geometry.userData.velocities;
    this._dustParticles.material.opacity = Math.min(0.5, 0.1 + this.instanceCount * 0.00003);
    for (let i=0; i<p.count; i++) {
      p.array[i*3]+=v[i*3]*dt; p.array[i*3+1]+=v[i*3+1]*dt; p.array[i*3+2]+=v[i*3+2]*dt;
      if (p.array[i*3+1]<0) {
        p.array[i*3+1]=2+Math.random(); p.array[i*3]=(Math.random()-0.5)*80; p.array[i*3+2]=(Math.random()-0.5)*80;
      }
    }
    p.needsUpdate = true;
  }

  _updateRain(dt) {
    if (!this._rainParticles || !this._rainParticles.visible) return;
    const p=this._rainParticles.geometry.attributes.position;
    const v=this._rainParticles.geometry.userData.velocities;
    for (let i=0; i<p.count; i++) {
      p.array[i*3]+=v[i*3]*dt; p.array[i*3+1]+=v[i*3+1]*dt; p.array[i*3+2]+=v[i*3+2]*dt;
      if (p.array[i*3+1]<0) {
        p.array[i*3+1]=30+Math.random()*10; p.array[i*3]=(Math.random()-0.5)*100; p.array[i*3+2]=(Math.random()-0.5)*100;
      }
    }
    p.needsUpdate = true;
  }

  // --- Render hooks ---
  beforeRender(camera, deltaTime) {
    if (!this._initialized) return;
    const dt = deltaTime ?? 0.016;
    this.elapsedTime += dt;
    if (camera) this.camera = camera;
    if (this.is3D) {
      this.bloodDecals.update(dt);
      this.fireSystem.update(dt);
      this.fireSystem.updateBurning(dt, (id) => {
        const zs = this.game.zombies || window.zombies || [];
        const z = zs.find(z => (z.id ?? z.index) === id);
        return z ? { x:z.x||0, y:z.y||0, z:z.z||0 } : null;
      });
      this._updateFireSpread(dt, this.game.zombies || window.zombies);
      this._updateRagdolls(dt);
      this._updateDust(dt);
      this._updateRain(dt);
      if (this._muzzleFlashTimer > 0) {
        this._muzzleFlashTimer -= dt;
        if (this._muzzleFlashTimer <= 0) this._muzzleFlash.intensity = 0;
      }
    }
  }

  afterRender() { /* reserved for GPU readback / analytics */ }

  dispose() {
    const disposeMesh = (m) => {
      if (!m) return;
      m.geometry.dispose();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach(mt => mt.dispose());
      if (m.parent) m.parent.remove(m);
    };
    disposeMesh(this.instanceMesh);
    disposeMesh(this.lodGroups.medium);
    disposeMesh(this.lodGroups.billboard);
    disposeMesh(this.lodGroups.dot);
    this.bloodDecals.dispose();
    this.fireSystem.dispose();
    for (const r of this.ragdolls) if (r.mesh) disposeMesh(r.mesh);
    this.ragdolls.length = 0;
    [this.sunLight, this.moonLight, this.ambientLight, this._hemiLight].forEach(l => {
      if (l && l.parent) l.parent.remove(l);
    });
    disposeMesh(this._dustParticles);
    disposeMesh(this._rainParticles);
    if (this._muzzleFlash && this._muzzleFlash.parent) {
      this._muzzleFlash.parent.remove(this._muzzleFlash);
      this._muzzleFlash.dispose();
    }
    this._initialized = false;
  }
}
