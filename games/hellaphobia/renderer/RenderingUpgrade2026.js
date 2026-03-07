/**
 * Hellaphobia 2026 Rendering Upgrade
 * Path tracer integration, reality warping, SSS creatures, volumetric fog,
 * AI-driven lighting, and enhanced post-processing for the Hellaphobia engine.
 */
const MAX_LIGHTS = 64, MAX_FOG_VOLS = 32, MAX_SSS = 8;
const PT_SAMPLES = { LOW: 1, MED: 4, HIGH: 16 };
const WARP_TESS = 32;

const RENDER_MODE = Object.freeze({ RASTERIZED: 'rasterized', PATHTRACED: 'pathtraced', HYBRID: 'hybrid' });
const QUALITY = Object.freeze({ LOW: 0, MEDIUM: 1, HIGH: 2, ULTRA: 3 });
const WARP = Object.freeze({ BREATHING: 'breathing', TWISTING: 'twisting', MELTING: 'melting', FRAGMENTING: 'fragmenting' });

const SSS_PROFILES = {
    flesh:  { scatter: [0.8,0.15,0.05], density: 1.2 },
    ghost:  { scatter: [0.15,0.25,0.8], density: 0.4 },
    insect: { scatter: [0.1,0.6,0.15],  density: 1.8 },
    demon:  { scatter: [0.9,0.35,0.05], density: 1.5 },
};

const HORROR_LIGHT = {
    idle:      { dim: 1.0,  temp: 5500, flicker: 0 },
    tension:   { dim: 0.45, temp: 3200, flicker: 0.05 },
    jumpScare: { dim: 0,    temp: 2000, flicker: 1 },
    safe:      { dim: 0.9,  temp: 4500, flicker: 0 },
    chase:     { dim: 0.3,  temp: 2200, flicker: 0.8 },
};

const PHASE_FOG = {
    1:  { color:[0.1,0.1,0.1],    dens:0.15, h:1.5 },  2:  { color:[0.05,0.12,0.05], dens:0.25, h:2.0 },
    3:  { color:[0.15,0.02,0.02], dens:0.3,  h:1.8 },  4:  { color:[0.08,0,0.12],    dens:0.35, h:2.5 },
    5:  { color:[0.02,0.08,0.15], dens:0.2,  h:1.2 },  6:  { color:[0.12,0.1,0.02],  dens:0.18, h:1.6 },
    7:  { color:[0.18,0,0],       dens:0.4,  h:2.2 },  8:  { color:[0,0.12,0.12],     dens:0.22, h:1.4 },
    9:  { color:[0.1,0.05,0],     dens:0.28, h:2.0 },  10: { color:[0.15,0,0.15],     dens:0.45, h:3.0 },
    11: { color:[0,0,0.2],        dens:0.35, h:2.8 },  12: { color:[0.2,0.05,0],      dens:0.5,  h:2.5 },
    13: { color:[0.05,0.15,0],    dens:0.32, h:2.0 },  14: { color:[0.12,0,0.08],     dens:0.38, h:2.3 },
    15: { color:[0,0,0],          dens:0.55, h:3.5 },  16: { color:[0.2,0,0],         dens:0.6,  h:3.0 },
    17: { color:[0.08,0.08,0.15], dens:0.42, h:2.6 },  18: { color:[0.15,0.12,0],     dens:0.48, h:2.8 },
    19: { color:[0.1,0,0.2],      dens:0.52, h:3.2 },  20: { color:[0.05,0.05,0.05],  dens:0.65, h:4.0 },
    21: { color:[0.25,0,0.05],    dens:0.7,  h:4.5 },
};

