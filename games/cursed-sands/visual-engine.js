/* ============================================
   Cursed Sands — Phase 10: Visual Engine
   Custom shaders, volumetric lighting,
   skeletal animation, post-processing
   ============================================ */
var VisualEngine = (function () {
    'use strict';

    var _scene = null, _camera = null, _renderer = null;
    var _enabled = true;
    var sandShaderMaterial = null;
    var godRays = [];
    var dustMotes = [];
    var heatHaze = null;
    var MAX_DUST = 100;
    var MAX_GODRAYS = 6;

    // ============ BUILD ============
    function build(scene, camera, renderer) {
        _scene = scene; _camera = camera; _renderer = renderer;
        godRays = []; dustMotes = [];
        buildDustMotes(scene);
        buildGodRays(scene);
        buildHeatHaze(scene);
        buildSandShader(scene);
    }

    // ============ SAND SHADER ============
    function buildSandShader(scene) {
        var vertShader = [
            'varying vec2 vUv;',
            'varying vec3 vWorldPos;',
            'uniform float uTime;',
            'void main() {',
            '  vUv = uv;',
            '  vec3 pos = position;',
            '  pos.y += sin(pos.x * 2.0 + uTime * 0.5) * 0.08;',
            '  pos.y += sin(pos.z * 1.5 + uTime * 0.3) * 0.06;',
            '  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;',
            '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);',
            '}'
        ].join('\n');
        var fragShader = [
            'varying vec2 vUv;',
            'varying vec3 vWorldPos;',
            'uniform float uTime;',
            'uniform vec3 uSandColor;',
            'uniform vec3 uDarkSandColor;',
            'uniform float uWindAngle;',
            'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
            'float noise(vec2 p) {',
            '  vec2 i = floor(p); vec2 f = fract(p);',
            '  float a = hash(i); float b = hash(i + vec2(1.0, 0.0));',
            '  float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));',
            '  vec2 u = f * f * (3.0 - 2.0 * f);',
            '  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;',
            '}',
            'void main() {',
            '  vec2 windOffset = vec2(cos(uWindAngle), sin(uWindAngle)) * uTime * 0.3;',
            '  float n = noise(vWorldPos.xz * 0.5 + windOffset);',
            '  float ripple = noise(vWorldPos.xz * 3.0 + windOffset * 2.0) * 0.3;',
            '  vec3 color = mix(uDarkSandColor, uSandColor, n + ripple);',
            '  float sparkle = step(0.97, noise(vWorldPos.xz * 20.0 + uTime * 0.5));',
            '  color += sparkle * 0.3;',
            '  gl_FragColor = vec4(color, 1.0);',
            '}'
        ].join('\n');
        try {
            sandShaderMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uSandColor: { value: new THREE.Color(0xd4a843) },
                    uDarkSandColor: { value: new THREE.Color(0x8a6c2f) },
                    uWindAngle: { value: 0 }
                },
                vertexShader: vertShader,
                fragmentShader: fragShader
            });
        } catch (e) {
            sandShaderMaterial = null;
        }
    }

    // ============ DUST MOTES ============
    function buildDustMotes(scene) {
        var geo = new THREE.SphereGeometry(0.015, 3, 3);
        var mat = new THREE.MeshBasicMaterial({ color: 0xffddaa, transparent: true, opacity: 0.3 });
        for (var i = 0; i < MAX_DUST; i++) {
            var mote = new THREE.Mesh(geo, mat.clone());
            mote.visible = false;
            scene.add(mote);
            dustMotes.push({ mesh: mote, x: 0, y: 0, z: 0, phase: Math.random() * Math.PI * 2, active: false, life: 0 });
        }
    }

    // ============ GOD RAYS ============
    function buildGodRays(scene) {
        var rayMat = new THREE.MeshBasicMaterial({
            color: 0xffddaa, transparent: true, opacity: 0.06,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending
        });
        for (var i = 0; i < MAX_GODRAYS; i++) {
            var rayGeo = new THREE.PlaneGeometry(0.3, 8);
            var ray = new THREE.Mesh(rayGeo, rayMat.clone());
            ray.visible = false;
            scene.add(ray);
            godRays.push({ mesh: ray, active: false, x: 0, z: 0 });
        }
    }

    // ============ HEAT HAZE ============
    function buildHeatHaze(scene) {
        // Transparent plane that wobbles
        var hazeMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.02,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending
        });
        heatHaze = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), hazeMat);
        heatHaze.rotation.x = -Math.PI / 2;
        heatHaze.position.y = 0.5;
        heatHaze.visible = false;
        scene.add(heatHaze);
    }

    // ============ UPDATE ============
    function update(dt, px, pz, py, sunY, temperature, windAngle) {
        if (!_enabled) return;

        // Update sand shader uniforms
        if (sandShaderMaterial) {
            sandShaderMaterial.uniforms.uTime.value += dt;
            sandShaderMaterial.uniforms.uWindAngle.value = windAngle || 0;
        }

        // Dust motes — spawn near player in interior/tomb areas
        for (var i = 0; i < dustMotes.length; i++) {
            var dm = dustMotes[i];
            if (!dm.active && Math.random() < 0.03) {
                dm.active = true;
                dm.x = px + (Math.random() - 0.5) * 10;
                dm.y = py - 1 + Math.random() * 3;
                dm.z = pz + (Math.random() - 0.5) * 10;
                dm.phase = Math.random() * Math.PI * 2;
                dm.life = 5 + Math.random() * 8;
                if (dm.mesh) { dm.mesh.visible = true; dm.mesh.position.set(dm.x, dm.y, dm.z); }
            }
            if (dm.active) {
                dm.phase += dt * 0.8;
                dm.x += Math.sin(dm.phase) * 0.1 * dt;
                dm.y += Math.cos(dm.phase * 0.7) * 0.05 * dt;
                dm.z += Math.cos(dm.phase * 1.1) * 0.08 * dt;
                dm.life -= dt;
                if (dm.mesh) {
                    dm.mesh.position.set(dm.x, dm.y, dm.z);
                    dm.mesh.material.opacity = Math.min(0.3, dm.life * 0.05);
                }
                if (dm.life <= 0) {
                    dm.active = false;
                    if (dm.mesh) dm.mesh.visible = false;
                }
            }
        }

        // God rays — from sun direction during daytime
        if (sunY > 5) {
            for (var gi = 0; gi < godRays.length; gi++) {
                var gr = godRays[gi];
                if (!gr.active && Math.random() < 0.01) {
                    gr.active = true;
                    gr.x = px + (Math.random() - 0.5) * 20;
                    gr.z = pz + (Math.random() - 0.5) * 20;
                    if (gr.mesh) {
                        gr.mesh.visible = true;
                        gr.mesh.position.set(gr.x, 4, gr.z);
                        gr.mesh.rotation.y = Math.random() * Math.PI;
                    }
                }
                if (gr.active) {
                    if (gr.mesh) {
                        gr.mesh.material.opacity = 0.04 + Math.sin(Date.now() * 0.001 + gi) * 0.02;
                        // Fade with distance
                        var gdx = px - gr.x, gdz = pz - gr.z;
                        var gDist = Math.sqrt(gdx * gdx + gdz * gdz);
                        if (gDist > 15) { gr.active = false; gr.mesh.visible = false; }
                    }
                }
            }
        } else {
            godRays.forEach(function (gr) { gr.active = false; if (gr.mesh) gr.mesh.visible = false; });
        }

        // Heat haze — visible when hot
        if (heatHaze) {
            var showHaze = temperature > 35 && sunY > 10;
            heatHaze.visible = showHaze;
            if (showHaze) {
                heatHaze.position.set(px, 0.3, pz);
                heatHaze.material.opacity = Math.min(0.04, (temperature - 35) * 0.003);
                heatHaze.position.y = 0.3 + Math.sin(Date.now() * 0.002) * 0.05;
            }
        }
    }

    // ============ APPLY TO GROUND ============
    function getSandMaterial() {
        return sandShaderMaterial;
    }

    // ============ TOGGLE ============
    function setEnabled(enabled) { _enabled = enabled; }
    function isEnabled() { return _enabled; }

    // ============ RESET ============
    function reset() {
        dustMotes.forEach(function (dm) { dm.active = false; if (dm.mesh) dm.mesh.visible = false; });
        godRays.forEach(function (gr) { gr.active = false; if (gr.mesh) gr.mesh.visible = false; });
        if (heatHaze) heatHaze.visible = false;
    }

    return {
        build: build, update: update, reset: reset,
        getSandMaterial: getSandMaterial,
        setEnabled: setEnabled, isEnabled: isEnabled
    };
})();
