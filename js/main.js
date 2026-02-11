/* ============================================
   ScaryGamesAI — Main JavaScript
   ============================================ */

// Tier hierarchy: none < lite < pro < max
const TIER_LEVELS = { none: 0, lite: 1, pro: 2, max: 3 };
const TIER_NAMES = { lite: 'Survivor 🩹', pro: 'Hunter 🗡️', max: 'Elder God 🜏' };
const QUALITY_INFO = {
    none: { label: 'Standard', icon: '🎮', cls: 'quality-standard' },
    lite: { label: 'Standard', icon: '🎮', cls: 'quality-standard' },
    pro: { label: 'Ray Tracing', icon: '💠', cls: 'quality-rt' },
    max: { label: 'Path Tracing', icon: '✨', cls: 'quality-pt' },
};

function getUserTier() {
    return localStorage.getItem('sgai-sub-tier') || 'none';
}

function getQualityForTier() {
    return QUALITY_INFO[getUserTier()] || QUALITY_INFO.none;
}

function canAccessGame(game) {
    const userLevel = TIER_LEVELS[getUserTier()] || 0;
    const reqLevel = TIER_LEVELS[game.requiredTier || 'none'] || 0;
    return userLevel >= reqLevel;
}

const GAMES = [
    {
        id: 'backrooms-pacman',
        title: 'Backrooms: Pac-Man',
        desc: 'Trapped in the backrooms. A giant Pac-Man hunts you through endless yellow corridors. Collect all pellets to escape — or be consumed.',
        tags: ['3D', 'First Person', 'Horror'],
        tagClasses: ['tag-3d', 'tag-fps', 'tag-horror'],
        url: '/games/backrooms-pacman/',
        color: '#ccaa00',
        bgColor: '#2a2400',
        difficulty: 3, category: 'action', requiredTier: 'none',
    },
    {
        id: 'shadow-crawler',
        title: 'Shadow Crawler',
        desc: 'Your torch is dying. Shadow creatures lurk just beyond the light. Find the keys, unlock the doors, and escape the dungeon before darkness consumes you.',
        tags: ['2D', 'Horror', 'Survival'],
        tagClasses: ['tag-2d', 'tag-horror', 'tag-survival'],
        url: '/games/shadow-crawler/',
        color: '#8b5cf6',
        bgColor: '#1a1030',
        difficulty: 2, category: 'action', requiredTier: 'none',
    },
    {
        id: 'the-abyss',
        title: 'The Abyss',
        desc: 'Dive into the deepest ocean trench. Ancient creatures circle in the darkness below. Collect artifacts before your oxygen runs out.',
        tags: ['3D', 'First Person', 'Horror'],
        tagClasses: ['tag-3d', 'tag-fps', 'tag-horror'],
        url: '/games/the-abyss/',
        color: '#06b6d4',
        bgColor: '#0a1a2a',
        difficulty: 3, category: 'action', requiredTier: 'none',
    },
    {
        id: 'nightmare-run',
        title: 'Nightmare Run',
        desc: 'An endless nightmare you can\'t wake from. Run through twisted landscapes, dodge horrifying obstacles, and survive as long as you can.',
        tags: ['2D', 'Horror', 'Survival'],
        tagClasses: ['tag-2d', 'tag-horror', 'tag-survival'],
        url: '/games/nightmare-run/',
        color: '#ff6b35',
        bgColor: '#2a1400',
        difficulty: 2, category: 'action', requiredTier: 'pro',
    },
    {
        id: 'yeti-run',
        title: 'Yeti Run',
        desc: 'A massive Yeti is chasing you through frozen mountains. Dodge obstacles, sprint for your life, and survive the blizzard. Don\'t look back.',
        tags: ['3D', 'Horror', 'Survival'],
        tagClasses: ['tag-3d', 'tag-horror', 'tag-survival'],
        url: '/games/yeti-run/',
        color: '#88ccff',
        bgColor: '#0a1520',
        difficulty: 3, category: 'action', requiredTier: 'pro',
    },
    // ===== PHASE 2 — NEW GAMES =====
    {
        id: 'blood-tetris',
        title: 'Blood Tetris',
        desc: 'Stack bones, eyeballs, and organs. Clear lines as blood rises from below. How long can you survive the crimson tide?',
        tags: ['2D', 'Puzzle', 'Horror'],
        tagClasses: ['tag-2d', 'tag-puzzle', 'tag-horror'],
        url: '/games/blood-tetris/',
        color: '#cc2222',
        bgColor: '#1a0505',
        difficulty: 2, category: 'puzzle', isNew: true, requiredTier: 'pro',
    },
    {
        id: 'seance',
        title: 'Séance',
        desc: 'Use the spirit board to communicate with trapped souls. Spell their names to free them — anger them and face terrible consequences.',
        tags: ['2D', 'Puzzle', 'Horror'],
        tagClasses: ['tag-2d', 'tag-puzzle', 'tag-horror'],
        url: '/games/seance/',
        color: '#cc8833',
        bgColor: '#1a0e05',
        difficulty: 2, category: 'puzzle', isNew: true, requiredTier: 'pro',
    },
    {
        id: 'dollhouse',
        title: 'The Dollhouse',
        desc: 'Explore 5 rooms of a cursed dollhouse. Find items, solve puzzles, and escape before the living dolls catch you.',
        tags: ['2D', 'Puzzle', 'Horror'],
        tagClasses: ['tag-2d', 'tag-puzzle', 'tag-horror'],
        url: '/games/dollhouse/',
        color: '#cc7788',
        bgColor: '#1a0a0a',
        difficulty: 3, category: 'puzzle', isNew: true, requiredTier: 'pro',
    },
    {
        id: 'zombie-horde',
        title: 'Zombie Horde',
        desc: 'Waves of undead swarm from all sides. Place turrets and barricades to defend your base. Upgrade between waves to survive.',
        tags: ['2D', 'Strategy', 'Horror'],
        tagClasses: ['tag-2d', 'tag-strategy', 'tag-horror'],
        url: '/games/zombie-horde/',
        color: '#44aa44',
        bgColor: '#0a1a0a',
        difficulty: 3, category: 'strategy', isNew: true, requiredTier: 'max',
    },
    {
        id: 'the-elevator',
        title: 'The Elevator',
        desc: 'A never-ending elevator descent. Each floor reveals a new horror. Find Floor 0 before your sanity runs out.',
        tags: ['3D', 'First Person', 'Psychological'],
        tagClasses: ['tag-3d', 'tag-fps', 'tag-psychological'],
        url: '/games/the-elevator/',
        color: '#8888cc',
        bgColor: '#0a0a15',
        difficulty: 4, category: 'action', isNew: true, requiredTier: 'max',
    },
    {
        id: 'graveyard-shift',
        title: 'Graveyard Shift',
        desc: 'Night watch at a haunted cemetery. Investigate disturbances, avoid ghosts, and survive until dawn breaks.',
        tags: ['3D', 'Stealth', 'Horror'],
        tagClasses: ['tag-3d', 'tag-stealth', 'tag-horror'],
        url: '/games/graveyard-shift/',
        color: '#446688',
        bgColor: '#050510',
        difficulty: 4, category: 'stealth', isNew: true, requiredTier: 'max',
    },
    {
        id: 'web-of-terror',
        title: 'Web of Terror',
        desc: 'Spider-infested mines. Navigate procedural tunnels filled with webs, avoid spider swarms, and find all keys to escape.',
        tags: ['3D', 'First Person', 'Horror'],
        tagClasses: ['tag-3d', 'tag-fps', 'tag-horror'],
        url: '/games/web-of-terror/',
        color: '#aa6633',
        bgColor: '#0a0800',
        difficulty: 5, category: 'action', isNew: true, requiredTier: 'max',
    },
    {
        id: 'total-zombies-medieval',
        title: 'Total Zombies Medieval',
        desc: 'Command your medieval army in epic Total War-style battles against an undead zombie horde. Select troops, form battle lines, and crush the enemy!',
        tags: ['3D', 'Strategy', 'Horror'],
        tagClasses: ['tag-3d', 'tag-strategy', 'tag-horror'],
        url: '/games/total-zombies-medieval/',
        color: '#cc6622',
        bgColor: '#1a0e05',
        difficulty: 4, category: 'strategy', isNew: true, requiredTier: 'max',
    },
    {
        id: 'cursed-depths',
        title: 'Cursed Depths',
        desc: 'A Terraria-style 2D sandbox horror game. Dig into cursed earth, mine ores, craft weapons, fight demons, and survive 5 terrifying biomes. How deep can you go?',
        tags: ['2D', 'Sandbox', 'Horror'],
        tagClasses: ['tag-2d', 'tag-survival', 'tag-horror'],
        url: '/games/cursed-depths/',
        color: '#CC1133',
        bgColor: '#0a0008',
        difficulty: 4, category: 'action', isNew: true, requiredTier: 'none',
    },
    // ===== NEW GAMES =====
    {
        id: 'freddys-nightmare',
        title: "Freddy's Nightmare",
        desc: "You're the night security guard at an abandoned pizzeria. Monitor cameras, close doors, manage power, and survive five nights against four killer animatronics.",
        tags: ['2D', 'Horror', 'FNAF'],
        tagClasses: ['tag-2d', 'tag-horror', 'tag-survival'],
        url: '/games/freddys-nightmare/',
        color: '#8B4513',
        bgColor: '#1a0e05',
        difficulty: 4, category: 'action', isNew: true, requiredTier: 'none',
    },
    {
        id: 'haunted-asylum',
        title: 'Haunted Asylum',
        desc: 'Explore a procedurally generated abandoned asylum. Find 3 fuse boxes, collect medical records, and escape before the patients catch you. Watch your sanity.',
        tags: ['2D', 'Horror', 'Exploration'],
        tagClasses: ['tag-2d', 'tag-horror', 'tag-survival'],
        url: '/games/haunted-asylum/',
        color: '#44aa66',
        bgColor: '#0a1a0e',
        difficulty: 3, category: 'action', isNew: true, requiredTier: 'none',
    },
    {
        id: 'ritual-circle',
        title: 'Ritual Circle',
        desc: 'Defend a summoning circle from 10 waves of cultists and demons. Place occult traps, cast exorcism spells, and complete the ancient ritual.',
        tags: ['2D', 'Strategy', 'Horror'],
        tagClasses: ['tag-2d', 'tag-strategy', 'tag-horror'],
        url: '/games/ritual-circle/',
        color: '#9944ff',
        bgColor: '#0f0520',
        difficulty: 3, category: 'strategy', isNew: true, requiredTier: 'pro',
    },
    {
        id: 'cursed-sands',
        title: 'Cursed Sands',
        desc: 'Ancient Egypt. Cursed deserts beneath a scorching sun. Explore pyramids, temples, and the Nile. Collect 7 sacred artifacts before mummies, Anubis guards, and sandstorms claim your soul.',
        tags: ['3D', 'Open World', 'Horror'],
        tagClasses: ['tag-3d', 'tag-survival', 'tag-horror'],
        url: '/games/cursed-sands/',
        color: '#d4a843',
        bgColor: '#1a1508',
        difficulty: 5, category: 'action', isNew: true, requiredTier: 'none',
    },
];