const COLOR_GRADES = {
    default:   { bright:1.0,  con:1.0,  sat:1.0, tint:[1,1,1] },
    toxic:     { bright:0.85, con:1.2,  sat:0.8, tint:[0.8,1,0.7] },
    demonic:   { bright:0.8,  con:1.3,  sat:1.1, tint:[1.1,0.7,0.6] },
    frozen:    { bright:1.05, con:0.95, sat:0.6, tint:[0.8,0.9,1.2] },
    nightmare: { bright:0.7,  con:1.4,  sat:0.5, tint:[0.9,0.8,1.1] },
    decay:     { bright:0.75, con:1.1,  sat:0.7, tint:[1,0.9,0.7] },
    abyss:     { bright:0.6,  con:1.5,  sat:0.4, tint:[0.7,0.7,0.9] },
};

const lerp = (a,b,t) => a+(b-a)*t;
const clamp = (v,lo,hi) => Math.max(lo, Math.min(hi, v));
const clamp01 = v => clamp(v,0,1);
const smoothstep = (e0,e1,x) => { const t = clamp01((x-e0)/(e1-e0)); return t*t*(3-2*t); };
const lerpArr = (a,b,t) => a.map((v,i)=>lerp(v,b[i],t));
function colorTemp(k) {
    const t = k/100; let r,g,b;
    if (t<=66) { r=255; g=clamp(99.47*Math.log(t)-161.12,0,255); b=t<=19?0:clamp(138.52*Math.log(t-10)-305.04,0,255); }
    else { r=clamp(329.7*(t-60)**-0.133,0,255); g=clamp(288.12*(t-60)**-0.0755,0,255); b=255; }
    return [r/255, g/255, b/255];
}

export class HellaphobiaRenderUpgrade2026 {
    constructor(game) {
        this.game = game;
        this.ready = false;
        this.renderer = null; this.postProcess = null;
        this.phase4Effects = null; this.horrorAI = null;
        this.renderMode = RENDER_MODE.RASTERIZED;
        this.qualityLevel = QUALITY.MEDIUM;
        this.fearLevel = 0; this.currentPhase = 1; this.elapsed = 0;
        // Path tracer
        this.ptEnabled = false; this.ptBlend = 0; this.ptTarget = 0;
        this.ptSamples = PT_SAMPLES.MED; this.ptAccumBuf = null; this.ptFrames = 0;
        // Reality warping
        this.warpPattern = WARP.BREATHING; this.warpInt = 0; this.warpTarget = 0;
        this.warpMesh = null; this.warpTime = 0;
        // SSS creatures
        this.creatureProfiles = new Map(); this.sssBuf = null;
        // Volumetric fog
        this.fogCfg = { color:[0.1,0.1,0.1], dens:0.15, h:1.5 };
        this.fogTargetCfg = { ...this.fogCfg }; this.fogMod = 0;
        this.fogVolData = new Float32Array(MAX_FOG_VOLS * 8);
        // AI lighting
        this.lightState = { ...HORROR_LIGHT.idle }; this.lightTarget = { ...HORROR_LIGHT.idle };
        this.brokenLights = new Set(); this.lightSpeed = 1; this.strobePhase = 0; this.globalDim = 1;
        // Post-processing
        this.filmGrain = 0.04; this.lensDist = 0; this.motionBlur = 0;
        this.dofDist = 5; this.dofStr = 0;
        this.colorGrade = 'default';
        this.gradeBlend = { from: 'default', to: 'default', t: 1 };
    }

    async initialize() {
        this.renderer      = this.game.renderer || window.WebGPURenderer2026 || null;
        this.postProcess   = this.game.postProcess || window.PostProcessStack || null;
        this.phase4Effects = this.game.phase4Effects || window.Phase4Effects || null;
        this.horrorAI      = this.game.horrorDirector || window.EmotionalAI || null;
        if (!this.renderer) { console.warn('[HellaphobiaRenderUpgrade2026] No renderer – disabled'); return; }
        const dev = this.renderer.device;
        if (dev) { this._createSSSRes(dev); this._createFogRes(dev); this._createPTRes(dev); }
        this._buildWarpMesh(); this._registerCreatures();
        this.ready = true;
        console.log('🎨 [HellaphobiaRenderUpgrade2026] Initialized');
    }

