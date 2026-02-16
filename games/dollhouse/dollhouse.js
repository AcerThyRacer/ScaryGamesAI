/* ============================================
   The Dollhouse — Point-and-Click Escape Room
   OVERHAULED: 12 rooms, complex puzzles, doll AI,
   expanded inventory, multiple endings, sanity system
   ============================================ */
(function () {
    'use strict';

    var canvas, ctx, W = 800, H = 500;
    var gameActive = false, lastTime = 0;
    var currentRoom = 0, inventory = [], selectedItem = -1;
    var timer = 300, timerMax = 300; // 5 minutes
    var msg = '', msgTimer = 0;
    var dollEyeTimer = 0, dollBlink = false;
    var shakeTimer = 0;
    var mouseX = 0, mouseY = 0, hoverObj = null;

    // ── NEW: Sanity System ────────────────────────────
    var sanity = 100;
    var maxSanity = 100;
    var sanityDrainRate = 0.5;
    var hallucinating = false;
    var hallucinationTimer = 0;

    // ── NEW: Doll AI ──────────────────────────────────
    var dollRoom = 1; // doll moves between rooms
    var dollMoveTimer = 0;
    var dollAngry = false;
    var dollChaseTimer = 0;
    var dollSightings = 0;
    var dollWhisper = '';
    var dollWhisperTimer = 0;
    var DOLL_WHISPERS = [
        'Play with me...', 'Don\'t leave me alone...', 'You can\'t escape...',
        'I see you...', 'We\'ll be together forever...', 'The house is mine...',
        'Who said you could leave?', 'Every door leads back to me...',
        'Close your eyes...', 'Do you hear the music?'
    ];

    // ── NEW: Puzzle tracking ──────────────────────────
    var puzzlesSolved = 0;
    var totalPuzzles = 0;
    var secretsFound = 0;
    var ending = ''; // 'escape', 'doll', 'time', 'madness'

    // ── NEW: Notes collectible ────────────────────────
    var notes = [];
    var notesFound = 0;

    // ── 12 Rooms ──────────────────────────────────────
    var ROOMS = [
        {
            name: 'Foyer', color: '#2a1515', floorColor: '#1a0a0a',
            objects: [
                { id: 'front_door', x: 350, y: 80, w: 100, h: 220, type: 'door', label: 'Front Door (Locked)', requires: 'master_key', leadsTo: -1, solved: false },
                { id: 'drawer', x: 50, y: 260, w: 80, h: 60, type: 'container', label: 'Drawer', contains: 'rusty_key', opened: false },
                { id: 'coat_rack', x: 200, y: 120, w: 40, h: 180, type: 'container', label: 'Coat Rack', contains: 'note_1', opened: false },
                { id: 'door_nursery', x: 700, y: 130, w: 60, h: 180, type: 'door', label: 'Nursery →', requires: null, leadsTo: 1, solved: true },
                { id: 'door_basement', x: 500, y: 320, w: 80, h: 50, type: 'door', label: 'Basement ↓', requires: 'basement_key', leadsTo: 8, solved: false },
                { id: 'mirror', x: 600, y: 80, w: 70, h: 120, type: 'clue', label: 'Cracked Mirror', text: 'Your reflection doesn\'t look like you...' },
            ]
        },
        {
            name: 'Nursery', color: '#1a1020', floorColor: '#0d0810',
            objects: [
                { id: 'crib', x: 100, y: 200, w: 140, h: 100, type: 'container', label: 'Crib', contains: 'music_box', opened: false },
                { id: 'toybox', x: 500, y: 250, w: 100, h: 80, type: 'container', label: 'Toy Box', contains: 'glass_eye', opened: false, requires: 'rusty_key' },
                { id: 'rocking_chair', x: 350, y: 200, w: 80, h: 100, type: 'clue', label: 'Rocking Chair', text: 'It rocks gently on its own...' },
                { id: 'door_back', x: 20, y: 130, w: 60, h: 180, type: 'door', label: '← Foyer', requires: null, leadsTo: 0, solved: true },
                { id: 'door_kitchen', x: 700, y: 130, w: 60, h: 180, type: 'door', label: 'Kitchen →', requires: null, leadsTo: 2, solved: true },
            ]
        },
        {
            name: 'Kitchen', color: '#1a1a10', floorColor: '#0d0d08',
            objects: [
                { id: 'cabinet', x: 80, y: 100, w: 120, h: 130, type: 'container', label: 'Cabinet', contains: 'candle', opened: false },
                { id: 'oven', x: 400, y: 180, w: 140, h: 120, type: 'puzzle', label: 'Old Oven', requires: 'candle', gives: 'melted_wax', solved: false },
                { id: 'fridge', x: 600, y: 100, w: 80, h: 180, type: 'container', label: 'Rusty Fridge', contains: 'note_2', opened: false },
                { id: 'sink', x: 250, y: 150, w: 100, h: 60, type: 'clue', label: 'Sink', text: 'Dark red liquid drips from the faucet...' },
                { id: 'door_back', x: 20, y: 130, w: 60, h: 180, type: 'door', label: '← Nursery', requires: null, leadsTo: 1, solved: true },
                { id: 'door_study', x: 700, y: 130, w: 60, h: 180, type: 'door', label: 'Study →', requires: null, leadsTo: 3, solved: true },
            ]
        },
        {
            name: 'Study', color: '#15150a', floorColor: '#0a0a05',
            objects: [
                { id: 'desk', x: 200, y: 200, w: 160, h: 80, type: 'container', label: 'Desk', contains: 'letter', opened: false },
                { id: 'statue', x: 550, y: 150, w: 60, h: 120, type: 'puzzle', label: 'Eyeless Statue', requires: 'glass_eye', gives: 'golden_key', solved: false },
                { id: 'bookshelf', x: 80, y: 60, w: 100, h: 200, type: 'clue', label: 'Bookshelf', text: '"The statue needs its eye to see the truth"' },
                { id: 'globe', x: 420, y: 250, w: 50, h: 50, type: 'container', label: 'Hollow Globe', contains: 'silver_locket', opened: false },
                { id: 'door_back', x: 20, y: 130, w: 60, h: 180, type: 'door', label: '← Kitchen', requires: null, leadsTo: 2, solved: true },
                { id: 'door_gallery', x: 700, y: 130, w: 60, h: 180, type: 'door', label: 'Gallery →', requires: 'golden_key', leadsTo: 4, solved: false },
            ]
        },
        {
            name: 'Gallery', color: '#1a0f1a', floorColor: '#0d080d',
            objects: [
                { id: 'painting_1', x: 60, y: 60, w: 100, h: 120, type: 'clue', label: 'Portrait of a Girl', text: '"Emma Whitmore, 1889-1896. Beloved daughter."' },
                { id: 'painting_2', x: 220, y: 60, w: 100, h: 120, type: 'container', label: 'Painting (hinged)', contains: 'safe_combo', opened: false },
                { id: 'painting_3', x: 380, y: 60, w: 100, h: 120, type: 'clue', label: 'Family Portrait', text: 'All faces have been scratched out except the girl\'s...' },
                { id: 'suit_armor', x: 580, y: 80, w: 60, h: 220, type: 'container', label: 'Suit of Armor', contains: 'basement_key', opened: false, requires: 'silver_locket' },
                { id: 'door_back', x: 20, y: 130, w: 60, h: 180, type: 'door', label: '← Study', requires: null, leadsTo: 3, solved: true },
                { id: 'door_bedroom', x: 700, y: 130, w: 60, h: 180, type: 'door', label: 'Bedroom →', requires: null, leadsTo: 5, solved: true },
            ]
        },
        {
            name: 'Master Bedroom', color: '#1a1015', floorColor: '#0d080a',
            objects: [
                { id: 'bed', x: 200, y: 160, w: 200, h: 120, type: 'container', label: 'Under the Bed', contains: 'note_3', opened: false },
                { id: 'wardrobe', x: 500, y: 80, w: 120, h: 220, type: 'container', label: 'Wardrobe', contains: 'doll_dress', opened: false },
                { id: 'vanity', x: 60, y: 150, w: 100, h: 80, type: 'clue', label: 'Vanity Mirror', text: 'Something is written in the dust: "She never left"' },
                { id: 'window', x: 350, y: 40, w: 100, h: 90, type: 'clue', label: 'Window', text: 'Boarded shut from the OUTSIDE...' },
                { id: 'door_back', x: 20, y: 130, w: 60, h: 180, type: 'door', label: '← Gallery', requires: null, leadsTo: 4, solved: true },
                { id: 'door_bathroom', x: 700, y: 130, w: 60, h: 180, type: 'door', label: 'Bathroom →', requires: null, leadsTo: 6, solved: true },
            ]
        },
        {
            name: 'Bathroom', color: '#0a1515', floorColor: '#050a0a',
            objects: [
                { id: 'bathtub', x: 200, y: 180, w: 200, h: 100, type: 'container', label: 'Bathtub', contains: 'rusted_ring', opened: false },
                { id: 'medicine_cabinet', x: 500, y: 100, w: 80, h: 80, type: 'container', label: 'Medicine Cabinet', contains: 'sanity_pills', opened: false },
                { id: 'toilet', x: 100, y: 220, w: 50, h: 70, type: 'clue', label: 'Toilet', text: 'You hear faint laughter echoing from the pipes...' },
                { id: 'door_back', x: 20, y: 130, w: 60, h: 180, type: 'door', label: '← Bedroom', requires: null, leadsTo: 5, solved: true },
                { id: 'door_attic', x: 350, y: 30, w: 80, h: 50, type: 'door', label: 'Attic ↑', requires: null, leadsTo: 7, solved: true },
            ]
        },
        {
            name: 'Attic', color: '#1a1a15', floorColor: '#0d0d0a',
            objects: [
                { id: 'chest', x: 150, y: 200, w: 120, h: 80, type: 'puzzle', label: 'Locked Chest', requires: 'safe_combo', gives: 'crystal_pendant', solved: false },
                { id: 'old_doll', x: 450, y: 180, w: 50, h: 100, type: 'clue', label: 'Broken Porcelain Doll', text: '"I was here first. She replaced me."' },
                { id: 'trunk', x: 600, y: 220, w: 100, h: 70, type: 'container', label: 'Steamer Trunk', contains: 'note_4', opened: false },
                { id: 'window_attic', x: 350, y: 30, w: 80, h: 70, type: 'clue', label: 'Attic Window', text: 'Through the grime you see... nothing. Just fog.' },
                { id: 'door_back', x: 20, y: 130, w: 60, h: 180, type: 'door', label: '← Bathroom', requires: null, leadsTo: 6, solved: true },
            ]
        },
        {
            name: 'Basement', color: '#0a0a0a', floorColor: '#050505',
            objects: [
                { id: 'furnace', x: 300, y: 150, w: 150, h: 150, type: 'puzzle', label: 'Old Furnace', requires: 'doll_dress', gives: 'ash_key', solved: false },
                { id: 'shelf', x: 60, y: 100, w: 140, h: 120, type: 'container', label: 'Dusty Shelf', contains: 'note_5', opened: false },
                { id: 'well', x: 550, y: 200, w: 80, h: 80, type: 'puzzle', label: 'Dry Well', requires: 'rusted_ring', gives: 'well_water', solved: false },
                { id: 'boiler', x: 200, y: 310, w: 100, h: 60, type: 'clue', label: 'Boiler', text: 'It\'s warm. Something is still feeding it...' },
                { id: 'door_back', x: 20, y: 130, w: 60, h: 180, type: 'door', label: '← Foyer', requires: null, leadsTo: 0, solved: true },
                { id: 'door_crypt', x: 700, y: 130, w: 60, h: 180, type: 'door', label: 'Crypt →', requires: 'ash_key', leadsTo: 9, solved: false },
            ]
        },
        {
            name: 'Crypt', color: '#0d080d', floorColor: '#050305',
            objects: [
                { id: 'coffin', x: 250, y: 180, w: 200, h: 100, type: 'puzzle', label: 'Sealed Coffin', requires: 'crystal_pendant', gives: 'bone_key', solved: false },
                { id: 'altar', x: 550, y: 120, w: 80, h: 120, type: 'puzzle', label: 'Dark Altar', requires: 'well_water', gives: 'blessed_charm', solved: false },
                { id: 'inscription', x: 80, y: 80, w: 120, h: 60, type: 'clue', label: 'Wall Inscription', text: '"Here lies Emma. She who would not stay dead."' },
                { id: 'door_back', x: 20, y: 130, w: 60, h: 180, type: 'door', label: '← Basement', requires: null, leadsTo: 8, solved: true },
                { id: 'door_ritual', x: 700, y: 130, w: 60, h: 180, type: 'door', label: 'Ritual Room →', requires: 'bone_key', leadsTo: 10, solved: false },
            ]
        },
        {
            name: 'Ritual Room', color: '#1a050a', floorColor: '#0d0305',
            objects: [
                { id: 'circle', x: 250, y: 150, w: 200, h: 200, type: 'puzzle', label: 'Ritual Circle', requires: 'blessed_charm', gives: 'binding_seal', solved: false },
                { id: 'doll_throne', x: 550, y: 120, w: 80, h: 150, type: 'clue', label: 'Doll Throne', text: 'An ornate chair sized for a doll. It\'s warm to the touch.' },
                { id: 'candelabra', x: 100, y: 100, w: 40, h: 120, type: 'container', label: 'Candelabra', contains: 'note_6', opened: false },
                { id: 'door_back', x: 20, y: 130, w: 60, h: 180, type: 'door', label: '← Crypt', requires: null, leadsTo: 9, solved: true },
                { id: 'door_final', x: 700, y: 130, w: 60, h: 180, type: 'door', label: 'Final Room →', requires: 'binding_seal', leadsTo: 11, solved: false },
            ]
        },
        {
            name: 'Emma\'s Room', color: '#200510', floorColor: '#100308',
            objects: [
                { id: 'dollhouse', x: 300, y: 150, w: 160, h: 140, type: 'puzzle', label: 'Miniature Dollhouse', requires: 'music_box', gives: 'master_key', solved: false },
                { id: 'final_doll', x: 550, y: 170, w: 50, h: 110, type: 'doll', label: 'Emma\'s Doll' },
                { id: 'window_final', x: 150, y: 50, w: 100, h: 100, type: 'clue', label: 'Stained Glass Window', text: 'Light filters through... depicting a girl and her doll, forever.' },
                { id: 'door_back', x: 20, y: 130, w: 60, h: 180, type: 'door', label: '← Ritual Room', requires: null, leadsTo: 10, solved: true },
            ]
        }
    ];

    var ITEMS = {
        'rusty_key': { name: 'Rusty Key', icon: '🗝️' },
        'music_box': { name: 'Music Box', icon: '🎵' },
        'glass_eye': { name: 'Glass Eye', icon: '👁️' },
        'candle': { name: 'Candle', icon: '🕯️' },
        'melted_wax': { name: 'Melted Wax', icon: '💧' },
        'golden_key': { name: 'Golden Key', icon: '🔑' },
        'letter': { name: 'Letter', icon: '📜' },
        'silver_locket': { name: 'Silver Locket', icon: '📿' },
        'safe_combo': { name: 'Safe Combination', icon: '🔢' },
        'basement_key': { name: 'Basement Key', icon: '🗝️' },
        'doll_dress': { name: 'Doll\'s Dress', icon: '👗' },
        'rusted_ring': { name: 'Rusted Ring', icon: '💍' },
        'sanity_pills': { name: 'Sanity Pills', icon: '💊' },
        'crystal_pendant': { name: 'Crystal Pendant', icon: '💎' },
        'ash_key': { name: 'Ash Key', icon: '🔑' },
        'well_water': { name: 'Dark Water', icon: '🫗' },
        'bone_key': { name: 'Bone Key', icon: '🦴' },
        'blessed_charm': { name: 'Blessed Charm', icon: '✝️' },
        'binding_seal': { name: 'Binding Seal', icon: '🔮' },
        'master_key': { name: 'Master Key', icon: '🗝️' },
        'note_1': { name: 'Note: Warning', icon: '📄' },
        'note_2': { name: 'Note: Recipe', icon: '📄' },
        'note_3': { name: 'Note: Diary', icon: '📄' },
        'note_4': { name: 'Note: History', icon: '📄' },
        'note_5': { name: 'Note: Ritual', icon: '📄' },
        'note_6': { name: 'Note: Final', icon: '📄' },
    };

    // ── Particles ─────────────────────────────────────
    var particles = [];

    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; lastTime = performance.now(); gameLoop(); },
        onRestart: restartGame
    });

    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); return; }
        if (e.code === 'KeyE' && gameActive && hasItem('sanity_pills') && sanity < maxSanity) {
            inventory.splice(inventory.indexOf('sanity_pills'), 1);
            sanity = Math.min(maxSanity, sanity + 30);
            showMsg('💊 Took pills. Sanity restored.');
        }
        var num = parseInt(e.key);
        if (num >= 1 && num <= inventory.length) selectedItem = num - 1;
        if (num === 0) selectedItem = -1;
    });

    function startGame() {
        canvas = document.getElementById('game-canvas'); ctx = canvas.getContext('2d');
        canvas.width = W; canvas.height = H;
        canvas.addEventListener('mousemove', function (e) {
            var r = canvas.getBoundingClientRect();
            mouseX = (e.clientX - r.left) * (W / r.width);
            mouseY = (e.clientY - r.top) * (H / r.height);
        });
        canvas.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var r = canvas.getBoundingClientRect(); var t = e.touches[0];
            mouseX = (t.clientX - r.left) * (W / r.width);
            mouseY = (t.clientY - r.top) * (H / r.height);
        }, { passive: false });
        canvas.addEventListener('click', function () { handleClick(); });
        canvas.addEventListener('touchend', function (e) { e.preventDefault(); handleClick(); }, { passive: false });

        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        HorrorAudio.startDrone(30, 'dark'); HorrorAudio.startHeartbeat(50);
        if (window.QualityFX) QualityFX.init2D(canvas, ctx);

        setTimeout(function () {
            ctrl.classList.add('hiding');
            setTimeout(function () {
                ctrl.style.display = 'none'; ctrl.classList.remove('hiding');
                resetState();
                gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                lastTime = performance.now(); gameLoop();
            }, 800);
        }, 2500);
    }

    function resetState() {
        currentRoom = 0; inventory = []; selectedItem = -1;
        timer = timerMax / GameUtils.getMultiplier(); msg = ''; msgTimer = 0;
        sanity = maxSanity; hallucinating = false; hallucinationTimer = 0;
        dollRoom = 1; dollMoveTimer = 15; dollAngry = false; dollSightings = 0;
        puzzlesSolved = 0; secretsFound = 0; notesFound = 0; ending = '';
        particles = [];
        for (var r = 0; r < ROOMS.length; r++) {
            for (var o = 0; o < ROOMS[r].objects.length; o++) {
                var obj = ROOMS[r].objects[o];
                if (obj.type === 'container') obj.opened = false;
                if (obj.type === 'puzzle') obj.solved = false;
                if (obj.id === 'front_door') obj.solved = false;
                if (obj.id === 'door_basement' || obj.id === 'door_gallery' || obj.id === 'door_crypt' || obj.id === 'door_ritual' || obj.id === 'door_final') obj.solved = false;
            }
        }
        countPuzzles();
    }

    function countPuzzles() { totalPuzzles = 0; for (var r = 0; r < ROOMS.length; r++) for (var o = 0; o < ROOMS[r].objects.length; o++) if (ROOMS[r].objects[o].type === 'puzzle') totalPuzzles++; }

    function restartGame() {
        resetState();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        HorrorAudio.startDrone(30, 'dark'); HorrorAudio.startHeartbeat(50);
        gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
        lastTime = performance.now(); gameLoop();
    }

    function hasItem(id) { return inventory.indexOf(id) !== -1; }
    function addItem(id) { if (!hasItem(id)) { inventory.push(id); HorrorAudio.playCollect(); } }
    function getSelectedItemId() { return selectedItem >= 0 && selectedItem < inventory.length ? inventory[selectedItem] : null; }
    function showMsg(text) { msg = text; msgTimer = 3; }
    function spawnParticles(x, y, color, count) {
        for (var i = 0; i < count; i++) particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60 - 15, life: 0.8 + Math.random() * 0.5, maxLife: 1.3, color: color, size: 2 + Math.random() * 3 });
    }

    function handleClick() {
        if (!gameActive) return;
        var room = ROOMS[currentRoom];
        for (var i = 0; i < room.objects.length; i++) {
            var obj = room.objects[i];
            if (mouseX >= obj.x && mouseX <= obj.x + obj.w && mouseY >= obj.y && mouseY <= obj.y + obj.h) {
                interactWith(obj); return;
            }
        }
    }

    function interactWith(obj) {
        HorrorAudio.playClick();
        if (obj.type === 'door') {
            if (obj.requires && !obj.solved && !hasItem(obj.requires)) {
                showMsg('It\'s locked. You need something...'); HorrorAudio.playHit(); return;
            }
            if (obj.requires && hasItem(obj.requires) && !obj.solved) {
                obj.solved = true;
                inventory.splice(inventory.indexOf(obj.requires), 1); selectedItem = -1;
                showMsg('🔓 Unlocked!');
                spawnParticles(obj.x + obj.w / 2, obj.y + obj.h / 2, '#ffcc44', 8);
                if (obj.leadsTo === -1) { ending = 'escape'; gameWin(); return; }
            }
            if (obj.leadsTo >= 0 && (obj.solved || !obj.requires)) {
                currentRoom = obj.leadsTo;
                showMsg('Entered: ' + ROOMS[currentRoom].name);
                shakeTimer = 0.2;
                if (window.ChallengeManager) ChallengeManager.notify('dollhouse', 'rooms_visited', 1);
                // Doll encounter
                if (currentRoom === dollRoom) {
                    dollSightings++;
                    sanity -= 8;
                    shakeTimer = 0.5;
                    dollWhisper = DOLL_WHISPERS[Math.floor(Math.random() * DOLL_WHISPERS.length)];
                    dollWhisperTimer = 3;
                    HorrorAudio.playJumpScare();
                    showMsg('💀 The doll is here!');
                }
            }
        } else if (obj.type === 'container') {
            if (obj.opened) { showMsg('Already searched.'); return; }
            if (obj.requires && !hasItem(obj.requires)) { showMsg('It\'s locked.'); HorrorAudio.playHit(); return; }
            obj.opened = true;
            if (obj.requires) { inventory.splice(inventory.indexOf(obj.requires), 1); selectedItem = -1; }
            if (obj.contains) {
                addItem(obj.contains);
                var item = ITEMS[obj.contains];
                showMsg('Found: ' + item.icon + ' ' + item.name);
                spawnParticles(obj.x + obj.w / 2, obj.y + obj.h / 2, '#44ff44', 6);
                if (obj.contains.indexOf('note_') === 0) notesFound++;
                if (window.ChallengeManager) ChallengeManager.notify('dollhouse', 'items_found', 1);
            } else { showMsg('Empty...'); }
        } else if (obj.type === 'puzzle') {
            if (obj.solved) { showMsg('Already completed.'); return; }
            var sel = getSelectedItemId();
            if (sel === obj.requires) {
                obj.solved = true;
                inventory.splice(inventory.indexOf(sel), 1); selectedItem = -1;
                puzzlesSolved++;
                if (obj.gives) {
                    addItem(obj.gives);
                    var item = ITEMS[obj.gives];
                    showMsg('🧩 Puzzle solved! Got: ' + item.icon + ' ' + item.name);
                }
                shakeTimer = 0.3;
                spawnParticles(obj.x + obj.w / 2, obj.y + obj.h / 2, '#ff8844', 10);
                HorrorAudio.playPowerup && HorrorAudio.playPowerup();
            } else {
                showMsg('Need the right item... (select with 1-9)');
            }
        } else if (obj.type === 'clue') {
            showMsg(obj.text);
            sanity -= 2;
        } else if (obj.type === 'doll') {
            showMsg('The doll stares at you with lifeless eyes...');
            HorrorAudio.playJumpScare();
            shakeTimer = 0.5;
            sanity -= 10;
            dollSightings++;
        }
        updateHUD();
    }

    function updateHUD() {
        var h1 = document.getElementById('hud-room'); if (h1) h1.textContent = ROOMS[currentRoom].name + ' | 🧩 ' + puzzlesSolved + '/' + totalPuzzles;
        var h2 = document.getElementById('hud-items'); if (h2) h2.textContent = '🎒 ' + inventory.length + ' | 🧠 ' + Math.round(sanity) + '%';
    }

    function gameOver() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playDeath(); HorrorAudio.stopDrone(); HorrorAudio.stopHeartbeat();
        var msgEl = document.querySelector('#game-over-screen p');
        if (msgEl) {
            if (ending === 'madness') msgEl.textContent = 'Your mind shattered. The doll smiles as you become one of her toys...';
            else if (ending === 'doll') msgEl.textContent = 'The doll caught you. You\'ll play with her... forever.';
            else msgEl.textContent = 'Time ran out. The house won\'t let you leave...';
        }
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-over-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function gameWin() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.WIN);
        HorrorAudio.playWin(); HorrorAudio.stopDrone(); HorrorAudio.stopHeartbeat();
        var msgEl = document.querySelector('#game-win-screen p');
        if (msgEl) {
            var t = Math.round(timerMax - timer);
            msgEl.textContent = '🚪 You escaped the Dollhouse! Time: ' + t + 's | Puzzles: ' + puzzlesSolved + '/' + totalPuzzles + ' | Notes: ' + notesFound + '/6 | Sanity: ' + Math.round(sanity) + '%';
        }
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-win-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function drawObject(obj, hover) {
        ctx.save();
        if (obj.type === 'door') {
            ctx.fillStyle = hover ? '#553322' : '#3a2010';
            if (obj.requires && !obj.solved && !hasItem(obj.requires)) ctx.fillStyle = hover ? '#442222' : '#331515';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = '#664433'; ctx.lineWidth = 2; ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
            ctx.fillStyle = '#aa8855'; ctx.beginPath(); ctx.arc(obj.x + obj.w - 12, obj.y + obj.h / 2, 5, 0, Math.PI * 2); ctx.fill();
            if (obj.requires && !obj.solved && !hasItem(obj.requires)) {
                ctx.fillStyle = '#ff4444'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('🔒', obj.x + obj.w / 2, obj.y + obj.h / 2 + 6);
            }
        } else if (obj.type === 'container') {
            ctx.fillStyle = hover ? '#443322' : '#2a1a10';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = obj.opened ? '#336633' : '#664433'; ctx.lineWidth = 1.5;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
            if (obj.opened) { ctx.fillStyle = 'rgba(50,100,50,0.2)'; ctx.fillRect(obj.x, obj.y, obj.w, obj.h); }
        } else if (obj.type === 'clue') {
            ctx.fillStyle = hover ? '#332220' : '#221510';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = '#554433'; ctx.lineWidth = 1; ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
        } else if (obj.type === 'puzzle') {
            ctx.fillStyle = obj.solved ? '#1a2a1a' : (hover ? '#332225' : '#221518');
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = obj.solved ? '#448844' : '#884444'; ctx.lineWidth = 1.5;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
            if (!obj.solved) { ctx.fillStyle = '#ff4444'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', obj.x + obj.w / 2, obj.y + obj.h / 2 + 8); }
            else { ctx.fillStyle = '#44ff44'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✓', obj.x + obj.w / 2, obj.y + obj.h / 2 + 8); }
        } else if (obj.type === 'doll') {
            ctx.fillStyle = '#ddccbb';
            ctx.beginPath(); ctx.arc(obj.x + obj.w / 2, obj.y + 15, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(obj.x + obj.w / 2 - 8, obj.y + 27, 16, 35);
            // Arms
            ctx.fillRect(obj.x + obj.w / 2 - 16, obj.y + 30, 8, 3);
            ctx.fillRect(obj.x + obj.w / 2 + 8, obj.y + 30, 8, 3);
            // Eyes follow mouse
            var edx = mouseX - (obj.x + obj.w / 2), edy = mouseY - (obj.y + 15);
            var elen = Math.sqrt(edx * edx + edy * edy) || 1;
            ctx.fillStyle = dollBlink ? '#ddccbb' : '#111';
            ctx.beginPath(); ctx.arc(obj.x + obj.w / 2 - 5 + (edx / elen) * 1.5, obj.y + 13, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(obj.x + obj.w / 2 + 5 + (edx / elen) * 1.5, obj.y + 13, 3, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#882222'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(obj.x + obj.w / 2, obj.y + 18, 5, 0.1, Math.PI - 0.1); ctx.stroke();
            // Glow when angry
            if (dollAngry) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 15; ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(obj.x + obj.w / 2, obj.y + 50, 30, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; }
        }
        ctx.restore();
    }

    function draw(dt) {
        var room = ROOMS[currentRoom];
        ctx.save();
        if (shakeTimer > 0) ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);

        // Room background
        ctx.fillStyle = room.color; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = room.floorColor; ctx.fillRect(0, H * 0.7, W, H * 0.3);
        ctx.strokeStyle = 'rgba(100,50,30,0.3)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, H * 0.7); ctx.lineTo(W, H * 0.7); ctx.stroke();
        ctx.fillStyle = 'rgba(60,30,15,0.5)'; ctx.fillRect(0, H * 0.7 - 5, W, 10);
        ctx.fillStyle = 'rgba(80,40,20,0.06)';
        for (var i = 0; i < 20; i++) ctx.fillRect(i * 42, 0, 1, H * 0.7);
        ctx.fillStyle = 'rgba(100,50,25,0.05)';
        for (var y = 0; y < H * 0.7; y += 40) for (var x = 0; x < W; x += 40) { ctx.beginPath(); ctx.arc(x + 20, y + 20, 8, 0, Math.PI * 2); ctx.fill(); }

        // Room name
        ctx.font = '600 12px Inter'; ctx.fillStyle = 'rgba(200,150,100,0.3)'; ctx.textAlign = 'left';
        ctx.fillText(room.name, 10, H * 0.7 + 20);

        // Doll in this room
        if (currentRoom === dollRoom) {
            drawObject({ id: 'roaming_doll', x: 350 + Math.sin(Date.now() * 0.001) * 10, y: 220, w: 40, h: 80, type: 'doll', label: 'The Doll' }, false);
        }

        // Objects
        hoverObj = null;
        for (var i = 0; i < room.objects.length; i++) {
            var obj = room.objects[i];
            var isHover = mouseX >= obj.x && mouseX <= obj.x + obj.w && mouseY >= obj.y && mouseY <= obj.y + obj.h;
            if (isHover) hoverObj = obj;
            drawObject(obj, isHover);
        }

        // Sanity effects
        if (sanity < 40) {
            ctx.globalAlpha = (40 - sanity) / 80;
            ctx.fillStyle = 'rgba(80,0,0,0.3)'; ctx.fillRect(0, 0, W, H);
            // Flickering text
            if (Math.random() < 0.01) {
                ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,0,0,0.2)';
                ctx.fillText(DOLL_WHISPERS[Math.floor(Math.random() * DOLL_WHISPERS.length)], Math.random() * W, Math.random() * H);
            }
            ctx.globalAlpha = 1;
        }

        // Hallucination overlay
        if (hallucinating) {
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#220022'; ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
        }

        // Timer bar
        var tPct = timer / timerMax;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, 6);
        ctx.fillStyle = tPct > 0.3 ? '#884422' : '#cc2222'; ctx.fillRect(0, 0, W * tPct, 6);
        var mins = Math.floor(timer / 60), secs = Math.floor(timer % 60);
        ctx.fillStyle = tPct > 0.3 ? '#aa6633' : '#ff3333';
        ctx.font = '600 14px Inter'; ctx.textAlign = 'right';
        ctx.fillText(mins + ':' + (secs < 10 ? '0' : '') + secs, W - 10, 24);

        // Sanity bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 6, W, 4);
        ctx.fillStyle = sanity > 50 ? '#448844' : sanity > 25 ? '#888844' : '#884444';
        ctx.fillRect(0, 6, W * (sanity / maxSanity), 4);
        ctx.font = '10px Inter'; ctx.textAlign = 'left'; ctx.fillStyle = '#aaa';
        ctx.fillText('🧠 ' + Math.round(sanity) + '%', 5, 18);

        // Inventory bar
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H - 50, W, 50);
        ctx.strokeStyle = 'rgba(100,50,30,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, H - 50); ctx.lineTo(W, H - 50); ctx.stroke();
        ctx.font = '11px Inter'; ctx.fillStyle = '#886644'; ctx.textAlign = 'left';
        ctx.fillText('INVENTORY (1-9 select, 0 deselect)', 10, H - 33);
        var maxShow = Math.min(inventory.length, 11);
        for (var i = 0; i < maxShow; i++) {
            var ix = 10 + i * 56, iy = H - 42;
            ctx.fillStyle = i === selectedItem ? 'rgba(200,100,50,0.3)' : 'rgba(50,25,10,0.5)';
            ctx.fillRect(ix, iy, 50, 34);
            ctx.strokeStyle = i === selectedItem ? '#cc6633' : '#553322'; ctx.strokeRect(ix, iy, 50, 34);
            var item = ITEMS[inventory[i]];
            if (item) { ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(item.icon, ix + 25, iy + 24); }
        }

        // Hover label
        if (hoverObj) {
            ctx.font = '600 14px Inter'; ctx.textAlign = 'center';
            ctx.fillStyle = '#ffcc88'; ctx.shadowColor = '#ff8833'; ctx.shadowBlur = 6;
            ctx.fillText(hoverObj.label, hoverObj.x + hoverObj.w / 2, hoverObj.y - 8);
            ctx.shadowBlur = 0;
        }

        // Doll whisper
        if (dollWhisperTimer > 0) {
            ctx.globalAlpha = Math.min(1, dollWhisperTimer);
            ctx.font = 'italic 600 18px serif'; ctx.textAlign = 'center';
            ctx.fillStyle = '#cc3333'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 12;
            ctx.fillText('"' + dollWhisper + '"', W / 2, H * 0.35);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }

        // Message
        if (msgTimer > 0) {
            ctx.globalAlpha = Math.min(1, msgTimer);
            ctx.font = 'italic 600 16px Inter'; ctx.textAlign = 'center';
            ctx.fillStyle = '#ffcc66'; ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 8;
            ctx.fillText(msg, W / 2, H * 0.45);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }

        // Particles
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.restore();

        if (window.QualityFX) {
            var hasCandle2 = hasItem('candle');
            QualityFX.addLight2D(mouseX, mouseY, hasCandle2 ? 150 : 80, hasCandle2 ? 'rgba(255,200,100,0.4)' : 'rgba(255,255,255,0.15)', 0.8);
        }

        // Vignette
        var vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.65);
        vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    }

    function gameLoop(time) {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        if (!time) time = performance.now();
        var dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;

        timer -= dt;
        if (timer <= 0) { timer = 0; ending = 'time'; gameOver(); return; }
        var tPct = timer / timerMax;
        HorrorAudio.setHeartbeatBPM(Math.round(50 + (1 - tPct) * 100));

        // Sanity drain
        sanity -= sanityDrainRate * dt * GameUtils.getMultiplier();
        if (sanity <= 0) { sanity = 0; ending = 'madness'; gameOver(); return; }
        if (sanity < 30) hallucinating = true; else hallucinating = false;

        // Doll movement
        dollMoveTimer -= dt;
        if (dollMoveTimer <= 0) {
            var newRoom;
            do { newRoom = Math.floor(Math.random() * ROOMS.length); } while (newRoom === currentRoom && ROOMS.length > 2);
            dollRoom = newRoom;
            dollMoveTimer = 10 + Math.random() * 15;
            // More aggressive later
            if (timer < timerMax * 0.3) { dollMoveTimer *= 0.5; dollAngry = true; }
        }

        // Timers
        if (shakeTimer > 0) shakeTimer -= dt;
        if (msgTimer > 0) msgTimer -= dt;
        if (dollWhisperTimer > 0) dollWhisperTimer -= dt;
        dollEyeTimer -= dt;
        if (dollEyeTimer <= 0) { dollBlink = !dollBlink; dollEyeTimer = dollBlink ? 0.15 : 2 + Math.random() * 4; }

        // Particles
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }

        draw(dt);
        updateHUD();
    }
})();