// Generate game card thumbnail on canvas
function drawCardThumb(canvas, game) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.offsetWidth || 400;
    const h = canvas.height = 200;

    // Background
    ctx.fillStyle = game.bgColor;
    ctx.fillRect(0, 0, w, h);

    // Atmospheric effects based on game
    if (game.id === 'backrooms-pacman') {
        // Yellow corridor pattern
        ctx.strokeStyle = 'rgba(204, 170, 0, 0.15)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 20; i++) {
            const x = (i / 20) * w;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let i = 0; i < 10; i++) {
            const y = (i / 10) * h;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        // Pac-Man silhouette
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(w * 0.7, h * 0.5, 40, 0.3, Math.PI * 2 - 0.3);
        ctx.lineTo(w * 0.7, h * 0.5);
        ctx.fill();
        // Dots
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(w * 0.15 + i * 30, h * 0.5, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (game.id === 'shadow-crawler') {
        // Dark with light circle
        const grd = ctx.createRadialGradient(w * 0.4, h * 0.5, 10, w * 0.4, h * 0.5, 100);
        grd.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
        // Dungeon walls
        ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.fillRect(50, 20, 20, 160);
        ctx.fillRect(150, 40, 20, 140);
        ctx.fillRect(250, 0, 20, 120);
        ctx.fillRect(100, 150, 100, 20);
    } else if (game.id === 'the-abyss') {
        // Deep water effect
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
        grd.addColorStop(1, 'rgba(0, 0, 30, 0.9)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
        // Bubbles
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = Math.random() * 6 + 2;
            ctx.strokeStyle = `rgba(6, 182, 212, ${Math.random() * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        // Bioluminescent glow
        ctx.fillStyle = 'rgba(0, 255, 200, 0.15)';
        ctx.beginPath();
        ctx.arc(w * 0.6, h * 0.6, 15, 0, Math.PI * 2);
        ctx.fill();
    } else if (game.id === 'nightmare-run') {
        // Nightmare landscape
        const grd = ctx.createLinearGradient(0, 0, w, 0);
        grd.addColorStop(0, 'rgba(255, 107, 53, 0.1)');
        grd.addColorStop(1, 'rgba(100, 0, 0, 0.3)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
        // Ground line
        ctx.strokeStyle = 'rgba(255, 107, 53, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.7);
        ctx.lineTo(w, h * 0.7);
        ctx.stroke();
        // Running figure
        ctx.fillStyle = 'rgba(255, 107, 53, 0.3)';
        ctx.fillRect(w * 0.2, h * 0.45, 8, 34);
        ctx.fillRect(w * 0.2 - 4, h * 0.45, 16, 8);
        // Obstacles
        ctx.fillStyle = 'rgba(180, 0, 0, 0.3)';
        ctx.fillRect(w * 0.5, h * 0.5, 20, 28);
        ctx.fillRect(w * 0.75, h * 0.55, 15, 22);
    } else if (game.id === 'yeti-run') {
        // Snowy mountain scene
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, 'rgba(30, 50, 80, 0.8)');
        grd.addColorStop(1, 'rgba(200, 220, 240, 0.3)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
        // Mountains
        ctx.fillStyle = 'rgba(60, 80, 100, 0.5)';
        ctx.beginPath(); ctx.moveTo(0, h * 0.6); ctx.lineTo(w * 0.3, h * 0.15); ctx.lineTo(w * 0.5, h * 0.5); ctx.lineTo(w * 0.7, h * 0.1); ctx.lineTo(w, h * 0.55); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
        // Snow caps
        ctx.fillStyle = 'rgba(220, 235, 255, 0.6)';
        ctx.beginPath(); ctx.moveTo(w * 0.25, h * 0.25); ctx.lineTo(w * 0.3, h * 0.15); ctx.lineTo(w * 0.35, h * 0.25); ctx.fill();
        ctx.beginPath(); ctx.moveTo(w * 0.65, h * 0.2); ctx.lineTo(w * 0.7, h * 0.1); ctx.lineTo(w * 0.75, h * 0.2); ctx.fill();
        // Yeti silhouette
        ctx.fillStyle = 'rgba(200,200,220,0.3)';
        ctx.beginPath(); ctx.ellipse(w * 0.7, h * 0.55, 20, 35, 0, 0, Math.PI * 2); ctx.fill();
        // Red eyes
        ctx.fillStyle = 'rgba(255,0,0,0.8)'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(w * 0.68, h * 0.45, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.72, h * 0.45, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // Snowflakes
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (let i = 0; i < 20; i++) { ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, 1.5, 0, Math.PI * 2); ctx.fill(); }
    } else if (game.id === 'blood-tetris') {
        // Blood red grid
        ctx.fillStyle = 'rgba(150,0,0,0.3)';
        for (let i = 0; i < 10; i++) for (let j = 0; j < 5; j++) {
            if (Math.random() > 0.4) ctx.fillRect(i * (w / 10) + 2, h - (j + 1) * 30, w / 10 - 4, 28);
        }
        ctx.fillStyle = 'rgba(200,0,0,0.2)'; ctx.fillRect(0, h * 0.7, w, h * 0.3);
        // Falling piece
        ctx.fillStyle = 'rgba(200,30,30,0.6)'; ctx.fillRect(w * 0.4, h * 0.15, w / 10 - 4, 28); ctx.fillRect(w * 0.4, h * 0.15 + 30, w / 10 - 4, 28);
        ctx.fillRect(w * 0.4 + w / 10, h * 0.15 + 30, w / 10 - 4, 28);
    } else if (game.id === 'seance') {
        // Spirit board wood
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, 'rgba(50,30,10,0.8)'); grd.addColorStop(1, 'rgba(30,15,5,0.9)');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
        // Letters arc
        ctx.fillStyle = 'rgba(180,130,60,0.4)'; ctx.font = '14px serif'; ctx.textAlign = 'center';
        'ABCDEFGHIJKLM'.split('').forEach((l, i) => ctx.fillText(l, w * 0.15 + i * (w * 0.7 / 13), h * 0.4));
        // Planchette
        ctx.fillStyle = 'rgba(100,60,20,0.6)'; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.55, 15, 0, Math.PI * 2); ctx.fill();
        // Candle glow
        ctx.fillStyle = 'rgba(255,180,50,0.15)'; ctx.beginPath(); ctx.arc(w * 0.1, h * 0.9, 25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.9, h * 0.9, 25, 0, Math.PI * 2); ctx.fill();
    } else if (game.id === 'dollhouse') {
        // Dollhouse rooms
        ctx.strokeStyle = 'rgba(180,100,80,0.3)'; ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.1, h * 0.15, w * 0.35, h * 0.35);
        ctx.strokeRect(w * 0.55, h * 0.15, w * 0.35, h * 0.35);
        ctx.strokeRect(w * 0.1, h * 0.5, w * 0.35, h * 0.35);
        ctx.strokeRect(w * 0.55, h * 0.5, w * 0.35, h * 0.35);
        // Doll silhouette
        ctx.fillStyle = 'rgba(200,180,170,0.3)'; ctx.beginPath(); ctx.arc(w * 0.7, h * 0.35, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(w * 0.7 - 5, h * 0.35 + 8, 10, 20);
        // Eyes
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(w * 0.68, h * 0.34, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.72, h * 0.34, 2, 0, Math.PI * 2); ctx.fill();
    } else if (game.id === 'zombie-horde') {
        // Green tinted ground
        ctx.fillStyle = 'rgba(20,40,20,0.5)'; ctx.fillRect(0, 0, w, h);
        // Base
        ctx.fillStyle = 'rgba(60,60,150,0.4)'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 18, 0, Math.PI * 2); ctx.fill();
        // Turrets
        ctx.fillStyle = 'rgba(80,140,180,0.4)'; ctx.beginPath(); ctx.arc(w * 0.3, h * 0.3, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.7, h * 0.6, 8, 0, Math.PI * 2); ctx.fill();
        // Zombies
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = 'rgba(60,150,60,0.4)'; ctx.beginPath();
            ctx.arc(Math.random() * w, Math.random() * h, 5, 0, Math.PI * 2); ctx.fill();
        }
    } else if (game.id === 'the-elevator') {
        // Dark elevator shaft
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, 'rgba(20,20,40,0.9)'); grd.addColorStop(1, 'rgba(5,5,15,0.95)');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
        // Elevator doors
        ctx.fillStyle = 'rgba(100,100,110,0.4)'; ctx.fillRect(w * 0.3, h * 0.1, w * 0.18, h * 0.7);
        ctx.fillRect(w * 0.52, h * 0.1, w * 0.18, h * 0.7);
        // Gap between doors (glow)
        ctx.fillStyle = 'rgba(200,180,100,0.15)'; ctx.fillRect(w * 0.48, h * 0.1, w * 0.04, h * 0.7);
        // Floor numbers
        ctx.fillStyle = 'rgba(200,50,50,0.4)'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
        for (let i = 0; i < 5; i++) ctx.fillText(13 - i, w * 0.8, h * 0.25 + i * 20);
    } else if (game.id === 'graveyard-shift') {
        // Night sky
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, 'rgba(10,10,30,0.9)'); grd.addColorStop(1, 'rgba(15,25,15,0.8)');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
        // Moon
        ctx.fillStyle = 'rgba(200,210,230,0.2)'; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.15, 15, 0, Math.PI * 2); ctx.fill();
        // Gravestones
        ctx.fillStyle = 'rgba(80,90,80,0.4)';
        for (let i = 0; i < 6; i++) {
            const gx = w * 0.1 + i * w * 0.15; ctx.fillRect(gx, h * 0.55, 15, 25);
            ctx.beginPath(); ctx.arc(gx + 7.5, h * 0.55, 7.5, Math.PI, 0); ctx.fill();
        }
        // Ground
        ctx.fillStyle = 'rgba(20,30,15,0.5)'; ctx.fillRect(0, h * 0.75, w, h * 0.25);
        // Ghost
        ctx.fillStyle = 'rgba(150,170,200,0.15)'; ctx.beginPath(); ctx.arc(w * 0.55, h * 0.4, 12, 0, Math.PI * 2); ctx.fill();
    } else if (game.id === 'web-of-terror') {
        // Dark mine
        ctx.fillStyle = 'rgba(15,12,5,0.9)'; ctx.fillRect(0, 0, w, h);
        // Tunnel walls
        ctx.fillStyle = 'rgba(50,35,20,0.5)'; ctx.fillRect(0, 0, w * 0.15, h); ctx.fillRect(w * 0.85, 0, w * 0.15, h);
        // Webs
        ctx.strokeStyle = 'rgba(200,200,200,0.15)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * 0.5, h * 0.3); ctx.lineTo(w, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w * 0.3, 0); ctx.lineTo(w * 0.5, h * 0.3); ctx.lineTo(w * 0.7, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, h * 0.2); ctx.lineTo(w * 0.5, h * 0.3); ctx.lineTo(w, h * 0.2); ctx.stroke();
        // Spider silhouette
        ctx.fillStyle = 'rgba(30,30,30,0.7)'; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5 + 14, 14, 0, Math.PI * 2); ctx.fill();
        // Red eyes
        ctx.fillStyle = 'rgba(255,0,0,0.7)'; ctx.beginPath(); ctx.arc(w * 0.48, h * 0.49, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.52, h * 0.49, 2, 0, Math.PI * 2); ctx.fill();
        // Torch glow
        const tGrd = ctx.createRadialGradient(w * 0.3, h * 0.7, 5, w * 0.3, h * 0.7, 50);
        tGrd.addColorStop(0, 'rgba(255,170,50,0.15)'); tGrd.addColorStop(1, 'transparent');
        ctx.fillStyle = tGrd; ctx.fillRect(0, 0, w, h);
    } else if (game.id === 'total-zombies-medieval') {
        // Medieval battlefield
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, 'rgba(40,50,30,0.9)'); grd.addColorStop(1, 'rgba(20,25,15,0.95)');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
        // Ground
        ctx.fillStyle = 'rgba(50,70,35,0.4)'; ctx.fillRect(0, h * 0.6, w, h * 0.4);
        // Blue army (left side)
        for (let i = 0; i < 12; i++) {
            ctx.fillStyle = 'rgba(50,100,200,0.6)';
            ctx.fillRect(w * 0.1 + (i % 4) * 18, h * 0.45 + Math.floor(i / 4) * 14, 8, 12);
        }
        // Red army (right side)
        for (let i = 0; i < 12; i++) {
            ctx.fillStyle = 'rgba(200,50,50,0.6)';
            ctx.fillRect(w * 0.6 + (i % 4) * 18, h * 0.45 + Math.floor(i / 4) * 14, 8, 12);
        }
        // Swords clash in center
        ctx.strokeStyle = 'rgba(200,200,200,0.4)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(w * 0.42, h * 0.3); ctx.lineTo(w * 0.48, h * 0.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w * 0.58, h * 0.3); ctx.lineTo(w * 0.52, h * 0.6); ctx.stroke();
        // Flags
        ctx.fillStyle = 'rgba(50,100,200,0.5)'; ctx.fillRect(w * 0.15, h * 0.2, 12, 8);
        ctx.fillStyle = 'rgba(200,50,50,0.5)'; ctx.fillRect(w * 0.75, h * 0.2, 12, 8);
        ctx.fillStyle = 'rgba(150,150,150,0.3)'; ctx.fillRect(w * 0.16, h * 0.2, 2, 18);
        ctx.fillRect(w * 0.76, h * 0.2, 2, 18);
    } else if (game.id === 'cursed-depths') {
        // Terraria-style underground scene
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, 'rgba(20,10,30,0.9)'); grd.addColorStop(0.3, 'rgba(40,20,15,0.9)');
        grd.addColorStop(0.7, 'rgba(60,20,20,0.9)'); grd.addColorStop(1, 'rgba(80,15,5,0.95)');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
        // Dirt/stone layers
        ctx.fillStyle = 'rgba(92,58,30,0.4)';
        for (let bx = 0; bx < w; bx += 12) for (let by = h * 0.35; by < h; by += 12) {
            if (Math.random() > 0.3) ctx.fillRect(bx, by, 11, 11);
        }
        // Ores
        ctx.fillStyle = 'rgba(255,215,0,0.5)';
        ctx.fillRect(w * 0.6, h * 0.5, 8, 8); ctx.fillRect(w * 0.62, h * 0.58, 8, 8);
        ctx.fillStyle = 'rgba(204,17,51,0.5)';
        ctx.fillRect(w * 0.3, h * 0.7, 8, 8); ctx.fillRect(w * 0.32, h * 0.78, 8, 8);
        // Cave opening
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.6, 30, 20, 0, 0, Math.PI * 2); ctx.fill();
        // Player silhouette
        ctx.fillStyle = 'rgba(68,136,204,0.6)';
        ctx.fillRect(w * 0.45, h * 0.48, 8, 16);
        ctx.fillStyle = 'rgba(221,187,136,0.6)';
        ctx.fillRect(w * 0.45, h * 0.44, 8, 6);
        // Torch glow
        const tg = ctx.createRadialGradient(w * 0.45 + 12, h * 0.48, 3, w * 0.45 + 12, h * 0.48, 40);
        tg.addColorStop(0, 'rgba(255,170,50,0.3)'); tg.addColorStop(1, 'transparent');
        ctx.fillStyle = tg; ctx.fillRect(0, 0, w, h);
        // Surface grass
        ctx.fillStyle = 'rgba(45,90,30,0.5)';
        ctx.fillRect(0, h * 0.32, w, 4);
    } else if (game.id === 'freddys-nightmare') {
        // FNAF-style office
        ctx.fillStyle = 'rgba(15,10,5,0.9)'; ctx.fillRect(0, 0, w, h);
        // Office walls
        ctx.fillStyle = 'rgba(25,20,15,0.8)'; ctx.fillRect(0, 0, w * 0.12, h); ctx.fillRect(w * 0.88, 0, w * 0.12, h);
        // Desk
        ctx.fillStyle = 'rgba(42,34,24,0.6)'; ctx.fillRect(w * 0.2, h * 0.65, w * 0.6, h * 0.08);
        // Monitor
        ctx.fillStyle = 'rgba(0,20,0,0.5)'; ctx.fillRect(w * 0.35, h * 0.4, w * 0.3, h * 0.22);
        ctx.strokeStyle = 'rgba(50,50,50,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(w * 0.35, h * 0.4, w * 0.3, h * 0.22);
        // Camera scanlines
        ctx.strokeStyle = 'rgba(0,50,0,0.2)';
        for (let sl = 0; sl < 8; sl++) { ctx.beginPath(); ctx.moveTo(w * 0.35, h * 0.4 + sl * 6); ctx.lineTo(w * 0.65, h * 0.4 + sl * 6); ctx.stroke(); }
        // Animatronic silhouette
        ctx.fillStyle = 'rgba(60,30,0,0.5)'; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.48, 12, 0, Math.PI * 2); ctx.fill();
        // Red eyes
        ctx.fillStyle = 'rgba(255,50,0,0.8)'; ctx.beginPath(); ctx.arc(w * 0.48, h * 0.47, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.52, h * 0.47, 2, 0, Math.PI * 2); ctx.fill();
        // Door buttons
        ctx.fillStyle = 'rgba(255,0,0,0.3)'; ctx.beginPath(); ctx.arc(w * 0.06, h * 0.5, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.94, h * 0.5, 6, 0, Math.PI * 2); ctx.fill();
    } else if (game.id === 'haunted-asylum') {
        // Asylum corridors
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, 'rgba(10,25,15,0.95)'); grd.addColorStop(1, 'rgba(5,15,8,0.95)');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
        // Corridor perspective
        ctx.fillStyle = 'rgba(20,40,25,0.5)'; ctx.fillRect(0, 0, w * 0.18, h); ctx.fillRect(w * 0.82, 0, w * 0.18, h);
        ctx.fillStyle = 'rgba(12,20,14,0.6)'; ctx.fillRect(w * 0.18, 0, w * 0.64, h);
        // Tiled floor
        ctx.strokeStyle = 'rgba(30,50,35,0.3)'; ctx.lineWidth = 0.5;
        for (let fl = 0; fl < 10; fl++) { ctx.beginPath(); ctx.moveTo(w * 0.18, fl * h / 10); ctx.lineTo(w * 0.82, fl * h / 10); ctx.stroke(); }
        // Door at end
        ctx.fillStyle = 'rgba(40,55,40,0.5)'; ctx.fillRect(w * 0.4, h * 0.15, w * 0.2, h * 0.4);
        // Flashlight cone
        const flGrd = ctx.createRadialGradient(w * 0.5, h * 0.9, 5, w * 0.5, h * 0.5, h * 0.5);
        flGrd.addColorStop(0, 'rgba(200,255,200,0.1)'); flGrd.addColorStop(1, 'transparent');
        ctx.fillStyle = flGrd; ctx.fillRect(0, 0, w, h);
        // Patient silhouette
        ctx.fillStyle = 'rgba(80,100,80,0.3)'; ctx.beginPath(); ctx.ellipse(w * 0.45, h * 0.4, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,100,0.4)'; ctx.beginPath(); ctx.arc(w * 0.44, h * 0.38, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.46, h * 0.38, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (game.id === 'ritual-circle') {
        // Graveyard with summoning circle
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, 'rgba(10,5,20,0.95)'); grd.addColorStop(1, 'rgba(15,8,5,0.95)');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
        // Ground
        ctx.fillStyle = 'rgba(14,10,6,0.6)'; ctx.fillRect(0, h * 0.65, w, h * 0.35);
        // Tombstones
        ctx.fillStyle = 'rgba(30,25,25,0.5)';
        for (let t = 0; t < 5; t++) { const tx = w * 0.1 + t * w * 0.18; ctx.fillRect(tx, h * 0.55, 10, 18); ctx.beginPath(); ctx.arc(tx + 5, h * 0.55, 5, Math.PI, 0); ctx.fill(); }
        // Summoning circle
        ctx.strokeStyle = 'rgba(150,60,200,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, 30, 0, Math.PI * 2); ctx.stroke();
        // Pentagram
        ctx.strokeStyle = 'rgba(150,60,200,0.3)'; ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) { const a = (i * 4 * Math.PI / 5) - Math.PI / 2; const px = w * 0.5 + Math.cos(a) * 25; const py = h * 0.5 + Math.sin(a) * 25; if (i === 0) { ctx.beginPath(); ctx.moveTo(px, py); } else ctx.lineTo(px, py); }
        ctx.closePath(); ctx.stroke();
        // Glow
        const cGrd = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, 45);
        cGrd.addColorStop(0, 'rgba(150,60,200,0.15)'); cGrd.addColorStop(1, 'transparent');
        ctx.fillStyle = cGrd; ctx.fillRect(0, 0, w, h);
        // Enemies approaching
        ctx.fillStyle = 'rgba(170,60,60,0.4)'; ctx.beginPath(); ctx.arc(w * 0.15, h * 0.3, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.85, h * 0.6, 8, 0, Math.PI * 2); ctx.fill();
    } else if (game.id === 'cursed-sands') {
        // Ancient Egypt desert scene
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, 'rgba(135,180,230,0.9)'); grd.addColorStop(0.35, 'rgba(255,200,100,0.6)');
        grd.addColorStop(0.5, 'rgba(212,168,67,0.9)'); grd.addColorStop(1, 'rgba(160,120,50,0.95)');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
        // Scorching sun
        ctx.fillStyle = 'rgba(255,240,180,0.4)'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.arc(w * 0.75, h * 0.15, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,220,0.8)'; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(w * 0.75, h * 0.15, 10, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // Sand dunes
        ctx.fillStyle = 'rgba(200,160,60,0.5)';
        ctx.beginPath(); ctx.moveTo(0, h * 0.6); ctx.quadraticCurveTo(w * 0.25, h * 0.45, w * 0.5, h * 0.55);
        ctx.quadraticCurveTo(w * 0.75, h * 0.48, w, h * 0.58); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
        // Great Pyramid
        ctx.fillStyle = 'rgba(180,150,80,0.7)';
        ctx.beginPath(); ctx.moveTo(w * 0.35, h * 0.55); ctx.lineTo(w * 0.5, h * 0.2); ctx.lineTo(w * 0.65, h * 0.55); ctx.fill();
        // Smaller pyramid
        ctx.fillStyle = 'rgba(170,140,70,0.6)';
        ctx.beginPath(); ctx.moveTo(w * 0.6, h * 0.55); ctx.lineTo(w * 0.68, h * 0.35); ctx.lineTo(w * 0.76, h * 0.55); ctx.fill();
        // Obelisk
        ctx.fillStyle = 'rgba(120,110,80,0.6)'; ctx.fillRect(w * 0.18, h * 0.35, 5, 30);
        ctx.fillStyle = 'rgba(255,215,0,0.5)';
        ctx.beginPath(); ctx.moveTo(w * 0.18, h * 0.35); ctx.lineTo(w * 0.18 + 2.5, h * 0.3); ctx.lineTo(w * 0.18 + 5, h * 0.35); ctx.fill();
        // Mummy silhouette
        ctx.fillStyle = 'rgba(100,80,50,0.4)';
        ctx.beginPath(); ctx.arc(w * 0.25, h * 0.58, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(w * 0.25 - 3, h * 0.58, 6, 15);
        // Green glowing eyes
        ctx.fillStyle = 'rgba(68,255,68,0.8)'; ctx.shadowColor = '#44ff44'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(w * 0.245, h * 0.575, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.255, h * 0.575, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // Heat shimmer lines
        ctx.strokeStyle = 'rgba(255,230,150,0.1)'; ctx.lineWidth = 0.5;
        for (let sh = 0; sh < 5; sh++) { ctx.beginPath(); ctx.moveTo(0, h * 0.5 + sh * 6); ctx.bezierCurveTo(w * 0.3, h * 0.48 + sh * 6, w * 0.7, h * 0.52 + sh * 6, w, h * 0.5 + sh * 6); ctx.stroke(); }
    }

    // Vignette
    const vigGrd = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
    vigGrd.addColorStop(0, 'transparent');
    vigGrd.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vigGrd;
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = game.color;
    ctx.font = '600 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = game.color;
    ctx.shadowBlur = 15;
    ctx.fillText(game.title, w / 2, h / 2 + 6);
    ctx.shadowBlur = 0;
}

function createGameCards(filter) {
    const grids = document.querySelectorAll('#games-grid');
    grids.forEach(grid => {
        grid.innerHTML = '';
        const filtered = filter && filter !== 'all' ? GAMES.filter(g => {
            if (filter === '3d') return g.tags.includes('3D');
            if (filter === '2d') return g.tags.includes('2D');
            return g.category === filter;
        }) : GAMES;
        filtered.forEach(game => {
            const skulls = '💀'.repeat(game.difficulty || 1) + '🖤'.repeat(5 - (game.difficulty || 1));
            const newBadge = game.isNew ? '<span class="new-badge">NEW</span>' : '';
            const locked = !canAccessGame(game);
            const tierLabel = TIER_NAMES[game.requiredTier] || 'Free';
            const lockOverlay = locked ? `<div class="game-lock-overlay"><div class="game-lock-icon">🔒</div><div class="game-lock-text">Requires ${tierLabel}</div></div>` : '';
            // Quality badge based on user tier
            const quality = getQualityForTier();
            const qualityBadge = !locked ? `<span class="quality-badge ${quality.cls}">${quality.icon} ${quality.label}</span>` : '';
            const card = document.createElement('div');
            card.className = 'game-card' + (locked ? ' game-card-locked' : '');
            card.setAttribute('data-category', game.category || '');
            card.innerHTML = `
        <div class="game-card-image"><canvas></canvas>${newBadge}${lockOverlay}</div>
        <div class="game-card-body">
          <div class="game-card-tags">
            ${game.tags.map((t, i) => `<span class="tag ${game.tagClasses[i]}">${t}</span>`).join('')}
            ${qualityBadge}
          </div>
          <h3 class="game-card-title">${game.title}</h3>
          <div class="game-card-difficulty" title="Difficulty">${skulls}</div>
          <p class="game-card-desc">${game.desc}</p>
          ${locked ? `<button class="play-btn game-upgrade-btn" data-tier="${game.requiredTier}">🔒 Upgrade to Play</button>` : `<a href="${game.url}" class="play-btn">▶ Play Now</a>`}
        </div>
      `;
            grid.appendChild(card);
            const canvas = card.querySelector('canvas');
            setTimeout(() => drawCardThumb(canvas, game), 50);
            // Upgrade button click => show modal
            const upgradeBtn = card.querySelector('.game-upgrade-btn');
            if (upgradeBtn) {
                upgradeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showUpgradeModal(game.requiredTier);
                });
            }
        });
    });
}

function showUpgradeModal(tier) {
    // Remove existing modal
    const old = document.getElementById('upgrade-modal');
    if (old) old.remove();
    const tierInfo = {
        lite: { name: 'Survivor', icon: '🩹', color: '#cd7f32', price: '$2/mo' },
        pro: { name: 'Hunter', icon: '🗡️', color: '#c0c0c0', price: '$5/mo' },
        max: { name: 'Elder God', icon: '🜏', color: '#ffd700', price: '$8/mo' },
    };
    const info = tierInfo[tier] || tierInfo.lite;
    const modal = document.createElement('div');
    modal.id = 'upgrade-modal';
    modal.className = 'upgrade-modal-backdrop';
    modal.innerHTML = `
        <div class="upgrade-modal">
            <button class="upgrade-modal-close" id="upgrade-modal-close">✕</button>
            <div class="upgrade-modal-icon">${info.icon}</div>
            <h3 class="upgrade-modal-title" style="color:${info.color}">Upgrade to ${info.name}</h3>
            <p class="upgrade-modal-desc">This game requires the <strong style="color:${info.color}">${info.name}</strong> tier (${info.price}) to play. Upgrade now to unlock this and more games!</p>
            <a href="/subscription.html" class="upgrade-modal-btn" style="background:linear-gradient(135deg, ${info.color}, ${info.color}cc);">View Plans</a>
        </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('visible'));
    modal.querySelector('#upgrade-modal-close').addEventListener('click', () => {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 300);
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('visible');
            setTimeout(() => modal.remove(), 300);
        }
    });
}