    _createSSSRes(dev) {
        this.sssBuf = dev.createBuffer({ size: MAX_SSS*32, usage: GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST });
        this._uploadSSS(dev);
    }
    _uploadSSS(dev) {
        const data = new Float32Array(MAX_SSS*8); let i = 0;
        for (const [,p] of this.creatureProfiles) {
            if (i >= MAX_SSS) break; const o = i*8;
            data.set(p.scatter, o); data[o+3]=p.density; data[o+4]=p.backlit?1:0; data[o+5]=p.aniso||0;
            i++;
        }
        dev.queue.writeBuffer(this.sssBuf, 0, data);
    }
    _createFogRes(dev) {
        this.fogBuf = dev.createBuffer({ size: MAX_FOG_VOLS*32, usage: GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST });
    }
    _createPTRes(dev) {
        const w = this.renderer.config?.width||1280, h = this.renderer.config?.height||720;
        this.ptAccumBuf = dev.createBuffer({ size: w*h*16, usage: GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST });
    }

    _buildWarpMesh() {
        const s = WARP_TESS, verts = new Float32Array((s+1)*(s+1)*5);
        let vi = 0;
        for (let r=0; r<=s; r++) for (let c=0; c<=s; c++) {
            const u=c/s, v=r/s;
            verts[vi++]=u*2-1; verts[vi++]=v*2-1; verts[vi++]=0; verts[vi++]=u; verts[vi++]=v;
        }
        const idx = new Uint16Array(s*s*6); let ii=0;
        for (let r=0; r<s; r++) for (let c=0; c<s; c++) {
            const tl=r*(s+1)+c, tr=tl+1, bl=tl+s+1, br=bl+1;
            idx[ii++]=tl; idx[ii++]=bl; idx[ii++]=tr; idx[ii++]=tr; idx[ii++]=bl; idx[ii++]=br;
        }
        this.warpMesh = { verts, idx, seg: s };
    }

    _registerCreatures() {
        for (const [name, prof] of Object.entries(SSS_PROFILES))
            this.creatureProfiles.set(name, { ...prof, backlit: true, aniso: name==='insect'?0.6:0 });
    }

    // --- Render mode ---
    setRenderMode(mode) {
        if (!Object.values(RENDER_MODE).includes(mode)) return;
        this.renderMode = mode;
        this.ptTarget = mode === RENDER_MODE.PATHTRACED ? 1 : mode === RENDER_MODE.HYBRID ? 0.5 : 0;
        if (this.ptTarget > 0) this.ptFrames = 0;
        console.log(`[HellaphobiaRenderUpgrade2026] Mode → ${mode}`);
    }

    // --- Fear level ---
    setFearLevel(level) {
        this.fearLevel = clamp01(level);
        this.filmGrain = lerp(0.03, 0.18, this.fearLevel);
        this.lensDist = lerp(0, 0.15, smoothstep(0.4, 1, this.fearLevel));
        this.warpTarget = lerp(0, 1, smoothstep(0.3, 0.9, this.fearLevel));
        this.warpPattern = this.fearLevel < 0.3 ? WARP.BREATHING
            : this.fearLevel < 0.55 ? WARP.TWISTING
            : this.fearLevel < 0.8 ? WARP.MELTING : WARP.FRAGMENTING;
        if (this.phase4Effects) {
            const e = this.phase4Effects.effects;
            e.filmGrain.intensity = this.filmGrain;
            e.distortion = this.lensDist;
            e.chromaticAberration = lerp(0, 0.008, this.fearLevel);
            e.tunnelVision.active = this.fearLevel > 0.6;
            e.tunnelVision.radius = lerp(1, 0.5, smoothstep(0.6, 1, this.fearLevel));
        }
    }

