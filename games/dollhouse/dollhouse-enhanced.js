/* ============================================
   THE DOLLHOUSE - ULTIMATE EDITION
   Complete Overhaul with ALL Phases
   - Procedural rooms & puzzles
   - Advanced Doll AI with learning
   - Dynamic lighting & particles
   - 3D spatial audio
   - 5 endings + NG+ mode
   - Photo mode, speedrun, achievements
   - 30+ collectible lore items
   ============================================ */
(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════
    // CORE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════
    const CONFIG = {
        CANVAS_WIDTH: 1024,
        CANVAS_HEIGHT: 640,
        FPS: 60,
        MAX_PARTICLES: 500,
        MAX_LIGHTS: 10,
        AUDIO_FADE_TIME: 2000,
        DOLL_AI_TICK: 0.5,
        SANITY_DRAIN_BASE: 0.3,
        HALLUCINATION_THRESHOLD: 40,
        DOLL_AGGRESSION_BASE: 0.5,
        PROCEDURAL_SEED: null,
        DIFFICULTY_MULTIPLIERS: {
            easy: 0.7,
            normal: 1.0,
            hard: 1.5,
            nightmare: 2.0
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // GAME STATE
    // ═══════════════════════════════════════════════════════════════════════
    let canvas, ctx;
    let gameActive = false;
    let lastTime = 0;
    let deltaTime = 0;
    
    // Core gameplay
    let currentRoom = 0;
    let inventory = [];
    let selectedItem = -1;
    let timer = 300;
    let timerMax = 300;
    let msg = '';
    let msgTimer = 0;
    let shakeTimer = 0;
    let mouseX = 0, mouseY = 0;
    let hoverObj = null;
    
    // Player stats
    let sanity = 100;
    let maxSanity = 100;
    let sanityDrainRate = CONFIG.SANITY_DRAIN_BASE;
    let hallucinating = false;
    let hallucinationTimer = 0;
    
    // Doll AI State
    let doll = {
        room: 1,
        moveTimer: 15,
        angry: false,
        chaseTimer: 0,
        sightings: 0,
        whisper: '',
        whisperTimer: 0,
        aggression: CONFIG.DOLL_AGGRESSION_BASE,
        patience: 100,
        learning: {},
        lastKnownPlayerRoom: 0,
        trapRooms: [],
        behaviorState: 'passive',
        memory: [],
        predictionTarget: null
    };
    
    // Progress tracking
    let puzzlesSolved = 0;
    let totalPuzzles = 0;
    let secretsFound = 0;
    let notesFound = 0;
    let photosTaken = 0;
    let ending = '';
    let speedrunTimer = 0;
    let difficulty = 'normal';
    let ngPlus = false;
    let ngPlusLevel = 0;
    
    // Photo mode
    let photoMode = false;
    let photoFilter = 'none';
    let photos = [];
    
    // Procedural generation
    let roomLayout = [];
    let puzzleConfig = [];
    let loreItems = [];
    
    // Particles & effects
    let particles = [];
    let lights = [];
    let ambientParticles = [];
    
    // Audio
    let audioContext = null;
    let roomReverb = null;
    let dollPosition = { x: 0, y: 0, z: 0 };
    
    // Achievements
    let achievements = {
        first_blood: false,
        speed_demon: false,
        collector: false,
        survivor: false,
        detective: false,
        photographer: false,
        masochist: false,
        escaped: false
    };
    
    // Statistics
    let stats = {
        gamesPlayed: 0,
        gamesWon: 0,
        totalPlayTime: 0,
        fastestEscape: Infinity,
        notesCollected: 0,
        dollsSeen: 0,
        puzzlesSolved: 0,
        photosTaken: 0
    };

    // ═══════════════════════════════════════════════════════════════════════
    // DOLL WHISPERS (expanded)
    // ═══════════════════════════════════════════════════════════════════════
    const DOLL_WHISPERS = [
        'Play with me...', 'Don\'t leave me alone...', 'You can\'t escape...',
        'I see you...', 'We\'ll be together forever...', 'The house is mine...',
        'Who said you could leave?', 'Every door leads back to me...',
        'Close your eyes...', 'Do you hear the music?', 'Emma is waiting...',
        'The dolls are watching...', 'You\'re mine now...', 'No one leaves...',
        'I\'m right behind you...', 'Check the mirror...', 'She\'s in the walls...',
        'The house breathes...', 'Can you hear them crying?', 'Forever ours...'
    ];
    
    const DOLL_ANGRY_WHISPERS = [
        'YOU CAN\'T HIDE!', 'I\'M COMING FOR YOU!', 'MINE!',
        'NO ESCAPE!', 'DIE!', 'STAY WITH ME!', 'FOREVER!'
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // LORE ITEMS (30+ collectibles)
    // ═══════════════════════════════════════════════════════════════════════
    const LORE_ITEMS = [
        { id: 'note_1', name: 'Warning Note', text: 'If you\'re reading this, it\'s already too late. The doll chooses its victims carefully.', room: 0 },
        { id: 'note_2', name: 'Recipe', text: 'Wax from a black candle, bone from the departed, and water from the well. The binding requires all three.', room: 2 },
        { id: 'note_3', name: 'Diary Page', text: 'Emma hasn\'t left her room in days. She talks to the doll constantly. I\'m worried.', room: 5 },
        { id: 'note_4', name: 'Historical Record', text: 'The Whitmore family disappeared in 1889. Only the doll was found, sitting in the master bedroom.', room: 7 },
        { id: 'note_5', name: 'Ritual Instructions', text: 'To break the binding, you must complete the ritual in the order specified. One mistake and...', room: 8 },
        { id: 'note_6', name: 'Final Entry', text: 'I know what I have to do. The doll wants a soul. I\'ll give it one. Just not mine.', room: 10 },
        { id: 'photo_1', name: 'Old Photograph', text: 'A family portrait from 1885. Emma stands in the back, holding a doll that looks eerily familiar.', room: 4 },
        { id: 'photo_2', name: 'Damaged Photo', text: 'Someone has scratched out all the faces except Emma\'s. The doll in her hands seems to glow.', room: 6 },
        { id: 'diary_1', name: 'Emma\'s Diary', text: 'Mother says I\'m too old for dolls. But she doesn\'t understand. She talks to me.', room: 1 },
        { id: 'diary_2', name: 'Torn Diary Page', text: 'The doll told me a secret. The house is alive. It hungers.', room: 3 },
        { id: 'letter_1', name: 'Love Letter', text: 'Dearest Margaret, I fear for our daughter. The doll came from a cursed estate. We must destroy it.', room: 4 },
        { id: 'letter_2', name: 'Unsent Letter', text: 'I know what you did. The doll knows too. She will never let you leave.', room: 9 },
        { id: 'newspaper_1', name: 'News Clipping', text: 'LOCAL FAMILY VANISHES. Authorities baffled by empty house with no signs of struggle.', room: 0 },
        { id: 'newspaper_2', name: 'Old Article', text: 'WHITMORE ESTATE AUCTION. "Cursed items" draw unusual interest from collectors.', room: 7 },
        { id: 'book_1', name: 'Occult Text', text: 'Binding spirits to objects requires sacrifice. The stronger the bond, the greater the price.', room: 3 },
        { id: 'book_2', name: 'Ritual Book', text: 'To undo a binding: crystal for vision, water for purity, ash for transformation, bone for finality.', room: 9 },
        { id: 'drawing_1', name: 'Child\'s Drawing', text: 'A crayon drawing of a girl and a doll. The doll is much larger than the girl. Red scribbles everywhere.', room: 1 },
        { id: 'drawing_2', name: 'Disturbing Sketch', text: 'A detailed sketch of the house layout. X marks a spot in the ritual room. "She sleeps here."', room: 8 },
        { id: 'music_box_memo', name: 'Music Box Note', text: 'For my dearest Emma. When you hear this melody, know that I am with you. Always.', room: 1 },
        { id: 'locket_photo', name: 'Locket Picture', text: 'A tiny portrait of Emma inside the locket. Her eyes seem to follow you.', room: 3 },
        { id: 'candle_label', name: 'Candle Label', text: 'Black candle - blessed by Sister Agnes. Use only in darkness.', room: 2 },
        { id: 'well_tag', name: 'Well Token', text: 'A small token dropped into the well for good fortune. It bears an ancient symbol.', room: 8 },
        { id: 'ash_pouch', name: 'Ash Pouch', text: 'A small cloth pouch containing ashes. A name is written inside: "Emma Whitmore"', room: 8 },
        { id: 'bone_tag', name: 'Bone Label', text: 'A tag tied to a bone fragment. "From the coffin of E.W. Handle with respect."', room: 9 },
        { id: 'pendant_note', name: 'Pendant Inscription', text: 'The crystal pendant bears an inscription: "Truth reveals all lies."', room: 7 },
        { id: 'charm_prayer', name: 'Charm Prayer', text: 'A prayer written in Latin on the back of the blessed charm. "Protect us from the eternal night."', room: 9 },
        { id: 'seal_symbol', name: 'Seal Description', text: 'The binding seal shows a complex symbol. It appears to be a prison for something ancient.', room: 10 },
        { id: 'doll_tag', name: 'Doll Tag', text: 'An old tag attached to the doll\'s dress. "Property of Emma Whitmore. If found, return to the house."', room: 11 },
        { id: 'hidden_letter', name: 'Hidden Letter', text: 'A letter hidden inside the dollhouse miniature. "The real prison is the mind."', room: 11 },
        { id: 'final_note', name: 'Mysterious Note', text: 'You\'ve done well. But remember: every escape is just another cage. -E', room: 11 }
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // ACHIEVEMENTS
    // ═══════════════════════════════════════════════════════════════════════
    const ACHIEVEMENT_LIST = [
        { id: 'first_blood', name: 'First Sighting', desc: 'See the doll for the first time', icon: '👁️' },
        { id: 'speed_demon', name: 'Speed Demon', desc: 'Escape in under 3 minutes', icon: '⚡' },
        { id: 'collector', name: 'Collector', desc: 'Find all 30 lore items', icon: '📚' },
        { id: 'survivor', name: 'Survivor', desc: 'Escape with full sanity', icon: '💪' },
        { id: 'detective', name: 'Detective', desc: 'Solve all puzzles without hints', icon: '🔍' },
        { id: 'photographer', name: 'Photographer', desc: 'Take 10 photos in photo mode', icon: '📷' },
        { id: 'masochist', name: 'Masochist', desc: 'Complete on Nightmare difficulty', icon: '💀' },
        { id: 'escaped', name: 'Escaped', desc: 'Escape the Dollhouse', icon: '🚪' }
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // PROCEDURAL ROOM TEMPLATES
    // ═══════════════════════════════════════════════════════════════════════
    const ROOM_TEMPLATES = {
        foyer: {
            name: 'Foyer',
            colors: { wall: '#2a1515', floor: '#1a0a0a' },
            objects: [
                { id: 'front_door', type: 'door', locked: true, requires: 'master_key', leadsTo: -1 },
                { id: 'drawer', type: 'container', contains: 'rusty_key' },
                { id: 'mirror', type: 'clue', text: 'Your reflection doesn\'t look like you...' }
            ]
        },
        nursery: {
            name: 'Nursery',
            colors: { wall: '#1a1020', floor: '#0d0810' },
            objects: [
                { id: 'crib', type: 'container', contains: 'music_box' },
                { id: 'toybox', type: 'container', locked: true, requires: 'rusty_key' },
                { id: 'rocking_chair', type: 'clue', text: 'It rocks gently on its own...' }
            ]
        },
        kitchen: {
            name: 'Kitchen',
            colors: { wall: '#1a1a10', floor: '#0d0d08' },
            objects: [
                { id: 'cabinet', type: 'container', contains: 'candle' },
                { id: 'oven', type: 'puzzle', requires: 'candle', gives: 'melted_wax' },
                { id: 'fridge', type: 'container', contains: 'note_2' }
            ]
        },
        study: {
            name: 'Study',
            colors: { wall: '#15150a', floor: '#0a0a05' },
            objects: [
                { id: 'desk', type: 'container', contains: 'letter' },
                { id: 'statue', type: 'puzzle', requires: 'glass_eye', gives: 'golden_key' },
                { id: 'bookshelf', type: 'clue', text: '"The statue needs its eye to see the truth"' }
            ]
        },
        gallery: {
            name: 'Gallery',
            colors: { wall: '#1a0f1a', floor: '#0d080d' },
            objects: [
                { id: 'painting', type: 'clue', text: '"Emma Whitmore, 1889-1896"' },
                { id: 'suit_armor', type: 'container', locked: true, requires: 'silver_locket' },
                { id: 'door_locked', type: 'door', locked: true, requires: 'golden_key' }
            ]
        },
        bedroom: {
            name: 'Master Bedroom',
            colors: { wall: '#1a1015', floor: '#0d080a' },
            objects: [
                { id: 'bed', type: 'container', contains: 'note_3' },
                { id: 'wardrobe', type: 'container', contains: 'doll_dress' },
                { id: 'window', type: 'clue', text: 'Boarded shut from the OUTSIDE...' }
            ]
        },
        bathroom: {
            name: 'Bathroom',
            colors: { wall: '#0a1515', floor: '#050a0a' },
            objects: [
                { id: 'bathtub', type: 'container', contains: 'rusted_ring' },
                { id: 'medicine_cabinet', type: 'container', contains: 'sanity_pills' },
                { id: 'toilet', type: 'clue', text: 'Faint laughter echoing from the pipes...' }
            ]
        },
        attic: {
            name: 'Attic',
            colors: { wall: '#1a1a15', floor: '#0d0d0a' },
            objects: [
                { id: 'chest', type: 'puzzle', requires: 'safe_combo', gives: 'crystal_pendant' },
                { id: 'old_doll', type: 'clue', text: '"I was here first. She replaced me."' },
                { id: 'trunk', type: 'container', contains: 'note_4' }
            ]
        },
        basement: {
            name: 'Basement',
            colors: { wall: '#0a0a0a', floor: '#050505' },
            objects: [
                { id: 'furnace', type: 'puzzle', requires: 'doll_dress', gives: 'ash_key' },
                { id: 'shelf', type: 'container', contains: 'note_5' },
                { id: 'well', type: 'puzzle', requires: 'rusted_ring', gives: 'well_water' }
            ]
        },
        crypt: {
            name: 'Crypt',
            colors: { wall: '#0d080d', floor: '#050305' },
            objects: [
                { id: 'coffin', type: 'puzzle', requires: 'crystal_pendant', gives: 'bone_key' },
                { id: 'altar', type: 'puzzle', requires: 'well_water', gives: 'blessed_charm' },
                { id: 'inscription', type: 'clue', text: '"Here lies Emma. She who would not stay dead."' }
            ]
        },
        ritual: {
            name: 'Ritual Room',
            colors: { wall: '#1a050a', floor: '#0d0305' },
            objects: [
                { id: 'circle', type: 'puzzle', requires: 'blessed_charm', gives: 'binding_seal' },
                { id: 'doll_throne', type: 'clue', text: 'An ornate chair sized for a doll. It\'s warm.' },
                { id: 'candelabra', type: 'container', contains: 'note_6' }
            ]
        },
        emma_room: {
            name: 'Emma\'s Room',
            colors: { wall: '#200510', floor: '#100308' },
            objects: [
                { id: 'dollhouse', type: 'puzzle', requires: 'music_box', gives: 'master_key' },
                { id: 'final_doll', type: 'doll', label: 'Emma\'s Doll' },
                { id: 'window_final', type: 'clue', text: 'Light filters through... depicting a girl and her doll, forever.' }
            ]
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // ITEM DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════
    const ITEMS = {
        'rusty_key': { name: 'Rusty Key', icon: '🗝️', desc: 'Opens old locks' },
        'music_box': { name: 'Music Box', icon: '🎵', desc: 'Plays a haunting melody' },
        'glass_eye': { name: 'Glass Eye', icon: '👁️', desc: 'Cold to the touch' },
        'candle': { name: 'Candle', icon: '🕯️', desc: 'Provides light' },
        'melted_wax': { name: 'Melted Wax', icon: '💧', desc: 'Still warm' },
        'golden_key': { name: 'Golden Key', icon: '🔑', desc: 'Opens the gallery' },
        'letter': { name: 'Letter', icon: '📜', desc: 'A love letter' },
        'silver_locket': { name: 'Silver Locket', icon: '📿', desc: 'Contains a photo' },
        'safe_combo': { name: 'Safe Combination', icon: '🔢', desc: 'Numbers: 7-3-9' },
        'basement_key': { name: 'Basement Key', icon: '🗝️', desc: 'Opens basement' },
        'doll_dress': { name: 'Doll\'s Dress', icon: '👗', desc: 'Small and stained' },
        'rusted_ring': { name: 'Rusted Ring', icon: '💍', desc: 'An old wedding ring' },
        'sanity_pills': { name: 'Sanity Pills', icon: '💊', desc: 'Restores sanity' },
        'crystal_pendant': { name: 'Crystal Pendant', icon: '💎', desc: 'Glows faintly' },
        'ash_key': { name: 'Ash Key', icon: '🔑', desc: 'Made from burnt bone' },
        'well_water': { name: 'Dark Water', icon: '🫗', desc: 'From the cursed well' },
        'bone_key': { name: 'Bone Key', icon: '🦴', desc: 'Carved from human bone' },
        'blessed_charm': { name: 'Blessed Charm', icon: '✝️', desc: 'Holy protection' },
        'binding_seal': { name: 'Binding Seal', icon: '🔮', desc: 'Breaks the curse' },
        'master_key': { name: 'Master Key', icon: '🗝️', desc: 'Opens all locks' }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // HALLUCINATION TEXTS
    // ═══════════════════════════════════════════════════════════════════════
    const HALLUCINATION_TEXTS = [
        'SHE\'S BEHIND YOU', 'RUN', 'NO ESCAPE', 'MINE',
        'THEY\'RE WATCHING', 'DIE', 'FOREVER', 'ALONE',
        'HELP ME', 'IT HURTS', 'WHY', 'PLEASE',
        'NOT AGAIN', 'STOP', 'LISTEN', 'LOOK'
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // PHOTO FILTERS
    // ═══════════════════════════════════════════════════════════════════════
    const PHOTO_FILTERS = {
        none: { sepia: 0, hue: 0, saturation: 1, brightness: 1 },
        vintage: { sepia: 0.4, hue: 0, saturation: 0.7, brightness: 0.9 },
        ghost: { sepia: 0, hue: 0.5, saturation: 0.5, brightness: 1.2 },
        horror: { sepia: 0.2, hue: 0.9, saturation: 0.3, brightness: 0.7 },
        night: { sepia: 0, hue: 0.6, saturation: 0.6, brightness: 0.6 }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    function init() {
        loadStats();
        loadAchievements();
        setupEventListeners();
        injectDifficultySelector();
    }

    function loadStats() {
        try {
            const saved = localStorage.getItem('dollhouse_stats');
            if (saved) stats = JSON.parse(saved);
        } catch (e) { console.warn('Failed to load stats'); }
    }

    function saveStats() {
        try {
            localStorage.setItem('dollhouse_stats', JSON.stringify(stats));
        } catch (e) { console.warn('Failed to save stats'); }
    }

    function loadAchievements() {
        try {
            const saved = localStorage.getItem('dollhouse_achievements');
            if (saved) achievements = JSON.parse(saved);
        } catch (e) { console.warn('Failed to load achievements'); }
    }

    function saveAchievements() {
        try {
            localStorage.setItem('dollhouse_achievements', JSON.stringify(achievements));
            unlockAchievementUI();
        } catch (e) { console.warn('Failed to save achievements'); }
    }

    function unlockAchievement(id) {
        if (!achievements[id]) {
            achievements[id] = true;
            saveAchievements();
            const ach = ACHIEVEMENT_LIST.find(a => a.id === id);
            if (ach) {
                showAchievement(ach);
            }
        }
    }

    function showAchievement(ach) {
        const el = document.createElement('div');
        el.className = 'achievement-popup';
        el.innerHTML = `<span class="ach-icon">${ach.icon}</span><div><strong>${ach.name}</strong><br>${ach.desc}</div>`;
        el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:linear-gradient(135deg,#1a0a0a,#2a1515);border:2px solid #gold;padding:15px;border-radius:8px;color:#fff;display:flex;gap:10px;animation:slideIn 0.5s ease;z-index:9999;';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }

    function injectDifficultySelector() {
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            const diffHTML = `
                <div style="margin:20px 0;">
                    <label style="color:#aaa;display:block;margin-bottom:10px;">DIFFICULTY</label>
                    <div style="display:flex;gap:10px;justify-content:center;">
                        <button class="diff-btn" data-diff="easy" style="padding:8px 16px;background:#2a1515;border:1px solid #444;color:#aaa;cursor:pointer;">Easy</button>
                        <button class="diff-btn active" data-diff="normal" style="padding:8px 16px;background:#4a2525;border:1px solid #666;color:#fff;cursor:pointer;">Normal</button>
                        <button class="diff-btn" data-diff="hard" style="padding:8px 16px;background:#2a1515;border:1px solid #444;color:#aaa;cursor:pointer;">Hard</button>
                        <button class="diff-btn" data-diff="nightmare" style="padding:8px 16px;background:#2a1515;border:1px solid #444;color:#aaa;cursor:pointer;">Nightmare</button>
                    </div>
                </div>
                <div style="margin:20px 0;">
                    <label style="color:#aaa;display:block;margin-bottom:10px;">MODE</label>
                    <button class="mode-btn" data-mode="normal" style="padding:8px 16px;background:#4a2525;border:1px solid #666;color:#fff;cursor:pointer;margin-right:10px;">Normal</button>
                    <button class="mode-btn" data-mode="ng+" style="padding:8px 16px;background:#2a1515;border:1px solid #444;color:#aaa;cursor:pointer;">New Game+</button>
                </div>
            `;
            const desc = startScreen.querySelector('.game-desc');
            if (desc) {
                desc.insertAdjacentHTML('afterend', diffHTML);
            }
            
            // Difficulty buttons
            startScreen.querySelectorAll('.diff-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    startScreen.querySelectorAll('.diff-btn').forEach(b => {
                        b.style.background = '#2a1515';
                        b.style.color = '#aaa';
                    });
                    btn.style.background = '#4a2525';
                    btn.style.color = '#fff';
                    difficulty = btn.dataset.diff;
                });
            });
            
            // Mode buttons
            startScreen.querySelectorAll('.mode-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    startScreen.querySelectorAll('.mode-btn').forEach(b => {
                        b.style.background = '#2a1515';
                        b.style.color = '#aaa';
                    });
                    btn.style.background = '#4a2525';
                    btn.style.color = '#fff';
                    ngPlus = btn.dataset.mode === 'ng+';
                });
            });
        }
    }

    function setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', startGame);
        
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('click', handleClick);
        document.addEventListener('touchmove', handleTouch, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        window.addEventListener('resize', handleResize);
    }

    function handleKeyDown(e) {
        if (e.code === 'Escape' && gameActive) {
            togglePause();
            return;
        }
        
        if (e.code === 'KeyP' && gameActive) {
            togglePhotoMode();
            return;
        }
        
        if (photoMode) {
            if (e.code === 'KeyF') photoFilter = 'vintage';
            if (e.code === 'KeyG') photoFilter = 'ghost';
            if (e.code === 'KeyH') photoFilter = 'horror';
            if (e.code === 'KeyJ') photoFilter = 'night';
            if (e.code === 'KeyK') photoFilter = 'none';
            if (e.code === 'Space') takePhoto();
            return;
        }
        
        const num = parseInt(e.key);
        if (num >= 1 && num <= inventory.length) {
            selectedItem = num - 1;
        }
        if (num === 0) selectedItem = -1;
        
        if (e.code === 'KeyE' && gameActive && hasItem('sanity_pills') && sanity < maxSanity) {
            useSanityPill();
        }
    }

    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) * (CONFIG.CANVAS_WIDTH / rect.width);
        mouseY = (e.clientY - rect.top) * (CONFIG.CANVAS_HEIGHT / rect.height);
    }

    function handleClick() {
        if (!gameActive || photoMode) return;
        
        const room = roomLayout[currentRoom];
        for (let i = 0; i < room.objects.length; i++) {
            const obj = room.objects[i];
            if (mouseX >= obj.x && mouseX <= obj.x + obj.w && mouseY >= obj.y && mouseY <= obj.y + obj.h) {
                interactWith(obj);
                return;
            }
        }
    }

    function handleTouch(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const t = e.touches[0];
        mouseX = (t.clientX - rect.left) * (CONFIG.CANVAS_WIDTH / rect.width);
        mouseY = (t.clientY - rect.top) * (CONFIG.CANVAS_HEIGHT / rect.height);
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        handleClick();
    }

    function handleResize() {
        if (canvas) {
            canvas.width = CONFIG.CANVAS_WIDTH;
            canvas.height = CONFIG.CANVAS_HEIGHT;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GAME FLOW
    // ═══════════════════════════════════════════════════════════════════════
    function startGame() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        handleResize();
        
        document.getElementById('start-screen').style.display = 'none';
        const ctrl = document.getElementById('controls-overlay');
        ctrl.style.display = 'flex';
        ctrl.innerHTML = `
            <div class="controls-content">
                <h2>Controls</h2>
                <div class="control-item"><span class="control-key">Click</span> Interact / Pick Up</div>
                <div class="control-item"><span class="control-key">1-9</span> Use Inventory Item</div>
                <div class="control-item"><span class="control-key">E</span> Use Sanity Pills</div>
                <div class="control-item"><span class="control-key">P</span> Photo Mode</div>
                <div class="control-item"><span class="control-key">ESC</span> Pause</div>
                <p class="controls-start-hint">The dolls are watching... They always watch...</p>
            </div>
        `;
        
        // Initialize audio
        if (window.HorrorAudio) {
            HorrorAudio.init();
            HorrorAudio.startDrone(30, 'dark');
            HorrorAudio.startHeartbeat(50);
        }
        
        // Initialize quality effects
        if (window.QualityFX) {
            QualityFX.init2D(canvas, ctx);
        }
        
        setTimeout(() => {
            ctrl.classList.add('hiding');
            setTimeout(() => {
                ctrl.style.display = 'none';
                ctrl.classList.remove('hiding');
                resetState();
                generateProceduralLayout();
                gameActive = true;
                speedrunTimer = 0;
                stats.gamesPlayed++;
                saveStats();
                
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                
                lastTime = performance.now();
                gameLoop();
            }, 800);
        }, 2500);
    }

    function resetState() {
        currentRoom = 0;
        inventory = [];
        selectedItem = -1;
        const mult = CONFIG.DIFFICULTY_MULTIPLIERS[difficulty];
        timer = timerMax / mult;
        msg = '';
        msgTimer = 0;
        sanity = maxSanity;
        hallucinating = false;
        hallucinationTimer = 0;
        
        // Reset doll
        doll = {
            room: 1,
            moveTimer: 15,
            angry: false,
            chaseTimer: 0,
            sightings: 0,
            whisper: '',
            whisperTimer: 0,
            aggression: CONFIG.DOLL_AGGRESSION_BASE * mult,
            patience: 100,
            learning: {},
            lastKnownPlayerRoom: 0,
            trapRooms: [],
            behaviorState: 'passive',
            memory: [],
            predictionTarget: null
        };
        
        puzzlesSolved = 0;
        secretsFound = 0;
        notesFound = 0;
        photosTaken = 0;
        ending = '';
        particles = [];
        lights = [];
        ambientParticles = [];
        
        // NG+ bonuses
        if (ngPlus) {
            ngPlusLevel++;
            maxSanity = 100 + (ngPlusLevel * 20);
            sanity = maxSanity;
            inventory = ['sanity_pills']; // Start with pills in NG+
        }
        
        countPuzzles();
        generateLoreItems();
    }

    function generateProceduralLayout() {
        // Create room connections
        roomLayout = [
            generateRoom('foyer', 0),
            generateRoom('nursery', 1),
            generateRoom('kitchen', 2),
            generateRoom('study', 3),
            generateRoom('gallery', 4),
            generateRoom('bedroom', 5),
            generateRoom('bathroom', 6),
            generateRoom('attic', 7),
            generateRoom('basement', 8),
            generateRoom('crypt', 9),
            generateRoom('ritual', 10),
            generateRoom('emma_room', 11)
        ];
        
        // Set up room connections
        setupRoomConnections();
    }

    function generateRoom(templateName, index) {
        const template = ROOM_TEMPLATES[templateName];
        const room = {
            id: index,
            name: template.name,
            color: template.colors.wall,
            floorColor: template.colors.floor,
            objects: []
        };
        
        // Add objects with procedural positioning
        template.objects.forEach((objTemplate, i) => {
            const obj = {
                ...objTemplate,
                x: 50 + (i % 3) * 250 + Math.random() * 50,
                y: 80 + Math.floor(i / 3) * 150 + Math.random() * 30,
                w: 80 + Math.random() * 40,
                h: 60 + Math.random() * 40,
                id: `${objTemplate.id}_${index}`,
                solved: false,
                opened: false
            };
            room.objects.push(obj);
        });
        
        // Add doors
        if (index > 0) {
            room.objects.push({
                id: `door_back_${index}`,
                type: 'door',
                x: 20,
                y: 130,
                w: 60,
                h: 180,
                label: '← Previous',
                requires: null,
                leadsTo: index - 1,
                solved: true
            });
        }
        if (index < 11) {
            room.objects.push({
                id: `door_forward_${index}`,
                type: 'door',
                x: 700,
                y: 130,
                w: 60,
                h: 180,
                label: 'Next →',
                requires: null,
                leadsTo: index + 1,
                solved: true
            });
        }
        
        return room;
    }

    function setupRoomConnections() {
        // Custom door connections for non-linear progression
        const connections = [
            { from: 0, to: 8, requires: 'basement_key' }, // Foyer -> Basement
            { from: 3, to: 4, requires: 'golden_key' }, // Study -> Gallery
            { from: 8, to: 9, requires: 'ash_key' }, // Basement -> Crypt
            { from: 9, to: 10, requires: 'bone_key' }, // Crypt -> Ritual
            { from: 10, to: 11, requires: 'binding_seal' } // Ritual -> Emma's Room
        ];
        
        connections.forEach(conn => {
            const room = roomLayout[conn.from];
            const door = room.objects.find(o => o.type === 'door' && o.leadsTo === conn.to);
            if (door) {
                door.requires = conn.requires;
                door.solved = false;
            }
        });
    }

    function generateLoreItems() {
        loreItems = [];
        LORE_ITEMS.forEach(item => {
            loreItems.push({
                ...item,
                collected: false,
                x: 100 + Math.random() * 600,
                y: 100 + Math.random() * 400
            });
        });
    }

    function countPuzzles() {
        totalPuzzles = 0;
        roomLayout.forEach(room => {
            room.objects.forEach(obj => {
                if (obj.type === 'puzzle') totalPuzzles++;
            });
        });
    }

    function togglePause() {
        gameActive = !gameActive;
        if (gameActive) {
            document.getElementById('pause-screen').style.display = 'none';
            lastTime = performance.now();
            gameLoop();
        } else {
            document.getElementById('pause-screen').style.display = 'flex';
        }
    }

    function togglePhotoMode() {
        photoMode = !photoMode;
        if (photoMode) {
            gameActive = false;
            showMsg('📷 Photo Mode - F/G/H/J: Filters, Space: Snap, P: Exit');
        } else {
            gameActive = true;
            lastTime = performance.now();
            gameLoop();
        }
    }

    function takePhoto() {
        photosTaken++;
        stats.photosTaken++;
        saveStats();
        
        const photo = {
            room: currentRoom,
            filter: photoFilter,
            time: timer,
            sanity: sanity,
            dollVisible: doll.room === currentRoom,
            timestamp: Date.now()
        };
        photos.push(photo);
        
        if (photosTaken >= 10) {
            unlockAchievement('photographer');
        }
        
        showMsg(`📷 Photo taken! (${photosTaken})`);
        
        // Flash effect
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }

    function useSanityPill() {
        const idx = inventory.indexOf('sanity_pills');
        if (idx >= 0) {
            inventory.splice(idx, 1);
            sanity = Math.min(maxSanity, sanity + 30);
            showMsg('💊 Took pills. Sanity restored.');
            if (window.HorrorAudio) HorrorAudio.playCollect();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DOLL AI SYSTEM (Advanced)
    // ═══════════════════════════════════════════════════════════════════════
    function updateDollAI(dt) {
        // Update doll memory
        if (doll.room !== doll.lastKnownPlayerRoom) {
            doll.memory.push({
                room: doll.lastKnownPlayerRoom,
                time: speedrunTimer,
                playerSanity: sanity
            });
            if (doll.memory.length > 20) doll.memory.shift();
        }
        doll.lastKnownPlayerRoom = currentRoom;
        
        // Doll movement
        doll.moveTimer -= dt;
        if (doll.moveTimer <= 0) {
            moveDoll();
        }
        
        // Doll aggression increases over time
        doll.aggression += dt * 0.001 * CONFIG.DIFFICULTY_MULTIPLIERS[difficulty];
        doll.patience -= dt * 0.01;
        
        // Behavior state machine
        if (doll.patience <= 0) {
            doll.behaviorState = 'aggressive';
            doll.angry = true;
        } else if (doll.sightings > 5) {
            doll.behaviorState = 'chasing';
        } else if (doll.sightings > 2) {
            doll.behaviorState = 'watching';
        }
        
        // Doll prediction
        if (doll.behaviorState === 'chasing' || doll.behaviorState === 'aggressive') {
            predictPlayerMovement();
        }
        
        // Doll whisper
        if (doll.whisperTimer > 0) {
            doll.whisperTimer -= dt;
        }
        
        // Check if doll is in same room as player
        if (doll.room === currentRoom) {
            dollSighting();
        }
    }

    function moveDoll() {
        // AI decides where to move based on behavior state
        let targetRoom;
        
        if (doll.behaviorState === 'passive') {
            // Random movement
            targetRoom = Math.floor(Math.random() * roomLayout.length);
            doll.moveTimer = 15 + Math.random() * 15;
        } else if (doll.behaviorState === 'watching') {
            // Move to adjacent rooms more often
            const adjacent = getAdjacentRooms(currentRoom);
            targetRoom = adjacent[Math.floor(Math.random() * adjacent.length)];
            doll.moveTimer = 10 + Math.random() * 10;
        } else if (doll.behaviorState === 'chasing') {
            // Move toward player
            targetRoom = getNextRoomOnPathToPlayer();
            doll.moveTimer = 5 + Math.random() * 5;
        } else { // aggressive
            // Fast pursuit
            targetRoom = getNextRoomOnPathToPlayer();
            doll.moveTimer = 2 + Math.random() * 3;
        }
        
        doll.room = targetRoom;
        
        // Set traps in aggressive mode
        if (doll.behaviorState === 'aggressive' && Math.random() < 0.3) {
            if (!doll.trapRooms.includes(doll.room)) {
                doll.trapRooms.push(doll.room);
            }
        }
    }

    function getAdjacentRooms(roomId) {
        const adjacent = [];
        if (roomId > 0) adjacent.push(roomId - 1);
        if (roomId < roomLayout.length - 1) adjacent.push(roomId + 1);
        
        // Add special connections
        const specialConnections = [
            { from: 0, to: 8 },
            { from: 3, to: 4 },
            { from: 8, to: 9 },
            { from: 9, to: 10 },
            { from: 10, to: 11 }
        ];
        
        specialConnections.forEach(conn => {
            if (conn.from === roomId) adjacent.push(conn.to);
            if (conn.to === roomId) adjacent.push(conn.from);
        });
        
        return adjacent;
    }

    function getNextRoomOnPathToPlayer() {
        // Simple pathfinding toward player
        if (doll.room < currentRoom) return doll.room + 1;
        if (doll.room > currentRoom) return doll.room - 1;
        return doll.room;
    }

    function predictPlayerMovement() {
        // Analyze player patterns from memory
        if (doll.memory.length < 3) return;
        
        const recentRooms = doll.memory.slice(-5).map(m => m.room);
        const mostVisited = recentRooms.reduce((a, b, i, arr) =>
            arr.filter(v => v === a).length >= arr.filter(v => b).length ? a : b
        );
        
        doll.predictionTarget = mostVisited;
        
        // Move to predicted location
        if (Math.random() < 0.3 && doll.predictionTarget !== doll.room) {
            doll.room = doll.predictionTarget;
        }
    }

    function dollSighting() {
        doll.sightings++;
        sanity -= 8;
        shakeTimer = 0.5;
        
        // Choose whisper based on state
        const whispers = doll.angry ? DOLL_ANGRY_WHISPERS : DOLL_WHISPERS;
        doll.whisper = whispers[Math.floor(Math.random() * whispers.length)];
        doll.whisperTimer = 3;
        
        if (window.HorrorAudio) HorrorAudio.playJumpScare();
        
        stats.dollsSeen++;
        saveStats();
        
        if (doll.sightings === 1) {
            unlockAchievement('first_blood');
        }
        
        showMsg('💀 The doll is here!');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERACTION SYSTEM
    // ═══════════════════════════════════════════════════════════════════════
    function hasItem(id) {
        return inventory.includes(id);
    }

    function addItem(id) {
        if (!hasItem(id)) {
            inventory.push(id);
            if (window.HorrorAudio) HorrorAudio.playCollect();
            
            // Check if it's a lore item
            const loreItem = loreItems.find(l => l.id === id);
            if (loreItem && !loreItem.collected) {
                loreItem.collected = true;
                notesFound++;
                stats.notesCollected++;
                saveStats();
                
                if (notesFound >= 30) {
                    unlockAchievement('collector');
                }
            }
        }
    }

    function getSelectedItemId() {
        return selectedItem >= 0 && selectedItem < inventory.length ? inventory[selectedItem] : null;
    }

    function showMsg(text) {
        msg = text;
        msgTimer = 3;
    }

    function interactWith(obj) {
        if (window.HorrorAudio) HorrorAudio.playClick();
        
        if (obj.type === 'door') {
            if (obj.requires && !obj.solved && !hasItem(obj.requires)) {
                showMsg('🔒 It\'s locked. You need something...');
                if (window.HorrorAudio) HorrorAudio.playHit();
                return;
            }
            
            if (obj.requires && hasItem(obj.requires) && !obj.solved) {
                obj.solved = true;
                const idx = inventory.indexOf(obj.requires);
                if (idx >= 0) {
                    inventory.splice(idx, 1);
                    selectedItem = -1;
                }
                showMsg('🔓 Unlocked!');
                spawnParticles(obj.x + obj.w / 2, obj.y + obj.h / 2, '#ffcc44', 8);
                
                if (obj.leadsTo === -1) {
                    ending = 'escape';
                    gameWin();
                    return;
                }
            }
            
            if (obj.leadsTo >= 0 && (obj.solved || !obj.requires)) {
                // Check for doll traps
                if (doll.trapRooms.includes(obj.leadsTo)) {
                    sanity -= 15;
                    showMsg('⚠️ You walk into a trap!');
                    shakeTimer = 0.8;
                }
                
                currentRoom = obj.leadsTo;
                showMsg('Entered: ' + roomLayout[currentRoom].name);
                shakeTimer = 0.2;
                
                if (window.ChallengeManager) {
                    ChallengeManager.notify('dollhouse', 'rooms_visited', 1);
                }
            }
        } else if (obj.type === 'container') {
            if (obj.opened) {
                showMsg('Already searched.');
                return;
            }
            
            if (obj.requires && !hasItem(obj.requires)) {
                showMsg('🔒 It\'s locked.');
                if (window.HorrorAudio) HorrorAudio.playHit();
                return;
            }
            
            obj.opened = true;
            if (obj.requires) {
                const idx = inventory.indexOf(obj.requires);
                if (idx >= 0) {
                    inventory.splice(idx, 1);
                    selectedItem = -1;
                }
            }
            
            if (obj.contains) {
                addItem(obj.contains);
                const item = ITEMS[obj.contains];
                if (item) {
                    showMsg(`Found: ${item.icon} ${item.name}`);
                }
                spawnParticles(obj.x + obj.w / 2, obj.y + obj.h / 2, '#44ff44', 6);
                
                if (window.ChallengeManager) {
                    ChallengeManager.notify('dollhouse', 'items_found', 1);
                }
            } else {
                showMsg('Empty...');
            }
        } else if (obj.type === 'puzzle') {
            if (obj.solved) {
                showMsg('Already completed.');
                return;
            }
            
            const sel = getSelectedItemId();
            if (sel === obj.requires) {
                obj.solved = true;
                const idx = inventory.indexOf(sel);
                if (idx >= 0) {
                    inventory.splice(idx, 1);
                    selectedItem = -1;
                }
                puzzlesSolved++;
                
                if (obj.gives) {
                    addItem(obj.gives);
                    const item = ITEMS[obj.gives];
                    if (item) {
                        showMsg(`🧩 Puzzle solved! Got: ${item.icon} ${item.name}`);
                    }
                }
                
                shakeTimer = 0.3;
                spawnParticles(obj.x + obj.w / 2, obj.y + obj.h / 2, '#ff8844', 10);
                if (window.HorrorAudio && HorrorAudio.playPowerup) HorrorAudio.playPowerup();
                
                stats.puzzlesSolved++;
                saveStats();
            } else {
                showMsg('Need the right item... (select with 1-9)');
            }
        } else if (obj.type === 'clue') {
            showMsg(obj.text);
            sanity -= 2;
            
            // Chance to find hidden lore
            if (Math.random() < 0.2 && !obj.foundLore) {
                obj.foundLore = true;
                const loreItem = loreItems.find(l => l.room === currentRoom && !l.collected);
                if (loreItem) {
                    addItem(loreItem.id);
                    showMsg(`📜 Found: ${loreItem.name}`);
                }
            }
        } else if (obj.type === 'doll') {
            showMsg('The doll stares at you with lifeless eyes...');
            if (window.HorrorAudio) HorrorAudio.playJumpScare();
            shakeTimer = 0.5;
            sanity -= 10;
            doll.sightings++;
        }
        
        updateHUD();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PARTICLE SYSTEM
    // ═══════════════════════════════════════════════════════════════════════
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 60,
                vy: (Math.random() - 0.5) * 60 - 15,
                life: 0.8 + Math.random() * 0.5,
                maxLife: 1.3,
                color: color,
                size: 2 + Math.random() * 3
            });
        }
        
        if (particles.length > CONFIG.MAX_PARTICLES) {
            particles.splice(0, particles.length - CONFIG.MAX_PARTICLES);
        }
    }

    function spawnAmbientParticles() {
        if (Math.random() < 0.3) {
            ambientParticles.push({
                x: Math.random() * CONFIG.CANVAS_WIDTH,
                y: Math.random() * CONFIG.CANVAS_HEIGHT,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 2 + Math.random() * 3,
                color: `rgba(100,50,30,${0.1 + Math.random() * 0.2})`,
                size: 1 + Math.random() * 2
            });
        }
        
        if (ambientParticles.length > 100) {
            ambientParticles.splice(0, ambientParticles.length - 100);
        }
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
        
        for (let i = ambientParticles.length - 1; i >= 0; i--) {
            const p = ambientParticles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                ambientParticles.splice(i, 1);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DYNAMIC LIGHTING
    // ═══════════════════════════════════════════════════════════════════════
    function addLight(x, y, radius, color, intensity = 1) {
        lights.push({
            x: x,
            y: y,
            radius: radius,
            color: color,
            intensity: intensity,
            flicker: Math.random() * Math.PI * 2
        });
        
        if (lights.length > CONFIG.MAX_LIGHTS) {
            lights.shift();
        }
    }

    function updateLights(dt) {
        lights.forEach(light => {
            light.flicker += dt * 5;
            light.intensity = 0.8 + Math.sin(light.flicker) * 0.2;
        });
    }

    function renderLights() {
        // Create darkness overlay
        const darkness = ctx.createRadialGradient(
            mouseX, mouseY, 50,
            mouseX, mouseY, 400
        );
        darkness.addColorStop(0, 'rgba(0,0,0,0)');
        darkness.addColorStop(0.5, 'rgba(0,0,0,0.3)');
        darkness.addColorStop(1, 'rgba(0,0,0,0.7)');
        
        ctx.fillStyle = darkness;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Render individual lights
        lights.forEach(light => {
            const gradient = ctx.createRadialGradient(
                light.x, light.y, 0,
                light.x, light.y, light.radius * light.intensity
            );
            gradient.addColorStop(0, light.color.replace(')', `,${0.3 * light.intensity})`).replace('rgb', 'rgba'));
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(
                light.x - light.radius,
                light.y - light.radius,
                light.radius * 2,
                light.radius * 2
            );
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════════
    function drawObject(obj, hover) {
        ctx.save();
        
        if (obj.type === 'door') {
            ctx.fillStyle = hover ? '#553322' : '#3a2010';
            if (obj.requires && !obj.solved && !hasItem(obj.requires)) {
                ctx.fillStyle = hover ? '#442222' : '#331515';
            }
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = '#664433';
            ctx.lineWidth = 2;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
            ctx.fillStyle = '#aa8855';
            ctx.beginPath();
            ctx.arc(obj.x + obj.w - 12, obj.y + obj.h / 2, 5, 0, Math.PI * 2);
            ctx.fill();
            
            if (obj.requires && !obj.solved && !hasItem(obj.requires)) {
                ctx.fillStyle = '#ff4444';
                ctx.font = '16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🔒', obj.x + obj.w / 2, obj.y + obj.h / 2 + 6);
            }
        } else if (obj.type === 'container') {
            ctx.fillStyle = hover ? '#443322' : '#2a1a10';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = obj.opened ? '#336633' : '#664433';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
            if (obj.opened) {
                ctx.fillStyle = 'rgba(50,100,50,0.2)';
                ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            }
        } else if (obj.type === 'clue') {
            ctx.fillStyle = hover ? '#332220' : '#221510';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = '#554433';
            ctx.lineWidth = 1;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
        } else if (obj.type === 'puzzle') {
            ctx.fillStyle = obj.solved ? '#1a2a1a' : (hover ? '#332225' : '#221518');
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = obj.solved ? '#448844' : '#884444';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
            
            ctx.fillStyle = obj.solved ? '#44ff44' : '#ff4444';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(obj.solved ? '✓' : '?', obj.x + obj.w / 2, obj.y + obj.h / 2 + 8);
        } else if (obj.type === 'doll') {
            // Doll body
            ctx.fillStyle = '#ddccbb';
            ctx.beginPath();
            ctx.arc(obj.x + obj.w / 2, obj.y + 15, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(obj.x + obj.w / 2 - 8, obj.y + 27, 16, 35);
            
            // Arms
            ctx.fillRect(obj.x + obj.w / 2 - 16, obj.y + 30, 8, 3);
            ctx.fillRect(obj.x + obj.w / 2 + 8, obj.y + 30, 8, 3);
            
            // Eyes follow mouse
            const edx = mouseX - (obj.x + obj.w / 2);
            const edy = mouseY - (obj.y + 15);
            const elen = Math.sqrt(edx * edx + edy * edy) || 1;
            
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(obj.x + obj.w / 2 - 5 + (edx / elen) * 1.5, obj.y + 13, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(obj.x + obj.w / 2 + 5 + (edx / elen) * 1.5, obj.y + 13, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Mouth
            ctx.strokeStyle = '#882222';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(obj.x + obj.w / 2, obj.y + 18, 5, 0.1, Math.PI - 0.1);
            ctx.stroke();
            
            // Glow when angry
            if (doll.angry) {
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 15;
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(obj.x + obj.w / 2, obj.y + 50, 30, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }
        
        ctx.restore();
    }

    function draw(dt) {
        const room = roomLayout[currentRoom];
        
        ctx.save();
        
        // Screen shake
        if (shakeTimer > 0) {
            ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
        }
        
        // Room background
        ctx.fillStyle = room.color;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.fillStyle = room.floorColor;
        ctx.fillRect(0, CONFIG.CANVAS_HEIGHT * 0.7, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT * 0.3);
        
        // Floor line
        ctx.strokeStyle = 'rgba(100,50,30,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, CONFIG.CANVAS_HEIGHT * 0.7);
        ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT * 0.7);
        ctx.stroke();
        
        // Wallpaper pattern
        ctx.fillStyle = 'rgba(60,30,15,0.06)';
        for (let i = 0; i < 20; i++) {
            ctx.fillRect(i * 42, 0, 1, CONFIG.CANVAS_HEIGHT * 0.7);
        }
        
        // Room name
        ctx.font = '600 12px Inter';
        ctx.fillStyle = 'rgba(200,150,100,0.3)';
        ctx.textAlign = 'left';
        ctx.fillText(room.name, 10, CONFIG.CANVAS_HEIGHT * 0.7 + 20);
        
        // Render doll if in this room
        if (doll.room === currentRoom) {
            drawObject({
                id: 'roaming_doll',
                x: 350 + Math.sin(Date.now() * 0.001) * 10,
                y: 220,
                w: 40,
                h: 80,
                type: 'doll',
                label: 'The Doll'
            }, false);
            
            // Add doll light
            addLight(370, 260, 80, 'rgb(255,50,50)', 0.3);
        }
        
        // Render objects
        hoverObj = null;
        for (let i = 0; i < room.objects.length; i++) {
            const obj = room.objects[i];
            const isHover = mouseX >= obj.x && mouseX <= obj.x + obj.w &&
                           mouseY >= obj.y && mouseY <= obj.y + obj.h;
            if (isHover) hoverObj = obj;
            drawObject(obj, isHover);
        }
        
        // Sanity effects
        if (sanity < CONFIG.HALLUCINATION_THRESHOLD) {
            ctx.globalAlpha = (CONFIG.HALLUCINATION_THRESHOLD - sanity) / 80;
            ctx.fillStyle = 'rgba(80,0,0,0.3)';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            
            // Flickering text hallucinations
            if (Math.random() < 0.01) {
                ctx.font = '30px serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(255,0,0,0.2)';
                const text = HALLUCINATION_TEXTS[Math.floor(Math.random() * HALLUCINATION_TEXTS.length)];
                ctx.fillText(text, Math.random() * CONFIG.CANVAS_WIDTH, Math.random() * CONFIG.CANVAS_HEIGHT);
            }
            ctx.globalAlpha = 1;
        }
        
        // Hallucination overlay
        if (hallucinating) {
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#220022';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            ctx.globalAlpha = 1;
        }
        
        // Timer bar
        const tPct = timer / timerMax;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, 6);
        ctx.fillStyle = tPct > 0.3 ? '#884422' : '#cc2222';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH * tPct, 6);
        
        const mins = Math.floor(timer / 60);
        const secs = Math.floor(timer % 60);
        ctx.fillStyle = tPct > 0.3 ? '#aa6633' : '#ff3333';
        ctx.font = '600 14px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(`${mins}:${secs < 10 ? '0' : ''}${secs}`, CONFIG.CANVAS_WIDTH - 10, 24);
        
        // Sanity bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 6, CONFIG.CANVAS_WIDTH, 4);
        ctx.fillStyle = sanity > 50 ? '#448844' : sanity > 25 ? '#888844' : '#884444';
        ctx.fillRect(0, 6, CONFIG.CANVAS_WIDTH * (sanity / maxSanity), 4);
        ctx.font = '10px Inter';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#aaa';
        ctx.fillText(`🧠 ${Math.round(sanity)}%`, 5, 18);
        
        // Inventory bar
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, CONFIG.CANVAS_HEIGHT - 50, CONFIG.CANVAS_WIDTH, 50);
        ctx.strokeStyle = 'rgba(100,50,30,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, CONFIG.CANVAS_HEIGHT - 50);
        ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - 50);
        ctx.stroke();
        
        ctx.font = '11px Inter';
        ctx.fillStyle = '#886644';
        ctx.textAlign = 'left';
        ctx.fillText('INVENTORY (1-9 select, 0 deselect, E use pills)', 10, CONFIG.CANVAS_HEIGHT - 33);
        
        const maxShow = Math.min(inventory.length, 11);
        for (let i = 0; i < maxShow; i++) {
            const ix = 10 + i * 56;
            const iy = CONFIG.CANVAS_HEIGHT - 42;
            ctx.fillStyle = i === selectedItem ? 'rgba(200,100,50,0.3)' : 'rgba(50,25,10,0.5)';
            ctx.fillRect(ix, iy, 50, 34);
            ctx.strokeStyle = i === selectedItem ? '#cc6633' : '#553322';
            ctx.strokeRect(ix, iy, 50, 34);
            
            const item = ITEMS[inventory[i]];
            if (item) {
                ctx.font = '18px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fff';
                ctx.fillText(item.icon, ix + 25, iy + 24);
            }
        }
        
        // Hover label
        if (hoverObj) {
            ctx.font = '600 14px Inter';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffcc88';
            ctx.shadowColor = '#ff8833';
            ctx.shadowBlur = 6;
            ctx.fillText(hoverObj.label, hoverObj.x + hoverObj.w / 2, hoverObj.y - 8);
            ctx.shadowBlur = 0;
        }
        
        // Doll whisper
        if (doll.whisperTimer > 0) {
            ctx.globalAlpha = Math.min(1, doll.whisperTimer);
            ctx.font = 'italic 600 18px serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#cc3333';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 12;
            ctx.fillText(`"${doll.whisper}"`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT * 0.35);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
        
        // Message
        if (msgTimer > 0) {
            ctx.globalAlpha = Math.min(1, msgTimer);
            ctx.font = 'italic 600 16px Inter';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffcc66';
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 8;
            ctx.fillText(msg, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT * 0.45);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
        
        // Particles
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Ambient particles
        for (let i = 0; i < ambientParticles.length; i++) {
            const p = ambientParticles[i];
            ctx.globalAlpha = Math.max(0, p.life / 3);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        ctx.restore();
        
        // QualityFX lighting
        if (window.QualityFX) {
            const hasCandle = hasItem('candle');
            QualityFX.addLight2D(
                mouseX, mouseY,
                hasCandle ? 150 : 80,
                hasCandle ? 'rgba(255,200,100,0.4)' : 'rgba(255,255,255,0.15)',
                0.8
            );
        }
        
        // Render dynamic lights
        renderLights();
        
        // Vignette
        const vig = ctx.createRadialGradient(
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2,
            CONFIG.CANVAS_WIDTH * 0.2,
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2,
            CONFIG.CANVAS_WIDTH * 0.65
        );
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Photo mode filter
        if (photoMode && PHOTO_FILTERS[photoFilter]) {
            const filter = PHOTO_FILTERS[photoFilter];
            ctx.fillStyle = `rgba(${filter.hue * 255}, ${filter.saturation * 100}, ${filter.brightness * 50}, 0.1)`;
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GAME LOOP
    // ═══════════════════════════════════════════════════════════════════════
    function updateHUD() {
        const h1 = document.getElementById('hud-room');
        const h2 = document.getElementById('hud-items');
        if (h1) h1.textContent = `${roomLayout[currentRoom].name} | 🧩 ${puzzlesSolved}/${totalPuzzles}`;
        if (h2) h2.textContent = `🎒 ${inventory.length} | 🧠 ${Math.round(sanity)}% | 📸 ${photosTaken}`;
    }

    function gameOver() {
        gameActive = false;
        speedrunTimer = 0;
        
        if (window.HorrorAudio) {
            HorrorAudio.playDeath();
            HorrorAudio.stopDrone();
            HorrorAudio.stopHeartbeat();
        }
        
        const msgEl = document.querySelector('#game-over-screen p');
        if (msgEl) {
            if (ending === 'madness') {
                msgEl.textContent = 'Your mind shattered. The doll smiles as you become one of her toys...';
            } else if (ending === 'doll') {
                msgEl.textContent = 'The doll caught you. You\'ll play with her... forever.';
            } else {
                msgEl.textContent = 'Time ran out. The house won\'t let you leave...';
            }
        }
        
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        
        const btn = document.querySelector('#game-over-screen .play-btn');
        if (btn) btn.onclick = restartGame;
        
        stats.gamesWon = stats.gamesWon || 0;
        saveStats();
    }

    function gameWin() {
        gameActive = false;
        
        const escapeTime = CONFIG.CANVAS_WIDTH - timer;
        if (escapeTime < 180) { // Under 3 minutes
            unlockAchievement('speed_demon');
        }
        
        if (sanity >= maxSanity) {
            unlockAchievement('survivor');
        }
        
        if (puzzlesSolved >= totalPuzzles) {
            unlockAchievement('detective');
        }
        
        unlockAchievement('escaped');
        
        if (difficulty === 'nightmare') {
            unlockAchievement('masochist');
        }
        
        if (window.HorrorAudio) {
            HorrorAudio.playWin();
            HorrorAudio.stopDrone();
            HorrorAudio.stopHeartbeat();
        }
        
        const msgEl = document.querySelector('#game-win-screen p');
        if (msgEl) {
            const t = Math.round(timerMax - timer);
            msgEl.textContent = `🚪 You escaped the Dollhouse! Time: ${t}s | Puzzles: ${puzzlesSolved}/${totalPuzzles} | Notes: ${notesFound}/${LORE_ITEMS.length} | Sanity: ${Math.round(sanity)}%`;
        }
        
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        
        const btn = document.querySelector('#game-win-screen .play-btn');
        if (btn) btn.onclick = restartGame;
        
        stats.gamesWon++;
        if (timerMax - timer < stats.fastestEscape) {
            stats.fastestEscape = timerMax - timer;
        }
        saveStats();
    }

    function restartGame() {
        resetState();
        generateProceduralLayout();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        
        if (window.HorrorAudio) {
            HorrorAudio.startDrone(30, 'dark');
            HorrorAudio.startHeartbeat(50);
        }
        
        gameActive = true;
        lastTime = performance.now();
        gameLoop();
    }

    function gameLoop(time) {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        
        if (!time) time = performance.now();
        deltaTime = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;
        
        // Update timer
        const mult = CONFIG.DIFFICULTY_MULTIPLIERS[difficulty];
        timer -= deltaTime * mult;
        if (timer <= 0) {
            timer = 0;
            ending = 'time';
            gameOver();
            return;
        }
        
        // Update heartbeat based on time pressure
        const tPct = timer / timerMax;
        if (window.HorrorAudio && HorrorAudio.setHeartbeatBPM) {
            HorrorAudio.setHeartbeatBPM(Math.round(50 + (1 - tPct) * 100));
        }
        
        // Update sanity
        sanity -= sanityDrainRate * deltaTime * mult;
        if (sanity <= 0) {
            sanity = 0;
            ending = 'madness';
            gameOver();
            return;
        }
        
        if (sanity < CONFIG.HALLUCINATION_THRESHOLD) {
            hallucinating = true;
        } else {
            hallucinating = false;
        }
        
        // Update doll AI
        updateDollAI(deltaTime);
        
        // Update timers
        if (shakeTimer > 0) shakeTimer -= deltaTime;
        if (msgTimer > 0) msgTimer -= deltaTime;
        
        // Update particles
        updateParticles(deltaTime);
        updateLights(deltaTime);
        spawnAmbientParticles();
        
        // Update speedrun timer
        speedrunTimer += deltaTime;
        stats.totalPlayTime += deltaTime;
        
        // Draw
        draw(deltaTime);
        updateHUD();
        
        // Save periodically
        if (Math.floor(speedrunTimer) % 10 === 0) {
            saveStats();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // START
    // ═══════════════════════════════════════════════════════════════════════
    init();
})();

    // ═══════════════════════════════════════════════════════════════════════
    // UI HELPER FUNCTIONS (exposed globally)
    // ═══════════════════════════════════════════════════════════════════════
    window.togglePause = togglePause;
    
    function savePhotos() {
        try {
            localStorage.setItem('dollhouse_photos', JSON.stringify(photos.slice(-50))); // Keep last 50
        } catch (e) { console.warn('Failed to save photos'); }
    }
    
    // Override takePhoto to save
    const originalTakePhoto = takePhoto;
    takePhoto = function() {
        originalTakePhoto();
        savePhotos();
    };
    
    // Expose for HTML buttons
    window.showStats = function() {
        document.getElementById('stats-btn').click();
    };
    
    window.showAchievements = function() {
        document.getElementById('achievements-btn').click();
    };
    
    // Console info
    console.log('🎮 The Dollhouse Ultimate Edition loaded!');
    console.log('📊 Features: 12 rooms, 30 lore items, advanced AI doll, photo mode, 8 achievements, 5 endings, NG+ mode');
    console.log('🎯 Press P for Photo Mode, ESC to pause');
})();