function createFilterBar() {
    const gridContainer = document.querySelector('#games-grid');
    if (!gridContainer) return;
    const bar = document.createElement('div');
    bar.className = 'filter-bar';
    bar.innerHTML = `
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="3d">3D</button>
        <button class="filter-btn" data-filter="2d">2D</button>
        <button class="filter-btn" data-filter="puzzle">Puzzle</button>
        <button class="filter-btn" data-filter="action">Action</button>
        <button class="filter-btn" data-filter="strategy">Strategy</button>
        <button class="filter-btn" data-filter="stealth">Stealth</button>
    `;
    gridContainer.parentElement.insertBefore(bar, gridContainer);
    bar.addEventListener('click', function (e) {
        if (!e.target.classList.contains('filter-btn')) return;
        bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        createGameCards(e.target.getAttribute('data-filter'));
    });
}

// Create floating particles for hero
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 6 + 's';
        p.style.animationDuration = (4 + Math.random() * 4) + 's';
        const colors = ['var(--accent-red)', 'var(--accent-purple)', 'var(--accent-orange)'];
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        container.appendChild(p);
    }
}

// ============ PHASE 4: CINEMATIC HOMEPAGE ============

// Typed subtitle effect
function initTypedSubtitle() {
    const el = document.getElementById('hero-typed-subtitle');
    if (!el) return;
    const phrases = [
        'ENTER THE DARKNESS',
        'FACE YOUR FEARS',
        'NO ONE CAN HEAR YOU SCREAM',
        'THE HORROR AWAITS',
        'SURVIVE THE NIGHTMARE',
        'EMBRACE THE TERROR'
    ];
    let phraseIdx = 0, charIdx = 0, deleting = false;
    function tick() {
        const current = phrases[phraseIdx];
        if (!deleting) {
            el.textContent = current.substring(0, charIdx + 1);
            charIdx++;
            if (charIdx === current.length) {
                setTimeout(() => { deleting = true; tick(); }, 2200);
                return;
            }
            setTimeout(tick, 70 + Math.random() * 40);
        } else {
            el.textContent = current.substring(0, charIdx);
            charIdx--;
            if (charIdx < 0) {
                deleting = false;
                charIdx = 0;
                phraseIdx = (phraseIdx + 1) % phrases.length;
                setTimeout(tick, 400);
                return;
            }
            setTimeout(tick, 35);
        }
    }
    tick();
}