    // --- Phase change ---
    onPhaseChange(phaseNumber) {
        this.currentPhase = clamp(phaseNumber, 1, 21);
        const cfg = PHASE_FOG[this.currentPhase] || PHASE_FOG[1];
        this.fogTargetCfg = { color:[...cfg.color], dens:cfg.dens, h:cfg.h };
        this.colorGrade = phaseNumber<=3?'default': phaseNumber<=6?'decay': phaseNumber<=9?'toxic':
            phaseNumber<=12?'demonic': phaseNumber<=15?'frozen': phaseNumber<=18?'nightmare':'abyss';
        this.gradeBlend = { from: this.gradeBlend.to, to: this.colorGrade, t: 0 };
        console.log(`[HellaphobiaRenderUpgrade2026] Phase ${phaseNumber}`);
    }

    // --- Horror events ---
    onHorrorEvent(eventType, params = {}) {
        switch (eventType) {
            case 'tension_buildup':
                this.lightTarget = { ...HORROR_LIGHT.tension }; this.lightSpeed = params.speed||0.3; break;
            case 'jump_scare':
                this.lightState = { dim:0, temp:2000, flicker:1 };
                this.lightTarget = { ...HORROR_LIGHT.idle }; this.lightSpeed = 3;
                if (this.phase4Effects) {
                    const e = this.phase4Effects.effects;
                    e.flash = { active:true, color:'#ff0000', duration:0.25, alpha:1 };
                    e.screenShake = { active:true, intensity:0.9, duration:0.4, offsetX:0, offsetY:0 };
                }
                break;
            case 'safe_room':
                this.lightTarget = { ...HORROR_LIGHT.safe }; this.lightSpeed = 0.5; this.fogMod = -0.15; break;
            case 'chase_start':
                this.lightTarget = { ...HORROR_LIGHT.chase }; this.lightSpeed = 5; this.motionBlur = 0.5; break;
            case 'chase_end':
                this.lightTarget = { ...HORROR_LIGHT.idle }; this.lightSpeed = 1; this.motionBlur = 0; break;
            case 'light_break':
                if (params.lightId != null) this.brokenLights.add(params.lightId); break;
            case 'player_attack': this.fogMod = -0.25; break;
            case 'player_damaged':
                this.fogMod = 0.15;
                if (this.phase4Effects)
                    this.phase4Effects.effects.flash = { active:true, color:'#880000', duration:0.15, alpha:0.6 };
                break;
            case 'cutscene_start':
                this.dofStr = params.dofStrength||0.5; this.dofDist = params.focusDist||5; break;
            case 'cutscene_end': this.dofStr = 0; break;
        }
    }

    // --- Quality ---
    setQuality(level) {
        this.qualityLevel = clamp(level, QUALITY.LOW, QUALITY.ULTRA);
        this.ptSamples = this.qualityLevel <= QUALITY.LOW ? PT_SAMPLES.LOW
            : this.qualityLevel === QUALITY.MEDIUM ? PT_SAMPLES.MED : PT_SAMPLES.HIGH;
    }

    // --- Frame lifecycle ---
    beforeRender(camera, deltaTime) {
        if (!this.ready) return;
        this.elapsed += deltaTime;

        this._updatePT(deltaTime);
        this._updateWarp(deltaTime);
        this._updateFog(deltaTime);
        this._updateLighting(deltaTime);
        this._updatePost(deltaTime);
        this._updateGrade(deltaTime);

        // Push warp displacement to geometry
        if (this.renderer && this.warpInt > 0.001) {
            this._applyWarp(camera);
        }

        // Upload fog volumes and SSS data to GPU each frame
        const dev = this.renderer?.device;
        if (dev && this.fogBuf) {
            dev.queue.writeBuffer(this.fogBuf, 0, this.fogVolData);
        }
        if (dev && this.sssBuf) {
            this._uploadSSS(dev);
        }
    }

    afterRender() {
        if (!this.ready) return;
        // Increment accumulation frame counter while path tracing is active
        if (this.ptBlend > 0.01) {
            this.ptFrames++;
        }
    }

