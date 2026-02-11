/* ============================================
   Freddy's Nightmare — FNAF-style Security Camera Survival
   Monitor cameras, close doors, manage power, survive til 6 AM.
   ============================================ */
(function () {
    'use strict';

    var canvas = document.getElementById('game-canvas');
    var ctx = canvas.getContext('2d');

    // ============ CONSTANTS ============
    var ROOMS = [
        { id: 0, name: 'Show Stage', x: 0.35, y: 0.1, w: 0.3, h: 0.2, connects: [1, 2] },
        { id: 1, name: 'Dining Hall', x: 0.15, y: 0.3, w: 0.3, h: 0.2, connects: [0, 3, 4] },
        { id: 2, name: 'Pirate Cove', x: 0.55, y: 0.3, w: 0.25, h: 0.2, connects: [0, 5] },
        { id: 3, name: 'West Hall', x: 0.05, y: 0.5, w: 0.2, h: 0.25, connects: [1, 6] },
        { id: 4, name: 'Backstage', x: 0.3, y: 0.5, w: 0.2, h: 0.2, connects: [1, 5] },
        { id: 5, name: 'East Hall', x: 0.55, y: 0.5, w: 0.2, h: 0.25, connects: [2, 4, 7] },
        { id: 6, name: 'W. Hall Corner', x: 0.05, y: 0.75, w: 0.2, h: 0.15, connects: [3] },
        { id: 7, name: 'E. Hall Corner', x: 0.55, y: 0.75, w: 0.2, h: 0.15, connects: [5] },
    ];

    var ANIMATRONICS = [
        { name: 'Freddy', icon: '🐻', color: '#8B4513', startRoom: 0, aggression: 0.3, room: 0, moveTimer: 0, atDoor: -1 },
        { name: 'Bonnie', icon: '🐰', color: '#6A0DAD', startRoom: 0, aggression: 0.5, room: 0, moveTimer: 0, atDoor: -1 },
        { name: 'Chica', icon: '🐥', color: '#FFD700', startRoom: 0, aggression: 0.4, room: 0, moveTimer: 0, atDoor: -1 },
        { name: 'Foxy', icon: '🦊', color: '#CC3300', startRoom: 2, aggression: 0.35, room: 2, moveTimer: 0, atDoor: -1 },
    ];

    var NIGHT_DURATION = 90; // seconds per night (real time)
    var HOURS_PER_NIGHT = 6; // 12AM - 6AM
    var POWER_DRAIN_BASE = 0.08; // per second base drain
    var POWER_DRAIN_DOOR = 0.12; // per door per second
    var POWER_DRAIN_CAMERA = 0.06; // camera per second
    var POWER_DRAIN_LIGHT = 0.15; // per light per second

    // ============ STATE ============
    var state = {
        night: 1,
        gameTime: 0,
        power: 100,
        leftDoor: false,
        rightDoor: false,
        leftLight: false,
        rightLight: false,
        cameraUp: false,
        currentCamera: 0,
        gameActive: false,
        animatronics: [],
        jumpscareTimer: -1,
        jumpscareAnim: null,
        staticIntensity: 0,
        staticTimer: 0,
        officeFlicker: 0,
        doorsUsed: 0,
        cameraSwitches: 0,
    };

    var keysPressed = {};

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    document.addEventListener('keydown', function (e) {
        keysPressed[e.code] = true;
        if (!state.gameActive) return;
        if (e.code === 'KeyQ') { toggleLeftDoor(); e.preventDefault(); }
        if (e.code === 'KeyE') { toggleRightDoor(); e.preventDefault(); }
        if (e.code === 'KeyF') { state.leftLight = true; state.rightLight = true; e.preventDefault(); }
        if (e.code === 'Space') { toggleCamera(); e.preventDefault(); }
        if (e.code >= 'Digit1' && e.code <= 'Digit8') { switchCamera(parseInt(e.code.charAt(5)) - 1); e.preventDefault(); }
        if (e.code === 'Escape' && state.gameActive) { state.gameActive = false; GameUtils.pauseGame(); }
    });
    document.addEventListener('keyup', function (e) {
        keysPressed[e.code] = false;
        if (e.code === 'KeyF') { state.leftLight = false; state.rightLight = false; }
    });

    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.getElementById('fullscreen-btn').addEventListener('click', function () { GameUtils.toggleFullscreen(); });

    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { state.gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING); lastTime = performance.now(); },
        onRestart: function () { state.night = 1; restartNight(); }
    });

    function toggleLeftDoor() {
        state.leftDoor = !state.leftDoor;
        if (state.leftDoor) state.doorsUsed++;
    }
    function toggleRightDoor() {
        state.rightDoor = !state.rightDoor;
        if (state.rightDoor) state.doorsUsed++;
    }
    function toggleCamera() {
        state.cameraUp = !state.cameraUp;
        if (state.cameraUp) {
            state.staticIntensity = 1.0;
            state.cameraSwitches++;
        }
    }
    function switchCamera(idx) {
        if (idx >= 0 && idx < ROOMS.length) {
            state.currentCamera = idx;
            state.staticIntensity = 1.0;
            state.cameraSwitches++;
        }
    }

    function initNight() {
        state.gameTime = 0;
        state.power = 100;
        state.leftDoor = false;
        state.rightDoor = false;
        state.leftLight = false;
        state.rightLight = false;
        state.cameraUp = false;
        state.currentCamera = 0;
        state.jumpscareTimer = -1;
        state.jumpscareAnim = null;
        state.staticIntensity = 0;
        state.doorsUsed = 0;
        state.cameraSwitches = 0;

        var diff = GameUtils.getMultiplier();
        state.animatronics = ANIMATRONICS.map(function (a) {
            return {
                name: a.name,
                icon: a.icon,
                color: a.color,
                room: a.startRoom,
                aggression: a.aggression * (0.7 + state.night * 0.3) * diff,
                moveTimer: 5 + Math.random() * 10,
                atDoor: -1,
                attacking: false,
            };
        });
    }

    function getHour() {
        var progress = state.gameTime / NIGHT_DURATION;
        var hour = Math.floor(progress * HOURS_PER_NIGHT);
        return Math.min(hour, 5);
    }

    function getTimeString() {
        var h = getHour();
        if (h === 0) return '12:00 AM';
        return h + ':00 AM';
    }

    function updateHUD() {
        var timeEl = document.getElementById('hud-time');
        var powerEl = document.getElementById('hud-power');
        var nightEl = document.getElementById('hud-night');
        if (timeEl) timeEl.textContent = getTimeString();
        if (powerEl) {
            powerEl.textContent = '⚡ Power: ' + Math.round(state.power) + '%';
            powerEl.style.color = state.power > 50 ? '#00ff88' : state.power > 25 ? '#ffaa00' : '#ff4444';
        }
        if (nightEl) nightEl.textContent = 'Night ' + state.night;
    }

    // ============ ANIMATRONIC AI ============
    function updateAnimatronics(dt) {
        state.animatronics.forEach(function (anim) {
            if (anim.attacking) return;

            anim.moveTimer -= dt;
            if (anim.moveTimer <= 0) {
                anim.moveTimer = (3 + Math.random() * 8) / anim.aggression;

                // Decide to move
                if (Math.random() < anim.aggression) {
                    if (anim.atDoor >= 0) {
                        // At a door — check if blocked
                        if ((anim.atDoor === 0 && state.leftDoor) || (anim.atDoor === 1 && state.rightDoor)) {
                            // Blocked! Go back to a random connected room
                            var currentDoorRoom = anim.atDoor === 0 ? 6 : 7;
                            anim.room = currentDoorRoom;
                            anim.atDoor = -1;
                        } else {
                            // Attack!
                            anim.attacking = true;
                            state.jumpscareTimer = 1.5;
                            state.jumpscareAnim = anim;
                            HorrorAudio.playJumpScare();
                        }
                    } else if (anim.room === 6) {
                        // West hall corner — attempt left door
                        anim.atDoor = 0;
                    } else if (anim.room === 7) {
                        // East hall corner — attempt right door
                        anim.atDoor = 1;
                    } else {
                        // Move to a connecting room, biased towards the office
                        var room = ROOMS[anim.room];
                        var options = room.connects.slice();
                        // Bias towards higher-numbered rooms (closer to office)
                        var weighted = [];
                        options.forEach(function (r) {
                            weighted.push(r);
                            if (r > anim.room) weighted.push(r); // Double chance for forward movement
                        });
                        anim.room = weighted[Math.floor(Math.random() * weighted.length)];
                        anim.atDoor = -1;
                    }
                }
            }
        });
    }

    // ============ UPDATE ============
    function update(dt) {
        if (!state.gameActive) return;

        state.gameTime += dt;
        state.officeFlicker += dt;
        state.staticTimer += dt;

        // Static fade
        if (state.staticIntensity > 0) state.staticIntensity = Math.max(0, state.staticIntensity - dt * 3);

        // Power drain
        var drain = POWER_DRAIN_BASE;
        if (state.leftDoor) drain += POWER_DRAIN_DOOR;
        if (state.rightDoor) drain += POWER_DRAIN_DOOR;
        if (state.cameraUp) drain += POWER_DRAIN_CAMERA;
        if (state.leftLight) drain += POWER_DRAIN_LIGHT;
        if (state.rightLight) drain += POWER_DRAIN_LIGHT;
        state.power -= drain * dt * GameUtils.getMultiplier();

        // Challenge tracking
        if (window.ChallengeManager) {
            ChallengeManager.notify('freddys-nightmare', 'time_survived', state.gameTime);
            ChallengeManager.notify('freddys-nightmare', 'power_remaining', Math.round(state.power));
        }

        // Power out
        if (state.power <= 0) {
            state.power = 0;
            gameOver('The power ran out... You were defenseless.');
            return;
        }

        // Jumpscare in progress
        if (state.jumpscareTimer > 0) {
            state.jumpscareTimer -= dt;
            if (state.jumpscareTimer <= 0) {
                gameOver(state.jumpscareAnim.name + ' got you!');
                return;
            }
        }

        // Check win
        if (state.gameTime >= NIGHT_DURATION) {
            nightComplete();
            return;
        }

        updateAnimatronics(dt);
        updateHUD();
    }

    // ============ RENDER ============
    function render() {
        var w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);

        if (state.jumpscareTimer > 0 && state.jumpscareAnim) {
            renderJumpscare(w, h);
            return;
        }

        if (state.cameraUp) {
            renderCameraView(w, h);
        } else {
            renderOffice(w, h);
        }

        // Top HUD overlay
        renderHUDOverlay(w, h);
    }

    function renderOffice(w, h) {
        // Office background
        var grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, '#1a1a2e');
        grd.addColorStop(1, '#0a0a14');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        // Walls
        ctx.fillStyle = '#151525';
        ctx.fillRect(0, 0, w * 0.15, h);
        ctx.fillRect(w * 0.85, 0, w * 0.15, h);

        // Desk
        ctx.fillStyle = '#2a2218';
        ctx.fillRect(w * 0.2, h * 0.65, w * 0.6, h * 0.1);
        ctx.strokeStyle = '#3a3228';
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.2, h * 0.65, w * 0.6, h * 0.1);

        // Monitor screens on desk
        ctx.fillStyle = '#111';
        ctx.fillRect(w * 0.35, h * 0.45, w * 0.3, h * 0.2);
        ctx.strokeStyle = '#333';
        ctx.strokeRect(w * 0.35, h * 0.45, w * 0.3, h * 0.2);

        // Static on monitors
        for (var i = 0; i < 50; i++) {
            var sx = w * 0.35 + Math.random() * w * 0.3;
            var sy = h * 0.45 + Math.random() * h * 0.2;
            ctx.fillStyle = 'rgba(' + Math.floor(Math.random() * 60) + ',' + Math.floor(Math.random() * 60) + ',' + Math.floor(Math.random() * 60) + ',0.5)';
            ctx.fillRect(sx, sy, 2, 2);
        }

        // Camera view text
        ctx.fillStyle = '#444';
        ctx.font = '14px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Press SPACE to view cameras', w * 0.5, h * 0.56);

        // Office flickering light
        var flick = Math.sin(state.officeFlicker * 3) * 0.02 + 0.05;
        var lightGrd = ctx.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.3, w * 0.5);
        lightGrd.addColorStop(0, 'rgba(255,220,150,' + flick + ')');
        lightGrd.addColorStop(1, 'transparent');
        ctx.fillStyle = lightGrd;
        ctx.fillRect(0, 0, w, h);

        // Left door area
        renderDoorArea(w, h, true);
        // Right door area
        renderDoorArea(w, h, false);

        // Fan on desk
        var fanAngle = state.officeFlicker * 5;
        ctx.save();
        ctx.translate(w * 0.6, h * 0.6);
        ctx.rotate(fanAngle);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        for (var b = 0; b < 3; b++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(b * Math.PI * 2 / 3) * 15, Math.sin(b * Math.PI * 2 / 3) * 15);
            ctx.stroke();
        }
        ctx.restore();

        // Power display on desk
        ctx.fillStyle = state.power > 25 ? '#00ff88' : '#ff4444';
        ctx.font = 'bold 18px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('POWER: ' + Math.round(state.power) + '%', w * 0.22, h * 0.73);

        // Power bar
        ctx.fillStyle = '#222';
        ctx.fillRect(w * 0.22, h * 0.74, w * 0.2, 8);
        ctx.fillStyle = state.power > 50 ? '#00ff88' : state.power > 25 ? '#ffaa00' : '#ff4444';
        ctx.fillRect(w * 0.22, h * 0.74, w * 0.2 * (state.power / 100), 8);

        // Animatronics at doors
        state.animatronics.forEach(function (anim) {
            if (anim.atDoor === 0 && state.leftLight && !state.leftDoor) {
                // Left door — animatronic visible with light
                ctx.font = '80px serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.fillText(anim.icon, w * 0.08, h * 0.5);
                ctx.fillStyle = 'rgba(255,0,0,0.3)';
                ctx.fillRect(0, 0, w * 0.15, h);
            }
            if (anim.atDoor === 1 && state.rightLight && !state.rightDoor) {
                ctx.font = '80px serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.fillText(anim.icon, w * 0.92, h * 0.5);
                ctx.fillStyle = 'rgba(255,0,0,0.3)';
                ctx.fillRect(w * 0.85, 0, w * 0.15, h);
            }
        });
    }

    function renderDoorArea(w, h, isLeft) {
        var x = isLeft ? 0 : w * 0.85;
        var doorClosed = isLeft ? state.leftDoor : state.rightDoor;
        var lightOn = isLeft ? state.leftLight : state.rightLight;

        // Door frame
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 5, h * 0.1, (isLeft ? w * 0.15 : w * 0.15) - 10, h * 0.75);

        if (doorClosed) {
            // Closed door
            ctx.fillStyle = '#2a2a3a';
            ctx.fillRect(x + 5, h * 0.1, w * 0.15 - 10, h * 0.75);
            ctx.fillStyle = '#444';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('DOOR', x + w * 0.075, h * 0.5 - 10);
            ctx.fillText('CLOSED', x + w * 0.075, h * 0.5 + 10);
        } else if (lightOn) {
            // Light on — illuminate the hallway
            var lgrd = ctx.createRadialGradient(x + w * 0.075, h * 0.5, 10, x + w * 0.075, h * 0.5, w * 0.12);
            lgrd.addColorStop(0, 'rgba(255,255,200,0.2)');
            lgrd.addColorStop(1, 'transparent');
            ctx.fillStyle = lgrd;
            ctx.fillRect(x, 0, w * 0.15, h);
        }

        // Door button indicators
        var btnY = h * 0.88;
        ctx.fillStyle = doorClosed ? '#ff4444' : '#333';
        ctx.beginPath();
        ctx.arc(x + w * 0.04, btnY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(isLeft ? 'Q' : 'E', x + w * 0.04, btnY + 4);

        // Light button
        ctx.fillStyle = lightOn ? '#ffff00' : '#333';
        ctx.beginPath();
        ctx.arc(x + w * 0.11, btnY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.fillText('F', x + w * 0.11, btnY + 4);
    }

    function renderCameraView(w, h) {
        // Camera feed background
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, w, h);

        var room = ROOMS[state.currentCamera];

        // Room visualization
        var rx = w * 0.1, ry = h * 0.05, rw = w * 0.8, rh = h * 0.7;

        // Room-specific rendering
        renderRoomScene(rx, ry, rw, rh, room);

        // Camera scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for (var sl = 0; sl < h; sl += 4) {
            ctx.fillRect(0, sl, w, 2);
        }

        // Static overlay
        if (state.staticIntensity > 0) {
            for (var s = 0; s < 500 * state.staticIntensity; s++) {
                var sx = Math.random() * w, sy = Math.random() * h;
                var bright = Math.floor(Math.random() * 100);
                ctx.fillStyle = 'rgba(' + bright + ',' + bright + ',' + bright + ',' + (state.staticIntensity * 0.5) + ')';
                ctx.fillRect(sx, sy, Math.random() * 4, Math.random() * 4);
            }
        }

        // Camera name banner
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, h * 0.75, w, h * 0.05);
        ctx.fillStyle = '#aaa';
        ctx.font = 'bold 16px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('CAM ' + (state.currentCamera + 1) + ' — ' + room.name, 20, h * 0.775 + 4);

        // Recording dot
        if (Math.floor(state.staticTimer * 2) % 2) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(w - 30, h * 0.775, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff4444';
            ctx.font = '12px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('REC', w - 45, h * 0.775 + 4);
        }

        // Camera map at bottom
        renderCameraMap(w, h);

        // Time stamp
        ctx.fillStyle = '#666';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(getTimeString() + ' | Night ' + state.night, w - 20, 30);

        // Click areas for camera switching
        renderCameraButtons(w, h);
    }

    function renderRoomScene(rx, ry, rw, rh, room) {
        // Dark room base
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(rx, ry, rw, rh);

        // Floor
        ctx.fillStyle = '#111118';
        ctx.fillRect(rx, ry + rh * 0.6, rw, rh * 0.4);

        // Room-specific details
        var roomId = room.id;
        if (roomId === 0) {
            // Show Stage — curtains and stage
            ctx.fillStyle = '#220808';
            ctx.fillRect(rx + rw * 0.1, ry, rw * 0.05, rh * 0.7);
            ctx.fillRect(rx + rw * 0.85, ry, rw * 0.05, rh * 0.7);
            ctx.fillStyle = '#1a0a0a';
            ctx.fillRect(rx + rw * 0.2, ry + rh * 0.55, rw * 0.6, rh * 0.08);
            // Stars on stage
            ctx.fillStyle = 'rgba(255,255,0,0.1)';
            for (var st = 0; st < 5; st++) {
                ctx.beginPath();
                ctx.arc(rx + rw * 0.3 + st * rw * 0.1, ry + rh * 0.4, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (roomId === 1) {
            // Dining Hall — tables and chairs
            for (var t = 0; t < 4; t++) {
                ctx.fillStyle = '#1a1812';
                ctx.fillRect(rx + rw * 0.15 + t * rw * 0.2, ry + rh * 0.35, rw * 0.12, rh * 0.15);
            }
            // Party hats
            ctx.fillStyle = 'rgba(200,50,50,0.3)';
            for (var ph = 0; ph < 3; ph++) {
                ctx.beginPath();
                ctx.moveTo(rx + rw * 0.2 + ph * rw * 0.2, ry + rh * 0.35);
                ctx.lineTo(rx + rw * 0.22 + ph * rw * 0.2, ry + rh * 0.25);
                ctx.lineTo(rx + rw * 0.24 + ph * rw * 0.2, ry + rh * 0.35);
                ctx.fill();
            }
        } else if (roomId === 2) {
            // Pirate Cove — curtain
            ctx.fillStyle = '#220010';
            ctx.fillRect(rx + rw * 0.3, ry, rw * 0.4, rh * 0.8);
            ctx.strokeStyle = '#440020';
            ctx.lineWidth = 2;
            for (var c = 0; c < 8; c++) {
                ctx.beginPath();
                ctx.moveTo(rx + rw * 0.3 + c * rw * 0.05, ry);
                ctx.lineTo(rx + rw * 0.3 + c * rw * 0.05, ry + rh * 0.8);
                ctx.stroke();
            }
            // "OUT OF ORDER" sign
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('OUT OF ORDER', rx + rw * 0.5, ry + rh * 0.9);
        } else if (roomId === 3 || roomId === 5) {
            // Hallways
            ctx.fillStyle = '#0f0f18';
            ctx.fillRect(rx + rw * 0.3, ry, rw * 0.4, rh);
            // Perspective lines
            ctx.strokeStyle = '#1a1a28';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + rw * 0.3, ry + rh * 0.3); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(rx + rw, ry); ctx.lineTo(rx + rw * 0.7, ry + rh * 0.3); ctx.stroke();
            // Posters on walls
            ctx.fillStyle = 'rgba(80,60,40,0.3)';
            ctx.fillRect(rx + rw * 0.1, ry + rh * 0.2, rw * 0.1, rh * 0.12);
        } else if (roomId === 4) {
            // Backstage — shelves with heads
            ctx.fillStyle = '#15120e';
            ctx.fillRect(rx + rw * 0.1, ry + rh * 0.2, rw * 0.3, rh * 0.05);
            ctx.fillRect(rx + rw * 0.1, ry + rh * 0.5, rw * 0.3, rh * 0.05);
            // Animatronic heads on shelves
            ctx.font = '24px serif';
            ctx.fillText('🐻', rx + rw * 0.15, ry + rh * 0.2);
            ctx.fillText('🐰', rx + rw * 0.25, ry + rh * 0.2);
            ctx.fillText('🐥', rx + rw * 0.35, ry + rh * 0.5);
        } else {
            // Hall corners — end of hallway
            ctx.fillStyle = '#0d0d15';
            ctx.fillRect(rx + rw * 0.35, ry + rh * 0.1, rw * 0.3, rh * 0.6);
            // Door frame at end
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 3;
            ctx.strokeRect(rx + rw * 0.38, ry + rh * 0.15, rw * 0.24, rh * 0.5);
        }

        // Draw animatronics in this room
        state.animatronics.forEach(function (anim) {
            if (anim.room === room.id && anim.atDoor < 0) {
                ctx.font = '60px serif';
                ctx.textAlign = 'center';
                ctx.fillText(anim.icon, rx + rw * (0.3 + Math.random() * 0.4), ry + rh * (0.4 + Math.random() * 0.2));
                // Glowing eyes effect
                ctx.shadowColor = anim.color;
                ctx.shadowBlur = 15;
                ctx.fillStyle = anim.color;
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(rx + rw * 0.5, ry + rh * 0.4, 40, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;
            }
        });

        // Night vision grain
        ctx.fillStyle = 'rgba(0,40,0,0.05)';
        ctx.fillRect(rx, ry, rw, rh);
    }

    function renderCameraMap(w, h) {
        var mapX = w * 0.25, mapY = h * 0.8, mapW = w * 0.5, mapH = h * 0.18;

        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(mapX - 5, mapY - 5, mapW + 10, mapH + 10);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(mapX - 5, mapY - 5, mapW + 10, mapH + 10);

        ROOMS.forEach(function (room, i) {
            var rx = mapX + room.x * mapW;
            var ry = mapY + room.y * mapH * 0.8;
            var rw2 = room.w * mapW * 0.8;
            var rh2 = room.h * mapH * 0.8;

            // Room box
            ctx.fillStyle = i === state.currentCamera ? 'rgba(0,100,255,0.3)' : 'rgba(30,30,40,0.8)';
            ctx.fillRect(rx, ry, rw2, rh2);
            ctx.strokeStyle = i === state.currentCamera ? '#0066ff' : '#444';
            ctx.lineWidth = 1;
            ctx.strokeRect(rx, ry, rw2, rh2);

            // Room name
            ctx.fillStyle = '#888';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(room.name, rx + rw2 / 2, ry + rh2 / 2 + 3);

            // Animatronics in room
            state.animatronics.forEach(function (anim) {
                if (anim.room === i && anim.atDoor < 0) {
                    ctx.font = '12px serif';
                    ctx.fillText(anim.icon, rx + rw2 / 2 + 8, ry + rh2 / 2 - 5);
                }
            });
        });

        // Office
        ctx.fillStyle = 'rgba(0,80,0,0.3)';
        ctx.fillRect(mapX + mapW * 0.35, mapY + mapH * 0.8, mapW * 0.3, mapH * 0.15);
        ctx.fillStyle = '#0f0';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('OFFICE', mapX + mapW * 0.5, mapY + mapH * 0.9);
    }

    function renderCameraButtons(w, h) {
        // Camera switch buttons along the bottom-left
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        for (var i = 0; i < ROOMS.length; i++) {
            var bx = 15 + i * 38;
            var by = h * 0.78;
            ctx.fillStyle = i === state.currentCamera ? '#0066ff' : '#222';
            ctx.fillRect(bx, by, 34, 20);
            ctx.strokeStyle = '#444';
            ctx.strokeRect(bx, by, 34, 20);
            ctx.fillStyle = i === state.currentCamera ? '#fff' : '#888';
            ctx.fillText((i + 1).toString(), bx + 17, by + 14);
        }
    }

    function renderJumpscare(w, h) {
        var anim = state.jumpscareAnim;
        if (!anim) return;

        // Red flash
        ctx.fillStyle = 'rgba(80,0,0,0.8)';
        ctx.fillRect(0, 0, w, h);

        // Giant animatronic face
        ctx.font = Math.min(w, h) * 0.5 + 'px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shake effect
        var shakeX = (Math.random() - 0.5) * 30;
        var shakeY = (Math.random() - 0.5) * 30;
        ctx.fillText(anim.icon, w / 2 + shakeX, h / 2 + shakeY);

        // Name
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 40px "Courier New"';
        ctx.fillText(anim.name.toUpperCase(), w / 2, h * 0.8);

        ctx.textBaseline = 'alphabetic';
    }

    function renderHUDOverlay(w, h) {
        // Time display large
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 28px "Courier New"';
        ctx.textAlign = 'right';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.fillText(getTimeString(), w - 20, 50);
        ctx.shadowBlur = 0;

        // Night indicator
        ctx.fillStyle = '#888';
        ctx.font = '14px monospace';
        ctx.fillText('Night ' + state.night, w - 20, 70);

        // Power bar (bottom left)
        var pw = 200, px = 20, py = h - 40;
        ctx.fillStyle = '#111';
        ctx.fillRect(px, py, pw, 12);
        ctx.fillStyle = state.power > 50 ? '#00ff88' : state.power > 25 ? '#ffaa00' : '#ff4444';
        ctx.fillRect(px, py, pw * (state.power / 100), 12);
        ctx.strokeStyle = '#333';
        ctx.strokeRect(px, py, pw, 12);
        ctx.fillStyle = '#aaa';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('⚡ ' + Math.round(state.power) + '%', px, py - 5);

        // Door/Camera status indicators
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        var iy = h - 80;
        ctx.fillStyle = state.leftDoor ? '#ff4444' : '#444';
        ctx.fillText('L.DOOR: ' + (state.leftDoor ? 'CLOSED' : 'OPEN'), 20, iy);
        ctx.fillStyle = state.rightDoor ? '#ff4444' : '#444';
        ctx.fillText('R.DOOR: ' + (state.rightDoor ? 'CLOSED' : 'OPEN'), 20, iy + 16);
        ctx.fillStyle = state.cameraUp ? '#0066ff' : '#444';
        ctx.fillText('CAMERAS: ' + (state.cameraUp ? 'ON' : 'OFF'), 20, iy + 32);
    }

    // ============ GAME FLOW ============
    function gameOver(msg) {
        state.gameActive = false;
        GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playDeath();
        HorrorAudio.stopDrone();
        HorrorAudio.stopHeartbeat();
        document.getElementById('death-msg').textContent = msg || 'The animatronics got you...';
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';

        // Track challenges
        if (window.ChallengeManager) {
            ChallengeManager.notify('freddys-nightmare', 'nights_survived', state.night - 1);
            ChallengeManager.notify('freddys-nightmare', 'doors_used', state.doorsUsed);
            ChallengeManager.notify('freddys-nightmare', 'cameras_checked', state.cameraSwitches);
        }
    }

    function nightComplete() {
        state.gameActive = false;
        HorrorAudio.playWin();
        HorrorAudio.stopDrone();
        HorrorAudio.stopHeartbeat();

        if (window.ChallengeManager) {
            ChallengeManager.notify('freddys-nightmare', 'nights_survived', state.night);
            ChallengeManager.notify('freddys-nightmare', 'power_remaining', Math.round(state.power));
            ChallengeManager.notify('freddys-nightmare', 'doors_used', state.doorsUsed);
            ChallengeManager.notify('freddys-nightmare', 'cameras_checked', state.cameraSwitches);
        }

        document.getElementById('win-msg').textContent = 'Night ' + state.night + ' complete! Power remaining: ' + Math.round(state.power) + '%';

        if (state.night >= 5) {
            document.getElementById('win-msg').textContent = 'You survived ALL 5 nights! You\'re free!';
            document.getElementById('next-night-btn').textContent = '▶ Play Again';
            document.getElementById('next-night-btn').onclick = function () { state.night = 1; restartNight(); };
            GameUtils.setState(GameUtils.STATE.WIN);
        } else {
            document.getElementById('next-night-btn').textContent = '▶ Night ' + (state.night + 1);
            document.getElementById('next-night-btn').onclick = function () { state.night++; restartNight(); };
        }

        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
    }

    function restartNight() {
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        initNight();
        HorrorAudio.startDrone(35, 'dark');
        HorrorAudio.startHeartbeat(40);
        state.gameActive = true;
        GameUtils.setState(GameUtils.STATE.PLAYING);
        lastTime = performance.now();
    }

    function startGame() {
        document.getElementById('start-screen').style.display = 'none';
        var ctrlOverlay = document.getElementById('controls-overlay');
        ctrlOverlay.style.display = 'flex';
        HorrorAudio.startDrone(35, 'dark');
        HorrorAudio.startHeartbeat(40);
        setTimeout(function () {
            ctrlOverlay.classList.add('hiding');
            setTimeout(function () {
                ctrlOverlay.style.display = 'none';
                ctrlOverlay.classList.remove('hiding');
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                initNight();
                state.gameActive = true;
                GameUtils.setState(GameUtils.STATE.PLAYING);
            }, 800);
        }, 3000);
    }

    // ============ GAME LOOP ============
    var lastTime = 0;
    function gameLoop(time) {
        requestAnimationFrame(gameLoop);
        if (!time) time = performance.now();
        var dt = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;
        if (dt <= 0) return;
        update(dt);
        render();
    }
    lastTime = performance.now();
    gameLoop();

    // Mouse/click support for camera buttons
    canvas.addEventListener('click', function (e) {
        if (!state.gameActive) return;
        var rect = canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;
        var w = canvas.width, h = canvas.height;

        if (state.cameraUp) {
            // Camera buttons
            for (var i = 0; i < ROOMS.length; i++) {
                var bx = 15 + i * 38;
                var by = h * 0.78;
                if (mx >= bx && mx <= bx + 34 && my >= by && my <= by + 20) {
                    switchCamera(i);
                    return;
                }
            }
            // Map room clicks
            var mapX = w * 0.25, mapY = h * 0.8, mapW = w * 0.5, mapH = h * 0.18;
            ROOMS.forEach(function (room, idx) {
                var rx = mapX + room.x * mapW;
                var ry = mapY + room.y * mapH * 0.8;
                var rw2 = room.w * mapW * 0.8;
                var rh2 = room.h * mapH * 0.8;
                if (mx >= rx && mx <= rx + rw2 && my >= ry && my <= ry + rh2) {
                    switchCamera(idx);
                }
            });
        } else {
            // Office door/light buttons
            // Left door button
            if (mx < w * 0.15 && my > h * 0.82) toggleLeftDoor();
            // Right door button
            if (mx > w * 0.85 && my > h * 0.82) toggleRightDoor();
        }
    });
})();