// Floating horror icons in hero
function initFloatingIcons() {
    const container = document.getElementById('hero-floating-icons');
    if (!container) return;
    const icons = ['💀', '👻', '🦇', '🕷️', '🩸', '⚰️', '🔪', '🧟', '👁️', '🕯️', '☠️', '🫀'];
    for (let i = 0; i < 18; i++) {
        const span = document.createElement('span');
        span.className = 'hero-float-icon';
        span.textContent = icons[i % icons.length];
        span.style.left = Math.random() * 100 + '%';
        span.style.animationDelay = (Math.random() * 12) + 's';
        span.style.animationDuration = (8 + Math.random() * 10) + 's';
        span.style.fontSize = (1 + Math.random() * 1.5) + 'rem';
        container.appendChild(span);
    }
}

// Terror counter — animate on scroll
function initTerrorCounters() {
    const counters = document.querySelectorAll('.terror-stat-number');
    if (!counters.length) return;
    let animated = false;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animated) {
                animated = true;
                counters.forEach(counter => {
                    const target = parseInt(counter.getAttribute('data-count'));
                    const duration = 2500;
                    const startTime = performance.now();
                    function update(now) {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        counter.textContent = Math.floor(target * eased).toLocaleString();
                        if (progress < 1) requestAnimationFrame(update);
                    }
                    requestAnimationFrame(update);
                });
            }
        });
    }, { threshold: 0.3 });
    const section = document.querySelector('.terror-counter-section');
    if (section) observer.observe(section);
}