    // --- Path tracer ---
    _updatePT(dt) {
        this.ptBlend = lerp(this.ptBlend, this.ptTarget, clamp01(dt*2));
        this.ptEnabled = this.ptBlend >= 0.01;
        if (!this.ptEnabled) return;
        const entities = this.game.entities || [];
        this._ptScene = entities.filter(e => e.visible !== false).map(e => ({
            type: e.sprite ? 'sprite' : 'mesh',
            pos: e.position || { x:0, y:0, z:0 },
            bounds: e.bounds || { w:1, h:1 },
            mat: this._entMat(e),
            emissive: e.emissive || [0,0,0],
        }));
    }

    _entMat(ent) {
        const prof = this.creatureProfiles.get(ent.creatureType);
        return {
            albedo: ent.color || [0.5,0.5,0.5],
            rough: prof ? 0.6 : (ent.roughness||0.8),
            metal: prof ? 0 : (ent.metallic||0),
            sss: prof || null,
        };
    }

    // --- Reality warping ---
    _updateWarp(dt) {
        this.warpInt = lerp(this.warpInt, this.warpTarget, clamp01(dt*1.5));
        this.warpTime += dt;
    }

    _applyWarp(camera) {
        if (!this.warpMesh) return;
        const s = this.warpMesh.seg, v = this.warpMesh.verts, I = this.warpInt, t = this.warpTime;
        for (let r=0; r<=s; r++) for (let c=0; c<=s; c++) {
            const idx = (r*(s+1)+c)*5, u = v[idx+3], vv = v[idx+4];
            let dz = 0;
            switch (this.warpPattern) {
                case WARP.BREATHING:
                    dz = Math.sin(t*1.5)*0.08*I + Math.sin(u*3.14+t)*0.03*I; break;
                case WARP.TWISTING: {
                    const ang = t*0.8*I, cx = u-0.5, cy = vv-0.5;
                    const d = Math.sqrt(cx*cx+cy*cy), tw = ang*(1-d);
                    const cosT = Math.cos(tw), sinT = Math.sin(tw);
                    v[idx] = (cx*cosT-cy*sinT)*2; v[idx+1] = (cx*sinT+cy*cosT)*2;
                    dz = d*0.1*I*Math.sin(t*2); break;
                }
                case WARP.MELTING:
                    dz = -vv*vv*I*0.2*(1+Math.sin(t+u*5)*0.3);
                    v[idx+1] = (vv*2-1)+vv*vv*I*0.3*Math.sin(t*0.7+u*4); break;
                case WARP.FRAGMENTING: {
                    const cX = (u*8)|0, cY = (vv*8)|0;
                    const seed = Math.sin(cX*127.1+cY*311.7)*43758.5453;
                    const j = seed - Math.floor(seed), ex = smoothstep(0.6,1,I);
                    dz = (j-0.5)*ex*0.4*(1+Math.sin(t*3+j*10)*0.5); break;
                }
            }
            v[idx+2] = dz;
        }
    }

    // --- SSS creatures ---
    registerCreature(id, type) {
        const p = SSS_PROFILES[type];
        if (p) this.creatureProfiles.set(id, { ...p, backlit:true, aniso:type==='insect'?0.6:0 });
    }

    computeSSSContribution(entity, lightDir) {
        const prof = this.creatureProfiles.get(entity.creatureType);
        if (!prof) return [0,0,0];
        const n = entity.normal || { x:0, y:0, z:1 };
        const ndotl = -(lightDir.x*n.x + lightDir.y*n.y + lightDir.z*n.z);
        const trans = clamp01(-ndotl);
        const backlit = prof.backlit ? trans*trans : 0;
        return prof.scatter.map(s => s*(0.3+backlit*0.7)/prof.density);
    }

