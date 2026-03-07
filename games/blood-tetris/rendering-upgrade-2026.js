/**
 * Blood Tetris 2026 Rendering Upgrade
 * 3D tetrominoes, blood splatter accumulation, volumetric fog,
 * wet-surface reflections, pulsing emissive veins, and chromatic aberration.
 */
const COLS = 10, ROWS = 20, CELL = 32;
const HEARTBEAT_PERIOD = 60 / 72;
const MAX_SPLATTERS = 512, MAX_DRIPS = 2048, MAX_FOG = 256;
const BEVEL = 0.08, BLOCK_DEPTH = 0.6;

const MATERIALS = {
    blood:  { base: [0.45,0.02,0.02,1], rough: 0.35, metal: 0, sssR: [0.8,0.15,0.05], sss: 0.6, spec: 0.9, emit: [0,0,0], vein: [0.9,0.1,0.05] },
    bone:   { base: [0.85,0.82,0.75,1], rough: 0.55, metal: 0, sssR: [0.6,0.4,0.3],   sss: 0.45, spec: 0.5, emit: [0,0,0], vein: [1,1,0.95] },
    cursed: { base: [0.18,0.02,0.28,1], rough: 0.25, metal: 0.3, sssR: [0.3,0.1,0.5], sss: 0.3, spec: 1, emit: [0.35,0,0.55], vein: [0.2,0.9,0.15] },
};

const BLOOD_FLOW_WGSL = /* wgsl */ `
struct Drip { pos: vec2f, vel: vec2f, life: f32, size: f32 };
struct Params { dt: f32, gravity: f32, viscosity: f32, count: u32 };
@group(0) @binding(0) var<storage, read_write> drips: array<Drip>;
@group(0) @binding(1) var<uniform> params: Params;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
    let i = gid.x;
    if (i >= params.count) { return; }
    var d = drips[i];
    if (d.life <= 0.0) { return; }
    d.vel.y += params.gravity * params.dt;
    d.vel *= (1.0 - params.viscosity * params.dt);
    d.pos += d.vel * params.dt;
    d.life -= params.dt;
    d.size *= (1.0 - 0.15 * params.dt);
    drips[i] = d;
}`;

const POST_WGSL = /* wgsl */ `
struct U { res: vec2f, aberr: f32, shakeOff: vec2f, vig: f32, time: f32, speed: f32 };
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> u: U;
@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let c = uv + u.shakeOff / u.res;
    let r = textureSample(src, samp, c + vec2f(u.aberr, 0.0)).r;
    let g = textureSample(src, samp, c).g;
    let b = textureSample(src, samp, c - vec2f(u.aberr, 0.0)).b;
    var col = vec3f(r, g, b);
    let ctr = c - 0.5;
    col *= clamp(1.0 - dot(ctr, ctr) * u.vig, 0.0, 1.0);
    if (u.speed > 0.0) {
        let a = atan2(ctr.y, ctr.x);
        col = mix(col, vec3f(1.0,0.85,0.85), step(0.97, fract(a*12.0+u.time*3.0)) * length(ctr) * u.speed * 0.3);
    }
    return vec4f(col, 1.0);
}`;

function voronoi2D(px, py, seeds) {
    let m1 = Infinity, m2 = Infinity;
    for (let i = 0; i < seeds.length; i += 2) {
        const d = (px - seeds[i]) ** 2 + (py - seeds[i+1]) ** 2;
        if (d < m1) { m2 = m1; m1 = d; } else if (d < m2) { m2 = d; }
    }
    return Math.sqrt(m2) - Math.sqrt(m1);
}
function voronoiSeeds(n) { const s = new Float32Array(n*2); for (let i = 0; i < s.length; i++) s[i] = Math.random(); return s; }
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => Math.max(0, Math.min(1, v));
const smoothstep = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