// Showcase carousel
function initShowcaseCarousel() {
    const track = document.getElementById('showcase-track');
    const dotsWrap = document.getElementById('showcase-dots');
    if (!track || !dotsWrap) return;

    const spotlightGames = GAMES.filter(g => g.isNew || g.difficulty >= 4).slice(0, 5);
    if (!spotlightGames.length) return;

    spotlightGames.forEach((game, idx) => {
        const slide = document.createElement('div');
        slide.className = 'showcase-slide' + (idx === 0 ? ' active' : '');
        slide.innerHTML = `
            <div class="showcase-visual"><canvas></canvas></div>
            <div class="showcase-info">
                <div class="showcase-tags">${game.tags.map((t, i) => `<span class="tag ${game.tagClasses[i]}">${t}</span>`).join('')}</div>
                <h3 class="showcase-title">${game.title}</h3>
                <p class="showcase-desc">${game.desc}</p>
                <a href="${game.url}" class="play-btn">▶ Play Now</a>
            </div>
        `;
        track.appendChild(slide);
        const canvas = slide.querySelector('canvas');
        setTimeout(() => drawCardThumb(canvas, game), 100);

        const dot = document.createElement('button');
        dot.className = 'showcase-dot' + (idx === 0 ? ' active' : '');
        dot.setAttribute('data-idx', idx);
        dotsWrap.appendChild(dot);
    });

    let current = 0;
    function goTo(idx) {
        const slides = track.querySelectorAll('.showcase-slide');
        const dots = dotsWrap.querySelectorAll('.showcase-dot');
        slides.forEach((s, i) => s.classList.toggle('active', i === idx));
        dots.forEach((d, i) => d.classList.toggle('active', i === idx));
        current = idx;
    }

    dotsWrap.addEventListener('click', e => {
        if (e.target.classList.contains('showcase-dot')) {
            goTo(parseInt(e.target.getAttribute('data-idx')));
        }
    });
    const prevBtn = document.getElementById('showcase-prev');
    const nextBtn = document.getElementById('showcase-next');
    if (prevBtn) prevBtn.addEventListener('click', () => goTo((current - 1 + spotlightGames.length) % spotlightGames.length));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo((current + 1) % spotlightGames.length));

    // Auto-advance every 5s
    setInterval(() => goTo((current + 1) % spotlightGames.length), 5000);
}