    // --- Volumetric fog ---
    _updateFog(dt) {
        this.fogCfg.dens = lerp(this.fogCfg.dens, clamp01(this.fogTargetCfg.dens+this.fogMod), clamp01(dt*0.8));
        this.fogCfg.h = lerp(this.fogCfg.h, this.fogTargetCfg.h, dt*0.5);
        for (let i=0; i<3; i++) this.fogCfg.color[i] = lerp(this.fogCfg.color[i], this.fogTargetCfg.color[i], dt*0.6);
        this.fogMod *= 0.92 ** (dt*60);
        const rooms = this.game.rooms || [{ x:0, y:0, w:20, h:15 }];
        const cnt = Math.min(rooms.length, MAX_FOG_VOLS);
        for (let i=0; i<cnt; i++) {
            const rm = rooms[i], o = i*8;
            this.fogVolData[o]=rm.x||0; this.fogVolData[o+1]=rm.y||0;
            this.fogVolData[o+2]=rm.w||20; this.fogVolData[o+3]=rm.h||15;
            this.fogVolData.set(this.fogCfg.color, o+4); this.fogVolData[o+7]=this.fogCfg.dens;
        }
    }

    // --- AI-driven lighting ---
    _updateLighting(dt) {
        const sp = this.lightSpeed*dt;
        this.lightState.dim = lerp(this.lightState.dim, this.lightTarget.dim, clamp01(sp));
        this.lightState.temp = lerp(this.lightState.temp, this.lightTarget.temp, clamp01(sp));
        this.lightState.flicker = lerp(this.lightState.flicker, this.lightTarget.flicker, clamp01(sp*2));
        this.globalDim = this.lightState.dim;
        if (this.lightState.flicker > 0.01) {
            this.strobePhase += dt*12;
            this.globalDim *= lerp(1, Math.sin(this.strobePhase)>0?1:0.1, this.lightState.flicker);
        }
        if (!this.renderer) return;
        const lc = colorTemp(this.lightState.temp);
        const lights = this.renderer.lights || this.game.lights || [];
        for (const l of lights) {
            if (this.brokenLights.has(l.id)) { l.intensity = 0; continue; }
            l.color = lc.map(c => c*this.globalDim);
            if (l._baseInt == null) l._baseInt = l.intensity || 1;
            l.intensity = l._baseInt * this.globalDim;
        }
    }

    // --- Enhanced post-processing ---
    _updatePost(dt) {
        if (!this.postProcess) return;
        const e = this.postProcess.effects;
        if (e?.filmGrain) { e.filmGrain.intensity = this.filmGrain; e.filmGrain.enabled = this.filmGrain > 0.02; }
        if (e?.distortion != null) {
            if (typeof e.distortion === 'object') { e.distortion.enabled = this.lensDist > 0.005; e.distortion.intensity = this.lensDist; }
            else { e.distortion = this.lensDist; }
        }
        if (e?.chromaticAberration) e.chromaticAberration.intensity = lerp(0.001, 0.01, this.fearLevel);
        if (this.postProcess.setDepthOfField) this.postProcess.setDepthOfField(this.dofDist, this.dofStr);
        else if (e) e.depthOfField = { enabled: this.dofStr>0.01, focusDistance: this.dofDist, strength: this.dofStr };
        if (e?.radialBlur) { e.radialBlur.enabled = this.motionBlur > 0.01; e.radialBlur.intensity = this.motionBlur; }
        if (e?.vignette) e.vignette.intensity = lerp(0.3, 0.7, this.fearLevel);
    }

    _updateGrade(dt) {
        const e = this.postProcess?.effects?.colorGrading; if (!e) return;
        const b = this.gradeBlend; b.t = clamp01(b.t + dt*0.5);
        const from = COLOR_GRADES[b.from] || COLOR_GRADES.default;
        const to = COLOR_GRADES[b.to] || COLOR_GRADES.default;
        e.brightness = lerp(from.bright, to.bright, b.t);
        e.contrast   = lerp(from.con, to.con, b.t);
        e.saturation = lerp(from.sat, to.sat, b.t);
        if (e.tint) e.tint = lerpArr(from.tint, to.tint, b.t);
    }

    // --- Cleanup ---
    dispose() {
        this.ready = false;
        this.ptAccumBuf?.destroy(); this.sssBuf?.destroy(); this.fogBuf?.destroy();
        this.creatureProfiles.clear(); this.brokenLights.clear();
        this.warpMesh = null; this._ptScene = null;
        console.log('🎨 [HellaphobiaRenderUpgrade2026] Disposed');
    }
}
