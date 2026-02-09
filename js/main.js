/* ============================================
   ScaryGamesAI — Main JavaScript
   ============================================ */

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
        difficulty: 3, category: 'action',
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
        difficulty: 2, category: 'action',
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
        difficulty: 3, category: 'action',
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
        difficulty: 2, category: 'action',
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
        difficulty: 3, category: 'action',
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
        difficulty: 2, category: 'puzzle', isNew: true,
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
        difficulty: 2, category: 'puzzle', isNew: true,
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
        difficulty: 3, category: 'puzzle', isNew: true,
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
        difficulty: 3, category: 'strategy', isNew: true,
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
        difficulty: 4, category: 'action', isNew: true,
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
        difficulty: 4, category: 'stealth', isNew: true,
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
        difficulty: 5, category: 'action', isNew: true,
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
        difficulty: 4, category: 'strategy', isNew: true,
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
            const card = document.createElement('div');
            card.className = 'game-card';
            card.setAttribute('data-category', game.category || '');
            card.innerHTML = `
        <div class="game-card-image"><canvas></canvas>${newBadge}</div>
        <div class="game-card-body">
          <div class="game-card-tags">
            ${game.tags.map((t, i) => `<span class="tag ${game.tagClasses[i]}">${t}</span>`).join('')}
          </div>
          <h3 class="game-card-title">${game.title}</h3>
          <div class="game-card-difficulty" title="Difficulty">${skulls}</div>
          <p class="game-card-desc">${game.desc}</p>
          <a href="${game.url}" class="play-btn">▶ Play Now</a>
        </div>
      `;
            grid.appendChild(card);
            const canvas = card.querySelector('canvas');
            setTimeout(() => drawCardThumb(canvas, game), 50);
        });
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

    const sources = ['/assets/hero-video.mp4', '/assets/yeti-chase.mp4'];

    // Randomly pick which video plays first
    const firstIndex = Math.random() < 0.5 ? 0 : 1;
    const secondIndex = 1 - firstIndex;

    video1.src = sources[firstIndex];
    video2.src = sources[secondIndex];

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
        setTimeout(() => {
            from.pause();
        }, 1600);
    }

    video1.addEventListener('ended', () => crossfade(video1, video2));
    video2.addEventListener('ended', () => crossfade(video2, video1));
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    createFilterBar();
    createGameCards();
    createParticles();
    animateFeaturedCanvas();
    initVideoRotation();
});