// Scare-O-Meter
function initScareOMeter() {
    const fill = document.getElementById('scare-meter-fill');
    const needle = document.getElementById('scare-meter-needle');
    const number = document.getElementById('scare-meter-number');
    const pulse = document.getElementById('scare-meter-pulse');
    if (!fill || !number) return;

    let value = 0;
    const target = 55 + Math.floor(Math.random() * 35); // 55-89

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && value === 0) {
                const startTime = performance.now();
                function animate(now) {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / 2000, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    value = Math.floor(target * eased);
                    fill.style.width = value + '%';
                    if (needle) needle.style.left = value + '%';
                    number.textContent = value;
                    if (progress < 1) requestAnimationFrame(animate);
                    else {
                        // Pulse the value up/down randomly
                        setInterval(() => {
                            const delta = Math.floor(Math.random() * 5) - 2;
                            value = Math.max(30, Math.min(99, value + delta));
                            fill.style.width = value + '%';
                            if (needle) needle.style.left = value + '%';
                            number.textContent = value;
                        }, 1500);
                    }
                }
                requestAnimationFrame(animate);
            }
        });
    }, { threshold: 0.3 });

    const section = document.querySelector('.scare-meter-section');
    if (section) observer.observe(section);
}

// Terror Wall (testimonials)
function initTerrorWall() {
    const grid = document.getElementById('terror-wall');
    if (!grid) return;
    const testimonials = [
        { name: 'DarkSoul_99', avatar: '👤', rating: 5, text: '"I screamed so loud my neighbors called the police. 10/10 would scream again."', game: 'Backrooms: Pac-Man' },
        { name: 'NightOwl', avatar: '🦉', rating: 5, text: '"The Abyss genuinely gave me nightmares for a week. This site is NOT for the faint of heart."', game: 'The Abyss' },
        { name: 'xX_Survivor_Xx', avatar: '💀', rating: 4, text: '"Played at 3 AM. Worst decision ever. The jump scares got me EVERY time."', game: 'The Elevator' },
        { name: 'GhostHunter42', avatar: '👻', rating: 5, text: '"Graveyard Shift had me checking behind my door IRL. Absolutely terrifying atmosphere."', game: 'Graveyard Shift' },
        { name: 'ScaredStiff', avatar: '🫣', rating: 5, text: '"Web of Terror made me discover my arachnophobia was WAY worse than I thought."', game: 'Web of Terror' },
        { name: 'CryptKeeper_X', avatar: '⚰️', rating: 4, text: '"Cursed Depths ate 40 hours of my life. The deeper you go, the worse it gets."', game: 'Cursed Depths' },
    ];

    testimonials.forEach(t => {
        const card = document.createElement('div');
        card.className = 'terror-wall-card';
        const stars = '⭐'.repeat(t.rating) + '☆'.repeat(5 - t.rating);
        card.innerHTML = `
            <div class="tw-header">
                <span class="tw-avatar">${t.avatar}</span>
                <div>
                    <div class="tw-name">${t.name}</div>
                    <div class="tw-stars">${stars}</div>
                </div>
            </div>
            <p class="tw-text">${t.text}</p>
            <div class="tw-game">🎮 ${t.game}</div>
        `;
        grid.appendChild(card);
    });
}