export class BloodTetrisRenderUpgrade2026 {
    constructor(game) {
        this.game = game;
        this.canvas = null; this.device = null; this.context = null;
        this.format = 'bgra8unorm'; this.ready = false;
        this.intensity = 0; this.elapsed = 0; this.hbPhase = 0;
        this.camAngle = 18 * Math.PI / 180;
        this.projMat = new Float32Array(16); this.viewMat = new Float32Array(16);
        this.splatters = []; this.bloodAccum = new Float32Array(COLS * ROWS);
        this.voronoiS = voronoiSeeds(24); this.poolLevel = 0;
        this.drips = new Float32Array(MAX_DRIPS * 6); this.dripCount = 0;
        this.dripBuf = null; this.dripParamsBuf = null; this.flowPipe = null;
        this.fogParts = []; this.fogDensity = 0.15; this.fogColor = [0.35, 0.02, 0.02];
        this.veinPhase = 0; this.veinMap = new Float32Array(COLS * ROWS);
        this.veinConns = new Map();
        this.chromAberr = 0; this.shake = { x: 0, y: 0, decay: 0 };
        this.flashAlpha = 0; this.speedLines = 0;
        this.postPipe = null; this.uniformBuf = null; this.renderTex = null; this.depthTex = null;
    }

    async initialize() {
        this.canvas = this.game.canvas || document.getElementById('game-canvas');
        if (!this.canvas) throw new Error('[BloodTetrisRenderUpgrade2026] No canvas');
        const adapter = await navigator.gpu?.requestAdapter();
        if (!adapter) { console.warn('[BloodTetrisRenderUpgrade2026] WebGPU unavailable'); return; }
        this.device = await adapter.requestDevice();
        this.context = this.canvas.getContext('webgpu');
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({ device: this.device, format: this.format, alphaMode: 'premultiplied' });
        this._createGPUResources();
        await this._createFlowPipeline();
        this._initFog();
        this._buildProjection();
        this.ready = true;
        console.log('[BloodTetrisRenderUpgrade2026] Initialized');
    }

    _createGPUResources() {
        const { width: w, height: h } = this.canvas;
        this.depthTex = this.device.createTexture({ size: [w, h], format: 'depth24plus', usage: GPUTextureUsage.RENDER_ATTACHMENT });
        this.renderTex = this.device.createTexture({ size: [w, h], format: this.format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
        this.uniformBuf = this.device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    }

    async _createFlowPipeline() {
        this.dripBuf = this.device.createBuffer({ size: MAX_DRIPS * 24, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.dripParamsBuf = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        const mod = this.device.createShaderModule({ code: BLOOD_FLOW_WGSL });
        const bgl = this.device.createBindGroupLayout({ entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        ]});
        this.flowPipe = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
            compute: { module: mod, entryPoint: 'main' },
        });
        this.flowBG = this.device.createBindGroup({ layout: bgl, entries: [
            { binding: 0, resource: { buffer: this.dripBuf } },
            { binding: 1, resource: { buffer: this.dripParamsBuf } },
        ]});
    }

    _buildProjection() {
        const asp = this.canvas.width / this.canvas.height, f = 1 / Math.tan(Math.PI / 8), n = 0.1, fa = 100;
        const m = this.projMat; m.fill(0);
        m[0] = f/asp; m[5] = f; m[10] = (fa+n)/(n-fa); m[11] = -1; m[14] = 2*fa*n/(n-fa);
        const v = this.viewMat; v.fill(0);
        const c = Math.cos(this.camAngle), s = Math.sin(this.camAngle);
        v[0]=1; v[5]=c; v[6]=s; v[9]=-s; v[10]=c; v[13]=-12; v[14]=-18; v[15]=1;
    }

    _initFog() {
        this.fogParts = Array.from({ length: MAX_FOG }, () => ({
            x: Math.random()*COLS*CELL, y: ROWS*CELL + Math.random()*60,
            vx: (Math.random()-0.5)*8, vy: -(Math.random()*15+5),
            sz: Math.random()*12+4, a: Math.random()*0.3, life: Math.random()*4+2,
        }));
    }

    // --- 3D Tetromino Rendering ---
    renderTetromino3D(piece, position, rotation) {
        if (!this.ready) return;
        const type = piece.cursed ? 'cursed' : piece.bone ? 'bone' : 'blood';
        const mat = MATERIALS[type];
        const shape = this._rotate(piece.shape, rotation);
        const blocks = [];
        for (let r = 0; r < shape.length; r++)
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const wx = (position.x+c)*CELL, wy = (position.y+r)*CELL;
                const vi = this._sampleVein(wx, wy), hb = this._heartbeat();
                const emS = type === 'cursed' ? 0.5+0.5*Math.sin(this.elapsed*2.5) : 1;
                blocks.push({ x:wx, y:wy, d:BLOCK_DEPTH*CELL, bv:BEVEL*CELL,
                    base:mat.base, rough:mat.rough, metal:mat.metal,
                    sssR:mat.sssR, sss:mat.sss, spec:mat.spec,
                    emit:mat.emit.map(e=>e*emS), vi:vi*hb, vc:mat.vein, cc:0.8 });
            }
        this._submitBlocks(blocks);
        return blocks;
    }

