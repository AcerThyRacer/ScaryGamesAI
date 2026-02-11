/* ============================================
   ScaryGamesAI — Quality Settings Panel
   Premium settings UI for controlling ray tracing,
   path tracing, individual effects, performance
   modes, and FX intensity.
   ============================================ */

const QualitySettings = (function () {
    'use strict';

    var panel = null;
    var btn = null;
    var open = false;
    var SAVE_KEY = 'sgai-quality-settings';

    // Effect categories for the UI
    var RT_EFFECTS = [
        { key: 'godRays', label: 'Volumetric God Rays', icon: '☀️' },
        { key: 'ssr', label: 'Screen-Space Reflections', icon: '🪞' },
        { key: 'contactShadow', label: 'Contact Shadows', icon: '🌑' },
        { key: 'specularBloom', label: 'Specular Bloom', icon: '💫' },
        { key: 'ambientOcclusion', label: 'Ambient Occlusion', icon: '🌫️' },
        { key: 'lightShafts', label: 'Light Shafts', icon: '🔦' },
        { key: 'rain', label: 'Rain Streaks', icon: '🌧️' },
        { key: 'bloomHalos', label: 'Bloom Halos', icon: '✨' },
        { key: 'motionBlur', label: 'Motion Blur', icon: '💨' },
        { key: 'wetSurface', label: 'Wet Surface Sheen', icon: '💧' },
        { key: 'heatDistortion', label: 'Heat Distortion', icon: '🔥' },
        { key: 'crepRays', label: 'Crepuscular Rays', icon: '🌅' },
        { key: 'edgeGlow', label: 'Edge Glow / Fresnel', icon: '🔆' },
        { key: 'dustMotes', label: 'Dust Motes', icon: '✴️' },
    ];

    var PT_EFFECTS = [
        { key: 'photons', label: 'Photon Particles', icon: '🔬' },
        { key: 'gi', label: 'Global Illumination', icon: '💡' },
        { key: 'caustics', label: 'Caustic Patterns', icon: '🌊' },
        { key: 'fireflies', label: 'Fireflies', icon: '🪲' },
        { key: 'fog', label: 'Volumetric Fog', icon: '🌁' },
        { key: 'lensFlare', label: 'Lens Flares', icon: '🌟' },
        { key: 'sss', label: 'Subsurface Scattering', icon: '🫧' },
        { key: 'aurora', label: 'Aurora Waves', icon: '🌈' },
        { key: 'prism', label: 'Chromatic Prisms', icon: '🔷' },
        { key: 'lightPaint', label: 'Light Painting', icon: '🎨' },
        { key: 'sparkles', label: 'Micro-Sparkles', icon: '⭐' },
        { key: 'emissiveBlooms', label: 'Emissive Blooms', icon: '🔮' },
    ];

    var PERF_PRESETS = [
        { id: 'full', label: 'Ultra', desc: 'All effects enabled — maximum visual quality', color: '#ffd700' },
        { id: 'reduced', label: 'High', desc: 'Core effects only — skip rain, bloom, motion blur', color: '#44ddff' },
        { id: 'minimal', label: 'Off', desc: 'No FX overlays — maximum game performance', color: '#888' },
    ];

    function loadSaved() {
        try {
            var saved = JSON.parse(localStorage.getItem(SAVE_KEY));
            if (saved && typeof QualityFX !== 'undefined') {
                QualityFX.setSettings(saved);
            }
        } catch (e) { }
    }

    function saveCurrent() {
        if (typeof QualityFX === 'undefined') return;
        var settings = QualityFX.getSettings();
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(settings)); } catch (e) { }
    }

    function init() {
        loadSaved();
        createButton();
    }

    function createButton() {
        btn = document.createElement('button');
        btn.id = 'quality-settings-btn';
        btn.innerHTML = '⚙';
        btn.title = 'Quality Settings';
        btn.style.cssText =
            'position:fixed;bottom:18px;left:18px;z-index:99999;width:48px;height:48px;' +
            'border-radius:50%;border:2px solid rgba(255,255,255,0.12);' +
            'background:rgba(15,15,25,0.85);color:#cc1122;font-size:1.4rem;' +
            'cursor:pointer;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);' +
            'box-shadow:0 4px 20px rgba(0,0,0,0.5),0 0 20px rgba(204,17,34,0.15);' +
            'transition:all .3s ease;display:flex;align-items:center;justify-content:center;';
        btn.addEventListener('mouseenter', function () {
            btn.style.transform = 'scale(1.12)';
            btn.style.boxShadow = '0 6px 30px rgba(0,0,0,0.6),0 0 30px rgba(204,17,34,0.3)';
        });
        btn.addEventListener('mouseleave', function () {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5),0 0 20px rgba(204,17,34,0.15)';
        });
        btn.addEventListener('click', togglePanel);
        document.body.appendChild(btn);
    }

    function togglePanel() {
        if (open) { closePanel(); return; }
        open = true;
        createPanel();
    }

    function closePanel() {
        open = false;
        if (panel) { panel.remove(); panel = null; }
    }

    function createPanel() {
        if (panel) panel.remove();

        var tier = typeof QualityFX !== 'undefined' ? QualityFX.getTier() : 'none';
        var settings = typeof QualityFX !== 'undefined' ? QualityFX.getSettings() : { perfMode: 'full', opacity: 1, toggles: {} };

        panel = document.createElement('div');
        panel.id = 'quality-settings-panel';
        panel.style.cssText =
            'position:fixed;bottom:78px;left:18px;z-index:99998;width:380px;max-height:80vh;' +
            'overflow-y:auto;overflow-x:hidden;' +
            'background:rgba(8,8,18,0.96);border:1px solid rgba(255,255,255,0.08);' +
            'border-radius:16px;padding:0;' +
            'font-family:"Inter",system-ui,sans-serif;color:#ddd;font-size:0.8rem;' +
            'backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);' +
            'box-shadow:0 20px 60px rgba(0,0,0,0.85),0 0 40px rgba(204,17,34,0.1);' +
            'animation:qsSlideIn .3s cubic-bezier(.16,1,.3,1);';

        var html = '';

        // Header
        html += '<div style="padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;">';
        html += '<div style="font-size:1rem;font-weight:700;color:#cc1122;">⚙ Quality Settings</div>';
        html += '<div id="qs-close" style="cursor:pointer;color:#666;font-size:1.3rem;transition:color .2s;">×</div>';
        html += '</div>';

        // Performance Mode Presets
        html += '<div style="padding:14px 20px 10px;">';
        html += '<div style="font-weight:600;color:#888;font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Performance Mode</div>';
        html += '<div style="display:flex;gap:8px;">';
        PERF_PRESETS.forEach(function (p) {
            var active = settings.perfMode === p.id;
            html += '<button class="qs-preset" data-mode="' + p.id + '" style="' +
                'flex:1;padding:10px 6px;border-radius:10px;border:1px solid ' +
                (active ? p.color : 'rgba(255,255,255,0.06)') + ';' +
                'background:' + (active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)') + ';' +
                'color:' + (active ? p.color : '#888') + ';cursor:pointer;text-align:center;' +
                'font-family:inherit;font-weight:600;font-size:0.72rem;transition:all .2s;">' +
                '<div style="font-size:0.9rem;margin-bottom:2px;">' + p.label + '</div>' +
                '<div style="font-size:0.58rem;opacity:0.6;font-weight:400;">' + p.desc + '</div>' +
                '</button>';
        });
        html += '</div></div>';

        // FX Intensity Slider
        html += '<div style="padding:8px 20px 14px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
        html += '<span style="font-weight:600;color:#888;font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;">FX Intensity</span>';
        html += '<span id="qs-opacity-val" style="font-size:0.72rem;color:#cc1122;font-weight:600;">' + Math.round(settings.opacity * 100) + '%</span>';
        html += '</div>';
        html += '<input type="range" id="qs-opacity" min="0" max="100" value="' + Math.round(settings.opacity * 100) + '" style="' +
            'width:100%;height:6px;-webkit-appearance:none;appearance:none;background:rgba(255,255,255,0.08);' +
            'border-radius:3px;outline:none;cursor:pointer;">';
        html += '</div>';

        // Tier info
        var tierDisplay = tier === 'max' ? '✨ Path Tracing (Max)' : tier === 'pro' ? '💠 Ray Tracing (Pro)' : '🎮 Standard';
        var tierColor = tier === 'max' ? '#ffd700' : tier === 'pro' ? '#44ddff' : '#888';
        html += '<div style="padding:8px 20px;margin:0 12px;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);">';
        html += '<span style="color:' + tierColor + ';font-weight:600;font-size:0.75rem;">' + tierDisplay + '</span>';
        html += '</div>';

        // Ray Tracing Effects
        if (tier === 'pro' || tier === 'max') {
            html += buildSection('Ray Tracing Effects', '#44ddff', RT_EFFECTS, settings.toggles);
        }

        // Path Tracing Effects
        if (tier === 'max') {
            html += buildSection('Path Tracing Effects', '#ffd700', PT_EFFECTS, settings.toggles);
        }

        // Quick Actions
        html += '<div style="padding:10px 20px 14px;border-top:1px solid rgba(255,255,255,0.04);">';
        html += '<div style="display:flex;gap:8px;">';
        html += '<button id="qs-all-on" style="' + quickBtnStyle('#4ade80') + '">Enable All</button>';
        html += '<button id="qs-all-off" style="' + quickBtnStyle('#f87171') + '">Disable All</button>';
        html += '<button id="qs-reset" style="' + quickBtnStyle('#60a5fa') + '">Reset</button>';
        html += '</div></div>';

        // Footer tip
        html += '<div style="padding:6px 20px 14px;text-align:center;font-size:0.6rem;color:#555;">Settings are saved automatically</div>';

        panel.innerHTML = html;
        document.body.appendChild(panel);

        // Inject slider thumb style
        injectStyles();

        // Event listeners
        panel.querySelector('#qs-close').addEventListener('click', closePanel);

        // Perf mode buttons
        panel.querySelectorAll('.qs-preset').forEach(function (b) {
            b.addEventListener('click', function () {
                var mode = this.getAttribute('data-mode');
                if (typeof QualityFX !== 'undefined') QualityFX.setPerformanceMode(mode);
                saveCurrent();
                createPanel(); // re-render
            });
        });

        // Opacity slider
        var opSlider = panel.querySelector('#qs-opacity');
        var opVal = panel.querySelector('#qs-opacity-val');
        if (opSlider) {
            opSlider.addEventListener('input', function () {
                var v = this.value / 100;
                opVal.textContent = this.value + '%';
                if (typeof QualityFX !== 'undefined') QualityFX.setOpacity(v);
                saveCurrent();
            });
        }

        // Effect toggles
        panel.querySelectorAll('.qs-toggle').forEach(function (t) {
            t.addEventListener('click', function () {
                var key = this.getAttribute('data-key');
                var current = this.getAttribute('data-on') === 'true';
                var newVal = !current;
                this.setAttribute('data-on', newVal);
                this.style.background = newVal ? '#cc1122' : 'rgba(255,255,255,0.08)';
                this.querySelector('.qs-toggle-thumb').style.transform = newVal ? 'translateX(18px)' : 'translateX(0)';
                if (typeof QualityFX !== 'undefined') QualityFX.toggleEffect(key, newVal);
                saveCurrent();
            });
        });

        // Quick actions
        panel.querySelector('#qs-all-on').addEventListener('click', function () {
            setAllToggles(true);
        });
        panel.querySelector('#qs-all-off').addEventListener('click', function () {
            setAllToggles(false);
        });
        panel.querySelector('#qs-reset').addEventListener('click', function () {
            localStorage.removeItem(SAVE_KEY);
            if (typeof QualityFX !== 'undefined') {
                // Reset all to defaults
                var allOn = {};
                RT_EFFECTS.concat(PT_EFFECTS).forEach(function (e) { allOn[e.key] = true; });
                QualityFX.setSettings({ perfMode: 'full', opacity: 1, toggles: allOn });
            }
            createPanel();
        });
    }

    function setAllToggles(on) {
        panel.querySelectorAll('.qs-toggle').forEach(function (t) {
            t.setAttribute('data-on', on);
            t.style.background = on ? '#cc1122' : 'rgba(255,255,255,0.08)';
            t.querySelector('.qs-toggle-thumb').style.transform = on ? 'translateX(18px)' : 'translateX(0)';
            var key = t.getAttribute('data-key');
            if (typeof QualityFX !== 'undefined') QualityFX.toggleEffect(key, on);
        });
        saveCurrent();
    }

    function buildSection(title, color, effects, toggles) {
        var html = '<div style="padding:10px 20px 6px;border-top:1px solid rgba(255,255,255,0.04);">';
        html += '<div style="font-weight:600;color:' + color + ';font-size:0.72rem;margin-bottom:6px;">' + title + '</div>';
        effects.forEach(function (fx) {
            var on = toggles[fx.key] !== false;
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.02);">';
            html += '<div style="display:flex;align-items:center;gap:8px;">';
            html += '<span style="font-size:0.9rem;">' + fx.icon + '</span>';
            html += '<span style="font-size:0.73rem;">' + fx.label + '</span>';
            html += '</div>';
            html += '<div class="qs-toggle" data-key="' + fx.key + '" data-on="' + on + '" style="' +
                'width:38px;height:20px;border-radius:12px;cursor:pointer;position:relative;transition:background .2s;' +
                'background:' + (on ? '#cc1122' : 'rgba(255,255,255,0.08)') + ';">';
            html += '<div class="qs-toggle-thumb" style="' +
                'width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;' +
                'transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,0.3);' +
                'transform:' + (on ? 'translateX(18px)' : 'translateX(0)') + ';"></div>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    function quickBtnStyle(color) {
        return 'flex:1;padding:8px;border-radius:8px;border:1px solid ' + color + '33;' +
            'background:' + color + '11;color:' + color + ';cursor:pointer;font-size:0.68rem;' +
            'font-weight:600;font-family:inherit;transition:all .2s;';
    }

    function injectStyles() {
        if (document.getElementById('qs-styles')) return;
        var style = document.createElement('style');
        style.id = 'qs-styles';
        style.textContent = [
            '@keyframes qsSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }',
            '#quality-settings-panel::-webkit-scrollbar { width:4px; }',
            '#quality-settings-panel::-webkit-scrollbar-track { background:transparent; }',
            '#quality-settings-panel::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }',
            '#qs-opacity::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:#cc1122; box-shadow:0 0 8px rgba(204,17,34,0.4); cursor:pointer; }',
            '#qs-opacity::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:#cc1122; border:none; cursor:pointer; }',
            '.qs-preset:hover { background:rgba(255,255,255,0.06) !important; }',
            '#qs-all-on:hover, #qs-all-off:hover, #qs-reset:hover { opacity:0.8; }',
            '#qs-close:hover { color:#cc1122 !important; }',
        ].join('\n');
        document.head.appendChild(style);
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500);
    }

    return { init: init, open: function () { if (!open) togglePanel(); }, close: closePanel };
})();