// Newsletter form handler
function initNewsletter() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const btn = form.querySelector('.newsletter-btn');
        btn.textContent = '✅ Subscribed!';
        btn.style.background = 'linear-gradient(135deg, #00ff88, #00cc66)';
        const input = form.querySelector('.newsletter-input');
        input.value = '';
        setTimeout(() => {
            btn.textContent = '🩸 Subscribe';
            btn.style.background = '';
        }, 3000);
    });
}

// ============ PHASE 5: GAME CARD REVOLUTION ============

// 3D tilt effect on game cards (mouse + touch)
function initCardTilt() {
    var tiltAmount = 14;  // degrees

    function attachTilt(card) {
        function onMove(clientX, clientY) {
            var rect = card.getBoundingClientRect();
            var x = (clientX - rect.left) / rect.width;
            var y = (clientY - rect.top) / rect.height;
            if (x < 0 || x > 1 || y < 0 || y > 1) return;
            var rotY = (x - 0.5) * tiltAmount;
            var rotX = (y - 0.5) * -tiltAmount;
            card.style.setProperty('transform',
                'perspective(800px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) translateY(-4px) scale(1.02)',
                'important');
        }

        function onReset() {
            card.style.setProperty('transform', '', '');
        }

        // Mouse events — directly on each card
        card.addEventListener('mouseenter', function (e) { onMove(e.clientX, e.clientY); });
        card.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); });
        card.addEventListener('mouseleave', onReset);

        // Touch events
        card.addEventListener('touchmove', function (e) {
            var t = e.touches[0];
            if (t) onMove(t.clientX, t.clientY);
        }, { passive: true });
        card.addEventListener('touchend', onReset);
    }

    // Attach to existing cards
    document.querySelectorAll('.game-card').forEach(attachTilt);

    // Watch for dynamically added cards
    var observer = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
            m.addedNodes.forEach(function (node) {
                if (node.nodeType !== 1) return;
                if (node.classList && node.classList.contains('game-card')) attachTilt(node);
                else if (node.querySelectorAll) {
                    node.querySelectorAll('.game-card').forEach(attachTilt);
                }
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// Enhanced game card rendering with Phase 5 features
const ORIGINAL_createGameCards = createGameCards;
function createGameCardsEnhanced(filter) {
    const grids = document.querySelectorAll('#games-grid');
    grids.forEach(grid => {
        grid.innerHTML = '';
        const filtered = filter && filter !== 'all' ? GAMES.filter(g => {
            if (filter === '3d') return g.tags.includes('3D');
            if (filter === '2d') return g.tags.includes('2D');
            return g.category === filter;
        }) : GAMES;
        filtered.forEach(game => {
            const skulls = '💀'.repeat(game.difficulty || 1) + '🖤'.repeat(5 - (game.difficulty || 1));
            const locked = !canAccessGame(game);
            const tierLabel = TIER_NAMES[game.requiredTier] || 'Free';
            const lockOverlay = locked ? `<div class="game-lock-overlay"><div class="game-lock-icon">🔒</div><div class="game-lock-text">Requires ${tierLabel}</div></div>` : '';
            const quality = getQualityForTier();
            const qualityBadge = !locked ? `<span class="quality-badge ${quality.cls}">${quality.icon} ${quality.label}</span>` : '';

            // Phase 5: Rating stars
            const ratingStars = '⭐'.repeat(Math.min(game.difficulty || 1, 5));
            // Phase 5: Fake play count
            const playCount = Math.floor(100 + Math.random() * 900);
            // Phase 5: Ribbon
            let ribbon = '';
            if (game.requiredTier === 'none' && !game.isNew) ribbon = '<div class="card-ribbon card-ribbon-free">FREE</div>';
            else if (game.isNew) ribbon = '<div class="card-ribbon card-ribbon-new">NEW</div>';
            else if (game.difficulty >= 4) ribbon = '<div class="card-ribbon card-ribbon-hot">HOT</div>';

            const card = document.createElement('div');
            card.className = 'game-card' + (locked ? ' game-card-locked' : '');
            card.setAttribute('data-category', game.category || '');
            card.style.setProperty('--card-color', game.color);
            card.innerHTML = `
                <div class="card-holo-border"></div>
                <div class="game-card-image">
                    <canvas></canvas>
                    <div class="card-scan-line"></div>
                    ${ribbon}
                    ${lockOverlay}
                </div>
                <div class="game-card-body">
                    <div class="game-card-tags">
                        ${game.tags.map((t, i) => `<span class="tag ${game.tagClasses[i]}">${t}</span>`).join('')}
                        ${qualityBadge}
                    </div>
                    <h3 class="game-card-title">${game.title}</h3>
                    <div class="game-card-difficulty" title="Difficulty">${skulls}</div>
                    <div class="game-card-meta">
                        <span class="card-rating">${ratingStars}</span>
                        <span class="card-players"><span class="live-dot"></span> ${playCount} playing</span>
                    </div>
                    <p class="game-card-desc">${game.desc}</p>
                    ${locked ? `<button class="play-btn game-upgrade-btn" data-tier="${game.requiredTier}">🔒 Upgrade to Play</button>` : `<a href="${game.url}" class="play-btn">▶ Play Now</a>`}
                </div>
                <div class="card-bottom-glow" style="background:linear-gradient(90deg, transparent, ${game.color}, transparent);"></div>
            `;
            grid.appendChild(card);
            const canvas = card.querySelector('canvas');
            setTimeout(() => drawCardThumb(canvas, game), 50);
            const upgradeBtn = card.querySelector('.game-upgrade-btn');
            if (upgradeBtn) {
                upgradeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showUpgradeModal(game.requiredTier);
                });
            }
        });
    });
}

