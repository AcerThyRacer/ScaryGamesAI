/* ============================================
   ScaryGamesAI — Theme & Effects Customizer
   ============================================ */

(function () {
    'use strict';

    // ======================== THEMES ========================
    const THEMES = [
        {
            id: 'default', name: '🩸 Blood Moon', preview: 'linear-gradient(135deg, #0a0a0f, #2a0010)',
            vars: {} // default — no overrides
        },
        {
            id: 'phantom', name: '👻 Phantom', preview: 'linear-gradient(135deg, #0a0a18, #1a1040)',
            vars: {
                '--bg-primary': '#08081a', '--bg-secondary': '#10102a', '--bg-card': 'rgba(16,16,42,0.85)',
                '--bg-card-hover': 'rgba(25,25,60,0.95)', '--accent-red': '#8855ff', '--accent-red-glow': 'rgba(136,85,255,0.4)',
                '--border-glow': 'rgba(136,85,255,0.3)', '--text-primary': '#d0d0f0', '--text-secondary': '#7a7aaa',
            }
        },
        {
            id: 'toxic', name: '☣️ Toxic Swamp', preview: 'linear-gradient(135deg, #050a04, #0a2010)',
            vars: {
                '--bg-primary': '#050a04', '--bg-secondary': '#0a1a08', '--bg-card': 'rgba(10,26,8,0.85)',
                '--bg-card-hover': 'rgba(15,40,12,0.95)', '--accent-red': '#33ff33', '--accent-red-glow': 'rgba(51,255,51,0.35)',
                '--border-glow': 'rgba(51,255,51,0.3)', '--text-primary': '#c0e8c0', '--text-secondary': '#6a9a6a',
            }
        },
        {
            id: 'cursed', name: '🏺 Cursed Gold', preview: 'linear-gradient(135deg, #0a0800, #2a1a00)',
            vars: {
                '--bg-primary': '#0a0800', '--bg-secondary': '#1a1200', '--bg-card': 'rgba(26,18,0,0.85)',
                '--bg-card-hover': 'rgba(40,28,0,0.95)', '--accent-red': '#ffaa00', '--accent-red-glow': 'rgba(255,170,0,0.4)',
                '--border-glow': 'rgba(255,170,0,0.3)', '--text-primary': '#f0e0c0', '--text-secondary': '#a09060',
            }
        },
        {
            id: 'frozen', name: '🧊 Frozen Hell', preview: 'linear-gradient(135deg, #060a14, #0a1a30)',
            vars: {
                '--bg-primary': '#060a14', '--bg-secondary': '#0a1225', '--bg-card': 'rgba(10,18,37,0.85)',
                '--bg-card-hover': 'rgba(15,28,55,0.95)', '--accent-red': '#44ccff', '--accent-red-glow': 'rgba(68,204,255,0.35)',
                '--border-glow': 'rgba(68,204,255,0.3)', '--text-primary': '#d0e8ff', '--text-secondary': '#6a8aaa',
            }
        },
        {
            id: 'void', name: '🕳️ The Void', preview: 'linear-gradient(135deg, #000000, #0a0a0a)',
            vars: {
                '--bg-primary': '#000000', '--bg-secondary': '#080808', '--bg-card': 'rgba(8,8,8,0.9)',
                '--bg-card-hover': 'rgba(15,15,15,0.95)', '--accent-red': '#ffffff', '--accent-red-glow': 'rgba(255,255,255,0.15)',
                '--border-glow': 'rgba(255,255,255,0.1)', '--text-primary': '#cccccc', '--text-secondary': '#555555',
            }
        },
        {
            id: 'inferno', name: '🔥 Inferno', preview: 'linear-gradient(135deg, #1a0500, #3a1000)',
            vars: {
                '--bg-primary': '#1a0500', '--bg-secondary': '#2a0a00', '--bg-card': 'rgba(42,10,0,0.85)',
                '--bg-card-hover': 'rgba(60,15,0,0.95)', '--accent-red': '#ff4400', '--accent-red-glow': 'rgba(255,68,0,0.45)',
                '--border-glow': 'rgba(255,68,0,0.3)', '--text-primary': '#ffe0cc', '--text-secondary': '#aa6644',
            }
        },
        {
            id: 'necrotic', name: '💀 Necrotic', preview: 'linear-gradient(135deg, #0a0a0a, #1a1a18)',
            vars: {
                '--bg-primary': '#0a0a09', '--bg-secondary': '#151514', '--bg-card': 'rgba(21,21,20,0.85)',
                '--bg-card-hover': 'rgba(30,30,28,0.95)', '--accent-red': '#aa9955', '--accent-red-glow': 'rgba(170,153,85,0.3)',
                '--border-glow': 'rgba(170,153,85,0.2)', '--text-primary': '#c8c4b0', '--text-secondary': '#78756a',
            }
        },
        {
            id: 'eldritch', name: '🐙 Eldritch', preview: 'linear-gradient(135deg, #08041a, #1a0830)',
            vars: {
                '--bg-primary': '#08041a', '--bg-secondary': '#120830', '--bg-card': 'rgba(18,8,48,0.85)',
                '--bg-card-hover': 'rgba(28,12,65,0.95)', '--accent-red': '#cc44ff', '--accent-red-glow': 'rgba(204,68,255,0.4)',
                '--border-glow': 'rgba(204,68,255,0.3)', '--text-primary': '#e0d0ff', '--text-secondary': '#8a6aaa',
            }
        },
        {
            id: 'crimson', name: '🩸 Crimson Tide', preview: 'linear-gradient(135deg, #1a0000, #3a0008)',
            vars: {
                '--bg-primary': '#1a0000', '--bg-secondary': '#2a0005', '--bg-card': 'rgba(42,0,5,0.85)',
                '--bg-card-hover': 'rgba(60,0,8,0.95)', '--accent-red': '#ff1133', '--accent-red-glow': 'rgba(255,17,51,0.5)',
                '--border-glow': 'rgba(255,17,51,0.35)', '--text-primary': '#ffcccc', '--text-secondary': '#995555',
            }
        },
        {
            id: 'asylum', name: '🏥 Asylum', preview: 'linear-gradient(135deg, #0f0f0f, #1a1a20)',
            vars: {
                '--bg-primary': '#0f0f0f', '--bg-secondary': '#181820', '--bg-card': 'rgba(24,24,32,0.85)',
                '--bg-card-hover': 'rgba(35,35,45,0.95)', '--accent-red': '#88ff88', '--accent-red-glow': 'rgba(136,255,136,0.25)',
                '--border-glow': 'rgba(136,255,136,0.2)', '--text-primary': '#d0d8d0', '--text-secondary': '#6a7a6a',
            }
        },
        {
            id: 'witchcraft', name: '🧙 Witchcraft', preview: 'linear-gradient(135deg, #0a0510, #1a0825)',
            vars: {
                '--bg-primary': '#0a0510', '--bg-secondary': '#150a20', '--bg-card': 'rgba(21,10,32,0.85)',
                '--bg-card-hover': 'rgba(32,15,48,0.95)', '--accent-red': '#ff55aa', '--accent-red-glow': 'rgba(255,85,170,0.4)',
                '--border-glow': 'rgba(255,85,170,0.3)', '--text-primary': '#f0d0e0', '--text-secondary': '#9a6a8a',
            }
        },
    ];

    // ======================== EFFECTS ========================
    const EFFECTS = [
        { id: 'vignette', name: '🌑 Dark Vignette', desc: 'Heavy dark edges' },
        { id: 'blooddrip', name: '🩸 Blood Drip', desc: 'Blood dripping from top' },
        { id: 'static', name: '📺 TV Static', desc: 'Noisy static overlay' },
        { id: 'flicker', name: '💡 Flicker', desc: 'Unstable lighting' },
        { id: 'heartbeat', name: '💓 Heartbeat', desc: 'Pulsing red edges' },
        { id: 'fog', name: '🌫️ Heavy Fog', desc: 'Thick creeping fog' },
        { id: 'glitch', name: '⚡ Glitch', desc: 'Digital glitches' },
        { id: 'scanlines', name: '📟 Scanlines', desc: 'CRT monitor lines' },
        { id: 'chromatic', name: '🌈 Chromatic', desc: 'Color separation' },
        { id: 'eyes', name: '👁️ Watching Eyes', desc: 'Eyes in the dark' },
        { id: 'rain', name: '🌧️ Blood Rain', desc: 'Red rain streaks' },
        { id: 'cracks', name: '💔 Screen Cracks', desc: 'Cracked screen overlay' },
    ];

    let activeTheme = localStorage.getItem('sg_theme') || 'default';
    let activeEffects = JSON.parse(localStorage.getItem('sg_effects') || '[]');
    let themeOpen = false;
    let effectsOpen = false;

    // ======================== BUILD UI ========================
    function buildUI() {
        const nav = document.querySelector('.nav-inner');
        if (!nav) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'customizer-btns';
        wrapper.innerHTML = `
      <div class="cust-btn-wrap">
        <button class="cust-btn" id="themes-btn" title="Themes">🎨</button>
        <div class="cust-dropdown" id="themes-dropdown">
          <div class="cust-dropdown-header">
            <span>🎨 Themes</span>
            <span class="cust-dropdown-close" data-target="themes">✕</span>
          </div>
          <div class="cust-dropdown-list" id="themes-list"></div>
        </div>
      </div>
      <div class="cust-btn-wrap">
        <button class="cust-btn" id="effects-btn" title="Effects">✨</button>
        <div class="cust-dropdown" id="effects-dropdown">
          <div class="cust-dropdown-header">
            <span>✨ Effects</span>
            <span class="cust-dropdown-close" data-target="effects">✕</span>
          </div>
          <div class="cust-dropdown-list" id="effects-list"></div>
        </div>
      </div>
    `;
        nav.appendChild(wrapper);

        // Theme items
        const themesList = document.getElementById('themes-list');
        THEMES.forEach(theme => {
            const item = document.createElement('div');
            item.className = 'cust-item theme-item' + (theme.id === activeTheme ? ' active' : '');
            item.dataset.id = theme.id;
            item.innerHTML = `
        <div class="theme-preview" style="background:${theme.preview}"></div>
        <span class="cust-item-name">${theme.name}</span>
        <span class="cust-item-check">${theme.id === activeTheme ? '✓' : ''}</span>
      `;
            item.addEventListener('click', () => setTheme(theme.id));
            themesList.appendChild(item);
        });

        // Effect items
        const effectsList = document.getElementById('effects-list');
        EFFECTS.forEach(effect => {
            const isActive = activeEffects.includes(effect.id);
            const item = document.createElement('div');
            item.className = 'cust-item effect-item' + (isActive ? ' active' : '');
            item.dataset.id = effect.id;
            item.innerHTML = `
        <div class="effect-toggle ${isActive ? 'on' : ''}"></div>
        <div class="cust-item-info">
          <span class="cust-item-name">${effect.name}</span>
          <span class="cust-item-desc">${effect.desc}</span>
        </div>
      `;
            item.addEventListener('click', () => toggleEffect(effect.id));
            effectsList.appendChild(item);
        });

        // Button events
        document.getElementById('themes-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            themeOpen = !themeOpen;
            effectsOpen = false;
            updateDropdowns();
        });
        document.getElementById('effects-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            effectsOpen = !effectsOpen;
            themeOpen = false;
            updateDropdowns();
        });

        // Close buttons
        document.querySelectorAll('.cust-dropdown-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                themeOpen = false;
                effectsOpen = false;
                updateDropdowns();
            });
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.cust-btn-wrap')) {
                themeOpen = false;
                effectsOpen = false;
                updateDropdowns();
            }
        });
    }

    function updateDropdowns() {
        const td = document.getElementById('themes-dropdown');
        const ed = document.getElementById('effects-dropdown');
        if (td) td.classList.toggle('open', themeOpen);
        if (ed) ed.classList.toggle('open', effectsOpen);
    }

    // ======================== THEME LOGIC ========================
    function setTheme(id) {
        activeTheme = id;
        localStorage.setItem('sg_theme', id);
        const theme = THEMES.find(t => t.id === id);
        const root = document.documentElement;

        // Reset all custom properties to defaults
        const defaults = THEMES[0]; // default theme has no vars
        THEMES.forEach(t => {
            Object.keys(t.vars).forEach(key => root.style.removeProperty(key));
        });

        // Apply new theme
        if (theme && theme.vars) {
            Object.entries(theme.vars).forEach(([key, val]) => {
                root.style.setProperty(key, val);
            });
        }

        // Update checkmarks
        document.querySelectorAll('.theme-item').forEach(item => {
            const isActive = item.dataset.id === id;
            item.classList.toggle('active', isActive);
            item.querySelector('.cust-item-check').textContent = isActive ? '✓' : '';
        });
    }

    // ======================== EFFECTS LOGIC ========================
    function toggleEffect(id) {
        const idx = activeEffects.indexOf(id);
        if (idx >= 0) activeEffects.splice(idx, 1);
        else activeEffects.push(id);
        localStorage.setItem('sg_effects', JSON.stringify(activeEffects));
        applyEffects();

        // Update toggle UI
        document.querySelectorAll('.effect-item').forEach(item => {
            const isOn = activeEffects.includes(item.dataset.id);
            item.classList.toggle('active', isOn);
            item.querySelector('.effect-toggle').classList.toggle('on', isOn);
        });
    }

    function applyEffects() {
        // Remove all existing effect overlays
        document.querySelectorAll('.fx-overlay').forEach(el => el.remove());

        activeEffects.forEach(id => {
            const el = document.createElement('div');
            el.className = 'fx-overlay fx-' + id;
            document.body.appendChild(el);

            // Eyes effect needs child elements
            if (id === 'eyes') {
                for (let i = 0; i < 6; i++) {
                    const eye = document.createElement('div');
                    eye.className = 'fx-eye';
                    eye.style.left = (10 + Math.random() * 80) + '%';
                    eye.style.top = (10 + Math.random() * 80) + '%';
                    eye.style.animationDelay = (Math.random() * 5) + 's';
                    eye.style.animationDuration = (3 + Math.random() * 4) + 's';
                    el.appendChild(eye);
                }
            }

            // Rain effect needs streaks
            if (id === 'rain') {
                for (let i = 0; i < 40; i++) {
                    const drop = document.createElement('div');
                    drop.className = 'fx-raindrop';
                    drop.style.left = Math.random() * 100 + '%';
                    drop.style.animationDelay = Math.random() * 2 + 's';
                    drop.style.animationDuration = (0.5 + Math.random() * 0.5) + 's';
                    el.appendChild(drop);
                }
            }

            // Blood drip needs drip elements
            if (id === 'blooddrip') {
                for (let i = 0; i < 8; i++) {
                    const drip = document.createElement('div');
                    drip.className = 'fx-drip';
                    drip.style.left = (5 + Math.random() * 90) + '%';
                    drip.style.animationDelay = Math.random() * 4 + 's';
                    drip.style.animationDuration = (3 + Math.random() * 4) + 's';
                    el.appendChild(drip);
                }
            }
        });
    }

    // ======================== INIT ========================
    function initCustomizer() {
        buildUI();
        setTheme(activeTheme);
        applyEffects();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomizer);
    } else {
        initCustomizer();
    }
})();