    _rotate(shape, rot) {
        let s = shape.map(r => [...r]);
        for (let t = 0; t < ((rot%4)+4)%4; t++) {
            const rows = s.length, cols = s[0].length;
            const n = Array.from({length:cols}, ()=>new Array(rows));
            for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) n[c][rows-1-r]=s[r][c];
            s = n;
        }
        return s;
    }

    _submitBlocks(blocks) {
        if (!blocks.length) return;
        const data = new Float32Array(blocks.length * 16);
        blocks.forEach((b, i) => {
            const o = i*16;
            data[o]=b.x; data[o+1]=b.y; data[o+2]=b.d; data[o+3]=b.bv;
            data.set(b.base, o+4); data[o+8]=b.rough; data[o+9]=b.metal;
            data[o+10]=b.sss; data[o+11]=b.spec; data[o+12]=b.vi;
            data.set(b.vc, o+13);
        });
        this.device.queue.writeBuffer(this.uniformBuf, 0, data.buffer, 0, Math.min(data.byteLength, 256));
    }

    // --- Blood Splatter Accumulation ---
    addBloodSplatter(lineY, intensity) {
        const seeds = voronoiSeeds(6 + (intensity*10|0));
        const bx = COLS*CELL*0.5, by = lineY*CELL, sv = intensity*200;
        for (let i = 0; i < seeds.length; i += 2) {
            const ang = seeds[i]*Math.PI*2, spd = seeds[i+1]*sv+30;
            if (this.splatters.length >= MAX_SPLATTERS) this.splatters.shift();
            this.splatters.push({ x: bx+Math.cos(ang)*spd*0.1, y: by+Math.sin(ang)*spd*0.1,
                vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd-80,
                r: 3+Math.random()*8*intensity, life: 1, settled: false });
        }
        const nDrips = 8 + (intensity*24|0);
        for (let d = 0; d < nDrips && this.dripCount < MAX_DRIPS; d++) {
            const idx = this.dripCount*6;
            this.drips[idx]=Math.random()*COLS*CELL; this.drips[idx+1]=by;
            this.drips[idx+2]=(Math.random()-0.5)*20; this.drips[idx+3]=10+Math.random()*40;
            this.drips[idx+4]=1.5+Math.random()*2.5; this.drips[idx+5]=1+Math.random()*2;
            this.dripCount++;
        }
        for (let c = 0; c < COLS; c++) {
            const dist = Math.abs(c-COLS/2)/(COLS/2);
            const sp = voronoi2D(c/COLS, lineY/ROWS, this.voronoiS);
            const amt = intensity*(1-dist*0.6)*(0.5+sp*0.5);
            const idx = lineY*COLS+c;
            if (idx >= 0 && idx < this.bloodAccum.length) this.bloodAccum[idx] = clamp01(this.bloodAccum[idx]+amt*0.3);
        }
        this.poolLevel = clamp01(this.poolLevel + intensity*0.05);
    }

    updateBloodFlow(deltaTime) {
        for (let i = this.splatters.length-1; i >= 0; i--) {
            const s = this.splatters[i]; if (s.settled) continue;
            s.vy += 400*deltaTime; s.x += s.vx*deltaTime; s.y += s.vy*deltaTime;
            s.vx *= (1-2*deltaTime); s.life -= deltaTime*0.4;
            if (s.y >= ROWS*CELL || s.life <= 0) { s.settled = true; s.y = Math.min(s.y, ROWS*CELL); }
        }
        if (this.ready && this.dripCount > 0) {
            this.device.queue.writeBuffer(this.dripParamsBuf, 0, new Float32Array([deltaTime, 120, 3.5, this.dripCount]));
            this.device.queue.writeBuffer(this.dripBuf, 0, this.drips);
            const enc = this.device.createCommandEncoder();
            const pass = enc.beginComputePass();
            pass.setPipeline(this.flowPipe); pass.setBindGroup(0, this.flowBG);
            pass.dispatchWorkgroups(Math.ceil(this.dripCount/64)); pass.end();
            this.device.queue.submit([enc.finish()]);
        }
        for (let row = ROWS-2; row >= 0; row--)
            for (let col = 0; col < COLS; col++) {
                const s = row*COLS+col, d = (row+1)*COLS+col;
                const f = this.bloodAccum[s]*0.02*deltaTime;
                this.bloodAccum[d] = clamp01(this.bloodAccum[d]+f);
                this.bloodAccum[s] = clamp01(this.bloodAccum[s]-f*0.5);
            }
    }

    // --- Volumetric Blood Fog ---
    _updateFog(dt) {
        this.fogDensity = lerp(0.1, 0.6, this.intensity);
        const wx = Math.sin(this.elapsed*0.3)*5;
        for (const p of this.fogParts) {
            p.vy = -(5+this.intensity*15); p.x += (p.vx+wx)*dt; p.y += p.vy*dt; p.life -= dt;
            p.a = clamp01(this.fogDensity*0.4*smoothstep(0, 1, p.life));
            if (p.life <= 0 || p.y < -20) {
                p.x = Math.random()*COLS*CELL; p.y = ROWS*CELL+Math.random()*40;
                p.vx = (Math.random()-0.5)*8; p.vy = -(Math.random()*15+5);
                p.sz = Math.random()*12+4; p.a = 0; p.life = Math.random()*4+2;
            }
        }
    }

    _renderFog(ctx) {
        const [fr,fg,fb] = this.fogColor.map(c => c*255|0);
        ctx.save();
        const g = ctx.createLinearGradient(0, this.canvas.height*0.7, 0, this.canvas.height);
        g.addColorStop(0, `rgba(${fr},${fg},${fb},0)`);
        g.addColorStop(1, `rgba(${fr},${fg},${fb},${this.fogDensity*0.35})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.globalCompositeOperation = 'screen';
        for (const p of this.fogParts) {
            if (p.a < 0.01) continue;
            const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.sz);
            rg.addColorStop(0, `rgba(${fr},${fg},${fb},${p.a})`);
            rg.addColorStop(1, `rgba(${fr},${fg},${fb},0)`);
            ctx.fillStyle = rg; ctx.fillRect(p.x-p.sz, p.y-p.sz, p.sz*2, p.sz*2);
        }
        ctx.restore();
    }

    // --- Ray-Traced Board Reflections ---
    _renderReflections(ctx, board) {
        if (!board) return;
        ctx.save(); ctx.globalAlpha = 0.25; ctx.scale(1, -0.35);
        ctx.translate(0, -this.canvas.height * 2.35);
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const cell = board[r]?.[c]; if (!cell) continue;
            ctx.fillStyle = cell.color || '#cc2222';
            ctx.globalAlpha = Math.max(0, 0.18-r*0.006);
            ctx.fillRect(c*CELL+1, r*CELL+1, CELL-2, CELL-2);
        }
        ctx.restore();
        // Wet clearcoat & metallic walls
        ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, COLS*CELL, ROWS*CELL); ctx.restore();
        ctx.save(); ctx.globalAlpha = 0.12;
        const wg = ctx.createLinearGradient(0,0,0,this.canvas.height);
        wg.addColorStop(0,'#444'); wg.addColorStop(0.5,'#666'); wg.addColorStop(1,'#333');
        ctx.fillStyle = wg;
        ctx.fillRect(-4, 0, 4, this.canvas.height);
        ctx.fillRect(COLS*CELL, 0, 4, this.canvas.height);
        ctx.restore();
    }

    _renderGhostReflection(ctx, ghost, pos) {
        if (!ghost?.shape || !pos) return;
        ctx.save(); ctx.globalAlpha = 0.06; ctx.scale(1,-0.3);
        ctx.translate(0, -this.canvas.height*2.5);
        for (let r = 0; r < ghost.shape.length; r++)
            for (let c = 0; c < (ghost.shape[r]?.length||0); c++) {
                if (!ghost.shape[r][c]) continue;
                ctx.fillStyle = '#ff4444';
                ctx.fillRect((pos.x+c)*CELL+2, (pos.y+r)*CELL+2, CELL-4, CELL-4);
            }
        ctx.restore();
    }

    // --- Pulsing Emissive Veins ---
    updateVeins(deltaTime) {
        this.veinPhase += deltaTime; this.hbPhase += deltaTime;
        const stackH = this._stackHeight(), danger = clamp01(stackH/ROWS), hb = this._heartbeat();
        this.veinConns.clear();
        const board = this.game.board; if (!board) return;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const cell = board[r]?.[c]; const idx = r*COLS+c;
            if (!cell) { this.veinMap[idx] = 0; continue; }
            const noise = Math.sin(c*3.7+r*2.3+this.veinPhase*1.5)*0.5+0.5;
            const base = 0.2+danger*0.6, pulse = hb*(0.3+danger*0.7);
            this.veinMap[idx] = clamp01(base*noise+pulse*0.5);
            const conns = [];
            const same = (a,b) => a && b && (a.type||a.color)===(b.type||b.color);
            if (c>0 && same(cell, board[r][c-1])) conns.push('l');
            if (c<COLS-1 && same(cell, board[r][c+1])) conns.push('r');
            if (r>0 && same(cell, board[r-1]?.[c])) conns.push('u');
            if (r<ROWS-1 && same(cell, board[r+1]?.[c])) conns.push('d');
            if (conns.length) this.veinConns.set(`${c},${r}`, conns);
        }
    }

    _heartbeat() {
        const t = (this.hbPhase % HEARTBEAT_PERIOD) / HEARTBEAT_PERIOD;
        return clamp01(Math.exp(-((t-0.15)**2)/0.002) + Math.exp(-((t-0.3)**2)/0.005)*0.6);
    }
    _sampleVein(x, y) {
        const c = x/CELL|0, r = y/CELL|0;
        return (c>=0 && c<COLS && r>=0 && r<ROWS) ? this.veinMap[r*COLS+c] : 0;
    }
    _stackHeight() {
        const b = this.game.board; if (!b) return 0;
        for (let r=0; r<ROWS; r++) for (let c=0; c<COLS; c++) if (b[r]?.[c]) return ROWS-r;
        return 0;
    }

    _renderVeins(ctx) {
        const board = this.game.board; if (!board) return;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const cell = board[r]?.[c]; if (!cell) continue;
            const vi = this.veinMap[r*COLS+c]; if (vi < 0.05) continue;
            const type = cell.cursed ? 'cursed' : cell.bone ? 'bone' : 'blood';
            const [vr,vg,vb] = MATERIALS[type].vein.map(v=>v*255|0);
            const cx = c*CELL+CELL/2, cy = r*CELL+CELL/2;
            const gr = ctx.createRadialGradient(cx,cy,0,cx,cy,CELL*0.45);
            gr.addColorStop(0, `rgba(${vr},${vg},${vb},${vi*0.6})`);
            gr.addColorStop(0.6, `rgba(${vr},${vg},${vb},${vi*0.2})`);
            gr.addColorStop(1, `rgba(${vr},${vg},${vb},0)`);
            ctx.fillStyle = gr; ctx.fillRect(c*CELL, r*CELL, CELL, CELL);
            const conns = this.veinConns.get(`${c},${r}`);
            if (conns) {
                ctx.strokeStyle = `rgba(${vr},${vg},${vb},${vi*0.5})`; ctx.lineWidth = 1.5+vi*2;
                for (const d of conns) {
                    ctx.beginPath(); ctx.moveTo(cx, cy);
                    if (d==='l') ctx.lineTo(cx-CELL,cy); if (d==='r') ctx.lineTo(cx+CELL,cy);
                    if (d==='u') ctx.lineTo(cx,cy-CELL);  if (d==='d') ctx.lineTo(cx,cy+CELL);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    // --- Chromatic Aberration & Post-processing ---
    _updatePost(dt) {
        this.chromAberr *= 0.92 ** (dt*60);
        this.flashAlpha *= 0.88 ** (dt*60);
        this.speedLines *= 0.94 ** (dt*60);
        if (this.shake.decay > 0) {
            this.shake.decay -= dt;
            const m = this.shake.decay*10;
            this.shake.x = (Math.random()-0.5)*m; this.shake.y = (Math.random()-0.5)*m;
        } else { this.shake.x = 0; this.shake.y = 0; }
        this.speedLines = clamp01(lerp(this.speedLines, this.intensity > 0.7 ? 0.8 : 0, dt*2));
    }

    triggerLineClear(count, combo) {
        const inten = clamp01(count/4);
        this.chromAberr = clamp01(this.chromAberr + 0.003*combo);
        this.shake.decay = 0.15 + inten*0.25;
        if (count >= 4) { this.flashAlpha = 0.9; this.chromAberr = clamp01(this.chromAberr + 0.012); }
    }

    _applyPost(ctx) {
        if (this.chromAberr > 0.0005) {
            const off = this.chromAberr * this.canvas.width;
            ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.5;
            ctx.drawImage(this.canvas, off, 0); ctx.drawImage(this.canvas, -off, 0); ctx.restore();
        }
        if (this.flashAlpha > 0.01) {
            ctx.save(); ctx.globalAlpha = this.flashAlpha; ctx.fillStyle = '#ff2200';
            ctx.fillRect(0,0,this.canvas.width,this.canvas.height); ctx.restore();
        }
        if (this.shake.x||this.shake.y) ctx.translate(this.shake.x, this.shake.y);
    }

    _renderBloodAccum(ctx) {
        ctx.save(); ctx.globalCompositeOperation = 'multiply';
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const v = this.bloodAccum[r*COLS+c]; if (v < 0.01) continue;
            ctx.globalAlpha = v*0.6; ctx.fillStyle = '#440000';
            ctx.fillRect(c*CELL, r*CELL, CELL, CELL);
        }
        if (this.poolLevel > 0.01) {
            const ph = this.poolLevel*24;
            const pg = ctx.createLinearGradient(0, this.canvas.height-ph, 0, this.canvas.height);
            pg.addColorStop(0, 'rgba(80,0,0,0)');
            pg.addColorStop(0.4, `rgba(100,5,5,${this.poolLevel*0.4})`);
            pg.addColorStop(1, `rgba(60,0,0,${this.poolLevel*0.7})`);
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
            ctx.fillStyle = pg; ctx.fillRect(0, this.canvas.height-ph, this.canvas.width, ph);
        }
        ctx.globalCompositeOperation = 'source-over';
        for (const s of this.splatters) {
            if (s.life <= 0 && !s.settled) continue;
            ctx.globalAlpha = s.settled ? 0.4 : clamp01(s.life);
            ctx.fillStyle = '#660000'; ctx.beginPath();
            ctx.ellipse(s.x, s.y, s.r, s.r*0.6, 0, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }

    // --- Intensity control ---
    setIntensity(level) {
        this.intensity = clamp01(level);
        this.fogColor = [lerp(0.25,0.55,this.intensity), lerp(0.02,0,this.intensity), lerp(0.02,0,this.intensity)];
    }

    // --- Frame lifecycle ---
    beforeRender(deltaTime) {
        if (!this.ready) return;
        this.elapsed += deltaTime; this.hbPhase += deltaTime;
        this._updateFog(deltaTime); this.updateBloodFlow(deltaTime);
        this.updateVeins(deltaTime); this._updatePost(deltaTime);
        const ctx = this.canvas.getContext('2d'); if (!ctx) return;
        ctx.save();
        this._applyPost(ctx);
        this._renderReflections(ctx, this.game.board);
        this._renderGhostReflection(ctx, this.game.ghostPiece, this.game.ghostPosition);
        this._renderBloodAccum(ctx); this._renderVeins(ctx); this._renderFog(ctx);
    }

    afterRender() {
        if (!this.ready) return;
        const ctx = this.canvas.getContext('2d'); if (ctx) ctx.restore();
    }

    dispose() {
        this.ready = false;
        this.dripBuf?.destroy(); this.dripParamsBuf?.destroy();
        this.uniformBuf?.destroy(); this.renderTex?.destroy(); this.depthTex?.destroy();
        this.splatters.length = 0; this.fogParts.length = 0;
        this.bloodAccum.fill(0); this.veinMap.fill(0); this.veinConns.clear();
        this.device?.destroy(); this.device = null;
        console.log('[BloodTetrisRenderUpgrade2026] Disposed');
    }
}