// Override createGameCards with enhanced version
createGameCards = createGameCardsEnhanced;

// Featured game animated canvas
function animateFeaturedCanvas() {
    const container = document.getElementById('featured-canvas');
    if (!container) return;
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    const corridors = [];
    for (let i = 0; i < 12; i++) {
        corridors.push({
            x: Math.random() * 500,
            y: Math.random() * 400,
            w: 30 + Math.random() * 50,
            h: 100 + Math.random() * 200,
        });
    }

    function draw() {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#1a1800';
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = 'rgba(200, 170, 0, 0.08)';
        ctx.lineWidth = 1;
        const offset = (time * 20) % 40;
        for (let x = -offset; x < w + 40; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = -offset; y < h + 40; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Pac-Man
        const px = w * 0.65 + Math.sin(time * 0.8) * 40;
        const py = h * 0.5 + Math.cos(time * 0.6) * 20;
        const mouthAngle = Math.abs(Math.sin(time * 4)) * 0.5;
        ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
        ctx.shadowColor = 'rgba(255, 255, 0, 0.5)';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(px, py, 30, mouthAngle + Math.PI, Math.PI * 3 - mouthAngle);
        ctx.lineTo(px, py);
        ctx.fill();
        // Eye
        ctx.fillStyle = '#000';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(px - 5, py - 12, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pellets
        for (let i = 0; i < 8; i++) {
            const dx = w * 0.1 + i * w * 0.06;
            const dy = h * 0.5 + Math.sin(time + i) * 10;
            ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
            ctx.shadowColor = 'rgba(255, 255, 0, 0.4)';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(dx, dy, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Vignette
        const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.6);
        grd.addColorStop(0, 'transparent');
        grd.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        time += 0.016;
        requestAnimationFrame(draw);
    }
    draw();
}

// ============ BACKGROUND VIDEO ROTATION ============
function initVideoRotation() {
    const video1 = document.getElementById('bg-video-1');
    const video2 = document.getElementById('bg-video-2');
    if (!video1 || !video2) return;

    const sources = [
        '/assets/hero-video.mp4',
        '/assets/yeti-chase.mp4',
        '/assets/forest-monster-chase.mp4',
    ];

    // Shuffle array using Fisher-Yates
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    let queue = shuffle(sources);
    let queueIndex = 0;

    function nextSource() {
        if (queueIndex >= queue.length) {
            queue = shuffle(sources);
            queueIndex = 0;
        }
        return queue[queueIndex++];
    }

    // Assign initial videos
    video1.src = nextSource();
    video2.src = nextSource();

    // Preload the inactive video so it's ready
    video1.preload = 'auto';
    video2.preload = 'auto';

    // Start the first video
    video1.classList.add('active');
    video2.classList.remove('active');
    video1.play().catch(() => { });

    function crossfade(from, to) {
        // Start loading/seeking the next video to frame 0
        to.currentTime = 0;
        to.play().catch(() => { });

        // Crossfade: fade out active, fade in next
        from.classList.remove('active');
        to.classList.add('active');

        // Pause the old video after the CSS transition finishes
        // and preload the next source into the now-hidden element
        setTimeout(() => {
            from.pause();
            from.src = nextSource();
            from.load();
        }, 1600);
    }

    video1.addEventListener('ended', () => crossfade(video1, video2));
    video2.addEventListener('ended', () => crossfade(video2, video1));
}

// Hero live count animation
function initHeroLiveCount() {
    const el = document.getElementById('hero-live-count');
    if (!el) return;
    setInterval(() => {
        const delta = Math.floor(Math.random() * 30) - 15;
        const current = parseInt(el.textContent.replace(/,/g, '')) || 1247;
        el.textContent = Math.max(800, current + delta).toLocaleString();
    }, 3000);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    createFilterBar();
    createGameCards();
    createParticles();
    animateFeaturedCanvas();
    initVideoRotation();
    // Phase 4
    initTypedSubtitle();
    initFloatingIcons();
    initTerrorCounters();
    initShowcaseCarousel();
    initScareOMeter();
    initTerrorWall();
    initNewsletter();
    initHeroLiveCount();
    // Phase 5
    initCardTilt();
});

