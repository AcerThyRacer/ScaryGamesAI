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
        {
            id: 'midnight', name: '🌙 Midnight Mass', preview: 'linear-gradient(135deg, #050510, #0a0a20)',
            vars: {
                '--bg-primary': '#050510', '--bg-secondary': '#0a0a18', '--bg-card': 'rgba(12,12,30,0.85)',
                '--bg-card-hover': 'rgba(18,18,45,0.95)', '--accent-red': '#6644cc', '--accent-red-glow': 'rgba(102,68,204,0.4)',
                '--border-glow': 'rgba(102,68,204,0.3)', '--text-primary': '#d0d0f0', '--text-secondary': '#6a6a9a',
            }
        },
        {
            id: 'slasher', name: '🔪 Slasher Film', preview: 'linear-gradient(135deg, #0a0000, #1a0005)',
            vars: {
                '--bg-primary': '#0a0000', '--bg-secondary': '#120002', '--bg-card': 'rgba(20,0,4,0.9)',
                '--bg-card-hover': 'rgba(35,0,8,0.95)', '--accent-red': '#dd1111', '--accent-red-glow': 'rgba(221,17,17,0.5)',
                '--border-glow': 'rgba(221,17,17,0.35)', '--text-primary': '#ffcccc', '--text-secondary': '#994444',
            }
        },
        {
            id: 'haunted', name: '🏚️ Haunted House', preview: 'linear-gradient(135deg, #0f0a05, #1a1008)',
            vars: {
                '--bg-primary': '#0f0a05', '--bg-secondary': '#1a1208', '--bg-card': 'rgba(26,18,8,0.85)',
                '--bg-card-hover': 'rgba(40,28,12,0.95)', '--accent-red': '#cc9944', '--accent-red-glow': 'rgba(204,153,68,0.35)',
                '--border-glow': 'rgba(204,153,68,0.25)', '--text-primary': '#e8dcc8', '--text-secondary': '#8a7a5a',
            }
        },
        {
            id: 'sewer', name: '🐀 Sewer Creep', preview: 'linear-gradient(135deg, #0a1208, #051005)',
            vars: {
                '--bg-primary': '#0a1208', '--bg-secondary': '#0a1a08', '--bg-card': 'rgba(12,26,10,0.85)',
                '--bg-card-hover': 'rgba(18,40,15,0.95)', '--accent-red': '#66aa33', '--accent-red-glow': 'rgba(102,170,51,0.4)',
                '--border-glow': 'rgba(102,170,51,0.3)', '--text-primary': '#c8e0b8', '--text-secondary': '#6a8a5a',
            }
        },
        {
            id: 'morgue', name: '🧊 Cold Morgue', preview: 'linear-gradient(135deg, #080a10, #0d1218)',
            vars: {
                '--bg-primary': '#080a10', '--bg-secondary': '#0d1218', '--bg-card': 'rgba(13,18,28,0.85)',
                '--bg-card-hover': 'rgba(20,28,42,0.95)', '--accent-red': '#88aabb', '--accent-red-glow': 'rgba(136,170,187,0.35)',
                '--border-glow': 'rgba(136,170,187,0.25)', '--text-primary': '#d0e0e8', '--text-secondary': '#6a7a8a',
            }
        },
        {
            id: 'fireball', name: '☄️ Fireball', preview: 'linear-gradient(135deg, #2a0800, #5a1500)',
            vars: {
                '--bg-primary': '#1a0500', '--bg-secondary': '#2a0800', '--bg-card': 'rgba(42,8,0,0.9)',
                '--bg-card-hover': 'rgba(65,15,0,0.95)', '--accent-red': '#ff6600', '--accent-red-glow': 'rgba(255,102,0,0.5)',
                '--border-glow': 'rgba(255,102,0,0.35)', '--text-primary': '#ffe0b0', '--text-secondary': '#cc8844',
            }
        },
        {
            id: 'fireice', name: '🔥❄️ Fire & Ice', preview: 'linear-gradient(135deg, #1a0500, #001530)',
            vars: {
                '--bg-primary': '#0a0510', '--bg-secondary': '#0f0a18', '--bg-card': 'rgba(15,10,24,0.9)',
                '--bg-card-hover': 'rgba(22,15,35,0.95)', '--accent-red': '#ff4422', '--accent-red-glow': 'rgba(255,68,34,0.4)',
                '--border-glow': 'rgba(68,170,255,0.3)', '--text-primary': '#e0d8f0', '--text-secondary': '#8a7aaa',
            }
        },
        {
            id: 'jungle', name: '🐍 Venomous Jungle', preview: 'linear-gradient(135deg, #041a08, #0a3010)',
            vars: {
                '--bg-primary': '#031208', '--bg-secondary': '#052010', '--bg-card': 'rgba(5,32,16,0.9)',
                '--bg-card-hover': 'rgba(8,48,24,0.95)', '--accent-red': '#44ff44', '--accent-red-glow': 'rgba(68,255,68,0.35)',
                '--border-glow': 'rgba(68,255,68,0.25)', '--text-primary': '#b0f0b0', '--text-secondary': '#558a55',
            }
        },
        {
            id: 'deepabyss', name: '🌊 Deep Abyss', preview: 'linear-gradient(135deg, #000a1a, #001030)',
            vars: {
                '--bg-primary': '#00081a', '--bg-secondary': '#001025', '--bg-card': 'rgba(0,16,37,0.9)',
                '--bg-card-hover': 'rgba(0,24,55,0.95)', '--accent-red': '#0088cc', '--accent-red-glow': 'rgba(0,136,204,0.4)',
                '--border-glow': 'rgba(0,136,204,0.3)', '--text-primary': '#b0d8f0', '--text-secondary': '#4488aa',
            }
        },
        {
            id: 'eclipse', name: '🌑 Crimson Eclipse', preview: 'linear-gradient(135deg, #0a0000, #200008)',
            vars: {
                '--bg-primary': '#080002', '--bg-secondary': '#120005', '--bg-card': 'rgba(18,0,5,0.9)',
                '--bg-card-hover': 'rgba(28,0,8,0.95)', '--accent-red': '#cc0033', '--accent-red-glow': 'rgba(204,0,51,0.5)',
                '--border-glow': 'rgba(204,0,51,0.35)', '--text-primary': '#f0c0c8', '--text-secondary': '#884455',
            }
        },
        {
            id: 'electricstorm', name: '⚡ Electric Storm', preview: 'linear-gradient(135deg, #05051a, #0a0a30)',
            vars: {
                '--bg-primary': '#05051a', '--bg-secondary': '#0a0a28', '--bg-card': 'rgba(10,10,40,0.9)',
                '--bg-card-hover': 'rgba(15,15,60,0.95)', '--accent-red': '#44aaff', '--accent-red-glow': 'rgba(68,170,255,0.4)',
                '--border-glow': 'rgba(68,170,255,0.3)', '--text-primary': '#c0d8ff', '--text-secondary': '#5588aa',
            }
        },
        {
            id: 'carnival', name: '🎪 Haunted Carnival', preview: 'linear-gradient(135deg, #1a0a18, #300828)',
            vars: {
                '--bg-primary': '#1a0a18', '--bg-secondary': '#250f22', '--bg-card': 'rgba(37,15,34,0.9)',
                '--bg-card-hover': 'rgba(55,22,50,0.95)', '--accent-red': '#ff44aa', '--accent-red-glow': 'rgba(255,68,170,0.4)',
                '--border-glow': 'rgba(255,68,170,0.3)', '--text-primary': '#f0d0e8', '--text-secondary': '#aa5588',
            }
        },
        {
            id: 'apocalypse', name: '☢️ Apocalypse', preview: 'linear-gradient(135deg, #0a0a00, #1a1800)',
            vars: {
                '--bg-primary': '#0a0a00', '--bg-secondary': '#141400', '--bg-card': 'rgba(20,20,0,0.9)',
                '--bg-card-hover': 'rgba(30,30,0,0.95)', '--accent-red': '#ccaa00', '--accent-red-glow': 'rgba(204,170,0,0.4)',
                '--border-glow': 'rgba(204,170,0,0.3)', '--text-primary': '#e8e0b0', '--text-secondary': '#8a8855',
            }
        },
        {
            id: 'shadowrealm', name: '🕶️ Shadow Realm', preview: 'linear-gradient(135deg, #030303, #0a0a0a)',
            vars: {
                '--bg-primary': '#030303', '--bg-secondary': '#080808', '--bg-card': 'rgba(8,8,8,0.95)',
                '--bg-card-hover': 'rgba(14,14,14,0.95)', '--accent-red': '#8855cc', '--accent-red-glow': 'rgba(136,85,204,0.35)',
                '--border-glow': 'rgba(136,85,204,0.2)', '--text-primary': '#a8a0c0', '--text-secondary': '#555066',
            }
        },
        {
            id: 'cryogenic', name: '🧊 Cryogenic', preview: 'linear-gradient(135deg, #040810, #081020)',
            vars: {
                '--bg-primary': '#040810', '--bg-secondary': '#081018', '--bg-card': 'rgba(8,16,24,0.9)',
                '--bg-card-hover': 'rgba(12,24,36,0.95)', '--accent-red': '#00ccee', '--accent-red-glow': 'rgba(0,204,238,0.35)',
                '--border-glow': 'rgba(0,204,238,0.25)', '--text-primary': '#c0e8f0', '--text-secondary': '#5599aa',
            }
        },
        // ──────── SEASONAL HORROR ────────
        {
            id: 'blood-valentine', name: '💘 Blood Valentine', preview: 'linear-gradient(135deg, #2a0010, #4a0020)',
            vars: {
                '--bg-primary': '#1a000a', '--bg-secondary': '#2a0015', '--bg-card': 'rgba(42,0,15,0.9)',
                '--bg-card-hover': 'rgba(65,0,25,0.95)', '--accent-red': '#ff1466', '--accent-red-glow': 'rgba(255,20,102,0.5)',
                '--border-glow': 'rgba(255,20,102,0.35)', '--text-primary': '#ffd0e0', '--text-secondary': '#aa5577',
            }
        },
        {
            id: 'witch-october', name: '🎃 Witch\'s October', preview: 'linear-gradient(135deg, #1a0a00, #2a1500)',
            vars: {
                '--bg-primary': '#120800', '--bg-secondary': '#1e0f00', '--bg-card': 'rgba(30,15,0,0.9)',
                '--bg-card-hover': 'rgba(48,24,0,0.95)', '--accent-red': '#ff8800', '--accent-red-glow': 'rgba(255,136,0,0.5)',
                '--border-glow': 'rgba(170,85,0,0.35)', '--text-primary': '#ffe0b0', '--text-secondary': '#aa8844',
            }
        },
        {
            id: 'frozen-december', name: '❄️ Frozen December', preview: 'linear-gradient(135deg, #081828, #0a2040)',
            vars: {
                '--bg-primary': '#060e1a', '--bg-secondary': '#0a1828', '--bg-card': 'rgba(10,24,40,0.9)',
                '--bg-card-hover': 'rgba(15,36,60,0.95)', '--accent-red': '#88ddff', '--accent-red-glow': 'rgba(136,221,255,0.35)',
                '--border-glow': 'rgba(136,221,255,0.25)', '--text-primary': '#d8f0ff', '--text-secondary': '#6699bb',
            }
        },
        {
            id: 'harvest-moon', name: '🌾 Harvest Moon', preview: 'linear-gradient(135deg, #1a0f00, #302000)',
            vars: {
                '--bg-primary': '#140a00', '--bg-secondary': '#201200', '--bg-card': 'rgba(32,18,0,0.9)',
                '--bg-card-hover': 'rgba(50,28,0,0.95)', '--accent-red': '#cc8822', '--accent-red-glow': 'rgba(204,136,34,0.45)',
                '--border-glow': 'rgba(204,136,34,0.3)', '--text-primary': '#f0ddb0', '--text-secondary': '#997733',
            }
        },
        {
            id: 'summer-plague', name: '☀️ Summer Plague', preview: 'linear-gradient(135deg, #1a1800, #2a2500)',
            vars: {
                '--bg-primary': '#121000', '--bg-secondary': '#1e1a00', '--bg-card': 'rgba(30,26,0,0.9)',
                '--bg-card-hover': 'rgba(48,42,0,0.95)', '--accent-red': '#bbaa00', '--accent-red-glow': 'rgba(187,170,0,0.45)',
                '--border-glow': 'rgba(187,170,0,0.3)', '--text-primary': '#f0ecb0', '--text-secondary': '#888440',
            }
        },
        {
            id: 'spring-decay', name: '🌸 Spring Decay', preview: 'linear-gradient(135deg, #0a0810, #1a0f20)',
            vars: {
                '--bg-primary': '#0a060e', '--bg-secondary': '#140c1a', '--bg-card': 'rgba(20,12,26,0.9)',
                '--bg-card-hover': 'rgba(32,20,42,0.95)', '--accent-red': '#dd88cc', '--accent-red-glow': 'rgba(221,136,204,0.4)',
                '--border-glow': 'rgba(221,136,204,0.3)', '--text-primary': '#f0d8ee', '--text-secondary': '#996688',
            }
        },
        {
            id: 'autumn-dread', name: '🍂 Autumn Dread', preview: 'linear-gradient(135deg, #180a00, #2a1200)',
            vars: {
                '--bg-primary': '#100800', '--bg-secondary': '#1c0e00', '--bg-card': 'rgba(28,14,0,0.9)',
                '--bg-card-hover': 'rgba(44,22,0,0.95)', '--accent-red': '#cc6622', '--accent-red-glow': 'rgba(204,102,34,0.45)',
                '--border-glow': 'rgba(204,102,34,0.3)', '--text-primary': '#f0d0a0', '--text-secondary': '#886633',
            }
        },
        {
            id: 'newyear-curse', name: '🎆 New Year\'s Curse', preview: 'linear-gradient(135deg, #0a0518, #180a30)',
            vars: {
                '--bg-primary': '#08041a', '--bg-secondary': '#100828', '--bg-card': 'rgba(16,8,40,0.9)',
                '--bg-card-hover': 'rgba(26,14,60,0.95)', '--accent-red': '#ffcc00', '--accent-red-glow': 'rgba(255,204,0,0.45)',
                '--border-glow': 'rgba(255,204,0,0.3)', '--text-primary': '#fff0bb', '--text-secondary': '#aa8844',
            }
        },
        // ──────── POP CULTURE HORROR ────────
        {
            id: 'upside-down', name: '🙃 Stranger Upside Down', preview: 'linear-gradient(135deg, #0a0018, #200030)',
            vars: {
                '--bg-primary': '#08001a', '--bg-secondary': '#120028', '--bg-card': 'rgba(18,0,40,0.9)',
                '--bg-card-hover': 'rgba(30,0,60,0.95)', '--accent-red': '#dd2222', '--accent-red-glow': 'rgba(221,34,34,0.5)',
                '--border-glow': 'rgba(100,30,180,0.35)', '--text-primary': '#e0c0f0', '--text-secondary': '#8855aa',
            }
        },
        {
            id: 'squid-game', name: '🦑 Squid Game', preview: 'linear-gradient(135deg, #1a0020, #002a2a)',
            vars: {
                '--bg-primary': '#0a0010', '--bg-secondary': '#001818', '--bg-card': 'rgba(10,0,16,0.9)',
                '--bg-card-hover': 'rgba(0,28,28,0.95)', '--accent-red': '#ff0066', '--accent-red-glow': 'rgba(255,0,102,0.5)',
                '--border-glow': 'rgba(0,200,200,0.3)', '--text-primary': '#f0d0e0', '--text-secondary': '#aa5588',
            }
        },
        {
            id: 'biohazard', name: '☣️ Biohazard', preview: 'linear-gradient(135deg, #0a1a05, #051505)',
            vars: {
                '--bg-primary': '#050e03', '--bg-secondary': '#081808', '--bg-card': 'rgba(8,24,8,0.9)',
                '--bg-card-hover': 'rgba(14,38,14,0.95)', '--accent-red': '#00dd44', '--accent-red-glow': 'rgba(0,221,68,0.45)',
                '--border-glow': 'rgba(0,221,68,0.3)', '--text-primary': '#c0f0d0', '--text-secondary': '#558a55',
            }
        },
        {
            id: 'silent-ash', name: '🌫️ Silent Ash', preview: 'linear-gradient(135deg, #141414, #1e1e20)',
            vars: {
                '--bg-primary': '#101010', '--bg-secondary': '#1a1a1c', '--bg-card': 'rgba(26,26,28,0.9)',
                '--bg-card-hover': 'rgba(40,40,44,0.95)', '--accent-red': '#aa8866', '--accent-red-glow': 'rgba(170,136,102,0.35)',
                '--border-glow': 'rgba(170,136,102,0.2)', '--text-primary': '#c8c0b8', '--text-secondary': '#706860',
            }
        },
        {
            id: 'the-ring', name: '📼 The Ring', preview: 'linear-gradient(135deg, #000a18, #001028)',
            vars: {
                '--bg-primary': '#00050e', '--bg-secondary': '#000a1a', '--bg-card': 'rgba(0,10,26,0.9)',
                '--bg-card-hover': 'rgba(0,18,42,0.95)', '--accent-red': '#4488cc', '--accent-red-glow': 'rgba(68,136,204,0.4)',
                '--border-glow': 'rgba(68,136,204,0.3)', '--text-primary': '#b0c8e0', '--text-secondary': '#446688',
            }
        },
        {
            id: 'rusty-saw', name: '🪚 Rusty Saw', preview: 'linear-gradient(135deg, #1a0f05, #2a1808)',
            vars: {
                '--bg-primary': '#140a04', '--bg-secondary': '#201208', '--bg-card': 'rgba(32,18,8,0.9)',
                '--bg-card-hover': 'rgba(50,28,14,0.95)', '--accent-red': '#ccaa33', '--accent-red-glow': 'rgba(204,170,51,0.45)',
                '--border-glow': 'rgba(180,100,30,0.3)', '--text-primary': '#e8d8b0', '--text-secondary': '#907848',
            }
        },
        // ──────── ELEMENTAL ────────
        {
            id: 'thunderstorm', name: '⛈️ Thunderstorm', preview: 'linear-gradient(135deg, #050818, #0a1030)',
            vars: {
                '--bg-primary': '#04061a', '--bg-secondary': '#080c28', '--bg-card': 'rgba(8,12,40,0.9)',
                '--bg-card-hover': 'rgba(14,20,60,0.95)', '--accent-red': '#77aaff', '--accent-red-glow': 'rgba(119,170,255,0.45)',
                '--border-glow': 'rgba(200,200,255,0.2)', '--text-primary': '#c0d0ff', '--text-secondary': '#5566aa',
            }
        },
        {
            id: 'volcanic-ash', name: '🌋 Volcanic Ash', preview: 'linear-gradient(135deg, #1a0800, #2a1005)',
            vars: {
                '--bg-primary': '#120500', '--bg-secondary': '#1e0a00', '--bg-card': 'rgba(30,10,0,0.9)',
                '--bg-card-hover': 'rgba(48,18,5,0.95)', '--accent-red': '#ff5500', '--accent-red-glow': 'rgba(255,85,0,0.5)',
                '--border-glow': 'rgba(200,80,0,0.35)', '--text-primary': '#f0d0b0', '--text-secondary': '#aa6633',
            }
        },
        {
            id: 'tsunami', name: '🌊 Tsunami', preview: 'linear-gradient(135deg, #001020, #002040)',
            vars: {
                '--bg-primary': '#000a18', '--bg-secondary': '#001428', '--bg-card': 'rgba(0,20,40,0.9)',
                '--bg-card-hover': 'rgba(0,32,60,0.95)', '--accent-red': '#22aadd', '--accent-red-glow': 'rgba(34,170,221,0.45)',
                '--border-glow': 'rgba(34,170,221,0.3)', '--text-primary': '#b0e0f8', '--text-secondary': '#4488aa',
            }
        },
        {
            id: 'sandstorm', name: '🏜️ Sandstorm', preview: 'linear-gradient(135deg, #1a1408, #2a2010)',
            vars: {
                '--bg-primary': '#141008', '--bg-secondary': '#1e1a0e', '--bg-card': 'rgba(30,26,14,0.9)',
                '--bg-card-hover': 'rgba(48,42,22,0.95)', '--accent-red': '#cc9944', '--accent-red-glow': 'rgba(204,153,68,0.45)',
                '--border-glow': 'rgba(204,153,68,0.3)', '--text-primary': '#f0e0c0', '--text-secondary': '#998855',
            }
        },
        {
            id: 'blizzard', name: '🌨️ Blizzard', preview: 'linear-gradient(135deg, #0a1020, #102038)',
            vars: {
                '--bg-primary': '#080e1a', '--bg-secondary': '#0e1828', '--bg-card': 'rgba(14,24,40,0.9)',
                '--bg-card-hover': 'rgba(22,38,62,0.95)', '--accent-red': '#aaccee', '--accent-red-glow': 'rgba(170,204,238,0.35)',
                '--border-glow': 'rgba(170,204,238,0.25)', '--text-primary': '#e0eef8', '--text-secondary': '#6688aa',
            }
        },
        {
            id: 'solar-flare', name: '☀️ Solar Flare', preview: 'linear-gradient(135deg, #1a0800, #3a1000)',
            vars: {
                '--bg-primary': '#1a0600', '--bg-secondary': '#280c00', '--bg-card': 'rgba(40,12,0,0.9)',
                '--bg-card-hover': 'rgba(60,18,0,0.95)', '--accent-red': '#ffaa22', '--accent-red-glow': 'rgba(255,170,34,0.55)',
                '--border-glow': 'rgba(255,170,34,0.4)', '--text-primary': '#ffe8b0', '--text-secondary': '#cc8833',
            }
        },
        // ──────── EXOTIC ────────
        {
            id: 'cyberpunk-horror', name: '🤖 Cyberpunk Horror', preview: 'linear-gradient(135deg, #0a0020, #001a1a)',
            vars: {
                '--bg-primary': '#08001a', '--bg-secondary': '#001515', '--bg-card': 'rgba(8,0,26,0.9)',
                '--bg-card-hover': 'rgba(0,22,22,0.95)', '--accent-red': '#ff00ff', '--accent-red-glow': 'rgba(255,0,255,0.45)',
                '--border-glow': 'rgba(0,255,255,0.3)', '--text-primary': '#e0c0ff', '--text-secondary': '#8855cc',
            }
        },
        {
            id: 'steampunk-terror', name: '⚙️ Steampunk Terror', preview: 'linear-gradient(135deg, #1a1008, #2a1a0a)',
            vars: {
                '--bg-primary': '#120a05', '--bg-secondary': '#1e1408', '--bg-card': 'rgba(30,20,8,0.9)',
                '--bg-card-hover': 'rgba(48,32,14,0.95)', '--accent-red': '#cc8833', '--accent-red-glow': 'rgba(204,136,51,0.45)',
                '--border-glow': 'rgba(204,136,51,0.3)', '--text-primary': '#e8d8b8', '--text-secondary': '#907850',
            }
        },
        {
            id: 'gothic-cathedral', name: '⛪ Gothic Cathedral', preview: 'linear-gradient(135deg, #0a0510, #150a1a)',
            vars: {
                '--bg-primary': '#080410', '--bg-secondary': '#100818', '--bg-card': 'rgba(16,8,24,0.9)',
                '--bg-card-hover': 'rgba(26,14,38,0.95)', '--accent-red': '#9966cc', '--accent-red-glow': 'rgba(153,102,204,0.4)',
                '--border-glow': 'rgba(153,102,204,0.3)', '--text-primary': '#d8c8f0', '--text-secondary': '#7a5aaa',
            }
        },
        {
            id: 'victorian-seance', name: '🕯️ Victorian Séance', preview: 'linear-gradient(135deg, #100808, #1a1010)',
            vars: {
                '--bg-primary': '#0e0808', '--bg-secondary': '#181010', '--bg-card': 'rgba(24,16,16,0.9)',
                '--bg-card-hover': 'rgba(38,26,26,0.95)', '--accent-red': '#cc9966', '--accent-red-glow': 'rgba(204,153,102,0.4)',
                '--border-glow': 'rgba(204,153,102,0.25)', '--text-primary': '#e8d8c8', '--text-secondary': '#8a7a6a',
            }
        },
        {
            id: 'alien-hive', name: '👽 Alien Hive', preview: 'linear-gradient(135deg, #001a0a, #002a10)',
            vars: {
                '--bg-primary': '#001208', '--bg-secondary': '#001e0e', '--bg-card': 'rgba(0,30,14,0.9)',
                '--bg-card-hover': 'rgba(0,48,22,0.95)', '--accent-red': '#33ff88', '--accent-red-glow': 'rgba(51,255,136,0.45)',
                '--border-glow': 'rgba(51,255,136,0.3)', '--text-primary': '#b0f0c8', '--text-secondary': '#448866',
            }
        },
        {
            id: 'underwater-abyss', name: '🐙 Underwater Abyss', preview: 'linear-gradient(135deg, #000818, #001030)',
            vars: {
                '--bg-primary': '#000610', '--bg-secondary': '#000c20', '--bg-card': 'rgba(0,12,32,0.9)',
                '--bg-card-hover': 'rgba(0,20,50,0.95)', '--accent-red': '#2288bb', '--accent-red-glow': 'rgba(34,136,187,0.45)',
                '--border-glow': 'rgba(34,136,187,0.3)', '--text-primary': '#a0d0e8', '--text-secondary': '#3a7a9a',
            }
        },
        // ──────── GRADIENT DUOS ────────
        {
            id: 'magma-midnight', name: '🌑 Magma & Midnight', preview: 'linear-gradient(135deg, #1a0500, #050520)',
            vars: {
                '--bg-primary': '#0a0310', '--bg-secondary': '#150510', '--bg-card': 'rgba(21,5,16,0.9)',
                '--bg-card-hover': 'rgba(34,8,26,0.95)', '--accent-red': '#ff4400', '--accent-red-glow': 'rgba(255,68,0,0.5)',
                '--border-glow': 'rgba(80,40,180,0.3)', '--text-primary': '#f0c8d0', '--text-secondary': '#aa5566',
            }
        },
        {
            id: 'poison-bone', name: '☠️ Poison & Bone', preview: 'linear-gradient(135deg, #051a05, #1a1a14)',
            vars: {
                '--bg-primary': '#040e04', '--bg-secondary': '#0a180a', '--bg-card': 'rgba(10,24,10,0.9)',
                '--bg-card-hover': 'rgba(16,38,16,0.95)', '--accent-red': '#44dd44', '--accent-red-glow': 'rgba(68,221,68,0.4)',
                '--border-glow': 'rgba(200,200,180,0.2)', '--text-primary': '#d0e8d0', '--text-secondary': '#668866',
            }
        },
        {
            id: 'neon-void', name: '💜 Neon & Void', preview: 'linear-gradient(135deg, #000000, #1a002a)',
            vars: {
                '--bg-primary': '#020004', '--bg-secondary': '#080010', '--bg-card': 'rgba(8,0,16,0.9)',
                '--bg-card-hover': 'rgba(14,0,28,0.95)', '--accent-red': '#dd22ff', '--accent-red-glow': 'rgba(221,34,255,0.5)',
                '--border-glow': 'rgba(221,34,255,0.35)', '--text-primary': '#e8c0ff', '--text-secondary': '#8844aa',
            }
        },
        {
            id: 'gold-shadow', name: '✨ Gold & Shadow', preview: 'linear-gradient(135deg, #000000, #1a1200)',
            vars: {
                '--bg-primary': '#030200', '--bg-secondary': '#0a0800', '--bg-card': 'rgba(10,8,0,0.9)',
                '--bg-card-hover': 'rgba(18,14,0,0.95)', '--accent-red': '#ddaa22', '--accent-red-glow': 'rgba(221,170,34,0.5)',
                '--border-glow': 'rgba(221,170,34,0.3)', '--text-primary': '#f0e0b0', '--text-secondary': '#998844',
            }
        },
        {
            id: 'ruby-smoke', name: '💎 Ruby & Smoke', preview: 'linear-gradient(135deg, #1a0008, #0a0a0a)',
            vars: {
                '--bg-primary': '#0a0004', '--bg-secondary': '#140008', '--bg-card': 'rgba(20,0,8,0.9)',
                '--bg-card-hover': 'rgba(34,0,14,0.95)', '--accent-red': '#ee2244', '--accent-red-glow': 'rgba(238,34,68,0.5)',
                '--border-glow': 'rgba(120,120,120,0.2)', '--text-primary': '#f0c8d0', '--text-secondary': '#995566',
            }
        },
        {
            id: 'emerald-death', name: '💚 Emerald & Death', preview: 'linear-gradient(135deg, #001a08, #0a0a08)',
            vars: {
                '--bg-primary': '#000e04', '--bg-secondary': '#001a0a', '--bg-card': 'rgba(0,26,10,0.9)',
                '--bg-card-hover': 'rgba(0,42,16,0.95)', '--accent-red': '#22cc66', '--accent-red-glow': 'rgba(34,204,102,0.45)',
                '--border-glow': 'rgba(34,204,102,0.3)', '--text-primary': '#c0f0d0', '--text-secondary': '#448855',
            }
        },
        {
            id: 'sapphire-blood', name: '💙 Sapphire & Blood', preview: 'linear-gradient(135deg, #000a20, #1a0008)',
            vars: {
                '--bg-primary': '#000818', '--bg-secondary': '#0a0010', '--bg-card': 'rgba(5,4,20,0.9)',
                '--bg-card-hover': 'rgba(10,8,34,0.95)', '--accent-red': '#3366ee', '--accent-red-glow': 'rgba(51,102,238,0.45)',
                '--border-glow': 'rgba(200,30,30,0.25)', '--text-primary': '#c0d0f8', '--text-secondary': '#5566aa',
            }
        },
        {
            id: 'amethyst-flame', name: '🔮 Amethyst & Flame', preview: 'linear-gradient(135deg, #100020, #200800)',
            vars: {
                '--bg-primary': '#0a0018', '--bg-secondary': '#180410', '--bg-card': 'rgba(18,2,16,0.9)',
                '--bg-card-hover': 'rgba(30,6,26,0.95)', '--accent-red': '#aa44ff', '--accent-red-glow': 'rgba(170,68,255,0.5)',
                '--border-glow': 'rgba(255,100,0,0.25)', '--text-primary': '#e0c8ff', '--text-secondary': '#8855bb',
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
        { id: 'spiders', name: '🕷️ Crawling Spiders', desc: 'Spiders crawl across screen' },
        { id: 'shadowhand', name: '✋ Shadow Hands', desc: 'Hands reach from the edges' },
        { id: 'candle', name: '🕯️ Flickering Candle', desc: 'Warm candlelight flicker' },
        { id: 'firesparks', name: '🎆 Fire Sparks', desc: 'Rising fire sparks' },
        { id: 'frozenscreen', name: '❄️ Frozen Screen', desc: 'Ice crystals creeping' },
        { id: 'matrixrain', name: '💚 Matrix Rain', desc: 'Falling green code' },
        { id: 'smokefog', name: '💨 Smoke', desc: 'Drifting dark smoke' },
        { id: 'earthquake', name: '🌋 Earthquake', desc: 'Subtle screen shake' },
        { id: 'pentagram', name: '⛧ Pentagram', desc: 'Spinning pentagram overlay' },
        { id: 'demoneyes', name: '😈 Demon Eyes', desc: 'Red eyes watching' },
        { id: 'neonpulse', name: '🌈 Neon Pulse', desc: 'Pulsing neon border' },
        { id: 'toxicspill', name: '☣️ Toxic Spill', desc: 'Green ooze from bottom' },
        { id: 'swarm', name: '🦇 Bat Swarm', desc: 'Bats flying across screen' },
        // ──────── WEATHER ────────
        { id: 'thunderstorm', name: '⛈️ Thunderstorm', desc: 'Lightning flashes & rain' },
        { id: 'tornado', name: '🌪️ Tornado Debris', desc: 'Swirling debris particles' },
        { id: 'duststorm', name: '🏜️ Dust Storm', desc: 'Sandy haze overlay' },
        { id: 'heatshimmer', name: '☀️ Heat Shimmer', desc: 'Wavering heat distortion' },
        { id: 'ashfall', name: '🌨️ Ash Fall', desc: 'Falling grey ash' },
        { id: 'floodrise', name: '🌊 Flood Rising', desc: 'Water rising from bottom' },
        // ──────── CREATURES ────────
        { id: 'cockroach', name: '🐛 Cockroach Swarm', desc: 'Roaches scurry on screen' },
        { id: 'wormcrawl', name: '🪱 Worm Crawl', desc: 'Worms crawling slowly' },
        { id: 'snakeslither', name: '🐍 Snake Slither', desc: 'Snakes slither across edges' },
        { id: 'webgrow', name: '🕸️ Web Grow', desc: 'Cobwebs spreading in corners' },
        { id: 'crabskitter', name: '🦀 Crab Skitter', desc: 'Crabs crawling on screen' },
        // ──────── SUPERNATURAL ────────
        { id: 'shadowfigure', name: '👤 Shadow Figure', desc: 'Figure stalks across screen' },
        { id: 'skullflash', name: '💀 Skull Flash', desc: 'Skulls flash briefly' },
        { id: 'ghostflyby', name: '👻 Ghost Fly-by', desc: 'Ghosts fly past quickly' },
        { id: 'crystalball', name: '🔮 Crystal Ball', desc: 'Pulsing mystic orb' },
        { id: 'coffincreak', name: '⚰️ Coffin Creak', desc: 'Coffin lid slowly opens' },
        // ──────── TECH/GLITCH ────────
        { id: 'signallost', name: '📡 Signal Lost', desc: 'No signal static bursts' },
        { id: 'bsodflash', name: '🖥️ BSOD Flash', desc: 'Blue screen of death flash' },
        { id: 'vhsrewind', name: '📼 VHS Rewind', desc: 'VHS rewind distortion' },
        { id: 'recording', name: '🔴 Recording', desc: 'REC indicator blinking' },
        { id: 'datacorrupt', name: '💾 Data Corrupt', desc: 'Pixel corruption bursts' },
        // ──────── BODY HORROR ────────
        { id: 'beatingheart', name: '🫀 Beating Heart', desc: 'Pulsing heart overlay' },
        { id: 'arterypulse', name: '🩸 Artery Pulse', desc: 'Red veins pulse at edges' },
        { id: 'irisdilate', name: '👁️ Iris Dilate', desc: 'Giant eye iris dilating' },
        { id: 'breathingfog', name: '🫁 Breathing Fog', desc: 'Rhythmic breath fog' },
        { id: 'teethchatter', name: '🦷 Teeth Chatter', desc: 'Jaw clicking at edges' },
        // ──────── CINEMATIC ────────
        { id: 'heavygrain', name: '🎬 Heavy Grain', desc: 'Intense film grain' },
        { id: 'projectorflick', name: '📽️ Projector Flicker', desc: 'Old projector artifacts' },
        { id: 'letterbox', name: '🎞️ Letterbox', desc: 'Cinematic black bars' },
        { id: 'flashlightcone', name: '🔦 Flashlight Cone', desc: 'Moving spotlight cone' },
        { id: 'totaleclipse', name: '🌑 Total Eclipse', desc: 'Darkening halo effect' },
    ];

    // ======================== EFFECT COMBOS ========================
    const EFFECT_COMBOS = [
        { id: 'abandoned-hospital', name: '🏥 Abandoned Hospital', effects: ['flicker', 'heartbeat', 'static', 'fog'] },
        { id: 'found-footage', name: '📹 Found Footage', effects: ['vhsrewind', 'heavygrain', 'recording', 'chromatic'] },
        { id: 'demon-portal', name: '👹 Demon Portal', effects: ['pentagram', 'firesparks', 'earthquake', 'vignette'] },
        { id: 'deep-sea', name: '🌊 Deep Sea Terror', effects: ['fog', 'heartbeat', 'breathingfog', 'vignette'] },
        { id: 'cyber-nightmare', name: '💻 Cyber Nightmare', effects: ['matrixrain', 'glitch', 'neonpulse', 'signallost'] },
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

            // Spiders crawling
            if (id === 'spiders') {
                for (let i = 0; i < 6; i++) {
                    const spider = document.createElement('div');
                    spider.className = 'fx-spider';
                    spider.style.left = Math.random() * 100 + '%';
                    spider.style.top = Math.random() * 100 + '%';
                    spider.style.animationDelay = Math.random() * 5 + 's';
                    spider.style.animationDuration = (8 + Math.random() * 8) + 's';
                    el.appendChild(spider);
                }
            }

            // Shadow hands reaching
            if (id === 'shadowhand') {
                const positions = ['left', 'right', 'bottom'];
                positions.forEach((pos, i) => {
                    const hand = document.createElement('div');
                    hand.className = 'fx-shadowhand fx-shadowhand-' + pos;
                    hand.style.animationDelay = (i * 2 + Math.random() * 3) + 's';
                    el.appendChild(hand);
                });
            }

            // Candle flicker overlay
            if (id === 'candle') {
                const glow = document.createElement('div');
                glow.className = 'fx-candle-glow';
                el.appendChild(glow);
            }

            // Fire sparks
            if (id === 'firesparks') {
                for (let i = 0; i < 20; i++) {
                    const spark = document.createElement('div');
                    spark.className = 'fx-spark';
                    spark.style.left = Math.random() * 100 + '%';
                    spark.style.animationDelay = Math.random() * 3 + 's';
                    spark.style.animationDuration = (1 + Math.random() * 2) + 's';
                    el.appendChild(spark);
                }
            }

            // Matrix rain
            if (id === 'matrixrain') {
                for (let i = 0; i < 30; i++) {
                    const drop = document.createElement('div');
                    drop.className = 'fx-matrix-drop';
                    drop.style.left = Math.random() * 100 + '%';
                    drop.style.animationDelay = Math.random() * 4 + 's';
                    drop.style.animationDuration = (2 + Math.random() * 3) + 's';
                    drop.textContent = String.fromCharCode(0x30A0 + Math.random() * 96);
                    el.appendChild(drop);
                }
            }

            // Demon eyes (red pairs)
            if (id === 'demoneyes') {
                for (let i = 0; i < 4; i++) {
                    const pair = document.createElement('div');
                    pair.className = 'fx-demon-eye-pair';
                    pair.style.left = (10 + Math.random() * 80) + '%';
                    pair.style.top = (10 + Math.random() * 80) + '%';
                    pair.style.animationDelay = (Math.random() * 6) + 's';
                    pair.style.animationDuration = (3 + Math.random() * 5) + 's';
                    pair.innerHTML = '<span class="fx-demon-eye"></span><span class="fx-demon-eye"></span>';
                    el.appendChild(pair);
                }
            }

            // Bat swarm
            if (id === 'swarm') {
                for (let i = 0; i < 8; i++) {
                    const bat = document.createElement('div');
                    bat.className = 'fx-bat';
                    bat.style.top = Math.random() * 80 + '%';
                    bat.style.animationDelay = Math.random() * 6 + 's';
                    bat.style.animationDuration = (3 + Math.random() * 4) + 's';
                    bat.textContent = '🦇';
                    el.appendChild(bat);
                }
            }

            // Toxic spill
            if (id === 'toxicspill') {
                for (let i = 0; i < 6; i++) {
                    const drip = document.createElement('div');
                    drip.className = 'fx-toxic-drip';
                    drip.style.left = (5 + Math.random() * 90) + '%';
                    drip.style.animationDelay = Math.random() * 5 + 's';
                    drip.style.animationDuration = (4 + Math.random() * 4) + 's';
                    el.appendChild(drip);
                }
            }

            // Frozen screen ice crystals
            if (id === 'frozenscreen') {
                for (let i = 0; i < 12; i++) {
                    const crystal = document.createElement('div');
                    crystal.className = 'fx-ice-crystal';
                    crystal.style.left = Math.random() * 100 + '%';
                    crystal.style.top = Math.random() * 100 + '%';
                    crystal.style.animationDelay = Math.random() * 3 + 's';
                    crystal.textContent = '❄';
                    el.appendChild(crystal);
                }
            }

            // Thunderstorm
            if (id === 'thunderstorm') {
                for (let i = 0; i < 50; i++) {
                    const drop = document.createElement('div');
                    drop.className = 'fx-storm-drop';
                    drop.style.left = Math.random() * 100 + '%';
                    drop.style.animationDelay = Math.random() * 1.5 + 's';
                    drop.style.animationDuration = (0.3 + Math.random() * 0.4) + 's';
                    el.appendChild(drop);
                }
                const flash = document.createElement('div');
                flash.className = 'fx-lightning-flash';
                el.appendChild(flash);
            }

            // Tornado debris
            if (id === 'tornado') {
                for (let i = 0; i < 15; i++) {
                    const debris = document.createElement('div');
                    debris.className = 'fx-debris';
                    debris.style.animationDelay = Math.random() * 4 + 's';
                    debris.style.animationDuration = (2 + Math.random() * 3) + 's';
                    debris.textContent = ['🍂', '🪨', '📄', '🌿', '💀'][Math.floor(Math.random() * 5)];
                    el.appendChild(debris);
                }
            }

            // Ash fall
            if (id === 'ashfall') {
                for (let i = 0; i < 40; i++) {
                    const ash = document.createElement('div');
                    ash.className = 'fx-ash';
                    ash.style.left = Math.random() * 100 + '%';
                    ash.style.animationDelay = Math.random() * 5 + 's';
                    ash.style.animationDuration = (3 + Math.random() * 4) + 's';
                    ash.style.opacity = 0.3 + Math.random() * 0.5;
                    el.appendChild(ash);
                }
            }

            // Cockroach swarm
            if (id === 'cockroach') {
                for (let i = 0; i < 10; i++) {
                    const bug = document.createElement('div');
                    bug.className = 'fx-cockroach';
                    bug.style.left = Math.random() * 100 + '%';
                    bug.style.top = Math.random() * 100 + '%';
                    bug.style.animationDelay = Math.random() * 6 + 's';
                    bug.style.animationDuration = (3 + Math.random() * 5) + 's';
                    bug.textContent = '🪳';
                    el.appendChild(bug);
                }
            }

            // Snake slither
            if (id === 'snakeslither') {
                for (let i = 0; i < 4; i++) {
                    const snake = document.createElement('div');
                    snake.className = 'fx-snake';
                    snake.style.top = (20 + Math.random() * 60) + '%';
                    snake.style.animationDelay = (i * 3 + Math.random() * 2) + 's';
                    snake.style.animationDuration = (5 + Math.random() * 4) + 's';
                    snake.textContent = '🐍';
                    el.appendChild(snake);
                }
            }

            // Web grow
            if (id === 'webgrow') {
                ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach((pos, i) => {
                    const web = document.createElement('div');
                    web.className = 'fx-web fx-web-' + pos;
                    web.style.animationDelay = (i * 1.5) + 's';
                    web.textContent = '🕸️';
                    el.appendChild(web);
                });
            }

            // Shadow figure
            if (id === 'shadowfigure') {
                const figure = document.createElement('div');
                figure.className = 'fx-shadow-figure';
                el.appendChild(figure);
            }

            // Skull flash
            if (id === 'skullflash') {
                const skull = document.createElement('div');
                skull.className = 'fx-skull-flash';
                skull.textContent = '💀';
                el.appendChild(skull);
            }

            // Ghost fly-by
            if (id === 'ghostflyby') {
                for (let i = 0; i < 3; i++) {
                    const ghost = document.createElement('div');
                    ghost.className = 'fx-ghost-flyby';
                    ghost.style.top = (10 + Math.random() * 70) + '%';
                    ghost.style.animationDelay = (i * 4 + Math.random() * 2) + 's';
                    ghost.style.animationDuration = (2 + Math.random() * 2) + 's';
                    ghost.textContent = '👻';
                    el.appendChild(ghost);
                }
            }

            // Crystal ball pulse
            if (id === 'crystalball') {
                const orb = document.createElement('div');
                orb.className = 'fx-crystal-orb';
                orb.textContent = '🔮';
                el.appendChild(orb);
            }

            // Recording indicator
            if (id === 'recording') {
                const rec = document.createElement('div');
                rec.className = 'fx-rec-indicator';
                rec.innerHTML = '<span class="fx-rec-dot"></span> REC';
                el.appendChild(rec);
            }

            // Data corrupt
            if (id === 'datacorrupt') {
                for (let i = 0; i < 8; i++) {
                    const block = document.createElement('div');
                    block.className = 'fx-corrupt-block';
                    block.style.left = Math.random() * 100 + '%';
                    block.style.top = Math.random() * 100 + '%';
                    block.style.animationDelay = Math.random() * 5 + 's';
                    block.style.animationDuration = (0.5 + Math.random() * 1) + 's';
                    el.appendChild(block);
                }
            }

            // Beating heart
            if (id === 'beatingheart') {
                const heart = document.createElement('div');
                heart.className = 'fx-beating-heart';
                heart.textContent = '🫀';
                el.appendChild(heart);
            }

            // Artery pulse
            if (id === 'arterypulse') {
                ['left', 'right', 'top', 'bottom'].forEach(side => {
                    const vein = document.createElement('div');
                    vein.className = 'fx-artery fx-artery-' + side;
                    el.appendChild(vein);
                });
            }

            // Iris dilate
            if (id === 'irisdilate') {
                const iris = document.createElement('div');
                iris.className = 'fx-iris';
                iris.innerHTML = '<div class="fx-iris-pupil"></div>';
                el.appendChild(iris);
            }

            // Letterbox
            if (id === 'letterbox') {
                const top = document.createElement('div');
                top.className = 'fx-letterbox-bar fx-letterbox-top';
                const bot = document.createElement('div');
                bot.className = 'fx-letterbox-bar fx-letterbox-bottom';
                el.appendChild(top);
                el.appendChild(bot);
            }

            // Flashlight cone
            if (id === 'flashlightcone') {
                const cone = document.createElement('div');
                cone.className = 'fx-flashlight';
                el.appendChild(cone);
                document.addEventListener('mousemove', (e) => {
                    cone.style.background = `radial-gradient(circle 200px at ${e.clientX}px ${e.clientY}px, transparent 0%, rgba(0,0,0,0.85) 100%)`;
                });
            }

            // Total eclipse
            if (id === 'totaleclipse') {
                const eclipse = document.createElement('div');
                eclipse.className = 'fx-eclipse';
                el.appendChild(eclipse);
            }

            // Crab skitter
            if (id === 'crabskitter') {
                for (let i = 0; i < 6; i++) {
                    const crab = document.createElement('div');
                    crab.className = 'fx-crab';
                    crab.style.top = (70 + Math.random() * 25) + '%';
                    crab.style.animationDelay = Math.random() * 6 + 's';
                    crab.style.animationDuration = (4 + Math.random() * 4) + 's';
                    crab.textContent = '🦀';
                    el.appendChild(crab);
                }
            }

            // Worm crawl
            if (id === 'wormcrawl') {
                for (let i = 0; i < 8; i++) {
                    const worm = document.createElement('div');
                    worm.className = 'fx-worm';
                    worm.style.left = Math.random() * 100 + '%';
                    worm.style.top = (60 + Math.random() * 35) + '%';
                    worm.style.animationDelay = Math.random() * 5 + 's';
                    worm.style.animationDuration = (4 + Math.random() * 4) + 's';
                    worm.textContent = '🪱';
                    el.appendChild(worm);
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
