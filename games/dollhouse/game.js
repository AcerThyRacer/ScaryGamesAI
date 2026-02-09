/* ============================================
   The Dollhouse — Point-and-Click Escape Room
   Canvas 2D
   ============================================ */
(function () {
    'use strict';

    var canvas, ctx, W = 800, H = 500;
    var gameActive = false, lastTime = 0;
    var currentRoom = 0, inventory = [], selectedItem = -1;
    var timer = 180, timerMax = 180; // 3 minutes
    var msg = '', msgTimer = 0;
    var dollEyeTimer = 0, dollBlink = false;
    var shakeTimer = 0;
    var mouseX = 0, mouseY = 0, hoverObj = null;

    // Rooms
    var ROOMS = [
        {
            name: 'Foyer', color: '#2a1515', floorColor: '#1a0a0a',
            objects: [
                { id: 'door_locked', x: 350, y: 100, w: 100, h: 200, type: 'door', label: 'Locked Door', requires: 'golden_key', leadsTo: -1, solved: false },
                { id: 'drawer', x: 50, y: 250, w: 80, h: 60, type: 'container', label: 'Drawer', contains: 'rusty_key', opened: false },
                { id: 'painting', x: 550, y: 80, w: 120, h: 100, type: 'clue', label: 'Creepy Painting', text: 'The third eye sees all...' },
                { id: 'door_nursery', x: 680, y: 150, w: 60, h: 180, type: 'door', label: 'Door →', requires: null, leadsTo: 1, solved: true },
            ]
        },
        {
            name: 'Nursery', color: '#1a1020', floorColor: '#0d0810',
            objects: [
                { id: 'crib', x: 100, y: 200, w: 140, h: 100, type: 'container', label: 'Crib', contains: 'music_box', opened: false },
                { id: 'toybox', x: 500, y: 250, w: 100, h: 80, type: 'container', label: 'Toy Box', contains: 'glass_eye', opened: false, requires: 'rusty_key' },
                { id: 'door_back', x: 20, y: 150, w: 60, h: 180, type: 'door', label: '← Back', requires: null, leadsTo: 0, solved: true },
                { id: 'door_kitchen', x: 680, y: 150, w: 60, h: 180, type: 'door', label: 'Door →', requires: null, leadsTo: 2, solved: true },
                { id: 'doll1', x: 350, y: 220, w: 40, h: 80, type: 'doll', label: 'Porcelain Doll' },
            ]
        },
        {
            name: 'Kitchen', color: '#1a1a10', floorColor: '#0d0d08',
            objects: [
                { id: 'cabinet', x: 80, y: 100, w: 120, h: 130, type: 'container', label: 'Cabinet', contains: 'candle', opened: false },
                { id: 'oven', x: 400, y: 180, w: 140, h: 120, type: 'puzzle', label: 'Old Oven', requires: 'candle', gives: 'melted_wax', solved: false },
                { id: 'door_back', x: 20, y: 150, w: 60, h: 180, type: 'door', label: '← Back', requires: null, leadsTo: 1, solved: true },
                { id: 'door_study', x: 680, y: 150, w: 60, h: 180, type: 'door', label: 'Door →', requires: null, leadsTo: 3, solved: true },
            ]
        },
        {
            name: 'Study', color: '#15150a', floorColor: '#0a0a05',
            objects: [
                { id: 'desk', x: 200, y: 200, w: 160, h: 80, type: 'container', label: 'Desk', contains: 'letter', opened: false },
                { id: 'statue', x: 550, y: 150, w: 60, h: 120, type: 'puzzle', label: 'Eyeless Statue', requires: 'glass_eye', gives: 'golden_key', solved: false },
                { id: 'bookshelf', x: 80, y: 60, w: 100, h: 200, type: 'clue', label: 'Bookshelf', text: 'A note reads: "The statue needs its eye"' },
                { id: 'door_back', x: 20, y: 150, w: 60, h: 180, type: 'door', label: '← Back', requires: null, leadsTo: 2, solved: true },
                { id: 'doll2', x: 450, y: 280, w: 40, h: 80, type: 'doll', label: 'Broken Doll' },
            ]
        },
    ];

    var ITEMS = {
        'rusty_key': { name: 'Rusty Key', icon: '🗝️' },
        'music_box': { name: 'Music Box', icon: '🎵' },
        'glass_eye': { name: 'Glass Eye', icon: '👁️' },
        'candle': { name: 'Candle', icon: '🕯️' },
        'melted_wax': { name: 'Melted Wax', icon: '💧' },
        'golden_key': { name: 'Golden Key', icon: '🔑' },
        'letter': { name: 'Letter', icon: '📜' },
    };

    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; lastTime = performance.now(); gameLoop(); },
        onRestart: restartGame
    });

    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); return; }
        // Number keys for inventory
        var num = parseInt(e.key);
        if (num >= 1 && num <= inventory.length) selectedItem = num - 1;
    });

    function startGame() {
        canvas = document.getElementById('game-canvas'); ctx = canvas.getContext('2d');
        canvas.width = W; canvas.height = H;
        canvas.addEventListener('mousemove', function (e) {
            var r = canvas.getBoundingClientRect();
            mouseX = (e.clientX - r.left) * (W / r.width);
            mouseY = (e.clientY - r.top) * (H / r.height);
        });
        canvas.addEventListener('click', function () { handleClick(); });

        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        HorrorAudio.startDrone(30, 'dark');
        HorrorAudio.startHeartbeat(50);

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
        // Reset all objects
        for (var r = 0; r < ROOMS.length; r++) {
            for (var o = 0; o < ROOMS[r].objects.length; o++) {
                var obj = ROOMS[r].objects[o];
                if (obj.type === 'container') obj.opened = false;
                if (obj.type === 'puzzle') obj.solved = false;
                if (obj.id === 'door_locked') obj.solved = false;
            }
        }
    }

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

    function showMsg(text) { msg = text; msgTimer = 2.5; }

    function handleClick() {
        if (!gameActive) return;
        var room = ROOMS[currentRoom];
        for (var i = 0; i < room.objects.length; i++) {
            var obj = room.objects[i];
            if (mouseX >= obj.x && mouseX <= obj.x + obj.w && mouseY >= obj.y && mouseY <= obj.y + obj.h) {
                interactWith(obj);
                return;
            }
        }
    }

    function interactWith(obj) {
        HorrorAudio.playClick();
        if (obj.type === 'door') {
            if (obj.requires && !hasItem(obj.requires)) {
                showMsg('It\'s locked. You need something...');
                HorrorAudio.playHit();
                return;
            }
            if (obj.leadsTo === -1 && hasItem(obj.requires)) {
                // WIN - escape!
                gameWin(); return;
            }
            if (obj.leadsTo >= 0) {
                currentRoom = obj.leadsTo;
                showMsg('Entered: ' + ROOMS[currentRoom].name);
                shakeTimer = 0.2;
                if (window.ChallengeManager) ChallengeManager.notify('dollhouse', 'rooms_visited', 1);
            }
        } else if (obj.type === 'container') {
            if (obj.opened) { showMsg('Already searched.'); return; }
            if (obj.requires && !hasItem(obj.requires)) { showMsg('It\'s locked.'); HorrorAudio.playHit(); return; }
            obj.opened = true;
            if (obj.contains) {
                addItem(obj.contains);
                var item = ITEMS[obj.contains];
                showMsg('Found: ' + item.icon + ' ' + item.name);
                if (window.ChallengeManager) ChallengeManager.notify('dollhouse', 'items_found', 1);
            } else {
                showMsg('Empty...');
            }
        } else if (obj.type === 'puzzle') {
            if (obj.solved) { showMsg('Already used.'); return; }
            var sel = getSelectedItemId();
            if (sel === obj.requires) {
                obj.solved = true;
                // Remove used item from inventory
                inventory.splice(inventory.indexOf(sel), 1); selectedItem = -1;
                if (obj.gives) {
                    addItem(obj.gives);
                    var item = ITEMS[obj.gives];
                    showMsg('Created: ' + item.icon + ' ' + item.name);
                }
                shakeTimer = 0.3;
                HorrorAudio.playPowerup();
            } else {
                showMsg('Need the right item... (select with 1-5)');
            }
        } else if (obj.type === 'clue') {
            showMsg(obj.text);
        } else if (obj.type === 'doll') {
            showMsg('The doll stares at you with lifeless eyes...');
            HorrorAudio.playJumpScare();
            shakeTimer = 0.4;
        }
        updateHUD();
    }

    function updateHUD() {
        var h1 = document.getElementById('hud-room'); if (h1) h1.textContent = 'Room: ' + ROOMS[currentRoom].name;
        var h2 = document.getElementById('hud-items'); if (h2) h2.textContent = 'Items: ' + inventory.length;
    }

    function gameOver() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playDeath(); HorrorAudio.stopDrone(); HorrorAudio.stopHeartbeat();
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-over-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function gameWin() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.WIN);
        HorrorAudio.playWin(); HorrorAudio.stopDrone(); HorrorAudio.stopHeartbeat();
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-win-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function draw(dt) {
        var room = ROOMS[currentRoom];
        ctx.save();
        if (shakeTimer > 0) ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);

        // Room background
        ctx.fillStyle = room.color; ctx.fillRect(0, 0, W, H);
        // Floor
        ctx.fillStyle = room.floorColor; ctx.fillRect(0, H * 0.7, W, H * 0.3);
        // Floor line
        ctx.strokeStyle = 'rgba(100,50,30,0.3)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, H * 0.7); ctx.lineTo(W, H * 0.7); ctx.stroke();
        // Baseboard
        ctx.fillStyle = 'rgba(60,30,15,0.5)'; ctx.fillRect(0, H * 0.7 - 5, W, 10);
        // Wall texture
        ctx.fillStyle = 'rgba(80,40,20,0.06)';
        for (var i = 0; i < 20; i++) { ctx.fillRect(i * 42, 0, 1, H * 0.7); }
        // Wallpaper pattern
        ctx.fillStyle = 'rgba(100,50,25,0.05)';
        for (var y = 0; y < H * 0.7; y += 40) {
            for (var x = 0; x < W; x += 40) {
                ctx.beginPath(); ctx.arc(x + 20, y + 20, 8, 0, Math.PI * 2); ctx.fill();
            }
        }

        // Draw objects
        hoverObj = null;
        for (var i = 0; i < room.objects.length; i++) {
            var obj = room.objects[i];
            var isHover = mouseX >= obj.x && mouseX <= obj.x + obj.w && mouseY >= obj.y && mouseY <= obj.y + obj.h;
            if (isHover) hoverObj = obj;
            drawObject(obj, isHover);
        }

        // Timer bar
        var tPct = timer / timerMax;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, 6);
        ctx.fillStyle = tPct > 0.3 ? '#884422' : '#cc2222';
        ctx.fillRect(0, 0, W * tPct, 6);
        // Timer text
        var mins = Math.floor(timer / 60), secs = Math.floor(timer % 60);
        ctx.fillStyle = tPct > 0.3 ? '#aa6633' : '#ff3333';
        ctx.font = '600 14px Inter, sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(mins + ':' + (secs < 10 ? '0' : '') + secs, W - 10, 24);

        // Inventory bar
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H - 50, W, 50);
        ctx.strokeStyle = 'rgba(100,50,30,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, H - 50); ctx.lineTo(W, H - 50); ctx.stroke();
        ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#886644'; ctx.textAlign = 'left';
        ctx.fillText('INVENTORY', 10, H - 33);
        for (var i = 0; i < inventory.length; i++) {
            var ix = 90 + i * 60, iy = H - 42;
            ctx.fillStyle = i === selectedItem ? 'rgba(200,100,50,0.3)' : 'rgba(50,25,10,0.5)';
            ctx.fillRect(ix, iy, 50, 34);
            ctx.strokeStyle = i === selectedItem ? '#cc6633' : '#553322';
            ctx.strokeRect(ix, iy, 50, 34);
            var item = ITEMS[inventory[i]];
            if (item) {
                ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(item.icon, ix + 25, iy + 25);
            }
            ctx.font = '10px Inter, sans-serif'; ctx.fillStyle = '#886644'; ctx.textAlign = 'center';
            ctx.fillText('[' + (i + 1) + ']', ix + 25, iy + 44);
        }

        // Hover label
        if (hoverObj) {
            ctx.font = '600 14px Inter, sans-serif'; ctx.textAlign = 'center';
            ctx.fillStyle = '#ffcc88'; ctx.shadowColor = '#ff8833'; ctx.shadowBlur = 6;
            ctx.fillText(hoverObj.label, hoverObj.x + hoverObj.w / 2, hoverObj.y - 8);
            ctx.shadowBlur = 0;
        }

        // Message
        if (msgTimer > 0) {
            ctx.globalAlpha = Math.min(1, msgTimer);
            ctx.font = 'italic 600 16px Inter, sans-serif'; ctx.textAlign = 'center';
            ctx.fillStyle = '#ffcc66'; ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 8;
            ctx.fillText(msg, W / 2, H * 0.45);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }

        ctx.restore();

        // Vignette
        var vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.65);
        vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    }

    function drawObject(obj, hover) {
        var h = hover ? 1 : 0;
        ctx.save();
        if (obj.type === 'door') {
            ctx.fillStyle = hover ? '#553322' : '#3a2010';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = '#664433'; ctx.lineWidth = 2; ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
            // Handle
            ctx.fillStyle = '#aa8855'; ctx.beginPath();
            ctx.arc(obj.x + obj.w - 12, obj.y + obj.h / 2, 5, 0, Math.PI * 2); ctx.fill();
        } else if (obj.type === 'container') {
            ctx.fillStyle = hover ? '#443322' : '#2a1a10';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = obj.opened ? '#336633' : '#664433'; ctx.lineWidth = 1.5;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
            if (obj.opened) {
                ctx.fillStyle = 'rgba(50,100,50,0.2)'; ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            }
        } else if (obj.type === 'clue') {
            ctx.fillStyle = hover ? '#332220' : '#221510';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = '#554433'; ctx.lineWidth = 1;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
        } else if (obj.type === 'puzzle') {
            ctx.fillStyle = obj.solved ? '#1a2a1a' : (hover ? '#332225' : '#221518');
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = obj.solved ? '#448844' : '#884444'; ctx.lineWidth = 1.5;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
            if (!obj.solved) {
                ctx.fillStyle = '#ff4444'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('?', obj.x + obj.w / 2, obj.y + obj.h / 2 + 8);
            }
        } else if (obj.type === 'doll') {
            // Creepy doll
            ctx.fillStyle = '#ddccbb';
            // Head
            ctx.beginPath(); ctx.arc(obj.x + obj.w / 2, obj.y + 15, 12, 0, Math.PI * 2); ctx.fill();
            // Body
            ctx.fillRect(obj.x + obj.w / 2 - 8, obj.y + 27, 16, 35);
            // Eyes that follow mouse
            var edx = mouseX - (obj.x + obj.w / 2), edy = mouseY - (obj.y + 15);
            var elen = Math.sqrt(edx * edx + edy * edy);
            var elook = elen > 0 ? 3 : 0;
            ctx.fillStyle = dollBlink ? '#ddccbb' : '#111';
            ctx.beginPath(); ctx.arc(obj.x + obj.w / 2 - 5 + (edx / elen) * elook * 0.3, obj.y + 13, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(obj.x + obj.w / 2 + 5 + (edx / elen) * elook * 0.3, obj.y + 13, 3, 0, Math.PI * 2); ctx.fill();
            // Smile
            ctx.strokeStyle = '#882222'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(obj.x + obj.w / 2, obj.y + 18, 5, 0.1, Math.PI - 0.1); ctx.stroke();
        }
        ctx.restore();
    }

    function gameLoop(time) {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        if (!time) time = performance.now();
        var dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;

        timer -= dt;
        if (timer <= 0) { timer = 0; gameOver(); return; }
        // Heartbeat speeds up as time runs out
        var tPct = timer / timerMax;
        HorrorAudio.setHeartbeatBPM(Math.round(50 + (1 - tPct) * 100));

        if (shakeTimer > 0) shakeTimer -= dt;
        if (msgTimer > 0) msgTimer -= dt;
        // Doll blink
        dollEyeTimer -= dt;
        if (dollEyeTimer <= 0) { dollBlink = !dollBlink; dollEyeTimer = dollBlink ? 0.15 : 2 + Math.random() * 4; }

        draw(dt);
        updateHUD();
    }
})();
